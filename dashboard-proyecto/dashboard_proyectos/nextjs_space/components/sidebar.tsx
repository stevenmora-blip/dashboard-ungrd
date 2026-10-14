'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  FileBarChart,
  Settings,
  LogOut,
  ChevronRight,
  FolderOpen,
  ClipboardList,
  CalendarDays,
  ListChecks,
  Briefcase,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/proyectos', label: 'Proyectos', icon: FolderKanban },
  { href: '/dashboard/requerimientos', label: 'Requerimientos', icon: ClipboardList },
  { href: '/dashboard/esfuerzo', label: 'Esfuerzo y recursos', icon: Briefcase },
  { href: '/dashboard/aporte', label: 'Aporte institucional', icon: FileBarChart },
  { href: '/dashboard/tareas', label: 'Plan de Trabajo', icon: CheckSquare },
  { href: '/dashboard/mis-tareas', label: 'Mis Tareas', icon: ListChecks },
  { href: '/dashboard/actas', label: 'Actas', icon: ClipboardList },
  { href: '/dashboard/asistencia', label: 'Asistencia', icon: CalendarDays },
  { href: '/dashboard/archivos', label: 'Archivos', icon: FolderOpen },
  { href: '/dashboard/carga-trabajo', label: 'Carga de Trabajo', icon: Briefcase },
  { href: '/dashboard/equipo', label: 'Equipo', icon: Users },
  { href: '/dashboard/reportes', label: 'Reportes', icon: FileBarChart },
  { href: '/dashboard/usuarios', label: 'Usuarios', icon: Settings },
];

const userLinks = [
  { href: '/dashboard', label: 'Mi Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/mis-tareas', label: 'Mis Tareas', icon: CheckSquare },
  { href: '/dashboard/requerimientos', label: 'Requerimientos', icon: ClipboardList },
  { href: '/dashboard/esfuerzo', label: 'Esfuerzo y recursos', icon: Briefcase },
  { href: '/dashboard/aporte', label: 'Aporte institucional', icon: FileBarChart },
  { href: '/dashboard/asistencia', label: 'Asistencia', icon: CalendarDays },
];

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const links = isAdmin ? adminLinks : userLinks;

  return (
    <div className="w-64 bg-gradient-to-b from-ungrd-blue to-ungrd-blue-dark text-white min-h-screen flex flex-col">
      {/* Header con Logo oficial UNGRD */}
      <div className="p-4 border-b border-white/10">
        <div className="bg-white rounded-lg p-3 shadow-md">
          <div className="relative w-full h-16">
            <Image
              src="/ungrd-logo.png"
              alt="Unidad Nacional para la Gestión del Riesgo de Desastres"
              fill
              priority
              sizes="220px"
              className="object-contain"
            />
          </div>
        </div>
        <p className="text-[11px] text-white/70 text-center mt-2 font-medium tracking-wide">
          Plan de Trabajo SNI
        </p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href || 
              (link.href !== '/dashboard' && pathname?.startsWith(link.href));
            const Icon = link.icon;
            
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onLinkClick}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                    isActive
                      ? 'bg-ungrd-yellow text-ungrd-blue font-semibold shadow-lg'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{link.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              </li>
            );
          })}  
        </ul>
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="mb-4 px-4">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt=""
              className="w-10 h-10 rounded-full mb-2 border-2 border-ungrd-yellow"
            />
          )}
          <p className="text-sm font-medium truncate">{session?.user?.name || 'Usuario'}</p>
          <p className="text-xs text-white/60 truncate">{session?.user?.email}</p>
          <span className={cn(
            'inline-block mt-2 text-xs px-2 py-1 rounded-full font-medium',
            isAdmin ? 'bg-ungrd-yellow text-ungrd-blue' : 'bg-white/20 text-white'
          )}>
            {isAdmin ? 'Administrador' : 'Usuario'}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevenir scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Top Bar - visible solo en móvil */}
      <div className="lg:hidden sticky top-0 z-40 bg-gradient-to-r from-ungrd-blue to-ungrd-blue-dark shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center justify-center p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-md p-1 shadow">
              <div className="relative w-28 h-8">
                <Image
                  src="/ungrd-logo.png"
                  alt="UNGRD"
                  fill
                  priority
                  sizes="112px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
          {/* Spacer para centrar el logo */}
          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Desktop Sidebar - visible solo en desktop */}
      <aside className="hidden lg:flex sticky top-0 h-screen flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer - visible solo cuando está abierto en móvil */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="relative h-full">
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-2 z-10 p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent onLinkClick={() => setIsOpen(false)} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
