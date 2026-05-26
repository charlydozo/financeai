import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TrendingUp, TrendingDown, Briefcase, Activity, Crown } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const isPro = session!.user.subscriptionPlan === 'PRO';

  const [portfolioCount, tradeCount, recentTrades] = await Promise.all([
    prisma.portfolio.count({ where: { userId } }),
    prisma.trade.count({ where: { portfolio: { userId } } }),
    prisma.trade.findMany({
      where: { portfolio: { userId } },
      orderBy: { executedAt: 'desc' },
      take: 5,
      include: { portfolio: { select: { name: true } } },
    }),
  ]);

  const stats = [
    { label: 'Portefeuilles', value: portfolioCount, icon: Briefcase, sub: 'actifs' },
    { label: 'Transactions', value: tradeCount, icon: Activity, sub: 'au total' },
    { label: 'P&L du jour', value: '+2,4 %', icon: TrendingUp, sub: 'simulé', positive: true },
    { label: 'Rendement total', value: '+18,7 %', icon: TrendingUp, sub: 'simulé', positive: true },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bonjour, {session?.user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Voici un aperçu de votre activité</p>
        </div>
        {isPro && (
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-400">
            ✦ PRO
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">{stat.label}</span>
              <stat.icon
                className={`w-4 h-4 ${stat.positive ? 'text-brand-500' : 'text-gray-600'}`}
              />
            </div>
            <div>
              <p
                className={`text-2xl font-bold ${stat.positive ? 'text-brand-400' : 'text-white'}`}
              >
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activité récente */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Transactions récentes</h2>
          {recentTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="w-8 h-8 text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Aucune transaction</p>
              <Link
                href="/portfolio"
                className="mt-3 text-xs text-brand-400 hover:underline"
              >
                Créer un portefeuille →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        trade.type === 'BUY'
                          ? 'bg-brand-500/10 text-brand-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {trade.type === 'BUY' ? 'ACHAT' : 'VENTE'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{trade.symbol}</p>
                      <p className="text-xs text-gray-500">{trade.portfolio.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {trade.quantity} × {trade.price.toFixed(2)} €
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(trade.executedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accès rapide */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-white mb-4">Accès rapide</h2>
          <Link
            href="/portfolio"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Briefcase className="w-4 h-4 text-brand-400" />
            <span className="text-sm text-gray-300">Mes portefeuilles</span>
          </Link>
          <Link
            href="/market"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">Explorer le marché</span>
          </Link>
          {!isPro && (
            <Link
              href="/upgrade"
              className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-brand-500/10 to-brand-400/10 border border-brand-500/20 hover:border-brand-500/40 transition-colors mt-2"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-brand-400 font-medium">Passer à PRO</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
