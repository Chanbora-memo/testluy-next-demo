/**
 * Test script for rate limiting implementation
 *
 * This script tests the rate limiting functionality by making rapid API requests
 * to the testLuy backend using different API credentials (Explorer vs Explorer PLUS).
 */

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const config = {
  // Explorer tier credentials
  explorer: {
    clientId: process.env.TESTLUY_CLIENT_ID,
    secretKey: process.env.TESTLUY_SECRET_KEY,
    baseUrl: process.env.TESTLUY_BASE_URL || 'http://localhost:8000',
  },
  // Explorer PLUS tier credentials
  explorerPlus: {
    clientId: process.env.EXPLORER_PLUS_CLIENT_ID,
    secretKey: process.env.EXPLORER_PLUS_SECRET_KEY,
    baseUrl: process.env.TESTLUY_BASE_URL || 'http://localhost:8000',
  },
  // Test parameters
  requestCount: 40, // Number of requests to make (increased to test Explorer PLUS 100 req/min limit)
  requestDelay: 100, // Delay between requests in ms
  logFile: path.resolve(process.cwd(), 'tests/rate-limiting/results/rate-limit-test-results.json'),
};

// Helper function to generate HMAC signature
async function generateSignature(method, path, timestamp, body, secretKey) {
  const crypto = await import('crypto');
  const stringToSign = method + "\n" + path + "\n" + timestamp + "\n" + (typeof body === 'string' ? body : JSON.stringify(body));
  return crypto.default.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

// Helper function to make an API request with HMAC authentication
async function makeApiRequest(tier, path, method = 'POST', body = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await generateSignature(
    method,
    path,
    timestamp,
    body,
    tier === 'explorer' ? config.explorer.secretKey : config.explorerPlus.secretKey
  );

  const baseUrl = tier === 'explorer' ? config.explorer.baseUrl : config.explorerPlus.baseUrl;
  const clientId = tier === 'explorer' ? config.explorer.clientId : config.explorerPlus.clientId;

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

// Function to run the rate limit test for a specific tier
async function runRateLimitTest(tier) {
  console.log(`\n🚀 Starting rate limit test for ${tier} tier...`);

  const results = [];
  let rateLimitHit = false;

  for (let i = 0; i < config.requestCount; i++) {
    console.log(`Making request ${i + 1}/${config.requestCount} for ${tier} tier...`);

    const result = await makeApiRequest(
      tier,
      'api/validate-credentials',
      'POST',
      {}
    );

    results.push({
      requestNumber: i + 1,
      timestamp: new Date().toISOString(),
      ...result
    });

    if (result.status === 429) {
      console.log(`⚠️ Rate limit hit on request ${i + 1} for ${tier} tier!`);
      console.log(`Retry after: ${result.rateLimitInfo.retryAfter} seconds`);
      rateLimitHit = true;
    }

    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, config.requestDelay));
  }

  console.log(`✅ Test completed for ${tier} tier. Rate limit hit: ${rateLimitHit}`);
  return results;
}

// Main function to run all tests
async function runAllTests() {
  console.log('🧪 Starting rate limiting tests...');

  // Create results directory if it doesn't exist
  const resultsDir = path.dirname(config.logFile);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Check if credentials are available
  if (!config.explorer.clientId || !config.explorer.secretKey) {
    console.error('❌ Explorer tier credentials not found in environment variables!');
    console.error('Please set TESTLUY_CLIENT_ID and TESTLUY_SECRET_KEY in your .env.local file.');
    return;
  }

  if (!config.explorerPlus.clientId || !config.explorerPlus.secretKey) {
    console.error('❌ Explorer PLUS tier credentials not found in environment variables!');
    console.error('Please set EXPLORER_PLUS_CLIENT_ID and EXPLORER_PLUS_SECRET_KEY in your .env.local file.');
    console.log('Continuing with Explorer tier only...');

    // Run test for Explorer tier only
    const explorerResults = await runRateLimitTest('explorer');

    // Save results to file
    const allResults = {
      testDate: new Date().toISOString(),
      explorer: explorerResults,
      summary: {
        explorer: {
          totalRequests: explorerResults.length,
          successfulRequests: explorerResults.filter(r => r.status === 200).length,
          rateLimitedRequests: explorerResults.filter(r => r.status === 429).length,
        }
      }
    };

    fs.writeFileSync(config.logFile, JSON.stringify(allResults, null, 2));
    console.log(`📝 Test results saved to ${config.logFile}`);

    // Print summary
    console.log('\n📊 Test Summary:');
    console.log('Explorer tier:');
    console.log(`  - Total requests: ${allResults.summary.explorer.totalRequests}`);
    console.log(`  - Successful requests: ${allResults.summary.explorer.successfulRequests}`);
    console.log(`  - Rate limited requests: ${allResults.summary.explorer.rateLimitedRequests}`);

    return;
  }

  // Run tests for both tiers
  const explorerResults = await runRateLimitTest('explorer');

  // Add a delay between tests to allow rate limiter to reset
  console.log('\n⏳ Waiting 5 seconds before starting Explorer PLUS tier test to allow rate limiter to reset...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const explorerPlusResults = await runRateLimitTest('explorerPlus');

  // Save results to file
  const allResults = {
    testDate: new Date().toISOString(),
    explorer: explorerResults,
    explorerPlus: explorerPlusResults,
    summary: {
      explorer: {
        totalRequests: explorerResults.length,
        successfulRequests: explorerResults.filter(r => r.status === 200).length,
        rateLimitedRequests: explorerResults.filter(r => r.status === 429).length,
      },
      explorerPlus: {
        totalRequests: explorerPlusResults.length,
        successfulRequests: explorerPlusResults.filter(r => r.status === 200).length,
        rateLimitedRequests: explorerPlusResults.filter(r => r.status === 429).length,
      }
    }
  };

  fs.writeFileSync(config.logFile, JSON.stringify(allResults, null, 2));
  console.log(`📝 Test results saved to ${config.logFile}`);

  // Print summary
  console.log('\n📊 Test Summary:');
  console.log('Explorer tier:');
  console.log(`  - Total requests: ${allResults.summary.explorer.totalRequests}`);
  console.log(`  - Successful requests: ${allResults.summary.explorer.successfulRequests}`);
  console.log(`  - Rate limited requests: ${allResults.summary.explorer.rateLimitedRequests}`);

  console.log('Explorer PLUS tier:');
  console.log(`  - Total requests: ${allResults.summary.explorerPlus.totalRequests}`);
  console.log(`  - Successful requests: ${allResults.summary.explorerPlus.successfulRequests}`);
  console.log(`  - Rate limited requests: ${allResults.summary.explorerPlus.rateLimitedRequests}`);
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test failed:', error);
});
