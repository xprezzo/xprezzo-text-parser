/**
 * xprezzo-text-parser
 * Copyright(c) 2020 Ben Ajenoui <info@seohero.io>
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 */

const bytes = require('xprezzo-raw-body').bytes
const contentType = require('content-type')
const debug = require('xprezzo-raw-body').debug('xprezzo:text-parser')
const Reader = require('xprezzo-raw-body').Reader
const typeis = require('type-is')
const prop = new WeakMap()

const checkParse = (req, res, next, self) => {
  if (req._body) {
    debug('body already parsed')
    next()
    return false
  }
  // skip requests without bodies
  if (!typeis.hasBody(req)) {
    debug('skip empty body')
    next()
    return false
  }
  debug('content-type %j', req.headers['content-type'])
  // determine if request should be parsed
  if (!self.shouldParse(req)) {
    debug('skip parsing')
    next()
    return false
  }
  return true
}

function createReader () {
  const self = prop.get(this)
  return (req, res, next) => {
    req.body = req.body || {}
    if (!checkParse(req, res, next, self)) {
      return
    }
    // get charset
    var charset = getCharset(req) || self.parsedDefaultCharset
    // Reader
    Reader(req, res, next, (buf) => { return buf }, debug, {
      encoding: charset,
      inflate: self.parsedInflate,
      limit: self.parsedLimit,
      verify: self.parsedVerify
    })
  }
}

class TextParser {
  constructor (options) {
    var opts = options || {}
    opts.parsedLimit = typeof opts.limit !== 'number'
      ? bytes.parse(opts.limit || '100kb')
      : opts.limit
    opts.parsedInflate = opts.inflate !== false
    opts.parsedDefaultCharset = opts.defaultCharset || 'utf-8'
    opts.parsedType = opts.type || 'text/plain'
    opts.parsedVerify = opts.verify || false
    if (opts.parsedVerify !== false && typeof opts.parsedVerify !== 'function') {
      throw new TypeError('option verify must be function')
    }
    // create the appropriate type checking function
    opts.shouldParse = typeof opts.parsedType !== 'function'
      ? typeChecker(opts.parsedType)
      : opts.parsedType
    prop.set(this, opts)
    return createReader.call(this)
  }
}

/**
 * Get the charset of a request.
 *
 * @param {object} req
 * @api private
 */

const getCharset = (req) => {
  try {
    return (contentType.parse(req).parameters.charset || '').toLowerCase()
  } catch (e) {
    return undefined
  }
}

/**
 * Get the simple type checker.
 *
 * @param {string} type
 * @return {function}
 */

const typeChecker = (type) => {
  return function checkType (req) {
    return Boolean(typeis(req, type))
  }
}

/**
 * Module exports.
 * Create a middleware to parse JSON bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @public
 */

module.exports = (options) => { return new TextParser(options) }
