import { JSON, FieldTypeVarint } from "./types.ts";

/**
 * A helper object for ProtoBuf Unsigned Uint32 Fields.
 */
export const uint64Field: FieldTypeVarint<bigint> = {
  wireType: 0,

  fromBytes(value: bigint): bigint {
    return BigInt.asUintN(64, value);
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

  toBytes(value: bigint): bigint {
    return BigInt.asUintN(64, value);
  },

  toJSON(value: bigint): string {
    return String(value);
  },
};
