import Image from 'next/image';
import Link from 'next/link';
import { LeadForm } from '@/components/LeadForm';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#1a1a1a] selection:bg-amber-200/40">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 border-b border-[#1a1a1a]/8 bg-[#FAFAF7]/90 backdrop-blur-md">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" aria-label="QualityNX inicio">
            <Image src="/logos/logotipo_horizontal.png" alt="QualityNX" width={2172} height={724} className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-[#555] md:gap-8">
            <a href="#como-funciona" className="hidden md:inline-block hover:text-[#4A5D23] transition-colors">Cómo funciona</a>
            <a href="#capacidades" className="hidden md:inline-block hover:text-[#4A5D23] transition-colors">Capacidades</a>
            <a href="#demo" className="rounded-full bg-[#4A5D23] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4d1b] transition-all">Solicitar demo</a>
          </div>
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-[#0f1110] px-6 py-24 md:px-8 md:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(74,93,35,0.18),transparent_60%)]" />
        <div className="absolute top-0 left-0 h-full w-full opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #4A5D23 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Trazabilidad y Control de Calidad</p>
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] md:text-7xl lg:text-[5rem] text-white">
                Cada lote tiene un historial. <br />
                <span className="text-[#8fa868]">QualityNX lo reconstruye.</span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#aaa] md:text-xl">
                Inspecciones, mediciones, muestreo, evidencia, decisiones documentadas y trazabilidad vinculadas al lote — para productores, packings y exportadoras que necesitan recuperar la historia de calidad de cada operación.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href="#demo" className="inline-flex items-center justify-center rounded-full bg-[#8fa868] px-8 py-4 text-base font-bold text-[#1a1a1a] transition-all hover:bg-[#7a8e55] hover:shadow-xl">
                  Solicitar demostración
                </a>
                <a href="#como-funciona" className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-base font-semibold text-white/90 transition-all hover:border-white/40 hover:text-white hover:shadow-lg">
                  Ver cómo funciona
                </a>
              </div>
              <p className="mt-5 text-sm text-[#777]">Demo personalizada para tu operación.</p>
            </div>
            <div className="relative">
              <div className="rounded-3xl border border-white/10 bg-[#16181a] p-6 shadow-2xl shadow-black/40 backdrop-blur-md lg:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#8fa868]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#aaa]">Lote activo</span>
                  </div>
                  <span className="rounded-full bg-[#4A5D23]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#8fa868]">APROBADO</span>
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight text-white mb-1">#2026-0847</h3>
                <p className="text-xs text-[#777] mb-4">Ejemplo ilustrativo — sin operación real</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-white/10 pb-2"><span className="text-[#999]">Variedad</span><span className="font-medium text-white">Highbush</span></div>
                  <div className="flex justify-between border-b border-white/10 pb-2"><span className="text-[#999]">Estado</span><span className="font-medium text-[#8fa868]">Aprobado</span></div>
                  <div className="flex justify-between border-b border-white/10 pb-2"><span className="text-[#999]">Calibre</span><span className="font-medium text-white">18 mm</span></div>
                  <div className="flex justify-between border-b border-white/10 pb-2"><span className="text-[#999]">Temperatura</span><span className="font-medium text-white">1,8 °C</span></div>
                  <div className="flex justify-between border-b border-white/10 pb-2"><span className="text-[#999]">Defectos</span><span className="font-medium text-white">2,4 %</span></div>
                </div>
                <div className="mt-4 rounded-lg bg-[#1a1a1a] p-3">
                  <p className="text-[10px] font-bold uppercase text-[#8fa868] mb-2">Historial ilustrativo</p>
                  <div className="flex gap-2 text-xs text-[#aaa]">
                    <span>Recepción</span><span>→</span><span>Inspección</span><span>→</span><span>Evaluación</span><span>→</span><span>Decisión</span><span>→</span><span>Despacho</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-[#777]">
                  <span>Inspecciones: 2</span>
                  <span>Muestreo: plan activo</span>
                  <span>Evidencia: 24 fotos</span>
                  <span>Decisión: documentada</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PARA QUIÉN ===== */}
      <section className="bg-[#FAFAF7] px-6 py-16 md:px-8 border-b border-[#1a1a1a]/8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#4A5D23]">Diseñado para</p>
          <div className="flex flex-wrap justify-center gap-3 text-sm font-semibold text-[#555]">
            {['Productores', 'Packings', 'Exportadoras', 'Equipos de Calidad'].map((item) => (
              <span key={item} className="rounded-full border border-[#1a1a1a]/10 bg-white px-5 py-2 shadow-sm">{item}</span>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#666]">
            Una solución diseñada para transformar registros de calidad en información histórica útil para tu operación.
          </p>
        </div>
      </section>

      {/* ===== PROBLEMA ===== */}
      <section className="bg-[#f0efe9] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">¿Podrías reconstruir hoy el historial completo de un lote de hace 6 meses?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#555]">
            Si para responder necesitas buscar entre Excel, fotografías, formularios, WhatsApp y carpetas, el problema no es la falta de información — es que la información está dispersa.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {['Excel', 'Fotografías', 'WhatsApp', 'Formularios', 'Carpetas', 'Memoria del inspector'].map((item) => (
              <span key={item} className="rounded-xl border border-[#1a1a1a]/10 bg-white px-5 py-3 text-sm font-medium text-[#777]">{item}</span>
            ))}
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.15em] text-[#cc4444]">Información dispersa</p>
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8" id="como-funciona">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-14 text-center text-3xl md:text-4xl font-bold tracking-tight">Desde la recepción hasta el historial.</h2>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[
              ['01', 'Recepción', 'Identificación del lote y datos iniciales.'],
              ['02', 'Inspección', 'Registro de controles, mediciones y resultados.'],
              ['03', 'Muestreo', 'Plan de muestreo, muestras y contexto de embalaje.'],
              ['04', 'Evaluación', 'Clasificación técnica y evidencia fotográfica vinculada.'],
              ['05', 'Decisión', 'Estado y resultado documentados con fundamento.'],
              ['06', 'Historial', 'Todo queda vinculado al lote para consultar.'],
            ].map(([num, title, desc]) => (
              <div key={num} className="rounded-2xl border border-[#1a1a1a]/8 bg-white p-6 shadow-sm">
                <span className="text-3xl font-extrabold text-[#8fa868]">{num}</span>
                <p className="mt-3 text-lg font-bold">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#555]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== QUÉ QUEDA REGISTRADO ===== */}
      <section className="bg-[#f0efe9] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">Toda la información vinculada al lote.</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Identificación', ['Lote', 'Variedad', 'Productor', 'Fecha', 'Origen', 'Temporada']],
              ['Calidad', ['Defectos', 'Calibre', 'Temperatura', 'Condición', 'Estado', 'Resultados']],
              ['Evidencia', ['Fotografías', 'Inspecciones', 'Observaciones', 'Responsable', 'Fecha y hora']],
              ['Muestreo', ['Plan de muestreo', 'Muestras', 'Unidad de medida', 'Continuidad entre inspecciones']],
              ['Normativa', ['Referencias cargadas', 'SAG Chile', 'UNECE FFV-57', 'Codex Alimentarius', 'USDA AMS']],
              ['Trazabilidad', ['Recepción', 'Inspección', 'Selección', 'Embalaje', 'Despacho', 'Destino']],
            ].map(([title, items]) => (
              <div key={title as string} className="rounded-2xl border border-[#1a1a1a]/8 bg-white p-6 shadow-sm">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#4A5D23]">{title}</p>
                <div className="space-y-1.5">
                  {(items as string[]).map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-[#555]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4A5D23]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NO ES SOLO UN FORMULARIO ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            No es solo un formulario.<br />
            <span className="text-[#4A5D23]">Es un sistema de información de calidad.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#555]">
            QualityNX transforma registros de inspección, mediciones, evidencia y resultados en información estructurada vinculada a cada lote. La evaluación técnica y la decisión final siguen siendo de tu equipo.
          </p>
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
            ].map(([title, desc]) => (
              <div key={title as string} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-lg font-bold">{title}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DIFERENCIACIÓN ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8" id="diferenciacion">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">¿Qué hace diferente a QualityNX?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Información vinculada al lote', 'Todo parte del lote: inspecciones, mediciones, evidencia, decisiones y trazabilidad.'],
              ['Muestreo documentado', 'Plan de muestreo, muestras tomadas y continuidad entre inspecciones registradas.'],
              ['Criterios configurables', 'Cada operación define sus controles con referencias normativas cargadas.'],
              ['Decisión documentada', 'La evaluación técnica y su fundamento quedan registrados y consultables.'],
              ['Historial consultable', 'Recupera la historia completa de cualquier lote.'],
              ['Transformaciones', 'Mezclas, divisiones y reprocesos con trazabilidad completa.'],
            ].map(([title, desc]) => (
              <div key={title as string} className="rounded-2xl border border-[#1a1a1a]/8 bg-white p-6 shadow-sm">
                <p className="text-lg font-bold">{title}</p>
                <p className="mt-3 text-sm leading-relaxed text-[#555]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PARA QUIÉN ===== */}
      <section className="bg-[#f0efe9] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">Diseñado para operaciones de fruta.</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              ['Productores', 'Registra y consulta información de calidad asociada a cada lote.'],
              ['Packings', 'Centraliza inspecciones, resultados y evidencia durante el proceso.'],
              ['Exportadoras', 'Conserva un historial estructurado para analizar calidad y trazabilidad.'],
              ['Equipos de Calidad', 'Reduce la dispersión de información y facilita la consulta histórica.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-[#1a1a1a]/8 bg-white p-6 shadow-sm">
                <p className="text-lg font-bold">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#666]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DEMOSTRACIÓN ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8" id="demostracion">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Mira QualityNX funcionando.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#555]">
            No es una maqueta. Es el sistema real que opera con lotes, inspecciones, muestreo, evidencia, evaluaciones, decisiones y trazabilidad.
          </p>
          <a href="#demo" className="mt-8 inline-block rounded-full bg-[#4A5D23] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[#3a4d1b] hover:shadow-xl">Solicitar demostración</a>
        </div>
      </section>

      {/* ===== FORMULARIO ===== */}
      <section className="bg-[#1a1a1a] px-6 py-20 text-white md:px-8" id="demo">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Demostración</p>
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight md:text-4xl">Solicita una demostración.</h2>
          <p className="mb-10 text-center text-base text-[#aaa]">Te contactaremos para conocer brevemente tu operación y coordinar una demostración.</p>
          <LeadForm />
          <p className="mt-6 text-center text-xs text-[#777]">Usamos tus datos únicamente para coordinar la demostración. No compartimos información con terceros.</p>
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
