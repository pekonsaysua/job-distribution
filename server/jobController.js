const { db } = require('./db');

function createJob(job) {
  const { command, language } = job;
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO jobs (command, language) VALUES (?, ?)', [command, language],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            command: command,
            language: language,
            status: 'pending',
          });
        }
      }
    );
  });
}

function getPendingJobs() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM jobs WHERE status = "pending"', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function updateJobStatus(jobId, status, result = null, agentId = null) {
  return new Promise((resolve, reject) => {
    const updatedAt = new Date().toISOString();
    const stmt = db.prepare('UPDATE jobs SET status = ?, result = ?, agentId = ?, updatedAt = ? WHERE id = ?');
    stmt.run(status, result, agentId, updatedAt, jobId, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    stmt.finalize();
  });
}

function getCompletedJobs() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM jobs WHERE status = 'completed'", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function getJobById(jobId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM jobs WHERE id = ?", [jobId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function getAll() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM jobs", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  createJob,
  getPendingJobs,
  updateJobStatus,
  getCompletedJobs,
  getJobById,
  getAll
};