'use client';

import { useMemo } from 'react';
import type { StreamQuote } from '@/hooks/useMarketStream';

interface OrderBookProps {
  quote: StreamQuote | null;
}

function buildDepth(midPrice: number, bidPrice: number, askPrice: number, levels = 8) {
  const bids = Array.from({ length: levels }, (_, i) => {
    const price = bidPrice - i * midPrice * 0.00015;
    const size = Math.floor(200 + Math.random() * 800 * (1 / (i + 1)));
    return { price: +price.toFixed(2), size };
  });

  const asks = Array.from({ length: levels }, (_, i) => {
    const price = askPrice + i * midPrice * 0.00015;
    const size = Math.floor(200 + Math.random() * 800 * (1 / (i + 1)));
    return { price: +price.toFixed(2), size };
  });

  return { bids, asks: asks.reverse() };
}

export function OrderBook({ quote }: OrderBookProps) {
  const midPrice = quote ? (quote.bp + quote.ap) / 2 : 0;
  const spread = quote ? quote.ap - quote.bp : 0;

  // Recalcule la profondeur uniquement quand le quote change (pas le pseudo-aléatoire)
  const depth = useMemo(() => {
    if (!quote) return null;
    return buildDepth(midPrice, quote.bp, quote.ap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.bp, quote?.ap]);

  const maxSize = depth
    ? Math.max(...depth.bids.map((b) => b.size), ...depth.asks.map((a) => a.size))
    : 1;

  if (!quote || !depth) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        En attente de données…
      </div>
    );
  }

  return (
    <div className="text-xs font-mono select-none">
      {/* En-têtes */}
      <div className="grid grid-cols-3 text-gray-500 pb-1 border-b border-gray-800 mb-1">
        <span>Prix</span>
        <span className="text-right">Taille</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (vendeurs) — affiché du plus haut au plus bas */}
      {depth.asks.map((ask, i) => {
        const pct = (ask.size / maxSize) * 100;
        const total = depth.asks.slice(i).reduce((s, a) => s + a.size, 0);
        return (
          <div key={`ask-${ask.price}`} className="relative grid grid-cols-3 py-[2px] text-red-400">
            <div
              className="absolute right-0 top-0 bottom-0 bg-red-500/8"
              style={{ width: `${pct}%` }}
            />
            <span className="relative z-10">{ask.price.toFixed(2)}</span>
            <span className="relative z-10 text-right">{ask.size.toLocaleString()}</span>
            <span className="relative z-10 text-right text-gray-500">{total.toLocaleString()}</span>
          </div>
        );
      })}

      {/* Spread */}
      <div className="grid grid-cols-3 py-1.5 border-y border-gray-800 my-0.5">
        <span className="text-white font-semibold text-[11px]">
          {midPrice.toFixed(2)}
        </span>
        <span className="text-right text-gray-500">écart</span>
        <span className="text-right text-amber-400">{spread.toFixed(3)}</span>
      </div>

      {/* Bids (acheteurs) */}
      {depth.bids.map((bid, i) => {
        const pct = (bid.size / maxSize) * 100;
        const total = depth.bids.slice(0, i + 1).reduce((s, b) => s + b.size, 0);
        return (
          <div key={`bid-${bid.price}`} className="relative grid grid-cols-3 py-[2px] text-brand-400">
            <div
              className="absolute right-0 top-0 bottom-0 bg-brand-500/8"
              style={{ width: `${pct}%` }}
            />
            <span className="relative z-10">{bid.price.toFixed(2)}</span>
            <span className="relative z-10 text-right">{bid.size.toLocaleString()}</span>
            <span className="relative z-10 text-right text-gray-500">{total.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}
