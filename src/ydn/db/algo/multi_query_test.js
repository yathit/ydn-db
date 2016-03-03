goog.provide('ydn.db.algo.MultiQueryTest');
goog.setTestOnly('ydn.db.algo.MultiQueryTest');
goog.require('goog.debug.Console');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('ydn.db.algo.MultiQuery');
goog.require('ydn.debug');

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();


var setUp = function() {
  ydn.json.POLY_FILL = true;
};

var tearDown = function() {

};


function test_lowest_key() {
  assertEquals(-1, ydn.db.algo.AbstractSolver.lowest([]));
  assertEquals(0, ydn.db.algo.AbstractSolver.lowest([1]));
  assertEquals(1, ydn.db.algo.AbstractSolver.lowest([2, 1]));
  assertEquals(1, ydn.db.algo.AbstractSolver.lowest([1, -1]));
  assertEquals(1, ydn.db.algo.AbstractSolver.lowest([1, 0, 2]));
}


function test_lowest_advancement() {
  assertArrayEquals([], ydn.db.algo.AbstractSolver.lowestAdvance([]));
  assertArrayEquals([1], ydn.db.algo.AbstractSolver.lowestAdvance([1]));
  assertArrayEquals([undefined, 1], ydn.db.algo.AbstractSolver.lowestAdvance([2, 1]));
  assertArrayEquals([undefined, undefined, 1], ydn.db.algo.AbstractSolver.lowestAdvance([1, 1, -1]));
  assertArrayEquals([undefined, 1, 1], ydn.db.algo.AbstractSolver.lowestAdvance([1, 0, 0, 2]));
}

var createData = function() {
  return [
    {id: 1, name: 'rat', color: 'brown', horn: 0, legs: 4},
    {id: 2, name: 'leopard', color: 'spots', horn: 2, legs: 4},
    {id: 3, name: 'galon', color: 'gold', horn: 10, legs: 2},
    {id: 4, name: 'tiger', color: 'spots', horn: 2, legs: 4},
    {id: 5, name: 'snake', color: 'spots', horn: 0, legs: 0},
    {id: 6, name: 'rhino', color: 'spots', horn: 1, legs: 4},
    {id: 7, name: 'ox', color: 'black', horn: 2, legs: 4},
    {id: 8, name: 'cow', color: 'spots', horn: 2, legs: 4},
    {id: 9, name: 'chicken', color: 'red', horn: 0, legs: 2},
    {id: 10, name: 'unicon', color: 'pink', horn: 1, legs: 4},
    {id: 11, name: 'cat', color: 'spots', horn: 0, legs: 4},
    {id: 12, name: 'human', color: 'pink', horn: 0, legs: 2}
  ];
};


var createSchema = function() {
  return {
    stores: [{
      name: 'animals',
      keyPath: 'id',
      indexes: [{
        name: 'color'
      }, {
        name: 'horn'
      }, {
        name: 'legs'
      }]
    }]
  };
};


function test_basic() {
  var animals = createData();
  var schema = createSchema();
  var db = new ydn.db.Storage('multi-queyr-basic', schema);
  asyncTestCase.waitForAsync('test');
  db.putAll('animals', animals).addCallback(function() {
    var iters = [ydn.db.IndexIterator.where('animals', 'horn', '=', 0),
      ydn.db.IndexIterator.where('animals', 'horn', '=', 2)];
    var exp = animals.filter(function(x) {
      return x.horn == 0 || x.horn == 2;
    });
    exp = exp.map(function(x) {
      return x.id;
    });
    var result = [];
    var multi = new ydn.db.algo.MultiQuery(result);
    db.scan(multi, iters).addCallback(function(x) {
      result.sort(function(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
      });
      assertArrayEquals(exp, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      asyncTestCase.continueTesting();
    });
  });
}


function test_multi_index() {
  var animals = createData();
  var schema = createSchema();
  var db = new ydn.db.Storage('test_multi_index', schema);
  asyncTestCase.waitForAsync('test');
  db.putAll('animals', animals).addCallback(function() {
    var iters = [ydn.db.IndexIterator.where('animals', 'horn', '=', 0),
      ydn.db.IndexIterator.where('animals', 'legs', '=', 0)];
    var exp = animals.filter(function(x) {
      return x.horn == 0 || x.legs == 0;
    });
    exp = exp.map(function(x) {
      return x.id;
    });
    var result = [];
    var multi = new ydn.db.algo.MultiQuery(result);
    db.scan(multi, iters).addCallback(function(x) {
      result.sort(function(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
      });
      assertArrayEquals(exp, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      asyncTestCase.continueTesting();
    });
  });
}
