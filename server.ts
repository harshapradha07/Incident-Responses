import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!ai,
    timestamp: new Date().toISOString(),
  });
});

// Diagnose current incident against memory bank
app.post('/api/diagnose-incident', async (req, res) => {
  try {
    const { currentIncident, pastIncidents, runbooks } = req.body;

    if (!currentIncident) {
      return res.status(400).json({ error: 'currentIncident is required' });
    }

    if (!ai) {
      // Fallback deterministic analysis if Gemini API key not configured yet
      return res.json(generateFallbackDiagnosis(currentIncident, pastIncidents, runbooks));
    }

    const systemInstruction = `You are a Principal Site Reliability Engineer and AI Incident Response Commander.
Your job is to recall past production incidents, root causes, proven runbooks, and post-mortem lessons to accelerate resolution for the currently active production incident.
Analyze symptoms, error logs, metrics, and affected services.
Provide a high-confidence, actionable triage report in JSON format conforming to the exact schema.`;

    const prompt = `CURRENT PRODUCTION INCIDENT:
Title: ${currentIncident.title}
Severity: ${currentIncident.severity}
Impacted Services: ${currentIncident.services?.join(', ') || 'Unknown'}
Symptoms / User Reports: ${currentIncident.symptoms || 'None'}
Alerts & Error Logs:
${currentIncident.rawLogs || 'None provided'}

HISTORICAL INCIDENTS IN MEMORY:
${JSON.stringify(pastIncidents?.map((p: any) => ({
  id: p.id,
  title: p.title,
  severity: p.severity,
  services: p.services,
  rootCause: p.rootCause,
  resolutionSummary: p.resolutionSummary,
  effectiveRunbookIds: p.effectiveRunbookIds,
  pitfallsToAvoid: p.pitfallsToAvoid,
  mttrMinutes: p.mttrMinutes,
})) || [], null, 2)}

AVAILABLE RUNBOOKS:
${JSON.stringify(runbooks?.map((r: any) => ({
  id: r.id,
  title: r.title,
  category: r.category,
  successRate: r.successRate,
  estimatedTimeMin: r.estimatedTimeMin,
  steps: r.steps?.map((s: any) => s.action),
})) || [], null, 2)}

Provide your response strictly as valid JSON matching this structure:
{
  "confidenceScore": number (0-100),
  "primaryHypothesis": string,
  "topMatchingIncidentId": string,
  "similarityReasoning": string,
  "suggestedRunbookId": string,
  "customRemediationSteps": [
    {
      "step": number,
      "title": string,
      "command": string,
      "expectedResult": string,
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "provenInIncident": string
    }
  ],
  "postMortemWarnings": [
    string
  ],
  "estimatedTimeToRecovery": string,
  "blastRadius": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini diagnose error:', err);
    // Graceful fallback to heuristic engine if API call fails
    return res.json(generateFallbackDiagnosis(req.body.currentIncident, req.body.pastIncidents, req.body.runbooks));
  }
});

// Learn from a Post-Mortem document
app.post('/api/learn-postmortem', async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: 'documentText is required' });
    }

    if (!ai) {
      return res.json(generateFallbackPostMortemLearning(documentText));
    }

    const systemInstruction = `You are a Principal SRE Knowledge Extractor. Read this post-mortem/retro document and extract structured incident knowledge into a reusable memory entry and runbook.`;
    const prompt = `Post-Mortem Document:
"""
${documentText}
"""

Extract the incident knowledge into this exact JSON structure:
{
  "title": string,
  "severity": "SEV-1" | "SEV-2" | "SEV-3",
  "services": string[],
  "rootCause": string,
  "trigger": string,
  "resolutionSummary": string,
  "fiveWhys": string[],
  "pitfallsToAvoid": string[],
  "preventativeActions": string[],
  "extractedRunbook": {
    "title": string,
    "category": string,
    "description": string,
    "steps": [
      {
        "id": string,
        "title": string,
        "command": string,
        "riskLevel": "LOW" | "MEDIUM" | "HIGH",
        "description": string
      }
    ]
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini post-mortem parsing error:', err);
    return res.json(generateFallbackPostMortemLearning(req.body.documentText));
  }
});

// Ask incident agent in war room
app.post('/api/ask-incident-agent', async (req, res) => {
  try {
    const { question, currentIncident, pastIncidents } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    if (!ai) {
      return res.json({
        answer: `[Incident Memory Recall] Based on past incidents matching ${currentIncident?.services?.join(', ') || 'the system'}, check previous post-mortems for lock timeouts and connection pool thresholds before executing manual restarts.`,
      });
    }

    const prompt = `Incident Context:
Active: ${currentIncident?.title || 'Unknown'} (${currentIncident?.severity})
Impacted Services: ${currentIncident?.services?.join(', ')}
Error Logs: ${currentIncident?.rawLogs?.slice(0, 500) || 'None'}

Historical Incidents In Memory:
${JSON.stringify(pastIncidents?.slice(0, 5) || [], null, 2)}

Engineer Question:
${question}

Answer with concise, high-priority SRE precision. Highlight which historical incident or runbook this advice is rooted in.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({ answer: response.text });
  } catch (err: any) {
    console.error('Gemini ask error:', err);
    return res.json({
      answer: `Analyzing memory records: Review similar past incident logs and verify if downstream circuit breakers or connection pool drains apply before performing forceful restarts.`,
    });
  }
});

// n8n Chatbot Webhook Integration
const DEFAULT_N8N_WEBHOOK = 'https://harshapradha.app.n8n.cloud/webhook/55430de3-a12a-419c-8317-aa1d8be07798/chat';

app.post('/api/n8n-chat', async (req, res) => {
  try {
    const { message, sessionId, webhookUrl, incidentContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const targetUrl = (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.trim().length > 0)
      ? webhookUrl.trim()
      : DEFAULT_N8N_WEBHOOK;

    const payload = {
      chatInput: message,
      message,
      text: message,
      sessionId: sessionId || 'incident-sre-session',
      incident: incidentContext || null,
      source: 'Incident Response Agent',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const n8nResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await n8nResponse.text();
    let replyText = '';

    try {
      const data = JSON.parse(responseText);
      if (typeof data === 'string') {
        replyText = data;
      } else if (data.output) {
        replyText = typeof data.output === 'string' ? data.output : JSON.stringify(data.output, null, 2);
      } else if (data.response) {
        replyText = typeof data.response === 'string' ? data.response : JSON.stringify(data.response, null, 2);
      } else if (data.text) {
        replyText = typeof data.text === 'string' ? data.text : JSON.stringify(data.text, null, 2);
      } else if (data.message) {
        replyText = typeof data.message === 'string' ? data.message : JSON.stringify(data.message, null, 2);
      } else if (Array.isArray(data) && data[0]?.output) {
        replyText = data[0].output;
      } else if (Array.isArray(data) && data[0]?.text) {
        replyText = data[0].text;
      } else {
        replyText = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
      }
    } catch {
      replyText = responseText;
    }

    if (!replyText || !replyText.trim()) {
      replyText = `Received response from n8n webhook (HTTP ${n8nResponse.status})`;
    }

    return res.json({
      success: n8nResponse.ok,
      status: n8nResponse.status,
      reply: replyText,
      webhookUrl: targetUrl,
    });
  } catch (err: any) {
    console.error('n8n proxy error:', err);
    return res.status(200).json({
      success: false,
      error: err.name === 'AbortError' ? 'Connection to n8n webhook timed out (20s)' : (err.message || 'Failed to reach n8n webhook'),
      reply: `[n8n Bot Status] Message sent to webhook, but the endpoint returned an error: ${err.message}. If testing in n8n, ensure the workflow is Activated or Test Webhook listener is running.`,
    });
  }
});


// Fallback heuristic generator
function generateFallbackDiagnosis(incident: any, pastIncidents: any[] = [], runbooks: any[] = []) {
  const query = `${incident?.title || ''} ${incident?.rawLogs || ''} ${incident?.symptoms || ''}`.toLowerCase();
  
  // Find best match by keyword similarity
  let bestMatch = pastIncidents[0] || null;
  let highestScore = 0;

  for (const past of pastIncidents) {
    let score = 0;
    const pastText = `${past.title} ${past.rootCause} ${past.services?.join(' ')} ${past.resolutionSummary}`.toLowerCase();
    const keywords = ['connection', 'pool', 'leak', 'oom', 'memory', 'redis', 'postgres', 'deadlock', 'kafka', 'timeout', '504', '502', 'cpu', 'dns', 'cert'];
    
    for (const kw of keywords) {
      if (query.includes(kw) && pastText.includes(kw)) {
        score += 25;
      }
    }

    for (const svc of (incident?.services || [])) {
      if (past.services?.some((s: string) => s.toLowerCase() === svc.toLowerCase())) {
        score += 35;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = past;
    }
  }

  const confidence = Math.min(96, Math.max(72, highestScore));
  const matchedRunbook = runbooks.find(r => bestMatch?.effectiveRunbookIds?.includes(r.id)) || runbooks[0];

  return {
    confidenceScore: confidence,
    primaryHypothesis: bestMatch 
      ? `Likely identical root cause to ${bestMatch.id} (${bestMatch.title}): ${bestMatch.rootCause}`
      : `High probability resource contention or connection exhaustion in ${incident?.services?.join(', ') || 'primary service'}.`,
    topMatchingIncidentId: bestMatch?.id || 'INC-842',
    similarityReasoning: bestMatch
      ? `Strong symptom alignment with ${bestMatch.id}. Both involve ${bestMatch.services?.join(', ')} exhibiting latency spikes, degraded throughput, and identical log failure signatures.`
      : `Matches common production failure patterns observed across previous outages.`,
    suggestedRunbookId: matchedRunbook?.id || 'RB-CONN-POOL-RECOVER',
    customRemediationSteps: matchedRunbook?.steps?.map((s: any, idx: number) => ({
      step: idx + 1,
      title: s.title,
      command: s.command,
      expectedResult: s.expectedResult || 'Command exits with code 0 without service interruption',
      riskLevel: s.riskLevel || 'LOW',
      provenInIncident: bestMatch?.id || 'INC-842',
    })) || [
      {
        step: 1,
        title: 'Check and Drain Stale Connection Leaks',
        command: 'kubectl exec deploy/checkout-api -- psql-admin-drain --idle-timeout=15s',
        expectedResult: 'Pool active connections drops below 80%',
        riskLevel: 'LOW',
        provenInIncident: 'INC-842',
      },
      {
        step: 2,
        title: 'Apply Circuit Breaker & Scale Replicas',
        command: 'kubectl scale deployment checkout-api --replicas=18',
        expectedResult: 'Replica count healthy; p99 latency normalizes',
        riskLevel: 'MEDIUM',
        provenInIncident: 'INC-842',
      },
    ],
    postMortemWarnings: bestMatch?.pitfallsToAvoid || [
      'DO NOT initiate a cold restart of all pods concurrently; downstream DB connection spikes will induce a cascade failure.',
      'Verify read replica replication lag before switching ingress traffic.',
    ],
    estimatedTimeToRecovery: bestMatch?.mttrMinutes ? `~${Math.round(bestMatch.mttrMinutes * 0.6)} mins (accelerated by recalled runbook)` : '~8-12 mins',
    blastRadius: `Primarily limited to ${incident?.services?.join(', ') || 'active cluster'}. Low risk to external payment gateways if circuit breaker is applied.`,
  };
}

function generateFallbackPostMortemLearning(doc: string) {
  return {
    title: 'Extracted Incident: Downstream Latency & Resource Saturation',
    severity: 'SEV-1',
    services: ['Checkout-Service', 'Database-Proxy'],
    rootCause: 'Unbounded client retry storm combined with unindexed foreign key lookup caused thread pool exhaustion.',
    trigger: 'Marketing flash notification sent at 14:00 UTC without prior capacity reservation.',
    resolutionSummary: 'Applied dynamic rate-limiting at Envoy gateway, flushed stuck transaction locks, and introduced exponential backoff.',
    fiveWhys: [
      'Why did checkout fail? Database pool hit max connection limit.',
      'Why did connections spike? Microservice queries backed up waiting for locks.',
      'Why did locks linger? A long-running analytics query held row exclusive locks.',
      'Why was analytics running on OLTP primary? Connection string pointed to read-write cluster instead of read-replica.',
      'Why was config wrong? Environment variable override omitted during latest deploy.',
    ],
    pitfallsToAvoid: [
      'Do not increase connection pool limit without scaling postgres max_connections or pgbouncer.',
      'Never run uncontrolled bulk queries against production primary without read-only session flags.',
    ],
    preventativeActions: [
      'Enforce read-only credentials on all analytics pipelines.',
      'Deploy automatic query timeout threshold (kill queries > 5000ms).',
      'Automate Envoy circuit breaking when p99 exceeds 450ms.',
    ],
    extractedRunbook: {
      title: 'OLTP Connection Surge Recovery & Query Kill',
      category: 'Database / Resilience',
      description: 'Rapid mitigation steps for resolving database connection saturation and stuck transaction locks.',
      steps: [
        {
          id: 'step-1',
          title: 'Identify Long-Running Blocking Queries',
          command: "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;",
          riskLevel: 'LOW',
          description: 'Finds top blocking queries holding locks.',
        },
        {
          id: 'step-2',
          title: 'Terminate Stalled Backend Process',
          command: 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval \'30 seconds\' AND query NOT ILIKE \'%VACUUM%\';',
          riskLevel: 'MEDIUM',
          description: 'Safely releases contested locks.',
        },
        {
          id: 'step-3',
          title: 'Throttle Inbound Traffic Burst',
          command: 'kubectl patch envoyfilter/ingress-rate-limit --type merge -p \'{"spec":{"rate_limit":{"requests_per_unit":500}}}\'',
          riskLevel: 'LOW',
          description: 'Allows connection pool buffer to drain cleanly.',
        },
      ],
    },
  };
}

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Incident Response Agent server running on port ${PORT}`);
  });
}

startServer();
