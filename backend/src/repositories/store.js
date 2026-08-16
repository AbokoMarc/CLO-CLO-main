/* ============================================================
   CLO-CLO Backend | repositories/store.js — couche REPOSITORY
   Base de données RÉELLE : SQLite via node:sqlite (natif Node
   22.5+, zéro dépendance npm). Fichier unique et persistant :
   backend/data/cloclo.sqlite
   ============================================================ */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DB_PATH = path.join(DATA_DIR, "cloclo.sqlite");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    tel TEXT,
    quartier TEXT,
    adresse TEXT,
    points INTEGER DEFAULT 0,
    commandes INTEGER DEFAULT 0,
    niveau TEXT DEFAULT 'Bronze',
    passwordHash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS livreurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    tel TEXT,
    vehicule TEXT DEFAULT 'Moto',
    statut TEXT DEFAULT 'disponible',
    passwordHash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    popular INTEGER DEFAULT 0,
    desc TEXT,
    img TEXT
  );

  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    desc TEXT,
    cost INTEGER NOT NULL,
    available INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ville TEXT NOT NULL,
    quartier TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    items TEXT NOT NULL,
    total INTEGER NOT NULL,
    adresse TEXT,
    quartier TEXT,
    statut TEXT DEFAULT 'en_preparation',
    livreurId INTEGER,
    etaMinutes INTEGER DEFAULT 25,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS points_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    label TEXT,
    date TEXT,
    pts INTEGER,
    type TEXT
  );
`);

/* Config par collection : table SQL réelle + colonnes spéciales
   (JSON sérialisé, booléens stockés en 0/1) */
const SCHEMAS = {
  users:         { table: "users",          columns: ["nom","email","tel","quartier","adresse","points","commandes","niveau","passwordHash"] },
  livreurs:      { table: "livreurs",        columns: ["matricule","nom","tel","vehicule","statut","passwordHash"] },
  admins:        { table: "admins",          columns: ["username","passwordHash"] },
  products:      { table: "products",        columns: ["name","price","category","popular","desc","img"], bool: ["popular"] },
  rewards:       { table: "rewards",         columns: ["name","desc","cost","available"], bool: ["available"] },
  zones:         { table: "zones",           columns: ["ville","quartier"] },
  orders:        { table: "orders",          columns: ["userId","items","total","adresse","quartier","statut","livreurId","etaMinutes","createdAt"], json: ["items"] },
  pointsHistory: { table: "points_history",  columns: ["userId","label","date","pts","type"] },
};

function toRow(collection, record) {
  const schema = SCHEMAS[collection];
  const row = {};
  for (const col of schema.columns) {
    if (!(col in record)) continue;
    let val = record[col];
    if (schema.bool?.includes(col)) val = val ? 1 : 0;
    if (schema.json?.includes(col)) val = JSON.stringify(val);
    row[col] = val === undefined ? null : val;
  }
  return row;
}

function fromRow(collection, row) {
  if (!row) return null;
  const schema = SCHEMAS[collection];
  const obj = { ...row };
  if (schema.bool) for (const col of schema.bool) obj[col] = !!obj[col];
  if (schema.json) for (const col of schema.json) obj[col] = obj[col] ? JSON.parse(obj[col]) : obj[col];
  return obj;
}

export const Store = {
  all(collection) {
    const schema = SCHEMAS[collection];
    const rows = db.prepare(`SELECT * FROM ${schema.table}`).all();
    return rows.map((r) => fromRow(collection, r));
  },

  findById(collection, id) {
    const schema = SCHEMAS[collection];
    const row = db.prepare(`SELECT * FROM ${schema.table} WHERE id = ?`).get(Number(id));
    return fromRow(collection, row);
  },

  findOne(collection, whereClause, ...params) {
    const schema = SCHEMAS[collection];
    const row = db.prepare(`SELECT * FROM ${schema.table} WHERE ${whereClause}`).get(...params);
    return fromRow(collection, row);
  },

  insert(collection, record) {
    const schema = SCHEMAS[collection];
    const row = toRow(collection, record);
    const cols = Object.keys(row);
    const placeholders = cols.map(() => "?").join(", ");
    const stmt = db.prepare(`INSERT INTO ${schema.table} (${cols.join(", ")}) VALUES (${placeholders})`);
    const info = stmt.run(...cols.map((c) => row[c]));
    return this.findById(collection, info.lastInsertRowid);
  },

  update(collection, id, patch) {
    const schema = SCHEMAS[collection];
    const row = toRow(collection, patch);
    const cols = Object.keys(row);
    if (cols.length === 0) return this.findById(collection, id);
    const setClause = cols.map((c) => `${c} = ?`).join(", ");
    db.prepare(`UPDATE ${schema.table} SET ${setClause} WHERE id = ?`).run(...cols.map((c) => row[c]), Number(id));
    return this.findById(collection, id);
  },

  remove(collection, id) {
    const schema = SCHEMAS[collection];
    const info = db.prepare(`DELETE FROM ${schema.table} WHERE id = ?`).run(Number(id));
    return info.changes > 0;
  },
};

export const RawDB = db; // réservé au bootstrap (création admin initial, seed des zones)
