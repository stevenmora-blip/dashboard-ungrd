import { NextRequest } from 'next/server';
import { actor, body, endpoint } from '@/lib/gestion/server';
import { ticketActionSchema } from '@/lib/gestion/validation';
import { mutateTicket } from '@/lib/gestion/tickets';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return endpoint(async () => { await actor(); return mutateTicket(params.id, await body(req, ticketActionSchema)); });
}
