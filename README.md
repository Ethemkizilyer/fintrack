# FinTrack

FinTrack, müşteri hesapları, para yatırma/çekme, hesaplar arası transfer ve finansal raporlama sunan bir finansal işlem API'sidir. Proje, YUI Teknoloji teknik ödevi kapsamında hazırlanmıştır.

## Teknolojiler

| Katman              | Teknoloji                                 |
| ------------------- | ----------------------------------------- |
| Dil                 | TypeScript (strict)                       |
| Backend             | Node.js 22, Express 5, Prisma 7, Zod 4    |
| Frontend            | Next.js App Router, React 19, MUI         |
| İstemci veri/oturum | TanStack Query, Axios, Zustand            |
| Veritabanı          | PostgreSQL 17                             |
| Kimlik doğrulama    | JWT access token, httpOnly refresh cookie |
| Loglama             | Pino                                      |
| API dokümantasyonu  | OpenAPI 3, Swagger UI                     |
| Test                | Vitest, Supertest                         |
| Altyapı             | Docker, Docker Compose                    |

## Mimari

```mermaid
flowchart LR
    Web[Next.js web uygulaması] -->|HTTP JSON + cookie| API[Express API]
    Client[Swagger UI] -->|HTTP JSON| API
    API -->|Prisma ve SQL| DB[(PostgreSQL)]
    DB --> Transactions[transactions]
    DB --> Ledger[ledger_entries]
```

API katmanları `routes -> controller -> service -> Prisma` şeklindedir. Para hareketleri veritabanı transaction'ı ve hesap satırı kilitleriyle yürütülür; `ledger_entries` append-only işlem geçmişidir.

## Özellikler

- JWT access token ve hash'lenmiş refresh token cookie ile kimlik doğrulama
- Admin ve müşteri rolleri için yetkilendirme ve kaynak sahipliği kontrolleri
- TRY, USD ve EUR cinsinden hesaplar
- Idempotency anahtarı korumalı para yatırma, para çekme ve transfer
- Tür, durum, tarih aralığı ve başarısızlık nedenlerine göre raporlar
- Müşteri, hesap ve işlem endpoint'leri için sayfalama ve filtreleme
- IP ve kullanıcı bazlı rate limit
- Eski `PENDING` işlemleri `FAILED / STALE_PENDING` olarak işaretleyen cleanup
- Swagger UI üzerinden etkileşimli API dokümantasyonu
- Next.js web iskeleti, ortak Zod şemaları ve merkezi API istemcisi

## Gereksinimler

- Node.js 22 veya üzeri
- npm
- Docker ve Docker Compose

## Yerel geliştirme

Temiz checkout'ta ortam dosyalarını oluştur:

```cmd
copy .env.example .env
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

Var olan `.env` dosyalarının üzerine yazma; eksik değişkenleri mevcut dosyaya ekle. `apps/api/.env` içindeki `DATABASE_URL` değerini, kök `.env` dosyasındaki PostgreSQL kullanıcı adı, parola, veritabanı ve portla eşleştir. Yerel API bağlantısında host `localhost` olmalı.

Bağımlılıkları kurup veritabanını başlat:

```cmd
npm install
docker compose up -d
npm run db:migrate -w apps/api
npm run db:seed -w apps/api
npm run dev
```

`npm run dev` web uygulamasını `http://localhost:3000` adresinde açar. API'yi ikinci terminalde başlat:

```cmd
npm run dev:api
```

Web ortam dosyasındaki `NEXT_PUBLIC_API_URL`, API'nin `/api/v1` adresini göstermelidir. API'nin `WEB_URL` değeri de web uygulamasının origin'iyle (`http://localhost:3000`) eşleşmelidir; refresh cookie istekleri bu CORS ayarına bağlıdır. Yerel seed demo kullanıcılarını oluşturur; üretim Compose ortamı demo kullanıcılarını otomatik oluşturmaz.

## Web ekranları

- `/login`: yönetici veya müşteri girişi.
- `/dashboard`: rol kapsamına göre hesaplar; müşteriler kendi hesaplarını görür, yöneticiler tüm hesapları görür.
- `/dashboard/accounts/new`: müşteri hesabı açma.
- `/dashboard/deposit`, `/dashboard/withdraw`, `/dashboard/transfer`: idempotent para hareketleri.
- `/dashboard/transactions` ve `/dashboard/reports`: hesap hareketleri, işlem detayı, raporlar ve ekstre.
- `/admin/customers`, `/admin/customers/new`, `/admin/customers/:id`: yönetici müşteri listesi, müşteri oluşturma ve profil/durum yönetimi.

Yönetici ve müşteri giriş bilgileri, yerel seed yapılandırmasında belirlenen şifreleri kullanır. Para ve müşteri yetkileri API tarafından ayrıca doğrulanır; arayüzdeki rol koruması yalnızca gezinme deneyimini düzenler.

## Production benzeri Docker ortamı

Temiz checkout'ta `.env.example` dosyasını `.env` olarak kopyala. Var olan `.env` dosyan varsa üzerine yazma; gereken değerleri dikkatlice birleştir. Gerçek ortamda örnek parolaları ve JWT secret'larını değiştir. `DATABASE_URL` içindeki parola `POSTGRES_PASSWORD` ile eşleşmelidir.

```cmd
docker compose -f compose.prod.yaml up --build
```

Stack'i kontrol et ve API loglarını izle:

```cmd
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs -f api
```

- Sağlık kontrolü: `http://localhost:3001/api/v1/health`
- Swagger UI: `http://localhost:3001/api/docs`

Bu yapılandırma API portunu yalnızca yerel makineye açar. Container'ları durdurmak, PostgreSQL volume'unu koruyarak:

```cmd
docker compose -f compose.prod.yaml down
```

Production Compose migration'ları uygular ancak demo kullanıcıları seed etmez. Örnek secret değerlerini gerçek bir sunucuda kullanma.

## Test ve kalite

```cmd
npm test
npm run typecheck
npm run lint
```

API testleri `fintrack_test` veritabanını kullanır. Test setup'ı tabloları her test öncesinde temizler; mevcut test verisini koruman gerekiyorsa testleri çalıştırmadan önce kontrol et.

## Proje yapısı

```text
apps/
  api/       Express API, Prisma şeması ve migration'lar
  web/       Next.js App Router, MUI ve feature tabanlı istemci kodu
packages/
  shared/    API ve web arasında paylaşılan Zod şemaları ve tipler
compose.yaml
compose.prod.yaml
```
