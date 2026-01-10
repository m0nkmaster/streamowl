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
  up: string;
  down?: string;
}

/**
 * Parse migration file content into up and down sections
 * Supports format:
 *   -- up
 *   SQL statements for up migration
 *   -- down
 *   SQL statements for down migration
 *
 * If no -- down marker is found, entire file is treated as up migration
 */
function parseMigrationContent(content: string): { up: string; down?: string } {
  const downMarker = "-- down";
  const downIndex = content.indexOf(downMarker);

  if (downIndex === -1) {
    // No down section, entire file is up migration
    return { up: content.trim() };
  }

  const up = content.substring(0, downIndex).trim();
  const down = content.substring(downIndex + downMarker.length).trim();

  return {
    up: up || content.trim(), // Fallback to full content if up section is empty
    down: down || undefined,
  };
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
        const { up, down } = parseMigrationContent(content);
        files.push({
          name: entry.name,
          path,
          up,
          down,
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
 * Remove migration from executed migrations table
 */
async function unmarkMigrationExecuted(name: string): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.queryObject(
      "DELETE FROM migrations WHERE name = $1",
      [name],
    );
  } finally {
    client.release();
  }
}

/**
 * Execute a single migration (up)
 */
async function executeMigration(migration: MigrationFile): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log(`Running migration: ${migration.name}`);
    await client.queryObject("BEGIN");
    await client.queryObject(migration.up);
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
 * Rollback a single migration (down)
 */
async function rollbackMigration(migration: MigrationFile): Promise<void> {
  if (!migration.down) {
    throw new Error(
      `Migration ${migration.name} does not have a down section. Cannot rollback.`,
    );
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log(`Rolling back migration: ${migration.name}`);
    await client.queryObject("BEGIN");
    await client.queryObject(migration.down);
    await unmarkMigrationExecuted(migration.name);
    await client.queryObject("COMMIT");
    console.log(`✓ Migration ${migration.name} rolled back successfully`);
  } catch (error) {
    await client.queryObject("ROLLBACK");
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Rollback of ${migration.name} failed: ${message}`);
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

/**
 * Rollback the last executed migration
 */
async function rollbackLastMigration(): Promise<void> {
  console.log("Starting rollback process...\n");

  await ensureMigrationsTable();

  const migrationFiles = await getMigrationFiles();
  const executedMigrations = await getExecutedMigrations();

  // Get executed migrations in reverse order (most recent first)
  const executedMigrationNames = Array.from(executedMigrations).sort()
    .reverse();

  if (executedMigrationNames.length === 0) {
    console.log("No executed migrations found.");
    return;
  }

  // Find the most recent executed migration
  const lastMigrationName = executedMigrationNames[0];
  const migration = migrationFiles.find((m) => m.name === lastMigrationName);

  if (!migration) {
    throw new Error(
      `Migration ${lastMigrationName} was executed but file not found.`,
    );
  }

  await rollbackMigration(migration);
  console.log(`\n✓ Rollback completed successfully`);
}

/**
 * Rollback a specific migration by name
 */
async function rollbackMigrationByName(name: string): Promise<void> {
  console.log(`Starting rollback of migration: ${name}\n`);

  await ensureMigrationsTable();

  const migrationFiles = await getMigrationFiles();
  const executedMigrations = await getExecutedMigrations();

  if (!executedMigrations.has(name)) {
    throw new Error(`Migration ${name} has not been executed.`);
  }

  const migration = migrationFiles.find((m) => m.name === name);

  if (!migration) {
    throw new Error(`Migration file ${name} not found.`);
  }

  await rollbackMigration(migration);
  console.log(`\n✓ Rollback completed successfully`);
}

// Run migrations if script is executed directly
if (import.meta.main) {
  const command = Deno.args[0];
  const migrationName = Deno.args[1];

  try {
    if (command === "rollback") {
      if (migrationName) {
        await rollbackMigrationByName(migrationName);
      } else {
        await rollbackLastMigration();
      }
    } else {
      await runMigrations();
    }
    Deno.exit(0);
  } catch (error) {
    console.error("Migration operation failed:", error);
    Deno.exit(1);
  }
}
