# 09_OFFLINE.md

# NX QUALITY — OFFLINE

Versión: 1.0
Etapa: 09 — OFFLINE
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La aplicación de terreno debe permitir trabajar con conectividad
limitada o completamente inexistente.

El inspector no debe depender de una conexión activa para realizar
su trabajo.

La información capturada offline debe permanecer disponible hasta que
pueda sincronizarse con la fuente central.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requiere:

01 — FOUNDATION
02 — MASTER DATA
03 — LOTS
04 — INSPECTIONS
06 — DECISIONS
07 — TRACEABILITY


La operación offline utilizará la arquitectura definida para
QualityNX:

- fuente central: Supabase / PostgreSQL;
- almacenamiento local: SQLite;
- sincronización: PowerSync.


Esta etapa implementa el comportamiento offline y sincronización.

No redefine la arquitectura.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La aplicación de terreno debe permitir:

- consultar información previamente sincronizada;
- crear inspecciones;
- registrar mediciones;
- registrar observaciones;
- capturar fotografías;
- registrar decisiones permitidas;
- completar eventos;
- continuar trabajando sin conexión.


Debe existir además:

- almacenamiento local;
- cola de operaciones pendientes;
- identificación de registros locales;
- estado de sincronización;
- sincronización automática;
- detección de errores;
- tratamiento explícito de conflictos.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REGLAS OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. La falta de conexión no debe impedir la captura de información
   operacional permitida.

2. La información creada offline debe almacenarse localmente.

3. Una operación offline debe conservar su identidad al sincronizar.

4. Una operación sincronizada no debe convertirse en una segunda
   operación por efecto de reintentos.

5. Las fotografías capturadas offline deben conservarse hasta completar
   su sincronización.

6. Las mediciones deben conservarse hasta completar su sincronización.

7. Las observaciones deben conservarse hasta completar su
   sincronización.

8. Las decisiones permitidas offline deben conservarse hasta completar
   su sincronización.

9. La sincronización debe ejecutarse automáticamente al recuperar
   conectividad.

10. Un error de sincronización no debe provocar pérdida de información.

11. Una operación fallida debe permanecer identificada como pendiente
    o con error.

12. El sistema debe volver a intentar sincronizar cuando corresponda.

13. Los conflictos no deben resolverse mediante pérdida silenciosa de
    información.

14. La operación offline no constituye una segunda fuente maestra.

15. La fuente central continúa siendo la fuente de verdad una vez
    sincronizada la información.

16. El usuario debe poder conocer el estado de sus operaciones
    pendientes.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. ESTADOS DE SINCRONIZACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Toda operación pendiente debe poder distinguir al menos:

PENDIENTE DE SINCRONIZACIÓN

SINCRONIZANDO

SINCRONIZADO

ERROR DE SINCRONIZACIÓN


PENDIENTE DE SINCRONIZACIÓN:

La operación existe localmente y todavía no ha sido confirmada por la
fuente central.


SINCRONIZANDO:

La operación está siendo enviada/procesada.


SINCRONIZADO:

La operación fue aceptada por la fuente central.


ERROR DE SINCRONIZACIÓN:

La operación no pudo sincronizarse y requiere reintento o resolución.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. FLUJO OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SIN CONEXIÓN
↓
Usuario realiza operación
↓
Guardar localmente
↓
Asignar identidad de operación
↓
PENDIENTE DE SINCRONIZACIÓN
↓
Usuario continúa trabajando


RECUPERACIÓN DE CONEXIÓN
↓
Detectar conectividad
↓
Iniciar sincronización automática
↓
Enviar operaciones pendientes
↓
¿Aceptada?
├── SÍ → SINCRONIZADO
└── NO
      ↓
    ERROR DE SINCRONIZACIÓN
      ↓
    Mantener información
      ↓
    Reintentar / resolver


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. INFORMACIÓN DISPONIBLE OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El usuario podrá trabajar offline solamente con información que haya
sido previamente sincronizada o que pueda ser creada legítimamente
offline.


Debe poder utilizar offline la información necesaria para:

- identificar lotes disponibles;
- consultar datos maestros necesarios;
- realizar inspecciones;
- registrar mediciones;
- registrar observaciones;
- capturar fotografías;
- registrar decisiones permitidas.


La aplicación no debe aparentar disponer de información que nunca fue
sincronizada al dispositivo.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. CREACIÓN OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una operación creada offline debe:

1. recibir identidad local;
2. guardarse localmente;
3. quedar disponible inmediatamente para el usuario;
4. entrar en estado PENDIENTE DE SINCRONIZACIÓN;
5. sincronizarse posteriormente.


El usuario no debe tener que volver a ingresar manualmente la
información cuando aparezca conexión.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. FOTOGRAFÍAS OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las fotografías capturadas sin conexión deben:

- almacenarse localmente;
- conservar relación con su inspección/evento;
- mantener su identidad;
- permanecer disponibles mientras esperan sincronización;
- sincronizarse automáticamente cuando exista conectividad.


Una fotografía no debe quedar sincronizada sin contexto.


Si la sincronización de la fotografía falla:

NO eliminar automáticamente el archivo local.


Debe quedar identificada como pendiente/error.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. REINTENTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si una operación falla durante sincronización:

NO debe perderse.

Debe permanecer localmente.


El sistema debe permitir reintentos automáticos.


Los reintentos no deben generar:

- inspecciones duplicadas;
- fotografías duplicadas;
- eventos duplicados;
- decisiones duplicadas.


Una misma operación enviada varias veces debe conservar una única
identidad lógica.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. DUPLICADOS POR SINCRONIZACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe distinguir entre:

DUPLICADO TÉCNICO

y

NUEVA OPERACIÓN REAL.


Un reintento de sincronización de una misma operación no debe crear un
segundo hecho técnico/comercial.


Sin embargo, dos inspecciones reales sobre el mismo lote pueden ser
válidas.


Por lo tanto:

NO bloquear automáticamente una nueva inspección solamente porque
existe otra inspección similar.


La detección de posibles duplicados pertenece a la lógica de negocio
correspondiente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. CONFLICTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Puede ocurrir:

USUARIO A
↓
trabaja offline sobre un lote


Mientras tanto:

USUARIO B
↓
modifica el mismo lote online


Posteriormente:

USUARIO A
↓
recupera conexión
↓
sincroniza


El sistema debe:

1. detectar el conflicto;
2. evitar pérdida silenciosa de información;
3. conservar trazabilidad;
4. aplicar la resolución definida por la regla correspondiente.


La estrategia funcional definitiva para resolver conflictos complejos
no debe inventarse dentro de esta etapa.


Lo obligatorio para cerrar OFFLINE es:

CONFLICTO DETECTADO
+
INFORMACIÓN CONSERVADA
+
TRAZABILIDAD
+
SIN PÉRDIDA SILENCIOSA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. IDENTIDAD DE LAS OPERACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cada operación creada offline debe poder identificarse
inequívocamente.


La identidad debe mantenerse:

LOCAL
↓
SINCRONIZACIÓN
↓
FUENTE CENTRAL


Esto es necesario para evitar duplicación cuando:

- se pierde conexión;
- se reintenta;
- se cierra y abre la aplicación;
- existe conectividad intermitente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. CIERRE DE APLICACIÓN / DISPOSITIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si el usuario cierra la aplicación mientras existen operaciones
pendientes:

NO deben perderse.


Al volver a abrir la aplicación:

- las operaciones deben continuar disponibles;
- deben conservar su estado;
- deben poder sincronizarse posteriormente.


Un reinicio del dispositivo tampoco debe destruir operaciones
pendientes.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. CAMBIO DE CONECTIVIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La aplicación debe tolerar:

ONLINE
↓
OFFLINE
↓
ONLINE
↓
OFFLINE
↓
ONLINE


sin requerir que el usuario reconstruya su trabajo.


Cada transición de conectividad debe mantener la integridad de la
cola de operaciones.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. VISIBILIDAD PARA EL USUARIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El usuario debe poder identificar claramente:

- si está ONLINE;
- si está OFFLINE;
- si existen operaciones pendientes;
- si existe una sincronización en curso;
- si ocurrió un error de sincronización.


La información debe ser comprensible para un inspector.


No debe requerirse conocimiento técnico para interpretar el estado.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. FUENTE DE VERDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La información local es una representación operacional temporal.


No constituye una segunda base maestra.


Flujo:

CAPTURA LOCAL
↓
SINCRONIZACIÓN
↓
FUENTE CENTRAL
↓
HISTORIA ACTUALIZADA


La información central debe conservar la identidad de la operación
original.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. SEGURIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La información local debe permanecer asociada al usuario/dispositivo
autorizado.


El usuario no debe poder utilizar el modo offline para acceder a
información de otra empresa.


Las operaciones creadas offline deben conservar el contexto de empresa
y usuario.


La sincronización debe validar nuevamente autorización y pertenencia
antes de incorporar información a la fuente central.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. FUERA DE ALCANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No construir en esta etapa:

- nueva arquitectura de backend;
- nueva base de datos maestra;
- sincronización entre empresas;
- API pública;
- analítica offline;
- dashboards offline;
- resolución manual compleja de conflictos;
- funcionalidades que no requieran operación offline.


El objetivo es garantizar continuidad operacional y sincronización
confiable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] La aplicación permite trabajar sin conexión.

[ ] Se puede consultar información previamente sincronizada.

[ ] Se puede crear una inspección offline.

[ ] Se pueden registrar mediciones offline.

[ ] Se pueden registrar observaciones offline.

[ ] Se pueden capturar fotografías offline.

[ ] Se pueden registrar decisiones permitidas offline.

[ ] La información queda almacenada localmente.

[ ] Las operaciones quedan identificadas como pendientes.

[ ] La sincronización comienza automáticamente al recuperar conexión.

[ ] Las operaciones sincronizadas conservan su identidad.

[ ] No se crean duplicados por reintentos.

[ ] Las fotografías conservan su contexto.

[ ] Un error de sincronización no elimina información.

[ ] Las operaciones con error pueden volver a intentarse.

[ ] El usuario puede conocer el estado de sincronización.

[ ] Un cierre/reinicio de aplicación no pierde operaciones pendientes.

[ ] Un cambio repetido de conectividad no pierde información.

[ ] Los conflictos son detectables.

[ ] Los conflictos no producen pérdida silenciosa de información.

[ ] La sincronización respeta empresa y permisos.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — INSPECCIÓN OFFLINE

Desactivar conectividad.

Crear inspección completa.

→ Debe poder finalizarse sin conexión.


PRUEBA 2 — MEDICIONES OFFLINE

Registrar múltiples mediciones sin conexión.

→ Todas deben permanecer disponibles.


PRUEBA 3 — FOTOGRAFÍAS OFFLINE

Capturar múltiples fotografías.

→ Todas deben conservarse relacionadas con la inspección.


PRUEBA 4 — SINCRONIZACIÓN

Recuperar conexión.

→ Las operaciones pendientes deben sincronizarse automáticamente.


PRUEBA 5 — REINTENTO

Interrumpir la conectividad durante una sincronización.

→ No debe perderse información.


PRUEBA 6 — DUPLICACIÓN

Forzar reintento de una misma operación.

→ No debe crearse una segunda operación equivalente.


PRUEBA 7 — REINICIO

Cerrar/reiniciar la aplicación con operaciones pendientes.

→ Las operaciones deben permanecer disponibles.


PRUEBA 8 — ESTADOS

Ejecutar una operación pendiente.

→ Debe poder observarse:

PENDIENTE
→ SINCRONIZANDO
→ SINCRONIZADO


PRUEBA 9 — ERROR

Forzar fallo de sincronización.

→ Debe mostrarse ERROR DE SINCRONIZACIÓN y conservarse la información.


PRUEBA 10 — CONFLICTO

Modificar un mismo registro desde dos contextos antes de sincronizar.

→ El sistema debe detectar el conflicto y conservar trazabilidad sin
pérdida silenciosa.


PRUEBA 11 — CONECTIVIDAD INTERMITENTE

Alternar repetidamente entre online/offline durante una operación.

→ No debe perderse ni duplicarse información.


PRUEBA 12 — AISLAMIENTO

Intentar sincronizar información asociada a otra empresa.

→ Debe rechazarse.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
22. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

09 — OFFLINE está COMPLETADA cuando:

[ ] LOTS está COMPLETADA.

[ ] INSPECTIONS está COMPLETADA.

[ ] DECISIONS está COMPLETADA.

[ ] Existe almacenamiento local operativo.

[ ] Las operaciones permitidas funcionan sin conexión.

[ ] Las fotografías funcionan offline.

[ ] Existe cola de operaciones pendientes.

[ ] Existe identidad de operación.

[ ] Funciona la sincronización automática.

[ ] Funcionan los estados de sincronización.

[ ] Los errores no provocan pérdida de información.

[ ] Los reintentos no generan duplicados técnicos.

[ ] Las operaciones sobreviven al cierre/reinicio de la aplicación.

[ ] Se detectan conflictos.

[ ] Los conflictos no producen pérdida silenciosa de información.

[ ] La información conserva su contexto al sincronizar.

[ ] Se verifica aislamiento por empresa.

[ ] Todas las pruebas de aceptación están aprobadas.

[ ] No existen errores críticos pendientes.

[ ] No se han construido funcionalidades pertenecientes a
    OPERATIONAL VIEW o ANALYTICS.

[ ] BUILD_STATUS.md fue actualizado.

[ ] 09 — OFFLINE queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 09_OFFLINE.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━