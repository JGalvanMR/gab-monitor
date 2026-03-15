// GabMonitor.API/Services/InventarioService.cs
using GabMonitor.API.Models.Domain;
using GabMonitor.API.Repositories.Interfaces;
using GabMonitor.API.Services.Interfaces;

namespace GabMonitor.API.Services;

/// <summary>
/// Replica completa del método Genera() de Form1.cs del sistema WinForms original.
/// Consolida PTC + PTP con todas las reglas de negocio identificadas.
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

    /// <summary>
    /// Genera el inventario consolidado completo.
    /// Es la réplica exacta de Form1.Genera() del sistema WinForms.
    /// </summary>
    public async Task<(List<ItemInventario> Items, MetricasInventario Metricas)>
        GenerarInventarioConsolidadoAsync()
    {
        var resultado = new List<ItemInventario>();
        var metricas  = new MetricasInventario();

        // ── Cargar datos de apoyo ──────────────────────────────────────────────
        var corteTask   = _repo.ObtenerCorteInventarioAsync();
        var pesosTask   = _repo.ObtenerPesosProductosAsync();
        var semanasTask = _repo.ObtenerSemanasAsync(DateTime.Today.Year);

        await Task.WhenAll(corteTask, pesosTask, semanasTask);

        var corte    = corteTask.Result;
        var pesosCat = pesosTask.Result.ToList();
        var semanas  = semanasTask.Result.ToList();

        metricas.CorteInventario = corte.Info;

        // ── Cargar datos transaccionales ──────────────────────────────────────
        var embarques = (await _repo.ObtenerEmbarquesDesdeCorteAsync(corte.Fecha)).ToList();
        var splits    = (await _repo.ObtenerSplitActivosAsync()).ToList();
        var ptcDia    = (await _repo.ObtenerPtcDelDiaAsync(DateTime.Today)).ToList();
        var ptpDia    = (await _repo.ObtenerPtpDelDiaAsync(DateTime.Today)).ToList();
        var teorico   = (await _repo.ObtenerInventarioTeoricoAsync(DateTime.Today)).ToList();
        var presplit  = (await _repo.ObtenerPresplitDelDiaAsync(DateTime.Today)).ToList();
        var trazPTC   = (await _repo.ObtenerTrazabilidadPTCAsync()).ToList();
        var etiqFinal = (await _repo.ObtenerEtiquetasFinalesPTPAsync()).ToList();

        // ── Contadores de ubicaciones (RN-006) ────────────────────────────────
        int totalUbicado = 0, totalTarimas = 0;
        int totg = 0;

        ProcesarBloquePTC(trazPTC, embarques, splits, ptcDia, teorico, presplit,
            semanas, resultado, ref totalUbicado, ref totalTarimas, ref totg);

        ProcesarBloquePTP(etiqFinal, embarques, splits, ptpDia, teorico, presplit,
            semanas, pesosCat, resultado, ref totalUbicado, ref totalTarimas, ref totg);

        // Total General (Conse=4)
        resultado.Add(new ItemInventario
        {
            Nombre   = "TOTAL GENERAL",
            FecCad   = "TOTAL GENERAL",
            Cantidad = totg,
            Conse    = 4,
            Prod     = "ZZZZZZZZZ",
            FechaCad = "99999999"
        });

        // Ordenar: replica DefaultView.Sort = "Prod, Conse, FechaCad ASC"
        resultado = resultado
            .OrderBy(i => i.Prod)
            .ThenBy(i => i.Conse)
            .ThenBy(i => i.FechaCad)
            .ToList();

        CalcularMetricas(resultado, metricas, totalUbicado, totalTarimas);

        return (resultado, metricas);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROCESAMIENTO PTC
    // ─────────────────────────────────────────────────────────────────────────

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
            string nombreProd = (string)(row.PROD_NOMBRE ?? "");
            string cveProd    = (string)(row.PROD_CLAVE  ?? "");
            string ubicacion  = ((string)(row.UBICACION  ?? "")).Trim();

            if (_calc.EsProductoExcluido(nombreProd, ubicacion)) { /* excluido */ }
            else
            {
                totalTarimas++;
                if (ubicacion.Length > 0) totalUbicado++;
            }

            if (primero)
            {
                mnom = nombreProd; nprod = cveProd;
                resultado.Add(CrearFilaHeader(mnom, nprod));
                primero = false;
            }
            else if (mnom != nombreProd)
            {
                AgregarFilaTotalPTC(resultado, mnom, nprod, teorico, embarques, splits, ptcDia, totp);
                mnom = nombreProd; nprod = cveProd; totp = 0;
                resultado.Add(CrearFilaHeader(mnom, nprod));
            }

            int etiqueta    = Convert.ToInt32(row.ETIQUETA ?? 0);
            int surtido     = Convert.ToInt32(row.SURTIDO  ?? 0);
            int disponibles = etiqueta - surtido;
            if (disponibles <= 0) continue;

            // ── Fecha caducidad y días (sin desestructuración de dynamic) ─────
            DateTime fechaCad;
            int      dias;
            string   fechaCadStr;
            CalcularFechaDiasPTC(row, nombreProd, out fechaCad, out dias, out fechaCadStr);

			string tarima = (row.TARIMA?.ToString() ?? "").Trim();
            string recibo = (string)(row.RECIBO     ?? "");
            int presplitCajas = ObtenerPresplit(presplit, recibo, cveProd, tarima);
            string pesoStr = CalcularPesoEstimadoPTC(row, disponibles, cveProd);

            string fechaCadSort = !string.IsNullOrWhiteSpace((string)(row.FECHA_CAD ?? ""))
                ? Convert.ToDateTime((object)row.FECHA_CAD).ToString("yyyyMMdd")
                : fechaCad.ToString("yyyyMMdd");

            resultado.Add(new ItemInventario
            {
                Nombre           = $"{recibo}-{tarima}",
                FechaElaboracion = (string)(row.PTI_FECHA?.ToString() ?? ""),
                Lote             = (string)(row.LOTE ?? ""),
                FecCad           = fechaCadStr,
                Dias             = dias,
                Existencia       = etiqueta,
                Cantidad         = disponibles,
                Conse            = 2,
                Prod             = nombreProd,
                CvePro           = cveProd,
                Tipo             = "PTC",
                FechaCad         = fechaCadSort,
                Ubicacion        = ubicacion,
                Tarima           = tarima,
                Presplit         = presplitCajas,
                PesoEstimado     = pesoStr,
                PreAutorizado = (row.preautorizado?.ToString() ?? "").Trim()
            });

            totp += disponibles;
            totg += disponibles;
        }

        if (!string.IsNullOrEmpty(mnom))
            AgregarFilaTotalPTC(resultado, mnom, nprod, teorico, embarques, splits, ptcDia, totp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROCESAMIENTO PTP
    // ─────────────────────────────────────────────────────────────────────────

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
            string nombreProd = (string)(row.PROD_NOMBRE ?? "");
            string cveProd    = (string)(row.CVE_PROD    ?? "");
            string ubicacion  = ((string)(row.UBICACION  ?? "")).Trim();

            if (!_calc.EsProductoExcluido(nombreProd, ubicacion))
            {
                totalTarimas++;
                if (ubicacion.Length > 0) totalUbicado++;
            }

            if (primero)
            {
                mnom = nombreProd; nprod = cveProd;
                resultado.Add(CrearFilaHeader(mnom, nprod));
                primero = false;
            }
            else if (mnom != nombreProd)
            {
                AgregarFilaTotalPTP(resultado, mnom, nprod, teorico, embarques, splits, ptpDia, totp);
                mnom = nombreProd; nprod = cveProd; totp = 0;
                resultado.Add(CrearFilaHeader(mnom, nprod));
            }

            int numCajas    = Convert.ToInt32(row.NUM_CAJAS  ?? 0);
            int cajasSur    = Convert.ToInt32(row.CAJAS_SUR  ?? 0);
            int disponibles = numCajas - cajasSur;
            if (disponibles <= 0) continue;

            // ── Fecha caducidad y días (sin desestructuración de dynamic) ─────
            DateTime fechaCad;
            int      dias;
            string   fechaCadStr;
            CalcularFechaDiasPTP(row, nombreProd, out fechaCad, out dias, out fechaCadStr);

			string tarima = (row.TARIMA?.ToString() ?? "").Trim();
			string folio = (row.FOLIO?.ToString() ?? "");
            int presplitCajas = ObtenerPresplit(presplit, folio, cveProd, tarima);

            decimal pesoCatalogo = 0;
            var pp = pesosCat.FirstOrDefault(p =>
                (string)(p.prod_clave ?? "") == cveProd);
            if (pp != null)
                pesoCatalogo = Convert.ToDecimal(pp.env_peso ?? 0);

            string pesoStr = CalcularPesoEstimadoPTP(row, disponibles, cveProd, pesoCatalogo);

            DateTime fechaElab = Convert.ToDateTime((object)(row.FECHA ?? DateTime.Today));
            string lote = _calc.ObtenerLotePorFecha(fechaElab, semanas);

            resultado.Add(new ItemInventario
            {
                Nombre           = $"{folio}-{tarima}",
                FechaElaboracion = (string)(row.FECHA?.ToString() ?? ""),
                Lote             = lote,
                FecCad           = fechaCadStr,
                Dias             = dias,
                Existencia       = numCajas,
                Cantidad         = disponibles,
                Conse            = 2,
                Prod             = nombreProd,
                CvePro           = cveProd,
                Tipo             = "PTP",
                FechaCad         = fechaCad.ToString("yyyyMMdd"),
                Ubicacion        = ubicacion,
                Tarima           = tarima,
                Presplit         = presplitCajas,
                PesoEstimado     = pesoStr,
                PreAutorizado = (row.preautorizado?.ToString() ?? "").Trim()
            });

            totp += disponibles;
            totg += disponibles;
        }

        if (!string.IsNullOrEmpty(mnom))
            AgregarFilaTotalPTP(resultado, mnom, nprod, teorico, embarques, splits, ptpDia, totp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CÁLCULO DE FECHA/DÍAS — usa out params en lugar de tuplas (evita dynamic deconstruct)
    // ─────────────────────────────────────────────────────────────────────────

    private void CalcularFechaDiasPTC(
        dynamic row, string nombreProd,
        out DateTime fechaCad, out int dias, out string fechaCadStr)
    {
        string fechaCadRaw = (string)(row.FECHA_CAD ?? "");

        if (!string.IsNullOrWhiteSpace(fechaCadRaw))
        {
            fechaCad    = Convert.ToDateTime((object)row.FECHA_CAD);
            dias        = _calc.CalcularDiasHastaCaducidad(fechaCad);
            fechaCadStr = fechaCad.ToShortDateString();
            return;
        }

        DateTime fechaBase = Convert.ToDateTime((object)(row.PTI_FECHA ?? DateTime.Today));
        fechaCad    = _calc.CalcularFechaCaducidadImplicita(nombreProd, fechaBase);
        dias        = _calc.CalcularDiasHastaCaducidad(fechaCad);
        fechaCadStr = fechaCad.ToShortDateString();
    }

    private void CalcularFechaDiasPTP(
        dynamic row, string nombreProd,
        out DateTime fechaCad, out int dias, out string fechaCadStr)
    {
        string numLote     = ((string)(row.NUM_LOTE  ?? "")).Trim();
        string fechaCadPTP = ((string)(row.fechacad  ?? "")).Trim();

        // Prioridad 1: fechacad explícita formato YYYYMMDD
        if (!string.IsNullOrEmpty(fechaCadPTP) && fechaCadPTP.Length == 8)
        {
            try
            {
                string mfeca = $"{fechaCadPTP.Substring(6, 2)}/{fechaCadPTP.Substring(4, 2)}/{fechaCadPTP.Substring(0, 4)}";
                fechaCad    = Convert.ToDateTime(mfeca);
                dias        = _calc.CalcularDiasHastaCaducidad(fechaCad);
                fechaCadStr = fechaCad.ToShortDateString();
                return;
            }
            catch { }
        }

        // Prioridad 2: parsear del NUM_LOTE (RN-009)
        if (!string.IsNullOrEmpty(numLote))
        {
            var dtLote = _calc.ParsearFechaDeLotePTP(numLote, numLote.Length);
            if (dtLote.HasValue)
            {
                fechaCad    = dtLote.Value;
                dias        = _calc.CalcularDiasHastaCaducidad(fechaCad);
                fechaCadStr = fechaCad.ToShortDateString();
                return;
            }
        }

        // Prioridad 3: implícita por tipo de producto (RN-001)
        DateTime fechaBase = Convert.ToDateTime((object)(row.FECHA ?? DateTime.Today));
        fechaCad    = _calc.CalcularFechaCaducidadImplicita(nombreProd, fechaBase);
        dias        = _calc.CalcularDiasHastaCaducidad(fechaCad);
        fechaCadStr = fechaCad.ToShortDateString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private static ItemInventario CrearFilaHeader(string nombre, string cvePro) =>
        new ItemInventario
        {
            Nombre   = nombre,
            FecCad   = "",
            Conse    = 1,
            Prod     = nombre,
            CvePro   = cvePro,
            FechaCad = "00000000"
        };

    private string CalcularPesoEstimadoPTC(dynamic row, int disponibles, string cveProd)
    {
        try
        {
            decimal kilos = _calc.CalcularPesoPTC(
                Convert.ToDecimal(row.rptd_peso_bruto ?? 0),
                Convert.ToDecimal(row.rptd_tara       ?? 0),
                Convert.ToInt32(row.rptd_cantidad     ?? 1),
                disponibles, cveProd,
                Convert.ToDateTime((object)(row.RPT_FECHA ?? DateTime.Today)));
            return FormatearPeso(kilos);
        }
        catch { return "0.00"; }
    }

    private string CalcularPesoEstimadoPTP(
        dynamic row, int disponibles, string cveProd, decimal pesoCatalogo)
    {
        try
        {
            decimal kilos = _calc.CalcularPesoPTP(
                Convert.ToDecimal(row.PROD_PESO_VAR   ?? 0),
                Convert.ToDecimal(row.ENV_PESO        ?? 0),
                Convert.ToDecimal(row.HRP_PESO_NETO   ?? 0),
                Convert.ToDecimal(row.HRP_NUM_UNIDADES ?? 1),
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
                ((string)(p.Eti_Recibo  ?? "")).Trim() == recibo.Trim() &&
                ((string)(p.Eti_Producto ?? "")).Trim() == prod.Trim()   &&
                ((string)(p.Eti_TarIni  ?? "")).Trim() == tarima.Trim())
            .Sum(p => Convert.ToInt32(p.CAJAS ?? 0));
    }

    private void AgregarFilaTotalPTC(
        List<ItemInventario> resultado, string mnom, string nprod,
        List<dynamic> teorico, List<dynamic> embarques,
        List<dynamic> splits, List<dynamic> ptcDia, int totp)
    {
        var (teo, fisi) = ObtenerTeoricoFisico(teorico, nprod);
        int surti = ObtenerSurtido(embarques, splits, nprod);
        int tott  = ptcDia
            .Where(r => ((string)(r.PROD_CLAVE ?? "")).Trim() == nprod.Trim())
            .Sum(r => Convert.ToInt32(r.CAJAS ?? 0));

        resultado.Add(new ItemInventario
        {
            Nombre     = $"TOTAL {mnom}",
            FecCad     = $"TOTAL {nprod} {mnom}",
            Dias       = teo + tott - surti,
            Existencia = fisi + tott - surti,
            Cantidad   = totp,
            Conse      = 3,
            Prod       = mnom,
            CvePro     = nprod,
            FechaCad   = "99991231"
        });
    }

    private void AgregarFilaTotalPTP(
        List<ItemInventario> resultado, string mnom, string nprod,
        List<dynamic> teorico, List<dynamic> embarques,
        List<dynamic> splits, List<dynamic> ptpDia, int totp)
    {
        var (teo, fisi) = ObtenerTeoricoFisico(teorico, nprod);
        int surti = ObtenerSurtido(embarques, splits, nprod);
        int tott  = ptpDia
            .Where(r => ((string)(r.CVE_PROD ?? "")).Trim() == nprod.Trim())
            .Sum(r => Convert.ToInt32(r.CAJAS ?? 0));

        resultado.Add(new ItemInventario
        {
            Nombre     = $"TOTAL {mnom}",
            FecCad     = $"TOTAL {nprod} {mnom}",
            Dias       = teo + tott - surti,
            Existencia = fisi + tott - surti,
            Cantidad   = totp,
            Conse      = 3,
            Prod       = mnom,
            CvePro     = nprod,
            FechaCad   = "99991231"
        });
    }

    private static (int Teorico, int Fisico) ObtenerTeoricoFisico(
        List<dynamic> teorico, string cveProd)
    {
        var row = teorico.FirstOrDefault(r =>
            ((string)(r.PROD_CLAVE ?? "")).Trim() == cveProd.Trim());
        if (row == null) return (0, 0);
        return (Convert.ToInt32(row.INV_TEORICO ?? 0),
                Convert.ToInt32(row.INV_FISICO  ?? 0));
    }

    private static int ObtenerSurtido(
        List<dynamic> embarques, List<dynamic> splits, string cveProd)
    {
        int de = embarques
            .Where(r => ((string)(r.PROD_CLAVE ?? "")).Trim() == cveProd.Trim())
            .Sum(r => Convert.ToInt32(r.CAJAS ?? 0));
        int ds = splits
            .Where(r => ((string)(r.PROD_CLAVE ?? "")).Trim() == cveProd.Trim())
            .Sum(r => Convert.ToInt32(r.CAJAS ?? 0));
        return de + ds;
    }

    // ─── RN-007: Métricas de confiabilidad ───────────────────────────────────

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
            if (t.Dias      == t.Cantidad)  metricas.ProductosConTeoricoOk++;
            if (t.Existencia == t.Cantidad)  metricas.ProductosConFisicoOk++;
            if (t.Dias      == t.Existencia) metricas.TeoVsFisicoCoincide++;
        }

        metricas.TarimasUbicadas = totalUbicado;
        metricas.TotalTarimas    = totalTarimas;
    }
}
