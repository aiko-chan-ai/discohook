import type {
    APIChannel,
    APIGuildForumTag,
    APIGuildMember,
    APIRole,
    APIUser,
} from "discord-api-types/v10";
import { useReducer } from "react";
import type { EmojiGuildData } from "~/api/EditorAPI";

export type Resolutions = {
  [key: `channel:${string}`]: ResolvableAPIChannel | undefined | null;
  [key: `member:${string}`]: ResolvableAPIGuildMember | undefined | null;
  [key: `role:${string}`]: ResolvableAPIRole | undefined | null;
  [key: `emoji:${string}`]: ResolvableAPIEmoji | undefined | null;
};

export type ResolutionKey = keyof Resolutions;

type Resolvable =
  | ResolvableAPIChannel
  | ResolvableAPIGuildMember
  | ResolvableAPIRole
  | ResolvableAPIEmoji;

export type ResolvableAPIChannelType =
  | "text"
  | "voice"
  | "thread"
  | "forum"
  | "media"
  | "post";

export const tagToResolvableTag = (
  tag: APIGuildForumTag,
): ResolvableAPIGuildForumTag => ({
  id: tag.id,
  name: tag.name,
  moderated: tag.moderated ? true : undefined,
  emoji_id: tag.emoji_id ? tag.emoji_id : undefined,
  emoji_name: tag.emoji_name ? tag.emoji_name : undefined,
});

export type ResolvableAPIGuildForumTag = Pick<
  APIGuildForumTag,
  "id" | "name"
> & {
  moderated?: boolean;
  emoji_id?: string;
  emoji_name?: string;
};

export type ResolvableAPIChannel = Pick<APIChannel, "id" | "name"> & {
  type: ResolvableAPIChannelType;
  tags?: ResolvableAPIGuildForumTag[];
};

export type ResolvableAPIGuild = { id: string | bigint; name: string; icon: string | null };

export type ResolvableAPIGuildMember = Pick<APIGuildMember, "nick"> & {
  user: Pick<APIUser, "id" | "username" | "global_name">;
};

export type ResolvableAPIRole = Pick<
  APIRole,
  | "id"
  | "name"
  | "color"
  | "mentionable"
  | "managed"
  | "position"
  | "icon"
  | "unicode_emoji"
>;

export type ResolvableAPIEmoji = {
  id: string | undefined;
  name: string;
  animated?: boolean;
  available?: false;
};

export type ResolutionScope = "channel" | "member" | "role" | "emoji";

/**
 * Local-only cache manager. No API fetching - data is populated
 * via the JS API (importCustomEmojis) or manually.
 */
export class CacheManager {
  public state: Resolutions;
  public setState: React.Dispatch<Partial<Resolutions>>;
  public queue: ResolutionKey[];
  public customEmojiGuilds: EmojiGuildData[];

  public channel = {
    get: (id: string) => this.state[`channel:${id}`],
    getAll: (filter?: (instance: ResolvableAPIChannel) => boolean) =>
      Object.entries(this.state)
        .filter(
          (p): p is [string, ResolvableAPIChannel] =>
            !!p[1] && p[0].startsWith("channel:") && (filter ? filter(p[1] as ResolvableAPIChannel) : true),
        )
        .map(([, v]) => v),
  };

  public member = {
    get: (userId: string, _guildId?: string) => {
      if (_guildId) return this.state[`member:${_guildId}-${userId}`];
      const global = this.state[`member:@global-${userId}`];
      if (global) return global;
      const pair = Object.entries(this.state).find(
        (p): p is [string, ResolvableAPIGuildMember] =>
          p[0].startsWith("member:") && p[0].endsWith(`-${userId}`),
      );
      return pair?.[1];
    },
    getAll: (filter?: (instance: ResolvableAPIGuildMember) => boolean) =>
      Object.entries(this.state)
        .filter(
          (p): p is [string, ResolvableAPIGuildMember] =>
            !!p[1] && p[0].startsWith("member:") && (filter ? filter(p[1] as ResolvableAPIGuildMember) : true),
        )
        .map(([, v]) => v),
  };

  public role = {
    get: (id: string) => this.state[`role:${id}`],
    getAll: (filter?: (instance: ResolvableAPIRole) => boolean) =>
      Object.entries(this.state)
        .filter(
          (p): p is [string, ResolvableAPIRole] =>
            !!p[1] && p[0].startsWith("role:") && (filter ? filter(p[1] as ResolvableAPIRole) : true),
        )
        .map(([, v]) => v),
  };

  public emoji = {
    get: (id: string) => this.state[`emoji:${id}`],
    getAll: (filter?: (instance: ResolvableAPIEmoji) => boolean) =>
      Object.entries(this.state)
        .filter(
          (p): p is [string, ResolvableAPIEmoji] =>
            !!p[1] && p[0].startsWith("emoji:") && (filter ? filter(p[1] as ResolvableAPIEmoji) : true),
        )
        .map(([, v]) => v),
  };

  constructor(
    state: Resolutions,
    setState: React.Dispatch<Partial<Resolutions>>,
  ) {
    this.state = state;
    this.setState = setState;
    this.queue = [];
    this.customEmojiGuilds = [];
  }

  /** Fill the state with entries */
  fill(...entries: [key: ResolutionKey, resource: Resolvable][]) {
    this.setState(Object.fromEntries(entries) as Resolutions);
  }

  resolve(request: {
    scope: "channel";
    key: string;
  }): ResolvableAPIChannel | null | undefined;
  resolve(request: {
    scope: "member";
    key: string;
  }): ResolvableAPIGuildMember | null | undefined;
  resolve(request: {
    scope: "role";
    key: string;
  }): ResolvableAPIRole | null | undefined;
  resolve(request: {
    scope: "emoji";
    key: string;
  }): ResolvableAPIEmoji | null | undefined;
  resolve(request: {
    scope: ResolutionScope;
    key: string;
  }):
    | ResolvableAPIChannel
    | ResolvableAPIGuildMember
    | ResolvableAPIRole
    | ResolvableAPIEmoji
    | null
    | undefined {
    const key = `${request.scope}:${request.key}` as const;
    const cached = this.state[key];
    if (cached) return cached;
    if (cached === null) return null;

    // For emoji scope, auto-populate a stub entry
    if (request.scope === "emoji") {
      const update: any = {};
      update[`emoji:${request.key}`] = {
        id: request.key,
        name: "emoji",
      };
      this.setState(update);
    }

    return undefined;
  }

  resolveMany(requests: Set<string>) {
    for (const request of requests) {
      const [scope, key] = request.split(":");
      // @ts-expect-error
      this.resolve({ scope, key });
    }
  }
}

const defaultCache: Resolutions = {
  "member:@global-792842038332358656": {
    user: {
      id: "792842038332358656",
      username: "Discohook Utils",
      global_name: null,
    },
  },
};

export const useCache = (): CacheManager => {
  const [state, setState] = useReducer(
    (d: Resolutions, partialD: Partial<Resolutions>) => ({ ...d, ...partialD }),
    defaultCache,
  );
  return new CacheManager(state, setState);
};
