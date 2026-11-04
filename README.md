# E-Commerce Backend API

Production-ready RESTful API for an e-commerce platform built with Node.js, Express, TypeScript, and MongoDB.

## Features

### Authentication & Authorization
- JWT-based authentication with access + refresh tokens (customer and admin sessions)
- Email verification flow
- Password reset flow
- Role-based access control (User, Admin)
- Account lockout after failed login attempts

### User Management
- Profile management (name, phone, address, avatar)
- Change password
- Admin user management (list, stats, get/update/delete)

### Product Management
- CRUD operations (admin)
- Stock management
- Category filtering
- Search, filtering, sorting, pagination
- Admin product stats and low-stock alerts

### Shopping Cart
- Add / update / remove / clear / validate cart
- Real-time stock validation
- Cart totals calculation
- Max items (50) and max quantity (100) limits
- Pre-checkout validation
- Cart expiry and cleanup

### Orders
- Order creation, retrieval, status updates, cancellation
- Transaction-based stock management
- Refunds and order statistics

### Payments
- Payment intents (create, get, get by order, user payments)
- Payment status handling (success/failure/cancel) via webhooks and dev endpoint
- Refunds
- Saved payment methods (SetupIntent flow, attach, list)
- Payment stats

### Commerce Extras
- Coupons, gift cards, wishlists, notifications, shipping, support tickets, reviews, analytics, search

## Tech Stack

- **Runtime:** Node.js >= 20.19
- **Framework:** Express.js 5
- **Language:** TypeScript 5
- **Database:** MongoDB with Mongoose 9
- **Auth:** JWT (jsonwebtoken) with refresh tokens
- **Email:** Nodemailer / SMTP
- **Payments:** Stripe
- **Storage:** Cloudinary
- **Validation:** Zod + custom middlewares

## Project Structure

```
ecommerce-backend/
├── dist/                        # Compiled JavaScript output (npm run build)
├── docker/                      # Docker assets
├── scripts/                     # Utility scripts
├── src/
│   ├── config/                  # Configuration modules
│   │   ├── cloudinary.ts
│   │   ├── db.ts
│   │   ├── env.ts               # Env loading, validation, typed Env interface
│   │   ├── jwt.ts
│   │   ├── stripe.ts
│   │   └── version.ts
│   ├── middlewares/             # Express middlewares
│   │   ├── apiVersion.middleware.ts
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── role.middleware.ts
│   │   └── validate.middleware.ts
│   ├── modules/                 # Feature modules
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── cart/
│   │   ├── coupon/
│   │   ├── giftcard/
│   │   ├── notification/
│   │   ├── order/
│   │   ├── payment/
│   │   ├── product/
│   │   ├── review/
│   │   ├── search/
│   │   ├── shipping/
│   │   ├── support/
│   │   ├── upload/
│   │   ├── user/
│   │   └── wishlist/
│   ├── routes/
│   │   └── v1.ts                # Versioned API router
│   ├── types/                   # Shared TypeScript types
│   │   ├── env.ts
│   │   ├── express.d.ts
│   │   └── middleware.ts
│   ├── utils/                   # Shared utilities
│   │   ├── asyncHandler.ts
│   │   ├── AuthError.ts
│   │   ├── cartCleanup.ts
│   │   ├── cloudinary.ts
│   │   ├── email.ts
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── transaction.ts
│   │   └── upload.ts
│   ├── app.ts                   # Express app setup & middleware wiring
│   └── server.ts                # Server bootstrap, DB connect, graceful shutdown
├── tests/                       # Jest tests
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── eslint.config.mjs
├── jest.config.js
├── package.json
├── tsconfig.json
└── render.yaml
```

### Folder Responsibilities

| Path | Purpose |
| --- | --- |
| `src/config/` | Central configuration: environment variables (`env.ts`), DB connection (`db.ts`), JWT, Stripe, Cloudinary, API version |
| `src/middlewares/` | Express middlewares: auth, role, validation, error handling, API versioning |
| `src/modules/` | Feature-based modules (auth, user, product, cart, order, payment, review, coupon, wishlist, notification, shipping, support, analytics, search, giftcard, upload) each with controller/service/routes/DTO/model |
| `src/routes/` | API route aggregation (`v1.ts`) mounting all versioned module routes |
| `src/types/` | Shared TypeScript type declarations (`env.ts`, `express.d.ts`, `middleware.ts`) |
| `src/utils/` | Reusable helpers (JWT, email, password, Cloudinary, upload, transaction, cart cleanup) |
| `src/app.ts` | Express application setup: middleware, health checks, versioned/legacy route wiring, error handler |
| `src/server.ts` | Server entrypoint: DB connection, startup logging, graceful shutdown |
| `tests/` | Jest test suites mirroring feature modules |

## Getting Started

### Prerequisites
- Node.js >= 20.19
- MongoDB >= 6

### Installation
1. Clone the repository
2. `npm install`
3. `cp .env.example .env` and fill in values
4. Start MongoDB
5. `npm run dev`

### Verify
Visit `http://localhost:3000/health`.

## Environment Variables

| Variable | Description |
| --- | --- |
| `PORT` | Server port (default `3000`) |
| `NODE_ENV` | `development` / `production` / `test` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret (min 32 chars in production) |
| `JWT_EXPIRES_IN` | Customer access token TTL (default `15m`) |
| `ADMIN_JWT_EXPIRES_IN` | Admin access token TTL (default `10m`) |
| `REFRESH_TOKEN_EXPIRES_IN` | Customer refresh token TTL (default `30d`) |
| `ADMIN_REFRESH_TOKEN_EXPIRES_IN` | Admin refresh token TTL (default `7d`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_CURRENCY` | Stripe currency (default `usd`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_USER` | SMTP user |
| `EMAIL_PASS` | SMTP password |
| `EMAIL_FROM` | From address |
| `FRONTEND_URL` | Frontend URL |
| `ENABLE_DEV_ENDPOINTS` | Enable dev endpoints (`true`) |

## API

Base URL: `http://localhost:3000/api/v1` (legacy unversioned `/api` prefix is deprecated).

### Payments
- `POST /api/v1/payments/create-intent` — Create payment intent
- `GET /api/v1/payments/my-payments` — List user payments
- `GET /api/v1/payments/:id` — Get payment by ID
- `GET /api/v1/payments/order/:orderId` — Get payment by order
- `POST /api/v1/payments/:id/refund` — Refund (admin)
- `GET /api/v1/payments/admin/stats` — Payment stats (admin)
- `POST /api/v1/payments/setup-intent` — Create SetupIntent (saved payment methods)
- `POST /api/v1/payments/payment-methods` — Save payment method
- `GET /api/v1/payments/payment-methods` — List saved payment methods
- `POST /api/v1/payments/webhook` — Stripe webhook

## Testing

```bash
npm test
```

## Deployment

See `render.yaml` / `Dockerfile` / `docker-compose.yml`.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT

## Contact

- Email: support@ecommerce.com
- Issues: [GitHub Issues](https://github.com/your-username/ecommerce-backend/issues)
