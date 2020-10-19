import { FieldTypeVarint, JSON } from "./types.ts";

/**
 * A helper object for ProtoBuf Unsigned Int32 Fields.
 */
export const uint32Field: FieldTypeVarint<number> = {
  name: "uint32",
  wireType: 0,

  fromBytes(value: bigint): number {
    return Number(BigInt.asUintN(32, value));
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

  toBytes(value: number): bigint {
    return BigInt.asUintN(32, BigInt(value));
  },

  toJSON(value: number): number {
    return value;
  },
};
