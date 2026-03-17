// src/components/detalles/ModalReciboInfo.tsx
// Equivalente a ReciboPTC() y ReciboPTP() del WinForms original.
// Se abre al dar doble clic en la columna FOLIO-TARIMA (col 0 original).
// Muestra información del recibo/orden de producción.

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

export function ModalReciboInfo({ item, onClose }: Props) {
  const [data, setData]         = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');

  const recibo = extraerRecibo(item.nombre);
  const tarima = item.tarima || extraerTarima(item.nombre);

  useEffect(() => {
    let url: string;

    if (item.tipo === 'PTC') {
      // ReciboPTC: recibo (6 chars), prod
      url = `${BASE_URL}/tarimas/recibo-ptc?recibo=${encodeURIComponent(recibo)}&prod=${encodeURIComponent(item.cvePro)}`;
    } else {
      // ReciboPTP: nombre completo (FOLIO-TARIMA), prod, cvePro
      url = `${BASE_URL}/tarimas/recibo-ptp?folio=${encodeURIComponent(recibo)}&tarima=${encodeURIComponent(tarima)}&prod=${encodeURIComponent(item.cvePro)}`;
    }

    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setData(d); setCargando(false); })
      .catch(e => { setError(String(e)); setCargando(false); });
  }, [recibo, tarima, item.cvePro, item.tipo]);

  const titulo = item.tipo === 'PTC' ? 'Información de Recibo PTC' : 'Información de Folio PTP';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold">{titulo}</h2>
            <p className="text-gray-300 text-xs font-mono mt-0.5">
              {item.prod} &nbsp;·&nbsp; {item.nombre}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg px-2">✕</button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          {cargando && <div className="text-gray-400 text-center py-8">Consultando...</div>}
          {error && <div className="text-red-400 text-sm text-center py-4">{error}</div>}
          {data && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {item.tipo === 'PTC' ? (
                <>
                  <Campo label="Recibo"     valor={data.recibo ?? data.Recibo} />
                  <Campo label="Fecha"      valor={data.fecha ?? data.Fecha} />
                  <Campo label="Producto"   valor={data.producto ?? data.Producto} span />
                  <Campo label="Productor"  valor={data.productor ?? data.Productor} span />
                  <Campo label="Rancho"     valor={data.rancho ?? data.Rancho} />
                  <Campo label="Campo"      valor={data.campo ?? data.Campo} />
                  <Campo label="Región"     valor={data.region ?? data.Region} />
                  <Campo label="Tipo"       valor={data.tipoRecibo ?? data.TipoRecibo} />
                  <Campo label="Cantidad"   valor={fmt(data.cantidad ?? data.Cantidad)} />
                  <Campo label="Peso Bruto" valor={`${fmt2(data.pesoBruto ?? data.PesoBruto)} kg`} />
                  <Campo label="Tara"       valor={`${fmt2(data.tara ?? data.Tara)} kg`} />
                  <Campo label="Peso Neto"  valor={`${fmt2(data.pesoNeto ?? data.PesoNeto)} kg`} />
                </>
              ) : (
                <>
                  <Campo label="Folio"         valor={data.folio ?? data.Folio} />
                  <Campo label="Fecha"         valor={data.fecha ?? data.Fecha} />
                  <Campo label="Producto"      valor={data.producto ?? data.Producto} span />
                  <Campo label="Lote"          valor={data.lote ?? data.Lote} />
                  <Campo label="Fecha Hist."   valor={data.fechaHistRecep ?? data.FechaHistRecep} />
                  <Campo label="Cajas Tot."    valor={fmt(data.cajas ?? data.Cajas)} />
                  <Campo label="Surtidas"      valor={fmt(data.cajasSurtidas ?? data.CajasSurtidas)} />
                  <Campo label="Pendientes"    valor={fmt(data.cajasPendientes ?? data.CajasPendientes)} />
                  <Campo label="Peso Neto"     valor={`${fmt2(data.pesoNeto ?? data.PesoNeto)} kg`} />
                  <Campo label="Núm. Unidades" valor={fmt(data.numUnidades ?? data.NumUnidades)} />
                </>
              )}
            </dl>
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

function Campo({ label, valor, span }: { label: string; valor: any; span?: boolean }) {
  return (
    <>
      <dt className={`text-gray-400 font-semibold ${span ? 'col-span-2 mt-1' : ''}`}>{label}</dt>
      <dd className={`text-white font-mono ${span ? 'col-span-2' : ''}`}>{valor ?? '—'}</dd>
    </>
  );
}

const fmt  = (v: any) => v != null ? Number(v).toLocaleString() : '—';
const fmt2 = (v: any) => v != null ? Number(v).toFixed(2) : '—';
