export type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3';
export type IncidentStatus = 'INVESTIGATING' | 'IDENTIFIED' | 'MITIGATING' | 'RESOLVED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TimelineEvent {
  id: string;
  time: string;
  author: string;
  message: string;
  type: 'ALERT' | 'RUNBOOK' | 'AGENT' | 'NOTE' | 'STATUS_CHANGE';
}

export interface MetricSnapshot {
  errorRatePct: number;
  p99LatencyMs: number;
  throughputRps: number;
  cpuPct: number;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
  services: string[];
  trigger: string;
  rootCause: string;
  symptoms: string;
  rawLogs: string;
  metrics: MetricSnapshot;
  resolutionSummary: string;
  effectiveRunbookIds: string[];
  pitfallsToAvoid: string[];
  mttrMinutes: number;
  postMortemNotes?: string;
  fiveWhys?: string[];
  preventativeActions?: string[];
  commander?: string;
  timeline: TimelineEvent[];
}

export interface RunbookStep {
  id: string;
  title: string;
  command: string;
  description: string;
  expectedResult: string;
  riskLevel: RiskLevel;
  verificationCommand?: string;
  rollbackCommand?: string;
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  terminalOutput?: string;
}

export interface Runbook {
  id: string;
  title: string;
  category: string;
  description: string;
  successRate: number; // e.g. 96 (%)
  estimatedTimeMin: number;
  verifiedInIncidents: string[];
  riskLevel: RiskLevel;
  author: string;
  steps: RunbookStep[];
}

export interface RemediationStepSuggestion {
  step: number;
  title: string;
  command: string;
  expectedResult: string;
  riskLevel: RiskLevel;
  provenInIncident: string;
}

export interface AIDiagnosisResult {
  confidenceScore: number;
  primaryHypothesis: string;
  topMatchingIncidentId: string;
  similarityReasoning: string;
  suggestedRunbookId: string;
  customRemediationSteps: RemediationStepSuggestion[];
  postMortemWarnings: string[];
  estimatedTimeToRecovery: string;
  blastRadius: string;
}

export interface FireDrillScenario {
  id: string;
  title: string;
  severity: Severity;
  scenarioDescription: string;
  injectedServices: string[];
  rawLogs: string;
  initialSymptoms: string;
  metrics: MetricSnapshot;
  expectedMatchingIncidentId: string;
  expectedFixRunbookId: string;
}
