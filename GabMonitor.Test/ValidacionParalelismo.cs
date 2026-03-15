// GabMonitor.Tests/ValidacionParalelismo.cs
// Proyecto separado — ejecutar con: dotnet test
// NO va dentro de GabMonitor.API

using GabMonitor.API.Models.Domain;
using GabMonitor.API.Services;
using Xunit;

namespace GabMonitor.Tests;

/// <summary>
/// Tests de validación para garantizar que el sistema web
/// produce resultados idénticos al WinForms original.
/// Ejecutar durante el período de coexistencia (semanas 9-10).
/// </summary>
public class ValidacionParalelismo
{
    // ─── RN-002: Semáforo de colores ─────────────────────────────────────────

    [Fact]
    public void RN002_Semaforo_DiasHasta4_DebeSerRojo()
    {
        var item = new ItemInventario { Conse = 2, Dias = 3, PreAutorizado = "" };
        Assert.Equal("expiry-red", item.ColorClase);
    }

    [Fact]
    public void RN002_Semaforo_Dias5a11_DebeSerNaranja()
    {
        var item = new ItemInventario { Conse = 2, Dias = 8, PreAutorizado = "" };
        Assert.Equal("expiry-orange", item.ColorClase);
    }

    [Fact]
    public void RN002_Semaforo_Dias12a15_DebeSerAmarillo()
    {
        var item = new ItemInventario { Conse = 2, Dias = 13, PreAutorizado = "" };
        Assert.Equal("expiry-yellow", item.ColorClase);
    }

    [Fact]
    public void RN002_Semaforo_Dias16oMas_DebeSerVerde()
    {
        var item = new ItemInventario { Conse = 2, Dias = 20, PreAutorizado = "" };
        Assert.Equal("expiry-green", item.ColorClase);
    }

    [Fact]
    public void RN002_PreAutA_DebeSerVioleta()
    {
        var item = new ItemInventario { Conse = 2, Dias = 3, PreAutorizado = "A" };
        Assert.Equal("preaut-trailer", item.ColorClase);
    }

    [Fact]
    public void RN002_PreAutC_DebeSerAzul()
    {
        var item = new ItemInventario { Conse = 2, Dias = 3, PreAutorizado = "C" };
        Assert.Equal("preaut-camioneta", item.ColorClase);
    }

    [Fact]
    public void RN002_FilaHeader_SinColor()
    {
        // Solo filas de detalle (Conse=2) tienen color
        var item = new ItemInventario { Conse = 1, Dias = 2, PreAutorizado = "" };
        Assert.Equal("", item.ColorClase);
    }

    // ─── RN-001: Fechas de caducidad implícitas ───────────────────────────────

    [Fact]
    public void RN001_Betabel_60Dias()
    {
        var calc = new CalculoService();
        var base_ = new DateTime(2025, 1, 1);
        Assert.Equal(base_.AddDays(60), calc.CalcularFechaCaducidadImplicita("BETABEL COCIDO", base_));
    }

    [Fact]
    public void RN001_Ajo_180Dias()
    {
        var calc = new CalculoService();
        var base_ = new DateTime(2025, 1, 1);
        Assert.Equal(base_.AddDays(180), calc.CalcularFechaCaducidadImplicita("AJO PELADO", base_));
    }

    [Fact]
    public void RN001_Aderezo_90Dias()
    {
        var calc = new CalculoService();
        var base_ = new DateTime(2025, 1, 1);
        Assert.Equal(base_.AddDays(90), calc.CalcularFechaCaducidadImplicita("ADEREZO RANCH", base_));
    }

    [Fact]
    public void RN001_Vinagreta_90Dias()
    {
        var calc = new CalculoService();
        var base_ = new DateTime(2025, 1, 1);
        Assert.Equal(base_.AddDays(90), calc.CalcularFechaCaducidadImplicita("VINAGRETA ITALIANA", base_));
    }

    [Fact]
    public void RN001_Queso_90Dias()
    {
        var calc = new CalculoService();
        var base_ = new DateTime(2025, 1, 1);
        Assert.Equal(base_.AddDays(90), calc.CalcularFechaCaducidadImplicita("QUESO FRESCO", base_));
    }

    [Fact]
    public void RN001_Default_14Dias()
    {
        var calc = new CalculoService();
        var base_ = new DateTime(2025, 1, 1);
        Assert.Equal(base_.AddDays(14), calc.CalcularFechaCaducidadImplicita("BROCOLI FRESCO", base_));
    }

    // ─── RN-004: Pérdida progresiva de peso del hielo ─────────────────────────

    [Theory]
    [InlineData(0, 8.5,  8.50)]   // día 0: 100%
    [InlineData(1, 8.5,  7.225)]  // día 1: 85%
    [InlineData(2, 8.5,  6.375)]  // día 2: 75%
    [InlineData(3, 8.5,  4.25)]   // día 3: 50%
    [InlineData(4, 8.5,  2.975)]  // día 4: 35%
    [InlineData(5, 8.5,  1.70)]   // día 5: 20%
    [InlineData(6, 8.5,  0.85)]   // día 6: 10%
    [InlineData(7, 8.5,  8.50)]   // 7+ días: vuelve al 100% (default)
    public void RN004_PesoHielo_CalculoCorrecto(int diasDiff, double pesoOrig, double pesoEsp)
    {
        var calc     = new CalculoService();
        var fechaRec = DateTime.Today.AddDays(-diasDiff);
        var resultado = calc.CalcularPesoHielo((decimal)pesoOrig, fechaRec, DateTime.Today);
        Assert.Equal((decimal)Math.Round(pesoEsp, 3), Math.Round(resultado, 3));
    }

    // ─── RN-006: Exclusión de tarimas del conteo de ubicación ─────────────────

    [Fact]
    public void RN006_UbicacionAGUI_Excluida()
    {
        var calc = new CalculoService();
        Assert.True(calc.EsProductoExcluido("BROCOLI", "AGUI"));
    }

    [Fact]
    public void RN006_NombreConPROCESO_Excluido()
    {
        var calc = new CalculoService();
        Assert.True(calc.EsProductoExcluido("BROCOLI EN PROCESO", "1101"));
    }

    [Fact]
    public void RN006_NombreConCANAS_Excluido()
    {
        var calc = new CalculoService();
        Assert.True(calc.EsProductoExcluido("CANASTILLA DE VERDURAS", "1201"));
    }

    [Fact]
    public void RN006_NombreConAJO_Excluido()
    {
        var calc = new CalculoService();
        Assert.True(calc.EsProductoExcluido("AJO PELADO", "1401"));
    }

    [Fact]
    public void RN006_ProductoNormal_NoExcluido()
    {
        var calc = new CalculoService();
        Assert.False(calc.EsProductoExcluido("BROCOLI MARINO", "1401"));
    }

    // ─── RN-009: Parsear fecha desde código de lote PTP ──────────────────────

    [Theory]
    [InlineData("GAB2024ENE15XY",  14, 1, 15)]   // tamano=14 → pos=7, "ENE15"
    [InlineData("GAB2024MAR22X",   13, 3, 22)]   // tamano=13 → pos=6, "MAR22"
    [InlineData("AB2024DIC31XY",   14, 12, 31)]  // DIC
    public void RN009_ParsearFechaDeLotePTP(string lote, int tamano, int mesEsp, int diaEsp)
    {
        var calc = new CalculoService();
        var result = calc.ParsearFechaDeLotePTP(lote, tamano);
        Assert.NotNull(result);
        Assert.Equal(mesEsp, result!.Value.Month);
        Assert.Equal(diaEsp, result!.Value.Day);
    }

    [Fact]
    public void RN009_LoteInvalido_RetornaNull()
    {
        var calc = new CalculoService();
        Assert.Null(calc.ParsearFechaDeLotePTP("AB", 2));
    }

    // ─── RN-015: Ordenamiento del inventario ─────────────────────────────────

    [Fact]
    public void RN015_Ordenamiento_HeaderAnteDetallAntesDeTotal()
    {
        var items = new List<ItemInventario>
        {
            new() { Prod = "BROCOLI", Conse = 3, FechaCad = "99991231" },
            new() { Prod = "BROCOLI", Conse = 2, FechaCad = "20250301" },
            new() { Prod = "BROCOLI", Conse = 1, FechaCad = "00000000" },
        };

        var ordenados = items
            .OrderBy(i => i.Prod)
            .ThenBy(i => i.Conse)
            .ThenBy(i => i.FechaCad)
            .ToList();

        Assert.Equal(1, ordenados[0].Conse); // Header (1) primero
        Assert.Equal(2, ordenados[1].Conse); // Detalle (2) segundo
        Assert.Equal(3, ordenados[2].Conse); // Total (3) último
    }

    [Fact]
    public void RN015_Detalles_OrdenadosPorFechaCadAsc()
    {
        var items = new List<ItemInventario>
        {
            new() { Prod = "BROCOLI", Conse = 2, FechaCad = "20250320" },
            new() { Prod = "BROCOLI", Conse = 2, FechaCad = "20250310" },
            new() { Prod = "BROCOLI", Conse = 2, FechaCad = "20250305" },
        };

        var ordenados = items
            .OrderBy(i => i.Prod).ThenBy(i => i.Conse).ThenBy(i => i.FechaCad)
            .ToList();

        Assert.Equal("20250305", ordenados[0].FechaCad); // Más próximo a caducar primero
        Assert.Equal("20250310", ordenados[1].FechaCad);
        Assert.Equal("20250320", ordenados[2].FechaCad);
    }
}
