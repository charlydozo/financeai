'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { AlpacaPositions } from '@/components/portfolio/AlpacaPositions';
import { AlpacaOrders } from '@/components/portfolio/AlpacaOrders';
import {
  DollarSign, TrendingUp, TrendingDown, Briefcase,
  Plus, Trash2, Activity, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'positions' | 'orders' | 'portfolios';

// ── Modal création portefeuille ──────────────────────────────────────────────
function CreatePortfolioModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const utils = api.useUtils();

  const create = api.portfolio.create.useMutation({
    onSuccess: () => { utils.portfolio.getAll.invalidate(); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nouveau portefeuille</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate({ name, description: desc || undefined }); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}
              placeholder="Mon portefeuille tech"
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description (optionnelle)</label>
            <textarea
              value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3}
              placeholder="Stratégie axée sur les valeurs technologiques..."
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={create.isLoading || !name}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-400 disabled:opacity-50 transition-colors">
              {create.isLoading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Carte compte Alpaca ───────────────────────────────────────────────────────
function AccountCard() {
  const { data: account } = api.alpaca.getAccount.useQuery(undefined, { refetchInterval: 30_000 });

  if (!account) return null;

  const equity = parseFloat((account as any).equity);
  const cash = parseFloat((account as any).cash);
  const buyingPower = parseFloat((account as any).buying_power);
  const invested = equity - cash;

  const stats = [
    { label: 'Valeur totale', value: `$${equity.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, color: 'text-white' },
    { label: 'Cash disponible', value: `$${cash.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, color: 'text-brand-400' },
    { label: 'Pouvoir d\'achat', value: `$${buyingPower.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, color: 'text-blue-400' },
    { label: 'Investi', value: `$${invested.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, color: 'text-amber-400' },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Compte Alpaca Paper Trading</h2>
        {(account as any).simulated && (
          <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
            simulé
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
            <p className={cn('text-base font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Onglet portefeuilles manuels ─────────────────────────────────────────────
function ManualPortfolios() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: portfolios, isLoading } = api.portfolio.getAll.useQuery();
  const utils = api.useUtils();
  const del = api.portfolio.delete.useMutation({ onSuccess: () => utils.portfolio.getAll.invalidate() });

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
      ))}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">Portefeuilles de suivi personnels</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-medium hover:bg-brand-400 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Nouveau
        </button>
      </div>

      {portfolios?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="w-10 h-10 text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">Aucun portefeuille</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-3 text-xs text-brand-400 hover:underline">
            Créer un portefeuille →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios?.map((p) => (
            <div key={p.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-brand-500/10 rounded-lg">
                  <Briefcase className="w-4 h-4 text-brand-400" />
                </div>
                <button onClick={() => del.mutate({ id: p.id })}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{p.name}</h3>
              {p.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description}</p>}
              <div className="flex items-center gap-4 pt-3 border-t border-gray-800">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Activity className="w-3 h-3" />{p._count.trades} trades
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <TrendingUp className="w-3 h-3" />{p._count.orders} ordres
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreatePortfolioModal onClose={() => setShowCreate(false)} />}
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [tab, setTab] = useState<Tab>('positions');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'positions', label: 'Positions' },
    { key: 'orders', label: 'Ordres' },
    { key: 'portfolios', label: 'Mes portefeuilles' },
  ];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Portefeuille</h1>
        <p className="text-gray-400 text-sm mt-0.5">Positions Alpaca Paper Trading & portefeuilles personnels</p>
      </div>

      {/* Carte compte */}
      <AccountCard />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-800">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === key
                ? 'border-brand-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {tab === 'positions' && <AlpacaPositions />}
      {tab === 'orders' && <AlpacaOrders />}
      {tab === 'portfolios' && <ManualPortfolios />}
    </div>
  );
}
