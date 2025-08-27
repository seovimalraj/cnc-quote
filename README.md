# CNC Quote Monorepo

This monorepo uses [pnpm](https://pnpm.io) and [Turborepo](https://turbo.build) to manage multiple applications and shared packages for a DigiFabster‑style platform.

## Apps

- **web** – Next.js frontend
- **api** – NestJS backend
- **cad-service** – FastAPI service

## Packages

- **shared** – shared TypeScript types and constants
- **eslint-config** – shared ESLint configuration

## Development

```sh
pnpm -w install
pnpm -w run dev
pnpm -w run build
pnpm -w run lint
```

## License

MIT
