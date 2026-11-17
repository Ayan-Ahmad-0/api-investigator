'use client';

import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Key,
  Plus,
  Shield,
  Terminal,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ApiKey, Project } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function SettingsPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, keys] = await Promise.all([
          api.getProject('proj_core_api_prod'),
          api.getApiKeys('proj_core_api_prod'),
        ]);
        setProject(p);
        setApiKeys(keys);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const created = await api.createApiKey('proj_core_api_prod', newKeyName.trim());
    setApiKeys((prev) => [created, ...prev]);
    setNewKeyName('');
    setIsCreatingKey(false);
  };

  const handleDeleteKey = async (keyId: string) => {
    await api.deleteApiKey('proj_core_api_prod', keyId);
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
  };

  const handleCopy = (text: string, id: string, isSnippet = false) => {
    navigator.clipboard.writeText(text);
    if (isSnippet) {
      setCopiedSnippet(id);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } else {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
  };

  const pythonSnippet = `# Install the official SDK:
# pip install api-investigator-sdk

from api_investigator import APIInvestigator

# Initialize client with your project ingestion key
investigator = APIInvestigator(
    api_key="${apiKeys[0]?.masked_key || 'inv_live_your_key_here'}",
    project_id="${project?.id || 'proj_core_api_prod'}",
    environment="${project?.environment || 'production'}"
)

# Instrument FastAPI middleware:
from fastapi import FastAPI
app = FastAPI()
app.add_middleware(investigator.fastapi_middleware())`;

  const curlSnippet = `curl -X POST "http://localhost:8000/api/v1/ingest/events" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKeys[0]?.masked_key || 'inv_live_your_key_here'}" \\
  -d '{
    "events": [
      {
        "endpoint_route": "POST /v1/billing/checkout-sessions",
        "status_code": 500,
        "latency_ms": 4820,
        "exception_class": "asyncpg.exceptions.PoolTimeoutError",
        "timestamp": "2026-11-17T09:32:15Z"
      }
    ]
  }'`;

  if (loading || !project) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Project Settings & Ingestion Keys
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage project authentication credentials, telemetry ingestion endpoints, and SDK instrumentation
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800">
          Org: acme_engineering
        </div>
      </div>

      {/* Project Metadata */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
          General Project Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Project Name</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{project.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Project Identifier / Slug</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{project.slug}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Data Retention Window</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">30 days rolling</span>
          </div>
        </div>
      </div>

      {/* Ingestion API Keys Management */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Telemetry Ingestion API Keys</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Project-scoped write credentials used by SDKs and log aggregators to transmit sanitized events
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingKey(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Ingestion Key</span>
          </button>
        </div>

        {/* Modal/Inline creation form */}
        {isCreatingKey && (
          <form
            onSubmit={handleCreateKey}
            className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs"
          >
            <input
              type="text"
              required
              placeholder="Key description (e.g. AWS Production Worker Pods)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingKey(false)}
              className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        {/* API Keys Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Key Label</th>
                <th className="p-3">Secret Token (Masked)</th>
                <th className="p-3">Created</th>
                <th className="p-3">Last Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {apiKeys.map((key) => (
                <tr
                  key={key.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                    {key.name}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {key.masked_key}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 text-[11px] font-sans">
                    {formatDate(key.created_at)}
                  </td>
                  <td className="p-3 text-slate-400 text-[11px] font-sans">
                    {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap space-x-2 font-sans">
                    <button
                      type="button"
                      onClick={() => handleCopy(key.masked_key, key.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {copiedKeyId === key.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(key.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Revoke</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SDK Setup Snippets */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>SDK Instrumentation & Integration Snippets</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Integrate automatic error tracking and latency profiling into your application framework
          </p>
        </div>

        {/* Python SDK */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Python FastAPI / Flask SDK
            </span>
            <button
              type="button"
              onClick={() => handleCopy(pythonSnippet, 'python', true)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {copiedSnippet === 'python' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Python Snippet</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 rounded bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
            <code>{pythonSnippet}</code>
          </pre>
        </div>

        {/* cURL Ingestion Endpoint */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Direct Ingestion HTTP Endpoint (cURL / Webhook)
            </span>
            <button
              type="button"
              onClick={() => handleCopy(curlSnippet, 'curl', true)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {copiedSnippet === 'curl' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy cURL</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 rounded bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
            <code>{curlSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
