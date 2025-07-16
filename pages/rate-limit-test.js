"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function RateLimitTest() {
  // State for credentials
  const [clientId, setClientId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  
  // State for test configuration
  const [requestCount, setRequestCount] = useState(20);
  const [requestDelay, setRequestDelay] = useState(100);
  const [useEnhancedSDK, setUseEnhancedSDK] = useState(true);
  
  // State for test results
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Chart data
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Response Time (ms)',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
      {
        label: 'Success Rate (%)',
        data: [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      }
    ],
  });

  // Function to run the rate limit test
  const runTest = async () => {
    if (!clientId || !secretKey) {
      setError("Please enter your Client ID and Secret Key");
      return;
    }
    
    setRunning(true);
    setError(null);
    setResults(null);
    setProgress(0);
    
    const testResults = {
      totalRequests: requestCount,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      cloudflareBlocks: 0,
      otherErrors: 0,
      responseTimes: [],
      errors: []
    };
    
    const responseTimeData = [];
    const successRateData = [];
    const labels = [];
    
    try {
      for (let i = 0; i < requestCount; i++) {
        const startTime = performance.now();
        
        try {
          // Use the appropriate API endpoint based on SDK selection
          const endpoint = useEnhancedSDK 
            ? "/api/enhanced-initiate-payment" 
            : "/api/initiate-payment";
          
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: 1.00, // Use a small fixed amount for testing
              clientId: clientId.trim(),
              secretKey: secretKey.trim(),
            }),
          });
          
          const data = await response.json();
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          testResults.responseTimes.push(responseTime);
          responseTimeData.push(responseTime);
          
          if (response.ok) {
            testResults.successfulRequests++;
          } else {
            testResults.failedRequests++;
            
            if (response.status === 429) {
              testResults.rateLimitedRequests++;
              testResults.errors.push(`Request ${i+1}: Rate limited - ${data.details || 'No details'}`);
            } else if (response.status === 403 && data.type === "cloudflare") {
              testResults.cloudflareBlocks++;
              testResults.errors.push(`Request ${i+1}: Cloudflare blocked - ${data.details || 'No details'}`);
            } else {
              testResults.otherErrors++;
              testResults.errors.push(`Request ${i+1}: Error ${response.status} - ${data.details || data.error || 'Unknown error'}`);
            }
          }
        } catch (err) {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          testResults.responseTimes.push(responseTime);
          responseTimeData.push(responseTime);
          testResults.failedRequests++;
          testResults.otherErrors++;
          testResults.errors.push(`Request ${i+1}: ${err.message}`);
        }
        
        // Calculate current success rate
        const currentSuccessRate = ((i + 1) === 0) ? 0 : (testResults.successfulRequests / (i + 1)) * 100;
        successRateData.push(currentSuccessRate);
        labels.push(`${i+1}`);
        
        // Update progress
        setProgress(Math.round(((i + 1) / requestCount) * 100));
        
        // Update chart data
        setChartData({
          labels,
          datasets: [
            {
              label: 'Response Time (ms)',
              data: responseTimeData,
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              yAxisID: 'y',
            },
            {
              label: 'Success Rate (%)',
              data: successRateData,
              borderColor: 'rgb(53, 162, 235)',
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
              yAxisID: 'y1',
            }
          ],
        });
        
        // Add delay between requests if specified
        if (i < requestCount - 1 && requestDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, requestDelay));
        }
      }
      
      // Calculate average response time
      testResults.averageResponseTime = testResults.responseTimes.reduce((sum, time) => sum + time, 0) / testResults.responseTimes.length;
      
      // Calculate success rate
      testResults.successRate = (testResults.successfulRequests / testResults.totalRequests) * 100;
      
      setResults(testResults);
    } catch (err) {
      setError(`Test failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Response Time (ms)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Success Rate (%)'
        }
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Rate Limit Test Results',
      },
    },
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Rate Limit Resilience Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <p>
          This test demonstrates the resilience of the enhanced SDK against rate limiting by making multiple rapid requests.
          The standard SDK will quickly hit rate limits, while the enhanced SDK uses intelligent retry strategies to maintain higher success rates.
        </p>
      </div>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h2 style={{ marginTop: '0' }}>Test Configuration</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Client ID:</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Enter your Client ID"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Secret Key:</label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Enter your Secret Key"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Number of Requests:</label>
          <input
            type="number"
            value={requestCount}
            onChange={(e) => setRequestCount(parseInt(e.target.value) || 10)}
            min="1"
            max="100"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Delay Between Requests (ms):</label>
          <input
            type="number"
            value={requestDelay}
            onChange={(e) => setRequestDelay(parseInt(e.target.value) || 0)}
            min="0"
            max="1000"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>SDK Version:</label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <label>
              <input
                type="radio"
                name="sdkVersion"
                checked={!useEnhancedSDK}
                onChange={() => setUseEnhancedSDK(false)}
              /> Standard
            </label>
            <label>
              <input
                type="radio"
                name="sdkVersion"
                checked={useEnhancedSDK}
                onChange={() => setUseEnhancedSDK(true)}
              /> Enhanced (Cloudflare Resilient)
            </label>
          </div>
        </div>
        
        <button
          onClick={runTest}
          disabled={running || !clientId || !secretKey}
          style={{
            padding: '10px 15px',
            backgroundColor: running ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: running ? 'not-allowed' : 'pointer'
          }}
        >
          {running ? `Running Test (${progress}%)` : 'Run Test'}
        </button>
      </div>
      
      {error && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8d7da', borderRadius: '5px', color: '#721c24' }}>
          <h3 style={{ marginTop: '0' }}>Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      {results && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Test Results</h2>
          
          <div style={{ marginBottom: '20px' }}>
            {chartData.labels.length > 0 && (
              <Line options={chartOptions} data={chartData} />
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
              <h3 style={{ marginTop: '0' }}>Summary</h3>
              <p><strong>Total Requests:</strong> {results.totalRequests}</p>
              <p><strong>Successful Requests:</strong> {results.successfulRequests}</p>
              <p><strong>Failed Requests:</strong> {results.failedRequests}</p>
              <p><strong>Success Rate:</strong> {results.successRate.toFixed(2)}%</p>
              <p><strong>Average Response Time:</strong> {results.averageResponseTime.toFixed(2)} ms</p>
            </div>
            
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
              <h3 style={{ marginTop: '0' }}>Error Breakdown</h3>
              <p><strong>Rate Limited Requests:</strong> {results.rateLimitedRequests}</p>
              <p><strong>Cloudflare Blocks:</strong> {results.cloudflareBlocks}</p>
              <p><strong>Other Errors:</strong> {results.otherErrors}</p>
            </div>
          </div>
          
          {results.errors.length > 0 && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
              <h3 style={{ marginTop: '0' }}>Error Details</h3>
              <ul style={{ maxHeight: '200px', overflowY: 'auto', margin: '0', paddingLeft: '20px' }}>
                {results.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>Back to Home</Link>
      </div>
    </div>
  );
}