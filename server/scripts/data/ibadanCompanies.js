/**
 * SIWES placement centres in IBADAN.
 *
 * Scope is deliberately narrow: organisations physically in Ibadan that take
 * industrial-training students from AATU's four faculties. Nothing outside the
 * city — a student can't commute to Lagos.
 *
 * ── On accuracy ──
 * The ITF's approved-employer roster is behind a login and isn't published, so
 * this list is assembled from known Ibadan institutions rather than an official
 * download. Each entry therefore carries its AREA (Oluyole Industrial Estate,
 * Ring Road, Agodi…) rather than an invented street number: an area is
 * something we can stand behind, a fabricated house number is not. Geocoding
 * records the resulting precision, and the UI labels approximate pins as such.
 *
 * Students must still apply through their SIWES coordinator and confirm the
 * address with the organisation — the directory exists to help them find
 * housing within reach, not to guarantee a place.
 */

const ENG = 'Engineering';
const NAS = 'Natural & Applied Sciences';
const BIO = 'Biological Sciences';
const ENV = 'Environmental Sciences';

// Department sets, matching AATU's programmes.
const CIVIL = ['civil engineering'];
const MECH = ['mechanical engineering', 'mechatronics engineering'];
const ELEC = ['electrical engineering', 'electronics engineering'];
const COMPENG = ['computer engineering'];
const CHEM_ENG = ['chemical engineering', 'materials engineering'];
const AGRIC_ENG = ['agricultural engineering'];
const COMPUTING = ['computer science', 'computer engineering', 'information technology'];
const PHYS_SCI = ['physics', 'chemistry', 'mathematics', 'statistics'];
const LIFE = ['microbiology', 'biochemistry', 'biotechnology', 'biology'];
const BUILT = ['architecture', 'building technology', 'quantity surveying', 'surveying', 'estate management', 'urban and regional planning'];

const c = (name, industry, area, faculties, acceptedDepartments, extra = {}) => ({
	name, industry, area, faculties, acceptedDepartments,
	address: extra.address || area,
	city: 'Ibadan', state: 'Oyo',
	...extra,
});

export const IBADAN_COMPANIES = [
	// ══ RESEARCH INSTITUTES ══
	// Ibadan's real strength — it hosts more federal research institutes than
	// anywhere else in Nigeria, and they take students across every faculty.
	c('International Institute of Tropical Agriculture (IITA)', 'Agricultural research', 'Idi-Ose', [NAS, BIO, ENG], [...COMPUTING, ...LIFE, ...PHYS_SCI, ...AGRIC_ENG], {
		address: 'Oyo Road, Idi-Ose', siwesSlots: 40, website: 'https://www.iita.org',
		description: 'Africa\'s largest agricultural research institute. Takes students into laboratories, data/GIS units, engineering workshops and IT.',
	}),
	c('Nigerian Institute of Social and Economic Research (NISER)', 'Policy research', 'Ojoo', [NAS], [...COMPUTING, 'statistics', 'mathematics'], {
		address: 'Oyo Road, Ojoo', siwesSlots: 15,
		description: 'Federal policy research institute with data, statistics and computing placements.',
	}),
	c('Cocoa Research Institute of Nigeria (CRIN)', 'Agricultural research', 'Idi-Ayunre', [BIO, NAS, ENG], [...LIFE, 'chemistry', ...AGRIC_ENG], {
		siwesSlots: 20, description: 'Federal institute for cocoa and allied crops, with laboratory and engineering placements.',
	}),
	c('National Horticultural Research Institute (NIHORT)', 'Agricultural research', 'Idi-Ishin', [BIO, NAS, ENG], [...LIFE, 'chemistry', ...AGRIC_ENG], {
		address: 'Idi-Ishin, Jericho', siwesSlots: 25,
		description: 'Federal horticulture institute — tissue culture, food science, soil laboratories and farm engineering.',
	}),
	c('Forestry Research Institute of Nigeria (FRIN)', 'Forestry research', 'Jericho', [BIO, ENV, NAS], [...LIFE, 'urban and regional planning', 'surveying', 'chemistry'], {
		siwesSlots: 25, description: 'Federal forestry institute with laboratories, GIS/mapping and a large arboretum.',
	}),
	c('Institute of Agricultural Research and Training (IAR&T)', 'Agricultural research', 'Moor Plantation', [BIO, NAS, ENG], [...LIFE, ...AGRIC_ENG, 'chemistry'], {
		address: 'Moor Plantation, Apata', siwesSlots: 20,
		description: 'Obafemi Awolowo University\'s agricultural research institute at Moor Plantation.',
	}),
	c('Nigerian Stored Products Research Institute (NSPRI)', 'Food storage research', 'Onireke', [BIO, NAS, ENG], [...LIFE, 'chemistry', ...AGRIC_ENG], {
		siwesSlots: 15, description: 'Federal institute researching post-harvest storage, food quality and processing.',
	}),
	c('Institute for Advanced Medical Research and Training (IAMRAT)', 'Medical research', 'Agodi', [BIO, NAS], [...LIFE, 'chemistry'], {
		address: 'College of Medicine, UCH, Queen Elizabeth Road', siwesSlots: 12,
		description: 'UCH/University of Ibadan medical research institute — molecular biology and diagnostics.',
	}),
	c('Federal College of Animal Health and Production Technology', 'Education & research', 'Moor Plantation', [BIO], LIFE, {
		siwesSlots: 15, description: 'Veterinary and animal-production laboratories at Moor Plantation.',
	}),
	c('Nigerian Building and Road Research Institute (NBRRI) — Ibadan', 'Construction research', 'Ojoo', [ENV, ENG], [...BUILT, ...CIVIL, 'materials engineering'], {
		siwesSlots: 12, description: 'Materials testing and building-technology research.',
	}),

	// ══ POWER, UTILITIES & TELECOM ══
	c('Ibadan Electricity Distribution Company (IBEDC)', 'Power distribution', 'Agodi', [ENG, NAS], [...ELEC, ...MECH, ...COMPUTING], {
		address: 'Capital Building, Agodi Gate', siwesSlots: 30,
		description: 'Electricity distribution utility for the south-west — the main destination for electrical engineering trainees in Ibadan.',
	}),
	c('Transmission Company of Nigeria (TCN) — Ibadan Region', 'Power transmission', 'Ring Road', [ENG], [...ELEC, ...MECH], {
		siwesSlots: 20, description: 'National grid transmission substations and control-room operations.',
	}),
	c('Oyo State Water Corporation', 'Water utility', 'Eleyele', [ENG, ENV, BIO], [...CIVIL, ...MECH, 'microbiology', 'chemistry'], {
		siwesSlots: 15, description: 'Waterworks at Eleyele and Asejire — treatment plants, pumping and water quality laboratories.',
	}),
	c('MTN Nigeria — Ibadan', 'Telecommunications', 'Ring Road', [ENG, NAS], [...ELEC, ...COMPENG, ...COMPUTING], {
		siwesSlots: 15, description: 'Network operations, transmission and IT support.',
	}),
	c('Airtel Nigeria — Ibadan', 'Telecommunications', 'Ring Road', [ENG, NAS], [...ELEC, ...COMPENG, ...COMPUTING], {
		siwesSlots: 12, description: 'Regional network and technical support centre.',
	}),
	c('Globacom (Glo) — Ibadan', 'Telecommunications', 'Dugbe', [ENG, NAS], [...ELEC, ...COMPENG, ...COMPUTING], {
		siwesSlots: 12, description: 'Regional office covering network operations and customer technical support.',
	}),
	c('9mobile — Ibadan', 'Telecommunications', 'Bodija', [ENG, NAS], [...ELEC, ...COMPENG, ...COMPUTING], {
		siwesSlots: 10, description: 'Regional technical and network support.',
	}),
	c('FibreOne', 'Internet service provider', 'Bodija', [ENG, NAS], [...COMPUTING, ...ELEC], {
		siwesSlots: 10, description: 'Fibre broadband provider — installation, network operations and support.',
	}),
	c('ipNX Nigeria — Ibadan', 'Internet service provider', 'Ring Road', [ENG, NAS], [...COMPUTING, ...ELEC], {
		siwesSlots: 8, description: 'Enterprise connectivity and fibre infrastructure.',
	}),
	c('Nigerian Communications Commission (NCC) — Ibadan Zonal Office', 'Telecom regulation', 'Iyaganku', [ENG, NAS], [...ELEC, ...COMPUTING], {
		siwesSlots: 8, description: 'Spectrum monitoring and telecom regulation.',
	}),

	// ══ ICT & SOFTWARE ══
	c('Coast Research Technology', 'Software & IT services', 'Bodija', [NAS, ENG], [...COMPUTING, 'mathematics'], {
		siwesSlots: 10, description: 'Software development and technology research firm taking interns into web and data teams.',
	}),
	c('MOC Technologies', 'IT training & services', 'Bodija', [NAS, ENG], COMPUTING, {
		siwesSlots: 12, description: 'IT services and training provider with structured internship placements.',
	}),
	c("O'Bounce Technologies", 'Software development', 'Ring Road', [NAS, ENG], COMPUTING, {
		siwesSlots: 8, description: 'Software house working on web and mobile products.',
	}),
	c('Alusoft Technologies', 'Software development', 'Challenge', [NAS, ENG], COMPUTING, {
		siwesSlots: 8, description: 'Custom software and IT consultancy.',
	}),
	c('IChannel Technologies', 'IT services', 'Mokola', [NAS, ENG], COMPUTING, {
		siwesSlots: 8, description: 'Networking, hardware and IT support services.',
	}),
	c('SoftQuest Incorporated', 'Software development', 'Bodija', [NAS, ENG], COMPUTING, {
		siwesSlots: 8, description: 'Software development and IT consulting.',
	}),
	c('HiiT PLC — Ibadan', 'IT training', 'Ring Road', [NAS, ENG], COMPUTING, {
		siwesSlots: 15, description: 'National IT training institution running structured SIWES programmes.',
	}),
	c('Sidmach Technologies — Ibadan', 'Software & IT services', 'Dugbe', [NAS, ENG], COMPUTING, {
		siwesSlots: 8, description: 'Enterprise software and systems integration.',
	}),
	c('Zenith Bank — Ibadan IT Unit', 'Banking technology', 'Dugbe', [NAS], [...COMPUTING, 'statistics', 'mathematics'], {
		siwesSlots: 6, description: 'Regional IT operations and data unit.',
	}),
	c('First Bank of Nigeria — Ibadan IT Unit', 'Banking technology', 'Dugbe', [NAS], [...COMPUTING, 'statistics', 'mathematics'], {
		siwesSlots: 6, description: 'Regional IT operations and systems support.',
	}),
	c('Access Bank — Ibadan IT Unit', 'Banking technology', 'Ring Road', [NAS], [...COMPUTING, 'statistics'], {
		siwesSlots: 6, description: 'Regional IT and data operations.',
	}),
	c('National Bureau of Statistics — Oyo State Office', 'Government statistics', 'Agodi', [NAS], ['statistics', 'mathematics', ...COMPUTING], {
		siwesSlots: 10, description: 'Survey design, data collection and statistical analysis.',
	}),
	c('Galaxy Backbone — Ibadan', 'Government ICT', 'Agodi', [NAS, ENG], [...COMPUTING, ...ELEC], {
		siwesSlots: 6, description: 'Federal government ICT infrastructure and network services.',
	}),

	// ══ MANUFACTURING & PROCESSING ══
	// Mostly clustered at Oluyole Industrial Estate, Ibadan's main industrial hub.
	c('Nigerian Bottling Company (Coca-Cola) — Ibadan Plant', 'Beverage manufacturing', 'Oluyole', [ENG, NAS, BIO], [...MECH, ...ELEC, ...CHEM_ENG, 'microbiology', 'chemistry'], {
		address: 'Oluyole Industrial Estate', siwesSlots: 25,
		description: 'Bottling plant with production, maintenance, utilities and quality-control laboratories.',
	}),
	c('Seven-Up Bottling Company — Ibadan Plant', 'Beverage manufacturing', 'Oluyole', [ENG, NAS, BIO], [...MECH, ...ELEC, ...CHEM_ENG, 'microbiology', 'chemistry'], {
		address: 'Oluyole Industrial Estate', siwesSlots: 20,
		description: 'Beverage production, plant maintenance and laboratory quality assurance.',
	}),
	c('British American Tobacco Nigeria (BAT) — Ibadan Factory', 'Manufacturing', 'Oluyole', [ENG, NAS], [...MECH, ...ELEC, ...CHEM_ENG, 'chemistry'], {
		address: 'Oluyole Industrial Estate', siwesSlots: 20,
		description: 'Large automated factory — mechanical, electrical and process engineering placements.',
	}),
	c('Sumal Foods Limited', 'Food manufacturing', 'Ojoo', [ENG, BIO, NAS], [...MECH, ...ELEC, ...CHEM_ENG, ...LIFE], {
		address: 'Lagos–Ibadan Expressway, Ojoo', siwesSlots: 20,
		description: 'Food and beverage manufacturer with production, quality-control and maintenance placements.',
	}),
	c('FrieslandCampina WAMCO — Ibadan', 'Dairy manufacturing', 'Oluyole', [BIO, ENG, NAS], [...LIFE, ...MECH, ...CHEM_ENG, 'chemistry'], {
		siwesSlots: 15, description: 'Dairy processing and quality-assurance laboratories.',
	}),
	c('Fan Milk Nigeria — Ibadan', 'Dairy manufacturing', 'Oluyole', [BIO, ENG], [...LIFE, ...MECH, ...ELEC], {
		siwesSlots: 12, description: 'Dairy production, cold chain and plant maintenance.',
	}),
	c('Yale Foods', 'Food processing', 'Oluyole', [BIO, ENG], [...LIFE, ...MECH, ...CHEM_ENG], {
		siwesSlots: 10, description: 'Food processing and packaging with laboratory quality control.',
	}),
	c('Extreme Manufacturing Nigeria Limited', 'Industrial manufacturing', 'Oluyole', [ENG], [...MECH, ...ELEC, 'materials engineering'], {
		siwesSlots: 12, description: 'Metal fabrication and industrial manufacturing.',
	}),
	c('Baolyus Engineering Works Limited', 'Engineering works', 'Oluyole', [ENG], [...MECH, ...ELEC, 'materials engineering'], {
		siwesSlots: 10, description: 'Fabrication and mechanical engineering workshop.',
	}),
	c('Procter & Gamble Distribution — Ibadan', 'FMCG distribution', 'Oluyole', [ENG, NAS], [...MECH, ...COMPUTING], {
		siwesSlots: 8, description: 'Regional distribution and logistics operations.',
	}),
	c('Nestlé Nigeria — Ibadan Distribution', 'FMCG distribution', 'Oluyole', [ENG, BIO], [...MECH, ...LIFE], {
		siwesSlots: 8, description: 'Regional distribution, warehousing and quality operations.',
	}),
	c('Oluyole Industrial Estate — General Placements', 'Industrial estate', 'Oluyole', [ENG, NAS, BIO], [...MECH, ...ELEC, ...CHEM_ENG, ...LIFE], {
		siwesSlots: 50,
		description: 'Ibadan\'s main industrial hub, hosting manufacturing, food processing, packaging and pharmaceutical plants. Use this entry if your factory is on the estate but not listed separately.',
	}),
	c('Tuyil Pharmaceutical Industries — Ibadan Depot', 'Pharmaceuticals', 'Ring Road', [BIO, NAS], [...LIFE, 'chemistry'], {
		siwesSlots: 8, description: 'Pharmaceutical distribution and quality control.',
	}),

	// ══ CONSTRUCTION & INFRASTRUCTURE ══
	c('Reynolds Construction Company (RCC) — Ibadan', 'Construction', 'Ring Road', [ENG, ENV], [...CIVIL, ...BUILT, ...MECH], {
		siwesSlots: 20, description: 'Major civil engineering contractor — roads, bridges and buildings.',
	}),
	c('Craneburg Construction Company — Ibadan', 'Construction', 'Jericho', [ENG, ENV], [...CIVIL, ...BUILT], {
		siwesSlots: 15, description: 'Road and infrastructure contractor active across Oyo State.',
	}),
	c('BOA Construction Company', 'Construction', 'Ring Road', [ENG, ENV], [...CIVIL, ...BUILT], {
		siwesSlots: 12, description: 'Building and civil works contractor.',
	}),
	c('Beryl Engineering & Properties Ltd', 'Construction & property', 'Bodija', [ENG, ENV], [...CIVIL, ...BUILT], {
		siwesSlots: 10, description: 'Engineering and property development firm.',
	}),
	c('Julius Berger Nigeria — Ibadan Operations', 'Construction', 'Iwo Road', [ENG, ENV], [...CIVIL, ...BUILT, ...MECH], {
		siwesSlots: 15, description: 'Major contractor with road and infrastructure projects in the region.',
	}),
	c('CCECC Nigeria — Ibadan', 'Construction & rail', 'Moniya', [ENG, ENV], [...CIVIL, ...BUILT, ...MECH, ...ELEC], {
		siwesSlots: 15, description: 'Rail and civil infrastructure contractor; Moniya is the Ibadan rail terminus.',
	}),
	c('Setraco Nigeria — Ibadan', 'Construction', 'Iwo Road', [ENG, ENV], [...CIVIL, ...BUILT], {
		siwesSlots: 10, description: 'Road construction and civil engineering contractor.',
	}),
	c('Oyo State Road Maintenance Agency (OYSROMA)', 'Public works', 'Agodi', [ENG, ENV], [...CIVIL, ...BUILT], {
		siwesSlots: 15, description: 'State road maintenance and rehabilitation.',
	}),
	c('Nigerian Railway Corporation — Ibadan District', 'Rail transport', 'Moniya', [ENG], [...CIVIL, ...MECH, ...ELEC], {
		siwesSlots: 12, description: 'Rail operations, workshops and signalling at the Ibadan terminus.',
	}),
	c('Federal Road Safety Corps (FRSC) — Oyo Sector Command', 'Transport safety', 'Ojoo', [ENG, NAS], [...COMPUTING, ...CIVIL], {
		siwesSlots: 8, description: 'Vehicle inspection, data systems and road safety engineering.',
	}),

	// ══ HEALTH, LABORATORIES & PHARMA ══
	c('University College Hospital (UCH)', 'Healthcare', 'Agodi', [BIO, NAS, ENG], [...LIFE, 'chemistry', ...COMPUTING, ...ELEC], {
		address: 'Queen Elizabeth Road, Agodi', siwesSlots: 30,
		description: 'Nigeria\'s premier teaching hospital — medical laboratories, biomedical engineering and ICT.',
	}),
	c('Ring Road State Hospital', 'Healthcare', 'Ring Road', [BIO, NAS], [...LIFE, 'chemistry'], {
		siwesSlots: 12, description: 'State hospital with medical laboratory placements.',
	}),
	c('Adeoyo Maternity Teaching Hospital', 'Healthcare', 'Yemetu', [BIO], LIFE, {
		siwesSlots: 10, description: 'State teaching hospital laboratories.',
	}),
	c('Jericho Specialist Hospital', 'Healthcare', 'Jericho', [BIO], LIFE, {
		siwesSlots: 8, description: 'Specialist hospital with diagnostic laboratories.',
	}),
	c('Oluyoro Catholic Hospital', 'Healthcare', 'Oke-Offa', [BIO], LIFE, {
		siwesSlots: 8, description: 'Mission hospital with clinical laboratory services.',
	}),
	c('Afrilab Medical Diagnostics', 'Medical diagnostics', 'Bodija', [BIO, NAS], [...LIFE, 'chemistry'], {
		siwesSlots: 10, description: 'Diagnostic laboratory chain — haematology, chemical pathology and microbiology.',
	}),
	c('Cerba Lancet Laboratories — Ibadan', 'Medical diagnostics', 'Bodija', [BIO, NAS], [...LIFE, 'chemistry'], {
		siwesSlots: 10, description: 'International diagnostics network with an Ibadan laboratory.',
	}),
	c('Bolab Medical Laboratory', 'Medical diagnostics', 'Ring Road', [BIO], LIFE, {
		siwesSlots: 8, description: 'Independent medical laboratory.',
	}),
	c('Famt Medical Laboratory', 'Medical diagnostics', 'Mokola', [BIO], LIFE, {
		siwesSlots: 8, description: 'Clinical diagnostics laboratory.',
	}),
	c('Synlab Nigeria — Ibadan', 'Medical diagnostics', 'Bodija', [BIO, NAS], [...LIFE, 'chemistry'], {
		siwesSlots: 8, description: 'Diagnostic laboratory services.',
	}),
	c('NAFDAC — Oyo State Office', 'Regulation & laboratories', 'Agodi', [BIO, NAS], [...LIFE, 'chemistry'], {
		siwesSlots: 10, description: 'Food and drug regulation with analytical laboratories.',
	}),
	c('Standards Organisation of Nigeria (SON) — Oyo State', 'Standards & testing', 'Ring Road', [NAS, ENG, BIO], ['chemistry', 'physics', ...MECH, ...LIFE], {
		siwesSlots: 10, description: 'Product testing, metrology and standards laboratories.',
	}),
	c('Oyo State Ministry of Health — Public Health Laboratory', 'Public health', 'Agodi', [BIO, NAS], [...LIFE, 'chemistry', 'statistics'], {
		siwesSlots: 10, description: 'Public health laboratory and disease surveillance data.',
	}),
	c('Chi Pharmaceuticals — Ibadan Depot', 'Pharmaceuticals', 'Oluyole', [BIO, NAS], [...LIFE, 'chemistry'], {
		siwesSlots: 6, description: 'Pharmaceutical distribution and quality control.',
	}),

	// ══ ENVIRONMENT, SURVEYING, PLANNING & PROPERTY ══
	c('Going Green International Consults Limited', 'Environmental consultancy', 'Bodija', [ENV, BIO], [...BUILT, 'biology', 'microbiology'], {
		siwesSlots: 8, description: 'Environmental impact assessment and sustainability consulting.',
	}),
	c('Unique Botenv Nigeria Limited', 'Environmental consultancy', 'Ring Road', [ENV, BIO], [...BUILT, 'biology'], {
		siwesSlots: 6, description: 'Environmental and botanical consultancy services.',
	}),
	c('Greenstad Projects Limited', 'Environmental & construction', 'Akobo', [ENV, ENG], [...BUILT, ...CIVIL], {
		siwesSlots: 6, description: 'Environmental projects and construction consultancy.',
	}),
	c('Geomatics Nigeria Limited', 'Surveying & GIS', 'Jericho', [ENV, NAS], ['surveying', 'urban and regional planning', ...COMPUTING, 'mathematics'], {
		siwesSlots: 10, description: 'Land surveying, GIS and geospatial mapping.',
	}),
	c('Oyo State Ministry of Environment and Natural Resources', 'Government — environment', 'Agodi', [ENV, BIO], [...BUILT, 'biology', 'microbiology', 'chemistry'], {
		address: 'State Secretariat, Agodi', siwesSlots: 15,
		description: 'Environmental regulation, waste management and natural resources.',
	}),
	c('Oyo State Ministry of Works and Transport', 'Public works', 'Agodi', [ENG, ENV], [...CIVIL, ...BUILT], {
		address: 'State Secretariat, Agodi', siwesSlots: 25,
		description: 'State roads and infrastructure — civil engineering and surveying placements.',
	}),
	c('Oyo State Ministry of Lands, Housing and Urban Development', 'Government — lands', 'Agodi', [ENV], BUILT, {
		address: 'State Secretariat, Agodi', siwesSlots: 20,
		description: 'Land administration, urban planning and the state survey office.',
	}),
	c('Oyo State Housing Corporation', 'Housing development', 'Bodija', [ENV, ENG], [...BUILT, ...CIVIL], {
		siwesSlots: 15, description: 'State housing estates development and management.',
	}),
	c('Oyo State Urban and Physical Planning Board', 'Urban planning', 'Agodi', [ENV], BUILT, {
		siwesSlots: 12, description: 'Development control, planning permits and physical planning.',
	}),
	c('Oyo State Waste Management Authority', 'Waste management', 'Agodi', [ENV, BIO, ENG], [...BUILT, 'microbiology', ...CIVIL], {
		siwesSlots: 10, description: 'Municipal waste collection, treatment and environmental compliance.',
	}),
	c('Federal Ministry of Works and Housing — Oyo State Office', 'Public works', 'Iyaganku', [ENG, ENV], [...CIVIL, ...BUILT], {
		siwesSlots: 12, description: 'Federal roads and building projects in Oyo State.',
	}),
	c('Federal Ministry of Environment — Oyo State Office', 'Government — environment', 'Iyaganku', [ENV, BIO], [...BUILT, 'biology', 'chemistry'], {
		siwesSlots: 10, description: 'Environmental assessment and compliance monitoring.',
	}),
	c('Office of the Surveyor-General, Oyo State', 'Surveying', 'Agodi', [ENV], ['surveying', 'urban and regional planning', 'estate management'], {
		siwesSlots: 12, description: 'State cadastral survey, mapping and geodetic control.',
	}),
	c('Nigerian Institute of Town Planners — Oyo Chapter', 'Professional body', 'Bodija', [ENV], ['urban and regional planning', 'architecture'], {
		siwesSlots: 6, description: 'Professional body placing students with member planning practices.',
	}),
	c('Oyo State Fire Service', 'Emergency services', 'Agodi', [ENG, ENV], [...MECH, ...BUILT], {
		siwesSlots: 6, description: 'Fire safety engineering, building safety inspection and equipment maintenance.',
	}),

	// ══ AGRICULTURE & AGRO-PROCESSING ══
	c('Oyo State Ministry of Agriculture and Rural Development', 'Government — agriculture', 'Agodi', [BIO, ENG, ENV], [...LIFE, ...AGRIC_ENG, 'urban and regional planning'], {
		address: 'State Secretariat, Agodi', siwesSlots: 20,
		description: 'Agricultural extension, soil laboratories and rural infrastructure.',
	}),
	c('Oyo State Agricultural Development Programme (OYSADEP)', 'Agricultural development', 'Saki Road, Ojoo', [BIO, ENG], [...LIFE, ...AGRIC_ENG], {
		area: 'Ojoo', siwesSlots: 15, description: 'Agricultural extension services and farm mechanisation.',
	}),
	c('Zartech Limited — Ibadan', 'Poultry & feed', 'Oluyole', [BIO, ENG], [...LIFE, ...AGRIC_ENG, ...MECH], {
		siwesSlots: 10, description: 'Integrated poultry and animal feed production.',
	}),

	// ══ MEDIA & BROADCASTING (engineering side) ══
	c('Nigerian Television Authority (NTA) — Ibadan', 'Broadcasting', 'Agodi', [ENG, NAS], [...ELEC, ...COMPUTING], {
		siwesSlots: 12, description: 'Studio engineering, transmission and broadcast IT.',
	}),
	c('Federal Radio Corporation of Nigeria (FRCN) — Ibadan', 'Broadcasting', 'Iyaganku', [ENG, NAS], [...ELEC, ...COMPUTING], {
		address: 'Broadcasting House, Iyaganku', siwesSlots: 10,
		description: 'National radio zonal station — transmission and studio engineering.',
	}),
	c('Broadcasting Corporation of Oyo State (BCOS)', 'Broadcasting', 'Basorun', [ENG, NAS], [...ELEC, ...COMPUTING], {
		siwesSlots: 10, description: 'State radio and television — studio and transmitter engineering.',
	}),
	c('Splash FM', 'Broadcasting', 'Felele', [ENG, NAS], [...ELEC, ...COMPUTING], {
		siwesSlots: 6, description: 'Commercial radio station — studio and broadcast engineering.',
	}),
	c('Fresh FM Ibadan', 'Broadcasting', 'Challenge', [ENG, NAS], [...ELEC, ...COMPUTING], {
		siwesSlots: 6, description: 'Commercial radio — studio operations and transmission.',
	}),

	// ══ EDUCATION & INSTITUTIONAL LABORATORIES ══
	c('University of Ibadan — Central Laboratories', 'Higher education', 'Agbowo', [NAS, BIO, ENG], [...PHYS_SCI, ...LIFE, ...COMPUTING], {
		address: 'University of Ibadan, Agbowo', siwesSlots: 30,
		description: 'Multidisciplinary research laboratories and workshops open to industrial trainees.',
	}),
	c('University of Ibadan — MIS / ICT Directorate', 'Higher education ICT', 'Agbowo', [NAS, ENG], [...COMPUTING, ...ELEC], {
		siwesSlots: 15, description: 'Campus network, data centre and management information systems.',
	}),
	c('The Polytechnic, Ibadan — Engineering Workshops', 'Higher education', 'Sango', [ENG, NAS], [...MECH, ...ELEC, ...CIVIL, ...COMPUTING], {
		siwesSlots: 25, description: 'Engineering workshops and laboratories.',
	}),
	c('Lead City University — ICT Unit', 'Higher education ICT', 'Toll Gate', [NAS, ENG], COMPUTING, {
		siwesSlots: 8, description: 'Campus ICT infrastructure and support.',
	}),
	c('Emmanuel Alayande University of Education — Ibadan Campus', 'Higher education', 'Sango', [NAS, BIO], [...PHYS_SCI, ...LIFE], {
		siwesSlots: 10, description: 'Science laboratories and technical units.',
	}),
	c('Federal College of Education (Special), Oyo — Ibadan Liaison', 'Education', 'Mokola', [NAS], [...COMPUTING, 'mathematics'], {
		siwesSlots: 6, description: 'ICT and technical support unit.',
	}),

	// ══ LOGISTICS, AVIATION & SERVICES ══
	c('Ibadan Airport (NAMA / FAAN)', 'Aviation', 'Alakia', [ENG, NAS], [...ELEC, ...MECH, ...COMPUTING, 'physics'], {
		address: 'Ibadan Airport, Alakia', siwesSlots: 12,
		description: 'Airfield engineering, navigational aids and communications.',
	}),
	c('Nigerian Meteorological Agency (NiMet) — Ibadan', 'Meteorology', 'Alakia', [NAS, ENV], ['physics', 'mathematics', 'statistics', ...COMPUTING], {
		siwesSlots: 8, description: 'Weather observation, instrumentation and climate data.',
	}),
	c('Dangote Cement — Ibadan Depot', 'Building materials', 'Iwo Road', [ENG, ENV], [...MECH, ...CIVIL, 'materials engineering'], {
		siwesSlots: 10, description: 'Cement distribution, plant maintenance and logistics.',
	}),
	c('Lafarge Africa — Ibadan Depot', 'Building materials', 'Iwo Road', [ENG, ENV], [...MECH, ...CIVIL, 'materials engineering'], {
		siwesSlots: 8, description: 'Building materials distribution and technical support.',
	}),
	c('NNPC Retail — Ibadan Depot', 'Oil & gas', 'Apata', [ENG, NAS], [...MECH, ...CHEM_ENG, 'chemistry'], {
		siwesSlots: 10, description: 'Fuel depot operations, safety and quality testing.',
	}),
	c('Oyo State Signage and Advertisement Agency (OYSAA)', 'Government services', 'Agodi', [ENV, ENG], [...BUILT, ...CIVIL], {
		siwesSlots: 6, description: 'Outdoor structure permitting and structural safety checks.',
	}),
	c('Oyo State Bureau of Physical Planning and Development Control', 'Urban planning', 'Agodi', [ENV], BUILT, {
		siwesSlots: 10, description: 'Building plan approval and development control.',
	}),
	c('Marble Stitches', 'Manufacturing & design', 'Ring Road', [ENG, ENV], [...MECH, 'building technology'], {
		siwesSlots: 6, description: 'Ibadan firm known to take SIWES students in production and design roles.',
	}),
	c('Oyo State Investment and Public Private Partnership Agency (OYSIPA)', 'Government — investment', 'Agodi', [ENV, NAS], ['estate management', 'statistics', ...COMPUTING], {
		siwesSlots: 6, description: 'Infrastructure project development and investment data.',
	}),
];

export default IBADAN_COMPANIES;
