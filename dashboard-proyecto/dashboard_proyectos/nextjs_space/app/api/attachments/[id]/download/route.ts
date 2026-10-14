import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getFileUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: params.id },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    // If it's a local preview file (e.g., HTML preview), redirect to public path
    if (attachment.cloudStoragePath.startsWith('preview-') && attachment.mimeType === 'text/html') {
      const baseUrl = request.headers.get('x-forwarded-proto') && request.headers.get('x-forwarded-host')
        ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('x-forwarded-host')}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/${attachment.cloudStoragePath}`);
    }

    // For HTML files stored in S3, generate an inline URL for viewing in browser
    if (attachment.mimeType === 'text/html') {
      const viewUrl = await getFileUrl(attachment.cloudStoragePath, false, true);
      return NextResponse.redirect(viewUrl);
    }

    // Generar URL firmada para descarga
    const downloadUrl = await getFileUrl(attachment.cloudStoragePath, false);

    // Redirigir al archivo
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
