// Центральный источник адреса API — используется всеми запросами
// приложения (api.ts → apiFetch / apiFetchBinary → сюда).
//
// ВАЖНО про VITE_API_BASE_URL: Vite подставляет `import.meta.env.*` в
// момент СБОРКИ (vite dev / npm run build). Переменная, выставленная в
// рантайме на VPS (окружение контейнера, docker-compose environment,
// systemd), в готовый бандл НЕ попадает — значение уже вшито в JS при
// сборке. Поэтому адрес резолвится так (приоритет сверху вниз):
//
//   1. window.__API_BASE_URL__ — рантайм-оверрайд с VPS без пересборки
//      (nginx подставляет скрипт в index.html, см. web/README.md);
//   2. VITE_API_BASE_URL — если задан при сборке (--build-arg, CI,
//      .env) — работает и в dev, и в prod;
//   3. dev: http://localhost:8089 (совпадает с proxy в vite.config.ts);
//      prod: карта hostname → API (ниже);
//   4. "" — same-origin запросы (nginx проксирует /api).

const DEV_DEFAULT_API = "http://localhost:8089"

// Прод-домены фронтенда → адрес API. Единственное место, где живёт
// связка «страница → API»; новый домен добавляется здесь же.
const PROD_API_BY_HOSTNAME: Record<string, string> = {
  "sng-fuenex.shk.solutions": "https://stroylit.shk.solutions",
}

function resolveApiBaseUrl(): string {
  // 1. Рантайм-оверрайд — даёт менять адрес на VPS без пересборки.
  const runtime = (window as Window & { __API_BASE_URL__?: string }).__API_BASE_URL__
  if (typeof runtime === "string" && runtime !== "") {
    return runtime
  }

  // 2. Заданная при сборке переменная (dev и prod).
  const buildTime = import.meta.env.VITE_API_BASE_URL
  if (buildTime) {
    return buildTime
  }

  // 3. Дефолты по окружению.
  if (import.meta.env.DEV) {
    return DEV_DEFAULT_API
  }
  return PROD_API_BY_HOSTNAME[window.location.hostname] ?? ""
}

// Базовый URL API; "" означает same-origin. Хвостовой слеш убирается,
// чтобы склейка ниже не давала "https://api.example.com//api/v1/...".
export const apiBaseUrl = resolveApiBaseUrl().replace(/\/+$/, "")

// Склеивает путь эндпоинта ("/api/v1/me") с базовым адресом API.
export const buildApiUrl = (path: string): string => `${apiBaseUrl}${path}`
