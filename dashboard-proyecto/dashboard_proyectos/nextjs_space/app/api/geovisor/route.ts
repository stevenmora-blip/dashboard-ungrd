import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Proxy endpoint that redirects authenticated users to the geoportal
// The actual URL is server-side only and never exposed to the client
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Server-side only URL - never sent to client code
    const geovisorUrl = process.env.GEOVISOR_URL || 'https://geoportalgestiondelriesgo.com';
    
    return NextResponse.redirect(geovisorUrl);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
