// backend/db.js
import Database from "better-sqlite3";
import { seedExercisesIfEmpty } from "./exercisesData.js"; // assure-toi que ce fichier est la version "sans durées"

export const db = new Database("./db.sqlite");

export function initialize() {
  // un peu de robustesse sqlite
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Crée ou migre le schéma
  ensureSchema();

  // Seed si vide
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM exercises").get();
  if (c === 0) seedExercisesIfEmpty(db);
}

function ensureSchema() {
  const hasTable = !!db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='exercises'"
    )
    .get();

  if (!hasTable) {
    createNewSchema();
    return;
  }

  // Détecte l'ancien schéma (présence de colonnes legacy)
  const cols = db.prepare("PRAGMA table_info(exercises)").all();
  const names = new Set(cols.map((c) => c.name));
  const isLegacy =
    names.has("duration_default") ||
    names.has("split_seconds") ||
    // (on tolère tout ancien 'cue_type' mais s'il y a les colonnes legacy on migre)
    false;

  if (isLegacy) migrateLegacyToNew();
}

function createNewSchema() {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS exercises (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      level     TEXT NOT NULL CHECK(level IN ('debutant','intermediaire','confirme')),
      category  TEXT NOT NULL CHECK(category IN ('warmup','work','rest','stretch')),
      name      TEXT NOT NULL,
      instruction TEXT NOT NULL,
      cue_type  TEXT NOT NULL CHECK(cue_type IN ('none','split')) DEFAULT 'none'
    )
  `
  ).run();
}

function migrateLegacyToNew() {
  const txn = db.transaction(() => {
    // 1) créer la nouvelle table
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS exercises_new (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        level     TEXT NOT NULL CHECK(level IN ('debutant','intermediaire','confirme')),
        category  TEXT NOT NULL CHECK(category IN ('warmup','work','rest','stretch')),
        name      TEXT NOT NULL,
        instruction TEXT NOT NULL,
        cue_type  TEXT NOT NULL CHECK(cue_type IN ('none','split')) DEFAULT 'none'
      )
    `
    ).run();

    // 2) copier les données en mappant cue_type
    //    - 'split' reste 'split'
    //    - tout le reste devient 'none' (y compris 'single')
    db.prepare(
      `
      INSERT INTO exercises_new (id, level, category, name, instruction, cue_type)
      SELECT
        id,
        level,
        category,
        name,
        instruction,
        CASE
          WHEN lower(coalesce(cue_type, 'none')) = 'split' THEN 'split'
          ELSE 'none'
        END AS cue_type
      FROM exercises
    `
    ).run();

    // 3) remplacer l'ancienne table
    db.prepare(`DROP TABLE exercises`).run();
    db.prepare(`ALTER TABLE exercises_new RENAME TO exercises`).run();
  });

  txn();
}
