"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationRunner = void 0;
const fs = require("fs");
const path = require("path");
class MigrationRunner {
    constructor(db) {
        this.db = db;
        this.migrationsDir = path.join(__dirname, '../../../../migrations');
    }
    async initialize() {
        await this.db.none(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        file VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log('Migration tracking table initialized');
    }
    async run() {
        await this.initialize();
        const pendingMigrations = await this.getPendingMigrations();
        if (pendingMigrations.length === 0) {
            console.log('✓ No pending migrations');
            return;
        }
        console.log(`\n📦 Running ${pendingMigrations.length} migration(s)...\n`);
        for (const migration of pendingMigrations) {
            await this.executeMigration(migration);
        }
        console.log('\n✅ All migrations completed successfully\n');
    }
    async rollback(steps = 1) {
        const executedMigrations = await this.db.manyOrNone('SELECT * FROM migrations ORDER BY id DESC LIMIT $1', [steps]);
        if (!executedMigrations || executedMigrations.length === 0) {
            console.log('✓ No migrations to rollback');
            return;
        }
        console.log(`\n⏪ Rolling back ${executedMigrations.length} migration(s)...\n`);
        for (const migration of executedMigrations) {
            await this.rollbackMigration(migration);
        }
        console.log('\n✅ Rollback completed successfully\n');
    }
    async status() {
        await this.initialize();
        const allFiles = this.getAllMigrationFiles();
        const executedMigrations = await this.db.manyOrNone('SELECT * FROM migrations ORDER BY id ASC');
        const executedNames = new Set(executedMigrations?.map((m) => m.name) || []);
        console.log('\n📋 Migration Status:\n');
        console.log('  Executed Migrations:');
        allFiles.forEach((file) => {
            const status = executedNames.has(file) ? '✓' : '○';
            console.log(`    ${status} ${file}`);
        });
        const pendingCount = allFiles.length - (executedMigrations?.length || 0);
        console.log(`\n  Total: ${allFiles.length} | Executed: ${executedMigrations?.length || 0} | Pending: ${pendingCount}\n`);
    }
    getAllMigrationFiles() {
        if (!fs.existsSync(this.migrationsDir)) {
            return [];
        }
        return fs
            .readdirSync(this.migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort();
    }
    async getPendingMigrations() {
        const allFiles = this.getAllMigrationFiles();
        const executedMigrations = await this.db.manyOrNone('SELECT * FROM migrations ORDER BY id ASC');
        const executedNames = new Set(executedMigrations?.map((m) => m.name) || []);
        return allFiles.filter((file) => !executedNames.has(file));
    }
    async executeMigration(filename) {
        const filePath = path.join(this.migrationsDir, filename);
        const sql = fs.readFileSync(filePath, 'utf-8');
        const upSql = this.extractUpMigration(sql);
        console.log(`  → Executing: ${filename}`);
        await this.db.tx(async (t) => {
            await t.none(upSql);
            await t.none('INSERT INTO migrations (name, file) VALUES ($1, $2)', [
                filename,
                filename,
            ]);
        });
        console.log(`  ✓ Completed: ${filename}`);
    }
    async rollbackMigration(migration) {
        console.log(`  ← Rolling back: ${migration.name}`);
        const filePath = path.join(this.migrationsDir, migration.file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Migration file not found: ${migration.file}`);
        }
        const sql = fs.readFileSync(filePath, 'utf-8');
        const rollbackSql = this.extractRollbackMigration(sql);
        if (!rollbackSql) {
            throw new Error(`No rollback section found in ${migration.file}. Add a comment "-- ROLLBACK" followed by rollback SQL.`);
        }
        await this.db.tx(async (t) => {
            await t.none(rollbackSql);
            await t.none('DELETE FROM migrations WHERE id = $1', [migration.id]);
        });
        console.log(`  ✓ Rolled back: ${migration.name}`);
    }
    extractUpMigration(sql) {
        const rollbackMatch = sql.match(/--\s*ROLLBACK/i);
        if (rollbackMatch) {
            return sql.substring(0, rollbackMatch.index).trim();
        }
        return sql.trim();
    }
    extractRollbackMigration(sql) {
        const rollbackMatch = sql.match(/--\s*ROLLBACK\s*\n([\s\S]*)/i);
        if (!rollbackMatch) {
            return null;
        }
        return rollbackMatch[1].trim();
    }
}
exports.MigrationRunner = MigrationRunner;
//# sourceMappingURL=migration-runner.js.map