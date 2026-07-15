import { sql } from "./db";
import { rid } from "./ids";

// ---------- Jobs ----------
export async function listJobsForTech(techId: string) {
  return sql`
    SELECT j.*, c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone,
           e.type AS equipment_type, e.make AS equipment_make, e.model AS equipment_model, e.install_year AS equipment_install_year
    FROM jobs j
    JOIN customers c ON c.id = j.customer_id
    LEFT JOIN equipment e ON e.id = j.equipment_id
    WHERE j.tech_id = ${techId} AND j.status IN ('scheduled','in_progress')
    ORDER BY j.scheduled_at ASC
  `;
}

export async function getJob(jobId: string) {
  const rows = await sql`
    SELECT j.*, c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone, c.id as customer_id,
           e.id AS equipment_id, e.type AS equipment_type, e.make AS equipment_make, e.model AS equipment_model, e.install_year AS equipment_install_year
    FROM jobs j
    JOIN customers c ON c.id = j.customer_id
    LEFT JOIN equipment e ON e.id = j.equipment_id
    WHERE j.id = ${jobId}
  `;
  return rows[0] ?? null;
}

export async function setJobStatus(jobId: string, status: string) {
  await sql`UPDATE jobs SET status = ${status} WHERE id = ${jobId}`;
}

export async function getCustomerHistory(customerId: string, excludeJobId?: string) {
  return sql`
    SELECT j.id, j.job_type, j.scheduled_at, j.status, o.actual_diagnosis, o.matched
    FROM jobs j
    LEFT JOIN job_outcomes o ON o.job_id = j.id
    WHERE j.customer_id = ${customerId} AND j.id != COALESCE(${excludeJobId ?? null}, '')
    ORDER BY j.scheduled_at DESC LIMIT 10
  `;
}

// ---------- Diagnostic trees ----------
const treeByEquipmentType: Record<string, string> = {
  "Gas Water Heater": "tree_gwh",
  Toilet: "tree_toilet",
  "Drain Line": "tree_drain",
  "Water Supply System": "tree_pressure",
  "Sump Pump": "tree_sump",
  "Sewer Line": "tree_sewer",
};

export async function listTrees() {
  return sql`SELECT * FROM diagnostic_trees ORDER BY name`;
}

export function getTreeIdForEquipmentType(equipmentType: string | null) {
  if (equipmentType && treeByEquipmentType[equipmentType]) return treeByEquipmentType[equipmentType];
  return null;
}

export function listEquipmentTypes() {
  return Object.keys(treeByEquipmentType);
}

export async function getTree(treeId: string) {
  const rows = await sql`SELECT * FROM diagnostic_trees WHERE id = ${treeId}`;
  return rows[0] ?? null;
}

export async function getRootNode(treeId: string) {
  const rows = await sql`SELECT * FROM diagnostic_nodes WHERE tree_id = ${treeId} AND parent_node_id IS NULL`;
  return rows[0] ?? null;
}

export async function getNode(nodeId: string) {
  const rows = await sql`SELECT * FROM diagnostic_nodes WHERE id = ${nodeId}`;
  return rows[0] ?? null;
}

export async function getChildNode(parentId: string, optionValue: string) {
  const rows = await sql`SELECT * FROM diagnostic_nodes WHERE parent_node_id = ${parentId} AND parent_option_value = ${optionValue}`;
  return rows[0] ?? null;
}

export async function getBulletin(bulletinId: string | null) {
  if (!bulletinId) return null;
  const rows = await sql`
    SELECT b.*, m.name AS manufacturer_name
    FROM technical_bulletins b JOIN manufacturers m ON m.id = b.manufacturer_id
    WHERE b.id = ${bulletinId}
  `;
  return rows[0] ?? null;
}

export async function listVisionCategories() {
  return sql`SELECT * FROM vision_defect_categories`;
}

// ---------- Diagnostic sessions ----------
export async function createSession(jobId: string, treeId: string, techId: string) {
  const id = rid("sess");
  await sql`
    INSERT INTO diagnostic_sessions (id, job_id, tree_id, tech_id, started_at, status)
    VALUES (${id}, ${jobId}, ${treeId}, ${techId}, ${new Date().toISOString()}, 'in_progress')
  `;
  await setJobStatus(jobId, "in_progress");
  return id;
}

export async function getSession(sessionId: string) {
  const rows = await sql`SELECT * FROM diagnostic_sessions WHERE id = ${sessionId}`;
  return rows[0] ?? null;
}

export async function getSessionForJob(jobId: string) {
  const rows = await sql`SELECT * FROM diagnostic_sessions WHERE job_id = ${jobId} ORDER BY started_at DESC LIMIT 1`;
  return rows[0] ?? null;
}

export async function appendPathStep(sessionId: string, optionValue: string) {
  const session = await getSession(sessionId);
  const path = JSON.parse(session.path_json || "[]");
  path.push(optionValue);
  await sql`UPDATE diagnostic_sessions SET path_json = ${JSON.stringify(path)} WHERE id = ${sessionId}`;
}

export async function completeSessionWithResult(sessionId: string, result: any) {
  const safetyCritical = result.safetyCritical ? 1 : 0;
  const secondOpinionRecommended = result.confidence < 65 || result.safetyCritical;
  await sql`
    UPDATE diagnostic_sessions SET
      completed_at = ${new Date().toISOString()},
      primary_diagnosis = ${result.primaryDiagnosis},
      confidence = ${result.confidence},
      secondary_diagnoses_json = ${JSON.stringify(result.secondaryDiagnoses ?? [])},
      parts_recommended_json = ${JSON.stringify(result.parts ?? [])},
      est_repair_time_minutes = ${result.estRepairTimeMinutes ?? null},
      safety_critical = ${safetyCritical},
      status = 'diagnosed'
    WHERE id = ${sessionId}
  `;
  return { secondOpinionRecommended };
}

export async function recordPhotoAnalysis(sessionId: string, nodeId: string | null, categoryId: string, confidence: number) {
  await sql`
    INSERT INTO photo_analyses (id, session_id, node_id, category_id, confidence)
    VALUES (${rid("photo")}, ${sessionId}, ${nodeId}, ${categoryId}, ${confidence})
  `;
}

// ---------- Second opinions ----------
export async function requestSecondOpinion(sessionId: string) {
  const reviewers = await sql`SELECT * FROM users WHERE role = 'REVIEWER'`;
  const reviewer = reviewers[Math.floor(Math.random() * reviewers.length)];
  const id = rid("so");
  await sql`INSERT INTO second_opinions (id, session_id, reviewer_id, status) VALUES (${id}, ${sessionId}, ${reviewer.id}, 'pending')`;
  await sql`UPDATE diagnostic_sessions SET second_opinion_requested = 1, status = 'awaiting_review' WHERE id = ${sessionId}`;
  return { id, reviewer };
}

export async function getSecondOpinion(soId: string) {
  const rows = await sql`
    SELECT so.*, u.name AS reviewer_name, u.credential AS reviewer_credential, u.years_experience AS reviewer_years
    FROM second_opinions so JOIN users u ON u.id = so.reviewer_id WHERE so.id = ${soId}
  `;
  return rows[0] ?? null;
}

export async function getSecondOpinionForSession(sessionId: string) {
  const rows = await sql`
    SELECT so.*, u.name AS reviewer_name, u.credential AS reviewer_credential, u.years_experience AS reviewer_years
    FROM second_opinions so JOIN users u ON u.id = so.reviewer_id
    WHERE so.session_id = ${sessionId} ORDER BY so.requested_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function resolveSecondOpinion(soId: string, status: "confirmed" | "redirected", notes: string, redirectedDiagnosis?: string) {
  await sql`
    UPDATE second_opinions SET
      status = ${status},
      responded_at = ${new Date().toISOString()},
      reviewer_notes = ${notes},
      redirected_diagnosis = ${redirectedDiagnosis ?? null}
    WHERE id = ${soId}
  `;
  const so = await getSecondOpinion(soId);
  await sql`UPDATE diagnostic_sessions SET status = 'diagnosed' WHERE id = ${so.session_id}`;
}

export async function listPendingReviewsForReviewer(reviewerId: string) {
  return sql`
    SELECT so.*, s.primary_diagnosis, s.confidence, s.safety_critical, s.secondary_diagnoses_json, j.job_type, j.id as job_id,
           c.name as customer_name, c.address as customer_address, u.name as tech_name
    FROM second_opinions so
    JOIN diagnostic_sessions s ON s.id = so.session_id
    JOIN jobs j ON j.id = s.job_id
    JOIN customers c ON c.id = j.customer_id
    JOIN users u ON u.id = s.tech_id
    WHERE so.reviewer_id = ${reviewerId} AND so.status = 'pending'
    ORDER BY so.requested_at ASC
  `;
}

export async function listReviewHistoryForReviewer(reviewerId: string) {
  return sql`
    SELECT so.*, s.primary_diagnosis, j.job_type, c.name as customer_name
    FROM second_opinions so
    JOIN diagnostic_sessions s ON s.id = so.session_id
    JOIN jobs j ON j.id = s.job_id
    JOIN customers c ON c.id = j.customer_id
    WHERE so.reviewer_id = ${reviewerId} AND so.status != 'pending'
    ORDER BY so.responded_at DESC LIMIT 25
  `;
}

// ---------- Job close-out ----------
export async function closeJob(jobId: string, sessionId: string, techId: string, actualDiagnosis: string, matched: boolean, partsUsed: any[]) {
  await sql`
    INSERT INTO job_outcomes (id, job_id, session_id, tech_id, actual_diagnosis, matched, parts_used_json)
    VALUES (${rid("outcome")}, ${jobId}, ${sessionId}, ${techId}, ${actualDiagnosis}, ${matched ? 1 : 0}, ${JSON.stringify(partsUsed)})
  `;
  await setJobStatus(jobId, "closed");
  await sql`UPDATE diagnostic_sessions SET status = 'closed' WHERE id = ${sessionId}`;

  const techRows = await sql`SELECT truck_id FROM users WHERE id = ${techId}`;
  const tech = techRows[0];
  if (tech?.truck_id) {
    for (const p of partsUsed) {
      const partRows = await sql`SELECT id FROM parts WHERE part_number = ${p.partNumber}`;
      if (!partRows[0]) continue;
      await sql`
        UPDATE truck_stock SET quantity = GREATEST(0, quantity - ${p.qty ?? 1})
        WHERE truck_id = ${tech.truck_id} AND part_id = ${partRows[0].id}
      `;
    }
  }
}

export async function getJobOutcome(jobId: string) {
  const rows = await sql`SELECT * FROM job_outcomes WHERE job_id = ${jobId}`;
  return rows[0] ?? null;
}

// ---------- Truck stock ----------
export async function getTruckStock(truckId: string) {
  return sql`
    SELECT ts.*, p.part_number, p.name AS part_name, p.category, p.unit_cost
    FROM truck_stock ts JOIN parts p ON p.id = ts.part_id
    WHERE ts.truck_id = ${truckId} ORDER BY p.category, p.name
  `;
}

export async function requestRestock(truckId: string, partId: string, requestedBy: string) {
  await sql`INSERT INTO restock_requests (id, truck_id, part_id, requested_by) VALUES (${rid("restock")}, ${truckId}, ${partId}, ${requestedBy})`;
}

export async function getTruckForTech(techId: string) {
  const rows = await sql`SELECT truck_id FROM users WHERE id = ${techId}`;
  return rows[0] ?? null;
}

// ---------- Admin: overview KPIs ----------
export async function getOverviewStats() {
  const [totalJobsRows, closedSessions, secondOpinionRows, safetyCriticalRows, lowStockRows, activeTechRows] = await Promise.all([
    sql`SELECT COUNT(*) AS n FROM jobs`,
    sql`SELECT s.*, jo.matched FROM diagnostic_sessions s JOIN job_outcomes jo ON jo.session_id = s.id`,
    sql`SELECT COUNT(*) AS n FROM second_opinions`,
    sql`SELECT COUNT(*) AS n FROM diagnostic_sessions WHERE safety_critical = 1`,
    sql`SELECT COUNT(*) AS n FROM truck_stock WHERE quantity < threshold`,
    sql`SELECT COUNT(*) AS n FROM users WHERE role = 'TECH'`,
  ]);
  const totalJobs = Number(totalJobsRows[0].n);
  const matched = closedSessions.filter((s: any) => s.matched).length;
  const accuracyPct = closedSessions.length ? Math.round((matched / closedSessions.length) * 1000) / 10 : 0;
  const avgConfidence = closedSessions.length
    ? Math.round((closedSessions.reduce((sum: number, s: any) => sum + (s.confidence ?? 0), 0) / closedSessions.length) * 10) / 10
    : 0;
  return {
    totalJobs,
    closedCount: closedSessions.length,
    accuracyPct,
    avgConfidence,
    secondOpinionCount: Number(secondOpinionRows[0].n),
    safetyCriticalCount: Number(safetyCriticalRows[0].n),
    lowStockCount: Number(lowStockRows[0].n),
    activeTechs: Number(activeTechRows[0].n),
  };
}

export async function getAccuracyTrend() {
  return sql`
    SELECT substr(jo.closed_at, 1, 10) AS day,
           COUNT(*) AS total,
           SUM(jo.matched) AS matched
    FROM job_outcomes jo
    GROUP BY day
    ORDER BY day ASC
  `;
}

export async function listClosedSessions(filters: { techId?: string; matched?: string; minConfidence?: string } = {}) {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.techId) {
    params.push(filters.techId);
    clauses.push(`s.tech_id = $${params.length}`);
  }
  if (filters.matched === "true" || filters.matched === "false") {
    params.push(filters.matched === "true" ? 1 : 0);
    clauses.push(`jo.matched = $${params.length}`);
  }
  if (filters.minConfidence) {
    params.push(Number(filters.minConfidence));
    clauses.push(`s.confidence >= $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return sql(
    `SELECT s.id AS session_id, s.primary_diagnosis, s.confidence, s.safety_critical,
            s.second_opinion_requested, s.est_repair_time_minutes,
            jo.actual_diagnosis, jo.matched, jo.closed_at,
            u.name AS tech_name, c.name AS customer_name, j.job_type
     FROM diagnostic_sessions s
     JOIN job_outcomes jo ON jo.session_id = s.id
     JOIN jobs j ON j.id = jo.job_id
     JOIN customers c ON c.id = j.customer_id
     JOIN users u ON u.id = s.tech_id
     ${where}
     ORDER BY jo.closed_at DESC`,
    params
  );
}

export async function listTechsForFilter() {
  return sql`SELECT id, name FROM users WHERE role = 'TECH' ORDER BY name`;
}

export async function getIssueTypeBreakdown() {
  return sql`
    SELECT t.name AS tree_name, t.equipment_type, COUNT(*) AS n,
           SUM(jo.matched) AS matched_n,
           AVG(s.confidence) AS avg_confidence
    FROM diagnostic_sessions s
    JOIN job_outcomes jo ON jo.session_id = s.id
    JOIN diagnostic_trees t ON t.id = s.tree_id
    GROUP BY t.id, t.name, t.equipment_type
    ORDER BY n DESC
  `;
}

export async function getIssueTypeDetail(treeId: string) {
  return sql`
    SELECT s.primary_diagnosis, COUNT(*) AS n, AVG(s.confidence) AS avg_confidence, SUM(jo.matched) AS matched_n
    FROM diagnostic_sessions s
    JOIN job_outcomes jo ON jo.session_id = s.id
    WHERE s.tree_id = ${treeId}
    GROUP BY s.primary_diagnosis
    ORDER BY n DESC
  `;
}

export async function getConfidenceCalibration() {
  return sql`
    SELECT
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
    ORDER BY MIN(s.confidence) DESC
  `;
}

export async function getTechPerformance() {
  return sql`
    SELECT u.id, u.name,
           COUNT(*) AS total_jobs,
           SUM(jo.matched) AS matched_n,
           AVG(s.confidence) AS avg_confidence,
           SUM(s.second_opinion_requested) AS second_opinions,
           AVG(s.est_repair_time_minutes) AS avg_repair_minutes,
           MIN(s.est_repair_time_minutes) AS min_repair_minutes,
           MAX(s.est_repair_time_minutes) AS max_repair_minutes
    FROM diagnostic_sessions s
    JOIN job_outcomes jo ON jo.session_id = s.id
    JOIN users u ON u.id = s.tech_id
    GROUP BY u.id, u.name
    ORDER BY total_jobs DESC
  `;
}

export async function getTechOpenJobForecast() {
  return sql`
    SELECT u.id AS tech_id, u.name AS tech_name,
           COUNT(j.id) AS open_jobs,
           SUM(s.est_repair_time_minutes) AS projected_minutes
    FROM jobs j
    JOIN users u ON u.id = j.tech_id
    LEFT JOIN diagnostic_sessions s ON s.job_id = j.id AND s.status = 'in_progress'
    WHERE j.status IN ('scheduled','in_progress')
    GROUP BY u.id, u.name
    ORDER BY projected_minutes DESC NULLS LAST
  `;
}

// ---------- Admin: procurement / truck stock ----------
export async function listAllTruckStock() {
  return sql`
    SELECT ts.*, t.name AS truck_name, p.part_number, p.name AS part_name, p.category, p.unit_cost
    FROM truck_stock ts
    JOIN trucks t ON t.id = ts.truck_id
    JOIN parts p ON p.id = ts.part_id
    ORDER BY t.name, p.category, p.name
  `;
}

export async function listLowStock() {
  return sql`
    SELECT ts.*, t.name AS truck_name, p.part_number, p.name AS part_name, p.category, p.unit_cost
    FROM truck_stock ts
    JOIN trucks t ON t.id = ts.truck_id
    JOIN parts p ON p.id = ts.part_id
    WHERE ts.quantity < ts.threshold
    ORDER BY (ts.threshold - ts.quantity) DESC
  `;
}

export async function listPendingRestockRequests() {
  return sql`
    SELECT rr.*, t.name AS truck_name, p.part_number, p.name AS part_name, p.unit_cost, u.name AS requested_by_name
    FROM restock_requests rr
    JOIN trucks t ON t.id = rr.truck_id
    JOIN parts p ON p.id = rr.part_id
    JOIN users u ON u.id = rr.requested_by
    WHERE rr.status = 'pending'
    ORDER BY rr.requested_at DESC
  `;
}

export async function getReorderSuggestions() {
  return sql`
    SELECT p.id AS part_id, p.part_number, p.name AS part_name, p.category, p.unit_cost,
           COUNT(DISTINCT ts.truck_id) AS trucks_low,
           SUM(GREATEST(ts.threshold - ts.quantity, 0)) AS total_deficit,
           (SELECT COUNT(*) FROM diagnostic_sessions s
              WHERE s.parts_recommended_json LIKE '%' || p.part_number || '%') AS diagnostic_demand
    FROM truck_stock ts
    JOIN parts p ON p.id = ts.part_id
    WHERE ts.quantity < ts.threshold
    GROUP BY p.id, p.part_number, p.name, p.category, p.unit_cost
    ORDER BY total_deficit DESC
  `;
}

export async function listVendorsForPart(partId: string) {
  return sql`
    SELECT v.id, v.name, v.lead_time_days, vp.price
    FROM vendor_pricing vp JOIN vendors v ON v.id = vp.vendor_id
    WHERE vp.part_id = ${partId}
    ORDER BY vp.price ASC
  `;
}

export async function listVendors() {
  return sql`
    SELECT v.*, (SELECT COUNT(*) FROM vendor_pricing vp WHERE vp.vendor_id = v.id) AS parts_offered
    FROM vendors v ORDER BY v.name
  `;
}

export async function createPurchaseOrder(vendorId: string, items: { partId: string; quantity: number; unitPrice: number }[], createdBy: string) {
  const poId = rid("po");
  const totalCost = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  await sql`INSERT INTO purchase_orders (id, vendor_id, status, created_by, total_cost) VALUES (${poId}, ${vendorId}, 'submitted', ${createdBy}, ${totalCost})`;
  for (const item of items) {
    await sql`INSERT INTO purchase_order_items (id, po_id, part_id, quantity, unit_price) VALUES (${rid("poi")}, ${poId}, ${item.partId}, ${item.quantity}, ${item.unitPrice})`;
  }
  return poId;
}

export async function listPurchaseOrders() {
  return sql`
    SELECT po.*, v.name AS vendor_name, u.name AS created_by_name,
           (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id) AS item_count
    FROM purchase_orders po
    JOIN vendors v ON v.id = po.vendor_id
    JOIN users u ON u.id = po.created_by
    ORDER BY po.created_at DESC
  `;
}

export async function fulfillRestockRequest(restockId: string) {
  await sql`UPDATE restock_requests SET status = 'fulfilled' WHERE id = ${restockId}`;
}

// ---------- Admin: manufacturer library & review board ----------
export async function listManufacturers() {
  return sql`SELECT * FROM manufacturers ORDER BY name`;
}

export async function listBulletinsForManufacturer(manufacturerId: string) {
  return sql`
    SELECT tb.*, dc.code AS defect_code, dc.family AS defect_family
    FROM technical_bulletins tb LEFT JOIN defect_codes dc ON dc.id = tb.defect_code_id
    WHERE tb.manufacturer_id = ${manufacturerId}
    ORDER BY tb.bulletin_number
  `;
}

export async function listReviewers() {
  return sql`
    SELECT u.*,
           (SELECT COUNT(*) FROM second_opinions WHERE reviewer_id = u.id) AS total_reviews,
           (SELECT COUNT(*) FROM second_opinions WHERE reviewer_id = u.id AND status = 'pending') AS pending_reviews
    FROM users u WHERE u.role = 'REVIEWER' ORDER BY u.name
  `;
}

// ---------- Regional water data (SDWIS ingestion) ----------
export async function getRegionalWaterSummary() {
  const rows = await sql`
    SELECT COUNT(*) AS system_count,
           SUM(CASE WHEN violation_count_unresolved > 0 THEN 1 ELSE 0 END) AS systems_with_unresolved,
           SUM(violation_count_total) AS total_violations,
           MAX(updated_at) AS last_updated
    FROM regional_water_data
  `;
  return rows[0] ?? null;
}

export async function listRegionalWaterSystems() {
  return sql`SELECT * FROM regional_water_data ORDER BY violation_count_unresolved DESC, pws_name ASC`;
}

export async function getLatestIngestionRun() {
  const rows = await sql`SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT 1`;
  return rows[0] ?? null;
}

export async function listIngestionRuns(limit = 10) {
  return sql`SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT ${limit}`;
}

export async function getRegionalContextForAddress(address: string | null | undefined) {
  if (!address) return null;
  const counties = await sql`SELECT DISTINCT county FROM regional_water_data WHERE county IS NOT NULL`;
  const upperAddress = address.toUpperCase();
  const match = counties.find((c: any) => c.county && upperAddress.includes(c.county.toUpperCase()));
  if (!match) return null;
  const rows = await sql`
    SELECT * FROM regional_water_data WHERE county = ${match.county} AND violation_count_unresolved > 0
    ORDER BY violation_count_unresolved DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

// ---------- Intake (customer + equipment + job creation) ----------
export async function createIntakeJob(input: {
  customerName: string;
  address: string;
  phone?: string;
  email?: string;
  leadSource?: string;
  equipmentType: string;
  equipmentMake?: string;
  equipmentModel?: string;
  jobType: string;
  notes?: string;
  techId?: string | null;
  scheduledAt: string;
  status?: "scheduled" | "in_progress";
  source: "admin" | "tech" | "public_intake";
}) {
  const customerId = rid("cust");
  await sql`INSERT INTO customers (id, name, address, phone, email, lead_source) VALUES (${customerId}, ${input.customerName}, ${input.address}, ${input.phone || null}, ${input.email || null}, ${input.leadSource || null})`;

  const equipmentId = rid("equip");
  await sql`INSERT INTO equipment (id, customer_id, type, make, model) VALUES (${equipmentId}, ${customerId}, ${input.equipmentType}, ${input.equipmentMake || null}, ${input.equipmentModel || null})`;

  const jobId = rid("job");
  await sql`
    INSERT INTO jobs (id, customer_id, equipment_id, tech_id, job_type, notes, scheduled_at, status, source)
    VALUES (${jobId}, ${customerId}, ${equipmentId}, ${input.techId || null}, ${input.jobType}, ${input.notes || null}, ${input.scheduledAt}, ${input.status || "scheduled"}, ${input.source})
  `;

  return { jobId, customerId, equipmentId };
}

export async function listUnassignedJobs() {
  return sql`
    SELECT j.id, j.job_type, j.notes, j.scheduled_at, j.created_at, j.source,
           c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone,
           c.email AS customer_email, c.lead_source,
           e.type AS equipment_type, e.make AS equipment_make, e.model AS equipment_model
    FROM jobs j
    JOIN customers c ON c.id = j.customer_id
    LEFT JOIN equipment e ON e.id = j.equipment_id
    WHERE j.tech_id IS NULL AND j.status NOT IN ('closed', 'cancelled')
    ORDER BY j.created_at ASC
  `;
}

export async function assignJobTech(jobId: string, techId: string, scheduledAt: string) {
  await sql`UPDATE jobs SET tech_id = ${techId}, scheduled_at = ${scheduledAt}, status = 'scheduled' WHERE id = ${jobId}`;
}

export async function getUserHourlyRate(userId: string) {
  const rows = await sql`SELECT hourly_rate FROM users WHERE id = ${userId}`;
  return rows[0]?.hourly_rate ?? 0;
}

export async function listAllTechs() {
  return sql`SELECT id, name, email, hourly_rate FROM users WHERE role = 'TECH' ORDER BY name`;
}

// ---------- Pricing & estimates ----------
export async function getCompanySettings() {
  const rows = await sql`SELECT * FROM company_settings WHERE id = 'singleton'`;
  return rows[0] ?? null;
}

export async function setDefaultMarkupPct(pct: number) {
  await sql`UPDATE company_settings SET default_markup_pct = ${pct}, updated_at = ${new Date().toISOString()} WHERE id = 'singleton'`;
}

export async function setCompanyName(name: string) {
  await sql`UPDATE company_settings SET company_name = ${name}, updated_at = ${new Date().toISOString()} WHERE id = 'singleton'`;
}

export async function setCompanyProfile(fields: {
  company_name: string;
  address: string;
  phone: string;
  support_email: string;
  website: string;
  logo_path?: string;
  trade_license: string;
  insurance_carrier: string;
  service_area: string;
}) {
  const current = await getCompanySettings();
  await sql`
    UPDATE company_settings SET
      company_name = ${fields.company_name},
      address = ${fields.address},
      phone = ${fields.phone},
      support_email = ${fields.support_email},
      website = ${fields.website},
      logo_path = ${fields.logo_path ?? current?.logo_path ?? ''},
      trade_license = ${fields.trade_license},
      insurance_carrier = ${fields.insurance_carrier},
      service_area = ${fields.service_area},
      updated_at = ${new Date().toISOString()}
    WHERE id = 'singleton'
  `;
}

export async function setTechHourlyRate(userId: string, rate: number) {
  await sql`UPDATE users SET hourly_rate = ${rate} WHERE id = ${userId}`;
}

export async function getPartByPartNumber(partNumber: string) {
  const rows = await sql`SELECT * FROM parts WHERE part_number = ${partNumber}`;
  return rows[0] ?? null;
}

export async function createEstimate(input: {
  jobId: string;
  sessionId?: string | null;
  createdBy: string;
  parts: { partNumber: string; name: string; qty: number }[];
  laborHours: number;
  laborRate: number;
  markupPct: number;
}) {
  const pricedParts = await Promise.all(
    input.parts.map(async (p) => {
      const part = await getPartByPartNumber(p.partNumber);
      const unitCost = part?.unit_cost ?? 0;
      return { ...p, unitCost, lineCost: unitCost * p.qty };
    })
  );
  const partsCost = Math.round(pricedParts.reduce((sum, p) => sum + p.lineCost, 0) * 100) / 100;
  const laborCost = Math.round(input.laborHours * input.laborRate * 100) / 100;
  const subtotal = partsCost + laborCost;
  const markupAmount = Math.round(subtotal * (input.markupPct / 100) * 100) / 100;
  const total = Math.round((subtotal + markupAmount) * 100) / 100;

  const estimateId = rid("est");
  await sql`
    INSERT INTO estimates (id, job_id, session_id, created_by, parts_json, parts_cost, labor_hours, labor_rate, labor_cost, markup_pct, markup_amount, total)
    VALUES (${estimateId}, ${input.jobId}, ${input.sessionId || null}, ${input.createdBy}, ${JSON.stringify(pricedParts)}, ${partsCost}, ${input.laborHours}, ${input.laborRate}, ${laborCost}, ${input.markupPct}, ${markupAmount}, ${total})
  `;

  return estimateId;
}

export async function getEstimate(estimateId: string) {
  const rows = await sql`
    SELECT es.*, j.job_type, j.customer_id, c.name AS customer_name, c.address AS customer_address,
           c.phone AS customer_phone, c.email AS customer_email, u.name AS created_by_name
    FROM estimates es
    JOIN jobs j ON j.id = es.job_id
    JOIN customers c ON c.id = j.customer_id
    JOIN users u ON u.id = es.created_by
    WHERE es.id = ${estimateId}
  `;
  return rows[0] ?? null;
}

export async function getEstimateForJob(jobId: string) {
  const rows = await sql`SELECT * FROM estimates WHERE job_id = ${jobId} ORDER BY created_at DESC LIMIT 1`;
  return rows[0] ?? null;
}

export async function markEstimateSent(estimateId: string) {
  await sql`UPDATE estimates SET status = 'sent' WHERE id = ${estimateId} AND status = 'draft'`;
}

export async function signEstimate(estimateId: string, signatureName: string, signatureData: string) {
  await sql`
    UPDATE estimates SET
      status = 'signed',
      signed_at = ${new Date().toISOString()},
      signature_name = ${signatureName},
      signature_data = ${signatureData}
    WHERE id = ${estimateId}
  `;
}
