# AUDITORÍA DE PRODUCTO Y REDISEÑO V2 — QUALITYNX

**Fecha:** 2026-10-04 · **Alcance:** corrección de la experiencia gerencial sobre la
base construida 01–07, sin reiniciar etapas ni alterar decisiones aprobadas.
**Naturaleza:** auditoría + registro de lo implementado. No crea una segunda
documentación funcional: `CURRENT.md` sigue siendo la fuente de verdad.

---

## 1. Verificación de QCInspec (referencia funcional obligatoria)

Revisada de nuevo el 2026-10-04 con la sesión del portal. **Se cerraron los
pendientes de la Fase A**: las páginas 2–4 del dashboard 383 y la página 2 del
384 ya no están "pendientes de evidencia".

| Dashboard | Página | Verificado | Contenido observado |
|---|---|---|---|
| 383 Resumen Inspecciones | 1 |Sí | `Kilos Resolución` (anillo), `Resoluciones Semana` (100 % apilado), `Kilos Semana` (línea) + KPI `1.44M Kilos` |
| 383 | 2 | **Sí (nuevo)** | `Resoluciones Semana` con eje en **Kilos absolutos** (0K–200K) y **Productor** como dimensión |
| 383 | 3 | **Sí (nuevo)** | `Resoluciones Semana` con eje 0.0M–0.3M y segundo corte de productores (dato por producto LP/PT) |
| 383 | 4 | **Sí (nuevo)** | Vista por **Granel / Embalado** y por **Planta** (HUERTO, Integrity, Integrity Cabrero, SUBSOLE), Kilos 0 %–100 % |
| 384 Análisis Parámetros Granel | 1 | Sí | `Grados Brix Promedio por Dia` por Cliente; **valores `(Blank)`** |
| 384 | 2 | **Sí (nuevo)** | `% Exportacion Industria` = **93.83** (`Average of avg_porc_exportacion`); `Calibres Cliente` y `Calibres Industria` |
| 384 | 3 | **NO VERIFICABLE** | El control de página deja de responder tras la página 2 en dos intentos. **Pendiente**, no se afirma revisada |
| 385 Parámetros Condición Calidad | 1 | Sí | 4 visuales (`Distribucion Resolucion/Defectos × Calidad/Condicion`) **vacíos** con Temporada 2025-2026 |
| 386 Análisis Industria | 1–2 | Sí | Doble taxonomía de resolución (gruesa `1..C` y fina `1..C4`) |
| 387 Análisis Temperaturas | 1–2 | Sí | `Promedio Temperatura por Semana`; `Cantidad Pallets por Resolucion` (A/B); `Temperatura por Pallet`; matriz con `Select Row` |

### 1.1 Pregunta gerencial central de QCInspec

Las cuatro páginas del 383 en conjunto responden **una** pregunta:
**¿cómo se reparte el volumen por resolución y cómo se comporta por productor,
por planta y por tipo de proceso (Granel / Embalado)?**

Eso es exactamente lo que QualityNX no tenía: no existía ninguna lectura de
resultados por productor, por planta ni por tipo de proceso.

### 1.2 Escala de calibre observada en QCInspec (384)

Verificada, no inferida: `Precalibre <12 mm`, `Large 12-18.9 mm` con
sub-rangos `Large 1: 12-15.9 mm` y `Large 2: 16-17.9 mm`, `Extralarge 18-18.9`,
`Jumbo +19`, `Jumbo +19.5`, `King +22mm`.

QualityNX tiene un criterio `Calibre` en `mm` **sin escala documentada**. Esta
taxonomía es ** antecedente de referencia**, **no** una especificación aprobada
para QualityNX (ver `DECISIONES_NEGOCIO_V2.md`, U-03).

### 1.3 Qué debe conservar QualityNX y qué no

| Elemento QCInspec | Decisión | Motivo |
|---|---|---|
| Descomposición de resultados por **productor** | **CONSERVAR** | Dimensión existente en QualityNX; el 383 la usa en 3 páginas |
| Descomposición por **etapa** | **CONSERVAR** | Equivalente funcional de "Granel / Embalado", que sí existe en QualityNX como `operational_stages` |
| Filtros por temporada, producto, variedad | **CONSERVAR** | Ya existen como dimensiones |
| Denominador explícito en cada porcentaje | **CONSERVAR** | Es lo que hace comparables los datos |
| Taxonomía de resolución A/B/C y A1–C4 | **NO REPLICAR** | Sin definición oficial (C-01) |
| `% Exportación` | **NO REPLICAR** | QualityNX no modela estimación de exportación |
| **Planta**, contenedor, pallet, destino | **NO REPLICAR** | No existen en el modelo (L-01) |
| Escala de calibre como norma | **NO REPLICAR** | Requiere decisión y validación documental |
| Dashboards 384/385 vacíos | **NO REPLICAR** | No son indicadores funcionales |

---

## 2. Auditoría del sistema actual (antes del rediseño)

Inspección de la aplicación funcionando, escritorio 1440 px y móvil 390 px, con
medición geométrica de la navegación y captura de las 7 pantallas.

| # | Problema encontrado | Evidencia |
|---|---|---|
| 1 | **Elementos de menú superpuestos con el bloque de cuenta** | `Indicadores observados`, `Datos maestros` y `Puntos inspección` invadían la zona del usuario a 1440 px |
| 2 | **Navegación con scroll horizontal en escritorio** | 7 entradas + etiquetas no cabían en `max-w-5xl` (1152 px) |
| 3 | **KPIs duplicados en el inicio** | «343 Lotes activos / 23 En curso / 0 Atención» aparecían dos veces (cabecera y «Situación actual») |
| 4 | **KPI decorativo sin denominador** | «0 ATENCIÓN» sin base ni definición |
| 5 | **El inicio respondía a la pregunta equivocada** | La sección dominante era «Base normativa y técnica» (datos de referencia), no el estado de la operación |
| 6 | **112.050 caracteres en `/dashboard/lotes`** | La lista completa se vuelca en el DOM; alta densidad sin jerarquía |
| 7 | **El texto de la app afirmaba un dato obsoleto** | «Los 185 criterios son catálogo operacional base» frente a las 206 definiciones reales |
| 8 | **Indicadores observados como destino de primer nivel** | Un tablero de promedios ocupaba el lugar de la pregunta gerencial |
| 9 | **Densidad móvil deficiente** | Cada tarjeta de un solo número ocupaba ~140 px de alto |
| 10 | **Productores ausente del producto** | No existía ninguna lectura por productor en ninguna pantalla |

---

## 3. Corrección implementada

### 3.1 Arquitectura de información

Navegación reorganizada en grupos funcionales y **reducida**: se pasó de 8
entradas sueltas a 7 agrupadas, con una sola entrada de primer nivel para todo
el análisis.

| Grupo | Entradas | Ruta |
|---|---|---|
| Inicio | Resumen | `/dashboard` |
| Operación | Lotes · Inspecciones | `/dashboard/lots` · `/dashboard/inspections` |
| Análisis | **Análisis** (4 pestañas) | `/dashboard/analisis` |
| Informes | Informes | `/dashboard/reports` |
| Configuración | Datos maestros · Puntos y criterios | `/dashboard/master-data` · `/dashboard/inspection-points` |

Correcciones técnicas: contenedor del encabezado flexible (`flex-1 min-w-0`),
cuenta con `shrink-0`, entradas con `whitespace-nowrap`, etiquetas de grupo
visibles solo desde 1536 px, contenido ampliado a 1560 px y navegación móvil con
etiquetas de grupo. Resultado medido: **0 solapes y 0 scroll horizontal** de
1024 a 1920 px.

### 3.2 Inicio = resumen gerencial

Reemplazado el bloque duplicado por una lectura que responde preguntas y
declara lo que falta:

- **Cobertura de datos**: `0/206` criterios validados · 206 pendientes ·
  0 con fuente · 8 con límites.
- **Etapas con inspecciones**: `3 / 8` · 28 de 51 inspecciones completadas.
- **Lotes con etapa vigente**: `22 / 357`, con la advertencia de que sin etapa
  no hay análisis por etapa.
- **Criterios con más desviaciones**: `Pudrición 127/160 base`,
  `Calibre 95/134 base`, con la nota de que una desviación no es incumplimiento.
- **Productores con más datos de calidad**: con volumen y etapas cubiertas,
  ordenados **por volumen, no por desempeño**.

### 3.3 Análisis gerencial (`/dashboard/analisis`)

Cuatro pestañas, cuatro preguntas. Todas con denominador explícito y recuento de
registros sin determinación.

| Pestaña | Pregunta | Contenido |
|---|---|---|
| Por etapa | ¿cómo se ve cada etapa? | Inspecciones, completadas, criterios, con límites, validados, desviaciones, base y tasa |
| Por productor | ¿qué productores tienen más observaciones? | Lotes, inspecciones, etapas cubiertas, mediciones, desviaciones, base y tasa |
| Problemas recurrentes | ¿qué criterios se desvían más? | Criterio, etapa, unidad, estado de validación, desviaciones, cumple, base, tasa e inspecciones |
| Valores observados | ¿qué valores medidos existen? | Brix por día y temperatura por semana ISO (Fase B), **como información secundaria** |

Reglas aplicadas en pantalla:

- **No hay ranking de calidad.** No hay puntuaciones, veredictos ni “mejor/peor”.
  Se declara explícitamente que la comparación la hace el usuario.
- **Tasa con base o “datos insuficientes”**: por debajo de 5 evaluaciones
  determinadas no se muestra porcentaje (umbral técnico de presentación,
  declarado en el código, no criterio de negocio).
- **Sin determinación visible**: `SIN CRITERIO CONFIGURADO`, `UNIDAD
  INCOMPATIBLE`, `CONFIGURACIÓN AMBIGUA` y `CRITERIO INACTIVO` se cuentan y se
  excluyen de la tasa, nunca se cuentan como cumplimiento.
- **Sin fulfilling de umbrales**: no se afirma cumplimiento en ninguna celda.

### 3.4 Reutilización, no duplicación

- `Indicadores observados` se movió a
  `apps/web/src/components/analysis/IndicadoresObservados.tsx` y se usa como
  pestaña. La ruta `/dashboard/indicadores` se conserva como wrapper de 9
  líneas, por lo que ningún enlace existente se rompe.
- Se reutilizaron `EmptyState`, `LoadingBlock` y las clases visuales existentes.
- Las consultas nuevas (`listStageQualityAnalysis`,
  `listProducerQualityAnalysis`, `listRecurringDeviationAnalysis`,
  `listQualityCoverage`) son de solo lectura y reutilizan las tablas
  existentes, sin migraciones ni políticas nuevas.

---

## 4. Validación dirigida ejecutada

**23 verificaciones, 23 PASS.** Detalle en
`.backups`-externo: `audit/validation_after.json`.

| Validación | Resultado |
|---|---|
| Navegación sin solapamiento con la cuenta (desktop y móvil) | PASS — 0 solapes |
| Navegación sin texto envuelto ni recorte | PASS |
| Sin KPI duplicado en el inicio | PASS — 0 apariciones |
| Sin KPI decorativo sin denominador | PASS |
| Análisis expone 4 pestañas con datos | PASS — 7 etapas, 2 criterios con desviación |
| “Por productor” no es ranking | PASS — declara que no lo es y no usa veredictos |
| Indicadores observados como pestaña secundaria | PASS |
| Las 8 rutas renderizan contenido | PASS |
| **Exactitud contra control independiente** | PASS — `Pudrición 127/160`, `Calibre 95/134` coinciden con la base |
| Integridad: solo lectura | PASS — 0 escrituras |
| RLS: sin sesión no se leen evaluaciones | PASS — 0 filas |
| typecheck / lint / build | PASS — 0 errores; build con `/dashboard/analisis` |

Capturas antes/después en `audit/`: `desktop_inicio.png` →
`after_desktop_inicio.png`, `mobile_inicio.png` → `after_mobile_inicio.png`, y
`after_desktop_analisis_*.png`.

**Corrección durante la validación:** el primer pase detectó solape real de «Datos
maestros» y «Puntos y criterios» con la cuenta. La causa era que el contenedor
del encabezado no cedía espacio y el ancho máximo era de 1152 px. Corregido y
verificado a 1024/1280/1440/1680/1920 px.

---

## 5. Lo que sigue bloqueado (no por esta fase)

| Bloqueo | Por qué | Dónde se ve |
|---|---|---|
| Participación por clase comercial | C-01 sin definición oficial | No implementado |
| Indicadores de cumplimiento | 0 criterios validados | No implementado, y se declara |
| Kilos de resolución por semana | C-01 + P-01 | No implementado |
| Distribuciones de calibre como norma | U-03 sin documento | Solo antecedente de QCInspec |
| Planta, contenedor, pallet, destino | L-01 sin modelo | No implementado |
| `% Exportación` | No existe en el modelo | No implementado |
| Consolidación N>1 | A-01 sin regla aprobada | No implementado |
| Evidencia atribuida a criterio | 0 de 35 lo tienen | La evidencia se muestra a nivel inspección |

---

## 6. Corrección de producto posterior (2026-10-05)

Ejecutada sobre lo anterior, sin reconstruirlo:

| Cambio | Estado |
|---|---|
| Base normativa del inicio → modal de referencia | Implementado y validado |
| Análisis por **variedad** (misma regla anti-ranking) | Implementado y validado |
| **Transformaciones** con N fuentes y N salidas | Implementado; reglas 33/33; **bloqueado por migración** |
| **Existencias** derivadas de movimientos, no de estado | Implementado; **bloqueado por migración** |
| Unidad declarada por lote (`quantity_unit`) | En migración |
| Disposición final con base mínima (sin inventar logística) | En migración |

Hallazgo de §2.5: **no existe fuente confiable para la etapa de 334 de 357
lotes.** `lot_stage_events` tiene 0 filas y uno de los 22 lotes con etapa
difiere de la etapa derivable de su última inspección. **No se rellenó nada.**

Detalle completo en `docs/DECISIONS.md` D-032 y `docs/BUILD_STATUS.md` §2.5.

## 7. Pendiente recommendations

1. **Cargar etapas a los lotes** (22 de 357 hoy). Sin esto el análisis por
   etapa seguirá parcial. Es carga de datos, no desarrollo.
2. **Definir C-01 y C-02** para habilitar la lectura por clase.
3. **Definir U-04** (procedimiento de validación) para que los criterios puedan
   salir de `PENDIENTE DE VALIDACIÓN`.
4. **Decidir P-01** para habilitar indicadores de volumen.
5. **Evaluar Pallet/Planta** (L-01) si la gerencia necesita el corte de planta
   que QCInspec muestra.