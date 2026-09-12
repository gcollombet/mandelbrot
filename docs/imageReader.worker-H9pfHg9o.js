(async ()=>{
    const Ra = new Date(2107, 11, 31, 23, 59, 58), _i = new Date(1980, 0, 1), O = void 0, Pn = 1 / 0, qe = "undefined", Pt = "function", Mf = "object", Hi = "string", Uf = "number", xf = "boolean", et = new Uint8Array, kf = "filenameEncoding", Bf = "commentEncoding", Vf = "decodeText", Hf = "extractPrependedData", Gf = "extractAppendedData", sl = "password", ol = "rawPassword", al = "passThrough", cl = "signal", zf = "checkPasswordOnly", Xf = "checkOverlappingEntryOnly", Yf = "checkOverlappingEntry", jf = "checkAmbiguity", Wf = "checkLocalDirectory", Zf = "checkSignature", Kf = "checkCrc32", qf = "checkAuthenticationCode", ll = "useWebWorkers", ul = "useCompressionStream", hl = "transferStreams", fl = "preventClose", Jf = "encryptionStrength", Qf = "extendedTimestamp", $f = "ntfsTimestamp", td = "keepOrder", ed = "level", nd = "bufferedWrite", rd = "createTempStream", id = "dataDescriptorSignature", sd = "useUnicodeFileNames", dl = "dataDescriptor", od = "supportZip64SplitFile", ad = "encodeText", Qr = "offset", jn = "usdz", cd = "unixExtraFieldType", ld = "localExtraField", ud = "centralExtraField", hd = "strictness", fd = "filenameValidation", dd = "normalizeFilename", pl = "maxAppendedDataSize", pd = "decryptCentralDirectory", Ed = "signCentralDirectory", El = "filename", _l = "comment", Sn = "strict", co = "balanced", Je = "tolerant", _d = "Invalid option (must be a function)", gd = "Invalid signal (must be an AbortSignal instance)", md = "Invalid password (password must be a string, rawPassword must be a Uint8Array)", Td = "The operation was aborted", wd = "AbortError";
    function lo(e) {
        if (e && typeof e != Pt) throw new Error(_d);
        return e;
    }
    function gl(e) {
        if (e && (typeof e.addEventListener != Pt || typeof e.aborted != xf)) throw new Error(gd);
        return e || O;
    }
    function ml(e) {
        if (e && e.aborted) throw e.reason === O ? new DOMException(Td, wd) : e.reason;
    }
    function Tl(e, t) {
        if (e && typeof e != Hi || t && !(t instanceof Uint8Array)) throw new Error(md);
    }
    function wl(e, t, n) {
        if (!Number.isInteger(e) || e < 0 || e > t) throw new Error(n);
    }
    function ur(e, t, n) {
        e !== O && wl(e, t, n);
    }
    function Gi(e) {
        return typeof e == Hi && e.trim() ? Number(e) : e;
    }
    const Al = 64 * 1024, Ad = 64, Il = 1, Id = "Invalid maxWorkers (must be an integer greater than 0)";
    let yl = 2;
    try {
        typeof navigator != qe && navigator.hardwareConcurrency && (yl = navigator.hardwareConcurrency);
    } catch  {}
    const Sl = {
        workerURI: "./core/web-worker-wasm.js",
        wasmURI: "./core/streams/zlib-wasm/zlib-streams.wasm",
        chunkSize: Al,
        maxWorkers: yl,
        terminateWorkerTimeout: 5e3,
        workerStarvationTimeout: 5e3,
        workerStartupTimeout: 5e3,
        useWebWorkers: !0,
        useCompressionStream: !0,
        transferStreams: !0,
        CompressionStream: typeof CompressionStream != qe && CompressionStream,
        DecompressionStream: typeof DecompressionStream != qe && DecompressionStream
    }, Rl = "maxWorkers", yd = [
        "baseURI",
        "wasmURI",
        "workerURI"
    ], Sd = [
        "useCompressionStream",
        "useWebWorkers",
        "transferStreams"
    ], Nl = [
        "chunkSize",
        Rl,
        "terminateWorkerTimeout",
        "workerStarvationTimeout",
        "workerStartupTimeout"
    ], Dl = [
        "createWorker",
        "CompressionStream",
        "DecompressionStream",
        "CompressionStreamFallback",
        "DecompressionStreamFallback"
    ], Rd = [
        ...yd,
        ...Sd,
        ...Nl,
        ...Dl
    ], bl = {
        ...Sl
    };
    function vr() {
        return bl;
    }
    function uo(e) {
        return Ol(e.chunkSize);
    }
    function Ol(e) {
        return e = Gi(e), Number.isInteger(e) && e >= Il ? Math.max(e, Ad) : Al;
    }
    function Nd(e) {
        const t = {};
        for (const n of Rd){
            const r = e[n];
            r !== O && (t[n] = Dd(n, r));
        }
        return t;
    }
    function Dd(e, t) {
        if (Nl.includes(e)) {
            if (t = Gi(t), e == Rl && (!Number.isInteger(t) || t < Il)) throw new Error(Id);
        } else Dl.includes(e) && lo(t);
        return t;
    }
    function bd(e) {
        e = e || {};
        const { CompressionStreamZlib: t, DecompressionStreamZlib: n } = e;
        if (t === O && n === O) return e;
        const r = Object.assign({}, e);
        return r.CompressionStreamFallback === O && (r.CompressionStreamFallback = t), r.DecompressionStreamFallback === O && (r.DecompressionStreamFallback = n), r;
    }
    function zi(e) {
        const t = Nd(bd(e));
        Object.assign(Sl, t), Object.assign(bl, t);
    }
    const $r = new Uint8Array(288);
    $r.fill(8, 0, 144), $r.fill(9, 144, 256), $r.fill(7, 256, 280), $r.fill(8, 280, 288), new Uint8Array(30).fill(5);
    const Ce = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", Od = (e)=>e({
            workerURI: (t)=>{
                const n = "text/javascript";
                let r = `!function(t){"function"==typeof define&&define.amd?define(t):t()}(function(){"use strict";const{Array:t,Object:n,Number:e,Math:s,Error:r,Uint8Array:o,Uint16Array:c,Uint32Array:i,Int32Array:a,Map:f,DataView:u,Promise:l,TextEncoder:w,crypto:h,postMessage:p,TransformStream:d,ReadableStream:y,WritableStream:m,CompressionStream:S,DecompressionStream:g}=self,v=void 0,b="undefined",k="function",z=new o,C=[[],[],[],[],[],[],[],[]];for(let t=0;t<256;t++){let n=t;for(let t=0;t<8;t++)n=1&n?n>>>1^3988292384:n>>>1;C[0][t]=n}for(let t=0;t<256;t++)for(let n=1;n<8;n++){const e=C[n-1][t];C[n][t]=e>>>8^C[0][255&e]}const[I,A,x,M,P,B,D,F]=C;class R{constructor(t){this.o=t||-1}append(t){let n=0|this.o;const e=0|t.length;let s=0;if(e>=8&&t.buffer){const r=new u(t.buffer,t.byteOffset,e),o=e-8;for(;s<=o;s+=8){const t=n^r.getInt32(s,!0),e=r.getInt32(s+4,!0);n=F[255&t]^D[t>>>8&255]^B[t>>>16&255]^P[t>>>24&255]^M[255&e]^x[e>>>8&255]^A[e>>>16&255]^I[e>>>24&255]}}for(;s<e;s++)n=n>>>8^I[255&(n^t[s])];this.o=n}get(){return~this.o}}class U extends d{constructor(){let t;const n=new R;super({transform(t,e){n.append(t),e.enqueue(t)},flush(){const e=new o(4);new u(e.buffer).setUint32(0,n.get()),t.value=e}}),t=this}}function W(t,n){const e=new o(t.length+n.length);return e.set(t),e.set(n,t.length),e}function _(t){return new u(t.buffer,t.byteOffset,t.byteLength)}const T={concat(t,n){if(0===t.length||0===n.length)return t.concat(n);const e=t[t.length-1],s=T.l(e);return 32===s?t.concat(n):T.h(n,s,0|e,t.slice(0,t.length-1))},bitLength(t){const n=t.length;if(0===n)return 0;const e=t[n-1];return 32*(n-1)+T.l(e)},m(t,n){if(32*t.length<n)return t;const e=(t=t.slice(0,s.ceil(n/32))).length;return n&=31,e>0&&n&&(t[e-1]=T.S(n,t[e-1]&2147483648>>n-1,1)),t},S:(t,n,e)=>32===t?n:(e?0|n:n<<32-t)+1099511627776*t,l:t=>s.round(t/1099511627776)||32,h(t,n,e,s){for(void 0===s&&(s=[]);n>=32;n-=32)s.push(e),e=0;if(0===n)return s.concat(t);for(let r=0;r<t.length;r++)s.push(e|t[r]>>>n),e=t[r]<<32-n;const r=t.length?t[t.length-1]:0,o=T.l(r);return s.push(T.S(n+o&31,n+o>32?e:s.pop(),1)),s}},V={bytes:{v(t){const n=T.bitLength(t)/8,e=new o(n);let s;for(let r=0;r<n;r++)3&r||(s=t[r/4]),e[r]=s>>>24,s<<=8;return e},C(t){const n=[];let e,s=0;for(e=0;e<t.length;e++)s=s<<8|t[e],3&~e||(n.push(s),s=0);return 3&e&&n.push(T.S(8*(3&e),s)),n}}},K=class{constructor(t){const n=this;n.blockSize=512,n.I=[1732584193,4023233417,2562383102,271733878,3285377520],n.A=[1518500249,1859775393,2400959708,3395469782],t?(n.M=t.M.slice(0),n.P=t.P.slice(0),n.B=t.B):n.reset()}reset(){const t=this;return t.M=t.I.slice(0),t.P=[],t.B=0,t}update(t){const n=this;"string"==typeof t&&(t=V.D.C(t));const e=n.P=T.concat(n.P,t),s=n.B,o=n.B=s+T.bitLength(t);if(o>9007199254740991)throw new r("Cannot hash more than 2^53 - 1 bits");const c=new i(e);let a=0;for(let t=n.blockSize+s-(n.blockSize+s&n.blockSize-1);t<=o;t+=n.blockSize)n.F(c.subarray(16*a,16*(a+1))),a+=1;return e.splice(0,16*a),n}R(){const t=this;let n=t.P;const e=t.M;n=T.concat(n,[T.S(1,1)]);for(let t=n.length+2;15&t;t++)n.push(0);for(n.push(s.floor(t.B/4294967296)),n.push(0|t.B);n.length;)t.F(n.splice(0,16));return t.reset(),e}U(t,n,e,s){return t<=19?n&e|~n&s:t<=39?n^e^s:t<=59?n&e|n&s|e&s:t<=79?n^e^s:void 0}W(t,n){return n<<t|n>>>32-t}F(n){const e=this,r=e.M,o=t(80);for(let t=0;t<16;t++)o[t]=n[t];let c=r[0],i=r[1],a=r[2],f=r[3],u=r[4];for(let t=0;t<=79;t++){t>=16&&(o[t]=e.W(1,o[t-3]^o[t-8]^o[t-14]^o[t-16]));const n=e.W(5,c)+e.U(t,i,a,f)+u+o[t]+e.A[s.floor(t/20)]|0;u=f,f=a,a=e.W(30,i),i=c,c=n}r[0]=r[0]+c|0,r[1]=r[1]+i|0,r[2]=r[2]+a|0,r[3]=r[3]+f|0,r[4]=r[4]+u|0}},E={importKey:t=>new E._(V.bytes.C(t)),T(t,n,e,s){if(e=e||1e4,s<0||e<0)throw new r("invalid params to pbkdf2");const o=1+(s>>5)<<2;let c,i,a,f,l;const w=new ArrayBuffer(o),h=new u(w);let p=0;const d=T;for(n=V.bytes.C(n),l=1;p<(o||1);l++){for(c=i=t.encrypt(d.concat(n,[l])),a=1;a<e;a++)for(i=t.encrypt(i),f=0;f<i.length;f++)c[f]^=i[f];for(a=0;p<(o||1)&&a<c.length;a++)h.setInt32(p,c[a]),p+=4}return w.slice(0,s/8)},_:class{constructor(t){const n=this,e=n.V=K,s=[[],[]];n.K=[new e,new e];const r=n.K[0].blockSize/32;t.length>r&&(t=(new e).update(t).R());for(let n=0;n<r;n++)s[0][n]=909522486^t[n],s[1][n]=1549556828^t[n];n.K[0].update(s[0]),n.K[1].update(s[1]),n.L=new e(n.K[0])}reset(){const t=this;t.L=new t.V(t.K[0]),t.O=!1}update(t){this.O=!0,this.L.update(t)}digest(){const t=this,n=t.L.R(),e=new t.V(t.K[1]).update(n).R();return t.reset(),e}encrypt(t){if(this.O)throw new r("encrypt on already updated hmac called!");return this.update(t),this.digest(t)}}},L=typeof h!=b&&typeof h.getRandomValues==k,O="Invalid password",j="zipjs-abort-check-password";function H(t){if(L)return h.getRandomValues(t);throw new r("Crypto API not supported")}const N=16,q={name:"PBKDF2"},G=n.assign({hash:{name:"HMAC"}},q),J=n.assign({iterations:1e3,hash:{name:"SHA-1"}},q),Q=["deriveBits"],X=[8,12,16],Y=[16,24,32],Z=10,$=[0,0,0,0],tt=typeof h!=b,nt=tt&&h.subtle,et=tt&&typeof nt!=b,st=V.bytes,rt=class{constructor(t){const n=this;n.j=[[[],[],[],[],[]],[[],[],[],[],[]]],n.j[0][0][0]||n.H();const e=n.j[0][4],s=n.j[1],o=t.length;let c,i,a,f=1;if(4!==o&&6!==o&&8!==o)throw new r("invalid aes key size");for(n.A=[i=t.slice(0),a=[]],c=o;c<4*o+28;c++){let t=i[c-1];(c%o===0||8===o&&c%o===4)&&(t=e[t>>>24]<<24^e[t>>16&255]<<16^e[t>>8&255]<<8^e[255&t],c%o===0&&(t=t<<8^t>>>24^f<<24,f=f<<1^283*(f>>7))),i[c]=i[c-o]^t}for(let t=0;c;t++,c--){const n=i[3&t?c:c-4];a[t]=c<=4||t<4?n:s[0][e[n>>>24]]^s[1][e[n>>16&255]]^s[2][e[n>>8&255]]^s[3][e[255&n]]}}encrypt(t){return this.N(t,0)}decrypt(t){return this.N(t,1)}H(){const t=this.j[0],n=this.j[1],e=t[4],s=n[4],r=[],o=[];let c,i,a,f;for(let t=0;t<256;t++)o[(r[t]=t<<1^283*(t>>7))^t]=t;for(let u=c=0;!e[u];u^=i||1,c=o[c]||1){let o=c^c<<1^c<<2^c<<3^c<<4;o=o>>8^255&o^99,e[u]=o,s[o]=u,f=r[a=r[i=r[u]]];let l=16843009*f^65537*a^257*i^16843008*u,w=257*r[o]^16843008*o;for(let e=0;e<4;e++)t[e][u]=w=w<<24^w>>>8,n[e][o]=l=l<<24^l>>>8}for(let e=0;e<5;e++)t[e]=t[e].slice(0),n[e]=n[e].slice(0)}N(t,n){if(4!==t.length)throw new r("invalid aes block size");const e=this.A[n],s=e.length/4-2,o=[0,0,0,0],c=this.j[n],i=c[0],a=c[1],f=c[2],u=c[3],l=c[4];let w,h,p,d=t[0]^e[0],y=t[n?3:1]^e[1],m=t[2]^e[2],S=t[n?1:3]^e[3],g=4;for(let t=0;t<s;t++)w=i[d>>>24]^a[y>>16&255]^f[m>>8&255]^u[255&S]^e[g],h=i[y>>>24]^a[m>>16&255]^f[S>>8&255]^u[255&d]^e[g+1],p=i[m>>>24]^a[S>>16&255]^f[d>>8&255]^u[255&y]^e[g+2],S=i[S>>>24]^a[d>>16&255]^f[y>>8&255]^u[255&m]^e[g+3],g+=4,d=w,y=h,m=p;for(let t=0;t<4;t++)o[n?3&-t:t]=l[d>>>24]<<24^l[y>>16&255]<<16^l[m>>8&255]<<8^l[255&S]^e[g++],w=d,d=y,y=m,m=S,S=w;return o}},ot=class{constructor(t,n){this.G=t,this.J=n,this.X=n}reset(){this.X=this.J}update(t){return this.Y(this.G,t,this.X)}Z(t){if(255&~(t>>24))t+=1<<24;else{let n=t>>16&255,e=t>>8&255,s=255&t;255===n?(n=0,255===e?(e=0,255===s?s=0:++s):++e):++n,t=0,t+=n<<16,t+=e<<8,t+=s}return t}$(t){0===(t[0]=this.Z(t[0]))&&(t[1]=this.Z(t[1]))}Y(t,n,e){let s;if(!(s=n.length))return[];const r=T.bitLength(n);for(let r=0;r<s;r+=4){this.$(e);const s=t.encrypt(e);n[r]^=s[0],n[r+1]^=s[1],n[r+2]^=s[2],n[r+3]^=s[3]}return T.m(n,r)}},ct=E._;let it=tt&&et&&typeof nt.importKey==k,at=tt&&et&&typeof nt.deriveBits==k;class ft extends d{constructor({password:t,rawPassword:n,encryptionStrength:e,checkPasswordOnly:s,checkAuthenticationCode:c=!0}){super({start(){lt(this,t,n,e)},async transform(t,n){const e=this,{password:c,strength:i,nt:a,ready:f}=e;c?(await async function(t,n,e,s){const o=await ht(t,n,e,dt(s,0,X[n])),c=dt(s,X[n]);if(o[0]!=c[0]||o[1]!=c[1])throw new r(O)}(e,i,c,dt(t,0,X[i]+2)),t=dt(t,X[i]+2),s?n.error(new r(j)):a()):await f;const u=new o(t.length-Z-(t.length-Z)%N);n.enqueue(wt(e,t,u,0,Z,!0))},async flush(t){const{et:n,st:e,ot:s,ready:o}=this;if(e&&n){await o;const i=dt(s,0,s.length-Z),a=dt(s,s.length-Z);let f=z;if(i.length){const t=mt(st,i);e.update(t);const s=n.update(t);f=yt(st,s)}const u=dt(yt(st,e.digest()),0,Z);let l=s.length<Z?1:0;for(let t=0;t<Z;t++)l|=u[t]^a[t];if(l&&c)throw new r("Invalid authentication code");t.enqueue(f)}}})}}class ut extends d{constructor({password:t,rawPassword:n,encryptionStrength:e}){super({start(){lt(this,t,n,e)},async transform(t,n){const e=this,{password:s,strength:r,nt:c,ready:i}=e;let a=z;s?(a=await async function(t,n,e){const s=H(new o(X[n]));return W(s,await ht(t,n,e,s))}(e,r,s),c()):await i;const f=new o(a.length+t.length-t.length%N);f.set(a,0),n.enqueue(wt(e,t,f,a.length,0))},async flush(t){const{et:n,st:e,ot:s,ready:r}=this;if(e&&n){await r;let o=z;if(s.length){const t=n.update(mt(st,s));e.update(t),o=yt(st,t)}const c=yt(st,e.digest()).slice(0,Z);t.enqueue(W(o,c))}}})}}function lt(t,e,s,r){n.assign(t,{ready:new l(n=>t.nt=n),password:pt(e,s),strength:r-1,ot:z})}function wt(t,n,e,s,r,c){const{et:i,st:a,ot:f}=t;f.length&&(n=W(f,n));const u=n.length-r;let l;for(e=function(t,n){if(n&&n>t.length){const e=t;(t=new o(n)).set(e,0)}return t}(e,s+(u-u%N)),l=0;l<=u-N;l+=N){const t=mt(st,dt(n,l,l+N));c&&a.update(t);const r=i.update(t);c||a.update(r),e.set(yt(st,r),l+s)}return t.ot=dt(n,l),e}async function ht(e,s,r,c){e.password=null;const i=await async function(t,n,e,s,r){if(!it)return E.importKey(n);try{return await nt.importKey("raw",n,e,!1,r)}catch{return it=!1,E.importKey(n)}}(0,r,G,0,Q),a=await async function(t,n,e){if(!at)return E.T(n,t.salt,J.iterations,e);try{return await nt.deriveBits(t,n,e)}catch{return at=!1,E.T(n,t.salt,J.iterations,e)}}(n.assign({salt:c},J),i,8*(2*Y[s]+2)),f=new o(a),u=mt(st,dt(f,0,Y[s])),l=mt(st,dt(f,Y[s],2*Y[s])),w=dt(f,2*Y[s]);return n.assign(e,{keys:{key:u,ct:l,passwordVerification:w},et:new ot(new rt(u),t.from($)),st:new ct(l)}),w}function pt(t,n){return n===v?function(t){if(typeof w==b){t=unescape(encodeURIComponent(t));const n=new o(t.length);for(let e=0;e<n.length;e++)n[e]=t.charCodeAt(e);return n}return(new w).encode(t)}(t):n}function dt(t,n,e){return t.subarray(n,e)}function yt(t,n){return t.v(n)}function mt(t,n){return t.C(n)}class St extends d{constructor({password:t,rawPassword:n,passwordVerification:e,checkPasswordOnly:s}){super({start(){vt(this,t,n,e)},transform(t,n){const e=this;if(e.password||e.rawPassword){const n=bt(e,t.subarray(0,12));if(e.password=e.rawPassword=null,0!=(n[11]^e.passwordVerification))throw new r(O);t=t.subarray(12)}s?n.error(new r(j)):n.enqueue(bt(e,t))}})}}class gt extends d{constructor({password:t,rawPassword:n,passwordVerification:e}){super({start(){vt(this,t,n,e)},transform(t,n){const e=this;let s,r;if(e.password||e.rawPassword){e.password=e.rawPassword=null;const n=H(new o(12));n[11]=e.passwordVerification,s=new o(t.length+n.length),s.set(kt(e,n),0),r=12}else s=new o(t.length),r=0;s.set(kt(e,t),r),n.enqueue(s)}})}}function vt(t,e,s,r){n.assign(t,{password:e,rawPassword:s,passwordVerification:r}),function(t,e,s){const r=[305419896,591751049,878082192];if(n.assign(t,{keys:r,it:new R(r[0]),ft:new R(r[2])}),s)for(let n=0;n<s.length;n++)zt(t,s[n]);else for(let n=0;n<e.length;n++)zt(t,e.charCodeAt(n))}(t,e,s)}function bt(t,n){const e=new o(n.length);for(let s=0;s<n.length;s++)e[s]=Ct(t)^n[s],zt(t,e[s]);return e}function kt(t,n){const e=new o(n.length);for(let s=0;s<n.length;s++)e[s]=Ct(t)^n[s],zt(t,n[s]);return e}function zt(t,n){let[,e]=t.keys;t.it.append([n]);const r=~t.it.get();e=At(s.imul(At(e+It(r)),134775813)+1),t.ft.append([e>>>24]);const o=~t.ft.get();t.keys=[r,e,o]}function Ct(t){const n=2|t.keys[2];return It(s.imul(n,1^n)>>>8)}function It(t){return 255&t}function At(t){return 4294967295&t}function xt(t){if(t instanceof y)return t;const n=t.getReader();return new y({async pull(t){const{value:e,done:s}=await n.read();s?t.close():t.enqueue(e)},cancel:t=>n.cancel(t)})}const Mt=new f;function Pt(t){return Mt.get(t)}const Bt="Invalid uncompressed size",Dt="deflate-raw",Ft="gzip",Rt=[31,139,8];class Ut extends d{constructor(t,{chunkSize:n,CompressionStreamFallback:e,CompressionStream:s}){super({});const{compressed:r,encrypted:o,useCompressionStream:c,zipCrypto:i,computeCrc32:a,level:f,deflate64:l,format:w,compressionMethod:h,inputSize:p}=t,d=this;let y,m,S,g=super.readable;const v=w&&Pt(w),b=a&&r&&!l&&!v&&(!o||i)&&Boolean(c&&s);if(o&&!i||!a||b||(y=new U,g=Lt(g,y)),r)if(v)g=Ot(g,Kt(v.CompressionStream,w,{level:f,chunkSize:n,compressionMethod:h,uncompressedSize:p}));else if(b)S=new Wt,g=Ot(g,new s(Ft)),g=Lt(g,S);else try{g=Et(g,c,{level:f,chunkSize:n},s,e)}catch(t){let n;try{n=new s(Ft)}catch{throw t}g=Ot(g,n),g=Lt(g,new Wt)}o&&(i?g=Lt(g,new gt(t)):(m=new ut(t),g=Lt(g,m))),Vt(d,g,()=>{o&&!i||!a||(d.crc32=b?S.crc32:new u(y.value.buffer).getUint32(0))})}}class Wt extends d{constructor(){let t,n=10,e=new o(0);super({transform(t,r){if(n){const e=s.min(n,t.length);if(n-=e,!(t=t.subarray(e)).length)return}const o=e.length+t.length;if(o<=8)return void(e=W(e,t));const c=o-8,i=s.min(c,e.length);r.enqueue(W(e.subarray(0,i),t.subarray(0,c-i))),e=W(e.subarray(i),t.subarray(c-i))},flush(){const n=_(e);t.crc32=n.getUint32(0,!0),t.uncompressedSize=n.getUint32(4,!0)}}),t=this}}class _t extends d{constructor(t,{chunkSize:n,DecompressionStreamFallback:e,DecompressionStream:s}){super({});const{zipCrypto:c,encrypted:i,checkCrc32:a,crc32:f,compressed:w,useCompressionStream:h,deflate64:p,format:m,compressionMethod:S,rawBitFlag:g,outputSize:b}=t;let k,z,C=super.readable;if(i&&(c?C=Lt(C,new St(t)):(z=new ft(t),C=Lt(C,z))),w){const t=m&&Pt(m);if(t)C=Ot(C,Kt(t.DecompressionStream,m,{chunkSize:n,compressionMethod:S,rawBitFlag:g,uncompressedSize:b}));else try{C=Et(C,h,{chunkSize:n,deflate64:p},s,e)}catch(t){if(p||b===v)throw t;let n;try{n=new s(Ft)}catch{throw t}C=function(t,n,e){const s=new R;let c,i,a,f=0,u=!1;const w=new l((t,n)=>{i=t,a=n});w.catch(()=>{}),e||i();const h=new d({start(t){const n=new o(10);n.set(Rt),t.enqueue(n)},transform(t,n){n.enqueue(t)},async flush(t){u=!0,y();try{await w}finally{m()}const n=new o(8),r=_(n);r.setUint32(0,s.get(),!0),r.setUint32(4,e,!0),t.enqueue(n)},cancel(t){a(t)}}),p=new d({transform(t,n){s.append(t),f+=t.length,f>=e?i():u&&y(),n.enqueue(t)},cancel(t){a(t)}});return t=Lt(t,h),Lt(t=Ot(t,n),p);function y(){m(),c=setTimeout(()=>a(new r(Bt)),5e3)}function m(){clearTimeout(c)}}(C,n,b)}C=function(t){const n=t.getReader();return new y({async pull(t){let e;try{e=await n.read()}catch(t){if(t&&t.message)throw t;const n=new r("Invalid compressed data");throw n.cause=t,n}const{value:s,done:o}=e;o?t.close():t.enqueue(s)},cancel:t=>n.cancel(t)})}(C)}a&&(k=new U,C=Lt(C,k)),Vt(this,C,()=>{if(a){const t=new u(k.value.buffer);if(f!=t.getUint32(0,!1))throw new r("Invalid CRC32")}})}}const Tt=new f;function Vt(t,e,s){e=Lt(e,new d({flush:s})),n.defineProperty(t,"readable",{get:()=>e})}function Kt(t,n,e){if(!t)throw new r("Compression method not supported");return new t(n,e)}function Et(t,n,e,s,r){const o=n&&s?s:r||s,c=e.deflate64?"deflate64-raw":Dt;let i;try{i=new o(c,e)}catch(t){if(!n||!r||o==r)throw t;i=new r(c,e)}return Ot(t,i)}function Lt(t,n){return xt(t).pipeThrough(n)}function Ot(t,n){const e=n.writable.getWriter(),s=t.getReader();return async function(){try{for(;;){await e.ready;const t=await s.read();if(t.done){await e.close();break}await e.write(t.value)}}catch(t){await async function(t,n){try{await t.abort(n)}catch{}}(e,t),await async function(t,n){try{await t.cancel(n)}catch{}}(s,t)}}(),n.readable}const jt="data",Ht="close",Nt="deflate";class qt extends d{constructor(t,e){super({});const s=this,{codecType:o}=t;let c;o.startsWith(Nt)?c=Ut:o.startsWith("inflate")&&(c=_t),s.outputSize=0;let i=0;const a=new c(t,e),f=super.readable,u=new d({transform(t,n){t&&t.length&&(i+=t.length,n.enqueue(t))},flush(){n.assign(s,{inputSize:i})}}),l=new d({transform(n,e){if(n&&n.length&&(e.enqueue(n),s.outputSize+=n.length,t.outputSize!==v&&s.outputSize>t.outputSize))throw new r(Bt)},flush(){const{crc32:t}=a;n.assign(s,{crc32:t,inputSize:i})}});n.defineProperty(s,"readable",{get:()=>f.pipeThrough(u).pipeThrough(a).pipeThrough(l)})}}class Gt extends d{constructor(t){const n=[];let s=0;function r(){const e=new o(t);let r=0;for(;r<t;){const s=n[0],o=t-r;s.length<=o?(e.set(s,r),r+=s.length,n.shift()):(e.set(s.subarray(0,o),r),n[0]=s.subarray(o),r+=o)}return s-=t,e}(!e.isFinite(t)||t<1)&&(t=65536),super({transform(e,o){for(n.push(e),s+=e.length;s>t;)o.enqueue(r())},flush(t){s&&t.enqueue(function(t,n){const e=new o(n);let s=0;for(const n of t)e.set(n,s),s+=n.length;return e}(n,s))}})}}let Jt=2;try{typeof navigator!=b&&navigator.hardwareConcurrency&&(Jt=navigator.hardwareConcurrency)}catch{}const Qt=new f,Xt=new f;let Yt,Zt=0;async function $t(t){let n,o;try{const{options:c,config:i}=t;if(c.format)try{await async function(t,n){!Mt.has(t)&&n&&function(t,n){const{CompressionStream:e,DecompressionStream:s}=n;if(typeof e!=k&&typeof s!=k)throw new r("Invalid codec module");Mt.set(t,{CompressionStream:e,DecompressionStream:s})}(t,await(import(n)))}(c.format,c.codecURI)}catch(t){throw t.codecImportFailed=!0,t}if(i.CompressionStream=self.CompressionStream,i.DecompressionStream=self.DecompressionStream,c.compressed&&!c.format)if(c.useCompressionStream){if(!function(t,n){if(!t)return!1;let e=Tt.get(t);e||(e=new f,Tt.set(t,e));let s=e.get(n);if(s===v){try{new t(n),s=!0}catch{s=!1}e.set(n,s)}return s}(c.codecType.startsWith(Nt)?i.CompressionStream:i.DecompressionStream,Dt))try{await self.initModule(t.config)}catch{}}else try{await self.initModule(t.config)}catch{c.useCompressionStream=!0}!i.CompressionStreamFallback&&i.CompressionStreamZlib&&(i.CompressionStreamFallback=i.CompressionStreamZlib),!i.DecompressionStreamFallback&&i.DecompressionStreamZlib&&(i.DecompressionStreamFallback=i.DecompressionStreamZlib);const a={highWaterMark:1},u=t.readable?xt(t.readable):new y({async pull(t){const n=new l(t=>Qt.set(Zt,t));tn({type:"pull",messageId:Zt}),Zt=(Zt+1)%e.MAX_SAFE_INTEGER;const{value:s,done:r}=await n;t.enqueue(s),r&&t.close()}},a);o=t.writable?function(t){if(t instanceof m)return t;const n=t.getWriter();return new m({write:t=>n.write(t),close:()=>n.close(),abort:t=>n.abort(t)})}(t.writable):new m({async write(t){let n;const s=new l(t=>n=t);Xt.set(Zt,n),tn({type:jt,value:t,messageId:Zt}),Zt=(Zt+1)%e.MAX_SAFE_INTEGER,await s}},a),n=new qt(c,i),Yt=new AbortController;const{signal:w}=Yt;await u.pipeThrough(n).pipeThrough(new Gt(function(t){return r="string"==typeof(n=r=t.chunkSize)&&n.trim()?e(n):n,e.isInteger(r)&&r>=1?s.max(r,64):65536;var n,r}(i))).pipeTo(o,{signal:w,preventClose:!0,preventAbort:!0}),await o.getWriter().close();const{crc32:h,inputSize:p,outputSize:d}=n;tn({type:Ht,result:{crc32:h,inputSize:p,outputSize:d}})}catch(t){if(t.outputSize=n?n.outputSize:0,o&&!o.locked)try{await o.getWriter().close()}catch{}nn(t)}}function tn(t){const{value:n}=t;if(n)if(n.length)try{t.value=(e=n,e.byteOffset||e.byteLength!=e.buffer.byteLength?new o(e):e).buffer,p(t,[t.value])}catch{p(t)}else p(t);else p(t);var e}function nn(t=new r("Unknown error")){const{message:n,stack:e,code:s,name:o,outputSize:c,cause:i,codecImportFailed:a}=t,f={message:n,stack:e,code:s,name:o,outputSize:c};i&&(f.cause={name:i.name,message:i.message}),a&&(f.codecImportFailed=!0),p({error:f})}addEventListener("message",({data:t})=>{const{type:n,messageId:e,value:s,done:r}=t;try{if("start"==n&&$t(t),n==jt){const t=Qt.get(e);Qt.delete(e),t({value:s||new o,done:r})}if("ack"==n){const t=Xt.get(e);Xt.delete(e),t()}n==Ht&&Yt.abort()}catch(t){nn(t)}}),p({type:"ready"});const en="deflate",sn="deflate-raw",rn="deflate64-raw",on="gzip";let cn,an,fn,un,ln;function wn(t,n,e={}){if(!cn){const t=new r("WASM module not loaded");throw t.cause=ln,t}const c="number"==typeof e.level?e.level:-1,i="number"==typeof e.outBuffer?e.outBuffer:65536,a="number"==typeof e.inBufferSize?e.inBufferSize:65536;return new d({start(){try{let e;if(this.ut=an(i),this.in=an(a),this.inBufferSize=a,!this.ut||!this.in)throw new r("allocation failed");if(this.lt=new o(i),t?(this.wt=cn.deflate_process,this.ht=cn.deflate_last_consumed,this.yt=cn.deflate_end,this.St=cn.deflate_new(),e=n===on?cn.deflate_init_gzip(this.St,c):n===sn?cn.deflate_init_raw(this.St,c):cn.deflate_init(this.St,c)):n===rn?(this.wt=cn.inflate9_process,this.ht=cn.inflate9_last_consumed,this.yt=cn.inflate9_end,this.St=cn.inflate9_new(),e=cn.inflate9_init_raw(this.St)):(this.wt=cn.inflate_process,this.ht=cn.inflate_last_consumed,this.yt=cn.inflate_end,this.St=cn.inflate_new(),e=n===sn?cn.inflate_init_raw(this.St):n===on?cn.inflate_init_gzip(this.St):cn.inflate_init(this.St)),0!==e)throw new r("init failed:"+e)}catch(t){throw f(this),t}},transform(t,n){try{const e=t,c=new o(un.buffer),a=this.wt,f=this.ht,u=this.ut,l=this.lt;let w=0;for(;w<e.length;){const t=s.min(e.length-w,32768);if((!this.in||this.inBufferSize<t)&&(this.in&&fn&&(fn(this.in),this.in=0),this.in=an(t),this.inBufferSize=t,!this.in))throw new r("allocation failed");c.set(e.subarray(w,w+t),this.in);const o=a(this.St,this.in,t,u,i,0),h=o>>24&255,p=128&h?h-256:h;if(p<0)throw new r("process error:"+p);const d=16777215&o;d&&(l.set(c.subarray(u,u+d),0),n.enqueue(l.slice(0,d)));const y=f(this.St);if(0===y&&0===d)break;w+=y}}catch(t){f(this),n.error(t)}},flush(t){try{const n=new o(un.buffer),e=this.wt,s=this.ut,c=this.lt;for(;;){const o=e(this.St,0,0,s,i,4),a=o>>24&255,f=128&a?a-256:a;if(f<0)throw new r("process error:"+f);const u=16777215&o;if(u&&(c.set(n.subarray(s,s+u),0),t.enqueue(c.slice(0,u))),1===a||0===u)break}}catch(n){t.error(n)}finally{const n=f(this);0!==n&&t.error(new r("end error:"+n))}},cancel(){f(this)}});function f(t){let n=0;return t.St&&t.yt&&(n=t.yt(t.St)),t.St=0,t.in&&fn&&fn(t.in),t.in=0,t.ut&&fn&&fn(t.ut),t.ut=0,n}}class hn{constructor(t=en,n){return wn(!0,t,n)}}class pn{constructor(t=en,n){return wn(!1,t,n)}}hn.gt=!0,pn.gt=!0,hn.vt=[en,sn,on],pn.vt=[en,sn,on,rn];let dn=!1;!function(t={}){const{init:n}=t,e=t.CompressionStreamFallback||t.CompressionStreamZlib,s=t.DecompressionStreamFallback||t.DecompressionStreamZlib;self.initModule=async t=>{n&&await n(t),e&&(t.CompressionStreamFallback=e),s&&(t.DecompressionStreamFallback=s)}}({CompressionStreamFallback:hn,DecompressionStreamFallback:pn,init:t=>async function(t,{baseURI:n}){if(!dn)try{await async function(t,n){let e,s;try{try{s=new URL(t,n)}catch{}const r=await fetch(s);e=await r.arrayBuffer()}catch(n){if(!t.startsWith("data:application/wasm;base64,"))throw n;e=function(t){const n=t.split(",")[1],e=atob(n),s=e.length,r=new o(s);for(let t=0;t<s;++t)r[t]=e.charCodeAt(t);return r.buffer}(t)}!function(t){if(cn=t,({malloc:an,free:fn,memory:un}=cn),"function"!=typeof an||"function"!=typeof fn||!un)throw cn=an=fn=un=null,new r("Invalid WASM module")}((await WebAssembly.instantiate(e)).instance.exports)}(t,n),dn=!0}catch(t){throw function(t){ln=t}(t),t}}(t.wasmURI,t)})});
`;
                if (typeof r == "string" && (r = new TextEncoder().encode(r)), t) {
                    const s = new Blob([
                        r
                    ], {
                        type: n
                    });
                    return URL.createObjectURL(s);
                }
                return "data:" + n + ";base64," + (function(s) {
                    let o = "";
                    const a = s.length;
                    let l = 0;
                    for(; l + 2 < a; l += 3){
                        const f = s[l] << 16 | s[l + 1] << 8 | s[l + 2];
                        o += Ce[f >> 18 & 63] + Ce[f >> 12 & 63] + Ce[f >> 6 & 63] + Ce[63 & f];
                    }
                    const h = a - l;
                    if (h === 1) {
                        const f = s[l] << 16;
                        o += Ce[f >> 18 & 63] + Ce[f >> 12 & 63] + "==";
                    } else if (h === 2) {
                        const f = s[l] << 16 | s[l + 1] << 8;
                        o += Ce[f >> 18 & 63] + Ce[f >> 12 & 63] + Ce[f >> 6 & 63] + "=";
                    }
                    return o;
                })(r);
            }
        });
    function We(e, t) {
        const n = new Uint8Array(e.length + t.length);
        return n.set(e), n.set(t, e.length), n;
    }
    function Cl(e) {
        return e.byteOffset || e.byteLength != e.buffer.byteLength ? new Uint8Array(e) : e;
    }
    function X(e) {
        return new DataView(e.buffer, e.byteOffset, e.byteLength);
    }
    const Er = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ];
    for(let e = 0; e < 256; e++){
        let t = e;
        for(let n = 0; n < 8; n++)t = t & 1 ? t >>> 1 ^ 3988292384 : t >>> 1;
        Er[0][e] = t;
    }
    for(let e = 0; e < 256; e++)for(let t = 1; t < 8; t++){
        const n = Er[t - 1][e];
        Er[t][e] = n >>> 8 ^ Er[0][n & 255];
    }
    const [Na, Cd, Pd, Ld, Fd, vd, Md, Ud] = Er;
    class yr {
        constructor(t){
            this.crc = t || -1;
        }
        append(t) {
            let n = this.crc | 0;
            const r = t.length | 0;
            let s = 0;
            if (r >= 8 && t.buffer) {
                const o = new DataView(t.buffer, t.byteOffset, r), a = r - 8;
                for(; s <= a; s += 8){
                    const l = n ^ o.getInt32(s, !0), h = o.getInt32(s + 4, !0);
                    n = Ud[l & 255] ^ Md[l >>> 8 & 255] ^ vd[l >>> 16 & 255] ^ Fd[l >>> 24 & 255] ^ Ld[h & 255] ^ Pd[h >>> 8 & 255] ^ Cd[h >>> 16 & 255] ^ Na[h >>> 24 & 255];
                }
            }
            for(; s < r; s++)n = n >>> 8 ^ Na[(n ^ t[s]) & 255];
            this.crc = n;
        }
        get() {
            return ~this.crc;
        }
    }
    class Pl extends TransformStream {
        constructor(){
            let t;
            const n = new yr;
            super({
                transform (r, s) {
                    n.append(r), s.enqueue(r);
                },
                flush () {
                    const r = new Uint8Array(4);
                    new DataView(r.buffer).setUint32(0, n.get()), t.value = r;
                }
            }), t = this;
        }
    }
    function oi(e) {
        if (typeof TextEncoder == qe) {
            e = unescape(encodeURIComponent(e));
            const t = new Uint8Array(e.length);
            for(let n = 0; n < t.length; n++)t[n] = e.charCodeAt(n);
            return t;
        } else return new TextEncoder().encode(e);
    }
    const Bt = {
        concat (e, t) {
            if (e.length === 0 || t.length === 0) return e.concat(t);
            const n = e[e.length - 1], r = Bt.getPartial(n);
            return r === 32 ? e.concat(t) : Bt._shiftRight(t, r, n | 0, e.slice(0, e.length - 1));
        },
        bitLength (e) {
            const t = e.length;
            if (t === 0) return 0;
            const n = e[t - 1];
            return (t - 1) * 32 + Bt.getPartial(n);
        },
        clamp (e, t) {
            if (e.length * 32 < t) return e;
            e = e.slice(0, Math.ceil(t / 32));
            const n = e.length;
            return t = t & 31, n > 0 && t && (e[n - 1] = Bt.partial(t, e[n - 1] & 2147483648 >> t - 1, 1)), e;
        },
        partial (e, t, n) {
            return e === 32 ? t : (n ? t | 0 : t << 32 - e) + e * 1099511627776;
        },
        getPartial (e) {
            return Math.round(e / 1099511627776) || 32;
        },
        _shiftRight (e, t, n, r) {
            for(r === void 0 && (r = []); t >= 32; t -= 32)r.push(n), n = 0;
            if (t === 0) return r.concat(e);
            for(let a = 0; a < e.length; a++)r.push(n | e[a] >>> t), n = e[a] << 32 - t;
            const s = e.length ? e[e.length - 1] : 0, o = Bt.getPartial(s);
            return r.push(Bt.partial(t + o & 31, t + o > 32 ? n : r.pop(), 1)), r;
        }
    }, gi = {
        bytes: {
            fromBits (e) {
                const n = Bt.bitLength(e) / 8, r = new Uint8Array(n);
                let s;
                for(let o = 0; o < n; o++)(o & 3) === 0 && (s = e[o / 4]), r[o] = s >>> 24, s <<= 8;
                return r;
            },
            toBits (e) {
                const t = [];
                let n, r = 0;
                for(n = 0; n < e.length; n++)r = r << 8 | e[n], (n & 3) === 3 && (t.push(r), r = 0);
                return n & 3 && t.push(Bt.partial(8 * (n & 3), r)), t;
            }
        }
    }, Ll = {};
    Ll.sha1 = class {
        constructor(e){
            const t = this;
            t.blockSize = 512, t._init = [
                1732584193,
                4023233417,
                2562383102,
                271733878,
                3285377520
            ], t._key = [
                1518500249,
                1859775393,
                2400959708,
                3395469782
            ], e ? (t._h = e._h.slice(0), t._buffer = e._buffer.slice(0), t._length = e._length) : t.reset();
        }
        reset() {
            const e = this;
            return e._h = e._init.slice(0), e._buffer = [], e._length = 0, e;
        }
        update(e) {
            const t = this;
            typeof e == "string" && (e = gi.utf8String.toBits(e));
            const n = t._buffer = Bt.concat(t._buffer, e), r = t._length, s = t._length = r + Bt.bitLength(e);
            if (s > 9007199254740991) throw new Error("Cannot hash more than 2^53 - 1 bits");
            const o = new Uint32Array(n);
            let a = 0;
            for(let l = t.blockSize + r - (t.blockSize + r & t.blockSize - 1); l <= s; l += t.blockSize)t._block(o.subarray(16 * a, 16 * (a + 1))), a += 1;
            return n.splice(0, 16 * a), t;
        }
        finalize() {
            const e = this;
            let t = e._buffer;
            const n = e._h;
            t = Bt.concat(t, [
                Bt.partial(1, 1)
            ]);
            for(let r = t.length + 2; r & 15; r++)t.push(0);
            for(t.push(Math.floor(e._length / 4294967296)), t.push(e._length | 0); t.length;)e._block(t.splice(0, 16));
            return e.reset(), n;
        }
        _f(e, t, n, r) {
            if (e <= 19) return t & n | ~t & r;
            if (e <= 39) return t ^ n ^ r;
            if (e <= 59) return t & n | t & r | n & r;
            if (e <= 79) return t ^ n ^ r;
        }
        _S(e, t) {
            return t << e | t >>> 32 - e;
        }
        _block(e) {
            const t = this, n = t._h, r = Array(80);
            for(let f = 0; f < 16; f++)r[f] = e[f];
            let s = n[0], o = n[1], a = n[2], l = n[3], h = n[4];
            for(let f = 0; f <= 79; f++){
                f >= 16 && (r[f] = t._S(1, r[f - 3] ^ r[f - 8] ^ r[f - 14] ^ r[f - 16]));
                const m = t._S(5, s) + t._f(f, o, a, l) + h + r[f] + t._key[Math.floor(f / 20)] | 0;
                h = l, l = a, a = t._S(30, o), o = s, s = m;
            }
            n[0] = n[0] + s | 0, n[1] = n[1] + o | 0, n[2] = n[2] + a | 0, n[3] = n[3] + l | 0, n[4] = n[4] + h | 0;
        }
    };
    const Fl = {};
    Fl.aes = class {
        constructor(e){
            const t = this;
            t._tables = [
                [
                    [],
                    [],
                    [],
                    [],
                    []
                ],
                [
                    [],
                    [],
                    [],
                    [],
                    []
                ]
            ], t._tables[0][0][0] || t._precompute();
            const n = t._tables[0][4], r = t._tables[1], s = e.length;
            let o, a, l, h = 1;
            if (s !== 4 && s !== 6 && s !== 8) throw new Error("invalid aes key size");
            for(t._key = [
                a = e.slice(0),
                l = []
            ], o = s; o < 4 * s + 28; o++){
                let f = a[o - 1];
                (o % s === 0 || s === 8 && o % s === 4) && (f = n[f >>> 24] << 24 ^ n[f >> 16 & 255] << 16 ^ n[f >> 8 & 255] << 8 ^ n[f & 255], o % s === 0 && (f = f << 8 ^ f >>> 24 ^ h << 24, h = h << 1 ^ (h >> 7) * 283)), a[o] = a[o - s] ^ f;
            }
            for(let f = 0; o; f++, o--){
                const m = a[f & 3 ? o : o - 4];
                o <= 4 || f < 4 ? l[f] = m : l[f] = r[0][n[m >>> 24]] ^ r[1][n[m >> 16 & 255]] ^ r[2][n[m >> 8 & 255]] ^ r[3][n[m & 255]];
            }
        }
        encrypt(e) {
            return this._crypt(e, 0);
        }
        decrypt(e) {
            return this._crypt(e, 1);
        }
        _precompute() {
            const e = this._tables[0], t = this._tables[1], n = e[4], r = t[4], s = [], o = [];
            let a, l, h, f;
            for(let m = 0; m < 256; m++)o[(s[m] = m << 1 ^ (m >> 7) * 283) ^ m] = m;
            for(let m = a = 0; !n[m]; m ^= l || 1, a = o[a] || 1){
                let E = a ^ a << 1 ^ a << 2 ^ a << 3 ^ a << 4;
                E = E >> 8 ^ E & 255 ^ 99, n[m] = E, r[E] = m, f = s[h = s[l = s[m]]];
                let S = f * 16843009 ^ h * 65537 ^ l * 257 ^ m * 16843008, D = s[E] * 257 ^ E * 16843008;
                for(let N = 0; N < 4; N++)e[N][m] = D = D << 24 ^ D >>> 8, t[N][E] = S = S << 24 ^ S >>> 8;
            }
            for(let m = 0; m < 5; m++)e[m] = e[m].slice(0), t[m] = t[m].slice(0);
        }
        _crypt(e, t) {
            if (e.length !== 4) throw new Error("invalid aes block size");
            const n = this._key[t], r = n.length / 4 - 2, s = [
                0,
                0,
                0,
                0
            ], o = this._tables[t], a = o[0], l = o[1], h = o[2], f = o[3], m = o[4];
            let E = e[0] ^ n[0], S = e[t ? 3 : 1] ^ n[1], D = e[2] ^ n[2], N = e[t ? 1 : 3] ^ n[3], R = 4, I, P, F;
            for(let L = 0; L < r; L++)I = a[E >>> 24] ^ l[S >> 16 & 255] ^ h[D >> 8 & 255] ^ f[N & 255] ^ n[R], P = a[S >>> 24] ^ l[D >> 16 & 255] ^ h[N >> 8 & 255] ^ f[E & 255] ^ n[R + 1], F = a[D >>> 24] ^ l[N >> 16 & 255] ^ h[E >> 8 & 255] ^ f[S & 255] ^ n[R + 2], N = a[N >>> 24] ^ l[E >> 16 & 255] ^ h[S >> 8 & 255] ^ f[D & 255] ^ n[R + 3], R += 4, E = I, S = P, D = F;
            for(let L = 0; L < 4; L++)s[t ? 3 & -L : L] = m[E >>> 24] << 24 ^ m[S >> 16 & 255] << 16 ^ m[D >> 8 & 255] << 8 ^ m[N & 255] ^ n[R++], I = E, E = S, S = D, D = N, N = I;
            return s;
        }
    };
    const vl = {};
    vl.ctrGladman = class {
        constructor(e, t){
            this._prf = e, this._initIv = t, this._iv = t;
        }
        reset() {
            this._iv = this._initIv;
        }
        update(e) {
            return this.calculate(this._prf, e, this._iv);
        }
        incWord(e) {
            if ((e >> 24 & 255) === 255) {
                let t = e >> 16 & 255, n = e >> 8 & 255, r = e & 255;
                t === 255 ? (t = 0, n === 255 ? (n = 0, r === 255 ? r = 0 : ++r) : ++n) : ++t, e = 0, e += t << 16, e += n << 8, e += r;
            } else e += 1 << 24;
            return e;
        }
        incCounter(e) {
            (e[0] = this.incWord(e[0])) === 0 && (e[1] = this.incWord(e[1]));
        }
        calculate(e, t, n) {
            let r;
            if (!(r = t.length)) return [];
            const s = Bt.bitLength(t);
            for(let o = 0; o < r; o += 4){
                this.incCounter(n);
                const a = e.encrypt(n);
                t[o] ^= a[0], t[o + 1] ^= a[1], t[o + 2] ^= a[2], t[o + 3] ^= a[3];
            }
            return Bt.clamp(t, s);
        }
    };
    const mn = {
        importKey (e) {
            return new mn.hmacSha1(gi.bytes.toBits(e));
        },
        pbkdf2 (e, t, n, r) {
            if (n = n || 1e4, r < 0 || n < 0) throw new Error("invalid params to pbkdf2");
            const s = (r >> 5) + 1 << 2;
            let o, a, l, h, f;
            const m = new ArrayBuffer(s), E = new DataView(m);
            let S = 0;
            const D = Bt;
            for(t = gi.bytes.toBits(t), f = 1; S < (s || 1); f++){
                for(o = a = e.encrypt(D.concat(t, [
                    f
                ])), l = 1; l < n; l++)for(a = e.encrypt(a), h = 0; h < a.length; h++)o[h] ^= a[h];
                for(l = 0; S < (s || 1) && l < o.length; l++)E.setInt32(S, o[l]), S += 4;
            }
            return m.slice(0, r / 8);
        }
    };
    mn.hmacSha1 = class {
        constructor(e){
            const t = this, n = t._hash = Ll.sha1, r = [
                [],
                []
            ];
            t._baseHash = [
                new n,
                new n
            ];
            const s = t._baseHash[0].blockSize / 32;
            e.length > s && (e = new n().update(e).finalize());
            for(let o = 0; o < s; o++)r[0][o] = e[o] ^ 909522486, r[1][o] = e[o] ^ 1549556828;
            t._baseHash[0].update(r[0]), t._baseHash[1].update(r[1]), t._resultHash = new n(t._baseHash[0]);
        }
        reset() {
            const e = this;
            e._resultHash = new e._hash(e._baseHash[0]), e._updated = !1;
        }
        update(e) {
            const t = this;
            t._updated = !0, t._resultHash.update(e);
        }
        digest() {
            const e = this, t = e._resultHash.finalize(), n = new e._hash(e._baseHash[1]).update(t).finalize();
            return e.reset(), n;
        }
        encrypt(e) {
            if (this._updated) throw new Error("encrypt on already updated hmac called!");
            return this.update(e), this.digest(e);
        }
    };
    const xd = typeof crypto != qe && typeof crypto.getRandomValues == Pt, ho = "Invalid password", Ml = "Invalid authentication code", fo = "zipjs-abort-check-password", kd = "Crypto API not supported";
    function Ul(e) {
        if (xd) return crypto.getRandomValues(e);
        throw new Error(kd);
    }
    const Ln = 16, Bd = "raw", xl = {
        name: "PBKDF2"
    }, Vd = {
        name: "HMAC"
    }, Hd = "SHA-1", Gd = Object.assign({
        hash: Vd
    }, xl), xs = Object.assign({
        iterations: 1e3,
        hash: {
            name: Hd
        }
    }, xl), zd = [
        "deriveBits"
    ], Sr = [
        8,
        12,
        16
    ], ar = [
        16,
        24,
        32
    ], Pe = 10, Xd = [
        0,
        0,
        0,
        0
    ], Xi = typeof crypto != qe, Mr = Xi && crypto.subtle, kl = Xi && typeof Mr != qe, Ae = gi.bytes, Yd = Fl.aes, jd = vl.ctrGladman, Wd = mn.hmacSha1;
    let Da = Xi && kl && typeof Mr.importKey == Pt, ba = Xi && kl && typeof Mr.deriveBits == Pt;
    class Zd extends TransformStream {
        constructor({ password: t, rawPassword: n, encryptionStrength: r, checkPasswordOnly: s, checkAuthenticationCode: o = !0 }){
            super({
                start () {
                    Bl(this, t, n, r);
                },
                async transform (a, l) {
                    const h = this, { password: f, strength: m, resolveReady: E, ready: S } = h;
                    f ? (await qd(h, m, f, $t(a, 0, Sr[m] + 2)), a = $t(a, Sr[m] + 2), s ? l.error(new Error(fo)) : E()) : await S;
                    const D = new Uint8Array(a.length - Pe - (a.length - Pe) % Ln);
                    l.enqueue(Vl(h, a, D, 0, Pe, !0));
                },
                async flush (a) {
                    const { ctr: l, hmac: h, pendingInput: f, ready: m } = this;
                    if (h && l) {
                        await m;
                        const E = $t(f, 0, f.length - Pe), S = $t(f, f.length - Pe);
                        let D = et;
                        if (E.length) {
                            const I = Nr(Ae, E);
                            h.update(I);
                            const P = l.update(I);
                            D = Rr(Ae, P);
                        }
                        const N = $t(Rr(Ae, h.digest()), 0, Pe);
                        let R = f.length < Pe ? 1 : 0;
                        for(let I = 0; I < Pe; I++)R |= N[I] ^ S[I];
                        if (R && o) throw new Error(Ml);
                        a.enqueue(D);
                    }
                }
            });
        }
    }
    class Kd extends TransformStream {
        constructor({ password: t, rawPassword: n, encryptionStrength: r }){
            super({
                start () {
                    Bl(this, t, n, r);
                },
                async transform (s, o) {
                    const a = this, { password: l, strength: h, resolveReady: f, ready: m } = a;
                    let E = et;
                    l ? (E = await Jd(a, h, l), f()) : await m;
                    const S = new Uint8Array(E.length + s.length - s.length % Ln);
                    S.set(E, 0), o.enqueue(Vl(a, s, S, E.length, 0));
                },
                async flush (s) {
                    const { ctr: o, hmac: a, pendingInput: l, ready: h } = this;
                    if (a && o) {
                        await h;
                        let f = et;
                        if (l.length) {
                            const E = o.update(Nr(Ae, l));
                            a.update(E), f = Rr(Ae, E);
                        }
                        const m = Rr(Ae, a.digest()).slice(0, Pe);
                        s.enqueue(We(f, m));
                    }
                }
            });
        }
    }
    function Bl(e, t, n, r) {
        Object.assign(e, {
            ready: new Promise((s)=>e.resolveReady = s),
            password: tp(t, n),
            strength: r - 1,
            pendingInput: et
        });
    }
    function Vl(e, t, n, r, s, o) {
        const { ctr: a, hmac: l, pendingInput: h } = e;
        h.length && (t = We(h, t));
        const f = t.length - s;
        n = ep(n, r + (f - f % Ln));
        let m;
        for(m = 0; m <= f - Ln; m += Ln){
            const E = Nr(Ae, $t(t, m, m + Ln));
            o && l.update(E);
            const S = a.update(E);
            o || l.update(S), n.set(Rr(Ae, S), m + r);
        }
        return e.pendingInput = $t(t, m), n;
    }
    async function qd(e, t, n, r) {
        const s = await Hl(e, t, n, $t(r, 0, Sr[t])), o = $t(r, Sr[t]);
        if (s[0] != o[0] || s[1] != o[1]) throw new Error(ho);
    }
    async function Jd(e, t, n) {
        const r = Ul(new Uint8Array(Sr[t])), s = await Hl(e, t, n, r);
        return We(r, s);
    }
    async function Hl(e, t, n, r) {
        e.password = null;
        const s = await Qd(Bd, n, Gd, !1, zd), o = await $d(Object.assign({
            salt: r
        }, xs), s, 8 * (ar[t] * 2 + 2)), a = new Uint8Array(o), l = Nr(Ae, $t(a, 0, ar[t])), h = Nr(Ae, $t(a, ar[t], ar[t] * 2)), f = $t(a, ar[t] * 2);
        return Object.assign(e, {
            keys: {
                key: l,
                authentication: h,
                passwordVerification: f
            },
            ctr: new jd(new Yd(l), Array.from(Xd)),
            hmac: new Wd(h)
        }), f;
    }
    async function Qd(e, t, n, r, s) {
        if (Da) try {
            return await Mr.importKey(e, t, n, r, s);
        } catch  {
            return Da = !1, mn.importKey(t);
        }
        else return mn.importKey(t);
    }
    async function $d(e, t, n) {
        if (ba) try {
            return await Mr.deriveBits(e, t, n);
        } catch  {
            return ba = !1, mn.pbkdf2(t, e.salt, xs.iterations, n);
        }
        else return mn.pbkdf2(t, e.salt, xs.iterations, n);
    }
    function tp(e, t) {
        return t === O ? oi(e) : t;
    }
    function ep(e, t) {
        if (t && t > e.length) {
            const n = e;
            e = new Uint8Array(t), e.set(n, 0);
        }
        return e;
    }
    function $t(e, t, n) {
        return e.subarray(t, n);
    }
    function Rr(e, t) {
        return e.fromBits(t);
    }
    function Nr(e, t) {
        return e.toBits(t);
    }
    const Un = 12;
    class np extends TransformStream {
        constructor({ password: t, rawPassword: n, passwordVerification: r, checkPasswordOnly: s }){
            super({
                start () {
                    Gl(this, t, n, r);
                },
                transform (o, a) {
                    const l = this;
                    if (l.password || l.rawPassword) {
                        const h = Oa(l, o.subarray(0, Un));
                        if (l.password = l.rawPassword = null, (h[Un - 1] ^ l.passwordVerification) != 0) throw new Error(ho);
                        o = o.subarray(Un);
                    }
                    s ? a.error(new Error(fo)) : a.enqueue(Oa(l, o));
                }
            });
        }
    }
    class rp extends TransformStream {
        constructor({ password: t, rawPassword: n, passwordVerification: r }){
            super({
                start () {
                    Gl(this, t, n, r);
                },
                transform (s, o) {
                    const a = this;
                    let l, h;
                    if (a.password || a.rawPassword) {
                        a.password = a.rawPassword = null;
                        const f = Ul(new Uint8Array(Un));
                        f[Un - 1] = a.passwordVerification, l = new Uint8Array(s.length + f.length), l.set(Ca(a, f), 0), h = Un;
                    } else l = new Uint8Array(s.length), h = 0;
                    l.set(Ca(a, s), h), o.enqueue(l);
                }
            });
        }
    }
    function Gl(e, t, n, r) {
        Object.assign(e, {
            password: t,
            rawPassword: n,
            passwordVerification: r
        }), ip(e, t, n);
    }
    function Oa(e, t) {
        const n = new Uint8Array(t.length);
        for(let r = 0; r < t.length; r++)n[r] = zl(e) ^ t[r], mi(e, n[r]);
        return n;
    }
    function Ca(e, t) {
        const n = new Uint8Array(t.length);
        for(let r = 0; r < t.length; r++)n[r] = zl(e) ^ t[r], mi(e, t[r]);
        return n;
    }
    function ip(e, t, n) {
        const r = [
            305419896,
            591751049,
            878082192
        ];
        if (Object.assign(e, {
            keys: r,
            crcKey0: new yr(r[0]),
            crcKey2: new yr(r[2])
        }), n) for(let s = 0; s < n.length; s++)mi(e, n[s]);
        else for(let s = 0; s < t.length; s++)mi(e, t.charCodeAt(s));
    }
    function mi(e, t) {
        let [, n] = e.keys;
        e.crcKey0.append([
            t
        ]);
        const r = ~e.crcKey0.get();
        n = Pa(Math.imul(Pa(n + Xl(r)), 134775813) + 1), e.crcKey2.append([
            n >>> 24
        ]);
        const s = ~e.crcKey2.get();
        e.keys = [
            r,
            n,
            s
        ];
    }
    function zl(e) {
        const t = e.keys[2] | 2;
        return Xl(Math.imul(t, t ^ 1) >>> 8);
    }
    function Xl(e) {
        return e & 255;
    }
    function Pa(e) {
        return e & 4294967295;
    }
    function Tn(e) {
        if (e instanceof ReadableStream) return e;
        const t = e.getReader();
        return new ReadableStream({
            async pull (n) {
                const { value: r, done: s } = await t.read();
                s ? n.close() : n.enqueue(r);
            },
            cancel (n) {
                return t.cancel(n);
            }
        });
    }
    function Dr(e, t) {
        e = Tn(e);
        const n = {};
        if (sp()) return new Response(e).blob().then((s)=>s);
        const r = [];
        return e.pipeTo(new WritableStream({
            write (s) {
                r.push(s);
            }
        })).then(()=>new Blob(r, n));
    }
    function sp() {
        return typeof Blob.prototype.stream != Pt || new Blob([]).stream() instanceof ReadableStream;
    }
    function op(e) {
        if (e instanceof WritableStream) return e;
        const t = e.getWriter();
        return new WritableStream({
            write (n) {
                return t.write(n);
            },
            close () {
                return t.close();
            },
            abort (n) {
                return t.abort(n);
            }
        });
    }
    const ap = "Invalid codec module", br = "Compression method not supported", cp = new Map, po = new Map;
    function Yl(e) {
        return cp.get(e);
    }
    function jl(e) {
        return po.get(e);
    }
    function lp(e, t) {
        const { CompressionStream: n, DecompressionStream: r } = t;
        if (typeof n != Pt && typeof r != Pt) throw new Error(ap);
        po.set(e, {
            CompressionStream: n,
            DecompressionStream: r
        });
    }
    async function up(e, t) {
        !po.has(e) && t && lp(e, await import(t).then(async (m)=>{
            await m.__tla;
            return m;
        }));
    }
    const Yi = "Invalid uncompressed size", Wl = "Invalid compressed data", Zl = "Invalid CRC32", Kl = "deflate-raw", hp = "deflate64-raw", Ti = "gzip", ql = 10, ks = 8, fp = [
        31,
        139,
        8
    ], dp = 5e3;
    class pp extends TransformStream {
        constructor(t, { chunkSize: n, CompressionStreamFallback: r, CompressionStream: s }){
            super({});
            const { compressed: o, encrypted: a, useCompressionStream: l, zipCrypto: h, computeCrc32: f, level: m, deflate64: E, format: S, compressionMethod: D, inputSize: N } = t, R = this;
            let I, P, F, L = super.readable;
            const v = S && jl(S), M = f && o && !E && !v && (!a || h) && !!(l && s);
            if ((!a || h) && f && !M && (I = new Pl, L = ae(L, I)), o) if (v) L = xn(L, tu(v.CompressionStream, S, {
                level: m,
                chunkSize: n,
                compressionMethod: D,
                uncompressedSize: N
            }));
            else if (M) F = new La, L = xn(L, new s(Ti)), L = ae(L, F);
            else try {
                L = eu(L, l, {
                    level: m,
                    chunkSize: n
                }, s, r);
            } catch (U) {
                let T;
                try {
                    T = new s(Ti);
                } catch  {
                    throw U;
                }
                L = xn(L, T), L = ae(L, new La);
            }
            a && (h ? L = ae(L, new rp(t)) : (P = new Kd(t), L = ae(L, P))), $l(R, L, ()=>{
                (!a || h) && f && (R.crc32 = M ? F.crc32 : new DataView(I.value.buffer).getUint32(0));
            });
        }
    }
    class La extends TransformStream {
        constructor(){
            let t, n = ql, r = new Uint8Array(0);
            super({
                transform (s, o) {
                    if (n) {
                        const f = Math.min(n, s.length);
                        if (n -= f, s = s.subarray(f), !s.length) return;
                    }
                    const a = r.length + s.length;
                    if (a <= ks) {
                        r = We(r, s);
                        return;
                    }
                    const l = a - ks, h = Math.min(l, r.length);
                    o.enqueue(We(r.subarray(0, h), s.subarray(0, l - h))), r = We(r.subarray(h), s.subarray(l - h));
                },
                flush () {
                    const s = X(r);
                    t.crc32 = s.getUint32(0, !0), t.uncompressedSize = s.getUint32(4, !0);
                }
            }), t = this;
        }
    }
    function Ep(e, t, n) {
        const r = new yr;
        let s = 0, o = !1, a, l, h;
        const f = new Promise((N, R)=>{
            l = N, h = R;
        });
        f.catch(()=>{}), n || l();
        const m = new TransformStream({
            start (N) {
                const R = new Uint8Array(ql);
                R.set(fp), N.enqueue(R);
            },
            transform (N, R) {
                R.enqueue(N);
            },
            async flush (N) {
                o = !0, S();
                try {
                    await f;
                } finally{
                    D();
                }
                const R = new Uint8Array(ks), I = X(R);
                I.setUint32(0, r.get(), !0), I.setUint32(4, n, !0), N.enqueue(R);
            },
            cancel (N) {
                h(N);
            }
        }), E = new TransformStream({
            transform (N, R) {
                r.append(N), s += N.length, s >= n ? l() : o && S(), R.enqueue(N);
            },
            cancel (N) {
                h(N);
            }
        });
        return e = ae(e, m), e = xn(e, t), ae(e, E);
        function S() {
            D(), a = setTimeout(()=>h(new Error(Yi)), dp);
        }
        function D() {
            clearTimeout(a);
        }
    }
    class _p extends TransformStream {
        constructor(t, { chunkSize: n, DecompressionStreamFallback: r, DecompressionStream: s }){
            super({});
            const { zipCrypto: o, encrypted: a, checkCrc32: l, crc32: h, compressed: f, useCompressionStream: m, deflate64: E, format: S, compressionMethod: D, rawBitFlag: N, outputSize: R } = t;
            let I, P, F = super.readable;
            if (a && (o ? F = ae(F, new np(t)) : (P = new Zd(t), F = ae(F, P))), f) {
                const L = S && jl(S);
                if (L) F = xn(F, tu(L.DecompressionStream, S, {
                    chunkSize: n,
                    compressionMethod: D,
                    rawBitFlag: N,
                    uncompressedSize: R
                }));
                else try {
                    F = eu(F, m, {
                        chunkSize: n,
                        deflate64: E
                    }, s, r);
                } catch (v) {
                    if (E || R === O) throw v;
                    let M;
                    try {
                        M = new s(Ti);
                    } catch  {
                        throw v;
                    }
                    F = Ep(F, M, R);
                }
                F = wp(F);
            }
            l && (I = new Pl, F = ae(F, I)), $l(this, F, ()=>{
                if (l) {
                    const L = new DataView(I.value.buffer);
                    if (h != L.getUint32(0, !1)) throw new Error(Zl);
                }
            });
        }
    }
    const Fa = new Map;
    function Jl(e, t) {
        if (!e) return !1;
        let n = Fa.get(e);
        n || (n = new Map, Fa.set(e, n));
        let r = n.get(t);
        if (r === O) {
            try {
                new e(t), r = !0;
            } catch  {
                r = !1;
            }
            n.set(t, r);
        }
        return r;
    }
    function Ql(e) {
        return Jl(e, Kl);
    }
    function gp(e) {
        return Jl(e, Ti);
    }
    function $l(e, t, n) {
        t = ae(t, new TransformStream({
            flush: n
        })), Object.defineProperty(e, "readable", {
            get () {
                return t;
            }
        });
    }
    function tu(e, t, n) {
        if (!e) throw new Error(br);
        return new e(t, n);
    }
    function eu(e, t, n, r, s) {
        const o = t && r ? r : s || r, a = n.deflate64 ? hp : Kl;
        let l;
        try {
            l = new o(a, n);
        } catch (h) {
            if (t && s && o != s) l = new s(a, n);
            else throw h;
        }
        return xn(e, l);
    }
    function ae(e, t) {
        return Tn(e).pipeThrough(t);
    }
    function xn(e, t) {
        const n = t.writable.getWriter(), r = e.getReader();
        return s(), t.readable;
        async function s() {
            try {
                for(;;){
                    await n.ready;
                    const o = await r.read();
                    if (o.done) {
                        await n.close();
                        break;
                    }
                    await n.write(o.value);
                }
            } catch (o) {
                await mp(n, o), await Tp(r, o);
            }
        }
    }
    async function mp(e, t) {
        try {
            await e.abort(t);
        } catch  {}
    }
    async function Tp(e, t) {
        try {
            await e.cancel(t);
        } catch  {}
    }
    function wp(e) {
        const t = e.getReader();
        return new ReadableStream({
            async pull (n) {
                let r;
                try {
                    r = await t.read();
                } catch (a) {
                    if (a && a.message) throw a;
                    const l = new Error(Wl);
                    throw l.cause = a, l;
                }
                const { value: s, done: o } = r;
                o ? n.close() : n.enqueue(s);
            },
            cancel (n) {
                return t.cancel(n);
            }
        });
    }
    const Ap = 64 * 1024, Ip = "message", yp = "start", Sp = "pull", va = "data", Rp = "ack", Np = "close", Eo = "deflate", nu = "inflate";
    class Dp extends TransformStream {
        constructor(t, n){
            super({});
            const r = this, { codecType: s } = t;
            let o;
            s.startsWith(Eo) ? o = pp : s.startsWith(nu) && (o = _p), r.outputSize = 0;
            let a = 0;
            const l = new o(t, n), h = super.readable, f = new TransformStream({
                transform (E, S) {
                    E && E.length && (a += E.length, S.enqueue(E));
                },
                flush () {
                    Object.assign(r, {
                        inputSize: a
                    });
                }
            }), m = new TransformStream({
                transform (E, S) {
                    if (E && E.length && (S.enqueue(E), r.outputSize += E.length, t.outputSize !== O && r.outputSize > t.outputSize)) throw new Error(Yi);
                },
                flush () {
                    const { crc32: E } = l;
                    Object.assign(r, {
                        crc32: E,
                        inputSize: a
                    });
                }
            });
            Object.defineProperty(r, "readable", {
                get () {
                    return h.pipeThrough(f).pipeThrough(l).pipeThrough(m);
                }
            });
        }
    }
    class ru extends TransformStream {
        constructor(t){
            const n = [];
            let r = 0;
            (!Number.isFinite(t) || t < 1) && (t = Ap), super({
                transform (a, l) {
                    for(n.push(a), r += a.length; r > t;)l.enqueue(s());
                },
                flush (a) {
                    r && a.enqueue(o(n, r));
                }
            });
            function s() {
                const a = new Uint8Array(t);
                let l = 0;
                for(; l < t;){
                    const h = n[0], f = t - l;
                    h.length <= f ? (a.set(h, l), l += h.length, n.shift()) : (a.set(h.subarray(0, f), l), n[0] = h.subarray(f), l += f);
                }
                return r -= t, a;
            }
            function o(a, l) {
                const h = new Uint8Array(l);
                let f = 0;
                for (const m of a)h.set(m, f), f += m.length;
                return h;
            }
        }
    }
    const _o = "Worker startup timeout";
    let ai, iu, Bs, wi = ()=>{};
    function bp({ initModule: e }) {
        wi = e;
    }
    function Op(e) {
        Bs = e;
    }
    async function Cp(e) {
        const { CompressionStream: t, CompressionStreamFallback: n } = e;
        if (n && !n.requiresModule || Ql(t) || gp(t)) return !0;
        if (n) try {
            return await wi(e), !0;
        } catch  {
            return !1;
        }
        return !1;
    }
    function Ma(e) {
        e.createWorker ? iu = !0 : ai = !1;
    }
    class ci {
        constructor(t, { readable: n, writable: r }, { options: s, config: o, streamOptions: a, useWebWorkers: l, transferStreams: h, workerURI: f, createWorker: m }, E){
            const { signal: S } = a;
            return iu && (m = O), Object.assign(t, {
                busy: !0,
                generation: (t.generation || 0) + 1,
                readable: n.pipeThrough(new ru(uo(o))).pipeThrough(new Pp(a), {
                    signal: S
                }),
                writable: r,
                options: Object.assign({}, s),
                workerURI: f,
                createWorker: m,
                transferStreams: h,
                terminate () {
                    return new Promise((D)=>{
                        const { worker: N, busy: R } = t;
                        N ? (R ? t.resolveTerminated = D : (N.terminate(), D()), t.interface = null) : D();
                    });
                },
                onTaskFinished () {
                    if (t.busy) {
                        const { resolveTerminated: D } = t;
                        D && (t.resolveTerminated = null, t.terminated = !0, t.worker.terminate(), D()), t.busy = !1, E(t);
                    }
                }
            }), ai === O && (ai = typeof Worker != qe), (l && Bs && (ai && f || m) ? Bs : su)(t, o);
        }
    }
    class Pp extends TransformStream {
        constructor({ onstart: t, onprogress: n, size: r, onend: s }){
            let o = 0;
            super({
                async start () {
                    t && await us(t, r);
                },
                async transform (a, l) {
                    o += a.length, n && await us(n, o, r), l.enqueue(a);
                },
                async flush () {
                    s && await us(s, o);
                }
            });
        }
    }
    async function us(e, ...t) {
        try {
            await e(...t);
        } catch  {}
    }
    function su(e, t) {
        return {
            run: ()=>Vs(e, t)
        };
    }
    async function Vs({ options: e, readable: t, writable: n, onTaskFinished: r }, s) {
        let o;
        try {
            if (e.compressed && !e.format) {
                const f = e.codecType.startsWith(Eo), m = f ? s.CompressionStreamFallback : s.DecompressionStreamFallback, E = f ? s.CompressionStream : s.DecompressionStream;
                if (e.useCompressionStream) {
                    if (m && m.requiresModule && !Ql(E)) try {
                        await wi(s);
                    } catch  {}
                } else try {
                    await wi(s);
                } catch  {
                    (!m || m.requiresModule) && (e.useCompressionStream = !0);
                }
            }
            o = new Dp(e, s), await t.pipeThrough(o).pipeThrough(new ru(uo(s))).pipeTo(n, {
                preventClose: !0,
                preventAbort: !0
            });
            const { crc32: a, inputSize: l, outputSize: h } = o;
            return {
                crc32: a,
                inputSize: l,
                outputSize: h
            };
        } catch (a) {
            throw o && (a.outputSize = o.outputSize), a;
        } finally{
            r();
        }
    }
    const Ua = {
        type: "module"
    }, Hs = "error", Lp = "messageerror";
    let xa, hs, ka, Gs = !0;
    try {
        Gs = typeof structuredClone == Pt && structuredClone(new DOMException("", "AbortError")).code !== O;
    } catch  {}
    Op(Fp);
    function Fp(e, t) {
        const { baseURI: n, chunkSize: r, workerStartupTimeout: s } = t;
        let { wasmURI: o } = t;
        if (!e.interface) {
            typeof o == Pt && (o = o());
            let a;
            try {
                a = li(e.workerURI, n, e);
            } catch  {
                return Ma(e), su(e, t);
            }
            Object.assign(e, {
                worker: a,
                workerAlive: !1,
                terminated: !1,
                startupError: null,
                interface: {
                    run: async ()=>{
                        try {
                            return await vp(e, {
                                chunkSize: r,
                                wasmURI: o,
                                baseURI: n,
                                workerStartupTimeout: s
                            });
                        } catch (l) {
                            if (l && l.workerStartupFailed) return Ma(e), Ba(e), Vs(e, t);
                            if (l && l.codecImportFailed) {
                                if (e.reader) return Ba(e), Vs(e, t);
                                e.onTaskFinished();
                            }
                            throw l;
                        }
                    }
                }
            });
        }
        return e.interface;
    }
    async function vp(e, t) {
        if (!e.worker) {
            const { startupError: D } = e;
            e.startupError = null;
            const N = D || new Error(_o);
            throw N.workerStartupFailed = !0, N;
        }
        let n, r;
        const s = new Promise((D, N)=>{
            n = D, r = N;
        });
        Object.assign(e, {
            reader: null,
            writer: null,
            resolveResult: n,
            rejectResult: r,
            result: s
        });
        const { readable: o, options: a } = e, { writable: l, closed: h, abortPipe: f } = Mp(e.writable);
        let m;
        try {
            m = zs({
                type: yp,
                options: a,
                config: t,
                readable: o,
                writable: l
            }, e);
        } catch (D) {
            f();
            try {
                await h;
            } catch  {}
            throw e.onTaskFinished(), D;
        }
        m || Object.assign(e, {
            reader: o.getReader(),
            writer: l.getWriter()
        });
        const { workerStartupTimeout: E } = t;
        !e.workerAlive && Number.isFinite(E) && E >= 0 && (e.startupTimeout = setTimeout(()=>Up(e), E));
        try {
            const D = await s;
            return await S(), await h, D;
        } catch (D) {
            await S(), f();
            try {
                await h;
            } catch  {}
            throw D;
        }
        async function S() {
            if (!m && !l.locked) try {
                await l.getWriter().close();
            } catch  {}
        }
    }
    function Mp(e) {
        const t = new AbortController, { writable: n, readable: r } = new TransformStream, s = r.pipeTo(e, {
            preventClose: !0,
            preventAbort: !0,
            signal: t.signal
        });
        return s.catch(()=>{}), {
            writable: n,
            closed: s,
            abortPipe: ()=>t.abort()
        };
    }
    function Ba(e) {
        const { reader: t } = e;
        t && t.releaseLock(), e.reader = null, e.writer = null;
    }
    function go(e) {
        const { worker: t } = e;
        if (t) try {
            t.terminate();
        } catch  {}
        e.interface = null;
    }
    function li(e, t, n, r, s = !0) {
        const { createWorker: o } = n;
        let a, l, h;
        if (o) a = o();
        else if (hs === O || xa !== e) {
            const f = typeof e == Pt;
            f ? l = e(s) : l = e;
            const m = l.startsWith("data:"), E = l.startsWith("blob:");
            if (m || E) {
                r === O && (r = !1), r && (h = Ua);
                try {
                    a = new Worker(l, h);
                } catch (S) {
                    if (E) try {
                        URL.revokeObjectURL(l);
                    } catch  {}
                    if (f && E) return li(e, t, n, r, !1);
                    if (r) throw S;
                    return li(e, t, n, !0, !1);
                }
            } else {
                r === O && (r = !0), r && (h = Ua);
                try {
                    l = new URL(l, t);
                } catch  {}
                try {
                    a = new Worker(l, h);
                } catch (S) {
                    if (r) return li(e, t, n, !1, s);
                    throw S;
                }
            }
            xa = e, hs = l, ka = h;
        } else a = new Worker(hs, ka);
        return a.addEventListener(Ip, (f)=>{
            n.workerAlive = !0, ou(n), xp(f, n);
        }), a.addEventListener(Hs, (f)=>Va(f, n)), a.addEventListener(Lp, (f)=>Va(f, n)), a;
    }
    function Up(e) {
        if (e.startupTimeout = null, e.workerAlive) return;
        const { rejectResult: t, writer: n } = e;
        if (go(e), e.worker = null, t) {
            const r = new Error(_o);
            r.workerStartupFailed = !0, t(r), n && n.releaseLock();
        }
    }
    function ou(e) {
        const { startupTimeout: t } = e;
        t && (clearTimeout(t), e.startupTimeout = null);
    }
    function Va(e, t) {
        e.preventDefault && e.preventDefault(), ou(t);
        const { workerAlive: n, rejectResult: r, writer: s, onTaskFinished: o } = t;
        go(t), n || (t.worker = null);
        let a = e.error || new Error(e.message || Hs);
        n || (a = Object.assign(new Error(a.message || Hs), {
            workerStartupFailed: !0
        }), t.startupError = a), r && (r(a), s && s.releaseLock(), n && o());
    }
    function zs(e, { worker: t, writer: n, transferStreams: r, workerAlive: s }) {
        try {
            const { value: o, readable: a, writable: l } = e, h = [];
            if (o && (e.value = Cl(o), h.push(e.value.buffer)), r && Gs && s ? (a && h.push(a), l && h.push(l)) : e.readable = e.writable = null, h.length) try {
                return t.postMessage(e, h), !0;
            } catch  {
                Gs = !1, e.readable = e.writable = null, t.postMessage(e);
            }
            else t.postMessage(e);
        } catch (o) {
            throw n && n.releaseLock(), o;
        }
    }
    async function xp({ data: e }, t) {
        const { type: n, value: r, messageId: s, result: o, error: a } = e, { reader: l, writer: h, resolveResult: f, rejectResult: m, onTaskFinished: E, generation: S } = t, D = ()=>t.generation != S;
        try {
            if (a) {
                const { message: R, stack: I, code: P, name: F, outputSize: L, cause: v, codecImportFailed: M } = a, U = new Error(R);
                Object.assign(U, {
                    stack: I,
                    code: P,
                    name: F,
                    outputSize: L
                }), v && (U.cause = Object.assign(new Error(v.message), {
                    name: v.name
                })), M && (U.codecImportFailed = !0), N(U);
            } else {
                if (n == Sp) {
                    const { value: R, done: I } = await l.read();
                    D() || zs({
                        type: va,
                        value: R,
                        done: I,
                        messageId: s
                    }, t);
                }
                n == va && (await h.ready, await h.write(new Uint8Array(r)), D() || zs({
                    type: Rp,
                    messageId: s
                }, t)), n == Np && N(null, o);
            }
        } catch (R) {
            D() || (go(t), N(R));
        }
        function N(R, I) {
            D() || (R ? m(R) : f(I), h && h.releaseLock(), R && R.codecImportFailed || E());
        }
    }
    let un = [];
    const kn = [];
    let Bn, ui, Ha = 0;
    async function au(e, t) {
        const { options: n, config: r } = t, { transferStreams: s, useWebWorkers: o, useCompressionStream: a, compressed: l, checkCrc32: h, computeCrc32: f, encrypted: m, format: E, codecURI: S } = n, { workerURI: D, createWorker: N, maxWorkers: R } = r;
        E && (S && (n.codecURI = kp(S, r.baseURI)), await up(E, n.codecURI)), t.transferStreams = !E && (s || s === O && r.transferStreams);
        const I = !l && !h && !f && !m, P = E === O || !!n.codecURI;
        return t.useWebWorkers = !I && P && (o || o === O && r.useWebWorkers), t.workerURI = t.useWebWorkers && D ? D : O, t.createWorker = t.useWebWorkers && N ? N : O, n.useCompressionStream = a || a === O && r.useCompressionStream, (await F()).run();
        async function F() {
            const v = un.find((M)=>!M.busy);
            if (v) return Ga(v), new ci(v, e, t, L);
            if (un.length < R) {
                const M = {
                    indexWorker: Ha
                };
                return Ha++, un.push(M), new ci(M, e, t, L);
            } else return new Promise((M)=>{
                kn.push({
                    resolve: M,
                    stream: e,
                    workerOptions: t
                }), ui = r.workerStarvationTimeout, Ai();
            });
        }
        function L(v) {
            if (cu(), kn.length) {
                const [{ resolve: M, stream: U, workerOptions: T }] = kn.splice(0, 1);
                M(new ci(v, U, T, L)), Ai();
            } else v.worker ? (Ga(v), Hp(v, t)) : un = un.filter((M)=>M != v);
        }
    }
    function kp(e, t) {
        try {
            return new URL(e, t).toString();
        } catch  {
            return e;
        }
    }
    function Ai() {
        !Bn && kn.length && Number.isFinite(ui) && ui >= 0 && (Bn = setTimeout(Bp, ui));
    }
    function cu() {
        Bn && (clearTimeout(Bn), Bn = null);
    }
    function Bp() {
        if (Bn = null, kn.length) {
            const [{ resolve: e, stream: t, workerOptions: n }] = kn.splice(0, 1), r = Object.assign({}, n, {
                useWebWorkers: !1,
                workerURI: O,
                createWorker: O
            });
            e(new ci({}, t, r, Vp)), Ai();
        }
    }
    function Vp() {
        cu(), Ai();
    }
    function Hp(e, t) {
        const { config: n } = t, { terminateWorkerTimeout: r } = n;
        Number.isFinite(r) && r >= 0 && (e.terminated ? e.terminated = !1 : e.terminateTimeout = setTimeout(async ()=>{
            un = un.filter((s)=>s != e);
            try {
                await e.terminate();
            } catch  {}
        }, r));
    }
    function Ga(e) {
        const { terminateTimeout: t } = e;
        t && (clearTimeout(t), e.terminateTimeout = null);
    }
    const Gp = "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ".split("");
    function zp(e) {
        let t = "";
        for(let n = 0; n < e.length; n++)t += Gp[e[n]];
        return t;
    }
    function hi(e, t) {
        return Xp(e, t, !0);
    }
    function Xp(e, t, n) {
        return t && t.trim().toLowerCase() == "cp437" ? zp(e) : new TextDecoder(t, {
            ignoreBOM: n
        }).decode(e);
    }
    const Yp = "Writer iterator completed too soon", jp = "Writer not initialized", Wp = "text/plain", Zp = 256 * 1024, lu = "writable", za = Symbol();
    class mo {
        constructor(){
            this.size = 0;
        }
        init() {
            this.initialized = !0;
        }
    }
    class To extends mo {
        get readable() {
            return this.createReadable();
        }
        createReadable({ offset: t = 0, size: n, chunkSize: r = uo(vr()) } = {}) {
            const s = this;
            let o = 0;
            return r = Ol(r), new ReadableStream({
                async pull (a) {
                    const l = n === O ? r : Math.min(r, n - o), h = await dt(s, t + o, l);
                    h.length && (a.enqueue(h), o += h.length), (n !== O && o >= n || !h.length && l) && a.close();
                }
            });
        }
    }
    class Kp extends mo {
        constructor(){
            super();
            const t = this, n = new WritableStream({
                write (r) {
                    if (!t.initialized) throw new Error(jp);
                    return t.writeUint8Array(Cl(r));
                }
            });
            Object.defineProperty(t, lu, {
                get () {
                    return n;
                }
            });
        }
        writeUint8Array() {}
    }
    let Xs, uu;
    function qp() {
        uu = (async ()=>{
            try {
                const t = new Blob([
                    new Uint8Array(3)
                ]).slice(1, 2).stream().getReader();
                let n = 0, r = await t.read();
                for(; !r.done;)n += r.value.length, r = await t.read();
                Xs = n == 1;
            } catch  {
                Xs = !1;
            }
        })();
    }
    class wn extends To {
        constructor(t){
            super(), Object.assign(this, {
                sourceBlob: t,
                size: t.size
            }), uu || qp();
        }
        createReadable(t) {
            const n = this, { sourceBlob: r, size: s } = n, { offset: o = 0, size: a = s - o } = t || {};
            if (typeof r.stream == Pt) {
                if (!o && a >= s) return Tn(r.stream());
                if (Xs) return Tn(r.slice(o, o + a).stream());
            }
            return super.createReadable(t);
        }
        async readUint8Array(t, n) {
            const r = this, s = t + n;
            let l = await (!t && s >= r.size ? r.sourceBlob : r.sourceBlob.slice(t, s)).arrayBuffer();
            return l.byteLength > n && (l = l.slice(t, s)), new Uint8Array(l);
        }
    }
    class Jp extends wn {
        constructor(t){
            super(new Blob([
                t
            ], {
                type: Wp
            }));
        }
    }
    class Qp extends Kp {
        constructor(t){
            super(), this.defaultBufferSize = t || Zp;
        }
        init(t = 0) {
            Object.assign(this, {
                offset: 0,
                array: new Uint8Array(t > 0 ? t : this.defaultBufferSize)
            }), super.init();
        }
        writeUint8Array(t) {
            const n = this, r = n.offset + t.length;
            if (r > n.array.length) {
                let s = n.array.length ? n.array.length * 2 : n.defaultBufferSize;
                for(; s < r;)s *= 2;
                const o = n.array;
                n.array = new Uint8Array(s), n.array.set(o);
            }
            n.array.set(t, n.offset), n.offset += t.length;
        }
        getData() {
            return this.offset === this.array.length ? this.array : this.array.slice(0, this.offset);
        }
    }
    class $p extends To {
        constructor(t){
            super(), this.readers = t;
        }
        async init() {
            const t = this;
            t.lastDiskNumber = 0;
            const n = t.readers = await Promise.all(t.readers.map(eE));
            t.diskOffsets = n.map((r)=>{
                const s = t.size;
                return t.size += r.size, s;
            }), super.init();
        }
        getDiskOffset(t) {
            const { diskOffsets: n, size: r } = this, s = n[t];
            return s === O ? r : s;
        }
        async readUint8Array(t, n) {
            const r = this, { readers: s } = this;
            let o, a = 0, l = t;
            for(; s[a] && l >= s[a].size;)l -= s[a].size, a++;
            const h = s[a];
            if (h) {
                const f = h.size;
                if (l + n <= f) o = await dt(h, l, n);
                else {
                    const m = f - l, E = await dt(h, l, m), S = await r.readUint8Array(t + m, n - m);
                    o = We(E, S);
                }
            } else o = et;
            return r.lastDiskNumber = Math.max(a, r.lastDiskNumber), o;
        }
    }
    class tE extends mo {
        constructor(t, n = 4294967295){
            super();
            const r = this;
            Object.assign(r, {
                diskNumber: 0,
                diskOffset: 0,
                size: 0,
                maxSize: n,
                availableSize: n
            });
            let s, o, a;
            const l = new WritableStream({
                async write (E) {
                    if (E === za) {
                        a && await f();
                        return;
                    }
                    const { availableSize: S } = r;
                    if (a) E.length >= S ? (await h(E.subarray(0, S)), await f(), E.length > S && await this.write(E.subarray(S))) : await h(E);
                    else {
                        const { value: D, done: N } = await t.next();
                        if (N && !D) throw new Error(Yp);
                        s = D, s.size = 0, s.maxSize && (r.maxSize = s.maxSize), r.availableSize = r.maxSize, await Vt(s), o = D.writable, a = o.getWriter(), await this.write(E);
                    }
                },
                async close () {
                    a && (await a.ready, await m());
                },
                async abort (E) {
                    a && await a.abort(E);
                }
            });
            Object.defineProperty(r, lu, {
                get () {
                    return l;
                }
            });
            async function h(E) {
                const S = E.length;
                S && (await a.ready, await a.write(E), s.size += S, r.availableSize -= S);
            }
            async function f() {
                await m(), r.diskOffset += s.size, r.diskNumber++, a = null, r.availableSize = r.maxSize;
            }
            async function m() {
                await a.close();
            }
        }
        async closeDisk() {
            const t = this.writable.getWriter();
            try {
                await t.ready, await t.write(za);
            } finally{
                t.releaseLock();
            }
        }
    }
    class Ur {
        constructor(t){
            return Array.isArray(t) && (t = new $p(t)), (t instanceof ReadableStream || typeof t.getReader == Pt) && (t = {
                readable: Tn(t)
            }), t;
        }
    }
    class hu {
        constructor(t){
            return t.writable === O && typeof t.next == Pt && (t = new tE(t)), (t instanceof WritableStream || typeof t.getWriter == Pt) && (t = {
                writable: op(t)
            }), t.size === O && (t.size = 0), t;
        }
    }
    function fu(e) {
        return !!(e && e.getData);
    }
    async function Vt(e, t) {
        if (e.init && !e.initialized) await e.init(t);
        else return Promise.resolve();
    }
    async function eE(e) {
        return e = new Ur(e), await Vt(e), (e.size === O || !e.readUint8Array) && (e = new wn(await Dr(e.readable)), await Vt(e)), e;
    }
    function dt(e, t, n) {
        return e.readUint8Array(t, n);
    }
    function du(e, t) {
        return e.createReadable ? e.createReadable(t) : e.readUint8Array ? To.prototype.createReadable.call(e, t) : e.readable;
    }
    const pu = "filename", Eu = "rawFilename", wo = "comment", _u = "rawComment", Ao = "uncompressedSize", gu = "compressedSize", mu = "offset", Tu = "diskNumberStart", Ii = "lastModDate", yi = "rawLastModDate", Io = "lastAccessDate", wu = "rawLastAccessDate", yo = "creationDate", Au = "rawCreationDate", Iu = "internalFileAttributes", yu = "externalFileAttributes", Su = "msdosAttributesRaw", Ru = "msdosAttributes", Nu = "msDosCompatible", So = "zip64", Du = "encrypted", bu = "version", Ou = "versionMadeBy", Cu = "zipCrypto", Vn = "directory", Pu = "executable", nE = "symlink", Lu = "compressionMethod", Ys = "signature", rE = "crc32", Ro = "extraField", iE = "extraFieldInfoZip", sE = "extraFieldUnix", oE = "extraFieldUnixType1", aE = "extraFieldPkwareUnix", Fu = "uid", vu = "gid", Mu = "unixMode", Uu = "setuid", xu = "setgid", ku = "sticky", cE = "bitFlag", lE = "rawBitFlag", uE = "filenameLength", hE = "extraFieldLength", fE = "unixExternalUpper", dE = "filenameUTF8", pE = "commentUTF8", EE = "rawExtraField", _E = "extraFieldZip64", gE = "extraFieldUnicodePath", mE = "extraFieldUnicodeComment", TE = "extraFieldAES", wE = "extraFieldNTFS", AE = "extraFieldExtendedTimestamp", IE = "extraFieldUSDZ", yE = [
        pu,
        Eu,
        Ao,
        gu,
        Ii,
        yi,
        wo,
        _u,
        Io,
        wu,
        yo,
        Au,
        mu,
        Tu,
        Iu,
        yu,
        Su,
        Ru,
        Nu,
        So,
        Du,
        bu,
        Ou,
        Cu,
        Vn,
        Pu,
        nE,
        Lu,
        Ys,
        rE,
        Ro,
        sE,
        iE,
        oE,
        aE,
        Fu,
        vu,
        Mu,
        fE,
        Uu,
        xu,
        ku,
        cE,
        lE,
        uE,
        hE,
        dE,
        pE,
        EE,
        _E,
        gE,
        mE,
        TE,
        wE,
        AE,
        IE
    ];
    class Si {
        constructor(t){
            yE.forEach((n)=>this[n] = t[n]);
        }
    }
    const hr = "File format is not recognized", Bu = "End of central directory not found", Vu = "End of Zip64 central directory locator not found", Hu = "Central directory header not found", Gu = "Local file header not found", zu = "Zip64 extra field not found", Xu = "File contains encrypted entry", js = "Encryption method not supported", Ws = "Split zip file", Yu = "Overlapping entry found", ju = "Entry data out of bounds", Wu = "Ambiguous archive", Zu = "Encrypted central directory is not supported", Ku = "Unsafe filename", qu = "Invalid strictness (must be 'strict', 'balanced' or 'tolerant')", Ju = "Invalid filenameValidation (must be 'strict', 'balanced' or 'tolerant')", Qu = "Invalid maxAppendedDataSize (must be a number greater than or equal to 0)", $u = "64-bit value exceeds Number.MAX_SAFE_INTEGER", th = "unsorted central directory", eh = "unknown version needed to extract", nh = "compressed patched data", No = "malformed extra field", rh = "unknown zip64 extensible data", Zs = "wrapped entries count", Ks = "appended data", qs = "prepended data", ih = "prepended central directory", sh = "trailing central directory data", oh = "duplicate filename", fr = "mismatched zip64 end of central directory record", ah = "mismatched local file header (general purpose bit flag)", ch = "mismatched local file header (compression method)", lh = "mismatched local file header (crc32 or sizes)", SE = 63, RE = /^[a-zA-Z]:/, Xa = "utf-8", NE = "UTF8", Ya = "cp437", ja = 2057, uh = 1, DE = [
        [
            Ao,
            4294967295
        ],
        [
            gu,
            4294967295
        ],
        [
            mu,
            4294967295
        ],
        [
            Tu,
            65535
        ]
    ], Wa = {
        65535: {
            getValue: Y,
            bytes: 4
        },
        4294967295: {
            getValue: Xt,
            bytes: 8
        }
    }, bE = BigInt(Number.MAX_SAFE_INTEGER), OE = 64, CE = 1032, Za = 0, Do = 1, Ri = 2;
    class bo {
        constructor(t, n = {}){
            Object.assign(this, {
                reader: new Ur(t),
                options: n,
                readRanges: new Map
            });
        }
        async *getEntriesGenerator(t = {}) {
            const n = this;
            let { reader: r } = n;
            if (await Vt(r), (r.size === O || !r.readUint8Array) && (r = new wn(await Dr(r.readable)), await Vt(r)), r.size < 22) throw new Error(hr);
            const s = n.warnings = [], o = Oo(t, n.options), a = o == Sn, l = o != Je, h = Eh(Et(n, t, pl), o), f = jE(Et(n, t, fd), o), m = Et(n, t, dd), { endOfDirectoryInfo: E, endOfDirectoryReachingEndCount: S } = await _h(r, l, h);
            if (!E) throw await HE(r) ? new Error(Ws) : new Error(Bu);
            l && S > 1 && fi("multiple end of central directory records");
            const D = X(E);
            let N = Y(D, 12), R = Y(D, 16);
            const I = E.offset, P = Q(D, 20), F = I + 22 + P, L = r.size - F;
            L > h && fi(Ks), L > 0 && Jt(s, Ks);
            let v = Q(D, 4);
            const M = r.lastDiskNumber || 0;
            let U = Q(D, 6), T = Q(D, 10), p = 0, _, w, A, y, g = 56, H;
            const $ = R == 4294967295 || N == 4294967295 || T == 65535 || U == 65535;
            if (R != 4294967295 && U != 65535 && (R += Fn(r, U)), $) {
                const G = E.offset >= 20 ? await dt(r, E.offset - 20, 20) : et, k = X(G);
                if (G.length == 20 && Y(k, 0) == 117853008) {
                    R = Fn(r, Y(k, 4)) + Xt(k, 8);
                    let ft = await dt(r, R, 56), B = X(ft);
                    const ot = E.offset - 20 - 56;
                    if ((ft.length < 56 || Y(B, 0) != 101075792) && R != ot && ot >= 0) {
                        const mt = R;
                        R = ot, R > mt && (p = R - mt), ft = await dt(r, R, 56), B = X(ft);
                    }
                    if (ft.length < 56 || Y(B, 0) != 101075792) throw new Error(Vu);
                    if (A = !0, y = Xt(B, 4) > 44, y) {
                        const mt = Math.min(Xt(B, 4) - 44, r.size - R - 56);
                        if (mt > 0) {
                            g += mt;
                            const ne = await dt(r, R + 56, mt);
                            H = ME(ne);
                        }
                    }
                    v == 65535 ? v = Y(B, 16) : v != Y(B, 16) && ge(a, s, fr), U == 65535 ? U = Y(B, 20) : U != Y(B, 20) && ge(a, s, fr), T == 65535 ? T = Xt(B, 32) : T != Xt(B, 32) && ge(a, s, fr), N == 4294967295 ? N = Xt(B, 40) : N != Xt(B, 40) && ge(a, s, fr), R = Fn(r, U) + Xt(B, 48) + p;
                }
            }
            let q = N;
            const ut = E.offset - (A ? g + 20 : 0);
            if (R >= r.size && (p = r.size - R - N - 22, R = r.size - N - 22), M != v) throw new Error(Ws);
            if (R < 0) throw new Error(hr);
            let j = 0, V = await dt(r, R, N), z = X(V);
            if (N) {
                if (V.length < 4) throw new Error(hr);
                const G = ut - N;
                if (R != G && U == v) {
                    const k = Y(z, j) == 33639248 || !!(H && H.compressedSize) || fs(z);
                    let ft = !k;
                    if (!ft && G >= 0 && G + 4 <= r.size) {
                        const B = await dt(r, G, 4);
                        ft = Y(X(B), 0) == 33639248;
                    }
                    if (ft) {
                        const B = R;
                        R = G, R > B && (p += R - B, _ = k), V = await dt(r, R, N), z = X(V);
                    }
                }
            }
            const J = ut - R;
            if (N != J && J >= 0 && U == v && (N = J, V = await dt(r, R, N), z = X(V)), R < 0 || R >= r.size) throw new Error(hr);
            n.directoryOffset = R, n.directoryLength = q;
            const St = rc(n, t, pd);
            let Rt, Lt;
            if (St && T && V.length >= 4 && Y(z, 0) != 33639248 && (y || fs(z))) {
                const G = vE(H, q, V.length);
                Lt = V.subarray(G), V = await St(V.subarray(0, G), H), z = X(V), q = V.length, Rt = !0;
            }
            H && !Rt && (V.length < 4 || Y(z, 0) == 33639248) && Jt(s, rh), w = R;
            const Ft = Et(n, t, kf), Ut = Et(n, t, Bf), Nt = new Set;
            let Gt, ee = -1;
            const _t = !a && !A;
            !T && _t && (T = Ka(z, V, j), T && Jt(s, Zs));
            for(let G = 0; G < T; G++){
                const k = new FE(r, n.options);
                if (j + 46 > V.length || Y(z, j) != 33639248) throw G == 0 && !Rt && (y || fs(z)) ? new Error(Zu) : new Error(Hu);
                hh(k, z, j + 6);
                const ft = !!k.bitFlag.languageEncodingFlag, B = j + 46, ot = B + k.filenameLength, mt = ot + k.extraFieldLength, ne = Q(z, j + 4), be = ne >> 8 == 0, Zt = ne >> 8 == 3, kt = V.subarray(B, ot), Tt = Q(z, j + 32), ue = mt + Tt, Oe = V.subarray(mt, ue), Rn = ft, re = ft, $e = Y(z, j + 38), he = $e & 255, ie = {
                    readOnly: !!(he & 1),
                    hidden: !!(he & 2),
                    system: !!(he & 4),
                    directory: !!(he & 16),
                    archive: !!(he & 32)
                }, fe = Y(z, j + 42), Kt = rc(n, t, Vf) || hi, Mt = Rn ? Xa : Ft || Ya, tn = re ? Xa : Ut || Ya;
                let At = Kt(kt, Mt, El);
                if (At === O && (At = hi(kt, Mt)), m) {
                    const Ht = m(At);
                    Ht !== O && (At = Ht);
                }
                if (WE(At, f)) {
                    const Ht = new Error(Ku);
                    throw Ht.filename = At, Ht;
                }
                let xe = Kt(Oe, tn, _l);
                xe === O && (xe = hi(Oe, tn)), Object.assign(k, {
                    index: G,
                    decryptedDirectory: Rt,
                    versionMadeBy: ne,
                    msDosCompatible: be,
                    zip64: !1,
                    compressedSize: 0,
                    uncompressedSize: 0,
                    commentLength: Tt,
                    offset: fe,
                    diskNumberStart: Q(z, j + 34),
                    internalFileAttributes: Q(z, j + 36),
                    externalFileAttributes: $e,
                    msdosAttributesRaw: he,
                    msdosAttributes: ie,
                    rawFilename: kt,
                    filenameUTF8: Rn,
                    commentUTF8: re,
                    rawExtraField: V.subarray(ot, mt),
                    rawComment: Oe,
                    filename: At,
                    comment: xe
                }), fh(k, k, z, j + 6) && Jt(s, No, At), k.offset += p;
                const se = Fn(r, k.diskNumberStart) + k.offset;
                w = Math.min(se, w), se < ee && Jt(s, th, At), ee = se, (k.version & 255) > SE && Jt(s, eh, At), (k.rawBitFlag & 32) == 32 && Jt(s, nh, At), Nt.has(k.filename) && (Gt = !0), Nt.add(k.filename);
                const bt = k.externalFileAttributes >> 16 & 65535;
                k.unixMode === O && (bt & 16877) != 0 && (k.unixMode = bt);
                const Ot = !!(k.unixMode & 2048), Gr = !!(k.unixMode & 1024), en = !!(k.unixMode & 512), zr = ((k.unixMode === O ? bt : k.unixMode) & 61440) == 40960, Ki = !zr && (k.unixMode !== O ? (k.unixMode & 73) != 0 : Zt && (bt & 73) != 0), ke = k.unixMode !== O && (k.unixMode & 61440) == 16384, qi = (bt & 61440) == 16384;
                Object.assign(k, {
                    setuid: Ot,
                    setgid: Gr,
                    sticky: en,
                    symlink: zr,
                    unixExternalUpper: bt,
                    executable: Ki,
                    directory: ke || qi || be && ie.directory || k.filename.endsWith("/"),
                    zipCrypto: k.encrypted && !k.extraFieldAES
                });
                const nn = new Si(k);
                if (nn.getData = (Ht, rn)=>k.getData(Ht, nn, n.readRanges, rn), nn.arrayBuffer = async (Ht)=>{
                    const rn = new TransformStream, bn = Dr(rn.readable).then((sn)=>sn.arrayBuffer());
                    return bn.catch(()=>{}), await k.getData(rn, nn, n.readRanges, Ht), bn;
                }, j = ue, G == T - 1 && _t) {
                    const Ht = Ka(z, V, j);
                    Ht && (T += Ht, Jt(s, Zs));
                }
                const { onprogress: Dn } = t;
                if (Dn) try {
                    await Dn(G + 1, T, new Si(k));
                } catch  {}
                yield nn;
            }
            let xt = j, Dt = ds(V.subarray(j)) || (Rt ? ds(Lt) : O);
            if (!Dt && !Rt) {
                const G = R + j, k = Math.min(ut - G, 65541);
                k >= 6 && (Dt = ds(await dt(r, G, k)));
            }
            Dt && (n.digitalSignature = Dt, xt = j + 6 + Dt.length), (j != q && xt != q || !Rt && j != N && xt != N) && ge(a, s, sh), Gt && ge(a, s, oh);
            const at = Et(n, t, Hf), ht = Et(n, t, Gf), vt = (a || at) && T && w == 4 && await GE(r) ? 4 : 0;
            return a && (p || T && w > vt) && fi(qs), (p || T && w > 4) && Jt(s, qs), _ && Jt(s, ih), at && (n.prependedData = w > vt ? await dt(r, vt, w - vt) : et), n.comment = P ? await dt(r, I + 22, P) : et, ht && (n.appendedData = F < r.size ? await dt(r, F, r.size - F) : et), !0;
        }
        async getEntries(t = {}) {
            const n = [];
            for await (const r of this.getEntriesGenerator(t))n.push(r);
            return n;
        }
        async close() {
            const { reader: t } = this;
            !t.readUint8Array && t.readable && !t.readable.locked && await t.readable.cancel();
        }
    }
    class PE {
        constructor(t = {}){
            const { readable: n, writable: r } = new TransformStream, s = new bo(n, t).getEntriesGenerator();
            this.readable = new ReadableStream({
                async pull (o) {
                    const { done: a, value: l } = await s.next();
                    if (a) return o.close();
                    const h = (function() {
                        const { readable: m, writable: E } = new TransformStream;
                        if (l.getData) return S(), m;
                        async function S() {
                            try {
                                await l.getData(E);
                            } catch (D) {
                                try {
                                    await E.abort(D);
                                } catch  {}
                            }
                        }
                    })(), f = {
                        ...l,
                        readable: h
                    };
                    delete f.getData, o.enqueue(f);
                }
            }), this.writable = r;
        }
    }
    async function LE(e, t = {}) {
        if (e = new Ur(e), await Vt(e), (e.size === O || !e.readUint8Array) && (e = new wn(await Dr(e.readable)), await Vt(e)), e.size < 22) return !1;
        const n = Oo(t, {}), r = n != Je, s = Eh(t[pl], n), { endOfDirectoryInfo: o, endOfDirectoryReachingEndCount: a } = await _h(e, r, s);
        if (!o || n == Sn && a > 1) return !1;
        const l = Q(X(o), 20), h = o.offset + 22 + l;
        return e.size - h <= s;
    }
    class FE {
        constructor(t, n){
            Object.assign(this, {
                reader: t,
                options: n
            });
        }
        async getData(t, n, r, s = {}) {
            const o = this, a = vr(), { reader: l, index: h, offset: f, diskNumberStart: m, extraFieldAES: E, extraFieldZip64: S, compressionMethod: D, bitFlag: N, rawBitFlag: R, crc32: I, rawLastModDate: P, uncompressedSize: F, compressedSize: L } = o, { dataDescriptor: v } = N, M = n.localDirectory = {}, U = n.warnings = [], T = Fn(l, m) + f, p = await dt(l, T, 30), _ = X(p);
            let w = Et(o, s, sl), A = Et(o, s, ol);
            const y = Et(o, s, al);
            if (Tl(w, A), w = w && w.length && w, A = A && A.length && A, E && E.originalCompressionMethod != 99) throw new Error(br);
            if (p.length < 30 || Y(_, 0) != 67324752) throw new Error(Gu);
            hh(M, _, 4);
            const { extraFieldLength: g, filenameLength: H } = M, $ = M.dataOffset = T + 30 + H + g, q = Et(o, s, Wf), ut = Oo(s, o.options), j = XE(q, ut), V = YE(q, ut);
            let z = et;
            if (V && (H || g)) {
                const Tt = await dt(l, T + 30, H + g);
                z = Tt.subarray(0, H), M.rawExtraField = Tt.subarray(H);
            } else M.rawExtraField = g ? await dt(l, T + 30 + H, g) : et;
            V && (M.rawFilename = z), fh(o, M, _, 4, !0) && Jt(U, No), KE(o, M, z, V, j ? O : U);
            const { lastAccessDate: J, creationDate: St, uid: Rt, gid: Lt } = M;
            J && (n.lastAccessDate = J), St && (n.creationDate = St), Rt !== O && n.uid === O && (n.uid = Rt), Lt !== O && n.gid === O && (n.gid = Lt);
            const Ft = o.encrypted && M.encrypted && !y, Ut = Ft && !E;
            if (y || (n.zipCrypto = Ut), Ft && (M.rawBitFlag & 64) == 64) throw new Error(js);
            const Nt = y ? O : Yl(D);
            if (D != 0 && D != 8 && D != 9 && !Nt && !y) throw new Error(br);
            if (Ft) {
                if (!Ut && (E.strength < 1 || E.strength > 3)) throw new Error(js);
                if (!w && !A) throw new Error(Xu);
            }
            if ($ + L > l.size) throw new Error(ju);
            const Gt = L, ee = Tn(l.createReadable({
                offset: $,
                size: Gt
            })), _t = gl(Et(o, s, cl));
            ml(_t);
            const xt = Et(o, s, zf);
            let Dt = Et(o, s, Yf);
            const at = Et(o, s, Xf);
            at && (Dt = !0);
            const { onstart: ht, onprogress: vt, onend: G } = s, k = D != 0 && !y, ft = y ? L : F, B = D == 9;
            let ot = Et(o, s, ul);
            B && (ot = !1);
            const mt = Et(o, s, Kf), ne = (mt === O ? Et(o, s, Zf) : mt) && !y && (!Ft || Ut || E && E.vendorVersion == uh), be = {
                options: {
                    codecType: nu,
                    password: w,
                    rawPassword: A,
                    zipCrypto: Ut,
                    encryptionStrength: E && E.strength,
                    checkCrc32: ne,
                    checkAuthenticationCode: Et(o, s, qf),
                    passwordVerification: Ut && (v ? P >>> 8 & 255 : I >>> 24 & 255),
                    outputSize: ft,
                    crc32: I,
                    compressed: k,
                    encrypted: Ft,
                    useWebWorkers: Et(o, s, ll),
                    useCompressionStream: ot,
                    transferStreams: Et(o, s, hl),
                    deflate64: B,
                    format: Nt ? Nt.format : O,
                    codecURI: Nt ? Nt.codecURI : O,
                    compressionMethod: D,
                    rawBitFlag: R,
                    checkPasswordOnly: xt
                },
                config: a,
                streamOptions: {
                    signal: _t,
                    size: Gt,
                    onstart: ht,
                    onprogress: vt,
                    onend: G
                }
            };
            Dt && await VE({
                reader: l,
                fileEntry: n,
                index: h,
                offset: T,
                crc32: I,
                compressedSize: L,
                uncompressedSize: F,
                dataOffset: $,
                dataDescriptor: v || M.bitFlag.dataDescriptor,
                extraFieldZip64: S || M.extraFieldZip64,
                readRanges: r
            });
            let Zt, kt;
            try {
                if (!at) {
                    xt && (t = new WritableStream), t = new hu(t), await Vt(t, zE(ft, L, k)), { writable: Zt } = t;
                    const { outputSize: Tt } = await au({
                        readable: ee,
                        writable: Zt
                    }, be);
                    if (t.size += Tt, Tt != ft) throw new Error(Yi);
                }
            } catch (Tt) {
                if (Tt.outputSize !== O && (t.size += Tt.outputSize), !xt || Tt.message != fo) throw kt = Tt, Tt;
            } finally{
                if (!(!fu(t) && Et(o, s, fl)) && Zt && !Zt.locked) {
                    const ue = Zt.getWriter();
                    if (kt) try {
                        await ue.abort(kt);
                    } catch  {}
                    else await ue.close();
                }
            }
            return xt || at ? O : t.getData ? t.getData() : Zt;
        }
    }
    function fs(e) {
        const t = Math.min(e.byteLength, 1024) - 3;
        for(let n = 0; n < t; n++)if (Y(e, n) == 134630224) return !0;
        return !1;
    }
    function Ka(e, t, n) {
        let r = 0;
        for(; n + 46 <= t.length && Y(e, n) == 33639248;)n += 46 + Q(e, n + 28) + Q(e, n + 30) + Q(e, n + 32), r++;
        return r % 65536 ? 0 : r;
    }
    function ds(e) {
        if (e.length >= 6) {
            const t = X(e);
            if (Y(t, 0) == 84233040) {
                const n = Q(t, 4);
                if (6 + n <= e.length) return e.subarray(6, 6 + n);
            }
        }
    }
    function vE(e, t, n) {
        const r = e && e.compressedSize ? e.compressedSize : t;
        return r > 0 && r <= n ? r : n;
    }
    function ME(e) {
        const t = {
            rawExtensibleData: e
        };
        if (e.length >= 28) {
            const n = X(e), r = Q(n, 26);
            Object.assign(t, {
                compressionMethod: Q(n, 0),
                compressedSize: Xt(n, 2),
                uncompressedSize: Xt(n, 10),
                encryptionAlgorithm: Q(n, 18),
                bitLength: Q(n, 20),
                flags: Q(n, 22),
                hashAlgorithm: Q(n, 24),
                hashData: e.subarray(28, 28 + r)
            });
        }
        return t;
    }
    function hh(e, t, n) {
        const r = e.rawBitFlag = Q(t, n + 2), s = (r & 1) == 1, o = Y(t, n + 6);
        Object.assign(e, {
            encrypted: s,
            version: Q(t, n),
            bitFlag: {
                level: (r & 6) >> 1,
                dataDescriptor: (r & 8) == 8,
                languageEncodingFlag: (r & 2048) == 2048
            },
            rawLastModDate: o,
            lastModDate: qE(o),
            filenameLength: Q(t, n + 22),
            extraFieldLength: Q(t, n + 24)
        });
    }
    function fh(e, t, n, r, s) {
        const { rawExtraField: o } = t, a = t.extraField = new Map, l = X(o);
        let h = 0, f = !1;
        try {
            for(; h < o.length;){
                const U = Q(l, h), T = Q(l, h + 2);
                a.set(U, {
                    type: U,
                    data: o.slice(h + 4, h + 4 + T)
                }), h += 4 + T;
            }
        } catch  {
            f = !0;
        }
        h > o.length && (f = !0);
        const m = Q(n, r + 4);
        Object.assign(t, {
            signature: Y(n, r + 10),
            crc32: Y(n, r + 10),
            compressedSize: Y(n, r + 14),
            uncompressedSize: Y(n, r + 18)
        });
        const E = a.get(1);
        E && (UE(E, t), t.extraFieldZip64 = E);
        const S = a.get(28789);
        S && (qa(S, pu, Eu, t, e), t.extraFieldUnicodePath = S);
        const D = a.get(25461);
        D && (qa(D, wo, _u, t, e), t.extraFieldUnicodeComment = D);
        const N = a.get(39169);
        N && N.data.length >= 7 ? (xE(N, t, m), t.extraFieldAES = N) : t.compressionMethod = m;
        const R = a.get(13);
        R && (Ja(R, t), t.extraFieldPkwareUnix = R);
        const I = a.get(22613);
        I && (Ja(I, t), t.extraFieldUnixType1 = I);
        const P = a.get(10);
        P && (kE(P, t), t.extraFieldNTFS = P);
        const F = a.get(30805);
        let L;
        if (F && (L = Qa(F, t, !1), t.extraFieldUnix = F), !L) {
            const U = a.get(30837);
            U && (Qa(U, t, !0), t.extraFieldInfoZip = U);
        }
        const v = a.get(21589);
        v && (BE(v, t, s), t.extraFieldExtendedTimestamp = v);
        const M = a.get(6534);
        return M && (t.extraFieldUSDZ = M), f;
    }
    function UE(e, t) {
        t.zip64 = !0;
        const n = X(e.data), r = DE.filter(([o, a])=>t[o] == a), s = r.reduce((o, [, a])=>o + Wa[a].bytes, 0);
        if (e.data.length < s) throw new Error(zu);
        for(let o = 0, a = 0; o < r.length; o++){
            const [l, h] = r[o], f = Wa[h];
            t[l] = e[l] = f.getValue(n, a), a += f.bytes;
        }
    }
    function qa(e, t, n, r, s) {
        if (e.data.length < 5) {
            e.valid = !1;
            return;
        }
        const o = X(e.data), a = new yr;
        a.append(s[n]);
        const l = X(new Uint8Array(4));
        l.setUint32(0, a.get(), !0);
        const h = Y(o, 1), f = Ze(o, 0);
        Object.assign(e, {
            version: f,
            [t]: hi(e.data.subarray(5)),
            valid: f == 1 && !s.bitFlag.languageEncodingFlag && h == Y(l, 0)
        }), e.valid && (r[t] = e[t], r[t + NE] = !0);
    }
    function xE(e, t, n) {
        const r = X(e.data), s = Ze(r, 4);
        Object.assign(e, {
            vendorVersion: Ze(r, 0),
            vendorId: Ze(r, 2),
            strength: s,
            originalCompressionMethod: n,
            compressionMethod: Q(r, 5)
        }), t.compressionMethod = e.compressionMethod, e.vendorVersion != uh && (t.crc32 = O);
    }
    function kE(e, t) {
        const n = X(e.data);
        let r = 4, s;
        try {
            for(; r < e.data.length && !s;){
                const o = Q(n, r), a = Q(n, r + 2);
                o == 1 && (s = e.data.slice(r + 4, r + 4 + a)), r += 4 + a;
            }
        } catch  {}
        if (s && s.length == 24) {
            const o = X(s), a = o.getBigUint64(0, !0), l = o.getBigUint64(8, !0), h = o.getBigUint64(16, !0);
            Object.assign(e, {
                rawLastModDate: a,
                rawLastAccessDate: l,
                rawCreationDate: h
            });
            const f = ps(a), m = ps(l), E = ps(h), S = {
                lastModDate: f,
                lastAccessDate: m,
                creationDate: E
            };
            Object.assign(e, S), Object.assign(t, S, {
                rawLastAccessDate: l,
                rawCreationDate: h
            });
        }
    }
    function Ja(e, t) {
        if (e.data.length < 8) return;
        const n = X(e.data), r = new Date((Y(n, 0) | 0) * 1e3), s = new Date((Y(n, 4) | 0) * 1e3), o = {
            lastAccessDate: r,
            lastModDate: s
        };
        e.data.length >= 12 && (o.uid = Q(n, 8), o.gid = Q(n, 10)), Object.assign(e, o), Object.assign(t, o);
    }
    function Qa(e, t, n) {
        try {
            const r = X(e.data);
            let s, o;
            if (n) {
                let a = 0;
                const l = Ze(r, a++), h = Ze(r, a++);
                s = $a(e.data.subarray(a, a + h)), a += h;
                const f = Ze(r, a++);
                o = $a(e.data.subarray(a, a + f)), Object.assign(e, {
                    version: l,
                    uid: s,
                    gid: o
                });
            } else e.data.length >= 4 && (s = Q(r, 0), o = Q(r, 2), Object.assign(e, {
                uid: s,
                gid: o
            }));
            return s !== O && (t.uid = s), o !== O && (t.gid = o), s !== O || o !== O;
        } catch  {}
    }
    function $a(e) {
        const t = new Uint8Array(4);
        return t.set(e, 0), new DataView(t.buffer, t.byteOffset, 4).getUint32(0, !0);
    }
    function BE(e, t, n) {
        if (!e.data.length) return;
        const r = X(e.data), s = Ze(r, 0), o = [], a = [];
        n ? ((s & 1) == 1 && (o.push(Ii), a.push(yi)), (s & 2) == 2 && (o.push(Io), a.push(wu)), (s & 4) == 4 && (o.push(yo), a.push(Au))) : e.data.length >= 5 && (o.push(Ii), a.push(yi));
        let l = 1;
        o.forEach((h, f)=>{
            if (e.data.length >= l + 4) {
                const m = Y(r, l);
                t[h] = e[h] = new Date((m | 0) * 1e3);
                const E = a[f];
                e[E] = m;
            }
            l += 4;
        });
    }
    async function VE({ reader: e, fileEntry: t, index: n, offset: r, crc32: s, compressedSize: o, uncompressedSize: a, dataOffset: l, dataDescriptor: h, extraFieldZip64: f, readRanges: m }) {
        let E = 0;
        if (h && (f ? E = 20 : E = 12), E) {
            const D = await dt(e, l + o, E + 4), N = X(D);
            let R = D.length == E + 4 && Y(N, 0) == 134695760;
            if (R) {
                const I = tc(N, 4, f);
                (t.encrypted && !t.zipCrypto || I.crc32 == s) && I.compressedSize == o && I.uncompressedSize == a ? E += 4 : R = !1;
            }
            if (D.length >= E) {
                const I = tc(N, R ? 4 : 0, f);
                I.signature = R, t.localDirectory.dataDescriptor = I;
            }
        }
        const S = {
            start: r,
            end: l + o + E,
            fileEntry: t
        };
        for (const [D, N] of m)if (D != n && S.start < N.end && N.start < S.end) {
            const R = new Error(Yu);
            throw R.overlappingEntry = N.fileEntry, R;
        }
        m.set(n, S);
    }
    function tc(e, t, n) {
        const r = Y(e, t);
        let s, o;
        return n ? (s = Xt(e, t + 4), o = Xt(e, t + 12)) : (s = Y(e, t + 4), o = Y(e, t + 8)), {
            crc32: r,
            compressedSize: s,
            uncompressedSize: o
        };
    }
    function Fn(e, t) {
        return e.getDiskOffset ? e.getDiskOffset(t) : 0;
    }
    async function HE(e) {
        return await dh(e) == 134695760;
    }
    async function GE(e) {
        const t = await dh(e);
        return t == 134695760 || t == 808471376;
    }
    async function dh(e) {
        const t = await dt(e, 0, 4);
        return Y(X(t));
    }
    function ph(e) {
        return e === Sn || e === co || e === Je;
    }
    function zE(e, t, n) {
        return Math.min(e, n ? t * CE : t);
    }
    function Oo(e, t) {
        return ec(e, ec(t, co));
    }
    function ec(e, t) {
        const n = e[hd];
        if (n !== O) {
            if (!ph(n)) throw new Error(qu);
            return n;
        }
        const r = e[jf];
        return r === O ? t : r ? Sn : t == Je ? Je : co;
    }
    function XE(e, t) {
        return e === O ? t != Je : !!e;
    }
    function YE(e, t) {
        return e === O ? t == Sn : !!e;
    }
    function jE(e, t) {
        if (e === O) return t;
        if (!ph(e)) throw new Error(Ju);
        return e;
    }
    function WE(e, t) {
        if (t == Je) return !1;
        const n = e.split("/");
        return n.length > 1 && n[n.length - 1] === "" && n.pop(), n.includes("..") || e.startsWith("/") || e.startsWith("\\\\") || RE.test(e) ? !0 : t == Sn && (n.includes(".") || n.includes(""));
    }
    function Eh(e, t) {
        if (e !== O) {
            const n = Gi(e);
            if (typeof n != Uf || Number.isNaN(n) || n < 0) throw new Error(Qu);
            return n;
        }
        return t == Sn ? 0 : t == Je ? 1 / 0 : 65535;
    }
    async function _h(e, t, n) {
        const { size: r } = e, s = Math.min(r, 65557), o = {
            count: OE
        };
        let a, l, h = 0;
        for await (const [f, m, E, S, D] of gh(e, s)){
            const N = Q(f, S + 20);
            if (D + 22 + N == r) {
                const R = await mh(e, f, m, S, D, r, o);
                if (R == Ri) {
                    if (a || (a = Js(E, S, D)), h++, !t || h > 1) break;
                } else R == Do && !l && (l = Js(E, S, D));
            }
        }
        return a || (a = l), a || (a = await ZE(e, n, o)), {
            endOfDirectoryInfo: a,
            endOfDirectoryReachingEndCount: h
        };
    }
    async function ZE(e, t, n) {
        const { size: r } = e, s = Math.min(r, t == 1 / 0 ? r : 65557 + t);
        let o, a;
        for await (const [l, h, f, m, E] of gh(e, s)){
            const S = Js(f, m, E);
            o || (o = S);
            const D = await mh(e, l, h, m, E, r, n);
            if (D == Ri) return S;
            D == Do && !a && (a = S);
        }
        return a || o;
    }
    async function* gh(e, t) {
        const n = e.size - t, r = await dt(e, n, t), s = X(r);
        for(let o = r.length - 22; o >= 0; o--)Y(s, o) == 101010256 && (yield [
            s,
            n,
            r,
            o,
            n + o
        ]);
    }
    function Js(e, t, n) {
        return {
            offset: n,
            buffer: e.slice(t, t + 22).buffer
        };
    }
    async function mh(e, t, n, r, s, o, a) {
        const l = Q(t, r + 10), h = Y(t, r + 12), f = Y(t, r + 16);
        if (l == 65535 || h == 4294967295 || f == 4294967295) return await nc(e, t, n, s - 20, o, a) == 117853008 ? Ri : Za;
        if (!l && !h) return Do;
        const m = Q(t, r + 6);
        for (const E of [
            s - h,
            Fn(e, m) + f
        ])if (await nc(e, t, n, E, o, a) == 33639248) return Ri;
        return Za;
    }
    async function nc(e, t, n, r, s, o) {
        if (r < 0 || r + 4 > s) return O;
        if (r >= n) return Y(t, r - n);
        if (o.count > 0) {
            o.count--;
            const a = await dt(e, r, 4);
            return Y(X(a), 0);
        }
        return O;
    }
    function KE(e, t, n, r, s) {
        const { rawFilename: o } = e, a = !s, l = e.decryptedDirectory && (t.rawBitFlag & 8192) == 8192;
        r && !l && (n.length != o.length || n.some((h, f)=>h != o[f])) && ge(a, s, "mismatched local file header (filename)"), (t.rawBitFlag & ja) != (e.rawBitFlag & ja) && ge(a, s, ah), t.compressionMethod != e.compressionMethod && ge(a, s, ch), !t.bitFlag.dataDescriptor && !l && (t.crc32 || t.compressedSize || t.uncompressedSize) && (t.crc32 != e.crc32 || t.compressedSize != e.compressedSize || t.uncompressedSize != e.uncompressedSize) && ge(a, s, lh);
    }
    function ge(e, t, n) {
        e ? fi(n) : Jt(t, n);
    }
    function Jt(e, t, n) {
        if (!e.some((r)=>r.reason == t)) {
            const r = {
                reason: t
            };
            n !== O && (r.filename = n), e.push(r);
        }
    }
    function fi(e) {
        const t = new Error(Wu);
        throw t.reason = e, t;
    }
    function Et(e, t, n) {
        return t[n] === O ? e.options[n] : t[n];
    }
    function rc(e, t, n) {
        return lo(Et(e, t, n));
    }
    function qE(e) {
        const t = (e & 4294901760) >> 16, n = e & 65535, r = new Date(1980 + ((t & 65024) >> 9), ((t & 480) >> 5) - 1, t & 31, (n & 63488) >> 11, (n & 2016) >> 5, (n & 31) * 2, 0);
        return r < _i ? _i : r;
    }
    function ps(e) {
        return new Date(Number(e / BigInt(1e4) - BigInt(116444736e5)));
    }
    function Ze(e, t) {
        return e.getUint8(t);
    }
    function Q(e, t) {
        return e.getUint16(t, !0);
    }
    function Y(e, t) {
        return e.getUint32(t, !0);
    }
    function Xt(e, t) {
        const n = e.getBigUint64(t, !0);
        if (n > bE) throw new Error($u);
        return Number(n);
    }
    var JE = Object.freeze({
        __proto__: null,
        ERR_AMBIGUOUS_ARCHIVE: Wu,
        ERR_BAD_FORMAT: hr,
        ERR_CENTRAL_DIRECTORY_NOT_FOUND: Hu,
        ERR_ENCRYPTED: Xu,
        ERR_ENCRYPTED_CENTRAL_DIRECTORY: Zu,
        ERR_ENTRY_DATA_OUT_OF_BOUNDS: ju,
        ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND: Vu,
        ERR_EOCDR_NOT_FOUND: Bu,
        ERR_EXTRAFIELD_ZIP64_NOT_FOUND: zu,
        ERR_INVALID_AUTHENTICATION_CODE: Ml,
        ERR_INVALID_COMPRESSED_DATA: Wl,
        ERR_INVALID_CRC32: Zl,
        ERR_INVALID_FILENAME_VALIDATION: Ju,
        ERR_INVALID_MAX_APPENDED_DATA_SIZE: Qu,
        ERR_INVALID_PASSWORD: ho,
        ERR_INVALID_STRICTNESS: qu,
        ERR_INVALID_UNCOMPRESSED_SIZE: Yi,
        ERR_LOCAL_FILE_HEADER_NOT_FOUND: Gu,
        ERR_OVERLAPPING_ENTRY: Yu,
        ERR_SPLIT_ZIP_FILE: Ws,
        ERR_UNSAFE_FILENAME: Ku,
        ERR_UNSUPPORTED_COMPRESSION: br,
        ERR_UNSUPPORTED_ENCRYPTION: js,
        ERR_UNSUPPORTED_UINT64: $u,
        ERR_WORKER_STARTUP_TIMEOUT: _o,
        WARNING_APPENDED_DATA: Ks,
        WARNING_COMPRESSED_PATCHED_DATA: nh,
        WARNING_DUPLICATE_FILENAME: oh,
        WARNING_MALFORMED_EXTRA_FIELD: No,
        WARNING_MISMATCHED_LOCAL_FILE_HEADER_BIT_FLAG: ah,
        WARNING_MISMATCHED_LOCAL_FILE_HEADER_COMPRESSION_METHOD: ch,
        WARNING_MISMATCHED_LOCAL_FILE_HEADER_CRC32_OR_SIZES: lh,
        WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY: fr,
        WARNING_PREPENDED_CENTRAL_DIRECTORY: ih,
        WARNING_PREPENDED_DATA: qs,
        WARNING_TRAILING_CENTRAL_DIRECTORY_DATA: sh,
        WARNING_UNKNOWN_VERSION: eh,
        WARNING_UNKNOWN_ZIP64_EXTENSIBLE_DATA: rh,
        WARNING_UNSORTED_CENTRAL_DIRECTORY: th,
        WARNING_WRAPPED_ENTRIES_COUNT: Zs,
        ZipReader: bo,
        ZipReaderStream: PE,
        isZipFile: LE
    });
    const Th = "File already exists", wh = "Zip file comment exceeds 64KB", QE = "Invalid zip file comment (must be a Uint8Array)", $E = "File entry comment exceeds 64KB", t_ = "Invalid file entry comment (must be a string)", e_ = "Invalid date (must be a valid Date instance)", n_ = "File entry name exceeds 64KB", Ah = "Version exceeds 65535", r_ = "The strength must equal 1, 2, or 3", i_ = "Encryption is not supported in USDZ files", s_ = "Split zip files are not supported in USDZ files", o_ = "Encryption is not supported when the 'passThrough' option is set", a_ = "Invalid extra field (must be a Map)", c_ = "Invalid extra field type (must be integer 0..65535)", l_ = "Invalid extra field data (must be a Uint8Array)", Co = "Extra field data exceeds 64KB", Ih = -2147483648, yh = 2147483647, ic = BigInt(0), sc = BigInt("0x7fffffffffffffff"), Po = "Zip64 is not supported (set the 'zip64' option to 'true')", u_ = "Undefined uncompressed size", h_ = "Undefined compression method", f_ = "Undefined reader", d_ = "Invalid reader (must be a Reader instance, a ReadableStream instance, or an object with a 'readable' property)", p_ = "Zip file not empty", E_ = "Invalid uid (must be integer 0..2^32-1)", __ = "Invalid gid (must be integer 0..2^32-1)", g_ = "Invalid UNIX mode (must be integer 0..65535)", m_ = "Invalid unixExtraFieldType (must be 'infozip' or 'unix')", T_ = "uid/gid must be 0..65535 for unixExtraFieldType 'unix' (use 'infozip' for larger ids)", w_ = "Invalid msdosAttributesRaw (must be integer 0..255)", A_ = "Invalid msdosAttributes (must be an object with boolean flags)", I_ = "Invalid level (must be integer 0..9)", y_ = "Signature data exceeds 64KB", oc = new Uint8Array([
        7,
        0,
        2,
        0,
        65,
        69,
        3,
        0,
        0
    ]), S_ = 4, R_ = 9, N_ = 67, D_ = 1, Qs = "infozip", $s = "unix", b_ = 9;
    let Es = 0;
    const ac = [];
    class O_ {
        constructor(t, n = {}){
            t = new hu(t);
            const { availableSize: r = Pn, maxSize: s = Pn } = t, o = r > 0 && r !== Pn && s > 0 && s !== Pn;
            if (o && n[jn]) throw new Error(s_);
            Object.assign(this, {
                writer: t,
                addSplitZipSignature: o,
                options: n,
                fileEntries: new Map,
                filenames: new Set,
                offset: n[Qr] === O ? t.size || t.writable.size || 0 : n[Qr],
                initialOffset: n[Qr] === O ? 0 : n[Qr] - (t.size || t.writable.size || 0),
                pendingAddFileCalls: new Set,
                pendingErrors: [],
                bufferedWrites: 0,
                directWrites: 0,
                lastFileEntry: O
            });
        }
        prependZip(t) {
            return _s(this, P_(this, t));
        }
        appendZip(t) {
            return _s(this, this.appendZipEntries(t));
        }
        async appendZipEntries(t) {
            const n = this, { pendingAddFileCalls: r, filenames: s, fileEntries: o } = n;
            for(; r.size;)await Promise.allSettled(Array.from(r));
            let a;
            const l = new Promise((m)=>a = m);
            r.add(l);
            const h = [];
            let f;
            try {
                t = new Ur(t), await Vt(t), (t.size === O || !t.readUint8Array) && (t = new wn(await Dr(t.readable)), await Vt(t));
                const { ZipReader: m } = await Promise.resolve().then(function() {
                    return JE;
                }), E = new m(t), S = await E.getEntries();
                await E.close(), await Vt(n.writer);
                const { directoryOffset: D } = E;
                S.forEach(({ filename: I })=>{
                    if (s.has(I)) throw new Error(Th);
                    s.add(I), h.push(I);
                }), n.writerLocked = !0;
                const { lockWriter: N } = n;
                n.lockWriter = new Promise((I)=>f = ()=>{
                        n.writerLocked = !1, I();
                    }), await N, n.addSplitZipSignature && (delete n.addSplitZipSignature, await q_(t) || (await Se(n.writer, Rh()), n.offset += 4));
                const R = await J_(n, t, S, D);
                S.forEach((I)=>{
                    const { version: P, rawLastModDate: F, rawFilename: L, bitFlag: v, encrypted: M, uncompressedSize: U, compressedSize: T, extraFieldZip64: p } = I;
                    let { compressionMethod: _, rawExtraField: w } = I;
                    const { level: A, languageEncodingFlag: y, dataDescriptor: g } = v;
                    w = Sh(w || et), I.extraFieldAES && (_ = 99);
                    const H = K(w), $ = !!p && p.uncompressedSize !== O, q = !!p && p.compressedSize !== O, ut = Oh(A, y, g, M, _) & -7 | A << 1, { headerArray: j, headerView: V } = bh({
                        version: P,
                        bitFlag: ut,
                        compressionMethod: _,
                        uncompressedSize: U,
                        compressedSize: T,
                        rawLastModDate: F,
                        rawFilename: L,
                        zip64CompressedSize: q,
                        zip64UncompressedSize: $,
                        extraFieldLength: H
                    }), { crc32: z } = I;
                    z !== O && Ct(V, 10, z);
                    const { offset: J, diskNumberStart: St } = R.get(I);
                    Object.assign(I, {
                        zip64Enabled: !0,
                        zip64UncompressedSize: $,
                        zip64CompressedSize: q,
                        offset: J,
                        diskNumberStart: St,
                        zip64DiskNumberStart: !1,
                        rawExtraFieldZip64: et,
                        rawExtraFieldAES: et,
                        rawExtraFieldExtendedTimestamp: et,
                        rawExtraFieldNTFS: et,
                        rawExtraFieldUnix: et,
                        rawExtraField: w,
                        rawCentralExtraField: et,
                        extendedTimestamp: !1,
                        headerArray: j,
                        headerView: V
                    }), o.set(I.filename, I);
                });
            } catch (m) {
                throw h.forEach((E)=>s.delete(E)), m;
            } finally{
                a(), r.delete(l), f && f();
            }
        }
        add(t = "", n, r = {}) {
            const s = this, { pendingAddFileCalls: o } = s, a = L_(s, t, n, r);
            o.add(a);
            const l = ()=>o.delete(a);
            return Promise.prototype.then.call(a, l, l), _s(s, a);
        }
        remove(t) {
            const { filenames: n, fileEntries: r } = this;
            if (typeof t == Hi && (t = r.get(t)), t && t.filename !== O) {
                const { filename: s } = t;
                if (n.has(s) && r.has(s)) return n.delete(s), r.delete(s), !0;
            }
            return !1;
        }
        async close(t = et, n = {}) {
            const r = this, { pendingAddFileCalls: s, writer: o } = this, { writable: a } = o;
            if (!(t instanceof Uint8Array)) throw new Error(QE);
            if (K(t) > 65535) throw new Error(wh);
            for(; s.size;)await Promise.allSettled(Array.from(s));
            await Promise.allSettled(r.pendingErrors.map((f)=>f.recorded));
            const l = r.pendingErrors.filter((f)=>f.error && !f.observed);
            if (l.length) {
                const f = l.map((E)=>E.error);
                l.forEach((E)=>E.observed = !0);
                const [m] = f;
                try {
                    m.entryErrors = f;
                } catch  {}
                throw m;
            }
            return await Y_(r, t, n), !fu(o) && Z(r, n, fl) || await a.getWriter().close(), o.getData ? o.getData() : a;
        }
    }
    class C_ extends Promise {
        then(t, n) {
            const { watcher: r } = this;
            return r && (r.observed = !0), super.then(t, n);
        }
    }
    function _s(e, t) {
        const n = new C_((s, o)=>Promise.prototype.then.call(t, s, o)), r = {};
        return n.watcher = r, r.recorded = Promise.prototype.then.call(n, O, (s)=>r.error = s), e.pendingErrors.push(r), n;
    }
    async function P_(e, t) {
        if (e.filenames.size) throw new Error(p_);
        await e.appendZipEntries(t);
    }
    async function L_(e, t, n, r) {
        if (r = Object.assign({}, r), Z(e, r, Vn) && !t.endsWith("/") && (t += "/"), e.filenames.has(t)) throw new Error(Th);
        e.filenames.add(t), Es < vr().maxWorkers ? Es++ : await new Promise((s)=>ac.push(s));
        try {
            return await F_(e, t, n, r);
        } catch (s) {
            throw e.filenames.delete(t), s;
        } finally{
            const s = ac.shift();
            s ? s() : Es--;
        }
    }
    async function F_(e, t, n, r) {
        const s = v_(e, t, r);
        ({ name: t } = s);
        const o = M_(e, t, r), { comment: a } = o, l = r[Ro];
        e.fileEntries.set(t, O);
        const h = e.lastFileEntry, f = {};
        let m;
        o.resolvedOptions.keepOrder && (f.lockFileEntry = new Promise((S)=>m = S)), e.lastFileEntry = f;
        let E;
        try {
            const { resolvedOptions: S } = o;
            S.level != 0 && S.compressionMethod === O && !S.passThrough && !await Cp(vr()) && (S.level = 0);
            const D = await U_(e, n, o, r);
            ({ reader: n } = D);
            const N = Or(e.writer), R = ve(e.writer);
            r = Object.assign({}, r, s.resolvedOptions, o.resolvedOptions, D.resolvedOptions, {
                signature: r[Ys],
                crc32: r.crc32 === O ? r[Ys] : r.crc32,
                offset: e.offset - N,
                diskNumberStart: R,
                [jn]: e.options[jn]
            });
            const I = V_(r), P = G_(r), F = K(I.localHeaderArray, P.dataDescriptorArray);
            E = await k_(e, t, n, {
                headerInfo: I,
                dataDescriptorInfo: P,
                metadataSize: F,
                fileEntry: f,
                previousFileEntry: h,
                releaseLockFileEntry: m
            }, r);
        } catch (S) {
            throw e.fileEntries.delete(t), S;
        } finally{
            m && m(h && h.lockFileEntry);
        }
        return Object.assign(E, {
            name: t,
            comment: a,
            extraField: l
        }), new Si(E);
    }
    function v_(e, t, n) {
        let r = Z(e, n, Nu), s = Z(e, n, Ou, r ? 20 : 768);
        const o = Z(e, n, Pu), a = vn(e, n, Fu), l = vn(e, n, vu);
        let h = vn(e, n, Mu), f = Z(e, n, cd), m = Z(e, n, Uu), E = Z(e, n, xu), S = Z(e, n, ku);
        if (ur(a, 4294967295, E_), ur(l, 4294967295, __), ur(h, 65535, g_), f !== O && f !== Qs && f !== $s) throw new Error(m_);
        if (f === $s && (a !== O && a > 65535 || l !== O && l > 65535)) throw new Error(T_);
        f === O && (a !== O || l !== O) && (f = Qs);
        let D = vn(e, n, Su), N = Z(e, n, Ru);
        const R = a !== O || l !== O || h !== O || f || o, I = D !== O || N !== O;
        if (R ? (r = !1, s = s & 255 | 768) : I && (r = !0, s = s & 255), ur(D, 255, w_), N && (typeof N !== Mf || Array.isArray(N))) throw new Error(A_);
        if (s > 65535) throw new Error(Ah);
        let P = Z(e, n, yu);
        const F = P !== O;
        F || (P = 0), !n[Vn] && t.endsWith("/") && (n[Vn] = !0);
        const L = Z(e, n, Vn);
        if (L ? (t.endsWith("/") || (t += "/"), F || (P = 16, r || (P |= 16877 << 16))) : !r && !F && (o ? P = 493 << 16 : P = 420 << 16), !r) {
            const U = h !== O || !!(m || E || S), T = P >> 16 & 65535;
            h = h === O ? T : h & 65535, m ? h |= 2048 : m = !!(h & 2048), E ? h |= 1024 : E = !!(h & 1024), S ? h |= 512 : S = !!(h & 512), (!F || U) && (L ? h = h & -61441 | 16384 : h & 61440 || (h |= 32768), P = (h & 65535) << 16 | P & 65535);
        }
        ({ msdosAttributesRaw: D, msdosAttributes: N } = H_(D, N)), I && (P = P & 4294967295 | D & 255);
        const v = P >> 16 & 65535, M = h !== O && (h & 61440) == 40960;
        return {
            name: t,
            resolvedOptions: {
                versionMadeBy: s,
                msDosCompatible: !!r,
                externalFileAttributes: P,
                unixExternalUpper: v,
                uid: a,
                gid: l,
                unixMode: h,
                unixExtraFieldType: f,
                symlink: M,
                setuid: m,
                setgid: E,
                sticky: S,
                msdosAttributesRaw: D,
                msdosAttributes: N
            }
        };
    }
    function M_(e, t, n) {
        const r = to(e, n, ad) || oi;
        let s = r(t, El);
        if (s === O && (s = oi(t)), K(s) > 65535) throw new Error(n_);
        const o = n[wo] || "";
        if (typeof o != Hi) throw new Error(t_);
        let a = r(o, _l);
        if (a === O && (a = oi(o)), K(a) > 65535) throw new Error($E);
        const l = Z(e, n, bu);
        if (l !== O && l > 65535) throw new Error(Ah);
        const h = ws(e, n, Ii, new Date), f = Z(e, n, yi), m = ws(e, n, Io), E = ws(e, n, yo), S = Z(e, n, Iu, 0), D = Z(e, n, al), N = Z(e, n, sl), R = Z(e, n, ol);
        Tl(N, R);
        const I = vn(e, n, Jf, 3), P = Z(e, n, Cu), F = Z(e, n, Qf, !0), L = Z(e, n, $f), v = Z(e, n, td, !0), M = Z(e, n, ll), U = Z(e, n, hl), T = Z(e, n, nd), p = to(e, n, rd), _ = Z(e, n, id, !0), w = gl(Z(e, n, cl));
        ml(w);
        const A = Z(e, n, sd, !0), y = Z(e, n, Lu), g = D || y === O ? O : Yl(y);
        if (!D && y !== O && y !== 0 && y !== 8 && !g) throw new Error(br);
        let H = vn(e, n, ed);
        if (ur(H, b_, I_), e.options[jn]) {
            if (N !== O || R !== O) throw new Error(i_);
            H === O && y === O && (H = 0);
        }
        D && (H = O);
        let $ = Z(e, n, ul), q = Z(e, n, dl);
        T && q === O && (q = !1), (q === O || P && !D) && (q = !0), H !== O && H != 6 && ($ = !1);
        const ut = Z(e, n, So);
        if (!P && (N !== O || R !== O) && !(Number.isInteger(I) && I >= 1 && I <= 3)) throw new Error(r_);
        const j = gs(n[Ro]), V = gs(n[ld]), z = gs(n[ud]);
        return {
            comment: o,
            resolvedOptions: {
                rawFilename: s,
                rawComment: a,
                version: l,
                lastModDate: h,
                rawLastModDate: f,
                lastAccessDate: m,
                creationDate: E,
                internalFileAttributes: S,
                passThrough: D,
                password: N,
                rawPassword: R,
                encryptionStrength: I,
                zipCrypto: P,
                extendedTimestamp: F,
                ntfsTimestamp: L,
                keepOrder: v,
                useWebWorkers: M,
                transferStreams: U,
                bufferedWrite: T,
                createTempStream: p,
                dataDescriptorSignature: _,
                signal: w,
                useUnicodeFileNames: A,
                compressionMethod: y,
                format: g ? g.format : O,
                codecURI: g ? g.codecURI : O,
                codecVersionNeeded: g ? g.versionNeeded : O,
                level: H,
                useCompressionStream: $,
                dataDescriptor: q,
                zip64: ut,
                rawExtraField: j,
                rawLocalExtraField: V,
                rawCentralExtraField: z
            }
        };
    }
    function gs(e) {
        if (!e) return et;
        if (!(e instanceof Map)) throw new Error(a_);
        let t = 0, n = 0;
        e.forEach((o, a)=>{
            if (wl(a, 65535, c_), !(o instanceof Uint8Array)) throw new Error(l_);
            if (K(o) > 65535) throw new Error(Co);
            t += 4 + K(o);
        });
        const r = new Uint8Array(t), s = X(r);
        return e.forEach((o, a)=>{
            Ie(s, n, a), Ie(s, n + 2, K(o)), Lr(r, o, n + 4), n += 4 + K(o);
        }), r;
    }
    async function U_(e, t, { resolvedOptions: n }, r) {
        if (n.passThrough && !t && !Z(e, r, Vn)) throw new Error(f_);
        let s;
        if (t) {
            if (t = new Ur(t), await Vt(t), !t.readable && !t.readUint8Array) throw new Error(d_);
            ({ size: s } = t);
        }
        return Object.assign({
            reader: t
        }, x_(e, !!t, s, n, r));
    }
    function x_(e, t, n, r, s) {
        const { passThrough: o, zipCrypto: a, password: l, rawPassword: h, encryptionStrength: f } = r;
        let { dataDescriptor: m, zip64: E, level: S, compressionMethod: D } = r, N = 0, R = 0, I = !1;
        if (o && t) {
            if (R = s[Ao], R === O) throw new Error(u_);
            if (D === O) throw new Error(h_);
        }
        const P = E === !0, F = Z(e, s, Du);
        if (t && o && !F && K(l, h)) throw new Error(o_);
        const L = t && (!!(l && K(l) || h && K(h)) || o && F);
        t || (S = 0, D = 0);
        const v = L ? a ? 12 : 16 + f * 4 : 0;
        t && (o ? (s.uncompressedSize = R, N = n === O ? fc(R) + v : n) : n === O ? (m = !0, (E || E === O) && (E = I = !0, N = 4294967296)) : (s.uncompressedSize = R = n, N = (eo(D, S) ? fc(R) : R) + v));
        const M = !L && (!t || n === 0 && !o) && !eo(D, S);
        M && !a && Z(e, s, dl) === O && (m = !1);
        const U = P || I || R >= 4294967295, T = P || N >= 4294967295;
        if (U || T) {
            if (E === !1) throw new Error(Po);
            E = !0;
        }
        return E = E || !1, {
            maximumCompressedSize: N,
            resolvedOptions: {
                dataDescriptor: m,
                emptyEntry: M,
                zip64: E,
                zip64Enabled: P,
                unknownSize: I,
                zip64UncompressedSize: U,
                zip64CompressedSize: T,
                uncompressedSize: R,
                level: S,
                compressionMethod: D,
                encrypted: L
            }
        };
    }
    async function k_(e, t, n, r, s) {
        const { fileEntries: o, writer: a } = e, { keepOrder: l, dataDescriptor: h, emptyEntry: f, signal: m } = s, { headerInfo: E, fileEntry: S, previousFileEntry: D, releaseLockFileEntry: N } = r, R = e.options[jn];
        let I = S, P, F, L, v, M, U, T = 0, p;
        const _ = l && D ? D.lockFileEntry : O;
        o.set(t, I);
        try {
            s.bufferedWrite || !l || e.writerLocked || e.bufferedWrites || e.directWrites || !h && !f ? (P = !0, e.bufferedWrites++, s.createTempStream ? p = await s.createTempStream() : p = new TransformStream(O, O, {
                highWaterMark: Pn
            }), p.size = 0, await Vt(a)) : (F = !0, e.directWrites++, p = a, await _, await w()), await Vt(p);
            const y = Or(a);
            e.addSplitZipSignature && !P && await uc(e, a), R && !P && cc(r, e.offset - y);
            const { localHeaderArray: g } = E;
            P || await A();
            const H = ve(a), $ = Cr(e, a);
            if (I.diskNumberStart = H, P || (M = !0, U = a.size, await Se(p, g)), I = await B_(n, p, I, r, vr(), s), P || (M = !1), o.set(t, I), I.filename = t, P) {
                if (await Promise.all([
                    p.writable.getWriter().close(),
                    _
                ]), await w(), e.addSplitZipSignature && await uc(e, a), v = !0, U = a.size, await A(), I.diskNumberStart = ve(a), I.offset = Cr(e, a), R) {
                    const q = r.metadataSize;
                    cc(r, e.offset - Or(a)), I.size += r.metadataSize - q;
                }
                X_(I, E.localHeaderView, s), await Se(a, E.localHeaderArray), await Nh(p.readable, a, m, (q)=>T += q), a.size += p.size, v = !1;
            } else I.diskNumberStart = H, I.offset = $;
            return e.offset += I.size, I;
        } catch (y) {
            if (v || M) {
                if (e.hasCorruptedEntries = !0, y) try {
                    y.corruptedEntry = !0;
                } catch  {}
                e.offset += a.size - U, P && (e.offset += T);
            }
            throw o.delete(t), y;
        } finally{
            if (P && e.bufferedWrites--, F && e.directWrites--, N && N(_), L && L(), P && p && p.dispose) try {
                await p.dispose();
            } catch  {}
        }
        async function w() {
            e.writerLocked = !0;
            const { lockWriter: y } = e;
            e.lockWriter = new Promise((g)=>L = ()=>{
                    e.writerLocked = !1, g();
                }), await y;
        }
        async function A() {
            Wn(a, K(E.localHeaderArray)) && await a.closeDisk();
        }
    }
    async function B_(e, t, { diskNumberStart: n, lockFileEntry: r }, s, o, a) {
        const { headerInfo: l, dataDescriptorInfo: h, metadataSize: f } = s, { headerArray: m, headerView: E, lastModDate: S, rawLastModDate: D, encrypted: N, compressed: R, version: I, compressionMethod: P, rawExtraFieldZip64: F, localExtraFieldZip64Length: L, rawExtraFieldExtendedTimestamp: v, extraFieldExtendedTimestampFlag: M, rawExtraFieldNTFS: U, rawExtraFieldUnix: T, rawExtraFieldAES: p } = l, { dataDescriptorArray: _ } = h, { rawFilename: w, lastAccessDate: A, creationDate: y, password: g, rawPassword: H, level: $, zip64: q, zip64Enabled: ut, zip64UncompressedSize: j, zip64CompressedSize: V, zipCrypto: z, dataDescriptor: J, directory: St, executable: Rt, versionMadeBy: Lt, rawComment: Ft, rawExtraField: Ut, rawCentralExtraField: Nt, useWebWorkers: Gt, transferStreams: ee, onstart: _t, onprogress: xt, onend: Dt, signal: at, encryptionStrength: ht, extendedTimestamp: vt, msDosCompatible: G, internalFileAttributes: k, externalFileAttributes: ft, uid: B, gid: ot, unixMode: mt, symlink: ne, setuid: be, setgid: Zt, sticky: kt, unixExternalUpper: Tt, msdosAttributesRaw: ue, msdosAttributes: Oe, useCompressionStream: Rn, passThrough: re, format: $e, codecURI: he } = a, ie = {
            lockFileEntry: r,
            versionMadeBy: Lt,
            zip64: q,
            zip64Enabled: ut,
            directory: !!St,
            executable: !!Rt,
            filenameUTF8: !0,
            rawFilename: w,
            commentUTF8: !0,
            rawComment: Ft,
            rawExtraFieldZip64: F,
            localExtraFieldZip64Length: L,
            rawExtraFieldExtendedTimestamp: v,
            rawExtraFieldNTFS: U,
            rawExtraFieldUnix: T,
            rawExtraFieldAES: p,
            rawExtraField: Ut,
            rawCentralExtraField: Nt,
            extendedTimestamp: vt,
            msDosCompatible: G,
            internalFileAttributes: k,
            externalFileAttributes: ft,
            diskNumberStart: n,
            uid: B,
            gid: ot,
            unixMode: mt,
            symlink: !!ne,
            setuid: be,
            setgid: Zt,
            sticky: kt,
            unixExternalUpper: Tt,
            msdosAttributesRaw: ue,
            msdosAttributes: Oe
        };
        let { crc32: fe, uncompressedSize: Kt } = a, Mt = 0;
        re || (Kt = 0);
        const { writable: tn } = t;
        if (e) {
            const At = e.size, xe = Tn(du(e, {
                size: At
            })), se = {
                options: {
                    codecType: Eo,
                    inputSize: At,
                    level: $,
                    rawPassword: H,
                    password: g,
                    encryptionStrength: ht,
                    zipCrypto: N && z,
                    passwordVerification: N && z && D >> 8 & 255,
                    computeCrc32: !re,
                    compressed: R && !re,
                    encrypted: N && !re,
                    useWebWorkers: Gt,
                    useCompressionStream: Rn,
                    transferStreams: ee,
                    format: $e,
                    codecURI: he,
                    compressionMethod: P
                },
                config: o,
                streamOptions: {
                    signal: at,
                    size: At,
                    onstart: _t,
                    onprogress: xt,
                    onend: Dt
                }
            };
            try {
                const bt = await au({
                    readable: xe,
                    writable: tn
                }, se);
                if (Mt = bt.outputSize, t.size += Mt, re || (Kt = bt.inputSize, (!N || z) && (fe = bt.crc32)), !V && Mt >= 4294967295 || !j && Kt >= 4294967295) throw new Error(Po);
            } catch (bt) {
                throw bt.outputSize !== O && (t.size += bt.outputSize), bt;
            }
        }
        return z_({
            crc32: fe,
            compressedSize: Mt,
            uncompressedSize: Kt,
            headerInfo: l,
            dataDescriptorInfo: h
        }, a), J && await Se(t, _), Object.assign(ie, {
            uncompressedSize: Kt,
            compressedSize: Mt,
            lastModDate: S,
            rawLastModDate: D,
            creationDate: y,
            lastAccessDate: A,
            encrypted: !!N,
            zipCrypto: !!z,
            size: f + Mt,
            compressionMethod: P,
            version: I,
            headerArray: m,
            headerView: E,
            signature: fe,
            crc32: N && !z && !re ? O : fe,
            extraFieldExtendedTimestampFlag: M,
            zip64UncompressedSize: j,
            zip64CompressedSize: V
        }), ie;
    }
    function V_(e) {
        const { rawFilename: t, lastModDate: n, rawLastModDate: r, lastAccessDate: s, creationDate: o, level: a, zip64: l, zipCrypto: h, useUnicodeFileNames: f, dataDescriptor: m, directory: E, rawExtraField: S, rawLocalExtraField: D, encryptionStrength: N, extendedTimestamp: R, ntfsTimestamp: I, passThrough: P, encrypted: F, zip64UncompressedSize: L, zip64CompressedSize: v, uncompressedSize: M, unknownSize: U, crc32: T } = e;
        let { version: p, compressionMethod: _ } = e;
        const w = !E && eo(_, a);
        let A;
        const y = P || !w, g = l && (e.bufferedWrite || !m || !L && !v || y && !U), H = g || l && m && (L || v);
        if (l && (L || v)) {
            const ht = jt(20);
            if (ht.writeUint16(1), ht.writeUint16(16), A = ht.array, g && (ht.writeUint64(M), y)) {
                const vt = F ? h ? 12 : 16 + N * 4 : 0;
                ht.writeUint64(P ? 0 : M + vt);
            }
        } else A = et;
        let $;
        if (F && !h) {
            const at = jt(K(oc) + 2);
            at.writeUint16(39169), at.writeBytes(oc), $ = at.array, $[8] = N;
        } else $ = et;
        let q, ut, j;
        if (R) {
            const at = dr(n), ht = Dh(at);
            if (ht) {
                const G = 9 + (s ? 4 : 0) + (o ? 4 : 0), k = jt(G);
                j = 1 + (s ? 2 : 0) + (o ? 4 : 0), k.writeUint16(21589), k.writeUint16(G - 4), k.writeUint8(j), k.writeUint32(at), s && k.writeUint32(hc(dr(s))), o && k.writeUint32(hc(dr(o))), ut = k.array;
            } else ut = et;
            if (I === O ? !ht || !!(s || o) : I) try {
                const G = Ts(n), k = jt(36);
                k.writeUint16(10), k.writeUint16(32), k.skip(4), k.writeUint16(1), k.writeUint16(24), k.writeUint64(G), k.writeUint64(s ? Ts(s) : G), k.writeUint64(o ? Ts(o) : G), q = k.array;
            } catch  {
                q = et;
            }
            else q = et;
        } else q = ut = et;
        let V;
        try {
            const { uid: at, gid: ht, unixExtraFieldType: vt } = e;
            if (vt == Qs && (at !== O || ht !== O)) {
                const G = lc(at === O ? 0 : at), k = lc(ht === O ? 0 : ht), ft = 3 + G.length + k.length, B = jt(4 + ft);
                B.writeUint16(30837), B.writeUint16(ft), B.writeUint8(1), B.writeUint8(G.length), B.writeBytes(G), B.writeUint8(k.length), B.writeBytes(k), V = B.array;
            } else if (vt == $s && (at !== O || ht !== O)) {
                const G = jt(8);
                G.writeUint16(30805), G.writeUint16(4), G.writeUint16((at === O ? 0 : at) & 65535), G.writeUint16((ht === O ? 0 : ht) & 65535), V = G.array;
            } else V = et;
        } catch  {
            V = et;
        }
        _ === O && (_ = w ? 8 : 0), p === O && (p = _ == 0 && !E && !F ? 10 : 20);
        const { codecVersionNeeded: z } = e;
        w && z !== O && (p = p > z ? p : z), l && (p = p > 45 ? p : 45), F && !h && (p = p > 51 ? p : 51, P && T !== O && ($[S_] = D_), Ie(X($), R_, _), _ = 99);
        const J = H ? K(A) : 0, St = J + K($, ut, q, V, S, D), Rt = e[jn] ? N_ : 0;
        if (St + Rt > 65535) throw new Error(Co);
        const Lt = new Date(Math.ceil(Math.floor(n.getTime() / 1e3) / 2) * 2e3), Ft = Lt < _i ? _i : Lt > Ra ? Ra : Lt, Ut = K(ut) ? new Date(dr(n) * 1e3) : K(q) ? n : Ft, { headerArray: Nt, headerView: Gt, rawLastModDate: ee } = bh({
            version: p,
            bitFlag: Oh(a, f, m, F, _),
            compressionMethod: _,
            uncompressedSize: M,
            lastModDate: Ft,
            rawLastModDate: r,
            rawFilename: t,
            zip64CompressedSize: v,
            zip64UncompressedSize: L,
            extraFieldLength: St
        }), _t = jt(30 + K(t) + St), xt = _t.array, Dt = X(xt);
        return _t.writeUint32(67324752), _t.writeBytes(Nt), _t.writeBytes(t), H && _t.writeBytes(A), _t.writeBytes($), _t.writeBytes(ut), _t.writeBytes(q), _t.writeBytes(V), _t.writeBytes(S), _t.writeBytes(D), m && (v || Ct(Dt, 18, 0), L || Ct(Dt, 22, 0)), {
            localHeaderArray: xt,
            localHeaderView: Dt,
            headerArray: Nt,
            headerView: Gt,
            lastModDate: Ut,
            rawLastModDate: ee,
            encrypted: F,
            compressed: w,
            version: p,
            compressionMethod: _,
            extraFieldExtendedTimestampFlag: j,
            rawExtraFieldZip64: et,
            localExtraFieldZip64Length: J,
            rawExtraFieldExtendedTimestamp: ut,
            rawExtraFieldNTFS: q,
            rawExtraFieldUnix: V,
            rawExtraFieldAES: $,
            extraFieldLength: St
        };
    }
    function cc(e, t) {
        const { headerInfo: n } = e;
        let { localHeaderArray: r, extraFieldLength: s } = n, o = 64 - (t + K(r)) % 64;
        o < 4 && (o += 64);
        const a = new Uint8Array(o), l = X(a);
        Ie(l, 0, 6534), Ie(l, 2, o - 4);
        const h = r;
        n.localHeaderArray = r = new Uint8Array(K(h) + o), Lr(r, h), Lr(r, a, K(h));
        const f = X(r);
        Ie(f, 28, s + o), n.localHeaderView = f, e.metadataSize += o;
    }
    function lc(e) {
        const t = new Uint8Array(4);
        X(t).setUint32(0, e, !0);
        let r = 4;
        for(; r > 1 && t[r - 1] === 0;)r--;
        return t.subarray(0, r);
    }
    function H_(e, t) {
        if (e !== O) e = e & 255;
        else if (t !== O) {
            const { readOnly: n, hidden: r, system: s, directory: o, archive: a } = t;
            let l = 0;
            n && (l |= 1), r && (l |= 2), s && (l |= 4), o && (l |= 16), a && (l |= 32), e = l & 255;
        }
        return t === O && (t = {
            readOnly: !!(e & 1),
            hidden: !!(e & 2),
            system: !!(e & 4),
            directory: !!(e & 16),
            archive: !!(e & 32)
        }), {
            msdosAttributesRaw: e,
            msdosAttributes: t
        };
    }
    function G_({ zip64: e, dataDescriptor: t, dataDescriptorSignature: n }) {
        let r = et, s, o = 0, a = e ? 20 : 12;
        return n && (a += 4), t && (r = new Uint8Array(a), s = X(r), n && (o = 4, Ct(s, 0, 134695760))), {
            dataDescriptorArray: r,
            dataDescriptorView: s,
            dataDescriptorOffset: o
        };
    }
    function z_({ crc32: e, compressedSize: t, uncompressedSize: n, headerInfo: r, dataDescriptorInfo: s }, { zip64: o, zipCrypto: a, passThrough: l, dataDescriptor: h }) {
        const { headerView: f, encrypted: m } = r, { dataDescriptorView: E, dataDescriptorOffset: S } = s;
        (!m || a || l) && e !== O && (Ct(f, 10, e), h && Ct(E, S, e)), o ? h && (Pr(E, S + 4, BigInt(t)), Pr(E, S + 12, BigInt(n))) : (Ct(f, 14, t), Ct(f, 18, n), h && (Ct(E, S + 4, t), Ct(E, S + 8, n)));
    }
    function X_({ rawFilename: e, encrypted: t, zip64: n, localExtraFieldZip64Length: r, crc32: s, compressedSize: o, uncompressedSize: a, zip64UncompressedSize: l, zip64CompressedSize: h }, f, { dataDescriptor: m, passThrough: E }) {
        if (m || ((!t || E && s !== O) && Ct(f, 14, s), h || Ct(f, 18, o), l || Ct(f, 22, a)), n && r) {
            const S = 30 + K(e) + 4;
            Pr(f, S, BigInt(a)), Pr(f, S + 8, BigInt(o));
        }
    }
    async function Y_(e, t, n) {
        const { directoryDataLength: r, zip64Entries: s } = j_(e.fileEntries), { directoryStart: o, directoryEnd: a, directoryArray: l } = await W_(e, r, n), h = await Z_(e, l, n);
        await K_(e, t, n, {
            directoryStart: o,
            directoryEnd: a,
            directoryDataLength: r,
            signatureLength: h,
            zip64Entries: s
        });
    }
    function j_(e) {
        let t = 0, n = !1;
        for (const [, r] of e){
            const { rawFilename: s, rawExtraFieldAES: o, rawComment: a, rawExtraFieldNTFS: l, rawExtraFieldUnix: h, rawExtraField: f, rawCentralExtraField: m, extendedTimestamp: E, extraFieldExtendedTimestampFlag: S, lastModDate: D, zip64Enabled: N, uncompressedSize: R, compressedSize: I } = r;
            let { zip64UncompressedSize: P, zip64CompressedSize: F } = r;
            N || (P && R < 4294967295 && (P = r.zip64UncompressedSize = !1), F && I < 4294967295 && (F = r.zip64CompressedSize = !1)), n = n || P || F;
            const L = r.offset >= 4294967295, v = r.diskNumberStart >= 65535;
            let M;
            if (L || v || P || F) {
                const _ = 4 + (P ? 8 : 0) + (F ? 8 : 0) + (L ? 8 : 0) + (v ? 4 : 0), w = jt(_);
                w.writeUint16(1), w.writeUint16(_ - 4), P && w.writeUint64(R), F && w.writeUint64(I), L && w.writeUint64(r.offset), v && w.writeUint32(r.diskNumberStart), M = w.array;
            } else M = et;
            r.rawExtraFieldZip64 = M, r.zip64Offset = L, r.zip64DiskNumberStart = v;
            let U;
            const T = dr(D);
            if (E && Dh(T)) {
                const _ = jt(9);
                _.writeUint16(21589), _.writeUint16(5), _.writeUint8(S), _.writeUint32(T), U = _.array;
            } else U = et;
            r.rawExtraFieldExtendedTimestamp = U;
            const p = K(M, o, l, h, U, f, m);
            if (p > 65535) throw new Error(Co);
            t += 46 + K(s, a) + p;
        }
        return {
            directoryDataLength: t,
            zip64Entries: n
        };
    }
    async function W_(e, t, n) {
        const { fileEntries: r, writer: s } = e, o = new Uint8Array(t);
        await Vt(s);
        let a = 0, l = 0, h = ve(s), f = Or(s), m = 0;
        for (const [E, S] of Array.from(r.values()).entries()){
            const { offset: D, rawFilename: N, rawExtraFieldZip64: R, rawExtraFieldAES: I, rawExtraFieldExtendedTimestamp: P, rawExtraFieldNTFS: F, rawExtraFieldUnix: L, rawExtraField: v, rawCentralExtraField: M, rawComment: U, versionMadeBy: T, headerArray: p, headerView: _, zip64UncompressedSize: w, zip64CompressedSize: A, zip64DiskNumberStart: y, zip64Offset: g, internalFileAttributes: H, externalFileAttributes: $, diskNumberStart: q, uncompressedSize: ut, compressedSize: j } = S, V = K(R, I, P, F, L, v, M), z = 46 + K(N, U) + V;
            Wn(s, a + z - l) && (await Se(s, o.slice(l, a)), l = a, m = 0, await s.closeDisk()), E == 0 && (h = ve(s), f = Or(s)), w || Ct(_, 18, ut), A || Ct(_, 14, j), (g || y) && S.version < 45 && Ie(_, 0, 45);
            const J = jt(z);
            if (J.writeUint32(33639248), J.writeUint16(T), J.writeBytes(p.subarray(0, 24)), J.writeUint16(V), J.writeUint16(K(U)), J.writeUint16(y ? 65535 : q), J.writeUint16(H), J.writeUint32($), J.writeUint32(g ? 4294967295 : D), J.writeBytes(N), J.writeBytes(R), J.writeBytes(I), J.writeBytes(P), J.writeBytes(F), J.writeBytes(L), J.writeBytes(v), J.writeBytes(M), J.writeBytes(U), Lr(o, J.array, a), a += z, m++, n.onprogress) try {
                await n.onprogress(E + 1, r.size, new Si(S));
            } catch  {}
        }
        return await Se(s, l ? o.slice(l) : o), {
            directoryStart: {
                diskNumber: h,
                diskOffset: f
            },
            directoryEnd: {
                diskNumber: ve(s),
                entriesLength: m
            },
            directoryArray: o
        };
    }
    async function Z_(e, t, n) {
        const r = to(e, n, Ed);
        if (r) {
            const s = await r(t), o = K(s);
            if (o > 65535) throw new Error(y_);
            const a = jt(6 + o);
            a.writeUint32(84233040), a.writeUint16(o), a.writeBytes(s);
            const { writer: l } = e;
            return Wn(l, K(a.array)) && await l.closeDisk(), await Se(l, a.array), 6 + o;
        }
        return 0;
    }
    async function K_(e, t, n, r) {
        const { writer: s } = e, { directoryStart: o, directoryEnd: a, signatureLength: l, zip64Entries: h } = r;
        let { directoryDataLength: f } = r, m = e.fileEntries.size, E = o.diskNumber, S = Cr(e, o);
        const D = K(t);
        if (D > 65535) throw new Error(wh);
        let N = Z(e, n, So), R = ve(s);
        if (Wn(s, (N ? 98 : 22) + D) && R++, S >= 4294967295 || f >= 4294967295 || m >= 65535 || R >= 65535) {
            if (N === !1) throw new Error(Po);
            N = !0;
        } else N === O && h && (N = !0);
        const I = jt(N ? 98 : 22);
        Wn(s, K(I.array) + D) && await s.closeDisk(), R = ve(s);
        let P = R == a.diskNumber ? a.entriesLength : 0;
        N && (I.writeUint32(101075792), I.writeUint64(44), I.writeUint16(45), I.writeUint16(45), I.writeUint32(R), I.writeUint32(E), I.writeUint64(P), I.writeUint64(m), I.writeUint64(f), I.writeUint64(S), I.writeUint32(117853008), I.writeUint32(R), I.writeUint64(BigInt(Cr(e, s)) + BigInt(f) + BigInt(l)), I.writeUint32(R + 1), Z(e, n, od, !0) && (R = 65535, E = 65535), P = 65535, m = 65535, S = 4294967295, f = 4294967295), I.writeUint32(101010256), I.writeUint16(R), I.writeUint16(E), I.writeUint16(P), I.writeUint16(m), I.writeUint32(f), I.writeUint32(S), I.writeUint16(D), await Se(s, I.array), D && await Se(s, t);
    }
    function jt(e) {
        const t = new Uint8Array(e), n = X(t);
        let r = 0;
        return {
            array: t,
            writeUint8: (s)=>{
                tg(n, r, s), r += 1;
            },
            writeUint16: (s)=>{
                Ie(n, r, s), r += 2;
            },
            writeUint32: (s)=>{
                Ct(n, r, s), r += 4;
            },
            writeUint64: (s)=>{
                Pr(n, r, BigInt(s)), r += 8;
            },
            writeBytes: (s)=>{
                Lr(t, s, r), r += K(s);
            },
            skip: (s)=>r += s
        };
    }
    function ve(e) {
        const { diskNumber: t = 0 } = e;
        return t;
    }
    function Or(e) {
        const { diskOffset: t = 0 } = e;
        return t;
    }
    function Wn(e, t) {
        const { availableSize: n = Pn } = e;
        return t > n;
    }
    function Cr(e, { diskNumber: t = 0, diskOffset: n = 0 }) {
        return e.offset - n - (t ? e.initialOffset : 0);
    }
    async function q_(e) {
        const t = await dt(e, 0, 4);
        return $_(X(t), 0) == 134695760;
    }
    function Sh(e) {
        const t = X(e);
        let n = 0;
        for(; n + 4 <= K(e);){
            const r = 4 + Ni(t, n + 2);
            if (Ni(t, n) == 1) return Sh(We(e.subarray(0, n), e.subarray(Math.min(n + r, K(e)))));
            n += r;
        }
        return e;
    }
    async function J_(e, t, n, r) {
        const { writer: s } = e, o = new Map;
        if (s.closeDisk) {
            const a = Array.from(n).sort((h, f)=>ti(t, h) - ti(t, f));
            let l = 0;
            for (const h of a){
                const f = ti(t, h);
                await ms(e, t, l, f - l), Wn(s, await Q_(t, f)) && await s.closeDisk(), o.set(h, {
                    offset: Cr(e, s),
                    diskNumberStart: ve(s)
                }), l = f;
            }
            await ms(e, t, l, r - l);
        } else {
            const a = e.offset;
            await ms(e, t, 0, r), n.forEach((l)=>o.set(l, {
                    offset: a + ti(t, l),
                    diskNumberStart: 0
                }));
        }
        return o;
    }
    async function ms(e, t, n, r) {
        if (r > 0) {
            const { writer: s } = e;
            let o = 0;
            try {
                await Nh(du(t, {
                    offset: n,
                    size: r
                }), s, O, (a)=>o += a);
            } catch (a) {
                e.hasCorruptedEntries = !0;
                try {
                    a.corruptedEntry = !0;
                } catch  {}
                throw a;
            } finally{
                s.size += o, e.offset += o;
            }
        }
    }
    async function Q_(e, t) {
        const n = await dt(e, t, 30);
        if (K(n) < 30) return 30;
        const r = X(n);
        return 30 + Ni(r, 26) + Ni(r, 28);
    }
    function ti(e, { offset: t, diskNumberStart: n }) {
        return t + (e.getDiskOffset ? e.getDiskOffset(n) : 0);
    }
    function Rh() {
        const e = new Uint8Array(4);
        return Ct(X(e), 0, 134695760), e;
    }
    async function uc(e, t) {
        delete e.addSplitZipSignature, await Se(t, Rh()), e.offset += 4;
    }
    async function Se(e, t) {
        const { writable: n } = e, r = n.getWriter();
        try {
            await r.ready, e.size += K(t), await r.write(t);
        } finally{
            r.releaseLock();
        }
    }
    async function Nh(e, t, n, r) {
        const s = t.writable.getWriter();
        try {
            await e.pipeTo(new WritableStream({
                async write (o) {
                    await s.ready, await s.write(o), r(K(o));
                }
            }), {
                preventClose: !0,
                preventAbort: !0,
                signal: n
            });
        } finally{
            s.releaseLock();
        }
    }
    function Ts(e) {
        if (e) {
            const t = (BigInt(e.getTime()) + BigInt(116444736e5)) * BigInt(1e4);
            return t < ic ? ic : t > sc ? sc : t;
        }
    }
    function dr(e) {
        return Math.floor(e.getTime() / 1e3);
    }
    function Dh(e) {
        return e >= Ih && e <= yh;
    }
    function hc(e) {
        return Math.min(yh, Math.max(Ih, e));
    }
    function Z(e, t, n, r) {
        const s = t[n] === O ? e.options[n] : t[n];
        return s === O ? r : s;
    }
    function ws(e, t, n, r) {
        const s = Z(e, t, n, r);
        if (s === null) return r;
        if (s !== O && (typeof s.getTime != Pt || Number.isNaN(s.getTime()))) throw new Error(e_);
        return s;
    }
    function to(e, t, n) {
        return lo(Z(e, t, n));
    }
    function vn(e, t, n, r) {
        return Gi(Z(e, t, n, r));
    }
    function fc(e) {
        return e + 5 * (Math.floor(e / 16383) + 1);
    }
    function eo(e, t) {
        return e === O ? t === O || t > 0 : e !== 0;
    }
    function Ni(e, t) {
        return e.getUint16(t, !0);
    }
    function $_(e, t) {
        return e.getUint32(t, !0);
    }
    function tg(e, t, n) {
        e.setUint8(t, n);
    }
    function Ie(e, t, n) {
        e.setUint16(t, n, !0);
    }
    function Ct(e, t, n) {
        e.setUint32(t, n, !0);
    }
    function Pr(e, t, n) {
        e.setBigUint64(t, n, !0);
    }
    function Lr(e, t, n) {
        e.set(t, n);
    }
    function K(...e) {
        let t = 0;
        return e.forEach((n)=>n && (t += n.length)), t;
    }
    function bh({ version: e, bitFlag: t, compressionMethod: n, uncompressedSize: r, compressedSize: s, lastModDate: o, rawLastModDate: a, rawFilename: l, zip64CompressedSize: h, zip64UncompressedSize: f, extraFieldLength: m }) {
        const E = jt(26), S = E.array, D = X(S);
        if (E.writeUint16(e), E.writeUint16(t), E.writeUint16(n), a === O) {
            const N = new Uint32Array(1), R = X(N);
            Ie(R, 0, (o.getHours() << 6 | o.getMinutes()) << 5 | o.getSeconds() / 2), Ie(R, 2, (o.getFullYear() - 1980 << 4 | o.getMonth() + 1) << 5 | o.getDate()), a = N[0];
        }
        return E.writeUint32(a), E.skip(4), h || s !== O ? E.writeUint32(h ? 4294967295 : s) : E.skip(4), f || r !== O ? E.writeUint32(f ? 4294967295 : r) : E.skip(4), E.writeUint16(K(l)), E.writeUint16(m), {
            headerArray: S,
            headerView: D,
            rawLastModDate: a
        };
    }
    function Oh(e, t, n, r, s) {
        let o = 0;
        return t && (o = o | 2048), n && (o = o | 8), (s == 8 || s == 9) && (e >= 0 && e <= 3 && (o = o | 6), e > 3 && e <= 5 && (o = o | 4), e == 9 && (o = o | 2)), r && (o = o | 1), o;
    }
    try {
        zi({
            baseURI: import.meta.url
        });
    } catch  {}
    const eg = [
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        13,
        15,
        17,
        19,
        23,
        27,
        31,
        35,
        43,
        51,
        59,
        67,
        83,
        99,
        115,
        131,
        163,
        195,
        227,
        258
    ], ng = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        0
    ], rg = [
        1,
        2,
        3,
        4,
        5,
        7,
        9,
        13,
        17,
        25,
        33,
        49,
        65,
        97,
        129,
        193,
        257,
        385,
        513,
        769,
        1025,
        1537,
        2049,
        3073,
        4097,
        6145,
        8193,
        12289,
        16385,
        24577
    ], ig = [
        0,
        0,
        0,
        0,
        1,
        1,
        2,
        2,
        3,
        3,
        4,
        4,
        5,
        5,
        6,
        6,
        7,
        7,
        8,
        8,
        9,
        9,
        10,
        10,
        11,
        11,
        12,
        12,
        13,
        13
    ], sg = [
        16,
        17,
        18,
        0,
        8,
        7,
        9,
        6,
        10,
        5,
        11,
        4,
        12,
        3,
        13,
        2,
        14,
        1,
        15
    ], pr = new Uint8Array(288);
    pr.fill(8, 0, 144), pr.fill(9, 144, 256), pr.fill(7, 256, 280), pr.fill(8, 280, 288);
    const og = new Uint8Array(30).fill(5);
    function cr(e) {
        const t = new Uint16Array(16);
        for (const s of e)t[s]++;
        t[0] = 0;
        const n = new Uint16Array(17);
        for(let s = 1; s <= 15; s++)n[s + 1] = n[s] + t[s];
        const r = new Uint16Array(e.length);
        for(let s = 0; s < e.length; s++)e[s] && (r[n[e[s]]++] = s);
        return {
            o: t,
            symbols: r
        };
    }
    const zt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function ag(e) {
        let t;
        e({
            wasmURI: ()=>(t || (t = "data:application/wasm;base64," + (function(n) {
                    let r = "";
                    const s = n.length;
                    let o = 0;
                    for(; o + 2 < s; o += 3){
                        const l = n[o] << 16 | n[o + 1] << 8 | n[o + 2];
                        r += zt[l >> 18 & 63] + zt[l >> 12 & 63] + zt[l >> 6 & 63] + zt[63 & l];
                    }
                    const a = s - o;
                    if (a === 1) {
                        const l = n[o] << 16;
                        r += zt[l >> 18 & 63] + zt[l >> 12 & 63] + "==";
                    } else if (a === 2) {
                        const l = n[o] << 16 | n[o + 1] << 8;
                        r += zt[l >> 18 & 63] + zt[l >> 12 & 63] + zt[l >> 6 & 63] + "=";
                    }
                    return r;
                })((function(n) {
                    let r = 0, s = 0, o = 0, a = new Uint8Array(1024), l = 0, h = 0;
                    for(; !h;){
                        h = m(1);
                        const I = m(2);
                        if (I == 0) E();
                        else if (I == 1) S(cr(pr), cr(og));
                        else {
                            if (I != 2) throw new Error("invalid deflate block type");
                            S(...D());
                        }
                    }
                    return a.subarray(0, l);
                    function f() {
                        if (r >= n.length) throw new Error("unexpected end of deflate data");
                        return n[r++];
                    }
                    function m(I) {
                        for(; o < I;)s |= f() << o, o += 8;
                        const P = s & (1 << I) - 1;
                        return s >>>= I, o -= I, P;
                    }
                    function E() {
                        s = 0, o = 0;
                        const I = f() | f() << 8;
                        r += 2, R(l + I);
                        for(let P = 0; P < I; P++)a[l++] = f();
                    }
                    function S(I, P) {
                        let F = N(I);
                        for(; F != 256;){
                            if (F < 256) R(l + 1), a[l++] = F;
                            else {
                                const L = F - 257, v = eg[L] + m(ng[L]), M = N(P), U = rg[M] + m(ig[M]);
                                R(l + v);
                                const T = l - U;
                                for(let p = 0; p < v; p++)a[l++] = a[T + p];
                            }
                            F = N(I);
                        }
                    }
                    function D() {
                        const I = m(5) + 257, P = m(5) + 1, F = m(4) + 4, L = new Uint8Array(19);
                        for(let T = 0; T < F; T++)L[sg[T]] = m(3);
                        const v = cr(L), M = new Uint8Array(I + P);
                        let U = 0;
                        for(; U < M.length;){
                            const T = N(v);
                            if (T < 16) M[U++] = T;
                            else if (T == 16) {
                                const p = M[U - 1];
                                let _ = m(2) + 3;
                                for(; _--;)M[U++] = p;
                            } else U += T == 17 ? m(3) + 3 : m(7) + 11;
                        }
                        return [
                            cr(M.subarray(0, I)),
                            cr(M.subarray(I))
                        ];
                    }
                    function N(I) {
                        const { o: P, symbols: F } = I;
                        let L = 0, v = 0, M = 0;
                        for(let U = 1; U <= 15; U++){
                            L |= m(1);
                            const T = P[U];
                            if (L - v < T) return F[M + (L - v)];
                            M += T, v = v + T << 1, L <<= 1;
                        }
                        throw new Error("invalid huffman code");
                    }
                    function R(I) {
                        if (a.length < I) {
                            let P = 2 * a.length;
                            for(; P < I;)P *= 2;
                            const F = new Uint8Array(P);
                            F.set(a.subarray(0, l)), a = F;
                        }
                    }
                })((function(n) {
                    const r = (n = String(n).replace(/[^A-Za-z0-9+/=]/g, "")).length, s = [];
                    for(let o = 0; o < r; o += 4){
                        const a = zt.indexOf(n[o]) << 18 | zt.indexOf(n[o + 1]) << 12 | (63 & zt.indexOf(n[o + 2])) << 6 | 63 & zt.indexOf(n[o + 3]);
                        s.push(a >> 16 & 255), n[o + 2] !== "=" && s.push(a >> 8 & 255), n[o + 3] !== "=" && s.push(255 & a);
                    }
                    return new Uint8Array(s);
                })("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")))), t)
        });
    }
    const ji = "deflate", Di = "deflate-raw", Ch = "deflate64-raw", bi = "gzip";
    let pt, Hn, Le, _r, Ph;
    function cg(e) {
        if (pt = e, { malloc: Hn, free: Le, memory: _r } = pt, typeof Hn != "function" || typeof Le != "function" || !_r) throw pt = Hn = Le = _r = null, new Error("Invalid WASM module");
    }
    function lg(e) {
        Ph = e;
    }
    function Lh(e, t, n = {}) {
        if (!pt) {
            const l = new Error("WASM module not loaded");
            throw l.cause = Ph, l;
        }
        const r = typeof n.level == "number" ? n.level : -1, s = typeof n.outBuffer == "number" ? n.outBuffer : 64 * 1024, o = typeof n.inBufferSize == "number" ? n.inBufferSize : 64 * 1024;
        return new TransformStream({
            start () {
                try {
                    let l;
                    if (this.out = Hn(s), this.in = Hn(o), this.inBufferSize = o, !this.out || !this.in) throw new Error("allocation failed");
                    if (this._scratch = new Uint8Array(s), e ? (this._process = pt.deflate_process, this._last_consumed = pt.deflate_last_consumed, this._end = pt.deflate_end, this.streamHandle = pt.deflate_new(), t === bi ? l = pt.deflate_init_gzip(this.streamHandle, r) : t === Di ? l = pt.deflate_init_raw(this.streamHandle, r) : l = pt.deflate_init(this.streamHandle, r)) : t === Ch ? (this._process = pt.inflate9_process, this._last_consumed = pt.inflate9_last_consumed, this._end = pt.inflate9_end, this.streamHandle = pt.inflate9_new(), l = pt.inflate9_init_raw(this.streamHandle)) : (this._process = pt.inflate_process, this._last_consumed = pt.inflate_last_consumed, this._end = pt.inflate_end, this.streamHandle = pt.inflate_new(), t === Di ? l = pt.inflate_init_raw(this.streamHandle) : t === bi ? l = pt.inflate_init_gzip(this.streamHandle) : l = pt.inflate_init(this.streamHandle)), l !== 0) throw new Error("init failed:" + l);
                } catch (l) {
                    throw a(this), l;
                }
            },
            transform (l, h) {
                try {
                    const f = l, m = new Uint8Array(_r.buffer), E = this._process, S = this._last_consumed, D = this.out, N = this._scratch;
                    let R = 0;
                    for(; R < f.length;){
                        const I = Math.min(f.length - R, 32768);
                        if ((!this.in || this.inBufferSize < I) && (this.in && Le && (Le(this.in), this.in = 0), this.in = Hn(I), this.inBufferSize = I, !this.in)) throw new Error("allocation failed");
                        m.set(f.subarray(R, R + I), this.in);
                        const P = E(this.streamHandle, this.in, I, D, s, 0), F = P >> 24 & 255, L = F & 128 ? F - 256 : F;
                        if (L < 0) throw new Error("process error:" + L);
                        const v = P & 16777215;
                        v && (N.set(m.subarray(D, D + v), 0), h.enqueue(N.slice(0, v)));
                        const M = S(this.streamHandle);
                        if (M === 0 && v === 0) break;
                        R += M;
                    }
                } catch (f) {
                    a(this), h.error(f);
                }
            },
            flush (l) {
                try {
                    const h = new Uint8Array(_r.buffer), f = this._process, m = this.out, E = this._scratch;
                    for(;;){
                        const S = f(this.streamHandle, 0, 0, m, s, 4), D = S >> 24 & 255, N = D & 128 ? D - 256 : D;
                        if (N < 0) throw new Error("process error:" + N);
                        const R = S & 16777215;
                        if (R && (E.set(h.subarray(m, m + R), 0), l.enqueue(E.slice(0, R))), D === 1 || R === 0) break;
                    }
                } catch (h) {
                    l.error(h);
                } finally{
                    const h = a(this);
                    h !== 0 && l.error(new Error("end error:" + h));
                }
            },
            cancel () {
                a(this);
            }
        });
        function a(l) {
            let h = 0;
            return l.streamHandle && l._end && (h = l._end(l.streamHandle)), l.streamHandle = 0, l.in && Le && Le(l.in), l.in = 0, l.out && Le && Le(l.out), l.out = 0, h;
        }
    }
    class Lo {
        constructor(t = ji, n){
            return Lh(!0, t, n);
        }
    }
    class Fo {
        constructor(t = ji, n){
            return Lh(!1, t, n);
        }
    }
    Lo.requiresModule = !0;
    Fo.requiresModule = !0;
    Lo.supportedFormats = [
        ji,
        Di,
        bi
    ];
    Fo.supportedFormats = [
        ji,
        Di,
        bi,
        Ch
    ];
    let dc = !1;
    async function ug(e, { baseURI: t }) {
        if (!dc) try {
            await hg(e, t), dc = !0;
        } catch (n) {
            throw lg(n), n;
        }
    }
    async function hg(e, t) {
        let n, r;
        try {
            try {
                r = new URL(e, t);
            } catch  {}
            n = await (await fetch(r)).arrayBuffer();
        } catch (o) {
            if (e.startsWith("data:application/wasm;base64,")) n = fg(e);
            else throw o;
        }
        const s = await WebAssembly.instantiate(n);
        cg(s.instance.exports);
    }
    function fg(e) {
        const t = e.split(",")[1], n = atob(t), r = n.length, s = new Uint8Array(r);
        for(let o = 0; o < r; ++o)s[o] = n.charCodeAt(o);
        return s.buffer;
    }
    let ei;
    bp({
        initModule: (e)=>{
            if (!ei) {
                let { wasmURI: t } = e;
                typeof t == Pt && (t = t()), ei = ug(t, e).catch((n)=>{
                    throw ei = null, n;
                });
            }
            return ei;
        }
    });
    zi({
        CompressionStreamFallback: Lo,
        DecompressionStreamFallback: Fo
    });
    ag(zi);
    Od(zi);
    const Fh = [
        "palette",
        "zebra",
        "tessellation",
        "shading",
        "skybox",
        "webcam",
        "smoothness",
        "stripeAverage",
        "rotationMean",
        "stripeReliefTilt",
        "directionCoherenceReliefTilt",
        "shadingLevel",
        "specularPower",
        "dielectricSpecular",
        "metallic",
        "roughness",
        "anisotropy",
        "reliefGain",
        "protrusion",
        "metalReflectance",
        "metalEnvironmentTint",
        "iridescencePower"
    ], vh = {
        palette: {
            label: "Color Blend",
            defaultValue: 1,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 0,
            textureChannel: 3,
            uiGroup: "color"
        },
        zebra: {
            label: "Iteration Bands",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 1,
            textureChannel: 0,
            uiGroup: "iteration"
        },
        tessellation: {
            label: "Image Blend",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 1,
            textureChannel: 1,
            uiGroup: "imageSources"
        },
        shading: {
            label: "Lighting Blend",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 1,
            textureChannel: 2,
            uiGroup: "lighting"
        },
        skybox: {
            label: "Reflection Blend",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 1,
            textureChannel: 3,
            uiGroup: "lighting"
        },
        webcam: {
            label: "Webcam Blend",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 2,
            textureChannel: 0,
            uiGroup: "imageSources"
        },
        smoothness: {
            label: "Smooth Iterations",
            defaultValue: 1,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 2,
            textureChannel: 1,
            uiGroup: "iteration"
        },
        stripeAverage: {
            label: "Stripe Average",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 5,
            textureChannel: 0,
            uiGroup: "iteration"
        },
        rotationMean: {
            label: "Direction Coherence",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 5,
            textureChannel: 1,
            uiGroup: "iteration"
        },
        stripeReliefTilt: {
            label: "Stripe Relief",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 5,
            textureChannel: 2,
            uiGroup: "iteration"
        },
        directionCoherenceReliefTilt: {
            label: "Direction Relief",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 5,
            textureChannel: 3,
            uiGroup: "iteration"
        },
        shadingLevel: {
            label: "Light Intensity",
            defaultValue: 0,
            min: 0,
            max: 3,
            step: .05,
            unit: "",
            textureRow: 2,
            textureChannel: 2,
            uiGroup: "lighting"
        },
        specularPower: {
            label: "Direct Specular",
            defaultValue: 0,
            min: 0,
            max: 64,
            step: .5,
            unit: "",
            textureRow: 2,
            textureChannel: 3,
            uiGroup: "lighting"
        },
        dielectricSpecular: {
            label: "Dielectric F0",
            defaultValue: .04,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 3,
            textureChannel: 0,
            uiGroup: "lighting"
        },
        metallic: {
            label: "Metalness",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 3,
            textureChannel: 1,
            uiGroup: "lighting"
        },
        roughness: {
            label: "Roughness",
            defaultValue: 0,
            min: .02,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 3,
            textureChannel: 2,
            uiGroup: "lighting"
        },
        anisotropy: {
            label: "Anisotropy",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 3,
            textureChannel: 3,
            uiGroup: "lighting"
        },
        reliefGain: {
            label: "Relief Gain",
            defaultValue: 1,
            min: 0,
            max: 2,
            step: .01,
            unit: "",
            textureRow: 6,
            textureChannel: 0,
            uiGroup: "lighting"
        },
        protrusion: {
            label: "Protrusion",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 6,
            textureChannel: 3,
            uiGroup: "lighting"
        },
        metalReflectance: {
            label: "Metal Reflectance",
            defaultValue: 1,
            min: 0,
            max: 2,
            step: .01,
            unit: "",
            textureRow: 6,
            textureChannel: 1,
            uiGroup: "lighting"
        },
        metalEnvironmentTint: {
            label: "Metal Env Tint",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 6,
            textureChannel: 2,
            uiGroup: "lighting"
        },
        iridescencePower: {
            label: "Iridescence Strength",
            defaultValue: 0,
            min: 0,
            max: 1,
            step: .01,
            unit: "",
            textureRow: 4,
            textureChannel: 3,
            uiGroup: "iridescence"
        }
    };
    Object.fromEntries(Fh.map((e)=>[
            e,
            vh[e].defaultValue
        ]));
    const As = {};
    for (const e of Fh){
        const t = vh[e].uiGroup;
        As[t] || (As[t] = []), As[t].push(e);
    }
    const dg = [
        "screenXWithDepth",
        "screenYWithDepth",
        "dragonScaleU",
        "derivativeAngleSin",
        "screenX",
        "screenY",
        "iterSmooth",
        "distance"
    ];
    new Set(dg);
    const pg = [
        "off",
        "terminal",
        "sampled",
        "exact"
    ];
    new Set(pg);
    const Eg = ()=>{};
    var pc = {};
    const Mh = function(e) {
        const t = [];
        let n = 0;
        for(let r = 0; r < e.length; r++){
            let s = e.charCodeAt(r);
            s < 128 ? t[n++] = s : s < 2048 ? (t[n++] = s >> 6 | 192, t[n++] = s & 63 | 128) : (s & 64512) === 55296 && r + 1 < e.length && (e.charCodeAt(r + 1) & 64512) === 56320 ? (s = 65536 + ((s & 1023) << 10) + (e.charCodeAt(++r) & 1023), t[n++] = s >> 18 | 240, t[n++] = s >> 12 & 63 | 128, t[n++] = s >> 6 & 63 | 128, t[n++] = s & 63 | 128) : (t[n++] = s >> 12 | 224, t[n++] = s >> 6 & 63 | 128, t[n++] = s & 63 | 128);
        }
        return t;
    }, _g = function(e) {
        const t = [];
        let n = 0, r = 0;
        for(; n < e.length;){
            const s = e[n++];
            if (s < 128) t[r++] = String.fromCharCode(s);
            else if (s > 191 && s < 224) {
                const o = e[n++];
                t[r++] = String.fromCharCode((s & 31) << 6 | o & 63);
            } else if (s > 239 && s < 365) {
                const o = e[n++], a = e[n++], l = e[n++], h = ((s & 7) << 18 | (o & 63) << 12 | (a & 63) << 6 | l & 63) - 65536;
                t[r++] = String.fromCharCode(55296 + (h >> 10)), t[r++] = String.fromCharCode(56320 + (h & 1023));
            } else {
                const o = e[n++], a = e[n++];
                t[r++] = String.fromCharCode((s & 15) << 12 | (o & 63) << 6 | a & 63);
            }
        }
        return t.join("");
    }, Uh = {
        byteToCharMap_: null,
        charToByteMap_: null,
        byteToCharMapWebSafe_: null,
        charToByteMapWebSafe_: null,
        ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        get ENCODED_VALS () {
            return this.ENCODED_VALS_BASE + "+/=";
        },
        get ENCODED_VALS_WEBSAFE () {
            return this.ENCODED_VALS_BASE + "-_.";
        },
        HAS_NATIVE_SUPPORT: typeof atob == "function",
        encodeByteArray (e, t) {
            if (!Array.isArray(e)) throw Error("encodeByteArray takes an array as a parameter");
            this.init_();
            const n = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_, r = [];
            for(let s = 0; s < e.length; s += 3){
                const o = e[s], a = s + 1 < e.length, l = a ? e[s + 1] : 0, h = s + 2 < e.length, f = h ? e[s + 2] : 0, m = o >> 2, E = (o & 3) << 4 | l >> 4;
                let S = (l & 15) << 2 | f >> 6, D = f & 63;
                h || (D = 64, a || (S = 64)), r.push(n[m], n[E], n[S], n[D]);
            }
            return r.join("");
        },
        encodeString (e, t) {
            return this.HAS_NATIVE_SUPPORT && !t ? btoa(e) : this.encodeByteArray(Mh(e), t);
        },
        decodeString (e, t) {
            return this.HAS_NATIVE_SUPPORT && !t ? atob(e) : _g(this.decodeStringToByteArray(e, t));
        },
        decodeStringToByteArray (e, t) {
            this.init_();
            const n = t ? this.charToByteMapWebSafe_ : this.charToByteMap_, r = [];
            for(let s = 0; s < e.length;){
                const o = n[e.charAt(s++)], l = s < e.length ? n[e.charAt(s)] : 0;
                ++s;
                const f = s < e.length ? n[e.charAt(s)] : 64;
                ++s;
                const E = s < e.length ? n[e.charAt(s)] : 64;
                if (++s, o == null || l == null || f == null || E == null) throw new gg;
                const S = o << 2 | l >> 4;
                if (r.push(S), f !== 64) {
                    const D = l << 4 & 240 | f >> 2;
                    if (r.push(D), E !== 64) {
                        const N = f << 6 & 192 | E;
                        r.push(N);
                    }
                }
            }
            return r;
        },
        init_ () {
            if (!this.byteToCharMap_) {
                this.byteToCharMap_ = {}, this.charToByteMap_ = {}, this.byteToCharMapWebSafe_ = {}, this.charToByteMapWebSafe_ = {};
                for(let e = 0; e < this.ENCODED_VALS.length; e++)this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e), this.charToByteMap_[this.byteToCharMap_[e]] = e, this.byteToCharMapWebSafe_[e] = this.ENCODED_VALS_WEBSAFE.charAt(e), this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] = e, e >= this.ENCODED_VALS_BASE.length && (this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] = e, this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] = e);
            }
        }
    };
    class gg extends Error {
        constructor(){
            super(...arguments), this.name = "DecodeBase64StringError";
        }
    }
    const mg = function(e) {
        const t = Mh(e);
        return Uh.encodeByteArray(t, !0);
    }, xh = function(e) {
        return mg(e).replace(/\./g, "");
    }, kh = function(e) {
        try {
            return Uh.decodeString(e, !0);
        } catch (t) {
            console.error("base64Decode failed: ", t);
        }
        return null;
    };
    function Tg() {
        if (typeof self < "u") return self;
        if (typeof window < "u") return window;
        if (typeof global < "u") return global;
        throw new Error("Unable to locate global object.");
    }
    const wg = ()=>Tg().__FIREBASE_DEFAULTS__, Ag = ()=>{
        if (typeof process > "u" || typeof pc > "u") return;
        const e = pc.__FIREBASE_DEFAULTS__;
        if (e) return JSON.parse(e);
    }, Ig = ()=>{
        if (typeof document > "u") return;
        let e;
        try {
            e = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
        } catch  {
            return;
        }
        const t = e && kh(e[1]);
        return t && JSON.parse(t);
    }, yg = ()=>{
        try {
            return Eg() || wg() || Ag() || Ig();
        } catch (e) {
            console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
            return;
        }
    }, Sg = (e)=>yg()?.[`_${e}`];
    function Re() {
        return typeof navigator < "u" && typeof navigator.userAgent == "string" ? navigator.userAgent : "";
    }
    function Rg() {
        return typeof window < "u" && !!(window.cordova || window.phonegap || window.PhoneGap) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Re());
    }
    function Ng() {
        return typeof navigator < "u" && navigator.userAgent === "Cloudflare-Workers";
    }
    function Dg() {
        const e = typeof chrome == "object" ? chrome.runtime : typeof browser == "object" ? browser.runtime : void 0;
        return typeof e == "object" && e.id !== void 0;
    }
    function bg() {
        return typeof navigator == "object" && navigator.product === "ReactNative";
    }
    function Og() {
        try {
            return typeof indexedDB == "object";
        } catch  {
            return !1;
        }
    }
    function Cg() {
        return new Promise((e, t)=>{
            try {
                let n = !0;
                const r = "validate-browser-context-for-indexeddb-analytics-module", s = self.indexedDB.open(r);
                s.onsuccess = ()=>{
                    s.result.close(), n || self.indexedDB.deleteDatabase(r), e(!0);
                }, s.onupgradeneeded = ()=>{
                    n = !1;
                }, s.onerror = ()=>{
                    t(s.error?.message || "");
                };
            } catch (n) {
                t(n);
            }
        });
    }
    const Pg = "FirebaseError";
    class Ue extends Error {
        constructor(t, n, r){
            super(n), this.code = t, this.customData = r, this.name = Pg, Object.setPrototypeOf(this, Ue.prototype), Error.captureStackTrace && Error.captureStackTrace(this, xr.prototype.create);
        }
    }
    class xr {
        constructor(t, n, r){
            this.service = t, this.serviceName = n, this.errors = r;
        }
        create(t, ...n) {
            const r = n[0] || {}, s = `${this.service}/${t}`, o = this.errors[t], a = o ? Lg(o, r) : "Error", l = `${this.serviceName}: ${a} (${s}).`;
            return new Ue(s, l, r);
        }
    }
    function Lg(e, t) {
        return e.replace(Fg, (n, r)=>{
            const s = t[r];
            return s != null ? String(s) : `<${r}?>`;
        });
    }
    const Fg = /\{\$([^}]+)}/g;
    function Bh(e) {
        const t = [];
        for (const [n, r] of Object.entries(e))Array.isArray(r) ? r.forEach((s)=>{
            t.push(encodeURIComponent(n) + "=" + encodeURIComponent(s));
        }) : t.push(encodeURIComponent(n) + "=" + encodeURIComponent(r));
        return t.length ? "&" + t.join("&") : "";
    }
    function vg(e, t) {
        const n = new Mg(e, t);
        return n.subscribe.bind(n);
    }
    class Mg {
        constructor(t, n){
            this.observers = [], this.unsubscribes = [], this.observerCount = 0, this.task = Promise.resolve(), this.finalized = !1, this.onNoObservers = n, this.task.then(()=>{
                t(this);
            }).catch((r)=>{
                this.error(r);
            });
        }
        next(t) {
            this.forEachObserver((n)=>{
                n.next(t);
            });
        }
        error(t) {
            this.forEachObserver((n)=>{
                n.error(t);
            }), this.close(t);
        }
        complete() {
            this.forEachObserver((t)=>{
                t.complete();
            }), this.close();
        }
        subscribe(t, n, r) {
            let s;
            if (t === void 0 && n === void 0 && r === void 0) throw new Error("Missing Observer.");
            Ug(t, [
                "next",
                "error",
                "complete"
            ]) ? s = t : s = {
                next: t,
                error: n,
                complete: r
            }, s.next === void 0 && (s.next = Is), s.error === void 0 && (s.error = Is), s.complete === void 0 && (s.complete = Is);
            const o = this.unsubscribeOne.bind(this, this.observers.length);
            return this.finalized && this.task.then(()=>{
                try {
                    this.finalError ? s.error(this.finalError) : s.complete();
                } catch  {}
            }), this.observers.push(s), o;
        }
        unsubscribeOne(t) {
            this.observers === void 0 || this.observers[t] === void 0 || (delete this.observers[t], this.observerCount -= 1, this.observerCount === 0 && this.onNoObservers !== void 0 && this.onNoObservers(this));
        }
        forEachObserver(t) {
            if (!this.finalized) for(let n = 0; n < this.observers.length; n++)this.sendOne(n, t);
        }
        sendOne(t, n) {
            this.task.then(()=>{
                if (this.observers !== void 0 && this.observers[t] !== void 0) try {
                    n(this.observers[t]);
                } catch (r) {
                    typeof console < "u" && console.error && console.error(r);
                }
            });
        }
        close(t) {
            this.finalized || (this.finalized = !0, t !== void 0 && (this.finalError = t), this.task.then(()=>{
                this.observers = void 0, this.onNoObservers = void 0;
            }));
        }
    }
    function Ug(e, t) {
        if (typeof e != "object" || e === null) return !1;
        for (const n of t)if (n in e && typeof e[n] == "function") return !0;
        return !1;
    }
    function Is() {}
    function kr(e) {
        return e && e._delegate ? e._delegate : e;
    }
    function Vh(e) {
        try {
            return (e.startsWith("http://") || e.startsWith("https://") ? new URL(e).hostname : e).endsWith(".cloudworkstations.dev");
        } catch  {
            return !1;
        }
    }
    class An {
        constructor(t, n, r){
            this.name = t, this.instanceFactory = n, this.type = r, this.multipleInstances = !1, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
        }
        setInstantiationMode(t) {
            return this.instantiationMode = t, this;
        }
        setMultipleInstances(t) {
            return this.multipleInstances = t, this;
        }
        setServiceProps(t) {
            return this.serviceProps = t, this;
        }
        setInstanceCreatedCallback(t) {
            return this.onInstanceCreated = t, this;
        }
    }
    var st;
    (function(e) {
        e[e.DEBUG = 0] = "DEBUG", e[e.VERBOSE = 1] = "VERBOSE", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", e[e.ERROR = 4] = "ERROR", e[e.SILENT = 5] = "SILENT";
    })(st || (st = {}));
    const xg = {
        debug: st.DEBUG,
        verbose: st.VERBOSE,
        info: st.INFO,
        warn: st.WARN,
        error: st.ERROR,
        silent: st.SILENT
    }, kg = st.INFO, Bg = {
        [st.DEBUG]: "log",
        [st.VERBOSE]: "log",
        [st.INFO]: "info",
        [st.WARN]: "warn",
        [st.ERROR]: "error"
    }, Vg = (e, t, ...n)=>{
        if (t < e.logLevel) return;
        const r = new Date().toISOString(), s = Bg[t];
        if (s) console[s](`[${r}]  ${e.name}:`, ...n);
        else throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`);
    };
    class vo {
        constructor(t){
            this.name = t, this._logLevel = kg, this._logHandler = Vg, this._userLogHandler = null;
        }
        get logLevel() {
            return this._logLevel;
        }
        set logLevel(t) {
            if (!(t in st)) throw new TypeError(`Invalid value "${t}" assigned to \`logLevel\``);
            this._logLevel = t;
        }
        setLogLevel(t) {
            this._logLevel = typeof t == "string" ? xg[t] : t;
        }
        get logHandler() {
            return this._logHandler;
        }
        set logHandler(t) {
            if (typeof t != "function") throw new TypeError("Value assigned to `logHandler` must be a function");
            this._logHandler = t;
        }
        get userLogHandler() {
            return this._userLogHandler;
        }
        set userLogHandler(t) {
            this._userLogHandler = t;
        }
        debug(...t) {
            this._userLogHandler && this._userLogHandler(this, st.DEBUG, ...t), this._logHandler(this, st.DEBUG, ...t);
        }
        log(...t) {
            this._userLogHandler && this._userLogHandler(this, st.VERBOSE, ...t), this._logHandler(this, st.VERBOSE, ...t);
        }
        info(...t) {
            this._userLogHandler && this._userLogHandler(this, st.INFO, ...t), this._logHandler(this, st.INFO, ...t);
        }
        warn(...t) {
            this._userLogHandler && this._userLogHandler(this, st.WARN, ...t), this._logHandler(this, st.WARN, ...t);
        }
        error(...t) {
            this._userLogHandler && this._userLogHandler(this, st.ERROR, ...t), this._logHandler(this, st.ERROR, ...t);
        }
    }
    const Hg = (e, t)=>t.some((n)=>e instanceof n);
    let Ec, _c;
    function Gg() {
        return Ec || (Ec = [
            IDBDatabase,
            IDBObjectStore,
            IDBIndex,
            IDBCursor,
            IDBTransaction
        ]);
    }
    function zg() {
        return _c || (_c = [
            IDBCursor.prototype.advance,
            IDBCursor.prototype.continue,
            IDBCursor.prototype.continuePrimaryKey
        ]);
    }
    const Hh = new WeakMap, no = new WeakMap, Gh = new WeakMap, ys = new WeakMap, Mo = new WeakMap;
    function Xg(e) {
        const t = new Promise((n, r)=>{
            const s = ()=>{
                e.removeEventListener("success", o), e.removeEventListener("error", a);
            }, o = ()=>{
                n(Ke(e.result)), s();
            }, a = ()=>{
                r(e.error), s();
            };
            e.addEventListener("success", o), e.addEventListener("error", a);
        });
        return t.then((n)=>{
            n instanceof IDBCursor && Hh.set(n, e);
        }).catch(()=>{}), Mo.set(t, e), t;
    }
    function Yg(e) {
        if (no.has(e)) return;
        const t = new Promise((n, r)=>{
            const s = ()=>{
                e.removeEventListener("complete", o), e.removeEventListener("error", a), e.removeEventListener("abort", a);
            }, o = ()=>{
                n(), s();
            }, a = ()=>{
                r(e.error || new DOMException("AbortError", "AbortError")), s();
            };
            e.addEventListener("complete", o), e.addEventListener("error", a), e.addEventListener("abort", a);
        });
        no.set(e, t);
    }
    let ro = {
        get (e, t, n) {
            if (e instanceof IDBTransaction) {
                if (t === "done") return no.get(e);
                if (t === "objectStoreNames") return e.objectStoreNames || Gh.get(e);
                if (t === "store") return n.objectStoreNames[1] ? void 0 : n.objectStore(n.objectStoreNames[0]);
            }
            return Ke(e[t]);
        },
        set (e, t, n) {
            return e[t] = n, !0;
        },
        has (e, t) {
            return e instanceof IDBTransaction && (t === "done" || t === "store") ? !0 : t in e;
        }
    };
    function jg(e) {
        ro = e(ro);
    }
    function Wg(e) {
        return e === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype) ? function(t, ...n) {
            const r = e.call(Ss(this), t, ...n);
            return Gh.set(r, t.sort ? t.sort() : [
                t
            ]), Ke(r);
        } : zg().includes(e) ? function(...t) {
            return e.apply(Ss(this), t), Ke(Hh.get(this));
        } : function(...t) {
            return Ke(e.apply(Ss(this), t));
        };
    }
    function Zg(e) {
        return typeof e == "function" ? Wg(e) : (e instanceof IDBTransaction && Yg(e), Hg(e, Gg()) ? new Proxy(e, ro) : e);
    }
    function Ke(e) {
        if (e instanceof IDBRequest) return Xg(e);
        if (ys.has(e)) return ys.get(e);
        const t = Zg(e);
        return t !== e && (ys.set(e, t), Mo.set(t, e)), t;
    }
    const Ss = (e)=>Mo.get(e);
    function Kg(e, t, { blocked: n, upgrade: r, blocking: s, terminated: o } = {}) {
        const a = indexedDB.open(e, t), l = Ke(a);
        return r && a.addEventListener("upgradeneeded", (h)=>{
            r(Ke(a.result), h.oldVersion, h.newVersion, Ke(a.transaction), h);
        }), n && a.addEventListener("blocked", (h)=>n(h.oldVersion, h.newVersion, h)), l.then((h)=>{
            o && h.addEventListener("close", ()=>o()), s && h.addEventListener("versionchange", (f)=>s(f.oldVersion, f.newVersion, f));
        }).catch(()=>{}), l;
    }
    const qg = [
        "get",
        "getKey",
        "getAll",
        "getAllKeys",
        "count"
    ], Jg = [
        "put",
        "add",
        "delete",
        "clear"
    ], Rs = new Map;
    function gc(e, t) {
        if (!(e instanceof IDBDatabase && !(t in e) && typeof t == "string")) return;
        if (Rs.get(t)) return Rs.get(t);
        const n = t.replace(/FromIndex$/, ""), r = t !== n, s = Jg.includes(n);
        if (!(n in (r ? IDBIndex : IDBObjectStore).prototype) || !(s || qg.includes(n))) return;
        const o = async function(a, ...l) {
            const h = this.transaction(a, s ? "readwrite" : "readonly");
            let f = h.store;
            return r && (f = f.index(l.shift())), (await Promise.all([
                f[n](...l),
                s && h.done
            ]))[0];
        };
        return Rs.set(t, o), o;
    }
    jg((e)=>({
            ...e,
            get: (t, n, r)=>gc(t, n) || e.get(t, n, r),
            has: (t, n)=>!!gc(t, n) || e.has(t, n)
        }));
    class Qg {
        constructor(t){
            this.container = t;
        }
        getPlatformInfoString() {
            return this.container.getProviders().map((n)=>{
                if ($g(n)) {
                    const r = n.getImmediate();
                    return `${r.library}/${r.version}`;
                } else return null;
            }).filter((n)=>n).join(" ");
        }
    }
    function $g(e) {
        return e.getComponent()?.type === "VERSION";
    }
    const io = "@firebase/app", mc = "0.14.13";
    const Me = new vo("@firebase/app"), tm = "@firebase/app-compat", em = "@firebase/analytics-compat", nm = "@firebase/analytics", rm = "@firebase/app-check-compat", im = "@firebase/app-check", sm = "@firebase/auth", om = "@firebase/auth-compat", am = "@firebase/database", cm = "@firebase/data-connect", lm = "@firebase/database-compat", um = "@firebase/functions", hm = "@firebase/functions-compat", fm = "@firebase/installations", dm = "@firebase/installations-compat", pm = "@firebase/messaging", Em = "@firebase/messaging-compat", _m = "@firebase/performance", gm = "@firebase/performance-compat", mm = "@firebase/remote-config", Tm = "@firebase/remote-config-compat", wm = "@firebase/storage", Am = "@firebase/storage-compat", Im = "@firebase/firestore", ym = "@firebase/ai", Sm = "@firebase/firestore-compat", Rm = "firebase", Nm = "12.14.0", Dm = {
        [io]: "fire-core",
        [tm]: "fire-core-compat",
        [nm]: "fire-analytics",
        [em]: "fire-analytics-compat",
        [im]: "fire-app-check",
        [rm]: "fire-app-check-compat",
        [sm]: "fire-auth",
        [om]: "fire-auth-compat",
        [am]: "fire-rtdb",
        [cm]: "fire-data-connect",
        [lm]: "fire-rtdb-compat",
        [um]: "fire-fn",
        [hm]: "fire-fn-compat",
        [fm]: "fire-iid",
        [dm]: "fire-iid-compat",
        [pm]: "fire-fcm",
        [Em]: "fire-fcm-compat",
        [_m]: "fire-perf",
        [gm]: "fire-perf-compat",
        [mm]: "fire-rc",
        [Tm]: "fire-rc-compat",
        [wm]: "fire-gcs",
        [Am]: "fire-gcs-compat",
        [Im]: "fire-fst",
        [Sm]: "fire-fst-compat",
        [ym]: "fire-vertex",
        "fire-js": "fire-js",
        [Rm]: "fire-js-all"
    };
    const bm = new Map, Om = new Map, Tc = new Map;
    function wc(e, t) {
        try {
            e.container.addComponent(t);
        } catch (n) {
            Me.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`, n);
        }
    }
    function In(e) {
        const t = e.name;
        if (Tc.has(t)) return Me.debug(`There were multiple attempts to register component ${t}.`), !1;
        Tc.set(t, e);
        for (const n of bm.values())wc(n, e);
        for (const n of Om.values())wc(n, e);
        return !0;
    }
    function je(e) {
        return e == null ? !1 : e.settings !== void 0;
    }
    const Cm = {
        "no-app": "No Firebase App '{$appName}' has been created - call initializeApp() first",
        "bad-app-name": "Illegal App name: '{$appName}'",
        "duplicate-app": "Firebase App named '{$appName}' already exists with different options or config",
        "app-deleted": "Firebase App named '{$appName}' already deleted",
        "server-app-deleted": "Firebase Server App has been deleted",
        "no-options": "Need to provide options, when not being deployed to hosting via source.",
        "invalid-app-argument": "firebase.{$appName}() takes either no argument or a Firebase App instance.",
        "invalid-log-argument": "First argument to `onLog` must be null or a function.",
        "idb-open": "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
        "idb-get": "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
        "idb-set": "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
        "idb-delete": "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
        "finalization-registry-not-supported": "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
        "invalid-server-app-environment": "FirebaseServerApp is not for use in browser environments."
    }, Uo = new xr("app", "Firebase", Cm);
    const Br = Nm;
    function ye(e, t, n) {
        let r = Dm[e] ?? e;
        n && (r += `-${n}`);
        const s = r.match(/\s|\//), o = t.match(/\s|\//);
        if (s || o) {
            const a = [
                `Unable to register library "${r}" with version "${t}":`
            ];
            s && a.push(`library name "${r}" contains illegal characters (whitespace or "/")`), s && o && a.push("and"), o && a.push(`version name "${t}" contains illegal characters (whitespace or "/")`), Me.warn(a.join(" "));
            return;
        }
        In(new An(`${r}-version`, ()=>({
                library: r,
                version: t
            }), "VERSION"));
    }
    const Pm = "firebase-heartbeat-database", Lm = 1, Fr = "firebase-heartbeat-store";
    let Ns = null;
    function zh() {
        return Ns || (Ns = Kg(Pm, Lm, {
            upgrade: (e, t)=>{
                switch(t){
                    case 0:
                        try {
                            e.createObjectStore(Fr);
                        } catch (n) {
                            console.warn(n);
                        }
                }
            }
        }).catch((e)=>{
            throw Uo.create("idb-open", {
                originalErrorMessage: e.message
            });
        })), Ns;
    }
    async function Fm(e) {
        try {
            const n = (await zh()).transaction(Fr), r = await n.objectStore(Fr).get(Xh(e));
            return await n.done, r;
        } catch (t) {
            if (t instanceof Ue) Me.warn(t.message);
            else {
                const n = Uo.create("idb-get", {
                    originalErrorMessage: t?.message
                });
                Me.warn(n.message);
            }
        }
    }
    async function Ac(e, t) {
        try {
            const r = (await zh()).transaction(Fr, "readwrite");
            await r.objectStore(Fr).put(t, Xh(e)), await r.done;
        } catch (n) {
            if (n instanceof Ue) Me.warn(n.message);
            else {
                const r = Uo.create("idb-set", {
                    originalErrorMessage: n?.message
                });
                Me.warn(r.message);
            }
        }
    }
    function Xh(e) {
        return `${e.name}!${e.options.appId}`;
    }
    const vm = 1024, Mm = 30;
    class Um {
        constructor(t){
            this.container = t, this._heartbeatsCache = null;
            const n = this.container.getProvider("app").getImmediate();
            this._storage = new km(n), this._heartbeatsCachePromise = this._storage.read().then((r)=>(this._heartbeatsCache = r, r));
        }
        async triggerHeartbeat() {
            try {
                const n = this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(), r = Ic();
                if (this._heartbeatsCache?.heartbeats == null && (this._heartbeatsCache = await this._heartbeatsCachePromise, this._heartbeatsCache?.heartbeats == null) || this._heartbeatsCache.lastSentHeartbeatDate === r || this._heartbeatsCache.heartbeats.some((s)=>s.date === r)) return;
                if (this._heartbeatsCache.heartbeats.push({
                    date: r,
                    agent: n
                }), this._heartbeatsCache.heartbeats.length > Mm) {
                    const s = Bm(this._heartbeatsCache.heartbeats);
                    this._heartbeatsCache.heartbeats.splice(s, 1);
                }
                return this._storage.overwrite(this._heartbeatsCache);
            } catch (t) {
                Me.warn(t);
            }
        }
        async getHeartbeatsHeader() {
            try {
                if (this._heartbeatsCache === null && await this._heartbeatsCachePromise, this._heartbeatsCache?.heartbeats == null || this._heartbeatsCache.heartbeats.length === 0) return "";
                const t = Ic(), { heartbeatsToSend: n, unsentEntries: r } = xm(this._heartbeatsCache.heartbeats), s = xh(JSON.stringify({
                    version: 2,
                    heartbeats: n
                }));
                return this._heartbeatsCache.lastSentHeartbeatDate = t, r.length > 0 ? (this._heartbeatsCache.heartbeats = r, await this._storage.overwrite(this._heartbeatsCache)) : (this._heartbeatsCache.heartbeats = [], this._storage.overwrite(this._heartbeatsCache)), s;
            } catch (t) {
                return Me.warn(t), "";
            }
        }
    }
    function Ic() {
        return new Date().toISOString().substring(0, 10);
    }
    function xm(e, t = vm) {
        const n = [];
        let r = e.slice();
        for (const s of e){
            const o = n.find((a)=>a.agent === s.agent);
            if (o) {
                if (o.dates.push(s.date), yc(n) > t) {
                    o.dates.pop();
                    break;
                }
            } else if (n.push({
                agent: s.agent,
                dates: [
                    s.date
                ]
            }), yc(n) > t) {
                n.pop();
                break;
            }
            r = r.slice(1);
        }
        return {
            heartbeatsToSend: n,
            unsentEntries: r
        };
    }
    class km {
        constructor(t){
            this.app = t, this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
        }
        async runIndexedDBEnvironmentCheck() {
            return Og() ? Cg().then(()=>!0).catch(()=>!1) : !1;
        }
        async read() {
            if (await this._canUseIndexedDBPromise) {
                const n = await Fm(this.app);
                return n?.heartbeats ? n : {
                    heartbeats: []
                };
            } else return {
                heartbeats: []
            };
        }
        async overwrite(t) {
            if (await this._canUseIndexedDBPromise) {
                const r = await this.read();
                return Ac(this.app, {
                    lastSentHeartbeatDate: t.lastSentHeartbeatDate ?? r.lastSentHeartbeatDate,
                    heartbeats: t.heartbeats
                });
            } else return;
        }
        async add(t) {
            if (await this._canUseIndexedDBPromise) {
                const r = await this.read();
                return Ac(this.app, {
                    lastSentHeartbeatDate: t.lastSentHeartbeatDate ?? r.lastSentHeartbeatDate,
                    heartbeats: [
                        ...r.heartbeats,
                        ...t.heartbeats
                    ]
                });
            } else return;
        }
    }
    function yc(e) {
        return xh(JSON.stringify({
            version: 2,
            heartbeats: e
        })).length;
    }
    function Bm(e) {
        if (e.length === 0) return -1;
        let t = 0, n = e[0].date;
        for(let r = 1; r < e.length; r++)e[r].date < n && (n = e[r].date, t = r);
        return t;
    }
    function Vm(e) {
        In(new An("platform-logger", (t)=>new Qg(t), "PRIVATE")), In(new An("heartbeat", (t)=>new Um(t), "PRIVATE")), ye(io, mc, e), ye(io, mc, "esm2020"), ye("fire-js", "");
    }
    Vm("");
    var Sc = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
    var xo;
    (function() {
        var e;
        function t(T, p) {
            function _() {}
            _.prototype = p.prototype, T.F = p.prototype, T.prototype = new _, T.prototype.constructor = T, T.D = function(w, A, y) {
                for(var g = Array(arguments.length - 2), H = 2; H < arguments.length; H++)g[H - 2] = arguments[H];
                return p.prototype[A].apply(w, g);
            };
        }
        function n() {
            this.blockSize = -1;
        }
        function r() {
            this.blockSize = -1, this.blockSize = 64, this.g = Array(4), this.C = Array(this.blockSize), this.o = this.h = 0, this.u();
        }
        t(r, n), r.prototype.u = function() {
            this.g[0] = 1732584193, this.g[1] = 4023233417, this.g[2] = 2562383102, this.g[3] = 271733878, this.o = this.h = 0;
        };
        function s(T, p, _) {
            _ || (_ = 0);
            const w = Array(16);
            if (typeof p == "string") for(var A = 0; A < 16; ++A)w[A] = p.charCodeAt(_++) | p.charCodeAt(_++) << 8 | p.charCodeAt(_++) << 16 | p.charCodeAt(_++) << 24;
            else for(A = 0; A < 16; ++A)w[A] = p[_++] | p[_++] << 8 | p[_++] << 16 | p[_++] << 24;
            p = T.g[0], _ = T.g[1], A = T.g[2];
            let y = T.g[3], g;
            g = p + (y ^ _ & (A ^ y)) + w[0] + 3614090360 & 4294967295, p = _ + (g << 7 & 4294967295 | g >>> 25), g = y + (A ^ p & (_ ^ A)) + w[1] + 3905402710 & 4294967295, y = p + (g << 12 & 4294967295 | g >>> 20), g = A + (_ ^ y & (p ^ _)) + w[2] + 606105819 & 4294967295, A = y + (g << 17 & 4294967295 | g >>> 15), g = _ + (p ^ A & (y ^ p)) + w[3] + 3250441966 & 4294967295, _ = A + (g << 22 & 4294967295 | g >>> 10), g = p + (y ^ _ & (A ^ y)) + w[4] + 4118548399 & 4294967295, p = _ + (g << 7 & 4294967295 | g >>> 25), g = y + (A ^ p & (_ ^ A)) + w[5] + 1200080426 & 4294967295, y = p + (g << 12 & 4294967295 | g >>> 20), g = A + (_ ^ y & (p ^ _)) + w[6] + 2821735955 & 4294967295, A = y + (g << 17 & 4294967295 | g >>> 15), g = _ + (p ^ A & (y ^ p)) + w[7] + 4249261313 & 4294967295, _ = A + (g << 22 & 4294967295 | g >>> 10), g = p + (y ^ _ & (A ^ y)) + w[8] + 1770035416 & 4294967295, p = _ + (g << 7 & 4294967295 | g >>> 25), g = y + (A ^ p & (_ ^ A)) + w[9] + 2336552879 & 4294967295, y = p + (g << 12 & 4294967295 | g >>> 20), g = A + (_ ^ y & (p ^ _)) + w[10] + 4294925233 & 4294967295, A = y + (g << 17 & 4294967295 | g >>> 15), g = _ + (p ^ A & (y ^ p)) + w[11] + 2304563134 & 4294967295, _ = A + (g << 22 & 4294967295 | g >>> 10), g = p + (y ^ _ & (A ^ y)) + w[12] + 1804603682 & 4294967295, p = _ + (g << 7 & 4294967295 | g >>> 25), g = y + (A ^ p & (_ ^ A)) + w[13] + 4254626195 & 4294967295, y = p + (g << 12 & 4294967295 | g >>> 20), g = A + (_ ^ y & (p ^ _)) + w[14] + 2792965006 & 4294967295, A = y + (g << 17 & 4294967295 | g >>> 15), g = _ + (p ^ A & (y ^ p)) + w[15] + 1236535329 & 4294967295, _ = A + (g << 22 & 4294967295 | g >>> 10), g = p + (A ^ y & (_ ^ A)) + w[1] + 4129170786 & 4294967295, p = _ + (g << 5 & 4294967295 | g >>> 27), g = y + (_ ^ A & (p ^ _)) + w[6] + 3225465664 & 4294967295, y = p + (g << 9 & 4294967295 | g >>> 23), g = A + (p ^ _ & (y ^ p)) + w[11] + 643717713 & 4294967295, A = y + (g << 14 & 4294967295 | g >>> 18), g = _ + (y ^ p & (A ^ y)) + w[0] + 3921069994 & 4294967295, _ = A + (g << 20 & 4294967295 | g >>> 12), g = p + (A ^ y & (_ ^ A)) + w[5] + 3593408605 & 4294967295, p = _ + (g << 5 & 4294967295 | g >>> 27), g = y + (_ ^ A & (p ^ _)) + w[10] + 38016083 & 4294967295, y = p + (g << 9 & 4294967295 | g >>> 23), g = A + (p ^ _ & (y ^ p)) + w[15] + 3634488961 & 4294967295, A = y + (g << 14 & 4294967295 | g >>> 18), g = _ + (y ^ p & (A ^ y)) + w[4] + 3889429448 & 4294967295, _ = A + (g << 20 & 4294967295 | g >>> 12), g = p + (A ^ y & (_ ^ A)) + w[9] + 568446438 & 4294967295, p = _ + (g << 5 & 4294967295 | g >>> 27), g = y + (_ ^ A & (p ^ _)) + w[14] + 3275163606 & 4294967295, y = p + (g << 9 & 4294967295 | g >>> 23), g = A + (p ^ _ & (y ^ p)) + w[3] + 4107603335 & 4294967295, A = y + (g << 14 & 4294967295 | g >>> 18), g = _ + (y ^ p & (A ^ y)) + w[8] + 1163531501 & 4294967295, _ = A + (g << 20 & 4294967295 | g >>> 12), g = p + (A ^ y & (_ ^ A)) + w[13] + 2850285829 & 4294967295, p = _ + (g << 5 & 4294967295 | g >>> 27), g = y + (_ ^ A & (p ^ _)) + w[2] + 4243563512 & 4294967295, y = p + (g << 9 & 4294967295 | g >>> 23), g = A + (p ^ _ & (y ^ p)) + w[7] + 1735328473 & 4294967295, A = y + (g << 14 & 4294967295 | g >>> 18), g = _ + (y ^ p & (A ^ y)) + w[12] + 2368359562 & 4294967295, _ = A + (g << 20 & 4294967295 | g >>> 12), g = p + (_ ^ A ^ y) + w[5] + 4294588738 & 4294967295, p = _ + (g << 4 & 4294967295 | g >>> 28), g = y + (p ^ _ ^ A) + w[8] + 2272392833 & 4294967295, y = p + (g << 11 & 4294967295 | g >>> 21), g = A + (y ^ p ^ _) + w[11] + 1839030562 & 4294967295, A = y + (g << 16 & 4294967295 | g >>> 16), g = _ + (A ^ y ^ p) + w[14] + 4259657740 & 4294967295, _ = A + (g << 23 & 4294967295 | g >>> 9), g = p + (_ ^ A ^ y) + w[1] + 2763975236 & 4294967295, p = _ + (g << 4 & 4294967295 | g >>> 28), g = y + (p ^ _ ^ A) + w[4] + 1272893353 & 4294967295, y = p + (g << 11 & 4294967295 | g >>> 21), g = A + (y ^ p ^ _) + w[7] + 4139469664 & 4294967295, A = y + (g << 16 & 4294967295 | g >>> 16), g = _ + (A ^ y ^ p) + w[10] + 3200236656 & 4294967295, _ = A + (g << 23 & 4294967295 | g >>> 9), g = p + (_ ^ A ^ y) + w[13] + 681279174 & 4294967295, p = _ + (g << 4 & 4294967295 | g >>> 28), g = y + (p ^ _ ^ A) + w[0] + 3936430074 & 4294967295, y = p + (g << 11 & 4294967295 | g >>> 21), g = A + (y ^ p ^ _) + w[3] + 3572445317 & 4294967295, A = y + (g << 16 & 4294967295 | g >>> 16), g = _ + (A ^ y ^ p) + w[6] + 76029189 & 4294967295, _ = A + (g << 23 & 4294967295 | g >>> 9), g = p + (_ ^ A ^ y) + w[9] + 3654602809 & 4294967295, p = _ + (g << 4 & 4294967295 | g >>> 28), g = y + (p ^ _ ^ A) + w[12] + 3873151461 & 4294967295, y = p + (g << 11 & 4294967295 | g >>> 21), g = A + (y ^ p ^ _) + w[15] + 530742520 & 4294967295, A = y + (g << 16 & 4294967295 | g >>> 16), g = _ + (A ^ y ^ p) + w[2] + 3299628645 & 4294967295, _ = A + (g << 23 & 4294967295 | g >>> 9), g = p + (A ^ (_ | ~y)) + w[0] + 4096336452 & 4294967295, p = _ + (g << 6 & 4294967295 | g >>> 26), g = y + (_ ^ (p | ~A)) + w[7] + 1126891415 & 4294967295, y = p + (g << 10 & 4294967295 | g >>> 22), g = A + (p ^ (y | ~_)) + w[14] + 2878612391 & 4294967295, A = y + (g << 15 & 4294967295 | g >>> 17), g = _ + (y ^ (A | ~p)) + w[5] + 4237533241 & 4294967295, _ = A + (g << 21 & 4294967295 | g >>> 11), g = p + (A ^ (_ | ~y)) + w[12] + 1700485571 & 4294967295, p = _ + (g << 6 & 4294967295 | g >>> 26), g = y + (_ ^ (p | ~A)) + w[3] + 2399980690 & 4294967295, y = p + (g << 10 & 4294967295 | g >>> 22), g = A + (p ^ (y | ~_)) + w[10] + 4293915773 & 4294967295, A = y + (g << 15 & 4294967295 | g >>> 17), g = _ + (y ^ (A | ~p)) + w[1] + 2240044497 & 4294967295, _ = A + (g << 21 & 4294967295 | g >>> 11), g = p + (A ^ (_ | ~y)) + w[8] + 1873313359 & 4294967295, p = _ + (g << 6 & 4294967295 | g >>> 26), g = y + (_ ^ (p | ~A)) + w[15] + 4264355552 & 4294967295, y = p + (g << 10 & 4294967295 | g >>> 22), g = A + (p ^ (y | ~_)) + w[6] + 2734768916 & 4294967295, A = y + (g << 15 & 4294967295 | g >>> 17), g = _ + (y ^ (A | ~p)) + w[13] + 1309151649 & 4294967295, _ = A + (g << 21 & 4294967295 | g >>> 11), g = p + (A ^ (_ | ~y)) + w[4] + 4149444226 & 4294967295, p = _ + (g << 6 & 4294967295 | g >>> 26), g = y + (_ ^ (p | ~A)) + w[11] + 3174756917 & 4294967295, y = p + (g << 10 & 4294967295 | g >>> 22), g = A + (p ^ (y | ~_)) + w[2] + 718787259 & 4294967295, A = y + (g << 15 & 4294967295 | g >>> 17), g = _ + (y ^ (A | ~p)) + w[9] + 3951481745 & 4294967295, T.g[0] = T.g[0] + p & 4294967295, T.g[1] = T.g[1] + (A + (g << 21 & 4294967295 | g >>> 11)) & 4294967295, T.g[2] = T.g[2] + A & 4294967295, T.g[3] = T.g[3] + y & 4294967295;
        }
        r.prototype.v = function(T, p) {
            p === void 0 && (p = T.length);
            const _ = p - this.blockSize, w = this.C;
            let A = this.h, y = 0;
            for(; y < p;){
                if (A == 0) for(; y <= _;)s(this, T, y), y += this.blockSize;
                if (typeof T == "string") {
                    for(; y < p;)if (w[A++] = T.charCodeAt(y++), A == this.blockSize) {
                        s(this, w), A = 0;
                        break;
                    }
                } else for(; y < p;)if (w[A++] = T[y++], A == this.blockSize) {
                    s(this, w), A = 0;
                    break;
                }
            }
            this.h = A, this.o += p;
        }, r.prototype.A = function() {
            var T = Array((this.h < 56 ? this.blockSize : this.blockSize * 2) - this.h);
            T[0] = 128;
            for(var p = 1; p < T.length - 8; ++p)T[p] = 0;
            p = this.o * 8;
            for(var _ = T.length - 8; _ < T.length; ++_)T[_] = p & 255, p /= 256;
            for(this.v(T), T = Array(16), p = 0, _ = 0; _ < 4; ++_)for(let w = 0; w < 32; w += 8)T[p++] = this.g[_] >>> w & 255;
            return T;
        };
        function o(T, p) {
            var _ = l;
            return Object.prototype.hasOwnProperty.call(_, T) ? _[T] : _[T] = p(T);
        }
        function a(T, p) {
            this.h = p;
            const _ = [];
            let w = !0;
            for(let A = T.length - 1; A >= 0; A--){
                const y = T[A] | 0;
                w && y == p || (_[A] = y, w = !1);
            }
            this.g = _;
        }
        var l = {};
        function h(T) {
            return -128 <= T && T < 128 ? o(T, function(p) {
                return new a([
                    p | 0
                ], p < 0 ? -1 : 0);
            }) : new a([
                T | 0
            ], T < 0 ? -1 : 0);
        }
        function f(T) {
            if (isNaN(T) || !isFinite(T)) return E;
            if (T < 0) return I(f(-T));
            const p = [];
            let _ = 1;
            for(let w = 0; T >= _; w++)p[w] = T / _ | 0, _ *= 4294967296;
            return new a(p, 0);
        }
        function m(T, p) {
            if (T.length == 0) throw Error("number format error: empty string");
            if (p = p || 10, p < 2 || 36 < p) throw Error("radix out of range: " + p);
            if (T.charAt(0) == "-") return I(m(T.substring(1), p));
            if (T.indexOf("-") >= 0) throw Error('number format error: interior "-" character');
            const _ = f(Math.pow(p, 8));
            let w = E;
            for(let y = 0; y < T.length; y += 8){
                var A = Math.min(8, T.length - y);
                const g = parseInt(T.substring(y, y + A), p);
                A < 8 ? (A = f(Math.pow(p, A)), w = w.j(A).add(f(g))) : (w = w.j(_), w = w.add(f(g)));
            }
            return w;
        }
        var E = h(0), S = h(1), D = h(16777216);
        e = a.prototype, e.m = function() {
            if (R(this)) return -I(this).m();
            let T = 0, p = 1;
            for(let _ = 0; _ < this.g.length; _++){
                const w = this.i(_);
                T += (w >= 0 ? w : 4294967296 + w) * p, p *= 4294967296;
            }
            return T;
        }, e.toString = function(T) {
            if (T = T || 10, T < 2 || 36 < T) throw Error("radix out of range: " + T);
            if (N(this)) return "0";
            if (R(this)) return "-" + I(this).toString(T);
            const p = f(Math.pow(T, 6));
            var _ = this;
            let w = "";
            for(;;){
                const A = v(_, p).g;
                _ = P(_, A.j(p));
                let y = ((_.g.length > 0 ? _.g[0] : _.h) >>> 0).toString(T);
                if (_ = A, N(_)) return y + w;
                for(; y.length < 6;)y = "0" + y;
                w = y + w;
            }
        }, e.i = function(T) {
            return T < 0 ? 0 : T < this.g.length ? this.g[T] : this.h;
        };
        function N(T) {
            if (T.h != 0) return !1;
            for(let p = 0; p < T.g.length; p++)if (T.g[p] != 0) return !1;
            return !0;
        }
        function R(T) {
            return T.h == -1;
        }
        e.l = function(T) {
            return T = P(this, T), R(T) ? -1 : N(T) ? 0 : 1;
        };
        function I(T) {
            const p = T.g.length, _ = [];
            for(let w = 0; w < p; w++)_[w] = ~T.g[w];
            return new a(_, ~T.h).add(S);
        }
        e.abs = function() {
            return R(this) ? I(this) : this;
        }, e.add = function(T) {
            const p = Math.max(this.g.length, T.g.length), _ = [];
            let w = 0;
            for(let A = 0; A <= p; A++){
                let y = w + (this.i(A) & 65535) + (T.i(A) & 65535), g = (y >>> 16) + (this.i(A) >>> 16) + (T.i(A) >>> 16);
                w = g >>> 16, y &= 65535, g &= 65535, _[A] = g << 16 | y;
            }
            return new a(_, _[_.length - 1] & -2147483648 ? -1 : 0);
        };
        function P(T, p) {
            return T.add(I(p));
        }
        e.j = function(T) {
            if (N(this) || N(T)) return E;
            if (R(this)) return R(T) ? I(this).j(I(T)) : I(I(this).j(T));
            if (R(T)) return I(this.j(I(T)));
            if (this.l(D) < 0 && T.l(D) < 0) return f(this.m() * T.m());
            const p = this.g.length + T.g.length, _ = [];
            for(var w = 0; w < 2 * p; w++)_[w] = 0;
            for(w = 0; w < this.g.length; w++)for(let A = 0; A < T.g.length; A++){
                const y = this.i(w) >>> 16, g = this.i(w) & 65535, H = T.i(A) >>> 16, $ = T.i(A) & 65535;
                _[2 * w + 2 * A] += g * $, F(_, 2 * w + 2 * A), _[2 * w + 2 * A + 1] += y * $, F(_, 2 * w + 2 * A + 1), _[2 * w + 2 * A + 1] += g * H, F(_, 2 * w + 2 * A + 1), _[2 * w + 2 * A + 2] += y * H, F(_, 2 * w + 2 * A + 2);
            }
            for(T = 0; T < p; T++)_[T] = _[2 * T + 1] << 16 | _[2 * T];
            for(T = p; T < 2 * p; T++)_[T] = 0;
            return new a(_, 0);
        };
        function F(T, p) {
            for(; (T[p] & 65535) != T[p];)T[p + 1] += T[p] >>> 16, T[p] &= 65535, p++;
        }
        function L(T, p) {
            this.g = T, this.h = p;
        }
        function v(T, p) {
            if (N(p)) throw Error("division by zero");
            if (N(T)) return new L(E, E);
            if (R(T)) return p = v(I(T), p), new L(I(p.g), I(p.h));
            if (R(p)) return p = v(T, I(p)), new L(I(p.g), p.h);
            if (T.g.length > 30) {
                if (R(T) || R(p)) throw Error("slowDivide_ only works with positive integers.");
                for(var _ = S, w = p; w.l(T) <= 0;)_ = M(_), w = M(w);
                var A = U(_, 1), y = U(w, 1);
                for(w = U(w, 2), _ = U(_, 2); !N(w);){
                    var g = y.add(w);
                    g.l(T) <= 0 && (A = A.add(_), y = g), w = U(w, 1), _ = U(_, 1);
                }
                return p = P(T, A.j(p)), new L(A, p);
            }
            for(A = E; T.l(p) >= 0;){
                for(_ = Math.max(1, Math.floor(T.m() / p.m())), w = Math.ceil(Math.log(_) / Math.LN2), w = w <= 48 ? 1 : Math.pow(2, w - 48), y = f(_), g = y.j(p); R(g) || g.l(T) > 0;)_ -= w, y = f(_), g = y.j(p);
                N(y) && (y = S), A = A.add(y), T = P(T, g);
            }
            return new L(A, T);
        }
        e.B = function(T) {
            return v(this, T).h;
        }, e.and = function(T) {
            const p = Math.max(this.g.length, T.g.length), _ = [];
            for(let w = 0; w < p; w++)_[w] = this.i(w) & T.i(w);
            return new a(_, this.h & T.h);
        }, e.or = function(T) {
            const p = Math.max(this.g.length, T.g.length), _ = [];
            for(let w = 0; w < p; w++)_[w] = this.i(w) | T.i(w);
            return new a(_, this.h | T.h);
        }, e.xor = function(T) {
            const p = Math.max(this.g.length, T.g.length), _ = [];
            for(let w = 0; w < p; w++)_[w] = this.i(w) ^ T.i(w);
            return new a(_, this.h ^ T.h);
        };
        function M(T) {
            const p = T.g.length + 1, _ = [];
            for(let w = 0; w < p; w++)_[w] = T.i(w) << 1 | T.i(w - 1) >>> 31;
            return new a(_, T.h);
        }
        function U(T, p) {
            const _ = p >> 5;
            p %= 32;
            const w = T.g.length - _, A = [];
            for(let y = 0; y < w; y++)A[y] = p > 0 ? T.i(y + _) >>> p | T.i(y + _ + 1) << 32 - p : T.i(y + _);
            return new a(A, T.h);
        }
        r.prototype.digest = r.prototype.A, r.prototype.reset = r.prototype.u, r.prototype.update = r.prototype.v, a.prototype.add = a.prototype.add, a.prototype.multiply = a.prototype.j, a.prototype.modulo = a.prototype.B, a.prototype.compare = a.prototype.l, a.prototype.toNumber = a.prototype.m, a.prototype.toString = a.prototype.toString, a.prototype.getBits = a.prototype.i, a.fromNumber = f, a.fromString = m, xo = a;
    }).apply(typeof Sc < "u" ? Sc : typeof self < "u" ? self : typeof window < "u" ? window : {});
    var ni = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
    (function() {
        var e, t = Object.defineProperty;
        function n(i) {
            i = [
                typeof globalThis == "object" && globalThis,
                i,
                typeof window == "object" && window,
                typeof self == "object" && self,
                typeof ni == "object" && ni
            ];
            for(var c = 0; c < i.length; ++c){
                var u = i[c];
                if (u && u.Math == Math) return u;
            }
            throw Error("Cannot find global object");
        }
        var r = n(this);
        function s(i, c) {
            if (c) t: {
                var u = r;
                i = i.split(".");
                for(var d = 0; d < i.length - 1; d++){
                    var b = i[d];
                    if (!(b in u)) break t;
                    u = u[b];
                }
                i = i[i.length - 1], d = u[i], c = c(d), c != d && c != null && t(u, i, {
                    configurable: !0,
                    writable: !0,
                    value: c
                });
            }
        }
        s("Symbol.dispose", function(i) {
            return i || Symbol("Symbol.dispose");
        }), s("Array.prototype.values", function(i) {
            return i || function() {
                return this[Symbol.iterator]();
            };
        }), s("Object.entries", function(i) {
            return i || function(c) {
                var u = [], d;
                for(d in c)Object.prototype.hasOwnProperty.call(c, d) && u.push([
                    d,
                    c[d]
                ]);
                return u;
            };
        });
        var o = o || {}, a = this || self;
        function l(i) {
            var c = typeof i;
            return c == "object" && i != null || c == "function";
        }
        function h(i, c, u) {
            return i.call.apply(i.bind, arguments);
        }
        function f(i, c, u) {
            return f = h, f.apply(null, arguments);
        }
        function m(i, c) {
            var u = Array.prototype.slice.call(arguments, 1);
            return function() {
                var d = u.slice();
                return d.push.apply(d, arguments), i.apply(this, d);
            };
        }
        function E(i, c) {
            function u() {}
            u.prototype = c.prototype, i.Z = c.prototype, i.prototype = new u, i.prototype.constructor = i, i.Ob = function(d, b, C) {
                for(var x = Array(arguments.length - 2), W = 2; W < arguments.length; W++)x[W - 2] = arguments[W];
                return c.prototype[b].apply(d, x);
            };
        }
        var S = typeof AsyncContext < "u" && typeof AsyncContext.Snapshot == "function" ? (i)=>i && AsyncContext.Snapshot.wrap(i) : (i)=>i;
        function D(i) {
            const c = i.length;
            if (c > 0) {
                const u = Array(c);
                for(let d = 0; d < c; d++)u[d] = i[d];
                return u;
            }
            return [];
        }
        function N(i, c) {
            for(let d = 1; d < arguments.length; d++){
                const b = arguments[d];
                var u = typeof b;
                if (u = u != "object" ? u : b ? Array.isArray(b) ? "array" : u : "null", u == "array" || u == "object" && typeof b.length == "number") {
                    u = i.length || 0;
                    const C = b.length || 0;
                    i.length = u + C;
                    for(let x = 0; x < C; x++)i[u + x] = b[x];
                } else i.push(b);
            }
        }
        class R {
            constructor(c, u){
                this.i = c, this.j = u, this.h = 0, this.g = null;
            }
            get() {
                let c;
                return this.h > 0 ? (this.h--, c = this.g, this.g = c.next, c.next = null) : c = this.i(), c;
            }
        }
        function I(i) {
            a.setTimeout(()=>{
                throw i;
            }, 0);
        }
        function P() {
            var i = T;
            let c = null;
            return i.g && (c = i.g, i.g = i.g.next, i.g || (i.h = null), c.next = null), c;
        }
        class F {
            constructor(){
                this.h = this.g = null;
            }
            add(c, u) {
                const d = L.get();
                d.set(c, u), this.h ? this.h.next = d : this.g = d, this.h = d;
            }
        }
        var L = new R(()=>new v, (i)=>i.reset());
        class v {
            constructor(){
                this.next = this.g = this.h = null;
            }
            set(c, u) {
                this.h = c, this.g = u, this.next = null;
            }
            reset() {
                this.next = this.g = this.h = null;
            }
        }
        let M, U = !1, T = new F, p = ()=>{
            const i = Promise.resolve(void 0);
            M = ()=>{
                i.then(_);
            };
        };
        function _() {
            for(var i; i = P();){
                try {
                    i.h.call(i.g);
                } catch (u) {
                    I(u);
                }
                var c = L;
                c.j(i), c.h < 100 && (c.h++, i.next = c.g, c.g = i);
            }
            U = !1;
        }
        function w() {
            this.u = this.u, this.C = this.C;
        }
        w.prototype.u = !1, w.prototype.dispose = function() {
            this.u || (this.u = !0, this.N());
        }, w.prototype[Symbol.dispose] = function() {
            this.dispose();
        }, w.prototype.N = function() {
            if (this.C) for(; this.C.length;)this.C.shift()();
        };
        function A(i, c) {
            this.type = i, this.g = this.target = c, this.defaultPrevented = !1;
        }
        A.prototype.h = function() {
            this.defaultPrevented = !0;
        };
        var y = (function() {
            if (!a.addEventListener || !Object.defineProperty) return !1;
            var i = !1, c = Object.defineProperty({}, "passive", {
                get: function() {
                    i = !0;
                }
            });
            try {
                const u = ()=>{};
                a.addEventListener("test", u, c), a.removeEventListener("test", u, c);
            } catch  {}
            return i;
        })();
        function g(i) {
            return /^[\s\xa0]*$/.test(i);
        }
        function H(i, c) {
            A.call(this, i ? i.type : ""), this.relatedTarget = this.g = this.target = null, this.button = this.screenY = this.screenX = this.clientY = this.clientX = 0, this.key = "", this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1, this.state = null, this.pointerId = 0, this.pointerType = "", this.i = null, i && this.init(i, c);
        }
        E(H, A), H.prototype.init = function(i, c) {
            const u = this.type = i.type, d = i.changedTouches && i.changedTouches.length ? i.changedTouches[0] : null;
            this.target = i.target || i.srcElement, this.g = c, c = i.relatedTarget, c || (u == "mouseover" ? c = i.fromElement : u == "mouseout" && (c = i.toElement)), this.relatedTarget = c, d ? (this.clientX = d.clientX !== void 0 ? d.clientX : d.pageX, this.clientY = d.clientY !== void 0 ? d.clientY : d.pageY, this.screenX = d.screenX || 0, this.screenY = d.screenY || 0) : (this.clientX = i.clientX !== void 0 ? i.clientX : i.pageX, this.clientY = i.clientY !== void 0 ? i.clientY : i.pageY, this.screenX = i.screenX || 0, this.screenY = i.screenY || 0), this.button = i.button, this.key = i.key || "", this.ctrlKey = i.ctrlKey, this.altKey = i.altKey, this.shiftKey = i.shiftKey, this.metaKey = i.metaKey, this.pointerId = i.pointerId || 0, this.pointerType = i.pointerType, this.state = i.state, this.i = i, i.defaultPrevented && H.Z.h.call(this);
        }, H.prototype.h = function() {
            H.Z.h.call(this);
            const i = this.i;
            i.preventDefault ? i.preventDefault() : i.returnValue = !1;
        };
        var $ = "closure_listenable_" + (Math.random() * 1e6 | 0), q = 0;
        function ut(i, c, u, d, b) {
            this.listener = i, this.proxy = null, this.src = c, this.type = u, this.capture = !!d, this.ha = b, this.key = ++q, this.da = this.fa = !1;
        }
        function j(i) {
            i.da = !0, i.listener = null, i.proxy = null, i.src = null, i.ha = null;
        }
        function V(i, c, u) {
            for(const d in i)c.call(u, i[d], d, i);
        }
        function z(i, c) {
            for(const u in i)c.call(void 0, i[u], u, i);
        }
        function J(i) {
            const c = {};
            for(const u in i)c[u] = i[u];
            return c;
        }
        const St = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
        function Rt(i, c) {
            let u, d;
            for(let b = 1; b < arguments.length; b++){
                d = arguments[b];
                for(u in d)i[u] = d[u];
                for(let C = 0; C < St.length; C++)u = St[C], Object.prototype.hasOwnProperty.call(d, u) && (i[u] = d[u]);
            }
        }
        function Lt(i) {
            this.src = i, this.g = {}, this.h = 0;
        }
        Lt.prototype.add = function(i, c, u, d, b) {
            const C = i.toString();
            i = this.g[C], i || (i = this.g[C] = [], this.h++);
            const x = Ut(i, c, d, b);
            return x > -1 ? (c = i[x], u || (c.fa = !1)) : (c = new ut(c, this.src, C, !!d, b), c.fa = u, i.push(c)), c;
        };
        function Ft(i, c) {
            const u = c.type;
            if (u in i.g) {
                var d = i.g[u], b = Array.prototype.indexOf.call(d, c, void 0), C;
                (C = b >= 0) && Array.prototype.splice.call(d, b, 1), C && (j(c), i.g[u].length == 0 && (delete i.g[u], i.h--));
            }
        }
        function Ut(i, c, u, d) {
            for(let b = 0; b < i.length; ++b){
                const C = i[b];
                if (!C.da && C.listener == c && C.capture == !!u && C.ha == d) return b;
            }
            return -1;
        }
        var Nt = "closure_lm_" + (Math.random() * 1e6 | 0), Gt = {};
        function ee(i, c, u, d, b) {
            if (Array.isArray(c)) {
                for(let C = 0; C < c.length; C++)ee(i, c[C], u, d, b);
                return null;
            }
            return u = ft(u), i && i[$] ? i.J(c, u, l(d) ? !!d.capture : !1, b) : _t(i, c, u, !1, d, b);
        }
        function _t(i, c, u, d, b, C) {
            if (!c) throw Error("Invalid event type");
            const x = l(b) ? !!b.capture : !!b;
            let W = G(i);
            if (W || (i[Nt] = W = new Lt(i)), u = W.add(c, u, d, x, C), u.proxy) return u;
            if (d = xt(), u.proxy = d, d.src = i, d.listener = u, i.addEventListener) y || (b = x), b === void 0 && (b = !1), i.addEventListener(c.toString(), d, b);
            else if (i.attachEvent) i.attachEvent(ht(c.toString()), d);
            else if (i.addListener && i.removeListener) i.addListener(d);
            else throw Error("addEventListener and attachEvent are unavailable.");
            return u;
        }
        function xt() {
            function i(u) {
                return c.call(i.src, i.listener, u);
            }
            const c = vt;
            return i;
        }
        function Dt(i, c, u, d, b) {
            if (Array.isArray(c)) for(var C = 0; C < c.length; C++)Dt(i, c[C], u, d, b);
            else d = l(d) ? !!d.capture : !!d, u = ft(u), i && i[$] ? (i = i.i, C = String(c).toString(), C in i.g && (c = i.g[C], u = Ut(c, u, d, b), u > -1 && (j(c[u]), Array.prototype.splice.call(c, u, 1), c.length == 0 && (delete i.g[C], i.h--)))) : i && (i = G(i)) && (c = i.g[c.toString()], i = -1, c && (i = Ut(c, u, d, b)), (u = i > -1 ? c[i] : null) && at(u));
        }
        function at(i) {
            if (typeof i != "number" && i && !i.da) {
                var c = i.src;
                if (c && c[$]) Ft(c.i, i);
                else {
                    var u = i.type, d = i.proxy;
                    c.removeEventListener ? c.removeEventListener(u, d, i.capture) : c.detachEvent ? c.detachEvent(ht(u), d) : c.addListener && c.removeListener && c.removeListener(d), (u = G(c)) ? (Ft(u, i), u.h == 0 && (u.src = null, c[Nt] = null)) : j(i);
                }
            }
        }
        function ht(i) {
            return i in Gt ? Gt[i] : Gt[i] = "on" + i;
        }
        function vt(i, c) {
            if (i.da) i = !0;
            else {
                c = new H(c, this);
                const u = i.listener, d = i.ha || i.src;
                i.fa && at(i), i = u.call(d, c);
            }
            return i;
        }
        function G(i) {
            return i = i[Nt], i instanceof Lt ? i : null;
        }
        var k = "__closure_events_fn_" + (Math.random() * 1e9 >>> 0);
        function ft(i) {
            return typeof i == "function" ? i : (i[k] || (i[k] = function(c) {
                return i.handleEvent(c);
            }), i[k]);
        }
        function B() {
            w.call(this), this.i = new Lt(this), this.M = this, this.G = null;
        }
        E(B, w), B.prototype[$] = !0, B.prototype.removeEventListener = function(i, c, u, d) {
            Dt(this, i, c, u, d);
        };
        function ot(i, c) {
            var u, d = i.G;
            if (d) for(u = []; d; d = d.G)u.push(d);
            if (i = i.M, d = c.type || c, typeof c == "string") c = new A(c, i);
            else if (c instanceof A) c.target = c.target || i;
            else {
                var b = c;
                c = new A(d, i), Rt(c, b);
            }
            b = !0;
            let C, x;
            if (u) for(x = u.length - 1; x >= 0; x--)C = c.g = u[x], b = mt(C, d, !0, c) && b;
            if (C = c.g = i, b = mt(C, d, !0, c) && b, b = mt(C, d, !1, c) && b, u) for(x = 0; x < u.length; x++)C = c.g = u[x], b = mt(C, d, !1, c) && b;
        }
        B.prototype.N = function() {
            if (B.Z.N.call(this), this.i) {
                var i = this.i;
                for(const c in i.g){
                    const u = i.g[c];
                    for(let d = 0; d < u.length; d++)j(u[d]);
                    delete i.g[c], i.h--;
                }
            }
            this.G = null;
        }, B.prototype.J = function(i, c, u, d) {
            return this.i.add(String(i), c, !1, u, d);
        }, B.prototype.K = function(i, c, u, d) {
            return this.i.add(String(i), c, !0, u, d);
        };
        function mt(i, c, u, d) {
            if (c = i.i.g[String(c)], !c) return !0;
            c = c.concat();
            let b = !0;
            for(let C = 0; C < c.length; ++C){
                const x = c[C];
                if (x && !x.da && x.capture == u) {
                    const W = x.listener, It = x.ha || x.src;
                    x.fa && Ft(i.i, x), b = W.call(It, d) !== !1 && b;
                }
            }
            return b && !d.defaultPrevented;
        }
        function ne(i, c) {
            if (typeof i != "function") if (i && typeof i.handleEvent == "function") i = f(i.handleEvent, i);
            else throw Error("Invalid listener argument");
            return Number(c) > 2147483647 ? -1 : a.setTimeout(i, c || 0);
        }
        function be(i) {
            i.g = ne(()=>{
                i.g = null, i.i && (i.i = !1, be(i));
            }, i.l);
            const c = i.h;
            i.h = null, i.m.apply(null, c);
        }
        class Zt extends w {
            constructor(c, u){
                super(), this.m = c, this.l = u, this.h = null, this.i = !1, this.g = null;
            }
            j(c) {
                this.h = arguments, this.g ? this.i = !0 : be(this);
            }
            N() {
                super.N(), this.g && (a.clearTimeout(this.g), this.g = null, this.i = !1, this.h = null);
            }
        }
        function kt(i) {
            w.call(this), this.h = i, this.g = {};
        }
        E(kt, w);
        var Tt = [];
        function ue(i) {
            V(i.g, function(c, u) {
                this.g.hasOwnProperty(u) && at(c);
            }, i), i.g = {};
        }
        kt.prototype.N = function() {
            kt.Z.N.call(this), ue(this);
        }, kt.prototype.handleEvent = function() {
            throw Error("EventHandler.handleEvent not implemented");
        };
        var Oe = a.JSON.stringify, Rn = a.JSON.parse, re = class {
            stringify(i) {
                return a.JSON.stringify(i, void 0);
            }
            parse(i) {
                return a.JSON.parse(i, void 0);
            }
        };
        function $e() {}
        function he() {}
        var ie = {
            OPEN: "a",
            hb: "b",
            ERROR: "c",
            tb: "d"
        };
        function fe() {
            A.call(this, "d");
        }
        E(fe, A);
        function Kt() {
            A.call(this, "c");
        }
        E(Kt, A);
        var Mt = {}, tn = null;
        function At() {
            return tn = tn || new B;
        }
        Mt.Ia = "serverreachability";
        function xe(i) {
            A.call(this, Mt.Ia, i);
        }
        E(xe, A);
        function se(i) {
            const c = At();
            ot(c, new xe(c));
        }
        Mt.STAT_EVENT = "statevent";
        function bt(i, c) {
            A.call(this, Mt.STAT_EVENT, i), this.stat = c;
        }
        E(bt, A);
        function Ot(i) {
            const c = At();
            ot(c, new bt(c, i));
        }
        Mt.Ja = "timingevent";
        function Gr(i, c) {
            A.call(this, Mt.Ja, i), this.size = c;
        }
        E(Gr, A);
        function en(i, c) {
            if (typeof i != "function") throw Error("Fn must not be null and must be a function");
            return a.setTimeout(function() {
                i();
            }, c);
        }
        function Nn() {
            this.g = !0;
        }
        Nn.prototype.ua = function() {
            this.g = !1;
        };
        function zr(i, c, u, d, b, C) {
            i.info(function() {
                if (i.g) if (C) {
                    var x = "", W = C.split("&");
                    for(let ct = 0; ct < W.length; ct++){
                        var It = W[ct].split("=");
                        if (It.length > 1) {
                            const yt = It[0];
                            It = It[1];
                            const pe = yt.split("_");
                            x = pe.length >= 2 && pe[1] == "type" ? x + (yt + "=" + It + "&") : x + (yt + "=redacted&");
                        }
                    }
                } else x = null;
                else x = C;
                return "XMLHTTP REQ (" + d + ") [attempt " + b + "]: " + c + `
` + u + `
` + x;
            });
        }
        function Ki(i, c, u, d, b, C, x) {
            i.info(function() {
                return "XMLHTTP RESP (" + d + ") [ attempt " + b + "]: " + c + `
` + u + `
` + C + " " + x;
            });
        }
        function ke(i, c, u, d) {
            i.info(function() {
                return "XMLHTTP TEXT (" + c + "): " + nn(i, u) + (d ? " " + d : "");
            });
        }
        function qi(i, c) {
            i.info(function() {
                return "TIMEOUT: " + c;
            });
        }
        Nn.prototype.info = function() {};
        function nn(i, c) {
            if (!i.g) return c;
            if (!c) return null;
            try {
                const C = JSON.parse(c);
                if (C) {
                    for(i = 0; i < C.length; i++)if (Array.isArray(C[i])) {
                        var u = C[i];
                        if (!(u.length < 2)) {
                            var d = u[1];
                            if (Array.isArray(d) && !(d.length < 1)) {
                                var b = d[0];
                                if (b != "noop" && b != "stop" && b != "close") for(let x = 1; x < d.length; x++)d[x] = "";
                            }
                        }
                    }
                }
                return Oe(C);
            } catch  {
                return c;
            }
        }
        var Dn = {
            NO_ERROR: 0,
            TIMEOUT: 8
        }, Ht = {}, rn;
        function bn() {}
        E(bn, $e), bn.prototype.g = function() {
            return new XMLHttpRequest;
        }, rn = new bn;
        function sn(i) {
            return encodeURIComponent(String(i));
        }
        function gf(i) {
            var c = 1;
            i = i.split(":");
            const u = [];
            for(; c > 0 && i.length;)u.push(i.shift()), c--;
            return i.length && u.push(i.join(":")), u;
        }
        function Be(i, c, u, d) {
            this.j = i, this.i = c, this.l = u, this.S = d || 1, this.V = new kt(this), this.H = 45e3, this.J = null, this.o = !1, this.u = this.B = this.A = this.M = this.F = this.T = this.D = null, this.G = [], this.g = null, this.C = 0, this.m = this.v = null, this.X = -1, this.K = !1, this.P = 0, this.O = null, this.W = this.L = this.U = this.R = !1, this.h = new Go;
        }
        function Go() {
            this.i = null, this.g = "", this.h = !1;
        }
        var zo = {}, Ji = {};
        function Qi(i, c, u) {
            i.M = 1, i.A = Yr(de(c)), i.u = u, i.R = !0, Xo(i, null);
        }
        function Xo(i, c) {
            i.F = Date.now(), Xr(i), i.B = de(i.A);
            var u = i.B, d = i.S;
            Array.isArray(d) || (d = [
                String(d)
            ]), ra(u.i, "t", d), i.C = 0, u = i.j.L, i.h = new Go, i.g = Aa(i.j, u ? c : null, !i.u), i.P > 0 && (i.O = new Zt(f(i.Y, i, i.g), i.P)), c = i.V, u = i.g, d = i.ba;
            var b = "readystatechange";
            Array.isArray(b) || (b && (Tt[0] = b.toString()), b = Tt);
            for(let C = 0; C < b.length; C++){
                const x = ee(u, b[C], d || c.handleEvent, !1, c.h || c);
                if (!x) break;
                c.g[x.key] = x;
            }
            c = i.J ? J(i.J) : {}, i.u ? (i.v || (i.v = "POST"), c["Content-Type"] = "application/x-www-form-urlencoded", i.g.ea(i.B, i.v, i.u, c)) : (i.v = "GET", i.g.ea(i.B, i.v, null, c)), se(), zr(i.i, i.v, i.B, i.l, i.S, i.u);
        }
        Be.prototype.ba = function(i) {
            i = i.target;
            const c = this.O;
            c && Ge(i) == 3 ? c.j() : this.Y(i);
        }, Be.prototype.Y = function(i) {
            try {
                if (i == this.g) t: {
                    const W = Ge(this.g), It = this.g.ya(), ct = this.g.ca();
                    if (!(W < 3) && (W != 3 || this.g && (this.h.h || this.g.la() || ua(this.g)))) {
                        this.K || W != 4 || It == 7 || (It == 8 || ct <= 0 ? se(3) : se(2)), $i(this);
                        var c = this.g.ca();
                        this.X = c;
                        var u = mf(this);
                        if (this.o = c == 200, Ki(this.i, this.v, this.B, this.l, this.S, W, c), this.o) {
                            if (this.U && !this.L) {
                                e: {
                                    if (this.g) {
                                        var d, b = this.g;
                                        if ((d = b.g ? b.g.getResponseHeader("X-HTTP-Initial-Response") : null) && !g(d)) {
                                            var C = d;
                                            break e;
                                        }
                                    }
                                    C = null;
                                }
                                if (i = C) ke(this.i, this.l, i, "Initial handshake response via X-HTTP-Initial-Response"), this.L = !0, ts(this, i);
                                else {
                                    this.o = !1, this.m = 3, Ot(12), on(this), Jn(this);
                                    break t;
                                }
                            }
                            if (this.R) {
                                i = !0;
                                let yt;
                                for(; !this.K && this.C < u.length;)if (yt = Tf(this, u), yt == Ji) {
                                    W == 4 && (this.m = 4, Ot(14), i = !1), ke(this.i, this.l, null, "[Incomplete Response]");
                                    break;
                                } else if (yt == zo) {
                                    this.m = 4, Ot(15), ke(this.i, this.l, u, "[Invalid Chunk]"), i = !1;
                                    break;
                                } else ke(this.i, this.l, yt, null), ts(this, yt);
                                if (Yo(this) && this.C != 0 && (this.h.g = this.h.g.slice(this.C), this.C = 0), W != 4 || u.length != 0 || this.h.h || (this.m = 1, Ot(16), i = !1), this.o = this.o && i, !i) ke(this.i, this.l, u, "[Invalid Chunked Response]"), on(this), Jn(this);
                                else if (u.length > 0 && !this.W) {
                                    this.W = !0;
                                    var x = this.j;
                                    x.g == this && x.aa && !x.P && (x.j.info("Great, no buffering proxy detected. Bytes received: " + u.length), cs(x), x.P = !0, Ot(11));
                                }
                            } else ke(this.i, this.l, u, null), ts(this, u);
                            W == 4 && on(this), this.o && !this.K && (W == 4 ? ga(this.j, this) : (this.o = !1, Xr(this)));
                        } else Ff(this.g), c == 400 && u.indexOf("Unknown SID") > 0 ? (this.m = 3, Ot(12)) : (this.m = 0, Ot(13)), on(this), Jn(this);
                    }
                }
            } catch  {}
        };
        function mf(i) {
            if (!Yo(i)) return i.g.la();
            const c = ua(i.g);
            if (c === "") return "";
            let u = "";
            const d = c.length, b = Ge(i.g) == 4;
            if (!i.h.i) {
                if (typeof TextDecoder > "u") return on(i), Jn(i), "";
                i.h.i = new a.TextDecoder;
            }
            for(let C = 0; C < d; C++)i.h.h = !0, u += i.h.i.decode(c[C], {
                stream: !(b && C == d - 1)
            });
            return c.length = 0, i.h.g += u, i.C = 0, i.h.g;
        }
        function Yo(i) {
            return i.g ? i.v == "GET" && i.M != 2 && i.j.Aa : !1;
        }
        function Tf(i, c) {
            var u = i.C, d = c.indexOf(`
`, u);
            return d == -1 ? Ji : (u = Number(c.substring(u, d)), isNaN(u) ? zo : (d += 1, d + u > c.length ? Ji : (c = c.slice(d, d + u), i.C = d + u, c)));
        }
        Be.prototype.cancel = function() {
            this.K = !0, on(this);
        };
        function Xr(i) {
            i.T = Date.now() + i.H, jo(i, i.H);
        }
        function jo(i, c) {
            if (i.D != null) throw Error("WatchDog timer not null");
            i.D = en(f(i.aa, i), c);
        }
        function $i(i) {
            i.D && (a.clearTimeout(i.D), i.D = null);
        }
        Be.prototype.aa = function() {
            this.D = null;
            const i = Date.now();
            i - this.T >= 0 ? (qi(this.i, this.B), this.M != 2 && (se(), Ot(17)), on(this), this.m = 2, Jn(this)) : jo(this, this.T - i);
        };
        function Jn(i) {
            i.j.I == 0 || i.K || ga(i.j, i);
        }
        function on(i) {
            $i(i);
            var c = i.O;
            c && typeof c.dispose == "function" && c.dispose(), i.O = null, ue(i.V), i.g && (c = i.g, i.g = null, c.abort(), c.dispose());
        }
        function ts(i, c) {
            try {
                var u = i.j;
                if (u.I != 0 && (u.g == i || es(u.h, i))) {
                    if (!i.L && es(u.h, i) && u.I == 3) {
                        try {
                            var d = u.Ba.g.parse(c);
                        } catch  {
                            d = null;
                        }
                        if (Array.isArray(d) && d.length == 3) {
                            var b = d;
                            if (b[0] == 0) {
                                t: if (!u.v) {
                                    if (u.g) if (u.g.F + 3e3 < i.F) qr(u), Zr(u);
                                    else break t;
                                    as(u), Ot(18);
                                }
                            } else u.xa = b[1], 0 < u.xa - u.K && b[2] < 37500 && u.F && u.A == 0 && !u.C && (u.C = en(f(u.Va, u), 6e3));
                            Ko(u.h) <= 1 && u.ta && (u.ta = void 0);
                        } else cn(u, 11);
                    } else if ((i.L || u.g == i) && qr(u), !g(c)) for(b = u.Ba.g.parse(c), c = 0; c < b.length; c++){
                        let ct = b[c];
                        const yt = ct[0];
                        if (!(yt <= u.K)) if (u.K = yt, ct = ct[1], u.I == 2) if (ct[0] == "c") {
                            u.M = ct[1], u.ba = ct[2];
                            const pe = ct[3];
                            pe != null && (u.ka = pe, u.j.info("VER=" + u.ka));
                            const ln = ct[4];
                            ln != null && (u.za = ln, u.j.info("SVER=" + u.za));
                            const ze = ct[5];
                            ze != null && typeof ze == "number" && ze > 0 && (d = 1.5 * ze, u.O = d, u.j.info("backChannelRequestTimeoutMs_=" + d)), d = u;
                            const Xe = i.g;
                            if (Xe) {
                                const Jr = Xe.g ? Xe.g.getResponseHeader("X-Client-Wire-Protocol") : null;
                                if (Jr) {
                                    var C = d.h;
                                    C.g || Jr.indexOf("spdy") == -1 && Jr.indexOf("quic") == -1 && Jr.indexOf("h2") == -1 || (C.j = C.l, C.g = new Set, C.h && (ns(C, C.h), C.h = null));
                                }
                                if (d.G) {
                                    const ls = Xe.g ? Xe.g.getResponseHeader("X-HTTP-Session-Id") : null;
                                    ls && (d.wa = ls, lt(d.J, d.G, ls));
                                }
                            }
                            u.I = 3, u.l && u.l.ra(), u.aa && (u.T = Date.now() - i.F, u.j.info("Handshake RTT: " + u.T + "ms")), d = u;
                            var x = i;
                            if (d.na = wa(d, d.L ? d.ba : null, d.W), x.L) {
                                qo(d.h, x);
                                var W = x, It = d.O;
                                It && (W.H = It), W.D && ($i(W), Xr(W)), d.g = x;
                            } else Ea(d);
                            u.i.length > 0 && Kr(u);
                        } else ct[0] != "stop" && ct[0] != "close" || cn(u, 7);
                        else u.I == 3 && (ct[0] == "stop" || ct[0] == "close" ? ct[0] == "stop" ? cn(u, 7) : os(u) : ct[0] != "noop" && u.l && u.l.qa(ct), u.A = 0);
                    }
                }
                se(4);
            } catch  {}
        }
        var wf = class {
            constructor(i, c){
                this.g = i, this.map = c;
            }
        };
        function Wo(i) {
            this.l = i || 10, a.PerformanceNavigationTiming ? (i = a.performance.getEntriesByType("navigation"), i = i.length > 0 && (i[0].nextHopProtocol == "hq" || i[0].nextHopProtocol == "h2")) : i = !!(a.chrome && a.chrome.loadTimes && a.chrome.loadTimes() && a.chrome.loadTimes().wasFetchedViaSpdy), this.j = i ? this.l : 1, this.g = null, this.j > 1 && (this.g = new Set), this.h = null, this.i = [];
        }
        function Zo(i) {
            return i.h ? !0 : i.g ? i.g.size >= i.j : !1;
        }
        function Ko(i) {
            return i.h ? 1 : i.g ? i.g.size : 0;
        }
        function es(i, c) {
            return i.h ? i.h == c : i.g ? i.g.has(c) : !1;
        }
        function ns(i, c) {
            i.g ? i.g.add(c) : i.h = c;
        }
        function qo(i, c) {
            i.h && i.h == c ? i.h = null : i.g && i.g.has(c) && i.g.delete(c);
        }
        Wo.prototype.cancel = function() {
            if (this.i = Jo(this), this.h) this.h.cancel(), this.h = null;
            else if (this.g && this.g.size !== 0) {
                for (const i of this.g.values())i.cancel();
                this.g.clear();
            }
        };
        function Jo(i) {
            if (i.h != null) return i.i.concat(i.h.G);
            if (i.g != null && i.g.size !== 0) {
                let c = i.i;
                for (const u of i.g.values())c = c.concat(u.G);
                return c;
            }
            return D(i.i);
        }
        var Qo = RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");
        function Af(i, c) {
            if (i) {
                i = i.split("&");
                for(let u = 0; u < i.length; u++){
                    const d = i[u].indexOf("=");
                    let b, C = null;
                    d >= 0 ? (b = i[u].substring(0, d), C = i[u].substring(d + 1)) : b = i[u], c(b, C ? decodeURIComponent(C.replace(/\+/g, " ")) : "");
                }
            }
        }
        function Ve(i) {
            this.g = this.o = this.j = "", this.u = null, this.m = this.h = "", this.l = !1;
            let c;
            i instanceof Ve ? (this.l = i.l, Qn(this, i.j), this.o = i.o, this.g = i.g, $n(this, i.u), this.h = i.h, rs(this, ia(i.i)), this.m = i.m) : i && (c = String(i).match(Qo)) ? (this.l = !1, Qn(this, c[1] || "", !0), this.o = tr(c[2] || ""), this.g = tr(c[3] || "", !0), $n(this, c[4]), this.h = tr(c[5] || "", !0), rs(this, c[6] || "", !0), this.m = tr(c[7] || "")) : (this.l = !1, this.i = new nr(null, this.l));
        }
        Ve.prototype.toString = function() {
            const i = [];
            var c = this.j;
            c && i.push(er(c, $o, !0), ":");
            var u = this.g;
            return (u || c == "file") && (i.push("//"), (c = this.o) && i.push(er(c, $o, !0), "@"), i.push(sn(u).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), u = this.u, u != null && i.push(":", String(u))), (u = this.h) && (this.g && u.charAt(0) != "/" && i.push("/"), i.push(er(u, u.charAt(0) == "/" ? Sf : yf, !0))), (u = this.i.toString()) && i.push("?", u), (u = this.m) && i.push("#", er(u, Nf)), i.join("");
        }, Ve.prototype.resolve = function(i) {
            const c = de(this);
            let u = !!i.j;
            u ? Qn(c, i.j) : u = !!i.o, u ? c.o = i.o : u = !!i.g, u ? c.g = i.g : u = i.u != null;
            var d = i.h;
            if (u) $n(c, i.u);
            else if (u = !!i.h) {
                if (d.charAt(0) != "/") if (this.g && !this.h) d = "/" + d;
                else {
                    var b = c.h.lastIndexOf("/");
                    b != -1 && (d = c.h.slice(0, b + 1) + d);
                }
                if (b = d, b == ".." || b == ".") d = "";
                else if (b.indexOf("./") != -1 || b.indexOf("/.") != -1) {
                    d = b.lastIndexOf("/", 0) == 0, b = b.split("/");
                    const C = [];
                    for(let x = 0; x < b.length;){
                        const W = b[x++];
                        W == "." ? d && x == b.length && C.push("") : W == ".." ? ((C.length > 1 || C.length == 1 && C[0] != "") && C.pop(), d && x == b.length && C.push("")) : (C.push(W), d = !0);
                    }
                    d = C.join("/");
                } else d = b;
            }
            return u ? c.h = d : u = i.i.toString() !== "", u ? rs(c, ia(i.i)) : u = !!i.m, u && (c.m = i.m), c;
        };
        function de(i) {
            return new Ve(i);
        }
        function Qn(i, c, u) {
            i.j = u ? tr(c, !0) : c, i.j && (i.j = i.j.replace(/:$/, ""));
        }
        function $n(i, c) {
            if (c) {
                if (c = Number(c), isNaN(c) || c < 0) throw Error("Bad port number " + c);
                i.u = c;
            } else i.u = null;
        }
        function rs(i, c, u) {
            c instanceof nr ? (i.i = c, Df(i.i, i.l)) : (u || (c = er(c, Rf)), i.i = new nr(c, i.l));
        }
        function lt(i, c, u) {
            i.i.set(c, u);
        }
        function Yr(i) {
            return lt(i, "zx", Math.floor(Math.random() * 2147483648).toString(36) + Math.abs(Math.floor(Math.random() * 2147483648) ^ Date.now()).toString(36)), i;
        }
        function tr(i, c) {
            return i ? c ? decodeURI(i.replace(/%25/g, "%2525")) : decodeURIComponent(i) : "";
        }
        function er(i, c, u) {
            return typeof i == "string" ? (i = encodeURI(i).replace(c, If), u && (i = i.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), i) : null;
        }
        function If(i) {
            return i = i.charCodeAt(0), "%" + (i >> 4 & 15).toString(16) + (i & 15).toString(16);
        }
        var $o = /[#\/\?@]/g, yf = /[#\?:]/g, Sf = /[#\?]/g, Rf = /[#\?@]/g, Nf = /#/g;
        function nr(i, c) {
            this.h = this.g = null, this.i = i || null, this.j = !!c;
        }
        function an(i) {
            i.g || (i.g = new Map, i.h = 0, i.i && Af(i.i, function(c, u) {
                i.add(decodeURIComponent(c.replace(/\+/g, " ")), u);
            }));
        }
        e = nr.prototype, e.add = function(i, c) {
            an(this), this.i = null, i = On(this, i);
            let u = this.g.get(i);
            return u || this.g.set(i, u = []), u.push(c), this.h += 1, this;
        };
        function ta(i, c) {
            an(i), c = On(i, c), i.g.has(c) && (i.i = null, i.h -= i.g.get(c).length, i.g.delete(c));
        }
        function ea(i, c) {
            return an(i), c = On(i, c), i.g.has(c);
        }
        e.forEach = function(i, c) {
            an(this), this.g.forEach(function(u, d) {
                u.forEach(function(b) {
                    i.call(c, b, d, this);
                }, this);
            }, this);
        };
        function na(i, c) {
            an(i);
            let u = [];
            if (typeof c == "string") ea(i, c) && (u = u.concat(i.g.get(On(i, c))));
            else for(i = Array.from(i.g.values()), c = 0; c < i.length; c++)u = u.concat(i[c]);
            return u;
        }
        e.set = function(i, c) {
            return an(this), this.i = null, i = On(this, i), ea(this, i) && (this.h -= this.g.get(i).length), this.g.set(i, [
                c
            ]), this.h += 1, this;
        }, e.get = function(i, c) {
            return i ? (i = na(this, i), i.length > 0 ? String(i[0]) : c) : c;
        };
        function ra(i, c, u) {
            ta(i, c), u.length > 0 && (i.i = null, i.g.set(On(i, c), D(u)), i.h += u.length);
        }
        e.toString = function() {
            if (this.i) return this.i;
            if (!this.g) return "";
            const i = [], c = Array.from(this.g.keys());
            for(let d = 0; d < c.length; d++){
                var u = c[d];
                const b = sn(u);
                u = na(this, u);
                for(let C = 0; C < u.length; C++){
                    let x = b;
                    u[C] !== "" && (x += "=" + sn(u[C])), i.push(x);
                }
            }
            return this.i = i.join("&");
        };
        function ia(i) {
            const c = new nr;
            return c.i = i.i, i.g && (c.g = new Map(i.g), c.h = i.h), c;
        }
        function On(i, c) {
            return c = String(c), i.j && (c = c.toLowerCase()), c;
        }
        function Df(i, c) {
            c && !i.j && (an(i), i.i = null, i.g.forEach(function(u, d) {
                const b = d.toLowerCase();
                d != b && (ta(this, d), ra(this, b, u));
            }, i)), i.j = c;
        }
        function bf(i, c) {
            const u = new Nn;
            if (a.Image) {
                const d = new Image;
                d.onload = m(He, u, "TestLoadImage: loaded", !0, c, d), d.onerror = m(He, u, "TestLoadImage: error", !1, c, d), d.onabort = m(He, u, "TestLoadImage: abort", !1, c, d), d.ontimeout = m(He, u, "TestLoadImage: timeout", !1, c, d), a.setTimeout(function() {
                    d.ontimeout && d.ontimeout();
                }, 1e4), d.src = i;
            } else c(!1);
        }
        function Of(i, c) {
            const u = new Nn, d = new AbortController, b = setTimeout(()=>{
                d.abort(), He(u, "TestPingServer: timeout", !1, c);
            }, 1e4);
            fetch(i, {
                signal: d.signal
            }).then((C)=>{
                clearTimeout(b), C.ok ? He(u, "TestPingServer: ok", !0, c) : He(u, "TestPingServer: server error", !1, c);
            }).catch(()=>{
                clearTimeout(b), He(u, "TestPingServer: error", !1, c);
            });
        }
        function He(i, c, u, d, b) {
            try {
                b && (b.onload = null, b.onerror = null, b.onabort = null, b.ontimeout = null), d(u);
            } catch  {}
        }
        function Cf() {
            this.g = new re;
        }
        function is(i) {
            this.i = i.Sb || null, this.h = i.ab || !1;
        }
        E(is, $e), is.prototype.g = function() {
            return new jr(this.i, this.h);
        };
        function jr(i, c) {
            B.call(this), this.H = i, this.o = c, this.m = void 0, this.status = this.readyState = 0, this.responseType = this.responseText = this.response = this.statusText = "", this.onreadystatechange = null, this.A = new Headers, this.h = null, this.F = "GET", this.D = "", this.g = !1, this.B = this.j = this.l = null, this.v = new AbortController;
        }
        E(jr, B), e = jr.prototype, e.open = function(i, c) {
            if (this.readyState != 0) throw this.abort(), Error("Error reopening a connection");
            this.F = i, this.D = c, this.readyState = 1, ir(this);
        }, e.send = function(i) {
            if (this.readyState != 1) throw this.abort(), Error("need to call open() first. ");
            if (this.v.signal.aborted) throw this.abort(), Error("Request was aborted.");
            this.g = !0;
            const c = {
                headers: this.A,
                method: this.F,
                credentials: this.m,
                cache: void 0,
                signal: this.v.signal
            };
            i && (c.body = i), (this.H || a).fetch(new Request(this.D, c)).then(this.Pa.bind(this), this.ga.bind(this));
        }, e.abort = function() {
            this.response = this.responseText = "", this.A = new Headers, this.status = 0, this.v.abort(), this.j && this.j.cancel("Request was aborted.").catch(()=>{}), this.readyState >= 1 && this.g && this.readyState != 4 && (this.g = !1, rr(this)), this.readyState = 0;
        }, e.Pa = function(i) {
            if (this.g && (this.l = i, this.h || (this.status = this.l.status, this.statusText = this.l.statusText, this.h = i.headers, this.readyState = 2, ir(this)), this.g && (this.readyState = 3, ir(this), this.g))) if (this.responseType === "arraybuffer") i.arrayBuffer().then(this.Na.bind(this), this.ga.bind(this));
            else if (typeof a.ReadableStream < "u" && "body" in i) {
                if (this.j = i.body.getReader(), this.o) {
                    if (this.responseType) throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');
                    this.response = [];
                } else this.response = this.responseText = "", this.B = new TextDecoder;
                sa(this);
            } else i.text().then(this.Oa.bind(this), this.ga.bind(this));
        };
        function sa(i) {
            i.j.read().then(i.Ma.bind(i)).catch(i.ga.bind(i));
        }
        e.Ma = function(i) {
            if (this.g) {
                if (this.o && i.value) this.response.push(i.value);
                else if (!this.o) {
                    var c = i.value ? i.value : new Uint8Array(0);
                    (c = this.B.decode(c, {
                        stream: !i.done
                    })) && (this.response = this.responseText += c);
                }
                i.done ? rr(this) : ir(this), this.readyState == 3 && sa(this);
            }
        }, e.Oa = function(i) {
            this.g && (this.response = this.responseText = i, rr(this));
        }, e.Na = function(i) {
            this.g && (this.response = i, rr(this));
        }, e.ga = function() {
            this.g && rr(this);
        };
        function rr(i) {
            i.readyState = 4, i.l = null, i.j = null, i.B = null, ir(i);
        }
        e.setRequestHeader = function(i, c) {
            this.A.append(i, c);
        }, e.getResponseHeader = function(i) {
            return this.h && this.h.get(i.toLowerCase()) || "";
        }, e.getAllResponseHeaders = function() {
            if (!this.h) return "";
            const i = [], c = this.h.entries();
            for(var u = c.next(); !u.done;)u = u.value, i.push(u[0] + ": " + u[1]), u = c.next();
            return i.join(`\r
`);
        };
        function ir(i) {
            i.onreadystatechange && i.onreadystatechange.call(i);
        }
        Object.defineProperty(jr.prototype, "withCredentials", {
            get: function() {
                return this.m === "include";
            },
            set: function(i) {
                this.m = i ? "include" : "same-origin";
            }
        });
        function oa(i) {
            let c = "";
            return V(i, function(u, d) {
                c += d, c += ":", c += u, c += `\r
`;
            }), c;
        }
        function ss(i, c, u) {
            t: {
                for(d in u){
                    var d = !1;
                    break t;
                }
                d = !0;
            }
            d || (u = oa(u), typeof i == "string" ? u != null && sn(u) : lt(i, c, u));
        }
        function gt(i) {
            B.call(this), this.headers = new Map, this.L = i || null, this.h = !1, this.g = null, this.D = "", this.o = 0, this.l = "", this.j = this.B = this.v = this.A = !1, this.m = null, this.F = "", this.H = !1;
        }
        E(gt, B);
        var Pf = /^https?$/i, Lf = [
            "POST",
            "PUT"
        ];
        e = gt.prototype, e.Fa = function(i) {
            this.H = i;
        }, e.ea = function(i, c, u, d) {
            if (this.g) throw Error("[goog.net.XhrIo] Object is active with another request=" + this.D + "; newUri=" + i);
            c = c ? c.toUpperCase() : "GET", this.D = i, this.l = "", this.o = 0, this.A = !1, this.h = !0, this.g = this.L ? this.L.g() : rn.g(), this.g.onreadystatechange = S(f(this.Ca, this));
            try {
                this.B = !0, this.g.open(c, String(i), !0), this.B = !1;
            } catch (C) {
                aa(this, C);
                return;
            }
            if (i = u || "", u = new Map(this.headers), d) if (Object.getPrototypeOf(d) === Object.prototype) for(var b in d)u.set(b, d[b]);
            else if (typeof d.keys == "function" && typeof d.get == "function") for (const C of d.keys())u.set(C, d.get(C));
            else throw Error("Unknown input type for opt_headers: " + String(d));
            d = Array.from(u.keys()).find((C)=>C.toLowerCase() == "content-type"), b = a.FormData && i instanceof a.FormData, !(Array.prototype.indexOf.call(Lf, c, void 0) >= 0) || d || b || u.set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
            for (const [C, x] of u)this.g.setRequestHeader(C, x);
            this.F && (this.g.responseType = this.F), "withCredentials" in this.g && this.g.withCredentials !== this.H && (this.g.withCredentials = this.H);
            try {
                this.m && (clearTimeout(this.m), this.m = null), this.v = !0, this.g.send(i), this.v = !1;
            } catch (C) {
                aa(this, C);
            }
        };
        function aa(i, c) {
            i.h = !1, i.g && (i.j = !0, i.g.abort(), i.j = !1), i.l = c, i.o = 5, ca(i), Wr(i);
        }
        function ca(i) {
            i.A || (i.A = !0, ot(i, "complete"), ot(i, "error"));
        }
        e.abort = function(i) {
            this.g && this.h && (this.h = !1, this.j = !0, this.g.abort(), this.j = !1, this.o = i || 7, ot(this, "complete"), ot(this, "abort"), Wr(this));
        }, e.N = function() {
            this.g && (this.h && (this.h = !1, this.j = !0, this.g.abort(), this.j = !1), Wr(this, !0)), gt.Z.N.call(this);
        }, e.Ca = function() {
            this.u || (this.B || this.v || this.j ? la(this) : this.Xa());
        }, e.Xa = function() {
            la(this);
        };
        function la(i) {
            if (i.h && typeof o < "u") {
                if (i.v && Ge(i) == 4) setTimeout(i.Ca.bind(i), 0);
                else if (ot(i, "readystatechange"), Ge(i) == 4) {
                    i.h = !1;
                    try {
                        const C = i.ca();
                        t: switch(C){
                            case 200:
                            case 201:
                            case 202:
                            case 204:
                            case 206:
                            case 304:
                            case 1223:
                                var c = !0;
                                break t;
                            default:
                                c = !1;
                        }
                        var u;
                        if (!(u = c)) {
                            var d;
                            if (d = C === 0) {
                                let x = String(i.D).match(Qo)[1] || null;
                                !x && a.self && a.self.location && (x = a.self.location.protocol.slice(0, -1)), d = !Pf.test(x ? x.toLowerCase() : "");
                            }
                            u = d;
                        }
                        if (u) ot(i, "complete"), ot(i, "success");
                        else {
                            i.o = 6;
                            try {
                                var b = Ge(i) > 2 ? i.g.statusText : "";
                            } catch  {
                                b = "";
                            }
                            i.l = b + " [" + i.ca() + "]", ca(i);
                        }
                    } finally{
                        Wr(i);
                    }
                }
            }
        }
        function Wr(i, c) {
            if (i.g) {
                i.m && (clearTimeout(i.m), i.m = null);
                const u = i.g;
                i.g = null, c || ot(i, "ready");
                try {
                    u.onreadystatechange = null;
                } catch  {}
            }
        }
        e.isActive = function() {
            return !!this.g;
        };
        function Ge(i) {
            return i.g ? i.g.readyState : 0;
        }
        e.ca = function() {
            try {
                return Ge(this) > 2 ? this.g.status : -1;
            } catch  {
                return -1;
            }
        }, e.la = function() {
            try {
                return this.g ? this.g.responseText : "";
            } catch  {
                return "";
            }
        }, e.La = function(i) {
            if (this.g) {
                var c = this.g.responseText;
                return i && c.indexOf(i) == 0 && (c = c.substring(i.length)), Rn(c);
            }
        };
        function ua(i) {
            try {
                if (!i.g) return null;
                if ("response" in i.g) return i.g.response;
                switch(i.F){
                    case "":
                    case "text":
                        return i.g.responseText;
                    case "arraybuffer":
                        if ("mozResponseArrayBuffer" in i.g) return i.g.mozResponseArrayBuffer;
                }
                return null;
            } catch  {
                return null;
            }
        }
        function Ff(i) {
            const c = {};
            i = (i.g && Ge(i) >= 2 && i.g.getAllResponseHeaders() || "").split(`\r
`);
            for(let d = 0; d < i.length; d++){
                if (g(i[d])) continue;
                var u = gf(i[d]);
                const b = u[0];
                if (u = u[1], typeof u != "string") continue;
                u = u.trim();
                const C = c[b] || [];
                c[b] = C, C.push(u);
            }
            z(c, function(d) {
                return d.join(", ");
            });
        }
        e.ya = function() {
            return this.o;
        }, e.Ha = function() {
            return typeof this.l == "string" ? this.l : String(this.l);
        };
        function sr(i, c, u) {
            return u && u.internalChannelParams && u.internalChannelParams[i] || c;
        }
        function ha(i) {
            this.za = 0, this.i = [], this.j = new Nn, this.ba = this.na = this.J = this.W = this.g = this.wa = this.G = this.H = this.u = this.U = this.o = null, this.Ya = this.V = 0, this.Sa = sr("failFast", !1, i), this.F = this.C = this.v = this.m = this.l = null, this.X = !0, this.xa = this.K = -1, this.Y = this.A = this.D = 0, this.Qa = sr("baseRetryDelayMs", 5e3, i), this.Za = sr("retryDelaySeedMs", 1e4, i), this.Ta = sr("forwardChannelMaxRetries", 2, i), this.va = sr("forwardChannelRequestTimeoutMs", 2e4, i), this.ma = i && i.xmlHttpFactory || void 0, this.Ua = i && i.Rb || void 0, this.Aa = i && i.useFetchStreams || !1, this.O = void 0, this.L = i && i.supportsCrossDomainXhr || !1, this.M = "", this.h = new Wo(i && i.concurrentRequestLimit), this.Ba = new Cf, this.S = i && i.fastHandshake || !1, this.R = i && i.encodeInitMessageHeaders || !1, this.S && this.R && (this.R = !1), this.Ra = i && i.Pb || !1, i && i.ua && this.j.ua(), i && i.forceLongPolling && (this.X = !1), this.aa = !this.S && this.X && i && i.detectBufferingProxy || !1, this.ia = void 0, i && i.longPollingTimeout && i.longPollingTimeout > 0 && (this.ia = i.longPollingTimeout), this.ta = void 0, this.T = 0, this.P = !1, this.ja = this.B = null;
        }
        e = ha.prototype, e.ka = 8, e.I = 1, e.connect = function(i, c, u, d) {
            Ot(0), this.W = i, this.H = c || {}, u && d !== void 0 && (this.H.OSID = u, this.H.OAID = d), this.F = this.X, this.J = wa(this, null, this.W), Kr(this);
        };
        function os(i) {
            if (fa(i), i.I == 3) {
                var c = i.V++, u = de(i.J);
                if (lt(u, "SID", i.M), lt(u, "RID", c), lt(u, "TYPE", "terminate"), or(i, u), c = new Be(i, i.j, c), c.M = 2, c.A = Yr(de(u)), u = !1, a.navigator && a.navigator.sendBeacon) try {
                    u = a.navigator.sendBeacon(c.A.toString(), "");
                } catch  {}
                !u && a.Image && (new Image().src = c.A, u = !0), u || (c.g = Aa(c.j, null), c.g.ea(c.A)), c.F = Date.now(), Xr(c);
            }
            Ta(i);
        }
        function Zr(i) {
            i.g && (cs(i), i.g.cancel(), i.g = null);
        }
        function fa(i) {
            Zr(i), i.v && (a.clearTimeout(i.v), i.v = null), qr(i), i.h.cancel(), i.m && (typeof i.m == "number" && a.clearTimeout(i.m), i.m = null);
        }
        function Kr(i) {
            if (!Zo(i.h) && !i.m) {
                i.m = !0;
                var c = i.Ea;
                M || p(), U || (M(), U = !0), T.add(c, i), i.D = 0;
            }
        }
        function vf(i, c) {
            return Ko(i.h) >= i.h.j - (i.m ? 1 : 0) ? !1 : i.m ? (i.i = c.G.concat(i.i), !0) : i.I == 1 || i.I == 2 || i.D >= (i.Sa ? 0 : i.Ta) ? !1 : (i.m = en(f(i.Ea, i, c), ma(i, i.D)), i.D++, !0);
        }
        e.Ea = function(i) {
            if (this.m) if (this.m = null, this.I == 1) {
                if (!i) {
                    this.V = Math.floor(Math.random() * 1e5), i = this.V++;
                    const b = new Be(this, this.j, i);
                    let C = this.o;
                    if (this.U && (C ? (C = J(C), Rt(C, this.U)) : C = this.U), this.u !== null || this.R || (b.J = C, C = null), this.S) t: {
                        for(var c = 0, u = 0; u < this.i.length; u++){
                            e: {
                                var d = this.i[u];
                                if ("__data__" in d.map && (d = d.map.__data__, typeof d == "string")) {
                                    d = d.length;
                                    break e;
                                }
                                d = void 0;
                            }
                            if (d === void 0) break;
                            if (c += d, c > 4096) {
                                c = u;
                                break t;
                            }
                            if (c === 4096 || u === this.i.length - 1) {
                                c = u + 1;
                                break t;
                            }
                        }
                        c = 1e3;
                    }
                    else c = 1e3;
                    c = pa(this, b, c), u = de(this.J), lt(u, "RID", i), lt(u, "CVER", 22), this.G && lt(u, "X-HTTP-Session-Id", this.G), or(this, u), C && (this.R ? c = "headers=" + sn(oa(C)) + "&" + c : this.u && ss(u, this.u, C)), ns(this.h, b), this.Ra && lt(u, "TYPE", "init"), this.S ? (lt(u, "$req", c), lt(u, "SID", "null"), b.U = !0, Qi(b, u, null)) : Qi(b, u, c), this.I = 2;
                }
            } else this.I == 3 && (i ? da(this, i) : this.i.length == 0 || Zo(this.h) || da(this));
        };
        function da(i, c) {
            var u;
            c ? u = c.l : u = i.V++;
            const d = de(i.J);
            lt(d, "SID", i.M), lt(d, "RID", u), lt(d, "AID", i.K), or(i, d), i.u && i.o && ss(d, i.u, i.o), u = new Be(i, i.j, u, i.D + 1), i.u === null && (u.J = i.o), c && (i.i = c.G.concat(i.i)), c = pa(i, u, 1e3), u.H = Math.round(i.va * .5) + Math.round(i.va * .5 * Math.random()), ns(i.h, u), Qi(u, d, c);
        }
        function or(i, c) {
            i.H && V(i.H, function(u, d) {
                lt(c, d, u);
            }), i.l && V({}, function(u, d) {
                lt(c, d, u);
            });
        }
        function pa(i, c, u) {
            u = Math.min(i.i.length, u);
            const d = i.l ? f(i.l.Ka, i.l, i) : null;
            t: {
                var b = i.i;
                let W = -1;
                for(;;){
                    const It = [
                        "count=" + u
                    ];
                    W == -1 ? u > 0 ? (W = b[0].g, It.push("ofs=" + W)) : W = 0 : It.push("ofs=" + W);
                    let ct = !0;
                    for(let yt = 0; yt < u; yt++){
                        var C = b[yt].g;
                        const pe = b[yt].map;
                        if (C -= W, C < 0) W = Math.max(0, b[yt].g - 100), ct = !1;
                        else try {
                            C = "req" + C + "_" || "";
                            try {
                                var x = pe instanceof Map ? pe : Object.entries(pe);
                                for (const [ln, ze] of x){
                                    let Xe = ze;
                                    l(ze) && (Xe = Oe(ze)), It.push(C + ln + "=" + encodeURIComponent(Xe));
                                }
                            } catch (ln) {
                                throw It.push(C + "type=" + encodeURIComponent("_badmap")), ln;
                            }
                        } catch  {
                            d && d(pe);
                        }
                    }
                    if (ct) {
                        x = It.join("&");
                        break t;
                    }
                }
                x = void 0;
            }
            return i = i.i.splice(0, u), c.G = i, x;
        }
        function Ea(i) {
            if (!i.g && !i.v) {
                i.Y = 1;
                var c = i.Da;
                M || p(), U || (M(), U = !0), T.add(c, i), i.A = 0;
            }
        }
        function as(i) {
            return i.g || i.v || i.A >= 3 ? !1 : (i.Y++, i.v = en(f(i.Da, i), ma(i, i.A)), i.A++, !0);
        }
        e.Da = function() {
            if (this.v = null, _a(this), this.aa && !(this.P || this.g == null || this.T <= 0)) {
                var i = 4 * this.T;
                this.j.info("BP detection timer enabled: " + i), this.B = en(f(this.Wa, this), i);
            }
        }, e.Wa = function() {
            this.B && (this.B = null, this.j.info("BP detection timeout reached."), this.j.info("Buffering proxy detected and switch to long-polling!"), this.F = !1, this.P = !0, Ot(10), Zr(this), _a(this));
        };
        function cs(i) {
            i.B != null && (a.clearTimeout(i.B), i.B = null);
        }
        function _a(i) {
            i.g = new Be(i, i.j, "rpc", i.Y), i.u === null && (i.g.J = i.o), i.g.P = 0;
            var c = de(i.na);
            lt(c, "RID", "rpc"), lt(c, "SID", i.M), lt(c, "AID", i.K), lt(c, "CI", i.F ? "0" : "1"), !i.F && i.ia && lt(c, "TO", i.ia), lt(c, "TYPE", "xmlhttp"), or(i, c), i.u && i.o && ss(c, i.u, i.o), i.O && (i.g.H = i.O);
            var u = i.g;
            i = i.ba, u.M = 1, u.A = Yr(de(c)), u.u = null, u.R = !0, Xo(u, i);
        }
        e.Va = function() {
            this.C != null && (this.C = null, Zr(this), as(this), Ot(19));
        };
        function qr(i) {
            i.C != null && (a.clearTimeout(i.C), i.C = null);
        }
        function ga(i, c) {
            var u = null;
            if (i.g == c) {
                qr(i), cs(i), i.g = null;
                var d = 2;
            } else if (es(i.h, c)) u = c.G, qo(i.h, c), d = 1;
            else return;
            if (i.I != 0) {
                if (c.o) if (d == 1) {
                    u = c.u ? c.u.length : 0, c = Date.now() - c.F;
                    var b = i.D;
                    d = At(), ot(d, new Gr(d, u)), Kr(i);
                } else Ea(i);
                else if (b = c.m, b == 3 || b == 0 && c.X > 0 || !(d == 1 && vf(i, c) || d == 2 && as(i))) switch(u && u.length > 0 && (c = i.h, c.i = c.i.concat(u)), b){
                    case 1:
                        cn(i, 5);
                        break;
                    case 4:
                        cn(i, 10);
                        break;
                    case 3:
                        cn(i, 6);
                        break;
                    default:
                        cn(i, 2);
                }
            }
        }
        function ma(i, c) {
            let u = i.Qa + Math.floor(Math.random() * i.Za);
            return i.isActive() || (u *= 2), u * c;
        }
        function cn(i, c) {
            if (i.j.info("Error code " + c), c == 2) {
                var u = f(i.bb, i), d = i.Ua;
                const b = !d;
                d = new Ve(d || "//www.google.com/images/cleardot.gif"), a.location && a.location.protocol == "http" || Qn(d, "https"), Yr(d), b ? bf(d.toString(), u) : Of(d.toString(), u);
            } else Ot(2);
            i.I = 0, i.l && i.l.pa(c), Ta(i), fa(i);
        }
        e.bb = function(i) {
            i ? (this.j.info("Successfully pinged google.com"), Ot(2)) : (this.j.info("Failed to ping google.com"), Ot(1));
        };
        function Ta(i) {
            if (i.I = 0, i.ja = [], i.l) {
                const c = Jo(i.h);
                (c.length != 0 || i.i.length != 0) && (N(i.ja, c), N(i.ja, i.i), i.h.i.length = 0, D(i.i), i.i.length = 0), i.l.oa();
            }
        }
        function wa(i, c, u) {
            var d = u instanceof Ve ? de(u) : new Ve(u);
            if (d.g != "") c && (d.g = c + "." + d.g), $n(d, d.u);
            else {
                var b = a.location;
                d = b.protocol, c = c ? c + "." + b.hostname : b.hostname, b = +b.port;
                const C = new Ve(null);
                d && Qn(C, d), c && (C.g = c), b && $n(C, b), u && (C.h = u), d = C;
            }
            return u = i.G, c = i.wa, u && c && lt(d, u, c), lt(d, "VER", i.ka), or(i, d), d;
        }
        function Aa(i, c, u) {
            if (c && !i.L) throw Error("Can't create secondary domain capable XhrIo object.");
            return c = i.Aa && !i.ma ? new gt(new is({
                ab: u
            })) : new gt(i.ma), c.Fa(i.L), c;
        }
        e.isActive = function() {
            return !!this.l && this.l.isActive(this);
        };
        function Ia() {}
        e = Ia.prototype, e.ra = function() {}, e.qa = function() {}, e.pa = function() {}, e.oa = function() {}, e.isActive = function() {
            return !0;
        }, e.Ka = function() {};
        function qt(i, c) {
            B.call(this), this.g = new ha(c), this.l = i, this.h = c && c.messageUrlParams || null, i = c && c.messageHeaders || null, c && c.clientProtocolHeaderRequired && (i ? i["X-Client-Protocol"] = "webchannel" : i = {
                "X-Client-Protocol": "webchannel"
            }), this.g.o = i, i = c && c.initMessageHeaders || null, c && c.messageContentType && (i ? i["X-WebChannel-Content-Type"] = c.messageContentType : i = {
                "X-WebChannel-Content-Type": c.messageContentType
            }), c && c.sa && (i ? i["X-WebChannel-Client-Profile"] = c.sa : i = {
                "X-WebChannel-Client-Profile": c.sa
            }), this.g.U = i, (i = c && c.Qb) && !g(i) && (this.g.u = i), this.A = c && c.supportsCrossDomainXhr || !1, this.v = c && c.sendRawJson || !1, (c = c && c.httpSessionIdParam) && !g(c) && (this.g.G = c, i = this.h, i !== null && c in i && (i = this.h, c in i && delete i[c])), this.j = new Cn(this);
        }
        E(qt, B), qt.prototype.m = function() {
            this.g.l = this.j, this.A && (this.g.L = !0), this.g.connect(this.l, this.h || void 0);
        }, qt.prototype.close = function() {
            os(this.g);
        }, qt.prototype.o = function(i) {
            var c = this.g;
            if (typeof i == "string") {
                var u = {};
                u.__data__ = i, i = u;
            } else this.v && (u = {}, u.__data__ = Oe(i), i = u);
            c.i.push(new wf(c.Ya++, i)), c.I == 3 && Kr(c);
        }, qt.prototype.N = function() {
            this.g.l = null, delete this.j, os(this.g), delete this.g, qt.Z.N.call(this);
        };
        function ya(i) {
            fe.call(this), i.__headers__ && (this.headers = i.__headers__, this.statusCode = i.__status__, delete i.__headers__, delete i.__status__);
            var c = i.__sm__;
            if (c) {
                t: {
                    for(const u in c){
                        i = u;
                        break t;
                    }
                    i = void 0;
                }
                (this.i = i) && (i = this.i, c = c !== null && i in c ? c[i] : void 0), this.data = c;
            } else this.data = i;
        }
        E(ya, fe);
        function Sa() {
            Kt.call(this), this.status = 1;
        }
        E(Sa, Kt);
        function Cn(i) {
            this.g = i;
        }
        E(Cn, Ia), Cn.prototype.ra = function() {
            ot(this.g, "a");
        }, Cn.prototype.qa = function(i) {
            ot(this.g, new ya(i));
        }, Cn.prototype.pa = function(i) {
            ot(this.g, new Sa);
        }, Cn.prototype.oa = function() {
            ot(this.g, "b");
        }, qt.prototype.send = qt.prototype.o, qt.prototype.open = qt.prototype.m, qt.prototype.close = qt.prototype.close, Dn.NO_ERROR = 0, Dn.TIMEOUT = 8, Dn.HTTP_ERROR = 6, Ht.COMPLETE = "complete", he.EventType = ie, ie.OPEN = "a", ie.CLOSE = "b", ie.ERROR = "c", ie.MESSAGE = "d", B.prototype.listen = B.prototype.J, gt.prototype.listenOnce = gt.prototype.K, gt.prototype.getLastError = gt.prototype.Ha, gt.prototype.getLastErrorCode = gt.prototype.ya, gt.prototype.getStatus = gt.prototype.ca, gt.prototype.getResponseJson = gt.prototype.La, gt.prototype.getResponseText = gt.prototype.la, gt.prototype.send = gt.prototype.ea, gt.prototype.setWithCredentials = gt.prototype.Fa;
    }).apply(typeof ni < "u" ? ni : typeof self < "u" ? self : typeof window < "u" ? window : {});
    class Yt {
        constructor(t){
            this.uid = t;
        }
        isAuthenticated() {
            return this.uid != null;
        }
        toKey() {
            return this.isAuthenticated() ? "uid:" + this.uid : "anonymous-user";
        }
        isEqual(t) {
            return t.uid === this.uid;
        }
    }
    Yt.UNAUTHENTICATED = new Yt(null), Yt.GOOGLE_CREDENTIALS = new Yt("google-credentials-uid"), Yt.FIRST_PARTY = new Yt("first-party-uid"), Yt.MOCK_USER = new Yt("mock-user");
    let Wi = "12.14.0";
    function Hm(e) {
        Wi = e;
    }
    const Oi = new vo("@firebase/firestore");
    function ce(e, ...t) {
        if (Oi.logLevel <= st.DEBUG) {
            const n = t.map(jh);
            Oi.debug(`Firestore (${Wi}): ${e}`, ...n);
        }
    }
    function Yh(e, ...t) {
        if (Oi.logLevel <= st.ERROR) {
            const n = t.map(jh);
            Oi.error(`Firestore (${Wi}): ${e}`, ...n);
        }
    }
    function jh(e) {
        if (typeof e == "string") return e;
        try {
            return (function(n) {
                return JSON.stringify(n);
            })(e);
        } catch  {
            return e;
        }
    }
    function Ci(e, t, n) {
        let r = "Unexpected state";
        typeof t == "string" ? r = t : n = t, Wh(e, r, n);
    }
    function Wh(e, t, n) {
        let r = `FIRESTORE (${Wi}) INTERNAL ASSERTION FAILED: ${t} (ID: ${e.toString(16)})`;
        if (n !== void 0) try {
            r += " CONTEXT: " + JSON.stringify(n);
        } catch  {
            r += " CONTEXT: " + n;
        }
        throw Yh(r), new Error(r);
    }
    function gr(e, t, n, r) {
        let s = "Unexpected state";
        typeof n == "string" ? s = n : r = n, e || Wh(t, s, r);
    }
    const rt = {
        CANCELLED: "cancelled",
        INVALID_ARGUMENT: "invalid-argument",
        FAILED_PRECONDITION: "failed-precondition"
    };
    class it extends Ue {
        constructor(t, n){
            super(t, n), this.code = t, this.message = n, this.toString = ()=>`${this.name}: [code=${this.code}]: ${this.message}`;
        }
    }
    class mr {
        constructor(){
            this.promise = new Promise(((t, n)=>{
                this.resolve = t, this.reject = n;
            }));
        }
    }
    class Gm {
        constructor(t, n){
            this.user = n, this.type = "OAuth", this.headers = new Map, this.headers.set("Authorization", `Bearer ${t}`);
        }
    }
    class zm {
        getToken() {
            return Promise.resolve(null);
        }
        invalidateToken() {}
        start(t, n) {
            t.enqueueRetryable((()=>n(Yt.UNAUTHENTICATED)));
        }
        shutdown() {}
    }
    class Xm {
        constructor(t){
            this.t = t, this.currentUser = Yt.UNAUTHENTICATED, this.i = 0, this.forceRefresh = !1, this.auth = null;
        }
        start(t, n) {
            gr(this.o === void 0, 42304);
            let r = this.i;
            const s = (h)=>this.i !== r ? (r = this.i, n(h)) : Promise.resolve();
            let o = new mr;
            this.o = ()=>{
                this.i++, this.currentUser = this.u(), o.resolve(), o = new mr, t.enqueueRetryable((()=>s(this.currentUser)));
            };
            const a = ()=>{
                const h = o;
                t.enqueueRetryable((async ()=>{
                    await h.promise, await s(this.currentUser);
                }));
            }, l = (h)=>{
                ce("FirebaseAuthCredentialsProvider", "Auth detected"), this.auth = h, this.o && (this.auth.addAuthTokenListener(this.o), a());
            };
            this.t.onInit(((h)=>l(h))), setTimeout((()=>{
                if (!this.auth) {
                    const h = this.t.getImmediate({
                        optional: !0
                    });
                    h ? l(h) : (ce("FirebaseAuthCredentialsProvider", "Auth not yet detected"), o.resolve(), o = new mr);
                }
            }), 0), a();
        }
        getToken() {
            const t = this.i, n = this.forceRefresh;
            return this.forceRefresh = !1, this.auth ? this.auth.getToken(n).then(((r)=>this.i !== t ? (ce("FirebaseAuthCredentialsProvider", "getToken aborted due to token change."), this.getToken()) : r ? (gr(typeof r.accessToken == "string", 31837, {
                    l: r
                }), new Gm(r.accessToken, this.currentUser)) : null)) : Promise.resolve(null);
        }
        invalidateToken() {
            this.forceRefresh = !0;
        }
        shutdown() {
            this.auth && this.o && this.auth.removeAuthTokenListener(this.o), this.o = void 0;
        }
        u() {
            const t = this.auth && this.auth.getUid();
            return gr(t === null || typeof t == "string", 2055, {
                h: t
            }), new Yt(t);
        }
    }
    class Ym {
        constructor(t, n, r){
            this.P = t, this.T = n, this.I = r, this.type = "FirstParty", this.user = Yt.FIRST_PARTY, this.R = new Map;
        }
        A() {
            return this.I ? this.I() : null;
        }
        get headers() {
            this.R.set("X-Goog-AuthUser", this.P);
            const t = this.A();
            return t && this.R.set("Authorization", t), this.T && this.R.set("X-Goog-Iam-Authorization-Token", this.T), this.R;
        }
    }
    class jm {
        constructor(t, n, r){
            this.P = t, this.T = n, this.I = r;
        }
        getToken() {
            return Promise.resolve(new Ym(this.P, this.T, this.I));
        }
        start(t, n) {
            t.enqueueRetryable((()=>n(Yt.FIRST_PARTY)));
        }
        shutdown() {}
        invalidateToken() {}
    }
    class Rc {
        constructor(t){
            this.value = t, this.type = "AppCheck", this.headers = new Map, t && t.length > 0 && this.headers.set("x-firebase-appcheck", this.value);
        }
    }
    class Wm {
        constructor(t, n){
            this.V = n, this.forceRefresh = !1, this.appCheck = null, this.m = null, this.p = null, je(t) && t.settings.appCheckToken && (this.p = t.settings.appCheckToken);
        }
        start(t, n) {
            gr(this.o === void 0, 3512);
            const r = (o)=>{
                o.error != null && ce("FirebaseAppCheckTokenProvider", `Error getting App Check token; using placeholder token instead. Error: ${o.error.message}`);
                const a = o.token !== this.m;
                return this.m = o.token, ce("FirebaseAppCheckTokenProvider", `Received ${a ? "new" : "existing"} token.`), a ? n(o.token) : Promise.resolve();
            };
            this.o = (o)=>{
                t.enqueueRetryable((()=>r(o)));
            };
            const s = (o)=>{
                ce("FirebaseAppCheckTokenProvider", "AppCheck detected"), this.appCheck = o, this.o && this.appCheck.addTokenListener(this.o);
            };
            this.V.onInit(((o)=>s(o))), setTimeout((()=>{
                if (!this.appCheck) {
                    const o = this.V.getImmediate({
                        optional: !0
                    });
                    o ? s(o) : ce("FirebaseAppCheckTokenProvider", "AppCheck not yet detected");
                }
            }), 0);
        }
        getToken() {
            if (this.p) return Promise.resolve(new Rc(this.p));
            const t = this.forceRefresh;
            return this.forceRefresh = !1, this.appCheck ? this.appCheck.getToken(t).then(((n)=>n ? (gr(typeof n.token == "string", 44558, {
                    tokenResult: n
                }), this.m = n.token, new Rc(n.token)) : null)) : Promise.resolve(null);
        }
        invalidateToken() {
            this.forceRefresh = !0;
        }
        shutdown() {
            this.appCheck && this.o && this.appCheck.removeTokenListener(this.o), this.o = void 0;
        }
    }
    function Zm(e) {
        const t = typeof self < "u" && (self.crypto || self.msCrypto), n = new Uint8Array(e);
        if (t && typeof t.getRandomValues == "function") t.getRandomValues(n);
        else for(let r = 0; r < e; r++)n[r] = Math.floor(256 * Math.random());
        return n;
    }
    class Km {
        static newId() {
            const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", n = 62 * Math.floor(4.129032258064516);
            let r = "";
            for(; r.length < 20;){
                const s = Zm(40);
                for(let o = 0; o < s.length; ++o)r.length < 20 && s[o] < n && (r += t.charAt(s[o] % 62));
            }
            return r;
        }
    }
    function Qe(e, t) {
        return e < t ? -1 : e > t ? 1 : 0;
    }
    function qm(e, t) {
        const n = Math.min(e.length, t.length);
        for(let r = 0; r < n; r++){
            const s = e.charAt(r), o = t.charAt(r);
            if (s !== o) return Ds(s) === Ds(o) ? Qe(s, o) : Ds(s) ? 1 : -1;
        }
        return Qe(e.length, t.length);
    }
    const Jm = 55296, Qm = 57343;
    function Ds(e) {
        const t = e.charCodeAt(0);
        return t >= Jm && t <= Qm;
    }
    const Nc = "__name__";
    class Ee {
        constructor(t, n, r){
            n === void 0 ? n = 0 : n > t.length && Ci(637, {
                offset: n,
                range: t.length
            }), r === void 0 ? r = t.length - n : r > t.length - n && Ci(1746, {
                length: r,
                range: t.length - n
            }), this.segments = t, this.offset = n, this.len = r;
        }
        get length() {
            return this.len;
        }
        isEqual(t) {
            return Ee.comparator(this, t) === 0;
        }
        child(t) {
            const n = this.segments.slice(this.offset, this.limit());
            return t instanceof Ee ? t.forEach(((r)=>{
                n.push(r);
            })) : n.push(t), this.construct(n);
        }
        limit() {
            return this.offset + this.length;
        }
        popFirst(t) {
            return t = t === void 0 ? 1 : t, this.construct(this.segments, this.offset + t, this.length - t);
        }
        popLast() {
            return this.construct(this.segments, this.offset, this.length - 1);
        }
        firstSegment() {
            return this.segments[this.offset];
        }
        lastSegment() {
            return this.get(this.length - 1);
        }
        get(t) {
            return this.segments[this.offset + t];
        }
        isEmpty() {
            return this.length === 0;
        }
        isPrefixOf(t) {
            if (t.length < this.length) return !1;
            for(let n = 0; n < this.length; n++)if (this.get(n) !== t.get(n)) return !1;
            return !0;
        }
        isImmediateParentOf(t) {
            if (this.length + 1 !== t.length) return !1;
            for(let n = 0; n < this.length; n++)if (this.get(n) !== t.get(n)) return !1;
            return !0;
        }
        forEach(t) {
            for(let n = this.offset, r = this.limit(); n < r; n++)t(this.segments[n]);
        }
        toArray() {
            return this.segments.slice(this.offset, this.limit());
        }
        static comparator(t, n) {
            const r = Math.min(t.length, n.length);
            for(let s = 0; s < r; s++){
                const o = Ee.compareSegments(t.get(s), n.get(s));
                if (o !== 0) return o;
            }
            return Qe(t.length, n.length);
        }
        static compareSegments(t, n) {
            const r = Ee.isNumericId(t), s = Ee.isNumericId(n);
            return r && !s ? -1 : !r && s ? 1 : r && s ? Ee.extractNumericId(t).compare(Ee.extractNumericId(n)) : qm(t, n);
        }
        static isNumericId(t) {
            return t.startsWith("__id") && t.endsWith("__");
        }
        static extractNumericId(t) {
            return xo.fromString(t.substring(4, t.length - 2));
        }
    }
    class oe extends Ee {
        construct(t, n, r) {
            return new oe(t, n, r);
        }
        canonicalString() {
            return this.toArray().join("/");
        }
        toString() {
            return this.canonicalString();
        }
        toUriEncodedString() {
            return this.toArray().map(encodeURIComponent).join("/");
        }
        static fromString(...t) {
            const n = [];
            for (const r of t){
                if (r.indexOf("//") >= 0) throw new it(rt.INVALID_ARGUMENT, `Invalid segment (${r}). Paths must not contain // in them.`);
                n.push(...r.split("/").filter(((s)=>s.length > 0)));
            }
            return new oe(n);
        }
        static emptyPath() {
            return new oe([]);
        }
    }
    const $m = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
    class hn extends Ee {
        construct(t, n, r) {
            return new hn(t, n, r);
        }
        static isValidIdentifier(t) {
            return $m.test(t);
        }
        canonicalString() {
            return this.toArray().map(((t)=>(t = t.replace(/\\/g, "\\\\").replace(/`/g, "\\`"), hn.isValidIdentifier(t) || (t = "`" + t + "`"), t))).join(".");
        }
        toString() {
            return this.canonicalString();
        }
        isKeyField() {
            return this.length === 1 && this.get(0) === Nc;
        }
        static keyField() {
            return new hn([
                Nc
            ]);
        }
        static fromServerFormat(t) {
            const n = [];
            let r = "", s = 0;
            const o = ()=>{
                if (r.length === 0) throw new it(rt.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
                n.push(r), r = "";
            };
            let a = !1;
            for(; s < t.length;){
                const l = t[s];
                if (l === "\\") {
                    if (s + 1 === t.length) throw new it(rt.INVALID_ARGUMENT, "Path has trailing escape character: " + t);
                    const h = t[s + 1];
                    if (h !== "\\" && h !== "." && h !== "`") throw new it(rt.INVALID_ARGUMENT, "Path has invalid escape sequence: " + t);
                    r += h, s += 2;
                } else l === "`" ? (a = !a, s++) : l !== "." || a ? (r += l, s++) : (o(), s++);
            }
            if (o(), a) throw new it(rt.INVALID_ARGUMENT, "Unterminated ` in path: " + t);
            return new hn(n);
        }
        static emptyPath() {
            return new hn([]);
        }
    }
    class fn {
        constructor(t){
            this.path = t;
        }
        static fromPath(t) {
            return new fn(oe.fromString(t));
        }
        static fromName(t) {
            return new fn(oe.fromString(t).popFirst(5));
        }
        static empty() {
            return new fn(oe.emptyPath());
        }
        get collectionGroup() {
            return this.path.popLast().lastSegment();
        }
        hasCollectionId(t) {
            return this.path.length >= 2 && this.path.get(this.path.length - 2) === t;
        }
        getCollectionGroup() {
            return this.path.get(this.path.length - 2);
        }
        getCollectionPath() {
            return this.path.popLast();
        }
        isEqual(t) {
            return t !== null && oe.comparator(this.path, t.path) === 0;
        }
        toString() {
            return this.path.toString();
        }
        static comparator(t, n) {
            return oe.comparator(t.path, n.path);
        }
        static isDocumentKey(t) {
            return t.length % 2 == 0;
        }
        static fromSegments(t) {
            return new fn(new oe(t.slice()));
        }
    }
    function tT(e, t, n, r) {
        if (t === !0 && r === !0) throw new it(rt.INVALID_ARGUMENT, `${e} and ${n} cannot be used together.`);
    }
    function eT(e) {
        return typeof e == "object" && e !== null && (Object.getPrototypeOf(e) === Object.prototype || Object.getPrototypeOf(e) === null);
    }
    function wt(e, t) {
        const n = {
            typeString: e
        };
        return t && (n.value = t), n;
    }
    function Vr(e, t) {
        if (!eT(e)) throw new it(rt.INVALID_ARGUMENT, "JSON must be an object");
        let n;
        for(const r in t)if (t[r]) {
            const s = t[r].typeString, o = "value" in t[r] ? {
                value: t[r].value
            } : void 0;
            if (!(r in e)) {
                n = `JSON missing required field: '${r}'`;
                break;
            }
            const a = e[r];
            if (s && typeof a !== s) {
                n = `JSON field '${r}' must be a ${s}.`;
                break;
            }
            if (o !== void 0 && a !== o.value) {
                n = `Expected '${r}' field to equal '${o.value}'`;
                break;
            }
        }
        if (n) throw new it(rt.INVALID_ARGUMENT, n);
        return !0;
    }
    const Dc = -62135596800, bc = 1e6;
    class me {
        static now() {
            return me.fromMillis(Date.now());
        }
        static fromDate(t) {
            return me.fromMillis(t.getTime());
        }
        static fromMillis(t) {
            const n = Math.floor(t / 1e3), r = Math.floor((t - 1e3 * n) * bc);
            return new me(n, r);
        }
        constructor(t, n){
            if (this.seconds = t, this.nanoseconds = n, n < 0) throw new it(rt.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + n);
            if (n >= 1e9) throw new it(rt.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + n);
            if (t < Dc) throw new it(rt.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
            if (t >= 253402300800) throw new it(rt.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
        }
        toDate() {
            return new Date(this.toMillis());
        }
        toMillis() {
            return 1e3 * this.seconds + this.nanoseconds / bc;
        }
        _compareTo(t) {
            return this.seconds === t.seconds ? Qe(this.nanoseconds, t.nanoseconds) : Qe(this.seconds, t.seconds);
        }
        isEqual(t) {
            return t.seconds === this.seconds && t.nanoseconds === this.nanoseconds;
        }
        toString() {
            return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
        }
        toJSON() {
            return {
                type: me._jsonSchemaVersion,
                seconds: this.seconds,
                nanoseconds: this.nanoseconds
            };
        }
        static fromJSON(t) {
            if (Vr(t, me._jsonSchema)) return new me(t.seconds, t.nanoseconds);
        }
        valueOf() {
            const t = this.seconds - Dc;
            return String(t).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
        }
    }
    me._jsonSchemaVersion = "firestore/timestamp/1.0", me._jsonSchema = {
        type: wt("string", me._jsonSchemaVersion),
        seconds: wt("number"),
        nanoseconds: wt("number")
    };
    function nT(e) {
        return e.name === "IndexedDbTransactionError";
    }
    class rT extends Error {
        constructor(){
            super(...arguments), this.name = "Base64DecodeError";
        }
    }
    class yn {
        constructor(t){
            this.binaryString = t;
        }
        static fromBase64String(t) {
            const n = (function(s) {
                try {
                    return atob(s);
                } catch (o) {
                    throw typeof DOMException < "u" && o instanceof DOMException ? new rT("Invalid base64 string: " + o) : o;
                }
            })(t);
            return new yn(n);
        }
        static fromUint8Array(t) {
            const n = (function(s) {
                let o = "";
                for(let a = 0; a < s.length; ++a)o += String.fromCharCode(s[a]);
                return o;
            })(t);
            return new yn(n);
        }
        [Symbol.iterator]() {
            let t = 0;
            return {
                next: ()=>t < this.binaryString.length ? {
                        value: this.binaryString.charCodeAt(t++),
                        done: !1
                    } : {
                        value: void 0,
                        done: !0
                    }
            };
        }
        toBase64() {
            return (function(n) {
                return btoa(n);
            })(this.binaryString);
        }
        toUint8Array() {
            return (function(n) {
                const r = new Uint8Array(n.length);
                for(let s = 0; s < n.length; s++)r[s] = n.charCodeAt(s);
                return r;
            })(this.binaryString);
        }
        approximateByteSize() {
            return 2 * this.binaryString.length;
        }
        compareTo(t) {
            return Qe(this.binaryString, t.binaryString);
        }
        isEqual(t) {
            return this.binaryString === t.binaryString;
        }
    }
    yn.EMPTY_BYTE_STRING = new yn("");
    const Oc = "(default)";
    class Pi {
        constructor(t, n){
            this.projectId = t, this.database = n || Oc;
        }
        static empty() {
            return new Pi("", "");
        }
        get isDefaultDatabase() {
            return this.database === Oc;
        }
        isEqual(t) {
            return t instanceof Pi && t.projectId === this.projectId && t.database === this.database;
        }
    }
    function iT(e, t) {
        if (!Object.prototype.hasOwnProperty.apply(e.options, [
            "projectId"
        ])) throw new it(rt.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
        return new Pi(e.options.projectId, t);
    }
    class sT {
        constructor(t, n = null, r = [], s = [], o = null, a = "F", l = null, h = null){
            this.path = t, this.collectionGroup = n, this.explicitOrderBy = r, this.filters = s, this.limit = o, this.limitType = a, this.startAt = l, this.endAt = h, this.Ie = null, this.Ee = null, this.Re = null, this.startAt, this.endAt;
        }
    }
    function oT(e) {
        return new sT(e);
    }
    var Cc, tt;
    (tt = Cc || (Cc = {}))[tt.OK = 0] = "OK", tt[tt.CANCELLED = 1] = "CANCELLED", tt[tt.UNKNOWN = 2] = "UNKNOWN", tt[tt.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", tt[tt.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", tt[tt.NOT_FOUND = 5] = "NOT_FOUND", tt[tt.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", tt[tt.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", tt[tt.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", tt[tt.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", tt[tt.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", tt[tt.ABORTED = 10] = "ABORTED", tt[tt.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", tt[tt.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", tt[tt.INTERNAL = 13] = "INTERNAL", tt[tt.UNAVAILABLE = 14] = "UNAVAILABLE", tt[tt.DATA_LOSS = 15] = "DATA_LOSS";
    new xo([
        4294967295,
        4294967295
    ], 0);
    const aT = 41943040;
    const cT = 1048576;
    function bs() {
        return typeof document < "u" ? document : null;
    }
    class lT {
        constructor(t, n, r = 1e3, s = 1.5, o = 6e4){
            this.Di = t, this.timerId = n, this.E_ = r, this.R_ = s, this.A_ = o, this.V_ = 0, this.d_ = null, this.m_ = Date.now(), this.reset();
        }
        reset() {
            this.V_ = 0;
        }
        f_() {
            this.V_ = this.A_;
        }
        g_(t) {
            this.cancel();
            const n = Math.floor(this.V_ + this.p_()), r = Math.max(0, Date.now() - this.m_), s = Math.max(0, n - r);
            s > 0 && ce("ExponentialBackoff", `Backing off for ${s} ms (base delay: ${this.V_} ms, delay with jitter: ${n} ms, last attempt: ${r} ms ago)`), this.d_ = this.Di.enqueueAfterDelay(this.timerId, s, (()=>(this.m_ = Date.now(), t()))), this.V_ *= this.R_, this.V_ < this.E_ && (this.V_ = this.E_), this.V_ > this.A_ && (this.V_ = this.A_);
        }
        y_() {
            this.d_ !== null && (this.d_.skipDelay(), this.d_ = null);
        }
        cancel() {
            this.d_ !== null && (this.d_.cancel(), this.d_ = null);
        }
        p_() {
            return (Math.random() - .5) * this.V_;
        }
    }
    class ko {
        constructor(t, n, r, s, o){
            this.asyncQueue = t, this.timerId = n, this.targetTimeMs = r, this.op = s, this.removalCallback = o, this.deferred = new mr, this.then = this.deferred.promise.then.bind(this.deferred.promise), this.deferred.promise.catch(((a)=>{}));
        }
        get promise() {
            return this.deferred.promise;
        }
        static createAndSchedule(t, n, r, s, o) {
            const a = Date.now() + r, l = new ko(t, n, a, s, o);
            return l.start(r), l;
        }
        start(t) {
            this.timerHandle = setTimeout((()=>this.handleDelayElapsed()), t);
        }
        skipDelay() {
            return this.handleDelayElapsed();
        }
        cancel(t) {
            this.timerHandle !== null && (this.clearTimeout(), this.deferred.reject(new it(rt.CANCELLED, "Operation cancelled" + (t ? ": " + t : ""))));
        }
        handleDelayElapsed() {
            this.asyncQueue.enqueueAndForget((()=>this.timerHandle !== null ? (this.clearTimeout(), this.op().then(((t)=>this.deferred.resolve(t)))) : Promise.resolve()));
        }
        clearTimeout() {
            this.timerHandle !== null && (this.removalCallback(this), clearTimeout(this.timerHandle), this.timerHandle = null);
        }
    }
    var Pc, Lc;
    (Lc = Pc || (Pc = {})).Na = "default", Lc.Cache = "cache";
    function uT(e) {
        const t = {};
        return e.timeoutSeconds !== void 0 && (t.timeoutSeconds = e.timeoutSeconds), t;
    }
    const hT = "ComponentProvider", Fc = new Map;
    const fT = "firestore.googleapis.com", vc = !0;
    class Mc {
        constructor(t){
            if (t.host === void 0) {
                if (t.ssl !== void 0) throw new it(rt.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
                this.host = fT, this.ssl = vc;
            } else this.host = t.host, this.ssl = t.ssl ?? vc;
            if (this.isUsingEmulator = t.emulatorOptions !== void 0, this.credentials = t.credentials, this.ignoreUndefinedProperties = !!t.ignoreUndefinedProperties, this.localCache = t.localCache, t.cacheSizeBytes === void 0) this.cacheSizeBytes = aT;
            else {
                if (t.cacheSizeBytes !== -1 && t.cacheSizeBytes < cT) throw new it(rt.INVALID_ARGUMENT, "cacheSizeBytes must be at least 1048576");
                this.cacheSizeBytes = t.cacheSizeBytes;
            }
            tT("experimentalForceLongPolling", t.experimentalForceLongPolling, "experimentalAutoDetectLongPolling", t.experimentalAutoDetectLongPolling), this.experimentalForceLongPolling = !!t.experimentalForceLongPolling, this.experimentalForceLongPolling ? this.experimentalAutoDetectLongPolling = !1 : t.experimentalAutoDetectLongPolling === void 0 ? this.experimentalAutoDetectLongPolling = !0 : this.experimentalAutoDetectLongPolling = !!t.experimentalAutoDetectLongPolling, this.experimentalLongPollingOptions = uT(t.experimentalLongPollingOptions ?? {}), (function(r) {
                if (r.timeoutSeconds !== void 0) {
                    if (isNaN(r.timeoutSeconds)) throw new it(rt.INVALID_ARGUMENT, `invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);
                    if (r.timeoutSeconds < 5) throw new it(rt.INVALID_ARGUMENT, `invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);
                    if (r.timeoutSeconds > 30) throw new it(rt.INVALID_ARGUMENT, `invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`);
                }
            })(this.experimentalLongPollingOptions), this.useFetchStreams = !!t.useFetchStreams;
        }
        isEqual(t) {
            return this.host === t.host && this.ssl === t.ssl && this.credentials === t.credentials && this.cacheSizeBytes === t.cacheSizeBytes && this.experimentalForceLongPolling === t.experimentalForceLongPolling && this.experimentalAutoDetectLongPolling === t.experimentalAutoDetectLongPolling && (function(r, s) {
                return r.timeoutSeconds === s.timeoutSeconds;
            })(this.experimentalLongPollingOptions, t.experimentalLongPollingOptions) && this.ignoreUndefinedProperties === t.ignoreUndefinedProperties && this.useFetchStreams === t.useFetchStreams;
        }
    }
    class dT {
        constructor(t, n, r, s){
            this._authCredentials = t, this._appCheckCredentials = n, this._databaseId = r, this._app = s, this.type = "firestore-lite", this._persistenceKey = "(lite)", this._settings = new Mc({}), this._settingsFrozen = !1, this._emulatorOptions = {}, this._terminateTask = "notTerminated";
        }
        get app() {
            if (!this._app) throw new it(rt.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
            return this._app;
        }
        get _initialized() {
            return this._settingsFrozen;
        }
        get _terminated() {
            return this._terminateTask !== "notTerminated";
        }
        _setSettings(t) {
            if (this._settingsFrozen) throw new it(rt.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");
            this._settings = new Mc(t), this._emulatorOptions = t.emulatorOptions || {}, t.credentials !== void 0 && (this._authCredentials = (function(r) {
                if (!r) return new zm;
                switch(r.type){
                    case "firstParty":
                        return new jm(r.sessionIndex || "0", r.iamToken || null, r.authTokenFactory || null);
                    case "provider":
                        return r.client;
                    default:
                        throw new it(rt.INVALID_ARGUMENT, "makeAuthCredentialsProvider failed due to invalid credential type");
                }
            })(t.credentials));
        }
        _getSettings() {
            return this._settings;
        }
        _getEmulatorOptions() {
            return this._emulatorOptions;
        }
        _freezeSettings() {
            return this._settingsFrozen = !0, this._settings;
        }
        _delete() {
            return this._terminateTask === "notTerminated" && (this._terminateTask = this._terminate()), this._terminateTask;
        }
        async _restart() {
            this._terminateTask === "notTerminated" ? await this._terminate() : this._terminateTask = "notTerminated";
        }
        toJSON() {
            return {
                app: this._app,
                databaseId: this._databaseId,
                settings: this._settings
            };
        }
        _terminate() {
            return (function(n) {
                const r = Fc.get(n);
                r && (ce(hT, "Removing Datastore"), Fc.delete(n), r.terminate());
            })(this), Promise.resolve();
        }
    }
    class Bo {
        constructor(t, n, r){
            this.converter = n, this._query = r, this.type = "query", this.firestore = t;
        }
        withConverter(t) {
            return new Bo(this.firestore, t, this._query);
        }
    }
    class Te {
        constructor(t, n, r){
            this.converter = n, this._key = r, this.type = "document", this.firestore = t;
        }
        get _path() {
            return this._key.path;
        }
        get id() {
            return this._key.path.lastSegment();
        }
        get path() {
            return this._key.path.canonicalString();
        }
        get parent() {
            return new Vo(this.firestore, this.converter, this._key.path.popLast());
        }
        withConverter(t) {
            return new Te(this.firestore, t, this._key);
        }
        toJSON() {
            return {
                type: Te._jsonSchemaVersion,
                referencePath: this._key.toString()
            };
        }
        static fromJSON(t, n, r) {
            if (Vr(n, Te._jsonSchema)) return new Te(t, r || null, new fn(oe.fromString(n.referencePath)));
        }
    }
    Te._jsonSchemaVersion = "firestore/documentReference/1.0", Te._jsonSchema = {
        type: wt("string", Te._jsonSchemaVersion),
        referencePath: wt("string")
    };
    class Vo extends Bo {
        constructor(t, n, r){
            super(t, n, oT(r)), this._path = r, this.type = "collection";
        }
        get id() {
            return this._query.path.lastSegment();
        }
        get path() {
            return this._query.path.canonicalString();
        }
        get parent() {
            const t = this._path.popLast();
            return t.isEmpty() ? null : new Te(this.firestore, null, new fn(t));
        }
        withConverter(t) {
            return new Vo(this.firestore, t, this._path);
        }
    }
    const Uc = "AsyncQueue";
    class xc {
        constructor(t = Promise.resolve()){
            this.nc = [], this.rc = !1, this.sc = [], this.oc = null, this._c = !1, this.ac = !1, this.uc = [], this.F_ = new lT(this, "async_queue_retry"), this.cc = ()=>{
                const r = bs();
                r && ce(Uc, "Visibility state changed to " + r.visibilityState), this.F_.y_();
            }, this.lc = t;
            const n = bs();
            n && typeof n.addEventListener == "function" && n.addEventListener("visibilitychange", this.cc);
        }
        get isShuttingDown() {
            return this.rc;
        }
        enqueueAndForget(t) {
            this.enqueue(t);
        }
        enqueueAndForgetEvenWhileRestricted(t) {
            this.hc(), this.Pc(t);
        }
        enterRestrictedMode(t) {
            if (!this.rc) {
                this.rc = !0, this.ac = t || !1;
                const n = bs();
                n && typeof n.removeEventListener == "function" && n.removeEventListener("visibilitychange", this.cc);
            }
        }
        enqueue(t) {
            if (this.hc(), this.rc) return new Promise((()=>{}));
            const n = new mr;
            return this.Pc((()=>this.rc && this.ac ? Promise.resolve() : (t().then(n.resolve, n.reject), n.promise))).then((()=>n.promise));
        }
        enqueueRetryable(t) {
            this.enqueueAndForget((()=>(this.nc.push(t), this.Tc())));
        }
        async Tc() {
            if (this.nc.length !== 0) {
                try {
                    await this.nc[0](), this.nc.shift(), this.F_.reset();
                } catch (t) {
                    if (!nT(t)) throw t;
                    ce(Uc, "Operation failed with retryable error: " + t);
                }
                this.nc.length > 0 && this.F_.g_((()=>this.Tc()));
            }
        }
        Pc(t) {
            const n = this.lc.then((()=>(this._c = !0, t().catch(((r)=>{
                    throw this.oc = r, this._c = !1, Yh("INTERNAL UNHANDLED ERROR: ", kc(r)), r;
                })).then(((r)=>(this._c = !1, r))))));
            return this.lc = n, n;
        }
        enqueueAfterDelay(t, n, r) {
            this.hc(), this.uc.indexOf(t) > -1 && (n = 0);
            const s = ko.createAndSchedule(this, t, n, r, ((o)=>this.Ic(o)));
            return this.sc.push(s), s;
        }
        hc() {
            this.oc && Ci(47125, {
                Ec: kc(this.oc)
            });
        }
        verifyOperationInProgress() {}
        async Rc() {
            let t;
            do t = this.lc, await t;
            while (t !== this.lc);
        }
        Ac(t) {
            for (const n of this.sc)if (n.timerId === t) return !0;
            return !1;
        }
        Vc(t) {
            return this.Rc().then((()=>{
                this.sc.sort(((n, r)=>n.targetTimeMs - r.targetTimeMs));
                for (const n of this.sc)if (n.skipDelay(), t !== "all" && n.timerId === t) break;
                return this.Rc();
            }));
        }
        dc(t) {
            this.uc.push(t);
        }
        Ic(t) {
            const n = this.sc.indexOf(t);
            this.sc.splice(n, 1);
        }
    }
    function kc(e) {
        let t = e.message || "";
        return e.stack && (t = e.stack.includes(e.message) ? e.stack : e.message + `
` + e.stack), t;
    }
    class pT extends dT {
        constructor(t, n, r, s){
            super(t, n, r, s), this.type = "firestore", this._queue = new xc, this._persistenceKey = s?.name || "[DEFAULT]";
        }
        async _terminate() {
            if (this._firestoreClient) {
                const t = this._firestoreClient.terminate();
                this._queue = new xc(t), this._firestoreClient = void 0, await t;
            }
        }
    }
    class Fe {
        constructor(t){
            this._byteString = t;
        }
        static fromBase64String(t) {
            try {
                return new Fe(yn.fromBase64String(t));
            } catch (n) {
                throw new it(rt.INVALID_ARGUMENT, "Failed to construct data from Base64 string: " + n);
            }
        }
        static fromUint8Array(t) {
            return new Fe(yn.fromUint8Array(t));
        }
        toBase64() {
            return this._byteString.toBase64();
        }
        toUint8Array() {
            return this._byteString.toUint8Array();
        }
        toString() {
            return "Bytes(base64: " + this.toBase64() + ")";
        }
        isEqual(t) {
            return this._byteString.isEqual(t._byteString);
        }
        toJSON() {
            return {
                type: Fe._jsonSchemaVersion,
                bytes: this.toBase64()
            };
        }
        static fromJSON(t) {
            if (Vr(t, Fe._jsonSchema)) return Fe.fromBase64String(t.bytes);
        }
    }
    Fe._jsonSchemaVersion = "firestore/bytes/1.0", Fe._jsonSchema = {
        type: wt("string", Fe._jsonSchemaVersion),
        bytes: wt("string")
    };
    class Zh {
        constructor(...t){
            for(let n = 0; n < t.length; ++n)if (t[n].length === 0) throw new it(rt.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
            this._internalPath = new hn(t);
        }
        isEqual(t) {
            return this._internalPath.isEqual(t._internalPath);
        }
    }
    class En {
        constructor(t, n){
            if (!isFinite(t) || t < -90 || t > 90) throw new it(rt.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + t);
            if (!isFinite(n) || n < -180 || n > 180) throw new it(rt.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + n);
            this._lat = t, this._long = n;
        }
        get latitude() {
            return this._lat;
        }
        get longitude() {
            return this._long;
        }
        isEqual(t) {
            return this._lat === t._lat && this._long === t._long;
        }
        _compareTo(t) {
            return Qe(this._lat, t._lat) || Qe(this._long, t._long);
        }
        toJSON() {
            return {
                latitude: this._lat,
                longitude: this._long,
                type: En._jsonSchemaVersion
            };
        }
        static fromJSON(t) {
            if (Vr(t, En._jsonSchema)) return new En(t.latitude, t.longitude);
        }
    }
    En._jsonSchemaVersion = "firestore/geoPoint/1.0", En._jsonSchema = {
        type: wt("string", En._jsonSchemaVersion),
        latitude: wt("number"),
        longitude: wt("number")
    };
    class _n {
        constructor(t){
            this._values = (t || []).map(((n)=>n));
        }
        toArray() {
            return this._values.map(((t)=>t));
        }
        isEqual(t) {
            return (function(r, s) {
                if (r.length !== s.length) return !1;
                for(let o = 0; o < r.length; ++o)if (r[o] !== s[o]) return !1;
                return !0;
            })(this._values, t._values);
        }
        toJSON() {
            return {
                type: _n._jsonSchemaVersion,
                vectorValues: this._values
            };
        }
        static fromJSON(t) {
            if (Vr(t, _n._jsonSchema)) {
                if (Array.isArray(t.vectorValues) && t.vectorValues.every(((n)=>typeof n == "number"))) return new _n(t.vectorValues);
                throw new it(rt.INVALID_ARGUMENT, "Expected 'vectorValues' field to be a number array");
            }
        }
    }
    _n._jsonSchemaVersion = "firestore/vectorValue/1.0", _n._jsonSchema = {
        type: wt("string", _n._jsonSchemaVersion),
        vectorValues: wt("object")
    };
    function Kh(e, t, n) {
        if ((t = kr(t)) instanceof Zh) return t._internalPath;
        if (typeof t == "string") return _T(e, t);
        throw so("Field path arguments must be of type string or ", e);
    }
    const ET = new RegExp("[~\\*/\\[\\]]");
    function _T(e, t, n) {
        if (t.search(ET) >= 0) throw so(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`, e);
        try {
            return new Zh(...t.split("."))._internalPath;
        } catch  {
            throw so(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`, e);
        }
    }
    function so(e, t, n, r, s) {
        let o = `Function ${t}() called with invalid data`;
        o += ". ";
        let a = "";
        return new it(rt.INVALID_ARGUMENT, o + e + a);
    }
    const Bc = "@firebase/firestore", Vc = "4.15.0";
    class qh {
        constructor(t, n, r, s, o){
            this._firestore = t, this._userDataWriter = n, this._key = r, this._document = s, this._converter = o;
        }
        get id() {
            return this._key.path.lastSegment();
        }
        get ref() {
            return new Te(this._firestore, this._converter, this._key);
        }
        exists() {
            return this._document !== null;
        }
        data() {
            if (this._document) {
                if (this._converter) {
                    const t = new gT(this._firestore, this._userDataWriter, this._key, this._document, null);
                    return this._converter.fromFirestore(t);
                }
                return this._userDataWriter.convertValue(this._document.data.value);
            }
        }
        _fieldsProto() {
            return this._document?.data.clone().value.mapValue.fields ?? void 0;
        }
        get(t) {
            if (this._document) {
                const n = this._document.data.field(Kh("DocumentSnapshot.get", t));
                if (n !== null) return this._userDataWriter.convertValue(n);
            }
        }
    }
    class gT extends qh {
        data() {
            return super.data();
        }
    }
    class ri {
        constructor(t, n){
            this.hasPendingWrites = t, this.fromCache = n;
        }
        isEqual(t) {
            return this.hasPendingWrites === t.hasPendingWrites && this.fromCache === t.fromCache;
        }
    }
    class Gn extends qh {
        constructor(t, n, r, s, o, a){
            super(t, n, r, s, a), this._firestore = t, this._firestoreImpl = t, this.metadata = o;
        }
        exists() {
            return super.exists();
        }
        data(t = {}) {
            if (this._document) {
                if (this._converter) {
                    const n = new di(this._firestore, this._userDataWriter, this._key, this._document, this.metadata, null);
                    return this._converter.fromFirestore(n, t);
                }
                return this._userDataWriter.convertValue(this._document.data.value, t.serverTimestamps);
            }
        }
        get(t, n = {}) {
            if (this._document) {
                const r = this._document.data.field(Kh("DocumentSnapshot.get", t));
                if (r !== null) return this._userDataWriter.convertValue(r, n.serverTimestamps);
            }
        }
        toJSON() {
            if (this.metadata.hasPendingWrites) throw new it(rt.FAILED_PRECONDITION, "DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");
            const t = this._document, n = {};
            return n.type = Gn._jsonSchemaVersion, n.bundle = "", n.bundleSource = "DocumentSnapshot", n.bundleName = this._key.toString(), !t || !t.isValidDocument() || !t.isFoundDocument() ? n : (this._userDataWriter.convertObjectMap(t.data.value.mapValue.fields, "previous"), n.bundle = (this._firestore, this.ref.path, "NOT SUPPORTED"), n);
        }
    }
    Gn._jsonSchemaVersion = "firestore/documentSnapshot/1.0", Gn._jsonSchema = {
        type: wt("string", Gn._jsonSchemaVersion),
        bundleSource: wt("string", "DocumentSnapshot"),
        bundleName: wt("string"),
        bundle: wt("string")
    };
    class di extends Gn {
        data(t = {}) {
            return super.data(t);
        }
    }
    class Tr {
        constructor(t, n, r, s){
            this._firestore = t, this._userDataWriter = n, this._snapshot = s, this.metadata = new ri(s.hasPendingWrites, s.fromCache), this.query = r;
        }
        get docs() {
            const t = [];
            return this.forEach(((n)=>t.push(n))), t;
        }
        get size() {
            return this._snapshot.docs.size;
        }
        get empty() {
            return this.size === 0;
        }
        forEach(t, n) {
            this._snapshot.docs.forEach(((r)=>{
                t.call(n, new di(this._firestore, this._userDataWriter, r.key, r, new ri(this._snapshot.mutatedKeys.has(r.key), this._snapshot.fromCache), this.query.converter));
            }));
        }
        docChanges(t = {}) {
            const n = !!t.includeMetadataChanges;
            if (n && this._snapshot.excludesMetadataChanges) throw new it(rt.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
            return this._cachedChanges && this._cachedChangesIncludeMetadataChanges === n || (this._cachedChanges = (function(s, o) {
                if (s._snapshot.oldDocs.isEmpty()) {
                    let a = 0;
                    return s._snapshot.docChanges.map(((l)=>{
                        const h = new di(s._firestore, s._userDataWriter, l.doc.key, l.doc, new ri(s._snapshot.mutatedKeys.has(l.doc.key), s._snapshot.fromCache), s.query.converter);
                        return l.doc, {
                            type: "added",
                            doc: h,
                            oldIndex: -1,
                            newIndex: a++
                        };
                    }));
                }
                {
                    let a = s._snapshot.oldDocs;
                    return s._snapshot.docChanges.filter(((l)=>o || l.type !== 3)).map(((l)=>{
                        const h = new di(s._firestore, s._userDataWriter, l.doc.key, l.doc, new ri(s._snapshot.mutatedKeys.has(l.doc.key), s._snapshot.fromCache), s.query.converter);
                        let f = -1, m = -1;
                        return l.type !== 0 && (f = a.indexOf(l.doc.key), a = a.delete(l.doc.key)), l.type !== 1 && (a = a.add(l.doc), m = a.indexOf(l.doc.key)), {
                            type: mT(l.type),
                            doc: h,
                            oldIndex: f,
                            newIndex: m
                        };
                    }));
                }
            })(this, n), this._cachedChangesIncludeMetadataChanges = n), this._cachedChanges;
        }
        toJSON() {
            if (this.metadata.hasPendingWrites) throw new it(rt.FAILED_PRECONDITION, "QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");
            const t = {};
            t.type = Tr._jsonSchemaVersion, t.bundleSource = "QuerySnapshot", t.bundleName = Km.newId(), this._firestore._databaseId.database, this._firestore._databaseId.projectId;
            const n = [], r = [], s = [];
            return this.docs.forEach(((o)=>{
                o._document !== null && (n.push(o._document), r.push(this._userDataWriter.convertObjectMap(o._document.data.value.mapValue.fields, "previous")), s.push(o.ref.path));
            })), t.bundle = (this._firestore, this.query._query, t.bundleName, "NOT SUPPORTED"), t;
        }
    }
    function mT(e) {
        switch(e){
            case 0:
                return "added";
            case 2:
            case 3:
                return "modified";
            case 1:
                return "removed";
            default:
                return Ci(61501, {
                    type: e
                });
        }
    }
    Tr._jsonSchemaVersion = "firestore/querySnapshot/1.0", Tr._jsonSchema = {
        type: wt("string", Tr._jsonSchemaVersion),
        bundleSource: wt("string", "QuerySnapshot"),
        bundleName: wt("string"),
        bundle: wt("string")
    };
    (function(t, n = !0) {
        Hm(Br), In(new An("firestore", ((r, { instanceIdentifier: s, options: o })=>{
            const a = r.getProvider("app").getImmediate(), l = new pT(new Xm(r.getProvider("auth-internal")), new Wm(a, r.getProvider("app-check-internal")), iT(a, s), a);
            return o = {
                useFetchStreams: n,
                ...o
            }, l._setSettings(o), l;
        }), "PUBLIC").setMultipleInstances(!0)), ye(Bc, Vc, t), ye(Bc, Vc, "esm2020");
    })();
    const Jh = "firebasestorage.googleapis.com", TT = "storageBucket", wT = 120 * 1e3, AT = 600 * 1e3;
    class De extends Ue {
        constructor(t, n, r = 0){
            super(Os(t), `Firebase Storage: ${n} (${Os(t)})`), this.status_ = r, this.customData = {
                serverResponse: null
            }, this._baseMessage = this.message, Object.setPrototypeOf(this, De.prototype);
        }
        get status() {
            return this.status_;
        }
        set status(t) {
            this.status_ = t;
        }
        _codeEquals(t) {
            return Os(t) === this.code;
        }
        get serverResponse() {
            return this.customData.serverResponse;
        }
        set serverResponse(t) {
            this.customData.serverResponse = t, this.customData.serverResponse ? this.message = `${this._baseMessage}
${this.customData.serverResponse}` : this.message = this._baseMessage;
        }
    }
    var Ne;
    (function(e) {
        e.UNKNOWN = "unknown", e.OBJECT_NOT_FOUND = "object-not-found", e.BUCKET_NOT_FOUND = "bucket-not-found", e.PROJECT_NOT_FOUND = "project-not-found", e.QUOTA_EXCEEDED = "quota-exceeded", e.UNAUTHENTICATED = "unauthenticated", e.UNAUTHORIZED = "unauthorized", e.UNAUTHORIZED_APP = "unauthorized-app", e.RETRY_LIMIT_EXCEEDED = "retry-limit-exceeded", e.INVALID_CHECKSUM = "invalid-checksum", e.CANCELED = "canceled", e.INVALID_EVENT_NAME = "invalid-event-name", e.INVALID_URL = "invalid-url", e.INVALID_DEFAULT_BUCKET = "invalid-default-bucket", e.NO_DEFAULT_BUCKET = "no-default-bucket", e.CANNOT_SLICE_BLOB = "cannot-slice-blob", e.SERVER_FILE_WRONG_SIZE = "server-file-wrong-size", e.NO_DOWNLOAD_URL = "no-download-url", e.INVALID_ARGUMENT = "invalid-argument", e.INVALID_ARGUMENT_COUNT = "invalid-argument-count", e.APP_DELETED = "app-deleted", e.INVALID_ROOT_OPERATION = "invalid-root-operation", e.INVALID_FORMAT = "invalid-format", e.INTERNAL_ERROR = "internal-error", e.UNSUPPORTED_ENVIRONMENT = "unsupported-environment";
    })(Ne || (Ne = {}));
    function Os(e) {
        return "storage/" + e;
    }
    function IT() {
        const e = "An unknown error occurred, please check the error payload for server response.";
        return new De(Ne.UNKNOWN, e);
    }
    function yT() {
        return new De(Ne.RETRY_LIMIT_EXCEEDED, "Max retry time for operation exceeded, please try again.");
    }
    function ST() {
        return new De(Ne.CANCELED, "User canceled the upload/download.");
    }
    function RT(e) {
        return new De(Ne.INVALID_URL, "Invalid URL '" + e + "'.");
    }
    function NT(e) {
        return new De(Ne.INVALID_DEFAULT_BUCKET, "Invalid default bucket '" + e + "'.");
    }
    function Hc(e) {
        return new De(Ne.INVALID_ARGUMENT, e);
    }
    function Qh() {
        return new De(Ne.APP_DELETED, "The Firebase app was deleted.");
    }
    function DT(e) {
        return new De(Ne.INVALID_ROOT_OPERATION, "The operation '" + e + "' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').");
    }
    class le {
        constructor(t, n){
            this.bucket = t, this.path_ = n;
        }
        get path() {
            return this.path_;
        }
        get isRoot() {
            return this.path.length === 0;
        }
        fullServerUrl() {
            const t = encodeURIComponent;
            return "/b/" + t(this.bucket) + "/o/" + t(this.path);
        }
        bucketOnlyServerUrl() {
            return "/b/" + encodeURIComponent(this.bucket) + "/o";
        }
        static makeFromBucketSpec(t, n) {
            let r;
            try {
                r = le.makeFromUrl(t, n);
            } catch  {
                return new le(t, "");
            }
            if (r.path === "") return r;
            throw NT(t);
        }
        static makeFromUrl(t, n) {
            let r = null;
            const s = "([A-Za-z0-9.\\-_]+)";
            function o(v) {
                v.path.charAt(v.path.length - 1) === "/" && (v.path_ = v.path_.slice(0, -1));
            }
            const a = "(/(.*))?$", l = new RegExp("^gs://" + s + a, "i"), h = {
                bucket: 1,
                path: 3
            };
            function f(v) {
                v.path_ = decodeURIComponent(v.path);
            }
            const m = "v[A-Za-z0-9_]+", E = n.replace(/[.]/g, "\\."), S = "(/([^?#]*).*)?$", D = new RegExp(`^https?://${E}/${m}/b/${s}/o${S}`, "i"), N = {
                bucket: 1,
                path: 3
            }, R = n === Jh ? "(?:storage.googleapis.com|storage.cloud.google.com)" : n, I = "([^?#]*)", P = new RegExp(`^https?://${R}/${s}/${I}`, "i"), L = [
                {
                    regex: l,
                    indices: h,
                    postModify: o
                },
                {
                    regex: D,
                    indices: N,
                    postModify: f
                },
                {
                    regex: P,
                    indices: {
                        bucket: 1,
                        path: 2
                    },
                    postModify: f
                }
            ];
            for(let v = 0; v < L.length; v++){
                const M = L[v], U = M.regex.exec(t);
                if (U) {
                    const T = U[M.indices.bucket];
                    let p = U[M.indices.path];
                    p || (p = ""), r = new le(T, p), M.postModify(r);
                    break;
                }
            }
            if (r == null) throw RT(t);
            return r;
        }
    }
    class bT {
        constructor(t){
            this.promise_ = Promise.reject(t);
        }
        getPromise() {
            return this.promise_;
        }
        cancel(t = !1) {}
    }
    function OT(e, t, n) {
        let r = 1, s = null, o = null, a = !1, l = 0;
        function h() {
            return l === 2;
        }
        let f = !1;
        function m(...I) {
            f || (f = !0, t.apply(null, I));
        }
        function E(I) {
            s = setTimeout(()=>{
                s = null, e(D, h());
            }, I);
        }
        function S() {
            o && clearTimeout(o);
        }
        function D(I, ...P) {
            if (f) {
                S();
                return;
            }
            if (I) {
                S(), m.call(null, I, ...P);
                return;
            }
            if (h() || a) {
                S(), m.call(null, I, ...P);
                return;
            }
            r < 64 && (r *= 2);
            let L;
            l === 1 ? (l = 2, L = 0) : L = (r + Math.random()) * 1e3, E(L);
        }
        let N = !1;
        function R(I) {
            N || (N = !0, S(), !f && (s !== null ? (I || (l = 2), clearTimeout(s), E(0)) : I || (l = 1)));
        }
        return E(0), o = setTimeout(()=>{
            a = !0, R(!0);
        }, n), R;
    }
    function CT(e) {
        e(!1);
    }
    function PT(e) {
        return e !== void 0;
    }
    function Gc(e, t, n, r) {
        if (r < t) throw Hc(`Invalid value for '${e}'. Expected ${t} or greater.`);
        if (r > n) throw Hc(`Invalid value for '${e}'. Expected ${n} or less.`);
    }
    function LT(e) {
        const t = encodeURIComponent;
        let n = "?";
        for(const r in e)if (e.hasOwnProperty(r)) {
            const s = t(r) + "=" + t(e[r]);
            n = n + s + "&";
        }
        return n = n.slice(0, -1), n;
    }
    var Li;
    (function(e) {
        e[e.NO_ERROR = 0] = "NO_ERROR", e[e.NETWORK_ERROR = 1] = "NETWORK_ERROR", e[e.ABORT = 2] = "ABORT";
    })(Li || (Li = {}));
    function FT(e, t) {
        const n = e >= 500 && e < 600, s = [
            408,
            429
        ].indexOf(e) !== -1, o = t.indexOf(e) !== -1;
        return n || s || o;
    }
    class vT {
        constructor(t, n, r, s, o, a, l, h, f, m, E, S = !0, D = !1){
            this.url_ = t, this.method_ = n, this.headers_ = r, this.body_ = s, this.successCodes_ = o, this.additionalRetryCodes_ = a, this.callback_ = l, this.errorCallback_ = h, this.timeout_ = f, this.progressCallback_ = m, this.connectionFactory_ = E, this.retry = S, this.isUsingEmulator = D, this.pendingConnection_ = null, this.backoffId_ = null, this.canceled_ = !1, this.appDelete_ = !1, this.promise_ = new Promise((N, R)=>{
                this.resolve_ = N, this.reject_ = R, this.start_();
            });
        }
        start_() {
            const t = (r, s)=>{
                if (s) {
                    r(!1, new ii(!1, null, !0));
                    return;
                }
                const o = this.connectionFactory_();
                this.pendingConnection_ = o;
                const a = (l)=>{
                    const h = l.loaded, f = l.lengthComputable ? l.total : -1;
                    this.progressCallback_ !== null && this.progressCallback_(h, f);
                };
                this.progressCallback_ !== null && o.addUploadProgressListener(a), o.send(this.url_, this.method_, this.isUsingEmulator, this.body_, this.headers_).then(()=>{
                    this.progressCallback_ !== null && o.removeUploadProgressListener(a), this.pendingConnection_ = null;
                    const l = o.getErrorCode() === Li.NO_ERROR, h = o.getStatus();
                    if (!l || FT(h, this.additionalRetryCodes_) && this.retry) {
                        const m = o.getErrorCode() === Li.ABORT;
                        r(!1, new ii(!1, null, m));
                        return;
                    }
                    const f = this.successCodes_.indexOf(h) !== -1;
                    r(!0, new ii(f, o));
                });
            }, n = (r, s)=>{
                const o = this.resolve_, a = this.reject_, l = s.connection;
                if (s.wasSuccessCode) try {
                    const h = this.callback_(l, l.getResponse());
                    PT(h) ? o(h) : o();
                } catch (h) {
                    a(h);
                }
                else if (l !== null) {
                    const h = IT();
                    h.serverResponse = l.getErrorText(), this.errorCallback_ ? a(this.errorCallback_(l, h)) : a(h);
                } else if (s.canceled) {
                    const h = this.appDelete_ ? Qh() : ST();
                    a(h);
                } else {
                    const h = yT();
                    a(h);
                }
            };
            this.canceled_ ? n(!1, new ii(!1, null, !0)) : this.backoffId_ = OT(t, n, this.timeout_);
        }
        getPromise() {
            return this.promise_;
        }
        cancel(t) {
            this.canceled_ = !0, this.appDelete_ = t || !1, this.backoffId_ !== null && CT(this.backoffId_), this.pendingConnection_ !== null && this.pendingConnection_.abort();
        }
    }
    class ii {
        constructor(t, n, r){
            this.wasSuccessCode = t, this.connection = n, this.canceled = !!r;
        }
    }
    function MT(e, t) {
        t !== null && t.length > 0 && (e.Authorization = "Firebase " + t);
    }
    function UT(e, t) {
        e["X-Firebase-Storage-Version"] = "webjs/" + (t ?? "AppManager");
    }
    function xT(e, t) {
        t && (e["X-Firebase-GMPID"] = t);
    }
    function kT(e, t) {
        t !== null && (e["X-Firebase-AppCheck"] = t);
    }
    function BT(e, t, n, r, s, o, a = !0, l = !1) {
        const h = LT(e.urlParams), f = e.url + h, m = Object.assign({}, e.headers);
        return xT(m, t), MT(m, n), UT(m, o), kT(m, r), new vT(f, e.method, m, e.body, e.successCodes, e.additionalRetryCodes, e.handler, e.errorHandler, e.timeout, e.progressCallback, s, a, l);
    }
    function VT(e) {
        if (e.length === 0) return null;
        const t = e.lastIndexOf("/");
        return t === -1 ? "" : e.slice(0, t);
    }
    function HT(e) {
        const t = e.lastIndexOf("/", e.length - 2);
        return t === -1 ? e : e.slice(t + 1);
    }
    class Fi {
        constructor(t, n){
            this._service = t, n instanceof le ? this._location = n : this._location = le.makeFromUrl(n, t.host);
        }
        toString() {
            return "gs://" + this._location.bucket + "/" + this._location.path;
        }
        _newRef(t, n) {
            return new Fi(t, n);
        }
        get root() {
            const t = new le(this._location.bucket, "");
            return this._newRef(this._service, t);
        }
        get bucket() {
            return this._location.bucket;
        }
        get fullPath() {
            return this._location.path;
        }
        get name() {
            return HT(this._location.path);
        }
        get storage() {
            return this._service;
        }
        get parent() {
            const t = VT(this._location.path);
            if (t === null) return null;
            const n = new le(this._location.bucket, t);
            return new Fi(this._service, n);
        }
        _throwIfRoot(t) {
            if (this._location.path === "") throw DT(t);
        }
    }
    function zc(e, t) {
        const n = t?.[TT];
        return n == null ? null : le.makeFromBucketSpec(n, e);
    }
    class GT {
        constructor(t, n, r, s, o, a = !1){
            this.app = t, this._authProvider = n, this._appCheckProvider = r, this._url = s, this._firebaseVersion = o, this._isUsingEmulator = a, this._bucket = null, this._host = Jh, this._protocol = "https", this._appId = null, this._deleted = !1, this._maxOperationRetryTime = wT, this._maxUploadRetryTime = AT, this._requests = new Set, s != null ? this._bucket = le.makeFromBucketSpec(s, this._host) : this._bucket = zc(this._host, this.app.options);
        }
        get host() {
            return this._host;
        }
        set host(t) {
            this._host = t, this._url != null ? this._bucket = le.makeFromBucketSpec(this._url, t) : this._bucket = zc(t, this.app.options);
        }
        get maxUploadRetryTime() {
            return this._maxUploadRetryTime;
        }
        set maxUploadRetryTime(t) {
            Gc("time", 0, Number.POSITIVE_INFINITY, t), this._maxUploadRetryTime = t;
        }
        get maxOperationRetryTime() {
            return this._maxOperationRetryTime;
        }
        set maxOperationRetryTime(t) {
            Gc("time", 0, Number.POSITIVE_INFINITY, t), this._maxOperationRetryTime = t;
        }
        async _getAuthToken() {
            if (this._overrideAuthToken) return this._overrideAuthToken;
            const t = this._authProvider.getImmediate({
                optional: !0
            });
            if (t) {
                const n = await t.getToken();
                if (n !== null) return n.accessToken;
            }
            return null;
        }
        async _getAppCheckToken() {
            if (je(this.app) && this.app.settings.appCheckToken) return this.app.settings.appCheckToken;
            const t = this._appCheckProvider.getImmediate({
                optional: !0
            });
            return t ? (await t.getToken()).token : null;
        }
        _delete() {
            return this._deleted || (this._deleted = !0, this._requests.forEach((t)=>t.cancel()), this._requests.clear()), Promise.resolve();
        }
        _makeStorageReference(t) {
            return new Fi(this, t);
        }
        _makeRequest(t, n, r, s, o = !0) {
            if (this._deleted) return new bT(Qh());
            {
                const a = BT(t, this._appId, r, s, n, this._firebaseVersion, o, this._isUsingEmulator);
                return this._requests.add(a), a.getPromise().then(()=>this._requests.delete(a), ()=>this._requests.delete(a)), a;
            }
        }
        async makeRequestWithTokens(t, n) {
            const [r, s] = await Promise.all([
                this._getAuthToken(),
                this._getAppCheckToken()
            ]);
            return this._makeRequest(t, n, r, s).getPromise();
        }
    }
    const Xc = "@firebase/storage", Yc = "0.14.3";
    const zT = "storage";
    function XT(e, { instanceIdentifier: t }) {
        const n = e.getProvider("app").getImmediate(), r = e.getProvider("auth-internal"), s = e.getProvider("app-check-internal");
        return new GT(n, r, s, t, Br);
    }
    function YT() {
        In(new An(zT, XT, "PUBLIC").setMultipleInstances(!0)), ye(Xc, Yc, ""), ye(Xc, Yc, "esm2020");
    }
    YT();
    var jT = "firebase", WT = "12.14.0";
    ye(jT, WT, "app");
    function $h() {
        return {
            "dependent-sdk-initialized-before-auth": "Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."
        };
    }
    const ZT = $h, tf = new xr("auth", "Firebase", $h());
    const vi = new vo("@firebase/auth");
    function KT(e, ...t) {
        vi.logLevel <= st.WARN && vi.warn(`Auth (${Br}): ${e}`, ...t);
    }
    function pi(e, ...t) {
        vi.logLevel <= st.ERROR && vi.error(`Auth (${Br}): ${e}`, ...t);
    }
    function jc(e, ...t) {
        throw Ho(e, ...t);
    }
    function ef(e, ...t) {
        return Ho(e, ...t);
    }
    function nf(e, t, n) {
        const r = {
            ...ZT(),
            [t]: n
        };
        return new xr("auth", "Firebase", r).create(t, {
            appName: e.name
        });
    }
    function Ei(e) {
        return nf(e, "operation-not-supported-in-this-environment", "Operations that alter the current user are not supported in conjunction with FirebaseServerApp");
    }
    function Ho(e, ...t) {
        if (typeof e != "string") {
            const n = t[0], r = [
                ...t.slice(1)
            ];
            return r[0] && (r[0].appName = e.name), e._errorFactory.create(n, ...r);
        }
        return tf.create(e, ...t);
    }
    function nt(e, t, ...n) {
        if (!e) throw Ho(t, ...n);
    }
    function wr(e) {
        const t = "INTERNAL ASSERTION FAILED: " + e;
        throw pi(t), new Error(t);
    }
    function Mi(e, t) {
        e || wr(t);
    }
    function qT() {
        return Wc() === "http:" || Wc() === "https:";
    }
    function Wc() {
        return typeof self < "u" && self.location?.protocol || null;
    }
    function JT() {
        return typeof navigator < "u" && navigator && "onLine" in navigator && typeof navigator.onLine == "boolean" && (qT() || Dg() || "connection" in navigator) ? navigator.onLine : !0;
    }
    function QT() {
        if (typeof navigator > "u") return null;
        const e = navigator;
        return e.languages && e.languages[0] || e.language || null;
    }
    class Hr {
        constructor(t, n){
            this.shortDelay = t, this.longDelay = n, Mi(n > t, "Short delay should be less than long delay!"), this.isMobile = Rg() || bg();
        }
        get() {
            return JT() ? this.isMobile ? this.longDelay : this.shortDelay : Math.min(5e3, this.shortDelay);
        }
    }
    function $T(e, t) {
        Mi(e.emulator, "Emulator should always be set here");
        const { url: n } = e.emulator;
        return t ? `${n}${t.startsWith("/") ? t.slice(1) : t}` : n;
    }
    class rf {
        static initialize(t, n, r) {
            this.fetchImpl = t, n && (this.headersImpl = n), r && (this.responseImpl = r);
        }
        static fetch() {
            if (this.fetchImpl) return this.fetchImpl;
            if (typeof self < "u" && "fetch" in self) return self.fetch;
            if (typeof globalThis < "u" && globalThis.fetch) return globalThis.fetch;
            if (typeof fetch < "u") return fetch;
            wr("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
        }
        static headers() {
            if (this.headersImpl) return this.headersImpl;
            if (typeof self < "u" && "Headers" in self) return self.Headers;
            if (typeof globalThis < "u" && globalThis.Headers) return globalThis.Headers;
            if (typeof Headers < "u") return Headers;
            wr("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
        }
        static response() {
            if (this.responseImpl) return this.responseImpl;
            if (typeof self < "u" && "Response" in self) return self.Response;
            if (typeof globalThis < "u" && globalThis.Response) return globalThis.Response;
            if (typeof Response < "u") return Response;
            wr("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
        }
    }
    const tw = {
        CREDENTIAL_MISMATCH: "custom-token-mismatch",
        MISSING_CUSTOM_TOKEN: "internal-error",
        INVALID_IDENTIFIER: "invalid-email",
        MISSING_CONTINUE_URI: "internal-error",
        INVALID_PASSWORD: "wrong-password",
        MISSING_PASSWORD: "missing-password",
        INVALID_LOGIN_CREDENTIALS: "invalid-credential",
        EMAIL_EXISTS: "email-already-in-use",
        PASSWORD_LOGIN_DISABLED: "operation-not-allowed",
        INVALID_IDP_RESPONSE: "invalid-credential",
        INVALID_PENDING_TOKEN: "invalid-credential",
        FEDERATED_USER_ID_ALREADY_LINKED: "credential-already-in-use",
        MISSING_REQ_TYPE: "internal-error",
        EMAIL_NOT_FOUND: "user-not-found",
        RESET_PASSWORD_EXCEED_LIMIT: "too-many-requests",
        EXPIRED_OOB_CODE: "expired-action-code",
        INVALID_OOB_CODE: "invalid-action-code",
        MISSING_OOB_CODE: "internal-error",
        CREDENTIAL_TOO_OLD_LOGIN_AGAIN: "requires-recent-login",
        INVALID_ID_TOKEN: "invalid-user-token",
        TOKEN_EXPIRED: "user-token-expired",
        USER_NOT_FOUND: "user-token-expired",
        TOO_MANY_ATTEMPTS_TRY_LATER: "too-many-requests",
        PASSWORD_DOES_NOT_MEET_REQUIREMENTS: "password-does-not-meet-requirements",
        INVALID_CODE: "invalid-verification-code",
        INVALID_SESSION_INFO: "invalid-verification-id",
        INVALID_TEMPORARY_PROOF: "invalid-credential",
        MISSING_SESSION_INFO: "missing-verification-id",
        SESSION_EXPIRED: "code-expired",
        MISSING_ANDROID_PACKAGE_NAME: "missing-android-pkg-name",
        UNAUTHORIZED_DOMAIN: "unauthorized-continue-uri",
        INVALID_OAUTH_CLIENT_ID: "invalid-oauth-client-id",
        ADMIN_ONLY_OPERATION: "admin-restricted-operation",
        INVALID_MFA_PENDING_CREDENTIAL: "invalid-multi-factor-session",
        MFA_ENROLLMENT_NOT_FOUND: "multi-factor-info-not-found",
        MISSING_MFA_ENROLLMENT_ID: "missing-multi-factor-info",
        MISSING_MFA_PENDING_CREDENTIAL: "missing-multi-factor-session",
        SECOND_FACTOR_EXISTS: "second-factor-already-in-use",
        SECOND_FACTOR_LIMIT_EXCEEDED: "maximum-second-factor-count-exceeded",
        BLOCKING_FUNCTION_ERROR_RESPONSE: "internal-error",
        RECAPTCHA_NOT_ENABLED: "recaptcha-not-enabled",
        MISSING_RECAPTCHA_TOKEN: "missing-recaptcha-token",
        INVALID_RECAPTCHA_TOKEN: "invalid-recaptcha-token",
        INVALID_RECAPTCHA_ACTION: "invalid-recaptcha-action",
        MISSING_CLIENT_TYPE: "missing-client-type",
        MISSING_RECAPTCHA_VERSION: "missing-recaptcha-version",
        INVALID_RECAPTCHA_VERSION: "invalid-recaptcha-version",
        INVALID_REQ_TYPE: "invalid-req-type"
    };
    const ew = [
        "/v1/accounts:signInWithCustomToken",
        "/v1/accounts:signInWithEmailLink",
        "/v1/accounts:signInWithIdp",
        "/v1/accounts:signInWithPassword",
        "/v1/accounts:signInWithPhoneNumber",
        "/v1/token"
    ], nw = new Hr(3e4, 6e4);
    function sf(e, t) {
        return e.tenantId && !t.tenantId ? {
            ...t,
            tenantId: e.tenantId
        } : t;
    }
    async function Zi(e, t, n, r, s = {}) {
        return of(e, s, async ()=>{
            let o = {}, a = {};
            r && (t === "GET" ? a = r : o = {
                body: JSON.stringify(r)
            });
            const l = Bh({
                key: e.config.apiKey,
                ...a
            }).slice(1), h = await e._getAdditionalHeaders();
            h["Content-Type"] = "application/json", e.languageCode && (h["X-Firebase-Locale"] = e.languageCode);
            const f = {
                method: t,
                headers: h,
                ...o
            };
            return Ng() || (f.referrerPolicy = "no-referrer"), e.emulatorConfig && Vh(e.emulatorConfig.host) && (f.credentials = "include"), rf.fetch()(await af(e, e.config.apiHost, n, l), f);
        });
    }
    async function of(e, t, n) {
        e._canInitEmulator = !1;
        const r = {
            ...tw,
            ...t
        };
        try {
            const s = new rw(e), o = await Promise.race([
                n(),
                s.promise
            ]);
            s.clearNetworkTimeout();
            const a = await o.json();
            if ("needConfirmation" in a) throw si(e, "account-exists-with-different-credential", a);
            if (o.ok && !("errorMessage" in a)) return a;
            {
                const l = o.ok ? a.errorMessage : a.error.message, [h, f] = l.split(" : ");
                if (h === "FEDERATED_USER_ID_ALREADY_LINKED") throw si(e, "credential-already-in-use", a);
                if (h === "EMAIL_EXISTS") throw si(e, "email-already-in-use", a);
                if (h === "USER_DISABLED") throw si(e, "user-disabled", a);
                const m = r[h] || h.toLowerCase().replace(/[_\s]+/g, "-");
                if (f) throw nf(e, m, f);
                jc(e, m);
            }
        } catch (s) {
            if (s instanceof Ue) throw s;
            jc(e, "network-request-failed", {
                message: String(s)
            });
        }
    }
    async function af(e, t, n, r) {
        const s = `${t}${n}?${r}`, o = e, a = o.config.emulator ? $T(e.config, s) : `${e.config.apiScheme}://${s}`;
        return ew.includes(n) && (await o._persistenceManagerAvailable, o._getPersistenceType() === "COOKIE") ? o._getPersistence()._getFinalTarget(a).toString() : a;
    }
    class rw {
        clearNetworkTimeout() {
            clearTimeout(this.timer);
        }
        constructor(t){
            this.auth = t, this.timer = null, this.promise = new Promise((n, r)=>{
                this.timer = setTimeout(()=>r(ef(this.auth, "network-request-failed")), nw.get());
            });
        }
    }
    function si(e, t, n) {
        const r = {
            appName: e.name
        };
        n.email && (r.email = n.email), n.phoneNumber && (r.phoneNumber = n.phoneNumber);
        const s = ef(e, t, r);
        return s.customData._tokenResponse = n, s;
    }
    async function iw(e, t) {
        return Zi(e, "POST", "/v1/accounts:delete", t);
    }
    async function Ui(e, t) {
        return Zi(e, "POST", "/v1/accounts:lookup", t);
    }
    function Ar(e) {
        if (e) try {
            const t = new Date(Number(e));
            if (!isNaN(t.getTime())) return t.toUTCString();
        } catch  {}
    }
    async function sw(e, t = !1) {
        const n = kr(e), r = await n.getIdToken(t), s = cf(r);
        nt(s && s.exp && s.auth_time && s.iat, n.auth, "internal-error");
        const o = typeof s.firebase == "object" ? s.firebase : void 0, a = o?.sign_in_provider;
        return {
            claims: s,
            token: r,
            authTime: Ar(Cs(s.auth_time)),
            issuedAtTime: Ar(Cs(s.iat)),
            expirationTime: Ar(Cs(s.exp)),
            signInProvider: a || null,
            signInSecondFactor: o?.sign_in_second_factor || null
        };
    }
    function Cs(e) {
        return Number(e) * 1e3;
    }
    function cf(e) {
        const [t, n, r] = e.split(".");
        if (t === void 0 || n === void 0 || r === void 0) return pi("JWT malformed, contained fewer than 3 sections"), null;
        try {
            const s = kh(n);
            return s ? JSON.parse(s) : (pi("Failed to decode base64 JWT payload"), null);
        } catch (s) {
            return pi("Caught error parsing JWT payload as JSON", s?.toString()), null;
        }
    }
    function Zc(e) {
        const t = cf(e);
        return nt(t, "internal-error"), nt(typeof t.exp < "u", "internal-error"), nt(typeof t.iat < "u", "internal-error"), Number(t.exp) - Number(t.iat);
    }
    async function oo(e, t, n = !1) {
        if (n) return t;
        try {
            return await t;
        } catch (r) {
            throw r instanceof Ue && ow(r) && e.auth.currentUser === e && await e.auth.signOut(), r;
        }
    }
    function ow({ code: e }) {
        return e === "auth/user-disabled" || e === "auth/user-token-expired";
    }
    class aw {
        constructor(t){
            this.user = t, this.isRunning = !1, this.timerId = null, this.errorBackoff = 3e4;
        }
        _start() {
            this.isRunning || (this.isRunning = !0, this.schedule());
        }
        _stop() {
            this.isRunning && (this.isRunning = !1, this.timerId !== null && clearTimeout(this.timerId));
        }
        getInterval(t) {
            if (t) {
                const n = this.errorBackoff;
                return this.errorBackoff = Math.min(this.errorBackoff * 2, 96e4), n;
            } else {
                this.errorBackoff = 3e4;
                const r = (this.user.stsTokenManager.expirationTime ?? 0) - Date.now() - 3e5;
                return Math.max(0, r);
            }
        }
        schedule(t = !1) {
            if (!this.isRunning) return;
            const n = this.getInterval(t);
            this.timerId = setTimeout(async ()=>{
                await this.iteration();
            }, n);
        }
        async iteration() {
            try {
                await this.user.getIdToken(!0);
            } catch (t) {
                t?.code === "auth/network-request-failed" && this.schedule(!0);
                return;
            }
            this.schedule();
        }
    }
    class ao {
        constructor(t, n){
            this.createdAt = t, this.lastLoginAt = n, this._initializeTime();
        }
        _initializeTime() {
            this.lastSignInTime = Ar(this.lastLoginAt), this.creationTime = Ar(this.createdAt);
        }
        _copy(t) {
            this.createdAt = t.createdAt, this.lastLoginAt = t.lastLoginAt, this._initializeTime();
        }
        toJSON() {
            return {
                createdAt: this.createdAt,
                lastLoginAt: this.lastLoginAt
            };
        }
    }
    async function xi(e) {
        const t = e.auth, n = await e.getIdToken(), r = await oo(e, Ui(t, {
            idToken: n
        }));
        nt(r?.users.length, t, "internal-error");
        const s = r.users[0];
        e._notifyReloadListener(s);
        const o = s.providerUserInfo?.length ? lf(s.providerUserInfo) : [], a = lw(e.providerData, o), l = e.isAnonymous, h = !(e.email && s.passwordHash) && !a?.length, f = l ? h : !1, m = {
            uid: s.localId,
            displayName: s.displayName || null,
            photoURL: s.photoUrl || null,
            email: s.email || null,
            emailVerified: s.emailVerified || !1,
            phoneNumber: s.phoneNumber || null,
            tenantId: s.tenantId || null,
            providerData: a,
            metadata: new ao(s.createdAt, s.lastLoginAt),
            isAnonymous: f
        };
        Object.assign(e, m);
    }
    async function cw(e) {
        const t = kr(e);
        await xi(t), await t.auth._persistUserIfCurrent(t), t.auth._notifyListenersIfCurrent(t);
    }
    function lw(e, t) {
        return [
            ...e.filter((r)=>!t.some((s)=>s.providerId === r.providerId)),
            ...t
        ];
    }
    function lf(e) {
        return e.map(({ providerId: t, ...n })=>({
                providerId: t,
                uid: n.rawId || "",
                displayName: n.displayName || null,
                email: n.email || null,
                phoneNumber: n.phoneNumber || null,
                photoURL: n.photoUrl || null
            }));
    }
    async function uw(e, t) {
        const n = await of(e, {}, async ()=>{
            const r = Bh({
                grant_type: "refresh_token",
                refresh_token: t
            }).slice(1), { tokenApiHost: s, apiKey: o } = e.config, a = await af(e, s, "/v1/token", `key=${o}`), l = await e._getAdditionalHeaders();
            l["Content-Type"] = "application/x-www-form-urlencoded";
            const h = {
                method: "POST",
                headers: l,
                body: r
            };
            return e.emulatorConfig && Vh(e.emulatorConfig.host) && (h.credentials = "include"), rf.fetch()(a, h);
        });
        return {
            accessToken: n.access_token,
            expiresIn: n.expires_in,
            refreshToken: n.refresh_token
        };
    }
    async function hw(e, t) {
        return Zi(e, "POST", "/v2/accounts:revokeToken", sf(e, t));
    }
    class zn {
        constructor(){
            this.refreshToken = null, this.accessToken = null, this.expirationTime = null;
        }
        get isExpired() {
            return !this.expirationTime || Date.now() > this.expirationTime - 3e4;
        }
        updateFromServerResponse(t) {
            nt(t.idToken, "internal-error"), nt(typeof t.idToken < "u", "internal-error"), nt(typeof t.refreshToken < "u", "internal-error");
            const n = "expiresIn" in t && typeof t.expiresIn < "u" ? Number(t.expiresIn) : Zc(t.idToken);
            this.updateTokensAndExpiration(t.idToken, t.refreshToken, n);
        }
        updateFromIdToken(t) {
            nt(t.length !== 0, "internal-error");
            const n = Zc(t);
            this.updateTokensAndExpiration(t, null, n);
        }
        async getToken(t, n = !1) {
            return !n && this.accessToken && !this.isExpired ? this.accessToken : (nt(this.refreshToken, t, "user-token-expired"), this.refreshToken ? (await this.refresh(t, this.refreshToken), this.accessToken) : null);
        }
        clearRefreshToken() {
            this.refreshToken = null;
        }
        async refresh(t, n) {
            const { accessToken: r, refreshToken: s, expiresIn: o } = await uw(t, n);
            this.updateTokensAndExpiration(r, s, Number(o));
        }
        updateTokensAndExpiration(t, n, r) {
            this.refreshToken = n || null, this.accessToken = t || null, this.expirationTime = Date.now() + r * 1e3;
        }
        static fromJSON(t, n) {
            const { refreshToken: r, accessToken: s, expirationTime: o } = n, a = new zn;
            return r && (nt(typeof r == "string", "internal-error", {
                appName: t
            }), a.refreshToken = r), s && (nt(typeof s == "string", "internal-error", {
                appName: t
            }), a.accessToken = s), o && (nt(typeof o == "number", "internal-error", {
                appName: t
            }), a.expirationTime = o), a;
        }
        toJSON() {
            return {
                refreshToken: this.refreshToken,
                accessToken: this.accessToken,
                expirationTime: this.expirationTime
            };
        }
        _assign(t) {
            this.accessToken = t.accessToken, this.refreshToken = t.refreshToken, this.expirationTime = t.expirationTime;
        }
        _clone() {
            return Object.assign(new zn, this.toJSON());
        }
        _performRefresh() {
            return wr("not implemented");
        }
    }
    function Ye(e, t) {
        nt(typeof e == "string" || typeof e > "u", "internal-error", {
            appName: t
        });
    }
    class we {
        constructor({ uid: t, auth: n, stsTokenManager: r, ...s }){
            this.providerId = "firebase", this.proactiveRefresh = new aw(this), this.reloadUserInfo = null, this.reloadListener = null, this.uid = t, this.auth = n, this.stsTokenManager = r, this.accessToken = r.accessToken, this.displayName = s.displayName || null, this.email = s.email || null, this.emailVerified = s.emailVerified || !1, this.phoneNumber = s.phoneNumber || null, this.photoURL = s.photoURL || null, this.isAnonymous = s.isAnonymous || !1, this.tenantId = s.tenantId || null, this.providerData = s.providerData ? [
                ...s.providerData
            ] : [], this.metadata = new ao(s.createdAt || void 0, s.lastLoginAt || void 0);
        }
        async getIdToken(t) {
            const n = await oo(this, this.stsTokenManager.getToken(this.auth, t));
            return nt(n, this.auth, "internal-error"), this.accessToken !== n && (this.accessToken = n, await this.auth._persistUserIfCurrent(this), this.auth._notifyListenersIfCurrent(this)), n;
        }
        getIdTokenResult(t) {
            return sw(this, t);
        }
        reload() {
            return cw(this);
        }
        _assign(t) {
            this !== t && (nt(this.uid === t.uid, this.auth, "internal-error"), this.displayName = t.displayName, this.photoURL = t.photoURL, this.email = t.email, this.emailVerified = t.emailVerified, this.phoneNumber = t.phoneNumber, this.isAnonymous = t.isAnonymous, this.tenantId = t.tenantId, this.providerData = t.providerData.map((n)=>({
                    ...n
                })), this.metadata._copy(t.metadata), this.stsTokenManager._assign(t.stsTokenManager));
        }
        _clone(t) {
            const n = new we({
                ...this,
                auth: t,
                stsTokenManager: this.stsTokenManager._clone()
            });
            return n.metadata._copy(this.metadata), n;
        }
        _onReload(t) {
            nt(!this.reloadListener, this.auth, "internal-error"), this.reloadListener = t, this.reloadUserInfo && (this._notifyReloadListener(this.reloadUserInfo), this.reloadUserInfo = null);
        }
        _notifyReloadListener(t) {
            this.reloadListener ? this.reloadListener(t) : this.reloadUserInfo = t;
        }
        _startProactiveRefresh() {
            this.proactiveRefresh._start();
        }
        _stopProactiveRefresh() {
            this.proactiveRefresh._stop();
        }
        async _updateTokensIfNecessary(t, n = !1) {
            let r = !1;
            t.idToken && t.idToken !== this.stsTokenManager.accessToken && (this.stsTokenManager.updateFromServerResponse(t), r = !0), n && await xi(this), await this.auth._persistUserIfCurrent(this), r && this.auth._notifyListenersIfCurrent(this);
        }
        async delete() {
            if (je(this.auth.app)) return Promise.reject(Ei(this.auth));
            const t = await this.getIdToken();
            return await oo(this, iw(this.auth, {
                idToken: t
            })), this.stsTokenManager.clearRefreshToken(), this.auth.signOut();
        }
        toJSON() {
            return {
                uid: this.uid,
                email: this.email || void 0,
                emailVerified: this.emailVerified,
                displayName: this.displayName || void 0,
                isAnonymous: this.isAnonymous,
                photoURL: this.photoURL || void 0,
                phoneNumber: this.phoneNumber || void 0,
                tenantId: this.tenantId || void 0,
                providerData: this.providerData.map((t)=>({
                        ...t
                    })),
                stsTokenManager: this.stsTokenManager.toJSON(),
                _redirectEventId: this._redirectEventId,
                ...this.metadata.toJSON(),
                apiKey: this.auth.config.apiKey,
                appName: this.auth.name
            };
        }
        get refreshToken() {
            return this.stsTokenManager.refreshToken || "";
        }
        static _fromJSON(t, n) {
            const r = n.displayName ?? void 0, s = n.email ?? void 0, o = n.phoneNumber ?? void 0, a = n.photoURL ?? void 0, l = n.tenantId ?? void 0, h = n._redirectEventId ?? void 0, f = n.createdAt ?? void 0, m = n.lastLoginAt ?? void 0, { uid: E, emailVerified: S, isAnonymous: D, providerData: N, stsTokenManager: R } = n;
            nt(E && R, t, "internal-error");
            const I = zn.fromJSON(this.name, R);
            nt(typeof E == "string", t, "internal-error"), Ye(r, t.name), Ye(s, t.name), nt(typeof S == "boolean", t, "internal-error"), nt(typeof D == "boolean", t, "internal-error"), Ye(o, t.name), Ye(a, t.name), Ye(l, t.name), Ye(h, t.name), Ye(f, t.name), Ye(m, t.name);
            const P = new we({
                uid: E,
                auth: t,
                email: s,
                emailVerified: S,
                displayName: r,
                isAnonymous: D,
                photoURL: a,
                phoneNumber: o,
                tenantId: l,
                stsTokenManager: I,
                createdAt: f,
                lastLoginAt: m
            });
            return N && Array.isArray(N) && (P.providerData = N.map((F)=>({
                    ...F
                }))), h && (P._redirectEventId = h), P;
        }
        static async _fromIdTokenResponse(t, n, r = !1) {
            const s = new zn;
            s.updateFromServerResponse(n);
            const o = new we({
                uid: n.localId,
                auth: t,
                stsTokenManager: s,
                isAnonymous: r
            });
            return await xi(o), o;
        }
        static async _fromGetAccountInfoResponse(t, n, r) {
            const s = n.users[0];
            nt(s.localId !== void 0, "internal-error");
            const o = s.providerUserInfo !== void 0 ? lf(s.providerUserInfo) : [], a = !(s.email && s.passwordHash) && !o?.length, l = new zn;
            l.updateFromIdToken(r);
            const h = new we({
                uid: s.localId,
                auth: t,
                stsTokenManager: l,
                isAnonymous: a
            }), f = {
                uid: s.localId,
                displayName: s.displayName || null,
                photoURL: s.photoUrl || null,
                email: s.email || null,
                emailVerified: s.emailVerified || !1,
                phoneNumber: s.phoneNumber || null,
                tenantId: s.tenantId || null,
                providerData: o,
                metadata: new ao(s.createdAt, s.lastLoginAt),
                isAnonymous: !(s.email && s.passwordHash) && !o?.length
            };
            return Object.assign(h, f), h;
        }
    }
    const Kc = new Map;
    function dn(e) {
        Mi(e instanceof Function, "Expected a class definition");
        let t = Kc.get(e);
        return t ? (Mi(t instanceof e, "Instance stored in cache mismatched with class"), t) : (t = new e, Kc.set(e, t), t);
    }
    class uf {
        constructor(){
            this.type = "NONE", this.storage = {};
        }
        async _isAvailable() {
            return !0;
        }
        async _set(t, n) {
            this.storage[t] = n;
        }
        async _get(t) {
            const n = this.storage[t];
            return n === void 0 ? null : n;
        }
        async _remove(t) {
            delete this.storage[t];
        }
        _addListener(t, n) {}
        _removeListener(t, n) {}
    }
    uf.type = "NONE";
    const qc = uf;
    function Ps(e, t, n) {
        return `firebase:${e}:${t}:${n}`;
    }
    class Xn {
        constructor(t, n, r){
            this.persistence = t, this.auth = n, this.userKey = r;
            const { config: s, name: o } = this.auth;
            this.fullUserKey = Ps(this.userKey, s.apiKey, o), this.fullPersistenceKey = Ps("persistence", s.apiKey, o), this.boundEventHandler = n._onStorageEvent.bind(n), this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
        }
        setCurrentUser(t) {
            return this.persistence._set(this.fullUserKey, t.toJSON());
        }
        async getCurrentUser() {
            const t = await this.persistence._get(this.fullUserKey);
            if (!t) return null;
            if (typeof t == "string") {
                const n = await Ui(this.auth, {
                    idToken: t
                }).catch(()=>{});
                return n ? we._fromGetAccountInfoResponse(this.auth, n, t) : null;
            }
            return we._fromJSON(this.auth, t);
        }
        removeCurrentUser() {
            return this.persistence._remove(this.fullUserKey);
        }
        savePersistenceForRedirect() {
            return this.persistence._set(this.fullPersistenceKey, this.persistence.type);
        }
        async setPersistence(t) {
            if (this.persistence === t) return;
            const n = await this.getCurrentUser();
            if (await this.removeCurrentUser(), this.persistence = t, n) return this.setCurrentUser(n);
        }
        delete() {
            this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
        }
        static async create(t, n, r = "authUser") {
            if (!n.length) return new Xn(dn(qc), t, r);
            const s = (await Promise.all(n.map(async (f)=>{
                if (await f._isAvailable()) return f;
            }))).filter((f)=>f);
            let o = s[0] || dn(qc);
            const a = Ps(r, t.config.apiKey, t.name);
            let l = null;
            for (const f of n)try {
                const m = await f._get(a);
                if (m) {
                    let E;
                    if (typeof m == "string") {
                        const S = await Ui(t, {
                            idToken: m
                        }).catch(()=>{});
                        if (!S) break;
                        E = await we._fromGetAccountInfoResponse(t, S, m);
                    } else E = we._fromJSON(t, m);
                    f !== o && (l = E), o = f;
                    break;
                }
            } catch  {}
            const h = s.filter((f)=>f._shouldAllowMigration);
            return !o._shouldAllowMigration || !h.length ? new Xn(o, t, r) : (o = h[0], l && await o._set(a, l.toJSON()), await Promise.all(n.map(async (f)=>{
                if (f !== o) try {
                    await f._remove(a);
                } catch  {}
            })), new Xn(o, t, r));
        }
    }
    function Jc(e) {
        const t = e.toLowerCase();
        if (t.includes("opera/") || t.includes("opr/") || t.includes("opios/")) return "Opera";
        if (Ew(t)) return "IEMobile";
        if (t.includes("msie") || t.includes("trident/")) return "IE";
        if (t.includes("edge/")) return "Edge";
        if (fw(t)) return "Firefox";
        if (t.includes("silk/")) return "Silk";
        if (gw(t)) return "Blackberry";
        if (mw(t)) return "Webos";
        if (dw(t)) return "Safari";
        if ((t.includes("chrome/") || pw(t)) && !t.includes("edge/")) return "Chrome";
        if (_w(t)) return "Android";
        {
            const n = /([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/, r = e.match(n);
            if (r?.length === 2) return r[1];
        }
        return "Other";
    }
    function fw(e = Re()) {
        return /firefox\//i.test(e);
    }
    function dw(e = Re()) {
        const t = e.toLowerCase();
        return t.includes("safari/") && !t.includes("chrome/") && !t.includes("crios/") && !t.includes("android");
    }
    function pw(e = Re()) {
        return /crios\//i.test(e);
    }
    function Ew(e = Re()) {
        return /iemobile/i.test(e);
    }
    function _w(e = Re()) {
        return /android/i.test(e);
    }
    function gw(e = Re()) {
        return /blackberry/i.test(e);
    }
    function mw(e = Re()) {
        return /webos/i.test(e);
    }
    function hf(e, t = []) {
        let n;
        switch(e){
            case "Browser":
                n = Jc(Re());
                break;
            case "Worker":
                n = `${Jc(Re())}-${e}`;
                break;
            default:
                n = e;
        }
        const r = t.length ? t.join(",") : "FirebaseCore-web";
        return `${n}/JsCore/${Br}/${r}`;
    }
    class Tw {
        constructor(t){
            this.auth = t, this.queue = [];
        }
        pushCallback(t, n) {
            const r = (o)=>new Promise((a, l)=>{
                    try {
                        const h = t(o);
                        a(h);
                    } catch (h) {
                        l(h);
                    }
                });
            r.onAbort = n, this.queue.push(r);
            const s = this.queue.length - 1;
            return ()=>{
                this.queue[s] = ()=>Promise.resolve();
            };
        }
        async runMiddleware(t) {
            if (this.auth.currentUser === t) return;
            const n = [];
            try {
                for (const r of this.queue)await r(t), r.onAbort && n.push(r.onAbort);
            } catch (r) {
                n.reverse();
                for (const s of n)try {
                    s();
                } catch  {}
                throw this.auth._errorFactory.create("login-blocked", {
                    originalMessage: r?.message
                });
            }
        }
    }
    async function ww(e, t = {}) {
        return Zi(e, "GET", "/v2/passwordPolicy", sf(e, t));
    }
    const Aw = 6;
    class Iw {
        constructor(t){
            const n = t.customStrengthOptions;
            this.customStrengthOptions = {}, this.customStrengthOptions.minPasswordLength = n.minPasswordLength ?? Aw, n.maxPasswordLength && (this.customStrengthOptions.maxPasswordLength = n.maxPasswordLength), n.containsLowercaseCharacter !== void 0 && (this.customStrengthOptions.containsLowercaseLetter = n.containsLowercaseCharacter), n.containsUppercaseCharacter !== void 0 && (this.customStrengthOptions.containsUppercaseLetter = n.containsUppercaseCharacter), n.containsNumericCharacter !== void 0 && (this.customStrengthOptions.containsNumericCharacter = n.containsNumericCharacter), n.containsNonAlphanumericCharacter !== void 0 && (this.customStrengthOptions.containsNonAlphanumericCharacter = n.containsNonAlphanumericCharacter), this.enforcementState = t.enforcementState, this.enforcementState === "ENFORCEMENT_STATE_UNSPECIFIED" && (this.enforcementState = "OFF"), this.allowedNonAlphanumericCharacters = t.allowedNonAlphanumericCharacters?.join("") ?? "", this.forceUpgradeOnSignin = t.forceUpgradeOnSignin ?? !1, this.schemaVersion = t.schemaVersion;
        }
        validatePassword(t) {
            const n = {
                isValid: !0,
                passwordPolicy: this
            };
            return this.validatePasswordLengthOptions(t, n), this.validatePasswordCharacterOptions(t, n), n.isValid && (n.isValid = n.meetsMinPasswordLength ?? !0), n.isValid && (n.isValid = n.meetsMaxPasswordLength ?? !0), n.isValid && (n.isValid = n.containsLowercaseLetter ?? !0), n.isValid && (n.isValid = n.containsUppercaseLetter ?? !0), n.isValid && (n.isValid = n.containsNumericCharacter ?? !0), n.isValid && (n.isValid = n.containsNonAlphanumericCharacter ?? !0), n;
        }
        validatePasswordLengthOptions(t, n) {
            const r = this.customStrengthOptions.minPasswordLength, s = this.customStrengthOptions.maxPasswordLength;
            r && (n.meetsMinPasswordLength = t.length >= r), s && (n.meetsMaxPasswordLength = t.length <= s);
        }
        validatePasswordCharacterOptions(t, n) {
            this.updatePasswordCharacterOptionsStatuses(n, !1, !1, !1, !1);
            let r;
            for(let s = 0; s < t.length; s++)r = t.charAt(s), this.updatePasswordCharacterOptionsStatuses(n, r >= "a" && r <= "z", r >= "A" && r <= "Z", r >= "0" && r <= "9", this.allowedNonAlphanumericCharacters.includes(r));
        }
        updatePasswordCharacterOptionsStatuses(t, n, r, s, o) {
            this.customStrengthOptions.containsLowercaseLetter && (t.containsLowercaseLetter || (t.containsLowercaseLetter = n)), this.customStrengthOptions.containsUppercaseLetter && (t.containsUppercaseLetter || (t.containsUppercaseLetter = r)), this.customStrengthOptions.containsNumericCharacter && (t.containsNumericCharacter || (t.containsNumericCharacter = s)), this.customStrengthOptions.containsNonAlphanumericCharacter && (t.containsNonAlphanumericCharacter || (t.containsNonAlphanumericCharacter = o));
        }
    }
    class yw {
        constructor(t, n, r, s){
            this.app = t, this.heartbeatServiceProvider = n, this.appCheckServiceProvider = r, this.config = s, this.currentUser = null, this.emulatorConfig = null, this.operations = Promise.resolve(), this.authStateSubscription = new Qc(this), this.idTokenSubscription = new Qc(this), this.beforeStateQueue = new Tw(this), this.redirectUser = null, this.isProactiveRefreshEnabled = !1, this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION = 1, this._canInitEmulator = !0, this._isInitialized = !1, this._deleted = !1, this._initializationPromise = null, this._popupRedirectResolver = null, this._errorFactory = tf, this._agentRecaptchaConfig = null, this._tenantRecaptchaConfigs = {}, this._projectPasswordPolicy = null, this._tenantPasswordPolicies = {}, this._resolvePersistenceManagerAvailable = void 0, this.lastNotifiedUid = void 0, this.languageCode = null, this.tenantId = null, this.settings = {
                appVerificationDisabledForTesting: !1
            }, this.frameworks = [], this.name = t.name, this.clientVersion = s.sdkClientVersion, this._persistenceManagerAvailable = new Promise((o)=>this._resolvePersistenceManagerAvailable = o);
        }
        _initializeWithPersistence(t, n) {
            return n && (this._popupRedirectResolver = dn(n)), this._initializationPromise = this.queue(async ()=>{
                if (!this._deleted && (this.persistenceManager = await Xn.create(this, t), this._resolvePersistenceManagerAvailable?.(), !this._deleted)) {
                    if (this._popupRedirectResolver?._shouldInitProactively) try {
                        await this._popupRedirectResolver._initialize(this);
                    } catch  {}
                    await this.initializeCurrentUser(n), this.lastNotifiedUid = this.currentUser?.uid || null, !this._deleted && (this._isInitialized = !0);
                }
            }), this._initializationPromise;
        }
        async _onStorageEvent() {
            if (this._deleted) return;
            const t = await this.assertedPersistence.getCurrentUser();
            if (!(!this.currentUser && !t)) {
                if (this.currentUser && t && this.currentUser.uid === t.uid) {
                    this._currentUser._assign(t), await this.currentUser.getIdToken();
                    return;
                }
                await this._updateCurrentUser(t, !0);
            }
        }
        async initializeCurrentUserFromIdToken(t) {
            try {
                const n = await Ui(this, {
                    idToken: t
                }), r = await we._fromGetAccountInfoResponse(this, n, t);
                await this.directlySetCurrentUser(r);
            } catch (n) {
                console.warn("FirebaseServerApp could not login user with provided authIdToken: ", n), await this.directlySetCurrentUser(null);
            }
        }
        async initializeCurrentUser(t) {
            if (je(this.app)) {
                const o = this.app.settings.authIdToken;
                return o ? new Promise((a)=>{
                    setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(a, a));
                }) : this.directlySetCurrentUser(null);
            }
            const n = await this.assertedPersistence.getCurrentUser();
            let r = n, s = !1;
            if (t && this.config.authDomain) {
                await this.getOrInitRedirectPersistenceManager();
                const o = this.redirectUser?._redirectEventId, a = r?._redirectEventId, l = await this.tryRedirectSignIn(t);
                (!o || o === a) && l?.user && (r = l.user, s = !0);
            }
            if (!r) return this.directlySetCurrentUser(null);
            if (!r._redirectEventId) {
                if (s) try {
                    await this.beforeStateQueue.runMiddleware(r);
                } catch (o) {
                    r = n, this._popupRedirectResolver._overrideRedirectResult(this, ()=>Promise.reject(o));
                }
                return r ? this.reloadAndSetCurrentUserOrClear(r) : this.directlySetCurrentUser(null);
            }
            return nt(this._popupRedirectResolver, this, "argument-error"), await this.getOrInitRedirectPersistenceManager(), this.redirectUser && this.redirectUser._redirectEventId === r._redirectEventId ? this.directlySetCurrentUser(r) : this.reloadAndSetCurrentUserOrClear(r);
        }
        async tryRedirectSignIn(t) {
            let n = null;
            try {
                n = await this._popupRedirectResolver._completeRedirectFn(this, t, !0);
            } catch  {
                await this._setRedirectUser(null);
            }
            return n;
        }
        async reloadAndSetCurrentUserOrClear(t) {
            try {
                await xi(t);
            } catch (n) {
                if (n?.code !== "auth/network-request-failed") return this.directlySetCurrentUser(null);
            }
            return this.directlySetCurrentUser(t);
        }
        useDeviceLanguage() {
            this.languageCode = QT();
        }
        async _delete() {
            this._deleted = !0;
        }
        async updateCurrentUser(t) {
            if (je(this.app)) return Promise.reject(Ei(this));
            const n = t ? kr(t) : null;
            return n && nt(n.auth.config.apiKey === this.config.apiKey, this, "invalid-user-token"), this._updateCurrentUser(n && n._clone(this));
        }
        async _updateCurrentUser(t, n = !1) {
            if (!this._deleted) return t && nt(this.tenantId === t.tenantId, this, "tenant-id-mismatch"), n || await this.beforeStateQueue.runMiddleware(t), this.queue(async ()=>{
                await this.directlySetCurrentUser(t), this.notifyAuthListeners();
            });
        }
        async signOut() {
            return je(this.app) ? Promise.reject(Ei(this)) : (await this.beforeStateQueue.runMiddleware(null), (this.redirectPersistenceManager || this._popupRedirectResolver) && await this._setRedirectUser(null), this._updateCurrentUser(null, !0));
        }
        setPersistence(t) {
            return je(this.app) ? Promise.reject(Ei(this)) : this.queue(async ()=>{
                await this.assertedPersistence.setPersistence(dn(t));
            });
        }
        _getRecaptchaConfig() {
            return this.tenantId == null ? this._agentRecaptchaConfig : this._tenantRecaptchaConfigs[this.tenantId];
        }
        async validatePassword(t) {
            this._getPasswordPolicyInternal() || await this._updatePasswordPolicy();
            const n = this._getPasswordPolicyInternal();
            return n.schemaVersion !== this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION ? Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version", {})) : n.validatePassword(t);
        }
        _getPasswordPolicyInternal() {
            return this.tenantId === null ? this._projectPasswordPolicy : this._tenantPasswordPolicies[this.tenantId];
        }
        async _updatePasswordPolicy() {
            const t = await ww(this), n = new Iw(t);
            this.tenantId === null ? this._projectPasswordPolicy = n : this._tenantPasswordPolicies[this.tenantId] = n;
        }
        _getPersistenceType() {
            return this.assertedPersistence.persistence.type;
        }
        _getPersistence() {
            return this.assertedPersistence.persistence;
        }
        _updateErrorMap(t) {
            this._errorFactory = new xr("auth", "Firebase", t());
        }
        onAuthStateChanged(t, n, r) {
            return this.registerStateListener(this.authStateSubscription, t, n, r);
        }
        beforeAuthStateChanged(t, n) {
            return this.beforeStateQueue.pushCallback(t, n);
        }
        onIdTokenChanged(t, n, r) {
            return this.registerStateListener(this.idTokenSubscription, t, n, r);
        }
        authStateReady() {
            return new Promise((t, n)=>{
                if (this.currentUser) t();
                else {
                    const r = this.onAuthStateChanged(()=>{
                        r(), t();
                    }, n);
                }
            });
        }
        async revokeAccessToken(t) {
            if (this.currentUser) {
                const n = await this.currentUser.getIdToken(), r = {
                    providerId: "apple.com",
                    tokenType: "ACCESS_TOKEN",
                    token: t,
                    idToken: n
                };
                this.tenantId != null && (r.tenantId = this.tenantId), await hw(this, r);
            }
        }
        toJSON() {
            return {
                apiKey: this.config.apiKey,
                authDomain: this.config.authDomain,
                appName: this.name,
                currentUser: this._currentUser?.toJSON()
            };
        }
        async _setRedirectUser(t, n) {
            const r = await this.getOrInitRedirectPersistenceManager(n);
            return t === null ? r.removeCurrentUser() : r.setCurrentUser(t);
        }
        async getOrInitRedirectPersistenceManager(t) {
            if (!this.redirectPersistenceManager) {
                const n = t && dn(t) || this._popupRedirectResolver;
                nt(n, this, "argument-error"), this.redirectPersistenceManager = await Xn.create(this, [
                    dn(n._redirectPersistence)
                ], "redirectUser"), this.redirectUser = await this.redirectPersistenceManager.getCurrentUser();
            }
            return this.redirectPersistenceManager;
        }
        async _redirectUserForId(t) {
            return this._isInitialized && await this.queue(async ()=>{}), this._currentUser?._redirectEventId === t ? this._currentUser : this.redirectUser?._redirectEventId === t ? this.redirectUser : null;
        }
        async _persistUserIfCurrent(t) {
            if (t === this.currentUser) return this.queue(async ()=>this.directlySetCurrentUser(t));
        }
        _notifyListenersIfCurrent(t) {
            t === this.currentUser && this.notifyAuthListeners();
        }
        _key() {
            return `${this.config.authDomain}:${this.config.apiKey}:${this.name}`;
        }
        _startProactiveRefresh() {
            this.isProactiveRefreshEnabled = !0, this.currentUser && this._currentUser._startProactiveRefresh();
        }
        _stopProactiveRefresh() {
            this.isProactiveRefreshEnabled = !1, this.currentUser && this._currentUser._stopProactiveRefresh();
        }
        get _currentUser() {
            return this.currentUser;
        }
        notifyAuthListeners() {
            if (!this._isInitialized) return;
            this.idTokenSubscription.next(this.currentUser);
            const t = this.currentUser?.uid ?? null;
            this.lastNotifiedUid !== t && (this.lastNotifiedUid = t, this.authStateSubscription.next(this.currentUser));
        }
        registerStateListener(t, n, r, s) {
            if (this._deleted) return ()=>{};
            const o = typeof n == "function" ? n : n.next.bind(n);
            let a = !1;
            const l = this._isInitialized ? Promise.resolve() : this._initializationPromise;
            if (nt(l, this, "internal-error"), l.then(()=>{
                a || o(this.currentUser);
            }), typeof n == "function") {
                const h = t.addObserver(n, r, s);
                return ()=>{
                    a = !0, h();
                };
            } else {
                const h = t.addObserver(n);
                return ()=>{
                    a = !0, h();
                };
            }
        }
        async directlySetCurrentUser(t) {
            this.currentUser && this.currentUser !== t && this._currentUser._stopProactiveRefresh(), t && this.isProactiveRefreshEnabled && t._startProactiveRefresh(), this.currentUser = t, t ? await this.assertedPersistence.setCurrentUser(t) : await this.assertedPersistence.removeCurrentUser();
        }
        queue(t) {
            return this.operations = this.operations.then(t, t), this.operations;
        }
        get assertedPersistence() {
            return nt(this.persistenceManager, this, "internal-error"), this.persistenceManager;
        }
        _logFramework(t) {
            !t || this.frameworks.includes(t) || (this.frameworks.push(t), this.frameworks.sort(), this.clientVersion = hf(this.config.clientPlatform, this._getFrameworks()));
        }
        _getFrameworks() {
            return this.frameworks;
        }
        async _getAdditionalHeaders() {
            const t = {
                "X-Client-Version": this.clientVersion
            };
            this.app.options.appId && (t["X-Firebase-gmpid"] = this.app.options.appId);
            const n = await this.heartbeatServiceProvider.getImmediate({
                optional: !0
            })?.getHeartbeatsHeader();
            n && (t["X-Firebase-Client"] = n);
            const r = await this._getAppCheckToken();
            return r && (t["X-Firebase-AppCheck"] = r), t;
        }
        async _getAppCheckToken() {
            if (je(this.app) && this.app.settings.appCheckToken) return this.app.settings.appCheckToken;
            const t = await this.appCheckServiceProvider.getImmediate({
                optional: !0
            })?.getToken();
            return t?.error && KT(`Error while retrieving App Check token: ${t.error}`), t?.token;
        }
    }
    function Sw(e) {
        return kr(e);
    }
    class Qc {
        constructor(t){
            this.auth = t, this.observer = null, this.addObserver = vg((n)=>this.observer = n);
        }
        get next() {
            return nt(this.observer, this.auth, "internal-error"), this.observer.next.bind(this.observer);
        }
    }
    function Rw(e, t) {
        const n = t?.persistence || [], r = (Array.isArray(n) ? n : [
            n
        ]).map(dn);
        t?.errorMap && e._updateErrorMap(t.errorMap), e._initializeWithPersistence(r, t?.popupRedirectResolver);
    }
    new Hr(3e4, 6e4);
    new Hr(2e3, 1e4);
    new Hr(3e4, 6e4);
    new Hr(5e3, 15e3);
    var $c = "@firebase/auth", tl = "1.13.2";
    class Nw {
        constructor(t){
            this.auth = t, this.internalListeners = new Map;
        }
        getUid() {
            return this.assertAuthConfigured(), this.auth.currentUser?.uid || null;
        }
        async getToken(t) {
            return this.assertAuthConfigured(), await this.auth._initializationPromise, this.auth.currentUser ? {
                accessToken: await this.auth.currentUser.getIdToken(t)
            } : null;
        }
        addAuthTokenListener(t) {
            if (this.assertAuthConfigured(), this.internalListeners.has(t)) return;
            const n = this.auth.onIdTokenChanged((r)=>{
                t(r?.stsTokenManager.accessToken || null);
            });
            this.internalListeners.set(t, n), this.updateProactiveRefresh();
        }
        removeAuthTokenListener(t) {
            this.assertAuthConfigured();
            const n = this.internalListeners.get(t);
            n && (this.internalListeners.delete(t), n(), this.updateProactiveRefresh());
        }
        assertAuthConfigured() {
            nt(this.auth._initializationPromise, "dependent-sdk-initialized-before-auth");
        }
        updateProactiveRefresh() {
            this.internalListeners.size > 0 ? this.auth._startProactiveRefresh() : this.auth._stopProactiveRefresh();
        }
    }
    function Dw(e) {
        switch(e){
            case "Node":
                return "node";
            case "ReactNative":
                return "rn";
            case "Worker":
                return "webworker";
            case "Cordova":
                return "cordova";
            case "WebExtension":
                return "web-extension";
            default:
                return;
        }
    }
    function bw(e) {
        In(new An("auth", (t, { options: n })=>{
            const r = t.getProvider("app").getImmediate(), s = t.getProvider("heartbeat"), o = t.getProvider("app-check-internal"), { apiKey: a, authDomain: l } = r.options;
            nt(a && !a.includes(":"), "invalid-api-key", {
                appName: r.name
            });
            const h = {
                apiKey: a,
                authDomain: l,
                clientPlatform: e,
                apiHost: "identitytoolkit.googleapis.com",
                tokenApiHost: "securetoken.googleapis.com",
                apiScheme: "https",
                sdkClientVersion: hf(e)
            }, f = new yw(r, s, o, h);
            return Rw(f, n), f;
        }, "PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((t, n, r)=>{
            t.getProvider("auth-internal").initialize();
        })), In(new An("auth-internal", (t)=>{
            const n = Sw(t.getProvider("auth").getImmediate());
            return ((r)=>new Nw(r))(n);
        }, "PRIVATE").setInstantiationMode("EXPLICIT")), ye($c, tl, Dw(e)), ye($c, tl, "esm2020");
    }
    const Ow = 300;
    Sg("authIdTokenMaxAge");
    bw("Browser");
    const Cw = [
        {
            id: "paletteOffset",
            label: "Palette Offset",
            defaultType: "loop",
            defaultSpeed: .8,
            defaultAmplitude: 1,
            minAmplitude: 0,
            maxAmplitude: 1,
            amplitudeStep: .01,
            unit: "cycle"
        },
        {
            id: "heightPaletteShift",
            label: "Height Palette Shift",
            defaultType: "sine",
            defaultSpeed: .25,
            defaultAmplitude: 20,
            minAmplitude: 0,
            maxAmplitude: 100,
            amplitudeStep: .5,
            unit: ""
        },
        {
            id: "lightAngle",
            label: "Light Angle",
            defaultType: "loop",
            defaultSpeed: .15,
            defaultAmplitude: 1,
            minAmplitude: 0,
            maxAmplitude: 1,
            amplitudeStep: .01,
            unit: "turn"
        },
        {
            id: "textureDrift",
            label: "Texture Drift",
            defaultType: "sine",
            defaultSpeed: 1,
            defaultAmplitude: 1,
            minAmplitude: 0,
            maxAmplitude: 2,
            amplitudeStep: .01,
            unit: ""
        },
        {
            id: "skyReflectionDrift",
            label: "Sky Reflection Drift",
            defaultType: "sine",
            defaultSpeed: .6,
            defaultAmplitude: 1,
            minAmplitude: 0,
            maxAmplitude: 2,
            amplitudeStep: .01,
            unit: ""
        },
        {
            id: "phaseColoring",
            label: "Phase Coloring",
            defaultType: "pulse",
            defaultSpeed: .3,
            defaultAmplitude: 25,
            minAmplitude: 0,
            maxAmplitude: 100,
            amplitudeStep: .5,
            unit: ""
        },
        {
            id: "varnish",
            label: "Varnish",
            defaultType: "pulse",
            defaultSpeed: .22,
            defaultAmplitude: 2,
            minAmplitude: 0,
            maxAmplitude: 10,
            amplitudeStep: .05,
            unit: ""
        },
        {
            id: "microBump",
            label: "Micro Bump",
            defaultType: "pulse",
            defaultSpeed: .35,
            defaultAmplitude: .5,
            minAmplitude: 0,
            maxAmplitude: 2,
            amplitudeStep: .01,
            unit: ""
        },
        {
            id: "displacement",
            label: "Displacement",
            defaultType: "sine",
            defaultSpeed: .2,
            defaultAmplitude: .02,
            minAmplitude: 0,
            maxAmplitude: .1,
            amplitudeStep: .001,
            unit: ""
        },
        {
            id: "tessellation",
            label: "Tessellation",
            defaultType: "sine",
            defaultSpeed: .18,
            defaultAmplitude: 2,
            minAmplitude: 0,
            maxAmplitude: 10,
            amplitudeStep: .1,
            unit: ""
        },
        {
            id: "protrusionPhase",
            label: "Protrusion Phase",
            defaultType: "loop",
            defaultSpeed: .15,
            defaultAmplitude: 1,
            minAmplitude: 0,
            maxAmplitude: 1,
            amplitudeStep: .001,
            unit: "cycle"
        },
        {
            id: "reliefDepth",
            label: "Relief Depth",
            defaultType: "sine",
            defaultSpeed: .2,
            defaultAmplitude: .35,
            minAmplitude: 0,
            maxAmplitude: 2,
            amplitudeStep: .01,
            unit: ""
        },
        {
            id: "orbitTrapPhaseOffset",
            label: "Orbit Trap Color Phase",
            defaultType: "loop",
            defaultSpeed: .2,
            defaultAmplitude: 1,
            minAmplitude: 0,
            maxAmplitude: 4,
            amplitudeStep: .01,
            unit: "cycle"
        },
        {
            id: "orbitTrapStrength",
            label: "Orbit Trap Strength",
            defaultType: "pulse",
            defaultSpeed: .25,
            defaultAmplitude: 40,
            minAmplitude: 0,
            maxAmplitude: 100,
            amplitudeStep: .5,
            unit: ""
        },
        {
            id: "gradeSaturation",
            label: "Saturation",
            defaultType: "sine",
            defaultSpeed: .18,
            defaultAmplitude: .25,
            minAmplitude: 0,
            maxAmplitude: 2,
            amplitudeStep: .01,
            unit: ""
        },
        {
            id: "gradeContrast",
            label: "Contrast",
            defaultType: "sine",
            defaultSpeed: .16,
            defaultAmplitude: .15,
            minAmplitude: 0,
            maxAmplitude: 1.5,
            amplitudeStep: .01,
            unit: ""
        }
    ];
    new Map(Cw.map((e)=>[
            e.id,
            e
        ]));
    function Wt(e) {
        if (e === null || typeof e == "string" || typeof e == "boolean" || typeof e == "number" && Number.isFinite(e)) return JSON.stringify(e);
        if (Array.isArray(e)) return "[" + e.map(Wt).join(",") + "]";
        if (e && typeof e == "object" && Object.getPrototypeOf(e) === Object.prototype) return "{" + Object.keys(e).sort().map((t)=>JSON.stringify(t) + ":" + Wt(e[t])).join(",") + "}";
        throw new Error("Appearance must contain finite JSON values only");
    }
    async function Ls(e) {
        const t = await crypto.subtle.digest("SHA-256", new Uint8Array(e));
        return "sha256:" + Array.from(new Uint8Array(t), (n)=>n.toString(16).padStart(2, "0")).join("");
    }
    function Zn(e) {
        if (typeof e != "string" || e.length > 16384) throw new Error("Invalid decimal");
        const t = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(e.trim());
        if (!t) throw new Error("Invalid decimal");
        const n = t[3] ?? t[4] ?? "";
        let r = ((t[2] ?? "") + n).replace(/^0+/, ""), s = BigInt(t[5] ?? "0") - BigInt(n.length);
        if (!r) return {
            negative: !1,
            digits: "0",
            exponent: 0n
        };
        const o = r.length - r.replace(/0+$/, "").length;
        return r = r.slice(0, r.length - o), s += BigInt(o), {
            negative: t[1] === "-",
            digits: r,
            exponent: s
        };
    }
    function ff(e) {
        return e.digits === "0" ? "0" : `${e.negative ? "-" : ""}${e.digits[0]}${e.digits.length > 1 ? "." + e.digits.slice(1) : ""}e${e.exponent + BigInt(e.digits.length - 1)}`;
    }
    function el(e) {
        return ff(Zn(e));
    }
    function Kn(e) {
        const t = Zn(e);
        if (t.negative || t.digits === "0") throw new Error("Scale must be positive");
        return ff(t);
    }
    function Pw(e, t) {
        const n = Zn(Kn(e)), r = Zn(Kn(t)), s = n.exponent + BigInt(n.digits.length), o = r.exponent + BigInt(r.digits.length);
        if (s !== o) return s < o ? -1 : 1;
        const a = Math.max(n.digits.length, r.digits.length), l = n.digits.padEnd(a, "0"), h = r.digits.padEnd(a, "0");
        return l === h ? 0 : l < h ? -1 : 1;
    }
    function Lw(e, t) {
        const n = e.toString(), r = t.toString(), s = Math.min(16, n.length), o = Math.min(16, r.length);
        return Number(n.slice(0, s)) / Number(r.slice(0, o)) * 10 ** (n.length - s - r.length + o);
    }
    function df(e, t) {
        const n = Zn(Kn(e)), r = Zn(Kn(t)), s = n.exponent + BigInt(n.digits.length) - r.exponent - BigInt(r.digits.length);
        if (s >= -1n && s <= 1n) {
            const l = n.exponent < r.exponent ? n.exponent : r.exponent, h = BigInt(n.digits) * 10n ** (n.exponent - l), f = BigInt(r.digits) * 10n ** (r.exponent - l);
            if (h === f) return 0;
            const m = h > f ? 1 : -1, E = h < f ? h : f, S = h > f ? h - f : f - h, D = m * Math.log1p(Lw(S, E)) / Math.LN2;
            if (D === 0) throw new Error("Zoom window is below the supported relative precision");
            return D;
        }
        const o = Number(s);
        if (!Number.isSafeInteger(o)) throw new Error("Zoom distance exceeds planner limits");
        const a = (l)=>Number(l.slice(0, 16)) / 10 ** (Math.min(16, l.length) - 1);
        return o * Math.LOG2E * Math.LN10 + Math.log2(a(n.digits) / a(r.digits));
    }
    function pf(e) {
        const t = {
            cx: el(e.cx),
            cy: el(e.cy),
            startScale: Kn(e.startScale),
            endScale: Kn(e.endScale)
        };
        if (Pw(t.startScale, t.endScale) < 0) throw new Error("Document domain must go from coarse to fine");
        return t;
    }
    function Fw(e) {
        const { width: t, height: n, density: r } = e;
        if (![
            t,
            n
        ].every((E)=>Number.isInteger(E) && E > 0 && E <= 16384)) throw new Error("Invalid target dimensions");
        if (!Number.isFinite(r) || r < 1 || r > 8) throw new Error("Density must be in [1, 8]");
        const s = e.radialDensity ?? r;
        if (!Number.isFinite(s) || s < 1 || s > 64) throw new Error("Radial density must be in [1, 64]");
        const o = e.centerOctaves ?? 12;
        if (!Number.isInteger(o) || o < 12 || o > 24) throw new Error("Invalid center coverage");
        const a = e.halo ?? 2, l = e.blockSize ?? 512;
        if (!Number.isInteger(a) || a < 1 || a > 16) throw new Error("Invalid filter halo");
        if (!Number.isInteger(l) || l <= 2 * a || l > 512 || l % 2) throw new Error("Invalid coded block size");
        const h = pf(e.domain), f = Math.hypot(t, n) / 2, m = df(h.startScale, h.endScale) * Math.LN2;
        if (!Number.isFinite(m) || m / Math.LN2 > 999980) throw new Error("Document exceeds planner limit");
        if (f > 2 ** o) throw new Error("Target exceeds the central coverage");
        return {
            domain: h,
            width: t,
            height: n,
            density: r,
            ...e.radialDensity === void 0 ? {} : {
                radialDensity: s
            },
            ...e.centerOctaves === void 0 ? {} : {
                centerOctaves: o
            },
            radius: f,
            depth: m,
            angularSamples: Math.ceil(2 * Math.PI * r * f),
            rhoStep: Math.LN2 / Math.ceil(Math.LN2 * s * f),
            halo: a,
            blockSize: l
        };
    }
    const vw = 12, nl = (e)=>Math.ceil(e / 16) * 16;
    function Mw(e) {
        const t = e.angularSamples, n = Math.ceil(Math.LN2 * (e.radialDensity ?? e.density) * e.radius), r = Math.floor(df(e.domain.startScale, e.domain.endScale)) + (e.centerOctaves ?? vw) + 1, s = 2;
        if (!Number.isSafeInteger(r) || r > 1e6) throw new Error("Trop de doublements pour ce document");
        return {
            angularSamples: t,
            rowsPerOctave: n,
            tileWidth: nl(t + 2 * s),
            tileHeight: nl(n + 1 + 2 * s),
            tileCount: r,
            halo: s
        };
    }
    const Ef = 128 * 1024 * 1024, _f = Ef + 1024 * 1024, Uw = 16383;
    function xw(e, t) {
        if (![
            e,
            t
        ].every((n)=>Number.isInteger(n) && n > 0 && n <= Uw) || e * t * 4 > Ef) throw new Error("Cette tuile dépasse les limites WebP ou le budget de 128 MiB. Réduire la résolution ou la densité.");
    }
    const kw = {
        storage: "zip64",
        codec: "webp",
        bitDepth: 8,
        chroma: "420",
        transfer: "iec61966-2-1",
        alpha: !1
    };
    function lr(e) {
        if (e.version !== 5) throw new Error("Ancien format ExpMap non pris en charge : recréer le fichier .expmap.");
        if (typeof e.name != "string" || !e.name.trim() || e.name.length > 200) throw new Error("Invalid document name");
        if (!Number.isFinite(e.quality) || e.quality < 0 || e.quality > 1) throw new Error("Invalid WebP quality");
        if (e.thumbnail !== void 0 && (e.thumbnail.length > 128 * 1024 || !/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(e.thumbnail))) throw new Error("Invalid thumbnail");
        if (typeof e.forceRender != "boolean") throw new Error("Invalid experimental rendering flag");
        if (!/^[a-zA-Z0-9-]{1,100}$/.test(e.documentId) || !Number.isSafeInteger(e.generation) || e.generation < 0) throw new Error("Invalid document identity");
        if (![
            "preparing",
            "interrupted",
            "complete"
        ].includes(e.state)) throw new Error("Invalid document state");
        if (e.scaleConvention !== "VideoPathLocation.scale") throw new Error("Invalid scale convention");
        if (pf({
            ...e.projection.domain,
            startScale: e.zoomReferenceScale,
            endScale: e.zoomReferenceScale
        }), Wt(Fw(e.projection)) !== Wt(e.projection)) throw new Error("Invalid projection contract");
        if (Wt(Mw(e.projection)) !== Wt(e.octaves)) throw new Error("Invalid octave layout");
        if (Wt(e.color) !== Wt(kw)) throw new Error("Unsupported codec/colorimetry");
        if (e.geometryConvention !== void 0 && e.geometryConvention !== "continuous-radial-v1" && e.geometryConvention !== "continuous-radial-v2") throw new Error("Unsupported geometry convention");
        const t = /^sha256:[a-f0-9]{64}$/;
        if (!t.test(e.appearance.identity) || Wt(JSON.parse(e.appearance.json)) !== e.appearance.json) throw new Error("Invalid appearance identity");
        for (const n of e.appearance.resources)if (!n.role || !t.test(n.identity) || !Number.isSafeInteger(n.bytes) || n.bytes < 0) throw new Error("Invalid resource");
        if (e.center && (e.center.length !== 3 || e.center.some((n)=>!Number.isInteger(n) || n < 0 || n > 255))) throw new Error("Invalid center color");
        if (!Array.isArray(e.tiles) || e.tiles.length > e.octaves.tileCount) throw new Error("Invalid image coverage");
        for (const [n, r] of e.tiles.entries())if (r.index !== n || r.file !== `doubling-${n}.webp` || !Number.isSafeInteger(r.length) || r.length <= 0 || r.length > _f || !t.test(r.sha256)) throw new Error("Invalid image index");
        if (e.state === "complete" && (!e.center || e.tiles.length !== e.octaves.tileCount)) throw new Error("Complete document has missing tiles or center");
    }
    const Fs = 32 * 1024 * 1024;
    async function vs(e, t, n) {
        const r = await e.getFileHandle(t, {
            create: !0
        }), s = await r.createWritable();
        try {
            await s.write(typeof n == "string" ? n : {
                type: "write",
                position: 0,
                data: new Uint8Array(n)
            }), await s.close();
        } catch (o) {
            throw await s.abort().catch(()=>{}), o;
        }
    }
    class pn {
        entries;
        zip;
        directory;
        destination;
        constructor(t, n){
            this.directory = t, this.destination = n;
        }
        static async fromFile(t) {
            const n = new pn(void 0, t);
            n.zip = new bo(new wn(await t.getFile()), {
                useWebWorkers: !1
            });
            const r = await n.zip.getEntries();
            if (r.length > 1000002) throw new Error("ExpMap index exceeds budget");
            n.entries = new Map;
            for (const s of r){
                if (s.directory || s.encrypted || s.compressionMethod !== 0 || n.entries.has(s.filename)) throw new Error("Invalid ExpMap archive index");
                n.entries.set(s.filename, s);
            }
            return n;
        }
        static async working(t, n, r = !1, s = {}) {
            if (!/^[a-zA-Z0-9-]{1,100}$/.test(n)) throw new Error("Invalid working document identity");
            if (!navigator.storage?.getDirectory) throw new Error("Le stockage de travail privé du navigateur est requis pour créer un ExpMap");
            const l = await (await (await navigator.storage.getDirectory()).getDirectoryHandle("expmap-work", {
                create: !0
            })).getDirectoryHandle(n, {
                create: !0
            }), h = new pn(l, t);
            if (r) {
                try {
                    return await h.open(n), h;
                } catch (E) {
                    if (!(E instanceof DOMException && E.name === "NotFoundError")) throw E;
                }
                const f = await pn.fromFile(t), m = await f.open(n);
                s.onProgress?.(0, m.tiles.length);
                for (const E of m.tiles)s.signal?.throwIfAborted(), await vs(l, E.file, await f.readTile(E)), s.onProgress?.(E.index + 1, m.tiles.length);
                await h.publish(m);
            }
            return h;
        }
        async assertEmpty() {
            if (!this.directory) throw new Error("Read-only document");
            for await (const t of this.directory.values())throw new Error("Document de travail déjà présent");
        }
        async read(t, n) {
            if (this.directory) {
                const s = await (await this.directory.getFileHandle(t)).getFile();
                if (s.size > n) throw new Error("Image or metadata exceeds budget");
                return new Uint8Array(await s.arrayBuffer());
            }
            const r = this.entries?.get(t);
            if (!r || !("getData" in r)) throw new DOMException("Missing archive entry", "NotFoundError");
            if (r.uncompressedSize > n) throw new Error("Image or metadata exceeds budget");
            return r.getData(new Qp, {
                checkSignature: !0,
                useWebWorkers: !1
            });
        }
        async open(t, n = !1) {
            const r = [];
            let s;
            for (const o of this.directory ? [
                "manifest-a.json",
                "manifest-b.json"
            ] : [
                "manifest.json"
            ])try {
                const a = JSON.parse(new TextDecoder().decode(await this.read(o, Fs)));
                lr(a), r.push(a);
            } catch (a) {
                if (a instanceof DOMException && a.name === "NotAllowedError") throw a;
                s = a;
            }
            if (r.sort((o, a)=>a.generation - o.generation), t && r.length && r[0].documentId !== t) throw new Error("Fichier associé à un autre document");
            for (const o of r)try {
                if (o.documentId !== r[0].documentId) continue;
                return await this.verify(o, n && o.state === "complete" ? [] : void 0), o;
            } catch (a) {
                s = a;
            }
            throw s ?? new Error("No valid ExpMap checkpoint");
        }
        async readTile(t, n, r) {
            n?.throwIfAborted();
            let s = performance.now();
            const o = await this.read(t.file, t.length);
            r?.record("read", performance.now() - s), n?.throwIfAborted(), s = performance.now();
            const a = await Ls(o);
            if (r?.record("hash", performance.now() - s), n?.throwIfAborted(), o.length !== t.length || a !== t.sha256) throw new Error(`Corrupt image ${t.index}`);
            return o;
        }
        async verify(t, n = t.tiles) {
            if (lr(t), await Ls(new TextEncoder().encode(t.appearance.json)) !== t.appearance.identity) throw new Error("Appearance content identity mismatch");
            for (const r of n)await this.verifyTile(r);
        }
        async verifyTile(t) {
            if ((this.directory ? (await (await this.directory.getFileHandle(t.file)).getFile()).size : this.entries?.get(t.file)?.uncompressedSize) !== t.length) throw new Error(`Missing or truncated image ${t.index}`);
        }
        async publish(t) {
            if (!this.directory) throw new Error("Read-only document");
            lr(t);
            const n = Wt(t);
            if (new TextEncoder().encode(n).length > Fs) throw new Error("Manifest exceeds metadata budget");
            const r = t.generation % 2 ? "manifest-b.json" : "manifest-a.json";
            if (await vs(this.directory, r, n), new TextDecoder().decode(await this.read(r, Fs)) !== n) throw new Error("Checkpoint readback mismatch");
        }
        async appendTile(t, n) {
            if (!this.directory) throw new Error("Read-only document");
            const r = t.tiles.length, s = {
                index: r,
                file: `doubling-${r}.webp`,
                length: n.length,
                sha256: await Ls(n)
            }, o = {
                ...t,
                generation: t.generation + 1,
                state: "preparing",
                tiles: [
                    ...t.tiles,
                    s
                ]
            };
            return lr(o), await vs(this.directory, s.file, n), await this.readTile(s), await this.publish(o), o;
        }
        async saveContainer(t, n, r, s = this.destination) {
            if (!s) throw new Error("Destination .expmap manquante");
            lr(t), n?.(0, t.tiles.length);
            const o = await s.createWritable(), a = new O_(o, {
                zip64: !0,
                level: 0,
                useWebWorkers: !1,
                bufferedWrite: !1
            });
            try {
                await a.add("manifest.json", new Jp(Wt(t)), {
                    signal: r
                });
                for (const f of t.tiles){
                    r?.throwIfAborted();
                    const m = this.directory ? await (await this.directory.getFileHandle(f.file)).getFile() : new Blob([
                        await this.readTile(f)
                    ]);
                    await a.add(f.file, new wn(m), {
                        signal: r
                    }), n?.(f.index + 1, t.tiles.length);
                }
                await a.close();
                const h = await (await pn.fromFile(s)).open(t.documentId);
                if (Wt(h) !== Wt(t)) throw new Error("Archive readback mismatch");
            } catch (l) {
                throw await o.abort().catch(()=>{}), l;
            }
        }
        async discardWorking(t) {
            await (await (await navigator.storage.getDirectory()).getDirectoryHandle("expmap-work")).removeEntry(t, {
                recursive: !0
            });
        }
    }
    async function Bw(e, t, n) {
        if (xw(t, n), !e.length || e.length > _f) throw new Error("Invalid encoded image size");
        const r = await createImageBitmap(new Blob([
            new Uint8Array(e)
        ], {
            type: "image/webp"
        }), {
            premultiplyAlpha: "none",
            colorSpaceConversion: "default"
        });
        if (r.width !== t || r.height !== n) throw r.close(), new Error("Dimensions WebP incompatibles avec le document");
        return r;
    }
    class Vw {
        stages = new Map;
        record(t, n) {
            const r = this.stages.get(t) ?? {
                count: 0,
                totalMs: 0,
                lastMs: 0,
                maxMs: 0
            };
            r.count++, r.totalMs += n, r.lastMs = n, r.maxMs = Math.max(r.maxMs, n), this.stages.set(t, r);
        }
        snapshot() {
            return Object.fromEntries([
                ...this.stages
            ].map(([t, n])=>[
                    t,
                    {
                        ...n
                    }
                ]));
        }
    }
    let qn, te, Ir = !1, Qt, Mn, Yn, ki, _e = [], Ms = 0, rl = !1;
    const gn = new Map, Hw = 64 * 1024 * 1024;
    let Bi = 0;
    function Gw() {
        for (const [e, t] of gn)!_e.includes(e) && e !== Qt?.index && (gn.delete(e), Bi -= t.length);
    }
    async function zw(e, t, n) {
        if (!te?.tiles[e] || !qn) throw new Error("Tuile ExpMap invalide");
        const r = gn.get(e);
        return r ? (gn.delete(e), Bi -= r.length, r) : qn.readTile(te.tiles[e], t, n);
    }
    async function il() {
        if (!(Ir || !qn || !te)) {
            Ir = !0;
            try {
                for(; Qt || _e.some((e)=>!gn.has(e));){
                    let e = Qt;
                    Qt = void 0;
                    const t = e?.index ?? _e.find((s)=>!gn.has(s));
                    if (!e && (!te.tiles[t] || te.tiles[t].length > Hw - Bi)) break;
                    const n = new AbortController;
                    Mn = n, Yn = e?.id, ki = t;
                    let r;
                    try {
                        const s = new Vw, o = await zw(t, n.signal, s);
                        if (n.signal.throwIfAborted(), !e && Qt?.index === t && (e = Qt, Qt = void 0, Yn = e.id), e) {
                            _e = _e.filter((h)=>h !== t);
                            const a = performance.now(), l = te.octaves;
                            r = await Bw(o, l.tileWidth, l.tileHeight), n.signal.throwIfAborted(), s.record("decode", performance.now() - a), self.postMessage({
                                id: e.id,
                                bitmap: r,
                                metrics: Object.fromEntries(Object.entries(s.snapshot()).map(([h, f])=>[
                                        h,
                                        f.lastMs
                                    ]))
                            }, {
                                transfer: [
                                    r
                                ]
                            }), r = void 0;
                        } else _e.includes(t) && (gn.set(t, o), Bi += o.length, self.postMessage({
                            kind: "metrics",
                            metrics: Object.fromEntries(Object.entries(s.snapshot()).map(([a, l])=>[
                                    a,
                                    l.lastMs
                                ]))
                        }));
                    } catch (s) {
                        e ? self.postMessage({
                            id: e.id,
                            error: {
                                name: s instanceof Error ? s.name : "Error",
                                message: String(s)
                            }
                        }) : _e = _e.filter((o)=>o !== t);
                    } finally{
                        r?.close(), Mn = void 0, Yn = void 0, ki = void 0;
                    }
                }
            } finally{
                Ir = !1, Vi();
            }
        }
    }
    let Us;
    function Vi() {
        Us || rl || !te || Ms >= te.tiles.length || (Us = setTimeout(async ()=>{
            if (Us = void 0, Ir || Qt) {
                Vi();
                return;
            }
            try {
                const e = performance.now();
                for(let t = 0; t < 16 && Ms < te.tiles.length && !(Ir || Qt || (await qn.verifyTile(te.tiles[Ms++]), performance.now() - e >= 4)); t++);
            } catch (e) {
                rl = !0, self.postMessage({
                    kind: "verification-error",
                    message: String(e)
                });
            }
            Vi();
        }, 25));
    }
    self.onmessage = async ({ data: e })=>{
        if (e.kind === "cancel") {
            Qt?.id === e.id && (Qt = void 0), Yn === e.id && Mn?.abort();
            return;
        }
        if (e.kind === "prefetch") {
            _e = [
                ...new Set(e.indices)
            ].filter((t)=>Number.isInteger(t) && !!te?.tiles[t]).slice(0, 4), Gw(), Mn && Yn === void 0 && !_e.includes(ki) && Mn.abort(), il();
            return;
        }
        if (e.kind === "read") {
            if (!Number.isInteger(e.index)) return;
            Qt = {
                id: e.id,
                index: e.index
            }, Yn === void 0 && ki !== e.index && Mn?.abort(), il();
            return;
        }
        try {
            if (e.kind !== "init") throw new Error("Requête ExpMap invalide");
            const t = performance.now();
            qn = e.directory ? new pn(e.directory) : await pn.fromFile(e.file), te = await qn.open(e.documentId, !0), self.postMessage({
                id: e.id,
                metrics: {
                    open: performance.now() - t
                }
            }), Vi();
        } catch (t) {
            self.postMessage({
                id: e.id,
                error: {
                    name: t instanceof Error ? t.name : "Error",
                    message: String(t)
                }
            });
        }
    };
})();
