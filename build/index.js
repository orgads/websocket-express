!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define("websocket-express",[],t):"object"==typeof exports?exports["websocket-express"]=t():e["websocket-express"]=t()}(global,function(){return function(e){var t={};function n(s){if(t[s])return t[s].exports;var r=t[s]={i:s,l:!1,exports:{}};return e[s].call(r.exports,r,r.exports,n),r.l=!0,r.exports}return n.m=e,n.c=t,n.d=function(e,t,s){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:s})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var s=Object.create(null);if(n.r(s),Object.defineProperty(s,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)n.d(s,r,function(t){return e[t]}.bind(null,r));return s},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=3)}([function(e,t){e.exports=require("http")},function(e,t){e.exports=require("express")},function(e,t){e.exports=require("ws")},function(e,t,n){e.exports=n(4)},function(e,t,n){"use strict";n.r(t);var s=n(0),r=n.n(s),o=n(1),i=n.n(o),c=n(2),u=n.n(c);const a={};function l(e){e.nextMessage=function(e,{timeout:t=0}={}){return new Promise((n,s)=>{let r=null,o=null,i=null;const c=()=>{e.off("message",r),e.off("close",o),clearTimeout(i)};r=(e=>{c(),n(e)}),o=(()=>{c(),s()}),e.on("message",r),e.on("close",o),t>0&&(i=setTimeout(o,t))})}.bind(null,e)}class h{constructor(e,t,n,s){this.wsServer=e,this.req=t,this.socket=n,this.head=s,this.ws=null,this.closed=!1,this.nonce=a,this.accept=this.accept,this.reject=this.reject,this.sendError=this.sendError,this.setHeader=(()=>{}),this.status=this.status,this.end=this.end}static isInstance(e){return e&&e.nonce===a}accept(){return this.ws?Promise.reject(new Error("Already accepted WebSocket connection")):this.closed?Promise.reject(new Error("Connection closed")):new Promise(e=>this.wsServer.handleUpgrade(this.req,this.socket,this.head,t=>{l(t),this.ws=t,e(this.ws)}))}reject(e=500,t=null){if(this.ws)throw new Error("Already accepted WebSocket connection");this.sendError(e,null,t)}sendError(e,t=null,n=null){if(this.closed)throw new Error("Connection closed");const r=n||s.STATUS_CODES[e];var o;this.closed=!0,this.ws?this.ws.close(t||((o=e)>=500?1011:4e3+o),r):function(e,t,n,r){e.writable&&(n=n||s.STATUS_CODES[t],r={Connection:"close","Content-type":"text/html","Content-Length":Buffer.byteLength(n),...r},e.write(`HTTP/1.1 ${t} ${s.STATUS_CODES[t]}\r\n`+Object.keys(r).map(e=>`${e}: ${r[e]}`).join("\r\n")+"\r\n\r\n"+n)),e.destroy()}(this.socket,e,r)}status(e){this.reject(e)}end(){this.ws||this.closed||this.sendError(404)}}function d(e){return"function"!=typeof e?e:(t,n,s)=>{h.isInstance(n)?e(t,n,s):s("route")}}function p(e){return"function"!=typeof e?e:(t,n,s)=>{h.isInstance(n)?s("route"):e(t,n,s)}}function f(e,t,n){const s=e,r=s[t].bind(s);s[t]=((...e)=>r(...e.map(n)))}function b(e,t=null){const n=e;t&&(n.use=t.use.bind(t),r.a.METHODS.forEach(e=>{const s=e.toLowerCase();n[s]=t[s].bind(t)}),n.all=t.all.bind(t)),n.ws=n.use,f(n,"ws",d),n.useHTTP=n.use,f(n,"useHTTP",p),r.a.METHODS.forEach(e=>{f(n,e.toLowerCase(),p)}),f(n,"all",p)}const w=["enable","enabled","disable","disabled","set","get","engine","path"];class S{constructor(...e){this.app=i()(...e),this.locals=this.app.locals,this.wsServer=new u.a.Server({noServer:!0}),this.app.use((e,t,n,s)=>{h.isInstance(n)&&n.sendError(500),s(e)}),this.handleUpgrade=this.handleUpgrade.bind(this),this.handleRequest=this.handleRequest.bind(this),w.forEach(e=>{this[e]=this.app[e].bind(this.app)}),b(this,this.app)}handleUpgrade(e,t,n){const s=new h(this.wsServer,e,t,n);return this.app(e,s)}handleRequest(e,t){return this.app(e,t)}attach(e){e.on("upgrade",this.handleUpgrade),e.on("request",this.handleRequest)}detach(e){e.removeListener("upgrade",this.handleUpgrade),e.removeListener("request",this.handleRequest)}createServer(){const e=r.a.createServer();return this.attach(e),e}listen(...e){return this.createServer().listen(...e)}}["static","json","urlencoded"].forEach(e=>{S[e]=((...t)=>p(i.a[e](...t)))});class y extends i.a.Router{constructor(...e){super(...e),b(this)}}n.d(t,"Router",function(){return m}),S.Router=y;t.default=S;const m=y}])});
//# sourceMappingURL=index.js.map