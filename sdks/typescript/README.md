# Frigate TypeScript SDK

Official TypeScript/JavaScript SDK for the Frigate Manufacturing API.

## Installation

```bash
npm install @frigate/typescript-sdk
```

## Quick Start

```typescript
import { FrigateClient } from '@frigate/typescript-sdk';

const client = new FrigateClient({
  apiKey: process.env.FRIGATE_API_KEY,
  baseUrl: 'https://api.frigate.ai'
});

// Calculate price quote
const quote = await client.pricing.calculate({
  part_config: {
    process_type: 'milling',
    material: 'AL_6061',
    finish: 'anodized_type_ii'
  },
  quantities: [1, 10, 50, 100]
});

console.log('Unit price:', quote.pricing.pricing_matrix[0].unit_price);
```

## Features

- ✅ Full TypeScript support with IntelliSense
- ✅ Automatic retry logic and error handling
- ✅ Request/response validation
- ✅ Tax calculation support for US, EU, and India
- ✅ Streaming support for large responses
- ✅ Built-in rate limiting

## Documentation

Full API documentation: https://api.frigate.ai/docs

## License

MIT
