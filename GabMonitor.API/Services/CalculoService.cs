// GabMonitor.API/Services/CalculoService.cs
using GabMonitor.API.Models.Domain;
using GabMonitor.API.Services.Interfaces;

namespace GabMonitor.API.Services;

/// <summary>
/// Implementa todas las reglas de negocio de cálculo del sistema original.
/// Replica exactamente las funciones de Form1.cs y sus helpers.
/// </summary>
public class CalculoService : ICalculoService
{
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
    /// lo que hace que el día actual cuente como 1 día de vida.
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

    /// <summary>
    /// Calcula el peso estimado para tarimas PTC.
    /// Fórmula: ((pesoBruto - tara) / cantidad) * cajasPorEntregar + ajuste hielo.
    /// Replica el bloque de cálculo de kilos PTC en Genera().
    /// </summary>
    public decimal CalcularPesoPTC(
        decimal pesoBruto, decimal tara, int cantidad,
        int cajasPorEntregar, string claveProd, DateTime fechaRecepcion)
    {
        decimal kilos = 0;

        if (cantidad > 0)
            kilos = ((pesoBruto - tara) / cantidad) * cajasPorEntregar;

        // Ajuste por hielo: brócoli marino y variedades con hielo (8.5 kg por caja)
        var productosConHielo8_5 = new[] { "02002ML00", "02002BROFR", "02BRCO2025" };
        if (productosConHielo8_5.Contains(claveProd))
        {
            kilos += CalcularPesoHielo(8.5m, fechaRecepcion, DateTime.Now) * cajasPorEntregar;
        }

        // Ajuste por hielo: variedad HEB (4 kg, una sola unidad — no por caja)
        if (claveProd == "02002BRHEB")
        {
            kilos += CalcularPesoHielo(4m, fechaRecepcion, DateTime.Now);
        }

        return Math.Round(kilos, 2);
    }

    // ─── RN-005: Cálculo peso PTP ────────────────────────────────────────────

    /// <summary>
    /// Calcula el peso estimado para tarimas PTP.
    /// Prioridad: PROD_PESO_VAR > ENV_PESO > tabla PesoProd.
    /// Replica el bloque de cálculo de kilos PTP en Genera().
    /// </summary>
    public decimal CalcularPesoPTP(
        decimal prodPesoVar, decimal envPeso, decimal pesoNeto,
        decimal numUnidades, int cajasEntregadas, string claveProd,
        DateTime fechaHistRecep, decimal pesoProdCatalogo = 0)
    {
        decimal mpe;

        // Prioridad 1: PROD_PESO_VAR
        if (prodPesoVar > 0)
            mpe = prodPesoVar * cajasEntregadas;
        else
            mpe = envPeso * cajasEntregadas;

        // Prioridad 2: Catálogo PesoProd (sobreescribe si existe)
        if (pesoProdCatalogo > 0)
            mpe = pesoProdCatalogo; // valor ya calculado externamente

        decimal kilos = 0;
        if (numUnidades > 0)
            kilos = ((pesoNeto / numUnidades) * cajasEntregadas) + (mpe * cajasEntregadas);

        // Ajuste por hielo (mismo que PTC)
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
    /// Busca en tb_cat_semanas donde fecha1 <= fecha <= fecha2.
    /// Retorna: "SS-DDD" truncado a 5 chars. Ej: "14-LU", "07-VI"
    /// </summary>
    public string ObtenerLotePorFecha(DateTime fecha, IEnumerable<SemanaLaboral> semanas)
    {
        var semana = semanas.FirstOrDefault(s =>
            s.Fecha1 <= fecha && s.Fecha2 >= fecha);

        if (semana == null) return "";

        string lote = $"{semana.NumeroSemana}-{fecha.ToString("ddd").ToUpper()}";
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

            // Si estamos en diciembre y el mes del lote es enero → año siguiente
            int anio = DateTime.Now.Year;
            if (DateTime.Now.Month == 12 && mesNum == "01") anio++;

            return new DateTime(anio, int.Parse(mesNum), int.Parse(dia));
        }
        catch { return null; }
    }

    // ─── RN-006: Exclusión de tarimas para conteo de ubicaciones ─────────────

    /// <summary>
    /// Determina si un producto/ubicación debe excluirse del conteo de tarimas ubicadas.
    /// Excluye: ubicación "AGUI", o nombre contiene "CANAS", "PROCESO", "AJO".
    /// </summary>
    public bool EsProductoExcluido(string nombreProducto, string ubicacion)
    {
        string nombre = (nombreProducto ?? "").ToUpper();
        string ubic   = (ubicacion ?? "").Trim();

        return ubic == "AGUI"
            || nombre.Contains("CANAS")
            || nombre.Contains("PROCESO")
            || nombre.Contains("AJO");
    }
}
