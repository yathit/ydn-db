/**
 * @fileoverview Event dispatch from Storage.
 *
 * User: kyawtun
 * Date: 20/10/12
 */


goog.provide('ydn.db.events.ObjectStoreEvent');
goog.provide('ydn.db.events.StorageEvent');
goog.provide('ydn.db.events.Types');


/**
 * Event types.
 *
 * Note: these event type string are exported.
 * @enum {string}
 */
ydn.db.events.Types = {
  CONNECTED: 'connected',
  CREATED: 'created',
  DELETED: 'deleted',
  FAIL: 'failed',
  UPDATED: 'updated'
};


/**
 *
 * @param {ydn.db.events.Types} event_type event type.
 * @param {goog.events.EventTarget} event_target target.
 * @param {*} source event source.
 * @extends {goog.events.Event}
 * @constructor
 */
ydn.db.events.Event = function(event_type, event_target, source) {
  goog.base(this, event_type, event_target);

  this.source = source;
};
goog.inherits(ydn.db.events.Event, goog.events.Event);


/**
 *
 * @type {*} event source.
 */
ydn.db.events.Event.prototype.source = null;


/**
 *
 * @param {ydn.db.events.Types} event_type type.
 * @param {goog.events.EventTarget} event_target event target.
 * @param {*} source source.
 * @param {string=} msg optional message.
 * @extends {ydn.db.events.Event}
 * @constructor
 */
ydn.db.events.StorageEvent = function(event_type, event_target, source, msg) {
  goog.base(this, event_type, event_target, source);
  this.message = msg || '';
};
goog.inherits(ydn.db.events.StorageEvent, ydn.db.events.Event);


/**
 *
 * @type {string}
 */
ydn.db.events.StorageEvent.prototype.message = '';


/**
 *
 * @param {ydn.db.events.Types} event_type  type.
 * @param {goog.events.EventTarget} event_target target.
 * @param {*} source source.
 * @extends {ydn.db.events.Event}
 * @constructor
 */
ydn.db.events.ObjectStoreEvent = function(event_type, event_target, source) {
  goog.base(this, event_type, event_target, source);
};
goog.inherits(ydn.db.events.ObjectStoreEvent, ydn.db.events.Event);
