'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function updateProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Non authentifié' };

  const firstName = formData.get('firstName')?.toString().trim() ?? '';
  const lastName = formData.get('lastName')?.toString().trim() ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath('/profil');
  return { success: true };
}
