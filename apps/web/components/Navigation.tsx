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
  Layers,
  Radio,
  Settings,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { mockProjects } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export const Navigation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(mockProjects[0].id);
  const [selectedEnv, setSelectedEnv] = useState<'production' | 'staging'>('production');
  const [timeRange, setTimeRange] = useState<string>('24h');

  const selectedProject = mockProjects.find((p) => p.id === selectedProjectId) || mockProjects[0];

  const navItems = [
    { label: 'Overview', href: '/', icon: Activity },
    { label: 'API Monitoring', href: '/monitors', icon: Radio },
    { label: 'Incidents', href: '/incidents', icon: AlertTriangle, badge: '2 Active' },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  const manageItems = [
    { label: 'Settings & Ingestion Keys', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 z-20">
        {/* Brand */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-2.5">
          <div className="w-7 h-7 rounded bg-slate-900 dark:bg-blue-600 flex items-center justify-center text-white">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white">
              API INVESTIGATOR
            </span>
            <span className="block text-[10px] uppercase font-mono tracking-wider text-slate-500">
              Reliability Engine
            </span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Workspace
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
                      'flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Manage
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
                      'flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* System Health / Footer status */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Active Ingestion Pipeline</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            SDK v1.0.4 • FastAPI v1.0
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-10">
          {/* Left: Project Switcher & Environment Selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                aria-label="Select Project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 pr-8 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {mockProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setSelectedEnv('production')}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  selectedEnv === 'production'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                )}
              >
                Production
              </button>
              <button
                type="button"
                onClick={() => setSelectedEnv('staging')}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  selectedEnv === 'staging'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                )}
              >
                Staging
              </button>
            </div>
          </div>

          {/* Right: Time Range & Controls */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span>Window:</span>
              <select
                aria-label="Select Time Window"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="1h">Last 1 hour</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Probe Ready</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
