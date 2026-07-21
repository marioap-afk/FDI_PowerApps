# FDI SharePoint — listas y campos de permisos (RBAC)

Referencia para **crear** las dos listas SharePoint del control de acceso por roles
(`Usuarios`, `Permisos`). Cada lista queda definida de forma **exacta** (todas sus columnas),
en el mismo formato que [FDI_System_Lists_Field_Reference.md](FDI_System_Lists_Field_Reference.md).

Derivado del diseño [docs/FDI_Permisos_Usuario_Design.md](../FDI_Permisos_Usuario_Design.md)
(§3.2 esquema, §3.3 taxonomía/matriz). **Ya implementadas** en el provisioning
`scripts/create-fdi-sharepoint-lists.ps1` (grupo `$rbac`); este doc es la referencia humana.

> **Fuera de alcance aquí:** las listas de captura de sistemas y las de cotizaciones (se
> documentan en sus propios reference docs).

## Modelo

| Lista | Propósito |
| --- | --- |
| `Usuarios` | Maestro de identidad. Una fila por persona (auto-registro al abrir la app). Define **roles** (multi) y el atributo **`EsVendedor`**. |
| `Permisos` | Matriz **rol → capacidad**. Una fila por rol. Es **datos**: las celdas se ajustan sin tocar la app. |

## Regla de tipos

| Tipo usado aquí | Tipo SharePoint | Nota |
| --- | --- | --- |
| Texto | Una línea de texto | Correo, notas cortas. |
| Texto multilínea | Varias líneas (sin formato) | Comentarios del admin. |
| Booleano | Sí/No | Capacidades y `EsVendedor`. |
| Opción | Choice | Conjunto controlado (`Estado`, `Rol`). |
| Opción (multi) | Choice de selección múltiple | `Roles` (un usuario puede tener varios). |

`Title` (la columna por defecto de SharePoint) se reutiliza como **nombre del usuario** en
`Usuarios`. Internal name = display name (sin acentos ni espacios) para que las fórmulas del
`OnStart` queden limpias.

## Taxonomía de roles (valores de `Roles` y de `Permisos.Rol`)

`Admin`, `Gerencia técnico-comercial`, `Gerencia ventas`, `Gerencia diseño`,
`Coordinador técnico-comercial`, `Coordinador ventas`, `Coordinador diseño`,
`Ingeniero`, `Usuario`.

> **`Vendedor` NO es rol** — es el atributo `EsVendedor` en `Usuarios` (otorga ver/aprobar/enviar
> **lo suyo**, vía `VendedoresLookUp.Id = miId`, resuelto por la app, no por la matriz).

---

## `Usuarios` (maestro de identidad)

| Columna | Tipo | Req. | Indexar | Nota |
| --- | --- | :---: | :---: | --- |
| `Title` | Texto | Sí | No | Nombre completo (`User().FullName` al auto-registrar). |
| `Correo` | Texto | Sí | **Sí** | `Lower(User().Email)`. Clave de búsqueda del `OnStart`. |
| `Roles` | Opción (**multi**) | No | No | Multi-rol; **vacío** al registrarse (queda `Usuario` efectivo). Valores = taxonomía. |
| `EsVendedor` | Booleano | No | No | Sustituye la pertenencia a `Vendedores` para identidad. |
| `Estado` | Opción | No | No | `Pendiente` · `Activo` · `Inactivo`. **Default `Pendiente`** lo escribe la app al auto-registrar. |
| `Comentarios` | Texto multilínea | No | No | Notas del admin (opcional). |

---

## `Permisos` (matriz rol → capacidad)

| Columna | Tipo | Req. | Indexar | Nota |
| --- | --- | :---: | :---: | --- |
| `Rol` | Opción | Sí | **Sí** | Clave. Valores = taxonomía de roles. Una fila por rol. |
| `PuedeVerTodo` | Booleano | No | No | Ver **todas** las cotizaciones (no solo las propias/asignadas). |
| `PuedeAsignar` | Booleano | No | No | Asignar una cotización a un ingeniero. |
| `PuedeTrabajar` | Booleano | No | No | Capturar/editar sistemas de una cotización asignada. |
| `PuedeAprobar` | Booleano | No | No | Aprobar/Rechazar la revisión. |
| `PuedeEnviarCliente` | Booleano | No | No | Marcar "Enviada a cliente". |
| `PuedeEditarMaestros` | Booleano | No | No | Editar catálogos/maestros (colores, listas…). |
| `PuedeAdministrar` | Booleano | No | No | Gestionar `Usuarios`/`Permisos` (admin in-app). |

### Datos semilla de `Permisos` (matriz §3.3 — `*` = propuesta ajustable)

Una fila por rol. `Sí`/`No` por capacidad. `Vendedor` no aparece (es `EsVendedor`). El único valor
**duro confirmado** es **`PuedeEnviarCliente`** (Admin + Coordinador ventas + Gerencia ventas).

| `Rol` | VerTodo | Asignar | Trabajar | Aprobar | EnviarCliente | EditarMaestros | Administrar |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Admin | Sí | Sí | Sí | Sí | **Sí** | Sí | Sí |
| Gerencia técnico-comercial | Sí* | Sí* | No* | Sí* | No | Sí* | No |
| Gerencia ventas | Sí* | No* | No* | Sí* | **Sí** | No* | No |
| Gerencia diseño | Sí* | Sí* | Sí* | No* | No | No* | No |
| Coordinador técnico-comercial | Sí* | Sí* | Sí* | No | No | No | No |
| Coordinador ventas | Sí* | No | No | Sí* | **Sí** | No | No |
| Coordinador diseño | Sí* | Sí* | Sí* | No | No | No | No |
| Ingeniero | No | No | Sí | No | No | No | No |
| Usuario | No | No | No | No | No | No | No |

> Notas: el Ingeniero ve **solo lo asignado** (lo resuelve la app por asignación, no `PuedeVerTodo`).
> `Gerencia ≥ Coordinador de su área` (al menos lo mismo); confirmar los extras de Gerencia al poblar.
> Como es **datos**, cualquier celda `*` se ajusta en la lista sin tocar la app.

## Índices recomendados

| Lista | Columna | Motivo |
| --- | --- | --- |
| `Usuarios` | `Correo` | El `OnStart` hace `LookUp(Usuarios, Lower(Correo) = varUserEmail)`. |
| `Permisos` | `Rol` | Lectura de la matriz por rol. |

## Provisión y siguiente paso

- **Crear:** `scripts/create-fdi-sharepoint-lists.ps1` (grupo `$rbac`) — correr con `-DryRun` primero.
  `-DropExisting` **no** borra estas listas.
- **Poblar `Permisos`** con la tabla semilla de arriba (P1).
- Luego **P2–P4** (Codex): `OnStart` con auto-registro + `varCaps` (unión multi-rol) + `varTieneAccesoFDI`,
  default-deny en `scrInicio`, y cablear las guardas (§3.4/§3.5 del diseño).
