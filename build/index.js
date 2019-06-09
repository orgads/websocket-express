!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define("websocket-express",[],t):"object"==typeof exports?exports["websocket-express"]=t():e["websocket-express"]=t()}(global,function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var s=t[r]={i:r,l:!1,exports:{}};return e[r].call(s.exports,s,s.exports,n),s.l=!0,s.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var s in e)n.d(r,s,function(t){return e[t]}.bind(null,s));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=3)}([function(e,t){e.exports=require("http")},function(e,t){e.exports=require("express")},function(e,t){e.exports=require("ws")},function(e,t,n){e.exports=n(4)},function(e,t,n){"use strict";n.r(t);var r=n(0),s=n.n(r),o=n(1),i=n.n(o),c=n(2),u=n.n(c);const a={};function l(e){e.nextMessage=function(e,{timeout:t=0}={}){return new Promise((n,r)=>{let s=null,o=null,i=null;const c=()=>{e.off("message",s),e.off("close",o),clearTimeout(i)};s=e=>{c(),n(e)},o=()=>{c(),r()},e.on("message",s),e.on("close",o),t>0&&(i=setTimeout(o,t))})}.bind(null,e)}class h{constructor(e,t,n,r){this.wsServer=e,this.req=t,this.socket=n,this.head=r,this.ws=null,this.closed=!1,this.nonce=a,this.accept=this.accept,this.reject=this.reject,this.sendError=this.sendError,this.setHeader=()=>{},this.status=this.status,this.end=this.end,this.send=this.send}static isInstance(e){return e&&e.nonce===a}accept(){return this.closed?Promise.reject(new Error("Connection closed")):this.ws?Promise.resolve(this.ws):new Promise(e=>this.wsServer.handleUpgrade(this.req,this.socket,this.head,t=>{l(t),this.ws=t,e(this.ws)}))}reject(e=500,t=null){if(this.ws)throw new Error("Already accepted WebSocket connection");this.sendError(e,null,t)}sendError(e,t=null,n=null){if(this.closed)throw new Error("Connection closed");const s=n||r.STATUS_CODES[e];var o;this.closed=!0,this.ws?this.ws.close(t||((o=e)>=500?1011:4e3+o),s):function(e,t,n,s){if(e.writable){const o=n||r.STATUS_CODES[t],i={Connection:"close","Content-type":"text/html","Content-Length":Buffer.byteLength(o),...s};e.write([`HTTP/1.1 ${t} ${r.STATUS_CODES[t]}`,...Object.keys(i).map(e=>`${e}: ${i[e]}`),"",o].join("\r\n"))}e.destroy()}(this.socket,e,s)}status(e){if(e<400&&this.ws)throw new Error("Already accepted WebSocket connection");return this.sendError(e),this}end(){return this.ws||this.closed||this.sendError(404),this}send(e){return this.closed||(this.accept().then(t=>{t.send(e),t.close()}),this.closed=!0),this}}function d(e){return"function"!=typeof e?e:(t,n,r)=>{h.isInstance(n)?e(t,n,r):r("route")}}function f(e){return"function"!=typeof e?e:(t,n,r)=>{h.isInstance(n)?r("route"):e(t,n,r)}}function p(e,t,n){const r=e,s=r[t].bind(r);r[t]=(...e)=>s(...e.map(n))}function b(e,t=null){const n=e;t&&(n.use=t.use.bind(t),s.a.METHODS.forEach(e=>{const r=e.toLowerCase();n[r]=t[r].bind(t)}),n.all=t.all.bind(t)),n.ws=n.use,p(n,"ws",d),n.useHTTP=n.use,p(n,"useHTTP",f),s.a.METHODS.forEach(e=>{p(n,e.toLowerCase(),f)}),p(n,"all",f)}const w=["enable","enabled","disable","disabled","set","get","engine","path"];class S{constructor(...e){this.app=i()(...e),this.locals=this.app.locals,this.wsServer=new u.a.Server({noServer:!0}),this.app.use((e,t,n,r)=>{h.isInstance(n)&&n.sendError(500),r(e)}),this.handleUpgrade=this.handleUpgrade.bind(this),this.handleRequest=this.handleRequest.bind(this),w.forEach(e=>{this[e]=this.app[e].bind(this.app)}),b(this,this.app)}handleUpgrade(e,t,n){const r=new h(this.wsServer,e,t,n);return this.app(e,r)}handleRequest(e,t){return this.app(e,t)}attach(e){e.on("upgrade",this.handleUpgrade),e.on("request",this.handleRequest)}detach(e){e.removeListener("upgrade",this.handleUpgrade),e.removeListener("request",this.handleRequest)}createServer(){const e=s.a.createServer();return this.attach(e),e}listen(...e){return this.createServer().listen(...e)}}["static","json","urlencoded"].forEach(e=>{S[e]=(...t)=>f(i.a[e](...t))});class y extends i.a.Router{constructor(...e){super(...e),b(this)}}function m(e,t){let n;if("string"==typeof e)n=()=>e;else{if("function"!=typeof e)throw new Error("Invalid realm; must be a string or function");n=e}return async(e,r,s)=>{const o=await n(e,r),i=await async function(e,t){const n=e.get("Authorization");if(n){const[e,t]=function(e,t){const n=e.indexOf(t);return-1===n?[e]:[e.substr(0,n),e.substr(n+t.length)]}(n," ");return"Bearer"===e?t:null}if(h.isInstance(t))return(await t.accept()).nextMessage({timeout:5e3});return null}(e,r),c=i?function(e){if(!e)return null;if(Array.isArray(e)){const t={};return e.forEach(e=>{t[e]=!0}),t}return"object"==typeof e?e:"string"==typeof e?{[e]:!0}:{}}(await t(i,o,e,r)):null;c?(r.locals.authRealm=o,r.locals.authScopes=c,s()):r.status(401).header("WWW-Authenticate",`Bearer realm="${o}"`).end()}}function g(e,t){if(!e||"string"==typeof e||!e.locals)throw new Error("Must specify response object as first parameter to hasAuthScope");const{authScopes:n}=e.locals;return Boolean(n&&n[t])}function v(e){return async(t,n,r)=>{const{authRealm:s}=n.locals;g(n,e)?r():n.status(403).header("WWW-Authenticate",`Bearer realm="${s}", scope="${e}"`).end()}}n.d(t,"isWebSocket",function(){return E}),n.d(t,"Router",function(){return y}),n.d(t,"requireBearerAuth",function(){return m}),n.d(t,"requireAuthScope",function(){return v}),n.d(t,"hasAuthScope",function(){return g});const E=h.isInstance;S.Router=y,S.isWebSocket=E,S.requireBearerAuth=m,S.requireAuthScope=v,S.hasAuthScope=g;t.default=S}])});
//# sourceMappingURL=index.js.map