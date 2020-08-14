export type ProtoBufEntry =
  | [number, 0, bigint]
  | [number, 1, Uint8Array]
  | [number, 2, Uint8Array]
  | [number, 5, Uint8Array];
