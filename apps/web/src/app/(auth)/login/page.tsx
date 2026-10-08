'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@qualitynx/database';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError('Credenciales inválidas.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Error inesperado. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f0] px-4 py-10">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img
              src="/logos/isotipo_qualityNX.png"
              alt="QualityNX"
              className="h-16 w-16"
            />
          </div>
          <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight text-[#1a1a1a]">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-center text-sm text-[#888]">
            Plataforma operacional de calidad y trazabilidad
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="qx-banner qx-banner-error" role="alert">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="qx-input"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="qx-input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="qx-btn-primary w-full">
            {loading ? 'Verificando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="text-center text-sm text-[#888]">
          <p>QualityNX — Control de calidad de fruta, hecho operativo.</p>
        </div>
      </div>
    </div>
  );
}
