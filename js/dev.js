/**
 * @fileoverview Exports for dev-ydn-db module.
 *
 */

goog.require('goog.debug.Console');
goog.require('goog.debug.Logger');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.conn.Storage');


(function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
})();


/**
 *
 * @param {number=} scale
 * @param {string=} logger
 */
ydn.db.conn.Storage.prototype.log = function (scale, logger) {

  logger = logger || 'ydn.db';
  var level = goog.isDef(scale) ? new goog.debug.Logger.Level('log', scale) :
    goog.debug.Logger.Level.FINE;
  goog.debug.Logger.getLogger(logger).setLevel(level);

};

goog.exportProperty(ydn.db.conn.Storage.prototype, 'log',
  ydn.db.conn.Storage.prototype.log);