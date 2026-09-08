(async ()=>{
    const Br = new Date(2107, 11, 31, 23, 59, 58), ln = new Date(1980, 0, 1), T = void 0, re = 1 / 0, kt = "undefined", rt = "function", Aa = "object", Sn = "string", pa = "number", wa = "boolean", z = new Uint8Array, Ra = "filenameEncoding", Ia = "commentEncoding", Sa = "decodeText", ma = "extractPrependedData", ga = "extractAppendedData", Oi = "password", Fi = "rawPassword", Li = "passThrough", bi = "signal", Na = "checkPasswordOnly", ya = "checkOverlappingEntryOnly", Da = "checkOverlappingEntry", Oa = "checkAmbiguity", Fa = "checkLocalDirectory", La = "checkSignature", ba = "checkCrc32", Ca = "checkAuthenticationCode", Ci = "useWebWorkers", Pi = "useCompressionStream", Mi = "transferStreams", Ui = "preventClose", Pa = "encryptionStrength", Ma = "extendedTimestamp", Ua = "ntfsTimestamp", xa = "keepOrder", Ba = "level", Ga = "bufferedWrite", Ha = "createTempStream", va = "dataDescriptorSignature", Xa = "useUnicodeFileNames", xi = "dataDescriptor", Va = "supportZip64SplitFile", za = "encodeText", qe = "offset", de = "usdz", Ya = "unixExtraFieldType", Za = "localExtraField", ka = "centralExtraField", Wa = "strictness", Ka = "filenameValidation", ja = "normalizeFilename", Bi = "maxAppendedDataSize", qa = "decryptCentralDirectory", Ja = "signCentralDirectory", Gi = "filename", Hi = "comment", te = "strict", lr = "balanced", Wt = "tolerant", Qa = "Invalid option (must be a function)", $a = "Invalid signal (must be an AbortSignal instance)", tc = "Invalid password (password must be a string, rawPassword must be a Uint8Array)", ec = "The operation was aborted", nc = "AbortError";
    function ur(t) {
        if (t && typeof t != rt) throw new Error(Qa);
        return t;
    }
    function vi(t) {
        if (t && (typeof t.addEventListener != rt || typeof t.aborted != wa)) throw new Error($a);
        return t || T;
    }
    function Xi(t) {
        if (t && t.aborted) throw t.reason === T ? new DOMException(ec, nc) : t.reason;
    }
    function Vi(t, e) {
        if (t && typeof t != Sn || e && !(e instanceof Uint8Array)) throw new Error(tc);
    }
    function zi(t, e, n) {
        if (!Number.isInteger(t) || t < 0 || t > e) throw new Error(n);
    }
    function ye(t, e, n) {
        t !== T && zi(t, e, n);
    }
    function mn(t) {
        return typeof t == Sn && t.trim() ? Number(t) : t;
    }
    const Yi = 64 * 1024, rc = 64, Zi = 1, ic = "Invalid maxWorkers (must be an integer greater than 0)";
    let ki = 2;
    try {
        typeof navigator != kt && navigator.hardwareConcurrency && (ki = navigator.hardwareConcurrency);
    } catch  {}
    const Wi = {
        workerURI: "./core/web-worker-wasm.js",
        wasmURI: "./core/streams/zlib-wasm/zlib-streams.wasm",
        chunkSize: Yi,
        maxWorkers: ki,
        terminateWorkerTimeout: 5e3,
        workerStarvationTimeout: 5e3,
        workerStartupTimeout: 5e3,
        useWebWorkers: !0,
        useCompressionStream: !0,
        transferStreams: !0,
        CompressionStream: typeof CompressionStream != kt && CompressionStream,
        DecompressionStream: typeof DecompressionStream != kt && DecompressionStream
    }, Ki = "maxWorkers", sc = [
        "baseURI",
        "wasmURI",
        "workerURI"
    ], oc = [
        "useCompressionStream",
        "useWebWorkers",
        "transferStreams"
    ], ji = [
        "chunkSize",
        Ki,
        "terminateWorkerTimeout",
        "workerStarvationTimeout",
        "workerStartupTimeout"
    ], qi = [
        "createWorker",
        "CompressionStream",
        "DecompressionStream",
        "CompressionStreamFallback",
        "DecompressionStreamFallback"
    ], ac = [
        ...sc,
        ...oc,
        ...ji,
        ...qi
    ], Ji = {
        ...Wi
    };
    function ze() {
        return Ji;
    }
    function fr(t) {
        return Qi(t.chunkSize);
    }
    function Qi(t) {
        return t = mn(t), Number.isInteger(t) && t >= Zi ? Math.max(t, rc) : Yi;
    }
    function cc(t) {
        const e = {};
        for (const n of ac){
            const r = t[n];
            r !== T && (e[n] = lc(n, r));
        }
        return e;
    }
    function lc(t, e) {
        if (ji.includes(t)) {
            if (e = mn(e), t == Ki && (!Number.isInteger(e) || e < Zi)) throw new Error(ic);
        } else qi.includes(t) && ur(e);
        return e;
    }
    function uc(t) {
        t = t || {};
        const { CompressionStreamZlib: e, DecompressionStreamZlib: n } = t;
        if (e === T && n === T) return t;
        const r = Object.assign({}, t);
        return r.CompressionStreamFallback === T && (r.CompressionStreamFallback = e), r.DecompressionStreamFallback === T && (r.DecompressionStreamFallback = n), r;
    }
    function gn(t) {
        const e = cc(uc(t));
        Object.assign(Wi, e), Object.assign(Ji, e);
    }
    const Je = new Uint8Array(288);
    Je.fill(8, 0, 144), Je.fill(9, 144, 256), Je.fill(7, 256, 280), Je.fill(8, 280, 288), new Uint8Array(30).fill(5);
    const Bt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", fc = (t)=>t({
            workerURI: (e)=>{
                const n = "text/javascript";
                let r = `!function(t){"function"==typeof define&&define.amd?define(t):t()}(function(){"use strict";const{Array:t,Object:n,Number:e,Math:s,Error:r,Uint8Array:o,Uint16Array:c,Uint32Array:i,Int32Array:a,Map:f,DataView:u,Promise:l,TextEncoder:w,crypto:h,postMessage:p,TransformStream:d,ReadableStream:y,WritableStream:m,CompressionStream:S,DecompressionStream:g}=self,v=void 0,b="undefined",k="function",z=new o,C=[[],[],[],[],[],[],[],[]];for(let t=0;t<256;t++){let n=t;for(let t=0;t<8;t++)n=1&n?n>>>1^3988292384:n>>>1;C[0][t]=n}for(let t=0;t<256;t++)for(let n=1;n<8;n++){const e=C[n-1][t];C[n][t]=e>>>8^C[0][255&e]}const[I,A,x,M,P,B,D,F]=C;class R{constructor(t){this.o=t||-1}append(t){let n=0|this.o;const e=0|t.length;let s=0;if(e>=8&&t.buffer){const r=new u(t.buffer,t.byteOffset,e),o=e-8;for(;s<=o;s+=8){const t=n^r.getInt32(s,!0),e=r.getInt32(s+4,!0);n=F[255&t]^D[t>>>8&255]^B[t>>>16&255]^P[t>>>24&255]^M[255&e]^x[e>>>8&255]^A[e>>>16&255]^I[e>>>24&255]}}for(;s<e;s++)n=n>>>8^I[255&(n^t[s])];this.o=n}get(){return~this.o}}class U extends d{constructor(){let t;const n=new R;super({transform(t,e){n.append(t),e.enqueue(t)},flush(){const e=new o(4);new u(e.buffer).setUint32(0,n.get()),t.value=e}}),t=this}}function W(t,n){const e=new o(t.length+n.length);return e.set(t),e.set(n,t.length),e}function _(t){return new u(t.buffer,t.byteOffset,t.byteLength)}const T={concat(t,n){if(0===t.length||0===n.length)return t.concat(n);const e=t[t.length-1],s=T.l(e);return 32===s?t.concat(n):T.h(n,s,0|e,t.slice(0,t.length-1))},bitLength(t){const n=t.length;if(0===n)return 0;const e=t[n-1];return 32*(n-1)+T.l(e)},m(t,n){if(32*t.length<n)return t;const e=(t=t.slice(0,s.ceil(n/32))).length;return n&=31,e>0&&n&&(t[e-1]=T.S(n,t[e-1]&2147483648>>n-1,1)),t},S:(t,n,e)=>32===t?n:(e?0|n:n<<32-t)+1099511627776*t,l:t=>s.round(t/1099511627776)||32,h(t,n,e,s){for(void 0===s&&(s=[]);n>=32;n-=32)s.push(e),e=0;if(0===n)return s.concat(t);for(let r=0;r<t.length;r++)s.push(e|t[r]>>>n),e=t[r]<<32-n;const r=t.length?t[t.length-1]:0,o=T.l(r);return s.push(T.S(n+o&31,n+o>32?e:s.pop(),1)),s}},V={bytes:{v(t){const n=T.bitLength(t)/8,e=new o(n);let s;for(let r=0;r<n;r++)3&r||(s=t[r/4]),e[r]=s>>>24,s<<=8;return e},C(t){const n=[];let e,s=0;for(e=0;e<t.length;e++)s=s<<8|t[e],3&~e||(n.push(s),s=0);return 3&e&&n.push(T.S(8*(3&e),s)),n}}},K=class{constructor(t){const n=this;n.blockSize=512,n.I=[1732584193,4023233417,2562383102,271733878,3285377520],n.A=[1518500249,1859775393,2400959708,3395469782],t?(n.M=t.M.slice(0),n.P=t.P.slice(0),n.B=t.B):n.reset()}reset(){const t=this;return t.M=t.I.slice(0),t.P=[],t.B=0,t}update(t){const n=this;"string"==typeof t&&(t=V.D.C(t));const e=n.P=T.concat(n.P,t),s=n.B,o=n.B=s+T.bitLength(t);if(o>9007199254740991)throw new r("Cannot hash more than 2^53 - 1 bits");const c=new i(e);let a=0;for(let t=n.blockSize+s-(n.blockSize+s&n.blockSize-1);t<=o;t+=n.blockSize)n.F(c.subarray(16*a,16*(a+1))),a+=1;return e.splice(0,16*a),n}R(){const t=this;let n=t.P;const e=t.M;n=T.concat(n,[T.S(1,1)]);for(let t=n.length+2;15&t;t++)n.push(0);for(n.push(s.floor(t.B/4294967296)),n.push(0|t.B);n.length;)t.F(n.splice(0,16));return t.reset(),e}U(t,n,e,s){return t<=19?n&e|~n&s:t<=39?n^e^s:t<=59?n&e|n&s|e&s:t<=79?n^e^s:void 0}W(t,n){return n<<t|n>>>32-t}F(n){const e=this,r=e.M,o=t(80);for(let t=0;t<16;t++)o[t]=n[t];let c=r[0],i=r[1],a=r[2],f=r[3],u=r[4];for(let t=0;t<=79;t++){t>=16&&(o[t]=e.W(1,o[t-3]^o[t-8]^o[t-14]^o[t-16]));const n=e.W(5,c)+e.U(t,i,a,f)+u+o[t]+e.A[s.floor(t/20)]|0;u=f,f=a,a=e.W(30,i),i=c,c=n}r[0]=r[0]+c|0,r[1]=r[1]+i|0,r[2]=r[2]+a|0,r[3]=r[3]+f|0,r[4]=r[4]+u|0}},E={importKey:t=>new E._(V.bytes.C(t)),T(t,n,e,s){if(e=e||1e4,s<0||e<0)throw new r("invalid params to pbkdf2");const o=1+(s>>5)<<2;let c,i,a,f,l;const w=new ArrayBuffer(o),h=new u(w);let p=0;const d=T;for(n=V.bytes.C(n),l=1;p<(o||1);l++){for(c=i=t.encrypt(d.concat(n,[l])),a=1;a<e;a++)for(i=t.encrypt(i),f=0;f<i.length;f++)c[f]^=i[f];for(a=0;p<(o||1)&&a<c.length;a++)h.setInt32(p,c[a]),p+=4}return w.slice(0,s/8)},_:class{constructor(t){const n=this,e=n.V=K,s=[[],[]];n.K=[new e,new e];const r=n.K[0].blockSize/32;t.length>r&&(t=(new e).update(t).R());for(let n=0;n<r;n++)s[0][n]=909522486^t[n],s[1][n]=1549556828^t[n];n.K[0].update(s[0]),n.K[1].update(s[1]),n.L=new e(n.K[0])}reset(){const t=this;t.L=new t.V(t.K[0]),t.O=!1}update(t){this.O=!0,this.L.update(t)}digest(){const t=this,n=t.L.R(),e=new t.V(t.K[1]).update(n).R();return t.reset(),e}encrypt(t){if(this.O)throw new r("encrypt on already updated hmac called!");return this.update(t),this.digest(t)}}},L=typeof h!=b&&typeof h.getRandomValues==k,O="Invalid password",j="zipjs-abort-check-password";function H(t){if(L)return h.getRandomValues(t);throw new r("Crypto API not supported")}const N=16,q={name:"PBKDF2"},G=n.assign({hash:{name:"HMAC"}},q),J=n.assign({iterations:1e3,hash:{name:"SHA-1"}},q),Q=["deriveBits"],X=[8,12,16],Y=[16,24,32],Z=10,$=[0,0,0,0],tt=typeof h!=b,nt=tt&&h.subtle,et=tt&&typeof nt!=b,st=V.bytes,rt=class{constructor(t){const n=this;n.j=[[[],[],[],[],[]],[[],[],[],[],[]]],n.j[0][0][0]||n.H();const e=n.j[0][4],s=n.j[1],o=t.length;let c,i,a,f=1;if(4!==o&&6!==o&&8!==o)throw new r("invalid aes key size");for(n.A=[i=t.slice(0),a=[]],c=o;c<4*o+28;c++){let t=i[c-1];(c%o===0||8===o&&c%o===4)&&(t=e[t>>>24]<<24^e[t>>16&255]<<16^e[t>>8&255]<<8^e[255&t],c%o===0&&(t=t<<8^t>>>24^f<<24,f=f<<1^283*(f>>7))),i[c]=i[c-o]^t}for(let t=0;c;t++,c--){const n=i[3&t?c:c-4];a[t]=c<=4||t<4?n:s[0][e[n>>>24]]^s[1][e[n>>16&255]]^s[2][e[n>>8&255]]^s[3][e[255&n]]}}encrypt(t){return this.N(t,0)}decrypt(t){return this.N(t,1)}H(){const t=this.j[0],n=this.j[1],e=t[4],s=n[4],r=[],o=[];let c,i,a,f;for(let t=0;t<256;t++)o[(r[t]=t<<1^283*(t>>7))^t]=t;for(let u=c=0;!e[u];u^=i||1,c=o[c]||1){let o=c^c<<1^c<<2^c<<3^c<<4;o=o>>8^255&o^99,e[u]=o,s[o]=u,f=r[a=r[i=r[u]]];let l=16843009*f^65537*a^257*i^16843008*u,w=257*r[o]^16843008*o;for(let e=0;e<4;e++)t[e][u]=w=w<<24^w>>>8,n[e][o]=l=l<<24^l>>>8}for(let e=0;e<5;e++)t[e]=t[e].slice(0),n[e]=n[e].slice(0)}N(t,n){if(4!==t.length)throw new r("invalid aes block size");const e=this.A[n],s=e.length/4-2,o=[0,0,0,0],c=this.j[n],i=c[0],a=c[1],f=c[2],u=c[3],l=c[4];let w,h,p,d=t[0]^e[0],y=t[n?3:1]^e[1],m=t[2]^e[2],S=t[n?1:3]^e[3],g=4;for(let t=0;t<s;t++)w=i[d>>>24]^a[y>>16&255]^f[m>>8&255]^u[255&S]^e[g],h=i[y>>>24]^a[m>>16&255]^f[S>>8&255]^u[255&d]^e[g+1],p=i[m>>>24]^a[S>>16&255]^f[d>>8&255]^u[255&y]^e[g+2],S=i[S>>>24]^a[d>>16&255]^f[y>>8&255]^u[255&m]^e[g+3],g+=4,d=w,y=h,m=p;for(let t=0;t<4;t++)o[n?3&-t:t]=l[d>>>24]<<24^l[y>>16&255]<<16^l[m>>8&255]<<8^l[255&S]^e[g++],w=d,d=y,y=m,m=S,S=w;return o}},ot=class{constructor(t,n){this.G=t,this.J=n,this.X=n}reset(){this.X=this.J}update(t){return this.Y(this.G,t,this.X)}Z(t){if(255&~(t>>24))t+=1<<24;else{let n=t>>16&255,e=t>>8&255,s=255&t;255===n?(n=0,255===e?(e=0,255===s?s=0:++s):++e):++n,t=0,t+=n<<16,t+=e<<8,t+=s}return t}$(t){0===(t[0]=this.Z(t[0]))&&(t[1]=this.Z(t[1]))}Y(t,n,e){let s;if(!(s=n.length))return[];const r=T.bitLength(n);for(let r=0;r<s;r+=4){this.$(e);const s=t.encrypt(e);n[r]^=s[0],n[r+1]^=s[1],n[r+2]^=s[2],n[r+3]^=s[3]}return T.m(n,r)}},ct=E._;let it=tt&&et&&typeof nt.importKey==k,at=tt&&et&&typeof nt.deriveBits==k;class ft extends d{constructor({password:t,rawPassword:n,encryptionStrength:e,checkPasswordOnly:s,checkAuthenticationCode:c=!0}){super({start(){lt(this,t,n,e)},async transform(t,n){const e=this,{password:c,strength:i,nt:a,ready:f}=e;c?(await async function(t,n,e,s){const o=await ht(t,n,e,dt(s,0,X[n])),c=dt(s,X[n]);if(o[0]!=c[0]||o[1]!=c[1])throw new r(O)}(e,i,c,dt(t,0,X[i]+2)),t=dt(t,X[i]+2),s?n.error(new r(j)):a()):await f;const u=new o(t.length-Z-(t.length-Z)%N);n.enqueue(wt(e,t,u,0,Z,!0))},async flush(t){const{et:n,st:e,ot:s,ready:o}=this;if(e&&n){await o;const i=dt(s,0,s.length-Z),a=dt(s,s.length-Z);let f=z;if(i.length){const t=mt(st,i);e.update(t);const s=n.update(t);f=yt(st,s)}const u=dt(yt(st,e.digest()),0,Z);let l=s.length<Z?1:0;for(let t=0;t<Z;t++)l|=u[t]^a[t];if(l&&c)throw new r("Invalid authentication code");t.enqueue(f)}}})}}class ut extends d{constructor({password:t,rawPassword:n,encryptionStrength:e}){super({start(){lt(this,t,n,e)},async transform(t,n){const e=this,{password:s,strength:r,nt:c,ready:i}=e;let a=z;s?(a=await async function(t,n,e){const s=H(new o(X[n]));return W(s,await ht(t,n,e,s))}(e,r,s),c()):await i;const f=new o(a.length+t.length-t.length%N);f.set(a,0),n.enqueue(wt(e,t,f,a.length,0))},async flush(t){const{et:n,st:e,ot:s,ready:r}=this;if(e&&n){await r;let o=z;if(s.length){const t=n.update(mt(st,s));e.update(t),o=yt(st,t)}const c=yt(st,e.digest()).slice(0,Z);t.enqueue(W(o,c))}}})}}function lt(t,e,s,r){n.assign(t,{ready:new l(n=>t.nt=n),password:pt(e,s),strength:r-1,ot:z})}function wt(t,n,e,s,r,c){const{et:i,st:a,ot:f}=t;f.length&&(n=W(f,n));const u=n.length-r;let l;for(e=function(t,n){if(n&&n>t.length){const e=t;(t=new o(n)).set(e,0)}return t}(e,s+(u-u%N)),l=0;l<=u-N;l+=N){const t=mt(st,dt(n,l,l+N));c&&a.update(t);const r=i.update(t);c||a.update(r),e.set(yt(st,r),l+s)}return t.ot=dt(n,l),e}async function ht(e,s,r,c){e.password=null;const i=await async function(t,n,e,s,r){if(!it)return E.importKey(n);try{return await nt.importKey("raw",n,e,!1,r)}catch{return it=!1,E.importKey(n)}}(0,r,G,0,Q),a=await async function(t,n,e){if(!at)return E.T(n,t.salt,J.iterations,e);try{return await nt.deriveBits(t,n,e)}catch{return at=!1,E.T(n,t.salt,J.iterations,e)}}(n.assign({salt:c},J),i,8*(2*Y[s]+2)),f=new o(a),u=mt(st,dt(f,0,Y[s])),l=mt(st,dt(f,Y[s],2*Y[s])),w=dt(f,2*Y[s]);return n.assign(e,{keys:{key:u,ct:l,passwordVerification:w},et:new ot(new rt(u),t.from($)),st:new ct(l)}),w}function pt(t,n){return n===v?function(t){if(typeof w==b){t=unescape(encodeURIComponent(t));const n=new o(t.length);for(let e=0;e<n.length;e++)n[e]=t.charCodeAt(e);return n}return(new w).encode(t)}(t):n}function dt(t,n,e){return t.subarray(n,e)}function yt(t,n){return t.v(n)}function mt(t,n){return t.C(n)}class St extends d{constructor({password:t,rawPassword:n,passwordVerification:e,checkPasswordOnly:s}){super({start(){vt(this,t,n,e)},transform(t,n){const e=this;if(e.password||e.rawPassword){const n=bt(e,t.subarray(0,12));if(e.password=e.rawPassword=null,0!=(n[11]^e.passwordVerification))throw new r(O);t=t.subarray(12)}s?n.error(new r(j)):n.enqueue(bt(e,t))}})}}class gt extends d{constructor({password:t,rawPassword:n,passwordVerification:e}){super({start(){vt(this,t,n,e)},transform(t,n){const e=this;let s,r;if(e.password||e.rawPassword){e.password=e.rawPassword=null;const n=H(new o(12));n[11]=e.passwordVerification,s=new o(t.length+n.length),s.set(kt(e,n),0),r=12}else s=new o(t.length),r=0;s.set(kt(e,t),r),n.enqueue(s)}})}}function vt(t,e,s,r){n.assign(t,{password:e,rawPassword:s,passwordVerification:r}),function(t,e,s){const r=[305419896,591751049,878082192];if(n.assign(t,{keys:r,it:new R(r[0]),ft:new R(r[2])}),s)for(let n=0;n<s.length;n++)zt(t,s[n]);else for(let n=0;n<e.length;n++)zt(t,e.charCodeAt(n))}(t,e,s)}function bt(t,n){const e=new o(n.length);for(let s=0;s<n.length;s++)e[s]=Ct(t)^n[s],zt(t,e[s]);return e}function kt(t,n){const e=new o(n.length);for(let s=0;s<n.length;s++)e[s]=Ct(t)^n[s],zt(t,n[s]);return e}function zt(t,n){let[,e]=t.keys;t.it.append([n]);const r=~t.it.get();e=At(s.imul(At(e+It(r)),134775813)+1),t.ft.append([e>>>24]);const o=~t.ft.get();t.keys=[r,e,o]}function Ct(t){const n=2|t.keys[2];return It(s.imul(n,1^n)>>>8)}function It(t){return 255&t}function At(t){return 4294967295&t}function xt(t){if(t instanceof y)return t;const n=t.getReader();return new y({async pull(t){const{value:e,done:s}=await n.read();s?t.close():t.enqueue(e)},cancel:t=>n.cancel(t)})}const Mt=new f;function Pt(t){return Mt.get(t)}const Bt="Invalid uncompressed size",Dt="deflate-raw",Ft="gzip",Rt=[31,139,8];class Ut extends d{constructor(t,{chunkSize:n,CompressionStreamFallback:e,CompressionStream:s}){super({});const{compressed:r,encrypted:o,useCompressionStream:c,zipCrypto:i,computeCrc32:a,level:f,deflate64:l,format:w,compressionMethod:h,inputSize:p}=t,d=this;let y,m,S,g=super.readable;const v=w&&Pt(w),b=a&&r&&!l&&!v&&(!o||i)&&Boolean(c&&s);if(o&&!i||!a||b||(y=new U,g=Lt(g,y)),r)if(v)g=Ot(g,Kt(v.CompressionStream,w,{level:f,chunkSize:n,compressionMethod:h,uncompressedSize:p}));else if(b)S=new Wt,g=Ot(g,new s(Ft)),g=Lt(g,S);else try{g=Et(g,c,{level:f,chunkSize:n},s,e)}catch(t){let n;try{n=new s(Ft)}catch{throw t}g=Ot(g,n),g=Lt(g,new Wt)}o&&(i?g=Lt(g,new gt(t)):(m=new ut(t),g=Lt(g,m))),Vt(d,g,()=>{o&&!i||!a||(d.crc32=b?S.crc32:new u(y.value.buffer).getUint32(0))})}}class Wt extends d{constructor(){let t,n=10,e=new o(0);super({transform(t,r){if(n){const e=s.min(n,t.length);if(n-=e,!(t=t.subarray(e)).length)return}const o=e.length+t.length;if(o<=8)return void(e=W(e,t));const c=o-8,i=s.min(c,e.length);r.enqueue(W(e.subarray(0,i),t.subarray(0,c-i))),e=W(e.subarray(i),t.subarray(c-i))},flush(){const n=_(e);t.crc32=n.getUint32(0,!0),t.uncompressedSize=n.getUint32(4,!0)}}),t=this}}class _t extends d{constructor(t,{chunkSize:n,DecompressionStreamFallback:e,DecompressionStream:s}){super({});const{zipCrypto:c,encrypted:i,checkCrc32:a,crc32:f,compressed:w,useCompressionStream:h,deflate64:p,format:m,compressionMethod:S,rawBitFlag:g,outputSize:b}=t;let k,z,C=super.readable;if(i&&(c?C=Lt(C,new St(t)):(z=new ft(t),C=Lt(C,z))),w){const t=m&&Pt(m);if(t)C=Ot(C,Kt(t.DecompressionStream,m,{chunkSize:n,compressionMethod:S,rawBitFlag:g,uncompressedSize:b}));else try{C=Et(C,h,{chunkSize:n,deflate64:p},s,e)}catch(t){if(p||b===v)throw t;let n;try{n=new s(Ft)}catch{throw t}C=function(t,n,e){const s=new R;let c,i,a,f=0,u=!1;const w=new l((t,n)=>{i=t,a=n});w.catch(()=>{}),e||i();const h=new d({start(t){const n=new o(10);n.set(Rt),t.enqueue(n)},transform(t,n){n.enqueue(t)},async flush(t){u=!0,y();try{await w}finally{m()}const n=new o(8),r=_(n);r.setUint32(0,s.get(),!0),r.setUint32(4,e,!0),t.enqueue(n)},cancel(t){a(t)}}),p=new d({transform(t,n){s.append(t),f+=t.length,f>=e?i():u&&y(),n.enqueue(t)},cancel(t){a(t)}});return t=Lt(t,h),Lt(t=Ot(t,n),p);function y(){m(),c=setTimeout(()=>a(new r(Bt)),5e3)}function m(){clearTimeout(c)}}(C,n,b)}C=function(t){const n=t.getReader();return new y({async pull(t){let e;try{e=await n.read()}catch(t){if(t&&t.message)throw t;const n=new r("Invalid compressed data");throw n.cause=t,n}const{value:s,done:o}=e;o?t.close():t.enqueue(s)},cancel:t=>n.cancel(t)})}(C)}a&&(k=new U,C=Lt(C,k)),Vt(this,C,()=>{if(a){const t=new u(k.value.buffer);if(f!=t.getUint32(0,!1))throw new r("Invalid CRC32")}})}}const Tt=new f;function Vt(t,e,s){e=Lt(e,new d({flush:s})),n.defineProperty(t,"readable",{get:()=>e})}function Kt(t,n,e){if(!t)throw new r("Compression method not supported");return new t(n,e)}function Et(t,n,e,s,r){const o=n&&s?s:r||s,c=e.deflate64?"deflate64-raw":Dt;let i;try{i=new o(c,e)}catch(t){if(!n||!r||o==r)throw t;i=new r(c,e)}return Ot(t,i)}function Lt(t,n){return xt(t).pipeThrough(n)}function Ot(t,n){const e=n.writable.getWriter(),s=t.getReader();return async function(){try{for(;;){await e.ready;const t=await s.read();if(t.done){await e.close();break}await e.write(t.value)}}catch(t){await async function(t,n){try{await t.abort(n)}catch{}}(e,t),await async function(t,n){try{await t.cancel(n)}catch{}}(s,t)}}(),n.readable}const jt="data",Ht="close",Nt="deflate";class qt extends d{constructor(t,e){super({});const s=this,{codecType:o}=t;let c;o.startsWith(Nt)?c=Ut:o.startsWith("inflate")&&(c=_t),s.outputSize=0;let i=0;const a=new c(t,e),f=super.readable,u=new d({transform(t,n){t&&t.length&&(i+=t.length,n.enqueue(t))},flush(){n.assign(s,{inputSize:i})}}),l=new d({transform(n,e){if(n&&n.length&&(e.enqueue(n),s.outputSize+=n.length,t.outputSize!==v&&s.outputSize>t.outputSize))throw new r(Bt)},flush(){const{crc32:t}=a;n.assign(s,{crc32:t,inputSize:i})}});n.defineProperty(s,"readable",{get:()=>f.pipeThrough(u).pipeThrough(a).pipeThrough(l)})}}class Gt extends d{constructor(t){const n=[];let s=0;function r(){const e=new o(t);let r=0;for(;r<t;){const s=n[0],o=t-r;s.length<=o?(e.set(s,r),r+=s.length,n.shift()):(e.set(s.subarray(0,o),r),n[0]=s.subarray(o),r+=o)}return s-=t,e}(!e.isFinite(t)||t<1)&&(t=65536),super({transform(e,o){for(n.push(e),s+=e.length;s>t;)o.enqueue(r())},flush(t){s&&t.enqueue(function(t,n){const e=new o(n);let s=0;for(const n of t)e.set(n,s),s+=n.length;return e}(n,s))}})}}let Jt=2;try{typeof navigator!=b&&navigator.hardwareConcurrency&&(Jt=navigator.hardwareConcurrency)}catch{}const Qt=new f,Xt=new f;let Yt,Zt=0;async function $t(t){let n,o;try{const{options:c,config:i}=t;if(c.format)try{await async function(t,n){!Mt.has(t)&&n&&function(t,n){const{CompressionStream:e,DecompressionStream:s}=n;if(typeof e!=k&&typeof s!=k)throw new r("Invalid codec module");Mt.set(t,{CompressionStream:e,DecompressionStream:s})}(t,await(import(n)))}(c.format,c.codecURI)}catch(t){throw t.codecImportFailed=!0,t}if(i.CompressionStream=self.CompressionStream,i.DecompressionStream=self.DecompressionStream,c.compressed&&!c.format)if(c.useCompressionStream){if(!function(t,n){if(!t)return!1;let e=Tt.get(t);e||(e=new f,Tt.set(t,e));let s=e.get(n);if(s===v){try{new t(n),s=!0}catch{s=!1}e.set(n,s)}return s}(c.codecType.startsWith(Nt)?i.CompressionStream:i.DecompressionStream,Dt))try{await self.initModule(t.config)}catch{}}else try{await self.initModule(t.config)}catch{c.useCompressionStream=!0}!i.CompressionStreamFallback&&i.CompressionStreamZlib&&(i.CompressionStreamFallback=i.CompressionStreamZlib),!i.DecompressionStreamFallback&&i.DecompressionStreamZlib&&(i.DecompressionStreamFallback=i.DecompressionStreamZlib);const a={highWaterMark:1},u=t.readable?xt(t.readable):new y({async pull(t){const n=new l(t=>Qt.set(Zt,t));tn({type:"pull",messageId:Zt}),Zt=(Zt+1)%e.MAX_SAFE_INTEGER;const{value:s,done:r}=await n;t.enqueue(s),r&&t.close()}},a);o=t.writable?function(t){if(t instanceof m)return t;const n=t.getWriter();return new m({write:t=>n.write(t),close:()=>n.close(),abort:t=>n.abort(t)})}(t.writable):new m({async write(t){let n;const s=new l(t=>n=t);Xt.set(Zt,n),tn({type:jt,value:t,messageId:Zt}),Zt=(Zt+1)%e.MAX_SAFE_INTEGER,await s}},a),n=new qt(c,i),Yt=new AbortController;const{signal:w}=Yt;await u.pipeThrough(n).pipeThrough(new Gt(function(t){return r="string"==typeof(n=r=t.chunkSize)&&n.trim()?e(n):n,e.isInteger(r)&&r>=1?s.max(r,64):65536;var n,r}(i))).pipeTo(o,{signal:w,preventClose:!0,preventAbort:!0}),await o.getWriter().close();const{crc32:h,inputSize:p,outputSize:d}=n;tn({type:Ht,result:{crc32:h,inputSize:p,outputSize:d}})}catch(t){if(t.outputSize=n?n.outputSize:0,o&&!o.locked)try{await o.getWriter().close()}catch{}nn(t)}}function tn(t){const{value:n}=t;if(n)if(n.length)try{t.value=(e=n,e.byteOffset||e.byteLength!=e.buffer.byteLength?new o(e):e).buffer,p(t,[t.value])}catch{p(t)}else p(t);else p(t);var e}function nn(t=new r("Unknown error")){const{message:n,stack:e,code:s,name:o,outputSize:c,cause:i,codecImportFailed:a}=t,f={message:n,stack:e,code:s,name:o,outputSize:c};i&&(f.cause={name:i.name,message:i.message}),a&&(f.codecImportFailed=!0),p({error:f})}addEventListener("message",({data:t})=>{const{type:n,messageId:e,value:s,done:r}=t;try{if("start"==n&&$t(t),n==jt){const t=Qt.get(e);Qt.delete(e),t({value:s||new o,done:r})}if("ack"==n){const t=Xt.get(e);Xt.delete(e),t()}n==Ht&&Yt.abort()}catch(t){nn(t)}}),p({type:"ready"});const en="deflate",sn="deflate-raw",rn="deflate64-raw",on="gzip";let cn,an,fn,un,ln;function wn(t,n,e={}){if(!cn){const t=new r("WASM module not loaded");throw t.cause=ln,t}const c="number"==typeof e.level?e.level:-1,i="number"==typeof e.outBuffer?e.outBuffer:65536,a="number"==typeof e.inBufferSize?e.inBufferSize:65536;return new d({start(){try{let e;if(this.ut=an(i),this.in=an(a),this.inBufferSize=a,!this.ut||!this.in)throw new r("allocation failed");if(this.lt=new o(i),t?(this.wt=cn.deflate_process,this.ht=cn.deflate_last_consumed,this.yt=cn.deflate_end,this.St=cn.deflate_new(),e=n===on?cn.deflate_init_gzip(this.St,c):n===sn?cn.deflate_init_raw(this.St,c):cn.deflate_init(this.St,c)):n===rn?(this.wt=cn.inflate9_process,this.ht=cn.inflate9_last_consumed,this.yt=cn.inflate9_end,this.St=cn.inflate9_new(),e=cn.inflate9_init_raw(this.St)):(this.wt=cn.inflate_process,this.ht=cn.inflate_last_consumed,this.yt=cn.inflate_end,this.St=cn.inflate_new(),e=n===sn?cn.inflate_init_raw(this.St):n===on?cn.inflate_init_gzip(this.St):cn.inflate_init(this.St)),0!==e)throw new r("init failed:"+e)}catch(t){throw f(this),t}},transform(t,n){try{const e=t,c=new o(un.buffer),a=this.wt,f=this.ht,u=this.ut,l=this.lt;let w=0;for(;w<e.length;){const t=s.min(e.length-w,32768);if((!this.in||this.inBufferSize<t)&&(this.in&&fn&&(fn(this.in),this.in=0),this.in=an(t),this.inBufferSize=t,!this.in))throw new r("allocation failed");c.set(e.subarray(w,w+t),this.in);const o=a(this.St,this.in,t,u,i,0),h=o>>24&255,p=128&h?h-256:h;if(p<0)throw new r("process error:"+p);const d=16777215&o;d&&(l.set(c.subarray(u,u+d),0),n.enqueue(l.slice(0,d)));const y=f(this.St);if(0===y&&0===d)break;w+=y}}catch(t){f(this),n.error(t)}},flush(t){try{const n=new o(un.buffer),e=this.wt,s=this.ut,c=this.lt;for(;;){const o=e(this.St,0,0,s,i,4),a=o>>24&255,f=128&a?a-256:a;if(f<0)throw new r("process error:"+f);const u=16777215&o;if(u&&(c.set(n.subarray(s,s+u),0),t.enqueue(c.slice(0,u))),1===a||0===u)break}}catch(n){t.error(n)}finally{const n=f(this);0!==n&&t.error(new r("end error:"+n))}},cancel(){f(this)}});function f(t){let n=0;return t.St&&t.yt&&(n=t.yt(t.St)),t.St=0,t.in&&fn&&fn(t.in),t.in=0,t.ut&&fn&&fn(t.ut),t.ut=0,n}}class hn{constructor(t=en,n){return wn(!0,t,n)}}class pn{constructor(t=en,n){return wn(!1,t,n)}}hn.gt=!0,pn.gt=!0,hn.vt=[en,sn,on],pn.vt=[en,sn,on,rn];let dn=!1;!function(t={}){const{init:n}=t,e=t.CompressionStreamFallback||t.CompressionStreamZlib,s=t.DecompressionStreamFallback||t.DecompressionStreamZlib;self.initModule=async t=>{n&&await n(t),e&&(t.CompressionStreamFallback=e),s&&(t.DecompressionStreamFallback=s)}}({CompressionStreamFallback:hn,DecompressionStreamFallback:pn,init:t=>async function(t,{baseURI:n}){if(!dn)try{await async function(t,n){let e,s;try{try{s=new URL(t,n)}catch{}const r=await fetch(s);e=await r.arrayBuffer()}catch(n){if(!t.startsWith("data:application/wasm;base64,"))throw n;e=function(t){const n=t.split(",")[1],e=atob(n),s=e.length,r=new o(s);for(let t=0;t<s;++t)r[t]=e.charCodeAt(t);return r.buffer}(t)}!function(t){if(cn=t,({malloc:an,free:fn,memory:un}=cn),"function"!=typeof an||"function"!=typeof fn||!un)throw cn=an=fn=un=null,new r("Invalid WASM module")}((await WebAssembly.instantiate(e)).instance.exports)}(t,n),dn=!0}catch(t){throw function(t){ln=t}(t),t}}(t.wasmURI,t)})});
`;
                if (typeof r == "string" && (r = new TextEncoder().encode(r)), e) {
                    const i = new Blob([
                        r
                    ], {
                        type: n
                    });
                    return URL.createObjectURL(i);
                }
                return "data:" + n + ";base64," + (function(i) {
                    let s = "";
                    const o = i.length;
                    let a = 0;
                    for(; a + 2 < o; a += 3){
                        const l = i[a] << 16 | i[a + 1] << 8 | i[a + 2];
                        s += Bt[l >> 18 & 63] + Bt[l >> 12 & 63] + Bt[l >> 6 & 63] + Bt[63 & l];
                    }
                    const c = o - a;
                    if (c === 1) {
                        const l = i[a] << 16;
                        s += Bt[l >> 18 & 63] + Bt[l >> 12 & 63] + "==";
                    } else if (c === 2) {
                        const l = i[a] << 16 | i[a + 1] << 8;
                        s += Bt[l >> 18 & 63] + Bt[l >> 12 & 63] + Bt[l >> 6 & 63] + "=";
                    }
                    return s;
                })(r);
            }
        });
    function Yt(t, e) {
        const n = new Uint8Array(t.length + e.length);
        return n.set(t), n.set(e, t.length), n;
    }
    function $i(t) {
        return t.byteOffset || t.byteLength != t.buffer.byteLength ? new Uint8Array(t) : t;
    }
    function b(t) {
        return new DataView(t.buffer, t.byteOffset, t.byteLength);
    }
    const be = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ];
    for(let t = 0; t < 256; t++){
        let e = t;
        for(let n = 0; n < 8; n++)e = e & 1 ? e >>> 1 ^ 3988292384 : e >>> 1;
        be[0][t] = e;
    }
    for(let t = 0; t < 256; t++)for(let e = 1; e < 8; e++){
        const n = be[e - 1][t];
        be[e][t] = n >>> 8 ^ be[0][n & 255];
    }
    const [Gr, Ec, dc, _c, Tc, hc, Ac, pc] = be;
    class Pe {
        constructor(e){
            this.crc = e || -1;
        }
        append(e) {
            let n = this.crc | 0;
            const r = e.length | 0;
            let i = 0;
            if (r >= 8 && e.buffer) {
                const s = new DataView(e.buffer, e.byteOffset, r), o = r - 8;
                for(; i <= o; i += 8){
                    const a = n ^ s.getInt32(i, !0), c = s.getInt32(i + 4, !0);
                    n = pc[a & 255] ^ Ac[a >>> 8 & 255] ^ hc[a >>> 16 & 255] ^ Tc[a >>> 24 & 255] ^ _c[c & 255] ^ dc[c >>> 8 & 255] ^ Ec[c >>> 16 & 255] ^ Gr[c >>> 24 & 255];
                }
            }
            for(; i < r; i++)n = n >>> 8 ^ Gr[(n ^ e[i]) & 255];
            this.crc = n;
        }
        get() {
            return ~this.crc;
        }
    }
    class ts extends TransformStream {
        constructor(){
            let e;
            const n = new Pe;
            super({
                transform (r, i) {
                    n.append(r), i.enqueue(r);
                },
                flush () {
                    const r = new Uint8Array(4);
                    new DataView(r.buffer).setUint32(0, n.get()), e.value = r;
                }
            }), e = this;
        }
    }
    function en(t) {
        if (typeof TextEncoder == kt) {
            t = unescape(encodeURIComponent(t));
            const e = new Uint8Array(t.length);
            for(let n = 0; n < e.length; n++)e[n] = t.charCodeAt(n);
            return e;
        } else return new TextEncoder().encode(t);
    }
    const ot = {
        concat (t, e) {
            if (t.length === 0 || e.length === 0) return t.concat(e);
            const n = t[t.length - 1], r = ot.getPartial(n);
            return r === 32 ? t.concat(e) : ot._shiftRight(e, r, n | 0, t.slice(0, t.length - 1));
        },
        bitLength (t) {
            const e = t.length;
            if (e === 0) return 0;
            const n = t[e - 1];
            return (e - 1) * 32 + ot.getPartial(n);
        },
        clamp (t, e) {
            if (t.length * 32 < e) return t;
            t = t.slice(0, Math.ceil(e / 32));
            const n = t.length;
            return e = e & 31, n > 0 && e && (t[n - 1] = ot.partial(e, t[n - 1] & 2147483648 >> e - 1, 1)), t;
        },
        partial (t, e, n) {
            return t === 32 ? e : (n ? e | 0 : e << 32 - t) + t * 1099511627776;
        },
        getPartial (t) {
            return Math.round(t / 1099511627776) || 32;
        },
        _shiftRight (t, e, n, r) {
            for(r === void 0 && (r = []); e >= 32; e -= 32)r.push(n), n = 0;
            if (e === 0) return r.concat(t);
            for(let o = 0; o < t.length; o++)r.push(n | t[o] >>> e), n = t[o] << 32 - e;
            const i = t.length ? t[t.length - 1] : 0, s = ot.getPartial(i);
            return r.push(ot.partial(e + s & 31, e + s > 32 ? n : r.pop(), 1)), r;
        }
    }, un = {
        bytes: {
            fromBits (t) {
                const n = ot.bitLength(t) / 8, r = new Uint8Array(n);
                let i;
                for(let s = 0; s < n; s++)(s & 3) === 0 && (i = t[s / 4]), r[s] = i >>> 24, i <<= 8;
                return r;
            },
            toBits (t) {
                const e = [];
                let n, r = 0;
                for(n = 0; n < t.length; n++)r = r << 8 | t[n], (n & 3) === 3 && (e.push(r), r = 0);
                return n & 3 && e.push(ot.partial(8 * (n & 3), r)), e;
            }
        }
    }, es = {};
    es.sha1 = class {
        constructor(t){
            const e = this;
            e.blockSize = 512, e._init = [
                1732584193,
                4023233417,
                2562383102,
                271733878,
                3285377520
            ], e._key = [
                1518500249,
                1859775393,
                2400959708,
                3395469782
            ], t ? (e._h = t._h.slice(0), e._buffer = t._buffer.slice(0), e._length = t._length) : e.reset();
        }
        reset() {
            const t = this;
            return t._h = t._init.slice(0), t._buffer = [], t._length = 0, t;
        }
        update(t) {
            const e = this;
            typeof t == "string" && (t = un.utf8String.toBits(t));
            const n = e._buffer = ot.concat(e._buffer, t), r = e._length, i = e._length = r + ot.bitLength(t);
            if (i > 9007199254740991) throw new Error("Cannot hash more than 2^53 - 1 bits");
            const s = new Uint32Array(n);
            let o = 0;
            for(let a = e.blockSize + r - (e.blockSize + r & e.blockSize - 1); a <= i; a += e.blockSize)e._block(s.subarray(16 * o, 16 * (o + 1))), o += 1;
            return n.splice(0, 16 * o), e;
        }
        finalize() {
            const t = this;
            let e = t._buffer;
            const n = t._h;
            e = ot.concat(e, [
                ot.partial(1, 1)
            ]);
            for(let r = e.length + 2; r & 15; r++)e.push(0);
            for(e.push(Math.floor(t._length / 4294967296)), e.push(t._length | 0); e.length;)t._block(e.splice(0, 16));
            return t.reset(), n;
        }
        _f(t, e, n, r) {
            if (t <= 19) return e & n | ~e & r;
            if (t <= 39) return e ^ n ^ r;
            if (t <= 59) return e & n | e & r | n & r;
            if (t <= 79) return e ^ n ^ r;
        }
        _S(t, e) {
            return e << t | e >>> 32 - t;
        }
        _block(t) {
            const e = this, n = e._h, r = Array(80);
            for(let l = 0; l < 16; l++)r[l] = t[l];
            let i = n[0], s = n[1], o = n[2], a = n[3], c = n[4];
            for(let l = 0; l <= 79; l++){
                l >= 16 && (r[l] = e._S(1, r[l - 3] ^ r[l - 8] ^ r[l - 14] ^ r[l - 16]));
                const f = e._S(5, i) + e._f(l, s, o, a) + c + r[l] + e._key[Math.floor(l / 20)] | 0;
                c = a, a = o, o = e._S(30, s), s = i, i = f;
            }
            n[0] = n[0] + i | 0, n[1] = n[1] + s | 0, n[2] = n[2] + o | 0, n[3] = n[3] + a | 0, n[4] = n[4] + c | 0;
        }
    };
    const ns = {};
    ns.aes = class {
        constructor(t){
            const e = this;
            e._tables = [
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
            ], e._tables[0][0][0] || e._precompute();
            const n = e._tables[0][4], r = e._tables[1], i = t.length;
            let s, o, a, c = 1;
            if (i !== 4 && i !== 6 && i !== 8) throw new Error("invalid aes key size");
            for(e._key = [
                o = t.slice(0),
                a = []
            ], s = i; s < 4 * i + 28; s++){
                let l = o[s - 1];
                (s % i === 0 || i === 8 && s % i === 4) && (l = n[l >>> 24] << 24 ^ n[l >> 16 & 255] << 16 ^ n[l >> 8 & 255] << 8 ^ n[l & 255], s % i === 0 && (l = l << 8 ^ l >>> 24 ^ c << 24, c = c << 1 ^ (c >> 7) * 283)), o[s] = o[s - i] ^ l;
            }
            for(let l = 0; s; l++, s--){
                const f = o[l & 3 ? s : s - 4];
                s <= 4 || l < 4 ? a[l] = f : a[l] = r[0][n[f >>> 24]] ^ r[1][n[f >> 16 & 255]] ^ r[2][n[f >> 8 & 255]] ^ r[3][n[f & 255]];
            }
        }
        encrypt(t) {
            return this._crypt(t, 0);
        }
        decrypt(t) {
            return this._crypt(t, 1);
        }
        _precompute() {
            const t = this._tables[0], e = this._tables[1], n = t[4], r = e[4], i = [], s = [];
            let o, a, c, l;
            for(let f = 0; f < 256; f++)s[(i[f] = f << 1 ^ (f >> 7) * 283) ^ f] = f;
            for(let f = o = 0; !n[f]; f ^= a || 1, o = s[o] || 1){
                let u = o ^ o << 1 ^ o << 2 ^ o << 3 ^ o << 4;
                u = u >> 8 ^ u & 255 ^ 99, n[f] = u, r[u] = f, l = i[c = i[a = i[f]]];
                let d = l * 16843009 ^ c * 65537 ^ a * 257 ^ f * 16843008, h = i[u] * 257 ^ u * 16843008;
                for(let A = 0; A < 4; A++)t[A][f] = h = h << 24 ^ h >>> 8, e[A][u] = d = d << 24 ^ d >>> 8;
            }
            for(let f = 0; f < 5; f++)t[f] = t[f].slice(0), e[f] = e[f].slice(0);
        }
        _crypt(t, e) {
            if (t.length !== 4) throw new Error("invalid aes block size");
            const n = this._key[e], r = n.length / 4 - 2, i = [
                0,
                0,
                0,
                0
            ], s = this._tables[e], o = s[0], a = s[1], c = s[2], l = s[3], f = s[4];
            let u = t[0] ^ n[0], d = t[e ? 3 : 1] ^ n[1], h = t[2] ^ n[2], A = t[e ? 1 : 3] ^ n[3], _ = 4, E, p, R;
            for(let w = 0; w < r; w++)E = o[u >>> 24] ^ a[d >> 16 & 255] ^ c[h >> 8 & 255] ^ l[A & 255] ^ n[_], p = o[d >>> 24] ^ a[h >> 16 & 255] ^ c[A >> 8 & 255] ^ l[u & 255] ^ n[_ + 1], R = o[h >>> 24] ^ a[A >> 16 & 255] ^ c[u >> 8 & 255] ^ l[d & 255] ^ n[_ + 2], A = o[A >>> 24] ^ a[u >> 16 & 255] ^ c[d >> 8 & 255] ^ l[h & 255] ^ n[_ + 3], _ += 4, u = E, d = p, h = R;
            for(let w = 0; w < 4; w++)i[e ? 3 & -w : w] = f[u >>> 24] << 24 ^ f[d >> 16 & 255] << 16 ^ f[h >> 8 & 255] << 8 ^ f[A & 255] ^ n[_++], E = u, u = d, d = h, h = A, A = E;
            return i;
        }
    };
    const rs = {};
    rs.ctrGladman = class {
        constructor(t, e){
            this._prf = t, this._initIv = e, this._iv = e;
        }
        reset() {
            this._iv = this._initIv;
        }
        update(t) {
            return this.calculate(this._prf, t, this._iv);
        }
        incWord(t) {
            if ((t >> 24 & 255) === 255) {
                let e = t >> 16 & 255, n = t >> 8 & 255, r = t & 255;
                e === 255 ? (e = 0, n === 255 ? (n = 0, r === 255 ? r = 0 : ++r) : ++n) : ++e, t = 0, t += e << 16, t += n << 8, t += r;
            } else t += 1 << 24;
            return t;
        }
        incCounter(t) {
            (t[0] = this.incWord(t[0])) === 0 && (t[1] = this.incWord(t[1]));
        }
        calculate(t, e, n) {
            let r;
            if (!(r = e.length)) return [];
            const i = ot.bitLength(e);
            for(let s = 0; s < r; s += 4){
                this.incCounter(n);
                const o = t.encrypt(n);
                e[s] ^= o[0], e[s + 1] ^= o[1], e[s + 2] ^= o[2], e[s + 3] ^= o[3];
            }
            return ot.clamp(e, i);
        }
    };
    const Jt = {
        importKey (t) {
            return new Jt.hmacSha1(un.bytes.toBits(t));
        },
        pbkdf2 (t, e, n, r) {
            if (n = n || 1e4, r < 0 || n < 0) throw new Error("invalid params to pbkdf2");
            const i = (r >> 5) + 1 << 2;
            let s, o, a, c, l;
            const f = new ArrayBuffer(i), u = new DataView(f);
            let d = 0;
            const h = ot;
            for(e = un.bytes.toBits(e), l = 1; d < (i || 1); l++){
                for(s = o = t.encrypt(h.concat(e, [
                    l
                ])), a = 1; a < n; a++)for(o = t.encrypt(o), c = 0; c < o.length; c++)s[c] ^= o[c];
                for(a = 0; d < (i || 1) && a < s.length; a++)u.setInt32(d, s[a]), d += 4;
            }
            return f.slice(0, r / 8);
        }
    };
    Jt.hmacSha1 = class {
        constructor(t){
            const e = this, n = e._hash = es.sha1, r = [
                [],
                []
            ];
            e._baseHash = [
                new n,
                new n
            ];
            const i = e._baseHash[0].blockSize / 32;
            t.length > i && (t = new n().update(t).finalize());
            for(let s = 0; s < i; s++)r[0][s] = t[s] ^ 909522486, r[1][s] = t[s] ^ 1549556828;
            e._baseHash[0].update(r[0]), e._baseHash[1].update(r[1]), e._resultHash = new n(e._baseHash[0]);
        }
        reset() {
            const t = this;
            t._resultHash = new t._hash(t._baseHash[0]), t._updated = !1;
        }
        update(t) {
            const e = this;
            e._updated = !0, e._resultHash.update(t);
        }
        digest() {
            const t = this, e = t._resultHash.finalize(), n = new t._hash(t._baseHash[1]).update(e).finalize();
            return t.reset(), n;
        }
        encrypt(t) {
            if (this._updated) throw new Error("encrypt on already updated hmac called!");
            return this.update(t), this.digest(t);
        }
    };
    const wc = typeof crypto != kt && typeof crypto.getRandomValues == rt, Er = "Invalid password", is = "Invalid authentication code", dr = "zipjs-abort-check-password", Rc = "Crypto API not supported";
    function ss(t) {
        if (wc) return crypto.getRandomValues(t);
        throw new Error(Rc);
    }
    const ie = 16, Ic = "raw", os = {
        name: "PBKDF2"
    }, Sc = {
        name: "HMAC"
    }, mc = "SHA-1", gc = Object.assign({
        hash: Sc
    }, os), Yn = Object.assign({
        iterations: 1e3,
        hash: {
            name: mc
        }
    }, os), Nc = [
        "deriveBits"
    ], Me = [
        8,
        12,
        16
    ], Se = [
        16,
        24,
        32
    ], Gt = 10, yc = [
        0,
        0,
        0,
        0
    ], Nn = typeof crypto != kt, Ye = Nn && crypto.subtle, as = Nn && typeof Ye != kt, Ft = un.bytes, Dc = ns.aes, Oc = rs.ctrGladman, Fc = Jt.hmacSha1;
    let Hr = Nn && as && typeof Ye.importKey == rt, vr = Nn && as && typeof Ye.deriveBits == rt;
    class Lc extends TransformStream {
        constructor({ password: e, rawPassword: n, encryptionStrength: r, checkPasswordOnly: i, checkAuthenticationCode: s = !0 }){
            super({
                start () {
                    cs(this, e, n, r);
                },
                async transform (o, a) {
                    const c = this, { password: l, strength: f, resolveReady: u, ready: d } = c;
                    l ? (await Cc(c, f, l, mt(o, 0, Me[f] + 2)), o = mt(o, Me[f] + 2), i ? a.error(new Error(dr)) : u()) : await d;
                    const h = new Uint8Array(o.length - Gt - (o.length - Gt) % ie);
                    a.enqueue(ls(c, o, h, 0, Gt, !0));
                },
                async flush (o) {
                    const { ctr: a, hmac: c, pendingInput: l, ready: f } = this;
                    if (c && a) {
                        await f;
                        const u = mt(l, 0, l.length - Gt), d = mt(l, l.length - Gt);
                        let h = z;
                        if (u.length) {
                            const E = xe(Ft, u);
                            c.update(E);
                            const p = a.update(E);
                            h = Ue(Ft, p);
                        }
                        const A = mt(Ue(Ft, c.digest()), 0, Gt);
                        let _ = l.length < Gt ? 1 : 0;
                        for(let E = 0; E < Gt; E++)_ |= A[E] ^ d[E];
                        if (_ && s) throw new Error(is);
                        o.enqueue(h);
                    }
                }
            });
        }
    }
    class bc extends TransformStream {
        constructor({ password: e, rawPassword: n, encryptionStrength: r }){
            super({
                start () {
                    cs(this, e, n, r);
                },
                async transform (i, s) {
                    const o = this, { password: a, strength: c, resolveReady: l, ready: f } = o;
                    let u = z;
                    a ? (u = await Pc(o, c, a), l()) : await f;
                    const d = new Uint8Array(u.length + i.length - i.length % ie);
                    d.set(u, 0), s.enqueue(ls(o, i, d, u.length, 0));
                },
                async flush (i) {
                    const { ctr: s, hmac: o, pendingInput: a, ready: c } = this;
                    if (o && s) {
                        await c;
                        let l = z;
                        if (a.length) {
                            const u = s.update(xe(Ft, a));
                            o.update(u), l = Ue(Ft, u);
                        }
                        const f = Ue(Ft, o.digest()).slice(0, Gt);
                        i.enqueue(Yt(l, f));
                    }
                }
            });
        }
    }
    function cs(t, e, n, r) {
        Object.assign(t, {
            ready: new Promise((i)=>t.resolveReady = i),
            password: xc(e, n),
            strength: r - 1,
            pendingInput: z
        });
    }
    function ls(t, e, n, r, i, s) {
        const { ctr: o, hmac: a, pendingInput: c } = t;
        c.length && (e = Yt(c, e));
        const l = e.length - i;
        n = Bc(n, r + (l - l % ie));
        let f;
        for(f = 0; f <= l - ie; f += ie){
            const u = xe(Ft, mt(e, f, f + ie));
            s && a.update(u);
            const d = o.update(u);
            s || a.update(d), n.set(Ue(Ft, d), f + r);
        }
        return t.pendingInput = mt(e, f), n;
    }
    async function Cc(t, e, n, r) {
        const i = await us(t, e, n, mt(r, 0, Me[e])), s = mt(r, Me[e]);
        if (i[0] != s[0] || i[1] != s[1]) throw new Error(Er);
    }
    async function Pc(t, e, n) {
        const r = ss(new Uint8Array(Me[e])), i = await us(t, e, n, r);
        return Yt(r, i);
    }
    async function us(t, e, n, r) {
        t.password = null;
        const i = await Mc(Ic, n, gc, !1, Nc), s = await Uc(Object.assign({
            salt: r
        }, Yn), i, 8 * (Se[e] * 2 + 2)), o = new Uint8Array(s), a = xe(Ft, mt(o, 0, Se[e])), c = xe(Ft, mt(o, Se[e], Se[e] * 2)), l = mt(o, Se[e] * 2);
        return Object.assign(t, {
            keys: {
                key: a,
                authentication: c,
                passwordVerification: l
            },
            ctr: new Oc(new Dc(a), Array.from(yc)),
            hmac: new Fc(c)
        }), l;
    }
    async function Mc(t, e, n, r, i) {
        if (Hr) try {
            return await Ye.importKey(t, e, n, r, i);
        } catch  {
            return Hr = !1, Jt.importKey(e);
        }
        else return Jt.importKey(e);
    }
    async function Uc(t, e, n) {
        if (vr) try {
            return await Ye.deriveBits(t, e, n);
        } catch  {
            return vr = !1, Jt.pbkdf2(e, t.salt, Yn.iterations, n);
        }
        else return Jt.pbkdf2(e, t.salt, Yn.iterations, n);
    }
    function xc(t, e) {
        return e === T ? en(t) : e;
    }
    function Bc(t, e) {
        if (e && e > t.length) {
            const n = t;
            t = new Uint8Array(e), t.set(n, 0);
        }
        return t;
    }
    function mt(t, e, n) {
        return t.subarray(e, n);
    }
    function Ue(t, e) {
        return t.fromBits(e);
    }
    function xe(t, e) {
        return t.toBits(e);
    }
    const ae = 12;
    class Gc extends TransformStream {
        constructor({ password: e, rawPassword: n, passwordVerification: r, checkPasswordOnly: i }){
            super({
                start () {
                    fs(this, e, n, r);
                },
                transform (s, o) {
                    const a = this;
                    if (a.password || a.rawPassword) {
                        const c = Xr(a, s.subarray(0, ae));
                        if (a.password = a.rawPassword = null, (c[ae - 1] ^ a.passwordVerification) != 0) throw new Error(Er);
                        s = s.subarray(ae);
                    }
                    i ? o.error(new Error(dr)) : o.enqueue(Xr(a, s));
                }
            });
        }
    }
    class Hc extends TransformStream {
        constructor({ password: e, rawPassword: n, passwordVerification: r }){
            super({
                start () {
                    fs(this, e, n, r);
                },
                transform (i, s) {
                    const o = this;
                    let a, c;
                    if (o.password || o.rawPassword) {
                        o.password = o.rawPassword = null;
                        const l = ss(new Uint8Array(ae));
                        l[ae - 1] = o.passwordVerification, a = new Uint8Array(i.length + l.length), a.set(Vr(o, l), 0), c = ae;
                    } else a = new Uint8Array(i.length), c = 0;
                    a.set(Vr(o, i), c), s.enqueue(a);
                }
            });
        }
    }
    function fs(t, e, n, r) {
        Object.assign(t, {
            password: e,
            rawPassword: n,
            passwordVerification: r
        }), vc(t, e, n);
    }
    function Xr(t, e) {
        const n = new Uint8Array(e.length);
        for(let r = 0; r < e.length; r++)n[r] = Es(t) ^ e[r], fn(t, n[r]);
        return n;
    }
    function Vr(t, e) {
        const n = new Uint8Array(e.length);
        for(let r = 0; r < e.length; r++)n[r] = Es(t) ^ e[r], fn(t, e[r]);
        return n;
    }
    function vc(t, e, n) {
        const r = [
            305419896,
            591751049,
            878082192
        ];
        if (Object.assign(t, {
            keys: r,
            crcKey0: new Pe(r[0]),
            crcKey2: new Pe(r[2])
        }), n) for(let i = 0; i < n.length; i++)fn(t, n[i]);
        else for(let i = 0; i < e.length; i++)fn(t, e.charCodeAt(i));
    }
    function fn(t, e) {
        let [, n] = t.keys;
        t.crcKey0.append([
            e
        ]);
        const r = ~t.crcKey0.get();
        n = zr(Math.imul(zr(n + ds(r)), 134775813) + 1), t.crcKey2.append([
            n >>> 24
        ]);
        const i = ~t.crcKey2.get();
        t.keys = [
            r,
            n,
            i
        ];
    }
    function Es(t) {
        const e = t.keys[2] | 2;
        return ds(Math.imul(e, e ^ 1) >>> 8);
    }
    function ds(t) {
        return t & 255;
    }
    function zr(t) {
        return t & 4294967295;
    }
    function Qt(t) {
        if (t instanceof ReadableStream) return t;
        const e = t.getReader();
        return new ReadableStream({
            async pull (n) {
                const { value: r, done: i } = await e.read();
                i ? n.close() : n.enqueue(r);
            },
            cancel (n) {
                return e.cancel(n);
            }
        });
    }
    function Be(t, e) {
        t = Qt(t);
        const n = {};
        if (Xc()) return new Response(t).blob().then((i)=>i);
        const r = [];
        return t.pipeTo(new WritableStream({
            write (i) {
                r.push(i);
            }
        })).then(()=>new Blob(r, n));
    }
    function Xc() {
        return typeof Blob.prototype.stream != rt || new Blob([]).stream() instanceof ReadableStream;
    }
    function Vc(t) {
        if (t instanceof WritableStream) return t;
        const e = t.getWriter();
        return new WritableStream({
            write (n) {
                return e.write(n);
            },
            close () {
                return e.close();
            },
            abort (n) {
                return e.abort(n);
            }
        });
    }
    const zc = "Invalid codec module", Ge = "Compression method not supported", Yc = new Map, _r = new Map;
    function _s(t) {
        return Yc.get(t);
    }
    function Ts(t) {
        return _r.get(t);
    }
    function Zc(t, e) {
        const { CompressionStream: n, DecompressionStream: r } = e;
        if (typeof n != rt && typeof r != rt) throw new Error(zc);
        _r.set(t, {
            CompressionStream: n,
            DecompressionStream: r
        });
    }
    async function kc(t, e) {
        !_r.has(t) && e && Zc(t, await import(e).then(async (m)=>{
            await m.__tla;
            return m;
        }));
    }
    const yn = "Invalid uncompressed size", hs = "Invalid compressed data", As = "Invalid CRC32", ps = "deflate-raw", Wc = "deflate64-raw", En = "gzip", ws = 10, Zn = 8, Kc = [
        31,
        139,
        8
    ], jc = 5e3;
    class qc extends TransformStream {
        constructor(e, { chunkSize: n, CompressionStreamFallback: r, CompressionStream: i }){
            super({});
            const { compressed: s, encrypted: o, useCompressionStream: a, zipCrypto: c, computeCrc32: l, level: f, deflate64: u, format: d, compressionMethod: h, inputSize: A } = e, _ = this;
            let E, p, R, w = super.readable;
            const S = d && Ts(d), I = l && s && !u && !S && (!o || c) && !!(a && i);
            if ((!o || c) && l && !I && (E = new ts, w = yt(w, E)), s) if (S) w = ce(w, ms(S.CompressionStream, d, {
                level: f,
                chunkSize: n,
                compressionMethod: h,
                uncompressedSize: A
            }));
            else if (I) R = new Yr, w = ce(w, new i(En)), w = yt(w, R);
            else try {
                w = gs(w, a, {
                    level: f,
                    chunkSize: n
                }, i, r);
            } catch (g) {
                let N;
                try {
                    N = new i(En);
                } catch  {
                    throw g;
                }
                w = ce(w, N), w = yt(w, new Yr);
            }
            o && (c ? w = yt(w, new Hc(e)) : (p = new bc(e), w = yt(w, p))), Ss(_, w, ()=>{
                (!o || c) && l && (_.crc32 = I ? R.crc32 : new DataView(E.value.buffer).getUint32(0));
            });
        }
    }
    class Yr extends TransformStream {
        constructor(){
            let e, n = ws, r = new Uint8Array(0);
            super({
                transform (i, s) {
                    if (n) {
                        const l = Math.min(n, i.length);
                        if (n -= l, i = i.subarray(l), !i.length) return;
                    }
                    const o = r.length + i.length;
                    if (o <= Zn) {
                        r = Yt(r, i);
                        return;
                    }
                    const a = o - Zn, c = Math.min(a, r.length);
                    s.enqueue(Yt(r.subarray(0, c), i.subarray(0, a - c))), r = Yt(r.subarray(c), i.subarray(a - c));
                },
                flush () {
                    const i = b(r);
                    e.crc32 = i.getUint32(0, !0), e.uncompressedSize = i.getUint32(4, !0);
                }
            }), e = this;
        }
    }
    function Jc(t, e, n) {
        const r = new Pe;
        let i = 0, s = !1, o, a, c;
        const l = new Promise((A, _)=>{
            a = A, c = _;
        });
        l.catch(()=>{}), n || a();
        const f = new TransformStream({
            start (A) {
                const _ = new Uint8Array(ws);
                _.set(Kc), A.enqueue(_);
            },
            transform (A, _) {
                _.enqueue(A);
            },
            async flush (A) {
                s = !0, d();
                try {
                    await l;
                } finally{
                    h();
                }
                const _ = new Uint8Array(Zn), E = b(_);
                E.setUint32(0, r.get(), !0), E.setUint32(4, n, !0), A.enqueue(_);
            },
            cancel (A) {
                c(A);
            }
        }), u = new TransformStream({
            transform (A, _) {
                r.append(A), i += A.length, i >= n ? a() : s && d(), _.enqueue(A);
            },
            cancel (A) {
                c(A);
            }
        });
        return t = yt(t, f), t = ce(t, e), yt(t, u);
        function d() {
            h(), o = setTimeout(()=>c(new Error(yn)), jc);
        }
        function h() {
            clearTimeout(o);
        }
    }
    class Qc extends TransformStream {
        constructor(e, { chunkSize: n, DecompressionStreamFallback: r, DecompressionStream: i }){
            super({});
            const { zipCrypto: s, encrypted: o, checkCrc32: a, crc32: c, compressed: l, useCompressionStream: f, deflate64: u, format: d, compressionMethod: h, rawBitFlag: A, outputSize: _ } = e;
            let E, p, R = super.readable;
            if (o && (s ? R = yt(R, new Gc(e)) : (p = new Lc(e), R = yt(R, p))), l) {
                const w = d && Ts(d);
                if (w) R = ce(R, ms(w.DecompressionStream, d, {
                    chunkSize: n,
                    compressionMethod: h,
                    rawBitFlag: A,
                    uncompressedSize: _
                }));
                else try {
                    R = gs(R, f, {
                        chunkSize: n,
                        deflate64: u
                    }, i, r);
                } catch (S) {
                    if (u || _ === T) throw S;
                    let I;
                    try {
                        I = new i(En);
                    } catch  {
                        throw S;
                    }
                    R = Jc(R, I, _);
                }
                R = nl(R);
            }
            a && (E = new ts, R = yt(R, E)), Ss(this, R, ()=>{
                if (a) {
                    const w = new DataView(E.value.buffer);
                    if (c != w.getUint32(0, !1)) throw new Error(As);
                }
            });
        }
    }
    const Zr = new Map;
    function Rs(t, e) {
        if (!t) return !1;
        let n = Zr.get(t);
        n || (n = new Map, Zr.set(t, n));
        let r = n.get(e);
        if (r === T) {
            try {
                new t(e), r = !0;
            } catch  {
                r = !1;
            }
            n.set(e, r);
        }
        return r;
    }
    function Is(t) {
        return Rs(t, ps);
    }
    function $c(t) {
        return Rs(t, En);
    }
    function Ss(t, e, n) {
        e = yt(e, new TransformStream({
            flush: n
        })), Object.defineProperty(t, "readable", {
            get () {
                return e;
            }
        });
    }
    function ms(t, e, n) {
        if (!t) throw new Error(Ge);
        return new t(e, n);
    }
    function gs(t, e, n, r, i) {
        const s = e && r ? r : i || r, o = n.deflate64 ? Wc : ps;
        let a;
        try {
            a = new s(o, n);
        } catch (c) {
            if (e && i && s != i) a = new i(o, n);
            else throw c;
        }
        return ce(t, a);
    }
    function yt(t, e) {
        return Qt(t).pipeThrough(e);
    }
    function ce(t, e) {
        const n = e.writable.getWriter(), r = t.getReader();
        return i(), e.readable;
        async function i() {
            try {
                for(;;){
                    await n.ready;
                    const s = await r.read();
                    if (s.done) {
                        await n.close();
                        break;
                    }
                    await n.write(s.value);
                }
            } catch (s) {
                await tl(n, s), await el(r, s);
            }
        }
    }
    async function tl(t, e) {
        try {
            await t.abort(e);
        } catch  {}
    }
    async function el(t, e) {
        try {
            await t.cancel(e);
        } catch  {}
    }
    function nl(t) {
        const e = t.getReader();
        return new ReadableStream({
            async pull (n) {
                let r;
                try {
                    r = await e.read();
                } catch (o) {
                    if (o && o.message) throw o;
                    const a = new Error(hs);
                    throw a.cause = o, a;
                }
                const { value: i, done: s } = r;
                s ? n.close() : n.enqueue(i);
            },
            cancel (n) {
                return e.cancel(n);
            }
        });
    }
    const rl = 64 * 1024, il = "message", sl = "start", ol = "pull", kr = "data", al = "ack", cl = "close", Tr = "deflate", Ns = "inflate";
    class ll extends TransformStream {
        constructor(e, n){
            super({});
            const r = this, { codecType: i } = e;
            let s;
            i.startsWith(Tr) ? s = qc : i.startsWith(Ns) && (s = Qc), r.outputSize = 0;
            let o = 0;
            const a = new s(e, n), c = super.readable, l = new TransformStream({
                transform (u, d) {
                    u && u.length && (o += u.length, d.enqueue(u));
                },
                flush () {
                    Object.assign(r, {
                        inputSize: o
                    });
                }
            }), f = new TransformStream({
                transform (u, d) {
                    if (u && u.length && (d.enqueue(u), r.outputSize += u.length, e.outputSize !== T && r.outputSize > e.outputSize)) throw new Error(yn);
                },
                flush () {
                    const { crc32: u } = a;
                    Object.assign(r, {
                        crc32: u,
                        inputSize: o
                    });
                }
            });
            Object.defineProperty(r, "readable", {
                get () {
                    return c.pipeThrough(l).pipeThrough(a).pipeThrough(f);
                }
            });
        }
    }
    class ys extends TransformStream {
        constructor(e){
            const n = [];
            let r = 0;
            (!Number.isFinite(e) || e < 1) && (e = rl), super({
                transform (o, a) {
                    for(n.push(o), r += o.length; r > e;)a.enqueue(i());
                },
                flush (o) {
                    r && o.enqueue(s(n, r));
                }
            });
            function i() {
                const o = new Uint8Array(e);
                let a = 0;
                for(; a < e;){
                    const c = n[0], l = e - a;
                    c.length <= l ? (o.set(c, a), a += c.length, n.shift()) : (o.set(c.subarray(0, l), a), n[0] = c.subarray(l), a += l);
                }
                return r -= e, o;
            }
            function s(o, a) {
                const c = new Uint8Array(a);
                let l = 0;
                for (const f of o)c.set(f, l), l += f.length;
                return c;
            }
        }
    }
    const hr = "Worker startup timeout";
    let nn, Ds, kn, dn = ()=>{};
    function ul({ initModule: t }) {
        dn = t;
    }
    function fl(t) {
        kn = t;
    }
    async function El(t) {
        const { CompressionStream: e, CompressionStreamFallback: n } = t;
        if (n && !n.requiresModule || Is(e) || $c(e)) return !0;
        if (n) try {
            return await dn(t), !0;
        } catch  {
            return !1;
        }
        return !1;
    }
    function Wr(t) {
        t.createWorker ? Ds = !0 : nn = !1;
    }
    class rn {
        constructor(e, { readable: n, writable: r }, { options: i, config: s, streamOptions: o, useWebWorkers: a, transferStreams: c, workerURI: l, createWorker: f }, u){
            const { signal: d } = o;
            return Ds && (f = T), Object.assign(e, {
                busy: !0,
                generation: (e.generation || 0) + 1,
                readable: n.pipeThrough(new ys(fr(s))).pipeThrough(new dl(o), {
                    signal: d
                }),
                writable: r,
                options: Object.assign({}, i),
                workerURI: l,
                createWorker: f,
                transferStreams: c,
                terminate () {
                    return new Promise((h)=>{
                        const { worker: A, busy: _ } = e;
                        A ? (_ ? e.resolveTerminated = h : (A.terminate(), h()), e.interface = null) : h();
                    });
                },
                onTaskFinished () {
                    if (e.busy) {
                        const { resolveTerminated: h } = e;
                        h && (e.resolveTerminated = null, e.terminated = !0, e.worker.terminate(), h()), e.busy = !1, u(e);
                    }
                }
            }), nn === T && (nn = typeof Worker != kt), (a && kn && (nn && l || f) ? kn : Os)(e, s);
        }
    }
    class dl extends TransformStream {
        constructor({ onstart: e, onprogress: n, size: r, onend: i }){
            let s = 0;
            super({
                async start () {
                    e && await On(e, r);
                },
                async transform (o, a) {
                    s += o.length, n && await On(n, s, r), a.enqueue(o);
                },
                async flush () {
                    i && await On(i, s);
                }
            });
        }
    }
    async function On(t, ...e) {
        try {
            await t(...e);
        } catch  {}
    }
    function Os(t, e) {
        return {
            run: ()=>Wn(t, e)
        };
    }
    async function Wn({ options: t, readable: e, writable: n, onTaskFinished: r }, i) {
        let s;
        try {
            if (t.compressed && !t.format) {
                const l = t.codecType.startsWith(Tr), f = l ? i.CompressionStreamFallback : i.DecompressionStreamFallback, u = l ? i.CompressionStream : i.DecompressionStream;
                if (t.useCompressionStream) {
                    if (f && f.requiresModule && !Is(u)) try {
                        await dn(i);
                    } catch  {}
                } else try {
                    await dn(i);
                } catch  {
                    (!f || f.requiresModule) && (t.useCompressionStream = !0);
                }
            }
            s = new ll(t, i), await e.pipeThrough(s).pipeThrough(new ys(fr(i))).pipeTo(n, {
                preventClose: !0,
                preventAbort: !0
            });
            const { crc32: o, inputSize: a, outputSize: c } = s;
            return {
                crc32: o,
                inputSize: a,
                outputSize: c
            };
        } catch (o) {
            throw s && (o.outputSize = s.outputSize), o;
        } finally{
            r();
        }
    }
    const Kr = {
        type: "module"
    }, Kn = "error", _l = "messageerror";
    let jr, Fn, qr, jn = !0;
    try {
        jn = typeof structuredClone == rt && structuredClone(new DOMException("", "AbortError")).code !== T;
    } catch  {}
    fl(Tl);
    function Tl(t, e) {
        const { baseURI: n, chunkSize: r, workerStartupTimeout: i } = e;
        let { wasmURI: s } = e;
        if (!t.interface) {
            typeof s == rt && (s = s());
            let o;
            try {
                o = sn(t.workerURI, n, t);
            } catch  {
                return Wr(t), Os(t, e);
            }
            Object.assign(t, {
                worker: o,
                workerAlive: !1,
                terminated: !1,
                startupError: null,
                interface: {
                    run: async ()=>{
                        try {
                            return await hl(t, {
                                chunkSize: r,
                                wasmURI: s,
                                baseURI: n,
                                workerStartupTimeout: i
                            });
                        } catch (a) {
                            if (a && a.workerStartupFailed) return Wr(t), Jr(t), Wn(t, e);
                            if (a && a.codecImportFailed) {
                                if (t.reader) return Jr(t), Wn(t, e);
                                t.onTaskFinished();
                            }
                            throw a;
                        }
                    }
                }
            });
        }
        return t.interface;
    }
    async function hl(t, e) {
        if (!t.worker) {
            const { startupError: h } = t;
            t.startupError = null;
            const A = h || new Error(hr);
            throw A.workerStartupFailed = !0, A;
        }
        let n, r;
        const i = new Promise((h, A)=>{
            n = h, r = A;
        });
        Object.assign(t, {
            reader: null,
            writer: null,
            resolveResult: n,
            rejectResult: r,
            result: i
        });
        const { readable: s, options: o } = t, { writable: a, closed: c, abortPipe: l } = Al(t.writable);
        let f;
        try {
            f = qn({
                type: sl,
                options: o,
                config: e,
                readable: s,
                writable: a
            }, t);
        } catch (h) {
            l();
            try {
                await c;
            } catch  {}
            throw t.onTaskFinished(), h;
        }
        f || Object.assign(t, {
            reader: s.getReader(),
            writer: a.getWriter()
        });
        const { workerStartupTimeout: u } = e;
        !t.workerAlive && Number.isFinite(u) && u >= 0 && (t.startupTimeout = setTimeout(()=>pl(t), u));
        try {
            const h = await i;
            return await d(), await c, h;
        } catch (h) {
            await d(), l();
            try {
                await c;
            } catch  {}
            throw h;
        }
        async function d() {
            if (!f && !a.locked) try {
                await a.getWriter().close();
            } catch  {}
        }
    }
    function Al(t) {
        const e = new AbortController, { writable: n, readable: r } = new TransformStream, i = r.pipeTo(t, {
            preventClose: !0,
            preventAbort: !0,
            signal: e.signal
        });
        return i.catch(()=>{}), {
            writable: n,
            closed: i,
            abortPipe: ()=>e.abort()
        };
    }
    function Jr(t) {
        const { reader: e } = t;
        e && e.releaseLock(), t.reader = null, t.writer = null;
    }
    function Ar(t) {
        const { worker: e } = t;
        if (e) try {
            e.terminate();
        } catch  {}
        t.interface = null;
    }
    function sn(t, e, n, r, i = !0) {
        const { createWorker: s } = n;
        let o, a, c;
        if (s) o = s();
        else if (Fn === T || jr !== t) {
            const l = typeof t == rt;
            l ? a = t(i) : a = t;
            const f = a.startsWith("data:"), u = a.startsWith("blob:");
            if (f || u) {
                r === T && (r = !1), r && (c = Kr);
                try {
                    o = new Worker(a, c);
                } catch (d) {
                    if (u) try {
                        URL.revokeObjectURL(a);
                    } catch  {}
                    if (l && u) return sn(t, e, n, r, !1);
                    if (r) throw d;
                    return sn(t, e, n, !0, !1);
                }
            } else {
                r === T && (r = !0), r && (c = Kr);
                try {
                    a = new URL(a, e);
                } catch  {}
                try {
                    o = new Worker(a, c);
                } catch (d) {
                    if (r) return sn(t, e, n, !1, i);
                    throw d;
                }
            }
            jr = t, Fn = a, qr = c;
        } else o = new Worker(Fn, qr);
        return o.addEventListener(il, (l)=>{
            n.workerAlive = !0, Fs(n), wl(l, n);
        }), o.addEventListener(Kn, (l)=>Qr(l, n)), o.addEventListener(_l, (l)=>Qr(l, n)), o;
    }
    function pl(t) {
        if (t.startupTimeout = null, t.workerAlive) return;
        const { rejectResult: e, writer: n } = t;
        if (Ar(t), t.worker = null, e) {
            const r = new Error(hr);
            r.workerStartupFailed = !0, e(r), n && n.releaseLock();
        }
    }
    function Fs(t) {
        const { startupTimeout: e } = t;
        e && (clearTimeout(e), t.startupTimeout = null);
    }
    function Qr(t, e) {
        t.preventDefault && t.preventDefault(), Fs(e);
        const { workerAlive: n, rejectResult: r, writer: i, onTaskFinished: s } = e;
        Ar(e), n || (e.worker = null);
        let o = t.error || new Error(t.message || Kn);
        n || (o = Object.assign(new Error(o.message || Kn), {
            workerStartupFailed: !0
        }), e.startupError = o), r && (r(o), i && i.releaseLock(), n && s());
    }
    function qn(t, { worker: e, writer: n, transferStreams: r, workerAlive: i }) {
        try {
            const { value: s, readable: o, writable: a } = t, c = [];
            if (s && (t.value = $i(s), c.push(t.value.buffer)), r && jn && i ? (o && c.push(o), a && c.push(a)) : t.readable = t.writable = null, c.length) try {
                return e.postMessage(t, c), !0;
            } catch  {
                jn = !1, t.readable = t.writable = null, e.postMessage(t);
            }
            else e.postMessage(t);
        } catch (s) {
            throw n && n.releaseLock(), s;
        }
    }
    async function wl({ data: t }, e) {
        const { type: n, value: r, messageId: i, result: s, error: o } = t, { reader: a, writer: c, resolveResult: l, rejectResult: f, onTaskFinished: u, generation: d } = e, h = ()=>e.generation != d;
        try {
            if (o) {
                const { message: _, stack: E, code: p, name: R, outputSize: w, cause: S, codecImportFailed: I } = o, g = new Error(_);
                Object.assign(g, {
                    stack: E,
                    code: p,
                    name: R,
                    outputSize: w
                }), S && (g.cause = Object.assign(new Error(S.message), {
                    name: S.name
                })), I && (g.codecImportFailed = !0), A(g);
            } else {
                if (n == ol) {
                    const { value: _, done: E } = await a.read();
                    h() || qn({
                        type: kr,
                        value: _,
                        done: E,
                        messageId: i
                    }, e);
                }
                n == kr && (await c.ready, await c.write(new Uint8Array(r)), h() || qn({
                    type: al,
                    messageId: i
                }, e)), n == cl && A(null, s);
            }
        } catch (_) {
            h() || (Ar(e), A(_));
        }
        function A(_, E) {
            h() || (_ ? f(_) : l(E), c && c.releaseLock(), _ && _.codecImportFailed || u());
        }
    }
    let jt = [];
    const le = [];
    let ue, on, $r = 0;
    async function Ls(t, e) {
        const { options: n, config: r } = e, { transferStreams: i, useWebWorkers: s, useCompressionStream: o, compressed: a, checkCrc32: c, computeCrc32: l, encrypted: f, format: u, codecURI: d } = n, { workerURI: h, createWorker: A, maxWorkers: _ } = r;
        u && (d && (n.codecURI = Rl(d, r.baseURI)), await kc(u, n.codecURI)), e.transferStreams = !u && (i || i === T && r.transferStreams);
        const E = !a && !c && !l && !f, p = u === T || !!n.codecURI;
        return e.useWebWorkers = !E && p && (s || s === T && r.useWebWorkers), e.workerURI = e.useWebWorkers && h ? h : T, e.createWorker = e.useWebWorkers && A ? A : T, n.useCompressionStream = o || o === T && r.useCompressionStream, (await R()).run();
        async function R() {
            const S = jt.find((I)=>!I.busy);
            if (S) return ti(S), new rn(S, t, e, w);
            if (jt.length < _) {
                const I = {
                    indexWorker: $r
                };
                return $r++, jt.push(I), new rn(I, t, e, w);
            } else return new Promise((I)=>{
                le.push({
                    resolve: I,
                    stream: t,
                    workerOptions: e
                }), on = r.workerStarvationTimeout, _n();
            });
        }
        function w(S) {
            if (bs(), le.length) {
                const [{ resolve: I, stream: g, workerOptions: N }] = le.splice(0, 1);
                I(new rn(S, g, N, w)), _n();
            } else S.worker ? (ti(S), ml(S, e)) : jt = jt.filter((I)=>I != S);
        }
    }
    function Rl(t, e) {
        try {
            return new URL(t, e).toString();
        } catch  {
            return t;
        }
    }
    function _n() {
        !ue && le.length && Number.isFinite(on) && on >= 0 && (ue = setTimeout(Il, on));
    }
    function bs() {
        ue && (clearTimeout(ue), ue = null);
    }
    function Il() {
        if (ue = null, le.length) {
            const [{ resolve: t, stream: e, workerOptions: n }] = le.splice(0, 1), r = Object.assign({}, n, {
                useWebWorkers: !1,
                workerURI: T,
                createWorker: T
            });
            t(new rn({}, e, r, Sl)), _n();
        }
    }
    function Sl() {
        bs(), _n();
    }
    function ml(t, e) {
        const { config: n } = e, { terminateWorkerTimeout: r } = n;
        Number.isFinite(r) && r >= 0 && (t.terminated ? t.terminated = !1 : t.terminateTimeout = setTimeout(async ()=>{
            jt = jt.filter((i)=>i != t);
            try {
                await t.terminate();
            } catch  {}
        }, r));
    }
    function ti(t) {
        const { terminateTimeout: e } = t;
        e && (clearTimeout(e), t.terminateTimeout = null);
    }
    const gl = "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ".split("");
    function Nl(t) {
        let e = "";
        for(let n = 0; n < t.length; n++)e += gl[t[n]];
        return e;
    }
    function an(t, e) {
        return yl(t, e, !0);
    }
    function yl(t, e, n) {
        return e && e.trim().toLowerCase() == "cp437" ? Nl(t) : new TextDecoder(e, {
            ignoreBOM: n
        }).decode(t);
    }
    const Dl = "Writer iterator completed too soon", Ol = "Writer not initialized", Fl = "text/plain", Ll = 256 * 1024, Cs = "writable", ei = Symbol();
    class pr {
        constructor(){
            this.size = 0;
        }
        init() {
            this.initialized = !0;
        }
    }
    class wr extends pr {
        get readable() {
            return this.createReadable();
        }
        createReadable({ offset: e = 0, size: n, chunkSize: r = fr(ze()) } = {}) {
            const i = this;
            let s = 0;
            return r = Qi(r), new ReadableStream({
                async pull (o) {
                    const a = n === T ? r : Math.min(r, n - s), c = await W(i, e + s, a);
                    c.length && (o.enqueue(c), s += c.length), (n !== T && s >= n || !c.length && a) && o.close();
                }
            });
        }
    }
    class bl extends pr {
        constructor(){
            super();
            const e = this, n = new WritableStream({
                write (r) {
                    if (!e.initialized) throw new Error(Ol);
                    return e.writeUint8Array($i(r));
                }
            });
            Object.defineProperty(e, Cs, {
                get () {
                    return n;
                }
            });
        }
        writeUint8Array() {}
    }
    let Jn, Ps;
    function Cl() {
        Ps = (async ()=>{
            try {
                const e = new Blob([
                    new Uint8Array(3)
                ]).slice(1, 2).stream().getReader();
                let n = 0, r = await e.read();
                for(; !r.done;)n += r.value.length, r = await e.read();
                Jn = n == 1;
            } catch  {
                Jn = !1;
            }
        })();
    }
    class $t extends wr {
        constructor(e){
            super(), Object.assign(this, {
                sourceBlob: e,
                size: e.size
            }), Ps || Cl();
        }
        createReadable(e) {
            const n = this, { sourceBlob: r, size: i } = n, { offset: s = 0, size: o = i - s } = e || {};
            if (typeof r.stream == rt) {
                if (!s && o >= i) return Qt(r.stream());
                if (Jn) return Qt(r.slice(s, s + o).stream());
            }
            return super.createReadable(e);
        }
        async readUint8Array(e, n) {
            const r = this, i = e + n;
            let a = await (!e && i >= r.size ? r.sourceBlob : r.sourceBlob.slice(e, i)).arrayBuffer();
            return a.byteLength > n && (a = a.slice(e, i)), new Uint8Array(a);
        }
    }
    class Pl extends $t {
        constructor(e){
            super(new Blob([
                e
            ], {
                type: Fl
            }));
        }
    }
    class Ml extends bl {
        constructor(e){
            super(), this.defaultBufferSize = e || Ll;
        }
        init(e = 0) {
            Object.assign(this, {
                offset: 0,
                array: new Uint8Array(e > 0 ? e : this.defaultBufferSize)
            }), super.init();
        }
        writeUint8Array(e) {
            const n = this, r = n.offset + e.length;
            if (r > n.array.length) {
                let i = n.array.length ? n.array.length * 2 : n.defaultBufferSize;
                for(; i < r;)i *= 2;
                const s = n.array;
                n.array = new Uint8Array(i), n.array.set(s);
            }
            n.array.set(e, n.offset), n.offset += e.length;
        }
        getData() {
            return this.offset === this.array.length ? this.array : this.array.slice(0, this.offset);
        }
    }
    class Ul extends wr {
        constructor(e){
            super(), this.readers = e;
        }
        async init() {
            const e = this;
            e.lastDiskNumber = 0;
            const n = e.readers = await Promise.all(e.readers.map(Bl));
            e.diskOffsets = n.map((r)=>{
                const i = e.size;
                return e.size += r.size, i;
            }), super.init();
        }
        getDiskOffset(e) {
            const { diskOffsets: n, size: r } = this, i = n[e];
            return i === T ? r : i;
        }
        async readUint8Array(e, n) {
            const r = this, { readers: i } = this;
            let s, o = 0, a = e;
            for(; i[o] && a >= i[o].size;)a -= i[o].size, o++;
            const c = i[o];
            if (c) {
                const l = c.size;
                if (a + n <= l) s = await W(c, a, n);
                else {
                    const f = l - a, u = await W(c, a, f), d = await r.readUint8Array(e + f, n - f);
                    s = Yt(u, d);
                }
            } else s = z;
            return r.lastDiskNumber = Math.max(o, r.lastDiskNumber), s;
        }
    }
    class xl extends pr {
        constructor(e, n = 4294967295){
            super();
            const r = this;
            Object.assign(r, {
                diskNumber: 0,
                diskOffset: 0,
                size: 0,
                maxSize: n,
                availableSize: n
            });
            let i, s, o;
            const a = new WritableStream({
                async write (u) {
                    if (u === ei) {
                        o && await l();
                        return;
                    }
                    const { availableSize: d } = r;
                    if (o) u.length >= d ? (await c(u.subarray(0, d)), await l(), u.length > d && await this.write(u.subarray(d))) : await c(u);
                    else {
                        const { value: h, done: A } = await e.next();
                        if (A && !h) throw new Error(Dl);
                        i = h, i.size = 0, i.maxSize && (r.maxSize = i.maxSize), r.availableSize = r.maxSize, await at(i), s = h.writable, o = s.getWriter(), await this.write(u);
                    }
                },
                async close () {
                    o && (await o.ready, await f());
                },
                async abort (u) {
                    o && await o.abort(u);
                }
            });
            Object.defineProperty(r, Cs, {
                get () {
                    return a;
                }
            });
            async function c(u) {
                const d = u.length;
                d && (await o.ready, await o.write(u), i.size += d, r.availableSize -= d);
            }
            async function l() {
                await f(), r.diskOffset += i.size, r.diskNumber++, o = null, r.availableSize = r.maxSize;
            }
            async function f() {
                await o.close();
            }
        }
        async closeDisk() {
            const e = this.writable.getWriter();
            try {
                await e.ready, await e.write(ei);
            } finally{
                e.releaseLock();
            }
        }
    }
    class Ze {
        constructor(e){
            return Array.isArray(e) && (e = new Ul(e)), (e instanceof ReadableStream || typeof e.getReader == rt) && (e = {
                readable: Qt(e)
            }), e;
        }
    }
    class Ms {
        constructor(e){
            return e.writable === T && typeof e.next == rt && (e = new xl(e)), (e instanceof WritableStream || typeof e.getWriter == rt) && (e = {
                writable: Vc(e)
            }), e.size === T && (e.size = 0), e;
        }
    }
    function Us(t) {
        return !!(t && t.getData);
    }
    async function at(t, e) {
        if (t.init && !t.initialized) await t.init(e);
        else return Promise.resolve();
    }
    async function Bl(t) {
        return t = new Ze(t), await at(t), (t.size === T || !t.readUint8Array) && (t = new $t(await Be(t.readable)), await at(t)), t;
    }
    function W(t, e, n) {
        return t.readUint8Array(e, n);
    }
    function xs(t, e) {
        return t.createReadable ? t.createReadable(e) : t.readUint8Array ? wr.prototype.createReadable.call(t, e) : t.readable;
    }
    const Bs = "filename", Gs = "rawFilename", Rr = "comment", Hs = "rawComment", Ir = "uncompressedSize", vs = "compressedSize", Xs = "offset", Vs = "diskNumberStart", Tn = "lastModDate", hn = "rawLastModDate", Sr = "lastAccessDate", zs = "rawLastAccessDate", mr = "creationDate", Ys = "rawCreationDate", Zs = "internalFileAttributes", ks = "externalFileAttributes", Ws = "msdosAttributesRaw", Ks = "msdosAttributes", js = "msDosCompatible", gr = "zip64", qs = "encrypted", Js = "version", Qs = "versionMadeBy", $s = "zipCrypto", fe = "directory", to = "executable", Gl = "symlink", eo = "compressionMethod", Qn = "signature", Hl = "crc32", Nr = "extraField", vl = "extraFieldInfoZip", Xl = "extraFieldUnix", Vl = "extraFieldUnixType1", zl = "extraFieldPkwareUnix", no = "uid", ro = "gid", io = "unixMode", so = "setuid", oo = "setgid", ao = "sticky", Yl = "bitFlag", Zl = "rawBitFlag", kl = "filenameLength", Wl = "extraFieldLength", Kl = "unixExternalUpper", jl = "filenameUTF8", ql = "commentUTF8", Jl = "rawExtraField", Ql = "extraFieldZip64", $l = "extraFieldUnicodePath", tu = "extraFieldUnicodeComment", eu = "extraFieldAES", nu = "extraFieldNTFS", ru = "extraFieldExtendedTimestamp", iu = "extraFieldUSDZ", su = [
        Bs,
        Gs,
        Ir,
        vs,
        Tn,
        hn,
        Rr,
        Hs,
        Sr,
        zs,
        mr,
        Ys,
        Xs,
        Vs,
        Zs,
        ks,
        Ws,
        Ks,
        js,
        gr,
        qs,
        Js,
        Qs,
        $s,
        fe,
        to,
        Gl,
        eo,
        Qn,
        Hl,
        Nr,
        Xl,
        vl,
        Vl,
        zl,
        no,
        ro,
        io,
        Kl,
        so,
        oo,
        ao,
        Yl,
        Zl,
        kl,
        Wl,
        jl,
        ql,
        Jl,
        Ql,
        $l,
        tu,
        eu,
        nu,
        ru,
        iu
    ];
    class An {
        constructor(e){
            su.forEach((n)=>this[n] = e[n]);
        }
    }
    const De = "File format is not recognized", co = "End of central directory not found", lo = "End of Zip64 central directory locator not found", uo = "Central directory header not found", fo = "Local file header not found", Eo = "Zip64 extra field not found", _o = "File contains encrypted entry", $n = "Encryption method not supported", tr = "Split zip file", To = "Overlapping entry found", ho = "Entry data out of bounds", Ao = "Ambiguous archive", po = "Encrypted central directory is not supported", wo = "Unsafe filename", Ro = "Invalid strictness (must be 'strict', 'balanced' or 'tolerant')", Io = "Invalid filenameValidation (must be 'strict', 'balanced' or 'tolerant')", So = "Invalid maxAppendedDataSize (must be a number greater than or equal to 0)", mo = "64-bit value exceeds Number.MAX_SAFE_INTEGER", go = "unsorted central directory", No = "unknown version needed to extract", yo = "compressed patched data", yr = "malformed extra field", Do = "unknown zip64 extensible data", er = "wrapped entries count", nr = "appended data", rr = "prepended data", Oo = "prepended central directory", Fo = "trailing central directory data", Lo = "duplicate filename", Oe = "mismatched zip64 end of central directory record", bo = "mismatched local file header (general purpose bit flag)", Co = "mismatched local file header (compression method)", Po = "mismatched local file header (crc32 or sizes)", ou = 63, au = /^[a-zA-Z]:/, ni = "utf-8", cu = "UTF8", ri = "cp437", ii = 2057, Mo = 1, lu = [
        [
            Ir,
            4294967295
        ],
        [
            vs,
            4294967295
        ],
        [
            Xs,
            4294967295
        ],
        [
            Vs,
            65535
        ]
    ], si = {
        65535: {
            getValue: P,
            bytes: 4
        },
        4294967295: {
            getValue: ht,
            bytes: 8
        }
    }, uu = BigInt(Number.MAX_SAFE_INTEGER), fu = 64, Eu = 1032, oi = 0, Dr = 1, pn = 2;
    class Or {
        constructor(e, n = {}){
            Object.assign(this, {
                reader: new Ze(e),
                options: n,
                readRanges: new Map
            });
        }
        async *getEntriesGenerator(e = {}) {
            const n = this;
            let { reader: r } = n;
            if (await at(r), (r.size === T || !r.readUint8Array) && (r = new $t(await Be(r.readable)), await at(r)), r.size < 22) throw new Error(De);
            const i = n.warnings = [], s = Fr(e, n.options), o = s == te, a = s != Wt, c = Ho(q(n, e, Bi), s), l = Ou(q(n, e, Ka), s), f = q(n, e, ja), { endOfDirectoryInfo: u, endOfDirectoryReachingEndCount: d } = await vo(r, a, c);
            if (!u) throw await mu(r) ? new Error(tr) : new Error(co);
            a && d > 1 && cn("multiple end of central directory records");
            const h = b(u);
            let A = P(h, 12), _ = P(h, 16);
            const E = u.offset, p = H(h, 20), R = E + 22 + p, w = r.size - R;
            w > c && cn(nr), w > 0 && St(i, nr);
            let S = H(h, 4);
            const I = r.lastDiskNumber || 0;
            let g = H(h, 6), N = H(h, 10), y = 0, F, D, Z, x, Y = 56, X;
            const k = _ == 4294967295 || A == 4294967295 || N == 65535 || g == 65535;
            if (_ != 4294967295 && g != 65535 && (_ += se(r, g)), k) {
                const C = u.offset >= 20 ? await W(r, u.offset - 20, 20) : z, m = b(C);
                if (C.length == 20 && P(m, 0) == 117853008) {
                    _ = se(r, P(m, 4)) + ht(m, 8);
                    let $ = await W(r, _, 56), G = b($);
                    const Rt = u.offset - 20 - 56;
                    if (($.length < 56 || P(G, 0) != 101075792) && _ != Rt && Rt >= 0) {
                        const it = _;
                        _ = Rt, _ > it && (y = _ - it), $ = await W(r, _, 56), G = b($);
                    }
                    if ($.length < 56 || P(G, 0) != 101075792) throw new Error(lo);
                    if (Z = !0, x = ht(G, 4) > 44, x) {
                        const it = Math.min(ht(G, 4) - 44, r.size - _ - 56);
                        if (it > 0) {
                            Y += it;
                            const Pt = await W(r, _ + 56, it);
                            X = Au(Pt);
                        }
                    }
                    S == 65535 ? S = P(G, 16) : S != P(G, 16) && Ot(o, i, Oe), g == 65535 ? g = P(G, 20) : g != P(G, 20) && Ot(o, i, Oe), N == 65535 ? N = ht(G, 32) : N != ht(G, 32) && Ot(o, i, Oe), A == 4294967295 ? A = ht(G, 40) : A != ht(G, 40) && Ot(o, i, Oe), _ = se(r, g) + ht(G, 48) + y;
                }
            }
            let v = A;
            const J = u.offset - (Z ? Y + 20 : 0);
            if (_ >= r.size && (y = r.size - _ - A - 22, _ = r.size - A - 22), I != S) throw new Error(tr);
            if (_ < 0) throw new Error(De);
            let B = 0, O = await W(r, _, A), L = b(O);
            if (A) {
                if (O.length < 4) throw new Error(De);
                const C = J - A;
                if (_ != C && g == S) {
                    const m = P(L, B) == 33639248 || !!(X && X.compressedSize) || Ln(L);
                    let $ = !m;
                    if (!$ && C >= 0 && C + 4 <= r.size) {
                        const G = await W(r, C, 4);
                        $ = P(b(G), 0) == 33639248;
                    }
                    if ($) {
                        const G = _;
                        _ = C, _ > G && (y += _ - G, F = m), O = await W(r, _, A), L = b(O);
                    }
                }
            }
            const V = J - _;
            if (A != V && V >= 0 && g == S && (A = V, O = await W(r, _, A), L = b(O)), _ < 0 || _ >= r.size) throw new Error(De);
            n.directoryOffset = _, n.directoryLength = v;
            const ct = Ti(n, e, qa);
            let lt, gt;
            if (ct && N && O.length >= 4 && P(L, 0) != 33639248 && (x || Ln(L))) {
                const C = hu(X, v, O.length);
                gt = O.subarray(C), O = await ct(O.subarray(0, C), X), L = b(O), v = O.length, lt = !0;
            }
            X && !lt && (O.length < 4 || P(L, 0) == 33639248) && St(i, Do), D = _;
            const wt = q(n, e, Ra), Nt = q(n, e, Ia), dt = new Set;
            let Ct, Xt = -1;
            const tt = !o && !Z;
            !N && tt && (N = ai(L, O, B), N && St(i, er));
            for(let C = 0; C < N; C++){
                const m = new Tu(r, n.options);
                if (B + 46 > O.length || P(L, B) != 33639248) throw C == 0 && !lt && (x || Ln(L)) ? new Error(po) : new Error(uo);
                Uo(m, L, B + 6);
                const $ = !!m.bitFlag.languageEncodingFlag, G = B + 46, Rt = G + m.filenameLength, it = Rt + m.extraFieldLength, Pt = H(L, B + 4), ee = Pt >> 8 == 0, Dt = Pt >> 8 == 3, Mt = O.subarray(G, Rt), et = H(L, B + 32), Kt = it + et, Ae = O.subarray(it, Kt), ke = $, Ut = $, We = P(L, B + 38), Vt = We & 255, pe = {
                    readOnly: !!(Vt & 1),
                    hidden: !!(Vt & 2),
                    system: !!(Vt & 4),
                    directory: !!(Vt & 16),
                    archive: !!(Vt & 32)
                }, ne = P(L, B + 42), zt = Ti(n, e, Sa) || an, xt = ke ? ni : wt || ri, Ke = Ut ? ni : Nt || ri;
                let st = zt(Mt, xt, Gi);
                if (st === T && (st = an(Mt, xt)), f) {
                    const It = f(st);
                    It !== T && (st = It);
                }
                if (Fu(st, l)) {
                    const It = new Error(wo);
                    throw It.filename = st, It;
                }
                let we = zt(Ae, Ke, Hi);
                we === T && (we = an(Ae, Ke)), Object.assign(m, {
                    index: C,
                    decryptedDirectory: lt,
                    versionMadeBy: Pt,
                    msDosCompatible: ee,
                    zip64: !1,
                    compressedSize: 0,
                    uncompressedSize: 0,
                    commentLength: et,
                    offset: ne,
                    diskNumberStart: H(L, B + 34),
                    internalFileAttributes: H(L, B + 36),
                    externalFileAttributes: We,
                    msdosAttributesRaw: Vt,
                    msdosAttributes: pe,
                    rawFilename: Mt,
                    filenameUTF8: ke,
                    commentUTF8: Ut,
                    rawExtraField: O.subarray(Rt, it),
                    rawComment: Ae,
                    filename: st,
                    comment: we
                }), xo(m, m, L, B + 6) && St(i, yr, st), m.offset += y;
                const Re = se(r, m.diskNumberStart) + m.offset;
                D = Math.min(Re, D), Re < Xt && St(i, go, st), Xt = Re, (m.version & 255) > ou && St(i, No, st), (m.rawBitFlag & 32) == 32 && St(i, yo, st), dt.has(m.filename) && (Ct = !0), dt.add(m.filename);
                const Et = m.externalFileAttributes >> 16 & 65535;
                m.unixMode === T && (Et & 16877) != 0 && (m.unixMode = Et);
                const ua = !!(m.unixMode & 2048), fa = !!(m.unixMode & 1024), Ea = !!(m.unixMode & 512), Mr = ((m.unixMode === T ? Et : m.unixMode) & 61440) == 40960, da = !Mr && (m.unixMode !== T ? (m.unixMode & 73) != 0 : Dt && (Et & 73) != 0), _a = m.unixMode !== T && (m.unixMode & 61440) == 16384, Ta = (Et & 61440) == 16384;
                Object.assign(m, {
                    setuid: ua,
                    setgid: fa,
                    sticky: Ea,
                    symlink: Mr,
                    unixExternalUpper: Et,
                    executable: da,
                    directory: _a || Ta || ee && pe.directory || m.filename.endsWith("/"),
                    zipCrypto: m.encrypted && !m.extraFieldAES
                });
                const Ie = new An(m);
                if (Ie.getData = (It, je)=>m.getData(It, Ie, n.readRanges, je), Ie.arrayBuffer = async (It)=>{
                    const je = new TransformStream, xr = Be(je.readable).then((ha)=>ha.arrayBuffer());
                    return xr.catch(()=>{}), await m.getData(je, Ie, n.readRanges, It), xr;
                }, B = Kt, C == N - 1 && tt) {
                    const It = ai(L, O, B);
                    It && (N += It, St(i, er));
                }
                const { onprogress: Ur } = e;
                if (Ur) try {
                    await Ur(C + 1, N, new An(m));
                } catch  {}
                yield Ie;
            }
            let _t = B, ut = bn(O.subarray(B)) || (lt ? bn(gt) : T);
            if (!ut && !lt) {
                const C = _ + B, m = Math.min(J - C, 65541);
                m >= 6 && (ut = bn(await W(r, C, m)));
            }
            ut && (n.digitalSignature = ut, _t = B + 6 + ut.length), (B != v && _t != v || !lt && B != A && _t != A) && Ot(o, i, Fo), Ct && Ot(o, i, Lo);
            const K = q(n, e, ma), Q = q(n, e, ga), ft = (o || K) && N && D == 4 && await gu(r) ? 4 : 0;
            return o && (y || N && D > ft) && cn(rr), (y || N && D > 4) && St(i, rr), F && St(i, Oo), K && (n.prependedData = D > ft ? await W(r, ft, D - ft) : z), n.comment = p ? await W(r, E + 22, p) : z, Q && (n.appendedData = R < r.size ? await W(r, R, r.size - R) : z), !0;
        }
        async getEntries(e = {}) {
            const n = [];
            for await (const r of this.getEntriesGenerator(e))n.push(r);
            return n;
        }
        async close() {
            const { reader: e } = this;
            !e.readUint8Array && e.readable && !e.readable.locked && await e.readable.cancel();
        }
    }
    class du {
        constructor(e = {}){
            const { readable: n, writable: r } = new TransformStream, i = new Or(n, e).getEntriesGenerator();
            this.readable = new ReadableStream({
                async pull (s) {
                    const { done: o, value: a } = await i.next();
                    if (o) return s.close();
                    const c = (function() {
                        const { readable: f, writable: u } = new TransformStream;
                        if (a.getData) return d(), f;
                        async function d() {
                            try {
                                await a.getData(u);
                            } catch (h) {
                                try {
                                    await u.abort(h);
                                } catch  {}
                            }
                        }
                    })(), l = {
                        ...a,
                        readable: c
                    };
                    delete l.getData, s.enqueue(l);
                }
            }), this.writable = r;
        }
    }
    async function _u(t, e = {}) {
        if (t = new Ze(t), await at(t), (t.size === T || !t.readUint8Array) && (t = new $t(await Be(t.readable)), await at(t)), t.size < 22) return !1;
        const n = Fr(e, {}), r = n != Wt, i = Ho(e[Bi], n), { endOfDirectoryInfo: s, endOfDirectoryReachingEndCount: o } = await vo(t, r, i);
        if (!s || n == te && o > 1) return !1;
        const a = H(b(s), 20), c = s.offset + 22 + a;
        return t.size - c <= i;
    }
    class Tu {
        constructor(e, n){
            Object.assign(this, {
                reader: e,
                options: n
            });
        }
        async getData(e, n, r, i = {}) {
            const s = this, o = ze(), { reader: a, index: c, offset: l, diskNumberStart: f, extraFieldAES: u, extraFieldZip64: d, compressionMethod: h, bitFlag: A, rawBitFlag: _, crc32: E, rawLastModDate: p, uncompressedSize: R, compressedSize: w } = s, { dataDescriptor: S } = A, I = n.localDirectory = {}, g = n.warnings = [], N = se(a, f) + l, y = await W(a, N, 30), F = b(y);
            let D = q(s, i, Oi), Z = q(s, i, Fi);
            const x = q(s, i, Li);
            if (Vi(D, Z), D = D && D.length && D, Z = Z && Z.length && Z, u && u.originalCompressionMethod != 99) throw new Error(Ge);
            if (y.length < 30 || P(F, 0) != 67324752) throw new Error(fo);
            Uo(I, F, 4);
            const { extraFieldLength: Y, filenameLength: X } = I, k = I.dataOffset = N + 30 + X + Y, v = q(s, i, Fa), J = Fr(i, s.options), B = yu(v, J), O = Du(v, J);
            let L = z;
            if (O && (X || Y)) {
                const et = await W(a, N + 30, X + Y);
                L = et.subarray(0, X), I.rawExtraField = et.subarray(X);
            } else I.rawExtraField = Y ? await W(a, N + 30 + X, Y) : z;
            O && (I.rawFilename = L), xo(s, I, F, 4, !0) && St(g, yr), bu(s, I, L, O, B ? T : g);
            const { lastAccessDate: V, creationDate: ct, uid: lt, gid: gt } = I;
            V && (n.lastAccessDate = V), ct && (n.creationDate = ct), lt !== T && n.uid === T && (n.uid = lt), gt !== T && n.gid === T && (n.gid = gt);
            const wt = s.encrypted && I.encrypted && !x, Nt = wt && !u;
            if (x || (n.zipCrypto = Nt), wt && (I.rawBitFlag & 64) == 64) throw new Error($n);
            const dt = x ? T : _s(h);
            if (h != 0 && h != 8 && h != 9 && !dt && !x) throw new Error(Ge);
            if (wt) {
                if (!Nt && (u.strength < 1 || u.strength > 3)) throw new Error($n);
                if (!D && !Z) throw new Error(_o);
            }
            if (k + w > a.size) throw new Error(ho);
            const Ct = w, Xt = Qt(a.createReadable({
                offset: k,
                size: Ct
            })), tt = vi(q(s, i, bi));
            Xi(tt);
            const _t = q(s, i, Na);
            let ut = q(s, i, Da);
            const K = q(s, i, ya);
            K && (ut = !0);
            const { onstart: Q, onprogress: ft, onend: C } = i, m = h != 0 && !x, $ = x ? w : R, G = h == 9;
            let Rt = q(s, i, Pi);
            G && (Rt = !1);
            const it = q(s, i, ba), Pt = (it === T ? q(s, i, La) : it) && !x && (!wt || Nt || u && u.vendorVersion == Mo), ee = {
                options: {
                    codecType: Ns,
                    password: D,
                    rawPassword: Z,
                    zipCrypto: Nt,
                    encryptionStrength: u && u.strength,
                    checkCrc32: Pt,
                    checkAuthenticationCode: q(s, i, Ca),
                    passwordVerification: Nt && (S ? p >>> 8 & 255 : E >>> 24 & 255),
                    outputSize: $,
                    crc32: E,
                    compressed: m,
                    encrypted: wt,
                    useWebWorkers: q(s, i, Ci),
                    useCompressionStream: Rt,
                    transferStreams: q(s, i, Mi),
                    deflate64: G,
                    format: dt ? dt.format : T,
                    codecURI: dt ? dt.codecURI : T,
                    compressionMethod: h,
                    rawBitFlag: _,
                    checkPasswordOnly: _t
                },
                config: o,
                streamOptions: {
                    signal: tt,
                    size: Ct,
                    onstart: Q,
                    onprogress: ft,
                    onend: C
                }
            };
            ut && await Su({
                reader: a,
                fileEntry: n,
                index: c,
                offset: N,
                crc32: E,
                compressedSize: w,
                uncompressedSize: R,
                dataOffset: k,
                dataDescriptor: S || I.bitFlag.dataDescriptor,
                extraFieldZip64: d || I.extraFieldZip64,
                readRanges: r
            });
            let Dt, Mt;
            try {
                if (!K) {
                    _t && (e = new WritableStream), e = new Ms(e), await at(e, Nu($, w, m)), { writable: Dt } = e;
                    const { outputSize: et } = await Ls({
                        readable: Xt,
                        writable: Dt
                    }, ee);
                    if (e.size += et, et != $) throw new Error(yn);
                }
            } catch (et) {
                if (et.outputSize !== T && (e.size += et.outputSize), !_t || et.message != dr) throw Mt = et, et;
            } finally{
                if (!(!Us(e) && q(s, i, Ui)) && Dt && !Dt.locked) {
                    const Kt = Dt.getWriter();
                    if (Mt) try {
                        await Kt.abort(Mt);
                    } catch  {}
                    else await Kt.close();
                }
            }
            return _t || K ? T : e.getData ? e.getData() : Dt;
        }
    }
    function Ln(t) {
        const e = Math.min(t.byteLength, 1024) - 3;
        for(let n = 0; n < e; n++)if (P(t, n) == 134630224) return !0;
        return !1;
    }
    function ai(t, e, n) {
        let r = 0;
        for(; n + 46 <= e.length && P(t, n) == 33639248;)n += 46 + H(t, n + 28) + H(t, n + 30) + H(t, n + 32), r++;
        return r % 65536 ? 0 : r;
    }
    function bn(t) {
        if (t.length >= 6) {
            const e = b(t);
            if (P(e, 0) == 84233040) {
                const n = H(e, 4);
                if (6 + n <= t.length) return t.subarray(6, 6 + n);
            }
        }
    }
    function hu(t, e, n) {
        const r = t && t.compressedSize ? t.compressedSize : e;
        return r > 0 && r <= n ? r : n;
    }
    function Au(t) {
        const e = {
            rawExtensibleData: t
        };
        if (t.length >= 28) {
            const n = b(t), r = H(n, 26);
            Object.assign(e, {
                compressionMethod: H(n, 0),
                compressedSize: ht(n, 2),
                uncompressedSize: ht(n, 10),
                encryptionAlgorithm: H(n, 18),
                bitLength: H(n, 20),
                flags: H(n, 22),
                hashAlgorithm: H(n, 24),
                hashData: t.subarray(28, 28 + r)
            });
        }
        return e;
    }
    function Uo(t, e, n) {
        const r = t.rawBitFlag = H(e, n + 2), i = (r & 1) == 1, s = P(e, n + 6);
        Object.assign(t, {
            encrypted: i,
            version: H(e, n),
            bitFlag: {
                level: (r & 6) >> 1,
                dataDescriptor: (r & 8) == 8,
                languageEncodingFlag: (r & 2048) == 2048
            },
            rawLastModDate: s,
            lastModDate: Cu(s),
            filenameLength: H(e, n + 22),
            extraFieldLength: H(e, n + 24)
        });
    }
    function xo(t, e, n, r, i) {
        const { rawExtraField: s } = e, o = e.extraField = new Map, a = b(s);
        let c = 0, l = !1;
        try {
            for(; c < s.length;){
                const g = H(a, c), N = H(a, c + 2);
                o.set(g, {
                    type: g,
                    data: s.slice(c + 4, c + 4 + N)
                }), c += 4 + N;
            }
        } catch  {
            l = !0;
        }
        c > s.length && (l = !0);
        const f = H(n, r + 4);
        Object.assign(e, {
            signature: P(n, r + 10),
            crc32: P(n, r + 10),
            compressedSize: P(n, r + 14),
            uncompressedSize: P(n, r + 18)
        });
        const u = o.get(1);
        u && (pu(u, e), e.extraFieldZip64 = u);
        const d = o.get(28789);
        d && (ci(d, Bs, Gs, e, t), e.extraFieldUnicodePath = d);
        const h = o.get(25461);
        h && (ci(h, Rr, Hs, e, t), e.extraFieldUnicodeComment = h);
        const A = o.get(39169);
        A && A.data.length >= 7 ? (wu(A, e, f), e.extraFieldAES = A) : e.compressionMethod = f;
        const _ = o.get(13);
        _ && (li(_, e), e.extraFieldPkwareUnix = _);
        const E = o.get(22613);
        E && (li(E, e), e.extraFieldUnixType1 = E);
        const p = o.get(10);
        p && (Ru(p, e), e.extraFieldNTFS = p);
        const R = o.get(30805);
        let w;
        if (R && (w = ui(R, e, !1), e.extraFieldUnix = R), !w) {
            const g = o.get(30837);
            g && (ui(g, e, !0), e.extraFieldInfoZip = g);
        }
        const S = o.get(21589);
        S && (Iu(S, e, i), e.extraFieldExtendedTimestamp = S);
        const I = o.get(6534);
        return I && (e.extraFieldUSDZ = I), l;
    }
    function pu(t, e) {
        e.zip64 = !0;
        const n = b(t.data), r = lu.filter(([s, o])=>e[s] == o), i = r.reduce((s, [, o])=>s + si[o].bytes, 0);
        if (t.data.length < i) throw new Error(Eo);
        for(let s = 0, o = 0; s < r.length; s++){
            const [a, c] = r[s], l = si[c];
            e[a] = t[a] = l.getValue(n, o), o += l.bytes;
        }
    }
    function ci(t, e, n, r, i) {
        if (t.data.length < 5) {
            t.valid = !1;
            return;
        }
        const s = b(t.data), o = new Pe;
        o.append(i[n]);
        const a = b(new Uint8Array(4));
        a.setUint32(0, o.get(), !0);
        const c = P(s, 1), l = Zt(s, 0);
        Object.assign(t, {
            version: l,
            [e]: an(t.data.subarray(5)),
            valid: l == 1 && !i.bitFlag.languageEncodingFlag && c == P(a, 0)
        }), t.valid && (r[e] = t[e], r[e + cu] = !0);
    }
    function wu(t, e, n) {
        const r = b(t.data), i = Zt(r, 4);
        Object.assign(t, {
            vendorVersion: Zt(r, 0),
            vendorId: Zt(r, 2),
            strength: i,
            originalCompressionMethod: n,
            compressionMethod: H(r, 5)
        }), e.compressionMethod = t.compressionMethod, t.vendorVersion != Mo && (e.crc32 = T);
    }
    function Ru(t, e) {
        const n = b(t.data);
        let r = 4, i;
        try {
            for(; r < t.data.length && !i;){
                const s = H(n, r), o = H(n, r + 2);
                s == 1 && (i = t.data.slice(r + 4, r + 4 + o)), r += 4 + o;
            }
        } catch  {}
        if (i && i.length == 24) {
            const s = b(i), o = s.getBigUint64(0, !0), a = s.getBigUint64(8, !0), c = s.getBigUint64(16, !0);
            Object.assign(t, {
                rawLastModDate: o,
                rawLastAccessDate: a,
                rawCreationDate: c
            });
            const l = Cn(o), f = Cn(a), u = Cn(c), d = {
                lastModDate: l,
                lastAccessDate: f,
                creationDate: u
            };
            Object.assign(t, d), Object.assign(e, d, {
                rawLastAccessDate: a,
                rawCreationDate: c
            });
        }
    }
    function li(t, e) {
        if (t.data.length < 8) return;
        const n = b(t.data), r = new Date((P(n, 0) | 0) * 1e3), i = new Date((P(n, 4) | 0) * 1e3), s = {
            lastAccessDate: r,
            lastModDate: i
        };
        t.data.length >= 12 && (s.uid = H(n, 8), s.gid = H(n, 10)), Object.assign(t, s), Object.assign(e, s);
    }
    function ui(t, e, n) {
        try {
            const r = b(t.data);
            let i, s;
            if (n) {
                let o = 0;
                const a = Zt(r, o++), c = Zt(r, o++);
                i = fi(t.data.subarray(o, o + c)), o += c;
                const l = Zt(r, o++);
                s = fi(t.data.subarray(o, o + l)), Object.assign(t, {
                    version: a,
                    uid: i,
                    gid: s
                });
            } else t.data.length >= 4 && (i = H(r, 0), s = H(r, 2), Object.assign(t, {
                uid: i,
                gid: s
            }));
            return i !== T && (e.uid = i), s !== T && (e.gid = s), i !== T || s !== T;
        } catch  {}
    }
    function fi(t) {
        const e = new Uint8Array(4);
        return e.set(t, 0), new DataView(e.buffer, e.byteOffset, 4).getUint32(0, !0);
    }
    function Iu(t, e, n) {
        if (!t.data.length) return;
        const r = b(t.data), i = Zt(r, 0), s = [], o = [];
        n ? ((i & 1) == 1 && (s.push(Tn), o.push(hn)), (i & 2) == 2 && (s.push(Sr), o.push(zs)), (i & 4) == 4 && (s.push(mr), o.push(Ys))) : t.data.length >= 5 && (s.push(Tn), o.push(hn));
        let a = 1;
        s.forEach((c, l)=>{
            if (t.data.length >= a + 4) {
                const f = P(r, a);
                e[c] = t[c] = new Date((f | 0) * 1e3);
                const u = o[l];
                t[u] = f;
            }
            a += 4;
        });
    }
    async function Su({ reader: t, fileEntry: e, index: n, offset: r, crc32: i, compressedSize: s, uncompressedSize: o, dataOffset: a, dataDescriptor: c, extraFieldZip64: l, readRanges: f }) {
        let u = 0;
        if (c && (l ? u = 20 : u = 12), u) {
            const h = await W(t, a + s, u + 4), A = b(h);
            let _ = h.length == u + 4 && P(A, 0) == 134695760;
            if (_) {
                const E = Ei(A, 4, l);
                (e.encrypted && !e.zipCrypto || E.crc32 == i) && E.compressedSize == s && E.uncompressedSize == o ? u += 4 : _ = !1;
            }
            if (h.length >= u) {
                const E = Ei(A, _ ? 4 : 0, l);
                E.signature = _, e.localDirectory.dataDescriptor = E;
            }
        }
        const d = {
            start: r,
            end: a + s + u,
            fileEntry: e
        };
        for (const [h, A] of f)if (h != n && d.start < A.end && A.start < d.end) {
            const _ = new Error(To);
            throw _.overlappingEntry = A.fileEntry, _;
        }
        f.set(n, d);
    }
    function Ei(t, e, n) {
        const r = P(t, e);
        let i, s;
        return n ? (i = ht(t, e + 4), s = ht(t, e + 12)) : (i = P(t, e + 4), s = P(t, e + 8)), {
            crc32: r,
            compressedSize: i,
            uncompressedSize: s
        };
    }
    function se(t, e) {
        return t.getDiskOffset ? t.getDiskOffset(e) : 0;
    }
    async function mu(t) {
        return await Bo(t) == 134695760;
    }
    async function gu(t) {
        const e = await Bo(t);
        return e == 134695760 || e == 808471376;
    }
    async function Bo(t) {
        const e = await W(t, 0, 4);
        return P(b(e));
    }
    function Go(t) {
        return t === te || t === lr || t === Wt;
    }
    function Nu(t, e, n) {
        return Math.min(t, n ? e * Eu : e);
    }
    function Fr(t, e) {
        return di(t, di(e, lr));
    }
    function di(t, e) {
        const n = t[Wa];
        if (n !== T) {
            if (!Go(n)) throw new Error(Ro);
            return n;
        }
        const r = t[Oa];
        return r === T ? e : r ? te : e == Wt ? Wt : lr;
    }
    function yu(t, e) {
        return t === T ? e != Wt : !!t;
    }
    function Du(t, e) {
        return t === T ? e == te : !!t;
    }
    function Ou(t, e) {
        if (t === T) return e;
        if (!Go(t)) throw new Error(Io);
        return t;
    }
    function Fu(t, e) {
        if (e == Wt) return !1;
        const n = t.split("/");
        return n.length > 1 && n[n.length - 1] === "" && n.pop(), n.includes("..") || t.startsWith("/") || t.startsWith("\\\\") || au.test(t) ? !0 : e == te && (n.includes(".") || n.includes(""));
    }
    function Ho(t, e) {
        if (t !== T) {
            const n = mn(t);
            if (typeof n != pa || Number.isNaN(n) || n < 0) throw new Error(So);
            return n;
        }
        return e == te ? 0 : e == Wt ? 1 / 0 : 65535;
    }
    async function vo(t, e, n) {
        const { size: r } = t, i = Math.min(r, 65557), s = {
            count: fu
        };
        let o, a, c = 0;
        for await (const [l, f, u, d, h] of Xo(t, i)){
            const A = H(l, d + 20);
            if (h + 22 + A == r) {
                const _ = await Vo(t, l, f, d, h, r, s);
                if (_ == pn) {
                    if (o || (o = ir(u, d, h)), c++, !e || c > 1) break;
                } else _ == Dr && !a && (a = ir(u, d, h));
            }
        }
        return o || (o = a), o || (o = await Lu(t, n, s)), {
            endOfDirectoryInfo: o,
            endOfDirectoryReachingEndCount: c
        };
    }
    async function Lu(t, e, n) {
        const { size: r } = t, i = Math.min(r, e == 1 / 0 ? r : 65557 + e);
        let s, o;
        for await (const [a, c, l, f, u] of Xo(t, i)){
            const d = ir(l, f, u);
            s || (s = d);
            const h = await Vo(t, a, c, f, u, r, n);
            if (h == pn) return d;
            h == Dr && !o && (o = d);
        }
        return o || s;
    }
    async function* Xo(t, e) {
        const n = t.size - e, r = await W(t, n, e), i = b(r);
        for(let s = r.length - 22; s >= 0; s--)P(i, s) == 101010256 && (yield [
            i,
            n,
            r,
            s,
            n + s
        ]);
    }
    function ir(t, e, n) {
        return {
            offset: n,
            buffer: t.slice(e, e + 22).buffer
        };
    }
    async function Vo(t, e, n, r, i, s, o) {
        const a = H(e, r + 10), c = P(e, r + 12), l = P(e, r + 16);
        if (a == 65535 || c == 4294967295 || l == 4294967295) return await _i(t, e, n, i - 20, s, o) == 117853008 ? pn : oi;
        if (!a && !c) return Dr;
        const f = H(e, r + 6);
        for (const u of [
            i - c,
            se(t, f) + l
        ])if (await _i(t, e, n, u, s, o) == 33639248) return pn;
        return oi;
    }
    async function _i(t, e, n, r, i, s) {
        if (r < 0 || r + 4 > i) return T;
        if (r >= n) return P(e, r - n);
        if (s.count > 0) {
            s.count--;
            const o = await W(t, r, 4);
            return P(b(o), 0);
        }
        return T;
    }
    function bu(t, e, n, r, i) {
        const { rawFilename: s } = t, o = !i, a = t.decryptedDirectory && (e.rawBitFlag & 8192) == 8192;
        r && !a && (n.length != s.length || n.some((c, l)=>c != s[l])) && Ot(o, i, "mismatched local file header (filename)"), (e.rawBitFlag & ii) != (t.rawBitFlag & ii) && Ot(o, i, bo), e.compressionMethod != t.compressionMethod && Ot(o, i, Co), !e.bitFlag.dataDescriptor && !a && (e.crc32 || e.compressedSize || e.uncompressedSize) && (e.crc32 != t.crc32 || e.compressedSize != t.compressedSize || e.uncompressedSize != t.uncompressedSize) && Ot(o, i, Po);
    }
    function Ot(t, e, n) {
        t ? cn(n) : St(e, n);
    }
    function St(t, e, n) {
        if (!t.some((r)=>r.reason == e)) {
            const r = {
                reason: e
            };
            n !== T && (r.filename = n), t.push(r);
        }
    }
    function cn(t) {
        const e = new Error(Ao);
        throw e.reason = t, e;
    }
    function q(t, e, n) {
        return e[n] === T ? t.options[n] : e[n];
    }
    function Ti(t, e, n) {
        return ur(q(t, e, n));
    }
    function Cu(t) {
        const e = (t & 4294901760) >> 16, n = t & 65535, r = new Date(1980 + ((e & 65024) >> 9), ((e & 480) >> 5) - 1, e & 31, (n & 63488) >> 11, (n & 2016) >> 5, (n & 31) * 2, 0);
        return r < ln ? ln : r;
    }
    function Cn(t) {
        return new Date(Number(t / BigInt(1e4) - BigInt(116444736e5)));
    }
    function Zt(t, e) {
        return t.getUint8(e);
    }
    function H(t, e) {
        return t.getUint16(e, !0);
    }
    function P(t, e) {
        return t.getUint32(e, !0);
    }
    function ht(t, e) {
        const n = t.getBigUint64(e, !0);
        if (n > uu) throw new Error(mo);
        return Number(n);
    }
    var Pu = Object.freeze({
        __proto__: null,
        ERR_AMBIGUOUS_ARCHIVE: Ao,
        ERR_BAD_FORMAT: De,
        ERR_CENTRAL_DIRECTORY_NOT_FOUND: uo,
        ERR_ENCRYPTED: _o,
        ERR_ENCRYPTED_CENTRAL_DIRECTORY: po,
        ERR_ENTRY_DATA_OUT_OF_BOUNDS: ho,
        ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND: lo,
        ERR_EOCDR_NOT_FOUND: co,
        ERR_EXTRAFIELD_ZIP64_NOT_FOUND: Eo,
        ERR_INVALID_AUTHENTICATION_CODE: is,
        ERR_INVALID_COMPRESSED_DATA: hs,
        ERR_INVALID_CRC32: As,
        ERR_INVALID_FILENAME_VALIDATION: Io,
        ERR_INVALID_MAX_APPENDED_DATA_SIZE: So,
        ERR_INVALID_PASSWORD: Er,
        ERR_INVALID_STRICTNESS: Ro,
        ERR_INVALID_UNCOMPRESSED_SIZE: yn,
        ERR_LOCAL_FILE_HEADER_NOT_FOUND: fo,
        ERR_OVERLAPPING_ENTRY: To,
        ERR_SPLIT_ZIP_FILE: tr,
        ERR_UNSAFE_FILENAME: wo,
        ERR_UNSUPPORTED_COMPRESSION: Ge,
        ERR_UNSUPPORTED_ENCRYPTION: $n,
        ERR_UNSUPPORTED_UINT64: mo,
        ERR_WORKER_STARTUP_TIMEOUT: hr,
        WARNING_APPENDED_DATA: nr,
        WARNING_COMPRESSED_PATCHED_DATA: yo,
        WARNING_DUPLICATE_FILENAME: Lo,
        WARNING_MALFORMED_EXTRA_FIELD: yr,
        WARNING_MISMATCHED_LOCAL_FILE_HEADER_BIT_FLAG: bo,
        WARNING_MISMATCHED_LOCAL_FILE_HEADER_COMPRESSION_METHOD: Co,
        WARNING_MISMATCHED_LOCAL_FILE_HEADER_CRC32_OR_SIZES: Po,
        WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY: Oe,
        WARNING_PREPENDED_CENTRAL_DIRECTORY: Oo,
        WARNING_PREPENDED_DATA: rr,
        WARNING_TRAILING_CENTRAL_DIRECTORY_DATA: Fo,
        WARNING_UNKNOWN_VERSION: No,
        WARNING_UNKNOWN_ZIP64_EXTENSIBLE_DATA: Do,
        WARNING_UNSORTED_CENTRAL_DIRECTORY: go,
        WARNING_WRAPPED_ENTRIES_COUNT: er,
        ZipReader: Or,
        ZipReaderStream: du,
        isZipFile: _u
    });
    const zo = "File already exists", Yo = "Zip file comment exceeds 64KB", Mu = "Invalid zip file comment (must be a Uint8Array)", Uu = "File entry comment exceeds 64KB", xu = "Invalid file entry comment (must be a string)", Bu = "Invalid date (must be a valid Date instance)", Gu = "File entry name exceeds 64KB", Zo = "Version exceeds 65535", Hu = "The strength must equal 1, 2, or 3", vu = "Encryption is not supported in USDZ files", Xu = "Split zip files are not supported in USDZ files", Vu = "Encryption is not supported when the 'passThrough' option is set", zu = "Invalid extra field (must be a Map)", Yu = "Invalid extra field type (must be integer 0..65535)", Zu = "Invalid extra field data (must be a Uint8Array)", Lr = "Extra field data exceeds 64KB", ko = -2147483648, Wo = 2147483647, hi = BigInt(0), Ai = BigInt("0x7fffffffffffffff"), br = "Zip64 is not supported (set the 'zip64' option to 'true')", ku = "Undefined uncompressed size", Wu = "Undefined compression method", Ku = "Undefined reader", ju = "Invalid reader (must be a Reader instance, a ReadableStream instance, or an object with a 'readable' property)", qu = "Zip file not empty", Ju = "Invalid uid (must be integer 0..2^32-1)", Qu = "Invalid gid (must be integer 0..2^32-1)", $u = "Invalid UNIX mode (must be integer 0..65535)", tf = "Invalid unixExtraFieldType (must be 'infozip' or 'unix')", ef = "uid/gid must be 0..65535 for unixExtraFieldType 'unix' (use 'infozip' for larger ids)", nf = "Invalid msdosAttributesRaw (must be integer 0..255)", rf = "Invalid msdosAttributes (must be an object with boolean flags)", sf = "Invalid level (must be integer 0..9)", of = "Signature data exceeds 64KB", pi = new Uint8Array([
        7,
        0,
        2,
        0,
        65,
        69,
        3,
        0,
        0
    ]), af = 4, cf = 9, lf = 67, uf = 1, sr = "infozip", or = "unix", ff = 9;
    let Pn = 0;
    const wi = [];
    class Ef {
        constructor(e, n = {}){
            e = new Ms(e);
            const { availableSize: r = re, maxSize: i = re } = e, s = r > 0 && r !== re && i > 0 && i !== re;
            if (s && n[de]) throw new Error(Xu);
            Object.assign(this, {
                writer: e,
                addSplitZipSignature: s,
                options: n,
                fileEntries: new Map,
                filenames: new Set,
                offset: n[qe] === T ? e.size || e.writable.size || 0 : n[qe],
                initialOffset: n[qe] === T ? 0 : n[qe] - (e.size || e.writable.size || 0),
                pendingAddFileCalls: new Set,
                pendingErrors: [],
                bufferedWrites: 0,
                directWrites: 0,
                lastFileEntry: T
            });
        }
        prependZip(e) {
            return Mn(this, _f(this, e));
        }
        appendZip(e) {
            return Mn(this, this.appendZipEntries(e));
        }
        async appendZipEntries(e) {
            const n = this, { pendingAddFileCalls: r, filenames: i, fileEntries: s } = n;
            for(; r.size;)await Promise.allSettled(Array.from(r));
            let o;
            const a = new Promise((f)=>o = f);
            r.add(a);
            const c = [];
            let l;
            try {
                e = new Ze(e), await at(e), (e.size === T || !e.readUint8Array) && (e = new $t(await Be(e.readable)), await at(e));
                const { ZipReader: f } = await Promise.resolve().then(function() {
                    return Pu;
                }), u = new f(e), d = await u.getEntries();
                await u.close(), await at(n.writer);
                const { directoryOffset: h } = u;
                d.forEach(({ filename: E })=>{
                    if (i.has(E)) throw new Error(zo);
                    i.add(E), c.push(E);
                }), n.writerLocked = !0;
                const { lockWriter: A } = n;
                n.lockWriter = new Promise((E)=>l = ()=>{
                        n.writerLocked = !1, E();
                    }), await A, n.addSplitZipSignature && (delete n.addSplitZipSignature, await Pf(e) || (await bt(n.writer, jo()), n.offset += 4));
                const _ = await Mf(n, e, d, h);
                d.forEach((E)=>{
                    const { version: p, rawLastModDate: R, rawFilename: w, bitFlag: S, encrypted: I, uncompressedSize: g, compressedSize: N, extraFieldZip64: y } = E;
                    let { compressionMethod: F, rawExtraField: D } = E;
                    const { level: Z, languageEncodingFlag: x, dataDescriptor: Y } = S;
                    D = Ko(D || z), E.extraFieldAES && (F = 99);
                    const X = U(D), k = !!y && y.uncompressedSize !== T, v = !!y && y.compressedSize !== T, J = $o(Z, x, Y, I, F) & -7 | Z << 1, { headerArray: B, headerView: O } = Qo({
                        version: p,
                        bitFlag: J,
                        compressionMethod: F,
                        uncompressedSize: g,
                        compressedSize: N,
                        rawLastModDate: R,
                        rawFilename: w,
                        zip64CompressedSize: v,
                        zip64UncompressedSize: k,
                        extraFieldLength: X
                    }), { crc32: L } = E;
                    L !== T && nt(O, 10, L);
                    const { offset: V, diskNumberStart: ct } = _.get(E);
                    Object.assign(E, {
                        zip64Enabled: !0,
                        zip64UncompressedSize: k,
                        zip64CompressedSize: v,
                        offset: V,
                        diskNumberStart: ct,
                        zip64DiskNumberStart: !1,
                        rawExtraFieldZip64: z,
                        rawExtraFieldAES: z,
                        rawExtraFieldExtendedTimestamp: z,
                        rawExtraFieldNTFS: z,
                        rawExtraFieldUnix: z,
                        rawExtraField: D,
                        rawCentralExtraField: z,
                        extendedTimestamp: !1,
                        headerArray: B,
                        headerView: O
                    }), s.set(E.filename, E);
                });
            } catch (f) {
                throw c.forEach((u)=>i.delete(u)), f;
            } finally{
                o(), r.delete(a), l && l();
            }
        }
        add(e = "", n, r = {}) {
            const i = this, { pendingAddFileCalls: s } = i, o = Tf(i, e, n, r);
            s.add(o);
            const a = ()=>s.delete(o);
            return Promise.prototype.then.call(o, a, a), Mn(i, o);
        }
        remove(e) {
            const { filenames: n, fileEntries: r } = this;
            if (typeof e == Sn && (e = r.get(e)), e && e.filename !== T) {
                const { filename: i } = e;
                if (n.has(i) && r.has(i)) return n.delete(i), r.delete(i), !0;
            }
            return !1;
        }
        async close(e = z, n = {}) {
            const r = this, { pendingAddFileCalls: i, writer: s } = this, { writable: o } = s;
            if (!(e instanceof Uint8Array)) throw new Error(Mu);
            if (U(e) > 65535) throw new Error(Yo);
            for(; i.size;)await Promise.allSettled(Array.from(i));
            await Promise.allSettled(r.pendingErrors.map((l)=>l.recorded));
            const a = r.pendingErrors.filter((l)=>l.error && !l.observed);
            if (a.length) {
                const l = a.map((u)=>u.error);
                a.forEach((u)=>u.observed = !0);
                const [f] = l;
                try {
                    f.entryErrors = l;
                } catch  {}
                throw f;
            }
            return await Of(r, e, n), !Us(s) && M(r, n, Ui) || await o.getWriter().close(), s.getData ? s.getData() : o;
        }
    }
    class df extends Promise {
        then(e, n) {
            const { watcher: r } = this;
            return r && (r.observed = !0), super.then(e, n);
        }
    }
    function Mn(t, e) {
        const n = new df((i, s)=>Promise.prototype.then.call(e, i, s)), r = {};
        return n.watcher = r, r.recorded = Promise.prototype.then.call(n, T, (i)=>r.error = i), t.pendingErrors.push(r), n;
    }
    async function _f(t, e) {
        if (t.filenames.size) throw new Error(qu);
        await t.appendZipEntries(e);
    }
    async function Tf(t, e, n, r) {
        if (r = Object.assign({}, r), M(t, r, fe) && !e.endsWith("/") && (e += "/"), t.filenames.has(e)) throw new Error(zo);
        t.filenames.add(e), Pn < ze().maxWorkers ? Pn++ : await new Promise((i)=>wi.push(i));
        try {
            return await hf(t, e, n, r);
        } catch (i) {
            throw t.filenames.delete(e), i;
        } finally{
            const i = wi.shift();
            i ? i() : Pn--;
        }
    }
    async function hf(t, e, n, r) {
        const i = Af(t, e, r);
        ({ name: e } = i);
        const s = pf(t, e, r), { comment: o } = s, a = r[Nr];
        t.fileEntries.set(e, T);
        const c = t.lastFileEntry, l = {};
        let f;
        s.resolvedOptions.keepOrder && (l.lockFileEntry = new Promise((d)=>f = d)), t.lastFileEntry = l;
        let u;
        try {
            const { resolvedOptions: d } = s;
            d.level != 0 && d.compressionMethod === T && !d.passThrough && !await El(ze()) && (d.level = 0);
            const h = await wf(t, n, s, r);
            ({ reader: n } = h);
            const A = He(t.writer), _ = vt(t.writer);
            r = Object.assign({}, r, i.resolvedOptions, s.resolvedOptions, h.resolvedOptions, {
                signature: r[Qn],
                crc32: r.crc32 === T ? r[Qn] : r.crc32,
                offset: t.offset - A,
                diskNumberStart: _,
                [de]: t.options[de]
            });
            const E = mf(r), p = Nf(r), R = U(E.localHeaderArray, p.dataDescriptorArray);
            u = await If(t, e, n, {
                headerInfo: E,
                dataDescriptorInfo: p,
                metadataSize: R,
                fileEntry: l,
                previousFileEntry: c,
                releaseLockFileEntry: f
            }, r);
        } catch (d) {
            throw t.fileEntries.delete(e), d;
        } finally{
            f && f(c && c.lockFileEntry);
        }
        return Object.assign(u, {
            name: e,
            comment: o,
            extraField: a
        }), new An(u);
    }
    function Af(t, e, n) {
        let r = M(t, n, js), i = M(t, n, Qs, r ? 20 : 768);
        const s = M(t, n, to), o = oe(t, n, no), a = oe(t, n, ro);
        let c = oe(t, n, io), l = M(t, n, Ya), f = M(t, n, so), u = M(t, n, oo), d = M(t, n, ao);
        if (ye(o, 4294967295, Ju), ye(a, 4294967295, Qu), ye(c, 65535, $u), l !== T && l !== sr && l !== or) throw new Error(tf);
        if (l === or && (o !== T && o > 65535 || a !== T && a > 65535)) throw new Error(ef);
        l === T && (o !== T || a !== T) && (l = sr);
        let h = oe(t, n, Ws), A = M(t, n, Ks);
        const _ = o !== T || a !== T || c !== T || l || s, E = h !== T || A !== T;
        if (_ ? (r = !1, i = i & 255 | 768) : E && (r = !0, i = i & 255), ye(h, 255, nf), A && (typeof A !== Aa || Array.isArray(A))) throw new Error(rf);
        if (i > 65535) throw new Error(Zo);
        let p = M(t, n, ks);
        const R = p !== T;
        R || (p = 0), !n[fe] && e.endsWith("/") && (n[fe] = !0);
        const w = M(t, n, fe);
        if (w ? (e.endsWith("/") || (e += "/"), R || (p = 16, r || (p |= 16877 << 16))) : !r && !R && (s ? p = 493 << 16 : p = 420 << 16), !r) {
            const g = c !== T || !!(f || u || d), N = p >> 16 & 65535;
            c = c === T ? N : c & 65535, f ? c |= 2048 : f = !!(c & 2048), u ? c |= 1024 : u = !!(c & 1024), d ? c |= 512 : d = !!(c & 512), (!R || g) && (w ? c = c & -61441 | 16384 : c & 61440 || (c |= 32768), p = (c & 65535) << 16 | p & 65535);
        }
        ({ msdosAttributesRaw: h, msdosAttributes: A } = gf(h, A)), E && (p = p & 4294967295 | h & 255);
        const S = p >> 16 & 65535, I = c !== T && (c & 61440) == 40960;
        return {
            name: e,
            resolvedOptions: {
                versionMadeBy: i,
                msDosCompatible: !!r,
                externalFileAttributes: p,
                unixExternalUpper: S,
                uid: o,
                gid: a,
                unixMode: c,
                unixExtraFieldType: l,
                symlink: I,
                setuid: f,
                setgid: u,
                sticky: d,
                msdosAttributesRaw: h,
                msdosAttributes: A
            }
        };
    }
    function pf(t, e, n) {
        const r = ar(t, n, za) || en;
        let i = r(e, Gi);
        if (i === T && (i = en(e)), U(i) > 65535) throw new Error(Gu);
        const s = n[Rr] || "";
        if (typeof s != Sn) throw new Error(xu);
        let o = r(s, Hi);
        if (o === T && (o = en(s)), U(o) > 65535) throw new Error(Uu);
        const a = M(t, n, Js);
        if (a !== T && a > 65535) throw new Error(Zo);
        const c = Gn(t, n, Tn, new Date), l = M(t, n, hn), f = Gn(t, n, Sr), u = Gn(t, n, mr), d = M(t, n, Zs, 0), h = M(t, n, Li), A = M(t, n, Oi), _ = M(t, n, Fi);
        Vi(A, _);
        const E = oe(t, n, Pa, 3), p = M(t, n, $s), R = M(t, n, Ma, !0), w = M(t, n, Ua), S = M(t, n, xa, !0), I = M(t, n, Ci), g = M(t, n, Mi), N = M(t, n, Ga), y = ar(t, n, Ha), F = M(t, n, va, !0), D = vi(M(t, n, bi));
        Xi(D);
        const Z = M(t, n, Xa, !0), x = M(t, n, eo), Y = h || x === T ? T : _s(x);
        if (!h && x !== T && x !== 0 && x !== 8 && !Y) throw new Error(Ge);
        let X = oe(t, n, Ba);
        if (ye(X, ff, sf), t.options[de]) {
            if (A !== T || _ !== T) throw new Error(vu);
            X === T && x === T && (X = 0);
        }
        h && (X = T);
        let k = M(t, n, Pi), v = M(t, n, xi);
        N && v === T && (v = !1), (v === T || p && !h) && (v = !0), X !== T && X != 6 && (k = !1);
        const J = M(t, n, gr);
        if (!p && (A !== T || _ !== T) && !(Number.isInteger(E) && E >= 1 && E <= 3)) throw new Error(Hu);
        const B = Un(n[Nr]), O = Un(n[Za]), L = Un(n[ka]);
        return {
            comment: s,
            resolvedOptions: {
                rawFilename: i,
                rawComment: o,
                version: a,
                lastModDate: c,
                rawLastModDate: l,
                lastAccessDate: f,
                creationDate: u,
                internalFileAttributes: d,
                passThrough: h,
                password: A,
                rawPassword: _,
                encryptionStrength: E,
                zipCrypto: p,
                extendedTimestamp: R,
                ntfsTimestamp: w,
                keepOrder: S,
                useWebWorkers: I,
                transferStreams: g,
                bufferedWrite: N,
                createTempStream: y,
                dataDescriptorSignature: F,
                signal: D,
                useUnicodeFileNames: Z,
                compressionMethod: x,
                format: Y ? Y.format : T,
                codecURI: Y ? Y.codecURI : T,
                codecVersionNeeded: Y ? Y.versionNeeded : T,
                level: X,
                useCompressionStream: k,
                dataDescriptor: v,
                zip64: J,
                rawExtraField: B,
                rawLocalExtraField: O,
                rawCentralExtraField: L
            }
        };
    }
    function Un(t) {
        if (!t) return z;
        if (!(t instanceof Map)) throw new Error(zu);
        let e = 0, n = 0;
        t.forEach((s, o)=>{
            if (zi(o, 65535, Yu), !(s instanceof Uint8Array)) throw new Error(Zu);
            if (U(s) > 65535) throw new Error(Lr);
            e += 4 + U(s);
        });
        const r = new Uint8Array(e), i = b(r);
        return t.forEach((s, o)=>{
            Lt(i, n, o), Lt(i, n + 2, U(s)), Ve(r, s, n + 4), n += 4 + U(s);
        }), r;
    }
    async function wf(t, e, { resolvedOptions: n }, r) {
        if (n.passThrough && !e && !M(t, r, fe)) throw new Error(Ku);
        let i;
        if (e) {
            if (e = new Ze(e), await at(e), !e.readable && !e.readUint8Array) throw new Error(ju);
            ({ size: i } = e);
        }
        return Object.assign({
            reader: e
        }, Rf(t, !!e, i, n, r));
    }
    function Rf(t, e, n, r, i) {
        const { passThrough: s, zipCrypto: o, password: a, rawPassword: c, encryptionStrength: l } = r;
        let { dataDescriptor: f, zip64: u, level: d, compressionMethod: h } = r, A = 0, _ = 0, E = !1;
        if (s && e) {
            if (_ = i[Ir], _ === T) throw new Error(ku);
            if (h === T) throw new Error(Wu);
        }
        const p = u === !0, R = M(t, i, qs);
        if (e && s && !R && U(a, c)) throw new Error(Vu);
        const w = e && (!!(a && U(a) || c && U(c)) || s && R);
        e || (d = 0, h = 0);
        const S = w ? o ? 12 : 16 + l * 4 : 0;
        e && (s ? (i.uncompressedSize = _, A = n === T ? gi(_) + S : n) : n === T ? (f = !0, (u || u === T) && (u = E = !0, A = 4294967296)) : (i.uncompressedSize = _ = n, A = (cr(h, d) ? gi(_) : _) + S));
        const I = !w && (!e || n === 0 && !s) && !cr(h, d);
        I && !o && M(t, i, xi) === T && (f = !1);
        const g = p || E || _ >= 4294967295, N = p || A >= 4294967295;
        if (g || N) {
            if (u === !1) throw new Error(br);
            u = !0;
        }
        return u = u || !1, {
            maximumCompressedSize: A,
            resolvedOptions: {
                dataDescriptor: f,
                emptyEntry: I,
                zip64: u,
                zip64Enabled: p,
                unknownSize: E,
                zip64UncompressedSize: g,
                zip64CompressedSize: N,
                uncompressedSize: _,
                level: d,
                compressionMethod: h,
                encrypted: w
            }
        };
    }
    async function If(t, e, n, r, i) {
        const { fileEntries: s, writer: o } = t, { keepOrder: a, dataDescriptor: c, emptyEntry: l, signal: f } = i, { headerInfo: u, fileEntry: d, previousFileEntry: h, releaseLockFileEntry: A } = r, _ = t.options[de];
        let E = d, p, R, w, S, I, g, N = 0, y;
        const F = a && h ? h.lockFileEntry : T;
        s.set(e, E);
        try {
            i.bufferedWrite || !a || t.writerLocked || t.bufferedWrites || t.directWrites || !c && !l ? (p = !0, t.bufferedWrites++, i.createTempStream ? y = await i.createTempStream() : y = new TransformStream(T, T, {
                highWaterMark: re
            }), y.size = 0, await at(o)) : (R = !0, t.directWrites++, y = o, await F, await D()), await at(y);
            const x = He(o);
            t.addSplitZipSignature && !p && await Si(t, o), _ && !p && Ri(r, t.offset - x);
            const { localHeaderArray: Y } = u;
            p || await Z();
            const X = vt(o), k = ve(t, o);
            if (E.diskNumberStart = X, p || (I = !0, g = o.size, await bt(y, Y)), E = await Sf(n, y, E, r, ze(), i), p || (I = !1), s.set(e, E), E.filename = e, p) {
                if (await Promise.all([
                    y.writable.getWriter().close(),
                    F
                ]), await D(), t.addSplitZipSignature && await Si(t, o), S = !0, g = o.size, await Z(), E.diskNumberStart = vt(o), E.offset = ve(t, o), _) {
                    const v = r.metadataSize;
                    Ri(r, t.offset - He(o)), E.size += r.metadataSize - v;
                }
                Df(E, u.localHeaderView, i), await bt(o, u.localHeaderArray), await qo(y.readable, o, f, (v)=>N += v), o.size += y.size, S = !1;
            } else E.diskNumberStart = X, E.offset = k;
            return t.offset += E.size, E;
        } catch (x) {
            if (S || I) {
                if (t.hasCorruptedEntries = !0, x) try {
                    x.corruptedEntry = !0;
                } catch  {}
                t.offset += o.size - g, p && (t.offset += N);
            }
            throw s.delete(e), x;
        } finally{
            if (p && t.bufferedWrites--, R && t.directWrites--, A && A(F), w && w(), p && y && y.dispose) try {
                await y.dispose();
            } catch  {}
        }
        async function D() {
            t.writerLocked = !0;
            const { lockWriter: x } = t;
            t.lockWriter = new Promise((Y)=>w = ()=>{
                    t.writerLocked = !1, Y();
                }), await x;
        }
        async function Z() {
            _e(o, U(u.localHeaderArray)) && await o.closeDisk();
        }
    }
    async function Sf(t, e, { diskNumberStart: n, lockFileEntry: r }, i, s, o) {
        const { headerInfo: a, dataDescriptorInfo: c, metadataSize: l } = i, { headerArray: f, headerView: u, lastModDate: d, rawLastModDate: h, encrypted: A, compressed: _, version: E, compressionMethod: p, rawExtraFieldZip64: R, localExtraFieldZip64Length: w, rawExtraFieldExtendedTimestamp: S, extraFieldExtendedTimestampFlag: I, rawExtraFieldNTFS: g, rawExtraFieldUnix: N, rawExtraFieldAES: y } = a, { dataDescriptorArray: F } = c, { rawFilename: D, lastAccessDate: Z, creationDate: x, password: Y, rawPassword: X, level: k, zip64: v, zip64Enabled: J, zip64UncompressedSize: B, zip64CompressedSize: O, zipCrypto: L, dataDescriptor: V, directory: ct, executable: lt, versionMadeBy: gt, rawComment: wt, rawExtraField: Nt, rawCentralExtraField: dt, useWebWorkers: Ct, transferStreams: Xt, onstart: tt, onprogress: _t, onend: ut, signal: K, encryptionStrength: Q, extendedTimestamp: ft, msDosCompatible: C, internalFileAttributes: m, externalFileAttributes: $, uid: G, gid: Rt, unixMode: it, symlink: Pt, setuid: ee, setgid: Dt, sticky: Mt, unixExternalUpper: et, msdosAttributesRaw: Kt, msdosAttributes: Ae, useCompressionStream: ke, passThrough: Ut, format: We, codecURI: Vt } = o, pe = {
            lockFileEntry: r,
            versionMadeBy: gt,
            zip64: v,
            zip64Enabled: J,
            directory: !!ct,
            executable: !!lt,
            filenameUTF8: !0,
            rawFilename: D,
            commentUTF8: !0,
            rawComment: wt,
            rawExtraFieldZip64: R,
            localExtraFieldZip64Length: w,
            rawExtraFieldExtendedTimestamp: S,
            rawExtraFieldNTFS: g,
            rawExtraFieldUnix: N,
            rawExtraFieldAES: y,
            rawExtraField: Nt,
            rawCentralExtraField: dt,
            extendedTimestamp: ft,
            msDosCompatible: C,
            internalFileAttributes: m,
            externalFileAttributes: $,
            diskNumberStart: n,
            uid: G,
            gid: Rt,
            unixMode: it,
            symlink: !!Pt,
            setuid: ee,
            setgid: Dt,
            sticky: Mt,
            unixExternalUpper: et,
            msdosAttributesRaw: Kt,
            msdosAttributes: Ae
        };
        let { crc32: ne, uncompressedSize: zt } = o, xt = 0;
        Ut || (zt = 0);
        const { writable: Ke } = e;
        if (t) {
            const st = t.size, we = Qt(xs(t, {
                size: st
            })), Re = {
                options: {
                    codecType: Tr,
                    inputSize: st,
                    level: k,
                    rawPassword: X,
                    password: Y,
                    encryptionStrength: Q,
                    zipCrypto: A && L,
                    passwordVerification: A && L && h >> 8 & 255,
                    computeCrc32: !Ut,
                    compressed: _ && !Ut,
                    encrypted: A && !Ut,
                    useWebWorkers: Ct,
                    useCompressionStream: ke,
                    transferStreams: Xt,
                    format: We,
                    codecURI: Vt,
                    compressionMethod: p
                },
                config: s,
                streamOptions: {
                    signal: K,
                    size: st,
                    onstart: tt,
                    onprogress: _t,
                    onend: ut
                }
            };
            try {
                const Et = await Ls({
                    readable: we,
                    writable: Ke
                }, Re);
                if (xt = Et.outputSize, e.size += xt, Ut || (zt = Et.inputSize, (!A || L) && (ne = Et.crc32)), !O && xt >= 4294967295 || !B && zt >= 4294967295) throw new Error(br);
            } catch (Et) {
                throw Et.outputSize !== T && (e.size += Et.outputSize), Et;
            }
        }
        return yf({
            crc32: ne,
            compressedSize: xt,
            uncompressedSize: zt,
            headerInfo: a,
            dataDescriptorInfo: c
        }, o), V && await bt(e, F), Object.assign(pe, {
            uncompressedSize: zt,
            compressedSize: xt,
            lastModDate: d,
            rawLastModDate: h,
            creationDate: x,
            lastAccessDate: Z,
            encrypted: !!A,
            zipCrypto: !!L,
            size: l + xt,
            compressionMethod: p,
            version: E,
            headerArray: f,
            headerView: u,
            signature: ne,
            crc32: A && !L && !Ut ? T : ne,
            extraFieldExtendedTimestampFlag: I,
            zip64UncompressedSize: B,
            zip64CompressedSize: O
        }), pe;
    }
    function mf(t) {
        const { rawFilename: e, lastModDate: n, rawLastModDate: r, lastAccessDate: i, creationDate: s, level: o, zip64: a, zipCrypto: c, useUnicodeFileNames: l, dataDescriptor: f, directory: u, rawExtraField: d, rawLocalExtraField: h, encryptionStrength: A, extendedTimestamp: _, ntfsTimestamp: E, passThrough: p, encrypted: R, zip64UncompressedSize: w, zip64CompressedSize: S, uncompressedSize: I, unknownSize: g, crc32: N } = t;
        let { version: y, compressionMethod: F } = t;
        const D = !u && cr(F, o);
        let Z;
        const x = p || !D, Y = a && (t.bufferedWrite || !f || !w && !S || x && !g), X = Y || a && f && (w || S);
        if (a && (w || S)) {
            const Q = At(20);
            if (Q.writeUint16(1), Q.writeUint16(16), Z = Q.array, Y && (Q.writeUint64(I), x)) {
                const ft = R ? c ? 12 : 16 + A * 4 : 0;
                Q.writeUint64(p ? 0 : I + ft);
            }
        } else Z = z;
        let k;
        if (R && !c) {
            const K = At(U(pi) + 2);
            K.writeUint16(39169), K.writeBytes(pi), k = K.array, k[8] = A;
        } else k = z;
        let v, J, B;
        if (_) {
            const K = Fe(n), Q = Jo(K);
            if (Q) {
                const C = 9 + (i ? 4 : 0) + (s ? 4 : 0), m = At(C);
                B = 1 + (i ? 2 : 0) + (s ? 4 : 0), m.writeUint16(21589), m.writeUint16(C - 4), m.writeUint8(B), m.writeUint32(K), i && m.writeUint32(mi(Fe(i))), s && m.writeUint32(mi(Fe(s))), J = m.array;
            } else J = z;
            if (E === T ? !Q || !!(i || s) : E) try {
                const C = Bn(n), m = At(36);
                m.writeUint16(10), m.writeUint16(32), m.skip(4), m.writeUint16(1), m.writeUint16(24), m.writeUint64(C), m.writeUint64(i ? Bn(i) : C), m.writeUint64(s ? Bn(s) : C), v = m.array;
            } catch  {
                v = z;
            }
            else v = z;
        } else v = J = z;
        let O;
        try {
            const { uid: K, gid: Q, unixExtraFieldType: ft } = t;
            if (ft == sr && (K !== T || Q !== T)) {
                const C = Ii(K === T ? 0 : K), m = Ii(Q === T ? 0 : Q), $ = 3 + C.length + m.length, G = At(4 + $);
                G.writeUint16(30837), G.writeUint16($), G.writeUint8(1), G.writeUint8(C.length), G.writeBytes(C), G.writeUint8(m.length), G.writeBytes(m), O = G.array;
            } else if (ft == or && (K !== T || Q !== T)) {
                const C = At(8);
                C.writeUint16(30805), C.writeUint16(4), C.writeUint16((K === T ? 0 : K) & 65535), C.writeUint16((Q === T ? 0 : Q) & 65535), O = C.array;
            } else O = z;
        } catch  {
            O = z;
        }
        F === T && (F = D ? 8 : 0), y === T && (y = F == 0 && !u && !R ? 10 : 20);
        const { codecVersionNeeded: L } = t;
        D && L !== T && (y = y > L ? y : L), a && (y = y > 45 ? y : 45), R && !c && (y = y > 51 ? y : 51, p && N !== T && (k[af] = uf), Lt(b(k), cf, F), F = 99);
        const V = X ? U(Z) : 0, ct = V + U(k, J, v, O, d, h), lt = t[de] ? lf : 0;
        if (ct + lt > 65535) throw new Error(Lr);
        const gt = new Date(Math.ceil(Math.floor(n.getTime() / 1e3) / 2) * 2e3), wt = gt < ln ? ln : gt > Br ? Br : gt, Nt = U(J) ? new Date(Fe(n) * 1e3) : U(v) ? n : wt, { headerArray: dt, headerView: Ct, rawLastModDate: Xt } = Qo({
            version: y,
            bitFlag: $o(o, l, f, R, F),
            compressionMethod: F,
            uncompressedSize: I,
            lastModDate: wt,
            rawLastModDate: r,
            rawFilename: e,
            zip64CompressedSize: S,
            zip64UncompressedSize: w,
            extraFieldLength: ct
        }), tt = At(30 + U(e) + ct), _t = tt.array, ut = b(_t);
        return tt.writeUint32(67324752), tt.writeBytes(dt), tt.writeBytes(e), X && tt.writeBytes(Z), tt.writeBytes(k), tt.writeBytes(J), tt.writeBytes(v), tt.writeBytes(O), tt.writeBytes(d), tt.writeBytes(h), f && (S || nt(ut, 18, 0), w || nt(ut, 22, 0)), {
            localHeaderArray: _t,
            localHeaderView: ut,
            headerArray: dt,
            headerView: Ct,
            lastModDate: Nt,
            rawLastModDate: Xt,
            encrypted: R,
            compressed: D,
            version: y,
            compressionMethod: F,
            extraFieldExtendedTimestampFlag: B,
            rawExtraFieldZip64: z,
            localExtraFieldZip64Length: V,
            rawExtraFieldExtendedTimestamp: J,
            rawExtraFieldNTFS: v,
            rawExtraFieldUnix: O,
            rawExtraFieldAES: k,
            extraFieldLength: ct
        };
    }
    function Ri(t, e) {
        const { headerInfo: n } = t;
        let { localHeaderArray: r, extraFieldLength: i } = n, s = 64 - (e + U(r)) % 64;
        s < 4 && (s += 64);
        const o = new Uint8Array(s), a = b(o);
        Lt(a, 0, 6534), Lt(a, 2, s - 4);
        const c = r;
        n.localHeaderArray = r = new Uint8Array(U(c) + s), Ve(r, c), Ve(r, o, U(c));
        const l = b(r);
        Lt(l, 28, i + s), n.localHeaderView = l, t.metadataSize += s;
    }
    function Ii(t) {
        const e = new Uint8Array(4);
        b(e).setUint32(0, t, !0);
        let r = 4;
        for(; r > 1 && e[r - 1] === 0;)r--;
        return e.subarray(0, r);
    }
    function gf(t, e) {
        if (t !== T) t = t & 255;
        else if (e !== T) {
            const { readOnly: n, hidden: r, system: i, directory: s, archive: o } = e;
            let a = 0;
            n && (a |= 1), r && (a |= 2), i && (a |= 4), s && (a |= 16), o && (a |= 32), t = a & 255;
        }
        return e === T && (e = {
            readOnly: !!(t & 1),
            hidden: !!(t & 2),
            system: !!(t & 4),
            directory: !!(t & 16),
            archive: !!(t & 32)
        }), {
            msdosAttributesRaw: t,
            msdosAttributes: e
        };
    }
    function Nf({ zip64: t, dataDescriptor: e, dataDescriptorSignature: n }) {
        let r = z, i, s = 0, o = t ? 20 : 12;
        return n && (o += 4), e && (r = new Uint8Array(o), i = b(r), n && (s = 4, nt(i, 0, 134695760))), {
            dataDescriptorArray: r,
            dataDescriptorView: i,
            dataDescriptorOffset: s
        };
    }
    function yf({ crc32: t, compressedSize: e, uncompressedSize: n, headerInfo: r, dataDescriptorInfo: i }, { zip64: s, zipCrypto: o, passThrough: a, dataDescriptor: c }) {
        const { headerView: l, encrypted: f } = r, { dataDescriptorView: u, dataDescriptorOffset: d } = i;
        (!f || o || a) && t !== T && (nt(l, 10, t), c && nt(u, d, t)), s ? c && (Xe(u, d + 4, BigInt(e)), Xe(u, d + 12, BigInt(n))) : (nt(l, 14, e), nt(l, 18, n), c && (nt(u, d + 4, e), nt(u, d + 8, n)));
    }
    function Df({ rawFilename: t, encrypted: e, zip64: n, localExtraFieldZip64Length: r, crc32: i, compressedSize: s, uncompressedSize: o, zip64UncompressedSize: a, zip64CompressedSize: c }, l, { dataDescriptor: f, passThrough: u }) {
        if (f || ((!e || u && i !== T) && nt(l, 14, i), c || nt(l, 18, s), a || nt(l, 22, o)), n && r) {
            const d = 30 + U(t) + 4;
            Xe(l, d, BigInt(o)), Xe(l, d + 8, BigInt(s));
        }
    }
    async function Of(t, e, n) {
        const { directoryDataLength: r, zip64Entries: i } = Ff(t.fileEntries), { directoryStart: s, directoryEnd: o, directoryArray: a } = await Lf(t, r, n), c = await bf(t, a, n);
        await Cf(t, e, n, {
            directoryStart: s,
            directoryEnd: o,
            directoryDataLength: r,
            signatureLength: c,
            zip64Entries: i
        });
    }
    function Ff(t) {
        let e = 0, n = !1;
        for (const [, r] of t){
            const { rawFilename: i, rawExtraFieldAES: s, rawComment: o, rawExtraFieldNTFS: a, rawExtraFieldUnix: c, rawExtraField: l, rawCentralExtraField: f, extendedTimestamp: u, extraFieldExtendedTimestampFlag: d, lastModDate: h, zip64Enabled: A, uncompressedSize: _, compressedSize: E } = r;
            let { zip64UncompressedSize: p, zip64CompressedSize: R } = r;
            A || (p && _ < 4294967295 && (p = r.zip64UncompressedSize = !1), R && E < 4294967295 && (R = r.zip64CompressedSize = !1)), n = n || p || R;
            const w = r.offset >= 4294967295, S = r.diskNumberStart >= 65535;
            let I;
            if (w || S || p || R) {
                const F = 4 + (p ? 8 : 0) + (R ? 8 : 0) + (w ? 8 : 0) + (S ? 4 : 0), D = At(F);
                D.writeUint16(1), D.writeUint16(F - 4), p && D.writeUint64(_), R && D.writeUint64(E), w && D.writeUint64(r.offset), S && D.writeUint32(r.diskNumberStart), I = D.array;
            } else I = z;
            r.rawExtraFieldZip64 = I, r.zip64Offset = w, r.zip64DiskNumberStart = S;
            let g;
            const N = Fe(h);
            if (u && Jo(N)) {
                const F = At(9);
                F.writeUint16(21589), F.writeUint16(5), F.writeUint8(d), F.writeUint32(N), g = F.array;
            } else g = z;
            r.rawExtraFieldExtendedTimestamp = g;
            const y = U(I, s, a, c, g, l, f);
            if (y > 65535) throw new Error(Lr);
            e += 46 + U(i, o) + y;
        }
        return {
            directoryDataLength: e,
            zip64Entries: n
        };
    }
    async function Lf(t, e, n) {
        const { fileEntries: r, writer: i } = t, s = new Uint8Array(e);
        await at(i);
        let o = 0, a = 0, c = vt(i), l = He(i), f = 0;
        for (const [u, d] of Array.from(r.values()).entries()){
            const { offset: h, rawFilename: A, rawExtraFieldZip64: _, rawExtraFieldAES: E, rawExtraFieldExtendedTimestamp: p, rawExtraFieldNTFS: R, rawExtraFieldUnix: w, rawExtraField: S, rawCentralExtraField: I, rawComment: g, versionMadeBy: N, headerArray: y, headerView: F, zip64UncompressedSize: D, zip64CompressedSize: Z, zip64DiskNumberStart: x, zip64Offset: Y, internalFileAttributes: X, externalFileAttributes: k, diskNumberStart: v, uncompressedSize: J, compressedSize: B } = d, O = U(_, E, p, R, w, S, I), L = 46 + U(A, g) + O;
            _e(i, o + L - a) && (await bt(i, s.slice(a, o)), a = o, f = 0, await i.closeDisk()), u == 0 && (c = vt(i), l = He(i)), D || nt(F, 18, J), Z || nt(F, 14, B), (Y || x) && d.version < 45 && Lt(F, 0, 45);
            const V = At(L);
            if (V.writeUint32(33639248), V.writeUint16(N), V.writeBytes(y.subarray(0, 24)), V.writeUint16(O), V.writeUint16(U(g)), V.writeUint16(x ? 65535 : v), V.writeUint16(X), V.writeUint32(k), V.writeUint32(Y ? 4294967295 : h), V.writeBytes(A), V.writeBytes(_), V.writeBytes(E), V.writeBytes(p), V.writeBytes(R), V.writeBytes(w), V.writeBytes(S), V.writeBytes(I), V.writeBytes(g), Ve(s, V.array, o), o += L, f++, n.onprogress) try {
                await n.onprogress(u + 1, r.size, new An(d));
            } catch  {}
        }
        return await bt(i, a ? s.slice(a) : s), {
            directoryStart: {
                diskNumber: c,
                diskOffset: l
            },
            directoryEnd: {
                diskNumber: vt(i),
                entriesLength: f
            },
            directoryArray: s
        };
    }
    async function bf(t, e, n) {
        const r = ar(t, n, Ja);
        if (r) {
            const i = await r(e), s = U(i);
            if (s > 65535) throw new Error(of);
            const o = At(6 + s);
            o.writeUint32(84233040), o.writeUint16(s), o.writeBytes(i);
            const { writer: a } = t;
            return _e(a, U(o.array)) && await a.closeDisk(), await bt(a, o.array), 6 + s;
        }
        return 0;
    }
    async function Cf(t, e, n, r) {
        const { writer: i } = t, { directoryStart: s, directoryEnd: o, signatureLength: a, zip64Entries: c } = r;
        let { directoryDataLength: l } = r, f = t.fileEntries.size, u = s.diskNumber, d = ve(t, s);
        const h = U(e);
        if (h > 65535) throw new Error(Yo);
        let A = M(t, n, gr), _ = vt(i);
        if (_e(i, (A ? 98 : 22) + h) && _++, d >= 4294967295 || l >= 4294967295 || f >= 65535 || _ >= 65535) {
            if (A === !1) throw new Error(br);
            A = !0;
        } else A === T && c && (A = !0);
        const E = At(A ? 98 : 22);
        _e(i, U(E.array) + h) && await i.closeDisk(), _ = vt(i);
        let p = _ == o.diskNumber ? o.entriesLength : 0;
        A && (E.writeUint32(101075792), E.writeUint64(44), E.writeUint16(45), E.writeUint16(45), E.writeUint32(_), E.writeUint32(u), E.writeUint64(p), E.writeUint64(f), E.writeUint64(l), E.writeUint64(d), E.writeUint32(117853008), E.writeUint32(_), E.writeUint64(BigInt(ve(t, i)) + BigInt(l) + BigInt(a)), E.writeUint32(_ + 1), M(t, n, Va, !0) && (_ = 65535, u = 65535), p = 65535, f = 65535, d = 4294967295, l = 4294967295), E.writeUint32(101010256), E.writeUint16(_), E.writeUint16(u), E.writeUint16(p), E.writeUint16(f), E.writeUint32(l), E.writeUint32(d), E.writeUint16(h), await bt(i, E.array), h && await bt(i, e);
    }
    function At(t) {
        const e = new Uint8Array(t), n = b(e);
        let r = 0;
        return {
            array: e,
            writeUint8: (i)=>{
                Bf(n, r, i), r += 1;
            },
            writeUint16: (i)=>{
                Lt(n, r, i), r += 2;
            },
            writeUint32: (i)=>{
                nt(n, r, i), r += 4;
            },
            writeUint64: (i)=>{
                Xe(n, r, BigInt(i)), r += 8;
            },
            writeBytes: (i)=>{
                Ve(e, i, r), r += U(i);
            },
            skip: (i)=>r += i
        };
    }
    function vt(t) {
        const { diskNumber: e = 0 } = t;
        return e;
    }
    function He(t) {
        const { diskOffset: e = 0 } = t;
        return e;
    }
    function _e(t, e) {
        const { availableSize: n = re } = t;
        return e > n;
    }
    function ve(t, { diskNumber: e = 0, diskOffset: n = 0 }) {
        return t.offset - n - (e ? t.initialOffset : 0);
    }
    async function Pf(t) {
        const e = await W(t, 0, 4);
        return xf(b(e), 0) == 134695760;
    }
    function Ko(t) {
        const e = b(t);
        let n = 0;
        for(; n + 4 <= U(t);){
            const r = 4 + wn(e, n + 2);
            if (wn(e, n) == 1) return Ko(Yt(t.subarray(0, n), t.subarray(Math.min(n + r, U(t)))));
            n += r;
        }
        return t;
    }
    async function Mf(t, e, n, r) {
        const { writer: i } = t, s = new Map;
        if (i.closeDisk) {
            const o = Array.from(n).sort((c, l)=>Qe(e, c) - Qe(e, l));
            let a = 0;
            for (const c of o){
                const l = Qe(e, c);
                await xn(t, e, a, l - a), _e(i, await Uf(e, l)) && await i.closeDisk(), s.set(c, {
                    offset: ve(t, i),
                    diskNumberStart: vt(i)
                }), a = l;
            }
            await xn(t, e, a, r - a);
        } else {
            const o = t.offset;
            await xn(t, e, 0, r), n.forEach((a)=>s.set(a, {
                    offset: o + Qe(e, a),
                    diskNumberStart: 0
                }));
        }
        return s;
    }
    async function xn(t, e, n, r) {
        if (r > 0) {
            const { writer: i } = t;
            let s = 0;
            try {
                await qo(xs(e, {
                    offset: n,
                    size: r
                }), i, T, (o)=>s += o);
            } catch (o) {
                t.hasCorruptedEntries = !0;
                try {
                    o.corruptedEntry = !0;
                } catch  {}
                throw o;
            } finally{
                i.size += s, t.offset += s;
            }
        }
    }
    async function Uf(t, e) {
        const n = await W(t, e, 30);
        if (U(n) < 30) return 30;
        const r = b(n);
        return 30 + wn(r, 26) + wn(r, 28);
    }
    function Qe(t, { offset: e, diskNumberStart: n }) {
        return e + (t.getDiskOffset ? t.getDiskOffset(n) : 0);
    }
    function jo() {
        const t = new Uint8Array(4);
        return nt(b(t), 0, 134695760), t;
    }
    async function Si(t, e) {
        delete t.addSplitZipSignature, await bt(e, jo()), t.offset += 4;
    }
    async function bt(t, e) {
        const { writable: n } = t, r = n.getWriter();
        try {
            await r.ready, t.size += U(e), await r.write(e);
        } finally{
            r.releaseLock();
        }
    }
    async function qo(t, e, n, r) {
        const i = e.writable.getWriter();
        try {
            await t.pipeTo(new WritableStream({
                async write (s) {
                    await i.ready, await i.write(s), r(U(s));
                }
            }), {
                preventClose: !0,
                preventAbort: !0,
                signal: n
            });
        } finally{
            i.releaseLock();
        }
    }
    function Bn(t) {
        if (t) {
            const e = (BigInt(t.getTime()) + BigInt(116444736e5)) * BigInt(1e4);
            return e < hi ? hi : e > Ai ? Ai : e;
        }
    }
    function Fe(t) {
        return Math.floor(t.getTime() / 1e3);
    }
    function Jo(t) {
        return t >= ko && t <= Wo;
    }
    function mi(t) {
        return Math.min(Wo, Math.max(ko, t));
    }
    function M(t, e, n, r) {
        const i = e[n] === T ? t.options[n] : e[n];
        return i === T ? r : i;
    }
    function Gn(t, e, n, r) {
        const i = M(t, e, n, r);
        if (i === null) return r;
        if (i !== T && (typeof i.getTime != rt || Number.isNaN(i.getTime()))) throw new Error(Bu);
        return i;
    }
    function ar(t, e, n) {
        return ur(M(t, e, n));
    }
    function oe(t, e, n, r) {
        return mn(M(t, e, n, r));
    }
    function gi(t) {
        return t + 5 * (Math.floor(t / 16383) + 1);
    }
    function cr(t, e) {
        return t === T ? e === T || e > 0 : t !== 0;
    }
    function wn(t, e) {
        return t.getUint16(e, !0);
    }
    function xf(t, e) {
        return t.getUint32(e, !0);
    }
    function Bf(t, e, n) {
        t.setUint8(e, n);
    }
    function Lt(t, e, n) {
        t.setUint16(e, n, !0);
    }
    function nt(t, e, n) {
        t.setUint32(e, n, !0);
    }
    function Xe(t, e, n) {
        t.setBigUint64(e, n, !0);
    }
    function Ve(t, e, n) {
        t.set(e, n);
    }
    function U(...t) {
        let e = 0;
        return t.forEach((n)=>n && (e += n.length)), e;
    }
    function Qo({ version: t, bitFlag: e, compressionMethod: n, uncompressedSize: r, compressedSize: i, lastModDate: s, rawLastModDate: o, rawFilename: a, zip64CompressedSize: c, zip64UncompressedSize: l, extraFieldLength: f }) {
        const u = At(26), d = u.array, h = b(d);
        if (u.writeUint16(t), u.writeUint16(e), u.writeUint16(n), o === T) {
            const A = new Uint32Array(1), _ = b(A);
            Lt(_, 0, (s.getHours() << 6 | s.getMinutes()) << 5 | s.getSeconds() / 2), Lt(_, 2, (s.getFullYear() - 1980 << 4 | s.getMonth() + 1) << 5 | s.getDate()), o = A[0];
        }
        return u.writeUint32(o), u.skip(4), c || i !== T ? u.writeUint32(c ? 4294967295 : i) : u.skip(4), l || r !== T ? u.writeUint32(l ? 4294967295 : r) : u.skip(4), u.writeUint16(U(a)), u.writeUint16(f), {
            headerArray: d,
            headerView: h,
            rawLastModDate: o
        };
    }
    function $o(t, e, n, r, i) {
        let s = 0;
        return e && (s = s | 2048), n && (s = s | 8), (i == 8 || i == 9) && (t >= 0 && t <= 3 && (s = s | 6), t > 3 && t <= 5 && (s = s | 4), t == 9 && (s = s | 2)), r && (s = s | 1), s;
    }
    try {
        gn({
            baseURI: import.meta.url
        });
    } catch  {}
    const Gf = [
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
    ], Hf = [
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
    ], vf = [
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
    ], Xf = [
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
    ], Vf = [
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
    ], Le = new Uint8Array(288);
    Le.fill(8, 0, 144), Le.fill(9, 144, 256), Le.fill(7, 256, 280), Le.fill(8, 280, 288);
    const zf = new Uint8Array(30).fill(5);
    function me(t) {
        const e = new Uint16Array(16);
        for (const i of t)e[i]++;
        e[0] = 0;
        const n = new Uint16Array(17);
        for(let i = 1; i <= 15; i++)n[i + 1] = n[i] + e[i];
        const r = new Uint16Array(t.length);
        for(let i = 0; i < t.length; i++)t[i] && (r[n[t[i]]++] = i);
        return {
            o: e,
            symbols: r
        };
    }
    const Tt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function Yf(t) {
        let e;
        t({
            wasmURI: ()=>(e || (e = "data:application/wasm;base64," + (function(n) {
                    let r = "";
                    const i = n.length;
                    let s = 0;
                    for(; s + 2 < i; s += 3){
                        const a = n[s] << 16 | n[s + 1] << 8 | n[s + 2];
                        r += Tt[a >> 18 & 63] + Tt[a >> 12 & 63] + Tt[a >> 6 & 63] + Tt[63 & a];
                    }
                    const o = i - s;
                    if (o === 1) {
                        const a = n[s] << 16;
                        r += Tt[a >> 18 & 63] + Tt[a >> 12 & 63] + "==";
                    } else if (o === 2) {
                        const a = n[s] << 16 | n[s + 1] << 8;
                        r += Tt[a >> 18 & 63] + Tt[a >> 12 & 63] + Tt[a >> 6 & 63] + "=";
                    }
                    return r;
                })((function(n) {
                    let r = 0, i = 0, s = 0, o = new Uint8Array(1024), a = 0, c = 0;
                    for(; !c;){
                        c = f(1);
                        const E = f(2);
                        if (E == 0) u();
                        else if (E == 1) d(me(Le), me(zf));
                        else {
                            if (E != 2) throw new Error("invalid deflate block type");
                            d(...h());
                        }
                    }
                    return o.subarray(0, a);
                    function l() {
                        if (r >= n.length) throw new Error("unexpected end of deflate data");
                        return n[r++];
                    }
                    function f(E) {
                        for(; s < E;)i |= l() << s, s += 8;
                        const p = i & (1 << E) - 1;
                        return i >>>= E, s -= E, p;
                    }
                    function u() {
                        i = 0, s = 0;
                        const E = l() | l() << 8;
                        r += 2, _(a + E);
                        for(let p = 0; p < E; p++)o[a++] = l();
                    }
                    function d(E, p) {
                        let R = A(E);
                        for(; R != 256;){
                            if (R < 256) _(a + 1), o[a++] = R;
                            else {
                                const w = R - 257, S = Gf[w] + f(Hf[w]), I = A(p), g = vf[I] + f(Xf[I]);
                                _(a + S);
                                const N = a - g;
                                for(let y = 0; y < S; y++)o[a++] = o[N + y];
                            }
                            R = A(E);
                        }
                    }
                    function h() {
                        const E = f(5) + 257, p = f(5) + 1, R = f(4) + 4, w = new Uint8Array(19);
                        for(let N = 0; N < R; N++)w[Vf[N]] = f(3);
                        const S = me(w), I = new Uint8Array(E + p);
                        let g = 0;
                        for(; g < I.length;){
                            const N = A(S);
                            if (N < 16) I[g++] = N;
                            else if (N == 16) {
                                const y = I[g - 1];
                                let F = f(2) + 3;
                                for(; F--;)I[g++] = y;
                            } else g += N == 17 ? f(3) + 3 : f(7) + 11;
                        }
                        return [
                            me(I.subarray(0, E)),
                            me(I.subarray(E))
                        ];
                    }
                    function A(E) {
                        const { o: p, symbols: R } = E;
                        let w = 0, S = 0, I = 0;
                        for(let g = 1; g <= 15; g++){
                            w |= f(1);
                            const N = p[g];
                            if (w - S < N) return R[I + (w - S)];
                            I += N, S = S + N << 1, w <<= 1;
                        }
                        throw new Error("invalid huffman code");
                    }
                    function _(E) {
                        if (o.length < E) {
                            let p = 2 * o.length;
                            for(; p < E;)p *= 2;
                            const R = new Uint8Array(p);
                            R.set(o.subarray(0, a)), o = R;
                        }
                    }
                })((function(n) {
                    const r = (n = String(n).replace(/[^A-Za-z0-9+/=]/g, "")).length, i = [];
                    for(let s = 0; s < r; s += 4){
                        const o = Tt.indexOf(n[s]) << 18 | Tt.indexOf(n[s + 1]) << 12 | (63 & Tt.indexOf(n[s + 2])) << 6 | 63 & Tt.indexOf(n[s + 3]);
                        i.push(o >> 16 & 255), n[s + 2] !== "=" && i.push(o >> 8 & 255), n[s + 3] !== "=" && i.push(255 & o);
                    }
                    return new Uint8Array(i);
                })("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")))), e)
        });
    }
    const Dn = "deflate", Rn = "deflate-raw", ta = "deflate64-raw", In = "gzip";
    let j, Ee, Ht, Ce, ea;
    function Zf(t) {
        if (j = t, { malloc: Ee, free: Ht, memory: Ce } = j, typeof Ee != "function" || typeof Ht != "function" || !Ce) throw j = Ee = Ht = Ce = null, new Error("Invalid WASM module");
    }
    function kf(t) {
        ea = t;
    }
    function na(t, e, n = {}) {
        if (!j) {
            const a = new Error("WASM module not loaded");
            throw a.cause = ea, a;
        }
        const r = typeof n.level == "number" ? n.level : -1, i = typeof n.outBuffer == "number" ? n.outBuffer : 64 * 1024, s = typeof n.inBufferSize == "number" ? n.inBufferSize : 64 * 1024;
        return new TransformStream({
            start () {
                try {
                    let a;
                    if (this.out = Ee(i), this.in = Ee(s), this.inBufferSize = s, !this.out || !this.in) throw new Error("allocation failed");
                    if (this._scratch = new Uint8Array(i), t ? (this._process = j.deflate_process, this._last_consumed = j.deflate_last_consumed, this._end = j.deflate_end, this.streamHandle = j.deflate_new(), e === In ? a = j.deflate_init_gzip(this.streamHandle, r) : e === Rn ? a = j.deflate_init_raw(this.streamHandle, r) : a = j.deflate_init(this.streamHandle, r)) : e === ta ? (this._process = j.inflate9_process, this._last_consumed = j.inflate9_last_consumed, this._end = j.inflate9_end, this.streamHandle = j.inflate9_new(), a = j.inflate9_init_raw(this.streamHandle)) : (this._process = j.inflate_process, this._last_consumed = j.inflate_last_consumed, this._end = j.inflate_end, this.streamHandle = j.inflate_new(), e === Rn ? a = j.inflate_init_raw(this.streamHandle) : e === In ? a = j.inflate_init_gzip(this.streamHandle) : a = j.inflate_init(this.streamHandle)), a !== 0) throw new Error("init failed:" + a);
                } catch (a) {
                    throw o(this), a;
                }
            },
            transform (a, c) {
                try {
                    const l = a, f = new Uint8Array(Ce.buffer), u = this._process, d = this._last_consumed, h = this.out, A = this._scratch;
                    let _ = 0;
                    for(; _ < l.length;){
                        const E = Math.min(l.length - _, 32768);
                        if ((!this.in || this.inBufferSize < E) && (this.in && Ht && (Ht(this.in), this.in = 0), this.in = Ee(E), this.inBufferSize = E, !this.in)) throw new Error("allocation failed");
                        f.set(l.subarray(_, _ + E), this.in);
                        const p = u(this.streamHandle, this.in, E, h, i, 0), R = p >> 24 & 255, w = R & 128 ? R - 256 : R;
                        if (w < 0) throw new Error("process error:" + w);
                        const S = p & 16777215;
                        S && (A.set(f.subarray(h, h + S), 0), c.enqueue(A.slice(0, S)));
                        const I = d(this.streamHandle);
                        if (I === 0 && S === 0) break;
                        _ += I;
                    }
                } catch (l) {
                    o(this), c.error(l);
                }
            },
            flush (a) {
                try {
                    const c = new Uint8Array(Ce.buffer), l = this._process, f = this.out, u = this._scratch;
                    for(;;){
                        const d = l(this.streamHandle, 0, 0, f, i, 4), h = d >> 24 & 255, A = h & 128 ? h - 256 : h;
                        if (A < 0) throw new Error("process error:" + A);
                        const _ = d & 16777215;
                        if (_ && (u.set(c.subarray(f, f + _), 0), a.enqueue(u.slice(0, _))), h === 1 || _ === 0) break;
                    }
                } catch (c) {
                    a.error(c);
                } finally{
                    const c = o(this);
                    c !== 0 && a.error(new Error("end error:" + c));
                }
            },
            cancel () {
                o(this);
            }
        });
        function o(a) {
            let c = 0;
            return a.streamHandle && a._end && (c = a._end(a.streamHandle)), a.streamHandle = 0, a.in && Ht && Ht(a.in), a.in = 0, a.out && Ht && Ht(a.out), a.out = 0, c;
        }
    }
    class Cr {
        constructor(e = Dn, n){
            return na(!0, e, n);
        }
    }
    class Pr {
        constructor(e = Dn, n){
            return na(!1, e, n);
        }
    }
    Cr.requiresModule = !0;
    Pr.requiresModule = !0;
    Cr.supportedFormats = [
        Dn,
        Rn,
        In
    ];
    Pr.supportedFormats = [
        Dn,
        Rn,
        In,
        ta
    ];
    let Ni = !1;
    async function Wf(t, { baseURI: e }) {
        if (!Ni) try {
            await Kf(t, e), Ni = !0;
        } catch (n) {
            throw kf(n), n;
        }
    }
    async function Kf(t, e) {
        let n, r;
        try {
            try {
                r = new URL(t, e);
            } catch  {}
            n = await (await fetch(r)).arrayBuffer();
        } catch (s) {
            if (t.startsWith("data:application/wasm;base64,")) n = jf(t);
            else throw s;
        }
        const i = await WebAssembly.instantiate(n);
        Zf(i.instance.exports);
    }
    function jf(t) {
        const e = t.split(",")[1], n = atob(e), r = n.length, i = new Uint8Array(r);
        for(let s = 0; s < r; ++s)i[s] = n.charCodeAt(s);
        return i.buffer;
    }
    let $e;
    ul({
        initModule: (t)=>{
            if (!$e) {
                let { wasmURI: e } = t;
                typeof e == rt && (e = e()), $e = Wf(e, t).catch((n)=>{
                    throw $e = null, n;
                });
            }
            return $e;
        }
    });
    gn({
        CompressionStreamFallback: Cr,
        DecompressionStreamFallback: Pr
    });
    Yf(gn);
    fc(gn);
    const ra = [
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
    ], ia = {
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
    Object.fromEntries(ra.map((t)=>[
            t,
            ia[t].defaultValue
        ]));
    const Hn = {};
    for (const t of ra){
        const e = ia[t].uiGroup;
        Hn[e] || (Hn[e] = []), Hn[e].push(t);
    }
    const qf = [
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
    new Map(qf.map((t)=>[
            t.id,
            t
        ]));
    function pt(t) {
        if (t === null || typeof t == "string" || typeof t == "boolean" || typeof t == "number" && Number.isFinite(t)) return JSON.stringify(t);
        if (Array.isArray(t)) return "[" + t.map(pt).join(",") + "]";
        if (t && typeof t == "object" && Object.getPrototypeOf(t) === Object.prototype) return "{" + Object.keys(t).sort().map((e)=>JSON.stringify(e) + ":" + pt(t[e])).join(",") + "}";
        throw new Error("Appearance must contain finite JSON values only");
    }
    async function vn(t) {
        const e = await crypto.subtle.digest("SHA-256", new Uint8Array(t));
        return "sha256:" + Array.from(new Uint8Array(e), (n)=>n.toString(16).padStart(2, "0")).join("");
    }
    function Te(t) {
        if (typeof t != "string" || t.length > 16384) throw new Error("Invalid decimal");
        const e = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(t.trim());
        if (!e) throw new Error("Invalid decimal");
        const n = e[3] ?? e[4] ?? "";
        let r = ((e[2] ?? "") + n).replace(/^0+/, ""), i = BigInt(e[5] ?? "0") - BigInt(n.length);
        if (!r) return {
            negative: !1,
            digits: "0",
            exponent: 0n
        };
        const s = r.length - r.replace(/0+$/, "").length;
        return r = r.slice(0, r.length - s), i += BigInt(s), {
            negative: e[1] === "-",
            digits: r,
            exponent: i
        };
    }
    function sa(t) {
        return t.digits === "0" ? "0" : `${t.negative ? "-" : ""}${t.digits[0]}${t.digits.length > 1 ? "." + t.digits.slice(1) : ""}e${t.exponent + BigInt(t.digits.length - 1)}`;
    }
    function yi(t) {
        return sa(Te(t));
    }
    function he(t) {
        const e = Te(t);
        if (e.negative || e.digits === "0") throw new Error("Scale must be positive");
        return sa(e);
    }
    function Jf(t, e) {
        const n = Te(he(t)), r = Te(he(e)), i = n.exponent + BigInt(n.digits.length), s = r.exponent + BigInt(r.digits.length);
        if (i !== s) return i < s ? -1 : 1;
        const o = Math.max(n.digits.length, r.digits.length), a = n.digits.padEnd(o, "0"), c = r.digits.padEnd(o, "0");
        return a === c ? 0 : a < c ? -1 : 1;
    }
    function Qf(t, e) {
        const n = t.toString(), r = e.toString(), i = Math.min(16, n.length), s = Math.min(16, r.length);
        return Number(n.slice(0, i)) / Number(r.slice(0, s)) * 10 ** (n.length - i - r.length + s);
    }
    function oa(t, e) {
        const n = Te(he(t)), r = Te(he(e)), i = n.exponent + BigInt(n.digits.length) - r.exponent - BigInt(r.digits.length);
        if (i >= -1n && i <= 1n) {
            const a = n.exponent < r.exponent ? n.exponent : r.exponent, c = BigInt(n.digits) * 10n ** (n.exponent - a), l = BigInt(r.digits) * 10n ** (r.exponent - a);
            if (c === l) return 0;
            const f = c > l ? 1 : -1, u = c < l ? c : l, d = c > l ? c - l : l - c, h = f * Math.log1p(Qf(d, u)) / Math.LN2;
            if (h === 0) throw new Error("Zoom window is below the supported relative precision");
            return h;
        }
        const s = Number(i);
        if (!Number.isSafeInteger(s)) throw new Error("Zoom distance exceeds planner limits");
        const o = (a)=>Number(a.slice(0, 16)) / 10 ** (Math.min(16, a.length) - 1);
        return s * Math.LOG2E * Math.LN10 + Math.log2(o(n.digits) / o(r.digits));
    }
    function aa(t) {
        const e = {
            cx: yi(t.cx),
            cy: yi(t.cy),
            startScale: he(t.startScale),
            endScale: he(t.endScale)
        };
        if (Jf(e.startScale, e.endScale) < 0) throw new Error("Document domain must go from coarse to fine");
        return e;
    }
    function $f(t) {
        const { width: e, height: n, density: r } = t;
        if (![
            e,
            n
        ].every((l)=>Number.isInteger(l) && l > 0 && l <= 16384)) throw new Error("Invalid target dimensions");
        if (!Number.isFinite(r) || r < 1 || r > 8) throw new Error("Density must be in [1, 8]");
        const i = t.halo ?? 2, s = t.blockSize ?? 512;
        if (!Number.isInteger(i) || i < 1 || i > 16) throw new Error("Invalid filter halo");
        if (!Number.isInteger(s) || s <= 2 * i || s > 512 || s % 2) throw new Error("Invalid coded block size");
        const o = aa(t.domain), a = Math.hypot(e, n) / 2, c = oa(o.startScale, o.endScale) * Math.LN2;
        if (!Number.isFinite(c) || c / Math.LN2 > 999980) throw new Error("Document exceeds planner limit");
        if (a > 4096) throw new Error("Target exceeds the 12-doubling center coverage");
        return {
            domain: o,
            width: e,
            height: n,
            density: r,
            radius: a,
            depth: c,
            angularSamples: Math.ceil(2 * Math.PI * r * a),
            rhoStep: Math.LN2 / Math.ceil(Math.LN2 * r * a),
            halo: i,
            blockSize: s
        };
    }
    const tE = 12, Di = (t)=>Math.ceil(t / 16) * 16;
    function eE(t) {
        const e = t.angularSamples, n = Math.ceil(Math.LN2 * t.density * t.radius), r = Math.floor(oa(t.domain.startScale, t.domain.endScale)) + tE + 1, i = 2;
        if (!Number.isSafeInteger(r) || r > 1e6) throw new Error("Trop de doublements pour ce document");
        return {
            angularSamples: e,
            rowsPerOctave: n,
            tileWidth: Di(e + 2 * i),
            tileHeight: Di(n + 1 + 2 * i),
            tileCount: r,
            halo: i
        };
    }
    const ca = 128 * 1024 * 1024, la = ca + 1024 * 1024, nE = 16383;
    function rE(t, e) {
        if (![
            t,
            e
        ].every((n)=>Number.isInteger(n) && n > 0 && n <= nE) || t * e * 4 > ca) throw new Error("Cette tuile dépasse les limites WebP ou le budget de 128 MiB. Réduire la résolution ou la densité.");
    }
    const iE = {
        storage: "zip64",
        codec: "webp",
        bitDepth: 8,
        chroma: "420",
        transfer: "iec61966-2-1",
        alpha: !1
    };
    function ge(t) {
        if (t.version !== 5) throw new Error("Ancien format ExpMap non pris en charge : recréer le fichier .expmap.");
        if (typeof t.name != "string" || !t.name.trim() || t.name.length > 200) throw new Error("Invalid document name");
        if (!Number.isFinite(t.quality) || t.quality < 0 || t.quality > 1) throw new Error("Invalid WebP quality");
        if (t.thumbnail !== void 0 && (t.thumbnail.length > 128 * 1024 || !/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(t.thumbnail))) throw new Error("Invalid thumbnail");
        if (typeof t.forceRender != "boolean") throw new Error("Invalid experimental rendering flag");
        if (!/^[a-zA-Z0-9-]{1,100}$/.test(t.documentId) || !Number.isSafeInteger(t.generation) || t.generation < 0) throw new Error("Invalid document identity");
        if (![
            "preparing",
            "interrupted",
            "complete"
        ].includes(t.state)) throw new Error("Invalid document state");
        if (t.scaleConvention !== "VideoPathLocation.scale") throw new Error("Invalid scale convention");
        if (aa({
            ...t.projection.domain,
            startScale: t.zoomReferenceScale,
            endScale: t.zoomReferenceScale
        }), pt($f(t.projection)) !== pt(t.projection)) throw new Error("Invalid projection contract");
        if (pt(eE(t.projection)) !== pt(t.octaves)) throw new Error("Invalid octave layout");
        if (pt(t.color) !== pt(iE)) throw new Error("Unsupported codec/colorimetry");
        if (t.geometryConvention !== void 0 && t.geometryConvention !== "continuous-radial-v1") throw new Error("Unsupported geometry convention");
        const e = /^sha256:[a-f0-9]{64}$/;
        if (!e.test(t.appearance.identity) || pt(JSON.parse(t.appearance.json)) !== t.appearance.json) throw new Error("Invalid appearance identity");
        for (const n of t.appearance.resources)if (!n.role || !e.test(n.identity) || !Number.isSafeInteger(n.bytes) || n.bytes < 0) throw new Error("Invalid resource");
        if (t.center && (t.center.length !== 3 || t.center.some((n)=>!Number.isInteger(n) || n < 0 || n > 255))) throw new Error("Invalid center color");
        if (!Array.isArray(t.tiles) || t.tiles.length > t.octaves.tileCount) throw new Error("Invalid image coverage");
        for (const [n, r] of t.tiles.entries())if (r.index !== n || r.file !== `doubling-${n}.webp` || !Number.isSafeInteger(r.length) || r.length <= 0 || r.length > la || !e.test(r.sha256)) throw new Error("Invalid image index");
        if (t.state === "complete" && (!t.center || t.tiles.length !== t.octaves.tileCount)) throw new Error("Complete document has missing tiles or center");
    }
    const Xn = 32 * 1024 * 1024;
    async function Vn(t, e, n) {
        const r = await t.getFileHandle(e, {
            create: !0
        }), i = await r.createWritable();
        try {
            await i.write(typeof n == "string" ? n : {
                type: "write",
                position: 0,
                data: new Uint8Array(n)
            }), await i.close();
        } catch (s) {
            throw await i.abort().catch(()=>{}), s;
        }
    }
    class qt {
        entries;
        zip;
        directory;
        destination;
        constructor(e, n){
            this.directory = e, this.destination = n;
        }
        static async fromFile(e) {
            const n = new qt(void 0, e);
            n.zip = new Or(new $t(await e.getFile()), {
                useWebWorkers: !1
            });
            const r = await n.zip.getEntries();
            if (r.length > 1000002) throw new Error("ExpMap index exceeds budget");
            n.entries = new Map;
            for (const i of r){
                if (i.directory || i.encrypted || i.compressionMethod !== 0 || n.entries.has(i.filename)) throw new Error("Invalid ExpMap archive index");
                n.entries.set(i.filename, i);
            }
            return n;
        }
        static async working(e, n, r = !1, i = {}) {
            if (!/^[a-zA-Z0-9-]{1,100}$/.test(n)) throw new Error("Invalid working document identity");
            if (!navigator.storage?.getDirectory) throw new Error("Le stockage de travail privé du navigateur est requis pour créer un ExpMap");
            const a = await (await (await navigator.storage.getDirectory()).getDirectoryHandle("expmap-work", {
                create: !0
            })).getDirectoryHandle(n, {
                create: !0
            }), c = new qt(a, e);
            if (r) {
                try {
                    return await c.open(n), c;
                } catch (u) {
                    if (!(u instanceof DOMException && u.name === "NotFoundError")) throw u;
                }
                const l = await qt.fromFile(e), f = await l.open(n);
                i.onProgress?.(0, f.tiles.length);
                for (const u of f.tiles)i.signal?.throwIfAborted(), await Vn(a, u.file, await l.readTile(u)), i.onProgress?.(u.index + 1, f.tiles.length);
                await c.publish(f);
            }
            return c;
        }
        async assertEmpty() {
            if (!this.directory) throw new Error("Read-only document");
            for await (const e of this.directory.values())throw new Error("Document de travail déjà présent");
        }
        async read(e, n) {
            if (this.directory) {
                const i = await (await this.directory.getFileHandle(e)).getFile();
                if (i.size > n) throw new Error("Image or metadata exceeds budget");
                return new Uint8Array(await i.arrayBuffer());
            }
            const r = this.entries?.get(e);
            if (!r || !("getData" in r)) throw new DOMException("Missing archive entry", "NotFoundError");
            if (r.uncompressedSize > n) throw new Error("Image or metadata exceeds budget");
            return r.getData(new Ml, {
                checkSignature: !0,
                useWebWorkers: !1
            });
        }
        async open(e) {
            const n = [];
            let r;
            for (const i of this.directory ? [
                "manifest-a.json",
                "manifest-b.json"
            ] : [
                "manifest.json"
            ])try {
                const s = JSON.parse(new TextDecoder().decode(await this.read(i, Xn)));
                ge(s), n.push(s);
            } catch (s) {
                if (s instanceof DOMException && s.name === "NotAllowedError") throw s;
                r = s;
            }
            if (n.sort((i, s)=>s.generation - i.generation), e && n.length && n[0].documentId !== e) throw new Error("Fichier associé à un autre document");
            for (const i of n)try {
                if (i.documentId !== n[0].documentId) continue;
                return await this.verify(i), i;
            } catch (s) {
                r = s;
            }
            throw r ?? new Error("No valid ExpMap checkpoint");
        }
        async readTile(e) {
            const n = await this.read(e.file, e.length);
            if (n.length !== e.length || await vn(n) !== e.sha256) throw new Error(`Corrupt image ${e.index}`);
            return n;
        }
        async verify(e) {
            if (ge(e), await vn(new TextEncoder().encode(e.appearance.json)) !== e.appearance.identity) throw new Error("Appearance content identity mismatch");
            for (const n of e.tiles)if ((this.directory ? (await (await this.directory.getFileHandle(n.file)).getFile()).size : this.entries?.get(n.file)?.uncompressedSize) !== n.length) throw new Error("Missing or truncated image");
        }
        async publish(e) {
            if (!this.directory) throw new Error("Read-only document");
            ge(e);
            const n = pt(e);
            if (new TextEncoder().encode(n).length > Xn) throw new Error("Manifest exceeds metadata budget");
            const r = e.generation % 2 ? "manifest-b.json" : "manifest-a.json";
            if (await Vn(this.directory, r, n), new TextDecoder().decode(await this.read(r, Xn)) !== n) throw new Error("Checkpoint readback mismatch");
        }
        async appendTile(e, n) {
            if (!this.directory) throw new Error("Read-only document");
            const r = e.tiles.length, i = {
                index: r,
                file: `doubling-${r}.webp`,
                length: n.length,
                sha256: await vn(n)
            }, s = {
                ...e,
                generation: e.generation + 1,
                state: "preparing",
                tiles: [
                    ...e.tiles,
                    i
                ]
            };
            return ge(s), await Vn(this.directory, i.file, n), await this.readTile(i), await this.publish(s), s;
        }
        async saveContainer(e, n, r, i = this.destination) {
            if (!i) throw new Error("Destination .expmap manquante");
            ge(e), n?.(0, e.tiles.length);
            const s = await i.createWritable(), o = new Ef(s, {
                zip64: !0,
                level: 0,
                useWebWorkers: !1,
                bufferedWrite: !1
            });
            try {
                await o.add("manifest.json", new Pl(pt(e)), {
                    signal: r
                });
                for (const l of e.tiles){
                    r?.throwIfAborted();
                    const f = this.directory ? await (await this.directory.getFileHandle(l.file)).getFile() : new Blob([
                        await this.readTile(l)
                    ]);
                    await o.add(l.file, new $t(f), {
                        signal: r
                    }), n?.(l.index + 1, e.tiles.length);
                }
                await o.close();
                const c = await (await qt.fromFile(i)).open(e.documentId);
                if (pt(c) !== pt(e)) throw new Error("Archive readback mismatch");
            } catch (a) {
                throw await s.abort().catch(()=>{}), a;
            }
        }
        async discardWorking(e) {
            await (await (await navigator.storage.getDirectory()).getDirectoryHandle("expmap-work")).removeEntry(e, {
                recursive: !0
            });
        }
    }
    async function sE(t, e, n) {
        if (rE(e, n), !t.length || t.length > la) throw new Error("Invalid encoded image size");
        const r = await createImageBitmap(new Blob([
            new Uint8Array(t)
        ], {
            type: "image/webp"
        }), {
            premultiplyAlpha: "none",
            colorSpaceConversion: "default"
        });
        if (r.width !== e || r.height !== n) throw r.close(), new Error("Dimensions WebP incompatibles avec le document");
        return r;
    }
    let tn, Ne, zn = !1;
    self.onmessage = async ({ data: t })=>{
        if (zn) {
            self.postMessage({
                id: t.id,
                error: {
                    name: "Error",
                    message: "Décodage déjà en cours"
                }
            });
            return;
        }
        zn = !0;
        let e;
        try {
            if (t.kind === "init") tn = t.directory ? new qt(t.directory) : await qt.fromFile(t.file), Ne = await tn.open(t.documentId), self.postMessage({
                id: t.id
            });
            else {
                if (t.kind !== "read" || !tn || !Ne || !Number.isInteger(t.index) || !Ne.tiles[t.index]) throw new Error("Tuile ExpMap invalide");
                const n = Ne.octaves;
                e = await sE(await tn.readTile(Ne.tiles[t.index]), n.tileWidth, n.tileHeight), self.postMessage({
                    id: t.id,
                    bitmap: e
                }, {
                    transfer: [
                        e
                    ]
                }), e = void 0;
            }
        } catch (n) {
            self.postMessage({
                id: t.id,
                error: {
                    name: n instanceof Error ? n.name : "Error",
                    message: String(n)
                }
            });
        } finally{
            e?.close(), zn = !1;
        }
    };
})();
