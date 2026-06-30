import { ensureSchema } from "./db";
import { rid } from "./ids";

const db = () => ensureSchema();

// ---------- Jobs ----------
export function listJobsForTech(techId: string) {
  return db()
    .prepare(
      `SELECT j.*, c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone,
              e.type AS equipment_type, e.make AS equipment_make, e.model AS equipment_model, e.install_year AS equipment_install_year
       FROM jobs j
       JOIN customers c ON c.id = j.customer_id
       LEFT JOIN equipment e ON e.id = j.equipment_id
       WHERE j.tech_id = ? AND j.status IN ('scheduled','in_progress')
       ORDER BY j.scheduled_at ASC`
    )
    .all(techId) as any[];
}

export function getJob(jobId: string) {
  return db()
    .prepare(
      `SELECT j.*, c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone, c.id as customer_id,
              e.id AS equipment_id, e.type AS equipment_type, e.make AS equipment_make, e.model AS equipment_model, e.install_year AS equipment_install_year
       FROM jobs j
       JOIN customers c ON c.id = j.customer_id
       LEFT JOIN equipment e ON e.id = j.equipment_id
       WHERE j.id = ?`
    )
    .get(jobId) as any;
}

export function setJobStatus(jobId: string, status: string) {
  db().prepare(`UPDATE jobs SET status = ? WHERE id = ?`).run(status, jobId);
}

export function getCustomerHistory(customerId: string, excludeJobId?: string) {
  return db()
    .prepare(
      `SELECT j.id, j.job_type, j.scheduled_at, j.status, o.actual_diagnosis, o.matched
       FROM jobs j
       LEFT JOIN job_outcomes o ON o.job_id = j.id
       WHERE j.customer_id = ? AND j.id != COALESCE(?, '')
       ORDER BY j.scheduled_at DESC LIMIT 10`
    )
    .all(customerId, excludeJobId ?? null) as any[];
}

// ---------- Diagnostic trees ----------
const treeByEquipmentType: Record<string, string> = {
  "Gas Water Heater": "tree_gwh",
  Toilet: "tree_toilet",
  "Drain Line": "tree_drain",
  "Water Supply System": "tree_pressure",
  "Sump Pump": "tree_sump",
};

export function listTrees() {
  return db().prepare(`SELECT * FROM diagnostic_trees ORDER BY name`).all() as any[];
}

export function getTreeIdForEquipmentType(equipmentType: string | null) {
  if (equipmentType && treeByEquipmentType[equipmentType]) return treeByEquipmentType[equipmentType];
  return null;
}

export function getTree(treeId: string) {
  return db().prepare(`SELECT * FROM diagnostic_trees WHERE id = ?`).get(treeId) as any;
}

export function getRootNode(treeId: string) {
  return db().prepare(`SELECT * FROM diagnostic_nodes WHERE tree_id = ? AND parent_node_id IS NULL`).get(treeId) as any;
}

export function getNode(nodeId: string) {
  return db().prepare(`SELECT * FROM diagnostic_nodes WHERE id = ?`).get(nodeId) as any;
}

export function getChildNode(parentId: string, optionValue: string) {
  return db()
    .prepare(`SELECT * FROM diagnostic_nodes WHERE parent_node_id = ? AND parent_option_value = ?`)
    .get(parentId, optionValue) as any;
}

export function getBulletin(bulletinId: string | null) {
  if (!bulletinId) return null;
  return db()
    .prepare(
      `SELECT b.*, m.name AS manufacturer_name FROM technical_bulletins b JOIN manufacturers m ON m.id = b.manufacturer_id WHERE b.id = ?`
    )
    .get(bulletinId) as any;
}

export function listVisionCategories() {
  return db().prepare(`SELECT * FROM vision_defect_categories`).all() as any[];
}

// ---------- Diagnostic sessions ----------
export function createSession(jobId: string, treeId: string, techId: string) {
  const id = rid("sess");
  db()
    .prepare(
      `INSERT INTO diagnostic_sessions (id, job_id, tree_id, tech_id, started_at, status) VALUES (?,?,?,?,datetime('now'),'in_progress')`
    )
    .run(id, jobId, treeId, techId);
  setJobStatus(jobId, "in_progress");
  return id;
}

export function getSession(sessionId: string) {
  return db().prepare(`SELECT * FROM diagnostic_sessions WHERE id = ?`).get(sessionId) as any;
}

export function getSessionForJob(jobId: string) {
  return db()
    .prepare(`SELECT * FROM diagnostic_sessions WHERE job_id = ? ORDER BY started_at DESC LIMIT 1`)
    .get(jobId) as any;
}

export function appendPathStep(sessionId: string, optionValue: string) {
  const session = getSession(sessionId);
  const path = JSON.parse(session.path_json || "[]");
  path.push(optionValue);
  db().prepare(`UPDATE diagnostic_sessions SET path_json = ? WHERE id = ?`).run(JSON.stringify(path), sessionId);
}

export function completeSessionWithResult(sessionId: string, result: any) {
  const safetyCritical = result.safetyCritical ? 1 : 0;
  const secondOpinionRecommended = result.confidence < 65 || result.safetyCritical;
  db()
    .prepare(
      `UPDATE diagnostic_sessions SET completed_at = datetime('now'), primary_diagnosis = ?, confidence = ?,
       secondary_diagnoses_json = ?, parts_recommended_json = ?, est_repair_time_minutes = ?, safety_critical = ?, status = 'diagnosed'
       WHERE id = ?`
    )
    .run(
      result.primaryDiagnosis,
      result.confidence,
      JSON.stringify(result.secondaryDiagnoses ?? []),
      JSON.stringify(result.parts ?? []),
      result.estRepairTimeMinutes ?? null,
      safetyCritical,
      sessionId
    );
  return { secondOpinionRecommended };
}

export function recordPhotoAnalysis(sessionId: string, nodeId: string | null, categoryId: string, confidence: number) {
  db()
    .prepare(`INSERT INTO photo_analyses (id, session_id, node_id, category_id, confidence) VALUES (?,?,?,?,?)`)
    .run(rid("photo"), sessionId, nodeId, categoryId, confidence);
}

// ---------- Second opinions ----------
export function requestSecondOpinion(sessionId: string) {
  const reviewers = db().prepare(`SELECT * FROM users WHERE role = 'REVIEWER'`).all() as any[];
  const reviewer = reviewers[Math.floor(Math.random() * reviewers.length)];
  const id = rid("so");
  db()
    .prepare(`INSERT INTO second_opinions (id, session_id, reviewer_id, status) VALUES (?,?,?,'pending')`)
    .run(id, sessionId, reviewer.id);
  db().prepare(`UPDATE diagnostic_sessions SET second_opinion_requested = 1, status = 'awaiting_review' WHERE id = ?`).run(sessionId);
  return { id, reviewer };
}

export function getSecondOpinion(soId: string) {
  return db()
    .prepare(
      `SELECT so.*, u.name AS reviewer_name, u.credential AS reviewer_credential, u.years_experience AS reviewer_years
       FROM second_opinions so JOIN users u ON u.id = so.reviewer_id WHERE so.id = ?`
    )
    .get(soId) as any;
}

export function getSecondOpinionForSession(sessionId: string) {
  return db()
    .prepare(
      `SELECT so.*, u.name AS reviewer_name, u.credential AS reviewer_credential, u.years_experience AS reviewer_years
       FROM second_opinions so JOIN users u ON u.id = so.reviewer_id WHERE so.session_id = ? ORDER BY so.requested_at DESC LIMIT 1`
    )
    .get(sessionId) as any;
}

export function resolveSecondOpinion(soId: string, status: "confirmed" | "redirected", notes: string, redirectedDiagnosis?: string) {
  db()
    .prepare(
      `UPDATE second_opinions SET status = ?, responded_at = datetime('now'), reviewer_notes = ?, redirected_diagnosis = ? WHERE id = ?`
    )
    .run(status, notes, redirectedDiagnosis ?? null, soId);
  const so = getSecondOpinion(soId);
  db().prepare(`UPDATE diagnostic_sessions SET status = 'diagnosed' WHERE id = ?`).run(so.session_id);
}

export function listPendingReviewsForReviewer(reviewerId: string) {
  return db()
    .prepare(
      `SELECT so.*, s.primary_diagnosis, s.confidence, s.safety_critical, s.secondary_diagnoses_json, j.job_type, j.id as job_id,
              c.name as customer_name, c.address as customer_address, u.name as tech_name
       FROM second_opinions so
       JOIN diagnostic_sessions s ON s.id = so.session_id
       JOIN jobs j ON j.id = s.job_id
       JOIN customers c ON c.id = j.customer_id
       JOIN users u ON u.id = s.tech_id
       WHERE so.reviewer_id = ? AND so.status = 'pending'
       ORDER BY so.requested_at ASC`
    )
    .all(reviewerId) as any[];
}

export function listReviewHistoryForReviewer(reviewerId: string) {
  return db()
    .prepare(
      `SELECT so.*, s.primary_diagnosis, j.job_type, c.name as customer_name
       FROM second_opinions so
       JOIN diagnostic_sessions s ON s.id = so.session_id
       JOIN jobs j ON j.id = s.job_id
       JOIN customers c ON c.id = j.customer_id
       WHERE so.reviewer_id = ? AND so.status != 'pending'
       ORDER BY so.responded_at DESC LIMIT 25`
    )
    .all(reviewerId) as any[];
}

// ---------- Job close-out ----------
export function closeJob(jobId: string, sessionId: string, techId: string, actualDiagnosis: string, matched: boolean, partsUsed: any[]) {
  db()
    .prepare(`INSERT INTO job_outcomes (id, job_id, session_id, tech_id, actual_diagnosis, matched, parts_used_json) VALUES (?,?,?,?,?,?,?)`)
    .run(rid("outcome"), jobId, sessionId, techId, actualDiagnosis, matched ? 1 : 0, JSON.stringify(partsUsed));
  setJobStatus(jobId, "closed");
  db().prepare(`UPDATE diagnostic_sessions SET status = 'closed' WHERE id = ?`).run(sessionId);

  // Deduct parts used from truck stock
  const job = getJob(jobId);
  const tech = db().prepare(`SELECT truck_id FROM users WHERE id = ?`).get(techId) as any;
  if (tech?.truck_id) {
    for (const p of partsUsed) {
      const part = db().prepare(`SELECT id FROM parts WHERE part_number = ?`).get(p.partNumber) as any;
      if (!part) continue;
      db()
        .prepare(`UPDATE truck_stock SET quantity = MAX(0, quantity - ?) WHERE truck_id = ? AND part_id = ?`)
        .run(p.qty ?? 1, tech.truck_id, part.id);
    }
  }
}

export function getJobOutcome(jobId: string) {
  return db().prepare(`SELECT * FROM job_outcomes WHERE job_id = ?`).get(jobId) as any;
}

// ---------- Truck stock ----------
export function getTruckStock(truckId: string) {
  return db()
    .prepare(
      `SELECT ts.*, p.part_number, p.name AS part_name, p.category, p.unit_cost
       FROM truck_stock ts JOIN parts p ON p.id = ts.part_id
       WHERE ts.truck_id = ? ORDER BY p.category, p.name`
    )
    .all(truckId) as any[];
}

export function requestRestock(truckId: string, partId: string, requestedBy: string) {
  db()
    .prepare(`INSERT INTO restock_requests (id, truck_id, part_id, requested_by) VALUES (?,?,?,?)`)
    .run(rid("restock"), truckId, partId, requestedBy);
}

export function getTruckForTech(techId: string) {
  return db().prepare(`SELECT truck_id FROM users WHERE id = ?`).get(techId) as any;
}

// ---------- Admin: overview KPIs ----------
export function getOverviewStats() {
  const totalJobs = (db().prepare(`SELECT COUNT(*) AS n FROM jobs`).get() as any).n;
  const closedSessions = db()
    .prepare(`SELECT s.*, jo.matched FROM diagnostic_sessions s
               JOIN job_outcomes jo ON jo.session_id = s.id`)
    .all() as any[];
  const matched = closedSessions.filter((s) => s.matched).length;
  const accuracyPct = closedSessions.length ? Math.round((matched / closedSessions.length) * 1000) / 10 : 0;
  const avgConfidence = closedSessions.length
    ? Math.round((closedSessions.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / closedSessions.length) * 10) / 10
    : 0;
  const secondOpinionCount = (db().prepare(`SELECT COUNT(*) AS n FROM second_opinions`).get() as any).n;
  const safetyCriticalCount = (
    db().prepare(`SELECT COUNT(*) AS n FROM diagnostic_sessions WHERE safety_critical = 1`).get() as any
  ).n;
  const lowStockCount = (
    db().prepare(`SELECT COUNT(*) AS n FROM truck_stock WHERE quantity < threshold`).get() as any
  ).n;
  const activeTechs = (db().prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'TECH'`).get() as any).n;

  return { totalJobs, closedCount: closedSessions.length, accuracyPct, avgConfidence, secondOpinionCount, safetyCriticalCount, lowStockCount, activeTechs };
}

export function getAccuracyTrend() {
  return db()
    .prepare(
      `SELECT substr(jo.closed_at, 1, 10) AS day,
              COUNT(*) AS total,
              SUM(jo.matched) AS matched
       FROM job_outcomes jo
       GROUP BY day
       ORDER BY day ASC`
    )
    .all() as any[];
}

export function listClosedSessions(filters: { techId?: string; matched?: string; minConfidence?: string } = {}) {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.techId) {
    clauses.push("s.tech_id = ?");
    params.push(filters.techId);
  }
  if (filters.matched === "true" || filters.matched === "false") {
    clauses.push("jo.matched = ?");
    params.push(filters.matched === "true" ? 1 : 0);
  }
  if (filters.minConfidence) {
    clauses.push("s.confidence >= ?");
    params.push(Number(filters.minConfidence));
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db()
    .prepare(
      `SELECT s.id AS session_id, s.primary_diagnosis, s.confidence, s.safety_critical, s.second_opinion_requested,
              jo.actual_diagnosis, jo.matched, jo.closed_at,
              u.name AS tech_name, c.name AS customer_name, j.job_type
       FROM diagnostic_sessions s
       JOIN job_outcomes jo ON jo.session_id = s.id
       JOIN jobs j ON j.id = jo.job_id
       JOIN customers c ON c.id = j.customer_id
       JOIN users u ON u.id = s.tech_id
       ${where}
       ORDER BY jo.closed_at DESC`
    )
    .all(...params) as any[];
}

export function listTechsForFilter() {
  return db().prepare(`SELECT id, name FROM users WHERE role = 'TECH' ORDER BY name`).all() as any[];
}

export function getIssueTypeBreakdown() {
  return db()
    .prepare(
      `SELECT t.name AS tree_name, t.equipment_type, COUNT(*) AS n,
              SUM(jo.matched) AS matched_n,
              AVG(s.confidence) AS avg_confidence
       FROM diagnostic_sessions s
       JOIN job_outcomes jo ON jo.session_id = s.id
       JOIN diagnostic_trees t ON t.id = s.tree_id
       GROUP BY t.id
       ORDER BY n DESC`
    )
    .all() as any[];
}

export function getIssueTypeDetail(treeId: string) {
  return db()
    .prepare(
      `SELECT s.primary_diagnosis, COUNT(*) AS n, AVG(s.confidence) AS avg_confidence, SUM(jo.matched) AS matched_n
       FROM diagnostic_sessions s
       JOIN job_outcomes jo ON jo.session_id = s.id
       WHERE s.tree_id = ?
       GROUP BY s.primary_diagnosis
       ORDER BY n DESC`
    )
    .all(treeId) as any[];
}

export function getConfidenceCalibration() {
  return db()
    .prepare(
      `SELECT
         CASE
           WHEN s.confidence >= 80 THEN '80-100%'
           WHEN s.confidence >= 65 THEN '65-79%'
           WHEN s.confidence >= 50 THEN '50-64%'
           ELSE '<50%'
         END AS band,
         COUNT(*) AS n,
         SUM(jo.matched) AS matched_n
       FROM diagnostic_sessions s
       JOIN job_outcomes jo ON jo.session_id = s.id
       GROUP BY band
       ORDER BY MIN(s.confidence) DESC`
    )
    .all() as any[];
}

export function getTechPerformance() {
  return db()
    .prepare(
      `SELECT u.id, u.name,
              COUNT(*) AS total_jobs,
              SUM(jo.matched) AS matched_n,
              AVG(s.confidence) AS avg_confidence,
              SUM(s.second_opinion_requested) AS second_opinions
       FROM diagnostic_sessions s
       JOIN job_outcomes jo ON jo.session_id = s.id
       JOIN users u ON u.id = s.tech_id
       GROUP BY u.id
       ORDER BY total_jobs DESC`
    )
    .all() as any[];
}

// ---------- Admin: procurement / truck stock ----------
export function listAllTruckStock() {
  return db()
    .prepare(
      `SELECT ts.*, t.name AS truck_name, p.part_number, p.name AS part_name, p.category, p.unit_cost
       FROM truck_stock ts
       JOIN trucks t ON t.id = ts.truck_id
       JOIN parts p ON p.id = ts.part_id
       ORDER BY t.name, p.category, p.name`
    )
    .all() as any[];
}

export function listLowStock() {
  return db()
    .prepare(
      `SELECT ts.*, t.name AS truck_name, p.part_number, p.name AS part_name, p.category, p.unit_cost
       FROM truck_stock ts
       JOIN trucks t ON t.id = ts.truck_id
       JOIN parts p ON p.id = ts.part_id
       WHERE ts.quantity < ts.threshold
       ORDER BY (ts.threshold - ts.quantity) DESC`
    )
    .all() as any[];
}

export function listPendingRestockRequests() {
  return db()
    .prepare(
      `SELECT rr.*, t.name AS truck_name, p.part_number, p.name AS part_name, p.unit_cost, u.name AS requested_by_name
       FROM restock_requests rr
       JOIN trucks t ON t.id = rr.truck_id
       JOIN parts p ON p.id = rr.part_id
       JOIN users u ON u.id = rr.requested_by
       WHERE rr.status = 'pending'
       ORDER BY rr.requested_at DESC`
    )
    .all() as any[];
}

export function getReorderSuggestions() {
  return db()
    .prepare(
      `SELECT p.id AS part_id, p.part_number, p.name AS part_name, p.category, p.unit_cost,
              COUNT(DISTINCT ts.truck_id) AS trucks_low,
              SUM(MAX(ts.threshold - ts.quantity, 0)) AS total_deficit,
              (SELECT COUNT(*) FROM diagnostic_sessions s
                 WHERE s.parts_recommended_json LIKE '%' || p.part_number || '%') AS diagnostic_demand
       FROM truck_stock ts
       JOIN parts p ON p.id = ts.part_id
       WHERE ts.quantity < ts.threshold
       GROUP BY p.id
       ORDER BY total_deficit DESC`
    )
    .all() as any[];
}

export function listVendorsForPart(partId: string) {
  return db()
    .prepare(
      `SELECT v.id, v.name, v.lead_time_days, vp.price
       FROM vendor_pricing vp JOIN vendors v ON v.id = vp.vendor_id
       WHERE vp.part_id = ?
       ORDER BY vp.price ASC`
    )
    .all(partId) as any[];
}

export function listVendors() {
  return db()
    .prepare(
      `SELECT v.*, (SELECT COUNT(*) FROM vendor_pricing vp WHERE vp.vendor_id = v.id) AS parts_offered
       FROM vendors v ORDER BY v.name`
    )
    .all() as any[];
}

export function createPurchaseOrder(vendorId: string, items: { partId: string; quantity: number; unitPrice: number }[], createdBy: string) {
  const poId = rid("po");
  const totalCost = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  db()
    .prepare(`INSERT INTO purchase_orders (id, vendor_id, status, created_by, total_cost) VALUES (?,?,?,?,?)`)
    .run(poId, vendorId, "submitted", createdBy, totalCost);
  for (const item of items) {
    db()
      .prepare(`INSERT INTO purchase_order_items (id, po_id, part_id, quantity, unit_price) VALUES (?,?,?,?,?)`)
      .run(rid("poi"), poId, item.partId, item.quantity, item.unitPrice);
  }
  return poId;
}

export function listPurchaseOrders() {
  return db()
    .prepare(
      `SELECT po.*, v.name AS vendor_name, u.name AS created_by_name,
              (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id) AS item_count
       FROM purchase_orders po
       JOIN vendors v ON v.id = po.vendor_id
       JOIN users u ON u.id = po.created_by
       ORDER BY po.created_at DESC`
    )
    .all() as any[];
}

export function fulfillRestockRequest(restockId: string) {
  db().prepare(`UPDATE restock_requests SET status = 'fulfilled' WHERE id = ?`).run(restockId);
}

// ---------- Admin: manufacturer library & review board ----------
export function listManufacturers() {
  return db().prepare(`SELECT * FROM manufacturers ORDER BY name`).all() as any[];
}

export function listBulletinsForManufacturer(manufacturerId: string) {
  return db()
    .prepare(
      `SELECT tb.*, dc.code AS defect_code, dc.family AS defect_family
       FROM technical_bulletins tb LEFT JOIN defect_codes dc ON dc.id = tb.defect_code_id
       WHERE tb.manufacturer_id = ?
       ORDER BY tb.bulletin_number`
    )
    .all(manufacturerId) as any[];
}

export function listReviewers() {
  return db()
    .prepare(
      `SELECT u.*,
              (SELECT COUNT(*) FROM second_opinions WHERE reviewer_id = u.id) AS total_reviews,
              (SELECT COUNT(*) FROM second_opinions WHERE reviewer_id = u.id AND status = 'pending') AS pending_reviews
       FROM users u WHERE u.role = 'REVIEWER' ORDER BY u.name`
    )
    .all() as any[];
}

// ---------- Regional water data (SDWIS ingestion) ----------
export function getRegionalWaterSummary() {
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS system_count,
              SUM(CASE WHEN violation_count_unresolved > 0 THEN 1 ELSE 0 END) AS systems_with_unresolved,
              SUM(violation_count_total) AS total_violations,
              MAX(updated_at) AS last_updated
       FROM regional_water_data`
    )
    .get() as any;
  return row;
}

export function listRegionalWaterSystems() {
  return db().prepare(`SELECT * FROM regional_water_data ORDER BY violation_count_unresolved DESC, pws_name ASC`).all() as any[];
}

export function getLatestIngestionRun() {
  return db().prepare(`SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT 1`).get() as any;
}

export function listIngestionRuns(limit = 10) {
  return db().prepare(`SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT ?`).all(limit) as any[];
}

/** Lightweight county lookup: matches a free-text address string against ingested county names. No geocoding — substring match only. */
export function getRegionalContextForAddress(address: string | null | undefined) {
  if (!address) return null;
  const counties = db().prepare(`SELECT DISTINCT county FROM regional_water_data WHERE county IS NOT NULL`).all() as any[];
  const upperAddress = address.toUpperCase();
  const match = counties.find((c: any) => c.county && upperAddress.includes(c.county.toUpperCase()));
  if (!match) return null;
  return db()
    .prepare(
      `SELECT * FROM regional_water_data WHERE county = ? AND violation_count_unresolved > 0
       ORDER BY violation_count_unresolved DESC LIMIT 1`
    )
    .get(match.county) as any;
}
