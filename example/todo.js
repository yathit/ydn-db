var store = {name:'todo', keyPath:"timeStamp"};

var schema_ver1 = {
  version:2,
  size:1 * 1024 * 1024, // 1 MB,
  stores:[store]
};


/**
 * Create and initialize the database. Depending on platform, this will
 * create IndexedDB or WebSql or even localStorage storage mechanism.
 * @type {ydn.db.Storage}
 */
var db = new ydn.db.Storage('todos3', [schema_ver1]);


var deleteTodo = function (id) {
  var request = db.remove('todo', id);

  getAllTodoItems();
};

var getAllTodoItems = function () {
  var todos = document.getElementById("todoItems");
  todos.innerHTML = "";

  var df = db.get('todo');

  df.success(function (items) {
    var n = items.length;
    for (var i = 0; i < n; i++) {
      renderTodo(items[i]);
    }
  });

  df.error(function (x) {
    console.log('Failed: ' + x);
  })
};

var renderTodo = function (row) {
  var todos = document.getElementById("todoItems");
  var li = document.createElement("li");
  var a = document.createElement("a");
  var t = document.createTextNode(row.text);

  a.addEventListener("click", function () {
    deleteTodo(row.timeStamp);
  }, false);

  a.textContent = " [Delete]";
  li.appendChild(t);
  li.appendChild(a);
  todos.appendChild(li)
};

var addTodo = function () {
  var todo = document.getElementById("todo");

  var data = {
    "text":todo.value,
    "timeStamp":new Date().getTime()
  };
  db.put('todo', data);

  todo.value = "";

  getAllTodoItems();
};

function init() {
  getAllTodoItems();
}

init();

