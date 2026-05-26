import { pool } from "../src/db/connection";
import * as fs from "fs";
import path from "path";

async function initializeDatabase() {
  try {
    console.log("🔄 Initializing Neon Tech database...");

    // Read schema file
    const schemaPath = path.join(__dirname, "../src/db/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    // Split by semicolon and filter empty statements
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      await pool.query(statement);
    }

    console.log("✅ Database initialized successfully!");
    console.log(
      "📊 Tables created: users, sessions\n"
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

initializeDatabase();
