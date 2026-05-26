'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  Brain,
  Bot,
  Lock,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, proOnly: false },
  { label: 'Marché', href: '/market', icon: TrendingUp, proOnly: false },
  { label: 'Portefeuille', href: '/portfolio', icon: Briefcase, proOnly: false },
  { label: 'Stratégies', href: '/strategies', icon: Brain, proOnly: true },
  { label: 'Agent IA', href: '/agent', icon: Bot, proOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isPro = session?.user?.subscriptionPlan === 'PRO';

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Dozanta" width={32} height={32} className="rounded-lg object-contain" />
          <span className="text-white font-bold text-lg tracking-tight">Dozanta</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const locked = item.proOnly && !isPro;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (locked) {
            return (
              <Link
                key={item.href}
                href="/upgrade"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-900 hover:text-gray-400 transition-colors group"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                <Lock className="w-3 h-3 opacity-60" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                active
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-gray-400 hover:bg-gray-900 hover:text-white',
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* CTA upgrade pour les comptes FREE */}
      {!isPro && (
        <div className="p-4 border-t border-gray-800">
          <Link
            href="/upgrade"
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-brand-500/10 to-brand-400/10 border border-brand-500/20 rounded-xl hover:border-brand-500/40 transition-all"
          >
            <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-400">Passer à PRO</p>
              <p className="text-xs text-gray-500 truncate">Débloquer toutes les fonctions</p>
            </div>
          </Link>
        </div>
      )}

      {/* Badge plan actuel */}
      <div className="px-4 pb-4">
        <div
          className={cn(
            'px-3 py-1.5 rounded-lg text-center text-xs font-semibold',
            isPro
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-gray-800 text-gray-500',
          )}
        >
          {isPro ? '✦ PRO' : 'Plan Gratuit'}
        </div>
      </div>
    </aside>
  );
}
