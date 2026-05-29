'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function deleteAlert(formData: FormData) {
  const alertId = formData.get('alertId') as string;
  if (!alertId) return;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  await prisma.alert.update({
    where: { id: alertId, userId: session.user.id },
    data: { active: false },
  });

  revalidatePath('/dashboard');
}
