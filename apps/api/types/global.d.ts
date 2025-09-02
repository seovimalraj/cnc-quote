// Type augmentations to fix dependency type issues

// Fix for @types/react scheduler/tracing issue
declare module 'scheduler/tracing' {
  export interface Interaction {
    name: string;
    timestamp: number;
  }
  export const unstable_trace: any;
  export const unstable_getCurrent: any;
}

// Fix for nodemailer AWS SDK issue
declare module '@aws-sdk/client-sesv2' {
  export * from '@aws-sdk/client-sesv2/dist-types/index';
  const defaultExport: any;
  export default defaultExport;
}

// Global type fixes
declare global {
  interface MapIterator<T> extends Iterator<T> {
    [Symbol.iterator](): MapIterator<T>;
  }
}

export {};
