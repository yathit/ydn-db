/**
 * @fileoverview Cursor object for executing in WebSQL.
 */


goog.provide('ydn.db.SqlCursor');
goog.require('ydn.db.Cursor');
goog.require('ydn.json');


/**
 *
 * @param {!ydn.db.StoreSchema} store store name.
 * @constructor
 * @extends {ydn.db.Cursor}
 */
ydn.db.SqlCursor = function(store) {
  goog.base(this, store.name);

  this.store = store;
  this.sql = '';
  this.params = [];
};
goog.inherits(ydn.db.SqlCursor, ydn.db.Cursor);


/**
 * @protected
 * @type {ydn.db.StoreSchema}
 */
ydn.db.SqlCursor.prototype.store = null;


/**
 * SQL statement for executing.
 * @type {string}
 */
ydn.db.SqlCursor.prototype.sql = '';


/**
 * SQL parameters for executing SQL.
 * @type {!Array.<string>}
 */
ydn.db.SqlCursor.prototype.params = [];



/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @final
 * @param {ydn.db.StoreSchema} store
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.SqlCursor.parseRow = function(store, row) {
  var value = ydn.json.parse(row[ydn.db.base.DEFAULT_BLOB_COLUMN]);
  if (goog.isDefAndNotNull(store.keyPath)) {
    var key = ydn.db.IndexSchema.sql2js(row[store.keyPath], store.type);
    store.setKeyValue(value, key);
  }
  for (var j = 0; j < store.indexes.length; j++) {
    var index = store.indexes[j];
    if (index.name == ydn.db.base.DEFAULT_BLOB_COLUMN) {
      continue;
    }
    var x = row[index.name];
    value[index.name] = ydn.db.IndexSchema.sql2js(x, index.type);
  }
  return value;
};



/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.SqlCursor.prototype.parseRow = function(row) {
  goog.asserts.assertObject(this.store);
  return ydn.db.SqlCursor.parseRow(this.store, row);
};

/**
 * Return given input row.
 * @final
 * @param {!Object} row row.
 * @return {!Object} the first field of object in row value.
 */
ydn.db.SqlCursor.parseRowIdentity = function (row) {
  return row;
};




