# BUG — «Заморозка» приложения: вечный спиннер и ноль запросов в Network

**Дата:** 12 августа 2026
**Область:** `web/` — React-клиент (SPA на Vite + Bootstrap + RTK)
**Статус:** диагностирован, фикс предложен (см. §7)
**Затронутые файлы:**
- `src/utils/api.ts` — корневая причина (логика обновления токена)
- `src/features/auth/authSlice.ts` — состояние проверки сессии
- `src/features/auth/components/ProtectedRoute.tsx` — вечный спиннер
- `src/App.tsx` — запуск проверки сессии при монтировании
- `nginx.conf` — вторичный дефект (отсутствие Cache-Control)

---

## 0. TL;DR

| Что | Значение |
|---|---|
| **Симптом** | Приложение «замерзает»: на странице вечный спиннер, в DevTools → Network **ни одного запроса**, ошибок в консоли нет |
| **Триггер** | Любой 401 при протухшей сессии: `GET /api/v1/me` (проверка сессии при загрузке) получает 401, `POST /auth/refresh` тоже 401 |
| **Корень** | `api.ts:150-154` и `api.ts:235-238`: при неудачном refresh очередь ожидающих промисов **выбрасывается** (`refreshSubscribers = []`) вместо того, чтобы завершить их. Промис `fetchMeAsync` никогда не резолвится → `isLoading` навсегда `true`, `isInitialChecked` навсегда `false` |
| **Эффект** | `ProtectedRoute` вечно рисует спиннер, страница `/projects` не монтируется → **запросы не уходят вообще**, ошибок нет |
| **«Лечение»** | Принудительная перезагрузка (Cmd+Shift+R): JS стартует заново, токены уже очищены → экран логина → новый вход работает |
| **Фикс** | Отклонять зависшие промисы при неудачном refresh + редирект на `/login`; плюс `Cache-Control` в `nginx.conf` (§7) |
| **Сервер не виноват** | Проверено полностью: БД, данные, CORS, HTTP/2 — всё отвечает за ~0.2с (§5) |

---

## 1. Хронология инцидента (что видел пользователь)

1. Открыт прод `sng-fuenex.shk.solutions` → список проектов пуст.
2. В DevTools → Network: `OPTIONS /api/v1/me/address` → `204 No Content`, но строка запроса висит в **pending**.
3. «Выйти и зайти» не помогает; **ручное удаление токенов** из localStorage тоже не помогает; ошибок в консоли нет.
4. Локально (`localhost`) всё работает.
5. При открытии `https://sng-fuenex.shk.solutions/projects` — **в Network тишина, запросы вообще не уходят**.
6. **Принудительная перезагрузка** (Cmd+Shift+R) → всё отобразилось.

Пункты 5–6 — ключевые: «ноль запросов» + «жёсткая перезагрузка лечит» = приложение заморожено в состоянии ожидания, а не сервер/сеть.

---

## 2. Механизм бага (по шагам, по коду)

### 2.1 Поток сессии при загрузке

`src/App.tsx:35-40` — при монтировании приложение проверяет сессию:

```ts
useEffect(() => {
  const hasToken = getAccessToken() ?? getRefreshToken()
  if (hasToken) {
    void dispatch(fetchMeAsync())   // GET /api/v1/me
  }
}, [dispatch])
```

### 2.2 401 → попытка refresh

`fetchMeAsync` (`authSlice.ts:79-93`) вызывает `apiFetch("/api/v1/me")`. Если access-токен протух, сервер отвечает `401`. `apiFetch` (`api.ts:122`) перехватывает 401 и пытается обновить токен:

```ts
// api.ts:130-154 (упрощено)
if (response.status === 401 && !isRetry) {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    if (!isRefreshing) {
      isRefreshing = true
      try {
        const refreshRes = await fetch(buildApiUrl("/api/v1/auth/refresh"), ...)
        if (refreshRes.ok) {
          ...
          onRefreshed(data.accessToken)   // резолвит очередь — успешный путь
        } else {
          isRefreshing = false
          clearTokens()
          refreshSubscribers = []         // ← БАГ: очередь выброшена, промисы не завершены
        }
      } catch {
        isRefreshing = false
        clearTokens()
        refreshSubscribers = []           // ← БАГ: то же в catch
      }
    }
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((newToken) => { ... retry ... })   // api.ts:155-167
    })
  }
}
```

### 2.3 Почему промис зависает навсегда

Очередь `refreshSubscribers` хранит **только успешные** колбэки (`api.ts:86-88`):

```ts
let refreshSubscribers: ((token: string) => void)[] = []
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb)
}
```

Когда refresh не удался, `refreshSubscribers = []` просто **удаляет** эти колбэки — ни `resolve`, ни `reject` не вызываются. Каждый ожидающий запрос вернул `new Promise(...)`, которое **никогда не завершится**.

→ `fetchMeAsync` не получает ни fulfilled, ни rejected.

### 2.4 Состояние Redux застревает

`authSlice.ts` получил только `fetchMeAsync.pending` (`isLoading = true`), а `isInitialChecked` так и остаётся `false`:

```ts
// authSlice.ts:421-437
.addCase(fetchMeAsync.pending, (state) => { state.isLoading = true })
// fulfilled / rejected — НИКОГДА не наступают
```

### 2.5 ProtectedRoute рисует вечный спиннер

`ProtectedRoute.tsx:12-20`:

```tsx
if (!isInitialChecked && isLoading) {
  return ( /* спиннер на весь экран */ )
}
```

Спиннер на весь экран → страница `/projects` **не монтируется** → компонент списка проектов не вызывается → **в Network ноль запросов**. Ошибок в консоли тоже нет — потому что ни одна промис-цепочка не отклонилась, приложение просто «висит» в состоянии ожидания.

---

## 3. Почему «выход/вход» не помогал, а жёсткая перезагрузка — да

| Попытка | Почему не сработало |
|---|---|
| «Выйти и зайти» | Вкладка возвращалась из bfcache/старого состояния в том же «замороженном» JS-процессе: код, который должен был перенаправить на логин, не выполнялся, потому что промис проверки сессии завис |
| Ручное удаление токенов | Без перезагрузки JS не перезапускается — Redux-состояние (`isLoading=true`, `isInitialChecked=false`) остаётся замороженным в памяти |
| **Принудительная перезагрузка** | Полный рестарт JS: токены к тому моменту уже очищены `clearTokens()` → `hasToken=false` → проверка сессии не запускается → `ProtectedRoute` честно показывает `/login` → новый вход выдаёт свежие токены → всё работает |

---

## 4. Точные ссылки на код

| Файл | Строки | Что там |
|---|---|---|
| `src/utils/api.ts` | 81–88 | очередь `refreshSubscribers`, `subscribeTokenRefresh` |
| `src/utils/api.ts` | 90–95 | `onRefreshed` — резолв очереди при успехе |
| `src/utils/api.ts` | 140–149 | `else` ветка при неудачном refresh — **выброс очереди** |
| `src/utils/api.ts` | 150–154 | `catch` при ошибке сети refresh — **выброс очереди** |
| `src/utils/api.ts` | 155–167 | зависший `new Promise` (apiFetch) |
| `src/utils/api.ts` | 224–238 | то же самое в `apiFetchBinary` (аватар) |
| `src/utils/api.ts` | 239–249 | зависший `new Promise` (apiFetchBinary) |
| `src/features/auth/authSlice.ts` | 79–93 | `fetchMeAsync` |
| `src/features/auth/authSlice.ts` | 421–437 | pending/fulfilled/rejected для fetchMe |
| `src/features/auth/components/ProtectedRoute.tsx` | 12–20 | вечный спиннер при `!isInitialChecked && isLoading` |
| `src/App.tsx` | 35–40 | запуск `fetchMeAsync` при монтировании |

---

## 5. Что было исключено (сервер, БД, сеть — не виноваты)

Проверка 12.08.2026 с той же машины, тем же сетевым путём, что и браузер пользователя:

| Проверка | Результат |
|---|---|
| `/health`, `/`, статика, `OPTIONS`-preflight | 200/204 за 0.2–0.5с |
| Админ-API (запросы к БД: список пользователей, проектов, карточка) | 200 за ~0.2с |
| БД прода | жива: 1 пользователь, 2 проекта, профиль, адрес, аватар |
| `POST /auth/login`, `POST /auth/refresh` (невалидный токен) | 401 за ~0.2с |
| Точные браузерные запросы: `PUT /me/address`, `GET /projects` с `Origin: sng-fuenex`, `Authorization`, `Sec-Fetch-*`, `Accept-Encoding: br` | 401 за ~0.2с, HTTP/1.1 и HTTP/2 |
| Задеплоенный бандл | `index-Bppu9K36.js` — совпадает с текущей сборкой |
| Service worker | отсутствует |

Вывод: сеть, nginx, Go, БД, CORS, HTTP/2 — здоровы. Единственное отличие «зависшего» браузера от `curl` — состояние JS-приложения вкладки.

---

## 6. Вторичный дефект: нет Cache-Control у SPA

`web/nginx.conf` не задаёт `Cache-Control` вовсе (проверено: `index.html` отдаётся только с `Last-Modified`/`ETag`). Это значит:

- браузер сам вычисляет эвристическую свежесть `index.html` — после деплоя он может какое-то время держать **старый HTML со старым бандлом**;
- старый бандл + замороженное состояние = инцидент «лечится» только жёсткой перезагрузкой.

Хешированные ассеты (`/assets/index-*.js|css`) при этом можно кэшировать бессрочно — они иммутабельны.

---

## 7. План фикса

### 7.1 Корень — `src/utils/api.ts` (обязательно)

1. Очередь хранит пару `{ resolve, reject }` вместо одного успешного колбэка.
2. При неудачном refresh: вызвать `reject` у всех ожидающих, очистить токены, **полный редирект на `/login`** (`window.location.assign("/login")`) — гарантирует сброс Redux-состояния, чтобы заморозка не могла пережить перезагрузку страницы.
3. Применить к обоим местам: `apiFetch` (строки 140–154, 155–167) и `apiFetchBinary` (224–238, 239–249).

Пример формы исправления:

```ts
// вместо refreshSubscribers: ((token: string) => void)[]
let refreshSubscribers: { resolve: (t: string) => void; reject: () => void }[] = []

const subscribeTokenRefresh = (
  onSuccess: (t: string) => void,
  onFailure: () => void,
) => {
  refreshSubscribers.push({ resolve: onSuccess, reject: onFailure })
}

// в ветках «refresh не удался» и catch:
isRefreshing = false
clearTokens()
for (const s of refreshSubscribers) s.reject()
refreshSubscribers = []
window.location.assign("/login")   // полный рестарт приложения
```

Зависший промис при этом отклоняется → `fetchMeAsync.rejected` (`authSlice.ts:430-437`) → `isInitialChecked = true`, `isAuthenticated = false` → `ProtectedRoute` сам отправит на `/login`. Редирект через `window.location` — страховка на случай, если запрос завис вне проверки сессии (например, вкладка сметы).

### 7.2 Кэш — `web/nginx.conf` (желательно)

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # index.html всегда перепроверяется — после деплоя браузер
    # обязан увидеть новые хеши бандлов.
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # Хешированные ассеты иммутабельны — кэшировать без перезапроса.
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri /index.html;
    }
}
```

---

## 8. Как проверить фикс и предотвратить регрессию

1. **Ручная проверка:** зайти в приложение → в DevTools → Application → Local Storage протухнуть/удалить access-токен, оставить валидный refresh... нет: протухнуть **оба** → перезагрузить страницу → вместо вечного спиннера должно появиться `redirect` на `/login` (в Network видно навигацию на `/login`, ошибок нет).
2. **Тот же сценарий с refresh-токеном, который сервер отвергает** (секреты ротированы, сессия отозвана) — приложение должно за 1–2 секунды показать экран логина, а не висеть.
3. **Регрессионный тест** (опционально, vitest + jsdom уже настроены): юнит-тест на `apiFetch` — mock `fetch`: 401 + неудачный refresh → промис отклоняется, `clearTokens` вызван.
4. **Кэш:** после деплоя новой сборки проверить заголовки: `index.html` → `Cache-Control: no-cache`; `/assets/index-*.js` → `immutable`.
