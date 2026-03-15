// GabMonitor.API/Controllers/AutorizacionController.cs
using GabMonitor.API.DTOs;
using GabMonitor.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GabMonitor.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AutorizacionController : ControllerBase
{
    private readonly IAutorizacionService _service;

    public AutorizacionController(IAutorizacionService service)
    {
        _service = service;
    }

    /// <summary>
    /// Verifica la contraseña de autorización (RN-011).
    /// POST /api/autorizacion/verificar
    /// </summary>
    [HttpPost("verificar")]
    public IActionResult VerificarContrasena([FromBody] VerificarContrasenaDto dto)
    {
        // RN-011: Contraseñas del sistema original
        // NOTA: En producción estas deben estar en appsettings o vault, no hardcoded
        bool valida = dto.Contrasena == "CAMFRI2024" || dto.Contrasena == "RURR2024";
        return Ok(new { autorizado = valida });
    }

    /// <summary>
    /// Autoriza múltiples tarimas seleccionadas del grid.
    /// Equivalente a BTNAUTORIZAR_Click del WinForms (RN-012).
    /// PUT /api/autorizacion/lote
    /// </summary>
    [HttpPut("lote")]
    public async Task<IActionResult> AutorizarLote([FromBody] AutorizarLoteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Motivo))
            return BadRequest(new { error = "El motivo es obligatorio" });

        if (dto.TipoAutorizacion != "A" && dto.TipoAutorizacion != "C")
            return BadRequest(new { error = "TipoAutorizacion debe ser 'A' (Trailer) o 'C' (Camioneta)" });

        if (dto.Tarimas == null || !dto.Tarimas.Any())
            return BadRequest(new { error = "Se debe especificar al menos una tarima" });

        await _service.AutorizarTarimasAsync(dto);
        return Ok(new { mensaje = "Autorización aplicada correctamente", cantidad = dto.Tarimas.Count });
    }

    /// <summary>
    /// Autoriza tarimas de un folio específico.
    /// Equivalente a BtnImp_Click de PreAutorizarFolios (RN-012).
    /// PUT /api/autorizacion/folio
    /// </summary>
    [HttpPut("folio")]
    public async Task<IActionResult> AutorizarFolio([FromBody] AutorizarFolioDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Motivo))
            return BadRequest(new { error = "El motivo es obligatorio" });

        if (string.IsNullOrWhiteSpace(dto.Folio))
            return BadRequest(new { error = "El folio es obligatorio" });

        await _service.AutorizarFolioAsync(dto);
        return Ok(new { mensaje = "Folio autorizado correctamente" });
    }
}

// ─────────────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
public class UbicacionController : ControllerBase
{
    private readonly IUbicacionService _service;

    public UbicacionController(IUbicacionService service)
    {
        _service = service;
    }

    /// <summary>
    /// Actualiza la ubicación manual de una tarima (RN-013).
    /// Equivalente a BtnSave_Click de FrmUbicaManual.
    /// PUT /api/ubicacion
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> ActualizarUbicacion([FromBody] ActualizarUbicacionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Ubicacion))
            return BadRequest(new { error = "La ubicación es obligatoria" });

        await _service.ActualizarUbicacionAsync(dto);
        return Ok(new { mensaje = "Ubicación actualizada correctamente" });
    }

    /// <summary>
    /// Inventario asignado a una posición del almacén.
    /// Equivalente a Button_Click en FrmInvProd.
    /// GET /api/ubicacion/{codigo}/inventario
    /// </summary>
    [HttpGet("{codigo}/inventario")]
    public async Task<IActionResult> GetInventarioPorUbicacion(string codigo)
    {
        var items = await _service.ObtenerInventarioPorUbicacionAsync(codigo);
        return Ok(items);
    }
}
