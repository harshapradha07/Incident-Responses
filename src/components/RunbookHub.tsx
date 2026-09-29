import React, { useState } from 'react';
import { 
  BookOpen, 
  Terminal, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RotateCcw, 
  Plus, 
  Copy, 
  Check, 
  ShieldCheck,
  Search
} from 'lucide-react';
import { Runbook, RunbookStep } from '../types/incident';

interface RunbookHubProps {
  runbooks: Runbook[];
  onAddRunbook: (runbook: Runbook) => void;
  selectedRunbookId?: string;
  onClearSelectedRunbook?: () => void;
}

export const RunbookHub: React.FC<RunbookHubProps> = ({
  runbooks,
  onAddRunbook,
  selectedRunbookId,
}) => {
  const [selectedRunbook, setSelectedRunbook] = useState<Runbook>(() => {
    if (selectedRunbookId) {
      return runbooks.find(r => r.id === selectedRunbookId) || runbooks[0];
    }
    return runbooks[0];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [simulatedLogs, setSimulatedLogs] = useState<{ [stepId: string]: string }>({});
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New runbook form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Database & Storage');
  const [newDesc, setNewDesc] = useState('');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepCmd, setNewStepCmd] = useState('');

  const filteredRunbooks = runbooks.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSimulateStep = (step: RunbookStep) => {
    setRunningStepId(step.id);
    const initial = `$ ${step.command}\n[SIMULATION] Executing in staging canary cluster...\n`;
    setSimulatedLogs(prev => ({ ...prev, [step.id]: initial }));

    setTimeout(() => {
      const output = initial + `[STDOUT] Target pods inspected.\n[VERIFY] ${step.expectedResult}\n[STATUS] Exit Code 0 (Success). Safety checks passed.`;
      setSimulatedLogs(prev => ({ ...prev, [step.id]: output }));
      setRunningStepId(null);
    }, 900);
  };

  const handleCreateRunbook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStepCmd.trim()) return;

    const runbook: Runbook = {
      id: `RB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      title: newTitle.trim(),
      category: newCategory,
      description: newDesc.trim() || 'Executable runbook synthesized from incident recovery lessons.',
      successRate: 100,
      estimatedTimeMin: 5,
      verifiedInIncidents: ['CUSTOM'],
      riskLevel: 'LOW',
      author: 'Incident Commander',
      steps: [
        {
          id: `step-${Date.now()}-1`,
          title: newStepTitle.trim() || 'Execute Mitigation Command',
          command: newStepCmd.trim(),
          description: 'Primary recovery action step.',
          expectedResult: 'Command exits with code 0 without service interruption.',
          riskLevel: 'LOW',
        },
      ],
    };

    onAddRunbook(runbook);
    setSelectedRunbook(runbook);
    setShowCreateModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewStepTitle('');
    setNewStepCmd('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Battle-Tested Runbooks
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Proven execution workflows linked to historical incidents. Simulates commands with verification gates.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Runbook</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Runbook Selector & Search (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search runbooks by category or keyword..."
              className="w-full bg-[#111726] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="space-y-2">
            {filteredRunbooks.map((rb) => {
              const isSelected = selectedRunbook?.id === rb.id;
              return (
                <div
                  key={rb.id}
                  onClick={() => setSelectedRunbook(rb)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                      : 'bg-[#111726] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className={isSelected ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {rb.id}
                    </span>
                    <span className="text-emerald-400">
                      {rb.successRate}% Success
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {rb.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{rb.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>~{rb.estimatedTimeMin}m</span>
                    <span aria-hidden="true">·</span>
                    <span>{rb.steps.length} steps</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Runbook Details & Interactive Step Simulator (8 cols) */}
        <div className="lg:col-span-8">
          {selectedRunbook ? (
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
              <div className="border-b border-slate-800 pb-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-amber-400 font-bold">{selectedRunbook.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedRunbook.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">{selectedRunbook.successRate}% Success Rate</span>
                  <span aria-hidden="true">·</span>
                  <span>Est. Duration: ~{selectedRunbook.estimatedTimeMin} mins</span>
                </div>
                <h2 className="text-base font-bold text-slate-100">
                  {selectedRunbook.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedRunbook.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                  <span>Verified in Incidents:</span>
                  <div className="flex items-center gap-1.5 font-mono text-amber-300">
                    {selectedRunbook.verifiedInIncidents.map(incId => (
                      <span key={incId} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {incId}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Execution Procedure ({selectedRunbook.steps.length} Steps)
                </h3>

                {selectedRunbook.steps.map((step, idx) => {
                  const isRunning = runningStepId === step.id;
                  const log = simulatedLogs[step.id];

                  return (
                    <div
                      key={step.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-300">
                            {idx + 1}
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

                        <div className="flex items-center gap-2 shrink-0">
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
                            onClick={() => handleSimulateStep(step)}
                            disabled={isRunning}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-all flex items-center gap-1.5"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{isRunning ? 'Testing...' : 'Test Run'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Command box */}
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs font-mono flex items-center justify-between gap-2">
                        <span className="text-amber-300/90 truncate">
                          $ {step.command}
                        </span>
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

                      {/* Verification criteria */}
                      <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Expected verification: {step.expectedResult}</span>
                      </div>

                      {/* Simulation output */}
                      {log && (
                        <div className="p-2.5 bg-black/90 border border-slate-800 rounded font-mono text-[11px] text-emerald-300 whitespace-pre-wrap">
                          {log}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs font-mono">
              Select a runbook from the left to view details and test steps.
            </div>
          )}
        </div>
      </div>

      {/* New Runbook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRunbook}
            className="bg-[#111726] border border-slate-800 rounded-xl w-full max-w-xl p-6 space-y-4 text-xs shadow-2xl"
          >
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Create New Runbook</span>
            </h2>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Runbook Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Istio Service Mesh Ingress Circuit Breaker Reset"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Category</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Description</label>
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Context on when this runbook applies..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Initial Step Title</label>
              <input
                type="text"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                placeholder="e.g. Patch Envoy Ingress Filter"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">CLI Command</label>
              <input
                type="text"
                required
                value={newStepCmd}
                onChange={(e) => setNewStepCmd(e.target.value)}
                placeholder="kubectl ..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md text-xs"
              >
                Create Runbook
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
