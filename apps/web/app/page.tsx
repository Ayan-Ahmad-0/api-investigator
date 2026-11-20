'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Plus,
  Radio,
  Server,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnalyticsOverview, Endpoint, Incident } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { LatencyChart, ErrorRateChart } from '@/components/Charts';
import { CreateEndpointModal } from '@/components/CreateEndpointModal';
import { formatDate, formatLatency, formatPercentage } from '@/lib/utils';

export default function OverviewPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleCreateEndpoint = async (data: Partial<Endpoint>) => {
    const created = await api.createEndpoint('proj_core_api_prod', data);
    setEndpoints((prev) => [created, ...prev]);
  };

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const topActiveIncident = activeIncidents[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time API health monitoring, automated failure detection, and AI root cause diagnosis
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add API Monitor</span>
          </button>
        </div>
      </div>

      {/* Hero Status Banner */}
      {topActiveIncident ? (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping mt-1 shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={topActiveIncident.severity} />
                <span className="text-xs font-bold text-rose-900 dark:text-rose-300">
                  {topActiveIncident.title}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {topActiveIncident.impact_summary || `Errors detected on ${topActiveIncident.affected_route}.`}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link
              href={`/incidents/${topActiveIncident.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs"
            >
              <span>Investigate Root Cause</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>All monitored API endpoints are operating normally (99.8% 30-day uptime)</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
            {endpoints.length} active monitors
          </span>
        </div>
      )}

      {/* 3 Core Vitals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Availability */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Overall Availability</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            98.6%
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {analytics.healthy_endpoints_count} healthy • {analytics.failing_endpoints_count} failing
          </div>
        </div>

        {/* Median Latency */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Median Response Time</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {formatLatency(analytics.average_latency_ms)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            P95 tail: {formatLatency(analytics.p95_latency_ms)}
          </div>
        </div>

        {/* Active Incidents */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Active Incidents</span>
            <AlertTriangle className={`w-4 h-4 ${activeIncidents.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {activeIncidents.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {activeIncidents.length > 0 ? 'Requires remediation' : 'No active alerts'}
          </div>
        </div>
      </div>

      {/* Monitored APIs (Clean, Streamlined List) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Monitored APIs ({endpoints.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated health check status and live response times
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add API</span>
            </button>
            <Link
              href="/monitors"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">API Name & URL</th>
                <th className="p-4">Status</th>
                <th className="p-4">Latency</th>
                <th className="p-4">Last Response</th>
                <th className="p-4">30-Day Uptime</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {endpoints.map((ep) => (
                <tr key={ep.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {ep.method}
                      </span>
                      <div>
                        <Link
                          href={`/monitors/${ep.id}`}
                          className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {ep.name}
                        </Link>
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-sm mt-0.5">
                          {ep.url}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <StatusBadge status={ep.status} />
                  </td>
                  <td className="p-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatLatency(ep.last_latency_ms)}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        ep.last_status_code >= 400
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      {ep.last_status_code}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatPercentage(ep.uptime_percentage)}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <Link
                      href={`/monitors/${ep.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Latency & Error Rate Trend Visualizations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Performance Trends
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hourly error rate and response latency percentiles
            </p>
          </div>
          <Link
            href="/analytics"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <span>View Full Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ErrorRateChart data={analytics.error_rate_trend} height={160} />
          <LatencyChart data={analytics.latency_trend} height={160} />
        </div>
      </div>

      <CreateEndpointModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateEndpoint}
      />
    </div>
  );
}
