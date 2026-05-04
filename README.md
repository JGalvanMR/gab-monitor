# Documentación Técnica — GabMonitor

---

## 📦 Nombre del Módulo: `GabMonitor` — Sistema de Monitoreo de Inventario por Fecha de Caducidad

---

## 🧭 Propósito

GabMonitor es una migración funcional completa de un sistema WinForms (.NET 4.0 x86) a arquitectura web moderna. Su propósito es proporcionar supervisión operativa en tiempo real del inventario de producto terminado en la planta de cámara fría de Comercializadora GAB S.A. de C.V. (Irapuato, Gto.), con énfasis en el control de fechas de caducidad, pre-autorización de salidas, asignación de ubicaciones físicas en almacén y métricas de confiabilidad de inventario. La base de datos operativa (`GAB_Irapuato`) no es modificada estructuralmente; el sistema actúa exclusivamente sobre columnas operativas ya existentes (`preautorizado`, `UBICACION`).

---

## ⚙️ Responsabilidades

- Generar el inventario consolidado combinando tarimas de Producto Terminado Congelado (PTC) y Producto Terminado Precocido (PTP) desde múltiples tablas SQL Server, replicando la lógica del método `Genera()` del WinForms original.
- Calcular y aplicar semáforo de colores por días restantes hasta caducidad para cada tarima activa.
- Calcular fechas de caducidad de forma implícita (por tipo de producto) cuando no existe fecha explícita en base de datos.
- Calcular pesos estimados por tarima aplicando modelos diferenciados para PTC y PTP, incluyendo pérdida progresiva de peso del hielo por día.
- Calcular métricas de confiabilidad del inventario (teórico vs. físico vs. actual) por producto.
- Gestionar la pre-autorización de tarimas para salida por Trailer o Camioneta, registrando el movimiento en log de auditoría.
- Permitir la asignación manual de ubicación física a tarimas en el mapa del almacén.
- Exponer detalle de embarques, splits y presplit por tarima.
- Exponer información del recibo de origen (PTC) o del folio de producción (PTP) por tarima.
- Emitir notificaciones en tiempo real vía SignalR cuando el inventario es regenerado automáticamente.
- Refrescar el inventario automáticamente cada 900 segundos (15 minutos), replicando el comportamiento del `timer1` del WinForms.
- Aplicar filtros sobre el inventario consolidado: todos, caducado, próximo, autorizados Trailer, autorizados Camioneta, y búsqueda por nombre de producto.
- Exportar el inventario filtrado a formato Excel.
- Verificar contraseña de autorización antes de habilitar el modo de pre-autorización en el frontend.
- Mostrar el inventario asignado a una posición del almacén al consultar el mapa.
- Corregir la cultura regional a `es-MX` para garantizar paridad de comportamiento con el sistema WinForms original que corría en Windows con configuración regional de México.

---

## 🔄 Flujo de Funcionamiento

### Backend — Generación de Inventario Consolidado (`GenerarInventarioConsolidadoAsync`)

1. Se obtiene en paralelo el corte de inventario físico más reciente (`tb_mstr_fechainvfisico`), el catálogo de pesos por producto y el catálogo de semanas laborales del año en curso.
2. Se cargan secuencialmente los datos transaccionales: embarques desde la fecha de corte, splits activos, PTC del día, PTP del día, inventario teórico/físico usando la **fecha del corte** (no `DateTime.Today`, corrección crítica FIX #2), presplit del día, trazabilidad PTC completa, y etiquetas finales PTP completas.
3. Se procesa el bloque PTC: se itera por cada tarima activa agrupada por producto, generando filas de header (Conse=1), detalle (Conse=2) y total por producto (Conse=3). Para cada tarima se calcula fecha de caducidad, días restantes, peso estimado, presplit, color de semáforo y estado de pre-autorización.
4. Se procesa el bloque PTP con la misma estructura jerárquica, con lógica de fecha diferenciada (prioridad: fecha explícita → parseo del código de lote → implícita por tipo).
5. Se agrega una fila de total general (Conse=4).
6. El resultado es ordenado por `Prod ASC → Conse ASC → FechaCad ASC` (RN-015).
7. Se calculan las métricas de confiabilidad sobre las filas de totales por producto (Conse=3), excluyendo productos con "PROCESO" o "CANASTILLA" en el nombre.
8. El resultado completo se retorna como `(List<ItemInventario>, MetricasInventario)`.

### Backend — Conteo de Ubicaciones y Tarimas (RN-006)

Durante el procesamiento de cada tarima (PTC y PTP), se evalúa si debe excluirse del conteo de tarimas totales y ubicadas. Son excluidas las tarimas cuya ubicación es `"AGUI"`, o cuyo nombre de producto contiene `"CANAS"`, `"PROCESO"` o `"AJO"`.

### Backend — Autorización de Tarimas

1. El cliente envía `PUT /api/autorizacion/verificar` con la contraseña. El backend compara contra literales hardcoded `"CAMFRI2024"` o `"RURR2024"` y retorna `{ autorizado: true/false }`.
2. Si autorizado, el cliente habilita el modo de selección múltiple en la tabla.
3. El usuario selecciona tarimas y envía `PUT /api/autorizacion/lote` con tipo `"A"` (Trailer) o `"C"` (Camioneta), motivo, usuario y nombre de máquina.
4. Por cada tarima, `AutorizacionRepository` ejecuta un `UPDATE` sobre `tb_det_trazabilidad` (PTC) y/o `tb_det_eti_final` (PTP), seguido de un `INSERT` en `tb_registro_movimientos` con tipo de movimiento `"PreAutor"`, operación `"3.18"` y sistema `"SISGAB"`.

### Backend — Actualización de Ubicación

1. El cliente selecciona una posición en el mapa SVG interactivo y envía `PUT /api/ubicacion` con folio, producto, tarima, tipo (PTC/PTP), ubicación, usuario y máquina.
2. `UbicacionRepository` ejecuta un `UPDATE` sobre `TB_DET_TRAZABILIDAD.UBICACION` (PTC) o `TB_DET_ETI_FINAL.UBICACION` (PTP).

### Backend — Background Service (SignalR)

Un `HostedService` en background ejecuta `GenerarInventarioConsolidadoAsync` cada 900 segundos, precalienta el dato en memoria y emite el evento `"InventarioActualizado"` a todos los clientes SignalR conectados. Requiere creación de scope de DI por ser singleton resolviendo servicios scoped.

### Frontend — Ciclo de Vida Principal

1. `Principal.tsx` monta y ejecuta `useInventario(filtro, buscar)` que configura una query TanStack Query con `staleTime` y `refetchInterval` de 900 000 ms.
2. Un `setInterval` de 1 segundo mantiene la cuenta regresiva visual. Se reinicia a 900 cuando `isFetching` transiciona a `false`.
3. La tabla renderiza filas diferenciadas por `conse` (1=header, 2=detalle, 3=total producto, 4=total general), aplicando clases CSS de color según `colorClase` del ítem.
4. El doble clic en columnas específicas abre modales según el tipo de acción (recibo, detalle embarque, presplit, mapa, asignación manual).
5. El modo autorización se activa tras verificación de contraseña y habilita checkboxes en filas de detalle.

---

## 📐 Reglas de Negocio

### 🔒 Restricciones

- **RN-011** — Solo dos contraseñas son válidas para activar el modo de autorización: `"CAMFRI2024"` y `"RURR2024"`. Ambas están hardcoded en `AutorizacionController.cs`. El código incluye el comentario `FIX-SEGURIDAD (C-2)` indicando que deben moverse a configuración antes de producción.
- **RN-012** — El tipo de autorización solo admite los valores `"A"` (Trailer) o `"C"` (Camioneta). Cualquier otro valor es rechazado con HTTP 400.
- **RN-012** — La lista de tarimas a autorizar debe contener al menos un elemento; el campo motivo es obligatorio y no puede ser vacío o solo espacios.
- **RN-013** — La ubicación no puede ser vacía al invocar `PUT /api/ubicacion`.
- **RN-006** — Las tarimas de productos con nombres que contengan `"CANAS"`, `"PROCESO"` o `"AJO"`, o cuya ubicación sea exactamente `"AGUI"`, quedan excluidas del denominador de métricas de ubicación. No son excluidas del inventario visible.
- **Esquema DB** — La base de datos `GAB_Irapuato` no puede ser modificada estructuralmente. Ninguna migración de esquema, índice o procedimiento almacenado es creado por este sistema.
- **RN-PTC activas** — Solo se incluyen tarimas PTC donde `PTI_ESTATUS_SUR = ' '` (espacio), el recibo esté activo (`rpt_estatus = ' '`), la cantidad recibida sea mayor a 0 (`rptd_cantidad > 0`), y el estado del detalle de recepción no sea `'C'`.
- **RN-PTP activas** — Solo se incluyen tarimas PTP donde `ESTATUS_SUR = ' '`, `NUM_CAJAS > 0`, `HRP_NUM_UNIDADES > 0`, `ETIQUETA = 'S'`, y `hrp_tipo_recepcion = 'PTP'`.
- **Trailers tipo `TR`** — Los recibos de tipo `TR` solo se incluyen en el inventario si tienen `RPT_INVENTARIO = 'S'`.

### ✅ Validaciones

- **RN-001** — Si no existe fecha de caducidad explícita válida (null, DBNull, string vacío, espacio, o año < 1900), la fecha se calcula implícitamente desde `PTI_FECHA` (PTC) o `FECHA` (PTP):
  - Nombre contiene `"BETABEL"` → +60 días
  - Nombre contiene `"AJO"` → +180 días
  - Nombre contiene `"ADEREZO"`, `"VINAGRETA"` o `"QUESO"` → +90 días
  - Cualquier otro producto → +14 días (default, aplica a brócoli, vegetales frescos)
- **RN-PTP fecha** — Para PTP, la prioridad de determinación de fecha de caducidad es: (1) campo `fechacad` explícito en BD, (2) parseo del campo `NUM_LOTE` según formato `"MMMDD"` en español desde posición variable según tamaño del lote, (3) cálculo implícito por tipo de producto.
- **FIX #1** — Fechas centinela (`"0001-01-01"`, año < 1900) son tratadas como ausencia de fecha, no como fecha válida.
- **D-04** — El campo `fechacad` en PTP puede llegar como `DateTime` (columna `DATE`) o como `string` en formato `yyyyMMdd`. Se usa `DateTime.ParseExact` con `InvariantCulture` para evitar dependencia de cultura regional.
- **D-05/D-06** — `FECHA_CAD` en PTC y `fechacad` en PTP pueden llegar como `DateTime` o `string` desde Dapper dependiendo del tipo de columna SQL Server. El parsing es defensivo para ambos casos.
- **Validación tipo en TarimasController** — El parámetro `tipo` en `GET /api/tarimas/detalle` solo acepta `"PTC"` o `"PTP"`, rechazando con HTTP 400 cualquier otro valor.

### 🔁 Agrupaciones

- **RN-015** — El inventario se ordena por `Prod ASC → Conse ASC → FechaCad ASC`, lo que garantiza: headers de producto primero, detalles de tarima ordenados por fecha de caducidad más próxima, totales al final de cada grupo.
- **RN-014** — La estructura interna del inventario replica exactamente las 18 columnas del `DataTable "Inven"` del WinForms original, mapeadas a la clase `ItemInventario`.
- **Agrupación en procesamiento** — El cambio de producto se detecta por comparación directa de `string` del nombre (`mnom != nombreProd`). Si el nombre cambia, se genera la fila de total del producto anterior y se abre un nuevo header.

### ⚙️ Reglas Operativas

- **RN-002** — El semáforo de colores aplica exclusivamente a filas de detalle (Conse=2). Prioridad: si existe pre-autorización (`preAutorizado != ""`), el color es `"preaut-trailer"` (violeta) para `"A"` o `"preaut-camioneta"` (azul) para `"C"`, sobreponiéndose al semáforo de caducidad. Sin pre-autorización: ≤4 días = rojo, 5-11 = naranja, 12-15 = amarillo, ≥16 = verde.
- **RN-003** — Peso estimado PTC: `((pesoBruto - tara) / cantidad) × cajasPorEntregar`. Para productos `"02002ML00"`, `"02002BROFR"` y `"02BRCO2025"` se suma el peso del hielo (8.5 kg base) con pérdida progresiva. Para `"02002BRHEB"` se suma 4 kg de hielo con pérdida progresiva.
- **RN-004** — Pérdida progresiva de peso del hielo: día 0=100%, día 1=85%, día 2=75%, día 3=50%, día 4=35%, día 5=20%, día 6=10%, día 7+=100% (default sin cambio).
- **RN-005** — Peso estimado PTP: prioridad `PROD_PESO_VAR > 0` → usa `PROD_PESO_VAR × cajas`; si no, `ENV_PESO × cajas`. Si existe `pesoCatalogo > 0` sobrescribe el resultado. Se suma `(pesoNeto / numUnidades) × cajasEntregadas`. Aplica el mismo ajuste de hielo que PTC para los mismos productos.
- **RN-007** — Métricas de confiabilidad calculadas sobre filas de totales (Conse=3, FechaCad="99991231"), excluyendo "PROCESO" y "CANASTILLA": `%Teórico = ProductosConTeoricoOk / TotalProductos × 100`, `%Físico = ProductosConFisicoOk / TotalProductos × 100`, `%Ubicadas = TarimasUbicadas / TotalTarimas × 100`.
- **RN-008** — El código de lote para PTP se genera desde el catálogo `tb_cat_semanas`, produciendo un string de exactamente 5 caracteres: `"SS-DDD"` donde `SS` es número de semana y `DDD` es la abreviatura del día en español (`LUN`, `MAR`, `MIÉ`, `JUE`, `VIE`, `SÁB`, `DOM`). Se usa `CultureInfo("es-MX")` explícitamente (corrección D-03).
- **RN-009** — El código de lote PTP contiene la fecha de elaboración en formato `"MMMDD"` en español (ENE-DIC) en posición 7 (si tamaño=12) o posición 6 (si tamaño=11). Si el mes actual es diciembre y el mes del lote es ENE, el año se incrementa en 1.
- **RN-010** — Refresco automático cada 900 segundos tanto en backend (BackgroundService) como en frontend (TanStack Query `refetchInterval`). El frontend muestra cuenta regresiva visual con alerta en naranja cuando quedan menos de 60 segundos.
- **RN-016** — Para tarimas PTP de tipo reempaque (`RMP_TIPO = "REM"`), se busca el recibo original navegando `TB_DET_PROD_ODP → TB_DET_PROD_TAR → TB_DET_ETI_FINAL`.
- **D-01** — La cultura del proceso .NET se establece globalmente a `"es-MX"` en `Program.cs` mediante `CultureInfo.DefaultThreadCurrentCulture` para garantizar paridad de formato de fechas con el WinForms original.
- **D-02** — Las fechas cortas se formatean siempre como `"dd/MM/yyyy"` con formato explícito, independientemente de la cultura del hilo.
- **D-08/D-09** — Los valores de clave y nombre de producto son siempre sujetos a `Trim()` antes de comparación y almacenamiento, para absorber espacios en columnas `CHAR(N)` de SQL Server.
- **FIX #2** — El inventario teórico/físico se consulta con la fecha del último corte (`corte.Fecha`), no con `DateTime.Today`, ya que la tabla `tb_mstr_inventario_fisico` almacena datos por fecha de corte físico, no por fecha actual.
- **FIX H-2** — El `InventarioBackgroundService` crea un scope de DI propio para resolver `IInventarioService` (servicio scoped) desde el contexto singleton del hosted service, evitando `InvalidOperationException`.
- **FIX H-1** — `UbicacionController` está declarado dentro del namespace `GabMonitor.API.Controllers` para evitar conflictos de routing y fallos de resolución en el contenedor DI.
- **FIX H-3** — `ObtenerUbicacionTarimaAsync` busca la tarima primero en PTC (`TB_DET_TRAZABILIDAD`) y luego en PTP (`TB_DET_ETI_FINAL`), retornando `null` si no existe en ninguna tabla (permite HTTP 404 correcto).

---

## 🔗 Dependencias

### Backend

| Dependencia | Versión | Uso |
|---|---|---|
| `Dapper` | 2.1.35 | Mapeo SQL → objetos dinámicos y tipados |
| `Microsoft.Data.SqlClient` | 5.2.2 | Conexión a SQL Server `GAB_Irapuato` |
| `Microsoft.AspNetCore.SignalR` | 1.1.0 | Push de notificaciones en tiempo real |
| `Swashbuckle.AspNetCore` | 6.9.0 | Documentación Swagger/OpenAPI |
| `.NET 8 BackgroundService` | built-in | Refresco automático cada 900 s |
| `CultureInfo("es-MX")` | built-in | Paridad cultural con WinForms original |

**Endpoints internos consumidos:**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/inventario/consolidado` | Inventario completo con filtros y búsqueda |
| GET | `/api/inventario/estadisticas` | Solo métricas |
| GET | `/api/inventario/diferencias/teorico` | Diff inventario teórico |
| GET | `/api/inventario/diferencias/fisico` | Diff inventario físico |
| GET | `/api/inventario/exportar/excel` | Exportación Excel |
| POST | `/api/autorizacion/verificar` | Validación de contraseña |
| PUT | `/api/autorizacion/lote` | Pre-autorizar múltiples tarimas |
| PUT | `/api/autorizacion/folio` | Pre-autorizar folio completo |
| PUT | `/api/ubicacion` | Actualizar ubicación de tarima |
| GET | `/api/ubicacion/{codigo}/inventario` | Inventario por posición |
| GET | `/api/tarimas/detalle` | Detalle embarques y splits por tarima |
| GET | `/api/tarimas/presplit` | Cajas en pre-split por tarima |
| GET | `/api/tarimas/recibo-ptc` | Información del recibo PTC |
| GET | `/api/tarimas/recibo-ptp` | Información del folio PTP con lógica de reempaque |
| WS | `/hubs/inventario` | Canal SignalR para evento `InventarioActualizado` |

**Tablas SQL Server consumidas:**

`tb_mstr_fechainvfisico`, `tb_det_embarque`, `tb_det_split`, `tb_mstr_inventario_fisico`, `Tb_Det_Etiqueta_Presplit`, `TB_DET_TRAZABILIDAD`, `tb_mstr_recepcion_pt`, `tb_cat_producto`, `tb_det_recepcion_pt`, `tb_cat_envases`, `TB_MSTR_RECEPCION_PT`, `TB_DET_ETI_FINAL`, `TB_CAT_PRODUCTO`, `TB_DET_FINAL_ODP`, `TB_HIST_RECEPCION`, `tb_cat_semanas`, `tb_cat_historial_dia`, `tb_cat_proveedor`, `tb_cat_ranchos`, `tb_cat_tablas`, `tb_cat_variedad`, `tb_det_split`, `TB_DET_PROD_ODP`, `TB_DET_PROD_TAR`, `tb_registro_movimientos`.

### Frontend

| Dependencia | Versión | Uso |
|---|---|---|
| `react` + `react-dom` | 18.3.1 | UI declarativa |
| `@tanstack/react-query` | 5.56.2 | Caché, polling automático, estado de fetch |
| `react-router-dom` | 6.26.2 | Enrutamiento SPA |
| `@microsoft/signalr` | 8.0.7 | Cliente SignalR para refresco en tiempo real |
| `tailwindcss` | 3.4.11 | Estilos utilitarios |
| `vite` | 7.3.1 | Build y dev server con proxy hacia API |
| `typescript` | 5.5.3 | Tipado estático |
| `Inter` + `JetBrains Mono` | Google Fonts | Tipografía corporativa |

---

## ⚠️ Riesgos Técnicos

1. **Contraseñas hardcoded en controlador** — `AutorizacionController.cs` compara `dto.Contrasena` directamente contra los literales `"CAMFRI2024"` y `"RURR2024"`. El propio código las marca con `FIX-SEGURIDAD (C-2)`. Cualquier persona con acceso al binario o al código fuente puede obtenerlas. No existe hash, salt ni rotación de credenciales. Riesgo crítico para producción.

2. **Credenciales de base de datos en texto plano en repositorio** — `appsettings.json` contiene la cadena de conexión completa con IP pública (`189.206.160.206`), puerto, usuario `sa` y contraseña `Gabira1` en texto plano. Esta información está versionada en el repositorio, exponiendo la base de datos productiva.

3. **Uso de usuario `sa` en SQL Server** — La conexión a la base de datos usa la cuenta de administrador del sistema (`sa`), que tiene permisos totales sobre el servidor SQL. La guía del README sugiere permisos mínimos, pero la implementación actual usa `sa`.

4. **Dependencia frágil de tipos dinámicos de Dapper** — El repositorio de inventario retorna `IEnumerable<dynamic>` en la mayoría de sus métodos. El servicio accede a campos por nombre de propiedad en tiempo de ejecución (ej. `row.PROD_NOMBRE`, `row.FECHA_CAD`). Cualquier renombramiento de columna en SQL Server genera una `RuntimeBinderException` no detectada en compilación.

5. **Consultas SQL con `commandTimeout: 120`** — Las consultas principales (`ObtenerTrazabilidadPTCAsync`, `ObtenerEtiquetasFinalesPTPAsync`) tienen timeout de 2 minutos, son JOINs de 6 tablas y se ejecutan sin paginación. En bases de datos grandes pueden degradar el rendimiento del servidor o bloquear conexiones.

6. **`GenerarInventarioConsolidadoAsync` sin caché de segundo nivel** — Cada llamada al endpoint `/api/inventario/consolidado` ejecuta todas las queries SQL desde cero. El `BackgroundService` precalienta el dato, pero no existe mecanismo de caché que sirva la respuesta pre-computada. Si múltiples clientes hacen request simultáneamente (al expirar TanStack Query en todos a la vez), se generan N ejecuciones paralelas de las mismas queries pesadas.

7. **`UbicacionController` fuera del namespace en archivo original** — El comentario `FIX H-1` documenta que originalmente `UbicacionController` estaba declarado fuera del namespace `GabMonitor.API.Controllers`, lo que podía causar fallos silenciosos de routing. El fix está aplicado, pero indica fragilidad en la organización del código.

8. **Exportación Excel retorna JSON** — El endpoint `GET /api/inventario/exportar/excel` retorna `application/json` con un mensaje `"Funcionalidad de exportar a Excel no implementada en esta demo"` y los items. El frontend invoca `res.blob()` asumiendo que recibirá un archivo binario. Esta discrepancia genera un archivo `.xlsx` descargable que en realidad es JSON, corrupto como Excel.

9. **Mapa de almacén con dimensiones fijas en píxeles** — `MapaAlmacen.tsx` utiliza dimensiones absolutas de `789px × 644px` sin responsividad. En pantallas con resolución menor o en dispositivos móviles el mapa queda cortado.

10. **Ausencia de autenticación en todos los endpoints** — Ningún endpoint del API requiere token, sesión o cualquier mecanismo de autenticación. La "autorización" es solo una validación de contraseña en el frontend que el servidor no vuelve a verificar en operaciones de escritura (PUT de autorización y ubicación).

11. **Corte de inventario físico como entidad implícita** — El sistema asume que `tb_mstr_fechainvfisico` siempre tiene al menos un registro. Si la tabla está vacía, `ObtenerCorteInventarioAsync` retorna `DateTime.Today` como fallback, pero el inventario teórico consultado con esa fecha retornará 0 registros, generando métricas incorrectas silenciosamente.

12. **SignalR como dependencia no crítica sin degradación controlada** — `useSignalRInventario` en el frontend intenta conectarse a `/hubs/inventario` y captura errores con `console.warn`. Si SignalR no está disponible, el sistema degrada a polling. Sin embargo, si la conexión SignalR cae silenciosamente después de establecerse, el inventario podría no invalidarse correctamente dependiendo del estado de reconexión automática.

---

## 🧪 Casos Edge

1. **Tarima con `disponibles <= 0`** — Las tarimas donde `ETIQUETA - SURTIDO <= 0` (PTC) o `NUM_CAJAS - CAJAS_SUR <= 0` (PTP) se excluyen silenciosamente del inventario consolidado mediante `continue`. No aparecen en ningún total.

2. **Fecha de caducidad en año < 1900** — SQL Server puede retornar fechas centinela como `"0001-01-01"`. El sistema las trata como ausencia de fecha y calcula la caducidad implícita. Si el tipo del producto tampoco cae en ninguna regla explícita, se aplica el default de 14 días.

3. **Código de lote PTP con mes no reconocido** — Si `mes3` no coincide con ninguna de las 12 abreviaturas (`ENE`-`DIC`), `ParsearFechaDeLotePTP` retorna `null` y el sistema cae a la prioridad 3 (caducidad implícita por tipo).

4. **Reempaque PTP sin recibo original** — En `GetReciboPTP`, si la lógica de reempaque (`BuscaReemAsync`) no encuentra un recibo original distinto, retorna el mismo recibo de entrada, preservando el flujo sin lanzar excepción.

5. **Cambio de año en lote PTP** — Si el sistema corre en diciembre y el lote indica enero (mes 1), el año se incrementa en 1. No se contempla el caso inverso (sistema en enero, lote en diciembre del año anterior), lo que podría generar fechas futuras incorrectas.

6. **Producto con `pesoCatalogo = 0` en PTP y `PROD_PESO_VAR = 0` y `ENV_PESO = 0`** — El cálculo de peso PTP retorna `pesoNeto / numUnidades × cajasEntregadas` sin el componente de peso de envase. El resultado es técnicamente incorrecto pero no lanza excepción.

7. **Múltiples clientes autorizando la misma tarima simultáneamente** — No existe bloqueo pesimista ni control de concurrencia. Dos usuarios pueden pre-autorizar la misma tarima para tipos distintos (A y C) simultáneamente; el último `UPDATE` gana, y ambos `INSERT` en `tb_registro_movimientos` persisten.

8. **Inventario teórico sin corte registrado** — Si `tb_mstr_fechainvfisico` está vacía, el fallback es `DateTime.Today`. Si no existe un registro en `tb_mstr_inventario_fisico` para esa fecha, todos los productos tendrán `Teo=0` y `Fis=0`, generando métricas de confiabilidad del 100% falsas.

9. **Filtro de inventario `"autTrailer"` o `"autCamioneta"` sobre lotes de tipo `"C"` o `"A"` respectivamente** — No hay validación cruzada que impida mostrar tarimas de un tipo en el filtro del otro.

10. **Tarima PTP con `BuscaReemAsync` lanzando excepción** — El método captura excepciones con `catch { return recibo; }`, retornando el recibo original sin loguear el error. El fallo de la lógica de reempaque es silencioso.

---

## 🧱 Suposiciones Detectadas

1. **La base de datos `GAB_Irapuato` siempre está disponible y accesible** — No existe circuit breaker, retry policy con backoff ni manejo de transient faults para conexiones SQL Server. El único mecanismo de resiliencia es `commandTimeout`.

2. **Las columnas `CHAR(N)` de SQL Server pueden contener espacios como valor nulo semántico** — El sistema hace `Trim()` extensivo para normalizar espacios en blanco en campos como `PTI_ESTATUS_SUR`, `rpt_estatus` y valores de pre-autorización.

3. **El inventario siempre cabe en memoria** — No existe paginación ni límite en el número de registros retornados. El sistema asume que la lista completa de tarimas activas puede cargarse en RAM y serializarse a JSON en una sola operación.

4. **El usuario del frontend es confiable una vez que ingresa la contraseña** — La verificación de contraseña solo ocurre al activar el modo de autorización. Las operaciones de escritura posteriores (`PUT /api/autorizacion/lote`) no verifican nuevamente si la sesión sigue siendo válida.

5. **El nombre del producto en la base de datos contiene palabras clave específicas** — Las reglas de caducidad implícita y exclusión de conteo de ubicaciones dependen de que `PROD_NOMBRE` contenga exactamente las subcadenas `"BETABEL"`, `"AJO"`, `"ADEREZO"`, `"VINAGRETA"`, `"QUESO"`, `"CANAS"`, `"PROCESO"` (case-insensitive). Cualquier variación ortográfica o abreviatura rompería la regla silenciosamente.

6. **Las columnas `FECHA_CAD` (PTC) y `fechacad` (PTP) pueden llegar como `DateTime` o como `string`** — Dapper mapea el tipo dependiendo de la definición de la columna en SQL Server (`DATE`, `DATETIME` vs `CHAR`, `VARCHAR`). El sistema implementa parsing defensivo para ambos casos, asumiendo que ningún otro tipo puede aparecer.

7. **El hostname del cliente web es suficiente como identificador de máquina** — `NombreMaquina` en los registros de auditoría se llena con `window.location.hostname`, que en entornos con múltiples usuarios detrás de un proxy o balanceador será el mismo para todos.

8. **El mapa del almacén refleja exactamente la distribución física actual** — El componente `MapaAlmacen.tsx` tiene las posiciones del almacén hardcodeadas. Si la distribución física cambia, el mapa debe actualizarse manualmente en código.

9. **El archivo `appsettings.json` en producción contiene la cadena de conexión correcta** — No existe mecanismo de configuración por entorno más allá del comentario en el README sugiriendo variables de entorno en `docker-compose.yml`.

10. **El usuario activo en sesión puede obtenerse por nombre de máquina** — `ObtenerUsuarioActivoAsync` busca en `tb_cat_historial_dia` por `nombre_maquina` donde `fin_sesion IS NULL`. Si múltiples usuarios usan la misma máquina simultáneamente o si la sesión anterior no fue cerrada correctamente, puede retornar un usuario incorrecto.

---

## 📈 Recomendaciones Técnicas

1. **Mover credenciales a variables de entorno o gestión de secretos** — Las contraseñas de autorización, la cadena de conexión SQL y las credenciales del usuario `sa` deben extraerse a variables de entorno inyectadas en tiempo de ejecución (Docker secrets, Azure Key Vault, o al menos `.env` fuera del repositorio). El archivo `appsettings.json` con la IP pública y credenciales no debe versionarse.

2. **Reemplazar usuario `sa` por usuario con permisos mínimos** — Crear un usuario SQL Server dedicado con `SELECT` en las tablas de lectura y `UPDATE` solo en las columnas `preautorizado` y `UBICACION` de `tb_det_trazabilidad` y `tb_det_eti_final`, más `INSERT` en `tb_registro_movimientos`, tal como indica el README.

3. **Implementar caché de segundo nivel para el inventario consolidado** — Usar `IMemoryCache` o `IDistributedCache` para almacenar el resultado de `GenerarInventarioConsolidadoAsync` durante el intervalo de refresco (900 s). El `BackgroundService` actualiza el caché; los endpoints sirven desde él. Esto elimina el riesgo de N queries paralelas.

4. **Implementar autenticación JWT en la API** — El modo de autorización debe validar un token en cada operación de escritura. El flujo sugerido: `POST /api/autorizacion/verificar` retorna un JWT de corta duración (ej. 30 min), que el frontend incluye en el header `Authorization: Bearer` en las llamadas `PUT` de autorización y ubicación. El backend valida el token en cada request usando `[Authorize]`.

5. **Tipado fuerte en repositorios en lugar de `dynamic`** — Crear DTOs internos de Dapper (ej. `TrazabilidadPTCRow`, `EtiquetaFinalPTPRow`) para eliminar el riesgo de `RuntimeBinderException` y habilitar detección de cambios de esquema en tiempo de compilación.

6. **Implementar la exportación Excel real** — Usar la librería `ClosedXML` o `EPPlus` para generar archivos `.xlsx` reales en `GET /api/inventario/exportar/excel`, retornando `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment`.

7. **Paginación del inventario consolidado** — Agregar parámetros `page` y `pageSize` al endpoint `/api/inventario/consolidado` para proteger el sistema contra inventarios de gran volumen. TanStack Query soporta infinite queries natively.

8. **Hacer el mapa de almacén responsivo** — Reemplazar las dimensiones fijas de `789px × 644px` por un `viewBox` SVG con `width: 100%` y `aspect-ratio`, o implementar zoom/scroll dentro del contenedor del mapa, para garantizar usabilidad en distintas resoluciones.

9. **Agregar logging estructurado a todas las excepciones silenciosas** — Métodos como `BuscaReemAsync` y `CalcularPesoEstimadoPTC/PTP` capturan excepciones con `catch { return ...; }` sin loguear. Deben usar `ILogger` para registrar al menos el tipo de excepción y los parámetros de entrada, facilitando el diagnóstico en producción.

10. **Agregar control de concurrencia en pre-autorización** — Implementar un `UPDATE` optimista con condición `WHERE preautorizado IS NULL OR preautorizado = ''` para evitar sobreescritura silenciosa cuando dos usuarios autorizan la misma tarima simultáneamente. Retornar HTTP 409 si la tarima ya fue pre-autorizada.

11. **Integrar SignalR con invalidación de caché de segundo nivel** — Si se implementa la recomendación del caché (punto 3), el evento `InventarioActualizado` de SignalR debe ser el mecanismo por el cual los clientes invalidan su query TanStack, en lugar del polling de 900 s del `refetchInterval`. Esto reduce la carga del servidor al mínimo necesario.

12. **Extraer la lógica del mapa de almacén a un archivo de configuración JSON** — Las posiciones del almacén están hardcodeadas en `MapaAlmacen.tsx`. Externalizarlas a un archivo `almacen-layout.json` permitiría actualizar la distribución física sin recompilar el frontend.

---

## 🧾 Resumen Ejecutivo

GabMonitor es el sistema digital que permite a los supervisores de la planta de cámara fría de Comercializadora GAB ver, en tiempo real desde cualquier navegador web, el estado completo de su inventario de producto terminado, ordenado por fecha de caducidad.

El sistema indica con colores qué productos están por vencer (rojo, naranja), cuáles están próximos (amarillo) y cuáles están en buen estado (verde), permitiendo tomar decisiones de despacho antes de incurrir en pérdidas. También muestra automáticamente las tarimas que ya fueron autorizadas para salir en trailer o camioneta.

Los supervisores pueden aprobar la salida de tarimas de producto con pocos clics, ingresando una contraseña de seguridad y registrando el motivo del despacho. Cada acción queda registrada en el sistema para auditoría.

El mapa interactivo del almacén permite saber exactamente en qué posición física está almacenada cada tarima, y asignar ubicación manualmente cuando una tarima no tiene posición registrada.

El inventario se actualiza automáticamente cada 15 minutos sin que nadie deba hacer nada, replicando el comportamiento del sistema anterior. Los números de confiabilidad del inventario (qué tan bien coincide el conteo teórico con el físico real) se calculan y muestran en pantalla en todo momento.

La plataforma reemplaza completamente el sistema Windows anterior sin modificar la base de datos operativa, garantizando que los demás sistemas de la empresa continúen funcionando con normalidad. Sin embargo, antes de llevar el sistema a producción, se requieren ajustes de seguridad críticos: las contraseñas de acceso y las credenciales de la base de datos están actualmente expuestas en el código, lo cual representa un riesgo que debe resolverse antes del arranque oficial.
