import React, { useState } from 'react';
import { formatINR } from '../../utils/membership';

export interface BarChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  secondaryLabel?: string;
}

interface RevenueBarChartProps {
  data: BarChartPoint[];
  height?: number;
  valueFormatter?: (val: number) => string;
  accentColor?: string;
}

export const RevenueBarChart: React.FC<RevenueBarChartProps> = ({
  data,
  height = 220,
  valueFormatter = formatINR,
  accentColor = '#2563EB',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full select-none">
      <div className="relative" style={{ height }}>
        {/* Y-Axis gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
          {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => (
            <div key={idx} className="flex items-center gap-3 w-full">
              <span className="text-[11px] font-mono tabular-nums text-slate-400 w-16 text-right shrink-0">
                {valueFormatter(Math.round(maxVal * ratio))}
              </span>
              <div className="flex-1 border-b border-slate-100" />
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="relative h-full flex items-end justify-between gap-2 sm:gap-4 pl-20 pr-2 pb-7 pt-2">
          {data.map((point, idx) => {
            const pct = Math.max((point.value / maxVal) * 100, 3);
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={point.label}
                className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute -top-2 -translate-y-full z-20 px-3 py-2 bg-slate-900 text-white rounded-lg shadow-lg text-xs whitespace-nowrap pointer-events-none">
                    <div className="font-semibold font-mono tabular-nums">
                      {valueFormatter(point.value)}
                    </div>
                    {point.secondaryValue !== undefined && (
                      <div className="text-slate-300 text-[11px] mt-0.5 tabular-nums">
                        {point.secondaryValue} {point.secondaryLabel ?? 'items'}
                      </div>
                    )}
                  </div>
                )}

                <div className="w-full max-w-[44px] h-full flex items-end justify-center">
                  <div
                    className="w-full rounded-t-md transition-all duration-200"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: isHovered ? '#1D4ED8' : accentColor,
                      opacity: hoveredIdx !== null && !isHovered ? 0.55 : 1,
                    }}
                  />
                </div>
                <span className="absolute -bottom-6 text-xs font-medium text-slate-500">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface StatusDonutChartProps {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string | number;
}

export const StatusDonutChart: React.FC<StatusDonutChartProps> = ({
  segments,
  centerLabel,
  centerValue,
}) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 56;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            segments.map((seg) => {
              if (seg.value <= 0) return null;
              const fraction = seg.value / total;
              const dashLength = fraction * circumference;
              const dashOffset = -cumulativePercent * circumference;
              cumulativePercent += fraction;

              return (
                <circle
                  key={seg.label}
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  className="transition-all duration-300"
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-display text-2xl font-bold text-slate-900 tabular-nums">
            {centerValue}
          </span>
          <span className="text-xs text-slate-500">{centerLabel}</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-3">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={seg.label} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-slate-700 font-medium truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums text-xs">
                <span className="font-semibold text-slate-900">{seg.value}</span>
                <span className="text-slate-400 w-9 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
