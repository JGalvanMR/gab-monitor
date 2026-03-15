// src/components/almacen/MapaAlmacen.tsx
// CORRECCIÓN D-13: Eliminar variable `modulos` declarada pero nunca usada

import { useCallback } from 'react';
import type { PosicionAlmacen } from '../../types/inventario.types';

const generar = (
  prefijo: string,
  inicio: number,
  fin: number,
  x: number,
  yInicio: number,
  paso: number,
  ancho: number,
  alto: number,
  modulo: string,
  horizontal = false
): PosicionAlmacen[] =>
  Array.from({ length: fin - inicio + 1 }, (_, i) => ({
    id: `${prefijo}${(inicio + i).toString().padStart(2, '0')}`,
    label: `${prefijo}${(inicio + i).toString().padStart(2, '0')}`,
    x: horizontal ? x + i * (ancho + 2) : x,
    y: horizontal ? yInicio : yInicio + i * (alto + 2),
    ancho,
    alto,
    modulo,
  }));

export const POSICIONES_ALMACEN: PosicionAlmacen[] = [
  ...generar('110', 1, 10,  15, 20, 16, 28, 14, '1'),
  ...generar('120', 1, 14,  58, 20, 16, 28, 14, '2'),
  ...generar('130', 1, 5,   15, 260, 14, 28, 14, '3', true),
  ...generar('140', 1, 24, 180, 20, 14, 34, 12, '4'),
  ...generar('250', 1, 2,  280, 20, 36, 30, 14, '5', true),
  ...generar('260', 1, 2,  280, 50, 36, 30, 14, '6', true),
  ...generar('270', 1, 6,  340, 20, 16, 30, 14, '7'),
  ...generar('210', 1, 3,  400, 20, 16, 30, 14, '2x'),
  ...generar('220', 1, 7,  440, 20, 16, 30, 14, '2x'),
  ...generar('230', 1, 4,  480, 20, 16, 30, 14, '2x'),
  ...generar('410', 1, 11, 540, 20, 16, 30, 14, 'esp'),
];

interface Props {
  posicionResaltada?: string;
  posicionesOcupadas?: Record<string, { cantidad: number; producto?: string }>;
  onPosicionClick?: (posicionId: string) => void;
  soloLectura?: boolean;
}

export function MapaAlmacen({
  posicionResaltada,
  posicionesOcupadas = {},
  onPosicionClick,
  soloLectura = true,
}: Props) {
  const obtenerColor = useCallback(
    (posId: string): string => {
      if (posId === posicionResaltada) return '#00FF00';
      const ocupada = posicionesOcupadas[posId];
      if (!ocupada) return '#555';
      return '#4A90D9';
    },
    [posicionResaltada, posicionesOcupadas]
  );

  const obtenerColorTexto = (posId: string): string =>
    posId === posicionResaltada ? '#000' : '#EEE';

  return (
    <div className="bg-gray-900 p-3 rounded-lg">
      <h3 className="text-white text-sm font-bold text-center mb-2">
        📦 MAPA DE ALMACÉN
      </h3>

      <div className="overflow-auto">
        <svg
          viewBox="0 0 600 300"
          className="w-full"
          style={{ maxHeight: '320px', minWidth: '400px' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <text x="15"  y="12" fill="#60A5FA" fontSize="7" fontWeight="bold">M1</text>
          <text x="58"  y="12" fill="#60A5FA" fontSize="7" fontWeight="bold">M2</text>
          <text x="15"  y="252" fill="#60A5FA" fontSize="7" fontWeight="bold">M3</text>
          <text x="180" y="12" fill="#60A5FA" fontSize="7" fontWeight="bold">M4</text>
          <text x="280" y="12" fill="#60A5FA" fontSize="7" fontWeight="bold">M5-6</text>
          <text x="340" y="12" fill="#60A5FA" fontSize="7" fontWeight="bold">M7</text>
          <text x="400" y="12" fill="#60A5FA" fontSize="7" fontWeight="bold">2x</text>
          <text x="540" y="12" fill="#60A5FA" fontSize="7" fontWeight="bold">ESP</text>

          {POSICIONES_ALMACEN.map(pos => (
            <g key={pos.id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.ancho}
                height={pos.alto}
                fill={obtenerColor(pos.id)}
                stroke={pos.id === posicionResaltada ? '#00FF00' : '#333'}
                strokeWidth={pos.id === posicionResaltada ? 1.5 : 0.5}
                rx={1}
                className={!soloLectura ? 'cursor-pointer' : ''}
                onClick={() => !soloLectura && onPosicionClick?.(pos.id)}
                opacity={0.9}
              />
              <text
                x={pos.x + pos.ancho / 2}
                y={pos.y + pos.alto / 2 + 3}
                textAnchor="middle"
                fill={obtenerColorTexto(pos.id)}
                fontSize="4"
                fontWeight="bold"
                pointerEvents="none"
              >
                {pos.label}
              </text>
              {posicionesOcupadas[pos.id] && (
                <text
                  x={pos.x + pos.ancho - 1}
                  y={pos.y + 5}
                  textAnchor="end"
                  fill="#FFD700"
                  fontSize="3.5"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {posicionesOcupadas[pos.id].cantidad}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="flex justify-center gap-4 mt-2 text-xs text-gray-300 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />
          Tarima buscada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
          Ocupada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-600 inline-block" />
          Vacía
        </span>
      </div>
    </div>
  );
}
