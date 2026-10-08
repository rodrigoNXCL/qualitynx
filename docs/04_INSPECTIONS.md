# 04_INSPECTIONS.md

# NX QUALITY — INSPECTIONS

Versión: 1.2
Etapa: 04 — INSPECTIONS
Estado: COMPLETADA


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección es un Evento Técnico / Punto de Evaluación asociado a
un lote.

No es un registro aislado.

Debe permitir registrar la evaluación realizada sobre el lote,
incluyendo:

- inspector;
- punto de evaluación;
- fecha y hora;
- mediciones;
- muestreo;
- observaciones;
- evidencias;
- resultado;
- decisión cuando corresponda.

La inspección debe quedar incorporada a la Historia Técnica del lote.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requiere:

01 — FOUNDATION
02 — MASTER DATA
03 — LOTS

Debe existir:

- usuario autenticado;
- empresa;
- rol autorizado;
- lote válido;
- punto de evaluación;
- biblioteca/configuración de mediciones;
- almacenamiento de evidencias.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir una INSPECCIÓN asociada obligatoriamente a:

- un lote;
- un punto de evaluación;
- un inspector;
- fecha/hora.


Debe poder contener:

- mediciones;
- información de muestra;
- observaciones;
- fotografías/evidencias;
- resultado;
- decisión cuando corresponda.


La inspección debe poder consultarse posteriormente dentro de la
Historia Técnica del lote.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REGLAS DE INSPECCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Una inspección siempre pertenece a un lote.

2. Una inspección siempre identifica el punto de evaluación realizado.

3. Debe quedar identificado quién realizó la inspección.

4. Debe quedar registrada fecha y hora.

5. Las mediciones aplicables dependen del punto de evaluación y de la
   configuración correspondiente.

6. Las mediciones configuradas como obligatorias deben completarse
   antes de cerrar la inspección.

7. Los valores deben respetar las validaciones definidas para cada
   medición.

8. Una inspección puede contener múltiples mediciones.

9. Una inspección puede contener múltiples evidencias.

10. Las inspecciones del MVP deben contar con evidencia fotográfica.

11. La evidencia debe quedar relacionada con la inspección y, cuando
    corresponda, con el hallazgo o medición.

12. Las observaciones pueden registrarse a nivel de inspección y,
    cuando corresponda, de medición.

13. Las mediciones pueden requerir una o más muestras.

14. Debe conservarse la cantidad de fruta/muestras utilizada cuando el
    protocolo de la medición lo requiera.

15. El sistema debe permitir almacenar el resultado calculado a partir
    de las muestras.

16. Las reglas exactas de tamaño de muestra por atributo provienen del
    protocolo/criterio correspondiente; esta etapa no inventa esas
    cantidades.

17. Una inspección no se considera finalizada mientras falten datos
    obligatorios.

18. Una decisión asociada a la inspección debe quedar registrada
    separadamente del resultado técnico.

19. Una inspección histórica no debe desaparecer por modificaciones
    posteriores.

20. Toda modificación relevante debe quedar trazable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. MODELO NECESARIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSPECCIÓN

Debe relacionarse con:

- lote;
- punto de evaluación;
- inspector;
- fecha/hora.


INSPECCIÓN puede contener:

- MUESTRAS;
- MEDICIONES;
- OBSERVACIONES;
- EVIDENCIAS;
- RESULTADO;
- DECISIÓN.


MUESTRA debe poder representar:

- identificación;
- cantidad evaluada;
- información necesaria para el cálculo;
- resultado asociado.


MEDICIÓN debe poder representar:

- medición configurada;
- valor;
- unidad/tipo correspondiente;
- método cuando aplique;
- muestra asociada cuando corresponda;
- observación;
- evidencia cuando corresponda.


No construir en esta etapa el motor completo de criterios ni el motor
de recomendaciones.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. FLUJO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INICIO

Usuario autorizado
↓
Selecciona lote
↓
Selecciona punto de evaluación
↓
Crear inspección
↓
Registrar fecha/hora e inspector
↓
Cargar mediciones configuradas
↓
Registrar muestras
↓
Registrar mediciones
↓
Adjuntar evidencia fotográfica
↓
Agregar observaciones
↓
Validar obligatoriedad y valores
↓
¿Datos completos?
├── NO → Informar pendientes
└── SÍ
      ↓
Calcular/registrar resultado cuando corresponda
      ↓
Registrar decisión cuando corresponda
      ↓
Cerrar inspección
      ↓
(Inspección COMPLETADA) Ver informe / Compartir cuando corresponda


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6.1 CONTINUIDAD, MUESTREO E INFORME (corrección operativa 2026-09-23)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sobre la definición de esta etapa se implementó y verificó el flujo real
siguiente (detalle y E2E en BUILD_STATUS.md; no inventar reglas nuevas):

1. CONTINUIDAD
   - Una inspección no termina necesariamente la historia del lote.
   - Modal CONTINUAR INSPECCIÓN enlaza una nueva inspección a la anterior
     mediante `previous_inspection_id` (migración 20260923000002).
   - Solo puede existir una inspección EN CURSO por lote+punto
     (constraint `idx_inspecciones_open_unique`); el re-enlace se gestiona
     al continuar sobre el huerto vigente.

2. MUESTREO CON MUESTRAS
   - Destino de captura: Consolidado o muestra activa (M01, M02, …).
   - Mediciones y evidencia pueden asociarse a la muestra
     (`inspection_evidence.sample_id`).
   - **Unidad física de N (2026-09-24):** N (sugerido y realizado) se
     expresa en **unidades de muestreo** del plan (`sampling_unit`,
     p.ej. envase), **no en kg**.
     N sugerido = CEIL(kg teóricos / 1.000 × 10) en unidades; es solo
     **recomendación** (no bloquea ni se valida al completar).
   - **Consolidado automático al completar (2026-09-24)** — sin acción
     manual del inspector; sin bloqueo "Consolida…":
     - N real = 1 → consolidado = **copia exacta** de esa muestra;
     - N real > 1 → **NO** se genera valor consolidado (agregación por
       tipo de criterio = **PENDIENTE DE ESPECIFICACIÓN**);
     - **Prohibido** "primer valor no vacío", promedios u otras fórmulas
       inventadas.
   - Validación de cierre **solo contra muestras generadas (N real)**,
     no contra N sugerido.
   - Tamaño/cantidad automática de muestra: PENDIENTE DE IMPLEMENTACIÓN
     (sin regla universal en método/protocolo; no inventar).

3. RECOMENDACIÓN
   - Campo `recommendation` en la inspección (UI + persistencia en saveInfo).

4. INFORME
   - Ruta: `/dashboard/inspections/[id]/report`
   - Contenido: contexto, continuidad (prev), recomendación, muestras,
     tabla consolidado, tabla por muestra, evidencia.
   - Sección 4 consolidado: solo N=1 muestra copia; N>1 sin valor
     consolidado (mensaje y leyenda según regla anterior).
   - Sección 5 muestreo: N sugerido en unidades + peso/envase + peso total.
   - Acciones: `window.print()` (CSS `#inspection-report`), share/clipboard.
   - Botones Ver informe / Compartir en detalle COMPLETADA.

5. MENÚ INFORMES (hub; D-026 / D-028)
   - Grupo **Informes** → `/dashboard/reports`.
   - Dos capacidades visibles: **Informe Histórico de Lote** y
     **Informe de Calidad de Embarque**.
   - Buscador ampliado: folio QualityNX, productor (datalist), fecha
     desde/hasta, punto, estado, clase comercial, semáforo.
   - Enlaza informes de inspección reales, historial de lote
     (`/dashboard/lots/[id]/report`), calidad de embarque
     (`/dashboard/reports/shipment`) y trazabilidad de lotes;
     no duplica operación. Genealogía/envío = fases posteriores.

6. CLASIFICACIÓN + SEMÁFORO (D-027 / D-028)
   - Al cierre: QE → IA best-effort → clasificación → COMPLETADA.
   - Chips en detalle; sección en informe de inspección.
   - Semáforo operacional QualityNX (no SAG); IA no elige color.
   - Lotes: círculo de color fuera del detalle; filtro “Sin clasificación”.
   - Informe de lote: sección final **ANÁLISIS HISTÓRICO — QUALITYNX IA**
     (`POST /api/ai/analyze-lot`; solo datos reales; no modifica historia).

6.2 BUSCAR LOTE → NUEVA INSPECCIÓN (D-028)
   - Flujo principal: BUSCAR LOTE (folio QualityNX + folio interno +
     productor/bloque/guía/especie/variedad/fecha/punto/estado) → ficha
     (folio, producto, productor, variedad, tipo de lote, kg declarados,
     última inspección+fecha, estado, clase, semáforo, [Ver historial],
     [Nueva inspección]) → elegir nuevo punto → crear `inspection_id`
     nuevo en el mismo `lot_id`.
   - Puntos actuales como botones en la ficha (D-029): elegir un punto
     abre la nueva inspección con ese punto preseleccionado, sin volver
     al listado.
   - Búsqueda por guía devuelve todos los lotes de esa guía (guía
     multilote, D-029).
   - No se edita ni reutiliza la inspección anterior; COMPLETADA no cierra
     el lote. Contexto previo visible antes de abrir.

7. VERIFICACIÓN
   - E2E continuidad `scripts/e2e_inspection_continuity.py`: 27/27 PASS.
   - Regresiones serie estricta: 04 30/30, 05 23/23, 06 12/12, 07 18/18.
   - typecheck 0; lint 0 errores; build OK (incl. reports/lote/shipment/
     analyze-lot; 21 rutas).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. ESTADOS DE INSPECCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La inspección debe distinguir al menos:

EN CURSO

COMPLETADA


EN CURSO:

Permite continuar registrando información.


COMPLETADA:

No quedan datos obligatorios pendientes y el evento fue cerrado.


El estado de la inspección NO reemplaza el estado del lote.


El estado del lote continúa siendo responsabilidad de LOTS y de las
decisiones posteriores.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. VALIDACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de completar una inspección validar:

[ ] Lote válido.

[ ] Punto de evaluación válido.

[ ] Inspector autorizado.

[ ] Fecha/hora válida.

[ ] Mediciones obligatorias completas.

[ ] Valores dentro de las validaciones configuradas.

[ ] Muestras registradas cuando sean requeridas.

[ ] Evidencia fotográfica presente.

[ ] Información necesaria para calcular resultados disponible.

[ ] No existen datos inconsistentes.


Si falla una validación:

NO cerrar la inspección.

Mostrar claramente qué información falta o es inválida.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. EVIDENCIA FOTOGRÁFICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Toda inspección del MVP debe contar con evidencia fotográfica.


La fotografía debe quedar vinculada al evento de inspección.


Cuando corresponda, podrá vincularse además a:

- medición;
- defecto;
- observación;
- hallazgo.


Debe permitirse más de una fotografía por inspección.


La fotografía no debe quedar almacenada como archivo huérfano.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. MUESTREO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La inspección debe soportar evaluaciones basadas en muestras.


Debe poder registrarse:

- cantidad de muestras;
- cantidad de fruta evaluada;
- resultado;
- método utilizado cuando corresponda.


Ejemplo conceptual:

INSPECCIÓN
↓
MUESTRA
↓
N FRUTOS EVALUADOS
↓
MEDICIÓN / DEFECTO
↓
RESULTADO


Las cantidades exactas por atributo no deben codificarse como una
regla universal en esta etapa si dependen del protocolo aplicable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. MEDICIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las mediciones se cargan desde la configuración correspondiente al
punto de evaluación.


Una medición puede ser:

- numérica;
- porcentaje;
- entero;
- texto;
- lista;
- sí/no;
- cálculo derivado;

según su definición.


La etapa debe permitir capturar el valor y la información necesaria
para interpretarlo.


No debe crear una lista rígida de mediciones dentro de la interfaz.


La biblioteca de mediciones es configurable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. MODIFICACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección EN CURSO puede ser modificada por el usuario autorizado
que corresponda.


Una inspección COMPLETADA no debe modificarse silenciosamente.


Si una modificación posterior está permitida:

- debe identificarse quién la realizó;
- debe registrarse fecha/hora;
- debe conservarse trazabilidad;
- debe poder distinguirse la información original de la modificación.


Los permisos concretos para editar inspecciones de otros usuarios
corresponden al rol Supervisor/Administrador definido para el MVP.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. DECISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección puede generar una decisión.


La decisión:

NO ES LO MISMO QUE EL RESULTADO DE LA INSPECCIÓN.


El resultado representa lo observado/obtenido.

La decisión representa qué se hará con esa información.


Ejemplos de decisión:

- aprobar;
- rechazar;
- retener;
- reprocesar;
- solicitar nueva evaluación;
- continuar;
- otra opción configurada.


La decisión debe quedar asociada al evento.


El sistema podrá posteriormente sugerir una recomendación, pero la
decisión registrada debe identificar la acción efectivamente tomada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La inspección debe poder realizarse sin conexión.


En modo offline debe ser posible:

- abrir el lote disponible;
- crear la inspección;
- registrar mediciones;
- registrar muestras;
- registrar fotografías;
- registrar observaciones;
- guardar la inspección localmente.


La sincronización pertenece a:

09 — OFFLINE.


Esta etapa solamente debe garantizar que el modelo de inspección no
dependa de una conexión permanente para su captura.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Se puede crear una inspección sobre un lote válido.

[ ] Se identifica el punto de evaluación.

[ ] Se identifica el inspector.

[ ] Se registra fecha/hora.

[ ] Se cargan las mediciones configuradas.

[ ] Se pueden registrar muestras.

[ ] Se pueden registrar mediciones.

[ ] Se validan mediciones obligatorias.

[ ] Se validan valores según configuración.

[ ] Se pueden agregar observaciones.

[ ] Se pueden agregar múltiples fotografías.

[ ] La inspección del MVP no puede completarse sin evidencia
    fotográfica.

[ ] Las evidencias quedan vinculadas al evento.

[ ] Se puede calcular/registrar el resultado cuando corresponda.

[ ] Se puede registrar una decisión.

[ ] Resultado y decisión permanecen diferenciados.

[ ] Una inspección puede quedar EN CURSO.

[ ] Una inspección puede quedar COMPLETADA.

[ ] Una inspección completada conserva su historial.

[ ] La inspección puede capturarse sin conexión.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — CREACIÓN

Crear inspección sobre lote válido.

→ Debe crearse EN CURSO.


PRUEBA 2 — LOTE INVÁLIDO

Intentar crear inspección sin lote válido.

→ Debe rechazarse.


PRUEBA 3 — MEDICIÓN OBLIGATORIA

Intentar completar una inspección dejando una medición obligatoria
vacía.

→ Debe impedirse el cierre.


PRUEBA 4 — VALOR INVÁLIDO

Ingresar valor fuera de la validación configurada.

→ Debe rechazarse o advertirse según la regla definida.


PRUEBA 5 — MUESTRA

Registrar una evaluación basada en muestra.

→ Debe conservar cantidad y resultado correspondiente.


PRUEBA 6 — FOTOGRAFÍA

Intentar completar inspección sin evidencia fotográfica.

→ Debe impedirse el cierre.


PRUEBA 7 — MÚLTIPLES EVIDENCIAS

Adjuntar varias fotografías.

→ Todas deben quedar asociadas a la inspección.


PRUEBA 8 — DECISIÓN

Completar mediciones y registrar decisión.

→ Resultado y decisión deben quedar registrados separadamente.


PRUEBA 9 — MODIFICACIÓN

Modificar una inspección según permisos.

→ Debe quedar trazabilidad de la modificación.


PRUEBA 10 — ACCESO

Intentar acceder a inspección de otra empresa.

→ Debe rechazarse.


PRUEBA 11 — OFFLINE

Crear y completar una inspección sin conexión.

→ La información debe quedar almacenada para posterior sincronización.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

04 — INSPECTIONS está COMPLETADA cuando:

[x] FOUNDATION está COMPLETADA.

[x] MASTER DATA está COMPLETADA.

[x] LOTS está COMPLETADA.

[x] Se puede crear una inspección asociada a un lote.

[x] Se identifica inspector.

[x] Se identifica punto de evaluación.

[x] Se registra fecha/hora.

[x] Funcionan las mediciones configuradas.

[x] Funcionan las muestras.

[x] Funcionan las validaciones.

[x] Funciona la evidencia fotográfica obligatoria.

[x] Funcionan las observaciones.

[x] Se puede registrar el resultado.

[x] Se puede registrar una decisión.

[x] Resultado y decisión permanecen diferenciados.

[x] Funcionan los estados EN CURSO y COMPLETADA.

[x] La trazabilidad de modificaciones funciona.

[x] El aislamiento entre empresas está verificado.

[ ] Captura básica offline verificable. (etapa 09 OFFLINE — fuera del alcance de 04)

[x] Continuidad, muestreo con muestras e informe verificados (E2E 27/27; §6.1).

[x] Unidad física de N (unidades, no kg) y consolidado automático
    N=1/N>1 verificados en UI + validación de cierre (§6.1; 2026-09-24).

[x] Menú INFORMES `/dashboard/reports` implementado (D-026; §6.1).

[x] Clasificación comercial + semáforo al cierre, informe y filtros de lote
    implementados (D-027; §6.1); migración en repo 20260924000003.

[x] Buscar lote → ficha → nueva inspección (nuevo inspection_id en el
    mismo lote) implementado (D-028; §6.2).

[x] Hub Informes con dos capacidades + buscador ampliado; informe histórico
    con análisis IA; informe embarque con contexto completo (D-028).

[x] Cierre único D-029: puntos como botones (apertura directa), búsqueda
    por folio interno/guía ampliada, flujo hub buscar→seleccionar→elegir
    informe, identidad completa en informes y PDF solo del documento.

[x] Todas las pruebas de aceptación de 04 están aprobadas.

[x] No existen errores críticos pendientes propios de 04.

[x] Al cierre de 04 no se habían construido QUALITY ENGINE, DECISIONS,
    TRACEABILITY ni TRANSFORMATIONS (etapas posteriores según BUILD_ORDER).

[x] BUILD_STATUS.md fue actualizado.

[x] 04 — INSPECTIONS queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 04_INSPECTIONS.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━