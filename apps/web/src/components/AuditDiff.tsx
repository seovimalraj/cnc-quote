'use client';

import { useState, useMemo } from 'react';

interface AuditDiffProps {
  before?: unknown;
  after?: unknown;
}

const MAX_PREVIEW_CHARS = 4000;
const TRUNCATE_LABEL = '…\n[truncated]';

function stringify(value: unknown) {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch (error) {
    return `"[unserializable: ${(error as Error).message}]"`;
  }
}

function clamp(text: string) {
  if (text.length <= MAX_PREVIEW_CHARS) return text;
  return `${text.slice(0, MAX_PREVIEW_CHARS)}${TRUNCATE_LABEL}`;
}

export function AuditDiff({ before, after }: AuditDiffProps) {
  const [expanded, setExpanded] = useState(false);

  const beforeText = useMemo(() => stringify(before), [before]);
  const afterText = useMemo(() => stringify(after), [after]);

  const beforePreview = expanded ? beforeText : clamp(beforeText);
  const afterPreview = expanded ? afterText : clamp(afterText);

  const showToggle =
    beforeText.length > MAX_PREVIEW_CHARS || afterText.length > MAX_PREVIEW_CHARS;

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Before</span>
        </div>
        <pre className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {beforePreview}
        </pre>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">After</span>
          {showToggle && (
            <button
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? 'Collapse' : 'Show full payload'}
            </button>
          )}
        </div>
        <pre className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {afterPreview}
        </pre>
      </div>
    </div>
  );
}

export default AuditDiff;
