'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function formatDate() {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

const BTN: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  color: 'var(--text-3)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function Header() {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [dateStr, setDateStr] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Resolve on client to avoid hydration mismatch
  useEffect(() => {
    setGreeting(getGreeting());
    setDateStr(formatDate());
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const name = session?.user?.name ?? '';
  const firstName = name.split(' ')[0];
  const initials = name
    ? name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : (session?.user?.email?.[0]?.toUpperCase() ?? '?');

  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}
    >
      {/* Greeting + date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.2,
          }}
        >
          {greeting}{firstName ? `, ${firstName}` : ','}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)',
            textTransform: 'capitalize',
            letterSpacing: '0.02em',
          }}
        >
          {dateStr}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          style={BTN}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
        >
          <i className={`ti ti-${theme === 'dark' ? 'sun' : 'moon'}`} style={{ fontSize: 18 }} />
        </button>

        {/* Bell */}
        <button
          style={BTN}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
        >
          <i className="ti ti-bell" style={{ fontSize: 18 }} />
        </button>

        {/* Avatar dropdown */}
        <div ref={menuRef} style={{ position: 'relative', marginLeft: 4 }}>
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            {initials}
          </button>

          {open && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: 200,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                zIndex: 60,
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {name || 'Utilisateur'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session?.user?.email}
                </p>
              </div>
              {[
                { href: '/upgrade', icon: 'credit-card', label: 'Abonnement' },
                { href: '/profil',  icon: 'user-circle', label: 'Mon profil' },
              ].map(({ href, icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--border)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <i className={`ti ti-${icon}`} style={{ fontSize: 15 }} />
                  {label}
                </Link>
              ))}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--border)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <i className="ti ti-logout" style={{ fontSize: 15 }} />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
