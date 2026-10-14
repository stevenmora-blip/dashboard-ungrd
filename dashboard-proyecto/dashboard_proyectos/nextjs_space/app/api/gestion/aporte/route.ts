import { NextRequest } from 'next/server';
import { actor, admin, body, endpoint } from '@/lib/gestion/server';
import { impactSchema } from '@/lib/gestion/validation';
import { impactList, createImpact } from '@/lib/gestion/impact';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { return endpoint(async () => impactList(await actor(), req.nextUrl.searchParams.get('projectId') || undefined)); }
export async function POST(req: NextRequest) { return endpoint(async () => { admin(await actor()); return createImpact(await body(req, impactSchema)); }, 201); }
