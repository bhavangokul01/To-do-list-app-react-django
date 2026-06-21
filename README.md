# TaskZero

A full-stack task management app — built and deployed end-to-end as three separate services.

Live: [taskzeroio.vercel.app](https://taskzeroio.vercel.app)

## What it does

TaskZero is a task manager with per-user accounts. Every user's tasks are private and isolated at the database query level — not just hidden in the UI. Create, edit, complete, filter, and delete tasks through a clean, dark-mode-first interface.

## Stack

- **Frontend:** React + Vite, deployed on Vercel
- **Backend:** Django REST Framework, deployed on Render
- **Database:** PostgreSQL, hosted on Render
- **Auth:** Django session authentication with CSRF protection

## A technical note: cross-domain auth

The frontend and backend live on completely different domains (`vercel.app` and `onrender.com`), which makes this a real cross-site setup rather than a same-origin app. That breaks a few things tutorials don't usually cover:

- Cookies don't cross domains without explicit `SameSite=None; Secure` configuration
- CORS has to whitelist the exact frontend origin
- The CSRF cookie Django sets lives on the backend's domain — JavaScript on the frontend can't read it directly via `document.cookie`, since cookies are scoped per-origin. Instead, the frontend fetches the token from a small JSON endpoint and attaches it as a header (`X-CSRFToken`) on every mutating request
- Django rotates the CSRF token when a session changes, so the token is re-fetched right after login to stay in sync

Working through this end-to-end — not just disabling CSRF checks to make errors go away — was the most useful part of building this project.

## Project structure

```
TaskZero/
├── Backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── to_do_list_project/   # settings, urls, wsgi/asgi
│   └── to_do_list_app/       # models, views, serializers, auth
└── Frontend/
    ├── src/
    ├── package.json
    └── vite.config.js
```

## Running it locally

Feel free to use any part of this for your own projects — the CORS/CSRF setup in particular is reusable for anyone deploying a Django + React app across separate domains.

### Backend

```bash
cd Backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

Create a `.env` file in `Backend/to_do_list_project/`:

```
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=                  # leave blank to use local SQLite
```

```bash
python manage.py migrate
python manage.py runserver
```

Backend runs at `http://localhost:8000`.

### Frontend

```bash
cd Frontend
npm install
```

Create a `.env` file in `Frontend/`:

```
VITE_API_URL=http://localhost:8000/api
```

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Notes for cross-domain deployment

If you deploy frontend and backend on different domains, make sure to update in `settings.py`:

- `CORS_ALLOWED_ORIGINS` — your frontend's deployed URL
- `CSRF_TRUSTED_ORIGINS` — same
- `SESSION_COOKIE_SAMESITE` / `CSRF_COOKIE_SAMESITE` — set to `'None'`
- `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` — set to `True` (requires HTTPS)

And confirm `django.middleware.csrf.CsrfViewMiddleware` is present in `MIDDLEWARE` — without it, CSRF cookies won't be issued or validated at all.

## License

Free to use, modify, and learn from.
