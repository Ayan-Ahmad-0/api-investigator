'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Activity,
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Code,
  Copy,
  GitCommit,
  History,
  Layers,
  Radio,
  Share2,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  FailureDNA,
  FailureReproduction,
  Incident,
  IncidentTimelineEvent,
  Investigation,
} from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { InvestigationPanel } from '@/components/InvestigationPanel';
import { ReproductionViewer } from '@/components/ReproductionViewer';
import { FailureDnaCard } from '@/components/FailureDnaCard';
import { formatDate, formatPercentage } from '@/lib/utils';

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = (params?.id as string) || 'inc_pool_exhaustion_992';

  const [incident, setIncident] = useState<Incident | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [reproduction, setReproduction] = useState<FailureReproduction | null>(null);
  const [dna, setDna] = useState<FailureDNA | null>(null);
  const [timeline, setTimeline] = useState<IncidentTimelineEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'investigation' | 'reproduction' | 'dna' | 'timeline'>('investigation');
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [inc, inv, rep, d, tl] = await Promise.all([
          api.getIncident(incidentId),
          api.getInvestigation(incidentId),
          api.getFailureReproduction(incidentId),
          api.getFailureDNA(incidentId),
          api.getIncidentTimeline(incidentId),
        ]);
        setIncident(inc);
        setInvestigation(inv);
        setReproduction(rep);
        setDna(d);
        setTimeline(tl);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [incidentId]);

  const handleTriggerInvestigation = async () => {
    setIsInvestigating(true);
    try {
      const updated = await api.triggerInvestigation(incidentId);
      setInvestigation(updated);
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      const resolved = await api.resolveIncident(incidentId, 'Mitigated via pool release fix');
      setIncident(resolved);
    } finally {
      setIsResolving(false);
    }
  };

  if (loading || !incident || !investigation || !reproduction || !dna) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/incidents" className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Incidents</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-700 dark:text-slate-300">{incident.id}</span>
      </div>

      {/* Incident Header Surface */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs text-slate-400">INCIDENT ID: {incident.id}</span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {incident.affected_route}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {incident.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Started {formatDate(incident.started_at)} •{' '}
              {incident.duration_minutes ? `Duration: ${incident.duration_minutes} minutes` : 'Active'} •{' '}
              Current error impact: {formatPercentage(incident.error_rate)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {incident.status !== 'resolved' ? (
              <button
                type="button"
                onClick={handleResolve}
                disabled={isResolving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isResolving ? 'Resolving...' : 'Mark Incident Resolved'}</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolved</span>
              </div>
            )}
          </div>
        </div>

        {/* Impact strip */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs bg-slate-50 dark:bg-slate-950/60 p-3 rounded border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Observed Impact:</span>
            <span className="text-slate-600 dark:text-slate-400">{incident.impact_summary}</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
            <span className="text-slate-500">Fingerprint:</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
              {dna.fingerprint_hash}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('investigation')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'investigation'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Automated Investigation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reproduction')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'reproduction'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Failure Reproduction & cURL</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dna')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'dna'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Failure DNA & Historical Matches</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'timeline'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Event Timeline</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'investigation' && (
        <InvestigationPanel
          investigation={investigation}
          onTriggerInvestigation={handleTriggerInvestigation}
          isLoading={isInvestigating}
        />
      )}

      {activeTab === 'reproduction' && (
        <ReproductionViewer reproduction={reproduction} />
      )}

      {activeTab === 'dna' && (
        <FailureDnaCard dna={dna} />
      )}

      {activeTab === 'timeline' && (
        <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Correlated Incident Event Timeline
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Chronological log of deployment events, metric threshold breaches, probe alerts, and investigation checkpoints
          </p>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
            {timeline.map((event) => {
              const iconColors = {
                deployment_correlated: 'bg-purple-600 text-white',
                spike_detected: 'bg-rose-600 text-white',
                alert_sent: 'bg-amber-500 text-white',
                investigation_started: 'bg-blue-600 text-white',
                status_changed: 'bg-emerald-600 text-white',
                mitigation_applied: 'bg-teal-600 text-white',
              };

              return (
                <div key={event.id} className="relative">
                  <span
                    className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      iconColors[event.type] || 'bg-slate-400'
                    }`}
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400">{event.timestamp}</span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {event.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-sans">
                    {event.description}
                  </p>
                  {event.metadata && (
                    <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 inline-block">
                      {JSON.stringify(event.metadata)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
