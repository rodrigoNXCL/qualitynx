# 00_CONTEXT.md

# NX QUALITY — BUILD CONTEXT

Versión: 1.0
Estado: ACTIVO
Proyecto: NX Quality


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PROPÓSITO DE ESTE DOCUMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este documento entrega el contexto mínimo necesario para participar en
la construcción de NX Quality.

NO es la especificación funcional completa.

La fuente principal de verdad funcional del proyecto es:

CURRENT.md


Los documentos numerados:

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

definen qué debe construirse en cada etapa.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. QUÉ ES NX QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality es un sistema de gestión y conocimiento de calidad
orientado a operaciones frutícolas.

Su propósito no es solamente registrar inspecciones.

El sistema debe convertir información operacional de calidad en
información útil para:

- comprender el estado de la fruta;
- detectar problemas;
- respaldar decisiones;
- conservar la Historia Técnica;
- mantener trazabilidad;
- permitir análisis posteriores.


PRINCIPIO:

LA INFORMACIÓN DE CALIDAD DEBE SERVIR PARA TOMAR DECISIONES
OPERACIONALES Y COMERCIALES.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PROBLEMA QUE RESUELVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las operaciones de calidad pueden generar gran cantidad de
información que posteriormente queda:

- dispersa;
- difícil de consultar;
- poco conectada entre sí;
- dependiente de personas;
- limitada a registros aislados;
- sin suficiente continuidad histórica.


NX Quality busca transformar esos registros en una Historia Técnica
estructurada y utilizable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. PRINCIPIO FUNCIONAL CENTRAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe poder responder, respecto de una unidad trazable:

QUÉ ES

DE DÓNDE VIENE

QUÉ LE HA OCURRIDO

QUÉ SE OBSERVÓ

QUÉ SE DECIDIÓ

QUÉ ACCIÓN SE TOMÓ

EN QUÉ ESTADO ESTÁ

QUÉ RELACIÓN TIENE CON OTRAS UNIDADES

QUÉ SE PUEDE APRENDER DE SU HISTORIA


La unidad trazable fundamental del sistema es el LOTE.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. HISTORIA TÉCNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La Historia Técnica representa el conocimiento acumulado sobre un
lote a través del tiempo.

No corresponde a un único formulario ni a una única inspección.

Se construye progresivamente mediante los eventos registrados por
el sistema.


PRINCIPIO:

EL SISTEMA DEBE CONSERVAR LA HISTORIA.

UN NUEVO EVENTO NO DEBE DESTRUIR LOS EVENTOS ANTERIORES.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. ALCANCE DEL PRODUCTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality contempla, como mínimo, los siguientes ámbitos:

- configuración base;
- datos maestros;
- lotes;
- inspecciones;
- motor de calidad;
- decisiones;
- trazabilidad;
- transformaciones;
- operación offline;
- vista operacional;
- analítica.


Cada ámbito será construido en una etapa independiente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. ORDEN DE CONSTRUCCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La construcción debe respetar:

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


El orden definido en BUILD_ORDER.md es obligatorio salvo modificación
explícita de la planificación.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. REGLA DE TRABAJO POR ETAPAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cada etapa debe construirse, verificarse y cerrarse antes de avanzar
a la siguiente.

El estado de construcción se controla mediante:

BUILD_STATUS.md


Una etapa no debe considerarse terminada solamente porque sus
funcionalidades principales fueron desarrolladas.


Debe cumplir su:

DEFINITION OF DONE


y superar las pruebas correspondientes.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. FUENTE DE VERDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Existe una jerarquía documental explícita.


CURRENT.md

FUENTE COMPLETA DE VERDAD FUNCIONAL.


BUILD_ORDER.md

DEFINE EL ORDEN DE CONSTRUCCIÓN.


BUILD_STATUS.md

DEFINE EL ESTADO ACTUAL DE CONSTRUCCIÓN.


DECISIONS.md

REGISTRA LAS DECISIONES TOMADAS DURANTE EL PROYECTO Y SU RAZÓN.


01–11

DEFINEN EL TRABAJO ESPECÍFICO DE CADA ETAPA.


Si un documento de etapa necesita conocer una regla que no reproduce,
debe consultar CURRENT.md.


No debe inventarse una regla para completar un vacío.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. REGLA DE NO DUPLICACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los documentos de etapa NO deben repetir innecesariamente información
contenida en CURRENT.md.

Una etapa debe contener solamente la información necesaria para:

- comprender su contexto inmediato;
- conocer sus dependencias;
- construir lo requerido;
- aplicar sus reglas específicas;
- ejecutar sus flujos;
- verificar el resultado;
- ejecutar sus pruebas;
- cumplir su Definition of Done.


El detalle completo permanece en CURRENT.md.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. REGLA DE NO ADELANTAMIENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Durante una etapa no se debe construir funcionalidad perteneciente a
etapas posteriores salvo que sea estrictamente necesaria como
dependencia.


Ejemplo:

Durante LOTS no se debe desarrollar el motor completo de calidad.

Durante INSPECTIONS no se debe desarrollar la analítica.

Durante FOUNDATION no se debe desarrollar el flujo completo de
inspecciones.


La existencia conceptual de una funcionalidad futura no significa que
deba construirse inmediatamente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. REGLA DE CAMBIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si durante la construcción aparece una decisión que modifica una
definición existente:

NO modificar silenciosamente la especificación.


Debe registrarse en:

DECISIONS.md


indicando:

- decisión anterior;
- nueva decisión;
- razón;
- impacto.


Cuando corresponda, CURRENT.md deberá actualizarse para reflejar la
nueva verdad funcional.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. REGLA DE INTEGRIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe priorizar:

1. utilidad;
2. simplicidad;
3. trazabilidad;
4. confiabilidad;
5. mantenibilidad.


No deben incorporarse funcionalidades, tecnologías o complejidad
solamente porque sean posibles.


Toda construcción debe responder a una necesidad definida del producto.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. REGLA DE NO SUPOSICIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando una definición no exista:

NO INVENTAR.


Debe determinarse si:

- está definida en CURRENT.md;
- está definida en otro documento vigente;
- existe una decisión registrada;
- requiere una nueva decisión.


Una hipótesis técnica no puede convertirse silenciosamente en una
regla funcional.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. REGLA DE SEPARACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Durante la construcción deben mantenerse separados:

QUÉ DEBE HACER EL SISTEMA
→ CURRENT.md


QUÉ SE CONSTRUYE AHORA
→ Documento de etapa


EN QUÉ ESTADO ESTÁ LA CONSTRUCCIÓN
→ BUILD_STATUS.md


POR QUÉ SE TOMÓ UNA DECISIÓN
→ DECISIONS.md


Esta separación es obligatoria.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. CRITERIO PARA EL AGENTE CONSTRUCTOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de realizar cualquier trabajo debe determinar:

1. Qué etapa está activa en BUILD_STATUS.md.

2. Qué debe construirse según el documento de esa etapa.

3. Qué reglas del CURRENT.md aplican a ese trabajo.

4. Qué dependencias ya deben existir.

5. Qué pruebas debe superar.

6. Cuál es la Definition of Done de la etapa.


NO debe interpretar la existencia de documentos posteriores como
autorización para construirlos.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. REGLA DE FINALIZACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una etapa solamente puede pasar a COMPLETADA cuando:

- su alcance está construido;
- sus reglas están respetadas;
- sus casos principales funcionan;
- sus casos límite definidos están controlados;
- sus pruebas están aprobadas;
- su Definition of Done está cumplida;
- no existen pendientes propios de la etapa que impidan considerarla
  terminada.


Una vez cumplida la etapa:

BUILD_STATUS.md

debe actualizarse antes de comenzar la siguiente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. ESTADO ACTUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proyecto:

NX QUALITY


Estado:

CONSTRUCCIÓN DOCUMENTAL / PREPARACIÓN DE DESARROLLO


La documentación funcional principal se encuentra definida en
CURRENT.md.


La construcción se realizará por etapas mediante BUILD_ORDER.md.


La etapa activa será determinada exclusivamente por BUILD_STATUS.md.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. REGLA FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NO CONSTRUIR TODO NX QUALITY.

CONSTRUIR SOLAMENTE LA ETAPA ACTIVA.

LEER CURRENT.md PARA CONOCER LA VERDAD FUNCIONAL.

LEER EL DOCUMENTO DE LA ETAPA PARA SABER QUÉ CONSTRUIR.

LEER BUILD_STATUS.md PARA SABER DÓNDE ESTÁ EL PROYECTO.

LEER DECISIONS.md CUANDO EXISTA UNA DECISIÓN QUE DEBA SER
RESPETADA O CUANDO SEA NECESARIO REGISTRAR UNA NUEVA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 00_CONTEXT.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━