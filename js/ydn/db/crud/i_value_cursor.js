/**
 * @fileoverview Transient cursor.
 */


goog.provide('ydn.db.IValueCursor');
goog.require('ydn.db.ICursor');


/**
 *
 * @interface
 * @extends {ydn.db.ICursor}
 */
ydn.db.IValueCursor = function() {
};


/**
 *
 * @param {number=} store index, starting from base to peer stores.
 * @return {*} return cursor value.
 */
ydn.db.IValueCursor.prototype.value = goog.abstractMethod;


/**
 * @param {*} cursor value to update.
 * @param {number=} store index, starting from base to peer stores.
 * @return {!goog.async.Deferred} promise for complete.
 */
ydn.db.IValueCursor.prototype.update = goog.abstractMethod;


/**
 * @param {number=} store index, starting from base to peer stores.
 * @return {!goog.async.Deferred} promise for complete.
 */
ydn.db.IValueCursor.prototype.clear = goog.abstractMethod;


