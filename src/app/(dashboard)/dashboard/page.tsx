import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, TrendingUp, TrendingDown, AlertTriangle, Clock, ArrowUpRight } from 'lucide-react';
import type { Metadata, NextPage } from 'next';
import type { CSSProperties } from 'react';
import { WatchlistCard } from './WatchlistCard';

export const metadata: Metadata = { title: 'Dashboard' };

// ── Glass styles ──────────────────────────────────────────────────────────────

const GLASS: CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '0.5px solid rgba(255,255,255,0.9)',
  borderRadius: '20px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(2,85,159,0.06)',
};

const HERO: CSSProperties = {
  background: 'rgba(255,255,255,0.78)',
  border: '0.5px solid rgba(255,255,255,0.9)',
  borderRadius: '22px',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(2,85,159,0.12), 0 1px 3px rgba(2,85,159,0.08)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const CONDITION_LABELS: Record<string, string> = {
  price_above: '≥',
  price_below: '≤',
  rsi_above: 'RSI ≥',
  rsi_below: 'RSI ≤',
  volume_spike: 'Vol ×',
};

// ── Mini bar chart ────────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const H = 44;
  const bw = 8;
  const gap = 4;
  const W = data.length * (bw + gap) - gap;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {data.map((v, i) => {
        const bh = Math.max(3, (v / max) * (H - 4));
        const isLatest = i === data.length - 1;
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={H - bh}
            width={bw}
            height={bh}
            rx={3}
            fill={isLatest ? '#02559F' : 'rgba(2,85,159,0.18)'}
          />
        );
      })}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  // 1. DB queries
  const [allTrades, activeAlerts] = await Promise.all([
    prisma.trade.findMany({
      where: { portfolio: { userId } },
      include: { portfolio: { select: { name: true } } },
      orderBy: { executedAt: 'desc' },
    }),
    prisma.alert.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // 2. Aggregate open positions
  type PosAgg = { qty: number; totalCost: number };
  const posMap: Record<string, PosAgg> = {};
  for (const t of allTrades) {
    if (!posMap[t.symbol]) posMap[t.symbol] = { qty: 0, totalCost: 0 };
    const sign = t.type === 'BUY' ? 1 : -1;
    posMap[t.symbol].qty += sign * t.quantity;
    posMap[t.symbol].totalCost += sign * t.price * t.quantity;
  }
  const openEntries = Object.entries(posMap)
    .filter(([, v]) => v.qty > 0.0001)
    .slice(0, 8);

  // 3. Live prices from Finnhub for open positions
  const token = process.env.FINNHUB_API_KEY;
  const priceMap: Record<string, number> = {};
  await Promise.all(
    openEntries.map(async ([symbol]) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`,
          { cache: 'no-store' },
        );
        const d = await res.json();
        priceMap[symbol] = d.c ?? 0;
      } catch {
        priceMap[symbol] = 0;
      }
    }),
  );

  const positions = openEntries.map(([symbol, { qty, totalCost }]) => {
    const cur = priceMap[symbol] ?? 0;
    const avgEntry = totalCost / qty;
    const curValue = cur * qty;
    const pl = curValue - totalCost;
    const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0;
    return { symbol, qty, avgEntry, cur, curValue, pl, plPct };
  });

  const totalValue = positions.reduce((s, p) => s + p.curValue, 0);
  const totalInvested = positions.reduce((s, p) => s + p.qty * p.avgEntry, 0);
  const totalPL = totalValue - totalInvested;
  const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  // 4. Mini chart: cumulative invested amount at end of each of last 7 months
  const now = new Date();
  const barData: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const cumul = allTrades
      .filter((t) => new Date(t.executedAt) <= cutoff)
      .reduce((s, t) => s + (t.type === 'BUY' ? 1 : -1) * t.price * t.quantity, 0);
    barData.push(Math.max(0, cumul));
  }

  // 5. Date
  const rawDate = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateStr = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  const recentTrades = allTrades.slice(0, 8);
  const firstName = session?.user?.name?.split(' ')[0] ?? '';

  return (
    <div className="min-h-full p-6 space-y-5" style={{ background: '#EEF4FA' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>
            Bonjour, {firstName} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7a9bbf' }}>
            Voici l&apos;aperçu de votre portefeuille
          </p>
          <p className="text-xs mt-1 font-medium capitalize" style={{ color: '#7a9bbf' }}>
            {dateStr}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.62)',
              border: '0.5px solid rgba(255,255,255,0.9)',
              boxShadow: '0 1px 3px rgba(2,85,159,0.08)',
            }}
          >
            <Bell className="w-4 h-4" style={{ color: '#02559F' }} />
          </div>
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt="avatar"
              width={36}
              height={36}
              className="rounded-full object-cover ring-2 ring-white/80"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: '#02559F' }}
            >
              {session?.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
      </div>

      {/* ── Hero card ────────────────────────────────────────────────────────── */}
      <div style={HERO} className="p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7a9bbf' }}>
              Valeur totale du portefeuille
            </p>
            <div>
              <p className="text-4xl font-bold tracking-tight" style={{ color: '#013B72' }}>
                {totalValue > 0 ? fmt(totalValue) : '—'}
              </p>

              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {totalValue > 0 && (
                  <>
                    <div className="flex items-center gap-1.5">
                      {totalPL >= 0 ? (
                        <TrendingUp className="w-4 h-4" style={{ color: '#16a34a' }} />
                      ) : (
                        <TrendingDown className="w-4 h-4" style={{ color: '#E24B4A' }} />
                      )}
                      <span
                        className="text-sm font-semibold"
                        style={{ color: totalPL >= 0 ? '#16a34a' : '#E24B4A' }}
                      >
                        {fmt(totalPL)}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                        style={{
                          background: totalPL >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(226,75,74,0.1)',
                          color: totalPL >= 0 ? '#16a34a' : '#E24B4A',
                        }}
                      >
                        {fmtPct(totalPLPct)}
                      </span>
                    </div>

                    <div className="h-4 w-px" style={{ background: 'rgba(2,85,159,0.12)' }} />
                  </>
                )}

                <div>
                  <span className="text-xs" style={{ color: '#7a9bbf' }}>Investi </span>
                  <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                    {totalInvested > 0 ? fmt(totalInvested) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-xs" style={{ color: '#7a9bbf' }}>Positions ouvertes </span>
                  <span className="text-sm font-semibold" style={{ color: '#02559F' }}>
                    {positions.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <p className="text-xs font-medium" style={{ color: '#7a9bbf' }}>
              Investi · 7 derniers mois
            </p>
            <MiniBarChart data={barData} />
          </div>
        </div>
      </div>

      {/* ── 3-column grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Watchlist — client component */}
        <WatchlistCard />

        {/* Positions actives */}
        <div style={GLASS} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7a9bbf' }}>
              Positions actives
            </p>
            <Link href="/portfolio">
              <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#02559F' }} />
            </Link>
          </div>

          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm" style={{ color: '#7a9bbf' }}>Aucune position ouverte</p>
              <Link
                href="/portfolio"
                className="text-xs mt-2 font-semibold"
                style={{ color: '#02559F' }}
              >
                Commencer →
              </Link>
            </div>
          ) : (
            <div className="space-y-0.5">
              {positions.map((p) => (
                <div
                  key={p.symbol}
                  className="flex items-center justify-between px-2.5 py-2.5 rounded-xl hover:bg-white/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(2,85,159,0.08)', color: '#02559F' }}
                    >
                      {p.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                        {p.symbol}
                      </p>
                      <p className="text-xs" style={{ color: '#7a9bbf' }}>
                        {p.qty.toFixed(4)} × ${p.avgEntry.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold" style={{ color: '#0F172A' }}>
                      {p.cur > 0 ? `$${p.cur.toFixed(2)}` : '—'}
                    </p>
                    <p
                      className="text-xs font-mono font-semibold"
                      style={{ color: p.plPct >= 0 ? '#16a34a' : '#E24B4A' }}
                    >
                      {p.cur > 0 ? fmtPct(p.plPct) : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertes actives */}
        <div style={GLASS} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7a9bbf' }}>
              Alertes actives
            </p>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(2,85,159,0.08)', color: '#02559F' }}
            >
              {activeAlerts.length}
            </span>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm" style={{ color: '#7a9bbf' }}>Aucune alerte configurée</p>
              <Link
                href="/agent"
                className="text-xs mt-2 font-semibold"
                style={{ color: '#02559F' }}
              >
                Créer via l&apos;agent IA →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'rgba(2,85,159,0.04)',
                    border: '0.5px solid rgba(2,85,159,0.08)',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(2,85,159,0.1)' }}
                  >
                    <AlertTriangle className="w-3 h-3" style={{ color: '#02559F' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                      {alert.symbol}{' '}
                      <span style={{ color: '#7a9bbf' }}>
                        {CONDITION_LABELS[alert.condition] ?? alert.condition}
                      </span>{' '}
                      <span style={{ color: '#02559F' }}>{alert.threshold}</span>
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#7a9bbf' }}>
                      {alert.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Transactions récentes ────────────────────────────────────────────── */}
      <div style={GLASS} className="p-5">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7a9bbf' }}>
            Transactions récentes
          </p>
          <Link
            href="/portfolio"
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: '#02559F' }}
          >
            Voir tout <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <p className="text-sm" style={{ color: '#7a9bbf' }}>Aucune transaction pour le moment</p>
            <Link
              href="/portfolio"
              className="text-xs mt-2 font-semibold"
              style={{ color: '#02559F' }}
            >
              Créer un portefeuille →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Type', 'Symbole', 'Quantité', 'Prix', 'Valeur', 'Date'].map((col) => (
                    <th
                      key={col}
                      className="text-left pb-3 pr-4 text-xs font-semibold whitespace-nowrap"
                      style={{ color: '#7a9bbf' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade, i) => (
                  <tr
                    key={trade.id}
                    style={{
                      borderTop: i > 0 ? '0.5px solid rgba(2,85,159,0.07)' : 'none',
                    }}
                  >
                    <td className="py-3 pr-4">
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-bold"
                        style={{
                          background:
                            trade.type === 'BUY'
                              ? 'rgba(2,85,159,0.08)'
                              : 'rgba(226,75,74,0.08)',
                          color: trade.type === 'BUY' ? '#02559F' : '#E24B4A',
                        }}
                      >
                        {trade.type === 'BUY' ? 'ACHAT' : 'VENTE'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                        {trade.symbol}
                      </p>
                      <p className="text-xs" style={{ color: '#7a9bbf' }}>
                        {trade.portfolio.name}
                      </p>
                    </td>
                    <td
                      className="py-3 pr-4 text-sm font-mono"
                      style={{ color: '#0F172A' }}
                    >
                      {trade.quantity.toFixed(4)}
                    </td>
                    <td
                      className="py-3 pr-4 text-sm font-mono"
                      style={{ color: '#0F172A' }}
                    >
                      ${trade.price.toFixed(2)}
                    </td>
                    <td
                      className="py-3 pr-4 text-sm font-mono font-semibold"
                      style={{ color: '#013B72' }}
                    >
                      ${(trade.price * trade.quantity).toFixed(2)}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <div
                        className="flex items-center gap-1 text-xs"
                        style={{ color: '#7a9bbf' }}
                      >
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {new Date(trade.executedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
