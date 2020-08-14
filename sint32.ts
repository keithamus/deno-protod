import { JSON, FieldTypeVarint } from "./types.ts";

/**
 * A helper object for ProtoBuf Signed (ZigZag encoded) Int32 Fields.
 */
export const sint32Field: FieldTypeVarint<number> = {
  wireType: 0,

  fromBytes(value: bigint): number {
    let int = BigInt.asUintN(64, value) >> 1n;
    if ((value & 1n) !== 0n) int = ~int;
    return Number(BigInt.asIntN(32, int));
  },

  fromJSON(value: NonNullable<JSON>): number {
    const num = Number(value);
    if (typeof value == "number" && Number.isInteger(num)) {
      return num;
    } else if (typeof value == "string" && Number.isInteger(num)) {
      return num;
    } else if (typeof value == "bigint" && BigInt.asIntN(32, value) === value) {
      return num;
    }
    throw new TypeError(`malformed json`);
  },

  toBytes(value: number): bigint {
    let int = BigInt(value) << 1n;
    if (value < 0) int = ~int;
    return BigInt.asUintN(32, int);
  },

  toJSON(value: number): number {
    return value;
  },
};
