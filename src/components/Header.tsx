import React from 'react';
import { 
  Flame, 
  Brain, 
  BookOpen, 
  Search, 
  FileText, 
  Target, 
  RefreshCw, 
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Incident } from '../types/incident';

interface HeaderProps {
  activeTab: 'war-room' | 'memory-vault' | 'runbooks' | 'diagnose' | 'post-mortem' | 'fire-drill';
  setActiveTab: (tab: 'war-room' | 'memory-vault' | 'runbooks' | 'diagnose' | 'post-mortem' | 'fire-drill') => void;
  activeIncident: Incident;
  aiAvailable: boolean;
  onResetData: () => void;
  onOpenN8nChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeIncident,
  aiAvailable,
  onResetData,
  onOpenN8nChat,
}) => {
  const isIncidentOngoing = activeIncident.status !== 'RESOLVED';

  return (
    <header className="border-b border-slate-800/80 bg-[#0c121e]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top brand & live telemetry bar */}
        <div className="flex items-center justify-between h-16 border-b border-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 tracking-tight text-base">
                  Incident Response Agent
                </span>
                <span className="text-xs text-amber-400/90 font-mono">
                  SRE Memory & Triage
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Autonomous Incident Recall</span>
                <span aria-hidden="true">·</span>
                <span>Post-Mortem Knowledge Base</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-emerald-400">MTTR ~7.4m (80.6% faster)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Incident Status Banner */}
            <div 
              onClick={() => setActiveTab('war-room')}
              className={`cursor-pointer transition-all border px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs ${
                isIncidentOngoing 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
              title="Click to jump into the Active War Room"
            >
              <span className={`w-2 h-2 rounded-full ${isIncidentOngoing ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="font-semibold uppercase tracking-wider font-mono">
                {isIncidentOngoing ? `${activeIncident.severity}: ${activeIncident.status}` : 'ALL SYSTEMS NOMINAL'}
              </span>
              <span className="text-slate-400 hidden sm:inline">
                {isIncidentOngoing ? `(${activeIncident.id})` : 'Production Healthy'}
              </span>
            </div>

            {/* AI Engine Status */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Sparkles className={`w-3.5 h-3.5 ${aiAvailable ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{aiAvailable ? 'Gemini 3.8 Flash' : 'Deterministic Recall'}</span>
            </div>

            {/* n8n Webhook Chatbot Status */}
            <button
              onClick={onOpenN8nChat}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors"
              title="Connected to harshapradha.app.n8n.cloud/webhook/55430de3-a12a-419c-8317-aa1d8be07798/chat"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>n8n Chatbot</span>
            </button>

            {/* Reset button */}
            <button
              onClick={onResetData}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-colors text-xs flex items-center gap-1.5"
              title="Reset state to default baseline incidents and runbooks"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('war-room')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              activeTab === 'war-room'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Active War Room</span>
            {isIncidentOngoing && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('memory-vault')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              activeTab === 'memory-vault'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Incident Memory Vault</span>
          </button>

          <button
            onClick={() => setActiveTab('runbooks')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              activeTab === 'runbooks'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Proven Runbooks</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnose')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              activeTab === 'diagnose'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Diagnose & Match</span>
          </button>

          <button
            onClick={() => setActiveTab('post-mortem')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              activeTab === 'post-mortem'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Post-Mortem Learner</span>
          </button>

          <button
            onClick={() => setActiveTab('fire-drill')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              activeTab === 'fire-drill'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Fire Drill Simulation</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
