const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('jobs.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT,
        language VARCHAR,
        status VARCHAR DEFAULT 'pending',
        result TEXT,
        agentId VARCHAR,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
});

module.exports = { db };