var utils = require('./utils')
var Cookie = require('./cookie')
var signature = require('cookie-signature')
var debug = require('debug')('mydb-session:manager')

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

    self.req.session.reload(function (err) {
      if (err) return next(err)
      self.routes(next)
    })

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


Manager.prototype.routes = function (next) {
  if (/^\/session\/?(\?.*)?$/.test(this.req.url) && 'GET' == this.req.method) {
    var sid = this.req.session._id;
    var pro = this.col.findOne(sid, this.expose);
    this.send(pro);
  } else {
    next();
  }
}

Expose.prototype.send = function(){
  var req = this.req;
  var res = this.res;
  var subscribe = req.subscribe;
  var send = res.send;
  var next = req.next;
  var self = this;

  return function(data){
    res.send = send;

    if ('object' == typeof data && data.fulfill) {
      debug('handling res#send promise');
      if (req.get('X-MyDB-SocketId')) {
        debug('mydb - subscribing');
        data.on('complete', function(err, doc){
          if (err) return next(err);
          if (!doc || !doc._id) return res.send(404);
          subscribe(doc._id, data.opts.fields, function(err, id){
            if (err) return next(err);
            if (id == req.get('X-MyDB-Id')) {
              debug('subscription id matches one provided by client');
              res.send(304);
            } else {
              debug('sending new subscription with document');
              res.set('X-MyDB-Id', id);
              res.send(doc);
            }
          });
        });
      } else {
        debug('no mydb - not subscribing');
        data.once('complete', function(err, doc){
          if (err) return next(err);
          if (!doc) return res.send(404);
          res.send(doc);
        });
      }
    } else {
      res.send.apply(res, arguments);
    }
  };
};

module.exports = Manager