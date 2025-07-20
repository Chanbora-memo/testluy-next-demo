# Testluy Payment SDK Next.js Demo

This is a [Next.js](https://nextjs.org) demonstration application for the Testluy Payment SDK, showcasing how to integrate payment simulation functionality with dynamic credential input.

## Features

- **Simplified Credential Input**: Users only need to input their Client ID and Secret Key
- **Automatic Base URL Configuration**: Uses `https://api-testluy.paragoniu.app` automatically
- **Payment Initiation**: Start payment simulations with custom amounts
- **Transaction Validation**: Check the status of existing transactions
- **Secure Server-Side Processing**: Credentials are securely handled through API routes
- **Real-time Feedback**: Immediate validation and error handling

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Testluy REST API application with valid credentials
- Access to a Testluy backend instance

### Installation

1. Clone or navigate to this directory
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:4100](http://localhost:4100).

## Usage

### 1. Configure API Credentials

On the main page, enter your Testluy API credentials:

- **Client ID**: Your application's unique identifier
- **Secret Key**: Your application's secret key (handled securely)

The Base URL is automatically configured to use `https://api-testluy.paragoniu.app`.

> **Security Note**: While this demo allows credential input through the frontend for testing purposes, the secret key is immediately transmitted to secure server-side API routes and never stored in browser storage.

### 2. Initiate a Payment

1. Enter a positive amount in USD
2. Click "Initiate Payment"
3. The system will generate a payment URL and transaction ID
4. Click the payment URL to proceed to the payment simulation

### 3. Validate Transactions

1. Enter a transaction ID in the validation section
2. Click "Validate Transaction"
3. View the complete transaction details and status

## Environment Configuration

The application uses the following environment variables (configured in `.env.local`):

```bash
# Base URL for Testluy API (automatically used)
TESTLUY_BASE_URL=https://api-testluy.paragoniu.app

# App configuration
NEXT_PUBLIC_APP_URL=http://localhost:4100

# Callback URLs
NEXT_PUBLIC_CALLBACK_URL=http://localhost:4100/payment-callback
NEXT_PUBLIC_BACK_URL=http://localhost:4100/
```

## API Routes

- `POST /api/initiate-payment`: Initiates a payment with user-provided credentials (Client ID and Secret Key)
- `POST /api/validate-transaction`: Validates a transaction status with user-provided credentials (Client ID and Secret Key)

## Security Considerations

- Credentials are transmitted via HTTPS in production
- Secret keys are only used server-side within API routes
- No sensitive data is stored in browser storage
- All API calls include proper validation and error handling

## Demo vs Production

This demo is designed to showcase the Testluy Payment SDK functionality with dynamic credentials. In a production environment:

- Store credentials securely server-side (environment variables, secure vaults)
- Never expose secret keys to client-side code
- Implement proper authentication and authorization
- Use HTTPS for all communications
- Add rate limiting and additional security measures

## Learn More

- [Testluy Payment SDK Documentation](../testluy-payment-sdk/README.md)
- [Next.js Documentation](https://nextjs.org/docs)

## Deployment

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

For other platforms, ensure all environment variables are properly configured in your deployment environment.
