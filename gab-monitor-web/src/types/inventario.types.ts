// src/types/inventario.types.ts

export interface ItemInventario {
  nombre: string;
  fechaElaboracion: string;
  lote: string;
  fecCad: string;
  fecCadTeo: string;
  dias: number;
  existencia: number;
  cantidad: number;
  /** 1=Header producto, 2=Detalle tarima, 3=Total producto, 4=Total general */
  conse: 1 | 2 | 3 | 4;
  prod: string;
  cvePro: string;
  tipo: 'PTC' | 'PTP' | '';
  fechaCad: string;
  ubicacion: string;
  tarima: string;
  presplit: number;
  pesoEstimado: string;
  preAutorizado: '' | 'A' | 'C';
  colorClase: string;
}

export interface MetricasInventario {
  productosConTeoricoOk: number;
  productosConFisicoOk: number;
  totalProductos: number;
  teoVsFisicoCoincide: number;
  porcentajeTeorico: number;
  porcentajeFisico: number;
  tarimasUbicadas: number;
  totalTarimas: number;
  porcentajeUbicadas: number;
  corteInventario: string;
}

export interface InventarioResponse {
  items: ItemInventario[];
  metricas: MetricasInventario;
  total: number;
  generadoEn: string;
}

export type FiltroInventario =
  | 'todos'
  | 'caducado'
  | 'proximo'
  | 'autTrailer'
  | 'autCamioneta';

export interface TarimaParaAutorizar {
  folio: string;
  cveProd: string;
  tarima: string;
  tipo: 'PTC' | 'PTP';
}

export interface AutorizarLotePayload {
  tarimas: TarimaParaAutorizar[];
  tipoAutorizacion: 'A' | 'C';
  motivo: string;
  usuario: string;
  nombreMaquina: string;
}

export interface ActualizarUbicacionPayload {
  folio: string;
  cveProd: string;
  tarima: string;
  tipo: 'PTC' | 'PTP';
  ubicacion: string;
  usuario: string;
  nombreMaquina: string;
}

export interface PosicionAlmacen {
  id: string;
  label: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  modulo: string;
}
