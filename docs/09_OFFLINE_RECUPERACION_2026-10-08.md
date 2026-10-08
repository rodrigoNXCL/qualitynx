# Procedimiento de recuperación · 26 inspecciones perdidas (09 · OFFLINE)

Estado: **PREPARADO, NO EJECUTADO.**
No se ha ejecutado PITR, no se ha creado ningún branch, no se ha escrito nada en
producción. Este documento describe el procedimiento y lo que hay que confirmar
antes de dar el primer paso.

Proyecto: `sjecyepmeqvhraptovxo`

---

## 1. Qué se perdió

Dos incidentes, ambos accesorios de un arnés de pruebas, ambos causados por filtros
destructivos mal acotados:

| Incidente | Qué | Cuándo |
|---|---|---|
| A · LOTEJ | 1 inspección legítima de D-035 (`4a8975b3`) borrada por la sección J de la batería, que consultó `inspections` sin traer `lot_id` y por eso leía cero en su snapshot previo | borrada `2026-10-07T19:18:02Z` |
| B · filtro final | 25 inspecciones históricas legítimas borradas por un filtro `status === 'EN CURSO' && !tieneQualityEvaluations` sin acotar por fecha ni empresa | borradas entre `2026-10-08T20:30:13Z` y `20:30:23Z` |

En cascada con el incidente B se borraron además **318 `measurements`** y
**4 016 `samples`** (`audit_logs`, acción DELETE, misma ventana).

Total a recuperar: **26 inspecciones** y sus dependencias.

---

## 2. Restricción que define los puntos de PITR

Para recuperar una fila por PITR, el instante elegido debe caer dentro de su
ventana de existencia: **después de que fue creada y antes de que fue borrada**.
Tomando las 26 de `audit_logs`:

### Grupo A — 1 fila

```
4a8975b3-7aec-41e3-9734-2d2b9e5f7027   existe en [2026-10-06T19:28:33Z .. 2026-10-07T19:18:02Z)
```

### Grupo B — 25 filas

```
ventana común: [2026-10-07T19:31:39Z .. 2026-10-08T20:30:13Z)
  creación más tardía: 2026-10-07T19:31:39Z  (e3491762)
  borrado más temprano: 2026-10-08T20:30:13Z  (0d38eea4)
```

### Conclusión: no hay un único punto válido

```
Grupo A  [2026-10-06T19:28:33Z .. 2026-10-07T19:18:02Z)
Grupo B  [2026-10-07T19:31:39Z .. 2026-10-08T20:30:13Z)
                intersección: VACÍA
```

`4a8975b3` se borró a las `19:18:02`, pero `e3491762` se creó a las `19:31:39`
del mismo día: 13 minutos **después**. Ningún instante contiene las 26.

**Por lo tanto hacen falta dos restauraciones en branches distintos.**

Esto contradice la premisa inicial de "un punto anterior a ambos incidentes":
un punto anterior a `2026-10-07T19:18:02Z` recupera `4a8975b3` pero no a
`e3491762`, que todavía no existía.

---

## 3. Puntos de PITR recomendados

| | Propósito | Momento recomendado | Margen | Por qué ese margen |
|---|---|---|---|---|
| **Punto A** | recuperar `4a8975b3` | **`2026-10-07T19:00:00Z`** | 18 min antes de su borrado; 31 min después de su creación | lejos de ambos extremos de su ventana, para tolerar la granularidad real del reloj de PITR |
| **Punto B** | recuperar las otras 25 | **`2026-10-08T00:00:00Z`** | 4 h 28 min antes del primer borrado; 4 h 28 min después de la creación más tardía | centrado en una ventana de ~25 h de ancho |

Si el `earliest restore time` que reporta Supabase fuera **posterior** a alguno de
estos dos momentos, ese grupo es irrecuperable por PITR y hay que declararlo.

Restricción adicional: el momento debe ser **anterior a `2026-10-08T20:30:13Z`**,
porque después de esa hora ya no existe ninguna de las 26.

---

## 4. Procedimiento

Cada grupo se recupera en su propio branch. Producción no se toca en ningún
paso: los branches son copias completas e independientes.

### Paso 1 · Confirmar disponibilidad (lo hace el usuario)

Dashboard → proyecto → **Settings → Database** → bloque **Backups**:

- ¿aparece *Point-in-Time Recovery*? → **PITR disponible: sí / no**
- ¿cuál es el *earliest restore time*? → **anotar el valor exacto**

Con esos dos datos se decide si el procedimiento es viable.

### Paso 2 · Crear dos branches aislados

```
supabase branches create <nombre>          # una vez por grupo
```

- Branch `recuperacion-a` → restaurado al **Punto A**
- Branch `recuperacion-b` → restaurado al **Punto B**

Cada branch hereda los datos del punto indicado. Los branches no aceptan escrituras
externas: todo lo que se haga ahí es de lectura.

### Paso 3 · Localizar las 26 inspecciones

En el branch correspondiente, confirmar que cada id sigue presente:

```
GET /rest/v1/inspections?id=in.(<los N ids>)
```

Esperado: grupo A devuelve 1 fila, grupo B devuelve 25.

Si alguna no aparece, **esa fila no es recuperable por PITR** y se registra como
tal. No se rellena con datos inventados.

### Paso 4 · Extraer filas completas y dependencias

Por cada grupo, con `select` explícito (nunca `select=*`, para no arrastrar
columnas que quizá cambiaron de significado):

| Orden | Tabla | Selección | Por qué en ese orden |
|---|---|---|---|
| 1 | `inspections` | todas sus columnas | la fila padre |
| 2 | `samples` | todas sus columnas | `ON DELETE CASCADE` |
| 3 | `measurements` | todas sus columnas | `ON DELETE CASCADE` |
| 4 | `inspection_evidence` | todas sus columnas | `ON DELETE CASCADE` |
| 5 | `quality_evaluations` | todas sus columnas | `ON DELETE CASCADE` |
| 6 | `quality_classifications` | todas sus columnas | `ON DELETE CASCADE` |
| 7 | `ai_inspection_analysis` | todas sus columnas | `ON DELETE CASCADE` |
| 8 | `ai_learning_records` | todas sus columnas | `ON DELETE CASCADE` |
| 9 | `decisions` | `inspection_id IS NULL` | referencia **sin** cascada |
| 10 | `lot_dispositions` | `inspection_id IS NULL` | referencia **sin** cascada |
| 11 | `inspections` (2ª vez) | `previous_inspection_id` | autorreferencia, sin cascada |

#### Tablas y relaciones verificadas en el esquema real

`inspections` tiene 13 columnas base más las añadidas por migraciones posteriores:

```
id, company_id, lot_id, inspection_point_id, inspector_id, status,
inspected_at, observations, result, decision, completed_at,
created_at, updated_at
  + previous_inspection_id              (20260923000002)
  + sampling_plan_id, suggested_sample_count,
    sample_count, sample_count_reason, sampling_context
                                       (20260923000002 / 20260923000005)
```

Referencias hacia `inspections(id)` que existen en el esquema, con su
comportamiento real:

| Tabla | `ON DELETE` | Campo |
|---|---|---|
| `samples` | CASCADE | `inspection_id` NOT NULL |
| `measurements` | CASCADE | `inspection_id` NOT NULL |
| `inspection_evidence` | CASCADE | `inspection_id` NOT NULL |
| `ai_inspection_analysis` | CASCADE | `inspection_id` NOT NULL |
| `ai_learning_records` | CASCADE | `inspection_id` NOT NULL |
| `quality_evaluations` | CASCADE | `inspection_id` NOT NULL |
| `quality_classifications` | CASCADE | `inspection_id` NOT NULL |
| `decisions` | **sin cascada** | `inspection_id` **nullable** |
| `lot_dispositions` | **sin cascada** | `inspection_id` **nullable** |
| `inspections.previous_inspection_id` | **sin cascada** | autorreferencia |

Nota operativa: `populate_inherited_inspection_context`
(`20260923000005_packaging_sampling_context.sql:379`) inserta filas en
`measurements` al crear una inspección. Por eso hay mediciones que existen sin
que nadie las escribiera a mano: **no se deben descartar como basura** al
inventariar.

También `audit_logs` registra `inspections` CREATE/DELETE, pero **sin payload**
(solo `id, entity_type, entity_id, action, created_at`). Sirve para verificar el
recuento, no para reconstruir campos.

### Paso 5 · Inventario comparativo

Entregar, por cada una de las 26 inspecciones:

```
id
company_id, lot_id, inspection_point_id, inspector_id, status
observations, result, decision, completed_at, inspected_at
sampling_plan_id, suggested_sample_count, sample_count,
sample_count_reason, sampling_context, previous_inspection_id
conteo de samples, measurements, evidence, quality_evaluations,
  quality_classifications, ai_*
```

y contrastarlo contra el estado actual de producción, marcado por inspección como:

- `IDENTICA` — el `id` ya existe y todos los campos coinciden
- `DIVERGE` — el `id` existe pero algún campo cambió
- `AUSENTE` — el `id` no existe en producción (caso normal de las 26)
- `CONFLICTO DE DEPENDENCIA` — existe el padre pero la cascada dejó hijos
  apuntando a otro lado

### Paso 6 · Decisión (no ejecutar sin autorización)

Solo después de entregar el inventario. **Este procedimiento no inserta nada.**

Si el usuario decide reinsertar, cada reinserción debe pasar por
`scripts/dry-run-guard.mjs`: dry-run con manifiesto → revisión → token →
aplicación. Un `INSERT` masivo por rango de fechas sería exactamente el patrón
que causó el daño.

---

## 5. Lo que hay que confirmar antes de continuar

Dos datos, ambos desde Supabase:

1. **PITR disponible: sí / no**
2. **earliest restore time** (fecha y hora exactas)

Con esos dos:

- si **no hay PITR** → el procedimiento termina aquí. Las 26 se declaran
  irrecuperables salvo las 4 con `lot_id` recuperable de artefactos locales
  (`6b1572b8`→`09670f2b`, `bc682b98`→`e82f77ec`, `9f51ad6b`→`c4da309e`,
  `a3740be9`→`b815d6de`), y aun esas solo se podrían reconstruir de forma
  parcial y con `inspector_id` no recuperable;
- si **sí hay PITR** → se verifica que el `earliest restore time` sea anterior a
  `2026-10-08T20:30:13Z`, y se procede con los dos branches del Paso 2.

---

## 6. Restricciones que se mantienen

- No se restaura producción.
- No se inserta nada en producción.
- No se modifican las 26.
- No se ejecuta SQL destructivo.
- No se ejecuta PITR ni se crea branch sin autorización explícita.
- No se actualiza `BUILD_STATUS.md` hasta que la etapa se cierre formalmente.
- No se avanza a Fase 2.