// GabMonitor.API/Controllers/InventarioController.cs
using GabMonitor.API.Models.Domain;
using GabMonitor.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GabMonitor.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventarioController : ControllerBase
{
    private readonly IInventarioService _service;
    private readonly ILogger<InventarioController> _logger;

    public InventarioController(IInventarioService service, ILogger<InventarioController> logger)
    {
        _service = service;
        _logger  = logger;
    }

    /// <summary>
    /// Inventario consolidado completo — equivalente al método Genera() del WinForms.
    /// Soporta filtros por: caducado, proximo, autTrailer, autCamioneta.
    /// GET /api/inventario/consolidado?filtro=caducado&amp;buscar=BROCOLI
    /// </summary>
    [HttpGet("consolidado")]
    public async Task<IActionResult> GetConsolidado(
        [FromQuery] string? filtro = null,
        [FromQuery] string? buscar = null)
    {
        try
        {
            var (items, metricas) = await _service.GenerarInventarioConsolidadoAsync();
            var itemsFiltrados    = AplicarFiltro(items, filtro, buscar);

            return Ok(new
            {
                items    = itemsFiltrados,
                metricas = metricas,
                total    = itemsFiltrados.Count,
                generadoEn = DateTime.Now
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al generar inventario consolidado");
            return StatusCode(500, "Error interno al procesar el inventario");
        }
    }

    /// <summary>
    /// Estadísticas de confiabilidad (LblPorce, LblFisi, LblUbi del WinForms).
    /// GET /api/inventario/estadisticas
    /// </summary>
    [HttpGet("estadisticas")]
    public async Task<IActionResult> GetEstadisticas()
    {
        try
        {
            var (_, metricas) = await _service.GenerarInventarioConsolidadoAsync();
            return Ok(metricas);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al calcular estadísticas");
            return StatusCode(500, "Error al calcular estadísticas");
        }
    }

    /// <summary>
    /// Productos donde el inventario teórico difiere del actual.
    /// Equivalente a LblPorce_DoubleClick del WinForms.
    /// GET /api/inventario/diferencias/teorico?conDetalle=true
    /// </summary>
    [HttpGet("diferencias/teorico")]
    public async Task<IActionResult> GetDiferenciasTeorico(
        [FromQuery] bool conDetalle = false)
    {
        var (items, _) = await _service.GenerarInventarioConsolidadoAsync();

        if (!conDetalle)
        {
            var diffs = items
                .Where(i => i.FechaCad == "99991231" && i.Conse == 3 && i.Dias != i.Cantidad)
                .OrderBy(i => i.Prod)
                .ToList();
            return Ok(diffs);
        }

        var prodsConDiff = items
            .Where(i => i.FechaCad == "99991231" && i.Conse == 3 && i.Dias != i.Cantidad)
            .Select(i => i.CvePro).Distinct().ToList();

        var detalle = items
            .Where(i => prodsConDiff.Contains(i.CvePro))
            .OrderBy(i => i.Prod).ThenBy(i => i.Conse).ThenBy(i => i.FechaCad)
            .ToList();

        return Ok(detalle);
    }

    /// <summary>
    /// Productos donde el inventario físico difiere del actual.
    /// Equivalente a LblFisi_DoubleClick del WinForms.
    /// GET /api/inventario/diferencias/fisico?conDetalle=true
    /// </summary>
    [HttpGet("diferencias/fisico")]
    public async Task<IActionResult> GetDiferenciasFisico(
        [FromQuery] bool conDetalle = false)
    {
        var (items, _) = await _service.GenerarInventarioConsolidadoAsync();

        if (!conDetalle)
        {
            var diffs = items
                .Where(i => i.FechaCad == "99991231" && i.Conse == 3 && i.Existencia != i.Cantidad)
                .OrderBy(i => i.Prod)
                .ToList();
            return Ok(diffs);
        }

        var prodsConDiff = items
            .Where(i => i.FechaCad == "99991231" && i.Conse == 3 && i.Existencia != i.Cantidad)
            .Select(i => i.CvePro).Distinct().ToList();

        var detalle = items
            .Where(i => prodsConDiff.Contains(i.CvePro))
            .OrderBy(i => i.Prod).ThenBy(i => i.Conse).ThenBy(i => i.FechaCad)
            .ToList();

        return Ok(detalle);
    }

    // ─── Helper: aplicar filtros equivalentes a los botones del WinForms ─────

    private static List<ItemInventario> AplicarFiltro(
        List<ItemInventario> items, string? filtro, string? buscar)
    {
        IEnumerable<ItemInventario> query = items;

        // Búsqueda por texto: replica "Inven2.Select("Prod like '%" + TxtSearch + "%'")"
        if (!string.IsNullOrEmpty(buscar))
        {
            string buscarUp = buscar.ToUpper();
            query = query.Where(i => i.Prod.Contains(buscarUp));
        }

        // Filtros por botón
        query = filtro switch
        {
            "caducado"     => query.Where(i => i.Dias <= 4  && i.Conse == 2),
            "proximo"      => query.Where(i => i.Dias > 4   && i.Dias <= 11 && i.Conse == 2),
            "autTrailer"   => query.Where(i => i.PreAutorizado == "A"),
            "autCamioneta" => query.Where(i => i.PreAutorizado == "C"),
            _              => query  // "todos" o null → sin filtro
        };

        return query.ToList();
    }
}
