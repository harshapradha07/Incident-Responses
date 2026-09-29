import React, { useState } from 'react';
import { 
  Brain, 
  Search, 
  Clock, 
  ChevronRight, 
  AlertTriangle, 
  ShieldAlert, 
  BookOpen, 
  CheckCircle2, 
  X, 
  Plus, 
  Download,
  Filter
} from 'lucide-react';
import { Incident, Severity } from '../types/incident';

interface MemoryVaultProps {
  pastIncidents: Incident[];
  onAddIncident: (incident: Incident) => void;
  selectedIncidentId?: string;
  onClearSelectedIncident?: () => void;
  onNavigateToRunbooks: (runbookId?: string) => void;
}

export const MemoryVault: React.FC<MemoryVaultProps> = ({
  pastIncidents,
  onAddIncident,
  selectedIncidentId,
  onClearSelectedIncident,
  onNavigateToRunbooks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [inspectingIncident, setInspectingIncident] = useState<Incident | null>(() => {
    if (selectedIncidentId) {
      return pastIncidents.find(i => i.id === selectedIncidentId) || null;
    }
    return null;
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // New incident form state
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<Severity>('SEV-1');
  const [newServices, setNewServices] = useState('Payment-Gateway, PostgreSQL');
  const [newRootCause, setNewRootCause] = useState('');
  const [newResolution, setNewResolution] = useState('');
  const [newPitfalls, setNewPitfalls] = useState('');
  const [newMttr, setNewMttr] = useState(15);

  const filteredIncidents = pastIncidents.filter((inc) => {
    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
    const query = searchQuery.toLowerCase();
    const matchesQuery = 
      inc.id.toLowerCase().includes(query) ||
      inc.title.toLowerCase().includes(query) ||
      inc.rootCause.toLowerCase().includes(query) ||
      inc.services.some(s => s.toLowerCase().includes(query));
    return matchesSeverity && matchesQuery;
  });

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newRootCause.trim()) return;

    const incident: Incident = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newTitle.trim(),
      severity: newSeverity,
      status: 'RESOLVED',
      createdAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      services: newServices.split(',').map(s => s.trim()).filter(Boolean),
      trigger: 'Manual post-mortem ingestion',
      rootCause: newRootCause.trim(),
      symptoms: 'Observed latency anomalies and error rate spikes.',
      rawLogs: '[LOGS EXTRACTED FROM POST-MORTEM RECORD]',
      metrics: {
        errorRatePct: 0.01,
        p99LatencyMs: 140,
        throughputRps: 800,
        cpuPct: 35,
      },
      resolutionSummary: newResolution.trim() || 'Remediated via verified runbook sequence.',
      effectiveRunbookIds: ['RB-CONN-POOL-RECOVER'],
      pitfallsToAvoid: newPitfalls.split('\n').map(p => p.trim()).filter(Boolean),
      mttrMinutes: Number(newMttr) || 15,
      commander: 'SRE Incident Lead',
      timeline: [],
    };

    onAddIncident(incident);
    setShowAddModal(false);
    setNewTitle('');
    setNewRootCause('');
    setNewResolution('');
    setNewPitfalls('');
    setInspectingIncident(incident);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(pastIncidents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-memory-vault-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                Incident Memory Vault
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Historical memory bank of past production outages, verified root causes, 5-Whys, and post-mortem pitfalls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportJSON}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Vault</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Past Incident</span>
            </button>
          </div>
        </div>

        {/* Search bar & filter tabs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by symptom, service, root cause, or error keyword..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 border border-slate-800 rounded-lg text-xs font-mono">
            {(['ALL', 'SEV-1', 'SEV-2', 'SEV-3'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  severityFilter === sev
                    ? 'bg-slate-800 text-amber-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incidents List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIncidents.map((incident) => (
          <div
            key={incident.id}
            onClick={() => setInspectingIncident(incident)}
            className="bg-[#111726] border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition-all cursor-pointer space-y-3 group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-amber-400 font-bold">{incident.id}</span>
                  <span aria-hidden="true">·</span>
                  <span className={incident.severity === 'SEV-1' ? 'text-rose-400' : 'text-amber-300'}>
                    {incident.severity}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">MTTR: {incident.mttrMinutes}m</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                  {incident.title}
                </h3>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
            </div>

            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {incident.rootCause}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Services:</span>
                <span className="text-slate-300 font-mono text-[11px] truncate max-w-[200px]">
                  {incident.services.join(', ')}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {incident.pitfallsToAvoid?.length || 0} post-mortem warnings
              </span>
            </div>
          </div>
        ))}

        {filteredIncidents.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-500 text-xs font-mono">
            No historical incidents found matching your query.
          </div>
        )}
      </div>

      {/* Inspecting Modal / Drawer */}
      {inspectingIncident && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/60">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-amber-400 font-bold">{inspectingIncident.id}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-rose-400">{inspectingIncident.severity}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">MTTR: {inspectingIncident.mttrMinutes} minutes</span>
                  <span aria-hidden="true">·</span>
                  <span>Lead: {inspectingIncident.commander}</span>
                </div>
                <h2 className="text-base font-bold text-slate-100 mt-1">
                  {inspectingIncident.title}
                </h2>
              </div>
              <button
                onClick={() => setInspectingIncident(null)}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Root Cause */}
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-300">Isolate Root Cause</div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 leading-relaxed font-mono">
                  {inspectingIncident.rootCause}
                </div>
              </div>

              {/* 5-Whys if available */}
              {inspectingIncident.fiveWhys && inspectingIncident.fiveWhys.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-300">5-Whys Deep Analysis</div>
                  <div className="space-y-1.5 p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                    {inspectingIncident.fiveWhys.map((why, i) => (
                      <div key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="font-mono text-amber-400 font-bold shrink-0">{i + 1}.</span>
                        <span className="leading-relaxed">{why}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Critical Pitfalls to Avoid */}
              {inspectingIncident.pitfallsToAvoid && inspectingIncident.pitfallsToAvoid.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Post-Mortem Lessons & Pitfalls (What NOT To Do)</span>
                  </div>
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2">
                    {inspectingIncident.pitfallsToAvoid.map((pitfall, i) => (
                      <div key={i} className="flex items-start gap-2 text-rose-200">
                        <span className="text-rose-400 font-bold shrink-0">✕</span>
                        <span className="leading-relaxed">{pitfall}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Summary & Effective Runbooks */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-300">Resolution & Proven Runbooks</div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 leading-relaxed">
                  {inspectingIncident.resolutionSummary}
                </div>
                {inspectingIncident.effectiveRunbookIds && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-400">Effective Runbook:</span>
                    {inspectingIncident.effectiveRunbookIds.map(rbId => (
                      <button
                        key={rbId}
                        onClick={() => {
                          setInspectingIncident(null);
                          onNavigateToRunbooks(rbId);
                        }}
                        className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 rounded font-mono text-xs transition-colors flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>{rbId}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Raw Error Logs */}
              {inspectingIncident.rawLogs && (
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-300">Historical Error Telemetry</div>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-rose-300/80 overflow-x-auto whitespace-pre-wrap">
                    {inspectingIncident.rawLogs}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Incident Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateIncident}
            className="bg-[#111726] border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <span>Record Historical Incident to Memory</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Incident Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Redis Cluster OOM & Authentication Stampede"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as Severity)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                  >
                    <option value="SEV-1">SEV-1 (Critical Outage)</option>
                    <option value="SEV-2">SEV-2 (Major Degradation)</option>
                    <option value="SEV-3">SEV-3 (Minor / Redundant)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">MTTR (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={newMttr}
                    onChange={(e) => setNewMttr(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Impacted Services (comma separated)</label>
                <input
                  type="text"
                  value={newServices}
                  onChange={(e) => setNewServices(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Root Cause</label>
                <textarea
                  rows={2}
                  required
                  value={newRootCause}
                  onChange={(e) => setNewRootCause(e.target.value)}
                  placeholder="Detail the exact underlying fault, leak, timeout, or misconfiguration..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Post-Mortem Pitfalls & Lessons (one per line)</label>
                <textarea
                  rows={2}
                  value={newPitfalls}
                  onChange={(e) => setNewPitfalls(e.target.value)}
                  placeholder="e.g. DO NOT restart all pods at once; PG max_connections will be blown immediately."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Resolution Summary</label>
                <textarea
                  rows={2}
                  value={newResolution}
                  onChange={(e) => setNewResolution(e.target.value)}
                  placeholder="What commands or actions resolved the outage?"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md text-xs"
              >
                Save to Memory
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
