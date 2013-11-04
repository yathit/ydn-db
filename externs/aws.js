/**
 * @fileoverview AWS JS SDK.
 *
 * http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/frames.html
 * @externs
 */


/**
 * @type {Object}
 * @const
 */
var AWS = {};


/**
 * Represents your AWS security credentials.
 * @constructor
 */
AWS.Credentials = function() {};


/**
 * @param {{RoleArn: string, WebIdentityToken: string}} params parameters.
 * @extends {AWS.Credentials}
 * @constructor
 */
AWS.WebIdentityCredentials = function(params) {};


/**
 * @type {string}
 */
AWS.WebIdentityCredentials.prototype.WebIdentityToken;


/**
 * @typedef {{
 *   region: string,
 *   credentials: AWS.Credentials
 * }}
 */
AWS.config;



/**
 * Constructs S3 service interface object.
 * @param {{region: (string|undefined), Bucket: string}} params
 * @constructor
 */
AWS.S3 = function(params) {};


/**
 * Adds an object to a bucket.
 * @param {{
 *   ACL: (string|undefined),
 *   Body: (Buffer),
 *   CacheControl: (string|undefined),
 *   ContentDisposition:(string|undefined),
 *   Expires:(Date|undefined),
 *   Key: string,
 *   ContentType:(string|undefined),
 *   Metadata:(Object.<string>|undefined)
 * }} params
 * @param {function(err, data)} callback
 */
AWS.S3.prototype.putObject = function(params, callback) {};


/**
 * Retrieves objects from Amazon S3.
 * @param {{
 *   IfMatch: (string|undefined),
 *   IfModifiedSince: (Date|undefined),
 *   IfNoneMatch:(string|undefined),
 *   IfUnmodifiedSince:(Date|undefined),
 *   Range:(string|undefined),
 *   VersionId:(string|undefined),
 *   Key: string
 * }} params
 * @param {function(err, data)} callback
 */
AWS.S3.prototype.getObject = function(params, callback) {};


/**
 * Returns some or all (up to 1000) of the objects in a bucket.
 * @param {{
 *   Bucket: (string|undefined),
 *   Delimiter: (string|undefined),
 *   Marker:(string|undefined),
 *   MaxKeys:(number|undefined),
 *   Prefix:(string|undefined)
 * }} params
 * @param {function(err, {{
 *   IsTruncated: boolean,
 *   Marker: string,
 *   Contents: Array.<Object>,
 *   Name: string,
 *   Prefix: string,
 *   MaxKeys: number,
 *   CommonPrefixes: Array.<Object>
 * }})} callback result callback.
 */
AWS.S3.prototype.listObjects = function(params, callback) {};
