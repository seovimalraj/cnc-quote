// @ts-nocheck
/// <reference types="jest" />
import { QuoteRevisionsService } from './quote-revisions.service';

describe('QuoteRevisionsService snapshot diff', () => {
  const createService = () => new QuoteRevisionsService({ client: {} } as any);

  it('captures newly added fields when no previous snapshot exists', () => {
    const service = createService();
    const summary = service['computeSnapshotDiffSummary'](null, {
      subtotal: 1200,
      status: 'ready',
      pricing: {
        subtotal: 1200,
        total: 1300,
      },
    });

    expect(summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'subtotal', previous: undefined, current: 1200 }),
        expect.objectContaining({ field: 'status', previous: undefined, current: 'ready' }),
        expect.objectContaining({ field: 'pricing.subtotal', previous: undefined, current: 1200 }),
        expect.objectContaining({ field: 'pricing.total', previous: undefined, current: 1300 }),
      ]),
    );
  });

  it('captures updates and removals between snapshots', () => {
    const service = createService();
    const summary = service['computeSnapshotDiffSummary'](
      {
        status: 'draft',
        pricing: { subtotal: 900, total: 950 },
        notes: 'initial',
      },
      {
        status: 'ready',
        pricing: { subtotal: 1100, total: 1200 },
      },
    );

    expect(summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'status', previous: 'draft', current: 'ready' }),
        expect.objectContaining({ field: 'pricing.subtotal', previous: 900, current: 1100 }),
        expect.objectContaining({ field: 'pricing.total', previous: 950, current: 1200 }),
        expect.objectContaining({ field: 'notes', previous: 'initial', current: undefined }),
      ]),
    );
  });
});
