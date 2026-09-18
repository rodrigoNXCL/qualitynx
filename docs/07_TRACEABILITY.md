# 07_TRACEABILITY.md

# NX QUALITY — TRACEABILITY

Versión: 1.0
Etapa: 07 — TRACEABILITY
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRACEABILITY construye la capacidad de reconstruir la historia
operacional y técnica de las entidades relevantes del sistema.

Debe permitir responder:

- qué ocurrió;
- cuándo ocurrió;
- quién lo realizó;
- sobre qué entidad;
- qué cambió;
- cuál era el estado anterior;
- cuál es el estado posterior;
- qué operación originó el cambio.


TRACEABILITY NO define los procesos que generan los eventos.

Los procesos de LOTS, INSPECTIONS y DECISIONS generan operaciones.

TRACEABILITY conserva y permite consultar su historial.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requiere:

01 — FOUNDATION
02 — MASTER DATA
03 — LOTS
04 — INSPECTIONS
05 — QUALITY ENGINE
06 — DECISIONS


Debe existir:

- identidad de usuario;
- identidad de empresa;
- entidades operacionales;
- operaciones que puedan generar eventos;
- estados definidos;
- fecha/hora confiable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir un registro histórico de eventos relevantes.

Cada evento debe permitir identificar como mínimo:

- entidad afectada;
- tipo de operación;
- usuario;
- empresa;
- fecha/hora;
- estado anterior cuando corresponda;
- estado posterior cuando corresponda;
- referencia de origen;
- información necesaria para reconstruir el cambio.


El historial debe poder consultarse posteriormente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REGLAS DE TRAZABILIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Las operaciones relevantes deben generar trazabilidad.

2. Un evento debe identificar inequívocamente la entidad afectada.

3. Debe identificarse el usuario responsable de la operación.

4. Debe registrarse fecha y hora.

5. Los cambios de estado deben quedar registrados.

6. Las modificaciones relevantes deben quedar registradas.

7. Las decisiones deben quedar vinculadas a su historial.

8. Las inspecciones relevantes deben poder reconstruirse
   históricamente.

9. La trazabilidad no debe depender únicamente del estado actual.

10. El historial debe permitir reconstruir una secuencia temporal.

11. Un registro histórico no debe eliminarse para ocultar una
    operación anterior.

12. Una corrección debe generar trazabilidad de la corrección.

13. La información histórica debe conservar el contexto necesario
    para interpretar el evento.

14. Los eventos de una empresa no deben quedar visibles para otra
    empresa.

15. La trazabilidad debe ser consistente con los permisos del usuario.

16. No registrar información que no sea necesaria para reconstruir
    la operación.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. EVENTOS MÍNIMOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La etapa debe contemplar trazabilidad para, como mínimo:

LOTS

- creación;
- modificación relevante;
- cambio de estado;
- cierre.


INSPECTIONS

- creación;
- modificación relevante;
- cambio de estado;
- completitud/cierre.


QUALITY ENGINE

- evaluación;
- criterio utilizado;
- resultado generado.


DECISIONS

- creación;
- modificación permitida;
- anulación;
- nueva decisión relacionada.


MASTER DATA

Solo cuando una modificación pueda afectar la interpretación
operacional o histórica del sistema.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. MODELO NECESARIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EVENTO DE TRAZABILIDAD

Debe contener conceptualmente:

- identificador;
- empresa;
- entidad;
- identificador de entidad;
- tipo de evento;
- usuario;
- fecha/hora;
- operación;
- estado anterior cuando corresponda;
- estado posterior cuando corresponda;
- referencia de operación;
- información contextual necesaria.


El modelo debe permitir múltiples eventos para una misma entidad.


Ejemplo conceptual:

LOTE
↓
CREACIÓN
↓
INSPECCIÓN
↓
MEDICIÓN
↓
EVALUACIÓN
↓
DECISIÓN
↓
CAMBIO DE ESTADO


No construir en esta etapa el modelo de genealogía de
TRANSFORMATIONS.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. FLUJO DE REGISTRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPERACIÓN DEL SISTEMA
↓
Identificar entidad afectada
↓
Validar usuario y contexto
↓
Ejecutar operación
↓
Determinar evento trazable
↓
Registrar evento
↓
Conservar contexto necesario
↓
Operación finalizada


Si la operación no se completa correctamente:

NO debe registrarse como operación exitosa.


Si existe una operación parcial que requiera registro según las reglas
del sistema:

Debe quedar claramente identificada como tal.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. CAMBIOS DE ESTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Todo cambio de estado relevante debe permitir reconstruir:

ESTADO ANTERIOR
↓
OPERACIÓN
↓
USUARIO
↓
FECHA/HORA
↓
ESTADO NUEVO


Ejemplo:

EN CURSO
↓
Completar inspección
↓
Usuario X
↓
10:32
↓
COMPLETADA


El estado actual NO reemplaza el historial anterior.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. MODIFICACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando una entidad pueda modificarse después de su creación:

Debe ser posible determinar:

- qué información cambió;
- quién la cambió;
- cuándo;
- cuál era el valor anterior cuando corresponda;
- cuál es el nuevo valor.


No se debe sobrescribir silenciosamente información histórica relevante.


Las modificaciones irrelevantes para la trazabilidad operacional no
deben generar ruido innecesario.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. ANULACIONES Y CORRECCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando una operación deba corregirse:

NO eliminar silenciosamente el evento original.


Debe existir:

EVENTO ORIGINAL
↓
CORRECCIÓN / ANULACIÓN
↓
NUEVO EVENTO


Debe ser posible identificar la relación entre ambos.


Una corrección no debe destruir la posibilidad de reconstruir lo que
ocurrió originalmente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. CONSULTA DEL HISTORIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Un usuario autorizado debe poder consultar el historial de una
entidad.


La consulta debe permitir:

- ordenar cronológicamente;
- identificar tipo de evento;
- identificar usuario;
- identificar fecha/hora;
- identificar cambio;
- acceder al contexto asociado cuando corresponda.


La consulta debe mostrar la historia sin alterar los registros.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. HISTORIA TÉCNICA DEL LOTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El lote debe poder actuar como punto de consulta de su historia.


La historia debe permitir reconstruir, cuando corresponda:

LOTE
↓
INSPECCIONES
↓
RESULTADOS
↓
DECISIONES
↓
CAMBIOS OPERACIONALES


TRACEABILITY proporciona la historia.


No debe crear nuevamente las funcionalidades de LOTS,
INSPECTIONS o DECISIONS.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. INTEGRIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe impedir:

- eventos sin entidad;
- eventos sin usuario cuando el usuario sea obligatorio;
- eventos de otra empresa;
- cambios históricos sin trazabilidad;
- eliminación silenciosa de eventos;
- referencias imposibles de reconstruir.


Si un evento no puede asociarse inequívocamente a una operación:

Debe rechazarse o quedar identificado como evento inválido según la
regla correspondiente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. SEGURIDAD Y VISIBILIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La trazabilidad debe respetar el aislamiento entre empresas.


Un usuario solo puede consultar información histórica dentro de su
ámbito autorizado.


La capacidad de consultar historial no implica capacidad de modificar
el historial.


Los permisos de administración no deben permitir eliminar
silenciosamente registros históricos.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. FUERA DE ALCANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No construir en esta etapa:

- genealogía completa de fruta;
- transformaciones;
- trazabilidad entre lotes;
- consumo de lotes;
- producción derivada;
- auditoría regulatoria avanzada;
- dashboards;
- analítica;
- recomendaciones;
- sincronización offline;
- almacenamiento especializado de evidencias.


Estas capacidades pertenecen a otras etapas.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Una operación relevante genera su evento de trazabilidad.

[ ] El evento identifica la entidad afectada.

[ ] El evento identifica al usuario.

[ ] El evento registra fecha/hora.

[ ] Los cambios de estado quedan registrados.

[ ] Las modificaciones relevantes quedan registradas.

[ ] El estado anterior puede identificarse cuando corresponde.

[ ] El estado nuevo puede identificarse cuando corresponde.

[ ] Las correcciones quedan relacionadas con el evento original.

[ ] Las anulaciones no eliminan silenciosamente el historial.

[ ] Puede consultarse el historial de una entidad.

[ ] El historial puede ordenarse cronológicamente.

[ ] El historial respeta el aislamiento entre empresas.

[ ] Un usuario sin permiso no puede consultar información no autorizada.

[ ] Un usuario no puede modificar directamente el historial.

[ ] El historial permite reconstruir la secuencia operacional.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — CREACIÓN

Crear un lote.

→ Debe existir evento de creación.


PRUEBA 2 — MODIFICACIÓN

Modificar información relevante de un lote.

→ Debe registrarse la modificación.


PRUEBA 3 — ESTADO

Cambiar estado de lote.

→ Deben registrarse estado anterior y nuevo.


PRUEBA 4 — INSPECCIÓN

Crear y completar una inspección.

→ Deben existir los eventos correspondientes.


PRUEBA 5 — DECISIÓN

Registrar una decisión.

→ Debe quedar asociada al historial.


PRUEBA 6 — CORRECCIÓN

Corregir una operación permitida.

→ El evento original debe permanecer y la corrección debe quedar
relacionada.


PRUEBA 7 — ANULACIÓN

Anular una operación.

→ Debe conservarse el historial original.


PRUEBA 8 — CONSULTA

Consultar la historia de un lote.

→ Debe mostrarse la secuencia cronológica.


PRUEBA 9 — AISLAMIENTO

Usuario de empresa A intenta consultar historial de empresa B.

→ Operación rechazada.


PRUEBA 10 — ALTERACIÓN

Intentar modificar directamente un evento histórico.

→ Operación rechazada.


PRUEBA 11 — OPERACIÓN FALLIDA

Ejecutar una operación que falle antes de completarse.

→ No debe quedar registrada como operación exitosa.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

07 — TRACEABILITY está COMPLETADA cuando:

[ ] FOUNDATION está COMPLETADA.

[ ] MASTER DATA está COMPLETADA.

[ ] LOTS está COMPLETADA.

[ ] INSPECTIONS está COMPLETADA.

[ ] QUALITY ENGINE está COMPLETADA.

[ ] DECISIONS está COMPLETADA.

[ ] Existe el registro de eventos de trazabilidad.

[ ] Las operaciones relevantes generan eventos.

[ ] Los eventos identifican entidad, usuario y fecha/hora.

[ ] Los cambios de estado quedan registrados.

[ ] Las modificaciones relevantes quedan registradas.

[ ] Las correcciones y anulaciones son trazables.

[ ] El historial puede consultarse.

[ ] La historia puede reconstruirse cronológicamente.

[ ] El aislamiento entre empresas está verificado.

[ ] Los registros históricos no pueden modificarse silenciosamente.

[ ] Todas las pruebas de aceptación están aprobadas.

[ ] No existen errores críticos pendientes.

[ ] No se han construido funcionalidades pertenecientes a
    TRANSFORMATIONS, OFFLINE, OPERATIONAL VIEW o ANALYTICS.

[ ] BUILD_STATUS.md fue actualizado.

[ ] 07 — TRACEABILITY queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 07_TRACEABILITY.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━