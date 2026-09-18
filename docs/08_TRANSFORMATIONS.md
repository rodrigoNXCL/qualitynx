# 08_TRANSFORMATIONS.md

# NX QUALITY — TRANSFORMATIONS

Versión: 1.0
Etapa: 08 — TRANSFORMATIONS
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRANSFORMATIONS gestiona los cambios físicos u operacionales que
modifican la relación de un lote con la fruta que representa.

Incluye:

- mezcla de lotes;
- división de lotes;
- reproceso.

Su objetivo es conservar la continuidad de la Historia Técnica cuando
la fruta cambia de composición, cantidad, condición o relación
operacional.

La genealogía permite conocer:

ORIGEN
↓
TRANSFORMACIÓN
↓
RESULTADO
↓
NUEVA HISTORIA


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requiere:

01 — FOUNDATION
03 — LOTS
06 — DECISIONS
07 — TRACEABILITY


Debe existir:

- lote;
- usuario autorizado;
- estados operacionales;
- trazabilidad;
- capacidad de registrar eventos.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir capacidad para registrar:

1. MEZCLA

Dos o más lotes origen
↓
Nuevo lote derivado


2. DIVISIÓN

Un lote origen
↓
Uno o más lotes derivados


3. REPROCESO

Lote
↓
Proceso operacional
↓
Nueva condición


Cada transformación debe conservar:

- fecha/hora;
- responsable;
- motivo;
- relación con el lote o lotes afectados;
- información necesaria para reconstruir el resultado.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REGLAS GENERALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Una transformación debe ser ejecutada por un usuario autorizado.

2. Toda transformación debe quedar registrada como evento.

3. Los lotes origen nunca pierden su historia.

4. Una transformación no debe copiar eventos históricos de los lotes
   origen como si hubieran ocurrido directamente sobre el lote
   resultante.

5. Las relaciones de origen y resultado deben quedar registradas.

6. Toda transformación debe ser trazable.

7. Debe registrarse quién realizó la operación.

8. Debe registrarse fecha y hora.

9. Debe registrarse el motivo.

10. Las cantidades o participaciones deben registrarse cuando sean
    aplicables y estén disponibles.

11. Una transformación no debe eliminar información histórica.

12. Los lotes derivados pueden continuar posteriormente con su propia
    Historia Técnica.

13. El historial de los lotes origen permanece consultable.

14. Una transformación no debe alterar retroactivamente inspecciones,
    resultados o decisiones anteriores.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. MEZCLA DE LOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una mezcla ocurre cuando dos o más lotes se incorporan físicamente en
una nueva unidad.

FLUJO:

LOTE A
+
LOTE B
↓
USUARIO AUTORIZADO
↓
REGISTRAR MEZCLA
↓
REGISTRAR MOTIVO
↓
REGISTRAR LOTES ORIGEN
↓
CREAR NUEVO LOTE C
↓
REGISTRAR GENEALOGÍA
↓
C CONTINÚA SU PROPIA HISTORIA


El nuevo lote debe conservar relación con todos los lotes origen.


Debe registrarse:

- lotes origen;
- lote resultante;
- fecha/hora;
- responsable;
- motivo;
- cantidades/participaciones cuando corresponda.


La Historia Técnica de A y B permanece intacta.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. DIVISIÓN DE LOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una división ocurre cuando un lote se separa en unidades derivadas.


FLUJO:

LOTE A
↓
USUARIO AUTORIZADO
↓
REGISTRAR DIVISIÓN
↓
REGISTRAR MOTIVO
↓
CREAR LOTES DERIVADOS
↓
REGISTRAR RELACIÓN CON A
↓
CADA DERIVADO CONTINÚA SU HISTORIA


Debe registrarse:

- lote origen;
- lotes resultantes;
- fecha/hora;
- responsable;
- motivo;
- cantidades cuando corresponda.


La Historia Técnica de A no se elimina.


Cada lote derivado debe poder identificarse como descendiente del
lote origen.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. FRACCIÓN SEPARADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando parte de un lote sea separada para una operación posterior,
la información de origen debe conservarse.


Conceptualmente:

LOTE ORIGINAL
↓
FRACCIÓN SEPARADA
↓
NUEVA OPERACIÓN
↓
NUEVOS ANÁLISIS


Debe conservarse:

- relación con el lote original;
- cantidad o porcentaje cuando corresponda;
- fecha/hora;
- motivo;
- responsable;
- operaciones posteriores.


La fracción no puede perder su historia previa.


La definición exacta de la identidad operacional de una fracción
separada debe seguir las reglas definitivas del modelo de LOTS y
genealogía.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. REPROCESO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El reproceso es una operación realizada sobre un lote o fracción para
modificar su condición.


No debe tratarse como eliminación de la condición anterior.


FLUJO:

LOTE
↓
RESULTADO / DECISIÓN
↓
SE DETERMINA REPROCESO
↓
REGISTRAR MOTIVO
↓
REPROCESO
↓
REGISTRAR RESULTADO POSTERIOR
↓
NUEVA INSPECCIÓN CUANDO CORRESPONDA
↓
NUEVA DECISIÓN


Debe poder reconstruirse:

ANTES
↓
REPROCESO
↓
DESPUÉS


El estado anterior permanece disponible en la Historia Técnica.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. GENEALOGÍA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La genealogía representa las relaciones de origen y derivación entre
lotes.


Debe permitir consultar:

LOTE ORIGEN
↓
TRANSFORMACIÓN
↓
LOTE DERIVADO


Y también:

LOTE DERIVADO
↓
ORÍGENES


La genealogía debe soportar como mínimo:

- mezcla;
- división.


El reproceso debe conservar la relación temporal y operacional con el
lote afectado.


La genealogía es independiente del historial de inspecciones.


Una inspección registra una evaluación.

La genealogía registra de dónde proviene la unidad evaluada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. INTEGRIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de ejecutar una transformación validar:

[ ] Usuario autorizado.

[ ] Lote o lotes válidos.

[ ] Lotes pertenecen al ámbito autorizado.

[ ] Estado de los lotes permite la operación.

[ ] Motivo informado cuando corresponda.

[ ] Información obligatoria disponible.

[ ] No existe una transformación incompatible en curso.


Si la validación falla:

NO ejecutar la transformación.


Una operación fallida no debe generar un resultado que aparente haber
sido ejecutado correctamente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. TRAZABILIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Toda transformación debe generar trazabilidad.


Debe poder determinarse:

- quién;
- cuándo;
- qué lote o lotes;
- qué transformación;
- por qué;
- qué resultado produjo.


Ejemplo:

LOTE A + LOTE B
↓
MEZCLA
↓
USUARIO
↓
FECHA/HORA
↓
LOTE C


La transformación debe poder consultarse desde:

- lote origen;
- lote derivado;
- historia técnica.


La operación no debe modificar directamente registros históricos
anteriores.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. RELACIÓN CON INSPECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRANSFORMATIONS no realiza inspecciones.


Después de una transformación puede existir una nueva inspección.


Ejemplo:

LOTE A
↓
REPROCESO
↓
NUEVA INSPECCIÓN
↓
NUEVO RESULTADO
↓
NUEVA DECISIÓN


La inspección posterior debe quedar asociada al lote correspondiente.


Los resultados anteriores permanecen disponibles.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. RELACIÓN CON DECISIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una transformación puede originarse a partir de una decisión.


Ejemplo:

INSPECCIÓN
↓
RESULTADO
↓
DECISIÓN: REPROCESAR
↓
TRANSFORMACIÓN


La decisión que originó la transformación debe poder identificarse.


La transformación registra la operación realizada.


No debe modificarse retrospectivamente la decisión original.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. CASOS LÍMITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe contemplar:

- mezcla con lote inexistente;
- división sin lote origen válido;
- usuario sin autorización;
- lote en estado incompatible;
- transformación duplicada;
- transformación parcialmente registrada;
- intento de eliminar lote origen;
- intento de modificar genealogía histórica;
- reproceso sin motivo cuando sea obligatorio;
- transformación sin trazabilidad;
- lote derivado creado pero sin relación con su origen.


Ante información insuficiente:

NO inventar la relación.


Ante una transformación ambigua:

NO ejecutarla hasta que exista una definición válida.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. FUERA DE ALCANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No construir en esta etapa:

- planificación industrial;
- control de inventario;
- gestión completa de producción;
- ERP;
- cálculo comercial;
- logística;
- gestión de pallets como sistema independiente;
- dashboards;
- analítica avanzada;
- predicción;
- IA;
- integración con sistemas externos;
- reglas automáticas de rendimiento productivo.


TRANSFORMATIONS administra la continuidad de la identidad y genealogía
de la fruta dentro de QualityNX.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Se puede registrar una mezcla.

[ ] Una mezcla genera un nuevo lote derivado.

[ ] El nuevo lote mantiene relación con todos sus lotes origen.

[ ] Los lotes origen mantienen su historia.

[ ] Se puede registrar una división.

[ ] La división genera lotes derivados.

[ ] Cada derivado mantiene relación con su lote origen.

[ ] La historia del lote origen permanece disponible.

[ ] Se puede registrar un reproceso.

[ ] El reproceso conserva la condición anterior.

[ ] El resultado posterior puede registrarse.

[ ] Puede realizarse una nueva inspección después del reproceso.

[ ] La genealogía puede consultarse desde los lotes relacionados.

[ ] Todas las transformaciones quedan trazables.

[ ] Se identifica usuario y fecha/hora.

[ ] Se conserva el motivo.

[ ] Se respetan permisos.

[ ] Se impiden transformaciones incompatibles.

[ ] No se eliminan silenciosamente historias anteriores.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — MEZCLA

Crear mezcla entre Lote A y Lote B.

→ Debe crearse Lote C.

→ C debe mantener relación con A y B.


PRUEBA 2 — HISTORIA DE ORIGEN

Consultar Lote A después de la mezcla.

→ Su historia anterior debe permanecer disponible.


PRUEBA 3 — GENEALOGÍA

Consultar Lote C.

→ Debe poder identificarse A y B como orígenes.


PRUEBA 4 — DIVISIÓN

Dividir Lote A en A-1 y A-2.

→ Ambos deben quedar relacionados con A.


PRUEBA 5 — HISTORIA DEL ORIGEN

Consultar A después de la división.

→ Su historia debe permanecer intacta.


PRUEBA 6 — REPROCESO

Registrar reproceso sobre un lote.

→ Debe quedar registrada la operación y su motivo.


PRUEBA 7 — ANTES/DESPUÉS

Registrar inspección antes y después de reproceso.

→ Deben poder distinguirse ambas condiciones.


PRUEBA 8 — PERMISOS

Usuario sin autorización intenta realizar una transformación.

→ Operación rechazada.


PRUEBA 9 — LOTE INVÁLIDO

Intentar mezclar un lote inexistente.

→ Operación rechazada.


PRUEBA 10 — TRAZABILIDAD

Consultar una transformación.

→ Debe identificarse usuario, fecha/hora, origen, tipo y resultado.


PRUEBA 11 — HISTORIAL

Intentar eliminar el lote origen después de una transformación.

→ Operación rechazada.


PRUEBA 12 — DUPLICACIÓN

Reintentar una transformación ya registrada.

→ No debe crear una segunda transformación equivalente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

08 — TRANSFORMATIONS está COMPLETADA cuando:

[ ] FOUNDATION está COMPLETADA.

[ ] LOTS está COMPLETADA.

[ ] DECISIONS está COMPLETADA.

[ ] TRACEABILITY está COMPLETADA.

[ ] Existe el modelo funcional de genealogía.

[ ] Funciona la mezcla.

[ ] La mezcla genera lote derivado.

[ ] Funciona la división.

[ ] Los derivados mantienen relación con sus orígenes.

[ ] Funciona el registro de reproceso.

[ ] El reproceso conserva la condición anterior.

[ ] Se puede registrar el resultado posterior.

[ ] La genealogía puede consultarse.

[ ] Las transformaciones quedan trazables.

[ ] Se mantienen las historias de los lotes origen.

[ ] Se validan permisos y estados.

[ ] Se controlan duplicidades.

[ ] Todas las pruebas de aceptación están aprobadas.

[ ] No existen errores críticos pendientes.

[ ] No se han construido funcionalidades pertenecientes a OFFLINE,
    OPERATIONAL VIEW o ANALYTICS.

[ ] BUILD_STATUS.md fue actualizado.

[ ] 08 — TRANSFORMATIONS queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 08_TRANSFORMATIONS.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━