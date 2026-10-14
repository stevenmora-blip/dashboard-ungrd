import { endpoint } from '@/lib/gestion/server';
import { readTicket } from '@/lib/gestion/tickets';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, { params: pendingParams }: { params: Promise<{ id: string }> }) {
  const params = await pendingParams; return endpoint(() => readTicket(params.id)); }
