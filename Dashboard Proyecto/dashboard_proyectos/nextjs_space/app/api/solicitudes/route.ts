import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { body, endpoint } from '@/lib/gestion/server';
import { publicRequestSchema } from '@/lib/gestion/validation';
import { limitPublicIntake } from '@/lib/gestion/rate-limit';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  return endpoint(async () => {
    limitPublicIntake();
    const data = await body(req, publicRequestSchema, 32768);
    const ticket = await prisma.$transaction(async db => {
      const created = await db.requestTicket.create({ data: { ...data, desiredDate: data.desiredDate ? new Date(data.desiredDate) : null } });
      await db.ticketEvent.create({ data: { ticketId: created.id, action: 'received', actorName: data.requesterName, actorEmail: data.requesterEmail, data: { ...data } } });
      return created;
    });
    return { number: ticket.number, createdAt: ticket.createdAt };
  }, 201);
}
