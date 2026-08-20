const promClient = require('prom-client');
const { pushTimeseries } = require('prometheus-remote-write');

// Your Grafana Cloud credentials
const GRAFANA_URL = 'https://prometheus-prod-43-prod-ap-south-1.grafana.net/api/prom/push';
const GRAFANA_USER = '3527898';
const GRAFANA_PASS = process.env.GRAFANA_API_KEY || 'MISSING_API_KEY';

async function pushToGrafana() {
    try {
        const metrics = await promClient.register.getMetricsAsJSON();
        const timeseries = [];
        const now = Date.now();

        metrics.forEach(metric => {
            metric.values.forEach(val => {
                // Combine __name__ with other labels and force them all to strings
                const labels = { __name__: metric.name };
                for (const [key, value] of Object.entries(val.labels || {})) {
                    labels[key] = String(value);
                }
                
                // Convert numeric values properly
                let value = val.value;
                if (typeof value !== 'number' || isNaN(value)) {
                    return; // Skip non-numeric
                }

                timeseries.push({
                    labels,
                    samples: [{ value, timestamp: now }]
                });
            });
        });

        if (timeseries.length > 0) {
            await pushTimeseries(timeseries, {
                url: GRAFANA_URL,
                auth: { username: GRAFANA_USER, password: GRAFANA_PASS },
                timeout: 10000
            });
            console.log(`[Metrics] Successfully pushed ${timeseries.length} timeseries to Grafana Cloud.`);
        }
    } catch (error) {
        console.error("[Metrics] Failed to push to Grafana Cloud:", error.response?.data || error.message);
    }
}

// Push every 10 seconds
setInterval(pushToGrafana, 10000);
console.log("[Metrics] Grafana Cloud telemetry streamer started.");
