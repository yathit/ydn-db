// TypeScript definition for YDN-DB



interface IndexSchemaJson {
  name?: string;
  keyPath: string; // FIXME: keyPath can be array, how to union type?
  type?: string;
  unique?: bool;
  multiEntry?: bool;
}

interface IndexSchemaJson {
  name?: string;
  keyPath: string[]; // FIXME: keyPath can be array, how to union type?
  type?: string;
  unique?: bool;
  multiEntry?: bool;
}

interface StoreSchemaJson {
  autoIncrement?: bool;
  dispatchEvents?: bool;
  name?: string;
  indexes?: IndexSchemaJson[];
  keyPath?: string;
  type?: string;
}

interface DatabaseSchemaJson {
  version?: number;
  stores: StoreSchemaJson[];
}

interface StorageOptions {
  mechanisms?: string[];
  size?: number;
  autoSchema?: bool;
  thread?: string;
}

declare module goog.async
{
  export class Deferred {
    always(callback: (data: any));
    done(callback: (data: any));
    fail(callback: (data: any));
    then(success_callback: (data: any), error_callback: (data: Error));
  }
}

declare module ydb.db
{
  export function cmp(first: any, second: any): number;

  export function deleteDatabase(db_name: string, type?: string): void;

  export class Key {
    constructor(json: Object);
    constructor(key_string: string);
    constructor(store_name: string, id: any, parent_key?: Key);
  }
  export class Iterator {
    count(): number;
    done(): bool?;
    join(on_field_name: string, peer_store_name: string, peer_field_name?: string);
    key(): any;
    primaryKey(): any;
    reset();
    resume(key: any, index_key: any);
  }

  enum Op {
    >, <, =, >=, <=
  }

  export class Cursors extends Iterator {
    constructor(store_name: string, index_name: string, key_range?: any, reverse?: bool);
  }
  export function Cursors.where(store_name: string, index_name: string, op: Op, value: any, op2: Op, value2: any);

  export class KeyCursors extends Iterator {
    constructor(store_name: string, key_range?: any, reverse?: bool);
  }
  export function KeyCursors.where(store_name: string, op: Op, value: any, op2: Op, value2: any);

  export class ValueCursors extends Iterator {
    constructor(store_name: string, key_range?: any, reverse?: bool);
  }
  export function ValueCursors.where(store_name: string, op: Op, value: any, op2: Op, value2: any);

  export class IndexValueCursors extends Iterator {
    constructor(store_name: string, index_name: string, key_range?: any, reverse?: bool);
  }
  export function IndexValueCursors.where(store_name: string, index_name: string, op: Op, value: any, op2: Op, value2: any);

  export class Streamer {
    constructor(storage?: ydn.db.Storage, store_name: string, index_name?: string, foreign_index_name?: string);

    push(key: any, value?: any);

    collect(callback: (values: any[]));

    setSink(callback: (key: any, value: any, toWait: (): bool));
  }

  export class ICursor {
    indexKey(i?: number): any;
    key(i?: number): any;
    clear(i?: number) : goog.async.Deferred;
    merge(): Object;
    update(value: Object, i?: number) : goog.async.Deferred;
  }

  export class DbOperator {

    add(store_name: string, value: any, key: any) : goog.async.Deferred;
    add(store_name: string, value: any) : goog.async.Deferred;

    clear(store_name: string, key_or_key_range: any) : goog.async.Deferred;
    clear(store_name: string) : goog.async.Deferred;
    clear(store_names: string[]) : goog.async.Deferred;

    count(store_name: string, key_range?: any) : goog.async.Deferred;
    count(store_name: string, index_name: string, key_range: any) : goog.async.Deferred;
    count(store_names: string[]) : goog.async.Deferred;

    executeSql(sql: string, params?: any[]) : goog.async.Deferred;

    get(store_name: string, key: any) : goog.async.Deferred;

    keys(iter: ydb.db.Iterator, limit?: number, offset?: number);
    keys(store_name: string, key_range?: Object, limit?: number, offset?: number, reverse?: boolean);
    keys(store_name: string, index_name: string, key_range?: Object, limit?: number, offset?: number, reverse?: boolean);
    keys(store_name: string, limit?: bool, offset?: number);

    map(iterator: ydb.db.Iterator, callback: (value: any): any) : goog.async.Deferred;

    open(iterator: ydb.db.Iterator, next_callback: (cursor: ydn.db.ICurosr): any, mode: string) : goog.async.Deferred;

    put(store_name: string, value: any, key: any) : goog.async.Deferred;
    put(store_name: string, value: any[], key: any[]) : goog.async.Deferred;
    put(store_name: string, value: any) : goog.async.Deferred;
    put(store_name: string, value: any[]) : goog.async.Deferred;

    reduce(iterator: ydb.db.Iterator, callback: (value: any, prev_value: any, index: number), initial: any) : goog.async.Deferred;

    remove(store_name: string, index_name: string, id_or_key_range: any) : goog.async.Deferred;
    clear(store_name: string, key_or_key_range: any) : goog.async.Deferred;

    scan(iterators: ydb.db.Iterator[], solver: (keys: any[], values: any[])) : goog.async.Deferred;
    scan(iterators: ydb.db.Iterator[], solver: ydn.db.algo.Solver) : goog.async.Deferred;

    values(iter: ydb.db.Iterator, limit?: number, offset?: number);
    values(store_name: string, key_range?: Object, limit?: number, offset?: number, reverse?: bool);
    values(store_name: string, index_name: string, key_range?: Object, limit?: number, offset?: number, reverse?: bool);
    values(store_name: string, ids?: Array);
    values(keys?: Array);
  }

  enum EventType {
    created,
    deleted,
    ready,
    updated
  }

  export class Storage extends DbOperator {

    constructor(db_name?:string, schema?: DatabaseSchemaJson, options?: StorageOptions);

    addEventListener(type: EventType, handler: (event: any), capture?: bool);
    addEventListener(type: EventType[], handler: (event: any), capture?: bool);

    branch (thread: string, name?: string): DbOperator;

    close();

    get(store_name: string, key: any) : goog.async.Deferred;

    getName (callback) : string;

    getSchema (callback) : DatabaseSchemaJson;

    getType(): string;

    removeEventListener(type: EventType, handler: (event: any), capture?: bool);
    removeEventListener(type: EventType[], handler: (event: any), capture?: bool);

    run(callback: (iStorage: ydn.db.Storage), store_names: string[], mode: string, completed_handler: (type:string, e?: Error));

    setName(name: string);

    transaction(callback: (tx: any), store_names: string[], mode: string, completed_handler: (type:string, e?: Error));

  }
}

declare module ydb.db.algo {

  export class Solver {

  }

  export class NestedLoop extends Solver {
    constructor(out:{push: (value:any)}, limit?:number);
  }

  export class SortedMerge extends Solver {
    constructor(out:{push: (value:any)}, limit?:number);
  }

  export class ZigzagMerge extends Solver {
    constructor(out:{push: (value:any)}, limit?:number);
  }

}