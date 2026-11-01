/**
 * guildchat MCP server. Defined core subset of 10 Discord tools.
 *
 * Low-level Server API with explicit inputSchema literals identical
 * to the fixture (the McpServer+zod path injects $schema /
 * additionalProperties and breaks parity). Zod validates call args.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
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

const EmptyArgs = z.object({});
const GuildArgs = z.object({ guild_id: z.string() });
const ChannelArgs = z.object({ channel_id: z.string() });
const SendArgs = z.object({ channel_id: z.string(), content: z.string() });
const ReadArgs = z.object({ channel_id: z.string(), limit: z.number().optional(), before: z.string().optional() });
const EditArgs = z.object({ channel_id: z.string(), message_id: z.string(), content: z.string() });
const MessageArgs = z.object({ channel_id: z.string(), message_id: z.string() });
const ReactionArgs = z.object({ channel_id: z.string(), message_id: z.string(), emoji: z.string() });

const TOOLS = [
  {
    name: "list_guilds",
    description: "List the guilds (servers) the bot user is a member of.",
    inputSchema: { type: "object" as const, properties: {}, required: [] as string[] },
  },
  {
    name: "get_guild",
    description: "Get a guild (server) by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: { guild_id: { type: "string", description: "ID of the guild (server) to retrieve." } },
      required: ["guild_id"],
    },
  },
  {
    name: "list_channels",
    description: "List the channels in a guild.",
    inputSchema: {
      type: "object" as const,
      properties: { guild_id: { type: "string", description: "ID of the guild (server) whose channels to list." } },
      required: ["guild_id"],
    },
  },
  {
    name: "get_channel",
    description: "Get a channel by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: { channel_id: { type: "string", description: "ID of the channel to retrieve." } },
      required: ["channel_id"],
    },
  },
  {
    name: "send_message",
    description: "Send a plain-text message to a channel.",
    inputSchema: {
      type: "object" as const,
      properties: { channel_id: { type: "string", description: "ID of the channel to send the message to." }, content: { type: "string", description: "Plain-text content of the message to send." } },
      required: ["channel_id", "content"],
    },
  },
  {
    name: "read_messages",
    description: "Read recent messages from a channel, optionally limited and paged before a message ID.",
    inputSchema: {
      type: "object" as const,
      properties: { channel_id: { type: "string", description: "ID of the channel to read messages from." }, limit: { type: "number", description: "Maximum number of messages to return." }, before: { type: "string", description: "Message ID to page before; only messages older than this ID are returned." } },
      required: ["channel_id"],
    },
  },
  {
    name: "edit_message",
    description: "Edit a message previously sent by the bot in a channel.",
    inputSchema: {
      type: "object" as const,
      properties: { channel_id: { type: "string", description: "ID of the channel containing the message to edit." }, message_id: { type: "string", description: "ID of the message to edit." }, content: { type: "string", description: "New plain-text content to replace the message's existing content." } },
      required: ["channel_id", "message_id", "content"],
    },
  },
  {
    name: "delete_message",
    description: "Delete a message from a channel.",
    inputSchema: {
      type: "object" as const,
      properties: { channel_id: { type: "string", description: "ID of the channel containing the message to delete." }, message_id: { type: "string", description: "ID of the message to delete." } },
      required: ["channel_id", "message_id"],
    },
  },
  {
    name: "add_reaction",
    description: "Add an emoji reaction to a message as the bot user.",
    inputSchema: {
      type: "object" as const,
      properties: { channel_id: { type: "string", description: "ID of the channel containing the message to react to." }, message_id: { type: "string", description: "ID of the message to add the reaction to." }, emoji: { type: "string", description: "Emoji to add as a reaction to the message." } },
      required: ["channel_id", "message_id", "emoji"],
    },
  },
  {
    name: "get_current_user",
    description: "Get the current bot user.",
    inputSchema: { type: "object" as const, properties: {}, required: [] as string[] },
  },
];

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}
function errorResult(err: unknown) {
  return { content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }], isError: true };
}

const server = new Server({ name: "guildchat", version: VERSION }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const fetchFn = globalThis.fetch as unknown as FetchFn;
  const token = tokenFromEnv();
  const base = baseFromEnv();
  try {
    switch (name) {
      case "list_guilds": EmptyArgs.parse(args ?? {}); return textResult(await listGuilds(fetchFn, token, base));
      case "get_guild": return textResult(await getGuild(fetchFn, GuildArgs.parse(args ?? {}), token, base));
      case "list_channels": return textResult(await listChannels(fetchFn, GuildArgs.parse(args ?? {}), token, base));
      case "get_channel": return textResult(await getChannel(fetchFn, ChannelArgs.parse(args ?? {}), token, base));
      case "send_message": return textResult(await sendMessage(fetchFn, SendArgs.parse(args ?? {}), token, base));
      case "read_messages": return textResult(await readMessages(fetchFn, ReadArgs.parse(args ?? {}), token, base));
      case "edit_message": return textResult(await editMessage(fetchFn, EditArgs.parse(args ?? {}), token, base));
      case "delete_message": return textResult(await deleteMessage(fetchFn, MessageArgs.parse(args ?? {}), token, base));
      case "add_reaction": return textResult(await addReaction(fetchFn, ReactionArgs.parse(args ?? {}), token, base));
      case "get_current_user": EmptyArgs.parse(args ?? {}); return textResult(await getCurrentUser(fetchFn, token, base));
    }
  } catch (err) {
    return errorResult(err);
  }
  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}
void main();
