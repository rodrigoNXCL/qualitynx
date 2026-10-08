# MATRIZ DE EQUIVALENCIA — QCINSPEC → QUALITYNX V2

**Fecha:** 2026-10-04
**Base funcional:** `docs/QCINSPEC_LEVANTAMIENTO_V2.md` (observación directa,
2026-10-04) y `docs/CURRENT.md` (fuente de verdad QualityNX).
**Estado de datos QualityNX:** verificado en el esquema del repositorio
(migraciones `packages/database/supabase/migrations`) y en la base Supabase
`sjecyepmeqvhraptovxo`.

Leyenda de estado:
- **DISPONIBLE** — el dato y la regla ya existen en QualityNX.
- **REQUIERE AJUSTE** — el dato existe; falta alineación de escala, unidad o regla.
- **REQUIERE DESARROLLO** — falta la capacidad (modelo, cálculo o vista).
- **PENDIENTE DE EVIDENCIA** — no se puede definir sin confirmación del usuario.

---

## A. Dashboards de Indicadores (QCInspec)

### A1. `Kilos Resolución` — 383 / 386 (anillo)

| Campo | Contenido |
|---|---|
| **Indicador** | Kg por `Resolucion` + % del total |
| **Dimensiones y filtros** | `Resolucion`; filtros Producto, Especie, Temporada, Productor, Variedad, Semana |
| **Criterios QC** | Carta de resolución por defecto de la inspección (A/B/C, 1/2/3). Definición **PENDIENTE DE EVIDENCIA** |
| **Datos necesarios** | Peso del lote + resolución/classified por lote o inspección |
| **Disponible QualityNX** | `lots.theoretical_weight_kg` / `kg_declarados` / `weight`+`weight_unit`; `quality_classifications` (`commercial_class`, `semaphore`) por `inspection_id` |
| **Brecha** | No existe escala cerrada de "Resolución A/B/C" en QualityNX: hay `commercial_class` (texto) y `semaphore` (VERDE/AMARILLO/ROJO). No hay clave de agrupación estable equivalente |
| **Regla requerida** | `%(r) = Σ peso(r) / Σ peso(total del filtro)`. Verificada en QCInspec. En QualityNX falta decidir **qué peso** (teórico vs declarado) y **qué clave** |
| **Implementación V2** | Indicador "Participación por clase comercial" agrupado por `commercial_class` sobre peso, con selector de origen de peso; renombrar para no afirmar equivalencia con la carta A/B/C |
| **Estado** | **REQUIERE AJUSTE** (dato existe) + **PENDIENTE DE EVIDENCIA** (equivalencia de escala) |

### A2. `Resoluciones Semana` — 383 / 386 (columnas 100 % apiladas)

| Campo | Contenido |
|---|---|
| **Indicador** | Composición porcentual semanal por resolución (eje Y = %) |
| **Dimensiones y filtros** | `Semana` (45–53), `Resolucion`; mismos filtros |
| **Criterios QC** | Igual que A1 |
| **Datos necesarios** | Fecha de la clasificación/inspección + peso + clase |
| **Disponible QualityNX** | `quality_classifications.classified_at`, `inspections.inspected_at`, `lots.season_id`, `lots.theoretical_weight_kg` |
| **Brecha** | `Semana` no está materializada (se deriva de la fecha). La comparación 100 % exige normalizar por el total semanal |
| **Regla requerida** | `%(semana, clase) = peso(clase)/Σpeso(semana)` |
| **Implementación V2** | Serie semanal de composición por clase; `Semana` derivada con regla explícita y documentada (ISO o semana de temporada), reusing the QCInspec semantics |
| **Estado** | **REQUIERE DESARROLLO** |

### A3. `Kilos Semana` + KPI total — 383 (línea + tarjeta)

| Campo | Contenido |
|---|---|
| **Indicador** | Volumen absoluto semanal y total del período (1.44M Kilos) |
| **Dimensiones y filtros** | `Semana`; mismos filtros |
| **Criterios QC** | Ninguno directamente (es volumen) |
| **Datos necesarios** | Peso por lote/inspección con fecha |
| **Disponible QualityNX** | Ídem A2 |
| **Brecha** | Ídem A2; además definir qué lotes entran (¿todos los tipos? ¿cerrados?) |
| **Regla requerida** | `Σ peso` por semana y total del filtro |
| **Implementación V2** | Tarjeta de volumen del período + línea semanal, con **universo explícito** (p. ej. solo lotes con clasificación vigente) |
| **Estado** | **REQUIERE DESARROLLO** |

### A4. `Grados Brix Promedio por Dia` / `Industria` — 384

| Campo | Contenido |
|---|---|
| **Indicador** | Promedio de Grados Brix por día, por Cliente y por Industria |
| **Dimensiones y filtros** | `Cliente`, `Industria`, `Dia`, `Temporada`, `Productor` |
| **Criterios QC** | Atributo `Grados Brix` (unidad °Bx) del catálogo granel |
| **Datos necesarios** | Medida de Brix por muestra/inspección + fecha + cliente/industria |
| **Disponible QualityNX** | `measurements.value` (**TEXT**), `measurement_defs`, `quality_evaluations.observed_value`, `normative_references`; **no existe** `Cliente` ni `Industria` como dimensión |
| **Brecha** | (a) El dashboard QCInspec **no entrega valores** (todo `(Blank)`) → PENDIENTE DE EVIDENCIA; (b) `measurements.value` es TEXT: requiere casteo numérico y política para valores no numéricos; (c) no hay dimensión cliente/industria |
| **Regla REQUIRED** | `promedio(Brix) = media aritmética de las mediciones evaluables del filtro`. **No hay regla de comparación válida** (sin rango SAG verificado) |
| **Implementación V2** | Promedio de Brix **solo** como medida observada (no como cumplimiento), con contador de mediciones evaluables y excluyendo no numéricos; sin perfil cliente/industria hasta que se defina |
| **Estado** | **PENDIENTE DE EVIDENCIA** (fuente QCInspec vacía) + **REQUIERE AJUSTE** (valor TEXT) |

### A5. `Distribucion Resolucion Calidad` / `Condicion` — 385

| Campo | Contenido |
|---|---|
| **Indicador** | Distribución de resoluciones, separada en grupo CALIDAD y grupo CONDICION |
| **Dimensiones y filtros** | `Resolucion` × grupo; filtros Temporada, Productor, Nº Guia |
| **Criterios QC** | Todos los criterios con resolución por defecto, agrupados en CALIDAD / CONDICION |
| **Datos necesarios** | Criterio evaluado + resultado + grupo (calidad/condición) + resolución |
| **Disponible QualityNX** | `quality_evaluations` (result, criterion_snapshot), `measurement_defs` (con `point_id`/etapa), `quality_classifications`; **no existe** el atributo "grupo CALIDAD/CONDICION" |
| **Brecha** | Falta la dimensión **grupo del criterio** (calidad vs condición). Es una decisión de modelado, no un supuesto |
| **Regla requerida** | `distribución = nº inspecciones (o mediciones) por resolución`, base declarado |
| **Implementación V2** | Distribuciones por clase comercial + por semáforo, y por criterio, **con el grupo del criterio como campo configurable** (PENDIENTE de decisión de modelado) |
| **Estado** | **PENDIENTE DE EVIDENCIA** (el visual QCInspec está vacío) + **REQUIERE DESARROLLO** |

### A6. `Distribucion Defectos Calidad` / `Condicion` — 385

| Campo | Contenido |
|---|---|
| **Indicador** | Distribución de defectos (recurrencia y peso relativo) por grupo |
| **Dimensiones y filtros** | `Defecto` × grupo; Temporada, Productor, Nº Guia |
| **Criterios QC** | Catálogo de defectos observado en QCInspec (Russet, Fruta Roja, Pedicelo, Pudricion, Deshidratacion, Machucón, Desgarro Pedicelar, Falta de Cera/Bloom, Fruta Blanda, etc.) |
| **Datos necesarios** | Medida por defecto (conteo o %) por inspección/lote |
| **Disponible QualityNX** | `measurements` + `measurement_defs` (catálogo base incluye Pudrición, Daño mecánico, Deshidratación, Cicatrices/russet, etc.); `quality_evaluations.deviation` |
| **Brecha** | Los criterios están **solo cargados en "Inspección Huerto"** (17 mediciones demo). No hay defecto medido con配置 en Recepción/Granel ni Proceso/Embalado |
| **Regla requerida** | Definir base: `nº de inspecciones con desviación` vs `% de la muestra`. QCInspec usa % de muestra; QualityNX tiene `sample_id` pero la agregación multi-muestra está **PENDIENTE DE ESPECIFICACIÓN** |
| **Implementación V2** | Recurrencia de desvíos por criterio y por productor/variedad/etapa, con base declarada y contador de evaluables |
| **Estado** | **REQUIERE DESARROLLO** |

### A7. `Kilos Resolución Industria` — 386 (escala fina)

| Campo | Contenido |
|---|---|
| **Indicador** | % por resolución en escala fina (`1,2,3,4,A,A1..A4,B,B1..B4,C,C1..C4`) |
| **Dimensiones y filtros** | `Resolucion` (fina), `Variedad`, `Semana`, Temporada |
| **Criterios QC** | Sub-clasificaciones de la carta |
| **Datos necesarios** | Resolución fina por unidad de análisis |
| **Disponible QualityNX** | Ninguna: no existe sub-clasificación de resolución |
| **Brecha** | El significado de `A1`, `B2`, `C4` **no está definido en ningún lugar observable** |
| **Regla requerida** | No definible sin la taxonomía oficial |
| **Implementación V2** | **No implementar** hasta que el usuario entregue la taxonomía. No inventar 18 categorías |
| **Estado** | **PENDIENTE DE EVIDENCIA** |

### A8. `Resoluciones Semana Industria` — 386

| Campo | Contenido |
|---|---|
| **Indicador** | Composición semanal con escala fina (semanas 23–48) |
| **Dimensiones y filtros** | `Semana`, `Resolucion` (fina), `Variedad` |
| **Criterios QC** | Ídem A7 |
| **Disponible QualityNX** | Ídem A7 |
| **Brecha** | Depende de A7 |
| **Implementación V2** | No implementar hasta definir A7 |
| **Estado** | **PENDIENTE DE EVIDENCIA** |

### A9. `Promedio Temperatura por Semana` — 387 pág. 1

| Campo | Contenido |
|---|---|
| **Indicador** | Temperatura promedio semanal (`Promedio Temperatura` + `Promedio Total`) |
| **Dimensiones y filtros** | `Semana`, `Planta`, `Temporada` |
| **Criterios QC** | Temperatura (pulpa/transporte). Rango de aceptación **NO DETERMINADO** |
| **Datos necesarios** | Temperatura por pallet/inspección con fecha y planta |
| **Disponible QualityNX** | `measurements` + `measurement_defs`; existe punto `Despacho / Embarque` en `operational_stages` y criterio "Temperatura al embarque cuando aplique" en el catálogo base |
| **Brecha** | (a) valor TEXT → promedio requiere casteo; (b) **no existe entidad de embarque/pallet** ni `Planta` como dimensión de QualityNX (la planta vive en QCInspec); (c) sin umbral válido no hay "Cumple" |
| **Regla requerida** | `promedio = media aritmética de mediciones evaluables del filtro`, conAGGREGACIÓN multi-lote declarada |
| **Implementación V2** | Temperatura como **medida observada** por etapa/punto, sin juicio de cumplimiento hasta que exista regla validada |
| **Estado** | **REQUIERE DESARROLLO** + **PENDIENTE DE EVIDENCIA** (umbral) |

### A10. `Cantidad Pallets por Resolucion` — 387 pág. 2

| Campo | Contenido |
|---|---|
| **Indicador | ** | Cantidad de pallets por `Resolucion` (A/B), en **cantidad de pallets**, no kg |
| **Dimensiones y filtros** | `Resolucion`, `Contenedor`, Temporada |
| **Criterios QC** | Temperatura por pallet |
| **Datos necesarios** | Entidad pallet/contenedor + resolución por pallet |
| **Disponible QualityNX** | **Ninguno**: no existe pallet ni contenedor |
| **Brecha** | Modelado de embarque inexistente en QualityNX |
| **Regla requerida** | Reparto de **unidades (pallets)**, no de masa |
| **Implementación V2** | **Fuera de alcance en V2** salvo que se defina el modelo de embarque. Documentado como brecha mayor |
| **Estado** | **REQUIERE DESARROLLO** (modelo) |

### A11. `Temperatura por Pallet` — 387 pág. 2

| Campo | Contenido |
|---|---|
| **Indicador** | Temperatura por folio de pallet (barras) |
| **Datos necesarios** | Entidad pallet |
| **Disponible QualityNX** | Ninguno |
| **Brecha** | Ídem A10 |
| **Implementación V2** | Sustituto posible: temperatura por **lote** en la etapa de despacho/embarque (QualityNX no tiene pallet) |
| **Estado** | **REQUIERE AJUSTE** (usar lote en vez de pallet) |

### A12. Matriz de detalle de embarque — 387 pág. 2 (`Select Row`)

| Campo | Contenido |
|---|---|
| **Indicador** | Tabla navegable: QC, Folio, Tipo, Planta, Especie, Cajas, Temperatura, Resolucion, Destino, Recibidor |
| **Valor para la gerencia** | Es el único drill-down real observado: del indicador a la unidad concreta |
| **Datos necesarios** | Contexto logístico de embarque |
| **Disponible QualityNX** | Contexto de lote (productor, variedad, especie, cajas/quantity, etapas). **No** destino, recibidor, contenedor, planta, tipo movimiento |
| **Brecha** | Contexto logístico de despacho no modelado |
| **Implementación V2** | La **trazabilidad de indicador → lote → inspección → criterio → medición → evidencia** sí es construible con el modelo actual (`lot_stage_events`, `inspections`, `measurements`, `quality_evaluations`, `inspection_evidence`); el contexto logístico queda fuera hasta decidir su modelado |
| **Estado** | **REQUIERE DESARROLLO** |

---

## B. Módulos analíticos QCInspec (referencia de datos y no de dashboard)

| QCInspec | Indicador / información | Disponible QualityNX | Brecha | Estado |
|---|---|---|---|---|
| **Granel / Análisis** | Tabla por QC con Defecto Predominante, Resolucion, Causal, %Causal, %Embalaje, Fruta Firme/Blanda; Other Attributes con Valor/Mín/Máx; distribuciones calibre/color | `inspections`, `measurements`, `quality_evaluations` (limit_min/limit_max), `quality_classifications` | "Defecto Predominante", "% Embalaje", "Fruta Firme/Blanda" y distribuciones de calibre/color no existen | **REQUIERE DESARROLLO** |
| **Embalado / Análisis** | 2.860 elementos, 115 páginas, export XLSX; columnas Calidad 1-2, Condición A-B, Crítico, Resolucion, Segregacion | `quality_classifications` (clase + semáforo) | No hay `Crítico`, `Segregación` ni `Causal` | **REQUIERE AJUSTE** (mapear Crítico → semáforo) |
| **Despacho / Análisis** | 4.585 elementos, 184 páginas; plano de estiba, termógrafos | `lot_stage_events`, `inspections` en Despacho/Embarque | Sin estiba, sin termógrafos, sin contenedor | **REQUIERE DESARROLLO** |
| **Control Peso** | Rango, Peso Óptimo, Prom/Mín/Máx, % Bajo Peso, % En Rango, % Sobre Peso | `lots.weight`, `weight_unit`, `theoretical_weight_kg`; `quality_evaluations.limit_min/max` | Falta "Peso Óptimo" como dato de referencia por embalaje/especie y las tres tasas | **REQUIERE DESARROLLO** + **PENDIENTE DE EVIDENCIA** (qué es peso óptimo) |
| **Medición Atributos** | Prom/Mín/Máx por atributo, con filtro Cámara | `measurements` + `measurement_defs` | No existe dimensión `Cámara`; valor TEXT | **REQUIERE AJUSTE** |
| **Packing List** | 0 registros en la cuenta observada | — | **Sin datos de referencia** | **PENDIENTE DE EVIDENCIA** |

---

## C. Resumen de estado

| Estado | Cantidad de ítems |
|---|---|
| DISPONIBLE | 0 |
| REQUIERE AJUSTE | 3 (A1, A4-medida, A11) + 2 de sección B |
| REQUIERE DESARROLLO | 7 (A2, A3, A6, A9, A10, A12 + B) |
| PENDIENTE DE EVIDENCIA | 5 (A4-fuente, A5, A7, A8, A10-umbral) + Packing List |

**Ningún indicador se declara listo.** El patrón común: QualityNX tiene el
**dato de origen y la trazabilidad**; lo que falta es (a) una escala de
clasificación cerrada y verificable, (b) los criterios cargados por etapa, y
(c) la capa de agregación multiespecimen con base declarada.

## D. Decisiones de negocio pendientes (bloquean la definición de indicadores)

1. Escala oficial de clasificación a usar en V2 y su relación con la carta
   A/B/C de QCInspec (y si la escala fina `A1..C4` existe realmente).
2. Peso a usar en indicadores de volumen: teórico, declarado o ambos.
3. Base de agregación cuando hay N > 1 muestras (hoy PENDIENTE DE ESPECIFICACIÓN).
4. Umbrales válidos de temperatura, Brix y peso (norma + fuente).
5. Dimensiones logísticas a modelar: contenedor, planta, destino, recibidor, pallet.