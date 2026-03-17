// src/components/detalles/ModalReciboInfo.tsx
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

export function ModalReciboInfo({ item, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recibo = extraerRecibo(item.nombre);
  const tarima = item.tarima || extraerTarima(item.nombre);
  const esPTC = item.tipo === 'PTC';

  useEffect(() => {
    let url: string;
    if (esPTC) {
      url = `${BASE_URL}/tarimas/recibo-ptc?recibo=${encodeURIComponent(recibo)}&prod=${encodeURIComponent(item.cvePro)}`;
    } else {
      url = `${BASE_URL}/tarimas/recibo-ptp?folio=${encodeURIComponent(recibo)}&tarima=${encodeURIComponent(tarima)}&prod=${encodeURIComponent(item.cvePro)}`;
    }

    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setData(d); setCargando(false); })
      .catch(e => { setError(String(e)); setCargando(false); });
  }, [recibo, tarima, item.cvePro, esPTC]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl shadow-slate-900/20 flex flex-col max-h-[90vh] ring-1 ring-slate-200">

        {/* Header Corporativo - Diferenciado por tipo */}
        <div className={`flex items-start justify-between p-6 border-b border-slate-200 rounded-t-2xl ${esPTC
            ? 'bg-gradient-to-r from-emerald-800 to-teal-700'
            : 'bg-gradient-to-r from-orange-700 to-amber-600'
          }`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white text-xs font-semibold tracking-wide uppercase backdrop-blur-sm">
                  {item.tipo}
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {esPTC ? 'Recibo' : 'Folio'} {recibo}
                </h2>
              </div>
              <p className="text-white/80 font-mono text-sm">
                {item.prod} <span className="text-white/40">|</span> {item.nombre}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 group"
          >
            <svg className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {cargando && (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <div className={`animate-spin rounded-full h-6 w-6 border-2 border-slate-300 ${esPTC ? 'border-t-emerald-600' : 'border-t-orange-600'}`} />
                <span className="text-slate-500 font-medium">Cargando información...</span>
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
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${esPTC ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                  <svg className={`w-4 h-4 ${esPTC ? 'text-emerald-700' : 'text-orange-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  Datos del {esPTC ? 'Recibo' : 'Folio'}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {esPTC ? (
                  <>
                    <InfoCard label="Recibo" value={data.recibo ?? data.Recibo} highlight />
                    <InfoCard label="Fecha" value={data.fecha ?? data.Fecha} />
                    <InfoCard label="Producto" value={data.producto ?? data.Producto} span highlight />
                    <InfoCard label="Productor" value={data.productor ?? data.Productor} span />
                    <InfoCard label="Rancho" value={data.rancho ?? data.Rancho} />
                    <InfoCard label="Campo" value={data.campo ?? data.Campo} />
                    <InfoCard label="Región" value={data.region ?? data.Region} />
                    <InfoCard label="Tipo" value={data.tipoRecibo ?? data.TipoRecibo} />
                    <InfoCard label="Cantidad" value={fmt(data.cantidad ?? data.Cantidad)} numeric />
                    <InfoCard label="Peso Bruto" value={`${fmt2(data.pesoBruto ?? data.PesoBruto)} kg`} numeric />
                    <InfoCard label="Tara" value={`${fmt2(data.tara ?? data.Tara)} kg`} numeric />
                    <InfoCard label="Peso Neto" value={`${fmt2(data.pesoNeto ?? data.PesoNeto)} kg`} numeric accent />
                  </>
                ) : (
                  <>
                    <InfoCard label="Folio" value={data.folio ?? data.Folio} highlight />
                    <InfoCard label="Fecha" value={data.fecha ?? data.Fecha} />
                    <InfoCard label="Producto" value={data.producto ?? data.Producto} span highlight />
                    <InfoCard label="Lote" value={data.lote ?? data.Lote} accent />
                    <InfoCard label="Fecha Hist." value={data.fechaHistRecep ?? data.FechaHistRecep} />

                    <div className="col-span-2 grid grid-cols-3 gap-3">
                      <InfoCard label="Cajas Tot." value={fmt(data.cajas ?? data.Cajas)} numeric />
                      <InfoCard label="Surtidas" value={fmt(data.cajasSurtidas ?? data.CajasSurtidas)} numeric />
                      <InfoCard
                        label="Pendientes"
                        value={fmt(data.cajasPendientes ?? data.CajasPendientes)}
                        numeric
                        warning={(data.cajasPendientes ?? 0) > 0}
                      />
                    </div>

                    <InfoCard label="Peso Neto" value={`${fmt2(data.pesoNeto ?? data.PesoNeto)} kg`} numeric accent />
                    <InfoCard label="Núm. Unidades" value={fmt(data.numUnidades ?? data.NumUnidades)} numeric />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end bg-white rounded-b-2xl">
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

function InfoCard({
  label,
  value,
  span,
  numeric,
  highlight,
  accent,
  warning
}: {
  label: string;
  value: any;
  span?: boolean;
  numeric?: boolean;
  highlight?: boolean;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={`group p-4 rounded-lg border transition-all duration-200 ${span ? 'col-span-2' : ''
      } ${highlight
        ? 'bg-emerald-50/50 border-emerald-200'
        : accent
          ? 'bg-sky-50/50 border-sky-200'
          : warning
            ? 'bg-amber-50/50 border-amber-200'
            : 'bg-white border-slate-200 hover:border-slate-300'
      }`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm ${numeric ? 'font-mono' : ''} ${highlight ? 'text-emerald-900 font-semibold' :
          accent ? 'text-sky-900 font-semibold' :
            warning ? 'text-amber-900 font-semibold' :
              'text-slate-700'
        }`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

const fmt = (v: any) => v != null ? Number(v).toLocaleString() : '—';
const fmt2 = (v: any) => v != null ? Number(v).toFixed(2) : '—';