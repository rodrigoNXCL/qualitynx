import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#2C2C2C] selection:bg-amber-200/40">
      <nav className="w-full max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logos/logotipo_horizontal.png" alt="NX Quality" className="h-14 w-auto max-w-[280px]" />
        </Link>
        <Link href="/login" className="text-sm font-medium text-[#4A5D23] hover:text-[#324814] transition-colors">Acceder</Link>
      </nav>

      <section className="max-w-5xl mx-auto px-8 pt-24 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-semibold leading-[1.05] tracking-[-0.03em] text-[#1a1a1a]">
            Control de calidad de fruta, <br />
            <span className="italic font-light text-[#5A6E3C]">hecho operativo.</span>
          </h1>
          <p className="mt-8 text-xl md:text-2xl leading-relaxed text-[#555550] max-w-2xl">
            Transformamos los datos de cada inspección — fruta, lote, evidencia — en decisiones comerciales y trazables. No almacenamos por almacenar; respaldamos la calidad que exporta su empresa.
          </p>
          <div className="mt-10 flex items-center gap-6">
            <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-[#4A5D23] px-8 py-4 text-base font-medium text-white shadow-lg shadow-[#4A5D23]/20 hover:bg-[#3a4a1b] hover:shadow-xl transition-all">
              Iniciar sesión
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-[#1a1a1a]/10 px-8 py-4 text-base font-medium text-[#1a1a1a] hover:bg-[#1a1a1a]/5 transition-colors">
              Ver ejemplo de inspección
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-8 pb-24 grid md:grid-cols-3 gap-10">
        <div className="rounded-3xl bg-white/60 backdrop-blur-sm p-8 border border-[#1a1a1a]/5 shadow-sm">
          <h3 className="text-lg font-medium text-[#1a1a1a]">Inspección por lote</h3>
          <p className="mt-3 text-[#555550] leading-relaxed">Registre mediciones, fotografías y decisiones por cada lote de fruta con trazabilidad completa.</p>
        </div>
        <div className="rounded-3xl bg-white/60 backdrop-blur-sm p-8 border border-[#1a1a1a]/5 shadow-sm">
          <h3 className="text-lg font-medium text-[#1a1a1a]">Calidad como respaldo</h3>
          <p className="mt-3 text-[#555550] leading-relaxed">El sistema convierte datos operativos en evidencia comercial para exportaciones y auditorías.</p>
        </div>
        <div className="rounded-3xl bg-white/60 backdrop-blur-sm p-8 border border-[#1a1a1a]/5 shadow-sm">
          <h3 className="text-lg font-medium text-[#1a1a1a]">Trazabilidad completa</h3>
          <p className="mt-3 text-[#555550] leading-relaxed">Desde la inspección inicial hasta la decisión comercial: cada lote, cada evidencia, cada resultado registrado con trazabilidad operativa.</p>
        </div>
      </section>

            <footer className="max-w-5xl mx-auto px-8 py-14 border-t border-[#1a1a1a]/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 md:gap-16">
          <div>
            <a href="https://www.nxchile.com" target="_blank" rel="noopener noreferrer" className="block text-2xl font-medium tracking-tight text-[#1a1a1a] hover:text-[#4A5D23] transition-colors">NXChile</a>
            <p className="mt-3 text-base leading-relaxed text-[#777] max-w-md">Tecnología operacional que ordena procesos de inspección y trazabilidad de fruta. Hecho en Chile para la realidad chilena.</p>
          </div>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4 text-sm text-[#555550]">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#777] mb-1">Contacto</p>
              <a href="mailto:contacto@nxchile.com" className="hover:text-[#4A5D23] transition-colors">contacto@nxchile.com</a>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#777] mb-1">WhatsApp</p>
              <a href="https://wa.me/56977412178" target="_blank" className="hover:text-[#4A5D23] transition-colors">+56 9 7741 2178</a>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#777] mb-1">Instagram</p>
              <a href="https://www.instagram.com/nx_chile" target="_blank" className="hover:text-[#4A5D23] transition-colors">@nx_chile</a>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#777] mb-1">Sitio</p>
              <a href="https://www.nxchile.com" target="_blank" className="hover:text-[#4A5D23] transition-colors">www.nxchile.com</a>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-[#1a1a1a]/5 flex items-center justify-between text-xs text-[#999]">
          <span>NX Quality — Control de calidad operativa. Elegancia y alivio operacional.</span>
          <span>Versión 1 — 25/09/2026</span>
        </div>
      </footer>
    </main>
  );
}
