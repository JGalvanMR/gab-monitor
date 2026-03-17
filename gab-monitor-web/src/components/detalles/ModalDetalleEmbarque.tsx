// src/components/detalles/ModalDetalleEmbarque.tsx
// Equivalente a FrmConsDet del WinForms original.
// Se abre al dar doble clic en la columna CANT del grid (col 7 original).
// Muestra historial de embarques y splits de una tarima específica.

import { useEffect, useState } from 'react';
import type { ItemInventario } from '../../types/inventario.types';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';

interface Props {
  item: ItemInventario;
  onClose: () => void;
}

interface DetalleData {
  embarques: any[];
  splits: any[];
}

/// Extrae el recibo (primeros 6 chars de NOMBRE) — igual que WinForms:
/// PubRecibo = NOMBRE.Substring(0, 6)
function extraerRecibo(nombre: string): string {
  return nombre.substring(0, 6);
}

/// Extrae la tarima del NOMBRE — replica la lógica del WinForms:
/// int pos  = NOMBRE.IndexOf("-")
/// int pos2 = NOMBRE.IndexOf("--")
/// if (pos2 > 0) tam = pos2
/// PubTar = NOMBRE.Trim().Substring(pos+1, tam-(pos+1))
function extraerTarima(nombre: string): string {
  const nombreTrim = nombre.trim();
  const pos  = nombre.indexOf('-');
  const pos2 = nombre.indexOf('--');
  const tam  = pos2 > 0 ? pos2 : nombreTrim.length;
  const longitud = tam - (pos + 1);
  if (pos < 0 || longitud <= 0) return '';
  return nombreTrim.substr(pos + 1, longitud);
}

export function ModalDetalleEmbarque({ item, onClose }: Props) {
  const [data, setData]       = useState<DetalleData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]     = useState('');

  const recibo = extraerRecibo(item.nombre);
  const tarima = item.tarima || extraerTarima(item.nombre);

  // Cadena informativa igual que WinForms:
  // "CANT: X     SURTIDO: Y    X SURTIR: Z"
  const surtido    = item.existencia - item.cantidad;
  const cadenaInfo = `CANT: ${item.existencia.toLocaleString()}     SURTIDO: ${surtido.toLocaleString()}    X SURTIR: ${item.cantidad.toLocaleString()}`;

  useEffect(() => {
    const url = `${BASE_URL}/tarimas/detalle?recibo=${encodeURIComponent(recibo)}&prod=${encodeURIComponent(item.cvePro)}&tarima=${encodeURIComponent(tarima)}&tipo=${item.tipo}`;

    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setData(d); setCargando(false); })
      .catch(e => { setError(String(e)); setCargando(false); });
  }, [recibo, item.cvePro, tarima, item.tipo]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold">Detalle de Embarques</h2>
            <p className="text-gray-300 text-xs font-mono mt-0.5">
              {item.prod} &nbsp;·&nbsp; {item.nombre} &nbsp;·&nbsp; {item.tipo}
            </p>
            {/* Cadena informativa — igual al WinForms PubCadena */}
            <p className="text-yellow-300 text-xs font-mono mt-1 bg-gray-900 px-2 py-0.5 rounded">
              {cadenaInfo}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg px-2 ml-4">✕</button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cargando && (
            <div className="text-gray-400 text-center py-8">Consultando...</div>
          )}
          {error && (
            <div className="text-red-400 text-sm text-center py-4">{error}</div>
          )}
          {data && (
            <>
              {/* Embarques */}
              <section>
                <h3 className="text-cyan-300 text-xs font-bold uppercase mb-2 border-b border-gray-700 pb-1">
                  Embarques ({data.embarques.length})
                </h3>
                {data.embarques.length === 0 ? (
                  <p className="text-gray-500 text-xs italic">Sin embarques registrados</p>
                ) : (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-700 text-gray-300">
                        <th className="px-2 py-1 text-left">Fecha</th>
                        <th className="px-2 py-1 text-right">Cajas</th>
                        <th className="px-2 py-1 text-center">Estatus</th>
                        <th className="px-2 py-1 text-left">Destino</th>
                        <th className="px-2 py-1 text-left">Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.embarques.map((e: any, i: number) => (
                        <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/30">
                          <td className="px-2 py-0.5 font-mono">{e.fecha ?? e.Fecha}</td>
                          <td className="px-2 py-0.5 text-right font-mono font-bold">
                            {(e.cajas ?? e.Cajas ?? 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-0.5 text-center">
                            <span className={`px-1 rounded text-xs ${
                              (e.estatus ?? e.Estatus) === 'A'
                                ? 'bg-green-700 text-green-200'
                                : 'bg-gray-600 text-gray-300'
                            }`}>
                              {e.estatus ?? e.Estatus}
                            </span>
                          </td>
                          <td className="px-2 py-0.5">{e.destino ?? e.Destino}</td>
                          <td className="px-2 py-0.5 text-gray-400">{e.usuario ?? e.Usuario}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {/* Splits */}
              {data.splits.length > 0 && (
                <section>
                  <h3 className="text-cyan-300 text-xs font-bold uppercase mb-2 border-b border-gray-700 pb-1">
                    Splits ({data.splits.length})
                  </h3>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-700 text-gray-300">
                        <th className="px-2 py-1 text-left">Fecha</th>
                        <th className="px-2 py-1 text-right">Cajas</th>
                        <th className="px-2 py-1 text-center">Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.splits.map((s: any, i: number) => (
                        <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/30">
                          <td className="px-2 py-0.5 font-mono">{s.fecha ?? s.Fecha}</td>
                          <td className="px-2 py-0.5 text-right font-mono font-bold">
                            {(s.cajas ?? s.Cajas ?? 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-0.5 text-center">
                            {s.estatus ?? s.Estatus}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
        </div>

        <div className="p-3 border-t border-gray-700 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
