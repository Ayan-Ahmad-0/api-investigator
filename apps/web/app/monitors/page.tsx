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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Endpoints & Health Monitors
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated synthetic HTTP checks validating endpoint availability, latency thresholds, and contract integrity
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Monitor</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by endpoint name, path, or method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs">
            {['all', 'healthy', 'degraded', 'failing'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading monitors...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No endpoints found matching current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-4">Method & Name</th>
                  <th className="p-4">Target URL</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Last Status</th>
                  <th className="p-4">Last Latency</th>
                  <th className="p-4">Uptime (30d)</th>
                  <th className="p-4">Interval</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ep) => (
                  <tr
                    key={ep.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {ep.method}
                        </span>
                        <Link
                          href={`/monitors/${ep.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {ep.name}
                        </Link>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-500 text-xs truncate max-w-xs">
                      {ep.url}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <StatusBadge status={ep.status} />
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`font-mono font-bold ${
                          ep.last_status_code >= 400 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {ep.last_status_code}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-700 whitespace-nowrap">
                      {formatLatency(ep.last_latency_ms)}
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {formatPercentage(ep.uptime_percentage)}
                    </td>
                    <td className="p-4 font-mono text-slate-500 whitespace-nowrap">
                      Every {ep.interval_seconds}s
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <Link
                        href={`/monitors/${ep.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
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
