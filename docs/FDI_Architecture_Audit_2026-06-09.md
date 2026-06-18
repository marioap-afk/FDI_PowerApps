# Auditoria integral FDI Power Platform

Fecha: 2026-06-09. Alcance: solucion exportada local y Canvas App desempaquetada desde el `.msapp` actual.

## Resumen ejecutivo

- Solucion `FDI` version `1.0.0.1`, publisher prefix `map`.
- Canvas App `FDI` tipo `DesktopOrTablet` con layout 1366x768 `landscape`.
- Inventario: 9 pantallas, 14 componentes, 991 controles, 17 fuentes de datos y 4 workflows.
- App Checker: 320 hallazgos. ParserErrorCount exportado: 1; BindingErrorCount: 0.
- PCF OFR TinyMCE eliminado; permanecen `CodexControls.RichTextAttachments` y `raw_RAW.ColorPicker.ColorPicker`.
- Cambios automaticos recomendados solo cuando sean reversibles, de bajo riesgo y sin cambio funcional visible.

## Fase 1 - Inventario completo

### Pantallas
| Pantalla | Controles | Formulas | Fuentes |
| --- | --- | --- | --- |
| `Screen1` | 20 | 288 | - |
| `scrContactosClientes` | 94 | 802 | `Clientes`, `Contactos` |
| `scrCorreo` | 36 | 418 | `Cotizadores` |
| `scrDise_oSistema` | 41 | 284 | - |
| `scrFDI` | 208 | 3119 | `Bitácora cotizaciones`, `Ciudades_List`, `Clientes`, `Contactos`, `Cotizaciones`, `Estados_List`, `Folios cotizaciones`, `Países_List`, `Sistema Otro`, `Sistema selectivo`, `Sistemas por cotización` |
| `scrGenerarFolio` | 57 | 472 | `Contactos`, `Cotizaciones`, `Folios cotizaciones` |
| `scrGenerarPedido` | 62 | 473 | `Cotizaciones` |
| `scrInicio` | 39 | 418 | - |
| `scrMisCotizaciones` | 404 | 3811 | `Archivos temporales`, `Bitácora cotizaciones`, `Carpeta cotizaciones`, `Cotizaciones`, `Cotizadores`, `Solicitudes en cotizaciones`, `Vendedores` |

### Componentes
| Componente | Controles | Usos |
| --- | --- | --- |
| `cmpCardRich` | 3 | 0 |
| `cmpCardTgl` | 3 | 4 |
| `cmpCardTxt` | 3 | 9 |
| `cmpCarddrp` | 3 | 7 |
| `cmpEncabezado` | 5 | 15 |
| `cmpEncabezadoPrincipal` | 5 | 2 |
| `cmpSVG` | 1 | 0 |
| `cmpbtnBody` | 1 | 3 |
| `cmpbtnBodySec` | 1 | 2 |
| `cmplblbody` | 1 | 4 |
| `cmplblh1` | 1 | 0 |
| `cmplblh2` | 1 | 0 |
| `cmplblh3` | 1 | 4 |
| `cmplbllabel` | 1 | 0 |

### Controles por tipo
| Tipo | Cantidad |
| --- | --- |
| `Text@0.0.51` | 248 |
| `GroupContainer@1.5.0` | 150 |
| `Label@2.5.1` | 122 |
| `TypedDataCard@1.0.7` | 85 |
| `Button@0.0.45` | 83 |
| `TextInput@0.0.54` | 42 |
| `Rectangle@2.3.0` | 38 |
| `CanvasComponent` | 32 |
| `ComboBox@0.0.51` | 27 |
| `Gallery@2.15.0` | 25 |
| `Classic/TextInput@2.3.2` | 23 |
| `Classic/Icon@2.5.0` | 16 |
| `ComboBoxDataField@1.5.0` | 13 |
| `Form@2.4.4` | 9 |
| `Classic/ComboBox@2.4.0` | 9 |
| `DropDown@0.0.45` | 8 |
| `NumberInput@2.9.12` | 8 |
| `Image@2.2.3` | 8 |
| `DatePicker@0.0.46` | 6 |
| `Toggle@1.1.5` | 5 |
| `CodeComponent` | 5 |
| `Classic/Button@2.2.0` | 5 |
| `Icon@0.0.7` | 5 |
| `ModernText@1.0.0` | 5 |
| `Classic/Toggle@2.1.0` | 4 |

### Variables, colecciones y formularios

- Variables globales: 60; posibles sin uso por conteo estatico: ninguna concluyente.
- Variables contextuales: 8.
- Colecciones: 18; posibles sin uso por conteo estatico: ninguna concluyente.
- Formularios detectados: 9.

### Conectores y dependencias
- `SharePoint` (`/providers/microsoft.powerapps/apis/shared_sharepointonline`), acciones: providers/PowerPlatform.Governance/Operations/Read, providers/PowerPlatform.Governance/Operations/Write, fuentes: 17.
- `Office 365 Outlook` (`/providers/microsoft.powerapps/apis/shared_office365`), acciones: SendEmail, fuentes: 2.
- `Usuarios de Office 365` (`/providers/microsoft.powerapps/apis/shared_office365users`), acciones: UserProfile, SearchUser, fuentes: 2.
- `Flujos lógicos` (`/providers/microsoft.powerapps/apis/shared_logicflows`), acciones: Run, fuentes: 1.

### PCF
- Componentes raiz tipo PCF: `CodexControls.RichTextAttachments`.
- DatabaseReferences PCF: `raw_RAW.ColorPicker.ColorPicker`.
- Carpetas `Controls`: `CodexControls.RichTextAttachments`.

### Fuentes de datos SharePoint
| Fuente | Tipo | Escritura | Columnas | URL |
| --- | --- | --- | --- | --- |
| `Archivos temporales` | SharePointList | True | 36 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Archivos temporales/AllItems.aspx |
| `Bitácora cotizaciones` | SharePointList | True | 46 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Bitcora cotizaciones/AllItems.aspx |
| `Carpeta cotizaciones` | SharePointLibrary | True | 52 | https://montillacom.sharepoint.com/sites/Pruebas/Carpeta cotizaciones/Forms/AllItems.aspx |
| `Ciudades_List` | SharePointList | True | 32 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Ciudades_List/AllItems.aspx |
| `Clientes` | SharePointList | True | 33 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Clientes/AllItems.aspx |
| `Contactos` | SharePointList | True | 33 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Contactos/AllItems.aspx |
| `Cotizaciones` | SharePointList | True | 67 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Cotizaciones/AllItems.aspx |
| `Cotizadores` | SharePointList | True | 33 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Cotizadores/AllItems.aspx |
| `Estados_List` | SharePointList | True | 30 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Estados_List/AllItems.aspx |
| `Folios cotizaciones` | SharePointList | True | 29 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/FoliosCotizaciones/AllItems.aspx |
| `Países_List` | SharePointList | True | 28 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Pases_List/AllItems.aspx |
| `Países_List_1` | SharePointList | True | 28 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Pases_List/AllItems.aspx |
| `Sistema Otro` | SharePointList | True | 34 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Sistema Otro/AllItems.aspx |
| `Sistema selectivo` | SharePointList | True | 59 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Sistema selectivo/AllItems.aspx |
| `Sistemas por cotización` | SharePointList | True | 33 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Sistemas por cotizacin/AllItems.aspx |
| `Solicitudes en cotizaciones` | SharePointList | True | 47 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Solicitudes en cotizaciones/AllItems.aspx |
| `Vendedores` | SharePointList | True | 31 | https://montillacom.sharepoint.com/sites/Pruebas/Lists/Vendedores/AllItems.aspx |

### Workflows
| Workflow | Estado export | Triggers | Acciones | Riesgos |
| --- | --- | --- | --- | --- |
| `Correo_Teams_Solicitud_Cotización` | StateCode=1 / StatusCode=2 | manual | 1 | - |
| `Creación_FDI` | StateCode=1 / StatusCode=2 | When_an_item_is_created_or_modified | 3 | Excel, SharePoint |
| `Crear_carpeta_cotización` | StateCode=0 / StatusCode=1 | When_an_item_is_created_or_modified | 2 | SharePoint |
| `Notificación_correo_teams` | StateCode=0 / StatusCode=1 | When_an_item_is_created_or_modified | 3 | SharePoint, Teams |

### Senales de legado/duplicado/experimental
- Screen1 conserva nombre generico; posible pantalla experimental o pendiente de renombrar.
- Países_List y Países_List_1 parecen fuentes duplicadas.

## Fase 2 - App Checker profundo
| Regla | Clasificacion | Nivel | Cantidad | Accion |
| --- | --- | --- | --- | --- |
| `acc-AccessibleLabelNeeded` | Low | Medium | 189 | Documentar o corregir visualmente con pruebas |
| `acc-TabIndexShouldBeDefinedForInteractiveControl` | Low | Medium | 56 | Documentar o corregir visualmente con pruebas |
| `app-SuggestRemoteExecutionHint` | Medium | Medium | 34 | No corregir automaticamente; riesgo de cambio de resultados |
| `app-SuggestRemoteExecutionHint-OpNotSupportedByColumn` | High | Medium | 17 | No corregir automaticamente; riesgo de cambio de resultados |
| `app-UnusedVariables` | Low | Medium | 10 | Candidato a limpieza solo con cero referencias |
| `app-InefficientDelayLoading` | Medium | Medium | 8 | Revisar |
| `acc-FocusBorderShouldBeVisible` | Low | Medium | 2 | Documentar o corregir visualmente con pruebas |
| `app-ScreenHasManyControls` | Medium | Medium | 2 | Revisar |
| `acc-ReadableScreenNameNeeded` | Low | Low | 1 | Documentar o corregir visualmente con pruebas |
| `app-SuggestRemoteExecutionHint-StringMatchSecondParam` | Medium | Medium | 1 | No corregir automaticamente; riesgo de cambio de resultados |

Nota: el SARIF es el `AppCheckerResult.sarif` empaquetado dentro del `.msapp`; no se regenera localmente. La limpieza estatica posterior ya no detecta variables globales ni colecciones sin uso concluyentes.

Modulos con mas hallazgos:
- `scrMisCotizaciones`: 162
- `scrFDI`: 72
- `scrCorreo`: 28
- `scrDiseñoSistema`: 19
- `scrContactosClientes`: 16
- `Screen1`: 9
- `App`: 6
- `cmpEncabezado`: 2
- `cmpCarddrp`: 1
- `cmpCardTxt`: 1

## Fase 3 - Rendimiento
Hotspots por llamadas Power Fx rastreadas:
- `Src\scrFDI.pa.yaml`: 136 llamadas (LookUp=47, Patch=39, CountRows=17, Filter=12, Collect=8, RemoveIf=4, Refresh=3, ForAll=3).
- `Src\scrMisCotizaciones.pa.yaml`: 133 llamadas (Filter=45, Patch=41, CountRows=22, ClearCollect=13, ForAll=5, SubmitForm=3, Navigate=2, SortByColumns=1).
- `Src\scrDise_oSistema.pa.yaml`: 17 llamadas (Patch=17).
- `Src\scrGenerarFolio.pa.yaml`: 15 llamadas (LookUp=8, Patch=2, Filter=2, Refresh=2, SubmitForm=1).
- `Src\scrCorreo.pa.yaml`: 14 llamadas (Collect=5, LookUp=4, CountRows=2, ClearCollect=1, ForAll=1, Filter=1).
- `Src\scrContactosClientes.pa.yaml`: 8 llamadas (SubmitForm=4, Search=2, Filter=2).
- `Src\scrInicio.pa.yaml`: 6 llamadas (Navigate=6).
- `Src\Screen1.pa.yaml`: 5 llamadas (CountRows=2, Collect=2, LookUp=1).

Targets con mas `Patch`:
- `colSEL_Draft`: 18
- `colTheme`: 17
- `Cotizaciones`: 10
- `Bitácora cotizaciones`: 10
- `colListadoTarimas`: 6
- `\r\n        'Cotizaciones`: 5
- `Folios cotizaciones`: 4
- `Solicitudes en cotizaciones`: 4
- `Carpeta cotizaciones`: 3
- `\r\n        'Bitácora cotizaciones`: 3
- `\r\n                'Bitácora cotizaciones`: 3
- `\r\n        'Carpeta cotizaciones`: 3

Targets con mas `ClearCollect`/`Collect`:
- `colDocsCotizaciones`: 5
- `MyPeople`: 4
- `colSegRaw`: 3
- `colTheme`: 2
- `Destinatario`: 2
- `CC`: 2
- `colPuenteGuardado`: 1
- `colListadoPiezas`: 1
- `colListadoTarimas`: 1
- `colElementoSeguridad`: 1
- `colListadoColores`: 1
- `colTabs`: 1

Formulas duplicadas frecuentes (muestra):
- 85x en `Src\scrContactosClientes.pa.yaml:476`, `Src\scrContactosClientes.pa.yaml:536`, `Src\scrContactosClientes.pa.yaml:596`, `Src\scrContactosClientes.pa.yaml:656`: `=And(Parent.Required, Parent.DisplayMode=DisplayMode.Edit)`
- 61x en `Src\scrContactosClientes.pa.yaml:465`, `Src\scrContactosClientes.pa.yaml:525`, `Src\scrContactosClientes.pa.yaml:585`, `Src\scrContactosClientes.pa.yaml:645`: `=And(!IsBlank(Parent.Error), Parent.DisplayMode=DisplayMode.Edit)`
- 58x en `Src\scrContactosClientes.pa.yaml:454`, `Src\scrContactosClientes.pa.yaml:514`, `Src\scrContactosClientes.pa.yaml:574`, `Src\scrContactosClientes.pa.yaml:634`: `=If(IsBlank(Parent.Error), "None", "Error")`
- 39x en `Src\scrContactosClientes.pa.yaml:342`, `Src\scrContactosClientes.pa.yaml:354`, `Src\scrContactosClientes.pa.yaml:365`, `Src\scrFDI.pa.yaml:3096`: `='ButtonCanvas.Appearance'.Transparent`
- 32x en `Src\scrContactosClientes.pa.yaml:452`, `Src\scrContactosClientes.pa.yaml:512`, `Src\scrContactosClientes.pa.yaml:572`, `Src\scrContactosClientes.pa.yaml:632`: `="'TextInputCanvas.Mode'.TextInputModeSingleLine"`
- 24x en `Src\scrFDI.pa.yaml:354`, `Src\scrFDI.pa.yaml:485`, `Src\scrFDI.pa.yaml:606`, `Src\scrFDI.pa.yaml:716`: `=If(IsBlank(Parent.Error), Parent.BorderColor, Color.Red)`
- 24x en `Src\scrFDI.pa.yaml:411`, `Src\scrFDI.pa.yaml:539`, `Src\scrFDI.pa.yaml:652`, `Src\scrFDI.pa.yaml:761`: `=Parent.DisplayMode=DisplayMode.Edit`
- 15x en `Src\scrContactosClientes.pa.yaml:121`, `Src\scrFDI.pa.yaml:2900`, `Src\scrFDI.pa.yaml:4388`, `Src\scrMisCotizaciones.pa.yaml:177`: `=If(ThisItem.IsSelected, FontWeight.Semibold, FontWeight.Normal)`
- 14x en `Src\scrContactosClientes.pa.yaml:133`, `Src\scrContactosClientes.pa.yaml:160`, `Src\scrFDI.pa.yaml:4400`, `Src\scrMisCotizaciones.pa.yaml:2244`: `=(Parent.TemplateHeight / 2) - (Self.Height / 2)`
- 13x en `Src\scrFDI.pa.yaml:379`, `Src\scrFDI.pa.yaml:506`, `Src\scrFDI.pa.yaml:864`, `Src\scrFDI.pa.yaml:1148`: `=If(Self.DisplayMode = DisplayMode.Edit, 5, 0)`

## Fase 4 - Delegacion

- Riesgo medio/alto concentrado en `Search`, `Filter`, `StartsWith` y columnas no soportadas como `Folder path`.
- Para 10,000+ registros, preferir filtros por columnas indexadas (`ID`, lookup id, estado, fechas) y cache local cuando ya exista carga oficial.
- No se corrigen automaticamente formulas de delegacion porque pueden cambiar resultados visibles.

## Fase 5 - SharePoint
| Fuente | Indices recomendados |
| --- | --- |
| `Cotizaciones` | `ID`, `Folio`, `Estatus`, `Created`, `Modified`, `ClienteLookUp`, `CotizadorLookUp` |
| `Sistema selectivo` | `ID`, `Title`, `Modified` |
| `Países_List` | `ID`, `Title`, `Modified` |
| `Folios cotizaciones` | `ID`, `Title`, `Modified` |
| `Sistemas por cotización` | `ID`, `Title`, `Modified` |
| `Clientes` | `ID`, `Title`, `Nombre`, `Correo`, `Modified` |
| `Contactos` | `ID`, `Title`, `Nombre`, `Correo`, `Modified` |
| `Vendedores` | `ID`, `Title`, `Modified` |
| `Cotizadores` | `ID`, `Title`, `Modified` |
| `Carpeta cotizaciones` | `ID`, `Title`, `Folder path`, `Esactual?`, `En revision?`, `Estado de revision`, `Modified` |
| `Archivos temporales` | `ID`, `Title`, `Modified` |
| `Bitácora cotizaciones` | `ID`, `FolioLookUp`, `Created`, `Modified`, `Tipo` |
| `Solicitudes en cotizaciones` | `ID`, `FolioLookUp`, `Created`, `Modified`, `Estatus` |
| `Sistema Otro` | `ID`, `Title`, `Modified` |
| `Estados_List` | `ID`, `Title`, `Modified` |
| `Ciudades_List` | `ID`, `Title`, `Modified` |

Riesgos: umbral de 5,000 elementos, filtros por campos no indexados, `Folder path` no delegable, bibliotecas con crecimiento y concurrencia sobre folios/documentos.

## Fase 6 - Power Automate
- `Correo_Teams_Solicitud_Cotización`: StateCode=1, StatusCode=2, 1 acciones; conectores shared_office365; Excel=False, SharePoint=False, Teams=False.
- `Creación_FDI`: StateCode=1, StatusCode=2, 3 acciones; conectores shared_excelonlinebusiness, shared_sharepointonline; Excel=True, SharePoint=True, Teams=False.
- `Crear_carpeta_cotización`: StateCode=0, StatusCode=1, 2 acciones; conectores shared_sharepointonline; Excel=False, SharePoint=True, Teams=False.
- `Notificación_correo_teams`: StateCode=0, StatusCode=1, 3 acciones; conectores shared_sharepointonline, shared_teams; Excel=False, SharePoint=True, Teams=True.
- No modificar flujos automaticamente sin historial de ejecuciones; revisar concurrencia, reintentos, scopes de error y Excel Online.

## Fase 7 - Estabilidad
- Revisar `Patch`/`SubmitForm` criticos con `IfError`/`OnFailure`; no aplicar en automatico porque cambia experiencia de error.
- Revisar `LookUp` que pueden devolver Blank antes de acceder a propiedades.
- Confirmar orden de carga de colecciones usadas por galerias, documentos y bitacora.

## Fase 8 - Mantenibilidad
- `scrMisCotizaciones` es pantalla grande: 404 controles, archivo 486815 bytes.
- `scrFDI` es pantalla grande: 208 controles, archivo 338335 bytes.
- `scrContactosClientes` es pantalla grande: 94 controles, archivo 79068 bytes.
- `scrGenerarPedido` es pantalla grande: 62 controles, archivo 46916 bytes.
- `scrGenerarFolio` es pantalla grande: 57 controles, archivo 56968 bytes.
- Oportunidad: extraer patrones repetidos a componentes solo con pruebas visuales y funcionales.

## Fase 9 - Seguridad
- Emails hardcodeados detectados: `ingenieria3@montilla.com`.
- URLs hardcodeadas detectadas: 5; revisar rutas SharePoint/Excel/Teams por exposicion ambiental.
- No se modifica comportamiento; considerar variables de entorno/conexiones donde aplique.

## Fase 10 - Escalabilidad
- 1,000 cotizaciones: viable si se mantienen `DelayOutput` y cargas por seleccion sin duplicados.
- 10,000 cotizaciones: riesgo por delegacion y umbral SharePoint; requiere indices y evitar `Search` no delegable.
- 100,000 bitacora/documentos: riesgo alto si se consulta por texto/ruta; usar lookup id/folio indexado y particion por ano.
- 50,000 solicitudes: filtros por cotizacion/estado/fecha deben ser delegables e indexados.

## Fase 11 - Calidad de experiencia
- Priorizar tiempos de carga en `scrMisCotizaciones` y `scrFDI`, estados de carga, mensajes de error y accesibilidad.
- Mejoras visuales sin cambio funcional quedan documentadas; no se aplican automaticamente en esta pasada.

## Fase 12 - Backlog tecnico priorizado
| Prioridad | Elemento | Beneficio | Riesgo | Esfuerzo | ROI | Dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | ParserErrorCount = 1 en Canvas App exportada | Evita fallos futuros de publicacion/importacion | Medio | M | Alto | Power Apps Studio/App Checker para ubicacion exacta |
| P1 | Riesgos de delegacion en Search/Filter/StartsWith sobre SharePoint | Escala a 10k+ registros sin resultados incompletos | Medio | L | Alto | Indices y pruebas con datos grandes |
| P1 | Indexar columnas criticas de SharePoint | Reduce throttling y errores de umbral | Bajo | M | Alto | Admin SharePoint |
| P1 | Pantallas muy grandes: scrMisCotizaciones y scrFDI | Reduce costo de mantenimiento y riesgo de regresion | Medio-alto | L | Alto | Pruebas funcionales |
| P2 | Consolidar o justificar Países_List_1 | Reduce confusion de ALM y conexiones | Medio | S | Medio | Validar alias en Studio |
| P2 | Manejo de errores en Patch/SubmitForm criticos | Mejora resiliencia y soporte | Medio | M | Alto | Patron UX aprobado |
| P3 | Accesibilidad: AccessibleLabel, TabIndex, FocusBorder | Mejora calidad y cumplimiento | Bajo | M | Medio | Criterios UX |

## Fase 13 - Ejecucion segura
- Ejecutar automaticamente solo cambios reversibles, locales, sin cambio visible y con validacion estatica.
- Cambios de delegacion, `Patch`, flujos o formularios requieren pruebas funcionales antes de implementarse.
- Evidencia detallada en `work/fdi_architecture_audit_current.json`.
