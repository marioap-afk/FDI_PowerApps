# Arquitectura propuesta de permisos por usuario para FDI

Fecha: 2026-06-11

## Objetivo

Controlar acceso, visibilidad y acciones dentro de la Canvas App FDI usando el correo del usuario autenticado con `User().Email`, sin cambiar todavia la logica funcional de la app.

## Estado actual encontrado

La aplicacion no tiene un modelo global de permisos. El correo del usuario se usa de forma puntual, principalmente para identificar al creador de borradores y para bitacora:

- `scrFDI`: busca borrador con `Estado.Value = "Borrador" && 'Created By'.Email = User().Email`.
- `scrGenerarFolio`: usa el mismo criterio para editar el borrador del usuario.
- `scrMisCotizaciones`: registra bitacora con `User().FullName` y `User().Email` en varias acciones de revision, evidencia, solicitudes y asignacion.
- `scrCorreo`: usa `Cotizadores` para encontrar `Puesto.Value = "Coordinador"` y armar destinatario/CC, pero no usa eso como permiso de aplicacion.
- `scrInicio`: permite navegar a todas las pantallas sin condicion de rol.

Listas maestras ya conectadas relevantes:

- `Vendedores`: usada en `scrFDI` y filtros de `scrMisCotizaciones`. La app expone campos `Title`, `Vendedor` y `Activo`.
- `Cotizadores`: usada en `scrCorreo` y asignacion en `scrMisCotizaciones`. La app usa `Nombre` como persona y `Puesto.Value`, incluyendo `Coordinador`.
- `Cotizaciones 2026`: contiene `VendedoresLookUp`, `AsignadoPersona`, `AsignadoSnapShot`, `Estado`, `Created By`, `FolderPath` y campos de seguimiento.

## Arquitectura recomendada

Usar una capa ligera de permisos en Power Apps basada en variables globales calculadas al iniciar la app. La fuente de verdad debe ser una lista maestra unica de permisos o, en una fase inicial, las listas existentes `Vendedores` y `Cotizadores`.

### Roles

| Rol | Alcance propuesto | Visibilidad de datos | Acciones |
| --- | --- | --- | --- |
| Usuario normal | Vendedor/solicitante comercial | Solo cotizaciones propias o asociadas a su registro de vendedor | Crear FDI, generar folio, ver sus cotizaciones, anexar evidencia permitida |
| Coordinador | Coordinacion de cotizacion | Todas las cotizaciones operativas | Asignar cotizador, revisar, solicitar informacion, ver bitacora y archivos |
| Administrador | Administracion funcional | Todo | Gestionar maestros, ver todo, cambiar configuraciones y acceder a acciones sensibles |

## Listas y campos requeridos

### Opcion preferida: nueva lista `Usuarios FDI`

Esta opcion reduce ambiguedad y evita mezclar roles de negocio con listas operativas.

Campos sugeridos:

| Campo | Tipo | Requerido | Indice | Uso |
| --- | --- | --- | --- | --- |
| `Title` | Texto | Si | No | Nombre visible |
| `Usuario` | Persona | Si | Si | Identidad principal |
| `EmailNormalizado` | Texto una linea | Si | Si, unico si es viable | Comparacion delegable y estable con `Lower(User().Email)` |
| `Rol` | Choice: `Usuario`, `Coordinador`, `Administrador` | Si | Si | Rol principal |
| `Activo` | Si/No | Si | Si | Baja logica |
| `VendedorRelacionado` | Lookup a `Vendedores` | No | Si | Vincula usuario normal con vendedor comercial |
| `PuedeVerTodo` | Si/No | No | No | Excepcion controlada |
| `PuedeAsignar` | Si/No | No | No | Acceso granular a asignacion |
| `PuedeEditarMaestros` | Si/No | No | No | Clientes/contactos/catalogos |
| `Observaciones` | Texto multilinea | No | No | Auditoria funcional |

### Opcion minima sin nueva lista

Reutilizar:

- `Vendedores`: usuario normal si existe registro activo donde `Vendedor.Email = User().Email`.
- `Cotizadores`: coordinador si existe registro donde `Nombre.Email = User().Email && Puesto.Value = "Coordinador"`.
- Administrador: agregar una opcion `Administrador` en `Cotizadores.Puesto` o mantener una lista pequena separada solo para administradores.

Esta opcion requiere menos schema, pero es mas fragil porque `Cotizadores.Puesto` ya se usa para destinatarios de correo y no necesariamente representa permisos de app.

## Variables globales sugeridas

Calcular en `App.OnStart` o en una rutina equivalente al cargar `scrInicio`:

```powerfx
Set(varUserEmail, Lower(User().Email));
Set(varUserDisplayName, User().FullName);

Set(
    varVendedorActual,
    LookUp(Vendedores, Activo = true && Lower(Vendedor.Email) = varUserEmail)
);

Set(
    varCotizadorActual,
    LookUp(Cotizadores, Lower(Nombre.Email) = varUserEmail)
);

Set(
    varPermisoFDI,
    LookUp('Usuarios FDI', Activo = true && EmailNormalizado = varUserEmail)
);

Set(
    varRolFDI,
    Coalesce(
        varPermisoFDI.Rol.Value,
        If(
            !IsBlank(varCotizadorActual) && varCotizadorActual.Puesto.Value = "Coordinador",
            "Coordinador",
            If(!IsBlank(varVendedorActual), "Usuario", "Sin acceso")
        )
    )
);

Set(varEsAdminFDI, varRolFDI = "Administrador");
Set(varEsCoordinadorFDI, varRolFDI = "Coordinador" || varEsAdminFDI);
Set(varEsUsuarioFDI, varRolFDI = "Usuario" || varEsCoordinadorFDI || varEsAdminFDI);
Set(varPuedeVerTodoFDI, varEsCoordinadorFDI || Coalesce(varPermisoFDI.PuedeVerTodo, false));
Set(varPuedeAsignarFDI, varEsCoordinadorFDI || Coalesce(varPermisoFDI.PuedeAsignar, false));
Set(varPuedeEditarMaestrosFDI, varEsAdminFDI || Coalesce(varPermisoFDI.PuedeEditarMaestros, false));
```

Nota tecnica: evitar `Lower()` sobre columnas de SharePoint dentro de filtros grandes. Para listas pequenas de permisos puede ser aceptable; para listas grandes conviene `EmailNormalizado` indexado.

## Pantallas afectadas

| Pantalla | Cambio recomendado |
| --- | --- |
| `scrInicio` | Ocultar/deshabilitar tarjetas segun rol. No mostrar accesos que el usuario no puede usar. |
| `scrFDI` | Permitir a usuario normal crear/editar su borrador. Si el usuario tiene vendedor activo, preseleccionar o bloquear `VendedoresLookUp` a su vendedor. |
| `scrGenerarFolio` | Mantener borrador propio para usuario normal. Coordinador/admin podrian ver todos si se requiere. |
| `scrMisCotizaciones` | Aplicar filtro base por rol en `CotizacionesGallery.Items`. Botones de asignacion/revision deben depender de permisos. |
| `scrGenerarPedido` | Usuario normal solo ve cotizaciones compradas propias/asociadas. Coordinador/admin ven todas. |
| `scrContactosClientes` | Usuario normal lectura o edicion limitada; administrador puede crear/editar/desactivar clientes/contactos. |
| `scrCorreo` | No cambiar contrato del flow. Validar que el usuario tenga acceso a `varCotizacionFinal` antes de enviar. |

## Filtro base recomendado para cotizaciones

Para evitar threshold, mantener siempre un filtro delegable inicial por fecha/estado y luego aplicar alcance de usuario:

```powerfx
With(
    {
        baseCotizaciones: Filter(
            'Cotizaciones 2026',
            Created >= Date(Year(Today()), 1, 1)
        )
    },
    If(
        varPuedeVerTodoFDI,
        baseCotizaciones,
        Filter(
            baseCotizaciones,
            VendedoresLookUp.Id = varVendedorActual.ID
                || 'Created By'.Email = User().Email
                || AsignadoPersona.Email = User().Email
        )
    )
)
```

Si `OR` sobre personas/lookups dispara advertencias de delegacion, priorizar `VendedoresLookUp.Id = varVendedorActual.ID` para usuario normal y dejar `Created By` solo para borradores.

## Riesgos

- Visibilidad en Canvas no es seguridad real. Si hay informacion sensible, se deben reforzar permisos en SharePoint o mover operaciones sensibles a flows que validen el usuario.
- Los flows con conexiones compartidas pueden ejecutar con privilegios del propietario si no se configuran como run-only user connection. Debe revisarse antes de considerar esto seguridad fuerte.
- Comparaciones con `Lower(campo.Email)` no son delegables. Usar correo normalizado en lista chica de permisos y lookup numerico para cotizaciones.
- Usuarios sin registro en `Vendedores`, `Cotizadores` o `Usuarios FDI` quedarian en `Sin acceso`.
- Cotizaciones antiguas sin `VendedoresLookUp` o sin `AsignadoPersona` podrian desaparecer para usuarios normales si no se define regla de fallback.
- Administrador debe tener un mecanismo de bootstrap para no bloquear a todos por error.

## Orden de implementacion recomendado

1. Confirmar si se permite crear lista `Usuarios FDI`. Si no, usar modo minimo con `Vendedores` y `Cotizadores`.
2. Definir matriz de roles con negocio: que puede ver y que puede accionar cada rol.
3. Agregar variables globales de identidad/rol en `App.OnStart` o carga de `scrInicio`.
4. Proteger `scrInicio` con tarjetas visibles por rol.
5. Ajustar `scrMisCotizaciones.CotizacionesGallery.Items` con filtro base por rol y validar delegacion.
6. Ajustar botones sensibles en `scrMisCotizaciones`: asignar, enviar a revision, aprobar/rechazar, comprar, agregar archivos.
7. Ajustar `scrFDI` y `scrGenerarFolio` para vendedor por defecto y borrador propio.
8. Ajustar `scrContactosClientes` a lectura para usuario normal y edicion para administrador.
9. Revisar flows criticos para validar caller cuando sea necesario.
10. Probar con tres cuentas reales: usuario normal, coordinador y administrador.

## Recomendacion final

La implementacion mas sana es crear `Usuarios FDI` como lista de permisos pequena, indexada por `EmailNormalizado`, y usar `Vendedores` solo para relacion comercial. Si se necesita una fase rapida, se puede arrancar con `Vendedores` + `Cotizadores.Puesto`, pero conviene migrar a la lista dedicada antes de usar permisos para datos sensibles.
