import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getFileUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// GET - Listar TODOS los archivos (solo admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === 'ADMIN';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Solo administradores pueden ver todos los archivos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const responsableId = searchParams.get('responsableId');

    const where: any = { isDeleted: false };
    if (projectId) {
      where.task = { projectId };
    }
    if (responsableId) {
      where.task = {
        ...where.task,
        assignments: { some: { responsableId } },
      };
    }

    const attachments = await prisma.taskAttachment.findMany({
      where,
      include: {
        task: {
          include: {
            project: true,
            assignments: {
              include: { responsable: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generar URLs firmadas para cada archivo
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (att) => ({
        id: att.id,
        fileName: att.fileName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        createdAt: att.createdAt,
        downloadUrl: att.cloudStoragePath.startsWith('preview-') 
          ? `/${att.cloudStoragePath}` 
          : await getFileUrl(att.cloudStoragePath, false, att.mimeType === 'text/html'),
        isPreview: att.cloudStoragePath.startsWith('preview-') || att.mimeType === 'text/html',
        task: {
          id: att.task.id,
          name: att.task.name,
          entregable: att.task.entregable,
          project: {
            id: att.task.project.id,
            name: att.task.project.name,
            color: att.task.project.color,
          },
          responsables: att.task.assignments.map((a) => a.responsable.name),
        },
      }))
    );

    return NextResponse.json({
      attachments: attachmentsWithUrls,
      total: attachmentsWithUrls.length,
    });
  } catch (error) {
    console.error('Error fetching all attachments:', error);
    return NextResponse.json(
      { error: 'Error al obtener archivos' },
      { status: 500 }
    );
  }
}

// DELETE - Soft-delete a file (mark as deleted, keep in DB)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { attachmentId, confirmWord } = body;

    if (!attachmentId) {
      return NextResponse.json({ error: 'ID de archivo requerido' }, { status: 400 });
    }

    // Verify confirmation word
    if (!confirmWord || confirmWord.trim().toLowerCase() !== 'el limonar') {
      return NextResponse.json(
        { error: 'Palabra de confirmación incorrecta. Escribe "el limonar" para confirmar.' },
        { status: 400 }
      );
    }

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: { include: { project: true } },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    if (attachment.isDeleted) {
      return NextResponse.json({ error: 'Este archivo ya fue eliminado' }, { status: 400 });
    }

    const userName = (session.user as any)?.name || 'Desconocido';
    const userEmail = (session.user as any)?.email || '';
    const userId = (session.user as any)?.id || '';

    // Soft-delete: mark as deleted but keep in DB
    await prisma.taskAttachment.update({
      where: { id: attachmentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedByName: userName,
        deletedByEmail: userEmail,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'ELIMINAR',
        entity: 'TaskAttachment',
        entityId: attachmentId,
        entityName: attachment.fileName,
        details: JSON.stringify({
          taskId: attachment.taskId,
          taskName: attachment.task.name,
          projectName: attachment.task.project.name,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          cloudStoragePath: attachment.cloudStoragePath,
          uploadedAt: attachment.createdAt,
        }),
        userId,
        userName,
        userEmail,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Archivo "${attachment.fileName}" eliminado por ${userName}`,
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Error al eliminar archivo' },
      { status: 500 }
    );
  }
}
