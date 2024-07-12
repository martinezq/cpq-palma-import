const R = require('ramda');
const express = require('express');
const multer = require('multer');
const fs = require('fs');

const { createClient } = require('./client');
const { readInput } = require('./input');
const { palmaToTacton } = require('./mappers/mapper');

const GRAPHQL_SERVER_URL = 'https://cpq-graphql-server.herokuapp.com/promo/';

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

async function process(inputData, endpoint, authorization) {
  let result = palmaToTacton(inputData);
  const client = createClient(endpoint, authorization);

  await client.createDomains(result);
  await client.createAttributeCategories(result);
  await client.createGlobalFeatures(result);

  const moduleParts = R.splitEvery(50, result.modules);

  for (const modules of moduleParts) {
    await client.createModules({ modules });
  }

  ;
  await client.createAssemblies(result);

  return result;
}

async function server() {

  const app = express();
  const port = process.env?.HTTP_PORT || 3000;

  const upload = multer({ storage: multer.memoryStorage() });

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

    try {
      const endpoint = `${GRAPHQL_SERVER_URL}/${baseUrlPure}/${ticket}`;
      const jsonData = JSON.parse(req.file.buffer.toString());
      // Process the JSON data as needed
      // console.log(`Received JSON data: ${JSON.stringify(jsonData)}`);
      console.log(`baseUrl: ${baseUrl}`);
      console.log(`ticket: ${ticket}`);

      const result = await process(jsonData, endpoint, authorization);

      res.send(result);
    } catch (error) {
      return res.status(400).send('Invalid JSON file');
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

}

// ----------------------------------------------------------------------------

server();