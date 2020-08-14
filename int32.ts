import { JSON, FieldTypeVarint } from "./types.ts";

/**
 * A helper object for ProtoBuf Int32 fields.
 */
export const int32Field: FieldTypeVarint<number> = {
  wireType: 0,

  fromBytes(value: bigint): number {
    return Number(BigInt.asIntN(32, value));
  },

  fromJSON(value: NonNullable<JSON>): number {
    if (typeof value == "string" && Number.isInteger(Number(value))) {
      return Number(value);
    }
    if (typeof value == "bigint" && BigInt.asIntN(32, value) === value) {
      return Number(value);
    }
    if (typeof value == "number" && Number.isInteger(value)) {
      return value;
    }
    throw new TypeError(`malformed json`);
  },

  toBytes(value: number): bigint {
    return BigInt.asUintN(64, BigInt(value));
  },

  toJSON(value: number): number {
    return value;
  },
};
