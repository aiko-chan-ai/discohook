import type {
    APIButtonComponentWithCustomId as _APIButtonComponentWithCustomId,
    APIChannelSelectComponent as _APIChannelSelectComponent,
    APIMentionableSelectComponent as _APIMentionableSelectComponent,
    APIRoleSelectComponent as _APIRoleSelectComponent,
    APIStringSelectComponent as _APIStringSelectComponent,
    APIUserSelectComponent as _APIUserSelectComponent,
    APIActionRowComponent,
    APIButtonComponentBase,
    APIContainerComponent,
    APIFileComponent,
    APIMediaGalleryComponent,
    APISectionComponent,
    APISeparatorComponent,
    APITextDisplayComponent,
    ButtonStyle,
} from "discord-api-types/v10";
import { z } from "zod/v3";
import { randomString } from "~/util/text";
import { ZodAPITopLevelComponent } from "./components";
import {
    type QueryDataMessageDataRaw,
    type QueryDataVersion,
    queryDataMessageDataTransform,
    TargetType,
    ZodQueryDataMessageDataBase
} from "./QueryData-raw";

export interface APIButtonComponentWithURL
  extends APIButtonComponentBase<ButtonStyle.Link> {
  url: string;
  custom_id?: string;
}

export interface APIButtonComponentWithSkuId
  extends APIButtonComponentBase<ButtonStyle.Premium> {
  sku_id: string;
  custom_id?: string;
}

export interface APIButtonComponentWithCustomId
  extends _APIButtonComponentWithCustomId {
  // Flow removed for static editor
}

export interface APIStringSelectComponent extends _APIStringSelectComponent {
  // Flows removed for static editor
}

export interface APIUserSelectComponent extends _APIUserSelectComponent {
  // Flow removed for static editor
}

export interface APIRoleSelectComponent extends _APIRoleSelectComponent {
  // Flow removed for static editor
}

export interface APIMentionableSelectComponent
  extends _APIMentionableSelectComponent {
  // Flow removed for static editor
}

export interface APIChannelSelectComponent extends _APIChannelSelectComponent {
  // Flow removed for static editor
}

export type APIButtonComponent =
  | APIButtonComponentWithCustomId
  | APIButtonComponentWithURL
  | APIButtonComponentWithSkuId;

export type APISelectMenuComponent =
  | APIStringSelectComponent
  | APIUserSelectComponent
  | APIRoleSelectComponent
  | APIMentionableSelectComponent
  | APIChannelSelectComponent;

export type APIAutoPopulatedSelectMenuComponent =
  | APIUserSelectComponent
  | APIRoleSelectComponent
  | APIMentionableSelectComponent
  | APIChannelSelectComponent;

export type APIComponentInMessageActionRow =
  | APIButtonComponent
  | APISelectMenuComponent;

export type APIMessageTopLevelComponent =
  | APIActionRowComponent<APIComponentInMessageActionRow>
  | APIContainerComponent
  | APIFileComponent
  | APIMediaGalleryComponent
  | APISectionComponent
  | APISeparatorComponent
  | APITextDisplayComponent;

export interface QueryDataTarget {
  type?: TargetType;
  url: string;
}

export interface QueryData {
  version?: QueryDataVersion;
  backup_id?: string;
  messages: {
    _id?: string;
    name?: string;
    data: Omit<QueryDataMessageDataRaw, "components"> & {
      components?: APIMessageTopLevelComponent[];
    };
    reference?: string;
    thread_id?: string;
  }[];
  targets?: QueryDataTarget[];
}

export const ZodQueryDataMessage = z.object({
  _id: z.string().default(() => randomString(10)),
  name: z.string().max(50).optional(),
  data: ZodQueryDataMessageDataBase.omit({ components: true })
    .merge(z.object({ components: ZodAPITopLevelComponent.array().optional() }))
    .transform(queryDataMessageDataTransform),
  reference: z.ostring(),
  thread_id: z.ostring(),
}) satisfies z.ZodType<QueryData["messages"][number]>;

export const ZodQueryDataTarget: z.ZodType<QueryDataTarget> = z.object({
  type: z.nativeEnum(TargetType).optional(),
  url: z.string(),
});

export const ZodQueryData: z.ZodType<QueryData> = z.object({
  version: z.enum(["d2"]).optional(),
  backup_id: z.ostring(),
  messages: ZodQueryDataMessage.array().max(10),
  targets: ZodQueryDataTarget.array().optional(),
});
