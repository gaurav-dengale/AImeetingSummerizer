# VexaMeet AI Assistant

An AI meeting assistant: a Vexa bot (or your own microphone) records/transcribes a meeting,
Groq LLM analysis extracts action items and follow-up scheduling intent, task assignees are
automatically emailed and Slacked, and detected follow-up meetings are automatically scheduled
on Google Calendar.

This is the Java/Python split of the project (the original single Python/Flask/Streamlit
prototype has been retired):

- **`backend-spring/`** — Java 21 / Spring Boot 3 backend (port `8080`). Owns the Vexa bot
  lifecycle, Google Calendar/Gmail integration, Slack messaging, contacts CSV matching, rate
  limiting, and serves the dashboard's static build.
- **`ai-service/`** — Python FastAPI microservice (port `5001`). Owns Groq LLM transcript
  intelligence (task/scheduling extraction) and local microphone transcription via Groq Whisper.
- **`frontend/`** — React 18 + TypeScript + Tailwind dashboard (Vite). Talks to `backend-spring`'s
  REST API; its production build is what `backend-spring` serves at `/`.

## Running it

```powershell
./start_all.ps1
```

This launches `ai-service` (port 5001) and `backend-spring` (port 8080) in separate windows.
Open the dashboard at **http://localhost:8080** (served by `backend-spring` from its last
deployed frontend build — see below).

### Frontend development

For live-reloading UI work, run the dashboard against the already-running backend:

```powershell
cd frontend
npm install   # first time only
npm run dev   # http://localhost:5173, proxies API calls to :8080
```

When you're happy with UI changes, bake them into `backend-spring` so `start_all.ps1` /
`mvnw spring-boot:run` / the packaged jar serves the new build:

```powershell
cd frontend
npm run deploy   # builds, then copies dist/ into backend-spring/src/main/resources/static
```

## Configuration

### `ai-service/.env`

```
GROQ_API_KEY=your_groq_api_key_here
AI_SERVICE_PORT=5001
```

### `backend-spring` environment variables

Set these as OS environment variables (or override `application.properties`) before starting
Spring Boot:

```
VEXA_API_KEY=your_vexa_api_key_here
VEXA_BASE_URL=https://api.cloud.vexa.ai   # or http://localhost:8056 for self-hosted
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token-here
CONTACTS_CSV_PATH=/path/to/your/contacts.csv
```

Slack token, contacts CSV path, and Vexa base URL/key can also be set live from the dashboard's
**Settings** card — those changes are persisted to `backend-spring/runtime-settings.properties`
so they survive a restart.

### Google Calendar & Gmail

1. In Google Cloud Console, enable the Calendar API and Gmail API, create an OAuth 2.0 Client ID
   (Desktop or Web app type), and download the JSON.
2. Save it as `credentials.json` in `backend-spring/` (or the repo root).
3. Click **"Authorize Google Calendar & Gmail"** in the dashboard's Settings card and complete the
   consent flow. The resulting token is stored under `backend-spring/tokens/` and reused/refreshed
   automatically — task emails and calendar events are then created automatically whenever the AI
   detects them.

### Contacts CSV

```csv
name,email,slack_id
John Doe,john@example.com,U1234567890
Jane Smith,jane@example.com,U0987654321
```

### Self-hosted Vexa

Use the **"Vexa Self-Hosted Admin Setup"** panel in the dashboard to register a user and mint an
API key against your self-hosted Vexa instance's admin API in one step.
