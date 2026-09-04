/* ============================================================
   CLO-CLO Backend | repositories/store.js — couche REPOSITORY
   Base de données RÉELLE : Turso (libSQL). Turso est un vrai
   service de base de données distant (tier gratuit généreux) :
   les données survivent aux redéploiements/redémarrages de
   Render, contrairement à un fichier SQLite posé sur le disque
   éphémère de Render.

   En local (pas de TURSO_DATABASE_URL défini), le même client
   pointe simplement vers un fichier SQLite local — aucun compte
   Turso requis pour développer.
   ============================================================ */
import { createClient } from "@libsql/client";
import { config } from "../config.js";

export const db = createClient({
  url: config.tursoUrl,
  authToken: config.tursoAuthToken,
});

async function migrate() {
  await db.executeMultiple(`
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
      passwordHash TEXT NOT NULL,
      paieType TEXT DEFAULT 'journalier',
      paieMontant INTEGER DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      authKey TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      value INTEGER NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL REFERENCES orders(id),
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS livreur_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      livreurId INTEGER NOT NULL REFERENCES livreurs(id),
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // Colonnes ajoutées après la première mise en prod : ALTER TABLE
  // ne supporte pas "IF NOT EXISTS" sur SQLite/libSQL, donc on tente
  // et on ignore silencieusement l'erreur si la colonne existe déjà.
  const patchColumns = [
    "ALTER TABLE livreurs ADD COLUMN paieType TEXT DEFAULT 'journalier'",
    "ALTER TABLE livreurs ADD COLUMN paieMontant INTEGER DEFAULT 0",
    "ALTER TABLE livreurs ADD COLUMN photoUrl TEXT",
    "ALTER TABLE users ADD COLUMN favoriteAddresses TEXT DEFAULT '[]'",
    "ALTER TABLE orders ADD COLUMN rating INTEGER",
    "ALTER TABLE orders ADD COLUMN ratingComment TEXT",
    "ALTER TABLE orders ADD COLUMN tip INTEGER DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN scheduledFor TEXT",
    "ALTER TABLE orders ADD COLUMN promoCode TEXT",
    "ALTER TABLE orders ADD COLUMN discount INTEGER DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN fraisLivraison INTEGER DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN distanceKm REAL",
    "ALTER TABLE orders ADD COLUMN confirmedLivreurAt TEXT",
    "ALTER TABLE orders ADD COLUMN confirmedClientAt TEXT",
    "ALTER TABLE orders ADD COLUMN confirmedAdminAt TEXT",
    "ALTER TABLE livreurs ADD COLUMN actif INTEGER DEFAULT 1",
    "ALTER TABLE admins ADD COLUMN tel TEXT",
  ];
  for (const sql of patchColumns) {
    try { await db.execute(sql); } catch { /* colonne déjà présente */ }
  }
}

const ready = migrate();
/** À appeler avant toute requête si on veut être sûr que le schéma existe (bootstrap). */
export const schemaReady = () => ready;

/* Config par collection : table SQL réelle + colonnes spéciales
   (JSON sérialisé, booléens stockés en 0/1) */
const SCHEMAS = {
  users:         { table: "users",          columns: ["nom","email","tel","quartier","adresse","points","commandes","niveau","passwordHash","favoriteAddresses"], json: ["favoriteAddresses"] },
  livreurs:      { table: "livreurs",        columns: ["matricule","nom","tel","vehicule","statut","passwordHash","paieType","paieMontant","photoUrl","actif"], bool: ["actif"] },
  admins:        { table: "admins",          columns: ["username","passwordHash","tel"] },
  products:      { table: "products",        columns: ["name","price","category","popular","desc","img"], bool: ["popular"] },
  rewards:       { table: "rewards",         columns: ["name","desc","cost","available"], bool: ["available"] },
  zones:         { table: "zones",           columns: ["ville","quartier"] },
  orders:        { table: "orders",          columns: ["userId","items","total","adresse","quartier","statut","livreurId","etaMinutes","createdAt","rating","ratingComment","tip","scheduledFor","promoCode","discount","fraisLivraison","distanceKm","confirmedLivreurAt","confirmedClientAt","confirmedAdminAt"], json: ["items"] },
  pointsHistory: { table: "points_history",  columns: ["userId","label","date","pts","type"] },
  pushSubs:      { table: "push_subscriptions", columns: ["channel","endpoint","p256dh","authKey"] },
  promoCodes:    { table: "promo_codes",     columns: ["code","type","value","active"], bool: ["active"] },
  messages:      { table: "messages",        columns: ["orderId","sender","text","createdAt"] },
  livreurMessages: { table: "livreur_messages", columns: ["livreurId","sender","text","createdAt"] },
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
  async all(collection) {
    await ready;
    const schema = SCHEMAS[collection];
    const res = await db.execute(`SELECT * FROM ${schema.table}`);
    return res.rows.map((r) => fromRow(collection, r));
  },

  async findById(collection, id) {
    await ready;
    const schema = SCHEMAS[collection];
    const res = await db.execute({ sql: `SELECT * FROM ${schema.table} WHERE id = ?`, args: [Number(id)] });
    return fromRow(collection, res.rows[0]);
  },

  async findOne(collection, whereClause, ...params) {
    await ready;
    const schema = SCHEMAS[collection];
    const res = await db.execute({ sql: `SELECT * FROM ${schema.table} WHERE ${whereClause}`, args: params });
    return fromRow(collection, res.rows[0]);
  },

  async insert(collection, record) {
    await ready;
    const schema = SCHEMAS[collection];
    const row = toRow(collection, record);
    const cols = Object.keys(row);
    const placeholders = cols.map(() => "?").join(", ");
    const res = await db.execute({
      sql: `INSERT INTO ${schema.table} (${cols.join(", ")}) VALUES (${placeholders})`,
      args: cols.map((c) => row[c]),
    });
    return this.findById(collection, Number(res.lastInsertRowid));
  },

  async update(collection, id, patch) {
    await ready;
    const schema = SCHEMAS[collection];
    const row = toRow(collection, patch);
    const cols = Object.keys(row);
    if (cols.length === 0) return this.findById(collection, id);
    const setClause = cols.map((c) => `${c} = ?`).join(", ");
    await db.execute({
      sql: `UPDATE ${schema.table} SET ${setClause} WHERE id = ?`,
      args: [...cols.map((c) => row[c]), Number(id)],
    });
    return this.findById(collection, id);
  },

  async remove(collection, id) {
    await ready;
    const schema = SCHEMAS[collection];
    const res = await db.execute({ sql: `DELETE FROM ${schema.table} WHERE id = ?`, args: [Number(id)] });
    return Number(res.rowsAffected) > 0;
  },
};

export const RawDB = db; // réservé au bootstrap (création admin initial, seed des zones)
