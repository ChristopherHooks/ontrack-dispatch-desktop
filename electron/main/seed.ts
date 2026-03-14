import Database from 'better-sqlite3'

export function runSeedIfEmpty(db: Database.Database): void {
  const guard = db.prepare(
    "SELECT value FROM app_settings WHERE key = 'dev_seed_applied'"
  ).get() as { value: string } | undefined
  if (guard?.value === '1') return
  console.log('[Seed] Applying dev seed data...')
  db.transaction(() => {
    seedBrokers(db)
    seedDrivers(db)
    seedLoads(db)
    seedLeads(db)
    seedInvoices(db)
    seedTasks(db)
    seedDocuments(db)
    db.prepare(
      "INSERT OR REPLACE INTO app_settings (key, value, updated_at)" +
      " VALUES ('dev_seed_applied', '1', datetime('now'))"
    ).run()
  })()
  console.log('[Seed] Dev seed complete.')
}

export function resetAndReseed(db: Database.Database): void {
  db.transaction(() => {
    const tables = ['notes','task_completions','driver_documents','invoices','loads','tasks','documents','drivers','leads','brokers']
    for (const t of tables) {
      db.prepare('DELETE FROM ' + t + ' WHERE id >= 101').run()
    }
    db.prepare("DELETE FROM app_settings WHERE key = 'dev_seed_applied'").run()
  })()
  runSeedIfEmpty(db)
}

function seedBrokers(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO brokers (id, name, mc_number, phone, email, payment_terms, credit_rating, avg_days_pay, flag, notes)' +
    ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  ins.run(101,'CH Robinson','023514','800-323-7587','carriers@chrobinson.com',30,'A',28,'Preferred','Largest 3PL in North America. Fast pay, reliable on all lanes.')
  ins.run(102,'Coyote Logistics','482690','877-637-2311','carriers@coyotelogistics.com',30,'A',22,'Preferred','UPS subsidiary. Consistent loads on Midwest and Southeast lanes.')
  ins.run(103,'Echo Global Freight','724281','800-354-7993','carriers@echo.com',30,'B',35,'None','Good volume broker. Can be slow responding on POD requests.')
  ins.run(104,'XPO Logistics','519147','844-742-5976','dispatch@xpo.com',45,'B+',40,'None','Large carrier network. Net-45 terms -- plan cash flow accordingly.')
  ins.run(105,'Landstar System','195038','800-872-9400','carriers@landstar.com',30,'A+',20,'Preferred','Top-tier broker. Preferred for Southeast and Midwest flatbed lanes.')
  ins.run(106,'Total Quality Logistics','739438','800-580-3101','carriers@tql.com',30,'B',33,'None','High volume spot market broker. Good for short-notice coverage.')
  ins.run(107,'Uber Freight','431563','800-390-3675','carriers@uberfreight.com',45,'C',52,'Slow Pay','Consistently slow on net-45. Push for POD same day or expect delays.')
  ins.run(108,'GlobalTranz','512948','866-275-1900','carriers@globaltranz.com',30,'D',65,'Avoid','Multiple payment disputes on file. Do not book without written rate con.')
}

function seedDrivers(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO drivers' +
    ' (id, name, company, mc_number, dot_number, cdl_number, cdl_expiry,' +
    '  phone, email, truck_type, trailer_type, home_base, preferred_lanes,' +
    '  min_rpm, dispatch_percent, factoring_company, insurance_expiry, start_date, status, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  ins.run(101,'Marcus Johnson','MJ Freight LLC','782341','2341789','CDL-TX-4421','2027-08-15','214-555-0181','marcus@mjfreight.com','Kenworth T680','Flatbed','Dallas, TX','TX-GA, TX-TN, TX-IL',2.0,7.0,'OTR Capital','2026-09-01','2023-04-01','Active','Reliable driver on Southeast lanes. Prefers 48-state flatbed runs.')
  ins.run(102,'Tony Garcia','Garcia Trucking','614882','3884521','CDL-TX-8812','2026-11-30','713-555-0292','tony@garciahauling.com','Peterbilt 579','Reefer','Houston, TX','TX-TN, TX-GA, TX-FL',2.2,7.0,'Riviera Finance','2026-06-15','2022-11-15','Active','Reefer specialist. Preferred lanes TX to Southeast. Good with temp-sensitive freight.')
  ins.run(103,'Derek Williams','Williams Transport','498217','1987432','CDL-IL-3309','2027-03-20','312-555-0343','dwilliams@wtrans.com','Freightliner Cascadia','Dry Van','Chicago, IL','IL-TX, IL-GA, IL-TN',1.9,7.0,null,'2026-12-01','2021-06-01','On Load','Experienced Midwest driver. Currently on a load.')
  ins.run(104,'Sandra Mitchell','Mitchell Carriers','337561','2214456','CDL-GA-7721','2028-01-10','404-555-0414','sandra@mitchellcarriers.com','Volvo VNL','Flatbed','Atlanta, GA','GA-IL, GA-TX, GA-OH',2.1,7.5,'RTS Financial','2026-08-20','2022-03-15','Active','Strong Southeast network. Reliable on flatbed loads over 800 miles.')
  ins.run(105,'James Cooper','Cooper Hauling Inc','551234','4432198','CDL-AZ-5519','2027-06-30','602-555-0515','james@cooperhauling.com','International LT','Dry Van','Phoenix, AZ','AZ-CA, AZ-TX, AZ-NV',1.8,7.0,null,'2027-01-15','2023-01-10','On Load','Southwest specialist. Currently booked. Good on short-haul AZ lanes.')
  ins.run(106,'Ricky Torres','Torres Step Deck LLC','209887','3312877','CDL-MO-2234','2027-09-15','816-555-0616','rtorres@torresstepdeck.com','Kenworth W900','Step Deck','Kansas City, MO','MO-CO, MO-TX, MO-IL',2.0,7.0,'Triumph Business Capital','2026-10-30','2022-08-20','Active','Step deck expert. Runs KC to Denver corridor regularly.')
  ins.run(107,'Diane Foster','Foster Van Lines','412090','2990341','CDL-TN-9901','2025-12-15','615-555-0717','diane@fostervanlines.com','Freightliner Cascadia','Dry Van','Nashville, TN','TN-OH, TN-IL, TN-GA',1.9,7.0,null,'2025-09-01','2020-05-01','Inactive','On leave. CDL expires Dec 2025 -- renewal pending. Do not assign loads.')
  ins.run(108,'Brandon Lee','Lee Reefer Express','887432','5543219','CDL-CA-6678','2028-04-20','323-555-0818','brandon@leereeferexp.com','Peterbilt 389','Reefer','Los Angeles, CA','CA-AZ, CA-TX, CA-NV',2.3,8.0,'Apex Capital','2027-03-01','2023-09-01','Active','Reefer driver on West Coast lanes. Higher RPM required for CA compliance costs.')
  ins.run(109,'Kelvin Brown','Brown Flatbed Co','334509','1123488','CDL-CO-4412','2027-07-31','720-555-0919','kbrown@brownflatbed.com','Mack Anthem','Flatbed','Denver, CO','CO-TX, CO-KS, CO-NE',2.0,7.0,'OTR Capital','2026-11-15','2022-12-01','On Load','Mountain region specialist. Currently in transit.')
  ins.run(110,'Patricia Hayes','Hayes Logistics','223781','3341209','CDL-TN-7733','2027-02-28','901-555-1010','patricia@hayeslogistics.com','Volvo VNL','Dry Van','Memphis, TN','TN-NC, TN-OH, TN-GA',1.85,7.0,'Riviera Finance','2026-07-01','2021-09-15','Active','Reliable Southeast corridor driver. Good on TN-Charlotte lanes.')
  ins.run(111,'Oscar Martinez','Martinez Transport','778821','4451239','CDL-TX-3344','2026-08-31','972-555-1111','oscar@martineztrans.com','Kenworth T680','Dry Van','Dallas, TX','TX-GA, TX-IL, TX-MO',1.9,7.0,null,'2026-05-15','2023-02-01','Active','Based in Dallas. Runs Northeast Texas triangle frequently.')
  ins.run(112,'Tasha Robinson','Robinson Reefer LLC','445612','2218890','CDL-TX-8844','2027-11-20','713-555-1212','tasha@robinsonreefer.com','Freightliner Cascadia','Reefer','Houston, TX','TX-TN, TX-GA, TX-FL',2.1,7.5,'RTS Financial','2026-09-30','2023-05-15','On Load','Reefer specialist out of Houston. Currently picked up and en route.')
  ins.run(113,'Danny Nguyen','Nguyen Flatbed','892341','3390121','CDL-AZ-1199','2028-02-15','480-555-1313','danny@nguyenflatbed.com','International LT','Flatbed','Phoenix, AZ','AZ-NV, AZ-CA, AZ-TX',2.0,7.0,null,'2027-06-01','2024-01-10','Active','Newer driver but reliable. Prefers Southwest flatbed runs under 500 miles.')
  ins.run(114,'Crystal Adams','Adams Freight Solutions','667890','5512341','CDL-NC-2255','2025-10-31','704-555-1414','crystal@adamsfreight.com','Peterbilt 579','Dry Van','Charlotte, NC','NC-OH, NC-TN, NC-GA',1.8,7.0,null,'2025-08-01','2020-11-01','Inactive','Suspended insurance as of Aug 2025. Do not dispatch until insurance current.')
  ins.run(115,'Michael Scott','Scott Step LLC','334456','1190087','CDL-OH-5566','2027-05-31','614-555-1515','mscott@scottstep.com','Volvo VNL','Step Deck','Columbus, OH','OH-TN, OH-GA, OH-IL',1.95,7.0,'Triumph Business Capital','2026-08-15','2022-07-20','Active','Step deck driver on Ohio to Southeast corridor. Consistent performer.')
}

function seedLoads(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO loads' +
    ' (id, load_id, driver_id, broker_id, origin_city, origin_state,' +
    '  dest_city, dest_state, pickup_date, delivery_date,' +
    '  miles, rate, dispatch_pct, commodity, status, invoiced, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  // -- Searching (no driver assigned) --
  ins.run(101,'CHRB-110401',null,101,'Kansas City','MO','Denver','CO',null,null,600,1380.00,7.0,'Auto Parts','Searching',0,'Spot load. Need flatbed or step deck.')
  ins.run(102,'TQL-220819',null,106,'Chicago','IL','Memphis','TN',null,null,530,1007.00,7.0,'General Freight','Searching',0,'Dry van preferred. Dock to dock.')
  ins.run(103,'COY-334512',null,102,'Atlanta','GA','Houston','TX',null,null,790,1738.00,7.0,'Building Materials','Searching',0,'Partial flatbed OK. Call for details.')
  // -- Booked --
  ins.run(104,'CHRB-110482',105,101,'Phoenix','AZ','Las Vegas','NV','2026-03-18','2026-03-19',290,667.00,7.0,'Electronics','Booked',0,'Driver confirmed. Rate con sent.')
  ins.run(105,'COY-334598',101,102,'Dallas','TX','Atlanta','GA','2026-03-17','2026-03-19',900,2070.00,7.0,'Steel Coils','Booked',0,'Flatbed. Straps and tarps required.')
  ins.run(106,'ECH-445672',106,103,'Kansas City','MO','Denver','CO','2026-03-19','2026-03-20',600,1320.00,7.0,'Machinery Parts','Booked',0,'Step deck confirmed. Permits not required.')
  ins.run(107,'LND-556231',111,105,'Dallas','TX','Nashville','TN','2026-03-20','2026-03-22',665,1463.00,7.0,'General Freight','Booked',0,'Dry van. No touch freight.')
  ins.run(108,'TQL-220904',110,106,'Memphis','TN','Columbus','OH','2026-03-21','2026-03-23',430,946.00,7.0,'Consumer Goods','Booked',0,'Team driver not required. Standard dry van.')
  // -- Picked Up --
  ins.run(109,'COY-335101',112,102,'Houston','TX','Nashville','TN','2026-03-11','2026-03-14',800,1920.00,7.5,'Frozen Goods','Picked Up',0,'Reefer set to -10F. Driver confirmed pickup.')
  ins.run(110,'CHRB-110601',115,101,'Columbus','OH','Atlanta','GA','2026-03-12','2026-03-14',720,1656.00,7.0,'Auto Parts','Picked Up',0,'Step deck. Oversized permit not required.')
  ins.run(111,'ECH-445801',104,103,'Atlanta','GA','Chicago','IL','2026-03-12','2026-03-15',720,1512.00,7.5,'Manufactured Goods','Picked Up',0,'Flatbed loaded. Tarped and secured.')
  ins.run(112,'XPO-661234',113,104,'Phoenix','AZ','Las Vegas','NV','2026-03-13','2026-03-14',290,580.00,7.0,'Retail Goods','Picked Up',0,'Short run. Driver confirmed pickup.')
  ins.run(113,'LND-556312',108,105,'Los Angeles','CA','Phoenix','AZ','2026-03-13','2026-03-15',370,999.00,8.0,'Produce','Picked Up',0,'Reefer at 34F. Produce load, time sensitive.')
  // -- In Transit --
  ins.run(114,'COY-335201',103,102,'Chicago','IL','Dallas','TX','2026-03-10','2026-03-14',920,1748.00,7.0,'General Freight','In Transit',0,'Driver en route. ETA 3/14 evening.')
  ins.run(115,'CHRB-110702',109,101,'Denver','CO','Dallas','TX','2026-03-09','2026-03-13',1000,2200.00,7.0,'Heavy Equipment','In Transit',0,'Flatbed. Oversize permitted. Driver checked in at Amarillo.')
  ins.run(116,'TQL-221001',102,106,'Houston','TX','Atlanta','GA','2026-03-11','2026-03-14',790,1738.00,7.5,'Reefer Goods','In Transit',0,'Reefer at 36F. On schedule.')
  ins.run(117,'ECH-446001',111,103,'Dallas','TX','Chicago','IL','2026-03-10','2026-03-13',920,1748.00,7.0,'Steel Products','In Transit',0,'Dry van, heavy load. Driver cleared scales.')
  ins.run(118,'LND-556502',104,105,'Atlanta','GA','Nashville','TN','2026-03-12','2026-03-13',250,550.00,7.5,'Paper Products','In Transit',0,'Short run. Flatbed, no tarps needed.')
  ins.run(119,'COY-335302',110,102,'Memphis','TN','Charlotte','NC','2026-03-11','2026-03-14',650,1235.00,7.0,'Consumer Electronics','In Transit',0,'Dry van. Driver reported no issues.')
  ins.run(120,'XPO-661401',115,104,'Columbus','OH','Nashville','TN','2026-03-12','2026-03-13',430,881.50,7.0,'Auto Parts','In Transit',0,'Step deck in transit. ETA tomorrow morning.')
  // -- Delivered --
  ins.run(121,'CHRB-110801',101,101,'Dallas','TX','Atlanta','GA','2026-03-01','2026-03-04',900,1980.00,7.0,'Machinery','Delivered',0,'Delivered on time. POD received.')
  ins.run(122,'COY-335401',102,102,'Houston','TX','Nashville','TN','2026-02-24','2026-02-27',800,1920.00,7.5,'Frozen Goods','Delivered',0,'Reefer load delivered. Temp logs attached.')
  ins.run(123,'ECH-446101',103,103,'Chicago','IL','Dallas','TX','2026-02-20','2026-02-24',920,1748.00,7.0,'General Freight','Delivered',0,'Delivered. Driver noted dock congestion.')
  ins.run(124,'TQL-221101',104,106,'Atlanta','GA','Chicago','IL','2026-02-15','2026-02-18',720,1584.00,7.5,'Flatbed Freight','Delivered',0,'Flatbed delivered on schedule.')
  ins.run(125,'LND-556601',105,105,'Phoenix','AZ','Las Vegas','NV','2026-02-28','2026-03-01',290,580.00,7.0,'Electronics','Delivered',0,'Short run. POD signed and received.')
  ins.run(126,'COY-335501',106,102,'Kansas City','MO','Denver','CO','2026-02-22','2026-02-24',600,1320.00,7.0,'Auto Parts','Delivered',0,'Step deck delivered. No damage reported.')
  ins.run(127,'CHRB-110901',108,101,'Los Angeles','CA','Phoenix','AZ','2026-02-18','2026-02-19',370,962.00,8.0,'Produce','Delivered',0,'Reefer delivered within temp spec.')
  ins.run(128,'XPO-661501',109,104,'Denver','CO','Dallas','TX','2026-02-10','2026-02-14',1000,1900.00,7.0,'Heavy Machinery','Delivered',0,'Oversized load delivered. Permit fees invoiced separately.')
  ins.run(129,'ECH-446201',110,103,'Memphis','TN','Charlotte','NC','2026-02-05','2026-02-07',650,1202.50,7.0,'Consumer Goods','Delivered',0,'POD received. Consignee signed.')
  ins.run(130,'TQL-221201',111,106,'Dallas','TX','Houston','TX','2026-02-01','2026-02-02',240,480.00,7.0,'Industrial Supplies','Delivered',0,'Short local run. POD received same day.')
  // -- Invoiced --
  ins.run(131,'CHRB-111001',101,101,'Dallas','TX','Chicago','IL','2026-01-20','2026-01-24',920,2116.00,7.0,'Steel Coils','Invoiced',1,'Flatbed. Invoice INV-2026-0001 sent.')
  ins.run(132,'COY-335601',102,102,'Houston','TX','Atlanta','GA','2026-01-15','2026-01-19',790,1896.00,7.5,'Reefer Goods','Invoiced',1,'Reefer. Invoice INV-2026-0002 sent.')
  ins.run(133,'ECH-446301',103,103,'Chicago','IL','Memphis','TN','2026-01-10','2026-01-12',530,1007.00,7.0,'General Freight','Invoiced',1,'Invoice INV-2026-0003 sent.')
  ins.run(134,'LND-556701',104,105,'Atlanta','GA','Dallas','TX','2026-01-05','2026-01-09',790,1738.00,7.5,'Building Materials','Invoiced',1,'Invoice INV-2026-0004 sent. Awaiting payment.')
  ins.run(135,'TQL-221301',106,106,'Kansas City','MO','Dallas','TX','2026-01-18','2026-01-21',500,1000.00,7.0,'Auto Parts','Invoiced',1,'Invoice INV-2026-0005 sent.')
  ins.run(136,'COY-335701',108,102,'Los Angeles','CA','Phoenix','AZ','2026-01-08','2026-01-09',370,962.00,8.0,'Produce','Invoiced',1,'Invoice INV-2026-0006 sent. Reefer load.')
  // -- Paid --
  ins.run(137,'CHRB-111101',101,101,'Dallas','TX','Atlanta','GA','2025-12-15','2025-12-18',900,2070.00,7.0,'Machinery','Paid',1,'Paid in full. Wire received 2026-01-12.')
  ins.run(138,'COY-335801',102,102,'Houston','TX','Nashville','TN','2025-12-01','2025-12-04',800,1920.00,7.5,'Frozen Goods','Paid',1,'Paid. Reefer temp logs archived.')
  ins.run(139,'ECH-446401',103,103,'Chicago','IL','Dallas','TX','2025-11-20','2025-11-24',920,1748.00,7.0,'General Freight','Paid',1,'Paid. Full dispute-free settlement.')
  ins.run(140,'LND-556801',109,105,'Denver','CO','Kansas City','MO','2025-11-10','2025-11-12',600,1320.00,7.0,'Auto Parts','Paid',1,'Paid. Flatbed, clean delivery.')
}

function seedLeads(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO leads' +
    ' (id, name, company, mc_number, phone, email, city, state,' +
    '  trailer_type, authority_date, source, status, priority, follow_up_date, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  // New
  ins.run(101,'Ray Castillo','Castillo Express LLC','881234','469-555-0101','ray@castilloexp.com','Dallas','TX','Dry Van','2023-06-15','FMCSA','New','High','2026-03-20','Has 2 trucks. Interested in TX-IL lanes.')
  ins.run(102,'Angela Pierce','Pierce Freight Co','774321','901-555-0102','angela@piercefreight.com','Memphis','TN','Reefer','2022-09-01','Referral','New','High','2026-03-18','Referred by Marcus Johnson. Runs Southeast reefer lanes.')
  ins.run(103,'Luis Vega','Vega Hauling','993412','602-555-0103','luis@vegahauling.com','Phoenix','AZ','Flatbed','2021-04-20','FMCSA','New','Medium','2026-03-25','Solo operator. Prefers AZ-CA-NV triangle.')
  ins.run(104,'Tammy Brooks','Brooks Transport Inc','221987','214-555-0104','tammy@brookstrans.com','Dallas','TX','Dry Van','2020-11-30','Facebook','New','Medium','2026-04-01','Saw Facebook post. Has authority 5+ years.')
  ins.run(105,'Jerome Ellis','Ellis Logistics','556712','312-555-0105','jerome@ellislogistics.com','Chicago','IL','Reefer','2023-01-15','Cold Call','New','Low','2026-04-05','Interested but slow to respond. Follow up after April 1.')
  ins.run(106,'Monica Shaw','Shaw Carriers','334891','720-555-0106','monica@shawcarriers.com','Denver','CO','Dry Van','2022-07-10','FMCSA','New','Medium','2026-03-22','2 dry van units based in Denver. Runs CO-TX corridor.')
  ins.run(107,'Derek Hampton','Hampton Flatbed','778234','404-555-0107','derek@hamptonflatbed.com','Atlanta','GA','Flatbed','2021-08-05','Website','New','High','2026-03-16','Came through website form. 3 flatbeds, experienced.')
  ins.run(108,'Cheryl Owens','Owens Reefer LLC','445901','713-555-0108','cheryl@owensreefer.com','Houston','TX','Reefer','2023-03-22','FMCSA','New','Medium','2026-03-28','New authority. Wants to run TX to Southeast.')
  // Contacted
  ins.run(109,'Nathan Ford','Ford Express','662341','816-555-0109','nathan@fordexp.com','Kansas City','MO','Dry Van','2020-05-14','Referral','Contacted','High','2026-03-15','Left voicemail 3/12. Callback expected by 3/15.')
  ins.run(110,'Gloria Rivera','Rivera Transport','889012','615-555-0110','gloria@riveratrans.com','Nashville','TN','Flatbed','2022-12-01','Cold Call','Contacted','Medium','2026-03-17','Email sent 3/10. Awaiting response.')
  ins.run(111,'Sam Whitfield','Whitfield Hauling','334120','614-555-0111','sam@whitfieldhaul.com','Columbus','OH','Dry Van','2019-03-10','FMCSA','Contacted','Low','2026-03-30','Older authority. Solo driver. Slow response rate.')
  ins.run(112,'Carla Nguyen','Nguyen Cold Chain','556234','323-555-0112','carla@nguyencoldchain.com','Los Angeles','CA','Reefer','2023-07-01','Website','Contacted','High','2026-03-16','Reefer fleet of 4. Called 3/13, interested in West Coast lanes.')
  ins.run(113,'Bryan Wells','Wells Trucking','778901','972-555-0113','bryan@wellstrucking.com','Dallas','TX','Step Deck','2021-10-15','Referral','Contacted','Medium','2026-03-19','3 step decks. Referred by Ricky Torres.')
  ins.run(114,'Lisa Grant','Grant Freight Solutions','990123','901-555-0114','lisa@grantfreight.com','Memphis','TN','Dry Van','2022-04-30','Facebook','Contacted','Low','2026-04-10','Saw ad. Has 1 truck. Not urgent.')
  ins.run(115,'Marcus Lee','Lee Carriers Inc','112890','404-555-0115','marcus@leecarriers.com','Atlanta','GA','Flatbed','2020-08-20','Cold Call','Contacted','High','2026-03-15','Has 5 flatbeds. Very interested. Sending packet today.')
  ins.run(116,'Dana Cruz','Cruz Transport LLC','334678','602-555-0116','dana@cruztransport.com','Phoenix','AZ','Dry Van','2023-05-10','FMCSA','Contacted','Medium','2026-03-21','New authority. Solo operator. Running AZ to NV.')
  ins.run(117,'Kevin Moss','Moss Express','556901','312-555-0117','kevin@mossexpress.com','Chicago','IL','Reefer','2022-11-15','Referral','Contacted','High','2026-03-14','Referred by Tony Garcia. 2 reefers. Must follow up today.')
  // Interested
  ins.run(118,'Veronica Hall','Hall Freight LLC','778412','469-555-0118','veronica@hallfreight.com','Dallas','TX','Flatbed','2022-03-18','FMCSA','Interested','High','2026-03-16','Reviewed rates. Wants to start April 1. Send packet.')
  ins.run(119,'Chris Dunn','Dunn Carriers','445109','720-555-0119','chris@dunncarriers.com','Denver','CO','Dry Van','2021-06-25','Website','Interested','High','2026-03-17','Has 2 dry vans. Agreed to 7% dispatch rate. Packet in review.')
  ins.run(120,'Nina Flores','Flores Reefer Co','667234','713-555-0120','nina@floresreefer.com','Houston','TX','Reefer','2023-02-14','Referral','Interested','Medium','2026-03-20','Solo reefer. Wants Houston-Atlanta lane primarily.')
  ins.run(121,'Tyrone Wade','Wade Transport','889561','901-555-0121','tyrone@wadetrans.com','Memphis','TN','Dry Van','2020-09-01','Cold Call','Interested','Medium','2026-03-22','Interested in TN-OH corridor. Reviewing contract.')
  ins.run(122,'Stephanie Kim','Kim Logistics','334789','312-555-0122','stephanie@kimlogistics.com','Chicago','IL','Reefer','2022-06-10','FMCSA','Interested','High','2026-03-15','Fleet of 3 reefers. Very interested. Close this week.')
  ins.run(123,'Andre Jackson','Jackson Step Deck','556023','816-555-0123','andre@jacksonstep.com','Kansas City','MO','Step Deck','2021-12-01','Website','Interested','Medium','2026-03-18','2 step decks. Evaluating our rates vs competitor.')
  ins.run(124,'Paula Reed','Reed Express','778345','404-555-0124','paula@reedexpress.com','Atlanta','GA','Dry Van','2023-04-15','Facebook','Interested','Low','2026-03-25','1 truck. Price-shopping. May not close quickly.')
  ins.run(125,'Gilbert Ortiz','Ortiz Hauling','990678','602-555-0125','gilbert@ortizhaul.com','Phoenix','AZ','Flatbed','2020-07-20','Referral','Interested','High','2026-03-14','3 flatbeds. Referred by Sandra Mitchell. Ready to sign.')
  // Signed (converted drivers)
  ins.run(126,'Robert Tran','Tran Transport','112901','214-555-0126','robert@trantrans.com','Dallas','TX','Dry Van','2019-11-10','FMCSA','Signed',null,null,'Signed and onboarded March 2026. Running TX-IL corridor.')
  ins.run(127,'Felicia Young','Young Carriers','334234','615-555-0127','felicia@youngcarriers.com','Nashville','TN','Reefer','2021-05-20','Referral','Signed',null,null,'Signed Feb 2026. 2 reefer units. Southeast specialist.')
  ins.run(128,'Calvin Price','Price Freight','556567','614-555-0128','calvin@pricefreight.com','Columbus','OH','Flatbed','2020-02-14','Cold Call','Signed',null,null,'Signed Jan 2026. Flatbed on OH-GA corridor.')
  ins.run(129,'Denise Taylor','Taylor Logistics','778890','312-555-0129','denise@taylorlogistics.com','Chicago','IL','Dry Van','2022-08-30','Website','Signed',null,null,'Signed Dec 2025. Running Midwest lanes well.')
  ins.run(130,'Hector Reyes','Reyes Flatbed LLC','990123','713-555-0130','hector@reyesflatbed.com','Houston','TX','Flatbed','2021-01-15','FMCSA','Signed',null,null,'Signed Nov 2025. 2 flatbeds TX to Southeast.')
  ins.run(131,'Tamara Knight','Knight Reefer Co','112456','901-555-0131','tamara@knightreefer.com','Memphis','TN','Reefer','2023-06-01','Referral','Signed',null,null,'Signed Oct 2025. Solo reefer, TN-GA lane.')
  ins.run(132,'Eddie Burns','Burns Transport','334789','404-555-0132','eddie@burnstrans.com','Atlanta','GA','Dry Van','2020-04-10','Facebook','Signed',null,null,'Signed Sep 2025. 1 dry van, consistent performer.')
  ins.run(133,'Lena Stone','Stone Carriers','556012','720-555-0133','lena@stonecarriers.com','Denver','CO','Step Deck','2022-10-25','FMCSA','Signed',null,null,'Signed Aug 2025. Step deck on CO-TX lane.')
  // Rejected
  ins.run(134,'Gary Norton','Norton LLC','778234','469-555-0134','gary@nortonllc.com','Dallas','TX','Dry Van','2018-03-01','Cold Call','Rejected',null,null,'Too many violations on safety score. Cannot onboard.')
  ins.run(135,'Rhonda Powell','Powell Transport','990567','602-555-0135','rhonda@powelltrans.com','Phoenix','AZ','Flatbed','2019-07-15','FMCSA','Rejected',null,null,'Insurance lapsed. Reapply when current.')
  ins.run(136,'Billy Carr','Carr Hauling','112890','816-555-0136','billy@carrhauling.com','Kansas City','MO','Dry Van','2020-12-20','Website','Rejected',null,null,'Wants rates below our minimum. Not a good fit.')
  ins.run(137,'Donna Webb','Webb Freight','334123','323-555-0137','donna@webbfreight.com','Los Angeles','CA','Reefer','2021-05-05','Referral','Rejected',null,null,'Could not verify MC authority. Flagged for review.')
  ins.run(138,'Sam Fletcher','Fletcher Express','556456','901-555-0138','sam@fletcherexp.com','Memphis','TN','Dry Van','2019-09-30','FMCSA','Rejected',null,null,'Out of service order on record. Cannot dispatch.')
  // Additional New / Contacted leads to reach 50 total
  ins.run(139,'Frank Medina','Medina Transport','778789','972-555-0139','frank@medinatrans.com','Dallas','TX','Flatbed','2022-02-01','FMCSA','New','Medium','2026-03-26','2 flatbeds. Expressed interest via web form.')
  ins.run(140,'Connie Burke','Burke Logistics','990012','312-555-0140','connie@burkelogistics.com','Chicago','IL','Dry Van','2023-08-10','Cold Call','New','Low','2026-04-08','New authority. Solo operator. Still evaluating options.')
  ins.run(141,'Leon Harper','Harper Carriers','112345','404-555-0141','leon@harpercarriers.com','Atlanta','GA','Reefer','2021-11-20','Referral','Contacted','Medium','2026-03-20','Referred internally. 2 reefers.')
  ins.run(142,'Irene Patton','Patton Freight','334678','615-555-0142','irene@pattonfreight.com','Nashville','TN','Dry Van','2020-06-14','Website','Contacted','High','2026-03-16','Has 3 trucks. Ready to talk rates.')
  ins.run(143,'Curtis Flynn','Flynn Step LLC','556901','720-555-0143','curtis@flynnstep.com','Denver','CO','Step Deck','2022-09-05','FMCSA','New','Medium','2026-03-27','Step deck running CO-TX. Inquired about min RPM.')
  ins.run(144,'Monique Banks','Banks Express','778123','713-555-0144','monique@banksexp.com','Houston','TX','Dry Van','2023-01-25','Facebook','New','Low','2026-04-12','Facebook inquiry. Solo driver. Price sensitive.')
  ins.run(145,'Harold Simmons','Simmons Hauling','990456','314-555-0145','harold@simmonshauling.com','St. Louis','MO','Flatbed','2021-07-30','Cold Call','Contacted','Medium','2026-03-23','3 flatbeds. Runs MO-TX and MO-IL.')
  ins.run(146,'Tricia Powell','Powell Reefer Inc','112789','602-555-0146','tricia@powellreefer.com','Phoenix','AZ','Reefer','2022-04-18','FMCSA','Interested','High','2026-03-17','2 reefers. Ready to sign pending rate agreement.')
  ins.run(147,'Devon Sutton','Sutton Transport','334012','323-555-0147','devon@suttontrans.com','Los Angeles','CA','Dry Van','2020-10-12','Referral','Interested','Medium','2026-03-21','Interested in CA-AZ-NV lanes. 1 truck.')
  ins.run(148,'Brenda Walsh','Walsh Carriers','556345','614-555-0148','brenda@walshcarriers.com','Columbus','OH','Flatbed','2023-03-07','Website','New','High','2026-03-15','3 flatbeds based in Columbus. Hot lead. Contact today.')
  ins.run(149,'Jerome Bass','Bass Freight LLC','778678','816-555-0149','jerome@bassfreight.com','Kansas City','MO','Dry Van','2019-08-22','FMCSA','Rejected',null,null,'Revoked authority. Cannot onboard per compliance rules.')
  ins.run(150,'Nancy Gibbs','Gibbs Trucking','990901','901-555-0150','nancy@gibbstrucking.com','Memphis','TN','Reefer','2022-12-12','Cold Call','New','Medium','2026-04-03','Solo reefer operator. Interested in TN-GA corridor.')
}

function seedInvoices(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO invoices' +
    ' (id, invoice_number, load_id, driver_id, week_ending,' +
    '  driver_gross, dispatch_pct, dispatch_fee, sent_date, paid_date, status, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  ins.run(101,'INV-2026-0001',131,101,'2026-01-24',2116.00,7.0,148.12,'2026-01-27',null,'Sent','Awaiting CH Robinson net-30 payment.')
  ins.run(102,'INV-2026-0002',132,102,'2026-01-19',1896.00,7.5,142.20,'2026-01-22',null,'Sent','Reefer load. Awaiting Coyote payment.')
  ins.run(103,'INV-2026-0003',133,103,'2026-01-12',1007.00,7.0,70.49,'2026-01-14',null,'Overdue','Past net-30. Follow up with Echo Global.')
  ins.run(104,'INV-2026-0004',134,104,'2026-01-09',1738.00,7.5,130.35,'2026-01-13',null,'Sent','Awaiting Landstar net-30 payment.')
  ins.run(105,'INV-2026-0005',135,106,'2026-01-21',1000.00,7.0,70.00,'2026-01-24',null,'Sent','TQL load. Payment expected by Feb 23.')
  ins.run(106,'INV-2026-0006',136,108,'2026-01-09',962.00,8.0,76.96,'2026-01-12',null,'Overdue','Uber Freight -- known slow payer. Escalate.')
  ins.run(107,'INV-2025-0101',137,101,'2025-12-18',2070.00,7.0,144.90,'2025-12-22','2026-01-12','Paid','CH Robinson. Paid on time.')
  ins.run(108,'INV-2025-0102',138,102,'2025-12-04',1920.00,7.5,144.00,'2025-12-08','2025-12-30','Paid','Coyote reefer load. Paid net-22.')
  ins.run(109,'INV-2025-0103',139,103,'2025-11-24',1748.00,7.0,122.36,'2025-11-28','2025-12-18','Paid','Echo Global. Paid in full.')
  ins.run(110,'INV-2025-0104',140,109,'2025-11-12',1320.00,7.0,92.40,'2025-11-17','2025-12-08','Paid','Landstar. Paid early -- preferred broker.')
  ins.run(111,'INV-2026-0007',121,101,'2026-03-04',1980.00,7.0,138.60,null,null,'Draft','Load just delivered. Invoice not yet sent.')
  ins.run(112,'INV-2026-0008',122,102,'2026-02-27',1920.00,7.5,144.00,null,null,'Draft','Reefer delivered. Gathering temp logs before invoicing.')
}


function seedTasks(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO tasks (id, title, category, priority, due_date, time_of_day, recurring, status, notes)' +
    ' VALUES (?,?,?,?,?,?,?,?,?)'
  )
  ins.run(101,'Check driver check-ins and update load statuses','Dispatch','High','Daily','8:00 AM',1,'Pending','Confirm all In Transit drivers have checked in. Update load board.')
  ins.run(102,'Follow up on overdue invoices','Admin','High','Daily','9:00 AM',1,'Pending','Review invoices older than 30 days. Email or call broker AR department.')
  ins.run(103,'Review new FMCSA leads and assign follow-up dates','Leads','Medium','Daily','10:00 AM',1,'Pending','Check FMCSA import queue. Score and prioritize new leads.')
  ins.run(104,'Post driver availability to Facebook group','Marketing','Medium','Daily','11:00 AM',1,'Pending','Post any available trucks to the freight group with lanes and equipment.')
  ins.run(105,'Confirm next-day pickup appointments','Dispatch','High','Daily','3:00 PM',1,'Pending','Call or message drivers with pickups tomorrow. Confirm time and location.')
  ins.run(106,'Send weekly revenue report to owner','Admin','Medium','Daily','5:00 PM',1,'Pending','Export load and invoice totals for the week. Send summary email.')
  ins.run(107,'Review expiring driver documents','Admin','High','2026-03-20','9:00 AM',0,'Pending','CDL and insurance expiry review for all active drivers. Flag any within 60 days.')
  ins.run(108,'Onboard new drivers from signed leads','Leads','High','2026-03-25','10:00 AM',0,'Pending','Process packets for Gilbert Ortiz and Stephanie Kim. Collect W9 and insurance.')
  ins.run(109,'Quarterly broker performance review','Admin','Medium','2026-03-31','2:00 PM',0,'Pending','Review avg days pay and dispute history for all brokers. Update flags.')
  ins.run(110,'Update preferred lanes for Denver-based drivers','Dispatch','Low','2026-04-01','11:00 AM',0,'Pending','Kelvin Brown and Lena Stone -- confirm lane preferences after Q1 review.')
}
function seedDocuments(db: Database.Database): void {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO documents (id, title, category, content, driver_id, doc_type, expiry_date)' +
    ' VALUES (?,?,?,?,?,?,?)'
  )
  ins.run(101,'Load Booking SOP','SOP','# Load Booking SOP\n\n## Purpose\nStandard procedure for booking a new load with a carrier.\n\n## Steps\n1. Confirm driver availability and equipment type.\n2. Verify load details: origin, destination, miles, rate, commodity.\n3. Calculate RPM -- must meet driver minimum before booking.\n4. Call or email broker to confirm rate confirmation (rate con).\n5. Send rate con to driver. Get signed acknowledgment.\n6. Enter load into OnTrack with status Booked.\n7. Send pickup instructions including BOL number and shipper contact.\n8. Notify broker of driver name, MC number, truck number, and ETA.\n\n## Notes\nNever dispatch a load without a signed rate con. Always verify insurance is current before dispatch.',null,null,null)
  ins.run(102,'Driver Onboarding Checklist','SOP','# Driver Onboarding Checklist\n\n## Required Documents\n- [ ] Completed carrier packet\n- [ ] Copy of CDL (front and back)\n- [ ] Certificate of Insurance (COI) -- OnTrack named as certificate holder\n- [ ] W-9 form\n- [ ] Signed dispatch agreement\n- [ ] MC authority verification (FMCSA SAFER lookup)\n\n## Setup Steps\n1. Enter driver in OnTrack with all fields completed.\n2. Upload all documents to driver profile.\n3. Set insurance expiry and CDL expiry alerts.\n4. Confirm preferred lanes and minimum RPM.\n5. Assign first load only after all documents are on file.',null,null,null)
  ins.run(103,'Invoice Submission Process','SOP','# Invoice Submission Process\n\n## When to Invoice\nInvoice immediately upon delivery confirmation and POD receipt.\n\n## Steps\n1. Confirm delivery in OnTrack -- update load status to Delivered.\n2. Collect signed POD from driver within 24 hours.\n3. Generate invoice in OnTrack Invoices module.\n4. Attach POD and rate con to invoice email.\n5. Send to broker AR department. CC dispatch@ontrackhaulingsolutions.com.\n6. Update invoice status to Sent.\n7. Follow up if unpaid after 25 days (5 days before net-30 deadline).\n\n## Dispute Resolution\nIf a broker disputes an invoice, pull the signed rate con and POD.\nEscalate to owner if unresolved after 2 contact attempts.',null,null,null)
  ins.run(104,'Broker Packet Requirements','Reference','# Broker Packet Requirements\n\n## What Brokers Require\nMost freight brokers require the following before booking a load:\n\n- Operating authority (MC number active on FMCSA)\n- Certificate of Insurance -- minimum $1M general liability and $100K cargo\n- W-9 for payment setup\n- Signed broker-carrier agreement\n\n## Preferred Brokers\nSee the Brokers page for current flags and payment history.\nAlways check flag before booking. Do not dispatch to Avoid-flagged brokers.',null,null,null)
  ins.run(105,'Driver Safety Compliance','Policy','# Driver Safety Compliance\n\n## Minimum Requirements\nAll drivers dispatched by OnTrack must maintain:\n\n- Valid CDL with correct endorsements for load type\n- Active MC authority (not revoked or suspended)\n- Current commercial insurance on file\n- No out-of-service orders on FMCSA SAFER record\n\n## Expiry Monitoring\nOnTrack alerts when CDL or insurance expires within 60 days.\nDo not dispatch a driver with expired credentials.\n\n## HOS Rules\nRemind drivers of Hours of Service limits.\nNever pressure a driver to violate HOS regulations.',null,null,null)
}
