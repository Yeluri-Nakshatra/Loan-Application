const http = require("http");

const NUM_REQUESTS = 20;

console.log(`================================================================`);
console.log(`✅ THE SOLUTION: HANDLING CONCURRENT REQUESTS WITH BULLMQ ✅`);
console.log(`================================================================`);
console.log(`Sending ${NUM_REQUESTS} concurrent requests to the API...`);
console.log(`These requests will be INSTANTLY accepted and placed into the Redis queue.`);
console.log(`Notice how fast the API responds! The emails will be sent in the background.\n`);

let completedRequests = 0;
const startTime = Date.now();

for (let i = 1; i <= NUM_REQUESTS; i++) {
  const postData = JSON.stringify({
    name: `Async Test User ${i}`,
    email: `async.test.${i}@example.com`,
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/signup/send-email-otp', // Standard queued endpoint
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
      console.log(`✅ Request ${i} RESPONDED in ${timeTaken}s [Status: ${res.statusCode}]`);
      
      if (completedRequests === NUM_REQUESTS) {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n🎉 All ${NUM_REQUESTS} requests successfully accepted in just ${totalTime} seconds!`);
        console.log(`Look at your server terminal to see the jobs being processed concurrently in the background by the worker threads.`);
      }
    });
  });

  req.on('error', (e) => {
    completedRequests++;
    console.error(`💥 Request ${i} FAILED: ${e.message}`);
  });

  // Write data to request body
  req.write(postData);
  req.end();
}
