### Task 2: Setup Database & Skema Prisma

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/.env`

**Interfaces:**
- Menghasilkan tipe TypeScript PrismaClient yang akan digunakan oleh Task 3 dan Task 4.

- [ ] **Step 1: Install Prisma dependencies di `apps/api`**

```bash
cd apps/api
pnpm add -D prisma
pnpm add @prisma/client
npx prisma init
```

- [ ] **Step 2: Konfigurasi `schema.prisma`**
  Modifikasi `apps/api/prisma/schema.prisma` sesuai PRD (Tabel Tenant, ChannelIntegration, Flow, Contact, MessageHistory) dengan implementasi Soft Delete (`deleted_at`) dan format `JSONB`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id                String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email             String               @unique
  name              String
  subscription_tier String               @default("FREE")
  created_at        DateTime             @default(now())
  deleted_at        DateTime?
  integrations      ChannelIntegration[]
  flows             Flow[]
  contacts          Contact[]
  messages          MessageHistory[]
}

model ChannelIntegration {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id    String    @db.Uuid
  platform     String    // "IG" atau "WA"
  access_token String    // Dienkripsi sebelum disimpan
  page_id      String
  created_at   DateTime  @default(now())
  deleted_at   DateTime?
  
  tenant       Tenant    @relation(fields: [tenant_id], references: [id])
  
  @@unique([tenant_id, platform])
}

model Flow {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id       String    @db.Uuid
  name            String
  trigger_type    String
  trigger_keyword String?
  flow_data       Json      @db.JsonB // Menyimpan struktur React Flow
  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())
  deleted_at      DateTime?
  
  tenant          Tenant    @relation(fields: [tenant_id], references: [id])
}

model Contact {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id        String    @db.Uuid
  platform_user_id String    
  name             String
  phone            String?
  email            String?
  paused_until     DateTime? // Implementasi Live Inbox Pause
  created_at       DateTime  @default(now())
  
  tenant           Tenant           @relation(fields: [tenant_id], references: [id])
  messages         MessageHistory[]

  @@unique([tenant_id, platform_user_id])
}

model MessageHistory {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  contact_id String   @db.Uuid
  tenant_id  String   @db.Uuid
  direction  String   // "INBOUND" atau "OUTBOUND"
  content    String   @db.Text
  timestamp  DateTime @default(now())
  
  contact    Contact  @relation(fields: [contact_id], references: [id])
  tenant     Tenant   @relation(fields: [tenant_id], references: [id])

  @@index([tenant_id, contact_id, timestamp])
}
```

- [ ] **Step 3: Setup Mock Database (Testing)**
  Buat file `.env` di dalam `apps/api` (pastikan punya Postgres lokal/docker yang berjalan).
  *Asumsikan URL DB lokal: `postgresql://postgres:postgres@localhost:5432/yucano_labs?schema=public`*

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yucano_labs?schema=public"
```

- [ ] **Step 4: Generate Client (Hanya Generate, Tidak Migrate)**
  *(Kita hanya men-generate client lokal untuk kebutuhan IDE dan Build, migrasi db sungguhan akan dilakukan saat development berlangsung)*

```bash
cd apps/api
npx prisma generate
```
Expected: Sukses membuat `@prisma/client`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma apps/api/package.json apps/api/pnpm-lock.yaml || true
git commit -m "feat(api): define prisma schema with multi-tenancy relations and jsonb"
```