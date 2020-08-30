import {
  JSON,
  FieldType,
  ProtoBufEntry,
  MetaFieldBuf,
  MessageInstance,
  Message,
} from "./types.ts";

/**
 * A helper object for Fields that are "Repeated" (not "Packed").
 */
export const repeatedField = <T>(of: FieldType<T>): MetaFieldBuf<T[]> => ({
  name: "repeated",
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
    return value.map((value) => {
      if ("toJSON" in of) return of.toJSON(value);
      return (value as unknown as MessageInstance).toJSON();
    });
  },

  fromEntry(entries: ProtoBufEntry[]): T[] {
    const ret: T[] = [];
    for (const entry of entries) {
      if ("wireType" in of && entry[1] === of.wireType) {
        if (entry[1] === 0 && of.wireType === 0) {
          ret.push(of.fromBytes(entry[2]));
        } else if (entry[1] !== 0 && of.wireType !== 0) {
          ret.push(of.fromBytes(entry[2]));
        }
      } else if (entry[1] !== 0) {
        ret.push((of as Message<T>).fromBytes(entry[2]));
      }
    }
    return ret;
  },

  toEntry(id: number, value: T[]): ProtoBufEntry[] {
    return value.map((val) => {
      if ("wireType" in of) {
        return [id, of.wireType, of.toBytes(val)] as ProtoBufEntry;
      }
      return [id, 2, (val as unknown as MessageInstance).toBytes()];
    });
  },
});
