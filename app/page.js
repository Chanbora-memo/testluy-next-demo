// app/page.js
"use client";

import { useState } from "react";
import styles from "./Home.module.css";

export default function Home() {
  // Credential states
  const [clientId, setClientId] = useState("");
  const [secretKey, setSecretKey] = useState("");

  // Payment initiation states
  const [amount, setAmount] = useState("");
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Transaction validation states
  const [validationTransactionId, setValidationTransactionId] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);

  const handleClientIdChange = (e) => {
    setClientId(e.target.value);
    // Clear previous results when credentials change
    setPaymentUrl(null);
    setTransactionId(null);
    setError(null);
    setValidationResult(null);
    setValidationError(null);
  };

  const handleSecretKeyChange = (e) => {
    setSecretKey(e.target.value);
    // Clear previous results when credentials change
    setPaymentUrl(null);
    setTransactionId(null);
    setError(null);
    setValidationResult(null);
    setValidationError(null);
  };

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
    setPaymentUrl(null);
    setTransactionId(null);
    setError(null);
  };

  const handleValidationIdChange = (e) => {
    setValidationTransactionId(e.target.value);
    setValidationResult(null);
    setValidationError(null);
  };

  const handleInitiatePayment = async () => {
    setLoading(true);
    setError(null);
    setPaymentUrl(null);
    setTransactionId(null);

    // Validate credentials
    if (!clientId.trim()) {
      setError("Please enter your Client ID.");
      setLoading(false);
      return;
    }

    if (!secretKey.trim()) {
      setError("Please enter your Secret Key.");
      setLoading(false);
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive amount.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/initiate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
          clientId: clientId.trim(),
          secretKey: secretKey.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details || data.error || `HTTP error! status: ${response.status}`
        );
      }

      if (!data.paymentUrl || !data.transactionId) {
        console.error("Incomplete response from API:", data);
        throw new Error("API did not return the expected payment details.");
      }

      setPaymentUrl(data.paymentUrl);
      setTransactionId(data.transactionId);
      console.log("Payment URL:", data.paymentUrl);
      console.log("Transaction ID:", data.transactionId);
    } catch (err) {
      console.error("Frontend Error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleValidateTransaction = async () => {
    if (!validationTransactionId.trim()) {
      setValidationError("Please enter a transaction ID.");
      return;
    }

    // Validate credentials
    if (!clientId.trim()) {
      setValidationError("Please enter your Client ID.");
      return;
    }

    if (!secretKey.trim()) {
      setValidationError("Please enter your Secret Key.");
      return;
    }

    setValidationLoading(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      const response = await fetch("/api/validate-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: validationTransactionId.trim(),
          clientId: clientId.trim(),
          secretKey: secretKey.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details || data.error || `HTTP error! status: ${response.status}`
        );
      }

      setValidationResult(data);
      console.log("Validation result:", data);
    } catch (err) {
      console.error("Validation Error:", err);
      setValidationError(err.message || "An unexpected error occurred.");
    } finally {
      setValidationLoading(false);
    }
  };

  // Helper function to format date strings
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Testluy Payment SDK Demo (App Router)</h1>

        <div className={styles.warningBanner}>
          <h3>🚨 Security Notice</h3>
          <p>
            This demo allows you to enter your credentials for testing purposes
            when the app is hosted. In production, never expose your secret key
            in client-side code. This demo securely transmits credentials to
            server-side API routes for SDK usage.
          </p>
        </div>

        {/* Credentials Configuration Section */}
        <h2 className={styles.sectionTitle}>API Credentials Configuration</h2>
        <div className={styles.card}>
          <label htmlFor="clientId">Client ID: </label>
          <input
            type="text"
            id="clientId"
            value={clientId}
            onChange={handleClientIdChange}
            placeholder="Enter your Testluy Client ID"
            className={styles.inputField}
          />

          <label htmlFor="secretKey">Secret Key: </label>
          <input
            type="password"
            id="secretKey"
            value={secretKey}
            onChange={handleSecretKeyChange}
            placeholder="Enter your Testluy Secret Key"
            className={styles.inputField}
          />

          <p className={styles.credentialsNote}>
            <strong>Note:</strong> Enter the credentials you obtained from your
            TestLuy REST API application.
          </p>
        </div>

        {/* Payment Initiation Section */}
        <h2 className={styles.sectionTitle}>Initiate Payment</h2>
        <div className={styles.card}>
          <label htmlFor="amount">Amount (USD): </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={handleAmountChange}
            placeholder="e.g., 10.50"
            min="0.01"
            step="0.01"
            required
            className={styles.inputField}
          />
          <button
            onClick={handleInitiatePayment}
            disabled={
              loading || !amount || !clientId.trim() || !secretKey.trim()
            }
            className={styles.button}
          >
            {loading ? "Processing..." : "Initiate Payment"}
          </button>
        </div>

        {paymentUrl && (
          <div className={`${styles.card} ${styles.success}`}>
            <h3>Payment URL Generated:</h3>
            <p>You can now redirect the user to:</p>
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {paymentUrl}
            </a>
            {transactionId && (
              <p style={{ marginTop: "10px", fontSize: "0.9em" }}>
                Transaction ID: {transactionId}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className={`${styles.card} ${styles.error}`}>
            <h3>Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Transaction Validation Section */}
        <h2 className={styles.sectionTitle}>Validate Transaction</h2>
        <div className={styles.card}>
          <label htmlFor="transactionId">Transaction ID: </label>
          <input
            type="text"
            id="transactionId"
            value={validationTransactionId}
            onChange={handleValidationIdChange}
            placeholder="Enter transaction ID"
            className={styles.inputField}
          />
          <button
            onClick={handleValidateTransaction}
            disabled={
              validationLoading ||
              !validationTransactionId.trim() ||
              !clientId.trim() ||
              !secretKey.trim()
            }
            className={styles.button}
          >
            {validationLoading ? "Validating..." : "Validate Transaction"}
          </button>
        </div>

        {validationResult && (
          <div className={`${styles.card} ${styles.success}`}>
            <h3>Transaction Details:</h3>
            <div className={styles.transactionDetails}>
              <p>
                <strong>Transaction ID:</strong>{" "}
                {validationResult.transaction_id || validationResult.id}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={
                    styles[
                      `status${validationResult.status
                        ?.charAt(0)
                        .toUpperCase()}${validationResult.status
                        ?.slice(1)
                        .toLowerCase()}` || ""
                    ]
                  }
                >
                  {validationResult.status || "Unknown"}
                </span>
              </p>
              <p>
                <strong>Amount:</strong> $
                {typeof validationResult.amount === "number"
                  ? validationResult.amount.toFixed(2)
                  : validationResult.amount || "N/A"}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {formatDate(validationResult.created_at)}
              </p>
              <p>
                <strong>Updated:</strong>{" "}
                {formatDate(validationResult.updated_at)}
              </p>
              {validationResult.callback_url && (
                <p>
                  <strong>Callback URL:</strong> {validationResult.callback_url}
                </p>
              )}
            </div>
          </div>
        )}

        {validationError && (
          <div className={`${styles.card} ${styles.error}`}>
            <h3>Validation Error:</h3>
            <p>{validationError}</p>
          </div>
        )}
      </main>
    </div>
  );
}
