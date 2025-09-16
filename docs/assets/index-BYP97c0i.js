var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(async () => {
  (function() {
    const t = document.createElement("link").relList;
    if (t && t.supports && t.supports("modulepreload")) return;
    for (const s of document.querySelectorAll('link[rel="modulepreload"]')) r(s);
    new MutationObserver((s) => {
      for (const i of s) if (i.type === "childList") for (const o of i.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && r(o);
    }).observe(document, {
      childList: true,
      subtree: true
    });
    function n(s) {
      const i = {};
      return s.integrity && (i.integrity = s.integrity), s.referrerPolicy && (i.referrerPolicy = s.referrerPolicy), s.crossOrigin === "use-credentials" ? i.credentials = "include" : s.crossOrigin === "anonymous" ? i.credentials = "omit" : i.credentials = "same-origin", i;
    }
    function r(s) {
      if (s.ep) return;
      s.ep = true;
      const i = n(s);
      fetch(s.href, i);
    }
  })();
  function Yn(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const W = {}, ct = [], Ae = () => {
  }, Qs = () => false, dn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Xn = (e) => e.startsWith("onUpdate:"), oe = Object.assign, Jn = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, ei = Object.prototype.hasOwnProperty, j = (e, t) => ei.call(e, t), F = Array.isArray, Ct = (e) => hn(e) === "[object Map]", ti = (e) => hn(e) === "[object Set]", I = (e) => typeof e == "function", ee = (e) => typeof e == "string", pt = (e) => typeof e == "symbol", k = (e) => e !== null && typeof e == "object", kr = (e) => (k(e) || I(e)) && I(e.then) && I(e.catch), ni = Object.prototype.toString, hn = (e) => ni.call(e), ri = (e) => hn(e).slice(8, -1), si = (e) => hn(e) === "[object Object]", kn = (e) => ee(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Et = Yn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), pn = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  }, ii = /-(\w)/g, Xe = pn((e) => e.replace(ii, (t, n) => n ? n.toUpperCase() : "")), oi = /\B([A-Z])/g, st = pn((e) => e.replace(oi, "-$1").toLowerCase()), Zr = pn((e) => e.charAt(0).toUpperCase() + e.slice(1)), yn = pn((e) => e ? `on${Zr(e)}` : ""), Ye = (e, t) => !Object.is(e, t), wn = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, Un = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, li = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  };
  let vr;
  const _n = () => vr || (vr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function Zn(e) {
    if (F(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], s = ee(r) ? ui(r) : Zn(r);
        if (s) for (const i in s) t[i] = s[i];
      }
      return t;
    } else if (ee(e) || k(e)) return e;
  }
  const ai = /;(?![^(]*\))/g, ci = /:([^]+)/, fi = /\/\*[^]*?\*\//g;
  function ui(e) {
    const t = {};
    return e.replace(fi, "").split(ai).forEach((n) => {
      if (n) {
        const r = n.split(ci);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }), t;
  }
  function ft(e) {
    let t = "";
    if (ee(e)) t = e;
    else if (F(e)) for (let n = 0; n < e.length; n++) {
      const r = ft(e[n]);
      r && (t += r + " ");
    }
    else if (k(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const di = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", hi = Yn(di);
  function Qr(e) {
    return !!e || e === "";
  }
  let he;
  class pi {
    constructor(t = false) {
      this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.parent = he, !t && he && (this.index = (he.scopes || (he.scopes = [])).push(this) - 1);
    }
    get active() {
      return this._active;
    }
    pause() {
      if (this._active) {
        this._isPaused = true;
        let t, n;
        if (this.scopes) for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].pause();
        for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].pause();
      }
    }
    resume() {
      if (this._active && this._isPaused) {
        this._isPaused = false;
        let t, n;
        if (this.scopes) for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].resume();
        for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].resume();
      }
    }
    run(t) {
      if (this._active) {
        const n = he;
        try {
          return he = this, t();
        } finally {
          he = n;
        }
      }
    }
    on() {
      ++this._on === 1 && (this.prevScope = he, he = this);
    }
    off() {
      this._on > 0 && --this._on === 0 && (he = this.prevScope, this.prevScope = void 0);
    }
    stop(t) {
      if (this._active) {
        this._active = false;
        let n, r;
        for (n = 0, r = this.effects.length; n < r; n++) this.effects[n].stop();
        for (this.effects.length = 0, n = 0, r = this.cleanups.length; n < r; n++) this.cleanups[n]();
        if (this.cleanups.length = 0, this.scopes) {
          for (n = 0, r = this.scopes.length; n < r; n++) this.scopes[n].stop(true);
          this.scopes.length = 0;
        }
        if (!this.detached && this.parent && !t) {
          const s = this.parent.scopes.pop();
          s && s !== this && (this.parent.scopes[this.index] = s, s.index = this.index);
        }
        this.parent = void 0;
      }
    }
  }
  function _i() {
    return he;
  }
  let q;
  const Sn = /* @__PURE__ */ new WeakSet();
  class es {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, he && he.active && he.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, Sn.has(this) && (Sn.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || ns(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, xr(this), rs(this);
      const t = q, n = xe;
      q = this, xe = true;
      try {
        return this.fn();
      } finally {
        ss(this), q = t, xe = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) tr(t);
        this.deps = this.depsTail = void 0, xr(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? Sn.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      zn(this) && this.run();
    }
    get dirty() {
      return zn(this);
    }
  }
  let ts = 0, Tt, Pt;
  function ns(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = Pt, Pt = e;
      return;
    }
    e.next = Tt, Tt = e;
  }
  function Qn() {
    ts++;
  }
  function er() {
    if (--ts > 0) return;
    if (Pt) {
      let t = Pt;
      for (Pt = void 0; t; ) {
        const n = t.next;
        t.next = void 0, t.flags &= -9, t = n;
      }
    }
    let e;
    for (; Tt; ) {
      let t = Tt;
      for (Tt = void 0; t; ) {
        const n = t.next;
        if (t.next = void 0, t.flags &= -9, t.flags & 1) try {
          t.trigger();
        } catch (r) {
          e || (e = r);
        }
        t = n;
      }
    }
    if (e) throw e;
  }
  function rs(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function ss(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const s = r.prevDep;
      r.version === -1 ? (r === n && (n = s), tr(r), gi(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = s;
    }
    e.deps = t, e.depsTail = n;
  }
  function zn(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (is(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function is(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Ut) || (e.globalVersion = Ut, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !zn(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = q, r = xe;
    q = e, xe = true;
    try {
      rs(e);
      const s = e.fn(e._value);
      (t.version === 0 || Ye(s, e._value)) && (e.flags |= 128, e._value = s, t.version++);
    } catch (s) {
      throw t.version++, s;
    } finally {
      q = n, xe = r, ss(e), e.flags &= -3;
    }
  }
  function tr(e, t = false) {
    const { dep: n, prevSub: r, nextSub: s } = e;
    if (r && (r.nextSub = s, e.prevSub = void 0), s && (s.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
      n.computed.flags &= -5;
      for (let i = n.computed.deps; i; i = i.nextDep) tr(i, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function gi(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let xe = true;
  const os = [];
  function He() {
    os.push(xe), xe = false;
  }
  function je() {
    const e = os.pop();
    xe = e === void 0 ? true : e;
  }
  function xr(e) {
    const { cleanup: t } = e;
    if (e.cleanup = void 0, t) {
      const n = q;
      q = void 0;
      try {
        t();
      } finally {
        q = n;
      }
    }
  }
  let Ut = 0;
  class bi {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class nr {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!q || !xe || q === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== q) n = this.activeLink = new bi(q, this), q.deps ? (n.prevDep = q.depsTail, q.depsTail.nextDep = n, q.depsTail = n) : q.deps = q.depsTail = n, ls(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = q.depsTail, n.nextDep = void 0, q.depsTail.nextDep = n, q.depsTail = n, q.deps === n && (q.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, Ut++, this.notify(t);
    }
    notify(t) {
      Qn();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        er();
      }
    }
  }
  function ls(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let r = t.deps; r; r = r.nextDep) ls(r);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const Ln = /* @__PURE__ */ new WeakMap(), nt = Symbol(""), Bn = Symbol(""), zt = Symbol("");
  function se(e, t, n) {
    if (xe && q) {
      let r = Ln.get(e);
      r || Ln.set(e, r = /* @__PURE__ */ new Map());
      let s = r.get(n);
      s || (r.set(n, s = new nr()), s.map = r, s.key = n), s.track();
    }
  }
  function Ne(e, t, n, r, s, i) {
    const o = Ln.get(e);
    if (!o) {
      Ut++;
      return;
    }
    const a = (f) => {
      f && f.trigger();
    };
    if (Qn(), t === "clear") o.forEach(a);
    else {
      const f = F(e), h = f && kn(n);
      if (f && n === "length") {
        const u = Number(r);
        o.forEach((p, S) => {
          (S === "length" || S === zt || !pt(S) && S >= u) && a(p);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && a(o.get(n)), h && a(o.get(zt)), t) {
        case "add":
          f ? h && a(o.get("length")) : (a(o.get(nt)), Ct(e) && a(o.get(Bn)));
          break;
        case "delete":
          f || (a(o.get(nt)), Ct(e) && a(o.get(Bn)));
          break;
        case "set":
          Ct(e) && a(o.get(nt));
          break;
      }
    }
    er();
  }
  function ot(e) {
    const t = H(e);
    return t === e ? t : (se(t, "iterate", zt), ye(e) ? t : t.map(ae));
  }
  function rr(e) {
    return se(e = H(e), "iterate", zt), e;
  }
  const mi = {
    __proto__: null,
    [Symbol.iterator]() {
      return Cn(this, Symbol.iterator, ae);
    },
    concat(...e) {
      return ot(this).concat(...e.map((t) => F(t) ? ot(t) : t));
    },
    entries() {
      return Cn(this, "entries", (e) => (e[1] = ae(e[1]), e));
    },
    every(e, t) {
      return ze(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return ze(this, "filter", e, t, (n) => n.map(ae), arguments);
    },
    find(e, t) {
      return ze(this, "find", e, t, ae, arguments);
    },
    findIndex(e, t) {
      return ze(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return ze(this, "findLast", e, t, ae, arguments);
    },
    findLastIndex(e, t) {
      return ze(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return ze(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return En(this, "includes", e);
    },
    indexOf(...e) {
      return En(this, "indexOf", e);
    },
    join(e) {
      return ot(this).join(e);
    },
    lastIndexOf(...e) {
      return En(this, "lastIndexOf", e);
    },
    map(e, t) {
      return ze(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return xt(this, "pop");
    },
    push(...e) {
      return xt(this, "push", e);
    },
    reduce(e, ...t) {
      return yr(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return yr(this, "reduceRight", e, t);
    },
    shift() {
      return xt(this, "shift");
    },
    some(e, t) {
      return ze(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return xt(this, "splice", e);
    },
    toReversed() {
      return ot(this).toReversed();
    },
    toSorted(e) {
      return ot(this).toSorted(e);
    },
    toSpliced(...e) {
      return ot(this).toSpliced(...e);
    },
    unshift(...e) {
      return xt(this, "unshift", e);
    },
    values() {
      return Cn(this, "values", ae);
    }
  };
  function Cn(e, t, n) {
    const r = rr(e), s = r[t]();
    return r !== e && !ye(e) && (s._next = s.next, s.next = () => {
      const i = s._next();
      return i.value && (i.value = n(i.value)), i;
    }), s;
  }
  const vi = Array.prototype;
  function ze(e, t, n, r, s, i) {
    const o = rr(e), a = o !== e && !ye(e), f = o[t];
    if (f !== vi[t]) {
      const p = f.apply(e, i);
      return a ? ae(p) : p;
    }
    let h = n;
    o !== e && (a ? h = function(p, S) {
      return n.call(this, ae(p), S, e);
    } : n.length > 2 && (h = function(p, S) {
      return n.call(this, p, S, e);
    }));
    const u = f.call(o, h, r);
    return a && s ? s(u) : u;
  }
  function yr(e, t, n, r) {
    const s = rr(e);
    let i = n;
    return s !== e && (ye(e) ? n.length > 3 && (i = function(o, a, f) {
      return n.call(this, o, a, f, e);
    }) : i = function(o, a, f) {
      return n.call(this, o, ae(a), f, e);
    }), s[t](i, ...r);
  }
  function En(e, t, n) {
    const r = H(e);
    se(r, "iterate", zt);
    const s = r[t](...n);
    return (s === -1 || s === false) && lr(n[0]) ? (n[0] = H(n[0]), r[t](...n)) : s;
  }
  function xt(e, t, n = []) {
    He(), Qn();
    const r = H(e)[t].apply(e, n);
    return er(), je(), r;
  }
  const xi = Yn("__proto__,__v_isRef,__isVue"), as = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(pt));
  function yi(e) {
    pt(e) || (e = String(e));
    const t = H(this);
    return se(t, "has", e), t.hasOwnProperty(e);
  }
  class cs {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const s = this._isReadonly, i = this._isShallow;
      if (n === "__v_isReactive") return !s;
      if (n === "__v_isReadonly") return s;
      if (n === "__v_isShallow") return i;
      if (n === "__v_raw") return r === (s ? i ? Ai : hs : i ? ds : us).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const o = F(t);
      if (!s) {
        let f;
        if (o && (f = mi[n])) return f;
        if (n === "hasOwnProperty") return yi;
      }
      const a = Reflect.get(t, n, ie(t) ? t : r);
      return (pt(n) ? as.has(n) : xi(n)) || (s || se(t, "get", n), i) ? a : ie(a) ? o && kn(n) ? a : a.value : k(a) ? s ? ps(a) : ir(a) : a;
    }
  }
  class fs extends cs {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, s) {
      let i = t[n];
      if (!this._isShallow) {
        const f = rt(i);
        if (!ye(r) && !rt(r) && (i = H(i), r = H(r)), !F(t) && ie(i) && !ie(r)) return f ? false : (i.value = r, true);
      }
      const o = F(t) && kn(n) ? Number(n) < t.length : j(t, n), a = Reflect.set(t, n, r, ie(t) ? t : s);
      return t === H(s) && (o ? Ye(r, i) && Ne(t, "set", n, r) : Ne(t, "add", n, r)), a;
    }
    deleteProperty(t, n) {
      const r = j(t, n);
      t[n];
      const s = Reflect.deleteProperty(t, n);
      return s && r && Ne(t, "delete", n, void 0), s;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!pt(n) || !as.has(n)) && se(t, "has", n), r;
    }
    ownKeys(t) {
      return se(t, "iterate", F(t) ? "length" : nt), Reflect.ownKeys(t);
    }
  }
  class wi extends cs {
    constructor(t = false) {
      super(true, t);
    }
    set(t, n) {
      return true;
    }
    deleteProperty(t, n) {
      return true;
    }
  }
  const Si = new fs(), Ci = new wi(), Ei = new fs(true);
  const Nn = (e) => e, $t = (e) => Reflect.getPrototypeOf(e);
  function Ti(e, t, n) {
    return function(...r) {
      const s = this.__v_raw, i = H(s), o = Ct(i), a = e === "entries" || e === Symbol.iterator && o, f = e === "keys" && o, h = s[e](...r), u = n ? Nn : t ? Vn : ae;
      return !t && se(i, "iterate", f ? Bn : nt), {
        next() {
          const { value: p, done: S } = h.next();
          return S ? {
            value: p,
            done: S
          } : {
            value: a ? [
              u(p[0]),
              u(p[1])
            ] : u(p),
            done: S
          };
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    };
  }
  function Wt(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function Pi(e, t) {
    const n = {
      get(s) {
        const i = this.__v_raw, o = H(i), a = H(s);
        e || (Ye(s, a) && se(o, "get", s), se(o, "get", a));
        const { has: f } = $t(o), h = t ? Nn : e ? Vn : ae;
        if (f.call(o, s)) return h(i.get(s));
        if (f.call(o, a)) return h(i.get(a));
        i !== o && i.get(s);
      },
      get size() {
        const s = this.__v_raw;
        return !e && se(H(s), "iterate", nt), Reflect.get(s, "size", s);
      },
      has(s) {
        const i = this.__v_raw, o = H(i), a = H(s);
        return e || (Ye(s, a) && se(o, "has", s), se(o, "has", a)), s === a ? i.has(s) : i.has(s) || i.has(a);
      },
      forEach(s, i) {
        const o = this, a = o.__v_raw, f = H(a), h = t ? Nn : e ? Vn : ae;
        return !e && se(f, "iterate", nt), a.forEach((u, p) => s.call(i, h(u), h(p), o));
      }
    };
    return oe(n, e ? {
      add: Wt("add"),
      set: Wt("set"),
      delete: Wt("delete"),
      clear: Wt("clear")
    } : {
      add(s) {
        !t && !ye(s) && !rt(s) && (s = H(s));
        const i = H(this);
        return $t(i).has.call(i, s) || (i.add(s), Ne(i, "add", s, s)), this;
      },
      set(s, i) {
        !t && !ye(i) && !rt(i) && (i = H(i));
        const o = H(this), { has: a, get: f } = $t(o);
        let h = a.call(o, s);
        h || (s = H(s), h = a.call(o, s));
        const u = f.call(o, s);
        return o.set(s, i), h ? Ye(i, u) && Ne(o, "set", s, i) : Ne(o, "add", s, i), this;
      },
      delete(s) {
        const i = H(this), { has: o, get: a } = $t(i);
        let f = o.call(i, s);
        f || (s = H(s), f = o.call(i, s)), a && a.call(i, s);
        const h = i.delete(s);
        return f && Ne(i, "delete", s, void 0), h;
      },
      clear() {
        const s = H(this), i = s.size !== 0, o = s.clear();
        return i && Ne(s, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((s) => {
      n[s] = Ti(s, e, t);
    }), n;
  }
  function sr(e, t) {
    const n = Pi(e, t);
    return (r, s, i) => s === "__v_isReactive" ? !e : s === "__v_isReadonly" ? e : s === "__v_raw" ? r : Reflect.get(j(n, s) && s in r ? n : r, s, i);
  }
  const Mi = {
    get: sr(false, false)
  }, Oi = {
    get: sr(false, true)
  }, Ri = {
    get: sr(true, false)
  };
  const us = /* @__PURE__ */ new WeakMap(), ds = /* @__PURE__ */ new WeakMap(), hs = /* @__PURE__ */ new WeakMap(), Ai = /* @__PURE__ */ new WeakMap();
  function Ii(e) {
    switch (e) {
      case "Object":
      case "Array":
        return 1;
      case "Map":
      case "Set":
      case "WeakMap":
      case "WeakSet":
        return 2;
      default:
        return 0;
    }
  }
  function Fi(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Ii(ri(e));
  }
  function ir(e) {
    return rt(e) ? e : or(e, false, Si, Mi, us);
  }
  function Di(e) {
    return or(e, false, Ei, Oi, ds);
  }
  function ps(e) {
    return or(e, true, Ci, Ri, hs);
  }
  function or(e, t, n, r, s) {
    if (!k(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const i = Fi(e);
    if (i === 0) return e;
    const o = s.get(e);
    if (o) return o;
    const a = new Proxy(e, i === 2 ? r : n);
    return s.set(e, a), a;
  }
  function Mt(e) {
    return rt(e) ? Mt(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function rt(e) {
    return !!(e && e.__v_isReadonly);
  }
  function ye(e) {
    return !!(e && e.__v_isShallow);
  }
  function lr(e) {
    return e ? !!e.__v_raw : false;
  }
  function H(e) {
    const t = e && e.__v_raw;
    return t ? H(t) : e;
  }
  function Ui(e) {
    return !j(e, "__v_skip") && Object.isExtensible(e) && Un(e, "__v_skip", true), e;
  }
  const ae = (e) => k(e) ? ir(e) : e, Vn = (e) => k(e) ? ps(e) : e;
  function ie(e) {
    return e ? e.__v_isRef === true : false;
  }
  function Gt(e) {
    return zi(e, false);
  }
  function zi(e, t) {
    return ie(e) ? e : new Li(e, t);
  }
  class Li {
    constructor(t, n) {
      this.dep = new nr(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : H(t), this._value = n ? t : ae(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || ye(t) || rt(t);
      t = r ? t : H(t), Ye(t, n) && (this._rawValue = t, this._value = r ? t : ae(t), this.dep.trigger());
    }
  }
  function Bi(e) {
    return ie(e) ? e.value : e;
  }
  const Ni = {
    get: (e, t, n) => t === "__v_raw" ? e : Bi(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const s = e[t];
      return ie(s) && !ie(n) ? (s.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function _s(e) {
    return Mt(e) ? e : new Proxy(e, Ni);
  }
  class Vi {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new nr(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Ut - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && q !== this) return ns(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return is(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function Hi(e, t, n = false) {
    let r, s;
    return I(e) ? r = e : (r = e.get, s = e.set), new Vi(r, s, n);
  }
  const Kt = {}, on = /* @__PURE__ */ new WeakMap();
  let tt;
  function ji(e, t = false, n = tt) {
    if (n) {
      let r = on.get(n);
      r || on.set(n, r = []), r.push(e);
    }
  }
  function $i(e, t, n = W) {
    const { immediate: r, deep: s, once: i, scheduler: o, augmentJob: a, call: f } = n, h = (O) => s ? O : ye(O) || s === false || s === 0 ? Ve(O, 1) : Ve(O);
    let u, p, S, E, B = false, L = false;
    if (ie(e) ? (p = () => e.value, B = ye(e)) : Mt(e) ? (p = () => h(e), B = true) : F(e) ? (L = true, B = e.some((O) => Mt(O) || ye(O)), p = () => e.map((O) => {
      if (ie(O)) return O.value;
      if (Mt(O)) return h(O);
      if (I(O)) return f ? f(O, 2) : O();
    })) : I(e) ? t ? p = f ? () => f(e, 2) : e : p = () => {
      if (S) {
        He();
        try {
          S();
        } finally {
          je();
        }
      }
      const O = tt;
      tt = u;
      try {
        return f ? f(e, 3, [
          E
        ]) : e(E);
      } finally {
        tt = O;
      }
    } : p = Ae, t && s) {
      const O = p, J = s === true ? 1 / 0 : s;
      p = () => Ve(O(), J);
    }
    const Z = _i(), V = () => {
      u.stop(), Z && Z.active && Jn(Z.effects, u);
    };
    if (i && t) {
      const O = t;
      t = (...J) => {
        O(...J), V();
      };
    }
    let G = L ? new Array(e.length).fill(Kt) : Kt;
    const Y = (O) => {
      if (!(!(u.flags & 1) || !u.dirty && !O)) if (t) {
        const J = u.run();
        if (s || B || (L ? J.some((Se, me) => Ye(Se, G[me])) : Ye(J, G))) {
          S && S();
          const Se = tt;
          tt = u;
          try {
            const me = [
              J,
              G === Kt ? void 0 : L && G[0] === Kt ? [] : G,
              E
            ];
            G = J, f ? f(t, 3, me) : t(...me);
          } finally {
            tt = Se;
          }
        }
      } else u.run();
    };
    return a && a(Y), u = new es(p), u.scheduler = o ? () => o(Y, false) : Y, E = (O) => ji(O, false, u), S = u.onStop = () => {
      const O = on.get(u);
      if (O) {
        if (f) f(O, 4);
        else for (const J of O) J();
        on.delete(u);
      }
    }, t ? r ? Y(true) : G = u.run() : o ? o(Y.bind(null, true), true) : u.run(), V.pause = u.pause.bind(u), V.resume = u.resume.bind(u), V.stop = V, V;
  }
  function Ve(e, t = 1 / 0, n) {
    if (t <= 0 || !k(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
    if (n.add(e), t--, ie(e)) Ve(e.value, t, n);
    else if (F(e)) for (let r = 0; r < e.length; r++) Ve(e[r], t, n);
    else if (ti(e) || Ct(e)) e.forEach((r) => {
      Ve(r, t, n);
    });
    else if (si(e)) {
      for (const r in e) Ve(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && Ve(e[r], t, n);
    }
    return e;
  }
  function Vt(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (s) {
      gn(s, t, n);
    }
  }
  function Ie(e, t, n, r) {
    if (I(e)) {
      const s = Vt(e, t, n, r);
      return s && kr(s) && s.catch((i) => {
        gn(i, t, n);
      }), s;
    }
    if (F(e)) {
      const s = [];
      for (let i = 0; i < e.length; i++) s.push(Ie(e[i], t, n, r));
      return s;
    }
  }
  function gn(e, t, n, r = true) {
    const s = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: o } = t && t.appContext.config || W;
    if (t) {
      let a = t.parent;
      const f = t.proxy, h = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; a; ) {
        const u = a.ec;
        if (u) {
          for (let p = 0; p < u.length; p++) if (u[p](e, f, h) === false) return;
        }
        a = a.parent;
      }
      if (i) {
        He(), Vt(i, null, 10, [
          e,
          f,
          h
        ]), je();
        return;
      }
    }
    Wi(e, n, s, r, o);
  }
  function Wi(e, t, n, r = true, s = false) {
    if (s) throw e;
    console.error(e);
  }
  const ce = [];
  let Oe = -1;
  const ut = [];
  let Ke = null, at = 0;
  const gs = Promise.resolve();
  let ln = null;
  function Hn(e) {
    const t = ln || gs;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function Gi(e) {
    let t = Oe + 1, n = ce.length;
    for (; t < n; ) {
      const r = t + n >>> 1, s = ce[r], i = Lt(s);
      i < e || i === e && s.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function ar(e) {
    if (!(e.flags & 1)) {
      const t = Lt(e), n = ce[ce.length - 1];
      !n || !(e.flags & 2) && t >= Lt(n) ? ce.push(e) : ce.splice(Gi(t), 0, e), e.flags |= 1, bs();
    }
  }
  function bs() {
    ln || (ln = gs.then(vs));
  }
  function Ki(e) {
    F(e) ? ut.push(...e) : Ke && e.id === -1 ? Ke.splice(at + 1, 0, e) : e.flags & 1 || (ut.push(e), e.flags |= 1), bs();
  }
  function wr(e, t, n = Oe + 1) {
    for (; n < ce.length; n++) {
      const r = ce[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        ce.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function ms(e) {
    if (ut.length) {
      const t = [
        ...new Set(ut)
      ].sort((n, r) => Lt(n) - Lt(r));
      if (ut.length = 0, Ke) {
        Ke.push(...t);
        return;
      }
      for (Ke = t, at = 0; at < Ke.length; at++) {
        const n = Ke[at];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      Ke = null, at = 0;
    }
  }
  const Lt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function vs(e) {
    try {
      for (Oe = 0; Oe < ce.length; Oe++) {
        const t = ce[Oe];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Vt(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; Oe < ce.length; Oe++) {
        const t = ce[Oe];
        t && (t.flags &= -2);
      }
      Oe = -1, ce.length = 0, ms(), ln = null, (ce.length || ut.length) && vs();
    }
  }
  let ve = null, xs = null;
  function an(e) {
    const t = ve;
    return ve = e, xs = e && e.type.__scopeId || null, t;
  }
  function qi(e, t = ve, n) {
    if (!t || e._n) return e;
    const r = (...s) => {
      r._d && Ar(-1);
      const i = an(t);
      let o;
      try {
        o = e(...s);
      } finally {
        an(i), r._d && Ar(1);
      }
      return o;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function Tn(e, t) {
    if (ve === null) return e;
    const n = xn(ve), r = e.dirs || (e.dirs = []);
    for (let s = 0; s < t.length; s++) {
      let [i, o, a, f = W] = t[s];
      i && (I(i) && (i = {
        mounted: i,
        updated: i
      }), i.deep && Ve(o), r.push({
        dir: i,
        instance: n,
        value: o,
        oldValue: void 0,
        arg: a,
        modifiers: f
      }));
    }
    return e;
  }
  function Qe(e, t, n, r) {
    const s = e.dirs, i = t && t.dirs;
    for (let o = 0; o < s.length; o++) {
      const a = s[o];
      i && (a.oldValue = i[o].value);
      let f = a.dir[r];
      f && (He(), Ie(f, n, 8, [
        e.el,
        a,
        e,
        t
      ]), je());
    }
  }
  const Yi = Symbol("_vte"), Xi = (e) => e.__isTeleport;
  function cr(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, cr(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function ys(e, t) {
    return I(e) ? oe({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function ws(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function Ot(e, t, n, r, s = false) {
    if (F(e)) {
      e.forEach((B, L) => Ot(B, t && (F(t) ? t[L] : t), n, r, s));
      return;
    }
    if (Rt(r) && !s) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Ot(e, t, n, r.component.subTree);
      return;
    }
    const i = r.shapeFlag & 4 ? xn(r.component) : r.el, o = s ? null : i, { i: a, r: f } = e, h = t && t.r, u = a.refs === W ? a.refs = {} : a.refs, p = a.setupState, S = H(p), E = p === W ? () => false : (B) => j(S, B);
    if (h != null && h !== f && (ee(h) ? (u[h] = null, E(h) && (p[h] = null)) : ie(h) && (h.value = null)), I(f)) Vt(f, a, 12, [
      o,
      u
    ]);
    else {
      const B = ee(f), L = ie(f);
      if (B || L) {
        const Z = () => {
          if (e.f) {
            const V = B ? E(f) ? p[f] : u[f] : f.value;
            s ? F(V) && Jn(V, i) : F(V) ? V.includes(i) || V.push(i) : B ? (u[f] = [
              i
            ], E(f) && (p[f] = u[f])) : (f.value = [
              i
            ], e.k && (u[e.k] = f.value));
          } else B ? (u[f] = o, E(f) && (p[f] = o)) : L && (f.value = o, e.k && (u[e.k] = o));
        };
        o ? (Z.id = -1, ge(Z, n)) : Z();
      }
    }
  }
  _n().requestIdleCallback;
  _n().cancelIdleCallback;
  const Rt = (e) => !!e.type.__asyncLoader, Ss = (e) => e.type.__isKeepAlive;
  function Ji(e, t) {
    Cs(e, "a", t);
  }
  function ki(e, t) {
    Cs(e, "da", t);
  }
  function Cs(e, t, n = fe) {
    const r = e.__wdc || (e.__wdc = () => {
      let s = n;
      for (; s; ) {
        if (s.isDeactivated) return;
        s = s.parent;
      }
      return e();
    });
    if (bn(t, r, n), n) {
      let s = n.parent;
      for (; s && s.parent; ) Ss(s.parent.vnode) && Zi(r, t, n, s), s = s.parent;
    }
  }
  function Zi(e, t, n, r) {
    const s = bn(t, e, r, true);
    ur(() => {
      Jn(r[t], s);
    }, n);
  }
  function bn(e, t, n = fe, r = false) {
    if (n) {
      const s = n[e] || (n[e] = []), i = t.__weh || (t.__weh = (...o) => {
        He();
        const a = Ht(n), f = Ie(t, n, e, o);
        return a(), je(), f;
      });
      return r ? s.unshift(i) : s.push(i), i;
    }
  }
  const $e = (e) => (t, n = fe) => {
    (!Nt || e === "sp") && bn(e, (...r) => t(...r), n);
  }, Qi = $e("bm"), fr = $e("m"), eo = $e("bu"), to = $e("u"), no = $e("bum"), ur = $e("um"), ro = $e("sp"), so = $e("rtg"), io = $e("rtc");
  function oo(e, t = fe) {
    bn("ec", e, t);
  }
  const lo = Symbol.for("v-ndc"), jn = (e) => e ? Gs(e) ? xn(e) : jn(e.parent) : null, At = oe(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => jn(e.parent),
    $root: (e) => jn(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Ts(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      ar(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Hn.bind(e.proxy)),
    $watch: (e) => Ro.bind(e)
  }), Pn = (e, t) => e !== W && !e.__isScriptSetup && j(e, t), ao = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: r, data: s, props: i, accessCache: o, type: a, appContext: f } = e;
      let h;
      if (t[0] !== "$") {
        const E = o[t];
        if (E !== void 0) switch (E) {
          case 1:
            return r[t];
          case 2:
            return s[t];
          case 4:
            return n[t];
          case 3:
            return i[t];
        }
        else {
          if (Pn(r, t)) return o[t] = 1, r[t];
          if (s !== W && j(s, t)) return o[t] = 2, s[t];
          if ((h = e.propsOptions[0]) && j(h, t)) return o[t] = 3, i[t];
          if (n !== W && j(n, t)) return o[t] = 4, n[t];
          $n && (o[t] = 0);
        }
      }
      const u = At[t];
      let p, S;
      if (u) return t === "$attrs" && se(e.attrs, "get", ""), u(e);
      if ((p = a.__cssModules) && (p = p[t])) return p;
      if (n !== W && j(n, t)) return o[t] = 4, n[t];
      if (S = f.config.globalProperties, j(S, t)) return S[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: s, ctx: i } = e;
      return Pn(s, t) ? (s[t] = n, true) : r !== W && j(r, t) ? (r[t] = n, true) : j(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (i[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: s, propsOptions: i } }, o) {
      let a;
      return !!n[o] || e !== W && j(e, o) || Pn(t, o) || (a = i[0]) && j(a, o) || j(r, o) || j(At, o) || j(s.config.globalProperties, o);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : j(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function Sr(e) {
    return F(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  let $n = true;
  function co(e) {
    const t = Ts(e), n = e.proxy, r = e.ctx;
    $n = false, t.beforeCreate && Cr(t.beforeCreate, e, "bc");
    const { data: s, computed: i, methods: o, watch: a, provide: f, inject: h, created: u, beforeMount: p, mounted: S, beforeUpdate: E, updated: B, activated: L, deactivated: Z, beforeDestroy: V, beforeUnmount: G, destroyed: Y, unmounted: O, render: J, renderTracked: Se, renderTriggered: me, errorCaptured: Ce, serverPrefetch: it, expose: Fe, inheritAttrs: ke, components: Ze, directives: pe, filters: _t } = t;
    if (h && fo(h, r, null), o) for (const T in o) {
      const U = o[T];
      I(U) && (r[T] = U.bind(n));
    }
    if (s) {
      const T = s.call(n, n);
      k(T) && (e.data = ir(T));
    }
    if ($n = true, i) for (const T in i) {
      const U = i[T], X = I(U) ? U.bind(n, n) : I(U.get) ? U.get.bind(n, n) : Ae, te = !I(U) && I(U.set) ? U.set.bind(n) : Ae, Q = Qo({
        get: X,
        set: te
      });
      Object.defineProperty(r, T, {
        enumerable: true,
        configurable: true,
        get: () => Q.value,
        set: (re) => Q.value = re
      });
    }
    if (a) for (const T in a) Es(a[T], r, n, T);
    if (f) {
      const T = I(f) ? f.call(n) : f;
      Reflect.ownKeys(T).forEach((U) => {
        bo(U, T[U]);
      });
    }
    u && Cr(u, e, "c");
    function C(T, U) {
      F(U) ? U.forEach((X) => T(X.bind(n))) : U && T(U.bind(n));
    }
    if (C(Qi, p), C(fr, S), C(eo, E), C(to, B), C(Ji, L), C(ki, Z), C(oo, Ce), C(io, Se), C(so, me), C(no, G), C(ur, O), C(ro, it), F(Fe)) if (Fe.length) {
      const T = e.exposed || (e.exposed = {});
      Fe.forEach((U) => {
        Object.defineProperty(T, U, {
          get: () => n[U],
          set: (X) => n[U] = X,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    J && e.render === Ae && (e.render = J), ke != null && (e.inheritAttrs = ke), Ze && (e.components = Ze), pe && (e.directives = pe), it && ws(e);
  }
  function fo(e, t, n = Ae) {
    F(e) && (e = Wn(e));
    for (const r in e) {
      const s = e[r];
      let i;
      k(s) ? "default" in s ? i = Jt(s.from || r, s.default, true) : i = Jt(s.from || r) : i = Jt(s), ie(i) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => i.value,
        set: (o) => i.value = o
      }) : t[r] = i;
    }
  }
  function Cr(e, t, n) {
    Ie(F(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function Es(e, t, n, r) {
    let s = r.includes(".") ? Ns(n, r) : () => n[r];
    if (ee(e)) {
      const i = t[e];
      I(i) && On(s, i);
    } else if (I(e)) On(s, e.bind(n));
    else if (k(e)) if (F(e)) e.forEach((i) => Es(i, t, n, r));
    else {
      const i = I(e.handler) ? e.handler.bind(n) : t[e.handler];
      I(i) && On(s, i, e);
    }
  }
  function Ts(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: s, optionsCache: i, config: { optionMergeStrategies: o } } = e.appContext, a = i.get(t);
    let f;
    return a ? f = a : !s.length && !n && !r ? f = t : (f = {}, s.length && s.forEach((h) => cn(f, h, o, true)), cn(f, t, o)), k(t) && i.set(t, f), f;
  }
  function cn(e, t, n, r = false) {
    const { mixins: s, extends: i } = t;
    i && cn(e, i, n, true), s && s.forEach((o) => cn(e, o, n, true));
    for (const o in t) if (!(r && o === "expose")) {
      const a = uo[o] || n && n[o];
      e[o] = a ? a(e[o], t[o]) : t[o];
    }
    return e;
  }
  const uo = {
    data: Er,
    props: Tr,
    emits: Tr,
    methods: St,
    computed: St,
    beforeCreate: le,
    created: le,
    beforeMount: le,
    mounted: le,
    beforeUpdate: le,
    updated: le,
    beforeDestroy: le,
    beforeUnmount: le,
    destroyed: le,
    unmounted: le,
    activated: le,
    deactivated: le,
    errorCaptured: le,
    serverPrefetch: le,
    components: St,
    directives: St,
    watch: po,
    provide: Er,
    inject: ho
  };
  function Er(e, t) {
    return t ? e ? function() {
      return oe(I(e) ? e.call(this, this) : e, I(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function ho(e, t) {
    return St(Wn(e), Wn(t));
  }
  function Wn(e) {
    if (F(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
      return t;
    }
    return e;
  }
  function le(e, t) {
    return e ? [
      ...new Set([].concat(e, t))
    ] : t;
  }
  function St(e, t) {
    return e ? oe(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function Tr(e, t) {
    return e ? F(e) && F(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : oe(/* @__PURE__ */ Object.create(null), Sr(e), Sr(t ?? {})) : t;
  }
  function po(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = oe(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = le(e[r], t[r]);
    return n;
  }
  function Ps() {
    return {
      app: null,
      config: {
        isNativeTag: Qs,
        performance: false,
        globalProperties: {},
        optionMergeStrategies: {},
        errorHandler: void 0,
        warnHandler: void 0,
        compilerOptions: {}
      },
      mixins: [],
      components: {},
      directives: {},
      provides: /* @__PURE__ */ Object.create(null),
      optionsCache: /* @__PURE__ */ new WeakMap(),
      propsCache: /* @__PURE__ */ new WeakMap(),
      emitsCache: /* @__PURE__ */ new WeakMap()
    };
  }
  let _o = 0;
  function go(e, t) {
    return function(r, s = null) {
      I(r) || (r = oe({}, r)), s != null && !k(s) && (s = null);
      const i = Ps(), o = /* @__PURE__ */ new WeakSet(), a = [];
      let f = false;
      const h = i.app = {
        _uid: _o++,
        _component: r,
        _props: s,
        _container: null,
        _context: i,
        _instance: null,
        version: el,
        get config() {
          return i.config;
        },
        set config(u) {
        },
        use(u, ...p) {
          return o.has(u) || (u && I(u.install) ? (o.add(u), u.install(h, ...p)) : I(u) && (o.add(u), u(h, ...p))), h;
        },
        mixin(u) {
          return i.mixins.includes(u) || i.mixins.push(u), h;
        },
        component(u, p) {
          return p ? (i.components[u] = p, h) : i.components[u];
        },
        directive(u, p) {
          return p ? (i.directives[u] = p, h) : i.directives[u];
        },
        mount(u, p, S) {
          if (!f) {
            const E = h._ceVNode || we(r, s);
            return E.appContext = i, S === true ? S = "svg" : S === false && (S = void 0), e(E, u, S), f = true, h._container = u, u.__vue_app__ = h, xn(E.component);
          }
        },
        onUnmount(u) {
          a.push(u);
        },
        unmount() {
          f && (Ie(a, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
        },
        provide(u, p) {
          return i.provides[u] = p, h;
        },
        runWithContext(u) {
          const p = dt;
          dt = h;
          try {
            return u();
          } finally {
            dt = p;
          }
        }
      };
      return h;
    };
  }
  let dt = null;
  function bo(e, t) {
    if (fe) {
      let n = fe.provides;
      const r = fe.parent && fe.parent.provides;
      r === n && (n = fe.provides = Object.create(r)), n[e] = t;
    }
  }
  function Jt(e, t, n = false) {
    const r = qo();
    if (r || dt) {
      let s = dt ? dt._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (s && e in s) return s[e];
      if (arguments.length > 1) return n && I(t) ? t.call(r && r.proxy) : t;
    }
  }
  const Ms = {}, Os = () => Object.create(Ms), Rs = (e) => Object.getPrototypeOf(e) === Ms;
  function mo(e, t, n, r = false) {
    const s = {}, i = Os();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), As(e, t, s, i);
    for (const o in e.propsOptions[0]) o in s || (s[o] = void 0);
    n ? e.props = r ? s : Di(s) : e.type.props ? e.props = s : e.props = i, e.attrs = i;
  }
  function vo(e, t, n, r) {
    const { props: s, attrs: i, vnode: { patchFlag: o } } = e, a = H(s), [f] = e.propsOptions;
    let h = false;
    if ((r || o > 0) && !(o & 16)) {
      if (o & 8) {
        const u = e.vnode.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          let S = u[p];
          if (mn(e.emitsOptions, S)) continue;
          const E = t[S];
          if (f) if (j(i, S)) E !== i[S] && (i[S] = E, h = true);
          else {
            const B = Xe(S);
            s[B] = Gn(f, a, B, E, e, false);
          }
          else E !== i[S] && (i[S] = E, h = true);
        }
      }
    } else {
      As(e, t, s, i) && (h = true);
      let u;
      for (const p in a) (!t || !j(t, p) && ((u = st(p)) === p || !j(t, u))) && (f ? n && (n[p] !== void 0 || n[u] !== void 0) && (s[p] = Gn(f, a, p, void 0, e, true)) : delete s[p]);
      if (i !== a) for (const p in i) (!t || !j(t, p)) && (delete i[p], h = true);
    }
    h && Ne(e.attrs, "set", "");
  }
  function As(e, t, n, r) {
    const [s, i] = e.propsOptions;
    let o = false, a;
    if (t) for (let f in t) {
      if (Et(f)) continue;
      const h = t[f];
      let u;
      s && j(s, u = Xe(f)) ? !i || !i.includes(u) ? n[u] = h : (a || (a = {}))[u] = h : mn(e.emitsOptions, f) || (!(f in r) || h !== r[f]) && (r[f] = h, o = true);
    }
    if (i) {
      const f = H(n), h = a || W;
      for (let u = 0; u < i.length; u++) {
        const p = i[u];
        n[p] = Gn(s, f, p, h[p], e, !j(h, p));
      }
    }
    return o;
  }
  function Gn(e, t, n, r, s, i) {
    const o = e[n];
    if (o != null) {
      const a = j(o, "default");
      if (a && r === void 0) {
        const f = o.default;
        if (o.type !== Function && !o.skipFactory && I(f)) {
          const { propsDefaults: h } = s;
          if (n in h) r = h[n];
          else {
            const u = Ht(s);
            r = h[n] = f.call(null, t), u();
          }
        } else r = f;
        s.ce && s.ce._setProp(n, r);
      }
      o[0] && (i && !a ? r = false : o[1] && (r === "" || r === st(n)) && (r = true));
    }
    return r;
  }
  const xo = /* @__PURE__ */ new WeakMap();
  function Is(e, t, n = false) {
    const r = n ? xo : t.propsCache, s = r.get(e);
    if (s) return s;
    const i = e.props, o = {}, a = [];
    let f = false;
    if (!I(e)) {
      const u = (p) => {
        f = true;
        const [S, E] = Is(p, t, true);
        oe(o, S), E && a.push(...E);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!i && !f) return k(e) && r.set(e, ct), ct;
    if (F(i)) for (let u = 0; u < i.length; u++) {
      const p = Xe(i[u]);
      Pr(p) && (o[p] = W);
    }
    else if (i) for (const u in i) {
      const p = Xe(u);
      if (Pr(p)) {
        const S = i[u], E = o[p] = F(S) || I(S) ? {
          type: S
        } : oe({}, S), B = E.type;
        let L = false, Z = true;
        if (F(B)) for (let V = 0; V < B.length; ++V) {
          const G = B[V], Y = I(G) && G.name;
          if (Y === "Boolean") {
            L = true;
            break;
          } else Y === "String" && (Z = false);
        }
        else L = I(B) && B.name === "Boolean";
        E[0] = L, E[1] = Z, (L || j(E, "default")) && a.push(p);
      }
    }
    const h = [
      o,
      a
    ];
    return k(e) && r.set(e, h), h;
  }
  function Pr(e) {
    return e[0] !== "$" && !Et(e);
  }
  const dr = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", hr = (e) => F(e) ? e.map(Re) : [
    Re(e)
  ], yo = (e, t, n) => {
    if (t._n) return t;
    const r = qi((...s) => hr(t(...s)), n);
    return r._c = false, r;
  }, Fs = (e, t, n) => {
    const r = e._ctx;
    for (const s in e) {
      if (dr(s)) continue;
      const i = e[s];
      if (I(i)) t[s] = yo(s, i, r);
      else if (i != null) {
        const o = hr(i);
        t[s] = () => o;
      }
    }
  }, Ds = (e, t) => {
    const n = hr(t);
    e.slots.default = () => n;
  }, Us = (e, t, n) => {
    for (const r in t) (n || !dr(r)) && (e[r] = t[r]);
  }, wo = (e, t, n) => {
    const r = e.slots = Os();
    if (e.vnode.shapeFlag & 32) {
      const s = t.__;
      s && Un(r, "__", s, true);
      const i = t._;
      i ? (Us(r, t, n), n && Un(r, "_", i, true)) : Fs(t, r);
    } else t && Ds(e, t);
  }, So = (e, t, n) => {
    const { vnode: r, slots: s } = e;
    let i = true, o = W;
    if (r.shapeFlag & 32) {
      const a = t._;
      a ? n && a === 1 ? i = false : Us(s, t, n) : (i = !t.$stable, Fs(t, s)), o = t;
    } else t && (Ds(e, t), o = {
      default: 1
    });
    if (i) for (const a in s) !dr(a) && o[a] == null && delete s[a];
  }, ge = Lo;
  function Co(e) {
    return Eo(e);
  }
  function Eo(e, t) {
    const n = _n();
    n.__VUE__ = true;
    const { insert: r, remove: s, patchProp: i, createElement: o, createText: a, createComment: f, setText: h, setElementText: u, parentNode: p, nextSibling: S, setScopeId: E = Ae, insertStaticContent: B } = e, L = (l, c, d, b = null, _ = null, g = null, y = void 0, x = null, v = !!c.dynamicChildren) => {
      if (l === c) return;
      l && !yt(l, c) && (b = Ge(l), re(l, _, g, true), l = null), c.patchFlag === -2 && (v = false, c.dynamicChildren = null);
      const { type: m, ref: M, shapeFlag: w } = c;
      switch (m) {
        case vn:
          Z(l, c, d, b);
          break;
        case Je:
          V(l, c, d, b);
          break;
        case kt:
          l == null && G(c, d, b, y);
          break;
        case Be:
          Ze(l, c, d, b, _, g, y, x, v);
          break;
        default:
          w & 1 ? J(l, c, d, b, _, g, y, x, v) : w & 6 ? pe(l, c, d, b, _, g, y, x, v) : (w & 64 || w & 128) && m.process(l, c, d, b, _, g, y, x, v, mt);
      }
      M != null && _ ? Ot(M, l && l.ref, g, c || l, !c) : M == null && l && l.ref != null && Ot(l.ref, null, g, l, true);
    }, Z = (l, c, d, b) => {
      if (l == null) r(c.el = a(c.children), d, b);
      else {
        const _ = c.el = l.el;
        c.children !== l.children && h(_, c.children);
      }
    }, V = (l, c, d, b) => {
      l == null ? r(c.el = f(c.children || ""), d, b) : c.el = l.el;
    }, G = (l, c, d, b) => {
      [l.el, l.anchor] = B(l.children, c, d, b, l.el, l.anchor);
    }, Y = ({ el: l, anchor: c }, d, b) => {
      let _;
      for (; l && l !== c; ) _ = S(l), r(l, d, b), l = _;
      r(c, d, b);
    }, O = ({ el: l, anchor: c }) => {
      let d;
      for (; l && l !== c; ) d = S(l), s(l), l = d;
      s(c);
    }, J = (l, c, d, b, _, g, y, x, v) => {
      c.type === "svg" ? y = "svg" : c.type === "math" && (y = "mathml"), l == null ? Se(c, d, b, _, g, y, x, v) : it(l, c, _, g, y, x, v);
    }, Se = (l, c, d, b, _, g, y, x) => {
      let v, m;
      const { props: M, shapeFlag: w, transition: P, dirs: R } = l;
      if (v = l.el = o(l.type, g, M && M.is, M), w & 8 ? u(v, l.children) : w & 16 && Ce(l.children, v, null, b, _, Mn(l, g), y, x), R && Qe(l, null, b, "created"), me(v, l, l.scopeId, y, b), M) {
        for (const K in M) K !== "value" && !Et(K) && i(v, K, null, M[K], g, b);
        "value" in M && i(v, "value", null, M.value, g), (m = M.onVnodeBeforeMount) && Me(m, b, l);
      }
      R && Qe(l, null, b, "beforeMount");
      const N = To(_, P);
      N && P.beforeEnter(v), r(v, c, d), ((m = M && M.onVnodeMounted) || N || R) && ge(() => {
        m && Me(m, b, l), N && P.enter(v), R && Qe(l, null, b, "mounted");
      }, _);
    }, me = (l, c, d, b, _) => {
      if (d && E(l, d), b) for (let g = 0; g < b.length; g++) E(l, b[g]);
      if (_) {
        let g = _.subTree;
        if (c === g || Hs(g.type) && (g.ssContent === c || g.ssFallback === c)) {
          const y = _.vnode;
          me(l, y, y.scopeId, y.slotScopeIds, _.parent);
        }
      }
    }, Ce = (l, c, d, b, _, g, y, x, v = 0) => {
      for (let m = v; m < l.length; m++) {
        const M = l[m] = x ? qe(l[m]) : Re(l[m]);
        L(null, M, c, d, b, _, g, y, x);
      }
    }, it = (l, c, d, b, _, g, y) => {
      const x = c.el = l.el;
      let { patchFlag: v, dynamicChildren: m, dirs: M } = c;
      v |= l.patchFlag & 16;
      const w = l.props || W, P = c.props || W;
      let R;
      if (d && et(d, false), (R = P.onVnodeBeforeUpdate) && Me(R, d, c, l), M && Qe(c, l, d, "beforeUpdate"), d && et(d, true), (w.innerHTML && P.innerHTML == null || w.textContent && P.textContent == null) && u(x, ""), m ? Fe(l.dynamicChildren, m, x, d, b, Mn(c, _), g) : y || U(l, c, x, null, d, b, Mn(c, _), g, false), v > 0) {
        if (v & 16) ke(x, w, P, d, _);
        else if (v & 2 && w.class !== P.class && i(x, "class", null, P.class, _), v & 4 && i(x, "style", w.style, P.style, _), v & 8) {
          const N = c.dynamicProps;
          for (let K = 0; K < N.length; K++) {
            const $ = N[K], ue = w[$], de = P[$];
            (de !== ue || $ === "value") && i(x, $, ue, de, _, d);
          }
        }
        v & 1 && l.children !== c.children && u(x, c.children);
      } else !y && m == null && ke(x, w, P, d, _);
      ((R = P.onVnodeUpdated) || M) && ge(() => {
        R && Me(R, d, c, l), M && Qe(c, l, d, "updated");
      }, b);
    }, Fe = (l, c, d, b, _, g, y) => {
      for (let x = 0; x < c.length; x++) {
        const v = l[x], m = c[x], M = v.el && (v.type === Be || !yt(v, m) || v.shapeFlag & 198) ? p(v.el) : d;
        L(v, m, M, null, b, _, g, y, true);
      }
    }, ke = (l, c, d, b, _) => {
      if (c !== d) {
        if (c !== W) for (const g in c) !Et(g) && !(g in d) && i(l, g, c[g], null, _, b);
        for (const g in d) {
          if (Et(g)) continue;
          const y = d[g], x = c[g];
          y !== x && g !== "value" && i(l, g, x, y, _, b);
        }
        "value" in d && i(l, "value", c.value, d.value, _);
      }
    }, Ze = (l, c, d, b, _, g, y, x, v) => {
      const m = c.el = l ? l.el : a(""), M = c.anchor = l ? l.anchor : a("");
      let { patchFlag: w, dynamicChildren: P, slotScopeIds: R } = c;
      R && (x = x ? x.concat(R) : R), l == null ? (r(m, d, b), r(M, d, b), Ce(c.children || [], d, M, _, g, y, x, v)) : w > 0 && w & 64 && P && l.dynamicChildren ? (Fe(l.dynamicChildren, P, d, _, g, y, x), (c.key != null || _ && c === _.subTree) && zs(l, c, true)) : U(l, c, d, M, _, g, y, x, v);
    }, pe = (l, c, d, b, _, g, y, x, v) => {
      c.slotScopeIds = x, l == null ? c.shapeFlag & 512 ? _.ctx.activate(c, d, b, y, v) : _t(c, d, b, _, g, y, v) : D(l, c, v);
    }, _t = (l, c, d, b, _, g, y) => {
      const x = l.component = Ko(l, b, _);
      if (Ss(l) && (x.ctx.renderer = mt), Yo(x, false, y), x.asyncDep) {
        if (_ && _.registerDep(x, C, y), !l.el) {
          const v = x.subTree = we(Je);
          V(null, v, c, d), l.placeholder = v.el;
        }
      } else C(x, l, c, d, _, g, y);
    }, D = (l, c, d) => {
      const b = c.component = l.component;
      if (Uo(l, c, d)) if (b.asyncDep && !b.asyncResolved) {
        T(b, c, d);
        return;
      } else b.next = c, b.update();
      else c.el = l.el, b.vnode = c;
    }, C = (l, c, d, b, _, g, y) => {
      const x = () => {
        if (l.isMounted) {
          let { next: w, bu: P, u: R, parent: N, vnode: K } = l;
          {
            const Te = Ls(l);
            if (Te) {
              w && (w.el = K.el, T(l, w, y)), Te.asyncDep.then(() => {
                l.isUnmounted || x();
              });
              return;
            }
          }
          let $ = w, ue;
          et(l, false), w ? (w.el = K.el, T(l, w, y)) : w = K, P && wn(P), (ue = w.props && w.props.onVnodeBeforeUpdate) && Me(ue, N, w, K), et(l, true);
          const de = Or(l), Ee = l.subTree;
          l.subTree = de, L(Ee, de, p(Ee.el), Ge(Ee), l, _, g), w.el = de.el, $ === null && zo(l, de.el), R && ge(R, _), (ue = w.props && w.props.onVnodeUpdated) && ge(() => Me(ue, N, w, K), _);
        } else {
          let w;
          const { el: P, props: R } = c, { bm: N, m: K, parent: $, root: ue, type: de } = l, Ee = Rt(c);
          et(l, false), N && wn(N), !Ee && (w = R && R.onVnodeBeforeMount) && Me(w, $, c), et(l, true);
          {
            ue.ce && ue.ce._def.shadowRoot !== false && ue.ce._injectChildStyle(de);
            const Te = l.subTree = Or(l);
            L(null, Te, d, b, l, _, g), c.el = Te.el;
          }
          if (K && ge(K, _), !Ee && (w = R && R.onVnodeMounted)) {
            const Te = c;
            ge(() => Me(w, $, Te), _);
          }
          (c.shapeFlag & 256 || $ && Rt($.vnode) && $.vnode.shapeFlag & 256) && l.a && ge(l.a, _), l.isMounted = true, c = d = b = null;
        }
      };
      l.scope.on();
      const v = l.effect = new es(x);
      l.scope.off();
      const m = l.update = v.run.bind(v), M = l.job = v.runIfDirty.bind(v);
      M.i = l, M.id = l.uid, v.scheduler = () => ar(M), et(l, true), m();
    }, T = (l, c, d) => {
      c.component = l;
      const b = l.vnode.props;
      l.vnode = c, l.next = null, vo(l, c.props, b, d), So(l, c.children, d), He(), wr(l), je();
    }, U = (l, c, d, b, _, g, y, x, v = false) => {
      const m = l && l.children, M = l ? l.shapeFlag : 0, w = c.children, { patchFlag: P, shapeFlag: R } = c;
      if (P > 0) {
        if (P & 128) {
          te(m, w, d, b, _, g, y, x, v);
          return;
        } else if (P & 256) {
          X(m, w, d, b, _, g, y, x, v);
          return;
        }
      }
      R & 8 ? (M & 16 && Ue(m, _, g), w !== m && u(d, w)) : M & 16 ? R & 16 ? te(m, w, d, b, _, g, y, x, v) : Ue(m, _, g, true) : (M & 8 && u(d, ""), R & 16 && Ce(w, d, b, _, g, y, x, v));
    }, X = (l, c, d, b, _, g, y, x, v) => {
      l = l || ct, c = c || ct;
      const m = l.length, M = c.length, w = Math.min(m, M);
      let P;
      for (P = 0; P < w; P++) {
        const R = c[P] = v ? qe(c[P]) : Re(c[P]);
        L(l[P], R, d, null, _, g, y, x, v);
      }
      m > M ? Ue(l, _, g, true, false, w) : Ce(c, d, b, _, g, y, x, v, w);
    }, te = (l, c, d, b, _, g, y, x, v) => {
      let m = 0;
      const M = c.length;
      let w = l.length - 1, P = M - 1;
      for (; m <= w && m <= P; ) {
        const R = l[m], N = c[m] = v ? qe(c[m]) : Re(c[m]);
        if (yt(R, N)) L(R, N, d, null, _, g, y, x, v);
        else break;
        m++;
      }
      for (; m <= w && m <= P; ) {
        const R = l[w], N = c[P] = v ? qe(c[P]) : Re(c[P]);
        if (yt(R, N)) L(R, N, d, null, _, g, y, x, v);
        else break;
        w--, P--;
      }
      if (m > w) {
        if (m <= P) {
          const R = P + 1, N = R < M ? c[R].el : b;
          for (; m <= P; ) L(null, c[m] = v ? qe(c[m]) : Re(c[m]), d, N, _, g, y, x, v), m++;
        }
      } else if (m > P) for (; m <= w; ) re(l[m], _, g, true), m++;
      else {
        const R = m, N = m, K = /* @__PURE__ */ new Map();
        for (m = N; m <= P; m++) {
          const _e = c[m] = v ? qe(c[m]) : Re(c[m]);
          _e.key != null && K.set(_e.key, m);
        }
        let $, ue = 0;
        const de = P - N + 1;
        let Ee = false, Te = 0;
        const vt = new Array(de);
        for (m = 0; m < de; m++) vt[m] = 0;
        for (m = R; m <= w; m++) {
          const _e = l[m];
          if (ue >= de) {
            re(_e, _, g, true);
            continue;
          }
          let Pe;
          if (_e.key != null) Pe = K.get(_e.key);
          else for ($ = N; $ <= P; $++) if (vt[$ - N] === 0 && yt(_e, c[$])) {
            Pe = $;
            break;
          }
          Pe === void 0 ? re(_e, _, g, true) : (vt[Pe - N] = m + 1, Pe >= Te ? Te = Pe : Ee = true, L(_e, c[Pe], d, null, _, g, y, x, v), ue++);
        }
        const gr = Ee ? Po(vt) : ct;
        for ($ = gr.length - 1, m = de - 1; m >= 0; m--) {
          const _e = N + m, Pe = c[_e], br = c[_e + 1], mr = _e + 1 < M ? br.el || br.placeholder : b;
          vt[m] === 0 ? L(null, Pe, d, mr, _, g, y, x, v) : Ee && ($ < 0 || m !== gr[$] ? Q(Pe, d, mr, 2) : $--);
        }
      }
    }, Q = (l, c, d, b, _ = null) => {
      const { el: g, type: y, transition: x, children: v, shapeFlag: m } = l;
      if (m & 6) {
        Q(l.component.subTree, c, d, b);
        return;
      }
      if (m & 128) {
        l.suspense.move(c, d, b);
        return;
      }
      if (m & 64) {
        y.move(l, c, d, mt);
        return;
      }
      if (y === Be) {
        r(g, c, d);
        for (let w = 0; w < v.length; w++) Q(v[w], c, d, b);
        r(l.anchor, c, d);
        return;
      }
      if (y === kt) {
        Y(l, c, d);
        return;
      }
      if (b !== 2 && m & 1 && x) if (b === 0) x.beforeEnter(g), r(g, c, d), ge(() => x.enter(g), _);
      else {
        const { leave: w, delayLeave: P, afterLeave: R } = x, N = () => {
          l.ctx.isUnmounted ? s(g) : r(g, c, d);
        }, K = () => {
          w(g, () => {
            N(), R && R();
          });
        };
        P ? P(g, N, K) : K();
      }
      else r(g, c, d);
    }, re = (l, c, d, b = false, _ = false) => {
      const { type: g, props: y, ref: x, children: v, dynamicChildren: m, shapeFlag: M, patchFlag: w, dirs: P, cacheIndex: R } = l;
      if (w === -2 && (_ = false), x != null && (He(), Ot(x, null, d, l, true), je()), R != null && (c.renderCache[R] = void 0), M & 256) {
        c.ctx.deactivate(l);
        return;
      }
      const N = M & 1 && P, K = !Rt(l);
      let $;
      if (K && ($ = y && y.onVnodeBeforeUnmount) && Me($, c, l), M & 6) gt(l.component, d, b);
      else {
        if (M & 128) {
          l.suspense.unmount(d, b);
          return;
        }
        N && Qe(l, null, c, "beforeUnmount"), M & 64 ? l.type.remove(l, c, d, mt, b) : m && !m.hasOnce && (g !== Be || w > 0 && w & 64) ? Ue(m, c, d, false, true) : (g === Be && w & 384 || !_ && M & 16) && Ue(v, c, d), b && We(l);
      }
      (K && ($ = y && y.onVnodeUnmounted) || N) && ge(() => {
        $ && Me($, c, l), N && Qe(l, null, c, "unmounted");
      }, d);
    }, We = (l) => {
      const { type: c, el: d, anchor: b, transition: _ } = l;
      if (c === Be) {
        De(d, b);
        return;
      }
      if (c === kt) {
        O(l);
        return;
      }
      const g = () => {
        s(d), _ && !_.persisted && _.afterLeave && _.afterLeave();
      };
      if (l.shapeFlag & 1 && _ && !_.persisted) {
        const { leave: y, delayLeave: x } = _, v = () => y(d, g);
        x ? x(l.el, g, v) : v();
      } else g();
    }, De = (l, c) => {
      let d;
      for (; l !== c; ) d = S(l), s(l), l = d;
      s(c);
    }, gt = (l, c, d) => {
      const { bum: b, scope: _, job: g, subTree: y, um: x, m: v, a: m, parent: M, slots: { __: w } } = l;
      Mr(v), Mr(m), b && wn(b), M && F(w) && w.forEach((P) => {
        M.renderCache[P] = void 0;
      }), _.stop(), g && (g.flags |= 8, re(y, l, c, d)), x && ge(x, c), ge(() => {
        l.isUnmounted = true;
      }, c), c && c.pendingBranch && !c.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === c.pendingId && (c.deps--, c.deps === 0 && c.resolve());
    }, Ue = (l, c, d, b = false, _ = false, g = 0) => {
      for (let y = g; y < l.length; y++) re(l[y], c, d, b, _);
    }, Ge = (l) => {
      if (l.shapeFlag & 6) return Ge(l.component.subTree);
      if (l.shapeFlag & 128) return l.suspense.next();
      const c = S(l.anchor || l.el), d = c && c[Yi];
      return d ? S(d) : c;
    };
    let bt = false;
    const jt = (l, c, d) => {
      l == null ? c._vnode && re(c._vnode, null, null, true) : L(c._vnode || null, l, c, null, null, null, d), c._vnode = l, bt || (bt = true, wr(), ms(), bt = false);
    }, mt = {
      p: L,
      um: re,
      m: Q,
      r: We,
      mt: _t,
      mc: Ce,
      pc: U,
      pbc: Fe,
      n: Ge,
      o: e
    };
    return {
      render: jt,
      hydrate: void 0,
      createApp: go(jt)
    };
  }
  function Mn({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function et({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function To(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function zs(e, t, n = false) {
    const r = e.children, s = t.children;
    if (F(r) && F(s)) for (let i = 0; i < r.length; i++) {
      const o = r[i];
      let a = s[i];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = s[i] = qe(s[i]), a.el = o.el), !n && a.patchFlag !== -2 && zs(o, a)), a.type === vn && (a.el = o.el), a.type === Je && !a.el && (a.el = o.el);
    }
  }
  function Po(e) {
    const t = e.slice(), n = [
      0
    ];
    let r, s, i, o, a;
    const f = e.length;
    for (r = 0; r < f; r++) {
      const h = e[r];
      if (h !== 0) {
        if (s = n[n.length - 1], e[s] < h) {
          t[r] = s, n.push(r);
          continue;
        }
        for (i = 0, o = n.length - 1; i < o; ) a = i + o >> 1, e[n[a]] < h ? i = a + 1 : o = a;
        h < e[n[i]] && (i > 0 && (t[r] = n[i - 1]), n[i] = r);
      }
    }
    for (i = n.length, o = n[i - 1]; i-- > 0; ) n[i] = o, o = t[o];
    return n;
  }
  function Ls(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : Ls(t);
  }
  function Mr(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  const Mo = Symbol.for("v-scx"), Oo = () => Jt(Mo);
  function On(e, t, n) {
    return Bs(e, t, n);
  }
  function Bs(e, t, n = W) {
    const { immediate: r, deep: s, flush: i, once: o } = n, a = oe({}, n), f = t && r || !t && i !== "post";
    let h;
    if (Nt) {
      if (i === "sync") {
        const E = Oo();
        h = E.__watcherHandles || (E.__watcherHandles = []);
      } else if (!f) {
        const E = () => {
        };
        return E.stop = Ae, E.resume = Ae, E.pause = Ae, E;
      }
    }
    const u = fe;
    a.call = (E, B, L) => Ie(E, u, B, L);
    let p = false;
    i === "post" ? a.scheduler = (E) => {
      ge(E, u && u.suspense);
    } : i !== "sync" && (p = true, a.scheduler = (E, B) => {
      B ? E() : ar(E);
    }), a.augmentJob = (E) => {
      t && (E.flags |= 4), p && (E.flags |= 2, u && (E.id = u.uid, E.i = u));
    };
    const S = $i(e, t, a);
    return Nt && (h ? h.push(S) : f && S()), S;
  }
  function Ro(e, t, n) {
    const r = this.proxy, s = ee(e) ? e.includes(".") ? Ns(r, e) : () => r[e] : e.bind(r, r);
    let i;
    I(t) ? i = t : (i = t.handler, n = t);
    const o = Ht(this), a = Bs(s, i.bind(r), n);
    return o(), a;
  }
  function Ns(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let s = 0; s < n.length && r; s++) r = r[n[s]];
      return r;
    };
  }
  const Ao = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Xe(t)}Modifiers`] || e[`${st(t)}Modifiers`];
  function Io(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || W;
    let s = n;
    const i = t.startsWith("update:"), o = i && Ao(r, t.slice(7));
    o && (o.trim && (s = n.map((u) => ee(u) ? u.trim() : u)), o.number && (s = n.map(li)));
    let a, f = r[a = yn(t)] || r[a = yn(Xe(t))];
    !f && i && (f = r[a = yn(st(t))]), f && Ie(f, e, 6, s);
    const h = r[a + "Once"];
    if (h) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[a]) return;
      e.emitted[a] = true, Ie(h, e, 6, s);
    }
  }
  function Vs(e, t, n = false) {
    const r = t.emitsCache, s = r.get(e);
    if (s !== void 0) return s;
    const i = e.emits;
    let o = {}, a = false;
    if (!I(e)) {
      const f = (h) => {
        const u = Vs(h, t, true);
        u && (a = true, oe(o, u));
      };
      !n && t.mixins.length && t.mixins.forEach(f), e.extends && f(e.extends), e.mixins && e.mixins.forEach(f);
    }
    return !i && !a ? (k(e) && r.set(e, null), null) : (F(i) ? i.forEach((f) => o[f] = null) : oe(o, i), k(e) && r.set(e, o), o);
  }
  function mn(e, t) {
    return !e || !dn(t) ? false : (t = t.slice(2).replace(/Once$/, ""), j(e, t[0].toLowerCase() + t.slice(1)) || j(e, st(t)) || j(e, t));
  }
  function Or(e) {
    const { type: t, vnode: n, proxy: r, withProxy: s, propsOptions: [i], slots: o, attrs: a, emit: f, render: h, renderCache: u, props: p, data: S, setupState: E, ctx: B, inheritAttrs: L } = e, Z = an(e);
    let V, G;
    try {
      if (n.shapeFlag & 4) {
        const O = s || r, J = O;
        V = Re(h.call(J, O, u, p, E, S, B)), G = a;
      } else {
        const O = t;
        V = Re(O.length > 1 ? O(p, {
          attrs: a,
          slots: o,
          emit: f
        }) : O(p, null)), G = t.props ? a : Fo(a);
      }
    } catch (O) {
      It.length = 0, gn(O, e, 1), V = we(Je);
    }
    let Y = V;
    if (G && L !== false) {
      const O = Object.keys(G), { shapeFlag: J } = Y;
      O.length && J & 7 && (i && O.some(Xn) && (G = Do(G, i)), Y = ht(Y, G, false, true));
    }
    return n.dirs && (Y = ht(Y, null, false, true), Y.dirs = Y.dirs ? Y.dirs.concat(n.dirs) : n.dirs), n.transition && cr(Y, n.transition), V = Y, an(Z), V;
  }
  const Fo = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || dn(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Do = (e, t) => {
    const n = {};
    for (const r in e) (!Xn(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function Uo(e, t, n) {
    const { props: r, children: s, component: i } = e, { props: o, children: a, patchFlag: f } = t, h = i.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && f >= 0) {
      if (f & 1024) return true;
      if (f & 16) return r ? Rr(r, o, h) : !!o;
      if (f & 8) {
        const u = t.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          const S = u[p];
          if (o[S] !== r[S] && !mn(h, S)) return true;
        }
      }
    } else return (s || a) && (!a || !a.$stable) ? true : r === o ? false : r ? o ? Rr(r, o, h) : true : !!o;
    return false;
  }
  function Rr(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let s = 0; s < r.length; s++) {
      const i = r[s];
      if (t[i] !== e[i] && !mn(n, i)) return true;
    }
    return false;
  }
  function zo({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Hs = (e) => e.__isSuspense;
  function Lo(e, t) {
    t && t.pendingBranch ? F(e) ? t.effects.push(...e) : t.effects.push(e) : Ki(e);
  }
  const Be = Symbol.for("v-fgt"), vn = Symbol.for("v-txt"), Je = Symbol.for("v-cmt"), kt = Symbol.for("v-stc"), It = [];
  let be = null;
  function Ft(e = false) {
    It.push(be = e ? null : []);
  }
  function Bo() {
    It.pop(), be = It[It.length - 1] || null;
  }
  let Bt = 1;
  function Ar(e, t = false) {
    Bt += e, e < 0 && be && t && (be.hasOnce = true);
  }
  function js(e) {
    return e.dynamicChildren = Bt > 0 ? be || ct : null, Bo(), Bt > 0 && be && be.push(e), e;
  }
  function Zt(e, t, n, r, s, i) {
    return js(ne(e, t, n, r, s, i, true));
  }
  function No(e, t, n, r, s) {
    return js(we(e, t, n, r, s, true));
  }
  function $s(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function yt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const Ws = ({ key: e }) => e ?? null, Qt = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? ee(e) || ie(e) || I(e) ? {
    i: ve,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function ne(e, t = null, n = null, r = 0, s = null, i = e === Be ? 0 : 1, o = false, a = false) {
    const f = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && Ws(t),
      ref: t && Qt(t),
      scopeId: xs,
      slotScopeIds: null,
      children: n,
      component: null,
      suspense: null,
      ssContent: null,
      ssFallback: null,
      dirs: null,
      transition: null,
      el: null,
      anchor: null,
      target: null,
      targetStart: null,
      targetAnchor: null,
      staticCount: 0,
      shapeFlag: i,
      patchFlag: r,
      dynamicProps: s,
      dynamicChildren: null,
      appContext: null,
      ctx: ve
    };
    return a ? (pr(f, n), i & 128 && e.normalize(f)) : n && (f.shapeFlag |= ee(n) ? 8 : 16), Bt > 0 && !o && be && (f.patchFlag > 0 || i & 6) && f.patchFlag !== 32 && be.push(f), f;
  }
  const we = Vo;
  function Vo(e, t = null, n = null, r = 0, s = null, i = false) {
    if ((!e || e === lo) && (e = Je), $s(e)) {
      const a = ht(e, t, true);
      return n && pr(a, n), Bt > 0 && !i && be && (a.shapeFlag & 6 ? be[be.indexOf(e)] = a : be.push(a)), a.patchFlag = -2, a;
    }
    if (Zo(e) && (e = e.__vccOpts), t) {
      t = Ho(t);
      let { class: a, style: f } = t;
      a && !ee(a) && (t.class = ft(a)), k(f) && (lr(f) && !F(f) && (f = oe({}, f)), t.style = Zn(f));
    }
    const o = ee(e) ? 1 : Hs(e) ? 128 : Xi(e) ? 64 : k(e) ? 4 : I(e) ? 2 : 0;
    return ne(e, t, n, r, s, o, i, true);
  }
  function Ho(e) {
    return e ? lr(e) || Rs(e) ? oe({}, e) : e : null;
  }
  function ht(e, t, n = false, r = false) {
    const { props: s, ref: i, patchFlag: o, children: a, transition: f } = e, h = t ? $o(s || {}, t) : s, u = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: h,
      key: h && Ws(h),
      ref: t && t.ref ? n && i ? F(i) ? i.concat(Qt(t)) : [
        i,
        Qt(t)
      ] : Qt(t) : i,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: a,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== Be ? o === -1 ? 16 : o | 16 : o,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: f,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && ht(e.ssContent),
      ssFallback: e.ssFallback && ht(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return f && r && cr(u, f.clone(u)), u;
  }
  function en(e = " ", t = 0) {
    return we(vn, null, e, t);
  }
  function jo(e, t) {
    const n = we(kt, null, e);
    return n.staticCount = t, n;
  }
  function Ir(e = "", t = false) {
    return t ? (Ft(), No(Je, null, e)) : we(Je, null, e);
  }
  function Re(e) {
    return e == null || typeof e == "boolean" ? we(Je) : F(e) ? we(Be, null, e.slice()) : $s(e) ? qe(e) : we(vn, null, String(e));
  }
  function qe(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : ht(e);
  }
  function pr(e, t) {
    let n = 0;
    const { shapeFlag: r } = e;
    if (t == null) t = null;
    else if (F(t)) n = 16;
    else if (typeof t == "object") if (r & 65) {
      const s = t.default;
      s && (s._c && (s._d = false), pr(e, s()), s._c && (s._d = true));
      return;
    } else {
      n = 32;
      const s = t._;
      !s && !Rs(t) ? t._ctx = ve : s === 3 && ve && (ve.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else I(t) ? (t = {
      default: t,
      _ctx: ve
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      en(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function $o(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const s in r) if (s === "class") t.class !== r.class && (t.class = ft([
        t.class,
        r.class
      ]));
      else if (s === "style") t.style = Zn([
        t.style,
        r.style
      ]);
      else if (dn(s)) {
        const i = t[s], o = r[s];
        o && i !== o && !(F(i) && i.includes(o)) && (t[s] = i ? [].concat(i, o) : o);
      } else s !== "" && (t[s] = r[s]);
    }
    return t;
  }
  function Me(e, t, n, r = null) {
    Ie(e, t, 7, [
      n,
      r
    ]);
  }
  const Wo = Ps();
  let Go = 0;
  function Ko(e, t, n) {
    const r = e.type, s = (t ? t.appContext : e.appContext) || Wo, i = {
      uid: Go++,
      vnode: e,
      type: r,
      parent: t,
      appContext: s,
      root: null,
      next: null,
      subTree: null,
      effect: null,
      update: null,
      job: null,
      scope: new pi(true),
      render: null,
      proxy: null,
      exposed: null,
      exposeProxy: null,
      withProxy: null,
      provides: t ? t.provides : Object.create(s.provides),
      ids: t ? t.ids : [
        "",
        0,
        0
      ],
      accessCache: null,
      renderCache: [],
      components: null,
      directives: null,
      propsOptions: Is(r, s),
      emitsOptions: Vs(r, s),
      emit: null,
      emitted: null,
      propsDefaults: W,
      inheritAttrs: r.inheritAttrs,
      ctx: W,
      data: W,
      props: W,
      attrs: W,
      slots: W,
      refs: W,
      setupState: W,
      setupContext: null,
      suspense: n,
      suspenseId: n ? n.pendingId : 0,
      asyncDep: null,
      asyncResolved: false,
      isMounted: false,
      isUnmounted: false,
      isDeactivated: false,
      bc: null,
      c: null,
      bm: null,
      m: null,
      bu: null,
      u: null,
      um: null,
      bum: null,
      da: null,
      a: null,
      rtg: null,
      rtc: null,
      ec: null,
      sp: null
    };
    return i.ctx = {
      _: i
    }, i.root = t ? t.root : i, i.emit = Io.bind(null, i), e.ce && e.ce(i), i;
  }
  let fe = null;
  const qo = () => fe || ve;
  let fn, Kn;
  {
    const e = _n(), t = (n, r) => {
      let s;
      return (s = e[n]) || (s = e[n] = []), s.push(r), (i) => {
        s.length > 1 ? s.forEach((o) => o(i)) : s[0](i);
      };
    };
    fn = t("__VUE_INSTANCE_SETTERS__", (n) => fe = n), Kn = t("__VUE_SSR_SETTERS__", (n) => Nt = n);
  }
  const Ht = (e) => {
    const t = fe;
    return fn(e), e.scope.on(), () => {
      e.scope.off(), fn(t);
    };
  }, Fr = () => {
    fe && fe.scope.off(), fn(null);
  };
  function Gs(e) {
    return e.vnode.shapeFlag & 4;
  }
  let Nt = false;
  function Yo(e, t = false, n = false) {
    t && Kn(t);
    const { props: r, children: s } = e.vnode, i = Gs(e);
    mo(e, r, i, t), wo(e, s, n || t);
    const o = i ? Xo(e, t) : void 0;
    return t && Kn(false), o;
  }
  function Xo(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, ao);
    const { setup: r } = n;
    if (r) {
      He();
      const s = e.setupContext = r.length > 1 ? ko(e) : null, i = Ht(e), o = Vt(r, e, 0, [
        e.props,
        s
      ]), a = kr(o);
      if (je(), i(), (a || e.sp) && !Rt(e) && ws(e), a) {
        if (o.then(Fr, Fr), t) return o.then((f) => {
          Dr(e, f);
        }).catch((f) => {
          gn(f, e, 0);
        });
        e.asyncDep = o;
      } else Dr(e, o);
    } else Ks(e);
  }
  function Dr(e, t, n) {
    I(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : k(t) && (e.setupState = _s(t)), Ks(e);
  }
  function Ks(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || Ae);
    {
      const s = Ht(e);
      He();
      try {
        co(e);
      } finally {
        je(), s();
      }
    }
  }
  const Jo = {
    get(e, t) {
      return se(e, "get", ""), e[t];
    }
  };
  function ko(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, Jo),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function xn(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(_s(Ui(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in At) return At[n](e);
      },
      has(t, n) {
        return n in t || n in At;
      }
    })) : e.proxy;
  }
  function Zo(e) {
    return I(e) && "__vccOpts" in e;
  }
  const Qo = (e, t) => Hi(e, t, Nt), el = "3.5.18";
  let qn;
  const Ur = typeof window < "u" && window.trustedTypes;
  if (Ur) try {
    qn = Ur.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const qs = qn ? (e) => qn.createHTML(e) : (e) => e, tl = "http://www.w3.org/2000/svg", nl = "http://www.w3.org/1998/Math/MathML", Le = typeof document < "u" ? document : null, zr = Le && Le.createElement("template"), rl = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const s = t === "svg" ? Le.createElementNS(tl, e) : t === "mathml" ? Le.createElementNS(nl, e) : n ? Le.createElement(e, {
        is: n
      }) : Le.createElement(e);
      return e === "select" && r && r.multiple != null && s.setAttribute("multiple", r.multiple), s;
    },
    createText: (e) => Le.createTextNode(e),
    createComment: (e) => Le.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => Le.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, r, s, i) {
      const o = n ? n.previousSibling : t.lastChild;
      if (s && (s === i || s.nextSibling)) for (; t.insertBefore(s.cloneNode(true), n), !(s === i || !(s = s.nextSibling)); ) ;
      else {
        zr.innerHTML = qs(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const a = zr.content;
        if (r === "svg" || r === "mathml") {
          const f = a.firstChild;
          for (; f.firstChild; ) a.appendChild(f.firstChild);
          a.removeChild(f);
        }
        t.insertBefore(a, n);
      }
      return [
        o ? o.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild
      ];
    }
  }, sl = Symbol("_vtc");
  function il(e, t, n) {
    const r = e[sl];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const un = Symbol("_vod"), Ys = Symbol("_vsh"), Rn = {
    beforeMount(e, { value: t }, { transition: n }) {
      e[un] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : wt(e, t);
    },
    mounted(e, { value: t }, { transition: n }) {
      n && t && n.enter(e);
    },
    updated(e, { value: t, oldValue: n }, { transition: r }) {
      !t != !n && (r ? t ? (r.beforeEnter(e), wt(e, true), r.enter(e)) : r.leave(e, () => {
        wt(e, false);
      }) : wt(e, t));
    },
    beforeUnmount(e, { value: t }) {
      wt(e, t);
    }
  };
  function wt(e, t) {
    e.style.display = t ? e[un] : "none", e[Ys] = !t;
  }
  const ol = Symbol(""), ll = /(^|;)\s*display\s*:/;
  function al(e, t, n) {
    const r = e.style, s = ee(n);
    let i = false;
    if (n && !s) {
      if (t) if (ee(t)) for (const o of t.split(";")) {
        const a = o.slice(0, o.indexOf(":")).trim();
        n[a] == null && tn(r, a, "");
      }
      else for (const o in t) n[o] == null && tn(r, o, "");
      for (const o in n) o === "display" && (i = true), tn(r, o, n[o]);
    } else if (s) {
      if (t !== n) {
        const o = r[ol];
        o && (n += ";" + o), r.cssText = n, i = ll.test(n);
      }
    } else t && e.removeAttribute("style");
    un in e && (e[un] = i ? r.display : "", e[Ys] && (r.display = "none"));
  }
  const Lr = /\s*!important$/;
  function tn(e, t, n) {
    if (F(n)) n.forEach((r) => tn(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = cl(e, t);
      Lr.test(n) ? e.setProperty(st(r), n.replace(Lr, ""), "important") : e[r] = n;
    }
  }
  const Br = [
    "Webkit",
    "Moz",
    "ms"
  ], An = {};
  function cl(e, t) {
    const n = An[t];
    if (n) return n;
    let r = Xe(t);
    if (r !== "filter" && r in e) return An[t] = r;
    r = Zr(r);
    for (let s = 0; s < Br.length; s++) {
      const i = Br[s] + r;
      if (i in e) return An[t] = i;
    }
    return t;
  }
  const Nr = "http://www.w3.org/1999/xlink";
  function Vr(e, t, n, r, s, i = hi(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Nr, t.slice(6, t.length)) : e.setAttributeNS(Nr, t, n) : n == null || i && !Qr(n) ? e.removeAttribute(t) : e.setAttribute(t, i ? "" : pt(n) ? String(n) : n);
  }
  function Hr(e, t, n, r, s) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? qs(n) : n);
      return;
    }
    const i = e.tagName;
    if (t === "value" && i !== "PROGRESS" && !i.includes("-")) {
      const a = i === "OPTION" ? e.getAttribute("value") || "" : e.value, f = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
      (a !== f || !("_value" in e)) && (e.value = f), n == null && e.removeAttribute(t), e._value = n;
      return;
    }
    let o = false;
    if (n === "" || n == null) {
      const a = typeof e[t];
      a === "boolean" ? n = Qr(n) : n == null && a === "string" ? (n = "", o = true) : a === "number" && (n = 0, o = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    o && e.removeAttribute(s || t);
  }
  function fl(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function ul(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const jr = Symbol("_vei");
  function dl(e, t, n, r, s = null) {
    const i = e[jr] || (e[jr] = {}), o = i[t];
    if (r && o) o.value = r;
    else {
      const [a, f] = hl(t);
      if (r) {
        const h = i[t] = gl(r, s);
        fl(e, a, h, f);
      } else o && (ul(e, a, o, f), i[t] = void 0);
    }
  }
  const $r = /(?:Once|Passive|Capture)$/;
  function hl(e) {
    let t;
    if ($r.test(e)) {
      t = {};
      let r;
      for (; r = e.match($r); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : st(e.slice(2)),
      t
    ];
  }
  let In = 0;
  const pl = Promise.resolve(), _l = () => In || (pl.then(() => In = 0), In = Date.now());
  function gl(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Ie(bl(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = _l(), n;
  }
  function bl(e, t) {
    if (F(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (s) => !s._stopped && r && r(s));
    } else return t;
  }
  const Wr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, ml = (e, t, n, r, s, i) => {
    const o = s === "svg";
    t === "class" ? il(e, r, o) : t === "style" ? al(e, n, r) : dn(t) ? Xn(t) || dl(e, t, n, r, i) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : vl(e, t, r, o)) ? (Hr(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Vr(e, t, r, o, i, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !ee(r)) ? Hr(e, Xe(t), r, i, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), Vr(e, t, r, o));
  };
  function vl(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Wr(t) && I(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const s = e.tagName;
      if (s === "IMG" || s === "VIDEO" || s === "CANVAS" || s === "SOURCE") return false;
    }
    return Wr(t) && ee(n) ? false : t in e;
  }
  const xl = oe({
    patchProp: ml
  }, rl);
  let Gr;
  function yl() {
    return Gr || (Gr = Co(xl));
  }
  const wl = (...e) => {
    const t = yl().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const s = Cl(r);
      if (!s) return;
      const i = t._component;
      !I(i) && !i.render && !i.template && (i.template = s.innerHTML), s.nodeType === 1 && (s.textContent = "");
      const o = n(s, false, Sl(s));
      return s instanceof Element && (s.removeAttribute("v-cloak"), s.setAttribute("data-v-app", "")), o;
    }, t;
  };
  function Sl(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function Cl(e) {
    return ee(e) ? document.querySelector(e) : e;
  }
  const El = `
struct MandelbrotStep {
zx: f32,
zy: f32,
dx: f32,
dy: f32,
};

struct Mandelbrot {
cx: f32,
cy: f32,
mu: f32,
scale: f32,
aspect: f32,
angle: f32,
maxIteration: f32,
epsilon: f32,
antialiasLevel: f32,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) fragCoord : vec2<f32>
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out : VertexOutput;
  out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  out.fragCoord = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}

// Fragment shader
fn vpow2(v: vec2<f32>) -> vec2<f32> {
     return vec2(v.x * v.x - v.y * v.y, 2. * v.x * v.y);
}

// cmul is a complex multiplication
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// cdiv is a complex division
fn cdiv(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    var denominator: f32 = b.x * b.x + b.y * b.y;
    return vec2<f32>((a.x * b.x + a.y * b.y) / denominator, (a.y * b.x - a.x * b.y) / denominator);
}

fn getOrbit(index: i32) -> vec2<f32> {
    return vec2<f32>(
        mandelbrotOrbitPointSuite[index].zx,
        mandelbrotOrbitPointSuite[index].zy,
    );
}

fn getOrbitD(index: i32) -> vec2<f32> {
    return vec2<f32>(
        mandelbrotOrbitPointSuite[index].dx,
        mandelbrotOrbitPointSuite[index].dy,
    );
}

fn mandelbrot_func(x0: f32, y0: f32) -> vec2<f32> {
    var dc = vec2<f32>(x0, y0);
//  let max_iter_f: f32 = clamp(80.0 + 40.0 * log2(1.0 / uniforms.scale), 128.0, 1000000.0);
    let max_iteration = mandelbrot.maxIteration;
    // draw a mandelbrot set
    var z = getOrbit(0);
    var dz = vec2<f32>(0.0, 0.0);
    var der = vec2<f32>(1.0, 0.0);
    var distance = 0.0;
    var i = 0.0;
    var ref_i = 0;
    var max = mandelbrot.mu;
    var d = vec2<f32>(1.0, 0.0);
    // create an epsilon var that is smaller when the zoom is bigger
    var epsilon = mandelbrot.epsilon;
    // calculate the iteration
    while (i < max_iteration) {
        z = getOrbit(ref_i);
        dz = 2.0 * cmul(dz, z) + cmul(dz, dz) + dc;
        ref_i += 1;
        // if squared module of dz
        z = getOrbit(ref_i) + dz;
        d = cdiv(der,z);
        let dot_z = dot(z, z);
         // if is bigger than a max value, then we are out of the mandelbrot set
        if (dot_z >= max) {
            break;
        }
        if (dot(der, der) < epsilon) {
            i = 0.0;
            break;
        }
        der = cmul(der * 2.0, z);
        let dot_dz = dot(dz, dz);
        if (dot_z < dot_dz || f32(ref_i) == max_iteration) {
            dz = z;
            ref_i = 0;
        } else {
//   /* bivariate linear approximation */
//    T := lookup table [ exponent(|z|^2) ]
//    z := T.U * z + T.V * c + T.W
//    iterations += T.iterations
//    reference iterations += T.iterations
        }
        i += 1.0;
    }
    if(i >= max_iteration ) {
        i = 0.0;
    } else {
        if( i > 0.0) {
            // add the rest to i to get a smooth color gradient
            let log_zn = log(dz.x * dz.x + dz.y * dz.y) / 2.0;
            var nu = log(log_zn / log(2.0)) / log(2.0);
            i += (1.0 - nu) ;
        }
    }
    let mod_der = length(der);
    return vec2<f32>(i, mod_der);


//  var x: f32 = 0.0;
//  var y: f32 = 0.0;
//  var iter: f32 = 0;
//  var x2: f32 = 0.0;
//  var y2: f32 = 0.0;
//  var dx: f32 = 0.0;
//  var dy: f32 = 0.0;
//  var w = 0.0;
//  var d: f32 = 1.0;
//  while (x2 + y2 <= 100.0 && iter < mandelbrot.maxIteration) {
//    x = x2 - y2 + x0;
//    y = w - x2 - y2 + y0;
//    x2 = x*x;
//    y2 = y*y;
//    w = (x + y) * (x + y);
//    // compute derivative d
//    d = 2.0 * sqrt(x2 + y2) * d + 1.0;
//    iter += 1.0;
//  }
//  var nu = 0.0;
//  if(x2 + y2 > 100.0) {
//      let log_zn = log(x2 + y2) / 2.0;
//      nu = f32(iter) + 1.0 - log(log_zn / log(2.0)) / log(2.0);
//  }
//  return vec2<f32>(nu, d);
}
fn rotate(x: f32, y: f32, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * x - s * y, s * x + c * y);
}
@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  var xy = rotate((fragCoord.x * 2.0 - 1.0)  * mandelbrot.aspect * mandelbrot.scale, (fragCoord.y * 2.0 - 1.0) * mandelbrot.scale, mandelbrot.angle);
  let x0 = xy.x + mandelbrot.cx;
  let y0 = xy.y + mandelbrot.cy;
  var dc = vec2<f32>(
       x0,
       y0
  );
  let res = mandelbrot_func(dc.x, dc.y);
  return vec4<f32>(res.x, res.y, 0.0, 1.0);
}











`, Tl = `struct Uniforms {
  palettePeriod: f32,
  bloomStrength: f32,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>;
struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) fragCoord : vec2<f32>
};
@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out : VertexOutput;
  out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  out.fragCoord = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}
fn palette(v: f32, d: f32, dx: f32, dy: f32) -> vec3<f32> {
  let t = abs(v * 2.0 - 1.0);
  let r = 0.5 + 0.5 * cos(1.0 + t * 6.28 - dx / 2.0);
  let g = 0.5 + 0.5 * sin(2.0 + t * 5.88 - dy / 4.0);
  let b = 0.5 + 0.5 * cos(t * 3.14 + ((dx) / 8.0));
  return vec3<f32>(r, g, b);
}

fn kaleidoscope(coord: vec2<f32>, sides: f32) -> vec2<f32> {
  let angle = atan2(coord.y - 0.5, coord.x - 0.5);
  let radius = length(coord - vec2<f32>(0.5, 0.5));
  let sector = floor(angle / (3.1415926 / sides));
  let mirrored = abs(fract(angle / (2.0 * 3.1415926 / sides)) * 2.0 - 1.0);
  let newAngle = mirrored * (3.1415926 / sides) + sector * (3.1415926 / sides);
  return vec2<f32>(cos(newAngle), sin(newAngle)) * radius + vec2<f32>(0.5, 0.5);
}

fn tunnel(coord: vec2<f32>) -> vec2<f32> {
  let center = vec2<f32>(0.5, 0.5);
  let delta = coord - center;
  let angle = atan2(delta.y, delta.x);
  let radius = length(delta);
  // Effet tunnel : on replie le rayon pour cr\xE9er des anneaux
  let tunnelRadius = fract(radius * 4.0); // 4.0 = nombre d\u2019anneaux
  return center + vec2<f32>(cos(angle), sin(angle)) * tunnelRadius;
}

@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord;
  let texSize = vec2<i32>(textureDimensions(tex, 0));
  let center = vec2<f32>(0.5, 0.5);
  let blurStrength = uniforms.bloomStrength; // Utilis\xE9 comme force du blur radial
  let blurSamples = 4; // Nombre d'\xE9chantillons pour le blur
  var color = vec3<f32>(0.0, 0.0, 0.0);
  let glowColor = vec3<f32>(0.2, 0.3, 0.8);
  var total = 0.0;
  // Blur radial : on \xE9chantillonne le long du rayon centre -> pixel
  for (var i = 0; i < blurSamples; i = i + 1) {
    let t = f32(i) / f32(blurSamples - 1);
    // t = 0 (centre), t = 1 (pixel courant)
    let sampleUV = mix(center, uv, t * blurStrength + (1.0 - blurStrength));
    let sampleCoord = vec2<i32>(
      i32(clamp(sampleUV.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
      i32(clamp((1.0 - sampleUV.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
    );
    let data = textureLoad(tex, sampleCoord, 0);
    let nu = data.x;
    let d = data.y;
    let period = uniforms.palettePeriod;
    var sampleColor: vec3<f32>;
    if (nu <= 0.0) {
        // Noir pour l\u2019int\xE9rieur du Mandelbrot
        sampleColor = vec3<f32>(0.0, 0.0, 0.0);
      //let glow = exp(-d * 1.0);
      //sampleColor = glowColor * (1.0 - glow);
    } else {
      let v = fract(nu / period);
      sampleColor = palette(v, d, sampleUV.x, sampleUV.y);
    }
    // Poids : plus proche du pixel courant = plus fort
    let weight = 0.5 + 0.5 * t;
    color = color + sampleColor * weight;
    total = total + weight;
  }
  color = color / total;
  return vec4<f32>(color, 1.0);
}`, Pl = "" + new URL("mandelbrot_bg-DUS3tTDB.wasm", import.meta.url).href, Ml = async (e = {}, t) => {
    let n;
    if (t.startsWith("data:")) {
      const r = t.replace(/^data:.*?base64,/, "");
      let s;
      if (typeof Buffer == "function" && typeof Buffer.from == "function") s = Buffer.from(r, "base64");
      else if (typeof atob == "function") {
        const i = atob(r);
        s = new Uint8Array(i.length);
        for (let o = 0; o < i.length; o++) s[o] = i.charCodeAt(o);
      } else throw new Error("Cannot decode base64-encoded data URL");
      n = await WebAssembly.instantiate(s, e);
    } else {
      const r = await fetch(t), s = r.headers.get("Content-Type") || "";
      if ("instantiateStreaming" in WebAssembly && s.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(r, e);
      else {
        const i = await r.arrayBuffer();
        n = await WebAssembly.instantiate(i, e);
      }
    }
    return n.instance.exports;
  };
  let A;
  function Ol(e) {
    A = e;
  }
  let qt = null;
  function nn() {
    return (qt === null || qt.byteLength === 0) && (qt = new Uint8Array(A.memory.buffer)), qt;
  }
  const Xs = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
  let rn = new Xs("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  rn.decode();
  const Rl = 2146435072;
  let Fn = 0;
  function Al(e, t) {
    return Fn += t, Fn >= Rl && (rn = new Xs("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), rn.decode(), Fn = t), rn.decode(nn().subarray(e, e + t));
  }
  function Js(e, t) {
    return e = e >>> 0, Al(e, t);
  }
  let Yt = null;
  function Il() {
    return (Yt === null || Yt.byteLength === 0) && (Yt = new Float64Array(A.memory.buffer)), Yt;
  }
  function Fl(e, t) {
    return e = e >>> 0, Il().subarray(e / 8, e / 8 + t);
  }
  let lt = null;
  function Dl() {
    return (lt === null || lt.buffer.detached === true || lt.buffer.detached === void 0 && lt.buffer !== A.memory.buffer) && (lt = new DataView(A.memory.buffer)), lt;
  }
  function Ul(e, t) {
    e = e >>> 0;
    const n = Dl(), r = [];
    for (let s = e; s < e + 4 * t; s += 4) r.push(A.__wbindgen_export_0.get(n.getUint32(s, true)));
    return A.__externref_drop_slice(e, t), r;
  }
  let Dt = 0;
  const zl = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder, sn = new zl("utf-8"), Ll = typeof sn.encodeInto == "function" ? function(e, t) {
    return sn.encodeInto(e, t);
  } : function(e, t) {
    const n = sn.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  };
  function Dn(e, t, n) {
    if (n === void 0) {
      const a = sn.encode(e), f = t(a.length, 1) >>> 0;
      return nn().subarray(f, f + a.length).set(a), Dt = a.length, f;
    }
    let r = e.length, s = t(r, 1) >>> 0;
    const i = nn();
    let o = 0;
    for (; o < r; o++) {
      const a = e.charCodeAt(o);
      if (a > 127) break;
      i[s + o] = a;
    }
    if (o !== r) {
      o !== 0 && (e = e.slice(o)), s = n(s, r, r = o + e.length * 3, 1) >>> 0;
      const a = nn().subarray(s + o, s + r), f = Ll(e, a);
      o += f.written, s = n(s, r, o, 1) >>> 0;
    }
    return Dt = o, s;
  }
  const Kr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => A.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  class Bl {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Kr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      A.__wbg_mandelbrotnavigator_free(t, 0);
    }
    constructor(t, n, r, s, i) {
      const o = A.mandelbrotnavigator_new(t, n, r, s, i);
      return this.__wbg_ptr = o >>> 0, Kr.register(this, this.__wbg_ptr, this), this;
    }
    translate(t, n) {
      A.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
    rotate(t) {
      A.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      A.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    rotate_direct(t) {
      A.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    zoom(t) {
      A.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    step() {
      const t = A.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = Fl(t[0], t[1]).slice();
      return A.__wbindgen_free(t[0], t[1] * 8, 8), n;
    }
    get_params() {
      const t = A.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = Ul(t[0], t[1]).slice();
      return A.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    compute_reference_orbit_ptr(t) {
      const n = A.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return _r.__wrap(n);
    }
    get_reference_orbit_len() {
      return A.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    get_reference_orbit_capacity() {
      return A.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    scale(t) {
      const n = Dn(t, A.__wbindgen_malloc, A.__wbindgen_realloc), r = Dt;
      A.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
    }
    angle(t) {
      A.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    origin(t, n) {
      const r = Dn(t, A.__wbindgen_malloc, A.__wbindgen_realloc), s = Dt, i = Dn(n, A.__wbindgen_malloc, A.__wbindgen_realloc), o = Dt;
      A.mandelbrotnavigator_origin(this.__wbg_ptr, r, s, i, o);
    }
  }
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => A.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const qr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => A.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class _r {
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(_r.prototype);
      return n.__wbg_ptr = t, qr.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, qr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      A.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      return A.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      A.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      return A.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      A.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      return A.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      A.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  function Nl(e) {
    console.debug(e);
  }
  function Vl(e) {
    console.error(e);
  }
  function Hl(e) {
    console.info(e);
  }
  function jl(e) {
    console.log(e);
  }
  function $l() {
    return Date.now();
  }
  function Wl(e) {
    console.warn(e);
  }
  function Gl() {
    const e = A.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  function Kl(e, t) {
    return Js(e, t);
  }
  function ql(e, t) {
    throw new Error(Js(e, t));
  }
  URL = globalThis.URL;
  const z = await Ml({
    "./mandelbrot_bg.js": {
      __wbindgen_string_new: Kl,
      __wbg_debug_58d16ea352cfbca1: Nl,
      __wbg_error_51ecdd39ec054205: Vl,
      __wbg_info_e56933705c348038: Hl,
      __wbg_log_ea240990d83e374e: jl,
      __wbg_warn_d89f6637da554c8d: Wl,
      __wbg_now_eb0821f3bd9f6529: $l,
      __wbindgen_throw: ql,
      __wbindgen_init_externref_table: Gl
    }
  }, Pl), ks = z.memory, Yl = z.__wbg_mandelbrotstep_free, Xl = z.__wbg_get_mandelbrotstep_zx, Jl = z.__wbg_set_mandelbrotstep_zx, kl = z.__wbg_get_mandelbrotstep_zy, Zl = z.__wbg_set_mandelbrotstep_zy, Ql = z.__wbg_get_mandelbrotstep_dx, ea = z.__wbg_set_mandelbrotstep_dx, ta = z.__wbg_get_mandelbrotstep_dy, na = z.__wbg_set_mandelbrotstep_dy, ra = z.__wbg_mandelbrotnavigator_free, sa = z.mandelbrotnavigator_new, ia = z.mandelbrotnavigator_translate, oa = z.mandelbrotnavigator_rotate, la = z.mandelbrotnavigator_translate_direct, aa = z.mandelbrotnavigator_rotate_direct, ca = z.mandelbrotnavigator_zoom, fa = z.mandelbrotnavigator_step, ua = z.mandelbrotnavigator_get_params, da = z.mandelbrotnavigator_compute_reference_orbit_ptr, ha = z.mandelbrotnavigator_get_reference_orbit_len, pa = z.mandelbrotnavigator_get_reference_orbit_capacity, _a = z.mandelbrotnavigator_scale, ga = z.mandelbrotnavigator_angle, ba = z.mandelbrotnavigator_origin, ma = z.__wbg_orbitbufferinfo_free, va = z.__wbg_get_orbitbufferinfo_ptr, xa = z.__wbg_set_orbitbufferinfo_ptr, ya = z.__wbg_get_orbitbufferinfo_offset, wa = z.__wbg_set_orbitbufferinfo_offset, Sa = z.__wbg_get_orbitbufferinfo_count, Ca = z.__wbg_set_orbitbufferinfo_count, Ea = z.__wbindgen_export_0, Ta = z.__wbindgen_free, Pa = z.__externref_drop_slice, Ma = z.__wbindgen_malloc, Oa = z.__wbindgen_realloc, Zs = z.__wbindgen_start, Ra = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: Pa,
    __wbg_get_mandelbrotstep_dx: Ql,
    __wbg_get_mandelbrotstep_dy: ta,
    __wbg_get_mandelbrotstep_zx: Xl,
    __wbg_get_mandelbrotstep_zy: kl,
    __wbg_get_orbitbufferinfo_count: Sa,
    __wbg_get_orbitbufferinfo_offset: ya,
    __wbg_get_orbitbufferinfo_ptr: va,
    __wbg_mandelbrotnavigator_free: ra,
    __wbg_mandelbrotstep_free: Yl,
    __wbg_orbitbufferinfo_free: ma,
    __wbg_set_mandelbrotstep_dx: ea,
    __wbg_set_mandelbrotstep_dy: na,
    __wbg_set_mandelbrotstep_zx: Jl,
    __wbg_set_mandelbrotstep_zy: Zl,
    __wbg_set_orbitbufferinfo_count: Ca,
    __wbg_set_orbitbufferinfo_offset: wa,
    __wbg_set_orbitbufferinfo_ptr: xa,
    __wbindgen_export_0: Ea,
    __wbindgen_free: Ta,
    __wbindgen_malloc: Ma,
    __wbindgen_realloc: Oa,
    __wbindgen_start: Zs,
    mandelbrotnavigator_angle: ga,
    mandelbrotnavigator_compute_reference_orbit_ptr: da,
    mandelbrotnavigator_get_params: ua,
    mandelbrotnavigator_get_reference_orbit_capacity: pa,
    mandelbrotnavigator_get_reference_orbit_len: ha,
    mandelbrotnavigator_new: sa,
    mandelbrotnavigator_origin: ba,
    mandelbrotnavigator_rotate: oa,
    mandelbrotnavigator_rotate_direct: aa,
    mandelbrotnavigator_scale: _a,
    mandelbrotnavigator_step: fa,
    mandelbrotnavigator_translate: ia,
    mandelbrotnavigator_translate_direct: la,
    mandelbrotnavigator_zoom: ca,
    memory: ks
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  Ol(Ra);
  Zs();
  class Aa {
    constructor(t, n) {
      __publicField(this, "canvas");
      __publicField(this, "device");
      __publicField(this, "queue");
      __publicField(this, "adapter");
      __publicField(this, "ctx");
      __publicField(this, "format");
      __publicField(this, "mandelbrotNavigator");
      __publicField(this, "intermediateTexture");
      __publicField(this, "intermediateView");
      __publicField(this, "sampler");
      __publicField(this, "uniformBufferMandelbrot");
      __publicField(this, "uniformBufferColor");
      __publicField(this, "mandelbrotReferenceBuffer");
      __publicField(this, "pipeline1");
      __publicField(this, "pipeline2");
      __publicField(this, "bindGroup1");
      __publicField(this, "bindGroup2");
      __publicField(this, "shaderPass1");
      __publicField(this, "shaderPass2");
      __publicField(this, "width", 0);
      __publicField(this, "height", 0);
      __publicField(this, "antialiasLevel");
      __publicField(this, "palettePeriod");
      __publicField(this, "previousMandelbrot");
      __publicField(this, "needRender", true);
      __publicField(this, "extraFrames", 0);
      __publicField(this, "mandelbrotReference", new Float32Array(1e6));
      this.canvas = t, this.shaderPass1 = El, this.shaderPass2 = Tl, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
        maxIterations: 1,
        epsilon: 0,
        mu: 1e3,
        angle: 0,
        scale: 1,
        cy: 0,
        cx: 0
      };
    }
    async initialize(t) {
      if (this.mandelbrotNavigator = t, !navigator.gpu) throw new Error("WebGPU non support\xE9");
      if (this.adapter = await navigator.gpu.requestAdapter(), !this.adapter) throw new Error("Adapter WebGPU introuvable");
      this.device = await this.adapter.requestDevice(), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.sampler = this.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "nearest"
      }), this.sampler.label = "Engine Sampler", this.uniformBufferMandelbrot = this.device.createBuffer({
        size: 36,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Mandelbrot"
      }), this.uniformBufferColor = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Color"
      }), this.mandelbrotReferenceBuffer = this.device.createBuffer({
        size: 4 * 1e6,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        label: "Engine Mandelbrot Orbit ReferenceStorage Buffer"
      }), await this._createPipelines(), this.resize();
    }
    async _createPipelines() {
      const t = this.device.createShaderModule({
        code: this.shaderPass1,
        label: "Engine ShaderModule Pass1"
      }), n = this.device.createShaderModule({
        code: this.shaderPass2,
        label: "Engine ShaderModule Pass2"
      }), r = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
            buffer: {
              type: "uniform"
            }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
            buffer: {
              type: "read-only-storage"
            }
          }
        ],
        label: "Engine RenderPipeline Mandelbrot"
      });
      this.pipeline1 = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            r
          ]
        }),
        vertex: {
          module: t,
          entryPoint: "vs_main"
        },
        fragment: {
          module: t,
          entryPoint: "fs_main",
          targets: [
            {
              format: "rgba16float"
            }
          ]
        },
        primitive: {
          topology: "triangle-list"
        },
        label: "Engine RenderPipeline Pass Mandelbrot"
      }), this.pipeline2 = this.device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: n,
          entryPoint: "vs_main"
        },
        fragment: {
          module: n,
          entryPoint: "fs_main",
          targets: [
            {
              format: this.format
            }
          ]
        },
        primitive: {
          topology: "triangle-list"
        },
        label: "Engine RenderPipeline Pass Color"
      }), this.bindGroup1 = this.device.createBindGroup({
        layout: r,
        entries: [
          {
            binding: 0,
            resource: {
              buffer: this.uniformBufferMandelbrot
            }
          },
          {
            binding: 1,
            resource: {
              buffer: this.mandelbrotReferenceBuffer
            }
          }
        ],
        label: "Engine BindGroup Pass Mandelbrot"
      }), this.bindGroup2 = void 0;
    }
    resize() {
      var _a2, _b;
      const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) ?? this.canvas.clientWidth, s = (n == null ? void 0 : n.clientHeight) ?? this.canvas.clientHeight;
      if (this.width = Math.max(1, Math.round(r * t)), this.height = Math.max(1, Math.round(s * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = s + "px", this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.intermediateTexture && ((_b = (_a2 = this.intermediateTexture).destroy) == null ? void 0 : _b.call(_a2)), this.intermediateTexture = this.device.createTexture({
        size: {
          width: this.width,
          height: this.height,
          depthOrArrayLayers: 1
        },
        format: "rgba16float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        label: "Engine IntermediateTexture"
      }), this.intermediateView = this.intermediateTexture.createView(), this.intermediateView.label = "Engine IntermediateTextureView", this.pipeline2) {
        const i = this.pipeline2.getBindGroupLayout(0);
        i.label = "Engine IntermediateTextureView";
        const o = [
          {
            binding: 0,
            resource: {
              buffer: this.uniformBufferColor
            }
          },
          {
            binding: 1,
            resource: this.intermediateView
          }
        ];
        this.bindGroup2 = this.device.createBindGroup({
          layout: i,
          entries: o,
          label: "Engine BindGroup Color Pass"
        });
      }
    }
    areObjectsEqual(t, n) {
      const r = Object.keys(t), s = Object.keys(n);
      if (r.length !== s.length) return false;
      for (const i of r) if (t[i] !== n[i]) return false;
      return true;
    }
    update(t, n) {
      if (this.previousMandelbrot) {
        const u = this.needRender;
        this.needRender = !this.areObjectsEqual(t, this.previousMandelbrot), this.needRender ? this.extraFrames = 2 : u && this.needRender;
      }
      if (!this.needRender && this.extraFrames <= 0) return;
      const r = this.width / Math.max(1, this.height), s = new Float32Array([
        t.cx,
        t.cy,
        t.mu,
        t.scale,
        r,
        t.angle,
        t.maxIterations,
        t.epsilon,
        n.antialiasLevel
      ]);
      this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, s.buffer);
      let i = this.previousMandelbrot.scale / t.scale;
      i < 1 && (i = 1 / i), i = Math.sqrt(i) - 1;
      const o = new Float32Array([
        n.palettePeriod,
        i,
        0,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferColor, 0, o.buffer);
      const a = Math.ceil(t.maxIterations);
      let f = this.mandelbrotNavigator.compute_reference_orbit_ptr(a);
      const h = new Float32Array(ks.buffer, f.ptr, f.count * 4);
      f.offset < a && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, h, 0), this.previousMandelbrot = t;
    }
    render() {
      if (!this.needRender && this.extraFrames <= 0 || (!this.needRender && this.extraFrames > 0 && this.extraFrames--, console.count("Rendering"), !this.pipeline1 || !this.pipeline2)) return;
      const t = this.device.createCommandEncoder(), n = t.beginRenderPass({
        colorAttachments: [
          {
            view: this.intermediateView,
            clearValue: {
              r: 0,
              g: 0,
              b: 0,
              a: 1
            },
            loadOp: "clear",
            storeOp: "store"
          }
        ]
      });
      n.setPipeline(this.pipeline1), this.bindGroup1 && n.setBindGroup(0, this.bindGroup1), n.draw(6, 1, 0, 0), n.end();
      const r = this.ctx.getCurrentTexture().createView(), s = t.beginRenderPass({
        colorAttachments: [
          {
            view: r,
            clearValue: {
              r: 1,
              g: 1,
              b: 1,
              a: 1
            },
            loadOp: "clear",
            storeOp: "store"
          }
        ]
      });
      s.setPipeline(this.pipeline2), this.bindGroup2 && s.setBindGroup(0, this.bindGroup2), s.draw(6, 1, 0, 0), s.end(), this.device.queue.submit([
        t.finish()
      ]);
    }
    destroy() {
      var _a2, _b, _c, _d;
      (_b = (_a2 = this.intermediateTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d = (_c = this.mandelbrotReferenceBuffer) == null ? void 0 : _c.destroy) == null ? void 0 : _d.call(_c);
    }
  }
  const Ia = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, Fa = {
    href: "https://github.com/gcollombet/mandelbrot",
    target: "_blank",
    rel: "noopener",
    class: "footer-link",
    "aria-label": "GitHub"
  }, Da = {
    class: "github-logo",
    height: "20",
    viewBox: "0 0 16 16",
    width: "20",
    fill: "currentColor",
    style: {
      "vertical-align": "middle",
      "margin-right": "4px"
    }
  }, Ua = {
    key: 1,
    class: "intro-title-container"
  }, Yr = 1, Xr = 128, Xt = 0.04, Jr = 0.025, za = ys({
    __name: "MandelbrotNavigator",
    setup(e) {
      const t = Gt(null);
      let n, r, s;
      const i = Gt({
        cx: "-1.5",
        cy: "0.0",
        mu: 1e4,
        scale: "2.5",
        angle: "0.0",
        maxIterations: 1e3,
        antialiasLevel: Yr,
        palettePeriod: Xr
      });
      function o(D) {
        h[D.key.toLowerCase()] = true;
      }
      function a(D) {
        h[D.key.toLowerCase()] = false;
      }
      function f(D) {
        D.preventDefault();
        const C = 0.8;
        D.deltaY < 0 ? s.zoom(C) : s.zoom(1 / C);
      }
      const h = {};
      let u = false, p = false, S = 0, E = 0;
      const B = Gt(false);
      let L = 0, Z = 0, V = 0, G = false;
      function Y() {
        typeof window < "u" && window.navigator ? B.value = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent) : B.value = false;
      }
      function O(D) {
        const C = t.value;
        if (!C) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const T = C.getBoundingClientRect();
        return {
          x: D.clientX - T.left,
          y: D.clientY - T.top,
          width: T.width,
          height: T.height
        };
      }
      function J(D) {
        if (D.button === 2) p = true;
        else {
          u = true;
          const C = O(D);
          S = C.x, E = C.y;
        }
      }
      function Se(D) {
        var _a2;
        const C = O(D);
        if (p) {
          const De = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
          if (!De) return;
          const gt = De.width / 2, Ue = De.height / 2, Ge = C.x, bt = C.y, jt = Math.atan2(bt - Ue, Ge - gt);
          s.angle(jt);
          return;
        }
        if (!u) return;
        const T = C.width, U = C.height, X = T / U, te = (C.x - S) / T * 2, Q = (C.y - E) / U * 2, re = -te * X, We = Q;
        s.translate_direct(re, We), S = C.x, E = C.y;
      }
      function me(D) {
        D.button === 2 ? p = false : u = false;
      }
      function Ce(D) {
        var _a2;
        if (D.touches.length === 1) {
          u = true;
          const C = D.touches[0], T = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
          if (!T) return;
          S = C.clientX - T.left, E = C.clientY - T.top;
        } else if (D.touches.length === 2) {
          u = false, G = true;
          const [C, T] = D.touches;
          L = Math.hypot(T.clientX - C.clientX, T.clientY - C.clientY), Z = Math.atan2(T.clientY - C.clientY, T.clientX - C.clientX), V = parseFloat(i.value.angle);
        }
      }
      function it(D) {
        var _a2;
        if (u && D.touches.length === 1) {
          const C = D.touches[0], T = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
          if (!T) return;
          const U = C.clientX - T.left, X = C.clientY - T.top, te = T.width, Q = T.height, re = te / Q, We = (U - S) / te * 2, De = (X - E) / Q * 2;
          s.translate_direct(-We * re, De), S = U, E = X;
        } else if (G && D.touches.length === 2) {
          const [C, T] = D.touches, U = Math.hypot(T.clientX - C.clientX, T.clientY - C.clientY), X = Math.atan2(T.clientY - C.clientY, T.clientX - C.clientX), te = L / U;
          s.zoom(te);
          const Q = X - Z;
          s.angle(V + Q);
        }
      }
      function Fe(D) {
        D.touches.length === 0 && (u = false, G = false);
      }
      async function ke() {
        if (!t.value) return;
        n = t.value, s = new Bl(-0.5572506229492065, 0.6355989165839159, 5e3, 1e3, 0), r = new Aa(n, {
          antialiasLevel: 1,
          palettePeriod: 128
        }), await r.initialize(s), window.addEventListener("keydown", o), window.addEventListener("keyup", a), n.addEventListener("wheel", f, {
          passive: false
        }), n.addEventListener("mousedown", J), n.addEventListener("contextmenu", function(T) {
          T.preventDefault();
        }), window.addEventListener("mousemove", Se), window.addEventListener("mouseup", me);
        function D() {
          h.z && s.translate(0, Xt), h.s && s.translate(0, -Xt), h.q && s.translate(-Xt, 0), h.d && s.translate(Xt, 0), h.a && s.rotate(Jr), h.e && s.rotate(-Jr);
          const T = 0.8;
          h.r && s.zoom(T), h.f && s.zoom(1 / T), setTimeout(D, 16);
        }
        D();
        function C() {
          const T = i.value.epsilon, [U, X, te, Q] = s.step(), [re, We, De, gt] = s.get_params(), Ue = i.value.mu;
          i.value.cx = re, i.value.cy = We, i.value.scale = De, i.value.angle = gt;
          const Ge = Math.min(Math.max(100, 80 + 20 * Math.log2(1 / te)), 1e6);
          r.update({
            cx: U,
            cy: X,
            mu: Ue,
            scale: te,
            angle: Q,
            maxIterations: Ge,
            epsilon: T
          }, {
            antialiasLevel: Yr,
            palettePeriod: Xr
          }), r.render(), requestAnimationFrame(C);
        }
        C();
      }
      function Ze() {
        if (!t.value || !r) return;
        const D = t.value.getBoundingClientRect();
        t.value.width = D.width, t.value.height = D.height, r.resize && r.resize(), r.render();
      }
      const pe = Gt(false);
      async function _t() {
        if (!s) return;
        await Hn(), await new Promise((U) => setTimeout(U, 500));
        const D = 3500, C = performance.now();
        function T(U) {
          const X = Math.min((U - C) / D, 1), te = X < 0.5 ? 2 * X * X : -1 + (4 - 2 * X) * X, Q = Math.PI / 2 * te;
          s.zoom(te), s.angle(Q), X < 1 ? requestAnimationFrame(T) : pe.value = true;
        }
        requestAnimationFrame(T);
      }
      return fr(async () => {
        Y(), await ke(), window.addEventListener("resize", Ze), t.value && (t.value.addEventListener("touchstart", Ce, {
          passive: false
        }), t.value.addEventListener("touchmove", it, {
          passive: false
        }), t.value.addEventListener("touchend", Fe, {
          passive: false
        })), await Hn(), await _t();
      }), ur(() => {
        window.removeEventListener("resize", Ze);
      }), (D, C) => (Ft(), Zt("div", Ia, [
        Tn(ne("button", {
          class: ft([
            "menu-hamburger tag is-light is-medium animate__animated",
            pe.value ? "animate__fadeInDown" : ""
          ]),
          "aria-label": "Menu"
        }, C[1] || (C[1] = [
          ne("span", {
            class: "hamburger-bar"
          }, null, -1),
          ne("span", {
            class: "hamburger-bar"
          }, null, -1),
          ne("span", {
            class: "hamburger-bar"
          }, null, -1)
        ]), 2), [
          [
            Rn,
            pe.value
          ]
        ]),
        ne("canvas", {
          ref_key: "canvasRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          }
        }, null, 512),
        Ir("", true),
        Tn(ne("div", {
          class: ft([
            "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
            pe.value ? "animate__fadeInUp" : ""
          ])
        }, C[2] || (C[2] = [
          jo(' D\xE9placer\xA0 <span class="tag is-black">Clic gauche</span>\xA0 <span class="tag is-black">Z</span>\xA0 <span class="tag is-black">Q</span>\xA0 <span class="tag is-black">S</span>\xA0 <span class="tag is-black">D</span>\xA0 |\xA0Tourner\xA0 <span class="tag is-black">Clic droit</span>\xA0 <span class="tag is-black">A</span>\xA0 <span class="tag is-black">E</span>\xA0 |\xA0Zoomer\xA0 <span class="tag is-black">Molette</span>\xA0 <span class="tag is-black">R</span>\xA0 <span class="tag is-black">F</span>', 22)
        ]), 2), [
          [
            Rn,
            pe.value
          ]
        ]),
        Tn(ne("div", {
          class: ft([
            "footer-love tag is-light is-medium is-hidden-touch animate__animated",
            pe.value ? "animate__fadeInUp" : ""
          ])
        }, [
          C[5] || (C[5] = ne("small", null, [
            en(" Made with \u2764\uFE0F "),
            ne("span", null, "by Guillaume Collombet"),
            en("\xA0|\xA0 ")
          ], -1)),
          ne("small", null, [
            ne("a", Fa, [
              (Ft(), Zt("svg", Da, C[3] || (C[3] = [
                ne("path", {
                  d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                }, null, -1)
              ]))),
              C[4] || (C[4] = en("GitHub ", -1))
            ])
          ])
        ], 2), [
          [
            Rn,
            pe.value
          ]
        ]),
        pe.value ? Ir("", true) : (Ft(), Zt("div", Ua, C[6] || (C[6] = [
          ne("div", {
            class: "animate__animated animate__fadeIn"
          }, [
            ne("h1", {
              class: "intro-title animate__animated animate__fadeInDown"
            }, "Realtime Mandelbrot Viewer"),
            ne("h2", {
              class: "intro-sub animate__animated animate__fadeInUp animate__delay-1s"
            }, "deep zoom")
          ], -1)
        ])))
      ]));
    }
  }), La = {
    id: "fullscreen"
  }, Ba = ys({
    __name: "App",
    setup(e) {
      return fr(() => {
      }), (t, n) => (Ft(), Zt("div", La, [
        we(za)
      ]));
    }
  });
  wl(Ba).mount("#app");
})();
