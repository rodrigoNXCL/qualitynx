# 10_OPERATIONAL_VIEW.md

# NX QUALITY — OPERATIONAL VIEW

Versión: 1.0
Etapa: 10 — OPERATIONAL VIEW
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPERATIONAL VIEW es la capa que permite a los usuarios conocer qué
está ocurriendo actualmente en la operación y actuar sobre ello.

No es un repositorio de datos.

No es el módulo de analítica.

No reemplaza la Historia Técnica.

Su propósito es convertir la información ya registrada en una vista
operacional útil para:

- conocer el estado actual;
- identificar situaciones que requieren atención;
- localizar lotes;
- revisar inspecciones;
- revisar decisiones;
- detectar información pendiente;
- acceder rápidamente a la Historia Técnica.


Principio:

INFORMACIÓN REGISTRADA
↓
ESTADO OPERACIONAL
↓
SITUACIONES QUE REQUIEREN ATENCIÓN
↓
ACCIÓN DEL USUARIO


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
07 — TRACEABILITY
08 — TRANSFORMATIONS
09 — OFFLINE


OPERATIONAL VIEW solamente consume información generada por esas
etapas.

No debe crear una segunda fuente de información.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir una vista operacional que permita consultar, según rol:

- lotes;
- estado actual;
- inspecciones;
- inspecciones pendientes o incompletas;
- resultados relevantes;
- desviaciones;
- decisiones;
- transformaciones;
- sincronización pendiente;
- situaciones que requieren atención.


Debe existir acceso rápido desde la vista operacional hacia la
Historia Técnica del lote.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. PRINCIPIO DE INFORMACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La vista debe mostrar información necesaria para actuar.

No debe intentar mostrar toda la información disponible
simultáneamente.


La información debe priorizar:

1. Qué está ocurriendo.
2. Qué requiere atención.
3. Qué está pendiente.
4. Qué decisión existe.
5. Qué antecedente necesito consultar.


Los detalles completos permanecen en la Historia Técnica.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. VISTA DE LOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El usuario autorizado debe poder localizar lotes de su ámbito.


Como mínimo debe poder identificar:

- lote;
- productor;
- especie;
- variedad;
- fecha de fruta;
- bloque de cosecha;
- estado operativo;
- última actividad relevante.


La identidad del lote no debe modificarse por la vista operacional.


La vista debe permitir acceder a:

LOTE
↓
HISTORIA TÉCNICA


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. ESTADO OPERACIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La vista debe mostrar el estado operativo actual del lote.


El estado actual es una representación operacional.


NO reemplaza:

- inspecciones;
- mediciones;
- decisiones;
- eventos;
- historia;
- genealogía.


Ejemplo conceptual:

LOTE
Estado actual: RETENIDO

↓

Consultar Historia Técnica

↓

Inspección
+
Resultado
+
Decisión
+
Evidencia


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. SITUACIONES QUE REQUIEREN ATENCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La vista debe destacar situaciones que puedan requerir acción.


Ejemplos:

- inspección pendiente;
- inspección incompleta;
- resultado con desviación;
- decisión pendiente;
- lote retenido;
- información requerida faltante;
- error de sincronización;
- operación offline pendiente;
- evento que requiere revisión.


La alerta debe conducir al contexto que permite comprenderla.


No debe limitarse a mostrar:

"ERROR"

o

"ALERTA"


Debe permitir:

ALERTA
↓
CONTEXTO
↓
INFORMACIÓN
↓
ACCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. RECOMENDACIONES Y ALERTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando QUALITY ENGINE genere una recomendación o alerta, la vista
puede mostrarla como información operacional.


Debe distinguir claramente:

RESULTADO
+
ALERTA / RECOMENDACIÓN
+
DECISIÓN HUMANA


El sistema no debe presentar una recomendación como una decisión
tomada.


Ejemplo:

SISTEMA:
"Revisar comportamiento respecto de historial."

USUARIO:
revisa antecedentes

↓

DECISIÓN:
registrada por usuario autorizado


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. INSPECCIONES PENDIENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La vista debe permitir identificar inspecciones que:

- aún no comienzan;
- están en curso;
- están incompletas;
- requieren acción posterior.


Una inspección completada no debe aparecer como pendiente.


Las reglas exactas para determinar cuándo una inspección está pendiente
deben provenir de INSPECTIONS.


OPERATIONAL VIEW solamente las representa.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. DECISIONES PENDIENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando una operación requiera decisión humana y ésta todavía no exista,
debe poder identificarse desde la vista operacional.


Debe permitir:

DECISIÓN PENDIENTE
↓
CONSULTAR CONTEXTO
↓
REVISAR INFORMACIÓN
↓
REGISTRAR DECISIÓN


La vista no debe tomar la decisión automáticamente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. ESTADO DE SINCRONIZACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando el usuario trabaje con información offline, la vista debe poder
mostrar:

- conexión disponible/no disponible;
- operaciones pendientes;
- sincronización en curso;
- errores de sincronización.


El estado de sincronización debe ser comprensible para el usuario.


No debe confundirse:

OPERACIÓN PENDIENTE

con

OPERACIÓN FALLIDA


El detalle pertenece a OFFLINE.


OPERATIONAL VIEW lo presenta.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. ACCESO A HISTORIA TÉCNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La vista operacional debe permitir acceder rápidamente a la historia
del lote.


Desde un lote se debe poder consultar, según permisos:

- origen;
- inspecciones;
- mediciones;
- fotografías/evidencias;
- observaciones;
- decisiones;
- transformaciones;
- eventos posteriores;
- resultados relevantes.


OPERATIONAL VIEW no duplica esta información.

Debe dirigir al usuario hacia ella.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. FILTROS Y LOCALIZACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La vista debe permitir localizar información operacional mediante
criterios relevantes.


Como mínimo:

- lote;
- productor;
- variedad;
- fecha;
- estado.


Los filtros disponibles deben respetar el ámbito del usuario.


No debe mostrarse información perteneciente a otra empresa.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. ROLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La información visible debe respetar el rol.


INSPECTOR:

Debe poder consultar la información necesaria para realizar y revisar
su operación.


SUPERVISOR / ADMINISTRADOR:

Debe disponer de una visión operacional más amplia de la empresa,
según sus permisos.


SUPER ADMIN:

Puede gestionar la plataforma según sus permisos, pero cualquier acceso
a información operacional de una empresa debe estar autorizado y
auditado.


La matriz detallada de permisos continúa siendo responsabilidad de
FOUNDATION / modelo de roles.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. ACCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las acciones disponibles desde la vista deben depender del contexto
y permisos.


Ejemplos:

- abrir lote;
- abrir Historia Técnica;
- iniciar/revisar inspección cuando corresponda;
- revisar desviación;
- registrar decisión cuando corresponda;
- revisar sincronización.


La vista no debe permitir acciones incompatibles con el estado actual.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. CONSISTENCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La información mostrada debe provenir de los registros reales del
sistema.


No crear estados visuales que no existan en el modelo operacional.


Si existe diferencia entre:

ESTADO ACTUAL

y

HISTORIA

debe mostrarse de manera que el usuario pueda consultar el contexto.


La vista no debe reinterpretar registros históricos.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. INFORMACIÓN HISTÓRICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La vista operacional puede utilizar antecedentes históricos para
contextualizar una situación.


Sin embargo:

HISTORIA
≠
ESTADO ACTUAL


Una inspección antigua no debe presentarse como si fuera una condición
actual.


Los antecedentes históricos deben mantener su fecha y contexto.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. FUERA DE ALCANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No construir en esta etapa:

- analítica avanzada;
- indicadores históricos complejos;
- predicción;
- modelos estadísticos;
- dashboards ejecutivos;
- comparación avanzada entre temporadas;
- BI;
- reportes analíticos;
- recomendaciones autónomas;
- generación automática de decisiones.


Estas capacidades corresponden principalmente a:

11 — ANALYTICS


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] El usuario autorizado puede consultar sus lotes.

[ ] Se muestra el estado operacional actual.

[ ] Se puede acceder a la Historia Técnica.

[ ] Se pueden identificar inspecciones pendientes.

[ ] Se pueden identificar inspecciones incompletas.

[ ] Se pueden identificar desviaciones relevantes.

[ ] Se pueden identificar decisiones pendientes.

[ ] Se pueden identificar lotes retenidos u otros estados relevantes.

[ ] Se puede identificar información pendiente de sincronización.

[ ] Se pueden identificar errores de sincronización.

[ ] Las alertas permiten acceder a su contexto.

[ ] Las recomendaciones no aparecen como decisiones humanas.

[ ] Los filtros respetan los permisos.

[ ] La información de empresas permanece aislada.

[ ] Las acciones disponibles respetan el estado y los permisos.

[ ] La vista no modifica la Historia Técnica al consultarla.

[ ] La información histórica conserva su contexto temporal.

[ ] No se generan estados paralelos a los definidos por el sistema.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — LOTES

Usuario autorizado consulta sus lotes.

→ Solo aparecen lotes de su ámbito.


PRUEBA 2 — ESTADO

Un lote cambia de estado.

→ La vista refleja el estado actual correcto.


PRUEBA 3 — HISTORIA

Abrir un lote desde la vista.

→ Debe accederse a su Historia Técnica.


PRUEBA 4 — INSPECCIÓN PENDIENTE

Existe una inspección pendiente.

→ Debe identificarse como pendiente.


PRUEBA 5 — DECISIÓN

Existe una operación que requiere decisión.

→ Debe aparecer como pendiente de decisión.


PRUEBA 6 — DESVIACIÓN

QUALITY ENGINE genera una desviación.

→ Debe visualizarse como situación que requiere revisión.


PRUEBA 7 — RECOMENDACIÓN

QUALITY ENGINE genera una recomendación.

→ Debe distinguirse de una decisión humana.


PRUEBA 8 — OFFLINE

Existen operaciones pendientes de sincronización.

→ Deben ser visibles para el usuario correspondiente.


PRUEBA 9 — ERROR

Existe una sincronización fallida.

→ Debe distinguirse de una operación simplemente pendiente.


PRUEBA 10 — PERMISOS

Usuario intenta consultar información de otra empresa.

→ Acceso rechazado.


PRUEBA 11 — HISTORIA

Consultar información histórica.

→ No debe cambiar ni sobrescribir información.


PRUEBA 12 — ACCIÓN INVÁLIDA

Intentar ejecutar una acción incompatible con el estado del lote.

→ Operación rechazada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10 — OPERATIONAL VIEW está COMPLETADA cuando:

[ ] FOUNDATION está COMPLETADA.

[ ] LOTS está COMPLETADA.

[ ] INSPECTIONS está COMPLETADA.

[ ] QUALITY ENGINE está COMPLETADA.

[ ] DECISIONS está COMPLETADA.

[ ] TRACEABILITY está COMPLETADA.

[ ] TRANSFORMATIONS está COMPLETADA.

[ ] OFFLINE está COMPLETADA.

[ ] Existe vista operacional de lotes.

[ ] Se muestra el estado operacional actual.

[ ] Se puede acceder a la Historia Técnica.

[ ] Se identifican situaciones que requieren atención.

[ ] Se identifican inspecciones pendientes.

[ ] Se identifican decisiones pendientes.

[ ] Se muestran alertas/recomendaciones de forma diferenciada.

[ ] Se muestra el estado de sincronización.

[ ] Los filtros funcionan respetando permisos.

[ ] Las acciones respetan estados y permisos.

[ ] El aislamiento entre empresas está verificado.

[ ] No existe una segunda fuente de verdad.

[ ] No se han construido funcionalidades propias de ANALYTICS.

[ ] Todas las pruebas de aceptación están aprobadas.

[ ] No existen errores críticos pendientes.

[ ] BUILD_STATUS.md fue actualizado.

[ ] 10 — OPERATIONAL VIEW queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 10_OPERATIONAL_VIEW.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━