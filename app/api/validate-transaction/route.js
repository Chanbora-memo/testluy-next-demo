// app/api/validate-transaction/route.js
import TestluyPaymentSDK from "testluy-payment-sdk";
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
  const baseUrl = process.env.TESTLUY_BASE_URL || "https://testluy.tech";
  
  // Check if we're using the paragoniu.app API domain 
  // When using api-testluy.paragoniu.app, routes don't have the /api prefix
  const isParagoniuApiDomain = baseUrl.includes('api-testluy.paragoniu.app');

  try {
    console.log(
      `Instantiating SDK with clientId: ${clientId}, baseUrl: ${baseUrl}`
    );
    const sdk = new TestluyPaymentSDK({
      clientId: clientId.trim(),
      secretKey: secretKey.trim(),
      baseUrl: baseUrl,
    });

    // If using paragoniu API domain, we need to manually construct the API call
    if (isParagoniuApiDomain) {
      console.log("Using ParagonIU API domain - making direct API call for status check");
      
      // Make direct API call without using SDK's getPaymentStatus method
      const path = `payment-simulator/status/${transactionId}`;  // No 'api/' prefix for paragoniu domain
      
      try {
        // Generate auth headers manually using SDK's private method
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const encoder = new TextEncoder();
        const stringToSign = "GET" + "\n" + path + "\n" + timestamp + "\n" + "";
        
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
          method: "GET",
          headers: headers,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Check if it's a "transaction not found" error
          if (response.status === 404) {
            return NextResponse.json(
              { error: "Transaction not found", details: errorData.error || errorData.message || "Transaction not found" },
              { status: 404 }
            );
          }
          
          throw new Error(`API request failed: ${errorData.error || errorData.message || `Request failed with status code ${response.status}`}`);
        }
        
        const statusResult = await response.json();
        console.log(`Received status result:`, statusResult);
        
        if (!statusResult) {
          console.error("Empty result received from API");
          throw new Error("Failed to get transaction status details from API.");
        }

        // Return the transaction status details to the frontend
        return NextResponse.json(statusResult);
        
      } catch (directApiError) {
        console.error("Direct API call failed:", directApiError.message);
        
        // Check if it's a "transaction not found" error
        if (directApiError.message && directApiError.message.includes("not found")) {
          return NextResponse.json(
            { error: "Transaction not found", details: directApiError.message },
            { status: 404 }
          );
        }
        
        throw directApiError;
      }
      
    } else {
      // Use normal SDK method for testluy.tech domain
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
      return NextResponse.json(statusResult);
    }
  } catch (error) {
    console.error("Error validating transaction:", error.message);
    console.error("Full error object:", error);

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
