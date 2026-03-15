// src/components/inventario/InventarioTable.tsx
import { useState, useCallback } from 'react';
import type { ItemInventario } from '../../types/inventario.types';

interface Props {
  items: ItemInventario[];
  seleccionadas: Set<number>;
  onFilaSeleccionada: (idx: number) => void;
  modoAutorizacion: boolean;
  isFetching: boolean;
  onAbrirMapa?: (item: ItemInventario) => void;
  onAbrirDetalle?: (item: ItemInventario, tipo: 'embarque' | 'presplit') => void;
}

/** Mapeo de clases CSS para el semáforo de colores (RN-002) */
const COLOR_CLASES: Record<string, string> = {
  'expiry-red':       'bg-red-700 hover:bg-red-600 text-white',
  'expiry-orange':    'bg-orange-600 hover:bg-orange-500 text-white',
  'expiry-yellow':    'bg-yellow-400 hover:bg-yellow-300 text-gray-900',
  'expiry-green':     'bg-green-700 hover:bg-green-600 text-white',
  'preaut-trailer':   'bg-purple-700 hover:bg-purple-600 text-white',
  'preaut-camioneta': 'bg-blue-700 hover:bg-blue-600 text-white',
};

export function InventarioTable({
  items,
  seleccionadas,
  onFilaSeleccionada,
  modoAutorizacion,
  isFetching,
  onAbrirMapa,
  onAbrirDetalle,
}: Props) {
  return (
    <div className="relative">
      {/* Barra de progreso sutil cuando está cargando */}
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse z-20" />
      )}

      <div className="overflow-auto max-h-[calc(100vh-148px)]">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead className="sticky top-0 bg-gray-700 z-10 text-gray-200">
            <tr>
              {modoAutorizacion && (
                <th className="w-7 px-1 py-1.5 border-b border-gray-600">AUT</th>
              )}
              <th className="px-2 py-1.5 text-left border-b border-gray-600 min-w-[240px]">FOLIO - TARIMA</th>
              <th className="px-2 py-1.5 border-b border-gray-600 w-20">FECHA ELA</th>
              <th className="px-2 py-1.5 border-b border-gray-600 w-10">LOTE</th>
              <th className="px-2 py-1.5 border-b border-gray-600 w-20">FECHA CAD</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-14">DIAS/TEO</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-14">EXIST/FIS</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-14 font-bold">CANT</th>
              <th className="px-2 py-1.5 border-b border-gray-600 w-16">UBICACIÓN</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-10">PRESPL</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-18">PESO EST</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <FilaInventario
                key={idx}
                item={item}
                idx={idx}
                seleccionada={seleccionadas.has(idx)}
                modoAutorizacion={modoAutorizacion}
                onSeleccionar={() => onFilaSeleccionada(idx)}
                onAbrirMapa={onAbrirMapa}
                onAbrirDetalle={onAbrirDetalle}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fila individual ─────────────────────────────────────────────────────────

interface FilaProps {
  item: ItemInventario;
  idx: number;
  seleccionada: boolean;
  modoAutorizacion: boolean;
  onSeleccionar: () => void;
  onAbrirMapa?: (item: ItemInventario) => void;
  onAbrirDetalle?: (item: ItemInventario, tipo: 'embarque' | 'presplit') => void;
}

function FilaInventario({
  item, idx, seleccionada, modoAutorizacion,
  onSeleccionar, onAbrirMapa, onAbrirDetalle,
}: FilaProps) {
  // ── Fila de Header de producto (Conse=1) ──────────────────────────────────
  if (item.conse === 1) {
    return (
      <tr className="bg-cyan-800 font-bold select-none">
        {modoAutorizacion && <td className="border-b border-cyan-700" />}
        <td
          colSpan={10}
          className="px-2 py-0.5 text-cyan-100 border-b border-cyan-700 tracking-wide"
        >
          {item.prod}
        </td>
      </tr>
    );
  }

  // ── Fila de Total producto (Conse=3) ──────────────────────────────────────
  if (item.conse === 3) {
    return (
      <tr className="bg-gray-600 text-gray-100 select-none">
        {modoAutorizacion && <td className="border-b border-gray-500" />}
        <td className="px-2 py-0.5 border-b border-gray-500 text-gray-300 text-xs italic" colSpan={4}>
          {item.fecCad}
        </td>
        <td className="px-2 py-0.5 border-b border-gray-500 text-right font-mono font-bold">
          {item.dias !== 0 ? item.dias.toLocaleString() : ''}
        </td>
        <td className="px-2 py-0.5 border-b border-gray-500 text-right font-mono">
          {item.existencia !== 0 ? item.existencia.toLocaleString() : ''}
        </td>
        <td className="px-2 py-0.5 border-b border-gray-500 text-right font-mono font-bold text-white">
          {item.cantidad.toLocaleString()}
        </td>
        <td colSpan={3} className="border-b border-gray-500" />
      </tr>
    );
  }

  // ── Fila de Total General (Conse=4) ───────────────────────────────────────
  if (item.conse === 4) {
    return (
      <tr className="bg-gray-900 border-t-2 border-yellow-500 select-none">
        {modoAutorizacion && <td />}
        <td className="px-2 py-1 text-yellow-400 font-bold" colSpan={6}>
          {item.fecCad}
        </td>
        <td className="px-2 py-1 text-right font-mono font-bold text-yellow-300 text-sm">
          {item.cantidad.toLocaleString()}
        </td>
        <td colSpan={3} />
      </tr>
    );
  }

  // ── Fila de Detalle de tarima (Conse=2) ───────────────────────────────────
  const colorClass = COLOR_CLASES[item.colorClase] ?? 'bg-green-700 hover:bg-green-600 text-white';
  const selClass   = seleccionada ? 'ring-2 ring-white ring-inset' : '';

  return (
    <tr
      className={`${colorClass} ${selClass} cursor-pointer transition-colors`}
      onClick={onSeleccionar}
    >
      {modoAutorizacion && (
        <td className="text-center px-1 border-b border-black/10">
          <input
            type="checkbox"
            checked={seleccionada}
            onChange={onSeleccionar}
            onClick={e => e.stopPropagation()}
            className="cursor-pointer w-3 h-3"
          />
        </td>
      )}

      {/* Folio - Tarima (doble clic → detalle embarque) */}
      <td
        className="px-2 py-0.5 font-mono border-b border-black/10 hover:underline"
        onDoubleClick={e => { e.stopPropagation(); onAbrirDetalle?.(item, 'embarque'); }}
        title="Doble clic: ver detalle de embarques"
      >
        {item.nombre}
        {item.tipo && (
          <span className="ml-1 opacity-60 text-xs">[{item.tipo}]</span>
        )}
      </td>

      <td className="px-2 py-0.5 text-center border-b border-black/10 tabular-nums">
        {item.fechaElaboracion?.substring(0, 10)}
      </td>

      <td className="px-2 py-0.5 text-center border-b border-black/10">
        {item.lote}
      </td>

      {/* Fecha Caducidad (doble clic → más información) */}
      <td
        className="px-2 py-0.5 text-center border-b border-black/10 tabular-nums"
        onDoubleClick={e => { e.stopPropagation(); }}
        title={`Días restantes: ${item.dias}`}
      >
        {item.fecCad}
      </td>

      <td className="px-2 py-0.5 text-right font-mono border-b border-black/10 tabular-nums">
        {item.dias}
      </td>

      <td className="px-2 py-0.5 text-right font-mono border-b border-black/10 tabular-nums">
        {item.existencia.toLocaleString()}
      </td>

      <td className="px-2 py-0.5 text-right font-mono font-bold border-b border-black/10 tabular-nums">
        {item.cantidad.toLocaleString()}
      </td>

      {/* Ubicación (doble clic → abrir mapa) */}
      <td
        className={`px-2 py-0.5 text-center border-b border-black/10 ${
          item.ubicacion.trim() ? 'hover:underline cursor-pointer' : ''
        }`}
        onDoubleClick={e => {
          e.stopPropagation();
          if (item.ubicacion.trim()) onAbrirMapa?.(item);
        }}
        title={item.ubicacion.trim() ? `Doble clic: ver en mapa (${item.ubicacion})` : ''}
      >
        {item.ubicacion}
      </td>

      {/* Pre-split (doble clic → detalle pre-split) */}
      <td
        className={`px-2 py-0.5 text-right font-mono border-b border-black/10 tabular-nums ${
          item.presplit > 0 ? 'hover:underline cursor-pointer' : ''
        }`}
        onDoubleClick={e => {
          e.stopPropagation();
          if (item.presplit > 0) onAbrirDetalle?.(item, 'presplit');
        }}
        title={item.presplit > 0 ? 'Doble clic: ver detalle pre-split' : ''}
      >
        {item.presplit > 0 ? item.presplit : ''}
      </td>

      <td className="px-2 py-0.5 text-right font-mono border-b border-black/10 tabular-nums">
        {item.pesoEstimado}
      </td>
    </tr>
  );
}
