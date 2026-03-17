// GabMonitor.API/Controllers/TarimasController.cs
// Endpoints para los modales que se abren al hacer doble clic en el grid.
// Equivalentes a: FrmConsDet, FrmConsDetpresplit, ReciboPTC, ReciboPTP

using Dapper;
using GabMonitor.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace GabMonitor.API.Controllers;

[ApiController]
[Route("api/tarimas")]
public class TarimasController : ControllerBase
{
    private readonly string _conn;
    private readonly ILogger<TarimasController> _logger;

    public TarimasController(IConfiguration cfg, ILogger<TarimasController> logger)
    {
        _conn   = cfg.GetConnectionString("GabIrapuato")!;
        _logger = logger;
    }

    // ─── FrmConsDet — historial de una tarima (col 7 / CANTIDAD double-click) ──

    /// <summary>
    /// Replica FrmConsDet: historial de embarques, splits y movimientos de una tarima.
    /// Equivalente al doble clic en la columna CANTIDAD del WinForms original.
    /// GET /api/tarimas/detalle?recibo=ABC123&prod=02001&tarima=001&tipo=PTC
    /// </summary>
    [HttpGet("detalle")]
    public async Task<IActionResult> GetDetalle(
        [FromQuery] string recibo,
        [FromQuery] string prod,
        [FromQuery] string tarima,
        [FromQuery] string tipo)
    {
        try
        {
            using var conn = new SqlConnection(_conn);

            object resultado;

            if (tipo == "PTC")
            {
                // Embarques de esta tarima PTC
                const string sqlEmb = @"
                    SELECT CONVERT(varchar(10), DATeCAPTURA, 103) AS Fecha,
                           CAJAS, Estatus, ISNULL(Destino,'') AS Destino,
                           ISNULL(usuario,'') AS Usuario
                    FROM tb_det_embarque
                    WHERE RECIBO = @recibo AND PROD_CLAVE = @prod AND TARIMA = @tarima
                    ORDER BY DATeCAPTURA DESC";

                // Splits de esta tarima PTC
                const string sqlSpl = @"
                    SELECT CONVERT(varchar(10), fecha, 103) AS Fecha,
                           CAJAS, estatus
                    FROM tb_det_split
                    WHERE RECIBO = @recibo AND PROD_CLAVE = @prod AND TARIMA_INI = @tarima
                    ORDER BY fecha DESC";

                var embarques = await conn.QueryAsync(sqlEmb, new { recibo, prod, tarima });
                var splits    = await conn.QueryAsync(sqlSpl, new { recibo, prod, tarima });

                resultado = new { embarques, splits };
            }
            else // PTP
            {
                const string sqlEmb = @"
                    SELECT CONVERT(varchar(10), DATeCAPTURA, 103) AS Fecha,
                           CAJAS, Estatus, ISNULL(Destino,'') AS Destino,
                           ISNULL(usuario,'') AS Usuario
                    FROM tb_det_embarque
                    WHERE RECIBO = @recibo AND PROD_CLAVE = @prod AND TARIMA = @tarima
                    ORDER BY DATeCAPTURA DESC";

                var embarques = await conn.QueryAsync(sqlEmb, new { recibo, prod, tarima });
                resultado = new { embarques, splits = Array.Empty<object>() };
            }

            return Ok(resultado);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener detalle de tarima");
            return StatusCode(500, "Error al obtener detalle");
        }
    }

    // ─── FrmConsDetpresplit — detalle de pre-split (col 15 / PRESPLIT double-click) ──

    /// <summary>
    /// Replica FrmConsDetpresplit: cajas en etapa de pre-split.
    /// Equivalente al doble clic en la columna PRESPLIT del WinForms original.
    /// GET /api/tarimas/presplit?recibo=ABC123&prod=02001&tarima=001
    /// </summary>
    [HttpGet("presplit")]
    public async Task<IActionResult> GetPresplit(
        [FromQuery] string recibo,
        [FromQuery] string prod,
        [FromQuery] string tarima)
    {
        try
        {
            const string sql = @"
                SELECT Eti_Caja AS Caja,
                       ISNULL(Eti_Imei,'') AS Imei,
                       ISNULL(Eti_Version,'') AS Version,
                       CONVERT(varchar(10), Fecha, 103) AS Fecha,
                       Estatus
                FROM Tb_Det_Etiqueta_Presplit
                WHERE Eti_Recibo   = @recibo
                  AND Eti_Producto = @prod
                  AND Eti_TarIni   = @tarima
                  AND Estatus      = 'A'
                ORDER BY Eti_Caja";

            using var conn = new SqlConnection(_conn);
            var rows = await conn.QueryAsync(sql, new { recibo, prod, tarima });
            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener detalle de presplit");
            return StatusCode(500, "Error al obtener presplit");
        }
    }

    // ─── ReciboPTC — info del recibo (col 0 PTC double-click) ─────────────────

    /// <summary>
    /// Replica ReciboPTC: información de la recepción PTC.
    /// Equivalente al doble clic en la columna NOMBRE cuando TIPO=PTC.
    /// GET /api/tarimas/recibo-ptc?recibo=ABC123&prod=02001
    /// </summary>
    [HttpGet("recibo-ptc")]
    public async Task<IActionResult> GetReciboPTC(
        [FromQuery] string recibo,
        [FromQuery] string prod)
    {
        try
        {
            const string sql = @"
                SELECT
                    A.RPT_RECIBO         AS Recibo,
                    CONVERT(varchar(10), A.RPT_FECHA, 103) AS Fecha,
                    ISNULL(A.RPT_RANCHO,'')     AS Rancho,
                    ISNULL(A.RPT_PRODUCTOR,'')  AS Productor,
                    ISNULL(A.RPT_CAMPO,'')      AS Campo,
                    ISNULL(A.RPT_REGION,'')     AS Region,
                    A.RPT_TIPO           AS TipoRecibo,
                    B.PROD_NOMBRE        AS Producto,
                    C.rptd_cantidad      AS Cantidad,
                    C.rptd_peso_bruto    AS PesoBruto,
                    C.rptd_tara          AS Tara,
                    (C.rptd_peso_bruto - C.rptd_tara) AS PesoNeto
                FROM TB_MSTR_RECEPCION_PT A
                INNER JOIN tb_cat_producto B    ON B.PROD_CLAVE = @prod
                LEFT  JOIN tb_det_recepcion_pt C
                       ON C.RPT_RECIBO = A.RPT_RECIBO AND C.PROD_CLAVE = @prod
                WHERE A.RPT_RECIBO = @recibo";

            using var conn = new SqlConnection(_conn);
            var row = await conn.QueryFirstOrDefaultAsync(sql, new { recibo, prod });
            if (row == null) return NotFound(new { mensaje = "Recibo no encontrado" });
            return Ok(row);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener recibo PTC");
            return StatusCode(500, "Error al obtener recibo PTC");
        }
    }

    // ─── ReciboPTP — info del folio PTP (col 0 PTP double-click) ──────────────

    /// <summary>
    /// Replica ReciboPTP: información de la orden de producción PTP.
    /// Equivalente al doble clic en la columna NOMBRE cuando TIPO=PTP.
    /// GET /api/tarimas/recibo-ptp?folio=ABC123&tarima=001&prod=02001
    /// </summary>
    [HttpGet("recibo-ptp")]
    public async Task<IActionResult> GetReciboPTP(
        [FromQuery] string folio,
        [FromQuery] string tarima,
        [FromQuery] string prod)
    {
        try
        {
            const string sql = @"
                SELECT
                    B.FOLIO,
                    CONVERT(varchar(10), B.FECHA, 103) AS Fecha,
                    B.NUM_LOTE          AS Lote,
                    B.NUM_CAJAS         AS Cajas,
                    B.CAJAS_SUR         AS CajasSurtidas,
                    (B.NUM_CAJAS - B.CAJAS_SUR) AS CajasPendientes,
                    A.PROD_NOMBRE       AS Producto,
                    C.HRP_PESO_NETO     AS PesoNeto,
                    C.HRP_NUM_UNIDADES  AS NumUnidades,
                    CONVERT(varchar(10), C.hrp_fecha, 103) AS FechaHistRecep
                FROM TB_DET_ETI_FINAL B
                INNER JOIN TB_CAT_PRODUCTO A  ON B.CVE_PROD = A.PROD_CLAVE
                LEFT  JOIN TB_HIST_RECEPCION C
                       ON C.hrp_recibo = B.FOLIO AND C.PROD_CLAVE = B.CVE_PROD
                WHERE B.FOLIO = @folio AND B.TARIMA = @tarima AND B.CVE_PROD = @prod";

            using var conn = new SqlConnection(_conn);
            var row = await conn.QueryFirstOrDefaultAsync(sql, new { folio, tarima, prod });
            if (row == null) return NotFound(new { mensaje = "Folio PTP no encontrado" });
            return Ok(row);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener recibo PTP");
            return StatusCode(500, "Error al obtener recibo PTP");
        }
    }
}
