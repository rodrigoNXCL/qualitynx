# LEVANTAMIENTO VERIFICABLE — DASHBOARDS QCINSPEC (BASE DE QUALITYNX V2)

**Fecha:** 2026-10-04
**Fuente:** observación directa de `https://app.qcinspec.com` con la sesión del
reconocimiento previo (`qcinspec/state.json`). **Solo lectura.**
**Alcance:** los 5 dashboards de "Indicadores" (`/DashboardPBI/Detalle/383..387`),
que en el reconocimiento del 2026-09-26 quedaron como **NO DETERMINADOS**.
**Método:** captura de la capa de accesibilidad de los iframes de Power BI
(`innerText` del frame `app.powerbi.com`) + captura visual de cada página.
**Evidencia:** `qcinspec/pbi383..387_texto.txt`, `qcinspec/pbi387_pagina1.txt`,
`qcinspec/pbi383_full.png`, `pbi384..387_full.png`, `pbi387_p1.png`.

Regla de este documento: lo no observado se declara **PENDIENTE DE VERIFICACIÓN**.
No se completan huecos con supuestos.

---

## 0. Corrección de un hallazgo anterior

El 2026-09-26 los 5 dashboards se registraron como **"NO DETERMINADO EN EL
PORTAL (visto: ícono de carga)"**. Ese resultado era incorrecto por tiempo de
espera insuficiente, no por imposibilidad técnica: los dashboards **sí** se
renderizan y su contenido es legible por la capa de accesibilidad. El
levantamiento 383/386/385/387 queda ahora **verificado**.

---

## 1. Resumen de los 5 dashboards

| id | Nombre literal | Páginas | Estado de los visuales en la sesión observada |
|---|---|---|---|
| 383 | Resumen Inspecciones | 4 (`1of4`) | Con datos |
| 384 | Analisis Parametros Granel | 3 (`1of3`) | **Valores `(Blank)`** |
| 385 | Parametros Condicion Calidad | 1 | **4 visuales vacíos** |
| 386 | Analisis Industria | 2 (`1of2`) | Con datos |
| 387 | Analisis Temperaturas | 2 (`2of2` y `p1`) | Con datos |

Filtros transversales observados: **Temporada** (dropdown, valor `2025-2026`),
**"Seleccione Producto"** (botones `LP` / `PT`), **"Seleccione Especie"** (botón
`ARANDANO`), y un panel **"Seleccionar Filtro"** con segmentadores de datos
(*slicers*) de multiselección con "Select all".

---

## 2. Dashboard 383 — "Resumen Inspecciones" (4 páginas)

1. **Objetivo operacional/gerencial.** Vista de resumen de inspecciones: composición
   del volumen por resolución de calidad y evolución semanal del volumen.
2. **Indicadores.** (a) `Kilos Resolución` — anillo con kg y % por resolución;
   (b) `Resoluciones Semana` — columnas apiladas 100 % por semana;
   (c) `Kilos Semana` — línea de kg por semana; (d) tarjeta KPI `1.44M Kilos`.
3. **Dimensiones y agrupaciones.** `Resolucion` (leyenda: `1, 2, 3, A, B, C`),
   `Semana` (45–53), `Kilos`; filtros `Producto`, `Especie`, `Temporada`,
   `Productor`, `Variedad`.
4. **Filtros disponibles.** Producto (LP/PT), Especie, Temporada, Productor
   (multiselección, ~14 productores visibles), Variedad (multiselección, 15
   variedades: ARANDANOS, BLUE JAY, BLUE RIBBON, BLUERAY, BRIGHTWELL, BRIGITTA,
   DUKE, EMERALD, FARTHING, JEWELL, LEGACY, LIBERTY, STAR, SUSY BLUE).
5. **Períodos y comparaciones.** Eje `Semana` dentro de una `Temporada`.
   **No se observó** comparación contra período anterior, ni acumulado, ni
   variación interanual. **PENDIENTE**: verificar en páginas 2–4.
6. **Datos de origen.** El modelo Power BI no está expuesto. **Verificable por
   consistencia aritmética**: la suma de los kg etiquetados del anillo
   (64.27K + 115.9K + 198.39K + 859.44K + 165.3K = 1.403,3K) más la porción sin
   etiqueta (~34,4K) ≈ 1.437,8K, que coincide con el KPI `1.44M Kilos` y con la
   suma de la línea semanal (1.438K). Por tanto el universo es **el total de
   kilos del filtro activo**. La tabla física de origen es **PENDIENTE**.
7. **Criterios QC relacionados.** La `Resolucion` es la misma carta de
   resolución por defecto que se observa en el detalle de inspección
   (`A/B/C` y `1/2/3`). **No se verificó** qué criterios la componen ni su regla.
8. **Reglas o fórmulas verificables.** `%(resolución) = kg de esa resolución /
   kg total del filtro`. Verificado: 64,27/1.437,8 = 4,47 %; 859,44/1.437,8 =
   59,78 %; 115,9/1.437,8 = 8,06 %; 198,39/1.437,8 = 13,80 %; 165,3/1.437,8 =
   11,50 %. Las 5 etiquetas verificadas cuadran con las 5 impresas.
   La línea `Kilos Semana` y el KPI usan la misma medida.
9. **Nivel de detalle y navegación.** Página 1 sin navegación a QC/inspección
   observable. **PENDIENTE**: páginas 2, 3 y 4 no extraídas.
10. **Qué permite interpretar y decidir.** Cuál es la mezcla de resoluciones
    (volumen Weighted), si la composición semanal se deteriora (columnas 100 %)
    y cuánto volumen absoluto entra por semana.

## 3. Dashboard 384 — "Analisis Parametros Granel" (3 páginas)

1. **Objetivo.** Análisis de parámetros de granel por día, por cliente e industria.
2. **Indicadores.** `Grados Brix Promedio por Dia` (eje `Cliente`) e `Industria`
   (ambos con medida `Grados Brix`).
3. **Dimensiones.** `Cliente`, `Industria`, `Dia`, `Temporada`, `Productor`.
4. **Filtros.** `Seleccionar Filtro`, `Temporada` (2025-2026), `Productor`.
5. **Períodos/comparaciones.** "por Dia" en el título. **PENDIENTE**: eje y
   granularidad exactos no verificados.
6. **Datos de origen.** **PENDIENTE**. El visual no entrega valores.
7. **Criterios QC relacionados.** `Grados Brix` (atributo numérico del catálogo
   granel; en el detalle de muestra aparece con unidad °Bx).
8. **Reglas o fórmulas.** **NO VERIFICABLE**: todos los valores renderizados
   fueron `(Blank)`.
9. **Nivel de detalle.** **PENDIENTE** (páginas 2–3 no extraídas).
10. **Interpretación.** **Observación crítica**: en la sesión observada el
    dashboard **no entrega información**. No se debe replicar un visual que
   publique blanks sin antes verificar su fuente.

## 4. Dashboard 385 — "Parametros Condicion Calidad" (1 página)

1. **Objetivo.** Distribuciones de resolución y de defectos, separando el grupo
   **CALIDAD** del grupo **CONDICION**.
2. **Indicadores (4 visuales, todos vacíos en la sesión observada).**
   `Distribucion Resolucion Condicion`, `Distribucion Resolucion Calidad`,
   `Distribucion Defectos Condicion`, `Distribucion Defectos Calidad`.
3. **Dimensiones.** `Resolucion`, `Defecto`, y el grupo `CALIDAD` / `CONDICION`.
4. **Filtros.** `Temporada` (2025-2026), `Productor` (All), `Nº Guia` (All).
5. **Períodos/comparaciones.** Solo `Temporada`. Sinaxis temporal visible.
6. **Datos de origen.** **PENDIENTE** (sin valores renderizados).
7. **Criterios QC relacionados.** Los defectos del catálogo observado
   (Russet, Fruta Roja, Pedicelo, Pudricion, Deshidratacion, Machucón,
   Desgarro Pedicelar, Falta de Cera (Bloom), Fruta Blanda, etc.), agrupados en
   CALIDAD y CONDICION.
8. **Reglas o fórmulas.** **NO VERIFICABLE** (visuales vacíos).
9. **Nivel de detalle.** Cuadro de 4 visuales + una banda inferior de texto
   vacía. Sin navegación observable.
10. **Interpretación.** Aunque no publique datos, **estructura funcional
    replicable**: la gerencia necesita ver qué defectos y qué resoluciones
    explican el resultado, separados por naturaleza (calidad vs condición).

## 5. Dashboard 386 — "Analisis Industria" (2 páginas)

1. **Objetivo.** Composición de resoluciones con foco en industria, con dos
   escalas de resolución distintas.
2. **Indicadores.** (a) `Kilos Resolución` — anillo, escala **gruesa**
   `1,2,3,A,B,C`, con kg y %; (b) `Resoluciones Semana` — 100 % apiladas,
   semanas 45–53; (c) `Kilos Resolución Industria` — anillo, escala **fina**
   `1,2,3,4,A,A1,A2,A3,A4,B,B1,B2,B3,B4,C,C1..C4`, **solo %** (sin kg);
   (d) `Resoluciones Semana Industria` — 100 % apiladas, semanas 23–48, escala fina.
3. **Dimensiones.** `Resolucion` (dos taxonomías), `Semana`, `Variedad`.
4. **Filtros.** `Temporada`, `Variedad` (multiselección, 17 valores incluyendo
   `VARIEDAD A` y `Ventura`), **`Semana`** (segmentador inferior con botones
   `1,2,3,4,45..53`), más Producto y Especie.
5. **Períodos/comparaciones.** Eje `Semana`; el segmentador `Semana` permite
   acotar el rango. Sin comparador entre períodos.
6. **Datos de origen.** **PENDIENTE**.
7. **Criterios QC relacionados.** Misma carta de resolución, en dos niveles de
   detalle (grueso y fina).
8. **Reglas o fórmulas verificables.** `Kilos Resolución`: mismo criterio que 383
   (`kg resolución / kg total del filtro`). Verificado con los valores impresos:
   total implícito 74,08/0,046 ≈ 1.610,4K; 862,24/1.610,4 = 53,54 % (impreso
   53,56 %); 350,04/1.610,4 = 21,74 % (21,75 %); 172,4/1.610,4 = 10,70 %
   (10,71 %); 116,53/1.610,4 = 7,24 % (7,24 %). El denominador de
   `Kilos Resolución Industria` **no es verificable** (solo %, sin total).
9. **Nivel de detalle.** Sin navegación a QC en la página 1.
10. **Interpretación gerencial.** **Hallazgo clave**: la misma resolución se
    presenta con dos escalas distintas (gruesa `1..C` y fina `1..C4`). Antes de
    replicar en V2 hay que definir cuál es la escala oficial y si la fina es una
    sub-clasificación. **PENDIENTE DE VERIFICACIÓN con el usuario**.

## 6. Dashboard 387 — "Analisis Temperaturas" (2 páginas)

1. **Objetivo.** Control térmico de embarque: temperatura promedio por semana,
   por pallet, y calidad por pallet resuelto a resolución.
2. **Indicadores.**
   - Página 1: `Promedio Temperatura por Semana` (línea con `Semana`,
     `Promedio Temperatura` y `Promedio Total`).
   - Página 2: `Cantidad Palletspor Resolucion` (anillo, **escala `A`/`B`**:
     90,29 % / 0,45K (9,71 %) / 4,14K); `Temperatura por Pallet` (barras por
     `Folio` `W00xxxx`, eje −1..1, valores observados entre −0,3 y 0,9);
     y una **matriz de detalle con `Select Row`** por fila.
3. **Dimensiones.** `Contenedor`, `Planta`, `Semana`, `Folio` de pallet, `Resolucion`.
   Columnas de la matriz: `QC`, `Folio`, `Tipo`, `Planta`, `Especie`, `Cajas`,
   `Temperatura`, `Resolucion`, `Destino`, `Recibidor`.
4. **Filtros.** `Temporada` (2025-2026), `Seleccionar Filtro`, slicer
   `Contenedor` (multiselección: `CAMION TERMO`, `MAU1398130`, `MCAU…` ×26) en
   página 2; slicer `Planta` en página 1.
5. **Períodos/comparaciones.** `Semana` en página 1. Sin comparador entre períodos.
6. **Datos de origen.** Fila de ejemplo observada: `QC 35916`, `Folio 626622794`,
   `Tipo Aéreo`, `Planta SUBSOLE`, `Especie ARANDANOS`, `Cajas 176`,
   `Temperatura 0.60`, `Resolucion B`, `Destino MADRID`, `Recibidor BYBLUE BV`.
   Totales de la matriz: `Cajas 627.909.717`, `Temperatura 0.10`.
   La tabla física de origen es **PENDIENTE**.
7. **Criterios QC relacionados.** Temperatura de pulpa / transporte. El rango que
   define `Resolución A` o `B` **NO DETERMINADO EN EL PORTAL** (no se observó
   leyenda ni umbrales).
8. **Reglas o fórmulas.** `Promedio Temperatura` por pallet/por semana: media
   aritmética observable (no verificable contra el detalle en esta sesión).
   `Cantidad Palletspor Resolucion`: reparto de **cantidad de pallets** por
   resolución (no kilos). El umbral A/B **NO DETERMINADO**.
9. **Nivel de detalle.** Es el único dashboard con **navegación a fila**
   (`Select Row`) → llega a pallet. La matriz es el origen de la trazabilidad.
10. **Interpretación gerencial.** Permite saber si la cadena de frío se mantuvo
    y cuántos pallets quedaron en cada resolución, con identidad de contenedor,
    planta, destino y recibidor.

---

## 7. Contraste entre dashboards (hallazgos verificados)

| Hallazgo | Evidencia |
|---|---|
| **Dos taxonomías de resolución** | 383/386-"Kilos Resolución": `1,2,3,A,B,C`. 386-"Industria": `1,2,3,4,A,A1..A4,B,B1..B4,C,C1..C4`. 387: solo `A,B`. |
| **La unidad del indicador cambia según el dashboard** | 383 y 386 usan **kilos**; 387 usa **cantidad de pallets**; 385 usa **%**. |
| **Dos dashboards no publican datos** | 384 `(Blank)`, 385 cuatro visuales vacíos, con `Temporada 2025-2026`. |
| **El volumen total difiere** | 383 ≈ 1,44M kg; 386 ≈ 1,61M kg, con filtros视觉mente equivalentes. Universos distintos **no identificados**. |
| **Solo temperatura tiene drill-down** | 387 con `Select Row`; los demás sin navegación observable. |
| **Sin comparador de períodos** | Ninguno de los 5 muestra comparación contra período anterior. |
| **El filtro Semana existe** | 386 (segmentador `Semana`), 383/387 (eje `Semana`). |

---

## 8. Pendientes de verificación (no reemplazables por supuestos)

- **P1.** Páginas 2–4 del dashboard 383.
- **P2.** Páginas 2–3 del dashboard 384.
- **P3.** Por qué 384 y 385 no publican datos: ¿permiso, filtro o dataset vacío.
- **P4.** Definición oficial de cada valor de `Resolucion` (A/B/C/1/2/3 y la
  escala fina) y su relación con los defectos.
- **P5.** Umbral que define `Resolución A` vs `B` en temperatura.
- **P6.** Identidad de las tablas fuente de los 5 reportes Power BI.
- **P7.** Denominador de `Kilos Resolución Industria` (solo %).
- **P8.** Qué representa el producto `LP` / `PT` y `Nº Guia` como filtro.
- **P9.** Si existe (no se observó) comparación entre períodos o entre plantas.

**Todos los puntos anteriores requieren información que solo el usuario puede
confirmar. Ninguno fue sustituido por un supuesto.**