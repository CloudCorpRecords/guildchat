# guildchat

guildchat is a small Discord client for agents: it covers the part
of Discord that community chat work actually needs — guilds,
channels, plain-text messages, and reactions — and maps each tool
1:1 to a Discord REST API v10 endpoint. It is a defined core subset,
not a full Discord integration: there is no voice, no thread or
forum management, no role or permission editing, no member
moderation, no webhooks, no slash-command registration, and no
gateway event stream.

Every call is made as a bot, with `Authorization: Bot
<DISCORD_TOKEN>`. Set `DISCORD_TOKEN` before starting the server;
a call made without it fails with an error naming the variable.
The API base defaults to `https://discord.com/api/v10` and can be
overridden with `DISCORD_API_BASE`.

## Install

```bash
npx @reneturcios/guildchat list_guilds
docker run -i ghcr.io/cloudcorprecords/guildchat
```

## CLI

```bash
guildchat list_guilds
guildchat get_guild <guild_id>
guildchat list_channels <guild_id>
guildchat send_message <channel_id> hello everyone
guildchat read_messages <channel_id> --limit 25
guildchat add_reaction <channel_id> <message_id> 👍
guildchat get_current_user
guildchat --version
```

Exit codes: `0` success, `1` API error, `2` usage error.

## MCP server

```bash
npx -y @reneturcios/guildchat mcp
```

```json
{
  "mcpServers": {
    "guildchat": {
      "command": "npx",
      "args": ["-y", "@reneturcios/guildchat", "mcp"],
      "env": { "DISCORD_TOKEN": "your-bot-token" }
    }
  }
}
```

### Tools

| Tool | Input | Discord endpoint |
| --- | --- | --- |
| `list_guilds` | — | `GET /users/@me/guilds` |
| `get_guild` | `guild_id` | `GET /guilds/{id}` |
| `list_channels` | `guild_id` | `GET /guilds/{id}/channels` |
| `get_channel` | `channel_id` | `GET /channels/{id}` |
| `send_message` | `channel_id`, `content` | `POST /channels/{id}/messages` |
| `read_messages` | `channel_id`, `limit`?, `before`? | `GET /channels/{id}/messages` |
| `edit_message` | `channel_id`, `message_id`, `content` | `PATCH /channels/{id}/messages/{mid}` |
| `delete_message` | `channel_id`, `message_id` | `DELETE /channels/{id}/messages/{mid}` |
| `add_reaction` | `channel_id`, `message_id`, `emoji` | `PUT /channels/{id}/messages/{mid}/reactions/{emoji}/@me` |
| `get_current_user` | — | `GET /users/@me` |

Reaction emoji are URL-encoded into the request path, as Discord
requires. Upstream HTTP errors are reported as tool errors with
the status and response detail.

## Development

```bash
npm install
npm run build
npm test
```

Tests run entirely on fake-fetch fixtures; no network and no real
bot token are used.

## License

MIT — see `LICENSE`.
