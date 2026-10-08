# GUIÓN DEL PRESENTADOR — NX Quality

**Duración objetivo:** 12–18 minutos  
**Formato:** 15 slides · presentación HTML (`presentation/index.html`)  
**Estado base:** BUILD_STATUS.md (01–07 COMPLETADAS)

---

## Cómo usar este guion

| Elemento | Guía |
|----------|------|
| Objetivo | Para qué sirve la slide |
| Qué mostrar | Qué mira la audiencia |
| Qué decir | Resumen oral (no leer literal) |
| Duración | Minutos sugeridos |
| Transición | Puente a la siguiente |
| Preguntas | Respuestas posibles |

---

## SLIDE 01 — PORTADA

- **Objetivo:** Presentar NX Quality y el hilo conductor.
- **Qué mostrar:** Logo real NX Quality, subtítulo “Del lote a la trazabilidad”.
- **Qué decir:** “Somos NXChile. NX Quality es nuestra plataforma de control de calidad y trazabilidad operacional para fruta. El hilo de hoy es simple: del lote a la trazabilidad.”
- **Duración:** 0:45
- **Transición:** “Para entender el valor, primero el problema real de la operación.”
- **Preguntas:**
  - *¿Qué es NXChile?* → Empresa de software agrícola; contacto en landing.
  - *¿Es un MVP?* → Es una base operacional real y verificable de 7 etapas de construcción.

---

## SLIDE 02 — EL PROBLEMA

- **Objetivo:** Enmarcar el problema de relación y reconstrucción, no solo de registro.
- **Qué mostrar:** Cadena LOTE → INSPECCIONES → MEDICIONES → DECISIONES → HISTORIAL.
- **Qué decir:** “El problema no es solo poner datos en una planilla o app. Es poder relacionar lote, inspección, medición y decisión, y reconstruir lo ocurrido.”
- **Duración:** 1:00
- **Transición:** “NX Quality conecta esas piezas en un sistema integrado.”
- **Preguntas:**
  - *¿Esto no lo hace un Excel?* → Excel no fuerza relaciones, RLS, auditoría ni append-only.

---

## SLIDE 03 — LA PROPUESTA

- **Objetivo:** Mostrar la plataforma integrada.
- **Qué mostrar:** 6 bloques + captura real del dashboard.
- **Qué decir:** “Tenemos master data, lotes, inspecciones, quality engine, decisiones y trazabilidad, operando juntos sobre la misma base.”
- **Duración:** 1:00
- **Transición:** “Antes de la demo, conviene ver que el modelo no simplifica de más.”
- **Preguntas:**
  - *¿Es un formulario con IA?* → La IA es asistente; el núcleo es operación + evaluación + decisión + historia.

---

## SLIDE 04 — MODELO OPERACIONAL

- **Objetivo:** Declarar que lote, etapa, punto, criterio y decisión son distintos.
- **Qué mostrar:** Diagrama Company → Species → Stage → Point → Criteria + flujo de verdad.
- **Qué decir:** “Etapa es dónde está el lote. Estado es consecuencia del proceso. El punto define el contexto de inspección. No mezclamos conceptos.”
- **Duración:** 1:15
- **Transición:** “Con ese modelo, empecemos por la unidad central: el lote.”
- **Preguntas:**
  - *¿Quién cambia el estado del lote?* → El proceso y decisiones registradas, no un dropdown libre (D-018).
  - *¿La etapa se elige a mano?* → No; se deriva del punto al inspeccionar (D-018b).

---

## SLIDE 05 — EL LOTE

- **Objetivo:** Mostrar la pantalla real de lotes.
- **Qué mostrar:** Captura real + harvest_block, estado, acciones.
- **Qué decir:** “Identificamos el lote por bloque de cosecha. Desde aquí se inspecciona, se ve la historia y se registra decisión.”
- **Duración:** 1:15
- **Transición:** “La siguiente pieza es la inspección en terreno.”
- **Preguntas:**
  - *¿Puedo editar el estado libremente?* → No hay selector arbitrario; CERRADO es terminal.

---

## SLIDE 06 — INSPECCIÓN

- **Objetivo:** Mostrar el flujo operativo real.
- **Qué mostrar:** Captura del detalle + flujo LOTE→…→EVIDENCIA.
- **Qué decir:** “El usuario opera con contexto: lote, punto, etapa derivada, criterios, mediciones y evidencia. El cierre exige mediciones obligatorias y al menos una foto.”
- **Duración:** 1:30
- **Transición:** “Con mediciones y criterios, evaluamos de forma objetiva.”
- **Preguntas:**
  - *¿Quién define los criterios?* → Configuración por punto en `/dashboard/inspection-points`.
  - *¿Qué pasa si falta una medición obligatoria?* → El trigger de cierre rechaza COMPLETADA.

---

## SLIDE 07 — QUALITY ENGINE

- **Objetivo:** Explicar evaluación determinística sin exagerar.
- **Qué mostrar:** Diagrama medición+criterio→resultado y los 6 resultados.
- **Qué decir:** “El motor compara medición contra criterio configurado y guarda el resultado con snapshot. No decide en nombre del inspector.”
- **Duración:** 1:15
- **Transición:** “Porque evaluar no es lo mismo que decidir.”
- **Preguntas:**
  - *¿Usa IA para aprobar?* → No. La evaluación es determinística; la IA solo asiste como recomendación (D-021).
  - *¿Un Brix bajo rechaza solo?* → Genera DESVIACIÓN; la decisión sigue siendo humana.

---

## SLIDE 08 — DECISIONES

- **Objetivo:** Separar evaluación y decisión.
- **Qué mostrar:** Card EVALUACIÓN ≠ DECISIÓN + captura real del modal.
- **Qué decir:** “La decisión queda con tipo, fundamento, responsable y contexto. Si se anula, el original permanece. No inventamos efectos automáticos: `decision_effects` está vacía a propósito.”
- **Duración:** 1:15
- **Transición:** “Toda esa operación deja historia.”
- **Preguntas:**
  - *¿Una desviación cierra el lote?* → No automáticamente (verificado E2E).
  - *¿Puedo borrar una decisión?* → No; se anula con trazabilidad (D-024).

---

## SLIDE 09 — TRAZABILIDAD  ★ clave

- **Objetivo:** Vender el concepto central del producto.
- **Qué mostrar:** Cadena completa + captura real “Historia del lote”.
- **Qué decir:** “No solo vemos el estado actual: reconstruimos quién hizo qué, cuándo, con qué cambio y en qué orden. Ese es el diferencial.”
- **Duración:** 1:45
- **Transición:** “Y esa historia no se puede reescribir a la ligera.”
- **Preguntas:**
  - *¿De dónde sale la historia?* → audit_logs + tablas de dominio, API `/api/traceability`.
  - *¿Se puede borrar el historial?* → RLS + triggers append-only lo impiden.

---

## SLIDE 10 — CONTROL Y AUDITORÍA

- **Objetivo:** Reforzar confianza sin lenguaje de certificación.
- **Qué mostrar:** 6 tarjetas de control.
- **Qué decir:** “Aislamiento por empresa, actor, fecha, contexto, historial inmutable y operaciones fallidas que no se registran como éxito.”
- **Duración:** 1:00
- **Transición:** “Todo esto está respaldado por pruebas, no solo por diseño.”
- **Preguntas:**
  - *¿Tienen certificación ISO?* → No lo afirmamos; hablamos de controles técnicos implementados.

---

## SLIDE 11 — VALIDACIÓN REAL

- **Objetivo:** Dar evidencia numérica del estado.
- **Qué mostrar:** 30/30, 23/23, 12/12, 18/18, typecheck 0, lint 0, visual 36/36.
- **Qué decir:** “Estas son las cifras de BUILD_STATUS: suites E2E de las etapas 04 a 07, calidad de código y validación visual multi-viewport.”
- **Duración:** 1:00
- **Transición:** “Detrás de la UI hay una arquitectura simple por capas.”
- **Preguntas:**
  - *¿Los tests son unitarios o E2E?* → E2E de flujo real contra el entorno.
  - *¿Hay deuda técnica?* → Warnings de lint preexistentes; 0 errores.

---

## SLIDE 12 — ARQUITECTURA

- **Objetivo:** Explicar stack sin sobrecargar.
- **Qué mostrar:** Web → APIs → Domain → Supabase.
- **Qué decir:** “Next.js en Cloudflare Workers, APIs de Next, lógica de quality/decisions/traceability, Supabase con RLS y storage de evidencia.”
- **Duración:** 1:00
- **Transición:** “Con eso, veamos el mapa de etapas.”
- **Preguntas:**
  - *¿Dónde corre?* → demo local `http://localhost:3000` (Cloudflare para productivo, fuera de esta entrega).
  - *¿Cómo es la IA?* → OpenRouter FREE, server-side, no decide.

---

## SLIDE 13 — ESTADO ACTUAL

- **Objetivo:** Ser transparente: 01–07 listas, 08–11 no.
- **Qué mostrar:** Dos columnas COMPLETADO / SIGUIENTE.
- **Qué decir:** “Siete etapas completadas y verificadas. Cuatro en roadmap. No presentamos 08–11 como hechas.”
- **Duración:** 1:00
- **Transición:** “La evolución sigue un orden oficial.”
- **Preguntas:**
  - *¿El producto está terminado?* → Tiene base operacional real; hay hoja de evolución definida.
  - *¿Qué falta de decisiones?* → La matriz punto+decisión→etapa/estado sigue pendiente de decisión.

---

## SLIDE 14 — ROADMAP

- **Objetivo:** Mostrar 07→11 con implementado vs roadmap.
- **Qué mostrar:** 5 pasos con etiquetas.
- **Qué decir:** “07 cerrada. Siguen transformations, offline, operational view y analytics, en el orden de BUILD_ORDER.”
- **Duración:** 0:45
- **Transición:** “Cerramos con la promesa del producto.”
- **Preguntas:**
  - *¿Cuándo offline?* → Pendiente de planificación de etapa 09; no fechado aquí.

---

## SLIDE 15 — CIERRE

- **Objetivo:** Dejar el mensaje y abrir demo.
- **Qué mostrar:** Logo, flujo final, botones VER DEMO / ABRIR DEMO.
- **Qué decir:** “NX Quality: del lote a la trazabilidad. Los invito a verlo en vivo en la demo local.”
- **Duración:** 0:45
- **Transición:** Entrar a **modo Demo local** (tecla `D` o botón **Demo local**).
- **Preguntas:**
  - *¿Cómo empezamos la demo?* → Secuencia Dashboard → Lote → Inspección → QE → Decisión → Historia.

---

## SECUENCIA DEMO RECOMENDADA (~6–8 min)

| # | Pantalla | Ruta (localhost:3000) | Punto clave |
|---|----------|----------------------------|-------------|
| 1 | Dashboard | `/dashboard` | Vista de operación |
| 2 | Lote | `/dashboard/lots` | Lote **E2E Redesign 241** |
| 3 | Inspección | `/dashboard/inspections` | Criterios, mediciones, evidencia |
| 4 | Quality Engine | detalle de inspección | Evaluaciones CUMPLE/DESVIACIÓN |
| 5 | Decisión | modal en Lotes | Historial y anulación |
| 6 | Historia | modal Historia del lote | Timeline de trazabilidad |

**Lote de demo:** `d8ba1f69-4724-4307-a726-de7c279f80ce` — **E2E Redesign 241**  
**Credenciales (si aplica en el entorno del presentador):** las del usuario operador del demo.

---

## TIEMPO TOTAL ORIENTATIVO

| Bloque | Min |
|--------|-----|
| Slides 01–04 | 4:00 |
| Slides 05–08 | 5:15 |
| Slides 09–11 | 3:45 |
| Slides 12–14 | 2:45 |
| Slide 15 + puente demo | 0:45 |
| **Total slides** | **~16:30** |
| Demo guiada (opcional) | +6–8 min |

---

## REGLAS DE HONESTIDAD (no romper)

1. No afirmar certificaciones ISO ni cumplimiento normativo no documentado.
2. No presentar 08–11 como implementadas.
3. No decir que las decisiones cambian solas etapa/estado (`decision_effects` vacía).
4. No inventar pantallas o features inexistentes.
5. Cifras de tests **solo** desde BUILD_STATUS / resultados E2E reales.
