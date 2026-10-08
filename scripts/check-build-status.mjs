#!/usr/bin/env node
/**
 * QualityNX — Control de integridad de docs/BUILD_STATUS.md
 *
 * Previene la pérdida de memoria del proyecto por edición automatizada.
 * No reemplaza el archivo: lo VALIDA y obliga a registrar el cambio.
 *
 * Uso:
 *   node scripts/check-build-status.mjs --backup     # snapshot antes de editar
 *   node scripts/check-build-status.mjs              # valida el estado actual
 *   node scripts/check-build-status.mjs --selftest   # prueba con truncación simulada
 *
 * Códigos de salida: 0 = OK · 1 = FALLA (operación abortada) · 2 = uso incorrecto
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = join(ROOT, 'docs', 'BUILD_STATUS.md');
const BACKUP_DIR = join(ROOT, '.backups', 'docs');

/** Secciones obligatorias: si falta una, el documento está incompleto. */
const REQUIRED_SECTIONS = [
  '1. PROPÓSITO',
  '2. ETAPA ACTUAL',
  '2.1 QUALITYNX V2',
  '2.2 QUALITYNX V2',
  '2.3 QUALITYNX V2',
  '3. ESTADO GLOBAL POR ETAPA',
  '4. DECISIONES QUE GOBIERNAN',
  '5. MIGRACIONES',
  '6. CAPACIDADES TÉCNICAS VERIFICADAS',
  '7. INDICADORES',
  '8. DECISIONES DE NEGOCIO ABIERTAS',
  '9. BLOQUEOS',
  '10. HISTORIAL DE ESTADO',
  '11. SIGUIENTE TRABAJO AUTORIZADO',
];

/** Caída máxima tolerada sin autorización explícita. */
const MAX_LINE_LOSS_RATIO = 0.15;

const log = (...a) => console.log(...a);
const fail = (msg, extra = '') => {
  console.error('  [FALLA] ' + msg);
  if (extra) console.error('          ' + extra);
  process.exitCode = 1;
};

function readDoc() {
  if (!existsSync(DOC)) {
    console.error('  [FALLA] docs/BUILD_STATUS.md no existe.');
    process.exit(1);
  }
  return readFileSync(DOC, 'utf8');
}

/** Devuelve la línea base: último backup si existe; si no, la versión de git. */
function baseline() {
  if (existsSync(BACKUP_DIR)) {
    const snaps = readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.md')).sort();
    if (snaps.length > 0) {
      const file = join(BACKUP_DIR, snaps[snaps.length - 1]);
      return { content: readFileSync(file, 'utf8'), origin: 'backup ' + snaps[snaps.length - 1] };
    }
  }
  try {
    const content = execSync('git show HEAD:docs/BUILD_STATUS.md', {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    return { content, origin: 'git HEAD' };
  } catch {
    return null;
  }
}

function takeBackup() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = join(BACKUP_DIR, `BUILD_STATUS-${stamp}.md`);
  writeFileSync(file, readDoc(), 'utf8');
  log(`  [OK] Respaldo creado: .backups/docs/${file.split(/[\\/]/).pop()}`);
  log('       Siguiente paso: ejecuta el control tras cada edición.');
  return file;
}

function gitDiffStat() {
  try {
    const out = execSync('git diff --numstat -- docs/BUILD_STATUS.md', {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    if (!out) return null;
    const [add, del] = out.split(/\s+/);
    return { added: Number(add) || 0, removed: Number(del) || 0 };
  } catch {
    return null;
  }
}

function gitAddedLines() {
  try {
    return execSync('git diff -U0 -- docs/BUILD_STATUS.md', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
      .map((l) => l.slice(1));
  } catch {
    return [];
  }
}

function validate() {
  const current = readDoc();
  const curLines = current.split('\n');
  log('  [INFO] Archivo: ' + curLines.length + ' líneas, ' + current.length + ' bytes');

  // 1) Estructura obligatoria
  const missing = REQUIRED_SECTIONS.filter((s) => !current.includes(s));
  if (missing.length > 0) {
    fail('Faltan ' + missing.length + ' sección(es) obligatoria(s):', missing.join(' | '));
  } else {
    log('  [OK] Las ' + REQUIRED_SECTIONS.length + ' secciones obligatorias están presentes.');
  }

  // 2) Baseline y pérdida de contenido
  const base = baseline();
  if (!base) {
    log('  [AVISO] Sin baseline (ni backup ni git HEAD). No se puede medir pérdida.');
    return;
  }
  const baseLines = base.content.split('\n');
  const ratio = (baseLines.length - curLines.length) / baseLines.length;
  log('  [INFO] Baseline (' + base.origin + '): ' + baseLines.length + ' líneas');

  if (ratio > MAX_LINE_LOSS_RATIO) {
    fail(
      `Pérdida anormal de contenido: ${(ratio * 100).toFixed(1)} % (máximo tolerado ${(MAX_LINE_LOSS_RATIO * 100).toFixed(0)} %).`,
      'Operación abortada. Restaura desde .backups/docs/ y rehaz la edición por integración de secciones.'
    );
  } else if (ratio > 0.05) {
    log(`  [AVISO] Reducción del ${(ratio * 100).toFixed(1)} % (dentro del límite, pero revisa el diff).`);
  } else {
    log('  [OK] Sin pérdida anormal de contenido.');
  }

  // 3) Sustitución accidental por una versión antigua
  if (current === base.content) {
    log('  [AVISO] El documento es idéntico a la línea base: la edición no cambió nada.');
  }
  if (existsSync(BACKUP_DIR)) {
    const snaps = readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.md')).sort();
    for (const snap of snaps) {
      const snapContent = readFileSync(join(BACKUP_DIR, snap), 'utf8');
      if (snapContent === current && snap !== snaps[snaps.length - 1]) {
        fail('El documento actual es idéntico a un respaldo anterior (' + snap + '): posible sustitución por versión vieja.');
      }
    }
  }

  // 4) Registro de cambios obligatorio cuando hay modifications
  const stat = gitDiffStat();
  if (stat && stat.added + stat.removed > 0) {
    const added = gitAddedLines();
    const hasDate = added.some((l) => /\b20\d\d-\d\d-\d\d\b/.test(l));
    const hasSection = added.some((l) => /^\+?\s*(\d+\.\d+|\d+\.)\s+[A-ZÁÉÍÓÚÑ]/.test(l) || /sección|actualiza|registro/i.test(l));
    if (!hasDate) {
      fail('La modificación no registra fecha (se espera una línea con AAAA-MM-DD en el diff).');
    } else if (!hasSection) {
      fail('La modificación no identifica la sección actualizada ni el motivo.');
    } else {
      log(`  [OK] Registro de cambio presente (diff: +${stat.added} / -${stat.removed}).`);
    }
  }

  // 5) Resultado
  if (process.exitCode === 1) {
    console.error('\n  RESULTADO: NO se acepta la modificación de BUILD_STATUS.md.');
  } else {
    log('\n  RESULTADO: BUILD_STATUS.md íntegro.');
  }
}

function selftest() {
  log('\n== AUTOPRUEBA: truncación y sustitución ==\n');
  const original = readDoc();
  const tmp = join(ROOT, 'docs', '.BUILD_STATUS.selftest.md');

  const runOn = (content, label) => {
    writeFileSync(DOC, content, 'utf8');
    const out = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...a) => out.push(a.join(' '));
    console.error = (...a) => out.push(a.join(' '));
    const code = runInner();
    console.log = origLog;
    console.error = origErr;
    return code;
  };

  const runInner = () => {
    const saved = process.exitCode;
    process.exitCode = 0;
    validate();
    const result = process.exitCode;
    process.exitCode = saved;
    return result;
  };

  const cases = [
    { label: 'A) documento truncado al 40 %', content: original.split('\n').slice(0, Math.floor(original.split('\n').length * 0.4)).join('\n'), expect: 1 },
    { label: 'B) documento con secciones obligatorias borradas', content: original.split('\n').filter((l) => !l.includes('7. INDICADORES') && !l.includes('9. BLOQUEOS')).join('\n'), expect: 1 },
    { label: 'C) documento íntegro sin cambios', content: original, expect: 0 },
  ];

  let fallos = 0;
  for (const c of cases) {
    const code = runOn(c.content, c.label);
    const ok = code === c.expect;
    if (!ok) fallos += 1;
    log(`  ${ok ? '[OK]  ' : '[FALLA]'} ${c.label} → exit ${code} (esperado ${c.expect})`);
  }

  writeFileSync(DOC, original, 'utf8');
  try { execSync('rm ' + tmp, { stdio: 'ignore' }); } catch {}
  log('\n  Documento restaurado. Autoprueba ' + (fallos === 0 ? 'APROBADA' : 'FALLIDA') + '.');
  process.exitCode = fallos === 0 ? 0 : 1;
}

const arg = process.argv[2];
if (arg === '--backup') {
  log('== RESPALDO PREVIO ==');
  takeBackup();
} else if (arg === '--selftest') {
  selftest();
} else if (arg === undefined || arg === '--check') {
  log('== CONTROL DE INTEGRIDAD DE BUILD_STATUS ==');
  validate();
} else {
  console.error('Uso: --backup | --check (por defecto) | --selftest');
  process.exit(2);
}