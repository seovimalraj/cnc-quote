import { PricingContext, PricingFactor, PricingToleranceMatch, PricingToleranceSummary } from "../../core/types";

const MULTIPLIER_EPSILON = 0.0001;

export const ToleranceMultiplierFactor: PricingFactor = {
  name: 'tolerance_multiplier',
  stage: 'post_cost',
  order: 50,
  applies: (ctx) => {
    const summary = ctx.input.toleranceSummary;
    const matches = ctx.input.toleranceMatches ?? [];
    const entries = ctx.input.toleranceEntries ?? [];

    if (!summary && matches.length === 0) {
      return false;
    }

    if (summary) {
      if (
        summary.machineMultiplier > 1 + MULTIPLIER_EPSILON ||
        summary.setupMultiplier > 1 + MULTIPLIER_EPSILON ||
        summary.inspectionMultiplier > 1 + MULTIPLIER_EPSILON ||
        summary.riskMultiplier > 1 + MULTIPLIER_EPSILON ||
        summary.reviewRequired
      ) {
        return true;
      }
    }

    if (matches.length > 0) {
      return true;
    }

    return entries.some((entry) => entry.reviewRequired);
  },
  compute: (ctx: PricingContext) => {
    const matches = ctx.input.toleranceMatches ?? [];
    const summary = ensureSummary(ctx.input.toleranceSummary, matches);
    const entries = ctx.input.toleranceEntries ?? [];

    if (!summary) {
      ctx.logs.push('[post_cost] tolerance_multiplier missing summary');
      return;
    }

    const machineLine = findBreakdownLine(ctx, 'machine_time');
    const setupLine = findBreakdownLine(ctx, 'setup_time');
    const deltas = calculateToleranceDeltas(summary, machineLine?.amount ?? 0, setupLine?.amount ?? 0);

    if (!shouldRecordToleranceLine(summary, matches, deltas.totalDelta)) {
      ctx.logs.push('[post_cost] tolerance_multiplier no-op');
      return;
    }

    const applied = applyToleranceDeltas(ctx, summary, machineLine, setupLine, deltas);

    ctx.breakdown.push({
      key: 'tolerance_multiplier',
      label: 'Tolerance Cost',
      amount: applied.totalAmount,
      meta: buildMeta(summary, matches, entries, ctx.input.toleranceCatalogVersion, applied),
    });

    if (summary.reviewRequired || entries.some((entry) => entry.reviewRequired)) {
      ctx.flags['tolerance.review_required'] = true;
    }
    if (summary.riskMultiplier > 1 + MULTIPLIER_EPSILON) {
      ctx.flags['tolerance.risk'] = true;
    }

    ctx.logs.push(`[post_cost] tolerance_multiplier applied delta=${applied.totalAmount.toFixed(2)}`);
  },
};

function ensureSummary(
  summary: PricingToleranceSummary | undefined,
  matches: PricingToleranceMatch[],
): PricingToleranceSummary | undefined {
  if (summary) {
    return summary;
  }

  if (matches.length === 0) {
    return undefined;
  }

  let machine = 1;
  let setup = 1;
  let risk = 1;

  for (const match of matches) {
    if (match.affects.includes('machine_time')) {
      machine = Math.max(machine, match.multiplier);
    }
    if (match.affects.includes('setup_time')) {
      setup = Math.max(setup, match.multiplier);
    }
    if (match.affects.includes('risk')) {
      risk = Math.max(risk, match.multiplier);
    }
  }

  return {
    machineMultiplier: machine,
    setupMultiplier: setup,
    inspectionMultiplier: 1,
    riskMultiplier: risk,
    entryCount: matches.length,
    tightestValueMm: undefined,
    sources: {},
    matchedRowIds: matches.map((match) => match.rowId),
    reviewRequired: matches.some((match) => match.reviewRequired === true),
  };
}

function computeDelta(baseAmount: number, multiplier: number): number {
  if (!baseAmount || multiplier <= 1 + MULTIPLIER_EPSILON) {
    return 0;
  }
  const delta = baseAmount * (multiplier - 1);
  return delta > 0 ? delta : 0;
}

function calculateToleranceDeltas(summary: PricingToleranceSummary, machineBase: number, setupBase: number) {
  const machineDelta = computeDelta(machineBase, summary.machineMultiplier);
  const setupDelta = computeDelta(setupBase, summary.setupMultiplier);
  return {
    machineDelta,
    setupDelta,
    totalDelta: machineDelta + setupDelta,
  };
}

function applyToleranceDeltas(
  ctx: PricingContext,
  summary: PricingToleranceSummary,
  machineLine: ReturnType<typeof findBreakdownLine>,
  setupLine: ReturnType<typeof findBreakdownLine>,
  deltas: ReturnType<typeof calculateToleranceDeltas>,
) {
  let machineAmount = 0;
  let setupAmount = 0;

  if (deltas.machineDelta > 0 && machineLine) {
    machineAmount = toMoney(deltas.machineDelta);
    ctx.subtotalCost += machineAmount;

    const machineMinutes = typeof machineLine.meta?.totalMinutes === 'number' ? machineLine.meta.totalMinutes : null;
    if (machineMinutes && machineMinutes > 0) {
      const minutesDelta = toMinutes(machineMinutes * (summary.machineMultiplier - 1));
      ctx.timeMinutes += minutesDelta;
      machineLine.meta = {
        ...machineLine.meta,
        toleranceMultiplier: roundMultiplier(summary.machineMultiplier),
        toleranceMinutesDelta: minutesDelta,
      };
    }
  }

  if (deltas.setupDelta > 0 && setupLine) {
    setupAmount = toMoney(deltas.setupDelta);
    ctx.subtotalCost += setupAmount;

    const setupMinutes = typeof setupLine.meta?.minutes === 'number' ? setupLine.meta.minutes : null;
    if (setupMinutes && setupMinutes > 0) {
      const minutesDelta = toMinutes(setupMinutes * (summary.setupMultiplier - 1));
      ctx.timeMinutes += minutesDelta;
      setupLine.meta = {
        ...setupLine.meta,
        toleranceMultiplier: roundMultiplier(summary.setupMultiplier),
        toleranceMinutesDelta: minutesDelta,
      };
    }
  }

  const totalAmount = toMoney(machineAmount + setupAmount);

  return {
    machineAmount,
    setupAmount,
    totalAmount,
  };
}

function shouldRecordToleranceLine(
  summary: PricingToleranceSummary,
  matches: PricingToleranceMatch[],
  totalDelta: number,
) {
  return (
    totalDelta > 0 ||
    summary.reviewRequired ||
    summary.riskMultiplier > 1 + MULTIPLIER_EPSILON ||
    matches.length > 0
  );
}

function findBreakdownLine(ctx: PricingContext, key: string) {
  return ctx.breakdown.find((line) => line.key === key);
}

function buildMeta(
  summary: PricingToleranceSummary,
  matches: PricingToleranceMatch[],
  entries: PricingContext['input']['toleranceEntries'] | undefined,
  catalogVersion: number | undefined,
  applied: { machineAmount: number; setupAmount: number; totalAmount: number },
) {
  const entriesList = entries ?? [];
  const matchSnapshot = matches.slice(0, 25).map((match) => ({
    rowId: match.rowId,
    entryKey: match.entryKey,
    affects: match.affects,
    multiplier: roundMultiplier(match.multiplier),
    featureType: match.featureType,
    appliesTo: match.appliesTo,
    value: match.value,
    unit: match.unit,
    source: match.source,
    notes: match.notes,
  }));

  return {
    machine_multiplier: roundMultiplier(summary.machineMultiplier),
    setup_multiplier: roundMultiplier(summary.setupMultiplier),
    inspection_multiplier: roundMultiplier(summary.inspectionMultiplier),
    risk_multiplier: roundMultiplier(summary.riskMultiplier),
    entry_count: summary.entryCount,
    review_required: summary.reviewRequired,
    catalog_version: catalogVersion,
    matches: matchSnapshot,
    matched_row_ids: summary.matchedRowIds,
    sources: summary.sources,
    tightest_value_mm: summary.tightestValueMm,
    machine_delta: applied.machineAmount,
    setup_delta: applied.setupAmount,
    entries_with_review_flags: entriesList
      .filter((entry) => entry.reviewRequired)
      .map((entry) => ({ key: entry.key, source: entry.source, value: entry.value, unit: entry.unit })),
  };
}

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}

function toMinutes(value: number): number {
  return Number(value.toFixed(2));
}

function roundMultiplier(value: number): number {
  return Number(value.toFixed(4));
}
