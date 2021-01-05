import { assertEquals } from "https://deno.land/std@0.66.0/testing/asserts.ts";
import { mapField } from "./map.ts";
import { int32Field } from "./int32.ts";
import { stringField } from "./string.ts";
import { FieldType, Message, ProtoBufEntry } from "./types.ts";

Deno.test("mapField.fromEntry", () => {
  const tt: [
    ProtoBufEntry,
    Exclude<FieldType<unknown>, Message<unknown>>,
    FieldType<unknown>,
    Map<unknown, unknown>,
  ][] = [
    [
      [
        1,
        2,
        Uint8Array.of(
          ...[0x08, 0x81, 0x80, 0x80, 0x80, 0xf8, 0xff, 0xff, 0xff, 0xff, 0x01],
          ...[0x10, 0x81, 0x80, 0x80, 0x80, 0xf8, 0xff, 0xff, 0xff, 0xff, 0x01],
        ),
      ],
      int32Field,
      int32Field,
      new Map([[-2147483647, -2147483647]]),
    ],
    [
      [
        1,
        2,
        Uint8Array.of(
          ...[0x08, 0x81, 0x80, 0x80, 0x80, 0xf8, 0xff, 0xff, 0xff, 0xff, 0x01],
          ...[0x12, 0x3, 0x66, 0x6f, 0x6f],
        ),
      ],
      int32Field,
      stringField,
      new Map([[-2147483647, "foo"]]),
    ],
    [
      [
        1,
        2,
        Uint8Array.of(
          ...[0x0a, 0x3, 0x66, 0x6f, 0x6f],
          ...[0x10, 0x81, 0x80, 0x80, 0x80, 0xf8, 0xff, 0xff, 0xff, 0xff, 0x01],
        ),
      ],
      stringField,
      int32Field,
      new Map([["foo", -2147483647]]),
    ],
  ];
  for (const [actual, key, value, expected] of tt) {
    assertEquals(mapField(key, value).fromEntry([actual]), expected);
  }
});
