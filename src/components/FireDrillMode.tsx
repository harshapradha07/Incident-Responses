import React, { useState } from 'react';
import { 
  Target, 
  Flame, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Clock, 
  Brain,
  ShieldCheck
} from 'lucide-react';
import { Incident, FireDrillScenario } from '../types/incident';
import { FIRE_DRILL_SCENARIOS } from '../data/incidentMemory';

interface FireDrillModeProps {
  onInjectDrill: (drillIncident: Incident) => void;
  onNavigateToWarRoom: () => void;
}

export const FireDrillMode: React.FC<FireDrillModeProps> = ({
  onInjectDrill,
  onNavigateToWarRoom,
}) => {
  const [selectedDrill, setSelectedDrill] = useState<FireDrillScenario>(FIRE_DRILL_SCENARIOS[0]);
  const [isInjecting, setIsInjecting] = useState(false);
  const [lastInjectedId, setLastInjectedId] = useState<string | null>(null);

  const handleLaunchDrill = () => {
    setIsInjecting(true);

    const drillIncident: Incident = {
      id: `DRILL-${Date.now().toString().slice(-4)}`,
      title: `[FIRE DRILL] ${selectedDrill.title}`,
      severity: selectedDrill.severity,
      status: 'INVESTIGATING',
      createdAt: new Date().toISOString(),
      services: selectedDrill.injectedServices,
      trigger: `Simulated Chaos Injection: ${selectedDrill.title}`,
      rootCause: 'Chaos fault injected. Awaiting agent memory recall & triage.',
      symptoms: selectedDrill.initialSymptoms,
      rawLogs: selectedDrill.rawLogs,
      metrics: selectedDrill.metrics,
      resolutionSummary: 'Fire drill in progress.',
      effectiveRunbookIds: [selectedDrill.expectedFixRunbookId],
      pitfallsToAvoid: [
        'Review past incident post-mortems before taking destructive actions in staging/production.',
      ],
      mttrMinutes: 0,
      commander: 'Fire Drill SRE Operator',
      timeline: [
        {
          id: `tl-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'Chaos Injector',
          message: `Injected simulated production failure: ${selectedDrill.title}`,
          type: 'ALERT',
        },
      ],
    };

    setTimeout(() => {
      onInjectDrill(drillIncident);
      setIsInjecting(false);
      setLastInjectedId(drillIncident.id);
      onNavigateToWarRoom();
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Production Fire Drill Simulator
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          Simulate realistic production failures. Test how fast the Incident Response Agent recalls the exact past incident and guides the team to recovery.
        </p>
      </div>

      {/* Drill Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {FIRE_DRILL_SCENARIOS.map((drill) => {
          const isSelected = selectedDrill.id === drill.id;
          return (
            <div
              key={drill.id}
              onClick={() => setSelectedDrill(drill)}
              className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-[#111726] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={isSelected ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                    {drill.id}
                  </span>
                  <span className={drill.severity === 'SEV-1' ? 'text-rose-400 font-bold' : 'text-amber-300'}>
                    {drill.severity}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100">
                  {drill.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {drill.scenarioDescription}
                </p>

                <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Target Services:</span>
                    <span className="font-mono text-slate-300 text-[11px]">
                      {drill.injectedServices.join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Expected Recall:</span>
                    <span className="font-mono text-amber-300 text-[11px]">
                      {drill.expectedMatchingIncidentId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">
                  Error: {drill.metrics.errorRatePct}% · p99: {drill.metrics.p99LatencyMs}ms
                </span>
                <span className={`text-xs font-semibold ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                  {isSelected ? 'Selected' : 'Select'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drill Launch Confirmation Area */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-semibold">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>READY TO INJECT: {selectedDrill.title}</span>
          </div>
          <p className="text-xs text-slate-300">
            This will switch your Active War Room to the simulated outage. You can execute runbook steps and observe the agent's memory recall live.
          </p>
        </div>

        <button
          onClick={handleLaunchDrill}
          disabled={isInjecting}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 justify-center"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isInjecting ? 'Injecting Outage...' : 'Launch Fire Drill into War Room'}</span>
        </button>
      </div>
    </div>
  );
};
