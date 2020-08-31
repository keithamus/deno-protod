export {
  Proto,
  Visitor,
  Import,
  Enum,
  EnumField,
  Message,
  Field,
  Oneof,
  MapField,
  Syntax,
  Option,
  parse,
} from "https://deno.land/x/protoc_parser@v0.2.1/mod.ts";

export { decode, encode } from "https://deno.land/x/varint@v2.0.0/varint.ts";

export { dirname, join } from "https://deno.land/x/std@0.67.0/path/mod.ts";
