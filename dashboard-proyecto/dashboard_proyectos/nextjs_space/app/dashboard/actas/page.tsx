'use client';

import { useState } from 'react';
import { ExternalLink, FileText, RefreshCw, Maximize2 } from 'lucide-react';

const ACTAS_URL = 'https://script.google.com/macros/s/AKfycbwXfwRhi66Xp0tAdcBQQz7xasCVR_ovo6KPO0pVG_Kp5dcMNL-rHTeUhzflers7PxzG/exec';

export default function ActasPage() {
  const [iframeKey, setIframeKey] = useState(0);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] lg:h-[calc(100vh-70px)]">
      {/* Barra de control compacta */}
      <div className="bg-gradient-to-r from-[#222d5d] to-[#151c3b] rounded-t-xl px-5 py-3 border-b-4 border-[#ffd100] shadow-lg flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#ffd100] p-2 rounded-lg">
            <FileText className="w-5 h-5 text-[#222d5d]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">
              Gestor de Actas &middot; Equipo <span className="text-[#ffd100]">LakeHouse</span>
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sistema de Gesti&oacute;n de Actas &middot; AI Powered</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIframeKey(prev => prev + 1)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href={ACTAS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#ffd100] hover:bg-[#e6bc00] text-[#222d5d] font-bold px-4 py-2 rounded-lg transition-all text-sm shadow"
          >
            <Maximize2 className="w-4 h-4" />
            Pantalla completa
          </a>
        </div>
      </div>

      {/* Iframe principal */}
      <div className="flex-1 bg-white rounded-b-xl shadow-lg overflow-hidden border border-gray-200 border-t-0">
        <iframe
          key={iframeKey}
          src={ACTAS_URL}
          width="100%"
          height="100%"
          style={{ border: 'none', display: 'block' }}
          title="Gestor de Actas LakeHouse"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
