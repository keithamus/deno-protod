import type { FieldSet, FieldType, JSON } from "./types.ts";

/**
 * Given arbitrary JSON, and a set of fields to extract with their respective
 * helper functions, this will create a JavaScript object ready to be consumed
 * by a Message class.
 */
export function fromJSON<T>(json: JSON, set: FieldSet<T>): Partial<T> {
  if (typeof json !== "object" || !json || Array.isArray(json)) {
    throw new TypeError("malformed json");
  }
  const init: Partial<T> = {};
  for (const key in set) {
    const field = set[key]![1];
    const value = json[key as string];
    if (value != null) {
      init[key as keyof T] = field.fromJSON(value);
    }
  }
  return init;
}
