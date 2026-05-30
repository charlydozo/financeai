'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function FloatingChat() {
  const { data: session } = useSession();
  const isPro = (session?.user as { subscriptionPlan?: string })?.subscriptionPlan === 'PRO';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const msg = res.status === 403 ? 'Accès réservé aux membres PRO.' : `Erreur ${res.status}`;
        setMessages([...history, { role: 'assistant', content: msg }]);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assembled = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token') {
              assembled += data.content;
              setMessages([...history, { role: 'assistant', content: assembled }]);
            }
          } catch { /* ignore malformed frames */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setMessages([...history, { role: 'assistant', content: 'Une erreur est survenue.' }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, messages, streaming]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(107,147,255,0.35)',
          zIndex: 1000,
          transition: 'transform 0.2s',
          transform: open ? 'rotate(45deg)' : 'none',
        }}
      >
        <i className={`ti ti-${open ? 'x' : 'message-chatbot'}`} style={{ fontSize: 22 }} />
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 84,
            right: 24,
            width: 340,
            height: 460,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 12px 48px rgba(0,0,0,0.28)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 999,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-robot" style={{ fontSize: 17 }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Agent Charly</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{isPro ? 'En ligne' : 'PRO requis'}</p>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 11 }}>
                Effacer
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', gap: 8, textAlign: 'center' }}>
                <i className="ti ti-message-chatbot" style={{ fontSize: 34, opacity: 0.35 }} />
                <p style={{ fontSize: 13 }}>Posez une question sur vos investissements</p>
              </div>
            ) : messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  maxWidth: '86%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  padding: '8px 12px',
                  borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content || (msg.role === 'assistant' && streaming ? '…' : '')}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={isPro ? 'Votre question…' : 'Accès PRO requis'}
              disabled={!isPro || streaming}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
                opacity: !isPro ? 0.5 : 1,
                fontFamily: 'var(--font-body)',
              }}
            />
            <button
              onClick={send}
              disabled={!isPro || !input.trim() || streaming}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: (input.trim() && isPro) ? 'var(--accent)' : 'var(--border)',
                color: (input.trim() && isPro) ? '#fff' : 'var(--text-3)',
                cursor: (input.trim() && isPro) ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <i className={`ti ti-${streaming ? 'loader-2' : 'send'}`} style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
