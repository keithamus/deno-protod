import { FieldTypeLengthDelimited, JSON } from "./types.ts";

/**
 * A helper object for ProtoBuf Bytes fields.
 */
export const bytesField: FieldTypeLengthDelimited<Uint8Array> = {
  name: "bytes",
  wireType: 2,

  fromBytes(value: Uint8Array): Uint8Array {
    return value;
  },

  fromJSON(value: NonNullable<JSON>): Uint8Array {
    if (typeof value == "string") {
      const str = atob(
        value.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"),
      );
      const bin = new Uint8Array(str.length);
      for (let i = 0; i < bin.length; i += 1) {
        bin[i] = str.charCodeAt(i);
      }
      return bin;
    }
    throw new TypeError(`malformed json`);
  },

  toBytes(value: Uint8Array): Uint8Array {
    return value;
  },

  toJSON(value: Uint8Array): string {
    let str = "";
    for (let i = 0; i < value.length; i += 1) {
      str += String.fromCharCode(value[i]);
    }
    return btoa(str);
  },
};
