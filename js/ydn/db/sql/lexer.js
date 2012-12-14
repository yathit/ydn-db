/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 14/12/12
 */

/*
 * Obtained from https://github.com/forward/sql-parser/blob/master/lib/lexer.js
 * under MIT license.
 */

goog.provide('ydn.db.sql.Lexer');

/**
 *
 * @param {string} sql
 * @param {Object=} opts
 * @constructor
 */
ydn.db.sql.Lexer = function(sql, opts) {
  var bytesConsumed, i;
  opts = opts || {};
  this.sql = sql;
  this.preserveWhitespace = !!opts['preserveWhitespace'];
  this.tokens = [];
  this.currentLine = 1;
  i = 0;
  while (this.chunk = sql.slice(i)) {
    bytesConsumed = this.keywordToken() || this.starToken() || this.booleanToken() || this.functionToken() || this.windowExtension() || this.sortOrderToken() || this.seperatorToken() || this.operatorToken() || this.mathToken() || this.dotToken() || this.conditionalToken() || this.numberToken() || this.stringToken() || this.parensToken() || this.whitespaceToken() || this.literalToken();
    if (bytesConsumed < 1) {
      throw new Error("NOTHING CONSUMED: Stopped at - '" + (this.chunk.slice(0, 30)) + "'");
    }
    i += bytesConsumed;
  }
  this.token('EOF', '');
};

/** @const
 * @type {Array.<string>} */
ydn.db.sql.Lexer.SQL_KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'AS'];

/** @const
 * @type {Array.<string>} */
ydn.db.sql.Lexer.SQL_FUNCTIONS = ['AVG', 'COUNT', 'MIN', 'MAX', 'SUM'];

/** @const
 * @type {Array.<string>} */
ydn.db.sql.Lexer.SQL_SORT_ORDERS = ['ASC', 'DESC'];

/** @const
 * @type {Array.<string>} */
ydn.db.sql.Lexer.SQL_OPERATORS = ['=', '>', '<', 'LIKE', 'IS NOT', 'IS'];

/** @const
 * @type {Array.<string>} */
ydn.db.sql.Lexer.SQL_CONDITIONALS = ['AND', 'OR'];

/** @const
 * @type {Array.<string>} */
ydn.db.sql.Lexer.BOOLEAN = ['TRUE', 'FALSE', 'NULL'];

/** @const
 *  @type {Array.<string>} */
ydn.db.sql.Lexer.MATH = ['+', '-'];

/** @const
 * @type {Array.<string>} */
ydn.db.sql.Lexer.MATH_MULTI = ['/', '*'];

/** @const
 * @type {RegExp} */
ydn.db.sql.Lexer.STAR = /^\*/;

/** @const
 * @type {RegExp} */
ydn.db.sql.Lexer.SEPARATOR = /^,/;

/** @const
 * @type {RegExp} */
ydn.db.sql.Lexer.WHITESPACE = /^[ \n\r]+/;

/** @const
 * @type {RegExp} */
ydn.db.sql.Lexer.LITERAL = /^`?([a-z_][a-z0-9_]{0,})`?/i;

/** @const
 * @type {RegExp} */
ydn.db.sql.Lexer.NUMBER = /^[0-9]+(\.[0-9]+)?/;

/** @const
 * @type {RegExp} */
ydn.db.sql.Lexer.STRING = /^'([^\\']*(?:\\.[^\\']*)*)'/;

/** @const
 * @type {RegExp} */
ydn.db.sql.Lexer.DBLSTRING = /^"([^\\"]*(?:\\.[^\\"]*)*)"/;


/**
 * Push a token.
 * @param name
 * @param value
 */
ydn.db.sql.Lexer.prototype.token = function(name, value) {
  return this.tokens.push([name, value, this.currentLine]);
};

ydn.db.sql.Lexer.prototype.tokenizeFromRegex = function(name, regex, part, lengthPart, output) {
  var match, partMatch;
  if (part == null) part = 0;
  if (lengthPart == null) lengthPart = part;
  if (output == null) output = true;
  if (!(match = regex.exec(this.chunk))) return 0;
  partMatch = match[part];
  if (output) this.token(name, partMatch);
  return match[lengthPart].length;
};

ydn.db.sql.Lexer.prototype.tokenizeFromWord = function(name, word) {
  var match, matcher;
  if (word == null) word = name;
  word = this.regexEscape(word);
  matcher = /^\w+$/.test(word) ? new RegExp("^(" + word + ")\\b", 'ig') : new RegExp("^(" + word + ")", 'ig');
  match = matcher.exec(this.chunk);
  if (!match) return 0;
  this.token(name, match[1]);
  return match[1].length;
};

ydn.db.sql.Lexer.prototype.tokenizeFromList = function(name, list) {
  var entry, ret, _i, _len;
  ret = 0;
  for (_i = 0, _len = list.length; _i < _len; _i++) {
    entry = list[_i];
    ret = this.tokenizeFromWord(name, entry);
    if (ret > 0) break;
  }
  return ret;
};

ydn.db.sql.Lexer.prototype.keywordToken = function() {
  return this.tokenizeFromWord('SELECT') || this.tokenizeFromWord('DISTINCT') || this.tokenizeFromWord('FROM') || this.tokenizeFromWord('WHERE') || this.tokenizeFromWord('GROUP') || this.tokenizeFromWord('ORDER') || this.tokenizeFromWord('BY') || this.tokenizeFromWord('HAVING') || this.tokenizeFromWord('LIMIT') || this.tokenizeFromWord('JOIN') || this.tokenizeFromWord('LEFT') || this.tokenizeFromWord('RIGHT') || this.tokenizeFromWord('INNER') || this.tokenizeFromWord('OUTER') || this.tokenizeFromWord('ON') || this.tokenizeFromWord('AS') || this.tokenizeFromWord('UNION') || this.tokenizeFromWord('ALL');
};

ydn.db.sql.Lexer.prototype.dotToken = function() {
  return this.tokenizeFromWord('DOT', '.');
};

ydn.db.sql.Lexer.prototype.operatorToken = function() {
  return this.tokenizeFromList('OPERATOR', ydn.db.sql.Lexer.SQL_OPERATORS);
};

ydn.db.sql.Lexer.prototype.mathToken = function() {
  return this.tokenizeFromList('MATH', ydn.db.sql.Lexer.MATH) || this.tokenizeFromList('MATH_MULTI', ydn.db.sql.Lexer.MATH_MULTI);
};

ydn.db.sql.Lexer.prototype.conditionalToken = function() {
  return this.tokenizeFromList('CONDITIONAL', ydn.db.sql.Lexer.SQL_CONDITIONALS);
};

ydn.db.sql.Lexer.prototype.functionToken = function() {
  return this.tokenizeFromList('FUNCTION', ydn.db.sql.Lexer.SQL_FUNCTIONS);
};

ydn.db.sql.Lexer.prototype.sortOrderToken = function() {
  return this.tokenizeFromList('DIRECTION', ydn.db.sql.Lexer.SQL_SORT_ORDERS);
};

ydn.db.sql.Lexer.prototype.booleanToken = function() {
  return this.tokenizeFromList('BOOLEAN', ydn.db.sql.Lexer.BOOLEAN);
};

ydn.db.sql.Lexer.prototype.starToken = function() {
  return this.tokenizeFromRegex('STAR', ydn.db.sql.Lexer.STAR);
};

ydn.db.sql.Lexer.prototype.seperatorToken = function() {
  return this.tokenizeFromRegex('SEPARATOR', ydn.db.sql.Lexer.SEPARATOR);
};

ydn.db.sql.Lexer.prototype.literalToken = function() {
  return this.tokenizeFromRegex('LITERAL', ydn.db.sql.Lexer.LITERAL, 1, 0);
};

ydn.db.sql.Lexer.prototype.numberToken = function() {
  return this.tokenizeFromRegex('NUMBER', ydn.db.sql.Lexer.NUMBER);
};

ydn.db.sql.Lexer.prototype.stringToken = function() {
  return this.tokenizeFromRegex('STRING', ydn.db.sql.Lexer.STRING, 1, 0) || this.tokenizeFromRegex('DBLSTRING', ydn.db.sql.Lexer.DBLSTRING, 1, 0);
};

ydn.db.sql.Lexer.prototype.parensToken = function() {
  return this.tokenizeFromRegex('LEFT_PAREN', /^\(/) || this.tokenizeFromRegex('RIGHT_PAREN', /^\)/);
};

ydn.db.sql.Lexer.prototype.windowExtension = function() {
  var match;
  match = /^\.(win):(length|time)/i.exec(this.chunk);
  if (!match) return 0;
  this.token('WINDOW', match[1]);
  this.token('WINDOW_FUNCTION', match[2]);
  return match[0].length;
};

ydn.db.sql.Lexer.prototype.whitespaceToken = function() {
  var match, newlines, partMatch;
  if (!(match = ydn.db.sql.Lexer.WHITESPACE.exec(this.chunk))) return 0;
  partMatch = match[0];
  newlines = partMatch.replace(/[^\n]/, '').length;
  this.currentLine += newlines;
  if (this.preserveWhitespace) this.token(undefined /*name*/, partMatch);
  return partMatch.length;
};

ydn.db.sql.Lexer.prototype.regexEscape = function(str) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};
