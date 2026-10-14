import { NextRequest } from 'next/server';
import { actor, body, endpoint } from '@/lib/gestion/server';
import { resourceSchema } from '@/lib/gestion/validation';
import { resourceList, createResource } from '@/lib/gestion/resources';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { return endpoint(async () => resourceList(await actor(), req.nextUrl.searchParams)); }
export async function POST(req: NextRequest) { return endpoint(async () => { await actor(); return createResource(await body(req, resourceSchema)); }, 201); }
