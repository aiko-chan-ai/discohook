import { isLinkButton } from "discord-api-types/utils/v10";
import {
    type APIActionRowComponent,
    type APIButtonComponent,
    type APIButtonComponentWithCustomId,
    type APIButtonComponentWithSKUId,
    type APIComponentInContainer,
    type APIContainerComponent,
    type APIMessage,
    type APIMessageComponent,
    type APISectionComponent,
    type APISelectMenuComponent,
    ButtonStyle,
    ComponentType,
    MessageFlags,
} from "discord-api-types/v10";
import { getDate, isSnowflake, type Snowflake } from "discord-snowflake";
import type { TimestampStyle } from "~/components/editor/TimePicker";
import type {
    APIButtonComponentWithURL,
    APIComponentInMessageActionRow,
    APIMessageTopLevelComponent,
} from "~/types/QueryData";
import { MAX_TOTAL_COMPONENTS, MAX_V1_ROWS } from "./constants";

export const DISCORD_API = "https://discord.com/api";
export const DISCORD_API_V = "10";

export const getSnowflakeDate = (snowflake: string) =>
  getDate(snowflake as Snowflake);

export interface BaseImageURLOptions {
  extension?: string;
  size?: number;
}

export type ImageExtension = "webp" | "png" | "jpg" | "jpeg" | "gif";

export const calculateUserDefaultAvatarIndex = (userId: string): number => {
  return Number((BigInt(userId) >> BigInt(22)) % BigInt(6));
};

class CDN {
  readonly BASE = "https://cdn.discordapp.com";

  _withOpts(
    options: BaseImageURLOptions | undefined,
    defaultSize?: number,
  ): string {
    const params = new URLSearchParams({
      size: String(options?.size ?? defaultSize ?? 1024),
    });
    if (options?.extension === "gif") {
      options.extension = "webp";
      params.set("animated", "true");
    }
    return `.${options?.extension ?? "webp"}?${params}`;
  }

  avatar(
    id: string,
    avatarHash: string,
    options?: BaseImageURLOptions,
  ): string {
    return `${this.BASE}/avatars/${id}/${avatarHash}${this._withOpts(options)}`;
  }

  defaultAvatar(index: number): string {
    return `${this.BASE}/embed/avatars/${index}.png`;
  }

  banner(
    id: string,
    bannerHash: string,
    options?: BaseImageURLOptions,
  ): string {
    return `${this.BASE}/banners/${id}/${bannerHash}${this._withOpts(options)}`;
  }

  guildMemberAvatar(
    guildId: string,
    id: string,
    avatarHash: string,
    options?: BaseImageURLOptions,
  ): string {
    return `${this.BASE}/guilds/${guildId}/users/${id}/avatars/${avatarHash}${this._withOpts(options)}`;
  }

  guildMemberBanner(
    guildId: string,
    id: string,
    avatarHash: string,
    options?: BaseImageURLOptions,
  ): string {
    return `${this.BASE}/guilds/${guildId}/users/${id}/banners/${avatarHash}${this._withOpts(options)}`;
  }

  emoji(id: string, extension?: string): string {
    return `${this.BASE}/emojis/${id}${extension ? this._withOpts({ extension, size: 240 }) : ""}`;
  }

  icon(id: string, iconHash: string, options?: BaseImageURLOptions): string {
    return `${this.BASE}/icons/${id}/${iconHash}${this._withOpts(options)}`;
  }

  appIcon(id: string, iconHash: string, options?: BaseImageURLOptions): string {
    return `${this.BASE}/app-icons/${id}/${iconHash}${this._withOpts(options)}`;
  }

  roleIcon(
    id: string,
    iconHash: string,
    options?: BaseImageURLOptions,
  ): string {
    return `${this.BASE}/role-icons/${id}/${iconHash}${this._withOpts(options)}`;
  }
}

export const cdn = new CDN();

export const cdnImgAttributes = (
  base: number | undefined,
  generate: (size?: number) => string | undefined,
) => {
  if (generate()) {
    return {
      src: generate(base),
      srcSet: base
        ? `
          ${generate(16)} ${16 / base}x,
          ${generate(32)} ${32 / base}x,
          ${generate(64)} ${64 / base}x,
          ${generate(128)} ${128 / base}x,
          ${generate(256)} ${256 / base}x,
          ${generate(512)} ${512 / base}x,
          ${generate(1024)} ${1024 / base}x,
          ${generate(2048)} ${2048 / base}x
        `.trim()
        : "",
    };
  }
};

export const botAppAvatar = (
  app: {
    applicationId: bigint | string;
    applicationUserId: bigint | string | null;
    icon?: string | null;
    avatar?: string | null;
    discriminator?: string | null;
  },
  options?: BaseImageURLOptions,
) => {
  if (app.applicationUserId) {
    if (!app.avatar) {
      return cdn.defaultAvatar(
        app.discriminator === "0" || !app.discriminator
          ? Number((BigInt(app.applicationUserId) >> BigInt(22)) % BigInt(6))
          : Number(app.discriminator) % 5,
      );
    } else {
      return cdn.avatar(String(app.applicationUserId), app.avatar, options);
    }
  }
  if (app.icon) {
    return cdn.appIcon(String(app.applicationId), app.icon, options);
  }
  return cdn.defaultAvatar(
    Number((BigInt(app.applicationId) >> BigInt(22)) % BigInt(6)),
  );
};

export const webhookAvatarUrl = (
  webhook: { id: string; avatar: string | null },
  options?: BaseImageURLOptions,
): string => {
  if (webhook.avatar) {
    return cdn.avatar(webhook.id, webhook.avatar, options);
  } else {
    return cdn.defaultAvatar(calculateUserDefaultAvatarIndex(webhook.id));
  }
};

export const characterAvatars = [
  "new-blue-1",
  "new-blue-2",
  "new-blue-3",
  "new-green-1",
  "new-green-2",
  "new-yellow-1",
  "new-yellow-2",
  "new-yellow-3",
];

export const getCharacterAvatarUrl = (key: string) =>
  `/discord-avatars/${key}.png`;

export const time = (date: Date | number, style?: TimestampStyle) => {
  const stamp = Math.floor(new Date(date).getTime() / 1000);
  return `<t:${stamp}:${style ?? "f"}>`;
};

export const isSnowflakeSafe = (id: string): id is `${bigint}` => {
  try {
    return isSnowflake(id);
  } catch {
    return false;
  }
};

export const isSkuButton = (
  component: Pick<APIButtonComponent, "type" | "style">,
): component is APIButtonComponentWithSKUId =>
  component.type === ComponentType.Button &&
  component.style === ButtonStyle.Premium;

export const hasCustomId = (
  component: APIMessageComponent,
): component is APIButtonComponentWithCustomId | APISelectMenuComponent =>
  (component.type === ComponentType.Button &&
    !isSkuButton(component) &&
    !isLinkButton(component)) ||
  component.type === ComponentType.StringSelect ||
  component.type === ComponentType.RoleSelect ||
  component.type === ComponentType.UserSelect ||
  component.type === ComponentType.ChannelSelect ||
  component.type === ComponentType.MentionableSelect;

export const isActionRow = (
  component: APIMessageTopLevelComponent,
): component is APIActionRowComponent<APIComponentInMessageActionRow> =>
  component.type === ComponentType.ActionRow;

export const onlyActionRows = (
  components: APIMessageTopLevelComponent[],
  includeNested?: boolean,
) => {
  const rows: APIActionRowComponent<APIComponentInMessageActionRow>[] = [];
  if (includeNested) {
    for (const component of components) {
      if (component.type === ComponentType.Container) {
        rows.push(...component.components.filter(isActionRow));
      } else if (component.type === ComponentType.ActionRow) {
        rows.push(component);
      }
    }
  } else {
    rows.push(...components.filter(isActionRow));
  }
  return rows;
};

export const extractInteractiveComponents = (
  components: APIMessageTopLevelComponent[],
): APIComponentInMessageActionRow[] => {
  const children: APIComponentInMessageActionRow[] = [];
  for (const component of components) {
    if (component.type === ComponentType.Container) {
      for (const r of component.components) {
        if (r.type === ComponentType.ActionRow) {
          children.push(...r.components);
        } else if (
          r.type === ComponentType.Section &&
          r.accessory.type === ComponentType.Button
        ) {
          children.push(r.accessory);
        }
      }
    } else if (component.type === ComponentType.ActionRow) {
      children.push(...component.components);
    } else if (
      component.type === ComponentType.Section &&
      component.accessory.type === ComponentType.Button
    ) {
      children.push(component.accessory);
    }
  }
  return children;
};

export const isComponentsV2 = (message: Pick<APIMessage, "flags">): boolean =>
  ((message.flags ?? 0) & MessageFlags.IsComponentsV2) !== 0;

export const isStorableComponent = (
  component:
    | APIComponentInMessageActionRow
    | APIMessageTopLevelComponent
    | APIComponentInContainer,
): component is
  | APIButtonComponentWithCustomId
  | APIButtonComponentWithURL
  | APISelectMenuComponent => {
  return (
    [
      ComponentType.StringSelect,
      ComponentType.ChannelSelect,
      ComponentType.MentionableSelect,
      ComponentType.RoleSelect,
      ComponentType.UserSelect,
    ].includes(component.type) ||
    (component.type === ComponentType.Button &&
      component.style !== ButtonStyle.Premium)
  );
};

export const getTotalComponentsCount = (
  components: APIMessageTopLevelComponent[],
): number =>
  components
    ?.map((c) => 1 + ("components" in c ? c.components.length : 0))
    .reduce((a, b) => a + b, 0) ?? 0;

export const getRemainingComponentsCount = (
  components: APIMessageTopLevelComponent[],
  v2?: boolean,
): number => {
  const isV2 =
    v2 ??
    components.find((c) => c.type !== ComponentType.ActionRow) !== undefined;
  return isV2
    ? MAX_TOTAL_COMPONENTS - getTotalComponentsCount(components)
    : MAX_V1_ROWS - components.length;
};

export const isComponentHousable = (
  component: APIMessageComponent,
): component is
  | APIContainerComponent
  | APIActionRowComponent<APIComponentInMessageActionRow>
  | APISectionComponent =>
  [
    ComponentType.Container,
    ComponentType.ActionRow,
    ComponentType.Section,
  ].includes(component.type);
