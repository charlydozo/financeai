import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeDCA } from '@/server/routers/strategy';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const strategies = await prisma.strategy.findMany({
    where: { type: 'SMARTPLAN', status: 'ACTIVE' },
  });

  const due = strategies.filter((s) => {
    const config = s.config as any;
    return config.nextRun && new Date(config.nextRun) <= now;
  });

  const results: { id: string; name: string; trades: string[]; totalSpent: number }[] = [];

  for (const strategy of due) {
    try {
      const result = await executeDCA(prisma, {
        id: strategy.id,
        userId: strategy.userId,
        config: strategy.config,
        name: strategy.name,
      });
      results.push({ id: strategy.id, name: strategy.name, ...result });
    } catch (err: any) {
      results.push({ id: strategy.id, name: strategy.name, trades: [], totalSpent: 0 });
    }
  }

  return NextResponse.json({
    processed: results.length,
    skipped: strategies.length - due.length,
    results,
    runAt: now.toISOString(),
  });
}
