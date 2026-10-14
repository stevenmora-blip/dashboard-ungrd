import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const actorId = (session?.user as { id?: string } | undefined)?.id;
    if (!actorId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { isActive: true, role: true } });
    if (!actor?.isActive) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (actor.role !== 'ADMIN') return NextResponse.json({ error: 'Sólo administradores' }, { status: 403 });
    const body = await request.json();
    const { email, password, name, role, responsableId } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password y nombre son requeridos' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: (role === 'ADMIN' || role === 'USER') ? role : 'USER',
        responsableId: responsableId || null,
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Error al crear el usuario' },
      { status: 500 }
    );
  }
}
