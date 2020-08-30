import { JSON, FieldType32Bit } from "./types.ts";

/**
 * A helper object for ProtoBuf Fixed32 fields.
 */
export const fixed32Field: FieldType32Bit<number> = {
  name: 'fixed32',
  wireType: 5,

  fromBytes(value: Uint8Array): number {
    return new DataView(value.buffer).getUint32(0, true);
  },

  fromJSON(value: NonNullable<JSON>): number {
    const num = Number(value);
    if (typeof value == "string" && Number.isInteger(num) && num >= 0) {
      return num;
    }
    if (
      typeof value == "bigint" && BigInt.asIntN(32, value) === value && num >= 0
    ) {
      return num;
    }
    if (typeof value == "number" && Number.isInteger(value) && num >= 0) {
      return num;
    }
    throw new TypeError(`malformed json`);
  },

  toBytes(value: number): Uint8Array {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setUint32(0, value, true);
    return buf;
  },

  toJSON(value: number): number {
    return value;
  },
};
