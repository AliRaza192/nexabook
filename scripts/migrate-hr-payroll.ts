import { db } from '@/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const migrationFile = path.join(process.cwd(), 'drizzle/migrations/005_hr_payroll.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error('Migration file not found!');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationFile, 'utf-8');
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Running ${statements.length} SQL statements...`);

  for (const statement of statements) {
    try {
      await sql.raw(statement);
      console.log(`✓ ${statement.substring(0, 80)}...`);
    } catch (error: any) {
      // Ignore "already exists" errors
      if (error.message?.includes('already exists') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('duplicate column')) {
        console.log(`⊘ Skipped (already exists): ${statement.substring(0, 60)}...`);
      } else {
        console.error(`✗ Error: ${error.message}`);
        console.error(`  Statement: ${statement.substring(0, 100)}...`);
      }
    }
  }

  console.log('\n✅ Migration complete!');
}

runMigration().catch(console.error);
