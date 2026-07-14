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
    const sql = (q: string, p: any[] = []) => (neon(url) as any)(q, p);

    // Clear tables that have data
    const tables = ["vendor_pricing","vendors","truck_stock","trucks","parts","job_outcomes","second_opinions","photo_analyses","diagnostic_sessions","jobs","diagnostic_nodes","diagnostic_trees","technical_bulletins","manufacturers","defect_codes","vision_defect_categories","equipment","customers","users"];
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

    // Defect codes (batch)
    await sql(`INSERT INTO defect_codes (id,code,family,description,severity_grade) VALUES ('dc_4','ST-CO-4','Structural','Corrosion, surface loss, advanced',4),('dc_5','OM-DE-3','Operational-Maintenance','Deposits, encrustation, moderate restriction',3),('dc_7','OM-RT-4','Operational-Maintenance','Roots, tap, major restriction',4),('dc_8','OM-SC-1','Operational-Maintenance','Scale, light buildup',1),('dc_9','OM-OB-3','Operational-Maintenance','Obstruction, debris, moderate',3)`);

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
      ('bul_20','AF-TB-280','mfg_aquaflow','QuietFill Toilet','Weak flush','Mineral scale blocking rim jets','Descale rim jets with wire pick and vinegar','QF-200, QF-300','dc_8')`);

    // Vision defect categories
    await sql(`INSERT INTO vision_defect_categories (id,name,description) VALUES
      ('vdc_1','Corrosion','Visible metal oxidation on fittings, tanks, or valve bodies'),
      ('vdc_2','Scaling / Mineral Deposits','White/chalky mineral buildup from hard water'),
      ('vdc_3','Cracking','Visible fracture lines in pipe, tank, or fixture material'),
      ('vdc_4','Leak Staining','Discoloration indicating historical or active moisture leak'),
      ('vdc_5','Root Intrusion','Root mass visible within pipe or at joint'),
      ('vdc_6','Sediment Buildup','Granular debris accumulation at tank floor or pipe invert'),
      ('vdc_7','Sensor Fouling','Soot or debris coating a flame or pressure sensor'),
      ('vdc_8','Active Drip','Visible water droplet formation indicating live leak')`);

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
      ('part_SUMP-PUMP-13HP','SUMP-PUMP-13HP','Sump Pump, 1/3 HP','Sump',110.0,1)`);

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

    // A few demo jobs
    const today = new Date().toISOString();
    const cid = rid("cust");
    await sql(`INSERT INTO customers (id,name,address,phone) VALUES ($1,'James Smith','123 Maple St, Springvale, OH','(614) 555-0101')`, [cid]);
    await sql(`INSERT INTO jobs (id,customer_id,tech_id,job_type,scheduled_at,status,created_at) VALUES ($1,$2,'tech_1','Gas Water Heater Service',$3,'scheduled',$3)`, [rid("job"), cid, today]);
    const cid2 = rid("cust");
    await sql(`INSERT INTO customers (id,name,address,phone) VALUES ($1,'Linda Johnson','456 Oak Ave, Springvale, OH','(614) 555-0202')`, [cid2]);
    await sql(`INSERT INTO jobs (id,customer_id,tech_id,job_type,scheduled_at,status,created_at) VALUES ($1,$2,'tech_1','Toilet Repair',$3,'scheduled',$3)`, [rid("job"), cid2, today]);

    return NextResponse.json({ ok: true, step: "data", message: "Seed data inserted. You can now log in." });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
