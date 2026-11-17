'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Radio,
  Server,
  Shield,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CheckResult, Endpoint } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { LatencyChart } from '@/components/Charts';
import { formatDate, formatLatency, formatPercentage } from '@/lib/utils';

export default function EndpointDetailPage() {
  const params = useParams();
  const endpointId = (params?.id as string) || 'ep_billing_checkout';

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ep, chk] = await Promise.all([
          api.getEndpoint(endpointId),
          api.getEndpointChecks(endpointId),
        ]);
        setEndpoint(ep);
        setChecks(chk);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [endpointId]);

  if (loading || !endpoint) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  const sampleLatencyData = [
    { timestamp: '09:00', p50: 290, p95: 340 },
    { timestamp: '09:15', p50: 310, p95: 380 },
    { timestamp: '09:30', p50: 4200, p95: 5012 },
    { timestamp: '09:45', p50: 3800, p95: 4820 },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/monitors" className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Monitors</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-700 dark:text-slate-300">{endpoint.name}</span>
      </div>

      {/* Header Profile */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {endpoint.method}
              </span>
              <StatusBadge status={endpoint.status} />
              <span className="text-xs uppercase font-mono text-slate-400">
                Env: {endpoint.environment}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {endpoint.name}
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-1 select-all">{endpoint.url}</p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Uptime</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatPercentage(endpoint.uptime_percentage)}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Latency</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatLatency(endpoint.last_latency_ms)}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Status</span>
              <span
                className={`text-sm font-bold ${
                  endpoint.last_status_code >= 400 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {endpoint.last_status_code}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration Specs */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Check Interval</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              Every {endpoint.interval_seconds} seconds
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Timeout Threshold</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {endpoint.timeout_seconds} seconds
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Expected HTTP Status</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              HTTP {endpoint.expected_status}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Created At</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {formatDate(endpoint.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Latency History Chart */}
      <LatencyChart data={sampleLatencyData} height={200} />

      {/* Recent Check Logs Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Recent Synthetic Probe Results
          </h3>
          <p className="text-xs text-slate-500">
            Raw execution logs from external probe nodes
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">HTTP Code</th>
                <th className="p-3">Latency</th>
                <th className="p-3">Diagnostic Message / Detail</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {checks.map((chk) => (
                <tr
                  key={chk.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3 whitespace-nowrap">
                    {chk.is_success ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>PASS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>FAIL</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-bold">
                    <span className={chk.status_code >= 400 ? 'text-rose-600' : 'text-emerald-600'}>
                      {chk.status_code}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">
                    {formatLatency(chk.latency_ms)}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400 max-w-md truncate">
                    {chk.error_message || 'OK 200: Healthy response body'}
                  </td>
                  <td className="p-3 text-right text-slate-400 text-[11px] whitespace-nowrap">
                    {formatDate(chk.timestamp)}
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
