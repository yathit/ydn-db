/**
 * @fileoverview Database plugin for jQuery.
 *
 * In jquery, this plugin bereave like single database instance.
 */


(function( $ ) {

  // inject ydn.db.Storage code here.

  $.db = new ydn.db.Storage();

  $.db.open = function(db_name, schema) {
    schema = schema || {};
    if ($.db.isReady()) {
      $.db.close();
      $.db = new ydn.db.Storage();
    } else {
      $.db.setSchema(schema);
      $.db.setDbName(db_name);
    }
  };


})( jQuery );
