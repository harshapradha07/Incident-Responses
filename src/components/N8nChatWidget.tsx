import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Settings, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  ChevronDown, 
  Maximize2, 
  Minimize2,
  AlertCircle
} from 'lucide-react';
import { Incident } from '../types/incident';
import { apiN8nChat, DEFAULT_N8N_WEBHOOK_URL } from '../utils/incidentStorage';

interface ChatMessage {
  id: string;
  sender: 'user' | 'n8n-bot' | 'system';
  text: string;
  time: string;
  isError?: boolean;
}

interface N8nChatWidgetProps {
  activeIncident: Incident;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const N8nChatWidget: React.FC<N8nChatWidgetProps> = ({
  activeIncident,
  isOpen,
  onToggleOpen,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem('ira_n8n_webhook') || DEFAULT_N8N_WEBHOOK_URL;
  });
  const [showConfig, setShowConfig] = useState(false);
  const [sessionId] = useState(() => `sre-${Date.now().toString(36)}`);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'n8n-bot',
      text: `Hello! I am your SRE Chatbot connected via n8n.\n\nEndpoint:\n\`${DEFAULT_N8N_WEBHOOK_URL}\`\n\nI can analyze active incident ${activeIncident.id} (${activeIncident.severity}), check memory records, or run custom automated workflows. How can I assist?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSaveWebhook = (newUrl: string) => {
    setWebhookUrl(newUrl);
    localStorage.setItem('ira_n8n_webhook', newUrl);
    setShowConfig(false);
    setMessages(prev => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Webhook endpoint updated to: ${newUrl}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim();
    if (!message || isLoading) return;

    setInputMessage('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: message,
      time: now,
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await apiN8nChat(
        message,
        sessionId,
        webhookUrl,
        {
          id: activeIncident.id,
          title: activeIncident.title,
          severity: activeIncident.severity,
          services: activeIncident.services,
          symptoms: activeIncident.symptoms,
          errorRate: activeIncident.metrics.errorRatePct,
          p99Latency: activeIncident.metrics.p99LatencyMs,
        }
      );

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'n8n-bot',
        text: response.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: !response.success,
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'n8n-bot',
        text: `Failed to connect to n8n webhook: ${err.message || 'Unknown network error'}. Please verify your n8n workflow is activated and accessible.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: '🚨 Analyze Active Incident', text: `Please analyze active incident ${activeIncident.id}: ${activeIncident.title} on ${activeIncident.services.join(', ')}. What is the immediate recommended action?` },
    { label: '💡 Recommend Runbook', text: `Which runbook should we execute to fix the ${activeIncident.services[0] || 'active service'} connection pool saturation?` },
    { label: '⚠️ Post-Mortem Pitfalls', text: `What critical mistakes must we avoid based on historical post-mortems for this failure?` },
    { label: '🔍 Query DB Locks', text: 'How do we check for long-running idle transactions blocking the primary database connection pool?' },
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={onToggleOpen}
        className={`fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-200 border ${
          isOpen
            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950 font-bold hover:scale-105 ring-4 ring-amber-500/20'
        }`}
        title="Open n8n Incident Chatbot"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <MessageSquare className="w-4 h-4 fill-current" />
        <span className="text-xs tracking-tight">n8n Chatbot</span>
      </button>

      {/* Slide-over Chat Drawer / Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 flex flex-col bg-[#0f1626] border border-slate-800 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? 'inset-4 sm:inset-10'
              : 'bottom-20 right-4 sm:right-6 w-[94vw] sm:w-[460px] h-[600px] max-h-[82vh]'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 bg-[#131c30] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-100 truncate">
                    n8n Incident Chatbot
                  </h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  harshapradha.app.n8n.cloud
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`p-1.5 rounded-md transition-colors ${
                  showConfig ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Configure Webhook URL"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors hidden sm:inline-flex"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onToggleOpen}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Webhook Configuration Bar */}
          {showConfig && (
            <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs space-y-2 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span>Active n8n Webhook Endpoint</span>
                <button
                  onClick={() => handleSaveWebhook(DEFAULT_N8N_WEBHOOK_URL)}
                  className="text-amber-400 hover:underline text-[11px]"
                >
                  Reset Default
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-amber-500/60"
                />
                <button
                  onClick={() => handleSaveWebhook(webhookUrl)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors shrink-0"
                >
                  Save
                </button>
              </div>
              <div className="text-[10px] text-slate-400">
                Connected to: <span className="font-mono text-slate-300">harshapradha.app.n8n.cloud/webhook/.../chat</span>
              </div>
            </div>
          )}

          {/* Active Context Banner */}
          <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <div className="truncate flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">Context:</span>
              <span>{activeIncident.id}</span>
              <span aria-hidden="true">·</span>
              <span className={activeIncident.severity === 'SEV-1' ? 'text-rose-400' : 'text-amber-300'}>
                {activeIncident.severity}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{activeIncident.services[0]}</span>
            </div>
            <span className="text-emerald-400 text-[10px] shrink-0 font-semibold">Active Sync</span>
          </div>

          {/* Chat Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender !== 'user' && (
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.isError ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}>
                    {msg.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-3 space-y-1 ${
                    msg.sender === 'user'
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                      : msg.sender === 'system'
                      ? 'bg-slate-900/80 border border-slate-800 text-slate-400 italic text-[11px] text-center w-full'
                      : msg.isError
                      ? 'bg-rose-950/40 border border-rose-900/60 text-rose-200 rounded-tl-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed break-words font-sans text-xs">
                    {msg.text}
                  </div>
                  <div className={`text-[10px] font-mono text-right ${
                    msg.sender === 'user' ? 'text-slate-800' : 'text-slate-500'
                  }`}>
                    {msg.time}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs font-mono">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>Waiting for response from n8n webhook...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-950/50 flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.text)}
                disabled={isLoading}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-300 rounded text-[11px] whitespace-nowrap transition-colors shrink-0 font-medium"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-slate-800 bg-[#111726] flex gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask n8n SRE Chatbot..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
