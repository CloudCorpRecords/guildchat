#!/usr/bin/env node
/**
 * guildchat CLI. One subcommand per tool, plus `mcp` and `--version`.
 * DISCORD_TOKEN is required for API calls. Exit: 0 ok, 1 error, 2 usage.
 */
import {
  addReaction,
  baseFromEnv,
  deleteMessage,
  editMessage,
  getChannel,
  getCurrentUser,
  getGuild,
  listChannels,
  listGuilds,
  readMessages,
  sendMessage,
  tokenFromEnv,
  VERSION,
} from "./guildchat.js";
import type { FetchFn } from "./types.js";

function usage(): never {
  console.error(`Usage:
  guildchat list_guilds
  guildchat get_guild <guild_id>
  guildchat list_channels <guild_id>
  guildchat get_channel <channel_id>
  guildchat send_message <channel_id> <content...>
  guildchat read_messages <channel_id> [--limit n] [--before message_id]
  guildchat edit_message <channel_id> <message_id> <content...>
  guildchat delete_message <channel_id> <message_id>
  guildchat add_reaction <channel_id> <message_id> <emoji>
  guildchat get_current_user
  guildchat mcp
  guildchat --version`);
  process.exit(2);
}
function flagValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx < 0 || idx + 1 >= args.length ? undefined : args[idx + 1];
}
function print(v: unknown): void { console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2)); }

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--version" || cmd === "-v") { console.log(VERSION); return; }
  if (cmd === "mcp") { await import("./mcp.js"); return; }
  if (!cmd) usage();
  const fetchFn = globalThis.fetch as unknown as FetchFn;
  const token = tokenFromEnv();
  const base = baseFromEnv();
  try {
    switch (cmd) {
      case "list_guilds": print(await listGuilds(fetchFn, token, base)); break;
      case "get_guild": if (!rest[0]) usage(); print(await getGuild(fetchFn, { guild_id: rest[0] }, token, base)); break;
      case "list_channels": if (!rest[0]) usage(); print(await listChannels(fetchFn, { guild_id: rest[0] }, token, base)); break;
      case "get_channel": if (!rest[0]) usage(); print(await getChannel(fetchFn, { channel_id: rest[0] }, token, base)); break;
      case "send_message": {
        if (!rest[0] || !rest[1]) usage();
        print(await sendMessage(fetchFn, { channel_id: rest[0], content: rest.slice(1).join(" ") }, token, base)); break;
      }
      case "read_messages": {
        if (!rest[0]) usage();
        const limitRaw = flagValue(rest, "--limit");
        const limit = limitRaw !== undefined ? Number(limitRaw) : undefined;
        print(await readMessages(fetchFn, { channel_id: rest[0], limit: limit !== undefined && Number.isFinite(limit) ? limit : undefined, before: flagValue(rest, "--before") }, token, base)); break;
      }
      case "edit_message": if (!rest[0] || !rest[1] || !rest[2]) usage(); print(await editMessage(fetchFn, { channel_id: rest[0], message_id: rest[1], content: rest.slice(2).join(" ") }, token, base)); break;
      case "delete_message": if (!rest[0] || !rest[1]) usage(); print(await deleteMessage(fetchFn, { channel_id: rest[0], message_id: rest[1] }, token, base)); break;
      case "add_reaction": if (!rest[0] || !rest[1] || !rest[2]) usage(); print(await addReaction(fetchFn, { channel_id: rest[0], message_id: rest[1], emoji: rest[2] }, token, base)); break;
      case "get_current_user": print(await getCurrentUser(fetchFn, token, base)); break;
      default: usage();
    }
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
void main();
