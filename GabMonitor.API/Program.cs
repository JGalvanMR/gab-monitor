// GabMonitor.API/Program.cs
// CORRECCIÓN D-01: Configurar cultura es-MX globalmente para paridad con WinForms original
using System.Globalization;
using GabMonitor.API.Hubs;
using GabMonitor.API.Repositories;
using GabMonitor.API.Repositories.Interfaces;
using GabMonitor.API.Services;
using GabMonitor.API.Services.Interfaces;

// ── D-01 CORRECCIÓN CRÍTICA: Cultura es-MX igual que el sistema WinForms original ──
// El WinForms original corría en Windows con configuración regional de México.
// .NET 8 por defecto usa InvariantCulture, lo que produce fechas en formato
// incorrecto ("3/14/2025" vs "14/03/2025") y nombres de día en inglés ("FRI" vs "VIE").
var culturaMexico = new CultureInfo("es-MX");
CultureInfo.DefaultThreadCurrentCulture   = culturaMexico;
CultureInfo.DefaultThreadCurrentUICulture = culturaMexico;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("GabPolicy", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "https://monitor.gab.local",
            "http://monitor.gab.local"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var connString = builder.Configuration.GetConnectionString("GabIrapuato");

builder.Services.AddScoped<IInventarioRepository>(sp => new InventarioRepository(connString!));
builder.Services.AddScoped<IAutorizacionRepository>(sp => new AutorizacionRepository(connString!));
builder.Services.AddScoped<IUbicacionRepository>(sp => new UbicacionRepository(connString!));
builder.Services.AddScoped<IInventarioService, InventarioService>();
builder.Services.AddScoped<IAutorizacionService, AutorizacionService>();
builder.Services.AddScoped<IUbicacionService, UbicacionService>();
builder.Services.AddScoped<ICalculoService, CalculoService>();

builder.Services.AddHostedService<InventarioBackgroundService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("GabPolicy");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapHub<InventarioHub>("/hubs/inventario");

app.Run();
