import { JSON, FieldType, ProtoBufEntry, MetaFieldBuf } from "./types.ts";

/**
 * A helper object for Fields that are "Repeated" (not "Packed").
 */
export const repeatedField = <T>(of: FieldType<T>): MetaFieldBuf<T[]> => ({
  wireType: 2,

  fromBytes(): never {
    throw new Error("repeated fields must not use fromBytes");
  },

  toBytes(): never {
    throw new Error("repeated fields must not use toBytes");
  },

  fromJSON(value: NonNullable<JSON>): T[] {
    if (Array.isArray(value)) {
      const newValue: T[] = [];
      for (const item of Array.from(value)) {
        if (item == null) {
          throw new Error(`malformed json`);
        }
        newValue.push(of.fromJSON(item));
      }
      return newValue;
    } else {
      return [of.fromJSON(value)];
    }
  },
  toJSON(value: T[]): NonNullable<JSON> {
    return value.map((value) => of.toJSON(value));
  },

  toEntry<N extends number>(id: N, value: T[]): ProtoBufEntry[] {
    return value.map((val) =>
      [id, of.wireType, of.toBytes(val)] as ProtoBufEntry
    );
  },
});
