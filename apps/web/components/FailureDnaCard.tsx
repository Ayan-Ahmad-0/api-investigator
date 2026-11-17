import React from 'react';
import { GitBranch, History, Layers, ShieldCheck } from 'lucide-react';
import { FailureDNA } from '@/lib/types';

interface FailureDnaCardProps {
  dna: FailureDNA;
}

export const FailureDnaCard: React.FC<FailureDnaCardProps> = ({ dna }) => {
  return (
    <div className="space-y-6">
      {/* Fingerprint Header */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Fingerprint ID
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                {dna.fingerprint_hash}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
              {dna.exception_class}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {dna.normalized_message}
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800">
            Route: {dna.endpoint_pattern}
          </div>
        </div>

        {/* Top Stack Frames */}
        <div className="mt-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Normalized Stack Trace Frames
          </div>
          <div className="p-3 rounded bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800 space-y-1">
            {dna.top_stack_frames.map((frame, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] select-none">[{idx + 1}]</span>
                <span className="text-blue-400">{frame}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Similar Historical Incidents */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Similar Historical Incidents (Failure DNA Matches)
          </h4>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Matched against tenant-isolated historical incidents using normalized exception patterns and call graph signatures.
        </p>

        <div className="space-y-4">
          {dna.similar_incidents.map((match) => (
            <div
              key={match.incident_id}
              className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {match.incident_id}
                    </span>
                    <span className="text-xs text-slate-400">• Resolved {match.resolved_at}</span>
                  </div>
                  <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {match.title}
                  </h5>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {match.similarity_score}% Match
                  </span>
                </div>
              </div>

              {/* Verified Resolution */}
              <div className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  Past Verified Resolution
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                  {match.verified_resolution}
                </p>
              </div>

              {/* Applicability */}
              <div className="text-xs text-slate-500 font-sans">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Applicability Assessment:{' '}
                </span>
                {match.applicability_assessment}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
