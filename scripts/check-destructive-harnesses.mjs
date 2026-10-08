// ============================================================================
// LINT OBLIGATORIO DE OPERACIONES DESTRUCTIVAS
//
// Se ejecuta como parte de `npm run lint`. Falla si algún script del alcance
// hace un DELETE sin un discriminante de alcance en su contexto.
//
// Motivo
//   Durante 09 · OFFLINE se borraron 25 inspecciones históricas legítimas. El
//   filtro destructivo era `status === "EN CURSO" && !tieneQualityEvaluations`,
//   aplicado sin acotar por fecha, empresa ni identidad de fixture. Un arnés que
//   "parecía" acotado en el papel se aplicó a la base entera.
//
//   Borrar por id NO acota el ámbito: los ids provienen de una consulta, y si esa
//   consulta no está acotada, borrar "por id" borra exactamente lo que no se
//   quería. Por eso el discriminante exigido es de ÁMBITO
//   (lot_id / company_id / created_at / identidad), no la forma del DELETE.
//
// ALCANCE
//   1. scripts/** del repositorio: obligatorio, siempre.
//   2. $HARNESS_DIR, si está definido: los arneses de prueba.
//
// FALLA si el alcance está vacío. Un lint que nunca encuentra nada porque no
// miró nada es peor que no tener lint.
//
// FALSO POSITIVO CONOCIDO (documentado, no silenciado)
//   d035_final_battery.mjs:255
//     for (const i of sobrantes) await del("inspections", "id=eq." + i.id);
//   Marcado por el heurístico, pero es SEGURO: `sobrantes` se deriva de
//   `jAbiertas`, que ya viene filtrado por `i.lot_id === LOTEJ`, y se le resta
//   el snapshot de inspecciones abiertas que había al inicio de la sección J.
//   Es decir, el ámbito está acotado por lote, solo que 10 líneas más arriba, y
//   el heurístico no rastrea la procedencia de la variable.
//
//   NO se silenció con una lista de excepciones: hacerlo convertiría el lint en
//   theater y dejaría pasar el bypass real. Se documenta aquí y se revisa a mano.
//   La corrección real (ventana de 20 líneas) ya está en auditarScripts(); este
//   caso concreto requiere rastrear procedencia de variables, que es un lint
//   distinto. Tratarlo como excepción sería el error que este archivo previene.
// ============================================================================

import { auditarScripts, DestructivePlanError } from "./dry-run-guard.mjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// fileURLToPath es obligatorio: en Windows `new URL(...).pathname` devuelve
// "/C:/ruta/..." y fs.existsSync la rechaza.
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function recolectar(dir) {
  const salida = [];
  if (!dir || !fs.existsSync(dir)) return salida;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue;
      salida.push(...recolectar(p));
    } else if (/\.(mjs|cjs|js|ts)$/.test(entrada.name)) {
      salida.push(p);
    }
  }
  return salida;
}

const alcances = [{ nombre: "scripts/**", dir: path.join(RAIZ, "scripts") }];
if (process.env.HARNESS_DIR) alcances.push({ nombre: "HARNESS_DIR", dir: process.env.HARNESS_DIR });

let total = 0;
const todos = [];
for (const a of alcances) {
  const archivos = recolectar(a.dir);
  console.log(`lint-destructivo · ${a.nombre}: ${archivos.length} archivo(s)`);
  if (!archivos.length) {
    console.error(`  ERROR: el alcance ${a.nombre} no contiene ningún archivo. El lint no puede pasar vacío.`);
    process.exit(1);
  }
  todos.push(...archivos);
  total += archivos.length;
}

const hallazgos = auditarScripts(todos, { soloAdvertir: true, ventana: 20 });

console.log(`lint-destructivo · ${total} archivo(s) analizados`);
if (!hallazgos.length) {
  console.log("lint-destructivo · OK: ningún DELETE sin discriminante de alcance");
  process.exit(0);
}

console.error("");
console.error(`lint-destructivo · ${hallazgos.length} operacion(es) destructiva(s) sin acotar:`);
for (const h of hallazgos) {
  console.error(`  ${h.ruta}:${h.linea}`);
  console.error(`    ${h.motivo}`);
}
console.error("");
console.error("  Cada DELETE debe poder rastrearse hasta un discriminante de ambito:");
console.error("  lot_id, company_id, created_at o identidad de fixture.");
console.error("  Idealmente, usar DestructivePlan de scripts/dry-run-guard.mjs:");
console.error("  dry-run con manifiesto -> revisar -> token -> apply().");
process.exit(1);