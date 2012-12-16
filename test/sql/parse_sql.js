/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 15/12/12
 */


goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');


var test_select = function() {
  var sql = new ydn.db.Sql('SELECT * from st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertEquals('selList', null, sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());

  sql = new ydn.db.Sql('SELECT f1 from st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('selList', ['f1'], sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());

  sql = new ydn.db.Sql('SELECT f1, f2 from st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('selList', ['f1', 'f2'], sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());

  sql = new ydn.db.Sql('SELECT (f3, f4) from st1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('selList', ['f3', 'f4'], sql.getSelList());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
};


var test_where_int = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x = 1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertEquals('lower', 1, wheres[0].lower);
  assertEquals('lowerOpen', false, wheres[0].lowerOpen);
  assertEquals('upper', 1, wheres[0].upper);
  assertEquals('upperOpen', false, wheres[0].upperOpen);
};

var test_where_float = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x = 0.5');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertEquals('lower', 0.5, wheres[0].lower);
  assertEquals('lowerOpen', false, wheres[0].lowerOpen);
  assertEquals('upper', 0.5, wheres[0].upper);
  assertEquals('upperOpen', false, wheres[0].upperOpen);
};

var test_where_double_quoted_string = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st2 WHERE y = "1"');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st2'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertEquals('lower', '1', wheres[0].lower);
  assertEquals('lowerOpen', false, wheres[0].lowerOpen);
  assertEquals('upper', '1', wheres[0].upper);
  assertEquals('upperOpen', false, wheres[0].upperOpen);
};

var test_where_single_quoted_string = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st2 WHERE y = \'1\'');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st2'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertEquals('lower', '1', wheres[0].lower);
  assertEquals('lowerOpen', false, wheres[0].lowerOpen);
  assertEquals('upper', '1', wheres[0].upper);
  assertEquals('upperOpen', false, wheres[0].upperOpen);
};


var test_where_gt = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x > 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertEquals('lower', 2, wheres[0].lower);
  assertEquals('lowerOpen', true, wheres[0].lowerOpen);
  assertUndefined('upper', wheres[0].upper);
};

var test_where_gte = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x >= 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  //console.log(wheres[0])
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertEquals('lower', 2, wheres[0].lower);
  assertEquals('lowerOpen', false, wheres[0].lowerOpen);
  assertUndefined('upper', wheres[0].upper);
};

var test_where_lt = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x < 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertUndefined('lower', wheres[0].lower);
  assertEquals('upper', 2, wheres[0].upper);
  assertEquals('upperOpen', true, wheres[0].upperOpen);
};

var test_where_lte = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x <= 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertUndefined('lower', wheres[0].lower);
  assertEquals('upper', 2, wheres[0].upper);
  assertEquals('upperOpen', false, wheres[0].upperOpen);
};


var test_where_bound = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 WHERE x >= 2 AND x < 4');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  var wheres = sql.getConditions();
  assertEquals('# wheres ' + wheres, 1, wheres.length);
  assertEquals('lower', 2, wheres[0].lower);
  assertEquals('lowerOpen', false, wheres[0].lowerOpen);
  assertEquals('upper', 4, wheres[0].upper);
  assertEquals('upperOpen', true, wheres[0].upperOpen);
};


var test_limit = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 LIMIT 5');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('limit', 5, sql.getLimit());
  assertNaN('offset', sql.getOffset());
};

var test_offset = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 OFFSET 5');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertNaN('limit', sql.getLimit());
  assertEquals('offset', 5, sql.getOffset());
};

var test_limit_offset = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 LIMIT 5 OFFSET 4');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('limit', 5, sql.getLimit());
  assertEquals('offset', 4, sql.getOffset());
};

var test_offset_limit = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 OFFSET 1 LIMIT 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('limit', 2, sql.getLimit());
  assertEquals('offset', 1, sql.getOffset());
};

var test_order = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
};

var test_order_single_quote = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY \'field 1\'');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'field 1', sql.getOrderBy());
};

var test_order_double_quote = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY "field 1"');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'field 1', sql.getOrderBy());
};

var test_order_limit = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1 LIMIT 1');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
  assertEquals('limit', 1, sql.getLimit());
  assertNaN('offset', sql.getOffset());
};

var test_order_limit_offset = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1 LIMIT 1 OFFSET 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
  assertEquals('limit', 1, sql.getLimit());
  assertEquals('offset', 2, sql.getOffset());
};

var test_order_offset = function() {
  var sql = new ydn.db.Sql('SELECT * FROM st1 ORDER BY f1 OFFSET 2');
  assertEquals('parse ok', '', sql.parse());
  assertEquals('action', 'SELECT', sql.getAction());
  assertArrayEquals('stores', ['st1'], sql.getStoreNames());
  assertEquals('order by', 'f1', sql.getOrderBy());
  assertNaN('limit', sql.getLimit());
  assertEquals('offset', 2, sql.getOffset());
};