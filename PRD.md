# Yucano Labs (Chat Automation MVP) Product Requirement Document
**Status:** Draft | **Target Release:** Q4 2026

## 1. Tujuan
* **Visi:** Menjadi platform *chat automation* (otomatisasi percakapan) utama bagi UMKM dan Kreator Lokal untuk mengonversi audiens media sosial menjadi pelanggan setia melalui Instagram DM dan WhatsApp, tanpa memerlukan kemampuan *coding*.
* **Tujuan (Goals):** 
  * Mendapatkan 100 *tenant* (pelanggan berbayar) pertama dalam 3 bulan setelah rilis.
  * Mengotomatiskan 100.000 pesan per bulan.
  * *Conversion rate* dari pengguna *Free Trial* ke *Paid Subscription* mencapai 15%.
* **Daftar Strategi:** 
  * Menghapus fitur AI di tahap awal untuk menekan biaya API dan mempercepat waktu rilis (*time-to-market*).
  * Membangun *Visual Flow Builder* yang intuitif dan berbasis logika sederhana (*rule-based*).
  * Mengintegrasikan API Instagram DM dan WhatsApp Business Cloud API.
* **User Persona:** 
  * **Sinta (Pemilik Toko Online):** Membutuhkan balasan otomatis untuk FAQ di WA/IG dan *live inbox* untuk mengambil alih chat (menangani prospek pembeli).
  * **Budi (Kreator Konten/Influencer):** Membutuhkan otomatisasi "Comment/Follow to DM" di Instagram untuk mendistribusikan link promosi secara otomatis tanpa capek membalas DM satu per satu.

## 2. Kriteria Rilis
| Kategori | Detail |
| :--- | :--- |
| **Nama Rilis** | Yucano Labs MVP v1.0 |
| **Target Tanggal** | 15 Desember 2026 |
| **List Fitur** | 1. Meta OAuth & Channel Integration (IG & WA)<br>2. Visual Flow Builder (Node & Edge canvas)<br>3. Rule-based Triggers (Keyword, Comment-to-DM, Follow-to-DM)<br>4. Omnichannel Live Inbox<br>5. Self-serve Subscription Billing |
| **Relasi & Dependensi**| 1. *Meta for Developers* (App Verification untuk Instagram & WhatsApp).<br>2. *Payment Gateway* Lokal (Midtrans/Xendit) untuk penagihan. |
| **Kriteria Kualitas** | **Performance:** Webhook dari Meta harus direspons < 3 detik untuk menghindari *timeout/retry* dari server Meta.<br>**Scalability:** Arsitektur antrean (Redis Queue) mampu menampung lonjakan (*spike*) hingga 500 komentar/detik jika konten kreator viral.<br>**Reliability:** Uptime aplikasi 99.5%, dengan fallback ke *Live Inbox* jika bot *builder* mengalami kegagalan proses. |

## 3. Spesifikasi Fitur (*User Stories*)
| Feature ID | As a [Persona] | I want to [Action] | So that [Value/Benefit] | Priority |
| :--- | :--- | :--- | :--- | :--- |
| FTR-01 | Toko Online | Menghubungkan akun WA & IG Bisnis saya via OAuth Meta | Bot Yucano bisa mulai membalas pesan saya secara legal | High |
| FTR-02 | Kreator Konten | Mengatur trigger "Comment to DM" untuk postingan spesifik | Audiens yang komen kata tertentu langsung dikirim link via DM | High |
| FTR-03 | Kreator Konten | Mengatur trigger "Follow to DM" | Setiap *followers* baru mendapatkan pesan sambutan & penawaran otomatis | High |
| FTR-04 | Toko Online | Membuat alur balasan (*Flow*) menggunakan *drag-and-drop builder* | Saya bisa merancang skenario percakapan tanpa harus *coding* | High |
| FTR-05 | Toko Online | Menambahkan filter "Keyword Matching" sebagai pemicu awal | Bot hanya berjalan jika pelanggan mengetik kata seperti "harga" | High |
| FTR-06 | Toko Online | Mematikan bot (Pause Automation) di *Live Inbox* | Saya bisa mengambil alih percakapan saat pembeli butuh manusia | High |
| FTR-07 | Toko Online | Membayar paket langganan bulanan langsung dari *dashboard* | Saya tidak perlu menunggu admin untuk mengaktifkan akun | Med |
| FTR-08 | Kreator Konten | Melihat data jumlah orang yang masuk ke dalam *flow* saya | Saya bisa mengukur seberapa efektif kampanye *chat* saya | Low |

### 3.1 Detail *Acceptance Criteria* (Kriteria Penerimaan)

**[FTR-02: Comment to DM Trigger]**
* **Scenario:** Kreator menjalankan kampanye "Ketik MAU untuk link".
  * **Given:** Pengguna telah menghubungkan akun IG dan mengatur trigger dengan kata kunci "MAU" untuk postingan Reels terbaru.
  * **When:** Seorang *follower* (audiens) memberikan komentar dengan tulisan "Mauuu dong" di Reels tersebut.
  * **Then:** 
    1. Sistem Yucano mendeteksi kata kunci (*contains* "mau").
    2. Bot secara otomatis membalas komentar tersebut (misal: "Cek DM ya kak!").
    3. Bot secara otomatis mengirimkan pesan yang sudah disiapkan (*flow* DM) ke dalam *Direct Message* audiens tersebut dalam waktu kurang dari 5 detik.

**[FTR-04: Visual Flow Builder]**
* **Scenario:** Pemilik toko menyusun *flow* penyambutan pesan.
  * **Given:** Pengguna berada di halaman *Flow Builder*.
  * **When:** Pengguna menarik (*drag*) komponen "Kirim Teks" dan komponen "Tombol/Quick Reply" ke dalam kanvas, lalu menyambungkannya dengan garis (*edge*).
  * **Then:** Sistem berhasil menyimpan struktur JSON dari *flow* tersebut dan dapat membaca urutannya dengan benar saat *trigger* aktif.

**[FTR-06: Pause Automation via Live Inbox]**
* **Scenario:** Pembeli mengajukan komplain atau pertanyaan rumit.
  * **Given:** Bot sedang aktif membalas pertanyaan pembeli (status otomatis: *ON*).
  * **When:** Pemilik toko masuk ke menu *Live Inbox*, memilih *chat* tersebut, dan menekan tombol "Tangani Manual" (Pause Automation).
  * **Then:** Bot Yucano berhenti membalas percakapan di *chat room* pengguna tersebut selama 24 jam (atau sampai diaktifkan kembali), sehingga pemilik toko bisa mengobrol layaknya WA/IG biasa.

## 4. Out of Scope (Di Luar Cakupan)
Fitur-fitur berikut ditunda dan **TIDAK** dikerjakan pada rilis MVP v1.0:
* **Integrasi AI/LLM:** Fitur membalas pintar menggunakan ChatGPT/Claude ditunda untuk memangkas biaya API dan kompleksitas pengembangan. Semua balasan 100% *rule-based*.
* **Channel Selain WA & IG:** Integrasi Facebook Messenger, Telegram, Line, atau Web Widget ditunda.
* **Fitur Broadcast Massal (Campaigns):** Pengiriman pesan massal (*broadcast*) ke ribuan nomor sekaligus belum masuk prioritas pertama (fokus pada membalas otomatis/inbound terlebih dahulu untuk mencegah isu akun terblokir/spam).
* **Integrasi E-Commerce Pihak Ketiga:** Integrasi otomatis ke Shopify, WooCommerce, Shopee, atau Tokopedia belum akan dibangun di fase MVP.
* **Aplikasi Mobile (iOS/Android):** Pengguna (Pemilik Bisnis) hanya dapat mengakses dashboard pengaturan (Builder & Inbox) melalui website (*desktop/mobile-web browser*).