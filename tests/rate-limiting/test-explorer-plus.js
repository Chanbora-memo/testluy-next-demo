/**
 * Test script for Explorer PLUS tier rate limiting implementation
 * 
 * This script tests the rate limiting functionality specifically for the Explorer PLUS tier
 * by making rapid API requests to the testLuy backend.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const config = {
  // Explorer PLUS tier credentials
  explorerPlus: {
    clientId: process.env.EXPLORER_PLUS_CLIENT_ID,
    secretKey: process.env.EXPLORER_PLUS_SECRET_KEY,
    baseUrl: process.env.TESTLUY_BASE_URL || 'http://localhost:8000',
  },
  // Test parameters
  requestCount: 110, // Number of requests to make (increased to test Explorer PLUS 100 req/min limit)
  requestDelay: 100, // Delay between requests in ms
  logFile: path.resolve(process.cwd(), 'tests/rate-limiting/results/explorer-plus-test-results.json'),
};

// Helper function to generate HMAC signature
async function generateSignature(method, path, timestamp, body, secretKey) {
  const crypto = await import('crypto');
  const stringToSign = method + "\n" + path + "\n" + timestamp + "\n" + (typeof body === 'string' ? body : JSON.stringify(body));
  return crypto.default.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

// Helper function to make an API request with HMAC authentication
async function makeApiRequest(path, method = 'POST', body = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await generateSignature(
    method, 
    path, 
    timestamp, 
    body, 
    config.explorerPlus.secretKey
  );
  
  const baseUrl = config.explorerPlus.baseUrl;
  const clientId = config.explorerPlus.clientId;
  
  try {
    const response = await axios({
      method,
      url: `${baseUrl}/${path}`,
      data: method !== 'GET' ? body : undefined,
      headers: {
        'X-Client-ID': clientId,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
      rateLimitInfo: {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset'],
      }
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        rateLimitInfo: {
          limit: error.response.headers['x-ratelimit-limit'],
          remaining: error.response.headers['x-ratelimit-remaining'],
          reset: error.response.headers['x-ratelimit-reset'],
          retryAfter: error.response.headers['retry-after'] || (error.response.data && error.response.data.retry_after),
        },
        error: true
      };
    }
    return {
      error: true,
      message: error.message,
    };
  }
}

// Function to run the rate limit test
async function runRateLimitTest() {
  console.log(`\n🚀 Starting rate limit test for Explorer PLUS tier...`);
  
  const results = [];
  let rateLimitHit = false;
  let successfulRequests = 0;
  
  for (let i = 0; i < config.requestCount; i++) {
    console.log(`Making request ${i + 1}/${config.requestCount}...`);
    
    const result = await makeApiRequest(
      'api/validate-credentials', 
      'POST', 
      {}
    );
    
    results.push({
      requestNumber: i + 1,
      timestamp: new Date().toISOString(),
      ...result
    });
    
    if (result.status === 200) {
      successfulRequests++;
    } else if (result.status === 429) {
      console.log(`⚠️ Rate limit hit on request ${i + 1}!`);
      console.log(`Retry after: ${result.rateLimitInfo.retryAfter} seconds`);
      rateLimitHit = true;
    }
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, config.requestDelay));
  }
  
  console.log(`✅ Test completed. Rate limit hit: ${rateLimitHit}`);
  console.log(`Successful requests: ${successfulRequests}/${config.requestCount}`);
  
  return results;
}

// Main function to run the test
async function runTest() {
  console.log('🧪 Starting Explorer PLUS tier rate limiting test...');
  
  // Create results directory if it doesn't exist
  const resultsDir = path.dirname(config.logFile);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Check if credentials are available
  if (!config.explorerPlus.clientId || !config.explorerPlus.secretKey) {
    console.error('❌ Explorer PLUS tier credentials not found in environment variables!');
    console.error('Please set EXPLORER_PLUS_CLIENT_ID and EXPLORER_PLUS_SECRET_KEY in your .env.local file.');
    return;
  }
  
  // Run test
  const results = await runRateLimitTest();
  
  // Save results to file
  const allResults = {
    testDate: new Date().toISOString(),
    explorerPlus: results,
    summary: {
      totalRequests: results.length,
      successfulRequests: results.filter(r => r.status === 200).length,
      rateLimitedRequests: results.filter(r => r.status === 429).length,
    }
  };
  
  fs.writeFileSync(config.logFile, JSON.stringify(allResults, null, 2));
  console.log(`📝 Test results saved to ${config.logFile}`);
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`  - Total requests: ${allResults.summary.totalRequests}`);
  console.log(`  - Successful requests: ${allResults.summary.successfulRequests}`);
  console.log(`  - Rate limited requests: ${allResults.summary.rateLimitedRequests}`);
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test failed:', error);
});
