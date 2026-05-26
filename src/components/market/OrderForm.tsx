'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type Side = 'buy' | 'sell';
type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
type TimeInForce = 'day' | 'gtc';

interface OrderFormProps {
  symbol: string;
  lastPrice?: number;
}

export function OrderForm({ symbol, lastPrice }: OrderFormProps) {
  const [side, setSide] = useState<Side>('buy');
  const [type, setType] = useState<OrderType>('market');
  const [qty, setQty] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [tif, setTif] = useState<TimeInForce>('day');
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const placeOrder = api.alpaca.placeOrder.useMutation({
    onSuccess: (data) => {
      const simMsg = (data as any).simulated ? ' (simulé)' : '';
      setToast({ ok: true, msg: `Ordre ${data.side.toUpperCase()} ${data.qty} ${data.symbol} accepté${simMsg}` });
      setQty('');
      setLimitPrice('');
      setStopPrice('');
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err) => {
      setToast({ ok: false, msg: err.message });
      setTimeout(() => setToast(null), 5000);
    },
  });

  const needsLimit = type === 'limit' || type === 'stop_limit';
  const needsStop = type === 'stop' || type === 'stop_limit';

  const estimatedValue = lastPrice && qty
    ? (parseFloat(qty) * (type === 'market' ? lastPrice : parseFloat(limitPrice) || lastPrice)).toFixed(2)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || parseFloat(qty) <= 0) return;

    placeOrder.mutate({
      symbol,
      qty: parseFloat(qty),
      side,
      type,
      time_in_force: tif,
      limit_price: needsLimit && limitPrice ? parseFloat(limitPrice) : undefined,
      stop_price: needsStop && stopPrice ? parseFloat(stopPrice) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* BUY / SELL */}
      <div className="flex rounded-xl overflow-hidden border border-gray-800">
        {(['buy', 'sell'] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={cn(
              'flex-1 py-2.5 text-sm font-semibold transition-colors capitalize',
              side === s
                ? s === 'buy'
                  ? 'bg-brand-500 text-white'
                  : 'bg-red-500 text-white'
                : 'bg-gray-900 text-gray-500 hover:text-gray-300',
            )}
          >
            {s === 'buy' ? 'Acheter' : 'Vendre'}
          </button>
        ))}
      </div>

      {/* Type d'ordre */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Type d&apos;ordre</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as OrderType)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
          <option value="stop_limit">Stop-Limit</option>
        </select>
      </div>

      {/* Quantité */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Quantité (actions)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="0"
          required
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 [appearance:textfield]"
        />
      </div>

      {/* Limit price */}
      {needsLimit && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Prix limite ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={lastPrice?.toFixed(2) ?? '0.00'}
            required
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 [appearance:textfield]"
          />
        </div>
      )}

      {/* Stop price */}
      {needsStop && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Prix stop ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder={lastPrice ? (lastPrice * 0.98).toFixed(2) : '0.00'}
            required
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 [appearance:textfield]"
          />
        </div>
      )}

      {/* Time in Force */}
      <div className="flex gap-2">
        {(['day', 'gtc'] as TimeInForce[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTif(t)}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors uppercase',
              tif === t
                ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                : 'border-gray-700 text-gray-500 hover:text-gray-300',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Estimation valeur */}
      {estimatedValue && (
        <div className="px-3 py-2 bg-gray-800/50 rounded-lg flex justify-between text-xs">
          <span className="text-gray-500">Valeur estimée</span>
          <span className="text-white font-medium">${parseFloat(estimatedValue).toLocaleString()}</span>
        </div>
      )}

      {/* Bouton submit */}
      <button
        type="submit"
        disabled={placeOrder.isLoading || !qty}
        className={cn(
          'w-full py-3 rounded-xl font-semibold text-sm transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          side === 'buy'
            ? 'bg-brand-500 text-white hover:bg-brand-400'
            : 'bg-red-500 text-white hover:bg-red-400',
        )}
      >
        {placeOrder.isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Envoi…
          </span>
        ) : (
          `${side === 'buy' ? 'Acheter' : 'Vendre'} ${qty || '—'} ${symbol}`
        )}
      </button>

      {/* Toast feedback */}
      {toast && (
        <div
          className={cn(
            'flex items-start gap-2 p-3 rounded-xl text-xs',
            toast.ok
              ? 'bg-brand-500/10 border border-brand-500/20 text-brand-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300',
          )}
        >
          {toast.ok ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          {toast.msg}
        </div>
      )}
    </form>
  );
}
