/**
 * guildchat core: a defined core subset of Discord, mapped 1:1 to
 * Discord REST API v10 (https://discord.com/api/v10).
 *
 * Auth: `Authorization: Bot <DISCORD_TOKEN>`. The API base can be
 * overridden with DISCORD_API_BASE (used by tests / proxies).
 * A missing token is an error naming DISCORD_TOKEN.
 *
 * All HTTP goes through an injected FetchFn so the wire handling is
 * fully testable offline.
 *
 * Omitted on purpose (see BUILD-REPORT): voice, threads/forums,
 * roles/permissions management, member moderation (ban/kick/timeout),
 * webhooks, slash-command registration, embeds/attachments richness
 * beyond plain content, and gateway events.
 */
import type {
  AddReactionOptions,
  DeleteMessageOptions,
  EditMessageOptions,
  FetchFn,
  GetChannelOptions,
  GetGuildOptions,
  ListChannelsOptions,
  ReadMessagesOptions,
  SendMessageOptions,
} from "./types.js";

export const VERSION = "0.1.0";
export const DEFAULT_BASE = "https://discord.com/api/v10";

export function tokenFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const raw = env.DISCORD_TOKEN;
  const v = typeof raw === "string" ? raw.trim() : "";
  return v ? v : undefined;
}

export function baseFromEnv(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = env.DISCORD_API_BASE;
  const v = typeof raw === "string" ? raw.trim().replace(/\/+$/, "") : "";
  return v ? v : DEFAULT_BASE;
}

function requireToken(token?: string): string {
  const v = typeof token === "string" ? token.trim() : "";
  if (!v) throw new Error("DISCORD_TOKEN is not set: a Discord bot token is required (set the DISCORD_TOKEN environment variable)");
  return v;
}

function requireString(value: unknown, name: string): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new Error(`${name} must be a non-empty string`);
  return v;
}

async function request(
  fetchFn: FetchFn,
  token: string | undefined,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  base: string = DEFAULT_BASE,
): Promise<unknown> {
  const auth = requireToken(token);
  const headers: Record<string, string> = {
    Authorization: `Bot ${auth}`,
    Accept: "application/json",
  };
  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetchFn(`${base}${path}`, { method, headers, body: payload });
  } catch (err) {
    throw new Error(`Failed to reach Discord API at ${base}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const text = await response.text();
  if (!response.ok) {
    const detail = text.trim().slice(0, 200);
    throw new Error(`Discord API request failed: HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}${detail ? `: ${detail}` : ""}`);
  }
  if (!text.trim()) return { ok: true, status: response.status };
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function listGuilds(fetchFn: FetchFn, token?: string, base?: string): Promise<unknown> {
  return request(fetchFn, token, "GET", "/users/@me/guilds", undefined, base);
}

export async function getGuild(fetchFn: FetchFn, opts: GetGuildOptions, token?: string, base?: string): Promise<unknown> {
  const id = requireString(opts.guild_id, "guild_id");
  return request(fetchFn, token, "GET", `/guilds/${encodeURIComponent(id)}`, undefined, base);
}

export async function listChannels(fetchFn: FetchFn, opts: ListChannelsOptions, token?: string, base?: string): Promise<unknown> {
  const id = requireString(opts.guild_id, "guild_id");
  return request(fetchFn, token, "GET", `/guilds/${encodeURIComponent(id)}/channels`, undefined, base);
}

export async function getChannel(fetchFn: FetchFn, opts: GetChannelOptions, token?: string, base?: string): Promise<unknown> {
  const id = requireString(opts.channel_id, "channel_id");
  return request(fetchFn, token, "GET", `/channels/${encodeURIComponent(id)}`, undefined, base);
}

export async function sendMessage(fetchFn: FetchFn, opts: SendMessageOptions, token?: string, base?: string): Promise<unknown> {
  const id = requireString(opts.channel_id, "channel_id");
  const content = requireString(opts.content, "content");
  return request(fetchFn, token, "POST", `/channels/${encodeURIComponent(id)}/messages`, { content }, base);
}

export async function readMessages(fetchFn: FetchFn, opts: ReadMessagesOptions, token?: string, base?: string): Promise<unknown> {
  const id = requireString(opts.channel_id, "channel_id");
  const params = new URLSearchParams();
  if (opts.limit !== undefined && Number.isFinite(opts.limit)) params.set("limit", String(opts.limit));
  if (typeof opts.before === "string" && opts.before.trim()) params.set("before", opts.before.trim());
  const qs = params.toString();
  return request(fetchFn, token, "GET", `/channels/${encodeURIComponent(id)}/messages${qs ? `?${qs}` : ""}`, undefined, base);
}

export async function editMessage(fetchFn: FetchFn, opts: EditMessageOptions, token?: string, base?: string): Promise<unknown> {
  const channel = requireString(opts.channel_id, "channel_id");
  const message = requireString(opts.message_id, "message_id");
  const content = requireString(opts.content, "content");
  return request(fetchFn, token, "PATCH", `/channels/${encodeURIComponent(channel)}/messages/${encodeURIComponent(message)}`, { content }, base);
}

export async function deleteMessage(fetchFn: FetchFn, opts: DeleteMessageOptions, token?: string, base?: string): Promise<unknown> {
  const channel = requireString(opts.channel_id, "channel_id");
  const message = requireString(opts.message_id, "message_id");
  return request(fetchFn, token, "DELETE", `/channels/${encodeURIComponent(channel)}/messages/${encodeURIComponent(message)}`, undefined, base);
}

export async function addReaction(fetchFn: FetchFn, opts: AddReactionOptions, token?: string, base?: string): Promise<unknown> {
  const channel = requireString(opts.channel_id, "channel_id");
  const message = requireString(opts.message_id, "message_id");
  const emoji = requireString(opts.emoji, "emoji");
  // Discord requires the emoji to be URL-encoded in the path.
  return request(fetchFn, token, "PUT", `/channels/${encodeURIComponent(channel)}/messages/${encodeURIComponent(message)}/reactions/${encodeURIComponent(emoji)}/@me`, undefined, base);
}

export async function getCurrentUser(fetchFn: FetchFn, token?: string, base?: string): Promise<unknown> {
  return request(fetchFn, token, "GET", "/users/@me", undefined, base);
}
