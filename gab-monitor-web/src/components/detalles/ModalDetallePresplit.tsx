// src/components/detalles/ModalDetallePresplit.tsx
// Equivalente a FrmConsDetpresplit del WinForms original.
// Se abre al dar doble clic en la columna PRESPL del grid (col 15 original).
// Muestra cajas en etapa de pre-split con info de IMEI y versión de app.

import { useEffect, useState } from 'react';
import type { ItemInventario } from '../../types/inventario.types';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';

interface Props {
  item: ItemInventario;
  onClose: () => void;
}

function extraerRecibo(nombre: string): string {
  return nombre.substring(0, 6);
}

function extraerTarima(nombre: string): string {
  const nombreTrim = nombre.trim();
  const pos  = nombre.indexOf('-');
  const pos2 = nombre.indexOf('--');
  const tam  = pos2 > 0 ? pos2 : nombreTrim.length;
  const longitud = tam - (pos + 1);
  if (pos < 0 || longitud <= 0) return '';
  return nombreTrim.substr(pos + 1, longitud);
}

export function ModalDetallePresplit({ item, onClose }: Props) {
  const [filas, setFilas]       = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');

  const recibo = extraerRecibo(item.nombre);
  const tarima = item.tarima || extraerTarima(item.nombre);

  // Cadena informativa del WinForms:
  // "CANT: X     PRESPLIT: Y    X SURTIR: Z"
  const xSurtir    = item.existencia - item.presplit;
  const cadenaInfo = `CANT: ${item.existencia.toLocaleString()}     PRESPLIT: ${item.presplit.toLocaleString()}    X SURTIR: ${xSurtir.toLocaleString()}`;

  useEffect(() => {
    const url = `${BASE_URL}/tarimas/presplit?recibo=${encodeURIComponent(recibo)}&prod=${encodeURIComponent(item.cvePro)}&tarima=${encodeURIComponent(tarima)}`;

    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setFilas(d); setCargando(false); })
      .catch(e => { setError(String(e)); setCargando(false); });
  }, [recibo, item.cvePro, tarima]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg w-full max-w-xl shadow-xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold">Detalle Pre-Split</h2>
            <p className="text-gray-300 text-xs font-mono mt-0.5">
              {item.prod} &nbsp;·&nbsp; {item.nombre} &nbsp;·&nbsp; {item.tipo}
            </p>
            <p className="text-yellow-300 text-xs font-mono mt-1 bg-gray-900 px-2 py-0.5 rounded">
              {cadenaInfo}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg px-2 ml-4">✕</button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          {cargando && (
            <div className="text-gray-400 text-center py-8">Consultando...</div>
          )}
          {error && (
            <div className="text-red-400 text-sm text-center py-4">{error}</div>
          )}
          {!cargando && !error && filas.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8 italic">
              No se encontraron cajas en pre-split activas para esta tarima
            </div>
          )}
          {filas.length > 0 && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-700 text-gray-300">
                  <th className="px-2 py-1 text-left">Caja</th>
                  <th className="px-2 py-1 text-left">IMEI</th>
                  <th className="px-2 py-1 text-left">Versión App</th>
                  <th className="px-2 py-1 text-center">Fecha</th>
                  <th className="px-2 py-1 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f: any, i: number) => (
                  <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/30">
                    <td className="px-2 py-0.5 font-mono font-bold">
                      {f.caja ?? f.Caja}
                    </td>
                    <td className="px-2 py-0.5 font-mono text-gray-300">
                      {f.imei ?? f.Imei ?? '—'}
                    </td>
                    <td className="px-2 py-0.5 text-gray-400">
                      {f.version ?? f.Version ?? '—'}
                    </td>
                    <td className="px-2 py-0.5 text-center font-mono">
                      {f.fecha ?? f.Fecha}
                    </td>
                    <td className="px-2 py-0.5 text-center">
                      <span className="bg-green-700 text-green-200 px-1 rounded text-xs">
                        {f.estatus ?? f.Estatus ?? 'A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-gray-700 flex justify-between items-center">
          <span className="text-gray-400 text-xs">
            {filas.length} caja(s) en pre-split
          </span>
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
