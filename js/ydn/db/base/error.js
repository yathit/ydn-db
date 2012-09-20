/**
 * Created with IntelliJ IDEA.
 * User: mbikt
 * Date: 9/12/12
 * Time: 9:44 AM
 * To change this template use File | Settings | File Templates.
 */

goog.provide('ydn.db.InvalidKeyException');
goog.provide('ydn.db.InvalidStateError');
goog.provide('ydn.db.InternalError');
goog.provide('ydn.db.ScopeError');
goog.provide('ydn.db.SecurityError');
goog.provide('ydn.db.NotFoundError');




/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InvalidKeyException = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InvalidKeyException);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.InvalidKeyException, Error);

ydn.db.InvalidKeyException.prototype.name = 'ydn.db.InvalidKeyException';



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.InternalError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.InternalError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.InternalError, Error);

ydn.db.InternalError.prototype.name = 'ydn.db.InternalError';


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


/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
ydn.db.DataCloneError = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.DataCloneError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(ydn.db.DataCloneError, Error);

ydn.db.DataCloneError.prototype.name = 'ydn.db.DataCloneError';


/**
 *
 * @param {SQLError} e
 * @param {*=} opt_msg
 * @constructor
 * @extends {Error}
 */
ydn.db.SQLError = function(e, opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.SQLError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.message += ' :' + e.message;
};
goog.inherits(ydn.db.SQLError, Error);

ydn.db.SQLError.prototype.name = 'ydn.db.SQLError';


/**
 *
 * @param {Error} e
 * @param {*=} opt_msg
 * @constructor
 * @extends {Error}
 */
ydn.db.SecurityError = function(e, opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ydn.db.SecurityError);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
  this.message += ' :' + e.message;
};
goog.inherits(ydn.db.SecurityError, Error);

ydn.db.SecurityError.prototype.name = 'ydn.db.SecurityError';

