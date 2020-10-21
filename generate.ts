import { version } from "./version.ts";

import {
  dirname,
  Enum,
  EnumField,
  Field,
  Import,
  join,
  MapField,
  Message,
  Oneof,
  Option,
  parse,
  Proto,
  Syntax,
  Visitor,
} from "./deps.ts";

enum Type {
  int32 = "int32",
  int64 = "int64",
  uint32 = "uint32",
  uint64 = "uint64",
  sint32 = "sint32",
  sint64 = "sint64",
  bool = "bool",
  "enum" = "enum",
  fixed64 = "fixed64",
  sfixed64 = "sfixed64",
  double = "double",
  string = "string",
  bytes = "bytes",
  message = "message",
  fixed32 = "fixed32",
  sfixed32 = "sfixed32",
  float = "float",
}

const WireTypes: Record<Type, 0 | 1 | 2 | 5> = {
  int32: 0,
  int64: 0,
  uint32: 0,
  uint64: 0,
  sint32: 0,
  sint64: 0,
  bool: 0,
  enum: 0,
  fixed64: 1,
  sfixed64: 1,
  double: 1,
  string: 2,
  bytes: 2,
  message: 2,
  fixed32: 5,
  sfixed32: 5,
  float: 5,
};

function* getFields(
  message: Message | Oneof,
): Generator<Field | Oneof | MapField> {
  for (const statement of message.body) {
    if (
      statement instanceof Field ||
      statement instanceof Oneof ||
      statement instanceof MapField
    ) {
      yield statement;
    }
  }
}

function isPrimitive(
  field: Field,
): field is Field & { fieldType: { name: Type } } {
  return Type[field.fieldType.name as Type] === field.fieldType.name;
}

function isPackedField(field: Field, syntax: 2 | 3): boolean {
  if (
    field.repeated && syntax === 3 && isPrimitive(field) &&
    !WireTypes[field.fieldType.name]
  ) {
    return true;
  }
  let ret = false;
  field.accept({
    visitOption(opt: Option) {
      if (
        opt.key.length === 1 && opt.key[0] === "packed" &&
        opt.value.value === true
      ) {
        ret = true;
      }
    },
  });
  return ret;
}

const TypeNativeMap: Record<Type, string> = {
  "int32": "number",
  "int64": "bigint",
  "uint32": "number",
  "uint64": "bigint",
  "sint32": "number",
  "sint64": "bigint",
  "bool": "boolean",
  "enum": "",
  "fixed64": "bigint",
  "sfixed64": "bigint",
  "double": "number",
  "string": "string",
  "bytes": "Uint8Array",
  "message": "",
  "fixed32": "number",
  "sfixed32": "number",
  "float": "number",
};

function getFieldNativeType(field: Field | Oneof | MapField): string {
  if (field instanceof MapField) {
    const keyType = TypeNativeMap[field.keyType];
    const valueType = TypeNativeMap[field.valueType.name as Type] ||
      field.valueType.name;
    return `Map<${keyType}, ${valueType}>`;
  }
  if (field instanceof Oneof) {
    return [...getFields(field)]
      .map((field) => getFieldNativeType(field))
      .join(" | ");
  }
  if (isPrimitive(field)) {
    return `${TypeNativeMap[field.fieldType.name]}${
      field.repeated ? "[]" : ""
    }`;
  }
  return `${field.fieldType.name}${field.repeated ? "[]" : ""}`;
}

function hasScopedEnum(proto: ProtoGenerator, name: string): string | void {
  for (const [source, idents] of proto.scopedEnums) {
    if (idents.has(name)) return source;
  }
}

function hasScopedMessage(proto: ProtoGenerator, name: string): string | void {
  for (const [source, idents] of proto.scopedMessages) {
    if (idents.has(name)) return source;
  }
}

function getFieldTypeFn(
  proto: ProtoGenerator,
  field: Field | Oneof | MapField,
): [string, number] {
  if (field instanceof MapField) {
    proto.imports.from(proto.mod).import("mapField");
    if (field.valueType.name in Type) {
      proto.imports.from(proto.mod).import(`${field.valueType.name}Field`);
      return [
        `mapField(${field.keyType}Field, ${field.valueType.name}Field)`,
        2,
      ];
    } else if (proto.enums.has(field.valueType.name)) {
      proto.imports.from(proto.mod).import("enumField");
      return [
        `mapField(${field.keyType}Field, enumField(${field.valueType.name}))`,
        2,
      ];
    }
  } else if (field instanceof Oneof) {
    return ["", 0];
  } else {
    let fieldType = "";
    let wireType: number = 0;
    if (proto.enums.has(field.fieldType.name)) {
      proto.imports.from(proto.mod).import("enumField");
      fieldType = `enumField(${field.fieldType.name})`;
      wireType = 0;
    } else if (proto.messages.has(field.fieldType.name)) {
      fieldType = `${field.fieldType.name}`;
      wireType = 2;
    } else if (field.fieldType.name in Type) {
      proto.imports.from(proto.mod).import(`${field.fieldType.name}Field`);
      fieldType = `${field.fieldType.name}Field`;
      wireType = WireTypes[field.fieldType.name as Type];
    } else {
      let mod: string | void = hasScopedEnum(proto, field.fieldType.name);
      if (mod) {
        wireType = 1;
        proto.imports.from(proto.mod).import("enumField");
        proto.imports.from(mod || "./deps.ts").import(field.fieldType.name);
        fieldType = `enumField(${field.fieldType.name})`;
      } else {
        mod = hasScopedMessage(proto, field.fieldType.name);
        if (mod) {
          wireType = 2;
          proto.imports.from(mod || "./deps.ts").import(field.fieldType.name);
          fieldType = field.fieldType.name;
        }
      }
    }
    if (field.repeated) {
      const isPacked = isPackedField(field, proto.syntax);
      const wrapper = isPacked ? "packedField" : "repeatedField";
      proto.imports.from(proto.mod).import(wrapper);
      fieldType = `${wrapper}(${fieldType})`;
      wireType = isPacked ? 2 : WireTypes[field.fieldType.name as Type];
    }
    return [fieldType, wireType];
  }
  throw new Error(`unknown field ${field}`);
}

function getDefaultValue(field: Field | Oneof | MapField): string {
  if (field instanceof MapField) {
    return "new Map()";
  }
  if (field instanceof Oneof) {
    return "null";
  }
  const id = field.fieldType.name;
  if (field.repeated) {
    return "[]";
  }
  switch (id) {
    case "int32":
      return "0";
    case "int64":
      return "0n";
    case "uint32":
      return "0";
    case "uint64":
      return "0n";
    case "sint32":
      return "0";
    case "sint64":
      return "0n";
    case "bool":
      return "false";
    case "enum":
      return "0";
    case "fixed64":
      return "0n";
    case "sfixed64":
      return "0n";
    case "double":
      return "0";
    case "string":
      return '""';
    case "bytes":
      return "new Uint8Array(0)";
    case "message":
      return "{}";
    case "fixed32":
      return "0";
    case "sfixed32":
      return "0";
    case "float":
      return "0";
    default:
      return `new ${id}({})`;
  }
}

class EnumGenerator {
  default = "";

  constructor(private enumField: Enum) {
    for (const field of this.enumField.body) {
      if (field instanceof EnumField && field.id === 0) {
        this.default = field.name;
        break;
      }
    }
  }

  *[Symbol.iterator](): Generator<string, void> {
    yield `export enum ${this.enumField.name} {`;
    for (const field of this.enumField.body) {
      if (field instanceof EnumField) {
        yield `  ${field.name} = ${field.id},`;
      }
    }
    yield `}`;
  }

  toString() {
    return [...this].join("\n");
  }
}

class ImportGenerator {
  #imports = new Set<string>();
  constructor(public module: string) {}

  import(...ids: string[]) {
    for (const id of ids) this.#imports.add(id);
    return this;
  }

  *[Symbol.iterator](): Generator<string, void> {
    for (
      const id of [...this.#imports].sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      )
    ) {
      yield id;
    }
  }

  toString() {
    const line = `import { ` + [...this].join(", ") +
      ` } from "${this.module}";`;
    if (line.length >= 80) {
      return `import {\n  ` + [...this].join(",\n  ") +
        `,\n} from "${this.module}";`;
    }
    return line;
  }
}

class ImportMap {
  #imports = new Set<ImportGenerator>();

  from(id: string): ImportGenerator {
    for (const importGenerator of this.#imports) {
      if (importGenerator.module === id) return importGenerator;
    }
    const importGenerator = new ImportGenerator(id);
    this.#imports.add(importGenerator);
    return importGenerator;
  }

  *[Symbol.iterator]() {
    for (const importGenerator of this.#imports) {
      yield importGenerator.toString();
    }
  }

  toString() {
    return [...this].join("\n");
  }
}

class MessageGenerator {
  imports: ImportMap;

  constructor(private message: Message, private parent: ProtoGenerator) {
    this.imports = this.parent.imports;
  }

  private *comments(): Generator<string, void> {
    for (const comment of this.message.comments) {
      yield comment.body;
    }
  }

  private *oneOfFieldGetter(field: Oneof): Generator<string, void> {
    for (const subField of getFields(field)) {
      const type = getFieldNativeType(subField);
      yield `#${subField.name}: ${type} | void = undefined;`;
      yield `get ${subField.name}(): ${type} | void {`;
      yield `  return this.#${subField.name};`;
      yield `}`;
      yield `set ${subField.name}(value: ${type} | void) {`;
      for (const otherField of getFields(field)) {
        const value = getDefaultValue(otherField);
        const isSelf = otherField === subField;
        const assignment = isSelf ? `value || ${value}` : "undefined";
        yield `  this.#${otherField.name} = ${assignment};`;
      }
      yield `}`;
    }
  }

  private *classGetters(): Generator<string, void> {
    for (const field of getFields(this.message)) {
      if (field instanceof Oneof) {
        for (const line of this.oneOfFieldGetter(field)) {
          yield line;
        }
      }
    }
  }

  private *classFields(): Generator<string, void> {
    for (const field of getFields(this.message)) {
      if (field instanceof Oneof) continue;
      const fieldNativeType = getFieldNativeType(field);
      for (const comment of (field as Field).comments || []) {
        for (const line of comment.body.split("\n")) yield line;
      }
      yield `${field.name}: ${fieldNativeType};`;
    }
  }

  private *classConstructor(): Generator<string, void> {
    if (!this.message.body.length) {
      yield `constructor() {}`;
      return;
    }
    yield `constructor(init: Partial<${this.message.name}>) {`;
    for (const field of getFields(this.message)) {
      const name = field.name;
      if (field instanceof MapField) {
        yield `  this.${name} = init.${name} ?? new Map();`;
      } else if (field instanceof Oneof) {
        let i = 0;
        for (const subField of getFields(field)) {
          if (i === 0) {
            yield `  if ("${subField.name}" in init) {`;
          } else {
            yield `  } else if ("${subField.name}" in init) {`;
          }
          yield `    this.${subField.name} = init.${subField.name} ?? undefined;`;
          i += 1;
        }
        yield "  }";
      } else if (field.repeated) {
        yield `  this.${name} = init.${name} ?? [];`;
      } else if (this.parent.messages.has(field.fieldType.name)) {
        yield `  this.${name} = init.${name} ?? new ${field.fieldType.name}({});`;
      } else if (this.parent.enums.has(field.fieldType.name)) {
        const Enum = this.parent.enums.get(field.fieldType.name)!;
        yield `  this.${name} = init.${name} ?? ${field.fieldType.name}.${Enum.default};`;
      } else if (hasScopedEnum(this.parent, field.fieldType.name)) {
        yield `  this.${name} = init.${name} ?? 0;`;
      } else {
        const defaultValue = getDefaultValue(field);
        yield `  this.${name} = init.${name} ?? ${defaultValue};`;
      }
    }
    yield `}`;
  }

  private *fieldsField(): Generator<string, void> {
    if (!this.message.body.length) {
      yield `static fields = {};`;
      return;
    }
    this.imports.from(this.parent.mod).import("FieldSet");
    yield `static fields: FieldSet<${this.message.name}> = {`;
    for (const field of getFields(this.message)) {
      if (field instanceof Oneof) {
        for (const subField of getFields(field)) {
          yield `  ${subField.name}: [${(subField as Field).id}, ${
            getFieldTypeFn(this.parent, subField)[0]
          }],`;
        }
      } else {
        yield `  ${field.name}: [${field.id}, ${
          getFieldTypeFn(this.parent, field)[0]
        }],`;
      }
    }
    yield `};`;
  }

  private *fromBytesMethod(): Generator<string, void> {
    if (!this.message.body.length) {
      yield `static fromBytes(): ${this.message.name} {`;
      yield `  return new ${this.message.name}();`;
      yield `}`;
      return;
    }
    yield `static fromBytes(bytes: Uint8Array): ${this.message.name} {`;
    this.imports.from(this.parent.mod).import("fromBytes");
    yield `  return new ${this.message.name}(`;
    yield `    fromBytes<${this.message.name}>(bytes, ${this.message.name}.fields),`;
    yield `  );`;
    yield `}`;
  }

  private *fromJSONMethod() {
    if (!this.message.body.length) {
      yield `static fromJSON(): ${this.message.name} {`;
      yield `  return new ${this.message.name}();`;
      yield `}`;
      return;
    }
    this.imports.from(this.parent.mod).import("JSON", "fromJSON");
    yield `static fromJSON(json: JSON): ${this.message.name} {`;
    yield `  return new ${this.message.name}(`;
    yield `    fromJSON<${this.message.name}>(json, ${this.message.name}.fields),`;
    yield `  );`;
    yield `}`;
  }

  private *toBytesMethod(): Generator<string, void> {
    if (!this.message.body.length) {
      yield `toBytes(): Uint8Array {`;
      yield `  return Uint8Array.of();`;
      yield `}`;
      return;
    }
    this.imports.from(this.parent.mod).import("toBytes");
    yield `toBytes(): Uint8Array {`;
    yield `  return toBytes<${this.message.name}>(this, ${this.message.name}.fields);`;
    yield `}`;
  }

  private *toJSONMethod(): Generator<string, void> {
    if (!this.message.body.length) {
      yield `toJSON() {`;
      yield `  return {};`;
      yield `}`;
      return;
    }
    this.parent.imports.from(this.parent.mod).import("toJSON");
    yield `toJSON() {`;
    yield `  return toJSON<${this.message.name}>(this, ${this.message.name}.fields);`;
    yield `}`;
  }

  *[Symbol.iterator](): Generator<string, void> {
    for (const line of this.comments()) yield line;
    yield `export class ${this.message.name} {`;
    for (const line of this.classFields()) yield `  ${line}`;
    for (const line of this.classGetters()) yield `  ${line}`;
    if (this.message.body.length) yield "";
    for (const line of this.classConstructor()) yield `  ${line}`;
    yield "";
    for (const line of this.fieldsField()) yield `  ${line}`;
    yield "";
    for (const line of this.fromBytesMethod()) yield `  ${line}`;
    yield "";
    for (const line of this.fromJSONMethod()) yield `  ${line}`;
    yield "";
    for (const line of this.toBytesMethod()) yield `  ${line}`;
    yield "";
    for (const line of this.toJSONMethod()) yield `  ${line}`;
    yield `}`;
  }

  toString() {
    return [...this].join("\n");
  }
}

interface ProtoGeneratorOpts {
  mod: string;
  protoPath: string;
}

class ProtoScanner implements Visitor {
  enums: Set<string> = new Set();
  messages: Set<string> = new Set();
  constructor(proto: Proto) {
    proto.accept(this);
  }

  visitEnum(node: Enum) {
    this.enums.add(node.name);
  }

  visitMessage(node: Message) {
    this.messages.add(node.name);
  }
}

class ProtoGenerator implements Visitor {
  syntax: 2 | 3 = 3;
  mod: string;
  protoPath: string;
  imports = new ImportMap();
  dependencies: Set<Import> = new Set();
  scopedMessages: Map<string, Set<string>> = new Map();
  scopedEnums: Map<string, Set<string>> = new Map();
  messages: Map<string, MessageGenerator> = new Map();
  enums: Map<string, EnumGenerator> = new Map();

  constructor(
    private proto: Proto,
    { mod, protoPath }: ProtoGeneratorOpts,
  ) {
    this.mod = mod;
    this.protoPath = protoPath;
    proto.accept(this);
  }

  visitImport(node: Import) {
    this.dependencies.add(node);
  }

  async collectScopes() {
    for (const node of this.dependencies) {
      const { messages, enums } = await scan(join(this.protoPath, node.source));
      this.scopedEnums.set(
        "./" + node.source.replace(/.proto$/, ".pb.ts"),
        enums,
      );
      this.scopedMessages.set(
        "./" + node.source.replace(/.proto$/, ".pb.ts"),
        messages,
      );
    }
  }

  visitEnum(node: Enum) {
    this.enums.set(node.name, new EnumGenerator(node));
  }

  visitSyntax(node: Syntax) {
    if (node.version === 2) {
      throw new Error(`syntax 2 protos are not parseable right now.`);
    }
  }

  visitMessage(message: Message) {
    this.messages.set(message.name, new MessageGenerator(message, this));
  }

  private *body(): Generator<string, void> {
    for (const node of this.enums.values()) {
      yield "";
      for (const line of node) yield line;
    }
    for (const node of this.messages.values()) {
      yield "";
      for (const line of node) yield line;
    }
  }

  *[Symbol.iterator](): Generator<string, void> {
    yield `// Generated by protod v${version}`;
    for (const comment of this.proto.comments) {
      yield comment.body;
    }
    if (this.proto.comments.length) yield "";
    // We need to consume the body to collect any side-effectful imports
    const body = [...this.body()];
    for (const line of this.imports) yield line;
    for (const line of body) yield line;
    yield "";
  }

  toString(): string {
    return [...this].join("\n") + "\n";
  }
}

async function scan(path: string) {
  const file = await Deno.open(path, { read: true });
  try {
    return new ProtoScanner(await parse(file, {}));
  } finally {
    file.close();
  }
}

const defaultMod = `https://deno.land/x/protod@v${version}/mod.ts`;
export async function generate(
  path: string,
  opts: Partial<ProtoGeneratorOpts> = {},
): Promise<string> {
  const file = await Deno.open(path, { read: true });
  try {
    const proto = new ProtoGenerator(
      await parse(file, { comments: true }),
      Object.assign({
        mod: defaultMod,
        protoPath: dirname(path),
      } as ProtoGeneratorOpts, opts),
    );
    await proto.collectScopes();
    return proto.toString();
  } finally {
    file.close();
  }
}
