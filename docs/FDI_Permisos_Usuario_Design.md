# FDI — Diseño de permisos de usuario (estado actual + objetivo)

> **Autor:** Claude Release (rol: validar/empaquetar). Esto es **análisis y propuesta de
> diseño**; la implementación es de **Codex**. Base: `App.OnStart`, `scrMisCotizaciones`,
> `scrGenerarPedido`, `scrCorreo` del `.msapp` actual, y el modelo de roles ya validado en
> [FDI_Cotizaciones_Flow.md](FDI_Cotizaciones_Flow.md).
> Cubre las tres piezas pedidas: **lista**, **lógica** y **proceso** de permisos.
> **Decisiones D1–D7 resueltas con el usuario el 2026-06-16** (ver §5).

---

## 1. Estado actual (cómo está hoy)

**Fuente de verdad = dos listas de SharePoint** (no roles de Power Platform ni grupos de Entra):

- **`Cotizadores`** — Persona `Nombre` + Choice **`Puesto`** → define el rol del usuario.
- **`Vendedores`** — Persona `Vendedor` + `Activo` → define si el usuario es vendedor (entidad
  de negocio ligada a `Cotizaciones.VendedoresLookUp`).

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
   Un usuario con acceso a `Cotizaciones` puede leer/editar todo por otra vía. La seguridad
   real vive en la capa de datos (ver §3.6 / D1).
2. 🔴 **Capacidades declaradas pero sin cablear** (`asignar`, `editar maestros`, `admin`,
   `coordinador`): falsa sensación de RBAC y deriva. Hay que **cablearlas o eliminarlas**.
3. 🟠 **Postura permisiva por defecto** (`varEsUsuarioFDI = hay email`, sin gating de menú).
   Pasar a **default-deny**.
4. 🟠 **Matching de rol frágil** por texto exacto del choice `Puesto`. Un typo degrada en silencio.
5. 🟡 **Dos identidades paralelas** (`Cotizadores.Puesto` y `Vendedores`) sin relación explícita.
6. 🟡 **Falta el rol "ingeniero"** y faltan los niveles/áreas reales (coordinador y gerencia por área).

---

## 3. Diseño objetivo

### 3.1 Entidades (D2/D3 resueltas)

- **`Usuarios`** (NUEVA — maestro único de identidad; reemplaza a `Cotizadores`): registro de
  **todos** los que abren la app, con **auto-registro** en el primer ingreso (estado `Pendiente`,
  sin roles). Define **roles** (multi-valor) y el atributo **`EsVendedor`**.
- **`Permisos`** (NUEVA — matriz **rol → capacidad**): editable por un admin **sin republicar**.
- **`Vendedores`** (se mantiene **solo** como el vínculo de negocio vendedor ↔ cotización que ya
  usa `VendedoresLookUp`). **Migrar** a futuro para que apunte a `Usuarios` (tarea P8). La identidad
  y el rol salen de `Usuarios`, no de `Vendedores`.

> **Vendedor NO es un rol/puesto**, es el atributo `EsVendedor` de `Usuarios` (D3). Un usuario
> puede tener **varios roles** a la vez (p. ej. Admin **y** Coordinador ventas) → las capacidades
> son la **unión** de todos sus roles (D5).

### 3.2 Listas exactas

**`Usuarios`** (nueva — maestro de identidad)

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Title` | Texto | Nombre completo (de `User().FullName` al auto-registrar). |
| `Correo` | Texto | `Lower(User().Email)`. Clave de búsqueda; indexar. |
| `Roles` | Choice (**selección múltiple**) | Valores controlados (ver taxonomía §3.3). Vacío al registrarse. |
| `EsVendedor` | Sí/No | Sustituye la pertenencia a `Vendedores` para identidad. |
| `Estado` | Choice | `Pendiente` (auto-registrado, sin permisos), `Activo`, `Inactivo`. |
| `Comentarios` | Texto multilínea | Notas del admin (opcional). |

**`Permisos`** (nueva — matriz rol→capacidad; una fila por rol)

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Rol` | Choice | Igual a los valores de `Usuarios.Roles`. Clave. |
| `PuedeVerTodo` | Sí/No | Ver todas las cotizaciones (no solo las propias). |
| `PuedeAsignar` | Sí/No | Asignar cotizaciones a un ingeniero. |
| `PuedeTrabajar` | Sí/No | Capturar/editar sistemas de una cotización asignada. |
| `PuedeAprobar` | Sí/No | Aprobar/Rechazar la revisión. |
| `PuedeEnviarCliente` | Sí/No | Marcar "Enviada a cliente". |
| `PuedeEditarMaestros` | Sí/No | Editar catálogos (colores, listas, etc.). |
| `PuedeAdministrar` | Sí/No | Gestionar `Usuarios`/`Permisos` (admin in-app). |

> **Provisión (P1):** estas dos listas ya están definidas en `scripts/create-fdi-sharepoint-lists.ps1`
> (grupo `$rbac`: `Usuarios` + `Permisos`). Internal names = display names (sin acentos/espacios).
> `Usuarios.Roles` es **MultiChoice** con la taxonomía §3.3; `Estado` por defecto `Pendiente` lo pone
> la app al auto-registrar (P2). Correr el script (con `-DryRun` primero) crea las listas; luego se
> **puebla `Permisos`** con la matriz §3.3. `-DropExisting` **no** borra `Usuarios`/`Permisos`.

### 3.3 Taxonomía de roles y matriz (D5 resuelta)

**Roles** (dimensión *nivel* × *área*, + operativos):

- **Admin** — acceso **total**.
- **Gerencia técnico-comercial**, **Gerencia ventas**, **Gerencia diseño**.
- **Coordinador técnico-comercial**, **Coordinador ventas**, **Coordinador diseño**.
- **Ingeniero** — operativo (trabaja sistemas asignados).
- **Usuario** — sin permisos (auto-registrado, solo pantalla principal hasta que el admin asigne).
- *(Vendedor = atributo `EsVendedor`, no rol; otorga "ver/aprobar/enviar lo suyo").*

**Matriz propuesta** (✓ = confirmado por el usuario; *prop.* = propuesta inicial ajustable en la
lista `Permisos`). Capacidades = **unión** de los roles del usuario + lo que dé `EsVendedor`.

| Capacidad | Admin | Gerencia (área) | Coord. téc-com | Coord. ventas | Coord. diseño | Ingeniero | Vendedor* | Usuario |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Ver todo | ✓ | ✓ *prop.* | ✓ *prop.* | ✓ *prop.* | ✓ *prop.* | asignadas *prop.* | suyas | ✗ |
| Asignar a ingeniero | ✓ | *prop.* | ✓ *prop.* | ✗ | ✓ *prop.* | ✗ | ✗ | ✗ |
| Trabajar/editar sistemas | ✓ | ✗ *prop.* | *prop.* | ✗ | *prop.* | ✓ (asignado) | ✗ | ✗ |
| Aprobar / Rechazar | ✓ | *prop.* | ✗ | *prop.* | ✗ | ✗ | ✓ (suya) | ✗ |
| **Enviar a cliente** | **✓** | ✗ | ✗ | **✓** | ✗ | ✗ | **✓** | ✗ |
| Editar catálogos / maestros | ✓ | *prop.* | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Administrar usuarios / roles | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

\* **Vendedor** se resuelve por `EsVendedor` + `VendedoresLookUp.Id = miId` (ver/aprobar/enviar **lo
suyo**), no por la matriz. **Enviar a cliente** confirmado: **Vendedor + Coordinador ventas + Admin**.
**Gerencia ≥ Coordinador de su área** (al menos lo mismo); confirmar sus poderes extra al poblar
`Permisos`.

> Como la matriz es **datos**, las celdas *prop.* se ajustan en la lista sin tocar la app. Lo único
> "duro" en código es: Admin = todo, Usuario = nada, y la unión multi-rol.

### 3.4 Lógica en `OnStart` (propuesta, con auto-registro y multi-rol)

```powerapps
// 1) Identidad
Set(varUserEmail, Lower(User().Email));
Set(varUsuarioFDI, LookUp(Usuarios, Lower(Correo) = varUserEmail));

// 2) Auto-registro default-deny: si no existe, crear "Pendiente" sin roles (D2/D4)
If(IsBlank(varUsuarioFDI),
    Patch(Usuarios, Defaults(Usuarios),
        { Title: User().FullName, Correo: varUserEmail,
          Estado: {Value: "Pendiente"}, EsVendedor: false });
    Set(varUsuarioFDI, LookUp(Usuarios, Lower(Correo) = varUserEmail))
);
Set(varTieneAccesoFDI, !IsBlank(varUsuarioFDI) && varUsuarioFDI.Estado.Value = "Activo");

// 3) Roles del usuario (multi) -> capacidades por UNIÓN sobre la matriz Permisos
ClearCollect(colRolesUsuarioFDI, varUsuarioFDI.Roles);   // tabla de roles del usuario
Set(varEsAdminFDI, "Admin" in colRolesUsuarioFDI.Value);
Set(varCaps, {
    PuedeVerTodo:        varEsAdminFDI || CountRows(Filter(Permisos, Rol.Value in colRolesUsuarioFDI.Value && PuedeVerTodo)) > 0,
    PuedeAsignar:        varEsAdminFDI || CountRows(Filter(Permisos, Rol.Value in colRolesUsuarioFDI.Value && PuedeAsignar)) > 0,
    PuedeTrabajar:       varEsAdminFDI || CountRows(Filter(Permisos, Rol.Value in colRolesUsuarioFDI.Value && PuedeTrabajar)) > 0,
    PuedeAprobar:        varEsAdminFDI || CountRows(Filter(Permisos, Rol.Value in colRolesUsuarioFDI.Value && PuedeAprobar)) > 0,
    PuedeEnviarCliente:  varEsAdminFDI || CountRows(Filter(Permisos, Rol.Value in colRolesUsuarioFDI.Value && PuedeEnviarCliente)) > 0,
    PuedeEditarMaestros: varEsAdminFDI || CountRows(Filter(Permisos, Rol.Value in colRolesUsuarioFDI.Value && PuedeEditarMaestros)) > 0,
    PuedeAdministrar:    varEsAdminFDI || CountRows(Filter(Permisos, Rol.Value in colRolesUsuarioFDI.Value && PuedeAdministrar)) > 0
});

// 4) Vendedor (ownership de fila) — desde Usuarios.EsVendedor + el vínculo a cotización
Set(varVendedorActualFDI,
    If(varUsuarioFDI.EsVendedor, LookUp(Vendedores, Lower(Vendedor.Email) = varUserEmail && Activo = true)));
```

> Nota de delegación: `Permisos` y `Usuarios` son pequeñas; cargarlas a colección al inicio evita
> problemas. El `in` sobre colección local es válido localmente.

Gating en controles: usar **`varCaps.PuedeX`**, `varTieneAccesoFDI` y el ownership de vendedor.
Una sola fuente, fácil de auditar.

### 3.5 Dónde cablear cada guarda (mapa de cableado)

| Control / acción | Pantalla | Guarda objetivo |
| --- | --- | --- |
| Acceso a la app | `scrInicio` | Si `!varTieneAccesoFDI` ⇒ solo pantalla principal con aviso "sin permisos, contacta al admin" (D4/D6). |
| Mosaicos de menú | `scrInicio` | `Visible` por capacidad (Pedidos si `PuedeVerTodo`; Catálogos si `PuedeEditarMaestros`; Admin si `PuedeAdministrar`). |
| `AsignarButton` | `scrMisCotizaciones` | Agregar `&& varCaps.PuedeAsignar` al `DisplayMode` actual (estado). |
| `AprobaciónButton`/`RechazarButton` | `scrMisCotizaciones` | Vendedor de **esta** cotización **o** `varCaps.PuedeAprobar`. |
| Captura/edición de sistemas | `scrFDI`/`scrDiseñoSistema` | `DisplayMode` = `varCaps.PuedeTrabajar` **y** es el asignado. |
| **Enviar a cliente** | (donde aplique) | `varCaps.PuedeEnviarCliente` (Vendedor/Coord. ventas/Admin). |
| Edición de catálogos/colores | (maestros) | `varCaps.PuedeEditarMaestros`. |
| **Pantalla Admin in-app** | nueva `scrAdmin` | `varCaps.PuedeAdministrar` (D7). |
| Filtro de galería | `scrMisCotizaciones`/`scrGenerarPedido` | `PuedeVerTodo` ? todo : propias **+ respaldo de datos (§3.6)**. |

### 3.6 Seguridad a nivel de datos (D1 resuelta — enfoque en capas)

**Realidad:** Power Apps usa la **conexión del propio usuario**; el `Filter()` no oculta lo que el
usuario puede leer directo en SharePoint. Por eso, **enfoque en capas**:

1. **Ahora (fácil):** gating de UI default-deny + **acotar los permisos directos** de las listas
   (el usuario común interactúa por la app, no con acceso amplio de edición a `Cotizaciones` y
   listas de sistemas).
2. **Solo si hay regla dura** "un vendedor NO debe ver lo de otro": **permisos a nivel de item**
   (flujo de Power Automate que rompe herencia al crear/asignar y otorga dueño + coordinadores/admin).
   Costo: medio-alto + límite de ~5,000 scopes únicos por lista + mantenimiento. → **Diferido**
   (tarea P6) hasta que exista esa necesidad concreta.

**Decisión:** arrancar con la capa 1; **no** invertir en item-level salvo requerimiento explícito.

---

## 4. Proceso (gobernanza)

- **Primer ingreso:** la app **auto-registra** al usuario en `Usuarios` con `Estado = Pendiente`,
  sin roles. Solo ve la **pantalla principal** con el aviso de "sin permisos" (D4/D6).
- **Otorgar permisos:** un `Admin` (in-app, `scrAdmin`, D7) abre el `Pendiente`, le asigna
  **uno o varios roles** y `EsVendedor` si aplica, y lo pone `Activo`.
- **Baja / cambio:** `Estado = Inactivo` o editar `Roles`. **Surte efecto al reiniciar la app**
  (los roles se calculan en `OnStart`); documentarlo para el usuario.
- **Matriz `Permisos`:** solo `Admin`; ajustar capacidades por rol sin republicar.
- **Auditoría (opcional):** registrar cambios de rol/estado (quién, cuándo).

---

## 5. Decisiones (resueltas 2026-06-16)

| # | Decisión | Resolución |
| --- | --- | --- |
| **D1** | Seguridad real (item-level) vs solo UI | **En capas:** UI default-deny + acotar acceso directo a las listas **ahora**; permisos por item **diferidos** (P6) salvo regla dura de confidencialidad entre vendedores. *(Recomendación de Claude.)* |
| **D2** | `Permisos` como lista editable | **Sí**, lista-matriz. Además, **maestro único `Usuarios`** con **auto-registro** para que el admin otorgue permisos después. *(Recomendación de Claude adoptada.)* |
| **D3** | ¿Vendedor en `Puesto` o aparte? | **Atributo `EsVendedor` en `Usuarios`** (no rol). `Vendedores` queda solo como vínculo a cotización; migrar después (P8). *(Recomendación de Claude.)* |
| **D4** | Qué puede un usuario sin rol | **Solo la pantalla principal**; requiere que el admin le otorgue permisos. |
| **D5** | Taxonomía y celdas finas | Multi-rol (unión). Niveles **Coordinador** y **Gerencia** por **área** (técnico-comercial / ventas / diseño) + **Admin** (total) + **Ingeniero** + Usuario. **Enviar a cliente = Vendedor + Coordinador ventas + Admin.** Gerencia ≥ coordinador de su área. |
| **D6** | Pantalla "No autorizado" | **No** hay pantalla aparte: la **pantalla principal** muestra el aviso y bloquea el resto (se resuelve con D4). |
| **D7** | Gestión de usuarios/roles | **Pantalla Admin in-app** (`scrAdmin`). |

---

## 6. Backlog para Codex

| ID | Tarea | Prioridad | Depende de |
| --- | --- | --- | --- |
| **P1** | Crear lista `Usuarios` (maestro) con `Roles` multi, `EsVendedor`, `Estado`; y lista `Permisos` (matriz). Poblar `Permisos` con la matriz §3.3. | 🔴 Alta | D2,D5 |
| **P2** | `OnStart`: identidad + **auto-registro** `Pendiente` + `varCaps` por **unión multi-rol** + `varTieneAccesoFDI`. Eliminar variables muertas. | 🔴 Alta | P1 |
| **P3** | Default-deny en `scrInicio`: si `!varTieneAccesoFDI`, solo home + aviso "sin permisos". | 🔴 Alta | P2,D4,D6 |
| **P4** | Cablear guardas §3.5 (menú, asignar, aprobar, enviar a cliente, maestros, captura). | 🔴 Alta | P2 |
| **P5** | **Pantalla Admin in-app** (`scrAdmin`): listar `Pendiente`/usuarios, asignar roles/`EsVendedor`/`Estado`, editar `Permisos`. | 🟠 Media | P1,D7 |
| **P6** | Seguridad a nivel de item (Power Automate) — **solo si** se confirma confidencialidad entre vendedores. | 🟢 Condicional | D1 |
| **P7** | Gobernanza: documentar alta/baja y "surte efecto al reiniciar"; auditoría opcional. | 🟡 Baja | — |
| **P8** | Migrar `Cotizaciones.VendedoresLookUp` para referenciar `Usuarios` (retirar dependencia de `Vendedores`). | 🟡 Baja | P1 |

---

## 7. Fuera de alcance

- **Estados / edit-lock / "Declinada-Perdida":** van en
  [FDI_Cotizaciones_Refinamiento_Backlog.md](FDI_Cotizaciones_Refinamiento_Backlog.md).
- **Cableado de campos a las listas normalizadas:** es el otro handoff en curso.
- Este documento es **solo el sistema de permisos** (lista + lógica + proceso).
