/**
 * @fileoverview Cursor stream accept key and pop to a sink.
 *
 * User: kyawtun
 * Date: 11/11/12
 */

goog.provide('ydn.db.Streamer');



/**
 *
 * @param {ydn.db.Storage} storage storage connector.
 * @param {string} store_name store name.
 * @param {(function(*, Function): boolean)=} pop function to received output.
 * @param {string=} index_name index name. If given output is not cursor value,
 * but index value.
 * @constructor
 */
ydn.db.Streamer = function(storage, store_name, pop, index_name) {

  if (this.type() === ydn.db.con.IndexedDb.TYPE) {
    this.cursor_ = new ydn.db.con.IdbCursorStream(this, store_name, index_name);
  } else {
    throw new ydn.error.NotImplementedException(this.type());
  }

  this.store_name_ = store_name;
  this.sink_ = pop || null;
  this.index_name_ = index_name;
  this.stack_ = [];
  this.is_collecting_ = false;
};


/**
 *
 * @type {ydn.db.con.Storage}
 * @private
 */
ydn.db.Streamer.prototype.storage_ = null;


/**
 * @type {string}
 * @private
 */
ydn.db.Streamer.prototype.store_name_;


/**
 * @type {string|undefined}
 * @private
 */
ydn.db.Streamer.prototype.index_name_;


/**
 *
 * @type {(function(*, Function): boolean)?}
 */
ydn.db.Streamer.prototype.sink_ = null;


/**
 * @private
 * @type {Array}
 */
ydn.db.Streamer.prototype.stack_ = [];


/**
 *
 * @param {function(*, Function)} sink
 */
ydn.db.Streamer.prototype.setSink = function(sink) {
  this.sink_ = sink;
};


/**
 * Push the result because a result is ready. This will push untill still
 * is empty.
 * @private
 */
ydn.db.Streamer.prototype.push_ = function() {
  var on_queue = this.stack_.length > 0;
  if (on_queue && !this.is_collecting_) {
    if (goog.isFunction(this.sink_)) {
      var me = this;
      var waiter = function() {
        me.push_();
      };
      var value = this.stack_.shift();
      on_queue = this.stack_.length > 0;
      var to_wait = this.sink_(value, on_queue ? waiter : null);
      if (on_queue) {
        goog.asserts.assertBoolean(to_wait, 'sink must return a boolean.');
        if (to_wait === false) {
          this.push_();
        }
      } else {
        goog.asserts.assert(!goog.isDef(to_wait), 'sink must return undefined');
      }
    }
  }
};


ydn.db.Streamer.prototype.is_collecting_ = false;


/**
 * Collect results.
 * During collecting results, sink will not pop to the result. Pushing is
 * disable.
 * @param {Function} callback a callback function to receive the result array.
 * @throws ydn.ArgumentException if sink function is set.
 */
ydn.db.Streamer.prototype.collect = function(callback) {
  if (this.sink_) {
    throw new ydn.error.ArgumentException('already have a sink');
  }
  this.is_collecting_ = true;
  var me = this;
  this.cursor_.onFinish(function on_finish(e) {
    callback(me.stack_);
    me.stack_ = null;
    me.is_collecting_ = false;
  });

};


/**
 * Push a key.
 * @param {*} key key to seek the value.
 * @param {*=} value if already got the value.
 */
ydn.db.Streamer.prototype.push = function(key, value) {
  if (this.is_collecting_) {
    throw new ydn.error.InvalidOperationError('collecting');
  }
  if (arguments.length >= 2) {
    this.stack_.push(value);
    this.push_();
  } else {
    this.cursor_.seek(key);
  }
};


/**
 * @type {string}
 * @private
 */
ydn.db.Streamer.prototype.foreign_key_store_name;


/**
 * @type {string}
 * @private
 */
ydn.db.Streamer.prototype.foreign_key_index_name;


/**
 *
 * @param {string} store_name
 * @param {string=} index_name
 */
ydn.db.Streamer.prototype.setForeignKey = function(store_name, index_name) {
  this.foreign_key_store_name = store_name;
  this.foreign_key_index_name = index_name;
};


/**
 * Both of them may be undefined.
 * @return {!Array.<string>} return store_name and index_name.
 */
ydn.db.Streamer.prototype.getForeignKey = function() {
  return [this.foreign_key_store_name, this.foreign_key_index_name];
};