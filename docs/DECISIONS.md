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
