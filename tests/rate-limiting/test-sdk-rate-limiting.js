/**
 * Test script for SDK rate limiting implementation
 * 
 * This script tests the SDK's ability to handle rate limiting by making rapid API requests
 * and verifying that automatic retries and exponential backoff are working correctly.
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
  // Explorer PLUS tier credentials
  explorerPlus: {
    clientId: process.env.EXPLORER_PLUS_CLIENT_ID,
    secretKey: process.env.EXPLORER_PLUS_SECRET_KEY,
    baseUrl: process.env.TESTLUY_BASE_URL || 'http://localhost:8000',
  },
  // Test parameters
  requestCount: 40, // Number of requests to make
  requestDelay: 100, // Delay between requests in ms
  logFile: path.resolve(process.cwd(), 'tests/rate-limiting/results/sdk-rate-limit-test-results.json'),
};

// Function to create SDK instances with different retry configurations
function createSdkInstance(tier, retryConfig = {}) {
  const options = {
    clientId: tier === 'explorer' ? config.explorer.clientId : config.explorerPlus.clientId,
    secretKey: tier === 'explorer' ? config.explorer.secretKey : config.explorerPlus.secretKey,
    baseUrl: tier === 'explorer' ? config.explorer.baseUrl : config.explorerPlus.baseUrl,
  };
  
  if (Object.keys(retryConfig).length > 0) {
    options.retryConfig = retryConfig;
  }
  
  return new TestluyPaymentSDK(options);
}

// Function to test SDK with default retry configuration
async function testDefaultRetryConfig(tier) {
  console.log(`\n🚀 Testing SDK with default retry configuration for ${tier} tier...`);
  
  const sdk = createSdkInstance(tier);
  const results = [];
  
  for (let i = 0; i < config.requestCount; i++) {
    console.log(`Making request ${i + 1}/${config.requestCount} for ${tier} tier...`);
    
    try {
      const startTime = Date.now();
      const result = await sdk.validateCredentials();
      const endTime = Date.now();
      
      results.push({
        requestNumber: i + 1,
        timestamp: new Date().toISOString(),
        success: true,
        duration: endTime - startTime,
        rateLimitInfo: sdk.rateLimitInfo,
      });
      
      console.log(`✅ Request ${i + 1} successful (${endTime - startTime}ms)`);
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
      
      console.log(`❌ Request ${i + 1} failed: ${error.message}`);
      
      if (error.isRateLimitError) {
        console.log(`⚠️ Rate limit hit on request ${i + 1} for ${tier} tier!`);
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

// Function to test SDK with custom retry configuration
async function testCustomRetryConfig(tier) {
  console.log(`\n🚀 Testing SDK with custom retry configuration for ${tier} tier...`);
  
  // Create SDK with custom retry configuration (more aggressive retries)
  const sdk = createSdkInstance(tier, {
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffFactor: 1.5,
  });
  
  const results = [];
  
  for (let i = 0; i < config.requestCount; i++) {
    console.log(`Making request ${i + 1}/${config.requestCount} for ${tier} tier...`);
    
    try {
      const startTime = Date.now();
      const result = await sdk.validateCredentials();
      const endTime = Date.now();
      
      results.push({
        requestNumber: i + 1,
        timestamp: new Date().toISOString(),
        success: true,
        duration: endTime - startTime,
        rateLimitInfo: sdk.rateLimitInfo,
      });
      
      console.log(`✅ Request ${i + 1} successful (${endTime - startTime}ms)`);
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
      
      console.log(`❌ Request ${i + 1} failed: ${error.message}`);
    }
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, config.requestDelay));
  }
  
  return results;
}

// Main function to run all tests
async function runAllTests() {
  console.log('🧪 Starting SDK rate limiting tests...');
  
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
  
  // Run tests with default retry configuration for Explorer tier
  const explorerDefaultResults = await testDefaultRetryConfig('explorer');
  
  // Run tests with custom retry configuration for Explorer tier
  const explorerCustomResults = await testCustomRetryConfig('explorer');
  
  // Check if Explorer PLUS credentials are available
  let explorerPlusDefaultResults = [];
  let explorerPlusCustomResults = [];
  
  if (config.explorerPlus.clientId && config.explorerPlus.secretKey) {
    // Run tests with default retry configuration for Explorer PLUS tier
    explorerPlusDefaultResults = await testDefaultRetryConfig('explorerPlus');
    
    // Run tests with custom retry configuration for Explorer PLUS tier
    explorerPlusCustomResults = await testCustomRetryConfig('explorerPlus');
  } else {
    console.log('⚠️ Explorer PLUS tier credentials not found. Skipping Explorer PLUS tests.');
  }
  
  // Save results to file
  const allResults = {
    testDate: new Date().toISOString(),
    defaultConfig: {
      explorer: explorerDefaultResults,
      explorerPlus: explorerPlusDefaultResults,
    },
    customConfig: {
      explorer: explorerCustomResults,
      explorerPlus: explorerPlusCustomResults,
    },
    summary: {
      defaultConfig: {
        explorer: {
          totalRequests: explorerDefaultResults.length,
          successfulRequests: explorerDefaultResults.filter(r => r.success).length,
          failedRequests: explorerDefaultResults.filter(r => !r.success).length,
          rateLimitErrors: explorerDefaultResults.filter(r => !r.success && r.error.isRateLimitError).length,
        },
        explorerPlus: {
          totalRequests: explorerPlusDefaultResults.length,
          successfulRequests: explorerPlusDefaultResults.filter(r => r.success).length,
          failedRequests: explorerPlusDefaultResults.filter(r => !r.success).length,
          rateLimitErrors: explorerPlusDefaultResults.filter(r => !r.success && r.error.isRateLimitError).length,
        },
      },
      customConfig: {
        explorer: {
          totalRequests: explorerCustomResults.length,
          successfulRequests: explorerCustomResults.filter(r => r.success).length,
          failedRequests: explorerCustomResults.filter(r => !r.success).length,
          rateLimitErrors: explorerCustomResults.filter(r => !r.success && r.error.isRateLimitError).length,
        },
        explorerPlus: {
          totalRequests: explorerPlusCustomResults.length,
          successfulRequests: explorerPlusCustomResults.filter(r => r.success).length,
          failedRequests: explorerPlusCustomResults.filter(r => !r.success).length,
          rateLimitErrors: explorerPlusCustomResults.filter(r => !r.success && r.error.isRateLimitError).length,
        },
      },
    },
  };
  
  fs.writeFileSync(config.logFile, JSON.stringify(allResults, null, 2));
  console.log(`📝 Test results saved to ${config.logFile}`);
  
  // Print summary
  console.log('\n📊 Test Summary:');
  
  console.log('\nDefault Retry Configuration:');
  console.log('Explorer tier:');
  console.log(`  - Total requests: ${allResults.summary.defaultConfig.explorer.totalRequests}`);
  console.log(`  - Successful requests: ${allResults.summary.defaultConfig.explorer.successfulRequests}`);
  console.log(`  - Failed requests: ${allResults.summary.defaultConfig.explorer.failedRequests}`);
  console.log(`  - Rate limit errors: ${allResults.summary.defaultConfig.explorer.rateLimitErrors}`);
  
  if (config.explorerPlus.clientId && config.explorerPlus.secretKey) {
    console.log('Explorer PLUS tier:');
    console.log(`  - Total requests: ${allResults.summary.defaultConfig.explorerPlus.totalRequests}`);
    console.log(`  - Successful requests: ${allResults.summary.defaultConfig.explorerPlus.successfulRequests}`);
    console.log(`  - Failed requests: ${allResults.summary.defaultConfig.explorerPlus.failedRequests}`);
    console.log(`  - Rate limit errors: ${allResults.summary.defaultConfig.explorerPlus.rateLimitErrors}`);
  }
  
  console.log('\nCustom Retry Configuration:');
  console.log('Explorer tier:');
  console.log(`  - Total requests: ${allResults.summary.customConfig.explorer.totalRequests}`);
  console.log(`  - Successful requests: ${allResults.summary.customConfig.explorer.successfulRequests}`);
  console.log(`  - Failed requests: ${allResults.summary.customConfig.explorer.failedRequests}`);
  console.log(`  - Rate limit errors: ${allResults.summary.customConfig.explorer.rateLimitErrors}`);
  
  if (config.explorerPlus.clientId && config.explorerPlus.secretKey) {
    console.log('Explorer PLUS tier:');
    console.log(`  - Total requests: ${allResults.summary.customConfig.explorerPlus.totalRequests}`);
    console.log(`  - Successful requests: ${allResults.summary.customConfig.explorerPlus.successfulRequests}`);
    console.log(`  - Failed requests: ${allResults.summary.customConfig.explorerPlus.failedRequests}`);
    console.log(`  - Rate limit errors: ${allResults.summary.customConfig.explorerPlus.rateLimitErrors}`);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test failed:', error);
});
