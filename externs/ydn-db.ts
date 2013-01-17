// TypeScript definition for YDN-DB



interface IndexSchemaJson {
  name?: string;
  keyPath: string; // FIXME: keyPath can be array, how to union type?
  type?: string;
  unique?: bool;
  multiEntry?: bool;
}

interface StoreSchemaJson {
  name?: string;
  keyPath?: string;
  type?: string;
  autoIncrement?: bool;
  indexes?: IndexSchemaJson[];
}

interface DatabaseSchemaJson {
  version?: number;
  stores: StoreSchemaJson[];
}

interface StorageOptions {
  mechanisms?: string[];
  size?: number;
  autoSchema?: bool;
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
  export class Iterator {
    count(): number;
    done(): bool?;
    join(on_field_name: string, peer_store_name: string, peer_field_name?: string);
    key(): any;
    indexKey(): any;
    reset();
    resume(key: any, index_key: any);
  }

  export class KeyIterator extends Iterator {
    constructor(store_name: string, key_range?: any, reverse?: bool);
    constructor(store_name: string, index_name: string, key_range?: any, reverse?: bool);
  }

  export class ValueIterator extends Iterator {
    constructor(store_name: string, key_range?: any, reverse?: bool);
    constructor(store_name: string, index_name: string, key_range?: any, reverse?: bool);
  }

  export class ICursor {
    indexKey(i?: number): any;
    key(i?: number): any;
    clear(i?: number) : goog.async.Deferred;
    merge(): Object;
    update(value?: any, i?: number) : goog.async.Deferred;
  }

  export class Storage {

    constructor(db_name?:string, schema?: DatabaseSchemaJson, options?: StorageOptions);

    add(store_name: string, value: any, key: any) : goog.async.Deferred;
    add(store_name: string, value: any) : goog.async.Deferred;

    addEventListener(type: string, handler: (event: any), capture?: bool);

    clear(store_name: string, key_or_key_range: any, id_or_key_range: any) : goog.async.Deferred;
    clear(store_name: string, index_name: string, id_or_key_range: any) : goog.async.Deferred;
    clear(store_name: string) : goog.async.Deferred;
    clear(store_names: string[]) : goog.async.Deferred;

    close();

    count(store_name: string, key_range?: any) : goog.async.Deferred;
    count(store_name: string, index_name: string, key_range: any) : goog.async.Deferred;
    count(store_names: string[]) : goog.async.Deferred;

    executeSql(sql: string, params?: any[]) : goog.async.Deferred;

    get(store_name: string, key: any) : goog.async.Deferred;

    getSchema (callback) : goog.async.Deferred;

    keys(iter: ydb.db.Iterator, limit?: number, offset?: number);
    keys(store_name: string, key_or_key_range?: any, reverse?: bool, limit?: bool, offset?: number);
    keys(store_name: string, index_name: string, key_or_key_range?: any, reverse?: bool, limit?: bool, offset?: number);

    list(iter: ydb.db.Iterator, limit?: number, offset?: number);
    list(store_name: string, reverse?: bool, limit?: bool, offset?: number);
    list(store_name: string, reverse?: bool, limit?: bool, offset?: number);
    list(store_name: string, key_or_key_range?: any, reverse?: bool, limit?: bool, offset?: number);
    list(store_name: string, index_name: string, key_or_key_range?: any, reverse?: bool, limit?: bool, offset?: number);

    map(iterator: ydb.db.Iterator, callback: (value: any): any) : goog.async.Deferred;

    open(iterator: ydb.db.Iterator, next_callback: (cursor: ydn.db.ICurosr): any, mode: string) : goog.async.Deferred;

    put(store_name: string, value: any, key: any) : goog.async.Deferred;
    put(store_name: string, value: any[], key: any[]) : goog.async.Deferred;
    put(store_name: string, value: any) : goog.async.Deferred;
    put(store_name: string, value: any[]) : goog.async.Deferred;

    reduce(iterator: ydb.db.Iterator, callback: (value: any, prev_value: any, index: number), initial: any) : goog.async.Deferred;

    scan(iterators: ydb.db.Iterator, solver: (keys: any[], values: any[])) : goog.async.Deferred;

    setName(name: string);

    removeEventListener(type: string, handler: (event: any), capture?: bool);

    run(callback: (iStorage: ydn.db.Storage), store_names: string[], mode: string, completed_handler: (type:string, e?: Error));

    transaction(callback: (tx: any), store_names: string[], mode: string, completed_handler: (type:string, e?: Error));

    type(): string;
  }
}