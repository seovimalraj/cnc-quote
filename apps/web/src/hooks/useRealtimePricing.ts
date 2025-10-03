import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ContractsV1 } from '@cnc-quote/shared';

interface QuoteItemPricingState {
  quote_item_id: string;
  pricing_version?: number;
  rows: Array<{
    quantity: number;
    unit_price?: number;
    total_price?: number;
    lead_time_days?: number;
    breakdown?: any;
    status?: string;
    optimistic?: boolean;
  }>;
  last_updated?: string;
  latency_ms?: number;
  correlation_id?: string;
}

interface UseRealtimePricingOptions {
  baseUrl?: string; // e.g. http://localhost:3000
  authToken?: string;
  autoConnect?: boolean;
  onDrift?: (reason: string) => void;
  onLatencySample?: (ms: number) => void;
  autoReconcileOnDrift?: boolean; // if true, call REST batch reconcile when drift detected
}

interface UseRealtimePricingReturn {
  connected: boolean;
  joinQuote: (quoteId: string) => void;
  recalcItem: (quoteId: string, quoteItemId: string, config?: ContractsV1.PartConfigV1) => void;
  items: Record<string, QuoteItemPricingState>;
  quoteId?: string;
  lastSubtotalDelta?: number;
  reset: () => void;
  geometry?: any;
  dfm?: any;
}

// Defensive patch applier: merges incoming patches onto existing rows
function applyPatches(existing: QuoteItemPricingState['rows'], patches: ContractsV1.PricingMatrixRowPatchV1[], optimistic: boolean) {
  const byQty = new Map(existing.map(r => [r.quantity, r] as const));
  for (const p of patches) {
    const target = byQty.get(p.quantity);
    if (target) {
      if (p.unit_price !== undefined) target.unit_price = p.unit_price;
      if (p.total_price !== undefined) target.total_price = p.total_price;
      if (p.lead_time_days !== undefined) target.lead_time_days = p.lead_time_days;
      if (p.breakdown !== undefined) target.breakdown = p.breakdown;
      if (p.status) target.status = p.status;
      target.optimistic = optimistic || p.status === 'optimistic';
    } else {
      byQty.set(p.quantity, {
        quantity: p.quantity,
        unit_price: p.unit_price,
        total_price: p.total_price,
        lead_time_days: p.lead_time_days,
        breakdown: p.breakdown,
        status: p.status,
        optimistic: optimistic || p.status === 'optimistic'
      });
    }
  }
  return Array.from(byQty.values()).sort((a,b) => a.quantity - b.quantity);
}

// ---------------- Helper extraction to reduce hook body complexity ----------------
type QuoteIdRef = { current: string | undefined };
type CorrelationMapRef = { current: Map<string, string> };
type NumRef = { current: number | undefined };

interface HandlePricingEventDeps {
  setItems: React.Dispatch<React.SetStateAction<Record<string, QuoteItemPricingState>>>;
  onDrift?: (reason: string) => void;
  onLatencySample?: (ms: number) => void;
  autoReconcileOnDrift: boolean;
  reconcileAll: (qid: string) => Promise<void> | void;
  quoteIdRef: QuoteIdRef;
  correlationMap: CorrelationMapRef;
  lastSubtotalDeltaRef: NumRef;
}

function recordOptimisticCorrelation(correlation_id: string | undefined, kind: string, quote_item_id: string, correlationMap: CorrelationMapRef) {
  if (correlation_id && kind === 'pricing:optimistic') {
    correlationMap.current.set(correlation_id, quote_item_id);
  }
}

function reconcileIfDrift(
  correlation_id: string | undefined,
  kind: string,
  deps: HandlePricingEventDeps,
  latency_ms?: number,
) {
  const { correlationMap, onDrift, autoReconcileOnDrift, quoteIdRef, onLatencySample, reconcileAll } = deps;
  if (!(correlation_id && kind === 'pricing:update')) return;
  if (!correlationMap.current.has(correlation_id)) {
    if (onDrift) onDrift('missing_correlation');
    else if (autoReconcileOnDrift && quoteIdRef.current) {
  reconcileAll(quoteIdRef.current); // fire & forget
    }
  } else {
    correlationMap.current.delete(correlation_id);
  }
  if (latency_ms && onLatencySample) onLatencySample(latency_ms);
}

function applyPricingPatch(
  deps: HandlePricingEventDeps,
  data: {
    quote_item_id: string; matrix_patches: ContractsV1.PricingMatrixRowPatchV1[]; optimistic?: boolean; subtotal_delta?: number; pricing_version?: number; latency_ms?: number; correlation_id?: string; kind: string;
  }
) {
  const { setItems, lastSubtotalDeltaRef } = deps;
  const { quote_item_id, matrix_patches, optimistic, subtotal_delta, pricing_version, latency_ms, correlation_id } = data;
  setItems(prev => {
    const current = prev[quote_item_id] || { quote_item_id, rows: [] };
    const nextRows = applyPatches(current.rows, matrix_patches, !!optimistic);
    return {
      ...prev,
      [quote_item_id]: {
        ...current,
        pricing_version: pricing_version || current.pricing_version,
        rows: nextRows,
        last_updated: new Date().toISOString(),
        latency_ms: latency_ms ?? current.latency_ms,
        correlation_id: correlation_id || current.correlation_id,
      }
    };
  });
  if (subtotal_delta !== undefined) {
    lastSubtotalDeltaRef.current = subtotal_delta;
  }
}

function handlePricingSocketEvent(evt: ContractsV1.PricingOptimisticEventV1 | ContractsV1.PricingUpdateEventV1, deps: HandlePricingEventDeps) {
  if (!evt?.payload) return;
  const p: any = evt.payload;
  const correlation_id = (evt as any).correlation_id as string | undefined;
  recordOptimisticCorrelation(correlation_id, evt.kind, p.quote_item_id, deps.correlationMap);
  reconcileIfDrift(correlation_id, evt.kind, deps, p.latency_ms);
  applyPricingPatch(deps, { ...p, correlation_id, kind: evt.kind });
}

export function useRealtimePricing(options: UseRealtimePricingOptions = {}): UseRealtimePricingReturn {
  const { baseUrl = '', authToken, autoConnect = true, onDrift, onLatencySample, autoReconcileOnDrift = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [quoteId, setQuoteId] = useState<string | undefined>();
  const [items, setItems] = useState<Record<string, QuoteItemPricingState>>({});
  const lastSubtotalDeltaRef = useRef<number | undefined>(undefined);
  const correlationMap = useRef<Map<string, string>>(new Map()); // correlation_id -> quote_item_id
  interface GeometryEvent { [k: string]: any }
  interface DfmEvent { [k: string]: any }
  const [geometry, setGeometry] = useState<GeometryEvent | undefined>(undefined);
  const [dfm, setDfm] = useState<DfmEvent | undefined>(undefined);
  const isReconcilingRef = useRef(false);
  const itemsRef = useRef(items);
  const quoteIdRef = useRef<string | undefined>(quoteId);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { quoteIdRef.current = quoteId; }, [quoteId]);

  async function reconcileAll(qid: string) {
    if (isReconcilingRef.current) return;
    isReconcilingRef.current = true;
    try {
      const itemIds = Object.keys(itemsRef.current);
      if (!itemIds.length) return;
      const res = await fetch(`${baseUrl}/price/v2/recalculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ quote_id: qid, quote_item_ids: itemIds })
      });
      if (!res.ok) throw new Error(`reconcile failed ${res.status}`);
      const data = await res.json();
      const results = data?.results || [];
      setItems(prev => {
        const next = { ...prev };
        for (const r of results) {
          if (r.error) continue;
          const current = next[r.quote_item_id] || { quote_item_id: r.quote_item_id, rows: [] };
          const rows = applyPatches(current.rows, r.matrix_patches || [], false);
          next[r.quote_item_id] = {
            ...current,
            rows,
            pricing_version: r.pricing_version || current.pricing_version,
            last_updated: new Date().toISOString(),
          };
          if (r.subtotal_delta !== undefined) {
            lastSubtotalDeltaRef.current = r.subtotal_delta;
          }
        }
        return next;
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('auto reconcile error', err);
    } finally {
      isReconcilingRef.current = false;
    }
  }

  const ensureSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const sock = io(`${baseUrl}/ws/pricing`, {
      autoConnect: false,
      transports: ['websocket'],
      auth: authToken ? { token: authToken } : undefined,
    });
    socketRef.current = sock;
    sock.on('connect', () => setConnected(true));
    sock.on('disconnect', () => setConnected(false));
    sock.on('error', (err: any) => {
      // eslint-disable-next-line no-console
      console.warn('pricing socket error', err);
    });
    sock.on('pricing_event', (evt: ContractsV1.PricingOptimisticEventV1 | ContractsV1.PricingUpdateEventV1) => {
      handlePricingSocketEvent(evt, {
        setItems,
        onDrift,
        onLatencySample,
        autoReconcileOnDrift,
        reconcileAll,
        quoteIdRef,
        correlationMap,
        lastSubtotalDeltaRef,
      });
    });
    // Geometry & DFM event streams
    sock.on('geometry_event', (evt: GeometryEvent) => {
      setGeometry(evt);
    });
    sock.on('dfm_event', (evt: DfmEvent) => {
      setDfm((prev: DfmEvent | undefined) => ({ ...(prev || {}), ...evt }));
    });
    return sock;
  }, [authToken, baseUrl, onDrift, onLatencySample]);

  // Auto-connect
  useEffect(() => {
    if (!autoConnect) return;
    const s = ensureSocket();
    if (!s.connected) s.connect();
    return () => { s.disconnect(); };
  }, [autoConnect, ensureSocket]);

  const joinQuote = useCallback((qid: string) => {
    const s = ensureSocket();
    if (!s.connected) s.connect();
    s.emit('join_quote', { quote_id: qid });
    setQuoteId(qid);
  }, [ensureSocket]);

  const recalcItem = useCallback((qid: string, quoteItemId: string, config?: ContractsV1.PartConfigV1) => {
    const s = ensureSocket();
    if (!s.connected) return; // Optionally auto-connect; keep simple for now
    s.emit('recalculate_pricing', { quote_id: qid, quote_item_id: quoteItemId, config });
  }, [ensureSocket]);

  const reset = useCallback(() => {
    setItems({});
    setQuoteId(undefined);
    correlationMap.current.clear();
    lastSubtotalDeltaRef.current = undefined;
  }, []);

  return {
    connected,
    joinQuote,
    recalcItem,
    items,
    quoteId,
    lastSubtotalDelta: lastSubtotalDeltaRef.current,
    reset,
    geometry,
    dfm,
  };
}
