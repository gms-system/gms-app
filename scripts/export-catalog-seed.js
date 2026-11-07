/**
 * Exports the bundled frontend catalog (india-vehicles.ts + parts-catalog.ts)
 * to backend/app/data/catalog_seed.json, which migration 006 loads into the
 * cloud catalog table.
 *
 * Run (from repo root, inside a Node container that has frontend/node_modules):
 *   node scripts/export-catalog-seed.js
 */
const fs = require("fs");
const path = require("path");
const ts = require(path.join(__dirname, "../frontend/node_modules/typescript"));

function load(rel) {
  const src = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, require);
  return mod.exports;
}

const v = load("frontend/src/lib/india-vehicles.ts");
const p = load("frontend/src/lib/parts-catalog.ts");

const seed = {
  cars: v.INDIA_VEHICLES,
  two_wheelers: v.INDIA_TWO_WHEELERS,
  spare_parts: p.SPARE_PARTS,
  lubes: p.LUBES,
};

const out = path.join(__dirname, "../backend/app/data/catalog_seed.json");
fs.writeFileSync(out, JSON.stringify(seed, null, 1));
console.log(`wrote ${out}: cars=${seed.cars.length} two_wheelers=${seed.two_wheelers.length} spare_parts=${seed.spare_parts.length} lubes=${seed.lubes.length}`);
