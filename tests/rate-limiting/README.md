# Rate Limiting Testing Guide

This guide provides instructions for testing the rate limiting implementation in the testluy-payment-sdk and testLuy_back_end.

## Prerequisites

1. Node.js (v14 or higher)
2. npm or yarn
3. Access to testLuy_back_end API (running locally or on a server)
4. API credentials for both Explorer and Explorer PLUS tiers (optional for Explorer PLUS)

## Setup

1. Make sure your `.env.local` file contains the necessary API credentials:

```
# Required: Explorer tier credentials
TESTLUY_CLIENT_ID=your_explorer_client_id
TESTLUY_SECRET_KEY=your_explorer_secret_key
TESTLUY_BASE_URL=http://localhost:8000  # Update with your API URL

# Optional: Explorer PLUS tier credentials
EXPLORER_PLUS_CLIENT_ID=your_explorer_plus_client_id
EXPLORER_PLUS_SECRET_KEY=your_explorer_plus_secret_key
```

2. Install dependencies if you haven't already:

```bash
npm install
# or
yarn install
```

3. Create the results directory:

```bash
mkdir -p tests/rate-limiting/results
```

## Running the Tests

### 1. Backend Rate Limiting Test

This test verifies that the backend correctly enforces rate limits based on subscription tiers.

```bash
node tests/rate-limiting/test-rate-limiting.js
```

The test will:
- Make rapid API requests to the backend using both Explorer and Explorer PLUS credentials (if available)
- Record the responses, including rate limit headers and 429 responses
- Save the results to `tests/rate-limiting/results/rate-limit-test-results.json`
- Print a summary of the test results

### 2. SDK Rate Limiting Test

This test verifies that the SDK correctly handles rate limiting with automatic retries and exponential backoff.

```bash
node tests/rate-limiting/test-sdk-rate-limiting.js
```

The test will:
- Make rapid API requests using the SDK with both default and custom retry configurations
- Test both Explorer and Explorer PLUS tiers (if credentials are available)
- Record the responses, including retry attempts and rate limit information
- Save the results to `tests/rate-limiting/results/sdk-rate-limit-test-results.json`
- Print a summary of the test results

### 3. Payment Initiation Rate Limiting Test

This test verifies that the SDK correctly handles rate limiting during payment initiation and status checking.

```bash
node tests/rate-limiting/test-payment-rate-limiting.js
```

The test will:
- Make rapid payment initiation requests using the SDK
- Check the status of successful payment initiations
- Record the responses, including retry attempts and rate limit information
- Save the results to `tests/rate-limiting/results/payment-rate-limit-test-results.json`
- Print a summary of the test results

## Interpreting the Results

### What to Look For

1. **Different Rate Limits by Tier**: The Explorer PLUS tier should have a higher rate limit (100 requests/minute) than the Explorer tier (30 requests/minute). This should be reflected in:
   - The number of successful requests before hitting rate limits
   - The `x-ratelimit-limit` header values
   - The rate limit information in error responses

2. **Automatic Retries**: When rate limits are hit, the SDK should automatically retry the request after the specified delay. Look for:
   - Longer request durations for requests that involved retries
   - Successful requests despite hitting rate limits (if retries were successful)
   - The number of rate limit errors should be lower with custom retry configuration (more retries)

3. **Exponential Backoff**: The delay between retries should increase exponentially. This is harder to observe directly, but you can infer it from:
   - Increasing request durations for consecutive rate-limited requests
   - Log messages showing increasing retry delays

4. **Detailed Error Information**: When rate limits are exceeded even after retries, the error should contain detailed information:
   - `isRateLimitError` flag should be `true`
   - `rateLimitInfo` should contain limit, remaining, and reset information
   - `retryAfter` should indicate when to retry
   - `upgradeInfo` should suggest upgrading to a higher tier (for Explorer tier)

## Troubleshooting

### Common Issues

1. **API Credentials**: Ensure your API credentials are correct and have the appropriate subscription tiers.

2. **API Availability**: Make sure the testLuy_back_end API is running and accessible.

3. **Rate Limit Configuration**: Verify that the rate limit configuration in the backend is correct:
   - Explorer tier: 30 requests/minute
   - Explorer PLUS tier: 100 requests/minute

4. **SDK Version**: Ensure you're using the latest version of the SDK (3.1.0 or higher) that includes rate limiting support.

### Debugging

If you encounter issues, you can add more detailed logging to the test scripts by uncommenting or adding `console.log` statements.

For more detailed analysis, examine the JSON result files:
- `tests/rate-limiting/results/rate-limit-test-results.json`
- `tests/rate-limiting/results/sdk-rate-limit-test-results.json`
- `tests/rate-limiting/results/payment-rate-limit-test-results.json`

These files contain detailed information about each request, including headers, response data, and error information.

## Conclusion

By running these tests, you can verify that:

1. The backend correctly enforces different rate limits based on subscription tiers
2. The SDK correctly handles rate limiting with automatic retries and exponential backoff
3. Detailed error information is provided when rate limits are exceeded
4. Rate limit information is properly tracked and exposed through the SDK
