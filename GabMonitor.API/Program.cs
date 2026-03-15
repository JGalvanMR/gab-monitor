// GabMonitor.API/Program.cs
using GabMonitor.API.Hubs;
using GabMonitor.API.Repositories;
using GabMonitor.API.Repositories.Interfaces;
using GabMonitor.API.Services;
using GabMonitor.API.Services.Interfaces;

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
