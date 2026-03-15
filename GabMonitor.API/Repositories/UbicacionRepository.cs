// GabMonitor.API/Repositories/UbicacionRepository.cs
using Dapper;
using GabMonitor.API.Repositories.Interfaces;
using Microsoft.Data.SqlClient;

namespace GabMonitor.API.Repositories;

/// <summary>
/// Repositorio para consulta y actualización de ubicaciones en almacén.
/// Replica RN-013 del sistema original.
/// </summary>
public class UbicacionRepository : IUbicacionRepository
{
    private readonly string _connectionString;

    public UbicacionRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    /// <summary>
    /// Actualiza la ubicación de una tarima PTC.
    /// Replica el UPDATE de FrmUbicaManual para trazabilidad.
    /// </summary>
    public async Task ActualizarUbicacionPTCAsync(
        string folio, string cveProd, string tarima, string ubicacion)
    {
        const string sql = @"
            UPDATE TB_DET_TRAZABILIDAD
            SET UBICACION = @ubicacion
            WHERE RECIBO = @folio
              AND PROD_CLAVE = @cveProd
              AND TARIMA = @tarima
              AND TIPO = 'PTC'";

        using var conn = new SqlConnection(_connectionString);
        await conn.ExecuteAsync(sql, new { folio, cveProd, tarima, ubicacion });
    }

    /// <summary>
    /// Actualiza la ubicación de una tarima PTP.
    /// Replica el UPDATE de FrmUbicaManual para etiquetas finales.
    /// </summary>
    public async Task ActualizarUbicacionPTPAsync(
        string folio, string cveProd, string tarima, string ubicacion)
    {
        const string sql = @"
            UPDATE TB_DET_ETI_FINAL
            SET UBICACION = @ubicacion
            WHERE FOLIO = @folio
              AND CVE_PROD = @cveProd
              AND TARIMA = @tarima";

        using var conn = new SqlConnection(_connectionString);
        await conn.ExecuteAsync(sql, new { folio, cveProd, tarima, ubicacion });
    }

    /// <summary>
    /// Obtiene todo el inventario asignado a una posición del almacén.
    /// Usado por FrmInvProd al hacer clic en una posición del mapa.
    /// </summary>
    public async Task<IEnumerable<dynamic>> ObtenerInventarioPorUbicacionAsync(string codigoUbicacion)
    {
        const string sql = @"
            SELECT 'PTC' AS Tipo, C.PROD_NOMBRE, A.RECIBO, A.TARIMA,
                   (A.ETIQUETA - A.SURTIDO) AS Cantidad, A.FECHA_CAD, A.UBICACION
            FROM TB_DET_TRAZABILIDAD A
            INNER JOIN tb_cat_producto C ON A.PROD_CLAVE = C.PROD_CLAVE
            WHERE A.UBICACION = @ubicacion
              AND A.PTI_ESTATUS_SUR = ' '
              AND A.TIPO = 'PTC'
              AND (A.ETIQUETA - A.SURTIDO) > 0

            UNION ALL

            SELECT 'PTP' AS Tipo, A.PROD_NOMBRE, B.FOLIO, B.TARIMA,
                   (B.NUM_CAJAS - B.CAJAS_SUR) AS Cantidad, B.fechacad, B.UBICACION
            FROM TB_DET_ETI_FINAL B
            INNER JOIN TB_CAT_PRODUCTO A ON B.CVE_PROD = A.PROD_CLAVE
            WHERE B.UBICACION = @ubicacion
              AND B.ESTATUS_SUR = ' '
              AND (B.NUM_CAJAS - B.CAJAS_SUR) > 0

            ORDER BY Tipo, PROD_NOMBRE";

        using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync(sql, new { ubicacion = codigoUbicacion });
    }
}
