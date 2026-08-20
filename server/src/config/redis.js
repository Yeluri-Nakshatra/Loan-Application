const { Redis } = require("ioredis");

let redisConnection = null;

const redisUri = process.env.REDIS_URI || process.env.REDIS_URL;

if (redisUri) {
  // We specify maxRetriesPerRequest to null for BullMQ compatibility
  redisConnection = new Redis(redisUri, {
    maxRetriesPerRequest: null,
    tls: {
      rejectUnauthorized: false // Required for many free cloud Redis providers like Upstash
    }
  });

  redisConnection.on("connect", () => {
    console.log("[Redis] 🟢 Connected to Cloud Redis successfully.");
  });

  redisConnection.on("error", (err) => {
    console.error("[Redis] 🔴 Connection Error:", err.message);
  });
} else {
  console.warn("[Redis] ⚠️ REDIS_URI not found in .env! Queueing system will be disabled or fail.");
}

module.exports = redisConnection;
