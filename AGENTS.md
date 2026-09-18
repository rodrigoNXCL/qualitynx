# QUALITYNX — AGENTS.md

## 1. PROPÓSITO

Este archivo contiene las reglas permanentes que debe respetar cualquier agente de IA que trabaje sobre QualityNX.

No define el producto ni describe el proceso completo de trabajo.

* `CURRENT.md` define el producto.
* `IA_PROTOCOL.md` define cómo trabaja la IA.
* `BUILD_ORDER.md` define el orden de construcción.
* `BUILD_STATUS.md` define el estado actual.
* Las BUILD SPECS definen cada etapa.
* `DECISIONS.md` conserva las decisiones relevantes.

---

## 2. IDIOMA

El idioma de trabajo de QualityNX es ESPAÑOL.

El agente debe:

* comunicarse en español;
* analizar en español;
* documentar en español.

Se mantiene inglés únicamente cuando corresponda a:

* código;
* comandos;
* nombres de paquetes;
* APIs;
* nombres propios de herramientas;
* convenciones técnicas.

---

## 3. FUENTE DE VERDAD

La definición funcional de QualityNX tiene como fuente maestra:

`CURRENT.md`

Las BUILD SPECS no reemplazan al CURRENT.

Si existe una contradicción entre documentos:

1. verificar `CURRENT.md`;
2. verificar `DECISIONS.md`;
3. verificar el contexto y estado de construcción;
4. no resolver arbitrariamente una contradicción funcional.

Si la contradicción no puede resolverse:

`PENDIENTE DE DECISIÓN`

---

## 4. NO INVENTAR

El agente no debe inventar ni asumir sin fundamento:

* entidades;
* relaciones;
* estados;
* reglas de negocio;
* flujos;
* permisos;
* criterios de calidad;
* decisiones comerciales;
* comportamiento funcional;
* arquitectura no definida.

Cuando algo no esté definido:

`NO DEFINIDO`

Cuando sea necesario para continuar:

`PENDIENTE DE DECISIÓN`

---

## 5. RESPETAR EL ALCANCE

El agente debe trabajar dentro del alcance de la tarea y de la etapa activa.

No debe:

* adelantar etapas;
* implementar funcionalidades futuras;
* ampliar el alcance por iniciativa propia;
* introducir módulos no solicitados;
* convertir una mejora conveniente en una obligación del producto.

Una necesidad nueva debe registrarse como pendiente, mejora o decisión según corresponda.

---

## 6. ORDEN DE CONSTRUCCIÓN

El orden establecido en `BUILD_ORDER.md` debe respetarse.

Una etapa posterior no debe comenzar mientras sus dependencias no estén correctamente cerradas.

La facilidad técnica no justifica saltarse una dependencia funcional.

---

## 7. CAMBIOS FUNCIONALES

No modificar silenciosamente una definición existente.

Antes de realizar un cambio funcional relevante, verificar:

* `CURRENT.md`;
* BUILD SPEC correspondiente;
* `DECISIONS.md`;
* impacto sobre etapas anteriores.

Si el cambio altera una definición del producto, debe quedar documentado.

---

## 8. CÓDIGO

El código debe implementar la definición vigente.

El agente debe evitar:

* refactorizaciones fuera de alcance;
* dependencias innecesarias;
* duplicación de lógica;
* cambios arquitectónicos no definidos;
* eliminación de funcionalidad existente sin verificar impacto.

La implementación no debe modificar el significado del producto para facilitar el desarrollo.

---

## 9. DATOS Y TRAZABILIDAD

QualityNX debe preservar la integridad de la información y de las relaciones definidas por el sistema.

No eliminar, sobrescribir ni alterar información histórica cuando la definición exige conservarla.

Las relaciones relevantes entre información operacional, inspecciones, mediciones, evidencia, resultados, decisiones y eventos deben mantenerse trazables.

---

## 10. SEGURIDAD

No ejecutar acciones destructivas sin autorización cuando exista riesgo de pérdida.

Esto incluye, entre otros:

* eliminación de datos;
* eliminación de archivos;
* eliminación de bases de datos;
* modificación irreversible de recursos;
* exposición de credenciales;
* acciones externas con costo.

Las credenciales y secretos nunca deben incorporarse al código ni al repositorio.

## 10.1. SUPABASE / INFRAESTRUCTURA EXTERNA

El agente puede preparar, revisar y validar artefactos relacionados con
Supabase, incluyendo modelos, SQL y migraciones.

No puede asumir la existencia de:

- una instancia Supabase;
- credenciales;
- tablas;
- políticas RLS;
- buckets;
- usuarios;
- configuraciones externas.

La creación, configuración o conexión de Supabase requiere que el usuario
proporcione explícitamente el acceso necesario o indique que dicha acción
puede realizarse.

El agente debe:

- identificar qué requiere Supabase;
- preparar lo que pueda realizarse desde el repositorio;
- informar claramente qué debe realizar el usuario;
- verificar la conexión únicamente cuando exista acceso real.

Nunca debe:

- inventar credenciales;
- incorporar secretos al repositorio;
- declarar creada una instancia que no haya verificado;
- declarar ejecutada una migración que no haya ejecutado y comprobado;
- asumir que las tablas o políticas existen;
- generar trabajo adicional de base de datos sin necesidad definida.

Si Supabase constituye un bloqueo para la etapa actual:

BLOQUEO:
[qué necesita]

ACCIÓN DEL USUARIO:
[qué debe realizar]

Una vez resuelto el bloqueo, continuar con la etapa activa.

---

## 11. INSTALACIÓN

Cuando una instalación haya sido solicitada y sea necesaria para la tarea, el agente debe:

* verificar primero el entorno;
* determinar qué falta;
* instalar únicamente lo necesario;
* verificar el resultado.

No instalar herramientas o dependencias innecesarias.

No solicitar autorización repetidamente para acciones normales que ya fueron autorizadas explícitamente por el usuario.

Detenerse únicamente ante:

* riesgo destructivo;
* costo;
* credenciales;
* cambio arquitectónico;
* información insuficiente.

---

## 12. CALIDAD

El código funcionando parcialmente no significa que una etapa esté terminada.

Una etapa debe cumplir:

* alcance definido;
* criterios de aceptación;
* pruebas correspondientes;
* Definition of Done.

No declarar una etapa completada si existen pendientes que impiden cumplir su Definition of Done.

---

## 13. DOCUMENTACIÓN

Cada documento debe mantener una responsabilidad clara.

`CURRENT.md`
→ fuente maestra completa.

`00_CONTEXT.md`
→ contexto mínimo permanente.

`BUILD_ORDER.md`
→ orden y dependencias.

`BUILD_STATUS.md`
→ estado vivo.

BUILD SPEC
→ construcción de una etapa.

`DECISIONS.md`
→ decisiones relevantes.

`IA_PROTOCOL.md`
→ protocolo operativo de la IA.

`AGENTS.md`
→ reglas permanentes del agente.

No duplicar información entre documentos sin necesidad.

---

## 14. COMPORTAMIENTO

El agente debe priorizar:

* precisión;
* ejecución;
* simplicidad;
* trazabilidad;
* verificación.

Debe analizar antes de modificar, pero no permanecer indefinidamente en planificación cuando existe información suficiente para ejecutar una acción segura.

Debe informar incertidumbres y problemas reales.

No debe ocultar errores ni declarar éxito sin verificar.

---

## 15. PRINCIPIO FINAL

QualityNX se construye de forma incremental.

Una etapa correctamente implementada y verificada es preferible a múltiples etapas parcialmente construidas.

Ante conflicto entre velocidad y coherencia:

`PRIORIZAR COHERENCIA.`

Ante incertidumbre:

`NO INVENTAR.`

Ante contradicción:

`NO OCULTAR.`

Ante cambio de alcance:

`NO ASUMIR.`

Ante una etapa incompleta:

`NO AVANZAR.`
