'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlpacaOrder } from '@/lib/alpaca';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  partially_filled: 'bg-amber-500/10 text-amber-400',
  filled: 'bg-brand-500/10 text-brand-400',
  cancelled: 'bg-gray-500/10 text-gray-500',
  expired: 'bg-gray-500/10 text-gray-500',
  accepted: 'bg-blue-500/10 text-blue-400',
  pending_new: 'bg-blue-500/10 text-blue-400',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  filled: <CheckCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

type Tab = 'open' | 'closed';

export function AlpacaOrders() {
  const [tab, setTab] = useState<Tab>('open');
  const utils = api.useUtils();

  const { data: orders, isLoading } = api.alpaca.getOrders.useQuery({ status: tab === 'open' ? 'open' : 'closed' });

  const cancel = api.alpaca.cancelOrder.useMutation({
    onSuccess: () => utils.alpaca.getOrders.invalidate(),
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 border-b border-gray-800">
        <div className="flex">
          {(['open', 'closed'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-3.5 text-sm font-medium border-b-2 transition-colors capitalize',
                tab === t
                  ? 'border-brand-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300',
              )}
            >
              {t === 'open' ? 'Ordres ouverts' : 'Historique ordres'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />)}
        </div>
      ) : !orders?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Clock className="w-7 h-7 text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {tab === 'open' ? 'Aucun ordre ouvert' : 'Aucun historique'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Symbole', 'Côté', 'Type', 'Qté', 'Prix limite', 'Prix stop', 'Statut', 'Date', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(orders as AlpacaOrder[]).map((order) => (
                <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">{order.symbol}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-bold', order.side === 'buy' ? 'bg-brand-500/10 text-brand-400' : 'bg-red-500/10 text-red-400')}>
                      {order.side === 'buy' ? 'ACHAT' : 'VENTE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{order.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono">{order.qty}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono">
                    {order.limit_price ? `$${parseFloat(order.limit_price).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-mono">
                    {order.stop_price ? `$${parseFloat(order.stop_price).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit', STATUS_STYLES[order.status] ?? 'bg-gray-800 text-gray-400')}>
                      {STATUS_ICONS[order.status]}
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(order.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    {tab === 'open' && ['new', 'accepted', 'pending_new'].includes(order.status) && (
                      <button
                        onClick={() => cancel.mutate({ orderId: order.id })}
                        disabled={cancel.isLoading}
                        className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Annuler"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
