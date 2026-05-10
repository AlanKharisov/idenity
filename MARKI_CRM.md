# Marki — CRM, Доставки и NFC

> Заметка для Obsidian. Дата: 2026-04-27. Сборка: `cargo check` ✅, `tsc --noEmit` ✅.

## Что за продукт

**MarkiIdentity** — Phygital-платформа: каждый физический товар связан с NFT и NFC-меткой. Покупатель тапает телефоном → видит, что продукт оригинал и кто владелец на блокчейне.

**Стек:** Rust/Axum + React/TypeScript + Firebase + Solana (Metaplex Umi), Capacitor для Android.

**Позиционирование:** против Everledger (диаманты/luxury, B2B-only) и VeChain (enterprise supply chain) — мы делаем то же самое, но **NFT-first** и для **малого/среднего бизнеса**, без долгой энтерпрайз-интеграции.

| Параметр              | Everledger      | VeChain                 | **Marki**                          |
|-----------------------|-----------------|-------------------------|------------------------------------|
| Целевой клиент        | Luxury / B2B    | Enterprise (BMW, …)     | **SMB, локальные бренды**          |
| NFT как core          | Нет             | Нет                     | **Да**                             |
| Онбординг             | Долгая интеграция | SDK + чипы под VeChain | **Self-serve: чип → mint в app**   |
| UX покупателя         | Веб-портал бренда | Кошелёк + VTHO        | **Тап телефоном → страница**       |
| Защита от копирования | RFID + DB       | NTAG/RFID + chain      | **NTAG 424 DNA + CMAC** (план)     |
| Бэкенд истории        | Закрытый        | VeChain Thor           | Firestore сейчас → **ICP канистры** |

---

## Что сделано в этой итерации

### Backend (Rust / Axum)

**Новая модель** — `api/src/models/delivery.rs`
- `Delivery` — id, orderId, nftId, sellerId, buyerId, **carrierType: self | nova_poshta**, courier/controller, npTrackingNumber, status, **checkpoints[]**, customerReceived, **nfcUid**, nfcVerified, timestamps.
- `DeliveryCheckpoint` — id, status, location, timestamp, recordedBy (uid или `nova_poshta`).
- DTO: `CreateDeliveryRequest`, `UpdateCarrierRequest`, `AddCheckpointRequest`, `UpdateStatusRequest`, `BindNfcRequest`, `VerifyNfcRequest`, `VerifyNfcResponse`.

**Расширили `UserData`** — `api/src/models/user.rs`
- `roles: Vec<String>` — любая комбинация `owner | manager | controller | courier | customer`.
- `company_id: Option<String>` — привязка курьера/менеджера к компании-владельцу.
- Добавлен DTO `UpdateRolesRequest`.
- Существующие юзеры не ломаются (`#[serde(default)]`).

**Новый handler** — `api/src/handlers/deliveries.rs`
- `GET  /api/deliveries` — список, scope зависит от роли (owner/manager/controller видят свои продажи + продажи компании; courier — только назначенные ему; покупатель — свои).
- `POST /api/deliveries` — создать (только owner или company-approved).
- `GET  /api/deliveries/:id` — деталь.
- `PUT  /api/deliveries/:id/carrier` — переключить self ↔ nova_poshta, назначить курьера/контролёра.
- `PUT  /api/deliveries/:id/status` — статусы: `pending | assigned | picked_up | in_transit | out_for_delivery | delivered | verified | failed`.
- `POST /api/deliveries/:id/checkpoints` — добавить чекпоинт (как у Новой Пошты).
- `POST /api/deliveries/:id/sync-novaposhta` — **заглушка** под Nova Poshta API (`getStatusDocuments`); добавляет synthetic checkpoint, пока нет `NP_API_KEY`.
- `POST /api/deliveries/:id/confirm-receipt` — покупатель подтвердил получение.

**Новый handler** — `api/src/handlers/nfc.rs`
- `POST /api/nfc/bind` — привязать UID метки к NFT (нормализация UID, лук-ап через коллекцию `nfc_bindings`).
- `POST /api/nfc/verify` — публичный (для авторизованных) ендпоинт: возвращает NFT по UID + автоматически закрывает доставку, если её получает покупатель.

**Маршруты** подключены в `api/src/routes/mod.rs`. Все под auth-middleware (Firebase JWT).

### Frontend (React / TypeScript)

**Расширён `apiClient.ts`** — типы `Delivery`, `DeliveryCheckpoint` и функции:
- `apiListDeliveries`, `apiGetDelivery`, `apiCreateDelivery`
- `apiUpdateCarrier`, `apiUpdateDeliveryStatus`, `apiAddCheckpoint`
- `apiSyncNovaPoshta`, `apiConfirmReceipt`
- `apiBindNfc`, `apiVerifyNfc`

**Новая страница** — `identity/src/pages/CrmPage.tsx` — вкладочный CRM:
1. **Доставки** — список + статистика (всего/в пути/завершено), создание новой доставки, деталь с историей чекпоинтов и тулзами для seller/courier/controller (добавить чекпоинт, сменить статус, sync NP), кнопка «Я получил» для покупателя.
2. **Привязка NFC** — выбираешь свой NFT, вводишь UID метки, привязываем.
3. **Верификация** — Web NFC API (Chrome Android) или ввод UID вручную → возвращает NFT-карточку, автозакрытие активной доставки.

**Подключение** в `App.tsx`:
- Новая страница `crm` в роутере.
- Вкладка «CRM» в боттом-наве показывается **только для `companyApproved` юзеров** или у кого есть `roles[]`.

**`AuthContext.tsx`** — расширен интерфейс `UserData` (`roles?`, `companyId?`), чтобы фронт видел роли с бэка.

---

## Что осталось / TODO

### Производственная безопасность
- [ ] **Чипы NTAG 424 DNA** — заменить UID-only на CMAC верификацию. Сейчас в `handlers/nfc.rs` стоит TODO-метка; точка апгрейда — функция `verify_nfc`.
- [ ] Скрипт массовой прошивки ключей в чипы (Python или Rust).
- [ ] Ограничить чтение `nfc_bindings` (правила Firestore — кто может видеть владельца по UID).

### Nova Poshta
- [ ] Получить и положить `NP_API_KEY` в `Config` (`api/src/config.rs`).
- [ ] Реальный вызов `https://api.novaposhta.ua/v2.0/json/` `getStatusDocuments` в `deliveries::sync_novaposhta` — сейчас стоит заглушка.
- [ ] Маппинг статусов NP → внутренние статусы (`in_transit`, `out_for_delivery`, …).
- [ ] Cron / шедулер для авто-синка раз в N минут (не блокирующий — `tokio::spawn`).

### CRM-UX
- [ ] Поиск курьера/контролёра по имени, а не по UID (сейчас вводится сырой UID — для бизнес-юзера неудобно).
- [ ] Эндпоинт `/api/users/search?role=courier&companyId=…` для авто-комплита.
- [ ] Назначение ролей через UI (сейчас `roles[]` пишется только напрямую в Firestore или через будущий админский ендпоинт).
- [ ] Эндпоинт `PUT /api/profile/:uid/roles` (`UpdateRolesRequest` уже есть в моделях, handler не написан).

### NFC сканирование
- [ ] iOS — добавить нативный плагин Capacitor для NFC (Web NFC работает только на Chrome Android).
- [ ] Глубокая ссылка `marki://verify/<uid>` для тапа без открытого приложения.

### Архитектура / стратегия
- [ ] **ICP-вариант**: вынести историю чекпоинтов в канистру (вместо Firestore). Это даст реальное преимущество vs VeChain в маркетинге («on-chain supply chain без оракулов»).
- [ ] Метрики (хотя пользователь сказал — не сейчас): % успешных доставок, среднее время по курьерам.

### Минор
- [ ] Удалить `#![allow(dead_code)]` в `main.rs`, когда все DTO используются.
- [ ] Тесты на role-based scope в `list_deliveries` (сейчас покрытия нет).

---

## Как тестировать локально

```bash
# backend
cd api && cargo run        # http://localhost:8090

# frontend
cd identity && npm start   # http://localhost:3000
# .env.local:  REACT_APP_API_URL=http://localhost:8090
```

Сценарий:
1. Зарегистрировать двух юзеров: бизнес A (одобрить через `PUT /api/profile/:uid/approval`), покупатель B.
2. У A: создать NFT → во вкладке CRM «+ Новая доставка» → выбрать NFT, ввести UID B как покупателя, адрес, выбрать `Сами везём` или `Нова Пошта`.
3. У A: добавить чекпоинты, менять статус.
4. У A: во вкладке «Привязка NFC» привязать UID метки к NFT.
5. У B: во вкладке «Верификация» ввести тот же UID → доставка автоматически закроется (статус → `verified`).

---

---

## Итерация 2 — баги CRM и крипто-покупка (2026-04-27)

### 🐛 Баг 1 — после «Принять» доставки исчезали

**Причина:** `list_deliveries` (`api/src/handlers/deliveries.rs`) возвращал deliveries где `sellerId == auth.uid` **только если** в `roles[]` был хотя бы один из `owner|manager|controller`. У бизнес-юзера, у которого только `companyApproved: true` и пустой массив `roles`, ни одна ветка не срабатывала → seller видел только свои buyer-ские доставки.

**Фикс:** seller-scope теперь работает безусловно. `roles[]` контролирует только дополнительный company-scope (manager/controller видит чужие доставки своей компании) и courier-scope.

**Гоча, чтоб не повторить:** не делай role-gate без явного флага fallback'а — `companyApproved` юзеры в системе уже есть, у них нет ролей. Если хочешь привязки к ролям — мигрируй автоматом (например при `register` для company_approved → `roles: ["owner"]`). TODO выше остаётся.

### 🐛 Баг 2 — крипто-покупка молча не работает

Несколько причин одновременно в `identity/src/pages/BuyModal.tsx`:
1. Использовался `import.meta.env` (Vite-синтаксис) — у нас CRA, это `undefined` → fallback на mainnet RPC.
2. Дефолтный RPC был **mainnet-beta**, а `useUmi` минтит на **devnet** → wallet, созданный для devnet, шлёт tx в никуда (или на mainnet без баланса).
3. Жесткая проверка `phantom?.isPhantom` — Phantom mobile иногда не выставляет этот флаг.
4. После транзакции backend `transfer_nft` слал ничего → ни `Purchase`, ни `Sale` notifications. Покупатель не понимал что купил.

**Фиксы:**
- `BuyModal`: переехали на `process.env.REACT_APP_SOLANA_RPC_URL` с **devnet** по дефолту (соответствует useUmi).
- Убрали `isPhantom` чек, используем `useUmi.connect()` если `publicKey` нет.
- Sanity-check: Phantom unlocked-ключ должен совпадать с выбранным wallet — иначе понятная ошибка.
- Подробное логирование (`[Buy]`) на каждом шаге.
- Финальный alert содержит NFT title, цену **и tx signature**.

### 🐛 Баг 3 — NFT не уходил с маркетплейса

**Причина:** `nfts::transfer_nft` обновлял `forSale: false` на post, но **не удалял** post. `marketplace::buy_nft` (другой flow) пост удалял — то есть два code-path с разной семантикой. Если фронт показывает все posts независимо от `forSale`, NFT остаётся в ленте.

**Фикс:** `transfer_nft` теперь:
- Считывает `title`, `price`, `currency` из post.
- **Удаляет post** (как `marketplace::buy_nft`).
- Шлёт `notify_purchase` покупателю и `notify_sale` продавцу. Теперь обе стороны получают alert.

### 🆕 Правило для будущих сессий

Сохранил в memory: после любой нетривиальной задачи дописывать сюда (или в другой recap-файл) — что было сломано/добавлено, какие файлы тронул, как тестить, что осталось. Без явного запроса.

### Изменённые файлы (этой итерации)

```
api/src/handlers/deliveries.rs   (list_deliveries: seller-scope без role-gate)
api/src/handlers/nfts.rs         (transfer_nft: delete post + notifications)
identity/src/pages/BuyModal.tsx  (RPC, Phantom flow, лог, sanity-check)
```

### Что нужно проверить после этого фикса

- **Devnet vs mainnet** — кошелёк продавца на devnet? Phantom переключи на devnet (Settings → Developer Settings → Change Network). Иначе `getLatestBlockhash` уйдёт на mainnet и подвесится.
- **`sellerAddress`** на post — заполняется из `crypto_wallets` продавца только если он подключил Phantom **до** листинга. Если в `nfts::create_nft` продавец листил без подключенного Phantom — `seller_address: None`, и buyer-у выскочит «Seller wallet address is unavailable». Это не баг — это валидное ограничение, но можно автоматом подсказать продавцу подключить кошелёк перед листингом.
- **Auto-add `roles: ["owner"]`** при `companyApproved=true` — пока не сделано. Сейчас scope работает и без ролей, но ролей добавить через профиль handler стоит.

---

## Файлы, которые я тронул

```
api/src/models/mod.rs         (+ delivery)
api/src/models/delivery.rs    NEW
api/src/models/user.rs        (+ roles, companyId, UpdateRolesRequest)
api/src/handlers/mod.rs       (+ deliveries, nfc)
api/src/handlers/deliveries.rs NEW
api/src/handlers/nfc.rs        NEW
api/src/handlers/auth.rs       (+ инициализация roles/companyId при регистрации)
api/src/routes/mod.rs          (+ /deliveries/*, /nfc/*)

identity/src/services/apiClient.ts  (+ Delivery types и API-функции)
identity/src/context/AuthContext.tsx (+ roles?, companyId?)
identity/src/pages/CrmPage.tsx      NEW
identity/src/App.tsx                (+ маршрут 'crm', вкладка в боттом-наве)
```
