import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = path.join(process.cwd(), "data", "diagnosticos.db");

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new DatabaseSync(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL;");
  _db.exec("PRAGMA foreign_keys = ON;");
  return _db;
}

export function dbPath() {
  return DB_PATH;
}

let _initialized = false;

function migrate(db: DatabaseSync) {
  const tryAlter = (sql: string) => {
    try {
      db.exec(sql);
    } catch {
      // column already exists
    }
  };
  tryAlter(`ALTER TABLE users ADD COLUMN hourly_rate REAL`);
  tryAlter(`ALTER TABLE customers ADD COLUMN email TEXT`);
  tryAlter(`ALTER TABLE customers ADD COLUMN lead_source TEXT`);
  tryAlter(`ALTER TABLE jobs ADD COLUMN notes TEXT`);
  tryAlter(`ALTER TABLE jobs ADD COLUMN source TEXT NOT NULL DEFAULT 'admin'`);
  tryAlter(`ALTER TABLE company_settings ADD COLUMN company_name TEXT NOT NULL DEFAULT 'Your Company'`);
  tryAlter(`ALTER TABLE company_settings ADD COLUMN address TEXT NOT NULL DEFAULT ''`);
  tryAlter(`ALTER TABLE company_settings ADD COLUMN phone TEXT NOT NULL DEFAULT ''`);
  tryAlter(`ALTER TABLE company_settings ADD COLUMN support_email TEXT NOT NULL DEFAULT ''`);
  tryAlter(`ALTER TABLE company_settings ADD COLUMN website TEXT NOT NULL DEFAULT ''`);
  tryAlter(`ALTER TABLE company_settings ADD COLUMN logo_path TEXT NOT NULL DEFAULT ''`);
  tryAlter(`ALTER TABLE company_settings ADD COLUMN trade_license TEXT NOT NULL DEFAULT ''`);
  tryAlter(`ALTER TABLE company_settings ADD COLUMN insurance_carrier TEXT NOT NULL DEFAULT ''`);
  tryAlter(`ALTER TABLE company_settings ADD COLUMN service_area TEXT NOT NULL DEFAULT ''`);

  // jobs.tech_id was originally NOT NULL; rebuild the table to allow NULL so
  // public-intake jobs can sit unassigned until a dispatcher assigns a tech.
  const jobsInfo = db.prepare(`PRAGMA table_info(jobs)`).all() as any[];
  const techCol = jobsInfo.find((c: any) => c.name === "tech_id");
  if (techCol && techCol.notnull) {
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec(`
      CREATE TABLE jobs_new (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id),
        equipment_id TEXT REFERENCES equipment(id),
        tech_id TEXT REFERENCES users(id),
        job_type TEXT NOT NULL,
        notes TEXT,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('scheduled','in_progress','closed','cancelled')) DEFAULT 'scheduled',
        source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','tech','public_intake')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO jobs_new (id, customer_id, equipment_id, tech_id, job_type, notes, scheduled_at, status, source, created_at)
        SELECT id, customer_id, equipment_id, tech_id, job_type, notes, scheduled_at, status, COALESCE(source, 'admin'), created_at FROM jobs;
      DROP TABLE jobs;
      ALTER TABLE jobs_new RENAME TO jobs;
    `);
    db.exec("PRAGMA foreign_keys = ON;");
  }
}

export function ensureSchema(): DatabaseSync {
  const db = getDb();
  if (_initialized) return db;
  const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  db.exec(sql);
  migrate(db);
  _initialized = true;
  return db;
}
