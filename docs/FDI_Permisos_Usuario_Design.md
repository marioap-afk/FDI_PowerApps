# FDI — Diseño de permisos de usuario (estado actual + objetivo)

> **Autor:** Claude Release (rol: validar/empaquetar). Esto es **análisis y propuesta de
> diseño**; la implementación es de **Codex**. Base: `App.OnStart`, `scrMisCotizaciones`,
> `scrGenerarPedido`, `scrCorreo` del `.msapp` actual, y el modelo de roles ya validado en
> [FDI_Cotizaciones_Flow.md](FDI_Cotizaciones_Flow.md).
> Cubre las tres piezas pedidas: **lista**, **lógica** y **proceso** de permisos.

---

## 1. Estado actual (cómo está hoy)

**Fuente de verdad = dos listas de SharePoint** (no roles de Power Platform ni grupos de Entra):

- **`Cotizadores`** — Persona `Nombre` + Choice **`Puesto`** → define el rol del usuario.
- **`Vendedores`** — Persona `Vendedor` + `Activo` → define si el usuario es vendedor (entidad
  de negocio ligada a `Cotizaciones 2026.VendedoresLookUp`).

**Toda la lógica está en `App.OnStart`** (se calcula una sola vez al abrir la app):

```powerapps
Set(varUserEmail, Lower(User().Email));
Set(varCotizadorFDI, LookUp(Cotizadores, Lower(Nombre.Email) = varUserEmail));
Set(varRolFDI, Coalesce(varCotizadorFDI.Puesto.Value, "Usuario"));
Set(varEsAdminFDI, Lower(varRolFDI) = "administrador" || Lower(varRolFDI) = "admin");
Set(varEsCoordinadorFDI, Lower(varRolFDI) = "coordinador");
Set(varEsUsuarioFDI, Not(IsBlank(varUserEmail)));
Set(varPuedeVerTodoFDI, varEsAdminFDI || varEsCoordinadorFDI);
Set(varPuedeAsignarFDI, varEsAdminFDI || varEsCoordinadorFDI);
Set(varPuedeEditarMaestrosFDI, varEsAdminFDI);
Set(varVendedorActualFDI, LookUp(Vendedores, Lower(Vendedor.Email) = varUserEmail && Activo = true));
```

### Qué se aplica de verdad vs. qué solo se declara

| Variable | ¿Se consume? | Efecto real |
| --- | --- | --- |
| `varPuedeVerTodoFDI` | ✅ | `scrMisCotizaciones` y `scrGenerarPedido`: admin/coord ven **todo**; el resto solo `VendedoresLookUp.Id = miId`. |
| `varVendedorActualFDI` | ✅ | Identidad del vendedor para el filtro "mis cotizaciones". |
| `varEsAdminFDI` | ❌ | Definida, **nunca consumida**. |
| `varEsCoordinadorFDI` | ❌ | Definida; solo `scrCorreo` hace su propio `LookUp(Cotizadores, Puesto="Coordinador")` para el correo. |
| `varPuedeAsignarFDI` | ❌ | Definida, **nunca consumida**. |
| `varPuedeEditarMaestrosFDI` | ❌ | Definida, **nunca consumida**. |
| `varRolFDI`, `varEsUsuarioFDI` | ❌ | Solo se definen. |

**Botón "Asignar/Iniciar"** (`scrMisCotizaciones`): se controla **solo por estado**, sin rol:
`DisplayMode = If(Estado="Enviada a cliente" Or !IsBlank(AsignadoSnapShot), Disabled, Edit)`.
Aprobar/Rechazar (vendedor): sin guarda de rol/identidad. `scrInicio` no filtra el menú por rol.

**Conclusión:** en la práctica el único privilegio diferenciado es **"ver todo" vs "ver lo mío"**.
No hay un rol "ingeniero técnico-comercial" (el asignado se guarda como `AsignadoSnapShot`, sin
restringir quién puede serlo).

---

## 2. Problemas a resolver

1. 🔴 **El filtrado por rol es cosmético, no seguridad.** Es un `Filter()` cliente sobre la lista.
   Un usuario con acceso a `Cotizaciones 2026` puede leer/editar todo por otra vía. La seguridad
   real vive en la capa de datos (ver §3.6 / D1).
2. 🔴 **Capacidades declaradas pero sin cablear** (`asignar`, `editar maestros`, `admin`,
   `coordinador`): falsa sensación de RBAC y deriva. Hay que **cablearlas o eliminarlas**.
3. 🟠 **Postura permisiva por defecto** (`varEsUsuarioFDI = hay email`, sin gating de menú).
   Pasar a **default-deny**.
4. 🟠 **Matching de rol frágil** por texto exacto del choice `Puesto`. Un typo degrada en silencio.
5. 🟡 **Dos identidades paralelas** (`Cotizadores.Puesto` y `Vendedores`) sin relación explícita.
6. 🟡 **Falta el rol "ingeniero"**, protagonista del flujo.

---

## 3. Diseño objetivo

### 3.1 Entidades

- **`Cotizadores`** (refinada): registro único de usuarios de la app. Define el **rol**.
- **`Vendedores`** (se mantiene): entidad de negocio (vendedor ↔ cotización). **No** se fusiona en
  `Puesto`; un vendedor también debe existir en `Cotizadores` (normalmente Puesto = `Usuario`).
- **`Permisos`** (NUEVA): matriz **rol → capacidad** como datos, editable por un admin **sin
  republicar** la app. Es la "lista de permisos" a desarrollar.

### 3.2 Listas exactas

**`Cotizadores`** (refinar)

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Nombre` | Persona | Usuario. Indexar el correo si es posible. |
| `Puesto` | Choice | Valores controlados: `Administrador`, `Coordinador`, `Ingeniero`, `Usuario`. |
| `Activo` | Sí/No | Default-deny: `false` ⇒ sin acceso (no caer a "Usuario"). |

**`Permisos`** (nueva — matriz rol→capacidad)

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Rol` | Choice | Igual que `Puesto` (`Administrador`/`Coordinador`/`Ingeniero`/`Usuario`). Clave. |
| `PuedeVerTodo` | Sí/No | Ver todas las cotizaciones (no solo las propias). |
| `PuedeAsignar` | Sí/No | Asignar cotizaciones a un ingeniero. |
| `PuedeTrabajar` | Sí/No | Capturar/editar sistemas de una cotización asignada. |
| `PuedeAprobar` | Sí/No | Aprobar/Rechazar la revisión (rol vendedor/coordinador). |
| `PuedeEnviarCliente` | Sí/No | Marcar "Enviada a cliente". |
| `PuedeEditarMaestros` | Sí/No | Editar catálogos (colores, listas, etc.). |
| `PuedeAdministrar` | Sí/No | Gestionar `Cotizadores`/`Permisos`. |

> Alternativa más simple (ver **D2**): no crear `Permisos` y fijar la matriz en `OnStart`. Pierdes
> la edición sin republicar.

### 3.3 Matriz rol → capacidad (propuesta inicial)

| Capacidad | Administrador | Coordinador | Ingeniero | Vendedor* | Usuario |
| --- | :---: | :---: | :---: | :---: | :---: |
| Ver todas las cotizaciones | ✓ | ✓ | solo asignadas | solo suyas | ✗ |
| Asignar a ingeniero | ✓ | ✓ | ✗ | ✗ | ✗ |
| Trabajar/editar sistemas | ✓ | ✓ | ✓ (asignado) | ✗ | ✗ |
| Enviar a revisión de vendedor | ✓ | ✓ | ✓ | ✗ | ✗ |
| Aprobar / Rechazar revisión | ✓ | (D5) | ✗ | ✓ (suya) | ✗ |
| Enviar a cliente | ✓ | ✓ | (D5) | (D5) | ✗ |
| Editar catálogos / maestros | ✓ | ✗ | ✗ | ✗ | ✗ |
| Administrar usuarios / roles | ✓ | ✗ | ✗ | ✗ | ✗ |

\* **Vendedor** no es un `Puesto`: es la pertenencia a `Vendedores`. Se cruza con el rol (un
ingeniero puede además ser vendedor de otra cotización). "Ver lo suyo" y "Aprobar lo suyo" se
resuelven por `VendedoresLookUp.Id = varVendedorActualFDI.ID`, no por la matriz.

### 3.4 Lógica en `OnStart` (propuesta)

```powerapps
// 1) Identidad
Set(varUserEmail, Lower(User().Email));
Set(varCotizadorFDI,
    LookUp(Cotizadores, Lower(Nombre.Email) = varUserEmail && Activo = true));

// 2) Rol (default-deny: sin registro activo => "SinAcceso", NO "Usuario")
Set(varRolFDI, Coalesce(varCotizadorFDI.Puesto.Value, "SinAcceso"));
Set(varTieneAccesoFDI, Not(IsBlank(varCotizadorFDI)));

// 3) Capacidades desde la matriz Permisos (una fila por rol)
Set(varPermFDI, LookUp(Permisos, Rol.Value = varRolFDI));
Set(varCaps, {
    PuedeVerTodo:        Coalesce(varPermFDI.PuedeVerTodo, false),
    PuedeAsignar:        Coalesce(varPermFDI.PuedeAsignar, false),
    PuedeTrabajar:       Coalesce(varPermFDI.PuedeTrabajar, false),
    PuedeAprobar:        Coalesce(varPermFDI.PuedeAprobar, false),
    PuedeEnviarCliente:  Coalesce(varPermFDI.PuedeEnviarCliente, false),
    PuedeEditarMaestros: Coalesce(varPermFDI.PuedeEditarMaestros, false),
    PuedeAdministrar:    Coalesce(varPermFDI.PuedeAdministrar, false)
});

// 4) Vendedor (ownership de fila; se mantiene)
Set(varVendedorActualFDI,
    LookUp(Vendedores, Lower(Vendedor.Email) = varUserEmail && Activo = true));
```

Gating en controles: usar `varCaps.PuedeX` (y `varTieneAccesoFDI`) en `Visible` / `DisplayMode` /
`OnSelect`, no las variables sueltas. Una sola fuente, fácil de auditar.

### 3.5 Dónde cablear cada guarda (mapa de cableado)

| Control / acción | Pantalla | Guarda objetivo |
| --- | --- | --- |
| Mosaicos de menú | `scrInicio` | `Visible` por capacidad (p. ej. "Pedidos" si `PuedeVerTodo`; "Catálogos" si `PuedeEditarMaestros`). |
| `AsignarButton` "Asignar/Iniciar" | `scrMisCotizaciones` | Agregar `&& varCaps.PuedeAsignar` al `DisplayMode` actual (estado). |
| `AprobaciónButton` / `RechazarButton` | `scrMisCotizaciones` | `Visible/DisplayMode` = vendedor de **esta** cotización **o** `PuedeAprobar`. |
| Captura/edición de sistemas | `scrFDI` / `scrDiseñoSistema` | `DisplayMode` = `PuedeTrabajar` **y** es el asignado. |
| Enviar a cliente | (donde aplique) | `PuedeEnviarCliente`. |
| Edición de catálogos/colores | (maestros) | `PuedeEditarMaestros`. |
| Filtro de galería | `scrMisCotizaciones` / `scrGenerarPedido` | Mantener `PuedeVerTodo` ? todo : propias **+ respaldo de datos (§3.6)**. |
| Pantalla "No autorizado" | nueva (D6) | Si `!varTieneAccesoFDI`, redirigir y bloquear el resto. |

### 3.6 Seguridad a nivel de datos (clave — ver D1)

El gating de UI es **necesario pero no suficiente**. Para confidencialidad real:

- **Restringir permisos** de las listas: el usuario final no debería tener edición directa a
  `Cotizaciones 2026` / listas de sistemas salvo vía la app (idealmente la app corre con una
  identidad/rol con permisos acotados, o se usan permisos a nivel de item).
- Si una cotización **no debe** ser visible para otros vendedores, el `Filter()` cliente **no basta**:
  hace falta **permiso a nivel de item** (romper herencia por vendedor) o un origen ya recortado
  por el servidor. Decидir en **D1**.
- Mantener el filtro de UI igual (UX), pero entender que es conveniencia, no frontera.

---

## 4. Proceso (gobernanza)

- **Alta de usuario:** un `Administrador` agrega la persona a `Cotizadores` con su `Puesto` y
  `Activo = true`. Si además vende, agregarla a `Vendedores` (`Activo = true`).
- **Baja / cambio de rol:** poner `Activo = false` o cambiar `Puesto`. **Surte efecto al reiniciar
  la app** (los roles se calculan en `OnStart`); documentarlo para el usuario.
- **Gestión de la matriz `Permisos`:** solo `Administrador`. Editar capacidades por rol sin
  republicar (si se adopta la lista; D2).
- **Gestión:** ¿pantalla admin dentro de la app o se administra directo en SharePoint? (**D7**).
- **Auditoría (opcional):** registrar cambios de rol/capacidad (quién, cuándo) en una lista o en la
  Bitácora.

---

## 5. Decisiones abiertas (resolver antes de implementar)

| # | Decisión | Recomendación |
| --- | --- | --- |
| **D1** | **¿Seguridad real a nivel de datos** (permisos de item en SharePoint) **o solo UI?** | **En capas:** gating de UI siempre; si hay confidencialidad entre vendedores, además permiso a nivel de item / origen recortado. No depender solo del `Filter()`. |
| **D2** | **¿`Permisos` como lista-matriz** editable, o mapping fijo en `OnStart`? | Lista-matriz (lo que pediste: editable sin republicar). |
| **D3** | **¿Vendedor** se fusiona en `Puesto` o se mantiene lista aparte? | Mantener `Vendedores` aparte (entidad ligada a cotizaciones); documentar la relación. |
| **D4** | **¿Qué puede un `Usuario`** sin rol asignado? | Default-deny: nada salvo, a lo sumo, ver lo suyo como vendedor. |
| **D5** | **Casos finos:** ¿el coordinador también aprueba? ¿quién envía a cliente? ¿el ingeniero ve solo lo asignado? | Definir las celdas marcadas (D5) de la matriz §3.3. |
| **D6** | **¿Pantalla "No autorizado"** para quien no está en `Cotizadores`? | Sí (cierra el default-deny de forma visible). |
| **D7** | **Gestión de `Cotizadores`/`Permisos`:** ¿pantalla admin in-app o solo SharePoint? | Empezar en SharePoint; pantalla admin como mejora posterior. |

---

## 6. Backlog para Codex

| ID | Tarea | Prioridad | Depende de |
| --- | --- | --- | --- |
| **P1** | Normalizar `Cotizadores.Puesto` a valores controlados + `Activo`; añadir rol `Ingeniero`. | 🔴 Alta | D3, D5 |
| **P2** | Refactor de `OnStart` a `varCaps` + `varTieneAccesoFDI` (default-deny); eliminar las variables muertas. | 🔴 Alta | D2, D4 |
| **P3** | Crear lista `Permisos` (matriz) y cargarla en `OnStart`. | 🔴 Alta | D2 |
| **P4** | Cablear guardas según §3.5 (menú, asignar, aprobar, maestros, captura). | 🔴 Alta | P2 |
| **P5** | Pantalla/redirección "No autorizado" si `!varTieneAccesoFDI`. | 🟠 Media | D6 |
| **P6** | Seguridad a nivel de datos según D1 (permisos de item / origen recortado). | 🟠 Media | D1 |
| **P7** | Gobernanza: documentar alta/baja y "surte efecto al reiniciar"; auditoría opcional. | 🟡 Baja | D7 |

---

## 7. Fuera de alcance

- **Estados / edit-lock / "Declinada-Perdida":** van en
  [FDI_Cotizaciones_Refinamiento_Backlog.md](FDI_Cotizaciones_Refinamiento_Backlog.md).
- **Cableado de campos a las listas normalizadas:** es el otro handoff en curso.
- Este documento es **solo el sistema de permisos** (lista + lógica + proceso).
