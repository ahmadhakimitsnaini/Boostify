### Task 1: Setup Monorepo & Inisialisasi Proyek

**Files:**
- Create: `package.json` (Root)
- Create: `pnpm-workspace.yaml`
- Create: `apps/api/package.json` (NestJS placeholder)
- Create: `apps/web/package.json` (Next.js placeholder)

**Interfaces:**
- Mempersiapkan struktur dasar monorepo sehingga paket dapat saling berbagi kode jika dibutuhkan nanti.

- [ ] **Step 1: Inisialisasi direktori root monorepo**
  Buat file `package.json` utama dan konfigurasi workspace.

```bash
mkdir apps
```

- [ ] **Step 2: Buat `package.json` di root**

```json
{
  "name": "yucano-labs-monorepo",
  "private": true,
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "scripts": {
    "dev": "pnpm --filter '*' dev",
    "build": "pnpm --filter '*' build",
    "test": "pnpm --filter '*' test"
  }
}
```

- [ ] **Step 3: Buat `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 4: Inisialisasi NestJS (Backend)**
  Gunakan Nest CLI untuk melakukan inisialisasi di dalam folder `apps/api`.

```bash
npx @nestjs/cli new apps/api --package-manager pnpm --strict
```

- [ ] **Step 5: Inisialisasi Next.js (Frontend)**
  Gunakan Create Next App di dalam folder `apps/web`.

```bash
npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

- [ ] **Step 6: Uji coba instalasi root**

```bash
pnpm install
```
Expected: Proses selesai tanpa error, membuat struktur `node_modules` *hoisted*.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml apps/
git commit -m "chore: setup pnpm workspace with nestjs and nextjs"
```