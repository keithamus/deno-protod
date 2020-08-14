import { JSON, FieldType64Bit } from "./types.ts";

/**
 * A helper object for ProtoBuf Fixed64 fields.
 */
export const fixed64Field: FieldType64Bit<bigint> = {
  wireType: 1,

  fromBytes(value: Uint8Array): bigint {
    return new DataView(value.buffer).getBigUint64(0, true);
  },

  fromJSON(value: NonNullable<JSON>): bigint {
    if (typeof value == "string") {
      return BigInt(value);
    }
    if (typeof value == "bigint" && BigInt.asUintN(64, value) === value) {
      return value;
    }
    if (typeof value == "number" && Number.isInteger(value)) {
      return BigInt(value);
    }
    throw new TypeError(`malformed json`);
  },

  toBytes(value: bigint): Uint8Array {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setBigUint64(0, value, true);
    return buf;
  },

  toJSON(value: bigint): string {
    return String(value);
  },
};
