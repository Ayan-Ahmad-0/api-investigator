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
      <div className="space-y-6">
        <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="h-40 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Project Settings & API Keys
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage authentication credentials, telemetry ingestion endpoints, and SDK integration
          </p>
        </div>

        <div className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 shadow-2xs">
          Workspace: acme_engineering
        </div>
      </div>

      {/* General Config */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          General Project Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-1">Project Name</span>
            <span className="font-semibold text-slate-900 dark:text-white text-sm">{project.name}</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-1">Project Identifier</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              {project.slug}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-1">Data Retention Window</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">30 days rolling</span>
          </div>
        </div>
      </div>

      {/* API Ingestion Keys */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Telemetry Ingestion API Keys</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Project-scoped write credentials used by client SDKs to safely send application telemetry
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingKey(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Ingestion Key</span>
          </button>
        </div>

        {/* Create key inline form */}
        {isCreatingKey && (
          <form
            onSubmit={handleCreateKey}
            className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs"
          >
            <input
              type="text"
              required
              placeholder="Key label (e.g. Kubernetes Cluster Production Ingest)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
            >
              Generate Key
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingKey(false)}
              className="px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        {/* API Keys Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Key Label</th>
                <th className="p-4">Secret Token (Masked)</th>
                <th className="p-4">Created Date</th>
                <th className="p-4">Last Active</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">{key.name}</td>
                  <td className="p-4">
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                      {key.masked_key}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {formatDate(key.created_at)}
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(key.masked_key, key.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {copiedKeyId === key.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(key.id)}
                      className="inline-flex items-center p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Integration Guide */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Quick Integration Snippets
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Send application telemetry automatically with our non-blocking Python SDK or via direct HTTP
          </p>
        </div>

        {/* Python Snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Python / FastAPI Middleware Integration
            </span>
            <button
              type="button"
              onClick={() => handleCopy(pythonSnippet, 'python', true)}
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
            >
              {copiedSnippet === 'python' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied Snippet</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto shadow-2xs">
            <code>{pythonSnippet}</code>
          </pre>
        </div>

        {/* cURL Snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Direct HTTP Ingestion via cURL
            </span>
            <button
              type="button"
              onClick={() => handleCopy(curlSnippet, 'curl', true)}
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
            >
              {copiedSnippet === 'curl' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied Snippet</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy cURL</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto shadow-2xs">
            <code>{curlSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
