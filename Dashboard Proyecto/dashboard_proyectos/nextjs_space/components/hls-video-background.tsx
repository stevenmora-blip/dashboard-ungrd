'use client';

import { useEffect, useRef, useState } from 'react';

interface HlsVideoBackgroundProps {
  src: string;
  poster?: string;
}

export default function HlsVideoBackground({ src, poster }: HlsVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: any = null;
    let destroyed = false;

    const attach = async () => {
      // Safari y algunos navegadores de iOS soportan HLS de forma nativa
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          if (!destroyed) setReady(true);
          void video.play().catch(() => {});
        });
        return;
      }

      try {
        const mod = await import('hls.js');
        const Hls = mod.default;
        if (destroyed) return;
        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
          });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (destroyed) return;
            setReady(true);
            void video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
            if (data?.fatal) {
              // silencioso; se reintenta automáticamente
              try {
                if (data.type === 'networkError') hls.startLoad();
                else if (data.type === 'mediaError') hls.recoverMediaError();
              } catch {}
            }
          });
        }
      } catch {
        // si falla la carga de hls.js, se deja el poster
      }
    };

    void attach();

    return () => {
      destroyed = true;
      if (hls) {
        try {
          hls.destroy();
        } catch {}
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={poster}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
        ready ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
}
