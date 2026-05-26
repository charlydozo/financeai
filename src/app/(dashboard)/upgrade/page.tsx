'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/trpc/react';
import {
  Crown,
  Check,
  Brain,
  Bot,
  TrendingUp,
  Zap,
  Shield,
  Headphones,
  CreditCard,
} from 'lucide-react';

const PRO_FEATURES = [
  { icon: TrendingUp, label: 'Données de marché en temps réel' },
  { icon: Brain, label: 'Stratégies de trading algorithmiques' },
  { icon: Bot, label: 'Agent IA financier personnalisé' },
  { icon: Zap, label: 'Alertes et notifications avancées' },
  { icon: Shield, label: 'Analyse de risque portefeuille' },
  { icon: Headphones, label: 'Support prioritaire 24/7' },
];

const FREE_FEATURES = [
  'Dashboard basique',
  'Données de marché (délai 15 min)',
  '1 portefeuille',
  'Historique 30 jours',
];

function UpgradeContent() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const isPro = session?.user?.subscriptionPlan === 'PRO';

  // Refresh session token après upgrade réussi
  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      update();
    }
  }, [searchParams, update]);

  const checkout = api.subscription.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
  });

  const portal = api.subscription.createBillingPortal.useMutation({
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
  });

  if (isPro) {
    return (
      <div className="p-6 flex items-center justify-center min-h-full">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex p-4 bg-amber-500/10 rounded-2xl">
            <Crown className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Vous êtes PRO ✦</h1>
            <p className="text-gray-400 mt-2 text-sm">
              Toutes les fonctionnalités avancées sont débloquées.
            </p>
          </div>
          <button
            onClick={() => portal.mutate()}
            disabled={portal.isLoading}
            className="flex items-center justify-center gap-2 w-full py-3 px-6 border border-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:border-gray-500 hover:text-white transition-colors disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            {portal.isLoading ? 'Redirection...' : 'Gérer mon abonnement'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-full">
      <div className="max-w-4xl w-full space-y-8">
        {/* En-tête */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-amber-500/10 rounded-2xl">
            <Crown className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Passez à PRO</h1>
          <p className="text-gray-400 max-w-md mx-auto">
            Débloquez toutes les fonctionnalités de trading avancées et boostez vos performances.
          </p>
        </div>

        {/* Comparaison plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan FREE */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Gratuit
              </span>
              <div className="mt-2">
                <span className="text-3xl font-bold text-white">0 €</span>
                <span className="text-gray-500 ml-1">/mois</span>
              </div>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-400">
                  <Check className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <div className="w-full py-2.5 text-center rounded-xl border border-gray-800 text-gray-500 text-sm font-medium">
                Plan actuel
              </div>
            </div>
          </div>

          {/* Plan PRO */}
          <div className="bg-gradient-to-b from-brand-950/40 to-brand-900/40 border border-brand-500/30 rounded-2xl p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-brand-500 rounded-bl-xl text-xs font-bold text-white">
              RECOMMANDÉ
            </div>
            <div>
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                PRO ✦
              </span>
              <div className="mt-2">
                <span className="text-3xl font-bold text-white">29 €</span>
                <span className="text-gray-400 ml-1">/mois</span>
              </div>
            </div>
            <ul className="space-y-2.5">
              {PRO_FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <div className="w-5 h-5 bg-brand-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-brand-400" />
                  </div>
                  {label}
                </li>
              ))}
            </ul>
            <button
              onClick={() => checkout.mutate()}
              disabled={checkout.isLoading}
              className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkout.isLoading ? 'Redirection vers Stripe...' : 'Commencer maintenant'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600">
          Paiement sécurisé par Stripe · Annulable à tout moment · Sans engagement
        </p>
      </div>
    </div>
  );
}

// Suspense requis par Next.js 14 : useSearchParams() ne peut pas être appelé
// pendant le prerender sans boundary explicite.
export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}
