export interface IndustryTerm {
  term:       string
  category:   'Documents' | 'Equipment' | 'Regulatory' | 'Dispatch' | 'Rates & Freight' | 'Business'
  definition: string
}

export const TERM_CATEGORIES = [
  'Documents',
  'Equipment',
  'Regulatory',
  'Dispatch',
  'Rates & Freight',
  'Business',
] as const

export const INDUSTRY_TERMS: IndustryTerm[] = [

  // ── Documents ──────────────────────────────────────────────────────────────

  {
    term: 'BOL — Bill of Lading',
    category: 'Documents',
    definition:
      'The primary shipping document that travels with a load. Serves as a contract between the shipper and carrier, a receipt for the freight, and a title document. The driver signs it at pickup and the consignee signs it at delivery. A clean BOL (no exceptions noted) is required before a POD can be issued.',
  },
  {
    term: 'POD — Proof of Delivery',
    category: 'Documents',
    definition:
      'A signed and dated copy of the BOL returned after successful delivery. Required by brokers and shippers to release payment. Some brokers accept a photo of the signed BOL; others require a PDF scan uploaded to their TMS. Always get a legible signature with the date.',
  },
  {
    term: 'RC — Rate Confirmation',
    category: 'Documents',
    definition:
      'A document issued by the broker that locks in the agreed rate, pickup/delivery locations, dates, and any special requirements (temperature, tarps, etc.). The carrier must sign and return the RC before loading. The RC is the legal agreement — verbal quotes are not binding.',
  },
  {
    term: 'NOA — Notice of Assignment',
    category: 'Documents',
    definition:
      'A document from a factoring company notifying the broker or shipper that the carrier has assigned its receivables. The NOA instructs the payer to send payment directly to the factor instead of the carrier. Brokers must acknowledge the NOA before a factored invoice is valid.',
  },
  {
    term: 'Lumper Receipt',
    category: 'Documents',
    definition:
      'A receipt from a third-party unloading service (lumper) at a warehouse or distribution center. Some shippers require hired lumpers rather than drivers to unload freight. The driver pays the lumper, keeps the receipt, and the broker reimburses the lumper fee — usually within 24-48 hours.',
  },
  {
    term: 'Carrier Packet',
    category: 'Documents',
    definition:
      'A set of required documents a carrier submits to a broker before being approved to haul loads. Typically includes: W-9, certificate of insurance (COI), operating authority, voided check or ACH form. Some brokers also require an agreement or carrier setup form. Setup can take 1-3 business days.',
  },
  {
    term: 'COI — Certificate of Insurance',
    category: 'Documents',
    definition:
      'A one-page summary document issued by the carrier\'s insurance agent listing coverage types, policy numbers, limits, and the named insured. Brokers require the COI to verify the carrier meets their minimum coverage requirements (usually $1M auto liability, $100K cargo). COIs expire when the underlying policy expires.',
  },
  {
    term: 'W-9',
    category: 'Documents',
    definition:
      'IRS form that collects the taxpayer identification number (TIN) and business name. Required by brokers to issue payment and file 1099s at year-end. Independent dispatch companies also need a W-9 from carriers they represent. Keep a blank W-9 on hand for new broker setups.',
  },
  {
    term: 'MCS-150',
    category: 'Documents',
    definition:
      'FMCSA form used to register or update a motor carrier\'s operating information. Filed when applying for DOT number and updated every two years (biennial update). The MCS-150 filing date is the closest available proxy for the date a carrier received their authority and is used by the FMCSA SAFER database.',
  },
  {
    term: 'Scale Ticket',
    category: 'Documents',
    definition:
      'A receipt from a certified weigh station showing the gross weight of the truck and load. Drivers may be required to stop at weigh stations en route. If overweight, the driver must correct the load before continuing. Keep all scale tickets — they may be needed to dispute overweight citations.',
  },

  // ── Equipment ──────────────────────────────────────────────────────────────

  {
    term: 'Dry Van',
    category: 'Equipment',
    definition:
      'The most common trailer type — an enclosed rectangular box, typically 48 or 53 feet long. Hauls non-temperature-sensitive freight such as consumer goods, building materials, and packaged food. No special loading equipment required. Most freight on load boards is dry van.',
  },
  {
    term: 'Reefer — Refrigerated Trailer',
    category: 'Equipment',
    definition:
      'An insulated trailer with an integrated refrigeration unit (reefer unit) that can maintain a set temperature range. Used for perishables, produce, pharmaceuticals, and any freight requiring temperature control. Fuel for the reefer unit is separate from the truck fuel and is typically reimbursed or included in the rate.',
  },
  {
    term: 'Flatbed',
    category: 'Equipment',
    definition:
      'An open trailer with no sides or roof, typically 48 or 53 feet long, used to haul oversized, heavy, or oddly shaped freight (steel coils, lumber, machinery, pipes). Requires straps, chains, and tarps. Flatbed rates are higher than dry van due to the extra labor for securing and covering freight.',
  },
  {
    term: 'Step Deck — Drop Deck',
    category: 'Equipment',
    definition:
      'A flatbed variant with two deck levels — a higher front section and a lower rear section. The stepped design allows taller cargo (up to about 10 feet) without requiring an oversize permit. Used for heavy equipment, farm machinery, and large manufactured items that won\'t fit on a standard flatbed.',
  },
  {
    term: 'Hotshot',
    category: 'Equipment',
    definition:
      'Expedited freight delivery using a medium-duty pickup truck and a flatbed or gooseneck trailer (typically 20-40 feet). Hotshot trucks can carry loads up to about 16,500 lbs. Faster and more flexible than full truckload, but more expensive per mile. Common in oilfield, construction, and manufacturing.',
  },
  {
    term: 'Lowboy',
    category: 'Equipment',
    definition:
      'A heavy-haul trailer with an extremely low deck (sometimes 18-24 inches off the ground) used to transport very tall or heavy equipment — bulldozers, cranes, large transformers. Requires special permits and often an escort vehicle. Not typically dispatched through standard load boards.',
  },
  {
    term: 'Power Only',
    category: 'Equipment',
    definition:
      'A load where the carrier provides only the tractor (power unit) — the trailer is provided by the shipper or broker. Common with drop-and-hook operations and for shippers who own their fleet of trailers. Often pays lower rates since the carrier has no trailer depreciation or maintenance cost.',
  },
  {
    term: 'Bobtail',
    category: 'Equipment',
    definition:
      'A semi-truck driving without a trailer attached. Drivers bobtail when repositioning between loads, returning from a drop yard, or deadheading back to a home base. Bobtail insurance is separate from loaded haul coverage — carriers need both.',
  },
  {
    term: 'Tanker',
    category: 'Equipment',
    definition:
      'A cylindrical trailer designed to haul liquid or dry bulk freight — fuel, chemicals, milk, grain, cement. Requires a tanker endorsement on the CDL. Tank loads often pay well due to the specialized equipment and endorsement requirement.',
  },
  {
    term: 'Conestoga',
    category: 'Equipment',
    definition:
      'A flatbed trailer with a retractable tarp system that rolls back like a curtain, covering the entire load. Combines the flexibility of a flatbed with the weather protection of a van. Popular for machinery, coils, and cargo that cannot be tarped by hand due to height or awkward shape.',
  },

  // ── Regulatory ─────────────────────────────────────────────────────────────

  {
    term: 'FMCSA — Federal Motor Carrier Safety Administration',
    category: 'Regulatory',
    definition:
      'The US federal agency that regulates the trucking industry. Issues DOT numbers, grants operating authority (MC numbers), sets HOS rules, requires ELD compliance, and maintains the SAFER database. Carriers must register with FMCSA before operating commercially in interstate commerce.',
  },
  {
    term: 'DOT Number — USDOT Number',
    category: 'Regulatory',
    definition:
      'A unique identifier assigned by FMCSA to commercial motor vehicles operating in interstate commerce. Required for trucks over 10,001 lbs GVWR carrying cargo across state lines, or any truck carrying hazardous materials. The DOT number must be displayed on both sides of the vehicle.',
  },
  {
    term: 'MC Number — Motor Carrier Number',
    category: 'Regulatory',
    definition:
      'Operating authority issued by FMCSA that allows a carrier to transport regulated commodities for hire in interstate commerce. Also called a docket number (MC-XXXXXX). Different from a DOT number — a carrier can have a DOT number without an MC number (if operating only intrastate or for private use).',
  },
  {
    term: 'CDL — Commercial Driver\'s License',
    category: 'Regulatory',
    definition:
      'A state-issued license required to operate commercial motor vehicles (CMV) over 26,001 lbs GVWR, vehicles carrying 16+ passengers, or any vehicle transporting hazardous materials. CDL classes: A (combination vehicles, including tractor-trailers), B (single vehicles over 26,001 lbs), C (smaller CMVs with HazMat or 16+ passengers).',
  },
  {
    term: 'HOS — Hours of Service',
    category: 'Regulatory',
    definition:
      'FMCSA rules limiting how many hours a driver can operate a CMV before mandatory rest. Key limits: 11-hour driving limit after 10 consecutive off-duty hours (property carriers), 14-hour on-duty window, 60/70-hour limit in 7/8 consecutive days. Violations result in fines and out-of-service orders.',
  },
  {
    term: 'ELD — Electronic Logging Device',
    category: 'Regulatory',
    definition:
      'A device mandated by FMCSA (since December 2017) that automatically records driving time, engine hours, vehicle movement, miles driven, and location. Replaces paper logbooks for most commercial drivers. Must be synced with enforcement officers during inspections. Exemptions exist for short-haul drivers and vehicles older than model year 2000.',
  },
  {
    term: 'IFTA — International Fuel Tax Agreement',
    category: 'Regulatory',
    definition:
      'A tax collection agreement between US states and Canadian provinces that simplifies fuel tax reporting for interstate carriers. Carriers file quarterly IFTA reports based on miles traveled per jurisdiction and fuel purchased. A single IFTA license covers all member jurisdictions — no need for individual state fuel tax permits.',
  },
  {
    term: 'IRP — International Registration Plan',
    category: 'Regulatory',
    definition:
      'An agreement between US states and Canadian provinces for registering commercial vehicles that travel in multiple jurisdictions. The carrier pays a single apportioned registration fee based on the percentage of miles traveled in each state. The IRP cab card must be carried in the vehicle at all times.',
  },
  {
    term: 'SAFER — Safety and Fitness Electronic Records',
    category: 'Regulatory',
    definition:
      'FMCSA\'s public database of motor carrier safety information. Contains DOT numbers, MC numbers, authority status, safety ratings, inspection records, and crash data. Accessible at safer.fmcsa.dot.gov. Shippers and brokers use SAFER to verify carrier authority and safety compliance before contracting loads.',
  },
  {
    term: 'Operating Authority',
    category: 'Regulatory',
    definition:
      'The FMCSA-issued permission (MC number) that allows a carrier to transport freight for hire in interstate commerce. Takes 21+ days to become active after filing. New authorities are often targeted by dispatchers because the carrier is building their client base. A carrier with no operating authority cannot legally be hired to move freight.',
  },
  {
    term: 'Common Authority',
    category: 'Regulatory',
    definition:
      'A type of operating authority that allows a carrier to haul general freight for any shipper on the open market (load boards, brokers, direct shippers). Contrasts with contract authority (specific clients only) and broker authority (arranging loads for others). Most owner-operators hold common authority.',
  },
  {
    term: 'Biennial Update',
    category: 'Regulatory',
    definition:
      'The required MCS-150 update filed with FMCSA every two years to keep a DOT number active. Failure to file results in deactivation of the DOT number and operating authority. The update must be filed online at FMCSA\'s Unified Registration System (URS).',
  },
  {
    term: 'CSA — Compliance, Safety, Accountability',
    category: 'Regulatory',
    definition:
      'FMCSA\'s enforcement and compliance measurement program. Scores carriers and drivers across 7 BASICs (Behavioral Analysis and Safety Improvement Categories): Unsafe Driving, Hours-of-Service Compliance, Driver Fitness, Controlled Substances/Alcohol, Vehicle Maintenance, Hazardous Materials Compliance, Crash Indicator. High CSA scores can result in targeted roadside inspections or loss of operating authority.',
  },
  {
    term: 'Level 1 Inspection',
    category: 'Regulatory',
    definition:
      'The most thorough roadside inspection — covers the driver (license, HOS logs, medical certificate) and the vehicle (brakes, tires, lights, cargo securement). Any critical violation results in an out-of-service (OOS) order, meaning the driver or vehicle cannot move until the violation is corrected.',
  },

  // ── Dispatch ───────────────────────────────────────────────────────────────

  {
    term: 'RPM — Rate Per Mile',
    category: 'Dispatch',
    definition:
      'The gross revenue divided by total miles on a load. The primary metric for evaluating load profitability. Calculated as: total load rate / total miles. A typical target for owner-operators is $2.50-$3.50 RPM, though this varies by equipment type, lane, and fuel prices. Dispatch fee is applied to the gross RPM.',
  },
  {
    term: 'Deadhead Miles',
    category: 'Dispatch',
    definition:
      'Miles driven without a paying load — repositioning from a delivery to the next pickup. Deadhead miles cost money (fuel, driver time, maintenance) without generating revenue. Minimizing deadhead is a key dispatching goal. Deadhead percentage = deadhead miles / total miles. Under 10% is generally good; over 20% hurts profitability.',
  },
  {
    term: 'Drop-and-Hook',
    category: 'Dispatch',
    definition:
      'A load where the driver drops an empty trailer at the shipper and hooks up a pre-loaded trailer — no waiting for loading. Eliminates detention time and speeds up the driver\'s cycle. Drop-and-hook loads are preferred because they are predictable and keep drivers moving. Common with high-volume shippers like Amazon, Walmart, and major food producers.',
  },
  {
    term: 'Live Load',
    category: 'Dispatch',
    definition:
      'A load where the driver waits at the shipper while the truck is loaded (as opposed to drop-and-hook). Can take 1-4 hours depending on the facility. Detention pay begins after a free time window (usually 2 hours). Live loads are less predictable — always ask the broker or shipper for expected loading times before accepting.',
  },
  {
    term: 'Detention',
    category: 'Dispatch',
    definition:
      'Compensation paid to the carrier when the shipper or consignee holds the driver beyond the agreed free time (usually 2 hours at each stop). Typically $50-75/hour after free time expires. Must be documented with timestamps on the BOL or driver app. Negotiate detention into the rate confirmation before loading.',
  },
  {
    term: 'Drop Yard',
    category: 'Dispatch',
    definition:
      'A designated lot where trailers are parked between loads. Carriers use drop yards when a driver needs to swap trailers, take a reset, or when a load is not immediately available. Some brokers use drop yards as staging areas. Drop yard fees may apply.',
  },
  {
    term: 'Team Drivers',
    category: 'Dispatch',
    definition:
      'Two drivers sharing one truck, allowing nearly 24-hour operation. One drives while the other sleeps in the sleeper berth. Team driving maximizes miles per week and is preferred for time-sensitive loads (just-in-time manufacturing, produce). Pay is split between drivers but the truck generates significantly more revenue.',
  },
  {
    term: 'Hot Load',
    category: 'Dispatch',
    definition:
      'An expedited or time-critical load that must be picked up and delivered as fast as possible — often same-day or next-day. Hot loads typically pay a premium rate (20-40% above market). Common in manufacturing (just-in-time parts) and emergency freight. Also called a rush load or time-critical shipment.',
  },
  {
    term: 'LTL — Less Than Truckload',
    category: 'Dispatch',
    definition:
      'Freight that does not fill an entire trailer. LTL shipments are consolidated with other shippers\' freight on the same truck. LTL carriers manage the consolidation and routing. Owner-operators typically haul FTL (full truckload) loads; LTL is usually handled by LTL-specific carriers like XPO, Old Dominion, or FedEx Freight.',
  },
  {
    term: 'FTL — Full Truckload',
    category: 'Dispatch',
    definition:
      'A load that fills or nearly fills an entire trailer, or is priced as if it does regardless of actual volume. The carrier hauls only one shipper\'s freight from origin to destination with no stops or consolidation. Most owner-operator dispatch is FTL. Also called TL (truckload).',
  },
  {
    term: 'Layover',
    category: 'Dispatch',
    definition:
      'When a driver must wait at a location (usually overnight) before pickup or delivery becomes available. Brokers may pay a layover fee to compensate the driver for lost time. Layovers are more common with receivers who have strict appointment windows.',
  },
  {
    term: 'Home Time',
    category: 'Dispatch',
    definition:
      'The time a driver spends at home between runs. Most drivers expect home time weekly or bi-weekly. Good dispatchers plan lanes that bring drivers back to their home base regularly. Drivers who are away from home too long often leave for a carrier offering better home time, even at slightly lower pay.',
  },
  {
    term: 'Driver Reset',
    category: 'Dispatch',
    definition:
      'A 34-hour consecutive off-duty period that resets the driver\'s 60/70-hour weekly clock under HOS rules. Drivers often plan resets at home. A reset typically happens once per week. Dispatchers must account for reset timing when booking loads, especially for drivers nearing their weekly hour limit.',
  },
  {
    term: 'Lumper',
    category: 'Dispatch',
    definition:
      'A third-party worker who loads or unloads freight at a warehouse or distribution center. Common at grocery DCs and large retail distribution facilities. The driver pays the lumper (typically $150-400 per stop) and the broker reimburses via a separate advance or next-day payment. Always confirm lumper policy before accepting a load.',
  },
  {
    term: 'TONU — Truck Order Not Used',
    category: 'Dispatch',
    definition:
      'A fee paid to the carrier when the broker or shipper cancels a load after the truck has been dispatched (usually after the driver has begun driving toward pickup). Standard TONU is $150-250 but varies by broker. Always confirm TONU terms in the rate confirmation before accepting a load.',
  },

  // ── Rates & Freight ────────────────────────────────────────────────────────

  {
    term: 'Spot Rate',
    category: 'Rates & Freight',
    definition:
      'The current market price for a one-time truckload shipment, negotiated in real time based on supply and demand. Spot rates fluctuate daily based on capacity, seasonality, fuel prices, and freight volume. Load boards (DAT, Truckstop.com) provide spot rate data by lane. Spot rates contrast with contract rates agreed for a set period.',
  },
  {
    term: 'Contract Rate',
    category: 'Rates & Freight',
    definition:
      'A pre-negotiated per-mile or flat rate agreed between a carrier and shipper/broker for a set volume of loads over a defined period (typically 6-12 months). Contract rates provide revenue predictability but may be above or below spot market. Large shippers (Amazon, Walmart, food manufacturers) run contract freight programs.',
  },
  {
    term: 'Linehaul Rate',
    category: 'Rates & Freight',
    definition:
      'The base transportation rate for moving freight from origin to destination, excluding accessorial charges (fuel surcharge, detention, layover, etc.). The linehaul rate is usually quoted per mile. Some brokers quote a flat linehaul rate for the entire load regardless of actual miles.',
  },
  {
    term: 'FSC — Fuel Surcharge',
    category: 'Rates & Freight',
    definition:
      'An additional per-mile or percentage charge added to the base rate to offset fuel cost fluctuations. FSC is typically tied to the DOE (Department of Energy) weekly diesel price index. On contract freight, FSC is published on a table and adjusts weekly or monthly. On spot loads, FSC is usually built into the all-in rate.',
  },
  {
    term: 'Accessorial Charges',
    category: 'Rates & Freight',
    definition:
      'Charges for services beyond basic point-to-point transportation. Common accessorials: detention, layover, lumper fee, fuel surcharge, team driver surcharge, hazmat fee, oversize permit fee, inside delivery, lift gate. Always itemize accessorials on the invoice — they add up quickly.',
  },
  {
    term: 'All-In Rate',
    category: 'Rates & Freight',
    definition:
      'A single quoted rate that includes all charges — linehaul, fuel surcharge, and any anticipated accessorials. Common on spot loads booked through load boards. The broker and carrier agree on a total dollar amount for the load rather than breaking out individual components.',
  },
  {
    term: 'Gross Revenue',
    category: 'Rates & Freight',
    definition:
      'The total amount the carrier earns from a load before deducting the dispatch fee, fuel, insurance, or other expenses. On a load paying $3,000 all-in, the gross revenue is $3,000. The dispatch fee (typically 7-10%) is calculated against gross revenue, not net.',
  },
  {
    term: 'Net Revenue',
    category: 'Rates & Freight',
    definition:
      'Gross revenue minus the dispatch fee and any broker deductions (Quick Pay fees, accessorials paid by carrier). Net revenue is what the carrier actually receives. On a $3,000 load with 8% dispatch and $75 detention paid, the carrier nets $3,000 - $240 - $75 = $2,685.',
  },
  {
    term: 'Market Rate',
    category: 'Rates & Freight',
    definition:
      'The average going rate for a lane at a given time, based on current spot market data. DAT and Truckstop.com publish lane-level market rate data (average, high, low) updated daily. A good dispatcher knows the market rate before negotiating so they can push back if a broker\'s offer is below market.',
  },
  {
    term: 'Quick Pay',
    category: 'Rates & Freight',
    definition:
      'A broker service that pays the carrier faster than standard terms (usually within 1-2 business days instead of net 30-45) in exchange for a fee (typically 1.5-3% of the invoice). Useful for carriers with tight cash flow. Compare quick pay fees against factoring costs — sometimes factoring is cheaper.',
  },
  {
    term: 'Factoring',
    category: 'Rates & Freight',
    definition:
      'A financial service where the carrier sells its unpaid invoices to a factoring company at a discount (usually 2-5%) in exchange for immediate payment (same day or next day). The factor then collects from the broker or shipper. Factoring solves cash flow gaps for carriers waiting on net 30+ payment terms.',
  },
  {
    term: 'Net 30 / Net 45',
    category: 'Rates & Freight',
    definition:
      'Payment terms indicating the invoice is due 30 or 45 calendar days after the invoice date or delivery date. Brokers set their own payment terms — check before accepting loads from a new broker. Some brokers offer quick pay at a discount. Slow-pay brokers (beyond net 45) should be flagged in your system.',
  },

  // ── Business ───────────────────────────────────────────────────────────────

  {
    term: 'Carrier',
    category: 'Business',
    definition:
      'A company or individual (owner-operator) that physically moves freight using their own trucks. The carrier holds the operating authority (MC number) and is responsible for safe delivery. In the dispatch relationship: the dispatcher represents the carrier to brokers and shippers.',
  },
  {
    term: 'Owner-Operator',
    category: 'Business',
    definition:
      'A truck driver who owns (or leases) their own truck and operates as an independent business rather than as an employee of a large carrier. Owner-operators hold their own MC number and DOT number, set their own rates, and choose their own loads. They are the primary clients of independent dispatch services.',
  },
  {
    term: 'Dispatcher',
    category: 'Business',
    definition:
      'A person or company that finds loads for carriers, negotiates rates with brokers or shippers, manages the paperwork workflow, and keeps trucks moving. Independent dispatchers charge a percentage of gross revenue (typically 7-10%) and work for multiple carriers simultaneously. They are not employees of the carrier.',
  },
  {
    term: 'Broker',
    category: 'Business',
    definition:
      'A licensed intermediary (holds broker authority from FMCSA) that connects shippers with carriers. Brokers find available freight, negotiate rates on both sides, and earn a margin (spread) between what the shipper pays and what the carrier receives. Examples: Echo Global Logistics, Coyote Logistics, CH Robinson.',
  },
  {
    term: 'Shipper',
    category: 'Business',
    definition:
      'The company or individual that has freight to move and either hires a carrier directly or books through a broker. The shipper is responsible for preparing the BOL, loading the freight (in many cases), and paying the broker or carrier. Large shippers (manufacturers, retailers) may have dedicated carrier programs.',
  },
  {
    term: 'Consignee',
    category: 'Business',
    definition:
      'The receiver of the freight — the person or business at the destination that takes possession when the load is delivered. The consignee signs the BOL at delivery, creating the POD. If the consignee notes damage or shortages on the BOL, it creates a freight claim risk.',
  },
  {
    term: 'Load Board',
    category: 'Business',
    definition:
      'An online marketplace where brokers post available loads and carriers search for freight. The two dominant load boards in the US are DAT and Truckstop.com (ITS). Both offer real-time lane rate data, broker credit scores, and load-matching tools. Most owner-operators subscribe to at least one load board.',
  },
  {
    term: 'DAT',
    category: 'Business',
    definition:
      'The largest truckload load board in North America with millions of daily load postings. DAT also publishes lane rate data (average, high, low by lane) and broker credit scores. A DAT subscription is standard for dispatchers and owner-operators searching for spot freight. Pricing varies by plan level.',
  },
  {
    term: 'Truckstop.com — ITS',
    category: 'Business',
    definition:
      'The second-largest truckload load board, operated by Internet Truckstop. Competes directly with DAT. Offers load posting, carrier search, lane analytics, and broker credit information. Some brokers post exclusively on Truckstop.com, making it worth subscribing to both.',
  },
  {
    term: 'Double Brokering',
    category: 'Business',
    definition:
      'An illegal or unethical practice where a broker books a load and then re-brokers it to another broker without the original shipper\'s knowledge. The second broker then hires a carrier. This creates liability issues, payment delays, and compliance problems. Red flags include extremely low rates, vague pickup instructions, and brokers who can\'t answer basic load questions.',
  },
  {
    term: 'Dispatch Fee',
    category: 'Business',
    definition:
      'The percentage of gross load revenue that the dispatcher charges the carrier for their services. Typically 7-10% of gross. On a $3,000 load at 8%, the dispatch fee is $240. The fee is usually collected by the dispatcher directly from the broker payment before forwarding the balance to the carrier.',
  },
  {
    term: 'Lane',
    category: 'Business',
    definition:
      'A specific origin-to-destination freight corridor. Example: Dallas, TX to Atlanta, GA is a lane. Some lanes pay well consistently (high demand, low capacity) while others are notoriously low-paying. Knowing the market rate for the lanes your drivers run is fundamental to dispatching profitably.',
  },
  {
    term: 'Freight Claim',
    category: 'Business',
    definition:
      'A formal claim filed by a shipper or consignee against the carrier for loss, damage, or shortage of freight. The carrier\'s cargo insurance covers claims up to the policy limit. Claims can result in payment deductions if not handled promptly. Best defense is a clean, fully signed BOL with no exceptions noted at pickup.',
  },
  {
    term: 'Power Unit',
    category: 'Business',
    definition:
      'The truck or tractor — the engine and cab portion of a semi. Fleet size is measured in power units. A carrier with 1 power unit is a solo owner-operator; 2-3 is a micro-carrier. FMCSA SAFER reports power unit count as part of carrier safety data, which is used to estimate fleet size for lead scoring.',
  },
  {
    term: 'Broker Authority',
    category: 'Business',
    definition:
      'An FMCSA-issued operating authority (MC number prefixed with "FF" or just MC) that allows a company to arrange transportation for others without owning the trucks. Brokers must maintain a $75,000 surety bond (BMC-84) or trust fund. Dispatchers who never touch the freight do not need broker authority, but those who control movement may.',
  },
  {
    term: 'Surety Bond — BMC-84',
    category: 'Business',
    definition:
      'A $75,000 financial guarantee required of freight brokers by FMCSA. The bond protects carriers and shippers if the broker fails to pay or commits fraud. Carriers should verify a broker\'s bond status through FMCSA before hauling for them. A broker without an active bond cannot legally arrange freight.',
  },
  {
    term: 'Freight Corridor',
    category: 'Business',
    definition:
      'A major route between two geographic hubs with consistently high freight volume in both directions. Example: I-10 between Los Angeles and Dallas/Houston; I-95 along the East Coast. Running corridors reduces deadhead because loads are available in both directions. Dispatchers look for round-trip lanes to minimize empty miles.',
  },

]
