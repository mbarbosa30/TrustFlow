# MaxFlow API Documentation

## Multi-Chain Support

MaxFlow now supports multiple blockchain networks beyond EVM chains. This includes Solana, Cosmos, Stellar, and any other chain ecosystem.

### Backward Compatibility

**Existing EVM integrations require NO changes.** All current API requests continue to work unchanged. The new parameters default to EVM-compatible values:
- `chainNamespace` defaults to `"eip155"` (EVM)
- `externallyVerified` defaults to `false`

---

## POST /api/v1/vouch

Creates a new vouch (endorsement) from one address to another.

### Request Body

#### EVM Chains (Ethereum, Celo, Polygon, etc.)

```json
{
  "endorser": "0x1234567890abcdef1234567890abcdef12345678",
  "endorsee": "0xabcdef1234567890abcdef1234567890abcdef12",
  "epoch": 11,
  "nonce": 0,
  "sig": "0x...",
  "chainId": 42220
}
```

#### Non-EVM Chains (Solana, Cosmos, Stellar, etc.)

```json
{
  "endorser": "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
  "endorsee": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "epoch": 11,
  "nonce": 0,
  "sig": "externally_verified",
  "chainNamespace": "solana",
  "externallyVerified": true
}
```

### Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `endorser` | string | Yes | - | Address of the vouching party |
| `endorsee` | string | Yes | - | Address being vouched for |
| `epoch` | number | Yes | - | Current epoch (get from `/api/v1/vouch/nonce/:address`) |
| `nonce` | number | Yes | - | Next nonce for endorser (get from `/api/v1/vouch/nonce/:address`) |
| `sig` | string | Yes* | - | EIP-712 signature (EVM) or `"externally_verified"` (non-EVM) |
| `chainId` | number | No | 1 | EVM chain ID (e.g., 42220 for Celo) |
| `chainNamespace` | string | No | `"eip155"` | Chain ecosystem: `"eip155"`, `"solana"`, `"cosmos"`, `"stellar"`, etc. |
| `externallyVerified` | boolean | No | `false` | Set to `true` for non-EVM chains to skip EIP-712 verification |

*For non-EVM chains with `externallyVerified: true`, `sig` can be the placeholder string `"externally_verified"`.

### Chain Namespace Values

| Chain | Namespace | Address Format |
|-------|-----------|----------------|
| Ethereum, Celo, Polygon, etc. | `eip155` | 0x-prefixed, 40 hex chars, lowercased |
| Solana | `solana` | Base58, case-sensitive |
| Cosmos | `cosmos` | Bech32, case-sensitive |
| Stellar | `stellar` | Ed25519 public key, case-sensitive |

### Address Handling

- **EVM chains (`eip155`)**: Addresses are normalized to lowercase
- **Non-EVM chains**: Address case is preserved exactly as submitted

### Response

```json
{
  "ok": true
}
```

### Errors

| Code | Error | Description |
|------|-------|-------------|
| 400 | Missing required fields | Required parameters not provided |
| 400 | Invalid endorser/endorsee address | Address format doesn't match chain requirements |
| 400 | Invalid signature | EIP-712 signature verification failed (EVM only) |
| 400 | Invalid epoch | Epoch doesn't match current active epoch |
| 400 | Invalid nonce | Nonce doesn't match expected value |
| 400 | Vouch already exists | Duplicate vouch for same pair |
| 409 | Nonce already used | Race condition - get new nonce |

---

## POST /api/endorse

Alternative endpoint with identical multi-chain support. Accepts the same parameters as `/api/v1/vouch`.

---

## GET /api/v1/vouch/nonce/:address

Get current epoch and next available nonce for an address.

### Response

```json
{
  "epoch": 11,
  "nonce": 1
}
```

---

## GET /api/v1/vouch-status

Check the status of an existing vouch.

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `endorser` | string | Yes | Endorser address |
| `endorsee` | string | Yes | Endorsee address |

### Response

```json
{
  "exists": true,
  "status": "active",
  "days_remaining": 75,
  "created_at": "2025-10-01T12:00:00.000Z"
}
```

Status values: `active`, `expiring_soon`, `expired`, `revoked`

---

## Integration Examples

### Solana Integration

```javascript
const response = await fetch('/api/v1/vouch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endorser: 'SolanaPublicKey1...',
    endorsee: 'SolanaPublicKey2...',
    epoch: currentEpoch,
    nonce: currentNonce,
    sig: 'externally_verified',
    chainNamespace: 'solana',
    externallyVerified: true
  })
});
```

### Cosmos Integration

```javascript
const response = await fetch('/api/v1/vouch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endorser: 'cosmos1abc123...',
    endorsee: 'cosmos1xyz789...',
    epoch: currentEpoch,
    nonce: currentNonce,
    sig: 'externally_verified',
    chainNamespace: 'cosmos',
    externallyVerified: true
  })
});
```

### EVM Integration (unchanged)

```javascript
// Existing EVM code works without modification
const response = await fetch('/api/v1/vouch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endorser: '0x1234...',
    endorsee: '0xabcd...',
    epoch: currentEpoch,
    nonce: currentNonce,
    sig: eip712Signature,
    chainId: 42220
  })
});
```
