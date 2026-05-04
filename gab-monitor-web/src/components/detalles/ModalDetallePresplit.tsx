// src/components/detalles/ModalDetallePresplit.tsx
// Diseño Corporativo GAB / Mr. Lucky - Profesional y refinado

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
  const pos = nombre.indexOf('-');
  const pos2 = nombre.indexOf('--');
  const tam = pos2 > 0 ? pos2 : nombreTrim.length;
  const longitud = tam - (pos + 1);
  if (pos < 0 || longitud <= 0) return '';
  return nombreTrim.substr(pos + 1, longitud);
}

export function ModalDetallePresplit({ item, onClose }: Props) {
  const [filas, setFilas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recibo = extraerRecibo(item.nombre);
  const tarima = item.tarima || extraerTarima(item.nombre);
  const xSurtir = item.existencia - item.presplit;

  useEffect(() => {
    const url = `${BASE_URL}/tarimas/presplit?recibo=${encodeURIComponent(recibo)}&prod=${encodeURIComponent(item.cvePro)}&tarima=${encodeURIComponent(tarima)}`;

    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setFilas(d); setCargando(false); })
      .catch(e => { setError(String(e)); setCargando(false); });
  }, [recibo, item.cvePro, tarima]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl shadow-slate-900/20 flex flex-col max-h-[90vh] ring-1 ring-slate-200">

        {/* Header Corporativo */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 rounded-t-2xl">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-800/20">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-md bg-lime-100 text-lime-800 text-xs font-semibold tracking-wide uppercase">
                  Pre-Split
                </span>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  {item.prod}
                </h2>
              </div>
              <p className="text-slate-500 font-mono text-sm">
                {item.nombre}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200 group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-px bg-slate-200 border-b border-slate-200">
          <StatBox label="Existencia" value={item.existencia} variant="default" />
          <StatBox label="Pre-Split" value={item.presplit} variant="info" />
          <StatBox label="Por Surtir" value={xSurtir} variant={xSurtir > 0 ? "warning" : "success"} />
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {cargando && (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-emerald-600" />
                <span className="text-slate-500 font-medium">Consultando cajas en pre-split...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!cargando && !error && filas.length === 0 && (
            <EmptyState message="No se encontraron cajas en pre-split activas para esta tarima" />
          )}

          {filas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  Cajas en Proceso
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-medium">
                  {filas.length}
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Caja</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">IMEI</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Versión App</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filas.map((f: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-emerald-700 text-base">
                          {f.caja ?? f.Caja}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                          {f.imei ?? f.Imei ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 font-mono">
                            {f.version ?? f.Version ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-500 text-xs">
                          {f.fecha ?? f.Fecha}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={f.estatus ?? f.Estatus ?? 'A'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-white rounded-b-2xl">
          <span className="text-sm text-slate-500">
            <span className="font-mono font-semibold text-emerald-700">{filas.length}</span> caja(s) en pre-split
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, variant }: { label: string; value: number; variant: 'default' | 'info' | 'warning' | 'success' }) {
  const variants = {
    default: 'bg-white text-slate-800',
    info: 'bg-lime-50/50 text-lime-800',
    warning: 'bg-amber-50/50 text-amber-800',
    success: 'bg-emerald-50/50 text-emerald-800',
  };

  return (
    <div className={`px-6 py-4 ${variants[variant]}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono tracking-tight">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'A';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-red-100 text-red-800'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 rounded-lg border border-dashed border-slate-300 bg-slate-50">
      <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}