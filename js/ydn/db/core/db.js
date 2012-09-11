// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Provide package variables.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db');
goog.provide('ydn.db.ValidKeyException');
goog.provide('ydn.db.InvalidStateError');
goog.require('goog.async.Deferred');



/**
 * Column name of key, if keyPath is not specified.
 * @const {string}
 */
ydn.db.DEFAULT_KEY_COLUMN = '_id_';


/**
 * Non-indexed field are store in this default field. There is always a column
 * in each table.
 * @const {string}
 */
ydn.db.DEFAULT_BLOB_COLUMN = '_default_';


/**
 * Target for jquery
 * @define {boolean}
 */
ydn.db.JQUERY = false;


/**
 * Create a new deferred instance depending on target platform.
 * @return {!goog.async.Deferred}
 */
ydn.db.createDeferred = function() {
  if (ydn.db.JQUERY) {
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
ydn.db.TransactionEventTypes = {
  COMPLETE: 'complete',
  ABORT: 'abort',
  ERROR: 'error'
};


/**
 * The three possible transaction modes.
 * @see http://www.w3.org/TR/IndexedDB/#idl-def-IDBTransaction
 * @enum {string|number}
 */
ydn.db.TransactionMode = {
  READ_ONLY: 'readonly',
  READ_WRITE: 'readwrite',
  VERSION_CHANGE: 'versionchange'
};


/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.ValidKeyException = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.ValidKeyException);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.ValidKeyException, Error);

ydn.db.ValidKeyException.prototype.name = 'ydn.db.ValidKeyException';




/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.ScopeError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.ScopeError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.ScopeError, Error);

ydn.db.ScopeError.prototype.name = 'ydn.db.ScopeError';


/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InvalidStateError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InvalidStateError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.InvalidStateError, Error);

ydn.db.InvalidStateError.prototype.name = 'ydn.db.InvalidStateError';




/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.NotFoundError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.NotFoundError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.NotFoundError, Error);

ydn.db.NotFoundError.prototype.name = 'ydn.db.NotFoundError';
