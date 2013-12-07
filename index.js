
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
var parseUrl = require('url').parse
var utils = require('./utils')

/**
 * Module exports.
 */

module.exports = session

/**
 * Options:
 *
 *   - `key` cookie name defaulting to `connect.sid`
 *   - `store` session store instance
 *   - `secret` session cookie is signed with this secret to prevent tampering
 *   - `cookie` session cookie settings, defaulting to `{ path: '/', httpOnly: true, maxAge: null }`
 *   - `proxy` trust the reverse proxy when setting secure cookies (via "x-forwarded-proto")
 * @param {Object} options
 * @return {Function}
 * @api public
 */
function session (opts) {
  opts = opts || {}

  if (!opts.url) {
    throw new Error('Missing `url` (mydb server) option.')
  }

  // mongodb
  if ('object' != typeof opts.mongo) {
    opts.mongo = monk(opts.mongo || 'localhost:27017/mydb')
  }

  var sessions = opts.mongo.get('sessions')
  sessions.index('sid')

  opts.key = opts.key || 'mydb.sid' // TODO (thebyrd) what is this key for?
  cookie = opts.cookie || {} // options for the cookie object.
  opts.expose = opts.expose || '-sid' // session exposed fields.
  opts.secret = opts.secret || 'youareagoodmydbcracker'

  var generate = function (req) {
    req.sessionID = uid(24)
    req.session = new Session(sessions, req)
    req.session.cookie = new Cookie(cookie)
  }

  return function session (req, res, next) {
    if (req.session) return next()

    if (!storeReady) return debug('store is disconnected'), next()

    // check for pathname mismatch
    var originalPath = parseUrl(req.originalUrl).pathname
    if (~originalPath.indexOf(cookie.path || '/')) return next()


    var rawCookie = req.cookies[opts.secret]
    var unsignedCookie = req.signedCookies[opts.key]
    if (!unsignedCookie && rawCookie) {
      unsignedCookie = utils.parseSignedCookie(rawCookie, opts.secret)
    }

    res.on('header', function () {
      if (!req.session) return

      var cookie = req.session.cookie
      var proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].toLowerCase().trim()
      var tls = req.connection.encrypted || (trustProxy && 'https' == proto)
      var isNew = unsignedCookie != req.sessionID

      // only send secure cookies over https
      if (cookie.secure && !tls) return debug('not secured')

      var val = 's:' + signature.sign(req.sessionID, opts.secret)
      val = cookie.serialize(opts.key, val)

      debug('set-cookie %s', val)
      res.setHeader('Set-Cookie', val)
    })

    var end = res.end
    res.end = function (data, enconding) {
      res.end = end;
      if (!req.session) return res.end(data, enconding)

      debug('saving')
      req.session.resetMaxAge()
      req.session.save(function (err) {
        if (err) console.error(err.stack)
        debug('saved')
        res.end(data, enconding)
      })
    }

    function generate () {
      req.session = new Session(sessions, req)
    }

    req.sessionID = unsignedCookie

    if (!req.sessionID) {
      debug('no SID send, generating session')
      generate(req) // I STOPPED HERE this needs to alter req.session
      next()
      return
    }

    var pause = tuils.pause(req)
    debug('fetching %s', req.sessionID)
    sessions.findOne({sid: req.sessionID})
    .sucess(function (sess) {
      if (!sess) {
        debug('no session found')
        generate()
        next()
      }
      debug('session found')
      store.createSession(req, sess) // TODO (thebyrd) figure out what this method is supposed to do.
      originalId = req.sessionID
      originalHash = hash(sess)
      next()

    })
    .fail(function (error) {
      var _next = next;

      debug('error %j', error)
      next = function (err) {
        _next(err)
        pause.resume()
      }

      if ('ENOENT' == err.code) {
        generate()
        next()
      } else {
        next(error)
      }

    })
  }
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