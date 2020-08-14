import type { JSON, FieldType } from "./types.ts";

type fromJSONMap<T> = {
  [P in keyof T]?: { fromJSON(value: NonNullable<JSON>): T[P] };
};

/**
 * Given arbitrary JSON, and a set of fields to extract with their respective
 * helper functions, this will create a JavaScript object ready to be consumed
 * by a Message class.
 */
export function fromJSON<T>(
  json: JSON,
  set: fromJSONMap<T>,
): Partial<T> {
  if (typeof json !== "object" || !json || Array.isArray(json)) {
    throw new TypeError("malformed json");
  }
  const init: Partial<T> = {};
  for (const key in set) {
    const value = json[key];
    const field = set[key]!;
    if (value != null) {
      init[key as keyof T] = field.fromJSON(value);
    }
  }
  return init;
}
