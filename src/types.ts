/**
 * guildchat types.
 *
 * Core-subset Discord client: guilds, channels, plain-text channel
 * messages, message reads/edits/deletes, reactions, and the current
 * bot user, all mapped 1:1 to Discord REST API v10 endpoints. HTTP
 * access is described by a minimal response surface so tests can
 * inject a fake fetch.
 */

export interface GetGuildOptions { guild_id: string }
export interface ListChannelsOptions { guild_id: string }
export interface GetChannelOptions { channel_id: string }
export interface SendMessageOptions { channel_id: string; content: string }
export interface ReadMessagesOptions { channel_id: string; limit?: number; before?: string }
export interface EditMessageOptions { channel_id: string; message_id: string; content: string }
export interface DeleteMessageOptions { channel_id: string; message_id: string }
export interface AddReactionOptions { channel_id: string; message_id: string; emoji: string }

export interface HttpResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type FetchFn = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    redirect?: string;
  },
) => Promise<HttpResponse>;
