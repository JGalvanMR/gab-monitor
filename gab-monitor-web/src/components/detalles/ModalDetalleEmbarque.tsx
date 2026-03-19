// src/components/detalles/ModalDetalleEmbarque.tsx
// Diseño Corporativo GAB / Mr. Lucky - Profesional y refinado

import { useEffect, useState } from 'react';
import type { ItemInventario } from '../../types/inventario.types';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';

interface Props {
  item: ItemInventario;
  onClose: () => void;
}

interface Embarque {
  EmbFolio: string;
  Cajas: number;
  Seccion: number;
  Tempe: number;
  Fec_Cad: string;
  FechaCap: string;
  Split: string;
  Statu: string;
  Respon: string;
  peso?: number;
  pesoneto?: number;
  Lote?: string;
}

interface DetalleData {
  tipo: string;
  producto: string;
  recibo: string;
  tarima: string;
  cantidadTotal: number;
  surtidoTotal: number;
  porSurtir: number;
  embarques: Embarque[];
  splits: any[];
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

export function ModalDetalleEmbarque({ item, onClose }: Props) {
  const [data, setData] = useState<DetalleData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recibo = extraerRecibo(item.nombre);
  const tarima = item.tarima || extraerTarima(item.nombre);
  const surtido = item.existencia - item.cantidad;

  useEffect(() => {
    const url = `${BASE_URL}/tarimas/detalle?recibo=${encodeURIComponent(recibo)}&prod=${encodeURIComponent(item.cvePro)}&tarima=${encodeURIComponent(tarima)}&tipo=${item.tipo}`;

    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setData(d); setCargando(false); })
      .catch(e => { setError(String(e)); setCargando(false); });
  }, [recibo, item.cvePro, tarima, item.tipo]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl shadow-slate-900/20 flex flex-col max-h-[90vh] ring-1 ring-slate-200">

        {/* Header Corporativo */}
        <div className="flex items-start justify-between p-3 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 rounded-t-2xl">
          <div className="flex items-start gap-2">
            {/* Logo/Icono corporativo */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-800/20">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold tracking-wide uppercase">
                  {item.tipo}
                </span>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  {item.prod}
                </h2>
              </div>
              <p className="text-slate-500 font-mono text-sm flex items-center gap-2">
                <span className="text-slate-400">Recibo:</span> {recibo}
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">Tarima:</span> {tarima}
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
          <StatBox label="Existencia" value={item.existencia} variant="default"/>
          <StatBox label="Surtido" value={surtido} variant="info" />
          <StatBox label="Por Surtir" value={item.cantidad} variant={item.cantidad > 0 ? "warning" : "success"} />
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50">
          {cargando && (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-emerald-600" />
                <span className="text-slate-500 font-medium">Cargando datos del embarque...</span>
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

          {data && (
            <div className="space-y-6">
              {/* Embarques */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Embarques
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-medium">
                      {data.embarques.length}
                    </span>
                  </div>
                </div>

                {data.embarques.length === 0 ? (
                  <EmptyState message="No hay embarques registrados para esta tarima" />
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Folio</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Cajas</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Sección</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Temp.</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Caducidad</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Captura</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Split</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Estatus</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Responsable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.embarques.map((e, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-mono font-medium text-emerald-700">{e.EmbFolio}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                              {e.Cajas.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-slate-600">{e.Seccion}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700">
                                {e.Tempe}°C
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-amber-600 text-xs">{e.Fec_Cad}</td>
                            <td className="px-4 py-3 font-mono text-slate-500 text-xs">{e.FechaCap}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                                {e.Split}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge status={e.Statu} />
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-sm truncate max-w-[140px]">{e.Respon}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Splits */}
              {data.splits.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Splits
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-medium">
                      {data.splits.length}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Fecha</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Cajas</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Estatus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.splits.map((s: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-700">{s.fecha ?? s.Fecha}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                              {(s.cajas ?? s.Cajas ?? 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge status={s.estatus ?? s.Estatus} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer Corporativo */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-white rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Sistema GAB • Mr. Lucky
          </div>
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

// Componentes auxiliares
function StatBox({ label, value, variant }: { label: string; value: number; variant: 'default' | 'info' | 'warning' | 'success' }) {
  const variants = {
    default: 'bg-white text-slate-800',
    info: 'bg-sky-50/50 text-sky-800',
    warning: 'bg-amber-50/50 text-amber-800',
    success: 'bg-emerald-50/50 text-emerald-800',
  };

  return (
    <div className={`px-4 py-2 ${variants[variant]}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0">{label}</p>
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