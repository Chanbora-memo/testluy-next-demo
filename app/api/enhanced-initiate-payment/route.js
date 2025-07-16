// app/api/enhanced-initiate-payment/route.js
import TestluyPaymentSDK from "testluy-payment-sdk/index-enhanced.js";
import { NextResponse } from "next/server";

export async function POST(req) {
  let amount, clientId, secretKey;
  try {
    const body = await req.json();
    amount = body.amount;
    clientId = body.clientId;
    secretKey = body.secretKey;
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Basic validation for amount
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "Invalid amount provided." },
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
  const baseUrl = process.env.TESTLUY_BASE_URL || "https://api-testluy.paragoniu.app";

  // Use environment variables for callback URLs as fallback, or construct them
  const callbackUrl =
    process.env.NEXT_PUBLIC_CALLBACK_URL ||
    `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4100"
    }/payment-callback`;
  const backUrl =
    process.env.NEXT_PUBLIC_BACK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4100"}/`;

  // Validate callback URL format
  try {
    new URL(callbackUrl);
  } catch (urlError) {
    console.error(
      "Invalid callback URL format:",
      callbackUrl,
      urlError.message
    );
    return NextResponse.json(
      { error: "Server configuration error: Invalid callback URL format." },
      { status: 500 }
    );
  }

  // Validate backUrl if present
  if (backUrl) {
    try {
      new URL(backUrl);
    } catch (urlError) {
      console.error("Invalid back URL format:", backUrl, urlError.message);
      return NextResponse.json(
        { error: "Server configuration error: Invalid back URL format." },
        { status: 500 }
      );
    }
  }
  
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
      `Calling initiatePayment with amount: ${amount}, callback: ${callbackUrl}, backUrl: ${
        backUrl || "Not provided"
      }`
    );
    
    const paymentResult = await sdk.initiatePayment(
      amount,
      callbackUrl,
      backUrl
    );
    console.log(`Received payment result:`, paymentResult);

    if (
      !paymentResult ||
      !paymentResult.paymentUrl ||
      !paymentResult.transactionId
    ) {
      console.error(
        "Incomplete result received from sdk.initiatePayment",
        paymentResult
      );
      throw new Error(
        "Failed to get complete payment initiation details from SDK."
      );
    }

    // Send both paymentUrl and transactionId back to the frontend
    return NextResponse.json({
      paymentUrl: paymentResult.paymentUrl,
      transactionId: paymentResult.transactionId,
      enhanced: true // Flag to indicate this was processed by the enhanced SDK
    });
  } catch (error) {
    console.error("Error initiating payment:", error.message);
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

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to initiate payment.";
      
    return NextResponse.json(
      { error: "Failed to initiate payment.", details: errorMessage },
      { status: 500 }
    );
  }
}