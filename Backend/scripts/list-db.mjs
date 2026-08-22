/* Lists every project in the DB with its owner's email — debugging helper. */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/software-world");

const users = await mongoose.connection.db.collection("users").find({}).toArray();
console.log("=== USERS ===");
for (const u of users) {
  console.log(`- ${u.email}  provider=${u.provider} verified=${u.isVerified} id=${u._id}`);
}

const projects = await mongoose.connection.db.collection("projects").find({}).toArray();
console.log("\n=== PROJECTS ===");
if (projects.length === 0) console.log("(none)");
for (const p of projects) {
  const owner = users.find((u) => String(u._id) === String(p.owner));
  console.log(`- "${p.name}" | ${p.repoUrl}`);
  console.log(`  owner=${owner?.email ?? p.owner} | lastAnalysis=${p.lastAnalysis ?? "never analyzed"} | id=${p._id}`);
}

const analyses = await mongoose.connection.db.collection("analyses").countDocuments();
console.log(`\nTotal analyses stored: ${analyses}`);

await mongoose.disconnect();
