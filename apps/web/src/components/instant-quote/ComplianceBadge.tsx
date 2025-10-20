"use client";

import React from 'react';
import clsx from 'clsx';
import { ContractsV1 } from '@cnc-quote/shared';
import { Badge } from '../ui/badge';
import { mapAlertCodeToLabel, pickWorstAlert } from '../../lib/compliance';

const severityVariant: Record<ContractsV1.QuoteComplianceAlertSeverityV1, 'secondary' | 'warning' | 'destructive'> = {
  info: 'secondary',
  warning: 'warning',
  critical: 'destructive',
};

interface ComplianceBadgeProps {
  snapshot?: ContractsV1.QuoteComplianceSnapshotV1 | null;
  alert?: ContractsV1.QuoteComplianceAlertV1;
  className?: string;
  size?: 'xs' | 'sm';
}

export function ComplianceBadge({ snapshot, alert, className, size = 'sm' }: Readonly<ComplianceBadgeProps>) {
  const resolved = alert ?? pickWorstAlert(snapshot?.alerts ?? []);
  if (!resolved) {
    return null;
  }

  const variant = severityVariant[resolved.severity] ?? 'secondary';
  const label = `${resolved.severity === 'critical' ? 'Critical' : resolved.severity === 'warning' ? 'Warning' : 'Info'} - ${mapAlertCodeToLabel(resolved.code)}`;

  return (
    <Badge
      variant={variant}
      className={clsx(
        'whitespace-nowrap',
        size === 'xs' ? 'px-2 py-0 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
        className,
      )}
      title={resolved.message}
    >
      {label}
    </Badge>
  );
}
