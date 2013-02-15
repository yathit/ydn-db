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
  CONFLICT: 'conflict',
  INSERT_ERROR: 'not_created'
};



/**
 *
 * @param {ydn.db.sync.EventTypes} event_type event type.
 * @param {goog.events.EventTarget} event_target target.
 * @param {Object=} client_data data from client side
 * @param {Object=} server_data data from server side
 * @extends {goog.events.Event}
 * @constructor
 */
ydn.db.sync.Event = function(event_type, event_target, client_data, server_data) {
  goog.base(this, event_type, event_target);
  this.client_data = client_data;
  this.server_data = server_data;
};
goog.inherits(ydn.db.sync.Event, goog.events.Event);


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
 * @param {Object=} client_data data from client side
 * @param {Object=} server_data data from server side
 * @extends {ydn.db.sync.Event}
 * @constructor
 */
ydn.db.sync.ConflictEvent = function(event_target, client_data, server_data) {
  goog.base(this, ydn.db.sync.EventTypes.CONFLICT, event_target, client_data, server_data);

};
goog.inherits(ydn.db.sync.ConflictEvent, ydn.db.sync.Event);



/**
 *
 * @param {goog.events.EventTarget} event_target target.
 * @param {Object} client_data
 * @extends {ydn.db.sync.Event}
 * @constructor
 */
ydn.db.sync.InsertErrorEvent = function(event_target, client_data) {
  goog.base(this, ydn.db.sync.EventTypes.INSERT_ERROR, event_target, client_data);

};
goog.inherits(ydn.db.sync.ConflictEvent, ydn.db.sync.Event);
