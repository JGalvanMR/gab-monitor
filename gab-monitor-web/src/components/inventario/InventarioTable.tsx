// src/components/inventario/InventarioTable.tsx
// FIX #3: Mapeo correcto de columnas para doble clic, según DGDatos_CellDoubleClick original:
//
//  Original WinForms col → Acción:
//  col  0 (NOMBRE)  → ReciboPTC / ReciboPTP  (según TIPO)
//  col  7 (CANTIDAD)→ FrmConsDet (detalle embarques)
//  col 13 (UBICA)   → FrmLocaliza (con ubic) / FrmUbicaManual (sin ubic)
//  col 15 (PRESPLIT)→ FrmConsDetpresplit
//
//  En nuestra tabla React las columnas equivalentes son:
//  col FOLIO-TARIMA → ReciboPTC / ReciboPTP
//  col CANT         → FrmConsDet
//  col UBICACIÓN    → FrmLocaliza / FrmUbicaManual
//  col PRESPL       → FrmConsDetpresplit

import type { ItemInventario } from '../../types/inventario.types';

export interface AccionesDetalle {
  onAbrirDetalle: (item: ItemInventario, tipo: 'embarque' | 'presplit') => void;
  onAbrirRecibo: (item: ItemInventario) => void;
  onAbrirMapa: (item: ItemInventario) => void;
  onAbrirUbicaManual: (item: ItemInventario) => void;
}

interface Props extends AccionesDetalle {
  items: ItemInventario[];
  seleccionadas: Set<number>;
  onFilaSeleccionada: (idx: number) => void;
  modoAutorizacion: boolean;
  isFetching: boolean;
}

const COLOR_CLASES: Record<string, string> = {
  'expiry-red': 'bg-red-700 hover:bg-red-600 text-white',
  'expiry-orange': 'bg-orange-600 hover:bg-orange-500 text-white',
  'expiry-yellow': 'bg-yellow-400 hover:bg-yellow-300 text-gray-900',
  'expiry-green': 'bg-green-700 hover:bg-green-600 text-white',
  'preaut-trailer': 'bg-purple-700 hover:bg-purple-600 text-white',
  'preaut-camioneta': 'bg-blue-700 hover:bg-blue-600 text-white',
};

export function InventarioTable({
  items, seleccionadas, onFilaSeleccionada,
  modoAutorizacion, isFetching,
  onAbrirDetalle, onAbrirRecibo, onAbrirMapa, onAbrirUbicaManual,
}: Props) {
  return (
    <div className="relative">
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse z-20" />
      )}
      <div className="overflow-auto max-h-[calc(100vh-148px)]">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead className="sticky top-0 bg-gray-700 z-10 text-gray-200">
            <tr>
              {modoAutorizacion && <th className="w-7 px-1 py-1.5 border-b border-gray-600">AUT</th>}
              <th className="px-2 py-1.5 text-left border-b border-gray-600 min-w-[220px]"
                title="Doble clic: ver info del recibo">FOLIO - TARIMA</th>
              <th className="px-2 py-1.5 border-b border-gray-600 w-20">FECHA ELA</th>
              <th className="px-2 py-1.5 border-b border-gray-600 w-10">LOTE</th>
              <th className="px-2 py-1.5 border-b border-gray-600 w-20">FECHA CAD</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-14">DIAS/TEO</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-14">EXIST/FIS</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-14 font-bold"
                title="Doble clic: ver detalle de embarques">CANT ▾</th>
              <th className="px-2 py-1.5 border-b border-gray-600 w-16"
                title="Doble clic: ver en mapa / asignar ubicación">UBICACIÓN ▾</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-10"
                title="Doble clic: ver detalle pre-split">PRESPL ▾</th>
              <th className="px-2 py-1.5 text-right border-b border-gray-600 w-18">PESO EST</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <FilaInventario
                key={idx}
                item={item}
                seleccionada={seleccionadas.has(idx)}
                modoAutorizacion={modoAutorizacion}
                onSeleccionar={() => onFilaSeleccionada(idx)}
                onAbrirDetalle={onAbrirDetalle}
                onAbrirRecibo={onAbrirRecibo}
                onAbrirMapa={onAbrirMapa}
                onAbrirUbicaManual={onAbrirUbicaManual}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fila individual ─────────────────────────────────────────────────────────

interface FilaProps extends AccionesDetalle {
  item: ItemInventario;
  seleccionada: boolean;
  modoAutorizacion: boolean;
  onSeleccionar: () => void;
}

function FilaInventario({
  item, seleccionada, modoAutorizacion, onSeleccionar,
  onAbrirDetalle, onAbrirRecibo, onAbrirMapa, onAbrirUbicaManual,
}: FilaProps) {

  // ── Header de producto (Conse=1) ──────────────────────────────────────────
  if (item.conse === 1) {
    return (
      <tr className="bg-cyan-800 font-bold select-none">
        {modoAutorizacion && <td className="border-b border-cyan-700" />}
        <td colSpan={10} className="px-2 py-0.5 text-cyan-100 border-b border-cyan-700 tracking-wide">
          {item.prod}
        </td>
      </tr>
    );
  }

  // ── Total de producto (Conse=3) ────────────────────────────────────────────
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

  // ── Total General (Conse=4) ────────────────────────────────────────────────
  if (item.conse === 4) {
    return (
      <tr className="bg-gray-900 border-t-2 border-yellow-500 select-none">
        {modoAutorizacion && <td />}
        <td className="px-2 py-1 text-yellow-400 font-bold" colSpan={6}>{item.fecCad}</td>
        <td className="px-2 py-1 text-right font-mono font-bold text-yellow-300 text-sm">
          {item.cantidad.toLocaleString()}
        </td>
        <td colSpan={3} />
      </tr>
    );
  }

  // ── Detalle de tarima (Conse=2) ────────────────────────────────────────────
  const colorClass = COLOR_CLASES[item.colorClase] ?? 'bg-green-700 hover:bg-green-600 text-white';
  const selClass = seleccionada ? 'ring-2 ring-white ring-inset' : '';
  const tieneUbic = item.ubicacion.trim().length > 0;

  return (
    <tr className={`${colorClass} ${selClass} cursor-pointer transition-colors`}
      onClick={onSeleccionar}>

      {modoAutorizacion && (
        <td className="text-center px-1 border-b border-black/10">
          <input type="checkbox" checked={seleccionada}
            onChange={onSeleccionar} onClick={e => e.stopPropagation()}
            className="cursor-pointer w-3 h-3" />
        </td>
      )}

      {/* ── Col 0: FOLIO-TARIMA
           Doble clic → ReciboPTC(recibo, prod) o ReciboPTP(nombre, prod, cvePro)
           Equivale a: e.ColumnIndex == 0 en WinForms */}
      <td className="px-2 py-0.5 font-mono border-b border-black/10 hover:underline"
        title={`Doble clic: ver info del recibo (${item.tipo})`}
        onDoubleClick={e => { e.stopPropagation(); onAbrirRecibo(item); }}>
        {item.nombre}
        {item.tipo && <span className="ml-1 opacity-50 text-xs">[{item.tipo}]</span>}
      </td>

      <td className="px-2 py-0.5 text-center border-b border-black/10 tabular-nums">
        {item.fechaElaboracion?.substring(0, 10)}
      </td>

      <td className="px-2 py-0.5 text-center border-b border-black/10">
        {item.lote}
      </td>

      <td className="px-2 py-0.5 text-center border-b border-black/10 tabular-nums"
        title={`Días restantes: ${item.dias}`}>
        {item.fecCad}
      </td>

      <td className="px-2 py-0.5 text-right font-mono border-b border-black/10 tabular-nums">
        {item.dias}
      </td>

      <td className="px-2 py-0.5 text-right font-mono border-b border-black/10 tabular-nums">
        {item.existencia.toLocaleString()}
      </td>

      {/* ── Col CANT (equivale a col 7 original)
           Doble clic → FrmConsDet (historial de embarques)
           WinForms: e.ColumnIndex == 7 AND conse == "2" */}
      <td className="px-2 py-0.5 text-right font-mono font-bold border-b border-black/10 tabular-nums
                     hover:underline cursor-pointer"
        title="Doble clic: ver historial de embarques (FrmConsDet)"
        onDoubleClick={e => { e.stopPropagation(); onAbrirDetalle(item, 'embarque'); }}>
        {item.cantidad.toLocaleString()}
      </td>

      {/* ── Col UBICACIÓN (equivale a col 13 original)
           Con ubicación  → FrmLocaliza (mapa resaltado)
           Sin ubicación  → FrmUbicaManual (asignar)
           WinForms: e.ColumnIndex == 13 AND conse == "2" */}
      <td className={`px-2 py-0.5 text-center border-b border-black/10 ${tieneUbic ? 'hover:underline cursor-pointer' : 'hover:bg-white/10 cursor-pointer'}`}
        title={tieneUbic
          ? `Doble clic: ver en mapa (${item.ubicacion}) — FrmLocaliza`
          : 'Doble clic: asignar ubicación — FrmUbicaManual'}
        onDoubleClick={e => {
          e.stopPropagation();
          if (tieneUbic) onAbrirMapa(item);
          else onAbrirUbicaManual(item);
        }}>
        {item.ubicacion || <span className="text-white/30 text-xs">—</span>}
      </td>

      {/* ── Col PRESPL (equivale a col 15 original)
           Doble clic → FrmConsDetpresplit
           WinForms: e.ColumnIndex == 15 */}
      <td className={`px-2 py-0.5 text-right font-mono border-b border-black/10 tabular-nums ${item.presplit > 0 ? 'hover:underline cursor-pointer' : ''}`}
        title={item.presplit > 0 ? 'Doble clic: ver detalle pre-split (FrmConsDetpresplit)' : ''}
        onDoubleClick={e => {
          e.stopPropagation();
          if (item.presplit > 0) onAbrirDetalle(item, 'presplit');
        }}>
        {item.presplit > 0 ? item.presplit : ''}
      </td>

      <td className="px-2 py-0.5 text-right font-mono border-b border-black/10 tabular-nums">
        {item.pesoEstimado}
      </td>
    </tr>
  );
}
