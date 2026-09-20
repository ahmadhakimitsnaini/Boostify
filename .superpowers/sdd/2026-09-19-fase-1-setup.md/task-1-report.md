# Task 1 Report: Setup Monorepo & Inisialisasi Proyek

## Status
DONE

## Commits
- `a270de7 chore: setup pnpm workspace with nestjs and nextjs`

## Test Summary
`pnpm install` completed with hoisted `node_modules` structure, and `pnpm build` successfully built both NestJS and Next.js applications in the monorepo workspace.

## Details
- `package.json` created in root for monorepo tracking scripts.
- `pnpm-workspace.yaml` configured to track `apps/*` and `packages/*`.
- Built API folder via NestJS CLI using v10 `npx @nestjs/cli@10 new apps/api --package-manager pnpm --strict` to avoid node/engine compatibility errors.
- Built Web folder via `npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm`.
- Removed nested `.git` folders to allow root git tracking.
