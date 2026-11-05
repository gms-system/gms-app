/**
 * India Vehicle Makes & Models
 * Covers cars, SUVs, MPVs, vans sold in India from ~2005 to 2025.
 * Includes discontinued models still on the road.
 *
 * HOW TO CUSTOMIZE:
 *   - Add a new brand: add entry to INDIA_VEHICLES
 *   - Add a model: add to the brand's models array
 *   - Remove a model: delete from the array
 */

export interface VehicleBrand {
  make: string;
  models: string[];
}

export const INDIA_VEHICLES: VehicleBrand[] = [
  // ─── MARUTI SUZUKI ─────────────────────────────────────────────────────────
  {
    make: "Maruti Suzuki",
    models: [
      "800", "Alto", "Alto 800", "Alto K10",
      "WagonR", "WagonR 1.0", "WagonR CNG",
      "Swift", "Swift Dzire", "Dzire",
      "Baleno", "Ignis",
      "Celerio", "Celerio X",
      "S-Presso",
      "Ertiga", "XL6",
      "Brezza", "Vitara Brezza",
      "Grand Vitara",
      "Fronx",
      "Jimny",
      "Invicto",
      "Omni", "Eeco",
      "Ritz", "A-Star",
      "Zen", "Zen Estilo",
      "Sx4", "Ciaz",
      "Kizashi",
      "Gypsy",
    ],
  },

  // ─── HYUNDAI ───────────────────────────────────────────────────────────────
  {
    make: "Hyundai",
    models: [
      "Santro", "Santro Xing",
      "i10", "Grand i10", "Grand i10 Nios",
      "i20", "Elite i20", "Active i20", "New i20",
      "Aura",
      "Verna",
      "Creta",
      "Venue",
      "Tucson",
      "Exter",
      "Alcazar",
      "Ioniq 5",
      "Accent",
      "Getz",
      "Sonata",
      "Xcent",
      "Eon",
    ],
  },

  // ─── TATA MOTORS ───────────────────────────────────────────────────────────
  {
    make: "Tata",
    models: [
      "Nano",
      "Tiago", "Tiago EV", "Tiago NRG",
      "Tigor", "Tigor EV",
      "Altroz",
      "Nexon", "Nexon EV",
      "Harrier",
      "Safari",
      "Punch", "Punch EV",
      "Curvv", "Curvv EV",
      "Sierra EV",
      "Indigo", "Indigo CS", "Indigo Manza",
      "Indica", "Indica Vista",
      "Sumo", "Sumo Gold", "Sumo Grande",
      "Safari Storme",
      "Aria",
      "Bolt",
      "Zest",
      "Hexa",
      "Xenon",
    ],
  },

  // ─── MAHINDRA ──────────────────────────────────────────────────────────────
  {
    make: "Mahindra",
    models: [
      "Thar", "Thar Roxx",
      "Scorpio", "Scorpio Classic", "Scorpio N",
      "XUV700",
      "XUV400",
      "XUV300",
      "XUV500",
      "Bolero", "Bolero Neo", "Bolero Plus",
      "KUV100", "KUV100 NXT",
      "Marazzo",
      "Alturas G4",
      "BE 6e", "XEV 9e",
      "Verito", "Verito Vibe",
      "Quanto",
      "Xylo",
      "Renault Logan", // sold as Mahindra Logan earlier
      "TUV300",
      "e2o", "e2o Plus",
      "eVerito",
    ],
  },

  // ─── HONDA ─────────────────────────────────────────────────────────────────
  {
    make: "Honda",
    models: [
      "City", "City Hybrid",
      "Amaze",
      "Jazz",
      "WR-V",
      "Elevate",
      "Civic",
      "Accord",
      "CR-V",
      "BR-V",
      "HR-V",
      "Brio",
      "Mobilio",
    ],
  },

  // ─── TOYOTA ────────────────────────────────────────────────────────────────
  {
    make: "Toyota",
    models: [
      "Innova", "Innova Crysta", "Innova HyCross",
      "Fortuner", "Fortuner Legender",
      "Hilux",
      "Land Cruiser", "Land Cruiser Prado",
      "Camry", "Camry Hybrid",
      "Corolla", "Corolla Altis",
      "Etios", "Etios Liva", "Etios Cross",
      "Glanza",
      "Urban Cruiser", "Urban Cruiser Hyryder",
      "Rumion",
      "Vellfire",
      "Yaris",
      "Qualis",
    ],
  },

  // ─── KIAAA ─────────────────────────────────────────────────────────────────
  {
    make: "Kia",
    models: [
      "Seltos",
      "Sonet",
      "Carens",
      "EV6",
      "Carnival",
    ],
  },

  // ─── MG (MORRIS GARAGES) ───────────────────────────────────────────────────
  {
    make: "MG",
    models: [
      "Hector", "Hector Plus",
      "Astor",
      "ZS EV",
      "Comet EV",
      "Gloster",
      "Windsor EV",
    ],
  },

  // ─── VOLKSWAGEN ────────────────────────────────────────────────────────────
  {
    make: "Volkswagen",
    models: [
      "Polo",
      "Vento",
      "Taigun",
      "Virtus",
      "Tiguan",
      "T-Roc",
      "Passat",
      "Jetta",
      "Ameo",
    ],
  },

  // ─── SKODA ─────────────────────────────────────────────────────────────────
  {
    make: "Skoda",
    models: [
      "Kushaq",
      "Slavia",
      "Octavia",
      "Superb",
      "Kodiaq",
      "Rapid",
      "Fabia",
      "Yeti",
    ],
  },

  // ─── RENAULT ───────────────────────────────────────────────────────────────
  {
    make: "Renault",
    models: [
      "Kwid",
      "Triber",
      "Kiger",
      "Duster",
      "Captur",
      "Scala",
      "Lodgy",
      "Pulse",
      "Fluence",
      "Koleos",
    ],
  },

  // ─── NISSAN ────────────────────────────────────────────────────────────────
  {
    make: "Nissan",
    models: [
      "Magnite",
      "Kicks",
      "X-Trail",
      "Terrano",
      "Micra",
      "Sunny",
      "Evalia",
      "GT-R",
    ],
  },

  // ─── FORD ──────────────────────────────────────────────────────────────────
  {
    make: "Ford",
    models: [
      "Figo", "Figo Aspire",
      "Freestyle",
      "EcoSport",
      "Endeavour",
      "Mustang",
      "Fiesta",
      "Ikon",
      "Fusion",
    ],
  },

  // ─── JEEP ──────────────────────────────────────────────────────────────────
  {
    make: "Jeep",
    models: [
      "Compass",
      "Meridian",
      "Wrangler",
      "Grand Cherokee",
      "Renegade",
    ],
  },

  // ─── BMW ───────────────────────────────────────────────────────────────────
  {
    make: "BMW",
    models: [
      "1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series",
      "X1", "X2", "X3", "X4", "X5", "X6", "X7",
      "iX", "iX1", "iX3", "i4", "i5", "i7",
      "M2", "M3", "M4", "M5",
      "Z4",
    ],
  },

  // ─── MERCEDES-BENZ ─────────────────────────────────────────────────────────
  {
    make: "Mercedes-Benz",
    models: [
      "A-Class", "B-Class", "C-Class", "E-Class", "S-Class",
      "CLA", "CLS",
      "GLA", "GLB", "GLC", "GLE", "GLS",
      "G-Class",
      "EQS", "EQB", "EQE",
      "AMG GT",
      "Maybach S-Class", "Maybach GLS",
      "V-Class",
    ],
  },

  // ─── AUDI ──────────────────────────────────────────────────────────────────
  {
    make: "Audi",
    models: [
      "A3", "A4", "A5", "A6", "A7", "A8",
      "Q2", "Q3", "Q5", "Q7", "Q8",
      "e-tron", "e-tron GT", "Q8 e-tron",
      "RS5", "RS7", "R8",
      "TT",
    ],
  },

  // ─── VOLVO ─────────────────────────────────────────────────────────────────
  {
    make: "Volvo",
    models: [
      "XC40", "XC60", "XC90",
      "S60", "S90",
      "V40",
      "C40 Recharge",
    ],
  },

  // ─── JAGUAR LAND ROVER ─────────────────────────────────────────────────────
  {
    make: "Jaguar",
    models: [
      "XE", "XF", "XJ",
      "F-Type",
      "E-Pace", "F-Pace", "I-Pace",
    ],
  },
  {
    make: "Land Rover",
    models: [
      "Defender",
      "Discovery", "Discovery Sport",
      "Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque",
    ],
  },

  // ─── PORSCHE ───────────────────────────────────────────────────────────────
  {
    make: "Porsche",
    models: [
      "Cayenne", "Macan",
      "Panamera",
      "911", "718 Boxster", "718 Cayman",
      "Taycan",
    ],
  },

  // ─── LAMBORGHINI / FERRARI / MASERATI (premium) ────────────────────────────
  {
    make: "Lamborghini",
    models: ["Urus", "Huracan", "Aventador", "Revuelto"],
  },
  {
    make: "Ferrari",
    models: ["Roma", "Portofino", "SF90", "812", "296 GTB"],
  },
  {
    make: "Maserati",
    models: ["Ghibli", "Quattroporte", "Levante", "GranTurismo", "Grecale"],
  },

  // ─── ISUZU ─────────────────────────────────────────────────────────────────
  {
    make: "Isuzu",
    models: ["D-Max", "D-Max V-Cross", "MU-X"],
  },

  // ─── CITROEN ───────────────────────────────────────────────────────────────
  {
    make: "Citroen",
    models: ["C3", "C3 Aircross", "eC3", "C5 Aircross"],
  },

  // ─── LEXUS ─────────────────────────────────────────────────────────────────
  {
    make: "Lexus",
    models: ["ES", "LS", "LX", "NX", "RX", "UX", "LC", "LM", "RZ"],
  },

  // ─── BYD ───────────────────────────────────────────────────────────────────
  {
    make: "BYD",
    models: ["Atto 3", "Seal", "Sealion 6"],
  },

  // ─── FIAT ──────────────────────────────────────────────────────────────────
  {
    make: "Fiat",
    models: ["Punto", "Linea", "Avventura", "Abarth 595", "Abarth Punto"],
  },

  // ─── MITSUBISHI ────────────────────────────────────────────────────────────
  {
    make: "Mitsubishi",
    models: ["Outlander", "Pajero Sport", "Eclipse Cross", "Cedia"],
  },

  // ─── CHEVROLET / GM (discontinued in India but cars still on road) ──────────
  {
    make: "Chevrolet",
    models: ["Beat", "Spark", "Cruze", "Aveo", "Optra", "Tavera", "Trailblazer", "Captiva", "Sail"],
  },

  // ─── HINDUSTAN MOTORS (Ambassador still serviced) ──────────────────────────
  {
    make: "Hindustan Motors",
    models: ["Ambassador", "Contessa"],
  },

  // ─── DATSUN (discontinued) ─────────────────────────────────────────────────
  {
    make: "Datsun",
    models: ["Go", "Go+", "redi-Go"],
  },

  // ─── OLA ELECTRIC ──────────────────────────────────────────────────────────
  {
    make: "Ola Electric",
    models: ["S1", "S1 Pro", "S1 Air", "S1 X"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TWO-WHEELER CATALOG
// Motorcycles, scooters, mopeds sold in India ~2005–2025.
// HOW TO CUSTOMIZE: same pattern — add brand object or push to models array.
// ═══════════════════════════════════════════════════════════════════════════════

export const INDIA_TWO_WHEELERS: VehicleBrand[] = [
  // ─── HERO MOTOCORP ─────────────────────────────────────────────────────────
  {
    make: "Hero",
    models: [
      // Commuter motorcycles
      "Splendor Plus", "Splendor Pro", "Splendor iSmart", "Super Splendor",
      "HF Dawn", "HF Deluxe", "HF 100",
      "Passion Pro", "Passion XPro",
      "Glamour", "Glamour Xtec",
      "Xpulse 200", "Xpulse 200T", "Xpulse 200 4V",
      "Xtreme 125R", "Xtreme 160R", "Xtreme 200R", "Xtreme 200S",
      "Hunk", "Ignitor",
      "CD 100", "CD Dawn", "CD Deluxe",
      "Karizma", "Karizma R", "Karizma ZMR",
      "Achiever",
      // Scooters
      "Pleasure", "Pleasure Plus", "Pleasure Plus Xtec",
      "Maestro Edge", "Maestro Edge 110", "Maestro Edge 125",
      "Destini 125", "Destini 125 Prime",
      "Xoom 80", "Xoom 110",
    ],
  },

  // ─── HONDA ─────────────────────────────────────────────────────────────────
  {
    make: "Honda",
    models: [
      // Motorcycles
      "Shine", "Shine 125", "SP 125", "SP 160",
      "Unicorn", "Unicorn 150", "Unicorn 160",
      "CB Shine", "CB300F", "CB300R", "CB350", "CB350RS",
      "CB500F", "CB500X",
      "Hornet 2.0", "Hornet 160R",
      "X-Blade",
      "Livo",
      "Dream Neo", "Dream Yuga", "Dream 110",
      "Trigger",
      "CBR 150R", "CBR 250R", "CBR 650R",
      "Africa Twin",
      "Gold Wing",
      // Scooters
      "Activa 3G", "Activa 4G", "Activa 5G", "Activa 6G", "Activa 125",
      "Dio", "Dio 110",
      "Cliq",
      "Grazia", "Grazia 125",
      "Aviator",
      "Navi",
      "Eterno",
    ],
  },

  // ─── BAJAJ ─────────────────────────────────────────────────────────────────
  {
    make: "Bajaj",
    models: [
      // Motorcycles
      "Pulsar 125", "Pulsar 150", "Pulsar 150 Neon", "Pulsar 180",
      "Pulsar N160", "Pulsar N250", "Pulsar F250",
      "Pulsar NS160", "Pulsar NS200",
      "Pulsar RS200",
      "Pulsar 220F",
      "Avenger Street 160", "Avenger Street 220", "Avenger Cruise 220",
      "Dominar 250", "Dominar 400",
      "CT 100", "CT 110", "CT 110X",
      "Platina 100", "Platina 110",
      "Boxer 100",
      "Discover 100", "Discover 110", "Discover 125", "Discover 150",
      "V12", "V15",
      "Bike Chetak (Old)",
      // Scooters
      "Chetak EV",
    ],
  },

  // ─── TVS ───────────────────────────────────────────────────────────────────
  {
    make: "TVS",
    models: [
      // Motorcycles
      "Apache RTR 160", "Apache RTR 160 4V", "Apache RTR 180", "Apache RTR 200 4V",
      "Apache RR 310",
      "Raider 125",
      "Radeon",
      "Star City Plus",
      "Sport", "HLX 125",
      "Victor", "Flame",
      "Fiero", "Max 4R",
      // Scooters
      "Jupiter", "Jupiter 125", "Jupiter ZX",
      "Ntorq 125", "Ntorq 125 Race XP",
      "Zest 110",
      "Wego",
      "Scooty Pep+", "Scooty Streak", "Scooty Zest",
      "iQube", "iQube S", "iQube ST",
      // Mopeds
      "XL 100",
    ],
  },

  // ─── ROYAL ENFIELD ─────────────────────────────────────────────────────────
  {
    make: "Royal Enfield",
    models: [
      "Bullet 350", "Bullet 500",
      "Classic 350", "Classic 500",
      "Meteor 350",
      "Hunter 350",
      "Thunderbird 350", "Thunderbird 500", "Thunderbird X 350", "Thunderbird X 500",
      "Himalayan", "Himalayan 450",
      "Interceptor 650", "Continental GT 650",
      "Super Meteor 650",
      "Shotgun 650",
      "Scram 411",
    ],
  },

  // ─── YAMAHA ────────────────────────────────────────────────────────────────
  {
    make: "Yamaha",
    models: [
      // Motorcycles
      "FZ-S V3", "FZS-FI V3", "FZX",
      "R15 V3", "R15 V4", "R15M", "R15S",
      "MT-03", "MT-07", "MT-09", "MT-15",
      "YZF R3",
      "SZ-RR", "SZ-X",
      "FZ16", "FZ25", "FZS25",
      "Saluto", "Saluto RX",
      "Fazer 25",
      // Scooters
      "Fascino", "Fascino 125",
      "Ray-Z", "Ray-ZR", "Ray-ZR 125",
      "Aerox 155",
      "Cygnus Alpha",
    ],
  },

  // ─── SUZUKI ────────────────────────────────────────────────────────────────
  {
    make: "Suzuki",
    models: [
      // Motorcycles
      "Gixxer", "Gixxer SF", "Gixxer 250", "Gixxer SF 250",
      "V-Strom 650XT", "V-Strom SX",
      "Intruder", "Intruder 150",
      "Hayabusa",
      "Katana",
      "GS150R",
      // Scooters
      "Access 125", "Access 125 SE",
      "Burgman Street 125",
      "Let's", "Swish 125",
      "Avenis 125",
    ],
  },

  // ─── KTM ───────────────────────────────────────────────────────────────────
  {
    make: "KTM",
    models: [
      "Duke 125", "Duke 200", "Duke 250", "Duke 390",
      "RC 125", "RC 200", "RC 390",
      "Adventure 250", "Adventure 390",
    ],
  },

  // ─── KAWASAKI ──────────────────────────────────────────────────────────────
  {
    make: "Kawasaki",
    models: [
      "Ninja 300", "Ninja 400", "Ninja 650", "Ninja ZX-6R", "Ninja ZX-10R",
      "Z400", "Z650", "Z900",
      "Versys 650", "Versys-X 300",
      "W175", "W800",
    ],
  },

  // ─── TRIUMPH ───────────────────────────────────────────────────────────────
  {
    make: "Triumph",
    models: [
      "Speed 400", "Scrambler 400 X",
      "Street Triple", "Speed Triple",
      "Tiger 900", "Tiger 1200",
      "Bonneville T100", "Bonneville T120",
      "Thruxton",
    ],
  },

  // ─── HARLEY-DAVIDSON ───────────────────────────────────────────────────────
  {
    make: "Harley-Davidson",
    models: [
      "X440",
      "Fat Boy", "Street Bob", "Road Glide", "Road King",
      "Iron 883", "Iron 1200",
      "Forty-Eight",
      "Street 750", "Street Rod",
    ],
  },

  // ─── BMW MOTORRAD ──────────────────────────────────────────────────────────
  {
    make: "BMW Motorrad",
    models: ["G 310 R", "G 310 GS", "S 1000 RR", "S 1000 R", "R 1250 GS", "F 900 R", "F 900 XR"],
  },

  // ─── DUCATI ────────────────────────────────────────────────────────────────
  {
    make: "Ducati",
    models: ["Monster", "Panigale V2", "Panigale V4", "Multistrada V2", "Scrambler"],
  },

  // ─── JAWA / YEZDI ──────────────────────────────────────────────────────────
  {
    make: "Jawa",
    models: ["Jawa 42", "Jawa 42 Bobber", "Perak", "Classic Jawa"],
  },
  {
    make: "Yezdi",
    models: ["Roadster", "Scrambler", "Adventure"],
  },

  // ─── ATHER ─────────────────────────────────────────────────────────────────
  {
    make: "Ather",
    models: ["450X", "450 Plus", "450 Apex", "450S", "Rizta"],
  },

  // ─── OLA ELECTRIC (2W) ─────────────────────────────────────────────────────
  {
    make: "Ola Electric",
    models: ["S1", "S1 Pro", "S1 Air", "S1 X", "S1 X+"],
  },

  // ─── REVOLT ────────────────────────────────────────────────────────────────
  {
    make: "Revolt",
    models: ["RV300", "RV400", "RV400 BRZ"],
  },

  // ─── AMPERE ────────────────────────────────────────────────────────────────
  {
    make: "Ampere",
    models: ["Magnus EX", "Zeal EX", "Nexus", "V48"],
  },

  // ─── KINETIC ───────────────────────────────────────────────────────────────
  {
    make: "Kinetic",
    models: ["Kinetic Green Zing", "Kinetic Green Flex", "Honda Kinetic (Old)"],
  },

  // ─── LML ───────────────────────────────────────────────────────────────────
  {
    make: "LML",
    models: ["Star Euro", "Freedom", "Select"],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** All 4-wheeler brand names sorted alphabetically */
export const VEHICLE_MAKES: string[] = INDIA_VEHICLES.map(b => b.make).sort();

/** All 2-wheeler brand names sorted alphabetically */
export const TWO_WHEELER_MAKES: string[] = INDIA_TWO_WHEELERS.map(b => b.make).sort();

/** Get models for a given 4-wheeler make */
export function getModelsForMake(make: string): string[] {
  const brand = INDIA_VEHICLES.find(b => b.make === make);
  return brand ? brand.models.sort() : [];
}

/** Get models for a given 2-wheeler make */
export function getModelsForTwoWheelerMake(make: string): string[] {
  const brand = INDIA_TWO_WHEELERS.find(b => b.make === make);
  return brand ? brand.models.sort() : [];
}

/** Combined helper — returns correct catalog based on garage type */
export function getMakesForGarageType(garageType: string): string[] {
  if (garageType === "2_wheeler") return TWO_WHEELER_MAKES;
  if (garageType === "both") return [...VEHICLE_MAKES, ...TWO_WHEELER_MAKES].sort();
  return VEHICLE_MAKES; // default: 4_wheeler
}

export function getModelsForGarageType(make: string, garageType: string): string[] {
  if (garageType === "2_wheeler") return getModelsForTwoWheelerMake(make);
  if (garageType === "both") {
    return [
      ...getModelsForMake(make),
      ...getModelsForTwoWheelerMake(make),
    ].sort();
  }
  return getModelsForMake(make);
}
