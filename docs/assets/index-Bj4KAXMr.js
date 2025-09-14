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
  function qn(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const K = {}, st = [], Me = () => {
  }, fi = () => false, un = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Yn = (e) => e.startsWith("onUpdate:"), se = Object.assign, kn = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, ui = Object.prototype.hasOwnProperty, j = (e, t) => ui.call(e, t), R = Array.isArray, it = (e) => Dt(e) === "[object Map]", dn = (e) => Dt(e) === "[object Set]", yr = (e) => Dt(e) === "[object Date]", F = (e) => typeof e == "function", Q = (e) => typeof e == "string", Pe = (e) => typeof e == "symbol", J = (e) => e !== null && typeof e == "object", rs = (e) => (J(e) || F(e)) && F(e.then) && F(e.catch), ss = Object.prototype.toString, Dt = (e) => ss.call(e), di = (e) => Dt(e).slice(8, -1), is = (e) => Dt(e) === "[object Object]", Jn = (e) => Q(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, xt = qn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), pn = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  }, pi = /-(\w)/g, We = pn((e) => e.replace(pi, (t, n) => n ? n.toUpperCase() : "")), hi = /\B([A-Z])/g, et = pn((e) => e.replace(hi, "-$1").toLowerCase()), os = pn((e) => e.charAt(0).toUpperCase() + e.slice(1)), Cn = pn((e) => e ? `on${os(e)}` : ""), $e = (e, t) => !Object.is(e, t), kt = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, Dn = (e, t, n, r = false) => {
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
  let xr;
  const hn = () => xr || (xr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function Xn(e) {
    if (R(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], s = Q(r) ? bi(r) : Xn(r);
        if (s) for (const i in s) t[i] = s[i];
      }
      return t;
    } else if (Q(e) || J(e)) return e;
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
  function Qn(e) {
    let t = "";
    if (Q(e)) t = e;
    else if (R(e)) for (let n = 0; n < e.length; n++) {
      const r = Qn(e[n]);
      r && (t += r + " ");
    }
    else if (J(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const vi = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", yi = qn(vi);
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
    let n = yr(e), r = yr(t);
    if (n || r) return n && r ? e.getTime() === t.getTime() : false;
    if (n = Pe(e), r = Pe(t), n || r) return e === t;
    if (n = R(e), r = R(t), n || r) return n && r ? xi(e, t) : false;
    if (n = J(e), r = J(t), n || r) {
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
  const as = (e) => !!(e && e.__v_isRef === true), bt = (e) => Q(e) ? e : e == null ? "" : R(e) || J(e) && (e.toString === ss || !F(e.toString)) ? as(e) ? bt(e.value) : JSON.stringify(e, cs, 2) : String(e), cs = (e, t) => as(t) ? cs(e, t.value) : it(t) ? {
    [`Map(${t.size})`]: [
      ...t.entries()
    ].reduce((n, [r, s], i) => (n[Tn(r, i) + " =>"] = s, n), {})
  } : dn(t) ? {
    [`Set(${t.size})`]: [
      ...t.values()
    ].map((n) => Tn(n))
  } : Pe(t) ? Tn(t) : J(t) && !R(t) && !is(t) ? String(t) : t, Tn = (e, t = "") => {
    var n;
    return Pe(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
  let ue;
  class Si {
    constructor(t = false) {
      this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.parent = ue, !t && ue && (this.index = (ue.scopes || (ue.scopes = [])).push(this) - 1);
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
        const n = ue;
        try {
          return ue = this, t();
        } finally {
          ue = n;
        }
      }
    }
    on() {
      ++this._on === 1 && (this.prevScope = ue, ue = this);
    }
    off() {
      this._on > 0 && --this._on === 0 && (ue = this.prevScope, this.prevScope = void 0);
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
    return ue;
  }
  let Y;
  const En = /* @__PURE__ */ new WeakSet();
  class fs {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, ue && ue.active && ue.effects.push(this);
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
      this.flags |= 2, wr(this), ps(this);
      const t = Y, n = be;
      Y = this, be = true;
      try {
        return this.fn();
      } finally {
        hs(this), Y = t, be = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) tr(t);
        this.deps = this.depsTail = void 0, wr(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? En.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      Ln(this) && this.run();
    }
    get dirty() {
      return Ln(this);
    }
  }
  let us = 0, wt, St;
  function ds(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = St, St = e;
      return;
    }
    e.next = wt, wt = e;
  }
  function Zn() {
    us++;
  }
  function er() {
    if (--us > 0) return;
    if (St) {
      let t = St;
      for (St = void 0; t; ) {
        const n = t.next;
        t.next = void 0, t.flags &= -9, t = n;
      }
    }
    let e;
    for (; wt; ) {
      let t = wt;
      for (wt = void 0; t; ) {
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
  function ps(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function hs(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const s = r.prevDep;
      r.version === -1 ? (r === n && (n = s), tr(r), Ti(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = s;
    }
    e.deps = t, e.depsTail = n;
  }
  function Ln(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (gs(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function gs(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === At) || (e.globalVersion = At, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Ln(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = Y, r = be;
    Y = e, be = true;
    try {
      ps(e);
      const s = e.fn(e._value);
      (t.version === 0 || $e(s, e._value)) && (e.flags |= 128, e._value = s, t.version++);
    } catch (s) {
      throw t.version++, s;
    } finally {
      Y = n, be = r, hs(e), e.flags &= -3;
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
  function wr(e) {
    const { cleanup: t } = e;
    if (e.cleanup = void 0, t) {
      const n = Y;
      Y = void 0;
      try {
        t();
      } finally {
        Y = n;
      }
    }
  }
  let At = 0;
  class Ei {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class nr {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!Y || !be || Y === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== Y) n = this.activeLink = new Ei(Y, this), Y.deps ? (n.prevDep = Y.depsTail, Y.depsTail.nextDep = n, Y.depsTail = n) : Y.deps = Y.depsTail = n, ms(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = Y.depsTail, n.nextDep = void 0, Y.depsTail.nextDep = n, Y.depsTail = n, Y.deps === n && (Y.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, At++, this.notify(t);
    }
    notify(t) {
      Zn();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        er();
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
  const zn = /* @__PURE__ */ new WeakMap(), Ze = Symbol(""), Bn = Symbol(""), It = Symbol("");
  function ne(e, t, n) {
    if (be && Y) {
      let r = zn.get(e);
      r || zn.set(e, r = /* @__PURE__ */ new Map());
      let s = r.get(n);
      s || (r.set(n, s = new nr()), s.map = r, s.key = n), s.track();
    }
  }
  function Ve(e, t, n, r, s, i) {
    const o = zn.get(e);
    if (!o) {
      At++;
      return;
    }
    const l = (c) => {
      c && c.trigger();
    };
    if (Zn(), t === "clear") o.forEach(l);
    else {
      const c = R(e), d = c && Jn(n);
      if (c && n === "length") {
        const u = Number(r);
        o.forEach((h, T) => {
          (T === "length" || T === It || !Pe(T) && T >= u) && l(h);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && l(o.get(n)), d && l(o.get(It)), t) {
        case "add":
          c ? d && l(o.get("length")) : (l(o.get(Ze)), it(e) && l(o.get(Bn)));
          break;
        case "delete":
          c || (l(o.get(Ze)), it(e) && l(o.get(Bn)));
          break;
        case "set":
          it(e) && l(o.get(Ze));
          break;
      }
    }
    er();
  }
  function nt(e) {
    const t = H(e);
    return t === e ? t : (ne(t, "iterate", It), _e(e) ? t : t.map(ee));
  }
  function _n(e) {
    return ne(e = H(e), "iterate", It), e;
  }
  const Mi = {
    __proto__: null,
    [Symbol.iterator]() {
      return Mn(this, Symbol.iterator, ee);
    },
    concat(...e) {
      return nt(this).concat(...e.map((t) => R(t) ? nt(t) : t));
    },
    entries() {
      return Mn(this, "entries", (e) => (e[1] = ee(e[1]), e));
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
      return Pn(this, "includes", e);
    },
    indexOf(...e) {
      return Pn(this, "indexOf", e);
    },
    join(e) {
      return nt(this).join(e);
    },
    lastIndexOf(...e) {
      return Pn(this, "lastIndexOf", e);
    },
    map(e, t) {
      return Ie(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return _t(this, "pop");
    },
    push(...e) {
      return _t(this, "push", e);
    },
    reduce(e, ...t) {
      return Sr(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return Sr(this, "reduceRight", e, t);
    },
    shift() {
      return _t(this, "shift");
    },
    some(e, t) {
      return Ie(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return _t(this, "splice", e);
    },
    toReversed() {
      return nt(this).toReversed();
    },
    toSorted(e) {
      return nt(this).toSorted(e);
    },
    toSpliced(...e) {
      return nt(this).toSpliced(...e);
    },
    unshift(...e) {
      return _t(this, "unshift", e);
    },
    values() {
      return Mn(this, "values", ee);
    }
  };
  function Mn(e, t, n) {
    const r = _n(e), s = r[t]();
    return r !== e && !_e(e) && (s._next = s.next, s.next = () => {
      const i = s._next();
      return i.value && (i.value = n(i.value)), i;
    }), s;
  }
  const Pi = Array.prototype;
  function Ie(e, t, n, r, s, i) {
    const o = _n(e), l = o !== e && !_e(e), c = o[t];
    if (c !== Pi[t]) {
      const h = c.apply(e, i);
      return l ? ee(h) : h;
    }
    let d = n;
    o !== e && (l ? d = function(h, T) {
      return n.call(this, ee(h), T, e);
    } : n.length > 2 && (d = function(h, T) {
      return n.call(this, h, T, e);
    }));
    const u = c.call(o, d, r);
    return l && s ? s(u) : u;
  }
  function Sr(e, t, n, r) {
    const s = _n(e);
    let i = n;
    return s !== e && (_e(e) ? n.length > 3 && (i = function(o, l, c) {
      return n.call(this, o, l, c, e);
    }) : i = function(o, l, c) {
      return n.call(this, o, ee(l), c, e);
    }), s[t](i, ...r);
  }
  function Pn(e, t, n) {
    const r = H(e);
    ne(r, "iterate", It);
    const s = r[t](...n);
    return (s === -1 || s === false) && or(n[0]) ? (n[0] = H(n[0]), r[t](...n)) : s;
  }
  function _t(e, t, n = []) {
    Le(), Zn();
    const r = H(e)[t].apply(e, n);
    return er(), ze(), r;
  }
  const Oi = qn("__proto__,__v_isRef,__isVue"), bs = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(Pe));
  function Ri(e) {
    Pe(e) || (e = String(e));
    const t = H(this);
    return ne(t, "has", e), t.hasOwnProperty(e);
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
        if (o && (c = Mi[n])) return c;
        if (n === "hasOwnProperty") return Ri;
      }
      const l = Reflect.get(t, n, re(t) ? t : r);
      return (Pe(n) ? bs.has(n) : Oi(n)) || (s || ne(t, "get", n), i) ? l : re(l) ? o && Jn(n) ? l : l.value : J(l) ? s ? Cs(l) : sr(l) : l;
    }
  }
  class ys extends vs {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, s) {
      let i = t[n];
      if (!this._isShallow) {
        const c = Ge(i);
        if (!_e(r) && !Ge(r) && (i = H(i), r = H(r)), !R(t) && re(i) && !re(r)) return c ? false : (i.value = r, true);
      }
      const o = R(t) && Jn(n) ? Number(n) < t.length : j(t, n), l = Reflect.set(t, n, r, re(t) ? t : s);
      return t === H(s) && (o ? $e(r, i) && Ve(t, "set", n, r) : Ve(t, "add", n, r)), l;
    }
    deleteProperty(t, n) {
      const r = j(t, n);
      t[n];
      const s = Reflect.deleteProperty(t, n);
      return s && r && Ve(t, "delete", n, void 0), s;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!Pe(n) || !bs.has(n)) && ne(t, "has", n), r;
    }
    ownKeys(t) {
      return ne(t, "iterate", R(t) ? "length" : Ze), Reflect.ownKeys(t);
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
  const Nn = (e) => e, jt = (e) => Reflect.getPrototypeOf(e);
  function Ui(e, t, n) {
    return function(...r) {
      const s = this.__v_raw, i = H(s), o = it(i), l = e === "entries" || e === Symbol.iterator && o, c = e === "keys" && o, d = s[e](...r), u = n ? Nn : t ? nn : ee;
      return !t && ne(i, "iterate", c ? Bn : Ze), {
        next() {
          const { value: h, done: T } = d.next();
          return T ? {
            value: h,
            done: T
          } : {
            value: l ? [
              u(h[0]),
              u(h[1])
            ] : u(h),
            done: T
          };
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    };
  }
  function $t(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function Di(e, t) {
    const n = {
      get(s) {
        const i = this.__v_raw, o = H(i), l = H(s);
        e || ($e(s, l) && ne(o, "get", s), ne(o, "get", l));
        const { has: c } = jt(o), d = t ? Nn : e ? nn : ee;
        if (c.call(o, s)) return d(i.get(s));
        if (c.call(o, l)) return d(i.get(l));
        i !== o && i.get(s);
      },
      get size() {
        const s = this.__v_raw;
        return !e && ne(H(s), "iterate", Ze), Reflect.get(s, "size", s);
      },
      has(s) {
        const i = this.__v_raw, o = H(i), l = H(s);
        return e || ($e(s, l) && ne(o, "has", s), ne(o, "has", l)), s === l ? i.has(s) : i.has(s) || i.has(l);
      },
      forEach(s, i) {
        const o = this, l = o.__v_raw, c = H(l), d = t ? Nn : e ? nn : ee;
        return !e && ne(c, "iterate", Ze), l.forEach((u, h) => s.call(i, d(u), d(h), o));
      }
    };
    return se(n, e ? {
      add: $t("add"),
      set: $t("set"),
      delete: $t("delete"),
      clear: $t("clear")
    } : {
      add(s) {
        !t && !_e(s) && !Ge(s) && (s = H(s));
        const i = H(this);
        return jt(i).has.call(i, s) || (i.add(s), Ve(i, "add", s, s)), this;
      },
      set(s, i) {
        !t && !_e(i) && !Ge(i) && (i = H(i));
        const o = H(this), { has: l, get: c } = jt(o);
        let d = l.call(o, s);
        d || (s = H(s), d = l.call(o, s));
        const u = c.call(o, s);
        return o.set(s, i), d ? $e(i, u) && Ve(o, "set", s, i) : Ve(o, "add", s, i), this;
      },
      delete(s) {
        const i = H(this), { has: o, get: l } = jt(i);
        let c = o.call(i, s);
        c || (s = H(s), c = o.call(i, s)), l && l.call(i, s);
        const d = i.delete(s);
        return c && Ve(i, "delete", s, void 0), d;
      },
      clear() {
        const s = H(this), i = s.size !== 0, o = s.clear();
        return i && Ve(s, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((s) => {
      n[s] = Ui(s, e, t);
    }), n;
  }
  function rr(e, t) {
    const n = Di(e, t);
    return (r, s, i) => s === "__v_isReactive" ? !e : s === "__v_isReadonly" ? e : s === "__v_raw" ? r : Reflect.get(j(n, s) && s in r ? n : r, s, i);
  }
  const Li = {
    get: rr(false, false)
  }, zi = {
    get: rr(false, true)
  }, Bi = {
    get: rr(true, false)
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
  function sr(e) {
    return Ge(e) ? e : ir(e, false, Ii, Li, xs);
  }
  function $i(e) {
    return ir(e, false, Vi, zi, ws);
  }
  function Cs(e) {
    return ir(e, true, Fi, Bi, Ss);
  }
  function ir(e, t, n, r, s) {
    if (!J(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const i = ji(e);
    if (i === 0) return e;
    const o = s.get(e);
    if (o) return o;
    const l = new Proxy(e, i === 2 ? r : n);
    return s.set(e, l), l;
  }
  function ot(e) {
    return Ge(e) ? ot(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function Ge(e) {
    return !!(e && e.__v_isReadonly);
  }
  function _e(e) {
    return !!(e && e.__v_isShallow);
  }
  function or(e) {
    return e ? !!e.__v_raw : false;
  }
  function H(e) {
    const t = e && e.__v_raw;
    return t ? H(t) : e;
  }
  function Wi(e) {
    return !j(e, "__v_skip") && Object.isExtensible(e) && Dn(e, "__v_skip", true), e;
  }
  const ee = (e) => J(e) ? sr(e) : e, nn = (e) => J(e) ? Cs(e) : e;
  function re(e) {
    return e ? e.__v_isRef === true : false;
  }
  function Ct(e) {
    return Gi(e, false);
  }
  function Gi(e, t) {
    return re(e) ? e : new Ki(e, t);
  }
  class Ki {
    constructor(t, n) {
      this.dep = new nr(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : H(t), this._value = n ? t : ee(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || _e(t) || Ge(t);
      t = r ? t : H(t), $e(t, n) && (this._rawValue = t, this._value = r ? t : ee(t), this.dep.trigger());
    }
  }
  function qi(e) {
    return re(e) ? e.value : e;
  }
  const Yi = {
    get: (e, t, n) => t === "__v_raw" ? e : qi(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const s = e[t];
      return re(s) && !re(n) ? (s.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function Ts(e) {
    return ot(e) ? e : new Proxy(e, Yi);
  }
  class ki {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new nr(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = At - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && Y !== this) return ds(this, true), true;
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
  const Wt = {}, rn = /* @__PURE__ */ new WeakMap();
  let Je;
  function Xi(e, t = false, n = Je) {
    if (n) {
      let r = rn.get(n);
      r || rn.set(n, r = []), r.push(e);
    }
  }
  function Qi(e, t, n = K) {
    const { immediate: r, deep: s, once: i, scheduler: o, augmentJob: l, call: c } = n, d = (w) => s ? w : _e(w) || s === false || s === 0 ? Ue(w, 1) : Ue(w);
    let u, h, T, E, U = false, D = false;
    if (re(e) ? (h = () => e.value, U = _e(e)) : ot(e) ? (h = () => d(e), U = true) : R(e) ? (D = true, U = e.some((w) => ot(w) || _e(w)), h = () => e.map((w) => {
      if (re(w)) return w.value;
      if (ot(w)) return d(w);
      if (F(w)) return c ? c(w, 2) : w();
    })) : F(e) ? t ? h = c ? () => c(e, 2) : e : h = () => {
      if (T) {
        Le();
        try {
          T();
        } finally {
          ze();
        }
      }
      const w = Je;
      Je = u;
      try {
        return c ? c(e, 3, [
          E
        ]) : e(E);
      } finally {
        Je = w;
      }
    } : h = Me, t && s) {
      const w = h, I = s === true ? 1 / 0 : s;
      h = () => Ue(w(), I);
    }
    const V = Ci(), x = () => {
      u.stop(), V && V.active && kn(V.effects, u);
    };
    if (i && t) {
      const w = t;
      t = (...I) => {
        w(...I), x();
      };
    }
    let O = D ? new Array(e.length).fill(Wt) : Wt;
    const G = (w) => {
      if (!(!(u.flags & 1) || !u.dirty && !w)) if (t) {
        const I = u.run();
        if (s || U || (D ? I.some((X, te) => $e(X, O[te])) : $e(I, O))) {
          T && T();
          const X = Je;
          Je = u;
          try {
            const te = [
              I,
              O === Wt ? void 0 : D && O[0] === Wt ? [] : O,
              E
            ];
            O = I, c ? c(t, 3, te) : t(...te);
          } finally {
            Je = X;
          }
        }
      } else u.run();
    };
    return l && l(G), u = new fs(h), u.scheduler = o ? () => o(G, false) : G, E = (w) => Xi(w, false, u), T = u.onStop = () => {
      const w = rn.get(u);
      if (w) {
        if (c) c(w, 4);
        else for (const I of w) I();
        rn.delete(u);
      }
    }, t ? r ? G(true) : O = u.run() : o ? o(G.bind(null, true), true) : u.run(), x.pause = u.pause.bind(u), x.resume = u.resume.bind(u), x.stop = x, x;
  }
  function Ue(e, t = 1 / 0, n) {
    if (t <= 0 || !J(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
    if (n.add(e), t--, re(e)) Ue(e.value, t, n);
    else if (R(e)) for (let r = 0; r < e.length; r++) Ue(e[r], t, n);
    else if (dn(e) || it(e)) e.forEach((r) => {
      Ue(r, t, n);
    });
    else if (is(e)) {
      for (const r in e) Ue(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && Ue(e[r], t, n);
    }
    return e;
  }
  function Lt(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (s) {
      mn(s, t, n);
    }
  }
  function Oe(e, t, n, r) {
    if (F(e)) {
      const s = Lt(e, t, n, r);
      return s && rs(s) && s.catch((i) => {
        mn(i, t, n);
      }), s;
    }
    if (R(e)) {
      const s = [];
      for (let i = 0; i < e.length; i++) s.push(Oe(e[i], t, n, r));
      return s;
    }
  }
  function mn(e, t, n, r = true) {
    const s = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: o } = t && t.appContext.config || K;
    if (t) {
      let l = t.parent;
      const c = t.proxy, d = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; l; ) {
        const u = l.ec;
        if (u) {
          for (let h = 0; h < u.length; h++) if (u[h](e, c, d) === false) return;
        }
        l = l.parent;
      }
      if (i) {
        Le(), Lt(i, null, 10, [
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
  let Ce = -1;
  const lt = [];
  let He = null, rt = 0;
  const Es = Promise.resolve();
  let sn = null;
  function Ms(e) {
    const t = sn || Es;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function eo(e) {
    let t = Ce + 1, n = oe.length;
    for (; t < n; ) {
      const r = t + n >>> 1, s = oe[r], i = Ft(s);
      i < e || i === e && s.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function lr(e) {
    if (!(e.flags & 1)) {
      const t = Ft(e), n = oe[oe.length - 1];
      !n || !(e.flags & 2) && t >= Ft(n) ? oe.push(e) : oe.splice(eo(t), 0, e), e.flags |= 1, Ps();
    }
  }
  function Ps() {
    sn || (sn = Es.then(Rs));
  }
  function to(e) {
    R(e) ? lt.push(...e) : He && e.id === -1 ? He.splice(rt + 1, 0, e) : e.flags & 1 || (lt.push(e), e.flags |= 1), Ps();
  }
  function Cr(e, t, n = Ce + 1) {
    for (; n < oe.length; n++) {
      const r = oe[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        oe.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function Os(e) {
    if (lt.length) {
      const t = [
        ...new Set(lt)
      ].sort((n, r) => Ft(n) - Ft(r));
      if (lt.length = 0, He) {
        He.push(...t);
        return;
      }
      for (He = t, rt = 0; rt < He.length; rt++) {
        const n = He[rt];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      He = null, rt = 0;
    }
  }
  const Ft = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function Rs(e) {
    try {
      for (Ce = 0; Ce < oe.length; Ce++) {
        const t = oe[Ce];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Lt(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; Ce < oe.length; Ce++) {
        const t = oe[Ce];
        t && (t.flags &= -2);
      }
      Ce = -1, oe.length = 0, Os(), sn = null, (oe.length || lt.length) && Rs();
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
      r._d && Fr(-1);
      const i = on(t);
      let o;
      try {
        o = e(...s);
      } finally {
        on(i), r._d && Fr(1);
      }
      return o;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function Gt(e, t) {
    if (ge === null) return e;
    const n = wn(ge), r = e.dirs || (e.dirs = []);
    for (let s = 0; s < t.length; s++) {
      let [i, o, l, c = K] = t[s];
      i && (F(i) && (i = {
        mounted: i,
        updated: i
      }), i.deep && Ue(o), r.push({
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
  function Ye(e, t, n, r) {
    const s = e.dirs, i = t && t.dirs;
    for (let o = 0; o < s.length; o++) {
      const l = s[o];
      i && (l.oldValue = i[o].value);
      let c = l.dir[r];
      c && (Le(), Oe(c, n, 8, [
        e.el,
        l,
        e,
        t
      ]), ze());
    }
  }
  const ro = Symbol("_vte"), so = (e) => e.__isTeleport;
  function ar(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, ar(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function cr(e, t) {
    return F(e) ? se({
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
  function Tt(e, t, n, r, s = false) {
    if (R(e)) {
      e.forEach((U, D) => Tt(U, t && (R(t) ? t[D] : t), n, r, s));
      return;
    }
    if (Et(r) && !s) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Tt(e, t, n, r.component.subTree);
      return;
    }
    const i = r.shapeFlag & 4 ? wn(r.component) : r.el, o = s ? null : i, { i: l, r: c } = e, d = t && t.r, u = l.refs === K ? l.refs = {} : l.refs, h = l.setupState, T = H(h), E = h === K ? () => false : (U) => j(T, U);
    if (d != null && d !== c && (Q(d) ? (u[d] = null, E(d) && (h[d] = null)) : re(d) && (d.value = null)), F(c)) Lt(c, l, 12, [
      o,
      u
    ]);
    else {
      const U = Q(c), D = re(c);
      if (U || D) {
        const V = () => {
          if (e.f) {
            const x = U ? E(c) ? h[c] : u[c] : c.value;
            s ? R(x) && kn(x, i) : R(x) ? x.includes(i) || x.push(i) : U ? (u[c] = [
              i
            ], E(c) && (h[c] = u[c])) : (c.value = [
              i
            ], e.k && (u[e.k] = c.value));
          } else U ? (u[c] = o, E(c) && (h[c] = o)) : D && (c.value = o, e.k && (u[e.k] = o));
        };
        o ? (V.id = -1, pe(V, n)) : V();
      }
    }
  }
  hn().requestIdleCallback;
  hn().cancelIdleCallback;
  const Et = (e) => !!e.type.__asyncLoader, Fs = (e) => e.type.__isKeepAlive;
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
    fr(() => {
      kn(r[t], s);
    }, n);
  }
  function bn(e, t, n = le, r = false) {
    if (n) {
      const s = n[e] || (n[e] = []), i = t.__weh || (t.__weh = (...o) => {
        Le();
        const l = zt(n), c = Oe(t, n, e, o);
        return l(), ze(), c;
      });
      return r ? s.unshift(i) : s.push(i), i;
    }
  }
  const Be = (e) => (t, n = le) => {
    (!Ut || e === "sp") && bn(e, (...r) => t(...r), n);
  }, ao = Be("bm"), vn = Be("m"), co = Be("bu"), fo = Be("u"), uo = Be("bum"), fr = Be("um"), po = Be("sp"), ho = Be("rtg"), go = Be("rtc");
  function _o(e, t = le) {
    bn("ec", e, t);
  }
  const mo = Symbol.for("v-ndc");
  function bo(e, t, n, r) {
    let s;
    const i = n, o = R(e);
    if (o || Q(e)) {
      const l = o && ot(e);
      let c = false, d = false;
      l && (c = !_e(e), d = Ge(e), e = _n(e)), s = new Array(e.length);
      for (let u = 0, h = e.length; u < h; u++) s[u] = t(c ? d ? nn(ee(e[u])) : ee(e[u]) : e[u], u, void 0, i);
    } else if (typeof e == "number") {
      s = new Array(e);
      for (let l = 0; l < e; l++) s[l] = t(l + 1, l, void 0, i);
    } else if (J(e)) if (e[Symbol.iterator]) s = Array.from(e, (l, c) => t(l, c, void 0, i));
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
  const Hn = (e) => e ? ei(e) ? wn(e) : Hn(e.parent) : null, Mt = se(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => Hn(e.parent),
    $root: (e) => Hn(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Ds(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      lr(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Ms.bind(e.proxy)),
    $watch: (e) => No.bind(e)
  }), On = (e, t) => e !== K && !e.__isScriptSetup && j(e, t), vo = {
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
          if (s !== K && j(s, t)) return o[t] = 2, s[t];
          if ((d = e.propsOptions[0]) && j(d, t)) return o[t] = 3, i[t];
          if (n !== K && j(n, t)) return o[t] = 4, n[t];
          jn && (o[t] = 0);
        }
      }
      const u = Mt[t];
      let h, T;
      if (u) return t === "$attrs" && ne(e.attrs, "get", ""), u(e);
      if ((h = l.__cssModules) && (h = h[t])) return h;
      if (n !== K && j(n, t)) return o[t] = 4, n[t];
      if (T = c.config.globalProperties, j(T, t)) return T[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: s, ctx: i } = e;
      return On(s, t) ? (s[t] = n, true) : r !== K && j(r, t) ? (r[t] = n, true) : j(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (i[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: s, propsOptions: i } }, o) {
      let l;
      return !!n[o] || e !== K && j(e, o) || On(t, o) || (l = i[0]) && j(l, o) || j(r, o) || j(Mt, o) || j(s.config.globalProperties, o);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : j(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function Tr(e) {
    return R(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  let jn = true;
  function yo(e) {
    const t = Ds(e), n = e.proxy, r = e.ctx;
    jn = false, t.beforeCreate && Er(t.beforeCreate, e, "bc");
    const { data: s, computed: i, methods: o, watch: l, provide: c, inject: d, created: u, beforeMount: h, mounted: T, beforeUpdate: E, updated: U, activated: D, deactivated: V, beforeDestroy: x, beforeUnmount: O, destroyed: G, unmounted: w, render: I, renderTracked: X, renderTriggered: te, errorCaptured: ae, serverPrefetch: Re, expose: me, inheritAttrs: Ae, components: tt, directives: Ne, filters: dt } = t;
    if (d && xo(d, r, null), o) for (const k in o) {
      const W = o[k];
      F(W) && (r[k] = W.bind(n));
    }
    if (s) {
      const k = s.call(n, n);
      J(k) && (e.data = sr(k));
    }
    if (jn = true, i) for (const k in i) {
      const W = i[k], Ke = F(W) ? W.bind(n, n) : F(W.get) ? W.get.bind(n, n) : Me, Nt = !F(W) && F(W.set) ? W.set.bind(n) : Me, qe = Xe({
        get: Ke,
        set: Nt
      });
      Object.defineProperty(r, k, {
        enumerable: true,
        configurable: true,
        get: () => qe.value,
        set: (ve) => qe.value = ve
      });
    }
    if (l) for (const k in l) Us(l[k], r, n, k);
    if (c) {
      const k = F(c) ? c.call(n) : c;
      Reflect.ownKeys(k).forEach((W) => {
        Mo(W, k[W]);
      });
    }
    u && Er(u, e, "c");
    function Z(k, W) {
      R(W) ? W.forEach((Ke) => k(Ke.bind(n))) : W && k(W.bind(n));
    }
    if (Z(ao, h), Z(vn, T), Z(co, E), Z(fo, U), Z(io, D), Z(oo, V), Z(_o, ae), Z(go, X), Z(ho, te), Z(uo, O), Z(fr, w), Z(po, Re), R(me)) if (me.length) {
      const k = e.exposed || (e.exposed = {});
      me.forEach((W) => {
        Object.defineProperty(k, W, {
          get: () => n[W],
          set: (Ke) => n[W] = Ke,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    I && e.render === Me && (e.render = I), Ae != null && (e.inheritAttrs = Ae), tt && (e.components = tt), Ne && (e.directives = Ne), Re && Is(e);
  }
  function xo(e, t, n = Me) {
    R(e) && (e = $n(e));
    for (const r in e) {
      const s = e[r];
      let i;
      J(s) ? "default" in s ? i = Jt(s.from || r, s.default, true) : i = Jt(s.from || r) : i = Jt(s), re(i) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => i.value,
        set: (o) => i.value = o
      }) : t[r] = i;
    }
  }
  function Er(e, t, n) {
    Oe(R(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function Us(e, t, n, r) {
    let s = r.includes(".") ? ks(n, r) : () => n[r];
    if (Q(e)) {
      const i = t[e];
      F(i) && Xt(s, i);
    } else if (F(e)) Xt(s, e.bind(n));
    else if (J(e)) if (R(e)) e.forEach((i) => Us(i, t, n, r));
    else {
      const i = F(e.handler) ? e.handler.bind(n) : t[e.handler];
      F(i) && Xt(s, i, e);
    }
  }
  function Ds(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: s, optionsCache: i, config: { optionMergeStrategies: o } } = e.appContext, l = i.get(t);
    let c;
    return l ? c = l : !s.length && !n && !r ? c = t : (c = {}, s.length && s.forEach((d) => ln(c, d, o, true)), ln(c, t, o)), J(t) && i.set(t, c), c;
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
    props: Pr,
    emits: Pr,
    methods: vt,
    computed: vt,
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
    components: vt,
    directives: vt,
    watch: Co,
    provide: Mr,
    inject: So
  };
  function Mr(e, t) {
    return t ? e ? function() {
      return se(F(e) ? e.call(this, this) : e, F(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function So(e, t) {
    return vt($n(e), $n(t));
  }
  function $n(e) {
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
  function vt(e, t) {
    return e ? se(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function Pr(e, t) {
    return e ? R(e) && R(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : se(/* @__PURE__ */ Object.create(null), Tr(e), Tr(t ?? {})) : t;
  }
  function Co(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = se(/* @__PURE__ */ Object.create(null), e);
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
      F(r) || (r = se({}, r)), s != null && !J(s) && (s = null);
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
        use(u, ...h) {
          return o.has(u) || (u && F(u.install) ? (o.add(u), u.install(d, ...h)) : F(u) && (o.add(u), u(d, ...h))), d;
        },
        mixin(u) {
          return i.mixins.includes(u) || i.mixins.push(u), d;
        },
        component(u, h) {
          return h ? (i.components[u] = h, d) : i.components[u];
        },
        directive(u, h) {
          return h ? (i.directives[u] = h, d) : i.directives[u];
        },
        mount(u, h, T) {
          if (!c) {
            const E = d._ceVNode || De(r, s);
            return E.appContext = i, T === true ? T = "svg" : T === false && (T = void 0), e(E, u, T), c = true, d._container = u, u.__vue_app__ = d, wn(E.component);
          }
        },
        onUnmount(u) {
          l.push(u);
        },
        unmount() {
          c && (Oe(l, d._instance, 16), e(null, d._container), delete d._container.__vue_app__);
        },
        provide(u, h) {
          return i.provides[u] = h, d;
        },
        runWithContext(u) {
          const h = at;
          at = d;
          try {
            return u();
          } finally {
            at = h;
          }
        }
      };
      return d;
    };
  }
  let at = null;
  function Mo(e, t) {
    if (le) {
      let n = le.provides;
      const r = le.parent && le.parent.provides;
      r === n && (n = le.provides = Object.create(r)), n[e] = t;
    }
  }
  function Jt(e, t, n = false) {
    const r = nl();
    if (r || at) {
      let s = at ? at._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (s && e in s) return s[e];
      if (arguments.length > 1) return n && F(t) ? t.call(r && r.proxy) : t;
    }
  }
  const zs = {}, Bs = () => Object.create(zs), Ns = (e) => Object.getPrototypeOf(e) === zs;
  function Po(e, t, n, r = false) {
    const s = {}, i = Bs();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Hs(e, t, s, i);
    for (const o in e.propsOptions[0]) o in s || (s[o] = void 0);
    n ? e.props = r ? s : $i(s) : e.type.props ? e.props = s : e.props = i, e.attrs = i;
  }
  function Oo(e, t, n, r) {
    const { props: s, attrs: i, vnode: { patchFlag: o } } = e, l = H(s), [c] = e.propsOptions;
    let d = false;
    if ((r || o > 0) && !(o & 16)) {
      if (o & 8) {
        const u = e.vnode.dynamicProps;
        for (let h = 0; h < u.length; h++) {
          let T = u[h];
          if (yn(e.emitsOptions, T)) continue;
          const E = t[T];
          if (c) if (j(i, T)) E !== i[T] && (i[T] = E, d = true);
          else {
            const U = We(T);
            s[U] = Wn(c, l, U, E, e, false);
          }
          else E !== i[T] && (i[T] = E, d = true);
        }
      }
    } else {
      Hs(e, t, s, i) && (d = true);
      let u;
      for (const h in l) (!t || !j(t, h) && ((u = et(h)) === h || !j(t, u))) && (c ? n && (n[h] !== void 0 || n[u] !== void 0) && (s[h] = Wn(c, l, h, void 0, e, true)) : delete s[h]);
      if (i !== l) for (const h in i) (!t || !j(t, h)) && (delete i[h], d = true);
    }
    d && Ve(e.attrs, "set", "");
  }
  function Hs(e, t, n, r) {
    const [s, i] = e.propsOptions;
    let o = false, l;
    if (t) for (let c in t) {
      if (xt(c)) continue;
      const d = t[c];
      let u;
      s && j(s, u = We(c)) ? !i || !i.includes(u) ? n[u] = d : (l || (l = {}))[u] = d : yn(e.emitsOptions, c) || (!(c in r) || d !== r[c]) && (r[c] = d, o = true);
    }
    if (i) {
      const c = H(n), d = l || K;
      for (let u = 0; u < i.length; u++) {
        const h = i[u];
        n[h] = Wn(s, c, h, d[h], e, !j(d, h));
      }
    }
    return o;
  }
  function Wn(e, t, n, r, s, i) {
    const o = e[n];
    if (o != null) {
      const l = j(o, "default");
      if (l && r === void 0) {
        const c = o.default;
        if (o.type !== Function && !o.skipFactory && F(c)) {
          const { propsDefaults: d } = s;
          if (n in d) r = d[n];
          else {
            const u = zt(s);
            r = d[n] = c.call(null, t), u();
          }
        } else r = c;
        s.ce && s.ce._setProp(n, r);
      }
      o[0] && (i && !l ? r = false : o[1] && (r === "" || r === et(n)) && (r = true));
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
      const u = (h) => {
        c = true;
        const [T, E] = js(h, t, true);
        se(o, T), E && l.push(...E);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!i && !c) return J(e) && r.set(e, st), st;
    if (R(i)) for (let u = 0; u < i.length; u++) {
      const h = We(i[u]);
      Or(h) && (o[h] = K);
    }
    else if (i) for (const u in i) {
      const h = We(u);
      if (Or(h)) {
        const T = i[u], E = o[h] = R(T) || F(T) ? {
          type: T
        } : se({}, T), U = E.type;
        let D = false, V = true;
        if (R(U)) for (let x = 0; x < U.length; ++x) {
          const O = U[x], G = F(O) && O.name;
          if (G === "Boolean") {
            D = true;
            break;
          } else G === "String" && (V = false);
        }
        else D = F(U) && U.name === "Boolean";
        E[0] = D, E[1] = V, (D || j(E, "default")) && l.push(h);
      }
    }
    const d = [
      o,
      l
    ];
    return J(e) && r.set(e, d), d;
  }
  function Or(e) {
    return e[0] !== "$" && !xt(e);
  }
  const ur = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", dr = (e) => R(e) ? e.map(Ee) : [
    Ee(e)
  ], Ao = (e, t, n) => {
    if (t._n) return t;
    const r = no((...s) => dr(t(...s)), n);
    return r._c = false, r;
  }, $s = (e, t, n) => {
    const r = e._ctx;
    for (const s in e) {
      if (ur(s)) continue;
      const i = e[s];
      if (F(i)) t[s] = Ao(s, i, r);
      else if (i != null) {
        const o = dr(i);
        t[s] = () => o;
      }
    }
  }, Ws = (e, t) => {
    const n = dr(t);
    e.slots.default = () => n;
  }, Gs = (e, t, n) => {
    for (const r in t) (n || !ur(r)) && (e[r] = t[r]);
  }, Io = (e, t, n) => {
    const r = e.slots = Bs();
    if (e.vnode.shapeFlag & 32) {
      const s = t.__;
      s && Dn(r, "__", s, true);
      const i = t._;
      i ? (Gs(r, t, n), n && Dn(r, "_", i, true)) : $s(t, r);
    } else t && Ws(e, t);
  }, Fo = (e, t, n) => {
    const { vnode: r, slots: s } = e;
    let i = true, o = K;
    if (r.shapeFlag & 32) {
      const l = t._;
      l ? n && l === 1 ? i = false : Gs(s, t, n) : (i = !t.$stable, $s(t, s)), o = t;
    } else t && (Ws(e, t), o = {
      default: 1
    });
    if (i) for (const l in s) !ur(l) && o[l] == null && delete s[l];
  }, pe = qo;
  function Vo(e) {
    return Uo(e);
  }
  function Uo(e, t) {
    const n = hn();
    n.__VUE__ = true;
    const { insert: r, remove: s, patchProp: i, createElement: o, createText: l, createComment: c, setText: d, setElementText: u, parentNode: h, nextSibling: T, setScopeId: E = Me, insertStaticContent: U } = e, D = (a, f, p, m = null, g = null, _ = null, S = void 0, y = null, v = !!f.dynamicChildren) => {
      if (a === f) return;
      a && !mt(a, f) && (m = Ht(a), ve(a, g, _, true), a = null), f.patchFlag === -2 && (v = false, f.dynamicChildren = null);
      const { type: b, ref: P, shapeFlag: C } = f;
      switch (b) {
        case xn:
          V(a, f, p, m);
          break;
        case ft:
          x(a, f, p, m);
          break;
        case An:
          a == null && O(f, p, m, S);
          break;
        case Te:
          tt(a, f, p, m, g, _, S, y, v);
          break;
        default:
          C & 1 ? I(a, f, p, m, g, _, S, y, v) : C & 6 ? Ne(a, f, p, m, g, _, S, y, v) : (C & 64 || C & 128) && b.process(a, f, p, m, g, _, S, y, v, ht);
      }
      P != null && g ? Tt(P, a && a.ref, _, f || a, !f) : P == null && a && a.ref != null && Tt(a.ref, null, _, a, true);
    }, V = (a, f, p, m) => {
      if (a == null) r(f.el = l(f.children), p, m);
      else {
        const g = f.el = a.el;
        f.children !== a.children && d(g, f.children);
      }
    }, x = (a, f, p, m) => {
      a == null ? r(f.el = c(f.children || ""), p, m) : f.el = a.el;
    }, O = (a, f, p, m) => {
      [a.el, a.anchor] = U(a.children, f, p, m, a.el, a.anchor);
    }, G = ({ el: a, anchor: f }, p, m) => {
      let g;
      for (; a && a !== f; ) g = T(a), r(a, p, m), a = g;
      r(f, p, m);
    }, w = ({ el: a, anchor: f }) => {
      let p;
      for (; a && a !== f; ) p = T(a), s(a), a = p;
      s(f);
    }, I = (a, f, p, m, g, _, S, y, v) => {
      f.type === "svg" ? S = "svg" : f.type === "math" && (S = "mathml"), a == null ? X(f, p, m, g, _, S, y, v) : Re(a, f, g, _, S, y, v);
    }, X = (a, f, p, m, g, _, S, y) => {
      let v, b;
      const { props: P, shapeFlag: C, transition: M, dirs: A } = a;
      if (v = a.el = o(a.type, _, P && P.is, P), C & 8 ? u(v, a.children) : C & 16 && ae(a.children, v, null, m, g, Rn(a, _), S, y), A && Ye(a, null, m, "created"), te(v, a, a.scopeId, S, m), P) {
        for (const q in P) q !== "value" && !xt(q) && i(v, q, null, P[q], _, m);
        "value" in P && i(v, "value", null, P.value, _), (b = P.onVnodeBeforeMount) && Se(b, m, a);
      }
      A && Ye(a, null, m, "beforeMount");
      const B = Do(g, M);
      B && M.beforeEnter(v), r(v, f, p), ((b = P && P.onVnodeMounted) || B || A) && pe(() => {
        b && Se(b, m, a), B && M.enter(v), A && Ye(a, null, m, "mounted");
      }, g);
    }, te = (a, f, p, m, g) => {
      if (p && E(a, p), m) for (let _ = 0; _ < m.length; _++) E(a, m[_]);
      if (g) {
        let _ = g.subTree;
        if (f === _ || Xs(_.type) && (_.ssContent === f || _.ssFallback === f)) {
          const S = g.vnode;
          te(a, S, S.scopeId, S.slotScopeIds, g.parent);
        }
      }
    }, ae = (a, f, p, m, g, _, S, y, v = 0) => {
      for (let b = v; b < a.length; b++) {
        const P = a[b] = y ? je(a[b]) : Ee(a[b]);
        D(null, P, f, p, m, g, _, S, y);
      }
    }, Re = (a, f, p, m, g, _, S) => {
      const y = f.el = a.el;
      let { patchFlag: v, dynamicChildren: b, dirs: P } = f;
      v |= a.patchFlag & 16;
      const C = a.props || K, M = f.props || K;
      let A;
      if (p && ke(p, false), (A = M.onVnodeBeforeUpdate) && Se(A, p, f, a), P && Ye(f, a, p, "beforeUpdate"), p && ke(p, true), (C.innerHTML && M.innerHTML == null || C.textContent && M.textContent == null) && u(y, ""), b ? me(a.dynamicChildren, b, y, p, m, Rn(f, g), _) : S || W(a, f, y, null, p, m, Rn(f, g), _, false), v > 0) {
        if (v & 16) Ae(y, C, M, p, g);
        else if (v & 2 && C.class !== M.class && i(y, "class", null, M.class, g), v & 4 && i(y, "style", C.style, M.style, g), v & 8) {
          const B = f.dynamicProps;
          for (let q = 0; q < B.length; q++) {
            const $ = B[q], ce = C[$], fe = M[$];
            (fe !== ce || $ === "value") && i(y, $, ce, fe, g, p);
          }
        }
        v & 1 && a.children !== f.children && u(y, f.children);
      } else !S && b == null && Ae(y, C, M, p, g);
      ((A = M.onVnodeUpdated) || P) && pe(() => {
        A && Se(A, p, f, a), P && Ye(f, a, p, "updated");
      }, m);
    }, me = (a, f, p, m, g, _, S) => {
      for (let y = 0; y < f.length; y++) {
        const v = a[y], b = f[y], P = v.el && (v.type === Te || !mt(v, b) || v.shapeFlag & 198) ? h(v.el) : p;
        D(v, b, P, null, m, g, _, S, true);
      }
    }, Ae = (a, f, p, m, g) => {
      if (f !== p) {
        if (f !== K) for (const _ in f) !xt(_) && !(_ in p) && i(a, _, f[_], null, g, m);
        for (const _ in p) {
          if (xt(_)) continue;
          const S = p[_], y = f[_];
          S !== y && _ !== "value" && i(a, _, y, S, g, m);
        }
        "value" in p && i(a, "value", f.value, p.value, g);
      }
    }, tt = (a, f, p, m, g, _, S, y, v) => {
      const b = f.el = a ? a.el : l(""), P = f.anchor = a ? a.anchor : l("");
      let { patchFlag: C, dynamicChildren: M, slotScopeIds: A } = f;
      A && (y = y ? y.concat(A) : A), a == null ? (r(b, p, m), r(P, p, m), ae(f.children || [], p, P, g, _, S, y, v)) : C > 0 && C & 64 && M && a.dynamicChildren ? (me(a.dynamicChildren, M, p, g, _, S, y), (f.key != null || g && f === g.subTree) && Ks(a, f, true)) : W(a, f, p, P, g, _, S, y, v);
    }, Ne = (a, f, p, m, g, _, S, y, v) => {
      f.slotScopeIds = y, a == null ? f.shapeFlag & 512 ? g.ctx.activate(f, p, m, S, v) : dt(f, p, m, g, _, S, v) : Bt(a, f, v);
    }, dt = (a, f, p, m, g, _, S) => {
      const y = a.component = tl(a, m, g);
      if (Fs(a) && (y.ctx.renderer = ht), rl(y, false, S), y.asyncDep) {
        if (g && g.registerDep(y, Z, S), !a.el) {
          const v = y.subTree = De(ft);
          x(null, v, f, p), a.placeholder = v.el;
        }
      } else Z(y, a, f, p, g, _, S);
    }, Bt = (a, f, p) => {
      const m = f.component = a.component;
      if (Go(a, f, p)) if (m.asyncDep && !m.asyncResolved) {
        k(m, f, p);
        return;
      } else m.next = f, m.update();
      else f.el = a.el, m.vnode = f;
    }, Z = (a, f, p, m, g, _, S) => {
      const y = () => {
        if (a.isMounted) {
          let { next: C, bu: M, u: A, parent: B, vnode: q } = a;
          {
            const xe = qs(a);
            if (xe) {
              C && (C.el = q.el, k(a, C, S)), xe.asyncDep.then(() => {
                a.isUnmounted || y();
              });
              return;
            }
          }
          let $ = C, ce;
          ke(a, false), C ? (C.el = q.el, k(a, C, S)) : C = q, M && kt(M), (ce = C.props && C.props.onVnodeBeforeUpdate) && Se(ce, B, C, q), ke(a, true);
          const fe = Ar(a), ye = a.subTree;
          a.subTree = fe, D(ye, fe, h(ye.el), Ht(ye), a, g, _), C.el = fe.el, $ === null && Ko(a, fe.el), A && pe(A, g), (ce = C.props && C.props.onVnodeUpdated) && pe(() => Se(ce, B, C, q), g);
        } else {
          let C;
          const { el: M, props: A } = f, { bm: B, m: q, parent: $, root: ce, type: fe } = a, ye = Et(f);
          ke(a, false), B && kt(B), !ye && (C = A && A.onVnodeBeforeMount) && Se(C, $, f), ke(a, true);
          {
            ce.ce && ce.ce._def.shadowRoot !== false && ce.ce._injectChildStyle(fe);
            const xe = a.subTree = Ar(a);
            D(null, xe, p, m, a, g, _), f.el = xe.el;
          }
          if (q && pe(q, g), !ye && (C = A && A.onVnodeMounted)) {
            const xe = f;
            pe(() => Se(C, $, xe), g);
          }
          (f.shapeFlag & 256 || $ && Et($.vnode) && $.vnode.shapeFlag & 256) && a.a && pe(a.a, g), a.isMounted = true, f = p = m = null;
        }
      };
      a.scope.on();
      const v = a.effect = new fs(y);
      a.scope.off();
      const b = a.update = v.run.bind(v), P = a.job = v.runIfDirty.bind(v);
      P.i = a, P.id = a.uid, v.scheduler = () => lr(P), ke(a, true), b();
    }, k = (a, f, p) => {
      f.component = a;
      const m = a.vnode.props;
      a.vnode = f, a.next = null, Oo(a, f.props, m, p), Fo(a, f.children, p), Le(), Cr(a), ze();
    }, W = (a, f, p, m, g, _, S, y, v = false) => {
      const b = a && a.children, P = a ? a.shapeFlag : 0, C = f.children, { patchFlag: M, shapeFlag: A } = f;
      if (M > 0) {
        if (M & 128) {
          Nt(b, C, p, m, g, _, S, y, v);
          return;
        } else if (M & 256) {
          Ke(b, C, p, m, g, _, S, y, v);
          return;
        }
      }
      A & 8 ? (P & 16 && pt(b, g, _), C !== b && u(p, C)) : P & 16 ? A & 16 ? Nt(b, C, p, m, g, _, S, y, v) : pt(b, g, _, true) : (P & 8 && u(p, ""), A & 16 && ae(C, p, m, g, _, S, y, v));
    }, Ke = (a, f, p, m, g, _, S, y, v) => {
      a = a || st, f = f || st;
      const b = a.length, P = f.length, C = Math.min(b, P);
      let M;
      for (M = 0; M < C; M++) {
        const A = f[M] = v ? je(f[M]) : Ee(f[M]);
        D(a[M], A, p, null, g, _, S, y, v);
      }
      b > P ? pt(a, g, _, true, false, C) : ae(f, p, m, g, _, S, y, v, C);
    }, Nt = (a, f, p, m, g, _, S, y, v) => {
      let b = 0;
      const P = f.length;
      let C = a.length - 1, M = P - 1;
      for (; b <= C && b <= M; ) {
        const A = a[b], B = f[b] = v ? je(f[b]) : Ee(f[b]);
        if (mt(A, B)) D(A, B, p, null, g, _, S, y, v);
        else break;
        b++;
      }
      for (; b <= C && b <= M; ) {
        const A = a[C], B = f[M] = v ? je(f[M]) : Ee(f[M]);
        if (mt(A, B)) D(A, B, p, null, g, _, S, y, v);
        else break;
        C--, M--;
      }
      if (b > C) {
        if (b <= M) {
          const A = M + 1, B = A < P ? f[A].el : m;
          for (; b <= M; ) D(null, f[b] = v ? je(f[b]) : Ee(f[b]), p, B, g, _, S, y, v), b++;
        }
      } else if (b > M) for (; b <= C; ) ve(a[b], g, _, true), b++;
      else {
        const A = b, B = b, q = /* @__PURE__ */ new Map();
        for (b = B; b <= M; b++) {
          const de = f[b] = v ? je(f[b]) : Ee(f[b]);
          de.key != null && q.set(de.key, b);
        }
        let $, ce = 0;
        const fe = M - B + 1;
        let ye = false, xe = 0;
        const gt = new Array(fe);
        for (b = 0; b < fe; b++) gt[b] = 0;
        for (b = A; b <= C; b++) {
          const de = a[b];
          if (ce >= fe) {
            ve(de, g, _, true);
            continue;
          }
          let we;
          if (de.key != null) we = q.get(de.key);
          else for ($ = B; $ <= M; $++) if (gt[$ - B] === 0 && mt(de, f[$])) {
            we = $;
            break;
          }
          we === void 0 ? ve(de, g, _, true) : (gt[we - B] = b + 1, we >= xe ? xe = we : ye = true, D(de, f[we], p, null, g, _, S, y, v), ce++);
        }
        const mr = ye ? Lo(gt) : st;
        for ($ = mr.length - 1, b = fe - 1; b >= 0; b--) {
          const de = B + b, we = f[de], br = f[de + 1], vr = de + 1 < P ? br.el || br.placeholder : m;
          gt[b] === 0 ? D(null, we, p, vr, g, _, S, y, v) : ye && ($ < 0 || b !== mr[$] ? qe(we, p, vr, 2) : $--);
        }
      }
    }, qe = (a, f, p, m, g = null) => {
      const { el: _, type: S, transition: y, children: v, shapeFlag: b } = a;
      if (b & 6) {
        qe(a.component.subTree, f, p, m);
        return;
      }
      if (b & 128) {
        a.suspense.move(f, p, m);
        return;
      }
      if (b & 64) {
        S.move(a, f, p, ht);
        return;
      }
      if (S === Te) {
        r(_, f, p);
        for (let C = 0; C < v.length; C++) qe(v[C], f, p, m);
        r(a.anchor, f, p);
        return;
      }
      if (S === An) {
        G(a, f, p);
        return;
      }
      if (m !== 2 && b & 1 && y) if (m === 0) y.beforeEnter(_), r(_, f, p), pe(() => y.enter(_), g);
      else {
        const { leave: C, delayLeave: M, afterLeave: A } = y, B = () => {
          a.ctx.isUnmounted ? s(_) : r(_, f, p);
        }, q = () => {
          C(_, () => {
            B(), A && A();
          });
        };
        M ? M(_, B, q) : q();
      }
      else r(_, f, p);
    }, ve = (a, f, p, m = false, g = false) => {
      const { type: _, props: S, ref: y, children: v, dynamicChildren: b, shapeFlag: P, patchFlag: C, dirs: M, cacheIndex: A } = a;
      if (C === -2 && (g = false), y != null && (Le(), Tt(y, null, p, a, true), ze()), A != null && (f.renderCache[A] = void 0), P & 256) {
        f.ctx.deactivate(a);
        return;
      }
      const B = P & 1 && M, q = !Et(a);
      let $;
      if (q && ($ = S && S.onVnodeBeforeUnmount) && Se($, f, a), P & 6) ci(a.component, p, m);
      else {
        if (P & 128) {
          a.suspense.unmount(p, m);
          return;
        }
        B && Ye(a, null, f, "beforeUnmount"), P & 64 ? a.type.remove(a, f, p, ht, m) : b && !b.hasOnce && (_ !== Te || C > 0 && C & 64) ? pt(b, f, p, false, true) : (_ === Te && C & 384 || !g && P & 16) && pt(v, f, p), m && gr(a);
      }
      (q && ($ = S && S.onVnodeUnmounted) || B) && pe(() => {
        $ && Se($, f, a), B && Ye(a, null, f, "unmounted");
      }, p);
    }, gr = (a) => {
      const { type: f, el: p, anchor: m, transition: g } = a;
      if (f === Te) {
        ai(p, m);
        return;
      }
      if (f === An) {
        w(a);
        return;
      }
      const _ = () => {
        s(p), g && !g.persisted && g.afterLeave && g.afterLeave();
      };
      if (a.shapeFlag & 1 && g && !g.persisted) {
        const { leave: S, delayLeave: y } = g, v = () => S(p, _);
        y ? y(a.el, _, v) : v();
      } else _();
    }, ai = (a, f) => {
      let p;
      for (; a !== f; ) p = T(a), s(a), a = p;
      s(f);
    }, ci = (a, f, p) => {
      const { bum: m, scope: g, job: _, subTree: S, um: y, m: v, a: b, parent: P, slots: { __: C } } = a;
      Rr(v), Rr(b), m && kt(m), P && R(C) && C.forEach((M) => {
        P.renderCache[M] = void 0;
      }), g.stop(), _ && (_.flags |= 8, ve(S, a, f, p)), y && pe(y, f), pe(() => {
        a.isUnmounted = true;
      }, f), f && f.pendingBranch && !f.isUnmounted && a.asyncDep && !a.asyncResolved && a.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
    }, pt = (a, f, p, m = false, g = false, _ = 0) => {
      for (let S = _; S < a.length; S++) ve(a[S], f, p, m, g);
    }, Ht = (a) => {
      if (a.shapeFlag & 6) return Ht(a.component.subTree);
      if (a.shapeFlag & 128) return a.suspense.next();
      const f = T(a.anchor || a.el), p = f && f[ro];
      return p ? T(p) : f;
    };
    let Sn = false;
    const _r = (a, f, p) => {
      a == null ? f._vnode && ve(f._vnode, null, null, true) : D(f._vnode || null, a, f, null, null, null, p), f._vnode = a, Sn || (Sn = true, Cr(), Os(), Sn = false);
    }, ht = {
      p: D,
      um: ve,
      m: qe,
      r: gr,
      mt: dt,
      mc: ae,
      pc: W,
      pbc: me,
      n: Ht,
      o: e
    };
    return {
      render: _r,
      hydrate: void 0,
      createApp: Eo(_r)
    };
  }
  function Rn({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function ke({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function Do(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function Ks(e, t, n = false) {
    const r = e.children, s = t.children;
    if (R(r) && R(s)) for (let i = 0; i < r.length; i++) {
      const o = r[i];
      let l = s[i];
      l.shapeFlag & 1 && !l.dynamicChildren && ((l.patchFlag <= 0 || l.patchFlag === 32) && (l = s[i] = je(s[i]), l.el = o.el), !n && l.patchFlag !== -2 && Ks(o, l)), l.type === xn && (l.el = o.el), l.type === ft && !l.el && (l.el = o.el);
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
  function Rr(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  const zo = Symbol.for("v-scx"), Bo = () => Jt(zo);
  function Xt(e, t, n) {
    return Ys(e, t, n);
  }
  function Ys(e, t, n = K) {
    const { immediate: r, deep: s, flush: i, once: o } = n, l = se({}, n), c = t && r || !t && i !== "post";
    let d;
    if (Ut) {
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
    l.call = (E, U, D) => Oe(E, u, U, D);
    let h = false;
    i === "post" ? l.scheduler = (E) => {
      pe(E, u && u.suspense);
    } : i !== "sync" && (h = true, l.scheduler = (E, U) => {
      U ? E() : lr(E);
    }), l.augmentJob = (E) => {
      t && (E.flags |= 4), h && (E.flags |= 2, u && (E.id = u.uid, E.i = u));
    };
    const T = Qi(e, t, l);
    return Ut && (d ? d.push(T) : c && T()), T;
  }
  function No(e, t, n) {
    const r = this.proxy, s = Q(e) ? e.includes(".") ? ks(r, e) : () => r[e] : e.bind(r, r);
    let i;
    F(t) ? i = t : (i = t.handler, n = t);
    const o = zt(this), l = Ys(s, i.bind(r), n);
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
  const Ho = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${We(t)}Modifiers`] || e[`${et(t)}Modifiers`];
  function jo(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || K;
    let s = n;
    const i = t.startsWith("update:"), o = i && Ho(r, t.slice(7));
    o && (o.trim && (s = n.map((u) => Q(u) ? u.trim() : u)), o.number && (s = n.map(tn)));
    let l, c = r[l = Cn(t)] || r[l = Cn(We(t))];
    !c && i && (c = r[l = Cn(et(t))]), c && Oe(c, e, 6, s);
    const d = r[l + "Once"];
    if (d) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[l]) return;
      e.emitted[l] = true, Oe(d, e, 6, s);
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
        u && (l = true, se(o, u));
      };
      !n && t.mixins.length && t.mixins.forEach(c), e.extends && c(e.extends), e.mixins && e.mixins.forEach(c);
    }
    return !i && !l ? (J(e) && r.set(e, null), null) : (R(i) ? i.forEach((c) => o[c] = null) : se(o, i), J(e) && r.set(e, o), o);
  }
  function yn(e, t) {
    return !e || !un(t) ? false : (t = t.slice(2).replace(/Once$/, ""), j(e, t[0].toLowerCase() + t.slice(1)) || j(e, et(t)) || j(e, t));
  }
  function Ar(e) {
    const { type: t, vnode: n, proxy: r, withProxy: s, propsOptions: [i], slots: o, attrs: l, emit: c, render: d, renderCache: u, props: h, data: T, setupState: E, ctx: U, inheritAttrs: D } = e, V = on(e);
    let x, O;
    try {
      if (n.shapeFlag & 4) {
        const w = s || r, I = w;
        x = Ee(d.call(I, w, u, h, E, T, U)), O = l;
      } else {
        const w = t;
        x = Ee(w.length > 1 ? w(h, {
          attrs: l,
          slots: o,
          emit: c
        }) : w(h, null)), O = t.props ? l : $o(l);
      }
    } catch (w) {
      Pt.length = 0, mn(w, e, 1), x = De(ft);
    }
    let G = x;
    if (O && D !== false) {
      const w = Object.keys(O), { shapeFlag: I } = G;
      w.length && I & 7 && (i && w.some(Yn) && (O = Wo(O, i)), G = ut(G, O, false, true));
    }
    return n.dirs && (G = ut(G, null, false, true), G.dirs = G.dirs ? G.dirs.concat(n.dirs) : n.dirs), n.transition && ar(G, n.transition), x = G, on(V), x;
  }
  const $o = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || un(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Wo = (e, t) => {
    const n = {};
    for (const r in e) (!Yn(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function Go(e, t, n) {
    const { props: r, children: s, component: i } = e, { props: o, children: l, patchFlag: c } = t, d = i.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && c >= 0) {
      if (c & 1024) return true;
      if (c & 16) return r ? Ir(r, o, d) : !!o;
      if (c & 8) {
        const u = t.dynamicProps;
        for (let h = 0; h < u.length; h++) {
          const T = u[h];
          if (o[T] !== r[T] && !yn(d, T)) return true;
        }
      }
    } else return (s || l) && (!l || !l.$stable) ? true : r === o ? false : r ? o ? Ir(r, o, d) : true : !!o;
    return false;
  }
  function Ir(e, t, n) {
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
  const Te = Symbol.for("v-fgt"), xn = Symbol.for("v-txt"), ft = Symbol.for("v-cmt"), An = Symbol.for("v-stc"), Pt = [];
  let he = null;
  function Ot(e = false) {
    Pt.push(he = e ? null : []);
  }
  function Yo() {
    Pt.pop(), he = Pt[Pt.length - 1] || null;
  }
  let Vt = 1;
  function Fr(e, t = false) {
    Vt += e, e < 0 && he && t && (he.hasOnce = true);
  }
  function ko(e) {
    return e.dynamicChildren = Vt > 0 ? he || st : null, Yo(), Vt > 0 && he && he.push(e), e;
  }
  function Rt(e, t, n, r, s, i) {
    return ko(L(e, t, n, r, s, i, true));
  }
  function Qs(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function mt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const Zs = ({ key: e }) => e ?? null, Qt = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? Q(e) || re(e) || F(e) ? {
    i: ge,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function L(e, t = null, n = null, r = 0, s = null, i = e === Te ? 0 : 1, o = false, l = false) {
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
    return l ? (pr(c, n), i & 128 && e.normalize(c)) : n && (c.shapeFlag |= Q(n) ? 8 : 16), Vt > 0 && !o && he && (c.patchFlag > 0 || i & 6) && c.patchFlag !== 32 && he.push(c), c;
  }
  const De = Jo;
  function Jo(e, t = null, n = null, r = 0, s = null, i = false) {
    if ((!e || e === mo) && (e = ft), Qs(e)) {
      const l = ut(e, t, true);
      return n && pr(l, n), Vt > 0 && !i && he && (l.shapeFlag & 6 ? he[he.indexOf(e)] = l : he.push(l)), l.patchFlag = -2, l;
    }
    if (ll(e) && (e = e.__vccOpts), t) {
      t = Xo(t);
      let { class: l, style: c } = t;
      l && !Q(l) && (t.class = Qn(l)), J(c) && (or(c) && !R(c) && (c = se({}, c)), t.style = Xn(c));
    }
    const o = Q(e) ? 1 : Xs(e) ? 128 : so(e) ? 64 : J(e) ? 4 : F(e) ? 2 : 0;
    return L(e, t, n, r, s, o, i, true);
  }
  function Xo(e) {
    return e ? or(e) || Ns(e) ? se({}, e) : e : null;
  }
  function ut(e, t, n = false, r = false) {
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
      patchFlag: t && e.type !== Te ? o === -1 ? 16 : o | 16 : o,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: c,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && ut(e.ssContent),
      ssFallback: e.ssFallback && ut(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return c && r && ar(u, c.clone(u)), u;
  }
  function yt(e = " ", t = 0) {
    return De(xn, null, e, t);
  }
  function Ee(e) {
    return e == null || typeof e == "boolean" ? De(ft) : R(e) ? De(Te, null, e.slice()) : Qs(e) ? je(e) : De(xn, null, String(e));
  }
  function je(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : ut(e);
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
      yt(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function Qo(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const s in r) if (s === "class") t.class !== r.class && (t.class = Qn([
        t.class,
        r.class
      ]));
      else if (s === "style") t.style = Xn([
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
  function Se(e, t, n, r = null) {
    Oe(e, t, 7, [
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
      propsDefaults: K,
      inheritAttrs: r.inheritAttrs,
      ctx: K,
      data: K,
      props: K,
      attrs: K,
      slots: K,
      refs: K,
      setupState: K,
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
  let an, Gn;
  {
    const e = hn(), t = (n, r) => {
      let s;
      return (s = e[n]) || (s = e[n] = []), s.push(r), (i) => {
        s.length > 1 ? s.forEach((o) => o(i)) : s[0](i);
      };
    };
    an = t("__VUE_INSTANCE_SETTERS__", (n) => le = n), Gn = t("__VUE_SSR_SETTERS__", (n) => Ut = n);
  }
  const zt = (e) => {
    const t = le;
    return an(e), e.scope.on(), () => {
      e.scope.off(), an(t);
    };
  }, Vr = () => {
    le && le.scope.off(), an(null);
  };
  function ei(e) {
    return e.vnode.shapeFlag & 4;
  }
  let Ut = false;
  function rl(e, t = false, n = false) {
    t && Gn(t);
    const { props: r, children: s } = e.vnode, i = ei(e);
    Po(e, r, i, t), Io(e, s, n || t);
    const o = i ? sl(e, t) : void 0;
    return t && Gn(false), o;
  }
  function sl(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, vo);
    const { setup: r } = n;
    if (r) {
      Le();
      const s = e.setupContext = r.length > 1 ? ol(e) : null, i = zt(e), o = Lt(r, e, 0, [
        e.props,
        s
      ]), l = rs(o);
      if (ze(), i(), (l || e.sp) && !Et(e) && Is(e), l) {
        if (o.then(Vr, Vr), t) return o.then((c) => {
          Ur(e, c);
        }).catch((c) => {
          mn(c, e, 0);
        });
        e.asyncDep = o;
      } else Ur(e, o);
    } else ti(e);
  }
  function Ur(e, t, n) {
    F(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : J(t) && (e.setupState = Ts(t)), ti(e);
  }
  function ti(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || Me);
    {
      const s = zt(e);
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
      return ne(e, "get", ""), e[t];
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
        if (n in Mt) return Mt[n](e);
      },
      has(t, n) {
        return n in t || n in Mt;
      }
    })) : e.proxy;
  }
  function ll(e) {
    return F(e) && "__vccOpts" in e;
  }
  const Xe = (e, t) => Ji(e, t, Ut), al = "3.5.18";
  let Kn;
  const Dr = typeof window < "u" && window.trustedTypes;
  if (Dr) try {
    Kn = Dr.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const ni = Kn ? (e) => Kn.createHTML(e) : (e) => e, cl = "http://www.w3.org/2000/svg", fl = "http://www.w3.org/1998/Math/MathML", Fe = typeof document < "u" ? document : null, Lr = Fe && Fe.createElement("template"), ul = {
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
        Lr.innerHTML = ni(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const l = Lr.content;
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
  function pl(e, t, n) {
    const r = e[dl];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const zr = Symbol("_vod"), hl = Symbol("_vsh"), gl = Symbol(""), _l = /(^|;)\s*display\s*:/;
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
    zr in e && (e[zr] = i ? r.display : "", e[hl] && (r.display = "none"));
  }
  const Br = /\s*!important$/;
  function Zt(e, t, n) {
    if (R(n)) n.forEach((r) => Zt(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = bl(e, t);
      Br.test(n) ? e.setProperty(et(r), n.replace(Br, ""), "important") : e[r] = n;
    }
  }
  const Nr = [
    "Webkit",
    "Moz",
    "ms"
  ], In = {};
  function bl(e, t) {
    const n = In[t];
    if (n) return n;
    let r = We(t);
    if (r !== "filter" && r in e) return In[t] = r;
    r = os(r);
    for (let s = 0; s < Nr.length; s++) {
      const i = Nr[s] + r;
      if (i in e) return In[t] = i;
    }
    return t;
  }
  const Hr = "http://www.w3.org/1999/xlink";
  function jr(e, t, n, r, s, i = yi(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Hr, t.slice(6, t.length)) : e.setAttributeNS(Hr, t, n) : n == null || i && !ls(n) ? e.removeAttribute(t) : e.setAttribute(t, i ? "" : Pe(n) ? String(n) : n);
  }
  function $r(e, t, n, r, s) {
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
  function Qe(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function vl(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const Wr = Symbol("_vei");
  function yl(e, t, n, r, s = null) {
    const i = e[Wr] || (e[Wr] = {}), o = i[t];
    if (r && o) o.value = r;
    else {
      const [l, c] = xl(t);
      if (r) {
        const d = i[t] = Cl(r, s);
        Qe(e, l, d, c);
      } else o && (vl(e, l, o, c), i[t] = void 0);
    }
  }
  const Gr = /(?:Once|Passive|Capture)$/;
  function xl(e) {
    let t;
    if (Gr.test(e)) {
      t = {};
      let r;
      for (; r = e.match(Gr); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : et(e.slice(2)),
      t
    ];
  }
  let Fn = 0;
  const wl = Promise.resolve(), Sl = () => Fn || (wl.then(() => Fn = 0), Fn = Date.now());
  function Cl(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Oe(Tl(r, n.value), t, 5, [
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
  const Kr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, El = (e, t, n, r, s, i) => {
    const o = s === "svg";
    t === "class" ? pl(e, r, o) : t === "style" ? ml(e, n, r) : un(t) ? Yn(t) || yl(e, t, n, r, i) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Ml(e, t, r, o)) ? ($r(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && jr(e, t, r, o, i, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !Q(r)) ? $r(e, We(t), r, i, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), jr(e, t, r, o));
  };
  function Ml(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Kr(t) && F(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const s = e.tagName;
      if (s === "IMG" || s === "VIDEO" || s === "CANVAS" || s === "SOURCE") return false;
    }
    return Kr(t) && Q(n) ? false : t in e;
  }
  const cn = (e) => {
    const t = e.props["onUpdate:modelValue"] || false;
    return R(t) ? (n) => kt(t, n) : t;
  };
  function Pl(e) {
    e.target.composing = true;
  }
  function qr(e) {
    const t = e.target;
    t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
  }
  const ct = Symbol("_assign"), Vn = {
    created(e, { modifiers: { lazy: t, trim: n, number: r } }, s) {
      e[ct] = cn(s);
      const i = r || s.props && s.props.type === "number";
      Qe(e, t ? "change" : "input", (o) => {
        if (o.target.composing) return;
        let l = e.value;
        n && (l = l.trim()), i && (l = tn(l)), e[ct](l);
      }), n && Qe(e, "change", () => {
        e.value = e.value.trim();
      }), t || (Qe(e, "compositionstart", Pl), Qe(e, "compositionend", qr), Qe(e, "change", qr));
    },
    mounted(e, { value: t }) {
      e.value = t ?? "";
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: s, number: i } }, o) {
      if (e[ct] = cn(o), e.composing) return;
      const l = (i || e.type === "number") && !/^0\d/.test(e.value) ? tn(e.value) : e.value, c = t ?? "";
      l !== c && (document.activeElement === e && e.type !== "range" && (r && t === n || s && e.value.trim() === c) || (e.value = c));
    }
  }, Ol = {
    deep: true,
    created(e, { value: t, modifiers: { number: n } }, r) {
      const s = dn(t);
      Qe(e, "change", () => {
        const i = Array.prototype.filter.call(e.options, (o) => o.selected).map((o) => n ? tn(fn(o)) : fn(o));
        e[ct](e.multiple ? s ? new Set(i) : i : i[0]), e._assigning = true, Ms(() => {
          e._assigning = false;
        });
      }), e[ct] = cn(r);
    },
    mounted(e, { value: t }) {
      Yr(e, t);
    },
    beforeUpdate(e, t, n) {
      e[ct] = cn(n);
    },
    updated(e, { value: t }) {
      e._assigning || Yr(e, t);
    }
  };
  function Yr(e, t) {
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
  const Rl = se({
    patchProp: El
  }, ul);
  let kr;
  function Al() {
    return kr || (kr = Vo(Rl));
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
  const Ul = `
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
  let x0 = xy.x ; //+ mandelbrot.cx;
  let y0 = xy.y ; //+ mandelbrot.cy;
  var dc = vec2<f32>(
       xy.x,
       xy.y
  );
  let res = mandelbrot_func(dc.x, dc.y);
  return vec4<f32>(res.x, res.y, 0.0, 1.0);
}











`, Dl = `struct Uniforms {
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
}`, Ll = "" + new URL("mandelbrot_bg-CcovV5r6.wasm", import.meta.url).href, zl = async (e = {}, t) => {
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
  let N;
  function Bl(e) {
    N = e;
  }
  let Kt = null;
  function Nl() {
    return (Kt === null || Kt.byteLength === 0) && (Kt = new Uint8Array(N.memory.buffer)), Kt;
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
  let qt = null;
  function $l() {
    return (qt === null || qt.byteLength === 0) && (qt = new Float64Array(N.memory.buffer)), qt;
  }
  function Jr(e, t) {
    return e = e >>> 0, $l().subarray(e / 8, e / 8 + t);
  }
  const Xr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => N.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  let Wl = class {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Xr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      N.__wbg_mandelbrotnavigator_free(t, 0);
    }
    constructor(t, n, r, s, i) {
      const o = N.mandelbrotnavigator_new(t, n, r, s, i);
      return this.__wbg_ptr = o >>> 0, Xr.register(this, this.__wbg_ptr, this), this;
    }
    translate(t, n) {
      N.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
    rotate(t) {
      N.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      N.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    rotate_direct(t) {
      N.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    zoom(t) {
      N.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    step() {
      const t = N.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = Jr(t[0], t[1]).slice();
      return N.__wbindgen_free(t[0], t[1] * 8, 8), n;
    }
    get_params() {
      const t = N.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = Jr(t[0], t[1]).slice();
      return N.__wbindgen_free(t[0], t[1] * 8, 8), n;
    }
    compute_reference_orbit_ptr(t) {
      const n = N.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return hr.__wrap(n);
    }
    get_reference_orbit_len() {
      return N.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    get_reference_orbit_capacity() {
      return N.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    scale(t) {
      N.mandelbrotnavigator_scale(this.__wbg_ptr, t);
    }
    angle(t) {
      N.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    origin(t, n) {
      N.mandelbrotnavigator_origin(this.__wbg_ptr, t, n);
    }
  };
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => N.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const Qr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => N.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class hr {
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(hr.prototype);
      return n.__wbg_ptr = t, Qr.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Qr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      N.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      return N.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      N.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      return N.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      N.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      return N.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      N.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  function Gl(e) {
    console.debug(e);
  }
  function Kl(e) {
    console.error(e);
  }
  function ql(e) {
    console.info(e);
  }
  function Yl(e) {
    console.log(e);
  }
  function kl(e) {
    console.warn(e);
  }
  function Jl() {
    const e = N.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  function Xl(e, t) {
    return si(e, t);
  }
  function Ql(e, t) {
    throw new Error(si(e, t));
  }
  URL = globalThis.URL;
  const z = await zl({
    "./mandelbrot_bg.js": {
      __wbindgen_string_new: Xl,
      __wbg_debug_58d16ea352cfbca1: Gl,
      __wbg_error_51ecdd39ec054205: Kl,
      __wbg_info_e56933705c348038: ql,
      __wbg_log_ea240990d83e374e: Yl,
      __wbg_warn_d89f6637da554c8d: kl,
      __wbindgen_throw: Ql,
      __wbindgen_init_externref_table: Jl
    }
  }, Ll), ii = z.memory, Zl = z.__wbg_mandelbrotstep_free, ea = z.__wbg_get_mandelbrotstep_zx, ta = z.__wbg_set_mandelbrotstep_zx, na = z.__wbg_get_mandelbrotstep_zy, ra = z.__wbg_set_mandelbrotstep_zy, sa = z.__wbg_get_mandelbrotstep_dx, ia = z.__wbg_set_mandelbrotstep_dx, oa = z.__wbg_get_mandelbrotstep_dy, la = z.__wbg_set_mandelbrotstep_dy, aa = z.__wbg_mandelbrotnavigator_free, ca = z.mandelbrotnavigator_new, fa = z.mandelbrotnavigator_translate, ua = z.mandelbrotnavigator_rotate, da = z.mandelbrotnavigator_translate_direct, pa = z.mandelbrotnavigator_rotate_direct, ha = z.mandelbrotnavigator_zoom, ga = z.mandelbrotnavigator_step, _a = z.mandelbrotnavigator_get_params, ma = z.mandelbrotnavigator_compute_reference_orbit_ptr, ba = z.mandelbrotnavigator_get_reference_orbit_len, va = z.mandelbrotnavigator_get_reference_orbit_capacity, ya = z.mandelbrotnavigator_scale, xa = z.mandelbrotnavigator_angle, wa = z.mandelbrotnavigator_origin, Sa = z.__wbg_orbitbufferinfo_free, Ca = z.__wbg_get_orbitbufferinfo_ptr, Ta = z.__wbg_set_orbitbufferinfo_ptr, Ea = z.__wbg_get_orbitbufferinfo_offset, Ma = z.__wbg_set_orbitbufferinfo_offset, Pa = z.__wbg_get_orbitbufferinfo_count, Oa = z.__wbg_set_orbitbufferinfo_count, Ra = z.__wbindgen_export_0, Aa = z.__wbindgen_free, oi = z.__wbindgen_start, Ia = Object.freeze(Object.defineProperty({
    __proto__: null,
    __wbg_get_mandelbrotstep_dx: sa,
    __wbg_get_mandelbrotstep_dy: oa,
    __wbg_get_mandelbrotstep_zx: ea,
    __wbg_get_mandelbrotstep_zy: na,
    __wbg_get_orbitbufferinfo_count: Pa,
    __wbg_get_orbitbufferinfo_offset: Ea,
    __wbg_get_orbitbufferinfo_ptr: Ca,
    __wbg_mandelbrotnavigator_free: aa,
    __wbg_mandelbrotstep_free: Zl,
    __wbg_orbitbufferinfo_free: Sa,
    __wbg_set_mandelbrotstep_dx: ia,
    __wbg_set_mandelbrotstep_dy: la,
    __wbg_set_mandelbrotstep_zx: ta,
    __wbg_set_mandelbrotstep_zy: ra,
    __wbg_set_orbitbufferinfo_count: Oa,
    __wbg_set_orbitbufferinfo_offset: Ma,
    __wbg_set_orbitbufferinfo_ptr: Ta,
    __wbindgen_export_0: Ra,
    __wbindgen_free: Aa,
    __wbindgen_start: oi,
    mandelbrotnavigator_angle: xa,
    mandelbrotnavigator_compute_reference_orbit_ptr: ma,
    mandelbrotnavigator_get_params: _a,
    mandelbrotnavigator_get_reference_orbit_capacity: va,
    mandelbrotnavigator_get_reference_orbit_len: ba,
    mandelbrotnavigator_new: ca,
    mandelbrotnavigator_origin: wa,
    mandelbrotnavigator_rotate: ua,
    mandelbrotnavigator_rotate_direct: pa,
    mandelbrotnavigator_scale: ya,
    mandelbrotnavigator_step: ga,
    mandelbrotnavigator_translate: fa,
    mandelbrotnavigator_translate_direct: da,
    mandelbrotnavigator_zoom: ha,
    memory: ii
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  Bl(Ia);
  oi();
  class Fa {
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
      this.canvas = t, this.shaderPass1 = Ul, this.shaderPass2 = Dl, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
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
        100,
        100,
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
  const Va = {
    class: "panel compact-panel"
  }, Ua = {
    class: "panel-block compact-block"
  }, Da = {
    class: "math-display"
  }, La = [
    "innerHTML"
  ], za = {
    class: "panel-block compact-block"
  }, Ba = {
    class: "math-display"
  }, Na = [
    "innerHTML"
  ], Ha = {
    class: "math-display"
  }, ja = [
    "innerHTML"
  ], $a = {
    class: "panel-block compact-block"
  }, Wa = {
    class: "math-display"
  }, Ga = {
    class: "panel-block compact-block"
  }, Ka = {
    class: "math-display"
  }, qa = {
    class: "panel-block compact-block"
  }, Ya = {
    class: "math-display"
  }, ka = {
    class: "panel-block compact-block"
  }, Ja = {
    style: {
      display: "flex",
      "flex-direction": "column",
      gap: "0.3em"
    }
  }, Xa = [
    "value"
  ], Qa = {
    class: "panel-block compact-block"
  }, Za = {
    style: {
      display: "flex",
      gap: "0.5em",
      "align-items": "center"
    }
  }, Zr = "mandelbrot_presets", ec = cr({
    __name: "Settings",
    props: {
      modelValue: {}
    },
    setup(e) {
      const t = e;
      function n(V, x = 8) {
        if (V === 0) return "0";
        const O = Math.floor(Math.log10(Math.abs(V))), G = V / Math.pow(10, O), w = O === 0 ? "" : `\xD710${r(O)}`;
        return `${G.toFixed(x)}${w}`;
      }
      function r(V) {
        const x = {
          "-": "\u207B",
          0: "\u2070",
          1: "\xB9",
          2: "\xB2",
          3: "\xB3",
          4: "\u2074",
          5: "\u2075",
          6: "\u2076",
          7: "\u2077",
          8: "\u2078",
          9: "\u2079"
        };
        return String(V).split("").map((O) => x[O] ?? O).join("");
      }
      const s = Xe(() => (t.modelValue.angle * 180 / Math.PI).toFixed(2)), i = Xe(() => n(t.modelValue.scale)), o = Xe(() => n(t.modelValue.cx)), l = Xe(() => n(t.modelValue.cy)), c = Ct(""), d = Ct([]), u = Ct("");
      function h() {
        if (!c.value.trim()) return;
        const V = {
          name: c.value.trim(),
          cx: t.modelValue.cx,
          cy: t.modelValue.cy,
          scale: t.modelValue.scale,
          angle: t.modelValue.angle
        }, x = d.value.findIndex((O) => O.name === V.name);
        x >= 0 ? d.value[x] = V : d.value.push(V), localStorage.setItem(Zr, JSON.stringify(d.value)), c.value = "";
      }
      function T() {
        const V = localStorage.getItem(Zr);
        if (V) try {
          d.value = JSON.parse(V);
        } catch {
        }
      }
      function E(V) {
        const x = d.value.find((O) => O.name === V);
        x && (t.modelValue.cx = x.cx, t.modelValue.cy = x.cy, t.modelValue.scale = x.scale, t.modelValue.angle = x.angle, u.value = V);
      }
      const U = Xe({
        get: () => Math.log10(t.modelValue.mu ?? 1),
        set: (V) => {
          t.modelValue.mu = Math.pow(10, V);
        }
      }), D = Xe({
        get: () => Math.log10(t.modelValue.epsilon ?? 1e-8),
        set: (V) => {
          t.modelValue.epsilon = Math.pow(10, V);
        }
      });
      return vn(() => {
        T();
      }), (V, x) => (Ot(), Rt("nav", Va, [
        x[16] || (x[16] = L("p", {
          class: "panel-heading compact-heading"
        }, "Param\xE8tres", -1)),
        L("div", Ua, [
          L("span", Da, [
            x[6] || (x[6] = yt(" \xC9chelle\xA0: ", -1)),
            L("span", {
              innerHTML: i.value
            }, null, 8, La),
            L("button", {
              class: "button is-small",
              style: {
                "margin-left": "0.7em"
              },
              onClick: x[0] || (x[0] = (O) => t.modelValue.scale = 2.5)
            }, "R\xE9initialiser")
          ])
        ]),
        L("div", za, [
          L("p", null, [
            L("span", Ba, [
              x[7] || (x[7] = yt("Cx\xA0:", -1)),
              L("span", {
                innerHTML: o.value
              }, null, 8, Na)
            ])
          ]),
          L("p", null, [
            L("span", Ha, [
              x[8] || (x[8] = yt("Cy\xA0:", -1)),
              x[9] || (x[9] = L("span", {
                class: "math-i"
              }, "i", -1)),
              L("span", {
                innerHTML: l.value
              }, null, 8, ja)
            ])
          ])
        ]),
        L("div", $a, [
          L("span", Wa, [
            x[10] || (x[10] = yt(" Angle\xA0: ", -1)),
            L("span", null, bt(s.value) + "\xB0", 1)
          ])
        ]),
        L("div", Ga, [
          x[11] || (x[11] = L("label", {
            class: "compact-label"
          }, "Mu (log)", -1)),
          Gt(L("input", {
            type: "range",
            min: "0",
            max: "5",
            step: "0.01",
            "onUpdate:modelValue": x[1] || (x[1] = (O) => U.value = O),
            style: {
              width: "100%"
            }
          }, null, 512), [
            [
              Vn,
              U.value
            ]
          ]),
          L("span", Ka, bt((t.modelValue.mu ?? 1).toFixed(1)), 1)
        ]),
        L("div", qa, [
          x[12] || (x[12] = L("label", {
            class: "compact-label"
          }, "Epsilon (log)", -1)),
          Gt(L("input", {
            type: "range",
            min: "-12",
            max: "0",
            step: "0.01",
            "onUpdate:modelValue": x[2] || (x[2] = (O) => D.value = O),
            style: {
              width: "100%"
            }
          }, null, 512), [
            [
              Vn,
              D.value
            ]
          ]),
          L("span", Ya, bt((t.modelValue.epsilon ?? 1e-8).toExponential(2)), 1)
        ]),
        L("div", ka, [
          x[14] || (x[14] = L("label", {
            class: "compact-label"
          }, "Presets enregistr\xE9s", -1)),
          L("div", Ja, [
            Gt(L("select", {
              class: "select compact-select",
              "onUpdate:modelValue": x[3] || (x[3] = (O) => u.value = O),
              onChange: x[4] || (x[4] = (O) => E(u.value)),
              style: {
                width: "100%"
              }
            }, [
              x[13] || (x[13] = L("option", {
                value: "",
                disabled: ""
              }, "Choisir un preset...", -1)),
              (Ot(true), Rt(Te, null, bo(d.value, (O) => (Ot(), Rt("option", {
                key: O.name,
                value: O.name
              }, bt(O.name), 9, Xa))), 128))
            ], 544), [
              [
                Ol,
                u.value
              ]
            ])
          ])
        ]),
        L("div", Qa, [
          x[15] || (x[15] = L("label", {
            class: "compact-label"
          }, "Nom du preset", -1)),
          L("div", Za, [
            Gt(L("input", {
              class: "input compact-input",
              "onUpdate:modelValue": x[5] || (x[5] = (O) => c.value = O),
              type: "text",
              placeholder: "Nom...",
              style: {
                width: "8em"
              }
            }, null, 512), [
              [
                Vn,
                c.value
              ]
            ]),
            L("button", {
              class: "button is-link is-small",
              onClick: h
            }, "Enregistrer")
          ])
        ])
      ]));
    }
  }), li = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [r, s] of t) n[r] = s;
    return n;
  }, tc = li(ec, [
    [
      "__scopeId",
      "data-v-0c8ba4f0"
    ]
  ]), nc = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, rc = {
    style: {
      position: "absolute",
      top: "0",
      left: "0",
      "z-index": "10",
      width: "320px",
      "pointer-events": "auto"
    }
  }, es = 1, ts = 128, Yt = 0.04, ns = 0.025, sc = cr({
    __name: "MandelbrotNavigator",
    setup(e) {
      const t = Ct(null);
      let n, r, s;
      const i = Ct({
        cx: -1.5,
        cy: 0,
        mu: 1e4,
        scale: 2.5,
        angle: 0,
        maxIterations: 1e3,
        antialiasLevel: es,
        palettePeriod: ts
      });
      function o(w) {
        d[w.key.toLowerCase()] = true;
      }
      function l(w) {
        d[w.key.toLowerCase()] = false;
      }
      function c(w) {
        w.preventDefault();
        const I = 0.8;
        w.deltaY < 0 ? s.zoom(I) : s.zoom(1 / I);
      }
      const d = {};
      let u = false, h = false, T = 0, E = 0;
      function U(w) {
        const I = t.value;
        if (!I) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const X = I.getBoundingClientRect();
        return {
          x: w.clientX - X.left,
          y: w.clientY - X.top,
          width: X.width,
          height: X.height
        };
      }
      function D(w) {
        if (w.button === 2) h = true;
        else {
          u = true;
          const I = U(w);
          T = I.x, E = I.y;
        }
      }
      function V(w) {
        var _a2;
        const I = U(w);
        if (h) {
          const Ne = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
          if (!Ne) return;
          const dt = Ne.width / 2, Bt = Ne.height / 2, Z = I.x, k = I.y, W = Math.atan2(k - Bt, Z - dt);
          s.rotate(W - s.get_params()[3]);
          return;
        }
        if (!u) return;
        const X = I.width, te = I.height, ae = X / te, Re = (I.x - T) / X * 2, me = (I.y - E) / te * 2, Ae = -Re * ae, tt = me;
        s.translate_direct(Ae, tt), T = I.x, E = I.y;
      }
      function x(w) {
        w.button === 2 ? h = false : u = false;
      }
      async function O() {
        if (!t.value) return;
        n = t.value, s = new Wl(-0.749208775, -0.0798967515, 1e4, 2.5, 0), r = new Fa(n, {
          antialiasLevel: 1,
          palettePeriod: 128
        }), await r.initialize(s), window.addEventListener("keydown", o), window.addEventListener("keyup", l), n.addEventListener("wheel", c, {
          passive: false
        }), n.addEventListener("mousedown", D), n.addEventListener("contextmenu", function(I) {
          I.preventDefault();
        }), window.addEventListener("mousemove", V), window.addEventListener("mouseup", x);
        function w() {
          d.z && s.translate(0, Yt), d.s && s.translate(0, -Yt), d.q && s.translate(-Yt, 0), d.d && s.translate(Yt, 0), d.a && s.rotate(ns), d.e && s.rotate(-ns);
          const I = i.value.epsilon, [X, te, ae, Re] = s.step(), me = i.value.mu;
          i.value.cx = X, i.value.cy = te, i.value.scale = ae, i.value.angle = Re;
          const Ae = Math.min(Math.max(100, 80 + 30 * Math.log2(1 / ae)), 1e6);
          r.update({
            cx: X,
            cy: te,
            mu: me,
            scale: ae,
            angle: Re,
            maxIterations: Ae,
            epsilon: I
          }, {
            antialiasLevel: es,
            palettePeriod: ts
          }), r.render(), requestAnimationFrame(w);
        }
        w();
      }
      function G() {
        if (!t.value || !r) return;
        const w = t.value.getBoundingClientRect();
        t.value.width = w.width, t.value.height = w.height, r.resize && r.resize(), r.render();
      }
      return Xt(i, (w) => {
        s && (s.scale(w.scale), s.angle(w.angle), s.origin(w.cx, w.cy));
      }, {
        deep: true
      }), vn(() => {
        O(), window.addEventListener("resize", G);
      }), fr(() => {
        window.removeEventListener("resize", G);
      }), (w, I) => (Ot(), Rt("div", nc, [
        L("canvas", {
          ref_key: "canvasRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          }
        }, null, 512),
        L("div", rc, [
          De(tc, {
            modelValue: i.value,
            "onUpdate:modelValue": I[0] || (I[0] = (X) => i.value = X)
          }, null, 8, [
            "modelValue"
          ])
        ])
      ]));
    }
  }), ic = li(sc, [
    [
      "__scopeId",
      "data-v-5d45e346"
    ]
  ]), oc = {
    id: "fullscreen"
  }, lc = cr({
    __name: "App",
    setup(e) {
      return vn(() => {
      }), (t, n) => (Ot(), Rt("div", oc, [
        De(ic)
      ]));
    }
  });
  Il(lc).mount("#app");
})();
