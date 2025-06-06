import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Container, Row, Col, Form, Button, Table, Alert } from 'react-bootstrap';
import TestluyPaymentSDK from 'testluy-payment-sdk';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function RateLimitTest() {
  // State for form inputs
  const [clientId, setClientId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:8000');
  const [requestCount, setRequestCount] = useState(40);
  const [requestDelay, setRequestDelay] = useState(100);
  const [maxRetries, setMaxRetries] = useState(3);
  const [initialDelay, setInitialDelay] = useState(1000);
  const [maxDelay, setMaxDelay] = useState(10000);
  const [backoffFactor, setBackoffFactor] = useState(2);

  // State for test results
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    rateLimitedRequests: 0,
    otherErrors: 0,
    successRate: '0%',
    avgResponseTime: '0ms',
  });

  // Chart data
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Response Time (ms)',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Remaining Requests',
        data: [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y1',
      },
    ],
  });

  // Refs
  const logEndRef = useRef(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Add a log message
  const addLog = (message, type = 'info') => {
    setLogs((prevLogs) => [
      ...prevLogs,
      { id: Date.now(), message, type, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  // Update chart data
  const updateChart = (requestNumber, responseTime, remainingRequests) => {
    setChartData((prevData) => {
      const newLabels = [...prevData.labels, requestNumber];
      const newResponseTimes = [...prevData.datasets[0].data, responseTime];
      const newRemainingRequests = [...prevData.datasets[1].data, remainingRequests || 0];

      return {
        labels: newLabels,
        datasets: [
          {
            ...prevData.datasets[0],
            data: newResponseTimes,
          },
          {
            ...prevData.datasets[1],
            data: newRemainingRequests,
          },
        ],
      };
    });
  };

  // Update summary
  const updateSummary = () => {
    const totalRequests = results.length;
    const successfulRequests = results.filter((r) => r.success).length;
    const rateLimitedRequests = results.filter(
      (r) => !r.success && r.error?.isRateLimitError
    ).length;
    const otherErrors = totalRequests - successfulRequests - rateLimitedRequests;
    const successRate =
      totalRequests > 0 ? `${Math.round((successfulRequests / totalRequests) * 100)}%` : '0%';
    const totalResponseTime = results.reduce(
      (sum, r) => sum + (r.duration || 0),
      0
    );
    const avgResponseTime =
      totalRequests > 0 ? `${Math.round(totalResponseTime / totalRequests)}ms` : '0ms';

    setSummary({
      totalRequests,
      successfulRequests,
      rateLimitedRequests,
      otherErrors,
      successRate,
      avgResponseTime,
    });
  };

  // Run the test
  const runTest = async () => {
    // Validate inputs
    if (!clientId || !secretKey || !baseUrl) {
      addLog('Please fill in all required fields.', 'error');
      return;
    }

    // Reset state
    setIsRunning(true);
    setLogs([]);
    setResults([]);
    setChartData({
      labels: [],
      datasets: [
        {
          label: 'Response Time (ms)',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Remaining Requests',
          data: [],
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          yAxisID: 'y1',
        },
      ],
    });

    addLog('🚀 Starting rate limit test...', 'info');

    // Create SDK instance
    const sdk = new TestluyPaymentSDK({
      clientId,
      secretKey,
      baseUrl,
      retryConfig: {
        maxRetries,
        initialDelayMs: initialDelay,
        maxDelayMs: maxDelay,
        backoffFactor,
      },
    });

    // Run the test
    const newResults = [];
    for (let i = 0; i < requestCount; i++) {
      if (!isRunning) {
        addLog('Test stopped by user.', 'warning');
        break;
      }

      addLog(`Making request ${i + 1}/${requestCount}...`, 'info');

      try {
        const startTime = Date.now();
        const result = await sdk.validateCredentials();
        const endTime = Date.now();
        const duration = endTime - startTime;

        const resultObj = {
          requestNumber: i + 1,
          timestamp: new Date().toISOString(),
          success: true,
          duration,
          rateLimitInfo: { ...sdk.rateLimitInfo },
        };

        newResults.push(resultObj);
        setResults([...newResults]);

        addLog(
          `✅ Request ${i + 1} successful (${duration}ms). Remaining: ${
            sdk.rateLimitInfo.remaining || 'unknown'
          }`,
          'success'
        );

        updateChart(i + 1, duration, sdk.rateLimitInfo.remaining);
      } catch (error) {
        const resultObj = {
          requestNumber: i + 1,
          timestamp: new Date().toISOString(),
          success: false,
          error: {
            message: error.message,
            isRateLimitError: error.isRateLimitError || false,
            rateLimitInfo: error.rateLimitInfo,
            retryAfter: error.retryAfter,
            upgradeInfo: error.upgradeInfo,
          },
          sdkRateLimitInfo: { ...sdk.rateLimitInfo },
        };

        newResults.push(resultObj);
        setResults([...newResults]);

        if (error.isRateLimitError) {
          addLog(
            `⚠️ Rate limit hit on request ${i + 1}! Retry after: ${
              error.retryAfter || 'unknown'
            } seconds`,
            'warning'
          );
          if (error.upgradeInfo) {
            addLog(`Upgrade info: ${error.upgradeInfo}`, 'info');
          }
        } else {
          addLog(`❌ Request ${i + 1} failed: ${error.message}`, 'error');
        }

        updateChart(i + 1, 0, sdk.rateLimitInfo.remaining);
      }

      updateSummary();

      // Add delay between requests
      if (i < requestCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, requestDelay));
      }
    }

    setIsRunning(false);
    addLog('✅ Test complete!', 'success');
  };

  // Stop the test
  const stopTest = () => {
    setIsRunning(false);
    addLog('Stopping test...', 'warning');
  };

  return (
    <Container fluid className="p-4">
      <Head>
        <title>TestLuy Rate Limiting Test</title>
      </Head>

      <h1 className="mb-4">TestLuy Rate Limiting Test</h1>

      <Row>
        <Col md={4}>
          <div className="p-3 border rounded mb-4">
            <h2>Test Configuration</h2>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Client ID</Form.Label>
                <Form.Control
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Your TestLuy Client ID"
                  disabled={isRunning}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Secret Key</Form.Label>
                <Form.Control
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Your TestLuy Secret Key"
                  disabled={isRunning}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Base URL</Form.Label>
                <Form.Control
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="API Base URL"
                  disabled={isRunning}
                />
              </Form.Group>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Request Count</Form.Label>
                    <Form.Control
                      type="number"
                      value={requestCount}
                      onChange={(e) => setRequestCount(parseInt(e.target.value))}
                      min="1"
                      max="100"
                      disabled={isRunning}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Delay (ms)</Form.Label>
                    <Form.Control
                      type="number"
                      value={requestDelay}
                      onChange={(e) => setRequestDelay(parseInt(e.target.value))}
                      min="0"
                      max="1000"
                      disabled={isRunning}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <h3 className="mt-4">Retry Configuration</h3>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Max Retries</Form.Label>
                    <Form.Control
                      type="number"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                      min="0"
                      max="10"
                      disabled={isRunning}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Initial Delay (ms)</Form.Label>
                    <Form.Control
                      type="number"
                      value={initialDelay}
                      onChange={(e) => setInitialDelay(parseInt(e.target.value))}
                      min="100"
                      max="5000"
                      disabled={isRunning}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Max Delay (ms)</Form.Label>
                    <Form.Control
                      type="number"
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(parseInt(e.target.value))}
                      min="1000"
                      max="30000"
                      disabled={isRunning}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Backoff Factor</Form.Label>
                    <Form.Control
                      type="number"
                      value={backoffFactor}
                      onChange={(e) => setBackoffFactor(parseFloat(e.target.value))}
                      min="1"
                      max="5"
                      step="0.1"
                      disabled={isRunning}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-grid gap-2">
                {!isRunning ? (
                  <Button variant="primary" onClick={runTest}>
                    Start Test
                  </Button>
                ) : (
                  <Button variant="danger" onClick={stopTest}>
                    Stop Test
                  </Button>
                )}
              </div>
            </Form>
          </div>

          <div className="p-3 border rounded">
            <h2>Results Summary</h2>
            <Table striped bordered hover>
              <tbody>
                <tr>
                  <td>Total Requests</td>
                  <td>{summary.totalRequests}</td>
                </tr>
                <tr>
                  <td>Successful</td>
                  <td>{summary.successfulRequests}</td>
                </tr>
                <tr>
                  <td>Rate Limited</td>
                  <td>{summary.rateLimitedRequests}</td>
                </tr>
                <tr>
                  <td>Other Errors</td>
                  <td>{summary.otherErrors}</td>
                </tr>
                <tr>
                  <td>Success Rate</td>
                  <td>{summary.successRate}</td>
                </tr>
                <tr>
                  <td>Avg Response Time</td>
                  <td>{summary.avgResponseTime}</td>
                </tr>
              </tbody>
            </Table>
          </div>
        </Col>

        <Col md={8}>
          <div className="p-3 border rounded mb-4">
            <h2>Test Results</h2>
            <div style={{ height: '400px' }}>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Response Time (ms)',
                      },
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: {
                        display: true,
                        text: 'Remaining Requests',
                      },
                      grid: {
                        drawOnChartArea: false,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="p-3 border rounded">
            <h2>Logs</h2>
            <div
              style={{
                height: '400px',
                overflowY: 'auto',
                backgroundColor: '#f5f5f5',
                padding: '10px',
                fontFamily: 'monospace',
              }}
            >
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`log-entry ${log.type}`}
                  style={{
                    color:
                      log.type === 'error'
                        ? 'red'
                        : log.type === 'warning'
                        ? 'orange'
                        : log.type === 'success'
                        ? 'green'
                        : 'blue',
                  }}
                >
                  [{log.timestamp}] {log.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
