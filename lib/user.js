'use strict'                                                                                                                                                              [0/1857]

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
  let regex = /^.*CN=([^,]*).*OU=([^,]*).*$/
  let result = dn.match(regex)
  let name = result[1]
  let ou = result[2]
  return [name, ou]
}

function * checkOu (ou) {
  let auth = false
  if (config.auth.ssl.ous) {
    auth = (config.auth.ssl.ous.split(',').indexOf(ou) > -1)
  } else {
    auth = true
  }
  return auth
}

function * authenticate (ctx) {
  let user = yield parse(ctx)
  let auth = false

  if (config.auth.type == 'ssl_header') {
    let userinfo = yield parseDn(ctx.req.headers[config.auth.ssl.header.toLowerCase()])
    user.name = userinfo[0]
    user.ou = userinfo[1]
    auth = yield checkOu(user.ou)
  } else if (config.auth.type == 'none') {
    auth = true
  } else {
    let creds = (yield config.storage.get('htpasswd')) || ''
    auth = yield htpasswd.authenticate(user.name, user.password, creds.toString())
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
exports.parseDn = parseDn
