/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { WarRoom } from './components/WarRoom';
import { MemoryVault } from './components/MemoryVault';
import { RunbookHub } from './components/RunbookHub';
import { IncidentDiagnoser } from './components/IncidentDiagnoser';
import { PostMortemLearner } from './components/PostMortemLearner';
import { FireDrillMode } from './components/FireDrillMode';
import { N8nChatWidget } from './components/N8nChatWidget';
import { Incident, Runbook } from './types/incident';
import { 
  getActiveIncident, 
  saveActiveIncident, 
  getPastIncidents, 
  savePastIncidents, 
  getRunbooks, 
  saveRunbooks, 
  resetToDefaults,
  apiCheckHealth 
} from './utils/incidentStorage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'war-room' | 'memory-vault' | 'runbooks' | 'diagnose' | 'post-mortem' | 'fire-drill'>('war-room');
  
  const [activeIncident, setActiveIncident] = useState<Incident>(getActiveIncident);
  const [pastIncidents, setPastIncidents] = useState<Incident[]>(getPastIncidents);
  const [runbooks, setRunbooks] = useState<Runbook[]>(getRunbooks);

  const [selectedIncidentIdForVault, setSelectedIncidentIdForVault] = useState<string | undefined>();
  const [selectedRunbookIdForHub, setSelectedRunbookIdForHub] = useState<string | undefined>();
  const [aiAvailable, setAiAvailable] = useState<boolean>(true);
  const [isN8nChatOpen, setIsN8nChatOpen] = useState<boolean>(false);

  // Check health and server AI availability
  useEffect(() => {
    async function check() {
      const health = await apiCheckHealth();
      setAiAvailable(health.aiAvailable);
    }
    check();
  }, []);

  // Update handlers with persistence
  const handleUpdateActiveIncident = (incident: Incident) => {
    setActiveIncident(incident);
    saveActiveIncident(incident);
  };

  const handleAddPastIncident = (newIncident: Incident) => {
    const updated = [newIncident, ...pastIncidents];
    setPastIncidents(updated);
    savePastIncidents(updated);
  };

  const handleAddRunbook = (newRunbook: Runbook) => {
    const updated = [newRunbook, ...runbooks];
    setRunbooks(updated);
    saveRunbooks(updated);
  };

  const handleSaveLearnedIncident = (incident: Incident, runbook?: Runbook) => {
    handleAddPastIncident(incident);
    if (runbook) {
      handleAddRunbook(runbook);
    }
  };

  const handleResetData = () => {
    if (confirm('Reset incident memory, active incident, and runbooks back to initial production defaults?')) {
      const { activeIncident: a, pastIncidents: p, runbooks: r } = resetToDefaults();
      setActiveIncident(a);
      setPastIncidents(p);
      setRunbooks(r);
      setActiveTab('war-room');
    }
  };

  const handleNavigateToMemoryVault = (incidentId?: string) => {
    setSelectedIncidentIdForVault(incidentId);
    setActiveTab('memory-vault');
  };

  const handleNavigateToRunbooks = (runbookId?: string) => {
    setSelectedRunbookIdForHub(runbookId);
    setActiveTab('runbooks');
  };

  const handlePromoteToWarRoom = (promotedIncident: Incident) => {
    setActiveIncident(promotedIncident);
    saveActiveIncident(promotedIncident);
    setActiveTab('war-room');
  };

  const handleInjectDrill = (drillIncident: Incident) => {
    setActiveIncident(drillIncident);
    saveActiveIncident(drillIncident);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeIncident={activeIncident}
        aiAvailable={aiAvailable}
        onResetData={handleResetData}
        onOpenN8nChat={() => setIsN8nChatOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'war-room' && (
          <WarRoom
            activeIncident={activeIncident}
            onUpdateActiveIncident={handleUpdateActiveIncident}
            pastIncidents={pastIncidents}
            runbooks={runbooks}
            onNavigateToMemoryVault={handleNavigateToMemoryVault}
            onNavigateToRunbooks={handleNavigateToRunbooks}
            onOpenN8nChat={() => setIsN8nChatOpen(true)}
          />
        )}

        {activeTab === 'memory-vault' && (
          <MemoryVault
            pastIncidents={pastIncidents}
            onAddIncident={handleAddPastIncident}
            selectedIncidentId={selectedIncidentIdForVault}
            onClearSelectedIncident={() => setSelectedIncidentIdForVault(undefined)}
            onNavigateToRunbooks={handleNavigateToRunbooks}
          />
        )}

        {activeTab === 'runbooks' && (
          <RunbookHub
            runbooks={runbooks}
            onAddRunbook={handleAddRunbook}
            selectedRunbookId={selectedRunbookIdForHub}
            onClearSelectedRunbook={() => setSelectedRunbookIdForHub(undefined)}
          />
        )}

        {activeTab === 'diagnose' && (
          <IncidentDiagnoser
            pastIncidents={pastIncidents}
            runbooks={runbooks}
            onPromoteToWarRoom={handlePromoteToWarRoom}
          />
        )}

        {activeTab === 'post-mortem' && (
          <PostMortemLearner
            onSaveLearnedIncident={handleSaveLearnedIncident}
            onNavigateToMemoryVault={handleNavigateToMemoryVault}
          />
        )}

        {activeTab === 'fire-drill' && (
          <FireDrillMode
            onInjectDrill={handleInjectDrill}
            onNavigateToWarRoom={() => setActiveTab('war-room')}
          />
        )}
      </main>

      <footer className="border-t border-slate-800/60 py-4 mt-auto bg-[#080c14] text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Incident Response Agent</span>
            <span aria-hidden="true">·</span>
            <span>Autonomous SRE Production Recovery</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            Connected to n8n Webhook Chat · Grounded in Historical Runbooks
          </div>
        </div>
      </footer>

      {/* Floating n8n Incident Chatbot */}
      <N8nChatWidget
        activeIncident={activeIncident}
        isOpen={isN8nChatOpen}
        onToggleOpen={() => setIsN8nChatOpen(!isN8nChatOpen)}
      />
    </div>
  );
}
