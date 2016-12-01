'use strict'

const htpasswd = require('htpasswd-auth')
const uuid = require('node-uuid')
const config = require('../config')
const parse = require('co-body')

function * getCreds () {
  return yield JSON.parse((yield config.storage.get('auth_tokens')) || '{}')
}

function * createAuthToken (username) {
  let creds = yield getCreds()
  let token = uuid.v4()
  creds[token] = {
    username,
    timestamp: new Date()
  }
  yield config.storage.put('auth_tokens', creds, {
    'Content-Type': 'application/json'
  })
  return token
}

function * parseDn(dn) {
  let regex = /^.*(OU=[^,]*).*(CN=[&,]*).*$/
  let result = user.dn.match(regex)
  let ou = result[1]
  let name = result[2]
  return [name, ou]
}

function * checkOu (ou) {
  if (env.NPM_REGISTER_AUTH_SSL_REQUIRE_OUS != "") {
    let auth = (env.NPM_REGISTER_AUTH_SSL_REQUIRE_OUS.split(',').indexOf(user.ou) > -1)
  } else {
    let auth = true
  }
  return auth
}

function * authenticate (ctx) {
  user = yield parse(ctx)

  if (env.NPM_REGISTER_AUTH == 'ssl_header') {
    let userinfo = yield parseDn(this.req.headers[env.REGISTER_AUTH_SSL_DN_HEADER])
    let user.name = userinfo[1]
    let user.ou = userinfo[2]
    let auth = yield checkOu(user.ou)
  } else {
    let creds = (yield config.storage.get('htpasswd')) || ''
    let auth = yield htpasswd.authenticate(user.name, user.password, creds.toString())
  }
  if (!auth) return false
  return yield createAuthToken(user.name)
}

function * findByToken (token) {
  let creds = yield getCreds()
  if (creds[token]) return creds[token].username
}

exports.authenticate = authenticate
exports.findByToken = findByToken
