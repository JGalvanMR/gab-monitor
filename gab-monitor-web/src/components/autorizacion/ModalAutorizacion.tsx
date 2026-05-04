// src/components/autorizacion/ModalAutorizacion.tsx
// Diseño Corporativo GAB / Mr. Lucky - Profesional y refinado

import { useState } from 'react';
import { autorizacionApi } from '../../api/inventarioApi';
import type { TarimaParaAutorizar } from '../../types/inventario.types';

interface Props {
  tarimas: TarimaParaAutorizar[];
  tipoAutorizacion: 'A' | 'C';
  onClose: () => void;
  onExito: () => void;
}

export function ModalAutorizacion({ tarimas, tipoAutorizacion, onClose, onExito }: Props) {
  const [motivo, setMotivo]     = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');

  const tipoLabel = tipoAutorizacion === 'A' ? 'TRAILER' : 'CAMIONETA';
  const esTrailer = tipoAutorizacion === 'A';

  const handleAutorizar = async () => {
    if (!motivo.trim()) {
      setError('El motivo es obligatorio');
      return;
    }

    setCargando(true);
    setError('');
    try {
      await autorizacionApi.autorizarLote({
        tarimas,
        tipoAutorizacion,
        motivo,
        usuario: 'WEB',
        nombreMaquina: window.location.hostname,
      });
      onExito();
    } catch (e: any) {
      setError(e.message ?? 'Error al autorizar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl shadow-slate-900/20 flex flex-col ring-1 ring-slate-200">

        {/* Header */}
        <div className={`flex items-start justify-between p-6 border-b border-slate-200 rounded-t-2xl ${
          esTrailer
            ? 'bg-gradient-to-r from-purple-50 to-fuchsia-50'
            : 'bg-gradient-to-r from-blue-50 to-cyan-50'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              esTrailer
                ? 'bg-purple-700 shadow-purple-700/20'
                : 'bg-blue-700 shadow-blue-700/20'
            }`}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wide uppercase ${
                  esTrailer
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {tipoLabel}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Autorizar Salida
              </h2>
              <p className="text-slate-500 text-sm">
                {tarimas.length} tarima(s) seleccionada(s)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition-colors duration-200 group"
            disabled={cargando}
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de tarimas */}
        <div className="p-6 bg-slate-50/50">
          <div className={`rounded-xl border overflow-hidden ${
            esTrailer ? 'border-purple-200' : 'border-blue-200'
          }`}>
            <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
              esTrailer ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
            }`}>
              Tarimas a Autorizar
            </div>
            <div className="max-h-32 overflow-y-auto bg-white">
              {tarimas.map((t, i) => (
                <div key={i} className={`px-4 py-2 text-sm font-mono border-b last:border-b-0 ${
                  esTrailer ? 'border-purple-100 text-slate-700' : 'border-blue-100 text-slate-700'
                }`}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                    esTrailer ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {t.tipo}
                  </span>
                  <span className="font-semibold">{t.folio}</span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span>Tar: {t.tarima}</span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span className="text-slate-500">{t.cveProd}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="p-6 pt-0 bg-slate-50/50">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value.toUpperCase())}
              className={`w-full px-4 py-3 rounded-xl border outline-none transition-all duration-200 resize-none text-sm ${
                esTrailer
                  ? 'bg-white border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-800'
                  : 'bg-white border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
              }`}
              rows={3}
              placeholder="Ingrese el motivo de la autorización..."
              maxLength={200}
              disabled={cargando}
            />
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={cargando}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleAutorizar}
            disabled={cargando || !motivo.trim()}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              esTrailer
                ? 'bg-purple-700 hover:bg-purple-600'
                : 'bg-blue-700 hover:bg-blue-600'
            }`}
          >
            {cargando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Autorizando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Autorizar {tipoLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
