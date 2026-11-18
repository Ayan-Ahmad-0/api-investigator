'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart2,
  Clock,
  Layers,
  Percent,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnalyticsOverview } from '@/lib/types';
import { ErrorRateChart, LatencyChart } from '@/components/Charts';
import { formatLatency, formatPercentage } from '@/lib/utils';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getAnalytics('proj_core_api_prod');
        setAnalytics(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Performance & Reliability Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Aggregated latency percentiles, error rate trends, and endpoint degradation rankings
          </p>
        </div>

        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 shadow-2xs">
          Sample: 18,450 Events Analyzed
        </div>
      </div>

      {/* Latency Percentiles Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Median (P50) Latency
          </span>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 dark:text-white">
            {formatLatency(analytics.average_latency_ms)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Fast path baseline</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            P95 Tail Latency
          </span>
          <div className="mt-2 text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatLatency(analytics.p95_latency_ms)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">SLA target: &lt; 500ms</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            P99 Latency Spike
          </span>
          <div className="mt-2 text-3xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {formatLatency(analytics.p99_latency_ms)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Checkout peak delay</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Aggregate Error Rate
          </span>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 dark:text-white">
            {formatPercentage(analytics.error_rate_percentage)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Across all routes</div>
        </div>
      </div>

      {/* Chart Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorRateChart data={analytics.error_rate_trend} height={200} />
        <LatencyChart data={analytics.latency_trend} height={200} />
      </div>

      {/* Top Failing Endpoints */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Top Failing Endpoints (Degradation Ranking)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ranked by consecutive failure volume and percentage error rate in the selected time window
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Endpoint Name</th>
                <th className="p-4">Normalized Route</th>
                <th className="p-4">Failed Checks</th>
                <th className="p-4">Error Rate</th>
                <th className="p-4 text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {analytics.top_failing_endpoints.map((ep, idx) => (
                <tr
                  key={ep.route}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-4 text-slate-400 dark:text-slate-500 font-bold">#{idx + 1}</td>
                  <td className="p-4 font-sans font-semibold text-slate-900 dark:text-white">
                    {ep.endpoint_name}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{ep.route}</td>
                  <td className="p-4 text-rose-600 dark:text-rose-400 font-bold">
                    {ep.error_count} failures
                  </td>
                  <td className="p-4 text-rose-600 dark:text-rose-400 font-bold">
                    {formatPercentage(ep.error_rate)}
                  </td>
                  <td className="p-4 text-right text-rose-600 dark:text-rose-400 font-sans text-xs font-medium">
                    Spiking post-deploy
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
