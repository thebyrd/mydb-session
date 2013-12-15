var utils = require('./utils')
var Cookie = require('./cookie')
var signature = require('cookie-signature')

function Manager (secret, sessions, expose, key, cookie) {
  this.secret = secret
  this.col = sessions
  this.expose = expose
  this.key = key
  this.cookie = cookie
}

Manager.prototype.middleware = function (req, res, next) {
  var self = this

  // keep track of req and res objects
  this.req = req
  this.res = res
  this.next = next

  if (req.session) return next() // prevent double mount

  var originalPath = require('url').parse(req.originalUrl).pathname
  if (originalPath.indexOf(this.cookie.path || '/') != 0) return next() // TODO (thebyrd) support cookie path

  var rawCookie = req.cookies[this.key]
  var unsignedCookie = req.signedCookies[this.key] || rawCookie && utils.parseSignedCookie(rawCookie, req.secret) // req.secret is put there by the cookieParser middleware
  
  req.session = this.generate(unsignedCookie)

  res.on('header', function () {
    if (!req.session) return

    var cookie = self.req.session.cookie
    varisNew = unsignedCookie != self.req.sessionID

    var val = 's:' + signature.sign(self.req.sessionID, req.secret)
    val = cookie.serialize(key, val)
    res.setHeader('Set-Cookie', val)
  })
}

Manager.prototype.generate = function (sid) {
  this.req.sessionID = sid || uid(24)
  this.req.session = new Session(this.col, this.req)
  this.req.session.cookie = new Cookie(this.cookie)

  return this.req.session
}

module.exports = Manager