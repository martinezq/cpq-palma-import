const R = require('ramda');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { delay } = require('./utils');
const { createClient } = require('./client');
const { readInput } = require('./input');
const { palmaToTacton } = require('./mappers/mapper');

// const GRAPHQL_SERVER_URL = 'https://cpq-graphql-server.herokuapp.com/promo/';
const GRAPHQL_SERVER_LOCAL_URL = 'http://localhost:4000/promo/';

const graphql_server_url = process.env.GRAPHQL_SERVER_URL || GRAPHQL_SERVER_LOCAL_URL;
const port = process.env.PORT || 3000;

const isLocal = port === 3000;

let jobs = {};

// ----------------------------------------------------------------------------

function checks(result) {
  let positions = {};
  let assemblies = {};
  let modules = {};

  result.assemblies.forEach(a => {
    a.positions.forEach(p => {
      positions[`${a.name}.${p.name}`] = p.module?.name || p.assembly?.name;
    })
  })

  result.assemblies.forEach(a => assemblies[a.name] = a);
  result.modules.forEach(m => modules[m.name] = m);

  const report = R.flatten(result.assemblies.map(ass => ass.attributes.map(att => att.aggregateList.map(agl => {
    const positionRealizedBy = positions[`${ass.name}.${agl.position.name}`];
    return {
      ...agl,
      positionRealizedBy,
      attributeInRealizingAssembly: assemblies[positionRealizedBy]?.attributes?.find(p => p.name === agl.attribute.name)?.name,
      featureInRealizingModule: modules[positionRealizedBy]?.features?.find(f => f.name === agl.feature.name)?.name
    }
  }))))
    // .filter(x => x.attribute?.name === undefined)
    .filter(x => (x.attribute && !x.attributeInRealizingAssembly) || (x.feature && !x.featureInRealizingModule));

  return report;
}

async function processRequest(inputData, endpoint, authorization, job) {
  job.log = [];
  job.log.push('reading input data');
  
  let result = palmaToTacton(inputData);
  
  if (isLocal) {
    fs.writeFileSync('./public/model/' + job.id + '.json', JSON.stringify(result, null, 2));
  }

  const client = createClient(endpoint, authorization);

  job.log.push(`creating/updating domains (${result.domains.length})`);
  await client.createDomains(result);

  job.log.push(`creating/updating categories (${result.categories.length})`);
  await client.createAttributeCategories(result);

  job.log.push(`creating/updating global features (${result.globalFeatures.length})`);
  await client.createGlobalFeatures(result);

  job.log.push(`creating/updating modules (${result.modules.length})`);

    const asyncResponse = await client.createModulesAsync(result);
    const moduleLoadJobId = asyncResponse.upsertModulesAsync;
    console.log('job id', moduleLoadJobId);
    
    let moduleLoadJobStatus = await client.job({ id: moduleLoadJobId });

    while (moduleLoadJobStatus.job.status === 'InProgress') {
        await delay(10000);
        moduleLoadJobStatus = await client.job({ id: moduleLoadJobId });

        console.log('job', moduleLoadJobStatus);
    }

    if (moduleLoadJobStatus.job.status === "Error") {
      console.log('job', moduleLoadJobStatus);
      throw moduleLoadJobStatus.error;
    }

    console.log('job', moduleLoadJobStatus);
      

  job.log.push(`creating/updating assemblies (${result.assemblies.length})`);
  await client.createAssemblies(result);

  job.log.push(`DONE`);

  return result;
}

async function server() {

  const app = express();

  const upload = multer({ storage: multer.memoryStorage() });

  app.use(express.static('public'))

  app.get('/palma/import/:job', (req, res) => {
    const jobId = req.params.job;
    res.send(jobs[jobId] || 'No such job');
  });

  app.post('/palma/import', upload.single('file'), async (req, res) => {
    const authorization = req.headers['authorization'];
    const { baseUrl, ticket } = req.query;

    if (!authorization) {
      return res.status(401).send('Authorization header is missing');
    }

    if (!baseUrl || !ticket) {
      return res.status(400).send('Missing required query parameters: baseUrl, ticket');
    }

    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const baseUrlPure = baseUrl.replace(/^https?:\/\//, '');

    const jobId = uuidv4();

    try {
      const endpoint = `${graphql_server_url}/${baseUrlPure}/${ticket}`;
      const jsonData = JSON.parse(req.file.buffer.toString());
      // Process the JSON data as needed
      // console.log(`Received JSON data: ${JSON.stringify(jsonData)}`);
      console.log(`baseUrl: ${baseUrl}`);
      console.log(`ticket: ${ticket}`);

      jobs[jobId] = {
        id: jobId,
        startedAt: new Date(),
        status: "in progress"
      }

      res.send({ jobId });

      await processRequest(jsonData, endpoint, authorization, jobs[jobId]);

      jobs[jobId].status = "completed";
      jobs[jobId].completedAt = new Date();

    } catch (error) {
      console.log(error);

      jobs[jobId].status = "error";
      jobs[jobId].error = error?.response?.errors || error;
      
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

}

// ----------------------------------------------------------------------------

server();