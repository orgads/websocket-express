'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var http = require('http');
var express = require('express');
var WebSocket = require('ws');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var http__default = /*#__PURE__*/_interopDefaultLegacy(http);
var express__default = /*#__PURE__*/_interopDefaultLegacy(express);
var WebSocket__default = /*#__PURE__*/_interopDefaultLegacy(WebSocket);

const NONCE = {}; // Copied from https://github.com/websockets/ws/blob/master/lib/websocket-server.js#L374

function abortHandshake(socket, code, message, headers) {
  if (socket.writable) {
    const resolvedMessage = message || http.STATUS_CODES[code];
    const resolvedHeaders = {
      Connection: 'close',
      'Content-type': 'text/html',
      'Content-Length': Buffer.byteLength(resolvedMessage),
      ...headers
    };
    socket.write([`HTTP/1.1 ${code} ${http.STATUS_CODES[code]}`, ...Object.keys(resolvedHeaders).map(h => `${h}: ${resolvedHeaders[h]}`), '', resolvedMessage].join('\r\n'));
  }

  socket.destroy();
}

function httpStatusToWs(code) {
  if (code >= 500) {
    return 1011;
  }

  return 4000 + code;
}

function nextMessage(ws, {
  timeout = 0
} = {}) {
  return new Promise((resolve, reject) => {
    let onMessage = null;
    let onClose = null;
    let exp = null;

    const detach = () => {
      ws.off('message', onMessage);
      ws.off('close', onClose);
      clearTimeout(exp);
    };

    onMessage = (data, isBinary) => {
      detach();

      if (isBinary !== undefined) {
        // ws 8.x
        resolve({
          data,
          isBinary
        });
      } else if (typeof data === 'string') {
        // ws 7.x
        resolve({
          data: Buffer.from(data, 'utf8'),
          isBinary: false
        });
      } else {
        resolve({
          data,
          isBinary: true
        });
      }
    };

    onClose = () => {
      detach();
      reject();
    };

    ws.on('message', onMessage);
    ws.on('close', onClose);

    if (timeout > 0) {
      exp = setTimeout(onClose, timeout);
    }
  });
}

function bindExtraMethods(ws) {
  // eslint-disable-next-line no-param-reassign
  ws.nextMessage = nextMessage.bind(null, ws);
}

class WebSocketWrapper {
  constructor(wsServer, req, socket, head) {
    this.wsServer = wsServer;
    this.req = req;
    this.socket = socket;
    this.head = head;
    this.ws = null;
    this.closed = false;
    this.nonce = NONCE;
    this.transactionNesting = 0;
    this.closeTimeout = null;
    this.closeTime = 0;
    this.closeTimeoutCode = null;
    this.closeTimeoutMessage = null;
    this.softClosing = false; // expressjs builds new objects using properties of response, so all methods
    // must be explicitly added to the instance, not just the class

    this.accept = this.accept;
    this.reject = this.reject;
    this.closeAtTime = this.closeAtTime;
    this.sendError = this.sendError;

    this.setHeader = () => {}; // compatibility with expressjs (fake http.Response API)


    this.status = this.status;
    this.end = this.end;
    this.send = this.send;
    this.beginTransaction = this.beginTransaction;
    this.endTransaction = this.endTransaction;
    this.internalCheckCloseTimeout = this.internalCheckCloseTimeout;
    this.internalSoftClose = this.internalSoftClose;
  }

  static isInstance(o) {
    // expressjs builds new objects using properties of response, so we cannot
    // rely on instanceof checks. Instead we use a nonce property:
    return o && o.nonce === NONCE;
  }

  accept() {
    if (this.closed) {
      return Promise.reject(new Error('Connection closed'));
    }

    if (this.ws) {
      return Promise.resolve(this.ws);
    }

    return new Promise(resolve => this.wsServer.handleUpgrade(this.req, this.socket, this.head, ws => {
      bindExtraMethods(ws);
      ws.on('close', () => clearTimeout(this.closeTimeout));
      this.ws = ws;
      resolve(this.ws);
    }));
  }

  reject(code = 500, message = null) {
    if (this.ws) {
      throw new Error('Already accepted WebSocket connection');
    }

    this.sendError(code, null, message);
  }

  sendError(httpStatus, wsStatus = null, message = null) {
    if (this.closed) {
      throw new Error('Connection closed');
    }

    const msg = message || http.STATUS_CODES[httpStatus];
    this.closed = true;

    if (this.ws) {
      this.ws.close(wsStatus || httpStatusToWs(httpStatus), msg);
    } else {
      abortHandshake(this.socket, httpStatus, msg);
    }
  }

  internalCheckCloseTimeout() {
    clearTimeout(this.closeTimeout);

    if (this.closed) {
      return;
    }

    const now = Date.now();

    if (now < this.closeTime) {
      this.closeTimeout = setTimeout(this.internalCheckCloseTimeout.bind(this), Math.min(this.closeTime - now, 1000 * 60 * 60 * 24));
      return;
    }

    this.closed = true;

    if (this.ws) {
      this.ws.close(this.closeTimeoutCode, this.closeTimeoutMessage);
    } else {
      abortHandshake(this.socket, 200, 'Connection time limit reached');
    }
  }

  closeAtTime(time, code = 1001, message = '') {
    if (this.closed) {
      return;
    }

    if (this.closeTimeout !== null && time >= this.closeTime) {
      return;
    }

    this.closeTime = time;
    this.closeTimeoutCode = code;
    this.closeTimeoutMessage = message;
    this.internalCheckCloseTimeout();
  }

  status(code) {
    if (code < 400 && this.ws) {
      throw new Error('Already accepted WebSocket connection');
    }

    this.sendError(code);
    return this;
  }

  end() {
    if (!this.ws && !this.closed) {
      this.sendError(404);
    }

    return this;
  }

  send(message) {
    if (!this.closed) {
      this.accept().then(ws => {
        ws.send(message);
        ws.close();
      });
      this.closed = true;
    }

    return this;
  }

  beginTransaction() {
    this.transactionNesting += 1;
  }

  endTransaction() {
    if (this.transactionNesting <= 0) {
      throw new Error('Unbalanced endTransaction');
    }

    this.transactionNesting -= 1;

    if (this.transactionNesting === 0 && this.softClosing && !this.closed) {
      this.sendError(500, 1012, 'server shutdown');
    }
  }

  internalSoftClose(limit) {
    if (this.closed) {
      return;
    }

    if (this.transactionNesting > 0) {
      this.softClosing = true;

      if (limit) {
        this.closeAtTime(limit, 1012, 'server shutdown');
      }
    } else {
      this.sendError(500, 1012, 'server shutdown');
    }
  }

}

function wrapWebsocket(fn) {
  if (typeof fn !== 'function') {
    return fn;
  }

  return (req, res, next) => {
    if (WebSocketWrapper.isInstance(res)) {
      fn(req, res, next);
    } else {
      next('route');
    }
  };
}

function wrapNonWebsocket(fn) {
  if (typeof fn !== 'function') {
    return fn;
  }

  return (req, res, next) => {
    if (WebSocketWrapper.isInstance(res)) {
      next('route');
    } else {
      fn(req, res, next);
    }
  };
}

function wrapHandler(o, method, wrapper) {
  const target = o;
  const original = target[method].bind(target);

  target[method] = (...handlers) => original(...handlers.map(wrapper));
}

function wrapHandlers(o, src = null) {
  const target = o;

  if (src) {
    target.use = src.use.bind(src);
    http__default["default"].METHODS.forEach(method => {
      const name = method.toLowerCase();
      target[name] = src[name].bind(src);
    });
    target.all = src.all.bind(src);
  }

  target.ws = target.use;
  wrapHandler(target, 'ws', wrapWebsocket);
  target.useHTTP = target.use;
  wrapHandler(target, 'useHTTP', wrapNonWebsocket);
  http__default["default"].METHODS.forEach(method => {
    wrapHandler(target, method.toLowerCase(), wrapNonWebsocket);
  });
  wrapHandler(target, 'all', wrapNonWebsocket);
}

const FORWARDED_EXPRESS_METHODS = ['enable', 'enabled', 'disable', 'disabled', 'set', 'get', 'engine', 'path'];
const FORWARDED_HTTP_MIDDLEWARE = ['static', 'json', 'urlencoded'];

function addPreCloseEvent(server) {
  if (server.close.hasPreCloseEvent) {
    return;
  }

  const originalClose = server.close.bind(server);

  const wrappedClose = callback => {
    server.emit('pre-close', server);
    originalClose(callback);
  };

  wrappedClose.hasPreCloseEvent = true;
  /* eslint-disable-next-line no-param-reassign */
  // close interception

  server.close = wrappedClose;
}

function bindWithOriginalThis(fn, thisArg) {
  return function wrapped(...args) {
    return fn.call(thisArg, this, ...args);
  };
}

class WebSocketExpress {
  constructor(...args) {
    this.app = express__default["default"](...args);
    this.locals = this.app.locals;
    this.wsServer = new WebSocket__default["default"].Server({
      noServer: true
    });
    this.activeWebSockets = new WeakMap();
    this.app.use((err, req, res, next) => {
      // error handler: close web socket
      if (WebSocketWrapper.isInstance(res)) {
        res.sendError(500);
      }

      next(err);
    });
    this.handleUpgrade = bindWithOriginalThis(this.handleUpgrade, this);
    this.handleRequest = this.handleRequest.bind(this);
    this.handlePreClose = this.handlePreClose.bind(this);
    FORWARDED_EXPRESS_METHODS.forEach(method => {
      this[method] = this.app[method].bind(this.app);
    });
    wrapHandlers(this, this.app);
  }

  handleUpgrade(server, req, socket, head) {
    const wrap = new WebSocketWrapper(this.wsServer, req, socket, head);
    const socketSet = this.activeWebSockets.get(server);
    socketSet.add(wrap);
    socket.on('close', () => socketSet.delete(wrap));
    return this.app(req, wrap);
  }

  handleRequest(req, res) {
    return this.app(req, res);
  }

  handlePreClose(server) {
    let expiry = 0;
    const shutdownTimeout = this.app.get('shutdown timeout');

    if (typeof shutdownTimeout === 'number' && shutdownTimeout >= 0) {
      expiry = Date.now() + shutdownTimeout;
    }

    const socketSet = this.activeWebSockets.get(server);
    [...socketSet].forEach(s => s.internalSoftClose(expiry));
  }

  attach(server) {
    if (this.activeWebSockets.has(server)) {
      throw new Error('Cannot attach to the same server multiple times');
    }

    this.activeWebSockets.set(server, new Set());
    addPreCloseEvent(server);
    server.on('upgrade', this.handleUpgrade);
    server.on('request', this.handleRequest);
    server.on('pre-close', this.handlePreClose);
  }

  detach(server) {
    if (!this.activeWebSockets.has(server)) {
      return; // not attached
    }

    server.removeListener('upgrade', this.handleUpgrade);
    server.removeListener('request', this.handleRequest);
    server.removeListener('pre-close', this.handlePreClose);
    this.handlePreClose(server);
    this.activeWebSockets.delete(server);
  }

  createServer() {
    const server = http__default["default"].createServer();
    this.attach(server);
    return server;
  }

  listen(...args) {
    const server = this.createServer();
    return server.listen(...args);
  }

}
FORWARDED_HTTP_MIDDLEWARE.forEach(middleware => {
  WebSocketExpress[middleware] = (...args) => wrapNonWebsocket(express__default["default"][middleware](...args));

  Object.assign(WebSocketExpress[middleware], express__default["default"][middleware]);
});

class Router extends express__default["default"].Router {
  constructor(...args) {
    super(...args);
    wrapHandlers(this);
  }

}

function splitFirst(data, delimiter) {
  const sep = data.indexOf(delimiter);

  if (sep === -1) {
    return [data];
  }

  return [data.substr(0, sep), data.substr(sep + delimiter.length)];
}

async function getProvidedToken(req, res) {
  const auth = req.get('Authorization');

  if (auth) {
    const [type, data] = splitFirst(auth, ' ');

    if (type === 'Bearer') {
      return data;
    }

    return null;
  }

  if (WebSocketWrapper.isInstance(res)) {
    const ws = await res.accept();
    const tokenMessage = await ws.nextMessage({
      timeout: 5000
    });

    if (tokenMessage.isBinary) {
      throw new Error('Token must be sent as text');
    }

    return String(tokenMessage.data);
  }

  return null;
}

function extractScopesMap(data) {
  if (!data || typeof data !== 'object' || !data.scopes) {
    return {};
  }

  const {
    scopes
  } = data;

  if (Array.isArray(scopes)) {
    const result = {};
    scopes.forEach(scope => {
      result[scope] = true;
    });
    return result;
  }

  if (typeof scopes === 'object') {
    return scopes;
  }

  if (typeof scopes === 'string') {
    return {
      [scopes]: true
    };
  }

  return {};
}

function requireBearerAuth(realm, extractAndValidateToken) {
  let realmForRequest;

  if (typeof realm === 'string') {
    realmForRequest = () => realm;
  } else if (typeof realm === 'function') {
    realmForRequest = realm;
  } else {
    throw new Error('Invalid realm; must be a string or function');
  }

  return async (req, res, next) => {
    const now = Math.floor(Date.now() / 1000);
    const authRealm = await realmForRequest(req, res);
    const token = await getProvidedToken(req, res);
    let tokenData = null;

    if (token) {
      tokenData = await extractAndValidateToken(token, authRealm, req, res);
    }

    if (!tokenData || typeof tokenData.nbf === 'number' && now < tokenData.nbf || typeof tokenData.exp === 'number' && now >= tokenData.exp) {
      res.status(401).header('WWW-Authenticate', `Bearer realm="${authRealm}"`).end();
      return;
    }

    if (typeof tokenData.exp === 'number' && WebSocketWrapper.isInstance(res)) {
      res.closeAtTime(tokenData.exp * 1000, 1001, 'Session expired');
    }

    res.locals.authRealm = authRealm;
    res.locals.authData = tokenData;
    res.locals.authScopes = extractScopesMap(tokenData);
    next();
  };
}
function getAuthData(res) {
  if (!res || typeof res !== 'object' || !res.locals) {
    throw new Error('Must provide response object to getAuthData');
  }

  return res.locals.authData || null;
}
function hasAuthScope(res, scope) {
  if (!res || typeof res !== 'object' || !res.locals) {
    throw new Error('Must provide response object to hasAuthScope');
  }

  const {
    authScopes
  } = res.locals;
  return Boolean(authScopes && authScopes[scope]);
}
function requireAuthScope(scope) {
  return async (req, res, next) => {
    const {
      authRealm
    } = res.locals;

    if (!hasAuthScope(res, scope)) {
      res.status(403).header('WWW-Authenticate', `Bearer realm="${authRealm}", scope="${scope}"`).end();
      return;
    }

    next();
  };
}

const isWebSocket = WebSocketWrapper.isInstance;
WebSocketExpress.Router = Router;
WebSocketExpress.isWebSocket = isWebSocket;
WebSocketExpress.requireBearerAuth = requireBearerAuth;
WebSocketExpress.requireAuthScope = requireAuthScope;
WebSocketExpress.getAuthData = getAuthData;
WebSocketExpress.hasAuthScope = hasAuthScope;

exports.Router = Router;
exports["default"] = WebSocketExpress;
exports.getAuthData = getAuthData;
exports.hasAuthScope = hasAuthScope;
exports.isWebSocket = isWebSocket;
exports.requireAuthScope = requireAuthScope;
exports.requireBearerAuth = requireBearerAuth;
//# sourceMappingURL=index.js.map
