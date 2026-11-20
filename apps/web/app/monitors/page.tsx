'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ExternalLink,
  Play,
  Plus,
  RotateCw,
  Search,
  Server,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Endpoint } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { CreateEndpointModal } from '@/components/CreateEndpointModal';
import { formatLatency, formatPercentage } from '@/lib/utils';

export default function MonitorsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleTestNow = async (endpointId: string) => {
    setTestingId(endpointId);
    try {
      const result = await api.triggerCheck(endpointId);
      setEndpoints((prev) =>
        prev.map((ep) =>
          ep.id === endpointId
            ? {
                ...ep,
                status: (result.is_success ? 'healthy' : 'failing') as any,
                last_status_code: result.status_code || ep.last_status_code,
                last_latency_ms: result.latency_ms || ep.last_latency_ms,
                last_checked_at: result.timestamp || ep.last_checked_at,
              }
            : ep
        )
      );
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteEndpoint = async (endpointId: string, endpointName: string) => {
    if (!confirm(`Are you sure you want to delete the monitor for "${endpointName}"?`)) {
      return;
    }
    setDeletingId(endpointId);
    try {
      await api.deleteEndpoint(endpointId);
      setEndpoints((prev) => prev.filter((e) => e.id !== endpointId));
    } finally {
      setDeletingId(null);
    }
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Monitored APIs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated synthetic health checks tracking uptime, latency, and response codes
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New API</span>
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Filter by API name, method, or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          {['all', 'healthy', 'failing'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading APIs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
            No API monitors match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">API Endpoint</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Latency</th>
                  <th className="p-4">Last Code</th>
                  <th className="p-4">30-Day Uptime</th>
                  <th className="p-4">Frequency</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((ep) => (
                  <tr
                    key={ep.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
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
                    <td className="p-4 font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      Every {ep.interval_seconds}s
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestNow(ep.id)}
                          disabled={testingId === ep.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
                          title="Run immediate health check"
                        >
                          {testingId === ep.id ? (
                            <RotateCw className="w-3 h-3 animate-spin text-blue-600" />
                          ) : (
                            <Play className="w-3 h-3 text-slate-500" />
                          )}
                          <span>{testingId === ep.id ? 'Checking...' : 'Test'}</span>
                        </button>

                        <Link
                          href={`/monitors/${ep.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDeleteEndpoint(ep.id, ep.name)}
                          disabled={deletingId === ep.id}
                          className="inline-flex items-center p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                          title="Delete API Monitor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateEndpointModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateEndpoint}
      />
    </div>
  );
}
