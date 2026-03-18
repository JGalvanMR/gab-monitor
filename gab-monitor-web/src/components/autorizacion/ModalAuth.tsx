// src/components/autorizacion/ModalAuth.tsx
// Diseño Corporativo GAB / Mr. Lucky - Profesional y refinado

import { useState, useRef, useEffect } from 'react';
import { autorizacionApi } from '../../api/inventarioApi';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalAuth({ onClose, onSuccess }: Props) {
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleVerificar = async () => {
    if (!contrasena.trim()) return;
    setCargando(true);
    setError('');
    try {
      const { autorizado } = await autorizacionApi.verificarContrasena(contrasena);
      if (autorizado) {
        onSuccess();
      } else {
        setError('Contraseña incorrecta');
        setContrasena('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Error al verificar. Intente de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl shadow-slate-900/20 flex flex-col ring-1 ring-slate-200">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 rounded-t-2xl">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shadow-lg shadow-slate-800/20">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold tracking-wide uppercase">
                  Seguridad
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Autorización
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200 group"
            disabled={cargando}
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 bg-slate-50/50">
          <p className="text-slate-500 text-sm text-center mb-6">
            Ingrese la contraseña para activar el modo de autorización
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <input
                ref={inputRef}
                type="password"
                value={contrasena}
                onChange={e => setContrasena(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleVerificar()}
                className="w-full bg-white text-slate-800 uppercase px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none mb-3 text-center tracking-widest font-mono text-lg"
                placeholder="CONTRASEÑA"
                maxLength={20}
                disabled={cargando}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors duration-200"
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            onClick={handleVerificar}
            className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={cargando || !contrasena.trim()}
          >
            {cargando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Verificando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Verificar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
