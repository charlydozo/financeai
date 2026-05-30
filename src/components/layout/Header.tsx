'use client';

import { useSession, signOut } from 'next-auth/react';
import { Bell, ChevronDown, LogOut, Settings, CreditCard, Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

export function Header() {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-16 flex-shrink-0 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-lg transition-colors"
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-900 rounded-lg transition-colors"
          >
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? 'Avatar'}
                width={28}
                height={28}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 bg-brand-500/20 rounded-full flex items-center justify-center">
                <span className="text-brand-400 text-xs font-bold">
                  {session?.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-300 font-medium hidden sm:block">
              {session?.user?.name?.split(' ')[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl shadow-black/40 py-1 z-50">
              <div className="px-4 py-2.5 border-b border-gray-800">
                <p className="text-sm font-semibold text-white truncate">{session?.user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{session?.user?.email}</p>
              </div>
              <Link
                href="/upgrade"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Abonnement
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
