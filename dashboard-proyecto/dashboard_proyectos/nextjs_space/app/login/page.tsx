'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock } from 'lucide-react';
import Image from 'next/image';
import HlsVideoBackground from '@/components/hls-video-background';

const VIDEO_HLS_URL =
  'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Credenciales inválidas');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Fondo base oscuro por si el video tarda en cargar */}
      <div className="absolute inset-0 bg-gradient-to-br from-ungrd-blue via-ungrd-blue-dark to-slate-900" />

      {/* Video de fondo HLS */}
      <HlsVideoBackground src={VIDEO_HLS_URL} />

      {/* Capa de oscurecimiento para garantizar contraste sobre el video */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-ungrd-blue/50 via-transparent to-black/60" />

      {/* Contenido */}
      <div className="relative w-full max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 ring-1 ring-white/40">
          {/* Logo Oficial UNGRD */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-64 h-24 mb-4">
              <Image
                src="/ungrd-logo.png"
                alt="Unidad Nacional para la Gestión del Riesgo de Desastres"
                fill
                priority
                sizes="256px"
                className="object-contain"
              />
            </div>
            <p className="text-gray-500 text-sm mt-1 text-center">
              Sistema de Seguimiento de Proyectos
            </p>
          </div>

          {/* Formulario Credenciales */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ungrd-blue focus:border-ungrd-blue transition-colors"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ungrd-blue focus:border-ungrd-blue transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ungrd-blue text-white py-3 rounded-lg font-medium hover:bg-ungrd-blue-dark focus:ring-4 focus:ring-ungrd-blue/30 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            Sistema Nacional de Gestión del Riesgo de Desastres
          </p>
        </div>
      </div>
    </div>
  );
}
