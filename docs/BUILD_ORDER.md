# NX QUALITY — BUILD ORDER

Versión: 2.0
Estado: ACTIVO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PROPÓSITO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este documento define el orden oficial de construcción de NX Quality.

No define el funcionamiento completo del sistema.

La fuente funcional completa es:

CURRENT.md

Cada etapa posee su propio documento:

01_FOUNDATION.md
02_MASTER_DATA.md
03_LOTS.md
04_INSPECTIONS.md
05_QUALITY_ENGINE.md
06_DECISIONS.md
07_TRACEABILITY.md
08_TRANSFORMATIONS.md
09_OFFLINE.md
10_OPERATIONAL_VIEW.md
11_ANALYTICS.md

BUILD_STATUS.md registra el estado real de construcción.

IA_PROTOCOL.md define cómo debe trabajar la IA.

AGENTS.md define las reglas permanentes del agente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. REGLA PRINCIPAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality se construye por etapas.

Solo una etapa puede estar EN DESARROLLO.

Una etapa posterior no puede comenzar hasta que la etapa activa:

- esté construida;
- haya sido verificada;
- cumpla su Definition of Done;
- esté registrada como COMPLETADA en BUILD_STATUS.md.

No se avanza por intención.

No se adelantan etapas por conveniencia técnica.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. ORDEN OFICIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

01 — FOUNDATION

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

Este es el orden oficial de construcción.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

01 — FOUNDATION

Dependencias:
NINGUNA


02 — MASTER DATA

Depende de:
01 — FOUNDATION


03 — LOTS

Depende de:
01 — FOUNDATION
02 — MASTER DATA


04 — INSPECTIONS

Depende de:
01 — FOUNDATION
02 — MASTER DATA
03 — LOTS


05 — QUALITY ENGINE

Depende de:
04 — INSPECTIONS


06 — DECISIONS

Depende de:
05 — QUALITY ENGINE


07 — TRACEABILITY

Depende de:
03 — LOTS
04 — INSPECTIONS
05 — QUALITY ENGINE
06 — DECISIONS


08 — TRANSFORMATIONS

Depende de:
03 — LOTS
07 — TRACEABILITY


09 — OFFLINE

Dependencias funcionales:
01 — FOUNDATION
02 — MASTER DATA
03 — LOTS
04 — INSPECTIONS

La implementación de OFFLINE se realiza sobre los flujos
operacionales que requieren continuidad sin conectividad.

Su posición en el orden oficial no implica dependencia funcional
de 08 — TRANSFORMATIONS.


10 — OPERATIONAL VIEW

Depende de:
01 — FOUNDATION
02 — MASTER DATA
03 — LOTS
04 — INSPECTIONS
05 — QUALITY ENGINE
06 — DECISIONS
07 — TRACEABILITY
08 — TRANSFORMATIONS
09 — OFFLINE


11 — ANALYTICS

Depende de:
05 — QUALITY ENGINE
06 — DECISIONS
07 — TRACEABILITY
08 — TRANSFORMATIONS
10 — OPERATIONAL VIEW

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. DEPENDENCIAS Y ORDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El orden oficial establece cuándo se construye cada etapa.

Las dependencias establecen qué debe existir para que la etapa pueda
construirse correctamente.

Si una dependencia funcional exige revisar el orden:

NO modificarlo silenciosamente.

Debe evaluarse el cambio antes de alterar BUILD_ORDER.md.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. TRABAJO TRANSVERSAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Puede ser necesario construir una capacidad técnica durante una etapa
para que otra etapa pueda utilizarla posteriormente.

Eso no autoriza a construir anticipadamente la funcionalidad completa
de una etapa futura.

Solo debe implementarse lo estrictamente necesario para cumplir la
etapa activa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. BLOQUEOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si una dependencia necesaria no existe:

1. identificarla;
2. determinar su origen;
3. resolverla dentro de la etapa correspondiente;
4. verificarla;
5. continuar.

No comenzar otra etapa para evitar un bloqueo.

Los bloqueos reales se registran en BUILD_STATUS.md.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. CAMBIO DEL ORDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El orden establecido es la planificación oficial.

Si durante el desarrollo aparece una razón válida para modificarlo:

1. detener el cambio de orden;
2. explicar la razón;
3. indicar el impacto;
4. identificar las dependencias afectadas;
5. solicitar o registrar la decisión correspondiente;
6. actualizar BUILD_ORDER.md solamente después de resolverla.

No utilizar un archivo de decisiones inexistente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. CRITERIO DE AVANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para avanzar desde una etapa hacia la siguiente deben cumplirse:

[ ] Alcance de la etapa completado.
[ ] Reglas de la etapa implementadas.
[ ] Flujos principales verificados.
[ ] Casos límite relevantes verificados.
[ ] Pruebas ejecutadas.
[ ] Pruebas aprobadas.
[ ] Definition of Done cumplida.
[ ] No existen bloqueos propios.
[ ] BUILD_STATUS.md actualizado.

Solo entonces puede comenzar formalmente la siguiente etapa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. ESTADO DE LAS ETAPAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUILD_ORDER.md NO registra el estado real de una etapa.

El estado real se encuentra exclusivamente en:

BUILD_STATUS.md

BUILD_ORDER.md responde:

"¿EN QUÉ ORDEN SE CONSTRUYE?"

BUILD_STATUS.md responde:

"¿DÓNDE ESTAMOS?"

El documento de cada etapa responde:

"¿QUÉ DEBE CONSTRUIRSE Y CERRARSE EN ESTA ETAPA?"

CURRENT.md responde:

"¿QUÉ ES NX QUALITY?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. REGLA FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UNA ETAPA A LA VEZ.

SE CONSTRUYE SEGÚN BUILD_ORDER.

SE TRABAJA SEGÚN BUILD_STATUS.

SE DEFINE SEGÚN CURRENT.

SE EJECUTA SEGÚN EL DOCUMENTO DE LA ETAPA.

SE VERIFICA ANTES DE AVANZAR.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — BUILD_ORDER.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━