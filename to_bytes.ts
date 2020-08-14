import type { FieldType, ProtoBufEntry } from "./types.ts";
import { serialize } from "./serialize.ts";

type toEntryAble<T> = {
  toEntry<N extends number>(id: N, value: T): ProtoBufEntry[];
};
type message = { toBytes(): Uint8Array };
type byteAble<T> =
  | FieldType<T>
  | toEntryAble<T>
  | message;

type toBytesMap<T> = {
  [P in keyof T]?: [number, byteAble<T[P]>];
};

/**
 * Given a Message class, and a set of fields to extract with their respective
 * helper functions, this will serialize the Message into the ProtoBuf binary
 * format.
 */
export function toBytes<T>(fields: T, set: toBytesMap<T>): Uint8Array {
  let values: ProtoBufEntry[] = [];
  for (const key in set) {
    const [id, field] = set[key]!;
    const val = fields[key];
    if (val === undefined) continue;
    if ("wireType" in field && "toEntry" in field) {
      values = values.concat(field.toEntry(id, val));
    } else if ("wireType" in field && "toBytes" in field) {
      values.push([id, field.wireType, field.toBytes(val)] as ProtoBufEntry);
    } else if ("toBytes" in field) {
      values.push([id, 2, field.toBytes()]);
    }
  }
  return serialize(values);
}
