"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Processing payment callback...");

  // Read parameters using useSearchParams hook
  const status = searchParams.get("status");
  const transaction_id = searchParams.get("transaction_id");

  useEffect(() => {
    if (status && transaction_id) {
      if (status === "success") {
        setMessage(`Payment successful! Transaction ID: ${transaction_id}`);
      } else {
        setMessage(
          `Payment failed or was cancelled. Transaction ID: ${transaction_id}`
        );
      }
    } else {
      if (searchParams.toString()) {
        setMessage("Callback parameters missing or invalid.");
      } else {
        setMessage("Waiting for callback parameters...");
      }
    }
  }, [status, transaction_id, searchParams, router]);
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Payment Callback</h1>
      <p style={{ margin: "1rem 0", fontSize: "1.1rem" }}>{message}</p>
      <Link href="/">Go Home</Link>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Payment Callback</h1>
      <p style={{ margin: "1rem 0", fontSize: "1.1rem" }}>
        Loading payment callback...
      </p>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
