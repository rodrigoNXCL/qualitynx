# 05_QUALITY_ENGINE.md

# NX QUALITY — QUALITY ENGINE

Versión: 1.0
Etapa: 05 — QUALITY ENGINE
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUALITY ENGINE transforma las mediciones registradas en una evaluación
respecto de criterios de calidad configurados.

Su función es responder:

¿EL RESULTADO CUMPLE EL CRITERIO CONFIGURADO?

y, cuando corresponda:

¿QUÉ DESVIACIÓN O ALERTA EXISTE?

El motor entrega información para respaldar una decisión.

NO reemplaza el criterio técnico del usuario.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requiere:

01 — FOUNDATION
02 — MASTER DATA
03 — LOTS
04 — INSPECTIONS


Debe poder utilizar:

- mediciones registradas;
- punto de evaluación;
- empresa;
- especie;
- variedad cuando corresponda;
- contexto de la inspección;
- criterios configurados;
- versión vigente del criterio.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir un motor capaz de:

1. recibir una medición válida;
2. identificar el criterio aplicable;
3. comparar el valor con el criterio;
4. determinar el resultado de la evaluación;
5. identificar desviaciones;
6. conservar el criterio utilizado;
7. entregar el resultado a la inspección;
8. dejar disponible la información para la etapa de decisiones.


El motor debe funcionar sobre criterios configurables.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REGLAS DEL MOTOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Los criterios son configurables.

2. Los criterios pueden variar según la empresa.

3. Un criterio puede depender del punto de evaluación.

4. El criterio aplicable puede depender del contexto configurado para
   esa evaluación.

5. Una medición puede tener límites, rangos o condiciones de aceptación.

6. El motor debe distinguir entre:
   CUMPLE
   y
   NO CUMPLE / DESVIACIÓN.

7. Una desviación no significa automáticamente que el lote deba ser
   rechazado.

8. El motor puede advertir o contextualizar.

9. La decisión final corresponde al usuario responsable.

10. El criterio utilizado debe quedar asociado al resultado generado.

11. Si un criterio cambia posteriormente, una evaluación histórica debe
    conservar el criterio vigente al momento de su ejecución.

12. Una modificación posterior de criterios no debe reinterpretar
    automáticamente el pasado.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. MODELO NECESARIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITERIO DE CALIDAD

Debe poder representar como mínimo:

- medición a la que aplica;
- condición de evaluación;
- valor o rango;
- unidad cuando corresponda;
- punto de evaluación;
- empresa;
- vigencia;
- versión.


EVALUACIÓN DE CRITERIO

Debe relacionarse con:

- inspección;
- medición;
- criterio utilizado;
- resultado obtenido.


El resultado debe conservar referencia suficiente para reconstruir por
qué el motor determinó:

CUMPLE

o

DESVIACIÓN.


No construir en esta etapa el modelo completo de DECISIONES.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. TIPOS DE CRITERIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El motor debe soportar como mínimo criterios basados en:

- mínimo;
- máximo;
- rango;
- condición de cumplimiento;
- comparación porcentual cuando corresponda.


Ejemplos conceptuales:

Firmeza
≥ mínimo


Pudrición
≤ máximo


Brix
≥ mínimo


El motor debe utilizar la definición de la medición para interpretar
correctamente:

- tipo de dato;
- unidad;
- sentido de la comparación.


No establecer valores universales de aceptación dentro del motor.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. APLICACIÓN DEL CRITERIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FLUJO:

MEDICIÓN REGISTRADA
↓
Identificar contexto
↓
Buscar criterio aplicable
↓
¿Existe criterio?
├── NO → Resultado: SIN CRITERIO CONFIGURADO
└── SÍ
      ↓
Aplicar versión vigente
      ↓
Comparar valor
      ↓
Determinar resultado
      ↓
Guardar evaluación
      ↓
Entregar resultado a INSPECTION / DECISIONS


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. AUSENCIA DE CRITERIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si existe una medición válida pero no existe un criterio aplicable:

NO debe inventarse un criterio.

NO debe utilizarse silenciosamente otro criterio.


El sistema debe indicar:

SIN CRITERIO CONFIGURADO


La medición debe conservarse.


La ausencia de criterio no debe convertir automáticamente la medición
en:

CUMPLE

ni en:

NO CUMPLE.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. RESULTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El motor debe generar un resultado interpretable.


Como mínimo:

CUMPLE

DESVIACIÓN

SIN CRITERIO


Cuando exista desviación, debe poder identificarse:

- valor obtenido;
- criterio esperado;
- diferencia o condición incumplida;
- criterio utilizado.


La información debe poder ser presentada al usuario responsable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. CONTEXTO HISTÓRICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los resultados del motor deben conservar el criterio utilizado en ese
momento.


Ejemplo:

Criterio vigente:
Pudrición máxima 2%


Inspección:
3%


Resultado:

DESVIACIÓN


Posteriormente:

Nuevo criterio:
Pudrición máxima 3%


La inspección histórica anterior NO debe convertirse automáticamente
en:

CUMPLE.


Debe conservar:

criterio anterior
+
resultado original.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los criterios deben poder configurarse sin modificar el código del
producto.


La configuración debe permitir establecer criterios para las
mediciones utilizadas por la empresa.


El motor debe utilizar la configuración vigente al momento de evaluar
una inspección.


Los cambios de configuración deben quedar versionados o identificados
de manera que pueda reconstruirse qué criterio estaba vigente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. REGLA SOBRE HISTORIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El comportamiento histórico es información contextual.

NO debe confundirse con un criterio de aceptación.


Ejemplo:

Productor normalmente:
85% Premium


Nueva inspección:
40% Premium


Esto puede generar una alerta de desviación histórica.

Pero NO significa automáticamente que:

40% = incumplimiento.


El motor de calidad debe diferenciar:

CRITERIO FORMAL

de

COMPORTAMIENTO HISTÓRICO.


La utilización avanzada del historial pertenece a etapas posteriores
cuando corresponda.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. RELACIÓN CON INSPECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSPECTIONS registra:

VALOR OBSERVADO


QUALITY ENGINE procesa:

VALOR + CONTEXTO + CRITERIO


QUALITY ENGINE devuelve:

RESULTADO


La inspección conserva el resultado correspondiente a su evaluación.


El motor no debe modificar arbitrariamente la medición original.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. RELACIÓN CON DECISIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUALITY ENGINE:

INFORMA


DECISIONS:

DECIDE / REGISTRA LA DECISIÓN


Ejemplo:

Pudrición:
3%

Criterio:
máximo 2%

QUALITY ENGINE:

DESVIACIÓN


DECISIONS:

usuario responsable determina la acción.


El motor NO debe ejecutar automáticamente:

RECHAZAR LOTE


solo porque existe una desviación.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. CASOS LÍMITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe controlar:

- medición sin criterio;
- criterio sin medición;
- valor fuera del rango permitido;
- unidad incompatible;
- criterio inactivo;
- más de un criterio potencialmente aplicable;
- cambio de criterio;
- inspección histórica;
- medición modificada;
- criterio inexistente.


Si existen múltiples criterios potencialmente aplicables y el sistema
no puede determinar inequívocamente cuál corresponde:

NO seleccionar uno arbitrariamente.

Debe impedir la evaluación automática y señalar la configuración
ambigua.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. FUERA DE ALCANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No construir en esta etapa:

- decisiones automáticas sobre el lote;
- recomendaciones comerciales completas;
- IA;
- predicciones;
- análisis estadístico avanzado;
- comparación histórica avanzada;
- dashboards;
- analítica;
- genealogía;
- transformaciones;
- gestión completa de decisiones.


QUALITY ENGINE entrega evaluación objetiva respecto del criterio
configurado.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] El motor puede recibir una medición válida.

[ ] Puede identificar el criterio aplicable.

[ ] Puede aplicar criterios mínimos.

[ ] Puede aplicar criterios máximos.

[ ] Puede aplicar rangos.

[ ] Puede determinar CUMPLE.

[ ] Puede determinar DESVIACIÓN.

[ ] Puede identificar SIN CRITERIO.

[ ] Conserva el criterio utilizado.

[ ] Conserva la versión/contexto del criterio.

[ ] Un cambio posterior no altera una evaluación histórica.

[ ] No inventa criterios inexistentes.

[ ] No toma automáticamente una decisión sobre el lote.

[ ] Entrega el resultado a la etapa de decisiones.

[ ] Los criterios pueden configurarse sin modificar código.

[ ] Los casos ambiguos no se resuelven arbitrariamente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — CUMPLE

Configurar:

Brix mínimo 10

Ingresar:

Brix 12

→ Resultado esperado:

CUMPLE.


PRUEBA 2 — DESVIACIÓN

Configurar:

Pudrición máxima 2%

Ingresar:

Pudrición 3%

→ Resultado esperado:

DESVIACIÓN.


PRUEBA 3 — RANGO

Configurar rango válido.

Ingresar valor dentro del rango.

→ Resultado esperado:

CUMPLE.


PRUEBA 4 — SIN CRITERIO

Registrar medición sin criterio aplicable.

→ Resultado esperado:

SIN CRITERIO CONFIGURADO.


PRUEBA 5 — CRITERIO CAMBIADO

Evaluar una inspección con criterio A.

Cambiar posteriormente a criterio B.

Consultar la inspección anterior.

→ Debe conservar criterio A y su resultado original.


PRUEBA 6 — DECISIÓN

Generar una desviación.

→ El sistema no debe rechazar automáticamente el lote.


PRUEBA 7 — CRITERIOS AMBIGUOS

Configurar dos criterios potencialmente aplicables sin prioridad
inequívoca.

→ El motor no debe elegir arbitrariamente uno.


PRUEBA 8 — UNIDAD

Intentar evaluar una medición con unidad incompatible.

→ Debe impedirse la evaluación incorrecta.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

05 — QUALITY ENGINE está COMPLETADA cuando:

[ ] FOUNDATION está COMPLETADA.

[ ] MASTER DATA está COMPLETADA.

[ ] LOTS está COMPLETADA.

[ ] INSPECTIONS está COMPLETADA.

[ ] Existe el modelo de criterios.

[ ] Los criterios configurables funcionan.

[ ] Funcionan criterios mínimos.

[ ] Funcionan criterios máximos.

[ ] Funcionan rangos.

[ ] Funciona la identificación del criterio aplicable.

[ ] Funciona CUMPLE.

[ ] Funciona DESVIACIÓN.

[ ] Funciona SIN CRITERIO.

[ ] Se conserva el criterio utilizado.

[ ] Se conserva el contexto histórico.

[ ] Cambios posteriores de criterio no reinterpretan el pasado.

[ ] El motor no toma decisiones automáticamente sobre el lote.

[ ] Las pruebas de aceptación están aprobadas.

[ ] No existen errores críticos pendientes.

[ ] No se han construido funcionalidades pertenecientes a DECISIONS,
    TRACEABILITY, TRANSFORMATIONS u ANALYTICS.

[ ] BUILD_STATUS.md fue actualizado.

[ ] 05 — QUALITY ENGINE queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 05_QUALITY_ENGINE.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━