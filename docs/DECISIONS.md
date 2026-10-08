# NX QUALITY — DECISIONES DEL PROYECTO

## ESTRUCTURA DE REGISTRO

Cada decisión debe contener:
- Identificador único (D-001, D-002, etc.)
- Fecha
- Decisión tomada
- Motivo/razón
- Impacto técnico/funcional

---

## D-001: Plataforma de Despliegue Web
- **Fecha:** 2026-08-13
- **Decisión:** La aplicación Web (`apps/web`) se desplegará en **Cloudflare Workers**.
- **Motivo:** Evitar límites de ancho de banda de Vercel (100 GB) y costos imprevistos. Cloudflare ofrece ancho de banda ilimitado en su plan gratuito.
- **Impacto Técnico:** `apps/web` compatible con runtime Cloudflare via `@opennextjs/cloudflare`. No usar APIs específicas de Vercel.

---

## D-002: Stack Cloudflare Workers
- **Fecha:** 2026-09-17
- **Decisión:** Toda la capa de presentación (`apps/web`) desplegada en **Cloudflare Workers** via OpenNext + Wrangler.
- **Motivo:** Infraestructura definida en D-001. Deploy manual (`opennextjs-cloudflare build && deploy`).
- **Impacto Técnico:** No usar `next/headers` ni APIs de servidor de Vercel. SSR/SSG compatibles con Edge.

---

## D-003: Diseño Landing — Premium B2B Agrícola
- **Fecha:** 2026-09-17
- **Decisión:** Landing con estética **Premium B2B** (elegancia, espacios generosos, tipografía limpia, paleta: #FAFAF7, #1a1a1a, #4A5D23). Enfocado al sector frutícola.
- **Motivo:** El producto debe transmitir precisión, confiabilidad y profesionalismo a productores, packings y exportadoras.
- **Impacto Técnico:** Tailwind CSS. No usar librerías pesadas de animación.

---

## D-004: Fecha Límite Versión 1
- **Fecha:** 2026-09-17
- **Decisión:** Versión 1 operativa debe estar funcionando el **25/09/2026**.
- **Motivo:** Restricción del proyecto.
- **Impacto:** Priorizar Foundation + landing + auth. No agregar etapas posteriores hasta que Foundation cierre.

---

## D-005: Despliegue Cloudflare Worker
- **Fecha:** 2026-09-21
- **Decisión:** Worker `qualitynx` en Cloudflare. Dominio `quality.nxchile.com`. Deploy manual.
- **Motivo:** Producción operativa.
- **Impacto:** Variables de entorno configuradas en `wrangler.jsonc` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).

---

## D-006: Tabla leads para captación B2B
- **Fecha:** 2026-09-21
- **Decisión:** Crear tabla `leads` en Supabase para captar solicitudes de demostración desde la landing.
- **Motivo:** El formulario de la landing debe persistir leads en base de datos, no solo enviar email.
- **Impacto Técnico:** Tabla `leads` con RLS (INSERT público, SELECT solo SUPER_ADMIN). API route `POST /api/leads` con validación Zod. Componente `LeadForm` controlado.

---

## D-007: Posicionamiento Landing — "Memoria Operacional de Calidad"
- **Fecha:** 2026-09-21
- **Decisión:** El posicionamiento principal de QualityNX es "Toda la historia de calidad de cada lote. En un solo lugar." NO "Software de calidad" ni "Sistema con IA".
- **Motivo:** Diferenciación clara en el mercado B2B frutícola. La IA es un feature, no el posicionamiento.
- **Impacto:** Hero, copy, CTA y toda la comunicación alineados con este posicionamiento.

---

## D-008: Deploy manual (no automático)
- **Fecha:** 2026-09-21
- **Decisión:** Deploy manual via `opennextjs-cloudflare build && deploy`. No GitHub Actions ni auto-deploy.
- **Motivo:** Control total del momento de publicación.
- **Impacto:** Cada cambio requiere push + deploy manual.

---

## D-009: Landing — Ajustes quirúrgicos finales
- **Fecha:** 2026-09-21
- **Decisión:** Ajustes puntuales sin rehacer landing: OFFLINE como sección estratégica, "Próximas implementaciones" en vez de "En desarrollo", 6to diferenciador offline, FAQ actualizada.
- **Motivo:** Llevar landing a nivel comercial 9/10. Offline es parte estratégica del producto pero no está operativo — se comunica como "próximamente" sin ocultarlo.
- **Impacto:** Sección nueva "Operación en terreno", diferenciador #6, copy post-form, FAQ con respuestas más precisas.

---

## D-010: Offline — Estrategia de comunicación
- **Fecha:** 2026-09-21
- **Decisión:** Offline se comunica como capacidad estratégica en desarrollo, no como funcionalidad operativa.
- **Motivo:** La funcionalidad offline es parte del roadmap pero no está lista. No afirmar que funciona sino que está en desarrollo.
- **Impacto:** Sección dedicada en landing, 6to diferenciador, respuesta en FAQ. Cuando esté operativo, actualizar copy a "funciona offline".

---

## D-011: Ficha de Productor chilena + Productor de Salida
- **Fecha:** 2026-09-22
- **Decisión:** La entidad PRODUCTOR de MASTER DATA se extiende con ficha completa para productores chilenos: nombre o razón social, RUT, dirección, comuna o provincia, ciudad, punto GPS, teléfono, correo, persona de contacto. Además, campo interno **Productor de Salida** (referencia a otro productor) para que los informes de embarque muestren solo información válida de productores; internamente no se pierde ni se confunde la identidad cuando el nombre externo difiere del interno.
- **Motivo:** Producto operado en Chile; la estructura mínima (solo nombre) no alcanza para identificación tributaria, contacto ni informes de embarque.
- **Impacto:** Migración `20260922000003_producers_extended_fields.sql`; UI de productores con ficha extendida; unicidad de RUT dentro de la empresa; `salida_producer_id` auto-referencia con CHECK (no auto-referencia). Resto de entidades sin cambio. Corrección de etiqueta "Cuartelos" → "Cuarteles".

---

## D-012: Estados del lote — transición libre + CERRADO terminal
- **Fecha:** 2026-09-22
- **Decisión:** CURRENT.md §28 lista 10 estados del lote pero no define matriz de transiciones. Para 03 — LOTS se aplica: **transición libre entre estados no terminales** (cualquier estado distinto de CERRADO puede cambiar a cualquier otro estado no terminal), y **CERRADO es terminal**: solo se alcanza mediante la acción de cierre y no permite volver a ningún estado. Toda transición queda trazada por `audit_trigger_function`.
- **Motivo:** La matriz exacta no está definida en CURRENT; se necesita una regla operativa mínima para cumplir el DoD de 03 sin inventar reglas de negocio complejas. El usuario aprobó esta regla explícitamente (2026-09-22). Se puede ajustar cuando CURRENT defina la matriz.
- **Impacto:** Migración `20260922000004_lots.sql` (CHECK + trigger de terminalidad); UI de lotes con selector de estado y botón Cerrar; validación de cierre en aplicación.
- **Corrección UI (D-018, 2026-09-22):** el selector libre de estado se elimina de la interfaz; el estado debe derivarse del proceso/decisiones. CERRADO terminal se mantiene.

---

## D-013: Requisito IA — análisis de muestreo / revisión de calidad (PENDIENTE DE DISEÑO)
- **Fecha:** 2026-09-22
- **Decisión:** El producto debe incorporar IA que, en base a los datos capturados en un muestreo o revisión de calidad y a la especie/variedad del lote, **valide la revisión del control humano u ofrezca un ajuste sugerido**. Queda registrado como requisito; NO se implementa en 03 — LOTS ni en 04 — INSPECTIONS.
- **Motivo:** Requisito explicitado por el usuario (2026-09-22). La implementación requiere definir: modelo/proveedor de IA, datos de entrada, forma de presentación de la sugerencia, quién puede aceptarla y cómo queda trazada. PENDIENTE DE DECISIÓN de diseño (candidatas: 05 — QUALITY ENGINE / 11 — ANALYTICS).
- **Impacto:** Ninguno en esta etapa. Debe considerarse al planificar QUALITY ENGINE y ANALYTICS. No modificar CURRENT.md sin definición completa del diseño.

---

## D-014: Flujo operativo — crear lote abre camino a inspección
- **Fecha:** 2026-09-22
- **Decisión:** El flujo operativo del producto es: **crear lote → abrir inspección sobre ese lote → capturar características según especie/variedad → completar inspección**. La UI de Lotes ofrecerá la acción "Inspeccionar" / continuar a inspección desde el lote. La creación de la inspección sigue siendo manual sobre un lote existente (no automática al crear el lote), conforme a 03_LOTS regla 5 y 04_INSPECTIONS.
- **Motivo:** El usuario explicitó que la línea central del producto es: el controlador crea el lote y revisa las características definidas según especie/variedad, genera una evaluación de calidad y el lote pasa de estado. Alinea la UI con ese flujo sin contravenir CURRENT.
- **Impacto:** Botón "Inspeccionar" en /dashboard/lots; página /dashboard/inspections; el cambio de estado del lote por evaluación/decisión llega con 05/06 (aquí solo se registra la inspección). Evaluación por criterios de especie/variedad → 05; IA sugerida → D-013.

---

## D-015: Criterios por EMPRESA -> ESPECIE -> PUNTO -> CRITERIOS (estructural, demo arandano)
- **Fecha:** 2026-09-22
- **Decision:**
  1. Los criterios NO se definen unicamente a nivel de empresa.
  2. La estructura debe permitir: EMPRESA -> ESPECIE -> PUNTO DE EVALUACION -> CRITERIOS.
  3. Para la demo del 23/09: unica especie Arandano, puntos de evaluacion ya definidos, catalogo inicial de criterios especifico para arandano.
  4. NO desarrollar catalogo completo para todas las especies.
  5. NO implementar reglas avanzadas de tolerancia/mercado/cliente si no son necesarias para la demo.
  6. El cambio estructural debe realizarse AHORA, porque dejar los criterios asociados solo a empresa generaria una base incorrecta para futuras especies.
  7. La arquitectura debe quedar preparada para evolucionar hacia: ESPECIE -> PUNTO -> PROTOCOLO -> CRITERIOS.
- **Motivo:** El usuario explicito que la evaluacion debe cargar criterios segun la especie del lote y el punto de evaluacion. La migracion 04 (000005) creo inspection_points sin species_id; se requiere alterar la tabla y propagar la restriccion.
- **Impacto:** Migracion 20260922000006_points_species.sql (ALTER inspection_points + species_id NOT NULL + indice unico (company, species, name) + triggers validacion + seed catalogo arandano); tipos InspectionPoint.species_id; helper listInspectionPoints(speciesId?); UI: selector de especie al crear punto + filtrado de puntos por lot.species_id al abrir inspeccion; documentacion actualizada.

---

## D-016: Flujo operacional de lote (etapas ≠ inspecciones)
- **Fecha:** 2026-09-22
- **Decision:**
  1. QualityNX modela un FLUJO OPERACIONAL DE LOTE, no una secuencia obligatoria de inspecciones.
  2. Etapas base soportadas: (1) Inspección Huerto, (2) Control de Cosecha, (3) Recepción Frigorífico/Packing, (4) Proceso/Packing, (5) Pre-frío/Frío/Almacenamiento, (6) Inspección Pre-Despacho, (7) Despacho/Embarque.
  3. Las etapas NO son pasos obligatorios. Un lote puede: comenzar en cualquier etapa habilitada; no tener inspección en una etapa; pasar por etapa sin generar inspección; continuar hacia otras etapas.
  4. ETAPA OPERACIONAL ≠ INSPECCIÓN. Una etapa puede contener: inspección, control, registro operacional o solo tránsito del lote.
  5. Cuando exista inspección: ETAPA → PROTOCOLO APLICABLE → CRITERIOS → MUESTRA → RESULTADOS → EVIDENCIA → DECISIÓN → TRAZABILIDAD.
  6. Cada etapa debe poder tener sus propios criterios y configuración. Los criterios de "Inspección Huerto" NO se reutilizan automáticamente en otras etapas.
  7. Trazabilidad: LOTE → ETAPA → EVENTO/CONTROL/INSPECCIÓN → RESULTADO → EVIDENCIA → SIGUIENTE ETAPA.
  8. Objetivo: representar el proceso real de exportación chilena; el lote puede ingresar al sistema en diferentes puntos y continuar su recorrido sin asumir etapas anteriores dentro de QualityNX.
- **Motivo:** Decisión arquitectónica explícita del usuario (2026-09-22). Evita acoplar el producto a un pipeline rígido de inspecciones y refleja la operación real de lotes de exportación.
- **Impacto:** Modelo de datos (etapas operacionales, trazabilidad de recorrido, relación etapa→protocolo→criterios); distinción entre punto de evaluación y etapa; semillas por etapa; UI de trazabilidad de lote. Interactúa con D-015 (cadena criterios) — definir si la cadena completa es EMPRESA → ESPECIE → ETAPA → PROTOCOLO → CRITERIOS o si el punto de evaluación sigue siendo el nodo intermedio.

---

## D-016 (CORRECCIÓN CONCEPTUAL): Terminología y modelo etapa/punto
- **Fecha:** 2026-09-22
- **Corrige:** D-016 original (mismo día).
- **Decisión:**
  1. Cambiar terminología: "Punto de Evaluación" → **"Punto de Inspección"**.
  2. **ETAPA OPERACIONAL** = dónde se encuentra el lote dentro de su proceso.
  3. **PUNTO DE INSPECCIÓN** = instancia concreta donde QualityNX realiza un control/inspección sobre el lote. Un punto de inspección **pertenece a** una etapa operacional.
  4. **Modelo de criterios:** EMPRESA → ESPECIE → ETAPA OPERACIONAL → PUNTO DE INSPECCIÓN → CRITERIOS.
  5. **7 etapas base** (cada una con su propósito y punto(s) de inspección asociados):
     1. Inspección Huerto → punto "Inspección Huerto"
     2. Control de Cosecha → punto "Control de Cosecha"
     3. Recepción Frigorífico / Packing → punto "Recepción Frigorífico / Packing"
     4. Proceso / Packing → punto "Proceso / Packing"
     5. Pre-frío / Frío / Almacenamiento → punto "Pre-frío / Frío / Almacenamiento" (puede no tener inspección formal)
     6. Inspección Pre-Despacho → punto "Inspección Pre-Despacho" (genera resultado/decisión)
     7. Despacho / Embarque → punto "Despacho / Embarque" (principalmente evento operacional)
  6. Cada etapa puede contener: eventos operacionales, controles, uno o más puntos de inspección, o ninguna inspección.
  7. **Regla de flujo:** el lote NO está obligado a comenzar en Inspección Huerto; puede ingresar en cualquier etapa habilitada. El sistema registra el punto real de ingreso; no inventar etapas anteriores.
  8. **Regla de criterios:** los criterios NO son globales. Cada punto de inspección tiene su propia configuración (tipo de dato, unidad, obligatoriedad, límites, muestra, evidencia, regla/resultado). Los criterios de un punto NO se copian automáticamente a otro.
  9. **Alcance demo:** implementar flujo completo de las 7 etapas, únicamente ESPECIE = ARÁNDANO; no reducir funcionalidad (la reducción de alcance es solo de especies).
- **Motivo:** Corrección conceptual explícita del usuario (2026-09-22) para distinguir etapa (ubicación en proceso) de punto de inspección (instancia de control) y alinear terminología.
- **Impacto:** Renombrar concepto en docs/UI de "punto de evaluación" a "punto de inspección"; modelo EMPRESA → ESPECIE → ETAPA → PUNTO → CRITERIOS; entidades: etapas operacionales, relación punto→etapa, trazabilidad de recorrido del lote; seed de las 7 etapas + puntos para arándano; migración 000006 debe reflejar esta cadena sin duplicar estructuras paralelas a `inspection_points`/`measurement_defs`.

---

## D-017: lot_status ≠ etapa operacional (UX Lotes)
- **Fecha:** 2026-09-22
- **Decisión:**
  1. NO fusionar `lot_status` con `current_operational_stage_id`.
  2. `lot_status` = estado administrativo/operacional del lote (CREADO → EN PROCESO → EN INSPECCIÓN → APROBADO…).
  3. `operational_stage` = ubicación del lote en el flujo QualityNX (Huerto → Cosecha → Recepción → Packing → Frío → Pre-despacho → Despacho).
  4. Cambiar el selector Estado NO debe alterar la etapa; registrar/transicionar etapa NO debe alterar `lot_status` salvo regla explícita futura.
  5. En la tabla de Lotes mostrar columnas separadas: **Estado (lote)** y **Etapa actual** (o "Sin etapa").
  6. Acción de etapa visible en la columna Etapa actual: **[Registrar etapa]** (INGRESO) o **[Transicionar etapa]** (TRANSICION) + historial.
  7. Flujo demo: lote EN PROCESO + etapa INSPECCIÓN HUERTO → Nueva inspección → punto "Inspeccion Huerto" → 17 criterios.
- **Motivo:** Confusión UX: el sello "EN PROCESO" parecía ser la etapa mientras `current_operational_stage_id` era NULL; el usuario decidió mantener los conceptos separados y hacer la etapa explícita en UI.
- **Impacto:** Solo UX de `dashboard/lots` (y mensajes en inspecciones); modelo de datos sin cambios; `lot_stage_events` sigue siendo la fuente de verdad de etapas.

---

## D-018: Flujo de proceso — estado no es selector libre (corrige D-012 UI)
- **Fecha:** 2026-09-22
- **Corrige (parcial):** D-012 (selector libre de estado en UI de Lotes).
- **Decisión:**
  1. El lote NO cambia de estado porque el usuario lo seleccione libremente y sin relación con el proceso.
  2. Flujo de verdad: LOTE → ETAPA OPERACIONAL → PUNTO DE INSPECCIÓN → INSPECCIÓN → RESULTADOS → DECISIÓN → (regla configurable) → NUEVA ETAPA y/o ESTADO RESULTANTE.
  3. ETAPA = dónde está; ESTADO = situación del lote como consecuencia del proceso/control (siguen siendo distintos; D-017 se mantiene).
  4. DECISIÓN de inspección ≠ ESTADO permanente del lote (ej. decisión APROBAR no implica que el lote quede eternamente en estado APROBADO).
  5. NO inventar aún el mapa PUNTO + DECISIÓN → SIGUIENTE ETAPA + ESTADO: revisar 04 + 05 + 06 + D-012/D-014; si no está definido → `PENDIENTE DE DECISIÓN`.
  6. UI: eliminar el selector arbitrario de `lot_status`; el estado se muestra como consecuencia del proceso. Acciones de etapa (Registrar/Transicionar) siguen siendo ubicación operacional, no atajo de estado.
  7. CERRADO sigue terminal (D-012) sin reverterse por selector.
  8. Crear lote: estado inicial del ciclo (CREADO); se puede definir etapa real de ingreso; no elegir APROBADO/RECHAZADO/etc. al crear.
  9. Abrir/completar inspección puede afectar `lot_status` solo cuando exista regla definida (hoy: no inventar EN INSPECCIÓN automática salvo regla).
  10. Bug `lot_stage_events.user_id` / `inspections.inspector_id`: usar `users.id` vía `users.auth_id = auth.uid()`; no cambiar el modelo.
- **Motivo:** Corrección conceptual explícita del usuario (2026-09-22): el estado debe derivarse del proceso y de decisiones registradas, no de un dropdown libre. D-012 quedó como solución provisional de 03; se corrige la UI manteniendo CERRADO terminal.
- **Impacto:** UX de Lotes (sin selector libre de estado); errores visibles al registrar etapa; fix de FK user_id en Lotes/Inspecciones; mapa decisión→etapa/estado queda PENDIENTE DE DECISIÓN (04/05/06); no se implementa automatización de estados en 04.

---

---

## D-018b: Origen del cambio de etapa = INSPECCIÓN (corrige D-018 §UI)
- **Fecha:** 2026-09-22
- **Corrige:** D-018 ítems de "Registrar/Transicionar etapa" manual desde Lotes.
- **Decisión:**
  1. El usuario NO selecciona etapa por separado en Lotes.
  2. Flujo: LOTE → INSPECCIONAR → PUNTO DE INSPECCIÓN → ETAPA derivada del punto → `lot_stage_event` → inspección.
  3. Primera vez (`current_operational_stage_id IS NULL`): `INGRESO` + entry/current = etapa del punto.
  4. Punto con etapa distinta a la actual: `TRANSICION`.
  5. Misma etapa: NO crear evento duplicado.
  6. Lotes: etapa informativa + Historial + Inspeccionar/Ver/Cerrar/Editar; sin selector ni botón de etapa.
  7. Nueva inspección: Lote → Punto → mostrar ETAPA derivada → Abrir inspección.
  8. Schema sin cambios (operational_stages, points, lot_stage_events, columns de lots).
  9. `lot_status` no se modifica al abrir inspección (mapa decisión→estado sigue PENDIENTE DE DECISIÓN).
- **Motivo:** Corrección conceptual del usuario: la inspección (vía punto) es la que origina el recorrido de etapas; el registro manual de etapa no corresponde al flujo real.
- **Impacto:** UX Lotes (quita controls de etapa); UX Inspecciones (evento automático al abrir); helpers createLotStageEvent se usan desde inspecciones.

---

## D-019: UX Lotes — historial en modal + lista responsive (PC/móvil)
- **Fecha:** 2026-09-22
- **Decisión:**
  1. El historial de etapas NO se muestra en la fila de la tabla (desarma la estructura).
  2. Historial se abre en cuadro flotante (modal bottom-sheet en móvil, centrado en PC), con scroll propio, cerrar por ✕/fondo/Escape/botón.
  3. Lista de lotes: tarjetas stacked en pantallas <lg (móvil/tablet) y tabla limpia en lg+.
  4. Acciones con targets táctiles min-h-10: Inspeccionar, Historial, Editar/Cerrar (o Ver).
  5. Header/nav del dashboard: padding y nav móvil con overflow-x para no desordenar.
- **Motivo:** El usuario reportó que el historial en la fila rompía la lista y pidió UX óptima para PC y celular en terreno.
- **Impacto:** Solo UI `dashboard/lots` + ajustes menores `dashboard/layout`; sin cambios de modelo.

---

## D-020: Mejora integral módulo Inspecciones (UX terreno + criterios dinámicos)
- **Fecha:** 2026-09-22
- **Decisión:**
  1. Etapa ≠ punto: la etapa se deriva del punto; el usuario NO selecciona etapa en el formulario.
  2. Selector de puntos: especie + puntos habilitados (NO filtrar solo por etapa actual del lote).
  3. Criterios dinámicos por punto con metadatos (info, recomendación, método, versión, fuente, obligatoriedad, límites, orden).
  4. Límites = ALERTA, no rechazo/resultado/estado/etapa automáticos.
  5. Ayuda ⓘ/💡 configurable en measurement_defs; sin texto inventado → "Información técnica pendiente de configuración".
  6. RESULTADO TÉCNICO y DECISIÓN DEL INSPECTOR separados y obligatorios para COMPLETAR (frontend).
  7. Validación de tipo/obligatoriedad en frontend; límites no bloquean.
  8. No inventar mapa PUNTO+DECISIÓN→ETAPA/ESTADO (sigue PENDIENTE DE DECISIÓN).
  9. 17 criterios Huerto ARÁNDANO se mantienen; no copiar a otros puntos.
- **Motivo:** Instrucción definitiva de mejora del módulo + reglas 04/CURRENT; preparación de terreno y demo.
- **Impacto:** schema measurement_defs (columnas de ayuda), UI inspecciones, types shared/database; sin motor de decisiones (06).

---

## D-021: IA OpenRouter FREE — asistente + aprendizaje histórico
- **Fecha:** 2026-09-22
- **Decisión:**
  1. Gateway OpenRouter; modelo configurable `OPENROUTER_MODEL` (default `openrouter/free`); SOLO free en esta etapa.
  2. API key exclusivamente en `.env.local` (server); sin `NEXT_PUBLIC_`; sin Git; sin frontend.
  3. AI Service desacoplado en `apps/web/src/lib/ai/` (types, openrouter.provider, inspection-ai, ai.service).
  4. Ruta `POST /api/ai/analyze` server-only; auth por bearer de sesión Supabase.
  5. Tablas nuevas: `ai_inspection_analysis` + `ai_learning_records` (migración 20260922000007).
  6. UI: orden RESULTADO TÉCNICO → DECISIÓN INSPECTOR → RECOMENDACIÓN IA; aviso "no sustituye la decisión del inspector".
  7. La IA no cierra inspecciones, no cambia etapa/estado, no modifica criterios/límites; fallo de IA no bloquea inspección.
  8. Aprendizaje = capturar/comparar/validar/acumular; discrepancia ≠ quién tuvo razón; validated=false por defecto.
  9. D-013 deja de ser solo "pendiente de diseño" para esta primera integración (asistente, no autonomía).
- **Motivo:** Ampliación explicitada por el propietario del proyecto (OpenRouter FREE + histórico estructurado).
- **Impacto:** env, migración, lib/ai, API route, UI inspecciones, types; NO adelanta 05/06 con lógica inventada.

---

## D-022: UX/UI pre-demo — identificación de LOTE y separación LOTE vs MUESTRA
- **Fecha:** 2026-09-22
- **Decisión:**
  1. El identificador operacional del lote en UI es **`lots.harvest_block`** (etiquetado "LOTE"); NO se inventa campo `lot_code`.
  2. Header sticky de inspección con LOTE prominente + datos de contexto + acción "Imprimir etiqueta" (modal + `window.print()`, QR = placeholder "QR pendiente").
  3. Formulario de inspección en secciones numeradas 1–10 con grid de progreso; identificación física (productor/especie/variedad/punto) visible y con ayuda 💡.
  4. Muestreo: distinción explícita **LOTE vs MUESTRA** (label auto `{harvest_block}-M0N`); método de muestreo configurable con fuente/versión/fecha; sin método → "Método de muestreo pendiente de configuración"; **NUNCA** asumir regla (p.ej. "1%") ni inventar normas.
  5. IA: recomendación muestra SIEMPRE el lote; orden RESULTADO → DECISIÓN → IA intacto; fallo de IA no bloquea.
  6. Paleta/estilo consistentes con `#FAFAF7`/`#4A5D23`/`#8fa868`; `@media print` solo etiqueta.
  7. **Se corrige/precisa en D-025 (2026-09-23):** la "Configuración del punto" sale del detalle de inspección y vive en `/dashboard/inspection-points`; header de detalle se reescribe (chips LOTE/PUNTO/ETAPA + PROGRESO) sin romper identificación por `harvest_block`.
- **Motivo:** Auditoría + mejora UX/UI pre-demo solicitada por el propietario; sin alterar lógica validada por E2E 30/30.
- **Impacto:** `inspections/page.tsx`, `lots/page.tsx`, `globals.css`, docs; NO cambia schema, reglas de negocio ni etapa 05/06.

---

## D-023: QUALITY ENGINE — motor determinístico de evaluación (etapa 05)
- **Fecha:** 2026-09-22
- **Decisión:**
  1. El criterio formal de evaluación se configura en **`measurement_defs`** (extensión: `evaluation_kind`, `acceptable_options`); NO se crea una estructura paralela de criterios.
  2. Resultados persistidos en **`quality_evaluations`** append-only con **`criterion_snapshot`** (reconstruible; históricos no se reinterpretan al cambiar el criterio).
  3. Tipos de comparación: mínimo, máximo, rango, condición (opciones aceptables), porcentual — derivados de la configuración o `evaluation_kind`.
  4. Resultados: `CUMPLE`, `DESVIACIÓN`, `SIN CRITERIO CONFIGURADO`, `UNIDAD INCOMPATIBLE`, `CONFIGURACIÓN AMBIGUA`, `CRITERIO INACTIVO`.
  5. Unidad incompatible o sin criterio → **NO evaluar** (no convertir a CUMPLE/DESVIACIÓN).
  6. Ambigüedad (min>max o >1 candidato activo sin prioridad) → `CONFIGURACIÓN AMBIGUA`, no elegir arbitrariamente.
  7. El motor **NO** modifica medición original, etapa, `lot_status`, decisión humana ni usa IA.
  8. Evaluación se dispara al guardar/completar y con botón "Evaluar calidad"; inspección COMPLETADA no re-evalúa con criterios actuales salvo `reevaluate_completed`.
  9. Límites demo (Brix≥10, Pudrición≤2%) siguen siendo configuración de criterio, no regla universal del atributo.
- **Motivo:** DoD 05 — evaluación objetiva medición vs criterio configurado, auditable y sin adelantar 06.
- **Impacto:** migración `20260922000009_quality_engine.sql`; `lib/quality/`; `POST/GET /api/quality/evaluate`; UI inspecciones (resumen + card eval); helpers/types shared; E2E `scripts/e2e_quality_engine.py`.

---

## D-024: DECISIONS — modelo append-only + mapa de efectos vacío (etapa 06)
- **Fecha:** 2026-09-22
- **Decisión:**
  1. `decisions` es **append-only**: estado `REGISTRADA` → `ANULADA` con motivo/responsable/fecha; **nunca** delete físico ni UPDATE de contenido (tipo, fundamento, contexto, responsable original).
  2. Snapshot `context_snapshot` JSONB al momento de decidir (lote, inspecciones, evaluaciones de calidad, decisiones previas) para reconstruir "sobre qué información".
  3. `decision_catalog` por empresa con los 10 tipos de CURRENT §21; `requires_fundamento` es **configurable por tipo** (06 §4.12) — no se siembra regla fija de qué tipos exigen fundamento.
  4. **Mapa PUNTO + DECISIÓN → ESTADO/ETAPA:** tabla `decision_effects` creada **VACÍA**. PENDIENTE DE DECISIÓN (D-018.5): la infraestructura existe pero **no se inventan reglas de transición**. Cuando exista una fila activa, la decisión puede aplicar `target_lot_status` / `target_operational_stage_id` al lote (respetando CERRADO terminal).
  5. QUALITY ENGINE **no** toma decisiones; una desviación no genera RECHAZAR automático (verificado en E2E P2).
  6. Roles que pueden decidir/anular: `COMPANY_ADMIN`, `INSPECTOR`, `SUPER_ADMIN` (mismo ámbito que operan inspecciones; RLS por empresa).
  7. Duplicado bloqueado: índice único `lot_id + decision_code` solo para `REGISTRADA`; para corregir se anula y se registra nueva (ambas trazables).
  8. Lote `CERRADO` no admite nuevas decisiones (trigger); anulación de decisiones pasadas sigue posible desde UI/API sobre lotes no cerrados.
- **Motivo:** DoD 06 — modelo de decisión humana trazable, sin sobrescritura silenciosa y sin inventar la matriz de transiciones aún no definida en CURRENT/D-018.
- **Impacto:** migración `20260922000010_decisions.sql` (ejecutada); types/helpers shared/database; `lib/decisions/`; `POST/GET /api/decisions` + `/api/decisions/annul`; UI Lotes (modal Decisión); E2E `scripts/e2e_decisions.py` 12/12 PASS.

---

## D-025: REDESIGN UX/UI Lotes e Inspecciones (sin cambio de lógica)
- **Fecha:** 2026-09-23
- **Decisión:**
  1. Revisión/reajuste visual de jerarquía, superficies y profundidad sobre Lotes e Inspecciones y pantallas afines; **NO** se altera lógica de negocio, modelo de datos, RLS, APIs, QE, Decision Service ni E2E.
  2. Paleta y superficies coherentes con D-003/D-022: `#FAFAF7` / `#4A5D23` / `#8FA868` / `#1A1A1A` con profundidad; **1 elemento dominante por pantalla**; labels micro ≥11px; fondo unificado `#f4f5f0`.
  3. Navegación del dashboard: **INICIO** / **OPERACIÓN** (Lotes, Inspecciones) / **CONFIGURACIÓN** (Datos maestros, **Puntos de inspección** → `/dashboard/inspection-points`). *(ampliada en D-026 con grupo **INFORMES** → `/dashboard/reports`)*
  4. La **configuración de punto y criterios** se centraliza en `/dashboard/inspection-points`; **se elimina** el bloque "Configuración del punto" del detalle de inspección (enlace/CTA al mantenedor desde el empty state de criterios). Misma capacidad, ubicación distinta.
  5. Header sticky del detalle de inspección: identificación LOTE / PUNTO / ETAPA + metadata + chip de estado + indicador **PROGRESO** (criterios listos / total) con barra; acciones en qx-btn-ghost.
  6. Microcopy de error de servicios (decisions, quality, ai) con mensajes fijos amigables; **no** se expone `error.message` crudo al usuario.
  7. Validación visual multi-viewport (1920×1080, 1280×800, 768×1024, 390×844) sobre 9 pantallas con Playwright (`visual_check/`); regresión E2E obligatoria 04/05/06.
- **Motivo:** Solicitud explícita de revisión/reajuste UX/UI de Lotes e Inspecciones (jerarquía, superficies, profundidad) sin tocar reglas validadas; ubicación de config de criterios fuera del flujo de captura en terreno.
- **Impacto:** `inspections/page.tsx`, `inspection-points/page.tsx`, `dashboard/layout.tsx`, `dashboard/page.tsx`, `master-data/page.tsx`, `lots/page.tsx`, `login`, `globals.css`, `lib/{decisions,quality,ai}`; infra `visual_check/`; docs (este registro + BUILD_STATUS). **Sin** migración, sin cambio de endpoint ni de E2E.

---

## D-026: FLUJO OPERACIONAL — alineación arquitectónica (lote, identificadores, genealogía, pre-despacho, despacho, informes, envíos)
- **Fecha:** 2026-09-24
- **Decisión:**
  1. **Historia del lote:** el lote no termina con una inspección; las inspecciones son eventos del historial. El unique `idx_inspections_open_unique` solo bloquea una segunda EN CURSO (mismo lote+punto); tras COMPLETADA puede abrirse nueva inspección (confirmado en código/spec 04/09).
  2. **Identificadores:** separar conceptualmente folio QualityNX (`lots.folio`) de folio de planta y folios externos cliente/exportadora. Hoy solo existe `lots.folio` (+ `producer_guide_number`). Multi-identificador con tipo/origen = **estructura futura** (no inventar columna única universal).
  3. **Genealogía / palletización / unión de lotes:** definida en CURRENT §24–27 y spec `08_TRANSFORMATIONS.md`; **no construida** (etapa 08 EN ESPERA). No duplicar historia física: solo relaciones de origen/derivado cuando se construya.
  4. **Pre-despacho → habilitación:** etapas 6–7 existen en `operational_stages`; decisiones existen; `decision_effects` vacía por diseño (D-024) ⇒ **PENDIENTE DE DECISIÓN** de matriz PUNTO+DECISIÓN→ESTADO/ETAPA. No inventar reglas de aprobación nuevas.
  5. **Despacho como objeto:** hoy solo etapa “Despacho / Embarque” + criterios de catálogo; **no existe entidad** `despacho` ni relación lote↔despacho. Requerirá estructura propia (fase posterior, con SQL solo si técnicamente necesario).
  6. **Menú INFORMES:** implementado como hub de consulta histórica (`/dashboard/reports`) que enlaza informes de inspección reales y trazabilidad de lotes; no duplica operación. Informes de despacho/genealogía/envío = fases posteriores.
  7. **Envío automático de informes:** solo definición conceptual (evento, destinatario, canal, registro de estado). Sin proveedor email/WhatsApp en esta etapa (CURRENT §57/§60 POST-MVP/FUTURAS). No implementar integración real aún.
  8. **Nivel de historia en informes de despacho:** contemplar conceptualmente completa vs resumida; **sin algoritmo** de “última historia” hasta especificación.
- **Motivo:** Instrucción consolidada de flujo operacional/trazabilidad/despacho/informes para prueba presentacional; encajar necesidades con estructura existente sin parches ni tablas paralelas; priorizar P1–P7 sin romper 01–07 ni adelantar 08 sin orden.
- **Impacto:** `dashboard/layout.tsx` (grupo Informes); nueva `dashboard/reports/page.tsx`; este registro. **Sin** SQL, sin E2E, sin tocar 185 criterios, QE, muestreo ni historial existente.

---

## D-027: CLASIFICACIÓN COMERCIAL + SEMÁFORO QUALITYNX + IA EN CIERRE + INFORMES
- **Fecha:** 2026-09-24
- **Decisión:**
  1. **Clasificación comercial + semáforo:** se deriva de Quality Engine (última evaluación por medición) al cerrar inspección. El inspector **no** elige color ni clase. Semáforo = categorías propias QualityNX (VERDE/AMARILLO/ROJO), **NO** SAG. Clase comercial = mapeo operacional por defecto (CLASE I / CLASE II / FUERA DE ESPECIFICACIÓN / SIN CLASIFICAR); matriz por especie/mercado = futura (nueva `logic_version`).
  2. **Lógica versionada** (`qnx-classify-2026-09-24-v1`): 0 evaluables → SIN CLASIFICAR/AMARILLO; 0 desviaciones → CLASE I/VERDE; desviaciones < cumple → CLASE II/AMARILLO; desviaciones ≥ cumple → FUERA DE ESPECIFICACIÓN/ROJO.
  3. **Persistencia append-only:** tabla `quality_classifications` (UNIQUE por `inspection_id`); histórico no se sobrescribe. **Última clasificación ≠ estado del lote** ni decisión formal.
  4. **IA:** best-effort al cierre (y manual); solo enriquece `justification` (`ai_used`); **no** modula color/clase por sí sola; **no** decide ni cierra. QE intacto (CUMPLE/DESVIACIÓN/…). `decision_effects` no se toca.
  5. **Pipeline cierre:** guardar datos → decisión formal → QE → IA (best-effort) → clasificación → learning → COMPLETADA.
  6. **UI:** chips clase/semáforo en detalle de inspección y listado de lotes; filtros “Clasificación comercial” y “Semáforo” en Lotes; sección en informe de inspección.
  7. **Informes:** informe histórico de lote `/dashboard/lots/[id]/report` (identidad, última clasificación, historia inspecciones/QE/clasificaciones/decisiones); informe de calidad de embarque `/dashboard/reports/shipment` (1..N lotes, contexto de referencia **sin** entidad Despacho ni packing list). Hub `/dashboard/reports` enlaza ambos.
  8. **Migración:** `20260924000003_quality_classifications.sql` preparada en repo; aplicación en Supabase requiere acción del usuario. Sin ella, el cierre informa que clasificación está pendiente (no bloquea datos ya guardados si el error es de esquema).
- **Motivo:** Instrucción definitiva de clasificación + semáforo + IA + historial + informes de lote/embarque sobre la arquitectura existente, sin sistemas paralelos ni duplicar información.
- **Impacto:** migración nueva; `packages/shared` (tipos); `packages/database` (list/insert clasificación); `lib/quality/classification.ts`; `POST/GET /api/quality/classify`; `inspections/page.tsx` (cierre + chips); `lots/page.tsx` (chips + filtros); `inspections/[id]/report`; nuevas `lots/[id]/report` y `reports/shipment`; hub `reports`; docs (D-027, BUILD_STATUS, CURRENT, 00_CONTEXT, 04).

---

## D-028: CIERRE FLUJO OPERACIONAL — BUSCAR LOTE + HISTÓRICO + IA HISTÓRICA + INFORME EMBARQUE
- **Fecha:** 2026-09-24
- **Decisión:**
  1. **Inspecciones buscador-first:** la pantalla `/dashboard/inspections` prioriza **BUSCAR LOTE** (folio QualityNX principal; también productor, bloque, guía, especie, variedad, fecha, punto, estado, clase, semáforo). Cada resultado es una **ficha** con folio, producto, productor, variedad, última inspección+fecha, estado, clase, semáforo y acciones **[Ver historial]** y **[Nueva inspección]**. La nueva inspección exige elegir un **nuevo punto** y crea un **`inspection_id` nuevo** en el **mismo `lot_id`**; no se edita ni reutiliza la inspección anterior. El formulario de creación muestra **contexto previo** (última inspección, fecha, punto, clase, semáforo, decisión) antes de abrir.
  2. **Semáforo visible fuera del detalle (Lotes):** círculo de color con tooltip/label accesible; **Sin clasificación** cuando no existe registro. Filtro de semáforo incluye **Sin clasificación**.
  3. **Hub Informes:** dos capacidades visibles y claras — **[Informe Histórico de Lote]** y **[Informe de Calidad de Embarque]**. Buscador ampliado: folio, productor (datalist), especie/variety implícitos en texto libre, fecha desde/hasta, punto, estado, clase comercial, semáforo.
  4. **Informe histórico de lote:** al final, sección **ANÁLISIS HISTÓRICO — QUALITYNX IA** (generada bajo demanda, solo datos reales del historial, identificada como IA, no modifica historia ni decisiones). Endpoint `POST /api/ai/analyze-lot`.
  5. **Informe de calidad de embarque:** contexto completo (número de embarque, fecha, planta/país origen, guía, destino, receptor/cliente, notas) sin bloquear por campos secundarios; por lote: folio, folio planta/bloque, producto, productor, última inspección (preferencia Pre-Despacho), clase, semáforo, decisión, resumen de calidad.
- **Motivo:** Cierre de la instrucción única de flujo completo LOTE → INSPECCIÓN → QE → IA → CLASIFICACIÓN → SEMÁFORO → DECISIÓN → HISTORIAL → NUEVA INSPECCIÓN → INFORMES → ANÁLISIS IA HISTÓRICO → INFORME DE CALIDAD DE EMBARQUE, corrigiendo la brecha crítica del flujo de Inspecciones (buscador-first, no lista interminable).
- **Impacto:** `inspections/page.tsx` (buscador de lote + ficha + form con contexto); `lots/page.tsx` (círculo semáforo + filtro Sin clasificación); `reports/page.tsx` (dos capacidades + buscador ampliado); `lots/[id]/report/page.tsx` (sección IA histórica); `reports/shipment/page.tsx` (contexto + detalle); `lib/ai/lot-history.ts`; `POST /api/ai/analyze-lot`; docs (D-028, BUILD_STATUS, CURRENT, 00_CONTEXT, 04).


---

## D-029: CIERRE ÚNICO — TIPO DE LOTE + FOLIO INTERNO + KG DECLARADOS + GENEALOGÍA + GUÍA MULTILOTE + FLUJO INFORMES + PDF
- **Fecha:** 2026-09-24
- **Decisión:**
  1. **Tipo de lote:** columna `lots.lot_type` (ORIGEN / PROCESO / REPALLETIZAJE, por defecto ORIGEN). ORIGEN = lote de origen/puro; PROCESO = lote nuevo de proceso; REPALLETIZAJE = lote derivado de repalletizaje. El lote derivado recibe **folio QualityNX nuevo** (trigger existente) y conserva la relación con sus lotes fuente.
  2. **Folio interno/planta:** `lots.folio_interno` (ej: PL-45872) separado de `lots.folio` QualityNX (YYYY-NNNNNN). Ambos se almacenan, muestran y buscan en Lotes, Inspecciones, hub de Informes e informes.
  3. **Kg declarados:** `lots.kg_declarados` = kg según guía/declaración del productor; **no se sobrescribe** con `theoretical_weight_kg` calculado por el sistema. Cantidad documental por lote (`quantity`) visible junto a los kg.
  4. **Genealogía:** tabla append-only `lot_genealogy` (source ↔ derived, relation_type PROCESO/REPALLETIZAJE, UNIQUE por par, RLS + audit). **Diferencia clave:** guía multilote = N lotes independientes que comparten `producer_guide_number` (sin transformación, sin genealogía); repalletizaje/proceso = lote nuevo + relación con fuentes.
  5. **Guía multilote en búsqueda:** buscar por guía en Lotes/Inspecciones/Informes devuelve **todos** los lotes de esa guía (sin duplicar guías); no existe catálogo paralelo de productores/guías.
  6. **Inspecciones — apertura directa por punto:** la ficha del buscador muestra los puntos actuales del lote (según especie) como botones; al elegir un punto se abre el formulario de nueva inspección con ese punto preseleccionado, **sin volver al listado**; cada punto crea `inspection_id` nuevo en el mismo `lot_id`.
  7. **Hub Informes — buscar → seleccionar → elegir informe:** la capacidad 1 lleva al buscador del propio hub (no a `/dashboard/lots`); filtros ampliados (folio QualityNX, folio interno, productor, especie, variedad, guía, bloque, fechas, punto, estado, clase, semáforo); al seleccionar un lote aparece el panel de elección: **[Informe histórico]** + lista **[Informe — punto — fecha]** de cada inspección completada.
  8. **Identidad en informes:** histórico de lote, informe de inspección y embarque muestran folio QualityNX, folio interno, guía, productor, tipo de lote, kg declarados, cantidad, clasificación y semáforo. Embarque añade columna “Cantidad / kg declarados” y tipo de lote en producto.
  9. **PDF/imprimir:** `@media print` generalizado a los tres documentos (`#inspection-report`, `#lot-report`, `#shipment-quality-report`): solo el `.report-document`, sin sidebar/menú/navegación/buscadores/botones; cabecera fija del informe y pie de página conservados; `main`/`footer` de la app sin espacio en impresión.
  10. **Migración:** `20260924000004_lot_type_genealogy.sql` (preparada en repo; aplicación en Supabase requiere acción del usuario). NO toca `20260924000003` (clasificación/semáforo) ni `decision_effects`.
- **Motivo:** Instrucción única de cierre D-029 sin puntos postergados: tipo de lote, folio interno, kg declarados, genealogía/proceso/repalletizaje, guía multilote, flujo de informes buscar→seleccionar→elegir, identidad completa en informes y PDF solo del documento.
- **Impacto:** migración nueva; `packages/shared` (LotType, LOT_TYPE_LABELS, LotGenealogy, campos Lot); `packages/database` (listLotGenealogy, insertLotGenealogy); `lots/page.tsx` (form tipo/fuentes/folio interno/kg + fila); `inspections/page.tsx` (búsqueda ampliada + puntos directos); `reports/page.tsx` (flujo completo + filtros); informes (inspección, histórico, embarque); `globals.css` (print); docs (D-029, BUILD_STATUS, CURRENT, 00_CONTEXT, 03, 04).

---

## D-031: CRITERIOS DE RECEPCIÓN/PROCESO + GENEALOGÍA CUANTIFICADA + BAXLO
- **Fecha:** 2026-09-26
- **Decisión:**
  1. **Criterios de recepción (4 nuevos):** Firmeza de fruto (BAXLO) [numérica, Unidades Shore], Peso 10 frutos [numérica, gr], Desgarro pedicelar [porcentaje, %], Fruta roja [porcentaje, %]. Todos `is_required=false`, sin límites ni tolerancias inventadas.
  2. **Criterios de proceso/packing (6 nuevos):** Firmeza de fruto (BAXLO) [numérica, Unidades Shore], Peso 10 frutos [numérica, gr], Peso cajas [numérica, kg], Sobrepeso [porcentaje, %], Desgarro pedicelar [porcentaje, %], Fruta roja [porcentaje, %]. Todos `is_required=false`, sin límites.
  3. **BAXLO:** Nombre funcional "Firmeza de fruto (BAXLO)". Es firmeza instrumental de pulpa, NO Brix. Unidad: Unidades Shore. No se asignan rangos de aceptación ni semáforos automáticos. No se afirma que QCInspec use el modelo F0.
  4. **Genealogía cuantificada:** `lot_genealogy` agrega `quantity` (NUMERIC) y `unit` (VARCHAR). La cantidad pertenece a la relación origen→resultado. Relaciones históricas sin cantidad permanecen como NULL (no se inventan ceros). No se implementa balance de masa ni fórmula de merma.
  5. **Clasificaciones externas NO interpretadas:** A/B/C y CAT-1/CAT-2 no se convierten en reglas internas, semáforos, decisiones ni estados. No se crean tablas ni migraciones para ellas.
  6. **Aprobación/Liberación/Segregación:** No se deducen ni automatizan. No se mapea a `decision_catalog` ni se modifica `lot_status`. No se crea flujo de liberación.
  7. **Consolidación de muestras:** No se crean fórmulas. N real = 1 → copia exacta; N > 1 → sin valor consolidado (pendiente de especificación).
  8. **Migraciones:** `20260926000001_genealogy_quantities.sql` y `20260926000002_recepcion_proceso_criteria.sql`. Idempotentes, sin alterar historia.
- **Motivo:** Actualización funcional basada en levantamiento QCInspec (informe 2026-09-26) y validación focalizada. Prioridad: criterios y trazabilidad de palletizado con mínima intervención técnica.
- **Impacto:** 2 migraciones nuevas; `measurement_defs` (10 criterios nuevos); `lot_genealogy` (2 columnas nuevas). Sin cambios en código de app, QE, decisiones ni informes. Validación: typecheck 0, lint 0 errores, build OK.

---

## D-030: CORRECCIÓN DE RENDIMIENTO PRE-E2E — CARGA PROGRESIVA + CONSULTAS BAJO DEMANDA
- **Fecha:** 2026-09-24
- **Decisión:**
  1. **Sin doble ejecución de consultas (dev):** `next.config.ts` con `reactStrictMode: false`. Medición previa mostró que cada `useEffect` disparaba todas las queries Supabase ×2 en desarrollo (React StrictMode activo por defecto en app router desde Next 13.5.1). Production no se afecta.
  2. **Perfil de usuario sin consultas repetidas:** dedupe de `getUserProfile` para llamadas concurrentes (misma promesa compartida; **sin caché** — se limpia al resolverse, sin datos obsoletos). Perfil y datos se cargan en paralelo: el perfil no bloquea pintar la lista.
  3. **Carga progresiva en dos olas:** Lotes e Inspecciones desbloquean la pantalla con la ola 1 (datos de lista: lotes, maestros de fila, etapas, clasificación/semáforo). La ola 2 (datos solo de formulario: campos, bloques, temporadas, embalaje; datos maestros) se carga sin bloquear. El botón **NUEVO LOTE** no espera a que termine la carga de la lista y el formulario abre de inmediato.
  4. **Genealogía siempre bajo demanda:** la lista de Lotes **nunca** consulta `lot_genealogy` (prohibido cargar genealogía completa por pantalla o por fila). Se consulta solo: al editar un lote PROCESO/REPALLETIZAJE (filtrada por `derived_lot_id`) y al guardar la edición (inserta únicamente pares que falten; append-only intacto). El selector de lotes fuente busca **bajo demanda** con input de búsqueda local: no lista todos los lotes al abrir el formulario.
  5. **Sin N+1:** ninguna pantalla consulta datos por fila. La clasificación/semáforo reutiliza el mecanismo existente (una consulta por pantalla, no por lote). El dashboard pide solo los 6 eventos más recientes (`listLotStageEvents(undefined, { latest: 6 })`).
  6. **Ajustes UX exigidos por la validación pre-E2E (§10):** campo **Especie** visible en el formulario de lote (derivado de la variedad seleccionada); "Ocultar/Cancelar" cierra el formulario; el mensaje de éxito se emite después de resetear el formulario (antes se borraba a sí mismo).
- **Motivo:** la carga del sistema estaba demasiado lenta para iniciar la E2E. La medición (Playwright sobre localhost:3000) identificó causas concretas: duplicación ×2 global (StrictMode), `getUserProfile` repetido hasta ×7 por navegación, cadenas seriales perfil→datos, y el delta D-029 de genealogía completa en la carga de Lotes. Orden del usuario: recuperar la experiencia de carga normal sin nuevas funcionalidades, sin rediseño y con validación RUNTIME obligatoria.
- **Impacto:** `apps/web/next.config.ts`; `packages/database/src/index.ts` (`getUserProfile` dedupe; `listLotStageEvents` acepta `{ latest }`, retrocompatible); `dashboard/page.tsx`, `lots/page.tsx`, `inspections/page.tsx`, `inspection-points/page.tsx`; docs (D-030, BUILD_STATUS, CURRENT, 00_CONTEXT, 03). **Sin** cambios en clasificación, QE, decisiones, informes, migraciones ni reglas de negocio. Validación: 21/21 checks runtime; typecheck **0**; lint **0 errores**; `build:web` **OK** (21 rutas). Medición antes→después: Lotes 27→12 requests y networkidle 31.5 s→1.7 s; dashboard 15.5 s→2.1 s; Informes 10.3 s→1.0 s. Estado: **READY FOR E2E**.

## D-032: TRANSFORMACIONES DE PLANTA, EXISTENCIAS Y DISPOSICIONES
- **Fecha:** 2026-10-05
- **Decisión:**
  1. **La genealogía no es control de existencias.** `lot_genealogy` (D-029/D-031) responde "de dónde viene este lote". No responde cuántas unidades quedan, cuántas se consumieron, ni cuál fue su disposición final. El modelo nuevo lo separa explícitamente.
  2. **Una transformación tiene N fuentes y N salidas.** Se agrega `lot_transformations` (operación), `lot_transformation_inputs` (lote fuente, disponible antes, consumido, unidad, tratamiento del remanente) y `lot_transformation_outputs` (RESULTADO, REMANENTE, MERMA, DESCARTE).
  3. **El remanente es siempre un lote nuevo** con folio propio. No es un saldo informal ni una cantidad escondida en el lote fuente. Si un lote fuente deja cantidad y el usuario la declara como remanente, debe registrarse como lote nuevo.
  4. **Merma y descarte son salidas explícitas con motivo.** No son remanente y no producen lote. Sin motivo no se pueden registrar.
  5. **Ecuación de balance:** lo que sale de cada fuente es su cantidad **consumida más su remanente** cuando se declara `COMO_LOTE_NUEVO`. `Σ salidas de fuentes = Σ salidas registradas`. No hay diferencia admisible y no hay conversión de unidades.
  6. **Sin conversión automática.** Una transformación trabaja en una sola unidad. Mezclar unidades es una operación distinta, no una conversión implícita. No se definen factores de conversión en este proyecto.
  7. **No se consume más de lo disponible**, y la validación es de **base de datos**, no de interfaz: `validate_lot_transformation` + trigger de unidad. Si la interfaz falla, la base también.
  8. **Confirmación atómica.** `confirm_lot_transformation` valida, abre existencias de las salidas, registra consumos, refleja la genealogía y confirma, o no deja nada. No existe estado parcial.
  9. **Existencias derivadas de un libro append-only** (`lot_stock_movements`), no de `lot_status`. La vista `lot_availability` clasifica DISPONIBLE / PARCIALMENTE_UTILIZADO / AGOTADO / CANTIDAD_NO_DECLARADA. Un lote agotado sale de existencias y permanece en historial.
  10. **Se agrega `lots.quantity_unit`.** Sin unidad declarada no hay balance verificable: el lote queda `CANTIDAD_NO_DECLARADA`, visible y fuera de las sumas. No se infiere unidad.
  11. **Append-only.** Una transformación confirmada no se edita. Para corregirla existe `annul_lot_transformation`, que exige motivo y no borra historia.
  12. **Disposición final con base mínima** (`lot_dispositions`): despacho, rechazo, segregación, retención o devolución, con cantidad, unidad, fecha, motivo y respaldo (inspección o decisión). **No** se inventan plantas, contenedores, pallets, navieras ni destinos: `destination_reference` es texto libre y `NULL` significa "no registrado", no "no hubo despacho".
  13. **Las mismas reglas en dos lugares.** `packages/shared/src/transformations.ts` implementa la especificación en lógica pura (validación en pantalla y pruebas sin base) y la función SQL es la autoridad. La base de datos siempre puede rechazar lo que la interfaz dejó pasar.
- **Motivo:** la genealogía existente no puede representar el caso real de planta (380 bandejas de entrada → R1 360 + R2 20). Sin esto, el remanente se escondería dentro del lote fuente y las cantidades desaparecerían del sistema. La conservación de entradas, salidas, remanentes y mermas es una **regla operacional del sistema**, no una regla normativa de calidad: no requiere inventar tolerancias ni normas.
- **Alcance y consecuencias:** agrega 5 tablas, 1 vista, 2 funciones de negocio y RLS por empresa para todas las entidades nuevas. No modifica `lot_genealogy` ni reinterpret sus filas; la refleja al confirmar. No altera Quality Engine, clasificaciones ni decisiones. Habilita el análisis por variedad y el control de existencias. Deja bloqueado lo que sigue sin definición: equivalencia A/B/C (C-01), umbrales (U-01/02/03), N>1 (A-01) y dimensiones logísticas (L-01).
- **Estado:** **código y reglas implementados y probados (33/33 unitarias, 11/11 funcionales)**. La migración `20261005000001_transformations_stock_dispositions.sql` está escrita y alineada con la especificación, pero **NO está aplicada**: requiere que el usuario la ejecute. Hasta entonces no se pueden registrar transformaciones reales.
- **No autorizado por esta decisión:** rellenar la etapa de lotes históricos por inferencia. Se verificó que 334 de 357 lotes no tienen etapa, evento ni inspección: no existe fuente confiable, y uno de los 22 que sí la tienen difiere de la etapa derivable de su última inspección. El dato se conserva como desconocido.

---

## D-033: TRAZABILIDAD OPERACIONAL COMPLETA (derivada, sin arquitectura paralela)
- **Fecha:** 2026-10-05
- **Decisión:**
  1. **La trazabilidad se deriva, no se replica.** No se crea tabla de historial: todo se compone en lectura desde lots, lot_genealogy, lot_transformations (+inputs/outputs), lot_stock_movements, lot_availability, inspections, decisions, lot_dispositions y lot_stage_events.
  2. **D-032 es la autoridad de cantidades y estados.** La disponibilidad viene del libro; una transformación ANULADA no es flujo vigente.
  3. **Una transformación anulada permanece visible como antecedente histórico**, con su motivo, y no se borra ni se reescribe para limpiarla. La genealogía sigue append-only.
  4. **Sin conversiones ni unidades inventadas.** Si no hay unidad declarada, la trazabilidad dice "Cantidad no declarada" y no muestra un saldo numérico.
  5. **Aislamiento por las políticas existentes.** La consulta usa el cliente autenticado: RLS decide. No se usa service_role ni se debilita ninguna política.
  6. **Navegable:** cada lote relacionado abre su propia trazabilidad, y el recorrido continúa en ambos sentidos.
  7. **Sin SQL.** D-033 no requirió migración: la arquitectura existente cubría el requerimiento.
- **Alcance:** vista `/dashboard/trazabilidad/[id]` y `getLotTraceGraph` en la capa de base de datos. No toca D-032 ni Quality Engine.
- **Estado:** **CERRADO / VALIDADO OPERACIONALMENTE** (28/28 pruebas operacionales). Pendiente por definición de negocio: la reversión de genealogía en anulaciones y las dimensiones logísticas de despacho (§9 de D-033), que quedan preparadas pero sin datos fabricados.

---

## D-034: RECEPCIÓN OPERACIONAL (reutiliza la arquitectura, sin SQL)
- **Fecha:** 2026-10-05
- **Decisión:**
  1. **La recepción es el punto de ingreso a planta.** Se registra como evento INGRESO en la etapa «Recepción Frigorífico / Packing» usando `lot_stage_events`, que ya es la fuente de verdad del recorrido (D-016).
  2. **Sin selector libre de etapa.** La recepción ES esa etapa; el resto del recorrido se registra con su evidencia. No se inventa ni se permite elegir una etapa incompatible.
  3. **Identidad = folio QualityNX.** Guía, productor, bloque y documento externo quedan como referencia, nunca como identidad.
  4. **D-032 intacto:** cantidad sin unidad se rechaza; sin cantidad el lote existe sin existencia; la disponibilidad la calcula el ledger.
  5. **Continuidad con el motor existente:** tras la recepción se ofrece iniciar la inspección de recepción sobre el mismo lote, usando puntos y criterios ya configurados. No se crean criterios ni tolerancias.
  6. **Sin SQL.** Toda la información necesaria ya existía; la recepción compone lo que hay.
- **Corrección aplicada:** `lot_stage_events.user_id` referencia `users(id)`, no `auth.uid()`. El alta de recepción entrega el id del perfil, no el de la sesión de Supabase Auth (misma clase de error que el `created_by` de D-032).
- **Alcance:** vista `/dashboard/recepcion` y enlace de navegación. No toca D-032 ni D-033.
- **Estado:** **CERRADO / VALIDADO OPERACIONALMENTE** (39/39 pruebas: R-001 a R-010).

## D-035: VALIDACIÓN OPERACIONAL DEL FLUJO DE INSPECCIÓN (sin SQL para el flujo)
- **Fecha:** 2026-10-06
- **Decisión:**
  1. **El flujo de inspección no requiere SQL.** Tablas, triggers, motor y UI ya existían. D-035 es construcción/verificación, no arquitectura nueva.
  2. **El Quality Engine no inventa criterios.** Con el catálogo actual (206 criterios, todos `PENDIENTE DE VALIDACIÓN`, solo 8 con rango numérico) toda medición sin criterio aplicable resuelve `SIN CRITERIO CONFIGURADO` (D-023). No se amplían tolerancias ni opciones para forzar `CUMPLE`.
  3. **La evidencia solo se exige si algún criterio activo del punto la configura.** La etiqueta de progreso de cierre pasa a respetar `evidence_required_by_config`; antes informaba «Falta evidencia fotográfica» aunque la evidencia fuera opcional, contradiciendo su propio checklist.
  4. **N real < N sugerido no bloquea** y exige motivo. Solo se validan las muestras efectivamente generadas (N real), nunca el N sugerido.
  5. **La etapa operacional se deriva del punto de inspección** (D-016/D-018); no se elige a mano.
  6. **Integridad:** D-035 solo añadió registros claramente identificados (`REC-D035-*`). ACME quedó en 377 lotes = 358 preexistentes sin modificar + 19 de prueba. TEST sigue con 0 inspecciones.
- **Defecto corregido:** etiqueta de progreso de cierre (`apps/web/src/app/dashboard/inspections/page.tsx:3289`) que exigía evidencia fotográfica ignorando la configuración de criterios.
- **Defecto abierto (requiere SQL + decisión):** `idx_inspections_open_unique` admite **una sola** inspección `EN CURSO` por lote, pero la UI declara «al seleccionar Nueva inspección eliges el punto y se crea un `inspection_id` nuevo en el mismo lote». Crear una segunda inspección en otro punto con una abierta devuelve `409 duplicate key` sin mensaje para el usuario.
- **Bloqueo SQL (decisión del usuario: clonar catálogo al crear empresa):** `lock_new_inspection_points` congela el catálogo, por lo que una empresa creada después del sellado tiene 0 puntos, 0 `measurement_defs` y 0 planes de muestreo y no puede inspeccionar. Requiere migración; no ejecutada.
- **Alcance:** verificación operacional de D-035 y corrección de la etiqueta de cierre. No toca D-032, D-033 ni D-034.
- **Estado:** **ABIERTO** — flujo validado (I-001 a I-018, salvo I-013a/I-013b por limitación del arnés); pendientes: decisión de `idx_inspections_open_unique` y migración de clonado de catálogo.
