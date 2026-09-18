# 01_FOUNDATION.md

# NX QUALITY — FOUNDATION

Versión: 1.0
Etapa: 01 — FOUNDATION
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. OBJETIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Construir la base funcional y técnica mínima sobre la cual podrán
construirse todas las etapas posteriores de NX Quality.

FOUNDATION debe dejar disponible:

- aplicación;
- autenticación;
- usuarios;
- empresas;
- aislamiento multiempresa;
- roles base;
- conexión con la fuente central de datos;
- almacenamiento de evidencias;
- estructura base para auditoría;
- configuración necesaria para comenzar MASTER DATA.


FOUNDATION NO construye todavía:

- maestros completos;
- lotes;
- inspecciones;
- motor de calidad;
- decisiones;
- trazabilidad;
- transformaciones;
- offline completo;
- dashboards;
- analítica.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOUNDATION

NO DEPENDE DE:

02 — MASTER DATA
03 — LOTS
04 — INSPECTIONS
05 — QUALITY ENGINE
06 — DECISIONS
07 — TRACEABILITY
08 — TRANSFORMATIONS
09 — OFFLINE
10 — OPERATIONAL VIEW
11 — ANALYTICS


Debe utilizar:

CURRENT.md
00_CONTEXT.md
BUILD_ORDER.md
BUILD_STATUS.md
DECISIONS.md


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PLATAFORMA BASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La plataforma central definida para NX Quality es:

SUPABASE


La base de datos central es:

POSTGRESQL


Supabase constituye la plataforma central para:

- base de datos;
- autenticación;
- almacenamiento;
- acceso seguro a datos;
- servicios backend proporcionados por la plataforma.


La arquitectura debe mantener:

UNA SOLA FUENTE CENTRAL DE VERDAD.


La operación local del dispositivo no constituye una segunda base
maestra.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. CLIENTES DE LA PLATAFORMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality tendrá dos experiencias principales.


TERRENO

Aplicación instalada.

Prioridad:

TELÉFONO MÓVIL.


Debe estar preparada para operación offline.

La definición detallada de sincronización pertenece a:

09 — OFFLINE.


ADMINISTRACIÓN / SUPERVISIÓN

Aplicación web responsiva.

Debe poder utilizarse desde:

- PC;
- notebook;
- tablet.


FOUNDATION solamente debe dejar disponible la base necesaria para
ambas experiencias.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. AUTENTICACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La autenticación será gestionada mediante:

SUPABASE AUTH.


El usuario debe disponer de una identidad autenticada antes de
acceder a información operacional protegida.


La identidad autenticada debe poder relacionarse con:

- empresa;
- rol;
- estado de acceso.


No debe existir acceso anónimo a información operacional.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. MULTIEMPRESA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality es MULTIEMPRESA desde el primer día.


Modelo conceptual:

NX QUALITY
│
├── EMPRESA A
├── EMPRESA B
└── EMPRESA C


Los datos operacionales de una empresa deben permanecer aislados de
los datos de otras empresas.


Un usuario perteneciente a Empresa A:

NO PUEDE ACCEDER A INFORMACIÓN DE EMPRESA B.


Este aislamiento debe existir en la capa de datos y seguridad, no
solamente en la interfaz.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. SUPER ADMIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Existe un:

SUPER ADMIN DE NX QUALITY


El Super Admin pertenece al ámbito de administración de la plataforma
y NO al ámbito operacional de una empresa cliente.


Existe además:

ADMINISTRADOR DE EMPRESA


El Administrador de Empresa pertenece a una empresa específica.


El acceso del Super Admin a información operacional de una empresa debe:

- estar autorizado;
- estar controlado;
- quedar auditado.


Los permisos detallados del Super Admin quedan fuera de esta etapa
cuando no sean necesarios para construir FOUNDATION.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. ROLES BASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOUNDATION debe soportar como mínimo la existencia de:

SUPER ADMIN

ADMINISTRADOR DE EMPRESA

INSPECTOR


Los roles posteriores podrán ampliarse sin alterar el principio de
aislamiento por empresa.


FOUNDATION no define todavía todos los permisos funcionales de cada
rol.


Los permisos específicos de cada módulo serán definidos por las
etapas correspondientes.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. SEGURIDAD DE DATOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El acceso a información operacional debe estar restringido por:

EMPRESA
+
USUARIO
+
ROL


La base de datos debe utilizar:

ROW LEVEL SECURITY (RLS)


para proteger el aislamiento entre empresas.


La aplicación NO debe depender exclusivamente de validaciones de
interfaz para impedir acceso entre empresas.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. IDENTIDAD DE USUARIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir una relación inequívoca entre:

USUARIO AUTENTICADO
↓
EMPRESA
↓
ROL


El sistema debe poder determinar antes de entregar información:

- quién es el usuario;
- a qué empresa pertenece;
- qué rol posee;
- qué alcance de información puede consultar o modificar.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. FUENTE CENTRAL DE DATOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La información central de NX Quality reside en PostgreSQL mediante
Supabase.


Las futuras etapas utilizarán esta fuente común.


No se deben crear fuentes paralelas de verdad.


La operación offline podrá mantener información local temporal, pero
su propósito será permitir continuidad operacional y sincronización.


El detalle de esta operación pertenece a:

09 — OFFLINE.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. IDENTIFICADORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las entidades principales utilizarán identificadores únicos.


La definición previamente establecida contempla:

UUID


como identificador técnico.


FOUNDATION debe dejar disponible el mecanismo necesario para que las
entidades posteriores puedan utilizar identificadores únicos sin
colisiones.


No corresponde definir aquí las entidades de negocio de las etapas
posteriores.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. AUDITORÍA BASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality debe conservar trazabilidad sobre modificaciones
relevantes.


Como mínimo debe ser posible identificar:

- quién realizó una acción;
- cuándo;
- qué información fue modificada;
- valor anterior cuando corresponda;
- valor nuevo;
- motivo cuando corresponda.


FOUNDATION debe dejar preparada la capacidad base de auditoría.


Las reglas específicas de auditoría de lotes, inspecciones, decisiones
y transformaciones serán definidas en sus respectivas etapas.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. ELIMINACIÓN DE INFORMACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La plataforma no debe diseñarse suponiendo eliminación física
indiscriminada de información histórica.


La regla funcional del producto es:

LA HISTORIA NO SE PIERDE.


Cuando una etapa requiera corregir, anular o invalidar información,
deberá mantener trazabilidad según las reglas definidas en CURRENT.md.


FOUNDATION debe evitar una arquitectura que imposibilite este
principio.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. ALMACENAMIENTO DE EVIDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Supabase Storage será utilizado para almacenar archivos y evidencias
asociadas al sistema.


Las evidencias deben poder relacionarse posteriormente con el evento
que las originó.


FOUNDATION debe dejar disponible la capacidad base de almacenamiento.


NO corresponde en esta etapa definir:

- flujo completo de fotografías;
- compresión definitiva;
- asociación con mediciones;
- obligatoriedad de fotografías;
- visualización de evidencias.


Esas reglas pertenecen principalmente a INSPECTIONS y etapas
relacionadas.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. API / ACCESO DE DATOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema utilizará las capacidades de acceso de datos proporcionadas
por Supabase.


NO se construirá una API pública como parte del MVP sin una necesidad
funcional definida.


Las futuras necesidades de integración deberán evaluarse cuando exista
un caso de uso real.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. INTEGRACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOUNDATION no implementa integraciones externas.


Estado actual:

NINGUNA INTEGRACIÓN EXTERNA NECESARIA PARA EL MVP INICIAL.


La plataforma debe poder evolucionar posteriormente sin convertir una
integración futura en dependencia del núcleo actual.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. ESTRUCTURA BASE NECESARIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOUNDATION debe dejar disponible la estructura mínima para que las
siguientes etapas puedan crear sus componentes.


Debe existir soporte para:

- usuarios;
- empresas;
- roles;
- relación usuario-empresa;
- autenticación;
- autorización;
- auditoría base;
- almacenamiento.


No se deben adelantar las entidades funcionales de MASTER DATA o LOTS.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. FLUJO DE ACCESO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Flujo mínimo:

USUARIO
↓
AUTENTICACIÓN
↓
IDENTIDAD VALIDADA
↓
EMPRESA / ROL
↓
AUTORIZACIÓN
↓
ACCESO AL SISTEMA


Si la autenticación falla:

NO ACCESO.


Si el usuario no tiene empresa o alcance válido:

NO ACCESO OPERACIONAL.


Si el usuario intenta acceder a información de otra empresa:

ACCESO DENEGADO.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. FLUJO DE CREACIÓN DE USUARIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOUNDATION debe permitir establecer la relación:

USUARIO
↓
EMPRESA
↓
ROL


La creación de usuarios operacionales debe quedar bajo control del
mecanismo de administración correspondiente.


No se debe permitir que un usuario operacional se asigne libremente
a otra empresa.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. CASOS CRÍTICOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOUNDATION debe controlar como mínimo:

CASO 1

Usuario válido
→ acceso permitido según rol.


CASO 2

Usuario inválido
→ acceso rechazado.


CASO 3

Usuario de Empresa A intenta consultar Empresa B
→ acceso rechazado.


CASO 4

Usuario sin rol operacional válido
→ acceso rechazado.


CASO 5

Sesión inválida o expirada
→ acceso protegido.


CASO 6

Acción administrativa relevante
→ debe quedar disponible para auditoría.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
22. EXPERIENCIA MÍNIMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El usuario debe poder:

- iniciar sesión;
- acceder a su ámbito autorizado;
- identificar su empresa;
- operar según su rol;
- cerrar sesión.


La experiencia debe ser simple y funcional.


No se busca en FOUNDATION desarrollar la experiencia visual definitiva
del producto.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
23. FUERA DE ALCANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No construir en FOUNDATION:

- productores;
- campos;
- cuarteles;
- variedades;
- temporadas;
- lotes;
- inspecciones;
- muestras;
- mediciones;
- criterios de calidad;
- recomendaciones;
- decisiones;
- genealogía;
- transformaciones;
- reportes;
- dashboards;
- analítica;
- sincronización offline completa;
- integraciones externas.


Estas capacidades pertenecen a etapas posteriores.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
24. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOUNDATION cumple funcionalmente cuando:

[ ] Existe una instancia funcional de la plataforma central.

[ ] PostgreSQL está operativo como fuente central de datos.

[ ] Supabase está operativo como plataforma base.

[ ] La autenticación funciona.

[ ] Los usuarios pueden identificarse inequívocamente.

[ ] Los usuarios pueden asociarse a una empresa.

[ ] Los usuarios pueden tener un rol.

[ ] Existe aislamiento entre empresas.

[ ] RLS protege el acceso entre empresas.

[ ] Un usuario de una empresa no puede consultar información de otra.

[ ] Existe el rol Super Admin de plataforma.

[ ] Existe el rol Administrador de Empresa.

[ ] Existe el rol Inspector.

[ ] La relación usuario / empresa / rol puede ser determinada.

[ ] Existe capacidad base de auditoría.

[ ] Existe almacenamiento de archivos disponible.

[ ] La estructura permite comenzar MASTER DATA.

[ ] No se han adelantado funcionalidades de etapas posteriores.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
25. PRUEBAS MÍNIMAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — AUTENTICACIÓN

Crear usuario autorizado.

Resultado esperado:

Acceso correcto.


PRUEBA 2 — AUTENTICACIÓN INVÁLIDA

Intentar acceso con credenciales inválidas.

Resultado esperado:

Acceso rechazado.


PRUEBA 3 — AISLAMIENTO

Crear Empresa A y Empresa B.

Crear usuarios pertenecientes a cada empresa.

Resultado esperado:

Usuario A no puede acceder a información de Empresa B.


PRUEBA 4 — ROL

Asignar roles diferentes.

Resultado esperado:

El sistema reconoce el rol correspondiente.


PRUEBA 5 — EMPRESA

Cambiar o intentar manipular el contexto de empresa desde el cliente.

Resultado esperado:

No permite acceder a información no autorizada.


PRUEBA 6 — AUDITORÍA

Ejecutar una acción administrativa que deba ser auditada.

Resultado esperado:

La acción puede ser reconstruida mediante su registro.


PRUEBA 7 — STORAGE

Registrar un archivo de prueba.

Resultado esperado:

El archivo queda almacenado y disponible para posterior asociación.


PRUEBA 8 — SEGURIDAD DIRECTA

Intentar acceder a información protegida evitando la interfaz.

Resultado esperado:

La protección de datos permanece activa.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
26. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

01 — FOUNDATION puede cerrarse solamente cuando:

[ ] Plataforma central operativa.

[ ] PostgreSQL operativo.

[ ] Supabase operativo.

[ ] Autenticación funcionando.

[ ] Usuarios funcionando.

[ ] Empresas funcionando a nivel base.

[ ] Roles base funcionando.

[ ] Relación usuario / empresa / rol funcionando.

[ ] Multiempresa funcionando.

[ ] RLS probado.

[ ] Acceso entre empresas bloqueado.

[ ] Super Admin definido y operativo a nivel base.

[ ] Administrador de Empresa definido y operativo a nivel base.

[ ] Inspector definido y operativo a nivel base.

[ ] Auditoría base disponible.

[ ] Storage disponible.

[ ] Pruebas críticas aprobadas.

[ ] No existen fallos críticos de seguridad.

[ ] No existen pendientes propios de FOUNDATION.

[ ] BUILD_STATUS.md actualizado.

[ ] Etapa marcada como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
27. RESULTADO ESPERADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Al cerrar FOUNDATION debe existir una base real sobre la cual pueda
comenzar:

02 — MASTER DATA


MASTER DATA debe poder asumir que ya existen:

- usuarios;
- empresas;
- roles;
- autenticación;
- autorización;
- aislamiento multiempresa;
- fuente central;
- auditoría base.


FOUNDATION termina aquí.

No debe comenzar a construir MASTER DATA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
28. DESPLIEGUE WEB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La aplicación Web (`apps/web`) debe estar preparada técnicamente para ser desplegada en Cloudflare Pages.

No se debe asumir compatibilidad con funciones específicas de Vercel ni otros proveedores propietarios.

La configuración de compilación debe incluir el adaptador necesario (ej. OpenNext) para asegurar que las rutas y componentes funcionen en el Edge de Cloudflare.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 01_FOUNDATION.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━