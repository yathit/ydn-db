/**
 * @fileoverview Synchronization events.
 */


goog.provide('ydn.db.sync.Event');
goog.provide('ydn.db.sync.ConflictEvent');
goog.provide('ydn.db.sync.EventTypes');


/**
 * @enum {string}
 */
ydn.db.sync.EventTypes = {
  UPDATE_CONFLICT: 'update-conflict',
  DELETE_CONFLICT: 'delete-conflict',
  INSERT_CONFLICT: 'insert-conflict',
  UPDATED: 'updated'
};



/**
 *
 * @param {ydn.db.sync.EventTypes} event_type event type.
 * @param {goog.events.EventTarget} event_target target.
 * @param {number} status data from client side
 * @param {Object=} client_data data from client side
 * @param {Object=} server_data data from server side
 * @extends {goog.events.Event}
 * @constructor
 */
ydn.db.sync.Event = function(event_type, event_target, status, client_data, server_data) {
  goog.base(this, event_type, event_target);
  this.status = status;
  this.client_data = client_data;
  this.server_data = server_data;
};
goog.inherits(ydn.db.sync.Event, goog.events.Event);

/**
 * @protected
 * @type {number}
 */
ydn.db.sync.Event.prototype.status = NaN;


/**
 * @protected
 * @type {*}
 */
ydn.db.sync.Event.prototype.client_data = null;


/**
 * @protected
 * @type {*}
 */
ydn.db.sync.Event.prototype.server_data = null;

/**
 *
 * @return {number}
 */
ydn.db.sync.Event.prototype.getStatus = function() {
  return this.status;
};


/**
 *
 * @return {*}
 */
ydn.db.sync.Event.prototype.getClientData = function() {
  return this.client_data;
};

/**
 *
 * @return {*}
 */
ydn.db.sync.Event.prototype.getServerData = function() {
  return this.server_data;
};


/**
 *
 * @param {goog.events.EventTarget} event_target target.
 * @param {number} status data from client side
 * @param {Object=} client_data data from client side
 * @param {Object=} server_data data from server side
 * @extends {ydn.db.sync.Event}
 * @constructor
 */
ydn.db.sync.UpdateConflictEvent = function(event_target, status, client_data, server_data) {
  goog.base(this, ydn.db.sync.EventTypes.UPDATE_CONFLICT, event_target, status, client_data, server_data);

};
goog.inherits(ydn.db.sync.UpdateConflictEvent, ydn.db.sync.Event);

/**
 *
 * @param {goog.events.EventTarget} event_target target.
 * @param {number} status data from client side
 * @param {Object=} client_data data from client side
 * @param {Object=} server_data data from server side
 * @extends {ydn.db.sync.Event}
 * @constructor
 */
ydn.db.sync.DeleteConflictEvent = function(event_target, status, client_data, server_data) {
  goog.base(this, ydn.db.sync.EventTypes.DELETE_CONFLICT, event_target, status, client_data, server_data);

};
goog.inherits(ydn.db.sync.DeleteConflictEvent, ydn.db.sync.Event);


/**
 * Raise in GETting when server object is newer than client object.
 * @param {goog.events.EventTarget} event_target target.
 *  @param {number} status data from client side
 * @param {Object=} client_data data from client side
 * @param {Object=} server_data data from server side
 * @extends {ydn.db.sync.Event}
 * @constructor
 */
ydn.db.sync.UpdatedEvent = function(event_target, status, client_data, server_data) {
  goog.base(this, ydn.db.sync.EventTypes.UPDATED, event_target, status, client_data, server_data);

};
goog.inherits(ydn.db.sync.UpdatedEvent, ydn.db.sync.Event);



/**
 * Raise in POSTing when server reject the request.
 * @param {goog.events.EventTarget} event_target target.
 * @param {number} status data from client side
 * @param {Object} client_data
 * @extends {ydn.db.sync.Event}
 * @constructor
 */
ydn.db.sync.InsertConflictEvent = function(event_target, status, client_data) {
  goog.base(this, ydn.db.sync.EventTypes.INSERT_CONFLICT, event_target, status, client_data);

};
goog.inherits(ydn.db.sync.InsertConflictEvent, ydn.db.sync.Event);
