'use client';

import React, { useState } from 'react';
import { Check, Copy, Shield, SplitSquareVertical, Terminal } from 'lucide-react';
import { FailureReproduction } from '@/lib/types';
import { formatLatency } from '@/lib/utils';

interface ReproductionViewerProps {
  reproduction: FailureReproduction;
}

export const ReproductionViewer: React.FC<ReproductionViewerProps> = ({ reproduction }) => {
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'curl' | 'diff' | 'raw'>('curl');

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(reproduction.curl_command);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Notice Card */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Sanitized Failure Reproduction Package
          </span>
          <p className="text-slate-500 mt-0.5">
            All sensitive authorization tokens, API keys, cookies, and customer PII are redacted.
            Use this package to reproduce failure conditions safely in a sandbox or local environment.
            Automatic replay against production is disabled by default.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
        {/* Tab Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 flex items-center justify-between">
          <div className="flex gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('curl')}
              className={`py-3 px-3 border-b-2 transition-colors ${
                activeTab === 'curl'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              Safe cURL Command
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              className={`py-3 px-3 border-b-2 transition-colors ${
                activeTab === 'diff'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              Diff vs Last Successful Request
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`py-3 px-3 border-b-2 transition-colors ${
                activeTab === 'raw'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              Sanitized Payloads & Headers
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Trace: {reproduction.trace_id}
          </div>
        </div>

        {/* Tab 1: cURL Generator */}
        {activeTab === 'curl' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Reproduction command with placeholder credentials:
              </span>
              <button
                type="button"
                onClick={handleCopyCurl}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                {copiedCurl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy cURL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
              <code>{reproduction.curl_command}</code>
            </pre>
          </div>
        )}

        {/* Tab 2: Diff vs Last Successful Request */}
        {activeTab === 'diff' && reproduction.diff_vs_successful && (
          <div className="p-4 space-y-5">
            {/* Top comparison stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <span className="text-slate-400 block text-[11px]">Status Code</span>
                <div className="mt-1 flex items-center gap-2 font-mono">
                  <span className="text-rose-600 font-bold">
                    {reproduction.diff_vs_successful.status_diff.failed}
                  </span>
                  <span className="text-slate-400">vs</span>
                  <span className="text-emerald-600 font-bold">
                    {reproduction.diff_vs_successful.status_diff.successful}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <span className="text-slate-400 block text-[11px]">Roundtrip Latency</span>
                <div className="mt-1 flex items-center gap-2 font-mono">
                  <span className="text-rose-600 font-bold">
                    {formatLatency(reproduction.diff_vs_successful.latency_diff_ms.failed)}
                  </span>
                  <span className="text-slate-400">vs</span>
                  <span className="text-emerald-600 font-bold">
                    {formatLatency(reproduction.diff_vs_successful.latency_diff_ms.successful)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <span className="text-slate-400 block text-[11px]">App Version</span>
                <div className="mt-1 flex items-center gap-2 font-mono">
                  <span className="text-rose-600 font-bold">
                    {reproduction.diff_vs_successful.version_diff.failed}
                  </span>
                  <span className="text-slate-400">vs</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {reproduction.diff_vs_successful.version_diff.successful}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <span className="text-slate-400 block text-[11px]">Method & Path</span>
                <div className="mt-1 font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                  {reproduction.method}
                </div>
              </div>
            </div>

            {/* Body Diffs */}
            <div>
              <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Payload Differences
              </h5>
              <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">Field</th>
                      <th className="p-2.5 text-rose-600 dark:text-rose-400">Failed Request</th>
                      <th className="p-2.5 text-emerald-600 dark:text-emerald-400">Successful Baseline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reproduction.diff_vs_successful.body_diffs.map((diff, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                        <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">
                          {diff.field}
                        </td>
                        <td className="p-2.5 text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">
                          {diff.failed_value}
                        </td>
                        <td className="p-2.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                          {diff.successful_value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Header Diffs */}
            <div>
              <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Header Differences
              </h5>
              <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">Header</th>
                      <th className="p-2.5 text-rose-600 dark:text-rose-400">Failed Request</th>
                      <th className="p-2.5 text-emerald-600 dark:text-emerald-400">Successful Baseline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reproduction.diff_vs_successful.header_diffs.map((diff, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                        <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">
                          {diff.header}
                        </td>
                        <td className="p-2.5 text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">
                          {diff.failed_value}
                        </td>
                        <td className="p-2.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                          {diff.successful_value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Raw Sanitized Payloads */}
        {activeTab === 'raw' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Sanitized Request Body
              </h5>
              <pre className="p-3 rounded bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-72 border border-slate-800">
                <code>{reproduction.sanitized_body || 'No body payload'}</code>
              </pre>
            </div>

            <div>
              <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Safe Error Response (Status {reproduction.response_status})
              </h5>
              <pre className="p-3 rounded bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-72 border border-slate-800">
                <code>{reproduction.safe_response_body || 'No response body'}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
