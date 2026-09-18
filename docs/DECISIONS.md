# NX QUALITY — DECISIONES DEL PROYECTO

## D-001: Plataforma de Despliegue Web
- **Fecha:** 2026-08-13
- **Decisión:** La aplicación Web (`apps/web`) se desplegará en **Cloudflare Pages**.
- **Motivo:** Evitar límites de ancho de banda de Vercel (100 GB) y costos imprevistos. Cloudflare ofrece ancho de banda ilimitado en su plan gratuito, crítico para el manejo de imágenes de evidencia y escalabilidad hacia la fecha objetivo (01/09/26).
- **Impacto Técnico:** `apps/web` debe configurarse para ser compatible con el runtime de Cloudflare (usando `@opennextjs/cloudflare` o modo estático). No se debe asumir compatibilidad con funciones específicas de Vercel.

---

## ESTRUCTURA DE REGISTRO

Cada decisión debe contener:
- Identificador único (D-001, D-002, etc.)
- Fecha
- Decisión tomada
- Motivo/razón
- Impacto técnico/funcional
---

## D-002: Stack Cloudflare Pages — Confirmado para Landing/Login
- **Fecha:** 2026-09-17
- **Decisión:** Toda la capa de presentación (`apps/web`) — landing y login — debe ser compatible con **Cloudflare Pages / Workers** (runtime Edge, no Vercel). Usar `@opennextjs/cloudflare` o modo estático según `01_FOUNDATION.md`.
- **Motivo:** La infraestructura definida (`DECISIONS.md` D-001) requiere despliegue en Cloudflare para escalabilidad sin límites de ancho de banda. No asumir funciones específicas de Vercel.
- **Impacto Técnico:** No usar `next/headers` ni APIs de servidor de Vercel; usar `fetch` global y `crypto` web-standard. Landing y login deben ser SSR/SSG compatibles con Edge.

---

## D-003: Diseño Landing / Login — Estilo Apple / Calidad de Fruta
- **Fecha:** 2026-09-17
- **Decisión:** La landing y el acceso (login) se diseñan con estética **Apple** (elegancia, espacios generosos, tipografía limpia, paleta natural: blanco, tonos caliz de oliva, verde hoja, terra, sin gradientes artificiales ni estética genérica de IA). Enfocado al **servicio de control de calidad de fruta** (evidencia de inspección, trazabilidad, decisiones comerciales), no a un producto de IA abstracto.
- **Motivo:** El producto NX Quality transforma datos de inspección en respaldo para decisiones operativas. La interfaz debe transmitir precisión, confiabilidad y profesionalismo a exportadoras/prestadores de inspección.
- **Impacto Técnico:** Componentes en `apps/web/src/app/page.tsx` y `apps/web/src/app/(auth)/login/page.tsx` deben usar Tailwind + variables CSS compatibles con Cloudflare Pages. No usar librerías pesadas de animación.

---

## D-004: Fecha Límite Versión 1
- **Fecha:** 2026-09-17
- **Decisión:** La versión 1 operativa debe estar funcionando el **25/09/2026**.
- **Motivo:** Restricción del proyecto definida por usuario y registrada en `.env.local`.
- **Impacto:** Priorizar Foundation + autenticación + landing mínima; no agregar etapas posteriores (Master Data, Lots) hasta que Foundation cierre.
