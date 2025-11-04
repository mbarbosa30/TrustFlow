# MaxFlow API Integration Guide

**Version:** 1.0  
**Last Updated:** November 2025

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Getting LocalHealth Scores](#getting-localhealth-scores)
- [Creating Global Vouches](#creating-global-vouches)
- [Creating Community Endorsements](#creating-community-endorsements)
- [Code Examples](#code-examples)
- [Error Handling](#error-handling)
- [Rate Limits & Best Practices](#rate-limits--best-practices)

---

## Overview

MaxFlow is a Sybil-resistant trust scoring system that converts public vouches into verifiable trust attestations using max-flow/min-cut graph algorithms. This API allows you to:

1. **Read LocalHealth scores** - Get trust scores (0-100) for any wallet address
2. **Create vouches** - Submit endorsements to build the trust graph
3. **Query community data** - Access community-specific trust metrics

**Base URL:** `https://your-maxflow-instance.repl.co/api`

---

## Authentication

### Read Operations (No Auth Required)

Getting LocalHealth scores and public data requires **no authentication**.

```bash
curl https://your-maxflow-instance.repl.co/api/ego/0x1234.../score
```

### Write Operations (EIP-712 Signatures Required)

Creating vouches requires **cryptographic signatures** using EIP-712:

- **No API keys needed** - All authentication is done via wallet signatures
- **Replay protection** - Nonces prevent duplicate submissions
- **Chain-agnostic** - Works with any EVM-compatible wallet

---

## Getting LocalHealth Scores

### Endpoint

```
GET /api/ego/:address/score
```

### Description

Returns the LocalHealth score (0-100) for a wallet address. This score measures personal network quality using max-flow algorithms with KUDOS boost integration.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Ethereum wallet address (case-insensitive) |

### Response

```json
{
  "ownerAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "egoContextId": 42,
  "localHealth": 75.72,
  "vouchCount": 8,
  "details": {
    "flowComponent": 45.43,
    "redundancyComponent": 30.29,
    "vouchQualityFactor": 0.95,
    "kudosBoost": 1.15,
    "mode": "pure_option2"
  }
}
```

### Example Request

**cURL:**
```bash
curl -X GET \
  'https://your-maxflow-instance.repl.co/api/ego/0x216844eF94D95279c6d1631875F2dd93FbBdfB61/score'
```

**JavaScript (fetch):**
```javascript
async function getLocalHealth(address) {
  const response = await fetch(
    `https://your-maxflow-instance.repl.co/api/ego/${address}/score`
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.localHealth;
}

// Usage
const score = await getLocalHealth('0x216844eF94D95279c6d1631875F2dd93FbBdfB61');
console.log(`LocalHealth Score: ${score}`);
```

---

## Creating Global Vouches

### Endpoint

```
POST /api/vouch
```

### Description

Creates a global vouch (endorsement) that works across all communities. Requires an EIP-712 signed message.

### Request Body

```json
{
  "endorsement": {
    "endorser": "0x1234...",
    "endorsee": "0x5678...",
    "epoch": "1",
    "nonce": "1",
    "timestamp": "1699564800",
    "sig": "0xabcd...",
    "chainId": 42220,
    "note": "Optional message about this vouch"
  }
}
```

### EIP-712 Message Structure

```javascript
{
  domain: {
    name: "MaxFlow",
    version: "1",
    chainId: 42220, // Celo mainnet (or your chain)
  },
  types: {
    Endorsement: [
      { name: "endorser", type: "address" },
      { name: "endorsee", type: "address" },
      { name: "epoch", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "timestamp", type: "uint256" }
    ]
  },
  message: {
    endorser: "0x1234...",
    endorsee: "0x5678...",
    epoch: 1n,
    nonce: 1n,
    timestamp: 1699564800n
  }
}
```

### Response

**Success (201):**
```json
{
  "success": true,
  "endorsement": {
    "id": 123,
    "communityId": 0,
    "scope": "global",
    "endorser": "0x1234...",
    "endorsee": "0x5678...",
    "epoch": "1",
    "nonce": "1",
    "leafHash": "0xdef...",
    "createdAt": "2025-11-04T21:00:00.000Z"
  },
  "message": "Global vouch created successfully"
}
```

**Error (400):**
```json
{
  "error": "Invalid signature"
}
```

---

## Creating Community Endorsements

### Endpoint

```
POST /api/endorse
```

### Description

Creates a community-specific endorsement with a prompt hash for context-aware trust.

### Request Body

```json
{
  "endorser": "0x1234...",
  "endorsee": "0x5678...",
  "epoch": "1",
  "nonce": "1",
  "timestamp": "1699564800",
  "sig": "0xabcd...",
  "chainId": 42220,
  "communityId": 1,
  "promptHash": "0x789..."
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `endorser` | address | Yes | Wallet creating the endorsement |
| `endorsee` | address | Yes | Wallet being endorsed |
| `epoch` | string | Yes | Current epoch number |
| `nonce` | string | Yes | Unique nonce for this endorser+epoch |
| `timestamp` | string | Yes | Unix timestamp (seconds) |
| `sig` | hex | Yes | EIP-712 signature |
| `chainId` | number | No | Chain ID (e.g., 42220 for Celo) |
| `communityId` | number | Yes | Community ID (0 = global) |
| `promptHash` | hex | Yes | Hash of the endorsement prompt |

### Response

**Success (201):**
```json
{
  "success": true,
  "endorsement": {
    "id": 456,
    "communityId": 1,
    "scope": "community",
    "endorser": "0x1234...",
    "endorsee": "0x5678...",
    "promptHash": "0x789...",
    "leafHash": "0xabc..."
  }
}
```

---

## Code Examples

### Example 1: Get LocalHealth Score (Simple)

```javascript
// Using fetch API (works in browser and Node.js)
async function getLocalHealthScore(walletAddress) {
  const baseUrl = 'https://your-maxflow-instance.repl.co';
  const response = await fetch(`${baseUrl}/api/ego/${walletAddress}/score`);
  
  if (!response.ok) {
    throw new Error(`Failed to get score: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.localHealth;
}

// Usage
const score = await getLocalHealthScore('0x216844eF94D95279c6d1631875F2dd93FbBdfB61');
console.log(`Trust Score: ${score}/100`);
```

### Example 2: Create Global Vouch (Using ethers.js v6)

```javascript
import { BrowserProvider } from 'ethers';

async function createGlobalVouch(endorseeAddress) {
  // 1. Connect to wallet
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const endorserAddress = await signer.getAddress();
  
  // 2. Get current epoch and nonce
  const baseUrl = 'https://your-maxflow-instance.repl.co';
  const epochRes = await fetch(`${baseUrl}/api/epoch/current`);
  const { epoch } = await epochRes.json();
  
  const nonceRes = await fetch(`${baseUrl}/api/nonce/${endorserAddress}/${epoch.id}`);
  const { nextNonce } = await nonceRes.json();
  
  // 3. Prepare EIP-712 message
  const domain = {
    name: 'MaxFlow',
    version: '1',
    chainId: 42220, // Celo mainnet
  };
  
  const types = {
    Endorsement: [
      { name: 'endorser', type: 'address' },
      { name: 'endorsee', type: 'address' },
      { name: 'epoch', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
  };
  
  const message = {
    endorser: endorserAddress,
    endorsee: endorseeAddress,
    epoch: BigInt(epoch.id),
    nonce: BigInt(nextNonce),
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
  };
  
  // 4. Sign the message
  const signature = await signer.signTypedData(domain, types, message);
  
  // 5. Submit the vouch
  const response = await fetch(`${baseUrl}/api/vouch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endorsement: {
        endorser: message.endorser,
        endorsee: message.endorsee,
        epoch: message.epoch.toString(),
        nonce: message.nonce.toString(),
        timestamp: message.timestamp.toString(),
        sig: signature,
        chainId: 42220,
      },
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create vouch');
  }
  
  return await response.json();
}

// Usage
try {
  const result = await createGlobalVouch('0x5678...');
  console.log('Vouch created:', result.endorsement.id);
} catch (error) {
  console.error('Failed to vouch:', error.message);
}
```

### Example 3: Create Global Vouch (Using viem)

```javascript
import { createWalletClient, custom } from 'viem';
import { celo } from 'viem/chains';

async function createGlobalVouchViem(endorseeAddress) {
  // 1. Setup wallet client
  const client = createWalletClient({
    chain: celo,
    transport: custom(window.ethereum),
  });
  
  const [endorserAddress] = await client.getAddresses();
  
  // 2. Get epoch and nonce (same as ethers example)
  const baseUrl = 'https://your-maxflow-instance.repl.co';
  const epochRes = await fetch(`${baseUrl}/api/epoch/current`);
  const { epoch } = await epochRes.json();
  
  const nonceRes = await fetch(`${baseUrl}/api/nonce/${endorserAddress}/${epoch.id}`);
  const { nextNonce } = await nonceRes.json();
  
  // 3. Sign EIP-712 message
  const signature = await client.signTypedData({
    account: endorserAddress,
    domain: {
      name: 'MaxFlow',
      version: '1',
      chainId: 42220,
    },
    types: {
      Endorsement: [
        { name: 'endorser', type: 'address' },
        { name: 'endorsee', type: 'address' },
        { name: 'epoch', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
      ],
    },
    message: {
      endorser: endorserAddress,
      endorsee: endorseeAddress,
      epoch: BigInt(epoch.id),
      nonce: BigInt(nextNonce),
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    },
    primaryType: 'Endorsement',
  });
  
  // 4. Submit vouch (same as ethers example)
  const response = await fetch(`${baseUrl}/api/vouch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endorsement: {
        endorser: endorserAddress,
        endorsee: endorseeAddress,
        epoch: epoch.id.toString(),
        nonce: nextNonce.toString(),
        timestamp: Math.floor(Date.now() / 1000).toString(),
        sig: signature,
        chainId: 42220,
      },
    }),
  });
  
  return await response.json();
}
```

### Example 4: Helper Function to Get Nonce

```javascript
async function getNextNonce(endorserAddress, epochId) {
  const baseUrl = 'https://your-maxflow-instance.repl.co';
  const response = await fetch(
    `${baseUrl}/api/nonce/${endorserAddress}/${epochId}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch nonce');
  }
  
  const data = await response.json();
  return data.nextNonce;
}
```

### Example 5: Get Current Epoch

```javascript
async function getCurrentEpoch() {
  const baseUrl = 'https://your-maxflow-instance.repl.co';
  const response = await fetch(`${baseUrl}/api/epoch/current`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch current epoch');
  }
  
  const data = await response.json();
  return data.epoch;
}
```

---

## Error Handling

### Common Error Codes

| Status | Error | Description | Solution |
|--------|-------|-------------|----------|
| 400 | Invalid signature | Signature verification failed | Ensure correct EIP-712 signing |
| 400 | Invalid nonce | Nonce already used or incorrect | Fetch fresh nonce from API |
| 400 | Epoch closed | Cannot endorse closed epoch | Use current active epoch |
| 400 | Prompt hash mismatch | Wrong community prompt | Get current promptHash from community |
| 404 | Community not found | Invalid communityId | Verify community exists |
| 500 | Internal server error | Server-side issue | Retry or contact support |

### Example Error Handling

```javascript
async function createVouchWithErrorHandling(endorseeAddress) {
  try {
    const result = await createGlobalVouch(endorseeAddress);
    return result;
  } catch (error) {
    if (error.message.includes('Invalid nonce')) {
      console.error('Nonce conflict - may need to refresh and retry');
      // Option: Retry with fresh nonce
    } else if (error.message.includes('Invalid signature')) {
      console.error('Signature verification failed - check wallet connection');
    } else if (error.message.includes('Epoch closed')) {
      console.error('Epoch has closed - fetch new current epoch');
    } else {
      console.error('Unexpected error:', error.message);
    }
    throw error;
  }
}
```

---

## Rate Limits & Best Practices

### Rate Limits

- **No strict rate limits** currently enforced
- **Recommended:** Max 10 requests/second per client
- **Nonce-based protection** prevents duplicate submissions

### Best Practices

#### 1. Cache LocalHealth Scores

```javascript
const scoreCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedLocalHealth(address) {
  const cached = scoreCache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.score;
  }
  
  const score = await getLocalHealthScore(address);
  scoreCache.set(address, { score, timestamp: Date.now() });
  return score;
}
```

#### 2. Handle Nonce Conflicts

```javascript
async function createVouchWithRetry(endorseeAddress, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await createGlobalVouch(endorseeAddress);
    } catch (error) {
      if (error.message.includes('Invalid nonce') && i < maxRetries - 1) {
        console.log(`Nonce conflict, retrying (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
}
```

#### 3. Validate Addresses

```javascript
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function safeGetLocalHealth(address) {
  if (!isValidAddress(address)) {
    throw new Error('Invalid Ethereum address format');
  }
  return await getLocalHealthScore(address);
}
```

#### 4. Batch Operations

```javascript
async function getMultipleScores(addresses) {
  const promises = addresses.map(addr => 
    getLocalHealthScore(addr).catch(err => ({ error: err.message }))
  );
  
  return await Promise.all(promises);
}

// Usage
const scores = await getMultipleScores([
  '0x1234...',
  '0x5678...',
  '0x9abc...',
]);
```

---

## Testing

### Test on Development

```javascript
const DEV_BASE_URL = 'http://localhost:5000';
const PROD_BASE_URL = 'https://your-maxflow-instance.repl.co';

const baseUrl = process.env.NODE_ENV === 'production' 
  ? PROD_BASE_URL 
  : DEV_BASE_URL;
```

### Example Test Script

```javascript
async function runTests() {
  console.log('Testing MaxFlow API Integration...\n');
  
  // Test 1: Get LocalHealth Score
  console.log('Test 1: Get LocalHealth Score');
  try {
    const score = await getLocalHealthScore('0x216844eF94D95279c6d1631875F2dd93FbBdfB61');
    console.log(`✓ Score retrieved: ${score}/100\n`);
  } catch (error) {
    console.error(`✗ Failed: ${error.message}\n`);
  }
  
  // Test 2: Get Current Epoch
  console.log('Test 2: Get Current Epoch');
  try {
    const epoch = await getCurrentEpoch();
    console.log(`✓ Current epoch: ${epoch.id}\n`);
  } catch (error) {
    console.error(`✗ Failed: ${error.message}\n`);
  }
  
  // Test 3: Get Nonce
  console.log('Test 3: Get Nonce');
  try {
    const nonce = await getNextNonce('0x216844eF94D95279c6d1631875F2dd93FbBdfB61', 1);
    console.log(`✓ Next nonce: ${nonce}\n`);
  } catch (error) {
    console.error(`✗ Failed: ${error.message}\n`);
  }
}

runTests();
```

---

## Additional Resources

### Helpful Endpoints

- `GET /api/epoch/current` - Get current active epoch
- `GET /api/nonce/:address/:epoch` - Get next nonce for signing
- `GET /api/communities/:id` - Get community details including promptHash
- `GET /api/endorsements` - List all endorsements (paginated)
- `GET /api/ego/:address/score` - Get LocalHealth score for an address

### Need Help?

- **Documentation:** Check replit.md for system architecture
- **GitHub Issues:** Report bugs or request features
- **Community:** Join discussions about trust graphs and Sybil resistance

---

**Happy Building! 🚀**
