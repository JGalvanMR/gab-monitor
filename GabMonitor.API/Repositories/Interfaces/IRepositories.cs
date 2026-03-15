// GabMonitor.API/Repositories/Interfaces/IRepositories.cs
using GabMonitor.API.Models.Domain;

namespace GabMonitor.API.Repositories.Interfaces;

public interface IInventarioRepository
{
    Task<(DateTime Fecha, string Info)> ObtenerCorteInventarioAsync();
    Task<IEnumerable<dynamic>> ObtenerEmbarquesDesdeCorteAsync(DateTime fechaCorte);
    Task<IEnumerable<dynamic>> ObtenerSplitActivosAsync();
    Task<IEnumerable<dynamic>> ObtenerInventarioTeoricoAsync(DateTime fecha);
    Task<IEnumerable<dynamic>> ObtenerPresplitDelDiaAsync(DateTime fecha);
    Task<IEnumerable<dynamic>> ObtenerPtcDelDiaAsync(DateTime fecha);
    Task<IEnumerable<dynamic>> ObtenerTrazabilidadPTCAsync();
    Task<IEnumerable<dynamic>> ObtenerPtpDelDiaAsync(DateTime fecha);
    Task<IEnumerable<dynamic>> ObtenerEtiquetasFinalesPTPAsync();
    Task<IEnumerable<dynamic>> ObtenerPesosProductosAsync();
    Task<IEnumerable<SemanaLaboral>> ObtenerSemanasAsync(int anio);
    Task<string> ObtenerUsuarioActivoAsync(string nombreMaquina);
}

public interface IAutorizacionRepository
{
    Task AutorizarTarimaAsync(string folio, string cveProd, string tarima, string tipo, string tipoAuth);
    Task RegistrarMovimientoAsync(string maquina, string usuario, string folio, string detalle, string motivo);
}

public interface IUbicacionRepository
{
    Task ActualizarUbicacionPTCAsync(string folio, string cveProd, string tarima, string ubicacion);
    Task ActualizarUbicacionPTPAsync(string folio, string cveProd, string tarima, string ubicacion);
    Task<IEnumerable<dynamic>> ObtenerInventarioPorUbicacionAsync(string codigoUbicacion);
}
