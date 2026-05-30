'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL'];

interface Quote { c: number; d: number; dp: number; }

export function WatchlistCard() {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch(`/api/market/batch-quotes?symbols=${SYMBOLS.join(',')}`)
        .then((r) => r.json())
        .then((data) => { setQuotes(data); setLoading(false); })
        .catch(() => setLoading(false));

    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 16, margin: '0 0 16px' }}>
        Watchlist
      </p>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SYMBOLS.map((s) => (
            <div key={s} style={{ height: 40, borderRadius: 10, background: 'var(--accent-dim)', opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SYMBOLS.map((symbol) => {
            const q = quotes[symbol];
            const up = (q?.dp ?? 0) >= 0;
            return (
              <Link
                key={symbol}
                href="/market"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.12s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                    {symbol.charAt(0)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{symbol}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                    {q?.c ? `$${q.c.toFixed(2)}` : '—'}
                  </p>
                  <p style={{ fontSize: 11, color: up ? 'var(--green)' : 'var(--red)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                    {q?.dp != null ? `${up ? '+' : ''}${q.dp.toFixed(2)}%` : '—'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
