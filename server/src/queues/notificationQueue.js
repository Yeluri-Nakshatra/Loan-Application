const { Queue, Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const { sendPhoneOTP } = require("../services/phoneService");
const { sendEmailOTP, sendPhoneBackupEmailOTP } = require("../services/emailService"); // Assuming these exist

const QUEUE_NAME = "notification-queue";

let notificationQueue = null;

if (redisConnection) {
  // 1. Create the Queue
  notificationQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true, // Don't bloat Redis with completed jobs
      removeOnFail: false
    }
  });

  // 2. Create the Worker to process jobs
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { type, payload } = job.data;
      console.log(`[Queue Worker] Processing job ${job.id} of type: ${type}`);

      try {
        if (type === "SEND_PHONE_OTP") {
          const { phone, otp, email } = payload;
          await sendPhoneOTP(phone, otp);
          if (email) {
            await sendPhoneBackupEmailOTP(email, phone, otp);
          }
        } 
        else if (type === "SEND_EMAIL_OTP") {
          const { email, otp } = payload;
          await sendEmailOTP(email, otp);
        }
        else {
          console.warn(`[Queue Worker] Unknown job type: ${type}`);
        }
      } catch (err) {
        console.error(`[Queue Worker] Job ${job.id} failed:`, err.message);
        throw err; // BullMQ will automatically retry based on defaultJobOptions
      }
    },
    { connection: redisConnection }
  );

  worker.on("completed", (job) => {
    console.log(`[Queue Worker] ✅ Job ${job.id} (${job.data.type}) completed successfully!`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Queue Worker] ❌ Job ${job.id} failed with error: ${err.message}`);
  });
}

/**
 * Helper function to push jobs to the queue.
 * If Redis is not configured, it will process the job synchronously as a fallback.
 */
const enqueueNotification = async (type, payload) => {
  if (notificationQueue) {
    console.log(`[Queue] Adding ${type} to Redis queue...`);
    await notificationQueue.add(type, { type, payload });
  } else {
    console.warn(`[Queue] ⚠️ Redis not configured. Processing ${type} synchronously...`);
    // Fallback synchronous processing
    if (type === "SEND_PHONE_OTP") {
      await sendPhoneOTP(payload.phone, payload.otp);
      if (payload.email) {
        await sendPhoneBackupEmailOTP(payload.email, payload.phone, payload.otp);
      }
    } else if (type === "SEND_EMAIL_OTP") {
      await sendEmailOTP(payload.email, payload.otp);
    }
  }
};

module.exports = {
  notificationQueue,
  enqueueNotification
};
