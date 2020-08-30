import {
  JSON,
  FieldType,
  MetaFieldBuf,
  ProtoBufEntry,
  Message,
} from "./types.ts";
import { concat } from "./concat.ts";
import { encode, decode } from "./deps.ts";

/**
 * A helper object for Fields that need to use "Packed" encoding.
 */
export const packedField = <T>(
  of: Exclude<FieldType<T>, Message<T>>,
): MetaFieldBuf<T[]> => ({
  name: "packed",
  wireType: 2,

  toBytes(): never {
    throw new Error("packed fields must use toEntry");
  },

  fromBytes(): never {
    throw new Error("packed fields must use fromEntry");
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

  toJSON(value: T[]): JSON[] {
    return value.map((value) => of.toJSON(value));
  },

  fromEntry(entries: ProtoBufEntry[]): T[] {
    let values: T[] = [];
    for (const entry of entries) {
      if (entry[1] !== 2) continue;
      const bytes = entry[2];
      for (let i = 0, v = 0n; i < bytes.byteLength; i) {
        let value: T;
        if (of.wireType === 1) {
          value = of.fromBytes(bytes.slice(i, i += 8));
        } else if (of.wireType === 2) {
          [v, i] = decode(bytes, i);
          value = of.fromBytes(bytes.slice(i, i += Number(v)));
        } else if (of.wireType === 5) {
          value = of.fromBytes(bytes.slice(i, i += 4));
        } else {
          [v, i] = decode(bytes, i);
          value = of.fromBytes(v);
        }
        values.push(value);
      }
    }
    return values;
  },

  toEntry(id: number, value: T[]): ProtoBufEntry[] {
    let buf = new Uint8Array(0);
    for (const item of value) {
      const val = of.toBytes(item);
      if (val instanceof Uint8Array) {
        buf = concat(buf, val);
      } else {
        buf = concat(buf, encode(val)[0]);
      }
    }
    return [[id, 2, buf]];
  },
});
