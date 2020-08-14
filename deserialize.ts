import { decode } from "./deps.ts";
import type { ProtoBufEntry } from "./types.ts";

/**
 * Given `bytes` (a ProtoBuf encoded binary payload), decode each block of
 * bytes as a `ProtoBufentry`. Each `ProtoBufentry` represents a field in the
 * protobuf binary payload. Entries have 3 constituent parts; the ID which
 * identifies the field number, the "wire type" which is a number between 0-5
 * and the "value" which will be a bigint for wireType 0, otherwise it will be
 * a Uint8Array
 *
 * Importantly: this _does not_ decode signed numbers, using "ZigZag" encoding.
 * The protobuf wire types do not disambiguate which values need "ZigZag"
 * decoding so this must be done manually.
 */
export function* deserialize(bytes: Uint8Array): Generator<ProtoBufEntry> {
  for (let i = 0, v = 0n; i < bytes.length;) {
    [v, i] = decode(bytes, i);
    const id = Number(v >> 3n);
    switch (v & 7n) {
      case 0n:
        [v, i] = decode(bytes, i);
        yield [id, 0, v];
        break;
      case 1n:
        yield [id, 1, bytes.slice(i, i += 8)];
        break;
      case 2n:
        [v, i] = decode(bytes, i);
        yield [id, 2, bytes.slice(i, i += Number(v))];
        break;
      case 5n:
        yield [id, 5, bytes.slice(i, i += 4)];
        break;
      default:
        throw new RangeError(`malformed wire type ${Number(v & 7n)}`);
    }
  }
}
