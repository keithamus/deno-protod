import type { FieldSet, ProtoBufEntry } from "./types.ts";
import { deserialize } from "./deserialize.ts";

/**
 * Given a Message class, and a set of fields to extract with their respective
 * helper functions, this will serialize the Message into the ProtoBuf binary
 * format.
 */
export function fromBytes<T>(bytes: Uint8Array, set: FieldSet<T>): Partial<T> {
  const fields = new Map<number, ProtoBufEntry[]>();
  for (const entry of deserialize(bytes)) {
    if (!fields.has(entry[0])) fields.set(entry[0], []);
    fields.get(entry[0])!.push(entry);
  }
  const init: Partial<T> = {};
  for (const key in set) {
    const [id, field] = set[key]!;
    if (fields.has(id)) {
      const entries = fields.get(id)!;
      if ("wireType" in field && "fromEntry" in field) {
        init[key] = field.fromEntry(entries);
      } else if ("wireType" in field) {
        const entry = entries.pop()!;
        if (entry[1] === 0 && field.wireType === 0) {
          init[key] = field.fromBytes(entry[2]);
        } else if (entry[1] !== 0 && entry[1] === field.wireType) {
          init[key] = field.fromBytes(entry[2]);
        }
      } else if ("fromBytes" in field) {
        const entry = entries.pop()!;
        if (entry[1] !== 0) init[key] = field.fromBytes(entry[2]);
      }
    }
  }
  return init;
}
