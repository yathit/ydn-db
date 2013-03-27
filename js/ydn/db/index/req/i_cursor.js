/**
 * @fileoverview cursor interface.
 */


goog.provide('ydn.db.index.req.ICursor');


/**
 * @interface
 */
ydn.db.index.req.ICursor = function() {};


/**
 * Callback to receive requested cursor value.
 *
 * Requester must handle the cursor value synchronously and decide the
 * next move by invoking forward.
 * @param {IDBKey|undefined} primary_key
 * @param {IDBKey|undefined} key
 * @param {*|undefined} value
 */
ydn.db.index.req.ICursor.prototype.onNext = goog.abstractMethod;


/**
 *
 * @param {Error} error
 */
ydn.db.index.req.ICursor.prototype.onError = goog.abstractMethod;

/**
 * onSuccess handler is called before onNext callback. The purpose of
 * onSuccess handler is apply filter. If filter condition are not meet,
 * onSuccess return next advancement value skipping onNext callback.
 *
 * @param {IDBKey|undefined} primary_key
 * @param {IDBKey|undefined} key
 * @param {*} value
 * @return {*}
 */
ydn.db.index.req.ICursor.prototype.onSuccess = goog.abstractMethod;


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey=} primary_key
 */
ydn.db.index.req.ICursor.prototype.continuePrimaryKey = goog.abstractMethod;


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} effective_key
 */
ydn.db.index.req.ICursor.prototype.continueEffectiveKey = goog.abstractMethod;


/**
 * Move cursor position to the effective key.
 * @param {number} number_of_step
 */
ydn.db.index.req.ICursor.prototype.advance = goog.abstractMethod;


/**
 * Restart the cursor. If previous cursor position is given,
 * the position is skip.
 * @param {IDBKey=} effective_key previous position.
 * @param {IDBKey=} primary_key
 */
ydn.db.index.req.ICursor.prototype.restart = goog.abstractMethod;