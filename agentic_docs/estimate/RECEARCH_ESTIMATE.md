# RESEARCH — Смета на вебе (estimate)

**Дата:** 12 августа 2026
**Область:** `web/` (React + TS клиент), фича «составление сметы»
**Статус бекенда:** реализован полностью (фазы 1–7 `PLANNING_ESTIMATE.md`), ручки в Swagger
**Цель документа:** сузить кодовую базу до релевантных файлов и функций — что уже есть на
сервере, что уже есть на клиенте, куда именно встраивается фича и какие зазоры между
контрактом и UI придётся закрыть решением, а не кодом.

> Это **research**, а не design и не planning. Здесь нет ни выбора компонентов, ни разбиения на
> фазы: только карта кода, точный контракт, найденные несоответствия и открытые вопросы.
> Границу см. в §11.

---

## 0. Резюме

1. Сервер отдаёт **шесть путей** (`estimates`, `catalog-items`, `estimate-templates`), все под
   `RequireAuth`, все — `GET/PUT/PATCH/DELETE`, `POST` нет нигде.
2. **Ручек уровня позиции не существует.** `DESIGN_ESTIMATE §10` обещает
   `/api/v1/estimate-items/{id}`, но в `router.go` их нет. Любая правка одной строки сметы —
   это `PUT` всей сметы целиком. Это главный факт, определяющий форму редактора (находка F-1).
3. **`PUT` без ключа `items` удаляет все позиции.** Отсутствие ключа и `items: []` — одно и то
   же (находка F-2).
4. Итоги считает сервер и отдаёт в каждом ответе; клиенту нужна **вторая реализация формулы**
   для отклика при вводе — это заложено в DESIGN §6.3, фикстуры паритета лежат в
   `server_go/internal/service/testdata/estimate_totals_fixtures.json`.
5. Фикстуры покрывают только **вторую половину** формулы (проценты над `net`/`cost`).
   Построчное `ROUND(quantity × price)` ими не покрыто — а именно там клиент разойдётся с
   сервером легче всего (находка F-4).
6. `rev` наружу не отдаётся, `If-Match` нет → **last-write-wins** без предупреждения (F-3).
7. На вебе есть готовый образец фичи — `src/features/projects/`: `*.api.ts` + `*.hooks.ts` +
   `types.ts` + `components/` + `pages/`. Смета копирует эту форму, а не изобретает свою.
8. Точка входа в UI уже стоит: заглушка вкладки «Сметы» в
   `src/features/projects/pages/ProjectDetailPage.tsx:143`.

---

## 1. Область и метод

Что просмотрено целиком:

| Слой | Пути |
|---|---|
| Домен, сервис, транспорт, репозиторий сметы | `server_go/internal/{domain,service,handler,repository/sqlite}/*estimate*, *catalog*` |
| Контракт | `server_go/api/swagger.json` (сверен с кодом, расхождений нет) |
| Проектные документы | `server_go/docs/features/estimate/{DESIGN,PLANNING}_ESTIMATE.md`, `docs/ADR_009_Estimate_Decisions.md`, `agentic_docs/ADR_007_Product_Pivot_To_Project_Management.md` |
| Клиент | `web/src/**` целиком (48 файлов), `web/agentic_docs/CONVENTIONS.md`, `web/package.json` |

Проверено отдельно: слово `estimate` в `web/src/` встречается **только** в двух местах —
заглушка вкладки в `ProjectDetailPage.tsx` и текст на лендинге. Кода сметы на клиенте нет
ни строки; стартуем с нуля, но на готовой инфраструктуре запросов.

---

## 2. Бекенд: карта кода

### 2.1 Что где лежит

| Файл | Что содержит | Зачем клиенту |
|---|---|---|
| `internal/handler/router.go:221–243` | регистрация 14 маршрутов сметы, каталога и шаблонов | единственный достоверный список ручек |
| `internal/handler/estimate.go` | DTO ответов и запросов, вся структурная валидация | wire-shape и лимиты полей 1:1 |
| `internal/handler/catalog.go` | то же для каталога | — |
| `internal/handler/estimate_template.go` | то же для шаблонов | — |
| `internal/handler/response.go:15–26` | `errorEnvelope { error: { code, message } }` | формат ошибок, уже разбирается `apiFetch` |
| `internal/service/estimate.go:70` | `ComputeTotals` — **эталон формулы** | клиент повторяет её один в один |
| `internal/service/estimate.go:93` | `roundBp` — округление half-up на целых | то же |
| `internal/repository/sqlite/estimate.go:354` | `Totals`: `SUM(ROUND(q × price))` | построчное округление — вторая половина паритета |
| `internal/repository/sqlite/estimate.go:294` | `getItems`: `ORDER BY position, id` | порядок позиций в ответе |
| `internal/repository/sqlite/estimate.go:323` | `ListByProject`: `ORDER BY updated_at DESC, id DESC` | порядок списка смет — правка поднимает смету наверх |
| `internal/repository/sqlite/estimate.go:126` | `upsertItems`: soft-delete всего, чего нет в теле | механика «PUT = ровно это» |
| `internal/service/testdata/estimate_totals_fixtures.json` | фикстуры паритета, Go-агностичный JSON | готовый набор для теста клиентской формулы |

Домен (`internal/domain/estimate.go`) — пять анемичных типов: `Estimate`, `EstimateItem`,
`CatalogItem`, `EstimateTemplate`, `EstimateTemplateItem` + агрегат `EstimateTotals`.
Клиенту домен не виден: наружу идут только DTO из `handler/`.

### 2.2 Ключевые константы сервера

| Константа | Значение | Где |
|---|---|---|
| `estimateBodyLimit`, `catalogBodyLimit` | 1 МБ | `handler/estimate.go:22`, `handler/catalog.go:21` |
| `estimateItemLimit` | 1000 позиций в смете и в шаблоне | `handler/estimate.go:28` |
| `catalogItemLimit` | 5000 живых строк каталога | `service/estimate.go:15` |
| `maxPriceMinor` | 10¹¹ минорных единиц за единицу | `handler/estimate.go:233` |
| `currencyPattern` | `^[A-Z]{3}$`, принадлежность ISO-4217 не проверяется | `handler/estimate.go:34` |

---

## 3. Контракт API — что есть на самом деле

Все ручки требуют `Authorization: Bearer <access>`; `ownerID` берётся из JWT и **никогда** из
тела. Чужой и несуществующий id отвечают одинаково — `404`.

| Метод | Путь | Тело | Успех | Ошибки |
|---|---|---|---|---|
| GET | `/api/v1/projects/{id}/estimates` | — | `200` массив `estimateSummary` (**без позиций**) | 400, 401, 404 |
| GET | `/api/v1/estimates/{id}` | — | `200` `estimate` (позиции + итоги) | 400, 401, 404 |
| PUT | `/api/v1/estimates/{id}` | `estimateRequest` | `201` создана / `200` заменена | 400, 401, 404, 413 |
| PATCH | `/api/v1/estimates/{id}` | `estimatePatchRequest` | `200` `estimate` | 400, 401, 404 |
| DELETE | `/api/v1/estimates/{id}` | — | `204` **всегда** | 400, 401 |
| GET | `/api/v1/catalog-items` | — | `200` весь каталог, `ORDER BY title, id` | 401 |
| GET·PUT·PATCH·DELETE | `/api/v1/catalog-items/{id}` | `catalogItem*` | как выше | + `400 catalog item limit reached` |
| GET | `/api/v1/estimate-templates` | — | `200` список **без позиций** | 401 |
| GET·PUT·PATCH·DELETE | `/api/v1/estimate-templates/{id}` | `estimateTemplate*` | как выше | 400, 401, 404, 413 |

### 3.1 Чего в контракте нет — и это не забыли, а решили

| Нет | Где это записано | Следствие для клиента |
|---|---|---|
| `/api/v1/estimate-items/{id}` (CRUD одной позиции) | обещано `DESIGN §10`, **не реализовано** в `router.go` | правка одной строки = `PUT` всей сметы |
| «применить шаблон», «вставить из каталога» | `DESIGN §7`: перенос вниз — операция клиента | клиент сам читает шаблон, чеканит новые UUIDv7 и делает обычный `PUT` |
| `POST` где-либо | `DESIGN_PROJECT §11.1`: три глагола | id генерирует клиент, `PUT` — и создание, и замена |
| Поиск/фильтр/пагинация на сервере | `DESIGN §5.4` | каталог читается целиком, фильтруется на клиенте |
| Суммы и счётчик смет в `GET /projects` | решение 10, `DESIGN §9.2` | в списке проектов денег не будет; не «забыли добавить» |
| `rev`, `ownerId`, `deletedAt` в ответах | `DESIGN §10` | оптимистической блокировки на клиенте построить не на чем |
| Список всех смет владельца | — | сметы достижимы только через проект |

### 3.2 Семантика, которая ломает наивный клиент

- **`PUT` = «пусть по этому адресу будет ровно это».** Отсутствующий ключ `items` и `items: []`
  означают одно и то же: пометить удалёнными все позиции
  (`repository/sqlite/estimate.go:126`, тесты `TestEstimates_Put_EmptyItemsDeletesAll`,
  `TestEstimates_Put_MissingItemsKeyDeletesAll`).
- **`PATCH` не трогает позиции вовсе** — только `title`, `currency`, `taxRateBp`, `discountBp`,
  `note`. Пустое тело `{}` не меняет даже `updated_at` (`service/estimate.go:211`).
- **`null` в `PATCH` запрещён** → `400 field must not be null`. «Очистить» — это `""` или `0`.
- **`projectId` обязателен в теле `PUT`** и обязан быть валидным UUIDv7 своего проекта; чужой
  проект и чужая смета отвечают одинаково — `404`.
- **`currency` обязателен в `PUT`** — пустая строка не пройдёт `^[A-Z]{3}$`.
- **Итоги в теле запроса игнорируются молча** — производная, входного значения нет.
- **`DELETE` идемпотентен**: `204` и на чужой, и на несуществующий id.
- **Дробная цена — `400`, а не округление** (`80000.5` не проходит `json.Unmarshal` в `int64`).

---

## 4. Wire-shapes → TypeScript

Снято дословно с DTO в `handler/` (сверено со `swagger.json`). Готово к переносу в
`web/src/features/estimates/types.ts`.

```ts
// GET /api/v1/estimates/{id} · PUT · PATCH — ответ
type Estimate = {
  id: string
  projectId: string
  title: string
  currency: string        // "RUB" | "KZT" | ... — три заглавные буквы, справочника нет
  taxRateBp: number       // базисные пункты: 2000 = 20 %
  discountBp: number      // 500 = 5 %
  note: string
  items: EstimateItem[]   // ORDER BY position, id
  totals: EstimateTotals
  createdAt: string       // RFC3339, мс
  updatedAt: string
}

type EstimateItem = {
  id: string
  title: string
  description: string
  unit: string            // свободная строка: "м²", "шт", "точка", "смена"
  quantity: number
  purchasePriceMinor: number
  sellingPriceMinor: number
  position: number
  // суммы строки нет — произведение считается при чтении (DESIGN §5.2)
}

type EstimateTotals = {
  costMinor: number
  netMinor: number
  discountMinor: number
  netAfterDiscountMinor: number
  taxMinor: number
  grossMinor: number
  marginMinor: number
}

// GET /api/v1/projects/{id}/estimates — то же, но БЕЗ items
type EstimateSummary = Omit<Estimate, "items">

// PUT /api/v1/estimates/{id} — тело
type EstimateInput = {
  projectId: string
  title: string
  currency: string
  taxRateBp: number
  discountBp: number
  note: string
  items: EstimateItemInput[]   // отсутствие ключа = удалить все позиции
}
type EstimateItemInput = Omit<EstimateItem, never>  // те же 8 полей, id чеканит клиент

// PATCH — только скаляры, null запрещён
type EstimatePatch = Partial<Pick<Estimate,
  "title" | "currency" | "taxRateBp" | "discountBp" | "note">>

// /api/v1/catalog-items
type CatalogItem = {
  id: string
  title: string
  description: string
  unit: string
  category: string        // свободная строка, не справочник
  isFavorite: boolean
  purchasePriceMinor: number
  sellingPriceMinor: number
  createdAt: string
  updatedAt: string
  // нет quantity (принадлежит объекту), нет currency (её задаёт смета), нет position
}
type CatalogItemInput = Omit<CatalogItem, "id" | "createdAt" | "updatedAt">
type CatalogItemPatch = Partial<CatalogItemInput>

// /api/v1/estimate-templates
type EstimateTemplate = {
  id: string
  title: string
  note: string
  taxRateBp: number
  discountBp: number
  items: EstimateTemplateItem[]   // те же поля, что EstimateItem
  createdAt: string
  updatedAt: string
  // нет projectId, нет currency, нет totals
}
type EstimateTemplateSummary = Omit<EstimateTemplate, "items">
```

Ошибка (`errorEnvelope`) — `{ "error": { "code": "VALIDATION_ERROR", "message": "invalid currency" } }`;
`apiFetch` уже разворачивает её в `ApiError { status, code, message }` (`utils/api.ts:179–184`).
Коды, которые встретятся: `VALIDATION_ERROR`, `NOT_FOUND`, `TOKEN_INVALID`, `INTERNAL`.

---

## 5. Валидация: что клиент обязан продублировать

Считается в **рунах** (`utf8.RuneCountInString`) — на клиенте это `Array.from(s).length`, не
`s.length`; готовый хелпер `runeLength` уже есть в `ProjectFormModal.tsx:17`.

| Поле | Правило | Источник |
|---|---|---|
| `title` сметы / шаблона / позиции | ≤ 256 рун | `handler/estimate.go:207,239` |
| `description` позиции | ≤ 1000 рун | `:242` |
| `unit` | ≤ 32 рун | `:245` |
| `note` | ≤ 512 рун | `:219` |
| `category` каталога | ≤ 64 рун | `handler/catalog.go:89` |
| `currency` | ровно `^[A-Z]{3}$` | `handler/estimate.go:210` |
| `quantity` | ≥ 0, ≤ 1 000 000, не `NaN`/`Inf` | `:248` |
| `purchasePriceMinor`, `sellingPriceMinor` | целые, 0 … 10¹¹ | `:251–256` |
| `taxRateBp`, `discountBp` | 0 … 10000 | `:213–217` |
| `position` | 0 … 9999 | `:257` |
| позиций в смете / шаблоне | ≤ 1000 | `:222` |
| строк каталога | ≤ 5000, проверяется только при вставке новой | `service/estimate.go:292–305` |
| тело запроса | ≤ 1 МБ → `413` | `:22` |

---

## 6. Деньги: формула, округление, паритет

### 6.1 Эталон (`service/estimate.go:70`)

```
cost   = Σ round(quantity × purchasePriceMinor)   ← построчно, в SQL
net    = Σ round(quantity × sellingPriceMinor)    ← построчно, в SQL
discount         = roundBp(net, discountBp)
netAfterDiscount = net − discount
tax              = roundBp(netAfterDiscount, taxRateBp)
gross            = netAfterDiscount + tax
margin           = netAfterDiscount − cost
```

`roundBp(amount, bp) = round(amount × bp / 10000)`, half away from zero, целочисленно
(`service/estimate.go:93`). Порядок принципиален и записан решением: **скидка до налога,
маржа после скидки, налог в маржу не входит** (`DESIGN §6.1`).

### 6.2 Два места округления, а не одно

Сервер округляет **дважды и в разных слоях**:

1. `ROUND(quantity × price)` — **на каждой позиции**, в SQL (`repository/sqlite/estimate.go:354`).
   Комментарий там прямо говорит: `SUM(ROUND(...)) ≠ ROUND(SUM(...))`, и разница — весь смысл.
2. `roundBp` — на процентах, в Go, над уже готовыми `net`/`cost`.

Клиент, который посчитает `Math.round(Σ quantity × price)`, разойдётся с сервером на копейки
при первой же смете с дробным количеством. Порядок обязан быть: округлить каждую строку →
сложить → проценты.

### 6.3 Готовые фикстуры

`server_go/internal/service/testdata/estimate_totals_fixtures.json` — JSON намеренно
Go-агностичный (см. комментарий в `estimate_totals_test.go:11–17`: «фикстуры лежат в файле,
который может прочитать веб»). Шесть случаев: пример из DESIGN §10, скидка+налог, отрицательная
маржа, `discountBp = 10000`, половина минорной единицы, пустая смета.

**Покрывают только шаг 2** — вход фикстуры это уже готовые `netMinor`/`costMinor`. Построчного
округления в них нет (F-4).

### 6.4 Точность чисел в JS

Деньги приходят как JSON-числа в минорных единицах. Потолок валидации допускает
`quantity 10⁶ × price 10¹¹ = 10¹⁷` на одной позиции — это больше `Number.MAX_SAFE_INTEGER`
(9.007 × 10¹⁵). Реальная смета — единицы миллионов минорных единиц, до потолка десять
порядков, но валидация его не запрещает. Решение (обычный `number` / `BigInt` / клиентский
предохранитель ниже серверного) — вопрос design-шага, не research (см. §10, вопрос 5).

---

## 7. Веб: что уже есть и переиспользуется

### 7.1 Инфраструктура (готова, править не нужно)

| Что | Где | Замечание |
|---|---|---|
| `apiFetch<T>` с авто-refresh токена | `src/utils/api.ts:97` | `204` → `{}` (`:118`), ошибки → `ApiError` |
| `ApiError { status, code, message }` | `src/utils/api.ts:50` | вся обработка `404`/`400` строится на нём |
| `buildApiUrl` | `src/utils/apiConfig.ts` | адрес API, трогать не нужно |
| `uuidv7()` | `src/utils/uuid.ts` | **обязателен**: сервер отвергает v4 (`TestEstimates_UUID_RejectsV4`) |
| `QueryClient` (retry 1, без refetchOnWindowFocus) | `src/main.tsx:16` | инвалидация после мутаций — явная |
| `formatDateTime` | `src/features/projects/format.ts:3` | `ru-RU`, short/short |
| Защита маршрутов | `src/features/auth/components/ProtectedRoute.tsx` | смета — только для авторизованных |

### 7.2 Образец фичи — `src/features/projects/`

Фактическая (не декларативная, см. F-8) структура, которую смета повторяет:

```
features/projects/
├── projects.api.ts       # тонкие обёртки над apiFetch: getAll/getById/put/patch/remove
├── projects.hooks.ts     # useQuery/useMutation + PROJECTS_QUERY_KEY + инвалидация
├── types.ts              # wire-типы, лимиты полей, лейблы и badge-классы
├── format.ts             # форматирование дат
├── components/           # ProjectFormModal.tsx, DeleteProjectModal.tsx
└── pages/                # ProjectsPage.tsx, ProjectDetailPage.tsx
```

Приёмы, которые переносятся прямо:

- **id чеканит клиент**: `projects.hooks.ts:33` — `projectsApi.put(uuidv7(), data)`;
- **PATCH-диффом**: `ProjectFormModal.tsx:68–84` собирает только изменившиеся поля, пустой
  патч → просто закрыть модалку;
- **модалка без Bootstrap JS**: `modal-backdrop` + `modal d-block` руками
  (`ProjectFormModal.tsx:106–110`) — бандла Bootstrap JS в приложении нет;
- **лимиты полей константой** рядом с типами (`types.ts:23`) и `maxLength` на `input`;
- **скелетоны/пустое состояние/ошибка** — три ветки списка в `ProjectsPage.tsx:101–115`.

### 7.3 Стек и правила

`react 19.1`, `@tanstack/react-query 5.101`, `react-router-dom 7.18`, `bootstrap 5.3.8` +
`bootstrap-icons`, `@reduxjs/toolkit` (только auth-слайс и учебный `quotes`).
`web/agentic_docs/CONVENTIONS.md`: **mobile-first, ванильный Bootstrap-grid**, React Query по
умолчанию, RTK — только по явному указанию, без prop-drilling дальше соседнего компонента.

### 7.4 Точки встраивания

| Точка | Файл:строка | Что там сейчас |
|---|---|---|
| Вкладка «Сметы» в карточке проекта | `pages/ProjectDetailPage.tsx:143–145` | `<ComingSoonTab text="Раздел «Сметы» появится вместе с фичей сметы." />` |
| Список вкладок | `ProjectDetailPage.tsx:13–18` | `TABS` — `info / measurement / planner / estimate` |
| Маршруты | `src/App.tsx:111–130` | есть `/projects` и `/projects/:id`; маршрутов сметы, каталога, шаблонов нет |
| Меню | `src/components/Navbar.tsx:54–66` | «Главная / Проекты / Профиль»; каталог и шаблоны — владельческие, в проект не помещаются |

---

## 8. Находки и риски

**F-1. Ручек уровня позиции нет — редактор обязан быть черновиком.**
`DESIGN §10` перечисляет `/api/v1/estimate-items/{id}`, `router.go` их не регистрирует, в
Swagger их нет. Единственный способ изменить строку — `PUT` всей сметы с полным набором
позиций. Значит: позиции живут в локальном состоянии редактора, сервер видит их одним
запросом. Цена — в §10, вопрос 1 (автосохранение или явное «Сохранить»).

**F-2. `PUT` без `items` стирает позиции.** Самая опасная ручка фичи, и опасна она именно для
частичных обновлений: «поменять только скидку» через `PUT` без `items` уничтожит смету. Для
скаляров существует `PATCH`, и клиент обязан его использовать.

**F-3. Конкурентная правка — молчаливая потеря.** `rev` не отдаётся, `If-Match` не в v1
(`PLANNING`, «Что этот план не покрывает»). Две вкладки на одной смете = last-write-wins без
предупреждения. Обнаружить это клиент может разве что по `updatedAt`.

**F-4. Паритет формулы покрыт наполовину.** Фикстуры проверяют проценты над `net`/`cost`;
построчное `ROUND(quantity × price)` — нет. Клиентский тест паритета должен быть шире файла
фикстур, иначе разойдётся именно там, где пользователь смотрит: в колонке сумм.

**F-5. Порядок списка смет задаёт сервер** — `updated_at DESC, id DESC`. Отредактированная
смета прыгает наверх списка. Своей сортировки у клиента нет; если она нужна — только локальная.

**F-6. Каталог целиком на клиенте.** До 5000 строк одним `GET`, без поиска и пагинации на
сервере — поиск, избранное и категории делает клиент (`DESIGN §5.4`). Для выборщика позиций
это норма; для «страницы каталога» на 5000 строк — вопрос виртуализации.

**F-7. Перенос шаблона и каталога в смету — целиком клиентская операция.** Прочитать шаблон →
на каждую позицию **новый** `uuidv7()` → `PUT` обычной сметы. Переиспользовать id шаблонных
позиций нельзя: это чужие строки другой таблицы. Копирование по значению — не оптимизация, а
требование (`DESIGN §7`: правка шаблона не должна переписывать прошлые сметы; тест
`TestEstimateTemplates_ApplyThenEdit_DoesNotAffectExistingEstimate`).

**F-8. `CONVENTIONS.md` расходится с фактической структурой.** Конвенция требует
`api/`, `hooks/`, `types/`, `index.ts` внутри фичи и все `.tsx` в `src/components/`, все
модалки — в `src/components/modals/`. Фактически `projects` сделана плоскими файлами
(`projects.api.ts`, `projects.hooks.ts`) с `components/` и `pages/` внутри фичи, а в
`src/components/modals/` лежит один `ContactModal.tsx`. Смета должна следовать чему-то одному;
это решение, а не находка кода (§10, вопрос 6).

**F-9. Ввод денег — единственное место, где клиент обязан не ошибиться.** Пользователь вводит
рубли с копейками, сервер принимает **целые** минорные единицы, дробное значение — `400`.
Значит: парсинг `"1 234,56"` → `123456`, обратное форматирование через `Intl.NumberFormat` с
валютой сметы. Множитель 100 захардкожен (`DESIGN §6.2`) — у всех валют СНГ два знака.

**F-10. Валюту по умолчанию помнит клиент.** Сервер её не хранит (`DESIGN §12.2`, п. 2) —
последняя использованная живёт в `localStorage` или берётся из последней сметы проекта.

**F-11. Каскад удаления проекта тихо уносит сметы.** `ProjectService.SoftDelete` помечает
сметы и позиции (`TestEstimates_ProjectDelete_CascadesToEstimate`), но **не** каталог и
шаблоны — они владельческие. Текст в `DeleteProjectModal` про «90 дней» это уже покрывает;
кэш смет после удаления проекта нужно инвалидировать.

**F-12. Экспорт сметы заказчику не решён вовсе** (`DESIGN §12.2`, п. 1) — ни PDF, ни Excel.
На схему не влияет: экспорт читает то, что уже отдаёт `GET /estimates/{id}`. В область этой
фичи не входит, но именно ради него бригадир составляет смету — стоит держать в виду.

---

## 9. Кандидатная карта файлов (**не план**, ориентир объёма)

```
src/features/estimates/
├── estimates.api.ts          # GET списка по проекту, GET/PUT/PATCH/DELETE сметы
├── estimates.hooks.ts        # ESTIMATES_QUERY_KEY, useGetEstimates(projectId), useGetEstimate, ...
├── catalog.api.ts   · catalog.hooks.ts
├── templates.api.ts · templates.hooks.ts
├── types.ts                  # §4 целиком + лимиты из §5
├── totals.ts                 # вторая реализация формулы (§6) + money-парсер/форматтер
├── totals.test.ts            # паритет против estimate_totals_fixtures.json + построчное округление
├── components/               # таблица позиций, строка позиции, выборщик из каталога, модалки
└── pages/                    # список смет проекта, редактор сметы, каталог, шаблоны
```

Объём для оценки: сервер отдаёт **14 ручек** и **три независимых редактора** (смета, каталог,
шаблон). Смета полезна без каталога и шаблонов — на сервере они и делались отдельными фазами
(5 и 6) ровно по этому критерию.

---

## 10. Открытые вопросы — на вход design-шагу

| № | Вопрос | Почему research его не закрывает |
|---|---|---|
| 1 | **Автосохранение или явное «Сохранить»?** | Следствие F-1: каждая правда строки — `PUT` всей сметы. Автосохранение с debounce = поток полных `PUT`; явная кнопка = риск потерять черновик. Это продуктовое решение |
| 2 | **Где живёт редактор сметы: внутри вкладки или на своём маршруте?** | Вкладка не даёт ссылки на конкретную смету; `/estimates/:id` даёт, но выпадает из карточки проекта. Влияет на `App.tsx` и на «назад» |
| 3 | **Где в навигации каталог и шаблоны?** | Они принадлежат владельцу, а не проекту — в `/projects/:id` не помещаются. Нужны пункты в `Navbar` или раздел «Настройки» |
| 4 | **Форма таблицы позиций на мобильном** | Конвенция — mobile-first; 8 колонок в `<table>` на 360 px не помещаются. Карточки или горизонтальный скролл — решение дизайна |
| 5 | **`number` или `BigInt` для сумм** | §6.4: реальные значения безопасны, потолок валидации — нет. Дешёвый вариант — клиентский предохранитель ниже серверного |
| 6 | **Следовать `CONVENTIONS.md` или образцу `projects`?** | F-8: документ и код расходятся; смета — третья фича, которая закрепит одно из двух |
| 7 | **Показывать ли себестоимость и маржу по умолчанию** | Это коммерческая тайна бригадира (`domain/estimate.go:66–71` прячет цены даже из логов). Экран может открываться заказчику через плечо |

---

## 11. Граница: что этот документ не делает

- не выбирает компоненты, не рисует экраны и не описывает состояние редактора — это DESIGN;
- не разбивает работу на фазы и не даёт оценок — это PLANNING;
- не трогает сервер: бекенд готов, расхождение `DESIGN §10` про `/estimate-items/{id}` — не
  задача веба (сметы редактируются целиком, и этого достаточно);
- не решает вопрос экспорта (F-12) — он отдельный и на контракт не влияет.

---

## Приложение. Индекс файлов

**Бекенд, читать при реализации:**
`server_go/internal/handler/router.go:221–243` ·
`internal/handler/estimate.go` · `catalog.go` · `estimate_template.go` ·
`internal/service/estimate.go:70,93` ·
`internal/repository/sqlite/estimate.go:126,294,323,354` ·
`internal/service/testdata/estimate_totals_fixtures.json` ·
`api/swagger.json`

**Документы решений:**
`server_go/docs/features/estimate/DESIGN_ESTIMATE.md` (§5 состав, §6 деньги, §7 снимок,
§9 чтение, §10 контракт, §11 валидация, §12.2 открытое) ·
`PLANNING_ESTIMATE.md` («Что этот план не покрывает») ·
`docs/ADR_009_Estimate_Decisions.md` ·
`agentic_docs/ADR_007_Product_Pivot_To_Project_Management.md`

**Клиент, образец и точки встраивания:**
`web/src/features/projects/**` ·
`web/src/utils/{api,apiConfig,uuid}.ts` ·
`web/src/App.tsx:111–130` · `web/src/components/Navbar.tsx:54–66` ·
`web/src/features/projects/pages/ProjectDetailPage.tsx:13–18,143–145` ·
`web/agentic_docs/CONVENTIONS.md`
