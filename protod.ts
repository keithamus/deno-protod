import { parse } from "https://deno.land/std@0.66.0/flags/mod.ts";
import { generate } from "./generate.ts";
import { version as v } from "./version.ts";

const { version, help, _: args } = parse(Deno.args, {
  string: [],
  boolean: ["help", "version"],
  stopEarly: true,
  alias: {
    "h": "help",
    "V": "version",
  },
});

const command = (args.shift() || "") as keyof typeof commands;

const commands = {
  async gen(opts: (string | number)[]) {
    const { outfile, _: args } = parse(opts.map(String), {
      string: ["outfile"],
      boolean: [],
      stopEarly: true,
      alias: {
        "o": "outfile",
      },
    });
    const infile = String(args.shift() || "");
    if (args.length) {
      console.error(
        `error: found argument ${command} which wasn't expected, or isn't valid in this context.`,
      );
      Deno.exit(1);
    }
    if (!infile) {
      console.error(`error: missing argument. Must specify an input file.`);
      Deno.exit(1);
    }
    console.error(`Reading ${infile}`);
    const contents = await generate(infile);
    if (outfile) {
      Deno.writeTextFile(outfile, contents);
    } else {
      console.log(contents);
    }
  },
};

if (help) {
  console.error(`
USAGE:
  protod [SUBCOMMAND]

SUBCOMMANDS:
  gen    Generate Deno code from a \`.proto\` file.
`);
  Deno.exit(1);
} else if (version) {
  console.error(`protod v${v}`);
  Deno.exit(1);
} else if (!(command in commands)) {
  console.error(
    `error: found argument ${command} which wasn't expected, or isn't valid in this context`,
  );
  Deno.exit(1);
} else {
  await commands[command](args);
}
