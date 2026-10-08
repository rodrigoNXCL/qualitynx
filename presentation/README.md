# Presentación ejecutiva — NX Quality

Artefacto **independiente** para presentación comercial/demo.  
No forma parte de la aplicación ni modifica lógica, BD, APIs ni RLS.

## Cómo abrir

1. Ir a `presentation/index.html`.
2. Abrirlo en Chrome, Edge o Firefox (doble clic o arrastrar a la ventana).
3. Opcional: servir en local:

```bash
# desde la raíz del monorepo (app QualityNX)
npm run dev --workspace apps/web
# abrir http://localhost:3000   ← app real (demo)

# o solo la presentación en otro puerto:
npx --yes serve presentation -l 5173
# abrir http://localhost:5173/presentation/
```

La presentación es **autocontenida** (CSS + JS inline) y usa solo assets locales en `assets/`. Funciona sin conexión una vez copiada la carpeta `presentation/`.

## Controles

| Acción | Control |
|--------|---------|
| Siguiente | `→` · `Espacio` · `PageDown` · clic derecho de pantalla |
| Anterior | `←` · `PageUp` · clic izquierdo |
| Primera / última | `Inicio` / `Fin` |
| Pantalla completa | `F` o botón `⛶` |
| Índice | `I` o botón **Índice** |
| Modo demo | `D` o botón **Demo local** |
| Cerrar overlays | `Esc` |
| Swipe móvil | deslizar izquierda/derecha |

Barra inferior: progreso, contador `NN / 15`, acceso a demo y fullscreen.

## Pasar a la demo real

- Base configurable en JS: `const DEMO_BASE_URL = 'http://localhost:3000'` (aplicada por `applyDemoBase()`).
- Botón **VER DEMO** (slide 01), **ABRIR DEMO** (slide 15) o **ABRIR NX QUALITY** (panel) → `http://localhost:3000`
- Botón **Demo local** / tecla `D` → secuencia:
  1. Dashboard → `/dashboard`
  2. Lote → `/dashboard/lots`
  3. Inspección → `/dashboard/inspections`
  4. Quality Engine → `/dashboard/inspections`
  5. Decisión → `/dashboard/lots`
  6. Historia → `/dashboard/lots`

Etiqueta fija en la presentación: **Demo local · localhost:3000**.  
La presentación **no reemplaza** la aplicación; prepara el relato y conduce a la demo.

## Recursos utilizados

| Tipo | Origen real |
|------|-------------|
| Logos | `apps/web/public/logos/` (horizontal, vertical, isotipo) |
| Favicon | `apps/web/src/app/favicon.ico` |
| Screenshots | `visual_check/shots/1280x800/` (capturas Playwright multi-viewport) |
| Identidad | Paleta D-003/D-022/D-025: `#FAFAF7`, `#4A5D23`, `#8fa868`, `#1a1a1a` |
| Cifras de tests | `docs/BUILD_STATUS.md` (04:30/30, 05:23/23, 06:12/12, 07:18/18) |
| Estado de etapas | `docs/BUILD_STATUS.md` + `docs/BUILD_ORDER.md` |
| Decisiones | `docs/DECISIONS.md` (D-018, D-021–D-025) |
| URL demo | `http://localhost:3000` (`DEMO_BASE_URL` en `index.html`; dominio productivo D-005 no se usa en esta entrega) |

## Correspondencia con el estado real

| Slide | Clasificación |
|-------|----------------|
| 01 Portada | CONCEPTUAL (mensaje de producto) |
| 02 Problema | CONCEPTUAL |
| 03 Propuesta | IMPLEMENTADO (captura real dashboard) |
| 04 Modelo | IMPLEMENTADO (modelo D-017/D-018b) |
| 05 Lote | IMPLEMENTADO / captura real |
| 06 Inspección | IMPLEMENTADO / captura real |
| 07 Quality Engine | IMPLEMENTADO / VERIFICADO (23/23) |
| 08 Decisiones | IMPLEMENTADO / VERIFICADO (12/12) |
| 09 Trazabilidad | IMPLEMENTADO / VERIFICADO (18/18) |
| 10 Control | IMPLEMENTADO (RLS, triggers, aislamiento) |
| 11 Validación | VERIFICADO (BUILD_STATUS) |
| 12 Arquitectura | IMPLEMENTADO (solo componentes reales) |
| 13 Estado | VERIFICADO (01–07 completadas) |
| 14 Roadmap | ROADMAP (08–11 **no** implementados) |
| 15 Cierre | CONCEPTUAL + CTA demo |

**`decision_effects`** se menciona únicamente como **vacía por decisión (D-024)**.  
**08–11** solo aparecen como roadmap.

## Estructura

```
presentation/
  index.html
  PRESENTATION_SCRIPT.md
  README.md
  assets/
    favicon.ico
    logos/
      logotipo_horizontal.png
      logotipo_vertical.png
      isotipo_qualityNX.png
    screenshots/
      dashboard.png
      lots.png
      inspections.png
      inspection-detail.png
      lot-history.png
      lot-decision.png
      master-data.png
      inspection-points.png
```

## Duración y secuencia

- **Duración estimada slides:** 12–18 min (~16–17 min guion).
- **Secuencia recomendada:** 01 → 15, luego modo Demo local sobre la app en `http://localhost:3000`.
- **Lote de demo:** `d8ba1f69-4724-4307-a726-de7c279f80ce` — *E2E Redesign 241* (verificado con inspecciones COMPLETADA y decisiones en historial).

## Limitaciones

1. Screenshots de entorno de validación local/entorno de pruebas; pueden no reflejar datos de producción del presentador.
2. Sin animaciones de video ni captura de flujo en vivo (solo stills + demo real).
3. La demo apunta a `http://localhost:3000`; requiere la app corriendo localmente y credenciales del presentador.
4. No incluye PPTX (por instrucción: HTML es el formato principal).

## Confirmación

Esta presentación refleja el **estado real** del proyecto al cierre de la etapa 07:
base operacional LOTES + INSPECCIONES + QUALITY ENGINE + DECISIONES + TRAZABILIDAD,
con roadmap 08–11 **sin** presentar como terminado.
