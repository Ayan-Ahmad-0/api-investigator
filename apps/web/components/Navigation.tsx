'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Key,
  Plus,
  Radio,
  Settings,
  Shield,
  Terminal,
} from 'lucide-react';
import { mockProjects } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export const Navigation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(mockProjects[0].id);
  const [selectedEnv, setSelectedEnv] = useState<'production' | 'staging'>('production');

  const navItems = [
    { label: 'Overview', href: '/', icon: Activity },
    { label: 'Endpoints & Monitors', href: '/monitors', icon: Radio },
    { label: 'Incidents', href: '/incidents', icon: AlertTriangle, badge: '2 Active' },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  const manageItems = [
    { label: 'API Keys & Setup', href: '/settings', icon: Key },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 antialiased overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 z-20">
        {/* Brand */}
        <div className="h-16 border-b border-slate-200 flex items-center px-5 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-sm shadow-xs">
            AI
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-slate-900">
                API Investigator
              </span>
            </div>
            <span className="block text-xs text-slate-500 font-medium">
              Reliability & Debugging
            </span>
          </div>
        </div>

        {/* Project Selector Box */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/60">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider px-2 mb-1">
            Project
          </div>
          <div className="relative">
            <select
              aria-label="Select Project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-md px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {mockProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          <div>
            <div className="px-3 mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Monitoring & Triage
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Configuration
            </div>
            <nav className="space-y-1">
              {manageItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* System Health / Footer status */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-medium text-slate-700">Telemetry Active</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Port 8000</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
            <span>FastAPI Ingestion</span>
            <span className="text-emerald-600 font-medium">Connected</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-10 shrink-0">
          {/* Left: Environment Selector & Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Environment:</span>
              <div className="inline-flex bg-slate-100 rounded-md p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedEnv('production')}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    selectedEnv === 'production'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  Production
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEnv('staging')}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    selectedEnv === 'staging'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  Staging
                </button>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Organization:</span>
              <span className="font-semibold text-slate-700">Acme Payments Platform</span>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/monitors"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Monitor</span>
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            >
              <span>API Docs</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
