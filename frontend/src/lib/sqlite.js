// frontend/src/lib/sqlite.js
import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { seedExercisesIfEmptyMobile } from "../data/exercisesSeed";

let _db;
let _conn;

const DB_NAME = "sbt";

export async function openMobileDb() {
  if (!Capacitor.isNativePlatform()) return null; // sur web: on peut fallback sur ancien fetchSession
  if (_db) return _db;

  _conn = new SQLiteConnection(CapacitorSQLite);
  _db = await _conn.createConnection(DB_NAME, false, "no-encryption", 1);
  await _db.open();

  // Crée table + seed si vide
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      instruction TEXT NOT NULL,
      duration_default INTEGER NOT NULL DEFAULT 30,
      cue_type TEXT NOT NULL DEFAULT 'single',
      split_seconds INTEGER DEFAULT 15
    );
  `);
  const res = await _db.query(`SELECT COUNT(*) as c FROM exercises;`);
  const count = res.values?.[0]?.c ?? 0;
  if (count === 0) {
    await seedExercisesIfEmptyMobile(_db);
  }
  return _db;
}

export async function closeMobileDb() {
  if (_conn && _db) {
    await _conn.closeConnection(DB_NAME);
    _db = null;
    _conn = null;
  }
}
