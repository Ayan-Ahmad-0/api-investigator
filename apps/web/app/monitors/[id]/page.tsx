'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Radio,
  Server,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CheckResult, Endpoint } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { LatencyChart } from '@/components/Charts';
import { formatDate, formatLatency, formatPercentage } from '@/lib/utils';

export default function EndpointDetailPage() {
  const params = useParams();
  const router = useRouter();
  const endpointId = (params?.id as string) || 'ep_billing_checkout';

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!endpoint) return;
    if (!confirm(`Are you sure you want to permanently delete monitor "${endpoint.name}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.deleteEndpoint(endpoint.id);
      router.push('/monitors');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !endpoint) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
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
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/monitors" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Monitors</span>
          </Link>
          <span>/</span>
          <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{endpoint.name}</span>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 hover:border-transparent transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isDeleting ? 'Deleting...' : 'Delete Monitor'}</span>
        </button>
      </div>

      {/* Header Profile */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {endpoint.method}
              </span>
              <StatusBadge status={endpoint.status} />
              <span className="text-xs uppercase font-mono text-slate-400">
                Env: {endpoint.environment}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {endpoint.name}
            </h1>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 select-all">{endpoint.url}</p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-0.5">30d Uptime</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {formatPercentage(endpoint.uptime_percentage)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-0.5">Last Latency</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {formatLatency(endpoint.last_latency_ms)}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Check Interval</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Every {endpoint.interval_seconds} seconds</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Timeout Threshold</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{endpoint.timeout_seconds}s</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Expected HTTP Code</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{endpoint.expected_status} OK</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Last Check Timestamp</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{formatDate(endpoint.last_checked_at)}</span>
          </div>
        </div>
      </div>

      {/* Latency Chart */}
      <LatencyChart data={sampleLatencyData} height={200} />

      {/* Check History Logs Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Synthetic Probe Check History
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Detailed log of the last synthetic probes dispatched against this endpoint
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Result</th>
                <th className="p-4">HTTP Status</th>
                <th className="p-4">Response Time</th>
                <th className="p-4">Response Headers</th>
                <th className="p-4">Error Diagnostics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {checks.map((chk) => (
                <tr key={chk.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                    {formatDate(chk.timestamp)}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {chk.is_success ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-sans">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`font-bold ${
                        chk.status_code >= 400 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {chk.status_code || 'ERR'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">
                    {formatLatency(chk.latency_ms)}
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      content-type: application/json
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 font-sans text-xs">
                    {chk.error_message ? (
                      <span className="text-rose-600 dark:text-rose-400 font-medium">{chk.error_message}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">None (Healthy check)</span>
                    )}
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
