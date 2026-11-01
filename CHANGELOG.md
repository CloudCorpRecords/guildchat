# Changelog

## 0.1.0 (2026-10-26)

- Initial release.
- MCP server (`guildchat mcp`, stdio) and CLI with ten tools mapped
  1:1 to Discord REST API v10: `list_guilds`, `get_guild`,
  `list_channels`, `get_channel`, `send_message`, `read_messages`,
  `edit_message`, `delete_message`, `add_reaction`, and
  `get_current_user`.
- Auth is `Authorization: Bot <DISCORD_TOKEN>`; the base URL can be
  overridden with `DISCORD_API_BASE`. A missing token is an error
  naming `DISCORD_TOKEN`.
- Reaction emoji are URL-encoded in the request path.
- Defined core subset only: voice, threads/forums, roles and
  permissions, member moderation, webhooks, slash-command
  registration, rich embeds/attachments, and gateway events are
  intentionally omitted.
- All HTTP goes through an injectable fetch function, so tests run
  on fixtures with no network access.
