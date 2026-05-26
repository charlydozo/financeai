'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  User,
  Loader2,
  TrendingUp,
  BarChart2,
  Briefcase,
  ShoppingCart,
  Bell,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { api } from '@/trpc/react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToolName =
  | 'get_market_data'
  | 'analyze_sentiment'
  | 'get_portfolio_state'
  | 'execute_order'
  | 'set_alert';

interface ToolCall {
  name: ToolName;
  status: 'running' | 'done';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TOOL_META: Record<ToolName, { label: string; Icon: React.ElementType; color: string }> = {
  get_market_data: { label: 'Données de marché', Icon: TrendingUp, color: 'text-blue-400' },
  analyze_sentiment: { label: 'Sentiment & Fondamentaux', Icon: BarChart2, color: 'text-purple-400' },
  get_portfolio_state: { label: 'État du portefeuille', Icon: Briefcase, color: 'text-amber-400' },
  execute_order: { label: "Exécution d'ordre", Icon: ShoppingCart, color: 'text-brand-400' },
  set_alert: { label: "Création d'alerte", Icon: Bell, color: 'text-orange-400' },
};

const SUGGESTIONS = [
  "Analyse complète d'AAPL",
  'État de mon portefeuille',
  'Rapport sur NVDA et MSFT',
  'Stratégie pour TSLA',
  'Crée une alerte si AAPL passe sous $170',
];

// ─── ToolCallBadge ────────────────────────────────────────────────────────────

function ToolCallBadge({ tool }: { tool: ToolCall }) {
  const meta = TOOL_META[tool.name] ?? { label: tool.name, Icon: Sparkles, color: 'text-gray-400' };
  const { Icon, label, color } = meta;
  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      {tool.status === 'running' ? (
        <Loader2 className={`w-3.5 h-3.5 animate-spin ${color}`} />
      ) : (
        <Icon className={`w-3.5 h-3.5 ${color} opacity-60`} />
      )}
      <span className={tool.status === 'running' ? 'text-gray-400' : 'text-gray-600'}>
        {tool.status === 'running' ? `Interrogation : ${label}…` : `${label} ✓`}
      </span>
    </div>
  );
}

// ─── Markdown renderer (minimal) ─────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## '))
          return <h2 key={i} className="text-base font-semibold text-white mt-3 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith('### '))
          return <h3 key={i} className="text-sm font-semibold text-gray-200 mt-2 mb-0.5">{line.slice(4)}</h3>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500 flex-shrink-0">•</span>
              <span className="text-gray-300">{inlineFormat(line.slice(2))}</span>
            </div>
          );
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i} className="text-gray-300">{inlineFormat(line)}</p>;
      })}
    </div>
  );
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
    ) : (
      p
    ),
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Message({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const toolCalls = msg.toolCalls ?? [];

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-brand-500/20' : 'bg-amber-500/10'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-brand-400" />
        ) : (
          <Bot className="w-4 h-4 text-amber-400" />
        )}
      </div>

      <div className={`flex-1 max-w-[85%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && toolCalls.length > 0 && (
          <div className="w-full mb-1 space-y-0.5">
            {toolCalls.map((tc, i) => <ToolCallBadge key={i} tool={tc} />)}
          </div>
        )}

        {(msg.content || msg.isStreaming) && (
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-brand-500/15 border border-brand-500/20'
                : 'bg-gray-900 border border-gray-800 w-full'
            }`}
          >
            {isUser ? (
              <p className="text-sm text-gray-200">{msg.content}</p>
            ) : msg.content ? (
              <>
                <MarkdownContent content={msg.content} />
                {msg.isStreaming && (
                  <span className="inline-block w-0.5 h-4 bg-brand-400 animate-pulse ml-0.5 align-text-bottom" />
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyse en cours…</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Alerts panel ─────────────────────────────────────────────────────────────

function AlertsPanel() {
  const [open, setOpen] = useState(false);
  const { data: alerts, refetch } = api.alert.list.useQuery();
  const deleteAlert = api.alert.delete.useMutation({ onSuccess: () => refetch() });

  if (!alerts?.length) return null;

  return (
    <div className="border-t border-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5" />
          {alerts.length} alerte{alerts.length > 1 ? 's' : ''} active{alerts.length > 1 ? 's' : ''}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between text-xs bg-gray-900/60 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 text-gray-400 min-w-0">
                <span className="font-medium text-white shrink-0">{alert.symbol}</span>
                <span className="shrink-0">{alert.condition.replace(/_/g, ' ')}</span>
                <span className="text-brand-400 shrink-0">{alert.threshold}</span>
                <span className="text-gray-600 shrink-0">→</span>
                <span className="truncate">{alert.action}</span>
              </div>
              <button
                onClick={() => deleteAlert.mutate({ id: alert.id })}
                className="text-gray-600 hover:text-red-400 transition-colors ml-2 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main chat ────────────────────────────────────────────────────────────────

export function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userText = text.trim();
      if (!userText || isLoading) return;

      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setIsLoading(true);

      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: userText };
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        toolCalls: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      // Build history including new user message
      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userText },
      ];

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => 'Erreur inconnue');
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: `Erreur: ${msg}`, isStreaming: false } : m,
            ),
          );
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let event: any;
            try { event = JSON.parse(line.slice(6)); } catch { continue; }

            if (event.type === 'token') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.content } : m,
                ),
              );
            } else if (event.type === 'tool_start') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...(m.toolCalls ?? []), { name: event.name as ToolName, status: 'running' }] }
                    : m,
                ),
              );
            } else if (event.type === 'tool_end') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls ?? []).map((tc) =>
                          tc.name === event.name && tc.status === 'running'
                            ? { ...tc, status: 'done' as const }
                            : tc,
                        ),
                      }
                    : m,
                ),
              );
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
              );
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `Erreur: ${event.message}`, isStreaming: false }
                    : m,
                ),
              );
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: 'Connexion interrompue.', isStreaming: false }
                : m,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
        );
      }
    },
    [messages, isLoading],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 shrink-0">
        <div className="p-2 bg-amber-500/10 rounded-xl">
          <Bot className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">Agent IA Financier</h1>
          <p className="text-xs text-gray-500">Analyse · Trading · Alertes</p>
        </div>
        <span className="ml-2 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-400">
          ✦ PRO
        </span>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-brand-500/10 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-xs text-brand-400 font-medium">En ligne</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="p-4 bg-amber-500/10 rounded-2xl">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-white font-semibold">Votre agent IA est prêt</h2>
              <p className="text-gray-500 text-sm max-w-sm">
                Posez une question sur le marché, demandez une analyse technique ou passez un ordre paper trading.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full text-xs text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <Message key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Active alerts panel */}
      <AlertsPanel />

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-gray-800 shrink-0">
        <div className="flex items-end gap-2 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 focus-within:border-gray-600 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              const ta = e.currentTarget;
              ta.style.height = 'auto';
              ta.style.height = `${ta.scrollHeight}px`;
            }}
            placeholder="Analysez AAPL, vérifiez mon portefeuille, proposez une stratégie…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 resize-none outline-none max-h-32 leading-relaxed"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="shrink-0 p-2 bg-brand-500 rounded-xl text-white hover:bg-brand-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-700 mt-2">
          Paper trading uniquement · Pas de conseils financiers · Claude Sonnet
        </p>
      </div>
    </div>
  );
}
