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
  const incidentId = (params?.id as string) || 'inc_stripe_rate_limit_001';

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
      <div className="space-y-6">
        <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="h-40 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/incidents" className="hover:text-slate-900 flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Incidents</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-700 font-semibold">{incident.id}</span>
      </div>

      {/* Incident Header Surface */}
      <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-semibold text-slate-400">INCIDENT {incident.id}</span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {incident.affected_route}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {incident.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Started {formatDate(incident.started_at)} •{' '}
              {incident.duration_minutes ? `Duration: ${incident.duration_minutes} minutes` : 'Ongoing active incident'} •{' '}
              Current error impact: <span className="font-bold text-rose-600">{formatPercentage(incident.error_rate)}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {incident.status !== 'resolved' ? (
              <button
                type="button"
                onClick={handleResolve}
                disabled={isResolving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isResolving ? 'Resolving...' : 'Mark Incident Resolved'}</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Resolved</span>
              </div>
            )}
          </div>
        </div>

        {/* Observed Impact Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200/80">
          <div>
            <span className="font-bold text-slate-800">Observed Production Impact: </span>
            <span className="text-slate-600">{incident.impact_summary}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            <span className="text-slate-400">Failure DNA:</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
              {dna.fingerprint_hash}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200 flex gap-8 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('investigation')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'investigation'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Root Cause Diagnosis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reproduction')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'reproduction'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Reproduce Failure (Safe cURL)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dna')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'dna'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Similar Past Failures & Resolutions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'timeline'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Incident Timeline</span>
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
        <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-2xs space-y-6">
          <div>
            <h4 className="text-base font-bold text-slate-900">
              Correlated Chronological Timeline
            </h4>
            <p className="text-xs text-slate-500">
              Sequence of events from anomaly onset through alerts, automated investigation, and mitigation
            </p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            {timeline.map((event) => {
              return (
                <div key={event.id} className="relative">
                  <span
                    className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white bg-blue-600 shadow-2xs"
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 font-medium">{event.timestamp}</span>
                    <span className="text-xs font-bold text-slate-900">
                      {event.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-normal leading-relaxed">
                    {event.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
