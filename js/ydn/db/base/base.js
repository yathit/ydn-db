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
 * SQLite store serialized object into this default column. This library
 * always create table with this default column of type BLOB.
 * @const
 * @type {string}
 */
ydn.db.base.DEFAULT_BLOB_COLUMN = '_default_';


/**
 * For JQuery output, deferred functions is slight different and adapt
 * the deferred to jquery style.
 * @define {boolean} true if target compile output is Jquery.
 */
ydn.db.base.JQUERY = false;


/**
 * Normally false, set to true only on compile flag when compile together with
 * module employ database hooks. There are two hooks define in
 * {@link ydn.db.schema.Store#preHook} and {@link ydn.db.schema.Store#postHook}
 * @define {boolean} Enable sync module.
 */
ydn.db.base.USE_HOOK = false;


/**
 * For stripping non IndexedDB code and unlocking IDB feature.
 * @define {boolean} remove IndexedDB module.
 */
ydn.db.base.NO_IDB = false;

/**
 *
 * @define {boolean} remove simple storage (webstorage) module.
 */
ydn.db.base.NO_SIMPLE = false;


/**
 *
 * @define {boolean} remove webstorage module.
 */
ydn.db.base.NO_WEBSQL = false;


/**
 * Default result limit during retrieving records from the database.
 * @const
 * @type {number}
 */
ydn.db.base.DEFAULT_RESULT_LIMIT = 100;


/**
 * Default connection time interval in ms.
 * @define {number}
 */
ydn.db.base.DEFAULT_CONNECTION_TIMEOUT = 30*60*1000;


/**
 * Create a new deferred instance depending on target platform.
 * @return {!goog.async.Deferred} newly created deferred object.
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
 * @private
 */
ydn.db.base.DefaultTransactionMode = {
  'READ_ONLY': 'readonly',
  'READ_WRITE': 'readwrite',
  'VERSION_CHANGE': 'versionchange'
};


/**
 * Before Chrome 22, IDBTransaction mode are number. New standard change to
 * string. Chrome 22 still follow standard, but weird new constants are
 * taking from the new standard.
 * HACK: The fun fact with current Chrome 22 defines  webkitIDBTransaction as
 * numeric value, but the database engine expect string format and display
 * deprecated warning.
 * For detail discussion see:
 * https://bitbucket.org/ytkyaw/ydn-db/issue/28
 * http://code.google.com/p/chromium/issues/detail?id=155171
 * https://bitbucket.org/ytkyaw/ydn-db/pull-request/8 Old firefox has them too.
 * @const
 * @private
 * @type {*}
 */
ydn.db.base.IDBTransaction = (goog.global.webkitIDBRequest && (
    'LOADING' in goog.global.webkitIDBRequest) ?
  (goog.global.webkitIDBTransaction || goog.global.IDBTransaction) :
  (goog.global.IDBRequest && ('LOADING' in goog.global.IDBRequest)) ?
  goog.global.IDBTransaction :  ydn.db.base.DefaultTransactionMode);


/**
 * The three possible transaction modes.
 * @see http://www.w3.org/TR/IndexedDB/#idl-def-IDBTransaction
 * @enum {string|number} string in new standard, number in old.
 */
ydn.db.base.TransactionMode = {
  READ_ONLY: ydn.db.base.IDBTransaction.READ_ONLY,
  READ_WRITE: ydn.db.base.IDBTransaction.READ_WRITE,
  VERSION_CHANGE: ydn.db.base.IDBTransaction.VERSION_CHANGE
};



/**
 * Mode for opening cursor
 * @enum {string|number}
 */
ydn.db.base.CursorMode = {
  READ_ONLY: ydn.db.base.TransactionMode.READ_ONLY,
  READ_WRITE: ydn.db.base.TransactionMode.READ_WRITE
};



/**
 * @define {boolean} if true, a default key-value text store should be created
 * in the abscent of configuration option.
 */
ydn.db.base.ENABLE_DEFAULT_TEXT_STORE = false;



/**
 * @define {boolean} flag to indicate to enable encryption.
 */
ydn.db.base.ENABLE_ENCRYPTION = false;




/**
 * Cursor direction.
 * @link http://www.w3.org/TR/IndexedDB/#dfn-direction
 * @enum {string} Cursor direction.
 */
ydn.db.base.Direction = {
  NEXT: 'next',
  NEXT_UNIQUE: 'nextunique',
  PREV: 'prev',
  PREV_UNIQUE: 'prevunique'
};



/**
 * @const
 * @type {!Array.<ydn.db.base.Direction>} Cursor directions.
 */
ydn.db.base.DIRECTIONS = [
  ydn.db.base.Direction.NEXT,
  ydn.db.base.Direction.NEXT_UNIQUE,
  ydn.db.base.Direction.PREV,
  ydn.db.base.Direction.PREV_UNIQUE
];


/**
 * Convert flag to direction enum.
 * @param {boolean=} reverse
 * @param {boolean=} unique
 * @return {ydn.db.base.Direction}
 */
ydn.db.base.getDirection = function(reverse, unique) {
  if (reverse) {
    return unique ? ydn.db.base.Direction.PREV_UNIQUE :
      ydn.db.base.Direction.PREV;
  } else {
    return unique ? ydn.db.base.Direction.NEXT_UNIQUE :
      ydn.db.base.Direction.NEXT;
  }
};

