export type JSONPrimitive = string | number | boolean | null;
export type StorageType<T extends Record<string, JSONPrimitive> = Record<string, JSONPrimitive>> =
  T;

export type StorageContext<T extends StorageType> = {
  readonly length: number;
  key(index: number): T[keyof T] | null;
  getItem<K extends keyof T>(keyName: K): T[K] | null;
  setItem<K extends keyof T>(keyName: K, keyValue: T[K]): void;
  removeItem<K extends keyof T>(keyName: K): void;
  clear(): void;
};
