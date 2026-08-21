const { Queue, Worker } = require("bullmq");
const redisConnection = require("../config/redis");
// const Loan = require("../models/Loan"); // If we need DB access
// const { processRiskAssessment } = require("../services/underwritingService");

const QUEUE_NAME = "loan-processing-queue";

let loanQueue = null;

if (redisConnection) {
  // 1. Create the Queue
  loanQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true
    }
  });

  // 2. Create the Worker to process loan applications asynchronously
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { loanId, applicantId, data } = job.data;
      console.log(`[Loan Worker] 🚀 Started processing Loan Application: ${loanId} for user ${applicantId}`);

      // Simulate heavy asynchronous processing (Risk Assessment, CIBIL Check, Document OCR)
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log(`[Loan Worker] 🧠 Risk Assessment complete for Loan ${loanId}`);
      
      // Simulate Database Saving & status updates
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`[Loan Worker] 💾 Database updated for Loan ${loanId}`);
    },
    { connection: redisConnection, concurrency: 10 }
  );

  worker.on("completed", (job) => {
    console.log(`[Loan Worker] ✅ Loan ${job.data.loanId} successfully processed and queued for Underwriter Review!`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Loan Worker] ❌ Loan ${job.data.loanId} failed to process:`, err.message);
  });
}

const enqueueLoanProcessing = async (loanId, applicantId, data) => {
  if (loanQueue) {
    console.log(`[Loan Queue] Adding Loan ${loanId} to Redis queue for asynchronous processing...`);
    await loanQueue.add("PROCESS_LOAN", { loanId, applicantId, data });
  } else {
    console.warn(`[Loan Queue] ⚠️ Redis not configured. Cannot queue Loan ${loanId}.`);
    // Fallback sync process could go here
  }
};

module.exports = {
  loanQueue,
  enqueueLoanProcessing
};
