import Image from 'next/image';
import Link from 'next/link';
import { LeadForm } from '@/components/LeadForm';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#1a1a1a]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-[#1a1a1a]/8 bg-[#FAFAF7]/90 backdrop-blur-md">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" aria-label="QualityNX inicio">
            <Image src="/logos/logotipo_horizontal.png" alt="QualityNX" width={2172} height={724} className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-[#555] md:gap-8">
            <a href="#producto" className="hidden md:inline-block hover:text-[#4A5D23] transition-colors">Producto</a>
            <a href="#capacidades" className="hidden md:inline-block hover:text-[#4A5D23] transition-colors">Capacidades</a>
            <Link href="/login" className="hidden md:inline-block text-sm font-medium text-[#555] hover:text-[#4A5D23] transition-colors">Acceso</Link>
            <a href="#demo" className="rounded-full bg-[#4A5D23] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4d1b] transition-all">Solicitar demo</a>
          </div>
        </nav>
      </header>

      {/* ===== HERO — PRODUCTO PROTAGONISTA ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#121214] via-[#16181a] to-[#0f1110] px-6 py-24 md:px-8 md:py-36">
        <div className="absolute top-0 right-0 w-[60vw] h-[60vw] rounded-full bg-[#4A5D23]/15 blur-[120px] -translate-y-1/4 translate-x-1/4" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Texto */}
            <div className="lg:col-span-5">
              <p className="mb-5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#8fa868]">Trazabilidad y Control de Calidad</p>
              <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-[-0.04em] text-white">
                Cada lote tiene un historial.<br />
                <span className="text-[#8fa868]">QualityNX lo reconstruye.</span>
              </h1>
              <p className="mt-7 text-lg md:text-xl leading-relaxed text-[#bbb] max-w-lg">
                Inspecciones, muestreo, mediciones, evidencia, evaluaciones, decisiones documentadas y trazabilidad vinculadas al lote — sin dispersión.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <a href="#demo" className="inline-flex items-center justify-center rounded-full bg-[#8fa868] px-8 py-4 text-base font-bold text-[#1a1a1a] hover:bg-[#7a8e55] transition-all shadow-lg shadow-[#8fa868]/20">
                  Solicitar demostración
                </a>
                <a href="#producto" className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-base font-semibold text-white/80 hover:text-white hover:border-white/40 transition-all">
                  Ver el producto
                </a>
              </div>
              <p className="mt-4 text-xs text-[#777]">Demo personalizada para tu operación. Sin compromiso.</p>
            </div>

            {/* Tarjeta de producto (visual central) */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end">
              <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#16181a]/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8fa868] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">Lote · Inspección activa</span>
                  <span className="ml-auto rounded-full bg-[#4A5D23]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#8fa868]">APROBADO</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                    <p className="text-[10px] text-[#999] mb-0.5">Lote</p>
                    <p className="text-lg font-extrabold text-white tracking-tight">#2026-0847</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                    <p className="text-[10px] text-[#999] mb-0.5">Variedad</p>
                    <p className="text-lg font-extrabold text-white tracking-tight">Highbush</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                    <p className="text-[10px] text-[#999] mb-0.5">Estado</p>
                    <p className="text-sm font-bold text-[#8fa868]">Aprobado con evidencia</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                    <p className="text-[10px] text-[#999] mb-0.5">Calidad</p>
                    <p className="text-sm font-bold text-white">2,4 % defectos · 18 mm · 1,8 °C</p>
                  </div>
                </div>
                <div className="rounded-xl bg-[#1a1a1a]/60 p-4 mb-4 border border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8fa868] mb-3">Historial del lote — flujo verificado</p>
                  <div className="flex items-center gap-2 overflow-x-auto text-xs text-[#bbb] pb-1">
                    <span className="font-medium text-white">Recepción</span>
                    <span className="text-[#4A5D23]">→</span>
                    <span>Inspección</span>
                    <span>→</span>
                    <span>Evaluación técnica</span>
                    <span>→</span>
                    <span>Decisión documentada</span>
                    <span>→</span>
                    <span>Embalaje</span>
                    <span>→</span>
                    <span>Despacho</span>
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-[#777]">
                  <span>Inspecciones: 2</span>
                  <span>Muestreo: plan activo</span>
                  <span>Evidencia: 24 fotos vinculadas</span>
                  <span>Normativa: SAG / UNECE / Codex / USDA</span>
                </div>
                <p className="mt-3 text-[10px] text-[#555]">Ejemplo ilustrativo — datos no corresponden a una operación real.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROBLEMA VISUAL ===== */}
      <section className="bg-[#FAFAF7] px-6 py-16 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-extrabold leading-tight tracking-[-0.03em] mb-6">¿Podrías reconstruir hoy el historial completo de un lote de hace 6 meses?</h2>
              <p className="text-lg leading-relaxed text-[#555] mb-8">
                Si para responder necesitas buscar entre Excel, fotografías, formularios, WhatsApp y carpetas, el problema no es la falta de información. El problema es que está dispersa.
              </p>
              <div className="flex flex-wrap gap-3">
                {['Excel', 'Fotografías', 'WhatsApp', 'Formularios', 'Carpetas', 'Memoria del inspector'].map((item) => (
                  <span key={item} className="rounded-xl border border-[#1a1a1a]/10 bg-white px-4 py-2 text-sm font-medium text-[#888] shadow-sm">{item}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#1a1a1a] p-8 text-white shadow-xl">
              <p className="text-xs font-bold uppercase tracking-widest text-[#8fa868] mb-6">Antes</p>
              <div className="space-y-3 text-sm text-white/70">
                {['Información en múltiples formatos', 'Fotografías sin vincular al lote', 'Búsquedas manuales entre archivos', 'Dependencia de personas clave', 'Sin historial consultable'].map((item) => (
                  <div key={item} className="flex items-center gap-3"><span className="text-[#cc4444] font-bold">×</span> {item}</div>
                ))}
              </div>
              <hr className="my-6 border-white/10" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#8fa868] mb-6">Después — todo vinculado al lote</p>
              <div className="space-y-3 text-sm text-white/90">
                {['Inspección registrada', 'Mediciones vinculadas', 'Evidencia fotográfica', 'Evaluación técnica', 'Decisión documentada', 'Trazabilidad completa'].map((item) => (
                  <div key={item} className="flex items-center gap-3"><span className="text-[#8fa868] font-bold">✓</span> {item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRODUCTO VISUAL ===== */}
      <section id="producto" className="bg-[#FAFAF7] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Producto</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Un sistema de información de calidad</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#555] leading-relaxed">QualityNX transforma registros de inspección, mediciones, evidencia y resultados en información estructurada y vinculada a cada lote.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-[#1a1a1a] p-7 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#4A5D23]/20 rounded-full -translate-y-1/2 translate-x-1/3" />
              <h3 className="text-xl font-bold mb-3">Muestreo y medición</h3>
              <p className="text-sm leading-relaxed text-white/70 mb-4">Planes de muestreo, muestras tomadas y resultados registradas junto a la inspección. Continuidad entre inspecciones mantenida.</p>
              <p className="text-xs font-bold text-[#8fa868] uppercase tracking-wider">Verificado en base de datos</p>
            </div>
            <div className="rounded-2xl bg-white border border-[#1a1a1a]/8 p-7 shadow-sm">
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-3">Evaluación y decisión</h3>
              <p className="text-sm leading-relaxed text-[#555] mb-4">Evaluaciones de calidad clasificadas contra criterios configurables. Decisiones documentadas con fundamento, responsables y trazabilidad.</p>
              <p className="text-xs font-bold text-[#4A5D23] uppercase tracking-wider">Evaluación técnica y humana</p>
            </div>
            <div className="rounded-2xl bg-[#f0efe9] border border-[#1a1a1a]/8 p-7 shadow-sm">
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-3">Informes y trazabilidad</h3>
              <p className="text-sm leading-relaxed text-[#555] mb-4">Informes de lote, inspección y embarque. Historial completo de recepción, inspección, selección, embalaje y despacho.</p>
              <p className="text-xs font-bold text-[#4A5D23] uppercase tracking-wider">Recuperable en cualquier momento</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section id="como-funciona" className="bg-[#FAFAF7] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">Desde la recepción hasta el historial.</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { num: '01', title: 'Recepción', desc: 'Identificación del lote, variedad, productor y datos iniciales.' },
              { num: '02', title: 'Inspección', desc: 'Control de calidad con puntos de inspección, resultados y medidas.' },
              { num: '03', title: 'Muestreo', desc: 'Plan de muestreo, unidades tomadas, contexto de embalaje.' },
              { num: '04', title: 'Evaluación', desc: 'Clasificación técnica, evidencia fotográfica vinculada a la inspección.' },
              { num: '05', title: 'Decisión', desc: 'Estado y resultado documentados con fundamento y responsable.' },
              { num: '06', title: 'Trazabilidad', desc: 'Todo vinculado al lote para consultar, comparar y analizar.' },
            ].map(({ num, title, desc }) => (
              <div key={num} className="rounded-2xl border border-[#1a1a1a]/8 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4A5D23] text-sm font-extrabold text-white">{num}</span>
                  <h3 className="text-lg font-bold">{title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-[#555]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENEFICIOS ===== */}
      <section className="bg-[#1a1a1a] px-6 py-20 text-white md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">De registros aislados a información útil.</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              ['Reconstruye la historia de cada lote', 'Encuentra qué ocurrió, cuándo ocurrió y con qué evidencia.'],
              ['Encuentra información sin buscar entre archivos', 'Centraliza registros vinculados al mismo lote.'],
              ['Conserva evidencia de cada inspección', 'Resultados, observaciones y fotografías permanecen asociados.'],
              ['Compara períodos y detecta patrones', 'Analiza comportamiento de calidad a través del tiempo.'],
              ['Configura tus criterios de calidad', 'Define controles y asocia referencias normativas por operación.'],
              ['Construye memoria operacional', 'La información deja de depender de una persona o archivo.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-lg font-bold">{t}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== IA — CORREGIDO — DECISIÓN HUMANA EXPLÍCITA ===== */}
      <section id="ia" className="bg-[#FAFAF7] px-6 py-16 md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl bg-white border border-[#1a1a1a]/10 p-8 md:p-12 shadow-xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4A5D23]">Inteligencia artificial aplicada</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Un análisis que apoya la evaluación técnica.</h2>
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-base leading-relaxed text-[#555] mb-4">
                  Cuando la inspección está registrada con mediciones, evidencia y criterios, el sistema ejecuta un análisis asistido que ordena los hallazgos y los presenta al evaluador técnico.
                </p>
                <ul className="space-y-2 text-sm text-[#555]">
                  <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4A5D23]" /> Organiza hallazgos registrados</li>
                  <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4A5D23]" /> Contrasta mediciones con criterios</li>
                  <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4A5D23]" /> Apoya el análisis técnico</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-[#f0efe9] p-6 border border-[#1a1a1a]/5">
                <p className="text-sm font-bold text-[#1a1a1a] mb-2">La decisión sigue siendo humana.</p>
                <p className="text-sm leading-relaxed text-[#555]">El equipo técnico evalúa, decide y documenta el resultado. La IA ordena; no sustituye la evaluación ni la aprobación del lote.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DEMOSTRACIÓN ===== */}
      <section id="demostracion" className="bg-[#FAFAF7] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Mira QualityNX funcionando.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#555]">No es una maqueta. Es el sistema real: lotes, inspecciones, muestreo, decisiones, transformación, informes.</p>
          <a href="#demo" className="mt-8 inline-block rounded-full bg-[#4A5D23] px-8 py-4 text-base font-semibold text-white hover:bg-[#3a4d1b] transition-all">Solicitar demostración</a>
        </div>
      </section>

      {/* ===== FORMULARIO ===== */}
      <section id="demo" className="bg-[#1a1a1a] px-6 py-20 text-white md:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Demostración</p>
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight md:text-4xl">Solicita una demostración.</h2>
          <p className="mb-10 text-center text-base text-[#aaa]">Te contactaremos para conocer brevemente tu operación y coordinar una demostración.</p>
          <LeadForm />
          <p className="mt-6 text-center text-sm text-[#777]">Usamos tus datos únicamente para coordinar la demostración. No compartimos información con terceros.</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-[#1a1a1a]/8 bg-[#FAFAF7] px-6 py-12 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <Image src="/logos/logotipo_horizontal.png" alt="QualityNX" width={2172} height={724} className="h-10 w-auto" />
            <p className="mt-1 text-sm text-[#888]">Una solución NXChile.</p>
          </div>
          <div className="space-y-1 text-sm text-[#666]">
            <a href="mailto:contacto@nxchile.com" className="block hover:text-[#4A5D23]">contacto@nxchile.com</a>
            <a href="https://wa.me/56977412178" target="_blank" rel="noopener noreferrer" className="block hover:text-[#4A5D23]">+56 9 7741 2178</a>
          </div>
          <div className="space-y-1 text-sm text-[#666]">
            <a href="https://instagram.com/nxchile" target="_blank" rel="noopener noreferrer" className="block hover:text-[#4A5D23]">Instagram NXChile</a>
            <a href="https://nxchile.com" target="_blank" rel="noopener noreferrer" className="block hover:text-[#4A5D23]">NXChile</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
