-- DiagnosticOS schema (Postgres / Neon)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('TECH','ADMIN','REVIEWER')),
  photo_url TEXT,
  credential TEXT,
  years_experience INTEGER,
  truck_id TEXT,
  hourly_rate REAL,
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  lead_source TEXT,
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  type TEXT NOT NULL,
  make TEXT,
  model TEXT,
  install_year INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS defect_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  family TEXT NOT NULL CHECK (family IN ('Structural','Operational-Maintenance','Construction Features','Miscellaneous')),
  description TEXT NOT NULL,
  severity_grade INTEGER NOT NULL CHECK (severity_grade BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS manufacturers (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS technical_bulletins (
  id TEXT PRIMARY KEY,
  bulletin_number TEXT UNIQUE NOT NULL,
  manufacturer_id TEXT NOT NULL REFERENCES manufacturers(id),
  product_line TEXT NOT NULL,
  symptom TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  recommended_fix TEXT NOT NULL,
  applicable_models TEXT NOT NULL,
  defect_code_id TEXT REFERENCES defect_codes(id)
);

CREATE TABLE IF NOT EXISTS vision_defect_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnostic_trees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS diagnostic_nodes (
  id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL REFERENCES diagnostic_trees(id),
  parent_node_id TEXT REFERENCES diagnostic_nodes(id),
  parent_option_value TEXT,
  node_type TEXT NOT NULL CHECK (node_type IN ('question','photo','result')),
  prompt_text TEXT NOT NULL,
  options_json TEXT,
  result_json TEXT,
  bulletin_id TEXT REFERENCES technical_bulletins(id),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trucks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  equipment_id TEXT REFERENCES equipment(id),
  tech_id TEXT REFERENCES users(id),
  job_type TEXT NOT NULL,
  notes TEXT,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled','in_progress','closed','cancelled')) DEFAULT 'scheduled',
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','tech','public_intake')),
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  tree_id TEXT NOT NULL REFERENCES diagnostic_trees(id),
  tech_id TEXT NOT NULL REFERENCES users(id),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  path_json TEXT NOT NULL DEFAULT '[]',
  primary_diagnosis TEXT,
  confidence REAL,
  secondary_diagnoses_json TEXT,
  parts_recommended_json TEXT,
  est_repair_time_minutes INTEGER,
  safety_critical INTEGER NOT NULL DEFAULT 0,
  second_opinion_requested INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('in_progress','awaiting_review','diagnosed','closed')) DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS photo_analyses (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES diagnostic_sessions(id),
  node_id TEXT REFERENCES diagnostic_nodes(id),
  category_id TEXT REFERENCES vision_defect_categories(id),
  confidence REAL NOT NULL,
  captured_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS second_opinions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES diagnostic_sessions(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  requested_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  responded_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','redirected')) DEFAULT 'pending',
  reviewer_notes TEXT,
  redirected_diagnosis TEXT
);

CREATE TABLE IF NOT EXISTS job_outcomes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  session_id TEXT REFERENCES diagnostic_sessions(id),
  tech_id TEXT NOT NULL REFERENCES users(id),
  actual_diagnosis TEXT NOT NULL,
  matched INTEGER NOT NULL,
  parts_used_json TEXT,
  closed_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  part_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_cost REAL NOT NULL,
  default_threshold INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS truck_stock (
  id TEXT PRIMARY KEY,
  truck_id TEXT NOT NULL REFERENCES trucks(id),
  part_id TEXT NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  UNIQUE(truck_id, part_id)
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS vendor_pricing (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  part_id TEXT NOT NULL REFERENCES parts(id),
  price REAL NOT NULL,
  UNIQUE(vendor_id, part_id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','received')) DEFAULT 'draft',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  total_cost REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL REFERENCES purchase_orders(id),
  part_id TEXT NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS restock_requests (
  id TEXT PRIMARY KEY,
  truck_id TEXT NOT NULL REFERENCES trucks(id),
  part_id TEXT NOT NULL REFERENCES parts(id),
  requested_by TEXT NOT NULL REFERENCES users(id),
  requested_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  status TEXT NOT NULL CHECK (status IN ('pending','fulfilled')) DEFAULT 'pending'
);

-- Regional/jurisdictional calibration layer (EPA SDWIS ingestion)
CREATE TABLE IF NOT EXISTS regional_water_data (
  pwsid TEXT PRIMARY KEY,
  pws_name TEXT NOT NULL,
  pws_type TEXT,
  city TEXT,
  county TEXT,
  state TEXT NOT NULL,
  zip_code TEXT,
  violation_count_total INTEGER NOT NULL DEFAULT 0,
  violation_count_mcl INTEGER NOT NULL DEFAULT 0,
  violation_count_mrdl INTEGER NOT NULL DEFAULT 0,
  violation_count_tt INTEGER NOT NULL DEFAULT 0,
  violation_count_monitoring INTEGER NOT NULL DEFAULT 0,
  violation_count_resolved INTEGER NOT NULL DEFAULT 0,
  violation_count_unresolved INTEGER NOT NULL DEFAULT 0,
  most_recent_violation_date TEXT,
  source TEXT NOT NULL DEFAULT 'live_api' CHECK (source IN ('live_api','bulk_csv')),
  updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_regional_water_county ON regional_water_data(state, county);
CREATE INDEX IF NOT EXISTS idx_regional_water_zip ON regional_water_data(zip_code);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('live_api','bulk_csv')),
  states TEXT,
  started_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  finished_at TEXT,
  rows_pulled INTEGER NOT NULL DEFAULT 0,
  rows_upserted INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('running','success','partial','failed')) DEFAULT 'running',
  error_message TEXT
);

-- Pricing & estimates
CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  company_name TEXT NOT NULL DEFAULT 'Your Company',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  support_email TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  logo_path TEXT NOT NULL DEFAULT '',
  trade_license TEXT NOT NULL DEFAULT '',
  insurance_carrier TEXT NOT NULL DEFAULT '',
  service_area TEXT NOT NULL DEFAULT '',
  default_markup_pct REAL NOT NULL DEFAULT 20,
  updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);
INSERT INTO company_settings (id, default_markup_pct) VALUES ('singleton', 20) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  session_id TEXT REFERENCES diagnostic_sessions(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  parts_json TEXT NOT NULL DEFAULT '[]',
  parts_cost REAL NOT NULL DEFAULT 0,
  labor_hours REAL NOT NULL DEFAULT 0,
  labor_rate REAL NOT NULL DEFAULT 0,
  labor_cost REAL NOT NULL DEFAULT 0,
  markup_pct REAL NOT NULL DEFAULT 0,
  markup_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('draft','sent','signed')) DEFAULT 'draft',
  signed_at TEXT,
  signature_name TEXT,
  signature_data TEXT
);
