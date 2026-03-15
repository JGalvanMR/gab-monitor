// GabMonitor.API/Services/CalculoService.cs
// CORRECCIONES:
//   D-03: ObtenerLotePorFecha — usar CultureInfo("es-MX") explícitamente
//   D-04: ParsearFechaDeLotePTP — usar DateTime.ParseExact para formato YYYYMMDD

using System.Globalization;
using GabMonitor.API.Models.Domain;
using GabMonitor.API.Services.Interfaces;

namespace GabMonitor.API.Services;

/// <summary>
/// Implementa todas las reglas de negocio de cálculo del sistema original.
/// Replica exactamente las funciones de Form1.cs y sus helpers.
/// </summary>
public class CalculoService : ICalculoService
{
    // Cultura del sistema original (Windows con configuración regional de México)
    // Usado para replicar el comportamiento exacto de DateTime.ToString("ddd") del WinForms
    private static readonly CultureInfo CulturaOriginal = new CultureInfo("es-MX");

    // ─── RN-001: Fecha de caducidad implícita por tipo de producto ────────────

    /// <summary>
    /// Calcula la fecha de caducidad cuando no hay fecha explícita en el registro.
    /// Replica la lógica de los bloques "if (Mnom.Contains...)" en Genera().
    /// </summary>
    public DateTime CalcularFechaCaducidadImplicita(string nombreProducto, DateTime fechaElaboracion)
    {
        string nombre = (nombreProducto ?? "").ToUpper();

        if (nombre.Contains("BETABEL"))
            return fechaElaboracion.AddDays(60);

        if (nombre.Contains("AJO"))
            return fechaElaboracion.AddDays(180);

        if (nombre.Contains("ADEREZO") || nombre.Contains("VINAGRETA") || nombre.Contains("QUESO"))
            return fechaElaboracion.AddDays(90);

        // Default: 14 días (aplica a brócoli, vegetales frescos, etc.)
        return fechaElaboracion.AddDays(14);
    }

    // ─── RN-001: Días hasta caducidad ─────────────────────────────────────────

    /// <summary>
    /// Calcula días hasta caducidad.
    /// IMPORTANTE: El sistema original usa DateTime.Now.AddDays(-1) como referencia,
    /// lo que hace que el día actual cuente como 1 día de vida restante.
    /// Replica exactamente: Mdias = Convert.ToDateTime(FECHA_CAD) - DateTime.Now.AddDays(-1)
    /// </summary>
    public int CalcularDiasHastaCaducidad(DateTime fechaCaducidad)
    {
        var diferencia = fechaCaducidad - DateTime.Now.AddDays(-1);
        return diferencia.Days;
    }

    // ─── RN-004: Función pérdida de peso del hielo ───────────────────────────

    /// <summary>
    /// Calcula el peso del hielo considerando su pérdida progresiva por día.
    /// Replica Fn_PesoHielo() del sistema original.
    /// </summary>
    public decimal CalcularPesoHielo(decimal pesoOriginal, DateTime fechaRecepcion, DateTime fechaEmbarque)
    {
        int dias = (fechaEmbarque.Date - fechaRecepcion.Date).Days;

        return dias switch
        {
            0 => pesoOriginal,                       // 100%
            1 => (pesoOriginal * 85m) / 100m,        // 85%
            2 => (pesoOriginal * 75m) / 100m,        // 75%
            3 => (pesoOriginal * 50m) / 100m,        // 50%
            4 => (pesoOriginal * 35m) / 100m,        // 35%
            5 => (pesoOriginal * 20m) / 100m,        // 20%
            6 => (pesoOriginal * 10m) / 100m,        // 10%
            _ => pesoOriginal                        // default: 100% (no cambio)
        };
    }

    // ─── RN-003: Cálculo peso PTC ────────────────────────────────────────────

    public decimal CalcularPesoPTC(
        decimal pesoBruto, decimal tara, int cantidad,
        int cajasPorEntregar, string claveProd, DateTime fechaRecepcion)
    {
        decimal kilos = 0;

        if (cantidad > 0)
            kilos = ((pesoBruto - tara) / cantidad) * cajasPorEntregar;

        var productosConHielo8_5 = new[] { "02002ML00", "02002BROFR", "02BRCO2025" };
        if (productosConHielo8_5.Contains(claveProd))
        {
            kilos += CalcularPesoHielo(8.5m, fechaRecepcion, DateTime.Now) * cajasPorEntregar;
        }

        if (claveProd == "02002BRHEB")
        {
            kilos += CalcularPesoHielo(4m, fechaRecepcion, DateTime.Now);
        }

        return Math.Round(kilos, 2);
    }

    // ─── RN-005: Cálculo peso PTP ────────────────────────────────────────────

    public decimal CalcularPesoPTP(
        decimal prodPesoVar, decimal envPeso, decimal pesoNeto,
        decimal numUnidades, int cajasEntregadas, string claveProd,
        DateTime fechaHistRecep, decimal pesoProdCatalogo = 0)
    {
        decimal mpe;

        if (prodPesoVar > 0)
            mpe = prodPesoVar * cajasEntregadas;
        else
            mpe = envPeso * cajasEntregadas;

        if (pesoProdCatalogo > 0)
            mpe = pesoProdCatalogo;

        decimal kilos = 0;
        if (numUnidades > 0)
            kilos = ((pesoNeto / numUnidades) * cajasEntregadas) + (mpe * cajasEntregadas);

        var productosConHielo8_5 = new[] { "02002ML00", "02002BROFR", "02BRCO2025" };
        if (productosConHielo8_5.Contains(claveProd))
        {
            kilos += CalcularPesoHielo(8.5m, fechaHistRecep, DateTime.Now) * cajasEntregadas;
        }

        if (claveProd == "02002BRHEB")
        {
            kilos += CalcularPesoHielo(4m, fechaHistRecep, DateTime.Now);
        }

        return Math.Round(kilos, 2);
    }

    // ─── RN-008: Conversión fecha → código de semana laboral ─────────────────

    /// <summary>
    /// Convierte una fecha al código de semana laboral del catálogo.
    /// 
    /// CORRECCIÓN D-03: El sistema WinForms original corría con configuración regional
    /// es-MX, por lo que ToString("ddd") producía abreviaturas en español:
    /// LUN, MAR, MIÉ, JUE, VIE, SÁB, DOM.
    /// 
    /// .NET 8 por defecto usa InvariantCulture (inglés): MON, TUE, WED, etc.
    /// Usamos CultureInfo("es-MX") explícitamente para replicar el comportamiento original.
    /// 
    /// Resultado truncado a 5 chars: "14-LU", "07-VI", "14-MI" (miércoles), "14-SÁ" (sábado)
    /// </summary>
    public string ObtenerLotePorFecha(DateTime fecha, IEnumerable<SemanaLaboral> semanas)
    {
        var semana = semanas.FirstOrDefault(s =>
            s.Fecha1 <= fecha && s.Fecha2 >= fecha);

        if (semana == null) return "";

        // D-03 FIX: Usar CultureInfo("es-MX") igual que el WinForms original
        string diaAbrev = fecha.ToString("ddd", CulturaOriginal).ToUpper();
        string lote = $"{semana.NumeroSemana}-{diaAbrev}";
        return lote.Length >= 5 ? lote.Substring(0, 5) : lote;
    }

    // ─── RN-009: Parsear fecha desde código de lote PTP ──────────────────────

    /// <summary>
    /// Extrae la fecha de elaboración del código de lote PTP.
    /// El lote tiene 11 o 12 chars. La fecha está en posición (tamano==12)?7:6
    /// con formato "MMMDD" donde MMM es el mes en español (ENE-DIC).
    /// Si estamos en diciembre y el mes del lote es ENE → año siguiente.
    /// </summary>
    public DateTime? ParsearFechaDeLotePTP(string numLote, int tamanoLote)
    {
        try
        {
            int inicio = tamanoLote == 12 ? 7 : 6;
            if (string.IsNullOrEmpty(numLote) || numLote.Length < inicio + 5)
                return null;

            string fragmento = numLote.Substring(inicio, 5); // "MMMDD"
            string mes3 = fragmento.Substring(0, 3);
            string dia  = fragmento.Substring(3, 2);

            string mesNum = mes3 switch
            {
                "ENE" => "01", "FEB" => "02", "MAR" => "03",
                "ABR" => "04", "MAY" => "05", "JUN" => "06",
                "JUL" => "07", "AGO" => "08", "SEP" => "09",
                "OCT" => "10", "NOV" => "11", "DIC" => "12",
                _     => ""
            };

            if (string.IsNullOrEmpty(mesNum)) return null;

            int anio = DateTime.Now.Year;
            if (DateTime.Now.Month == 12 && mesNum == "01") anio++;

            return new DateTime(anio, int.Parse(mesNum), int.Parse(dia));
        }
        catch { return null; }
    }

    // ─── RN-006: Exclusión de tarimas para conteo de ubicaciones ─────────────

    public bool EsProductoExcluido(string nombreProducto, string ubicacion)
    {
        string nombre = (nombreProducto ?? "").ToUpper();
        string ubic   = (ubicacion ?? "").Trim();

        return ubic == "AGUI"
            || nombre.Contains("CANAS")
            || nombre.Contains("PROCESO")
            || nombre.Contains("AJO");
    }

    // ─── Helpers internos ────────────────────────────────────────────────────

    /// <summary>
    /// Formatea una fecha como cadena corta usando la cultura es-MX del sistema original.
    /// Replica el comportamiento de DateTime.ToShortDateString() en Windows es-MX.
    /// 
    /// CORRECCIÓN D-02: El sistema original mostraba "14/03/2025", no "3/14/2025".
    /// Usando formato explícito "dd/MM/yyyy" para independencia de cultura.
    /// </summary>
    public static string FormatearFechaCorta(DateTime fecha)
    {
        // Usando formato explícito para garantizar "dd/MM/yyyy" sin importar la cultura del hilo
        // Este es el formato que ToShortDateString() devuelve con configuración regional México
        return fecha.ToString("dd/MM/yyyy");
    }

    /// <summary>
    /// Parsea una fecha en formato YYYYMMDD (usado en PTP fechacad).
    /// CORRECCIÓN D-04: Usar ParseExact para evitar dependencia de cultura.
    /// </summary>
    public static DateTime? ParsearFechaYYYYMMDD(string fechaStr)
    {
        if (string.IsNullOrWhiteSpace(fechaStr) || fechaStr.Length != 8)
            return null;

        if (DateTime.TryParseExact(fechaStr, "yyyyMMdd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None, out var dt))
            return dt;

        return null;
    }
}
