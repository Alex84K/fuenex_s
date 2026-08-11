# vite-template-redux

Uses [Vite](https://vitejs.dev/), [Vitest](https://vitest.dev/), and [React Testing Library](https://github.com/testing-library/react-testing-library) to create a modern [React](https://react.dev/) app compatible with [Create React App](https://create-react-app.dev/)

```sh
npx tiged reduxjs/redux-templates/packages/vite-template-redux my-app
```

## Goals

- Easy migration from Create React App or Vite
- As beginner friendly as Create React App
- Optimized performance compared to Create React App
- Customizable without ejecting

## Scripts

- `dev`/`start` - start dev server and open browser
- `build` - build for production
- `preview` - locally preview production build
- `test` - launch test runner

## API base URL (`apiConfig.ts`)

Единственный источник адреса API — `src/utils/apiConfig.ts`, его использует весь слой запросов
(`apiFetch` / `apiFetchBinary` в `src/utils/api.ts`). Порядок резолва (приоритет сверху вниз):

1. `window.__API_BASE_URL__` — рантайм-оверрайд с VPS **без пересборки** (см. ниже);
2. `VITE_API_BASE_URL` — заданный **при сборке**;
3. dev: `http://localhost:8089` (proxy в `vite.config.ts`); prod: карта hostname → API в
   `apiConfig.ts`;
4. `""` — same-origin запросы.

**Про `VITE_API_BASE_URL` на VPS — будет ли прочитана?** Нет, если выставлена в рантайме
(окружение контейнера, `docker-compose environment`, systemd): Vite подставляет
`import.meta.env.*` в момент `npm run build`, в готовом бандле рантайм-переменных VPS нет.
Прочитана она будет только если задана при **сборке** — `--build-arg` в Dockerfile
(пробрасывается из `docker-compose.yml`), переменная репозитория GitHub `VITE_API_BASE_URL` в
`.github/workflows/docker-image.yml`, или `.env` рядом с проектом.

**Рантайм-оверрайд без пересборки.** Чтобы менять адрес API прямо на VPS, nginx перед отдачей
`index.html` подставляет скрипт с глобальной переменной. В `web/nginx.conf`:

```nginx
location / {
    sub_filter_once on;
    sub_filter '</head>' '<script>window.__API_BASE_URL__ = "https://fuenex-go.shk.solutions";</script></head>';
}
```

(или просто смонтировать в контейнер файл `config.js`, подключаемый в `index.html`).
`apiConfig.ts` читает эту переменную первым делом.

Сервер должен разрешать origin страницы в `CORS_ALLOWED_ORIGINS` (см. README в `server_go/`).
Мобильный клиент (Swift) настраивать не нужно: нативные приложения не используют CORS — они
вызывают API напрямую (`https://fuenex-go.shk.solutions/api/v1/...` с Bearer-токеном).

## Inspiration

- [Create React App](https://github.com/facebook/create-react-app/tree/main/packages/cra-template)
- [Vite](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react)
- [Vitest](https://github.com/vitest-dev/vitest/tree/main/examples/react-testing-lib)
