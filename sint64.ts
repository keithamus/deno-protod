import { JSON, FieldTypeVarint } from "./types.ts";

/**
 * A helper object for ProtoBuf Signed (ZigZag encoded) Int64 Fields.
 */
export const sint64Field: FieldTypeVarint<bigint> = {
  wireType: 0,

  fromBytes(value: bigint): bigint {
    let sint = BigInt.asUintN(64, value) >> 1n;
    if ((value & 1n) !== 0n) sint = ~sint;
    return BigInt.asIntN(64, sint);
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
    let int = BigInt(value) << 1n;
    if (value < 0) int = ~int;
    return BigInt.asUintN(64, int);
  },

  toJSON(value: bigint): string {
    return String(value);
  },
};
