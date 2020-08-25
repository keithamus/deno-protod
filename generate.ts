import { version } from "./version.ts";

import {
  Proto,
  Visitor,
  Enum,
  EnumField,
  Message,
  Field,
  Oneof,
  MapField,
  Syntax,
  Option,
  parse,
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

function isPrimitive(field: Field): field is Field & { fieldType: Type } {
  return Type[field.fieldType as Type] === field.fieldType;
}

function isPackedField(field: Field, syntax: 2 | 3): boolean {
  if (
    field.repeated && syntax === 3 && isPrimitive(field) &&
    !WireTypes[field.fieldType]
  ) {
    return true;
  }
  let ret = false;
  field.accept({
    visitOption(opt: Option) {
      if (opt.key === "packed" && opt.value.value === true) {
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
    const valueType = TypeNativeMap[field.valueType as Type] || field.valueType;
    return `Map<${keyType}, ${valueType}>`;
  }
  if (field instanceof Oneof) {
    return [...getFields(field)]
      .map((field) => getFieldNativeType(field))
      .join(" | ");
  }
  if (isPrimitive(field)) {
    return `${TypeNativeMap[field.fieldType]}${field.repeated ? "[]" : ""}`;
  }
  return field.fieldType;
}

function getFieldTypeFn(
  proto: ProtoGenerator,
  field: Field | Oneof | MapField,
): [string, number] {
  if (field instanceof MapField) {
    proto.imports.from(proto.mod).import("mapField");
    if (field.valueType in Type) {
      proto.imports.from(proto.mod).import(`${field.valueType}Field`);
      return [`mapField(${field.keyType}Field, ${field.valueType}Field)`, 2];
    } else if (proto.enums.has(field.valueType)) {
      proto.imports.from(proto.mod).import("enumField");
      return [
        `mapField(${field.keyType}Field, enumField(${field.valueType}))`,
        2,
      ];
    }
  } else if (field instanceof Oneof) {
    return ["", 0];
  } else {
    let fieldType = "";
    let wireType: number = 0;
    if (proto.enums.has(field.fieldType)) {
      proto.imports.from(proto.mod).import("enumField");
      fieldType = `enumField(${field.fieldType})`;
      wireType = 0;
    } else if (proto.messages.has(field.fieldType)) {
      fieldType = `${field.fieldType}`;
      wireType = 2;
    } else {
      proto.imports.from(proto.mod).import(`${field.fieldType}Field`);
      fieldType = `${field.fieldType}Field`;
      wireType = WireTypes[field.fieldType as Type];
    }
    if (field.repeated) {
      const isPacked = isPackedField(field, proto.syntax);
      const wrapper = isPacked ? "packedField" : "repeatedField";
      proto.imports.from(proto.mod).import(wrapper);
      fieldType = `${wrapper}(${fieldType})`;
      wireType = isPacked ? 2 : WireTypes[field.fieldType as Type];
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
  const id = field.fieldType;
  if (field.repeated) {
    return "[]";
  }
  // if (generator.enums.has(id)) {
  //   if (generator.enumDefaults.has(id)) {
  //     return `${id}.${generator.enumDefaults.get(id)}`;
  //   }
  //   return `0 as ${id}`;
  // }
  // if (generator.messages.has(id)) return `new ${id}({})`;
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
      return id;
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
    yield `import {`;
    for (const id of [...this.#imports].sort()) yield `  ${id},`;
    yield `} from "${this.module}";`;
  }

  toString() {
    return [...this].join("\n");
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
      for (const line of importGenerator) yield line;
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
      } else if (this.parent.messages.has(field.fieldType)) {
        yield `  this.${name} = init.${name} ?? new ${field.fieldType}({});`;
      } else if (this.parent.enums.has(field.fieldType)) {
        const Enum = this.parent.enums.get(field.fieldType)!;
        yield `  this.${name} = init.${name} ?? ${field.fieldType}.${Enum.default};`;
      } else {
        const defaultValue = getDefaultValue(field);
        yield `  this.${name} = init.${name} ?? ${defaultValue};`;
      }
    }
    yield `}`;
  }

  private *fromBytesMethod(): Generator<string, void> {
    yield `static fromBytes(bytes: Uint8Array): ${this.message.name} {`;
    yield `  const init: Partial<${this.message.name}> = {};`;
    this.imports.from(this.parent.mod).import("deserialize");
    yield `  for (const entry of deserialize(bytes)) {`;
    let i = 0;
    for (const field of getFields(this.message)) {
      let [type, wireType] = getFieldTypeFn(this.parent, field);
      if (field instanceof Oneof) {
        for (const subField of getFields(field)) {
          const id = (subField as Field).id;
          const [type, wireType] = getFieldTypeFn(this.parent, subField);
          if (i === 0) {
            yield `    if (entry[0] === ${id} && entry[1] === ${wireType}) {`;
          } else {
            yield `    } else if (entry[0] === ${id} && entry[1] === ${wireType}) {`;
          }
          yield `      init.${subField.name} = ${type}.fromBytes(entry[2]);`;
        }
      } else {
        if (
          field instanceof Field && isPackedField(field, this.parent.syntax)
        ) {
          wireType = 2;
        }
        if (i === 0) {
          yield `    if (entry[0] === ${field.id} && entry[1] === ${wireType}) {`;
        } else {
          yield `    } else if (entry[0] === ${field.id} && entry[1] === ${wireType}) {`;
        }
        if (field instanceof MapField) {
          yield `      const map = (init.${field.name} = init.${field.name} || new Map());`;
          yield `      ${type}`;
          yield `        .fromBytes(entry[2])`;
          yield `        .forEach((v, k) => map.set(k, v));`;
        } else {
          if (field.repeated) {
            yield `      init.${field.name} = init.${field.name} || [];`;
            if (isPackedField(field, this.parent.syntax)) {
              yield `      init.${field.name}.push(...${type}.fromBytes(entry[2]));`;
            } else {
              yield `      init.${field.name}.push(${field.fieldType}Field.fromBytes(entry[2]));`;
            }
          } else {
            yield `      init.${field.name} = ${type}.fromBytes(entry[2]);`;
          }
        }
      }
      i += 1;
    }
    yield `    }`;
    yield `  }`;
    yield `  return new ${this.message.name}(init);`;
    yield `}`;
  }

  private *fromJSONMethod() {
    this.imports.from(this.parent.mod).import("JSON", "fromJSON");
    yield `static fromJSON(json: JSON): ${this.message.name} {`;
    yield `  return new ${this.message.name}(fromJSON<${this.message.name}>(json, {`;
    for (const field of getFields(this.message)) {
      if (field instanceof MapField) {
        yield `    ${field.name}: ${getFieldTypeFn(this.parent, field)[0]},`;
      } else if (field instanceof Oneof) {
        for (const subField of getFields(field)) {
          yield `    ${subField.name}: ${
            getFieldTypeFn(this.parent, subField)[0]
          },`;
        }
      } else {
        yield `    ${field.name}: ${getFieldTypeFn(this.parent, field)[0]},`;
      }
    }
    yield `  }));`;
    yield `}`;
  }

  private *toBytesMethod(): Generator<string, void> {
    this.imports.from(this.parent.mod).import("toBytes");
    yield `toBytes(): Uint8Array {`;
    yield `  return toBytes<${this.message.name}>(this, {`;
    for (const field of getFields(this.message)) {
      if (field instanceof Oneof) {
        for (const subField of getFields(field)) {
          const id = (subField as Field).id;
          yield `    ${subField.name}: [${id}, ${
            getFieldTypeFn(this.parent, subField)[0]
          }],`;
        }
      } else if (
        field instanceof Field && this.parent.messages.has(field.fieldType)
      ) {
        yield `    ${field.name}: [${field.id}, this.${field.name}],`;
      } else {
        yield `    ${field.name}: [${field.id}, ${
          getFieldTypeFn(this.parent, field)[0]
        }],`;
      }
    }
    yield `  });`;
    yield `}`;
  }

  private *toJSONMethod(): Generator<string, void> {
    this.parent.imports.from(this.parent.mod).import("toJSON");
    yield `toJSON() {`;
    yield `  return toJSON<${this.message.name}>(this, {`;
    for (const field of getFields(this.message)) {
      if (field instanceof Oneof) {
        for (const subField of getFields(field)) {
          const id = (subField as Field).id;
          yield `    ${subField.name}: ${
            getFieldTypeFn(this.parent, subField)[0]
          },`;
        }
      } else if (
        field instanceof Field && this.parent.messages.has(field.fieldType)
      ) {
        yield `    ${field.name}: this.${field.name},`;
      } else {
        yield `    ${field.name}: ${getFieldTypeFn(this.parent, field)[0]},`;
      }
    }
    yield `  });`;
    yield `}`;
  }

  *[Symbol.iterator](): Generator<string, void> {
    for (const line of this.comments()) yield line;
    yield `export class ${this.message.name} {`;
    for (const line of this.classFields()) yield `  ${line}`;
    for (const line of this.classGetters()) yield `  ${line}`;
    yield "";
    for (const line of this.classConstructor()) yield `  ${line}`;
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

const defaultMod = `https://deno.land/x/protod@${version}/mod.ts`;
interface ProtoGeneratorOpts {
  mod?: string;
}

class ProtoGenerator implements Visitor {
  syntax: 2 | 3 = 3;
  mod: string;
  imports = new ImportMap();
  messages: Map<string, MessageGenerator> = new Map();
  enums: Map<string, EnumGenerator> = new Map();

  constructor(private proto: Proto, { mod }: ProtoGeneratorOpts = {}) {
    this.mod = mod || defaultMod;
    proto.accept(this);
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

export async function generate(
  path: string,
  opts: ProtoGeneratorOpts = {},
): Promise<string> {
  const file = await Deno.open(path, { read: true });
  try {
    return new ProtoGenerator(await parse(file, { comments: true }), opts)
      .toString();
  } finally {
    file.close();
  }
}
