import type { FieldSet, JSON, MessageInstance } from "./types.ts";

type JSONAble<T> = {
  [P in keyof T]?: JSON;
};

/**
 * Given a Message class, and a set of fields to extract with their respective
 * helper functions, this will create a JavaScript object ready to be consumed
 * into a JSON string.
 */
export function toJSON<T>(fields: T, set: FieldSet<T>): JSONAble<T> {
  const json: JSONAble<T> = {};
  for (const key in set) {
    const field = set[key]![1];
    if ("wireType" in field) {
      const value = field.toJSON(fields[key]);
      if (value !== undefined) json[key] = value;
    } else if ("toJSON" in fields[key]) {
      json[key] = (fields[key] as unknown as MessageInstance).toJSON();
    }
  }
  return json;
}
