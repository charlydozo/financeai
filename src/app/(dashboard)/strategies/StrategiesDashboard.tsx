'use client';

import { useState } from 'react';
import {
  Brain, TrendingUp, Activity, BarChart2, Zap, Plus, Play, Pause,
  Trash2, Sparkles, ChevronDown, ChevronUp, X, Loader2, Calendar,
  RefreshCw, DollarSign, Target,
} from 'lucide-react';
import { api } from '@/trpc/react';
import { PLDiagram } from '@/components/strategies/PLDiagram';

// ─── Types ────────────────────────────────────────────────────────────────────

type StrategyType = 'SMARTPLAN' | 'STRADDLE' | 'BUTTERFLY' | 'STRANGLE';

const TYPE_META: Record<StrategyType, {
  label: string; desc: string; Icon: React.ElementType;
  color: string; bg: string; risk: string;
}> = {
  SMARTPLAN: {
    label: 'SMARTPLAN', desc: 'Dollar Cost Averaging — achats périodiques automatisés',
    Icon: TrendingUp, color: 'text-brand-400', bg: 'bg-brand-500/10', risk: 'Faible',
  },
  STRADDLE: {
    label: 'STRADDLE', desc: 'Achat Call + Put même strike — parie sur la volatilité',
    Icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', risk: 'Moyen',
  },
  BUTTERFLY: {
    label: 'BUTTERFLY SPREAD', desc: 'Buy K1, Sell 2×K2, Buy K3 — profit si prix stable',
    Icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-500/10', risk: 'Faible',
  },
  STRANGLE: {
    label: 'STRANGLE', desc: 'Call OTM + Put OTM — forte volatilité à moindre coût',
    Icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', risk: 'Élevé',
  },
};

// ─── Input helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500 transition-colors"
    >
      {props.children}
    </select>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ type, onClose, onCreated }: {
  type: StrategyType; onClose: () => void; onCreated: () => void;
}) {
  const meta = TYPE_META[type];
  const [name, setName] = useState(`${meta.label} ${new Date().toLocaleDateString('fr-FR')}`);

  // SMARTPLAN state
  const [symbols, setSymbols] = useState('AAPL,MSFT');
  const [amount, setAmount] = useState('100');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  // Options state
  const [symbol, setSymbol] = useState('AAPL');
  const [strike, setStrike] = useState('180');
  const [lowStrike, setLowStrike] = useState('170');
  const [midStrike, setMidStrike] = useState('180');
  const [highStrike, setHighStrike] = useState('190');
  const [callStrike, setCallStrike] = useState('185');
  const [putStrike, setPutStrike] = useState('175');
  const [callPremium, setCallPremium] = useState('3.50');
  const [putPremium, setPutPremium] = useState('3.00');
  const [netDebit, setNetDebit] = useState('2.00');
  const [quantity, setQuantity] = useState('1');
  const [expiry, setExpiry] = useState(
    new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
  );

  const create = api.strategy.create.useMutation({ onSuccess: () => { onCreated(); onClose(); } });

  function handleSubmit() {
    if (type === 'SMARTPLAN') {
      const syms = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      create.mutate({
        type: 'SMARTPLAN', name,
        config: {
          symbols: syms, amountPerSymbol: parseFloat(amount),
          frequency, startDate, nextRun: startDate, totalInvested: 0,
        },
      });
    } else if (type === 'STRADDLE') {
      create.mutate({
        type: 'STRADDLE', name,
        config: {
          symbol, strike: parseFloat(strike), expiry,
          callPremium: parseFloat(callPremium), putPremium: parseFloat(putPremium),
          quantity: parseInt(quantity),
        },
      });
    } else if (type === 'BUTTERFLY') {
      create.mutate({
        type: 'BUTTERFLY', name,
        config: {
          symbol, lowStrike: parseFloat(lowStrike), midStrike: parseFloat(midStrike),
          highStrike: parseFloat(highStrike), netDebit: parseFloat(netDebit),
          expiry, quantity: parseInt(quantity),
        },
      });
    } else {
      create.mutate({
        type: 'STRANGLE', name,
        config: {
          symbol, callStrike: parseFloat(callStrike), putStrike: parseFloat(putStrike),
          callPremium: parseFloat(callPremium), putPremium: parseFloat(putPremium),
          expiry, quantity: parseInt(quantity),
        },
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${meta.bg} rounded-xl`}>
              <meta.Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Nouvelle stratégie {meta.label}</h2>
              <p className="text-xs text-gray-500">{meta.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <Field label="Nom de la stratégie">
            <Input value={name} onChange={e => setName(e.target.value)} />
          </Field>

          {type === 'SMARTPLAN' && (
            <>
              <Field label="Symboles (séparés par virgule)">
                <Input value={symbols} onChange={e => setSymbols(e.target.value)} placeholder="AAPL,MSFT,GOOGL" />
              </Field>
              <Field label="Montant par symbole ($)">
                <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} />
              </Field>
              <Field label="Fréquence">
                <Select value={frequency} onChange={e => setFrequency(e.target.value as any)}>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                </Select>
              </Field>
              <Field label="Date de début">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </Field>
            </>
          )}

          {(type === 'STRADDLE' || type === 'BUTTERFLY' || type === 'STRANGLE') && (
            <Field label="Symbole sous-jacent">
              <Input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" />
            </Field>
          )}

          {type === 'STRADDLE' && (
            <>
              <Field label="Strike ($)">
                <Input type="number" min="0" step="0.5" value={strike} onChange={e => setStrike(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prime Call ($)">
                  <Input type="number" min="0" step="0.01" value={callPremium} onChange={e => setCallPremium(e.target.value)} />
                </Field>
                <Field label="Prime Put ($)">
                  <Input type="number" min="0" step="0.01" value={putPremium} onChange={e => setPutPremium(e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {type === 'BUTTERFLY' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Strike bas K1 ($)">
                  <Input type="number" min="0" step="0.5" value={lowStrike} onChange={e => setLowStrike(e.target.value)} />
                </Field>
                <Field label="Strike mid K2 ($)">
                  <Input type="number" min="0" step="0.5" value={midStrike} onChange={e => setMidStrike(e.target.value)} />
                </Field>
                <Field label="Strike haut K3 ($)">
                  <Input type="number" min="0" step="0.5" value={highStrike} onChange={e => setHighStrike(e.target.value)} />
                </Field>
              </div>
              <Field label="Débit net ($)">
                <Input type="number" min="0" step="0.01" value={netDebit} onChange={e => setNetDebit(e.target.value)} />
              </Field>
            </>
          )}

          {type === 'STRANGLE' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Strike Call OTM ($)">
                  <Input type="number" min="0" step="0.5" value={callStrike} onChange={e => setCallStrike(e.target.value)} />
                </Field>
                <Field label="Strike Put OTM ($)">
                  <Input type="number" min="0" step="0.5" value={putStrike} onChange={e => setPutStrike(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prime Call ($)">
                  <Input type="number" min="0" step="0.01" value={callPremium} onChange={e => setCallPremium(e.target.value)} />
                </Field>
                <Field label="Prime Put ($)">
                  <Input type="number" min="0" step="0.01" value={putPremium} onChange={e => setPutPremium(e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {type !== 'SMARTPLAN' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantité (contrats)">
                <Input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </Field>
              <Field label="Expiration">
                <Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleSubmit}
            disabled={create.isLoading}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {create.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Créer la stratégie
          </button>
          {create.error && (
            <p className="text-xs text-red-400 mt-2 text-center">{create.error.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Strategy Card ────────────────────────────────────────────────────────────

function StrategyCard({ strategy, onRefresh }: { strategy: any; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const toggle = api.strategy.toggle.useMutation({ onSuccess: onRefresh });
  const del = api.strategy.delete.useMutation({ onSuccess: onRefresh });
  const report = api.strategy.generateReport.useMutation({ onSuccess: onRefresh });
  const exec = api.strategy.executeNow.useMutation({ onSuccess: onRefresh });

  const meta = TYPE_META[strategy.type as StrategyType];
  const config = strategy.config as any;
  const isActive = strategy.status === 'ACTIVE';
  const isOptions = strategy.type !== 'SMARTPLAN';
  const lastExec = strategy.executions?.[0];

  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${
      isActive ? 'border-gray-800' : 'border-gray-800/50 opacity-70'
    }`}>
      {/* Card header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 ${meta.bg} rounded-xl shrink-0`}>
            <meta.Icon className={`w-4 h-4 ${meta.color}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate">{strategy.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${meta.bg} ${meta.color}`}>
                {meta.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {strategy.type === 'SMARTPLAN'
                ? `${config.symbols?.join(', ')} · $${config.amountPerSymbol}/symbole · ${config.frequency === 'weekly' ? 'Hebdo' : 'Mensuel'}`
                : strategy.type === 'BUTTERFLY'
                ? `${config.symbol} · K1:$${config.lowStrike} / K2:$${config.midStrike} / K3:$${config.highStrike}`
                : strategy.type === 'STRADDLE'
                ? `${config.symbol} · Strike $${config.strike} · exp. ${config.expiry}`
                : `${config.symbol} · Call $${config.callStrike} / Put $${config.putStrike}`}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => toggle.mutate({ id: strategy.id })}
          disabled={toggle.isLoading}
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isActive
              ? 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20'
              : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
          }`}
        >
          {isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          {isActive ? 'Actif' : 'Pausé'}
        </button>
      </div>

      {/* Stats row */}
      <div className="px-4 pb-3 flex items-center gap-4 text-xs text-gray-500">
        {strategy.type === 'SMARTPLAN' && (
          <>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${(config.totalInvested ?? 0).toFixed(0)} investi
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {config.nextRun ? `Prochain: ${new Date(config.nextRun).toLocaleDateString('fr-FR')}` : 'Non planifié'}
            </span>
          </>
        )}
        {isOptions && (
          <>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {config.quantity} contrat{config.quantity > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Exp. {new Date(config.expiry).toLocaleDateString('fr-FR')}
            </span>
            <span>
              Coût: ${((strategy.type === 'BUTTERFLY'
                ? config.netDebit
                : (config.callPremium ?? 0) + (config.putPremium ?? 0)) * 100 * (config.quantity ?? 1)).toFixed(0)}
            </span>
          </>
        )}
        {lastExec && (
          <span className="ml-auto">
            Dernière exéc. {new Date(lastExec.executedAt).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
        {strategy.type === 'SMARTPLAN' && (
          <button
            onClick={() => exec.mutate({ id: strategy.id })}
            disabled={exec.isLoading || !isActive}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
          >
            {exec.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Exécuter DCA
          </button>
        )}

        {isOptions && (
          <button
            onClick={() => setShowChart(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showChart ? `${meta.bg} ${meta.color}` : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            Graphique P&L
          </button>
        )}

        <button
          onClick={() => { report.mutate({ id: strategy.id }); setExpanded(true); }}
          disabled={report.isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
        >
          {report.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {report.isLoading ? 'Génération…' : 'Rapport IA'}
        </button>

        {strategy.aiReport && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:text-gray-400 text-xs transition-colors ml-auto"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Rapport
          </button>
        )}

        <button
          onClick={() => del.mutate({ id: strategy.id })}
          disabled={del.isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-600 hover:text-red-400 transition-colors text-xs disabled:opacity-40 ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Execution feedback */}
      {exec.data && (
        <div className="mx-4 mb-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
          <p className="text-xs text-brand-400 font-medium mb-1">DCA exécuté — ${exec.data.totalSpent.toFixed(2)}</p>
          {exec.data.trades.map((t: string, i: number) => (
            <p key={i} className="text-xs text-gray-400">{t}</p>
          ))}
        </div>
      )}

      {/* P&L diagram */}
      {showChart && isOptions && (
        <div className="mx-4 mb-4 p-3 bg-gray-950 border border-gray-800 rounded-xl">
          <p className={`text-xs font-medium ${meta.color} mb-2`}>Diagramme P&L — {meta.label}</p>
          <PLDiagram type={strategy.type as 'STRADDLE' | 'BUTTERFLY' | 'STRANGLE'} config={config} />
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
            {strategy.type === 'BUTTERFLY' && (
              <>
                <span className="text-brand-400">Profit max: +${((config.midStrike - config.lowStrike - config.netDebit) * 100 * config.quantity).toFixed(0)}</span>
                <span className="text-red-400">Perte max: -${(config.netDebit * 100 * config.quantity).toFixed(0)}</span>
                <span>BE: ${(config.lowStrike + config.netDebit).toFixed(2)} / ${(config.highStrike - config.netDebit).toFixed(2)}</span>
              </>
            )}
            {strategy.type === 'STRADDLE' && (
              <>
                <span className="text-brand-400">Profit: illimité</span>
                <span className="text-red-400">Perte max: -${((config.callPremium + config.putPremium) * 100 * config.quantity).toFixed(0)}</span>
                <span>BE: ${(config.strike - config.callPremium - config.putPremium).toFixed(2)} / ${(config.strike + config.callPremium + config.putPremium).toFixed(2)}</span>
              </>
            )}
            {strategy.type === 'STRANGLE' && (
              <>
                <span className="text-brand-400">Profit: illimité</span>
                <span className="text-red-400">Perte max: -${((config.callPremium + config.putPremium) * 100 * config.quantity).toFixed(0)}</span>
                <span>BE: ${(config.putStrike - config.callPremium - config.putPremium).toFixed(2)} / ${(config.callStrike + config.callPremium + config.putPremium).toFixed(2)}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI report */}
      {expanded && strategy.aiReport && (
        <div className="mx-4 mb-4 p-4 bg-gray-950 border border-gray-800 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Rapport IA</span>
          </div>
          <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
            {strategy.aiReport}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function StrategiesDashboard() {
  const [createType, setCreateType] = useState<StrategyType | null>(null);
  const { data: strategies, refetch, isLoading } = api.strategy.list.useQuery();

  const activeStrategies = strategies?.filter(s => s.status === 'ACTIVE') ?? [];
  const pausedStrategies = strategies?.filter(s => s.status === 'PAUSED') ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/10 rounded-xl">
          <Brain className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Stratégies</h1>
          <p className="text-gray-400 text-sm mt-0.5">Algorithmes de trading automatisés</p>
        </div>
        <span className="ml-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-400">
          ✦ PRO
        </span>
      </div>

      {/* Active strategies */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Chargement…
        </div>
      ) : activeStrategies.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Stratégies actives ({activeStrategies.length})
          </h2>
          {activeStrategies.map(s => (
            <StrategyCard key={s.id} strategy={s} onRefresh={refetch} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-800 rounded-2xl text-center">
          <Brain className="w-8 h-8 text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">Aucune stratégie active</p>
          <p className="text-gray-600 text-xs mt-1">Créez votre première stratégie ci-dessous</p>
        </div>
      )}

      {/* Paused strategies */}
      {pausedStrategies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            En pause ({pausedStrategies.length})
          </h2>
          {pausedStrategies.map(s => (
            <StrategyCard key={s.id} strategy={s} onRefresh={refetch} />
          ))}
        </div>
      )}

      {/* New strategy section */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> Nouvelle stratégie
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(TYPE_META) as StrategyType[]).map(type => {
            const m = TYPE_META[type];
            return (
              <button
                key={type}
                onClick={() => setCreateType(type)}
                className="text-left p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 ${m.bg} rounded-lg shrink-0 group-hover:scale-105 transition-transform`}>
                    <m.Icon className={`w-4 h-4 ${m.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{m.label}</span>
                      <span className={`text-xs ${
                        m.risk === 'Élevé' ? 'text-red-400' : m.risk === 'Moyen' ? 'text-amber-400' : 'text-brand-400'
                      }`}>
                        {m.risk}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Create modal */}
      {createType && (
        <CreateModal
          type={createType}
          onClose={() => setCreateType(null)}
          onCreated={() => { refetch(); }}
        />
      )}
    </div>
  );
}
