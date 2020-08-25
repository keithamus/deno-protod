import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.66.0/testing/asserts.ts";
import { stringField } from "./string.ts";
import { JSON } from "./types.ts";

Deno.test("stringField.fromBytes", async () => {
  const tt: [Uint8Array, string][] = [
    [Uint8Array.of(0x66, 0x6f, 0x6f), "foo"],
  ];
  for (const [actual, expected] of tt) {
    assertEquals(stringField.fromBytes(actual), expected);
  }
});

Deno.test("stringField.toBytes", async () => {
  const tt: [string, Uint8Array][] = [
    ["foo", Uint8Array.of(0x66, 0x6f, 0x6f)],
  ];
  for (const [actual, expected] of tt) {
    assertEquals(stringField.toBytes(actual), expected);
  }
});

Deno.test("stringField.fromJSON", async () => {
  const tt: [string, string][] = [
    ["foo", "foo"],
  ];
  for (const [actual, expected] of tt) {
    assertEquals(stringField.fromJSON(actual), expected);
  }
});

Deno.test("stringField.fromJSON failure", async () => {
  const tt: NonNullable<JSON>[] = [
    1,
    [],
  ];
  for (const actual of tt) {
    assertThrows(
      () => stringField.fromJSON(actual),
      TypeError,
      "malformed json",
    );
  }
});
