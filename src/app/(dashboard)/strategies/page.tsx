import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { StrategiesDashboard } from './StrategiesDashboard';

export const metadata: Metadata = { title: 'Stratégies — Dozanta' };

export default async function StrategiesPage() {
  const session = await getServerSession(authOptions);

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session!.user.id },
    select: { plan: true },
  });

  if (!subscription || subscription.plan !== 'PRO') {
    redirect('/upgrade?from=/strategies');
  }

  return <StrategiesDashboard />;
}
