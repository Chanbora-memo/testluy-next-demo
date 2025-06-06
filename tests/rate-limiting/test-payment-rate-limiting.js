/**
 * Test script for payment initiation rate limiting
 * 
 * This script tests the SDK's ability to handle rate limiting during payment initiation
 * by making rapid payment initiation requests and verifying retry behavior.
 */

import TestluyPaymentSDK from 'testluy-payment-sdk';
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
  // Test parameters
  requestCount: 20, // Number of requests to make
  requestDelay: 100, // Delay between requests in ms
  logFile: path.resolve(process.cwd(), 'tests/rate-limiting/results/payment-rate-limit-test-results.json'),
  callbackUrl: 'https://example.com/callback',
  backUrl: 'https://example.com/back',
};

// Function to create SDK instance
function createSdkInstance(retryConfig = {}) {
  const options = {
    clientId: config.explorer.clientId,
    secretKey: config.explorer.secretKey,
    baseUrl: config.explorer.baseUrl,
  };
  
  if (Object.keys(retryConfig).length > 0) {
    options.retryConfig = retryConfig;
  }
  
  return new TestluyPaymentSDK(options);
}

// Function to test payment initiation with rate limiting
async function testPaymentInitiation() {
  console.log('\n🚀 Testing payment initiation with rate limiting...');
  
  const sdk = createSdkInstance({
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffFactor: 2,
  });
  
  const results = [];
  
  for (let i = 0; i < config.requestCount; i++) {
    console.log(`Making payment initiation request ${i + 1}/${config.requestCount}...`);
    
    try {
      const startTime = Date.now();
      // Use a different amount for each request to avoid duplicate transaction issues
      const amount = 10.0 + (i * 0.01);
      const result = await sdk.initiatePayment(amount, config.callbackUrl, config.backUrl);
      const endTime = Date.now();
      
      results.push({
        requestNumber: i + 1,
        timestamp: new Date().toISOString(),
        success: true,
        duration: endTime - startTime,
        amount,
        transactionId: result.transactionId,
        rateLimitInfo: sdk.rateLimitInfo,
      });
      
      console.log(`✅ Payment initiation ${i + 1} successful (${endTime - startTime}ms)`);
      console.log(`   Transaction ID: ${result.transactionId}`);
    } catch (error) {
      results.push({
        requestNumber: i + 1,
        timestamp: new Date().toISOString(),
        success: false,
        error: {
          message: error.message,
          isRateLimitError: error.isRateLimitError || false,
          rateLimitInfo: error.rateLimitInfo,
          retryAfter: error.retryAfter,
          upgradeInfo: error.upgradeInfo,
        },
        sdkRateLimitInfo: sdk.rateLimitInfo,
      });
      
      console.log(`❌ Payment initiation ${i + 1} failed: ${error.message}`);
      
      if (error.isRateLimitError) {
        console.log(`⚠️ Rate limit hit on request ${i + 1}!`);
        console.log(`Retry after: ${error.retryAfter} seconds`);
        if (error.upgradeInfo) {
          console.log(`Upgrade info: ${error.upgradeInfo}`);
        }
      }
    }
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, config.requestDelay));
  }
  
  return results;
}

// Function to test payment status checking with rate limiting
async function testPaymentStatusChecking(transactionIds) {
  console.log('\n🚀 Testing payment status checking with rate limiting...');
  
  const sdk = createSdkInstance({
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffFactor: 2,
  });
  
  const results = [];
  
  // Use the transaction IDs from successful payment initiations
  for (let i = 0; i < transactionIds.length; i++) {
    const transactionId = transactionIds[i];
    console.log(`Checking payment status for transaction ${i + 1}/${transactionIds.length}...`);
    
    try {
      const startTime = Date.now();
      const result = await sdk.getPaymentStatus(transactionId);
      const endTime = Date.now();
      
      results.push({
        requestNumber: i + 1,
        timestamp: new Date().toISOString(),
        success: true,
        duration: endTime - startTime,
        transactionId,
        status: result.status,
        rateLimitInfo: sdk.rateLimitInfo,
      });
      
      console.log(`✅ Payment status check ${i + 1} successful (${endTime - startTime}ms)`);
      console.log(`   Status: ${result.status}`);
    } catch (error) {
      results.push({
        requestNumber: i + 1,
        timestamp: new Date().toISOString(),
        success: false,
        transactionId,
        error: {
          message: error.message,
          isRateLimitError: error.isRateLimitError || false,
          rateLimitInfo: error.rateLimitInfo,
          retryAfter: error.retryAfter,
          upgradeInfo: error.upgradeInfo,
        },
        sdkRateLimitInfo: sdk.rateLimitInfo,
      });
      
      console.log(`❌ Payment status check ${i + 1} failed: ${error.message}`);
    }
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, config.requestDelay));
  }
  
  return results;
}

// Main function to run all tests
async function runAllTests() {
  console.log('🧪 Starting payment rate limiting tests...');
  
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
  
  // Run payment initiation tests
  const paymentInitiationResults = await testPaymentInitiation();
  
  // Extract transaction IDs from successful payment initiations
  const transactionIds = paymentInitiationResults
    .filter(r => r.success && r.transactionId)
    .map(r => r.transactionId);
  
  console.log(`Found ${transactionIds.length} transaction IDs for status checking.`);
  
  // Run payment status checking tests if we have transaction IDs
  let paymentStatusResults = [];
  if (transactionIds.length > 0) {
    paymentStatusResults = await testPaymentStatusChecking(transactionIds);
  }
  
  // Save results to file
  const allResults = {
    testDate: new Date().toISOString(),
    paymentInitiation: paymentInitiationResults,
    paymentStatus: paymentStatusResults,
    summary: {
      paymentInitiation: {
        totalRequests: paymentInitiationResults.length,
        successfulRequests: paymentInitiationResults.filter(r => r.success).length,
        failedRequests: paymentInitiationResults.filter(r => !r.success).length,
        rateLimitErrors: paymentInitiationResults.filter(r => !r.success && r.error.isRateLimitError).length,
      },
      paymentStatus: {
        totalRequests: paymentStatusResults.length,
        successfulRequests: paymentStatusResults.filter(r => r.success).length,
        failedRequests: paymentStatusResults.filter(r => !r.success).length,
        rateLimitErrors: paymentStatusResults.filter(r => !r.success && r.error.isRateLimitError).length,
      },
    },
  };
  
  fs.writeFileSync(config.logFile, JSON.stringify(allResults, null, 2));
  console.log(`📝 Test results saved to ${config.logFile}`);
  
  // Print summary
  console.log('\n📊 Test Summary:');
  
  console.log('\nPayment Initiation:');
  console.log(`  - Total requests: ${allResults.summary.paymentInitiation.totalRequests}`);
  console.log(`  - Successful requests: ${allResults.summary.paymentInitiation.successfulRequests}`);
  console.log(`  - Failed requests: ${allResults.summary.paymentInitiation.failedRequests}`);
  console.log(`  - Rate limit errors: ${allResults.summary.paymentInitiation.rateLimitErrors}`);
  
  console.log('\nPayment Status Checking:');
  console.log(`  - Total requests: ${allResults.summary.paymentStatus.totalRequests}`);
  console.log(`  - Successful requests: ${allResults.summary.paymentStatus.successfulRequests}`);
  console.log(`  - Failed requests: ${allResults.summary.paymentStatus.failedRequests}`);
  console.log(`  - Rate limit errors: ${allResults.summary.paymentStatus.rateLimitErrors}`);
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test failed:', error);
});
