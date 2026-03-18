// src/types/inventario.types.ts

// ==========================================
// TIPOS EXISTENTES (Inventario/Caducidad)
// ==========================================

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

// ==========================================
// TIPOS PARA MAPA DE ALMACÉN (FrmLocaliza)
// ==========================================

export interface Posicion {
  id: string;              // Ej: "Btn1424", "1424"
  label: string;           // Ej: "1424", "01"
  x: number;               // Posición X en el SVG
  y: number;               // Posición Y en el SVG
  ancho: number;           // Ancho del botón/rack
  alto: number;            // Alto del botón/rack
  modulo: string;          // "1", "2", "3", "4", "5", "6", "7", "2x", "ESP", "P"
  tipo?: 'rack' | 'pasillo';
}

export interface PosicionAlmacen extends Posicion {}

export interface MovimientoUbicacion {
  claveTarima: string;     // ID de la tarima (oculto en grid)
  fechaMov: string;        // Fecha y hora del movimiento
  posicion: string;        // Ej: "1424", "1101"
  usuario: string;         // Quién hizo el acomodo
}

export interface ProductoUbicacion {
  producto: string;        // Código (19VJENAJO)
  nombreProducto: string;  // Descripción completa
  folio: string;           // Recibo (373138)
  tarima: string;          // Número de tarima
  existencia: number;      // Cantidad total
  surtido?: number;        // Cantidad surtida (para calcular X SURTIR)
  ubicacionActual: string; // Posición actual (ej: "1424")
}

// ==========================================
// PROPS DE COMPONENTES
// ==========================================

export interface MapaAlmacenProps {
  ubicacionActual?: string;
  posicionesOcupadas?: Record<string, { cantidad: number; producto?: string }>;
  onPosicionClick?: (posicionId: string) => void;
  soloLectura?: boolean;
  className?: string;
}

export interface ModalLocalizacionProps extends ProductoUbicacion {
  onClose: () => void;
}

// Alias para compatibilidad (opcional)
export type LocalizacionProps = ModalLocalizacionProps;