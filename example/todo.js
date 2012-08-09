

var store = {name:'todo', keyPath:"timeStamp"};

var schema_ver1 = {
  version: 2,
  size: 1 * 1024 * 1024, // 1 MB,
  stores:[store]
};

var db = new ydn.db.Storage('todos2', [schema_ver1]);


var deleteTodo = function (id) {
  var request = db.remove('todo', id);

  getAllTodoItems();
};

var getAllTodoItems = function () {
  var todos = document.getElementById("todoItems");
  todos.innerHTML = "";

  db.get('todo').success(function (items) {
    for (var i = 0; i < items.length; i++) {
      renderTodo(items[i]);
    }
  });
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

window.addEventListener("DOMContentLoaded", init, false);

