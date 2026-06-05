import "dotenv/config";
import { connectDB } from "./db.js";
import {
  Video,
  Equipment,
  Assignment,
  AuthorizedUser,
  Category,
  Operator,
} from "./models/index.js";
import { setSequence } from "./utils/counter.js";

const seedData = {
  videos: [
    { id: 1, name: "2026 Summer Brand Launch", unique_code: "VID-SUM-001", duration: 3.5, status: "uploaded", category: "Marketing" },
    { id: 2, name: "Getting Started with React 19", unique_code: "VID-TUT-052", duration: 12, status: "not uploaded", category: "Tutorial" },
    { id: 3, name: "Behind the Scenes: Tokyo Vlog", unique_code: "VID-VLO-011", duration: 8.4, status: "uploaded", category: "Vlog" },
  ],
  equipment: [
    { id: 1, equipment_name: "Sony FX3 Cinema Camera", total_quantity: 3, available_quantity: 2, unique_prefix: "CANTOR-SONY", unit_ids: ["CANTOR-SONY-01", "CANTOR-SONY-02", "CANTOR-SONY-03"] },
    { id: 2, equipment_name: "Sennheiser AVX Wireless Mic", total_quantity: 5, available_quantity: 4, unique_prefix: "CANTOR-SENN", unit_ids: ["CANTOR-SENN-01", "CANTOR-SENN-02", "CANTOR-SENN-03", "CANTOR-SENN-04", "CANTOR-SENN-05"] },
    { id: 3, equipment_name: "DJI Ronin RS3 Gimbal", total_quantity: 2, available_quantity: 2, unique_prefix: "CANTOR-DJIR", unit_ids: ["CANTOR-DJIR-01", "CANTOR-DJIR-02"] },
    { id: 4, equipment_name: "Aputure 300d II LED Light", total_quantity: 4, available_quantity: 4, unique_prefix: "CANTOR-APUT", unit_ids: ["CANTOR-APUT-01", "CANTOR-APUT-02", "CANTOR-APUT-03", "CANTOR-APUT-04"] },
  ],
  assignments: [
    { assignment_id: 1, equipment_id: 1, user_name: "Carlos Sainz", checkout_date: "2026-06-01", status: "Out", unit_id: "CANTOR-SONY-01" },
    { assignment_id: 2, equipment_id: 2, user_name: "Emma Watson", checkout_date: "2026-06-03", status: "Out", unit_id: "CANTOR-SENN-01" },
    { assignment_id: 3, equipment_id: 3, user_name: "Lando Norris", checkout_date: "2026-06-02", status: "Returned" },
  ],
  authorized_users: [
    { email: "budalsagar2020@gmail.com", password: "password123", role: "Admin", name: "Budal Sagar" },
  ],
  categories: ["Marketing", "Tutorial", "Vlog", "Special Promo", "Raw Footage"],
  operators: ["John Doe", "Jane Smith", "Alex Rivera", "Taylor Kroeger"],
};

async function seed() {
  await connectDB();

  const videoCount = await Video.countDocuments();
  if (videoCount > 0) {
    console.log("[SEED] Database already has data. Skipping seed.");
    process.exit(0);
  }

  console.log("[SEED] Seeding database...");

  await Video.insertMany(seedData.videos);
  await Equipment.insertMany(seedData.equipment);
  await Assignment.insertMany(seedData.assignments);
  await AuthorizedUser.insertMany(seedData.authorized_users);
  await Category.insertMany(seedData.categories.map((name) => ({ name })));
  await Operator.insertMany(seedData.operators.map((name) => ({ name })));

  await setSequence("video", 3);
  await setSequence("equipment", 4);
  await setSequence("assignment", 3);
  await setSequence("customFolder", 0);

  console.log("[SEED] Database seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[SEED] Failed:", err);
  process.exit(1);
});
