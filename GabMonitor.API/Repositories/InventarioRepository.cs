// GabMonitor.API/Repositories/InventarioRepository.cs
using System.Data;
using Dapper;
using GabMonitor.API.Models.Domain;
using GabMonitor.API.Repositories.Interfaces;
using Microsoft.Data.SqlClient;

namespace GabMonitor.API.Repositories;

/// <summary>
/// Implementa todas las consultas SQL del sistema original.
/// Las queries son réplicas exactas de las usadas en Form1.cs y formularios secundarios.
/// La base de datos GAB_Irapuato NO se modifica en ningún aspecto.
/// </summary>
public class InventarioRepository : IInventarioRepository
{
    private readonly string _connectionString;

    public InventarioRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    // ─── Corte de inventario físico más reciente ──────────────────────────────

    public async Task<(DateTime Fecha, string Info)> ObtenerCorteInventarioAsync()
    {
        const string sql = @"
            SELECT TOP (1) invpt_fecha, invpt_hora
            FROM tb_mstr_fechainvfisico
            ORDER BY invpt_fecha DESC";

        using var conn = new SqlConnection(_connectionString);
        var row = await conn.QueryFirstOrDefaultAsync(sql);
        if (row == null) return (DateTime.Today, DateTime.Today.ToString("dd-MM-yyyy"));

        string info = row.invpt_fecha != null
            ? $"{row.invpt_fecha:dd-MM-yyyy HH:mm:ss.fff}"
            : DateTime.Today.ToString("dd-MM-yyyy");

        return (row.invpt_fecha ?? DateTime.Today, info);
    }

    // ─── Embarques desde el corte (surtidos/salidas) ─────────────────────────

    public async Task<IEnumerable<dynamic>> ObtenerEmbarquesDesdeCorteAsync(DateTime fechaCorte)
    {
        const string sql = @"
            SELECT RECIBO, PROD_CLAVE, TARIMA, SUM(CAJAS) as CAJAS
            FROM tb_det_embarque
            WHERE DATeCAPTURA >= @fechaCorte AND Estatus = 'A'
            GROUP BY PROD_CLAVE, RECIBO, TARIMA
            ORDER BY PROD_CLAVE, RECIBO, TARIMA";

        using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync(sql, new { fechaCorte });
    }

    // ─── SPLIT activos ────────────────────────────────────────────────────────

    public async Task<IEnumerable<dynamic>> ObtenerSplitActivosAsync()
    {
        const string sql = @"
            SELECT PROD_CLAVE, SUM(CAJAS) AS CAJAS
            FROM tb_det_split
            WHERE estatus = 'A'
            GROUP BY prod_clave
            ORDER BY prod_clave";

        using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync(sql);
    }

    // ─── Inventario teórico/físico del día ────────────────────────────────────

    public async Task<IEnumerable<dynamic>> ObtenerInventarioTeoricoAsync(DateTime fecha)
    {
        const string sql = @"
            SELECT prod_clave, inv_teorico, inv_fisico
            FROM tb_mstr_inventario_fisico
            WHERE invpt_fecha = @fecha
            ORDER BY PROD_CLAVE";

        using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync(sql, new { fecha = fecha.Date });
    }

    // ─── Pre-split del día ────────────────────────────────────────────────────

    public async Task<IEnumerable<dynamic>> ObtenerPresplitDelDiaAsync(DateTime fecha)
    {
        const string sql = @"
            SELECT Eti_Recibo, Eti_Producto, Eti_TarIni, COUNT(Eti_Caja) as CAJAS
            FROM Tb_Det_Etiqueta_Presplit
            WHERE Fecha = @fecha AND Estatus = 'A'
            GROUP BY Eti_Producto, Eti_Recibo, Eti_TarIni
            ORDER BY Eti_Producto, Eti_Recibo, Eti_TarIni";

        using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync(sql, new { fecha = fecha.Date });
    }

    // ─── PTC del día (totales por producto) ───────────────────────────────────

    public async Task<IEnumerable<dynamic>> ObtenerPtcDelDiaAsync(DateTime fecha)
    {
        const string sql = @"
            SELECT PROD_CLAVE, SUM(ETIQUETA) AS CAJAS
            FROM TB_DET_TRAZABILIDAD
            WHERE PTI_FECHA = @fecha AND tipo = 'PTC'
            GROUP BY PROD_CLAVE
            ORDER BY PROD_CLAVE";

        using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync(sql, new { fecha = fecha.Date });
    }

    // ─── Trazabilidad PTC — consulta principal (la más compleja del sistema) ──

    public async Task<IEnumerable<dynamic>> ObtenerTrazabilidadPTCAsync()
    {
        // Esta es la consulta más compleja del sistema original.
        // JOIN de 6 tablas para obtener toda la información de tarimas PTC activas.
        // Se preserva EXACTAMENTE tal como está en el WinForms original.
        const string sql = @"
            SELECT C.PROD_NOMBRE, A.RECIBO, A.TARIMA, A.PTI_FECHA, A.LOTE,
                   A.FECHA_CAD, A.ETIQUETA, A.SURTIDO, A.PROD_CLAVE, A.UBICACION,
                   AA.rptd_peso_bruto, AA.rptd_tara, AA.rptd_cantidad,
                   AB.ENV_PESO, AC.RPT_FECHA, A.preautorizado
            FROM TB_DET_TRAZABILIDAD A
            INNER JOIN tb_mstr_recepcion_pt B  ON A.recibo = B.rpt_recibo
            INNER JOIN tb_cat_producto C        ON A.PROD_CLAVE = C.PROD_CLAVE
            INNER JOIN tb_det_recepcion_pt AA   ON AA.RPT_RECIBO = A.RECIBO
                                               AND AA.PROD_CLAVE = A.prod_clave
            INNER JOIN tb_cat_envases AB         ON C.PROD_PRESENTACION = AB.ENV_CLAVE
            INNER JOIN TB_MSTR_RECEPCION_PT AC   ON AA.RPT_RECIBO = AC.RPT_RECIBO
            WHERE (AA.rptd_estatus != 'C' OR AA.rptd_estatus IS NULL)
              AND A.PTI_ESTATUS_SUR = ' '
              AND A.TIPO = 'PTC'
              AND AA.rptd_cantidad > 0
              AND B.rpt_estatus = ' '
              AND (B.rpt_tipo != 'TR' OR (B.rpt_tipo = 'TR' AND B.RPT_INVENTARIO = 'S'))
            ORDER BY C.PROD_NOMBRE, A.RECIBO, A.PTI_CLAVE";

        using var conn = new SqlConnection(_connectionString);
        conn.Open();
        return await conn.QueryAsync(sql, commandTimeout: 120);
    }

    // ─── PTP del día (totales por producto) ───────────────────────────────────

    public async Task<IEnumerable<dynamic>> ObtenerPtpDelDiaAsync(DateTime fecha)
    {
        const string sql = @"
            SELECT B.CVE_PROD, SUM(B.NUM_CAJAS) AS CAJAS
            FROM TB_DET_ETI_FINAL B
            WHERE B.FECHA = @fecha
            GROUP BY CVE_PROD
            ORDER BY CVE_PROD";

        using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync(sql, new { fecha = fecha.Date });
    }

    // ─── Etiquetas finales PTP — consulta principal ────────────────────────────

    public async Task<IEnumerable<dynamic>> ObtenerEtiquetasFinalesPTPAsync()
    {
        // JOIN de 6 tablas para obtener tarimas PTP activas.
        // Preservada exactamente del sistema original.
        const string sql = @"
            SELECT A.PROD_NOMBRE, B.FOLIO, B.TARIMA, B.FECHA, B.NUM_LOTE,
                   B.NUM_CAJAS, B.CAJAS_SUR, B.CVE_PROD, B.UBICACION, b.fechacad,
                   AB.PROD_CLAVE, AC.PROD_NOMBRE AS PROD_NOMBRE_INSUMO,
                   AB.PROD_PESO_VAR, AB.FODP_UNIDADES, AC.PROD_PRESENTACION,
                   AD.ENV_PESO, AE.HRP_PESO_NETO, AE.HRP_NUM_UNIDADES,
                   AE.hrp_fecha, B.preautorizado
            FROM TB_DET_ETI_FINAL B
            INNER JOIN TB_CAT_PRODUCTO A     ON B.CVE_PROD = A.PROD_CLAVE
            INNER JOIN TB_DET_FINAL_ODP AB   ON AB.ORDP_FOLIO = B.FOLIO
                                            AND AB.PROD_CLAVE = A.PROD_CLAVE
            INNER JOIN TB_CAT_PRODUCTO AC    ON AB.PROD_CLAVE = AC.PROD_CLAVE
            INNER JOIN tb_cat_envases AD     ON AC.PROD_PRESENTACION = AD.ENV_CLAVE
            INNER JOIN TB_HIST_RECEPCION AE  ON AB.ORDP_FOLIO = AE.hrp_recibo
                                            AND AB.PROD_CLAVE = AE.PROD_CLAVE
            WHERE B.ESTATUS_SUR = ' '
              AND B.NUM_CAJAS > 0
              AND AE.HRP_NUM_UNIDADES > 0
              AND B.ETIQUETA = 'S'
              AND AE.hrp_tipo_recepcion = 'PTP'
            ORDER BY A.PROD_NOMBRE, B.FOLIO, B.TARIMA";

        using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync(sql, commandTimeout: 120);
    }

    // ─── Catálogo de pesos por producto ──────────────────────────────────────

    public async Task<IEnumerable<dynamic>> ObtenerPesosProductosAsync()
    {
        const string sql = @"
            SELECT a.prod_clave, a.prod_nombre, a.prod_presentacion, B.env_peso
            FROM tb_cat_producto A
            INNER JOIN tb_cat_envases B ON A.prod_presentacion = b.env_clave";

        using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync(sql);
    }

    // ─── Semanas laborales para cálculo de lotes ─────────────────────────────

    public async Task<IEnumerable<SemanaLaboral>> ObtenerSemanasAsync(int anio)
    {
        const string sql = @"
            SELECT semana, ano, fecha1, fecha2
            FROM tb_cat_semanas
            WHERE ano >= @anioMin AND ano <= @anioMax";

        using var conn = new SqlConnection(_connectionString);
        var rows = await conn.QueryAsync(sql, new
        {
            anioMin = anio - 1,
            anioMax = anio + 1
        });

        return rows.Select(r => new SemanaLaboral
        {
            NumeroSemana = r.semana?.ToString() ?? "",
            Anio = Convert.ToInt32(r.ano),
            Fecha1 = r.fecha1,
            Fecha2 = r.fecha2
        });
    }

    // ─── Usuario activo en sesión por nombre de máquina ──────────────────────

    public async Task<string> ObtenerUsuarioActivoAsync(string nombreMaquina)
    {
        const string sql = @"
            SELECT TOP 1 usu_login
            FROM tb_cat_historial_dia
            WHERE nombre_maquina = @maquina
              AND fin_sesion IS NULL
              AND sistema = 'SIPGAB'
            ORDER BY inicio_sesion DESC";

        using var conn = new SqlConnection(_connectionString);
        return await conn.ExecuteScalarAsync<string>(sql, new { maquina = nombreMaquina }) ?? "";
    }
}
