import { NextRequest, NextResponse } from 'next/server';
import { actor, endpoint } from '@/lib/gestion/server';
import { buildReport, reportHtml } from '@/lib/gestion/report';
import { DomainError } from '@/lib/gestion/domain';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return endpoint(async () => {
    const user = await actor();
    const format = req.nextUrl.searchParams.get('format') || 'json';
    if (!['json', 'html'].includes(format)) throw new DomainError('Formato disponible: json o html');
    const report = await buildReport(user, req.nextUrl.searchParams);
    return new NextResponse(format === 'html' ? reportHtml(report) : JSON.stringify(report, null, 2), { headers: {
      'Content-Type': format === 'html' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
      'Content-Disposition': `${format === 'html' ? 'inline' : 'attachment'}; filename="gestion-ungrd.${format}"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      ...(format === 'html' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'" } : {}),
    } });
  });
}
