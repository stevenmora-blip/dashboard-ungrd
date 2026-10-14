import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const actaId = params.id;
    const body = await request.json();
    const { fileName, cloudStoragePath, fileSize, mimeType } = body;

    if (!fileName || !cloudStoragePath) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Verify acta exists
    const acta = await prisma.acta.findUnique({ where: { id: actaId } });
    if (!acta) {
      return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });
    }

    // We need a task to link the attachment. Find or create a dummy task for actas.
    // First, let's see if there's a project for actas or create one
    let actasProject = await prisma.project.findFirst({
      where: { name: 'Actas del Proyecto' }
    });

    if (!actasProject) {
      actasProject = await prisma.project.create({
        data: {
          name: 'Actas del Proyecto',
          description: 'Proyecto para almacenar archivos de actas',
          isActive: false, // Hidden from main list
        }
      });
    }

    // Find or create a task for this acta
    let actaTask = await prisma.task.findFirst({
      where: { 
        projectId: actasProject.id,
        name: `Acta #${acta.numero} - ${acta.proyecto}`
      }
    });

    if (!actaTask) {
      actaTask = await prisma.task.create({
        data: {
          name: `Acta #${acta.numero} - ${acta.proyecto}`,
          description: `Archivos adjuntos del acta ${acta.numero}`,
          projectId: actasProject.id,
          status: 'COMPLETADO',
        }
      });
    }

    // Create the attachment linked to both task and acta
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: actaTask.id,
        actaId: actaId,
        fileName,
        fileUrl: cloudStoragePath,
        cloudStoragePath,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/octet-stream',
        uploadedById: session.user?.email || undefined,
      },
    });

    return NextResponse.json({ success: true, attachment });
  } catch (error) {
    console.error('Error creating acta attachment:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const attachments = await prisma.taskAttachment.findMany({
      where: { actaId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Error fetching acta attachments:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
