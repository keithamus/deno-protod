import { FieldTypeVarint, JSON } from "./types.ts";

/**
 * A helper object for ProtoBuf Int64 fields.
 */
export const int64Field: FieldTypeVarint<bigint> = {
  name: "int64",
  wireType: 0,

  fromBytes(value: bigint): bigint {
    return BigInt.asIntN(64, value);
  },

  fromJSON(value: NonNullable<JSON>): bigint {
    if (typeof value == "string") {
      return BigInt(value);
    }
    if (typeof value == "bigint" && BigInt.asIntN(64, value) === value) {
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
