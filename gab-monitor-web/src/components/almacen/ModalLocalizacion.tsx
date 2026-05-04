// src/components/almacen/ModalLocalizacion.tsx
// Versión unificada: soporta visualización y selección manual

import { useEffect, useState } from 'react';
import { MapaAlmacen } from './MapaAlmacen';
import type { MovimientoUbicacion } from '../../types/inventario.types';

interface Props {
  // Datos del producto/tarima
  producto: string;          // clave producto
  nombreProducto: string;    // descripción
  folio: string;             // recibo o folio
  tarima: string;
  existencia: number;
  ubicacionActual: string;   // ubicación actual de la tarima

  // Control de modo
  modo?: 'visualizar' | 'seleccionar';   // visualizar = solo lectura, seleccionar = permite elegir y guardar
  ocultarHistorial?: boolean;             // opcional: no mostrar la tabla de movimientos

  // Solo para modo 'seleccionar'
  onGuardarUbicacion?: (nuevaUbicacion: string) => Promise<void> | void;
  onCancelar?: () => void;                // si se necesita acción extra al cancelar

  // Callback de cierre general
  onClose: () => void;
}

export function ModalLocalizacion({
  producto,
  nombreProducto,
  folio,
  tarima,
  existencia,
  ubicacionActual,
  modo = 'visualizar',
  ocultarHistorial = false,
  onGuardarUbicacion,
  onCancelar,
  onClose,
}: Props) {
  const [movimientos, setMovimientos] = useState<MovimientoUbicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nuevaUbicacion, setNuevaUbicacion] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');

  const esSeleccion = modo === 'seleccionar';

  // Cargar historial solo si no está oculto
  useEffect(() => {
    if (ocultarHistorial) {
      setCargando(false);
      return;
    }

    fetch(`/api/ubicaciones/historial?prod=${producto}&folio=${folio}&tarima=${tarima}`)
      .then(r => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then(data => {
        setMovimientos(data);
        setCargando(false);
      })
      .catch(e => {
        setError(String(e));
        setCargando(false);
      });
  }, [producto, folio, tarima, ocultarHistorial]);

  const ubiNormalizada = ubicacionActual.length === 5
    ? ubicacionActual.substring(0, 4)
    : ubicacionActual;

  const surtido = 0; // en este contexto no aplica
  const porSurtir = existencia - surtido;

  const handleClickPosicion = (pos: string) => {
    if (esSeleccion) {
      setNuevaUbicacion(pos);
      setErrorGuardado('');
    }
  };

  const handleGuardar = async () => {
    if (!nuevaUbicacion || !onGuardarUbicacion) return;
    setGuardando(true);
    setErrorGuardado('');
    try {
      await onGuardarUbicacion(nuevaUbicacion);
      // El cierre se maneja desde fuera, o podríamos cerrar automáticamente
      onClose(); // por ejemplo, cerramos después de guardar
    } catch (e: any) {
      setErrorGuardado(e.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    if (onCancelar) onCancelar();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl shadow-slate-900/20 flex flex-col max-h-[90vh] ring-1 ring-slate-200">

        {/* Header Corporativo */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-800 to-teal-700 rounded-t-2xl">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white text-xs font-semibold tracking-wide uppercase backdrop-blur-sm">
                  {esSeleccion ? 'ASIGNAR UBICACIÓN' : 'LOCALIZACIÓN'}
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {producto}
                </h2>
              </div>
              <p className="text-white/80 font-mono text-sm flex items-center gap-2">
                <span className="text-white/40">Folio:</span> {folio}
                <span className="text-white/40">|</span>
                <span className="text-white/40">Tarima:</span> {tarima}
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

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-px bg-slate-200 border-b border-slate-200">
          <StatBox label="Existencia" value={existencia} variant="default" />
          <StatBox label="Surtido" value={surtido} variant="info" />
          <StatBox label="Por Surtir" value={porSurtir} variant={porSurtir > 0 ? 'warning' : 'success'} />
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
          {/* Mapa del almacén */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                Plano del Almacén
              </h3>
              {!esSeleccion && ubicacionActual && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                  Actual: {ubicacionActual}
                </span>
              )}
              {esSeleccion && nuevaUbicacion && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                  Seleccionada: {nuevaUbicacion}
                </span>
              )}
            </div>
            <div className="flex justify-center">
              <MapaAlmacen
                ubicacionActual={!esSeleccion ? ubiNormalizada : undefined}
                posicionResaltada={esSeleccion ? nuevaUbicacion : ubiNormalizada}
                onPosicionClick={handleClickPosicion}
                soloLectura={!esSeleccion}
                hideDefaultPanel4={true}
              />
            </div>

            {esSeleccion && errorGuardado && (
              <p className="text-red-500 text-xs mt-2 text-center">{errorGuardado}</p>
            )}
          </div>

          {/* Historial de movimientos (opcional) */}
          {!ocultarHistorial && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 p-4 border-b border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  Historial de Ubicaciones
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-medium">
                  {movimientos.length}
                </span>
              </div>

              {cargando && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-emerald-600" />
                    <span className="text-slate-500 font-medium">Cargando movimientos...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="m-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {!cargando && !error && movimientos.length === 0 && (
                <div className="text-center py-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 m-4">
                  <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-slate-500 text-sm">No hay movimientos registrados</p>
                </div>
              )}

              {movimientos.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Ubicación</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movimientos.map((mov, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                            {new Date(mov.fechaMov).toLocaleString('es-MX', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3">
                            {mov.posicion === ubicacionActual ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                {mov.posicion}
                              </span>
                            ) : (
                              <span className="text-slate-700">{mov.posicion}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{mov.usuario}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-white rounded-b-2xl">
          {esSeleccion ? (
            <>
              <span className="text-sm text-slate-500">
                {nuevaUbicacion ? (
                  <>Posición seleccionada: <span className="font-mono font-bold text-emerald-700">{nuevaUbicacion}</span></>
                ) : (
                  'Haga clic en una posición del mapa'
                )}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelar}
                  className="px-5 py-2 bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={!nuevaUbicacion || guardando}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
                >
                  {guardando ? 'Guardando...' : 'Guardar Ubicación'}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-sm text-slate-500">
                <span className="font-mono font-semibold text-emerald-700">{ubicacionActual}</span> · ubicación actual
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para las estadísticas
function StatBox({ label, value, variant }: { label: string; value: number; variant: 'default' | 'info' | 'warning' | 'success' }) {
  const variants = {
    default: 'bg-white text-slate-800',
    info: 'bg-sky-50/50 text-sky-800',
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