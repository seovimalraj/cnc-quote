import { PricingContext, PricingFactor } from "../../core/types";
import { RiskContribution, RiskSeverity, RISK_SEVERITY_MARKUP } from "../../../../modules/features/dfm/risk.model";

const toMoney = (value: number): number => Number(value.toFixed(2));

export const RiskMarkupFactor: PricingFactor = {
  name: 'risk_markup',
  stage: 'post_cost',
  order: 60,
  applies: (ctx: PricingContext) => Boolean(ctx.input.features?.risk?.severity),
  compute: (ctx: PricingContext) => {
    const risk = ctx.input.features?.risk as
      | {
          severity: RiskSeverity;
          score?: number;
          markup?: number;
          contributions?: RiskContribution[];
        }
      | undefined;

    if (!risk?.severity) {
      return;
    }

    const markupDelta = risk.markup !== undefined ? risk.markup - 1 : RISK_SEVERITY_MARKUP[risk.severity] ?? 0;
    if (markupDelta <= 0) {
      ctx.breakdown.push({
        key: 'risk_markup',
        label: 'Risk Markup',
        amount: 0,
        meta: {
          severity: risk.severity,
          score: risk.score,
          markup_multiplier: 1,
          contributions: [],
        },
      });
      return;
    }

    const deltaAmount = toMoney(ctx.subtotalCost * markupDelta);
    ctx.subtotalCost += deltaAmount;

    const contributions = Array.isArray(risk.contributions) ? risk.contributions : [];
    const totalComponent = contributions.reduce((acc, item) => acc + item.scoreComponent, 0);
    const dimensionBreakdown = contributions.map((item) => {
      const share = totalComponent > 0 ? item.scoreComponent / totalComponent : 0;
      return {
        dimension: item.dimension,
        share: Number(share.toFixed(4)),
        amount: toMoney(deltaAmount * share),
        weight: item.weight,
        value: item.value,
        scoreComponent: item.scoreComponent,
      };
    });

    ctx.breakdown.push({
      key: 'risk_markup',
      label: 'Risk Markup',
      amount: deltaAmount,
      meta: {
        severity: risk.severity,
        score: risk.score,
        markup_multiplier: Number((1 + markupDelta).toFixed(3)),
        contributions: dimensionBreakdown,
      },
    });
  },
};
