var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(async () => {
  (function() {
    const t = document.createElement("link").relList;
    if (t && t.supports && t.supports("modulepreload")) return;
    for (const i of document.querySelectorAll('link[rel="modulepreload"]')) r(i);
    new MutationObserver((i) => {
      for (const s of i) if (s.type === "childList") for (const o of s.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && r(o);
    }).observe(document, {
      childList: true,
      subtree: true
    });
    function n(i) {
      const s = {};
      return i.integrity && (s.integrity = i.integrity), i.referrerPolicy && (s.referrerPolicy = i.referrerPolicy), i.crossOrigin === "use-credentials" ? s.credentials = "include" : i.crossOrigin === "anonymous" ? s.credentials = "omit" : s.credentials = "same-origin", s;
    }
    function r(i) {
      if (i.ep) return;
      i.ep = true;
      const s = n(i);
      fetch(i.href, s);
    }
  })();
  function Un(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const Y = {}, ct = [], Re = () => {
  }, Ki = () => false, en = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), zn = (e) => e.startsWith("onUpdate:"), se = Object.assign, Bn = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, qi = Object.prototype.hasOwnProperty, $ = (e, t) => qi.call(e, t), A = Array.isArray, xt = (e) => tn(e) === "[object Map]", Yi = (e) => tn(e) === "[object Set]", I = (e) => typeof e == "function", te = (e) => typeof e == "string", dt = (e) => typeof e == "symbol", Z = (e) => e !== null && typeof e == "object", Wr = (e) => (Z(e) || I(e)) && I(e.then) && I(e.catch), Xi = Object.prototype.toString, tn = (e) => Xi.call(e), Ji = (e) => tn(e).slice(8, -1), Qi = (e) => tn(e) === "[object Object]", Nn = (e) => te(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, yt = Un(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), nn = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  }, Zi = /-(\w)/g, Ge = nn((e) => e.replace(Zi, (t, n) => n ? n.toUpperCase() : "")), ki = /\B([A-Z])/g, tt = nn((e) => e.replace(ki, "-$1").toLowerCase()), Gr = nn((e) => e.charAt(0).toUpperCase() + e.slice(1)), an = nn((e) => e ? `on${Gr(e)}` : ""), We = (e, t) => !Object.is(e, t), un = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, En = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, es = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  };
  let dr;
  const rn = () => dr || (dr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function Vn(e) {
    if (A(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], i = te(r) ? is(r) : Vn(r);
        if (i) for (const s in i) t[s] = i[s];
      }
      return t;
    } else if (te(e) || Z(e)) return e;
  }
  const ts = /;(?![^(]*\))/g, ns = /:([^]+)/, rs = /\/\*[^]*?\*\//g;
  function is(e) {
    const t = {};
    return e.replace(rs, "").split(ts).forEach((n) => {
      if (n) {
        const r = n.split(ns);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }), t;
  }
  function Hn(e) {
    let t = "";
    if (te(e)) t = e;
    else if (A(e)) for (let n = 0; n < e.length; n++) {
      const r = Hn(e[n]);
      r && (t += r + " ");
    }
    else if (Z(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const ss = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", os = Un(ss);
  function Kr(e) {
    return !!e || e === "";
  }
  let de;
  class ls {
    constructor(t = false) {
      this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.parent = de, !t && de && (this.index = (de.scopes || (de.scopes = [])).push(this) - 1);
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
        const n = de;
        try {
          return de = this, t();
        } finally {
          de = n;
        }
      }
    }
    on() {
      ++this._on === 1 && (this.prevScope = de, de = this);
    }
    off() {
      this._on > 0 && --this._on === 0 && (de = this.prevScope, this.prevScope = void 0);
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
          const i = this.parent.scopes.pop();
          i && i !== this && (this.parent.scopes[this.index] = i, i.index = this.index);
        }
        this.parent = void 0;
      }
    }
  }
  function cs() {
    return de;
  }
  let q;
  const dn = /* @__PURE__ */ new WeakSet();
  class qr {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, de && de.active && de.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, dn.has(this) && (dn.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Xr(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, hr(this), Jr(this);
      const t = q, n = me;
      q = this, me = true;
      try {
        return this.fn();
      } finally {
        Qr(this), q = t, me = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) Wn(t);
        this.deps = this.depsTail = void 0, hr(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? dn.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      Tn(this) && this.run();
    }
    get dirty() {
      return Tn(this);
    }
  }
  let Yr = 0, wt, St;
  function Xr(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = St, St = e;
      return;
    }
    e.next = wt, wt = e;
  }
  function jn() {
    Yr++;
  }
  function $n() {
    if (--Yr > 0) return;
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
  function Jr(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function Qr(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const i = r.prevDep;
      r.version === -1 ? (r === n && (n = i), Wn(r), fs(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = i;
    }
    e.deps = t, e.depsTail = n;
  }
  function Tn(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (Zr(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function Zr(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Rt) || (e.globalVersion = Rt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Tn(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = q, r = me;
    q = e, me = true;
    try {
      Jr(e);
      const i = e.fn(e._value);
      (t.version === 0 || We(i, e._value)) && (e.flags |= 128, e._value = i, t.version++);
    } catch (i) {
      throw t.version++, i;
    } finally {
      q = n, me = r, Qr(e), e.flags &= -3;
    }
  }
  function Wn(e, t = false) {
    const { dep: n, prevSub: r, nextSub: i } = e;
    if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
      n.computed.flags &= -5;
      for (let s = n.computed.deps; s; s = s.nextDep) Wn(s, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function fs(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let me = true;
  const kr = [];
  function Be() {
    kr.push(me), me = false;
  }
  function Ne() {
    const e = kr.pop();
    me = e === void 0 ? true : e;
  }
  function hr(e) {
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
  let Rt = 0;
  class as {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class Gn {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!q || !me || q === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== q) n = this.activeLink = new as(q, this), q.deps ? (n.prevDep = q.depsTail, q.depsTail.nextDep = n, q.depsTail = n) : q.deps = q.depsTail = n, ei(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = q.depsTail, n.nextDep = void 0, q.depsTail.nextDep = n, q.depsTail = n, q.deps === n && (q.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, Rt++, this.notify(t);
    }
    notify(t) {
      jn();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        $n();
      }
    }
  }
  function ei(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let r = t.deps; r; r = r.nextDep) ei(r);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const Cn = /* @__PURE__ */ new WeakMap(), ke = Symbol(""), Pn = Symbol(""), At = Symbol("");
  function re(e, t, n) {
    if (me && q) {
      let r = Cn.get(e);
      r || Cn.set(e, r = /* @__PURE__ */ new Map());
      let i = r.get(n);
      i || (r.set(n, i = new Gn()), i.map = r, i.key = n), i.track();
    }
  }
  function ze(e, t, n, r, i, s) {
    const o = Cn.get(e);
    if (!o) {
      Rt++;
      return;
    }
    const c = (a) => {
      a && a.trigger();
    };
    if (jn(), t === "clear") o.forEach(c);
    else {
      const a = A(e), h = a && Nn(n);
      if (a && n === "length") {
        const u = Number(r);
        o.forEach((_, S) => {
          (S === "length" || S === At || !dt(S) && S >= u) && c(_);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && c(o.get(n)), h && c(o.get(At)), t) {
        case "add":
          a ? h && c(o.get("length")) : (c(o.get(ke)), xt(e) && c(o.get(Pn)));
          break;
        case "delete":
          a || (c(o.get(ke)), xt(e) && c(o.get(Pn)));
          break;
        case "set":
          xt(e) && c(o.get(ke));
          break;
      }
    }
    $n();
  }
  function st(e) {
    const t = j(e);
    return t === e ? t : (re(t, "iterate", At), ve(e) ? t : t.map(le));
  }
  function Kn(e) {
    return re(e = j(e), "iterate", At), e;
  }
  const us = {
    __proto__: null,
    [Symbol.iterator]() {
      return hn(this, Symbol.iterator, le);
    },
    concat(...e) {
      return st(this).concat(...e.map((t) => A(t) ? st(t) : t));
    },
    entries() {
      return hn(this, "entries", (e) => (e[1] = le(e[1]), e));
    },
    every(e, t) {
      return De(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return De(this, "filter", e, t, (n) => n.map(le), arguments);
    },
    find(e, t) {
      return De(this, "find", e, t, le, arguments);
    },
    findIndex(e, t) {
      return De(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return De(this, "findLast", e, t, le, arguments);
    },
    findLastIndex(e, t) {
      return De(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return De(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return _n(this, "includes", e);
    },
    indexOf(...e) {
      return _n(this, "indexOf", e);
    },
    join(e) {
      return st(this).join(e);
    },
    lastIndexOf(...e) {
      return _n(this, "lastIndexOf", e);
    },
    map(e, t) {
      return De(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return bt(this, "pop");
    },
    push(...e) {
      return bt(this, "push", e);
    },
    reduce(e, ...t) {
      return _r(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return _r(this, "reduceRight", e, t);
    },
    shift() {
      return bt(this, "shift");
    },
    some(e, t) {
      return De(this, "some", e, t, void 0, arguments);
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
      return hn(this, "values", le);
    }
  };
  function hn(e, t, n) {
    const r = Kn(e), i = r[t]();
    return r !== e && !ve(e) && (i._next = i.next, i.next = () => {
      const s = i._next();
      return s.value && (s.value = n(s.value)), s;
    }), i;
  }
  const ds = Array.prototype;
  function De(e, t, n, r, i, s) {
    const o = Kn(e), c = o !== e && !ve(e), a = o[t];
    if (a !== ds[t]) {
      const _ = a.apply(e, s);
      return c ? le(_) : _;
    }
    let h = n;
    o !== e && (c ? h = function(_, S) {
      return n.call(this, le(_), S, e);
    } : n.length > 2 && (h = function(_, S) {
      return n.call(this, _, S, e);
    }));
    const u = a.call(o, h, r);
    return c && i ? i(u) : u;
  }
  function _r(e, t, n, r) {
    const i = Kn(e);
    let s = n;
    return i !== e && (ve(e) ? n.length > 3 && (s = function(o, c, a) {
      return n.call(this, o, c, a, e);
    }) : s = function(o, c, a) {
      return n.call(this, o, le(c), a, e);
    }), i[t](s, ...r);
  }
  function _n(e, t, n) {
    const r = j(e);
    re(r, "iterate", At);
    const i = r[t](...n);
    return (i === -1 || i === false) && Jn(n[0]) ? (n[0] = j(n[0]), r[t](...n)) : i;
  }
  function bt(e, t, n = []) {
    Be(), jn();
    const r = j(e)[t].apply(e, n);
    return $n(), Ne(), r;
  }
  const hs = Un("__proto__,__v_isRef,__isVue"), ti = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(dt));
  function _s(e) {
    dt(e) || (e = String(e));
    const t = j(this);
    return re(t, "has", e), t.hasOwnProperty(e);
  }
  class ni {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const i = this._isReadonly, s = this._isShallow;
      if (n === "__v_isReactive") return !i;
      if (n === "__v_isReadonly") return i;
      if (n === "__v_isShallow") return s;
      if (n === "__v_raw") return r === (i ? s ? Es : oi : s ? si : ii).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const o = A(t);
      if (!i) {
        let a;
        if (o && (a = us[n])) return a;
        if (n === "hasOwnProperty") return _s;
      }
      const c = Reflect.get(t, n, ie(t) ? t : r);
      return (dt(n) ? ti.has(n) : hs(n)) || (i || re(t, "get", n), s) ? c : ie(c) ? o && Nn(n) ? c : c.value : Z(c) ? i ? li(c) : Yn(c) : c;
    }
  }
  class ri extends ni {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, i) {
      let s = t[n];
      if (!this._isShallow) {
        const a = et(s);
        if (!ve(r) && !et(r) && (s = j(s), r = j(r)), !A(t) && ie(s) && !ie(r)) return a ? false : (s.value = r, true);
      }
      const o = A(t) && Nn(n) ? Number(n) < t.length : $(t, n), c = Reflect.set(t, n, r, ie(t) ? t : i);
      return t === j(i) && (o ? We(r, s) && ze(t, "set", n, r) : ze(t, "add", n, r)), c;
    }
    deleteProperty(t, n) {
      const r = $(t, n);
      t[n];
      const i = Reflect.deleteProperty(t, n);
      return i && r && ze(t, "delete", n, void 0), i;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!dt(n) || !ti.has(n)) && re(t, "has", n), r;
    }
    ownKeys(t) {
      return re(t, "iterate", A(t) ? "length" : ke), Reflect.ownKeys(t);
    }
  }
  class ps extends ni {
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
  const gs = new ri(), bs = new ps(), ms = new ri(true);
  const Mn = (e) => e, zt = (e) => Reflect.getPrototypeOf(e);
  function vs(e, t, n) {
    return function(...r) {
      const i = this.__v_raw, s = j(i), o = xt(s), c = e === "entries" || e === Symbol.iterator && o, a = e === "keys" && o, h = i[e](...r), u = n ? Mn : t ? On : le;
      return !t && re(s, "iterate", a ? Pn : ke), {
        next() {
          const { value: _, done: S } = h.next();
          return S ? {
            value: _,
            done: S
          } : {
            value: c ? [
              u(_[0]),
              u(_[1])
            ] : u(_),
            done: S
          };
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    };
  }
  function Bt(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function xs(e, t) {
    const n = {
      get(i) {
        const s = this.__v_raw, o = j(s), c = j(i);
        e || (We(i, c) && re(o, "get", i), re(o, "get", c));
        const { has: a } = zt(o), h = t ? Mn : e ? On : le;
        if (a.call(o, i)) return h(s.get(i));
        if (a.call(o, c)) return h(s.get(c));
        s !== o && s.get(i);
      },
      get size() {
        const i = this.__v_raw;
        return !e && re(j(i), "iterate", ke), Reflect.get(i, "size", i);
      },
      has(i) {
        const s = this.__v_raw, o = j(s), c = j(i);
        return e || (We(i, c) && re(o, "has", i), re(o, "has", c)), i === c ? s.has(i) : s.has(i) || s.has(c);
      },
      forEach(i, s) {
        const o = this, c = o.__v_raw, a = j(c), h = t ? Mn : e ? On : le;
        return !e && re(a, "iterate", ke), c.forEach((u, _) => i.call(s, h(u), h(_), o));
      }
    };
    return se(n, e ? {
      add: Bt("add"),
      set: Bt("set"),
      delete: Bt("delete"),
      clear: Bt("clear")
    } : {
      add(i) {
        !t && !ve(i) && !et(i) && (i = j(i));
        const s = j(this);
        return zt(s).has.call(s, i) || (s.add(i), ze(s, "add", i, i)), this;
      },
      set(i, s) {
        !t && !ve(s) && !et(s) && (s = j(s));
        const o = j(this), { has: c, get: a } = zt(o);
        let h = c.call(o, i);
        h || (i = j(i), h = c.call(o, i));
        const u = a.call(o, i);
        return o.set(i, s), h ? We(s, u) && ze(o, "set", i, s) : ze(o, "add", i, s), this;
      },
      delete(i) {
        const s = j(this), { has: o, get: c } = zt(s);
        let a = o.call(s, i);
        a || (i = j(i), a = o.call(s, i)), c && c.call(s, i);
        const h = s.delete(i);
        return a && ze(s, "delete", i, void 0), h;
      },
      clear() {
        const i = j(this), s = i.size !== 0, o = i.clear();
        return s && ze(i, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((i) => {
      n[i] = vs(i, e, t);
    }), n;
  }
  function qn(e, t) {
    const n = xs(e, t);
    return (r, i, s) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? r : Reflect.get($(n, i) && i in r ? n : r, i, s);
  }
  const ys = {
    get: qn(false, false)
  }, ws = {
    get: qn(false, true)
  }, Ss = {
    get: qn(true, false)
  };
  const ii = /* @__PURE__ */ new WeakMap(), si = /* @__PURE__ */ new WeakMap(), oi = /* @__PURE__ */ new WeakMap(), Es = /* @__PURE__ */ new WeakMap();
  function Ts(e) {
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
  function Cs(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Ts(Ji(e));
  }
  function Yn(e) {
    return et(e) ? e : Xn(e, false, gs, ys, ii);
  }
  function Ps(e) {
    return Xn(e, false, ms, ws, si);
  }
  function li(e) {
    return Xn(e, true, bs, Ss, oi);
  }
  function Xn(e, t, n, r, i) {
    if (!Z(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const s = Cs(e);
    if (s === 0) return e;
    const o = i.get(e);
    if (o) return o;
    const c = new Proxy(e, s === 2 ? r : n);
    return i.set(e, c), c;
  }
  function Et(e) {
    return et(e) ? Et(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function et(e) {
    return !!(e && e.__v_isReadonly);
  }
  function ve(e) {
    return !!(e && e.__v_isShallow);
  }
  function Jn(e) {
    return e ? !!e.__v_raw : false;
  }
  function j(e) {
    const t = e && e.__v_raw;
    return t ? j(t) : e;
  }
  function Ms(e) {
    return !$(e, "__v_skip") && Object.isExtensible(e) && En(e, "__v_skip", true), e;
  }
  const le = (e) => Z(e) ? Yn(e) : e, On = (e) => Z(e) ? li(e) : e;
  function ie(e) {
    return e ? e.__v_isRef === true : false;
  }
  function pn(e) {
    return Os(e, false);
  }
  function Os(e, t) {
    return ie(e) ? e : new Rs(e, t);
  }
  class Rs {
    constructor(t, n) {
      this.dep = new Gn(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : j(t), this._value = n ? t : le(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || ve(t) || et(t);
      t = r ? t : j(t), We(t, n) && (this._rawValue = t, this._value = r ? t : le(t), this.dep.trigger());
    }
  }
  function As(e) {
    return ie(e) ? e.value : e;
  }
  const Fs = {
    get: (e, t, n) => t === "__v_raw" ? e : As(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const i = e[t];
      return ie(i) && !ie(n) ? (i.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function ci(e) {
    return Et(e) ? e : new Proxy(e, Fs);
  }
  class Is {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new Gn(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Rt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && q !== this) return Xr(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return Zr(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function Ds(e, t, n = false) {
    let r, i;
    return I(e) ? r = e : (r = e.get, i = e.set), new Is(r, i, n);
  }
  const Nt = {}, Xt = /* @__PURE__ */ new WeakMap();
  let Ze;
  function Ls(e, t = false, n = Ze) {
    if (n) {
      let r = Xt.get(n);
      r || Xt.set(n, r = []), r.push(e);
    }
  }
  function Us(e, t, n = Y) {
    const { immediate: r, deep: i, once: s, scheduler: o, augmentJob: c, call: a } = n, h = (P) => i ? P : ve(P) || i === false || i === 0 ? $e(P, 1) : $e(P);
    let u, _, S, E, z = false, L = false;
    if (ie(e) ? (_ = () => e.value, z = ve(e)) : Et(e) ? (_ = () => h(e), z = true) : A(e) ? (L = true, z = e.some((P) => Et(P) || ve(P)), _ = () => e.map((P) => {
      if (ie(P)) return P.value;
      if (Et(P)) return h(P);
      if (I(P)) return a ? a(P, 2) : P();
    })) : I(e) ? t ? _ = a ? () => a(e, 2) : e : _ = () => {
      if (S) {
        Be();
        try {
          S();
        } finally {
          Ne();
        }
      }
      const P = Ze;
      Ze = u;
      try {
        return a ? a(e, 3, [
          E
        ]) : e(E);
      } finally {
        Ze = P;
      }
    } : _ = Re, t && i) {
      const P = _, Q = i === true ? 1 / 0 : i;
      _ = () => $e(P(), Q);
    }
    const k = cs(), H = () => {
      u.stop(), k && k.active && Bn(k.effects, u);
    };
    if (s && t) {
      const P = t;
      t = (...Q) => {
        P(...Q), H();
      };
    }
    let G = L ? new Array(e.length).fill(Nt) : Nt;
    const J = (P) => {
      if (!(!(u.flags & 1) || !u.dirty && !P)) if (t) {
        const Q = u.run();
        if (i || z || (L ? Q.some((xe, be) => We(xe, G[be])) : We(Q, G))) {
          S && S();
          const xe = Ze;
          Ze = u;
          try {
            const be = [
              Q,
              G === Nt ? void 0 : L && G[0] === Nt ? [] : G,
              E
            ];
            G = Q, a ? a(t, 3, be) : t(...be);
          } finally {
            Ze = xe;
          }
        }
      } else u.run();
    };
    return c && c(J), u = new qr(_), u.scheduler = o ? () => o(J, false) : J, E = (P) => Ls(P, false, u), S = u.onStop = () => {
      const P = Xt.get(u);
      if (P) {
        if (a) a(P, 4);
        else for (const Q of P) Q();
        Xt.delete(u);
      }
    }, t ? r ? J(true) : G = u.run() : o ? o(J.bind(null, true), true) : u.run(), H.pause = u.pause.bind(u), H.resume = u.resume.bind(u), H.stop = H, H;
  }
  function $e(e, t = 1 / 0, n) {
    if (t <= 0 || !Z(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
    if (n.add(e), t--, ie(e)) $e(e.value, t, n);
    else if (A(e)) for (let r = 0; r < e.length; r++) $e(e[r], t, n);
    else if (Yi(e) || xt(e)) e.forEach((r) => {
      $e(r, t, n);
    });
    else if (Qi(e)) {
      for (const r in e) $e(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && $e(e[r], t, n);
    }
    return e;
  }
  function Lt(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (i) {
      sn(i, t, n);
    }
  }
  function Fe(e, t, n, r) {
    if (I(e)) {
      const i = Lt(e, t, n, r);
      return i && Wr(i) && i.catch((s) => {
        sn(s, t, n);
      }), i;
    }
    if (A(e)) {
      const i = [];
      for (let s = 0; s < e.length; s++) i.push(Fe(e[s], t, n, r));
      return i;
    }
  }
  function sn(e, t, n, r = true) {
    const i = t ? t.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: o } = t && t.appContext.config || Y;
    if (t) {
      let c = t.parent;
      const a = t.proxy, h = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; c; ) {
        const u = c.ec;
        if (u) {
          for (let _ = 0; _ < u.length; _++) if (u[_](e, a, h) === false) return;
        }
        c = c.parent;
      }
      if (s) {
        Be(), Lt(s, null, 10, [
          e,
          a,
          h
        ]), Ne();
        return;
      }
    }
    zs(e, n, i, r, o);
  }
  function zs(e, t, n, r = true, i = false) {
    if (i) throw e;
    console.error(e);
  }
  const ce = [];
  let Pe = -1;
  const ft = [];
  let He = null, lt = 0;
  const fi = Promise.resolve();
  let Jt = null;
  function Bs(e) {
    const t = Jt || fi;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function Ns(e) {
    let t = Pe + 1, n = ce.length;
    for (; t < n; ) {
      const r = t + n >>> 1, i = ce[r], s = Ft(i);
      s < e || s === e && i.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function Qn(e) {
    if (!(e.flags & 1)) {
      const t = Ft(e), n = ce[ce.length - 1];
      !n || !(e.flags & 2) && t >= Ft(n) ? ce.push(e) : ce.splice(Ns(t), 0, e), e.flags |= 1, ai();
    }
  }
  function ai() {
    Jt || (Jt = fi.then(di));
  }
  function Vs(e) {
    A(e) ? ft.push(...e) : He && e.id === -1 ? He.splice(lt + 1, 0, e) : e.flags & 1 || (ft.push(e), e.flags |= 1), ai();
  }
  function pr(e, t, n = Pe + 1) {
    for (; n < ce.length; n++) {
      const r = ce[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        ce.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function ui(e) {
    if (ft.length) {
      const t = [
        ...new Set(ft)
      ].sort((n, r) => Ft(n) - Ft(r));
      if (ft.length = 0, He) {
        He.push(...t);
        return;
      }
      for (He = t, lt = 0; lt < He.length; lt++) {
        const n = He[lt];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      He = null, lt = 0;
    }
  }
  const Ft = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function di(e) {
    try {
      for (Pe = 0; Pe < ce.length; Pe++) {
        const t = ce[Pe];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Lt(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; Pe < ce.length; Pe++) {
        const t = ce[Pe];
        t && (t.flags &= -2);
      }
      Pe = -1, ce.length = 0, ui(), Jt = null, (ce.length || ft.length) && di();
    }
  }
  let Oe = null, hi = null;
  function Qt(e) {
    const t = Oe;
    return Oe = e, hi = e && e.type.__scopeId || null, t;
  }
  function Hs(e, t = Oe, n) {
    if (!t || e._n) return e;
    const r = (...i) => {
      r._d && Er(-1);
      const s = Qt(t);
      let o;
      try {
        o = e(...i);
      } finally {
        Qt(s), r._d && Er(1);
      }
      return o;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function Je(e, t, n, r) {
    const i = e.dirs, s = t && t.dirs;
    for (let o = 0; o < i.length; o++) {
      const c = i[o];
      s && (c.oldValue = s[o].value);
      let a = c.dir[r];
      a && (Be(), Fe(a, n, 8, [
        e.el,
        c,
        e,
        t
      ]), Ne());
    }
  }
  const js = Symbol("_vte"), $s = (e) => e.__isTeleport;
  function Zn(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, Zn(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function _i(e, t) {
    return I(e) ? se({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function pi(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function Tt(e, t, n, r, i = false) {
    if (A(e)) {
      e.forEach((z, L) => Tt(z, t && (A(t) ? t[L] : t), n, r, i));
      return;
    }
    if (Ct(r) && !i) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Tt(e, t, n, r.component.subTree);
      return;
    }
    const s = r.shapeFlag & 4 ? or(r.component) : r.el, o = i ? null : s, { i: c, r: a } = e, h = t && t.r, u = c.refs === Y ? c.refs = {} : c.refs, _ = c.setupState, S = j(_), E = _ === Y ? () => false : (z) => $(S, z);
    if (h != null && h !== a && (te(h) ? (u[h] = null, E(h) && (_[h] = null)) : ie(h) && (h.value = null)), I(a)) Lt(a, c, 12, [
      o,
      u
    ]);
    else {
      const z = te(a), L = ie(a);
      if (z || L) {
        const k = () => {
          if (e.f) {
            const H = z ? E(a) ? _[a] : u[a] : a.value;
            i ? A(H) && Bn(H, s) : A(H) ? H.includes(s) || H.push(s) : z ? (u[a] = [
              s
            ], E(a) && (_[a] = u[a])) : (a.value = [
              s
            ], e.k && (u[e.k] = a.value));
          } else z ? (u[a] = o, E(a) && (_[a] = o)) : L && (a.value = o, e.k && (u[e.k] = o));
        };
        o ? (k.id = -1, pe(k, n)) : k();
      }
    }
  }
  rn().requestIdleCallback;
  rn().cancelIdleCallback;
  const Ct = (e) => !!e.type.__asyncLoader, gi = (e) => e.type.__isKeepAlive;
  function Ws(e, t) {
    bi(e, "a", t);
  }
  function Gs(e, t) {
    bi(e, "da", t);
  }
  function bi(e, t, n = fe) {
    const r = e.__wdc || (e.__wdc = () => {
      let i = n;
      for (; i; ) {
        if (i.isDeactivated) return;
        i = i.parent;
      }
      return e();
    });
    if (on(t, r, n), n) {
      let i = n.parent;
      for (; i && i.parent; ) gi(i.parent.vnode) && Ks(r, t, n, i), i = i.parent;
    }
  }
  function Ks(e, t, n, r) {
    const i = on(t, e, r, true);
    er(() => {
      Bn(r[t], i);
    }, n);
  }
  function on(e, t, n = fe, r = false) {
    if (n) {
      const i = n[e] || (n[e] = []), s = t.__weh || (t.__weh = (...o) => {
        Be();
        const c = Ut(n), a = Fe(t, n, e, o);
        return c(), Ne(), a;
      });
      return r ? i.unshift(s) : i.push(s), s;
    }
  }
  const Ve = (e) => (t, n = fe) => {
    (!Dt || e === "sp") && on(e, (...r) => t(...r), n);
  }, qs = Ve("bm"), kn = Ve("m"), Ys = Ve("bu"), Xs = Ve("u"), Js = Ve("bum"), er = Ve("um"), Qs = Ve("sp"), Zs = Ve("rtg"), ks = Ve("rtc");
  function eo(e, t = fe) {
    on("ec", e, t);
  }
  const to = Symbol.for("v-ndc"), Rn = (e) => e ? Ni(e) ? or(e) : Rn(e.parent) : null, Pt = se(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => Rn(e.parent),
    $root: (e) => Rn(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => vi(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Qn(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Bs.bind(e.proxy)),
    $watch: (e) => Eo.bind(e)
  }), gn = (e, t) => e !== Y && !e.__isScriptSetup && $(e, t), no = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: r, data: i, props: s, accessCache: o, type: c, appContext: a } = e;
      let h;
      if (t[0] !== "$") {
        const E = o[t];
        if (E !== void 0) switch (E) {
          case 1:
            return r[t];
          case 2:
            return i[t];
          case 4:
            return n[t];
          case 3:
            return s[t];
        }
        else {
          if (gn(r, t)) return o[t] = 1, r[t];
          if (i !== Y && $(i, t)) return o[t] = 2, i[t];
          if ((h = e.propsOptions[0]) && $(h, t)) return o[t] = 3, s[t];
          if (n !== Y && $(n, t)) return o[t] = 4, n[t];
          An && (o[t] = 0);
        }
      }
      const u = Pt[t];
      let _, S;
      if (u) return t === "$attrs" && re(e.attrs, "get", ""), u(e);
      if ((_ = c.__cssModules) && (_ = _[t])) return _;
      if (n !== Y && $(n, t)) return o[t] = 4, n[t];
      if (S = a.config.globalProperties, $(S, t)) return S[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: i, ctx: s } = e;
      return gn(i, t) ? (i[t] = n, true) : r !== Y && $(r, t) ? (r[t] = n, true) : $(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (s[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, propsOptions: s } }, o) {
      let c;
      return !!n[o] || e !== Y && $(e, o) || gn(t, o) || (c = s[0]) && $(c, o) || $(r, o) || $(Pt, o) || $(i.config.globalProperties, o);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : $(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function gr(e) {
    return A(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  let An = true;
  function ro(e) {
    const t = vi(e), n = e.proxy, r = e.ctx;
    An = false, t.beforeCreate && br(t.beforeCreate, e, "bc");
    const { data: i, computed: s, methods: o, watch: c, provide: a, inject: h, created: u, beforeMount: _, mounted: S, beforeUpdate: E, updated: z, activated: L, deactivated: k, beforeDestroy: H, beforeUnmount: G, destroyed: J, unmounted: P, render: Q, renderTracked: xe, renderTriggered: be, errorCaptured: ye, serverPrefetch: nt, expose: Ie, inheritAttrs: qe, components: Ye, directives: F, filters: O } = t;
    if (h && io(h, r, null), o) for (const V in o) {
      const U = o[V];
      I(U) && (r[V] = U.bind(n));
    }
    if (i) {
      const V = i.call(n, n);
      Z(V) && (e.data = Yn(V));
    }
    if (An = true, s) for (const V in s) {
      const U = s[V], ne = I(U) ? U.bind(n, n) : I(U.get) ? U.get.bind(n, n) : Re, we = !I(U) && I(U.set) ? U.set.bind(n) : Re, he = Yo({
        get: ne,
        set: we
      });
      Object.defineProperty(r, V, {
        enumerable: true,
        configurable: true,
        get: () => he.value,
        set: (ee) => he.value = ee
      });
    }
    if (c) for (const V in c) mi(c[V], r, n, V);
    if (a) {
      const V = I(a) ? a.call(n) : a;
      Reflect.ownKeys(V).forEach((U) => {
        ao(U, V[U]);
      });
    }
    u && br(u, e, "c");
    function X(V, U) {
      A(U) ? U.forEach((ne) => V(ne.bind(n))) : U && V(U.bind(n));
    }
    if (X(qs, _), X(kn, S), X(Ys, E), X(Xs, z), X(Ws, L), X(Gs, k), X(eo, ye), X(ks, xe), X(Zs, be), X(Js, G), X(er, P), X(Qs, nt), A(Ie)) if (Ie.length) {
      const V = e.exposed || (e.exposed = {});
      Ie.forEach((U) => {
        Object.defineProperty(V, U, {
          get: () => n[U],
          set: (ne) => n[U] = ne,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    Q && e.render === Re && (e.render = Q), qe != null && (e.inheritAttrs = qe), Ye && (e.components = Ye), F && (e.directives = F), nt && pi(e);
  }
  function io(e, t, n = Re) {
    A(e) && (e = Fn(e));
    for (const r in e) {
      const i = e[r];
      let s;
      Z(i) ? "default" in i ? s = $t(i.from || r, i.default, true) : s = $t(i.from || r) : s = $t(i), ie(s) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => s.value,
        set: (o) => s.value = o
      }) : t[r] = s;
    }
  }
  function br(e, t, n) {
    Fe(A(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function mi(e, t, n, r) {
    let i = r.includes(".") ? Fi(n, r) : () => n[r];
    if (te(e)) {
      const s = t[e];
      I(s) && mn(i, s);
    } else if (I(e)) mn(i, e.bind(n));
    else if (Z(e)) if (A(e)) e.forEach((s) => mi(s, t, n, r));
    else {
      const s = I(e.handler) ? e.handler.bind(n) : t[e.handler];
      I(s) && mn(i, s, e);
    }
  }
  function vi(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: i, optionsCache: s, config: { optionMergeStrategies: o } } = e.appContext, c = s.get(t);
    let a;
    return c ? a = c : !i.length && !n && !r ? a = t : (a = {}, i.length && i.forEach((h) => Zt(a, h, o, true)), Zt(a, t, o)), Z(t) && s.set(t, a), a;
  }
  function Zt(e, t, n, r = false) {
    const { mixins: i, extends: s } = t;
    s && Zt(e, s, n, true), i && i.forEach((o) => Zt(e, o, n, true));
    for (const o in t) if (!(r && o === "expose")) {
      const c = so[o] || n && n[o];
      e[o] = c ? c(e[o], t[o]) : t[o];
    }
    return e;
  }
  const so = {
    data: mr,
    props: vr,
    emits: vr,
    methods: vt,
    computed: vt,
    beforeCreate: oe,
    created: oe,
    beforeMount: oe,
    mounted: oe,
    beforeUpdate: oe,
    updated: oe,
    beforeDestroy: oe,
    beforeUnmount: oe,
    destroyed: oe,
    unmounted: oe,
    activated: oe,
    deactivated: oe,
    errorCaptured: oe,
    serverPrefetch: oe,
    components: vt,
    directives: vt,
    watch: lo,
    provide: mr,
    inject: oo
  };
  function mr(e, t) {
    return t ? e ? function() {
      return se(I(e) ? e.call(this, this) : e, I(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function oo(e, t) {
    return vt(Fn(e), Fn(t));
  }
  function Fn(e) {
    if (A(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
      return t;
    }
    return e;
  }
  function oe(e, t) {
    return e ? [
      ...new Set([].concat(e, t))
    ] : t;
  }
  function vt(e, t) {
    return e ? se(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function vr(e, t) {
    return e ? A(e) && A(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : se(/* @__PURE__ */ Object.create(null), gr(e), gr(t ?? {})) : t;
  }
  function lo(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = se(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = oe(e[r], t[r]);
    return n;
  }
  function xi() {
    return {
      app: null,
      config: {
        isNativeTag: Ki,
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
  let co = 0;
  function fo(e, t) {
    return function(r, i = null) {
      I(r) || (r = se({}, r)), i != null && !Z(i) && (i = null);
      const s = xi(), o = /* @__PURE__ */ new WeakSet(), c = [];
      let a = false;
      const h = s.app = {
        _uid: co++,
        _component: r,
        _props: i,
        _container: null,
        _context: s,
        _instance: null,
        version: Xo,
        get config() {
          return s.config;
        },
        set config(u) {
        },
        use(u, ..._) {
          return o.has(u) || (u && I(u.install) ? (o.add(u), u.install(h, ..._)) : I(u) && (o.add(u), u(h, ..._))), h;
        },
        mixin(u) {
          return s.mixins.includes(u) || s.mixins.push(u), h;
        },
        component(u, _) {
          return _ ? (s.components[u] = _, h) : s.components[u];
        },
        directive(u, _) {
          return _ ? (s.directives[u] = _, h) : s.directives[u];
        },
        mount(u, _, S) {
          if (!a) {
            const E = h._ceVNode || Ae(r, i);
            return E.appContext = s, S === true ? S = "svg" : S === false && (S = void 0), e(E, u, S), a = true, h._container = u, u.__vue_app__ = h, or(E.component);
          }
        },
        onUnmount(u) {
          c.push(u);
        },
        unmount() {
          a && (Fe(c, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
        },
        provide(u, _) {
          return s.provides[u] = _, h;
        },
        runWithContext(u) {
          const _ = at;
          at = h;
          try {
            return u();
          } finally {
            at = _;
          }
        }
      };
      return h;
    };
  }
  let at = null;
  function ao(e, t) {
    if (fe) {
      let n = fe.provides;
      const r = fe.parent && fe.parent.provides;
      r === n && (n = fe.provides = Object.create(r)), n[e] = t;
    }
  }
  function $t(e, t, n = false) {
    const r = jo();
    if (r || at) {
      let i = at ? at._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (i && e in i) return i[e];
      if (arguments.length > 1) return n && I(t) ? t.call(r && r.proxy) : t;
    }
  }
  const yi = {}, wi = () => Object.create(yi), Si = (e) => Object.getPrototypeOf(e) === yi;
  function uo(e, t, n, r = false) {
    const i = {}, s = wi();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Ei(e, t, i, s);
    for (const o in e.propsOptions[0]) o in i || (i[o] = void 0);
    n ? e.props = r ? i : Ps(i) : e.type.props ? e.props = i : e.props = s, e.attrs = s;
  }
  function ho(e, t, n, r) {
    const { props: i, attrs: s, vnode: { patchFlag: o } } = e, c = j(i), [a] = e.propsOptions;
    let h = false;
    if ((r || o > 0) && !(o & 16)) {
      if (o & 8) {
        const u = e.vnode.dynamicProps;
        for (let _ = 0; _ < u.length; _++) {
          let S = u[_];
          if (ln(e.emitsOptions, S)) continue;
          const E = t[S];
          if (a) if ($(s, S)) E !== s[S] && (s[S] = E, h = true);
          else {
            const z = Ge(S);
            i[z] = In(a, c, z, E, e, false);
          }
          else E !== s[S] && (s[S] = E, h = true);
        }
      }
    } else {
      Ei(e, t, i, s) && (h = true);
      let u;
      for (const _ in c) (!t || !$(t, _) && ((u = tt(_)) === _ || !$(t, u))) && (a ? n && (n[_] !== void 0 || n[u] !== void 0) && (i[_] = In(a, c, _, void 0, e, true)) : delete i[_]);
      if (s !== c) for (const _ in s) (!t || !$(t, _)) && (delete s[_], h = true);
    }
    h && ze(e.attrs, "set", "");
  }
  function Ei(e, t, n, r) {
    const [i, s] = e.propsOptions;
    let o = false, c;
    if (t) for (let a in t) {
      if (yt(a)) continue;
      const h = t[a];
      let u;
      i && $(i, u = Ge(a)) ? !s || !s.includes(u) ? n[u] = h : (c || (c = {}))[u] = h : ln(e.emitsOptions, a) || (!(a in r) || h !== r[a]) && (r[a] = h, o = true);
    }
    if (s) {
      const a = j(n), h = c || Y;
      for (let u = 0; u < s.length; u++) {
        const _ = s[u];
        n[_] = In(i, a, _, h[_], e, !$(h, _));
      }
    }
    return o;
  }
  function In(e, t, n, r, i, s) {
    const o = e[n];
    if (o != null) {
      const c = $(o, "default");
      if (c && r === void 0) {
        const a = o.default;
        if (o.type !== Function && !o.skipFactory && I(a)) {
          const { propsDefaults: h } = i;
          if (n in h) r = h[n];
          else {
            const u = Ut(i);
            r = h[n] = a.call(null, t), u();
          }
        } else r = a;
        i.ce && i.ce._setProp(n, r);
      }
      o[0] && (s && !c ? r = false : o[1] && (r === "" || r === tt(n)) && (r = true));
    }
    return r;
  }
  const _o = /* @__PURE__ */ new WeakMap();
  function Ti(e, t, n = false) {
    const r = n ? _o : t.propsCache, i = r.get(e);
    if (i) return i;
    const s = e.props, o = {}, c = [];
    let a = false;
    if (!I(e)) {
      const u = (_) => {
        a = true;
        const [S, E] = Ti(_, t, true);
        se(o, S), E && c.push(...E);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!s && !a) return Z(e) && r.set(e, ct), ct;
    if (A(s)) for (let u = 0; u < s.length; u++) {
      const _ = Ge(s[u]);
      xr(_) && (o[_] = Y);
    }
    else if (s) for (const u in s) {
      const _ = Ge(u);
      if (xr(_)) {
        const S = s[u], E = o[_] = A(S) || I(S) ? {
          type: S
        } : se({}, S), z = E.type;
        let L = false, k = true;
        if (A(z)) for (let H = 0; H < z.length; ++H) {
          const G = z[H], J = I(G) && G.name;
          if (J === "Boolean") {
            L = true;
            break;
          } else J === "String" && (k = false);
        }
        else L = I(z) && z.name === "Boolean";
        E[0] = L, E[1] = k, (L || $(E, "default")) && c.push(_);
      }
    }
    const h = [
      o,
      c
    ];
    return Z(e) && r.set(e, h), h;
  }
  function xr(e) {
    return e[0] !== "$" && !yt(e);
  }
  const tr = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", nr = (e) => A(e) ? e.map(Me) : [
    Me(e)
  ], po = (e, t, n) => {
    if (t._n) return t;
    const r = Hs((...i) => nr(t(...i)), n);
    return r._c = false, r;
  }, Ci = (e, t, n) => {
    const r = e._ctx;
    for (const i in e) {
      if (tr(i)) continue;
      const s = e[i];
      if (I(s)) t[i] = po(i, s, r);
      else if (s != null) {
        const o = nr(s);
        t[i] = () => o;
      }
    }
  }, Pi = (e, t) => {
    const n = nr(t);
    e.slots.default = () => n;
  }, Mi = (e, t, n) => {
    for (const r in t) (n || !tr(r)) && (e[r] = t[r]);
  }, go = (e, t, n) => {
    const r = e.slots = wi();
    if (e.vnode.shapeFlag & 32) {
      const i = t.__;
      i && En(r, "__", i, true);
      const s = t._;
      s ? (Mi(r, t, n), n && En(r, "_", s, true)) : Ci(t, r);
    } else t && Pi(e, t);
  }, bo = (e, t, n) => {
    const { vnode: r, slots: i } = e;
    let s = true, o = Y;
    if (r.shapeFlag & 32) {
      const c = t._;
      c ? n && c === 1 ? s = false : Mi(i, t, n) : (s = !t.$stable, Ci(t, i)), o = t;
    } else t && (Pi(e, t), o = {
      default: 1
    });
    if (s) for (const c in i) !tr(c) && o[c] == null && delete i[c];
  }, pe = Ao;
  function mo(e) {
    return vo(e);
  }
  function vo(e, t) {
    const n = rn();
    n.__VUE__ = true;
    const { insert: r, remove: i, patchProp: s, createElement: o, createText: c, createComment: a, setText: h, setElementText: u, parentNode: _, nextSibling: S, setScopeId: E = Re, insertStaticContent: z } = e, L = (l, f, d, b = null, p = null, g = null, y = void 0, x = null, v = !!f.dynamicChildren) => {
      if (l === f) return;
      l && !mt(l, f) && (b = it(l), ee(l, p, g, true), l = null), f.patchFlag === -2 && (v = false, f.dynamicChildren = null);
      const { type: m, ref: C, shapeFlag: w } = f;
      switch (m) {
        case cn:
          k(l, f, d, b);
          break;
        case Ke:
          H(l, f, d, b);
          break;
        case vn:
          l == null && G(f, d, b, y);
          break;
        case Ue:
          Ye(l, f, d, b, p, g, y, x, v);
          break;
        default:
          w & 1 ? Q(l, f, d, b, p, g, y, x, v) : w & 6 ? F(l, f, d, b, p, g, y, x, v) : (w & 64 || w & 128) && m.process(l, f, d, b, p, g, y, x, v, pt);
      }
      C != null && p ? Tt(C, l && l.ref, g, f || l, !f) : C == null && l && l.ref != null && Tt(l.ref, null, g, l, true);
    }, k = (l, f, d, b) => {
      if (l == null) r(f.el = c(f.children), d, b);
      else {
        const p = f.el = l.el;
        f.children !== l.children && h(p, f.children);
      }
    }, H = (l, f, d, b) => {
      l == null ? r(f.el = a(f.children || ""), d, b) : f.el = l.el;
    }, G = (l, f, d, b) => {
      [l.el, l.anchor] = z(l.children, f, d, b, l.el, l.anchor);
    }, J = ({ el: l, anchor: f }, d, b) => {
      let p;
      for (; l && l !== f; ) p = S(l), r(l, d, b), l = p;
      r(f, d, b);
    }, P = ({ el: l, anchor: f }) => {
      let d;
      for (; l && l !== f; ) d = S(l), i(l), l = d;
      i(f);
    }, Q = (l, f, d, b, p, g, y, x, v) => {
      f.type === "svg" ? y = "svg" : f.type === "math" && (y = "mathml"), l == null ? xe(f, d, b, p, g, y, x, v) : nt(l, f, p, g, y, x, v);
    }, xe = (l, f, d, b, p, g, y, x) => {
      let v, m;
      const { props: C, shapeFlag: w, transition: T, dirs: M } = l;
      if (v = l.el = o(l.type, g, C && C.is, C), w & 8 ? u(v, l.children) : w & 16 && ye(l.children, v, null, b, p, bn(l, g), y, x), M && Je(l, null, b, "created"), be(v, l, l.scopeId, y, b), C) {
        for (const K in C) K !== "value" && !yt(K) && s(v, K, null, C[K], g, b);
        "value" in C && s(v, "value", null, C.value, g), (m = C.onVnodeBeforeMount) && Ce(m, b, l);
      }
      M && Je(l, null, b, "beforeMount");
      const B = xo(p, T);
      B && T.beforeEnter(v), r(v, f, d), ((m = C && C.onVnodeMounted) || B || M) && pe(() => {
        m && Ce(m, b, l), B && T.enter(v), M && Je(l, null, b, "mounted");
      }, p);
    }, be = (l, f, d, b, p) => {
      if (d && E(l, d), b) for (let g = 0; g < b.length; g++) E(l, b[g]);
      if (p) {
        let g = p.subTree;
        if (f === g || Di(g.type) && (g.ssContent === f || g.ssFallback === f)) {
          const y = p.vnode;
          be(l, y, y.scopeId, y.slotScopeIds, p.parent);
        }
      }
    }, ye = (l, f, d, b, p, g, y, x, v = 0) => {
      for (let m = v; m < l.length; m++) {
        const C = l[m] = x ? je(l[m]) : Me(l[m]);
        L(null, C, f, d, b, p, g, y, x);
      }
    }, nt = (l, f, d, b, p, g, y) => {
      const x = f.el = l.el;
      let { patchFlag: v, dynamicChildren: m, dirs: C } = f;
      v |= l.patchFlag & 16;
      const w = l.props || Y, T = f.props || Y;
      let M;
      if (d && Qe(d, false), (M = T.onVnodeBeforeUpdate) && Ce(M, d, f, l), C && Je(f, l, d, "beforeUpdate"), d && Qe(d, true), (w.innerHTML && T.innerHTML == null || w.textContent && T.textContent == null) && u(x, ""), m ? Ie(l.dynamicChildren, m, x, d, b, bn(f, p), g) : y || U(l, f, x, null, d, b, bn(f, p), g, false), v > 0) {
        if (v & 16) qe(x, w, T, d, p);
        else if (v & 2 && w.class !== T.class && s(x, "class", null, T.class, p), v & 4 && s(x, "style", w.style, T.style, p), v & 8) {
          const B = f.dynamicProps;
          for (let K = 0; K < B.length; K++) {
            const W = B[K], ae = w[W], ue = T[W];
            (ue !== ae || W === "value") && s(x, W, ae, ue, p, d);
          }
        }
        v & 1 && l.children !== f.children && u(x, f.children);
      } else !y && m == null && qe(x, w, T, d, p);
      ((M = T.onVnodeUpdated) || C) && pe(() => {
        M && Ce(M, d, f, l), C && Je(f, l, d, "updated");
      }, b);
    }, Ie = (l, f, d, b, p, g, y) => {
      for (let x = 0; x < f.length; x++) {
        const v = l[x], m = f[x], C = v.el && (v.type === Ue || !mt(v, m) || v.shapeFlag & 198) ? _(v.el) : d;
        L(v, m, C, null, b, p, g, y, true);
      }
    }, qe = (l, f, d, b, p) => {
      if (f !== d) {
        if (f !== Y) for (const g in f) !yt(g) && !(g in d) && s(l, g, f[g], null, p, b);
        for (const g in d) {
          if (yt(g)) continue;
          const y = d[g], x = f[g];
          y !== x && g !== "value" && s(l, g, x, y, p, b);
        }
        "value" in d && s(l, "value", f.value, d.value, p);
      }
    }, Ye = (l, f, d, b, p, g, y, x, v) => {
      const m = f.el = l ? l.el : c(""), C = f.anchor = l ? l.anchor : c("");
      let { patchFlag: w, dynamicChildren: T, slotScopeIds: M } = f;
      M && (x = x ? x.concat(M) : M), l == null ? (r(m, d, b), r(C, d, b), ye(f.children || [], d, C, p, g, y, x, v)) : w > 0 && w & 64 && T && l.dynamicChildren ? (Ie(l.dynamicChildren, T, d, p, g, y, x), (f.key != null || p && f === p.subTree) && Oi(l, f, true)) : U(l, f, d, C, p, g, y, x, v);
    }, F = (l, f, d, b, p, g, y, x, v) => {
      f.slotScopeIds = x, l == null ? f.shapeFlag & 512 ? p.ctx.activate(f, d, b, y, v) : O(f, d, b, p, g, y, v) : N(l, f, v);
    }, O = (l, f, d, b, p, g, y) => {
      const x = l.component = Ho(l, b, p);
      if (gi(l) && (x.ctx.renderer = pt), $o(x, false, y), x.asyncDep) {
        if (p && p.registerDep(x, X, y), !l.el) {
          const v = x.subTree = Ae(Ke);
          H(null, v, f, d), l.placeholder = v.el;
        }
      } else X(x, l, f, d, p, g, y);
    }, N = (l, f, d) => {
      const b = f.component = l.component;
      if (Oo(l, f, d)) if (b.asyncDep && !b.asyncResolved) {
        V(b, f, d);
        return;
      } else b.next = f, b.update();
      else f.el = l.el, b.vnode = f;
    }, X = (l, f, d, b, p, g, y) => {
      const x = () => {
        if (l.isMounted) {
          let { next: w, bu: T, u: M, parent: B, vnode: K } = l;
          {
            const Ee = Ri(l);
            if (Ee) {
              w && (w.el = K.el, V(l, w, y)), Ee.asyncDep.then(() => {
                l.isUnmounted || x();
              });
              return;
            }
          }
          let W = w, ae;
          Qe(l, false), w ? (w.el = K.el, V(l, w, y)) : w = K, T && un(T), (ae = w.props && w.props.onVnodeBeforeUpdate) && Ce(ae, B, w, K), Qe(l, true);
          const ue = wr(l), Se = l.subTree;
          l.subTree = ue, L(Se, ue, _(Se.el), it(Se), l, p, g), w.el = ue.el, W === null && Ro(l, ue.el), M && pe(M, p), (ae = w.props && w.props.onVnodeUpdated) && pe(() => Ce(ae, B, w, K), p);
        } else {
          let w;
          const { el: T, props: M } = f, { bm: B, m: K, parent: W, root: ae, type: ue } = l, Se = Ct(f);
          Qe(l, false), B && un(B), !Se && (w = M && M.onVnodeBeforeMount) && Ce(w, W, f), Qe(l, true);
          {
            ae.ce && ae.ce._def.shadowRoot !== false && ae.ce._injectChildStyle(ue);
            const Ee = l.subTree = wr(l);
            L(null, Ee, d, b, l, p, g), f.el = Ee.el;
          }
          if (K && pe(K, p), !Se && (w = M && M.onVnodeMounted)) {
            const Ee = f;
            pe(() => Ce(w, W, Ee), p);
          }
          (f.shapeFlag & 256 || W && Ct(W.vnode) && W.vnode.shapeFlag & 256) && l.a && pe(l.a, p), l.isMounted = true, f = d = b = null;
        }
      };
      l.scope.on();
      const v = l.effect = new qr(x);
      l.scope.off();
      const m = l.update = v.run.bind(v), C = l.job = v.runIfDirty.bind(v);
      C.i = l, C.id = l.uid, v.scheduler = () => Qn(C), Qe(l, true), m();
    }, V = (l, f, d) => {
      f.component = l;
      const b = l.vnode.props;
      l.vnode = f, l.next = null, ho(l, f.props, b, d), bo(l, f.children, d), Be(), pr(l), Ne();
    }, U = (l, f, d, b, p, g, y, x, v = false) => {
      const m = l && l.children, C = l ? l.shapeFlag : 0, w = f.children, { patchFlag: T, shapeFlag: M } = f;
      if (T > 0) {
        if (T & 128) {
          we(m, w, d, b, p, g, y, x, v);
          return;
        } else if (T & 256) {
          ne(m, w, d, b, p, g, y, x, v);
          return;
        }
      }
      M & 8 ? (C & 16 && Xe(m, p, g), w !== m && u(d, w)) : C & 16 ? M & 16 ? we(m, w, d, b, p, g, y, x, v) : Xe(m, p, g, true) : (C & 8 && u(d, ""), M & 16 && ye(w, d, b, p, g, y, x, v));
    }, ne = (l, f, d, b, p, g, y, x, v) => {
      l = l || ct, f = f || ct;
      const m = l.length, C = f.length, w = Math.min(m, C);
      let T;
      for (T = 0; T < w; T++) {
        const M = f[T] = v ? je(f[T]) : Me(f[T]);
        L(l[T], M, d, null, p, g, y, x, v);
      }
      m > C ? Xe(l, p, g, true, false, w) : ye(f, d, b, p, g, y, x, v, w);
    }, we = (l, f, d, b, p, g, y, x, v) => {
      let m = 0;
      const C = f.length;
      let w = l.length - 1, T = C - 1;
      for (; m <= w && m <= T; ) {
        const M = l[m], B = f[m] = v ? je(f[m]) : Me(f[m]);
        if (mt(M, B)) L(M, B, d, null, p, g, y, x, v);
        else break;
        m++;
      }
      for (; m <= w && m <= T; ) {
        const M = l[w], B = f[T] = v ? je(f[T]) : Me(f[T]);
        if (mt(M, B)) L(M, B, d, null, p, g, y, x, v);
        else break;
        w--, T--;
      }
      if (m > w) {
        if (m <= T) {
          const M = T + 1, B = M < C ? f[M].el : b;
          for (; m <= T; ) L(null, f[m] = v ? je(f[m]) : Me(f[m]), d, B, p, g, y, x, v), m++;
        }
      } else if (m > T) for (; m <= w; ) ee(l[m], p, g, true), m++;
      else {
        const M = m, B = m, K = /* @__PURE__ */ new Map();
        for (m = B; m <= T; m++) {
          const _e = f[m] = v ? je(f[m]) : Me(f[m]);
          _e.key != null && K.set(_e.key, m);
        }
        let W, ae = 0;
        const ue = T - B + 1;
        let Se = false, Ee = 0;
        const gt = new Array(ue);
        for (m = 0; m < ue; m++) gt[m] = 0;
        for (m = M; m <= w; m++) {
          const _e = l[m];
          if (ae >= ue) {
            ee(_e, p, g, true);
            continue;
          }
          let Te;
          if (_e.key != null) Te = K.get(_e.key);
          else for (W = B; W <= T; W++) if (gt[W - B] === 0 && mt(_e, f[W])) {
            Te = W;
            break;
          }
          Te === void 0 ? ee(_e, p, g, true) : (gt[Te - B] = m + 1, Te >= Ee ? Ee = Te : Se = true, L(_e, f[Te], d, null, p, g, y, x, v), ae++);
        }
        const fr = Se ? yo(gt) : ct;
        for (W = fr.length - 1, m = ue - 1; m >= 0; m--) {
          const _e = B + m, Te = f[_e], ar = f[_e + 1], ur = _e + 1 < C ? ar.el || ar.placeholder : b;
          gt[m] === 0 ? L(null, Te, d, ur, p, g, y, x, v) : Se && (W < 0 || m !== fr[W] ? he(Te, d, ur, 2) : W--);
        }
      }
    }, he = (l, f, d, b, p = null) => {
      const { el: g, type: y, transition: x, children: v, shapeFlag: m } = l;
      if (m & 6) {
        he(l.component.subTree, f, d, b);
        return;
      }
      if (m & 128) {
        l.suspense.move(f, d, b);
        return;
      }
      if (m & 64) {
        y.move(l, f, d, pt);
        return;
      }
      if (y === Ue) {
        r(g, f, d);
        for (let w = 0; w < v.length; w++) he(v[w], f, d, b);
        r(l.anchor, f, d);
        return;
      }
      if (y === vn) {
        J(l, f, d);
        return;
      }
      if (b !== 2 && m & 1 && x) if (b === 0) x.beforeEnter(g), r(g, f, d), pe(() => x.enter(g), p);
      else {
        const { leave: w, delayLeave: T, afterLeave: M } = x, B = () => {
          l.ctx.isUnmounted ? i(g) : r(g, f, d);
        }, K = () => {
          w(g, () => {
            B(), M && M();
          });
        };
        T ? T(g, B, K) : K();
      }
      else r(g, f, d);
    }, ee = (l, f, d, b = false, p = false) => {
      const { type: g, props: y, ref: x, children: v, dynamicChildren: m, shapeFlag: C, patchFlag: w, dirs: T, cacheIndex: M } = l;
      if (w === -2 && (p = false), x != null && (Be(), Tt(x, null, d, l, true), Ne()), M != null && (f.renderCache[M] = void 0), C & 256) {
        f.ctx.deactivate(l);
        return;
      }
      const B = C & 1 && T, K = !Ct(l);
      let W;
      if (K && (W = y && y.onVnodeBeforeUnmount) && Ce(W, f, l), C & 6) _t(l.component, d, b);
      else {
        if (C & 128) {
          l.suspense.unmount(d, b);
          return;
        }
        B && Je(l, null, f, "beforeUnmount"), C & 64 ? l.type.remove(l, f, d, pt, b) : m && !m.hasOnce && (g !== Ue || w > 0 && w & 64) ? Xe(m, f, d, false, true) : (g === Ue && w & 384 || !p && C & 16) && Xe(v, f, d), b && rt(l);
      }
      (K && (W = y && y.onVnodeUnmounted) || B) && pe(() => {
        W && Ce(W, f, l), B && Je(l, null, f, "unmounted");
      }, d);
    }, rt = (l) => {
      const { type: f, el: d, anchor: b, transition: p } = l;
      if (f === Ue) {
        ht(d, b);
        return;
      }
      if (f === vn) {
        P(l);
        return;
      }
      const g = () => {
        i(d), p && !p.persisted && p.afterLeave && p.afterLeave();
      };
      if (l.shapeFlag & 1 && p && !p.persisted) {
        const { leave: y, delayLeave: x } = p, v = () => y(d, g);
        x ? x(l.el, g, v) : v();
      } else g();
    }, ht = (l, f) => {
      let d;
      for (; l !== f; ) d = S(l), i(l), l = d;
      i(f);
    }, _t = (l, f, d) => {
      const { bum: b, scope: p, job: g, subTree: y, um: x, m: v, a: m, parent: C, slots: { __: w } } = l;
      yr(v), yr(m), b && un(b), C && A(w) && w.forEach((T) => {
        C.renderCache[T] = void 0;
      }), p.stop(), g && (g.flags |= 8, ee(y, l, f, d)), x && pe(x, f), pe(() => {
        l.isUnmounted = true;
      }, f), f && f.pendingBranch && !f.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
    }, Xe = (l, f, d, b = false, p = false, g = 0) => {
      for (let y = g; y < l.length; y++) ee(l[y], f, d, b, p);
    }, it = (l) => {
      if (l.shapeFlag & 6) return it(l.component.subTree);
      if (l.shapeFlag & 128) return l.suspense.next();
      const f = S(l.anchor || l.el), d = f && f[js];
      return d ? S(d) : f;
    };
    let fn = false;
    const cr = (l, f, d) => {
      l == null ? f._vnode && ee(f._vnode, null, null, true) : L(f._vnode || null, l, f, null, null, null, d), f._vnode = l, fn || (fn = true, pr(), ui(), fn = false);
    }, pt = {
      p: L,
      um: ee,
      m: he,
      r: rt,
      mt: O,
      mc: ye,
      pc: U,
      pbc: Ie,
      n: it,
      o: e
    };
    return {
      render: cr,
      hydrate: void 0,
      createApp: fo(cr)
    };
  }
  function bn({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function Qe({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function xo(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function Oi(e, t, n = false) {
    const r = e.children, i = t.children;
    if (A(r) && A(i)) for (let s = 0; s < r.length; s++) {
      const o = r[s];
      let c = i[s];
      c.shapeFlag & 1 && !c.dynamicChildren && ((c.patchFlag <= 0 || c.patchFlag === 32) && (c = i[s] = je(i[s]), c.el = o.el), !n && c.patchFlag !== -2 && Oi(o, c)), c.type === cn && (c.el = o.el), c.type === Ke && !c.el && (c.el = o.el);
    }
  }
  function yo(e) {
    const t = e.slice(), n = [
      0
    ];
    let r, i, s, o, c;
    const a = e.length;
    for (r = 0; r < a; r++) {
      const h = e[r];
      if (h !== 0) {
        if (i = n[n.length - 1], e[i] < h) {
          t[r] = i, n.push(r);
          continue;
        }
        for (s = 0, o = n.length - 1; s < o; ) c = s + o >> 1, e[n[c]] < h ? s = c + 1 : o = c;
        h < e[n[s]] && (s > 0 && (t[r] = n[s - 1]), n[s] = r);
      }
    }
    for (s = n.length, o = n[s - 1]; s-- > 0; ) n[s] = o, o = t[o];
    return n;
  }
  function Ri(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : Ri(t);
  }
  function yr(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  const wo = Symbol.for("v-scx"), So = () => $t(wo);
  function mn(e, t, n) {
    return Ai(e, t, n);
  }
  function Ai(e, t, n = Y) {
    const { immediate: r, deep: i, flush: s, once: o } = n, c = se({}, n), a = t && r || !t && s !== "post";
    let h;
    if (Dt) {
      if (s === "sync") {
        const E = So();
        h = E.__watcherHandles || (E.__watcherHandles = []);
      } else if (!a) {
        const E = () => {
        };
        return E.stop = Re, E.resume = Re, E.pause = Re, E;
      }
    }
    const u = fe;
    c.call = (E, z, L) => Fe(E, u, z, L);
    let _ = false;
    s === "post" ? c.scheduler = (E) => {
      pe(E, u && u.suspense);
    } : s !== "sync" && (_ = true, c.scheduler = (E, z) => {
      z ? E() : Qn(E);
    }), c.augmentJob = (E) => {
      t && (E.flags |= 4), _ && (E.flags |= 2, u && (E.id = u.uid, E.i = u));
    };
    const S = Us(e, t, c);
    return Dt && (h ? h.push(S) : a && S()), S;
  }
  function Eo(e, t, n) {
    const r = this.proxy, i = te(e) ? e.includes(".") ? Fi(r, e) : () => r[e] : e.bind(r, r);
    let s;
    I(t) ? s = t : (s = t.handler, n = t);
    const o = Ut(this), c = Ai(i, s.bind(r), n);
    return o(), c;
  }
  function Fi(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let i = 0; i < n.length && r; i++) r = r[n[i]];
      return r;
    };
  }
  const To = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Ge(t)}Modifiers`] || e[`${tt(t)}Modifiers`];
  function Co(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || Y;
    let i = n;
    const s = t.startsWith("update:"), o = s && To(r, t.slice(7));
    o && (o.trim && (i = n.map((u) => te(u) ? u.trim() : u)), o.number && (i = n.map(es)));
    let c, a = r[c = an(t)] || r[c = an(Ge(t))];
    !a && s && (a = r[c = an(tt(t))]), a && Fe(a, e, 6, i);
    const h = r[c + "Once"];
    if (h) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[c]) return;
      e.emitted[c] = true, Fe(h, e, 6, i);
    }
  }
  function Ii(e, t, n = false) {
    const r = t.emitsCache, i = r.get(e);
    if (i !== void 0) return i;
    const s = e.emits;
    let o = {}, c = false;
    if (!I(e)) {
      const a = (h) => {
        const u = Ii(h, t, true);
        u && (c = true, se(o, u));
      };
      !n && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
    }
    return !s && !c ? (Z(e) && r.set(e, null), null) : (A(s) ? s.forEach((a) => o[a] = null) : se(o, s), Z(e) && r.set(e, o), o);
  }
  function ln(e, t) {
    return !e || !en(t) ? false : (t = t.slice(2).replace(/Once$/, ""), $(e, t[0].toLowerCase() + t.slice(1)) || $(e, tt(t)) || $(e, t));
  }
  function wr(e) {
    const { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [s], slots: o, attrs: c, emit: a, render: h, renderCache: u, props: _, data: S, setupState: E, ctx: z, inheritAttrs: L } = e, k = Qt(e);
    let H, G;
    try {
      if (n.shapeFlag & 4) {
        const P = i || r, Q = P;
        H = Me(h.call(Q, P, u, _, E, S, z)), G = c;
      } else {
        const P = t;
        H = Me(P.length > 1 ? P(_, {
          attrs: c,
          slots: o,
          emit: a
        }) : P(_, null)), G = t.props ? c : Po(c);
      }
    } catch (P) {
      Mt.length = 0, sn(P, e, 1), H = Ae(Ke);
    }
    let J = H;
    if (G && L !== false) {
      const P = Object.keys(G), { shapeFlag: Q } = J;
      P.length && Q & 7 && (s && P.some(zn) && (G = Mo(G, s)), J = ut(J, G, false, true));
    }
    return n.dirs && (J = ut(J, null, false, true), J.dirs = J.dirs ? J.dirs.concat(n.dirs) : n.dirs), n.transition && Zn(J, n.transition), H = J, Qt(k), H;
  }
  const Po = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || en(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Mo = (e, t) => {
    const n = {};
    for (const r in e) (!zn(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function Oo(e, t, n) {
    const { props: r, children: i, component: s } = e, { props: o, children: c, patchFlag: a } = t, h = s.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && a >= 0) {
      if (a & 1024) return true;
      if (a & 16) return r ? Sr(r, o, h) : !!o;
      if (a & 8) {
        const u = t.dynamicProps;
        for (let _ = 0; _ < u.length; _++) {
          const S = u[_];
          if (o[S] !== r[S] && !ln(h, S)) return true;
        }
      }
    } else return (i || c) && (!c || !c.$stable) ? true : r === o ? false : r ? o ? Sr(r, o, h) : true : !!o;
    return false;
  }
  function Sr(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let i = 0; i < r.length; i++) {
      const s = r[i];
      if (t[s] !== e[s] && !ln(n, s)) return true;
    }
    return false;
  }
  function Ro({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Di = (e) => e.__isSuspense;
  function Ao(e, t) {
    t && t.pendingBranch ? A(e) ? t.effects.push(...e) : t.effects.push(e) : Vs(e);
  }
  const Ue = Symbol.for("v-fgt"), cn = Symbol.for("v-txt"), Ke = Symbol.for("v-cmt"), vn = Symbol.for("v-stc"), Mt = [];
  let ge = null;
  function rr(e = false) {
    Mt.push(ge = e ? null : []);
  }
  function Fo() {
    Mt.pop(), ge = Mt[Mt.length - 1] || null;
  }
  let It = 1;
  function Er(e, t = false) {
    It += e, e < 0 && ge && t && (ge.hasOnce = true);
  }
  function Li(e) {
    return e.dynamicChildren = It > 0 ? ge || ct : null, Fo(), It > 0 && ge && ge.push(e), e;
  }
  function Ui(e, t, n, r, i, s) {
    return Li(ir(e, t, n, r, i, s, true));
  }
  function Io(e, t, n, r, i) {
    return Li(Ae(e, t, n, r, i, true));
  }
  function zi(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function mt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const Bi = ({ key: e }) => e ?? null, Wt = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? te(e) || ie(e) || I(e) ? {
    i: Oe,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function ir(e, t = null, n = null, r = 0, i = null, s = e === Ue ? 0 : 1, o = false, c = false) {
    const a = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && Bi(t),
      ref: t && Wt(t),
      scopeId: hi,
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
      shapeFlag: s,
      patchFlag: r,
      dynamicProps: i,
      dynamicChildren: null,
      appContext: null,
      ctx: Oe
    };
    return c ? (sr(a, n), s & 128 && e.normalize(a)) : n && (a.shapeFlag |= te(n) ? 8 : 16), It > 0 && !o && ge && (a.patchFlag > 0 || s & 6) && a.patchFlag !== 32 && ge.push(a), a;
  }
  const Ae = Do;
  function Do(e, t = null, n = null, r = 0, i = null, s = false) {
    if ((!e || e === to) && (e = Ke), zi(e)) {
      const c = ut(e, t, true);
      return n && sr(c, n), It > 0 && !s && ge && (c.shapeFlag & 6 ? ge[ge.indexOf(e)] = c : ge.push(c)), c.patchFlag = -2, c;
    }
    if (qo(e) && (e = e.__vccOpts), t) {
      t = Lo(t);
      let { class: c, style: a } = t;
      c && !te(c) && (t.class = Hn(c)), Z(a) && (Jn(a) && !A(a) && (a = se({}, a)), t.style = Vn(a));
    }
    const o = te(e) ? 1 : Di(e) ? 128 : $s(e) ? 64 : Z(e) ? 4 : I(e) ? 2 : 0;
    return ir(e, t, n, r, i, o, s, true);
  }
  function Lo(e) {
    return e ? Jn(e) || Si(e) ? se({}, e) : e : null;
  }
  function ut(e, t, n = false, r = false) {
    const { props: i, ref: s, patchFlag: o, children: c, transition: a } = e, h = t ? Bo(i || {}, t) : i, u = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: h,
      key: h && Bi(h),
      ref: t && t.ref ? n && s ? A(s) ? s.concat(Wt(t)) : [
        s,
        Wt(t)
      ] : Wt(t) : s,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: c,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== Ue ? o === -1 ? 16 : o | 16 : o,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: a,
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
    return a && r && Zn(u, a.clone(u)), u;
  }
  function Uo(e = " ", t = 0) {
    return Ae(cn, null, e, t);
  }
  function zo(e = "", t = false) {
    return t ? (rr(), Io(Ke, null, e)) : Ae(Ke, null, e);
  }
  function Me(e) {
    return e == null || typeof e == "boolean" ? Ae(Ke) : A(e) ? Ae(Ue, null, e.slice()) : zi(e) ? je(e) : Ae(cn, null, String(e));
  }
  function je(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : ut(e);
  }
  function sr(e, t) {
    let n = 0;
    const { shapeFlag: r } = e;
    if (t == null) t = null;
    else if (A(t)) n = 16;
    else if (typeof t == "object") if (r & 65) {
      const i = t.default;
      i && (i._c && (i._d = false), sr(e, i()), i._c && (i._d = true));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !Si(t) ? t._ctx = Oe : i === 3 && Oe && (Oe.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else I(t) ? (t = {
      default: t,
      _ctx: Oe
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      Uo(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function Bo(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const i in r) if (i === "class") t.class !== r.class && (t.class = Hn([
        t.class,
        r.class
      ]));
      else if (i === "style") t.style = Vn([
        t.style,
        r.style
      ]);
      else if (en(i)) {
        const s = t[i], o = r[i];
        o && s !== o && !(A(s) && s.includes(o)) && (t[i] = s ? [].concat(s, o) : o);
      } else i !== "" && (t[i] = r[i]);
    }
    return t;
  }
  function Ce(e, t, n, r = null) {
    Fe(e, t, 7, [
      n,
      r
    ]);
  }
  const No = xi();
  let Vo = 0;
  function Ho(e, t, n) {
    const r = e.type, i = (t ? t.appContext : e.appContext) || No, s = {
      uid: Vo++,
      vnode: e,
      type: r,
      parent: t,
      appContext: i,
      root: null,
      next: null,
      subTree: null,
      effect: null,
      update: null,
      job: null,
      scope: new ls(true),
      render: null,
      proxy: null,
      exposed: null,
      exposeProxy: null,
      withProxy: null,
      provides: t ? t.provides : Object.create(i.provides),
      ids: t ? t.ids : [
        "",
        0,
        0
      ],
      accessCache: null,
      renderCache: [],
      components: null,
      directives: null,
      propsOptions: Ti(r, i),
      emitsOptions: Ii(r, i),
      emit: null,
      emitted: null,
      propsDefaults: Y,
      inheritAttrs: r.inheritAttrs,
      ctx: Y,
      data: Y,
      props: Y,
      attrs: Y,
      slots: Y,
      refs: Y,
      setupState: Y,
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
    return s.ctx = {
      _: s
    }, s.root = t ? t.root : s, s.emit = Co.bind(null, s), e.ce && e.ce(s), s;
  }
  let fe = null;
  const jo = () => fe || Oe;
  let kt, Dn;
  {
    const e = rn(), t = (n, r) => {
      let i;
      return (i = e[n]) || (i = e[n] = []), i.push(r), (s) => {
        i.length > 1 ? i.forEach((o) => o(s)) : i[0](s);
      };
    };
    kt = t("__VUE_INSTANCE_SETTERS__", (n) => fe = n), Dn = t("__VUE_SSR_SETTERS__", (n) => Dt = n);
  }
  const Ut = (e) => {
    const t = fe;
    return kt(e), e.scope.on(), () => {
      e.scope.off(), kt(t);
    };
  }, Tr = () => {
    fe && fe.scope.off(), kt(null);
  };
  function Ni(e) {
    return e.vnode.shapeFlag & 4;
  }
  let Dt = false;
  function $o(e, t = false, n = false) {
    t && Dn(t);
    const { props: r, children: i } = e.vnode, s = Ni(e);
    uo(e, r, s, t), go(e, i, n || t);
    const o = s ? Wo(e, t) : void 0;
    return t && Dn(false), o;
  }
  function Wo(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, no);
    const { setup: r } = n;
    if (r) {
      Be();
      const i = e.setupContext = r.length > 1 ? Ko(e) : null, s = Ut(e), o = Lt(r, e, 0, [
        e.props,
        i
      ]), c = Wr(o);
      if (Ne(), s(), (c || e.sp) && !Ct(e) && pi(e), c) {
        if (o.then(Tr, Tr), t) return o.then((a) => {
          Cr(e, a);
        }).catch((a) => {
          sn(a, e, 0);
        });
        e.asyncDep = o;
      } else Cr(e, o);
    } else Vi(e);
  }
  function Cr(e, t, n) {
    I(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Z(t) && (e.setupState = ci(t)), Vi(e);
  }
  function Vi(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || Re);
    {
      const i = Ut(e);
      Be();
      try {
        ro(e);
      } finally {
        Ne(), i();
      }
    }
  }
  const Go = {
    get(e, t) {
      return re(e, "get", ""), e[t];
    }
  };
  function Ko(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, Go),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function or(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(ci(Ms(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in Pt) return Pt[n](e);
      },
      has(t, n) {
        return n in t || n in Pt;
      }
    })) : e.proxy;
  }
  function qo(e) {
    return I(e) && "__vccOpts" in e;
  }
  const Yo = (e, t) => Ds(e, t, Dt), Xo = "3.5.18";
  let Ln;
  const Pr = typeof window < "u" && window.trustedTypes;
  if (Pr) try {
    Ln = Pr.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const Hi = Ln ? (e) => Ln.createHTML(e) : (e) => e, Jo = "http://www.w3.org/2000/svg", Qo = "http://www.w3.org/1998/Math/MathML", Le = typeof document < "u" ? document : null, Mr = Le && Le.createElement("template"), Zo = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const i = t === "svg" ? Le.createElementNS(Jo, e) : t === "mathml" ? Le.createElementNS(Qo, e) : n ? Le.createElement(e, {
        is: n
      }) : Le.createElement(e);
      return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
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
    insertStaticContent(e, t, n, r, i, s) {
      const o = n ? n.previousSibling : t.lastChild;
      if (i && (i === s || i.nextSibling)) for (; t.insertBefore(i.cloneNode(true), n), !(i === s || !(i = i.nextSibling)); ) ;
      else {
        Mr.innerHTML = Hi(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const c = Mr.content;
        if (r === "svg" || r === "mathml") {
          const a = c.firstChild;
          for (; a.firstChild; ) c.appendChild(a.firstChild);
          c.removeChild(a);
        }
        t.insertBefore(c, n);
      }
      return [
        o ? o.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild
      ];
    }
  }, ko = Symbol("_vtc");
  function el(e, t, n) {
    const r = e[ko];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const Or = Symbol("_vod"), tl = Symbol("_vsh"), nl = Symbol(""), rl = /(^|;)\s*display\s*:/;
  function il(e, t, n) {
    const r = e.style, i = te(n);
    let s = false;
    if (n && !i) {
      if (t) if (te(t)) for (const o of t.split(";")) {
        const c = o.slice(0, o.indexOf(":")).trim();
        n[c] == null && Gt(r, c, "");
      }
      else for (const o in t) n[o] == null && Gt(r, o, "");
      for (const o in n) o === "display" && (s = true), Gt(r, o, n[o]);
    } else if (i) {
      if (t !== n) {
        const o = r[nl];
        o && (n += ";" + o), r.cssText = n, s = rl.test(n);
      }
    } else t && e.removeAttribute("style");
    Or in e && (e[Or] = s ? r.display : "", e[tl] && (r.display = "none"));
  }
  const Rr = /\s*!important$/;
  function Gt(e, t, n) {
    if (A(n)) n.forEach((r) => Gt(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = sl(e, t);
      Rr.test(n) ? e.setProperty(tt(r), n.replace(Rr, ""), "important") : e[r] = n;
    }
  }
  const Ar = [
    "Webkit",
    "Moz",
    "ms"
  ], xn = {};
  function sl(e, t) {
    const n = xn[t];
    if (n) return n;
    let r = Ge(t);
    if (r !== "filter" && r in e) return xn[t] = r;
    r = Gr(r);
    for (let i = 0; i < Ar.length; i++) {
      const s = Ar[i] + r;
      if (s in e) return xn[t] = s;
    }
    return t;
  }
  const Fr = "http://www.w3.org/1999/xlink";
  function Ir(e, t, n, r, i, s = os(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Fr, t.slice(6, t.length)) : e.setAttributeNS(Fr, t, n) : n == null || s && !Kr(n) ? e.removeAttribute(t) : e.setAttribute(t, s ? "" : dt(n) ? String(n) : n);
  }
  function Dr(e, t, n, r, i) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? Hi(n) : n);
      return;
    }
    const s = e.tagName;
    if (t === "value" && s !== "PROGRESS" && !s.includes("-")) {
      const c = s === "OPTION" ? e.getAttribute("value") || "" : e.value, a = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
      (c !== a || !("_value" in e)) && (e.value = a), n == null && e.removeAttribute(t), e._value = n;
      return;
    }
    let o = false;
    if (n === "" || n == null) {
      const c = typeof e[t];
      c === "boolean" ? n = Kr(n) : n == null && c === "string" ? (n = "", o = true) : c === "number" && (n = 0, o = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    o && e.removeAttribute(i || t);
  }
  function ol(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function ll(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const Lr = Symbol("_vei");
  function cl(e, t, n, r, i = null) {
    const s = e[Lr] || (e[Lr] = {}), o = s[t];
    if (r && o) o.value = r;
    else {
      const [c, a] = fl(t);
      if (r) {
        const h = s[t] = dl(r, i);
        ol(e, c, h, a);
      } else o && (ll(e, c, o, a), s[t] = void 0);
    }
  }
  const Ur = /(?:Once|Passive|Capture)$/;
  function fl(e) {
    let t;
    if (Ur.test(e)) {
      t = {};
      let r;
      for (; r = e.match(Ur); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : tt(e.slice(2)),
      t
    ];
  }
  let yn = 0;
  const al = Promise.resolve(), ul = () => yn || (al.then(() => yn = 0), yn = Date.now());
  function dl(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Fe(hl(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = ul(), n;
  }
  function hl(e, t) {
    if (A(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (i) => !i._stopped && r && r(i));
    } else return t;
  }
  const zr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, _l = (e, t, n, r, i, s) => {
    const o = i === "svg";
    t === "class" ? el(e, r, o) : t === "style" ? il(e, n, r) : en(t) ? zn(t) || cl(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : pl(e, t, r, o)) ? (Dr(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Ir(e, t, r, o, s, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !te(r)) ? Dr(e, Ge(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), Ir(e, t, r, o));
  };
  function pl(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && zr(t) && I(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const i = e.tagName;
      if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE") return false;
    }
    return zr(t) && te(n) ? false : t in e;
  }
  const gl = se({
    patchProp: _l
  }, Zo);
  let Br;
  function bl() {
    return Br || (Br = mo(gl));
  }
  const ml = (...e) => {
    const t = bl().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const i = xl(r);
      if (!i) return;
      const s = t._component;
      !I(s) && !s.render && !s.template && (s.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
      const o = n(i, false, vl(i));
      return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), o;
    }, t;
  };
  function vl(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function xl(e) {
    return te(e) ? document.querySelector(e) : e;
  }
  const yl = `
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











`, wl = `struct Uniforms {
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
}`, Sl = "" + new URL("mandelbrot_bg-DAE68oDn.wasm", import.meta.url).href, El = async (e = {}, t) => {
    let n;
    if (t.startsWith("data:")) {
      const r = t.replace(/^data:.*?base64,/, "");
      let i;
      if (typeof Buffer == "function" && typeof Buffer.from == "function") i = Buffer.from(r, "base64");
      else if (typeof atob == "function") {
        const s = atob(r);
        i = new Uint8Array(s.length);
        for (let o = 0; o < s.length; o++) i[o] = s.charCodeAt(o);
      } else throw new Error("Cannot decode base64-encoded data URL");
      n = await WebAssembly.instantiate(i, e);
    } else {
      const r = await fetch(t), i = r.headers.get("Content-Type") || "";
      if ("instantiateStreaming" in WebAssembly && i.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(r, e);
      else {
        const s = await r.arrayBuffer();
        n = await WebAssembly.instantiate(s, e);
      }
    }
    return n.instance.exports;
  };
  let R;
  function Tl(e) {
    R = e;
  }
  let Vt = null;
  function Kt() {
    return (Vt === null || Vt.byteLength === 0) && (Vt = new Uint8Array(R.memory.buffer)), Vt;
  }
  const ji = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
  let qt = new ji("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  qt.decode();
  const Cl = 2146435072;
  let wn = 0;
  function Pl(e, t) {
    return wn += t, wn >= Cl && (qt = new ji("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), qt.decode(), wn = t), qt.decode(Kt().subarray(e, e + t));
  }
  function $i(e, t) {
    return e = e >>> 0, Pl(e, t);
  }
  let Ht = null;
  function Ml() {
    return (Ht === null || Ht.byteLength === 0) && (Ht = new Float64Array(R.memory.buffer)), Ht;
  }
  function Ol(e, t) {
    return e = e >>> 0, Ml().subarray(e / 8, e / 8 + t);
  }
  let ot = null;
  function Rl() {
    return (ot === null || ot.buffer.detached === true || ot.buffer.detached === void 0 && ot.buffer !== R.memory.buffer) && (ot = new DataView(R.memory.buffer)), ot;
  }
  function Al(e, t) {
    e = e >>> 0;
    const n = Rl(), r = [];
    for (let i = e; i < e + 4 * t; i += 4) r.push(R.__wbindgen_export_0.get(n.getUint32(i, true)));
    return R.__externref_drop_slice(e, t), r;
  }
  let Ot = 0;
  const Fl = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder, Yt = new Fl("utf-8"), Il = typeof Yt.encodeInto == "function" ? function(e, t) {
    return Yt.encodeInto(e, t);
  } : function(e, t) {
    const n = Yt.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  };
  function Sn(e, t, n) {
    if (n === void 0) {
      const c = Yt.encode(e), a = t(c.length, 1) >>> 0;
      return Kt().subarray(a, a + c.length).set(c), Ot = c.length, a;
    }
    let r = e.length, i = t(r, 1) >>> 0;
    const s = Kt();
    let o = 0;
    for (; o < r; o++) {
      const c = e.charCodeAt(o);
      if (c > 127) break;
      s[i + o] = c;
    }
    if (o !== r) {
      o !== 0 && (e = e.slice(o)), i = n(i, r, r = o + e.length * 3, 1) >>> 0;
      const c = Kt().subarray(i + o, i + r), a = Il(e, c);
      o += a.written, i = n(i, r, o, 1) >>> 0;
    }
    return Ot = o, i;
  }
  const Nr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => R.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  let Dl = class {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Nr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      R.__wbg_mandelbrotnavigator_free(t, 0);
    }
    constructor(t, n, r, i, s) {
      const o = R.mandelbrotnavigator_new(t, n, r, i, s);
      return this.__wbg_ptr = o >>> 0, Nr.register(this, this.__wbg_ptr, this), this;
    }
    translate(t, n) {
      R.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
    rotate(t) {
      R.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      R.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    rotate_direct(t) {
      R.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    zoom(t) {
      R.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    step() {
      const t = R.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = Ol(t[0], t[1]).slice();
      return R.__wbindgen_free(t[0], t[1] * 8, 8), n;
    }
    get_params() {
      const t = R.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = Al(t[0], t[1]).slice();
      return R.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    compute_reference_orbit_ptr(t) {
      const n = R.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return lr.__wrap(n);
    }
    get_reference_orbit_len() {
      return R.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    get_reference_orbit_capacity() {
      return R.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    scale(t) {
      const n = Sn(t, R.__wbindgen_malloc, R.__wbindgen_realloc), r = Ot;
      R.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
    }
    angle(t) {
      R.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    origin(t, n) {
      const r = Sn(t, R.__wbindgen_malloc, R.__wbindgen_realloc), i = Ot, s = Sn(n, R.__wbindgen_malloc, R.__wbindgen_realloc), o = Ot;
      R.mandelbrotnavigator_origin(this.__wbg_ptr, r, i, s, o);
    }
  };
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => R.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const Vr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => R.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class lr {
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(lr.prototype);
      return n.__wbg_ptr = t, Vr.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Vr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      R.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      return R.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      R.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      return R.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      R.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      return R.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      R.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  function Ll(e) {
    console.debug(e);
  }
  function Ul(e) {
    console.error(e);
  }
  function zl(e) {
    console.info(e);
  }
  function Bl(e) {
    console.log(e);
  }
  function Nl() {
    return Date.now();
  }
  function Vl(e) {
    console.warn(e);
  }
  function Hl() {
    const e = R.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  function jl(e, t) {
    return $i(e, t);
  }
  function $l(e, t) {
    throw new Error($i(e, t));
  }
  URL = globalThis.URL;
  const D = await El({
    "./mandelbrot_bg.js": {
      __wbindgen_string_new: jl,
      __wbg_debug_58d16ea352cfbca1: Ll,
      __wbg_error_51ecdd39ec054205: Ul,
      __wbg_info_e56933705c348038: zl,
      __wbg_log_ea240990d83e374e: Bl,
      __wbg_warn_d89f6637da554c8d: Vl,
      __wbg_now_eb0821f3bd9f6529: Nl,
      __wbindgen_throw: $l,
      __wbindgen_init_externref_table: Hl
    }
  }, Sl), Wi = D.memory, Wl = D.__wbg_mandelbrotstep_free, Gl = D.__wbg_get_mandelbrotstep_zx, Kl = D.__wbg_set_mandelbrotstep_zx, ql = D.__wbg_get_mandelbrotstep_zy, Yl = D.__wbg_set_mandelbrotstep_zy, Xl = D.__wbg_get_mandelbrotstep_dx, Jl = D.__wbg_set_mandelbrotstep_dx, Ql = D.__wbg_get_mandelbrotstep_dy, Zl = D.__wbg_set_mandelbrotstep_dy, kl = D.__wbg_mandelbrotnavigator_free, ec = D.mandelbrotnavigator_new, tc = D.mandelbrotnavigator_translate, nc = D.mandelbrotnavigator_rotate, rc = D.mandelbrotnavigator_translate_direct, ic = D.mandelbrotnavigator_rotate_direct, sc = D.mandelbrotnavigator_zoom, oc = D.mandelbrotnavigator_step, lc = D.mandelbrotnavigator_get_params, cc = D.mandelbrotnavigator_compute_reference_orbit_ptr, fc = D.mandelbrotnavigator_get_reference_orbit_len, ac = D.mandelbrotnavigator_get_reference_orbit_capacity, uc = D.mandelbrotnavigator_scale, dc = D.mandelbrotnavigator_angle, hc = D.mandelbrotnavigator_origin, _c = D.__wbg_orbitbufferinfo_free, pc = D.__wbg_get_orbitbufferinfo_ptr, gc = D.__wbg_set_orbitbufferinfo_ptr, bc = D.__wbg_get_orbitbufferinfo_offset, mc = D.__wbg_set_orbitbufferinfo_offset, vc = D.__wbg_get_orbitbufferinfo_count, xc = D.__wbg_set_orbitbufferinfo_count, yc = D.__wbindgen_export_0, wc = D.__wbindgen_free, Sc = D.__externref_drop_slice, Ec = D.__wbindgen_malloc, Tc = D.__wbindgen_realloc, Gi = D.__wbindgen_start, Cc = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: Sc,
    __wbg_get_mandelbrotstep_dx: Xl,
    __wbg_get_mandelbrotstep_dy: Ql,
    __wbg_get_mandelbrotstep_zx: Gl,
    __wbg_get_mandelbrotstep_zy: ql,
    __wbg_get_orbitbufferinfo_count: vc,
    __wbg_get_orbitbufferinfo_offset: bc,
    __wbg_get_orbitbufferinfo_ptr: pc,
    __wbg_mandelbrotnavigator_free: kl,
    __wbg_mandelbrotstep_free: Wl,
    __wbg_orbitbufferinfo_free: _c,
    __wbg_set_mandelbrotstep_dx: Jl,
    __wbg_set_mandelbrotstep_dy: Zl,
    __wbg_set_mandelbrotstep_zx: Kl,
    __wbg_set_mandelbrotstep_zy: Yl,
    __wbg_set_orbitbufferinfo_count: xc,
    __wbg_set_orbitbufferinfo_offset: mc,
    __wbg_set_orbitbufferinfo_ptr: gc,
    __wbindgen_export_0: yc,
    __wbindgen_free: wc,
    __wbindgen_malloc: Ec,
    __wbindgen_realloc: Tc,
    __wbindgen_start: Gi,
    mandelbrotnavigator_angle: dc,
    mandelbrotnavigator_compute_reference_orbit_ptr: cc,
    mandelbrotnavigator_get_params: lc,
    mandelbrotnavigator_get_reference_orbit_capacity: ac,
    mandelbrotnavigator_get_reference_orbit_len: fc,
    mandelbrotnavigator_new: ec,
    mandelbrotnavigator_origin: hc,
    mandelbrotnavigator_rotate: nc,
    mandelbrotnavigator_rotate_direct: ic,
    mandelbrotnavigator_scale: uc,
    mandelbrotnavigator_step: oc,
    mandelbrotnavigator_translate: tc,
    mandelbrotnavigator_translate_direct: rc,
    mandelbrotnavigator_zoom: sc,
    memory: Wi
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  Tl(Cc);
  Gi();
  class Pc {
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
      this.canvas = t, this.shaderPass1 = yl, this.shaderPass2 = wl, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
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
      var _a, _b;
      const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) ?? this.canvas.clientWidth, i = (n == null ? void 0 : n.clientHeight) ?? this.canvas.clientHeight;
      if (this.width = Math.max(1, Math.round(r * t)), this.height = Math.max(1, Math.round(i * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = i + "px", this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.intermediateTexture && ((_b = (_a = this.intermediateTexture).destroy) == null ? void 0 : _b.call(_a)), this.intermediateTexture = this.device.createTexture({
        size: {
          width: this.width,
          height: this.height,
          depthOrArrayLayers: 1
        },
        format: "rgba16float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        label: "Engine IntermediateTexture"
      }), this.intermediateView = this.intermediateTexture.createView(), this.intermediateView.label = "Engine IntermediateTextureView", this.pipeline2) {
        const s = this.pipeline2.getBindGroupLayout(0);
        s.label = "Engine IntermediateTextureView";
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
          layout: s,
          entries: o,
          label: "Engine BindGroup Color Pass"
        });
      }
    }
    areObjectsEqual(t, n) {
      const r = Object.keys(t), i = Object.keys(n);
      if (r.length !== i.length) return false;
      for (const s of r) if (t[s] !== n[s]) return false;
      return true;
    }
    update(t, n) {
      if (this.previousMandelbrot) {
        const u = this.needRender;
        this.needRender = !this.areObjectsEqual(t, this.previousMandelbrot), this.needRender ? this.extraFrames = 2 : u && this.needRender;
      }
      if (!this.needRender && this.extraFrames <= 0) return;
      const r = this.width / Math.max(1, this.height), i = new Float32Array([
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
      this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, i.buffer);
      let s = this.previousMandelbrot.scale / t.scale;
      s < 1 && (s = 1 / s), s = Math.sqrt(s) - 1;
      const o = new Float32Array([
        n.palettePeriod,
        s,
        0,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferColor, 0, o.buffer);
      const c = Math.ceil(t.maxIterations);
      let a = this.mandelbrotNavigator.compute_reference_orbit_ptr(c);
      const h = new Float32Array(Wi.buffer, a.ptr, a.count * 4);
      a.offset < c && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, h, 0), this.previousMandelbrot = t;
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
      const r = this.ctx.getCurrentTexture().createView(), i = t.beginRenderPass({
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
      i.setPipeline(this.pipeline2), this.bindGroup2 && i.setBindGroup(0, this.bindGroup2), i.draw(6, 1, 0, 0), i.end(), this.device.queue.submit([
        t.finish()
      ]);
    }
    destroy() {
      var _a, _b, _c2, _d;
      (_b = (_a = this.intermediateTexture) == null ? void 0 : _a.destroy) == null ? void 0 : _b.call(_a), (_d = (_c2 = this.mandelbrotReferenceBuffer) == null ? void 0 : _c2.destroy) == null ? void 0 : _d.call(_c2);
    }
  }
  const Mc = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [r, i] of t) n[r] = i;
    return n;
  }, Oc = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, Hr = 1, jr = 128, jt = 0.04, $r = 0.025, Rc = _i({
    __name: "MandelbrotNavigator",
    setup(e) {
      const t = pn(null);
      let n, r, i;
      const s = pn({
        cx: "-1.5",
        cy: "0.0",
        mu: 1e4,
        scale: "2.5",
        angle: "0.0",
        maxIterations: 1e3,
        antialiasLevel: Hr,
        palettePeriod: jr
      });
      function o(F) {
        h[F.key.toLowerCase()] = true;
      }
      function c(F) {
        h[F.key.toLowerCase()] = false;
      }
      function a(F) {
        F.preventDefault();
        const O = 0.8;
        F.deltaY < 0 ? i.zoom(O) : i.zoom(1 / O);
      }
      const h = {};
      let u = false, _ = false, S = 0, E = 0;
      const z = pn(false);
      let L = 0, k = 0, H = 0, G = false;
      function J() {
        typeof window < "u" && window.navigator ? z.value = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent) : z.value = false;
      }
      function P(F) {
        const O = t.value;
        if (!O) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const N = O.getBoundingClientRect();
        return {
          x: F.clientX - N.left,
          y: F.clientY - N.top,
          width: N.width,
          height: N.height
        };
      }
      function Q(F) {
        if (F.button === 2) _ = true;
        else {
          u = true;
          const O = P(F);
          S = O.x, E = O.y;
        }
      }
      function xe(F) {
        var _a;
        const O = P(F);
        if (_) {
          const ee = (_a = t.value) == null ? void 0 : _a.getBoundingClientRect();
          if (!ee) return;
          const rt = ee.width / 2, ht = ee.height / 2, _t = O.x, Xe = O.y, it = Math.atan2(Xe - ht, _t - rt);
          i.angle(it);
          return;
        }
        if (!u) return;
        const N = O.width, X = O.height, V = N / X, U = (O.x - S) / N * 2, ne = (O.y - E) / X * 2, we = -U * V, he = ne;
        i.translate_direct(we, he), S = O.x, E = O.y;
      }
      function be(F) {
        F.button === 2 ? _ = false : u = false;
      }
      function ye(F) {
        var _a;
        if (F.touches.length === 1) {
          u = true;
          const O = F.touches[0], N = (_a = t.value) == null ? void 0 : _a.getBoundingClientRect();
          if (!N) return;
          S = O.clientX - N.left, E = O.clientY - N.top;
        } else if (F.touches.length === 2) {
          u = false, G = true;
          const [O, N] = F.touches;
          L = Math.hypot(N.clientX - O.clientX, N.clientY - O.clientY), k = Math.atan2(N.clientY - O.clientY, N.clientX - O.clientX), H = parseFloat(s.value.angle);
        }
      }
      function nt(F) {
        var _a;
        if (u && F.touches.length === 1) {
          const O = F.touches[0], N = (_a = t.value) == null ? void 0 : _a.getBoundingClientRect();
          if (!N) return;
          const X = O.clientX - N.left, V = O.clientY - N.top, U = N.width, ne = N.height, we = U / ne, he = (X - S) / U * 2, ee = (V - E) / ne * 2;
          i.translate_direct(-he * we, ee), S = X, E = V;
        } else if (G && F.touches.length === 2) {
          const [O, N] = F.touches, X = Math.hypot(N.clientX - O.clientX, N.clientY - O.clientY), V = Math.atan2(N.clientY - O.clientY, N.clientX - O.clientX), U = L / X;
          i.zoom(U);
          const ne = V - k;
          i.angle(H + ne);
        }
      }
      function Ie(F) {
        F.touches.length === 0 && (u = false, G = false);
      }
      async function qe() {
        if (!t.value) return;
        n = t.value, i = new Dl(-0.5572506229492065, 0.6355989165839159, 1e4, 2.5, 0), r = new Pc(n, {
          antialiasLevel: 1,
          palettePeriod: 128
        }), await r.initialize(i), window.addEventListener("keydown", o), window.addEventListener("keyup", c), n.addEventListener("wheel", a, {
          passive: false
        }), n.addEventListener("mousedown", Q), n.addEventListener("contextmenu", function(O) {
          O.preventDefault();
        }), window.addEventListener("mousemove", xe), window.addEventListener("mouseup", be);
        function F() {
          h.z && i.translate(0, jt), h.s && i.translate(0, -jt), h.q && i.translate(-jt, 0), h.d && i.translate(jt, 0), h.a && i.rotate($r), h.e && i.rotate(-$r);
          const O = 0.8;
          h.r && i.zoom(O), h.f && i.zoom(1 / O);
          const N = s.value.epsilon, [X, V, U, ne] = i.step(), [we, he, ee, rt] = i.get_params(), ht = s.value.mu;
          s.value.cx = we, s.value.cy = he, s.value.scale = ee, s.value.angle = rt;
          const _t = Math.min(Math.max(100, 80 + 20 * Math.log2(1 / U)), 1e6);
          r.update({
            cx: X,
            cy: V,
            mu: ht,
            scale: U,
            angle: ne,
            maxIterations: _t,
            epsilon: N
          }, {
            antialiasLevel: Hr,
            palettePeriod: jr
          }), r.render(), requestAnimationFrame(F);
        }
        F();
      }
      function Ye() {
        if (!t.value || !r) return;
        const F = t.value.getBoundingClientRect();
        t.value.width = F.width, t.value.height = F.height, r.resize && r.resize(), r.render();
      }
      return kn(() => {
        J(), qe(), window.addEventListener("resize", Ye), t.value && (t.value.addEventListener("touchstart", ye, {
          passive: false
        }), t.value.addEventListener("touchmove", nt, {
          passive: false
        }), t.value.addEventListener("touchend", Ie, {
          passive: false
        }));
      }), er(() => {
        window.removeEventListener("resize", Ye);
      }), (F, O) => (rr(), Ui("div", Oc, [
        ir("canvas", {
          ref_key: "canvasRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          }
        }, null, 512),
        zo("", true)
      ]));
    }
  }), Ac = Mc(Rc, [
    [
      "__scopeId",
      "data-v-cbaa87b9"
    ]
  ]), Fc = {
    id: "fullscreen"
  }, Ic = _i({
    __name: "App",
    setup(e) {
      return kn(() => {
      }), (t, n) => (rr(), Ui("div", Fc, [
        Ae(Ac)
      ]));
    }
  });
  ml(Ic).mount("#app");
})();
