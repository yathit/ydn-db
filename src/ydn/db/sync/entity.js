// Copyright 2013 YDN Authors. All Rights Reserved.
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
 * @fileoverview Represent Entity providing CRUD requests and persistent.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.sync.Entity');
goog.require('goog.events.EventTarget');
goog.require('ydn.db.Key');
goog.require('ydn.db.core.Storage');
goog.require('ydn.db.sync.IService');



/**
 * Synchronized Entity.
 * @param {ydn.db.sync.IService} service entity source.
 * @param {string} name entity name.
 * @param {ydn.db.core.Storage} db storage database name.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
ydn.db.sync.Entity = function(service, name, db) {
  goog.base(this);
  /**
   * @type {ydn.db.sync.IService}
   * @protected
   * @final
   */
  this.service = service;

  /**
   * Entity name.
   * @type {string}
   * @final
   */
  this.name = name;

  /**
   * @protected
   * @type {ydn.db.core.Storage}
   */
  this.db = db;

  /**
   * @type {ydn.db.core.DbOperator}
   */
  this.atomic = /** @type {ydn.db.core.DbOperator} */ (this.db.branch(ydn.db.tr.Thread.Policy.ATOMIC, false));

  /**
   * Deferred for updating entities.
   * @type {ydn.async.Deferred}
   * @private
   */
  this.dfUpdate_ = null;

};
goog.inherits(ydn.db.sync.Entity, goog.events.EventTarget);


/**
 * @protected
 * @type {goog.log.Logger}
 */
ydn.db.sync.Entity.prototype.logger = goog.log.getLogger('ydn.db.sync.Entity');


/**
 * Cache storage instance.
 * @type {Object.<ydn.db.core.Storage>}
 * @private
 */
ydn.db.sync.Entity.storages_ = {};


/**
 * Log operation.
 * @enum {string}
 */
ydn.db.sync.Entity.Operation = {
  GET: 'get',
  ADD: 'add',
  PUT: 'put',
  DELETE: 'del'
};


/**
 * Log history for WAL.
 * @param {ydn.db.sync.Entity.Operation} op
 * @param {IDBKey} id entity id
 * @param {Object} obj new object.
 * @return {goog.async.Deferred} resolved with history record.
 * @private
 */
ydn.db.sync.Entity.prototype.logHistory_ = function(op, id, obj) {
  var record = {
    'op': op,
    'entity': this.name,
    'id': id,
    'new': obj,
    'timestamp': new Date().getTime()
  };
  if (op == ydn.db.sync.Entity.Operation.ADD) {
    return this.db.put(ydn.db.base.SN_ENTITY_HISTORY, record).addCallback(function(seq) {
      record['sequence'] = seq;
      return record;
    });
  } else {
    var df = new goog.async.Deferred();
    this.getFromDb(id).addCallback(function(arr) {
      record['old'] = arr[0];
      record['key'] = [id];
      if (goog.isDefAndNotNull(arr[1])) {
        record['key'].push(arr[1]);
      }
      this.db.put(ydn.db.base.SN_ENTITY_HISTORY, record).addCallback(function(seq) {
        record['sequence'] = seq;
        return record;
      }).chainDeferred(df);
    }, this);
    return df;
  }
};


/**
 * Remove history log.
 * @param {string} id history sequence id.
 * @return {ydn.db.Request}
 */
ydn.db.sync.Entity.prototype.clearHistory = function(id) {
  return this.db.remove('_history', id);
};


/**
 * @type {number}
 * @private
 */
ydn.db.sync.Entity.prototype.update_refactory_period_ = 200;


/**
 * Recursively fetch entries from server to local.
 * @param {ydn.async.Deferred.<number>} df notifier, return total number of
 * entries fetched.
 * @param {number} total total number retries fetched.
 * @param {*} token next token.
 * @private
 */
ydn.db.sync.Entity.prototype.fetch_ = function(df, total, token) {
  var me = this;
  this.service.list(function(status, entries, ids, tokens, next_token) {
    if (status == 200) {
      var n = entries.length;
      if (n > 0) {
        me.db.run(function(tdb) {
          var dbo = /** @type {ydn.db.crud.DbOperator} */ (tdb);
          var keys = [];
          for (var i = 0; i < ids.length; i++) {
            if (goog.DEBUG && !ydn.db.Key.isValidKey(ids[i])) {
              throw new Error('Invalid key "' + ids[i] + '" at ' + i + ' of ' +
                  ids.length + ' keys');
            }
            dbo.clear(me.name, ydn.db.KeyRange.starts([ids[i]]));
            keys[i] = [ids[i]];
            if (tokens && goog.isDefAndNotNull(tokens[i])) {
              keys[i].push(tokens[i]);
            }
          }
          dbo.put(me.name, entries, keys);
        }, [me.name], ydn.db.base.StandardTransactionMode.READ_WRITE)
            .addCallbacks(function() {
              total += n;
              if (next_token && n > 0) {
                df.notify(total);
                me.fetch_(df, total, next_token);
              } else {
                df.callback(total);
              }
            }, function(e) {
              df.errback(e);
            });
      } else {
        df.callback(total);
      }
    } else {
      df.errback(status);
    }
  }, this.name, token);
};


/**
 * @enum {string} type of events dispatched by {@link ydn.db.sync.Entity}.
 */
ydn.db.sync.Entity.EventType = {
  /** dispatch update event after changes from server during update process */
  CHANGE: 'change',
  /** dispatch update event after updated from server */
  UPDATED: 'updated'
};


/**
 * Update local cache.
 * @return {!ydn.async.Deferred} resolved with number of records updated.
 */
ydn.db.sync.Entity.prototype.update = function() {
  if (!this.dfUpdate_) {
    this.dfUpdate_ = new ydn.async.Deferred();
    this.dfUpdate_.addProgback(function() {
      this.dispatchEvent(new goog.events.Event(ydn.db.sync.Entity.EventType.CHANGE, this));
    }, this);
    this.dfUpdate_.addCallbacks(function(cnt) {
      if (cnt > 0) {
        this.dispatchEvent(new goog.events.Event(ydn.db.sync.Entity.EventType.UPDATED, this));
      }
      var me = this;
      setTimeout(function() {
        me.dfUpdate_ = null;
      }, this.update_refactory_period_);
    }, function(e) {
      this.dfUpdate_ = null;
    }, this);
    this.fetch_(this.dfUpdate_, 0, null);
  }
  return this.dfUpdate_;
};


/**
 * Invalidate local cache.
 */
ydn.db.sync.Entity.prototype.invalidate = function() {
  throw new Error('NotImplemented');
};


/**
 * Get record value from database.
 * @param {IDBKey} id
 * @return {!goog.async.Deferred} resolved with two elements array 1) record
 * value and 2) validator token
 * @protected
 */
ydn.db.sync.Entity.prototype.getFromDb = function(id) {
  var iter = ydn.db.ValueIterator.where(this.name, 'starts', [id]);
  var value, token;
  return this.atomic.open(function(cursor) {
    var key = cursor.getKey();
    token = key[1];
    value = cursor.getValue();
    return null;
  }, iter, ydn.db.base.TransactionMode.READ_ONLY, this).addCallback(function() {
    return [value, token];
  });
};


/**
 * Get Item. Local data, if available, is notified in progress and server validated data in resolve callback.
 * @param {IDBKey} id
 * @return {!ydn.async.Deferred} return a `Promise` object with progress notification.
 */
ydn.db.sync.Entity.prototype.get = function(id) {
  var deferred = new ydn.async.Deferred();
  var db = this.db;
  var name = this.name;
  this.getFromDb(id).addCallback(function(arr) {
    var db_obj = arr[0];
    var token = arr[1];
    if (db_obj) {
      deferred.notify(db_obj);
    }
    this.service.get(function(status, obj, token) {
      if (status == 200) {
        var key = [id];
        if (goog.isDefAndNotNull(token)) {
          key.push(token);
        }
        db.put(name, /** @type {!Object} */ (obj), key);
        deferred.callback(obj);
      } else if (status == 404) { // Not Found
        if (db_obj) {
          db.clear(name, ydn.db.KeyRange.starts([id]));
        }
        deferred.callback(undefined);
      } else if (status == 304) { // Not Modified
        deferred.callback(db_obj);
      } else {
        var e = new Error(status);
        if (!status) {
          e.name = 'NetworkError';
        }
        deferred.errback(e);
      }
    }, this.name, id, token);
  }, this);
  return deferred;
};


/**
 * Add item.
 * @param {!Object} record record value.
 * @return {!goog.async.Deferred<Object>} server respound object or given object.
 */
ydn.db.sync.Entity.prototype.add = function(record) {
  var me = this;
  goog.log.finer(this.logger, this + ' adding a record');
  return this.atomic.add(this.name, record).addCallback(function(temp_id) {
    goog.log.finest(me.logger, me + ' add new record as ' + temp_id);
    return me.logHistory_(ydn.db.sync.Entity.Operation.ADD, temp_id, record).addCallback(function(seq) {
      goog.log.finest(me.logger, me + ' log as ' + temp_id);
      var df = new goog.async.Deferred();
      me.service.add(function(status, obj, id, token) {
        if (status == 200 || status == 201) {
          if (goog.DEBUG && !ydn.db.Key.isValidKey(id)) {
            throw new Error('Invalid key "' + id + '" on adding to ' + me);
          }
          goog.log.finest(me.logger, me + ' backend persist as ' + id + ' [' +
              token + '] ' + status);
          me.db.run(function(tx) {
            var tx_db = /** @type {ydn.db.core.DbOperator} */ (tx);
            tx_db.remove(me.name, temp_id);
            var key = [id];
            if (goog.isDefAndNotNull(token)) {
              key.push(token);
            }
            var validated_record = obj || record;
            var aq = tx_db.add(me.name, validated_record, key);
            aq.addCallbacks(function(k) {
              goog.log.finer(me.logger, me + ' add ' + k + ' succeeded.');
              df.callback(validated_record);
            }, function(e) {
              goog.log.finer(me.logger, me + ' adding "' + key + '" failed ' +
                  e.message);
              if (goog.DEBUG) {
                window.console.error(e.stack || e);
              }
              df.errback(e);
            });

          }, [me.name, ydn.db.base.SN_ENTITY_HISTORY], ydn.db.base.StandardTransactionMode.READ_WRITE);
        } else {
          goog.log.finest(me.logger, me + ' backend persist fail, rolling back' +
              status);
          // roll back
          me.db.run(function(tx) {
            var tx_db = /** @type {ydn.db.core.DbOperator} */ (tx);
            tx_db.remove(me.name, temp_id);
            tx_db.remove(ydn.db.base.SN_ENTITY_HISTORY, seq['sequence']);
            goog.log.finest(me.logger, me + ' removed log and temp record.');
          }, [me.name, ydn.db.base.SN_ENTITY_HISTORY], ydn.db.base.StandardTransactionMode.READ_WRITE).addBoth(
              function() {
                df.errback(status);
              });
        }
      }, me.name, record);
      return df;
    });
  });
};


/**
 * Update item.
 * @param {IDBKey} id entry id.
 * @param {!Object} record record value.
 * @return {!goog.async.Deferred<Object>}  server respound object or given object.
 */
ydn.db.sync.Entity.prototype.put = function(id, record) {
  var me = this;
  return this.logHistory_(ydn.db.sync.Entity.Operation.PUT, id, record).addCallback(function(seq) {
    return me.atomic.put(me.name, record, seq['key']).addCallback(function(temp_id) {
      var df = new goog.async.Deferred();
      var token = seq['key'][1];
      me.service.put(function(status, obj, id, new_token) {
        if (status == 200 || status == 201) {
          me.db.run(function(tx) {
            var tx_db = /** @type {ydn.db.core.DbOperator} */ (tx);
            tx_db.remove(ydn.db.base.SN_ENTITY_HISTORY, seq['sequence']);
            tx_db.remove(me.name, seq['key']).addCallback(function() {
              var key = [id];
              if (goog.isDefAndNotNull(new_token)) {
                key.push(new_token);
              }
              var validated_record = obj || record;
              tx_db.put(me.name, validated_record, key);
            });

          }, [me.name, ydn.db.base.SN_ENTITY_HISTORY], ydn.db.base.StandardTransactionMode.READ_WRITE).addBoth(
              function() {
                df.callback(obj);
              });
        } else {
          // roll back
          me.db.run(function(tx) {
            var tx_db = /** @type {ydn.db.core.DbOperator} */ (tx);
            if (seq['old']) {
              tx_db.put(me.name, seq['old'], seq['key']);
            } else {
              tx_db.remove(me.name, seq['key']);
            }
            tx_db.remove(ydn.db.base.SN_ENTITY_HISTORY, seq['sequence']);
          }, [me.name, ydn.db.base.SN_ENTITY_HISTORY], ydn.db.base.StandardTransactionMode.READ_WRITE).addBoth(
              function() {
                df.errback(status);
              });
        }
      }, me.name, record, id, token);
      return df;
    });
  });
};


/**
 * Remove entity value.
 * @param {IDBKey} id entry id.
 * @return {!goog.async.Deferred} return HTTP status code.
 */
ydn.db.sync.Entity.prototype.remove = function(id) {
  return this.logHistory_(ydn.db.sync.Entity.Operation.DELETE, id, null).addCallback(function(seq) {
    return this.db.remove(this.name, seq['key']).addCallback(function(cnt) {
      var df = new goog.async.Deferred();
      var token = seq['key'][1];
      var me = this;
      this.service.remove(function(status) {
        if (status == 200 || status == 404) {
          me.db.remove(ydn.db.base.SN_ENTITY_HISTORY, seq['sequence']);
          df.callback(cnt);
        } else {
          // roll back
          me.db.run(function(tx) {
            var tx_db = /** @type {ydn.db.core.DbOperator} */ (tx);
            if (seq['old']) {
              tx_db.put(me.name, seq['old'], seq['key']);
            } else {
              tx_db.remove(me.name, seq['key']);
            }
            tx_db.remove(ydn.db.base.SN_ENTITY_HISTORY, seq['sequence']);
          }, [me.name, ydn.db.base.SN_ENTITY_HISTORY], ydn.db.base.StandardTransactionMode.READ_WRITE).addBoth(
              function() {
                df.errback(status);
              });
        }
      }, me.name, id, token);
      return df;
    }, this);
  }, this);
};


/**
 * @return {string} get entity name.
 */
ydn.db.sync.Entity.prototype.getName = function() {
  return this.name;
};


/**
 * Create a new entity.
 * @param {EntityService} service entity source.
 * @param {string} name entity name.
 * @return {ydn.db.sync.Entity}
 */
ydn.db.core.Storage.prototype.entityExport = function(service, name) {
  throw new Error('EntityServiceWrapperNotImplemented');
};


/**
 * Create a new entity.
 * @param {ydn.db.sync.IService} service entity source.
 * @param {string} name entity name.
 * @return {ydn.db.sync.Entity}
 */
ydn.db.core.Storage.prototype.entity = function(service, name) {
  return new ydn.db.sync.Entity(service, name, this);
};


/**
 * @override
 */
ydn.db.sync.Entity.prototype.toString = function() {
  return 'Entity:' + this.name;
};
