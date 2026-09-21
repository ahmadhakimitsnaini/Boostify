# Yucano Labs - MVP Timeline & Action Plan (todos.md)

Berdasarkan analisis arsitektur dan teknis (Webhook, Flow Engine, Database, dan Infrastruktur), berikut adalah pembagian fase pengerjaan sistem Yucano Labs MVP v1.0.

## Fase 1: Setup Lingkungan & Fondasi Multi-Tenancy (Minggu 1)
- [x] **1.1. Inisialisasi Repositori:** Setup Monorepo (misal: Turborepo) atau struktur *split-repo* untuk Frontend (Next.js) dan Backend (NestJS).
- [x] **1.2. Setup Database & Cache:** Koneksi awal ke PostgreSQL menggunakan Prisma ORM dan inisialisasi koneksi Redis (BullMQ & Cache).
- [x] **1.3. Desain Skema Prisma:** Membuat tabel `Tenant`, `ChannelIntegration`, `Flow`, `Contact`, dan `MessageHistory`. Mengubah tipe data *pause* menjadi `paused_until` (Timestamp).
- [x] **1.4. Ekstensi Keamanan Multi-Tenancy:** Membuat *Prisma Client Extension* di NestJS untuk menginjeksi filter `where: { tenant_id: user.tenantId }` secara otomatis di setiap *query*.
- [x] **1.5. Enkripsi Kredensial:** Mengimplementasikan modul enkripsi/dekripsi AES-256-GCM untuk menyimpan `access_token` Meta secara aman.

## Fase 2: Core Engine - Webhook Ingestion & Queue (Minggu 2)
- [ ] **2.1. Pendaftaran Aplikasi Meta:** Mendaftarkan aplikasi di Meta for Developers untuk mendapatkan `META_APP_SECRET` dan akses API WA/IG.
- [x] **2.2. Endpoint Webhook Super-Ringan:** Membuat rute `/api/webhooks/meta` di NestJS yang diisolasi dari *middleware* berat.
- [x] **2.3. Validasi Keamanan Meta:** Mengimplementasikan fungsi validasi `X-Hub-Signature-256`.
- [x] **2.4. Integrasi BullMQ:** Mendorong payload yang valid ke antrean Redis (`incoming-messages`) dan mengembalikan `HTTP 200 OK` secara aman.
- [x] **2.5. Idempotency Setup:** Menyimpan *Event ID* dari Meta di Redis (TTL 1 jam) agar pesan yang sama (duplikat) di-*drop* sebelum masuk ke dalam *Queue*.

## Fase 3: Rule-Based Flow Engine & Meta API (Minggu 3)
- [ ] **3.1. Worker Service (Konsumen Queue):** Membuat *Worker* BullMQ yang secara asinkron mengambil data dari antrean `incoming-messages`.
- [ ] **3.2. State Management (Redis):** Mengimplementasikan pencatatan *State Pointer* (posisi pelanggan di node mana) menggunakan Redis agar cepat diakses saat ada pesan balasan.
- [ ] **3.3. JSON Flow Evaluator:** Membuat fungsi untuk menelusuri (*traverse*) Node dan Edge dari struktur JSON konfigurasi alur *bot*.
- [ ] **3.4. Keamanan Logika (Infinite Loop Guard):** Menambahkan *Max Hop Limit* (misal: max 5 eksekusi node per pesan) untuk mencegah *infinite loop*.
- [ ] **3.5. Integrasi Meta API & Retry:** Mengirim balasan ke IG/WA via Meta Graph API dengan konfigurasi *auto-retries* dan *exponential backoff* di BullMQ.

## Fase 4: Frontend & Visual Flow Builder (Minggu 4 - 5)
- [ ] **4.1. Setup React Flow & Zustand:** Menginisialisasi *canvas* dan manajemen *state* untuk Visual Builder di Next.js.
- [ ] **4.2. UI Node Kustom:** Membuat antarmuka untuk Node "Teks", "Kirim Tombol", dan Node "Pemicu" (Trigger/Keyword).
- [ ] **4.3. Zod Schema Validation (Backend):** Membuat skema Zod di NestJS untuk memastikan JSON dari Frontend valid dan sesuai standar sebelum disimpan ke PostgreSQL.
- [ ] **4.4. Integrasi Simpan/Muat Flow:** Menghubungkan Visual Builder dengan endpoint CRUD Flow di Backend.
- [ ] **4.5. Auth & Dashboard:** Implementasi login (JWT) dan tampilan halaman utama *Tenant*.

## Fase 5: Omnichannel Live Inbox & Billing (Minggu 6)
- [ ] **5.1. UI Live Inbox:** Menampilkan daftar *chat* dan pesan menggunakan *Long-Polling* atau *Server-Sent Events (SSE)* untuk pembaruan *real-time*.
- [ ] **5.2. Fitur *Pause Automation*:** Membangun tombol "Tangani Manual" yang akan mengatur `paused_until` (misal 24 jam) di tabel `Contact` dan memastikan Worker mengabaikan pesan dari kontak tersebut.
- [ ] **5.3. Payment Gateway Integration:** Integrasi Midtrans untuk langganan bulanan (*subscription*) dan manajemen limit/kuota pesan.

## Fase 6: Deployment, Observability & QA (Minggu 7 - 8)
- [ ] **6.1. Pemisahan Layanan Deployment:** Melakukan *deployment* menjadi tiga proses terpisah di platform *hosting* (Railway/Render): Web API, Webhook API, dan Worker Service.
- [ ] **6.2. Konfigurasi Redis & Cache:** Menyetel *Eviction Policy* (`volatile-lru`) pada Redis agar antrean utama tetap aman saat memori penuh.
- [ ] **6.3. Monitoring & Logging:** Integrasi Sentry untuk pelacakan *error* dan metrik latensi *webhook*.
- [ ] **6.4. Stress Testing:** Melakukan simulasi pengiriman *webhook* secara masif untuk memastikan *latency* bertahan < 3 detik dan *Worker* tidak *crash*.
- [ ] **6.5. Rilis Target (15 Desember 2026):** Rilis MVP v1.0.