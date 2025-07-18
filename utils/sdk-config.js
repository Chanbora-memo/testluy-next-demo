/**
 * SDK Configuration Utility
 * 
 * This utility ensures consistent SDK configuration across the project.
 */

import TestluyPaymentSDK from "testluy-payment-sdk";

/**
 * Creates a properly configured SDK instance
 * 
 * @param {Object} options - SDK configuration options
 * @param {string} options.clientId - Client ID for authentication
 * @param {string} options.secretKey - Secret key for authentication
 * @param {string} [options.baseUrl] - Base URL for API requests (defaults to env var or fallback)
 * @returns {TestluyPaymentSDK} - Configured SDK instance
 */
export function createSDK(options) {
  const {
    clientId,
    secretKey,
    baseUrl = process.env.TESTLUY_BASE_URL || "https://api-testluy.paragoniu.app"
  } = options;
  
  if (!clientId || !secretKey) {
    throw new Error("Client ID and Secret Key are required");
  }
  
  // The SDK now always uses the /api/ prefix by default
  console.log(`Creating SDK with baseUrl: ${baseUrl}`);
  
  // Create SDK with proper configuration
  return new TestluyPaymentSDK({
    clientId: clientId.trim(),
    secretKey: secretKey.trim(),
    baseUrl: baseUrl,
    // Cloudflare resilience is enabled by default in the SDK
    // No need to explicitly set cloudflareConfig
    // Configure retry behavior
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      jitterFactor: 0.2
    },
    // Configure logging
    loggingConfig: {
      level: 'debug',
      includeHeaders: true,
      includeBody: false
    }
  });
}

/**
 * Validates SDK credentials
 * 
 * @param {Object} options - SDK configuration options
 * @returns {Promise<boolean>} - True if credentials are valid
 */
export async function validateSDKCredentials(options) {
  const sdk = createSDK(options);
  return await sdk.validateCredentials();
}

/**
 * Initiates a payment using the SDK
 * 
 * @param {Object} options - SDK configuration options
 * @param {number} amount - Payment amount
 * @param {string} callbackUrl - Callback URL for payment completion
 * @param {string} [backUrl] - Back URL for payment cancellation
 * @returns {Promise<Object>} - Payment result
 */
export async function initiateSDKPayment(options, amount, callbackUrl, backUrl) {
  const sdk = createSDK(options);
  return await sdk.initiatePayment(amount, callbackUrl, backUrl);
}

/**
 * Gets payment status using the SDK
 * 
 * @param {Object} options - SDK configuration options
 * @param {string} transactionId - Transaction ID to check
 * @returns {Promise<Object>} - Payment status
 */
export async function getSDKPaymentStatus(options, transactionId) {
  const sdk = createSDK(options);
  return await sdk.getPaymentStatus(transactionId);
}