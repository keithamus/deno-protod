import { JSON, FieldTypeVarint } from "./types.ts";

/**
 * A helper object for ProtoBuf boolean fields.
 */
export const boolField: FieldTypeVarint<boolean> = {
  wireType: 0,

  fromBytes(value: bigint): boolean {
    return value === 1n;
  },

  fromJSON(value: NonNullable<JSON>): boolean {
    if (typeof value === "boolean") return value;
    throw new TypeError(`malformed json`);
  },

  toBytes(value: boolean): bigint {
    return value ? 1n : 0n;
  },

  toJSON(value: boolean): boolean {
    return value;
  },
};
