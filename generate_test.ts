import { assertEquals } from "https://deno.land/std@0.66.0/testing/asserts.ts";
import { generate } from "./generate.ts";
import { deserialize } from "./deserialize.ts";
import { JSON } from "./types.ts";
import {
  runBenchmarks,
  bench,
  BenchmarkTimer,
} from "https://deno.land/std@0.66.0/testing/bench.ts";

interface Proto {
  toBytes(): Uint8Array;
  toJSON(): NonNullable<JSON>;
}
interface ProtoS {
  name: string;
  fromBytes(b: Uint8Array): Proto;
  fromJSON(j: NonNullable<JSON>): Proto;
}

const pbs = new Map();
const protos = new Set<string>();
const messageTests = new Set<string>();
for await (const { isFile, name } of Deno.readDir("./testdata")) {
  if (!isFile) continue;
  if (name.endsWith(".proto")) {
    protos.add(name);
  } else if (name.endsWith(".msg.json")) {
    messageTests.add(name);
  } else if (name.endsWith(".pb.ts")) {
    pbs.set(name, await import(`./testdata/${name}`));
  }
}

let testCount = 0;

for (const proto of protos) {
  const base = proto.replace(/.proto$/, "");
  testCount += 1;
  Deno.test(base, async () => {
    assertEquals(
      (await generate(`./testdata/${proto}`, { mod: "../mod.ts" })).trim()
        .split("\n").slice(1),
      (await Deno.readTextFile(`./testdata/${base}.pb.ts`)).trim().split("\n")
        .slice(1),
    );
  });
}
for (const messageTest of messageTests) {
  const [_, base, n, message] =
    messageTest.match(/^(\w+)-(\d+)-(\w+).msg.json$/) || [];
  let Class: ProtoS | null = null;
  const mod = pbs.get(`${base}.pb.ts`)!;
  for (const className in mod) {
    if (className.toLowerCase() === message) {
      Class = mod[className];
    }
  }
  testCount += 1;
  Deno.test(`${base} ${message} ${n}`, async () => {
    const bin = await Deno.readFile(
      `./testdata/${base}-${n}-${Class!.name.toLowerCase()}.msg.bin`,
    );
    const json = JSON.parse(
      await Deno.readTextFile(
        `./testdata/${base}-${n}-${Class!.name.toLowerCase()}.msg.json`,
      ),
    );
    const reqB = Class!.fromBytes(bin);
    const reqJ = Class!.fromJSON(json);
    const reqBJson = reqB.toJSON();
    const reqJJson = reqJ.toJSON();
    assertEquals(reqJJson, json);
    assertEquals(reqBJson, reqJJson);
    assertEquals(JSON.parse(JSON.stringify(reqBJson)), reqBJson);
    assertEquals(JSON.parse(JSON.stringify(reqJJson)), reqJJson);
    assertEquals(reqBJson, json);
    assertEquals(reqJJson, json);
    assertEquals(reqB.toBytes(), reqJ.toBytes());
    assertEquals([...deserialize(reqB.toBytes())], [...deserialize(bin)]);
    assertEquals([...deserialize(reqJ.toBytes())], [...deserialize(bin)]);
  });
  bench({
    name: `${base}${Class!.name}Bytes`,
    runs: 1000,
    async func(b: BenchmarkTimer) {
      const bin = await Deno.readFile(
        `./testdata/${base}-${n}-${Class!.name.toLowerCase()}.msg.bin`,
      );
      b.start();
      Class!.fromBytes(bin);
      b.stop();
    },
  });
  bench({
    name: `${base}${Class!.name}JSON`,
    runs: 1000,
    async func(b: BenchmarkTimer) {
      const json = JSON.parse(
        await Deno.readTextFile(
          `./testdata/${base}-${n}-${Class!.name.toLowerCase()}.msg.json`,
        ),
      );
      b.start();
      Class!.fromJSON(json);
      b.stop();
    },
  });
}

Deno.test("testCount", () => {
  assertEquals(testCount >= 9, true, `only saw ${testCount} tests`);
});

await runBenchmarks({});
