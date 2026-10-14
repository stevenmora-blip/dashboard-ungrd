import { endpoint } from '@/lib/gestion/server';
import { readTicket } from '@/lib/gestion/tickets';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, { params }: { params: { id: string } }) { return endpoint(() => readTicket(params.id)); }
