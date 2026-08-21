const http = require("http");

const NUM_REQUESTS = 10; // Keep it to 10 so it doesn't completely freeze the SMTP server forever

console.log(`================================================================`);
console.log(`🚨 THE PROBLEM: NOT HANDLING CONCURRENT REQUESTS (SYNCHRONOUS) 🚨`);
console.log(`================================================================`);
console.log(`Sending ${NUM_REQUESTS} concurrent requests to the API...`);
console.log(`These requests will be processed SYNCHRONOUSLY without a queue.`);
console.log(`Notice how long they take to respond, and some might even timeout or fail!\n`);

let completedRequests = 0;
const startTime = Date.now();

for (let i = 1; i <= NUM_REQUESTS; i++) {
  const postData = JSON.stringify({
    name: `Sync Test User ${i}`,
    email: `sync.test.${i}@example.com`,
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/signup/send-email-otp?sync=true', // Added ?sync=true to force synchronous processing
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      completedRequests++;
      let parsedData = {};
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        parsedData = { message: data };
      }
      
      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`⚠️ Request ${i} FINISHED at ${timeTaken}s [Status: ${res.statusCode}] - Handled, but very slow!`);
      
      if (completedRequests === NUM_REQUESTS) {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n🛑 All requests eventually finished or timed out in ${totalTime} seconds.`);
        console.log(`This blocks the event loop and makes for a terrible user experience!`);
      }
    });
  });

  // Simulate user giving up / request timing out after 4 seconds
  req.setTimeout(4000, () => {
    req.destroy(new Error('Connection timed out because the server was too busy processing earlier requests synchronously.'));
  });

  req.on('error', (e) => {
    completedRequests++;
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ Request ${i} FAILED at ${timeTaken}s:`, e.message);
    
    if (completedRequests === NUM_REQUESTS) {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n🛑 Finished with failures in ${totalTime} seconds.`);
    }
  });

  // Write data to request body
  req.write(postData);
  req.end();
}
