import { JSON, FieldType64Bit } from "./types.ts";

/**
 * A helper object for ProtoBuf Double fields (aka JavaScript Numbers).
 */
export const doubleField: FieldType64Bit<number> = {
  name: "double",
  wireType: 1,

  fromBytes(value: Uint8Array): number {
    return new DataView(value.buffer).getFloat64(0, true);
  },

  fromJSON(value: NonNullable<JSON>): number {
    const num = Number(value);
    if (typeof value == "number" && !Number.isNaN(value)) {
      return num;
    } else if (typeof value == "string" && !Number.isNaN(num)) {
      return num;
    } else if (typeof value == "bigint" && String(value) === String(num)) {
      return num;
    }
    throw new TypeError(`malformed json`);
  },

  toBytes(value: number): Uint8Array {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setFloat64(0, value, true);
    return buf;
  },

  toJSON(value: number): number {
    return value;
  },
};
