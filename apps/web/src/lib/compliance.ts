import { ContractsV1 } from '@cnc-quote/shared';

const severityRank: Record<ContractsV1.QuoteComplianceAlertSeverityV1, number> = {
  info: 1,
  warning: 2,
  critical: 3,
};

const alertCodeLabels: Record<ContractsV1.QuoteComplianceAlertCodeV1, string> = {
  margin_floor_breach: 'Margin Guardrail',
  manual_discount_high: 'High Discount',
  lead_time_override: 'Lead Time Override',
  lead_time_capacity_risk: 'Capacity Risk',
  dfm_high_risk: 'DFM High Risk',
  risk_markup_applied: 'Risk Markup',
  manual_override_applied: 'Manual Override',
};

export type RankedComplianceAlert = ContractsV1.QuoteComplianceAlertV1 & {
  rank: number;
};

export function pickWorstAlert(
  alerts?: ContractsV1.QuoteComplianceAlertV1[] | null,
): RankedComplianceAlert | undefined {
  if (!alerts || alerts.length === 0) {
    return undefined;
  }
  let worst: RankedComplianceAlert | undefined;
  for (const alert of alerts) {
    const rank = severityRank[alert.severity] ?? 0;
    if (!worst || rank > worst.rank) {
      worst = { ...alert, rank };
    }
  }
  return worst;
}

export function mapAlertCodeToLabel(code: ContractsV1.QuoteComplianceAlertCodeV1): string {
  if (alertCodeLabels[code]) {
    return alertCodeLabels[code];
  }
  return code
    .split('_')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function collectComplianceAlerts(args: {
  rows: Array<{
    quantity: number;
    compliance?: ContractsV1.QuoteComplianceSnapshotV1 | null;
  }>;
  partId: string;
}): Array<{
  partId: string;
  quantity: number;
  alert: ContractsV1.QuoteComplianceAlertV1;
  rank: number;
}> {
  const out: Array<{
    partId: string;
    quantity: number;
    alert: ContractsV1.QuoteComplianceAlertV1;
    rank: number;
  }> = [];
  for (const row of args.rows) {
    const alerts = row.compliance?.alerts;
    if (!alerts || alerts.length === 0) {
      continue;
    }
    for (const alert of alerts) {
      const rank = severityRank[alert.severity] ?? 0;
      out.push({ partId: args.partId, quantity: row.quantity, alert, rank });
    }
  }
  return out.sort((a, b) => b.rank - a.rank);
}
