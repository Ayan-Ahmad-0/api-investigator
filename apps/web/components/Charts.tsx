'use client';

import React, { useState } from 'react';
import { formatLatency, formatPercentage } from '@/lib/utils';

interface TimePoint {
  timestamp: string;
  p50?: number;
  p95?: number;
  p99?: number;
  error_rate?: number;
}

interface LatencyChartProps {
  data: TimePoint[];
  height?: number;
}

export const LatencyChart: React.FC<LatencyChartProps> = ({ data, height = 180 }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
        No latency data in this time window
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.p95 || 0, d.p50 || 0)), 100);
  const width = 600;
  const padding = { top: 20, right: 30, bottom: 25, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const pointsP95 = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.p95 || 0) / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const pointsP50 = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.p50 || 0) / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Response Time Trend
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Median (P50) vs Tail Latency (P95)</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-blue-600 rounded-full inline-block" />
            <span className="text-slate-600 dark:text-slate-300">P50 Median</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-amber-500 rounded-full inline-block" />
            <span className="text-slate-600 dark:text-slate-300">P95 Tail</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Y Axis Gridlines & Labels */}
          {[0, 0.5, 1].map((ratio) => {
            const yVal = maxVal * (1 - ratio);
            const yPos = padding.top + chartHeight * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800 stroke-1"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  className="text-[11px] fill-slate-400 dark:fill-slate-500 font-mono"
                >
                  {formatLatency(yVal)}
                </text>
              </g>
            );
          })}

          {/* Polyline P95 */}
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pointsP95}
          />

          {/* Polyline P50 */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pointsP50}
          />

          {/* X Axis Timestamps */}
          {data.map((d, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            return (
              <text
                key={i}
                x={x}
                y={height - 5}
                textAnchor="middle"
                className="text-[11px] fill-slate-400 dark:fill-slate-500 font-mono"
              >
                {d.timestamp}
              </text>
            );
          })}

          {/* Hover hitboxes */}
          {data.map((d, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            return (
              <rect
                key={i}
                x={x - chartWidth / (data.length * 2)}
                y={padding.top}
                width={chartWidth / data.length}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
      </div>

      {hoveredIdx !== null && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Window: {data[hoveredIdx].timestamp}</span>
          <div className="flex gap-4">
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              P50: {formatLatency(data[hoveredIdx].p50 || 0)}
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              P95: {formatLatency(data[hoveredIdx].p95 || 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface ErrorRateChartProps {
  data: TimePoint[];
  height?: number;
}

export const ErrorRateChart: React.FC<ErrorRateChartProps> = ({ data, height = 180 }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
        No error rate telemetry in this time window
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.error_rate || 0), 10);
  const width = 600;
  const padding = { top: 20, right: 30, bottom: 25, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.error_rate || 0) / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Failure Rate Spikes
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Percentage of calls returning HTTP 4xx/5xx</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="w-2.5 h-1 bg-rose-500 rounded-full inline-block" />
          <span className="text-slate-600 dark:text-slate-300">Failure %</span>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Y Axis Gridlines & Labels */}
          {[0, 0.5, 1].map((ratio) => {
            const yVal = maxVal * (1 - ratio);
            const yPos = padding.top + chartHeight * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800 stroke-1"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  className="text-[11px] fill-slate-400 dark:fill-slate-500 font-mono"
                >
                  {formatPercentage(yVal)}
                </text>
              </g>
            );
          })}

          {/* Polyline */}
          <polyline
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />

          {/* X Axis */}
          {data.map((d, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            return (
              <text
                key={i}
                x={x}
                y={height - 5}
                textAnchor="middle"
                className="text-[11px] fill-slate-400 dark:fill-slate-500 font-mono"
              >
                {d.timestamp}
              </text>
            );
          })}

          {/* Hover hitboxes */}
          {data.map((d, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            return (
              <rect
                key={i}
                x={x - chartWidth / (data.length * 2)}
                y={padding.top}
                width={chartWidth / data.length}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
      </div>

      {hoveredIdx !== null && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Time: {data[hoveredIdx].timestamp}</span>
          <span className="text-rose-600 dark:text-rose-400 font-bold">
            Failure Rate: {formatPercentage(data[hoveredIdx].error_rate || 0)}
          </span>
        </div>
      )}
    </div>
  );
};
