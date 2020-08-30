/**
 * A type representing the input/output types from serialize/deserialize.
 */
export type ProtoBufEntry =
  | [number, 0, bigint]
  | [number, 1, Uint8Array]
  | [number, 2, Uint8Array]
  | [number, 5, Uint8Array];

/**
 * A type to more accurately represent JSON values.
 *
 * (TypeScript defaults `JSON.parse/stringify` to be `any`).
 */
export type JSON =
  | { [prop: string]: JSON }
  | JSON[]
  | boolean
  | number
  | bigint
  | string
  | null
  | undefined;

export type Field =
  | "string"
  | "int32";

export interface FieldTypeVarint<T> {
  name: string;
  wireType: 0;
  fromBytes(value: bigint): T;
  fromJSON(value: NonNullable<JSON>): T;
  toJSON(value: T): NonNullable<JSON>;
  toBytes(value: T): bigint;
}

export interface FieldType64Bit<T> {
  name: string;
  wireType: 1;
  fromBytes(value: Uint8Array): T;
  fromJSON(value: NonNullable<JSON>): T;
  toJSON(value: T): NonNullable<JSON>;
  toBytes(value: T): Uint8Array;
}

export interface FieldTypeLengthDelimited<T> {
  name: string;
  wireType: 2;
  fromBytes(value: Uint8Array): T;
  fromJSON(value: NonNullable<JSON>): T;
  toJSON(value: T): NonNullable<JSON>;
  toBytes(value: T): Uint8Array;
}

export interface FieldType32Bit<T> {
  name: string;
  wireType: 5;
  fromBytes(value: Uint8Array): T;
  fromJSON(value: NonNullable<JSON>): T;
  toJSON(value: T): NonNullable<JSON>;
  toBytes(value: T): Uint8Array;
}

export interface MetaFieldVarInt<T> {
  name: string;
  wireType: 0;
  fromBytes(value: bigint): T;
  fromJSON(value: NonNullable<JSON>): T;
  toJSON(value: T): NonNullable<JSON>;
  toBytes(): never;
  fromEntry(entries: ProtoBufEntry[]): T;
  toEntry(id: number, value: T): ProtoBufEntry[];
}

export interface MetaFieldBuf<T> {
  name: string;
  wireType: 2;
  fromBytes(value: Uint8Array): T;
  fromJSON(value: NonNullable<JSON>): T;
  toJSON(value: T): NonNullable<JSON>;
  toBytes(): never;
  fromEntry(entries: ProtoBufEntry[]): T;
  toEntry(id: number, value: T): ProtoBufEntry[];
}

/**
 * FieldType is a base type representing the possible Helper Objects that can
 * be created to encode/decode Message fields.
 */
export type FieldType<T> =
  | FieldTypeVarint<T>
  | FieldType64Bit<T>
  | FieldTypeLengthDelimited<T>
  | FieldType32Bit<T>
  | MetaFieldVarInt<T>
  | MetaFieldBuf<T>
  | Message<T>;

export interface Message<T> {
  new (init: Partial<T>): T & MessageInstance;
  fromJSON(json: JSON): T & MessageInstance;
  fromBytes(bytes: Uint8Array): T & MessageInstance;
}

export interface MessageInstance {
  toBytes(): Uint8Array;
  toJSON(): JSON;
}

export type FieldSet<T> = {
  [P in keyof T]?: [number, FieldType<T[P]>];
};
