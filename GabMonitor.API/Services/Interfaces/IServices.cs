// GabMonitor.API/Services/Interfaces/IServices.cs
using GabMonitor.API.Models.Domain;

namespace GabMonitor.API.Services.Interfaces;

public interface IInventarioService
{
    Task<(List<ItemInventario> Items, MetricasInventario Metricas)> GenerarInventarioConsolidadoAsync();
}

public interface ICalculoService
{
    DateTime CalcularFechaCaducidadImplicita(string nombreProducto, DateTime fechaElaboracion);
    int CalcularDiasHastaCaducidad(DateTime fechaCaducidad);
    decimal CalcularPesoHielo(decimal pesoOriginal, DateTime fechaRecepcion, DateTime fechaEmbarque);
    decimal CalcularPesoPTC(decimal pesoBruto, decimal tara, int cantidad, int cajasPorEntregar, string claveProd, DateTime fechaRecepcion);
    decimal CalcularPesoPTP(decimal prodPesoVar, decimal envPeso, decimal pesoNeto, decimal numUnidades, int cajasEntregadas, string claveProd, DateTime fechaHistRecep, decimal pesoProdCatalogo = 0);
    string ObtenerLotePorFecha(DateTime fecha, IEnumerable<SemanaLaboral> semanas);
    DateTime? ParsearFechaDeLotePTP(string numLote, int tamanoLote);
    bool EsProductoExcluido(string nombreProducto, string ubicacion);
}

public interface IAutorizacionService
{
    Task AutorizarTarimasAsync(GabMonitor.API.DTOs.AutorizarLoteDto dto);
    Task AutorizarFolioAsync(GabMonitor.API.DTOs.AutorizarFolioDto dto);
}

public interface IUbicacionService
{
    Task ActualizarUbicacionAsync(GabMonitor.API.DTOs.ActualizarUbicacionDto dto);

    // FIX H-3: firma corregida — antes retornaba Task<object?> con cuerpo null.
    // Ahora el servicio delega al repositorio con la query real.
    Task<object?> ObtenerUbicacionTarimaAsync(string prod, string folio, string tarima);

    Task<IEnumerable<object>> ObtenerInventarioPorUbicacionAsync(string codigoUbicacion);
}
