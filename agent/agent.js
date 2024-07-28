const WebSocket = require('ws');
const { exec } = require('child_process');
const fs = require('fs');
const path = require("path");

const ws = new WebSocket('ws://localhost:3000');
const agentId = "agent-" + Math.floor(Math.random() * 1000);

ws.on('open', () => {
  console.log(`Agent ${agentId} connected to server`);
  ws.send(JSON.stringify({ type: 'registerAgent', agentId }));
});

ws.on('message', (message) => {
  const data = JSON.parse(message);
  if (data.type === 'distributeJob') {
    const job = data.job;
    console.log(`Agent ${agentId} received job ${job.id} at ${new Date().toISOString()}`);
    ws.send(JSON.stringify({ type: 'updateJob', agentId, jobId: job.id, result: null, status: 'processing' }));
    executeJob(job.id, job.command, job.language, (result) => {
      console.log(`Agent ${agentId} completed job ${job.id} at ${new Date().toISOString()}`);
      ws.send(JSON.stringify({ type: 'updateJob', agentId, jobId: job.id, result, status: 'completed' }));
    });
  }
});

ws.on('close', () => {
  console.log(`Agent ${agentId} disconnected from server`);
});

function getCodeDir() {
  const codeDir = path.join(__dirname, "codes");
  if (!fs.existsSync(codeDir)) {
    fs.mkdirSync(codeDir, { recursive: true });
  }
  return codeDir;
}
function generateCodeFile(jobId, format, code) {
  const fileName = `job-${jobId}.${format}`;
  const filePath = path.join(getCodeDir(), fileName);
  fs.writeFileSync(filePath, code);
  return filePath;
};

function executeJob(id, command, language, callback) {
  switch (language) {
    case 'Bash':
      exec(command, (error, stdout, stderr) => {
        if (error) {
          callback(`Error: ${stderr}`);
        } else {
          callback(stdout);
        }
      });
      break;
    case 'JavaScript':
      exec(`node -e "${command}"`, (error, stdout, stderr) => {
        if (error) {
          callback(`Error: ${stderr}`);
        } else {
          callback(stdout);
        }
      });
      break;
    case 'Python':
      exec(`python -c "${command}"`, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
        if (error) {
          callback(`Error: ${stderr}`);
        } else {
          callback(stdout);
        }
      });
      break;
    case 'Golang':
      const fileGoPath = generateCodeFile(id, 'go', command);
      exec(`go run ${fileGoPath}`, (error, stdout, stderr) => {
        fs.unlinkSync(fileGoPath);
        if (error) {
          callback(`Error: ${stderr}`);
        } else {
          callback(stdout);
        }
      });
      break;
    case 'Java':
      let fileJavaPath = generateCodeFile(id, 'java', command);
      const fileJavaName = 'job-' + id;
      exec(`javac ${fileJavaPath} && java -cp ${path.join(getCodeDir(), fileJavaName)}`, (error, stdout, stderr) => {
        fs.unlinkSync(fileJavaPath);
        if (error) {
          callback(`Error: ${stderr}`);
        } else {
          callback(stdout);
        }
      });
      break;
    default:
      callback(`Unsupported language: ${language}`);
  }
}