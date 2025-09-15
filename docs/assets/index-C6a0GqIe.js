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
  function Qn(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const K = {}, lt = [], Pe = () => {
  }, pi = () => false, pn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Zn = (e) => e.startsWith("onUpdate:"), se = Object.assign, er = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, _i = Object.prototype.hasOwnProperty, $ = (e, t) => _i.call(e, t), R = Array.isArray, ct = (e) => zt(e) === "[object Map]", _n = (e) => zt(e) === "[object Set]", Cr = (e) => zt(e) === "[object Date]", F = (e) => typeof e == "function", Z = (e) => typeof e == "string", Me = (e) => typeof e == "symbol", J = (e) => e !== null && typeof e == "object", ls = (e) => (J(e) || F(e)) && F(e.then) && F(e.catch), cs = Object.prototype.toString, zt = (e) => cs.call(e), gi = (e) => zt(e).slice(8, -1), as = (e) => zt(e) === "[object Object]", tr = (e) => Z(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, St = Qn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), gn = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  }, mi = /-(\w)/g, qe = gn((e) => e.replace(mi, (t, n) => n ? n.toUpperCase() : "")), bi = /\B([A-Z])/g, nt = gn((e) => e.replace(bi, "-$1").toLowerCase()), fs = gn((e) => e.charAt(0).toUpperCase() + e.slice(1)), Pn = gn((e) => e ? `on${fs(e)}` : ""), Ke = (e, t) => !Object.is(e, t), Xt = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, Hn = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, sn = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  };
  let Er;
  const mn = () => Er || (Er = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function nr(e) {
    if (R(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], s = Z(r) ? wi(r) : nr(r);
        if (s) for (const i in s) t[i] = s[i];
      }
      return t;
    } else if (Z(e) || J(e)) return e;
  }
  const vi = /;(?![^(]*\))/g, yi = /:([^]+)/, xi = /\/\*[^]*?\*\//g;
  function wi(e) {
    const t = {};
    return e.replace(xi, "").split(vi).forEach((n) => {
      if (n) {
        const r = n.split(yi);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }), t;
  }
  function rr(e) {
    let t = "";
    if (Z(e)) t = e;
    else if (R(e)) for (let n = 0; n < e.length; n++) {
      const r = rr(e[n]);
      r && (t += r + " ");
    }
    else if (J(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const Si = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Ti = Qn(Si);
  function us(e) {
    return !!e || e === "";
  }
  function Ci(e, t) {
    if (e.length !== t.length) return false;
    let n = true;
    for (let r = 0; n && r < e.length; r++) n = bn(e[r], t[r]);
    return n;
  }
  function bn(e, t) {
    if (e === t) return true;
    let n = Cr(e), r = Cr(t);
    if (n || r) return n && r ? e.getTime() === t.getTime() : false;
    if (n = Me(e), r = Me(t), n || r) return e === t;
    if (n = R(e), r = R(t), n || r) return n && r ? Ci(e, t) : false;
    if (n = J(e), r = J(t), n || r) {
      if (!n || !r) return false;
      const s = Object.keys(e).length, i = Object.keys(t).length;
      if (s !== i) return false;
      for (const o in e) {
        const l = e.hasOwnProperty(o), a = t.hasOwnProperty(o);
        if (l && !a || !l && a || !bn(e[o], t[o])) return false;
      }
    }
    return String(e) === String(t);
  }
  function Ei(e, t) {
    return e.findIndex((n) => bn(n, t));
  }
  const ds = (e) => !!(e && e.__v_isRef === true), yt = (e) => Z(e) ? e : e == null ? "" : R(e) || J(e) && (e.toString === cs || !F(e.toString)) ? ds(e) ? yt(e.value) : JSON.stringify(e, hs, 2) : String(e), hs = (e, t) => ds(t) ? hs(e, t.value) : ct(t) ? {
    [`Map(${t.size})`]: [
      ...t.entries()
    ].reduce((n, [r, s], i) => (n[Mn(r, i) + " =>"] = s, n), {})
  } : _n(t) ? {
    [`Set(${t.size})`]: [
      ...t.values()
    ].map((n) => Mn(n))
  } : Me(t) ? Mn(t) : J(t) && !R(t) && !as(t) ? String(t) : t, Mn = (e, t = "") => {
    var n;
    return Me(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
  let fe;
  class Pi {
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
  function Mi() {
    return fe;
  }
  let Y;
  const On = /* @__PURE__ */ new WeakSet();
  class ps {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, fe && fe.active && fe.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, On.has(this) && (On.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || gs(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, Pr(this), ms(this);
      const t = Y, n = be;
      Y = this, be = true;
      try {
        return this.fn();
      } finally {
        bs(this), Y = t, be = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) or(t);
        this.deps = this.depsTail = void 0, Pr(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? On.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      jn(this) && this.run();
    }
    get dirty() {
      return jn(this);
    }
  }
  let _s = 0, Tt, Ct;
  function gs(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = Ct, Ct = e;
      return;
    }
    e.next = Tt, Tt = e;
  }
  function sr() {
    _s++;
  }
  function ir() {
    if (--_s > 0) return;
    if (Ct) {
      let t = Ct;
      for (Ct = void 0; t; ) {
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
  function ms(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function bs(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const s = r.prevDep;
      r.version === -1 ? (r === n && (n = s), or(r), Oi(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = s;
    }
    e.deps = t, e.depsTail = n;
  }
  function jn(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (vs(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function vs(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Vt) || (e.globalVersion = Vt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !jn(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = Y, r = be;
    Y = e, be = true;
    try {
      ms(e);
      const s = e.fn(e._value);
      (t.version === 0 || Ke(s, e._value)) && (e.flags |= 128, e._value = s, t.version++);
    } catch (s) {
      throw t.version++, s;
    } finally {
      Y = n, be = r, bs(e), e.flags &= -3;
    }
  }
  function or(e, t = false) {
    const { dep: n, prevSub: r, nextSub: s } = e;
    if (r && (r.nextSub = s, e.prevSub = void 0), s && (s.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
      n.computed.flags &= -5;
      for (let i = n.computed.deps; i; i = i.nextDep) or(i, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function Oi(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let be = true;
  const ys = [];
  function ze() {
    ys.push(be), be = false;
  }
  function Be() {
    const e = ys.pop();
    be = e === void 0 ? true : e;
  }
  function Pr(e) {
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
  let Vt = 0;
  class Ri {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class lr {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!Y || !be || Y === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== Y) n = this.activeLink = new Ri(Y, this), Y.deps ? (n.prevDep = Y.depsTail, Y.depsTail.nextDep = n, Y.depsTail = n) : Y.deps = Y.depsTail = n, xs(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = Y.depsTail, n.nextDep = void 0, Y.depsTail.nextDep = n, Y.depsTail = n, Y.deps === n && (Y.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, Vt++, this.notify(t);
    }
    notify(t) {
      sr();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        ir();
      }
    }
  }
  function xs(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let r = t.deps; r; r = r.nextDep) xs(r);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const $n = /* @__PURE__ */ new WeakMap(), tt = Symbol(""), Wn = Symbol(""), Ut = Symbol("");
  function ne(e, t, n) {
    if (be && Y) {
      let r = $n.get(e);
      r || $n.set(e, r = /* @__PURE__ */ new Map());
      let s = r.get(n);
      s || (r.set(n, s = new lr()), s.map = r, s.key = n), s.track();
    }
  }
  function De(e, t, n, r, s, i) {
    const o = $n.get(e);
    if (!o) {
      Vt++;
      return;
    }
    const l = (a) => {
      a && a.trigger();
    };
    if (sr(), t === "clear") o.forEach(l);
    else {
      const a = R(e), d = a && tr(n);
      if (a && n === "length") {
        const u = Number(r);
        o.forEach((p, T) => {
          (T === "length" || T === Ut || !Me(T) && T >= u) && l(p);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && l(o.get(n)), d && l(o.get(Ut)), t) {
        case "add":
          a ? d && l(o.get("length")) : (l(o.get(tt)), ct(e) && l(o.get(Wn)));
          break;
        case "delete":
          a || (l(o.get(tt)), ct(e) && l(o.get(Wn)));
          break;
        case "set":
          ct(e) && l(o.get(tt));
          break;
      }
    }
    ir();
  }
  function st(e) {
    const t = j(e);
    return t === e ? t : (ne(t, "iterate", Ut), ge(e) ? t : t.map(te));
  }
  function vn(e) {
    return ne(e = j(e), "iterate", Ut), e;
  }
  const Ai = {
    __proto__: null,
    [Symbol.iterator]() {
      return Rn(this, Symbol.iterator, te);
    },
    concat(...e) {
      return st(this).concat(...e.map((t) => R(t) ? st(t) : t));
    },
    entries() {
      return Rn(this, "entries", (e) => (e[1] = te(e[1]), e));
    },
    every(e, t) {
      return Ve(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return Ve(this, "filter", e, t, (n) => n.map(te), arguments);
    },
    find(e, t) {
      return Ve(this, "find", e, t, te, arguments);
    },
    findIndex(e, t) {
      return Ve(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return Ve(this, "findLast", e, t, te, arguments);
    },
    findLastIndex(e, t) {
      return Ve(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return Ve(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return An(this, "includes", e);
    },
    indexOf(...e) {
      return An(this, "indexOf", e);
    },
    join(e) {
      return st(this).join(e);
    },
    lastIndexOf(...e) {
      return An(this, "lastIndexOf", e);
    },
    map(e, t) {
      return Ve(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return bt(this, "pop");
    },
    push(...e) {
      return bt(this, "push", e);
    },
    reduce(e, ...t) {
      return Mr(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return Mr(this, "reduceRight", e, t);
    },
    shift() {
      return bt(this, "shift");
    },
    some(e, t) {
      return Ve(this, "some", e, t, void 0, arguments);
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
      return Rn(this, "values", te);
    }
  };
  function Rn(e, t, n) {
    const r = vn(e), s = r[t]();
    return r !== e && !ge(e) && (s._next = s.next, s.next = () => {
      const i = s._next();
      return i.value && (i.value = n(i.value)), i;
    }), s;
  }
  const Ii = Array.prototype;
  function Ve(e, t, n, r, s, i) {
    const o = vn(e), l = o !== e && !ge(e), a = o[t];
    if (a !== Ii[t]) {
      const p = a.apply(e, i);
      return l ? te(p) : p;
    }
    let d = n;
    o !== e && (l ? d = function(p, T) {
      return n.call(this, te(p), T, e);
    } : n.length > 2 && (d = function(p, T) {
      return n.call(this, p, T, e);
    }));
    const u = a.call(o, d, r);
    return l && s ? s(u) : u;
  }
  function Mr(e, t, n, r) {
    const s = vn(e);
    let i = n;
    return s !== e && (ge(e) ? n.length > 3 && (i = function(o, l, a) {
      return n.call(this, o, l, a, e);
    }) : i = function(o, l, a) {
      return n.call(this, o, te(l), a, e);
    }), s[t](i, ...r);
  }
  function An(e, t, n) {
    const r = j(e);
    ne(r, "iterate", Ut);
    const s = r[t](...n);
    return (s === -1 || s === false) && ur(n[0]) ? (n[0] = j(n[0]), r[t](...n)) : s;
  }
  function bt(e, t, n = []) {
    ze(), sr();
    const r = j(e)[t].apply(e, n);
    return ir(), Be(), r;
  }
  const Fi = Qn("__proto__,__v_isRef,__isVue"), ws = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(Me));
  function Vi(e) {
    Me(e) || (e = String(e));
    const t = j(this);
    return ne(t, "has", e), t.hasOwnProperty(e);
  }
  class Ss {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const s = this._isReadonly, i = this._isShallow;
      if (n === "__v_isReactive") return !s;
      if (n === "__v_isReadonly") return s;
      if (n === "__v_isShallow") return i;
      if (n === "__v_raw") return r === (s ? i ? Wi : Ps : i ? Es : Cs).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const o = R(t);
      if (!s) {
        let a;
        if (o && (a = Ai[n])) return a;
        if (n === "hasOwnProperty") return Vi;
      }
      const l = Reflect.get(t, n, re(t) ? t : r);
      return (Me(n) ? ws.has(n) : Fi(n)) || (s || ne(t, "get", n), i) ? l : re(l) ? o && tr(n) ? l : l.value : J(l) ? s ? Ms(l) : ar(l) : l;
    }
  }
  class Ts extends Ss {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, s) {
      let i = t[n];
      if (!this._isShallow) {
        const a = Ye(i);
        if (!ge(r) && !Ye(r) && (i = j(i), r = j(r)), !R(t) && re(i) && !re(r)) return a ? false : (i.value = r, true);
      }
      const o = R(t) && tr(n) ? Number(n) < t.length : $(t, n), l = Reflect.set(t, n, r, re(t) ? t : s);
      return t === j(s) && (o ? Ke(r, i) && De(t, "set", n, r) : De(t, "add", n, r)), l;
    }
    deleteProperty(t, n) {
      const r = $(t, n);
      t[n];
      const s = Reflect.deleteProperty(t, n);
      return s && r && De(t, "delete", n, void 0), s;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!Me(n) || !ws.has(n)) && ne(t, "has", n), r;
    }
    ownKeys(t) {
      return ne(t, "iterate", R(t) ? "length" : tt), Reflect.ownKeys(t);
    }
  }
  class Ui extends Ss {
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
  const Di = new Ts(), Li = new Ui(), Ni = new Ts(true);
  const Gn = (e) => e, Wt = (e) => Reflect.getPrototypeOf(e);
  function zi(e, t, n) {
    return function(...r) {
      const s = this.__v_raw, i = j(s), o = ct(i), l = e === "entries" || e === Symbol.iterator && o, a = e === "keys" && o, d = s[e](...r), u = n ? Gn : t ? on : te;
      return !t && ne(i, "iterate", a ? Wn : tt), {
        next() {
          const { value: p, done: T } = d.next();
          return T ? {
            value: p,
            done: T
          } : {
            value: l ? [
              u(p[0]),
              u(p[1])
            ] : u(p),
            done: T
          };
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    };
  }
  function Gt(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function Bi(e, t) {
    const n = {
      get(s) {
        const i = this.__v_raw, o = j(i), l = j(s);
        e || (Ke(s, l) && ne(o, "get", s), ne(o, "get", l));
        const { has: a } = Wt(o), d = t ? Gn : e ? on : te;
        if (a.call(o, s)) return d(i.get(s));
        if (a.call(o, l)) return d(i.get(l));
        i !== o && i.get(s);
      },
      get size() {
        const s = this.__v_raw;
        return !e && ne(j(s), "iterate", tt), Reflect.get(s, "size", s);
      },
      has(s) {
        const i = this.__v_raw, o = j(i), l = j(s);
        return e || (Ke(s, l) && ne(o, "has", s), ne(o, "has", l)), s === l ? i.has(s) : i.has(s) || i.has(l);
      },
      forEach(s, i) {
        const o = this, l = o.__v_raw, a = j(l), d = t ? Gn : e ? on : te;
        return !e && ne(a, "iterate", tt), l.forEach((u, p) => s.call(i, d(u), d(p), o));
      }
    };
    return se(n, e ? {
      add: Gt("add"),
      set: Gt("set"),
      delete: Gt("delete"),
      clear: Gt("clear")
    } : {
      add(s) {
        !t && !ge(s) && !Ye(s) && (s = j(s));
        const i = j(this);
        return Wt(i).has.call(i, s) || (i.add(s), De(i, "add", s, s)), this;
      },
      set(s, i) {
        !t && !ge(i) && !Ye(i) && (i = j(i));
        const o = j(this), { has: l, get: a } = Wt(o);
        let d = l.call(o, s);
        d || (s = j(s), d = l.call(o, s));
        const u = a.call(o, s);
        return o.set(s, i), d ? Ke(i, u) && De(o, "set", s, i) : De(o, "add", s, i), this;
      },
      delete(s) {
        const i = j(this), { has: o, get: l } = Wt(i);
        let a = o.call(i, s);
        a || (s = j(s), a = o.call(i, s)), l && l.call(i, s);
        const d = i.delete(s);
        return a && De(i, "delete", s, void 0), d;
      },
      clear() {
        const s = j(this), i = s.size !== 0, o = s.clear();
        return i && De(s, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((s) => {
      n[s] = zi(s, e, t);
    }), n;
  }
  function cr(e, t) {
    const n = Bi(e, t);
    return (r, s, i) => s === "__v_isReactive" ? !e : s === "__v_isReadonly" ? e : s === "__v_raw" ? r : Reflect.get($(n, s) && s in r ? n : r, s, i);
  }
  const Hi = {
    get: cr(false, false)
  }, ji = {
    get: cr(false, true)
  }, $i = {
    get: cr(true, false)
  };
  const Cs = /* @__PURE__ */ new WeakMap(), Es = /* @__PURE__ */ new WeakMap(), Ps = /* @__PURE__ */ new WeakMap(), Wi = /* @__PURE__ */ new WeakMap();
  function Gi(e) {
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
  function Ki(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Gi(gi(e));
  }
  function ar(e) {
    return Ye(e) ? e : fr(e, false, Di, Hi, Cs);
  }
  function qi(e) {
    return fr(e, false, Ni, ji, Es);
  }
  function Ms(e) {
    return fr(e, true, Li, $i, Ps);
  }
  function fr(e, t, n, r, s) {
    if (!J(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const i = Ki(e);
    if (i === 0) return e;
    const o = s.get(e);
    if (o) return o;
    const l = new Proxy(e, i === 2 ? r : n);
    return s.set(e, l), l;
  }
  function at(e) {
    return Ye(e) ? at(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function Ye(e) {
    return !!(e && e.__v_isReadonly);
  }
  function ge(e) {
    return !!(e && e.__v_isShallow);
  }
  function ur(e) {
    return e ? !!e.__v_raw : false;
  }
  function j(e) {
    const t = e && e.__v_raw;
    return t ? j(t) : e;
  }
  function Yi(e) {
    return !$(e, "__v_skip") && Object.isExtensible(e) && Hn(e, "__v_skip", true), e;
  }
  const te = (e) => J(e) ? ar(e) : e, on = (e) => J(e) ? Ms(e) : e;
  function re(e) {
    return e ? e.__v_isRef === true : false;
  }
  function Et(e) {
    return ki(e, false);
  }
  function ki(e, t) {
    return re(e) ? e : new Ji(e, t);
  }
  class Ji {
    constructor(t, n) {
      this.dep = new lr(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : j(t), this._value = n ? t : te(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || ge(t) || Ye(t);
      t = r ? t : j(t), Ke(t, n) && (this._rawValue = t, this._value = r ? t : te(t), this.dep.trigger());
    }
  }
  function Xi(e) {
    return re(e) ? e.value : e;
  }
  const Qi = {
    get: (e, t, n) => t === "__v_raw" ? e : Xi(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const s = e[t];
      return re(s) && !re(n) ? (s.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function Os(e) {
    return at(e) ? e : new Proxy(e, Qi);
  }
  class Zi {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new lr(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Vt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && Y !== this) return gs(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return vs(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function eo(e, t, n = false) {
    let r, s;
    return F(e) ? r = e : (r = e.get, s = e.set), new Zi(r, s, n);
  }
  const Kt = {}, ln = /* @__PURE__ */ new WeakMap();
  let Qe;
  function to(e, t = false, n = Qe) {
    if (n) {
      let r = ln.get(n);
      r || ln.set(n, r = []), r.push(e);
    }
  }
  function no(e, t, n = K) {
    const { immediate: r, deep: s, once: i, scheduler: o, augmentJob: l, call: a } = n, d = (M) => s ? M : ge(M) || s === false || s === 0 ? Le(M, 1) : Le(M);
    let u, p, T, C, U = false, D = false;
    if (re(e) ? (p = () => e.value, U = ge(e)) : at(e) ? (p = () => d(e), U = true) : R(e) ? (D = true, U = e.some((M) => at(M) || ge(M)), p = () => e.map((M) => {
      if (re(M)) return M.value;
      if (at(M)) return d(M);
      if (F(M)) return a ? a(M, 2) : M();
    })) : F(e) ? t ? p = a ? () => a(e, 2) : e : p = () => {
      if (T) {
        ze();
        try {
          T();
        } finally {
          Be();
        }
      }
      const M = Qe;
      Qe = u;
      try {
        return a ? a(e, 3, [
          C
        ]) : e(C);
      } finally {
        Qe = M;
      }
    } : p = Pe, t && s) {
      const M = p, O = s === true ? 1 / 0 : s;
      p = () => Le(M(), O);
    }
    const B = Mi(), x = () => {
      u.stop(), B && B.active && er(B.effects, u);
    };
    if (i && t) {
      const M = t;
      t = (...O) => {
        M(...O), x();
      };
    }
    let I = D ? new Array(e.length).fill(Kt) : Kt;
    const X = (M) => {
      if (!(!(u.flags & 1) || !u.dirty && !M)) if (t) {
        const O = u.run();
        if (s || U || (D ? O.some((H, Q) => Ke(H, I[Q])) : Ke(O, I))) {
          T && T();
          const H = Qe;
          Qe = u;
          try {
            const Q = [
              O,
              I === Kt ? void 0 : D && I[0] === Kt ? [] : I,
              C
            ];
            I = O, a ? a(t, 3, Q) : t(...Q);
          } finally {
            Qe = H;
          }
        }
      } else u.run();
    };
    return l && l(X), u = new ps(p), u.scheduler = o ? () => o(X, false) : X, C = (M) => to(M, false, u), T = u.onStop = () => {
      const M = ln.get(u);
      if (M) {
        if (a) a(M, 4);
        else for (const O of M) O();
        ln.delete(u);
      }
    }, t ? r ? X(true) : I = u.run() : o ? o(X.bind(null, true), true) : u.run(), x.pause = u.pause.bind(u), x.resume = u.resume.bind(u), x.stop = x, x;
  }
  function Le(e, t = 1 / 0, n) {
    if (t <= 0 || !J(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
    if (n.add(e), t--, re(e)) Le(e.value, t, n);
    else if (R(e)) for (let r = 0; r < e.length; r++) Le(e[r], t, n);
    else if (_n(e) || ct(e)) e.forEach((r) => {
      Le(r, t, n);
    });
    else if (as(e)) {
      for (const r in e) Le(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && Le(e[r], t, n);
    }
    return e;
  }
  function Bt(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (s) {
      yn(s, t, n);
    }
  }
  function Oe(e, t, n, r) {
    if (F(e)) {
      const s = Bt(e, t, n, r);
      return s && ls(s) && s.catch((i) => {
        yn(i, t, n);
      }), s;
    }
    if (R(e)) {
      const s = [];
      for (let i = 0; i < e.length; i++) s.push(Oe(e[i], t, n, r));
      return s;
    }
  }
  function yn(e, t, n, r = true) {
    const s = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: o } = t && t.appContext.config || K;
    if (t) {
      let l = t.parent;
      const a = t.proxy, d = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; l; ) {
        const u = l.ec;
        if (u) {
          for (let p = 0; p < u.length; p++) if (u[p](e, a, d) === false) return;
        }
        l = l.parent;
      }
      if (i) {
        ze(), Bt(i, null, 10, [
          e,
          a,
          d
        ]), Be();
        return;
      }
    }
    ro(e, n, s, r, o);
  }
  function ro(e, t, n, r = true, s = false) {
    if (s) throw e;
    console.error(e);
  }
  const oe = [];
  let Te = -1;
  const ft = [];
  let We = null, ot = 0;
  const Rs = Promise.resolve();
  let cn = null;
  function As(e) {
    const t = cn || Rs;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function so(e) {
    let t = Te + 1, n = oe.length;
    for (; t < n; ) {
      const r = t + n >>> 1, s = oe[r], i = Dt(s);
      i < e || i === e && s.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function dr(e) {
    if (!(e.flags & 1)) {
      const t = Dt(e), n = oe[oe.length - 1];
      !n || !(e.flags & 2) && t >= Dt(n) ? oe.push(e) : oe.splice(so(t), 0, e), e.flags |= 1, Is();
    }
  }
  function Is() {
    cn || (cn = Rs.then(Vs));
  }
  function io(e) {
    R(e) ? ft.push(...e) : We && e.id === -1 ? We.splice(ot + 1, 0, e) : e.flags & 1 || (ft.push(e), e.flags |= 1), Is();
  }
  function Or(e, t, n = Te + 1) {
    for (; n < oe.length; n++) {
      const r = oe[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        oe.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function Fs(e) {
    if (ft.length) {
      const t = [
        ...new Set(ft)
      ].sort((n, r) => Dt(n) - Dt(r));
      if (ft.length = 0, We) {
        We.push(...t);
        return;
      }
      for (We = t, ot = 0; ot < We.length; ot++) {
        const n = We[ot];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      We = null, ot = 0;
    }
  }
  const Dt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function Vs(e) {
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
      Te = -1, oe.length = 0, Fs(), cn = null, (oe.length || ft.length) && Vs();
    }
  }
  let _e = null, Us = null;
  function an(e) {
    const t = _e;
    return _e = e, Us = e && e.type.__scopeId || null, t;
  }
  function oo(e, t = _e, n) {
    if (!t || e._n) return e;
    const r = (...s) => {
      r._d && Nr(-1);
      const i = an(t);
      let o;
      try {
        o = e(...s);
      } finally {
        an(i), r._d && Nr(1);
      }
      return o;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function qt(e, t) {
    if (_e === null) return e;
    const n = Cn(_e), r = e.dirs || (e.dirs = []);
    for (let s = 0; s < t.length; s++) {
      let [i, o, l, a = K] = t[s];
      i && (F(i) && (i = {
        mounted: i,
        updated: i
      }), i.deep && Le(o), r.push({
        dir: i,
        instance: n,
        value: o,
        oldValue: void 0,
        arg: l,
        modifiers: a
      }));
    }
    return e;
  }
  function Je(e, t, n, r) {
    const s = e.dirs, i = t && t.dirs;
    for (let o = 0; o < s.length; o++) {
      const l = s[o];
      i && (l.oldValue = i[o].value);
      let a = l.dir[r];
      a && (ze(), Oe(a, n, 8, [
        e.el,
        l,
        e,
        t
      ]), Be());
    }
  }
  const lo = Symbol("_vte"), co = (e) => e.__isTeleport;
  function hr(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, hr(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function pr(e, t) {
    return F(e) ? se({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function Ds(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function Pt(e, t, n, r, s = false) {
    if (R(e)) {
      e.forEach((U, D) => Pt(U, t && (R(t) ? t[D] : t), n, r, s));
      return;
    }
    if (Mt(r) && !s) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Pt(e, t, n, r.component.subTree);
      return;
    }
    const i = r.shapeFlag & 4 ? Cn(r.component) : r.el, o = s ? null : i, { i: l, r: a } = e, d = t && t.r, u = l.refs === K ? l.refs = {} : l.refs, p = l.setupState, T = j(p), C = p === K ? () => false : (U) => $(T, U);
    if (d != null && d !== a && (Z(d) ? (u[d] = null, C(d) && (p[d] = null)) : re(d) && (d.value = null)), F(a)) Bt(a, l, 12, [
      o,
      u
    ]);
    else {
      const U = Z(a), D = re(a);
      if (U || D) {
        const B = () => {
          if (e.f) {
            const x = U ? C(a) ? p[a] : u[a] : a.value;
            s ? R(x) && er(x, i) : R(x) ? x.includes(i) || x.push(i) : U ? (u[a] = [
              i
            ], C(a) && (p[a] = u[a])) : (a.value = [
              i
            ], e.k && (u[e.k] = a.value));
          } else U ? (u[a] = o, C(a) && (p[a] = o)) : D && (a.value = o, e.k && (u[e.k] = o));
        };
        o ? (B.id = -1, he(B, n)) : B();
      }
    }
  }
  mn().requestIdleCallback;
  mn().cancelIdleCallback;
  const Mt = (e) => !!e.type.__asyncLoader, Ls = (e) => e.type.__isKeepAlive;
  function ao(e, t) {
    Ns(e, "a", t);
  }
  function fo(e, t) {
    Ns(e, "da", t);
  }
  function Ns(e, t, n = le) {
    const r = e.__wdc || (e.__wdc = () => {
      let s = n;
      for (; s; ) {
        if (s.isDeactivated) return;
        s = s.parent;
      }
      return e();
    });
    if (xn(t, r, n), n) {
      let s = n.parent;
      for (; s && s.parent; ) Ls(s.parent.vnode) && uo(r, t, n, s), s = s.parent;
    }
  }
  function uo(e, t, n, r) {
    const s = xn(t, e, r, true);
    _r(() => {
      er(r[t], s);
    }, n);
  }
  function xn(e, t, n = le, r = false) {
    if (n) {
      const s = n[e] || (n[e] = []), i = t.__weh || (t.__weh = (...o) => {
        ze();
        const l = Ht(n), a = Oe(t, n, e, o);
        return l(), Be(), a;
      });
      return r ? s.unshift(i) : s.push(i), i;
    }
  }
  const He = (e) => (t, n = le) => {
    (!Nt || e === "sp") && xn(e, (...r) => t(...r), n);
  }, ho = He("bm"), wn = He("m"), po = He("bu"), _o = He("u"), go = He("bum"), _r = He("um"), mo = He("sp"), bo = He("rtg"), vo = He("rtc");
  function yo(e, t = le) {
    xn("ec", e, t);
  }
  const xo = Symbol.for("v-ndc");
  function wo(e, t, n, r) {
    let s;
    const i = n, o = R(e);
    if (o || Z(e)) {
      const l = o && at(e);
      let a = false, d = false;
      l && (a = !ge(e), d = Ye(e), e = vn(e)), s = new Array(e.length);
      for (let u = 0, p = e.length; u < p; u++) s[u] = t(a ? d ? on(te(e[u])) : te(e[u]) : e[u], u, void 0, i);
    } else if (typeof e == "number") {
      s = new Array(e);
      for (let l = 0; l < e; l++) s[l] = t(l + 1, l, void 0, i);
    } else if (J(e)) if (e[Symbol.iterator]) s = Array.from(e, (l, a) => t(l, a, void 0, i));
    else {
      const l = Object.keys(e);
      s = new Array(l.length);
      for (let a = 0, d = l.length; a < d; a++) {
        const u = l[a];
        s[a] = t(e[u], u, a, i);
      }
    }
    else s = [];
    return s;
  }
  const Kn = (e) => e ? si(e) ? Cn(e) : Kn(e.parent) : null, Ot = se(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => Kn(e.parent),
    $root: (e) => Kn(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Bs(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      dr(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = As.bind(e.proxy)),
    $watch: (e) => Wo.bind(e)
  }), In = (e, t) => e !== K && !e.__isScriptSetup && $(e, t), So = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: r, data: s, props: i, accessCache: o, type: l, appContext: a } = e;
      let d;
      if (t[0] !== "$") {
        const C = o[t];
        if (C !== void 0) switch (C) {
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
          if (In(r, t)) return o[t] = 1, r[t];
          if (s !== K && $(s, t)) return o[t] = 2, s[t];
          if ((d = e.propsOptions[0]) && $(d, t)) return o[t] = 3, i[t];
          if (n !== K && $(n, t)) return o[t] = 4, n[t];
          qn && (o[t] = 0);
        }
      }
      const u = Ot[t];
      let p, T;
      if (u) return t === "$attrs" && ne(e.attrs, "get", ""), u(e);
      if ((p = l.__cssModules) && (p = p[t])) return p;
      if (n !== K && $(n, t)) return o[t] = 4, n[t];
      if (T = a.config.globalProperties, $(T, t)) return T[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: s, ctx: i } = e;
      return In(s, t) ? (s[t] = n, true) : r !== K && $(r, t) ? (r[t] = n, true) : $(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (i[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: s, propsOptions: i } }, o) {
      let l;
      return !!n[o] || e !== K && $(e, o) || In(t, o) || (l = i[0]) && $(l, o) || $(r, o) || $(Ot, o) || $(s.config.globalProperties, o);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : $(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function Rr(e) {
    return R(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  let qn = true;
  function To(e) {
    const t = Bs(e), n = e.proxy, r = e.ctx;
    qn = false, t.beforeCreate && Ar(t.beforeCreate, e, "bc");
    const { data: s, computed: i, methods: o, watch: l, provide: a, inject: d, created: u, beforeMount: p, mounted: T, beforeUpdate: C, updated: U, activated: D, deactivated: B, beforeDestroy: x, beforeUnmount: I, destroyed: X, unmounted: M, render: O, renderTracked: H, renderTriggered: Q, errorCaptured: ue, serverPrefetch: Re, expose: me, inheritAttrs: Ae, components: je, directives: $e, filters: Ie } = t;
    if (d && Co(d, r, null), o) for (const k in o) {
      const G = o[k];
      F(G) && (r[k] = G.bind(n));
    }
    if (s) {
      const k = s.call(n, n);
      J(k) && (e.data = ar(k));
    }
    if (qn = true, i) for (const k in i) {
      const G = i[k], Fe = F(G) ? G.bind(n, n) : F(G.get) ? G.get.bind(n, n) : Pe, jt = !F(G) && F(G.set) ? G.set.bind(n) : Pe, ke = Ze({
        get: Fe,
        set: jt
      });
      Object.defineProperty(r, k, {
        enumerable: true,
        configurable: true,
        get: () => ke.value,
        set: (ve) => ke.value = ve
      });
    }
    if (l) for (const k in l) zs(l[k], r, n, k);
    if (a) {
      const k = F(a) ? a.call(n) : a;
      Reflect.ownKeys(k).forEach((G) => {
        Ao(G, k[G]);
      });
    }
    u && Ar(u, e, "c");
    function ee(k, G) {
      R(G) ? G.forEach((Fe) => k(Fe.bind(n))) : G && k(G.bind(n));
    }
    if (ee(ho, p), ee(wn, T), ee(po, C), ee(_o, U), ee(ao, D), ee(fo, B), ee(yo, ue), ee(vo, H), ee(bo, Q), ee(go, I), ee(_r, M), ee(mo, Re), R(me)) if (me.length) {
      const k = e.exposed || (e.exposed = {});
      me.forEach((G) => {
        Object.defineProperty(k, G, {
          get: () => n[G],
          set: (Fe) => n[G] = Fe,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    O && e.render === Pe && (e.render = O), Ae != null && (e.inheritAttrs = Ae), je && (e.components = je), $e && (e.directives = $e), Re && Ds(e);
  }
  function Co(e, t, n = Pe) {
    R(e) && (e = Yn(e));
    for (const r in e) {
      const s = e[r];
      let i;
      J(s) ? "default" in s ? i = Qt(s.from || r, s.default, true) : i = Qt(s.from || r) : i = Qt(s), re(i) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => i.value,
        set: (o) => i.value = o
      }) : t[r] = i;
    }
  }
  function Ar(e, t, n) {
    Oe(R(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function zs(e, t, n, r) {
    let s = r.includes(".") ? Zs(n, r) : () => n[r];
    if (Z(e)) {
      const i = t[e];
      F(i) && Vn(s, i);
    } else if (F(e)) Vn(s, e.bind(n));
    else if (J(e)) if (R(e)) e.forEach((i) => zs(i, t, n, r));
    else {
      const i = F(e.handler) ? e.handler.bind(n) : t[e.handler];
      F(i) && Vn(s, i, e);
    }
  }
  function Bs(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: s, optionsCache: i, config: { optionMergeStrategies: o } } = e.appContext, l = i.get(t);
    let a;
    return l ? a = l : !s.length && !n && !r ? a = t : (a = {}, s.length && s.forEach((d) => fn(a, d, o, true)), fn(a, t, o)), J(t) && i.set(t, a), a;
  }
  function fn(e, t, n, r = false) {
    const { mixins: s, extends: i } = t;
    i && fn(e, i, n, true), s && s.forEach((o) => fn(e, o, n, true));
    for (const o in t) if (!(r && o === "expose")) {
      const l = Eo[o] || n && n[o];
      e[o] = l ? l(e[o], t[o]) : t[o];
    }
    return e;
  }
  const Eo = {
    data: Ir,
    props: Fr,
    emits: Fr,
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
    watch: Mo,
    provide: Ir,
    inject: Po
  };
  function Ir(e, t) {
    return t ? e ? function() {
      return se(F(e) ? e.call(this, this) : e, F(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function Po(e, t) {
    return xt(Yn(e), Yn(t));
  }
  function Yn(e) {
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
    return e ? se(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function Fr(e, t) {
    return e ? R(e) && R(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : se(/* @__PURE__ */ Object.create(null), Rr(e), Rr(t ?? {})) : t;
  }
  function Mo(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = se(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = ie(e[r], t[r]);
    return n;
  }
  function Hs() {
    return {
      app: null,
      config: {
        isNativeTag: pi,
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
  let Oo = 0;
  function Ro(e, t) {
    return function(r, s = null) {
      F(r) || (r = se({}, r)), s != null && !J(s) && (s = null);
      const i = Hs(), o = /* @__PURE__ */ new WeakSet(), l = [];
      let a = false;
      const d = i.app = {
        _uid: Oo++,
        _component: r,
        _props: s,
        _container: null,
        _context: i,
        _instance: null,
        version: dl,
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
        mount(u, p, T) {
          if (!a) {
            const C = d._ceVNode || Ne(r, s);
            return C.appContext = i, T === true ? T = "svg" : T === false && (T = void 0), e(C, u, T), a = true, d._container = u, u.__vue_app__ = d, Cn(C.component);
          }
        },
        onUnmount(u) {
          l.push(u);
        },
        unmount() {
          a && (Oe(l, d._instance, 16), e(null, d._container), delete d._container.__vue_app__);
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
  function Ao(e, t) {
    if (le) {
      let n = le.provides;
      const r = le.parent && le.parent.provides;
      r === n && (n = le.provides = Object.create(r)), n[e] = t;
    }
  }
  function Qt(e, t, n = false) {
    const r = ol();
    if (r || ut) {
      let s = ut ? ut._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (s && e in s) return s[e];
      if (arguments.length > 1) return n && F(t) ? t.call(r && r.proxy) : t;
    }
  }
  const js = {}, $s = () => Object.create(js), Ws = (e) => Object.getPrototypeOf(e) === js;
  function Io(e, t, n, r = false) {
    const s = {}, i = $s();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Gs(e, t, s, i);
    for (const o in e.propsOptions[0]) o in s || (s[o] = void 0);
    n ? e.props = r ? s : qi(s) : e.type.props ? e.props = s : e.props = i, e.attrs = i;
  }
  function Fo(e, t, n, r) {
    const { props: s, attrs: i, vnode: { patchFlag: o } } = e, l = j(s), [a] = e.propsOptions;
    let d = false;
    if ((r || o > 0) && !(o & 16)) {
      if (o & 8) {
        const u = e.vnode.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          let T = u[p];
          if (Sn(e.emitsOptions, T)) continue;
          const C = t[T];
          if (a) if ($(i, T)) C !== i[T] && (i[T] = C, d = true);
          else {
            const U = qe(T);
            s[U] = kn(a, l, U, C, e, false);
          }
          else C !== i[T] && (i[T] = C, d = true);
        }
      }
    } else {
      Gs(e, t, s, i) && (d = true);
      let u;
      for (const p in l) (!t || !$(t, p) && ((u = nt(p)) === p || !$(t, u))) && (a ? n && (n[p] !== void 0 || n[u] !== void 0) && (s[p] = kn(a, l, p, void 0, e, true)) : delete s[p]);
      if (i !== l) for (const p in i) (!t || !$(t, p)) && (delete i[p], d = true);
    }
    d && De(e.attrs, "set", "");
  }
  function Gs(e, t, n, r) {
    const [s, i] = e.propsOptions;
    let o = false, l;
    if (t) for (let a in t) {
      if (St(a)) continue;
      const d = t[a];
      let u;
      s && $(s, u = qe(a)) ? !i || !i.includes(u) ? n[u] = d : (l || (l = {}))[u] = d : Sn(e.emitsOptions, a) || (!(a in r) || d !== r[a]) && (r[a] = d, o = true);
    }
    if (i) {
      const a = j(n), d = l || K;
      for (let u = 0; u < i.length; u++) {
        const p = i[u];
        n[p] = kn(s, a, p, d[p], e, !$(d, p));
      }
    }
    return o;
  }
  function kn(e, t, n, r, s, i) {
    const o = e[n];
    if (o != null) {
      const l = $(o, "default");
      if (l && r === void 0) {
        const a = o.default;
        if (o.type !== Function && !o.skipFactory && F(a)) {
          const { propsDefaults: d } = s;
          if (n in d) r = d[n];
          else {
            const u = Ht(s);
            r = d[n] = a.call(null, t), u();
          }
        } else r = a;
        s.ce && s.ce._setProp(n, r);
      }
      o[0] && (i && !l ? r = false : o[1] && (r === "" || r === nt(n)) && (r = true));
    }
    return r;
  }
  const Vo = /* @__PURE__ */ new WeakMap();
  function Ks(e, t, n = false) {
    const r = n ? Vo : t.propsCache, s = r.get(e);
    if (s) return s;
    const i = e.props, o = {}, l = [];
    let a = false;
    if (!F(e)) {
      const u = (p) => {
        a = true;
        const [T, C] = Ks(p, t, true);
        se(o, T), C && l.push(...C);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!i && !a) return J(e) && r.set(e, lt), lt;
    if (R(i)) for (let u = 0; u < i.length; u++) {
      const p = qe(i[u]);
      Vr(p) && (o[p] = K);
    }
    else if (i) for (const u in i) {
      const p = qe(u);
      if (Vr(p)) {
        const T = i[u], C = o[p] = R(T) || F(T) ? {
          type: T
        } : se({}, T), U = C.type;
        let D = false, B = true;
        if (R(U)) for (let x = 0; x < U.length; ++x) {
          const I = U[x], X = F(I) && I.name;
          if (X === "Boolean") {
            D = true;
            break;
          } else X === "String" && (B = false);
        }
        else D = F(U) && U.name === "Boolean";
        C[0] = D, C[1] = B, (D || $(C, "default")) && l.push(p);
      }
    }
    const d = [
      o,
      l
    ];
    return J(e) && r.set(e, d), d;
  }
  function Vr(e) {
    return e[0] !== "$" && !St(e);
  }
  const gr = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", mr = (e) => R(e) ? e.map(Ee) : [
    Ee(e)
  ], Uo = (e, t, n) => {
    if (t._n) return t;
    const r = oo((...s) => mr(t(...s)), n);
    return r._c = false, r;
  }, qs = (e, t, n) => {
    const r = e._ctx;
    for (const s in e) {
      if (gr(s)) continue;
      const i = e[s];
      if (F(i)) t[s] = Uo(s, i, r);
      else if (i != null) {
        const o = mr(i);
        t[s] = () => o;
      }
    }
  }, Ys = (e, t) => {
    const n = mr(t);
    e.slots.default = () => n;
  }, ks = (e, t, n) => {
    for (const r in t) (n || !gr(r)) && (e[r] = t[r]);
  }, Do = (e, t, n) => {
    const r = e.slots = $s();
    if (e.vnode.shapeFlag & 32) {
      const s = t.__;
      s && Hn(r, "__", s, true);
      const i = t._;
      i ? (ks(r, t, n), n && Hn(r, "_", i, true)) : qs(t, r);
    } else t && Ys(e, t);
  }, Lo = (e, t, n) => {
    const { vnode: r, slots: s } = e;
    let i = true, o = K;
    if (r.shapeFlag & 32) {
      const l = t._;
      l ? n && l === 1 ? i = false : ks(s, t, n) : (i = !t.$stable, qs(t, s)), o = t;
    } else t && (Ys(e, t), o = {
      default: 1
    });
    if (i) for (const l in s) !gr(l) && o[l] == null && delete s[l];
  }, he = Xo;
  function No(e) {
    return zo(e);
  }
  function zo(e, t) {
    const n = mn();
    n.__VUE__ = true;
    const { insert: r, remove: s, patchProp: i, createElement: o, createText: l, createComment: a, setText: d, setElementText: u, parentNode: p, nextSibling: T, setScopeId: C = Pe, insertStaticContent: U } = e, D = (c, f, h, m = null, _ = null, g = null, w = void 0, y = null, v = !!f.dynamicChildren) => {
      if (c === f) return;
      c && !vt(c, f) && (m = $t(c), ve(c, _, g, true), c = null), f.patchFlag === -2 && (v = false, f.dynamicChildren = null);
      const { type: b, ref: P, shapeFlag: S } = f;
      switch (b) {
        case Tn:
          B(c, f, h, m);
          break;
        case ht:
          x(c, f, h, m);
          break;
        case Un:
          c == null && I(f, h, m, w);
          break;
        case Ce:
          je(c, f, h, m, _, g, w, y, v);
          break;
        default:
          S & 1 ? O(c, f, h, m, _, g, w, y, v) : S & 6 ? $e(c, f, h, m, _, g, w, y, v) : (S & 64 || S & 128) && b.process(c, f, h, m, _, g, w, y, v, gt);
      }
      P != null && _ ? Pt(P, c && c.ref, g, f || c, !f) : P == null && c && c.ref != null && Pt(c.ref, null, g, c, true);
    }, B = (c, f, h, m) => {
      if (c == null) r(f.el = l(f.children), h, m);
      else {
        const _ = f.el = c.el;
        f.children !== c.children && d(_, f.children);
      }
    }, x = (c, f, h, m) => {
      c == null ? r(f.el = a(f.children || ""), h, m) : f.el = c.el;
    }, I = (c, f, h, m) => {
      [c.el, c.anchor] = U(c.children, f, h, m, c.el, c.anchor);
    }, X = ({ el: c, anchor: f }, h, m) => {
      let _;
      for (; c && c !== f; ) _ = T(c), r(c, h, m), c = _;
      r(f, h, m);
    }, M = ({ el: c, anchor: f }) => {
      let h;
      for (; c && c !== f; ) h = T(c), s(c), c = h;
      s(f);
    }, O = (c, f, h, m, _, g, w, y, v) => {
      f.type === "svg" ? w = "svg" : f.type === "math" && (w = "mathml"), c == null ? H(f, h, m, _, g, w, y, v) : Re(c, f, _, g, w, y, v);
    }, H = (c, f, h, m, _, g, w, y) => {
      let v, b;
      const { props: P, shapeFlag: S, transition: E, dirs: A } = c;
      if (v = c.el = o(c.type, g, P && P.is, P), S & 8 ? u(v, c.children) : S & 16 && ue(c.children, v, null, m, _, Fn(c, g), w, y), A && Je(c, null, m, "created"), Q(v, c, c.scopeId, w, m), P) {
        for (const q in P) q !== "value" && !St(q) && i(v, q, null, P[q], g, m);
        "value" in P && i(v, "value", null, P.value, g), (b = P.onVnodeBeforeMount) && Se(b, m, c);
      }
      A && Je(c, null, m, "beforeMount");
      const z = Bo(_, E);
      z && E.beforeEnter(v), r(v, f, h), ((b = P && P.onVnodeMounted) || z || A) && he(() => {
        b && Se(b, m, c), z && E.enter(v), A && Je(c, null, m, "mounted");
      }, _);
    }, Q = (c, f, h, m, _) => {
      if (h && C(c, h), m) for (let g = 0; g < m.length; g++) C(c, m[g]);
      if (_) {
        let g = _.subTree;
        if (f === g || ti(g.type) && (g.ssContent === f || g.ssFallback === f)) {
          const w = _.vnode;
          Q(c, w, w.scopeId, w.slotScopeIds, _.parent);
        }
      }
    }, ue = (c, f, h, m, _, g, w, y, v = 0) => {
      for (let b = v; b < c.length; b++) {
        const P = c[b] = y ? Ge(c[b]) : Ee(c[b]);
        D(null, P, f, h, m, _, g, w, y);
      }
    }, Re = (c, f, h, m, _, g, w) => {
      const y = f.el = c.el;
      let { patchFlag: v, dynamicChildren: b, dirs: P } = f;
      v |= c.patchFlag & 16;
      const S = c.props || K, E = f.props || K;
      let A;
      if (h && Xe(h, false), (A = E.onVnodeBeforeUpdate) && Se(A, h, f, c), P && Je(f, c, h, "beforeUpdate"), h && Xe(h, true), (S.innerHTML && E.innerHTML == null || S.textContent && E.textContent == null) && u(y, ""), b ? me(c.dynamicChildren, b, y, h, m, Fn(f, _), g) : w || G(c, f, y, null, h, m, Fn(f, _), g, false), v > 0) {
        if (v & 16) Ae(y, S, E, h, _);
        else if (v & 2 && S.class !== E.class && i(y, "class", null, E.class, _), v & 4 && i(y, "style", S.style, E.style, _), v & 8) {
          const z = f.dynamicProps;
          for (let q = 0; q < z.length; q++) {
            const W = z[q], ce = S[W], ae = E[W];
            (ae !== ce || W === "value") && i(y, W, ce, ae, _, h);
          }
        }
        v & 1 && c.children !== f.children && u(y, f.children);
      } else !w && b == null && Ae(y, S, E, h, _);
      ((A = E.onVnodeUpdated) || P) && he(() => {
        A && Se(A, h, f, c), P && Je(f, c, h, "updated");
      }, m);
    }, me = (c, f, h, m, _, g, w) => {
      for (let y = 0; y < f.length; y++) {
        const v = c[y], b = f[y], P = v.el && (v.type === Ce || !vt(v, b) || v.shapeFlag & 198) ? p(v.el) : h;
        D(v, b, P, null, m, _, g, w, true);
      }
    }, Ae = (c, f, h, m, _) => {
      if (f !== h) {
        if (f !== K) for (const g in f) !St(g) && !(g in h) && i(c, g, f[g], null, _, m);
        for (const g in h) {
          if (St(g)) continue;
          const w = h[g], y = f[g];
          w !== y && g !== "value" && i(c, g, y, w, _, m);
        }
        "value" in h && i(c, "value", f.value, h.value, _);
      }
    }, je = (c, f, h, m, _, g, w, y, v) => {
      const b = f.el = c ? c.el : l(""), P = f.anchor = c ? c.anchor : l("");
      let { patchFlag: S, dynamicChildren: E, slotScopeIds: A } = f;
      A && (y = y ? y.concat(A) : A), c == null ? (r(b, h, m), r(P, h, m), ue(f.children || [], h, P, _, g, w, y, v)) : S > 0 && S & 64 && E && c.dynamicChildren ? (me(c.dynamicChildren, E, h, _, g, w, y), (f.key != null || _ && f === _.subTree) && Js(c, f, true)) : G(c, f, h, P, _, g, w, y, v);
    }, $e = (c, f, h, m, _, g, w, y, v) => {
      f.slotScopeIds = y, c == null ? f.shapeFlag & 512 ? _.ctx.activate(f, h, m, w, v) : Ie(f, h, m, _, g, w, v) : rt(c, f, v);
    }, Ie = (c, f, h, m, _, g, w) => {
      const y = c.component = il(c, m, _);
      if (Ls(c) && (y.ctx.renderer = gt), ll(y, false, w), y.asyncDep) {
        if (_ && _.registerDep(y, ee, w), !c.el) {
          const v = y.subTree = Ne(ht);
          x(null, v, f, h), c.placeholder = v.el;
        }
      } else ee(y, c, f, h, _, g, w);
    }, rt = (c, f, h) => {
      const m = f.component = c.component;
      if (ko(c, f, h)) if (m.asyncDep && !m.asyncResolved) {
        k(m, f, h);
        return;
      } else m.next = f, m.update();
      else f.el = c.el, m.vnode = f;
    }, ee = (c, f, h, m, _, g, w) => {
      const y = () => {
        if (c.isMounted) {
          let { next: S, bu: E, u: A, parent: z, vnode: q } = c;
          {
            const xe = Xs(c);
            if (xe) {
              S && (S.el = q.el, k(c, S, w)), xe.asyncDep.then(() => {
                c.isUnmounted || y();
              });
              return;
            }
          }
          let W = S, ce;
          Xe(c, false), S ? (S.el = q.el, k(c, S, w)) : S = q, E && Xt(E), (ce = S.props && S.props.onVnodeBeforeUpdate) && Se(ce, z, S, q), Xe(c, true);
          const ae = Dr(c), ye = c.subTree;
          c.subTree = ae, D(ye, ae, p(ye.el), $t(ye), c, _, g), S.el = ae.el, W === null && Jo(c, ae.el), A && he(A, _), (ce = S.props && S.props.onVnodeUpdated) && he(() => Se(ce, z, S, q), _);
        } else {
          let S;
          const { el: E, props: A } = f, { bm: z, m: q, parent: W, root: ce, type: ae } = c, ye = Mt(f);
          Xe(c, false), z && Xt(z), !ye && (S = A && A.onVnodeBeforeMount) && Se(S, W, f), Xe(c, true);
          {
            ce.ce && ce.ce._def.shadowRoot !== false && ce.ce._injectChildStyle(ae);
            const xe = c.subTree = Dr(c);
            D(null, xe, h, m, c, _, g), f.el = xe.el;
          }
          if (q && he(q, _), !ye && (S = A && A.onVnodeMounted)) {
            const xe = f;
            he(() => Se(S, W, xe), _);
          }
          (f.shapeFlag & 256 || W && Mt(W.vnode) && W.vnode.shapeFlag & 256) && c.a && he(c.a, _), c.isMounted = true, f = h = m = null;
        }
      };
      c.scope.on();
      const v = c.effect = new ps(y);
      c.scope.off();
      const b = c.update = v.run.bind(v), P = c.job = v.runIfDirty.bind(v);
      P.i = c, P.id = c.uid, v.scheduler = () => dr(P), Xe(c, true), b();
    }, k = (c, f, h) => {
      f.component = c;
      const m = c.vnode.props;
      c.vnode = f, c.next = null, Fo(c, f.props, m, h), Lo(c, f.children, h), ze(), Or(c), Be();
    }, G = (c, f, h, m, _, g, w, y, v = false) => {
      const b = c && c.children, P = c ? c.shapeFlag : 0, S = f.children, { patchFlag: E, shapeFlag: A } = f;
      if (E > 0) {
        if (E & 128) {
          jt(b, S, h, m, _, g, w, y, v);
          return;
        } else if (E & 256) {
          Fe(b, S, h, m, _, g, w, y, v);
          return;
        }
      }
      A & 8 ? (P & 16 && _t(b, _, g), S !== b && u(h, S)) : P & 16 ? A & 16 ? jt(b, S, h, m, _, g, w, y, v) : _t(b, _, g, true) : (P & 8 && u(h, ""), A & 16 && ue(S, h, m, _, g, w, y, v));
    }, Fe = (c, f, h, m, _, g, w, y, v) => {
      c = c || lt, f = f || lt;
      const b = c.length, P = f.length, S = Math.min(b, P);
      let E;
      for (E = 0; E < S; E++) {
        const A = f[E] = v ? Ge(f[E]) : Ee(f[E]);
        D(c[E], A, h, null, _, g, w, y, v);
      }
      b > P ? _t(c, _, g, true, false, S) : ue(f, h, m, _, g, w, y, v, S);
    }, jt = (c, f, h, m, _, g, w, y, v) => {
      let b = 0;
      const P = f.length;
      let S = c.length - 1, E = P - 1;
      for (; b <= S && b <= E; ) {
        const A = c[b], z = f[b] = v ? Ge(f[b]) : Ee(f[b]);
        if (vt(A, z)) D(A, z, h, null, _, g, w, y, v);
        else break;
        b++;
      }
      for (; b <= S && b <= E; ) {
        const A = c[S], z = f[E] = v ? Ge(f[E]) : Ee(f[E]);
        if (vt(A, z)) D(A, z, h, null, _, g, w, y, v);
        else break;
        S--, E--;
      }
      if (b > S) {
        if (b <= E) {
          const A = E + 1, z = A < P ? f[A].el : m;
          for (; b <= E; ) D(null, f[b] = v ? Ge(f[b]) : Ee(f[b]), h, z, _, g, w, y, v), b++;
        }
      } else if (b > E) for (; b <= S; ) ve(c[b], _, g, true), b++;
      else {
        const A = b, z = b, q = /* @__PURE__ */ new Map();
        for (b = z; b <= E; b++) {
          const de = f[b] = v ? Ge(f[b]) : Ee(f[b]);
          de.key != null && q.set(de.key, b);
        }
        let W, ce = 0;
        const ae = E - z + 1;
        let ye = false, xe = 0;
        const mt = new Array(ae);
        for (b = 0; b < ae; b++) mt[b] = 0;
        for (b = A; b <= S; b++) {
          const de = c[b];
          if (ce >= ae) {
            ve(de, _, g, true);
            continue;
          }
          let we;
          if (de.key != null) we = q.get(de.key);
          else for (W = z; W <= E; W++) if (mt[W - z] === 0 && vt(de, f[W])) {
            we = W;
            break;
          }
          we === void 0 ? ve(de, _, g, true) : (mt[we - z] = b + 1, we >= xe ? xe = we : ye = true, D(de, f[we], h, null, _, g, w, y, v), ce++);
        }
        const wr = ye ? Ho(mt) : lt;
        for (W = wr.length - 1, b = ae - 1; b >= 0; b--) {
          const de = z + b, we = f[de], Sr = f[de + 1], Tr = de + 1 < P ? Sr.el || Sr.placeholder : m;
          mt[b] === 0 ? D(null, we, h, Tr, _, g, w, y, v) : ye && (W < 0 || b !== wr[W] ? ke(we, h, Tr, 2) : W--);
        }
      }
    }, ke = (c, f, h, m, _ = null) => {
      const { el: g, type: w, transition: y, children: v, shapeFlag: b } = c;
      if (b & 6) {
        ke(c.component.subTree, f, h, m);
        return;
      }
      if (b & 128) {
        c.suspense.move(f, h, m);
        return;
      }
      if (b & 64) {
        w.move(c, f, h, gt);
        return;
      }
      if (w === Ce) {
        r(g, f, h);
        for (let S = 0; S < v.length; S++) ke(v[S], f, h, m);
        r(c.anchor, f, h);
        return;
      }
      if (w === Un) {
        X(c, f, h);
        return;
      }
      if (m !== 2 && b & 1 && y) if (m === 0) y.beforeEnter(g), r(g, f, h), he(() => y.enter(g), _);
      else {
        const { leave: S, delayLeave: E, afterLeave: A } = y, z = () => {
          c.ctx.isUnmounted ? s(g) : r(g, f, h);
        }, q = () => {
          S(g, () => {
            z(), A && A();
          });
        };
        E ? E(g, z, q) : q();
      }
      else r(g, f, h);
    }, ve = (c, f, h, m = false, _ = false) => {
      const { type: g, props: w, ref: y, children: v, dynamicChildren: b, shapeFlag: P, patchFlag: S, dirs: E, cacheIndex: A } = c;
      if (S === -2 && (_ = false), y != null && (ze(), Pt(y, null, h, c, true), Be()), A != null && (f.renderCache[A] = void 0), P & 256) {
        f.ctx.deactivate(c);
        return;
      }
      const z = P & 1 && E, q = !Mt(c);
      let W;
      if (q && (W = w && w.onVnodeBeforeUnmount) && Se(W, f, c), P & 6) hi(c.component, h, m);
      else {
        if (P & 128) {
          c.suspense.unmount(h, m);
          return;
        }
        z && Je(c, null, f, "beforeUnmount"), P & 64 ? c.type.remove(c, f, h, gt, m) : b && !b.hasOnce && (g !== Ce || S > 0 && S & 64) ? _t(b, f, h, false, true) : (g === Ce && S & 384 || !_ && P & 16) && _t(v, f, h), m && yr(c);
      }
      (q && (W = w && w.onVnodeUnmounted) || z) && he(() => {
        W && Se(W, f, c), z && Je(c, null, f, "unmounted");
      }, h);
    }, yr = (c) => {
      const { type: f, el: h, anchor: m, transition: _ } = c;
      if (f === Ce) {
        di(h, m);
        return;
      }
      if (f === Un) {
        M(c);
        return;
      }
      const g = () => {
        s(h), _ && !_.persisted && _.afterLeave && _.afterLeave();
      };
      if (c.shapeFlag & 1 && _ && !_.persisted) {
        const { leave: w, delayLeave: y } = _, v = () => w(h, g);
        y ? y(c.el, g, v) : v();
      } else g();
    }, di = (c, f) => {
      let h;
      for (; c !== f; ) h = T(c), s(c), c = h;
      s(f);
    }, hi = (c, f, h) => {
      const { bum: m, scope: _, job: g, subTree: w, um: y, m: v, a: b, parent: P, slots: { __: S } } = c;
      Ur(v), Ur(b), m && Xt(m), P && R(S) && S.forEach((E) => {
        P.renderCache[E] = void 0;
      }), _.stop(), g && (g.flags |= 8, ve(w, c, f, h)), y && he(y, f), he(() => {
        c.isUnmounted = true;
      }, f), f && f.pendingBranch && !f.isUnmounted && c.asyncDep && !c.asyncResolved && c.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
    }, _t = (c, f, h, m = false, _ = false, g = 0) => {
      for (let w = g; w < c.length; w++) ve(c[w], f, h, m, _);
    }, $t = (c) => {
      if (c.shapeFlag & 6) return $t(c.component.subTree);
      if (c.shapeFlag & 128) return c.suspense.next();
      const f = T(c.anchor || c.el), h = f && f[lo];
      return h ? T(h) : f;
    };
    let En = false;
    const xr = (c, f, h) => {
      c == null ? f._vnode && ve(f._vnode, null, null, true) : D(f._vnode || null, c, f, null, null, null, h), f._vnode = c, En || (En = true, Or(), Fs(), En = false);
    }, gt = {
      p: D,
      um: ve,
      m: ke,
      r: yr,
      mt: Ie,
      mc: ue,
      pc: G,
      pbc: me,
      n: $t,
      o: e
    };
    return {
      render: xr,
      hydrate: void 0,
      createApp: Ro(xr)
    };
  }
  function Fn({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function Xe({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function Bo(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function Js(e, t, n = false) {
    const r = e.children, s = t.children;
    if (R(r) && R(s)) for (let i = 0; i < r.length; i++) {
      const o = r[i];
      let l = s[i];
      l.shapeFlag & 1 && !l.dynamicChildren && ((l.patchFlag <= 0 || l.patchFlag === 32) && (l = s[i] = Ge(s[i]), l.el = o.el), !n && l.patchFlag !== -2 && Js(o, l)), l.type === Tn && (l.el = o.el), l.type === ht && !l.el && (l.el = o.el);
    }
  }
  function Ho(e) {
    const t = e.slice(), n = [
      0
    ];
    let r, s, i, o, l;
    const a = e.length;
    for (r = 0; r < a; r++) {
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
  function Xs(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : Xs(t);
  }
  function Ur(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  const jo = Symbol.for("v-scx"), $o = () => Qt(jo);
  function Vn(e, t, n) {
    return Qs(e, t, n);
  }
  function Qs(e, t, n = K) {
    const { immediate: r, deep: s, flush: i, once: o } = n, l = se({}, n), a = t && r || !t && i !== "post";
    let d;
    if (Nt) {
      if (i === "sync") {
        const C = $o();
        d = C.__watcherHandles || (C.__watcherHandles = []);
      } else if (!a) {
        const C = () => {
        };
        return C.stop = Pe, C.resume = Pe, C.pause = Pe, C;
      }
    }
    const u = le;
    l.call = (C, U, D) => Oe(C, u, U, D);
    let p = false;
    i === "post" ? l.scheduler = (C) => {
      he(C, u && u.suspense);
    } : i !== "sync" && (p = true, l.scheduler = (C, U) => {
      U ? C() : dr(C);
    }), l.augmentJob = (C) => {
      t && (C.flags |= 4), p && (C.flags |= 2, u && (C.id = u.uid, C.i = u));
    };
    const T = no(e, t, l);
    return Nt && (d ? d.push(T) : a && T()), T;
  }
  function Wo(e, t, n) {
    const r = this.proxy, s = Z(e) ? e.includes(".") ? Zs(r, e) : () => r[e] : e.bind(r, r);
    let i;
    F(t) ? i = t : (i = t.handler, n = t);
    const o = Ht(this), l = Qs(s, i.bind(r), n);
    return o(), l;
  }
  function Zs(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let s = 0; s < n.length && r; s++) r = r[n[s]];
      return r;
    };
  }
  const Go = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${qe(t)}Modifiers`] || e[`${nt(t)}Modifiers`];
  function Ko(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || K;
    let s = n;
    const i = t.startsWith("update:"), o = i && Go(r, t.slice(7));
    o && (o.trim && (s = n.map((u) => Z(u) ? u.trim() : u)), o.number && (s = n.map(sn)));
    let l, a = r[l = Pn(t)] || r[l = Pn(qe(t))];
    !a && i && (a = r[l = Pn(nt(t))]), a && Oe(a, e, 6, s);
    const d = r[l + "Once"];
    if (d) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[l]) return;
      e.emitted[l] = true, Oe(d, e, 6, s);
    }
  }
  function ei(e, t, n = false) {
    const r = t.emitsCache, s = r.get(e);
    if (s !== void 0) return s;
    const i = e.emits;
    let o = {}, l = false;
    if (!F(e)) {
      const a = (d) => {
        const u = ei(d, t, true);
        u && (l = true, se(o, u));
      };
      !n && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
    }
    return !i && !l ? (J(e) && r.set(e, null), null) : (R(i) ? i.forEach((a) => o[a] = null) : se(o, i), J(e) && r.set(e, o), o);
  }
  function Sn(e, t) {
    return !e || !pn(t) ? false : (t = t.slice(2).replace(/Once$/, ""), $(e, t[0].toLowerCase() + t.slice(1)) || $(e, nt(t)) || $(e, t));
  }
  function Dr(e) {
    const { type: t, vnode: n, proxy: r, withProxy: s, propsOptions: [i], slots: o, attrs: l, emit: a, render: d, renderCache: u, props: p, data: T, setupState: C, ctx: U, inheritAttrs: D } = e, B = an(e);
    let x, I;
    try {
      if (n.shapeFlag & 4) {
        const M = s || r, O = M;
        x = Ee(d.call(O, M, u, p, C, T, U)), I = l;
      } else {
        const M = t;
        x = Ee(M.length > 1 ? M(p, {
          attrs: l,
          slots: o,
          emit: a
        }) : M(p, null)), I = t.props ? l : qo(l);
      }
    } catch (M) {
      Rt.length = 0, yn(M, e, 1), x = Ne(ht);
    }
    let X = x;
    if (I && D !== false) {
      const M = Object.keys(I), { shapeFlag: O } = X;
      M.length && O & 7 && (i && M.some(Zn) && (I = Yo(I, i)), X = pt(X, I, false, true));
    }
    return n.dirs && (X = pt(X, null, false, true), X.dirs = X.dirs ? X.dirs.concat(n.dirs) : n.dirs), n.transition && hr(X, n.transition), x = X, an(B), x;
  }
  const qo = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || pn(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Yo = (e, t) => {
    const n = {};
    for (const r in e) (!Zn(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function ko(e, t, n) {
    const { props: r, children: s, component: i } = e, { props: o, children: l, patchFlag: a } = t, d = i.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && a >= 0) {
      if (a & 1024) return true;
      if (a & 16) return r ? Lr(r, o, d) : !!o;
      if (a & 8) {
        const u = t.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          const T = u[p];
          if (o[T] !== r[T] && !Sn(d, T)) return true;
        }
      }
    } else return (s || l) && (!l || !l.$stable) ? true : r === o ? false : r ? o ? Lr(r, o, d) : true : !!o;
    return false;
  }
  function Lr(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let s = 0; s < r.length; s++) {
      const i = r[s];
      if (t[i] !== e[i] && !Sn(n, i)) return true;
    }
    return false;
  }
  function Jo({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const ti = (e) => e.__isSuspense;
  function Xo(e, t) {
    t && t.pendingBranch ? R(e) ? t.effects.push(...e) : t.effects.push(e) : io(e);
  }
  const Ce = Symbol.for("v-fgt"), Tn = Symbol.for("v-txt"), ht = Symbol.for("v-cmt"), Un = Symbol.for("v-stc"), Rt = [];
  let pe = null;
  function At(e = false) {
    Rt.push(pe = e ? null : []);
  }
  function Qo() {
    Rt.pop(), pe = Rt[Rt.length - 1] || null;
  }
  let Lt = 1;
  function Nr(e, t = false) {
    Lt += e, e < 0 && pe && t && (pe.hasOnce = true);
  }
  function Zo(e) {
    return e.dynamicChildren = Lt > 0 ? pe || lt : null, Qo(), Lt > 0 && pe && pe.push(e), e;
  }
  function It(e, t, n, r, s, i) {
    return Zo(L(e, t, n, r, s, i, true));
  }
  function ni(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function vt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const ri = ({ key: e }) => e ?? null, Zt = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? Z(e) || re(e) || F(e) ? {
    i: _e,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function L(e, t = null, n = null, r = 0, s = null, i = e === Ce ? 0 : 1, o = false, l = false) {
    const a = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && ri(t),
      ref: t && Zt(t),
      scopeId: Us,
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
      ctx: _e
    };
    return l ? (br(a, n), i & 128 && e.normalize(a)) : n && (a.shapeFlag |= Z(n) ? 8 : 16), Lt > 0 && !o && pe && (a.patchFlag > 0 || i & 6) && a.patchFlag !== 32 && pe.push(a), a;
  }
  const Ne = el;
  function el(e, t = null, n = null, r = 0, s = null, i = false) {
    if ((!e || e === xo) && (e = ht), ni(e)) {
      const l = pt(e, t, true);
      return n && br(l, n), Lt > 0 && !i && pe && (l.shapeFlag & 6 ? pe[pe.indexOf(e)] = l : pe.push(l)), l.patchFlag = -2, l;
    }
    if (ul(e) && (e = e.__vccOpts), t) {
      t = tl(t);
      let { class: l, style: a } = t;
      l && !Z(l) && (t.class = rr(l)), J(a) && (ur(a) && !R(a) && (a = se({}, a)), t.style = nr(a));
    }
    const o = Z(e) ? 1 : ti(e) ? 128 : co(e) ? 64 : J(e) ? 4 : F(e) ? 2 : 0;
    return L(e, t, n, r, s, o, i, true);
  }
  function tl(e) {
    return e ? ur(e) || Ws(e) ? se({}, e) : e : null;
  }
  function pt(e, t, n = false, r = false) {
    const { props: s, ref: i, patchFlag: o, children: l, transition: a } = e, d = t ? nl(s || {}, t) : s, u = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: d,
      key: d && ri(d),
      ref: t && t.ref ? n && i ? R(i) ? i.concat(Zt(t)) : [
        i,
        Zt(t)
      ] : Zt(t) : i,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: l,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== Ce ? o === -1 ? 16 : o | 16 : o,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: a,
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
    return a && r && hr(u, a.clone(u)), u;
  }
  function wt(e = " ", t = 0) {
    return Ne(Tn, null, e, t);
  }
  function Ee(e) {
    return e == null || typeof e == "boolean" ? Ne(ht) : R(e) ? Ne(Ce, null, e.slice()) : ni(e) ? Ge(e) : Ne(Tn, null, String(e));
  }
  function Ge(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : pt(e);
  }
  function br(e, t) {
    let n = 0;
    const { shapeFlag: r } = e;
    if (t == null) t = null;
    else if (R(t)) n = 16;
    else if (typeof t == "object") if (r & 65) {
      const s = t.default;
      s && (s._c && (s._d = false), br(e, s()), s._c && (s._d = true));
      return;
    } else {
      n = 32;
      const s = t._;
      !s && !Ws(t) ? t._ctx = _e : s === 3 && _e && (_e.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else F(t) ? (t = {
      default: t,
      _ctx: _e
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      wt(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function nl(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const s in r) if (s === "class") t.class !== r.class && (t.class = rr([
        t.class,
        r.class
      ]));
      else if (s === "style") t.style = nr([
        t.style,
        r.style
      ]);
      else if (pn(s)) {
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
  const rl = Hs();
  let sl = 0;
  function il(e, t, n) {
    const r = e.type, s = (t ? t.appContext : e.appContext) || rl, i = {
      uid: sl++,
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
      scope: new Pi(true),
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
      propsOptions: Ks(r, s),
      emitsOptions: ei(r, s),
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
    }, i.root = t ? t.root : i, i.emit = Ko.bind(null, i), e.ce && e.ce(i), i;
  }
  let le = null;
  const ol = () => le || _e;
  let un, Jn;
  {
    const e = mn(), t = (n, r) => {
      let s;
      return (s = e[n]) || (s = e[n] = []), s.push(r), (i) => {
        s.length > 1 ? s.forEach((o) => o(i)) : s[0](i);
      };
    };
    un = t("__VUE_INSTANCE_SETTERS__", (n) => le = n), Jn = t("__VUE_SSR_SETTERS__", (n) => Nt = n);
  }
  const Ht = (e) => {
    const t = le;
    return un(e), e.scope.on(), () => {
      e.scope.off(), un(t);
    };
  }, zr = () => {
    le && le.scope.off(), un(null);
  };
  function si(e) {
    return e.vnode.shapeFlag & 4;
  }
  let Nt = false;
  function ll(e, t = false, n = false) {
    t && Jn(t);
    const { props: r, children: s } = e.vnode, i = si(e);
    Io(e, r, i, t), Do(e, s, n || t);
    const o = i ? cl(e, t) : void 0;
    return t && Jn(false), o;
  }
  function cl(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, So);
    const { setup: r } = n;
    if (r) {
      ze();
      const s = e.setupContext = r.length > 1 ? fl(e) : null, i = Ht(e), o = Bt(r, e, 0, [
        e.props,
        s
      ]), l = ls(o);
      if (Be(), i(), (l || e.sp) && !Mt(e) && Ds(e), l) {
        if (o.then(zr, zr), t) return o.then((a) => {
          Br(e, a);
        }).catch((a) => {
          yn(a, e, 0);
        });
        e.asyncDep = o;
      } else Br(e, o);
    } else ii(e);
  }
  function Br(e, t, n) {
    F(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : J(t) && (e.setupState = Os(t)), ii(e);
  }
  function ii(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || Pe);
    {
      const s = Ht(e);
      ze();
      try {
        To(e);
      } finally {
        Be(), s();
      }
    }
  }
  const al = {
    get(e, t) {
      return ne(e, "get", ""), e[t];
    }
  };
  function fl(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, al),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function Cn(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Os(Yi(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in Ot) return Ot[n](e);
      },
      has(t, n) {
        return n in t || n in Ot;
      }
    })) : e.proxy;
  }
  function ul(e) {
    return F(e) && "__vccOpts" in e;
  }
  const Ze = (e, t) => eo(e, t, Nt), dl = "3.5.18";
  let Xn;
  const Hr = typeof window < "u" && window.trustedTypes;
  if (Hr) try {
    Xn = Hr.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const oi = Xn ? (e) => Xn.createHTML(e) : (e) => e, hl = "http://www.w3.org/2000/svg", pl = "http://www.w3.org/1998/Math/MathML", Ue = typeof document < "u" ? document : null, jr = Ue && Ue.createElement("template"), _l = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const s = t === "svg" ? Ue.createElementNS(hl, e) : t === "mathml" ? Ue.createElementNS(pl, e) : n ? Ue.createElement(e, {
        is: n
      }) : Ue.createElement(e);
      return e === "select" && r && r.multiple != null && s.setAttribute("multiple", r.multiple), s;
    },
    createText: (e) => Ue.createTextNode(e),
    createComment: (e) => Ue.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => Ue.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, r, s, i) {
      const o = n ? n.previousSibling : t.lastChild;
      if (s && (s === i || s.nextSibling)) for (; t.insertBefore(s.cloneNode(true), n), !(s === i || !(s = s.nextSibling)); ) ;
      else {
        jr.innerHTML = oi(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const l = jr.content;
        if (r === "svg" || r === "mathml") {
          const a = l.firstChild;
          for (; a.firstChild; ) l.appendChild(a.firstChild);
          l.removeChild(a);
        }
        t.insertBefore(l, n);
      }
      return [
        o ? o.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild
      ];
    }
  }, gl = Symbol("_vtc");
  function ml(e, t, n) {
    const r = e[gl];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const $r = Symbol("_vod"), bl = Symbol("_vsh"), vl = Symbol(""), yl = /(^|;)\s*display\s*:/;
  function xl(e, t, n) {
    const r = e.style, s = Z(n);
    let i = false;
    if (n && !s) {
      if (t) if (Z(t)) for (const o of t.split(";")) {
        const l = o.slice(0, o.indexOf(":")).trim();
        n[l] == null && en(r, l, "");
      }
      else for (const o in t) n[o] == null && en(r, o, "");
      for (const o in n) o === "display" && (i = true), en(r, o, n[o]);
    } else if (s) {
      if (t !== n) {
        const o = r[vl];
        o && (n += ";" + o), r.cssText = n, i = yl.test(n);
      }
    } else t && e.removeAttribute("style");
    $r in e && (e[$r] = i ? r.display : "", e[bl] && (r.display = "none"));
  }
  const Wr = /\s*!important$/;
  function en(e, t, n) {
    if (R(n)) n.forEach((r) => en(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = wl(e, t);
      Wr.test(n) ? e.setProperty(nt(r), n.replace(Wr, ""), "important") : e[r] = n;
    }
  }
  const Gr = [
    "Webkit",
    "Moz",
    "ms"
  ], Dn = {};
  function wl(e, t) {
    const n = Dn[t];
    if (n) return n;
    let r = qe(t);
    if (r !== "filter" && r in e) return Dn[t] = r;
    r = fs(r);
    for (let s = 0; s < Gr.length; s++) {
      const i = Gr[s] + r;
      if (i in e) return Dn[t] = i;
    }
    return t;
  }
  const Kr = "http://www.w3.org/1999/xlink";
  function qr(e, t, n, r, s, i = Ti(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Kr, t.slice(6, t.length)) : e.setAttributeNS(Kr, t, n) : n == null || i && !us(n) ? e.removeAttribute(t) : e.setAttribute(t, i ? "" : Me(n) ? String(n) : n);
  }
  function Yr(e, t, n, r, s) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? oi(n) : n);
      return;
    }
    const i = e.tagName;
    if (t === "value" && i !== "PROGRESS" && !i.includes("-")) {
      const l = i === "OPTION" ? e.getAttribute("value") || "" : e.value, a = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
      (l !== a || !("_value" in e)) && (e.value = a), n == null && e.removeAttribute(t), e._value = n;
      return;
    }
    let o = false;
    if (n === "" || n == null) {
      const l = typeof e[t];
      l === "boolean" ? n = us(n) : n == null && l === "string" ? (n = "", o = true) : l === "number" && (n = 0, o = true);
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
  function Sl(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const kr = Symbol("_vei");
  function Tl(e, t, n, r, s = null) {
    const i = e[kr] || (e[kr] = {}), o = i[t];
    if (r && o) o.value = r;
    else {
      const [l, a] = Cl(t);
      if (r) {
        const d = i[t] = Ml(r, s);
        et(e, l, d, a);
      } else o && (Sl(e, l, o, a), i[t] = void 0);
    }
  }
  const Jr = /(?:Once|Passive|Capture)$/;
  function Cl(e) {
    let t;
    if (Jr.test(e)) {
      t = {};
      let r;
      for (; r = e.match(Jr); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : nt(e.slice(2)),
      t
    ];
  }
  let Ln = 0;
  const El = Promise.resolve(), Pl = () => Ln || (El.then(() => Ln = 0), Ln = Date.now());
  function Ml(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Oe(Ol(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = Pl(), n;
  }
  function Ol(e, t) {
    if (R(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (s) => !s._stopped && r && r(s));
    } else return t;
  }
  const Xr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Rl = (e, t, n, r, s, i) => {
    const o = s === "svg";
    t === "class" ? ml(e, r, o) : t === "style" ? xl(e, n, r) : pn(t) ? Zn(t) || Tl(e, t, n, r, i) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Al(e, t, r, o)) ? (Yr(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && qr(e, t, r, o, i, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !Z(r)) ? Yr(e, qe(t), r, i, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), qr(e, t, r, o));
  };
  function Al(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Xr(t) && F(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const s = e.tagName;
      if (s === "IMG" || s === "VIDEO" || s === "CANVAS" || s === "SOURCE") return false;
    }
    return Xr(t) && Z(n) ? false : t in e;
  }
  const dn = (e) => {
    const t = e.props["onUpdate:modelValue"] || false;
    return R(t) ? (n) => Xt(t, n) : t;
  };
  function Il(e) {
    e.target.composing = true;
  }
  function Qr(e) {
    const t = e.target;
    t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
  }
  const dt = Symbol("_assign"), Nn = {
    created(e, { modifiers: { lazy: t, trim: n, number: r } }, s) {
      e[dt] = dn(s);
      const i = r || s.props && s.props.type === "number";
      et(e, t ? "change" : "input", (o) => {
        if (o.target.composing) return;
        let l = e.value;
        n && (l = l.trim()), i && (l = sn(l)), e[dt](l);
      }), n && et(e, "change", () => {
        e.value = e.value.trim();
      }), t || (et(e, "compositionstart", Il), et(e, "compositionend", Qr), et(e, "change", Qr));
    },
    mounted(e, { value: t }) {
      e.value = t ?? "";
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: s, number: i } }, o) {
      if (e[dt] = dn(o), e.composing) return;
      const l = (i || e.type === "number") && !/^0\d/.test(e.value) ? sn(e.value) : e.value, a = t ?? "";
      l !== a && (document.activeElement === e && e.type !== "range" && (r && t === n || s && e.value.trim() === a) || (e.value = a));
    }
  }, Fl = {
    deep: true,
    created(e, { value: t, modifiers: { number: n } }, r) {
      const s = _n(t);
      et(e, "change", () => {
        const i = Array.prototype.filter.call(e.options, (o) => o.selected).map((o) => n ? sn(hn(o)) : hn(o));
        e[dt](e.multiple ? s ? new Set(i) : i : i[0]), e._assigning = true, As(() => {
          e._assigning = false;
        });
      }), e[dt] = dn(r);
    },
    mounted(e, { value: t }) {
      Zr(e, t);
    },
    beforeUpdate(e, t, n) {
      e[dt] = dn(n);
    },
    updated(e, { value: t }) {
      e._assigning || Zr(e, t);
    }
  };
  function Zr(e, t) {
    const n = e.multiple, r = R(t);
    if (!(n && !r && !_n(t))) {
      for (let s = 0, i = e.options.length; s < i; s++) {
        const o = e.options[s], l = hn(o);
        if (n) if (r) {
          const a = typeof l;
          a === "string" || a === "number" ? o.selected = t.some((d) => String(d) === String(l)) : o.selected = Ei(t, l) > -1;
        } else o.selected = t.has(l);
        else if (bn(hn(o), t)) {
          e.selectedIndex !== s && (e.selectedIndex = s);
          return;
        }
      }
      !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
    }
  }
  function hn(e) {
    return "_value" in e ? e._value : e.value;
  }
  const Vl = se({
    patchProp: Rl
  }, _l);
  let es;
  function Ul() {
    return es || (es = No(Vl));
  }
  const Dl = (...e) => {
    const t = Ul().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const s = Nl(r);
      if (!s) return;
      const i = t._component;
      !F(i) && !i.render && !i.template && (i.template = s.innerHTML), s.nodeType === 1 && (s.textContent = "");
      const o = n(s, false, Ll(s));
      return s instanceof Element && (s.removeAttribute("v-cloak"), s.setAttribute("data-v-app", "")), o;
    }, t;
  };
  function Ll(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function Nl(e) {
    return Z(e) ? document.querySelector(e) : e;
  }
  const zl = `
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











`, Bl = `struct Uniforms {
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
}`, Hl = "" + new URL("mandelbrot_bg-LIUdqo67.wasm", import.meta.url).href, jl = async (e = {}, t) => {
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
  let V;
  function $l(e) {
    V = e;
  }
  let Yt = null;
  function tn() {
    return (Yt === null || Yt.byteLength === 0) && (Yt = new Uint8Array(V.memory.buffer)), Yt;
  }
  const li = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
  let nn = new li("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  nn.decode();
  const Wl = 2146435072;
  let zn = 0;
  function Gl(e, t) {
    return zn += t, zn >= Wl && (nn = new li("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), nn.decode(), zn = t), nn.decode(tn().subarray(e, e + t));
  }
  function ci(e, t) {
    return e = e >>> 0, Gl(e, t);
  }
  let kt = null;
  function Kl() {
    return (kt === null || kt.byteLength === 0) && (kt = new Float64Array(V.memory.buffer)), kt;
  }
  function ql(e, t) {
    return e = e >>> 0, Kl().subarray(e / 8, e / 8 + t);
  }
  let it = null;
  function Yl() {
    return (it === null || it.buffer.detached === true || it.buffer.detached === void 0 && it.buffer !== V.memory.buffer) && (it = new DataView(V.memory.buffer)), it;
  }
  function kl(e, t) {
    e = e >>> 0;
    const n = Yl(), r = [];
    for (let s = e; s < e + 4 * t; s += 4) r.push(V.__wbindgen_export_0.get(n.getUint32(s, true)));
    return V.__externref_drop_slice(e, t), r;
  }
  let Ft = 0;
  const Jl = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder, rn = new Jl("utf-8"), Xl = typeof rn.encodeInto == "function" ? function(e, t) {
    return rn.encodeInto(e, t);
  } : function(e, t) {
    const n = rn.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  };
  function Bn(e, t, n) {
    if (n === void 0) {
      const l = rn.encode(e), a = t(l.length, 1) >>> 0;
      return tn().subarray(a, a + l.length).set(l), Ft = l.length, a;
    }
    let r = e.length, s = t(r, 1) >>> 0;
    const i = tn();
    let o = 0;
    for (; o < r; o++) {
      const l = e.charCodeAt(o);
      if (l > 127) break;
      i[s + o] = l;
    }
    if (o !== r) {
      o !== 0 && (e = e.slice(o)), s = n(s, r, r = o + e.length * 3, 1) >>> 0;
      const l = tn().subarray(s + o, s + r), a = Xl(e, l);
      o += a.written, s = n(s, r, o, 1) >>> 0;
    }
    return Ft = o, s;
  }
  const ts = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => V.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  let Ql = class {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, ts.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      V.__wbg_mandelbrotnavigator_free(t, 0);
    }
    constructor(t, n, r, s, i) {
      const o = V.mandelbrotnavigator_new(t, n, r, s, i);
      return this.__wbg_ptr = o >>> 0, ts.register(this, this.__wbg_ptr, this), this;
    }
    translate(t, n) {
      V.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
    rotate(t) {
      V.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      V.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    rotate_direct(t) {
      V.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    zoom(t) {
      V.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    step() {
      const t = V.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = ql(t[0], t[1]).slice();
      return V.__wbindgen_free(t[0], t[1] * 8, 8), n;
    }
    get_params() {
      const t = V.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = kl(t[0], t[1]).slice();
      return V.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    compute_reference_orbit_ptr(t) {
      const n = V.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return vr.__wrap(n);
    }
    get_reference_orbit_len() {
      return V.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    get_reference_orbit_capacity() {
      return V.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    scale(t) {
      const n = Bn(t, V.__wbindgen_malloc, V.__wbindgen_realloc), r = Ft;
      V.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
    }
    angle(t) {
      V.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    origin(t, n) {
      const r = Bn(t, V.__wbindgen_malloc, V.__wbindgen_realloc), s = Ft, i = Bn(n, V.__wbindgen_malloc, V.__wbindgen_realloc), o = Ft;
      V.mandelbrotnavigator_origin(this.__wbg_ptr, r, s, i, o);
    }
  };
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => V.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const ns = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => V.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class vr {
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(vr.prototype);
      return n.__wbg_ptr = t, ns.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, ns.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      V.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      return V.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      V.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      return V.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      V.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      return V.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      V.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  function Zl(e) {
    console.debug(e);
  }
  function ec(e) {
    console.error(e);
  }
  function tc(e) {
    console.info(e);
  }
  function nc(e) {
    console.log(e);
  }
  function rc(e) {
    console.warn(e);
  }
  function sc() {
    const e = V.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  function ic(e, t) {
    return ci(e, t);
  }
  function oc(e, t) {
    throw new Error(ci(e, t));
  }
  URL = globalThis.URL;
  const N = await jl({
    "./mandelbrot_bg.js": {
      __wbindgen_string_new: ic,
      __wbg_debug_58d16ea352cfbca1: Zl,
      __wbg_error_51ecdd39ec054205: ec,
      __wbg_info_e56933705c348038: tc,
      __wbg_log_ea240990d83e374e: nc,
      __wbg_warn_d89f6637da554c8d: rc,
      __wbindgen_throw: oc,
      __wbindgen_init_externref_table: sc
    }
  }, Hl), ai = N.memory, lc = N.__wbg_mandelbrotstep_free, cc = N.__wbg_get_mandelbrotstep_zx, ac = N.__wbg_set_mandelbrotstep_zx, fc = N.__wbg_get_mandelbrotstep_zy, uc = N.__wbg_set_mandelbrotstep_zy, dc = N.__wbg_get_mandelbrotstep_dx, hc = N.__wbg_set_mandelbrotstep_dx, pc = N.__wbg_get_mandelbrotstep_dy, _c = N.__wbg_set_mandelbrotstep_dy, gc = N.__wbg_mandelbrotnavigator_free, mc = N.mandelbrotnavigator_new, bc = N.mandelbrotnavigator_translate, vc = N.mandelbrotnavigator_rotate, yc = N.mandelbrotnavigator_translate_direct, xc = N.mandelbrotnavigator_rotate_direct, wc = N.mandelbrotnavigator_zoom, Sc = N.mandelbrotnavigator_step, Tc = N.mandelbrotnavigator_get_params, Cc = N.mandelbrotnavigator_compute_reference_orbit_ptr, Ec = N.mandelbrotnavigator_get_reference_orbit_len, Pc = N.mandelbrotnavigator_get_reference_orbit_capacity, Mc = N.mandelbrotnavigator_scale, Oc = N.mandelbrotnavigator_angle, Rc = N.mandelbrotnavigator_origin, Ac = N.__wbg_orbitbufferinfo_free, Ic = N.__wbg_get_orbitbufferinfo_ptr, Fc = N.__wbg_set_orbitbufferinfo_ptr, Vc = N.__wbg_get_orbitbufferinfo_offset, Uc = N.__wbg_set_orbitbufferinfo_offset, Dc = N.__wbg_get_orbitbufferinfo_count, Lc = N.__wbg_set_orbitbufferinfo_count, Nc = N.__wbindgen_export_0, zc = N.__wbindgen_free, Bc = N.__externref_drop_slice, Hc = N.__wbindgen_malloc, jc = N.__wbindgen_realloc, fi = N.__wbindgen_start, $c = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: Bc,
    __wbg_get_mandelbrotstep_dx: dc,
    __wbg_get_mandelbrotstep_dy: pc,
    __wbg_get_mandelbrotstep_zx: cc,
    __wbg_get_mandelbrotstep_zy: fc,
    __wbg_get_orbitbufferinfo_count: Dc,
    __wbg_get_orbitbufferinfo_offset: Vc,
    __wbg_get_orbitbufferinfo_ptr: Ic,
    __wbg_mandelbrotnavigator_free: gc,
    __wbg_mandelbrotstep_free: lc,
    __wbg_orbitbufferinfo_free: Ac,
    __wbg_set_mandelbrotstep_dx: hc,
    __wbg_set_mandelbrotstep_dy: _c,
    __wbg_set_mandelbrotstep_zx: ac,
    __wbg_set_mandelbrotstep_zy: uc,
    __wbg_set_orbitbufferinfo_count: Lc,
    __wbg_set_orbitbufferinfo_offset: Uc,
    __wbg_set_orbitbufferinfo_ptr: Fc,
    __wbindgen_export_0: Nc,
    __wbindgen_free: zc,
    __wbindgen_malloc: Hc,
    __wbindgen_realloc: jc,
    __wbindgen_start: fi,
    mandelbrotnavigator_angle: Oc,
    mandelbrotnavigator_compute_reference_orbit_ptr: Cc,
    mandelbrotnavigator_get_params: Tc,
    mandelbrotnavigator_get_reference_orbit_capacity: Pc,
    mandelbrotnavigator_get_reference_orbit_len: Ec,
    mandelbrotnavigator_new: mc,
    mandelbrotnavigator_origin: Rc,
    mandelbrotnavigator_rotate: vc,
    mandelbrotnavigator_rotate_direct: xc,
    mandelbrotnavigator_scale: Mc,
    mandelbrotnavigator_step: Sc,
    mandelbrotnavigator_translate: bc,
    mandelbrotnavigator_translate_direct: yc,
    mandelbrotnavigator_zoom: wc,
    memory: ai
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  $l($c);
  fi();
  class Wc {
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
      this.canvas = t, this.shaderPass1 = zl, this.shaderPass2 = Bl, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
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
      let a = this.mandelbrotNavigator.compute_reference_orbit_ptr(l);
      const d = new Float32Array(ai.buffer, a.ptr, a.count * 4);
      a.offset < l && (console.log("Calcul de l'orbite de r\xE9f\xE9rence, nombre de points :", a.count, " maxIterations =", l, "offset =", a.offset, "length =", d.length / 4), this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, d, 0)), this.previousMandelbrot = t;
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
      var _a2, _b, _c2, _d;
      (_b = (_a2 = this.intermediateTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d = (_c2 = this.mandelbrotReferenceBuffer) == null ? void 0 : _c2.destroy) == null ? void 0 : _d.call(_c2);
    }
  }
  const Gc = {
    class: "panel compact-panel"
  }, Kc = {
    class: "panel-block compact-block"
  }, qc = {
    class: "math-display"
  }, Yc = [
    "innerHTML"
  ], kc = {
    class: "panel-block compact-block"
  }, Jc = {
    class: "math-display"
  }, Xc = [
    "innerHTML"
  ], Qc = {
    class: "math-display"
  }, Zc = [
    "innerHTML"
  ], ea = {
    class: "panel-block compact-block"
  }, ta = {
    class: "math-display"
  }, na = {
    class: "panel-block compact-block"
  }, ra = {
    class: "math-display"
  }, sa = {
    class: "panel-block compact-block"
  }, ia = {
    class: "math-display"
  }, oa = {
    class: "panel-block compact-block"
  }, la = {
    style: {
      display: "flex",
      "flex-direction": "column",
      gap: "0.3em"
    }
  }, ca = [
    "value"
  ], aa = {
    class: "panel-block compact-block"
  }, fa = {
    style: {
      display: "flex",
      gap: "0.5em",
      "align-items": "center"
    }
  }, rs = "mandelbrot_presets", ua = pr({
    __name: "Settings",
    props: {
      modelValue: {}
    },
    emits: [
      "load"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, s = Ze(() => (Number.parseFloat(n.modelValue.angle) * 180 / Math.PI).toFixed(2)), i = Ze(() => n.modelValue.scale), o = Ze(() => n.modelValue.cx), l = Ze(() => n.modelValue.cy), a = Et(""), d = Et([]), u = Et("");
      function p() {
        if (!a.value.trim()) return;
        const B = {
          name: a.value.trim(),
          cx: n.modelValue.cx,
          cy: n.modelValue.cy,
          scale: n.modelValue.scale,
          angle: n.modelValue.angle
        }, x = d.value.findIndex((I) => I.name === B.name);
        x >= 0 ? d.value[x] = B : d.value.push(B), localStorage.setItem(rs, JSON.stringify(d.value)), a.value = "";
      }
      function T() {
        const B = localStorage.getItem(rs);
        if (B) try {
          d.value = JSON.parse(B);
        } catch {
        }
      }
      function C(B) {
        const x = d.value.find((I) => I.name === B);
        x && (n.modelValue.cx = x.cx, n.modelValue.cy = x.cy, n.modelValue.scale = x.scale, n.modelValue.angle = x.angle, u.value = B, r("load", {
          ...x
        }));
      }
      const U = Ze({
        get: () => Math.log10(n.modelValue.mu ?? 1),
        set: (B) => {
          n.modelValue.mu = Math.pow(10, B);
        }
      }), D = Ze({
        get: () => Math.log10(n.modelValue.epsilon ?? 1e-8),
        set: (B) => {
          n.modelValue.epsilon = Math.pow(10, B);
        }
      });
      return wn(() => {
        T();
      }), (B, x) => (At(), It("nav", Gc, [
        x[16] || (x[16] = L("p", {
          class: "panel-heading compact-heading"
        }, "Param\xE8tres", -1)),
        L("div", Kc, [
          L("span", qc, [
            x[6] || (x[6] = wt(" \xC9chelle\xA0: ", -1)),
            L("span", {
              innerHTML: i.value
            }, null, 8, Yc),
            L("button", {
              class: "button is-small",
              style: {
                "margin-left": "0.7em"
              },
              onClick: x[0] || (x[0] = (I) => n.modelValue.scale = "2.5")
            }, "R\xE9initialiser")
          ])
        ]),
        L("div", kc, [
          L("p", null, [
            L("span", Jc, [
              x[7] || (x[7] = wt("Cx\xA0:", -1)),
              L("span", {
                innerHTML: o.value
              }, null, 8, Xc)
            ])
          ]),
          L("p", null, [
            L("span", Qc, [
              x[8] || (x[8] = wt("Cy\xA0:", -1)),
              x[9] || (x[9] = L("span", {
                class: "math-i"
              }, "i", -1)),
              L("span", {
                innerHTML: l.value
              }, null, 8, Zc)
            ])
          ])
        ]),
        L("div", ea, [
          L("span", ta, [
            x[10] || (x[10] = wt(" Angle\xA0: ", -1)),
            L("span", null, yt(s.value) + "\xB0", 1)
          ])
        ]),
        L("div", na, [
          x[11] || (x[11] = L("label", {
            class: "compact-label"
          }, "Mu (log)", -1)),
          qt(L("input", {
            type: "range",
            min: "0",
            max: "5",
            step: "0.01",
            "onUpdate:modelValue": x[1] || (x[1] = (I) => U.value = I),
            style: {
              width: "100%"
            }
          }, null, 512), [
            [
              Nn,
              U.value
            ]
          ]),
          L("span", ra, yt((n.modelValue.mu ?? 1).toFixed(1)), 1)
        ]),
        L("div", sa, [
          x[12] || (x[12] = L("label", {
            class: "compact-label"
          }, "Epsilon (log)", -1)),
          qt(L("input", {
            type: "range",
            min: "-12",
            max: "0",
            step: "0.01",
            "onUpdate:modelValue": x[2] || (x[2] = (I) => D.value = I),
            style: {
              width: "100%"
            }
          }, null, 512), [
            [
              Nn,
              D.value
            ]
          ]),
          L("span", ia, yt((n.modelValue.epsilon ?? 1e-8).toExponential(2)), 1)
        ]),
        L("div", oa, [
          x[14] || (x[14] = L("label", {
            class: "compact-label"
          }, "Presets enregistr\xE9s", -1)),
          L("div", la, [
            qt(L("select", {
              class: "select compact-select",
              "onUpdate:modelValue": x[3] || (x[3] = (I) => u.value = I),
              onChange: x[4] || (x[4] = (I) => C(u.value)),
              style: {
                width: "100%"
              }
            }, [
              x[13] || (x[13] = L("option", {
                value: "",
                disabled: ""
              }, "Choisir un preset...", -1)),
              (At(true), It(Ce, null, wo(d.value, (I) => (At(), It("option", {
                key: I.name,
                value: I.name
              }, yt(I.name), 9, ca))), 128))
            ], 544), [
              [
                Fl,
                u.value
              ]
            ])
          ])
        ]),
        L("div", aa, [
          x[15] || (x[15] = L("label", {
            class: "compact-label"
          }, "Nom du preset", -1)),
          L("div", fa, [
            qt(L("input", {
              class: "input compact-input",
              "onUpdate:modelValue": x[5] || (x[5] = (I) => a.value = I),
              type: "text",
              placeholder: "Nom...",
              style: {
                width: "8em"
              }
            }, null, 512), [
              [
                Nn,
                a.value
              ]
            ]),
            L("button", {
              class: "button is-link is-small",
              onClick: p
            }, "Enregistrer")
          ])
        ])
      ]));
    }
  }), ui = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [r, s] of t) n[r] = s;
    return n;
  }, da = ui(ua, [
    [
      "__scopeId",
      "data-v-cca28d8a"
    ]
  ]), ha = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, pa = {
    style: {
      position: "absolute",
      top: "0",
      left: "0",
      "z-index": "10",
      width: "320px",
      "pointer-events": "auto"
    }
  }, ss = 1, is = 128, Jt = 0.04, os = 0.025, _a = pr({
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
        antialiasLevel: ss,
        palettePeriod: is
      });
      function o(O) {
        s && (s.origin(String(O.cx), String(O.cy)), s.scale(String(O.scale)), s.angle(Number(O.angle)));
      }
      function l(O) {
        u[O.key.toLowerCase()] = true;
      }
      function a(O) {
        u[O.key.toLowerCase()] = false;
      }
      function d(O) {
        O.preventDefault();
        const H = 0.8;
        O.deltaY < 0 ? s.zoom(H) : s.zoom(1 / H);
      }
      const u = {};
      let p = false, T = false, C = 0, U = 0;
      function D(O) {
        const H = t.value;
        if (!H) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const Q = H.getBoundingClientRect();
        return {
          x: O.clientX - Q.left,
          y: O.clientY - Q.top,
          width: Q.width,
          height: Q.height
        };
      }
      function B(O) {
        if (O.button === 2) T = true;
        else {
          p = true;
          const H = D(O);
          C = H.x, U = H.y;
        }
      }
      function x(O) {
        var _a2;
        const H = D(O);
        if (T) {
          const Ie = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
          if (!Ie) return;
          const rt = Ie.width / 2, ee = Ie.height / 2, k = H.x, G = H.y, Fe = Math.atan2(G - ee, k - rt);
          s.angle(Fe);
          return;
        }
        if (!p) return;
        const Q = H.width, ue = H.height, Re = Q / ue, me = (H.x - C) / Q * 2, Ae = (H.y - U) / ue * 2, je = -me * Re, $e = Ae;
        s.translate_direct(je, $e), C = H.x, U = H.y;
      }
      function I(O) {
        O.button === 2 ? T = false : p = false;
      }
      async function X() {
        if (!t.value) return;
        n = t.value, s = new Ql(-0.749208775, -0.0798967515, 1e4, 2.5, 0), r = new Wc(n, {
          antialiasLevel: 1,
          palettePeriod: 128
        }), await r.initialize(s), window.addEventListener("keydown", l), window.addEventListener("keyup", a), n.addEventListener("wheel", d, {
          passive: false
        }), n.addEventListener("mousedown", B), n.addEventListener("contextmenu", function(H) {
          H.preventDefault();
        }), window.addEventListener("mousemove", x), window.addEventListener("mouseup", I);
        function O() {
          u.z && s.translate(0, Jt), u.s && s.translate(0, -Jt), u.q && s.translate(-Jt, 0), u.d && s.translate(Jt, 0), u.a && s.rotate(os), u.e && s.rotate(-os);
          const H = i.value.epsilon, [Q, ue, Re, me] = s.step(), [Ae, je, $e, Ie] = s.get_params(), rt = i.value.mu;
          i.value.cx = Ae, i.value.cy = je, i.value.scale = $e, i.value.angle = Ie;
          const ee = Math.min(Math.max(100, 80 + 30 * Math.log2(1 / Re)), 1e6);
          r.update({
            cx: Q,
            cy: ue,
            mu: rt,
            scale: Re,
            angle: me,
            maxIterations: ee,
            epsilon: H
          }, {
            antialiasLevel: ss,
            palettePeriod: is
          }), r.render(), requestAnimationFrame(O);
        }
        O();
      }
      function M() {
        if (!t.value || !r) return;
        const O = t.value.getBoundingClientRect();
        t.value.width = O.width, t.value.height = O.height, r.resize && r.resize(), r.render();
      }
      return wn(() => {
        X(), window.addEventListener("resize", M);
      }), _r(() => {
        window.removeEventListener("resize", M);
      }), (O, H) => (At(), It("div", ha, [
        L("canvas", {
          ref_key: "canvasRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          }
        }, null, 512),
        L("div", pa, [
          Ne(da, {
            modelValue: i.value,
            "onUpdate:modelValue": H[0] || (H[0] = (Q) => i.value = Q),
            onLoad: o
          }, null, 8, [
            "modelValue"
          ])
        ])
      ]));
    }
  }), ga = ui(_a, [
    [
      "__scopeId",
      "data-v-b141d14f"
    ]
  ]), ma = {
    id: "fullscreen"
  }, ba = pr({
    __name: "App",
    setup(e) {
      return wn(() => {
      }), (t, n) => (At(), It("div", ma, [
        Ne(ga)
      ]));
    }
  });
  Dl(ba).mount("#app");
})();
