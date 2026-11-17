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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Incidents & Failure DNA
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Grouped failure clusters with automated evidence retrieval, stack trace fingerprinting, and historical similarity matches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>2 Active Incidents</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by incident title, endpoint, or exception..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-0.5 border border-slate-200 dark:border-slate-700">
            {['all', 'open', 'monitoring', 'resolved'].map((st) => (
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

          {/* Severity selector */}
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Severity:</span>
            <select
              aria-label="Filter Severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none uppercase font-mono"
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

      {/* Incidents Data Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-mono tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Severity</th>
                <th className="p-3">Incident Summary</th>
                <th className="p-3">Affected Route</th>
                <th className="p-3">Status</th>
                <th className="p-3">Investigation</th>
                <th className="p-3">Impact / Error Rate</th>
                <th className="p-3">Started</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((incident) => (
                <tr
                  key={incident.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3 whitespace-nowrap">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 block max-w-md truncate"
                    >
                      {incident.title}
                    </Link>
                    <span className="text-[11px] text-slate-500 font-sans block mt-0.5 line-clamp-1">
                      {incident.impact_summary}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {incident.affected_route}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={incident.investigation_status || 'completed'} />
                  </td>
                  <td className="p-3 font-mono whitespace-nowrap">
                    <span
                      className={`font-bold ${
                        incident.error_rate > 5 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formatPercentage(incident.error_rate)}
                    </span>
                    <span className="text-slate-400 text-[11px] ml-1">
                      ({incident.duration_minutes ? `${incident.duration_minutes}m` : 'Active'})
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                    {formatDate(incident.started_at)}
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
    </div>
  );
}
