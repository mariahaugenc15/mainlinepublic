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
