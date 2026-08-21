const http = require("http");

const NUM_REQUESTS = 20;

console.log(`🚀 Sending ${NUM_REQUESTS} concurrent requests to the API...`);
console.log(`This will trigger the Redis queue (BullMQ) to process the notifications one by one.`);

let completedRequests = 0;

for (let i = 1; i <= NUM_REQUESTS; i++) {
  const postData = JSON.stringify({
    name: `Queue Test User ${i}`,
    email: `queue.test.${i}@example.com`,
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/signup/send-email-otp',
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
      console.log(`:) Request ${i} [Status: ${res.statusCode}]: ${parsedData.message}`);

      if (completedRequests === NUM_REQUESTS) {
        console.log(`\n🎉 All ${NUM_REQUESTS} requests have been sent concurrently!`);
        console.log(`Check your server console to see the Redis worker processing them concurrently.`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`): Request ${i} failed: ${e.message}`);
    completedRequests++;
  });

  // Write data to request body
  req.write(postData);
  req.end();
}
