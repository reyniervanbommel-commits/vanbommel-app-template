'use strict';

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const connectionString = process.env.SQL_CONNECTION_STRING;
  if (!connectionString) {
    console.error('SQL_CONNECTION_STRING niet geconfigureerd');
    process.exit(1);
  }

  const pool = await sql.connect(connectionString);
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  const isProd = process.env.APP_ENV === 'production';

  for (const file of files) {
    if (isProd && /seed_e2e/.test(file)) {
      console.log('Overslaan (PROD, e2e-seed): ' + file);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    let sqlContent = fs.readFileSync(filePath, 'utf8');

    // Vervang ${VAR_NAME} placeholders door env var waarden
    sqlContent = sqlContent.replace(/\$\{([A-Z0-9_]+)\}/g, (_, varName) => {
      const value = process.env[varName];
      if (!value) {
        throw new Error(`Ontbrekende env var in migratie ${file}: ${varName}`);
      }
      return value.replace(/'/g, "''"); // SQL-escape single quotes
    });

    console.log('Uitvoeren: ' + file);
    await pool.request().batch(sqlContent);
    console.log('Klaar: ' + file);
  }

  await pool.close();
  console.log('Alle migraties voltooid');
}

runMigrations().catch(err => {
  console.error('Migratie mislukt:', err);
  process.exit(1);
});
