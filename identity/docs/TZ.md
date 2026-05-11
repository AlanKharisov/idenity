# Техническое задание — Mark Identity (NFT Marketplace)

**Версия:** 2.0
**Дата:** 2026-05-11
**Статус:** Draft

---

## 1. Общее описание проекта

### 1.1 Название
**Mark Identity** — мобильное приложение (PWA + Native) для создания, продажи и управления NFT с поддержкой физической верификации через NFC-метки.

### 1.2 Тип приложения
Кросс-платформенное мобильное приложение (React + Capacitor) с интеграцией:
- **Frontend:** React + TypeScript + Capacitor
- **Backend API:** Rust (не предоставлен в репозитории)
- **Auth:** Firebase Authentication
- **Blockchain:** Solana (Phantom wallet integration)
- **Database:** Firebase Firestore + Rust Backend

### 1.3 Целевая аудитория
- Колоды NFT и создатели цифрового искусства
- Коллекционеры и инвесторы
- Бизнесы для маркировки физических товаров NFC-метками

---

## 2. Функциональные требования

### 2.1 Аутентификация и регистрация

| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Email/Password регистрация | Создание аккаунта через email + пароль | P0 |
| Email/Password вход | Авторизация по email + пароль | P0 |
| Google OAuth | Вход через Google аккаунт | P1 |
| Facebook OAuth | Вход через Facebook аккаунт | P1 |
| Apple OAuth | Вход через Apple ID | P1 |
| Логаут | Выход из аккаунта | P0 |
| Сохранение сессии | Автоматический вход при повторном открытии | P0 |

### 2.2 Профиль пользователя

| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Просмотр профиля | Отображение имени, аватара, bio, username | P0 |
| Редактирование профиля | Изменение name, username, bio, location, avatar | P0 |
| Смена пароля | Обновление пароля через Security | P1 |
| Компания верификация | Запрос верификации бизнеса (companyApproved) | P2 |
| 2FA | Двухфакторная аутентификация | P3 |

### 2.3 Крипто-кошельки

| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Подключение Phantom | Интеграция с Phantom wallet | P0 |
| Подключение Solflare | Интеграция с Solflare wallet | P1 |
| Просмотр баланса | Отображение SOL баланса | P0 |
| Добавление кошелька | Добавление адреса вручную | P1 |
| Удаление кошелька | Отключение кошелька | P1 |

### 2.4 Marki Wallet (Custodial)

| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Создание кошелька | Автоматическое создание при регистрации | P0 |
| Просмотр адреса | Отображение адреса кошелька | P0 |
| Просмотр seed phrase | Показать seed phrase (с предупреждением) | P1 |
| Настройка email | Привязка email к кошельку | P1 |
| Fingerprint | Включение/выключение биометрии | P2 |

### 2.5 NFT Менеджмент

| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Создание NFT | Mint NFT на Solana | P0 |
| Загрузка изображения | Image upload + metadata | P0 |
| Редактирование NFT | Изменение title, description, price | P1 |
| Удаление NFT | Удаление из marketplace | P1 |
| Просмотр списка | Grid view своих NFT | P0 |
| Детали NFT | Полная информация о NFT | P0 |

### 2.6 Маркетплейс

| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Лента постов | Просмотр всех NFT на продажу | P0 |
| Покупка за крипту | Оплата через Phantom (SOL) | P0 |
| Покупка COD | Оплата наложенным платежом (фиат) | P1 |
| Продажа NFT | Выставить на продажу | P0 |
| Ценообразование | Установка цены в SOL/UAH/USD | P0 |

### 2.7 CRM и доставки (Frontend ready, backend TBD)

| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Список заказов | Просмотр входящих COD заказов | P1 |
| Принятие заказа | Создание доставки из заказа | P1 |
| Управление доставками | CRUD доставок | P2 |
| Статусы доставок | Pending → Assigned → In Transit → Delivered | P2 |
| Nova Poshta интеграция | Синхронизация трек-номеров | P2 |

### 2.8 NFC верификация

| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Привязка NFC | Связывание NFC UID с NFT | P2 |
| Сканирование NFC | Web NFC сканирование (Android) | P2 |
| Ручной ввод UID | Проверка по UID вручную | P2 |
| Подтверждение получения | Автоматическое закрытие доставки | P2 |

### 2.9 Уведомления

| Функция | Описание | Приоритет |
|---------|----------|-----------|
| Список уведомлений | Просмотр всех уведомлений | P1 |
| Чтение уведомлений | Mark as read | P1 |
| Push-уведомления | Firebase Cloud Messaging | P2 |

---

## 3. Техническая архитектура

### 3.1 Архитектура Frontend

```
src/
├── components/          # Переиспользуемые компоненты
│   └── brand/          # Icons, Brand
├── context/            # React Context
│   └── AuthContext.tsx # Аутентификация
├── firebase/           # Firebase клиент
│   ├── auth.ts         # Auth functions
│   ├── config.ts       # Firebase config
│   ├── socialAuth.ts   # OAuth
│   ├── notifications.ts
│   └── posts.ts
├── hooks/              # Custom hooks
│   ├── useUmi.ts       # Solana Umi
│   ├── usePosts.ts
│   └── useViewHistory.ts
├── pages/              # Страницы приложения
│   ├── SplashScreen.tsx
│   ├── WelcomeScreen.tsx
│   ├── AuthScreen.tsx
│   ├── HomePage.tsx
│   ├── WalletPage.tsx
│   ├── AddNFTPage.tsx
│   ├── ProfilePage.tsx
│   ├── AlertsPage.tsx
│   ├── NFTViewerPage.tsx
│   ├── CrmPage.tsx
│   ├── CreateWalletPage.tsx
│   ├── WalletSettingsPage.tsx
│   ├── CryptoWalletsPage.tsx
│   └── BuyModal.tsx
├── services/           # API клиент
│   ├── apiClient.ts    # REST API calls
│   └── geocoding.ts
├── styles/             # CSS
│   ├── App.css
│   └── tokens.css
├── types/              # TypeScript типы
├── utils/              # Утилиты
│   ├── constants.ts
│   ├── formatters.ts
│   └── contentModeration.ts
├── App.tsx             # Главный компонент
└── index.tsx           # Entry point
```

### 3.2 Стек технологий

| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 19.x | UI Framework |
| TypeScript | 5.x | Type safety |
| Capacitor | 8.x | Native wrapper |
| Firebase Auth | 12.x | Authentication |
| Firebase Firestore | 12.x | NoSQL DB |
| Firebase Storage | 12.x | Image storage |
| @solana/web3.js | 1.x | Solana RPC |
| @metaplex-foundation/umi | 1.5.x | NFT minting |
| @solana/wallet-adapter | Latest | Wallet connection |

### 3.3 API Base URL

```
Production: https://idenity-backend.duckdns.org
Local:      http://localhost:8090 (development)
```

### 3.4 Firebase Config

```typescript
const firebaseConfig = {
    apiKey: "AIzaSyB4HqOTaN3BJ54trXp08HZy5-kgRQ47iUE",
    authDomain: "idenity-e7f29.firebaseapp.com",
    projectId: "idenity-e7f29",
    storageBucket: "idenity-e7f29.firebasestorage.app",
    messagingSenderId: "950682417474",
    appId: "1:950682417474:web:a37ac1c7da752d52d430db",
    measurementId: "G-9K42LJ6Y4B"
};
```

---

## 4. API Endpoints (Backend)

### 4.1 Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Регистрация (public) |
| GET | `/api/auth/me` | Текущий пользователь |

### 4.2 Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/{uid}` | Получить профиль |
| PUT | `/api/profile/{uid}` | Обновить профиль |
| PUT | `/api/profile/{uid}/password` | Сменить пароль |
| POST | `/api/profile/{uid}/avatar` | Загрузить аватар |
| POST | `/api/profile/{uid}/request-approval` | Запрос верификации |

### 4.3 Wallets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallets/marki` | Marki Wallet данные |
| PUT | `/api/wallets/marki/email` | Обновить email |
| PUT | `/api/wallets/marki/fingerprint` | Настройки fingerprint |
| GET | `/api/wallets/crypto` | Список крипто кошельков |
| POST | `/api/wallets/crypto` | Добавить кошелек |
| DELETE | `/api/wallets/crypto/{id}` | Удалить кошелек |

### 4.4 NFTs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nfts` | Все NFT |
| POST | `/api/nfts` | Создать NFT |
| PUT | `/api/nfts/{id}` | Обновить NFT |
| DELETE | `/api/nfts/{id}` | Удалить NFT |
| GET | `/api/nfts/mint-info` | Info для minting |
| POST | `/api/nfts/batch` | Batch создание |
| POST | `/api/nfts/editions` | Editions |

### 4.5 Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/marketplace/buy` | Купить за крипту |
| POST | `/api/marketplace/cod` | Купить COD |
| POST | `/api/nfts/{id}/transfer` | Transfer NFT |

### 4.6 COD Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cod-orders` | Список заказов |
| POST | `/api/cod-orders/{id}/accept` | Принять заказ |

### 4.7 Deliveries (TBD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deliveries` | Список доставок |
| POST | `/api/deliveries` | Создать доставку |
| GET | `/api/deliveries/{id}` | Детали доставки |
| PUT | `/api/deliveries/{id}/status` | Обновить статус |
| POST | `/api/deliveries/{id}/checkpoints` | Добавить checkpoint |
| POST | `/api/deliveries/{id}/sync-novaposhta` | Синхр. с NP |

### 4.8 NFC

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/nfc/bind` | Привязать NFC к NFT |
| POST | `/api/nfc/verify` | Верифицировать NFC |

---

## 5. Типы данных

### 5.1 UserData

```typescript
interface UserData {
    uid: string;
    name: string;
    username: string;
    email: string;
    phone?: string;
    avatar?: string;
    location?: string;
    bio?: string;
    createdAt: string;
    companyApproved?: boolean;
    pendingApproval?: boolean;
    deliveryAddress?: string;
    roles?: string[];
    companyId?: string;
}
```

### 5.2 NFT

```typescript
interface NFT {
    id: string;
    title: string;
    description?: string;
    image: string;
    mintAddress?: string;
    ownerId: string;
    ownerName?: string;
    price: number;
    currency: string;
    forSale: boolean;
    walletNftId?: string;
    nfcUid?: string;
    createdAt: string;
}
```

### 5.3 Delivery

```typescript
interface Delivery {
    id: string;
    orderId?: string;
    nftId: string;
    nftTitle: string;
    sellerId: string;
    buyerId: string;
    buyerName: string;
    deliveryAddress: string;
    carrierType: 'self' | 'nova_poshta';
    courierId?: string;
    courierName?: string;
    controllerId?: string;
    npTrackingNumber?: string;
    status: string;
    checkpoints: DeliveryCheckpoint[];
    customerReceived: boolean;
    nfcUid?: string;
    nfcVerified: boolean;
    createdAt: string;
    updatedAt: string;
}
```

---

## 6. UI/UX Требования

### 6.1 Дизайн-система

- **Max-width:** 500px (mobile-first)
- **Border-radius:** 12-20px
- **Primary color:** #10b981 (green)
- **Background:** #f5f7f3 (light), #0c100e (dark)
- **Шрифт:** Manrope

### 6.2 Компоненты

- Bottom navigation (6 кнопок)
- Cards с rounded corners
- Input fields с rounded borders
- Buttons с gradient backgrounds
- Modals и overlays

### 6.3 Responsive

- Mobile-first design
- Tablet: max-width 500px centered
- Desktop: same as tablet

---

## 7. Безопасность

### 7.1 Authentication

- Firebase Auth с JWT токенами
- Token передается в Authorization header
- Refresh токенов через Firebase SDK

### 7.2 API Security

- Все protected endpoints требуют Bearer token
- Валидация ownership (NFT, Delivery)
- Sanitization user input

### 7.3 Wallet Security

- Seed phrase показывается только с warning
- Biometric authentication опционально
- Non-custodial Phantom wallet

---

## 8. known Issues и ограничения

### 8.1 Frontend Issues

- [ ] CRM: `/api/deliveries` endpoint возвращает 404 (backend не реализован)
- [ ] NFT batch creation требует backend
- [ ] NFC NTAG 424 DNA не реализовано (только NTAG 216 UID)
- [ ] Push notifications требуют настройки FCM

### 8.2 Ограничения

- Только Solana (не Ethereum/Polygon)
- COD работает только с фиатными валютами
- Nova Poshta API требует backend интеграцию

---

## 9. Roadmap

### Phase 1 (Current)
- [x] Auth + Profile
- [x] NFT Creation + Marketplace
- [x] Crypto Wallet + Marki Wallet
- [ ] CRM Delivery management (pending backend)

### Phase 2
- [ ] Batch NFT creation
- [ ] NFC NTAG 424 DNA
- [ ] Push notifications
- [ ] Company verification flow

### Phase 3
- [ ] Nova Poshta full integration
- [ ] AI image generation
- [ ] Social features

---

## 10. Контакты

**Frontend:** React + Capacitor (в репозитории)
**Backend:** Rust API (отдельный репозиторий)
**Firebase:** Настроен и активен

---

*End of Technical Specification*