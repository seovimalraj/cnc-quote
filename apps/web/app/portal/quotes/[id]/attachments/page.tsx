import { Suspense } from 'react';
import AttachmentsClient from './AttachmentsClient';

export default function AttachmentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AttachmentsClient />
    </Suspense>
  );
}
