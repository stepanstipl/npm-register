'use strict'

let url = require('url')
let env = process.env

module.exports = {
  port: env.PORT || 3000,
  production: !!['production', 'staging'].find(e => e === env.NODE_ENV),
  timeout: parseInt(env.TIMEOUT) || 10000,
  uplink: url.parse(env.UPLINK || 'https://registry.npmjs.org'),
  redis: env.REDIS_URL,
  cloudfrontHost: env.CLOUDFRONT_HOST,
  cache: {
    packageTTL: parseInt(env.CACHE_PACKAGE_TTL) || 60,
    tarballTTL: parseInt(env.CACHE_TARBALL_TTL) || (6 * 60 * 60)
  },
  fs: {directory: env.NPM_REGISTER_FS_DIRECTORY || 'tmp'},
  s3: {
    bucket: env.AWS_S3_BUCKET,
    region: env.AWS_DEFAULT_REGION
  },
  auth: {
    type: env.NPM_REGISTER_AUTH,
    ssl: {
      header: env.NPM_REGISTER_AUTH_SSL_HEADER || 'X-SSL-Client-DN',
      ous: env.NPM_REGISTER_AUTH_SSL_OUS || ''
    }
  }
}

let Storage = require('./lib/storage/' + (env.NPM_REGISTER_STORAGE.toLowerCase() || 'fs'))
module.exports.storage = new Storage()
