'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  HelpCircle,
  Lightbulb,
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

  return (
    <div className="space-y-6">
      {/* Executive Root Cause Diagnosis Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono text-slate-400">ID: {investigation.id}</span>
              <StatusBadge status={investigation.status} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Root Cause Analysis
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated telemetry & trace correlation completed {formatDate(investigation.completed_at || investigation.started_at)}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={onTriggerInvestigation}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 transition-colors shadow-2xs"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Telemetry...</span>
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

        {/* Diagnosis Narrative */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Executive Summary
          </div>
          <p className="text-sm text-slate-800 leading-relaxed font-normal">
            {investigation.summary}
          </p>
        </div>

        {/* Confidence Level */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs">
          <span className="font-bold text-blue-900 bg-white px-2.5 py-1 rounded border border-blue-200 shadow-2xs shrink-0">
            {investigation.confidence_score}% Confidence ({investigation.confidence_level})
          </span>
          <span className="text-blue-800 leading-normal">
            {investigation.confidence_explanation}
          </span>
        </div>
      </div>

      {/* Likely Hypotheses & Evidence */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div>
          <h4 className="text-base font-bold text-slate-900">
            Evaluated Hypotheses & Supporting Telemetry
          </h4>
          <p className="text-xs text-slate-500">
            Causal factors verified against recent error spans, database metrics, and deployment webhooks
          </p>
        </div>

        <div className="space-y-4">
          {investigation.hypotheses.map((hyp, index) => {
            const isPrimary = hyp.is_primary;
            return (
              <div
                key={hyp.id}
                className={`p-5 rounded-lg border transition-colors ${
                  isPrimary
                    ? 'border-blue-200 bg-blue-50/30'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          isPrimary
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isPrimary ? 'Primary Diagnosis' : `Alternative #${index + 1}`}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600">
                        Probability: {(hyp.probability * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-900 mt-1">
                      {hyp.title}
                    </h5>
                  </div>
                </div>

                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  {hyp.explanation}
                </p>

                {/* Evidence breakdown */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/80">
                  {/* Supporting Evidence */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Observed Supporting Evidence</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {hyp.supporting_evidence.map((ev, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold shrink-0">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contradicting / Excluded Factors */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                      <span>Excluded / Contradicting Evidence</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {hyp.contradicting_evidence.length > 0 ? (
                        hyp.contradicting_evidence.map((ev, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-slate-400 font-bold shrink-0">•</span>
                            <span>{ev}</span>
                          </li>
                        ))
                      ) : (
                        <li className="italic text-slate-400">None detected</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Verification Steps */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h4 className="text-base font-bold text-slate-900">
            Recommended Actionable Next Steps
          </h4>
        </div>
        <p className="text-xs text-slate-500 -mt-2">
          Follow these specific actions to confirm the diagnosis or apply a production mitigation
        </p>

        <div className="space-y-3">
          {investigation.verification_steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50/40 border border-amber-200/60 text-xs text-slate-800"
            >
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                {idx + 1}
              </span>
              <div className="space-y-1 flex-1">
                <span className="font-medium leading-relaxed">{step}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Facts & Unknowns Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verified Facts */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Verified Facts
            </h4>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Directly observed in telemetry, database connections, or deploy logs
          </p>
          <ul className="space-y-2 text-xs text-slate-700">
            {investigation.facts.map((fact, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-md bg-slate-50 border border-slate-100"
              >
                <span className="text-emerald-600 font-mono text-xs font-bold shrink-0">
                  ✓
                </span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Known Unknowns */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Missing Telemetry / Unknowns
            </h4>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Signals that could not be confirmed with current instrumentation
          </p>
          <ul className="space-y-2 text-xs text-slate-700">
            {investigation.unknowns.length > 0 ? (
              investigation.unknowns.map((unknown, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-md bg-slate-50 border border-slate-100"
                >
                  <span className="text-amber-500 font-mono text-xs font-bold shrink-0">
                    ?
                  </span>
                  <span>{unknown}</span>
                </li>
              ))
            ) : (
              <li className="p-3 text-xs text-slate-400 italic">
                All relevant metrics and logs were retrieved successfully.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Scoped Diagnostic Tool Audit Trail (Collapsible) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <button
          type="button"
          onClick={() => setShowAuditTrail(!showAuditTrail)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Telemetry Diagnostic Audit Trail ({investigation.tool_audit_trail.length} steps executed)</span>
          </div>
          {showAuditTrail ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAuditTrail && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            {investigation.tool_audit_trail.map((item) => (
              <div
                key={item.step}
                className="flex items-start justify-between gap-4 p-2.5 rounded bg-slate-50 font-mono text-xs border border-slate-100"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-xs text-slate-400 shrink-0 mt-0.5">#{item.step}</span>
                  <div>
                    <span className="font-semibold text-blue-600">
                      {item.tool_name}
                    </span>
                    <p className="text-xs text-slate-600 font-sans mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{item.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
