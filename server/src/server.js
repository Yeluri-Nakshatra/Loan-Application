require("dotenv").config();

const express = require("express");
const cors = require("cors");

const supertokens = require("supertokens-node");
const { middleware, errorHandler } = require("supertokens-node/framework/express");

const connectDB = require("./config/db");

// SuperTokens configuration
require("./config/supertokens");

const authRoutes = require("./routes/authRoutes");
const kycRoutes = require("./routes/kycRoutes");
const eligibilityRoutes = require("./routes/eligibilityRoutes");
const applicationRoutes = require("./routes/applicationRoutes");

const app = express();

// Initialize Prometheus Metrics
const promBundle = require("express-prom-bundle");
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  promClient: {
    collectDefaultMetrics: {}
  }
});
app.use(metricsMiddleware);

// Start pushing metrics to Grafana Cloud
require("./config/grafanaPush");

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// SuperTokens middleware
app.use(middleware());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/application", applicationRoutes);

// --- SYSTEM TELEMETRY PROXY ---
const axios = require('axios');
app.get('/api/telemetry', async (req, res) => {
  try {
    const GRAFANA_URL = 'https://prometheus-prod-43-prod-ap-south-1.grafana.net/api/prom/api/v1/query_range';
    const auth = {
      username: '3527898',
      password: process.env.GRAFANA_API_KEY || 'MISSING_API_KEY'
    };

    const now = Math.floor(Date.now() / 1000);
    const start = now - (60 * 60); // Last 60 minutes
    const step = 60; // 1 data point per minute

    // Queries
    const cpuQuery = encodeURIComponent('sum(rate(process_cpu_user_seconds_total[1m]))');
    const memoryQuery = encodeURIComponent('sum(process_resident_memory_bytes)');
    const apiQuery = encodeURIComponent('sum(rate(http_request_duration_seconds_count[1m]))');

    const [cpuRes, memRes, apiRes] = await Promise.all([
      axios.get(`${GRAFANA_URL}?query=${cpuQuery}&start=${start}&end=${now}&step=${step}`, { auth }),
      axios.get(`${GRAFANA_URL}?query=${memoryQuery}&start=${start}&end=${now}&step=${step}`, { auth }),
      axios.get(`${GRAFANA_URL}?query=${apiQuery}&start=${start}&end=${now}&step=${step}`, { auth })
    ]);

    // Format for Recharts
    const chartData = [];
    const apiData = apiRes.data?.data?.result[0]?.values || [];
    const cpuData = cpuRes.data?.data?.result[0]?.values || [];
    const memData = memRes.data?.data?.result[0]?.values || [];

    const maxLen = Math.max(apiData.length, cpuData.length, memData.length);
    for (let i = 0; i < maxLen; i++) {
      const timestamp = (apiData[i]?.[0] || cpuData[i]?.[0] || memData[i]?.[0] || 0) * 1000;
      if (!timestamp) continue;
      
      chartData.push({
        time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        apiHits: parseFloat(apiData[i]?.[1] || 0).toFixed(2),
        cpuUsage: parseFloat(cpuData[i]?.[1] || 0).toFixed(4),
        memoryMB: (parseFloat(memData[i]?.[1] || 0) / (1024 * 1024)).toFixed(0)
      });
    }

    res.json(chartData);
  } catch (error) {
    console.error("Telemetry fetch error:", error.message);
    res.status(500).json({ error: "Failed to fetch telemetry from Grafana" });
  }
});


// SuperTokens error handler
app.use(errorHandler());

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Trigger nodemon restart to pick up new .env variables
