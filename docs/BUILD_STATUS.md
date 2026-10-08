# NX QUALITY — BUILD STATUS

Versión: 3.1 (reconstruida)
Estado: ACTIVO

> **Nota de recuperación documental (2026-10-04).** El `BUILD_STATUS.md` original
> sufrió una truncación durante una edición automatizada. Este documento fue
> **reconstruido por integración de secciones** usando: (a) la versión vigente que
> sobrevivió, (b) el historial base de construcción del proyecto, (c) `CURRENT.md`,
> `DECISIONS.md`, `BUILD_ORDER.md` y las especificaciones 01–11, y (d) verificación
> directa contra el repositorio y la base de datos. **No se afirma identidad
> textual con la versión original perdida.** Una copia histórica de ~717 líneas
> citada en la instrucción **no está disponible en el repositorio** y no se
> reconstruyó desde ella. Los antecedentes que no pudieron verificarse se
> marcan como **[HISTÓRICO]** o **[PENDIENTE DE VERIFICACIÓN]**.
> Control anti-truncación: `scripts/check-build-status.mjs`
> (ejecutar `npm run check:docs`).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PROPÓSITO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Documento VIVO del estado real de construcción de NX Quality.

Debe permitir identificar inmediatamente:

- etapa actual;
- estado;
- trabajo completado;
- trabajo en curso;
- pendientes;
- bloqueos;
- siguiente acción.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. ETAPA ACTUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ETAPA:
RONDAS 2026-09-24 — CLASIFICACIÓN + SEMÁFORO + IA + INFORMES
(instrucción definitiva D-027; corrección sobre 04/05 y navegación)

ESTADO:
RONDAS 2026-09-24 — IMPLEMENTACIÓN COMPLETADA EN CÓDIGO
- Clasificación comercial + semáforo QualityNX (append-only por inspección;
  lógica versionada; IA solo enriquece justificación).
- Pipeline cierre: QE → IA best-effort → clasificación → COMPLETADA.
- UI: chips/filtros de clase y semáforo en Lotes; detalle e informe de
  inspección muestran clasificación.
- Informes: `/dashboard/lots/[id]/report` (histórico de lote) y
  `/dashboard/reports/shipment` (calidad de embarque 1..N; sin packing list).
- Hub INFORMES enlaza informes de lote y embarque (D-026/D-027).
- **CORRECCIÓN DE RENDIMIENTO PRE-E2E (D-030):** consultas sin duplicar
  (`reactStrictMode: false` + dedupe de perfil); carga progresiva en dos
  olas (lista primero, formulario después; NUEVO LOTE no espera a la
  lista); genealogía y selector de lotes fuente **bajo demanda** (nunca en
  la carga de la lista); sin N+1; validación runtime **21/21** → estado
  **READY FOR E2E**. Detalle en la entrada 2026-09-24 de este documento.
- **CIERRE ÚNICO (D-029):** tipo de lote (ORIGEN/PROCESO/REPALLETIZAJE con
  genealogía `lot_genealogy`), folio interno/planta y kg declarados en
  Lotes/informes; guía multilote busca devuelve todos los lotes; puntos de
  inspección como botones que abren la nueva inspección sin volver al
  listado; hub Informes con flujo buscar→seleccionar→elegir informe y
  filtros ampliados (folio interno, especie, variedad, guía, bloque); PDF
  solo del documento en los tres informes; migración
  `20260924000004_lot_type_genealogy.sql` **aplicada en Supabase**
  (2026-09-24).
- **CIERRE FLUJO (D-028):** Inspecciones buscador-first (BUSCAR LOTE →
  ficha → Nueva inspección con nuevo `inspection_id` en el mismo lote y
  contexto previo); Lotes círculo semáforo + filtro “Sin clasificación”;
  hub con dos capacidades visibles + buscador ampliado; informe histórico
  de lote con sección **ANÁLISIS HISTÓRICO — QUALITYNX IA**
  (`POST /api/ai/analyze-lot`); informe embarque con contexto completo
  (número, fecha, planta/país, guía, destino, receptor) y detalle por lote
  (última inspección Pre-Despacho, clase, semáforo, decisión, resumen).
- typecheck **0**; lint web **0 errores** (4 warnings preexistentes de `<img>`);
  `build:web` **OK** (21 rutas, incl. `/api/quality/classify`,
  `/api/ai/analyze-lot`, `/dashboard/lots/[id]/report`,
  `/dashboard/reports/shipment`).
- **CIERRE GENEALOGÍA CON CANTIDADES (D-031, 2026-10-04):** cada relación
  `lot_genealogy` admite `quantity` + `unit` (migración
  `20260926000001_genealogy_quantities.sql` **aplicada**). Lotes permite
  capturar cantidad/unidad por cada lote fuente seleccionado; el informe
  histórico de lote muestraOrígenes y Destinos con `cantidad unidad`, y
  `No registrada` cuando la cantidad es `NULL`. Criterios de recepción y
  proceso aplicados en `20260926000002_recepcion_proceso_criteria.sql`
  (4 recepción / 6 proceso, `is_required=false`, sin tolerancias inventadas).
- **VALIDACIÓN FUNCIONAL DE GENEALOGÍA (2026-10-04, ejecutada sobre la app y
  Supabase `sjecyepmeqvhraptovxo`):** 8 de 9 puntos PASS.
  - PASS: creación de lote derivado con 2 orígenes y cantidades; persistencia
    en `lot_genealogy`; recarga del informe R; consulta bidireccional desde
    el origen A y desde el origen B; edición que restaura orígenes y
    cantidades; guardado sin duplicar relaciones (0 escrituras, siguen 2
    relaciones con 2 orígenes distintos); cantidad negativa rechazada;
    cantidad sin unidad rechazada; relación con cantidad `NULL` mostrada
    como `No registrada`.
  - FAIL (corregido): la cantidad **cero** no era rechazada y se persistía
    silenciosamente como `NULL`. Corregido en
    `apps/web/src/app/dashboard/lots/page.tsx` con validación previa de
    cantidad/unidad por lote fuente; verificado en la app (banner
    `La cantidad de cada lote fuente debe ser un número mayor que cero.`,
    0 escrituras, 0 lotes creados). typecheck **0**, lint **0 errores**,
    `build:web` **OK** (10 rutas).
  - Sin cambios de RLS ni migraciones nuevas en esta ronda.
- **VALIDACIÓN DE UNIDAD ANTES DE CREAR (2026-10-04):** verificado en la app
  que la cantidad sin unidad obligatoria se rechaza **antes** de crear el lote
  (banner `Si informas cantidad, la unidad es obligatoria.`, 0 escrituras,
  0 lotes creados). Se elimina el registro parcial que se había observado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2.1 QUALITYNX V2 — INSTRUCCIÓN MAESTRA (2026-10-04)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FASE A — LEVANTAMIENTO VERIFICABLE: **COMPLETADA**

- **Corrección de hallazgo previo:** los 5 dashboards de QCInspec estaban
  registrados como "NO DETERMINADO (ícono de carga)". Era un problema de
  tiempo de espera: los dashboards **sí** se renderizan y su contenido es
  legible por la capa de accesibilidad de Power BI. Levantamiento verificado
  y documentado en `docs/QCINSPEC_LEVANTAMIENTO_V2.md`.
- Dashboards verificados: **383 Resumen Inspecciones** (4 pág.),
  **384 Analisis Parametros Granel** (3 pág.), **385 Parametros Condicion
  Calidad** (1 pág.), **386 Analisis Industria** (2 pág.),
  **387 Analisis Temperaturas** (2 pág.).
- Hallazgos verificados: dos taxonomías de resolución (`1,2,3,A,B,C` frente a
  `1,2,3,4,A,A1..A4,B,B1..B4,C,C1..C4`, y solo `A,B` en temperatura); la
  unidad del indicador cambia (kg / cantidad de pallets / %); **384 y 385 no
  publican datos** en la sesión observada; el volumen total difiere entre 383
  (≈1,44M kg) y 386 (≈1,61M kg); solo 387 tiene drill-down a fila (`Select
  Row`); ningún dashboard muestra comparación contra período anterior.
- Fórmula **verificada** por consistencia aritmética en 383 y 386:
  `%(resolución) = kg de la resolución / kg total del filtro`.
- **Matriz de equivalencia QCInspec → QualityNX** construida en
  `docs/MATRIZ_EQUIVALENCIA_V2.md` (12 ítems de dashboard + 6 módulos
  analíticos). Resultado: **0 disponibles**, 5 requieren ajuste, 8 requieren
  desarrollo, 6 pendientes de evidencia.
- Brechas técnicas de QualityNX confirmadas en el esquema:
  (a) `measurements.value` es **TEXT** → la agregación numérica exige casteo
  y política para no numéricos; (b) no existe escala cerrada de clasificación
  equivalente a la carta A/B/C; (c) **CORREGIDO el 2026-10-04**: los criterios
  **no** están cargados solo en "Inspección Huerto" — existen 206 definiciones
  distribuidas en las 7 etapas (Brix en Huerto, Cosecha, Recepción, Proceso y
  Pre-Despacho; temperatura en Cosecha, Recepción, Pre-frío y Despacho). Lo que
  falta es **configuración validada**: 206 de 206 en `PENDIENTE DE VALIDACIÓN`,
  0 con `source_kind` informado y solo 8 con límites;
  (d) no existe entidad de embarque (pallet, contenedor, planta, destino,
  recibidor).

PENDIENTE — DISEÑO FUNCIONAL DE LOS DEMÁS INDICADORES: **NO INICIADO**
(depende de las 5 decisiones de negocio; la instrucción de ejecución de
la fase B cubre únicamente los 3 objetivos de la sección 2.2)
- Requiere cerrar 5 decisiones de negocio listadas en
  `docs/MATRIZ_EQUIVALENCIA_V2.md` §D (escala oficial de clasificación, peso
  para indicadores de volumen, base de agregación con N>1 muestras, umbrales
  válidos de temperatura/Brix/peso, dimensiones logísticas a modelar).
- Las brechas con fundamento verificable **no** dependen de esas decisiones y
  pueden avanzar: casteo numérico de mediciones, capa de agregación con base
  declarada, y trazabilidad indicador → lote → inspección → criterio →
  medición → evidencia.



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2.2 QUALITYNX V2 — FASE B: MEDICIONES NUMÉRICAS, INDICADORES
    OBSERVADOS Y TRAZABILIDAD (2026-10-04)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTADO: **COMPLETADA** (los 3 objetivos de la fase, sin pendientes propios)

FUNCIONALIDADES IMPLEMENTADAS
1. Representación numérica segura de `measurements.value` (TEXT) mediante
   clasificación en origen, sin convertir ni modificar el dato persistido.
2. Indicador descriptivo **Promedio de Brix observado por día**
   (criterio `Sólidos solubles (°Brix)`, unidad `°Bx`).
3. Indicador descriptivo **Promedio de temperatura observada por semana ISO**
   (criterios de temperatura, unidad `°C`, etapa operacional obligatoria).
4. Trazabilidad **indicador → lote → inspección → criterio → medición →
   evidencia** con enlaces a los informes existentes.

REGLAS FIJADAS (visibles en pantalla)
- **Conversión numérica:** único formato aceptado
  `^[+-]?(d+(.d+)?|.d+)$`. Se excluyen y se cuentan por separado:
  vacío (`EMPTY`), no numérico (`NON_NUMERIC`), formato ambiguo
  (`AMBIGUOUS`: `1.234,56`, `1,234.56`, `12,5`, `1 234`), unidad ausente
  (`UNIT_MISSING`) y unidad incompatible (`UNIT_INCOMPATIBLE`). **No se
  convierten unidades.**
- **Fecha de agrupación:** `inspections.inspected_at`, en **UTC**.
- **Regla semanal:** ISO-8601, lunes como inicio, semana 1 = la que contiene
  el primer jueves del año, con **año ISO** (verificado: 2027-01-01 pertenece
  a `2026-W53`).
- **Fórmula:** `promedio = Σ valores numéricos evaluables / nº de mediciones
  evaluables del bucket`. **Cada medición es una observación**: no se
  consolida por inspección (N>1 sigue PENDIENTE DE ESPECIFICACIÓN).
- **Temperatura:** exige etapa operacional explícita y **no mezcla**
  contextos. No representa condición de despacho, pallet ni embarque.

ARCHIVOS
- Modificado `packages/shared/src/index.ts`.
- Modificado `packages/database/src/index.ts` (`listObservedMeasurementDefs`,
  `getObservedIndicator`).
- Modificado `apps/web/src/app/dashboard/layout.tsx` (1 ítem de navegación).
- Creado `apps/web/src/app/dashboard/indicadores/page.tsx`.
- **Migraciones: ninguna.** `measurements.value` sigue siendo TEXT.

VALIDACIÓN EJECUTADA
- **Unitarias (34/34 PASS)**: 6 categorías de valor, 6 casos de unidad y 7 de
  día/semana ISO.
- **Funcionales (18/18 PASS)** contra la app y Supabase, con control
  independiente leído desde la base:
  Brix `2026-09-22` = 12 °Bx (1); `2026-09-23` = 11.9583 °Bx (24, 1
  excluido "No numérico"); `2026-09-24` = 12.8 °Bx (5). Temperatura
  `2026-W39` = 26.5 °C (4) en Control de Cosecha.
- **Integridad:** `measurements` 555 → 555 con hash idéntico de
  `id|value|updated_at`; `quality_evaluations` 1000 → 1000; `decisions`
  98 → 98; `quality_classifications` 2 → 2; `inspections` 51 → 51; **0
  escrituras**; RLS sin sesión = 0 filas.
- typecheck **0 errores**; eslint de archivos nuevos **0 errores**;
  `build:web` **OK** con la ruta `/dashboard/indicadores`.

LIMITACIONES CONOCIDAS
- Sin índice por `measurements.measurement_def_id` (555 filas hoy; sin
  migración por conveniencia).
- El universo de Brix por defecto mezcla etapas y cada fila declara las etapas
  que aportan.
- La temperatura tiene pocos registros: el promedio semanal no es
  representativo de una población y así se declara en pantalla.

PENDIENTES QUE REQUIEREN DECISIÓN DEL USUARIO: escala oficial de
clasificación; base de agregación con N>1 muestras; umbrales válidos de
Brix, temperatura y peso; peso para indicadores de volumen; dimensiones
logísticas a modelar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2.3 QUALITYNX V2 — FASE C: DEFINICIÓN DE REGLAS DE NEGOCIO (2026-10-04)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTADO: **COMPLETADA** — 5 dominios analizados. Sin código, sin
migraciones, sin cambios de base de datos, sin RLS.

Documento nuevo: `docs/DECISIONES_NEGOCIO_V2.md` (matriz maestra de 14
decisiones + 5 matrices de dominio + 9 preguntas cerradas + propuesta de
secuencia para la siguiente fase).

HALLAZGOS QUE FIJAN ESTADO
- **Clasificación:** **no existe equivalencia aprobable** entre la escala
  A/B/C de QCInspec y las clasificaciones de QualityNX. La carta de
  QCInspec no tiene leyenda, umbral ni norma en ninguna pantalla; QualityNX
  declara su semáforo como **no normativo SAG** y su clase comercial es
  texto libre con solo ejemplos. La misma letra `A` aparece en verde en
  Embalado y en azul en Despacho: el color de QCInspec no es un significado
  estable.
- **Agregación N>1:** 16 muestras, 3 inspecciones con >1 muestra, 41
  mediciones por muestra y 514 consolidadas. El único caso medible
  (inspección `d9e19817`, 9 muestras, criterio `Brix E2E`) tiene consolidada
  `11.4` y por muestra `11.5`, `1`, `10.8`: el promedio da **7.77**,
  distinto del consolidado. No hay regla derivable; la consolidada actual
  es un valor, no un cálculo. QCInspec muestra resultado por muestra y por
  QC, pero su regla de consolidación **no está escrita** en el portal.
- **Umbrales:** las **206** definiciones están **100 %** en
  `PENDIENTE DE VALIDACIÓN` y **0** tienen `source_kind`. Las **3**
  referencias normativas están `is_active=false` y sin versión ni vigencia.
  Solo 8 criterios tienen límites y provienen de un catálogo de
  demostración. El Quality Engine ya lo refleja: de **1194** evaluaciones,
  **555 no son determinaciones de cumplimiento**. Consecuencia correcta:
  hoy no puede afirmarse cumplimiento y los indicadores siguen descriptivos.
- **Base de peso:** de 357 lotes, `theoretical_weight_kg` en 326 (91 %),
  `weight` en 2 y `kg_declarados` en 2. El peso declarado por el productor
  está prácticamente vacío. Recomendación: selector de base visible con
  defecto en el teórico, etiquetado como estimación. Los "Kilos
  Resolución" de QCInspec tienen denominador verificado (total de kilos del
  filtro) pero **el campo de origen no es determinable**.
- **Dimensiones logísticas:** no existen pallet, contenedor, planta, nave,
  destino, recibidor, sellos, estiba ni termógrafos. La genealogía actual es
  origen→derivado de lotes y **no debe reinterpretarse** como modelo
  logístico: un pallet puede mezclar lotes y un contenedor puede contener
  pallets de lotes distintos.

DECISIONES ABIERTAS (ninguna bloquea la V2 descriptiva)
- C-01 escala de clasificación: BLOQUEADO por falta de evidencia.
- C-02 valores de `commercial_class`: REQUIERE CONFIRMACIÓN DE NEGOCIO.
- A-01 regla N>1: BLOQUEADO por falta de evidencia.
- U-01/U-02/U-03 umbrales de Brix, temperatura y peso: BLOQUEADO por falta
  de evidencia documental. U-04 procedimiento de validación: REQUIERE
  CONFIRMACIÓN.
- P-01 base de peso: PROPUESTA PARA APROBACIÓN. P-02 kilos de QCInspec:
  BLOQUEADO.
- L-01 modelo logístico: REQUIERE CONFIRMACIÓN. L-02 y L-03 con fecha directa.

SIGUIENTE FASE — puede ejecutarse ya, sin esperar las decisiones abiertas:
indicadores observados por productor, variedad y etapa; cobertura de datos y
criterios; trazabilidad ampliada (criterio → mediciones → evaluación →
clasificación → decisión); y vista de consulta de decisiones. Los
indicadores de volumen, de clase y de cumplimiento quedan en espera de
P-1, P-2, P-3, P-5 y P-6.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. ESTADO GLOBAL POR ETAPA (BASE CONSTRUIDA 01–11)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Leyenda de estado usada en este documento:

- **COMPLETADA** — construida y registrada como tal en el historial del
  proyecto; las capacidades pueden no estar validadas para uso gerencial.
- **VERIFICADA AHORA** — comprobada en esta sesión contra código o base.
- **EN ESPERA** — no iniciada; no se inicia por numeración.
- **BLOQUEADA** — requiere decisión de negocio o evidencia externa.

| Etapa | Especificación | Estado | Nota |
|---|---|---|---|
| 01 — FOUNDATION | `docs/01_FOUNDATION.md` | COMPLETADA | — |
| 02 — MASTER DATA | `docs/02_MASTER_DATA.md` | COMPLETADA | — |
| 03 — LOTS | `docs/03_LOTS.md` | COMPLETADA | + D-029/D-031 (tipo de lote, genealogía con cantidades) |
| 04 — INSPECTIONS | `docs/04_INSPECTIONS.md` | COMPLETADA | — |
| 05 — QUALITY ENGINE | `docs/05_QUALITY_ENGINE.md` | COMPLETADA | **1194** evaluaciones persistidas **[VERIFICADA AHORA, lectura paginada]** |
| 06 — DECISIONS | `docs/06_DECISIONS.md` | COMPLETADA | 98 decisiones; `decision_effects` vacío por diseño **[VERIFICADA AHORA]** |
| 07 — TRACEABILITY | `docs/07_TRACEABILITY.md` | COMPLETADA | — |
| 08 — TRANSFORMATIONS | `docs/08_TRANSFORMATIONS.md` | EN ESPERA | No autorizada |
| 09 — OFFLINE | `docs/09_OFFLINE.md` | EN ESPERA | No autorizada |
| 10 — OPERATIONAL VIEW | `docs/10_OPERATIONAL_VIEW.md` | EN ESPERA | No autorizada |
| 11 — ANALYTICS | `docs/11_ANALYTICS.md` | EN ESPERA | **No iniciar.** La analítica gerencial de V2 se corrige dentro de §2.1–2.3 y la §2.4, no por numeración |

**Diferencia crítica entre base construida y producto gerencial:** las etapas
01–07 están reportadas como completadas **[HISTÓRICO]**, pero eso **no** equivale a
que exista una experiencia gerencial validada. La corrección V2 (sección 2.4)
trabaja sobre esta base sin reiniciarla.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. DECISIONES QUE GOBIERNAN EL SISTEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fuente completa con fecha y motivo: `docs/DECISIONS.md`. Resumen operativo:

| ID | Decisión | Efecto práctico |
|---|---|---|
| D-016 | Jerarquía COMPANY → SPECIES → OPERATIONAL STAGE → INSPECTION POINT → CRITERIA | Un lote puede entrar en cualquier etapa; etapa, punto, estado y decisión son conceptos distintos |
| D-018 / D-018b | Etapas y estados | El estado deriva del proceso y las decisiones; abrir una inspección **no** cambia el estado del lote |
| D-021 | IA como asistencia (OpenRouter FREE, clave solo servidor, `/api/ai/analyze`) | La IA no cierra inspecciones ni cambia etapas, estados, criterios o decisiones |
| D-022 | Identidad del lote = folio/ID operacional | `harvest_block` es referencia productiva, no identificador principal |
| D-023 | Quality Engine determinista sobre `measurement_defs` | Evaluaciones append-only con `criterion_snapshot`; no reevalúa inspecciones completadas |
| D-024 | Decisiones append-only con `context_snapshot` | `decision_effects` permanece vacío deliberadamente |
| D-025 | UX sin cambios de lógica, esquema, RLS, API ni E2E general sin autorización | — |
| D-027 | Clasificación comercial ≠ semáforo operacional | No existe equivalencia aprobada con categorías externas |
| D-028 | Búsqueda, informes, análisis histórico y reportes de embarque | Verificar estado actual de cada capacidad |
| D-029 | Tipos de lote y genealogía | La genealogía **no** es logística ni balance de masa |
| D-031 | Cantidad y unidad en genealogía | Relaciones históricas sin cantidad conservan `NULL`; sin conversión de unidades |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. MIGRACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Directorio real: `packages/database/supabase/migrations/` — **26 archivos**
**[VERIFICADA AHORA]**. Las 13 migraciones del historial base existen en el
directorio:

`20260923000001` … `20260923000007`, `20260924000001` … `20260924000004`,
`20260926000001_genealogy_quantities.sql`,
`20260926000002_recepcion_proceso_criteria.sql`.

- Las dos últimas fueron reportadas como **aplicadas y verificadas por el
  usuario** **[HISTÓRICO]**. **No volver a ejecutarlas.**
- El historial no registra el estado de aplicación de las 13 restantes:
  **[PENDIENTE DE VERIFICACIÓN]**. La verificación real se hace contra la base,
  no reejecutando migraciones.
- No se ha creado ninguna migración durante las fases V2 A, B y C.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. CAPACIDADES TÉCNICAS VERIFICADAS EN ESTA SESIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verificado por consulta de solo lectura a Supabase `sjecyepmeqvhraptovxo`
(2026-10-04) y por ejecución en la aplicación:

| Capacidad | Evidencia |
|---|---|
| Datos maestros | 1 empresa, 4 productores, 3 campos, 2 cuarteles, 1 especie, 6 variedades, 7 etapas |
| Lotes | 357 lotes; 328 con cantidad; 326 con peso teórico; 3 REPALLETIZAJE |
| Genealogía | 3 relaciones: A→R `120 cajas`, B→R `80 cajas`, A→lote de validación `NULL` |
| Criterios | **206** definiciones en **7 etapas**; **206/206** en `PENDIENTE DE VALIDACIÓN`; **0** con `source_kind`; **8** con límites |
| Referencias normativas | 3, **todas `is_active=false`**, sin versión ni vigencia |
| Quality Engine | **1194** evaluaciones (lectura paginada): CUMPLE 401, DESVIACIÓN 238, SIN CRITERIO 498, UNIDAD INCOMPATIBLE 21, CONFIG. AMBIGUA 18, CRITERIO INACTIVO 18 |
| Decisiones | 98 (APROBAR 20, SEGREGAR 18, RECHAZAR 18, RETENER 17, LIBERAR 15, CONTINUAR 10); 90 anuladas / 8 registradas |
| Clasificaciones | 2, ambas `SIN CLASIFICAR` + `AMARILLO`, lógica `qnx-classify-2026-09-24-v1` |
| Muestras | 16 muestras; 3 inspecciones con más de una muestra |
| Evidencia | 35 registros; **0** con `measurement_def_id` |
| RLS | Lectura sin sesión devuelve 0 filas |

**Corrección de un dato anterior:** se afirmaba que los criterios estaban
cargados solo en "Inspección Huerto". **Es incorrecto**: existen 206
definiciones en las 7 etapas. Lo que falta es **configuración validada**.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. INDICADORES: DISPONIBLES Y PENDIENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Disponibles y validados (Fase B)** — descriptivos, nunca de cumplimiento:

| Indicador | grouped | Validación |
|---|---|---|
| Promedio de Brix observado por día | día (UTC) | 34/34 unitarias + 18/18 funcionales |
| Promedio de temperatura observada por semana ISO | semana ISO con año ISO | ídem |

**Pendientes** (ver `docs/MATRIZ_EQUIVALENCIA_V2.md`): participación por clase
comercial, kilos de resolución por semana, distribución de defectos por
calidad/condición, indicadores de pallet/contenedor/embarque y comparaciones
entre períodos. Los últimos requieren modelo o decisiones de negocio.

**Regla vigente:** los indicadores de Fase B son **capacidades de soporte**, no
el dashboard gerencial. No son el centro de la experiencia.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. DECISIONES DE NEGOCIO ABIERTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detalle, alternativas y preguntas cerradas: `docs/DECISIONES_NEGOCIO_V2.md`.

| ID | Decisión | Estado | Bloquea |
|---|---|---|---|
| C-01 | Significado de la escala A/B/C de QCInspec | BLOQUEADO POR FALTA DE EVIDENCIA | Indicadores de clase |
| C-02 | Valores de `commercial_class` | REQUIERE CONFIRMACIÓN DE NEGOCIO | Indicadores de clase |
| A-01 | Regla de consolidación N>1 | BLOQUEADO POR FALTA DE EVIDENCIA | "Resultado de inspección" |
| U-01/02/03 | Umbrales de Brix, temperatura y peso | BLOQUEADO POR FALTA DE EVIDENCIA DOCUMENTAL | Todo indicador de cumplimiento |
| U-04 | Procedimiento de validación de criterios | REQUIERE CONFIRMACIÓN | Salida de `PENDIENTE DE VALIDACIÓN` |
| P-01 | Base de peso para volumen | PROPUESTA PARA APROBACIÓN | Indicadores de volumen |
| P-02 | Qué kilos usa QCInspec | BLOQUEADO | Comparar con QCInspec |
| L-01 | Modelo pallet/contenedor/embarque | REQUIERE CONFIRMACIÓN | Analítica de despacho |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. BLOQUEOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- **Los bloqueos de negocio están localizados** en clasificación, cumplimiento,
  consolidación N>1, base de peso y logística. **No impiden** la corrección de la
  experiencia gerencial ni los indicadores descriptivos.
- No hay bloqueo técnico que impida la corrección de navegación y jerarquía.
- E2E general: **no ejecutado**. El estado histórico "READY FOR E2E" **no**
  significa E2E aprobado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. HISTORIAL DE ESTADO (ANTECEDENTES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Conservado como antecedente. Las fechas y cifras son históricas.

| Fecha | Antecedente |
|---|---|
| 2026-09-24 | D-028 y D-029: informes, tipo de lote, genealogía, `20260924000004` aplicada |
| 2026-09-24 | D-030: corrección de rendimiento pre-E2E, carga bajo demanda, validación runtime 21/21, "READY FOR E2E" |
| 2026-10-04 | D-031: cantidades y unidades en genealogía; `20260926000001` y `20260926000002` aplicadas |
| 2026-10-04 | Caso de genealogía validado: derivado `2026-000353` (200 envases) con A `2026-000348` → 120 cajas y B `2026-000349` → 80 cajas; unidades distintas, sin conversión |
| 2026-10-04 | Defecto corregido: cantidad cero no se rechazaba; se agregó validación previa de cantidad/unidad por lote fuente, verificada sin escrituras |
| 2026-10-04 | V2 Fase A: levantamiento verificable de los 5 dashboards de QCInspec y matriz de equivalencia |
| 2026-10-04 | V2 Fase B: indicadores observados de Brix y temperatura con trazabilidad |
| 2026-10-04 | V2 Fase C: análisis de reglas de negocio, 14 decisiones, 9 preguntas abiertas |
| 2026-10-04 | Recuperación documental de este documento tras truncación |
| 2026-10-06 | **D-035 — ABIERTO (flujo de inspección validado, 2 pendientes que requieren decisión/SQL).** El flujo de inspección NO requiere SQL: tablas, triggers, motor y UI ya existían. 20 pruebas operacionales PASS sobre Supabase real: recepción→inspección con preselección (I-001/I-001b), punto y etapa derivada del punto (I-002/I-003), N=1 con N sugerido 2 y motivo obligatorio (I-004/I-005), 34 criterios activos del punto (I-006), 6/6 obligatorios con valor (I-007), evidencia opcional según configuración (I-009), guardia de cierre en BD con `P0001` (I-010), cierre `COMPLETADA` con resultado y decisión persistidos y `quality_evaluations` generadas (I-011), append-only sin duplicar mediciones (I-012), decisión formal vinculada a inspección y lote (I-014), informes de inspección y de lote (I-015), trazabilidad D-033 visible (I-016), aislamiento entre empresas (I-017) e integridad histórica (I-018: ACME 377 = 358 preexistentes sin modificar + 19 `REC-D035-*`; TEST con 0 inspecciones). **Defecto corregido:** la etiqueta de progreso de cierre exigía evidencia fotográfica ignorando `evidence_required_by_config`. **Defecto abierto:** `idx_inspections_open_unique` admite una sola inspección `EN CURSO` por lote mientras la UI promete una por punto; el `409 duplicate key` se muestra crudo. **Bloqueo SQL:** `lock_new_inspection_points` deja sin catálogo a cualquier empresa creada después del sellado. `typecheck` 0 errores, `lint` 0 errores/108 warnings, `build:web` OK. |
| 2026-10-05 | **D-034 — CERRADO / VALIDADO OPERACIONALMENTE.** Recepción operacional en `/dashboard/recepcion`: tipo de lote → origen → contenido declarado → confirmación. Reutiliza `lots` (folio por trigger), `lot_stage_events` (INGRESO en Recepción Frigorífico / Packing), el trigger de APERTURA de D-032 y el motor de inspecciones existente. Sin SQL. 39/39 pruebas operacionales PASS. |
| 2026-10-05 | **D-033 — CERRADO / VALIDADO OPERACIONALMENTE.** Trazabilidad operacional completa derivada de la arquitectura existente (lots, lot_genealogy, lot_transformations, lot_stock_movements, lot_availability, inspections, decisions, lot_dispositions, lot_stage_events). Vista navegable `/dashboard/trazabilidad/[id]` con origen, descendencia, inspecciones, decisiones, disposiciones e historial cronológico. Sin tablas nuevas y sin SQL. 28/28 pruebas operacionales PASS. Anuladas visibles como antecedente histórico, no como flujo vigente. |
| 2026-10-05 | **D-032 revisión 2** tras revisión pre-migración: saldo desde el libro sin doble conteo, `security_invoker` en la vista, aislamiento por empresa y rol dentro de las funciones, `search_path` fijado, `REVOKE`/`GRANT`, bloqueo de lotes fuente contra sobreconsumo, anulación con compensación, genealogía sin reescritura, guardia de transiciones, apertura por trigger. 36 + 34 pruebas |
| 2026-10-04 | **Corrección de cifras**: las evaluaciones del Quality Engine son **1194**, no 1000. El valor anterior estaba truncado por el tope de 1000 filas de PostgREST. Se añadió paginación al análisis y se corrigieron `DECISIONES_NEGOCIO_V2.md` y este documento |

**Antecedentes que no pudieron verificarse** (marcados en el historial base como
reportados): el estado de aplicación en base de las 13 migraciones de §5, la
existencia de la copia histórica de ~717 líneas de este documento, y el detalle
de la matriz técnica de 185 criterios previa a las 206 definiciones actuales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2.5 QUALITYNX V2 — TRANSFORMACIONES, EXISTENCIAS Y TRAZABILIDAD (2026-10-05)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTADO: **PARCIAL** — código y reglas implementados y probados; la migración
**NO está aplicada**, por lo que no se pueden registrar operaciones reales.

HALLAZGO §2.5 — ETAPA DE LOS LOTES HISTÓRICOS
- 357 lotes: **22** con etapa registrada, **334** sin etapa, sin evento de etapa y
  sin inspección. `lot_stage_events` está **vacía (0 filas)**.
- Uno de los 22 lotes con etapa **difiere** de la etapa derivable de su última
  inspección, lo que demuestra que derivar no es confiable.
- **Decisión: no se rellena nada.** No existe fuente histórica verificable. El
  dato se conserva como desconocido y las pantallas lo declaran visiblemente
  ('sin etapa') en vez de esconderlo.
- Pendiente de decisión: captura obligatoria de etapa al crear un lote nuevo.

MODELO IMPLEMENTADO (D-032, migración `20261005000001_transformations_stock_dispositions.sql`)
- 5 tablas: `lot_transformations`, `lot_transformation_inputs`,
  `lot_transformation_outputs`, `lot_stock_movements`, `lot_dispositions`.
- 1 vista `lot_availability` con estados DISPONIBLE / PARCIALMENTE_UTILIZADO /
  AGOTADO / CANTIDAD_NO_DECLARADA.
- 2 funciones: `validate_lot_transformation` (sin escribir) y
  `confirm_lot_transformation` (atómica), más `annul_lot_transformation`.
- `lots.quantity_unit` agregado: sin unidad declarada no hay balance verificable.
- RLS por empresa en las 5 tablas nuevas. Sin políticas nuevas.
- **No se modifica `lot_genealogy`**: la transformación la refleja al confirmar.

REGLA DE BALANCE (corregida por las pruebas)
- Lo que sale de cada fuente es lo **consumido más su remanente** cuando se
  declara COMO_LOTE_NUEVO: `Σ salidas de fuentes = Σ salidas registradas`.
- La primera implementación comparaba `Σ consumidas = Σ salidas` y era
  **incorrecta**: fallaba cuando el remanente se declara como lote nuevo. Las
  pruebas unitarias lo detectaron y la especificación SQL se alineó.

PRUEBAS EJECUTADAS
- **Unitarias 33/33** sobre la especificación pura: caso principal
  (A 200 + B 180 → R1 360 + R2 20 = 380), merma con motivo, y 12 casos
  negativos (consumir más de lo disponible, exceder el libro de movimientos,
  omitir unidad, unidad incompatible, sin salidas, solo merma, diferencia no
  explicada, remanente no declarado, merma sin motivo, dos remanentes, doble
  consumo del mismo lote, sin fuentes, producto sin lote propio).
- **Funcionales 11/11**: base normativa como modal, 5 pestañas de análisis con
  variedad, páginas de transformaciones y existencias con el aviso de modelo no
  aplicado, navegación y **0 escrituras**.
- typecheck 0 errores; lint 0 errores en archivos nuevos; `build:web` OK con
  `/dashboard/transformaciones` y `/dashboard/existencias`.

BLOQUEO — ACCIÓN DEL USUARIO REQUERIDA
- **Aplicar la migración** `20261005000001_transformations_stock_dispositions.sql`
  en Supabase. Sin ella no hay libro de movimientos, ni existencias, ni
  transformaciones registrables. Hasta entonces las pantallas lo declaran.
- Con la migración aplicada faltan las pruebas de §9.1 y §9.3 **contra base de
  datos**: caso principal end-to-end, casos negativos en base, existencias con
  lote agotado y transformación encadenada (R2 como fuente de una segunda).

CORREGIDO EN ESTA EJECUCIÓN
- Cifras del Quality Engine: son **1194** evaluaciones, no 1000 (PostgREST
  trunca en 1000 filas). Se añadió paginación al análisis.
- `quantity_unit` evita convertir 'envases' implícitamente en existencias.
- Reubicada la base normativa del inicio a un modal de referencia.
- Añadido el análisis por variedad, con la misma regla anti-ranking.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2.4 QUALITYNX V2 — CORRECCIÓN DE EXPERIENCIA GERENCIAL (2026-10-04)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTADO: **IMPLEMENTADO Y VALIDADO** (23/23 verificaciones dirigidas)

AUDITORÍA (medición geométrica + capturas, escritorio 1440 y móvil 390)
- Navegación con **elementos superpuestos** al bloque de cuenta y con scroll
  horizontal en escritorio.
- **KPIs duplicados** en el inicio y KPI decorativo («0 Atención») sin
  denominador.
- El inicio respondía a la pregunta equivocada: dominaba «Base normativa y
  técnica» en vez del estado de la operación.
- **No existía ninguna lectura por productor** en ninguna pantalla.
- El texto de la app afirmaba «Los 185 criterios» frente a las 206
  definiciones reales.
- Los indicadores observados ocupaban un lugar de primer nivel.

VERIFICACIÓN QCINSPEC (cerró los pendientes de la Fase A)
- **383 páginas 2, 3 y 4 abiertas y leidas: las paginas 2 y 3 desglosan
  `Resoluciones Semana` por **Productor**; pagina 4 cruza **Granel /
  Embalado** por **Planta**. Es la pregunta gerencial central de QCInspec.
- **384 página 2 abierta**: `% Exportacion Industria` = 93.83 y escala de
  calibre `Precalibre <12 / Large 12-18.9 (Large 1, Large 2) / Extralarge
  18-18.9 / Jumbo +19 / +19.5 / King +22mm` (antecedente, no norma).
- **384 página 3 NO VERIFICABLE**: el control de página deja de responder.
  Se registra como pendiente; no se afirma revisada.
- 384/385 se mantienen como **no funcionales** en la sesión observada.

IMPLEMENTADO
- **Navegación reorganizada** en 5 grupos funcionales y reducida a 7 entradas:
  el análisis pasa a una sola entrada de primer nivel. Contenedores flexibles,
  ancho 1560 px, etiquetas de grupo desde 1536 px, sin texto envuelto.
  Medido: **0 solapes y 0 scroll horizontal** de 1024 a 1920 px.
- **Inicio = resumen gerencial**: cobertura de datos (`0/206` validados),
  etapas con inspecciones (`3/8`), lotes con etapa vigente (`22/357`),
  criterios con más desviaciones y productores con más datos. Eliminado el
  KPI duplicado y el KPI sin denominador.
- **Análisis gerencial `/dashboard/analisis`** con 4 pestañas: por etapa, por
  productor, problemas recurrentes y valores observados. Toda tasa muestra
  base; los registros sin determinación se cuentan y se excluyen.
- **Los indicadores observados pasan a pestaña secundaria**. La ruta
  `/dashboard/indicadores` se conserva como wrapper; el componente se
  extrajo para reutilizarlo sin duplicarlo.
- **Sin rankings de calidad**: sin puntuaciones ni veredictos; se declara que
  la comparación la hace el usuario.
- 4 consultas nuevas de **solo lectura**, sin migración ni política nueva.

VALIDACIÓN
- 23/23 PASS: navegación (desktop y móvil), ausencia de solapes, inicio sin
  KPI duplicado ni decorativo, 4 pestañas con datos, «por productor» no
  ranking, indicadores como pestaña secundaria, las 8 rutas renderizan,
  **exactitud contra control independiente** (`Pudrición 127/160`,
  `Calibre 95/134`), 0 escrituras y RLS sin sesión = 0 filas.
- typecheck 0 errores; lint 0 errores en los archivos tocados; `build:web` OK
  con `/dashboard/analisis`.
- Documento de auditoría: `docs/AUDIT_PRODUCTO_V2.md`.

NO IMPLEMENTADO POR BLOQUEO (no es omisión técnica)
 Participación por clase (C-01), cumplimiento (0 criterios validados), kilos
  de resolución (C-01 + P-01), escala de calibre como norma (U-03), planta /
  pallet / contenedor / destino (L-01), `% Exportación` (no existe en el
  modelo), consolidación N>1 (A-01) y evidencia por criterio (0 de 35).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. SIGUIENTE TRABAJO AUTORIZADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Corrección de la experiencia gerencial y de la navegación (sección 2.4),
   respetando D-016 a D-031 y sin affirmar cumplimiento.
2. Convertir los indicadores observados en información **secundaria** de una
   vista gerencial construida sobre datos existentes y reglas verificables.
3. Mantener sin cambio: genealogía, Quality Engine, decisiones, RLS y datos
   históricos.
4. **No** iniciar etapas 08–11, **no** crear migraciones, **no** ejecutar E2E
   general.