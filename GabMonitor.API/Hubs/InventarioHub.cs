// GabMonitor.API/Hubs/InventarioHub.cs
using GabMonitor.API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace GabMonitor.API.Hubs;

/// <summary>
/// Hub de SignalR para broadcast de actualizaciones de inventario en tiempo real.
/// Alternativa/complemento al polling cada 900 s del frontend.
/// </summary>
public class InventarioHub : Hub
{
    public async Task UnirseGrupo(string grupo)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, grupo);
    }
}

/// <summary>
/// Servicio en background que ejecuta Genera() cada 15 minutos
/// y notifica a todos los clientes conectados via SignalR.
/// Replica la lógica del timer1 del WinForms (RN-010).
///
/// FIX H-2: el servicio ahora llama explícitamente a
/// IInventarioService.GenerarInventarioConsolidadoAsync() antes de notificar.
/// En el código original solo enviaba el evento SignalR, dejando el cache frío:
/// todos los clientes reaccionaban a la vez y generaban N peticiones simultáneas
/// al API, cada una recalculando el inventario desde cero.
///
/// Con esta corrección el background service hace el cálculo pesado una sola vez,
/// y los clientes reciben el aviso cuando el dato ya está listo en memoria
/// (TanStack Query invalida su cache y re-fetches desde el endpoint, que en una
/// versión con caching de segundo nivel podría servir la respuesta pre-computada).
/// </summary>
public class InventarioBackgroundService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IHubContext<InventarioHub> _hub;
    private readonly ILogger<InventarioBackgroundService> _logger;

    // 900 segundos = 15 minutos (igual que el timer del WinForms)
    private static readonly TimeSpan Intervalo = TimeSpan.FromSeconds(900);

    public InventarioBackgroundService(
        IServiceProvider services,
        IHubContext<InventarioHub> hub,
        ILogger<InventarioBackgroundService> logger)
    {
        _services = services;
        _hub      = hub;
        _logger   = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "InventarioBackgroundService iniciado. Intervalo: {intervalo}s",
            Intervalo.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(Intervalo, stoppingToken);

            try
            {
                _logger.LogInformation("Generando inventario automático...");

                // FIX H-2: crear scope para resolver el servicio scoped desde
                // este hosted service (singleton). Sin el scope, DI lanza
                // InvalidOperationException al intentar resolver IInventarioService.
                using var scope   = _services.CreateScope();
                var inventarioSvc = scope.ServiceProvider.GetRequiredService<IInventarioService>();

                // Ejecutar Genera() — equivalente al timer1_Tick del WinForms
                var (_, metricas) = await inventarioSvc.GenerarInventarioConsolidadoAsync();

                _logger.LogInformation(
                    "Inventario generado: {productos} productos, confiabilidad {pct}%",
                    metricas.TotalProductos, metricas.PorcentajeTeorico);

                // Notificar a todos los clientes con los metadatos del resultado
                await _hub.Clients.All.SendAsync(
                    "InventarioActualizado",
                    new
                    {
                        timestamp  = DateTime.Now,
                        mensaje    = "Inventario actualizado automáticamente",
                        productos  = metricas.TotalProductos,
                        confiabPct = metricas.PorcentajeTeorico
                    },
                    stoppingToken);

                _logger.LogInformation("Notificación SignalR enviada a todos los clientes");
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error en ciclo de actualización automática");
            }
        }
    }
}
