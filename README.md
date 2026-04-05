# Nexus Bug Report Hub

Render-ready service for collecting launcher bug reports, filtering abuse, notifying the developer in Discord DM, and updating user-visible report status.

## Env

Create these environment variables in Render:

- `PORT`
- `DISCORD_BOT_TOKEN`
- `DISCORD_OWNER_USER_ID`
- `PUBLIC_BASE_URL`

## Run

```bash
npm install
npm start
```

## API

- `POST /api/reports`
- `GET /api/reports/:id`
- `GET /api/launcher/:launcherUserId/inbox`
- `POST /api/reports/:id/status`
- `GET /health`

## Owner Discord Commands

Send DM to the bot:

- `!resolve <reportId>`
- `!reject <reportId>`
- `!needinfo <reportId>`

The service stores status updates and messages so the launcher can show them to the reporting user later.
