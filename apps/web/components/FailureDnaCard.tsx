import React from 'react';
import { History } from 'lucide-react';
import { FailureDNA } from '@/lib/types';

interface FailureDnaCardProps {
  dna: FailureDNA;
}

export const FailureDnaCard: React.FC<FailureDnaCardProps> = ({ dna }) => {
  return (
    <div className="space-y-6">
      {/* Fingerprint Header */}
      <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-semibold text-slate-400">
                FINGERPRINT HASH
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                {dna.fingerprint_hash}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 font-mono">
              {dna.exception_class}
            </h3>
            <p className="text-xs text-slate-600 font-mono mt-0.5">
              {dna.normalized_message}
            </p>
          </div>

          <div className="text-xs text-slate-600 font-mono bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
            Route: {dna.endpoint_pattern}
          </div>
        </div>

        {/* Top Stack Frames */}
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Normalized Call Stack Frames
          </div>
          <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs border border-slate-800 space-y-1.5 shadow-2xs">
            {dna.top_stack_frames.map((frame, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-slate-500 text-xs select-none">[{idx + 1}]</span>
                <span className="text-blue-300 font-mono">{frame}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Similar Historical Incidents */}
      <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <h4 className="text-base font-bold text-slate-900">
            Similar Past Incidents & Verified Resolutions
          </h4>
        </div>
        <p className="text-xs text-slate-500 -mt-2">
          Matched against historical incidents in your workspace using normalized exception patterns and call stack signatures
        </p>

        <div className="space-y-4 pt-1">
          {dna.similar_incidents.map((match) => (
            <div
              key={match.incident_id}
              className="p-5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-blue-600">
                      {match.incident_id}
                    </span>
                    <span className="text-xs text-slate-400">• Resolved {match.resolved_at}</span>
                  </div>
                  <h5 className="text-sm font-bold text-slate-900 mt-1">
                    {match.title}
                  </h5>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {match.similarity_score}% Match
                  </span>
                </div>
              </div>

              {/* Verified Resolution */}
              <div className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                  How It Was Fixed Previously:
                </div>
                <p className="text-xs text-slate-700 font-mono">
                  {match.verified_resolution}
                </p>
              </div>

              {/* Applicability */}
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  Applicability to Current Incident:{' '}
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
