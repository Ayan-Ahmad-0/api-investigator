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
  Plus,
  Radio,
  Server,
  ShieldAlert,
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
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          API Reliability Overview
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Live external uptime checks, error telemetry, and automated root cause investigations for production services.
        </p>
      </div>

      {/* Prominent Active Incidents Banner */}
      {activeIncidents.length > 0 && (
        <div className="border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <h2 className="text-sm font-semibold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
                Action Required: {activeIncidents.length} Active Incidents Detected
              </h2>
            </div>
            <Link
              href="/incidents"
              className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300 flex items-center gap-1"
            >
              <span>View All Incidents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40 rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <SeverityBadge severity={incident.severity} />
                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900">
                      {formatPercentage(incident.error_rate)} Failures
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                    {incident.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                    Route: {incident.affected_route}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                    {incident.impact_summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Started {formatDate(incident.started_at)}
                  </span>
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs"
                  >
                    <span>Investigate Root Cause</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 High-Level Vital Signs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Availability */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Uptime</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
              98.6%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">last 30 days</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {analytics.healthy_endpoints_count} healthy, {analytics.degraded_endpoints_count} degraded, {analytics.failing_endpoints_count} failing
          </p>
        </div>

        {/* Median Latency */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Median Latency (P50)</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
              {formatLatency(analytics.average_latency_ms)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              P95: {formatLatency(analytics.p95_latency_ms)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Measured across 18,450 synthetic probes & telemetry spans
          </p>
        </div>

        {/* Monitored APIs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Monitored Endpoints</span>
            <Server className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
              {endpoints.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">registered targets</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Automated synthetic HTTP checks run every 60 seconds
          </p>
        </div>
      </div>

      {/* Latency & Error Rate Trends */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Telemetry & Failure Trends
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visual correlation of error spikes against tail latency percentiles
            </p>
          </div>
          <Link
            href="/analytics"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <span>Full Analytics Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorRateChart data={analytics.error_rate_trend} height={180} />
          <LatencyChart data={analytics.latency_trend} height={180} />
        </div>
      </div>

      {/* Endpoints Quick Health Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs space-y-0">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Monitored Endpoints Status
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Health check availability and response times for registered API routes
            </p>
          </div>
          <Link
            href="/monitors"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Manage All Monitors</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Endpoint</th>
                <th className="p-4">Target URL</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Response</th>
                <th className="p-4">Latency</th>
                <th className="p-4">30-Day Uptime</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {endpoints.map((ep) => (
                <tr key={ep.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {ep.method}
                      </span>
                      <Link
                        href={`/monitors/${ep.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {ep.name}
                      </Link>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-xs truncate max-w-xs">
                    {ep.url}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={ep.status} />
                  </td>
                  <td className="p-4">
                    <span
                      className={`font-mono font-bold ${
                        ep.last_status_code >= 400 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {ep.last_status_code}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                    {formatLatency(ep.last_latency_ms)}
                  </td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-200 font-mono">
                    {formatPercentage(ep.uptime_percentage)}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/monitors/${ep.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
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
