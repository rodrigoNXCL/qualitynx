# 06_DECISIONS.md

# NX QUALITY — DECISIONS

Versión: 1.0
Etapa: 06 — DECISIONS
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DECISIONS registra la decisión operacional tomada a partir de la
información disponible en la Historia Técnica.

La decisión puede utilizar:

- resultado de inspecciones;
- evaluación del QUALITY ENGINE;
- observaciones;
- evidencias;
- contexto operacional;
- antecedentes históricos disponibles.

QUALITY ENGINE evalúa.

DECISIONS registra qué decidió hacer el responsable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requiere:

01 — FOUNDATION
03 — LOTS
04 — INSPECTIONS
05 — QUALITY ENGINE


Debe existir:

- lote;
- inspecciones;
- resultados de calidad cuando correspondan;
- usuario autorizado;
- roles y permisos;
- trazabilidad.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir una DECISIÓN asociada a un contexto operacional.

Como mínimo debe identificar:

- lote;
- responsable;
- fecha/hora;
- motivo/contexto;
- decisión tomada;
- fundamento disponible;
- estado de la decisión;
- trazabilidad.


La decisión debe conservar referencia a la información que estaba
disponible al momento de tomarla.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REGLAS DE DECISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Una decisión debe ser tomada por un usuario autorizado.

2. El sistema no debe tomar automáticamente una decisión operacional
   solo porque QUALITY ENGINE detecte una desviación.

3. Una desviación puede respaldar una decisión, pero no la reemplaza.

4. La decisión debe indicar qué acción fue tomada.

5. Debe registrarse quién tomó la decisión.

6. Debe registrarse cuándo fue tomada.

7. Debe conservarse el contexto utilizado para tomarla.

8. Una decisión no debe eliminar ni alterar la medición original.

9. Una decisión posterior no debe sobrescribir silenciosamente una
   decisión anterior.

10. Las modificaciones o anulaciones deben quedar trazables.

11. Una decisión debe pertenecer al ámbito de la empresa autorizada.

12. Una decisión puede requerir una justificación obligatoria según
    el tipo de acción.

13. El sistema debe impedir decisiones sin los antecedentes mínimos
    definidos para esa acción.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. TIPOS DE DECISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema debe permitir como mínimo decisiones operacionales
configurables como:

- APROBAR;
- RECHAZAR;
- RETENER;
- SEGREGAR;
- REPROCESAR;
- SOLICITAR NUEVA INSPECCIÓN;
- LIBERAR;
- OTRA DECISIÓN CONFIGURADA.


La lista definitiva debe corresponder a las decisiones operacionales
definidas en CURRENT.md.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. MODELO NECESARIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DECISIÓN

Debe relacionarse con:

- lote;
- usuario responsable;
- fecha/hora;
- tipo de decisión;
- contexto;
- fundamento;
- estado.


Puede relacionarse con:

- inspección;
- resultado de QUALITY ENGINE;
- observación;
- evidencia;
- decisión anterior.


Debe conservarse la relación con los antecedentes utilizados para
tomar la decisión.


No construir en esta etapa:

- recomendaciones predictivas;
- IA para toma de decisiones;
- workflow avanzado de aprobaciones;
- analítica de decisiones.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. FLUJO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INICIO

Usuario autorizado
↓
Selecciona lote
↓
Consulta información disponible
↓
Revisa inspecciones/resultados
↓
Selecciona acción
↓
Ingresa fundamento cuando corresponda
↓
Validar permisos y antecedentes
↓
¿Información suficiente?
├── NO → Informar faltantes
└── SÍ
      ↓
Registrar decisión
      ↓
Actualizar estado operacional correspondiente
      ↓
Registrar trazabilidad
      ↓
DECISIÓN REGISTRADA


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. FUNDAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La decisión debe poder explicar:

¿QUÉ SE DECIDIÓ?

¿QUIÉN LO DECIDIÓ?

¿CUÁNDO?

¿POR QUÉ?

¿SOBRE QUÉ INFORMACIÓN?


El fundamento puede apoyarse en:

- resultado de inspección;
- desviación;
- observación;
- evidencia;
- condición operacional;
- criterio técnico del responsable.


No debe exigirse una explicación extensa cuando el tipo de decisión
no lo requiera.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. VALIDACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de registrar una decisión validar:

[ ] Usuario autorizado.

[ ] Lote válido.

[ ] Decisión válida.

[ ] Información mínima disponible.

[ ] Fundamento presente cuando sea obligatorio.

[ ] La transición operacional está permitida.

[ ] El usuario pertenece al ámbito autorizado.

[ ] No existe una operación incompatible en curso.


Si falla una validación:

NO registrar la decisión.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. CAMBIOS Y ANULACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una decisión registrada no debe eliminarse físicamente.


Si debe corregirse:

DECISIÓN ORIGINAL
↓
NUEVA OPERACIÓN
↓
TRAZABILIDAD DEL CAMBIO


Debe conservarse:

- decisión anterior;
- usuario que modifica;
- fecha/hora;
- motivo;
- nueva decisión cuando corresponda.


No sobrescribir silenciosamente la decisión anterior.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. ESTADO DE LA DECISIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La decisión debe distinguir al menos:

REGISTRADA

ANULADA


REGISTRADA:

La decisión forma parte de la Historia Técnica.


ANULADA:

La decisión deja de representar la decisión operacional vigente,
pero permanece disponible como antecedente histórico.


Anular NO significa eliminar.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. RELACIÓN CON QUALITY ENGINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUALITY ENGINE:

MEDICIÓN
↓
CRITERIO
↓
EVALUACIÓN
↓
CUMPLE / DESVIACIÓN


DECISIONS:

RESULTADO
+
CONTEXTO
+
CRITERIO DEL RESPONSABLE
↓
DECISIÓN


Una desviación NO debe generar automáticamente:

RECHAZO


Una condición CUMPLE tampoco debe obligar automáticamente:

APROBACIÓN


La decisión pertenece al responsable autorizado.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. RELACIÓN CON LOTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Una decisión puede producir un cambio en el estado operacional del
lote cuando corresponda.

Ejemplo:

DECISIÓN:
RETENER

↓

LOTE:
RETENIDO


DECISIÓN:
APROBAR

↓

LOTE:
APROBADO


La transición debe respetar las reglas de estado definidas en
CURRENT.md.


DECISIONS registra la decisión.

No redefine el modelo completo de estados del lote.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. DECISIONES CON INFORMACIÓN INSUFICIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema no debe inventar información para permitir una decisión.


Si faltan antecedentes obligatorios:

NO PERMITIR REGISTRAR


Si la decisión es operacionalmente posible aun con información
incompleta, el sistema debe permitirlo solamente cuando esa condición
esté definida explícitamente en CURRENT.md.


Cuando corresponda, debe quedar registrado que la decisión fue tomada
con información incompleta.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. CASOS LÍMITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe controlar:

- decisión duplicada;
- usuario sin permiso;
- lote inexistente;
- lote cerrado;
- decisión incompatible con estado actual;
- inspección incompleta;
- resultado sin criterio;
- decisión posterior a otra decisión;
- intento de modificación;
- intento de eliminación;
- información insuficiente.


Cuando exista conflicto entre decisiones:

NO resolver silenciosamente.


Debe conservarse la historia y aplicar la regla operacional definida.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. FUERA DE ALCANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No construir en esta etapa:

- IA que tome decisiones;
- predicción automática;
- workflow complejo de aprobaciones;
- firma electrónica avanzada;
- analítica avanzada;
- dashboards;
- trazabilidad completa de transformaciones;
- recomendaciones comerciales;
- automatización de decisiones sin autorización humana.


DECISIONS registra y controla la decisión operacional.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Se puede registrar una decisión sobre un lote válido.

[ ] Solo usuarios autorizados pueden decidir.

[ ] Se identifica responsable.

[ ] Se registra fecha/hora.

[ ] Se registra el tipo de decisión.

[ ] Se registra fundamento cuando corresponde.

[ ] Se conserva el contexto utilizado.

[ ] La decisión queda asociada a la Historia Técnica.

[ ] QUALITY ENGINE no toma decisiones automáticamente.

[ ] Una decisión puede producir el cambio de estado correspondiente.

[ ] Se impiden transiciones incompatibles.

[ ] Las decisiones no se eliminan físicamente.

[ ] Las anulaciones quedan trazables.

[ ] Se mantiene la decisión anterior.

[ ] Se controla el acceso por empresa.

[ ] No se permite registrar decisiones con antecedentes
    obligatorios faltantes.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — DECISIÓN VÁLIDA

Usuario autorizado selecciona lote y registra APROBAR.

→ Debe registrarse correctamente.


PRUEBA 2 — DESVIACIÓN

QUALITY ENGINE genera DESVIACIÓN.

→ El sistema NO debe generar automáticamente RECHAZAR.


PRUEBA 3 — DECISIÓN

Usuario revisa desviación y registra RECHAZAR.

→ Debe registrarse responsable, fecha/hora y fundamento.


PRUEBA 4 — PERMISOS

Usuario sin autorización intenta decidir.

→ Operación rechazada.


PRUEBA 5 — TRANSICIÓN INVÁLIDA

Intentar aplicar una decisión incompatible con el estado actual.

→ Operación rechazada.


PRUEBA 6 — FUNDAMENTO

Decisión que requiere fundamento se registra sin fundamento.

→ Debe impedirse el registro.


PRUEBA 7 — ANULACIÓN

Anular una decisión registrada.

→ La decisión original permanece en historial y queda marcada como
ANULADA.


PRUEBA 8 — DECISIÓN POSTERIOR

Registrar una nueva decisión después de una anterior.

→ Ambas deben permanecer trazables.


PRUEBA 9 — INFORMACIÓN INSUFICIENTE

Intentar decidir sin antecedentes obligatorios.

→ Operación rechazada.


PRUEBA 10 — EMPRESA

Usuario intenta decidir sobre lote de otra empresa.

→ Operación rechazada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

06 — DECISIONS está COMPLETADA cuando:

[ ] FOUNDATION está COMPLETADA.

[ ] LOTS está COMPLETADA.

[ ] INSPECTIONS está COMPLETADA.

[ ] QUALITY ENGINE está COMPLETADA.

[ ] Existe el modelo de DECISIÓN.

[ ] Se pueden registrar decisiones.

[ ] Funcionan los permisos.

[ ] Funciona el fundamento.

[ ] Funciona la asociación con lote.

[ ] Funciona la asociación con antecedentes de inspección/calidad.

[ ] Funcionan las validaciones.

[ ] Funcionan las transiciones de estado correspondientes.

[ ] Las decisiones quedan auditadas.

[ ] Las anulaciones conservan historial.

[ ] Las decisiones anteriores no se sobrescriben silenciosamente.

[ ] QUALITY ENGINE no toma decisiones automáticamente.

[ ] Las pruebas de aceptación están aprobadas.

[ ] No existen errores críticos pendientes.

[ ] No se han construido funcionalidades pertenecientes a
    TRACEABILITY, TRANSFORMATIONS, OFFLINE u ANALYTICS.

[ ] BUILD_STATUS.md fue actualizado.

[ ] 06 — DECISIONS queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 06_DECISIONS.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━