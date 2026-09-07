# UK Business Club

A UK-focused membership platform for professionals to create business profiles, discover fellow members, and register for networking events.

The application consists of two separate processes:

- A Next.js App Router frontend
- An Express HTTPS API backed by MySQL

Authentication uses secure, database-backed sessions.

## Production URLs

- Frontend: https://businessclub.geo-drops.com
- API: https://businessclub-api.geo-drops.com:5067
- Health check: https://businessclub-api.geo-drops.com:5067/health

The frontend API client is configured to use the production API URL directly.

## Prerequisites

Install the following before setting up the application:

- Node.js 18.18 or newer; Node.js 20 LTS is recommended
- npm
- MySQL 8 or a compatible MySQL server
- A MySQL user with permission to create and modify tables in the application database
- TLS certificate and private-key files for the Express HTTPS server
- PM2 for production process management
- A reverse proxy or load balancer for the production Next.js service
- DNS records for both production hostnames

Install PM2 globally if it is not already available:

```bash
npm install --global pm2
```

## Installation

From the project root:

```bash
npm install
```

A single dependency installation provides the packages required by both the frontend and backend.

The frontend and backend must be started as separate processes. The project does not use `concurrently`.

## Environment Configuration

Copy the supplied example file:

```bash
cp .env.example .env
```

Set every variable in `.env` before starting the backend or creating a production deployment.

| Variable | Used by | Description |
| --- | --- | --- |
| `NODE_ENV` | Frontend and backend | Runtime mode. Production mode enables production security and reduced error detail. |
| `PORT` | Frontend | Port used by the production Next.js process. The supplied production configuration uses port 4000. |
| `BACKEND_PORT` | Backend | HTTPS port on which the Express API listens. It must be available to the service account and exposed or proxied for the API hostname. |
| `DB_HOST` | Backend | Hostname or network address of the MySQL server. |
| `DB_USER` | Backend | MySQL account used by the application. |
| `DB_PASSWORD` | Backend | Password for the MySQL application account. |
| `DB_NAME` | Backend | Existing MySQL database into which `schema.sql` is imported. |
| `SESSION_SECRET` | Backend | Long, cryptographically random secret used to sign session cookies. Changing it invalidates existing signed sessions. |

There is no runtime `NEXT_PUBLIC_API_URL` setting. `lib/api.js` intentionally uses:

```text
https://businessclub-api.geo-drops.com:5067
```

Do not commit `.env`, certificates, private keys, database passwords, or session secrets.

## MySQL Setup

Create the database named by `DB_NAME` and grant the account named by `DB_USER` access to it.

Import the schema from the project root. If the database variables have been exported into the current shell, use:

```bash
mysql --host="${DB_HOST}" --user="${DB_USER}" -p --database="${DB_NAME}" < schema.sql
```

Enter the database password when prompted.

The schema creates:

- `users`
- `events`
- `event_registrations`
- `sessions`

It also creates the required primary keys, unique constraints, foreign keys, indexes, timestamps, role and membership fields, and initial UK networking event records.

The `sessions` table is required. Authentication will not work correctly without it because session state is persisted in MySQL rather than process memory.

Run the schema import before starting the backend. Ensure the application MySQL user can select, insert, update, and delete records in all four tables.

## HTTPS Certificates

The Express backend always loads its administrator-supplied TLS files from these exact paths:

```text
/home/arx-app/backends/businessclub/certs/certificate.crt
/home/arx-app/backends/businessclub/certs/private.key
```

Create the directory and install the files before starting the API:

```bash
sudo mkdir -p /home/arx-app/backends/businessclub/certs
```

The files must be readable by the operating-system account running the backend. Restrict private-key access appropriately:

```bash
sudo chmod 644 /home/arx-app/backends/businessclub/certs/certificate.crt
sudo chmod 600 /home/arx-app/backends/businessclub/certs/private.key
```

Set ownership to the actual backend service account. Never commit either file. The repository ignore rules exclude administrator-supplied certificate files.

The certificate presented by the production API must be valid for `businessclub-api.geo-drops.com`.

Because the certificate paths are fixed, a local backend process also requires readable files at those paths.

## Development Startup

### Start the backend

Open one terminal in the project root:

```bash
npm run server
```

This runs:

```bash
node server/index.js
```

The API starts as an HTTPS server on `BACKEND_PORT`. Startup verifies MySQL connectivity before listening. A missing certificate, inaccessible private key, invalid database configuration, or failed MySQL connection prevents normal startup.

Check the API directly:

```bash
curl https://businessclub-api.geo-drops.com:5067/health
```

A healthy service returns exactly:

```json
{"status":"ok"}
```

### Start the frontend

Open a second terminal in the same project root:

```bash
npm run dev
```

This runs the Next.js development server on port 4000:

```text
http://localhost:4000
```

The browser frontend still sends API requests to `https://businessclub-api.geo-drops.com:5067`. The backend CORS policy accepts credentialed browser requests only from:

```text
https://businessclub.geo-drops.com
```

Consequently, complete browser-based authentication testing requires the production hostnames, HTTPS, and the expected origin configuration. Direct API health checks can still be performed independently.

## Production Build

Create the optimized Next.js build:

```bash
npm run build
```

The generated production output is written to:

```text
.next/
```

The `.next` directory is generated and must not be committed. Rebuild it after frontend source changes or dependency changes.

Start the built frontend manually with:

```bash
npm run start
```

This starts Next.js on port 4000.

Start the backend separately:

```bash
npm run server
```

Starting the frontend does not start the API, and starting the API does not start the frontend.

## PM2 Deployment

The supplied `ecosystem.config.js` manages the production frontend using:

- Application name: `businessclub`
- Executable: `node_modules/.bin/next`
- Arguments: `start`
- Working directory: `/home/arx-app/backends/businessclub`
- Production port: `4000`

Deploy the repository at:

```text
/home/arx-app/backends/businessclub
```

Install dependencies and build the frontend before starting PM2:

```bash
cd /home/arx-app/backends/businessclub
npm install
npm run build
pm2 start ecosystem.config.js
```

The ecosystem file starts only the Next.js frontend. Start the backend as a separate PM2 process:

```bash
cd /home/arx-app/backends/businessclub
pm2 start server/index.js --name businessclub-api
```

Persist the process list:

```bash
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs businessclub
pm2 logs businessclub-api
pm2 restart businessclub
pm2 restart businessclub-api
pm2 reload businessclub
```

After rebuilding the frontend, reload its PM2 process:

```bash
npm run build
pm2 reload businessclub
```

Configure PM2 startup integration for the deployment operating system using the command produced by:

```bash
pm2 startup
```

The Next.js process listens on port 4000 and should be exposed as `https://businessclub.geo-drops.com` through the production reverse proxy. The backend is an HTTPS server and should be routed to `https://businessclub-api.geo-drops.com`.

## Session and Cookie Requirements

Authentication depends on browser cookies and MySQL-backed sessions.

The frontend request helper sends:

```text
credentials: include
```

The API session cookie is configured with production security settings, including:

- `HttpOnly`
- `Secure`
- A cross-origin-compatible `SameSite` setting
- A production cookie domain appropriate for `geo-drops.com`
- A defined expiration period
- Signed-cookie protection through `SESSION_SECRET`

For authentication to work:

1. Both production hostnames must use HTTPS.
2. The frontend origin must be exactly `https://businessclub.geo-drops.com`.
3. The API must be reached at `https://businessclub-api.geo-drops.com`.
4. Browser cookies must be accepted for the site.
5. Requests must include credentials.
6. The API CORS response must allow the exact frontend origin and credentials.
7. The `sessions` table must exist and be writable.
8. `SESSION_SECRET` must remain stable across backend restarts and backend instances.
9. Backend instances must share the same MySQL sessions table and session secret.
10. Proxy forwarding information must be preserved because the Express server uses trust-proxy behaviour for secure deployments.

Login and signup regenerate the session to protect against session fixation. Logout destroys the database-backed session and clears the browser cookie.

## API

The API uses JSON request and response bodies. Unless noted otherwise, protected endpoints return HTTP `401` when no authenticated session is available. Administrator endpoints return HTTP `403` when the current member does not have the `admin` role.

### Health

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Verify that the API process is running. Returns exactly `{ "status": "ok" }`. |

### Authentication

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | Public | Create a member account, hash the password, and establish a session. |
| `POST` | `/auth/login` | Public | Verify email and password and establish a regenerated session. |
| `POST` | `/auth/logout` | Authenticated | Destroy the current session and clear its cookie. |
| `GET` | `/auth/me` | Authenticated | Return the current member's safe profile fields. |

Signup accepts the account and initial business-profile fields collected by the frontend, including email, password, name, company, job title, and location. Password strength and unique normalized email rules are enforced by the API.

### Members

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/members` | Authenticated | List active members using approved directory fields only. |
| `PUT` | `/members/me` | Authenticated | Update the current member's allowed personal and business profile fields. |
| `GET` | `/members/:id` | Authenticated | Retrieve an active member's approved public profile. |

Directory responses omit email addresses and password hashes. Approved profile data can include name, company, role or job title, sector, location, biography, and website.

### Events

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/events` | Public | List events chronologically with capacity and registration information. |
| `GET` | `/events/my-registrations` | Authenticated | List events registered by the current member. |
| `POST` | `/events/:id/register` | Authenticated | Register the current member for an event. |
| `DELETE` | `/events/:id/register` | Authenticated | Cancel the current member's registration. |
| `POST` | `/events` | Administrator | Create an event. |
| `PUT` | `/events/:id` | Administrator | Update an event. |
| `DELETE` | `/events/:id` | Administrator | Delete an event. |

Event registration uses database transactions to prevent capacity overbooking and duplicate registrations.

Administrator status is controlled by the `role` field in the users table. There is no public endpoint for granting administrator privileges; role changes must be performed through an appropriately controlled administrative database process.

## Error Responses

Unknown routes return a JSON `404` response. API failures use consistent JSON error responses.

In production, internal details are hidden. Responses do not expose SQL statements, database credentials, password hashes, session secrets, or certificate information.

The frontend normalizes failed HTTP responses and network failures through `ApiError` in `lib/api.js`.

## Project Structure

```text
businessclub/
├── .env.example
├── .gitignore
├── README.md
├── ecosystem.config.js
├── next.config.js
├── package.json
├── schema.sql
├── app/
│   ├── globals.css
│   ├── layout.jsx
│   ├── page.jsx
│   ├── dashboard/
│   │   └── page.jsx
│   ├── events/
│   │   └── page.jsx
│   ├── login/
│   │   └── page.jsx
│   ├── members/
│   │   └── page.jsx
│   ├── profile/
│   │   └── page.jsx
│   └── signup/
│       └── page.jsx
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
│   ├── index.js
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
│   └── routes/
│       ├── authRoutes.js
│       ├── eventRoutes.js
│       └── memberRoutes.js
└── certs/
    ├── certificate.crt
    └── private.key
```

The `certs` directory and its contents are runtime assets supplied by an administrator and are excluded from version control.

## File Responsibilities

- `app/`: Next.js App Router pages, root layout, metadata, and global styles.
- `components/`: Authentication, navigation, dashboard, directory, event, and profile UI.
- `lib/api.js`: Credentialed JSON API client fixed to the production API URL.
- `server/index.js`: Express configuration, HTTPS startup, route mounting, CORS, and database connectivity verification.
- `server/config/`: MySQL pool, database-backed session store, and session middleware.
- `server/controllers/`: Authentication, member, and event business logic.
- `server/middleware/`: Authentication, authorization, not-found, and error handling.
- `server/routes/`: Express route definitions.
- `schema.sql`: MySQL tables, constraints, indexes, and initial UK event records.
- `ecosystem.config.js`: PM2 configuration for the production Next.js frontend.
- `.next/`: Generated Next.js production build output; created by `npm run build` and not version-controlled.