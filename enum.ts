import { FieldTypeVarint, JSON } from "./types.ts";

/**
 * A helper object for ProtoBuf Enum fields.
 */
export const enumField = <T>(Enum: T): FieldTypeVarint<T[keyof T]> => ({
  name: "enum",
  wireType: 0,

  fromBytes(value: bigint): T[keyof T] {
    const int = Number(value);
    const key = Enum[int as keyof T];
    if (typeof int === "number" && typeof key === "string") {
      return int as unknown as T[keyof T];
    }
    return 0 as unknown as T[keyof T];
  },

  fromJSON(value: NonNullable<JSON>): T[keyof T] {
    const key = Enum[value as keyof T];
    if (typeof value === "number" && typeof key === "string") {
      return value as unknown as T[keyof T];
    }
    if (typeof value === "string" && typeof key === "number") {
      return key as unknown as T[keyof T];
    }
    throw new TypeError(`malformed json`);
  },

  toBytes(value: T[keyof T]): bigint {
    return BigInt.asUintN(64, BigInt(value));
  },

  toJSON(value: T[keyof T]): string {
    return String(Enum[value as unknown as keyof T]);
  },
});
