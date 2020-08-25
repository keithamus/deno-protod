import type { FieldType, ProtoBufEntry, FieldSet } from "./types.ts";
import { serialize } from "./serialize.ts";

/**
 * Given a Message class, and a set of fields to extract with their respective
 * helper functions, this will serialize the Message into the ProtoBuf binary
 * format.
 */
export function toBytes<T>(fields: T, set: FieldSet<T>): Uint8Array {
  let values: ProtoBufEntry[] = [];
  for (const key in set) {
    const [id, field] = set[key]!;
    const val = fields[key];
    if (val === undefined) continue;
    if ("wireType" in field && "toEntry" in field) {
      values = values.concat(field.toEntry(id, val));
    } else if ("wireType" in field && "toBytes" in field) {
      values.push([id, field.wireType, field.toBytes(val)] as ProtoBufEntry);
    } else if (fields[key] instanceof field) {
      const message = fields[key] as any;
      values.push([id, 2, message.toBytes()]);
    }
  }
  return serialize(values);
}
