// GabMonitor.API/Services/AutorizacionService.cs
using GabMonitor.API.DTOs;
using GabMonitor.API.Repositories.Interfaces;
using GabMonitor.API.Services.Interfaces;

namespace GabMonitor.API.Services;

/// <summary>
/// Servicio de autorizaciones. Replica RN-011, RN-012.
/// </summary>
public class AutorizacionService : IAutorizacionService
{
    private readonly IAutorizacionRepository _repo;

    public AutorizacionService(IAutorizacionRepository repo)
    {
        _repo = repo;
    }

    /// <summary>
    /// Autoriza múltiples tarimas seleccionadas.
    /// Equivalente a BTNAUTORIZAR_Click del WinForms.
    /// </summary>
    public async Task AutorizarTarimasAsync(AutorizarLoteDto dto)
    {
        foreach (var tarima in dto.Tarimas)
        {
            await _repo.AutorizarTarimaAsync(
                tarima.Folio, tarima.CveProd, tarima.Tarima,
                tarima.Tipo, dto.TipoAutorizacion);

            string detalle = $"Tarima {tarima.Tarima} - {tarima.CveProd} - " +
                             $"Tipo: {(dto.TipoAutorizacion == "A" ? "TRAILER" : "CAMIONETA")}";

            await _repo.RegistrarMovimientoAsync(
                dto.NombreMaquina, dto.Usuario,
                tarima.Folio, detalle, dto.Motivo);
        }
    }

    /// <summary>
    /// Autoriza las tarimas de un folio completo.
    /// Equivalente a BtnImp_Click de PreAutorizarFolios.
    /// </summary>
    public async Task AutorizarFolioAsync(AutorizarFolioDto dto)
    {
        foreach (var tarima in dto.Tarimas)
        {
            await _repo.AutorizarTarimaAsync(
                dto.Folio, tarima.CveProd, tarima.Tarima,
                dto.TipoRecibo, dto.TipoAutorizacion);

            string detalle = $"Folio {dto.Folio} - Tarima {tarima.Tarima} - " +
                             $"Tipo: {(dto.TipoAutorizacion == "A" ? "TRAILER" : "CAMIONETA")}";

            await _repo.RegistrarMovimientoAsync(
                dto.NombreMaquina, dto.Usuario,
                dto.Folio, detalle, dto.Motivo);
        }
    }
}

// GabMonitor.API/Services/UbicacionService.cs
// (en el mismo archivo por brevedad, sepáralo si prefieres)

/// <summary>
/// Servicio de ubicaciones. Replica RN-013.
/// </summary>
public class UbicacionService : IUbicacionService
{
    private readonly IUbicacionRepository _repo;

    public UbicacionService(IUbicacionRepository repo)
    {
        _repo = repo;
    }

    public async Task ActualizarUbicacionAsync(ActualizarUbicacionDto dto)
    {
        if (dto.Tipo == "PTC")
            await _repo.ActualizarUbicacionPTCAsync(dto.Folio, dto.CveProd, dto.Tarima, dto.Ubicacion);
        else
            await _repo.ActualizarUbicacionPTPAsync(dto.Folio, dto.CveProd, dto.Tarima, dto.Ubicacion);
    }

    public Task<object?> ObtenerUbicacionTarimaAsync(string prod, string folio, string tarima)
    {
        // Retorna la ubicación actual de una tarima específica
        // Implementar con query a la BD
        return Task.FromResult<object?>(null);
    }

    public async Task<IEnumerable<object>> ObtenerInventarioPorUbicacionAsync(string codigoUbicacion)
    {
        var rows = await _repo.ObtenerInventarioPorUbicacionAsync(codigoUbicacion);
        return rows.Cast<object>();
    }
}
