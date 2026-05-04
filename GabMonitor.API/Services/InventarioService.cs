// GabMonitor.API/Services/InventarioService.cs
// =============================================================================
// VERSIÓN CONSOLIDADA - Combina correcciones críticas de ambas versiones
// =============================================================================
// FIX #1: ParsearFechaCad filtra fechas centinela (año < 1900, "0001-01-01", etc.)
// FIX #2: ObtenerInventarioTeoricoAsync usa corte.Fecha en lugar de DateTime.Today
// D-02:  FormatearFechaCorta() → "dd/MM/yyyy" en lugar de ToShortDateString()
// D-04:  ParsearFechaYYYYMMDD() → DateTime.ParseExact para fechacad PTP
// D-05:  Manejo seguro de FECHA_CAD como DateTime O string desde SQL Server (PTC)
// D-06:  Manejo seguro de fechacad como DateTime O string desde SQL Server (PTP)
// D-08:  Trim consistente de cveProd al almacenar
// D-09:  Trim consistente de nombreProd para comparación de cambio de producto
// =============================================================================

using GabMonitor.API.Models.Domain;
using GabMonitor.API.Repositories.Interfaces;
using GabMonitor.API.Services.Interfaces;

namespace GabMonitor.API.Services;

/// <summary>
/// Servicio de inventario consolidado PTC + PTP.
/// Replica la lógica del sistema WinForms original con mejoras de robustez.
/// </summary>
public class InventarioService : IInventarioService
{
    private readonly IInventarioRepository _repo;
    private readonly ICalculoService _calc;

    public InventarioService(IInventarioRepository repo, ICalculoService calc)
    {
        _repo = repo;
        _calc = calc;
    }

    public async Task<(List<ItemInventario> Items, MetricasInventario Metricas)>
        GenerarInventarioConsolidadoAsync()
    {
        var resultado = new List<ItemInventario>();
        var metricas = new MetricasInventario();

        // ── Cargar datos de apoyo en paralelo ─────────────────────────────────
        var corteTask = _repo.ObtenerCorteInventarioAsync();
        var pesosTask = _repo.ObtenerPesosProductosAsync();
        var semanasTask = _repo.ObtenerSemanasAsync(DateTime.Today.Year);

        await Task.WhenAll(corteTask, pesosTask, semanasTask);

        var corte = corteTask.Result;
        var pesosCat = pesosTask.Result.ToList();
        var semanas = semanasTask.Result.ToList();

        metricas.CorteInventario = corte.Info;

        // ── Cargar datos transaccionales ──────────────────────────────────────
        var embarques = (await _repo.ObtenerEmbarquesDesdeCorteAsync(corte.Fecha)).ToList();
        var splits = (await _repo.ObtenerSplitActivosAsync()).ToList();
        var ptcDia = (await _repo.ObtenerPtcDelDiaAsync(DateTime.Today)).ToList();
        var ptpDia = (await _repo.ObtenerPtpDelDiaAsync(DateTime.Today)).ToList();

        // FIX #2: Usar corte.Fecha — tb_mstr_inventario_fisico tiene entradas por fecha de corte,
        // NO por fecha actual. Si el corte fue ayer y consultamos con DateTime.Today,
        // obtenemos 0 registros y las métricas se rompen.
        var teorico = (await _repo.ObtenerInventarioTeoricoAsync(corte.Fecha)).ToList();

        var presplit = (await _repo.ObtenerPresplitDelDiaAsync(DateTime.Today)).ToList();
        var trazPTC = (await _repo.ObtenerTrazabilidadPTCAsync()).ToList();
        var etiqFinal = (await _repo.ObtenerEtiquetasFinalesPTPAsync()).ToList();

        int totalUbicado = 0, totalTarimas = 0;
        int totg = 0;

        // ── Procesar bloques PTC y PTP ─────────────────────────────────────────
        ProcesarBloquePTC(trazPTC, embarques, splits, ptcDia, teorico, presplit,
            semanas, resultado, ref totalUbicado, ref totalTarimas, ref totg);

        ProcesarBloquePTP(etiqFinal, embarques, splits, ptpDia, teorico, presplit,
            semanas, pesosCat, resultado, ref totalUbicado, ref totalTarimas, ref totg);

        // ── Agregar fila de total general ─────────────────────────────────────
        resultado.Add(new ItemInventario
        {
            Nombre = "TOTAL GENERAL",
            FecCad = "TOTAL GENERAL",
            Cantidad = totg,
            Conse = 4,
            Prod = "ZZZZZZZZZ",
            FechaCad = "99999999"
        });

        // ── Ordenar resultado final ───────────────────────────────────────────
        resultado = resultado
            .OrderBy(i => i.Prod)
            .ThenBy(i => i.Conse)
            .ThenBy(i => i.FechaCad)
            .ToList();

        CalcularMetricas(resultado, metricas, totalUbicado, totalTarimas);

        return (resultado, metricas);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PROCESAMIENTO PTC (Producto Terminado Congelado)
    // ════════════════════════════════════════════════════════════════════════

    private void ProcesarBloquePTC(
        List<dynamic> datos, List<dynamic> embarques, List<dynamic> splits,
        List<dynamic> ptcDia, List<dynamic> teorico, List<dynamic> presplit,
        List<SemanaLaboral> semanas, List<ItemInventario> resultado,
        ref int totalUbicado, ref int totalTarimas, ref int totg)
    {
        string mnom = "", nprod = "";
        int totp = 0;
        bool primero = true;

        foreach (dynamic row in datos)
        {
            // D-08/D-09: Trim consistente para nombre y clave del producto
            string nombreProd = ObtenerStringSeguro(row.PROD_NOMBRE).Trim();
            string cveProd = ObtenerStringSeguro(row.PROD_CLAVE).Trim();
            string ubicacion = ObtenerStringSeguro(row.UBICACION).Trim();

            // RN-006: Conteo de ubicaciones (excluir productos específicos)
            if (_calc.EsProductoExcluido(nombreProd, ubicacion))
            {
                // Excluido del conteo de tarimas/ubicaciones
            }
            else
            {
                totalTarimas++;
                if (ubicacion.Length > 0) totalUbicado++;
            }

            // Cambio de producto: agregar header y total del anterior
            if (primero)
            {
                mnom = nombreProd;
                nprod = cveProd;
                resultado.Add(CrearFilaHeader(mnom, nprod));
                primero = false;
            }
            else if (mnom != nombreProd)
            {
                AgregarFilaTotalPTC(resultado, mnom, nprod, teorico, embarques, splits, ptcDia, totp);
                mnom = nombreProd;
                nprod = cveProd;
                totp = 0;
                resultado.Add(CrearFilaHeader(mnom, nprod));
            }

            // Calcular disponibles
            int etiqueta = Convert.ToInt32(row.ETIQUETA ?? 0);
            int surtido = Convert.ToInt32(row.SURTIDO ?? 0);
            int disponibles = etiqueta - surtido;
            if (disponibles <= 0) continue;

            // D-05: Calcular fecha de caducidad y días (manejo seguro de tipos)
            DateTime fechaCad;
            int dias;
            string fechaCadStr;
            CalcularFechaDiasPTC(row, nombreProd, out fechaCad, out dias, out fechaCadStr);

            string tarima = ObtenerStringSeguro(row.TARIMA).Trim();
            string recibo = ObtenerStringSeguro(row.RECIBO).Trim();

            // Para sorting: usar fecha explícita si existe, si no la calculada
            string fechaCadSort = ObtenerFechaCadSort(row.FECHA_CAD, fechaCad);

            resultado.Add(new ItemInventario
            {
                Nombre = $"{recibo}-{tarima}",
                FechaElaboracion = ObtenerStringSeguro(row.PTI_FECHA?.ToString()),
                Lote = ObtenerStringSeguro(row.LOTE),
                FecCad = fechaCadStr,
                Dias = dias,
                Existencia = etiqueta,
                Cantidad = disponibles,
                Conse = 2,
                Prod = nombreProd,
                CvePro = cveProd,
                Tipo = "PTC",
                FechaCad = fechaCadSort,
                Ubicacion = ubicacion,
                Tarima = tarima,
                Presplit = ObtenerPresplit(presplit, recibo, cveProd, tarima),
                PesoEstimado = CalcularPesoEstimadoPTC(row, disponibles, cveProd),
                PreAutorizado = ObtenerStringSeguro(row.preautorizado?.ToString()).Trim()
            });

            totp += disponibles;
            totg += disponibles;
        }

        // Agregar total del último producto
        if (!string.IsNullOrEmpty(mnom))
            AgregarFilaTotalPTC(resultado, mnom, nprod, teorico, embarques, splits, ptcDia, totp);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PROCESAMIENTO PTP (Producto Terminado Precocido)
    // ════════════════════════════════════════════════════════════════════════

    private void ProcesarBloquePTP(
        List<dynamic> datos, List<dynamic> embarques, List<dynamic> splits,
        List<dynamic> ptpDia, List<dynamic> teorico, List<dynamic> presplit,
        List<SemanaLaboral> semanas, List<dynamic> pesosCat,
        List<ItemInventario> resultado,
        ref int totalUbicado, ref int totalTarimas, ref int totg)
    {
        string mnom = "", nprod = "";
        int totp = 0;
        bool primero = true;

        foreach (dynamic row in datos)
        {
            // D-08/D-09: Trim consistente
            string nombreProd = ObtenerStringSeguro(row.PROD_NOMBRE).Trim();
            string cveProd = ObtenerStringSeguro(row.CVE_PROD).Trim();
            string ubicacion = ObtenerStringSeguro(row.UBICACION).Trim();

            if (!_calc.EsProductoExcluido(nombreProd, ubicacion))
            {
                totalTarimas++;
                if (ubicacion.Length > 0) totalUbicado++;
            }

            if (primero)
            {
                mnom = nombreProd;
                nprod = cveProd;
                resultado.Add(CrearFilaHeader(mnom, nprod));
                primero = false;
            }
            else if (mnom != nombreProd)
            {
                AgregarFilaTotalPTP(resultado, mnom, nprod, teorico, embarques, splits, ptpDia, totp);
                mnom = nombreProd;
                nprod = cveProd;
                totp = 0;
                resultado.Add(CrearFilaHeader(mnom, nprod));
            }

            int numCajas = Convert.ToInt32(row.NUM_CAJAS ?? 0);
            int cajasSur = Convert.ToInt32(row.CAJAS_SUR ?? 0);
            int disponibles = numCajas - cajasSur;
            if (disponibles <= 0) continue;

            // D-06: Calcular fecha de caducidad y días (manejo seguro de tipos)
            DateTime fechaCad;
            int dias;
            string fechaCadStr;
            CalcularFechaDiasPTP(row, nombreProd, out fechaCad, out dias, out fechaCadStr);

            string tarima = ObtenerStringSeguro(row.TARIMA).Trim();
            string folio = ObtenerStringSeguro(row.FOLIO?.ToString()).Trim();

            // Obtener peso del catálogo
            decimal pesoCatalogo = 0;
            var pp = pesosCat.FirstOrDefault(p =>
                ObtenerStringSeguro(p.prod_clave).Trim() == cveProd);
            if (pp != null)
                pesoCatalogo = Convert.ToDecimal(pp.env_peso ?? 0);

            // Calcular lote basado en fecha de elaboración
            DateTime fechaElab = Convert.ToDateTime((object)(row.FECHA ?? DateTime.Today));
            string lote = _calc.ObtenerLotePorFecha(fechaElab, semanas);

            resultado.Add(new ItemInventario
            {
                Nombre = $"{folio}-{tarima}",
                FechaElaboracion = ObtenerStringSeguro(row.FECHA?.ToString()),
                Lote = lote,
                FecCad = fechaCadStr,
                Dias = dias,
                Existencia = numCajas,
                Cantidad = disponibles,
                Conse = 2,
                Prod = nombreProd,
                CvePro = cveProd,
                Tipo = "PTP",
                FechaCad = fechaCad.ToString("yyyyMMdd"),
                Ubicacion = ubicacion,
                Tarima = tarima,
                Presplit = ObtenerPresplit(presplit, folio, cveProd, tarima),
                PesoEstimado = CalcularPesoEstimadoPTP(row, disponibles, cveProd, pesoCatalogo),
                PreAutorizado = ObtenerStringSeguro(row.preautorizado?.ToString()).Trim()
            });

            totp += disponibles;
            totg += disponibles;
        }

        if (!string.IsNullOrEmpty(mnom))
            AgregarFilaTotalPTP(resultado, mnom, nprod, teorico, embarques, splits, ptpDia, totp);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CÁLCULO DE FECHAS Y DÍAS
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// D-05: Calcula fecha de caducidad y días para PTC.
    /// Maneja FECHA_CAD como DateTime (columna DATE) o string (columna VARCHAR/CHAR).
    /// Cuando no hay fecha, SQL Server puede devolver espacios en blanco en columnas CHAR(N).
    /// </summary>
    private void CalcularFechaDiasPTC(
        dynamic row, string nombreProd,
        out DateTime fechaCad, out int dias, out string fechaCadStr)
    {
        object? fechaCadObj = row.FECHA_CAD;

        // FIX #1: Parsear fecha de forma segura, filtrando centinelas
        DateTime? dtParsed = ParsearFechaCad(fechaCadObj);

        if (dtParsed.HasValue)
        {
            fechaCad = dtParsed.Value;
            dias = _calc.CalcularDiasHastaCaducidad(fechaCad);
            fechaCadStr = FormatearFechaCorta(fechaCad);
            return;
        }

        // Sin fecha explícita válida → calcular por tipo de producto (RN-001)
        DateTime fechaBase = Convert.ToDateTime((object)(row.PTI_FECHA ?? DateTime.Today));
        fechaCad = _calc.CalcularFechaCaducidadImplicita(nombreProd, fechaBase);
        dias = _calc.CalcularDiasHastaCaducidad(fechaCad);
        fechaCadStr = FormatearFechaCorta(fechaCad);
    }

    /// <summary>
    /// D-06: Calcula fecha de caducidad y días para PTP.
    /// Prioridad: 1) fechacad explícita, 2) NUM_LOTE, 3) implícita por tipo de producto
    /// </summary>
    private void CalcularFechaDiasPTP(
        dynamic row, string nombreProd,
        out DateTime fechaCad, out int dias, out string fechaCadStr)
    {
        string numLote = ObtenerStringSeguro(row.NUM_LOTE).Trim();
        object? fechaCadObj = row.fechacad;

        // Prioridad 1: fechacad explícita
        if (fechaCadObj != null)
        {
            DateTime? dtPTP = null;

            if (fechaCadObj is DateTime dtDirect)
            {
                // Es DateTime directo (columna DATE en BD)
                dtPTP = dtDirect;
            }
            else
            {
                // D-04: Es string en formato YYYYMMDD - usar ParseExact
                string fechaCadStr8 = fechaCadObj.ToString()?.Trim() ?? "";
                dtPTP = ParsearFechaYYYYMMDD(fechaCadStr8);
            }

            if (dtPTP.HasValue)
            {
                fechaCad = dtPTP.Value;
                dias = _calc.CalcularDiasHastaCaducidad(fechaCad);
                fechaCadStr = FormatearFechaCorta(fechaCad);
                return;
            }
        }

        // Prioridad 2: parsear del NUM_LOTE (RN-009)
        if (!string.IsNullOrEmpty(numLote))
        {
            var dtLote = _calc.ParsearFechaDeLotePTP(numLote, numLote.Length);
            if (dtLote.HasValue)
            {
                fechaCad = dtLote.Value;
                dias = _calc.CalcularDiasHastaCaducidad(fechaCad);
                fechaCadStr = FormatearFechaCorta(fechaCad);
                return;
            }
        }

        // Prioridad 3: implícita por tipo de producto (RN-001)
        DateTime fechaBase = Convert.ToDateTime((object)(row.FECHA ?? DateTime.Today));
        fechaCad = _calc.CalcularFechaCaducidadImplicita(nombreProd, fechaBase);
        dias = _calc.CalcularDiasHastaCaducidad(fechaCad);
        fechaCadStr = FormatearFechaCorta(fechaCad);
    }

    // ════════════════════════════════════════════════════════════════════════
    // HELPERS DE FECHAS (FIX #1, D-02, D-04)
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// FIX #1: Parsea FECHA_CAD de forma segura.
    /// Trata como "sin fecha": null, DBNull, string vacío/espacios, fechas centinela.
    /// </summary>
    internal static DateTime? ParsearFechaCad(object? obj)
    {
        if (obj == null || obj is DBNull) return null;

        // Dapper puede devolver DateTime directamente si la columna es DATE/DATETIME
        if (obj is DateTime dtDirect)
            return dtDirect.Year < 1900 ? null : dtDirect;

        // Para columnas CHAR/VARCHAR: extraer string y limpiar espacios
        string s = obj.ToString()?.Trim() ?? "";
        if (string.IsNullOrEmpty(s)) return null;

        if (DateTime.TryParse(s, out DateTime r))
            return r.Year < 1900 ? null : r;   // filtrar centinelas como "0001-01-01"

        return null;
    }

    /// <summary>
    /// D-04: Parsea fecha en formato YYYYMMDD usando ParseExact.
    /// </summary>
    internal static DateTime? ParsearFechaYYYYMMDD(string fechaStr)
    {
        if (string.IsNullOrWhiteSpace(fechaStr) || fechaStr.Length != 8)
            return null;

        if (DateTime.TryParseExact(fechaStr, "yyyyMMdd",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None, out DateTime resultado))
        {
            return resultado;
        }

        return null;
    }

    /// <summary>
    /// D-02: Formatea fecha en formato corto dd/MM/yyyy.
    /// </summary>
    internal static string FormatearFechaCorta(DateTime fecha)
    {
        return fecha.ToString("dd/MM/yyyy");
    }

    /// <summary>
    /// Obtiene el valor de FechaCad para sorting en formato yyyyMMdd.
    /// Si FECHA_CAD es null/vacío, usa la fecha calculada.
    /// </summary>
    private static string ObtenerFechaCadSort(object? fechaCadObj, DateTime fechaCadCalculada)
    {
        var dt = ParsearFechaCad(fechaCadObj);
        return dt.HasValue
            ? dt.Value.ToString("yyyyMMdd")
            : fechaCadCalculada.ToString("yyyyMMdd");
    }

    // ════════════════════════════════════════════════════════════════════════
    // HELPERS GENERALES
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// D-08/D-09: Extrae string de manera segura desde dynamic/object.
    /// Maneja null, DBNull, string, DateTime y otros tipos.
    /// </summary>
    private static string ObtenerStringSeguro(object? valor)
    {
        if (valor == null || valor is DBNull) return "";
        if (valor is string s) return s;
        return valor.ToString() ?? "";
    }

    private static ItemInventario CrearFilaHeader(string nombre, string cvePro) =>
        new ItemInventario
        {
            Nombre = nombre,
            FecCad = "",
            Conse = 1,
            Prod = nombre,
            CvePro = cvePro,
            FechaCad = "00000000"
        };

    private string CalcularPesoEstimadoPTC(dynamic row, int disponibles, string cveProd)
    {
        try
        {
            decimal kilos = _calc.CalcularPesoPTC(
                Convert.ToDecimal(row.rptd_peso_bruto ?? 0),
                Convert.ToDecimal(row.rptd_tara ?? 0),
                Math.Max(1, Convert.ToInt32(row.rptd_cantidad ?? 1)),
                disponibles, cveProd,
                Convert.ToDateTime((object)(row.RPT_FECHA ?? DateTime.Today)));
            return FormatearPeso(kilos);
        }
        catch { return "0.00"; }
    }

    private string CalcularPesoEstimadoPTP(dynamic row, int disponibles, string cveProd, decimal pesoCatalogo)
    {
        try
        {
            decimal kilos = _calc.CalcularPesoPTP(
                Convert.ToDecimal(row.PROD_PESO_VAR ?? 0),
                Convert.ToDecimal(row.ENV_PESO ?? 0),
                Convert.ToDecimal(row.HRP_PESO_NETO ?? 0),
                Math.Max(1m, Convert.ToDecimal(row.HRP_NUM_UNIDADES ?? 1)),
                disponibles, cveProd,
                Convert.ToDateTime((object)(row.hrp_fecha ?? DateTime.Today)),
                pesoCatalogo);
            return FormatearPeso(kilos);
        }
        catch { return "0.00"; }
    }

    private static string FormatearPeso(decimal kilos)
    {
        string s = kilos.ToString("F2");
        return s.Contains('.') ? s : s + ".00";
    }

    private static int ObtenerPresplit(
        List<dynamic> presplit, string recibo, string prod, string tarima)
    {
        return presplit
            .Where(p =>
                ObtenerStringSeguro(p.Eti_Recibo).Trim() == recibo.Trim() &&
                ObtenerStringSeguro(p.Eti_Producto).Trim() == prod.Trim() &&
                ObtenerStringSeguro(p.Eti_TarIni).Trim() == tarima.Trim())
            .Sum(p => Convert.ToInt32(p.CAJAS ?? 0));
    }

    // ════════════════════════════════════════════════════════════════════════
    // TOTALES Y MÉTRICAS
    // ════════════════════════════════════════════════════════════════════════

    private void AgregarFilaTotalPTC(
        List<ItemInventario> resultado, string mnom, string nprod,
        List<dynamic> teorico, List<dynamic> embarques,
        List<dynamic> splits, List<dynamic> ptcDia, int totp)
    {
        var (teo, fisi) = ObtenerTeoricoFisico(teorico, nprod);
        int surti = ObtenerSurtido(embarques, splits, nprod);
        int tott = ptcDia
            .Where(r => ObtenerStringSeguro(r.PROD_CLAVE).Trim() == nprod.Trim())
            .Sum(r => Convert.ToInt32(r.CAJAS ?? 0));

        resultado.Add(new ItemInventario
        {
            Nombre = $"TOTAL {mnom}",
            FecCad = $"TOTAL {nprod} {mnom}",
            Dias = teo + tott - surti,
            Existencia = fisi + tott - surti,
            Cantidad = totp,
            Conse = 3,
            Prod = mnom,
            CvePro = nprod,
            FechaCad = "99991231"
        });
    }

    private void AgregarFilaTotalPTP(
        List<ItemInventario> resultado, string mnom, string nprod,
        List<dynamic> teorico, List<dynamic> embarques,
        List<dynamic> splits, List<dynamic> ptpDia, int totp)
    {
        var (teo, fisi) = ObtenerTeoricoFisico(teorico, nprod);
        int surti = ObtenerSurtido(embarques, splits, nprod);
        int tott = ptpDia
            .Where(r => ObtenerStringSeguro(r.CVE_PROD).Trim() == nprod.Trim())
            .Sum(r => Convert.ToInt32(r.CAJAS ?? 0));

        resultado.Add(new ItemInventario
        {
            Nombre = $"TOTAL {mnom}",
            FecCad = $"TOTAL {nprod} {mnom}",
            Dias = teo + tott - surti,
            Existencia = fisi + tott - surti,
            Cantidad = totp,
            Conse = 3,
            Prod = mnom,
            CvePro = nprod,
            FechaCad = "99991231"
        });
    }

    private static (int Teorico, int Fisico) ObtenerTeoricoFisico(
        List<dynamic> teorico, string cveProd)
    {
        var row = teorico.FirstOrDefault(r =>
            ObtenerStringSeguro(r.PROD_CLAVE).Trim() == cveProd.Trim());
        if (row == null) return (0, 0);
        return (Convert.ToInt32(row.INV_TEORICO ?? 0),
                Convert.ToInt32(row.INV_FISICO ?? 0));
    }

    private static int ObtenerSurtido(
        List<dynamic> embarques, List<dynamic> splits, string cveProd)
    {
        int de = embarques
            .Where(r => ObtenerStringSeguro(r.PROD_CLAVE).Trim() == cveProd.Trim())
            .Sum(r => Convert.ToInt32(r.CAJAS ?? 0));
        int ds = splits
            .Where(r => ObtenerStringSeguro(r.PROD_CLAVE).Trim() == cveProd.Trim())
            .Sum(r => Convert.ToInt32(r.CAJAS ?? 0));
        return de + ds;
    }

    /// <summary>
    /// RN-007: Calcula métricas de confiabilidad del inventario.
    /// </summary>
    private static void CalcularMetricas(
        List<ItemInventario> items, MetricasInventario metricas,
        int totalUbicado, int totalTarimas)
    {
        var totales = items.Where(i =>
            i.FechaCad == "99991231" &&
            i.Conse == 3 &&
            !i.Prod.Contains("PROCESO") &&
            !i.Prod.Contains("CANASTILLA")).ToList();

        foreach (var t in totales)
        {
            metricas.TotalProductos++;
            if (t.Dias == t.Cantidad) metricas.ProductosConTeoricoOk++;
            if (t.Existencia == t.Cantidad) metricas.ProductosConFisicoOk++;
            if (t.Dias == t.Existencia) metricas.TeoVsFisicoCoincide++;
        }

        metricas.TarimasUbicadas = totalUbicado;
        metricas.TotalTarimas = totalTarimas;
    }
}