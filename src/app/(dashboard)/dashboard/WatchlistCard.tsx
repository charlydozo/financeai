'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';

const SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL'];

const GLASS: CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '0.5px solid rgba(255,255,255,0.9)',
  borderRadius: '20px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(2,85,159,0.06)',
};

interface Quote {
  c: number;
  d: number;
  dp: number;
}

export function WatchlistCard() {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch(`/api/market/batch-quotes?symbols=${SYMBOLS.join(',')}`)
        .then((r) => r.json())
        .then((data) => {
          setQuotes(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));

    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={GLASS} className="p-5">
      <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#7a9bbf' }}>
        Watchlist
      </p>

      {loading ? (
        <div className="space-y-3">
          {SYMBOLS.map((s) => (
            <div
              key={s}
              className="h-10 rounded-xl animate-pulse"
              style={{ background: 'rgba(2,85,159,0.06)' }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          {SYMBOLS.map((symbol) => {
            const q = quotes[symbol];
            const up = (q?.dp ?? 0) >= 0;
            return (
              <Link
                key={symbol}
                href="/market"
                className="flex items-center justify-between px-2.5 py-2.5 rounded-xl hover:bg-white/70 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(2,85,159,0.08)', color: '#02559F' }}
                  >
                    {symbol.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                    {symbol}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold" style={{ color: '#0F172A' }}>
                    {q?.c ? `$${q.c.toFixed(2)}` : '—'}
                  </p>
                  <p
                    className="text-xs font-mono"
                    style={{ color: up ? '#16a34a' : '#E24B4A' }}
                  >
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
