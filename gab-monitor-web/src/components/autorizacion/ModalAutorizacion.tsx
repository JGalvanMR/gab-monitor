// src/components/autorizacion/ModalAutorizacion.tsx
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-[460px] shadow-xl">
        <h2 className={`font-bold text-center mb-2 text-lg ${
          tipoAutorizacion === 'A' ? 'text-purple-300' : 'text-blue-300'
        }`}>
          AUTORIZAR → {tipoLabel}
        </h2>

        <p className="text-gray-300 text-sm text-center mb-4">
          {tarimas.length} tarima(s) seleccionada(s)
        </p>

        {/* Lista de tarimas */}
        <div className="max-h-40 overflow-y-auto bg-gray-900 rounded p-2 mb-4">
          {tarimas.map((t, i) => (
            <div key={i} className="text-xs font-mono text-gray-300 py-0.5 border-b border-gray-700">
              [{t.tipo}] {t.folio} / Tar: {t.tarima} / {t.cveProd}
            </div>
          ))}
        </div>

        {/* Motivo */}
        <label className="text-gray-300 text-xs font-semibold block mb-1">
          MOTIVO <span className="text-red-400">*</span>
        </label>
        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value.toUpperCase())}
          className="w-full bg-gray-700 text-white uppercase px-3 py-2 rounded border border-gray-500 focus:border-blue-400 outline-none mb-3 text-xs resize-none"
          rows={3}
          placeholder="Ingrese el motivo de la autorización..."
          maxLength={200}
          disabled={cargando}
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={cargando}
            className="flex-1 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleAutorizar}
            disabled={cargando}
            className={`flex-1 py-2 rounded text-white text-sm font-bold disabled:opacity-50 ${
              tipoAutorizacion === 'A'
                ? 'bg-purple-600 hover:bg-purple-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {cargando ? 'Autorizando...' : `✓ Autorizar ${tipoLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
