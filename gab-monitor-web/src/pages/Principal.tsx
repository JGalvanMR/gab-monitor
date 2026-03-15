// src/pages/Principal.tsx
import { useState, useCallback } from 'react';
import { useInventario } from '../hooks/useInventario';
import { InventarioTable } from '../components/inventario/InventarioTable';
import { FiltrosBarra } from '../components/inventario/FiltrosBarra';
import { EstadisticasPanel } from '../components/inventario/EstadisticasPanel';
import { ModalAuth } from '../components/autorizacion/ModalAuth';
import { ModalAutorizacion } from '../components/autorizacion/ModalAutorizacion';
import { MapaAlmacen } from '../components/almacen/MapaAlmacen';
import type {
  FiltroInventario,
  ItemInventario,
  TarimaParaAutorizar,
} from '../types/inventario.types';

export function Principal() {
  const [filtro, setFiltro]             = useState<FiltroInventario>('todos');
  const [buscar, setBuscar]             = useState('');
  const [inputBuscar, setInputBuscar]   = useState('');
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());

  // Modales
  const [modalAuthVisible, setModalAuthVisible]     = useState(false);
  const [modalAutorizar, setModalAutorizar]         = useState<null | { tipo: 'A' | 'C' }>(null);
  const [modalMapa, setModalMapa]                   = useState<null | ItemInventario>(null);

  const [modoAutorizacion, setModoAutorizacion] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    segundosHastaRefresco,
    refrescarManual,
  } = useInventario(filtro, buscar);

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  const handleKeyBuscar = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setBuscar(inputBuscar.toUpperCase());
    }
  }, [inputBuscar]);

  const handleLimpiarBusqueda = useCallback(() => {
    setInputBuscar('');
    setBuscar('');
    setFiltro('todos');
    setSeleccionadas(new Set());
  }, []);

  // ── Selección de filas ────────────────────────────────────────────────────
  const handleFilaSeleccionada = useCallback((idx: number) => {
    const item = data?.items[idx];
    if (!item || item.conse !== 2) return; // Solo detalles (Conse=2)

    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, [data?.items]);

  // ── Tarimas seleccionadas para autorización ───────────────────────────────
  const tarimasSeleccionadas: TarimaParaAutorizar[] = [...seleccionadas]
    .map(idx => data?.items[idx])
    .filter((item): item is ItemInventario => !!item && item.conse === 2)
    .map(item => {
      const partes = item.nombre.split('-');
      return {
        folio:   partes[0] ?? item.nombre,
        cveProd: item.cvePro,
        tarima:  item.tarima,
        tipo:    item.tipo as 'PTC' | 'PTP',
      };
    });

  // ── Cambio de filtro limpia selección ────────────────────────────────────
  const handleFiltroChange = useCallback((f: FiltroInventario) => {
    setFiltro(f);
    setSeleccionadas(new Set());
  }, []);

  // ── Éxito de autorización ─────────────────────────────────────────────────
  const handleExitoAutorizacion = useCallback(() => {
    setModalAutorizar(null);
    setSeleccionadas(new Set());
    refrescarManual();
  }, [refrescarManual]);

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

      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <header className="bg-gray-900 px-3 py-2 border-b border-gray-700 flex flex-wrap items-center gap-2">

        {/* Título y fecha */}
        <div className="flex-shrink-0">
          <h1 className="text-yellow-400 text-sm font-bold leading-tight">
            CADUCIDADES AL DÍA
          </h1>
          <p className="text-gray-400 text-xs">{fechaHoy}</p>
        </div>

        {/* Búsqueda */}
        <div className="flex items-center gap-1 ml-2">
          <input
            type="text"
            value={inputBuscar}
            onChange={e => setInputBuscar(e.target.value)}
            onKeyDown={handleKeyBuscar}
            className="bg-gray-700 text-white uppercase px-2 py-1 rounded border border-gray-500 w-52 text-xs focus:border-blue-400 outline-none"
            placeholder="Buscar producto (Enter)..."
          />
          {buscar && (
            <button
              onClick={handleLimpiarBusqueda}
              className="bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-xs"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Estadísticas */}
        {data?.metricas && (
          <div className="flex-1 min-w-0">
            <EstadisticasPanel metricas={data.metricas} />
          </div>
        )}

        {/* Controles de la derecha */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">

          {/* Modo autorización */}
          {!modoAutorizacion ? (
            <button
              onClick={() => setModalAuthVisible(true)}
              className="px-2 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 border border-gray-500"
              title="Activar modo autorización"
            >
              🔐 Autorizar
            </button>
          ) : (
            <button
              onClick={() => { setModoAutorizacion(false); setSeleccionadas(new Set()); }}
              className="px-2 py-1 text-xs rounded bg-green-700 hover:bg-green-600 border border-green-500"
              title="Desactivar modo autorización"
            >
              ✓ Autorizando
            </button>
          )}

          {/* Contador regresivo — equivalente a LblAct */}
          <span
            className={`font-mono text-xs px-2 py-1 rounded border ${
              segundosHastaRefresco < 60
                ? 'text-orange-300 border-orange-700'
                : 'text-gray-300 border-gray-600'
            }`}
            title="Tiempo hasta próximo refresco automático"
          >
            ⏱ {formatSegundos(segundosHastaRefresco)}
          </span>

          {/* Botón de refresco manual */}
          <button
            onClick={refrescarManual}
            disabled={isFetching}
            className="px-2 py-1 text-xs rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 border border-blue-500"
            title="Actualizar ahora"
          >
            {isFetching ? '⏳' : '🔄'}
          </button>

        </div>
      </header>

      {/* ═══ BARRA DE FILTROS ═══════════════════════════════════════════════ */}
      <FiltrosBarra
        filtroActivo={filtro}
        onFiltroChange={handleFiltroChange}
        tarimasSeleccionadasCount={tarimasSeleccionadas.length}
        modoAutorizacion={modoAutorizacion}
        onAutorizarTrailer={() => setModalAutorizar({ tipo: 'A' })}
        onAutorizarCamioneta={() => setModalAutorizar({ tipo: 'C' })}
      />

      {/* ═══ TABLA PRINCIPAL ════════════════════════════════════════════════ */}
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
            onAbrirMapa={(item) => setModalMapa(item)}
          />
        )}
      </main>

      {/* ═══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 border-t border-gray-700 px-3 py-1 text-xs text-gray-500 flex justify-between">
        <span>Comercializadora GAB S.A. de C.V. — Irapuato, Gto.</span>
        <span>
          {data?.total != null ? `${data.total} registros` : ''}
          {data?.generadoEn && ` · ${new Date(data.generadoEn).toLocaleTimeString('es-MX')}`}
        </span>
      </footer>

      {/* ═══ MODALES ════════════════════════════════════════════════════════ */}

      {modalAuthVisible && (
        <ModalAuth
          onClose={() => setModalAuthVisible(false)}
          onSuccess={() => {
            setModoAutorizacion(true);
            setModalAuthVisible(false);
          }}
        />
      )}

      {modalAutorizar && tarimasSeleccionadas.length > 0 && (
        <ModalAutorizacion
          tarimas={tarimasSeleccionadas}
          tipoAutorizacion={modalAutorizar.tipo}
          onClose={() => setModalAutorizar(null)}
          onExito={handleExitoAutorizacion}
        />
      )}

      {modalMapa && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 w-full max-w-2xl shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-white font-bold">Ubicación: {modalMapa.ubicacion}</h3>
                <p className="text-gray-400 text-xs">{modalMapa.prod} · {modalMapa.nombre}</p>
              </div>
              <button
                onClick={() => setModalMapa(null)}
                className="text-gray-400 hover:text-white text-lg px-2"
              >
                ✕
              </button>
            </div>
            <MapaAlmacen posicionResaltada={modalMapa.ubicacion.trim()} />
          </div>
        </div>
      )}

    </div>
  );
}
