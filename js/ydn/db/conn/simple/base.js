/**
 * @fileoverview basic utilities.
 */

goog.provide('ydn.db.com.simple');



/**
 * Storage key namespace.
 * @const
 * @type {string}  Storage key namespace.
 */
ydn.db.con.simple.NAMESPACE = 'ydn.db';



/**
 *
 * @const
 * @type {string} separator between tokens.
 */
ydn.db.con.simple.SEP = '^|';




/**
 * Use store name and id to form a key to use in setting key to storage.
 * @param {string} db_name database name.
 * @param {string=} store_name table name.
 * @param {IDBKey=} id id.
 * @return {string} canonical key name.
 */
ydn.db.con.simple.makeKey = function(db_name, store_name, id) {
  var parts = [ydn.db.con.simple.NAMESPACE, db_name];
  if (goog.isDef(store_name)) {
    parts.push(store_name);
    if (goog.isDef(id)) {
      parts.push(ydn.db.utils.encodeKey(id));
    }
  }
  return parts.join(ydn.db.con.simple.SEP);
};