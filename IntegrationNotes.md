# Integration Notes for businessclub

## Overview

Business Club is a UK-focused professional membership platform. Members can:

- Create secure accounts and sign in.
- Maintain personal and business profiles.
- Browse an authenticated member directory.
- Discover upcoming UK networking events.
- Register for or cancel event attendance.
- View registrations and membership information from a dashboard.
- Administer events when assigned the `admin` role.

The application consists of two separate Node.js processes:

1. A Next.js App Router frontend served from `https://businessclub.geo-drops.com`.
2. An Express HTTPS API served from `https://businessclub-api.geo-drops.com`.

MySQL provides application persistence and database-backed session storage through `mysql2/promise`. Authentication uses `express-session`, secure cookies, and bcrypt password hashing.

The frontend API URL is fixed in `lib/api.js`, while the backend CORS policy and session-cookie configuration are designed for the production `geo-drops.com` domains.

## Prerequisites

Install or provision the following before deployment:

- Node.js with npm. Use a current supported LTS release.
- MySQL 8 or a compatible MySQL server with `utf8mb4` support.
- A MySQL database and application user with permission to read and modify the application tables.
- DNS records for:
  - `businessclub.geo-drops.com`
  - `businessclub-api.geo-drops.com`
- A reverse proxy or hosting configuration that exposes the Next.js frontend on standard HTTPS port 443.
- Administrator-supplied TLS certificate files for the Express API:
  - `/home/arx-app/backends/businessclub/certs/certificate.crt`
  - `/home/arx-app/backends/businessclub/certs/private.key`
- PM2 for the supplied production frontend configuration, if PM2 is used:
  ```bash
  npm install --global pm2
  ```

The deployment directory expected by `ecosystem.config.js` and the backend certificate configuration is:

```text
/home/arx-app/backends/businessclub
```

Ensure the Node.js process can read the certificate files but restrict the private key from other users. Certificate files and environment files must not be committed to source control.

## Installation

### 1. Place the project in the expected directory

```bash
mkdir -p /home/arx-app/backends/businessclub
cd /home/arx-app/backends/businessclub
```

Copy or clone the application files into this directory.

### 2. Install Node.js dependencies

From the project root:

```bash
npm install
```

The dependencies defined in `package.json` include Next.js, React, Express, CORS, dotenv, `mysql2`, `express-session`, and bcrypt.

For a reproducible production installation when a lockfile is present, use:

```bash
npm ci
```

### 3. Create the environment file

Copy the supplied example:

```bash
cp .env.example .env
```

Edit `.env` and replace every placeholder, especially `DB_PASSWORD` and `SESSION_SECRET`.

Protect the file:

```bash
chmod 600 .env
```

### 4. Create the MySQL database and user

Connect as a MySQL administrator:

```bash
mysql -u root -p
```

Create the database and application user, substituting a strong password:

```sql
CREATE DATABASE businessclub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'businessclub_user'@'127.0.0.1'
  IDENTIFIED BY 'your-secret-database-password';

GRANT ALL PRIVILEGES ON businessclub.*
  TO 'businessclub_user'@'127.0.0.1';

FLUSH PRIVILEGES;
```

The host portion of the MySQL account must match how the backend connects. If `DB_HOST` points to another host or uses a different connection identity, adjust the account definition accordingly.

### 5. Import the schema

The root-level `schema.sql` creates the following tables:

- `users`
- `events`
- `event_registrations`
- `sessions`

It also creates indexes, foreign keys, uniqueness constraints, timestamps, membership and role fields, and initial UK networking event records.

Import it with the application credentials:

```bash
mysql \
  -h 127.0.0.1 \
  -u businessclub_user \
  -p \
  businessclub < schema.sql
```

Enter the MySQL password when prompted.

To confirm that the tables were created:

```bash
mysql \
  -h 127.0.0.1 \
  -u businessclub_user \
  -p \
  -e "SHOW TABLES;" businessclub
```

Do not remove the `sessions` table. Express authentication sessions are persisted there by `server/config/mysqlSessionStore.js`.

### 6. Install the API certificate files

Create the certificate directory if necessary:

```bash
mkdir -p /home/arx-app/backends/businessclub/certs
```

Place the administrator-supplied files at:

```text
/home/arx-app/backends/businessclub/certs/certificate.crt
/home/arx-app/backends/businessclub/certs/private.key
```

Apply restrictive permissions, adapting ownership to the deployment account:

```bash
chmod 644 /home/arx-app/backends/businessclub/certs/certificate.crt
chmod 600 /home/arx-app/backends/businessclub/certs/private.key
```

`server/index.js` starts an HTTPS server directly and will not start successfully if either certificate file is missing, unreadable, or invalid.

## Environment Variables

Define all variables in `/home/arx-app/backends/businessclub/.env`.

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment used to enable production security and error-handling behaviour. Set this to `production` in deployment so secure cookie, domain, and error-hiding behaviour is applied. | `production` |
| `PORT` | Port used by the production Next.js frontend process. The supplied npm and PM2 configuration uses port `4000`. | `4000` |
| `BACKEND_PORT` | HTTPS port on which the Express backend listens. This is normally exposed through the API domain or a reverse proxy. | `4443` |
| `DB_HOST` | Hostname or IP address of the MySQL server. | `127.0.0.1` |
| `DB_USER` | MySQL user with access to the application database. | `businessclub_user` |
| `DB_PASSWORD` | Password for the MySQL application user. Use a strong secret and do not commit it. | `your-secret-database-password` |
| `DB_NAME` | Name of the MySQL database containing the users, events, registrations, and sessions tables. | `businessclub` |
| `SESSION_SECRET` | Long, cryptographically random secret used to sign Express session cookies. Existing sessions may become invalid if it changes. | `replace-with-a-long-random-secret` |

A production `.env` may resemble:

```dotenv
NODE_ENV=production
PORT=4000
BACKEND_PORT=4443
DB_HOST=127.0.0.1
DB_USER=businessclub_user
DB_PASSWORD=replace-with-a-strong-password
DB_NAME=businessclub
SESSION_SECRET=replace-with-a-long-random-secret
```

Generate a session secret rather than using the example:

```bash
openssl rand -base64 48
```

## Running the Application

### Development startup

The frontend and backend are separate processes. The project intentionally does not use `concurrently`, so open two terminals in the project root.

Start the Next.js development server:

```bash
npm run dev
```

This runs:

```bash
next dev -p 4000
```

In a second terminal, start the Express HTTPS backend:

```bash
npm run server
```

This runs:

```bash
node server/index.js
```

Before accepting requests, the backend verifies MySQL connectivity through `server/config/db.js`. It then listens over HTTPS on `BACKEND_PORT`.

Because `lib/api.js` uses the fixed URL `https://businessclub-api.geo-drops.com`, and backend CORS permits `https://businessclub.geo-drops.com`, a plain `http://localhost:4000` browser session is not a complete local integration environment without DNS, TLS, and domain-aware development configuration. For end-to-end testing, use the configured hostnames with valid HTTPS certificates, or deliberately adapt the API URL, CORS allowlist, and cookie settings for local development.

### Production build

Build the Next.js frontend from the project root:

```bash
npm run build
```

This runs `next build` and writes the production output to:

```text
.next/
```

The `.next` directory is generated and should not be committed.

Start the built frontend:

```bash
npm start
```

This runs:

```bash
next start -p 4000
```

Start the backend separately:

```bash
npm run server
```

Both processes must remain running. The Next.js frontend does not automatically start the Express backend.

### PM2 frontend startup

The supplied `ecosystem.config.js` is a CommonJS PM2 configuration for the frontend. It starts:

```text
node_modules/.bin/next start
```

with:

- Application name: `businessclub`
- Working directory: `/home/arx-app/backends/businessclub`
- Production port: `4000`

Build before starting PM2:

```bash
cd /home/arx-app/backends/businessclub
npm ci
npm run build
pm2 start ecosystem.config.js
pm2 save
```

Check the frontend process:

```bash
pm2 status
pm2 logs businessclub
```

The backend must still be managed as a separate process. For example:

```bash
cd /home/arx-app/backends/businessclub
pm2 start server/index.js \
  --name businessclub-api \
  --cwd /home/arx-app/backends/businessclub
pm2 save
```

Check backend logs with:

```bash
pm2 logs businessclub-api
```

Ensure PM2 receives or can load the production `.env`. `server/index.js` loads it through dotenv. The frontend PM2 configuration supplies production `PORT=4000`; any build-time public configuration changes require rebuilding Next.js.

To restore PM2 processes after a server restart:

```bash
pm2 startup
```

Run the command PM2 prints, then save the process list again:

```bash
pm2 save
```

### Production addresses

The intended public addresses are:

- Frontend: `https://businessclub.geo-drops.com`
- API: `https://businessclub-api.geo-drops.com`

The backend itself listens on the configured `BACKEND_PORT`, typically `4443`. Configure DNS, firewall rules, and any reverse proxy so the API domain reaches that HTTPS service.

A reverse proxy for the frontend should forward requests to:

```text
127.0.0.1:4000
```

If terminating TLS at a proxy, preserve forwarding headers. The Express application enables trust-proxy handling for secure sessions.

### Health check

Verify backend availability:

```bash
curl https://businessclub-api.geo-drops.com/health
```

The exact successful response is:

```json
{"status":"ok"}
```

For a direct test against the backend port:

```bash
curl https://127.0.0.1:4443/health
```

Direct IP testing may require a hostname override or certificate-specific curl options because the TLS certificate will normally be issued to `businessclub-api.geo-drops.com`.

### API endpoints

The main routes mounted by `server/index.js` are:

#### Authentication

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

#### Members

- `GET /members`
- `GET /members/:id`
- `PUT /members/me`

Member routes require an authenticated session. Directory responses exclude private fields such as email addresses and password hashes.

#### Events

- `GET /events`
- `GET /events/my-registrations`
- `POST /events/:id/register`
- `DELETE /events/:id/register`
- `POST /events`
- `PUT /events/:id`
- `DELETE /events/:id`

Event listing is public. Registration routes require authentication, while event creation, modification, and deletion require an authenticated administrator.

### Session-cookie requirements

The browser must accept secure cookies for authentication to work.

`lib/api.js` sends API requests with credentials included. The Express backend uses credentialed CORS and database-backed sessions. In production:

- The frontend origin must be exactly `https://businessclub.geo-drops.com`.
- The API must be available at `https://businessclub-api.geo-drops.com`.
- HTTPS must be valid for both hostnames.
- The API cannot use a wildcard CORS origin when credentials are enabled.
- Cookies are HTTP-only and secure.
- Cookie domain and same-site settings are configured for the `geo-drops.com` deployment.
- Reverse proxies must preserve the original protocol and forwarding headers.
- The `sessions` MySQL table must remain writable.
- `SESSION_SECRET` must remain stable across backend restarts and backend instances.

Use a cookie jar when testing authenticated API flows with curl:

```bash
curl \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"member@example.com","password":"your-password"}' \
  https://businessclub-api.geo-drops.com/auth/login
```

Then reuse the cookie:

```bash
curl \
  -b cookies.txt \
  https://businessclub-api.geo-drops.com/auth/me
```

Browser requests must originate from the permitted frontend origin; curl does not enforce browser CORS rules.

## Project Structure

```text
businessclub/
├── app/
│   ├── dashboard/page.jsx
│   ├── events/page.jsx
│   ├── login/page.jsx
│   ├── members/page.jsx
│   ├── profile/page.jsx
│   ├── signup/page.jsx
│   ├── globals.css
│   ├── layout.jsx
│   └── page.jsx
├── components/
│   ├── AuthForm.jsx
│   ├── AuthProvider.jsx
│   ├── DashboardView.jsx
│   ├── EventList.jsx
│   ├── Footer.jsx
│   ├── Header.jsx
│   ├── MemberDirectory.jsx
│   └── ProfileForm.jsx
├── lib/
│   └── api.js
├── server/
│   ├── config/
│   │   ├── db.js
│   │   ├── mysqlSessionStore.js
│   │   └── session.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── eventController.js
│   │   └── memberController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── eventRoutes.js
│   │   └── memberRoutes.js
│   └── index.js
├── certs/
│   ├── certificate.crt
│   └── private.key
├── .env.example
├── .gitignore
├── ecosystem.config.js
├── next.config.js
├── package.json
├── README.md
└── schema.sql
```

Key locations:

- `app/`: Next.js App Router pages, metadata, root layout, and global styles.
- `app/layout.jsx`: Defines global metadata, the canonical frontend URL, authentication context, shared header, main content, and footer.
- `components/`: Client-side authentication, forms, protected views, member directory, and event-management interfaces.
- `lib/api.js`: Defines the fixed API base URL, credentialed JSON request helper, and normalized API errors.
- `server/index.js`: Express entry point, HTTPS startup, CORS, session middleware, route mounting, health endpoint, and MySQL startup check.
- `server/config/db.js`: Shared `mysql2/promise` connection pool.
- `server/config/mysqlSessionStore.js`: Express-compatible MySQL session store with expiration cleanup.
- `server/config/session.js`: Secure cookie and database-backed session configuration.
- `server/controllers/`: Authentication, member, and event business logic.
- `server/routes/`: HTTP route definitions and authentication or administrator authorization boundaries.
- `server/middleware/`: Authentication guards and safe JSON error handling.
- `schema.sql`: MySQL schema and initial UK event data.
- `ecosystem.config.js`: PM2 configuration for the production Next.js frontend.
- `next.config.js`: Next.js strict-mode and standard `.next` production build configuration.
- `.env.example`: Safe template for all required runtime settings.
- `certs/`: Deployment-supplied TLS assets; these files must remain untracked.
- `README.md`: General project, API, deployment, and startup documentation.

## Next Steps / Production Considerations

1. **Confirm DNS and TLS**
   - Point both production hostnames to the deployment infrastructure.
   - Install valid, renewable certificates.
   - Monitor certificate expiration.
   - Keep `private.key` readable only by the backend service account.

2. **Configure the reverse proxy**
   - Route the frontend domain to port `4000`.
   - Route the API domain to the Express HTTPS service on `BACKEND_PORT`.
   - Preserve `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
   - Apply sensible request-body and timeout limits.

3. **Secure MySQL**
   - Use a dedicated least-privilege user.
   - Restrict network access to trusted application hosts.
   - Enable encrypted database transport when MySQL is remote.
   - Back up `users`, `events`, `event_registrations`, and `sessions`.
   - Test schema and backup restoration procedures before launch.

4. **Protect secrets**
   - Never commit `.env`, database credentials, session secrets, or certificate files.
   - Use a deployment secret manager where possible.
   - Rotate database passwords and TLS keys through a documented process.
   - Plan session invalidation when rotating `SESSION_SECRET`.

5. **Create administrators deliberately**
   - New accounts should not receive administrator rights by default.
   - Assign the `admin` role only through a controlled database or administrative process.
   - Audit administrator event creation, updates, and deletion.

6. **Validate session behaviour**
   - Test login, logout, session expiry, and cookie clearing through the production domains.
   - Confirm cookies are marked `Secure` and `HttpOnly`.
   - Confirm cross-origin credentialed requests succeed only from the intended frontend origin.
   - If multiple backend instances are deployed, point all instances to the same MySQL sessions table and use the same `SESSION_SECRET`.

7. **Add operational monitoring**
   - Monitor `/health`, process uptime, memory, CPU, MySQL connectivity, and HTTP error rates.
   - Configure PM2 log rotation:
     ```bash
     pm2 install pm2-logrotate
     ```
   - Avoid exposing stack traces, SQL statements, secrets, or certificate details in production logs.

8. **Apply deployment updates safely**
   - Back up MySQL before schema changes.
   - Install locked dependencies with `npm ci`.
   - Rebuild the frontend after source changes:
     ```bash
     npm run build
     pm2 restart businessclub
     ```
   - Restart the API after backend or environment changes:
     ```bash
     pm2 restart businessclub-api
     ```

9. **Review scalability**
   - The MySQL session store supports shared sessions across multiple backend processes.
   - Validate transaction behaviour and capacity enforcement under concurrent event registrations.
   - Tune the MySQL pool and infrastructure only after collecting production load metrics.

10. **Run final acceptance tests**
    - Account signup and duplicate-email rejection.
    - Login with valid and invalid credentials.
    - Logout and session invalidation.
    - Protected-route redirects.
    - Profile editing and website validation.
    - Directory privacy and filtering.
    - Event listing and UK date formatting.
    - Registration, cancellation, duplicate prevention, and capacity limits.
    - Administrator authorization.
    - JSON 404 and production error responses.
    - Frontend accessibility, responsive layout, keyboard focus, and mobile navigation.

## Database Provisioning

A mysql database has been automatically provisioned for this app.

- **Database:** businessclub
- **Host:** testdb.gridiron-app.com
- **Port:** 3306
- **User:** businessclub
- **Credentials stored in Vault at:** `secret/data/mysql/businessclub`

Retrieve the password securely from Vault and set it as an environment variable (e.g. `DB_PASSWORD`) in your deployment settings — do not commit it to source control.
