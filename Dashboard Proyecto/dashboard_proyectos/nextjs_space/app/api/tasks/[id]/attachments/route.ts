import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getFileUrl, deleteFile } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// GET - Listar archivos de una tarea
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

    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId: params.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    // Generar URLs firmadas para cada archivo
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (att) => ({
        ...att,
        downloadUrl: att.cloudStoragePath.startsWith('preview-') 
          ? `/${att.cloudStoragePath}` 
          : await getFileUrl(att.cloudStoragePath, false, att.mimeType === 'text/html'),
        isPreview: att.cloudStoragePath.startsWith('preview-') || att.mimeType === 'text/html',
      }))
    );

    return NextResponse.json(attachmentsWithUrls);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Error al obtener archivos' },
      { status: 500 }
    );
  }
}

// POST - Registrar un archivo subido
export async function POST(
  request: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, cloudStoragePath, fileSize, mimeType } = body;

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: params.id,
        fileName,
        fileUrl: cloudStoragePath,
        cloudStoragePath,
        fileSize,
        mimeType,
        uploadedById: (session.user as any).id,
      },
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Error creating attachment:', error);
    return NextResponse.json(
      { error: 'Error al registrar archivo' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un archivo
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'attachmentId requerido' },
        { status: 400 }
      );
    }

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Solo admin puede eliminar archivos
    const isAdmin = (session.user as any).role === 'ADMIN';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar archivos' },
        { status: 403 }
      );
    }

    // Eliminar de S3
    await deleteFile(attachment.cloudStoragePath);

    // Eliminar de la BD
    await prisma.taskAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Error al eliminar archivo' },
      { status: 500 }
    );
  }
}
