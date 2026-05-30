'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

const navItems = [
  { label: 'Dashboard',    href: '/dashboard',  icon: 'layout-dashboard' },
  { label: 'Marché',       href: '/market',     icon: 'trending-up' },
  { label: 'Portefeuille', href: '/portfolio',  icon: 'briefcase' },
  { label: 'Stratégies',   href: '/strategies', icon: 'brain', proOnly: true },
  { label: 'Agent IA',     href: '/agent',      icon: 'robot', proOnly: true },
];

const bottomItems = [
  { label: 'Profil',       href: '/profil',     icon: 'user-circle' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isPro = session?.user?.subscriptionPlan === 'PRO';

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: 50,
    }}>
      {/* Logo */}
      <Link
        href="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 'var(--topbar-h)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <Image
          src="/logo.png"
          alt="Dozanta"
          width={28}
          height={28}
          style={{ borderRadius: 8, objectFit: 'contain' }}
        />
      </Link>

      {/* Main nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 8, width: '100%', alignItems: 'center' }}>
        {navItems.map((item) => {
          const locked = item.proOnly && !isPro;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const href = locked ? '/upgrade' : item.href;

          return (
            <Link
              key={item.href}
              href={href}
              className="nav-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 10,
                color: active ? 'var(--accent)' : 'var(--text-2)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
                textDecoration: 'none',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
                }
              }}
            >
              <i className={`ti ti-${item.icon}`} style={{ fontSize: 20 }} />
              {locked && (
                <i className="ti ti-lock" style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  fontSize: 9,
                  color: 'var(--text-3)',
                }} />
              )}
              <span className="tooltip">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 12, width: '100%', alignItems: 'center' }}>
        {bottomItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="nav-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 10,
                color: active ? 'var(--accent)' : 'var(--text-2)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
                textDecoration: 'none',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
                }
              }}
            >
              <i className={`ti ti-${item.icon}`} style={{ fontSize: 20 }} />
              <span className="tooltip">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
