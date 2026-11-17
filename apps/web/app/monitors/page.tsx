'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Plus,
  Radio,
  Search,
  Server,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Endpoint } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { CreateEndpointModal } from '@/components/CreateEndpointModal';
import { formatDate, formatLatency, formatPercentage } from '@/lib/utils';

export default function MonitorsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getEndpoints('proj_core_api_prod');
        setEndpoints(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateEndpoint = async (data: Partial<Endpoint>) => {
    const created = await api.createEndpoint('proj_core_api_prod', data);
    setEndpoints((prev) => [created, ...prev]);
  };

  const filtered = endpoints.filter((ep) => {
    const matchesSearch =
      ep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.method.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ep.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Endpoints & Health Monitors
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            External synthetic probes checking availability, latency, and response contract integrity
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register HTTP Monitor</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by endpoint name, path, or method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filter status:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            {['all', 'healthy', 'degraded', 'failing'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-medium uppercase tracking-wider ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-mono tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Endpoint / Method</th>
                <th className="p-3">Environment</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Code</th>
                <th className="p-3">Last Latency</th>
                <th className="p-3">Uptime (30d)</th>
                <th className="p-3">Interval</th>
                <th className="p-3">Last Checked</th>
                <th className="p-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((ep) => (
                <tr
                  key={ep.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {ep.method}
                      </span>
                      <div>
                        <Link
                          href={`/monitors/${ep.id}`}
                          className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {ep.name}
                        </Link>
                        <span className="block text-[11px] font-mono text-slate-400 truncate max-w-sm">
                          {ep.url}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {ep.environment}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={ep.status} />
                  </td>
                  <td className="p-3 font-mono">
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
                  <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                    {formatLatency(ep.last_latency_ms)}
                  </td>
                  <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formatPercentage(ep.uptime_percentage)}
                  </td>
                  <td className="p-3 font-mono text-slate-500">{ep.interval_seconds}s</td>
                  <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                    {formatDate(ep.last_checked_at)}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Link
                      href={`/monitors/${ep.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
