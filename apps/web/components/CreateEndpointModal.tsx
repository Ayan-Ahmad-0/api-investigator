'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Endpoint } from '@/lib/types';

interface CreateEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Endpoint>) => void;
}

export const CreateEndpointModal: React.FC<CreateEndpointModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [interval, setInterval] = useState(60);
  const [timeout, setTimeoutVal] = useState(5);
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [env, setEnv] = useState('production');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    onSubmit({
      name,
      url,
      method,
      interval_seconds: Number(interval),
      timeout_seconds: Number(timeout),
      expected_status: Number(expectedStatus),
      environment: env,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Register New HTTP Monitor
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure automated synthetic uptime and latency health checks
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Endpoint Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Stripe Checkout Session Creator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">
                Method
              </label>
              <select
                aria-label="HTTP Method"
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div className="col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">
                Target URL (Public or Staging)
              </label>
              <input
                type="url"
                required
                placeholder="https://api.example.com/v1/checkout"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Check Interval
              </label>
              <select
                aria-label="Check Interval"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
              >
                <option value={30}>Every 30s</option>
                <option value={60}>Every 60s</option>
                <option value={300}>Every 5m</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Timeout (sec)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={timeout}
                onChange={(e) => setTimeoutVal(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expected Status
              </label>
              <input
                type="number"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs"
            >
              Start Monitoring
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
