import { JSON, FieldType, ProtoBufEntry, MetaFieldBuf } from "./types.ts";
import { deserialize } from "./deserialize.ts";
import { serialize } from "./serialize.ts";

/**
 * A helper object for ProtoBuf Map fields.
 */
export const mapField = <K, V>(
  keyFn: FieldType<K>,
  valueFn: FieldType<V>,
): MetaFieldBuf<Map<K, V>> => ({
  wireType: 2,

  toBytes(): never {
    throw new Error("packed fields must use toEntry");
  },

  fromBytes(bytes: Uint8Array): Map<K, V> {
    let key, value;
    for (const entry of deserialize(bytes)) {
      if (entry[0] === 1 && entry[1] === keyFn.wireType) {
        if (entry[1] === 0 && keyFn.wireType === 0) {
          key = keyFn.fromBytes(entry[2]);
        } else if (entry[1] !== 0 && keyFn.wireType !== 0) {
          key = keyFn.fromBytes(entry[2]);
        }
        if (key != null && value != null) {
          return new Map<K, V>([[key, value]]);
        }
      } else if (entry[0] === 2 && entry[1] === valueFn.wireType) {
        if (entry[1] === 0 && valueFn.wireType === 0) {
          value = valueFn.fromBytes(entry[2]);
        } else if (entry[1] !== 0 && valueFn.wireType !== 0) {
          value = valueFn.fromBytes(entry[2]);
        }
        if (key != null && value != null) {
          return new Map<K, V>([[key, value]]);
        }
      }
    }
    throw new Error(`malformed bytes`);
  },

  fromJSON(obj: NonNullable<JSON>): Map<K, V> {
    const map = new Map<K, V>();
    for (let [key, value] of Object.entries(obj)) {
      map.set(keyFn.fromJSON(key), valueFn.fromJSON(value));
    }
    return map;
  },

  toJSON(value: Map<K, V>): NonNullable<JSON> {
    const out: NonNullable<JSON> = {};
    for (const entry of value.entries()) {
      out[String(keyFn.toJSON(entry[0]))] = valueFn.toJSON(entry[1]);
    }
    return out;
  },

  toEntry(id: number, value: Map<K, V>): ProtoBufEntry[] {
    const entries: ProtoBufEntry[] = [];
    for (const [k, v] of value) {
      entries.push([
        id,
        2,
        serialize([
          [1, keyFn.wireType, keyFn.toBytes(k)] as ProtoBufEntry,
          [2, valueFn.wireType, valueFn.toBytes(v)] as ProtoBufEntry,
        ]),
      ]);
    }
    return entries;
  },
});
