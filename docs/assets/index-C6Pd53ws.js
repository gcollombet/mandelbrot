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
  const W = {}, lt = [], Me = () => {
  }, fi = () => false, un = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), kn = (e) => e.startsWith("onUpdate:"), re = Object.assign, Jn = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, ui = Object.prototype.hasOwnProperty, N = (e, t) => ui.call(e, t), R = Array.isArray, at = (e) => zt(e) === "[object Map]", dn = (e) => zt(e) === "[object Set]", xr = (e) => zt(e) === "[object Date]", F = (e) => typeof e == "function", Q = (e) => typeof e == "string", Oe = (e) => typeof e == "symbol", k = (e) => e !== null && typeof e == "object", rs = (e) => (k(e) || F(e)) && F(e.then) && F(e.catch), ss = Object.prototype.toString, zt = (e) => ss.call(e), di = (e) => zt(e).slice(8, -1), is = (e) => zt(e) === "[object Object]", Xn = (e) => Q(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, St = Yn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), hn = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  }, hi = /-(\w)/g, Ge = hn((e) => e.replace(hi, (t, n) => n ? n.toUpperCase() : "")), pi = /\B([A-Z])/g, nt = hn((e) => e.replace(pi, "-$1").toLowerCase()), os = hn((e) => e.charAt(0).toUpperCase() + e.slice(1)), Cn = hn((e) => e ? `on${os(e)}` : ""), We = (e, t) => !Object.is(e, t), Jt = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, Ln = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, tn = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  };
  let wr;
  const pn = () => wr || (wr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function Qn(e) {
    if (R(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], s = Q(r) ? bi(r) : Qn(r);
        if (s) for (const i in s) t[i] = s[i];
      }
      return t;
    } else if (Q(e) || k(e)) return e;
  }
  const gi = /;(?![^(]*\))/g, _i = /:([^]+)/, mi = /\/\*[^]*?\*\//g;
  function bi(e) {
    const t = {};
    return e.replace(mi, "").split(gi).forEach((n) => {
      if (n) {
        const r = n.split(_i);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }), t;
  }
  function Zn(e) {
    let t = "";
    if (Q(e)) t = e;
    else if (R(e)) for (let n = 0; n < e.length; n++) {
      const r = Zn(e[n]);
      r && (t += r + " ");
    }
    else if (k(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const vi = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", yi = Yn(vi);
  function ls(e) {
    return !!e || e === "";
  }
  function xi(e, t) {
    if (e.length !== t.length) return false;
    let n = true;
    for (let r = 0; n && r < e.length; r++) n = gn(e[r], t[r]);
    return n;
  }
  function gn(e, t) {
    if (e === t) return true;
    let n = xr(e), r = xr(t);
    if (n || r) return n && r ? e.getTime() === t.getTime() : false;
    if (n = Oe(e), r = Oe(t), n || r) return e === t;
    if (n = R(e), r = R(t), n || r) return n && r ? xi(e, t) : false;
    if (n = k(e), r = k(t), n || r) {
      if (!n || !r) return false;
      const s = Object.keys(e).length, i = Object.keys(t).length;
      if (s !== i) return false;
      for (const o in e) {
        const l = e.hasOwnProperty(o), c = t.hasOwnProperty(o);
        if (l && !c || !l && c || !gn(e[o], t[o])) return false;
      }
    }
    return String(e) === String(t);
  }
  function wi(e, t) {
    return e.findIndex((n) => gn(n, t));
  }
  const as = (e) => !!(e && e.__v_isRef === true), yt = (e) => Q(e) ? e : e == null ? "" : R(e) || k(e) && (e.toString === ss || !F(e.toString)) ? as(e) ? yt(e.value) : JSON.stringify(e, cs, 2) : String(e), cs = (e, t) => as(t) ? cs(e, t.value) : at(t) ? {
    [`Map(${t.size})`]: [
      ...t.entries()
    ].reduce((n, [r, s], i) => (n[Tn(r, i) + " =>"] = s, n), {})
  } : dn(t) ? {
    [`Set(${t.size})`]: [
      ...t.values()
    ].map((n) => Tn(n))
  } : Oe(t) ? Tn(t) : k(t) && !R(t) && !is(t) ? String(t) : t, Tn = (e, t = "") => {
    var n;
    return Oe(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
  let fe;
  class Si {
    constructor(t = false) {
      this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.parent = fe, !t && fe && (this.index = (fe.scopes || (fe.scopes = [])).push(this) - 1);
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
        const n = fe;
        try {
          return fe = this, t();
        } finally {
          fe = n;
        }
      }
    }
    on() {
      ++this._on === 1 && (this.prevScope = fe, fe = this);
    }
    off() {
      this._on > 0 && --this._on === 0 && (fe = this.prevScope, this.prevScope = void 0);
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
  function Ci() {
    return fe;
  }
  let K;
  const En = /* @__PURE__ */ new WeakSet();
  class fs {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, fe && fe.active && fe.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, En.has(this) && (En.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || ds(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, Sr(this), hs(this);
      const t = K, n = be;
      K = this, be = true;
      try {
        return this.fn();
      } finally {
        ps(this), K = t, be = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) nr(t);
        this.deps = this.depsTail = void 0, Sr(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? En.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      zn(this) && this.run();
    }
    get dirty() {
      return zn(this);
    }
  }
  let us = 0, Ct, Tt;
  function ds(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = Tt, Tt = e;
      return;
    }
    e.next = Ct, Ct = e;
  }
  function er() {
    us++;
  }
  function tr() {
    if (--us > 0) return;
    if (Tt) {
      let t = Tt;
      for (Tt = void 0; t; ) {
        const n = t.next;
        t.next = void 0, t.flags &= -9, t = n;
      }
    }
    let e;
    for (; Ct; ) {
      let t = Ct;
      for (Ct = void 0; t; ) {
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
  function hs(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function ps(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const s = r.prevDep;
      r.version === -1 ? (r === n && (n = s), nr(r), Ti(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = s;
    }
    e.deps = t, e.depsTail = n;
  }
  function zn(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (gs(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function gs(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Ft) || (e.globalVersion = Ft, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !zn(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = K, r = be;
    K = e, be = true;
    try {
      hs(e);
      const s = e.fn(e._value);
      (t.version === 0 || We(s, e._value)) && (e.flags |= 128, e._value = s, t.version++);
    } catch (s) {
      throw t.version++, s;
    } finally {
      K = n, be = r, ps(e), e.flags &= -3;
    }
  }
  function nr(e, t = false) {
    const { dep: n, prevSub: r, nextSub: s } = e;
    if (r && (r.nextSub = s, e.prevSub = void 0), s && (s.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
      n.computed.flags &= -5;
      for (let i = n.computed.deps; i; i = i.nextDep) nr(i, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function Ti(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let be = true;
  const _s = [];
  function Le() {
    _s.push(be), be = false;
  }
  function ze() {
    const e = _s.pop();
    be = e === void 0 ? true : e;
  }
  function Sr(e) {
    const { cleanup: t } = e;
    if (e.cleanup = void 0, t) {
      const n = K;
      K = void 0;
      try {
        t();
      } finally {
        K = n;
      }
    }
  }
  let Ft = 0;
  class Ei {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class rr {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!K || !be || K === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== K) n = this.activeLink = new Ei(K, this), K.deps ? (n.prevDep = K.depsTail, K.depsTail.nextDep = n, K.depsTail = n) : K.deps = K.depsTail = n, ms(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = K.depsTail, n.nextDep = void 0, K.depsTail.nextDep = n, K.depsTail = n, K.deps === n && (K.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, Ft++, this.notify(t);
    }
    notify(t) {
      er();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        tr();
      }
    }
  }
  function ms(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let r = t.deps; r; r = r.nextDep) ms(r);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const Bn = /* @__PURE__ */ new WeakMap(), tt = Symbol(""), Nn = Symbol(""), Vt = Symbol("");
  function te(e, t, n) {
    if (be && K) {
      let r = Bn.get(e);
      r || Bn.set(e, r = /* @__PURE__ */ new Map());
      let s = r.get(n);
      s || (r.set(n, s = new rr()), s.map = r, s.key = n), s.track();
    }
  }
  function Ve(e, t, n, r, s, i) {
    const o = Bn.get(e);
    if (!o) {
      Ft++;
      return;
    }
    const l = (c) => {
      c && c.trigger();
    };
    if (er(), t === "clear") o.forEach(l);
    else {
      const c = R(e), d = c && Xn(n);
      if (c && n === "length") {
        const u = Number(r);
        o.forEach((p, C) => {
          (C === "length" || C === Vt || !Oe(C) && C >= u) && l(p);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && l(o.get(n)), d && l(o.get(Vt)), t) {
        case "add":
          c ? d && l(o.get("length")) : (l(o.get(tt)), at(e) && l(o.get(Nn)));
          break;
        case "delete":
          c || (l(o.get(tt)), at(e) && l(o.get(Nn)));
          break;
        case "set":
          at(e) && l(o.get(tt));
          break;
      }
    }
    tr();
  }
  function st(e) {
    const t = B(e);
    return t === e ? t : (te(t, "iterate", Vt), _e(e) ? t : t.map(ee));
  }
  function _n(e) {
    return te(e = B(e), "iterate", Vt), e;
  }
  const Pi = {
    __proto__: null,
    [Symbol.iterator]() {
      return Pn(this, Symbol.iterator, ee);
    },
    concat(...e) {
      return st(this).concat(...e.map((t) => R(t) ? st(t) : t));
    },
    entries() {
      return Pn(this, "entries", (e) => (e[1] = ee(e[1]), e));
    },
    every(e, t) {
      return Ie(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return Ie(this, "filter", e, t, (n) => n.map(ee), arguments);
    },
    find(e, t) {
      return Ie(this, "find", e, t, ee, arguments);
    },
    findIndex(e, t) {
      return Ie(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return Ie(this, "findLast", e, t, ee, arguments);
    },
    findLastIndex(e, t) {
      return Ie(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return Ie(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return Mn(this, "includes", e);
    },
    indexOf(...e) {
      return Mn(this, "indexOf", e);
    },
    join(e) {
      return st(this).join(e);
    },
    lastIndexOf(...e) {
      return Mn(this, "lastIndexOf", e);
    },
    map(e, t) {
      return Ie(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return bt(this, "pop");
    },
    push(...e) {
      return bt(this, "push", e);
    },
    reduce(e, ...t) {
      return Cr(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return Cr(this, "reduceRight", e, t);
    },
    shift() {
      return bt(this, "shift");
    },
    some(e, t) {
      return Ie(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return bt(this, "splice", e);
    },
    toReversed() {
      return st(this).toReversed();
    },
    toSorted(e) {
      return st(this).toSorted(e);
    },
    toSpliced(...e) {
      return st(this).toSpliced(...e);
    },
    unshift(...e) {
      return bt(this, "unshift", e);
    },
    values() {
      return Pn(this, "values", ee);
    }
  };
  function Pn(e, t, n) {
    const r = _n(e), s = r[t]();
    return r !== e && !_e(e) && (s._next = s.next, s.next = () => {
      const i = s._next();
      return i.value && (i.value = n(i.value)), i;
    }), s;
  }
  const Mi = Array.prototype;
  function Ie(e, t, n, r, s, i) {
    const o = _n(e), l = o !== e && !_e(e), c = o[t];
    if (c !== Mi[t]) {
      const p = c.apply(e, i);
      return l ? ee(p) : p;
    }
    let d = n;
    o !== e && (l ? d = function(p, C) {
      return n.call(this, ee(p), C, e);
    } : n.length > 2 && (d = function(p, C) {
      return n.call(this, p, C, e);
    }));
    const u = c.call(o, d, r);
    return l && s ? s(u) : u;
  }
  function Cr(e, t, n, r) {
    const s = _n(e);
    let i = n;
    return s !== e && (_e(e) ? n.length > 3 && (i = function(o, l, c) {
      return n.call(this, o, l, c, e);
    }) : i = function(o, l, c) {
      return n.call(this, o, ee(l), c, e);
    }), s[t](i, ...r);
  }
  function Mn(e, t, n) {
    const r = B(e);
    te(r, "iterate", Vt);
    const s = r[t](...n);
    return (s === -1 || s === false) && lr(n[0]) ? (n[0] = B(n[0]), r[t](...n)) : s;
  }
  function bt(e, t, n = []) {
    Le(), er();
    const r = B(e)[t].apply(e, n);
    return tr(), ze(), r;
  }
  const Oi = Yn("__proto__,__v_isRef,__isVue"), bs = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(Oe));
  function Ri(e) {
    Oe(e) || (e = String(e));
    const t = B(this);
    return te(t, "has", e), t.hasOwnProperty(e);
  }
  class vs {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const s = this._isReadonly, i = this._isShallow;
      if (n === "__v_isReactive") return !s;
      if (n === "__v_isReadonly") return s;
      if (n === "__v_isShallow") return i;
      if (n === "__v_raw") return r === (s ? i ? Ni : Ss : i ? ws : xs).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const o = R(t);
      if (!s) {
        let c;
        if (o && (c = Pi[n])) return c;
        if (n === "hasOwnProperty") return Ri;
      }
      const l = Reflect.get(t, n, ne(t) ? t : r);
      return (Oe(n) ? bs.has(n) : Oi(n)) || (s || te(t, "get", n), i) ? l : ne(l) ? o && Xn(n) ? l : l.value : k(l) ? s ? Cs(l) : ir(l) : l;
    }
  }
  class ys extends vs {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, s) {
      let i = t[n];
      if (!this._isShallow) {
        const c = Ke(i);
        if (!_e(r) && !Ke(r) && (i = B(i), r = B(r)), !R(t) && ne(i) && !ne(r)) return c ? false : (i.value = r, true);
      }
      const o = R(t) && Xn(n) ? Number(n) < t.length : N(t, n), l = Reflect.set(t, n, r, ne(t) ? t : s);
      return t === B(s) && (o ? We(r, i) && Ve(t, "set", n, r) : Ve(t, "add", n, r)), l;
    }
    deleteProperty(t, n) {
      const r = N(t, n);
      t[n];
      const s = Reflect.deleteProperty(t, n);
      return s && r && Ve(t, "delete", n, void 0), s;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!Oe(n) || !bs.has(n)) && te(t, "has", n), r;
    }
    ownKeys(t) {
      return te(t, "iterate", R(t) ? "length" : tt), Reflect.ownKeys(t);
    }
  }
  class Ai extends vs {
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
  const Ii = new ys(), Fi = new Ai(), Vi = new ys(true);
  const Hn = (e) => e, $t = (e) => Reflect.getPrototypeOf(e);
  function Di(e, t, n) {
    return function(...r) {
      const s = this.__v_raw, i = B(s), o = at(i), l = e === "entries" || e === Symbol.iterator && o, c = e === "keys" && o, d = s[e](...r), u = n ? Hn : t ? nn : ee;
      return !t && te(i, "iterate", c ? Nn : tt), {
        next() {
          const { value: p, done: C } = d.next();
          return C ? {
            value: p,
            done: C
          } : {
            value: l ? [
              u(p[0]),
              u(p[1])
            ] : u(p),
            done: C
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
  function Ui(e, t) {
    const n = {
      get(s) {
        const i = this.__v_raw, o = B(i), l = B(s);
        e || (We(s, l) && te(o, "get", s), te(o, "get", l));
        const { has: c } = $t(o), d = t ? Hn : e ? nn : ee;
        if (c.call(o, s)) return d(i.get(s));
        if (c.call(o, l)) return d(i.get(l));
        i !== o && i.get(s);
      },
      get size() {
        const s = this.__v_raw;
        return !e && te(B(s), "iterate", tt), Reflect.get(s, "size", s);
      },
      has(s) {
        const i = this.__v_raw, o = B(i), l = B(s);
        return e || (We(s, l) && te(o, "has", s), te(o, "has", l)), s === l ? i.has(s) : i.has(s) || i.has(l);
      },
      forEach(s, i) {
        const o = this, l = o.__v_raw, c = B(l), d = t ? Hn : e ? nn : ee;
        return !e && te(c, "iterate", tt), l.forEach((u, p) => s.call(i, d(u), d(p), o));
      }
    };
    return re(n, e ? {
      add: Wt("add"),
      set: Wt("set"),
      delete: Wt("delete"),
      clear: Wt("clear")
    } : {
      add(s) {
        !t && !_e(s) && !Ke(s) && (s = B(s));
        const i = B(this);
        return $t(i).has.call(i, s) || (i.add(s), Ve(i, "add", s, s)), this;
      },
      set(s, i) {
        !t && !_e(i) && !Ke(i) && (i = B(i));
        const o = B(this), { has: l, get: c } = $t(o);
        let d = l.call(o, s);
        d || (s = B(s), d = l.call(o, s));
        const u = c.call(o, s);
        return o.set(s, i), d ? We(i, u) && Ve(o, "set", s, i) : Ve(o, "add", s, i), this;
      },
      delete(s) {
        const i = B(this), { has: o, get: l } = $t(i);
        let c = o.call(i, s);
        c || (s = B(s), c = o.call(i, s)), l && l.call(i, s);
        const d = i.delete(s);
        return c && Ve(i, "delete", s, void 0), d;
      },
      clear() {
        const s = B(this), i = s.size !== 0, o = s.clear();
        return i && Ve(s, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((s) => {
      n[s] = Di(s, e, t);
    }), n;
  }
  function sr(e, t) {
    const n = Ui(e, t);
    return (r, s, i) => s === "__v_isReactive" ? !e : s === "__v_isReadonly" ? e : s === "__v_raw" ? r : Reflect.get(N(n, s) && s in r ? n : r, s, i);
  }
  const Li = {
    get: sr(false, false)
  }, zi = {
    get: sr(false, true)
  }, Bi = {
    get: sr(true, false)
  };
  const xs = /* @__PURE__ */ new WeakMap(), ws = /* @__PURE__ */ new WeakMap(), Ss = /* @__PURE__ */ new WeakMap(), Ni = /* @__PURE__ */ new WeakMap();
  function Hi(e) {
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
  function ji(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Hi(di(e));
  }
  function ir(e) {
    return Ke(e) ? e : or(e, false, Ii, Li, xs);
  }
  function $i(e) {
    return or(e, false, Vi, zi, ws);
  }
  function Cs(e) {
    return or(e, true, Fi, Bi, Ss);
  }
  function or(e, t, n, r, s) {
    if (!k(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const i = ji(e);
    if (i === 0) return e;
    const o = s.get(e);
    if (o) return o;
    const l = new Proxy(e, i === 2 ? r : n);
    return s.set(e, l), l;
  }
  function ct(e) {
    return Ke(e) ? ct(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function Ke(e) {
    return !!(e && e.__v_isReadonly);
  }
  function _e(e) {
    return !!(e && e.__v_isShallow);
  }
  function lr(e) {
    return e ? !!e.__v_raw : false;
  }
  function B(e) {
    const t = e && e.__v_raw;
    return t ? B(t) : e;
  }
  function Wi(e) {
    return !N(e, "__v_skip") && Object.isExtensible(e) && Ln(e, "__v_skip", true), e;
  }
  const ee = (e) => k(e) ? ir(e) : e, nn = (e) => k(e) ? Cs(e) : e;
  function ne(e) {
    return e ? e.__v_isRef === true : false;
  }
  function Et(e) {
    return Gi(e, false);
  }
  function Gi(e, t) {
    return ne(e) ? e : new Ki(e, t);
  }
  class Ki {
    constructor(t, n) {
      this.dep = new rr(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : B(t), this._value = n ? t : ee(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || _e(t) || Ke(t);
      t = r ? t : B(t), We(t, n) && (this._rawValue = t, this._value = r ? t : ee(t), this.dep.trigger());
    }
  }
  function qi(e) {
    return ne(e) ? e.value : e;
  }
  const Yi = {
    get: (e, t, n) => t === "__v_raw" ? e : qi(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const s = e[t];
      return ne(s) && !ne(n) ? (s.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function Ts(e) {
    return ct(e) ? e : new Proxy(e, Yi);
  }
  class ki {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new rr(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Ft - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && K !== this) return ds(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return gs(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function Ji(e, t, n = false) {
    let r, s;
    return F(e) ? r = e : (r = e.get, s = e.set), new ki(r, s, n);
  }
  const Gt = {}, rn = /* @__PURE__ */ new WeakMap();
  let Qe;
  function Xi(e, t = false, n = Qe) {
    if (n) {
      let r = rn.get(n);
      r || rn.set(n, r = []), r.push(e);
    }
  }
  function Qi(e, t, n = W) {
    const { immediate: r, deep: s, once: i, scheduler: o, augmentJob: l, call: c } = n, d = (T) => s ? T : _e(T) || s === false || s === 0 ? De(T, 1) : De(T);
    let u, p, C, E, O = false, y = false;
    if (ne(e) ? (p = () => e.value, O = _e(e)) : ct(e) ? (p = () => d(e), O = true) : R(e) ? (y = true, O = e.some((T) => ct(T) || _e(T)), p = () => e.map((T) => {
      if (ne(T)) return T.value;
      if (ct(T)) return d(T);
      if (F(T)) return c ? c(T, 2) : T();
    })) : F(e) ? t ? p = c ? () => c(e, 2) : e : p = () => {
      if (C) {
        Le();
        try {
          C();
        } finally {
          ze();
        }
      }
      const T = Qe;
      Qe = u;
      try {
        return c ? c(e, 3, [
          E
        ]) : e(E);
      } finally {
        Qe = T;
      }
    } : p = Me, t && s) {
      const T = p, I = s === true ? 1 / 0 : s;
      p = () => De(T(), I);
    }
    const D = Ci(), H = () => {
      u.stop(), D && D.active && Jn(D.effects, u);
    };
    if (i && t) {
      const T = t;
      t = (...I) => {
        T(...I), H();
      };
    }
    let J = y ? new Array(e.length).fill(Gt) : Gt;
    const q = (T) => {
      if (!(!(u.flags & 1) || !u.dirty && !T)) if (t) {
        const I = u.run();
        if (s || O || (y ? I.some((X, se) => We(X, J[se])) : We(I, J))) {
          C && C();
          const X = Qe;
          Qe = u;
          try {
            const se = [
              I,
              J === Gt ? void 0 : y && J[0] === Gt ? [] : J,
              E
            ];
            J = I, c ? c(t, 3, se) : t(...se);
          } finally {
            Qe = X;
          }
        }
      } else u.run();
    };
    return l && l(q), u = new fs(p), u.scheduler = o ? () => o(q, false) : q, E = (T) => Xi(T, false, u), C = u.onStop = () => {
      const T = rn.get(u);
      if (T) {
        if (c) c(T, 4);
        else for (const I of T) I();
        rn.delete(u);
      }
    }, t ? r ? q(true) : J = u.run() : o ? o(q.bind(null, true), true) : u.run(), H.pause = u.pause.bind(u), H.resume = u.resume.bind(u), H.stop = H, H;
  }
  function De(e, t = 1 / 0, n) {
    if (t <= 0 || !k(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
    if (n.add(e), t--, ne(e)) De(e.value, t, n);
    else if (R(e)) for (let r = 0; r < e.length; r++) De(e[r], t, n);
    else if (dn(e) || at(e)) e.forEach((r) => {
      De(r, t, n);
    });
    else if (is(e)) {
      for (const r in e) De(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && De(e[r], t, n);
    }
    return e;
  }
  function Bt(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (s) {
      mn(s, t, n);
    }
  }
  function Re(e, t, n, r) {
    if (F(e)) {
      const s = Bt(e, t, n, r);
      return s && rs(s) && s.catch((i) => {
        mn(i, t, n);
      }), s;
    }
    if (R(e)) {
      const s = [];
      for (let i = 0; i < e.length; i++) s.push(Re(e[i], t, n, r));
      return s;
    }
  }
  function mn(e, t, n, r = true) {
    const s = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: o } = t && t.appContext.config || W;
    if (t) {
      let l = t.parent;
      const c = t.proxy, d = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; l; ) {
        const u = l.ec;
        if (u) {
          for (let p = 0; p < u.length; p++) if (u[p](e, c, d) === false) return;
        }
        l = l.parent;
      }
      if (i) {
        Le(), Bt(i, null, 10, [
          e,
          c,
          d
        ]), ze();
        return;
      }
    }
    Zi(e, n, s, r, o);
  }
  function Zi(e, t, n, r = true, s = false) {
    if (s) throw e;
    console.error(e);
  }
  const oe = [];
  let Te = -1;
  const ft = [];
  let je = null, ot = 0;
  const Es = Promise.resolve();
  let sn = null;
  function Ps(e) {
    const t = sn || Es;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function eo(e) {
    let t = Te + 1, n = oe.length;
    for (; t < n; ) {
      const r = t + n >>> 1, s = oe[r], i = Dt(s);
      i < e || i === e && s.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function ar(e) {
    if (!(e.flags & 1)) {
      const t = Dt(e), n = oe[oe.length - 1];
      !n || !(e.flags & 2) && t >= Dt(n) ? oe.push(e) : oe.splice(eo(t), 0, e), e.flags |= 1, Ms();
    }
  }
  function Ms() {
    sn || (sn = Es.then(Rs));
  }
  function to(e) {
    R(e) ? ft.push(...e) : je && e.id === -1 ? je.splice(ot + 1, 0, e) : e.flags & 1 || (ft.push(e), e.flags |= 1), Ms();
  }
  function Tr(e, t, n = Te + 1) {
    for (; n < oe.length; n++) {
      const r = oe[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        oe.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function Os(e) {
    if (ft.length) {
      const t = [
        ...new Set(ft)
      ].sort((n, r) => Dt(n) - Dt(r));
      if (ft.length = 0, je) {
        je.push(...t);
        return;
      }
      for (je = t, ot = 0; ot < je.length; ot++) {
        const n = je[ot];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      je = null, ot = 0;
    }
  }
  const Dt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function Rs(e) {
    try {
      for (Te = 0; Te < oe.length; Te++) {
        const t = oe[Te];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Bt(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; Te < oe.length; Te++) {
        const t = oe[Te];
        t && (t.flags &= -2);
      }
      Te = -1, oe.length = 0, Os(), sn = null, (oe.length || ft.length) && Rs();
    }
  }
  let ge = null, As = null;
  function on(e) {
    const t = ge;
    return ge = e, As = e && e.type.__scopeId || null, t;
  }
  function no(e, t = ge, n) {
    if (!t || e._n) return e;
    const r = (...s) => {
      r._d && Vr(-1);
      const i = on(t);
      let o;
      try {
        o = e(...s);
      } finally {
        on(i), r._d && Vr(1);
      }
      return o;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function Kt(e, t) {
    if (ge === null) return e;
    const n = wn(ge), r = e.dirs || (e.dirs = []);
    for (let s = 0; s < t.length; s++) {
      let [i, o, l, c = W] = t[s];
      i && (F(i) && (i = {
        mounted: i,
        updated: i
      }), i.deep && De(o), r.push({
        dir: i,
        instance: n,
        value: o,
        oldValue: void 0,
        arg: l,
        modifiers: c
      }));
    }
    return e;
  }
  function Je(e, t, n, r) {
    const s = e.dirs, i = t && t.dirs;
    for (let o = 0; o < s.length; o++) {
      const l = s[o];
      i && (l.oldValue = i[o].value);
      let c = l.dir[r];
      c && (Le(), Re(c, n, 8, [
        e.el,
        l,
        e,
        t
      ]), ze());
    }
  }
  const ro = Symbol("_vte"), so = (e) => e.__isTeleport;
  function cr(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, cr(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function fr(e, t) {
    return F(e) ? re({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function Is(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function Pt(e, t, n, r, s = false) {
    if (R(e)) {
      e.forEach((O, y) => Pt(O, t && (R(t) ? t[y] : t), n, r, s));
      return;
    }
    if (Mt(r) && !s) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Pt(e, t, n, r.component.subTree);
      return;
    }
    const i = r.shapeFlag & 4 ? wn(r.component) : r.el, o = s ? null : i, { i: l, r: c } = e, d = t && t.r, u = l.refs === W ? l.refs = {} : l.refs, p = l.setupState, C = B(p), E = p === W ? () => false : (O) => N(C, O);
    if (d != null && d !== c && (Q(d) ? (u[d] = null, E(d) && (p[d] = null)) : ne(d) && (d.value = null)), F(c)) Bt(c, l, 12, [
      o,
      u
    ]);
    else {
      const O = Q(c), y = ne(c);
      if (O || y) {
        const D = () => {
          if (e.f) {
            const H = O ? E(c) ? p[c] : u[c] : c.value;
            s ? R(H) && Jn(H, i) : R(H) ? H.includes(i) || H.push(i) : O ? (u[c] = [
              i
            ], E(c) && (p[c] = u[c])) : (c.value = [
              i
            ], e.k && (u[e.k] = c.value));
          } else O ? (u[c] = o, E(c) && (p[c] = o)) : y && (c.value = o, e.k && (u[e.k] = o));
        };
        o ? (D.id = -1, he(D, n)) : D();
      }
    }
  }
  pn().requestIdleCallback;
  pn().cancelIdleCallback;
  const Mt = (e) => !!e.type.__asyncLoader, Fs = (e) => e.type.__isKeepAlive;
  function io(e, t) {
    Vs(e, "a", t);
  }
  function oo(e, t) {
    Vs(e, "da", t);
  }
  function Vs(e, t, n = le) {
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
      for (; s && s.parent; ) Fs(s.parent.vnode) && lo(r, t, n, s), s = s.parent;
    }
  }
  function lo(e, t, n, r) {
    const s = bn(t, e, r, true);
    ur(() => {
      Jn(r[t], s);
    }, n);
  }
  function bn(e, t, n = le, r = false) {
    if (n) {
      const s = n[e] || (n[e] = []), i = t.__weh || (t.__weh = (...o) => {
        Le();
        const l = Nt(n), c = Re(t, n, e, o);
        return l(), ze(), c;
      });
      return r ? s.unshift(i) : s.push(i), i;
    }
  }
  const Be = (e) => (t, n = le) => {
    (!Lt || e === "sp") && bn(e, (...r) => t(...r), n);
  }, ao = Be("bm"), vn = Be("m"), co = Be("bu"), fo = Be("u"), uo = Be("bum"), ur = Be("um"), ho = Be("sp"), po = Be("rtg"), go = Be("rtc");
  function _o(e, t = le) {
    bn("ec", e, t);
  }
  const mo = Symbol.for("v-ndc");
  function bo(e, t, n, r) {
    let s;
    const i = n, o = R(e);
    if (o || Q(e)) {
      const l = o && ct(e);
      let c = false, d = false;
      l && (c = !_e(e), d = Ke(e), e = _n(e)), s = new Array(e.length);
      for (let u = 0, p = e.length; u < p; u++) s[u] = t(c ? d ? nn(ee(e[u])) : ee(e[u]) : e[u], u, void 0, i);
    } else if (typeof e == "number") {
      s = new Array(e);
      for (let l = 0; l < e; l++) s[l] = t(l + 1, l, void 0, i);
    } else if (k(e)) if (e[Symbol.iterator]) s = Array.from(e, (l, c) => t(l, c, void 0, i));
    else {
      const l = Object.keys(e);
      s = new Array(l.length);
      for (let c = 0, d = l.length; c < d; c++) {
        const u = l[c];
        s[c] = t(e[u], u, c, i);
      }
    }
    else s = [];
    return s;
  }
  const jn = (e) => e ? ei(e) ? wn(e) : jn(e.parent) : null, Ot = re(/* @__PURE__ */ Object.create(null), {
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
    $options: (e) => Us(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      ar(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Ps.bind(e.proxy)),
    $watch: (e) => No.bind(e)
  }), On = (e, t) => e !== W && !e.__isScriptSetup && N(e, t), vo = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: r, data: s, props: i, accessCache: o, type: l, appContext: c } = e;
      let d;
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
          if (On(r, t)) return o[t] = 1, r[t];
          if (s !== W && N(s, t)) return o[t] = 2, s[t];
          if ((d = e.propsOptions[0]) && N(d, t)) return o[t] = 3, i[t];
          if (n !== W && N(n, t)) return o[t] = 4, n[t];
          $n && (o[t] = 0);
        }
      }
      const u = Ot[t];
      let p, C;
      if (u) return t === "$attrs" && te(e.attrs, "get", ""), u(e);
      if ((p = l.__cssModules) && (p = p[t])) return p;
      if (n !== W && N(n, t)) return o[t] = 4, n[t];
      if (C = c.config.globalProperties, N(C, t)) return C[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: s, ctx: i } = e;
      return On(s, t) ? (s[t] = n, true) : r !== W && N(r, t) ? (r[t] = n, true) : N(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (i[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: s, propsOptions: i } }, o) {
      let l;
      return !!n[o] || e !== W && N(e, o) || On(t, o) || (l = i[0]) && N(l, o) || N(r, o) || N(Ot, o) || N(s.config.globalProperties, o);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : N(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function Er(e) {
    return R(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  let $n = true;
  function yo(e) {
    const t = Us(e), n = e.proxy, r = e.ctx;
    $n = false, t.beforeCreate && Pr(t.beforeCreate, e, "bc");
    const { data: s, computed: i, methods: o, watch: l, provide: c, inject: d, created: u, beforeMount: p, mounted: C, beforeUpdate: E, updated: O, activated: y, deactivated: D, beforeDestroy: H, beforeUnmount: J, destroyed: q, unmounted: T, render: I, renderTracked: X, renderTriggered: se, errorCaptured: ue, serverPrefetch: Ne, expose: me, inheritAttrs: Ae, components: He, directives: ve, filters: qe } = t;
    if (d && xo(d, r, null), o) for (const Y in o) {
      const $ = o[Y];
      F($) && (r[Y] = $.bind(n));
    }
    if (s) {
      const Y = s.call(n, n);
      k(Y) && (e.data = ir(Y));
    }
    if ($n = true, i) for (const Y in i) {
      const $ = i[Y], Ye = F($) ? $.bind(n, n) : F($.get) ? $.get.bind(n, n) : Me, Ht = !F($) && F($.set) ? $.set.bind(n) : Me, ke = Ze({
        get: Ye,
        set: Ht
      });
      Object.defineProperty(r, Y, {
        enumerable: true,
        configurable: true,
        get: () => ke.value,
        set: (ye) => ke.value = ye
      });
    }
    if (l) for (const Y in l) Ds(l[Y], r, n, Y);
    if (c) {
      const Y = F(c) ? c.call(n) : c;
      Reflect.ownKeys(Y).forEach(($) => {
        Po($, Y[$]);
      });
    }
    u && Pr(u, e, "c");
    function Z(Y, $) {
      R($) ? $.forEach((Ye) => Y(Ye.bind(n))) : $ && Y($.bind(n));
    }
    if (Z(ao, p), Z(vn, C), Z(co, E), Z(fo, O), Z(io, y), Z(oo, D), Z(_o, ue), Z(go, X), Z(po, se), Z(uo, J), Z(ur, T), Z(ho, Ne), R(me)) if (me.length) {
      const Y = e.exposed || (e.exposed = {});
      me.forEach(($) => {
        Object.defineProperty(Y, $, {
          get: () => n[$],
          set: (Ye) => n[$] = Ye,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    I && e.render === Me && (e.render = I), Ae != null && (e.inheritAttrs = Ae), He && (e.components = He), ve && (e.directives = ve), Ne && Is(e);
  }
  function xo(e, t, n = Me) {
    R(e) && (e = Wn(e));
    for (const r in e) {
      const s = e[r];
      let i;
      k(s) ? "default" in s ? i = Xt(s.from || r, s.default, true) : i = Xt(s.from || r) : i = Xt(s), ne(i) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => i.value,
        set: (o) => i.value = o
      }) : t[r] = i;
    }
  }
  function Pr(e, t, n) {
    Re(R(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function Ds(e, t, n, r) {
    let s = r.includes(".") ? ks(n, r) : () => n[r];
    if (Q(e)) {
      const i = t[e];
      F(i) && An(s, i);
    } else if (F(e)) An(s, e.bind(n));
    else if (k(e)) if (R(e)) e.forEach((i) => Ds(i, t, n, r));
    else {
      const i = F(e.handler) ? e.handler.bind(n) : t[e.handler];
      F(i) && An(s, i, e);
    }
  }
  function Us(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: s, optionsCache: i, config: { optionMergeStrategies: o } } = e.appContext, l = i.get(t);
    let c;
    return l ? c = l : !s.length && !n && !r ? c = t : (c = {}, s.length && s.forEach((d) => ln(c, d, o, true)), ln(c, t, o)), k(t) && i.set(t, c), c;
  }
  function ln(e, t, n, r = false) {
    const { mixins: s, extends: i } = t;
    i && ln(e, i, n, true), s && s.forEach((o) => ln(e, o, n, true));
    for (const o in t) if (!(r && o === "expose")) {
      const l = wo[o] || n && n[o];
      e[o] = l ? l(e[o], t[o]) : t[o];
    }
    return e;
  }
  const wo = {
    data: Mr,
    props: Or,
    emits: Or,
    methods: xt,
    computed: xt,
    beforeCreate: ie,
    created: ie,
    beforeMount: ie,
    mounted: ie,
    beforeUpdate: ie,
    updated: ie,
    beforeDestroy: ie,
    beforeUnmount: ie,
    destroyed: ie,
    unmounted: ie,
    activated: ie,
    deactivated: ie,
    errorCaptured: ie,
    serverPrefetch: ie,
    components: xt,
    directives: xt,
    watch: Co,
    provide: Mr,
    inject: So
  };
  function Mr(e, t) {
    return t ? e ? function() {
      return re(F(e) ? e.call(this, this) : e, F(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function So(e, t) {
    return xt(Wn(e), Wn(t));
  }
  function Wn(e) {
    if (R(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
      return t;
    }
    return e;
  }
  function ie(e, t) {
    return e ? [
      ...new Set([].concat(e, t))
    ] : t;
  }
  function xt(e, t) {
    return e ? re(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function Or(e, t) {
    return e ? R(e) && R(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : re(/* @__PURE__ */ Object.create(null), Er(e), Er(t ?? {})) : t;
  }
  function Co(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = re(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = ie(e[r], t[r]);
    return n;
  }
  function Ls() {
    return {
      app: null,
      config: {
        isNativeTag: fi,
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
  let To = 0;
  function Eo(e, t) {
    return function(r, s = null) {
      F(r) || (r = re({}, r)), s != null && !k(s) && (s = null);
      const i = Ls(), o = /* @__PURE__ */ new WeakSet(), l = [];
      let c = false;
      const d = i.app = {
        _uid: To++,
        _component: r,
        _props: s,
        _container: null,
        _context: i,
        _instance: null,
        version: al,
        get config() {
          return i.config;
        },
        set config(u) {
        },
        use(u, ...p) {
          return o.has(u) || (u && F(u.install) ? (o.add(u), u.install(d, ...p)) : F(u) && (o.add(u), u(d, ...p))), d;
        },
        mixin(u) {
          return i.mixins.includes(u) || i.mixins.push(u), d;
        },
        component(u, p) {
          return p ? (i.components[u] = p, d) : i.components[u];
        },
        directive(u, p) {
          return p ? (i.directives[u] = p, d) : i.directives[u];
        },
        mount(u, p, C) {
          if (!c) {
            const E = d._ceVNode || Ue(r, s);
            return E.appContext = i, C === true ? C = "svg" : C === false && (C = void 0), e(E, u, C), c = true, d._container = u, u.__vue_app__ = d, wn(E.component);
          }
        },
        onUnmount(u) {
          l.push(u);
        },
        unmount() {
          c && (Re(l, d._instance, 16), e(null, d._container), delete d._container.__vue_app__);
        },
        provide(u, p) {
          return i.provides[u] = p, d;
        },
        runWithContext(u) {
          const p = ut;
          ut = d;
          try {
            return u();
          } finally {
            ut = p;
          }
        }
      };
      return d;
    };
  }
  let ut = null;
  function Po(e, t) {
    if (le) {
      let n = le.provides;
      const r = le.parent && le.parent.provides;
      r === n && (n = le.provides = Object.create(r)), n[e] = t;
    }
  }
  function Xt(e, t, n = false) {
    const r = nl();
    if (r || ut) {
      let s = ut ? ut._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (s && e in s) return s[e];
      if (arguments.length > 1) return n && F(t) ? t.call(r && r.proxy) : t;
    }
  }
  const zs = {}, Bs = () => Object.create(zs), Ns = (e) => Object.getPrototypeOf(e) === zs;
  function Mo(e, t, n, r = false) {
    const s = {}, i = Bs();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Hs(e, t, s, i);
    for (const o in e.propsOptions[0]) o in s || (s[o] = void 0);
    n ? e.props = r ? s : $i(s) : e.type.props ? e.props = s : e.props = i, e.attrs = i;
  }
  function Oo(e, t, n, r) {
    const { props: s, attrs: i, vnode: { patchFlag: o } } = e, l = B(s), [c] = e.propsOptions;
    let d = false;
    if ((r || o > 0) && !(o & 16)) {
      if (o & 8) {
        const u = e.vnode.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          let C = u[p];
          if (yn(e.emitsOptions, C)) continue;
          const E = t[C];
          if (c) if (N(i, C)) E !== i[C] && (i[C] = E, d = true);
          else {
            const O = Ge(C);
            s[O] = Gn(c, l, O, E, e, false);
          }
          else E !== i[C] && (i[C] = E, d = true);
        }
      }
    } else {
      Hs(e, t, s, i) && (d = true);
      let u;
      for (const p in l) (!t || !N(t, p) && ((u = nt(p)) === p || !N(t, u))) && (c ? n && (n[p] !== void 0 || n[u] !== void 0) && (s[p] = Gn(c, l, p, void 0, e, true)) : delete s[p]);
      if (i !== l) for (const p in i) (!t || !N(t, p)) && (delete i[p], d = true);
    }
    d && Ve(e.attrs, "set", "");
  }
  function Hs(e, t, n, r) {
    const [s, i] = e.propsOptions;
    let o = false, l;
    if (t) for (let c in t) {
      if (St(c)) continue;
      const d = t[c];
      let u;
      s && N(s, u = Ge(c)) ? !i || !i.includes(u) ? n[u] = d : (l || (l = {}))[u] = d : yn(e.emitsOptions, c) || (!(c in r) || d !== r[c]) && (r[c] = d, o = true);
    }
    if (i) {
      const c = B(n), d = l || W;
      for (let u = 0; u < i.length; u++) {
        const p = i[u];
        n[p] = Gn(s, c, p, d[p], e, !N(d, p));
      }
    }
    return o;
  }
  function Gn(e, t, n, r, s, i) {
    const o = e[n];
    if (o != null) {
      const l = N(o, "default");
      if (l && r === void 0) {
        const c = o.default;
        if (o.type !== Function && !o.skipFactory && F(c)) {
          const { propsDefaults: d } = s;
          if (n in d) r = d[n];
          else {
            const u = Nt(s);
            r = d[n] = c.call(null, t), u();
          }
        } else r = c;
        s.ce && s.ce._setProp(n, r);
      }
      o[0] && (i && !l ? r = false : o[1] && (r === "" || r === nt(n)) && (r = true));
    }
    return r;
  }
  const Ro = /* @__PURE__ */ new WeakMap();
  function js(e, t, n = false) {
    const r = n ? Ro : t.propsCache, s = r.get(e);
    if (s) return s;
    const i = e.props, o = {}, l = [];
    let c = false;
    if (!F(e)) {
      const u = (p) => {
        c = true;
        const [C, E] = js(p, t, true);
        re(o, C), E && l.push(...E);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!i && !c) return k(e) && r.set(e, lt), lt;
    if (R(i)) for (let u = 0; u < i.length; u++) {
      const p = Ge(i[u]);
      Rr(p) && (o[p] = W);
    }
    else if (i) for (const u in i) {
      const p = Ge(u);
      if (Rr(p)) {
        const C = i[u], E = o[p] = R(C) || F(C) ? {
          type: C
        } : re({}, C), O = E.type;
        let y = false, D = true;
        if (R(O)) for (let H = 0; H < O.length; ++H) {
          const J = O[H], q = F(J) && J.name;
          if (q === "Boolean") {
            y = true;
            break;
          } else q === "String" && (D = false);
        }
        else y = F(O) && O.name === "Boolean";
        E[0] = y, E[1] = D, (y || N(E, "default")) && l.push(p);
      }
    }
    const d = [
      o,
      l
    ];
    return k(e) && r.set(e, d), d;
  }
  function Rr(e) {
    return e[0] !== "$" && !St(e);
  }
  const dr = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", hr = (e) => R(e) ? e.map(Pe) : [
    Pe(e)
  ], Ao = (e, t, n) => {
    if (t._n) return t;
    const r = no((...s) => hr(t(...s)), n);
    return r._c = false, r;
  }, $s = (e, t, n) => {
    const r = e._ctx;
    for (const s in e) {
      if (dr(s)) continue;
      const i = e[s];
      if (F(i)) t[s] = Ao(s, i, r);
      else if (i != null) {
        const o = hr(i);
        t[s] = () => o;
      }
    }
  }, Ws = (e, t) => {
    const n = hr(t);
    e.slots.default = () => n;
  }, Gs = (e, t, n) => {
    for (const r in t) (n || !dr(r)) && (e[r] = t[r]);
  }, Io = (e, t, n) => {
    const r = e.slots = Bs();
    if (e.vnode.shapeFlag & 32) {
      const s = t.__;
      s && Ln(r, "__", s, true);
      const i = t._;
      i ? (Gs(r, t, n), n && Ln(r, "_", i, true)) : $s(t, r);
    } else t && Ws(e, t);
  }, Fo = (e, t, n) => {
    const { vnode: r, slots: s } = e;
    let i = true, o = W;
    if (r.shapeFlag & 32) {
      const l = t._;
      l ? n && l === 1 ? i = false : Gs(s, t, n) : (i = !t.$stable, $s(t, s)), o = t;
    } else t && (Ws(e, t), o = {
      default: 1
    });
    if (i) for (const l in s) !dr(l) && o[l] == null && delete s[l];
  }, he = qo;
  function Vo(e) {
    return Do(e);
  }
  function Do(e, t) {
    const n = pn();
    n.__VUE__ = true;
    const { insert: r, remove: s, patchProp: i, createElement: o, createText: l, createComment: c, setText: d, setElementText: u, parentNode: p, nextSibling: C, setScopeId: E = Me, insertStaticContent: O } = e, y = (a, f, h, m = null, g = null, _ = null, w = void 0, x = null, v = !!f.dynamicChildren) => {
      if (a === f) return;
      a && !vt(a, f) && (m = jt(a), ye(a, g, _, true), a = null), f.patchFlag === -2 && (v = false, f.dynamicChildren = null);
      const { type: b, ref: M, shapeFlag: S } = f;
      switch (b) {
        case xn:
          D(a, f, h, m);
          break;
        case ht:
          H(a, f, h, m);
          break;
        case In:
          a == null && J(f, h, m, w);
          break;
        case Ee:
          He(a, f, h, m, g, _, w, x, v);
          break;
        default:
          S & 1 ? I(a, f, h, m, g, _, w, x, v) : S & 6 ? ve(a, f, h, m, g, _, w, x, v) : (S & 64 || S & 128) && b.process(a, f, h, m, g, _, w, x, v, _t);
      }
      M != null && g ? Pt(M, a && a.ref, _, f || a, !f) : M == null && a && a.ref != null && Pt(a.ref, null, _, a, true);
    }, D = (a, f, h, m) => {
      if (a == null) r(f.el = l(f.children), h, m);
      else {
        const g = f.el = a.el;
        f.children !== a.children && d(g, f.children);
      }
    }, H = (a, f, h, m) => {
      a == null ? r(f.el = c(f.children || ""), h, m) : f.el = a.el;
    }, J = (a, f, h, m) => {
      [a.el, a.anchor] = O(a.children, f, h, m, a.el, a.anchor);
    }, q = ({ el: a, anchor: f }, h, m) => {
      let g;
      for (; a && a !== f; ) g = C(a), r(a, h, m), a = g;
      r(f, h, m);
    }, T = ({ el: a, anchor: f }) => {
      let h;
      for (; a && a !== f; ) h = C(a), s(a), a = h;
      s(f);
    }, I = (a, f, h, m, g, _, w, x, v) => {
      f.type === "svg" ? w = "svg" : f.type === "math" && (w = "mathml"), a == null ? X(f, h, m, g, _, w, x, v) : Ne(a, f, g, _, w, x, v);
    }, X = (a, f, h, m, g, _, w, x) => {
      let v, b;
      const { props: M, shapeFlag: S, transition: P, dirs: A } = a;
      if (v = a.el = o(a.type, _, M && M.is, M), S & 8 ? u(v, a.children) : S & 16 && ue(a.children, v, null, m, g, Rn(a, _), w, x), A && Je(a, null, m, "created"), se(v, a, a.scopeId, w, m), M) {
        for (const G in M) G !== "value" && !St(G) && i(v, G, null, M[G], _, m);
        "value" in M && i(v, "value", null, M.value, _), (b = M.onVnodeBeforeMount) && Ce(b, m, a);
      }
      A && Je(a, null, m, "beforeMount");
      const z = Uo(g, P);
      z && P.beforeEnter(v), r(v, f, h), ((b = M && M.onVnodeMounted) || z || A) && he(() => {
        b && Ce(b, m, a), z && P.enter(v), A && Je(a, null, m, "mounted");
      }, g);
    }, se = (a, f, h, m, g) => {
      if (h && E(a, h), m) for (let _ = 0; _ < m.length; _++) E(a, m[_]);
      if (g) {
        let _ = g.subTree;
        if (f === _ || Xs(_.type) && (_.ssContent === f || _.ssFallback === f)) {
          const w = g.vnode;
          se(a, w, w.scopeId, w.slotScopeIds, g.parent);
        }
      }
    }, ue = (a, f, h, m, g, _, w, x, v = 0) => {
      for (let b = v; b < a.length; b++) {
        const M = a[b] = x ? $e(a[b]) : Pe(a[b]);
        y(null, M, f, h, m, g, _, w, x);
      }
    }, Ne = (a, f, h, m, g, _, w) => {
      const x = f.el = a.el;
      let { patchFlag: v, dynamicChildren: b, dirs: M } = f;
      v |= a.patchFlag & 16;
      const S = a.props || W, P = f.props || W;
      let A;
      if (h && Xe(h, false), (A = P.onVnodeBeforeUpdate) && Ce(A, h, f, a), M && Je(f, a, h, "beforeUpdate"), h && Xe(h, true), (S.innerHTML && P.innerHTML == null || S.textContent && P.textContent == null) && u(x, ""), b ? me(a.dynamicChildren, b, x, h, m, Rn(f, g), _) : w || $(a, f, x, null, h, m, Rn(f, g), _, false), v > 0) {
        if (v & 16) Ae(x, S, P, h, g);
        else if (v & 2 && S.class !== P.class && i(x, "class", null, P.class, g), v & 4 && i(x, "style", S.style, P.style, g), v & 8) {
          const z = f.dynamicProps;
          for (let G = 0; G < z.length; G++) {
            const j = z[G], ae = S[j], ce = P[j];
            (ce !== ae || j === "value") && i(x, j, ae, ce, g, h);
          }
        }
        v & 1 && a.children !== f.children && u(x, f.children);
      } else !w && b == null && Ae(x, S, P, h, g);
      ((A = P.onVnodeUpdated) || M) && he(() => {
        A && Ce(A, h, f, a), M && Je(f, a, h, "updated");
      }, m);
    }, me = (a, f, h, m, g, _, w) => {
      for (let x = 0; x < f.length; x++) {
        const v = a[x], b = f[x], M = v.el && (v.type === Ee || !vt(v, b) || v.shapeFlag & 198) ? p(v.el) : h;
        y(v, b, M, null, m, g, _, w, true);
      }
    }, Ae = (a, f, h, m, g) => {
      if (f !== h) {
        if (f !== W) for (const _ in f) !St(_) && !(_ in h) && i(a, _, f[_], null, g, m);
        for (const _ in h) {
          if (St(_)) continue;
          const w = h[_], x = f[_];
          w !== x && _ !== "value" && i(a, _, x, w, g, m);
        }
        "value" in h && i(a, "value", f.value, h.value, g);
      }
    }, He = (a, f, h, m, g, _, w, x, v) => {
      const b = f.el = a ? a.el : l(""), M = f.anchor = a ? a.anchor : l("");
      let { patchFlag: S, dynamicChildren: P, slotScopeIds: A } = f;
      A && (x = x ? x.concat(A) : A), a == null ? (r(b, h, m), r(M, h, m), ue(f.children || [], h, M, g, _, w, x, v)) : S > 0 && S & 64 && P && a.dynamicChildren ? (me(a.dynamicChildren, P, h, g, _, w, x), (f.key != null || g && f === g.subTree) && Ks(a, f, true)) : $(a, f, h, M, g, _, w, x, v);
    }, ve = (a, f, h, m, g, _, w, x, v) => {
      f.slotScopeIds = x, a == null ? f.shapeFlag & 512 ? g.ctx.activate(f, h, m, w, v) : qe(f, h, m, g, _, w, v) : rt(a, f, v);
    }, qe = (a, f, h, m, g, _, w) => {
      const x = a.component = tl(a, m, g);
      if (Fs(a) && (x.ctx.renderer = _t), rl(x, false, w), x.asyncDep) {
        if (g && g.registerDep(x, Z, w), !a.el) {
          const v = x.subTree = Ue(ht);
          H(null, v, f, h), a.placeholder = v.el;
        }
      } else Z(x, a, f, h, g, _, w);
    }, rt = (a, f, h) => {
      const m = f.component = a.component;
      if (Go(a, f, h)) if (m.asyncDep && !m.asyncResolved) {
        Y(m, f, h);
        return;
      } else m.next = f, m.update();
      else f.el = a.el, m.vnode = f;
    }, Z = (a, f, h, m, g, _, w) => {
      const x = () => {
        if (a.isMounted) {
          let { next: S, bu: P, u: A, parent: z, vnode: G } = a;
          {
            const we = qs(a);
            if (we) {
              S && (S.el = G.el, Y(a, S, w)), we.asyncDep.then(() => {
                a.isUnmounted || x();
              });
              return;
            }
          }
          let j = S, ae;
          Xe(a, false), S ? (S.el = G.el, Y(a, S, w)) : S = G, P && Jt(P), (ae = S.props && S.props.onVnodeBeforeUpdate) && Ce(ae, z, S, G), Xe(a, true);
          const ce = Ir(a), xe = a.subTree;
          a.subTree = ce, y(xe, ce, p(xe.el), jt(xe), a, g, _), S.el = ce.el, j === null && Ko(a, ce.el), A && he(A, g), (ae = S.props && S.props.onVnodeUpdated) && he(() => Ce(ae, z, S, G), g);
        } else {
          let S;
          const { el: P, props: A } = f, { bm: z, m: G, parent: j, root: ae, type: ce } = a, xe = Mt(f);
          Xe(a, false), z && Jt(z), !xe && (S = A && A.onVnodeBeforeMount) && Ce(S, j, f), Xe(a, true);
          {
            ae.ce && ae.ce._def.shadowRoot !== false && ae.ce._injectChildStyle(ce);
            const we = a.subTree = Ir(a);
            y(null, we, h, m, a, g, _), f.el = we.el;
          }
          if (G && he(G, g), !xe && (S = A && A.onVnodeMounted)) {
            const we = f;
            he(() => Ce(S, j, we), g);
          }
          (f.shapeFlag & 256 || j && Mt(j.vnode) && j.vnode.shapeFlag & 256) && a.a && he(a.a, g), a.isMounted = true, f = h = m = null;
        }
      };
      a.scope.on();
      const v = a.effect = new fs(x);
      a.scope.off();
      const b = a.update = v.run.bind(v), M = a.job = v.runIfDirty.bind(v);
      M.i = a, M.id = a.uid, v.scheduler = () => ar(M), Xe(a, true), b();
    }, Y = (a, f, h) => {
      f.component = a;
      const m = a.vnode.props;
      a.vnode = f, a.next = null, Oo(a, f.props, m, h), Fo(a, f.children, h), Le(), Tr(a), ze();
    }, $ = (a, f, h, m, g, _, w, x, v = false) => {
      const b = a && a.children, M = a ? a.shapeFlag : 0, S = f.children, { patchFlag: P, shapeFlag: A } = f;
      if (P > 0) {
        if (P & 128) {
          Ht(b, S, h, m, g, _, w, x, v);
          return;
        } else if (P & 256) {
          Ye(b, S, h, m, g, _, w, x, v);
          return;
        }
      }
      A & 8 ? (M & 16 && gt(b, g, _), S !== b && u(h, S)) : M & 16 ? A & 16 ? Ht(b, S, h, m, g, _, w, x, v) : gt(b, g, _, true) : (M & 8 && u(h, ""), A & 16 && ue(S, h, m, g, _, w, x, v));
    }, Ye = (a, f, h, m, g, _, w, x, v) => {
      a = a || lt, f = f || lt;
      const b = a.length, M = f.length, S = Math.min(b, M);
      let P;
      for (P = 0; P < S; P++) {
        const A = f[P] = v ? $e(f[P]) : Pe(f[P]);
        y(a[P], A, h, null, g, _, w, x, v);
      }
      b > M ? gt(a, g, _, true, false, S) : ue(f, h, m, g, _, w, x, v, S);
    }, Ht = (a, f, h, m, g, _, w, x, v) => {
      let b = 0;
      const M = f.length;
      let S = a.length - 1, P = M - 1;
      for (; b <= S && b <= P; ) {
        const A = a[b], z = f[b] = v ? $e(f[b]) : Pe(f[b]);
        if (vt(A, z)) y(A, z, h, null, g, _, w, x, v);
        else break;
        b++;
      }
      for (; b <= S && b <= P; ) {
        const A = a[S], z = f[P] = v ? $e(f[P]) : Pe(f[P]);
        if (vt(A, z)) y(A, z, h, null, g, _, w, x, v);
        else break;
        S--, P--;
      }
      if (b > S) {
        if (b <= P) {
          const A = P + 1, z = A < M ? f[A].el : m;
          for (; b <= P; ) y(null, f[b] = v ? $e(f[b]) : Pe(f[b]), h, z, g, _, w, x, v), b++;
        }
      } else if (b > P) for (; b <= S; ) ye(a[b], g, _, true), b++;
      else {
        const A = b, z = b, G = /* @__PURE__ */ new Map();
        for (b = z; b <= P; b++) {
          const de = f[b] = v ? $e(f[b]) : Pe(f[b]);
          de.key != null && G.set(de.key, b);
        }
        let j, ae = 0;
        const ce = P - z + 1;
        let xe = false, we = 0;
        const mt = new Array(ce);
        for (b = 0; b < ce; b++) mt[b] = 0;
        for (b = A; b <= S; b++) {
          const de = a[b];
          if (ae >= ce) {
            ye(de, g, _, true);
            continue;
          }
          let Se;
          if (de.key != null) Se = G.get(de.key);
          else for (j = z; j <= P; j++) if (mt[j - z] === 0 && vt(de, f[j])) {
            Se = j;
            break;
          }
          Se === void 0 ? ye(de, g, _, true) : (mt[Se - z] = b + 1, Se >= we ? we = Se : xe = true, y(de, f[Se], h, null, g, _, w, x, v), ae++);
        }
        const br = xe ? Lo(mt) : lt;
        for (j = br.length - 1, b = ce - 1; b >= 0; b--) {
          const de = z + b, Se = f[de], vr = f[de + 1], yr = de + 1 < M ? vr.el || vr.placeholder : m;
          mt[b] === 0 ? y(null, Se, h, yr, g, _, w, x, v) : xe && (j < 0 || b !== br[j] ? ke(Se, h, yr, 2) : j--);
        }
      }
    }, ke = (a, f, h, m, g = null) => {
      const { el: _, type: w, transition: x, children: v, shapeFlag: b } = a;
      if (b & 6) {
        ke(a.component.subTree, f, h, m);
        return;
      }
      if (b & 128) {
        a.suspense.move(f, h, m);
        return;
      }
      if (b & 64) {
        w.move(a, f, h, _t);
        return;
      }
      if (w === Ee) {
        r(_, f, h);
        for (let S = 0; S < v.length; S++) ke(v[S], f, h, m);
        r(a.anchor, f, h);
        return;
      }
      if (w === In) {
        q(a, f, h);
        return;
      }
      if (m !== 2 && b & 1 && x) if (m === 0) x.beforeEnter(_), r(_, f, h), he(() => x.enter(_), g);
      else {
        const { leave: S, delayLeave: P, afterLeave: A } = x, z = () => {
          a.ctx.isUnmounted ? s(_) : r(_, f, h);
        }, G = () => {
          S(_, () => {
            z(), A && A();
          });
        };
        P ? P(_, z, G) : G();
      }
      else r(_, f, h);
    }, ye = (a, f, h, m = false, g = false) => {
      const { type: _, props: w, ref: x, children: v, dynamicChildren: b, shapeFlag: M, patchFlag: S, dirs: P, cacheIndex: A } = a;
      if (S === -2 && (g = false), x != null && (Le(), Pt(x, null, h, a, true), ze()), A != null && (f.renderCache[A] = void 0), M & 256) {
        f.ctx.deactivate(a);
        return;
      }
      const z = M & 1 && P, G = !Mt(a);
      let j;
      if (G && (j = w && w.onVnodeBeforeUnmount) && Ce(j, f, a), M & 6) ci(a.component, h, m);
      else {
        if (M & 128) {
          a.suspense.unmount(h, m);
          return;
        }
        z && Je(a, null, f, "beforeUnmount"), M & 64 ? a.type.remove(a, f, h, _t, m) : b && !b.hasOnce && (_ !== Ee || S > 0 && S & 64) ? gt(b, f, h, false, true) : (_ === Ee && S & 384 || !g && M & 16) && gt(v, f, h), m && _r(a);
      }
      (G && (j = w && w.onVnodeUnmounted) || z) && he(() => {
        j && Ce(j, f, a), z && Je(a, null, f, "unmounted");
      }, h);
    }, _r = (a) => {
      const { type: f, el: h, anchor: m, transition: g } = a;
      if (f === Ee) {
        ai(h, m);
        return;
      }
      if (f === In) {
        T(a);
        return;
      }
      const _ = () => {
        s(h), g && !g.persisted && g.afterLeave && g.afterLeave();
      };
      if (a.shapeFlag & 1 && g && !g.persisted) {
        const { leave: w, delayLeave: x } = g, v = () => w(h, _);
        x ? x(a.el, _, v) : v();
      } else _();
    }, ai = (a, f) => {
      let h;
      for (; a !== f; ) h = C(a), s(a), a = h;
      s(f);
    }, ci = (a, f, h) => {
      const { bum: m, scope: g, job: _, subTree: w, um: x, m: v, a: b, parent: M, slots: { __: S } } = a;
      Ar(v), Ar(b), m && Jt(m), M && R(S) && S.forEach((P) => {
        M.renderCache[P] = void 0;
      }), g.stop(), _ && (_.flags |= 8, ye(w, a, f, h)), x && he(x, f), he(() => {
        a.isUnmounted = true;
      }, f), f && f.pendingBranch && !f.isUnmounted && a.asyncDep && !a.asyncResolved && a.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
    }, gt = (a, f, h, m = false, g = false, _ = 0) => {
      for (let w = _; w < a.length; w++) ye(a[w], f, h, m, g);
    }, jt = (a) => {
      if (a.shapeFlag & 6) return jt(a.component.subTree);
      if (a.shapeFlag & 128) return a.suspense.next();
      const f = C(a.anchor || a.el), h = f && f[ro];
      return h ? C(h) : f;
    };
    let Sn = false;
    const mr = (a, f, h) => {
      a == null ? f._vnode && ye(f._vnode, null, null, true) : y(f._vnode || null, a, f, null, null, null, h), f._vnode = a, Sn || (Sn = true, Tr(), Os(), Sn = false);
    }, _t = {
      p: y,
      um: ye,
      m: ke,
      r: _r,
      mt: qe,
      mc: ue,
      pc: $,
      pbc: me,
      n: jt,
      o: e
    };
    return {
      render: mr,
      hydrate: void 0,
      createApp: Eo(mr)
    };
  }
  function Rn({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function Xe({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function Uo(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function Ks(e, t, n = false) {
    const r = e.children, s = t.children;
    if (R(r) && R(s)) for (let i = 0; i < r.length; i++) {
      const o = r[i];
      let l = s[i];
      l.shapeFlag & 1 && !l.dynamicChildren && ((l.patchFlag <= 0 || l.patchFlag === 32) && (l = s[i] = $e(s[i]), l.el = o.el), !n && l.patchFlag !== -2 && Ks(o, l)), l.type === xn && (l.el = o.el), l.type === ht && !l.el && (l.el = o.el);
    }
  }
  function Lo(e) {
    const t = e.slice(), n = [
      0
    ];
    let r, s, i, o, l;
    const c = e.length;
    for (r = 0; r < c; r++) {
      const d = e[r];
      if (d !== 0) {
        if (s = n[n.length - 1], e[s] < d) {
          t[r] = s, n.push(r);
          continue;
        }
        for (i = 0, o = n.length - 1; i < o; ) l = i + o >> 1, e[n[l]] < d ? i = l + 1 : o = l;
        d < e[n[i]] && (i > 0 && (t[r] = n[i - 1]), n[i] = r);
      }
    }
    for (i = n.length, o = n[i - 1]; i-- > 0; ) n[i] = o, o = t[o];
    return n;
  }
  function qs(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : qs(t);
  }
  function Ar(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  const zo = Symbol.for("v-scx"), Bo = () => Xt(zo);
  function An(e, t, n) {
    return Ys(e, t, n);
  }
  function Ys(e, t, n = W) {
    const { immediate: r, deep: s, flush: i, once: o } = n, l = re({}, n), c = t && r || !t && i !== "post";
    let d;
    if (Lt) {
      if (i === "sync") {
        const E = Bo();
        d = E.__watcherHandles || (E.__watcherHandles = []);
      } else if (!c) {
        const E = () => {
        };
        return E.stop = Me, E.resume = Me, E.pause = Me, E;
      }
    }
    const u = le;
    l.call = (E, O, y) => Re(E, u, O, y);
    let p = false;
    i === "post" ? l.scheduler = (E) => {
      he(E, u && u.suspense);
    } : i !== "sync" && (p = true, l.scheduler = (E, O) => {
      O ? E() : ar(E);
    }), l.augmentJob = (E) => {
      t && (E.flags |= 4), p && (E.flags |= 2, u && (E.id = u.uid, E.i = u));
    };
    const C = Qi(e, t, l);
    return Lt && (d ? d.push(C) : c && C()), C;
  }
  function No(e, t, n) {
    const r = this.proxy, s = Q(e) ? e.includes(".") ? ks(r, e) : () => r[e] : e.bind(r, r);
    let i;
    F(t) ? i = t : (i = t.handler, n = t);
    const o = Nt(this), l = Ys(s, i.bind(r), n);
    return o(), l;
  }
  function ks(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let s = 0; s < n.length && r; s++) r = r[n[s]];
      return r;
    };
  }
  const Ho = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Ge(t)}Modifiers`] || e[`${nt(t)}Modifiers`];
  function jo(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || W;
    let s = n;
    const i = t.startsWith("update:"), o = i && Ho(r, t.slice(7));
    o && (o.trim && (s = n.map((u) => Q(u) ? u.trim() : u)), o.number && (s = n.map(tn)));
    let l, c = r[l = Cn(t)] || r[l = Cn(Ge(t))];
    !c && i && (c = r[l = Cn(nt(t))]), c && Re(c, e, 6, s);
    const d = r[l + "Once"];
    if (d) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[l]) return;
      e.emitted[l] = true, Re(d, e, 6, s);
    }
  }
  function Js(e, t, n = false) {
    const r = t.emitsCache, s = r.get(e);
    if (s !== void 0) return s;
    const i = e.emits;
    let o = {}, l = false;
    if (!F(e)) {
      const c = (d) => {
        const u = Js(d, t, true);
        u && (l = true, re(o, u));
      };
      !n && t.mixins.length && t.mixins.forEach(c), e.extends && c(e.extends), e.mixins && e.mixins.forEach(c);
    }
    return !i && !l ? (k(e) && r.set(e, null), null) : (R(i) ? i.forEach((c) => o[c] = null) : re(o, i), k(e) && r.set(e, o), o);
  }
  function yn(e, t) {
    return !e || !un(t) ? false : (t = t.slice(2).replace(/Once$/, ""), N(e, t[0].toLowerCase() + t.slice(1)) || N(e, nt(t)) || N(e, t));
  }
  function Ir(e) {
    const { type: t, vnode: n, proxy: r, withProxy: s, propsOptions: [i], slots: o, attrs: l, emit: c, render: d, renderCache: u, props: p, data: C, setupState: E, ctx: O, inheritAttrs: y } = e, D = on(e);
    let H, J;
    try {
      if (n.shapeFlag & 4) {
        const T = s || r, I = T;
        H = Pe(d.call(I, T, u, p, E, C, O)), J = l;
      } else {
        const T = t;
        H = Pe(T.length > 1 ? T(p, {
          attrs: l,
          slots: o,
          emit: c
        }) : T(p, null)), J = t.props ? l : $o(l);
      }
    } catch (T) {
      Rt.length = 0, mn(T, e, 1), H = Ue(ht);
    }
    let q = H;
    if (J && y !== false) {
      const T = Object.keys(J), { shapeFlag: I } = q;
      T.length && I & 7 && (i && T.some(kn) && (J = Wo(J, i)), q = pt(q, J, false, true));
    }
    return n.dirs && (q = pt(q, null, false, true), q.dirs = q.dirs ? q.dirs.concat(n.dirs) : n.dirs), n.transition && cr(q, n.transition), H = q, on(D), H;
  }
  const $o = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || un(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Wo = (e, t) => {
    const n = {};
    for (const r in e) (!kn(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function Go(e, t, n) {
    const { props: r, children: s, component: i } = e, { props: o, children: l, patchFlag: c } = t, d = i.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && c >= 0) {
      if (c & 1024) return true;
      if (c & 16) return r ? Fr(r, o, d) : !!o;
      if (c & 8) {
        const u = t.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          const C = u[p];
          if (o[C] !== r[C] && !yn(d, C)) return true;
        }
      }
    } else return (s || l) && (!l || !l.$stable) ? true : r === o ? false : r ? o ? Fr(r, o, d) : true : !!o;
    return false;
  }
  function Fr(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let s = 0; s < r.length; s++) {
      const i = r[s];
      if (t[i] !== e[i] && !yn(n, i)) return true;
    }
    return false;
  }
  function Ko({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Xs = (e) => e.__isSuspense;
  function qo(e, t) {
    t && t.pendingBranch ? R(e) ? t.effects.push(...e) : t.effects.push(e) : to(e);
  }
  const Ee = Symbol.for("v-fgt"), xn = Symbol.for("v-txt"), ht = Symbol.for("v-cmt"), In = Symbol.for("v-stc"), Rt = [];
  let pe = null;
  function At(e = false) {
    Rt.push(pe = e ? null : []);
  }
  function Yo() {
    Rt.pop(), pe = Rt[Rt.length - 1] || null;
  }
  let Ut = 1;
  function Vr(e, t = false) {
    Ut += e, e < 0 && pe && t && (pe.hasOnce = true);
  }
  function ko(e) {
    return e.dynamicChildren = Ut > 0 ? pe || lt : null, Yo(), Ut > 0 && pe && pe.push(e), e;
  }
  function It(e, t, n, r, s, i) {
    return ko(V(e, t, n, r, s, i, true));
  }
  function Qs(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function vt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const Zs = ({ key: e }) => e ?? null, Qt = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? Q(e) || ne(e) || F(e) ? {
    i: ge,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function V(e, t = null, n = null, r = 0, s = null, i = e === Ee ? 0 : 1, o = false, l = false) {
    const c = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && Zs(t),
      ref: t && Qt(t),
      scopeId: As,
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
      ctx: ge
    };
    return l ? (pr(c, n), i & 128 && e.normalize(c)) : n && (c.shapeFlag |= Q(n) ? 8 : 16), Ut > 0 && !o && pe && (c.patchFlag > 0 || i & 6) && c.patchFlag !== 32 && pe.push(c), c;
  }
  const Ue = Jo;
  function Jo(e, t = null, n = null, r = 0, s = null, i = false) {
    if ((!e || e === mo) && (e = ht), Qs(e)) {
      const l = pt(e, t, true);
      return n && pr(l, n), Ut > 0 && !i && pe && (l.shapeFlag & 6 ? pe[pe.indexOf(e)] = l : pe.push(l)), l.patchFlag = -2, l;
    }
    if (ll(e) && (e = e.__vccOpts), t) {
      t = Xo(t);
      let { class: l, style: c } = t;
      l && !Q(l) && (t.class = Zn(l)), k(c) && (lr(c) && !R(c) && (c = re({}, c)), t.style = Qn(c));
    }
    const o = Q(e) ? 1 : Xs(e) ? 128 : so(e) ? 64 : k(e) ? 4 : F(e) ? 2 : 0;
    return V(e, t, n, r, s, o, i, true);
  }
  function Xo(e) {
    return e ? lr(e) || Ns(e) ? re({}, e) : e : null;
  }
  function pt(e, t, n = false, r = false) {
    const { props: s, ref: i, patchFlag: o, children: l, transition: c } = e, d = t ? Qo(s || {}, t) : s, u = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: d,
      key: d && Zs(d),
      ref: t && t.ref ? n && i ? R(i) ? i.concat(Qt(t)) : [
        i,
        Qt(t)
      ] : Qt(t) : i,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: l,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== Ee ? o === -1 ? 16 : o | 16 : o,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: c,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && pt(e.ssContent),
      ssFallback: e.ssFallback && pt(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return c && r && cr(u, c.clone(u)), u;
  }
  function wt(e = " ", t = 0) {
    return Ue(xn, null, e, t);
  }
  function Pe(e) {
    return e == null || typeof e == "boolean" ? Ue(ht) : R(e) ? Ue(Ee, null, e.slice()) : Qs(e) ? $e(e) : Ue(xn, null, String(e));
  }
  function $e(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : pt(e);
  }
  function pr(e, t) {
    let n = 0;
    const { shapeFlag: r } = e;
    if (t == null) t = null;
    else if (R(t)) n = 16;
    else if (typeof t == "object") if (r & 65) {
      const s = t.default;
      s && (s._c && (s._d = false), pr(e, s()), s._c && (s._d = true));
      return;
    } else {
      n = 32;
      const s = t._;
      !s && !Ns(t) ? t._ctx = ge : s === 3 && ge && (ge.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else F(t) ? (t = {
      default: t,
      _ctx: ge
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      wt(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function Qo(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const s in r) if (s === "class") t.class !== r.class && (t.class = Zn([
        t.class,
        r.class
      ]));
      else if (s === "style") t.style = Qn([
        t.style,
        r.style
      ]);
      else if (un(s)) {
        const i = t[s], o = r[s];
        o && i !== o && !(R(i) && i.includes(o)) && (t[s] = i ? [].concat(i, o) : o);
      } else s !== "" && (t[s] = r[s]);
    }
    return t;
  }
  function Ce(e, t, n, r = null) {
    Re(e, t, 7, [
      n,
      r
    ]);
  }
  const Zo = Ls();
  let el = 0;
  function tl(e, t, n) {
    const r = e.type, s = (t ? t.appContext : e.appContext) || Zo, i = {
      uid: el++,
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
      scope: new Si(true),
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
      propsOptions: js(r, s),
      emitsOptions: Js(r, s),
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
    }, i.root = t ? t.root : i, i.emit = jo.bind(null, i), e.ce && e.ce(i), i;
  }
  let le = null;
  const nl = () => le || ge;
  let an, Kn;
  {
    const e = pn(), t = (n, r) => {
      let s;
      return (s = e[n]) || (s = e[n] = []), s.push(r), (i) => {
        s.length > 1 ? s.forEach((o) => o(i)) : s[0](i);
      };
    };
    an = t("__VUE_INSTANCE_SETTERS__", (n) => le = n), Kn = t("__VUE_SSR_SETTERS__", (n) => Lt = n);
  }
  const Nt = (e) => {
    const t = le;
    return an(e), e.scope.on(), () => {
      e.scope.off(), an(t);
    };
  }, Dr = () => {
    le && le.scope.off(), an(null);
  };
  function ei(e) {
    return e.vnode.shapeFlag & 4;
  }
  let Lt = false;
  function rl(e, t = false, n = false) {
    t && Kn(t);
    const { props: r, children: s } = e.vnode, i = ei(e);
    Mo(e, r, i, t), Io(e, s, n || t);
    const o = i ? sl(e, t) : void 0;
    return t && Kn(false), o;
  }
  function sl(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, vo);
    const { setup: r } = n;
    if (r) {
      Le();
      const s = e.setupContext = r.length > 1 ? ol(e) : null, i = Nt(e), o = Bt(r, e, 0, [
        e.props,
        s
      ]), l = rs(o);
      if (ze(), i(), (l || e.sp) && !Mt(e) && Is(e), l) {
        if (o.then(Dr, Dr), t) return o.then((c) => {
          Ur(e, c);
        }).catch((c) => {
          mn(c, e, 0);
        });
        e.asyncDep = o;
      } else Ur(e, o);
    } else ti(e);
  }
  function Ur(e, t, n) {
    F(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : k(t) && (e.setupState = Ts(t)), ti(e);
  }
  function ti(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || Me);
    {
      const s = Nt(e);
      Le();
      try {
        yo(e);
      } finally {
        ze(), s();
      }
    }
  }
  const il = {
    get(e, t) {
      return te(e, "get", ""), e[t];
    }
  };
  function ol(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, il),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function wn(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Ts(Wi(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in Ot) return Ot[n](e);
      },
      has(t, n) {
        return n in t || n in Ot;
      }
    })) : e.proxy;
  }
  function ll(e) {
    return F(e) && "__vccOpts" in e;
  }
  const Ze = (e, t) => Ji(e, t, Lt), al = "3.5.18";
  let qn;
  const Lr = typeof window < "u" && window.trustedTypes;
  if (Lr) try {
    qn = Lr.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const ni = qn ? (e) => qn.createHTML(e) : (e) => e, cl = "http://www.w3.org/2000/svg", fl = "http://www.w3.org/1998/Math/MathML", Fe = typeof document < "u" ? document : null, zr = Fe && Fe.createElement("template"), ul = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const s = t === "svg" ? Fe.createElementNS(cl, e) : t === "mathml" ? Fe.createElementNS(fl, e) : n ? Fe.createElement(e, {
        is: n
      }) : Fe.createElement(e);
      return e === "select" && r && r.multiple != null && s.setAttribute("multiple", r.multiple), s;
    },
    createText: (e) => Fe.createTextNode(e),
    createComment: (e) => Fe.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => Fe.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, r, s, i) {
      const o = n ? n.previousSibling : t.lastChild;
      if (s && (s === i || s.nextSibling)) for (; t.insertBefore(s.cloneNode(true), n), !(s === i || !(s = s.nextSibling)); ) ;
      else {
        zr.innerHTML = ni(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const l = zr.content;
        if (r === "svg" || r === "mathml") {
          const c = l.firstChild;
          for (; c.firstChild; ) l.appendChild(c.firstChild);
          l.removeChild(c);
        }
        t.insertBefore(l, n);
      }
      return [
        o ? o.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild
      ];
    }
  }, dl = Symbol("_vtc");
  function hl(e, t, n) {
    const r = e[dl];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const Br = Symbol("_vod"), pl = Symbol("_vsh"), gl = Symbol(""), _l = /(^|;)\s*display\s*:/;
  function ml(e, t, n) {
    const r = e.style, s = Q(n);
    let i = false;
    if (n && !s) {
      if (t) if (Q(t)) for (const o of t.split(";")) {
        const l = o.slice(0, o.indexOf(":")).trim();
        n[l] == null && Zt(r, l, "");
      }
      else for (const o in t) n[o] == null && Zt(r, o, "");
      for (const o in n) o === "display" && (i = true), Zt(r, o, n[o]);
    } else if (s) {
      if (t !== n) {
        const o = r[gl];
        o && (n += ";" + o), r.cssText = n, i = _l.test(n);
      }
    } else t && e.removeAttribute("style");
    Br in e && (e[Br] = i ? r.display : "", e[pl] && (r.display = "none"));
  }
  const Nr = /\s*!important$/;
  function Zt(e, t, n) {
    if (R(n)) n.forEach((r) => Zt(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = bl(e, t);
      Nr.test(n) ? e.setProperty(nt(r), n.replace(Nr, ""), "important") : e[r] = n;
    }
  }
  const Hr = [
    "Webkit",
    "Moz",
    "ms"
  ], Fn = {};
  function bl(e, t) {
    const n = Fn[t];
    if (n) return n;
    let r = Ge(t);
    if (r !== "filter" && r in e) return Fn[t] = r;
    r = os(r);
    for (let s = 0; s < Hr.length; s++) {
      const i = Hr[s] + r;
      if (i in e) return Fn[t] = i;
    }
    return t;
  }
  const jr = "http://www.w3.org/1999/xlink";
  function $r(e, t, n, r, s, i = yi(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(jr, t.slice(6, t.length)) : e.setAttributeNS(jr, t, n) : n == null || i && !ls(n) ? e.removeAttribute(t) : e.setAttribute(t, i ? "" : Oe(n) ? String(n) : n);
  }
  function Wr(e, t, n, r, s) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? ni(n) : n);
      return;
    }
    const i = e.tagName;
    if (t === "value" && i !== "PROGRESS" && !i.includes("-")) {
      const l = i === "OPTION" ? e.getAttribute("value") || "" : e.value, c = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
      (l !== c || !("_value" in e)) && (e.value = c), n == null && e.removeAttribute(t), e._value = n;
      return;
    }
    let o = false;
    if (n === "" || n == null) {
      const l = typeof e[t];
      l === "boolean" ? n = ls(n) : n == null && l === "string" ? (n = "", o = true) : l === "number" && (n = 0, o = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    o && e.removeAttribute(s || t);
  }
  function et(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function vl(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const Gr = Symbol("_vei");
  function yl(e, t, n, r, s = null) {
    const i = e[Gr] || (e[Gr] = {}), o = i[t];
    if (r && o) o.value = r;
    else {
      const [l, c] = xl(t);
      if (r) {
        const d = i[t] = Cl(r, s);
        et(e, l, d, c);
      } else o && (vl(e, l, o, c), i[t] = void 0);
    }
  }
  const Kr = /(?:Once|Passive|Capture)$/;
  function xl(e) {
    let t;
    if (Kr.test(e)) {
      t = {};
      let r;
      for (; r = e.match(Kr); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : nt(e.slice(2)),
      t
    ];
  }
  let Vn = 0;
  const wl = Promise.resolve(), Sl = () => Vn || (wl.then(() => Vn = 0), Vn = Date.now());
  function Cl(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Re(Tl(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = Sl(), n;
  }
  function Tl(e, t) {
    if (R(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (s) => !s._stopped && r && r(s));
    } else return t;
  }
  const qr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, El = (e, t, n, r, s, i) => {
    const o = s === "svg";
    t === "class" ? hl(e, r, o) : t === "style" ? ml(e, n, r) : un(t) ? kn(t) || yl(e, t, n, r, i) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Pl(e, t, r, o)) ? (Wr(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && $r(e, t, r, o, i, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !Q(r)) ? Wr(e, Ge(t), r, i, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), $r(e, t, r, o));
  };
  function Pl(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && qr(t) && F(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const s = e.tagName;
      if (s === "IMG" || s === "VIDEO" || s === "CANVAS" || s === "SOURCE") return false;
    }
    return qr(t) && Q(n) ? false : t in e;
  }
  const cn = (e) => {
    const t = e.props["onUpdate:modelValue"] || false;
    return R(t) ? (n) => Jt(t, n) : t;
  };
  function Ml(e) {
    e.target.composing = true;
  }
  function Yr(e) {
    const t = e.target;
    t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
  }
  const dt = Symbol("_assign"), Dn = {
    created(e, { modifiers: { lazy: t, trim: n, number: r } }, s) {
      e[dt] = cn(s);
      const i = r || s.props && s.props.type === "number";
      et(e, t ? "change" : "input", (o) => {
        if (o.target.composing) return;
        let l = e.value;
        n && (l = l.trim()), i && (l = tn(l)), e[dt](l);
      }), n && et(e, "change", () => {
        e.value = e.value.trim();
      }), t || (et(e, "compositionstart", Ml), et(e, "compositionend", Yr), et(e, "change", Yr));
    },
    mounted(e, { value: t }) {
      e.value = t ?? "";
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: s, number: i } }, o) {
      if (e[dt] = cn(o), e.composing) return;
      const l = (i || e.type === "number") && !/^0\d/.test(e.value) ? tn(e.value) : e.value, c = t ?? "";
      l !== c && (document.activeElement === e && e.type !== "range" && (r && t === n || s && e.value.trim() === c) || (e.value = c));
    }
  }, Ol = {
    deep: true,
    created(e, { value: t, modifiers: { number: n } }, r) {
      const s = dn(t);
      et(e, "change", () => {
        const i = Array.prototype.filter.call(e.options, (o) => o.selected).map((o) => n ? tn(fn(o)) : fn(o));
        e[dt](e.multiple ? s ? new Set(i) : i : i[0]), e._assigning = true, Ps(() => {
          e._assigning = false;
        });
      }), e[dt] = cn(r);
    },
    mounted(e, { value: t }) {
      kr(e, t);
    },
    beforeUpdate(e, t, n) {
      e[dt] = cn(n);
    },
    updated(e, { value: t }) {
      e._assigning || kr(e, t);
    }
  };
  function kr(e, t) {
    const n = e.multiple, r = R(t);
    if (!(n && !r && !dn(t))) {
      for (let s = 0, i = e.options.length; s < i; s++) {
        const o = e.options[s], l = fn(o);
        if (n) if (r) {
          const c = typeof l;
          c === "string" || c === "number" ? o.selected = t.some((d) => String(d) === String(l)) : o.selected = wi(t, l) > -1;
        } else o.selected = t.has(l);
        else if (gn(fn(o), t)) {
          e.selectedIndex !== s && (e.selectedIndex = s);
          return;
        }
      }
      !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
    }
  }
  function fn(e) {
    return "_value" in e ? e._value : e.value;
  }
  const Rl = re({
    patchProp: El
  }, ul);
  let Jr;
  function Al() {
    return Jr || (Jr = Vo(Rl));
  }
  const Il = (...e) => {
    const t = Al().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const s = Vl(r);
      if (!s) return;
      const i = t._component;
      !F(i) && !i.render && !i.template && (i.template = s.innerHTML), s.nodeType === 1 && (s.textContent = "");
      const o = n(s, false, Fl(s));
      return s instanceof Element && (s.removeAttribute("v-cloak"), s.setAttribute("data-v-app", "")), o;
    }, t;
  };
  function Fl(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function Vl(e) {
    return Q(e) ? document.querySelector(e) : e;
  }
  const Dl = `
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











`, Ul = `struct Uniforms {
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
  let blurSamples = 8; // Nombre d'\xE9chantillons pour le blur
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
}`, Ll = "" + new URL("mandelbrot_bg-De-y3kp8.wasm", import.meta.url).href, zl = async (e = {}, t) => {
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
  let L;
  function Bl(e) {
    L = e;
  }
  let qt = null;
  function Nl() {
    return (qt === null || qt.byteLength === 0) && (qt = new Uint8Array(L.memory.buffer)), qt;
  }
  const ri = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
  let en = new ri("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  en.decode();
  const Hl = 2146435072;
  let Un = 0;
  function jl(e, t) {
    return Un += t, Un >= Hl && (en = new ri("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), en.decode(), Un = t), en.decode(Nl().subarray(e, e + t));
  }
  function si(e, t) {
    return e = e >>> 0, jl(e, t);
  }
  let Yt = null;
  function $l() {
    return (Yt === null || Yt.byteLength === 0) && (Yt = new Float64Array(L.memory.buffer)), Yt;
  }
  function Wl(e, t) {
    return e = e >>> 0, $l().subarray(e / 8, e / 8 + t);
  }
  let it = null;
  function Gl() {
    return (it === null || it.buffer.detached === true || it.buffer.detached === void 0 && it.buffer !== L.memory.buffer) && (it = new DataView(L.memory.buffer)), it;
  }
  function Kl(e, t) {
    e = e >>> 0;
    const n = Gl(), r = [];
    for (let s = e; s < e + 4 * t; s += 4) r.push(L.__wbindgen_export_0.get(n.getUint32(s, true)));
    return L.__externref_drop_slice(e, t), r;
  }
  const Xr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => L.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  let ql = class {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Xr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      L.__wbg_mandelbrotnavigator_free(t, 0);
    }
    constructor(t, n, r, s, i) {
      const o = L.mandelbrotnavigator_new(t, n, r, s, i);
      return this.__wbg_ptr = o >>> 0, Xr.register(this, this.__wbg_ptr, this), this;
    }
    translate(t, n) {
      L.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
    rotate(t) {
      L.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      L.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    rotate_direct(t) {
      L.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    zoom(t) {
      L.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    step() {
      const t = L.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = Wl(t[0], t[1]).slice();
      return L.__wbindgen_free(t[0], t[1] * 8, 8), n;
    }
    get_params() {
      const t = L.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = Kl(t[0], t[1]).slice();
      return L.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    compute_reference_orbit_ptr(t) {
      const n = L.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return gr.__wrap(n);
    }
    get_reference_orbit_len() {
      return L.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    get_reference_orbit_capacity() {
      return L.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    scale(t) {
      L.mandelbrotnavigator_scale(this.__wbg_ptr, t);
    }
    angle(t) {
      L.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    origin(t, n) {
      L.mandelbrotnavigator_origin(this.__wbg_ptr, t, n);
    }
  };
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => L.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const Qr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => L.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class gr {
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(gr.prototype);
      return n.__wbg_ptr = t, Qr.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Qr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      L.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      return L.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      L.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      return L.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      L.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      return L.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      L.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  function Yl(e) {
    console.debug(e);
  }
  function kl(e) {
    console.error(e);
  }
  function Jl(e) {
    console.info(e);
  }
  function Xl(e) {
    console.log(e);
  }
  function Ql(e) {
    console.warn(e);
  }
  function Zl() {
    const e = L.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  function ea(e, t) {
    return si(e, t);
  }
  function ta(e, t) {
    throw new Error(si(e, t));
  }
  URL = globalThis.URL;
  const U = await zl({
    "./mandelbrot_bg.js": {
      __wbindgen_string_new: ea,
      __wbg_debug_58d16ea352cfbca1: Yl,
      __wbg_error_51ecdd39ec054205: kl,
      __wbg_info_e56933705c348038: Jl,
      __wbg_log_ea240990d83e374e: Xl,
      __wbg_warn_d89f6637da554c8d: Ql,
      __wbindgen_throw: ta,
      __wbindgen_init_externref_table: Zl
    }
  }, Ll), ii = U.memory, na = U.__wbg_mandelbrotstep_free, ra = U.__wbg_get_mandelbrotstep_zx, sa = U.__wbg_set_mandelbrotstep_zx, ia = U.__wbg_get_mandelbrotstep_zy, oa = U.__wbg_set_mandelbrotstep_zy, la = U.__wbg_get_mandelbrotstep_dx, aa = U.__wbg_set_mandelbrotstep_dx, ca = U.__wbg_get_mandelbrotstep_dy, fa = U.__wbg_set_mandelbrotstep_dy, ua = U.__wbg_mandelbrotnavigator_free, da = U.mandelbrotnavigator_new, ha = U.mandelbrotnavigator_translate, pa = U.mandelbrotnavigator_rotate, ga = U.mandelbrotnavigator_translate_direct, _a = U.mandelbrotnavigator_rotate_direct, ma = U.mandelbrotnavigator_zoom, ba = U.mandelbrotnavigator_step, va = U.mandelbrotnavigator_get_params, ya = U.mandelbrotnavigator_compute_reference_orbit_ptr, xa = U.mandelbrotnavigator_get_reference_orbit_len, wa = U.mandelbrotnavigator_get_reference_orbit_capacity, Sa = U.mandelbrotnavigator_scale, Ca = U.mandelbrotnavigator_angle, Ta = U.mandelbrotnavigator_origin, Ea = U.__wbg_orbitbufferinfo_free, Pa = U.__wbg_get_orbitbufferinfo_ptr, Ma = U.__wbg_set_orbitbufferinfo_ptr, Oa = U.__wbg_get_orbitbufferinfo_offset, Ra = U.__wbg_set_orbitbufferinfo_offset, Aa = U.__wbg_get_orbitbufferinfo_count, Ia = U.__wbg_set_orbitbufferinfo_count, Fa = U.__wbindgen_export_0, Va = U.__wbindgen_free, Da = U.__externref_drop_slice, oi = U.__wbindgen_start, Ua = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: Da,
    __wbg_get_mandelbrotstep_dx: la,
    __wbg_get_mandelbrotstep_dy: ca,
    __wbg_get_mandelbrotstep_zx: ra,
    __wbg_get_mandelbrotstep_zy: ia,
    __wbg_get_orbitbufferinfo_count: Aa,
    __wbg_get_orbitbufferinfo_offset: Oa,
    __wbg_get_orbitbufferinfo_ptr: Pa,
    __wbg_mandelbrotnavigator_free: ua,
    __wbg_mandelbrotstep_free: na,
    __wbg_orbitbufferinfo_free: Ea,
    __wbg_set_mandelbrotstep_dx: aa,
    __wbg_set_mandelbrotstep_dy: fa,
    __wbg_set_mandelbrotstep_zx: sa,
    __wbg_set_mandelbrotstep_zy: oa,
    __wbg_set_orbitbufferinfo_count: Ia,
    __wbg_set_orbitbufferinfo_offset: Ra,
    __wbg_set_orbitbufferinfo_ptr: Ma,
    __wbindgen_export_0: Fa,
    __wbindgen_free: Va,
    __wbindgen_start: oi,
    mandelbrotnavigator_angle: Ca,
    mandelbrotnavigator_compute_reference_orbit_ptr: ya,
    mandelbrotnavigator_get_params: va,
    mandelbrotnavigator_get_reference_orbit_capacity: wa,
    mandelbrotnavigator_get_reference_orbit_len: xa,
    mandelbrotnavigator_new: da,
    mandelbrotnavigator_origin: Ta,
    mandelbrotnavigator_rotate: pa,
    mandelbrotnavigator_rotate_direct: _a,
    mandelbrotnavigator_scale: Sa,
    mandelbrotnavigator_step: ba,
    mandelbrotnavigator_translate: ha,
    mandelbrotnavigator_translate_direct: ga,
    mandelbrotnavigator_zoom: ma,
    memory: ii
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  Bl(Ua);
  oi();
  class La {
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
      this.canvas = t, this.shaderPass1 = Dl, this.shaderPass2 = Ul, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
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
      i < 1 && (i = 1 / i), i -= 1;
      const o = new Float32Array([
        n.palettePeriod,
        i * 2,
        0,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferColor, 0, o.buffer);
      const l = Math.ceil(t.maxIterations);
      let c = this.mandelbrotNavigator.compute_reference_orbit_ptr(l);
      const d = new Float32Array(ii.buffer, c.ptr, c.count * 4);
      c.offset < l && (console.log("Calcul de l'orbite de r\xE9f\xE9rence, nombre de points :", c.count, " maxIterations =", l, "offset =", c.offset, "length =", d.length / 4), this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, d, 0)), this.previousMandelbrot = t;
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
  const za = {
    class: "panel compact-panel"
  }, Ba = {
    class: "panel-block compact-block"
  }, Na = {
    class: "math-display"
  }, Ha = [
    "innerHTML"
  ], ja = {
    class: "panel-block compact-block"
  }, $a = {
    class: "math-display"
  }, Wa = [
    "innerHTML"
  ], Ga = {
    class: "math-display"
  }, Ka = [
    "innerHTML"
  ], qa = {
    class: "panel-block compact-block"
  }, Ya = {
    class: "math-display"
  }, ka = {
    class: "panel-block compact-block"
  }, Ja = {
    class: "math-display"
  }, Xa = {
    class: "panel-block compact-block"
  }, Qa = {
    class: "math-display"
  }, Za = {
    class: "panel-block compact-block"
  }, ec = {
    style: {
      display: "flex",
      "flex-direction": "column",
      gap: "0.3em"
    }
  }, tc = [
    "value"
  ], nc = {
    class: "panel-block compact-block"
  }, rc = {
    style: {
      display: "flex",
      gap: "0.5em",
      "align-items": "center"
    }
  }, Zr = "mandelbrot_presets", sc = fr({
    __name: "Settings",
    props: {
      modelValue: {}
    },
    setup(e) {
      const t = e, n = Ze(() => (Number.parseFloat(t.modelValue.angle) * 180 / Math.PI).toFixed(2)), r = Ze(() => t.modelValue.scale), s = Ze(() => t.modelValue.cx), i = Ze(() => t.modelValue.cy), o = Et(""), l = Et([]), c = Et("");
      function d() {
        if (!o.value.trim()) return;
        const O = {
          name: o.value.trim(),
          cx: t.modelValue.cx,
          cy: t.modelValue.cy,
          scale: t.modelValue.scale,
          angle: t.modelValue.angle
        }, y = l.value.findIndex((D) => D.name === O.name);
        y >= 0 ? l.value[y] = O : l.value.push(O), localStorage.setItem(Zr, JSON.stringify(l.value)), o.value = "";
      }
      function u() {
        const O = localStorage.getItem(Zr);
        if (O) try {
          l.value = JSON.parse(O);
        } catch {
        }
      }
      function p(O) {
        const y = l.value.find((D) => D.name === O);
        y && (t.modelValue.cx = y.cx, t.modelValue.cy = y.cy, t.modelValue.scale = y.scale, t.modelValue.angle = y.angle, c.value = O);
      }
      const C = Ze({
        get: () => Math.log10(t.modelValue.mu ?? 1),
        set: (O) => {
          t.modelValue.mu = Math.pow(10, O);
        }
      }), E = Ze({
        get: () => Math.log10(t.modelValue.epsilon ?? 1e-8),
        set: (O) => {
          t.modelValue.epsilon = Math.pow(10, O);
        }
      });
      return vn(() => {
        u();
      }), (O, y) => (At(), It("nav", za, [
        y[16] || (y[16] = V("p", {
          class: "panel-heading compact-heading"
        }, "Param\xE8tres", -1)),
        V("div", Ba, [
          V("span", Na, [
            y[6] || (y[6] = wt(" \xC9chelle\xA0: ", -1)),
            V("span", {
              innerHTML: r.value
            }, null, 8, Ha),
            V("button", {
              class: "button is-small",
              style: {
                "margin-left": "0.7em"
              },
              onClick: y[0] || (y[0] = (D) => t.modelValue.scale = "2.5")
            }, "R\xE9initialiser")
          ])
        ]),
        V("div", ja, [
          V("p", null, [
            V("span", $a, [
              y[7] || (y[7] = wt("Cx\xA0:", -1)),
              V("span", {
                innerHTML: s.value
              }, null, 8, Wa)
            ])
          ]),
          V("p", null, [
            V("span", Ga, [
              y[8] || (y[8] = wt("Cy\xA0:", -1)),
              y[9] || (y[9] = V("span", {
                class: "math-i"
              }, "i", -1)),
              V("span", {
                innerHTML: i.value
              }, null, 8, Ka)
            ])
          ])
        ]),
        V("div", qa, [
          V("span", Ya, [
            y[10] || (y[10] = wt(" Angle\xA0: ", -1)),
            V("span", null, yt(n.value) + "\xB0", 1)
          ])
        ]),
        V("div", ka, [
          y[11] || (y[11] = V("label", {
            class: "compact-label"
          }, "Mu (log)", -1)),
          Kt(V("input", {
            type: "range",
            min: "0",
            max: "5",
            step: "0.01",
            "onUpdate:modelValue": y[1] || (y[1] = (D) => C.value = D),
            style: {
              width: "100%"
            }
          }, null, 512), [
            [
              Dn,
              C.value
            ]
          ]),
          V("span", Ja, yt((t.modelValue.mu ?? 1).toFixed(1)), 1)
        ]),
        V("div", Xa, [
          y[12] || (y[12] = V("label", {
            class: "compact-label"
          }, "Epsilon (log)", -1)),
          Kt(V("input", {
            type: "range",
            min: "-12",
            max: "0",
            step: "0.01",
            "onUpdate:modelValue": y[2] || (y[2] = (D) => E.value = D),
            style: {
              width: "100%"
            }
          }, null, 512), [
            [
              Dn,
              E.value
            ]
          ]),
          V("span", Qa, yt((t.modelValue.epsilon ?? 1e-8).toExponential(2)), 1)
        ]),
        V("div", Za, [
          y[14] || (y[14] = V("label", {
            class: "compact-label"
          }, "Presets enregistr\xE9s", -1)),
          V("div", ec, [
            Kt(V("select", {
              class: "select compact-select",
              "onUpdate:modelValue": y[3] || (y[3] = (D) => c.value = D),
              onChange: y[4] || (y[4] = (D) => p(c.value)),
              style: {
                width: "100%"
              }
            }, [
              y[13] || (y[13] = V("option", {
                value: "",
                disabled: ""
              }, "Choisir un preset...", -1)),
              (At(true), It(Ee, null, bo(l.value, (D) => (At(), It("option", {
                key: D.name,
                value: D.name
              }, yt(D.name), 9, tc))), 128))
            ], 544), [
              [
                Ol,
                c.value
              ]
            ])
          ])
        ]),
        V("div", nc, [
          y[15] || (y[15] = V("label", {
            class: "compact-label"
          }, "Nom du preset", -1)),
          V("div", rc, [
            Kt(V("input", {
              class: "input compact-input",
              "onUpdate:modelValue": y[5] || (y[5] = (D) => o.value = D),
              type: "text",
              placeholder: "Nom...",
              style: {
                width: "8em"
              }
            }, null, 512), [
              [
                Dn,
                o.value
              ]
            ]),
            V("button", {
              class: "button is-link is-small",
              onClick: d
            }, "Enregistrer")
          ])
        ])
      ]));
    }
  }), li = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [r, s] of t) n[r] = s;
    return n;
  }, ic = li(sc, [
    [
      "__scopeId",
      "data-v-93f36c0b"
    ]
  ]), oc = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, lc = {
    style: {
      position: "absolute",
      top: "0",
      left: "0",
      "z-index": "10",
      width: "320px",
      "pointer-events": "auto"
    }
  }, es = 1, ts = 128, kt = 0.04, ns = 0.025, ac = fr({
    __name: "MandelbrotNavigator",
    setup(e) {
      const t = Et(null);
      let n, r, s;
      const i = Et({
        cx: "-1.5",
        cy: "0.0",
        mu: 1e4,
        scale: "2.5",
        angle: "0.0",
        maxIterations: 1e3,
        antialiasLevel: es,
        palettePeriod: ts
      });
      function o(T) {
        d[T.key.toLowerCase()] = true;
      }
      function l(T) {
        d[T.key.toLowerCase()] = false;
      }
      function c(T) {
        T.preventDefault();
        const I = 0.8;
        T.deltaY < 0 ? s.zoom(I) : s.zoom(1 / I);
      }
      const d = {};
      let u = false, p = false, C = 0, E = 0;
      function O(T) {
        const I = t.value;
        if (!I) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const X = I.getBoundingClientRect();
        return {
          x: T.clientX - X.left,
          y: T.clientY - X.top,
          width: X.width,
          height: X.height
        };
      }
      function y(T) {
        if (T.button === 2) p = true;
        else {
          u = true;
          const I = O(T);
          C = I.x, E = I.y;
        }
      }
      function D(T) {
        var _a2;
        const I = O(T);
        if (p) {
          const ve = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
          if (!ve) return;
          const qe = ve.width / 2, rt = ve.height / 2, Z = I.x, Y = I.y, $ = Math.atan2(Y - rt, Z - qe);
          s.angle($);
          return;
        }
        if (!u) return;
        const X = I.width, se = I.height, ue = X / se, Ne = (I.x - C) / X * 2, me = (I.y - E) / se * 2, Ae = -Ne * ue, He = me;
        s.translate_direct(Ae, He), C = I.x, E = I.y;
      }
      function H(T) {
        T.button === 2 ? p = false : u = false;
      }
      async function J() {
        if (!t.value) return;
        n = t.value, s = new ql(-0.749208775, -0.0798967515, 1e4, 2.5, 0), r = new La(n, {
          antialiasLevel: 1,
          palettePeriod: 128
        }), await r.initialize(s), window.addEventListener("keydown", o), window.addEventListener("keyup", l), n.addEventListener("wheel", c, {
          passive: false
        }), n.addEventListener("mousedown", y), n.addEventListener("contextmenu", function(I) {
          I.preventDefault();
        }), window.addEventListener("mousemove", D), window.addEventListener("mouseup", H);
        function T() {
          d.z && s.translate(0, kt), d.s && s.translate(0, -kt), d.q && s.translate(-kt, 0), d.d && s.translate(kt, 0), d.a && s.rotate(ns), d.e && s.rotate(-ns);
          const I = i.value.epsilon, [X, se, ue, Ne] = s.step(), [me, Ae, He, ve] = s.get_params(), qe = i.value.mu;
          i.value.cx = me, i.value.cy = Ae, i.value.scale = He, i.value.angle = ve;
          const rt = Math.min(Math.max(100, 80 + 30 * Math.log2(1 / ue)), 1e6);
          r.update({
            cx: X,
            cy: se,
            mu: qe,
            scale: ue,
            angle: Ne,
            maxIterations: rt,
            epsilon: I
          }, {
            antialiasLevel: es,
            palettePeriod: ts
          }), r.render(), requestAnimationFrame(T);
        }
        T();
      }
      function q() {
        if (!t.value || !r) return;
        const T = t.value.getBoundingClientRect();
        t.value.width = T.width, t.value.height = T.height, r.resize && r.resize(), r.render();
      }
      return vn(() => {
        J(), window.addEventListener("resize", q);
      }), ur(() => {
        window.removeEventListener("resize", q);
      }), (T, I) => (At(), It("div", oc, [
        V("canvas", {
          ref_key: "canvasRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          }
        }, null, 512),
        V("div", lc, [
          Ue(ic, {
            modelValue: i.value,
            "onUpdate:modelValue": I[0] || (I[0] = (X) => i.value = X)
          }, null, 8, [
            "modelValue"
          ])
        ])
      ]));
    }
  }), cc = li(ac, [
    [
      "__scopeId",
      "data-v-63a8cf9e"
    ]
  ]), fc = {
    id: "fullscreen"
  }, uc = fr({
    __name: "App",
    setup(e) {
      return vn(() => {
      }), (t, n) => (At(), It("div", fc, [
        Ue(cc)
      ]));
    }
  });
  Il(uc).mount("#app");
})();
