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
            <Image
              src="/logos/logotipo_horizontal.png"
              alt="QualityNX"
              width={2172}
              height={724}
              className="h-14 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-[#555] md:gap-8">
            <a href="#como-funciona" className="hidden transition-colors hover:text-[#4A5D23] md:inline-block">Cómo funciona</a>
            <a href="#beneficios" className="hidden transition-colors hover:text-[#4A5D23] md:inline-block">Beneficios</a>
            <a href="#faq" className="hidden transition-colors hover:text-[#4A5D23] md:inline-block">FAQ</a>
            <a
              href="#demo"
              className="rounded-full bg-[#4A5D23] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#3a4d1b] hover:shadow-lg"
            >
              Solicitar demo
            </a>
          </div>
        </nav>
      </header>

      {/* ===== 1. HERO ===== */}
      <section className="relative overflow-hidden bg-[#1a1a1a] px-6 py-24 text-white md:px-8 md:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(74,93,35,0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Trazabilidad y Control de Calidad</p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-[-0.03em] md:text-6xl lg:text-[4.5rem]">
            Toda la historia de calidad<br className="hidden md:block" /> de cada lote.
            <br />
            <span className="text-[#8fa868]">En un solo lugar.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[#999] md:text-xl">
            QualityNX centraliza inspecciones, resultados, fotografías y trazabilidad para que puedas reconstruir y consultar el historial de calidad de cada lote.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#demo"
              className="rounded-full bg-[#4A5D23] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[#3a4d1b] hover:shadow-xl"
            >
              Solicitar demostración
            </a>
            <a
              href="#como-funciona"
              className="rounded-full border border-white/20 px-8 py-4 text-base font-semibold text-white/80 transition-all hover:border-white/40 hover:text-white"
            >
              Cómo funciona
            </a>
          </div>
          <p className="mt-5 text-sm text-[#666]">Demo personalizada para tu operación.</p>
        </div>
      </section>

      {/* ===== 2. DISEÑADO PARA ===== */}
      <section className="border-b border-[#1a1a1a]/8 bg-[#FAFAF7] px-6 py-16 md:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Diseñado para</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold text-[#555]">
            {['Productores', 'Packings', 'Exportadoras', 'Equipos de Calidad y Operaciones'].map((item) => (
              <span key={item} className="rounded-full border border-[#1a1a1a]/10 bg-white px-5 py-2.5 shadow-sm">
                {item}
              </span>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#666]">
            Una solución diseñada para transformar los registros de calidad en información histórica útil para tu operación.
          </p>
        </div>
      </section>

      {/* ===== 3. FICHA DE LOTE ===== */}
      <section className="bg-[#f0efe9] px-6 py-20 md:px-8" id="lote">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Lo que verás</p>
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">Una ficha de lote en QualityNX.</h2>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            {/* Ficha */}
            <div className="rounded-2xl border border-[#1a1a1a]/10 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8fa868]">Lote</span>
                <span className="rounded-full bg-[#4A5D23]/10 px-3 py-1 text-xs font-bold text-[#4A5D23]">APROBADO</span>
              </div>
              <p className="mb-1 text-2xl font-bold tracking-tight">#2026-0847</p>
              <div className="mt-6 space-y-3 text-sm">
                {[
                  ['Variedad', 'Highbush'],
                  ['Productor', 'XXXXXXXX'],
                  ['Fecha recepción', '18/09/2026'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-[#1a1a1a]/5 pb-2">
                    <span className="text-[#888]">{label}</span>
                    <span className="font-medium text-[#1a1a1a]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl bg-[#f7f6f2] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8fa868]">Calidad</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    ['2,4%', 'Defectos'],
                    ['18 mm', 'Calibre'],
                    ['1,8 °C', 'Temperatura'],
                  ].map(([val, label]) => (
                    <div key={label}>
                      <p className="text-lg font-bold">{val}</p>
                      <p className="text-xs text-[#888]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-[#888]">
                <span>Fotografías: 24</span>
                <span>Inspecciones: 2</span>
              </div>
            </div>
            {/* Historial */}
            <div className="flex flex-col justify-center rounded-2xl border border-[#1a1a1a]/10 bg-white p-6 shadow-sm">
              <p className="mb-6 text-sm font-bold uppercase tracking-wider text-[#8fa868]">Historial del lote</p>
              <div className="space-y-0">
                {['Recepción', 'Inspección', 'Selección', 'Embalaje', 'Despacho', 'Destino'].map((stage, i, arr) => (
                  <div key={stage} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i === arr.length - 1 ? 'bg-[#8fa868]' : 'bg-[#4A5D23]'}`}>
                        {i + 1}
                      </div>
                      {i < arr.length - 1 && <div className="h-6 w-px bg-[#4A5D23]/30" />}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm font-medium text-[#1a1a1a]">{stage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 4. PROBLEMA ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8" id="problema">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            ¿Podrías reconstruir hoy<br className="hidden md:block" /> el historial completo de un lote<br className="hidden md:block" /> de hace 6 meses?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#666]">
            Si para responder necesitas buscar entre Excel, fotografías, formularios, WhatsApp y carpetas, el problema no es la falta de información. El problema es que la información está dispersa.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {['Excel', 'Fotografías', 'WhatsApp', 'Formularios', 'Carpetas', 'Memoria del inspector'].map((item) => (
              <span key={item} className="rounded-xl border border-[#1a1a1a]/10 bg-[#f0efe9] px-5 py-3 text-sm font-medium text-[#888]">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.15em] text-[#cc4444]">Información dispersa</p>
        </div>
      </section>

      {/* ===== 5. ANTES / DESPUÉS ===== */}
      <section className="bg-[#1a1a1a] px-6 py-20 text-white md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">Antes y después</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Antes */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#cc4444]">Antes</p>
              <div className="space-y-3">
                {['Información en múltiples formatos', 'Fotografías sin vincular al lote', 'Búsquedas manuales entre archivos', 'Dependencia de personas clave', 'Sin historial consultable'].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-white/70">
                    <span className="mt-0.5 text-[#cc4444]">×</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            {/* Después */}
            <div className="rounded-2xl border border-[#4A5D23]/40 bg-[#4A5D23]/10 p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#8fa868]">Después</p>
              <div className="space-y-3">
                {['Todo vinculado al lote', 'Evidencia fotográfica integrada', 'Consulta inmediata', 'Información que no depende de nadie', 'Historial completo disponible'].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-white/80">
                    <span className="mt-0.5 text-[#8fa868]">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6. CÓMO FUNCIONA ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8" id="como-funciona">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Flujo</p>
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">Desde la recepción hasta el historial.</h2>
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
            {[
              ['01', 'Recepción', 'Identificación del lote y datos iniciales.'],
              ['02', 'Inspección', 'Registro de controles y resultados.'],
              ['03', 'Evidencia', 'Fotografías, observaciones y respaldo.'],
              ['04', 'Decisión', 'Estado y resultado de la inspección.'],
              ['05', 'Trazabilidad', 'La información permanece relacionada con el lote.'],
              ['06', 'Historial', 'Todo queda disponible para futuras consultas.'],
            ].map(([num, title, desc]) => (
              <div key={num} className="rounded-2xl border border-[#1a1a1a]/8 bg-white p-6 shadow-sm">
                <span className="text-3xl font-bold text-[#8fa868]">{num}</span>
                <p className="mt-3 text-lg font-bold">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#666]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 7. QUÉ QUEDA REGISTRADO ===== */}
      <section className="bg-[#f0efe9] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">
            Toda la información que necesitas.<br />Vinculada al lote.
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {[
              ['Identificación', ['Lote', 'Variedad', 'Productor', 'Fecha', 'Origen', 'Temporada']],
              ['Calidad', ['Defectos', 'Calibre', 'Temperatura', 'Condición', 'Estado', 'Resultados']],
              ['Evidencia', ['Fotografías', 'Inspecciones', 'Observaciones', 'Responsable', 'Fecha y hora']],
              ['Trazabilidad', ['Recepción', 'Inspección', 'Selección', 'Embalaje', 'Despacho', 'Destino']],
            ].map(([title, items]) => (
              <div key={title as string} className="rounded-2xl border border-[#1a1a1a]/8 bg-white p-6 shadow-sm">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#8fa868]">{title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(items as string[]).map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-[#555]">
                      <span className="h-1 w-1 rounded-full bg-[#4A5D23]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 8. NO ES SOLO UN FORMULARIO ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            No es solo un formulario.<br />
            <span className="text-[#4A5D23]">Es un sistema de información de calidad.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#666]">
            QualityNX transforma registros de inspección, evidencia y resultados en información estructurada y vinculada a cada lote.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {['Consultar información histórica', 'Recuperar evidencia', 'Relacionar inspecciones con lotes', 'Analizar resultados', 'Comparar períodos', 'Construir conocimiento operacional'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-[#1a1a1a]/8 bg-white px-5 py-3.5 text-left text-sm font-medium text-[#555] shadow-sm">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4A5D23]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 9. BENEFICIOS ===== */}
      <section className="bg-[#1a1a1a] px-6 py-20 text-white md:px-8" id="beneficios">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Beneficios</p>
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">De registros aislados a información útil.</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              ['Reconstruye la historia de cada lote', 'Encuentra qué ocurrió, cuándo ocurrió y qué resultados se registraron.'],
              ['Encuentra información sin buscar entre archivos', 'Centraliza registros y evidencia vinculados al mismo lote.'],
              ['Conserva evidencia de cada inspección', 'Resultados, observaciones y fotografías permanecen asociados al registro.'],
              ['Compara períodos y detecta patrones', 'La información histórica permite analizar el comportamiento de calidad.'],
              ['Construye memoria operacional', 'La información deja de depender de una persona, una planilla o una carpeta.'],
            ].map(([title, desc]) => (
              <div key={title as string} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-lg font-bold">{title}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 10. OPERACIÓN EN TERRENO ===== */}
      <section className="bg-[#1a1a1a] px-6 py-20 text-white md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Operación en terreno</p>
          <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
            Calidad también ocurre donde<br className="hidden md:block" /> la conectividad no siempre está disponible.
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/60">
            QualityNX está diseñado para llevar el registro de inspecciones al terreno, manteniendo la información asociada al lote incluso en operaciones donde la conectividad puede ser limitada.
          </p>
          <p className="mt-4 text-sm font-medium text-[#8fa868]">Próximamente: registro offline para operaciones en terreno.</p>
        </div>
      </section>

      {/* ===== 11. IA ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8" id="ia">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Inteligencia Artificial</p>
          <h2 className="mb-6 text-center text-3xl font-bold tracking-tight md:text-4xl">
            Ahora puedes preguntarle<br className="hidden md:block" /> a tu historial.
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-lg leading-relaxed text-[#666]">
            Cuando la información de calidad está estructurada y relacionada, la IA puede ayudarte a encontrar patrones, responder preguntas y consultar el conocimiento acumulado de tu operación.
          </p>
          <div className="space-y-4">
            {[
              'Muéstrame los lotes de esta variedad que presentaron más de 3% de defectos.',
              '¿Qué defectos fueron más frecuentes durante esta temporada?',
              '¿Qué productores presentaron mayor incidencia de este defecto durante las últimas tres temporadas?',
              'Muéstrame el historial de este lote.',
            ].map((q) => (
              <div key={q} className="rounded-xl border border-[#1a1a1a]/8 bg-white px-6 py-4 text-sm text-[#555] shadow-sm italic">
                &ldquo;{q}&rdquo;
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm font-medium text-[#888]">
            La IA no reemplaza tus registros.<br />Los convierte en información que puedes consultar.
          </p>
        </div>
      </section>

      {/* ===== 11. DIFERENCIACIÓN ===== */}
      <section className="bg-[#f0efe9] px-6 py-20 md:px-8" id="diferenciacion">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">¿Qué hace diferente a QualityNX?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Información vinculada al lote', 'Todo parte del lote y permanece relacionado con él.'],
              ['Historial', 'La operación de hoy construye la memoria de la empresa.'],
              ['Evidencia', 'Las fotografías y registros permanecen vinculados a la información correspondiente.'],
              ['Consulta', 'La información histórica puede recuperarse y analizarse.'],
              ['IA aplicada', 'La IA trabaja sobre el conocimiento acumulado de la empresa.'],
              ['Operación en terreno', 'Diseñado para operación en terreno, con funcionalidad offline en desarrollo.'],
            ].map(([title, desc]) => (
              <div key={title as string} className="rounded-2xl border border-[#1a1a1a]/8 bg-white p-6 shadow-sm">
                <p className="text-lg font-bold">{title}</p>
                <p className="mt-3 text-sm leading-relaxed text-[#666]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 12. PARA QUIÉN ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8">
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

      {/* ===== 13. PRUEBA SOCIAL ===== */}
      <section className="bg-[#1a1a1a] px-6 py-20 text-white md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8fa868]">Próximas implementaciones</p>
          <h2 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl">QualityNX está preparado para comenzar.</h2>
          <p className="text-lg leading-relaxed text-white/60">
            QualityNX está preparado para comenzar sus primeras implementaciones en productores, packings y exportadoras de fruta. Pronto incorporaremos experiencias y resultados de operaciones reales.
          </p>
        </div>
      </section>

      {/* ===== 14. DEMOSTRACIÓN ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Mira cómo funcionaría QualityNX en tu operación.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#666]">
            Te mostramos el flujo aplicado a tu realidad y cómo la información de tus lotes puede quedar organizada y consultable.
          </p>
          <a
            href="#demo"
            className="mt-8 inline-block rounded-full bg-[#4A5D23] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[#3a4d1b] hover:shadow-xl"
          >
            Solicitar demostración
          </a>
        </div>
      </section>

      {/* ===== 15. CTA WHATSAPP ===== */}
      <section className="bg-[#25D366]/10 px-6 py-12 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-lg font-semibold text-[#1a1a1a]">¿Prefieres hablar directamente?</p>
          <a
            href="https://wa.me/56977412178?text=Hola%2C%20me%20interesa%20QualityNX"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-[#25D366] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[#1da851] hover:shadow-lg"
          >
            Hablar por WhatsApp
          </a>
          <p className="mt-3 text-sm text-[#888]">+56 9 7741 2178</p>
        </div>
      </section>

      {/* ===== 16. FAQ ===== */}
      <section className="bg-[#FAFAF7] px-6 py-20 md:px-8" id="faq">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {[
              ['¿Para qué tipo de empresas está diseñado QualityNX?', 'Para productores, packings y exportadoras de fruta que necesitan controlar y recuperar información histórica de calidad y trazabilidad.'],
              ['¿Se puede utilizar para diferentes tipos de fruta?', 'Sí. QualityNX puede configurarse para distintos tipos de fruta y controles de calidad según las necesidades de cada operación.'],
              ['¿Puedo registrar fotografías de las inspecciones?', 'Sí. Cada inspección puede incluir evidencia fotográfica vinculada al lote.'],
              ['¿La información queda vinculada al lote?', 'Sí. Todo — inspecciones, resultados, evidencia y trazabilidad — permanece relacionado con el lote.'],
              ['¿Puedo consultar el historial de un lote?', 'Sí. Puedes reconstruir la historia completa de cualquier lote desde una sola vista.'],
              ['¿Puedo comparar información histórica?', 'Sí. La información estructurada permite comparar períodos, variedades y productores.'],
              ['¿QualityNX reemplaza Excel?', 'QualityNX permite centralizar y estructurar información que actualmente puede estar distribuida entre Excel, formularios, fotografías y otros archivos.'],
              ['¿La plataforma funciona con conectividad limitada?', 'QualityNX está diseñado para operación en terreno y estamos desarrollando su funcionalidad offline para registrar inspecciones cuando la conectividad sea limitada.'],
              ['¿La IA puede consultar el historial de mi empresa?', 'Sí. La IA trabaja sobre la información estructurada de tu empresa para responder consultas específicas.'],
              ['¿Puedo adaptar los controles de calidad a mi operación?', 'Sí. QualityNX se adapta a los controles y estándares de cada operación.'],
            ].map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-[#1a1a1a]/8 bg-white shadow-sm">
                <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-[#1a1a1a] marker:text-[#4A5D23] transition-colors hover:text-[#4A5D23]">
                  {q}
                </summary>
                <div className="px-6 pb-4 text-sm leading-relaxed text-[#666]">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 17. FORMULARIO ===== */}
      <section className="bg-[#f0efe9] px-6 py-20 md:px-8" id="demo">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#4A5D23]">Demostración</p>
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-[#1a1a1a] md:text-4xl">Solicita una demostración.</h2>
          <p className="mb-10 text-center text-base text-[#666]">Te mostramos QualityNX aplicado a tu operación.</p>
          <LeadForm />
          <p className="mt-6 text-center text-sm text-[#888]">Te contactaremos para conocer brevemente tu operación y coordinar una demostración.</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-[#1a1a1a]/8 bg-[#FAFAF7] px-6 py-12 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <Image
              src="/logos/logotipo_horizontal.png"
              alt="QualityNX"
              width={2172}
              height={724}
              className="h-10 w-auto"
            />
            <p className="mt-1 text-sm text-[#888]">Una solución NXChile.</p>
          </div>
          <div className="space-y-1 text-sm text-[#666]">
            <a href="mailto:contacto@nxchile.com" className="block hover:text-[#4A5D23] transition-colors">contacto@nxchile.com</a>
            <a href="https://wa.me/56977412178" target="_blank" rel="noopener noreferrer" className="block hover:text-[#4A5D23] transition-colors">+56 9 7741 2178</a>
          </div>
          <div className="space-y-1 text-sm text-[#666]">
            <a href="https://instagram.com/nxchile" target="_blank" rel="noopener noreferrer" className="block hover:text-[#4A5D23] transition-colors">Instagram NXChile</a>
            <a href="https://nxchile.com" target="_blank" rel="noopener noreferrer" className="block hover:text-[#4A5D23] transition-colors">NXChile</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
