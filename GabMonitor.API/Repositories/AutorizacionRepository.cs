// GabMonitor.API/Repositories/AutorizacionRepository.cs
using Dapper;
using GabMonitor.API.Repositories.Interfaces;
using Microsoft.Data.SqlClient;

namespace GabMonitor.API.Repositories;

/// <summary>
/// Repositorio para operaciones de escritura relacionadas con autorizaciones.
/// Replica exactamente los UPDATEs e INSERTs del sistema WinForms original (RN-012).
/// </summary>
public class AutorizacionRepository : IAutorizacionRepository
{
    private readonly string _connectionString;

    public AutorizacionRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    /// <summary>
    /// Marca una tarima como pre-autorizada en ambas tablas (PTC y PTP).
    /// Replica el código de BTNAUTORIZAR_Click y BtnImp_Click.
    /// tipoAuth: 'A' = Trailer, 'C' = Camioneta
    /// </summary>
    public async Task AutorizarTarimaAsync(
        string folio, string cveProd, string tarima,
        string tipo, string tipoAuth)
    {
        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        // PTC: tb_det_trazabilidad
        if (tipo == "PTC" || tipo == "AMBOS")
        {
            const string sqlPtc = @"
                UPDATE tb_det_trazabilidad
                SET preautorizado = @tipoAuth
                WHERE Recibo = @folio
                  AND prod_clave = @cveProd
                  AND TARIMA = @tarima
                  AND tipo = 'PTC'";

            await conn.ExecuteAsync(sqlPtc, new { folio, cveProd, tarima, tipoAuth });
        }

        // PTP: tb_det_eti_final
        if (tipo == "PTP" || tipo == "AMBOS")
        {
            const string sqlPtp = @"
                UPDATE tb_det_eti_final
                SET preautorizado = @tipoAuth
                WHERE folio = @folio
                  AND cve_prod = @cveProd
                  AND TARIMA = @tarima";

            await conn.ExecuteAsync(sqlPtp, new { folio, cveProd, tarima, tipoAuth });
        }
    }

    /// <summary>
    /// Registra el movimiento en el log de auditoría.
    /// Replica la inserción en tb_registro_movimientos del sistema original.
    /// </summary>
    public async Task RegistrarMovimientoAsync(
        string maquina, string usuario,
        string folio, string detalle, string motivo)
    {
        const string sql = @"
            INSERT INTO tb_registro_movimientos
                (fecha, nom_compu, nom_usu, tipo_mov, op_clave, folio,
                 detalle, sistema, mov_folio, Arm_solicita, usuario_autoriza, obs)
            VALUES
                (GETDATE(), @maquina, @usuario, 'PreAutor', '3.18', @folio,
                 @detalle, 'SISGAB', @folio, '', '', @motivo)";

        using var conn = new SqlConnection(_connectionString);
        await conn.ExecuteAsync(sql, new { maquina, usuario, folio, detalle, motivo });
    }
}
