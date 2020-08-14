import { JSON, FieldType32Bit } from "./types.ts";

/**
 * A helper object for ProtoBuf Float fields.
 */
export const floatField: FieldType32Bit<number> = {
  wireType: 5,

  fromBytes(value: Uint8Array): number {
    return new DataView(value.buffer).getFloat32(0, true);
  },

  fromJSON(value: NonNullable<JSON>): number {
    const num = Number(value);
    if (typeof value == "number") {
      return value;
    } else if (typeof value == "string" && Number.isNaN(num)) {
      return num;
    }
    throw new TypeError(`malformed json`);
  },

  toBytes(value: number): Uint8Array {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setFloat32(0, value, true);
    return buf;
  },

  toJSON(value: number): number {
    return value;
  },
};
