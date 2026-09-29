import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Brain, 
  CheckCircle2, 
  ShieldAlert, 
  BookOpen, 
  ArrowRight,
  Upload,
  Check
} from 'lucide-react';
import { Incident, Runbook, Severity } from '../types/incident';
import { apiLearnPostMortem } from '../utils/incidentStorage';

interface PostMortemLearnerProps {
  onSaveLearnedIncident: (incident: Incident, runbook?: Runbook) => void;
  onNavigateToMemoryVault: (incidentId?: string) => void;
}

export const PostMortemLearner: React.FC<PostMortemLearnerProps> = ({
  onSaveLearnedIncident,
  onNavigateToMemoryVault,
}) => {
  const sampleDoc = `# Post-Mortem: Cart Checkout Deadlock & Thread Starvation (INC-994)
Date: 2026-09-12
Severity: SEV-1
Author: Lead Database SRE

## Executive Summary
At 10:14 UTC, our primary payment checkout service experienced a sudden surge in HTTP 500 errors and transaction timeouts. Over 18 minutes, approximately 1,400 checkout orders failed before mitigation was completed.

## Impact
- 18 minutes of partial checkout downtime
- 38% order failure rate during peak European commerce window
- Database connection pool utilization reached 100%

## Root Cause Analysis
A new loyalty discount calculation feature introduced a database transaction that acquired row-level write locks in reverse order (SKU ID descending instead of ascending). When two concurrent checkout requests attempted to purchase intersecting item baskets, a mutual dead-lock occurred on Postgres table \`inventory_items\`.
Because the application framework lacked a deadlock retry handler with jitter, client threads remained blocked in transaction lock wait states until HikariCP pool timed out at 30 seconds.

## 5-Whys
1. Why did checkout fail? Database pool hit max connection limit.
2. Why did connections fill up? Threads were blocked waiting on row locks.
3. Why were locks contested? Concurrent transactions locked inventory rows in conflicting order.
4. Why was locking order conflicting? The new promo engine sorted items by discount value rather than primary key ID.
5. Why wasn't this caught in staging? Staging tests lacked high-concurrency contention simulation.

## What Worked
- Terminating deadlocked backends using pg_cancel_backend / pg_terminate_backend.
- Setting statement_timeout to 4000ms dynamically at session level to fail fast rather than hang pool.

## What NOT To Do (Critical Pitfalls)
- DO NOT perform a hard restart of the database server! In-flight write buffers will require WAL replay, extending downtime by 20+ minutes.
- DO NOT increase HikariCP maximumPoolSize from 150 to 500; doing so overwhelms Postgres process memory and triggers OS OOM killer.

## Preventative Action Items
- Enforce strict ascending primary key sorting on all multi-row lock acquisitions.
- Mandate 3000ms statement_timeout on all OLTP microservice credentials.
- Add deadlock integration test suite into CI pipeline.`;

  const [documentText, setDocumentText] = useState(sampleDoc);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentText.trim()) return;

    setIsExtracting(true);
    setIsSaved(false);

    try {
      const result = await apiLearnPostMortem(documentText);
      setExtractedData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCommitToMemory = () => {
    if (!extractedData) return;

    const newIncId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRunbookId = `RB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    let newRunbook: Runbook | undefined;
    if (extractedData.extractedRunbook) {
      newRunbook = {
        id: newRunbookId,
        title: extractedData.extractedRunbook.title || 'Synthesized Recovery Runbook',
        category: extractedData.extractedRunbook.category || 'Database & Storage',
        description: extractedData.extractedRunbook.description || 'Learned from post-mortem analysis.',
        successRate: 100,
        estimatedTimeMin: 6,
        verifiedInIncidents: [newIncId],
        riskLevel: 'MEDIUM',
        author: 'Post-Mortem AI Synthesizer',
        steps: extractedData.extractedRunbook.steps?.map((s: any, idx: number) => ({
          id: `step-${Date.now()}-${idx}`,
          title: s.title || `Recovery Step ${idx + 1}`,
          command: s.command || 'kubectl get pods',
          description: s.description || 'Action step',
          expectedResult: 'Command completes without error.',
          riskLevel: s.riskLevel || 'LOW',
        })) || [],
      };
    }

    const newIncident: Incident = {
      id: newIncId,
      title: extractedData.title || 'Learned Production Outage',
      severity: (extractedData.severity as Severity) || 'SEV-1',
      status: 'RESOLVED',
      createdAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      services: extractedData.services || ['Checkout-API', 'Database'],
      trigger: extractedData.trigger || 'Discovered via post-mortem ingestion',
      rootCause: extractedData.rootCause || 'Unresolved root cause',
      symptoms: 'Extracted from post-mortem documentation.',
      rawLogs: '[POST-MORTEM TELEMETRY INGESTED]',
      metrics: {
        errorRatePct: 0.01,
        p99LatencyMs: 150,
        throughputRps: 920,
        cpuPct: 32,
      },
      resolutionSummary: extractedData.resolutionSummary || 'Remediated successfully.',
      effectiveRunbookIds: newRunbook ? [newRunbook.id] : [],
      pitfallsToAvoid: extractedData.pitfallsToAvoid || [],
      fiveWhys: extractedData.fiveWhys || [],
      preventativeActions: extractedData.preventativeActions || [],
      mttrMinutes: 18,
      commander: 'Incident Commander',
      timeline: [],
    };

    onSaveLearnedIncident(newIncident, newRunbook);
    setIsSaved(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Post-Mortem Learner & Knowledge Synthesizer
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          The agent ingests post-mortems, retro documents, and incident reviews. It extracts root causes, 5-Whys, what NOT to do, and generates executable runbooks for instant recall during future outages.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Document Ingest Area (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleExtract}
            className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                Paste Post-Mortem Document / Markdown
              </label>
              <button
                type="button"
                onClick={() => setDocumentText(sampleDoc)}
                className="text-slate-400 hover:text-slate-200 text-[11px] underline"
              >
                Load Sample Retro
              </button>
            </div>

            <textarea
              rows={16}
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste incident post-mortem markdown or meeting transcript..."
              className="w-full bg-slate-950 font-mono text-[11px] text-slate-200 border border-slate-800 rounded-lg p-3 focus:outline-none focus:border-amber-500/60 leading-relaxed"
            />

            <button
              type="submit"
              disabled={isExtracting || !documentText.trim()}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isExtracting ? 'Synthesizing Knowledge...' : 'Extract Lessons & Generate Runbook'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Extracted Memory Entry & Runbook (7 cols) */}
        <div className="lg:col-span-7">
          {isExtracting ? (
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-3">
              <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
              <div className="text-sm font-semibold text-slate-200">
                Agent Synthesizing Post-Mortem Intelligence
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Extracting failure triggers, 5-Whys causal chains, anti-pattern warnings, and generating safe command sequences...
              </p>
            </div>
          ) : extractedData ? (
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="text-amber-400 font-bold">SYNTHESIZED MEMORY ENTRY</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-rose-400 font-bold">{extractedData.severity}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-100 mt-0.5">
                    {extractedData.title}
                  </h2>
                </div>

                <button
                  onClick={handleCommitToMemory}
                  disabled={isSaved}
                  className={`px-4 py-1.5 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-sm ${
                    isSaved
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Saved to Memory Vault</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      <span>Commit to Memory Vault</span>
                    </>
                  )}
                </button>
              </div>

              {/* Root Cause */}
              <div className="space-y-1">
                <div className="font-semibold text-slate-300">Root Cause Identified</div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 leading-relaxed font-mono text-[11px]">
                  {extractedData.rootCause}
                </div>
              </div>

              {/* 5-Whys */}
              {extractedData.fiveWhys && extractedData.fiveWhys.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-300">Extracted 5-Whys Causal Chain</div>
                  <div className="space-y-1.5 p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    {extractedData.fiveWhys.map((why: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="text-amber-400 font-mono font-bold shrink-0">{i + 1}.</span>
                        <span>{why}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pitfalls to Avoid */}
              {extractedData.pitfallsToAvoid && extractedData.pitfallsToAvoid.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Post-Mortem Lessons & Pitfalls (What NOT To Do)</span>
                  </div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-1.5">
                    {extractedData.pitfallsToAvoid.map((p: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 text-rose-200">
                        <span className="text-rose-400 font-bold shrink-0">✕</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Runbook */}
              {extractedData.extractedRunbook && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Synthesized Runbook: {extractedData.extractedRunbook.title}</span>
                  </div>
                  <div className="space-y-2">
                    {extractedData.extractedRunbook.steps?.map((step: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-slate-300 font-medium">
                          <span>{idx + 1}. {step.title}</span>
                          <span className="text-[10px] font-mono text-slate-400">{step.riskLevel} RISK</span>
                        </div>
                        <div className="font-mono text-amber-300 text-[11px] bg-slate-950 p-1.5 rounded">
                          $ {step.command}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs font-mono space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <div>Paste a post-mortem or retro document on the left and click "Extract Lessons".</div>
              <p className="text-slate-600 max-w-sm mx-auto">
                The agent will automatically translate the post-mortem into structured memory and a runnable runbook.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
