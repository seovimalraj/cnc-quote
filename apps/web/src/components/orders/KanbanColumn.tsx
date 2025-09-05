import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ id, title, color, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col w-80 min-h-full bg-gray-50 rounded-lg border-2 border-dashed
        ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
        transition-colors duration-200
      `}
    >
      {/* Column Header */}
      <div className={`${color} p-4 rounded-t-lg border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-800">
            {count}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
