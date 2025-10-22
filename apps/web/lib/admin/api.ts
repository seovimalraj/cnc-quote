import { ContractsV1, ContractsVNext } from '@cnc-quote/shared';
import type { AdminReviewItem, ReviewDetailResponse, ReviewListResponse } from './types';
import { listQueryZ, type ReviewListQuery } from './validation';

const baseInit: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
};

const VALID_LANES = new Set<ContractsVNext.AdminReviewLaneVNext>(['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED']);
const VALID_PRIORITIES = new Set<ContractsVNext.AdminReviewPriorityVNext>(['LOW', 'MED', 'HIGH', 'EXPEDITE']);

function toStringValue(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return null;
}

function toNumberValue(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeLane(value: unknown): ContractsVNext.AdminReviewLaneVNext {
  if (typeof value === 'string') {
    const normalized = value.toUpperCase().replace(/[-\s]+/g, '_');

    if (VALID_LANES.has(normalized as ContractsVNext.AdminReviewLaneVNext)) {
      return normalized as ContractsVNext.AdminReviewLaneVNext;
    }

    if (normalized === 'PENDING' || normalized === 'PENDING_REVIEW') {
      return 'NEW';
    }

    if (normalized === 'INREVIEW') {
      return 'IN_REVIEW';
    }
  }

  return 'NEW';
}

function normalizePriority(value: unknown): ContractsVNext.AdminReviewPriorityVNext {
  if (typeof value === 'string') {
    const normalized = value.toUpperCase();
    if (VALID_PRIORITIES.has(normalized as ContractsVNext.AdminReviewPriorityVNext)) {
      return normalized as ContractsVNext.AdminReviewPriorityVNext;
    }

    if (normalized === 'MEDIUM') {
      return 'MED';
    }

    if (normalized === 'EXPEDITED') {
      return 'EXPEDITE';
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 1) return 'EXPEDITE';
    if (value === 2) return 'HIGH';
    if (value === 3) return 'MED';
  }

  return 'LOW';
}

function normalizeSeverity(value: unknown): 'LOW' | 'MED' | 'HIGH' | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.toUpperCase();
  if (normalized === 'HIGH' || normalized === 'BLOCKER' || normalized === 'CRITICAL') {
    return 'HIGH';
  }
  if (normalized === 'MED' || normalized === 'MEDIUM' || normalized === 'WARNING' || normalized === 'WARN') {
    return 'MED';
  }
  if (normalized === 'LOW' || normalized === 'INFO') {
    return 'LOW';
  }
  return undefined;
}

function normalizeReviewItem(raw: any): AdminReviewItem {
  const fallbackQuoteId = toStringValue(
    raw?.quoteId ?? raw?.quote_id ?? raw?.quoteNo ?? raw?.quoteNumber ?? raw?.quote?.id ?? raw?.id ?? '',
  );
  const ticketId = toStringValue(
    raw?.id ?? raw?.taskId ?? raw?.task_id ?? raw?.ticketId ?? raw?.ticket_id ?? fallbackQuoteId,
    fallbackQuoteId || '',
  );
  const quoteId = fallbackQuoteId || ticketId;
  const quoteNumber = toNullableString(
    raw?.quoteNumber ?? raw?.quoteNo ?? raw?.quote_number ?? raw?.quoteId ?? raw?.quote_id ?? raw?.quote?.id,
  );
  const quoteNo = toNullableString(raw?.quoteNo ?? raw?.quote_number ?? raw?.quoteNumber);

  const totalItemsCandidate = toNumberValue(
    typeof raw?.totalItems === 'number' ? raw.totalItems : raw?.total_items,
    0,
  );
  const totalItems = Math.max(0, Math.round(totalItemsCandidate ?? 0));

  const totalValue = toNumberValue(raw?.totalValue ?? raw?.total_value ?? raw?.value, null);
  const dfmFindingCandidate = toNumberValue(
    raw?.dfmFindingCount ?? raw?.dfm_finding_count ?? raw?.dfm_blockers ?? raw?.dfm_blockers_count,
    null,
  );
  const dfmFindingCount = dfmFindingCandidate === null ? null : Math.max(0, Math.round(dfmFindingCandidate));
  const createdAt = toStringValue(
    raw?.createdAt ?? raw?.created_at ?? raw?.created ?? raw?.quote?.created_at ?? new Date().toISOString(),
    new Date().toISOString(),
  );
  const lastActionAt =
    toNullableString(raw?.lastActionAt ?? raw?.last_action_at ?? raw?.updated_at ?? raw?.quote?.updated_at) ?? null;
  const statusReason =
    toNullableString(raw?.statusReason ?? raw?.status_reason ?? raw?.rule?.message ?? raw?.rule?.name) ?? null;
  const currency =
    toNullableString(raw?.currency ?? raw?.currency_code ?? raw?.quote?.currency ?? raw?.quote?.currency_code) ??
    undefined;
  const priority = normalizePriority(raw?.priority ?? raw?.rule?.priority);
  const lane = normalizeLane(raw?.lane ?? raw?.status);
  const assignee =
    toNullableString(raw?.assignee ?? raw?.assignee_id ?? raw?.assignee?.name ?? raw?.assignee?.email) ?? null;
  const submittedBy =
    toNullableString(
      raw?.submittedBy ?? raw?.submitted_by ?? raw?.submitter ?? raw?.submitter_name ?? raw?.created_by,
    ) ?? null;
  const customerName =
    toNullableString(
      raw?.customerName ?? raw?.customer_name ?? raw?.customer?.name ?? raw?.customer?.full_name,
    ) ?? null;
  const company =
    toNullableString(raw?.company ?? raw?.customer?.company ?? raw?.org ?? raw?.org_name ?? raw?.organization) ?? null;

  const base = {
    id: ticketId || quoteId,
    quoteId: quoteId || ticketId,
  quoteNumber: quoteNumber ?? quoteNo ?? (quoteId || ticketId),
    customerName,
    company,
    lane,
    statusReason,
  totalItems,
    totalValue,
    currency,
    dfmFindingCount,
    priority,
    assignee,
    submittedBy,
    createdAt,
    lastActionAt,
  };

  const parsed = ContractsVNext.AdminReviewItemSchema.parse(base);

  return {
    ...parsed,
    quoteNo: quoteNo ?? null,
  };
}

function normalizeReviewWorkspace(input: any): ContractsVNext.AdminReviewWorkspaceVNext {
  const raw = input ?? {};
  const dfmSource = Array.isArray(raw.dfm)
    ? raw.dfm
    : Array.isArray(raw.dfm_results?.findings)
    ? raw.dfm_results.findings
    : Array.isArray(raw.findings)
    ? raw.findings
    : [];

  const dfm = dfmSource.map((issue: any, index: number) => ({
    id: toStringValue(issue?.id ?? `dfm-${index}`, `dfm-${index}`),
    severity: normalizeSeverity(issue?.severity),
    rule: toNullableString(issue?.rule ?? issue?.check_id ?? issue?.code ?? issue?.name),
    partId: toNullableString(issue?.partId ?? issue?.part_id ?? issue?.line_id ?? issue?.dfm_line_id),
    message: toStringValue(issue?.message ?? issue?.note ?? 'DFM issue'),
    createdAt: toStringValue(
      issue?.createdAt ??
        issue?.created_at ??
        issue?.updated_at ??
        raw?.updated_at ??
        new Date().toISOString(),
      new Date().toISOString(),
    ),
  }));

  const pricingSource = raw.pricingSummary ?? raw.pricing ?? raw.pricing_summary ?? {};
  const pricing = {
    materialCost: toNumberValue(
      pricingSource.materialCost ?? pricingSource.material_cost ?? pricingSource.material,
      null,
    ),
    machiningCost: toNumberValue(
      pricingSource.machiningCost ?? pricingSource.machining_cost ?? pricingSource.machining,
      null,
    ),
    finishingCost: toNumberValue(
      pricingSource.finishingCost ?? pricingSource.finishing_cost ?? pricingSource.finishing,
      null,
    ),
    total: toNumberValue(
      pricingSource.total ?? pricingSource.total_price ?? pricingSource.subtotal ?? pricingSource.amount,
      null,
    ),
    currency: toNullableString(pricingSource.currency ?? pricingSource.currency_code ?? raw.currency),
  };

  const activitySource = Array.isArray(raw.activity)
    ? raw.activity
    : Array.isArray(raw.timeline)
    ? raw.timeline
    : Array.isArray(raw.activity_log)
    ? raw.activity_log
    : [];

  const activity = activitySource.map((entry: any, index: number) => {
    const meta = entry?.meta;
    return {
      id: toStringValue(entry?.id ?? entry?.event_id ?? `activity-${index}`, `activity-${index}`),
      actor: toNullableString(entry?.actor ?? entry?.user ?? entry?.user_id ?? entry?.actor_name),
      action: toStringValue(entry?.action ?? entry?.name ?? entry?.event ?? entry?.status ?? 'event'),
      at: toStringValue(
        entry?.at ??
          entry?.timestamp ??
          entry?.ts ??
          entry?.created_at ??
          entry?.updated_at ??
          new Date().toISOString(),
        new Date().toISOString(),
      ),
      meta: meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : undefined,
    };
  });

  const notesSource = Array.isArray(raw.notes) ? raw.notes : Array.isArray(raw.note_list) ? raw.note_list : [];
  const notes = notesSource.map((entry: any, index: number) => ({
    id: toStringValue(entry?.id ?? entry?.note_id ?? `note-${index}`, `note-${index}`),
    author: toNullableString(entry?.author ?? entry?.user ?? entry?.user_id ?? entry?.author_name),
    text: toNullableString(entry?.text ?? entry?.content ?? entry?.note),
    at: toStringValue(
      entry?.at ?? entry?.timestamp ?? entry?.created_at ?? entry?.updated_at ?? new Date().toISOString(),
      new Date().toISOString(),
    ),
  }));

  return ContractsVNext.AdminReviewWorkspaceSchema.parse({
    dfm,
    pricingSummary: pricing,
    activity,
    notes,
  });
}

function normalizeReviewListResponse(raw: any): ReviewListResponse {
  const rows = Array.isArray(raw?.data) ? (raw.data as unknown[]) : [];
  const normalizedItems: AdminReviewItem[] = rows.map((row) => normalizeReviewItem(row));

  const metaSource = raw?.meta ?? {};
  const limitValue = toNumberValue(metaSource.limit ?? raw?.limit, 25) ?? 25;
  const meta = {
    limit: Math.max(1, Math.round(limitValue)),
    totalApprox: toNumberValue(metaSource.totalApprox ?? metaSource.total ?? raw?.total ?? null, null),
    nextCursor: toNullableString(metaSource.nextCursor ?? metaSource.next_cursor ?? raw?.cursor),
  };

  const statsSource = raw?.stats ?? {};
  const rowsValue = toNumberValue(statsSource.totalRows ?? raw?.totalRows, 0) ?? 0;
  const stats = {
    totalRows: Math.max(0, Math.round(rowsValue)),
    totalValue: toNumberValue(statsSource.totalValue ?? statsSource.value ?? raw?.totalValue ?? null, null),
    conversionRate: toNumberValue(
      statsSource.conversionRate ?? statsSource.conversion_rate ?? raw?.conversionRate ?? null,
      null,
    ),
  };

  const parsed = ContractsVNext.AdminReviewListSchema.parse({
    data: normalizedItems.map(({ quoteNo: _quoteNo, ...rest }: AdminReviewItem) => rest),
    meta,
    stats,
  });

  return {
    data: parsed.data.map((item, index) => ({
      ...item,
      quoteNo: normalizedItems[index]?.quoteNo ?? null,
    })),
    meta: parsed.meta,
    stats: parsed.stats,
  };
}

function normalizeReviewDetailResponse(raw: any): ReviewDetailResponse {
  const normalizedItem = normalizeReviewItem(raw?.item ?? raw);
  const workspace = normalizeReviewWorkspace(raw?.workspace ?? raw?.item?.workspace ?? {});
  const { quoteNo, ...itemWithoutLegacy } = normalizedItem;

  return {
    item: {
      ...itemWithoutLegacy,
      quoteNo: quoteNo ?? null,
    },
    workspace,
  };
}

export type NormalizedReviewListParams = {
  parsed: ReviewListQuery;
  searchParams: URLSearchParams;
  cacheKey: string;
};

export type AdminQuotesListResponse = ContractsVNext.AdminReviewListResponseVNext;
export type AdminQuoteDetailResponse = ContractsVNext.AdminReviewDetailResponseVNext;
export type AdminDashboardStatsResponse = ContractsVNext.AdminDashboardStatsResponseVNext;
export type AbandonedQuotesListResponse = ContractsVNext.AbandonedQuotesListVNext;
export type QuoteTimelineResponse = ContractsVNext.QuoteTimelineVNext;
export type QuoteSummaryVNext = ContractsVNext.QuoteSummaryVNext;

export function normalizeReviewListParams(
  raw: ReviewListQuery | Record<string, unknown>,
): NormalizedReviewListParams {
  const parsed = listQueryZ.parse(raw);
  const params = new URLSearchParams();
  const record = parsed as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort((a, b) => a.localeCompare(b));

  for (const key of sortedKeys) {
    const values = normalizeValues(record[key]);
    for (const entry of values) {
      params.append(key, entry);
    }
  }

  return {
    parsed,
    searchParams: params,
    cacheKey: params.toString(),
  };
}

function normalizeValues(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeScalar(entry))
      .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      .sort((a, b) => a.localeCompare(b));
  }

  const scalar = normalizeScalar(value);
  return scalar ? [scalar] : [];
}

function normalizeScalar(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return Number.isFinite(value) ? String(value) : null;
    case 'string':
      return value.length > 0 ? value : null;
    default:
      return null;
  }
}

async function httpError(res: Response): Promise<never> {
  const text = await res.text().catch(() => '');
  let payload: any;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text || res.statusText };
  }

  const error = new Error(payload.error || `HTTP ${res.status}`) as Error & {
    code?: string;
    requestId?: string;
    details?: unknown;
  };

  error.code = payload.code || String(res.status);
  error.requestId = payload.requestId;
  error.details = payload.details;

  throw error;
}

export async function fetchReviewList(
  rawParams: ReviewListQuery | Record<string, unknown>,
): Promise<ReviewListResponse> {
  const { searchParams } = normalizeReviewListParams(rawParams);
  const res = await fetch(`/api/admin/review?${searchParams.toString()}`, baseInit);

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return normalizeReviewListResponse(json);
}

export async function fetchReviewDetail(quoteId: string): Promise<ReviewDetailResponse> {
  const res = await fetch(`/api/admin/review/${quoteId}`, baseInit);

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return normalizeReviewDetailResponse(json);
}

export async function fetchAdminDashboardStats(period = '30d'): Promise<AdminDashboardStatsResponse> {
  const params = new URLSearchParams();
  if (period) {
    params.set('period', period);
  }

  const query = params.toString();
  const url = query ? `/api/admin/dashboard/stats?${query}` : '/api/admin/dashboard/stats';

  const res = await fetch(url, {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return ContractsVNext.AdminDashboardStatsSchema.parse(json);
}

export async function fetchAdminQuotesList(
  rawParams: ReviewListQuery | Record<string, unknown>,
): Promise<AdminQuotesListResponse> {
  const { searchParams } = normalizeReviewListParams(rawParams);
  const query = searchParams.toString();
  const url = query ? `/api/admin/quotes?${query}` : '/api/admin/quotes';

  const res = await fetch(url, {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return ContractsVNext.AdminReviewListSchema.parse(json);
}

export async function fetchAdminQuoteDetail(quoteId: string): Promise<AdminQuoteDetailResponse> {
  if (!quoteId) {
    throw new Error('quoteId is required');
  }

  const res = await fetch(`/api/admin/quotes/${encodeURIComponent(quoteId)}`, {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return ContractsVNext.AdminReviewDetailSchema.parse(json);
}

export async function fetchQuoteSummaryVNext(quoteId: string): Promise<QuoteSummaryVNext> {
  if (!quoteId) {
    throw new Error('quoteId is required');
  }

  const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}?view=vnext`, {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return ContractsVNext.QuoteSummarySchema.parse(json);
}

export type AbandonedQuoteFilters = {
  age?: string;
  value_band?: string;
  stage?: string;
  search?: string;
};

export async function fetchAbandonedQuotes(
  filters?: AbandonedQuoteFilters,
): Promise<AbandonedQuotesListResponse> {
  const params = new URLSearchParams();
  if (filters) {
    const entries = Object.entries(filters) as Array<[keyof AbandonedQuoteFilters, string | undefined]>;
    for (const [key, value] of entries) {
      if (value && value.length > 0) {
        params.set(key, value);
      }
    }
  }

  const query = params.toString();
  const url = query ? `/api/admin/abandoned?${query}` : '/api/admin/abandoned';

  const res = await fetch(url, {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return ContractsVNext.AbandonedQuoteListSchema.parse(json);
}

export async function fetchAbandonedTimeline(quoteId: string): Promise<QuoteTimelineResponse> {
  if (!quoteId) {
    throw new Error('quoteId is required');
  }

  const res = await fetch(`/api/admin/abandoned/${encodeURIComponent(quoteId)}/timeline`, {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return ContractsVNext.QuoteTimelineSchema.parse(json);
}

export async function assignReviewTicket(ticketId: string, userId: string): Promise<void> {
  if (!ticketId) {
    throw new Error('ticketId is required');
  }

  if (!userId) {
    throw new Error('userId is required');
  }

  const res = await fetch(`/api/admin/review/${encodeURIComponent(ticketId)}/assign`, {
    ...baseInit,
    method: 'PUT',
    body: JSON.stringify({ user_id: userId }),
  });

  if (!res.ok) {
    await httpError(res);
  }
}

export async function moveReviewTicket(
  ticketId: string,
  lane: AdminReviewItem['lane'],
): Promise<void> {
  if (!ticketId) {
    throw new Error('ticketId is required');
  }

  if (!lane) {
    throw new Error('lane is required');
  }

  const res = await fetch(`/api/admin/review/${encodeURIComponent(ticketId)}/move`, {
    ...baseInit,
    method: 'PUT',
    body: JSON.stringify({ lane }),
  });

  if (!res.ok) {
    await httpError(res);
  }
}

export async function acknowledgeReviewDfmFinding(
  quoteId: string,
  findingId: string,
  note?: string,
): Promise<void> {
  if (!quoteId) {
    throw new Error('quoteId is required');
  }

  if (!findingId) {
    throw new Error('findingId is required');
  }

  const payload = note && note.trim().length > 0 ? { note } : {};

  const res = await fetch(
    `/api/admin/review/${encodeURIComponent(quoteId)}/dfm/${encodeURIComponent(findingId)}/ack`,
    {
      ...baseInit,
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await httpError(res);
  }
}

export async function assignAbandonedQuote(quoteId: string, userId: string): Promise<void> {
  if (!quoteId) {
    throw new Error('quoteId is required');
  }

  if (!userId) {
    throw new Error('userId is required');
  }

  const res = await fetch(`/api/admin/abandoned/${encodeURIComponent(quoteId)}/assign`, {
    ...baseInit,
    method: 'PUT',
    body: JSON.stringify({ user_id: userId }),
  });

  if (!res.ok) {
    await httpError(res);
  }
}

export type AbandonedReminderPayload = {
  template: string;
  channel: string;
};

export async function sendAbandonedQuoteReminder(
  quoteId: string,
  payload: AbandonedReminderPayload = { template: 'resume_quote', channel: 'email' },
): Promise<void> {
  if (!quoteId) {
    throw new Error('quoteId is required');
  }

  const res = await fetch(`/api/admin/abandoned/${encodeURIComponent(quoteId)}/remind`, {
    ...baseInit,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await httpError(res);
  }
}

export async function updateQuoteLifecycleStatus(
  quoteId: string,
  status: string,
): Promise<void> {
  if (!quoteId) {
    throw new Error('quoteId is required');
  }

  if (!status) {
    throw new Error('status is required');
  }

  const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
    ...baseInit,
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    await httpError(res);
  }
}

export async function fetchAdminRecentEvents(limit = 10): Promise<ContractsV1.AdminRecentEventsResponseV1> {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 10;
  const params = new URLSearchParams();
  params.set('limit', String(normalizedLimit));

  const query = params.toString();
  const url = query ? `/api/admin/events/recent?${query}` : '/api/admin/events/recent';

  const res = await fetch(url, {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  return res.json();
}

export async function fetchAdminPages(): Promise<ContractsV1.AdminCmsPagesResponseV1> {
  const res = await fetch('/api/admin/content/pages', {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  return res.json();
}

export type UpsertAdminPagePayload = {
  id?: string;
  slug: string;
  title: string;
  status?: ContractsV1.AdminCmsStatusV1;
  summary?: string | null;
  content?: string | null;
  hero_image?: string | null;
  seo_description?: string | null;
};

export async function saveAdminPage(payload: UpsertAdminPagePayload): Promise<ContractsV1.AdminCmsPageV1> {
  const { id, ...rest } = payload;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/admin/content/pages/${encodeURIComponent(id)}` : '/api/admin/content/pages';

  const res = await fetch(url, {
    ...baseInit,
    method,
    body: JSON.stringify(rest),
  });

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return json?.data as ContractsV1.AdminCmsPageV1;
}

export async function fetchAdminDocuments(): Promise<ContractsV1.AdminCmsDocumentsResponseV1> {
  const res = await fetch('/api/admin/content/documents', {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  return res.json();
}

export type UpsertAdminDocumentPayload = {
  id?: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  document_type?: string | null;
  asset_url?: string | null;
  storage_path?: string | null;
  status?: ContractsV1.AdminCmsStatusV1;
};

export async function saveAdminDocument(payload: UpsertAdminDocumentPayload): Promise<ContractsV1.AdminCmsDocumentV1> {
  const { id, ...rest } = payload;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/admin/content/documents/${encodeURIComponent(id)}` : '/api/admin/content/documents';

  const res = await fetch(url, {
    ...baseInit,
    method,
    body: JSON.stringify(rest),
  });

  if (!res.ok) {
    await httpError(res);
  }

  const json = await res.json();
  return json?.data as ContractsV1.AdminCmsDocumentV1;
}

export async function exportReviewCsv(rawParams: ReviewListQuery | Record<string, unknown>): Promise<Blob> {
  const { searchParams } = normalizeReviewListParams(rawParams);
  const res = await fetch(`/api/admin/review/export.csv?${searchParams.toString()}`, {
    ...baseInit,
    headers: {
      ...baseInit.headers,
      Accept: 'text/csv',
    },
  });

  if (!res.ok) {
    await httpError(res);
  }

  return res.blob();
}
