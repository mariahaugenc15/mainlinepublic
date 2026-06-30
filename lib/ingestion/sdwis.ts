import { ensureSchema } from "@/lib/db";
import { rid } from "@/lib/ids";
import fs from "node:fs";
import path from "node:path";

const db = () => ensureSchema();

const EFSERVICE_BASE = "https://data.epa.gov/efservice";
const EFSERVICE_ROW_CAP = 10000;
const EFSERVICE_PAGE_SIZE = 5000;

export type RegionalRecord = {
  pwsid: string;
  pwsName: string;
  pwsType: string | null;
  city: string | null;
  county: string | null;
  state: string;
  zipCode: string | null;
  violationCountTotal: number;
  violationCountMcl: number;
  violationCountMrdl: number;
  violationCountTt: number;
  violationCountMonitoring: number;
  violationCountResolved: number;
  violationCountUnresolved: number;
  mostRecentViolationDate: string | null;
};

type RawWaterSystem = {
  PWSID: string;
  PWS_NAME: string;
  PWS_TYPE_CODE?: string;
  PWS_TYPE_SHORT?: string;
  CITY_NAME?: string;
  COUNTY_SERVED?: string;
  STATE_CODE: string;
  ZIP_CODE?: string;
};

type RawViolation = {
  PWSID: string;
  VIOLATION_CATEGORY_CODE?: string;
  VIOLATION_STATUS?: string;
  NON_COMPL_PER_BEGIN_DATE?: string;
  VIOL_MEASURE?: string;
};

// ---------- Live EPA Envirofacts API ----------

async function fetchEfservice<T>(segments: string): Promise<T[]> {
  const url = `${EFSERVICE_BASE}/${segments}/JSON`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Envirofacts request failed (${res.status}): ${url}`);
  }
  const body = await res.text();
  if (!body.trim()) return [];
  return JSON.parse(body) as T[];
}

async function fetchWaterSystemsForState(state: string): Promise<RawWaterSystem[]> {
  const out: RawWaterSystem[] = [];
  let offset = 0;
  for (;;) {
    const last = Math.min(offset + EFSERVICE_PAGE_SIZE - 1, EFSERVICE_ROW_CAP - 1);
    const page = await fetchEfservice<RawWaterSystem>(
      `WATER_SYSTEM/STATE_CODE/equals/${state}/rows/${offset}:${last}`
    );
    out.push(...page);
    if (page.length < EFSERVICE_PAGE_SIZE || last >= EFSERVICE_ROW_CAP - 1) break;
    offset += EFSERVICE_PAGE_SIZE;
  }
  return out;
}

async function fetchViolationsForState(state: string): Promise<RawViolation[]> {
  const out: RawViolation[] = [];
  let offset = 0;
  for (;;) {
    const last = Math.min(offset + EFSERVICE_PAGE_SIZE - 1, EFSERVICE_ROW_CAP - 1);
    const page = await fetchEfservice<RawViolation>(
      `VIOLATION/PWS_ACTIVITY_CODE/equals/A/and/STATE_CODE/equals/${state}/rows/${offset}:${last}`
    );
    out.push(...page);
    if (page.length < EFSERVICE_PAGE_SIZE || last >= EFSERVICE_ROW_CAP - 1) break;
    offset += EFSERVICE_PAGE_SIZE;
  }
  return out;
}

function summarizeViolations(pwsid: string, violations: RawViolation[]) {
  const forSystem = violations.filter((v) => v.PWSID === pwsid);
  let mcl = 0, mrdl = 0, tt = 0, monitoring = 0, resolved = 0, unresolved = 0;
  let mostRecent: string | null = null;
  for (const v of forSystem) {
    const cat = (v.VIOLATION_CATEGORY_CODE || "").toUpperCase();
    if (cat === "MCL") mcl++;
    else if (cat === "MRDL") mrdl++;
    else if (cat === "TT") tt++;
    else if (cat === "MR" || cat === "RPT") monitoring++;
    const status = (v.VIOLATION_STATUS || "").toUpperCase();
    if (status === "RESOLVED" || status === "ARCHIVED" || status === "ADDRESSED") resolved++;
    else unresolved++;
    if (v.NON_COMPL_PER_BEGIN_DATE && (!mostRecent || v.NON_COMPL_PER_BEGIN_DATE > mostRecent)) {
      mostRecent = v.NON_COMPL_PER_BEGIN_DATE;
    }
  }
  return {
    violationCountTotal: forSystem.length,
    violationCountMcl: mcl,
    violationCountMrdl: mrdl,
    violationCountTt: tt,
    violationCountMonitoring: monitoring,
    violationCountResolved: resolved,
    violationCountUnresolved: unresolved,
    mostRecentViolationDate: mostRecent,
  };
}

/** Pulls live water-system + violation data for a state from EPA's public SDWIS/Envirofacts API. No API key required. */
export async function pullLiveStateData(state: string): Promise<RegionalRecord[]> {
  const [systems, violations] = await Promise.all([
    fetchWaterSystemsForState(state),
    fetchViolationsForState(state),
  ]);
  return systems.map((s) => ({
    pwsid: s.PWSID,
    pwsName: s.PWS_NAME,
    pwsType: s.PWS_TYPE_SHORT ?? s.PWS_TYPE_CODE ?? null,
    city: s.CITY_NAME ?? null,
    county: s.COUNTY_SERVED ?? null,
    state: s.STATE_CODE,
    zipCode: s.ZIP_CODE ?? null,
    ...summarizeViolations(s.PWSID, violations),
  }));
}

// ---------- Bulk CSV fallback (SDWA bulk download from EPA ECHO) ----------

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

/**
 * Reads a pair of locally-stored CSV exports matching EPA's SDWA bulk-download schema
 * (SDWA_PUB_WATER_SYSTEMS.csv and SDWA_VIOLATIONS_ENFORCEMENT.csv), joined on PWSID.
 * Used as an offline-safe alternative to the live API for demos/seeding.
 */
export function pullBulkCsvData(systemsCsvPath: string, violationsCsvPath: string): RegionalRecord[] {
  const systemsText = fs.readFileSync(systemsCsvPath, "utf-8");
  const violationsText = fs.readFileSync(violationsCsvPath, "utf-8");
  const systems = parseCsv(systemsText);
  const violations = parseCsv(violationsText);

  const violationsByPwsid = new Map<string, Record<string, string>[]>();
  for (const v of violations) {
    const key = v.PWSID;
    if (!violationsByPwsid.has(key)) violationsByPwsid.set(key, []);
    violationsByPwsid.get(key)!.push(v);
  }

  return systems.map((s) => {
    const forSystem = violationsByPwsid.get(s.PWSID) ?? [];
    let mcl = 0, mrdl = 0, tt = 0, monitoring = 0, resolved = 0, unresolved = 0;
    let mostRecent: string | null = null;
    for (const v of forSystem) {
      const cat = (v.VIOLATION_CATEGORY_CODE || "").toUpperCase();
      if (cat === "MCL") mcl++;
      else if (cat === "MRDL") mrdl++;
      else if (cat === "TT") tt++;
      else if (cat === "MR" || cat === "RPT") monitoring++;
      const status = (v.VIOLATION_STATUS || "").toUpperCase();
      if (status === "RESOLVED" || status === "ARCHIVED" || status === "ADDRESSED") resolved++;
      else unresolved++;
      if (v.NON_COMPL_PER_BEGIN_DATE && (!mostRecent || v.NON_COMPL_PER_BEGIN_DATE > mostRecent)) {
        mostRecent = v.NON_COMPL_PER_BEGIN_DATE;
      }
    }
    return {
      pwsid: s.PWSID,
      pwsName: s.PWS_NAME,
      pwsType: s.PWS_TYPE_SHORT || s.PWS_TYPE_CODE || null,
      city: s.CITY_NAME || null,
      county: s.COUNTY_SERVED || null,
      state: s.STATE_CODE,
      zipCode: s.ZIP_CODE || null,
      violationCountTotal: forSystem.length,
      violationCountMcl: mcl,
      violationCountMrdl: mrdl,
      violationCountTt: tt,
      violationCountMonitoring: monitoring,
      violationCountResolved: resolved,
      violationCountUnresolved: unresolved,
      mostRecentViolationDate: mostRecent,
    };
  });
}

// ---------- Shared upsert + run logging ----------

export function upsertRegionalRecords(records: RegionalRecord[], source: "live_api" | "bulk_csv") {
  const stmt = db().prepare(
    `INSERT INTO regional_water_data
       (pwsid, pws_name, pws_type, city, county, state, zip_code,
        violation_count_total, violation_count_mcl, violation_count_mrdl, violation_count_tt,
        violation_count_monitoring, violation_count_resolved, violation_count_unresolved,
        most_recent_violation_date, source, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
     ON CONFLICT(pwsid) DO UPDATE SET
       pws_name = excluded.pws_name,
       pws_type = excluded.pws_type,
       city = excluded.city,
       county = excluded.county,
       state = excluded.state,
       zip_code = excluded.zip_code,
       violation_count_total = excluded.violation_count_total,
       violation_count_mcl = excluded.violation_count_mcl,
       violation_count_mrdl = excluded.violation_count_mrdl,
       violation_count_tt = excluded.violation_count_tt,
       violation_count_monitoring = excluded.violation_count_monitoring,
       violation_count_resolved = excluded.violation_count_resolved,
       violation_count_unresolved = excluded.violation_count_unresolved,
       most_recent_violation_date = excluded.most_recent_violation_date,
       source = excluded.source,
       updated_at = datetime('now')`
  );
  for (const r of records) {
    stmt.run(
      r.pwsid, r.pwsName, r.pwsType, r.city, r.county, r.state, r.zipCode,
      r.violationCountTotal, r.violationCountMcl, r.violationCountMrdl, r.violationCountTt,
      r.violationCountMonitoring, r.violationCountResolved, r.violationCountUnresolved,
      r.mostRecentViolationDate, source
    );
  }
}

function startRun(source: "live_api" | "bulk_csv", states: string[]) {
  const id = rid("ingest");
  db()
    .prepare(`INSERT INTO ingestion_runs (id, source, states, status) VALUES (?,?,?,'running')`)
    .run(id, source, states.join(","));
  return id;
}

function finishRun(id: string, rowsPulled: number, rowsUpserted: number, status: "success" | "partial" | "failed", error?: string) {
  db()
    .prepare(
      `UPDATE ingestion_runs SET finished_at = datetime('now'), rows_pulled = ?, rows_upserted = ?, status = ?, error_message = ? WHERE id = ?`
    )
    .run(rowsPulled, rowsUpserted, status, error ?? null, id);
}

/** Runs a live ingestion for the given states (defaults to Michigan, our pilot geography), logging the run. */
export async function runLiveIngestion(states: string[] = ["MI"]) {
  const runId = startRun("live_api", states);
  let rowsPulled = 0;
  try {
    for (const state of states) {
      const records = await pullLiveStateData(state);
      rowsPulled += records.length;
      upsertRegionalRecords(records, "live_api");
    }
    finishRun(runId, rowsPulled, rowsPulled, "success");
    return { runId, rowsPulled, status: "success" as const };
  } catch (err: any) {
    finishRun(runId, rowsPulled, rowsPulled, "failed", String(err?.message ?? err));
    return { runId, rowsPulled, status: "failed" as const, error: String(err?.message ?? err) };
  }
}

const DEFAULT_BULK_DIR = path.join(process.cwd(), "data", "bulk_samples");

/** Runs ingestion from locally-stored bulk CSV exports — used as an offline-safe fallback for demos. */
export function runBulkCsvIngestion(
  systemsCsvPath: string = path.join(DEFAULT_BULK_DIR, "mi_water_systems.csv"),
  violationsCsvPath: string = path.join(DEFAULT_BULK_DIR, "mi_violations.csv")
) {
  const states = ["MI"];
  const runId = startRun("bulk_csv", states);
  try {
    const records = pullBulkCsvData(systemsCsvPath, violationsCsvPath);
    upsertRegionalRecords(records, "bulk_csv");
    finishRun(runId, records.length, records.length, "success");
    return { runId, rowsPulled: records.length, status: "success" as const };
  } catch (err: any) {
    finishRun(runId, 0, 0, "failed", String(err?.message ?? err));
    return { runId, rowsPulled: 0, status: "failed" as const, error: String(err?.message ?? err) };
  }
}
