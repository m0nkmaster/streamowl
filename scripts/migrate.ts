/**
 * Database migration runner
 *
 * Runs SQL migration files from the migrations directory.
 * Tracks executed migrations in a migrations table.
 */

import { getPool } from "../lib/db.ts";

interface MigrationFile {
  name: string;
  path: string;
  content: string;
}

/**
 * Get all migration files from the migrations directory
 */
async function getMigrationFiles(): Promise<MigrationFile[]> {
  const migrationsDir = "./migrations";
  const files: MigrationFile[] = [];

  try {
    for await (const entry of Deno.readDir(migrationsDir)) {
      if (entry.isFile && entry.name.endsWith(".sql")) {
        const path = `${migrationsDir}/${entry.name}`;
        const content = await Deno.readTextFile(path);
        files.push({
          name: entry.name,
          path,
          content,
        });
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Migrations directory not found: ${migrationsDir}`);
      Deno.exit(1);
    }
    throw error;
  }

  // Sort by filename to ensure correct execution order
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    client.release();
  }
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations(): Promise<Set<string>> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.queryObject<{ name: string }>(
      "SELECT name FROM migrations ORDER BY id",
    );
    return new Set(result.rows.map((row) => row.name));
  } finally {
    client.release();
  }
}

/**
 * Mark a migration as executed
 */
async function markMigrationExecuted(name: string): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.queryObject(
      "INSERT INTO migrations (name) VALUES ($1)",
      [name],
    );
  } finally {
    client.release();
  }
}

/**
 * Execute a single migration
 */
async function executeMigration(migration: MigrationFile): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log(`Running migration: ${migration.name}`);
    await client.queryObject("BEGIN");
    await client.queryObject(migration.content);
    await markMigrationExecuted(migration.name);
    await client.queryObject("COMMIT");
    console.log(`✓ Migration ${migration.name} completed successfully`);
  } catch (error) {
    await client.queryObject("ROLLBACK");
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Migration ${migration.name} failed: ${message}`);
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  console.log("Starting migration process...\n");

  await ensureMigrationsTable();

  const migrationFiles = await getMigrationFiles();
  const executedMigrations = await getExecutedMigrations();

  const pendingMigrations = migrationFiles.filter(
    (m) => !executedMigrations.has(m.name),
  );

  if (pendingMigrations.length === 0) {
    console.log("No pending migrations found.");
    return;
  }

  console.log(`Found ${pendingMigrations.length} pending migration(s):\n`);

  for (const migration of pendingMigrations) {
    await executeMigration(migration);
  }

  console.log(`\n✓ All migrations completed successfully`);
}

// Run migrations if script is executed directly
if (import.meta.main) {
  try {
    await runMigrations();
    Deno.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    Deno.exit(1);
  }
}
