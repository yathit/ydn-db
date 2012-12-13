// Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
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
 * @fileoverview SQL object.
 *
 * Analyze SQL statement and extract execution scope.
 */


goog.provide('ydn.db.Sql');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.schema.Database');
goog.require('ydn.error.ArgumentException');
goog.require('ydn.db.sql.req.IdbQuery');
goog.require('ydn.math.Expression');
goog.require('ydn.string');



/**
 * @param {string} sql The sql statement.
 * @constructor
 */
ydn.db.Sql = function(sql) {

  if (!goog.isString(sql)) {
    throw new ydn.error.ArgumentException();
  }

  this.sql_ = sql;

  // basic parsing
  sql = sql.replace(/\s+ORDER BY\s+/ig, ' ORDER_BY ');

  var tokens = ydn.string.split_space(sql);

  // action
  var token = tokens.shift();
  var action = token.toUpperCase();
  if (action == 'SELECT') {
    this.mode_ = ydn.db.base.TransactionMode.READ_ONLY;
  } else if (action == 'INSERT') {
    this.mode_ = ydn.db.base.TransactionMode.READ_WRITE;
  } else if (action == 'UPDATE') {
    this.mode_ = ydn.db.base.TransactionMode.READ_WRITE;
  } else if (action == 'DELETE') {
    this.mode_ = ydn.db.base.TransactionMode.READ_WRITE;
  } else {
    throw new ydn.db.SqlParseError('Unknown SQL verb: ' + token);
  }

  /**
   *
   * @return {?string}
   */
  var eatTo = function(tok) {
    var token;
    while (token = tokens.shift()) {
      if (token.toUpperCase() == tok) {
        return tok;
      }
    }
    return null;
  };

  var from = eatTo('FROM');
  if (!from) {
    throw new ydn.db.SqlParseError('SQL statement must have a keyword FROM');
  }

  var store = tokens.shift();
  this.store_names_ = [store]; // currently only one is supported

  // that is all we need to do here.

};


/**
 * @private
 * @type {string} sql statement.
 */
ydn.db.Sql.prototype.sql_ = '';


/**
 *
 * @type {ydn.db.base.TransactionMode}
 * @private
 */
ydn.db.Sql.prototype.mode_ = ydn.db.base.TransactionMode.READ_ONLY;


/**
 *
 * @type {number}
 * @private
 */
ydn.db.Sql.prototype.num_params_ = 0;

/**
 * @private
 * @type {Array.<string>}
 */
ydn.db.Sql.prototype.store_names_;


/**
 * @private
 * @type {string}
 */
ydn.db.Sql.prototype.scope_;


/**
 *
 * @return {string}
 */
ydn.db.Sql.prototype.getSql = function() {
  return this.sql_;
};


/**
 * @protected
 * @param {string} sql sql statement to parse.
 * @return {{
 *    action: string,
 *    fields: (string|!Array.<string>|undefined),
 *    store_name: string,
 *    wheres: !Array.<string>
 *  }} functional equivalent of SQL.
 * @throws {ydn.error.ArgumentException}
 */
ydn.db.Sql.prototype.parseSql = function(sql) {
  var from_parts = sql.split(/\sFROM\s/i);
  if (from_parts.length != 2) {
    throw new ydn.error.ArgumentException('FROM required.');
  }

  // Parse Pre-FROM
  var pre_from_parts = from_parts[0].match(
    /\s*?(SELECT|COUNT|MAX|AVG|MIN|CONCAT)\s*(.*)/i);
  if (pre_from_parts.length != 3) {
    throw new ydn.error.ArgumentException('Unable to parse: ' + sql);
  }
  var action = pre_from_parts[1].toUpperCase();
  var action_arg = pre_from_parts[2].trim();
  var fields = undefined;
  if (action_arg.length > 0 && action_arg != '*') {
    if (action_arg[0] == '(') {
      action_arg = action_arg.substring(1);
    }
    if (action_arg[action_arg.length - 2] == ')') {
      action_arg = action_arg.substring(0, action_arg.length - 2);
    }
    if (action_arg.indexOf(',') > 0) {
      fields = ydn.string.split_comma_seperated(action_arg);
      fields = goog.array.map(fields, function(x) {
        return goog.string.stripQuotes(x, '"');
      });
    } else {
      fields = action_arg;
    }
  }

  // Parse FROM
  var parts = from_parts[1].trim().match(/"(.+)"\s*(.*)/);
  if (!parts) {
    throw new ydn.error.ArgumentException('store name required.');
  }
  var store_name = parts[1];
  var wheres = [];
  if (parts.length > 2) {
    wheres.push(parts[2]);
  }

  return {
    action: action,
    fields: fields,
    store_name: store_name,
    wheres: wheres
  };
};




/**
 * @inheritDoc
 */
ydn.db.Sql.prototype.toJSON = function() {
  return {
    'sql': this.sql_
  };
};




/**
 * @enum {string}
 */
ydn.db.Sql.MapType = {
  SELECT_MANY: 'sl',
  SELECT: 's1',
  EXPRESSION: 'ex'
};



/**
 * @enum {string}
 */
ydn.db.Sql.AggregateType = {
  COUNT: 'ct',
  SUM: 'sm',
  AVERAGE: 'av',
  MAX: 'mx',
  MIN: 'mn',
  SELECT: 'sl',
  CONCAT: 'cc',
  EXPRESSION: 'ex'
};




/**
 *
 * @return {!Array.<string>} store name.
 */
ydn.db.Sql.prototype.stores = function() {
  return goog.array.clone(this.store_names_);
};


/**
 *
 * @return {ydn.db.base.TransactionMode} store name.
 */
ydn.db.Sql.prototype.mode = function() {
  return this.mode_;
};




/**
 * @override
 */
ydn.db.Sql.prototype.toString = function() {
  if (goog.DEBUG) {
    return 'query:' + this.sql_;
  } else {
    return goog.base(this, 'toString');
  }
};


