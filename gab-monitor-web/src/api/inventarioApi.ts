// src/api/inventarioApi.ts
import type {
  InventarioResponse,
  FiltroInventario,
  AutorizarLotePayload,
  ActualizarUbicacionPayload,
} from '../types/inventario.types';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Error ${res.status}: ${error}`);
  }
  return res.json();
}

// ─── Inventario ────────────────────────────────────────────────────────────

export const inventarioApi = {
  /**
   * Obtiene el inventario consolidado completo (equivale a Genera() del WinForms).
   * Soporta filtros y búsqueda por nombre de producto.
   */
  obtenerConsolidado: (filtro: FiltroInventario, buscar = '') =>
    fetchJSON<InventarioResponse>(
      `/inventario/consolidado?filtro=${filtro}&buscar=${encodeURIComponent(buscar)}`
    ),

  obtenerEstadisticas: () =>
    fetchJSON<any>('/inventario/estadisticas'),

  obtenerDiferenciasTeorico: (conDetalle = false) =>
    fetchJSON<any[]>(`/inventario/diferencias/teorico?conDetalle=${conDetalle}`),

  obtenerDiferenciasFisico: (conDetalle = false) =>
    fetchJSON<any[]>(`/inventario/diferencias/fisico?conDetalle=${conDetalle}`),

  exportarExcel: async (filtro: FiltroInventario): Promise<Blob> => {
    const res = await fetch(`${BASE_URL}/inventario/exportar/excel?filtro=${filtro}`);
    if (!res.ok) throw new Error('Error al exportar Excel');
    return res.blob();
  },
};

// ─── Autorización ──────────────────────────────────────────────────────────

export const autorizacionApi = {
  /**
   * Verifica la contraseña de autorización (RN-011).
   */
  verificarContrasena: (contrasena: string) =>
    fetchJSON<{ autorizado: boolean }>('/autorizacion/verificar', {
      method: 'POST',
      body: JSON.stringify({ contrasena }),
    }),

  /**
   * Autoriza múltiples tarimas seleccionadas (RN-012).
   */
  autorizarLote: (payload: AutorizarLotePayload) =>
    fetchJSON<{ mensaje: string; cantidad: number }>('/autorizacion/lote', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  /**
   * Autoriza las tarimas de un folio completo (RN-012).
   */
  autorizarFolio: (payload: any) =>
    fetchJSON<{ mensaje: string }>('/autorizacion/folio', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

// ─── Ubicación ─────────────────────────────────────────────────────────────

export const ubicacionApi = {
  /**
   * Actualiza la ubicación manual de una tarima (RN-013).
   */
  actualizarUbicacion: (payload: ActualizarUbicacionPayload) =>
    fetchJSON<{ mensaje: string }>('/ubicacion', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  /**
   * Obtiene el inventario asignado a una posición del almacén.
   */
  obtenerInventarioPorUbicacion: (codigo: string) =>
    fetchJSON<any[]>(`/ubicacion/${encodeURIComponent(codigo)}/inventario`),
};
