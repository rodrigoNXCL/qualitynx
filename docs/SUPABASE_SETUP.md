# NX QUALITY — CONFIGURACIÓN DE SUPABASE

## OBJETIVO
Preparar la infraestructura base requerida para la etapa 01 — FOUNDATION.

## PASOS PARA EL USUARIO (RODRIGO)

1. Crear Proyecto:
   - Ingresa a https://supabase.com/dashboard
   - Crea un nuevo proyecto llamado "nx-quality".
   - Anota la contraseña de la base de datos (se usará solo si es necesario en migraciones).

2. Obtener Credenciales:
   - Ve a Settings > API.
   - Copia la "Project URL" (NEXT_PUBLIC_SUPABASE_URL).
   - Copia la "anon public" key (NEXT_PUBLIC_SUPABASE_ANON_KEY).
   - Copia la "service_role" key (SUPABASE_SERVICE_ROLE_KEY). *Mantener esta secreta.*

3. Configurar Variables de Entorno:
   - En la raíz del proyecto, crea un archivo `.env.local`.
   - Pega las variables con tus valores reales:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
     NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_anon_aqui
     SUPABASE_SERVICE_ROLE_KEY=tu_key_service_aqui
     ```

4. Confirmación:
   - Una vez hecho esto, confirma al Arquitecto Técnico para iniciar la ejecución del SQL de Foundation.

## NOTA
No ejecutar SQL manualmente todavía. Esperar instrucciones de migración desde el repositorio.