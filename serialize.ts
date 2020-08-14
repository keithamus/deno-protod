import { encode } from "./deps.ts";
import { concat } from "./concat.ts";
import type { ProtoBufEntry } from "./types.ts";

/**
 * Given `values` - an array of `ProtoBufentry` 3-tuples - encode each entry
 * into a ProtoBuf encoded Uint8Array.
 *
 * Importantly: this _does not_ encode signed numbers, using "ZigZag" encoding.
 * The protobuf wire types do not disambiguate which values need "ZigZag"
 * decoding so this must be done manually.
 */
export function serialize(values: Iterable<ProtoBufEntry>): Uint8Array {
  let bytes = new Uint8Array(0);
  for (const value of values) {
    bytes = concat(bytes, encode((value[0] << 3) | value[1])[0]);
    switch (value[1]) {
      case 0:
        bytes = concat(bytes, encode(value[2])[0]);
        break;
      case 1:
        bytes = concat(bytes, value[2].slice(0, 8));
        break;
      case 2:
        bytes = concat(bytes, encode(value[2].byteLength)[0]);
        bytes = concat(bytes, value[2]);
        break;
      case 5:
        bytes = concat(bytes, value[2].slice(0, 4));
        break;
      default:
        throw new RangeError(`malformed wire type`);
    }
  }
  return bytes;
}
