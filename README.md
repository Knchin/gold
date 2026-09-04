# GoldPrice — Live Gold Price Per Gram

A production-ready Progressive Web App (PWA) that displays real-time international gold prices and calculates prices for different gold purities (24K, 22K, 21K, 18K, 14K, 10K, 9K).

## Architecture

```
Real-Time Gold API (goldprice.dev)
       │
       │ HTTPS (direct browser access)
       ▼
React + TypeScript PWA
       │
       ▼
Cloudflare Pages
```

**No backend. No database. No server. Just a static PWA.**

## Market Data Provider

### Provider: goldprice.dev

**Why goldprice.dev?**

| Feature | goldprice.dev | GoldAPI.io | MintedMetal | NetDania |
|---------|--------------|------------|-------------|----------|
| Free tier | 1000 calls/mo, 30 req/min | 100 calls/mo | Unlimited (2x/day) | Enterprise only |
| API key | Optional (anonymous OK) | Required | None | Contract |
| CORS | Yes | Yes | Yes | N/A |
| Browser access | Direct | Direct | Direct | B2B only |
| XAU/USD | Yes | Yes | LBMA fix only | Enterprise |
| FX rates | Yes (31 currencies) | Yes (72 currencies) | No | Enterprise |
| Historical | 30 days free | Limited | No | Enterprise |
| Pricing | Free / $10-80/mo | Free / $99/mo | Free (CC BY 4.0) | Enterprise |
| License | Internal free, Pro commercial | Sandbox free | CC BY 4.0 | Enterprise |

**Trade-offs:**
- goldprice.dev free tier refreshes ~once per minute (not tick-by-tick)
- GoldAPI.io free tier has very low limits (100/month)
- MintedMetal only updates twice daily (LBMA fix)
- NetDania is enterprise B2B only, no public API

**goldprice.dev is the best choice** because it works entirely from the browser, has generous free limits, CORS support, no required API key, multi-currency support, and historical data.

### NetDania Investigation

NetDania operates a B2B financial data service. Their "Client API" is a streaming SDK designed for institutional clients under contract. There is no free public REST API for XAU/USD that can be consumed from a browser. NetDania requires enterprise licensing and is not suitable for a Cloudflare Pages-only architecture.

### CORS & Browser Access

goldprice.dev supports direct browser requests:
- No CORS restrictions for the free tier
- API key is optional (anonymous requests work)
- If using an API key, it's intentionally public (frontend-safe)
- Rate limits: 30 req/min anonymous, 30 req/min with free key

### Rate Limits

- Anonymous: ~30 requests/minute, shared IP limits
- Free key: 30 requests/minute, 1,000/month
- The app defaults to 60-second polling (configurable)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

```bash
# Clone/install
npm install

# Start dev server (DEMO MODE by default)
npm run dev

# Or with real API (set your free key)
VITE_GOLD_API_KEY=your_key npm run dev
```

### DEMO MODE

The application works immediately in DEMO MODE without any API key. Mock data simulates:

- XAU/USD price movement
- FX rate fluctuations
- Historical data
- All currency conversions

**DEMO MODE is clearly displayed** so users never mistake mock data for real prices.

### Environment Variables

```env
# Optional: Free API key from goldprice.dev
VITE_GOLD_API_KEY=

# Default currency (EUR, USD, GBP, CHF)
VITE_DEFAULT_CURRENCY=EUR

# Refresh interval in milliseconds
VITE_UPDATE_INTERVAL_MS=60000

# Force demo mode
VITE_DEMO_MODE=false
```

All environment variables are frontend-safe and prefixed with `VITE_`.

## Gold Calculations

### Troy Ounce Conversion

```
1 troy ounce = 31.1034768 grams
```

**Never use 28.3495g (avoirdupois ounce) for gold.**

### Price Per Gram

```
XAU/USD = $3,250

USD per gram = 3250 / 31.1034768 ≈ $104.50
```

### Gold Purity (Fineness)

| Karat | Fineness | Description |
|-------|----------|-------------|
| 24K | 0.999 (99.9%) | Fine gold (default convention) |
| 22K | 0.9167 (91.67%) | Standard jewelry |
| 21K | 0.875 (87.5%) | Some jewelry |
| 18K | 0.75 (75%) | Fine jewelry |
| 14K | 0.5833 (58.33%) | US standard |
| 10K | 0.4167 (41.67%) | Minimum US gold |
| 9K | 0.375 (37.5%) | UK standard |

### Price Calculation

```
24K price = pricePerGram × 0.999
22K price = pricePerGram × 0.9167
18K price = pricePerGram × 0.7500
...etc
```

### Currency Conversion

```
goldEurPerGram = goldUsdPerGram / EUR/USD
goldGbpPerGram = goldUsdPerGram / GBP/USD
goldChfPerGram = goldUsdPerGram × USD/CHF
```

FX rates are fetched live from goldprice.dev.

### Bid / Ask / Mid

The app uses mid price when both bid and ask are available:

```
mid = (bid + ask) / 2
```

Otherwise, the spot price is used.

## Gold Calculator

The built-in calculator computes:

```
estimated value = weight × pricePerGram × fineness
```

Supports:
- Weight in grams, troy ounces, or avoirdupois ounces
- All 7 karat purities
- All 4 currencies (EUR, USD, GBP, CHF)
- Shows pure gold content

## PWA Features

- **Installable**: Add to home screen on mobile and desktop
- **Offline**: Application shell cached for offline use
- **Service Worker**: Automatic caching with Workbox
- **Theme**: Dark mode optimized for financial data
- **Responsive**: Mobile-first design (320px–1200px+)

### Service Worker Strategy

- Static assets: CacheFirst
- API calls: NetworkFirst with 5-min cache fallback
- Offline: Shows cached app shell with "OFFLINE" banner

## Project Structure

```
gold-price-pwa/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components (Dashboard, Calculator, Chart, Settings)
│   ├── hooks/            # Custom React hooks
│   ├── calculations/     # Gold price calculations
│   ├── providers/        # Market data provider abstraction
│   ├── stores/           # Local storage management
│   ├── types/            # TypeScript type definitions
│   └── styles/           # CSS/Tailwind styles
├── public/
│   └── icons/            # PWA icons
├── tests/                # Unit tests
└── package.json
```

## Testing

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch
```

### Test Coverage

- Troy ounce conversion constant
- USD per gram calculation
- Currency conversion (EUR, GBP, CHF)
- All 7 karat purities
- Full calculation pipeline
- Gold value calculator
- Bid/ask/mid price
- Price change calculation
- Price formatting
- Edge cases (zero, negative, large values)
- Provider error handling (network, JSON, HTTP errors)
- Mock provider simulation

## Deployment to Cloudflare Pages

### Option 1: Direct Upload

```bash
# Build
npm run build

# Upload dist/ folder to Cloudflare Pages dashboard
```

### Option 2: Git Integration

1. Push to GitHub/GitLab
2. Connect repository in Cloudflare Pages dashboard
3. Set build configuration:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: 18+
4. Set environment variables in dashboard if using real API key

### Option 3: Wrangler CLI

```bash
npx wrangler pages deploy dist
```

## Settings

Users can configure:

- **Currency**: EUR, USD, GBP, CHF (default: EUR)
- **Default Karat**: 24K, 22K, 21K, 18K, 14K, 10K, 9K
- **Decimal Precision**: 2, 3, or 4 decimals
- **Weight Unit**: Grams, Troy Oz, Oz
- **Refresh Interval**: 30s, 1min, 2min, 5min

All preferences are saved in localStorage.

## Data Status Indicators

| Status | Meaning |
|--------|---------|
| ● LIVE | Data is fresh (< 5 min old) |
| ● UPDATING | Fetching new data |
| ● DELAYED | Provider supplies delayed data |
| ● STALE | Data older than threshold |
| ● RECONNECTING | Connection lost, retrying |
| ● DEMO MODE | Mock/simulated data |
| ● OFFLINE | No network connection |

## SEO

- Semantic HTML structure
- Meta description and keywords
- Open Graph tags
- JSON-LD structured data
- Canonical URL
- Responsive viewport

## Disclaimer

Prices displayed are theoretical precious-metal values based on live spot gold prices. They do **not** include:

- Labor costs
- Manufacturing
- Dealer margins
- Taxes / VAT
- Commissions
- Spreads
- Refining fees
- Jewelry-store markups

Actual jewelry buying and selling prices will differ significantly.

## License

MIT
