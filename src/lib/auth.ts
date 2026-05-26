import { type NextAuthOptions } from 'next-auth';
import { type Adapter } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';

const devProvider =
  process.env.NODE_ENV === 'development'
    ? [
        CredentialsProvider({
          id: 'dev-login',
          name: 'Dev',
          credentials: {},
          async authorize() {
            // Crée ou récupère l'utilisateur de test
            const user = await prisma.user.upsert({
              where: { email: 'test@dev.local' },
              update: {},
              create: { email: 'test@dev.local', name: 'Dev User', emailVerified: new Date() },
            });
            // Garantit qu'un abonnement FREE existe
            await prisma.subscription.upsert({
              where: { userId: user.id },
              update: {},
              create: { userId: user.id },
            });
            return { id: user.id, email: user.email!, name: user.name };
          },
        }),
      ]
    : [];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
    ...devProvider,
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }

      // Re-fetch subscription plan on sign-in or explicit session update
      if ((user || trigger === 'update') && token.id) {
        const sub = await prisma.subscription.findUnique({
          where: { userId: token.id as string },
          select: { plan: true },
        });
        token.subscriptionPlan = sub?.plan ?? 'FREE';
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.subscriptionPlan = (token.subscriptionPlan as string) ?? 'FREE';
      }
      return session;
    },
  },
};
