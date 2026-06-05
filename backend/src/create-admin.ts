import "dotenv/config";
import { connectDB } from "./db.js";
import { AuthorizedUser } from "./models/index.js";

async function createAdmin() {
  await connectDB();

  const admin = await AuthorizedUser.findOneAndUpdate(
    { email: "budalsagar2020@gmail.com" },
    {
      email: "budalsagar2020@gmail.com",
      password: "password123",
      role: "Admin",
      name: "Budal Sagar",
    },
    { upsert: true, new: true }
  );

  console.log("[ADMIN] Account ready:");
  console.log(`  Name:     ${admin.name}`);
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Role:     ${admin.role}`);
  console.log(`  Password: password123`);

  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("[ADMIN] Failed:", err);
  process.exit(1);
});
