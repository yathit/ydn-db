
var schema = {
  stores:[{
    name:'todo',
    keyPath:"timeStamp"
  }]
};


/**
 * Create and initialize the database. Depending on platform, this will
 * create IndexedDB or WebSql or even localStorage storage mechanism.
 * @type {ydn.db.Storage}
 */
$.db = new ydn.db.Storage('todo_2', schema);


var deleteTodo = function (id) {
  $.db.remove('todo', id).fail(function(e) {
    throw e;
  });

  getAllTodoItems();
};

var getAllTodoItems = function () {
  var todos = $("#todoItems");
  todos.empty();

  var df = $.db.values('todo');

  df.done(function (items) {
    var n = items.length;
    for (var i = 0; i < n; i++) {
      renderTodo(items[i]);
    }
  });

  df.fail(function (e) {
    throw e;
  })
};

var renderTodo = function (row) {
  //console.log('text: ' + row.text);

  var li = $('<li/>');
  $('<span/>', {
    text: row.text
  }).appendTo(li);
  $('<a/>', {
    text: " [Delete]",
    click: function () {
      deleteTodo(row.timeStamp);
      return false;
    }
  }).appendTo(li);

  li.appendTo($("#todoItems"));
};

var addTodo = function () {
  var todo = $("#todo");

  var data = {
    "text":todo.val(),
    "timeStamp":new Date().getTime()
  };
  $.db.put('todo', data).fail(function(e) {
    throw e;
  });

  todo.value = "";

  getAllTodoItems();
};

function init() {
  getAllTodoItems();
}

init();

