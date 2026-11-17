'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Radio,
  Server,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnalyticsOverview, Endpoint, Incident } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { LatencyChart, ErrorRateChart } from '@/components/Charts';
import { formatDate, formatLatency, formatPercentage } from '@/lib/utils';

export default function OverviewPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [an, inc, ep] = await Promise.all([
          api.getAnalytics('proj_core_api_prod'),
          api.getIncidents('proj_core_api_prod'),
          api.getEndpoints('proj_core_api_prod'),
        ]);
        setAnalytics(an);
        setIncidents(inc);
        setEndpoints(ep);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            System Overview & Health
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry and synthetic probe monitoring across production endpoints
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/monitors"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Manage Monitors</span>
          </Link>
          <Link
            href="/incidents"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>View Active Incidents ({activeIncidents.length})</span>
          </Link>
        </div>
      </div>

      {/* High-Level Metric Tiles (Solid surfaces, strict visual hierarchy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Endpoint Health Breakdown */}
        <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Monitored Endpoints
            </span>
            <Server className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {endpoints.length}
            </span>
            <span className="text-xs text-slate-500">total checks</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {analytics.healthy_endpoints_count} Healthy
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              {analytics.degraded_endpoints_count} Degraded
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {analytics.failing_endpoints_count} Failing
            </span>
          </div>
        </div>

        {/* Active Incidents */}
        <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Incidents
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {analytics.active_incidents_count}
            </span>
            <span className="text-xs text-rose-600/80 font-medium">attention required</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            1 Critical (Pool Exhaustion), 1 Medium (Latency)
          </div>
        </div>

        {/* Global Error Rate */}
        <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Aggregate Error Rate
            </span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {formatPercentage(analytics.error_rate_percentage)}
            </span>
            <span className="text-xs text-rose-600 font-mono font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +1.2%
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Across 18,450 synthetic and telemetry checks
          </div>
        </div>

        {/* Latency Percentiles */}
        <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tail Latency (P95)
            </span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {formatLatency(analytics.p95_latency_ms)}
            </span>
            <span className="text-xs text-slate-500">P50: {formatLatency(analytics.average_latency_ms)}</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            P99 threshold: {formatLatency(analytics.p99_latency_ms)}
          </div>
        </div>
      </div>

      {/* Operational Charts (Error Rate & Tail Latency Trends) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorRateChart data={analytics.error_rate_trend} height={190} />
        <LatencyChart data={analytics.latency_trend} height={190} />
      </div>

      {/* Active Incidents Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Active Production Incidents
            </h3>
            <p className="text-xs text-slate-500">
              Correlated failure clusters with automated evidence retrieval and Failure DNA matching
            </p>
          </div>
          <Link
            href="/incidents"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>View All Incidents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-mono tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Severity</th>
                <th className="p-3">Incident Title</th>
                <th className="p-3">Affected Route</th>
                <th className="p-3">Status</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Error Rate</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {incidents.slice(0, 3).map((incident) => (
                <tr
                  key={incident.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3 whitespace-nowrap">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="p-3 font-medium text-slate-900 dark:text-slate-100 max-w-sm truncate">
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {incident.title}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {incident.affected_route}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {incident.duration_minutes ? `${incident.duration_minutes}m` : 'Ongoing'}
                  </td>
                  <td className="p-3 font-mono whitespace-nowrap">
                    <span className={incident.error_rate > 5 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                      {formatPercentage(incident.error_rate)}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monitored Endpoints Quick Status */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Registered Endpoint Monitors
            </h3>
            <p className="text-xs text-slate-500">
              External HTTP probes running on 30s-120s synthetic intervals
            </p>
          </div>
          <Link
            href="/monitors"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>View All Endpoints</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-mono tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Method & Name</th>
                <th className="p-3">URL</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Code</th>
                <th className="p-3">Latency</th>
                <th className="p-3">Uptime</th>
                <th className="p-3">Last Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {endpoints.map((ep) => (
                <tr
                  key={ep.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3 font-sans font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 mr-2">
                      {ep.method}
                    </span>
                    <Link href={`/monitors/${ep.id}`} className="hover:underline">
                      {ep.name}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-xs">{ep.url}</td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={ep.status} />
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-bold ${
                        ep.last_status_code >= 400
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {ep.last_status_code}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">
                    {formatLatency(ep.last_latency_ms)}
                  </td>
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                    {formatPercentage(ep.uptime_percentage)}
                  </td>
                  <td className="p-3 text-slate-400 font-sans text-[11px] whitespace-nowrap">
                    {formatDate(ep.last_checked_at)}
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
