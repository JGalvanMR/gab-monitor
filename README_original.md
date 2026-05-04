# Monitor de Fecha de Caducidad — GAB Irapuato

## Comercializadora GAB S.A. de C.V

Sistema web de supervisión operativa de inventario por fecha de caducidad.
Migración funcional del sistema Windows Forms original (`.NET 4.0 x86`) a arquitectura web moderna.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + TanStack Query |
| Backend | .NET 8 Web API + Dapper + SignalR |
| Base de datos | SQL Server — GAB_Irapuato (sin cambios en esquema) |
| Despliegue | Docker Compose + nginx |

---

## Estructura del proyecto

```
gab-monitor/
├── GabMonitor.API/          ← Backend .NET 8
│   ├── Controllers/         ← InventarioController, AutorizacionController, UbicacionController
│   ├── Services/            ← InventarioService, CalculoService, AutorizacionService
│   ├── Repositories/        ← InventarioRepository, AutorizacionRepository, UbicacionRepository
│   ├── Models/Domain/       ← ItemInventario, MetricasInventario
│   ├── DTOs/                ← AutorizacionDto
│   ├── Hubs/                ← InventarioHub (SignalR) + BackgroundService
│   ├── appsettings.json     ← Cadena de conexión
│   └── Dockerfile
│
├── gab-monitor-web/         ← Frontend React 18
│   ├── src/
│   │   ├── api/             ← inventarioApi.ts
│   │   ├── components/      ← InventarioTable, FiltrosBarra, EstadisticasPanel
│   │   │   ├── inventario/
│   │   │   ├── almacen/     ← MapaAlmacen (SVG interactivo)
│   │   │   └── autorizacion/← ModalAuth, ModalAutorizacion
│   │   ├── hooks/           ← useInventario (polling + cuenta regresiva)
│   │   ├── pages/           ← Principal.tsx
│   │   └── types/           ← inventario.types.ts
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml
└── README.md
```

---

## Configuración inicial

### 1. Cadena de conexión (obligatorio)

Editar `GabMonitor.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "GabIrapuato": "Server=GABIRA1\\SQL2005;Database=GAB_Irapuato;Connect Timeout=130;User ID=sa;Password=TU_PASSWORD;MultipleActiveResultSets=True;TrustServerCertificate=True"
  }
}
```

O con variable de entorno en docker-compose.yml:

```
DB_PASSWORD=tu_password_aqui
```

### 2. CORS / URLs permitidas

Si acceden desde PCs con IP distinta a `monitor.gab.local`, agregar en `Program.cs`:

```csharp
.WithOrigins("http://192.168.X.X", "http://monitor.gab.local")
```

---

## Desarrollo local

### Backend

```bash
cd GabMonitor.API
dotnet restore
dotnet run
# API disponible en: http://localhost:5000
# Swagger en: http://localhost:5000/swagger
```

### Frontend

```bash
cd gab-monitor-web
npm install
npm run dev
# App disponible en: http://localhost:5173
```

El archivo `vite.config.ts` ya tiene proxy configurado hacia `http://localhost:5000`.

---

## Despliegue con Docker

```bash
# En la raíz del proyecto (donde está docker-compose.yml)
DB_PASSWORD=tu_password docker compose up -d

# Verificar que todo levantó
docker compose ps
docker compose logs -f
```

Acceder desde cualquier PC de la red: **<http://monitor.gab.local>**

Para registrar el host en la red interna, agregar en el servidor DNS o en `hosts` de cada PC:

```
192.168.X.X    monitor.gab.local
```

---

## Reglas de negocio implementadas

| ID | Descripción |
|----|-------------|
| RN-001 | Días hasta caducidad: explícita o implícita por tipo (BETABEL=60d, AJO=180d, ADEREZO/VINAGRETA/QUESO=90d, resto=14d) |
| RN-002 | Semáforo de colores: ≤4d=Rojo, 5-11d=Naranja, 12-15d=Amarillo, ≥16d=Verde, PreAut=A→Violeta, PreAut=C→Azul |
| RN-003 | Peso estimado PTC: `((bruto-tara)/cantidad) × cajas` + ajuste hielo |
| RN-004 | Pérdida de hielo por día: 0d=100%, 1d=85%, 2d=75%, 3d=50%, 4d=35%, 5d=20%, 6d=10% |
| RN-005 | Peso estimado PTP: prioridad PROD_PESO_VAR > ENV_PESO, + ajuste hielo |
| RN-006 | Excluir del conteo de tarimas ubicadas: AGUI / CANAS / PROCESO / AJO |
| RN-007 | Métricas de confiabilidad: NoPB/NoPT (teórico) y NoPF/NoPT (físico) |
| RN-008 | Lote → semana laboral: busca en tb_cat_semanas, retorna "SS-DDD" (5 chars) |
| RN-009 | Fecha desde lote PTP: extrae "MMMDD" en español (ENE-DIC) desde posición variable |
| RN-010 | Auto-refresco cada 900 segundos (15 min) con cuenta regresiva visual |
| RN-011 | Autenticación: contraseñas "CAMFRI2024" o "RURR2024" |
| RN-012 | Pre-autorización: UPDATE tb_det_eti_final + tb_det_trazabilidad + INSERT tb_registro_movimientos |
| RN-013 | Actualización manual de ubicación en TB_DET_TRAZABILIDAD y TB_DET_ETI_FINAL |
| RN-014 | Estructura de 18 columnas del DataTable Inven preservada como ItemInventario |
| RN-015 | Ordenamiento: Prod ASC → Conse ASC → FechaCad ASC |
| RN-016 | Reempaque PTP: busca recibo original en TB_DET_PROD_TAR → TB_DET_ETI_FINAL |

---

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/inventario/consolidado` | Inventario completo (≡ Genera()) |
| GET | `/api/inventario/consolidado?filtro=caducado` | Solo productos caducados |
| GET | `/api/inventario/consolidado?filtro=proximo` | Próximos a caducar |
| GET | `/api/inventario/consolidado?filtro=autTrailer` | Autorizados Trailer |
| GET | `/api/inventario/consolidado?filtro=autCamioneta` | Autorizados Camioneta |
| GET | `/api/inventario/consolidado?buscar=BROCOLI` | Búsqueda por nombre |
| GET | `/api/inventario/estadisticas` | Métricas de confiabilidad |
| GET | `/api/inventario/diferencias/teorico` | Diff inventario teórico |
| GET | `/api/inventario/diferencias/fisico` | Diff inventario físico |
| POST | `/api/autorizacion/verificar` | Verificar contraseña |
| PUT | `/api/autorizacion/lote` | Autorizar múltiples tarimas |
| PUT | `/api/autorizacion/folio` | Autorizar folio completo |
| PUT | `/api/ubicacion` | Actualizar ubicación manual |
| GET | `/api/ubicacion/{codigo}/inventario` | Inventario por posición |

---

## Plan de migración — Coexistencia paralela (semanas 9-10)

Durante la validación, ambos sistemas leen la **misma base de datos** simultáneamente.

**Checklist de validación por turno:**

- [ ] Número de productos: WinForms == Web
- [ ] Suma total de cajas: WinForms == Web
- [ ] % Confiabilidad teórico: WinForms == Web
- [ ] % Confiabilidad físico: WinForms == Web
- [ ] Clasificación de colores: misma tarima = mismo color
- [ ] Peso estimado: diferencia < 0.01 kg por tarima
- [ ] Días hasta caducidad: WinForms == Web (mismo día)
- [ ] Pre-autorizaciones: visibles en ambos sistemas

---

## Notas de seguridad para producción

1. **Contraseñas de autorización** — actualmente hardcoded en `AutorizacionController.cs`. Mover a `appsettings.json` o a un vault antes de ir a producción.
2. **HTTPS** — configurar certificado SSL para `monitor.gab.local` en el servidor nginx.
3. **BD** — el usuario de SQL Server debe tener permisos mínimos: SELECT en todas las tablas + UPDATE solo en las columnas `preautorizado` y `UBICACION` de `tb_det_trazabilidad` y `tb_det_eti_final` + INSERT en `tb_registro_movimientos`.

---

*Sistema generado mediante análisis de ingeniería inversa del WinForms original.*
*La base de datos GAB_Irapuato no fue modificada en ningún aspecto.*
