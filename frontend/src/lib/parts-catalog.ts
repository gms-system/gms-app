/**
 * Parts & Lubricants catalog used for quick-pick dropdowns when creating
 * inventory items or adding line items to estimates / invoices.
 *
 * Prices are INDICATIVE market prices (INR) and are meant to pre-fill the form —
 * the user can always edit them, or choose "Others" to type a custom item.
 *
 * To extend: add entries to SPARE_PARTS / LUBES below. The dropdowns update automatically.
 */

export interface SparePart {
  vehicle: string;      // e.g. "Maruti Suzuki Alto"
  part: string;         // e.g. "Clutch Plate"
  cost_price: number;   // purchase price
  selling_price: number;
  hsn_code?: string;
}

export interface Lube {
  brand: string;        // e.g. "Castrol"
  name: string;         // e.g. "Castrol GTX"
  grade: string;        // e.g. "10W-30"
  type: string;         // Engine Oil / Gear Oil / Brake Fluid / Coolant / ATF
  pack: string;         // e.g. "3.5 L"
  cost_price: number;
  selling_price: number;
  hsn_code?: string;
}

// Common HSN codes
const HSN_PARTS = "8708";      // Motor vehicle parts
const HSN_2W_PARTS = "8714";   // Two-wheeler parts
const HSN_FILTER = "8421";
const HSN_BATTERY = "8507";
const HSN_SPARK = "8511";
const HSN_LUBE = "2710";
const HSN_BRAKE_FLUID = "3819";
const HSN_COOLANT = "3820";

// Helper to build a vehicle's part list compactly: [part, cost, sell, hsn?]
type Row = [string, number, number, string?];
function veh(vehicle: string, rows: Row[]): SparePart[] {
  return rows.map(([part, cost_price, selling_price, hsn_code]) => ({
    vehicle, part, cost_price, selling_price, hsn_code: hsn_code ?? HSN_PARTS,
  }));
}

// ─── 4-Wheeler spare parts ─────────────────────────────────────────────────────
export const SPARE_PARTS: SparePart[] = [
  ...veh("Maruti Suzuki Alto", [
    ["Clutch Plate", 6300, 7000],
    ["Pressure Plate", 2800, 3300],
    ["Clutch Release Bearing", 650, 850],
    ["Front Brake Pads (Set)", 900, 1200],
    ["Rear Brake Shoes (Set)", 750, 1000],
    ["Air Filter", 220, 350, HSN_FILTER],
    ["Oil Filter", 180, 280, HSN_FILTER],
    ["Fuel Filter", 450, 650, HSN_FILTER],
    ["Spark Plug (Each)", 160, 250, HSN_SPARK],
    ["Wiper Blade (Pair)", 450, 700],
    ["Battery 35Ah", 3600, 4500, HSN_BATTERY],
    ["Front Shock Absorber (Each)", 1500, 2000],
    ["Rear Shock Absorber (Each)", 1100, 1500],
    ["Headlight Bulb H4", 180, 300],
    ["Timing Belt", 850, 1200],
    ["Radiator Fan Motor", 1800, 2400],
  ]),
  ...veh("Maruti Suzuki Swift", [
    ["Clutch Plate", 3200, 4000],
    ["Pressure Plate", 3000, 3800],
    ["Clutch Release Bearing", 800, 1050],
    ["Front Brake Pads (Set)", 1300, 1700],
    ["Rear Brake Shoes (Set)", 1000, 1350],
    ["Air Filter", 350, 500, HSN_FILTER],
    ["Oil Filter", 220, 320, HSN_FILTER],
    ["Fuel Filter", 600, 850, HSN_FILTER],
    ["Spark Plug (Each)", 220, 320, HSN_SPARK],
    ["Wiper Blade (Pair)", 550, 850],
    ["Battery 45Ah", 4800, 5800, HSN_BATTERY],
    ["Front Shock Absorber (Each)", 2200, 2900],
    ["Rear Shock Absorber (Each)", 1600, 2100],
    ["Headlight Assembly", 3800, 4800],
    ["Front Bumper", 3200, 4200],
    ["Side Mirror (Each)", 1400, 1900],
  ]),
  ...veh("Maruti Suzuki WagonR", [
    ["Clutch Plate", 2900, 3600],
    ["Pressure Plate", 2700, 3300],
    ["Front Brake Pads (Set)", 1000, 1350],
    ["Rear Brake Shoes (Set)", 850, 1150],
    ["Air Filter", 280, 420, HSN_FILTER],
    ["Oil Filter", 200, 300, HSN_FILTER],
    ["Spark Plug (Each)", 180, 270, HSN_SPARK],
    ["Wiper Blade (Pair)", 480, 750],
    ["Battery 35Ah", 3600, 4500, HSN_BATTERY],
    ["Front Shock Absorber (Each)", 1700, 2250],
    ["Headlight Bulb H4", 180, 300],
  ]),
  ...veh("Maruti Suzuki Dzire", [
    ["Clutch Plate", 3200, 4000],
    ["Pressure Plate", 3000, 3800],
    ["Front Brake Pads (Set)", 1300, 1700],
    ["Rear Brake Shoes (Set)", 1000, 1350],
    ["Air Filter", 350, 500, HSN_FILTER],
    ["Oil Filter", 220, 320, HSN_FILTER],
    ["Spark Plug (Each)", 220, 320, HSN_SPARK],
    ["Battery 45Ah", 4800, 5800, HSN_BATTERY],
    ["Front Shock Absorber (Each)", 2200, 2900],
  ]),
  ...veh("Maruti Suzuki Baleno", [
    ["Clutch Plate", 3500, 4400],
    ["Pressure Plate", 3200, 4000],
    ["Front Brake Pads (Set)", 1500, 1950],
    ["Rear Brake Pads (Set)", 1200, 1600],
    ["Air Filter", 400, 580, HSN_FILTER],
    ["Oil Filter", 240, 350, HSN_FILTER],
    ["Spark Plug (Each)", 260, 380, HSN_SPARK],
    ["Battery 45Ah", 4800, 5800, HSN_BATTERY],
    ["Wiper Blade (Pair)", 600, 900],
  ]),
  ...veh("Maruti Suzuki Ertiga", [
    ["Clutch Plate", 4200, 5200],
    ["Pressure Plate", 3800, 4700],
    ["Front Brake Pads (Set)", 1700, 2200],
    ["Rear Brake Shoes (Set)", 1300, 1700],
    ["Air Filter", 450, 650, HSN_FILTER],
    ["Oil Filter", 260, 380, HSN_FILTER],
    ["Battery 55Ah", 5800, 7000, HSN_BATTERY],
  ]),
  ...veh("Hyundai i10 / Grand i10", [
    ["Clutch Plate", 3400, 4200],
    ["Pressure Plate", 3100, 3900],
    ["Front Brake Pads (Set)", 1400, 1850],
    ["Rear Brake Shoes (Set)", 1100, 1450],
    ["Air Filter", 380, 550, HSN_FILTER],
    ["Oil Filter", 230, 340, HSN_FILTER],
    ["Spark Plug (Each)", 240, 350, HSN_SPARK],
    ["Wiper Blade (Pair)", 550, 850],
    ["Battery 45Ah", 4800, 5800, HSN_BATTERY],
    ["Front Shock Absorber (Each)", 2300, 3000],
  ]),
  ...veh("Hyundai i20", [
    ["Clutch Plate", 3800, 4700],
    ["Pressure Plate", 3500, 4300],
    ["Front Brake Pads (Set)", 1600, 2100],
    ["Rear Brake Pads (Set)", 1300, 1700],
    ["Air Filter", 420, 600, HSN_FILTER],
    ["Oil Filter", 250, 360, HSN_FILTER],
    ["Spark Plug (Each)", 280, 400, HSN_SPARK],
    ["Battery 45Ah", 4800, 5800, HSN_BATTERY],
  ]),
  ...veh("Hyundai Creta", [
    ["Clutch Plate", 5200, 6400],
    ["Pressure Plate", 4600, 5700],
    ["Front Brake Pads (Set)", 2200, 2850],
    ["Rear Brake Pads (Set)", 1800, 2350],
    ["Air Filter", 550, 780, HSN_FILTER],
    ["Oil Filter", 320, 450, HSN_FILTER],
    ["Battery 65Ah", 6800, 8200, HSN_BATTERY],
    ["Wiper Blade (Pair)", 750, 1100],
  ]),
  ...veh("Tata Nexon", [
    ["Clutch Plate", 4800, 5900],
    ["Pressure Plate", 4200, 5200],
    ["Front Brake Pads (Set)", 2000, 2600],
    ["Rear Brake Pads (Set)", 1600, 2100],
    ["Air Filter", 500, 720, HSN_FILTER],
    ["Oil Filter", 300, 430, HSN_FILTER],
    ["Battery 55Ah", 5800, 7000, HSN_BATTERY],
  ]),
  ...veh("Tata Punch", [
    ["Clutch Plate", 3600, 4500],
    ["Front Brake Pads (Set)", 1500, 1950],
    ["Rear Brake Shoes (Set)", 1200, 1600],
    ["Air Filter", 420, 600, HSN_FILTER],
    ["Oil Filter", 260, 380, HSN_FILTER],
    ["Battery 45Ah", 4800, 5800, HSN_BATTERY],
  ]),
  ...veh("Tata Tiago", [
    ["Clutch Plate", 3300, 4100],
    ["Front Brake Pads (Set)", 1300, 1700],
    ["Rear Brake Shoes (Set)", 1050, 1400],
    ["Air Filter", 380, 550, HSN_FILTER],
    ["Oil Filter", 240, 350, HSN_FILTER],
    ["Battery 35Ah", 3600, 4500, HSN_BATTERY],
  ]),
  ...veh("Honda City", [
    ["Clutch Plate", 4500, 5600],
    ["Pressure Plate", 4000, 5000],
    ["Front Brake Pads (Set)", 2000, 2600],
    ["Rear Brake Pads (Set)", 1600, 2100],
    ["Air Filter", 500, 720, HSN_FILTER],
    ["Oil Filter", 320, 450, HSN_FILTER],
    ["Spark Plug Iridium (Each)", 650, 900, HSN_SPARK],
    ["Battery 45Ah", 4800, 5800, HSN_BATTERY],
    ["Wiper Blade (Pair)", 700, 1050],
  ]),
  ...veh("Honda Amaze", [
    ["Clutch Plate", 3800, 4700],
    ["Front Brake Pads (Set)", 1600, 2100],
    ["Rear Brake Shoes (Set)", 1200, 1600],
    ["Air Filter", 450, 650, HSN_FILTER],
    ["Oil Filter", 300, 430, HSN_FILTER],
    ["Battery 45Ah", 4800, 5800, HSN_BATTERY],
  ]),
  ...veh("Mahindra XUV300 / XUV700", [
    ["Clutch Plate", 6500, 8000],
    ["Pressure Plate", 5800, 7200],
    ["Front Brake Pads (Set)", 2600, 3400],
    ["Rear Brake Pads (Set)", 2100, 2750],
    ["Air Filter", 650, 920, HSN_FILTER],
    ["Oil Filter", 380, 540, HSN_FILTER],
    ["Battery 65Ah", 6800, 8200, HSN_BATTERY],
  ]),
  ...veh("Mahindra Scorpio / Bolero", [
    ["Clutch Plate", 5800, 7200],
    ["Pressure Plate", 5200, 6500],
    ["Front Brake Pads (Set)", 2400, 3100],
    ["Rear Brake Shoes (Set)", 1900, 2500],
    ["Air Filter", 600, 850, HSN_FILTER],
    ["Oil Filter", 350, 500, HSN_FILTER],
    ["Diesel Filter", 900, 1250, HSN_FILTER],
    ["Battery 75Ah", 7800, 9400, HSN_BATTERY],
  ]),
  ...veh("Toyota Innova Crysta", [
    ["Clutch Plate", 7200, 8900],
    ["Pressure Plate", 6500, 8000],
    ["Front Brake Pads (Set)", 3200, 4100],
    ["Rear Brake Pads (Set)", 2600, 3400],
    ["Air Filter", 750, 1050, HSN_FILTER],
    ["Oil Filter", 420, 600, HSN_FILTER],
    ["Diesel Filter", 1400, 1900, HSN_FILTER],
    ["Battery 75Ah", 7800, 9400, HSN_BATTERY],
  ]),
  ...veh("Kia Seltos / Sonet", [
    ["Clutch Plate", 5000, 6200],
    ["Front Brake Pads (Set)", 2200, 2850],
    ["Rear Brake Pads (Set)", 1800, 2350],
    ["Air Filter", 550, 780, HSN_FILTER],
    ["Oil Filter", 320, 450, HSN_FILTER],
    ["Battery 65Ah", 6800, 8200, HSN_BATTERY],
  ]),
  ...veh("Renault Kwid", [
    ["Clutch Plate", 2800, 3500],
    ["Front Brake Pads (Set)", 950, 1250],
    ["Rear Brake Shoes (Set)", 800, 1050],
    ["Air Filter", 250, 380, HSN_FILTER],
    ["Oil Filter", 190, 290, HSN_FILTER],
    ["Battery 35Ah", 3600, 4500, HSN_BATTERY],
  ]),

  // ─── 2-Wheeler spare parts ─────────────────────────────────────────────────
  ...veh("Honda Activa", [
    ["Front Brake Shoe (Set)", 220, 320, HSN_2W_PARTS],
    ["Rear Brake Shoe (Set)", 220, 320, HSN_2W_PARTS],
    ["Drive Belt", 650, 900, HSN_2W_PARTS],
    ["Clutch Shoe / Weight Roller Set", 550, 780, HSN_2W_PARTS],
    ["Air Filter", 180, 280, HSN_FILTER],
    ["Spark Plug", 90, 150, HSN_SPARK],
    ["Battery 5Ah", 1300, 1700, HSN_BATTERY],
    ["Headlight Bulb", 90, 160, HSN_2W_PARTS],
    ["Side Mirror (Each)", 180, 280, HSN_2W_PARTS],
    ["Tyre 90/100-10 (Each)", 1150, 1500, HSN_2W_PARTS],
  ]),
  ...veh("Hero Splendor / HF Deluxe", [
    ["Clutch Plate (Set)", 380, 520, HSN_2W_PARTS],
    ["Brake Shoe (Set)", 180, 270, HSN_2W_PARTS],
    ["Chain Sprocket Kit", 850, 1200, HSN_2W_PARTS],
    ["Air Filter", 120, 190, HSN_FILTER],
    ["Spark Plug", 80, 130, HSN_SPARK],
    ["Battery 4Ah", 1100, 1450, HSN_BATTERY],
    ["Clutch Cable", 110, 180, HSN_2W_PARTS],
    ["Accelerator Cable", 100, 160, HSN_2W_PARTS],
    ["Headlight Bulb", 80, 140, HSN_2W_PARTS],
    ["Tyre 2.75-18 (Each)", 1050, 1400, HSN_2W_PARTS],
  ]),
  ...veh("Bajaj Pulsar 150 / 125", [
    ["Clutch Plate (Set)", 550, 750, HSN_2W_PARTS],
    ["Brake Pads Front (Set)", 280, 400, HSN_2W_PARTS],
    ["Brake Shoe Rear (Set)", 220, 320, HSN_2W_PARTS],
    ["Chain Sprocket Kit", 1250, 1700, HSN_2W_PARTS],
    ["Air Filter", 200, 300, HSN_FILTER],
    ["Spark Plug", 110, 180, HSN_SPARK],
    ["Battery 9Ah", 1900, 2500, HSN_BATTERY],
    ["Clutch Cable", 150, 240, HSN_2W_PARTS],
    ["Headlight Bulb", 120, 200, HSN_2W_PARTS],
  ]),
  ...veh("TVS Jupiter", [
    ["Brake Shoe (Set)", 220, 320, HSN_2W_PARTS],
    ["Drive Belt", 600, 850, HSN_2W_PARTS],
    ["Weight Roller Set", 300, 450, HSN_2W_PARTS],
    ["Air Filter", 170, 260, HSN_FILTER],
    ["Spark Plug", 90, 150, HSN_SPARK],
    ["Battery 5Ah", 1300, 1700, HSN_BATTERY],
  ]),
  ...veh("Royal Enfield Classic 350", [
    ["Clutch Plate (Set)", 1400, 1850, HSN_2W_PARTS],
    ["Brake Pads Front (Set)", 550, 750, HSN_2W_PARTS],
    ["Brake Pads Rear (Set)", 450, 620, HSN_2W_PARTS],
    ["Chain Sprocket Kit", 2400, 3100, HSN_2W_PARTS],
    ["Air Filter", 350, 500, HSN_FILTER],
    ["Oil Filter", 180, 280, HSN_FILTER],
    ["Spark Plug", 220, 330, HSN_SPARK],
    ["Battery 12Ah", 2800, 3500, HSN_BATTERY],
  ]),
  ...veh("Yamaha FZ / R15", [
    ["Clutch Plate (Set)", 750, 1000, HSN_2W_PARTS],
    ["Brake Pads Front (Set)", 350, 480, HSN_2W_PARTS],
    ["Brake Pads Rear (Set)", 300, 420, HSN_2W_PARTS],
    ["Chain Sprocket Kit", 1600, 2100, HSN_2W_PARTS],
    ["Air Filter", 260, 380, HSN_FILTER],
    ["Spark Plug", 150, 240, HSN_SPARK],
    ["Battery 7Ah", 1700, 2200, HSN_BATTERY],
  ]),
];

// ─── Lubricants ───────────────────────────────────────────────────────────────
type LRow = [string, string, string, string, number, number, string?]; // name, grade, type, pack, cost, sell, hsn
function brand(b: string, rows: LRow[]): Lube[] {
  return rows.map(([name, grade, type, pack, cost_price, selling_price, hsn_code]) => ({
    brand: b, name, grade, type, pack, cost_price, selling_price, hsn_code: hsn_code ?? HSN_LUBE,
  }));
}

export const LUBES: Lube[] = [
  ...brand("Castrol", [
    ["Castrol GTX", "20W-50", "Engine Oil (Mineral)", "3.5 L", 1150, 1450],
    ["Castrol Magnatec", "10W-30", "Engine Oil (Semi-Synthetic)", "3.5 L", 1700, 2100],
    ["Castrol Magnatec", "10W-40", "Engine Oil (Semi-Synthetic)", "3.5 L", 1700, 2100],
    ["Castrol Magnatec", "5W-30", "Engine Oil (Fully Synthetic)", "3.5 L", 2300, 2850],
    ["Castrol EDGE", "0W-20", "Engine Oil (Fully Synthetic)", "3.5 L", 2900, 3600],
    ["Castrol EDGE", "5W-40", "Engine Oil (Fully Synthetic)", "3.5 L", 2800, 3450],
    ["Castrol Activ 4T", "20W-40", "Engine Oil (2W)", "1 L", 330, 420],
    ["Castrol Power1 4T", "10W-40", "Engine Oil (2W Synthetic)", "1 L", 520, 650],
    ["Castrol Brake Fluid", "DOT 4", "Brake Fluid", "500 ml", 220, 300, HSN_BRAKE_FLUID],
    ["Castrol Radicool", "Ready-to-use", "Coolant", "1 L", 260, 350, HSN_COOLANT],
  ]),
  ...brand("Shell", [
    ["Shell Helix HX3", "20W-50", "Engine Oil (Mineral)", "3.5 L", 1100, 1400],
    ["Shell Helix HX5", "15W-40", "Engine Oil (Mineral)", "3.5 L", 1250, 1550],
    ["Shell Helix HX7", "10W-40", "Engine Oil (Semi-Synthetic)", "3.5 L", 1750, 2150],
    ["Shell Helix HX7", "5W-30", "Engine Oil (Semi-Synthetic)", "3.5 L", 1850, 2300],
    ["Shell Helix Ultra", "5W-40", "Engine Oil (Fully Synthetic)", "3.5 L", 2850, 3500],
    ["Shell Helix Ultra", "0W-20", "Engine Oil (Fully Synthetic)", "3.5 L", 3000, 3700],
    ["Shell Advance AX5", "20W-40", "Engine Oil (2W)", "1 L", 320, 410],
    ["Shell Advance Ultra", "10W-40", "Engine Oil (2W Synthetic)", "1 L", 560, 700],
    ["Shell Spirax", "80W-90", "Gear Oil", "1 L", 350, 460],
  ]),
  ...brand("Mobil", [
    ["Mobil Super 1000", "20W-50", "Engine Oil (Mineral)", "3.5 L", 1150, 1450],
    ["Mobil Super 2000", "10W-40", "Engine Oil (Semi-Synthetic)", "3.5 L", 1800, 2200],
    ["Mobil Super 3000", "5W-30", "Engine Oil (Fully Synthetic)", "3.5 L", 2400, 2950],
    ["Mobil 1", "0W-40", "Engine Oil (Fully Synthetic)", "4 L", 3600, 4400],
    ["Mobil 1", "5W-30", "Engine Oil (Fully Synthetic)", "4 L", 3400, 4200],
    ["Mobil Super Moto", "20W-40", "Engine Oil (2W)", "1 L", 340, 430],
    ["Mobil ATF 320", "Dexron III", "ATF (Automatic Transmission)", "1 L", 480, 620],
  ]),
  ...brand("Motul", [
    ["Motul 3000 4T", "20W-40", "Engine Oil (2W Mineral)", "1 L", 360, 460],
    ["Motul 5100 4T", "10W-40", "Engine Oil (2W Semi-Synthetic)", "1 L", 560, 700],
    ["Motul 7100 4T", "10W-40", "Engine Oil (2W Fully Synthetic)", "1 L", 900, 1150],
    ["Motul 300V", "10W-40", "Engine Oil (2W Racing)", "1 L", 1500, 1850],
    ["Motul 6100 Synergie+", "10W-40", "Engine Oil (Semi-Synthetic)", "3.5 L", 1900, 2350],
    ["Motul 8100 X-cess", "5W-40", "Engine Oil (Fully Synthetic)", "4 L", 3300, 4000],
    ["Motul Brake Fluid", "DOT 4", "Brake Fluid", "500 ml", 260, 350, HSN_BRAKE_FLUID],
    ["Motul Gear 300", "75W-90", "Gear Oil (Synthetic)", "1 L", 1100, 1400],
  ]),
  ...brand("Servo (IOCL)", [
    ["Servo Super", "20W-40", "Engine Oil (Mineral)", "3.5 L", 950, 1200],
    ["Servo Futura", "15W-40", "Engine Oil (Mineral)", "3.5 L", 1050, 1300],
    ["Servo Futura Synth", "5W-30", "Engine Oil (Synthetic)", "3.5 L", 1950, 2400],
    ["Servo 4T", "20W-40", "Engine Oil (2W)", "1 L", 260, 340],
    ["Servo Gear HP", "80W-90", "Gear Oil", "1 L", 280, 370],
    ["Servo Kool", "Ready-to-use", "Coolant", "1 L", 200, 280, HSN_COOLANT],
  ]),
  ...brand("HP Lubricants", [
    ["HP Milcy", "20W-40", "Engine Oil (Mineral)", "3.5 L", 950, 1200],
    ["HP Racer 4", "20W-40", "Engine Oil (2W)", "1 L", 260, 340],
    ["HP Racer Synth", "10W-30", "Engine Oil (2W Synthetic)", "1 L", 450, 570],
    ["HP Gear Oil", "80W-90", "Gear Oil", "1 L", 270, 360],
  ]),
  ...brand("Gulf", [
    ["Gulf Pride 4T", "20W-40", "Engine Oil (2W)", "1 L", 280, 360],
    ["Gulf Pride 4T Plus", "10W-30", "Engine Oil (2W Semi-Synthetic)", "1 L", 420, 530],
    ["Gulf Formula G", "5W-30", "Engine Oil (Fully Synthetic)", "3.5 L", 2200, 2700],
    ["Gulf Max", "20W-50", "Engine Oil (Mineral)", "3.5 L", 1050, 1300],
  ]),
  ...brand("Valvoline", [
    ["Valvoline All Fleet", "15W-40", "Engine Oil (Diesel)", "5 L", 1700, 2100],
    ["Valvoline SynPower", "5W-30", "Engine Oil (Fully Synthetic)", "3.5 L", 2350, 2900],
    ["Valvoline 4T", "20W-40", "Engine Oil (2W)", "1 L", 300, 390],
    ["Valvoline Brake Fluid", "DOT 3", "Brake Fluid", "500 ml", 190, 260, HSN_BRAKE_FLUID],
  ]),
  ...brand("Liqui Moly", [
    ["Liqui Moly Molygen", "5W-30", "Engine Oil (Fully Synthetic)", "4 L", 3500, 4300],
    ["Liqui Moly Top Tec 4100", "5W-40", "Engine Oil (Fully Synthetic)", "4 L", 3800, 4700],
    ["Liqui Moly Street 4T", "10W-40", "Engine Oil (2W Synthetic)", "1 L", 850, 1050],
  ]),
  ...brand("Total / TotalEnergies", [
    ["Total Quartz 5000", "20W-50", "Engine Oil (Mineral)", "3.5 L", 1100, 1400],
    ["Total Quartz 7000", "10W-40", "Engine Oil (Semi-Synthetic)", "3.5 L", 1750, 2150],
    ["Total Quartz 9000", "5W-40", "Engine Oil (Fully Synthetic)", "3.5 L", 2700, 3300],
    ["Total Hi-Perf 4T", "20W-40", "Engine Oil (2W)", "1 L", 300, 390],
  ]),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function sparePartLabel(p: SparePart) {
  return `${p.vehicle} — ${p.part}`;
}

export function lubeLabel(l: Lube) {
  return `${l.brand} ${l.name} ${l.grade} (${l.type}, ${l.pack})`;
}

/** Unique vehicles in the parts catalog, in insertion order. */
export const PART_VEHICLES: string[] = Array.from(new Set(SPARE_PARTS.map((p) => p.vehicle)));

/** Unique lube brands in insertion order. */
export const LUBE_BRANDS: string[] = Array.from(new Set(LUBES.map((l) => l.brand)));
