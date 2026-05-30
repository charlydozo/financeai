import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { WatchlistCard } from './WatchlistCard';
import { deleteAlert } from './actions';

export const metadata: Metadata = { title: 'Dashboard' };

// Load client-only components with ssr:false to prevent Chart.js / useSession SSR issues
const BarChartWidget = dynamic(
  () => import('./BarChartWidget').then((m) => m.BarChartWidget),
  { ssr: false },
);
const FloatingChat = dynamic(
  () => import('./FloatingChat').then((m) => m.FloatingChat),
  { ssr: false },
);

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const CONDITION_LABELS: Record<string, string> = {
  price_above: '≥',
  price_below: '≤',
  rsi_above:   'RSI ≥',
  rsi_below:   'RSI ≤',
  volume_spike:'Vol ×',
};

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
};

const HERO: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 20,
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [allTrades, activeAlerts, dbUser] = await Promise.all([
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
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
  ]);

  // Aggregate open positions
  type PosAgg = { qty: number; totalCost: number };
  const posMap: Record<string, PosAgg> = {};
  for (const t of allTrades) {
    if (!posMap[t.symbol]) posMap[t.symbol] = { qty: 0, totalCost: 0 };
    const sign = t.type === 'BUY' ? 1 : -1;
    posMap[t.symbol].qty += sign * t.quantity;
    posMap[t.symbol].totalCost += sign * t.price * t.quantity;
  }
  const openEntries = Object.entries(posMap).filter(([, v]) => v.qty > 0.0001).slice(0, 8);

  // Live prices from Finnhub
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

  const totalValue    = positions.reduce((s, p) => s + p.curValue, 0);
  const totalInvested = positions.reduce((s, p) => s + p.qty * p.avgEntry, 0);
  const totalPL       = totalValue - totalInvested;
  const totalPLPct    = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  // 7-month bar chart data
  const now = new Date();
  const barLabels: string[] = [];
  const barValues: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    barLabels.push(d.toLocaleDateString('fr-FR', { month: 'short' }));
    const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const cumul = allTrades
      .filter((t) => new Date(t.executedAt) <= cutoff)
      .reduce((s, t) => s + (t.type === 'BUY' ? 1 : -1) * t.price * t.quantity, 0);
    barValues.push(Math.max(0, cumul));
  }

  const recentTrades = allTrades.slice(0, 8);
  const firstName = dbUser?.name?.split(' ')[0] ?? '';

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%' }}>

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div style={{ ...HERO, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
              Valeur totale du portefeuille
            </p>
            <p style={{ fontSize: 34, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', lineHeight: 1.1, marginBottom: 14 }}>
              {totalValue > 0 ? fmt(totalValue) : '—'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {totalValue > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i
                      className={`ti ti-trending-${totalPL >= 0 ? 'up' : 'down'}`}
                      style={{ fontSize: 15, color: totalPL >= 0 ? 'var(--green)' : 'var(--red)' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: totalPL >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                      {fmt(totalPL)}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600, fontFamily: 'var(--font-mono)', background: totalPL >= 0 ? 'rgba(52,199,142,0.12)' : 'rgba(240,85,85,0.12)', color: totalPL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtPct(totalPLPct)}
                    </span>
                  </div>
                  <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
                </>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Investi{' '}
                <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {totalInvested > 0 ? fmt(totalInvested) : '—'}
                </strong>
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Positions{' '}
                <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  {positions.length}
                </strong>
              </span>
            </div>
          </div>

          {/* Right — Chart.js bar chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textAlign: 'right', margin: 0 }}>
              Investi · 7 mois
            </p>
            <div style={{ width: 180, height: 64 }}>
              <BarChartWidget labels={barLabels} values={barValues} />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-column grid ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>

        {/* Watchlist */}
        <WatchlistCard />

        {/* Positions actives */}
        <div style={{ ...CARD, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', margin: 0 }}>
              Positions actives
            </p>
            <Link href="/portfolio" style={{ color: 'var(--accent)', display: 'flex' }}>
              <i className="ti ti-arrow-up-right" style={{ fontSize: 15 }} />
            </Link>
          </div>

          {positions.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center', gap: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Aucune position ouverte</p>
              <Link href="/portfolio" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Commencer →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {positions.map((p) => (
                <div key={p.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {p.symbol.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{p.symbol}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontFamily: 'var(--font-mono)' }}>{p.qty.toFixed(4)} × ${p.avgEntry.toFixed(2)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-mono)' }}>{p.cur > 0 ? `$${p.cur.toFixed(2)}` : '—'}</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: p.plPct >= 0 ? 'var(--green)' : 'var(--red)', margin: 0, fontFamily: 'var(--font-mono)' }}>{p.cur > 0 ? fmtPct(p.plPct) : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertes actives */}
        <div style={{ ...CARD, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', margin: 0 }}>
              Alertes actives
            </p>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {activeAlerts.length}
            </span>
          </div>

          {activeAlerts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center', gap: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Aucune alerte configurée</p>
              <Link href="/agent" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Créer via l&apos;agent IA →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeAlerts.map((alert) => (
                <div key={alert.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--border)' }}>
                  <i className="ti ti-bell" style={{ fontSize: 14, color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                      {alert.symbol}{' '}
                      <span style={{ color: 'var(--text-3)' }}>{CONDITION_LABELS[alert.condition] ?? alert.condition}</span>{' '}
                      <span style={{ color: 'var(--accent)' }}>{alert.threshold}</span>
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alert.action}
                    </p>
                  </div>
                  <form action={deleteAlert}>
                    <input type="hidden" name="alertId" value={alert.id} />
                    <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2, borderRadius: 4 }} title="Supprimer">
                      <i className="ti ti-x" style={{ fontSize: 13 }} />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Transactions récentes ──────────────────────────────────────────── */}
      <div style={{ ...CARD, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', margin: 0 }}>
            Transactions récentes
          </p>
          <Link href="/portfolio" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <i className="ti ti-arrow-up-right" style={{ fontSize: 13 }} />
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Aucune transaction pour le moment</p>
            <Link href="/portfolio" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Créer un portefeuille →</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Type', 'Symbole', 'Quantité', 'Prix', 'Valeur', 'Date'].map((col) => (
                    <th key={col} style={{ textAlign: 'left', paddingBottom: 12, paddingRight: 16, fontSize: 11, fontWeight: 700, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade, i) => (
                  <tr key={trade.id} style={{ borderTop: i > 0 ? `1px solid var(--border)` : 'none' }}>
                    <td style={{ padding: '12px 16px 12px 0' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: trade.type === 'BUY' ? 'var(--accent-dim)' : 'rgba(240,85,85,0.12)', color: trade.type === 'BUY' ? 'var(--accent)' : 'var(--red)' }}>
                        {trade.type === 'BUY' ? 'ACHAT' : 'VENTE'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px 12px 0' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{trade.symbol}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{trade.portfolio.name}</p>
                    </td>
                    <td style={{ padding: '12px 16px 12px 0', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{trade.quantity.toFixed(4)}</td>
                    <td style={{ padding: '12px 16px 12px 0', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>${trade.price.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px 12px 0', fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>${(trade.price * trade.quantity).toFixed(2)}</td>
                    <td style={{ padding: '12px 0', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        <i className="ti ti-clock" style={{ fontSize: 12 }} />
                        {new Date(trade.executedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Spacer pour le bouton flottant */}
      <div style={{ height: 72 }} />

      {/* Chatbox flottante Agent Charly */}
      <FloatingChat />
    </div>
  );
}
