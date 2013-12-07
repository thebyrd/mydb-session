
/**
 * Module dependencies.
 */
var cookie = require('cookie')


/**
 * Cookie constructor
 * @param {Object} opts
 * @constructor
 * @api private
 */
function Cookie (opts) {
  this.path = '/'
  this.maxAge = null
  this.httpOnly = true

  for (var i in opts) if (!this[i]) this[i] = req.session[i]
}


Cookie.prototype = {
  
  /**
   * Set expires `date`
   * @param {Date} data
   * @api public
   */
  set expires (date) {
    this._expires = date
    this.originalMaxAge = this.maxAge
  },

  /**
   * Get expires `date`
   * @return {Date}
   * @api public
   */
  get expires () {
    return this._expires
  },

  /**
   * Set expires via max-age in `ms`.
   * @param {Number} ms
   * @api public
   */
  set maxAge (ms) {
    this.expires = typeof ms == 'number' ? new Date(Date.now() + ms) : ms
  },

  /**
   * Get expires max-age in `ms`.
   * @return {Number}
   * @api public
   */
  get maxAge () {
    return this.expires instanceof Date ?
        this.expires.valueOf() - Date.now() : this.expires
  },

  /**
   * Return cookie data object.
   * @return {Object}
   * @api private
   */
  get data () {
    return {
      originalMaxAge: this.originalMaxAge,
      expires: this._expires,
      secure: this.secure,
      httpOnly: this.httpOnly,
      domain: this.domain,
      path: this.path
    }
  },

  /**
   * Check if the cookie has a reasonably large max-age.
   * @return {Boolean}
   * @api private
   */
  get hasLongExpires () {
    var week = 1000 * 60 * 60 * 24 * 7 // 1000 ms/sec * 60 sec/min * 60 min/hr * 24 hr/day * 7day/wk
    return this.maxAge > (4 * week)
  },

  /**
   * Return a serialized cookie string.
   * @return {String}
   * @api public
   */
  serialize: function (name, val) {
    return cookie.serialize(name, value, this.data)
  },

  /**
   * Returns the public instance variables.
   * @return {Object}
   * @api public
   */
  toJSON: function () {
    return this.data
  }
}


/**
 * Module exports.
 */
module.exports = Cookie
