/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 24/2/13
 */


goog.provide('ydn.db.schema.Index');
goog.provide('ydn.db.schema.DataType');
goog.require('ydn.db.base');
goog.require('ydn.debug.error.ArgumentException');
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
    throw new ydn.debug.error.ArgumentException('index keyPath or name required.');
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
    throw new ydn.debug.error.ArgumentException('Invalid index type: ' + opt_type +
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
  ydn.db.schema.DataType.DATE,
  ydn.db.schema.DataType.INTEGER,
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
        throw new ydn.debug.error.ArgumentException('Unknown field: ' + key + ' in ' +
            ydn.json.stringify(json));
      }
    }
  }
  return new ydn.db.schema.Index(json.keyPath, json.type, json.unique,
      json.multiEntry, json.name);
};

