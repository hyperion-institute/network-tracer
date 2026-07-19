require('dotenv').config();
const express = require('express');
const path = require('path');
const traceRouter = require('./routes/trace');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the frontend (public/index.html + any static assets)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/trace', traceRouter);

app.listen(PORT, () => {
  console.log(`Network Tracer server running at http://localhost:${PORT}`);
});
