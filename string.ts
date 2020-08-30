import { JSON, FieldTypeLengthDelimited } from "./types.ts";

/**
 * A helper object for ProtoBuf String Fields.
 */
export const stringField: FieldTypeLengthDelimited<string> = {
  name: 'string',
  wireType: 2,

  fromBytes(value: Uint8Array): string {
    return new TextDecoder("utf-8").decode(value) || "";
  },

  fromJSON(value: NonNullable<JSON>): string {
    if (typeof value == "string") return value;
    throw new TypeError(`malformed json`);
  },

  toBytes(value: string): Uint8Array {
    return new TextEncoder().encode(value);
  },

  toJSON(value: string): string {
    return value;
  },
};
