// GabMonitor.API/Hubs/InventarioHub.cs
using Microsoft.AspNetCore.SignalR;

namespace GabMonitor.API.Hubs;

/// <summary>
/// Hub de SignalR para broadcast de actualizaciones de inventario en tiempo real.
/// Alternativa/complemento al polling cada 900s del frontend.
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
        _logger.LogInformation("InventarioBackgroundService iniciado. Intervalo: {intervalo}s", Intervalo.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(Intervalo, stoppingToken);

            try
            {
                _logger.LogInformation("Generando inventario automático...");

                // Notificar a todos los clientes que deben refrescar
                await _hub.Clients.All.SendAsync(
                    "InventarioActualizado",
                    new { timestamp = DateTime.Now, mensaje = "Inventario actualizado automáticamente" },
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
