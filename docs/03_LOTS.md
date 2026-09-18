# 03_LOTS.md

# NX QUALITY — LOTS

Versión: 1.0
Etapa: 03 — LOTS
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTEXTO MÍNIMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOTS construye la unidad trazable principal del sistema:

LOTE.

El lote será utilizado posteriormente por INSPECTIONS y las etapas
posteriores.

La definición funcional completa del lote se encuentra en CURRENT.md.

Esta etapa debe implementar únicamente lo necesario para crear,
consultar, modificar y controlar el ciclo básico del lote.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requiere:

01 — FOUNDATION
02 — MASTER DATA

Debe poder utilizar:

- empresa;
- productor;
- especie;
- variedad;
- campo;
- cuartel;
- temporada;
- usuario autenticado.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir la unidad LOTE con:

- identificador único;
- productor;
- variedad;
- fecha de fruta;
- bloque de cosecha;
- referencias maestras necesarias;
- estado;
- información temporal requerida;
- trazabilidad de las operaciones propias de la etapa.

La identidad mínima definida para el lote es:

PRODUCTOR
+
VARIEDAD
+
FECHA DE FRUTA
+
BLOQUE DE COSECHA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REGLAS DE LOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. El lote debe pertenecer a una empresa.

2. Productor y variedad deben corresponder a datos maestros válidos.

3. La identidad mínima del lote es:

   Productor + Variedad + Fecha de fruta + Bloque de cosecha.

4. Dos bloques de cosecha diferentes pueden representar dos lotes
   diferentes aun cuando productor, variedad y fecha sean iguales.

5. La creación de un lote no depende obligatoriamente de su recepción
   física.

6. Un lote no debe duplicarse como consecuencia de una operación
   repetida.

7. Los cambios relevantes deben conservar trazabilidad.

8. Cerrar un lote no significa eliminarlo.

9. La información histórica del lote debe permanecer disponible.

10. Las reglas completas del ciclo de vida se encuentran en CURRENT.md.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. MODELO NECESARIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOTE

Referencias:

- Empresa
- Productor
- Variedad
- Fecha de fruta
- Bloque de cosecha

Referencias asociadas cuando correspondan:

- Especie
- Campo
- Cuartel
- Temporada

El modelo debe permitir posteriormente que INSPECTIONS pueda asociar
inspecciones al lote.

No construir en esta etapa el modelo de inspecciones.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. FLUJO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREACIÓN

Usuario autorizado
↓
Selecciona productor
↓
Selecciona variedad
↓
Ingresa fecha de fruta
↓
Ingresa bloque de cosecha
↓
Validación
↓
¿Datos válidos?
├── NO → Rechazar
└── SÍ
      ↓
¿Lote duplicado?
├── SÍ → Rechazar
└── NO
      ↓
Crear lote
      ↓
Estado inicial


CONSULTA

Usuario autorizado
↓
Selecciona lote
↓
Validar acceso
↓
Mostrar información disponible


MODIFICACIÓN

Usuario autorizado
↓
Selecciona lote
↓
Modifica información permitida
↓
Validación
↓
Guardar
↓
Registrar trazabilidad


CAMBIO DE ESTADO

Usuario autorizado
↓
Selecciona lote
↓
Solicita cambio
↓
Validar transición
↓
Guardar nuevo estado
↓
Registrar cambio


CIERRE

Usuario autorizado
↓
Selecciona lote
↓
Solicita cierre
↓
Validar condición de cierre
↓
CERRADO


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Se puede crear un lote válido.

[ ] Se puede identificar inequívocamente el lote.

[ ] Productor y variedad provienen de MASTER DATA.

[ ] Se pueden distinguir bloques de cosecha diferentes.

[ ] Se impiden duplicados.

[ ] Se pueden consultar lotes autorizados.

[ ] Se pueden modificar los datos permitidos.

[ ] Las modificaciones relevantes quedan trazables.

[ ] Se pueden ejecutar los cambios de estado definidos.

[ ] Se puede cerrar un lote.

[ ] Cerrar no elimina el lote.

[ ] Un usuario no puede operar lotes fuera de su ámbito autorizado.

[ ] El lote queda disponible para INSPECTIONS.

[ ] No se implementan funcionalidades pertenecientes a etapas
    posteriores.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — CREACIÓN
Crear lote con información válida.
→ Debe crearse correctamente.

PRUEBA 2 — IDENTIDAD
Crear dos lotes con mismo productor, variedad y fecha pero diferente
bloque.
→ Deben ser unidades diferentes.

PRUEBA 3 — DUPLICADO
Intentar crear nuevamente el mismo lote.
→ Debe impedirse la duplicación.

PRUEBA 4 — REFERENCIA INVÁLIDA
Intentar utilizar productor o variedad inexistente/no autorizado.
→ Debe rechazarse.

PRUEBA 5 — MODIFICACIÓN
Modificar información permitida.
→ Debe guardarse y quedar trazable.

PRUEBA 6 — ESTADO
Ejecutar una transición válida.
→ Debe cambiar el estado y registrar la operación.

PRUEBA 7 — CIERRE
Cerrar un lote.
→ Debe quedar CERRADO y continuar disponible para consulta.

PRUEBA 8 — SEGURIDAD
Intentar acceder a un lote fuera del ámbito autorizado.
→ Debe rechazarse.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

03 — LOTS está COMPLETADA cuando:

[ ] El modelo LOTE está operativo.

[ ] La identidad del lote funciona según CURRENT.md.

[ ] Las referencias a MASTER DATA funcionan.

[ ] La creación funciona.

[ ] La consulta funciona.

[ ] La modificación funciona.

[ ] La validación de duplicados funciona.

[ ] Los estados definidos para esta etapa funcionan.

[ ] El cierre funciona.

[ ] La trazabilidad de operaciones propias de LOTS funciona.

[ ] Las pruebas de aceptación están aprobadas.

[ ] No existen errores críticos pendientes.

[ ] No se han construido funcionalidades de etapas posteriores.

[ ] BUILD_STATUS.md fue actualizado.

[ ] 03 — LOTS queda marcado como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 03_LOTS.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━