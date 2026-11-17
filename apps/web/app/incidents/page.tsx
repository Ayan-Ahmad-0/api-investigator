'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Filter,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Incident } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { formatDate, formatPercentage } from '@/lib/utils';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getIncidents('proj_core_api_prod', statusFilter);
        setIncidents(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [statusFilter]);

  const filtered = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.affected_route.toLowerCase().includes(search.toLowerCase()) ||
      inc.affected_endpoint_name.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || inc.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Incidents & Triage
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Grouped failure clusters with automated evidence retrieval, stack trace fingerprinting, and reproduction packages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>2 Active Incidents</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by incident title, endpoint, or route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
            {['all', 'open', 'monitoring', 'resolved'].map((st) => (
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

          {/* Severity selector */}
          <div className="relative">
            <select
              aria-label="Filter Severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading incidents...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No incidents found matching current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Incident Title</th>
                  <th className="p-4">Affected Route</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Impact / Error Rate</th>
                  <th className="p-4">Started At</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-4 whitespace-nowrap">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 block transition-colors text-sm"
                      >
                        {incident.title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {incident.impact_summary}
                      </p>
                    </td>
                    <td className="p-4 font-mono text-slate-600 whitespace-nowrap">
                      {incident.affected_route}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="p-4 font-mono whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          incident.error_rate > 5 ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {formatPercentage(incident.error_rate)}
                      </span>
                      <span className="text-slate-400 text-xs ml-1">
                        ({incident.duration_minutes ? `${incident.duration_minutes}m` : 'Active'})
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap font-mono text-xs">
                      {formatDate(incident.started_at)}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
