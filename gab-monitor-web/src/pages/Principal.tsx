// src/pages/Principal.tsx — con todos los modales de doble clic cableados
import { useState, useCallback } from 'react';
import { useInventario } from '../hooks/useInventario';
import { InventarioTable }         from '../components/inventario/InventarioTable';
import { FiltrosBarra }            from '../components/inventario/FiltrosBarra';
import { EstadisticasPanel }       from '../components/inventario/EstadisticasPanel';
import { ModalAuth }               from '../components/autorizacion/ModalAuth';
import { ModalAutorizacion }       from '../components/autorizacion/ModalAutorizacion';
import { MapaAlmacen }             from '../components/almacen/MapaAlmacen';
import { ModalDetalleEmbarque }    from '../components/detalles/ModalDetalleEmbarque';
import { ModalDetallePresplit }    from '../components/detalles/ModalDetallePresplit';
import { ModalReciboInfo }         from '../components/detalles/ModalReciboInfo';
import type {
  FiltroInventario,
  ItemInventario,
  TarimaParaAutorizar,
} from '../types/inventario.types';

// ─── Estado de los modales de doble clic ────────────────────────────────────

type ModalDetalle =
  | { tipo: 'embarque';  item: ItemInventario }
  | { tipo: 'presplit';  item: ItemInventario }
  | { tipo: 'recibo';    item: ItemInventario }
  | { tipo: 'mapa';      item: ItemInventario }
  | { tipo: 'ubica-manual'; item: ItemInventario }
  | null;

export function Principal() {
  const [filtro, setFiltro]             = useState<FiltroInventario>('todos');
  const [buscar, setBuscar]             = useState('');
  const [inputBuscar, setInputBuscar]   = useState('');
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());

  // Modales de autorización
  const [modalAuthVisible, setModalAuthVisible] = useState(false);
  const [modalAutorizar, setModalAutorizar]     = useState<null | { tipo: 'A' | 'C' }>(null);
  const [modoAutorizacion, setModoAutorizacion] = useState(false);

  // Modal de doble clic (uno a la vez)
  const [modalDetalle, setModalDetalle] = useState<ModalDetalle>(null);

  // Ubicación manual — estado para la asignación
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');

  const {
    data, isLoading, isFetching, segundosHastaRefresco, refrescarManual,
  } = useInventario(filtro, buscar);

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  const handleKeyBuscar = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') setBuscar(inputBuscar.toUpperCase());
  }, [inputBuscar]);

  const handleLimpiarBusqueda = useCallback(() => {
    setInputBuscar(''); setBuscar(''); setFiltro('todos'); setSeleccionadas(new Set());
  }, []);

  // ── Selección ─────────────────────────────────────────────────────────────
  const handleFilaSeleccionada = useCallback((idx: number) => {
    const item = data?.items[idx];
    if (!item || item.conse !== 2) return;
    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, [data?.items]);

  const tarimasSeleccionadas: TarimaParaAutorizar[] = [...seleccionadas]
    .map(idx => data?.items[idx])
    .filter((item): item is ItemInventario => !!item && item.conse === 2)
    .map(item => ({
      folio:   item.nombre.substring(0, 6),
      cveProd: item.cvePro,
      tarima:  item.tarima,
      tipo:    item.tipo as 'PTC' | 'PTP',
    }));

  const handleFiltroChange = useCallback((f: FiltroInventario) => {
    setFiltro(f); setSeleccionadas(new Set());
  }, []);

  const handleExitoAutorizacion = useCallback(() => {
    setModalAutorizar(null); setSeleccionadas(new Set()); refrescarManual();
  }, [refrescarManual]);

  // ── Callbacks de doble clic ───────────────────────────────────────────────

  /** Col 7 original (CANTIDAD) → FrmConsDet */
  const handleAbrirDetalle = useCallback((item: ItemInventario, tipo: 'embarque' | 'presplit') => {
    setModalDetalle({ tipo, item });
  }, []);

  /** Col 0 original (NOMBRE) → ReciboPTC / ReciboPTP */
  const handleAbrirRecibo = useCallback((item: ItemInventario) => {
    setModalDetalle({ tipo: 'recibo', item });
  }, []);

  /** Col 13 original (UBICA) con valor → FrmLocaliza */
  const handleAbrirMapa = useCallback((item: ItemInventario) => {
    setModalDetalle({ tipo: 'mapa', item });
  }, []);

  /** Col 13 original (UBICA) sin valor → FrmUbicaManual */
  const handleAbrirUbicaManual = useCallback((item: ItemInventario) => {
    setNuevaUbicacion('');
    setModalDetalle({ tipo: 'ubica-manual', item });
  }, []);

  const cerrarModal = useCallback(() => setModalDetalle(null), []);

  // ── Formato del contador ──────────────────────────────────────────────────
  const formatSegundos = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-800 text-white font-sans flex flex-col">

      {/* ═══ HEADER ══════════════════════════════════════════════════════════ */}
      <header className="bg-gray-900 px-3 py-2 border-b border-gray-700 flex flex-wrap items-center gap-2">
        <div className="flex-shrink-0">
          <h1 className="text-yellow-400 text-sm font-bold leading-tight">CADUCIDADES AL DÍA</h1>
          <p className="text-gray-400 text-xs">{fechaHoy}</p>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <input type="text" value={inputBuscar}
            onChange={e => setInputBuscar(e.target.value)}
            onKeyDown={handleKeyBuscar}
            className="bg-gray-700 text-white uppercase px-2 py-1 rounded border border-gray-500 w-52 text-xs focus:border-blue-400 outline-none"
            placeholder="Buscar producto (Enter)..." />
          {buscar && (
            <button onClick={handleLimpiarBusqueda}
              className="bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-xs" title="Limpiar">✕</button>
          )}
        </div>

        {data?.metricas && (
          <div className="flex-1 min-w-0">
            <EstadisticasPanel metricas={data.metricas} />
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {!modoAutorizacion ? (
            <button onClick={() => setModalAuthVisible(true)}
              className="px-2 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 border border-gray-500">
              🔐 Autorizar
            </button>
          ) : (
            <button onClick={() => { setModoAutorizacion(false); setSeleccionadas(new Set()); }}
              className="px-2 py-1 text-xs rounded bg-green-700 hover:bg-green-600 border border-green-500">
              ✓ Autorizando
            </button>
          )}
          <span className={`font-mono text-xs px-2 py-1 rounded border ${
            segundosHastaRefresco < 60 ? 'text-orange-300 border-orange-700' : 'text-gray-300 border-gray-600'
          }`}>⏱ {formatSegundos(segundosHastaRefresco)}</span>
          <button onClick={refrescarManual} disabled={isFetching}
            className="px-2 py-1 text-xs rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 border border-blue-500">
            {isFetching ? '⏳' : '🔄'}
          </button>
        </div>
      </header>

      {/* ═══ FILTROS ══════════════════════════════════════════════════════════ */}
      <FiltrosBarra
        filtroActivo={filtro}
        onFiltroChange={handleFiltroChange}
        tarimasSeleccionadasCount={tarimasSeleccionadas.length}
        modoAutorizacion={modoAutorizacion}
        onAutorizarTrailer={() => setModalAutorizar({ tipo: 'A' })}
        onAutorizarCamioneta={() => setModalAutorizar({ tipo: 'C' })}
      />

      {/* ═══ TABLA ════════════════════════════════════════════════════════════ */}
      <main className="flex-1 px-1 py-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-white text-lg mb-2">⏳ Generando información...</div>
              <div className="text-gray-400 text-sm">Consultando GAB_Irapuato</div>
            </div>
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-400 text-sm">
              {buscar ? `Sin resultados para "${buscar}"` : 'Sin inventario disponible'}
            </div>
          </div>
        ) : (
          <InventarioTable
            items={data?.items ?? []}
            seleccionadas={seleccionadas}
            onFilaSeleccionada={handleFilaSeleccionada}
            modoAutorizacion={modoAutorizacion}
            isFetching={isFetching}
            onAbrirDetalle={handleAbrirDetalle}
            onAbrirRecibo={handleAbrirRecibo}
            onAbrirMapa={handleAbrirMapa}
            onAbrirUbicaManual={handleAbrirUbicaManual}
          />
        )}
      </main>

      {/* ═══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 border-t border-gray-700 px-3 py-1 text-xs text-gray-500 flex justify-between">
        <span>Comercializadora GAB S.A. de C.V. — Irapuato, Gto.</span>
        <span>
          {data?.total != null ? `${data.total} registros` : ''}
          {data?.generadoEn && ` · ${new Date(data.generadoEn).toLocaleTimeString('es-MX')}`}
        </span>
      </footer>

      {/* ═══ MODALES DE AUTORIZACIÓN ══════════════════════════════════════════ */}
      {modalAuthVisible && (
        <ModalAuth onClose={() => setModalAuthVisible(false)}
          onSuccess={() => { setModoAutorizacion(true); setModalAuthVisible(false); }} />
      )}
      {modalAutorizar && tarimasSeleccionadas.length > 0 && (
        <ModalAutorizacion tarimas={tarimasSeleccionadas}
          tipoAutorizacion={modalAutorizar.tipo}
          onClose={() => setModalAutorizar(null)}
          onExito={handleExitoAutorizacion} />
      )}

      {/* ═══ MODALES DE DOBLE CLIC ════════════════════════════════════════════ */}

      {/* FrmConsDet — historial embarques (col CANT double-click) */}
      {modalDetalle?.tipo === 'embarque' && (
        <ModalDetalleEmbarque item={modalDetalle.item} onClose={cerrarModal} />
      )}

      {/* FrmConsDetpresplit — detalle presplit (col PRESPL double-click) */}
      {modalDetalle?.tipo === 'presplit' && (
        <ModalDetallePresplit item={modalDetalle.item} onClose={cerrarModal} />
      )}

      {/* ReciboPTC / ReciboPTP — info recibo (col FOLIO-TARIMA double-click) */}
      {modalDetalle?.tipo === 'recibo' && (
        <ModalReciboInfo item={modalDetalle.item} onClose={cerrarModal} />
      )}

      {/* FrmLocaliza — mapa con ubicación resaltada (col UBICACIÓN doble-clic CON valor) */}
      {modalDetalle?.tipo === 'mapa' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 w-full max-w-2xl shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-white font-bold">
                  Ubicación: {modalDetalle.item.ubicacion}
                </h3>
                <p className="text-gray-400 text-xs">
                  {modalDetalle.item.prod} · {modalDetalle.item.nombre}
                </p>
                <p className="text-yellow-300 text-xs font-mono mt-0.5">
                  CANT: {modalDetalle.item.existencia.toLocaleString()}
                  {'     '}SURTIDO: {(modalDetalle.item.existencia - modalDetalle.item.cantidad).toLocaleString()}
                  {'    '}X SURTIR: {modalDetalle.item.cantidad.toLocaleString()}
                </p>
              </div>
              <button onClick={cerrarModal}
                className="text-gray-400 hover:text-white text-lg px-2">✕</button>
            </div>
            <MapaAlmacen posicionResaltada={modalDetalle.item.ubicacion.trim()} />
          </div>
        </div>
      )}

      {/* FrmUbicaManual — asignar ubicación (col UBICACIÓN doble-clic SIN valor) */}
      {modalDetalle?.tipo === 'ubica-manual' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 w-full max-w-2xl shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-white font-bold">Asignar Ubicación</h3>
                <p className="text-gray-400 text-xs">
                  {modalDetalle.item.prod} · {modalDetalle.item.nombre} · {modalDetalle.item.tipo}
                </p>
              </div>
              <button onClick={cerrarModal}
                className="text-gray-400 hover:text-white text-lg px-2">✕</button>
            </div>

            {/* Instrucción */}
            <p className="text-yellow-300 text-xs mb-3">
              Haga clic en una posición del mapa para asignarla:
            </p>

            {/* Mapa interactivo */}
            <MapaAlmacen
              soloLectura={false}
              posicionResaltada={nuevaUbicacion || undefined}
              onPosicionClick={(posId) => setNuevaUbicacion(posId)}
            />

            {/* Posición seleccionada + botón guardar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <span className="text-gray-400 text-xs">Posición seleccionada: </span>
                <span className="text-white font-mono font-bold text-sm">
                  {nuevaUbicacion || '—'}
                </span>
              </div>
              <button
                onClick={async () => {
                  if (!nuevaUbicacion) return;
                  try {
                    const item = modalDetalle.item;
                    await fetch(`${(import.meta as any).env?.VITE_API_URL ?? '/api'}/ubicacion`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        folio:        item.nombre.substring(0, 6),
                        cveProd:      item.cvePro,
                        tarima:       item.tarima,
                        tipo:         item.tipo,
                        ubicacion:    nuevaUbicacion,
                        usuario:      'WEB',
                        nombreMaquina: window.location.hostname,
                      }),
                    });
                    cerrarModal();
                    refrescarManual();
                  } catch (e) {
                    alert('Error al guardar la ubicación');
                  }
                }}
                disabled={!nuevaUbicacion}
                className="px-4 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm rounded font-bold">
                Guardar Ubicación
              </button>
              <button onClick={cerrarModal}
                className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
