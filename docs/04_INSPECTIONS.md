# 04_INSPECTIONS.md

# NX QUALITY — INSPECTIONS

Versión: 1.0
Etapa: 04 — INSPECTIONS
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección es un Evento Técnico / Punto de Evaluación asociado a
un lote.

No es un registro aislado.

Debe permitir registrar la evaluación realizada sobre el lote,
incluyendo:

- inspector;
- punto de evaluación;
- fecha y hora;
- mediciones;
- muestreo;
- observaciones;
- evidencias;
- resultado;
- decisión cuando corresponda.

La inspección debe quedar incorporada a la Historia Técnica del lote.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requiere:

01 — FOUNDATION
02 — MASTER DATA
03 — LOTS

Debe existir:

- usuario autenticado;
- empresa;
- rol autorizado;
- lote válido;
- punto de evaluación;
- biblioteca/configuración de mediciones;
- almacenamiento de evidencias.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir una INSPECCIÓN asociada obligatoriamente a:

- un lote;
- un punto de evaluación;
- un inspector;
- fecha/hora.


Debe poder contener:

- mediciones;
- información de muestra;
- observaciones;
- fotografías/evidencias;
- resultado;
- decisión cuando corresponda.


La inspección debe poder consultarse posteriormente dentro de la
Historia Técnica del lote.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REGLAS DE INSPECCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Una inspección siempre pertenece a un lote.

2. Una inspección siempre identifica el punto de evaluación realizado.

3. Debe quedar identificado quién realizó la inspección.

4. Debe quedar registrada fecha y hora.

5. Las mediciones aplicables dependen del punto de evaluación y de la
   configuración correspondiente.

6. Las mediciones configuradas como obligatorias deben completarse
   antes de cerrar la inspección.

7. Los valores deben respetar las validaciones definidas para cada
   medición.

8. Una inspección puede contener múltiples mediciones.

9. Una inspección puede contener múltiples evidencias.

10. Las inspecciones del MVP deben contar con evidencia fotográfica.

11. La evidencia debe quedar relacionada con la inspección y, cuando
    corresponda, con el hallazgo o medición.

12. Las observaciones pueden registrarse a nivel de inspección y,
    cuando corresponda, de medición.

13. Las mediciones pueden requerir una o más muestras.

14. Debe conservarse la cantidad de fruta/muestras utilizada cuando el
    protocolo de la medición lo requiera.

15. El sistema debe permitir almacenar el resultado calculado a partir
    de las muestras.

16. Las reglas exactas de tamaño de muestra por atributo provienen del
    protocolo/criterio correspondiente; esta etapa no inventa esas
    cantidades.

17. Una inspección no se considera finalizada mientras falten datos
    obligatorios.

18. Una decisión asociada a la inspección debe quedar registrada
    separadamente del resultado técnico.

19. Una inspección histórica no debe desaparecer por modificaciones
    posteriores.

20. Toda modificación relevante debe quedar trazable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. MODELO NECESARIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSPECCIÓN

Debe relacionarse con:

- lote;
- punto de evaluación;
- inspector;
- fecha/hora.


INSPECCIÓN puede contener:

- MUESTRAS;
- MEDICIONES;
- OBSERVACIONES;
- EVIDENCIAS;
- RESULTADO;
- DECISIÓN.


MUESTRA debe poder representar:

- identificación;
- cantidad evaluada;
- información necesaria para el cálculo;
- resultado asociado.


MEDICIÓN debe poder representar:

- medición configurada;
- valor;
- unidad/tipo correspondiente;
- método cuando aplique;
- muestra asociada cuando corresponda;
- observación;
- evidencia cuando corresponda.


No construir en esta etapa el motor completo de criterios ni el motor
de recomendaciones.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. FLUJO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INICIO

Usuario autorizado
↓
Selecciona lote
↓
Selecciona punto de evaluación
↓
Crear inspección
↓
Registrar fecha/hora e inspector
↓
Cargar mediciones configuradas
↓
Registrar muestras
↓
Registrar mediciones
↓
Adjuntar evidencia fotográfica
↓
Agregar observaciones
↓
Validar obligatoriedad y valores
↓
¿Datos completos?
├── NO → Informar pendientes
└── SÍ
      ↓
Calcular/registrar resultado cuando corresponda
      ↓
Registrar decisión cuando corresponda
      ↓
Cerrar inspección


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. ESTADOS DE INSPECCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La inspección debe distinguir al menos:

EN CURSO

COMPLETADA


EN CURSO:

Permite continuar registrando información.


COMPLETADA:

No quedan datos obligatorios pendientes y el evento fue cerrado.


El estado de la inspección NO reemplaza el estado del lote.


El estado del lote continúa siendo responsabilidad de LOTS y de las
decisiones posteriores.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. VALIDACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de completar una inspección validar:

[ ] Lote válido.

[ ] Punto de evaluación válido.

[ ] Inspector autorizado.

[ ] Fecha/hora válida.

[ ] Mediciones obligatorias completas.

[ ] Valores dentro de las validaciones configuradas.

[ ] Muestras registradas cuando sean requeridas.

[ ] Evidencia fotográfica presente.

[ ] Información necesaria para calcular resultados disponible.

[ ] No existen datos inconsistentes.


Si falla una validación:

NO cerrar la inspección.

Mostrar claramente qué información falta o es inválida.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. EVIDENCIA FOTOGRÁFICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Toda inspección del MVP debe contar con evidencia fotográfica.


La fotografía debe quedar vinculada al evento de inspección.


Cuando corresponda, podrá vincularse además a:

- medición;
- defecto;
- observación;
- hallazgo.


Debe permitirse más de una fotografía por inspección.


La fotografía no debe quedar almacenada como archivo huérfano.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. MUESTREO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La inspección debe soportar evaluaciones basadas en muestras.


Debe poder registrarse:

- cantidad de muestras;
- cantidad de fruta evaluada;
- resultado;
- método utilizado cuando corresponda.


Ejemplo conceptual:

INSPECCIÓN
↓
MUESTRA
↓
N FRUTOS EVALUADOS
↓
MEDICIÓN / DEFECTO
↓
RESULTADO


Las cantidades exactas por atributo no deben codificarse como una
regla universal en esta etapa si dependen del protocolo aplicable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. MEDICIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las mediciones se cargan desde la configuración correspondiente al
punto de evaluación.


Una medición puede ser:

- numérica;
- porcentaje;
- entero;
- texto;
- lista;
- sí/no;
- cálculo derivado;

según su definición.


La etapa debe permitir capturar el valor y la información necesaria
para interpretarlo.


No debe crear una lista rígida de mediciones dentro de la interfaz.


La biblioteca de mediciones es configurable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. MODIFICACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección EN CURSO puede ser modificada por el usuario autorizado
que corresponda.


Una inspección COMPLETADA no debe modificarse silenciosamente.


Si una modificación posterior está permitida:

- debe identificarse quién la realizó;
- debe registrarse fecha/hora;
- debe conservarse trazabilidad;
- debe poder distinguirse la información original de la modificación.


Los permisos concretos para editar inspecciones de otros usuarios
corresponden al rol Supervisor/Administrador definido para el MVP.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. DECISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección puede generar una decisión.


La decisión:

NO ES LO MISMO QUE EL RESULTADO DE LA INSPECCIÓN.


El resultado representa lo observado/obtenido.

La decisión representa qué se hará con esa información.


Ejemplos de decisión:

- aprobar;
- rechazar;
- retener;
- reprocesar;
- solicitar nueva evaluación;
- continuar;
- otra opción configurada.


La decisión debe quedar asociada al evento.


El sistema podrá posteriormente sugerir una recomendación, pero la
decisión registrada debe identificar la acción efectivamente tomada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La inspección debe poder realizarse sin conexión.


En modo offline debe ser posible:

- abrir el lote disponible;
- crear la inspección;
- registrar mediciones;
- registrar muestras;
- registrar fotografías;
- registrar observaciones;
- guardar la inspección localmente.


La sincronización pertenece a:

09 — OFFLINE.


Esta etapa solamente debe garantizar que el modelo de inspección no
dependa de una conexión permanente para su captura.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Se puede crear una inspección sobre un lote válido.

[ ] Se identifica el punto de evaluación.

[ ] Se identifica el inspector.

[ ] Se registra fecha/hora.

[ ] Se cargan las mediciones configuradas.

[ ] Se pueden registrar muestras.

[ ] Se pueden registrar mediciones.

[ ] Se validan mediciones obligatorias.

[ ] Se validan valores según configuración.

[ ] Se pueden agregar observaciones.

[ ] Se pueden agregar múltiples fotografías.

[ ] La inspección del MVP no puede completarse sin evidencia
    fotográfica.

[ ] Las evidencias quedan vinculadas al evento.

[ ] Se puede calcular/registrar el resultado cuando corresponda.

[ ] Se puede registrar una decisión.

[ ] Resultado y decisión permanecen diferenciados.

[ ] Una inspección puede quedar EN CURSO.

[ ] Una inspección puede quedar COMPLETADA.

[ ] Una inspección completada conserva su historial.

[ ] La inspección puede capturarse sin conexión.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — CREACIÓN

Crear inspección sobre lote válido.

→ Debe crearse EN CURSO.


PRUEBA 2 — LOTE INVÁLIDO

Intentar crear inspección sin lote válido.

→ Debe rechazarse.


PRUEBA 3 — MEDICIÓN OBLIGATORIA

Intentar completar una inspección dejando una medición obligatoria
vacía.

→ Debe impedirse el cierre.


PRUEBA 4 — VALOR INVÁLIDO

Ingresar valor fuera de la validación configurada.

→ Debe rechazarse o advertirse según la regla definida.


PRUEBA 5 — MUESTRA

Registrar una evaluación basada en muestra.

→ Debe conservar cantidad y resultado correspondiente.


PRUEBA 6 — FOTOGRAFÍA

Intentar completar inspección sin evidencia fotográfica.

→ Debe impedirse el cierre.


PRUEBA 7 — MÚLTIPLES EVIDENCIAS

Adjuntar varias fotografías.

→ Todas deben quedar asociadas a la inspección.


PRUEBA 8 — DECISIÓN

Completar mediciones y registrar decisión.

→ Resultado y decisión deben quedar registrados separadamente.


PRUEBA 9 — MODIFICACIÓN

Modificar una inspección según permisos.

→ Debe quedar trazabilidad de la modificación.


PRUEBA 10 — ACCESO

Intentar acceder a inspección de otra empresa.

→ Debe rechazarse.


PRUEBA 11 — OFFLINE

Crear y completar una inspección sin conexión.

→ La información debe quedar almacenada para posterior sincronización.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

04 — INSPECTIONS está COMPLETADA cuando:

[ ] FOUNDATION está COMPLETADA.

[ ] MASTER DATA está COMPLETADA.

[ ] LOTS está COMPLETADA.

[ ] Se puede crear una inspección asociada a un lote.

[ ] Se identifica inspector.

[ ] Se identifica punto de evaluación.

[ ] Se registra fecha/hora.

[ ] Funcionan las mediciones configuradas.

[ ] Funcionan las muestras.

[ ] Funcionan las validaciones.

[ ] Funciona la evidencia fotográfica obligatoria.

[ ] Funcionan las observaciones.

[ ] Se puede registrar el resultado.

[ ] Se puede registrar una decisión.

[ ] Resultado y decisión permanecen diferenciados.

[ ] Funcionan los estados EN CURSO y COMPLETADA.

[ ] La trazabilidad de modificaciones funciona.

[ ] El aislamiento entre empresas está verificado.

[ ] La captura básica funciona offline.

[ ] Todas las pruebas de aceptación están aprobadas.

[ ] No existen errores críticos pendientes.

[ ] No se han construido funcionalidades pertenecientes a
    QUALITY ENGINE, DECISIONS, TRACEABILITY o TRANSFORMATIONS.

[ ] BUILD_STATUS.md fue actualizado.

[ ] 04 — INSPECTIONS queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 04_INSPECTIONS.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━