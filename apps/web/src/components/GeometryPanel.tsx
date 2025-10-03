"use client";
import React from 'react';

export interface GeometryPanelProps {
  geometry?: any;
  loading?: boolean;
  className?: string;
}

function formatNumber(n: any) {
  if (n === null || n === undefined || isNaN(Number(n))) return '-';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export const GeometryPanel: React.FC<GeometryPanelProps> = ({ geometry, loading, className }) => {
  if (loading && !geometry) {
    return <div className={"rounded border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-500 " + (className||'')}>Extracting geometry...</div>;
  }
  if (!geometry) {
    return <div className={"rounded border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-500 " + (className||'')}>No geometry data yet.</div>;
  }
  const { bbox, volume, surface_area, features, status, updated_at } = geometry;
  return (
    <div className={"rounded border border-gray-200 dark:border-gray-700 p-3 " + (className||'')}>
      <h3 className="text-xs font-semibold text-gray-500 mb-2">GEOMETRY</h3>
      <div className="grid grid-cols-3 gap-2 text-[10px] mb-2">
        <div><span className="block text-gray-500">Volume</span>{formatNumber(volume)} mm³</div>
        <div><span className="block text-gray-500">Surface</span>{formatNumber(surface_area)} mm²</div>
        {bbox && <div><span className="block text-gray-500">BBox</span>{bbox.join('×')}</div>}
      </div>
      {status && <div className="text-[10px] mb-2"><span className="text-gray-500">Status:</span> <span className="uppercase tracking-wide">{status}</span></div>}
      {features && Array.isArray(features) && features.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-medium text-gray-500 mb-1">Features</div>
          <ul className="max-h-28 overflow-auto space-y-1 text-[10px] pr-1">
            {features.slice(0,50).map((f: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between">
                <span className="truncate max-w-[60%]" title={f.type || f.name}>{f.type || f.name || 'feature'}</span>
                <span className="text-gray-500">{f.count || f.size || ''}</span>
              </li>
            ))}
            {features.length > 50 && <li className="text-gray-400">+{features.length-50} more…</li>}
          </ul>
        </div>
      )}
      {updated_at && <div className="text-[10px] text-gray-500">Updated {new Date(updated_at).toLocaleTimeString()}</div>}
    </div>
  );
};

export default GeometryPanel;
