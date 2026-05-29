import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';

export const metadata: Metadata = { title: 'Profil' };

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true, createdAt: true },
    }),
    prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, stripeCurrentPeriodEnd: true, createdAt: true },
    }),
  ]);

  return (
    <ProfileClient
      user={{
        name: user?.name ?? null,
        email: user?.email ?? '',
        image: user?.image ?? null,
        memberSince: user?.createdAt.toISOString() ?? new Date().toISOString(),
      }}
      subscription={{
        plan: subscription?.plan ?? 'FREE',
        currentPeriodEnd: subscription?.stripeCurrentPeriodEnd?.toISOString() ?? null,
      }}
    />
  );
}
