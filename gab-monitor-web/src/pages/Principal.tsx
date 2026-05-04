// src/pages/Principal.tsx
import { useState, useCallback } from 'react';
import { useInventario } from '../hooks/useInventario';
import { InventarioTable } from '../components/inventario/InventarioTable';
import { FiltrosBarra } from '../components/inventario/FiltrosBarra';
import { EstadisticasPanel } from '../components/inventario/EstadisticasPanel';
import { ModalAuth } from '../components/autorizacion/ModalAuth';
import { ModalAutorizacion } from '../components/autorizacion/ModalAutorizacion';
import { MapaAlmacen } from '../components/almacen/MapaAlmacen';
import { ModalDetalleEmbarque } from '../components/detalles/ModalDetalleEmbarque';
import { ModalDetallePresplit } from '../components/detalles/ModalDetallePresplit';
import { ModalReciboInfo } from '../components/detalles/ModalReciboInfo';
// FIX H-4: importar ubicacionApi en lugar de usar fetch() directo
import { ubicacionApi } from '../api/inventarioApi';
import type {
  FiltroInventario,
  ItemInventario,
  TarimaParaAutorizar,
} from '../types/inventario.types';

// ─── Estado de los modales de doble clic ────────────────────────────────────

type ModalDetalle =
  | { tipo: 'embarque'; item: ItemInventario }
  | { tipo: 'presplit'; item: ItemInventario }
  | { tipo: 'recibo'; item: ItemInventario }
  | { tipo: 'mapa'; item: ItemInventario }
  | { tipo: 'ubica-manual'; item: ItemInventario }
  | null;

// ─── Estado de error para la asignación de ubicación ────────────────────────

interface UbicaManualState {
  guardando: boolean;
  error: string;
}

export function Principal() {
  const [filtro, setFiltro] = useState<FiltroInventario>('todos');
  const [buscar, setBuscar] = useState('');
  const [inputBuscar, setInputBuscar] = useState('');
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());

  // Modales de autorización
  const [modalAuthVisible, setModalAuthVisible] = useState(false);
  const [modalAutorizar, setModalAutorizar] = useState<null | { tipo: 'A' | 'C' }>(null);
  const [modoAutorizacion, setModoAutorizacion] = useState(false);

  // Modal de doble clic (uno a la vez)
  const [modalDetalle, setModalDetalle] = useState<ModalDetalle>(null);

  // FIX H-4: estado tipado para la asignación de ubicación
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [ubicaState, setUbicaState] = useState<UbicaManualState>({
    guardando: false,
    error: '',
  });

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
      folio: item.nombre.substring(0, 6),
      cveProd: item.cvePro,
      tarima: item.tarima,
      tipo: item.tipo as 'PTC' | 'PTP',
    }));

  const handleFiltroChange = useCallback((f: FiltroInventario) => {
    setFiltro(f); setSeleccionadas(new Set());
  }, []);

  const handleExitoAutorizacion = useCallback(() => {
    setModalAutorizar(null); setSeleccionadas(new Set()); refrescarManual();
  }, [refrescarManual]);

  // ── Callbacks de doble clic ───────────────────────────────────────────────

  const handleAbrirDetalle = useCallback(
    (item: ItemInventario, tipo: 'embarque' | 'presplit') => {
      setModalDetalle({ tipo, item });
    }, []);

  const handleAbrirRecibo = useCallback((item: ItemInventario) => {
    setModalDetalle({ tipo: 'recibo', item });
  }, []);

  const handleAbrirMapa = useCallback((item: ItemInventario) => {
    setModalDetalle({ tipo: 'mapa', item });
  }, []);

  const handleAbrirUbicaManual = useCallback((item: ItemInventario) => {
    setNuevaUbicacion('');
    setUbicaState({ guardando: false, error: '' });
    setModalDetalle({ tipo: 'ubica-manual', item });
  }, []);

  const cerrarModal = useCallback(() => setModalDetalle(null), []);

  // FIX H-4: guardar ubicación usando ubicacionApi en lugar de fetch() directo.
  // Ventajas: manejo de errores centralizado, URL base configurada en un solo
  // lugar, sin cast (import.meta as any).env que rompía el tipado estricto.
  const handleGuardarUbicacion = useCallback(async () => {
    if (!nuevaUbicacion || modalDetalle?.tipo !== 'ubica-manual') return;

    setUbicaState({ guardando: true, error: '' });

    const item = modalDetalle.item;
    try {
      await ubicacionApi.actualizarUbicacion({
        folio: item.nombre.substring(0, 6),
        cveProd: item.cvePro,
        tarima: item.tarima,
        tipo: item.tipo as 'PTC' | 'PTP',
        ubicacion: nuevaUbicacion,
        usuario: 'WEB',
        nombreMaquina: window.location.hostname,
      });
      cerrarModal();
      refrescarManual();
    } catch (e: unknown) {
      const mensaje = e instanceof Error ? e.message : 'Error al guardar la ubicación';
      setUbicaState({ guardando: false, error: mensaje });
    }
  }, [nuevaUbicacion, modalDetalle, cerrarModal, refrescarManual]);

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
          <span className={`font-mono text-xs px-2 py-1 rounded border ${segundosHastaRefresco < 60
              ? 'text-orange-300 border-orange-700'
              : 'text-gray-300 border-gray-600'
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

      {modalDetalle?.tipo === 'embarque' && (
        <ModalDetalleEmbarque item={modalDetalle.item} onClose={cerrarModal} />
      )}

      {modalDetalle?.tipo === 'presplit' && (
        <ModalDetallePresplit item={modalDetalle.item} onClose={cerrarModal} />
      )}

      {modalDetalle?.tipo === 'recibo' && (
        <ModalReciboInfo item={modalDetalle.item} onClose={cerrarModal} />
      )}

      {/* FrmLocaliza — mapa con ubicación resaltada */}
      {modalDetalle?.tipo === 'mapa' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl shadow-slate-900/20 flex flex-col max-h-[90vh] ring-1 ring-slate-200">

            {/* Header Corporativo */}
            <div className="flex items-start justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 rounded-t-2xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-800/20">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold tracking-wide uppercase">
                      Mapa
                    </span>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                      Ubicación: {modalDetalle.item.ubicacion}
                    </h2>
                  </div>
                  <p className="text-slate-500 font-mono text-sm">
                    {modalDetalle.item.prod} · {modalDetalle.item.nombre}
                  </p>
                </div>
              </div>

              <button onClick={cerrarModal} className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200 group">
                <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mapa */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="shadow-lg rounded-xl overflow-hidden border border-slate-200">
                <MapaAlmacen posicionResaltada={modalDetalle.item.ubicacion.trim()} soloLectura={true} />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end bg-white rounded-b-2xl">
              <button onClick={cerrarModal} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FrmUbicaManual — asignar ubicación */}
      {modalDetalle?.tipo === 'ubica-manual' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl shadow-slate-900/20 flex flex-col max-h-[90vh] ring-1 ring-slate-200">

            {/* Header Corporativo */}
            <div className="flex items-start justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 rounded-t-2xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-800/20">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold tracking-wide uppercase">
                      Asignar
                    </span>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                      Ubicación Manual
                    </h2>
                  </div>
                  <p className="text-slate-500 font-mono text-sm">
                    {modalDetalle.item.prod} · {modalDetalle.item.nombre} · {modalDetalle.item.tipo}
                  </p>
                </div>
              </div>

              <button onClick={cerrarModal} className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200 group">
                <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Instrucciones */}
            <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100">
              <div className="flex items-center gap-2 text-amber-700">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">
                  Haga clic en una posición del mapa para asignarla
                </p>
              </div>
            </div>

            {/* Mapa */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="shadow-lg rounded-xl overflow-hidden border border-slate-200">
                <MapaAlmacen
                  soloLectura={false}
                  posicionResaltada={nuevaUbicacion || undefined}
                  onPosicionClick={posId => setNuevaUbicacion(posId)}
                />
              </div>

              {/* Error */}
              {ubicaState.error && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{ubicaState.error}</span>
                </div>
              )}

              {/* Posición seleccionada */}
              <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${nuevaUbicacion ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <svg className={`w-5 h-5 ${nuevaUbicacion ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Posición seleccionada</p>
                    <p className={`text-xl font-bold font-mono tracking-tight ${nuevaUbicacion ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {nuevaUbicacion || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-white rounded-b-2xl">
              <button onClick={cerrarModal} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors duration-200">
                Cancelar
              </button>
              <button
                onClick={handleGuardarUbicacion}
                disabled={!nuevaUbicacion || ubicaState.guardando}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm flex items-center gap-2"
              >
                {ubicaState.guardando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Guardando...
                  </>
                ) : 'Guardar Ubicación'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
