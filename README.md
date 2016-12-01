# npm-register [![CircleCI](https://circleci.com/gh/dickeyxxx/npm-register/tree/master.svg?style=svg)](https://circleci.com/gh/dickeyxxx/npm-register/tree/master)

Your own private npm registry and backup server. Used in production and maintained by Heroku. Designed to be easy to set up and maintain, performant, and stable.

[![Code Climate](https://codeclimate.com/github/dickeyxxx/npm-register/badges/gpa.svg)](https://codeclimate.com/github/dickeyxxx/npm-register)
[![codecov](https://codecov.io/gh/dickeyxxx/npm-register/branch/master/graph/badge.svg)](https://codecov.io/gh/dickeyxxx/npm-register)

Overview
--------

This project allows you to have your own npm registry. This server works with the necessary `npm` commands just like the npmjs.org registry. You can use it to not worry about npm going down or to store your private packages. It performs much faster than npmjs.org and can even be matched with a CDN like Cloudfront to be fast globally.

Rather than trying to copy all the data in npm, this acts more like a proxy. While npm is up, it will cache package data locally or in S3. If npm goes down, it will deliver whatever is available in the cache. This means it won't be a fully comprehensive backup of npm, but you will be able to access anything you accessed before. This makes it easy to set up since you don't need to mirror the entire registry. Any packages previously accessed will be available.

The inspiration for this project comes from [sinopia](https://github.com/rlidwka/sinopia). This came out of a need for better cache, CDN, and general performance as well as stability of being able to run multiple instances without depending on a local filesystem.

This is also a [12 Factor](http://12factor.net/) app to make it easy to host on a PaaS like Heroku or in a custom Ansible/Chef/Puppet cluster.

Setup
-----

The easiest way to set this up is with the Heroku button (you must use S3 with Heroku):

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

Alternatively, you can set it up from npm:

```
$ npm install -g npm-register
$ npm-register
```

Either way, your registry is now setup and you should be able to test it by updating the packages with it:

```
$ npm update --registry http://urltomyregistry
```

See below for how to enable authorization and `npm publish`.

S3 Storage
----------

Use S3 for storage by setting `NPM_REGISTER_STORAGE=s3`. Then set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_S3_BUCKET` to the proper values.

Local Filesystem Storage
------------------------

Using the local filesystem is the default. You can explicitly set the storage with `NPM_REGISTER_STORAGE=fs`. Select the location for the files to be stored with `NPM_REGISTER_FS_DIRECTORY=/var/npm-register`. Defaults to `./tmp`.

Redis
-----

Redis can optionally be used to cache the etags and package data. Set `REDIS_URL` to activate it.

How it works
------------

Essentially the goal of the project is to quickly deliver current npm data even when npm is offline.  In npm there are 2 main types of requests: package metadata and tarballs.

Package metadata mostly contains what versions of a package are available. These cannot be cached for very long since the package can be updated. By default, it is cached for 60 seconds. You can modify this with `CACHE_PACKAGE_TTL`. Etags are also supported and cached to further speed up access.

The tarballs are the actual code and never change once they are uploaded (though they can be removed via unpublishing). These are downloaded one time from npmjs.org per package and version, stored locally or in S3 for future requests. These have a very long max-age header.

In the event npmjs.org is offline, npm-register will use the most recent package metadata that was requested from npmjs.org until it comes back online.

Supported npm Commands
----------------------

npm-register should support most npm commands. There are some exceptions, however:

* `npm star`
* `npm search`

If anything else doesn't work, please submit an issue so we can fix it, or at least note the missing functionality here.

Authentication
--------------

### htpasswd

By default npm-register uses an htpasswd file for authentication and stores tokens in S3. To set this up, first create an htpasswd file, then upload it to `/htpasswd` in your S3 bucket or your local file system:

```
$ aws s3 cp s3://S3BUCKET/htpasswd ./htpasswd
$ htpasswd -nB YOURUSERNAME >> ./htpasswd
$ aws s3 cp ./htpasswd s3://S3BUCKET/htpasswd
```

Then you can login with npm. Note that the email is ignored by the server, but the CLI will force you to add one.

```
$ npm login --registry http://myregistry
Username: dickeyxxx
Password:
Email: (this IS public) jeff@heroku.com
$ npm whoami --registry http://myregistry
dickeyxxx
```

This stores the credentials in `~/.npmrc`. You can now use `npm publish` to publish packages.

### ssl_header
You can enable ssl auth when uploading private packages by setting `NPM_REGISTER_AUTH` to `ssl_header`. This is useful for example when you deploy npm-register behind nginx with configured client authentication via client certificates. This expects http header (set by `NPM_REGISTER_AUTH_SSL_DN_HEADER` to contain user's DN string populated by webserver (nginx). Optionally use can specify list of OUs that DN string has to match in `NPM_REGISTER_AUTH_SSL_REQUIRE_OUS`.

Set your nginx tor require SSL client cert and to populate "X-SSL-Client-DN" header:
```
# Client auth
ssl_verify_client on;
ssl_verify_depth 2;
ssl_client_certificate /etc/nginx/certs/df-client-ca-bundle.pem;

# Populate SSL header
proxy_set_header  X-SSL-Client-DN   $ssl_client_s_dn;
```

And following env. variables to use the header and require membership in one of specified OUs:
```
NPM_REGISTER_AUTH="ssl_header"
NPM_REGISTER_AUTH_SSL_DN_HEADER="X-SSL-Client-DN"
NPM_REGISTER_AUTH_SSL_REQUIRE_OUS="backend-team,admins"
```
