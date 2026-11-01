import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
} from "../src/guildchat.js";
import type { FetchFn, HttpResponse } from "../src/types.js";

interface Captured { url?: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }

function resp(body: string, opts: Partial<HttpResponse> = {}): HttpResponse {
  return { ok: true, status: 200, statusText: "OK", headers: { get: () => null }, text: async () => body, ...opts };
}
function fake(captured: Captured, body = '{"id":"1"}'): FetchFn {
  return async (url, init) => { captured.url = url; captured.init = init; return resp(body); };
}
const TOKEN = "bot-token";

describe("env helpers", () => {
  it("tokenFromEnv trims and returns undefined when absent", () => {
    assert.equal(tokenFromEnv({ DISCORD_TOKEN: " t " }), "t");
    assert.equal(tokenFromEnv({}), undefined);
  });
  it("baseFromEnv defaults and overrides", () => {
    assert.equal(baseFromEnv({}), "https://discord.com/api/v10");
    assert.equal(baseFromEnv({ DISCORD_API_BASE: "https://example.test/v10/" }), "https://example.test/v10");
  });
});

describe("missing token", () => {
  it("every call errors naming DISCORD_TOKEN when no token is set", async () => {
    await assert.rejects(() => listGuilds(fake({})), /DISCORD_TOKEN/);
    await assert.rejects(() => getCurrentUser(fake({})), /DISCORD_TOKEN/);
    await assert.rejects(() => sendMessage(fake({}), { channel_id: "c1", content: "hi" }), /DISCORD_TOKEN/);
  });
});

describe("guild and channel reads", () => {
  it("list_guilds GETs /users/@me/guilds with Bot auth and parses JSON", async () => {
    const c: Captured = {};
    const out = await listGuilds(fake(c, '[{"id":"g1","name":"Guild"}]'), TOKEN);
    assert.deepEqual(out, [{ id: "g1", name: "Guild" }]);
    assert.equal(c.url, "https://discord.com/api/v10/users/@me/guilds");
    assert.equal(c.init?.method, "GET");
    assert.equal(c.init?.headers?.Authorization, "Bot bot-token");
  });
  it("get_guild GETs /guilds/{id}", async () => {
    const c: Captured = {};
    await getGuild(fake(c), { guild_id: "g42" }, TOKEN);
    assert.equal(c.url, "https://discord.com/api/v10/guilds/g42");
  });
  it("list_channels GETs /guilds/{id}/channels", async () => {
    const c: Captured = {};
    await listChannels(fake(c), { guild_id: "g42" }, TOKEN);
    assert.equal(c.url, "https://discord.com/api/v10/guilds/g42/channels");
  });
  it("get_channel GETs /channels/{id}", async () => {
    const c: Captured = {};
    await getChannel(fake(c), { channel_id: "c9" }, TOKEN);
    assert.equal(c.url, "https://discord.com/api/v10/channels/c9");
  });
  it("get_current_user GETs /users/@me", async () => {
    const c: Captured = {};
    await getCurrentUser(fake(c), TOKEN);
    assert.equal(c.url, "https://discord.com/api/v10/users/@me");
  });
  it("rejects empty ids", async () => {
    await assert.rejects(() => getGuild(fake({}), { guild_id: " " }, TOKEN), /guild_id/);
  });
});

describe("messages", () => {
  it("send_message POSTs {content} as JSON", async () => {
    const c: Captured = {};
    await sendMessage(fake(c), { channel_id: "c1", content: "hello" }, TOKEN);
    assert.equal(c.url, "https://discord.com/api/v10/channels/c1/messages");
    assert.equal(c.init?.method, "POST");
    assert.equal(c.init?.headers?.["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(c.init?.body ?? "{}"), { content: "hello" });
  });
  it("read_messages shapes limit and before query params", async () => {
    const c: Captured = {};
    await readMessages(fake(c, "[]"), { channel_id: "c1", limit: 25, before: "m99" }, TOKEN);
    assert.equal(c.url, "https://discord.com/api/v10/channels/c1/messages?limit=25&before=m99");
    const c2: Captured = {};
    await readMessages(fake(c2, "[]"), { channel_id: "c1" }, TOKEN);
    assert.equal(c2.url, "https://discord.com/api/v10/channels/c1/messages");
  });
  it("edit_message PATCHes {content}", async () => {
    const c: Captured = {};
    await editMessage(fake(c), { channel_id: "c1", message_id: "m2", content: "edited" }, TOKEN);
    assert.equal(c.url, "https://discord.com/api/v10/channels/c1/messages/m2");
    assert.equal(c.init?.method, "PATCH");
    assert.deepEqual(JSON.parse(c.init?.body ?? "{}"), { content: "edited" });
  });
  it("delete_message DELETEs and handles an empty 204 body", async () => {
    const c: Captured = {};
    const out = await deleteMessage(fake(c, ""), { channel_id: "c1", message_id: "m2" }, TOKEN);
    assert.equal(c.init?.method, "DELETE");
    assert.equal(c.url, "https://discord.com/api/v10/channels/c1/messages/m2");
    assert.equal((out as { ok: boolean }).ok, true);
  });
});

describe("reactions", () => {
  it("add_reaction PUTs with the emoji URL-encoded in the path", async () => {
    const c: Captured = {};
    await addReaction(fake(c, ""), { channel_id: "c1", message_id: "m2", emoji: "👍" }, TOKEN);
    assert.equal(c.init?.method, "PUT");
    assert.equal(c.url, `https://discord.com/api/v10/channels/c1/messages/m2/reactions/${encodeURIComponent("👍")}/@me`);
    assert.ok(!c.url?.includes("👍"));
  });
  it("add_reaction encodes custom emoji strings", async () => {
    const c: Captured = {};
    await addReaction(fake(c, ""), { channel_id: "c1", message_id: "m2", emoji: "party:123" }, TOKEN);
    assert.ok(c.url?.includes("party%3A123"));
  });
});

describe("errors", () => {
  it("surfaces HTTP failures with status and detail", async () => {
    const failing: FetchFn = async () => resp("missing access", { ok: false, status: 403, statusText: "Forbidden" });
    await assert.rejects(() => listGuilds(failing, TOKEN), /HTTP 403.*missing access/);
  });
  it("surfaces connection failures naming the base", async () => {
    const failing: FetchFn = async () => { throw new Error("socket closed"); };
    await assert.rejects(() => getCurrentUser(failing, TOKEN), /Failed to reach Discord API.*socket closed/);
  });
});
