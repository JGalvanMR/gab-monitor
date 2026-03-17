// src/components/inventario/FiltrosBarra.tsx
// FIX H-5: se agrega botón "Exportar XLS" que invoca inventarioApi.exportarExcel().
// En el código original exportarExcel() estaba definida en inventarioApi.ts
// pero ningún componente la llamaba — funcionalidad completamente muerta.
import { useState } from 'react';
import { inventarioApi } from '../../api/inventarioApi';
import type { FiltroInventario } from '../../types/inventario.types';

interface Props {
  filtroActivo: FiltroInventario;
  onFiltroChange: (f: FiltroInventario) => void;
  tarimasSeleccionadasCount: number;
  modoAutorizacion: boolean;
  onAutorizarTrailer?: () => void;
  onAutorizarCamioneta?: () => void;
}

export function FiltrosBarra({
  filtroActivo,
  onFiltroChange,
  tarimasSeleccionadasCount,
  modoAutorizacion,
  onAutorizarTrailer,
  onAutorizarCamioneta,
}: Props) {
  const [exportando, setExportando] = useState(false);

  const btn = (
    filtro: FiltroInventario,
    label: string,
    claseBase: string,
    claseActivo: string,
    title: string
  ) => (
    <button
      onClick={() => onFiltroChange(filtro)}
      title={title}
      className={`px-3 py-1 text-xs font-bold rounded border transition-all ${
        filtroActivo === filtro
          ? `${claseActivo} ring-2 ring-white ring-offset-1 ring-offset-gray-900`
          : claseBase
      }`}
    >
      {label}
    </button>
  );

  // FIX H-5: descarga del Excel con el filtro activo en ese momento.
  // El blob se convierte en un enlace temporal para forzar la descarga
  // sin abrir una nueva pestaña ni requerir un <a> en el DOM permanente.
  const handleExportar = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      const blob = await inventarioApi.exportarExcel(filtroActivo);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `inventario_${filtroActivo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error al exportar Excel:', e);
      alert('No se pudo descargar el archivo. Verifique que el servidor esté disponible.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="bg-gray-900 px-3 py-1.5 flex items-center gap-2 flex-wrap border-b border-gray-700">
      <span className="text-cyan-400 text-xs font-semibold mr-1">FILTROS:</span>

      {btn('todos', 'TODOS',
        'bg-gray-600 border-gray-400 hover:bg-gray-500 text-white',
        'bg-gray-300 border-white text-gray-900',
        'Mostrar todos los productos')}

      {btn('caducado', '■ CADUCADO',
        'bg-red-800 border-red-600 hover:bg-red-700 text-white',
        'bg-red-600 border-red-300 text-white',
        'Productos caducados o que caducan hoy (días ≤ 4)')}

      {btn('proximo', '■ PRÓXIMO',
        'bg-orange-700 border-orange-500 hover:bg-orange-600 text-white',
        'bg-orange-500 border-orange-300 text-white',
        'Próximos a caducar (5 a 11 días)')}

      {btn('autTrailer', 'TRL',
        'bg-purple-800 border-purple-600 hover:bg-purple-700 text-white',
        'bg-purple-600 border-purple-300 text-white',
        'Autorizados para Trailer')}

      {btn('autCamioneta', 'CAM',
        'bg-blue-800 border-blue-600 hover:bg-blue-700 text-white',
        'bg-blue-600 border-blue-300 text-white',
        'Autorizados para Camioneta')}

      {/* Separador */}
      <div className="w-px h-5 bg-gray-600 mx-1" />

      {/* Leyenda semáforo */}
      <div className="flex items-center gap-1 text-xs">
        <span className="w-3 h-3 rounded-sm bg-green-600 inline-block" title="Verde: ≥16 días" />
        <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" title="Amarillo: 12-15 días" />
        <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" title="Naranja: 5-11 días" />
        <span className="w-3 h-3 rounded-sm bg-red-600 inline-block" title="Rojo: ≤4 días" />
        <span className="w-3 h-3 rounded-sm bg-purple-600 inline-block" title="Violeta: Trailer" />
        <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" title="Azul: Camioneta" />
      </div>

      {/* Separador */}
      <div className="w-px h-5 bg-gray-600 mx-1" />

      {/* FIX H-5: botón de exportación */}
      <button
        onClick={handleExportar}
        disabled={exportando}
        title={`Exportar vista "${filtroActivo}" a Excel`}
        className="px-3 py-1 text-xs font-bold rounded bg-gray-700 hover:bg-gray-600 border border-gray-500 text-green-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {exportando ? '⏳ Exportando...' : '⬇ XLS'}
      </button>

      {/* Botones de autorización (solo en modo autorización) */}
      {modoAutorizacion && tarimasSeleccionadasCount > 0 && (
        <>
          <div className="w-px h-5 bg-gray-600 mx-1" />
          <span className="text-yellow-300 text-xs">
            {tarimasSeleccionadasCount} tarima(s) ✓
          </span>
          <button
            onClick={onAutorizarTrailer}
            className="px-3 py-1 text-xs font-bold rounded bg-purple-700 hover:bg-purple-600 border border-purple-400 text-white"
          >
            Autorizar → Trailer
          </button>
          <button
            onClick={onAutorizarCamioneta}
            className="px-3 py-1 text-xs font-bold rounded bg-blue-700 hover:bg-blue-600 border border-blue-400 text-white"
          >
            Autorizar → Camioneta
          </button>
        </>
      )}
    </div>
  );
}
