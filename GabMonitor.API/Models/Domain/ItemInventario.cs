// GabMonitor.API/Models/Domain/ItemInventario.cs
namespace GabMonitor.API.Models.Domain;

/// <summary>
/// Representa una fila del DataTable "Inven" del sistema WinForms original.
/// Replica exactamente las 18 columnas + propiedades calculadas para el frontend.
/// </summary>
public class ItemInventario
{
    /// <summary>Col 0: "RECIBO-TARIMA" para detalles, nombre producto para headers/totales</summary>
    public string Nombre { get; set; } = "";

    /// <summary>Col 1: Fecha de elaboración</summary>
    public string FechaElaboracion { get; set; } = "";

    /// <summary>Col 2: Código de lote</summary>
    public string Lote { get; set; } = "";

    /// <summary>Col 3: Fecha caducidad mostrada</summary>
    public string FecCad { get; set; } = "";

    /// <summary>Col 4: Fecha caducidad teórica (no visible en UI normal)</summary>
    public string FecCadTeo { get; set; } = "";

    /// <summary>Col 5: Días hasta caducidad / Inventario Teórico para totales</summary>
    public int Dias { get; set; }

    /// <summary>Col 6: Inventario Físico / Cajas totales</summary>
    public int Existencia { get; set; }

    /// <summary>Col 7: Cajas disponibles (ETIQUETA - SURTIDO)</summary>
    public int Cantidad { get; set; }

    /// <summary>Col 8: Tipo de fila: 1=Header producto, 2=Detalle tarima, 3=Total prod, 4=Total general</summary>
    public int Conse { get; set; }

    /// <summary>Col 9: Nombre producto para ordenamiento</summary>
    public string Prod { get; set; } = "";

    /// <summary>Col 10: Clave del producto</summary>
    public string CvePro { get; set; } = "";

    /// <summary>Col 11: Tipo de recibo: "PTC" o "PTP"</summary>
    public string Tipo { get; set; } = "";

    /// <summary>Col 12: Fecha caducidad en yyyyMMdd para sort</summary>
    public string FechaCad { get; set; } = "";

    /// <summary>Col 13: Ubicación física en almacén</summary>
    public string Ubicacion { get; set; } = "";

    /// <summary>Col 14: Número de tarima</summary>
    public string Tarima { get; set; } = "";

    /// <summary>Col 15: Cajas en pre-split</summary>
    public int Presplit { get; set; }

    /// <summary>Col 16: Peso estimado en kg</summary>
    public string PesoEstimado { get; set; } = "";

    /// <summary>Col 17: Pre-autorización: 'A'=Trailer, 'C'=Camioneta, ''=ninguna</summary>
    public string PreAutorizado { get; set; } = "";

    // ─── Propiedades calculadas para el frontend ───────────────────────────────

    /// <summary>
    /// Clase CSS para el semáforo de colores (RN-002).
    /// Solo aplica a filas de detalle (Conse=2).
    /// </summary>
    public string ColorClase => ObtenerClaseColor();

    private string ObtenerClaseColor()
    {
        if (Conse != 2) return "";

        // Pre-autorizaciones tienen prioridad sobre el semáforo (RN-002)
        if (!string.IsNullOrWhiteSpace(PreAutorizado))
            return PreAutorizado.Trim() == "A" ? "preaut-trailer" : "preaut-camioneta";

        // Semáforo por días a caducidad (RN-002)
        return Dias switch
        {
            <= 4  => "expiry-red",
            <= 11 => "expiry-orange",
            <= 15 => "expiry-yellow",
            _     => "expiry-green"
        };
    }
}

/// <summary>
/// Métricas de confiabilidad del inventario (equivalente a LblPorce/LblFisi en WinForms).
/// Implementa RN-007.
/// </summary>
public class MetricasInventario
{
    /// <summary>NoPB: Productos donde inventario teórico == cantidad actual</summary>
    public int ProductosConTeoricoOk { get; set; }

    /// <summary>NoPF: Productos donde inventario físico == cantidad actual</summary>
    public int ProductosConFisicoOk { get; set; }

    /// <summary>NoPT: Total de productos en inventario</summary>
    public int TotalProductos { get; set; }

    /// <summary>TeoFis: Productos donde teórico == físico</summary>
    public int TeoVsFisicoCoincide { get; set; }

    /// <summary>% confiabilidad teórico (NoPB/NoPT * 100)</summary>
    public decimal PorcentajeTeorico => TotalProductos > 0
        ? Math.Round((decimal)ProductosConTeoricoOk / TotalProductos * 100)
        : 0;

    /// <summary>% confiabilidad físico (NoPF/NoPT * 100)</summary>
    public decimal PorcentajeFisico => TotalProductos > 0
        ? Math.Round((decimal)ProductosConFisicoOk / TotalProductos * 100)
        : 0;

    /// <summary>Tarimas con ubicación asignada (totalubicado)</summary>
    public int TarimasUbicadas { get; set; }

    /// <summary>Total de tarimas en inventario excluyendo AGUI/CANAS/PROCESO/AJO (RN-006)</summary>
    public int TotalTarimas { get; set; }

    /// <summary>% tarimas ubicadas</summary>
    public decimal PorcentajeUbicadas => TotalTarimas > 0
        ? Math.Round((decimal)TarimasUbicadas / TotalTarimas * 100)
        : 0;

    /// <summary>Descripción del corte de inventario físico más reciente</summary>
    public string CorteInventario { get; set; } = "";
}

/// <summary>
/// Semana laboral del catálogo tb_cat_semanas
/// </summary>
public class SemanaLaboral
{
    public string NumeroSemana { get; set; } = "";
    public int Anio { get; set; }
    public DateTime Fecha1 { get; set; }
    public DateTime Fecha2 { get; set; }
}
