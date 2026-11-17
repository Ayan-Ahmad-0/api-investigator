'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  HelpCircle,
  Play,
  RotateCw,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { Investigation } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '@/lib/utils';

interface InvestigationPanelProps {
  investigation: Investigation;
  onTriggerInvestigation?: () => void;
  isLoading?: boolean;
}

export const InvestigationPanel: React.FC<InvestigationPanelProps> = ({
  investigation,
  onTriggerInvestigation,
  isLoading = false,
}) => {
  const [showAuditTrail, setShowAuditTrail] = useState<boolean>(false);
  const [activeHypothesisIndex, setActiveHypothesisIndex] = useState<number>(0);

  const confidenceColor =
    investigation.confidence_score >= 80
      ? 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800'
      : investigation.confidence_score >= 50
      ? 'text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800'
      : 'text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800';

  return (
    <div className="space-y-6">
      {/* Header & Status Card */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400">ID: {investigation.id}</span>
              <StatusBadge status={investigation.status} />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Automated Root Cause Investigation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Initiated {formatDate(investigation.started_at)}
              {investigation.completed_at && ` • Finished ${formatDate(investigation.completed_at)}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onTriggerInvestigation}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Investigating...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Re-run Investigation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mt-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Executive Summary
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans bg-slate-50 dark:bg-slate-950/70 p-3 rounded border border-slate-200 dark:border-slate-800/80">
            {investigation.summary}
          </p>
        </div>

        {/* Confidence Calibration */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-semibold ${confidenceColor}`}
          >
            <span>Calibrated Confidence: {investigation.confidence_score}%</span>
            <span className="uppercase text-[10px] tracking-wider font-mono">
              ({investigation.confidence_level})
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-normal flex-1">
            {investigation.confidence_explanation}
          </p>
        </div>
      </div>

      {/* Ranked Hypotheses */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Ranked Hypotheses
          </h4>
          <p className="text-xs text-slate-500">
            Probable causal mechanisms evaluated against retrieved telemetry spans and deployment markers
          </p>
        </div>

        <div className="space-y-4">
          {investigation.hypotheses.map((hyp, index) => {
            const isPrimary = hyp.is_primary;
            return (
              <div
                key={hyp.id}
                className={`p-4 rounded border ${
                  isPrimary
                    ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {isPrimary ? 'Primary Hypothesis' : `Alternative #${index + 1}`}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        P = {(hyp.probability * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {hyp.title}
                    </h5>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                  {hyp.explanation}
                </p>

                {/* Evidence breakdown */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                  {/* Supporting */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Supporting Evidence ({hyp.supporting_evidence.length})</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      {hyp.supporting_evidence.map((ev, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold shrink-0">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contradicting */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Contradicting / Excluded Factors ({hyp.contradicting_evidence.length})</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      {hyp.contradicting_evidence.length > 0 ? (
                        hyp.contradicting_evidence.map((ev, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-slate-400 font-bold shrink-0">•</span>
                            <span>{ev}</span>
                          </li>
                        ))
                      ) : (
                        <li className="italic text-slate-400">No contradicting evidence observed</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Facts vs Unknowns Breakdown (Principle 1: Evidence before explanation) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Facts */}
        <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Verified Facts
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Directly observed in telemetry, external checks, or deploy events
          </p>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {investigation.facts.map((fact, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 p-2 rounded bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800"
              >
                <span className="text-emerald-600 font-mono text-[10px] shrink-0 font-bold mt-0.5">
                  [{idx + 1}]
                </span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Unknowns */}
        <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Unverified / Unknowns
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Telemetry gaps or external factors not yet confirmed
          </p>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {investigation.unknowns.map((unk, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 p-2 rounded bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800"
              >
                <span className="text-amber-600 font-mono text-[10px] shrink-0 font-bold mt-0.5">
                  ?
                </span>
                <span>{unk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actionable Verification Steps */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Recommended Verification & Mitigation Steps
          </h4>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Specific diagnostic queries and immediate remediation actions recommended by the investigator
        </p>

        <ol className="space-y-2.5">
          {investigation.verification_steps.map((step, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200"
            >
              <span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] shrink-0 font-bold">
                {idx + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Scoped Tool Activity Audit Trail */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
        <button
          type="button"
          onClick={() => setShowAuditTrail(!showAuditTrail)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Scoped Diagnostic Tool Audit Trail ({investigation.tool_audit_trail.length} actions)</span>
          </div>
          {showAuditTrail ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAuditTrail && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {investigation.tool_audit_trail.map((item) => (
              <div
                key={item.step}
                className="flex items-start justify-between gap-4 p-2.5 rounded bg-slate-50 dark:bg-slate-950 font-mono text-xs border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">#{item.step}</span>
                  <div>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {item.tool_name}
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{item.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
