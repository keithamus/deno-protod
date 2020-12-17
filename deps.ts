export {
  Enum,
  EnumField,
  Field,
  Import,
  MapField,
  Message,
  Oneof,
  Option,
  parse,
  Proto,
  Syntax,
} from "https://deno.land/x/protoc_parser@v0.2.7/mod.ts";

export type { Visitor } from "https://deno.land/x/protoc_parser@v0.2.7/mod.ts";

export { decode, encode } from "https://deno.land/x/varint@v2.0.0/varint.ts";

export { dirname, join } from "https://deno.land/x/std@0.67.0/path/mod.ts";
