# DECISIONES DE NEGOCIO — QUALITYNX V2

**Fecha:** 2026-10-04 · **Fase:** C (definición y cierre de reglas de negocio)
**Naturaleza:** definiciones de negocio. **No contiene código, migraciones ni cambios de base de datos.**
**Fuentes:** `docs/CURRENT.md`, `docs/BUILD_STATUS.md`, `docs/QCINSPEC_LEVANTAMIENTO_V2.md`,
`docs/MATRIZ_EQUIVALENCIA_V2.md`, `docs/03_LOTS.md`, `docs/05_QUALITY_ENGINE.md`,
`docs/06_DECISIONS.md`, migraciones de `packages/database/supabase/migrations/` y
consultas de solo lectura a Supabase `sjecyepmeqvhraptovxo` (2026-10-04).

## 0. Procedencia de las afirmaciones

Cada dato relevante lleva una de estas marcas:

| Marca | Significado |
|---|---|
| `[DOC §x]` | Definición documentada en el repositorio |
| `[MODELO]` | Hecho verificado en el esquema (migración o tipo generado) |
| `[BD]` | Hecho verificado por consulta de solo lectura (2026-10-04) |
| `[QCINSPEC]` | Observación directa del portal (levantamiento 2026-10-04) |
| `[INFERENCIA]` | Razonamiento del agente, explícitamente no verificado |
| `[DESCONOCIDO]` | No verificable con la evidencia disponible |
| `[USUARIO]` | Requiere confirmación del usuario o cliente |

---

## 1. Resumen ejecutivo

1. **No existe equivalencia aprobable entre la escala A/B/C de QCInspec y las
   clasificaciones de QualityNX.** QCInspec muestra una carta de resolución
   cuyo significado **nunca estuvo visible** en el portal (no hay leyenda, ni
   umbral, ni norma citada) `[QCINSPEC]`. QualityNX tiene una clase comercial
   de texto libre y un semáforo enumerado que su propia documentación declara
   **"no normativo SAG"** `[MODELO]`. Cualquier equivalencia sería inventada.

2. **El sistema no puede afirmar cumplimiento de especificación en este
   momento.** Las **206** definiciones de criterio están **100 % en
   `PENDIENTE DE VALIDACIÓN`** y **0** tienen `source_kind` (tipo de fuente)
   informado `[BD]`. Las **3** referencias normativas del sistema están
   **`is_active = false`** y sin versión ni vigencia `[BD]`. El Quality Engine
   ya lo refleja: de **1194** evaluaciones, **555 no son determinaciones de
   cumplimiento** (`SIN CRITERIO CONFIGURADO` 498, `UNIDAD INCOMPATIBLE` 21,
   `CONFIGURACIÓN AMBIGUA` 18, `CRITERIO INACTIVO` 18) `[BD]`.
   Las lecturas anteriores de 1000 filas estaban truncadas por el tope de
   PostgREST; las cifras de arriba son paginadas.

3. **La agregación N>1 no se puede definir hoy, y hay evidencia de que el
   promedio sería incorrecto.** El único caso real con mediciones por muestra
   **y** consolidada del mismo criterio (inspección `d9e19817`, 9 muestras,
   criterio `Brix E2E`) tiene consolidada `11.4` y por muestra
   `11.5`, `1`, `10.8`; el promedio de esas tres es `7.77`, **distinto del
   valor consolidado** `[BD]`. Con `n=3` y un valor claramente anómalo (`1`)
   no es derivable ninguna regla: solo queda constancia de que
   **consolidado ≠ promedio**.

4. **La base de peso utilizable hoy es el peso teórico, y solo porque es
   calculada, no declarada.** De 357 lotes: `theoretical_weight_kg` en **326**
   (91 %), `weight` en **2**, `kg_declarados` en **2** `[BD]`. El peso
   declarado por el productor —que es el que QCInspec muestra en sus
   relatórios— está prácticamente vacío.

5. **Las dimensiones logísticas no existen.** QualityNX no tiene pallet,
   contenedor, planta, nave, destino ni recibidor `[MODELO]`. El bloque de
   temperatura de despacho de QCInspec **no es replicable** sin desarrollo de
   modelo. La genealogía actual **no debe reinterpretarse** como modelo
   logístico: es origen→derivado de lotes, con cardinalidad distinta.

6. **El único insumo de volumen hoy verificable es la familia de "Kilos
   Resolución"** de QCInspec, cuya fórmula se verificó
   (`kg de la clase / kg total del filtro`) `[QCINSPEC]`, pero **cuál campo de
   kilos usa no es determinable** porque el modelo Power BI no está expuesto
   `[DESCONOCIDO]`.

---

## 2. MATRIZ MAESTRA DE DECISIONES

| ID | Dominio | Decisión requerida | Evidencia disponible | Alternativas | Recomendación | Responsable de confirmar | Estado | Impacto si queda pendiente |
|---|---|---|---|---|---|---|---|---|
| **C-01** | Clasificación | Qué significa cada valor de la carta de resolución A/B/C y 1/2/3 de QCInspec | Colores y valores observados; **sin leyenda ni umbral** `[QCINSPEC]` | (a) equivalencia QualityNX; (b) escala propia; (c) coexistir de ambas sin equivalencia | **(c)** — mantenerlas como sistemas separados y explícitos | Cliente/usuario | **BLOQUEADO POR FALTA DE EVIDENCIA** | No se puede publicar "participación por clase" comparable con QCInspec |
| **C-02** | Clasificación | Qué valores puede tomar `commercial_class` y con qué matriz se asignan | `CommercialClassExamples` = "categorías de **ejemplo**, configurables, no asumir SAG" `[MODELO]`; solo 2 clasificaciones, ambas `SIN CLASIFICAR` `[BD]` | (a) catálogo fijo; (b) catálogo por cliente/especie; (c) texto libre con matriz configurable | **(b)** con matriz versionada; requiere definición del cliente | Cliente/usuario | **REQUIERE CONFIRMACIÓN DE NEGOCIO** | La clasificación sigue sin valor informable |
| **C-03** | Clasificación | Relación entre `aprobado`, `Liberada`, segregación, `CAT-1/2` y semáforo/clase/decision | QCInspec: `aprobado` bool, `Liberada: NO`, campos de segregación, `CAT-1/2` `[QCINSPEC]`; QualityNX: `decisions` con `LIBERAR`, `SEGREGAR`, `APROBAR`, `RECHAZAR`, `RETENER`, `CONTINUAR` `[BD]` | (a) mapear 1:1; (b) declararla fuera de alcance | **(b)** — Quality Engine evalúa, decisión humana decide; ya está resuelto en `docs/CURRENT.md` | — | **CONFIRMADO POR EVIDENCIA** | — |
| **A-01** | Agregación N>1 | Cómo se consolida N>1 muestras en un resultado de inspección | 16 muestras; 3 inspecciones con >1 muestra `[BD]`; el único caso medible contradice el promedio `[BD]` | (a) cada muestra independiente; (b) promedio; (c) peor caso (min/máx); (d) proporción tolerada; (e) por criterio | **(a) como estado actual** + declarar N>1 sin resultado consolidado | Cliente/usuario + evidencia de plan de muestreo | **BLOQUEADO POR FALTA DE EVIDENCIA** | Ningún indicador puede afirmar "resultado de la inspección" cuando N>1 |
| **A-02** | Agregación N>1 | Qué es "el resultado de una inspección" frente a "una medición" | Modelo ya separa `measurements` (consolidada `sample_id NULL` / por muestra) `[MODELO]`; la Fase B ya доку granularidad | (a) resultado = consolidado; (b) resultado = conjunto de muestras | **(b)**, y el consolidado actual es un valor/manual más que un promedio | — | **PROPUESTA PARA APROBACIÓN** | Riesgo de leer un consolidado manual como si fuera calculado |
| **U-01** | Umbrales | Especificación oficial de Brix por especie y mercado | `Sólidos solubles (°Brix)` con `min_value=10` de catálogo **demo** (`CATALOGO_BASE_ARANDANO_FRESCO_2026-09-23`), validación PENDIENTE `[BD]`; QCInspec muestra 15–17 en un PDF **sin explicar si es criterio u observado** `[QCINSPEC]` | (a) documento del cliente; (b) norma SAG/UNECE; (c) rango técnico propio | **Ninguna sin documento** | Cliente/usuario | **BLOQUEADO POR FALTA DE EVIDENCIA** | Brix sigue siendo solo observado; correcto y seguro |
| **U-02** | Umbrales | Especificación de temperatura por etapa y uso | 5 mediciones `°C`; criterios sin límites `[BD]`; QCInspec muestra `Calificación T° = A` **sin rango** `[QCINSPEC]` | (a) rango por cliente; (b) rango por uso (cosecha/frío/embarque); (c) sin umbral | **Ninguna sin documento** | Cliente/usuario | **BLOQUEADO POR FALTA DE EVIDENCIA** | Temperatura sigue descriptiva; correcto y seguro |
| **U-03** | Umbrales | Especificación de peso (cajas, theoretical, declarado) | `Peso`/`Peso Cajas` sin límites `[BD]`; QCInspec muestra "Peso Cajas 3,61" como medida, no umbral `[QCINSPEC]` | (a) por envase/especie; (b) por cliente | **Ninguna sin documento** | Cliente/usuario | **BLOQUEADO POR FALTA DE EVIDENCIA** | Sin umbrales de peso |
| **U-04** | Umbrales | Procedimiento para validar un criterio (de PENDIENTE a VALIDADO) | El modelo ya tiene `validation_status`, `source_kind`, `source_ref` y snapshot en `quality_evaluations` `[MODELO]` | (a) flujo con responsable y documento; (b) validación por cliente | **(a)** — flujo mínimo exigible | Cliente/usuario | **REQUIERE CONFIRMACIÓN DE NEGOCIO** | El 100 % de criterios queda en PENDIENTE y el motor no puede afirmar cumplimiento |
| **P-01** | Peso | Qué peso representa el volumen de los indicadores V2 | `theoretical_weight_kg` 326/357; `weight` 2/357; `kg_declarados` 2/357 `[BD]` | (a) teórico; (b) declarado; (c) ambos con selector; (d) medido | **(c) con selector explícito y etiqueta por indicador**; valor por defecto teórico | Cliente/usuario | **PROPUESTA PARA APROBACIÓN** | Un indicador de volumen publicado sin base declarada no es auditable |
| **P-02** | Peso | Qué kilos usa el dashboard QCInspec "Kilos Resolución" | Denominador = total de kilos del filtro (verificado aritméticamente) `[QCINSPEC]`; **campo de origen no expuesto** `[DESCONOCIDO]` | — | No replicar la cifra; replicar la **estructura** con base declarada | Cliente/usuario | **BLOQUEADO POR FALTA DE EVIDENCIA** | No se pueden comparar volúmenes con QCInspec |
| **L-01** | Logística | Entidad de embarque/pallet/contenedor | No existe ninguna `[MODELO]`; QCInspec usa contenedor, sellos, nave, puertos, movimiento, conservación, planta, pallet/folio, plano de estiba, termógrafos `[QCINSPEC]` | (a) entidad `shipments`; (b) `pallets`; (c) solo lote | **Propuesta en §8, priorizada**; **no iniciar sin decisión** | Cliente/usuario | **REQUIERE CONFIRMACIÓN DE NEGOCIO** | Los indicadores de despacho/pallet de QCInspec quedan fuera de V2 |
| **L-02** | Logística | Si la genealogía actual puede usarse como base logística | `lot_genealogy` es origen→derivado con `quantity`/`unit`; no es pallet ni embarque `[MODELO]` | (a) reutilizar tal cual; (b) re-modelar | **(b)**, sin reinterpretar la genealogía | — | **CONFIRMADO POR EVIDENCIA** | — |
| **L-03** | Logística | Atribución de evidencia fotográfica a un criterio | 35 evidencias, **0** con `measurement_def_id` `[BD]` | (a) exigir `measurement_def_id`; (b) dejar evidencia a nivel inspección | **(b) por ahora**, documentando el límite | — | **PROPUESTA PARA APROBACIÓN** | La evidencia no puede mostrarse como evidencia de un criterio concreto |

---

## 3. DOMINIO 1 — CLASIFICACIÓN DE CALIDAD

### 3.1 Hechos observados

| Sistema | Categoría | Contexto | Evidencia |
|---|---|---|---|
| QCInspec | `A` `#00C853` (verde) | Embalado, Granel, dashboard 383 | `[QCINSPEC]` |
| QCInspec | `C` `#DD2C00` (rojo) | Granel 57964 (Pudrición = C) | `[QCINSPEC]` |
| QCInspec | `A` `#304FFE` (azul) | Despacho (temperatura) | `[QCINSPEC]` |
| QCInspec | `1`, `2`, `3` | Resolución **por defecto de cada defecto/atributo** (Granel: Russet 1, Fruta Roja 1, Pedicelo 3) | `[QCINSPEC]` |
| QCInspec | `A`,`B`,`C` | Resolución por defecto de condición (Machucón A, Desgarro Pedicelar A, Pudrición C) | `[QCINSPEC]` |
| QCInspec | `1,2,3,A,B,C` | Dashboard 383 `Kilos Resolución` | `[QCINSPEC]` |
| QCInspec | `1,2,3,4,A,A1..A4,B,B1..B4,C,C1..C4` | Dashboard 386 `Kilos Resolución Industria` | `[QCINSPEC]` |
| QCInspec | `A`, `B` **solo** | Dashboard 387 temperatura | `[QCInspec]` |
| QCInspec | `aprobado` booleano | Detalle API | `[QCINSPEC]` |
| QCInspec | `CAT - 1` / `CAT - 2` | Embalado y Análisis | `[QCINSPEC]` |
| QCInspec | `Calidad` 1–2, `Condicion` A–B, `Critico`, `Resolucion` A–B, `Segregacion` | Columnas de Análisis | `[QCINSPEC]` |
| QCInspec | `Liberada: NO` + `Observacion Liberacion` | Detalle Embalado | `[QCINSPEC]` |
| QCInspec | `id_calidad_final` (ej. 105) | API; catálogo interno no expuesto | `[QCINSPEC]` |
| QualityNX | `commercial_class` = `SIN CLASIFICAR` (2/2) | `quality_classifications` | `[BD]` |
| QualityNX | `semaphore` = `AMARILLO` (2/2) | `quality_classifications` | `[BD]` |
| QualityNX | `logic_version` = `qnx-classify-2026-09-24-v1` | `quality_classifications` | `[BD]` |
| QualityNX | `CommercialClassExamples` = EXTRA, CLASE I, CLASE II, FUERA DE ESPECIFICACIÓN, SIN CLASIFICAR | **"Categorías operacionales de ejemplo (configurables por matriz futura; no asumir SAG)"** | `[MODELO]` |
| QualityNX | `quality_semaphore` = VERDE / AMARILLO / ROJO, **"NO normativas SAG"** | Comentario de columna | `[MODELO]` |
| QualityNX | Decisiones: `APROBAR`, `RECHAZAR`, `RETENER`, `LIBERAR`, `SEGREGAR`, `CONTINUAR` | `decisions` (98: 20/18/18/17/15/10) | `[BD]` |

### 3.2 Hallazgo estructural

En QCInspec **la resolución aparece a nivel de criterio** (cada defecto tiene la
suya), **a nivel de muestra** (las 4 muestras del QC 193723 con su propia `Res`)
y **a nivel de QC** (una resolución mostrada en el detalle). Los tres niveles
coexisten, pero **la regla que pasa de criterio/muestra a QC no está escrita en
ningún lugar observable** `[QCINSPEC]`. Esa regla es precisamente lo que V2
necesita y no existe.

### 3.3 Matriz de equivalencias

| Sistema de origen | Categoría original | Contexto | Significado confirmado | Evidencia | Equivalencia QualityNX | Estado | Riesgo de una equivalencia incorrecta |
|---|---|---|---|---|---|---|---|
| QCInspec | `A` / `B` / `C` | Resolución de muestra y de QC | **Ninguno**: no hay leyenda, ni umbral, ni norma | Colores y badges observados `[QCINSPEC]` | Ninguna | **Pendiente** | **Alto**: presentaría como calidad comercial algo que no está definido; induciría a equivalencias con clase o semáforo |
| QCInspec | `1` / `2` / `3` | Resolución por defecto de defecto | **Ninguno** | Detalle de Granel `[QCINSPEC]` | Ninguna | **Pendiente** | **Alto**: es una escala distinta de la de condición y no se sabe si es ordinal |
| QCInspec | `A1..A4`, `B1..B4`, `C1..C4`, `4` | Dashboard "Industria" | **Ninguno** | Eje/leyenda del dashboard `[QCINSPEC]` | Ninguna | **Pendiente** | **Alto**: son 18 categorías sin definición; inventarlas sería fabrication |
| QCInspec | `A` / `B` (temperatura) | Dashboard 387 | **Ninguno**; sin rango que defina A | Dashboard `[QCINSPEC]` | Ninguna | **Pendiente** | **Alto**: es un veredicto sin criterio visible |
| QCInspec | `aprobado` (bool) | Detalle | Que el flujo lo marcó aprobado; **criterio no visible** | API `[QCINSPEC]` | Ninguna | **Pendiente** | Medio: invites a tratarlo como semáforo |
| QCInspec | `CAT - 1` / `CAT - 2` | Categoría de producto | **Ninguno** | Embalado `[QCINSPEC]` | Ninguna | **Pendiente** | Medio: es categoría de **producto**, no de calidad |
| QCInspec | `Liberada` + `Observacion Liberacion` | Liberación de lote | Que existe un acto de liberación con observación | Detalle `[QCINSPEC]` | **Sí, conceptual**: `decisions.decision_code = 'LIBERAR'` con `fundamento` | **Propuesta** | Bajo: QualityNX ya separa decisión humana; falta probar el mapeo |
| QCInspec | `Segregacion` / `CausalSegregacion` / `ValorSegregacion` | Análisis | Que existe el concepto de segregar con causa | Columnas y API `[QCINSPEC]` | **Sí, conceptual**: `decision_code = 'SEGREGAR'` | **Propuesta** | Bajo |
| QualityNX | `semaphore` VERDE/AMARILLO/ROJO | Clasificación por inspección | **Documentado**: "VERDE \| AMARILLO \| ROJO — categorías operacionales QualityNX, NO normativas SAG" | Comentario de columna `[MODELO]` | — | **Confirmado** | Alto si se_presenta como A/B/C |
| QualityNX | `commercial_class` | Clasificación por inspección | Texto libre; solo "ejemplos" disponibles | Tipo + datos `[MODELO][BD]` | — | **Pendiente (C-02)** | Alto |
| QualityNX | `quality_evaluations.result` | Evaluación por medición | CUMPLE / DESVIACIÓN / SIN CRITERIO / UNIDAD INCOMPATIBLE / CONFIG. AMBIGUA / CRITERIO INACTIVO | 1000 filas `[BD]` | — | **Confirmado** | — |

### 3.4 Conclusión del dominio 1

> **NO EXISTE EQUIVALENCIA APROBABLE TODAVÍA** entre la escala A/B/C de
> QCInspec y ninguna clasificación de QualityNX. La carta de QCInspec no tiene
> definición formal observable; QualityNX tiene un semáforo explícitamente no
> normativo y una clase comercial de texto libre sin catálogo aprobado.
>
> Lo único que **sí** se puede confirmar es que QualityNX **no** debe mapear
> A/B/C a Extra/Clase I/Clase II **ni** a Verde/Amarillo/Rojo: el propio
> repositorio prohíbe esa asunción `[MODELO]` y la evidencia de QCInspec la
> contradice (una misma letra `A` aparece en verde en Embalado y en azul en
> Despacho `[QCINSPEC]`, lo que demuestra que el color no es un significado
> estable).

---

## 4. DOMINIO 2 — AGREGACIÓN DE MÚLTIPLES MUESTRAS (N>1)

### 4.1 Estado del modelo

| Hecho | Valor | Fuente |
|---|---|---|
| Tabla `samples` | 16 filas; 12 con `fruit_quantity` | `[BD]` |
| Inspecciones con >1 muestra | **3** (9, 3 y 2 muestras) | `[BD]` |
| Máximo de muestras en una inspección | 9 | `[BD]` |
| Mediciones consolidadas (`sample_id` NULL) | **514** de 555 | `[BD]` |
| Mediciones por muestra | **41** de 555 | `[BD]` |
| Inspecciones con `sample_count` | 3 | `[BD]` |
| Inspecciones con `suggested_sample_count` | 4 | `[BD]` |
| Inspecciones con `sampling_plan_id` | 3 | `[BD]` |
| Inspecciones con `sampling_context` | 5 | `[BD]` |
| Restricción de unicidad | `measurements` por `(inspection_id, measurement_def_id)` consolidada y por muestra `[MODELO]` | `[MODELO]` |

### 4.2 El caso empírico disponible

Inspección `d9e19817` (9 muestras), criterio `Brix E2E`:

| Registro | Valor |
|---|---|
| Consolidada (`sample_id` NULL) | **11.4** |
| Muestra `c8e8073d` | 11.5 |
| Muestra `d883e640` | **1** |
| Muestra `4c5bb1b1` | 10.8 |

- Promedio de las tres muestras: **7.77** ≠ 11.4 `[BD]`.
- `quality_evaluations` evalúa **cada fila por separado** (la medición
  consolidada y las por muestra son mediciones distintas) `[MODELO]`, por lo que
  hoy QualityNX produce **tres determinaciones y una cuarta** para el mismo
  criterio de la misma inspección, sin que ninguna esté definida como "el
  resultado".

**Conclusión empírica:** existe evidencia de que el valor consolidado **no es el
promedio**. Con `n=3` y un valor `1` claramente anómalo (probable artefacto de
prueba) **no es derivable ninguna regla**: promediar, descartar,_replace la
media, o tomar el valor de otra muestra son todas hipótesis indistinguibles con
esta evidencia `[INFERENCIA]`.

### 4.3 Qué muestra QCInspec

| Contexto | Muestras observadas | Evidencia de consolidación |
|---|---|---|
| Granel | **1 muestra por QC** | NQC=1 siempre en lo observado `[QCINSPEC]` |
| Embalado | **4 muestras** (pestañas Muestra 1..4) | El PDF consolidado incluye una tabla **Muestras** con `Res` por muestra (las 4 = A) y una matriz atributo × muestra; la resolución a nivel QC se muestra aparte en el detalle `[QCINSPEC]` |
| Despacho | **20 pallets / 20 posiciones de estiba** | Análisis de 20 folios con T° y calificación por pallet `[QCInspec]` |

**Regla de consolidación de QCInspec: NO DEMOSTRADA.** Se observa que existe un
resultado por muestra y uno por QC, pero la regla que los relaciona no aparece
en ninguna pantalla ni documento del portal `[QCINSPEC]`.

### 4.4 Matriz por tipo de criterio

| Criterio (tipo) | Unidad | Contexto | Nivel de dato disponible | Regla QCInspec | Alternativas | Consecuencia de cada alternativa | Recomendación | Decisión pendiente |
|---|---|---|---|---|---|---|---|---|
| Atributo numérico (Brix, peso, calibre) | °Bx, g, mm, kg | Huerto, Cosecha, Recepción, Proceso, Despacho | Medición consolidada y por muestra (41 por muestra) | No demostrada | (a) independientes; (b) promedio; (c) min; (d) max; (e) proporción | (a) sin resultado único; (b) puede promediar valores no representativos (demostrado: ≠ consolidado); (c)/(d) casting de una regla de decisión sobre el peor caso no definida; (e) exige umbral → Depende de U-01..U-03 | **(a)**: mantener cada muestra como observación y **no** publicar "resultado de inspección" cuando N>1 | **A-01** |
| Defecto con porcentaje (Pudrición, Deshidratación) | % | Todas | Medición por inspección (predominio consolidado 514/555) | QCInspec muestra **% sobre la muestra** y suma por grupo `[QCINSPEC]` | (a) % sobre el conjunto de muestras; (b) % por muestra; (c) consolidar en QualityNX | (a) requiere definir el denominador (N); (b) fiel a lo observado; (c) inventaría una regla | **(b)** mientras no exista U-01 | **A-01** |
| Atributo por defecto con resolución (1/2/3, A/B/C) | adimensional | Todas | No existe en QualityNX | Visible en QCInspec | — | — | **Fuera de alcance** hasta C-01 | **C-01** |
| Temperatura por pallet | °C | Despacho | No modelada (no hay pallet) | QCInspec: promedio por pallet y por semana | — | — | **Fuera de alcance** hasta L-01 | **L-01** |
| Lista / texto (Color, Estado de madurez) | — | Todas | Texto | QCInspec muestra el valor y a veces "Resolución" | — | Consolidar texto no tiene sentido definido | Mantener por muestra/inspección sin consolidate | — |

### 4.5 Qué depende de esta decisión

- Cualquier indicador que diga "resultado de la inspección" (no "promedio de mediciones").
- La clasificación comercial y el semáforo, si pretendieran resumir la inspección.
- La decisión humana, si se solicitara un fundamento "de la inspección".
- Los promedios de la Fase B **no** dependen: son descriptivos y así se declaran.

---

## 5. DOMINIO 3 — UMBRALES Y ESPECIFICACIONES

### 5.1 Estado verificado

| Hecho | Valor | Fuente |
|---|---|---|
| Definiciones de criterio | **206** | `[BD]` |
| En `PENDIENTE DE VALIDACIÓN` | **206 (100 %)** | `[BD]` |
| Con `source_kind` informado | **0** | `[BD]` |
| Con límites (`min_value`/`max_value`) | **8** (7 del catálogo demo `CATALOGO_BASE_ARANDANO_FRESCO_2026-09-23`, 1 sin referencia) | `[BD]` |
| Referencias normativas | 3, **todas `is_active=false`**, con `version`, `valid_from`, `valid_to` en `null` | `[BD]` |
| Nota de la referencia SAG | "Los requisitos específicos SAG dependen del mercado y destino; **deben verificarse en la fuente oficial**" | `[BD]` |
| Nota de UNECE FFV-57 | "**no es una norma SAG ni una regla QualityNX automática**" | `[BD]` |
| Evaluaciones del Quality Engine | **1194**: CUMPLE 401, DESVIACIÓN 238, **SIN CRITERIO CONFIGURADO 498**, UNIDAD INCOMPATIBLE 21, CONFIGURACIÓN AMBIGUA 18, CRITERIO INACTIVO 18 | `[BD]` (lectura paginada; PostgREST trunca en 1000 filas) |
| Con límite en la evaluación | 618 de las primeras 1000 leídas; el total con límite debe releerse paginado | `[BD]` |
| Tipos de comparación usados | `minimo`, `rango` | `[BD]` |

### 5.2 Matriz de especificaciones

| Criterio | Unidad | Etapa | Producto/especie | Cliente o mercado | Límite inferior | Límite superior | Tipo de regla | Fuente documental | Vigencia | Estado de validación | Configurable en QualityNX |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sólidos solubles (°Brix) | °Bx | Inspección Huerto (demo) | Arándano (catálogo demo) | **Desconocido** | 10 | — | mínimo | `CATALOGO_BASE_ARANDANO_FRESCO_2026-09-23` (**catálogo interno de demostración**) | 2026-09-23 | **PENDIENTE DE VALIDACIÓN** | Sí (`measurement_defs.min_value`) |
| Calibre | mm | Huerto / Cosecha / Recepción / Proceso / Pre-Despacho | Arándano demo | Desconocido | 10 | 20 | rango | Ídem | 2026-09-23 | **PENDIENTE** | Sí |
| Pudrición | % | Ídem | Arándano demo | Desconocido | 0 | 2 | rango | Ídem | 2026-09-23 | **PENDIENTE** | Sí |
| Daño mecánico, Deshidratación, Fruta inmadura, Fruta sobremadura, Defectos | % | Ídem | Arándano demo | Desconocido | 0 | — | mínimo | Ídem / sin referencia | 2026-09-23 | **PENDIENTE** | Sí |
| Temperatura (4 nombres de criterio) | °C | Cosecha, Recepción, Pre-frío, Despacho | — | Desconocido | — | — | — | **Ninguna** | — | **PENDIENTE** | Sí, pero sin valor |
| Peso / Peso cajas | kg | — | — | Desconocido | — | — | — | **Ninguna** | — | **PENDIENTE** | Sí, pero sin valor |
| Brix (QCInspec) | °Bx | Granel | Arándanos | Wellness Fruit Chile (cuenta observada) | 15 | 17 | **Desconocido**: ¿criterio u observado? | **Ninguna** | — | **NO DETERMINADO** | — |
| Temperatura pulpa (QCInspec) | °C | Granel | Arándanos | Ídem | 18 | 18 | Ídem | **Ninguna** | — | **NO DETERMINADO** | — |
| Baxlo (QCInspec) | Shore | Granel | Arándanos | Ídem | 70 | 75 | Ídem | **Ninguna** | — | **NO DETERMINADO** | — |
| Calificación T° (QCInspec) | °C | Despacho | Arándanos | Ídem | — | — | A/B sin rango | **Ninguna** | — | **NO DETERMINADO** | — |

### 5.3 Documentos que faltan

1. **Especificación de calidad de Brix** por especie y mercado de destino
   (documento del cliente o norma aplicable), con versión y vigencia.
2. **Especificación de temperatura** por etapa y uso (cadena de frío), o
   confirmación de que la temperatura se registra solo como dato.
3. **Especificación de peso** (cajas / kilogramos) y definición de cuál es la
   base de volumen.
4. **Regla de la carta A/B/C** si se quiere paridad con QCInspec.
5. **Procedimiento de validación de criterios**: quién valida, con qué documento
   y cuándo se mueve de `PENDIENTE DE VALIDACIÓN` a `VALIDADO`.

> **Regla vigente que se mantiene:** un criterio puede capturarse sin
> especificación, pero **no** puede presentarse como cumplimiento o desviación
> normativa `[DOC CURRENT]`. Por eso los indicadores de la Fase B son
> descriptivos y esta decisión **no es un bloqueo de la V2**: es una decisión
> deCorrectness.

---

## 6. DOMINIO 4 — BASE DE PESO PARA INDICADORES DE VOLUMEN

### 6.1 Campos existentes y cobertura real

| Campo | Qué representa | Cobertura (357 lotes) | Uso en el sistema |
|---|---|---|---|
| `lots.quantity` | Cantidad de envases | **328** | Alimenta `theoretical_weight_kg` |
| `lots.theoretical_weight_kg` | **Calculado**: cantidad × peso teórico del embalaje | **326 (91 %)** | Único peso amplio disponible |
| `lots.weight` + `weight_unit` | Peso registrado manualmente | **2** (unidad `kg`) | Prácticamente vacío |
| `lots.kg_declarados` | Peso declarado en la guía del productor | **2** | Prácticamente vacío |
| `packaging_types.theoretical_weight_kg` | Peso teórico por tipo de envase | — | Origen del cálculo |
| `lots.producer_guide_number` | Guía del productor | **7** | Trazabilidad multis lote |
| `lots.folio_interno` | Folio de planta | **1** | — |
| `lots.season_id` | Temporada | 332 | — |
| `lots.current_operational_stage_id` | Etapa actual | **22** | — |
| `lots.lot_type` | ORIGEN / PROCESO / REPALLETIZAJE | 354 ORIGEN / 3 REPALLETIZAJE / **0 PROCESO** | Genealogía |

### 6.2 Evidencia de QCInspec

- Los dashboards usan **"Kilos"** como medida (`Kilos Resolución`,
  `Kilos Semana`), con **denominador = total de kilos del filtro activo**,
  verificado aritméticamente en los dashboards 383 y 386 `[QCINSPEC]`.
- En el detalle de inspección, QCInspec muestra **"Kilos 3.960,00"** en Granel
  y **"N° Envases Pallet 240"** y **peso por pallet** en Embalado `[QCINSPEC]`.
- **Qué campo de kilos alimenta el dashboard no es determinable**: el modelo
  Power BI no está expuesto y no hay API documentada `[DESCONOCIDO]`.

### 6.3 Evaluación de cada base

| Base | Qué permite | Distorsión que genera | Datos faltantes | Evaluación |
|---|---|---|---|---|
| Teórico (`quantity` × peso del envase) | Indicadores de volumen consistentes y disponibles hoy | Depende de que el peso teórico del envase sea correcto; **es una estimación, no el peso real**; no distingue varieties ni calibre | Peso real del pallet | **Útil pero declararlo como "peso teórico"** |
| Declarado (`kg_declarados`) | Peso que declara el productor, base comercial real | Prácticamente vacío (2/357); mezclaría lotes con y sin dato → denominador inconsistente | Requiere carga masiva por guía | **No usable como denominador único hoy** |
| Registrado (`weight`) | Peso medido en piso | Prácticamente vacío (2/357) | Requiere captura en recepción y despacho | **No usable** |
| Medido enInspection | Pesado real | **No existe el dato** | Requiere nuevo registro | **No existe** |

### 6.4 Recomendación explícita por indicador de volumen

| Indicador de la matriz de equivalencia | Base de peso recomendada | Etiqueta obligatoria en pantalla | Estado |
|---|---|---|---|
| A1 `Kilos Resolución` → equivalente QualityNX | **Teórico**, con selector de base si el cliente lo aprueba | "Peso teórico (cantidad × peso del envase). No es peso real." | **PROPUESTA** |
| A2 `Resoluciones Semana` | Ídem A1 | Ídem | **PROPUESTA** |
| A3 `Kilos Semana` / volumen total | Ídem A1, **con universo declarado** (¿todos los lotes? ¿cerrados? ¿con clasificación vigente?) | Ídem + criterio de inclusión | **REQUIERE CONFIRMACIÓN** (universo) |
| A4 Brix por día (Fase B) | **No usa peso** | — | **Confirmado** |
| A9 Temperatura por semana (Fase B) | **No usa peso** | — | **Confirmado** |
| Volumen por productor/variedad | Teórico | Ídem | **PROPUESTA** |

> **Regla que se propone:** ningún indicador de volumen se publica sin (a) base de
> peso declarada, (b) universo declarado y (c) cantidad de lotes con y sin dato.
> Si el peso declarado se carga masivamente, la base por defecto puede
> revisarse con evidencia.

---

## 7. DOMINIO 5 — DIMENSIONES LOGÍSTICAS

### 7.1 Lo que existe hoy en QualityNX

| Entidad/dimensión | Estado | Fuente |
|---|---|---|
| Lote con origen, variedad, especie, fecha, bloque, temporada, guía, packaging | Existe | `[MODELO]` |
| Genealogía origen→derivado con `quantity`/`unit` | Existe y validada funcionalmente | `[MODELO]` |
| Etapa actual y eventos de etapa | Existe; **22 de 357** lotes con etapa actual | `[MODELO][BD]` |
| Pallet | **No existe** | `[MODELO]` |
| Contenedor | **No existe** | `[MODELO]` |
| Planta | **No existe** | `[QCInspec]` vs `[MODELO]` |
| Nave / puerto / tipo de movimiento / conservación | **No existe** | `[MODELO]` |
| Destino / recibidor | **No existe** | `[MODELO]` |
| Sellos (MLCL / SAG / USDA) | **No existe** | `[MODELO]` |
| Plano de estiba / termógrafos | **No existe** | `[MODELO]` |
| Foto atribuida a un criterio | 35 evidencias, **0** con `measurement_def_id` | `[BD]` |

### 7.2 Lo que QCInspec usa

`contenedor` · `N° Sello` + `Sello SAG` + `Sello Naviera` · `Nave` ·
`Puerto Embarque` / `Puerto Destino` · `Tipo Movimiento` ·
`Tec. Conservación` · `% Ventilación / CBM` · `Recibidor` ·
`Patente Camión` / `Patente Carro` · `N° Pallets` · `Folio` de pallet ·
`Ubicación Estiba` (Punta/Espejo) · `Planta` · `Termógrafos` ·
`Temperatura por pallet` y `Calificación T° por pallet` `[QCINSPEC]`.

### 7.3 Advertencia sobre cardinalidad

**No se puede asumir 1 lote = 1 pallet = 1 contenedor.** En la operación
observada conviven:
- Embalado: 4 muestras y **240 envases por pallet** `[QCINSPEC]`.
- Despacho: **20 pallets** por contenedor, con plan de estiba de 28
  posiciones `[QCINSPEC]`.
- QualityNX: la genealogía permite **N orígenes → 1 derivado**
  (`lot_genealogy` sin restricción de cardinalidad en el origen) `[MODELO]`.

Por tanto, un pallet **puede mezclar lotes** y un contenedor **puede contener
pallets de lotes distintos**. La genealogía actual **no debe reinterpretarse**
como relación logística: su semántica es "este lote derivado se construyó con
este origen y esta cantidad", no "este pallet se cargó con este lote".

### 7.4 Propuesta conceptual

| Dimensión / entidad | Propósito operacional | Atributos mínimos respaldados por evidencia | Relaciones requeridas | Cardinalidad | Indicadores que habilitaría | Datos que faltan hoy | Prioridad V2 | Riesgo de modelado incorrecto |
|---|---|---|---|---|---|---|---|---|
| **Reutilizar `lots.theoretical_weight_kg`** | Peso de referencia ya disponible | — | — | 1 lote → 0..1 peso | Volúmenes (A1, A2, A3) | Peso real | **Ya en uso** | Bajo |
| **Reutilizar `lots.producer_guide_number`** | Agrupar lotes de una guía | Ya existe | 1 guía → N lotes | 1..N | Consolidado por guía | Guías cargadas (7/357) | **Ya en uso** | Bajo |
| **Reutilizar `inspection_evidence`** | Evidencia fotográfica | Ya existe | inspección → evidencia | 1..N | Trazabilidad | 0 evidencias con `measurement_def_id` | **Media** | Bajo |
| **`pallets`** | Unidad logística real de embarque | folio, cantidad de envases, peso, ids de lote contributors | pallet → N lotes (con cantidad por lote) | N..1 | A10, A11, A12 | Todo | **Alta** | **Alto** si se asume 1 pallet = 1 lote |
| **`shipments` / `containers`** | Embarque | contenedor, tipo, nave, puertos, tipo movimiento, conservación, destino, recibidor, sellos | shipment → N pallets | 1..N | A9, A12 | Todo | **Alta** | **Alto** |
| **Atributar evidencia a criterio** | Evidencia por criterio | `measurement_def_id` en evidencia | evidencia → medición | N..1 | Trazabilidad de evidencia | 0 de 35 | **Media** | Bajo |
| **Etapa actual por lote** | ¿Dónde está el lote? | Ya existe | — | 0..1 | Filtro por etapa en todos los indicadores | 22/357 lotes con etapa | **Media** | Bajo |

**Reutilizar vs. desarrollo:** solo las tres primeras filas reutilizan entidades
existentes. Las demás **requieren desarrollo de modelo** y deben quedar fuera de
la V2 salvo decisión expresa.

---

## 8. PREGUNTAS CONCRETAS PARA EL USUARIO / CLIENTE

Ordenadas por desbloqueo. Cada una es cerrada y con impacto identificado.

### P-1 · Clasificación (desbloquea C-01, C-02 y los indicadores de clase)
> ¿QualityNX debe tener una escala de clasificación propia, o replicar la carta
> A/B/C de QCInspec?
> **a)** Escala propia, sin equivalencia con QCInspec → los indicadores se
> presentan como "participación por clase QualityNX", no comparables con
> QCInspec. **b)** Replicar A/B/C → **imposible hoy**: nadie define qué
> significa cada letra. **c)** Obtener de QCInspec la definición de A/B/C y de
> la escala extendida A1–C4 → sin eso, la opción (b) no puede ejecutarse.
> **Recomendación:** (a) ahora, (c) en paralelo.

### P-2 · Valores de la clase comercial (desbloquea C-02)
> ¿Qué valores puede tomar `commercial_class` y quién los define?
> **a)** Lista fija de ejemplo (`EXTRA`, `CLASE I`, `CLASE II`, `FUERA DE
> ESPECIFICACIÓN`, `SIN CLASIFICAR`) → simple, pero el propio código advierte
> que no es universal. **b)** Catálogo por cliente/especie, versionado →
> requiere que el cliente entregue su matriz. **c)** Texto libre sin catálogo →
> no permite agrupar.
> **Recomendación:** (b).

### P-3 · Umbrales (desbloquea U-01, U-02, U-03)
> ¿El cliente puede entregar las especificaciones con documento, versión y
> vigencia para Brix, temperatura y peso?
> Sin documento **no hay cumplimiento evaluable** y los tres criterios siguen
> como observados. Si existen, indicar para qué especie, mercado, etapa y tipo
> de envase aplican, y si aceptan o no que QualityNX sea el sistema que las
> registra.
> **Impacto de no responder:** ningún cambio; el estado actual es correcto y
> seguro.

### P-4 · Procedimiento de validación de criterios (desbloquea U-04)
> ¿Quién valida un criterio y con qué evidencia? El sistema exige
> `source_kind`, `source_ref` y `validation_status`, y hoy el **100 %** está en
> `PENDIENTE DE VALIDACIÓN` con **0** fuentes Informadas.
> **a)** El cliente valida y QualityNX registra. **b)** QualityNX propone y el
> cliente aprueba en cada actualización.
> **Recomendación:** (b).

### P-5 · Base de peso (desbloquea P-01)
> ¿Qué peso representa el volumen?
> **a)** Peso teórico (cantidad × peso del envase): disponible en el 91 % de los
> lotes hoy, pero es una estimación. **b)** Peso declarado por el productor: es la
> base comercial real, pero está cargado en **2 de 357** lotes. **c)** Ambos,
> con selector visible en cada indicador.
> **Recomendación:** (c) con defecto en (a). Si el cliente puede cargar
> `kg_declarados` masivamente, se revisa con evidencia.
> **Efecto colateral a decidir:** ¿el peso declarado **reemplaza** al teórico o
> conviven? Hoy conviven y el informe prioriza el teórico `[DOC]`.

### P-6 · Universo de los indicadores de volumen (desbloquea A3)
> ¿"Kilos del período" incluye todos los lotes, solo los cerrados, o solo los
> que tienen clasificación vigente? Sin este dato el indicador no es auditable.

### P-7 · Agregación N>1 (desbloquea A-01)
> ¿Cuál es el resultado de una inspección cuando hay varias muestras?
> **a)** Cada muestra es una observación y **no** se publica un resultado único
> (estado actual, seguro). **b)** Promedio — **contradicho** por el único caso
> existente (consolidada 11.4 vs. promedio 7.77). **c)** Peor caso (más
> desviado) — exige un criterio de "peor" por tipo de criterio.
> **Recomendación:** (a) hasta que exista el plan de muestreo y una decisión
> documentada; (c) solo después de P-3.

### P-8 · Modelo logístico (desbloquea L-01)
> ¿V2 debe incluir la trazabilidad de pallet/contenedor/embarque que muestran los
> dashboards de despacho de QCInspec?
> **a)** Sí: requiere `pallets` y `shipments`, con cardinalidad **N lotes por
> pallet**. **b)** No en V2: los indicadores de despacho, temperatura por
> pallet, plan de estiba y calidad de embarque quedan fuera.
> **Recomendación:** (b) para V2 y (a) como etapa posterior, porque el modelo no
> existe y su costo es alto.

### P-9 · Evidencia por criterio
> ¿La evidencia fotográfica debe quedar asociada a un criterio concreto o a la
> inspección completa? Hoy **0 de 35** evidencias tienen `measurement_def_id`.

---

## 9. PROPUESTA DE SECUENCIA PARA LA SIGUIENTE FASE

### 9.1 Implementable de inmediato (con las definiciones actuales)
1. **Indicadores observados adicionales que no dependen de ninguna decisión
   pendiente**, siempre sobre la misma capa de la Fase B:
   - Recuento y promedio de Brix **por productor**, **por variedad** y **por
     etapa** (dimensiones ya existentes en el modelo).
   - Recuento de mediciones **no evaluables** por criterio y por período
     (calidad del dato, no cumplimiento).
   - Distribución de días/semanas con y sin mediciones (visibilidad de
     cobertura del dato).
2. **Trazabilidad ampliada**: desde un criterio hasta las mediciones y
   evaluaciones de Quality Engine, y de ahí a la clasificación y a la decisión
   associated. Todo con relaciones existentes.
3. **Panel de cobertura de criterios**: cuántas definiciones están
   `PENDIENTE DE VALIDACIÓN`, cuántas tienen fuente, cuántas etapas tienen
   criterios cargados. Hace visible la foto real del sistema.
4. **Consolidar en la UI las decisiones ya existentes** (`APROBAR`,
   `RECHAZAR`, `RETENER`, `LIBERAR`, `SEGREGAR`, `CONTINUAR`) como vista de
   consulta por lote y período, sin cambiar su semántica.

### 9.2 Requiere confirmación del usuario/cliente
- Indicadores de **volumen** (cualquiera de ellos) → requieren P-5 y P-6.
- Indicadores de **participación por clase** → requieren P-1 y P-2.
- Cualquier indicador que use **N>1 como resultado de inspección** → P-7.

### 9.3 Requiere evidencia documental adicional
- Todo indicador de **cumplimiento** (con o sin semáforo) → requiere P-3 y P-4.
- Replicar la carta A/B/C → requiere la definición de QCInspec.

### 9.4 Requiere cambios de modelo
- Indicadores de **pallet, contenedor, embarque, estiba o termografía** →
  P-8 y desarrollo `pallets`/`shipments`.
- **Evidencia por criterio** → P-9 y columna `measurement_def_id` en evidencia.

### 9.5 Indicadores de QCInspec que podrían implementarse primero
Ordenados por dependencia decreciente:

| # | Indicador QCInspec | Dependencia | viable en V2 |
|---|---|---|---|
| 1 | `Kilos Semana` + total (383) | P-5, P-6 | Sí, tras P-5/P-6 |
| 2 | `Grados Brix Promedio por Dia` (384) | **Ya construido** (Fase B) | **Sí, hoy** |
| 3 | `Promedio Temperatura por Semana` (387 pág.1) | **Ya construido** (Fase B) | **Sí, hoy** |
| 4 | `Kilos Resolución` (383/386) | P-1, P-2, P-5 | No |
| 5 | `Resoluciones Semana` (383/386) | P-1, P-2, P-5, P-6 | No |
| 6 | `Distribucion Defectos Calidad/Condicion` (385) | U-04, y el visual de origen está **vacío** en QCInspec | No (y sin referencia verificable) |
| 7 | `Cantidad Pallets por Resolucion`, `Temperatura por Pallet`, matriz de embarque (387) | L-01 | No |

### 9.6 Indicadores que permanecen fuera de alcance
Kilos de resolución, participación por clase, distribución de defectos por
calidad/condición, consolidación N>1 como resultado, umbrales de temperatura,
Brix o peso, indicadores de pallets/contenedores/embarques y comparaciones
entre temporadas o períodos.

### 9.7 Validaciones necesarias para la siguiente fase
- Pruebas unitarias de la regla de conversión y de agrupación (ya existente el
  patrón de la Fase B).
- Validación funcional por indicador contra un control independiente leído
  desde la base.
- Integridad: verificación de que el cálculo no altera datos, ni genera
  reevaluaciones, ni modifica decisiones ni clasificaciones, ni realiza
  escrituras.
- Verificación de aislamiento por empresa y de ausencia de políticas nuevas.

---

## 10. CONTRADICCIONES DETECTADAS ENTRE DOCUMENTOS

No se encontró ninguna. Se verificó coherencia entre `CURRENT.md`,
`BUILD_STATUS.md`, `MATRIZ_EQUIVALENCIA_V2.md`, `QCINSPEC_LEVANTAMIENTO_V2.md`
y el esquema. La única observación menor: `CURRENT.md` describe la base de
agregación N>1 como "PENDIENTE DE ESPECIFICACIÓN" y la Fase B la trata como
"no consolidada"; ambos enunciados son consistentes (la segunda es más
precisa: **no** se consolida y no se publica como resultado).

---

## 11. ESTADO DE ESTA FASE

| Dominio | Estado |
|---|---|
| 1 · Clasificación | **Bloqueado** en equivalencia (C-01); decisión de negocio abierta en C-02 |
| 2 · Agregación N>1 | **Bloqueado por falta de evidencia** (A-01); recomendación (a) vigente |
| 3 · Umbrales | **Bloqueado por falta de evidencia documental** (U-01, U-02, U-03); U-04 requiere confirmación |
| 4 · Base de peso | **Propuesta para aprobación** (P-01); P-02 bloqueado |
| 5 · Dimensiones logísticas | **Propuesta conceptual** (L-01 requiere decisión); L-02 y L-03 con fecha directa |

**Ningún bloqueo impide** los indicadores descriptivos ya construidos ni los
incrementos del §9.1. Los bloqueos están localizados en clasificación,
cumplimiento, volumen y logística.
---

## 12. Nota de alcance — D-032 no está bloqueado por decisiones de negocio

Las decisiones abiertas de este documento (C-01, C-02, A-01, U-01 a U-04, P-01,
L-01) siguen vigentes y **no se resolvieron por supuesto técnico**.

Sin embargo, el control de transformaciones de planta **no depende de ninguna de
ellas**. Conservar entradas, salidas, remanentes y mermas explícitas, y no
consumir más de lo disponible, son **reglas operacionales del sistema**: no
requieren una norma de calidad, una tolerancia ni una clasificación comercial.

| Decisión abierta | ¿Bloquea D-032? | Motivo |
|---|---|---|
| C-01 escala A/B/C | No | D-032 registra cantidades y genealogía, no clasificaciones |
| U-01/02/03 umbrales | No | Un remanente de 20 bandejas no necesita norma de calidad |
| A-01 consolidación N>1 | No | Es una decisión de análisis de mediciones, no de movimientos |
| P-01 base de peso | No | D-032 trabaja con la unidad que la operación declara |
| L-01 logística | Parcialmente | El modelo no inventa planta/pallet/contenedor; `destination_reference` queda como texto libre y `NULL` significa "no registrado" |

**Lo que sí sigue bloqueado dentro de D-032:** la migración no está aplicada, por
lo que el caso principal end-to-end y los casos negativos contra base de datos
todavía no se han ejecutado.
