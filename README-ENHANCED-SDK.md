# Enhanced TestLuy Payment SDK Integration

This project demonstrates the integration of the enhanced TestLuy Payment SDK with Cloudflare resilience features into a Next.js application.

## Features

The enhanced SDK provides several improvements over the standard version:

- **Cloudflare Resilience**: Automatically bypasses Cloudflare protection by mimicking legitimate browser traffic
- **Intelligent Retry Logic**: Implements exponential backoff with jitter for transient errors
- **Enhanced Error Handling**: Provides detailed error information and recovery guidance
- **Rate Limit Handling**: Respects rate limits and provides clear guidance on subscription limits
- **Browser Fingerprinting**: Rotates User-Agent strings and adds browser-like headers

## Implementation Details

The enhanced SDK has been integrated into this Next.js demo project with the following components:

### API Routes

- `/api/enhanced-initiate-payment`: Uses the enhanced SDK to initiate payments
- `/api/enhanced-validate-transaction`: Uses the enhanced SDK to validate transaction status

### UI Components

- SDK Version Toggle: Switch between standard and enhanced SDK versions
- Enhanced SDK Feature Display: Shows the features of the enhanced SDK
- Rate Limit Test Page: Demonstrates the resilience of the enhanced SDK against rate limiting

## Usage

1. Enter your TestLuy API credentials (Client ID and Secret Key)
2. Select the SDK version (Standard or Enhanced)
3. Enter the payment amount and click "Initiate Payment"
4. Use the transaction ID to validate the payment status

## Rate Limit Resilience Test

The Rate Limit Resilience Test page demonstrates how the enhanced SDK handles rate limiting compared to the standard SDK:

1. Navigate to the Rate Limit Test page
2. Configure the test parameters:
   - Number of requests
   - Delay between requests
   - SDK version (Standard or Enhanced)
3. Run the test to see how each SDK version performs under high request loads

## Error Handling

The enhanced SDK provides improved error handling for:

- Rate limiting (429 errors)
- Cloudflare protection (403 errors)
- Network issues
- API errors

Error messages are more detailed and include guidance on how to resolve issues.

## Configuration

The enhanced SDK can be configured with the following options:

```javascript
const sdk = new TestluyPaymentSDK({
  clientId: 'your-client-id',
  secretKey: 'your-secret-key',
  baseUrl: 'https://api-testluy.paragoniu.app',
  
  // Configure retry behavior
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitterFactor: 0.1
  },
  
  // Configure Cloudflare resilience
  cloudflareConfig: {
    enabled: true,
    rotateUserAgent: true,
    addBrowserHeaders: true
  }
});
```

## Benefits of Using the Enhanced SDK

1. **Higher Success Rate**: More requests succeed even under rate limiting or Cloudflare protection
2. **Better User Experience**: Fewer errors shown to end users
3. **Detailed Error Information**: When errors do occur, they provide more context and guidance
4. **Automatic Recovery**: Many transient errors are automatically handled without user intervention
5. **Configurable Behavior**: Customize retry strategies and other behaviors to suit your needs