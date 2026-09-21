import Image from 'next/image';
import Link from 'next/link';
import { LeadForm } from '@/components/LeadForm';

export default function LandingPage() {
  const lotStages = ['Recepción', 'Inspección', 'Selección', 'Embalaje', 'Despacho', 'Destino'];
  const flowStages = [
    'Recepción',
    'Inspección',
    'Registro de resultados',
    'Evidencia fotográfica',
    'Decisión / estado',
    'Seguimiento',
    'Historial del lote',
  ];
  const problemItems = [
    'Información dispersa entre planillas, formularios y documentos',
    'Fotografías separadas del resultado de cada inspección',
    'Registros de inspección difíciles de consultar y comparar',
    'Dependencia de personas y memorias operativas',
    'Dificultad para reconstruir el historial de un lote',
  ];
  const differentiationItems = [
    ['Trazabilidad', 'Relaciona lote, inspecciones, evidencia y resultados en una sola historia.'],
    ['Historial consultable', 'Recupera qué ocurrió, cuándo ocurrió y con qué evidencia.'],
    ['Evidencia fotográfica', 'Cada resultado conserva las fotografías que lo respaldan.'],
    ['Información estructurada', 'Datos organizados para comparar temporadas y tomar decisiones.'],
    ['Relación lote-inspección', 'Todo gira alrededor del lote y su evolución operativa.'],
    ['IA aplicada', 'Consultas útiles sobre la información propia de tu operación.'],
  ];

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#2C2C2C] selection:bg-amber-200/40">
      <header className="border-b border-[#1a1a1a]/10 bg-[#F7F6F2]/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="QualityNX inicio">
            <Image
              src="/logos/logotipo_horizontal.png"
              alt="QualityNX"
              width={2172}
              height={724}
              className="h-14 w-auto max-w-[280px]"
            />
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-[#4A5D23] md:gap-8">
            <a href="#como-funciona" className="hidden hover:text-[#324814] md:inline-block transition-colors">
              Cómo funciona
            </a>
            <a href="#lote" className="hidden hover:text-[#324814] md:inline-block transition-colors">
              Ejemplo de lote
            </a>
            <a
              href="#demo"
              className="rounded-full bg-[#4A5D23] px-5 py-2.5 text-white shadow-lg shadow-[#4A5D23]/20 transition-colors hover:bg-[#324814]"
            >
              Solicitar demostración
            </a>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-[#F7F6F2]">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-8 md:pb-28 md:pt-24">
          <div className="relative z-10 max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4A5D23]/20 bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4A5D23]" />
              Calidad que se puede consultar
            </p>
            <h1 className="text-5xl font-semibold leading-[1.03] tracking-[-0.045em] text-[#1a1a1a] md:text-6xl lg:text-[5.2rem]">
              Toda la historia de calidad de cada lote. <span className="italic font-light text-[#5A6E3C]">En un solo lugar.</span>
            </h1>
            <p className="mt-8 text-xl md:text-2xl leading-relaxed text-[#555550] max-w-2xl">
              QualityNX centraliza inspecciones, resultados, fotografías y trazabilidad para que puedas reconstruir y consultar el historial de calidad de cada lote.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#demo"
                className="inline-flex items-center justify-center rounded-full bg-[#4A5D23] px-8 py-4 text-base font-medium text-white shadow-lg shadow-[#4A5D23]/20 transition-all hover:bg-[#324814] hover:shadow-xl"
              >
                Solicitar demostración
              </a>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center rounded-full border border-[#1a1a1a]/10 bg-white/70 px-8 py-4 text-base font-medium text-[#1a1a1a] transition-colors hover:bg-white"
              >
                Ver cómo funciona
              </a>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[#777]">
              Para empresas productoras, packings y exportadoras que necesitan controlar y recuperar información histórica de calidad y trazabilidad.
            </p>
          </div>

          <div id="lote" className="relative mx-auto w-full max-w-xl">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#DDE4C9] opacity-60 md:-right-14 md:-top-14 md:h-44 md:w-44" />
            <div className="absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-[#E9E2C8] opacity-50 md:-left-14 md:-bottom-14 md:h-36 md:w-36" />
            <div className="relative rounded-[28px] border border-[#4A5D23]/15 bg-white p-5 shadow-[0_24px_70px_rgba(26,26,26,0.14)] md:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777]">Lote registrado</p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1a1a1a]">#2026-0847</h2>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E6EFD5] px-3 py-1.5 text-xs font-bold text-[#324814]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3F7D3A]" />
                  APROBADO
                </span>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-[12px] uppercase tracking-wider text-[#777]">Variedad</dt>
                  <dd className="mt-1 font-medium">Highbush</dd>
                </div>
                <div>
                  <dt className="text-[12px] uppercase tracking-wider text-[#777]">Productor</dt>
                  <dd className="mt-1 font-medium">XXXXX</dd>
                </div>
                <div>
                  <dt className="text-[12px] uppercase tracking-wider text-[#777]">Recepción</dt>
                  <dd className="mt-1 font-medium">18/09/2026</dd>
                </div>
                <div>
                  <dt className="text-[12px] uppercase tracking-wider text-[#777]">Fotografías</dt>
                  <dd className="mt-1 font-medium">24</dd>
                </div>
              </dl>

              <div className="mt-6 rounded-2xl bg-[#F7F6F2] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">Inspección</p>
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[#3F7D3A]">
                    <span aria-hidden="true">✓</span> Realizada
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[12px] text-[#777]">Defectos</p>
                    <p className="mt-1 text-lg font-semibold text-[#1a1a1a]">2,4 %</p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[12px] text-[#777]">Calibre</p>
                    <p className="mt-1 text-lg font-semibold text-[#1a1a1a]">18 mm</p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[12px] text-[#777]">Temperatura</p>
                    <p className="mt-1 text-lg font-semibold text-[#1a1a1a]">1,8 °C</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777]">Historial</p>
                  <span className="text-xs text-[#777]">18/09/2026</span>
                </div>
                <ol className="mt-4 space-y-0">
                  {lotStages.map((stage, index) => (
                    <li key={stage} className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index === 1 ? 'bg-[#4A5D23] text-white' : 'bg-[#E9E2C8] text-[#324814]'}`}>
                        {index + 1}
                      </span>
                      <span className={`text-xs ${index === 1 ? 'font-bold text-[#1a1a1a]' : 'text-[#555550]'}`}>{stage}</span>
                      {index < lotStages.length - 1 && (
                        <span className="ml-2 text-[#B8B4A4]" aria-hidden="true">↓</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-[#777]">Ejemplo visual de la información que queda disponible para consultar.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">El problema</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">
              ¿Cuánto tiempo necesitas para reconstruir qué ocurrió con un lote?
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#555550]">
              El problema no es tener datos. El problema es poder encontrarlos, relacionarlos y utilizarlos cuando los necesitas.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {problemItems.map((item) => (
              <div key={item} className="rounded-2xl border border-[#1a1a1a]/10 bg-[#F7F6F2] p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#B85C45]" />
                  <p className="text-sm leading-relaxed text-[#555550]">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F6F2] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777]">Antes</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">
                La información existe, pero no está conectada.
              </h2>
              <div className="mt-8 space-y-3">
                {['Excel', 'Fotografías', 'WhatsApp', 'Formularios', 'Carpetas', 'Memoria del inspector'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#1a1a1a]/10 bg-white p-4">
                    <span className="flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-[#A7A194]" />
                    <span className="text-sm text-[#555550]">{item}</span>
                    <span className="ml-auto text-[#B8B4A4]" aria-hidden="true">+</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">Después</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">
                Todo vuelve a tener una historia.
              </h2>
              <div className="mt-8 space-y-0 rounded-3xl border border-[#4A5D23]/20 bg-white p-5 shadow-sm">
                {['LOTE', 'INSPECCIONES', 'EVIDENCIA', 'RESULTADOS', 'TRAZABILIDAD', 'HISTORIAL'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 py-2.5">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index === 5 ? 'bg-[#4A5D23] text-white' : 'bg-[#E9E2C8] text-[#324814]'}`}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-[#1a1a1a]">{item}</span>
                    {index < 5 && <span className="ml-2 text-[#B8B4A4]" aria-hidden="true">↓</span>}
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-relaxed text-[#555550]">Una ficha central para recuperar el historial de cada lote y compartirlo con confianza.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">El producto</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">
              No es solo un formulario. Es un sistema de información de calidad.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#555550]">
              Cada etapa queda vinculada al mismo lote, para que la operación de hoy alimente la información que tu empresa necesitará mañana.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {flowStages.map((stage, index) => (
              <div key={stage} className="relative rounded-2xl border border-[#1a1a1a]/10 bg-[#F7F6F2] p-5">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">0{index + 1}</span>
                <h3 className="mt-4 text-base font-semibold leading-tight">{stage}</h3>
                {index < flowStages.length - 1 && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 text-[#B8B4A4]" aria-hidden="true">↓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F6F2] py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">Información consultable</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">
              Convierte tu historial de calidad en información consultable.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#555550]">
              La IA aparece después de construir una base histórica estructurada. No como una promesa genérica, sino como una herramienta para explotar el conocimiento acumulado por tu operación.
            </p>
            <div className="mt-8 space-y-4">
              <blockquote className="rounded-2xl border-l-4 border-[#4A5D23] bg-white p-5 text-sm leading-relaxed text-[#555550]">
                “Muéstrame los lotes de esta variedad que presentaron más de 3% de defectos durante las últimas temporadas.”
              </blockquote>
              <blockquote className="rounded-2xl border-l-4 border-[#4A5D23] bg-white p-5 text-sm leading-relaxed text-[#555550]">
                “¿Qué defectos fueron más frecuentes en esta variedad durante septiembre?”
              </blockquote>
            </div>
          </div>
          <div className="rounded-[28px] border border-[#4A5D23]/20 bg-white p-7 shadow-sm md:p-9">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">Base histórica</p>
              <span className="rounded-full bg-[#E9E2C8] px-3 py-1.5 text-xs font-bold text-[#324814]">IA aplicada</span>
            </div>
            <div className="mt-8 space-y-4">
              <div className="rounded-xl bg-[#F7F6F2] p-5">
                <p className="text-sm text-[#555550]">Consulta sobre tu propia información</p>
                <p className="mt-2 text-xs text-[#777]">Lotes · temporadas · defectos · variedades</p>
              </div>
              <div className="rounded-xl bg-[#F7F6F2] p-5">
                <p className="text-sm text-[#555550]">Respuesta orientada a la decisión</p>
                <p className="mt-2 text-xs text-[#777]">No más búsquedas manuales entre archivos.</p>
              </div>
              <div className="rounded-xl bg-[#F7F6F2] p-5">
                <p className="text-sm text-[#555550]">Conocimiento que permanece</p>
                <p className="mt-2 text-xs text-[#777]">Aunque cambie la persona que registra la información.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">Por qué QualityNX</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">
              La calidad también se construye con información bien ordenada.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {differentiationItems.map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-[#1a1a1a]/10 bg-[#F7F6F2] p-5">
                <span className="text-2xl text-[#4A5D23]" aria-hidden="true">↗</span>
                <h3 className="mt-4 text-base font-semibold leading-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#555550]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F6F2] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="grid max-w-4xl gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4A5D23]">Prueba social</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">
                Una empresa, un problema y un resultado.
              </h2>
            </div>
            <blockquote className="rounded-3xl border border-[#4A5D23]/20 bg-white p-7 shadow-sm md:p-9">
              <p className="text-xl leading-relaxed text-[#1a1a1a]">
                “Antes teníamos la información repartida entre planillas y fotografías. Ahora podemos reconstruir el historial de un lote desde una sola ficha.”
              </p>
              <div className="mt-8 flex flex-col gap-1.5 border-t border-[#4A5D23]/10 pt-6">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E9E2C8] px-3 py-1.5 text-xs font-bold text-[#324814]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3F7D3A]" />
                  BlueExport
                </span>
                <p className="text-sm font-semibold text-[#1a1a1a]">Empresa productora y packing</p>
                <p className="mt-2 text-xs text-[#777]">Control de calidad y trazabilidad de fruta</p>
              </div>
            </blockquote>
          </div>
        </div>
      </section>

      <section id="demo" className="bg-[#4A5D23] py-20 md:py-28 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center md:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Demostración</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">
              ¿Quieres ver cómo funcionaría QualityNX en tu operación?
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#E9E2C8]">
              Cuéntanos qué necesitas controlar y recuperarnos. La intención es encontrar una reunión útil para tu operación, no llenar tu bandeja de correos.
            </p>
            <div className="mt-8 flex flex-col gap-3 text-sm text-[#F7F6F2]">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">✉</span> contacto@nxchile.com
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">◔</span> +56 9 7741 2178
              </span>
            </div>
          </div>
          <LeadForm />
        </div>
      </section>

      <footer className="border-t border-[#1a1a1a]/10 bg-[#F7F6F2] py-14">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div>
              <a href="https://www.nxchile.com" target="_blank" rel="noopener noreferrer" className="block text-2xl font-medium tracking-tight text-[#1a1a1a] hover:text-[#4A5D23] transition-colors">NXChile</a>
              <p className="mt-3 text-base leading-relaxed text-[#777] max-w-md">Tecnología operacional que ordena procesos de inspección y trazabilidad de fruta. Hecho en Chile para la realidad chilena.</p>
            </div>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4 text-sm text-[#555550]">
              <div>
                <p className="mb-1 text-xs uppercase tracking-widest text-[#777]">Contacto</p>
                <a href="mailto:contacto@nxchile.com" className="hover:text-[#4A5D23] transition-colors">contacto@nxchile.com</a>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-widest text-[#777]">WhatsApp</p>
                <a href="https://wa.me/56977412178" target="_blank" rel="noopener noreferrer" className="hover:text-[#4A5D23] transition-colors">+56 9 7741 2178</a>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-widest text-[#777]">Instagram</p>
                <a href="https://www.instagram.com/nx_chile" target="_blank" rel="noopener noreferrer" className="hover:text-[#4A5D23] transition-colors">@nx_chile</a>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-widest text-[#777]">Sitio</p>
                <a href="https://www.nxchile.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#4A5D23] transition-colors">www.nxchile.com</a>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-[#1a1a1a]/5 pt-6 text-xs text-[#999] md:flex-row md:items-center md:justify-between">
            <span>NX Quality — Control de calidad operativo. Elegancia y alivio operacional.</span>
            <span>Versión 2 — 21/09/2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
