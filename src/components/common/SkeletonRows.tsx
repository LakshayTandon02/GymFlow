import React from 'react';

export const SkeletonRows: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          {Array.from({ length: cols }).map((__, cIdx) => (
            <div
              key={cIdx}
              className={`h-3.5 bg-slate-200 rounded ${
                cIdx === 0 ? 'w-20' : cIdx === 1 ? 'flex-1 max-w-[180px]' : 'flex-1'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
