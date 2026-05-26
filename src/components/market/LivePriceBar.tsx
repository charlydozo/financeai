'use client';

import { useEffect, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StreamQuote } from '@/hooks/useMarketStream';

interface LivePriceBarProps {
  symbol: string;
  quote: StreamQuote | null;
  connected: boolean;
  prevPrice?: number;
}

export function LivePriceBar({ symbol, quote, connected, prevPrice }: LivePriceBarProps) {
  const prevRef = useRef<number | undefined>(prevPrice);
  const lp = quote?.lp ?? quote?.bp;
  const direction = lp && prevRef.current ? (lp > prevRef.current ? 'up' : lp < prevRef.current ? 'down' : 'flat') : 'flat';

  useEffect(() => {
    if (lp) prevRef.current = lp;
  }, [lp]);

  const spread = quote ? (quote.ap - quote.bp).toFixed(3) : '—';
  const midPrice = quote ? ((quote.bp + quote.ap) / 2).toFixed(2) : '—';

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-gray-900 border-b border-gray-800">
      {/* Symbole */}
      <span className="text-white font-bold text-base">{symbol}</span>

      {/* Prix last / mid */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-2xl font-bold tabular-nums transition-colors duration-300',
            direction === 'up' && 'text-brand-400',
            direction === 'down' && 'text-red-400',
            direction === 'flat' && 'text-white',
          )}
        >
          {lp?.toFixed(2) ?? midPrice}
        </span>
      </div>

      {/* Bid / Ask */}
      <div className="flex items-center gap-3 text-sm">
        <div>
          <span className="text-gray-500 text-xs mr-1">BID</span>
          <span className="text-brand-400 font-mono">{quote?.bp?.toFixed(2) ?? '—'}</span>
          <span className="text-gray-600 text-xs ml-1">×{quote?.bs ?? '—'}</span>
        </div>
        <div>
          <span className="text-gray-500 text-xs mr-1">ASK</span>
          <span className="text-red-400 font-mono">{quote?.ap?.toFixed(2) ?? '—'}</span>
          <span className="text-gray-600 text-xs ml-1">×{quote?.as ?? '—'}</span>
        </div>
      </div>

      {/* Spread */}
      <div className="text-xs text-gray-500 hidden lg:block">
        Écart <span className="text-amber-400 font-mono">{spread}</span>
      </div>

      {/* Volume */}
      {quote?.v != null && (
        <div className="text-xs text-gray-500 hidden lg:block">
          Vol <span className="text-gray-300 font-mono">{quote.v.toLocaleString()}</span>
        </div>
      )}

      {/* Indicateur live */}
      <div className="ml-auto flex items-center gap-1.5">
        {quote?.simulated && (
          <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            simulé
          </span>
        )}
        <div className={cn('flex items-center gap-1 text-xs', connected ? 'text-brand-400' : 'text-gray-600')}>
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? 'LIVE' : 'hors ligne'}
        </div>
      </div>
    </div>
  );
}
