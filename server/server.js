const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const jobController = require('./jobController');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const agents = {};

async function sendInitialData(ws) {
  const jobs = await jobController.getAll();
  ws.send(JSON.stringify({
    type: 'initialData', jobs, agents: Object.keys(agents).map(e => {
      return getAgentFromId(e);
    })
  }));
}

function getAgentFromId(agentId) {
  return { ...agents[agentId], ... { id: agentId } };
}

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'registerAgent':
        agents[data.agentId] = { ws, status: 'free', jobId: null };

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'agentUpdated',
              jobId: null,
              agentId: data.agentId,
              status: 'free'
            }));
          }
        });

        distributeJobs();
        break;

      case 'createJob':
        const job = await jobController.createJob(data.job);
        distributeJobs();
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'jobCreated', job }));
          }
        });
        break;
      case 'updateJob':
        const { agentId, jobId, status, result } = data;
        await jobController.updateJobStatus(jobId, status, result, agentId);
        const updatedJob = await jobController.getJobById(jobId);

        if (!agents[agentId]) break;

        if (status === 'processing') {
          agents[agentId].status = 'busy';
          agents[agentId].jobId = jobId;

          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'jobProcessing',
                jobId,
                agentId,
              }));
            }
          });
        }

        if (status === 'completed') {
          agents[agentId].status = 'free';
          agents[agentId].jobId = null;
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'jobCompleted',
                job: updatedJob,
                agentId
              }));
            }
          });
          distributeJobs();
        }
        break;
    }
  });

  ws.on('close', () => {
    for (let agentId in agents) {
      if (agents[agentId].ws === ws) {
        delete agents[agentId];

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'agentUpdated',
              jobId: null,
              agentId: agentId,
              status: 'disconnect'
            }));
          }
        });
        break;
      }
    }
  });

  sendInitialData(ws);
});

async function distributeJobs() {
  const pendingJobs = await jobController.getPendingJobs();

  for (let agentId in agents) {
    const agent = agents[agentId];
    if (agent.status === 'free' && pendingJobs.length > 0) {
      const job = pendingJobs.shift();
      agent.ws.send(JSON.stringify({ type: 'distributeJob', job }));
      // agent.status = 'processing';
      // agent.jobId = job.id;
      // await jobController.updateJobStatus(job.id, 'processing');
    }
  }
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});