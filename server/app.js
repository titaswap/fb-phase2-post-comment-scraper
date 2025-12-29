const express = require('express');
const cors = require('cors');
const { appendData } = require('./routes/append');
const { getData } = require('./routes/get');
const { clearData } = require('./routes/clear');
const { healthCheck } = require('./routes/health');
const { getProcessedUrls } = require('./routes/processed');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/append-data', appendData);
app.get('/get-data', getData);
app.post('/clear-data', clearData);
app.get('/health', healthCheck);
app.get('/get-processed-urls', getProcessedUrls);

module.exports = app;
