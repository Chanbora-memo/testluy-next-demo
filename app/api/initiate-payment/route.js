// app/api/initiate-payment/route.js
import TestluyPaymentSDK from "testluy-payment-sdk";
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
  const baseUrl = process.env.TESTLUY_BASE_URL || "https://testluy.tech";
  
  // Check if we're using the paragoniu.app API domain 
  // When using api-testluy.paragoniu.app, routes don't have the /api prefix
  const isParagoniuApiDomain = baseUrl.includes('api-testluy.paragoniu.app');

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
      `Instantiating SDK with clientId: ${clientId}, baseUrl: ${baseUrl}`
    );
    
    // Create SDK instance
    const sdk = new TestluyPaymentSDK({
      clientId: clientId.trim(),
      secretKey: secretKey.trim(),
      baseUrl: baseUrl,
    });

    // If using paragoniu API domain, we need to manually construct the API call
    // because the SDK hardcodes the 'api/' prefix which creates double /api/ in the URL
    if (isParagoniuApiDomain) {
      console.log("Using ParagonIU API domain - making direct API call");
      
      // Make direct API call without using SDK's initiatePayment method
      const path = "payment-simulator/generate-url";  // No 'api/' prefix for paragoniu domain
      const body = {
        amount,
        callback_url: callbackUrl,
        ...(backUrl && { back_url: backUrl }),
      };
      
      try {
        // Generate auth headers manually using SDK's private method
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const encoder = new TextEncoder();
        const bodyString = JSON.stringify(body);
        const stringToSign = "POST" + "\n" + path + "\n" + timestamp + "\n" + bodyString;
        
        // Convert secret key to Uint8Array  
        const keyData = encoder.encode(secretKey.trim());
        
        // Import the key for HMAC
        const key = await crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        
        // Create the signature
        const signature = await crypto.subtle.sign(
          "HMAC",
          key,
          encoder.encode(stringToSign)
        );
        
        // Convert signature ArrayBuffer to hex string
        const hexSignature = Array.from(new Uint8Array(signature))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        
        const headers = {
          "X-Client-ID": clientId.trim(),
          "X-Timestamp": timestamp,
          "X-Signature": hexSignature,
          "Content-Type": "application/json",
          "Accept": "application/json",
        };
        
        const fullUrl = `${baseUrl}/${path}`;
        console.log(`Making direct API call to: ${fullUrl}`);
        
        const response = await fetch(fullUrl, {
          method: "POST",
          headers: headers,
          body: bodyString,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API request failed: ${errorData.error || errorData.message || `Request failed with status code ${response.status}`}`);
        }
        
        const responseData = await response.json();
        const { payment_url, transaction_id } = responseData;
        
        if (!payment_url || !transaction_id) {
          console.error("Incomplete response from API:", responseData);
          throw new Error("API did not return the expected payment details.");
        }
        
        const paymentResult = {
          paymentUrl: payment_url,
          transactionId: transaction_id,
        };
        
        console.log(`Received payment result:`, paymentResult);
        
        // Send both paymentUrl and transactionId back to the frontend
        return NextResponse.json({
          paymentUrl: paymentResult.paymentUrl,
          transactionId: paymentResult.transactionId,
        });
        
      } catch (directApiError) {
        console.error("Direct API call failed:", directApiError.message);
        throw directApiError;
      }
      
    } else {
      // Use normal SDK method for testluy.tech domain
      console.log(
        `Calling SDK initiatePayment with amount: ${amount}, callback: ${callbackUrl}, backUrl: ${
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
      });
    }
  } catch (error) {
    console.error("Error initiating payment:", error.message);
    console.error("Full error object:", error);

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
