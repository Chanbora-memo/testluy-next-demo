/**
 * Demo Project Diagnostic Tool
 * 
 * This script helps diagnose issues with the TestluyPaymentSDK in the demo project.
 */

// Import the SDK directly
import TestluyPaymentSDK from "testluy-payment-sdk";

// Sample credentials for testing
const TEST_CREDENTIALS = {
  clientId: 'fd7865634fcfaaac2b96f03386e07d27',
  secretKey: 'secret_3c8ba8fab36d6e259a2bc40230c40c9891b36cd08e6f33224e4b0abb45170e24',
  baseUrl: 'https://api-testluy.paragoniu.app'
};

// Get environment variables
const envBaseUrl = process.env.TESTLUY_BASE_URL;
const callbackUrl = process.env.NEXT_PUBLIC_CALLBACK_URL || 'http://localhost:4100/payment-callback';

async function runDiagnostic() {
  console.log('=== Demo Project Diagnostic Tool ===\n');
  console.log('Environment Information:');
  console.log(`- Node.js Version: ${process.version}`);
  console.log(`- Platform: ${process.platform}`);
  console.log(`- Environment baseUrl: ${envBaseUrl || 'Not set'}`);
  console.log(`- Callback URL: ${callbackUrl}`);
  
  // Test with different configurations
  await testConfiguration('Default Configuration (Cloudflare Resilience Enabled by Default)', {});
  await testConfiguration('With Custom Retry Settings', {
    retryConfig: {
      maxRetries: 4,
      baseDelay: 800,
      maxDelay: 8000,
      backoffFactor: 1.5,
      jitterFactor: 0.15
    }
  });
  await testConfiguration('With Enhanced Retry', {
    retryConfig: {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 15000,
      backoffFactor: 2,
      jitterFactor: 0.2
    }
  });
  await testConfiguration('With Full Configuration', {
    // Cloudflare resilience is enabled by default
    retryConfig: {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 15000,
      backoffFactor: 2,
      jitterFactor: 0.2
    },
    loggingConfig: {
      level: 'debug',
      includeHeaders: true,
      includeBody: false
    }
  });
  
  console.log('\n=== Diagnostic Complete ===');
}

async function testConfiguration(name, config) {
  console.log(`\n=== Testing ${name} ===`);
  try {
    // Create SDK with the specified configuration
    const sdk = new TestluyPaymentSDK({
      ...TEST_CREDENTIALS,
      ...config
    });
    
    console.log('SDK initialized successfully');
    
    // Test credential validation
    try {
      console.log('Testing credential validation...');
      const isValid = await sdk.validateCredentials();
      console.log('✓ Credentials valid:', isValid);
    } catch (error) {
      console.error('✗ Validation error:', error.message);
    }
    
    // Test payment initiation
    try {
      console.log('Testing payment initiation...');
      const result = await sdk.initiatePayment(10.50, callbackUrl);
      console.log('✓ Payment initiated:', result);
    } catch (error) {
      console.error('✗ Payment initiation error:', error.message);
    }
    
  } catch (error) {
    console.error('SDK initialization error:', error);
  }
}

runDiagnostic().catch(console.error);