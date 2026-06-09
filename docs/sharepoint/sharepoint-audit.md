# Auditoría de metadata SharePoint - FDI

Fecha UTC: 2026-06-09T16:17:01.2178318Z
Sitio: `https://montillacom.sharepoint.com/sites/Pruebas`
Repositorio: `D:\Documentos\Codex\FDI PowerApp`
Estado de recolección: **pending-pnp-powershell-not-installed**

## Resumen ejecutivo

PnP.PowerShell no está instalado en este entorno, por lo que no se pudo leer metadata del sitio. Se generaron los archivos requeridos con estado pendiente y referencias locales conocidas para que el inventario quede reproducible.

- Listas/bibliotecas analizadas desde SharePoint: 0
- Columnas analizadas: 0
- Vistas analizadas: 0
- Índices existentes detectados: 0
- Listas/bibliotecas referenciadas por el repositorio local: 17
- SharePoint no fue modificado; el script solo consulta metadata.

## Resumen de listas encontradas

- Total: 0
- Visibles: 0
- Ocultas: 0
- Bibliotecas: 0
- Sin elementos: 0
- Con 4,000+ elementos: 0

## Listas visibles

_Sin registros._

## Listas ocultas

_Sin registros._

## Bibliotecas

_Sin registros._

## Listas con más elementos

_Sin registros._

## Listas sin elementos

_Sin registros._

## Listas modificadas recientemente

_Sin registros._

## Listas sin modificación reciente

_Sin registros._

## Listas que parecen ser usadas por FDI

No hay clasificación completa desde SharePoint todavía. Referencias locales conocidas:

| Lista | Id local | Uso | Evidencia |
| --- | --- | --- | --- |
| Archivos temporales | 4317d03a-bbcb-4499-a38b-f9de52fad4f8 | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Bitácora cotizaciones | 17b0c42e-7e8e-4ec1-a4ff-5af81bfaffef | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Carpeta cotizaciones | dd92d2ae-9940-483d-bf7e-2ee98b44cdce | Usada por ambos | CanvasApps\mapc_fdi_412ec.meta.xml |
| Ciudades_List | 35eddcdf-8e27-40b6-9bb9-b48778aa58f9 | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Clientes | f809a810-7437-4954-a05f-b54caf36b513 | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Contactos | 329f8d14-4e21-4dcc-8290-43dea25d3d79 | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Cotizaciones 2026 | 53f4e788-fbb6-4deb-8fcf-965eb4db0c1e | Usada por ambos | CanvasApps\mapc_fdi_412ec.meta.xml |
| Cotizadores | 837625fc-7d49-43a7-9770-93b53d52d315 | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Estados_List | 375d2f90-272e-4d0a-9651-18bb6fe91d60 | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Folios cotizaciones | ca971715-be3b-4473-acb7-6f3510659512 | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Países_List | 8fc728a7-a822-4ad1-a7d5-fb4d576a112b | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Países_List_1 | 8fc728a7-a822-4ad1-a7d5-fb4d576a112b | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Sistema Otro | 80069fdc-2de1-4c95-a88b-02770ca25959 | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Sistema selectivo | e3e8a735-179b-4919-9994-9f30890abfcb | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Sistemas por cotización | b1ee600e-adc7-481e-99ab-aeda6eddd7a1 | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Solicitudes en cotizaciones | 8296726a-6803-4a44-b972-9ae5b75d94fe | Usada por Canvas App | CanvasApps\mapc_fdi_412ec.meta.xml |
| Vendedores | abb99ba0-3753-499b-b9b0-342ef7c361ba | Usada por ambos | CanvasApps\mapc_fdi_412ec.meta.xml |

## Listas que parecen no ser usadas por FDI

_Sin registros._

## Listas candidatas a revisión para posible eliminación

No se borra nada. Esta sección solo clasifica evidencia.

_Sin registros._

## Columnas críticas para filtros/delegación

| Lista | Columna | Prioridad | Estado | Razón |
| --- | --- | --- | --- | --- |
| Cotizaciones 2026 | Created | P0 | Columna no confirmada | Filtro base delegable actual para evitar list view threshold. |
| Cotizaciones 2026 | Estado | P0 | Columna no confirmada | Filtro funcional frecuente por estado de cotización. |
| Cotizaciones 2026 | VendedoresLookUp | P1 | Columna no confirmada | Filtro de Mis Cotizaciones por vendedor. |
| Cotizaciones 2026 | Folio | P1 | Columna no confirmada | Búsqueda y navegación por folio. |
| Cotizaciones 2026 | Modified | P2 | Columna no confirmada | Filtro alterno para ventana móvil de 18 meses o auditoría reciente. |
| Solicitudes en cotizaciones | FolioLookUp | P1 | Columna no confirmada | Galerías filtradas por folio seleccionado. |
| Solicitudes en cotizaciones | Estado | P2 | Columna no confirmada | Seguimiento y vistas por estado de solicitud. |
| Bitácora cotizaciones | FolioLookUp | P1 | Columna no confirmada | Lectura de bitácora por cotización seleccionada. |
| Carpeta cotizaciones | Modified | P2 | Columna no confirmada | Biblioteca consultada por documentos recientes; validar columnas indexables reales. |
| Clientes | Title | P2 | Columna no confirmada | Búsqueda/ordenamiento de directorio. |
| Clientes | Activo | P2 | Columna no confirmada | Filtro de clientes activos. |
| Contactos | Title | P2 | Columna no confirmada | Búsqueda de directorio. |
| Contactos | ClienteLookUp | P2 | Columna no confirmada | Relación frecuente contacto-cliente. |

## Índices faltantes recomendados

| Lista | Columna | Prioridad | Estado | Razón |
| --- | --- | --- | --- | --- |
| Cotizaciones 2026 | Created | P0 | Columna no confirmada | Filtro base delegable actual para evitar list view threshold. |
| Cotizaciones 2026 | Estado | P0 | Columna no confirmada | Filtro funcional frecuente por estado de cotización. |
| Cotizaciones 2026 | VendedoresLookUp | P1 | Columna no confirmada | Filtro de Mis Cotizaciones por vendedor. |
| Cotizaciones 2026 | Folio | P1 | Columna no confirmada | Búsqueda y navegación por folio. |
| Cotizaciones 2026 | Modified | P2 | Columna no confirmada | Filtro alterno para ventana móvil de 18 meses o auditoría reciente. |
| Solicitudes en cotizaciones | FolioLookUp | P1 | Columna no confirmada | Galerías filtradas por folio seleccionado. |
| Solicitudes en cotizaciones | Estado | P2 | Columna no confirmada | Seguimiento y vistas por estado de solicitud. |
| Bitácora cotizaciones | FolioLookUp | P1 | Columna no confirmada | Lectura de bitácora por cotización seleccionada. |
| Carpeta cotizaciones | Modified | P2 | Columna no confirmada | Biblioteca consultada por documentos recientes; validar columnas indexables reales. |
| Clientes | Title | P2 | Columna no confirmada | Búsqueda/ordenamiento de directorio. |
| Clientes | Activo | P2 | Columna no confirmada | Filtro de clientes activos. |
| Contactos | Title | P2 | Columna no confirmada | Búsqueda de directorio. |
| Contactos | ClienteLookUp | P2 | Columna no confirmada | Relación frecuente contacto-cliente. |

## Riesgos de list view threshold

Sin metadata de conteo suficiente o sin listas por encima de 4,000 elementos.

## Observaciones de seguridad o datos sensibles

- No se descargan registros de negocio ni adjuntos; solo metadata de listas, columnas, vistas e índices.
- Las listas con nombres como `Cotizaciones`, `Clientes`, `Contactos`, `Solicitudes`, `Bitácora` o bibliotecas de archivos deben tratarse como sensibles aunque el inventario no incluya datos.
- Las candidatas a limpieza no deben eliminarse sin dueño, respaldo y aprobación explícita.

## Instrucciones de ejecución

Instalar PnP.PowerShell si falta:

```powershell
Install-Module PnP.PowerShell -Scope CurrentUser
```

Ejecutar exportación interactiva:

```powershell
.\scripts\export-sharepoint-metadata.ps1 -SiteUrl "https://montillacom.sharepoint.com/sites/Pruebas"
```

El script vuelve a generar `docs/sharepoint/sharepoint-schema.json`, CSVs, auditoría y candidatas.
