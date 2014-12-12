/**
 * @fileoverview Mock backend service for testing.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.sync.MockEntityService');
goog.require('ydn.db.sync.IService');



/**
 * Mock backend service.
 * @param {Object} list of resources as key value pairs. Primary key is in `id` field.
 * @constructor
 * @implements {ydn.db.sync.IService}
 */
ydn.db.sync.MockEntityService = function(list) {
  this.resources = list || {};
  this.requests = {
    add: [],
    get: [],
    put: [],
    remove: [],
    list: []
  };
};


/**
 * Maximum number of results for list query.
 * @type {number}
 */
ydn.db.sync.MockEntityService.prototype.max_results = 10000;


/**
 * Send HTTP get request.
 * @param {function(number, !Object, ?string)} callback status code and result
 * @param {string} name entity name
 * @param {IDBKey} id entity id
 * @param {?string} token validator token
 */
ydn.db.sync.MockEntityService.prototype.get = function(callback, name, id, token) {
  this.requests.get.push(name + '/' + id);
  var status = 404;
  var obj = null;
  if (this.list[id]) {
    obj = this.list[id];
    status = 200;
  }
  setTimeout(function() {
    callback(status, obj, null);
  }, 10);
};


/**
 * Write collection.
 * @param {function(number, !Object, IDBKey, ?string)} callback status code, validator and result
 * @param {IDBKey} name entity name
 * @param {Object} obj
 */
ydn.db.sync.MockEntityService.prototype.add = function(callback, name, obj) {
  this.requests.add.push(name);
  this.list[obj.id] = obj;
  setTimeout(function() {
    callback(201, obj, obj.id, null);
  }, 10);
};


/**
 * Write collection.
 * @param {function(number, !Object, IDBKey, ?string)} callback status code and result
 * @param {string} name entity name
 * @param {Object} obj entity value
 * @param {IDBKey} id entity id
 * @param {string} token validator token
 */
ydn.db.sync.MockEntityService.prototype.put = function(callback, name, obj, id, token) {
  this.requests.put.push(name + '/' + id);
  var status = this.list[id] ? 200 : 201;
  this.list[id] = obj;
  setTimeout(function() {
    callback(status, obj, id, null);
  }, 10);
};


/**
 * Write collection.
 * @param {function(number)} callback status code and result
 * @param {string} name entity name
 * @param {IDBKey} id entity id
 * @param {string} token validator token
 */
ydn.db.sync.MockEntityService.prototype.remove = function(callback, name, id, token) {
  this.requests.remove.push(name + '/' + id);
  var status = 404;
  if (this.list[id]) {
    delete this.list[id];
    status = 200;
  }
  setTimeout(function() {
    callback(status);
  }, 10);
};


/**
 * @override
 */
ydn.db.sync.MockEntityService.prototype.list = function(callback, name, token) {
  var keys = Object.keys(this.resources);
  var ids = [];
  var arr = [];
  var offset = keys.indexOf(token);
  var next = null;
  this.requests.list.push(name + '?token=' + token);
  for (var i = offset + 1; arr.length < this.max_results && i < keys.length; i++) {
    next = keys[i];
    ids.push(next);
    arr.push(this.resources[next]);
  }
  var next_token = offset + this.max_results <  arr.length ? next : null;
  setTimeout(function() {
    callback(200, arr, ids, null, next_token);
  }, 10);
};


/**
 * Count number of request made.
 * @param {string} method
 * @return {number}
 */
ydn.db.sync.MockEntityService.prototype.countRequest = function(method) {
  return this.requests[method].length;
};
