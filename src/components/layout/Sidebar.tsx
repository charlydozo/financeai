'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

const mainNav = [
  { label: 'Dashboard',    href: '/dashboard',  icon: 'layout-dashboard', proOnly: false },
  { label: 'Marché',       href: '/market',     icon: 'trending-up',      proOnly: false },
  { label: 'Portefeuille', href: '/portfolio',  icon: 'briefcase',        proOnly: false },
  { label: 'Stratégies',   href: '/strategies', icon: 'brain',            proOnly: true  },
  { label: 'Agent IA',     href: '/agent',      icon: 'robot',            proOnly: true  },
];

const bottomNav = [
  { label: 'Profil', href: '/profil', icon: 'user-circle', proOnly: false },
];

function NavLink({
  href,
  icon,
  label,
  active,
  locked,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  locked: boolean;
}) {
  return (
    <Link
      href={href}
      className="nav-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 10,
        textDecoration: 'none',
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-3)',
        transition: 'background 0.15s, color 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--border)';
          el.style.color = 'var(--text-2)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'transparent';
          el.style.color = 'var(--text-3)';
        }
      }}
    >
      <i className={`ti ti-${icon}`} style={{ fontSize: 20 }} />
      {locked && (
        <i
          className="ti ti-lock"
          style={{
            position: 'absolute',
            bottom: 5,
            right: 5,
            fontSize: 9,
            color: 'var(--text-3)',
          }}
        />
      )}
      <span className="nav-tooltip">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isPro = session?.user?.subscriptionPlan === 'PRO';

  return (
    <aside
      style={{
        width: 60,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 56,
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
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          paddingTop: 10,
        }}
      >
        {mainNav.map((item) => {
          const locked = item.proOnly && !isPro;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavLink
              key={item.href}
              href={locked ? '/upgrade' : item.href}
              icon={item.icon}
              label={item.label}
              active={active}
              locked={locked}
            />
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          paddingBottom: 14,
        }}
      >
        {bottomNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={active}
              locked={false}
            />
          );
        })}
      </div>
    </aside>
  );
}
