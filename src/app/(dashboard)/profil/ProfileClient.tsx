'use client';

import { useState, useTransition, useEffect } from 'react';
import { updateProfile } from './actions';
import {
  Check,
  Crown,
  Shield,
  Bell,
  Globe,
  ChevronDown,
  KeyRound,
  Smartphone,
  Mail,
  Calendar,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserData {
  name: string | null;
  email: string;
  image: string | null;
  memberSince: string;
}

interface SubscriptionData {
  plan: string;
  currentPeriodEnd: string | null;
}

type Tab = 'informations' | 'plan' | 'securite' | 'preferences';

// ── Styles ────────────────────────────────────────────────────────────────────

const GLASS: CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '0.5px solid rgba(255,255,255,0.9)',
  borderRadius: '20px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(2,85,159,0.06)',
};

const INPUT: CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  border: '0.5px solid rgba(2,85,159,0.18)',
  borderRadius: '12px',
  color: '#0F172A',
  padding: '10px 14px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
};

const INPUT_DISABLED: CSSProperties = {
  ...INPUT,
  background: 'rgba(2,85,159,0.04)',
  color: '#7a9bbf',
  cursor: 'not-allowed',
};

const SELECT: CSSProperties = {
  ...INPUT,
  appearance: 'none' as const,
  cursor: 'pointer',
  paddingRight: '36px',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#7a9bbf' }}>
      {children}
    </p>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#0F172A' }}>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none"
      style={{ background: checked ? '#02559F' : 'rgba(2,85,159,0.15)' }}
    >
      <span
        className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: `translateX(${checked ? '18px' : '2px'})`, marginTop: '2px' }}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '0.5px solid rgba(2,85,159,0.07)' }}>
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium" style={{ color: disabled ? '#7a9bbf' : '#0F172A' }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: '#7a9bbf' }}>
            {description}
          </p>
        )}
      </div>
      <div style={{ opacity: disabled ? 0.4 : 1 }}>
        <Toggle checked={checked} onChange={disabled ? () => {} : onChange} />
      </div>
    </div>
  );
}

// ── Preferences default ───────────────────────────────────────────────────────

const DEFAULT_PREFS = {
  alertesPrix: true,
  executionOrdres: true,
  resumeQuotidien: false,
  actualites: true,
  langue: 'fr',
  devise: 'USD',
  fuseau: 'Europe/Paris',
};

// ── Main component ────────────────────────────────────────────────────────────

export function ProfileClient({
  user,
  subscription,
}: {
  user: UserData;
  subscription: SubscriptionData;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('informations');

  // Informations state
  const nameParts = (user.name ?? '').split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] ?? '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' '));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Preferences state (localStorage)
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dozanta-preferences');
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  // Derived
  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((s) => s[0])
      .join('')
      .toUpperCase() || user.email.charAt(0).toUpperCase();

  const isPro = subscription.plan === 'PRO';
  const memberDate = new Date(user.memberSince).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const renewalDate = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Handlers
  const handleSaveProfile = () => {
    setSaveError('');
    const fd = new FormData();
    fd.append('firstName', firstName);
    fd.append('lastName', lastName);
    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result?.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setSaveError(result?.error ?? 'Erreur lors de la sauvegarde');
      }
    });
  };

  const togglePref = (key: keyof typeof prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    localStorage.setItem('dozanta-preferences', JSON.stringify(updated));
  };

  const updatePrefSelect = (key: keyof typeof prefs, value: string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    localStorage.setItem('dozanta-preferences', JSON.stringify(updated));
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'informations', label: 'Informations' },
    { id: 'plan', label: 'Plan' },
    { id: 'securite', label: 'Sécurité' },
    { id: 'preferences', label: 'Préférences' },
  ];

  return (
    <div className="min-h-full p-6 space-y-6" style={{ background: '#EEF4FA' }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Mon profil</h1>
        <p className="text-sm mt-0.5" style={{ color: '#7a9bbf' }}>
          Gérez vos informations personnelles et préférences
        </p>
      </div>

      {/* ── Tab pills ────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'rgba(255,255,255,0.5)',
          borderRadius: '24px',
          padding: '4px',
          display: 'inline-flex',
          gap: '2px',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              borderRadius: '20px',
              padding: '7px 18px',
              fontSize: '13px',
              fontWeight: 500,
              background: activeTab === tab.id ? 'rgba(2,85,159,0.12)' : 'transparent',
              color: activeTab === tab.id ? '#02559F' : '#7a9bbf',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Informations ─────────────────────────────────────────────────────── */}
      {activeTab === 'informations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Avatar card */}
          <div style={GLASS} className="p-6 flex flex-col items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white select-none"
              style={{ background: 'linear-gradient(135deg, #02559F 0%, #013B72 100%)' }}
            >
              {initials}
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                {[firstName, lastName].filter(Boolean).join(' ') || '—'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#7a9bbf' }}>{user.email}</p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: isPro ? 'rgba(245,158,11,0.1)' : 'rgba(2,85,159,0.08)',
                color: isPro ? '#b45309' : '#02559F',
              }}
            >
              {isPro ? <Crown className="w-3 h-3" /> : null}
              {isPro ? 'PRO' : 'Plan Gratuit'}
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#7a9bbf' }}>
              <Calendar className="w-3 h-3" />
              Membre depuis {memberDate}
            </div>
          </div>

          {/* Form card */}
          <div style={GLASS} className="p-6 lg:col-span-2 space-y-5">
            <SectionTitle>Informations personnelles</SectionTitle>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Prénom</Label>
                <input
                  style={INPUT}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  className="transition-all focus:ring-0"
                  onFocus={(e) => (e.target.style.border = '0.5px solid rgba(2,85,159,0.5)')}
                  onBlur={(e) => (e.target.style.border = '0.5px solid rgba(2,85,159,0.18)')}
                />
              </div>
              <div>
                <Label>Nom</Label>
                <input
                  style={INPUT}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Votre nom"
                  onFocus={(e) => (e.target.style.border = '0.5px solid rgba(2,85,159,0.5)')}
                  onBlur={(e) => (e.target.style.border = '0.5px solid rgba(2,85,159,0.18)')}
                />
              </div>
            </div>

            <div>
              <Label>Adresse email</Label>
              <div className="relative">
                <input style={INPUT_DISABLED} value={user.email} readOnly />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#7a9bbf' }} />
              </div>
              <p className="text-xs mt-1" style={{ color: '#7a9bbf' }}>
                L&apos;email ne peut pas être modifié — il est lié à votre méthode de connexion.
              </p>
            </div>

            {saveError && (
              <p className="text-xs font-medium" style={{ color: '#E24B4A' }}>{saveError}</p>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveProfile}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{
                  background: saved ? '#16a34a' : 'linear-gradient(135deg, #02559F 0%, #013B72 100%)',
                  boxShadow: '0 2px 8px rgba(2,85,159,0.3)',
                }}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {isPending ? 'Sauvegarde…' : saved ? 'Enregistré !' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-3xl">
          {/* Plan actuel */}
          <div style={GLASS} className="p-6 space-y-5">
            <SectionTitle>Plan actuel</SectionTitle>

            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{
                background: isPro ? 'rgba(245,158,11,0.06)' : 'rgba(2,85,159,0.05)',
                border: `0.5px solid ${isPro ? 'rgba(245,158,11,0.2)' : 'rgba(2,85,159,0.12)'}`,
              }}
            >
              <div className="flex items-center gap-3">
                {isPro ? (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <Crown className="w-4 h-4" style={{ color: '#b45309' }} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(2,85,159,0.1)' }}>
                    <span className="text-xs font-bold" style={{ color: '#02559F' }}>F</span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm" style={{ color: '#0F172A' }}>
                    {isPro ? 'Plan PRO' : 'Plan Gratuit'}
                  </p>
                  <p className="text-xs" style={{ color: '#7a9bbf' }}>
                    {isPro ? '29 € / mois' : 'Gratuit'}
                  </p>
                </div>
              </div>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: isPro ? 'rgba(245,158,11,0.15)' : 'rgba(2,85,159,0.1)',
                  color: isPro ? '#b45309' : '#02559F',
                }}
              >
                ACTIF
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Tarif', value: isPro ? '29 € / mois' : 'Gratuit' },
                {
                  label: isPro ? 'Renouvellement' : 'Mise à niveau',
                  value: isPro
                    ? (renewalDate ?? '—')
                    : 'Disponible',
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#7a9bbf' }}>{label}</span>
                  <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={GLASS} className="p-6 space-y-4">
            <SectionTitle>{isPro ? 'Gérer l\'abonnement' : 'Passer à PRO'}</SectionTitle>

            {!isPro && (
              <div className="space-y-2">
                {[
                  'Agent IA avec mémoire contextuelle',
                  'Stratégies automatiques (DCA, Straddle…)',
                  'Alertes prix illimitées',
                  'Données marché en temps réel',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#02559F' }} />
                    <span className="text-sm" style={{ color: '#0F172A' }}>{feature}</span>
                  </div>
                ))}
              </div>
            )}

            {isPro && (
              <p className="text-sm" style={{ color: '#7a9bbf' }}>
                Gérez votre abonnement, factures et coordonnées de paiement via le portail Stripe.
              </p>
            )}

            <Link
              href="/upgrade"
              className="block w-full text-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: isPro
                  ? 'rgba(2,85,159,0.1)'
                  : 'linear-gradient(135deg, #02559F 0%, #013B72 100%)',
                color: isPro ? '#02559F' : 'white',
                boxShadow: isPro ? 'none' : '0 2px 8px rgba(2,85,159,0.3)',
              }}
            >
              {isPro ? 'Gérer via Stripe' : 'Passer à PRO — 29 € / mois'}
            </Link>

            {!isPro && (
              <p className="text-xs text-center" style={{ color: '#7a9bbf' }}>
                Résiliez à tout moment. Sans engagement.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Sécurité ─────────────────────────────────────────────────────────── */}
      {activeTab === 'securite' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-3xl">
          {/* Mot de passe */}
          <div style={GLASS} className="p-6 space-y-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(2,85,159,0.08)' }}>
                <KeyRound className="w-4 h-4" style={{ color: '#02559F' }} />
              </div>
              <SectionTitle>Mot de passe</SectionTitle>
            </div>

            <div
              className="flex items-start gap-3 px-3.5 py-3 rounded-xl text-xs"
              style={{ background: 'rgba(2,85,159,0.05)', border: '0.5px solid rgba(2,85,159,0.12)' }}
            >
              <Mail className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#02559F' }} />
              <p style={{ color: '#7a9bbf' }}>
                Votre compte utilise l&apos;authentification sans mot de passe (lien email ou Google).
                La modification de mot de passe n&apos;est pas disponible pour cette méthode de connexion.
              </p>
            </div>

            <div className="space-y-3 opacity-40 pointer-events-none select-none">
              {['Mot de passe actuel', 'Nouveau mot de passe', 'Confirmer le nouveau'].map((label) => (
                <div key={label}>
                  <Label>{label}</Label>
                  <input
                    style={INPUT_DISABLED}
                    type="password"
                    placeholder="••••••••"
                    disabled
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Double authentification */}
          <div style={GLASS} className="p-6 space-y-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(2,85,159,0.08)' }}>
                <Smartphone className="w-4 h-4" style={{ color: '#02559F' }} />
              </div>
              <SectionTitle>Double authentification</SectionTitle>
            </div>

            <ToggleRow
              label="Authentification à deux facteurs"
              description="Sécurisez votre compte avec une app d'authentification (Google Authenticator, Authy…)"
              checked={false}
              onChange={() => {}}
              disabled
            />

            <div
              className="px-3.5 py-3 rounded-xl text-xs"
              style={{ background: 'rgba(2,85,159,0.05)', border: '0.5px solid rgba(2,85,159,0.12)' }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5" style={{ color: '#02559F' }} />
                <span className="font-semibold" style={{ color: '#02559F' }}>Bientôt disponible</span>
              </div>
              <p style={{ color: '#7a9bbf' }}>
                La double authentification sera disponible dans une prochaine mise à jour.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Préférences ───────────────────────────────────────────────────────── */}
      {activeTab === 'preferences' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-3xl">
          {/* Notifications */}
          <div style={GLASS} className="p-6">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(2,85,159,0.08)' }}>
                <Bell className="w-4 h-4" style={{ color: '#02559F' }} />
              </div>
              <SectionTitle>Notifications</SectionTitle>
            </div>

            <div className="-mx-1 px-1">
              <ToggleRow
                label="Alertes de prix"
                description="Notifier quand un prix atteint votre seuil"
                checked={prefs.alertesPrix}
                onChange={() => togglePref('alertesPrix')}
              />
              <ToggleRow
                label="Exécution d'ordres"
                description="Confirmer chaque ordre passé par l'agent IA"
                checked={prefs.executionOrdres}
                onChange={() => togglePref('executionOrdres')}
              />
              <ToggleRow
                label="Résumé quotidien"
                description="Rapport de performance envoyé chaque matin"
                checked={prefs.resumeQuotidien}
                onChange={() => togglePref('resumeQuotidien')}
              />
              <ToggleRow
                label="Actualités financières"
                description="Titres des marchés liés à votre portefeuille"
                checked={prefs.actualites}
                onChange={() => togglePref('actualites')}
              />
            </div>
          </div>

          {/* Paramètres régionaux */}
          <div style={GLASS} className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(2,85,159,0.08)' }}>
                  <Globe className="w-4 h-4" style={{ color: '#02559F' }} />
                </div>
                <SectionTitle>Région &amp; affichage</SectionTitle>
              </div>
              {prefsSaved && (
                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: '#16a34a' }}>
                  <Check className="w-3 h-3" /> Sauvegardé
                </span>
              )}
            </div>

            <div className="space-y-4">
              {[
                {
                  label: 'Langue',
                  key: 'langue' as const,
                  options: [
                    { value: 'fr', label: 'Français' },
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'de', label: 'Deutsch' },
                  ],
                },
                {
                  label: 'Devise d\'affichage',
                  key: 'devise' as const,
                  options: [
                    { value: 'USD', label: 'USD — Dollar américain' },
                    { value: 'EUR', label: 'EUR — Euro' },
                    { value: 'GBP', label: 'GBP — Livre sterling' },
                    { value: 'CHF', label: 'CHF — Franc suisse' },
                    { value: 'JPY', label: 'JPY — Yen japonais' },
                  ],
                },
                {
                  label: 'Fuseau horaire',
                  key: 'fuseau' as const,
                  options: [
                    { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1/+2)' },
                    { value: 'Europe/London', label: 'Europe/London (UTC+0/+1)' },
                    { value: 'America/New_York', label: 'America/New York (UTC-5/-4)' },
                    { value: 'America/Chicago', label: 'America/Chicago (UTC-6/-5)' },
                    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
                    { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
                  ],
                },
              ].map(({ label, key, options }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <div className="relative">
                    <select
                      style={SELECT}
                      value={prefs[key]}
                      onChange={(e) => updatePrefSelect(key, e.target.value)}
                    >
                      {options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: '#7a9bbf' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
