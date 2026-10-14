import type { Prisma } from '@prisma/client';
import { DomainError } from './domain';

// PostgreSQL shares this quota across serverless instances. Call in the same
// transaction as intake creation so a rejected request cannot create a ticket.
export async function limitPublicIntake(db: Prisma.TransactionClient, now = new Date()) {
  const minute = Math.floor(now.getTime() / 60000);
  const bucket = await db.publicIntakeBucket.upsert({
    where: { id: `intake:${minute}` },
    create: { id: `intake:${minute}`, count: 1, windowStart: new Date(minute * 60000) },
    update: { count: { increment: 1 } },
  });
  if (bucket.count > 30) throw new DomainError('Límite de recepción alcanzado; reintente en un minuto', 429);
  await db.publicIntakeBucket.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86400000) } } });
}
