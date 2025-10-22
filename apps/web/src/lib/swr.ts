import type { SWRConfiguration, SWRKey, SWRResponse } from 'swr';

// Some build pipelines (Next.js 15) struggle with the SWR default export shape when tree-shaking
// or modularizing imports. This wrapper normalizes the export so callers can import the hook in a
// consistent way without worrying about the underlying module format.
const swrModule = require('swr');

const resolvedUseSWR: <Data = any, Error = any>(
  key: SWRKey,
  fetcher?: ((...args: any[]) => any) | null,
  config?: SWRConfiguration<Data, Error>
) => SWRResponse<Data, Error> =
  swrModule.default ?? swrModule.useSWR ?? swrModule;

export const useSWR = resolvedUseSWR;
export default resolvedUseSWR;
