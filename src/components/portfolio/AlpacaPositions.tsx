'use client';

import { api } from '@/trpc/react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlpacaPosition } from '@/lib/alpaca';

function PnlCell({ value, pct }: { value: string; pct: string }) {
  const v = parseFloat(value);
  const p = parseFloat(pct) * 100;
  const positive = v >= 0;

  return (
    <div className={cn('text-right', positive ? 'text-brand-400' : 'text-red-400')}>
      <div className="font-medium text-sm">
        {positive ? '+' : ''}${v.toFixed(2)}
      </div>
      <div className="text-xs opacity-75">
        {positive ? '+' : ''}{p.toFixed(2)}%
      </div>
    </div>
  );
}

export function AlpacaPositions() {
  const { data: positions, isLoading, refetch, isFetching } = api.alpaca.getPositions.useQuery(
    undefined,
    { refetchInterval: 15_000 },
  );

  const totalUnrealizedPL = positions?.reduce((s, p) => s + parseFloat(p.unrealized_pl), 0) ?? 0;
  const totalMarketValue = positions?.reduce((s, p) => s + parseFloat(p.market_value), 0) ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Résumé */}
      {positions && positions.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Valeur totale</p>
            <p className="text-lg font-bold text-white">${totalMarketValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">P&L non réalisé</p>
            <p className={cn('text-lg font-bold', totalUnrealizedPL >= 0 ? 'text-brand-400' : 'text-red-400')}>
              {totalUnrealizedPL >= 0 ? '+' : ''}${totalUnrealizedPL.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <span className="text-sm font-semibold text-white">Positions ouvertes</span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          </button>
        </div>

        {!positions || positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <TrendingUp className="w-8 h-8 text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">Aucune position ouverte</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Symbole', 'Quantité', 'Prix moyen', 'Prix actuel', 'Valeur', 'P&L total', "P&L aujourd'hui"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide first:pl-4 last:pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(positions as AlpacaPosition[]).map((pos) => {
                  const todayPnL = parseFloat(pos.unrealized_intraday_pl);
                  const todayPct = parseFloat(pos.change_today) * 100;

                  return (
                    <tr key={pos.symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{pos.symbol}</span>
                          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', pos.side === 'long' ? 'bg-brand-500/10 text-brand-400' : 'bg-red-500/10 text-red-400')}>
                            {pos.side === 'long' ? 'LONG' : 'SHORT'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{pos.qty}</td>
                      <td className="px-4 py-3 text-gray-300 font-mono">${parseFloat(pos.avg_entry_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-white font-mono font-medium">${parseFloat(pos.current_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-300 font-mono">${parseFloat(pos.market_value).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <PnlCell value={pos.unrealized_pl} pct={pos.unrealized_plpc} />
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn('flex items-center justify-end gap-1 text-sm font-medium', todayPnL >= 0 ? 'text-brand-400' : 'text-red-400')}>
                          {todayPnL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(2)}
                          <span className="text-xs opacity-75">({todayPct >= 0 ? '+' : ''}{todayPct.toFixed(2)}%)</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
