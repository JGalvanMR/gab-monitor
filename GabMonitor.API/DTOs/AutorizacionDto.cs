// GabMonitor.API/DTOs/AutorizacionDto.cs
namespace GabMonitor.API.DTOs;

/// <summary>Verificación de contraseña para modo autorización (RN-011)</summary>
public record VerificarContrasenaDto(string Contrasena);

/// <summary>Datos de una tarima a autorizar</summary>
public record TarimaAutorizarDto(
    string Folio,
    string CveProd,
    string Tarima,
    string Tipo   // "PTC" o "PTP"
);

/// <summary>
/// Autorización masiva de tarimas seleccionadas del grid principal.
/// Equivalente a BTNAUTORIZAR_Click en WinForms (RN-012).
/// </summary>
public record AutorizarLoteDto(
    List<TarimaAutorizarDto> Tarimas,
    string TipoAutorizacion,  // "A" = Trailer, "C" = Camioneta
    string Motivo,
    string Usuario,
    string NombreMaquina
);

/// <summary>
/// Autorización por folio completo.
/// Equivalente a BtnImp_Click en PreAutorizarFolios (RN-012).
/// </summary>
public record AutorizarFolioDto(
    string Folio,
    string TipoRecibo,        // "PTC" o "PTP"
    List<TarimaAutorizarDto> Tarimas,
    string TipoAutorizacion,  // "A" = Trailer, "C" = Camioneta
    string Motivo,
    string Usuario,
    string NombreMaquina
);

/// <summary>Actualizar ubicación manual de una tarima (RN-013)</summary>
public record ActualizarUbicacionDto(
    string Folio,
    string CveProd,
    string Tarima,
    string Tipo,      // "PTC" o "PTP"
    string Ubicacion,
    string Usuario,
    string NombreMaquina
);

/// <summary>Filtros disponibles para el inventario consolidado</summary>
public enum FiltroInventario
{
    Todos,
    Caducado,
    Proximo,
    AutTrailer,
    AutCamioneta
}
