/**
 * @fileoverview Database schema.
 *
 * This data structure is immutable.
 */


goog.provide('ydn.db.schema.DataType');
goog.provide('ydn.db.schema.Database');
goog.provide('ydn.db.schema.Index');
goog.provide('ydn.db.schema.Store');
goog.require('ydn.db.base');
goog.require('ydn.db.Key');
goog.require('ydn.db.utils');


/**
 * Schema for index.
 *
 * @param {string|!Array.<string>} keyPath the key path.
 * @param {!Array.<ydn.db.schema.DataType>|string|ydn.db.schema.DataType=} opt_type to be determined.
 * @param {boolean=} opt_unique True if the index enforces that there is only
 * one objectfor each unique value it indexes on.
 * @param {boolean=} multiEntry  specifies whether the index's multiEntry flag
 * is set.
 * @param {string=} name index name.
 * @constructor
 */
ydn.db.schema.Index = function(keyPath, opt_type, opt_unique, multiEntry, name)
{

  if (!goog.isDef(keyPath) && goog.isDef(name)) {
    keyPath = name;
  }

  if (goog.isArrayLike(keyPath)) {
    var ks = goog.array.map(/** @type {Array.<string>} */ (keyPath), function(x) {
      return x;
    });
    if (!goog.isDef(name)) {
      name = ks.join(', ');
    }
    keyPath = /** @type {string} */ (ks);
  } else if (goog.isString(keyPath)) {
    // OK.
  } else {
    throw new ydn.error.ArgumentException('index keyPath or name required.');
  }

  /**
   * @final
   * @type {string}
   */
  this.keyPath = keyPath;

  /**
   * @final
   * @type {string}
   */
  this.name = goog.isDef(name) ? name : this.keyPath;
  /**
   * @final
   * @type {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined}
   */
  this.type = ydn.db.schema.Index.toType(opt_type);
  if (goog.DEBUG &&
        (
          (goog.isArray(opt_type) && !goog.isArray(this.type)) ||
          (goog.isArray(opt_type) && !goog.array.equals(/** @type {Array} */ (this.type), opt_type)) ||
          (!goog.isArray(opt_type) && this.type != opt_type)
        )
      ) {
    throw new ydn.error.ArgumentException('Invalid index type: ' + opt_type +
        ' in ' + this.name);
  }
  /**
   * @final
   * @type {boolean}
   */
  this.unique = !!opt_unique;

  /**
   * @final
   * @type {boolean}
   */
  this.multiEntry = !!multiEntry;
};



/**
 * Data type for field in object store. This is required to compatible between
 * IndexedDB and SQLite.
 * SQLite mandate COLUMN field specified data type.
 * IndexedDB allow Array as data type in key, while SQLite is not to use.
 * @see http://www.w3.org/TR/IndexedDB/#key-construct
 * @see http://www.sqlite.org/datatype3.html
 * @see http://www.sqlite.org/lang_expr.html
 * @enum {string}
 */
ydn.db.schema.DataType = {
  BLOB: 'BLOB',
  DATE: 'DATE',
  INTEGER: 'INTEGER', // AUTOINCREMENT is only allowed on an INTEGER
  NUMERIC: 'NUMERIC',
  TEXT: 'TEXT'
};


/**
 * This data type abbreviation is used to prefix value of
 * ydn.db.schema.DataType.ARRAY
 * on storage.
 * @see http://www.sqlite.org/datatype3.html
 * @enum {string}
 */
ydn.db.DataTypeAbbr = {
  DATE: 'd',
  NUMERIC: 'n',
  TEXT: 't'
};


/**
 * Seperator char for array
 * @const
 * @type {string}
 */
ydn.db.schema.Index.ARRAY_SEP = String.fromCharCode(0x001F);


/**
 * Convert key value from IndexedDB value to Sqlite for storage.
 * @see #sql2js
 * @param {Array|Date|*} key key.
 * @param {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} type data type.
 * @return {*} string.
 */
ydn.db.schema.Index.js2sql = function(key, type) {
  if (goog.isArray(type)) {
    // NOTE: we are storing these value for indexing purpose.
    // Array is not native to Sqlite. To be multiEntry searchable,
    // array values are store as TEXT and search using LIKE %q%
    // where q is ARRAY_SEP + search_term + ARRAY_SEP
    // for type preserve conversion, type information is prepended at the
    // front with ydn.db.DataTypeAbbr.
    var arr = !goog.isDefAndNotNull(key) ? [''] :
      goog.isArray(key) ? key : [key];
    var t = ydn.db.schema.Index.toAbbrType(arr[0]);
    var value = (t == ydn.db.DataTypeAbbr.DATE) ?
      arr.reduce(function(p, x) {return p + (+x);}, '') :
      arr.join(ydn.db.schema.Index.ARRAY_SEP);
    return t + ydn.db.schema.Index.ARRAY_SEP +
      value + ydn.db.schema.Index.ARRAY_SEP;
  } else if (type == ydn.db.schema.DataType.DATE) {
    if (key instanceof Date) {
      return +key;  // date is store as NUMERIC
    } // else ?
  } else if (goog.isDef(type)) {
    return key; // NUMERIC, INTEGER, and BLOB
  } else {
    var encoded = ydn.db.utils.encodeKey(key);
    return "X'" + encoded + "'";
  }
};


/**
 * Convert key value from Sqlite value to IndexedDB for storage.
 * @see #js2sql
 * @param {string|number|*} key key.
 * @param {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} type type.
 * @return {Date|Array|*} decoded key.
 */
ydn.db.schema.Index.sql2js = function(key, type) {
  if (goog.isArray(type)) {
      if (goog.isString(key)) {
      /**
       * @type {string}
       */
      var s = key;
      var arr = s.split(ydn.db.schema.Index.ARRAY_SEP);
      var t = arr[0];
      var effective_arr = arr.slice(1, arr.length - 1); // remove last and first
      return goog.array.map(effective_arr, function(x) {
        if (t == ydn.db.DataTypeAbbr.DATE) {
          return new Date(parseInt(x, 10));
        } else if (t == ydn.db.DataTypeAbbr.NUMERIC) {
          return parseFloat(x);
        } else {
          return x;
        }
      });
    } else {
      return undefined;
    }
  } else if (type == ydn.db.schema.DataType.DATE) {
    return new Date(key); // key is number
  } else if (goog.isDef(type)) {
    return key;   // NUMERIC, INTEGER,
  } else {
    return ydn.db.utils.decodeKey(/** @type {string} */ (key));
  }
};


/**
 * @const
 * @type {!Array.<ydn.db.schema.DataType>} column data type.
 */
ydn.db.schema.Index.TYPES = [
  ydn.db.schema.DataType.BLOB,
  ydn.db.schema.DataType.DATE, ydn.db.schema.DataType.INTEGER,
  ydn.db.schema.DataType.NUMERIC,
  ydn.db.schema.DataType.TEXT];


/**
 *
 * @param {!Array|ydn.db.schema.DataType|string=} str data type in string.
 * @return {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} data type.
 */
ydn.db.schema.Index.toType = function(str) {
  if (goog.isArray(str)) {
    /**
     * @type {!Array}
     */
    var arr = str;
    return arr.map(function(s) {
      return ydn.db.schema.Index.toType(s);
    });
  } else {
    var idx = goog.array.indexOf(ydn.db.schema.Index.TYPES, str);
    return ydn.db.schema.Index.TYPES[idx]; // undefined OK.
  }

};


/**
 *
 * @param {*} x object to test.
 * @return {ydn.db.DataTypeAbbr} type of object type.
 */
ydn.db.schema.Index.toAbbrType = function(x) {
  if (x instanceof Date) {
    return ydn.db.DataTypeAbbr.DATE;
  } else if (goog.isNumber(x)) {
    return ydn.db.DataTypeAbbr.NUMERIC;
  } else {
    return ydn.db.DataTypeAbbr.TEXT;
  }
};



/**
 * Return type.
 * @return {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} data type.
 */
ydn.db.schema.Index.prototype.getType = function() {
  return this.type;
};

/**
 *
 * @return {string} index name.
 */
ydn.db.schema.Index.prototype.getName = function() {
  return this.name;
};


/**
 *
 * @return {boolean} multiEntry or not.
 */
ydn.db.schema.Index.prototype.isMultiEntry = function() {
  return this.multiEntry;
};

/**
 *
 * @return {boolean} unique or not.
 */
ydn.db.schema.Index.prototype.isUnique = function() {
  return this.unique;
};



/**
 * @inheritDoc
 */
ydn.db.schema.Index.prototype.toJSON = function() {
  return {
    'name': this.name,
    'keyPath': this.keyPath,
    'type': this.type,
    'unique': this.unique,
    'multiEntry': this.multiEntry
  };
};


/**
 * Compare two stores.
 * @see #equals
 * @param {ydn.db.schema.Index} index index schema to test.
 * @return {string} description where is different between the two. Empty string
 * indicate similar schema.
 */
ydn.db.schema.Index.prototype.difference = function(index) {
  if (!index) {
    return 'no index for ' + this.name;
  }
  if (this.name != index.name) {
    return 'name, expect: ' + this.name + ', but: ' + index.name;
  }
  if (!ydn.object.equals(this.keyPath, index.keyPath)) {
    return 'keyPath, expect: ' + this.keyPath + ', but: ' + index.keyPath;
  }
  if (this.unique != index.unique) {
    return 'unique, expect: ' + this.unique + ', but: ' + index.unique;
  }
  if (goog.isDef(this.type) && goog.isDef(index.type) &&
    this.type != index.type) {
    return 'data type, expect: ' + this.type + ', but: ' + index.type;
  }
  return '';
};


/**
 *
 * @param {ydn.db.base.Direction|string=} str direction in string format.
 * @return {ydn.db.base.Direction|undefined} equivalent typed direction.
 */
ydn.db.schema.Index.toDir = function(str) {
  var idx = goog.array.indexOf(ydn.db.base.DIRECTIONS, str);
  return ydn.db.base.DIRECTIONS[idx]; // undefined OK.
};



/**
 *
 * @return {string} keyPath
 */
ydn.db.schema.Index.prototype.getKeyPath = function() {
  return this.keyPath;
};


/**
 *
 * @param {!IndexSchema} json object in json format.
 * @return {ydn.db.schema.Index} created from input json string.
 */
ydn.db.schema.Index.fromJSON = function(json) {
  if (goog.DEBUG) {
    var fields = ['name', 'unique', 'type', 'keyPath', 'multiEntry'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.error.ArgumentException('Unknown field: ' + key + ' in ' +
            ydn.json.stringify(json));
      }
    }
  }
  return new ydn.db.schema.Index(json.keyPath, json.type, json.unique,
    json.multiEntry, json.name);
};



/**
 *
 * @param {string} name table name.
 * @param {string=} keyPath indexedDB keyPath, like 'feed.id.$t'. Default to.
 * @param {boolean=} autoIncrement If true, the object store has a key
 * generator. Defaults to false.
 * @param {!Array.<ydn.db.schema.DataType>|string|ydn.db.schema.DataType=} opt_type data type for keyPath. Default to
 * <code>ydn.db.schema.DataType.INTEGER</code> if opt_autoIncrement is
 * <code>true.</code>
 * @param {!Array.<!ydn.db.schema.Index>=} opt_indexes list of indexes.
 * @param {boolean=} dispatch_events if true, storage instance should
 * dispatch event on changes.
 * @param {boolean=} fixed sync with backend server.
 * @param {boolean=} sync sync with backend server.
 * @constructor
 */
ydn.db.schema.Store = function(name, keyPath, autoIncrement, opt_type,
                               opt_indexes, dispatch_events, fixed, sync) {

  /**
   * @final
   */
  this.name = name;
  if (!goog.isString(this.name)) {
    throw new ydn.error.ArgumentException('store name must be a string');
  }
  /**
   * @final
   */
  this.keyPath = goog.isDef(keyPath) ? keyPath : null;
  if (!goog.isNull(this.keyPath) &&
        (!goog.isString(this.keyPath) || goog.isArray(this.keyPath))) {
    throw new ydn.error.ArgumentException('keyPath must be a string or array');
  }

  /**
   * IE10 do not reflect autoIncrement, so that make undefined as an option.
   * @final
   * @type {boolean|undefined}
   */
  this.autoIncrement = autoIncrement;

  var type;
  if (goog.isDef(opt_type)) {
    type = ydn.db.schema.Index.toType(opt_type);
    if (!goog.isDef(type)) {
      throw new ydn.error.ArgumentException('type invalid in store: ' +
        this.name);
    }
  }

  /**
   * @final
   */
  this.type = goog.isDef(type) ? type : this.autoIncrement ?
    ydn.db.schema.DataType.INTEGER : undefined;

  if (this.autoIncrement) {
    var sqlite_msg = 'AUTOINCREMENT is only allowed on an INTEGER PRIMARY KEY';
    goog.asserts.assert(this.type == ydn.db.schema.DataType.INTEGER,
      sqlite_msg);
  }


  /**
   * @final
   */
  this.keyPaths = goog.isString(this.keyPath) ? this.keyPath.split('.') : [];
  /**
   * @final
   */
  this.indexes = opt_indexes || [];
  /**
   * @final
   */
  this.dispatch_events = !!dispatch_events;
  /**
   * @final
   */
  this.fixed = !!fixed;
  /**
   * @final
   */
  this.sync = !!sync;

};


/**
 * @type {string}
 */
ydn.db.schema.Store.prototype.name;

/**
 * @type {string?}
 */
ydn.db.schema.Store.prototype.keyPath;

/**
 * @type {boolean|undefined}
 */
ydn.db.schema.Store.prototype.autoIncrement;

/**
 * @type {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} //
 */
ydn.db.schema.Store.prototype.type;

/**
 * @protected
 * @type {!Array.<string>}
 */
ydn.db.schema.Store.prototype.keyPaths;

/**
 * @type {!Array.<!ydn.db.schema.Index>}
 */
ydn.db.schema.Store.prototype.indexes;


/**
 * @type {boolean}
 */
ydn.db.schema.Store.prototype.dispatch_events = false;

/**
 * A fixed schema cannot store arbitrary data structure. This is used only
 * in WebSQL. A arbitrery data structure require default blob column.
 * @type {boolean}
 */
ydn.db.schema.Store.prototype.fixed = false;

/**
 * @type {boolean}
 */
ydn.db.schema.Store.prototype.sync = false;


/**
 * @inheritDoc
 */
ydn.db.schema.Store.prototype.toJSON = function() {

  var indexes = [];
  for (var i = 0; i < this.indexes.length; i++) {
    indexes.push(this.indexes[i].toJSON());
  }

  return {
    'name': this.name,
    'keyPath': this.keyPath,
    'autoIncrement': this.autoIncrement,
    'type': this.type,
    'indexes': indexes
  };
};


/**
 *
 * @param {!StoreSchema} json Restore from json stream.
 * @return {!ydn.db.schema.Store} create new store schema from JSON string.
 */
ydn.db.schema.Store.fromJSON = function(json) {
  if (goog.DEBUG) {
    var fields = ['name', 'keyPath', 'autoIncrement', 'type', 'indexes',
      'dispatchEvents', 'fixed', 'sync'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.error.ArgumentException('Unknown attribute "' + key + '"');
      }
    }
  }
  var indexes = [];
  var indexes_json = json.indexes || [];
  if (goog.isArray(indexes_json)) {
    for (var i = 0; i < indexes_json.length; i++) {
      var index = ydn.db.schema.Index.fromJSON(indexes_json[i]);
      if (goog.isDef(index.keyPath) && index.keyPath === json.keyPath) {
        continue; // key do not need indexing.
      }
      indexes.push(index);
    }
  }
  return new ydn.db.schema.Store(json.name, json.keyPath,
    json.autoIncrement, json.type, indexes, json.dispatchEvents, json.fixed,
      json.sync);
};


/**
 *
 * @return {!ydn.db.schema.Store} clone this database schema.
 */
ydn.db.schema.Store.prototype.clone = function() {
  return ydn.db.schema.Store.fromJSON(
    /** @type {!StoreSchema} */ (this.toJSON()));
};


/**
 *
 * @return {number}
 */
ydn.db.schema.Store.prototype.countIndex = function() {
  return this.indexes.length;
};


/**
 *
 * @param {number} idx index of index.
 * @return {ydn.db.schema.Index}
 */
ydn.db.schema.Store.prototype.index = function(idx) {
  return this.indexes[idx] || null;
};


/**
 *
 * @param {string} name index name.
 * @return {ydn.db.schema.Index} index if found.
 */
ydn.db.schema.Store.prototype.getIndex = function(name) {
  return /** @type {ydn.db.schema.Index} */ (goog.array.find(this.indexes,
    function(x) {
    return x.name == name;
  }));
};


/**
 *
 * @param {string} name index name.
 * @return {boolean} return true if name is found in the index, including
 * keyPath.
 */
ydn.db.schema.Store.prototype.hasIndex = function(name) {
  if (name == this.keyPath) {
    return true;
  }

  return goog.array.some(this.indexes, function(x) {
    return x.name == name;
  });
};


/**
 * @return {string|undefined} return quoted keyPath.
 */
ydn.db.schema.Store.prototype.getQuotedKeyPath = function() {
  return goog.isString(this.keyPath) ?
    goog.string.quote(this.keyPath) : undefined;
};


/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath.
 */
ydn.db.schema.Store.prototype.getSQLKeyColumnName = function() {
  return goog.isString(this.keyPath) ?
    goog.string.quote(this.keyPath) : ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
};


/**
 * Return keyPath. In case undefined return default key column.
 * @return {string} return keyPath or default key column name.
 */
ydn.db.schema.Store.prototype.getColumnName = function() {
  return goog.isString(this.keyPath) ?
    this.keyPath : ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
};


/**
 *
 * @return {string} return quoted name.
 */
ydn.db.schema.Store.prototype.getQuotedName = function() {
  return goog.string.quote(this.name);
};


/**
 * @return {Array.<string>} return name of indexed. It is used as column name
 * in WebSql.
 */
ydn.db.schema.Store.prototype.getColumns = function() {
  if (this.columns_ && this.columns_.length != this.indexes.length) {
    /**
     * @private
     * @final
     * @type {Array.<string>}
     */
    this.columns_ = [];
    for (var i = 0; i < this.indexes.length; i++) {
      this.columns_.push(this.indexes[i].name);
    }
  }
  return this.columns_;
};


/**
 *
 * @return {string} store name.
 */
ydn.db.schema.Store.prototype.getName = function() {
  return this.name;
};


/**
 *
 * @return {boolean|undefined} autoIncrement
 */
ydn.db.schema.Store.prototype.getAutoIncrement = function() {
  return this.autoIncrement;
};


/**
 *
 * @return {string?} keyPath
 */
ydn.db.schema.Store.prototype.getKeyPath = function() {
  return this.keyPath;
};


/**
 *
 * @return {!Array.<string>} list of index names.
 */
ydn.db.schema.Store.prototype.getIndexNames = function() {
  return this.indexes.map(function(x) {return x.name;});
};


/**
 *
 * @return {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined}
 */
ydn.db.schema.Store.prototype.getType = function() {
  return this.type;
};


/**
 *
 * @return {!Array.<string>} list of index keyPath.
 */
ydn.db.schema.Store.prototype.getIndexKeyPaths = function() {
  return this.indexes.map(function(x) {return x.keyPath;});
};


/**
 *
 * @param {string} name column name or keyPath.
 * @param {ydn.db.schema.DataType=} opt_type optional column data type.
 * @param {boolean=} opt_unique unique.
 * @param {boolean=} opt_multiEntry true for array index to index individual
 * element.
 */
ydn.db.schema.Store.prototype.addIndex = function(name, opt_unique, opt_type,
      opt_multiEntry) {
  this.indexes.push(new ydn.db.schema.Index(name, opt_type, opt_unique,
    opt_multiEntry));
};


/**
 * Extract value of keyPath from a given object.
 * @see #getKeyValue
 * @param {!Object} obj object to extract from.
 * @return {!Array|number|string|undefined} return key value.
 */
ydn.db.schema.Store.prototype.getKeyValue = function(obj) {
  // http://www.w3.org/TR/IndexedDB/#key-construct
  return /** @type {string} */ (goog.object.getValueByKeys(obj, this.keyPaths));
};


/**
 * Extract value of keyPath from a row of SQL results
 * @param {!Object} obj record value.
 * @return {!Array|number|string|undefined} return key value.
 */
ydn.db.schema.Store.prototype.getRowValue = function(obj) {
  if (goog.isDefAndNotNull(this.keyPath)) {
    var value = obj[this.keyPath];
    if (this.type == ydn.db.schema.DataType.DATE) {
      value = Date.parse(value);
    } else if (this.type == ydn.db.schema.DataType.NUMERIC) {
      value = parseFloat(value);
    } else if (this.type == ydn.db.schema.DataType.INTEGER) {
      value = parseInt(value, 10);
    }
    return value;
  } else {
    return undefined;
  }
};


/**
 * Generated a key starting from 0 with increment of 1.
 * NOTE: Use only by simple store.
 * @return {number} generated key.
 */
ydn.db.schema.Store.prototype.generateKey = function() {
  if (!goog.isDef(this.current_key_)) {

    /**
     * @type {number}
     * @private
     */
    this.current_key_ = 0;
  }
  return this.current_key_++;
};


/**
 * Set keyPath field of the object with given value.
 * @see #getKeyValue
 * @param {!Object} obj get key value from its keyPath field.
 * @param {*} value key value to set.
 */
ydn.db.schema.Store.prototype.setKeyValue = function(obj, value) {

  for (var i = 0; i < this.keyPaths.length; i++) {
    var key = this.keyPaths[i];

    if (i == this.keyPaths.length - 1) {
      obj[key] = value;
      return;
    }

    if (!goog.isDef(obj[key])) {
      obj[key] = {};
    }
    obj = obj[key];
  }
};


/**
 * @define {string} default key-value store name.
 */
ydn.db.schema.Store.DEFAULT_TEXT_STORE = 'default_text_store';


/**
 * This is for WebSQL.
 * @param {!Object} obj get values of indexed fields.
 * @param {(!Array|string|number)=} opt_key optional key.
 * @return {{
 *    columns: Array.<string>,
 *    slots: Array.<string>,
 *    values: Array.<string>,
 *    key: (!Array|string|number|undefined)
 *  }} return list of values as it appear on the indexed fields.
 */
ydn.db.schema.Store.prototype.getIndexedValues = function(obj, opt_key) {

  // since corretness of the inline, offline, auto are already checked,
  // here we don't check again. this method should not throw error for
  // these reason. If error must be throw it has to be InternalError.

  var key_column;
  var values = [];

  var normalized_key;
  var key = goog.isDef(opt_key) ? opt_key :
      goog.isString(this.keyPath) ? this.getKeyValue(obj) : undefined;
  var columns = [];
  if (goog.isDef(key)) {
    columns = goog.isDefAndNotNull(this.keyPath) ? [this.getQuotedKeyPath()] :
        [ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
    values = [ydn.db.schema.Index.js2sql(key, this.type)];
  }

  for (var i = 0; i < this.indexes.length; i++) {
    var index = this.indexes[i];
    if (index.name == this.keyPath ||
        index.name == ydn.db.base.DEFAULT_BLOB_COLUMN) {
      continue;
    }
    var v = obj[index.name];
    if (goog.isDef(v)) {
      if (index.isMultiEntry()) {
        values.push(ydn.db.schema.Index.js2sql(v, [index.type]));
      } else {
        values.push(ydn.db.schema.Index.js2sql(v, index.type));
      }
      columns.push(goog.string.quote(index.name));
    }
  }

  if (!this.fixed) {
    var data = {};
    for (var item in obj) {
      if (obj.hasOwnProperty(item) && !this.hasIndex(item)) {
        data[item] = obj[item];
      }
    }

    values.push(ydn.json.stringify(data));
    columns.push(ydn.db.base.DEFAULT_BLOB_COLUMN);
  }

  var slots = [];
  for (var i = values.length - 1; i >= 0; i--) {
    slots[i] = '?';
  }

  return {
    columns: columns,
    slots: slots,
    values: values,
    key: key
  };
};


/**
 * Compare two stores.
 * @see #similar
 * @param {ydn.db.schema.Store} store store schema to test.
 * @return {boolean} true if store schema is exactly equal to this schema.
 */
ydn.db.schema.Store.prototype.equals = function(store) {
  return this.name === store.name &&
    ydn.object.equals(this.toJSON(), store.toJSON());
};


/**
 * Compare two stores.
 * @see #equals
 * @param {ydn.db.schema.Store} store
 * @return {string} explination for difference, empty string for similar.
 */
ydn.db.schema.Store.prototype.difference = function(store) {

  if (!store) {
    return 'missing store: ' + this.name;
  }
  if (this.name != store.name) {
    return 'store name, expect: ' + this.name + ', but: ' + store.name;
  }
  if (this.keyPath != store.keyPath) {
    return 'keyPath, expect:  ' + this.keyPath + ', but: ' + store.keyPath;
  }
  if (goog.isDef(this.autoIncrement) && goog.isDef(store.autoIncrement) &&
    this.autoIncrement != store.autoIncrement) {
    return 'autoIncrement, expect:  ' + this.autoIncrement + ', but: ' +
      store.autoIncrement;
  }
  if (this.indexes.length != store.indexes.length) {
    return 'indexes length, expect:  ' + this.indexes.length + ', but: ' +
      store.indexes.length;
  }

  if (goog.isDef(this.type) && goog.isDef(store.type) &&
    this.type != store.type) {
    return 'data type, expect:  ' + this.type + ', but: ' + store.type;
  }
  for (var i = 0; i < this.indexes.length; i++) {
    var index = store.getIndex(this.indexes[i].name);
    var msg = this.indexes[i].difference(index);
    if (msg.length > 0) {
      return 'index "' + this.indexes[i].name + '" ' + msg;
    }
  }

  return '';
};


/**
 *
 * @param {ydn.db.schema.Store} store schema.
 * @return {boolean} true if given store schema is similar to this.
 */
ydn.db.schema.Store.prototype.similar = function(store) {
  return this.difference(store).length == 0;
};


/**
 *
 * @param {DatabaseSchema|number|string=} version version, if string, it must
 * be parse to int.
 * @param {!Array.<!ydn.db.schema.Store>=} opt_stores store schemas.
 * @constructor
 */
ydn.db.schema.Database = function(version, opt_stores) {

  /**
   * @type {number|undefined}
   */
  var ver;
  var stores = opt_stores;
  if (goog.isObject(version)) {
    /**
     * @type {DatabaseSchema}
     */
    var json = version;
    if (goog.DEBUG) {
      var fields = ['version', 'stores'];
      for (var key in json) {
        if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
          throw new ydn.error.ArgumentException('Unknown field: ' + key +
            ' in schema.');
        }
      }
    }
    ver = json['version'];
    stores = [];
    var stores_json = json.stores || [];
    if (goog.DEBUG && !goog.isArray(stores_json)) {
      throw new ydn.error.ArgumentException('stores must be array');
    }
    for (var i = 0; i < stores_json.length; i++) {
      var store = ydn.db.schema.Store.fromJSON(stores_json[i]);
      if (goog.DEBUG) {
        var idx = goog.array.findIndex(stores, function(x) {
          return x.name == store.name;
        });
        if (idx != -1) {
          throw new ydn.error.ArgumentException('duplicate store name "' +
            store.name + '".');
        }

      }
      stores.push(store);
    }
  } else if (goog.isString(version)) {
    ver = version.length == 0 ?
      undefined : parseFloat(version);
  } else if (goog.isNumber(version)) {
    ver = version;
  }


  if (goog.isDef(ver)) {
    if (!goog.isNumber(ver) || ver < 0) {
      throw new ydn.error.ArgumentException('Invalid version: ' + ver + ' (' +
          version + ')');
    }
    if (isNaN(ver)) {
      ver = undefined;
    }
  }
  if (goog.isDef(opt_stores) && (!goog.isArray(opt_stores) ||
      opt_stores.length > 0 && !(opt_stores[0] instanceof ydn.db.schema.Store)))
  {
    throw new ydn.error.ArgumentException('stores');
  }

  /**
   * @type {number|undefined}
   */
  this.version = ver;

  this.is_auto_version_ = !goog.isDef(this.version);

  /**
   * @final
   * @type {!Array.<!ydn.db.schema.Store>}
   */
  this.stores = stores || [];

};


/**
 * @inheritDoc
 */
ydn.db.schema.Database.prototype.toJSON = function() {

  var stores = this.stores.map(function(x) {return x.toJSON()});

  return {
    'version': this.version,
    'stores': stores};
};


/**
 *
 * @type {boolean} auto version status.
 * @private
 */
ydn.db.schema.Database.prototype.is_auto_version_ = false;



/**
 * Get schema version.
 * @return {number|undefined} version.
 */
ydn.db.schema.Database.prototype.getVersion = function() {
  return this.version;
};


/**
 * Update database schema for auto schema mode.
 * @param {number} version must be number type.
 */
ydn.db.schema.Database.prototype.setVersion = function(version) {
  goog.asserts.assert(this.is_auto_version_);
  goog.asserts.assertNumber(version);
  this.version = version;
};


/**
 *
 * @return {boolean} true if auto version.
 */
ydn.db.schema.Database.prototype.isAutoVersion = function() {
  return this.is_auto_version_;
};



/**
 *
 * @return {boolean} true if auto schema.
 */
ydn.db.schema.Database.prototype.isAutoSchema = function() {
  return false;
};


/**
 *
 * @return {!Array.<string>} list of store names.
 */
ydn.db.schema.Database.prototype.getStoreNames = function() {
  return this.stores.map(function(x) {return x.name;});
};
//
//
///**
// * @deprecated
// * @param {!DatabaseSchema} json Restore from json stream.
// * @return {!ydn.db.schema.Database} create new database schema from JSON
// * string.
// */
//ydn.db.schema.Database.fromJSON = function(json) {
//  if (goog.DEBUG) {
//    var fields = ['version', 'stores'];
//    for (var key in json) {
//      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
//        throw new ydn.error.ArgumentException('Unknown field: ' + key + ' in ' +
//            ydn.json.stringify(json));
//      }
//    }
//  }
//  var stores = [];
//  var stores_json = json.stores || [];
//  for (var i = 0; i < stores_json.length; i++) {
//    stores.push(ydn.db.schema.Store.fromJSON(stores_json[i]));
//  }
//  return new ydn.db.schema.Database(json.version, stores);
//};


/**
 *
 * @param {number} idx index of stores.
 * @return {ydn.db.schema.Store} store schema at the index.
 */
ydn.db.schema.Database.prototype.store = function(idx) {
  return this.stores[idx] || null;
};


/**
 *
 * @return {number} number of store.
 */
ydn.db.schema.Database.prototype.count = function() {
  return this.stores.length;
};



/**
 *
 * @param {string} name store name.
 * @return {ydn.db.schema.Store} store if found.
 */
ydn.db.schema.Database.prototype.getStore = function(name) {
  return /** @type {ydn.db.schema.Store} */ (goog.array.find(this.stores,
      function(x) {
        return x.name == name;
      }));
};


/**
 * Get index of store.
 * @param {string} name store name.
 * @return {number} index of store -1 if not found.
 */
ydn.db.schema.Database.prototype.getIndexOf = function(name) {
  return goog.array.indexOf(this.stores,
      function(x) {
        return x.name == name;
      });
};


/**
 *
 * @param {string} name store name.
 * @return {boolean} return true if name found in stores.
 */
ydn.db.schema.Database.prototype.hasStore = function(name) {

  return goog.array.some(this.stores, function(x) {
    return x.name == name;
  });
};


/**
 * Return an explination what is different between the schemas.
 * @param {ydn.db.schema.Database} schema schema.
 * @return {string} return empty string if the two are similar.
 */
ydn.db.schema.Database.prototype.difference = function(schema) {
  if (!schema || this.stores.length != schema.stores.length) {
    return 'Number of store: ' + this.stores.length + ' vs ' +
      schema.stores.length;
  }
  for (var i = 0; i < this.stores.length; i++) {
    var store = schema.getStore(this.stores[i].name);
    var msg = this.stores[i].difference(store);
    if (msg.length > 0) {
      return 'store: "' + this.stores[i].name + '" ' + msg;
    }
  }

  return '';
};


/**
 *
 * @param {ydn.db.schema.Database} schema schema.
 * @return {boolean} true if given schema is similar to this schema.
 */
ydn.db.schema.Database.prototype.similar = function(schema) {
  return this.difference(schema).length == 0;
};


/**
 *
 * @return {!Array.<string>} Return list of store names.
 */
ydn.db.schema.Database.prototype.listStores = function() {
  if (!this.store_names) {
    /**
     * @final
     * @type {!Array.<string>}
     */
    this.store_names = goog.array.map(this.stores, function(x) {
      return x.name;
    });
  }
  return this.store_names;
};
