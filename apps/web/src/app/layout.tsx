import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'QualityNX | Trazabilidad y control de calidad de lotes frutícolas',
  description:
    'QualityNX permite reconstruir la historia de calidad de cada lote: inspecciones, mediciones, evidencia, decisiones, trazabilidad y transformaciones para productores, packings y exportadoras.',
  metadataBase: new URL('https://quality.nxchile.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: 'https://quality.nxchile.com',
    siteName: 'QualityNX',
    title: 'QualityNX | Trazabilidad y control de calidad de lotes frutícolas',
    description: 'Reconstruye la historia de calidad de cada lote. Inspecciones, muestreo, evidencia, decisiones, trazabilidad y transformaciones.',
    images: [{ url: 'https://quality.nxchile.com/logos/logotipo_horizontal.png', width: 2172, height: 724, alt: 'QualityNX logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@NXChile',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f4f5f0]">{children}</body>
    </html>
  );
}
