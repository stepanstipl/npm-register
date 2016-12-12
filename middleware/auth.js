'use strict'

const user = require('../lib/user')

module.exports = function * (next) {

  if (config.auth.type == 'ssl_header') {
    let userinfo = yield user.parseDn(this.headers[config.auth.ssl.header.toLowerCase()])
    this.username = userinfo[0]
  } else if (config.auth.type == 'none') {
    this.username = "none"
  } else {
    if (this.headers.authorization) {
      let token = this.headers.authorization.split(' ')[1]
      this.username = yield user.findByToken(token)
    }
  }
  if (!this.username) this.throw(401)
  yield next
}
