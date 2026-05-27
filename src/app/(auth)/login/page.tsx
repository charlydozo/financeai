'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Mail, Terminal } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const IS_DEV = process.env.NODE_ENV === 'development';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn('email', { email, callbackUrl: '/dashboard', redirect: false });
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex p-2 mb-4">
            <Image src="/logo.png" alt="Dozanta" width={56} height={56} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">Dozanta</h1>
          <p className="text-gray-400 text-sm mt-1.5">Connectez-vous à votre espace</p>
        </div>

        {sent ? (
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-6 text-center space-y-2">
            <Mail className="w-7 h-7 text-brand-400 mx-auto" />
            <p className="text-white font-medium">Email envoyé !</p>
            <p className="text-gray-400 text-sm">
              Vérifiez votre boîte mail et cliquez sur le lien pour accéder à votre compte.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 space-y-5">
            {/* Google */}
            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              Continuer avec Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-500">ou</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Connexion rapide dev */}
            {IS_DEV && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-amber-500/20" />
                  <span className="text-xs text-amber-600 font-mono">dev only</span>
                  <div className="flex-1 h-px bg-amber-500/20" />
                </div>
                <button
                  type="button"
                  onClick={() => signIn('dev-login', { callbackUrl: '/dashboard' })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl font-medium text-sm hover:bg-amber-500/20 hover:border-amber-500/50 transition-all font-mono"
                >
                  <Terminal className="w-4 h-4" />
                  Connexion rapide en dev
                </button>
              </>
            )}

            {/* Email magique */}
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className={cn(
                  'w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all',
                  'bg-brand-500 text-white hover:bg-brand-400',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {loading ? 'Envoi en cours...' : 'Recevoir un lien de connexion'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-gray-600">
          En continuant, vous acceptez nos{' '}
          <span className="text-gray-400 cursor-pointer hover:text-brand-400 transition-colors">
            Conditions d&apos;utilisation
          </span>
        </p>
      </div>
    </div>
  );
}
