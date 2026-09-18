# CURRENT.md

# NX QUALITY

Versión: CURRENT-INITIAL-1.0
Estado: BASE FUNCIONAL PARA DESARROLLO
Naturaleza: Documento funcional y conceptual
Fecha: 2026-08-10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. IDENTIDAD DEL PROYECTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nombre:
NX Quality

Nombre de trabajo anterior:
qualityNX

Propósito:

NX Quality es un sistema de gestión de calidad y trazabilidad operacional
orientado principalmente a empresas exportadoras, prestadores de servicios
de inspección y organizaciones que necesitan controlar la calidad de fruta
durante distintas etapas de su proceso.

El propósito principal NO es almacenar grandes cantidades de información.

El propósito es transformar la información generada durante las inspecciones
en respaldo para decisiones comerciales y operacionales.

El sistema debe relacionar:

- lote;
- productor;
- variedad;
- cosecha;
- etapa;
- inspección;
- mediciones;
- observaciones;
- fotografías;
- criterios aplicables;
- resultados;
- decisiones;
- acciones posteriores;
- trazabilidad histórica.

La información debe permanecer relacionada.

Una fotografía no debe quedar separada de la inspección.

Una observación no debe quedar separada del lote.

Una decisión no debe quedar separada del resultado que la originó.

Una inspección no debe quedar separada de su criterio aplicable.

Una modificación del lote no debe destruir su historia.

Principio central:

"CONVERTIR INFORMACIÓN DE CALIDAD EN RESPALDO PARA DECISIONES."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. ESTADO ACTUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estado:

Diseño funcional inicial terminado.

El sistema se encuentra en etapa de definición previa al desarrollo.

Este CURRENT constituye la fuente principal de verdad funcional para iniciar
la construcción del MVP.

No se requiere una nueva ronda de definición para comenzar la arquitectura
y desarrollo inicial.

Los detalles adicionales que aparezcan posteriormente deberán incorporarse
como evolución controlada del producto y no deberán alterar silenciosamente
las decisiones establecidas en este documento.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. CLASIFICACIÓN DE DEFINICIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Durante este documento se utilizan cuatro categorías:

DECIDIDO
Regla o comportamiento confirmado para el proyecto.

VERIFICADO
Información respaldada por una fuente externa identificable.

PROPUESTO
Alternativa funcional recomendada pero que no constituye todavía una regla
del sistema.

CONFIGURABLE
Comportamiento que el sistema debe permitir parametrizar porque no existe
un único valor universal.

SUPUESTO
Condición utilizada para poder modelar una parte del sistema cuando no
existe todavía una especificación externa definitiva.

El desarrollo no debe convertir PROPUESTO o SUPUESTO en regla de negocio
sin una decisión posterior.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. PROBLEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actualmente la información de calidad puede encontrarse distribuida entre:

- formularios;
- planillas;
- fotografías;
- correos;
- WhatsApp;
- documentos;
- registros manuales;
- sistemas independientes.

Esto provoca que la información exista pero no necesariamente esté
relacionada.

El problema no es solamente registrar una inspección.

El problema es poder responder posteriormente:

- qué ocurrió;
- sobre qué lote;
- cuándo ocurrió;
- dónde ocurrió;
- quién lo registró;
- qué se observó;
- qué fotografías respaldan la observación;
- contra qué criterio se evaluó;
- qué resultado produjo;
- qué decisión se tomó;
- por qué se tomó;
- qué ocurrió posteriormente.

La ausencia de esta relación obliga a las personas a reconstruir
manualmente la historia navegando entre distintas fuentes.

Esto afecta:

- velocidad de decisión;
- trazabilidad;
- control operacional;
- capacidad de respuesta ante reclamos;
- respaldo comercial;
- análisis de problemas;
- seguimiento de lotes;
- auditoría.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. OBJETIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality debe permitir construir una Historia Técnica de cada lote.

La Historia Técnica debe permitir reconstruir cronológicamente:

ORIGEN
↓
COSECHA
↓
RECEPCIÓN / PROCESO
↓
INSPECCIÓN
↓
RESULTADOS
↓
EVIDENCIA
↓
DECISIÓN
↓
ACCIÓN
↓
NUEVO EVENTO
↓
RESULTADO POSTERIOR

El objetivo no es únicamente consultar datos.

El objetivo es utilizar la información relacionada para respaldar
decisiones operacionales y comerciales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. USUARIOS Y ACTORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6.1 EMPRESA CLIENTE

Puede corresponder principalmente a:

- exportadora;
- empresa comercializadora;
- empresa procesadora;
- prestador de servicios de inspección;
- organización que gestione calidad para terceros.

La empresa constituye el límite lógico de los datos.

Una empresa no debe acceder a información perteneciente a otra empresa.

6.2 ADMINISTRADOR DE EMPRESA

Responsabilidades:

- administrar la organización;
- administrar usuarios;
- administrar productores;
- administrar especies;
- administrar variedades;
- configurar criterios;
- consultar información;
- revisar inspecciones;
- revisar historial;
- consultar decisiones;
- acceder a reportes según permisos.

6.3 INSPECTOR

Responsabilidades:

- identificar el lote;
- ejecutar inspecciones;
- registrar resultados;
- registrar mediciones;
- registrar observaciones;
- capturar fotografías;
- asociar evidencia;
- registrar incidencias;
- finalizar inspecciones.

Debe poder trabajar en terreno con conectividad limitada o inexistente.

6.4 USUARIO DE CALIDAD / SUPERVISOR

Responsabilidades:

- revisar inspecciones;
- revisar resultados;
- revisar evidencia;
- analizar tendencias;
- validar decisiones;
- revisar desviaciones;
- consultar historial técnico;
- respaldar decisiones comerciales y operacionales.

6.5 USUARIO COMERCIAL / OPERACIONAL

Puede consultar información autorizada para tomar decisiones respecto de:

- aceptación;
- rechazo;
- destino;
- continuidad;
- segregación;
- reproceso;
- liberación;
- observación;
- seguimiento.

No necesariamente tiene permiso para modificar información técnica.

6.6 PRODUCTOR

Es un actor de negocio relacionado con los lotes.

No necesariamente necesita ser usuario del sistema.

Un productor puede tener múltiples cosechas y múltiples lotes.

6.7 SISTEMAS EXTERNOS

Los sistemas externos no forman parte del núcleo del MVP.

Podrán integrarse posteriormente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. MODELO MULTIEMPRESA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality es MULTIEMPRESA.

Cada empresa posee su propio espacio lógico de información.

Una empresa puede:

- crear productores;
- registrar especies;
- registrar variedades;
- registrar lotes;
- crear inspecciones;
- registrar usuarios;
- configurar criterios;
- consultar historial;
- generar decisiones.

Los datos deben estar aislados entre organizaciones.

El modelo de autorización debe impedir que un usuario de una empresa
consulte o modifique información perteneciente a otra.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. LOTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El lote es una de las entidades centrales del sistema.

Definición funcional establecida:

LOTE TRAZABLE =
PRODUCTOR
+
VARIEDAD
+
FECHA DE FRUTA
+
BLOQUE DE COSECHA

Un mismo productor puede tener varias cosechas durante un mismo día
para una misma variedad.

Por lo tanto:

PRODUCTOR
+
VARIEDAD
+
FECHA
NO necesariamente identifica por sí solo un lote.

El bloque de cosecha permite distinguir unidades trazables diferentes.

El sistema debe conservar la relación entre:

- productor;
- especie;
- variedad;
- fecha de fruta;
- bloque de cosecha;
- lote;
- eventos posteriores.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. HISTORIA TÉCNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La Historia Técnica es la representación cronológica y relacionada de
todos los eventos relevantes asociados a un lote.

Debe permitir consultar:

- origen;
- identificación;
- eventos;
- inspecciones;
- mediciones;
- observaciones;
- fotografías;
- criterios;
- resultados;
- decisiones;
- acciones;
- derivaciones;
- lotes origen;
- lotes derivados.

La Historia Técnica NO debe ser simplemente una lista de inspecciones.

Debe representar relaciones.

Ejemplo conceptual:

LOTE A
|
+-- Inspección recepción
|   +-- mediciones
|   +-- fotografías
|   +-- observaciones
|   +-- resultado
|
+-- Decisión operacional
|
+-- División
|   |
|   +-- LOTE A-1
|   |
|   +-- LOTE A-2
|
+-- Nueva inspección A-1
|
+-- Decisión comercial

La historia original no debe desaparecer cuando el lote cambia.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. EVENTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe modelar los principales hechos relevantes como eventos
relacionados con el lote.

Ejemplos:

- creación de lote;
- recepción;
- inspección;
- medición;
- observación;
- decisión;
- división;
- mezcla;
- reproceso;
- cambio de etapa;
- liberación;
- rechazo;
- segregación;
- cierre.

Los eventos deben conservar:

- fecha;
- hora cuando corresponda;
- usuario responsable;
- lote relacionado;
- información del evento;
- evidencia asociada cuando corresponda.

Los eventos históricos no deben modificarse silenciosamente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. INSPECCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección es una evaluación realizada sobre un lote en una etapa
determinada.

Una inspección debe estar asociada como mínimo a:

- lote;
- etapa;
- fecha;
- inspector;
- criterio aplicable;
- muestra;
- atributos evaluados;
- resultados;
- observaciones;
- evidencia.

Una inspección puede contener múltiples mediciones y observaciones.

Una inspección puede contener múltiples fotografías.

Cada fotografía debe quedar vinculada a su contexto correspondiente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. ETAPAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe permitir representar inspecciones en diferentes etapas
del proceso.

Las etapas deben ser configurables por empresa y/o flujo operacional.

Como concepto inicial pueden existir etapas tales como:

- campo;
- cosecha;
- recepción;
- proceso;
- packing;
- almacenamiento;
- despacho;
- preembarque.

La lista no constituye una restricción universal.

La arquitectura funcional debe permitir incorporar nuevas etapas sin
rediseñar el núcleo del sistema.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. MUESTREO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El muestreo es parte de la inspección.

El tamaño de muestra NO será una regla universal de NX Quality.

Debe depender del criterio/método de inspección aplicable.

VERIFICADO:

Las instrucciones USDA para arándanos frescos establecen un mínimo de
100 berries o el recipiente completo cuando contiene menos de 100.
Cuando un lote resulta fuera de grado por tolerancia de muestra o lote,
las instrucciones indican examinar al menos el doble, es decir, 200 berries,
o el recipiente completo cuando contiene menos de 200.

También indican reglas de selección representativa de muestras y, como
regla general, un mínimo de 1% del lote; para lotes menores de 300 paquetes,
un mínimo de 3 muestras.

QualityNX NO debe convertir estos valores en reglas universales.

Debe registrar el método que determina:

- cantidad de muestra;
- unidad;
- cantidad de submuestras;
- procedimiento;
- forma de cálculo;
- tolerancias.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. CRITERIOS DE CALIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality NO posee una única "Norma QualityNX".

Una inspección debe utilizar un CRITERIO APLICABLE.

El criterio debe poder identificar:

- fuente;
- documento;
- versión/edición;
- vigencia;
- producto;
- mercado;
- destino;
- etapa;
- alcance.

Fuentes iniciales contempladas:

- USDA;
- Codex Alimentarius;
- UNECE;
- SAG;
- especificaciones comerciales del cliente.

Una especificación comercial del cliente debe distinguirse de una norma
oficial.

Un requisito fitosanitario debe distinguirse de una especificación
comercial.

Una recomendación interna debe distinguirse de un requisito normativo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. FUENTES NORMATIVAS INICIALES VERIFICADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

15.1 USDA - Blueberries

USDA mantiene estándares específicos para blueberries.

El estándar de arándanos frescos contempla requisitos de:

- características varietales similares;
- limpieza;
- color;
- madurez;
- condición;
- ausencia de determinados defectos;
- tolerancias.

El estándar USDA actualmente indica que no existen requisitos de tamaño
dentro del grado debido a diferencias de tamaño entre variedades y
preferencias de mercado; el tamaño se determina cuando es solicitado
específicamente.

15.2 USDA - Inspection Instructions

Las instrucciones de inspección para blueberries establecen procedimientos
específicos de muestreo y evaluación.

Estos procedimientos deben ser representados como un criterio/método
específico dentro de NX Quality.

15.3 Codex CXS 349-2022

Codex CXS 349-2022 corresponde al Standard for Berry Fruits.

El documento establece requisitos para berries y contempla, entre otros
aspectos:

- requisitos mínimos;
- clasificación;
- tolerancias;
- origen;
- presentación/rotulado.

Debe utilizarse como fuente normativa independiente de USDA.

15.4 UNECE FFV-57

UNECE FFV-57 corresponde al estándar para berry fruits destinado a
comercialización y control de calidad comercial.

Incluye berries frescos y contempla requisitos mínimos y clases comerciales.

No debe confundirse con requisitos fitosanitarios.

15.5 SAG

SAG mantiene requisitos y protocolos específicos para exportación de
productos vegetales según mercado.

Para arándanos existen mecanismos y registros asociados al acceso a
Estados Unidos, incluyendo el Systems Approach.

Los requisitos SAG aplicables deben ser representados como criterios
regulatorios/fitosanitarios y no como simples atributos comerciales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. ATRIBUTOS DE CALIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX Quality debe permitir registrar diferentes tipos de atributos.

Ejemplos:

- color;
- condición;
- madurez;
- firmeza;
- Brix;
- pH;
- acidez;
- calibre/tamaño;
- peso;
- defectos;
- presencia de materia extraña;
- daño;
- pudrición;
- deshidratación;
- fruta inmadura;
- fruta sobremadura;
- condición visual;
- otros atributos definidos por criterio.

No todos los atributos aplican a todos los productos.

No todos los atributos poseen límites universales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. MEDICIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una medición representa un valor observado durante una inspección.

Debe poder registrar:

- atributo;
- valor;
- unidad;
- método cuando corresponda;
- muestra;
- instrumento cuando corresponda;
- fecha/hora;
- usuario;
- resultado respecto del criterio.

Ejemplos:

BRIX
→ medición cuantitativa.

PH
→ medición cuantitativa.

FIRMEZA
→ medición cuantitativa o clasificación según método.

PESO
→ medición cuantitativa.

CALIBRE
→ medición/clasificación según criterio.

El sistema no debe inventar límites de aceptación.

Una medición y su límite de aceptación son conceptos diferentes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. LÍMITES Y TOLERANCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Un criterio puede establecer:

- límite mínimo;
- límite máximo;
- rango;
- porcentaje máximo;
- porcentaje mínimo;
- tolerancia;
- clasificación;
- condición cualitativa;
- regla compuesta.

Los límites deben pertenecer al criterio aplicable.

No deben almacenarse como reglas universales del atributo.

Ejemplo conceptual:

ATRIBUTO:
Brix

VALOR:
11.8

CRITERIO:
Especificación comercial X

LÍMITE:
>= 12.0

RESULTADO:
NO CUMPLE

El sistema debe conservar tanto el valor observado como la regla contra
la cual fue evaluado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. QUALITY Y CONDITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando el criterio aplicable utilice la distinción entre Quality y
Condition, NX Quality debe poder representarla.

QUALITY:
características de calidad que pueden evaluarse en el producto.

CONDITION:
condiciones que pueden evolucionar durante manejo, almacenamiento o
transporte.

Esta clasificación no debe imponerse artificialmente cuando el criterio
aplicable no la utilice.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. RESULTADO DE INSPECCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección debe producir resultados verificables.

El resultado puede incluir:

- cumplimiento;
- no cumplimiento;
- cumplimiento condicionado;
- observación;
- clasificación;
- valores;
- porcentajes;
- defectos;
- conclusiones.

El sistema debe separar:

RESULTADO OBJETIVO
de
DECISIÓN HUMANA.

Ejemplo:

RESULTADO DEL CRITERIO:
NO CUMPLE

DECISIÓN DEL RESPONSABLE:
APROBADO CON OBSERVACIÓN

MOTIVO:
Especificación comercial acordada.

El sistema no debe modificar el resultado técnico para hacerlo coincidir
con la decisión humana.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. DECISIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las decisiones son parte esencial del sistema.

Una decisión puede originarse a partir de:

- inspección;
- medición;
- observación;
- historial;
- tendencia;
- condición comercial;
- requisito del cliente;
- criterio regulatorio.

Ejemplos:

- aprobar;
- rechazar;
- retener;
- segregar;
- reprocesar;
- liberar;
- solicitar nueva inspección;
- cambiar destino;
- continuar proceso;
- detener proceso.

La decisión debe conservar:

- responsable;
- fecha/hora;
- motivo;
- información que la originó;
- resultado técnico previo;
- observaciones;
- evidencia asociada cuando corresponda.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
22. EVIDENCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La evidencia es parte integral de la Historia Técnica.

Puede incluir:

- fotografías;
- documentos;
- archivos;
- observaciones;
- registros de medición;
- otros respaldos.

Las fotografías deben asociarse al contexto correspondiente.

No deben existir como archivos aislados sin relación con:

- lote;
- inspección;
- evento;
- observación;
- usuario.

La evidencia no debe ser eliminada o reemplazada silenciosamente cuando
forme parte de un registro histórico.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
23. DECISIONES BASADAS EN EVIDENCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe permitir navegar desde una decisión hacia sus respaldos.

Ejemplo:

DECISIÓN
↓
INSPECCIÓN
↓
RESULTADO
↓
MEDICIÓN
↓
FOTOGRAFÍA
↓
LOTE

Y también en sentido inverso:

LOTE
↓
HISTORIA
↓
INSPECCIONES
↓
DECISIONES
↓
EVIDENCIA

Esta relación es uno de los principales diferenciadores funcionales
del producto.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
24. MEZCLA DE LOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando dos o más lotes se mezclan, debe crearse un nuevo lote derivado.

Ejemplo:

LOTE A
+
LOTE B
↓
LOTE C

El lote C debe conservar genealogía de A y B.

Debe registrar:

- lotes origen;
- fecha/hora;
- responsable;
- motivo;
- cantidades/participaciones cuando corresponda;
- evento de mezcla.

El nuevo lote no debe falsificar su historia copiando eventos de los lotes
origen como si hubieran ocurrido directamente sobre él.

Debe existir una relación de genealogía.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
25. DIVISIÓN DE LOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Un lote puede dividirse.

Ejemplo:

LOTE A
↓
LOTE A-1
LOTE A-2

Cada lote derivado debe conservar relación con el lote origen.

La división debe registrar:

- lote origen;
- lotes resultantes;
- fecha/hora;
- responsable;
- cantidades cuando corresponda;
- motivo.

La historia del lote origen no se elimina.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
26. REPROCESO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El reproceso es un evento operacional.

Debe conservar:

- lote afectado;
- fecha/hora;
- responsable;
- motivo;
- proceso realizado;
- resultado posterior;
- inspección posterior cuando corresponda.

El reproceso no debe borrar la condición anterior.

La historia debe permitir conocer:

ANTES DEL REPROCESO
↓
REPROCESO
↓
DESPUÉS DEL REPROCESO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
27. GENEALOGÍA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe permitir reconstruir relaciones:

LOTE ORIGEN
↓
DIVISIÓN
↓
LOTE DERIVADO

LOTE A + LOTE B
↓
MEZCLA
↓
LOTE C

LOTE
↓
REPROCESO
↓
NUEVA CONDICIÓN

La genealogía es independiente de la cronología de inspecciones.

Debe ser posible seguir un lote hacia:

- sus orígenes;
- sus derivados;
- sus decisiones;
- sus inspecciones.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
28. ESTADOS DEL LOTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El lote debe poseer estado operacional.

Estados iniciales definidos:

- CREADO
- EN PROCESO
- EN INSPECCIÓN
- RETENIDO
- APROBADO
- RECHAZADO
- SEGREGADO
- EN REPROCESO
- LIBERADO
- CERRADO

Los estados deben representar situación operacional.

No deben utilizarse para reemplazar el historial de eventos.

Un cambio de estado debe generar trazabilidad.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
29. ESTADOS DE INSPECCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección debe poseer ciclo de vida.

Estados iniciales:

- BORRADOR
- EN PROCESO
- COMPLETADA
- REVISADA
- CERRADA
- ANULADA

Una inspección cerrada no debe poder modificarse silenciosamente.

Las correcciones posteriores deben conservar trazabilidad.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
30. MODIFICACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La información histórica relevante no debe sobrescribirse sin trazabilidad.

Cuando sea necesario corregir información:

- debe registrarse la modificación;
- debe conservarse el usuario;
- debe conservarse fecha/hora;
- debe conservarse el motivo cuando corresponda;
- debe mantenerse trazabilidad del valor anterior y nuevo en operaciones
  críticas.

El objetivo es poder distinguir:

DATO ORIGINAL
de
CORRECCIÓN POSTERIOR.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
31. DUPLICADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe prevenir o detectar duplicación de información crítica.

Debe considerarse especialmente:

- lote duplicado;
- inspección duplicada;
- fotografía duplicada;
- evento duplicado;
- sincronización duplicada.

El mecanismo exacto de prevención pertenece a implementación.

La regla funcional es:

Una operación enviada dos veces por problemas de conectividad no debe
crear dos hechos comerciales/técnicos idénticos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
32. OPERACIÓN OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La aplicación de terreno debe funcionar en zonas con conectividad
limitada o inexistente.

El usuario debe poder:

- consultar información previamente sincronizada;
- crear inspecciones;
- registrar mediciones;
- registrar observaciones;
- capturar fotografías;
- registrar decisiones permitidas;
- continuar trabajando sin señal.

Cuando vuelva la conectividad:

- los cambios deben sincronizarse;
- los registros deben conservar su identidad;
- no deben duplicarse;
- los conflictos deben tratarse explícitamente.

La sincronización no debe exigir que el inspector reconstruya manualmente
el trabajo realizado offline.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
33. ARQUITECTURA OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DECIDIDO:

Supabase + PostgreSQL + PowerSync + SQLite local.

PowerSync documenta integración directa con Supabase y PostgreSQL para
aplicaciones offline-first, utilizando SQLite local y una cola de
operaciones que se procesa cuando existe conectividad.

La aplicación puede leer y escribir localmente mientras está offline.

La sincronización posterior mantiene la relación con PostgreSQL.

El comportamiento exacto de conflictos y autorización se implementará
posteriormente conforme a las reglas funcionales de este documento.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
34. PLATAFORMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DECIDIDO:

WEB:
Next.js + React

APLICACIÓN DE TERRENO:
React Native + Expo

BACKEND / PLATAFORMA:
Supabase

BASE DE DATOS:
PostgreSQL

AUTENTICACIÓN:
Supabase Auth

ALMACENAMIENTO DE EVIDENCIA:
Supabase Storage

SINCRONIZACIÓN OFFLINE:
PowerSync

BASE LOCAL:
SQLite mediante PowerSync.

Next.js se define oficialmente como framework React para aplicaciones
web full-stack.

Expo proporciona el ecosistema de desarrollo para aplicaciones React
Native.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
35. SEGURIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La seguridad debe considerar:

- aislamiento entre empresas;
- autenticación;
- autorización;
- roles;
- permisos;
- protección de evidencia;
- protección de información de productores;
- protección de información comercial;
- auditoría;
- trazabilidad.

Supabase utiliza PostgreSQL Row Level Security para restringir acceso
a filas según políticas.

El diseño de NX Quality debe utilizar el aislamiento por empresa como
principio fundamental.

Las claves o credenciales privilegiadas nunca deben exponerse al cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
36. ROLES Y PERMISOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los permisos deben ser funcionales y no depender solamente de ocultar
elementos de interfaz.

Roles iniciales:

ADMINISTRADOR
- administración completa de la empresa;
- usuarios;
- configuración;
- productores;
- productos;
- criterios;
- consulta total de la empresa.

SUPERVISOR / CALIDAD
- inspecciones;
- revisión;
- decisiones;
- historial;
- evidencia;
- reportes autorizados.

INSPECTOR
- consulta de información necesaria;
- creación de inspecciones;
- mediciones;
- observaciones;
- fotografías;
- operaciones de terreno autorizadas.

OPERACIONAL / COMERCIAL
- consulta de información autorizada;
- consulta de resultados;
- consulta de decisiones;
- seguimiento.

Los permisos concretos por acción deben respetar el principio de mínimo
privilegio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
37. AUDITORÍA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las operaciones críticas deben ser auditables.

Como mínimo debe ser posible conocer:

- quién;
- cuándo;
- qué operación;
- sobre qué entidad;
- qué información cambió;
- motivo cuando corresponda.

Operaciones críticas:

- creación de lote;
- modificación de lote;
- inspección;
- cierre de inspección;
- decisión;
- cambio de estado;
- mezcla;
- división;
- reproceso;
- eliminación lógica/anulación;
- modificación de criterios.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
38. CONFIGURACIÓN DE CRITERIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los criterios deben ser configurables.

Un criterio debe poder identificar:

- nombre;
- fuente;
- documento;
- versión;
- fecha de vigencia;
- producto;
- mercado;
- destino;
- etapa;
- atributos;
- límites;
- tolerancias;
- método de evaluación.

El sistema no debe depender de código para cada nueva especificación
comercial.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
39. VERSIONAMIENTO DE CRITERIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una inspección queda ligada al criterio aplicable utilizado en el momento
de la evaluación.

Si posteriormente cambia el criterio:

- las inspecciones históricas conservan el criterio original;
- las nuevas inspecciones utilizan el criterio vigente;
- el resultado histórico no se recalcula automáticamente.

Esto permite reconstruir por qué una decisión fue tomada bajo las
condiciones existentes en ese momento.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
40. INFORMACIÓN COMERCIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La información técnica debe poder relacionarse con información comercial
cuando corresponda.

Ejemplos:

- cliente;
- destino;
- mercado;
- especificación comercial;
- decisión de aceptación;
- rechazo;
- cambio de destino.

No se debe confundir información comercial con normativa.

Una exigencia de un cliente puede ser más estricta que una norma oficial.

El sistema debe permitir registrar ambas sin mezclarlas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
41. NOTIFICACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe contemplar eventos que puedan generar alertas o
notificaciones.

Ejemplos:

- lote rechazado;
- lote retenido;
- inspección pendiente;
- resultado crítico;
- desviación;
- decisión requerida;
- nueva evidencia;
- cambio relevante.

Las notificaciones automáticas avanzadas pueden ampliarse después.

El MVP debe priorizar que el evento quede registrado y sea visible
para el usuario autorizado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
42. DASHBOARD Y VISUALIZACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe permitir visualizar información orientada a decisiones.

No se busca construir un dashboard cargado de indicadores.

La información debe responder preguntas operacionales.

Ejemplos:

- ¿Qué lotes requieren atención?
- ¿Qué lotes están retenidos?
- ¿Qué inspecciones presentan desviaciones?
- ¿Qué problemas se repiten?
- ¿Qué productores presentan determinados patrones?
- ¿Qué lotes están próximos a una decisión?
- ¿Qué decisiones fueron tomadas sobre determinados criterios?

La visualización debe conducir a la acción.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
43. EXPERIENCIA DE TERRENO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El inspector debe poder trabajar con la mínima fricción posible.

Flujo esperado:

IDENTIFICAR LOTE
↓
SELECCIONAR ETAPA
↓
SELECCIONAR CRITERIO
↓
TOMAR MUESTRA
↓
REGISTRAR RESULTADOS
↓
CAPTURAR EVIDENCIA
↓
OBSERVACIONES
↓
FINALIZAR INSPECCIÓN

El sistema debe evitar navegación innecesaria.

Las acciones frecuentes deben requerir pocos pasos.

La captura de fotografías debe ser parte natural del flujo de inspección.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
44. EXPERIENCIA DE SUPERVISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El supervisor debe poder:

- revisar inspecciones;
- abrir evidencia;
- consultar resultados;
- comparar resultados;
- revisar historial;
- observar decisiones;
- identificar desviaciones;
- revisar lotes derivados;
- reconstruir genealogía;
- tomar o validar decisiones.

La interfaz debe privilegiar contexto sobre cantidad de indicadores.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
45. EXPERIENCIA DE DECISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El usuario responsable de decidir debe recibir:

- situación actual;
- lote;
- origen;
- etapa;
- resultados;
- criterio aplicable;
- evidencia;
- historial relevante;
- decisiones anteriores;
- estado actual.

El sistema debe reducir la necesidad de buscar información fuera de
NX Quality.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
46. ENTIDADES CONCEPTUALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Entidades principales:

EMPRESA
Representa la organización propietaria de los datos.

USUARIO
Persona que utiliza el sistema.

ROL
Nivel funcional de autorización.

PRODUCTOR
Origen productivo asociado al lote.

ESPECIE
Especie vegetal.

VARIEDAD
Variedad asociada a una especie.

LOTE
Unidad trazable principal.

EVENTO
Hecho ocurrido durante la historia del lote.

ETAPA
Momento o fase del proceso.

INSPECCIÓN
Evaluación técnica realizada sobre un lote.

MUESTRA
Conjunto o unidad utilizada para evaluación.

ATRIBUTO
Característica evaluada.

MEDICIÓN
Valor observado de un atributo.

CRITERIO
Regla contra la cual se evalúa una observación.

EVIDENCIA
Fotografía, documento u otro respaldo.

OBSERVACIÓN
Información cualitativa registrada durante una operación.

RESULTADO
Conclusión técnica derivada de la evaluación.

DECISIÓN
Determinación operacional/comercial tomada por una persona autorizada.

ACCIÓN
Actividad posterior derivada de una decisión.

LOTE DERIVADO
Lote creado por división, mezcla u otro proceso.

GENEALOGÍA
Relación entre lotes origen y derivados.

AUDITORÍA
Registro de operaciones críticas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
47. RELACIONES CONCEPTUALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMPRESA
↓
PRODUCTORES
↓
LOTES
↓
EVENTOS
↓
INSPECCIONES
↓
MUESTRAS
↓
ATRIBUTOS / MEDICIONES
↓
RESULTADOS
↓
DECISIONES
↓
ACCIONES

INSPECCIÓN
↓
EVIDENCIA

LOTE
↓
GENEALOGÍA
↓
LOTES ORIGEN / DERIVADOS

CRITERIO
↓
INSPECCIÓN

USUARIO
↓
OPERACIONES
↓
AUDITORÍA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
48. FLUJO PRINCIPAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INICIO

↓
Empresa registra productor

↓
Empresa registra especie/variedad

↓
Se identifica cosecha

↓
Se crea lote trazable

↓
Lote entra en una etapa

↓
Inspector inicia inspección

↓
Sistema identifica criterio aplicable

↓
Inspector define/recibe método de muestreo

↓
Inspector toma muestra

↓
Inspector registra mediciones

↓
Inspector registra observaciones

↓
Inspector captura fotografías/evidencia

↓
Sistema evalúa resultados contra criterio

↓
Se genera resultado técnico

↓
Usuario responsable revisa

↓
Se toma decisión

↓
Se registra motivo

↓
Lote cambia de estado si corresponde

↓
Se genera evento posterior

↓
Historia Técnica queda actualizada

↓
FIN / SIGUIENTE EVENTO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
49. FLUJO DE INSPECCIÓN OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INICIO

↓
Usuario abre aplicación

↓
Información previamente sincronizada disponible localmente

↓
Usuario selecciona lote

↓
Usuario inicia inspección

↓
Sin conectividad

↓
Registra información localmente

↓
Captura fotografías

↓
Completa inspección

↓
Inspección queda almacenada localmente

↓
Conectividad vuelve

↓
Sistema sincroniza

↓
Cambios llegan al backend

↓
Sistema valida operaciones

↓
Información queda disponible para consulta central

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
50. FLUJO DE ERROR OFFLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPERACIÓN LOCAL

↓
SINCRONIZACIÓN

↓
CONFLICTO / RECHAZO

↓
OPERACIÓN NO SE PIERDE

↓
SE IDENTIFICA EL ERROR

↓
SE CONSERVA INFORMACIÓN ORIGINAL

↓
SE RESUELVE SEGÚN REGLA DE CONFLICTO

El detalle técnico del mecanismo de resolución pertenece a implementación,
pero la pérdida silenciosa de datos no es aceptable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
51. FLUJO DE DECISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSPECCIÓN

↓
RESULTADOS

↓
COMPARACIÓN CON CRITERIO

↓
RESULTADO TÉCNICO

↓
REVISIÓN HUMANA

↓
DECISIÓN

↓
MOTIVO

↓
ACCIÓN / ESTADO

El resultado técnico no debe ser alterado para coincidir con la decisión.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
52. FLUJO DE MEZCLA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOTE A
+
LOTE B

↓
USUARIO AUTORIZADO CREA MEZCLA

↓
SE REGISTRA EVENTO

↓
SE REGISTRAN LOTES ORIGEN

↓
SE CREA NUEVO LOTE C

↓
C CONSERVA GENEALOGÍA A + B

↓
C CONTINÚA SU PROPIA HISTORIA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
53. FLUJO DE DIVISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOTE A

↓
DECISIÓN DE DIVISIÓN

↓
SE REGISTRA EVENTO

↓
SE CREAN LOTES DERIVADOS

↓
A-1
A-2

↓
CADA DERIVADO CONSERVA RELACIÓN CON A

↓
CADA DERIVADO PUEDE CONTINUAR SU PROPIA HISTORIA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
54. FLUJO DE REPROCESO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOTE

↓
RESULTADO / DECISIÓN

↓
SE DETERMINA REPROCESO

↓
SE REGISTRA MOTIVO

↓
REPROCESO

↓
NUEVA INSPECCIÓN

↓
NUEVO RESULTADO

↓
NUEVA DECISIÓN

La condición anterior permanece en la historia.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
55. CASOS EXCEPCIONALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe contemplar:

- información incompleta;
- inspección abandonada;
- inspección anulada;
- duplicación;
- error de medición;
- fotografía sin sincronización;
- pérdida temporal de conectividad;
- conflicto de sincronización;
- lote rechazado;
- lote retenido;
- cambio de decisión;
- lote dividido;
- lote mezclado;
- reproceso;
- criterio modificado;
- usuario sin permisos;
- intento de acceso a otra empresa.

Ninguno debe destruir la trazabilidad histórica.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
56. MVP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El MVP debe incluir:

1. Multiempresa.

2. Autenticación.

3. Usuarios y roles.

4. Productores.

5. Especies.

6. Variedades.

7. Lotes trazables.

8. Etapas.

9. Inspecciones.

10. Muestras.

11. Atributos.

12. Mediciones.

13. Observaciones.

14. Fotografías/evidencia.

15. Criterios configurables.

16. Resultado contra criterio.

17. Decisiones.

18. Estados de lote.

19. Historia Técnica.

20. Eventos.

21. Genealogía básica.

22. División.

23. Mezcla.

24. Reproceso.

25. Auditoría de operaciones críticas.

26. Operación offline.

27. Sincronización.

28. Consulta histórica.

29. Dashboard operacional básico.

30. Control de acceso por empresa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
57. POST-MVP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Funcionalidades posteriores:

- dashboards analíticos avanzados;
- análisis de tendencias;
- comparación histórica avanzada;
- recomendaciones automáticas;
- alertas avanzadas;
- integración con ERP;
- integración con sistemas de packing;
- integración con sistemas de exportación;
- integración con WhatsApp;
- integración con correo;
- automatizaciones;
- reportes avanzados;
- indicadores predictivos;
- modelos de riesgo;
- análisis estadístico avanzado.

Estas funcionalidades no deben retrasar el MVP.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
58. FUTURAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Potenciales extensiones:

- inteligencia artificial para análisis de fotografías;
- detección automática de defectos;
- predicción de comportamiento;
- scoring de lotes;
- recomendación de destino;
- análisis comercial;
- benchmarking entre temporadas;
- modelos predictivos;
- integración con sensores;
- integración IoT;
- integración con dispositivos de medición.

La IA NO constituye requisito para que NX Quality genere valor.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
59. FUERA DE ALCANCE DEL MVP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quedan fuera del MVP:

- reemplazar ERP;
- reemplazar sistema contable;
- reemplazar sistema de packing;
- reemplazar sistemas fitosanitarios oficiales;
- emitir certificaciones oficiales en nombre de organismos;
- automatizar decisiones críticas sin intervención humana;
- crear una plataforma de mensajería;
- construir un sistema de logística completo;
- implementar IA como requisito fundamental.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
60. INTEGRACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTEGRACIÓN PRINCIPAL:

Supabase

Propósito:
backend, PostgreSQL, autenticación y almacenamiento.

DIRECCIÓN:
aplicaciones ↔ plataforma.

INTEGRACIÓN OFFLINE:

PowerSync

Propósito:
sincronización entre PostgreSQL y almacenamiento local SQLite.

DIRECCIÓN:
PostgreSQL ↔ PowerSync ↔ aplicaciones.

FUTURAS:

WhatsApp
Correo
ERP
Packing
Sistemas de exportación
Servicios externos.

Estas integraciones no son necesarias para comenzar el MVP.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
61. ALMACENAMIENTO DE EVIDENCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las fotografías y archivos deben almacenarse como evidencia asociada
a entidades del sistema.

La referencia lógica debe mantener relación con:

- empresa;
- lote;
- inspección/evento;
- usuario;
- fecha/hora.

El archivo y su contexto lógico deben poder reconstruirse.

La eliminación física de evidencia histórica no debe ocurrir sin una
regla explícita y controlada.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
62. TRAZABILIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La trazabilidad debe operar en dos dimensiones.

DIMENSIÓN 1:
Cronológica.

¿Qué ocurrió y cuándo?

DIMENSIÓN 2:
Genealógica.

¿De dónde proviene este lote y qué lotes derivaron de él?

Ambas deben poder consultarse.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
63. REGLAS DE NEGOCIO PRINCIPALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RB-001
Un lote pertenece a una empresa.

RB-002
Un lote trazable se identifica por productor + variedad + fecha de fruta
+ bloque de cosecha.

RB-003
Un productor puede tener múltiples cosechas de una misma variedad
durante el mismo día.

RB-004
Una inspección pertenece a un lote.

RB-005
Una inspección debe conservar el criterio aplicado.

RB-006
El resultado técnico y la decisión humana son conceptos diferentes.

RB-007
Una decisión debe conservar su motivo.

RB-008
La evidencia debe quedar asociada al contexto correspondiente.

RB-009
La mezcla genera un nuevo lote derivado.

RB-010
La división genera lotes derivados relacionados con el lote origen.

RB-011
El reproceso no elimina la condición anterior.

RB-012
Los eventos históricos no deben desaparecer por cambios posteriores.

RB-013
Una inspección cerrada no debe modificarse silenciosamente.

RB-014
Un cambio de criterio no debe recalcular resultados históricos.

RB-015
El tamaño de muestra depende del criterio aplicable.

RB-016
Los límites de aceptación pertenecen al criterio, no al atributo
como regla universal.

RB-017
Una operación offline no debe generar duplicidad al sincronizar.

RB-018
Una empresa no puede acceder a datos de otra empresa.

RB-019
Las operaciones críticas deben quedar auditadas.

RB-020
El sistema debe permitir reconstruir la Historia Técnica completa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
64. DECISIONES TOMADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DECISIÓN 01
El producto será multiempresa.

DECISIÓN 02
El núcleo del producto será la Historia Técnica del lote.

DECISIÓN 03
El producto se orientará a decisiones comerciales y operacionales,
no solamente al almacenamiento de inspecciones.

DECISIÓN 04
El sistema será offline-first para terreno.

DECISIÓN 05
La BD principal será PostgreSQL.

DECISIÓN 06
La plataforma backend será Supabase.

DECISIÓN 07
La sincronización offline será mediante PowerSync.

DECISIÓN 08
La aplicación de terreno será React Native + Expo.

DECISIÓN 09
La aplicación web será Next.js + React.

DECISIÓN 10
La evidencia será parte del registro técnico.

DECISIÓN 11
La genealogía de lotes será parte del modelo.

DECISIÓN 12
La mezcla genera un lote nuevo.

DECISIÓN 13
La división conserva relación con el lote origen.

DECISIÓN 14
El reproceso conserva la historia anterior.

DECISIÓN 15
El resultado técnico no será sobrescrito por una decisión humana.

DECISIÓN 16
Los criterios deben estar versionados.

DECISIÓN 17
Las inspecciones históricas conservan el criterio utilizado en su momento.

DECISIÓN 18
No se utilizará una única norma universal para determinar calidad.

DECISIÓN 19
USDA, Codex, UNECE, SAG y especificaciones comerciales se tratarán
como fuentes/criterios diferenciados.

DECISIÓN 20
No se inventarán límites técnicos que no estén respaldados por un
criterio aplicable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
65. DECISIONES ANTERIORES MODIFICADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DECISIÓN ANTERIOR:
Considerar determinados valores de calidad como parámetros generales
del sistema.

NUEVA DECISIÓN:
Los valores y tolerancias pertenecen al criterio aplicable.

RAZÓN:
Las fuentes normativas y comerciales no utilizan necesariamente los
mismos atributos, unidades, límites ni métodos.

IMPACTO:
El modelo debe permitir criterios configurables y versionados.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
66. RIESGOS PRINCIPALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RIESGO 01
Convertir el sistema en un simple formulario digital de inspección.

MITIGACIÓN:
La Historia Técnica y las relaciones entre evidencia, resultados y
decisiones son parte central del MVP.

RIESGO 02
Acumular demasiados datos sin convertirlos en información útil.

MITIGACIÓN:
El diseño de dashboards y consultas debe orientarse a decisiones.

RIESGO 03
Confundir normativa con especificaciones comerciales.

MITIGACIÓN:
Los criterios deben identificar fuente y alcance.

RIESGO 04
Perder información por falta de conectividad.

MITIGACIÓN:
Arquitectura offline-first.

RIESGO 05
Duplicar operaciones durante sincronización.

MITIGACIÓN:
Identidad de operaciones y reglas de idempotencia en implementación.

RIESGO 06
Sobrescribir información histórica.

MITIGACIÓN:
Auditoría y versionamiento.

RIESGO 07
Complejidad excesiva por intentar cubrir todas las normas desde el
primer día.

MITIGACIÓN:
El modelo debe ser extensible; el MVP implementará los criterios
necesarios sin pretender cubrir todos los mercados.

RIESGO 08
Convertir IA en una dependencia del producto.

MITIGACIÓN:
La IA queda fuera del núcleo del MVP.

RIESGO 09
Falta de aislamiento entre empresas.

MITIGACIÓN:
Modelo multiempresa y autorización por organización.

RIESGO 10
Crear decisiones automáticas sin suficiente respaldo.

MITIGACIÓN:
El resultado técnico y la decisión humana permanecen separados.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
67. SUPUESTOS CONTROLADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUPUESTO 01

Las etapas del proceso pueden variar entre empresas.

Por ello deben ser configurables.

SUPUESTO 02

Las especificaciones comerciales pueden variar entre clientes.

Por ello deben modelarse como criterios configurables.

SUPUESTO 03

Los atributos de calidad varían según producto y criterio.

Por ello no existe un conjunto universal obligatorio.

SUPUESTO 04

No todos los usuarios necesitan acceso a toda la información.

Por ello el sistema utiliza roles y permisos.

SUPUESTO 05

La aplicación de terreno puede operar durante periodos sin conexión.

Esto constituye requisito funcional del producto.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
68. PRINCIPIOS DE DISEÑO DEL PRODUCTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRINCIPIO 01
Primero utilidad.

PRINCIPIO 02
Después simplicidad.

PRINCIPIO 03
Toda información crítica debe ser trazable.

PRINCIPIO 04
La evidencia debe permanecer relacionada con el hecho que respalda.

PRINCIPIO 05
Los resultados técnicos no deben confundirse con decisiones humanas.

PRINCIPIO 06
La información histórica no debe perderse.

PRINCIPIO 07
La conectividad no debe determinar si el inspector puede trabajar.

PRINCIPIO 08
Las normas deben representarse correctamente, no simplificarse
artificialmente.

PRINCIPIO 09
El sistema debe ayudar a decidir.

PRINCIPIO 10
La complejidad técnica no debe trasladarse al usuario operacional.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
69. CRITERIO DE ÉXITO DEL MVP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El MVP será funcionalmente exitoso si permite:

1. Crear una empresa.

2. Crear usuarios y roles.

3. Registrar productores.

4. Registrar especies y variedades.

5. Crear un lote trazable.

6. Realizar una inspección en terreno.

7. Trabajar sin conectividad.

8. Registrar muestras.

9. Registrar mediciones.

10. Registrar observaciones.

11. Capturar fotografías.

12. Evaluar resultados contra un criterio.

13. Obtener un resultado técnico.

14. Registrar una decisión humana.

15. Consultar la Historia Técnica.

16. Reconstruir el origen del lote.

17. Reconstruir lotes derivados.

18. Registrar mezcla.

19. Registrar división.

20. Registrar reproceso.

21. Mantener auditoría.

22. Sincronizar la información posteriormente.

23. Mantener aislamiento entre empresas.

Si cualquiera de estos puntos críticos falla, el MVP no cumple el
propósito central de NX Quality.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
70. MODELO CONCEPTUAL FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NX QUALITY ES:

Un sistema multiempresa de gestión de calidad, trazabilidad e información
operacional que construye una Historia Técnica de cada lote y relaciona
origen, inspecciones, mediciones, evidencia, criterios, resultados y
decisiones para permitir decisiones comerciales y operacionales con
respaldo.

NO ES:

- solamente un formulario de inspección;
- solamente una base de fotografías;
- solamente un sistema de trazabilidad;
- solamente un dashboard;
- solamente un sistema documental;
- un ERP;
- un sistema contable;
- un organismo certificador;
- un sistema fitosanitario oficial.

SU NÚCLEO ES:

LOTE
↓
HISTORIA
↓
INSPECCIÓN
↓
EVIDENCIA
↓
RESULTADO
↓
DECISIÓN
↓
ACCIÓN
↓
NUEVA HISTORIA

Y cuando existen transformaciones:

LOTE
↓
DIVISIÓN / MEZCLA / REPROCESO
↓
GENEALOGÍA
↓
NUEVO ESTADO
↓
NUEVAS INSPECCIONES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
71. FUENTES EXTERNAS VERIFICADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USDA
Blueberries - Shipping Point and Market Inspection Instructions.

USDA
Blueberries Grade and Standards.

CODEX ALIMENTARIUS
CXS 349-2022 - Standard for Berry Fruits.

UNECE
FFV-57 - Berry fruits.

SAG
Listado de predios de arándanos que pueden optar al Systems Approach
para USA, temporada 2026-27.

SUPABASE
Documentación oficial de PostgreSQL, Auth, Storage y Row Level Security.

POWERSYNC
Documentación oficial de integración Supabase + PostgreSQL + SQLite
para aplicaciones offline-first.

NEXT.JS
Documentación oficial del framework React.

EXPO
Documentación oficial del ecosistema React Native + Expo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
72. ESTADO FINAL DEL CURRENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEMA:
DEFINIDO

OBJETIVO:
DEFINIDO

USUARIOS:
DEFINIDOS

ACTORES:
DEFINIDOS

LOTE:
DEFINIDO

HISTORIA TÉCNICA:
DEFINIDA

INSPECCIONES:
DEFINIDAS

MUESTREO:
DEFINIDO

CRITERIOS:
DEFINIDOS

ESTADOS:
DEFINIDOS

DECISIONES:
DEFINIDAS

EVIDENCIA:
DEFINIDA

TRAZABILIDAD:
DEFINIDA

GENEALOGÍA:
DEFINIDA

MEZCLA:
DEFINIDA

DIVISIÓN:
DEFINIDA

REPROCESO:
DEFINIDO

OFFLINE:
DEFINIDO

MULTIEMPRESA:
DEFINIDO

AUDITORÍA:
DEFINIDA

MVP:
DEFINIDO

POST-MVP:
DEFINIDO

FUERA DE ALCANCE:
DEFINIDO

PLATAFORMA:
DEFINIDA

BASE DE DATOS:
DEFINIDA

SEGURIDAD CONCEPTUAL:
DEFINIDA

FUENTES NORMATIVAS:
IDENTIFICADAS Y VERIFICADAS

DECISIONES CRÍTICAS:
TOMADAS

PENDIENTES CRÍTICOS:
NINGUNO

El desarrollo puede comenzar sobre esta definición funcional.

Cualquier modificación posterior que altere una decisión establecida
debe registrarse como cambio controlado del CURRENT.