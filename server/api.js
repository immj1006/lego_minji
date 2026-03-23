import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8092;
const app = express();

let SALES = {};
let DEALS = [];

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());

app.get('/', (request, response) => {
  response.send({'ack': true});
});



// GET /deals/search - Search deals with filters
app.get('/deals/search', (request, response) => {
  const { limit = 12, price, date, filterBy } = request.query;

  let results = [...DEALS];

  // Filter by price
  if (price) {
    results = results.filter(d => d.price <= parseFloat(price));
  }

  // Filter by date (timestamp)
  if (date) {
    const dateTs = new Date(date).getTime() / 1000;
    results = results.filter(d => d.published >= dateTs);
  }

  // Filter by specific values
  if (filterBy === 'best-discount') {
    results = results.sort((a, b) => b.discount - a.discount);
  } else if (filterBy === 'most-commented') {
    results = results.sort((a, b) => (b.comments || 0) - (a.comments || 0));
  } else if (filterBy === 'hot-deals') {
    results = results.sort((a, b) => (b.temperature || 0) - (a.temperature || 0));
  } else {
    // Default: sort by price ascending
    results = results.sort((a, b) => a.price - b.price);
  }

  const total = results.length;
  results = results.slice(0, parseInt(limit));

  return response.status(200).json({
    'success': true,
    'data': { limit: parseInt(limit), total, results }
  });
});

// GET /deals/:id - Fetch a specific deal by uuid
app.get('/deals/:id', (request, response) => {
  const { id } = request.params;
  const deal = DEALS.find(d => d.uuid === id);

  if (!deal) {
    return response.status(404).json({ 'success': false, 'data': null });
  }

  return response.status(200).json({ 'success': true, 'data': deal });
});


// GET /sales/search - Search vinted sales
app.get('/sales/search', (request, response) => {
  try {
    const { legoSetId, limit = 12 } = request.query;
    let result = SALES[legoSetId] || [];

    // Sort by date descending
    result = result.sort((a, b) => b.published - a.published);
    result = result.slice(0, parseInt(limit));

    return response.status(200).json({
      'success': true,
      'data': { limit: parseInt(limit), total: result.length, result }
    });
  } catch (error) {
    console.log(error);
    return response.status(404).json({ 'success': false, 'data': { 'result': [] } });
  }
});

app.listen(PORT, () => {
  // Load deals
  try {
    DEALS = JSON.parse(
      readFileSync(path.join(__dirname, 'deals.json'), 'utf8')
    );
    console.log(`✅ Loaded ${DEALS.length} deals`);
  } catch (error) {
    console.warn(`⚠️  Could not load deals.json: ${error}`);
  }

  // Load sales
  try {
    SALES = JSON.parse(
      readFileSync(path.join(__dirname, 'sources', 'vinted.json'), 'utf8')
    );
    console.log(`✅ Loaded sales`);
  } catch (error) {
    console.warn(`⚠️  ${error}`);
  }
});

console.log(`📡 Running on port ${PORT}`);