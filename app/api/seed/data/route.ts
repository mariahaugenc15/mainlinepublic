import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { rid } from "@/lib/ids";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== "seed-diagnosticos-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? "";
    const db = neon(url);
    const sql = (q: string, p: any[] = []) => db.query(q, p);

    // Clear tables that have data
    const tables = ["vendor_pricing","vendors","restock_requests","truck_stock","trucks","parts","job_outcomes","second_opinions","photo_analyses","diagnostic_sessions","jobs","diagnostic_nodes","diagnostic_trees","technical_bulletins","manufacturers","defect_codes","vision_defect_categories","equipment","customers","users"];
    for (const t of tables) await sql(`DELETE FROM ${t}`);

    // Users
    const hash = bcrypt.hashSync("password123", 8);
    await sql(`INSERT INTO users (id,email,password_hash,name,role,truck_id) VALUES ('tech_1','marcus@fieldco.demo',$1,'Marcus Reyes','TECH','truck_1')`, [hash]);
    await sql(`INSERT INTO users (id,email,password_hash,name,role,truck_id) VALUES ('tech_2','janelle@fieldco.demo',$1,'Janelle Strait','TECH','truck_2')`, [hash]);
    await sql(`INSERT INTO users (id,email,password_hash,name,role) VALUES ('admin_1','carla@fieldco.demo',$1,'Carla Bishop','ADMIN')`, [hash]);
    await sql(`INSERT INTO users (id,email,password_hash,name,role) VALUES ('admin_2','tom@fieldco.demo',$1,'Tom Halverson','ADMIN')`, [hash]);
    await sql(`INSERT INTO users (id,email,password_hash,name,role,credential,years_experience) VALUES ('rev_1','ellen.castro@reviewboard.demo',$1,'Dr. Ellen Castro','REVIEWER','Master Plumber, Gas Systems Certified',22)`, [hash]);
    await sql(`INSERT INTO users (id,email,password_hash,name,role,credential,years_experience) VALUES ('rev_2','walt.i@reviewboard.demo',$1,'Walt IIonzeh','REVIEWER','Master Plumber, NATE Certified',18)`, [hash]);

    // Trucks
    await sql(`INSERT INTO trucks (id,name) VALUES ('truck_1','Truck 1 — Marcus'),('truck_2','Truck 2 — Janelle')`);

    // Manufacturers
    await sql(`INSERT INTO manufacturers (id,name,description) VALUES ('mfg_heatcore','Heatcore','Gas and electric water heating systems.'),('mfg_aquaflow','Aquaflow','Fixtures, valves, and fill systems.'),('mfg_vantage','Vantage Plumbing Systems','Drainage, sump, and pressure equipment.'),('mfg_coreline','Coreline','Pipe, fittings, and supply line hardware.')`);

    // Defect codes — existing plumbing codes
    await sql(`INSERT INTO defect_codes (id,code,family,description,severity_grade) VALUES ('dc_4','ST-CO-4','Structural','Corrosion, surface loss, advanced',4),('dc_5','OM-DE-3','Operational-Maintenance','Deposits, encrustation, moderate restriction',3),('dc_7','OM-RT-4','Operational-Maintenance','Roots, tap, major restriction',4),('dc_8','OM-SC-1','Operational-Maintenance','Scale, light buildup',1),('dc_9','OM-OB-3','Operational-Maintenance','Obstruction, debris, moderate',3)`);

    // Sewer defect codes — sourced from Co-UDlabs/sewer_defects CCTV inspection taxonomy
    // Classes: ObsPlc, ObsDep, ObsRot, Jnt, Crk, DmgHol, DmgSev, Cor
    await sql(`INSERT INTO defect_codes (id,code,family,description,severity_grade) VALUES
      ('dc_obs_plc','OM-OB-PLС','Operational-Maintenance','ObsPlc: Placed/lodged obstruction — complete or near-complete bore restriction',4),
      ('dc_obs_dep','OM-DE-DEP','Operational-Maintenance','ObsDep: Deposited material — accumulated sediment or grease causing partial restriction',2),
      ('dc_obs_rot','OM-RT-ROT','Operational-Maintenance','ObsRot: Root intrusion — tree root mass penetrating pipe wall or joint',4),
      ('dc_jnt','ST-JN-JNT','Structural','Jnt: Joint defect — misaligned, open, or displaced pipe joint creating infiltration risk',2),
      ('dc_crk','ST-CR-CRK','Structural','Crk: Crack — longitudinal or circumferential fracture compromising structural integrity',3),
      ('dc_dmg_hol','ST-DH-HOL','Structural','DmgHol: Hole damage — penetrating wall loss, critical structural failure',5),
      ('dc_dmg_sev','ST-DS-SEV','Structural','DmgSev: Severe deformation — collapsed or buckled pipe, emergency excavation likely required',5),
      ('dc_cor_sw','ST-CO-COR','Structural','Cor: Corrosion — material degradation from chemical or biological attack in sewer environment',3)`);

    // Technical bulletins (key ones)
    await sql(`INSERT INTO technical_bulletins (id,bulletin_number,manufacturer_id,product_line,symptom,root_cause,recommended_fix,applicable_models,defect_code_id) VALUES
      ('bul_1','HC-TB-1042','mfg_heatcore','ProSeries Gas','Pilot extinguishes within 30-60 sec','Thermocouple voltage degradation','Replace thermocouple assembly','PS40-GAS, PS50-GAS','dc_4'),
      ('bul_2','HC-TB-1077','mfg_heatcore','ProSeries Gas','No ignition, igniter clicks','Gas control valve solenoid failure','Clean pilot orifice; replace gas control valve if needed','PS40-GAS, PS50-GAS, PS75-GAS',NULL),
      ('bul_3','HC-TB-1103','mfg_heatcore','ProSeries Gas','Yellow or orange burner flame','Incomplete combustion','Clean burner assembly and combustion air intake','All ProSeries Gas','dc_9'),
      ('bul_4','HC-TB-1156','mfg_heatcore','ProSeries Gas','Reduced hot water, popping noises','Sediment buildup on tank floor','Full tank flush; recommend replacement if 8+ years','PS40-GAS, PS50-GAS','dc_5'),
      ('bul_7','AF-TB-220','mfg_aquaflow','QuietFill Toilet','Toilet runs after fill','Fill valve diaphragm degradation','Replace fill valve cartridge','QF-200, QF-300',NULL),
      ('bul_8','AF-TB-235','mfg_aquaflow','QuietFill Toilet','Running water, flapper closes','Flapper chain or mineral buildup on flush valve seat','Adjust chain length; clean flush valve seat','QF-200, QF-300, QF-Comfort','dc_8'),
      ('bul_9','AF-TB-260','mfg_aquaflow','QuietFill Toilet','Phantom flush','Flapper seal hardened','Replace flapper with OEM silicone variant','All QuietFill',NULL),
      ('bul_10','VT-TB-310','mfg_vantage','DrainPro','Slow drain on same branch','Grease/soap buildup','Mechanical auger or hydro-jet branch line','Universal branch drain','dc_5'),
      ('bul_11','VT-TB-322','mfg_vantage','DrainPro','Single fixture backup, gurgling','Localized obstruction near fixture trap','Clear trap obstruction; inspect vent stack','Universal',NULL),
      ('bul_12','VT-TB-340','mfg_vantage','DrainPro','Recurring clog, roots visible','Root intrusion at pipe joint','Hydro-jet with root cutting head','Universal','dc_7'),
      ('bul_13','VT-TB-410','mfg_vantage','SumpGuard','Pump fails to activate','Float switch stuck','Free float arm; replace switch if binding persists','SG-1/3HP, SG-1/2HP',NULL),
      ('bul_14','VT-TB-425','mfg_vantage','SumpGuard','Pump short-cycles','Check valve failure','Replace check valve on discharge line','SG-1/3HP, SG-1/2HP, SG-3/4HP',NULL),
      ('bul_15','VT-TB-440','mfg_vantage','SumpGuard','Motor hums, no water','Impeller jammed','Disassemble and clear impeller housing','All SumpGuard',NULL),
      ('bul_16','CL-TB-510','mfg_coreline','FlexSupply','Low pressure at single fixture','Partially closed shutoff or kinked supply line','Verify valve full-open; replace supply line','FS-Braided, FS-PEX',NULL),
      ('bul_17','CL-TB-525','mfg_coreline','Whole-Home Pressure','Low pressure house-wide, gradual','Galvanized pipe interior scaling or PRV drift','Test pressure at hose bib; service or replace PRV','Universal','dc_8'),
      ('bul_18','CL-TB-540','mfg_coreline','Whole-Home Pressure','High pressure, hammer/noise','PRV failure','Install or replace PRV, set to 55-65 PSI','Universal',NULL),
      ('bul_19','HC-TB-1290','mfg_heatcore','ProSeries Gas','Intermittent flashing status light','Flame sensor signal interruption','Inspect flame sensor for soot; clean with fine abrasive','PS50-GAS, PS75-GAS',NULL),
      ('bul_20','AF-TB-280','mfg_aquaflow','QuietFill Toilet','Weak flush','Mineral scale blocking rim jets','Descale rim jets with wire pick and vinegar','QF-200, QF-300','dc_8'),
      ('bul_21','VT-TB-360','mfg_vantage','SewerLine','Root intrusion visible at joint, recurring backup','Biologic root penetration at clay-to-PVC transition joint','Hydro-jet with root cutting head; recommend CIPP liner if joint > 2in open','4in Sewer, Clay or VCP','dc_obs_rot'),
      ('bul_22','VT-TB-375','mfg_vantage','SewerLine','Pipe belly or sag, standing water at low point','Grade reversal from soil settlement','Excavate, re-grade, and replace affected run','4in-6in Gravity Sewer','dc_dmg_sev'),
      ('bul_23','VT-TB-390','mfg_vantage','SewerLine','Corrosion pitting on pipe invert, hydrogen sulfide odor','Biogenic sulfide corrosion — anaerobic bacterial activity on invert','Assess remaining wall thickness; spot-reline or full replacement based on severity','All Sewer Pipe Materials','dc_cor_sw')`);

    // Vision defect categories — plumbing fixture detection
    await sql(`INSERT INTO vision_defect_categories (id,name,description) VALUES
      ('vdc_1','Corrosion','Visible metal oxidation on fittings, tanks, or valve bodies'),
      ('vdc_2','Scaling / Mineral Deposits','White/chalky mineral buildup from hard water'),
      ('vdc_3','Cracking','Visible fracture lines in pipe, tank, or fixture material'),
      ('vdc_4','Leak Staining','Discoloration indicating historical or active moisture leak'),
      ('vdc_5','Root Intrusion','Root mass visible within pipe or at joint'),
      ('vdc_6','Sediment Buildup','Granular debris accumulation at tank floor or pipe invert'),
      ('vdc_7','Sensor Fouling','Soot or debris coating a flame or pressure sensor'),
      ('vdc_8','Active Drip','Visible water droplet formation indicating live leak')`);

    // Vision defect categories — sewer line CCTV inspection
    // Source: Co-UDlabs/sewer_defects (github.com/Co-UDlabs/sewer_defects)
    // 8 classes from YOLO v8 model trained on labeled CCTV sewer pipe imagery
    await sql(`INSERT INTO vision_defect_categories (id,name,description) VALUES
      ('vdc_cou_1','ObsPlc — Placed Obstruction','Solid mass placed or lodged in pipe bore; partial or complete flow blockage. Source: Co-UDlabs sewer_defects'),
      ('vdc_cou_2','ObsDep — Deposited Material','Accumulated sediment, grease, or debris on pipe invert; gradual restriction. Source: Co-UDlabs sewer_defects'),
      ('vdc_cou_3','ObsRot — Root Intrusion','Tree root mass penetrating pipe wall or joint; biologic infiltration. Source: Co-UDlabs sewer_defects'),
      ('vdc_cou_4','Jnt — Joint Defect','Misaligned, open, or displaced pipe joint; groundwater infiltration risk. Source: Co-UDlabs sewer_defects'),
      ('vdc_cou_5','Crk — Crack','Longitudinal or circumferential fracture in pipe wall; structural compromise. Source: Co-UDlabs sewer_defects'),
      ('vdc_cou_6','DmgHol — Hole Damage','Penetrating loss through pipe wall; critical structural failure. Source: Co-UDlabs sewer_defects'),
      ('vdc_cou_7','DmgSev — Severe Deformation','Collapsed, buckled, or heavily deformed pipe section; emergency condition. Source: Co-UDlabs sewer_defects'),
      ('vdc_cou_8','Cor — Corrosion (Sewer)','Material degradation from chemical or biological attack in sewer environment. Source: Co-UDlabs sewer_defects')`);

    // Parts
    await sql(`INSERT INTO parts (id,part_number,name,category,unit_cost,default_threshold) VALUES
      ('part_TC-UNIV-18','TC-UNIV-18','Universal Thermocouple, 18in','Water Heater',12.5,3),
      ('part_GCV-STD-40','GCV-STD-40','Gas Control Valve, Standard 40-Gal','Water Heater',84.0,1),
      ('part_FS-STD-01','FS-STD-01','Flame Sensor, Standard','Water Heater',18.75,2),
      ('part_FLUSH-KIT','FLUSH-KIT','Tank Flush Kit','Water Heater',9.0,4),
      ('part_DIP-TUBE-STD','DIP-TUBE-STD','Dip Tube, Standard','Water Heater',14.0,2),
      ('part_IGN-MOD-01','IGN-MOD-01','Ignition Control Module','Water Heater',96.0,1),
      ('part_BURNER-CLEAN-KIT','BURNER-CLEAN-KIT','Burner Cleaning Kit','Water Heater',22.0,2),
      ('part_WH-REPLACE-40','WH-REPLACE-40','Replacement 40-Gal Gas Water Heater','Water Heater',640.0,0),
      ('part_FLAP-UNIV-3IN','FLAP-UNIV-3IN','Universal Flapper, 3in','Toilet',7.25,5),
      ('part_FILLVALVE-UNIV','FILLVALVE-UNIV','Universal Fill Valve','Toilet',11.5,4),
      ('part_DESCALE-KIT','DESCALE-KIT','Toilet Descaling Kit','Toilet',8.0,3),
      ('part_TRAP-CLEAN-KIT','TRAP-CLEAN-KIT','Trap Cleaning Kit','Drain',10.0,2),
      ('part_P-TRAP-PVC-1.5','P-TRAP-PVC-1.5','P-Trap, PVC 1.5in','Drain',6.75,5),
      ('part_ENZYME-TREAT','ENZYME-TREAT','Enzymatic Drain Treatment','Drain',13.0,4),
      ('part_ROOT-CUT-HEAD','ROOT-CUT-HEAD','Hydro-Jet Root Cutting Head','Drain',0,1),
      ('part_SUPPLY-LINE-BRD-20','SUPPLY-LINE-BRD-20','Braided Supply Line, 20in','Supply',6.5,6),
      ('part_PRV-STD-75','PRV-STD-75','Pressure Reducing Valve, Standard','Supply',58.0,1),
      ('part_FLOAT-SW-UNIV','FLOAT-SW-UNIV','Universal Float Switch','Sump',24.0,2),
      ('part_CHECK-VALVE-1.5','CHECK-VALVE-1.5','Check Valve, 1.5in','Sump',16.0,3),
      ('part_SUMP-PUMP-13HP','SUMP-PUMP-13HP','Sump Pump, 1/3 HP','Sump',110.0,1),
      ('part_CIPP-LINER-4IN','CIPP-LINER-4IN','CIPP Liner, 4in Sewer','Sewer',285.0,0),
      ('part_JOINT-REPAIR-4IN','JOINT-REPAIR-4IN','Lateral Joint Repair Coupling, 4in','Sewer',48.0,1),
      ('part_HYDRO-JET-FLAT','HYDRO-JET-FLAT','Hydro-Jet Flat Nozzle, 4000 PSI','Sewer',0,1),
      ('part_SEWER-PLUG-4IN','SEWER-PLUG-4IN','Test Plug, 4in','Sewer',12.0,2)`);

    // Truck stock
    const stockParts = ['TC-UNIV-18','GCV-STD-40','FS-STD-01','FLUSH-KIT','FLAP-UNIV-3IN','FILLVALVE-UNIV','TRAP-CLEAN-KIT','P-TRAP-PVC-1.5','SUPPLY-LINE-BRD-20','FLOAT-SW-UNIV','CHECK-VALVE-1.5'];
    for (const partNum of stockParts) {
      await sql(`INSERT INTO truck_stock (id,truck_id,part_id,quantity,threshold) VALUES ($1,'truck_1',$2,4,2),($3,'truck_2',$4,4,2)`, [rid("stock"), `part_${partNum}`, rid("stock"), `part_${partNum}`]);
    }

    // Vendors
    await sql(`INSERT INTO vendors (id,name,contact_name,contact_email,lead_time_days) VALUES ('vendor_1','Continental Supply Co.','Order Desk','orders@continentalsupply.demo',2),('vendor_2','Ferro Trade Distributors','Maya Lin','maya.lin@ferrotrade.demo',4)`);

    // Diagnostic trees
    function r(id: string) { return id; }
    let nodeOrder = 0;
    async function insertNode(treeId: string, node: any, parentId: string | null, parentOption: string | null): Promise<void> {
      const nodeId = rid("node");
      nodeOrder++;
      await sql(
        `INSERT INTO diagnostic_nodes (id,tree_id,parent_node_id,parent_option_value,node_type,prompt_text,options_json,result_json,bulletin_id,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [nodeId, treeId, parentId, parentOption, node.type, node.prompt, node.options ? JSON.stringify(node.options) : null, node.result ? JSON.stringify(node.result) : null, node.bulletinId ?? null, nodeOrder]
      );
      for (const child of node.children ?? []) await insertNode(treeId, child.node, nodeId, child.optionValue);
    }

    // Gas water heater tree
    await sql(`INSERT INTO diagnostic_trees (id,name,equipment_type,description) VALUES ('tree_gwh','Gas Water Heater — No Hot Water','Gas Water Heater','Branching diagnostic for gas water heater complaints')`);
    await insertNode("tree_gwh", {
      type: "question", prompt: "What's the customer reporting?",
      options: [{value:"no_hot_water",label:"No hot water at all"},{value:"lukewarm",label:"Lukewarm / reduced hot water"},{value:"leaking",label:"Visible water leak at unit"}],
      children: [
        {optionValue:"no_hot_water",node:{type:"question",prompt:"Is the pilot light lit?",options:[{value:"lit",label:"Pilot is lit"},{value:"not_lit",label:"Pilot is out"},{value:"no_pilot",label:"No visible pilot (electronic ignition)"}],children:[
          {optionValue:"not_lit",node:{type:"question",prompt:"Attempt to relight. What happens?",options:[{value:"relights_then_dies",label:"Lights, then dies within ~30-60 sec"},{value:"wont_light",label:"Won't light at all"},{value:"relights_holds",label:"Lights and holds"}],children:[
            {optionValue:"relights_then_dies",node:{type:"result",prompt:"",bulletinId:"bul_1",result:{primaryDiagnosis:"Thermocouple failure",confidence:88,secondaryDiagnoses:[{name:"Loose thermocouple connection",confidence:9}],parts:[{partNumber:"TC-UNIV-18",name:"Universal Thermocouple, 18in",qty:1}],estRepairTimeMinutes:30,safetyCritical:false,bulletinId:"bul_1"}}},
            {optionValue:"wont_light",node:{type:"result",prompt:"",bulletinId:"bul_2",result:{primaryDiagnosis:"Pilot orifice fouled / gas control valve fault",confidence:61,secondaryDiagnoses:[{name:"Thermocouple failure",confidence:22}],parts:[{partNumber:"GCV-STD-40",name:"Gas Control Valve, Standard 40-Gal",qty:1}],estRepairTimeMinutes:75,safetyCritical:true,bulletinId:"bul_2"}}},
            {optionValue:"relights_holds",node:{type:"result",prompt:"",bulletinId:"bul_19",result:{primaryDiagnosis:"Flame sensor fouling triggering lockout",confidence:70,secondaryDiagnoses:[{name:"Vent termination blockage",confidence:18}],parts:[{partNumber:"FS-STD-01",name:"Flame Sensor, Standard",qty:1}],estRepairTimeMinutes:45,safetyCritical:true,bulletinId:"bul_19"}}},
          ]}},
          {optionValue:"lit",node:{type:"question",prompt:"What color is the burner flame?",options:[{value:"blue_steady",label:"Steady blue"},{value:"yellow_orange",label:"Yellow or orange"}],children:[
            {optionValue:"yellow_orange",node:{type:"result",prompt:"",bulletinId:"bul_3",result:{primaryDiagnosis:"Incomplete combustion — burner/venting obstruction (CO risk)",confidence:74,secondaryDiagnoses:[{name:"Low combustion air supply",confidence:20}],parts:[{partNumber:"BURNER-CLEAN-KIT",name:"Burner Cleaning Kit",qty:1}],estRepairTimeMinutes:50,safetyCritical:true,bulletinId:"bul_3"}}},
            {optionValue:"blue_steady",node:{type:"result",prompt:"",bulletinId:"bul_4",result:{primaryDiagnosis:"Sediment buildup reducing heat transfer",confidence:63,secondaryDiagnoses:[{name:"Dip tube failure",confidence:21}],parts:[{partNumber:"FLUSH-KIT",name:"Tank Flush Kit",qty:1}],estRepairTimeMinutes:60,safetyCritical:false,bulletinId:"bul_4"}}},
          ]}},
          {optionValue:"no_pilot",node:{type:"result",prompt:"",result:{primaryDiagnosis:"Ignition control module failure",confidence:55,secondaryDiagnoses:[{name:"Loose wiring at control module",confidence:26}],parts:[{partNumber:"IGN-MOD-01",name:"Ignition Control Module",qty:1}],estRepairTimeMinutes:90,safetyCritical:true}}},
        ]}},
        {optionValue:"lukewarm",node:{type:"result",prompt:"",bulletinId:"bul_4",result:{primaryDiagnosis:"Sediment buildup or partial insulation",confidence:52,secondaryDiagnoses:[{name:"Mixed valve set too low",confidence:28}],parts:[{partNumber:"FLUSH-KIT",name:"Tank Flush Kit",qty:1}],estRepairTimeMinutes:60,safetyCritical:false,bulletinId:"bul_4"}}},
        {optionValue:"leaking",node:{type:"result",prompt:"",result:{primaryDiagnosis:"Tank wall corrosion/perforation — replacement required",confidence:91,secondaryDiagnoses:[{name:"T&P valve discharge",confidence:6}],parts:[{partNumber:"WH-REPLACE-40",name:"Replacement 40-Gal Gas Water Heater",qty:1}],estRepairTimeMinutes:180,safetyCritical:true}}},
      ]
    }, null, null);

    // Toilet tree
    await sql(`INSERT INTO diagnostic_trees (id,name,equipment_type,description) VALUES ('tree_toilet','Toilet Running','Toilet','Branching diagnostic for running toilets')`);
    await insertNode("tree_toilet", {
      type:"question",prompt:"What's the toilet doing?",options:[{value:"continuous",label:"Runs continuously"},{value:"intermittent",label:"Runs intermittently / phantom flush"},{value:"weak_flush",label:"Weak or incomplete flush"}],
      children:[
        {optionValue:"continuous",node:{type:"question",prompt:"Does the flapper close fully after flush?",options:[{value:"closes_fully",label:"Yes, closes fully"},{value:"not_fully",label:"No, stays slightly open"}],children:[
          {optionValue:"not_fully",node:{type:"result",prompt:"",bulletinId:"bul_8",result:{primaryDiagnosis:"Flapper chain misadjusted or seat scaled",confidence:80,secondaryDiagnoses:[{name:"Warped flapper",confidence:14}],parts:[{partNumber:"FLAP-UNIV-3IN",name:"Universal Flapper, 3in",qty:1}],estRepairTimeMinutes:20,safetyCritical:false,bulletinId:"bul_8"}}},
          {optionValue:"closes_fully",node:{type:"result",prompt:"",bulletinId:"bul_7",result:{primaryDiagnosis:"Fill valve diaphragm seeping past seal",confidence:73,secondaryDiagnoses:[{name:"Overflow tube set too low",confidence:18}],parts:[{partNumber:"FILLVALVE-UNIV",name:"Universal Fill Valve",qty:1}],estRepairTimeMinutes:25,safetyCritical:false,bulletinId:"bul_7"}}},
        ]}},
        {optionValue:"intermittent",node:{type:"result",prompt:"",bulletinId:"bul_9",result:{primaryDiagnosis:"Phantom flush — flapper seal hardened",confidence:69,secondaryDiagnoses:[{name:"Fill valve micro-leak",confidence:24}],parts:[{partNumber:"FLAP-UNIV-3IN",name:"Universal Flapper, 3in",qty:1}],estRepairTimeMinutes:20,safetyCritical:false,bulletinId:"bul_9"}}},
        {optionValue:"weak_flush",node:{type:"result",prompt:"",result:{primaryDiagnosis:"Mineral scale blocking rim jets",confidence:64,secondaryDiagnoses:[{name:"Low tank water level",confidence:22}],parts:[{partNumber:"DESCALE-KIT",name:"Toilet Descaling Kit",qty:1}],estRepairTimeMinutes:30,safetyCritical:false}}},
      ]
    }, null, null);

    // Drain tree
    await sql(`INSERT INTO diagnostic_trees (id,name,equipment_type,description) VALUES ('tree_drain','Drain Clog','Drain Line','Branching diagnostic for drain obstructions')`);
    await insertNode("tree_drain", {
      type:"question",prompt:"How many fixtures are affected?",options:[{value:"single",label:"Single fixture"},{value:"multiple",label:"Multiple fixtures on same line"},{value:"whole_house",label:"Whole house / main line"}],
      children:[
        {optionValue:"single",node:{type:"result",prompt:"",result:{primaryDiagnosis:"Local trap/branch clog, hair or debris buildup",confidence:79,secondaryDiagnoses:[{name:"P-trap corrosion",confidence:12}],parts:[{partNumber:"P-TRAP-PVC-1.5",name:"P-Trap, PVC 1.5in",qty:1}],estRepairTimeMinutes:30,safetyCritical:false}}},
        {optionValue:"multiple",node:{type:"result",prompt:"",bulletinId:"bul_10",result:{primaryDiagnosis:"Grease/soap buildup in shared branch line",confidence:71,secondaryDiagnoses:[{name:"Root intrusion at branch joint",confidence:19}],parts:[{partNumber:"ENZYME-TREAT",name:"Enzymatic Drain Treatment",qty:2}],estRepairTimeMinutes:60,safetyCritical:false,bulletinId:"bul_10"}}},
        {optionValue:"whole_house",node:{type:"result",prompt:"",bulletinId:"bul_12",result:{primaryDiagnosis:"Main line obstruction — debris or root intrusion",confidence:64,secondaryDiagnoses:[{name:"Pipe bellying",confidence:18}],parts:[{partNumber:"ROOT-CUT-HEAD",name:"Hydro-Jet Root Cutting Head",qty:1}],estRepairTimeMinutes:90,safetyCritical:false,bulletinId:"bul_12"}}},
      ]
    }, null, null);

    // Sewer line inspection tree — Co-UDlabs/sewer_defects taxonomy
    // Photo-first flow: tech captures CCTV or phone photo at cleanout, then branches by defect class
    await sql(`INSERT INTO diagnostic_trees (id,name,equipment_type,description) VALUES ('tree_sewer','Sewer Line Inspection','Sewer Line','Photo-first diagnostic using Co-UDlabs sewer defect taxonomy (ObsPlc, ObsDep, ObsRot, Jnt, Crk, DmgHol, DmgSev, Cor)')`);
    await insertNode("tree_sewer", {
      type:"photo", prompt:"Capture a photo or video at the cleanout access point. HauGen will match it against the sewer defect database.",
      children:[
        {optionValue:"_continue",node:{
          type:"question",prompt:"What does the visual inspection confirm?",
          options:[
            {value:"deposits",label:"Deposits / grease / sediment buildup (ObsDep)"},
            {value:"roots",label:"Root intrusion at joint or wall (ObsRot)"},
            {value:"blockage",label:"Placed or lodged obstruction, complete block (ObsPlc)"},
            {value:"joint",label:"Joint offset, open gap, or displacement (Jnt)"},
            {value:"crack",label:"Crack — longitudinal or circumferential (Crk)"},
            {value:"collapse",label:"Hole, severe deformation, or collapse (DmgSev/DmgHol)"},
            {value:"corrosion",label:"Corrosion pitting or surface degradation (Cor)"},
          ],
          children:[
            {optionValue:"deposits",node:{type:"result",prompt:"",bulletinId:"bul_10",result:{primaryDiagnosis:"ObsDep — Deposited material causing restriction",confidence:77,secondaryDiagnoses:[{name:"ObsPlc — Lodged solid obstruction",confidence:14}],parts:[{partNumber:"HYDRO-JET-FLAT",name:"Hydro-Jet Flat Nozzle, 4000 PSI",qty:1},{partNumber:"ENZYME-TREAT",name:"Enzymatic Drain Treatment",qty:2}],estRepairTimeMinutes:60,safetyCritical:false}}},
            {optionValue:"roots",node:{type:"result",prompt:"",bulletinId:"bul_21",result:{primaryDiagnosis:"ObsRot — Root intrusion at pipe joint or wall breach",confidence:85,secondaryDiagnoses:[{name:"Jnt — Joint displacement from root pressure",confidence:11}],parts:[{partNumber:"ROOT-CUT-HEAD",name:"Hydro-Jet Root Cutting Head",qty:1},{partNumber:"CIPP-LINER-4IN",name:"CIPP Liner, 4in Sewer",qty:1}],estRepairTimeMinutes:120,safetyCritical:false}}},
            {optionValue:"blockage",node:{type:"result",prompt:"",bulletinId:"bul_10",result:{primaryDiagnosis:"ObsPlc — Placed or lodged obstruction, bore fully restricted",confidence:91,secondaryDiagnoses:[{name:"ObsDep — Heavy deposit pack",confidence:7}],parts:[{partNumber:"HYDRO-JET-FLAT",name:"Hydro-Jet Flat Nozzle, 4000 PSI",qty:1},{partNumber:"ROOT-CUT-HEAD",name:"Hydro-Jet Root Cutting Head",qty:1}],estRepairTimeMinutes:90,safetyCritical:false}}},
            {optionValue:"joint",node:{type:"result",prompt:"",bulletinId:"bul_21",result:{primaryDiagnosis:"Jnt — Joint offset or open displacement, infiltration risk",confidence:72,secondaryDiagnoses:[{name:"Crk — Joint-area cracking",confidence:16}],parts:[{partNumber:"JOINT-REPAIR-4IN",name:"Lateral Joint Repair Coupling, 4in",qty:1}],estRepairTimeMinutes:90,safetyCritical:false}}},
            {optionValue:"crack",node:{type:"result",prompt:"",result:{primaryDiagnosis:"Crk — Structural crack, pipe integrity compromised",confidence:68,secondaryDiagnoses:[{name:"DmgHol — Crack progressing to hole",confidence:19}],parts:[{partNumber:"CIPP-LINER-4IN",name:"CIPP Liner, 4in Sewer",qty:1},{partNumber:"SEWER-PLUG-4IN",name:"Test Plug, 4in",qty:2}],estRepairTimeMinutes:150,safetyCritical:false}}},
            {optionValue:"collapse",node:{type:"result",prompt:"",bulletinId:"bul_22",result:{primaryDiagnosis:"DmgSev — Severe deformation or collapse, emergency excavation likely",confidence:88,secondaryDiagnoses:[{name:"DmgHol — Wall perforation adjacent to collapse",confidence:9}],parts:[{partNumber:"SEWER-PLUG-4IN",name:"Test Plug, 4in",qty:2}],estRepairTimeMinutes:240,safetyCritical:true}}},
            {optionValue:"corrosion",node:{type:"result",prompt:"",bulletinId:"bul_23",result:{primaryDiagnosis:"Cor — Biogenic corrosion, pipe wall thinning on invert",confidence:74,secondaryDiagnoses:[{name:"Crk — Crack developing at corroded zone",confidence:17}],parts:[{partNumber:"CIPP-LINER-4IN",name:"CIPP Liner, 4in Sewer",qty:1}],estRepairTimeMinutes:180,safetyCritical:false}}},
          ]
        }}
      ]
    }, null, null);

    // Sump pump tree
    await sql(`INSERT INTO diagnostic_trees (id,name,equipment_type,description) VALUES ('tree_sump','Sump Pump Failure','Sump Pump','Branching diagnostic for sump pump failures')`);
    await insertNode("tree_sump", {
      type:"question",prompt:"What's the sump pump doing?",options:[{value:"not_activating",label:"Not activating at high water"},{value:"short_cycling",label:"Runs continuously / short-cycles"},{value:"humming_no_pump",label:"Motor hums, no water moved"}],
      children:[
        {optionValue:"not_activating",node:{type:"result",prompt:"",bulletinId:"bul_13",result:{primaryDiagnosis:"Float switch mechanically stuck",confidence:85,secondaryDiagnoses:[{name:"Basin too narrow for float",confidence:10}],parts:[{partNumber:"FLOAT-SW-UNIV",name:"Universal Float Switch",qty:1}],estRepairTimeMinutes:30,safetyCritical:false,bulletinId:"bul_13"}}},
        {optionValue:"short_cycling",node:{type:"result",prompt:"",bulletinId:"bul_14",result:{primaryDiagnosis:"Check valve failure allowing backflow into basin",confidence:72,secondaryDiagnoses:[{name:"Undersized basin",confidence:19}],parts:[{partNumber:"CHECK-VALVE-1.5",name:"Check Valve, 1.5in",qty:1}],estRepairTimeMinutes:40,safetyCritical:false,bulletinId:"bul_14"}}},
        {optionValue:"humming_no_pump",node:{type:"result",prompt:"",bulletinId:"bul_15",result:{primaryDiagnosis:"Impeller jammed with debris, or motor bearing seizure",confidence:68,secondaryDiagnoses:[{name:"Capacitor failure",confidence:20}],parts:[{partNumber:"SUMP-PUMP-13HP",name:"Sump Pump, 1/3 HP",qty:1}],estRepairTimeMinutes:50,safetyCritical:false,bulletinId:"bul_15"}}},
      ]
    }, null, null);

    // Water pressure tree
    await sql(`INSERT INTO diagnostic_trees (id,name,equipment_type,description) VALUES ('tree_pressure','Water Pressure Issues','Water Supply System','Branching diagnostic for water pressure complaints')`);
    await insertNode("tree_pressure", {
      type:"question",prompt:"Where is the pressure issue occurring?",options:[{value:"single_fixture",label:"Single fixture only"},{value:"whole_house",label:"Whole house"}],
      children:[
        {optionValue:"single_fixture",node:{type:"result",prompt:"",bulletinId:"bul_16",result:{primaryDiagnosis:"Partially closed shutoff or collapsed flexible supply line",confidence:76,secondaryDiagnoses:[{name:"Clogged aerator/cartridge",confidence:18}],parts:[{partNumber:"SUPPLY-LINE-BRD-20",name:"Braided Supply Line, 20in",qty:1}],estRepairTimeMinutes:20,safetyCritical:false,bulletinId:"bul_16"}}},
        {optionValue:"whole_house",node:{type:"result",prompt:"",bulletinId:"bul_17",result:{primaryDiagnosis:"PRV failure or interior pipe scaling",confidence:66,secondaryDiagnoses:[{name:"Main shutoff partially closed",confidence:20}],parts:[{partNumber:"PRV-STD-75",name:"Pressure Reducing Valve, Standard",qty:1}],estRepairTimeMinutes:90,safetyCritical:false,bulletinId:"bul_17"}}},
      ]
    }, null, null);

    // ── Rich demo dataset ────────────────────────────────────────────────────
    const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

    // Customers
    await sql(`INSERT INTO customers (id,name,address,phone,lead_source) VALUES
      ('cust_01','James Smith','123 Maple St, Springvale, OH','(614) 555-0101','Google'),
      ('cust_02','Linda Johnson','456 Oak Ave, Springvale, OH','(614) 555-0202','Referral'),
      ('cust_03','Robert Chen','789 Pine Rd, Glendale, OH','(614) 555-0303','Yelp'),
      ('cust_04','Maria Garcia','321 Elm St, Riverside, OH','(614) 555-0404','Google'),
      ('cust_05','David Kim','654 Birch Ln, Eastbrook, OH','(614) 555-0505','Referral'),
      ('cust_06','Sarah Williams','987 Cedar Dr, Westfield, OH','(614) 555-0606','Angi'),
      ('cust_07','Michael Brown','246 Walnut Ave, Northgate, OH','(614) 555-0707','Google'),
      ('cust_08','Jennifer Davis','135 Spruce St, Lakewood, OH','(614) 555-0808','Referral'),
      ('cust_09','Thomas Wilson','802 Ash Blvd, Hillcrest, OH','(614) 555-0909','Yelp'),
      ('cust_10','Patricia Moore','419 Oak Park Rd, Fairview, OH','(614) 555-1010','Google'),
      ('cust_11','Christopher Taylor','73 Meadow Ln, Sycamore, OH','(614) 555-1111','Referral'),
      ('cust_12','Jessica Anderson','560 Riverside Dr, Clayton, OH','(614) 555-1212','Angi')`);

    // Completed jobs — 20 across all 5 trees
    type JobRow = [string,string,string,string,string,string,string];
    const completedJobs: JobRow[] = [
      // Gas Water Heater — 5 jobs
      ['job_h01','cust_01','tech_1','Gas Water Heater Service',daysAgo(55),'completed',daysAgo(55)],
      ['job_h02','cust_02','tech_2','Gas Water Heater Service',daysAgo(45),'completed',daysAgo(45)],
      ['job_h03','cust_03','tech_1','Water Heater Inspection',daysAgo(38),'completed',daysAgo(38)],
      ['job_h04','cust_04','tech_2','Gas Water Heater Service',daysAgo(27),'completed',daysAgo(27)],
      ['job_h05','cust_05','tech_1','Water Heater No Hot Water',daysAgo(14),'completed',daysAgo(14)],
      // Toilet — 5 jobs
      ['job_t01','cust_06','tech_2','Toilet Repair',daysAgo(50),'completed',daysAgo(50)],
      ['job_t02','cust_07','tech_1','Running Toilet',daysAgo(41),'completed',daysAgo(41)],
      ['job_t03','cust_08','tech_2','Toilet Service',daysAgo(33),'completed',daysAgo(33)],
      ['job_t04','cust_09','tech_1','Toilet Phantom Flush',daysAgo(22),'completed',daysAgo(22)],
      ['job_t05','cust_10','tech_2','Running Toilet',daysAgo(9),'completed',daysAgo(9)],
      // Drain — 4 jobs
      ['job_d01','cust_11','tech_1','Drain Clog',daysAgo(47),'completed',daysAgo(47)],
      ['job_d02','cust_12','tech_2','Slow Drain',daysAgo(36),'completed',daysAgo(36)],
      ['job_d03','cust_01','tech_1','Drain Backup',daysAgo(25),'completed',daysAgo(25)],
      ['job_d04','cust_02','tech_2','Drain Clog',daysAgo(12),'completed',daysAgo(12)],
      // Sump Pump — 3 jobs
      ['job_s01','cust_03','tech_1','Sump Pump Failure',daysAgo(52),'completed',daysAgo(52)],
      ['job_s02','cust_04','tech_2','Sump Pump Not Working',daysAgo(31),'completed',daysAgo(31)],
      ['job_s03','cust_05','tech_1','Sump Pump Service',daysAgo(18),'completed',daysAgo(18)],
      // Water Pressure — 3 jobs
      ['job_p01','cust_06','tech_2','Low Water Pressure',daysAgo(43),'completed',daysAgo(43)],
      ['job_p02','cust_07','tech_1','Water Pressure Issues',daysAgo(29),'completed',daysAgo(29)],
      ['job_p03','cust_08','tech_2','Whole-House Low Pressure',daysAgo(7),'completed',daysAgo(7)],
    ];
    for (const [id,cid,tid,jtype,sat,status,cat] of completedJobs) {
      await sql(`INSERT INTO jobs (id,customer_id,tech_id,job_type,scheduled_at,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id,cid,tid,jtype,sat,status,cat]);
    }

    // Diagnostic sessions (completed)
    // [id, job_id, tree_id, tech_id, started, completed, diagnosis, confidence, safety_critical, est_minutes, path]
    type SessionRow = [string,string,string,string,string,string,string,number,number,number,string];
    const sessions: SessionRow[] = [
      // Gas WH
      ['ses_h01','job_h01','tree_gwh','tech_1',daysAgo(55),daysAgo(55),'Thermocouple / pilot assembly failure',88,0,45,'[]'],
      ['ses_h02','job_h02','tree_gwh','tech_2',daysAgo(45),daysAgo(45),'Thermocouple / pilot assembly failure',85,0,45,'[]'],
      ['ses_h03','job_h03','tree_gwh','tech_1',daysAgo(38),daysAgo(38),'Dip tube collapse — cold-water short-circuit',72,0,60,'[]'],
      ['ses_h04','job_h04','tree_gwh','tech_2',daysAgo(27),daysAgo(27),'Anode rod fully depleted, tank corrosion',65,0,90,'[]'],
      ['ses_h05','job_h05','tree_gwh','tech_1',daysAgo(14),daysAgo(14),'Gas valve internal failure',58,1,120,'[]'],
      // Toilet
      ['ses_t01','job_t01','tree_toilet','tech_2',daysAgo(50),daysAgo(50),'Flapper chain misadjusted or seat scaled',80,0,20,'[]'],
      ['ses_t02','job_t02','tree_toilet','tech_1',daysAgo(41),daysAgo(41),'Fill valve diaphragm seeping past seal',73,0,25,'[]'],
      ['ses_t03','job_t03','tree_toilet','tech_2',daysAgo(33),daysAgo(33),'Phantom flush — flapper seal hardened',69,0,20,'[]'],
      ['ses_t04','job_t04','tree_toilet','tech_1',daysAgo(22),daysAgo(22),'Mineral scale blocking rim jets',64,0,30,'[]'],
      ['ses_t05','job_t05','tree_toilet','tech_2',daysAgo(9),daysAgo(9),'Fill valve diaphragm seeping past seal',73,0,25,'[]'],
      // Drain
      ['ses_d01','job_d01','tree_drain','tech_1',daysAgo(47),daysAgo(47),'Local trap/branch clog, hair or debris buildup',79,0,30,'[]'],
      ['ses_d02','job_d02','tree_drain','tech_2',daysAgo(36),daysAgo(36),'Grease/soap buildup in shared branch line',71,0,60,'[]'],
      ['ses_d03','job_d03','tree_drain','tech_1',daysAgo(25),daysAgo(25),'Main line obstruction — debris or root intrusion',64,0,90,'[]'],
      ['ses_d04','job_d04','tree_drain','tech_2',daysAgo(12),daysAgo(12),'Local trap/branch clog, hair or debris buildup',79,0,30,'[]'],
      // Sump
      ['ses_s01','job_s01','tree_sump','tech_1',daysAgo(52),daysAgo(52),'Float switch mechanically stuck',85,0,30,'[]'],
      ['ses_s02','job_s02','tree_sump','tech_2',daysAgo(31),daysAgo(31),'Check valve failure allowing backflow into basin',72,0,40,'[]'],
      ['ses_s03','job_s03','tree_sump','tech_1',daysAgo(18),daysAgo(18),'Impeller jammed with debris, or motor bearing seizure',68,0,50,'[]'],
      // Pressure
      ['ses_p01','job_p01','tree_pressure','tech_2',daysAgo(43),daysAgo(43),'Partially closed shutoff or collapsed flexible supply line',76,0,20,'[]'],
      ['ses_p02','job_p02','tree_pressure','tech_1',daysAgo(29),daysAgo(29),'PRV failure or interior pipe scaling',66,0,90,'[]'],
      ['ses_p03','job_p03','tree_pressure','tech_2',daysAgo(7),daysAgo(7),'Partially closed shutoff or collapsed flexible supply line',76,0,20,'[]'],
    ];
    for (const [id,job_id,tree_id,tech_id,started,completed,diag,conf,sc,est_min,path] of sessions) {
      await sql(
        `INSERT INTO diagnostic_sessions (id,job_id,tree_id,tech_id,started_at,completed_at,path_json,primary_diagnosis,confidence,safety_critical,est_repair_time_minutes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'completed')`,
        [id,job_id,tree_id,tech_id,started,completed,path,diag,conf,sc,est_min]
      );
    }

    // Job outcomes
    type OutcomeRow = [string,string,string,string,string,number];
    const outcomes: OutcomeRow[] = [
      ['out_h01','job_h01','ses_h01','tech_1','Thermocouple / pilot assembly failure',1],
      ['out_h02','job_h02','ses_h02','tech_2','Thermocouple / pilot assembly failure',1],
      ['out_h03','job_h03','ses_h03','tech_1','Dip tube collapse — cold-water short-circuit',1],
      ['out_h04','job_h04','ses_h04','tech_2','Scale buildup on heating element',0],
      ['out_h05','job_h05','ses_h05','tech_1','Thermocouple failure — gas valve intact',0],
      ['out_t01','job_t01','ses_t01','tech_2','Flapper chain misadjusted or seat scaled',1],
      ['out_t02','job_t02','ses_t02','tech_1','Fill valve diaphragm seeping past seal',1],
      ['out_t03','job_t03','ses_t03','tech_2','Phantom flush — flapper seal hardened',1],
      ['out_t04','job_t04','ses_t04','tech_1','Low tank water level — float set too low',0],
      ['out_t05','job_t05','ses_t05','tech_2','Fill valve diaphragm seeping past seal',1],
      ['out_d01','job_d01','ses_d01','tech_1','Local trap/branch clog, hair or debris buildup',1],
      ['out_d02','job_d02','ses_d02','tech_2','Grease/soap buildup in shared branch line',1],
      ['out_d03','job_d03','ses_d03','tech_1','Pipe bellying — sag retaining standing water',0],
      ['out_d04','job_d04','ses_d04','tech_2','Local trap/branch clog, hair or debris buildup',1],
      ['out_s01','job_s01','ses_s01','tech_1','Float switch mechanically stuck',1],
      ['out_s02','job_s02','ses_s02','tech_2','Check valve failure allowing backflow into basin',1],
      ['out_s03','job_s03','ses_s03','tech_1','Capacitor failure — motor intact',0],
      ['out_p01','job_p01','ses_p01','tech_2','Partially closed shutoff or collapsed flexible supply line',1],
      ['out_p02','job_p02','ses_p02','tech_1','PRV failure or interior pipe scaling',1],
      ['out_p03','job_p03','ses_p03','tech_2','Clogged aerator — single fixture only',0],
    ];
    for (const [id,job_id,ses_id,tech_id,actual,matched] of outcomes) {
      await sql(
        `INSERT INTO job_outcomes (id,job_id,session_id,tech_id,actual_diagnosis,matched,closed_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id,job_id,ses_id,tech_id,actual,matched,daysAgo(0)]
      );
    }

    // Second opinions on 2 sessions
    await sql(`INSERT INTO second_opinions (id,session_id,reviewer_id,requested_at,responded_at,status,reviewer_notes,redirected_diagnosis) VALUES
      ('so_01','ses_h04','rev_1',$1,$2,'resolved','Concur with scale buildup — anode depletion was secondary. Recommend full flush before replacement.','Scale buildup on heating element')`,
      [daysAgo(27), daysAgo(26)]);
    await sql(`INSERT INTO second_opinions (id,session_id,reviewer_id,requested_at,status) VALUES
      ('so_02','ses_s03','rev_2',$1,'pending')`, [daysAgo(18)]);

    // Deplete some truck stock to trigger low-stock alerts and restock requests
    await sql(`UPDATE truck_stock SET quantity=1 WHERE truck_id='truck_1' AND part_id IN (SELECT id FROM parts WHERE part_number IN ('TC-UNIV-18','GCV-STD-40'))`);
    await sql(`UPDATE truck_stock SET quantity=0 WHERE truck_id='truck_2' AND part_id IN (SELECT id FROM parts WHERE part_number='FLAP-UNIV-3IN')`);
    await sql(`UPDATE truck_stock SET quantity=1 WHERE truck_id='truck_2' AND part_id IN (SELECT id FROM parts WHERE part_number='FLOAT-SW-UNIV')`);

    // Restock requests from techs
    await sql(`INSERT INTO restock_requests (id,truck_id,part_id,requested_by,requested_at,status) VALUES
      ('rst_01','truck_1',(SELECT id FROM parts WHERE part_number='TC-UNIV-18'),'tech_1',$1,'pending')`, [daysAgo(3)]);
    await sql(`INSERT INTO restock_requests (id,truck_id,part_id,requested_by,requested_at,status) VALUES
      ('rst_02','truck_2',(SELECT id FROM parts WHERE part_number='FLAP-UNIV-3IN'),'tech_2',$1,'pending')`, [daysAgo(1)]);

    // 2 open (scheduled) jobs for the intake queue
    const today = new Date().toISOString();
    await sql(`INSERT INTO jobs (id,customer_id,tech_id,job_type,notes,scheduled_at,status,source,created_at) VALUES ($1,'cust_11',NULL,'Gas Water Heater Service','No hot water since yesterday morning',$2,'scheduled','phone',$2)`,
      [rid("job"), today]);
    await sql(`INSERT INTO jobs (id,customer_id,tech_id,job_type,notes,scheduled_at,status,source,created_at) VALUES ($1,'cust_12',NULL,'Drain Backup','Kitchen sink and adjacent bathroom draining very slow',$2,'scheduled','web',$2)`,
      [rid("job"), today]);

    return NextResponse.json({ ok: true, step: "data", message: "Seed data inserted. You can now log in." });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
