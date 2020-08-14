import type { JSON } from "./types.ts";

type toJSONMap<T> = {
  [P in keyof T]?: { toJSON(value: T[P]): JSON };
};

type JSONAble<T> = {
  [P in keyof T]?: JSON;
};

/**
 * Given a Message class, and a set of fields to extract with their respective
 * helper functions, this will create a JavaScript object ready to be consumed
 * into a JSON string.
 */
export function toJSON<T>(fields: T, set: toJSONMap<T>): JSONAble<T> {
  const json: JSONAble<T> = {};
  for (const key in set) {
    const field = set[key]!;
    json[key] = field.toJSON(fields[key]);
  }
  return json;
}
