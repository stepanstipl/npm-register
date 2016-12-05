'use strict'

const r = require('koa-router')()
const user = require('../lib/user')
const middleware = require('../middleware')

// login
r.put('/-/user/:user', function * () {
  let auth = yield user.authenticate(this)
  if (auth) {
    this.status = 201
    this.body = {token: auth}
  } else {
    this.status = 401
    this.body = {error: 'invalid credentials'}
  }
})

// whoami
r.get('/-/whoami', middleware.auth, function * () {
  this.body = {username: this.username}
})

module.exports = r
