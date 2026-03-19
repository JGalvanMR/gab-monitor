// GabMonitor.API/Controllers/TarimasController.cs
// VERSIÓN CORREGIDA - Sin comentarios C# dentro de strings SQL

using Dapper;
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
        _conn = cfg.GetConnectionString("GabIrapuato")!;
        _logger = logger;
    }

    [HttpGet("detalle")]
    public async Task<IActionResult> GetDetalle(
        [FromQuery] string recibo,
        [FromQuery] string prod,
        [FromQuery] string tarima,
        [FromQuery] string tipo)
    {
        try
        {
            if (tipo != "PTC" && tipo != "PTP")
                return BadRequest(new { mensaje = "Tipo debe ser PTC o PTP" });

            using var conn = new SqlConnection(_conn);

            // CORRECCIÓN: JOIN con tb_mstr_embarque para obtener responsable
            // La relación es por emb_folio
            const string sqlEmb = @"
            SELECT 
                LTRIM(RTRIM(E.emb_folio)) AS EmbFolio,
                CONVERT(int, E.cajas) AS Cajas,
                CONVERT(int, E.seccion) AS Seccion,
                CONVERT(int, E.temp) AS Tempe,
                LTRIM(RTRIM(ISNULL(E.fec_cad, ''))) AS Fec_Cad,
                CONVERT(varchar(20), E.datecaptura, 120) AS FechaCap,
                LTRIM(RTRIM(ISNULL(E.emb_tipo, ''))) AS Split,
                LTRIM(RTRIM(ISNULL(E.Estatus, ''))) AS Statu,
                -- Responsable desde tb_mstr_embarque
                ISNULL(CAST(M.responsable AS varchar(100)), '') AS Respon,
                E.peso,
                E.pesoneto,
                LTRIM(RTRIM(E.no_lote)) AS Lote
            FROM tb_det_embarque E
            LEFT JOIN tb_mstr_embarque M 
                ON LTRIM(RTRIM(E.emb_folio)) = LTRIM(RTRIM(M.emb_folio))
                AND LTRIM(RTRIM(E.emb_tipo)) = LTRIM(RTRIM(M.emb_tipo))
            WHERE E.recibo = @recibo
              AND E.prod_clave = @prod 
              AND E.tarima = CONVERT(decimal(3,0), @tarima)
            ORDER BY E.datecaptura DESC";

            var embarques = await conn.QueryAsync(sqlEmb, new { recibo, prod, tarima });

            // Calcular totales para el header del modal
            int totalCajas = embarques.Sum(e => (int)e.Cajas);

            // Obtener información del recibo para el header
            var infoRecibo = await ObtenerInfoReciboAsync(conn, recibo, prod, tarima, tipo);

            object splits;
            if (tipo == "PTC")
            {
                const string sqlSpl = @"
                SELECT 
                    CONVERT(varchar(10), fecha, 103) AS Fecha,
                    CONVERT(int, CAJAS) AS Cajas,
                    estatus
                FROM tb_det_split
                WHERE no_lote = @recibo
                  AND PROD_CLAVE = @prod 
                  AND tarini = @tarima
                ORDER BY fecha DESC";

                splits = await conn.QueryAsync(sqlSpl, new { recibo, prod, tarima });
            }
            else
            {
                splits = Array.Empty<object>();
            }

            return Ok(new
            {
                tipo,
                producto = infoRecibo?.Producto ?? prod,
                recibo,
                tarima,
                cantidadTotal = infoRecibo?.CantidadTotal ?? 0,
                surtidoTotal = infoRecibo?.SurtidoTotal ?? 0,
                porSurtir = infoRecibo?.PorSurtir ?? 0,
                embarques,
                splits
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en GetDetalle Tipo={Tipo}", tipo);
            return StatusCode(500, new { error = "Error al obtener detalle", detalle = ex.Message });
        }
    }

    // Método auxiliar para obtener información del recibo (cantidades)
    private async Task<dynamic?> ObtenerInfoReciboAsync(SqlConnection conn, string recibo, string prod, string tarima, string tipo)
    {
        try
        {
            if (tipo == "PTC")
            {
                const string sql = @"
                SELECT 
                    C.PROD_NOMBRE AS Producto,
                    A.ETIQUETA AS CantidadTotal,
                    A.SURTIDO AS SurtidoTotal,
                    (A.ETIQUETA - A.SURTIDO) AS PorSurtir
                FROM TB_DET_TRAZABILIDAD A
                INNER JOIN tb_cat_producto C ON A.PROD_CLAVE = C.PROD_CLAVE
                WHERE A.RECIBO = @recibo
                  AND A.PROD_CLAVE = @prod
                  AND A.TARIMA = @tarima
                  AND A.TIPO = 'PTC'";

                return await conn.QueryFirstOrDefaultAsync(sql, new { recibo, prod, tarima });
            }
            else // PTP
            {
                const string sql = @"
                SELECT 
                    A.PROD_NOMBRE AS Producto,
                    B.NUM_CAJAS AS CantidadTotal,
                    B.CAJAS_SUR AS SurtidoTotal,
                    (B.NUM_CAJAS - B.CAJAS_SUR) AS PorSurtir
                FROM TB_DET_ETI_FINAL B
                INNER JOIN TB_CAT_PRODUCTO A ON B.CVE_PROD = A.PROD_CLAVE
                WHERE B.FOLIO = @recibo
                  AND B.CVE_PROD = @prod
                  AND B.TARIMA = CONVERT(decimal(3,0), @tarima)";

                return await conn.QueryFirstOrDefaultAsync(sql, new { recibo, prod, tarima });
            }
        }
        catch
        {
            return null;
        }
    }

    [HttpGet("presplit")]
    public async Task<IActionResult> GetPresplit(
        [FromQuery] string recibo,
        [FromQuery] string prod,
        [FromQuery] string tarima)
    {
        try
        {
            const string sql = @"
                SELECT 
                    Eti_Caja AS Caja,
                    ISNULL(Imei,'') AS Imei,
                    ISNULL(Version,'') AS Version,
                    CONVERT(varchar(10), Fecha, 103) AS Fecha,
                    Estatus
                FROM Tb_Det_Etiqueta_Presplit
                WHERE Eti_Recibo = @recibo
                  AND Eti_Producto = @prod
                  AND Eti_TarIni = @tarima
                  AND Estatus = 'A'
                ORDER BY Eti_Caja";

            using var conn = new SqlConnection(_conn);
            var rows = await conn.QueryAsync(sql, new { recibo, prod, tarima });
            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en GetPresplit");
            return StatusCode(500, new { error = "Error al obtener presplit" });
        }
    }

    [HttpGet("recibo-ptc")]
    public async Task<IActionResult> GetReciboPTC(
        [FromQuery] string recibo,
        [FromQuery] string prod)
    {
        try
        {
            const string sql = @"
                SELECT
                    CONVERT(varchar(20), A.rpt_recibo) AS Recibo,
                    CONVERT(varchar(10), A.rpt_fecha, 103) AS Fecha,
                    CONVERT(varchar, A.rpt_viaje) AS Viaje,
                    LTRIM(RTRIM(ISNULL(A.rpt_hora, ''))) AS Hora,
                    LTRIM(RTRIM(ISNULL(A.rpt_observaciones, ''))) AS Observaciones,
                    LTRIM(RTRIM(ISNULL(P.prov_clave, ''))) AS ProductorClave,
                    LTRIM(RTRIM(ISNULL(P.prov_nombre, ''))) AS Productor,
                    LTRIM(RTRIM(ISNULL(R.rch_clave, ''))) AS RanchoClave,
                    LTRIM(RTRIM(ISNULL(R.rch_nombre, ''))) AS Rancho,
                    LTRIM(RTRIM(ISNULL(R.rch_ubicacion, ''))) AS UbicacionRancho,
                    LTRIM(RTRIM(ISNULL(T.tbl_clave, ''))) AS TablaClave,
                    LTRIM(RTRIM(ISNULL(T.tbl_nombre, ''))) AS Campo,
                    LTRIM(RTRIM(ISNULL(V.vari_nombre, ''))) AS Variedad,
                    '' AS Region,
                    LTRIM(RTRIM(ISNULL(A.rpt_tipo, ''))) AS TipoRecibo,
                    LTRIM(RTRIM(ISNULL(B.PROD_NOMBRE, ''))) AS Producto,
                    CONVERT(int, C.rptd_cantidad) AS Cantidad,
                    C.rptd_peso_bruto AS PesoBruto,
                    C.rptd_tara AS Tara,
                    (C.rptd_peso_bruto - C.rptd_tara) AS PesoNeto
                FROM TB_MSTR_RECEPCION_PT A
                INNER JOIN tb_cat_producto B 
                    ON LTRIM(RTRIM(B.PROD_CLAVE)) = LTRIM(RTRIM(@prod))
                LEFT JOIN tb_cat_proveedor P
                    ON LTRIM(RTRIM(P.prov_clave)) = LTRIM(RTRIM(A.prov_clave))
                LEFT JOIN tb_cat_ranchos R
                    ON LTRIM(RTRIM(R.rch_clave)) = LTRIM(RTRIM(A.rch_clave))
                LEFT JOIN tb_cat_tablas T
                    ON LTRIM(RTRIM(T.tbl_clave)) = LTRIM(RTRIM(A.tbl_clave))
                    AND LTRIM(RTRIM(T.prov_clave)) = LTRIM(RTRIM(A.prov_clave))
                LEFT JOIN tb_cat_variedad V
                    ON LTRIM(RTRIM(V.vari_clave)) = LTRIM(RTRIM(A.vari_clave))
                    AND LTRIM(RTRIM(V.lin_clave)) = LTRIM(RTRIM(A.lin_clave))
                LEFT JOIN tb_det_recepcion_pt C
                    ON C.rpt_recibo = A.rpt_recibo
                    AND LTRIM(RTRIM(C.prod_clave)) = LTRIM(RTRIM(@prod))
                WHERE A.rpt_recibo = CONVERT(int, @recibo)";

            using var conn = new SqlConnection(_conn);
            var row = await conn.QueryFirstOrDefaultAsync(sql, new { recibo, prod });

            if (row == null)
                return NotFound(new { mensaje = "Recibo no encontrado" });

            return Ok(row);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en GetReciboPTC");
            return StatusCode(500, new { error = "Error al obtener recibo PTC", detalle = ex.Message });
        }
    }

    [HttpGet("recibo-ptp")]
    public async Task<IActionResult> GetReciboPTP(
        [FromQuery] string folio,
        [FromQuery] string tarima,
        [FromQuery] string prod)
    {
        try
        {
            using var conn = new SqlConnection(_conn);

            const string sqlRecibo = @"
                SELECT LTRIM(RTRIM(RECIBO)) as Recibo
                FROM TB_DET_ETI_FINAL 
                WHERE FOLIO = @folio 
                  AND CVE_PROD = @prod 
                  AND TARIMA = CONVERT(decimal(3,0), @tarima)";

            var reciboAsociado = await conn.QueryFirstOrDefaultAsync<string>(sqlRecibo, new { folio, prod, tarima });

            if (string.IsNullOrEmpty(reciboAsociado))
                return NotFound(new { mensaje = "No se encontró recibo asociado al folio PTP" });

            string reciboFinal = reciboAsociado;
            string reciboReempaque = "";

            const string sqlTipo = @"
                SELECT LTRIM(RTRIM(RMP_TIPO)) as Tipo
                FROM TB_DET_PROD_ODP 
                WHERE ORDP_FOLIO = @folio 
                  AND RMP_RECIBO = @reciboAsociado";

            var tipoRecibo = await conn.QueryFirstOrDefaultAsync<string>(sqlTipo, new { folio, reciboAsociado });

            if (tipoRecibo == "REM")
            {
                var reciboOriginal = await BuscaReemAsync(conn, reciboAsociado);
                if (!string.IsNullOrEmpty(reciboOriginal) && reciboOriginal != reciboAsociado)
                {
                    reciboReempaque = reciboAsociado;
                    reciboFinal = reciboOriginal;
                }
            }

            const string sqlMP = @"
                SELECT
                    LTRIM(RTRIM(RMP_RECIBO)) AS Recibo,
                    CONVERT(varchar(10), RMP_FECHA, 103) AS Fecha,
                    LTRIM(RTRIM(ISNULL(Mp_Cve_fecha, ''))) AS Lote,
                    LTRIM(RTRIM(ISNULL(rmp_observaciones, ''))) AS Observaciones,
                    LTRIM(RTRIM(ISNULL(P.prov_clave, ''))) AS ProductorClave,
                    LTRIM(RTRIM(ISNULL(P.prov_nombre, ''))) AS Productor,
                    LTRIM(RTRIM(ISNULL(R.rch_clave, ''))) AS RanchoClave,
                    LTRIM(RTRIM(ISNULL(R.rch_nombre, ''))) AS Rancho,
                    LTRIM(RTRIM(ISNULL(R.rch_ubicacion, ''))) AS UbicacionRancho,
                    LTRIM(RTRIM(ISNULL(T.tbl_clave, ''))) AS TablaClave,
                    LTRIM(RTRIM(ISNULL(T.tbl_nombre, ''))) AS Campo
                FROM TB_MSTR_RECEPCION_MP A
                LEFT JOIN tb_cat_proveedor P
                    ON LTRIM(RTRIM(P.prov_clave)) = LTRIM(RTRIM(A.prov_clave))
                LEFT JOIN tb_cat_ranchos R
                    ON LTRIM(RTRIM(R.rch_clave)) = LTRIM(RTRIM(A.rch_clave))
                LEFT JOIN tb_cat_tablas T
                    ON LTRIM(RTRIM(T.tbl_clave)) = LTRIM(RTRIM(A.tbl_clave))
                    AND LTRIM(RTRIM(T.prov_clave)) = LTRIM(RTRIM(A.prov_clave))
                WHERE A.RMP_RECIBO = @reciboFinal";

            var datosMP = await conn.QueryFirstOrDefaultAsync(sqlMP, new { reciboFinal });

            if (datosMP == null)
                return NotFound(new { mensaje = "No se encontraron datos de materia prima" });

            const string sqlPTP = @"
                SELECT
                    LTRIM(RTRIM(B.FOLIO)) AS Folio,
                    CONVERT(varchar(10), B.FECHA, 103) AS FechaProduccion,
                    LTRIM(RTRIM(B.NUM_LOTE)) AS LoteProduccion,
                    CONVERT(int, B.NUM_CAJAS) AS CajasProducidas,
                    CONVERT(int, B.CAJAS_SUR) AS CajasSurtidas,
                    CONVERT(int, (B.NUM_CAJAS - B.CAJAS_SUR)) AS CajasPendientes,
                    LTRIM(RTRIM(A.PROD_NOMBRE)) AS Producto
                FROM TB_DET_ETI_FINAL B
                INNER JOIN TB_CAT_PRODUCTO A 
                    ON LTRIM(RTRIM(B.CVE_PROD)) = LTRIM(RTRIM(A.PROD_CLAVE))
                WHERE LTRIM(RTRIM(B.FOLIO)) = LTRIM(RTRIM(@folio))
                    AND B.TARIMA = CONVERT(decimal(3,0), @tarima)
                    AND LTRIM(RTRIM(B.CVE_PROD)) = LTRIM(RTRIM(@prod))";

            var datosPTP = await conn.QueryFirstOrDefaultAsync(sqlPTP, new { folio, tarima, prod });

            var resultado = new
            {
                Recibo = datosMP.Recibo,
                Fecha = datosMP.Fecha,
                Lote = datosMP.Lote,
                Observaciones = datosMP.Observaciones,
                Productor = datosMP.Productor,
                ProductorClave = datosMP.ProductorClave,
                Rancho = datosMP.Rancho,
                RanchoClave = datosMP.RanchoClave,
                UbicacionRancho = datosMP.UbicacionRancho,
                Campo = datosMP.Campo,
                TablaClave = datosMP.TablaClave,
                EsReempaque = !string.IsNullOrEmpty(reciboReempaque),
                ReciboReempaque = reciboReempaque,
                Folio = datosPTP?.Folio ?? folio,
                FechaProduccion = datosPTP?.FechaProduccion,
                LoteProduccion = datosPTP?.LoteProduccion,
                Producto = datosPTP?.Producto,
                CajasProducidas = datosPTP?.CajasProducidas ?? 0,
                CajasSurtidas = datosPTP?.CajasSurtidas ?? 0,
                CajasPendientes = datosPTP?.CajasPendientes ?? 0
            };

            return Ok(resultado);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en GetReciboPTP");
            return StatusCode(500, new { error = "Error al obtener recibo PTP", detalle = ex.Message });
        }
    }

    private async Task<string> BuscaReemAsync(SqlConnection conn, string recibo)
    {
        try
        {
            const string sql = @"
                SELECT 
                    LTRIM(RTRIM(TARIMA)) as Tarima,
                    LTRIM(RTRIM(RMP_RECIBO)) as OrdenProduccion,
                    LTRIM(RTRIM(PROD_CLAVE)) as Producto
                FROM TB_DET_PROD_TAR 
                WHERE ORDE_FOLIO = @recibo";

            var registros = await conn.QueryAsync(sql, new { recibo });

            foreach (var reg in registros)
            {
                const string sqlBuscar = @"
                    SELECT LTRIM(RTRIM(RECIBO)) as Recibo
                    FROM TB_DET_ETI_FINAL 
                    WHERE FOLIO = @ordenProduccion 
                      AND CVE_PROD = @producto 
                      AND TARIMA = @tarima";

                var reciboEncontrado = await conn.QueryFirstOrDefaultAsync<string>(
                    sqlBuscar,
                    new
                    {
                        ordenProduccion = reg.OrdenProduccion,
                        producto = reg.Producto,
                        tarima = reg.Tarima
                    });

                if (!string.IsNullOrEmpty(reciboEncontrado))
                {
                    return reciboEncontrado;
                }
            }

            return recibo;
        }
        catch
        {
            return recibo;
        }
    }
}