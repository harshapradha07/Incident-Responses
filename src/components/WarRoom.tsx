import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Terminal, 
  Clock, 
  Play, 
  RotateCcw, 
  Send, 
  Brain, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Activity,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { Incident, Runbook, RunbookStep, AIDiagnosisResult, IncidentStatus } from '../types/incident';
import { apiDiagnoseIncident, apiAskAgent, apiN8nChat } from '../utils/incidentStorage';

interface WarRoomProps {
  activeIncident: Incident;
  onUpdateActiveIncident: (incident: Incident) => void;
  pastIncidents: Incident[];
  runbooks: Runbook[];
  onNavigateToMemoryVault: (incidentId?: string) => void;
  onNavigateToRunbooks: (runbookId?: string) => void;
  onOpenN8nChat?: () => void;
}

export const WarRoom: React.FC<WarRoomProps> = ({
  activeIncident,
  onUpdateActiveIncident,
  pastIncidents,
  runbooks,
  onNavigateToMemoryVault,
  onNavigateToRunbooks,
  onOpenN8nChat,
}) => {
  const [diagnosis, setDiagnosis] = useState<AIDiagnosisResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [activeRunbook, setActiveRunbook] = useState<Runbook | null>(null);
  const [executingStepId, setExecutingStepId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<{ [stepId: string]: string }>({});
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [agentQuestion, setAgentQuestion] = useState('');
  const [isAskingAgent, setIsAskingAgent] = useState(false);
  const [chatTarget, setChatTarget] = useState<'gemini' | 'n8n'>('n8n');
  const [newNote, setNewNote] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Auto diagnose on mount or when incident changes
  useEffect(() => {
    let isMounted = true;
    async function loadDiagnosis() {
      setIsDiagnosing(true);
      try {
        const result = await apiDiagnoseIncident(activeIncident, pastIncidents, runbooks);
        if (isMounted) {
          setDiagnosis(result);
          // Set suggested runbook
          const rb = runbooks.find(r => r.id === result.suggestedRunbookId) || runbooks[0];
          setActiveRunbook(rb);
        }
      } catch (err) {
        console.error('Diagnosis failed:', err);
      } finally {
        if (isMounted) setIsDiagnosing(false);
      }
    }

    loadDiagnosis();
    return () => { isMounted = false; };
  }, [activeIncident.id, activeIncident.status]);

  const handleStatusChange = (newStatus: IncidentStatus) => {
    const updated: Incident = {
      ...activeIncident,
      status: newStatus,
      resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : undefined,
      timeline: [
        ...activeIncident.timeline,
        {
          id: `tl-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'Incident Commander',
          message: `Status changed to ${newStatus}`,
          type: 'STATUS_CHANGE',
        },
      ],
    };
    if (newStatus === 'RESOLVED') {
      // Calculate MTTR in minutes
      const start = new Date(activeIncident.createdAt).getTime();
      const end = Date.now();
      updated.mttrMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)));
      // Normalize metrics on resolution
      updated.metrics = {
        errorRatePct: 0.02,
        p99LatencyMs: 145,
        throughputRps: 1240,
        cpuPct: 32,
      };
    }
    onUpdateActiveIncident(updated);
  };

  const handleExecuteStep = (step: RunbookStep) => {
    setExecutingStepId(step.id);
    const initialLog = `$ ${step.command}\n[EXECUTING] Connecting to target cluster pods...\n`;
    setTerminalLogs(prev => ({ ...prev, [step.id]: initialLog }));

    setTimeout(() => {
      let finalLog = initialLog;
      if (step.id === 'step-rb-1') {
        finalLog += `database=production_checkout | active=150 | waiting=740 | max=150\n[OUTPUT] Identified 114 pids in 'idle in transaction' state for > 15s.\n[VERIFY] ${step.expectedResult}\n[SUCCESS] Step verified.`;
      } else if (step.id === 'step-rb-2') {
        finalLog += `psql> Terminated 114 backend pids.\n[OUTPUT] pg_terminate_backend returned true for all target workers.\n[METRICS] Active connection pool drops to 36/150 (76% reclaimed).\n[SUCCESS] Contended locks released.`;
      } else if (step.id === 'step-rb-3') {
        finalLog += `envoyfilter.networking.istio.io/ingress-rate-limit patched\n[OUTPUT] Dynamic concurrency ceiling set to 1200 concurrent streams.\n[METRICS] p99 latency falling to 280ms.\n[SUCCESS] Stream threshold verified.`;
      } else if (step.id === 'step-rb-4') {
        finalLog += `deployment.apps/checkout-api restarted\n[OUTPUT] Staggered rolling restart initiated (maxUnavailable: 10%).\n[OUTPUT] 18/18 pods refreshed with healthy connection pools.\n[SUCCESS] Error rate normalizes to 0.04%.`;
      } else {
        finalLog += `[STDOUT] Execution completed.\n${step.expectedResult}\n[SUCCESS] Step exited with code 0.`;
      }

      setTerminalLogs(prev => ({ ...prev, [step.id]: finalLog }));
      setExecutingStepId(null);
      setCompletedStepIds(prev => [...new Set([...prev, step.id])]);

      // Add to timeline
      const updatedTimeline = [
        ...activeIncident.timeline,
        {
          id: `tl-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'SRE Execution',
          message: `Executed runbook step: ${step.title}`,
          type: 'RUNBOOK' as const,
        },
      ];

      // If step 2 or later, improve metrics progressively
      let updatedMetrics = { ...activeIncident.metrics };
      if (step.id === 'step-rb-2') {
        updatedMetrics = {
          errorRatePct: 12.4,
          p99LatencyMs: 1400,
          throughputRps: 680,
          cpuPct: 62,
        };
      } else if (step.id === 'step-rb-4' || completedStepIds.length >= (activeRunbook?.steps.length || 4) - 1) {
        updatedMetrics = {
          errorRatePct: 0.05,
          p99LatencyMs: 160,
          throughputRps: 1150,
          cpuPct: 35,
        };
      }

      onUpdateActiveIncident({
        ...activeIncident,
        status: activeIncident.status === 'INVESTIGATING' ? 'MITIGATING' : activeIncident.status,
        metrics: updatedMetrics,
        timeline: updatedTimeline,
      });
    }, 1200);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const updatedTimeline = [
      ...activeIncident.timeline,
      {
        id: `tl-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        author: 'Incident Commander',
        message: newNote.trim(),
        type: 'NOTE' as const,
      },
    ];

    onUpdateActiveIncident({
      ...activeIncident,
      timeline: updatedTimeline,
    });
    setNewNote('');
  };

  const handleAskAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentQuestion.trim() || isAskingAgent) return;

    const q = agentQuestion.trim();
    setAgentQuestion('');
    setIsAskingAgent(true);

    const userEntry = {
      id: `tl-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'Commander Query',
      message: `Question to Agent: "${q}"`,
      type: 'NOTE' as const,
    };

    onUpdateActiveIncident({
      ...activeIncident,
      timeline: [...activeIncident.timeline, userEntry],
    });

    try {
      if (chatTarget === 'n8n') {
        const n8nResult = await apiN8nChat(
          q,
          `warroom-${activeIncident.id}`,
          undefined,
          {
            id: activeIncident.id,
            title: activeIncident.title,
            severity: activeIncident.severity,
            services: activeIncident.services,
            symptoms: activeIncident.symptoms,
          }
        );
        const agentEntry = {
          id: `tl-${Date.now() + 1}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'n8n Chatbot',
          message: n8nResult.reply,
          type: 'AGENT' as const,
        };

        onUpdateActiveIncident({
          ...activeIncident,
          timeline: [...activeIncident.timeline, userEntry, agentEntry],
        });
      } else {
        const answer = await apiAskAgent(q, activeIncident, pastIncidents);
        const agentEntry = {
          id: `tl-${Date.now() + 1}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'Incident Response Agent',
          message: answer,
          type: 'AGENT' as const,
        };

        onUpdateActiveIncident({
          ...activeIncident,
          timeline: [...activeIncident.timeline, userEntry, agentEntry],
        });
      }
    } catch (e: any) {
      console.error(e);
      const errEntry = {
        id: `tl-${Date.now() + 1}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        author: chatTarget === 'n8n' ? 'n8n Chatbot' : 'Incident Response Agent',
        message: `Query failed: ${e.message || 'Network error'}. Check connection.`,
        type: 'AGENT' as const,
      };
      onUpdateActiveIncident({
        ...activeIncident,
        timeline: [...activeIncident.timeline, userEntry, errEntry],
      });
    } finally {
      setIsAskingAgent(false);
    }
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const matchedPastIncident = pastIncidents.find(
    p => p.id === diagnosis?.topMatchingIncidentId
  ) || pastIncidents[0];

  const allStepsCompleted = activeRunbook 
    ? activeRunbook.steps.every(s => completedStepIds.includes(s.id))
    : false;

  return (
    <div className="space-y-6">
      {/* Top Incident Command Banner */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="text-rose-400 font-semibold">{activeIncident.id}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-bold">{activeIncident.severity}</span>
              <span aria-hidden="true">·</span>
              <span>Triggered {new Date(activeIncident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span aria-hidden="true">·</span>
              <span>Services: {activeIncident.services.join(', ')}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              {activeIncident.title}
            </h1>
            <p className="text-sm text-slate-300">
              {activeIncident.symptoms}
            </p>
          </div>

          {/* Status Segmented Control */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
              {(['INVESTIGATING', 'IDENTIFIED', 'MITIGATING', 'RESOLVED'] as IncidentStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    activeIncident.status === status
                      ? status === 'RESOLVED'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {activeIncident.status === 'RESOLVED' && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>MTTR: {activeIncident.mttrMinutes} mins</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Telemetry Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-3">
            <div className="text-xs text-slate-400">HTTP 5xx Error Rate</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-xl font-bold font-mono tabular-nums ${activeIncident.metrics.errorRatePct > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeIncident.metrics.errorRatePct.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-500 font-mono">threshold: 1.0%</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-3">
            <div className="text-xs text-slate-400">p99 Response Latency</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-xl font-bold font-mono tabular-nums ${activeIncident.metrics.p99LatencyMs > 1000 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {activeIncident.metrics.p99LatencyMs}ms
              </span>
              <span className="text-xs text-slate-500 font-mono">baseline: 150ms</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-3">
            <div className="text-xs text-slate-400">Gateway Throughput</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono tabular-nums text-slate-200">
                {activeIncident.metrics.throughputRps}
              </span>
              <span className="text-xs text-slate-500 font-mono">req/sec</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-3">
            <div className="text-xs text-slate-400">Database Host CPU</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-xl font-bold font-mono tabular-nums ${activeIncident.metrics.cpuPct > 80 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeIncident.metrics.cpuPct}%
              </span>
              <span className="text-xs text-slate-500 font-mono">pool saturated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: AI Memory Recall & Triage on Left, Runbook Executor on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Autonomous Recall & Root Cause Match (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Autonomous Incident Memory Match */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Incident Memory Recall
                </h2>
              </div>
              {diagnosis && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded">
                  <span>Match Confidence:</span>
                  <span className="font-bold">{diagnosis.confidenceScore}%</span>
                </div>
              )}
            </div>

            {isDiagnosing ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
                <p className="text-xs font-mono">Scanning incident archive & historical post-mortems...</p>
              </div>
            ) : diagnosis ? (
              <div className="space-y-4 text-xs">
                {/* Primary Hypothesis */}
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-slate-400 font-medium">Root Cause Hypothesis</div>
                  <div className="text-slate-200 leading-relaxed font-mono">
                    {diagnosis.primaryHypothesis}
                  </div>
                </div>

                {/* Recalled Past Incident Card */}
                {matchedPastIncident && (
                  <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-semibold font-mono">
                        Recalled Past Incident: {matchedPastIncident.id}
                      </span>
                      <button
                        onClick={() => onNavigateToMemoryVault(matchedPastIncident.id)}
                        className="text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                      >
                        <span>Inspect Retro</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-slate-200 font-medium text-xs">
                      {matchedPastIncident.title}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {diagnosis.similarityReasoning}
                    </p>
                    <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px] pt-1">
                      <span>Past MTTR: {matchedPastIncident.mttrMinutes}m</span>
                      <span aria-hidden="true">·</span>
                      <span>Resolved by: {matchedPastIncident.commander}</span>
                    </div>
                  </div>
                )}

                {/* CRITICAL POST-MORTEM WARNINGS */}
                {diagnosis.postMortemWarnings && diagnosis.postMortemWarnings.length > 0 && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2">
                    <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Post-Mortem Lessons & Pitfalls (What NOT To Do)</span>
                    </div>
                    <ul className="space-y-1.5 text-rose-200/90 pl-1">
                      {diagnosis.postMortemWarnings.map((warn, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-400 font-bold shrink-0">✕</span>
                          <span>{warn}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Blast Radius & TTM */}
                <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
                  <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded">
                    <div className="text-slate-500 text-[11px]">Est. Recovery Time</div>
                    <div className="text-emerald-400 font-bold">{diagnosis.estimatedTimeToRecovery}</div>
                  </div>
                  <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded">
                    <div className="text-slate-500 text-[11px]">Blast Radius</div>
                    <div className="text-slate-300 text-[11px] leading-tight">{diagnosis.blastRadius}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Raw Log Excerpt */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                Raw Error Log Telemetry
              </span>
              <button
                onClick={() => copyCommand(activeIncident.rawLogs)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copiedCmd === activeIncident.rawLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-rose-300/90 overflow-x-auto max-h-48 leading-relaxed">
              {activeIncident.rawLogs}
            </pre>
          </div>
        </div>

        {/* Right Column: Runbook Execution & War Room Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Proven Runbook Executor */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-400 font-semibold">
                    {activeRunbook?.id || 'RUNBOOK'}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-emerald-400 font-mono">
                    {activeRunbook?.successRate}% Historical Success Rate
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400 font-mono">
                    ~{activeRunbook?.estimatedTimeMin} min execution
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">
                  {activeRunbook?.title}
                </h3>
              </div>

              {allStepsCompleted && activeIncident.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleStatusChange('RESOLVED')}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-md shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Mark Resolved</span>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activeRunbook?.description}
            </p>

            {/* Runbook Steps */}
            <div className="space-y-3 pt-2">
              {activeRunbook?.steps.map((step, idx) => {
                const isCompleted = completedStepIds.includes(step.id);
                const isExecuting = executingStepId === step.id;
                const output = terminalLogs[step.id];

                return (
                  <div
                    key={step.id}
                    className={`border rounded-lg p-3.5 transition-all ${
                      isCompleted
                        ? 'bg-emerald-950/20 border-emerald-900/40'
                        : isExecuting
                        ? 'bg-amber-950/20 border-amber-800/60 ring-1 ring-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            {step.title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {step.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          step.riskLevel === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : step.riskLevel === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {step.riskLevel} RISK
                        </span>

                        <button
                          onClick={() => handleExecuteStep(step)}
                          disabled={isExecuting}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border border-slate-700'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                          }`}
                        >
                          {isExecuting ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 animate-spin" />
                              <span>Executing...</span>
                            </>
                          ) : isCompleted ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Re-run</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Execute Step</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Command bar */}
                    <div className="mt-3 flex items-center justify-between bg-slate-950 px-3 py-2 rounded border border-slate-800 text-xs font-mono">
                      <span className="text-amber-300/90 truncate mr-2">
                        $ {step.command}
                      </span>
                      <button
                        onClick={() => copyCommand(step.command)}
                        className="text-slate-400 hover:text-slate-200 shrink-0"
                        title="Copy command"
                      >
                        {copiedCmd === step.command ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Terminal execution output */}
                    {output && (
                      <div className="mt-2 p-2.5 bg-black/90 border border-slate-800/80 rounded font-mono text-[11px] text-emerald-300 whitespace-pre-wrap leading-relaxed">
                        {output}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* War Room Live Timeline & SRE Copilot */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>War Room Collaboration Log</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {activeIncident.timeline.length} events logged
              </span>
            </div>

            {/* Timeline Stream */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {activeIncident.timeline.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs"
                >
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 pt-0.5">
                    {ev.time}
                  </span>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        ev.type === 'ALERT'
                          ? 'text-rose-400'
                          : ev.type === 'AGENT'
                          ? 'text-amber-300'
                          : ev.type === 'RUNBOOK'
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }`}>
                        {ev.author}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        [{ev.type}]
                      </span>
                    </div>
                    <div className="text-slate-300 leading-relaxed break-words">
                      {ev.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ask Agent & Log Note */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              {/* Bot selection bar */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 p-0.5 bg-slate-900 border border-slate-800 rounded-md font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => setChatTarget('n8n')}
                    className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                      chatTarget === 'n8n'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${chatTarget === 'n8n' ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                    <span>n8n Chatbot</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatTarget('gemini')}
                    className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                      chatTarget === 'gemini'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Brain className="w-3 h-3" />
                    <span>Gemini Recall</span>
                  </button>
                </div>

                {onOpenN8nChat && (
                  <button
                    type="button"
                    onClick={onOpenN8nChat}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-mono underline flex items-center gap-1"
                  >
                    <span>Open n8n Chat Window</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <form onSubmit={handleAskAgent} className="flex gap-2">
                <input
                  type="text"
                  value={agentQuestion}
                  onChange={(e) => setAgentQuestion(e.target.value)}
                  placeholder={
                    chatTarget === 'n8n'
                      ? 'Query n8n Chatbot webhook (harshapradha.app.n8n.cloud)...'
                      : 'Ask Gemini agent: e.g. What happened when we ran this fix in INC-842?'
                  }
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-amber-500/60"
                />
                <button
                  type="submit"
                  disabled={isAskingAgent || !agentQuestion.trim()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>{isAskingAgent ? 'Sending...' : chatTarget === 'n8n' ? 'Send to n8n' : 'Query Memory'}</span>
                </button>
              </form>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Log an incident note or commander decision..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-slate-700"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Note</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
