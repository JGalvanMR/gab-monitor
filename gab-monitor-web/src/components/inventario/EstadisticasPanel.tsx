// src/components/inventario/EstadisticasPanel.tsx
import type { MetricasInventario } from '../../types/inventario.types';

interface Props {
  metricas: MetricasInventario;
}

export function EstadisticasPanel({ metricas }: Props) {
  const colorPct = (pct: number) =>
    pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-3 text-xs flex-wrap">
      {/* Productos con teórico correcto */}
      <div className="text-center bg-gray-800 px-2 py-1 rounded">
        <div className="text-yellow-400 font-semibold">PRODUCTOS</div>
        <div className="text-green-300 font-mono font-bold">
          {metricas.productosConTeoricoOk}/{metricas.totalProductos}
        </div>
      </div>

      {/* % Confiabilidad teórico */}
      <div className="text-center bg-gray-800 px-2 py-1 rounded">
        <div className="text-yellow-400 font-semibold">% CONFIAB.</div>
        <div className={`font-mono font-bold ${colorPct(metricas.porcentajeTeorico)}`}>
          {metricas.porcentajeTeorico}%
        </div>
      </div>

      {/* % Confiabilidad físico */}
      <div className="text-center bg-gray-800 px-2 py-1 rounded">
        <div className="text-yellow-400 font-semibold">% FÍSICO</div>
        <div className={`font-mono font-bold ${colorPct(metricas.porcentajeFisico)}`}>
          {metricas.porcentajeFisico}%
        </div>
      </div>

      {/* % Ubicadas */}
      <div className="text-center bg-gray-800 px-2 py-1 rounded">
        <div className="text-yellow-400 font-semibold">UBICACIÓN</div>
        <div className="text-cyan-300 font-mono font-bold">
          {metricas.tarimasUbicadas}/{metricas.totalTarimas}
          <span className="text-gray-400 ml-1">({metricas.porcentajeUbicadas}%)</span>
        </div>
      </div>

      {/* Corte */}
      {metricas.corteInventario && (
        <div className="text-yellow-300 font-mono text-xs">
          CORTE: {metricas.corteInventario}
        </div>
      )}
    </div>
  );
}
