# QUALITYNX — IA PROTOCOL

## 1. OBJETIVO

Este protocolo define cómo debe trabajar una IA dentro de QualityNX.

La IA debe utilizar la documentación existente para comprender el contexto, ejecutar la tarea solicitada y verificar el resultado.

El protocolo prioriza:

* ejecución;
* precisión;
* contexto mínimo;
* trazabilidad;
* avance controlado.

---

## 2. IDIOMA

Idioma principal:

ESPAÑOL.

El agente debe responder y documentar en español.

Inglés solamente para:

* código;
* comandos;
* nombres de paquetes;
* APIs;
* nombres propios de herramientas;
* convenciones técnicas.

---

## 3. INICIO DE SESIÓN

Al comenzar una nueva sesión:

1. Leer AGENTS.md.
2. Leer docs/IA_PROTOCOL.md.
3. Leer docs/00_CONTEXT.md.
4. Leer docs/BUILD_ORDER.md.
5. Leer docs/BUILD_STATUS.md.
6. Determinar la etapa activa.
7. Leer la BUILD SPEC de esa etapa.

Después de esto:

NO volver a cargar automáticamente toda la documentación.

Consultar solamente lo necesario para la tarea.

---

## 4. DETERMINAR LA TAREA

Antes de actuar identificar:

TAREA
↓
ETAPA
↓
DEPENDENCIAS
↓
ARCHIVOS AFECTADOS
↓
CRITERIO DE TERMINACIÓN

Si la tarea es clara y segura:

EJECUTAR.

Si falta información funcional crítica:

PREGUNTAR.

No preguntar información que ya pueda obtenerse leyendo el repositorio o la documentación.

---

## 5. PROTOCOLO DE EJECUCIÓN

Toda tarea debe seguir:

### FASE 1 — INSPECCIÓN

Revisar solamente lo necesario.

Ejemplo:

* estructura;
* versiones;
* package.json;
* configuración;
* archivos relacionados.

### FASE 2 — DECISIÓN

Determinar qué debe hacerse.

Si la solución está definida:

continuar.

Si existe una contradicción:

detenerse y consultar.

### FASE 3 — EJECUCIÓN

Realizar la acción.

No quedarse indefinidamente en planificación.

### FASE 4 — VERIFICACIÓN

Comprobar que la acción funcionó.

### FASE 5 — ESTADO

Informar:

* realizado;
* resultado;
* pendientes;
* siguiente acción.

---

## 6. INSTALACIÓN DEL ENTORNO

Cuando la tarea sea preparar el entorno:

INSPECCIONAR
↓
DETECTAR INSTALADO
↓
DETERMINAR FALTANTE
↓
INSTALAR
↓
VERIFICAR
↓
CONTINUAR

No detenerse después de detectar una dependencia faltante si la instalación ya está autorizada.

No instalar herramientas innecesarias.

No instalar versiones arbitrarias si el proyecto ya define una versión compatible.

Preferir:

* versiones LTS cuando corresponda;
* dependencias locales;
* configuración reproducible;
* package.json/package-lock como fuente del entorno Node.

No instalar globalmente una dependencia que pueda administrarse dentro del proyecto.

---

## 7. CUÁNDO DETENERSE

La IA debe detenerse y pedir decisión solamente cuando:

* falta una definición funcional importante;
* existe contradicción entre fuentes de verdad;
* una acción puede destruir información;
* una acción puede generar un costo;
* se requieren credenciales no disponibles;
* se debe cambiar una decisión arquitectónica;
* existe riesgo significativo para información existente.

No detenerse por:

* instalar una dependencia autorizada;
* crear carpetas;
* crear archivos;
* ejecutar comandos normales;
* instalar dependencias definidas por el proyecto;
* ejecutar pruebas;
* corregir errores derivados de la implementación actual.

---

## 8. COMUNICACIÓN DURANTE EL TRABAJO

Cuando la tarea esté en ejecución, utilizar mensajes breves.

Formato recomendado:

ESTADO:
...

REALIZADO:
...

PROBLEMA:
...

SIGUIENTE:
...

No entregar explicaciones extensas mientras una operación está en curso.

Si el usuario pidió trabajar paso a paso, ejecutar un paso y esperar la confirmación cuando corresponda.

---

## 9. DESARROLLO POR ETAPAS

La IA debe respetar BUILD_ORDER.md.

No construir una etapa posterior antes de cerrar sus dependencias.

Flujo:

BUILD_STATUS
↓
ETAPA ACTIVA
↓
BUILD SPEC
↓
IMPLEMENTACIÓN
↓
PRUEBAS
↓
DEFINITION OF DONE
↓
BUILD_STATUS
↓
SIGUIENTE ETAPA

---

## 10. USO DE CURRENT

CURRENT.md es la fuente maestra.

Debe utilizarse para:

* resolver dudas;
* verificar definiciones;
* comprobar reglas;
* recuperar contexto completo;
* detectar contradicciones.

No utilizar CURRENT como lista diaria de tareas.

No copiar CURRENT completo a una BUILD SPEC.

---

## 11. USO DE BUILD SPEC

La BUILD SPEC de la etapa activa debe ser suficiente para ejecutar la etapa.

Debe indicar:

* objetivo;
* dependencias;
* alcance;
* entidades;
* reglas;
* flujo;
* criterios de aceptación;
* pruebas;
* Definition of Done.

Si la BUILD SPEC contradice CURRENT:

detenerse y reportar.

---

## 12. DECISIONES

Una decisión relevante debe registrarse en DECISIONS.md.

Registrar:

* problema;
* decisión;
* motivo;
* impacto;
* fecha o contexto cuando sea relevante.

Una recomendación del agente no se convierte automáticamente en una decisión del producto.

---

## 13. CAMBIOS DE ALCANCE

Si durante la implementación aparece una mejora no contemplada:

NO implementarla automáticamente.

Clasificar como:

* PENDIENTE;
* MEJORA;
* NUEVA FUNCIONALIDAD;
* DECISIÓN REQUERIDA.

Continuar con el alcance actual siempre que sea posible.

---

## 14. PRUEBAS

Después de una implementación:

1. ejecutar pruebas específicas;
2. verificar el flujo principal;
3. revisar errores;
4. revisar regresiones relevantes;
5. comprobar Definition of Done.

Si las pruebas fallan:

NO declarar la etapa completada.

---

## 15. ACTUALIZACIÓN DEL ESTADO

BUILD_STATUS.md debe mantenerse actualizado.

Durante una etapa:

EN DESARROLLO

Al completar:

COMPLETADA

Si existe bloqueo:

BLOQUEADA

Si falta definición:

PENDIENTE DE DECISIÓN

Registrar solamente información útil para continuar el trabajo.

---

## 16. TRANSICIÓN

Una etapa puede cerrarse solamente cuando:

* implementación terminada;
* pruebas ejecutadas;
* criterios de aceptación cumplidos;
* Definition of Done cumplida;
* pendientes bloqueantes resueltos;
* BUILD_STATUS actualizado.

Después:

cargar la siguiente BUILD SPEC.

No comenzar la siguiente etapa antes del cierre.

---

## 17. REGLA DE EFICIENCIA

El contexto debe ser mínimo pero suficiente.

La IA debe evitar:

* leer repetidamente los mismos archivos;
* explicar nuevamente el proyecto;
* analizar documentación que no corresponde a la tarea;
* instalar herramientas innecesarias;
* crear soluciones temporales cuando existe una arquitectura definida;
* permanecer en planificación cuando puede ejecutar.

La IA debe avanzar de forma incremental y verificable.

---

## 18. PRINCIPIO FINAL

QualityNX se construye:

UNA ETAPA
→
UNA IMPLEMENTACIÓN
→
UNA VERIFICACIÓN
→
UN CIERRE
→
SIGUIENTE ETAPA.

La IA debe priorizar:

1. Comprender.
2. Ejecutar.
3. Verificar.
4. Documentar.
5. Avanzar.

No producir texto por producir texto.
No analizar por analizar.
No esperar sin motivo.
No inventar decisiones.
No saltar etapas.
