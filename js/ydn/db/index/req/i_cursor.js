/**
 * @fileoverview cursor interface.
 */


goog.provide('ydn.db.index.req.ICursor');
goog.require('goog.disposable.IDisposable');


/**
 * @interface
 * @extends {goog.disposable.IDisposable}
 */
ydn.db.index.req.ICursor = function() {};


/**
 *
 * @param {!Error} error
 */
ydn.db.index.req.ICursor.prototype.onError = goog.abstractMethod;


/**
 * onSuccess handler is called before onNext callback. The purpose of
 * onSuccess handler is apply filter. If filter condition are not meet,
 * onSuccess return next advancement value skipping onNext callback.
 *
 * @param {IDBKey=} primary_key
 * @param {IDBKey=} key
 * @param {*=} value
 * @return {*}
 */
ydn.db.index.req.ICursor.prototype.onSuccess = goog.abstractMethod;


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {*=} opt_ini_key effective key to resume position.
 * @param {*=} opt_ini_primary_key primary key to resume position.
 */
ydn.db.index.req.ICursor.prototype.openCursor = goog.abstractMethod;



/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey=} primary_key primary key position to continue.
 */
ydn.db.index.req.ICursor.prototype.continuePrimaryKey = goog.abstractMethod;


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} effective_key effective key position to continue.
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


/**
 * @return {boolean}
 */
ydn.db.index.req.ICursor.prototype.hasCursor =  goog.abstractMethod;


/**
 * @param {!Object} obj record value.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.index.req.ICursor.prototype.update = goog.abstractMethod;


/**
 * Clear record
 * @return {!goog.async.Deferred} value.
 */
ydn.db.index.req.ICursor.prototype.clear = goog.abstractMethod;

