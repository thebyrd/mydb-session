
/**
 * Module dependencies.
 */

var monk = require('monk')
var debug = require('debug')('mydb-session')
var signature = require('cookie-signature')
var uid = require('uid2')
var crc32 = require('buffer-crc32')
var Cookie = require('./cookie')
var Session = require('./session')
var Manager = require('./manager')
var parseUrl = require('url').parse
var utils = require('./utils')

/**
 * Module exports.
 */

module.exports = session



function session (opts) {
  opts = opts || {}

  if (!opts.url) {
    throw new Error('Missing `url` (mydb server) option.')
  }

  // mongodb
  if ('object' != typeof opts.mongo) {
    opts.mongo = monk(opts.mongo || 'localhost:27017/mydb')
  }

  var collection = opts.mongo.get('sessions')
  collection.index('sid')

  opts.key = opts.key || 'mydb.sid' // TODO (thebyrd) what is this key for?
  opts.cookie = opts.cookie || {} // options for the cookie object.
  opts.expose = opts.expose || '-sid' // session exposed fields.
  opts.secret = opts.secret || 'youareagoodmydbcracker'

  var manager = new Manager(opts.secret, collection, opts.expose, opts.key, opts.cookie)

  return manager.middleware
}

/**
 * Hash the given `sess` object omitting changes
 * to `.cookie`.q
 *
 * @param {Object} sess
 * @return {String}
 * @api private
 */
function hash(sess) {
  return crc32.signed(JSON.stringify(sess, function(key, val){
    if ('cookie' != key) return val
  }))
}