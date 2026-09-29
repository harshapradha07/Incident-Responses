import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Brain, 
  ShieldAlert, 
  Terminal, 
  ArrowRight, 
  CheckCircle2, 
  Flame, 
  Copy, 
  Check 
} from 'lucide-react';
import { Incident, Runbook, AIDiagnosisResult, Severity } from '../types/incident';
import { apiDiagnoseIncident } from '../utils/incidentStorage';

interface IncidentDiagnoserProps {
  pastIncidents: Incident[];
  runbooks: Runbook[];
  onPromoteToWarRoom: (newIncident: Incident) => void;
}

export const IncidentDiagnoser: React.FC<IncidentDiagnoserProps> = ({
  pastIncidents,
  runbooks,
  onPromoteToWarRoom,
}) => {
  const [title, setTitle] = useState('Payment Gateway 504 Gateway Timeout on Submit');
  const [severity, setSeverity] = useState<Severity>('SEV-1');
  const [services, setServices] = useState('Payment-Router, PostgreSQL-Primary');
  const [symptoms, setSymptoms] = useState('Transactions timing out after 30 seconds; connection pool saturated.');
  const [rawLogs, setRawLogs] = useState(`[FATAL] [PaymentService] HikariPool-1 - Connection is not available, request timed out after 30000ms.
[ERROR] [CheckoutController] PSQLException: Connection pool exhausted (active=150, idle=0, waiting=680)
[WARN]  [PgBouncer] server connection pool full: database='payments' user='app' active=150`);

  const [isLoading, setIsLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<AIDiagnosisResult | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const presets = [
    {
      label: 'DB Connection Pool Starvation',
      title: 'Postgres Connection Pool Saturation on Checkout',
      severity: 'SEV-1' as Severity,
      services: 'Checkout-API, PostgreSQL-Primary, PgBouncer',
      symptoms: 'HTTP 504 Gateway Timeouts; connection pool waiting queues spike to 800+.',
      rawLogs: `[ERROR] [HikariPool-1] Connection is not available, request timed out after 30002ms.
[WARN]  [PgBouncer] server connection pool full: active=150 waiting=842
[FATAL] [Envoy] [upstream_reset_before_response_started{connection_termination}]`,
    },
    {
      label: 'Redis Memory OOM Eviction',
      title: 'Auth Gateway 500: Redis Maxmemory Reached',
      severity: 'SEV-1' as Severity,
      services: 'Auth-Gateway, Redis-Cluster-Primary',
      symptoms: 'Mobile login failing with internal server error; Redis write commands rejected.',
      rawLogs: `[ERROR] [AuthService] RedisCommandExecutionException: OOM command not allowed when used memory > 'maxmemory'
[WARN]  [RedisCluster] maxmemory reached: 34359738368 / 34359738368 bytes
[ERROR] [UserSessionManager] Failed to persist JWT session key 'sess:auth:v2:anon'`,
    },
    {
      label: 'Kafka Consumer Rebalance Storm',
      title: 'Order Fulfillment Lag: Consumer Group Flapping',
      severity: 'SEV-2' as Severity,
      services: 'Order-Processing-Worker, Kafka-Cluster-EU',
      symptoms: 'Message lag exploding; consumer group in continuous PreparingRebalance state.',
      rawLogs: `[WARN]  [ConsumerCoordinator] Heartbeat poll interval expired (32410ms > 30000ms), leaving group
[INFO]  [GroupCoordinator] Preparing rebalance for group order-fulfillment-group with 24 members
[ERROR] [OrderWorker] CommitFailedException: Offset commit cannot be completed`,
    },
  ];

  const handleRunDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const incidentToDiagnose: Incident = {
      id: `INC-TMP-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      severity,
      status: 'INVESTIGATING',
      createdAt: new Date().toISOString(),
      services: services.split(',').map(s => s.trim()).filter(Boolean),
      trigger: 'Manual diagnostic triage',
      rootCause: '',
      symptoms: symptoms.trim(),
      rawLogs: rawLogs.trim(),
      metrics: {
        errorRatePct: 42.5,
        p99LatencyMs: 22000,
        throughputRps: 140,
        cpuPct: 94,
      },
      resolutionSummary: '',
      effectiveRunbookIds: [],
      pitfallsToAvoid: [],
      mttrMinutes: 0,
      timeline: [],
    };

    try {
      const res = await apiDiagnoseIncident(incidentToDiagnose, pastIncidents, runbooks);
      setDiagnosis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromote = () => {
    if (!diagnosis) return;
    const promotedIncident: Incident = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title.trim(),
      severity,
      status: 'INVESTIGATING',
      createdAt: new Date().toISOString(),
      services: services.split(',').map(s => s.trim()).filter(Boolean),
      trigger: 'Promoted from Diagnostic Studio',
      rootCause: diagnosis.primaryHypothesis,
      symptoms: symptoms.trim(),
      rawLogs: rawLogs.trim(),
      metrics: {
        errorRatePct: 45.0,
        p99LatencyMs: 24000,
        throughputRps: 120,
        cpuPct: 92,
      },
      resolutionSummary: 'Active triage ongoing.',
      effectiveRunbookIds: diagnosis.suggestedRunbookId ? [diagnosis.suggestedRunbookId] : ['RB-CONN-POOL-RECOVER'],
      pitfallsToAvoid: diagnosis.postMortemWarnings || [],
      mttrMinutes: 0,
      commander: 'Incident Commander',
      timeline: [
        {
          id: `tl-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'Incident Response Agent',
          message: `Incident diagnosed with ${diagnosis.confidenceScore}% confidence against historical memory. Hypothesis: ${diagnosis.primaryHypothesis}`,
          type: 'AGENT',
        },
      ],
    };

    onPromoteToWarRoom(promotedIncident);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const matchedPastIncident = pastIncidents.find(
    p => p.id === diagnosis?.topMatchingIncidentId
  ) || pastIncidents[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Incident Diagnoser & Memory Matcher
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          Paste error logs, stack traces, or anomalous metrics. The agent cross-references your inputs against historical post-mortems and suggests immediate fixes.
        </p>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 pt-2 overflow-x-auto text-xs">
          <span className="text-slate-500 font-mono shrink-0">Sample Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setTitle(p.title);
                setSeverity(p.severity);
                setServices(p.services);
                setSymptoms(p.symptoms);
                setRawLogs(p.rawLogs);
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-xs transition-colors shrink-0"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleRunDiagnosis}
            className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-xs"
          >
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Incident Title / Summary</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                >
                  <option value="SEV-1">SEV-1 (Critical)</option>
                  <option value="SEV-2">SEV-2 (Major)</option>
                  <option value="SEV-3">SEV-3 (Minor)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Impacted Services</label>
                <input
                  type="text"
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Symptoms & Observed Impact</label>
              <textarea
                rows={2}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Raw Logs / Stack Traces / Alerts</label>
              <textarea
                rows={6}
                value={rawLogs}
                onChange={(e) => setRawLogs(e.target.value)}
                className="w-full bg-slate-950 font-mono text-[11px] text-rose-300/90 border border-slate-800 rounded-lg p-3 focus:outline-none focus:border-amber-500/60 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Brain className="w-4 h-4" />
              <span>{isLoading ? 'Scanning Historical Memory...' : 'Diagnose & Match with Past Incidents'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: AI Memory Recall Report (7 cols) */}
        <div className="lg:col-span-7">
          {isLoading ? (
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-3">
              <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
              <div className="text-sm font-semibold text-slate-200">
                Agent Cross-Referencing Knowledge Vault
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Evaluating token similarity, error signatures, service graph dependencies, and proven runbook efficacy...
              </p>
            </div>
          ) : diagnosis ? (
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      MEMORY MATCH REPORT
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {diagnosis.confidenceScore}% Confidence
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-100 mt-1">
                    {diagnosis.primaryHypothesis}
                  </h2>
                </div>

                <button
                  onClick={handlePromote}
                  className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Flame className="w-4 h-4" />
                  <span>Promote to War Room</span>
                </button>
              </div>

              {/* Recalled Incident Card */}
              {matchedPastIncident && (
                <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs text-amber-400 font-semibold">
                    <span>Recalled Incident: {matchedPastIncident.id} ({matchedPastIncident.title})</span>
                    <span>MTTR: {matchedPastIncident.mttrMinutes}m</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {diagnosis.similarityReasoning}
                  </p>
                </div>
              )}

              {/* Crucial Post-Mortem Warnings */}
              {diagnosis.postMortemWarnings && diagnosis.postMortemWarnings.length > 0 && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Post-Mortem Lessons & Caveats (What NOT To Do)</span>
                  </div>
                  <ul className="space-y-1 text-rose-200">
                    {diagnosis.postMortemWarnings.map((warn, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold shrink-0">✕</span>
                        <span>{warn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Remediation Steps */}
              {diagnosis.customRemediationSteps && diagnosis.customRemediationSteps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold uppercase tracking-wider text-slate-400 font-mono text-[11px]">
                    Proven Remediation Steps
                  </h3>
                  <div className="space-y-2">
                    {diagnosis.customRemediationSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">
                            {idx + 1}. {step.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Proven in {step.provenInIncident}
                          </span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-amber-300 text-[11px] flex items-center justify-between gap-2">
                          <span className="truncate">$ {step.command}</span>
                          <button
                            onClick={() => copyToClipboard(step.command)}
                            className="text-slate-400 hover:text-slate-200 shrink-0"
                          >
                            {copiedCmd === step.command ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Expected result: {step.expectedResult}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs font-mono space-y-2">
              <Brain className="w-8 h-8 text-slate-600 mx-auto" />
              <div>Fill out the incident symptoms on the left and run diagnosis.</div>
              <p className="text-slate-600 max-w-sm mx-auto">
                The agent will retrieve matching historical incidents, root cause hypotheses, and verified runbooks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
