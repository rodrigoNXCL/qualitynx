# 11_ANALYTICS.md

# NX QUALITY — ANALYTICS

Versión: 1.0
Etapa: 11 — ANALYTICS
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANALYTICS transforma la información histórica acumulada por QualityNX
en información útil para comprender comportamiento, detectar cambios
y respaldar decisiones.

No busca mostrar más datos.

Busca responder:

¿QUÉ ESTÁ PASANDO?

¿CÓMO SE COMPORTA?

¿QUÉ CAMBIÓ?

¿RESPECTO DE QUÉ?

¿QUÉ PODRÍA REQUERIR ATENCIÓN?

¿QUÉ INFORMACIÓN RESPALDA UNA DECISIÓN?


Principio:

DATOS
↓
HISTORIA
↓
COMPARACIÓN
↓
CONTEXTO
↓
DESVIACIÓN
↓
INFORMACIÓN ÚTIL
↓
DECISIÓN


QualityNX no reemplaza el criterio profesional.

El sistema entrega información, contexto, alertas y recomendaciones.


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
10 — OPERATIONAL VIEW


ANALYTICS utiliza información ya registrada.

No debe convertirse en una fuente alternativa de datos.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir capacidad para analizar información histórica y
operacional según el contexto disponible.

Como mínimo debe permitir:

- comparar resultados;
- analizar comportamiento histórico;
- detectar cambios relevantes;
- identificar desviaciones;
- contextualizar resultados actuales;
- consultar comportamiento por dimensiones relevantes;
- generar información útil para decisiones;
- acceder desde un resultado analítico a su información de origen.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. DIMENSIONES DE ANÁLISIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las dimensiones disponibles para contextualizar análisis incluyen:

- productor;
- variedad;
- temporada;
- campo;
- bloque;
- punto de evaluación;
- otros lotes similares.


No todos los análisis deben utilizar todas las dimensiones.


La selección debe depender de la pregunta que se intenta responder.


Ejemplo:

PRODUCTOR + VARIEDAD + TEMPORADA

puede ser adecuado para un análisis.


CAMPO + BLOQUE + PUNTO DE EVALUACIÓN

puede ser más adecuado para otro.


"TODAS" significa que las dimensiones están disponibles para
contextualizar.

NO significa que deban utilizarse simultáneamente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. COMPARACIÓN HISTÓRICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QualityNX debe poder comparar un resultado actual con antecedentes
históricos relevantes.


Ejemplo:

HISTORIAL

Productor X
Variedad Duke

Resultados anteriores:
mayoritariamente Premium


NUEVO EVENTO

Resultado significativamente inferior


ANALYTICS:

Detecta diferencia respecto del comportamiento histórico.


La diferencia NO equivale automáticamente a incumplimiento.


Debe distinguirse:

CRITERIO DE ACEPTACIÓN

de

COMPORTAMIENTO HISTÓRICO.


Un productor que históricamente obtiene 85% Premium y posteriormente
obtiene 40% Premium presenta una desviación histórica.

Eso no significa por sí solo que haya incumplido un criterio de
aceptación.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. CONTEXTO TEMPORAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los análisis deben conservar el contexto temporal de los datos.


Debe ser posible distinguir:

- fecha;
- temporada;
- etapa;
- evaluación;
- condición registrada en ese momento.


Un criterio de calidad posterior no debe reinterpretar históricamente
un resultado obtenido bajo una configuración anterior.


Ejemplo:

CRITERIO HISTÓRICO:
Pudrición máxima 2%


NUEVO CRITERIO:
Pudrición máxima 3%


Una inspección anterior debe continuar interpretándose según el
criterio vigente cuando fue realizada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. TIPOS DE ANÁLISIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La primera versión debe permitir como mínimo:

A. COMPARACIÓN ACTUAL VS HISTORIAL

Comparar un resultado actual con resultados históricos relevantes.


B. COMPARACIÓN ENTRE LOTES

Comparar lotes relacionados por dimensiones comunes.


C. COMPARACIÓN ENTRE PRODUCTORES

Identificar diferencias de comportamiento entre productores cuando
exista información suficiente.


D. COMPARACIÓN ENTRE VARIEDADES

Analizar comportamiento de una variedad respecto de otras o de su
propio historial cuando corresponda.


E. COMPARACIÓN ENTRE TEMPORADAS

Analizar evolución entre temporadas cuando exista información
comparable.


F. COMPARACIÓN ENTRE ETAPAS

Analizar cómo cambia una condición entre puntos de evaluación.


G. DETECCIÓN DE CAMBIOS RELEVANTES

Identificar diferencias importantes respecto de antecedentes
comparables.


Estos análisis deben utilizar solamente información que sea
válidamente comparable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. DETECCIÓN DE DESVIACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una desviación puede surgir por:

- incumplimiento de criterio;
- diferencia respecto del historial;
- cambio significativo respecto de una evaluación anterior;
- comportamiento diferente de lotes comparables.


Debe distinguirse el origen de la desviación.


Ejemplo:

DESVIACIÓN DE CRITERIO

Resultado:
3%

Criterio máximo:
2%


Diferente:

DESVIACIÓN HISTÓRICA

Resultado actual:
40% Premium

Historial comparable:
85% Premium


No deben presentarse ambas como si fueran el mismo fenómeno.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. ALERTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANALYTICS puede generar información que alimente alertas.


Como mínimo deben poder derivarse alertas por:

- resultado fuera de criterio;
- resultado inferior/superior al histórico;
- cambio relevante respecto de evaluación anterior;
- falta de evaluación esperada;
- posible duplicado;
- situación operacional relevante.


Las alertas deben indicar el contexto suficiente para comprender por qué
fueron generadas.


Una alerta no equivale a una decisión.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. RECOMENDACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QualityNX debe poder generar recomendaciones contextuales desde el
MVP.


La recomendación debe basarse inicialmente en:

- información disponible;
- criterios configurados;
- resultados;
- comparaciones;
- historial.


Flujo:

DATOS
↓
REGLAS / CRITERIOS
↓
COMPARACIÓN
↓
DETECCIÓN
↓
RECOMENDACIÓN


Ejemplo conceptual:

Resultado actual significativamente inferior al comportamiento
histórico.

↓

RECOMENDACIÓN:

"Revisar comportamiento del lote respecto de antecedentes históricos."


La recomendación NO debe ser:

"RECHAZAR LOTE"


La decisión continúa perteneciendo al usuario responsable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. DIFERENCIA ENTRE RECOMENDACIÓN Y DECISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema puede:

- detectar;
- comparar;
- alertar;
- contextualizar;
- recomendar.


El sistema NO debe tomar autónomamente decisiones operacionales.


Debe mantenerse claramente:

QUALITYNX
↓
INFORMACIÓN + CONTEXTO + RECOMENDACIÓN

USUARIO
↓
DECISIÓN


La recomendación debe poder ser consultada junto con sus antecedentes.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. CALIDAD DE LA COMPARACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No todo dato histórico es automáticamente comparable.


Antes de utilizar información histórica debe considerarse el contexto
disponible, incluyendo cuando corresponda:

- productor;
- variedad;
- temporada;
- campo;
- bloque;
- punto de evaluación;
- condición/criterio aplicable;
- etapa.


No debe compararse información incompatible solamente porque existe.


Si no existe información suficiente para una comparación confiable:

NO generar una conclusión como si fuera válida.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. CANTIDAD MÍNIMA DE INFORMACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Un análisis debe contar con información suficiente para producir una
comparación significativa.


No se debe presentar una tendencia como concluyente cuando existe una
muestra insuficiente.


Cuando corresponda, el sistema debe indicar que la información
disponible es limitada.


La definición matemática exacta de mínimos estadísticos no queda
establecida en esta etapa.


No inventar umbrales estadísticos.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. RESULTADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los resultados analíticos deben permitir identificar:

- qué se analizó;
- período;
- contexto;
- resultado;
- comparación utilizada;
- desviación detectada cuando exista;
- información que respalda la conclusión.


Cuando sea posible, el usuario debe poder navegar desde el resultado
hacia los registros que lo originaron.


ANALYTICS no debe producir conclusiones que no puedan relacionarse con
los datos de origen.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. INFORMACIÓN PARA DECISIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El objetivo final del análisis es respaldar decisiones:

TÉCNICAS

OPERACIONALES

COMERCIALES


Ejemplos de preguntas que Analytics debe ayudar a responder:

- ¿Cómo se está comportando este lote respecto de su historial?
- ¿Este productor está mostrando un comportamiento diferente?
- ¿Una variedad presenta un cambio relevante?
- ¿En qué etapa aparece una desviación?
- ¿El comportamiento está cambiando entre temporadas?
- ¿Qué resultado requiere revisión?
- ¿Qué antecedentes respaldan una decisión?


La herramienta no debe decidir por el usuario.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. REPORTABILIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANALYTICS debe permitir transformar los análisis en información
consultable y utilizable por la empresa.


Los resultados deben poder utilizarse para:

- revisión operacional;
- análisis histórico;
- respaldo de decisiones;
- auditorías;
- reclamos;
- evaluación de comportamiento.


El alcance exacto de reportes del MVP debe mantenerse limitado a lo
necesario para demostrar esta capacidad.


No construir un sistema BI completo.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. HISTORIA Y ANALYTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANALYTICS nunca modifica la Historia Técnica.


La relación es:

HISTORIA TÉCNICA
↓
DATOS DISPONIBLES
↓
ANÁLISIS
↓
RESULTADO ANALÍTICO


Un análisis posterior no altera:

- inspecciones;
- mediciones;
- fotografías;
- decisiones;
- transformaciones;
- eventos históricos.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. CONFIGURACIÓN Y CRITERIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los criterios de aceptación pueden depender de:

- etapa;
- especie;
- variedad;
- cliente;
- mercado;
- destino;
- temporada.


La configuración vigente al momento de una inspección debe mantenerse
como contexto histórico.


ANALYTICS debe utilizar el criterio correspondiente al período y
contexto analizado.


No debe reinterpretar automáticamente información histórica con una
configuración posterior.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. MULTIEMPRESA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los análisis deben respetar completamente el aislamiento entre
empresas.


Una empresa solo puede analizar información de su propio ámbito,
según sus permisos.


Los análisis realizados para una empresa no deben incorporar datos de
otra empresa.


El SUPER ADMIN podrá acceder según las capacidades definidas en
FOUNDATION y permisos de plataforma.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. FUERA DE ALCANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No construir en esta etapa:

- IA predictiva avanzada;
- modelos de machine learning;
- decisiones autónomas;
- pronósticos productivos;
- predicción de rechazo;
- optimización comercial automática;
- BI empresarial completo;
- data warehouse independiente;
- integración con plataformas externas de analítica;
- modelos estadísticos avanzados no definidos;
- recomendaciones basadas en información no registrada en QualityNX.


La evolución hacia inteligencia predictiva podrá realizarse
posteriormente cuando exista suficiente información histórica.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Se puede consultar comportamiento histórico.

[ ] Se puede comparar información actual con antecedentes históricos.

[ ] Se pueden comparar lotes cuando exista contexto comparable.

[ ] Se puede analizar comportamiento por productor.

[ ] Se puede analizar comportamiento por variedad.

[ ] Se puede comparar temporadas.

[ ] Se puede analizar comportamiento entre etapas.

[ ] Se pueden detectar cambios relevantes.

[ ] Se distinguen desviaciones de criterio y desviaciones históricas.

[ ] Las comparaciones utilizan contexto relevante.

[ ] No se presentan comparaciones inválidas como conclusiones.

[ ] Las recomendaciones utilizan información registrada.

[ ] Las recomendaciones se diferencian claramente de decisiones.

[ ] El usuario puede consultar los antecedentes de una recomendación.

[ ] Los análisis respetan el contexto temporal de los criterios.

[ ] Los análisis no modifican la Historia Técnica.

[ ] Los análisis respetan aislamiento entre empresas.

[ ] La información analítica puede utilizarse para respaldar decisiones.

[ ] No se generan decisiones autónomas.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
22. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — HISTORIAL

Consultar el comportamiento histórico de un productor y variedad.

→ Deben mostrarse únicamente datos pertenecientes al contexto
seleccionado.


PRUEBA 2 — COMPARACIÓN

Comparar resultado actual contra historial comparable.

→ Debe mostrarse la comparación y su contexto.


PRUEBA 3 — DESVIACIÓN HISTÓRICA

Resultado actual significativamente diferente al historial.

→ Debe identificarse como desviación histórica.


PRUEBA 4 — CRITERIO

Resultado fuera del criterio configurado.

→ Debe identificarse como desviación de criterio.


PRUEBA 5 — DISTINCIÓN

Resultado inferior al historial pero dentro del criterio.

→ No debe presentarse automáticamente como incumplimiento.


PRUEBA 6 — CRITERIO HISTÓRICO

Modificar posteriormente un criterio.

→ Los análisis históricos deben conservar el contexto correspondiente
a la evaluación original.


PRUEBA 7 — CONTEXTO INSUFICIENTE

Intentar generar comparación sin información suficiente.

→ No debe presentarse una conclusión engañosa.


PRUEBA 8 — RECOMENDACIÓN

Existe una desviación relevante.

→ Puede generarse recomendación contextual.


PRUEBA 9 — DECISIÓN

Existe una recomendación.

→ El sistema no debe convertirla automáticamente en decisión.


PRUEBA 10 — ORIGEN

Abrir antecedentes de un resultado analítico.

→ Deben poder identificarse los registros que lo sustentan.


PRUEBA 11 — HISTORIA

Ejecutar análisis.

→ No debe modificarse ningún registro histórico.


PRUEBA 12 — MULTIEMPRESA

Usuario de empresa A ejecuta análisis.

→ No deben aparecer datos de empresa B.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
23. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

11 — ANALYTICS está COMPLETADA cuando:

[ ] Todas las etapas anteriores están COMPLETADAS.

[ ] Existe análisis histórico.

[ ] Existe comparación contextual.

[ ] Existen comparaciones entre lotes cuando corresponda.

[ ] Existe análisis por productor.

[ ] Existe análisis por variedad.

[ ] Existe comparación entre temporadas.

[ ] Existe análisis entre etapas.

[ ] Se detectan cambios relevantes.

[ ] Se distinguen desviaciones de criterio e históricas.

[ ] Las comparaciones utilizan contexto válido.

[ ] Se generan recomendaciones contextuales.

[ ] Las recomendaciones no reemplazan decisiones humanas.

[ ] Los resultados analíticos pueden rastrearse hasta sus antecedentes.

[ ] Se conserva el contexto temporal de los criterios.

[ ] Se respeta el aislamiento multiempresa.

[ ] Analytics no modifica la Historia Técnica.

[ ] Todas las pruebas de aceptación están aprobadas.

[ ] No existen errores críticos pendientes.

[ ] No se han incorporado modelos predictivos o funcionalidades fuera
    del alcance definido.

[ ] BUILD_STATUS.md fue actualizado.

[ ] 11 — ANALYTICS queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 11_ANALYTICS.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━