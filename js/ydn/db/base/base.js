/**
 * @fileoverview Define base constants.
 */


goog.provide('ydn.db.base');

goog.require('goog.async.Deferred');


/**
 * When key column is not defined, You can access the ROWID of an SQLite table
 * using one the special column names ROWID, _ROWID_, or OID.
 *
 * http://www.sqlite.org/autoinc.html
 * @const
 * @type {string}
 */
ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME = '_ROWID_';


/**
 * Non-indexed field are store in this default field. There is always a column
 * in each table.
 * @const
 * @type {string}
 */
ydn.db.base.DEFAULT_BLOB_COLUMN = '_default_';


/**
 * Target for jquery
 * @define {boolean}
 */
ydn.db.base.JQUERY = false;


/**
 * Create a new deferred instance depending on target platform.
 * @return {!goog.async.Deferred}
 */
ydn.db.base.createDeferred = function() {
  if (ydn.db.base.JQUERY) {
    return new goog.async.Deferred();
  } else {
    return new goog.async.Deferred();
  }
};


/**
 * Event types the Transaction can dispatch. COMPLETE events are dispatched
 * when the transaction is committed. If a transaction is aborted it dispatches
 * both an ABORT event and an ERROR event with the ABORT_ERR code. Error events
 * are dispatched on any error.
 *
 * @see {@link goog.db.Transaction.EventTypes}
 *
 * @enum {string}
 */
ydn.db.base.TransactionEventTypes = {
  COMPLETE: 'complete',
  ABORT: 'abort',
  ERROR: 'error'
};


/**
 * The three possible transaction modes.
 * @see http://www.w3.org/TR/IndexedDB/#idl-def-IDBTransaction
 * @enum {string|number}
 */
ydn.db.base.TransactionMode = {
  READ_ONLY: 'readonly',
  READ_WRITE: 'readwrite',
  VERSION_CHANGE: 'versionchange'
};



/**
 * @define {boolean}
 */
ydn.db.base.ENABLE_DEFAULT_TEXT_STORE = true;



/**
 * @define {boolean}
 */
ydn.db.base.ENABLE_ENCRYPTION = false;