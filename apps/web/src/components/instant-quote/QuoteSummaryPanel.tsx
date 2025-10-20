"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { usePricingStore } from '../../store/pricingStore';
import { useQuotePreview } from '../../hooks/useQuotePreview';
import { ComplianceBadge } from './ComplianceBadge';
import { collectComplianceAlerts } from '../../lib/compliance';

interface PreviewablePart { id: string; config_json?: any; file_id?: string }
interface QuoteSummaryPanelProps { parts: PreviewablePart[] }

export function QuoteSummaryPanel({ parts }: Readonly<QuoteSummaryPanelProps>) {
  const pricingItems = usePricingStore(s => s.items);
  const { preview, loading: previewLoading, error: previewError, trigger } = useQuotePreview({ debounceMs: 500, enabled: true });
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedTierByPart, setSelectedTierByPart] = useState<Record<string, 'standard' | 'expedited'>>({});
  const partLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const part of parts) {
      map[part.id] = part.file_id || part.id;
    }
    return map;
  }, [parts]);
  type CollectedAlert = ReturnType<typeof collectComplianceAlerts>[number];
  const complianceAlerts = useMemo(() => {
    const aggregated: CollectedAlert[] = [];
    for (const part of parts) {
      const pricing = pricingItems[part.id];
      if (!pricing) continue;
      aggregated.push(
        ...collectComplianceAlerts({
          partId: part.id,
          rows: pricing.rows.map(row => ({ quantity: row.quantity, compliance: row.compliance })),
        }),
      );
    }
    return aggregated.sort((a, b) => b.rank - a.rank);
  }, [parts, pricingItems]);
  const criticalCount = useMemo(() => complianceAlerts.filter(a => a.alert.severity === 'critical').length, [complianceAlerts]);
  const warningCount = useMemo(() => complianceAlerts.filter(a => a.alert.severity === 'warning').length, [complianceAlerts]);

  const subtotal = useMemo(() => {
    return parts.reduce((acc, part) => {
      const pi = pricingItems[part.id];
      if (!pi) return acc;
      const config = part.config_json;
      const selQty = config?.selected_quantity;
      const row = pi.rows.find(r => selQty && r.quantity === selQty && r.total_price !== undefined)
        ?? pi.rows.find(r => r.total_price !== undefined);
      return row?.total_price ? acc + row.total_price : acc;
    }, 0);
  }, [pricingItems, parts]);

  // NOTE(Preview-Future): This effect currently fires every time previewMode toggles on
  // or parts change. Later we can hash the mapped payload and only trigger if the
  // hash differs to reduce network chatter. We may also merge with realtime pricing
  // rows to surface deltas inline instead of a separate preview subtotal.
  useEffect(() => {
    if (!previewMode) return;
    const mapped = parts.map(p => {
      const cfg = p.config_json || {};
      return {
        external_id: p.file_id || p.id,
        process_code: mapProcess(cfg.process_type),
        material_code: mapMaterial(cfg.material_id),
        finish_codes: (cfg.finish_ids || []).map(mapFinish),
  quantity: cfg.selected_quantity ?? cfg.quantities?.[0] ?? 1,
        volume_cc: cfg.geometry?.metrics?.volume_cc,
        surface_area_cm2: cfg.geometry?.metrics?.surface_area_cm2,
        removed_material_cc: cfg.geometry?.metrics?.removed_cc,
        features: cfg.geometry?.features || undefined,
        sheet: cfg.process_type === 'sheet_metal' ? {
          thickness_mm: cfg.sheet_thickness_mm,
          bends: cfg.bend_count,
          area_cm2: cfg.geometry?.metrics?.flat_area_cm2,
          cut_length_mm: cfg.geometry?.metrics?.cut_length_mm,
          pierces: cfg.geometry?.metrics?.pierce_count,
        } : undefined,
      };
    });
    trigger(mapped, 'USD');
  }, [previewMode, parts, trigger]);

  // Compute preview subtotal respecting selected tiers
  const previewSubtotal = useMemo(() => {
    if (!preview) return undefined;
    return preview.lines.reduce((acc, l) => {
      const tier = selectedTierByPart[l.part_external_id || ''] || 'standard';
      const tierPrice = l.price_tiers?.find(pt => pt.code === tier)?.total_price;
      return acc + (tierPrice ?? l.total_price);
    }, 0);
  }, [preview, selectedTierByPart]);
  let previewSubtotalDisplay: string;
  if (previewSubtotal !== undefined) {
    previewSubtotalDisplay = previewSubtotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  } else if (previewLoading) {
    previewSubtotalDisplay = '…';
  } else {
    previewSubtotalDisplay = '$--.--';
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-gray-200 dark:border-gray-700 p-4" data-test="quote-summary">
        <h2 className="text-xs font-semibold tracking-wide text-gray-500 mb-3">QUOTE SUMMARY</h2>
        <div className="flex justify-between text-xs mb-1"><span>Parts</span><span>{parts.length}</span></div>
        <div className="flex justify-between text-xs mb-1" data-test="subtotal"><span>Subtotal</span><span>{subtotal > 0 ? subtotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '$--.--'}</span></div>
        {complianceAlerts.length > 0 && (
          <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100" data-test="compliance-summary">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold uppercase tracking-wide">Compliance Alerts</span>
              <span className="text-[10px] font-medium">{criticalCount} critical / {warningCount} warning</span>
            </div>
            <ul className="mt-2 space-y-1">
              {complianceAlerts.slice(0, 4).map((entry, idx) => (
                <li key={`${entry.partId}-${entry.quantity}-${entry.alert.code}-${idx}`} className="rounded border border-amber-200/70 bg-white/60 p-2 text-[10px] dark:border-amber-800/60 dark:bg-amber-900/10">
                  <div className="flex items-center justify-between gap-2">
                    <ComplianceBadge alert={entry.alert} size="xs" />
                    <span className="text-[9px] text-amber-800 dark:text-amber-200">{partLabelById[entry.partId] || entry.partId} - qty {entry.quantity}</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-tight text-amber-900 dark:text-amber-100">{entry.alert.message}</p>
                </li>
              ))}
            </ul>
            {complianceAlerts.length > 4 && (
              <div className="mt-1 text-[9px] text-amber-800/80 dark:text-amber-200/80">{complianceAlerts.length - 4} additional alerts not shown.</div>
            )}
          </div>
        )}
        {previewMode && (
          <div className="flex justify-between text-[10px] mb-1 text-blue-600 transition-opacity duration-300" data-test="preview-subtotal" style={{opacity: previewLoading ? 0.6 : 1}}>
            <span className="flex items-center gap-1">Preview {previewLoading && <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" aria-label="loading" />}</span>
            <span>{previewSubtotalDisplay}</span>
          </div>
        )}
        {previewMode && preview && (
          <div className="mb-2 space-y-1 text-[10px]" data-test="preview-aggregate">
            {(() => {
              const std = preview.price_tiers?.find(p=>p.code==='standard');
              const exp = preview.price_tiers?.find(p=>p.code==='expedited');
              const avgLeadStd = preview.lead_time_tiers?.find(t=>t.code==='standard')?.days;
              const avgLeadExp = preview.lead_time_tiers?.find(t=>t.code==='expedited')?.days;
              const leadDelta = (avgLeadStd && avgLeadExp) ? avgLeadStd - avgLeadExp : undefined;
              return (
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between"><span>Avg Lead (Std)</span><span>{avgLeadStd ?? '—'}d</span></div>
                  <div className="flex justify-between"><span>Avg Lead (Exp)</span><span>{avgLeadExp ?? '—'}d{leadDelta && leadDelta>0 && <span className="ml-1 text-blue-600">(-{leadDelta}d)</span>}</span></div>
                  <div className="flex justify-between"><span>Subtotal Std</span><span>{std ? std.subtotal.toLocaleString(undefined,{style:'currency',currency:'USD'}) : '—'}</span></div>
                  <div className="flex justify-between"><span>Subtotal Exp</span><span>{exp ? exp.subtotal.toLocaleString(undefined,{style:'currency',currency:'USD'}) : '—'}{std && exp && std.subtotal>0 && <span className="ml-1 text-blue-600">(+{Math.round(((exp.subtotal/std.subtotal)-1)*100)}%)</span>}</span></div>
                </div>
              );
            })()}
          </div>
        )}
        <div className="flex justify-between text-xs mb-4"><span>Status</span><span className="text-amber-500">processing</span></div>
        <div className="flex gap-2 mb-3">
          {/** Compute label to avoid nested ternaries for lint clarity */}
          {(() => {
            let label: string;
            if (previewLoading) {
              label = 'Loading…';
            } else if (previewMode) {
              label = 'Hide Preview';
            } else {
              label = 'Preview Pricing';
            }
            return (
          <button
            type="button"
            onClick={() => setPreviewMode(m => !m)}
            className={[
              'flex-1 px-2 py-1 rounded border text-[11px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600',
              'hover:bg-gray-50 dark:hover:bg-gray-800 relative overflow-hidden',
              previewLoading ? 'cursor-wait' : 'cursor-pointer'
            ].join(' ')}
            data-test="preview-toggle"
            disabled={previewLoading && !previewMode}
          >
            <span className="relative z-10">{label}</span>
            {previewMode && <span className="pointer-events-none absolute inset-0 opacity-10 bg-gradient-to-r from-blue-500 via-transparent to-blue-500 animate-[pulse_2s_linear_infinite]" />}
          </button>
            );
          })()}
          <button className="flex-1 px-2 py-1 rounded border text-[11px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed" disabled>
            Export CSV
          </button>
        </div>
        {previewError && <div className="text-[10px] text-red-600">Preview error: {previewError}</div>}
        {previewMode && preview && preview.lines.length > 0 && (
          <details className="mt-2 group" data-test="preview-lines">
            <summary className="cursor-pointer text-[10px] text-gray-600 dark:text-gray-400 group-open:mb-2">Preview Detail ({preview.lines.length})</summary>
            <ul className="space-y-1 max-h-40 overflow-auto pr-1">
              {preview.lines.map(l => {
                const activeTier = selectedTierByPart[l.part_external_id || ''] || 'standard';
                const activeTierData = l.price_tiers?.find(pt => pt.code === activeTier);
                const displayUnit = activeTierData?.unit_price ?? l.unit_price;
                const stdTier = l.price_tiers?.find(pt=>pt.code==='standard');
                const pctDelta = activeTier === 'expedited' && stdTier ? Math.round(((displayUnit / stdTier.unit_price) - 1) * 100) : 0;
                return (
                <li key={l.part_external_id} className="border border-gray-100 dark:border-gray-800 rounded p-1 text-[10px] flex flex-col gap-0.5">
                  <div className="flex justify-between items-start gap-1">
                    <span className="truncate max-w-[55%]" title={l.part_external_id}>{l.part_external_id}</span>
                    <div className="flex flex-col items-end">
                      <span>{displayUnit.toFixed(2)}{pctDelta>0 && <span className="ml-1 text-blue-600">+{pctDelta}%</span>}</span>
                      {l.price_tiers && (
                        <TierButtons
                          tiers={l.price_tiers}
                          active={activeTier}
                          onSelect={(code) => setSelectedTierByPart(prev => ({ ...prev, [l.part_external_id || '']: code }))}
                        />
                      )}
                    </div>
                  </div>
                  {l.notes && l.notes.length > 0 && (
                    <div className="text-[9px] text-amber-600">{l.notes.slice(0,2).join('; ')}{l.notes.length>2?'…':''}</div>
                  )}
                  <details className="mt-0.5">
                    <summary className="cursor-pointer text-[9px] text-gray-500">Breakdown</summary>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-0.5">
                      <BreakdownRow label="Material" value={l.breakdown.material_cost} />
                      <BreakdownRow label="Machine" value={l.breakdown.machine_cost} />
                      <BreakdownRow label="Finish" value={l.breakdown.finish_cost} />
                      <BreakdownRow label="Setup" value={l.breakdown.setup_cost} />
                      <BreakdownRow label="QA" value={l.breakdown.qa_cost} />
                      <BreakdownRow label="Overhead" value={l.breakdown.overhead} />
                      <BreakdownRow label="Margin" value={l.breakdown.margin} />
                      <div className="col-span-2 flex justify-between border-t border-dashed border-gray-200 dark:border-gray-700 pt-0.5 mt-0.5">
                        <span className="text-[9px] font-medium">Total</span>
                        <span className="text-[9px] font-medium">{displayUnit.toFixed(2)}</span>
                      </div>
                      <div className="col-span-2 text-[8px] text-gray-400 mt-0.5">
                        Lead: {(activeTierData?.days ?? l.lead_time_days)}d ({activeTier === 'standard' ? 'Std' : 'Exp'})
                        {activeTier === 'expedited' && activeTierData && l.lead_time_days > activeTierData.days && (
                          <span className="ml-1 text-blue-500">-{l.lead_time_days - activeTierData.days}d</span>
                        )}
                      </div>
                    </div>
                  </details>
                </li>
              );})}
            </ul>
            <div className="text-[9px] text-gray-500 mt-1">Snapshot {preview.snapshot_version}</div>
          </details>
        )}
        {/* NOTE(Future): Add dynamic lead time roll-up & selectable shipping/rush tiers */}
        <button className="w-full px-3 py-2 rounded bg-blue-600 text-white text-xs font-medium disabled:opacity-50" disabled data-test="checkout-cta">Proceed to Checkout</button>
      </div>
      <div className="rounded border border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-500">
        <p className="font-medium mb-2">Guidance</p>
        <p>Adjust materials, finishes, and quantities to update pricing in real time.</p>
        {/* NOTE(Future): Surface per-part warning badges and unresolved DFM blocker count */}
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="flex justify-between text-[9px]">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span>{value.toFixed(2)}</span>
    </div>
  );
}

interface TierButtonsProps {
  tiers: Array<{ code: 'standard' | 'expedited'; unit_price: number; total_price: number; days: number; price_multiplier: number }>;
  active: 'standard' | 'expedited';
  onSelect: (code: 'standard' | 'expedited') => void;
}

function TierButtons({ tiers, active, onSelect }: Readonly<TierButtonsProps>) {
  return (
    <div className="flex gap-1 mt-0.5" role="radiogroup">
      {tiers.map(t => {
        const isActive = t.code === active;
        const cls = [
          'px-1 py-[1px] rounded border text-[9px] transition-colors',
          isActive
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        ].join(' ');
        return (
          <button
            key={t.code}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(t.code)}
            className={cls}
          >
            {t.code === 'standard' ? 'Std' : 'Exp'}
          </button>
        );
      })}
    </div>
  );
}

function mapProcess(p?: string) {
  if (!p) return 'CNC-MILL-3AX';
  switch (p) {
    case 'cnc_milling': return 'CNC-MILL-3AX';
    case 'cnc_turning': return 'CNC-MILL-3AX'; // placeholder map
    case 'sheet_metal': return 'SHEET-LASER';
    default: return 'CNC-MILL-3AX';
  }
}
function mapMaterial(m?: string) {
  if (!m) return 'ALU-6061-T6';
  if (m === 'al_6061') return 'ALU-6061-T6';
  if (m === 'ss_304') return 'SS-304';
  return 'ALU-6061-T6';
}
function mapFinish(f?: string) {
  if (!f) return 'ANODIZE-CLEAR';
  const map: Record<string, string> = {
    anodized_clear: 'ANODIZE-CLEAR',
  anodized_black: 'ANODIZE-CLEAR', // NOTE(Future): distinct black anodize finish mapping
  };
  return map[f] || 'ANODIZE-CLEAR';
}
