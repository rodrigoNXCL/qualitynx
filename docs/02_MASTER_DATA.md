# 02_MASTER_DATA.md

# NX QUALITY — MASTER DATA

Versión: 1.0
Etapa: 02 — MASTER DATA
Estado: DEFINICIÓN PARA CONSTRUCCIÓN


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. OBJETIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Construir y dejar operativos los datos maestros necesarios para que
las etapas posteriores puedan crear, identificar y operar sobre lotes
e inspecciones.

MASTER DATA debe establecer información de referencia controlada,
reutilizable y consistente.

Esta etapa NO construye lotes.

Esta etapa NO construye inspecciones.

Esta etapa NO construye el motor de calidad.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe estar COMPLETADA:

01 — FOUNDATION


FOUNDATION debe proporcionar:

- autenticación;
- usuarios;
- empresas;
- roles;
- aislamiento por empresa;
- fuente central de datos;
- auditoría base.


MASTER DATA utiliza estas capacidades.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. QUÉ DEBE EXISTIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MASTER DATA debe permitir administrar los datos maestros definidos
para la operación de NX Quality.

Como mínimo debe existir soporte para:

- productores;
- campos;
- cuarteles;
- especies;
- variedades;
- temporadas.


Cada registro debe pertenecer al ámbito de una empresa cuando
corresponda.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. PRINCIPIO DE LOS DATOS MAESTROS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Un dato maestro representa una referencia reutilizable.

No debe duplicarse innecesariamente cada vez que se crea un lote.

Ejemplo conceptual:

PRODUCTOR
↓
CAMPO
↓
CUARTEL


Los lotes posteriores podrán referenciar estos datos.


MASTER DATA administra las referencias.

LOTS administrará los lotes.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. PRODUCTORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir una entidad para representar al productor asociado a la
operación.


Información mínima:

- identificación;
- nombre o razón social;
- estado;
- empresa propietaria del registro.


Debe poder:

- crear;
- consultar;
- modificar;
- activar;
- desactivar.


Un productor desactivado no debe eliminar su historial.


No debe eliminarse físicamente un productor que ya tenga información
operacional asociada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. CAMPOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir una entidad para representar un campo o unidad
productiva.


Un campo pertenece a un productor.


Relación conceptual:

PRODUCTOR
↓
CAMPO


Información mínima:

- identificación;
- nombre;
- productor;
- estado;
- información de ubicación requerida por el modelo vigente.


Debe poder:

- crear;
- consultar;
- modificar;
- activar;
- desactivar.


Un campo desactivado debe conservar sus relaciones históricas.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. CUARTELES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir una entidad para representar un cuartel o unidad
productiva dentro de un campo.


Relación:

PRODUCTOR
↓
CAMPO
↓
CUARTEL


Un cuartel pertenece a un único campo.


Información mínima:

- identificación;
- nombre o código;
- campo;
- estado.


Debe poder:

- crear;
- consultar;
- modificar;
- activar;
- desactivar.


Un cuartel desactivado conserva su información histórica.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. ESPECIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir un catálogo controlado de especies.


Una especie debe poder ser reutilizada por múltiples registros
operacionales.


Debe poder:

- consultar;
- crear cuando corresponda;
- modificar según permisos;
- activar;
- desactivar.


La desactivación no debe eliminar registros históricos que utilicen
la especie.


La estructura debe permitir que una variedad pueda relacionarse con
su especie correspondiente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. VARIEDADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir un catálogo de variedades.


Una variedad debe estar asociada a una especie.


Relación:

ESPECIE
↓
VARIEDAD


Debe poder:

- crear;
- consultar;
- modificar;
- activar;
- desactivar.


No debe permitirse crear una variedad sin especie válida.


La desactivación conserva el historial existente.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. TEMPORADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe existir una entidad para representar una temporada operacional.


La temporada permitirá posteriormente contextualizar lotes,
inspecciones y otros registros.


Información mínima:

- nombre o identificación;
- período;
- estado;
- empresa.


Debe poder:

- crear;
- consultar;
- modificar;
- activar;
- cerrar/desactivar.


No debe eliminarse una temporada que ya tenga información
operacional asociada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. RELACIONES MÍNIMAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las relaciones que MASTER DATA debe dejar disponibles son:

EMPRESA
↓
PRODUCTOR
↓
CAMPO
↓
CUARTEL


ESPECIE
↓
VARIEDAD


EMPRESA
↓
TEMPORADA


Estas relaciones son necesarias para que LOTS pueda construir
posteriormente su contexto operacional.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. AISLAMIENTO POR EMPRESA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los datos maestros pertenecientes a una empresa no pueden quedar
disponibles para otra empresa.


Ejemplo:

Empresa A
├── Productor A
├── Campo A
└── Cuartel A


Empresa B
├── Productor B
├── Campo B
└── Cuartel B


Un usuario de Empresa A no puede:

- consultar;
- modificar;
- asociar;
- reutilizar

un dato maestro perteneciente exclusivamente a Empresa B.


Debe respetarse el aislamiento establecido en FOUNDATION.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. IDENTIDAD Y DUPLICADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MASTER DATA debe evitar duplicidades evidentes dentro del ámbito
correspondiente.


Antes de crear un registro debe validarse que no exista otro registro
equivalente según las reglas de identificación definidas para esa
entidad.


No se debe asumir que el nombre por sí solo siempre constituye una
identidad única.


La regla exacta de unicidad de cada entidad debe corresponder al
modelo definido en CURRENT.md.


No inventar claves comerciales adicionales durante esta etapa.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. ESTADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los datos maestros deben disponer de un estado que permita controlar
su utilización operacional.


Como mínimo debe distinguirse entre:

ACTIVO

INACTIVO


La desactivación debe impedir su utilización en nuevos registros
cuando corresponda.


La desactivación NO debe eliminar ni alterar el historial existente.


Las reglas específicas de LOTS determinarán cómo se comporta un dato
maestro inactivo al intentar crear un nuevo lote.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. MODIFICACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los datos maestros pueden requerir correcciones.


Una modificación no debe destruir información histórica que ya haya
sido utilizada operacionalmente.


Si una modificación afecta información que posteriormente debe
mantenerse como evidencia histórica, debe conservarse la trazabilidad
correspondiente.


Las modificaciones relevantes deben utilizar la capacidad de
auditoría proporcionada por FOUNDATION.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. ELIMINACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No utilizar eliminación física indiscriminada.


Si un dato maestro ya fue utilizado por información operacional:

NO ELIMINAR FÍSICAMENTE.


Utilizar desactivación o mecanismo equivalente definido por el modelo
funcional.


El historial debe continuar siendo interpretable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. PERMISOS FUNCIONALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MASTER DATA debe respetar los roles definidos en FOUNDATION.


El usuario solo puede operar datos maestros dentro de su empresa y
según sus permisos.


La definición detallada de permisos debe mantenerse alineada con
CURRENT.md.


No crear nuevos roles exclusivamente para esta etapa sin una decisión
registrada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. FLUJO GENERAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREAR DATO MAESTRO

Usuario autorizado
↓
Selecciona tipo de dato
↓
Ingresa información requerida
↓
Validación
↓
¿Información válida?
├── NO → Mostrar error
└── SÍ
      ↓
¿Duplicado?
├── SÍ → Rechazar creación
└── NO
      ↓
Crear registro
      ↓
ACTIVO


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. FLUJO DE DESACTIVACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usuario autorizado
↓
Selecciona registro
↓
Solicita desactivación
↓
Validar restricciones
↓
Cambiar estado
↓
INACTIVO


El registro histórico permanece disponible.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. FLUJO DE MODIFICACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usuario autorizado
↓
Selecciona registro
↓
Modifica información
↓
Validación
↓
¿Información válida?
├── NO → Rechazar modificación
└── SÍ
      ↓
Guardar modificación
      ↓
Registrar auditoría
      ↓
Registro actualizado


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. CASOS LÍMITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debe controlarse como mínimo:

- creación sin información obligatoria;
- referencia a entidad inexistente;
- referencia a entidad de otra empresa;
- duplicado;
- modificación de registro inexistente;
- desactivación de registro inexistente;
- eliminación de registro con historial;
- intento de utilizar dato maestro inactivo;
- usuario sin permisos;
- sesión inválida.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
22. MODELO NECESARIO PARA LA ETAPA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La etapa requiere disponer conceptualmente de:

EMPRESA

PRODUCTOR

CAMPO

CUARTEL

ESPECIE

VARIEDAD

TEMPORADA


Relaciones mínimas:

EMPRESA → PRODUCTOR

PRODUCTOR → CAMPO

CAMPO → CUARTEL

ESPECIE → VARIEDAD

EMPRESA → TEMPORADA


Cada entidad debe contar con:

- identificador;
- estado cuando corresponda;
- relación con su ámbito propietario;
- información necesaria para su identificación;
- trazabilidad de modificaciones según FOUNDATION.


No definir aquí las entidades de LOTS.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
23. FUERA DE ALCANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No construir en esta etapa:

- lotes;
- inspecciones;
- muestras;
- mediciones;
- criterios de calidad;
- defectos;
- decisiones;
- trazabilidad de lotes;
- genealogía;
- transformaciones;
- offline;
- dashboards;
- analítica;
- recomendaciones;
- reportes de calidad.


MASTER DATA solamente prepara la información de referencia necesaria.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
24. CRITERIOS DE ACEPTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MASTER DATA cumple funcionalmente cuando:

[ ] Se pueden administrar productores.

[ ] Se pueden administrar campos.

[ ] Se pueden administrar cuarteles.

[ ] Se pueden administrar especies.

[ ] Se pueden administrar variedades.

[ ] Se pueden administrar temporadas.

[ ] Las relaciones productor → campo → cuartel funcionan.

[ ] La relación especie → variedad funciona.

[ ] Los datos maestros quedan asociados correctamente a su empresa.

[ ] El aislamiento entre empresas funciona.

[ ] Se controlan duplicados según las reglas definidas.

[ ] Los registros pueden quedar INACTIVOS.

[ ] La desactivación no elimina historial.

[ ] Las modificaciones relevantes quedan auditadas.

[ ] Los registros utilizados operacionalmente no se eliminan
    físicamente.

[ ] Los permisos definidos para la etapa funcionan.

[ ] Los casos límite están controlados.

[ ] LOTS puede utilizar los datos maestros una vez iniciada la
    siguiente etapa.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
25. PRUEBAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRUEBA 1 — PRODUCTOR

Crear productor válido.

Resultado esperado:

Productor creado y disponible.


PRUEBA 2 — CAMPO

Crear campo asociado a productor válido.

Resultado esperado:

Campo creado y correctamente relacionado.


PRUEBA 3 — CUARTEL

Crear cuartel asociado a campo válido.

Resultado esperado:

Cuartel creado y correctamente relacionado.


PRUEBA 4 — ESPECIE / VARIEDAD

Crear especie y variedad asociada.

Resultado esperado:

La relación es válida y consultable.


PRUEBA 5 — TEMPORADA

Crear temporada válida.

Resultado esperado:

Temporada creada y disponible.


PRUEBA 6 — DUPLICADO

Intentar crear un registro equivalente a uno existente.

Resultado esperado:

La operación es rechazada según la regla de unicidad
correspondiente.


PRUEBA 7 — AISLAMIENTO

Crear datos maestros para dos empresas.

Resultado esperado:

Cada empresa solamente puede operar sus propios registros.


PRUEBA 8 — DESACTIVACIÓN

Desactivar un dato maestro utilizado históricamente.

Resultado esperado:

El registro permanece disponible para historial y cambia a
INACTIVO.


PRUEBA 9 — ELIMINACIÓN

Intentar eliminar físicamente un registro con historial operacional.

Resultado esperado:

La operación no destruye el registro histórico.


PRUEBA 10 — PERMISOS

Intentar modificar datos maestros con un usuario no autorizado.

Resultado esperado:

Operación rechazada.


PRUEBA 11 — REFERENCIA INVÁLIDA

Intentar crear una entidad dependiente con una referencia inexistente.

Resultado esperado:

Operación rechazada.


PRUEBA 12 — REFERENCIA ENTRE EMPRESAS

Intentar asociar un registro de Empresa A a un dato maestro de
Empresa B.

Resultado esperado:

Operación rechazada.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
26. DEFINITION OF DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

02 — MASTER DATA puede cerrarse solamente cuando:

[ ] FOUNDATION está COMPLETADA.

[ ] Productores funcionan.

[ ] Campos funcionan.

[ ] Cuarteles funcionan.

[ ] Especies funcionan.

[ ] Variedades funcionan.

[ ] Temporadas funcionan.

[ ] Relaciones maestras funcionan.

[ ] Aislamiento multiempresa verificado.

[ ] Reglas de duplicidad verificadas.

[ ] Estados ACTIVO / INACTIVO funcionan.

[ ] La desactivación conserva historial.

[ ] Modificaciones relevantes quedan auditadas.

[ ] Eliminación indebida está controlada.

[ ] Permisos de la etapa están verificados.

[ ] Casos límite están probados.

[ ] Pruebas de aceptación aprobadas.

[ ] No existen pendientes propios de MASTER DATA.

[ ] No se han construido funcionalidades pertenecientes a etapas
    posteriores.

[ ] BUILD_STATUS.md actualizado.

[ ] Etapa marcada como COMPLETADA.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
27. RESULTADO ESPERADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Al cerrar MASTER DATA debe existir una base de datos maestros
confiable que permita comenzar:

03 — LOTS


LOTS debe poder asumir que puede obtener referencias válidas de:

- productor;
- campo;
- cuartel;
- especie;
- variedad;
- temporada.


MASTER DATA termina aquí.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIN — 02_MASTER_DATA.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━