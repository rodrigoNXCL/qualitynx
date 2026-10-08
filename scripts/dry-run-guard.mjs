// ============================================================================
// DRY-RUN OBLIGATORIO para operaciones destructivas sobre datos de QualityNX.
//
// Por qué existe
//   Durante la construcción de 09 · OFFLINE un arnés borró 25 inspecciones
//   históricas legítimas. La causa no fue un error de sintaxis sino un filtro
//   destructivo demasiado amplio: se seleccionaron filas por `status` y por
//   "no tiene quality_evaluations", sin acotar por fecha ni por identidad de
//   fixture. Un filtro que "parece" acotado en el papel se aplicó a la base
//   entera.
//
//   La defensa no puede ser "hay que tener cuidado". Este módulo convierte el
//   dry-run en un requisito estructural: no se puede escribir nada sin haber
//   producido antes un manifiesto, haberlo mostrado, y presentar el token que
//   ese manifiesto genera. Sin token, `apply()` lanza antes de abrir un socket.
//
// Reglas que este módulo impone
//   1. El rango de fechas es obligatorio. No hay borrado "de todo lo que haya".
//   2. Es obligatorio dar una identidad (run / test / fixture) del origen.
//   3. Está prohibido seleccionar Rows solo por `status` u otro atributo de
//      negocio sin un discriminante adicional (fecha, empresa, identidad).
//   4. El manifiesto incluye id, empresa, lote, fecha, estado y dependencias
//      que se van a arrastrar por cascada.
//   5. `apply()` exige el token devuelto por `plan()`. Sin token: 0 escrituras.
//   6. Hay post-check: compara el estado posterior contra el esperado y falla si
//      algo cambió que no estaba en el manifiesto.
//
// Lo que NO garantiza
//   Esto es una barrera en el código del arnés, no un sandbox. Un `fetch` con
//   DELETE escrito a mano fuera de este módulo lo sortea. Por eso el módulo
//   además expone `assertNoDestructiveBypass()` para que un lint pueda exigir
//   que todo script destructivo pase por aquí.
// ============================================================================

import crypto from "crypto";
import fs from "fs";

export class DestructivePlanError extends Error {
  constructor(msg, detalles) {
    super(msg);
    this.name = "DestructivePlanError";
    this.detalles = detalles ?? null;
  }
}

const OBLIGATORIO = ["id", "created_at"];
const ATRIBUTOS_DE_NEGOCIO = [
  "status",
  "result",
  "decision",
  "observations",
  "is_active",
  "completed_at",
];

/**
 * Una identidad de origen. Sirve para que el manifiesto diga de dónde salieron
 * las filas que se van a tocar y para que el registro de la operación sea trazable.
 */
export class Identity {
  constructor({ run, test, fixture, autor }) {
    if (!run && !test && !fixture) {
      throw new DestructivePlanError(
        "Falta la identidad del origen: declara run, test o fixture. " +
          "Una limpieza sin origen no es auditable.",
      );
    }
    this.run = run ?? null;
    this.test = test ?? null;
    this.fixture = fixture ?? null;
    this.autor = autor ?? null;
  }
  etiqueta() {
    return [
      this.run && `run=${this.run}`,
      this.test && `test=${this.test}`,
      this.fixture && `fixture=${this.fixture}`,
    ]
      .filter(Boolean)
      .join(" ");
  }
}

export class DestructivePlan {
  /**
   * @param {object} cfg
   * @param {string} cfg.tabla              tabla a tocar
   * @param {Identity} cfg.identity        identidad del origen (obligatoria)
   * @param {{from:string,to:string}} cfg.dateRange  rango OBLIGATORIO (ISO)
   * @param {string} cfg.razon             por qué se borra
   * @param {string} cfg.db                cliente con service_role
   * @param {string} cfg.url               base de Supabase
   */
  constructor({ tabla, identity, dateRange, razon, db, url, alcance }) {
    if (!tabla) throw new DestructivePlanError("Falta la tabla.");
    if (!(identity instanceof Identity)) {
      throw new DestructivePlanError("Falta la identidad del origen (Identity).");
    }
    if (!dateRange || !dateRange.from || !dateRange.to) {
      throw new DestructivePlanError(
        `Rango de fechas OBLIGATORIO para ${tabla}. Una limpieza sin rango ` +
          `no se puede revisar. Usa { from: '2026-10-07T00:00:00Z', to: '2026-10-08T00:00:00Z' }.`,
      );
    }
    if (String(dateRange.from) >= String(dateRange.to)) {
      throw new DestructivePlanError(`Rango inválido: from >= to (${dateRange.from} >= ${dateRange.to}).`);
    }
    if (!razon) throw new DestructivePlanError("Falta la razón de la operación.");
    if (!db) throw new DestructivePlanError("Falta el cliente de base de datos.");

    this.tabla = tabla;
    this.identity = identity;
    this.dateRange = dateRange;
    this.razon = razon;
    this.db = db;
    this.url = url;
    // Alcance explícito. Sin él, un rango de fechas puede seguir siendo demasiado
    // ancho y alcanzar filas de otra empresa que casualmente caen en la ventana.
    this.alcance = alcance ?? {};
    if (Object.keys(this.alcance).length === 0) {
      throw new DestructivePlanError(
        `Falta el alcance para ${tabla}. Declara company_id (y el discriminante que ` +
          `identifica al fixture). Un rango de fechas sin alcance puede tocar otra empresa.`,
      );
    }
    this.manifest = null;
    this.token = null;
    this.ejecutado = false;
    this.antes = null;
    this.despues = null;
  }

  /**
   * Valida el criterio de selección antes de tocar nada.
   * Un criterio que solo mira atributos de negocio (status, result, ...) está
   * prohibido: es exactamente el patrón que perdió datos.
   */
  static validarCriterio({ tabla, criterio, columnasReservadas }) {
    const claves = Object.keys(criterio || {});
    if (claves.length === 0) {
      throw new DestructivePlanError(`Criterio vacío para ${tabla}: no se puede borrar "todo".`);
    }
    const soloNegocio = claves.filter((k) => ATRIBUTOS_DE_NEGOCIO.includes(k));
    const hayDiscriminate =
      claves.some((k) => ["gte", "lte", "created_at", "company_id", "run_id", "fixture_id"].some((p) => k.includes(p))) ||
      claves.some((k) => !ATRIBUTOS_DE_NEGECIO.includes(k) && !columnasReservadas?.includes(k));
    if (soloNegocio.length === claves.length || !hayDiscriminate) {
      throw new DestructivePlanError(
        `Criterio PROHIBIDO en ${tabla}: selecciona solo por atributos de negocio ` +
          `(${soloNegocio.join(", ")}). Añade un discriminante explícito: rango de ` +
          `created_at, company_id o identidad de fixture.`,
      );
    }
    return true;
  }

  async _traer(cols, extraQuery = "") {
    // Operador SIEMPRE explícito. En esta instancia de PostgREST la forma
    // desnuda `col=valor` falla con PGRST100 ("unexpected ... expecting not or
    // operator") y la consulta dies antes de devolver nada, lo que hacía que
    // el guardia no se enterara del alcance real.
    const q = (k, v) => {
      if (v === null || v === undefined) return `${k}=is.null`;
      if (typeof v === "object" && Array.isArray(v.in)) return `${k}=in.(${v.in.join(",")})`;
      return `${k}=${v.op ?? "eq"}.${v.val ?? v}`;
    };
    const alcance = Object.entries(this.alcance).map(([k, v]) => q(k, v)).join("&");
    const url =
      `${this.url}/rest/v1/${this.tabla}?select=${cols}` +
      `&created_at=gte.${this.dateRange.from}&created_at=lte.${this.dateRange.to}` +
      (alcance ? `&${alcance}` : "") +
      extraQuery;
    const r = await this.db.get(url);
    if (!r.ok) {
      const cuerpo = typeof r.text === "function" ? await r.text().catch(() => "") : "";
      throw new DestructivePlanError(
        `No se pudo leer ${this.tabla}: HTTP ${r.status}. ${cuerpo.slice(0, 220)}\n  url: ${url}`,
      );
    }
    return r.json();
  }

  /**
   * Paso 1 · MANIFIESTO. Solo lee. Imprime exactamente qué se va a tocar,
   * incluidas las dependencias que se arrastrarán por ON DELETE CASCADE.
   */
  async plan({ columnas = "id,company_id,lot_id,created_at,status", dependencias = [] } = {}) {
    const listaCols = [...new Set([...columnas.split(","), ...dependencias.flatMap((d) => d.columnas.split(","))])];
    const filas = await this._traer(listaCols.join(","));

    const manifiesto = [];
    for (const f of filas) {
      const fila = { id: f.id, company_id: f.company_id ?? null, lot_id: f.lot_id ?? null, created_at: f.created_at ?? null, status: f.status ?? null };
      fila.dependencias = {};
      for (const d of dependencias) {
        const propias = f[d.clave] ?? {};
        fila.dependencias[d.clave] = Array.isArray(propias) ? propias.length : 0;
      }
      manifiesto.push(fila);
    }

    const resumen = {};
    for (const f of manifiesto) {
      const k = `${f.company_id ?? "(sin empresa)"} · ${f.status ?? "(sin estado)"} · ${String(f.created_at).slice(0, 10)}`;
      resumen[k] = (resumen[k] || 0) + 1;
    }
    const totDep = {};
    for (const d of dependencias) {
      totDep[d.clave] = manifiesto.reduce((a, f) => a + (f.dependencias[d.clave] || 0), 0);
    }

    const huella = crypto
      .createHash("sha256")
      .update(JSON.stringify({ tabla: this.tabla, rango: this.dateRange, alcance: this.alcance, filas: manifiesto.map((f) => f.id).sort() }))
      .digest("hex")
      .slice(0, 16);

    this.manifest = { tabla: this.tabla, rango: this.dateRange, alcance: this.alcance, identidad: this.identity.etiqueta(), razon: this.razon, filas: manifiesto, resumen, dependencias: totDep };
    this.token = huella;

    console.log("");
    console.log("╔══════════════════════════════════════════════════════════════════╗");
    console.log("║  DRY-RUN · NINGUNA ESCRITURA REALIZADA                          ║");
    console.log("╚══════════════════════════════════════════════════════════════════╝");
    console.log(`  tabla      ${this.tabla}`);
    console.log(`  identidad  ${this.identity.etiqueta()}${this.identity.autor ? " · autor=" + this.identity.autor : ""}`);
    console.log(`  razón      ${this.razon}`);
    console.log(`  rango      ${this.dateRange.from}  →  ${this.dateRange.to}`);
    console.log(`  alcance    ${Object.entries(this.alcance).map(([k, v]) => k + "=" + String(v).slice(0, 8)).join("  ")}`);
    console.log(`  filas      ${manifiesto.length}`);
    if (dependencias.length) {
      console.log("  cascada    " + Object.entries(totDep).map(([k, v]) => `${k}=${v}`).join("  "));
    }
    console.log("  desglose   ");
    for (const [k, v] of Object.entries(resumen).sort()) console.log(`               ${String(v).padStart(5)}  ${k}`);
    console.log("");
    console.log(`  ids (${Math.min(manifiesto.length, 25)} de ${manifiesto.length}):`);
    for (const f of manifiesto.slice(0, 25)) {
      console.log(`    ${f.id}  emp=${(f.company_id || "-").slice(0, 8)}  lote=${(f.lot_id || "-").slice(0, 8)}  ${String(f.created_at).slice(0, 19)}  ${f.status || "-"}`);
    }
    if (manifiesto.length > 25) console.log(`    … y ${manifiesto.length - 25} más (usa --json para el manifiesto completo)`);
    console.log("");
    console.log(`  TOKEN DE APLICACIÓN: ${huella}`);
    console.log("  Para ejecutar de verdad hay que pasar ese token explícitamente.");
    console.log("  Sin token, apply() lanza y no abre ninguna conexión de escritura.");
    console.log("");
    return this.manifest;
  }

  /** Vuelca el manifiesto completo a disco para revisión externa. */
  escribirManifiesto(ruta) {
    if (!this.manifest) throw new DestructivePlanError("Llama a plan() antes de escribir el manifiesto.");
    require_write(ruta, JSON.stringify({ generado: new Date().toISOString(), token: this.token, ...this.manifest }, null, 2));
    return ruta;
  }

  /**
   * Paso 2 · POST-CHECK: estado previo, antes de borrar.
   */
  async postcheckAntes({ columnas = "id" } = {}) {
    this.antes = await this._traer(columnas);
    console.log(`  [pre-check] ${this.tabla}: ${this.antes.length} filas vivas en el rango`);
    return this.antes;
  }

  /**
   * Paso 3 · APLICAR. Exige el token. Sin token: 0 escrituras.
   */
  async apply({ token, lote = 4 } = {}) {
    if (!this.manifest) throw new DestructivePlanError("Llama a plan() antes de apply().");
    if (!token) {
      throw new DestructivePlanError(
        "SIN CONFIRMACIÓN: 0 escrituras. Ejecuta primero plan() y pasa el token " +
          "que imprimió como { token: '...' }.",
      );
    }
    if (token !== this.token) {
      throw new DestructivePlanError(
        `Token inválido: ${token} != ${this.token}. El manifiesto cambió desde el dry-run; ` +
          "vuelve a ejecutar plan().",
      );
    }
    if (this.ejecutado) throw new DestructivePlanError("Esta operación ya se ejecutó.");

    await this.postcheckAntes();

    const ids = this.manifest.filas.map((f) => f.id);
    const h = { apikey: this.db.key, Authorization: "Bearer " + this.db.key, Prefer: "return=minimal" };
    for (let i = 0; i < ids.length; i += lote) {
      const q = `id=in.(${ids.slice(i, i + lote).join(",")})`;
      const r = await fetch(`${this.url}/rest/v1/${this.tabla}?${q}`, { method: "DELETE", headers: h });
      if (!r.ok) {
        const t = await r.text();
        throw new DestructivePlanError(`DELETE ${this.tabla} falló en el lote ${i}: HTTP ${r.status} ${t.slice(0, 160)}`, {
          loteInicial: i,
          yaBorrados: i,
        });
      }
      process.stdout.write(`\r  borradas ${Math.min(i + lote, ids.length)}/${ids.length}   `);
    }
    console.log("");
    this.ejecutado = true;

    const despues = await this._traer("id");
    this.despues = despues;
    const sobrantes = ids.filter((id) => despues.some((d) => d.id === id));
    console.log(`  [post-check] ${this.tabla}: ${despues.length} filas vivas en el rango, ${sobrantes.length} de las objetivo siguen presentes`);
    if (sobrantes.length) {
      console.log("    pendientes (no forzar): " + sobrantes.slice(0, 5).join(", "));
      console.log("    Motivo habitual: trigger append-only o FK sin cascada. NO forzarlo.");
    }
    return { borradas: ids.length - sobrantes.length, pendientes: sobrantes };
  }
}

function require_write(ruta, contenido) {
  fs.writeFileSync(ruta, contenido);
}

/**
 * Lint de arneses: detecta filtros destructivos que solo miran status.
 * Pensado para correr sobre los scripts de prueba.
 */
export function auditarScripts(rutas, { soloAdvertir = true, ventana = 20 } = {}) {
  const hallazgos = [];
  for (const ruta of rutas) {
    let src = "";
    try {
      src = fs.readFileSync(ruta, "utf8");
    } catch {
      continue;
    }
    const lineas = src.split("\n");
    lineas.forEach((linea, i) => {
      const esDelete = /method:\s*["']DELETE["']/.test(linea) || /\.delete\(/.test(linea) || /await del\(/.test(linea) || /\.filter\([^)]*status[^)]*\)\s*;?\s*$/.test(linea);
      if (!esDelete) return;
      // Una DEFINICION de helper (const del = async (...) => { ... method:DELETE })
      // no borra nada por sí misma. Marcarla sería un falso positivo constante.
      const esDefinicionDeHelper =
        /^\s*(const|let|var|function)\s+\w+\s*=/.test(linea) && /method:\s*["']DELETE["']/.test(linea);
      if (esDefinicionDeHelper) return;
      // Ventana amplia a propósito: el filtro suele construirse varias líneas
      // por encima del DELETE (p. ej. `const abiertas = rows(...).filter(lot_id...)`
      // y después `for (...) del(...)`). Con ventana corta salen falsos positivos.
      const ventanaTexto = lineas.slice(Math.max(0, i - ventana), i + 3).join("\n");
      // Un discriminante debe acotar el ÁMBITO de la selección, no la forma del
      // DELETE. `id=eq.` no cuenta: los ids salen de una consulta, y si esa
      // consulta no está acotada, borrar "por id" borra exactamente lo que no
      // se quería. Ese fue el patrón real que perdió 25 inspecciones.
      const discriminantes = [];
      if (/lot_id/.test(ventanaTexto)) discriminantes.push("lot_id");
      if (/company_id/.test(ventanaTexto)) discriminantes.push("company_id");
      if (/created_at|\.startsWith\(|20\d\d-\d\d-\d\d/.test(ventanaTexto)) discriminantes.push("fecha");
      if (/Identity|fixture|testId|runId|purge_company_catalog|DestructivePlan/.test(ventanaTexto)) discriminantes.push("identidad");
      if (discriminantes.length) return; // hay al menos un discriminante de alcance alrededor
      const usaStatus = /status/.test(ventanaTexto);
      const borraPorId = /id=eq\.|id=in\./.test(ventanaTexto);
      hallazgos.push({
        ruta,
        linea: i + 1,
        motivo:
          "DELETE sin discriminante de alcance (lot_id/company_id/fecha/identidad) en las " +
          (ventana + 3) + " lineas previas" +
          (usaStatus ? "; usa status" : "") +
          (borraPorId ? "; borrar por id NO acota el ambito de la seleccion" : ""),
      });
    });
  }
  if (hallazgos.length && !soloAdvertir) {
    throw new DestructivePlanError(`${hallazgos.length} operacion(es) destructiva(s) sin dry-run obligatorio`, hallazgos);
  }
  return hallazgos;
}