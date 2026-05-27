'use client';

import { useState } from 'react';
import { useMarketStream } from '@/hooks/useMarketStream';
import { TradingChart } from '@/components/market/TradingChart';
import { OrderBook } from '@/components/market/OrderBook';
import { OrderForm } from '@/components/market/OrderForm';
import { SymbolSearch } from '@/components/market/SymbolSearch';

type RightTab = 'orderbook' | 'order';

export default function MarketPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [rightTab, setRightTab] = useState<RightTab>('orderbook');

  const { quote } = useMarketStream(symbol);
  const lastPrice = quote?.lp ?? quote?.bp;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Colonne gauche : sélecteur + chart ─────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-950">
            <SymbolSearch value={symbol} onChange={setSymbol} />
          </div>

          {/* Chart */}
          <div className="flex-1 p-3 min-h-0">
            <div className="w-full h-full bg-gray-900 rounded-xl overflow-hidden">
              <TradingChart symbol={symbol} />
            </div>
          </div>
        </div>

        {/* ── Colonne droite : order book + formulaire ────────────────── */}
        <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col bg-gray-950">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {([['orderbook', 'Carnet'], ['order', 'Passer ordre']] as [RightTab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  rightTab === t
                    ? 'border-brand-500 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {rightTab === 'orderbook' ? (
              <OrderBook quote={quote} />
            ) : (
              <OrderForm symbol={symbol} lastPrice={lastPrice} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
