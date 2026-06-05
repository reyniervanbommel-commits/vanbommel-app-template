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

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
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
