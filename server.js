const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Unusual Whales API configuration
const UW_API_KEY = process.env.UW_API_KEY || '23ef1cc4-407b-421f-99bc-202323a78799';
const UW_BASE_URL = 'https://api.unusualwhales.com';

// Rate limiting: 120 requests per minute (matching UW limits)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: 'Too many requests, please try again later.'
});

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins (adjust for production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!UW_API_KEY
  });
});

// Proxy all /api/* requests to Unusual Whales
app.all('/api/*', async (req, res) => {
  try {
    const path = req.originalUrl.replace('/api', '');
    const url = `${UW_BASE_URL}${path}`;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${url}`);

    const response = await axios({
      method: req.method,
      url: url,
      headers: {
        'Authorization': `Bearer ${UW_API_KEY}`,
        'Accept': 'application/json',
        'User-Agent': 'OnOurWays-Trading-Portal/1.0'
      },
      params: req.query,
      data: req.body,
      timeout: 30000 // 30 second timeout
    });

    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    if (error.response) {
      // Forward the error from Unusual Whales API
      res.status(error.response.status).json({
        error: error.response.data || error.message,
        status: error.response.status
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Request timeout' });
    } else {
      res.status(500).json({ 
        error: 'Proxy server error', 
        message: error.message 
      });
    }
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Unusual Whales API Proxy',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      proxy: '/api/*'
    },
    documentation: 'https://docs.unusualwhales.com'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🐋 Unusual Whales Proxy Server running on port ${PORT}`);
  console.log(`📡 API Key configured: ${!!UW_API_KEY}`);
  console.log(`🌐 Proxying to: ${UW_BASE_URL}`);
  console.log(`⚡ Rate limit: 120 requests per minute`);
});
