// app/api/enhanced-validate-transaction/route.js
import TestluyPaymentSDK from "testluy-payment-sdk/index-enhanced.js";
import { NextResponse } from "next/server";

export async function POST(req) {
  let transactionId, clientId, secretKey;
  try {
    const body = await req.json();
    transactionId = body.transactionId;
    clientId = body.clientId;
    secretKey = body.secretKey;
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Basic validation for transaction ID
  if (!transactionId || typeof transactionId !== "string") {
    return NextResponse.json(
      { error: "Invalid or missing transaction ID." },
      { status: 400 }
    );
  }

  // Validate credentials from request body
  if (!clientId || typeof clientId !== "string" || !clientId.trim()) {
    return NextResponse.json(
      { error: "Client ID is required." },
      { status: 400 }
    );
  }

  if (!secretKey || typeof secretKey !== "string" || !secretKey.trim()) {
    return NextResponse.json(
      { error: "Secret Key is required." },
      { status: 400 }
    );
  }

  // Get base URL from environment variables
  const baseUrl =
    process.env.TESTLUY_BASE_URL || "https://api-testluy.paragoniu.app";

  try {
    console.log(
      `Instantiating Enhanced SDK with clientId: ${clientId}, baseUrl: ${baseUrl}`
    );
    
    // Create SDK instance with enhanced Cloudflare resilience
    const sdk = new TestluyPaymentSDK({
      clientId: clientId.trim(),
      secretKey: secretKey.trim(),
      baseUrl: baseUrl,
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

    console.log(
      `Calling getPaymentStatus with transactionId: ${transactionId}`
    );
    const statusResult = await sdk.getPaymentStatus(transactionId);
    console.log(`Received status result:`, statusResult);

    if (!statusResult) {
      console.error("Empty result received from sdk.getPaymentStatus");
      throw new Error("Failed to get transaction status details from SDK.");
    }

    // Return the transaction status details to the frontend
    return NextResponse.json({
      ...statusResult,
      enhanced: true // Flag to indicate this was processed by the enhanced SDK
    });
  } catch (error) {
    console.error("Error validating transaction:", error.message);
    console.error("Full error object:", error);

    // Handle specific error types from the enhanced SDK
    if (error.isRateLimitError) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          details: error.message,
          rateLimitInfo: error.rateLimitInfo,
          retryAfter: error.retryAfter,
          type: "rate_limit"
        },
        { status: 429 }
      );
    } else if (error.isCloudflareError) {
      return NextResponse.json(
        { 
          error: "Cloudflare protection encountered", 
          details: error.message,
          challengeType: error.challengeType,
          type: "cloudflare"
        },
        { status: 403 }
      );
    }

    // Check if it's a "transaction not found" error
    if (error.message && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Transaction not found", details: error.message },
        { status: 404 }
      );
    }

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to validate transaction.";

    return NextResponse.json(
      { error: "Failed to validate transaction.", details: errorMessage },
      { status: 500 }
    );
  }
}