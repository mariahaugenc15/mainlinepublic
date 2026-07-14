import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { rid } from "@/lib/ids";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== "seed-diagnosticos-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL ?? "");

  async function run(query: string, params: unknown[] = []) {
    let n = 0;
    const pg = query.replace(/\?/g, () => `$${++n}`);
    await sql(pg, params as any[]);
  }

  // Create all tables (schema)
  await sql(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('TECH','ADMIN','REVIEWER')), photo_url TEXT, credential TEXT, years_experience INTEGER, truck_id TEXT, hourly_rate REAL, created_at TEXT NOT NULL DEFAULT (NOW()::TEXT))`);
  await sql(`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, phone TEXT, email TEXT, lead_source TEXT, created_at TEXT NOT NULL DEFAULT (NOW()::TEXT))`);
  await sql(`CREATE TABLE IF NOT EXISTS equipment (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), type TEXT NOT NULL, make TEXT, model TEXT, install_year INTEGER, notes TEXT)`);
  await sql(`CREATE TABLE IF NOT EXISTS defect_codes (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, family TEXT NOT NULL, description TEXT NOT NULL, severity_grade INTEGER NOT NULL)`);
  await sql(`CREATE TABLE IF NOT EXISTS manufacturers (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT)`);
  await sql(`CREATE TABLE IF NOT EXISTS technical_bulletins (id TEXT PRIMARY KEY, bulletin_number TEXT UNIQUE NOT NULL, manufacturer_id TEXT NOT NULL REFERENCES manufacturers(id), product_line TEXT NOT NULL, symptom TEXT NOT NULL, root_cause TEXT NOT NULL, recommended_fix TEXT NOT NULL, applicable_models TEXT NOT NULL, defect_code_id TEXT REFERENCES defect_codes(id))`);
  await sql(`CREATE TABLE IF NOT EXISTS vision_defect_categories (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT NOT NULL)`);
  await sql(`CREATE TABLE IF NOT EXISTS diagnostic_trees (id TEXT PRIMARY KEY, name TEXT NOT NULL, equipment_type TEXT NOT NULL, description TEXT)`);
  await sql(`CREATE TABLE IF NOT EXISTS diagnostic_nodes (id TEXT PRIMARY KEY, tree_id TEXT NOT NULL REFERENCES diagnostic_trees(id), parent_node_id TEXT REFERENCES diagnostic_nodes(id), parent_option_value TEXT, node_type TEXT NOT NULL CHECK (node_type IN ('question','photo','result')), prompt_text TEXT NOT NULL, options_json TEXT, result_json TEXT, bulletin_id TEXT REFERENCES technical_bulletins(id), sort_order INTEGER NOT NULL DEFAULT 0)`);
  await sql(`CREATE TABLE IF NOT EXISTS trucks (id TEXT PRIMARY KEY, name TEXT NOT NULL)`);
  await sql(`CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), equipment_id TEXT REFERENCES equipment(id), tech_id TEXT REFERENCES users(id), job_type TEXT NOT NULL, notes TEXT, scheduled_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'scheduled', source TEXT NOT NULL DEFAULT 'admin', created_at TEXT NOT NULL DEFAULT (NOW()::TEXT))`);
  await sql(`CREATE TABLE IF NOT EXISTS diagnostic_sessions (id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), tree_id TEXT NOT NULL REFERENCES diagnostic_trees(id), tech_id TEXT NOT NULL REFERENCES users(id), started_at TEXT NOT NULL, completed_at TEXT, path_json TEXT NOT NULL DEFAULT '[]', primary_diagnosis TEXT, confidence REAL, secondary_diagnoses_json TEXT, parts_recommended_json TEXT, est_repair_time_minutes INTEGER, safety_critical INTEGER NOT NULL DEFAULT 0, second_opinion_requested INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'in_progress')`);
  await sql(`CREATE TABLE IF NOT EXISTS photo_analyses (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES diagnostic_sessions(id), node_id TEXT REFERENCES diagnostic_nodes(id), category_id TEXT REFERENCES vision_defect_categories(id), confidence REAL NOT NULL, captured_at TEXT NOT NULL DEFAULT (NOW()::TEXT))`);
  await sql(`CREATE TABLE IF NOT EXISTS second_opinions (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES diagnostic_sessions(id), reviewer_id TEXT NOT NULL REFERENCES users(id), requested_at TEXT NOT NULL DEFAULT (NOW()::TEXT), responded_at TEXT, status TEXT NOT NULL DEFAULT 'pending', reviewer_notes TEXT, redirected_diagnosis TEXT)`);
  await sql(`CREATE TABLE IF NOT EXISTS job_outcomes (id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), session_id TEXT REFERENCES diagnostic_sessions(id), tech_id TEXT NOT NULL REFERENCES users(id), actual_diagnosis TEXT NOT NULL, matched INTEGER NOT NULL, parts_used_json TEXT, closed_at TEXT NOT NULL DEFAULT (NOW()::TEXT))`);
  await sql(`CREATE TABLE IF NOT EXISTS parts (id TEXT PRIMARY KEY, part_number TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, unit_cost REAL NOT NULL, default_threshold INTEGER NOT NULL DEFAULT 2)`);
  await sql(`CREATE TABLE IF NOT EXISTS truck_stock (id TEXT PRIMARY KEY, truck_id TEXT NOT NULL REFERENCES trucks(id), part_id TEXT NOT NULL REFERENCES parts(id), quantity INTEGER NOT NULL, threshold INTEGER NOT NULL, UNIQUE(truck_id, part_id))`);
  await sql(`CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact_name TEXT, contact_email TEXT, lead_time_days INTEGER NOT NULL DEFAULT 3)`);
  await sql(`CREATE TABLE IF NOT EXISTS vendor_pricing (id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL REFERENCES vendors(id), part_id TEXT NOT NULL REFERENCES parts(id), price REAL NOT NULL, UNIQUE(vendor_id, part_id))`);
  await sql(`CREATE TABLE IF NOT EXISTS purchase_orders (id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL REFERENCES vendors(id), status TEXT NOT NULL DEFAULT 'draft', created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (NOW()::TEXT), total_cost REAL NOT NULL DEFAULT 0)`);
  await sql(`CREATE TABLE IF NOT EXISTS purchase_order_items (id TEXT PRIMARY KEY, po_id TEXT NOT NULL REFERENCES purchase_orders(id), part_id TEXT NOT NULL REFERENCES parts(id), quantity INTEGER NOT NULL, unit_price REAL NOT NULL)`);
  await sql(`CREATE TABLE IF NOT EXISTS restock_requests (id TEXT PRIMARY KEY, truck_id TEXT NOT NULL REFERENCES trucks(id), part_id TEXT NOT NULL REFERENCES parts(id), requested_by TEXT NOT NULL REFERENCES users(id), requested_at TEXT NOT NULL DEFAULT (NOW()::TEXT), status TEXT NOT NULL DEFAULT 'pending')`);
  await sql(`CREATE TABLE IF NOT EXISTS regional_water_data (pwsid TEXT PRIMARY KEY, pws_name TEXT NOT NULL, pws_type TEXT, city TEXT, county TEXT, state TEXT NOT NULL, zip_code TEXT, violation_count_total INTEGER NOT NULL DEFAULT 0, violation_count_mcl INTEGER NOT NULL DEFAULT 0, violation_count_mrdl INTEGER NOT NULL DEFAULT 0, violation_count_tt INTEGER NOT NULL DEFAULT 0, violation_count_monitoring INTEGER NOT NULL DEFAULT 0, violation_count_resolved INTEGER NOT NULL DEFAULT 0, violation_count_unresolved INTEGER NOT NULL DEFAULT 0, most_recent_violation_date TEXT, source TEXT NOT NULL DEFAULT 'live_api', updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT))`);
  await sql(`CREATE TABLE IF NOT EXISTS ingestion_runs (id TEXT PRIMARY KEY, source TEXT NOT NULL, states TEXT, started_at TEXT NOT NULL DEFAULT (NOW()::TEXT), finished_at TEXT, rows_pulled INTEGER NOT NULL DEFAULT 0, rows_upserted INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'running', error_message TEXT)`);
  await sql(`CREATE TABLE IF NOT EXISTS company_settings (id TEXT PRIMARY KEY DEFAULT 'singleton', company_name TEXT NOT NULL DEFAULT 'Your Company', address TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', support_email TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '', logo_path TEXT NOT NULL DEFAULT '', trade_license TEXT NOT NULL DEFAULT '', insurance_carrier TEXT NOT NULL DEFAULT '', service_area TEXT NOT NULL DEFAULT '', default_markup_pct REAL NOT NULL DEFAULT 20, updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT))`);
  await sql(`INSERT INTO company_settings (id, default_markup_pct) VALUES ('singleton', 20) ON CONFLICT (id) DO NOTHING`);
  await sql(`CREATE TABLE IF NOT EXISTS estimates (id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), session_id TEXT REFERENCES diagnostic_sessions(id), created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (NOW()::TEXT), parts_json TEXT NOT NULL DEFAULT '[]', parts_cost REAL NOT NULL DEFAULT 0, labor_hours REAL NOT NULL DEFAULT 0, labor_rate REAL NOT NULL DEFAULT 0, labor_cost REAL NOT NULL DEFAULT 0, markup_pct REAL NOT NULL DEFAULT 0, markup_amount REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', signed_at TEXT, signature_name TEXT, signature_data TEXT)`);

  // Clear all tables
  const tables = [
    "purchase_order_items","purchase_orders","restock_requests","vendor_pricing","vendors",
    "truck_stock","trucks","parts","job_outcomes","second_opinions","photo_analyses",
    "diagnostic_sessions","jobs","diagnostic_nodes","diagnostic_trees","technical_bulletins",
    "manufacturers","defect_codes","vision_defect_categories","equipment","customers","users",
  ];
  for (const t of tables) await sql(`DELETE FROM ${t}`);

  // Users
  const hash = bcrypt.hashSync("password123", 8);
  const techs = [
    { id: "tech_1", name: "Marcus Reyes", email: "marcus@fieldco.demo" },
    { id: "tech_2", name: "Janelle Strait", email: "janelle@fieldco.demo" },
    { id: "tech_3", name: "Devon Wycoff", email: "devon@fieldco.demo" },
    { id: "tech_4", name: "Priya Anand", email: "priya@fieldco.demo" },
  ];
  const admins = [
    { id: "admin_1", name: "Carla Bishop", email: "carla@fieldco.demo" },
    { id: "admin_2", name: "Tom Halverson", email: "tom@fieldco.demo" },
  ];
  const reviewers = [
    { id: "rev_1", name: "Dr. Ellen Castro", email: "ellen.castro@reviewboard.demo", credential: "Master Plumber, Gas Systems Certified", years: 22 },
    { id: "rev_2", name: "Walt IIonzeh", email: "walt.i@reviewboard.demo", credential: "Master Plumber, NATE Certified", years: 18 },
    { id: "rev_3", name: "Renata Sousa", email: "renata.s@reviewboard.demo", credential: "Licensed Gas Fitter, CFC Backflow Certified", years: 15 },
    { id: "rev_4", name: "Hiro Takeda", email: "hiro.t@reviewboard.demo", credential: "Master Plumber, Hydronics Specialist", years: 27 },
    { id: "rev_5", name: "Beatrix Olawale", email: "beatrix.o@reviewboard.demo", credential: "Journeyman Plumber, Senior Reviewer", years: 12 },
    { id: "rev_6", name: "Sal Marchetti", email: "sal.m@reviewboard.demo", credential: "Master Plumber, 40+ yrs Field", years: 41 },
  ];

  for (const t of techs) await run(`INSERT INTO users (id,email,password_hash,name,role,truck_id) VALUES (?,?,?,?,?,?)`, [t.id, t.email, hash, t.name, "TECH", `truck_${t.id.split("_")[1]}`]);
  for (const a of admins) await run(`INSERT INTO users (id,email,password_hash,name,role) VALUES (?,?,?,?,?)`, [a.id, a.email, hash, a.name, "ADMIN"]);
  for (const r of reviewers) await run(`INSERT INTO users (id,email,password_hash,name,role,credential,years_experience) VALUES (?,?,?,?,?,?,?)`, [r.id, r.email, hash, r.name, "REVIEWER", r.credential, r.years]);

  // Trucks
  for (const t of techs) {
    const num = t.id.split("_")[1];
    await run(`INSERT INTO trucks (id,name) VALUES (?,?)`, [`truck_${num}`, `Truck ${num} — ${t.name.split(" ")[0]}`]);
  }

  // Manufacturers
  const manufacturers = [
    { id: "mfg_heatcore", name: "Heatcore", description: "Gas and electric water heating systems." },
    { id: "mfg_aquaflow", name: "Aquaflow", description: "Fixtures, valves, and fill systems." },
    { id: "mfg_vantage", name: "Vantage Plumbing Systems", description: "Drainage, sump, and pressure equipment." },
    { id: "mfg_coreline", name: "Coreline", description: "Pipe, fittings, and supply line hardware." },
  ];
  for (const m of manufacturers) await run(`INSERT INTO manufacturers (id,name,description) VALUES (?,?,?)`, [m.id, m.name, m.description]);

  // Defect codes
  const defectCodes = [
    { id: "dc_1", code: "ST-CR-3", family: "Structural", description: "Crack, circumferential, moderate", severity: 3 },
    { id: "dc_2", code: "ST-CR-5", family: "Structural", description: "Crack, longitudinal, severe with displacement", severity: 5 },
    { id: "dc_3", code: "ST-JD-2", family: "Structural", description: "Joint displacement, minor offset", severity: 2 },
    { id: "dc_4", code: "ST-CO-4", family: "Structural", description: "Corrosion, surface loss, advanced", severity: 4 },
    { id: "dc_5", code: "OM-DE-3", family: "Operational-Maintenance", description: "Deposits, encrustation, moderate restriction", severity: 3 },
    { id: "dc_6", code: "OM-RT-2", family: "Operational-Maintenance", description: "Roots, fine, minor restriction", severity: 2 },
    { id: "dc_7", code: "OM-RT-4", family: "Operational-Maintenance", description: "Roots, tap, major restriction", severity: 4 },
    { id: "dc_8", code: "OM-SC-1", family: "Operational-Maintenance", description: "Scale, light buildup", severity: 1 },
    { id: "dc_9", code: "OM-OB-3", family: "Operational-Maintenance", description: "Obstruction, debris, moderate", severity: 3 },
    { id: "dc_10", code: "CF-TF-1", family: "Construction Features", description: "Tap, factory made, informational", severity: 1 },
    { id: "dc_11", code: "CF-LN-2", family: "Construction Features", description: "Liner present, minor wrinkle", severity: 2 },
    { id: "dc_12", code: "MS-WS-2", family: "Miscellaneous", description: "Water staining, minor", severity: 2 },
    { id: "dc_13", code: "MS-WS-4", family: "Miscellaneous", description: "Water staining, active leak indication", severity: 4 },
    { id: "dc_14", code: "MS-IF-3", family: "Miscellaneous", description: "Infiltration, moderate, groundwater", severity: 3 },
    { id: "dc_15", code: "ST-HF-5", family: "Structural", description: "Hole/fracture, severe, through-wall", severity: 5 },
    { id: "dc_16", code: "OM-VF-3", family: "Operational-Maintenance", description: "Valve fouling, partial obstruction", severity: 3 },
    { id: "dc_17", code: "OM-VF-4", family: "Operational-Maintenance", description: "Valve seat wear, severe leak-by", severity: 4 },
    { id: "dc_18", code: "MS-CO-2", family: "Miscellaneous", description: "Component degradation, cosmetic only", severity: 2 },
    { id: "dc_19", code: "ST-CO-5", family: "Structural", description: "Corrosion, perforation, failure imminent", severity: 5 },
    { id: "dc_20", code: "CF-MA-1", family: "Construction Features", description: "Material change, informational", severity: 1 },
  ];
  for (const d of defectCodes) await run(`INSERT INTO defect_codes (id,code,family,description,severity_grade) VALUES (?,?,?,?,?)`, [d.id, d.code, d.family, d.description, d.severity]);

  // Technical bulletins
  const bulletins = [
    { id: "bul_1", num: "HC-TB-1042", mfg: "mfg_heatcore", line: "ProSeries 40-Gal Gas", symptom: "Pilot lights but extinguishes within 30-60 seconds of release", cause: "Thermocouple voltage degradation below 18mV holding threshold", fix: "Replace thermocouple assembly; verify pilot flame fully envelops tip 3/8\" up", models: "PS40-GAS, PS50-GAS", defect: "dc_4" },
    { id: "bul_2", num: "HC-TB-1077", mfg: "mfg_heatcore", line: "ProSeries Gas", symptom: "No ignition, igniter clicks but pilot never lights", cause: "Gas control valve solenoid failure or fouled pilot orifice", fix: "Clean pilot orifice with compressed air; if no improvement replace gas control valve", models: "PS40-GAS, PS50-GAS, PS75-GAS", defect: null },
    { id: "bul_3", num: "HC-TB-1103", mfg: "mfg_heatcore", line: "ProSeries Gas", symptom: "Yellow or orange burner flame instead of steady blue", cause: "Incomplete combustion from dust/lint obstruction at burner or low combustion air", fix: "Clean burner assembly and combustion air intake; inspect venting for blockage. Treat as safety-critical (CO risk) until verified clear", models: "All ProSeries Gas", defect: "dc_9" },
    { id: "bul_4", num: "HC-TB-1156", mfg: "mfg_heatcore", line: "ProSeries Gas", symptom: "Reduced hot water output, popping/rumbling noises", cause: "Sediment buildup on tank floor insulating the burner from water", fix: "Full tank flush; if unit is 8+ years recommend replacement due to accelerated tank wear", models: "PS40-GAS, PS50-GAS", defect: "dc_5" },
    { id: "bul_5", num: "HC-TB-1201", mfg: "mfg_heatcore", line: "EcoVolt Electric", symptom: "No hot water, both elements appear intact", cause: "Upper thermostat high-limit (ECO) trip from dry-fire event or thermostat failure", fix: "Reset high-limit switch; if repeat trip, replace upper thermostat assembly", models: "EV50-ELEC, EV80-ELEC", defect: null },
    { id: "bul_6", num: "HC-TB-1240", mfg: "mfg_heatcore", line: "EcoVolt Electric", symptom: "Lukewarm water only, recovery time excessive", cause: "Lower heating element failure while upper element still functional", fix: "Test element resistance with multimeter; replace lower element and gasket", models: "EV50-ELEC, EV80-ELEC", defect: null },
    { id: "bul_7", num: "AF-TB-220", mfg: "mfg_aquaflow", line: "QuietFill Toilet Systems", symptom: "Toilet runs intermittently or continuously after fill", cause: "Fill valve diaphragm degradation causing slow seep past seal", fix: "Replace fill valve cartridge; flush supply line of sediment prior to install", models: "QF-200, QF-300", defect: null },
    { id: "bul_8", num: "AF-TB-235", mfg: "mfg_aquaflow", line: "QuietFill Toilet Systems", symptom: "Running water sound, flapper appears to close fully", cause: "Flapper chain too short/long causing incomplete reseat, or mineral buildup on flush valve seat", fix: "Adjust chain length to 1/2\" slack; clean flush valve seat with vinegar soak if scaled", models: "QF-200, QF-300, QF-Comfort", defect: "dc_8" },
    { id: "bul_9", num: "AF-TB-260", mfg: "mfg_aquaflow", line: "QuietFill Toilet Systems", symptom: "Phantom flush — tank refills periodically with no use", cause: "Flapper seal hardened/warped, allowing slow tank-to-bowl leak", fix: "Replace flapper with OEM silicone variant; avoid in-tank bowl cleaners which accelerate degradation", models: "All QuietFill", defect: null },
    { id: "bul_10", num: "VT-TB-310", mfg: "mfg_vantage", line: "DrainPro Series", symptom: "Slow drain across multiple fixtures on same branch line", cause: "Grease/soap buildup forming partial obstruction in branch drain", fix: "Mechanical auger or hydro-jet branch line; recommend enzymatic maintenance treatment", models: "Universal branch drain", defect: "dc_5" },
    { id: "bul_11", num: "VT-TB-322", mfg: "mfg_vantage", line: "DrainPro Series", symptom: "Single fixture drain backup, gurgling from other fixtures", cause: "Localized obstruction near fixture trap or vent blockage causing siphon", fix: "Clear trap obstruction; inspect vent stack for blockage (nests, debris)", models: "Universal", defect: null },
    { id: "bul_12", num: "VT-TB-340", mfg: "mfg_vantage", line: "DrainPro Series", symptom: "Recurring clog at same cleanout, roots visible on camera", cause: "Root intrusion at pipe joint, likely cracked or separated joint allowing moisture egress", fix: "Hydro-jet with root cutting head; recommend joint repair/liner if intrusion exceeds 25% diameter", models: "Universal", defect: "dc_7" },
    { id: "bul_13", num: "VT-TB-410", mfg: "mfg_vantage", line: "SumpGuard Series", symptom: "Sump pump fails to activate at high water level", cause: "Float switch mechanically stuck or tethered float tangled on discharge pipe", fix: "Free float arm, verify full range of motion vertically in basin; replace switch if binding persists", models: "SG-1/3HP, SG-1/2HP", defect: null },
    { id: "bul_14", num: "VT-TB-425", mfg: "mfg_vantage", line: "SumpGuard Series", symptom: "Pump runs continuously / short-cycles", cause: "Check valve failure allowing backflow into basin, or undersized basin causing rapid refill", fix: "Replace check valve on discharge line; verify basin sizing matches inflow rate", models: "SG-1/3HP, SG-1/2HP, SG-3/4HP", defect: null },
    { id: "bul_15", num: "VT-TB-440", mfg: "mfg_vantage", line: "SumpGuard Series", symptom: "Pump motor hums but does not pump water", cause: "Impeller jammed with debris or motor bearing seizure", fix: "Disassemble and clear impeller housing; if motor remains seized after clearing, replace pump unit", models: "All SumpGuard", defect: null },
    { id: "bul_16", num: "CL-TB-510", mfg: "mfg_coreline", line: "FlexSupply Lines", symptom: "Low water pressure at single fixture", cause: "Partially closed shutoff valve or kinked/collapsed flexible supply line", fix: "Verify valve full-open; replace supply line if internal braiding has collapsed", models: "FS-Braided, FS-PEX", defect: null },
    { id: "bul_17", num: "CL-TB-525", mfg: "mfg_coreline", line: "Whole-Home Pressure", symptom: "Low water pressure house-wide, gradually worsening over months", cause: "Galvanized pipe interior scaling reducing effective diameter, or PRV (pressure reducing valve) drift", fix: "Test static vs. dynamic pressure at hose bib; service or replace PRV; recommend repipe assessment if galvanized", models: "Universal", defect: "dc_8" },
    { id: "bul_18", num: "CL-TB-540", mfg: "mfg_coreline", line: "Whole-Home Pressure", symptom: "High water pressure causing fixture hammer/noise", cause: "PRV failure allowing full street pressure to pass, or missing PRV on recently modified system", fix: "Install or replace PRV, set to 55-65 PSI; install water hammer arrestors at washing machine/dishwasher", models: "Universal", defect: null },
    { id: "bul_19", num: "HC-TB-1290", mfg: "mfg_heatcore", line: "ProSeries Gas", symptom: "Unit displays intermittent flashing status light, no error documented by homeowner", cause: "Flame sensor signal interruption or exhaust blockage triggering safety lockout", fix: "Inspect flame sensor for soot buildup, clean with fine abrasive pad; verify vent termination clear of obstruction", models: "PS50-GAS, PS75-GAS", defect: null },
    { id: "bul_20", num: "AF-TB-280", mfg: "mfg_aquaflow", line: "QuietFill Toilet Systems", symptom: "Weak flush, incomplete bowl clearing", cause: "Mineral scale partially blocking rim jets and siphon channel", fix: "Descale rim jets with wire pick and vinegar solution; check for adequate tank water level", models: "QF-200, QF-300", defect: "dc_8" },
  ];
  for (const b of bulletins) await run(`INSERT INTO technical_bulletins (id,bulletin_number,manufacturer_id,product_line,symptom,root_cause,recommended_fix,applicable_models,defect_code_id) VALUES (?,?,?,?,?,?,?,?,?)`, [b.id, b.num, b.mfg, b.line, b.symptom, b.cause, b.fix, b.models, b.defect ?? null]);

  // Vision defect categories
  const visionCategories = [
    ["Corrosion", "Visible metal oxidation on fittings, tanks, or valve bodies"],
    ["Scaling / Mineral Deposits", "White/chalky mineral buildup from hard water"],
    ["Cracking", "Visible fracture lines in pipe, tank, or fixture material"],
    ["Leak Staining", "Discoloration indicating historical or active moisture leak"],
    ["Root Intrusion", "Root mass visible within pipe or at joint"],
    ["Biofilm / Slime Buildup", "Organic film coating interior surfaces"],
    ["Sediment Buildup", "Granular debris accumulation at tank floor or pipe invert"],
    ["Pitting", "Localized small-diameter corrosion pockets"],
    ["Gasket / Seal Degradation", "Visible cracking or hardening of rubber seal components"],
    ["Rust Streaking", "Linear rust trails from a fastener or joint"],
    ["Thermal Discoloration", "Scorching or heat-bloom discoloration near burner/element"],
    ["Hairline Fracture", "Fine surface crack not yet through-wall"],
    ["Weld Seam Failure", "Separation or corrosion along a manufactured weld seam"],
    ["Insulation Breakdown", "Degraded or missing pipe/tank insulation"],
    ["Connector Corrosion", "Oxidation specific to electrical or compression connectors"],
    ["Sensor Fouling", "Soot or debris coating a flame or pressure sensor"],
    ["Debris Obstruction", "Foreign material physically blocking flow path"],
    ["Surface Pitting", "Shallow, widespread surface degradation"],
    ["Valve Seat Wear", "Visible wear pattern on a valve sealing surface"],
    ["Active Drip", "Visible water droplet formation indicating live leak"],
  ];
  for (let idx = 0; idx < visionCategories.length; idx++) {
    const [name, desc] = visionCategories[idx];
    await run(`INSERT INTO vision_defect_categories (id,name,description) VALUES (?,?,?)`, [`vdc_${idx + 1}`, name, desc]);
  }

  // Parts catalog
  const partsCatalog = [
    { num: "TC-UNIV-18", name: "Universal Thermocouple, 18in", category: "Water Heater", cost: 12.5, threshold: 3 },
    { num: "GCV-STD-40", name: "Gas Control Valve, Standard 40-Gal", category: "Water Heater", cost: 84.0, threshold: 1 },
    { num: "FS-STD-01", name: "Flame Sensor, Standard", category: "Water Heater", cost: 18.75, threshold: 2 },
    { num: "FLUSH-KIT", name: "Tank Flush Kit", category: "Water Heater", cost: 9.0, threshold: 4 },
    { num: "DIP-TUBE-STD", name: "Dip Tube, Standard", category: "Water Heater", cost: 14.0, threshold: 2 },
    { num: "IGN-MOD-01", name: "Ignition Control Module", category: "Water Heater", cost: 96.0, threshold: 1 },
    { num: "BURNER-CLEAN-KIT", name: "Burner Cleaning Kit", category: "Water Heater", cost: 22.0, threshold: 2 },
    { num: "WH-REPLACE-40", name: "Replacement 40-Gal Gas Water Heater", category: "Water Heater", cost: 640.0, threshold: 0 },
    { num: "FLAP-UNIV-3IN", name: "Universal Flapper, 3in", category: "Toilet", cost: 7.25, threshold: 5 },
    { num: "FILLVALVE-UNIV", name: "Universal Fill Valve", category: "Toilet", cost: 11.5, threshold: 4 },
    { num: "DESCALE-KIT", name: "Toilet Descaling Kit", category: "Toilet", cost: 8.0, threshold: 3 },
    { num: "WAX-RING-STD", name: "Wax Ring, Standard", category: "Toilet", cost: 4.5, threshold: 6 },
    { num: "WAX-RING-EXT", name: "Wax Ring, Extended Flange", category: "Toilet", cost: 6.0, threshold: 4 },
    { num: "TRAP-CLEAN-KIT", name: "Trap Cleaning Kit", category: "Drain", cost: 10.0, threshold: 2 },
    { num: "P-TRAP-PVC-1.5", name: "P-Trap, PVC 1.5in", category: "Drain", cost: 6.75, threshold: 5 },
    { num: "P-TRAP-PVC-2", name: "P-Trap, PVC 2in", category: "Drain", cost: 7.5, threshold: 4 },
    { num: "ENZYME-TREAT", name: "Enzymatic Drain Treatment", category: "Drain", cost: 13.0, threshold: 4 },
    { num: "ROOT-CUT-HEAD", name: "Hydro-Jet Root Cutting Head (service)", category: "Drain", cost: 0, threshold: 1 },
    { num: "SUPPLY-LINE-BRD-12", name: "Braided Supply Line, 12in", category: "Supply", cost: 5.5, threshold: 6 },
    { num: "SUPPLY-LINE-BRD-20", name: "Braided Supply Line, 20in", category: "Supply", cost: 6.5, threshold: 6 },
    { num: "PRV-STD-75", name: "Pressure Reducing Valve, Standard", category: "Supply", cost: 58.0, threshold: 1 },
    { num: "FLOAT-SW-UNIV", name: "Universal Float Switch", category: "Sump", cost: 24.0, threshold: 2 },
    { num: "CHECK-VALVE-1.5", name: "Check Valve, 1.5in", category: "Sump", cost: 16.0, threshold: 3 },
    { num: "SUMP-PUMP-13HP", name: "Sump Pump, 1/3 HP", category: "Sump", cost: 110.0, threshold: 1 },
    { num: "SHUTOFF-VALVE-12", name: "Quarter-Turn Shutoff Valve, 1/2in", category: "Supply", cost: 9.5, threshold: 5 },
    { num: "PIPE-DOPE", name: "Pipe Joint Compound", category: "Consumable", cost: 6.0, threshold: 4 },
    { num: "TEFLON-TAPE", name: "PTFE Thread Tape", category: "Consumable", cost: 1.5, threshold: 10 },
    { num: "PEX-FITTING-ASST", name: "PEX Fitting Assortment Pack", category: "Supply", cost: 19.0, threshold: 2 },
    { num: "ANGLE-STOP-VALVE", name: "Angle Stop Valve", category: "Supply", cost: 8.5, threshold: 5 },
  ];
  for (const p of partsCatalog) await run(`INSERT INTO parts (id,part_number,name,category,unit_cost,default_threshold) VALUES (?,?,?,?,?,?)`, [`part_${p.num}`, p.num, p.name, p.category, p.cost, p.threshold]);

  // Vendors
  const vendors = [
    { id: "vendor_1", name: "Continental Supply Co.", contact: "Order Desk", email: "orders@continentalsupply.demo", lead: 2 },
    { id: "vendor_2", name: "Ferro Trade Distributors", contact: "Maya Lin", email: "maya.lin@ferrotrade.demo", lead: 4 },
    { id: "vendor_3", name: "Bluepoint Wholesale Plumbing", contact: "Order Desk", email: "orders@bluepointwholesale.demo", lead: 3 },
  ];
  for (const v of vendors) await run(`INSERT INTO vendors (id,name,contact_name,contact_email,lead_time_days) VALUES (?,?,?,?,?)`, [v.id, v.name, v.contact, v.email, v.lead]);
  for (const p of partsCatalog) {
    if (p.cost === 0) continue;
    for (const v of vendors) {
      const variance = 1 + (Math.floor(Math.random() * 21 - 8) / 100);
      await run(`INSERT INTO vendor_pricing (id,vendor_id,part_id,price) VALUES (?,?,?,?)`, [rid("vp"), v.id, `part_${p.num}`, Math.round(p.cost * variance * 100) / 100]);
    }
  }

  // Truck stock
  function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  for (const t of techs) {
    const truckId = `truck_${t.id.split("_")[1]}`;
    for (const p of partsCatalog) {
      if (p.threshold === 0) continue;
      const lowBias = (truckId === "truck_1" && ["TC-UNIV-18", "FLAP-UNIV-3IN"].includes(p.num)) || (truckId === "truck_2" && p.num === "TC-UNIV-18");
      const qty = lowBias ? rand(0, Math.max(0, p.threshold - 2)) : rand(Math.max(0, p.threshold - 1), p.threshold + 6);
      await run(`INSERT INTO truck_stock (id,truck_id,part_id,quantity,threshold) VALUES (?,?,?,?,?)`, [rid("stock"), truckId, `part_${p.num}`, qty, p.threshold]);
    }
  }

  // Diagnostic trees — insert trees inline
  type NodeDef = {
    type: "question" | "photo" | "result";
    prompt: string;
    options?: { value: string; label: string }[];
    result?: any;
    bulletinId?: string;
    children?: { optionValue: string; node: NodeDef }[];
  };

  let nodeOrder = 0;
  async function insertNode(treeId: string, node: NodeDef, parentId: string | null, parentOptionValue: string | null) {
    const nodeId = rid("node");
    nodeOrder += 1;
    await run(
      `INSERT INTO diagnostic_nodes (id,tree_id,parent_node_id,parent_option_value,node_type,prompt_text,options_json,result_json,bulletin_id,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [nodeId, treeId, parentId, parentOptionValue, node.type, node.prompt, node.options ? JSON.stringify(node.options) : null, node.result ? JSON.stringify(node.result) : null, node.bulletinId ?? null, nodeOrder]
    );
    for (const child of node.children ?? []) await insertNode(treeId, child.node, nodeId, child.optionValue);
  }

  async function insertTree(treeId: string, name: string, equipmentType: string, description: string, root: NodeDef) {
    await run(`INSERT INTO diagnostic_trees (id,name,equipment_type,description) VALUES (?,?,?,?)`, [treeId, name, equipmentType, description]);
    await insertNode(treeId, root, null, null);
  }

  await insertTree("tree_gwh", "Gas Water Heater — No Hot Water", "Gas Water Heater", "Branching diagnostic for gas water heater hot water complaints.", {
    type: "question", prompt: "What's the customer reporting?",
    options: [{ value: "no_hot_water", label: "No hot water at all" }, { value: "lukewarm", label: "Lukewarm / reduced hot water" }, { value: "leaking", label: "Visible water leak at unit" }],
    children: [
      { optionValue: "no_hot_water", node: { type: "question", prompt: "Is the pilot light lit?", options: [{ value: "lit", label: "Pilot is lit" }, { value: "not_lit", label: "Pilot is out" }, { value: "no_pilot", label: "No visible pilot (electronic ignition)" }], children: [
        { optionValue: "not_lit", node: { type: "question", prompt: "Attempt to relight per unit instructions. What happens?", options: [{ value: "relights_then_dies", label: "Lights, then dies within ~30-60 sec" }, { value: "wont_light", label: "Won't light at all" }, { value: "relights_holds", label: "Lights and holds" }], children: [
          { optionValue: "relights_then_dies", node: { type: "result", prompt: "", bulletinId: "bul_1", result: { primaryDiagnosis: "Thermocouple failure", confidence: 88, secondaryDiagnoses: [{ name: "Loose thermocouple connection at gas valve", confidence: 9 }, { name: "Gas control valve failure", confidence: 3 }], parts: [{ partNumber: "TC-UNIV-18", name: "Universal Thermocouple, 18in", qty: 1 }], estRepairTimeMinutes: 30, safetyCritical: false, bulletinId: "bul_1" } } },
          { optionValue: "wont_light", node: { type: "question", prompt: "Confirm gas supply: is the shutoff valve open and do other gas appliances work?", options: [{ value: "gas_present", label: "Gas present, other appliances work" }, { value: "no_gas", label: "No gas / other appliances also affected" }], children: [
            { optionValue: "no_gas", node: { type: "result", prompt: "", result: { primaryDiagnosis: "Gas supply interruption (not unit fault)", confidence: 81, secondaryDiagnoses: [{ name: "Meter shutoff or utility-side issue", confidence: 15 }], parts: [], estRepairTimeMinutes: 15, safetyCritical: true } } },
            { optionValue: "gas_present", node: { type: "photo", prompt: "Take a photo of the pilot assembly and gas valve.", bulletinId: "bul_2", children: [{ optionValue: "_continue", node: { type: "result", prompt: "", bulletinId: "bul_2", result: { primaryDiagnosis: "Pilot orifice fouled / gas control valve fault", confidence: 61, secondaryDiagnoses: [{ name: "Thermocouple failure", confidence: 22 }, { name: "Gas control valve solenoid failure", confidence: 14 }], parts: [{ partNumber: "GCV-STD-40", name: "Gas Control Valve, Standard 40-Gal", qty: 1 }, { partNumber: "TC-UNIV-18", name: "Universal Thermocouple, 18in", qty: 1 }], estRepairTimeMinutes: 75, safetyCritical: true, bulletinId: "bul_2" } } }] } },
          ] } },
          { optionValue: "relights_holds", node: { type: "question", prompt: "Is there a status/error light flashing on the unit?", options: [{ value: "flashing", label: "Yes, flashing" }, { value: "none", label: "No indicator / not applicable" }], children: [
            { optionValue: "flashing", node: { type: "result", prompt: "", bulletinId: "bul_19", result: { primaryDiagnosis: "Flame sensor fouling / exhaust restriction triggering lockout", confidence: 70, secondaryDiagnoses: [{ name: "Vent termination blockage", confidence: 18 }], parts: [{ partNumber: "FS-STD-01", name: "Flame Sensor, Standard", qty: 1 }], estRepairTimeMinutes: 45, safetyCritical: true, bulletinId: "bul_19" } } },
            { optionValue: "none", node: { type: "question", prompt: "Approximate age of the unit?", options: [{ value: "under_6", label: "Under 6 years" }, { value: "over_10", label: "10+ years" }], children: [
              { optionValue: "over_10", node: { type: "result", prompt: "", bulletinId: "bul_4", result: { primaryDiagnosis: "Sediment buildup insulating burner, accelerated by tank age", confidence: 67, secondaryDiagnoses: [{ name: "Gas control valve wear", confidence: 17 }, { name: "Tank end-of-life, recommend replacement", confidence: 16 }], parts: [{ partNumber: "FLUSH-KIT", name: "Tank Flush Kit", qty: 1 }], estRepairTimeMinutes: 60, safetyCritical: false, bulletinId: "bul_4" } } },
              { optionValue: "under_6", node: { type: "result", prompt: "", result: { primaryDiagnosis: "Gas control valve calibration fault", confidence: 58, secondaryDiagnoses: [{ name: "Thermostat sensor drift", confidence: 24 }, { name: "Mixed gas/air ratio issue", confidence: 12 }], parts: [{ partNumber: "GCV-STD-40", name: "Gas Control Valve, Standard 40-Gal", qty: 1 }], estRepairTimeMinutes: 75, safetyCritical: false } } },
            ] } },
          ] } },
        ] } },
        { optionValue: "lit", node: { type: "question", prompt: "What color is the burner flame?", options: [{ value: "blue_steady", label: "Steady blue" }, { value: "yellow_orange", label: "Yellow or orange" }], children: [
          { optionValue: "yellow_orange", node: { type: "result", prompt: "", bulletinId: "bul_3", result: { primaryDiagnosis: "Incomplete combustion — burner/venting obstruction (CO risk)", confidence: 74, secondaryDiagnoses: [{ name: "Low combustion air supply", confidence: 20 }], parts: [{ partNumber: "BURNER-CLEAN-KIT", name: "Burner Cleaning Kit", qty: 1 }], estRepairTimeMinutes: 50, safetyCritical: true, bulletinId: "bul_3" } } },
          { optionValue: "blue_steady", node: { type: "photo", prompt: "Take a photo of the tank exterior and any noise/discoloration noted by customer.", children: [{ optionValue: "_continue", node: { type: "result", prompt: "", bulletinId: "bul_4", result: { primaryDiagnosis: "Sediment buildup reducing heat transfer", confidence: 63, secondaryDiagnoses: [{ name: "Dip tube failure (cold water short-cycling)", confidence: 21 }, { name: "Lower heating-zone obstruction", confidence: 9 }], parts: [{ partNumber: "FLUSH-KIT", name: "Tank Flush Kit", qty: 1 }, { partNumber: "DIP-TUBE-STD", name: "Dip Tube, Standard", qty: 1 }], estRepairTimeMinutes: 60, safetyCritical: false, bulletinId: "bul_4" } } }] } },
        ] } },
        { optionValue: "no_pilot", node: { type: "question", prompt: "Does the electronic igniter click when calling for heat?", options: [{ value: "clicks_no_ignite", label: "Clicks, but doesn't ignite" }, { value: "no_click", label: "No click at all" }], children: [
          { optionValue: "no_click", node: { type: "result", prompt: "", result: { primaryDiagnosis: "Ignition control module failure", confidence: 55, secondaryDiagnoses: [{ name: "Loose wiring at control module", confidence: 26 }, { name: "Power supply / battery (if applicable)", confidence: 13 }], parts: [{ partNumber: "IGN-MOD-01", name: "Ignition Control Module", qty: 1 }], estRepairTimeMinutes: 90, safetyCritical: true } } },
          { optionValue: "clicks_no_ignite", node: { type: "result", prompt: "", result: { primaryDiagnosis: "Igniter fouled or gas valve solenoid not opening", confidence: 60, secondaryDiagnoses: [{ name: "Flame sensor fault", confidence: 22 }, { name: "Igniter electrode wear", confidence: 14 }], parts: [{ partNumber: "GCV-STD-40", name: "Gas Control Valve, Standard 40-Gal", qty: 1 }], estRepairTimeMinutes: 80, safetyCritical: true } } },
        ] } },
      ] } },
      { optionValue: "lukewarm", node: { type: "result", prompt: "", bulletinId: "bul_4", result: { primaryDiagnosis: "Undersized burner output relative to demand, or partial sediment insulation", confidence: 52, secondaryDiagnoses: [{ name: "Mixed valve / tempering valve set too low", confidence: 28 }, { name: "Cross-connection with cold line", confidence: 12 }], parts: [{ partNumber: "FLUSH-KIT", name: "Tank Flush Kit", qty: 1 }], estRepairTimeMinutes: 60, safetyCritical: false, bulletinId: "bul_4" } } },
      { optionValue: "leaking", node: { type: "photo", prompt: "Photograph the leak location (top fittings, T&P valve, or tank base).", children: [{ optionValue: "_continue", node: { type: "result", prompt: "", result: { primaryDiagnosis: "Tank wall corrosion/perforation — replacement required", confidence: 91, secondaryDiagnoses: [{ name: "T&P valve discharge (not tank failure)", confidence: 6 }], parts: [{ partNumber: "WH-REPLACE-40", name: "Replacement 40-Gal Gas Water Heater", qty: 1 }], estRepairTimeMinutes: 180, safetyCritical: true } } }] } },
    ],
  });

  await insertTree("tree_toilet", "Toilet Running", "Toilet", "Branching diagnostic for running or phantom-flushing toilets.", {
    type: "question", prompt: "What's the toilet doing?",
    options: [{ value: "continuous", label: "Runs continuously" }, { value: "intermittent", label: "Runs intermittently / phantom flush" }, { value: "weak_flush", label: "Weak or incomplete flush" }],
    children: [
      { optionValue: "continuous", node: { type: "question", prompt: "Lift the tank lid. Does the flapper close fully after flush?", options: [{ value: "closes_fully", label: "Yes, closes fully" }, { value: "not_fully", label: "No, stays slightly open" }], children: [
        { optionValue: "not_fully", node: { type: "result", prompt: "", bulletinId: "bul_8", result: { primaryDiagnosis: "Flapper chain misadjusted or seat scaled, preventing full reseat", confidence: 80, secondaryDiagnoses: [{ name: "Warped flapper requiring replacement", confidence: 14 }], parts: [{ partNumber: "FLAP-UNIV-3IN", name: "Universal Flapper, 3in", qty: 1 }], estRepairTimeMinutes: 20, safetyCritical: false, bulletinId: "bul_8" } } },
        { optionValue: "closes_fully", node: { type: "result", prompt: "", bulletinId: "bul_7", result: { primaryDiagnosis: "Fill valve diaphragm seeping past seal", confidence: 73, secondaryDiagnoses: [{ name: "Overflow tube set too low", confidence: 18 }], parts: [{ partNumber: "FILLVALVE-UNIV", name: "Universal Fill Valve", qty: 1 }], estRepairTimeMinutes: 25, safetyCritical: false, bulletinId: "bul_7" } } },
      ] } },
      { optionValue: "intermittent", node: { type: "result", prompt: "", bulletinId: "bul_9", result: { primaryDiagnosis: "Phantom flush — flapper seal hardened, slow tank-to-bowl leak", confidence: 69, secondaryDiagnoses: [{ name: "Fill valve micro-leak", confidence: 24 }], parts: [{ partNumber: "FLAP-UNIV-3IN", name: "Universal Flapper, 3in", qty: 1 }], estRepairTimeMinutes: 20, safetyCritical: false, bulletinId: "bul_9" } } },
      { optionValue: "weak_flush", node: { type: "result", prompt: "", bulletinId: "bul_20", result: { primaryDiagnosis: "Mineral scale blocking rim jets/siphon channel", confidence: 64, secondaryDiagnoses: [{ name: "Low tank water level due to fill valve misadjustment", confidence: 22 }], parts: [{ partNumber: "DESCALE-KIT", name: "Toilet Descaling Kit", qty: 1 }], estRepairTimeMinutes: 30, safetyCritical: false, bulletinId: "bul_20" } } },
    ],
  });

  await insertTree("tree_drain", "Drain Clog", "Drain Line", "Branching diagnostic for single-fixture through whole-house drain obstructions.", {
    type: "question", prompt: "How many fixtures are affected?",
    options: [{ value: "single", label: "Single fixture" }, { value: "multiple", label: "Multiple fixtures on same line" }, { value: "whole_house", label: "Whole house / main line" }],
    children: [
      { optionValue: "single", node: { type: "question", prompt: "Do other fixtures gurgle when this one drains?", options: [{ value: "yes_gurgle", label: "Yes" }, { value: "no_gurgle", label: "No" }], children: [
        { optionValue: "yes_gurgle", node: { type: "result", prompt: "", bulletinId: "bul_11", result: { primaryDiagnosis: "Localized trap obstruction with vent restriction causing siphon", confidence: 66, secondaryDiagnoses: [{ name: "Vent stack blockage (debris/nesting)", confidence: 26 }], parts: [{ partNumber: "TRAP-CLEAN-KIT", name: "Trap Cleaning Kit", qty: 1 }], estRepairTimeMinutes: 45, safetyCritical: false, bulletinId: "bul_11" } } },
        { optionValue: "no_gurgle", node: { type: "result", prompt: "", result: { primaryDiagnosis: "Local trap/branch clog, hair or debris buildup", confidence: 79, secondaryDiagnoses: [{ name: "P-trap corrosion restricting flow", confidence: 12 }], parts: [{ partNumber: "P-TRAP-PVC-1.5", name: "P-Trap, PVC 1.5in", qty: 1 }], estRepairTimeMinutes: 30, safetyCritical: false } } },
      ] } },
      { optionValue: "multiple", node: { type: "result", prompt: "", bulletinId: "bul_10", result: { primaryDiagnosis: "Grease/soap buildup forming partial obstruction in shared branch line", confidence: 71, secondaryDiagnoses: [{ name: "Root intrusion at branch joint", confidence: 19 }], parts: [{ partNumber: "ENZYME-TREAT", name: "Enzymatic Drain Treatment", qty: 2 }], estRepairTimeMinutes: 60, safetyCritical: false, bulletinId: "bul_10" } } },
      { optionValue: "whole_house", node: { type: "question", prompt: "Has this happened before at the same cleanout?", options: [{ value: "recurring", label: "Yes, recurring at same spot" }, { value: "first_time", label: "First occurrence" }], children: [
        { optionValue: "recurring", node: { type: "photo", prompt: "Camera the line at the cleanout if equipped, and photograph findings.", bulletinId: "bul_12", children: [{ optionValue: "_continue", node: { type: "result", prompt: "", bulletinId: "bul_12", result: { primaryDiagnosis: "Root intrusion at a cracked or separated pipe joint", confidence: 84, secondaryDiagnoses: [{ name: "Pipe bellying causing standing water and debris collection", confidence: 11 }], parts: [{ partNumber: "ROOT-CUT-HEAD", name: "Hydro-Jet Root Cutting Head (service)", qty: 1 }], estRepairTimeMinutes: 120, safetyCritical: false, bulletinId: "bul_12" } } }] } },
        { optionValue: "first_time", node: { type: "result", prompt: "", result: { primaryDiagnosis: "Main line obstruction — debris or foreign object", confidence: 58, secondaryDiagnoses: [{ name: "Root intrusion (undetected, first occurrence)", confidence: 27 }, { name: "Pipe collapse/bellying", confidence: 10 }], parts: [], estRepairTimeMinutes: 90, safetyCritical: false } } },
      ] } },
    ],
  });

  await insertTree("tree_pressure", "Water Pressure Issues", "Water Supply System", "Branching diagnostic for low or high water pressure complaints.", {
    type: "question", prompt: "Where is the pressure issue occurring?",
    options: [{ value: "single_fixture", label: "Single fixture only" }, { value: "whole_house", label: "Whole house" }],
    children: [
      { optionValue: "single_fixture", node: { type: "result", prompt: "", bulletinId: "bul_16", result: { primaryDiagnosis: "Partially closed shutoff or collapsed flexible supply line at fixture", confidence: 76, secondaryDiagnoses: [{ name: "Clogged aerator/cartridge", confidence: 18 }], parts: [{ partNumber: "SUPPLY-LINE-BRD-20", name: "Braided Supply Line, 20in", qty: 1 }], estRepairTimeMinutes: 20, safetyCritical: false, bulletinId: "bul_16" } } },
      { optionValue: "whole_house", node: { type: "question", prompt: "Is the low pressure a recent sudden change, or gradual over months?", options: [{ value: "sudden", label: "Sudden change" }, { value: "gradual", label: "Gradual decline" }], children: [
        { optionValue: "sudden", node: { type: "result", prompt: "", bulletinId: "bul_18", result: { primaryDiagnosis: "PRV (pressure reducing valve) failure", confidence: 70, secondaryDiagnoses: [{ name: "Main shutoff partially closed", confidence: 20 }], parts: [{ partNumber: "PRV-STD-75", name: "Pressure Reducing Valve, Standard", qty: 1 }], estRepairTimeMinutes: 90, safetyCritical: false, bulletinId: "bul_18" } } },
        { optionValue: "gradual", node: { type: "result", prompt: "", bulletinId: "bul_17", result: { primaryDiagnosis: "Interior pipe scaling reducing effective diameter (galvanized) or PRV drift", confidence: 62, secondaryDiagnoses: [{ name: "Failing PRV", confidence: 25 }, { name: "Water softener/filter media restriction", confidence: 10 }], parts: [{ partNumber: "PRV-STD-75", name: "Pressure Reducing Valve, Standard", qty: 1 }], estRepairTimeMinutes: 90, safetyCritical: false, bulletinId: "bul_17" } } },
      ] } },
    ],
  });

  await insertTree("tree_sump", "Sump Pump Failure", "Sump Pump", "Branching diagnostic for sump pump activation and performance failures.", {
    type: "question", prompt: "What's the sump pump doing?",
    options: [{ value: "not_activating", label: "Not activating at high water" }, { value: "short_cycling", label: "Runs continuously / short-cycles" }, { value: "humming_no_pump", label: "Motor hums, no water moved" }],
    children: [
      { optionValue: "not_activating", node: { type: "question", prompt: "Manually lift the float — does the pump kick on?", options: [{ value: "kicks_on", label: "Yes, pump runs fine" }, { value: "no_response", label: "No response" }], children: [
        { optionValue: "kicks_on", node: { type: "result", prompt: "", bulletinId: "bul_13", result: { primaryDiagnosis: "Float switch mechanically stuck or tangled on discharge pipe", confidence: 85, secondaryDiagnoses: [{ name: "Basin too narrow for float range of motion", confidence: 10 }], parts: [{ partNumber: "FLOAT-SW-UNIV", name: "Universal Float Switch", qty: 1 }], estRepairTimeMinutes: 30, safetyCritical: false, bulletinId: "bul_13" } } },
        { optionValue: "no_response", node: { type: "result", prompt: "", result: { primaryDiagnosis: "Pump motor or electrical supply failure (check breaker/outlet first)", confidence: 56, secondaryDiagnoses: [{ name: "Tripped GFCI outlet", confidence: 30 }, { name: "Motor winding failure", confidence: 14 }], parts: [{ partNumber: "SUMP-PUMP-13HP", name: "Sump Pump, 1/3 HP", qty: 1 }], estRepairTimeMinutes: 60, safetyCritical: true } } },
      ] } },
      { optionValue: "short_cycling", node: { type: "result", prompt: "", bulletinId: "bul_14", result: { primaryDiagnosis: "Check valve failure allowing backflow into basin", confidence: 72, secondaryDiagnoses: [{ name: "Undersized basin for inflow rate", confidence: 19 }], parts: [{ partNumber: "CHECK-VALVE-1.5", name: "Check Valve, 1.5in", qty: 1 }], estRepairTimeMinutes: 40, safetyCritical: false, bulletinId: "bul_14" } } },
      { optionValue: "humming_no_pump", node: { type: "photo", prompt: "Photograph the impeller housing/basin after removing the pump if accessible.", bulletinId: "bul_15", children: [{ optionValue: "_continue", node: { type: "result", prompt: "", bulletinId: "bul_15", result: { primaryDiagnosis: "Impeller jammed with debris, or motor bearing seizure", confidence: 68, secondaryDiagnoses: [{ name: "Capacitor failure (if applicable)", confidence: 20 }], parts: [{ partNumber: "SUMP-PUMP-13HP", name: "Sump Pump, 1/3 HP", qty: 1 }], estRepairTimeMinutes: 50, safetyCritical: false, bulletinId: "bul_15" } } }] } },
    ],
  });

  // Customers & equipment
  const firstNames = ["James","Maria","Robert","Linda","Michael","Patricia","David","Susan","Richard","Jessica","Charles","Karen","Thomas","Nancy","Daniel","Lisa","Paul","Betty","Mark","Sandra","George","Ashley","Kenneth","Donna","Steven","Carol","Edward","Ruth","Brian","Sharon"];
  const lastNames = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker"];
  const streets = ["Maple St","Oak Ave","Cedar Ln","Birch Rd","Elm Ct","Sycamore Dr","Willow Way","Pinecrest Ave","Hillcrest Rd","Meadowbrook Ln","Riverside Dr","Sunset Blvd","Highland Ave","Magnolia St","Chestnut Ct"];
  const equipmentTypes = [
    { type: "Gas Water Heater", make: "Heatcore", models: ["PS40-GAS", "PS50-GAS", "PS75-GAS"] },
    { type: "Toilet", make: "Aquaflow", models: ["QF-200", "QF-300", "QF-Comfort"] },
    { type: "Drain Line", make: "Vantage Plumbing Systems", models: ["Universal"] },
    { type: "Water Supply System", make: "Coreline", models: ["Universal"] },
    { type: "Sump Pump", make: "Vantage Plumbing Systems", models: ["SG-1/3HP", "SG-1/2HP", "SG-3/4HP"] },
  ];

  const customerIds: string[] = [];
  for (let c = 0; c < 60; c++) {
    const cid = rid("cust");
    customerIds.push(cid);
    const name = `${firstNames[rand(0, firstNames.length - 1)]} ${lastNames[rand(0, lastNames.length - 1)]}`;
    const addr = `${rand(100, 9999)} ${streets[rand(0, streets.length - 1)]}, Springvale, OH`;
    await run(`INSERT INTO customers (id,name,address,phone) VALUES (?,?,?,?)`, [cid, name, addr, `(614) ${rand(200, 999)}-${rand(1000, 9999)}`]);
    const et = equipmentTypes[rand(0, equipmentTypes.length - 1)];
    await run(`INSERT INTO equipment (id,customer_id,type,make,model,install_year) VALUES (?,?,?,?,?,?)`, [rid("equip"), cid, et.type, et.make, et.models[rand(0, et.models.length - 1)], 2026 - rand(1, 18)]);
  }

  // A handful of today's jobs for the tech queue
  const today = new Date("2026-07-14T08:00:00Z");
  const treeJobTypes: Record<string, string> = { tree_gwh: "Gas Water Heater Service", tree_toilet: "Toilet Repair", tree_drain: "Drain Clearing", tree_pressure: "Water Pressure Diagnostic", tree_sump: "Sump Pump Service" };
  const treeIds = Object.keys(treeJobTypes);
  for (let j = 0; j < 8; j++) {
    const cid = customerIds[rand(0, customerIds.length - 1)];
    const tech = techs[j % techs.length];
    const treeId = treeIds[rand(0, treeIds.length - 1)];
    const scheduledAt = new Date(today.getTime() + rand(0, 8) * 3600_000);
    await run(`INSERT INTO jobs (id,customer_id,tech_id,job_type,scheduled_at,status,created_at) VALUES (?,?,?,?,?,?,?)`, [rid("job"), cid, tech.id, treeJobTypes[treeId], scheduledAt.toISOString(), "scheduled", today.toISOString()]);
  }

  return NextResponse.json({ ok: true, message: "Database seeded successfully. Delete app/api/seed/ before going to production." });
}
