# BUILD-REPORT — guildchat (original: discord)

Built 2026-10-26 for the MCP Rebuild 100 program, Tier C core
subset. Local only; nothing pushed or published.

## Identity

- npm: `@reneturcios/guildchat`, bin `guildchat`, version 0.1.0
- Registry name: `io.github.CloudCorpRecords/guildchat`
  (matches package.json `mcpName`, server.json `name`, and the
  Dockerfile `io.modelcontextprotocol.server.name` label)
- server.json description: 95 chars (≤100, counted)
- server.json OCI package entry: no `version` field (version only
  in the tagged identifier `ghcr.io/cloudcorprecords/guildchat:0.1.0`)

## Subset scope

Defined core subset of 10 tools mapped 1:1 to Discord REST API v10
(`https://discord.com/api/v10`, `Authorization: Bot
<DISCORD_TOKEN>`, base override `DISCORD_API_BASE`). Community
Discord MCP originals vary and the TARGETS `source_repo` is null,
so there is no single audited original; the fixture
(`harness/fixtures/discord-tools-original.json`) records this in
its `_source` and defines the subset.

| Tool | Endpoint |
| --- | --- |
| `list_guilds` | `GET /users/@me/guilds` |
| `get_guild` | `GET /guilds/{guild_id}` |
| `list_channels` | `GET /guilds/{guild_id}/channels` |
| `get_channel` | `GET /channels/{channel_id}` |
| `send_message` | `POST /channels/{channel_id}/messages` |
| `read_messages` | `GET /channels/{channel_id}/messages` (`limit`, `before`) |
| `edit_message` | `PATCH /channels/{channel_id}/messages/{message_id}` |
| `delete_message` | `DELETE /channels/{channel_id}/messages/{message_id}` |
| `add_reaction` | `PUT /channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me` (emoji URL-encoded in the path) |
| `get_current_user` | `GET /users/@me` |

Omitted groups (also in the fixture `_source`): voice,
threads/forums, roles/permissions management, member moderation
(ban/kick/timeout), webhooks, slash-command registration,
embeds/attachments richness beyond plain content, and gateway
events (the listen tools some community servers add).

Registered via the low-level MCP `Server` API with explicit
inputSchema literals identical to the fixture; zod validates call
arguments. All HTTP goes through an injectable `FetchFn`.

## Verification (all foreground, verified from disk/output)

- tsc: `npm run build` exit 0; `dist/cli.js` present;
  `node dist/cli.js --version` → `0.1.0`; unknown command prints
  Usage and exits 2
- Tests: 17/17 pass (`npm test`, fake fetch only — URL/method/Bot
  auth header/body shaping, query params, emoji URL-encoding,
  empty-body delete, HTTP/connection errors, missing-token errors)
- Parity: fixture `harness/fixtures/discord-tools-original.json`
  vs live stdio rebuild via `harness/parity.py` →
  `parity_pct == 100.0`, identical 10/10, verdict PASS, output in
  `parity-out/parity.json`
- Missing-env stdio check: with `DISCORD_TOKEN` unset, an
  initialize + `tools/call list_guilds` session returned
  `isError: true` with text naming `DISCORD_TOKEN`

## Honest gaps

- No live call to discord.com was made or claimed; wire behaviour
  is proven against fake-fetch fixtures only, so upstream drift is
  unverified until the publish-wave live smoke.
- This is a defined subset, not full Discord coverage: the omitted
  groups above are out of scope by design, and message sending is
  plain `content` text only (no embeds, attachments, or components).
- Lockfile flag: `package-lock.json` is a copy of the
  libdocs-remote lockfile with identity fields edited (name, bin).
  **Clean lockfile regeneration (no node_modules present) is
  required before publish** — fleet lesson 2026-10-25.
- mcpaudit / mcpvet / shipcheck pre-publish gate not run (belongs
  to the publish wave, per SCOREBOARD).
