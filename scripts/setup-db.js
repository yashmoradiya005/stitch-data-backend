const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function initializeDatabase() {
  const pool = new Pool({
    connectionString:
      "postgresql://neondb_owner:npg_iWAh4Vptr8oJ@ep-odd-waterfall-aqyx9u5m.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  });

  try {
    console.log("🔄 Connecting to Neon Tech database...");

    // Test connection
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Connected successfully!");
    console.log("📅 Database time:", result.rows[0].now);

    console.log("\n📝 Reading schema...");
    const schemaPath = path.join(__dirname, "../src/db/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    // Split by semicolon and filter empty statements
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      await pool.query(statement);
      console.log(`   ✓ Complete`);
    }

    console.log("\n✅ Database schema initialized successfully!");
    console.log("📊 Tables created:");
    console.log("   - users");
    console.log("   - sessions\n");

    // Show tables
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    console.log("📋 Existing tables in database:");
    tables.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:");
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
