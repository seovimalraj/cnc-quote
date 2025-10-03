import { FactorRegistry, PricingFactor } from './types';

const STAGE_ORDER: Record<PricingFactor['stage'], number> = {
  setup: 0,
  cost: 1,
  post_cost: 2,
  price: 3,
};

export class InMemoryFactorRegistry implements FactorRegistry {
  private factors: PricingFactor[] = [];

  register(factor: PricingFactor): void {
    this.factors.push(factor);
  }

  list(): PricingFactor[] {
    return this.factors
      .slice()
      .sort((a, b) => {
        const stageDelta = STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
        if (stageDelta !== 0) return stageDelta;
        const orderDelta = (a.order ?? 0) - (b.order ?? 0);
        if (orderDelta !== 0) return orderDelta;
        return a.name.localeCompare(b.name);
      });
  }
}
