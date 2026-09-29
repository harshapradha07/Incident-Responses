import { Incident, Runbook, AIDiagnosisResult } from '../types/incident';
import { HISTORICAL_INCIDENTS, INITIAL_ACTIVE_INCIDENT, INITIAL_RUNBOOKS } from '../data/incidentMemory';

const STORAGE_KEYS = {
  ACTIVE_INCIDENT: 'ira_active_incident',
  PAST_INCIDENTS: 'ira_past_incidents',
  RUNBOOKS: 'ira_runbooks',
  DIAGNOSIS_CACHE: 'ira_diagnosis_cache',
};

export function getActiveIncident(): Incident {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_INCIDENT);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load active incident from storage:', e);
  }
  return INITIAL_ACTIVE_INCIDENT;
}

export function saveActiveIncident(incident: Incident): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_INCIDENT, JSON.stringify(incident));
  } catch (e) {
    console.error('Failed to save active incident:', e);
  }
}

export function getPastIncidents(): Incident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAST_INCIDENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load past incidents:', e);
  }
  return HISTORICAL_INCIDENTS;
}

export function savePastIncidents(incidents: Incident[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PAST_INCIDENTS, JSON.stringify(incidents));
  } catch (e) {
    console.error('Failed to save past incidents:', e);
  }
}

export function getRunbooks(): Runbook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RUNBOOKS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load runbooks:', e);
  }
  return INITIAL_RUNBOOKS;
}

export function saveRunbooks(runbooks: Runbook[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RUNBOOKS, JSON.stringify(runbooks));
  } catch (e) {
    console.error('Failed to save runbooks:', e);
  }
}

export function resetToDefaults(): { activeIncident: Incident; pastIncidents: Incident[]; runbooks: Runbook[] } {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_INCIDENT);
  localStorage.removeItem(STORAGE_KEYS.PAST_INCIDENTS);
  localStorage.removeItem(STORAGE_KEYS.RUNBOOKS);
  localStorage.removeItem(STORAGE_KEYS.DIAGNOSIS_CACHE);
  return {
    activeIncident: INITIAL_ACTIVE_INCIDENT,
    pastIncidents: HISTORICAL_INCIDENTS,
    runbooks: INITIAL_RUNBOOKS,
  };
}

// Client API calls to backend Express server
export async function apiDiagnoseIncident(
  currentIncident: Incident,
  pastIncidents: Incident[],
  runbooks: Runbook[]
): Promise<AIDiagnosisResult> {
  const res = await fetch('/api/diagnose-incident', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentIncident, pastIncidents, runbooks }),
  });
  if (!res.ok) {
    throw new Error(`Diagnosis API returned status ${res.status}`);
  }
  return await res.json();
}

export async function apiLearnPostMortem(documentText: string): Promise<any> {
  const res = await fetch('/api/learn-postmortem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentText }),
  });
  if (!res.ok) {
    throw new Error(`Post-Mortem API returned status ${res.status}`);
  }
  return await res.json();
}

export async function apiAskAgent(
  question: string,
  currentIncident: Incident,
  pastIncidents: Incident[]
): Promise<string> {
  const res = await fetch('/api/ask-incident-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, currentIncident, pastIncidents }),
  });
  if (!res.ok) {
    throw new Error(`Ask Agent API returned status ${res.status}`);
  }
  const data = await res.json();
  return data.answer || 'No response';
}

export const DEFAULT_N8N_WEBHOOK_URL = 'https://harshapradha.app.n8n.cloud/webhook/55430de3-a12a-419c-8317-aa1d8be07798/chat';

export async function apiN8nChat(
  message: string,
  sessionId?: string,
  webhookUrl?: string,
  incidentContext?: any
): Promise<{ success: boolean; reply: string; status?: number; error?: string }> {
  const res = await fetch('/api/n8n-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId,
      webhookUrl: webhookUrl || DEFAULT_N8N_WEBHOOK_URL,
      incidentContext,
    }),
  });
  return await res.json();
}


export async function apiCheckHealth(): Promise<{ status: string; aiAvailable: boolean }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return { status: 'down', aiAvailable: false };
    return await res.json();
  } catch (e) {
    return { status: 'error', aiAvailable: false };
  }
}
