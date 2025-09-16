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
  function Vn(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const Y = {}, at = [], Fe = () => {
  }, qs = () => false, sn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Hn = (e) => e.startsWith("onUpdate:"), ie = Object.assign, jn = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, Ys = Object.prototype.hasOwnProperty, $ = (e, t) => Ys.call(e, t), A = Array.isArray, yt = (e) => on(e) === "[object Map]", Xs = (e) => on(e) === "[object Set]", I = (e) => typeof e == "function", te = (e) => typeof e == "string", ht = (e) => typeof e == "symbol", Z = (e) => e !== null && typeof e == "object", Kr = (e) => (Z(e) || I(e)) && I(e.then) && I(e.catch), Js = Object.prototype.toString, on = (e) => Js.call(e), ks = (e) => on(e).slice(8, -1), Zs = (e) => on(e) === "[object Object]", $n = (e) => te(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, wt = Vn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), ln = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  }, Qs = /-(\w)/g, Ke = ln((e) => e.replace(Qs, (t, n) => n ? n.toUpperCase() : "")), ei = /\B([A-Z])/g, nt = ln((e) => e.replace(ei, "-$1").toLowerCase()), qr = ln((e) => e.charAt(0).toUpperCase() + e.slice(1)), pn = ln((e) => e ? `on${qr(e)}` : ""), Ge = (e, t) => !Object.is(e, t), _n = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, Pn = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, ti = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  };
  let pr;
  const cn = () => pr || (pr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function Wn(e) {
    if (A(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], s = te(r) ? ii(r) : Wn(r);
        if (s) for (const i in s) t[i] = s[i];
      }
      return t;
    } else if (te(e) || Z(e)) return e;
  }
  const ni = /;(?![^(]*\))/g, ri = /:([^]+)/, si = /\/\*[^]*?\*\//g;
  function ii(e) {
    const t = {};
    return e.replace(si, "").split(ni).forEach((n) => {
      if (n) {
        const r = n.split(ri);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }), t;
  }
  function Gn(e) {
    let t = "";
    if (te(e)) t = e;
    else if (A(e)) for (let n = 0; n < e.length; n++) {
      const r = Gn(e[n]);
      r && (t += r + " ");
    }
    else if (Z(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const oi = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", li = Vn(oi);
  function Yr(e) {
    return !!e || e === "";
  }
  let he;
  class ci {
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
  function ai() {
    return he;
  }
  let q;
  const gn = /* @__PURE__ */ new WeakSet();
  class Xr {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, he && he.active && he.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, gn.has(this) && (gn.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || kr(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, _r(this), Zr(this);
      const t = q, n = ve;
      q = this, ve = true;
      try {
        return this.fn();
      } finally {
        Qr(this), q = t, ve = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) Yn(t);
        this.deps = this.depsTail = void 0, _r(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? gn.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      Mn(this) && this.run();
    }
    get dirty() {
      return Mn(this);
    }
  }
  let Jr = 0, St, Ct;
  function kr(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = Ct, Ct = e;
      return;
    }
    e.next = St, St = e;
  }
  function Kn() {
    Jr++;
  }
  function qn() {
    if (--Jr > 0) return;
    if (Ct) {
      let t = Ct;
      for (Ct = void 0; t; ) {
        const n = t.next;
        t.next = void 0, t.flags &= -9, t = n;
      }
    }
    let e;
    for (; St; ) {
      let t = St;
      for (St = void 0; t; ) {
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
  function Zr(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function Qr(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const s = r.prevDep;
      r.version === -1 ? (r === n && (n = s), Yn(r), fi(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = s;
    }
    e.deps = t, e.depsTail = n;
  }
  function Mn(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (es(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function es(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === At) || (e.globalVersion = At, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Mn(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = q, r = ve;
    q = e, ve = true;
    try {
      Zr(e);
      const s = e.fn(e._value);
      (t.version === 0 || Ge(s, e._value)) && (e.flags |= 128, e._value = s, t.version++);
    } catch (s) {
      throw t.version++, s;
    } finally {
      q = n, ve = r, Qr(e), e.flags &= -3;
    }
  }
  function Yn(e, t = false) {
    const { dep: n, prevSub: r, nextSub: s } = e;
    if (r && (r.nextSub = s, e.prevSub = void 0), s && (s.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
      n.computed.flags &= -5;
      for (let i = n.computed.deps; i; i = i.nextDep) Yn(i, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function fi(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let ve = true;
  const ts = [];
  function Ne() {
    ts.push(ve), ve = false;
  }
  function Ve() {
    const e = ts.pop();
    ve = e === void 0 ? true : e;
  }
  function _r(e) {
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
  let At = 0;
  class ui {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class Xn {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!q || !ve || q === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== q) n = this.activeLink = new ui(q, this), q.deps ? (n.prevDep = q.depsTail, q.depsTail.nextDep = n, q.depsTail = n) : q.deps = q.depsTail = n, ns(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = q.depsTail, n.nextDep = void 0, q.depsTail.nextDep = n, q.depsTail = n, q.deps === n && (q.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, At++, this.notify(t);
    }
    notify(t) {
      Kn();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        qn();
      }
    }
  }
  function ns(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let r = t.deps; r; r = r.nextDep) ns(r);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const On = /* @__PURE__ */ new WeakMap(), et = Symbol(""), Rn = Symbol(""), Ft = Symbol("");
  function re(e, t, n) {
    if (ve && q) {
      let r = On.get(e);
      r || On.set(e, r = /* @__PURE__ */ new Map());
      let s = r.get(n);
      s || (r.set(n, s = new Xn()), s.map = r, s.key = n), s.track();
    }
  }
  function ze(e, t, n, r, s, i) {
    const o = On.get(e);
    if (!o) {
      At++;
      return;
    }
    const c = (f) => {
      f && f.trigger();
    };
    if (Kn(), t === "clear") o.forEach(c);
    else {
      const f = A(e), h = f && $n(n);
      if (f && n === "length") {
        const u = Number(r);
        o.forEach((p, S) => {
          (S === "length" || S === Ft || !ht(S) && S >= u) && c(p);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && c(o.get(n)), h && c(o.get(Ft)), t) {
        case "add":
          f ? h && c(o.get("length")) : (c(o.get(et)), yt(e) && c(o.get(Rn)));
          break;
        case "delete":
          f || (c(o.get(et)), yt(e) && c(o.get(Rn)));
          break;
        case "set":
          yt(e) && c(o.get(et));
          break;
      }
    }
    qn();
  }
  function ot(e) {
    const t = j(e);
    return t === e ? t : (re(t, "iterate", Ft), xe(e) ? t : t.map(le));
  }
  function Jn(e) {
    return re(e = j(e), "iterate", Ft), e;
  }
  const di = {
    __proto__: null,
    [Symbol.iterator]() {
      return bn(this, Symbol.iterator, le);
    },
    concat(...e) {
      return ot(this).concat(...e.map((t) => A(t) ? ot(t) : t));
    },
    entries() {
      return bn(this, "entries", (e) => (e[1] = le(e[1]), e));
    },
    every(e, t) {
      return Be(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return Be(this, "filter", e, t, (n) => n.map(le), arguments);
    },
    find(e, t) {
      return Be(this, "find", e, t, le, arguments);
    },
    findIndex(e, t) {
      return Be(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return Be(this, "findLast", e, t, le, arguments);
    },
    findLastIndex(e, t) {
      return Be(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return Be(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return mn(this, "includes", e);
    },
    indexOf(...e) {
      return mn(this, "indexOf", e);
    },
    join(e) {
      return ot(this).join(e);
    },
    lastIndexOf(...e) {
      return mn(this, "lastIndexOf", e);
    },
    map(e, t) {
      return Be(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return mt(this, "pop");
    },
    push(...e) {
      return mt(this, "push", e);
    },
    reduce(e, ...t) {
      return gr(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return gr(this, "reduceRight", e, t);
    },
    shift() {
      return mt(this, "shift");
    },
    some(e, t) {
      return Be(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return mt(this, "splice", e);
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
      return mt(this, "unshift", e);
    },
    values() {
      return bn(this, "values", le);
    }
  };
  function bn(e, t, n) {
    const r = Jn(e), s = r[t]();
    return r !== e && !xe(e) && (s._next = s.next, s.next = () => {
      const i = s._next();
      return i.value && (i.value = n(i.value)), i;
    }), s;
  }
  const hi = Array.prototype;
  function Be(e, t, n, r, s, i) {
    const o = Jn(e), c = o !== e && !xe(e), f = o[t];
    if (f !== hi[t]) {
      const p = f.apply(e, i);
      return c ? le(p) : p;
    }
    let h = n;
    o !== e && (c ? h = function(p, S) {
      return n.call(this, le(p), S, e);
    } : n.length > 2 && (h = function(p, S) {
      return n.call(this, p, S, e);
    }));
    const u = f.call(o, h, r);
    return c && s ? s(u) : u;
  }
  function gr(e, t, n, r) {
    const s = Jn(e);
    let i = n;
    return s !== e && (xe(e) ? n.length > 3 && (i = function(o, c, f) {
      return n.call(this, o, c, f, e);
    }) : i = function(o, c, f) {
      return n.call(this, o, le(c), f, e);
    }), s[t](i, ...r);
  }
  function mn(e, t, n) {
    const r = j(e);
    re(r, "iterate", Ft);
    const s = r[t](...n);
    return (s === -1 || s === false) && er(n[0]) ? (n[0] = j(n[0]), r[t](...n)) : s;
  }
  function mt(e, t, n = []) {
    Ne(), Kn();
    const r = j(e)[t].apply(e, n);
    return qn(), Ve(), r;
  }
  const pi = Vn("__proto__,__v_isRef,__isVue"), rs = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(ht));
  function _i(e) {
    ht(e) || (e = String(e));
    const t = j(this);
    return re(t, "has", e), t.hasOwnProperty(e);
  }
  class ss {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const s = this._isReadonly, i = this._isShallow;
      if (n === "__v_isReactive") return !s;
      if (n === "__v_isReadonly") return s;
      if (n === "__v_isShallow") return i;
      if (n === "__v_raw") return r === (s ? i ? Ei : cs : i ? ls : os).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const o = A(t);
      if (!s) {
        let f;
        if (o && (f = di[n])) return f;
        if (n === "hasOwnProperty") return _i;
      }
      const c = Reflect.get(t, n, se(t) ? t : r);
      return (ht(n) ? rs.has(n) : pi(n)) || (s || re(t, "get", n), i) ? c : se(c) ? o && $n(n) ? c : c.value : Z(c) ? s ? as(c) : Zn(c) : c;
    }
  }
  class is extends ss {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, s) {
      let i = t[n];
      if (!this._isShallow) {
        const f = tt(i);
        if (!xe(r) && !tt(r) && (i = j(i), r = j(r)), !A(t) && se(i) && !se(r)) return f ? false : (i.value = r, true);
      }
      const o = A(t) && $n(n) ? Number(n) < t.length : $(t, n), c = Reflect.set(t, n, r, se(t) ? t : s);
      return t === j(s) && (o ? Ge(r, i) && ze(t, "set", n, r) : ze(t, "add", n, r)), c;
    }
    deleteProperty(t, n) {
      const r = $(t, n);
      t[n];
      const s = Reflect.deleteProperty(t, n);
      return s && r && ze(t, "delete", n, void 0), s;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!ht(n) || !rs.has(n)) && re(t, "has", n), r;
    }
    ownKeys(t) {
      return re(t, "iterate", A(t) ? "length" : et), Reflect.ownKeys(t);
    }
  }
  class gi extends ss {
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
  const bi = new is(), mi = new gi(), vi = new is(true);
  const An = (e) => e, zt = (e) => Reflect.getPrototypeOf(e);
  function xi(e, t, n) {
    return function(...r) {
      const s = this.__v_raw, i = j(s), o = yt(i), c = e === "entries" || e === Symbol.iterator && o, f = e === "keys" && o, h = s[e](...r), u = n ? An : t ? Fn : le;
      return !t && re(i, "iterate", f ? Rn : et), {
        next() {
          const { value: p, done: S } = h.next();
          return S ? {
            value: p,
            done: S
          } : {
            value: c ? [
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
  function Nt(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function yi(e, t) {
    const n = {
      get(s) {
        const i = this.__v_raw, o = j(i), c = j(s);
        e || (Ge(s, c) && re(o, "get", s), re(o, "get", c));
        const { has: f } = zt(o), h = t ? An : e ? Fn : le;
        if (f.call(o, s)) return h(i.get(s));
        if (f.call(o, c)) return h(i.get(c));
        i !== o && i.get(s);
      },
      get size() {
        const s = this.__v_raw;
        return !e && re(j(s), "iterate", et), Reflect.get(s, "size", s);
      },
      has(s) {
        const i = this.__v_raw, o = j(i), c = j(s);
        return e || (Ge(s, c) && re(o, "has", s), re(o, "has", c)), s === c ? i.has(s) : i.has(s) || i.has(c);
      },
      forEach(s, i) {
        const o = this, c = o.__v_raw, f = j(c), h = t ? An : e ? Fn : le;
        return !e && re(f, "iterate", et), c.forEach((u, p) => s.call(i, h(u), h(p), o));
      }
    };
    return ie(n, e ? {
      add: Nt("add"),
      set: Nt("set"),
      delete: Nt("delete"),
      clear: Nt("clear")
    } : {
      add(s) {
        !t && !xe(s) && !tt(s) && (s = j(s));
        const i = j(this);
        return zt(i).has.call(i, s) || (i.add(s), ze(i, "add", s, s)), this;
      },
      set(s, i) {
        !t && !xe(i) && !tt(i) && (i = j(i));
        const o = j(this), { has: c, get: f } = zt(o);
        let h = c.call(o, s);
        h || (s = j(s), h = c.call(o, s));
        const u = f.call(o, s);
        return o.set(s, i), h ? Ge(i, u) && ze(o, "set", s, i) : ze(o, "add", s, i), this;
      },
      delete(s) {
        const i = j(this), { has: o, get: c } = zt(i);
        let f = o.call(i, s);
        f || (s = j(s), f = o.call(i, s)), c && c.call(i, s);
        const h = i.delete(s);
        return f && ze(i, "delete", s, void 0), h;
      },
      clear() {
        const s = j(this), i = s.size !== 0, o = s.clear();
        return i && ze(s, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((s) => {
      n[s] = xi(s, e, t);
    }), n;
  }
  function kn(e, t) {
    const n = yi(e, t);
    return (r, s, i) => s === "__v_isReactive" ? !e : s === "__v_isReadonly" ? e : s === "__v_raw" ? r : Reflect.get($(n, s) && s in r ? n : r, s, i);
  }
  const wi = {
    get: kn(false, false)
  }, Si = {
    get: kn(false, true)
  }, Ci = {
    get: kn(true, false)
  };
  const os = /* @__PURE__ */ new WeakMap(), ls = /* @__PURE__ */ new WeakMap(), cs = /* @__PURE__ */ new WeakMap(), Ei = /* @__PURE__ */ new WeakMap();
  function Ti(e) {
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
  function Pi(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Ti(ks(e));
  }
  function Zn(e) {
    return tt(e) ? e : Qn(e, false, bi, wi, os);
  }
  function Mi(e) {
    return Qn(e, false, vi, Si, ls);
  }
  function as(e) {
    return Qn(e, true, mi, Ci, cs);
  }
  function Qn(e, t, n, r, s) {
    if (!Z(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const i = Pi(e);
    if (i === 0) return e;
    const o = s.get(e);
    if (o) return o;
    const c = new Proxy(e, i === 2 ? r : n);
    return s.set(e, c), c;
  }
  function Et(e) {
    return tt(e) ? Et(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function tt(e) {
    return !!(e && e.__v_isReadonly);
  }
  function xe(e) {
    return !!(e && e.__v_isShallow);
  }
  function er(e) {
    return e ? !!e.__v_raw : false;
  }
  function j(e) {
    const t = e && e.__v_raw;
    return t ? j(t) : e;
  }
  function Oi(e) {
    return !$(e, "__v_skip") && Object.isExtensible(e) && Pn(e, "__v_skip", true), e;
  }
  const le = (e) => Z(e) ? Zn(e) : e, Fn = (e) => Z(e) ? as(e) : e;
  function se(e) {
    return e ? e.__v_isRef === true : false;
  }
  function vn(e) {
    return Ri(e, false);
  }
  function Ri(e, t) {
    return se(e) ? e : new Ai(e, t);
  }
  class Ai {
    constructor(t, n) {
      this.dep = new Xn(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : j(t), this._value = n ? t : le(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || xe(t) || tt(t);
      t = r ? t : j(t), Ge(t, n) && (this._rawValue = t, this._value = r ? t : le(t), this.dep.trigger());
    }
  }
  function Fi(e) {
    return se(e) ? e.value : e;
  }
  const Ii = {
    get: (e, t, n) => t === "__v_raw" ? e : Fi(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const s = e[t];
      return se(s) && !se(n) ? (s.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function fs(e) {
    return Et(e) ? e : new Proxy(e, Ii);
  }
  class Di {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new Xn(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = At - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && q !== this) return kr(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return es(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function Bi(e, t, n = false) {
    let r, s;
    return I(e) ? r = e : (r = e.get, s = e.set), new Di(r, s, n);
  }
  const Vt = {}, Zt = /* @__PURE__ */ new WeakMap();
  let Qe;
  function Li(e, t = false, n = Qe) {
    if (n) {
      let r = Zt.get(n);
      r || Zt.set(n, r = []), r.push(e);
    }
  }
  function Ui(e, t, n = Y) {
    const { immediate: r, deep: s, once: i, scheduler: o, augmentJob: c, call: f } = n, h = (M) => s ? M : xe(M) || s === false || s === 0 ? We(M, 1) : We(M);
    let u, p, S, C, z = false, L = false;
    if (se(e) ? (p = () => e.value, z = xe(e)) : Et(e) ? (p = () => h(e), z = true) : A(e) ? (L = true, z = e.some((M) => Et(M) || xe(M)), p = () => e.map((M) => {
      if (se(M)) return M.value;
      if (Et(M)) return h(M);
      if (I(M)) return f ? f(M, 2) : M();
    })) : I(e) ? t ? p = f ? () => f(e, 2) : e : p = () => {
      if (S) {
        Ne();
        try {
          S();
        } finally {
          Ve();
        }
      }
      const M = Qe;
      Qe = u;
      try {
        return f ? f(e, 3, [
          C
        ]) : e(C);
      } finally {
        Qe = M;
      }
    } : p = Fe, t && s) {
      const M = p, k = s === true ? 1 / 0 : s;
      p = () => We(M(), k);
    }
    const Q = ai(), H = () => {
      u.stop(), Q && Q.active && jn(Q.effects, u);
    };
    if (i && t) {
      const M = t;
      t = (...k) => {
        M(...k), H();
      };
    }
    let G = L ? new Array(e.length).fill(Vt) : Vt;
    const J = (M) => {
      if (!(!(u.flags & 1) || !u.dirty && !M)) if (t) {
        const k = u.run();
        if (s || z || (L ? k.some((we, me) => Ge(we, G[me])) : Ge(k, G))) {
          S && S();
          const we = Qe;
          Qe = u;
          try {
            const me = [
              k,
              G === Vt ? void 0 : L && G[0] === Vt ? [] : G,
              C
            ];
            G = k, f ? f(t, 3, me) : t(...me);
          } finally {
            Qe = we;
          }
        }
      } else u.run();
    };
    return c && c(J), u = new Xr(p), u.scheduler = o ? () => o(J, false) : J, C = (M) => Li(M, false, u), S = u.onStop = () => {
      const M = Zt.get(u);
      if (M) {
        if (f) f(M, 4);
        else for (const k of M) k();
        Zt.delete(u);
      }
    }, t ? r ? J(true) : G = u.run() : o ? o(J.bind(null, true), true) : u.run(), H.pause = u.pause.bind(u), H.resume = u.resume.bind(u), H.stop = H, H;
  }
  function We(e, t = 1 / 0, n) {
    if (t <= 0 || !Z(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
    if (n.add(e), t--, se(e)) We(e.value, t, n);
    else if (A(e)) for (let r = 0; r < e.length; r++) We(e[r], t, n);
    else if (Xs(e) || yt(e)) e.forEach((r) => {
      We(r, t, n);
    });
    else if (Zs(e)) {
      for (const r in e) We(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && We(e[r], t, n);
    }
    return e;
  }
  function Lt(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (s) {
      an(s, t, n);
    }
  }
  function Ie(e, t, n, r) {
    if (I(e)) {
      const s = Lt(e, t, n, r);
      return s && Kr(s) && s.catch((i) => {
        an(i, t, n);
      }), s;
    }
    if (A(e)) {
      const s = [];
      for (let i = 0; i < e.length; i++) s.push(Ie(e[i], t, n, r));
      return s;
    }
  }
  function an(e, t, n, r = true) {
    const s = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: o } = t && t.appContext.config || Y;
    if (t) {
      let c = t.parent;
      const f = t.proxy, h = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; c; ) {
        const u = c.ec;
        if (u) {
          for (let p = 0; p < u.length; p++) if (u[p](e, f, h) === false) return;
        }
        c = c.parent;
      }
      if (i) {
        Ne(), Lt(i, null, 10, [
          e,
          f,
          h
        ]), Ve();
        return;
      }
    }
    zi(e, n, s, r, o);
  }
  function zi(e, t, n, r = true, s = false) {
    if (s) throw e;
    console.error(e);
  }
  const ce = [];
  let Oe = -1;
  const ft = [];
  let je = null, ct = 0;
  const us = Promise.resolve();
  let Qt = null;
  function Ni(e) {
    const t = Qt || us;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function Vi(e) {
    let t = Oe + 1, n = ce.length;
    for (; t < n; ) {
      const r = t + n >>> 1, s = ce[r], i = It(s);
      i < e || i === e && s.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function tr(e) {
    if (!(e.flags & 1)) {
      const t = It(e), n = ce[ce.length - 1];
      !n || !(e.flags & 2) && t >= It(n) ? ce.push(e) : ce.splice(Vi(t), 0, e), e.flags |= 1, ds();
    }
  }
  function ds() {
    Qt || (Qt = us.then(ps));
  }
  function Hi(e) {
    A(e) ? ft.push(...e) : je && e.id === -1 ? je.splice(ct + 1, 0, e) : e.flags & 1 || (ft.push(e), e.flags |= 1), ds();
  }
  function br(e, t, n = Oe + 1) {
    for (; n < ce.length; n++) {
      const r = ce[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        ce.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function hs(e) {
    if (ft.length) {
      const t = [
        ...new Set(ft)
      ].sort((n, r) => It(n) - It(r));
      if (ft.length = 0, je) {
        je.push(...t);
        return;
      }
      for (je = t, ct = 0; ct < je.length; ct++) {
        const n = je[ct];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      je = null, ct = 0;
    }
  }
  const It = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function ps(e) {
    try {
      for (Oe = 0; Oe < ce.length; Oe++) {
        const t = ce[Oe];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Lt(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; Oe < ce.length; Oe++) {
        const t = ce[Oe];
        t && (t.flags &= -2);
      }
      Oe = -1, ce.length = 0, hs(), Qt = null, (ce.length || ft.length) && ps();
    }
  }
  let Ae = null, _s = null;
  function en(e) {
    const t = Ae;
    return Ae = e, _s = e && e.type.__scopeId || null, t;
  }
  function ji(e, t = Ae, n) {
    if (!t || e._n) return e;
    const r = (...s) => {
      r._d && Tr(-1);
      const i = en(t);
      let o;
      try {
        o = e(...s);
      } finally {
        en(i), r._d && Tr(1);
      }
      return o;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function ke(e, t, n, r) {
    const s = e.dirs, i = t && t.dirs;
    for (let o = 0; o < s.length; o++) {
      const c = s[o];
      i && (c.oldValue = i[o].value);
      let f = c.dir[r];
      f && (Ne(), Ie(f, n, 8, [
        e.el,
        c,
        e,
        t
      ]), Ve());
    }
  }
  const $i = Symbol("_vte"), Wi = (e) => e.__isTeleport;
  function nr(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, nr(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function gs(e, t) {
    return I(e) ? ie({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function bs(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function Tt(e, t, n, r, s = false) {
    if (A(e)) {
      e.forEach((z, L) => Tt(z, t && (A(t) ? t[L] : t), n, r, s));
      return;
    }
    if (Pt(r) && !s) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Tt(e, t, n, r.component.subTree);
      return;
    }
    const i = r.shapeFlag & 4 ? cr(r.component) : r.el, o = s ? null : i, { i: c, r: f } = e, h = t && t.r, u = c.refs === Y ? c.refs = {} : c.refs, p = c.setupState, S = j(p), C = p === Y ? () => false : (z) => $(S, z);
    if (h != null && h !== f && (te(h) ? (u[h] = null, C(h) && (p[h] = null)) : se(h) && (h.value = null)), I(f)) Lt(f, c, 12, [
      o,
      u
    ]);
    else {
      const z = te(f), L = se(f);
      if (z || L) {
        const Q = () => {
          if (e.f) {
            const H = z ? C(f) ? p[f] : u[f] : f.value;
            s ? A(H) && jn(H, i) : A(H) ? H.includes(i) || H.push(i) : z ? (u[f] = [
              i
            ], C(f) && (p[f] = u[f])) : (f.value = [
              i
            ], e.k && (u[e.k] = f.value));
          } else z ? (u[f] = o, C(f) && (p[f] = o)) : L && (f.value = o, e.k && (u[e.k] = o));
        };
        o ? (Q.id = -1, ge(Q, n)) : Q();
      }
    }
  }
  cn().requestIdleCallback;
  cn().cancelIdleCallback;
  const Pt = (e) => !!e.type.__asyncLoader, ms = (e) => e.type.__isKeepAlive;
  function Gi(e, t) {
    vs(e, "a", t);
  }
  function Ki(e, t) {
    vs(e, "da", t);
  }
  function vs(e, t, n = ae) {
    const r = e.__wdc || (e.__wdc = () => {
      let s = n;
      for (; s; ) {
        if (s.isDeactivated) return;
        s = s.parent;
      }
      return e();
    });
    if (fn(t, r, n), n) {
      let s = n.parent;
      for (; s && s.parent; ) ms(s.parent.vnode) && qi(r, t, n, s), s = s.parent;
    }
  }
  function qi(e, t, n, r) {
    const s = fn(t, e, r, true);
    sr(() => {
      jn(r[t], s);
    }, n);
  }
  function fn(e, t, n = ae, r = false) {
    if (n) {
      const s = n[e] || (n[e] = []), i = t.__weh || (t.__weh = (...o) => {
        Ne();
        const c = Ut(n), f = Ie(t, n, e, o);
        return c(), Ve(), f;
      });
      return r ? s.unshift(i) : s.push(i), i;
    }
  }
  const He = (e) => (t, n = ae) => {
    (!Bt || e === "sp") && fn(e, (...r) => t(...r), n);
  }, Yi = He("bm"), rr = He("m"), Xi = He("bu"), Ji = He("u"), ki = He("bum"), sr = He("um"), Zi = He("sp"), Qi = He("rtg"), eo = He("rtc");
  function to(e, t = ae) {
    fn("ec", e, t);
  }
  const no = Symbol.for("v-ndc"), In = (e) => e ? Vs(e) ? cr(e) : In(e.parent) : null, Mt = ie(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => In(e.parent),
    $root: (e) => In(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => ys(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      tr(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Ni.bind(e.proxy)),
    $watch: (e) => Eo.bind(e)
  }), xn = (e, t) => e !== Y && !e.__isScriptSetup && $(e, t), ro = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: r, data: s, props: i, accessCache: o, type: c, appContext: f } = e;
      let h;
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
          if (xn(r, t)) return o[t] = 1, r[t];
          if (s !== Y && $(s, t)) return o[t] = 2, s[t];
          if ((h = e.propsOptions[0]) && $(h, t)) return o[t] = 3, i[t];
          if (n !== Y && $(n, t)) return o[t] = 4, n[t];
          Dn && (o[t] = 0);
        }
      }
      const u = Mt[t];
      let p, S;
      if (u) return t === "$attrs" && re(e.attrs, "get", ""), u(e);
      if ((p = c.__cssModules) && (p = p[t])) return p;
      if (n !== Y && $(n, t)) return o[t] = 4, n[t];
      if (S = f.config.globalProperties, $(S, t)) return S[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: s, ctx: i } = e;
      return xn(s, t) ? (s[t] = n, true) : r !== Y && $(r, t) ? (r[t] = n, true) : $(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (i[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: s, propsOptions: i } }, o) {
      let c;
      return !!n[o] || e !== Y && $(e, o) || xn(t, o) || (c = i[0]) && $(c, o) || $(r, o) || $(Mt, o) || $(s.config.globalProperties, o);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : $(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function mr(e) {
    return A(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  let Dn = true;
  function so(e) {
    const t = ys(e), n = e.proxy, r = e.ctx;
    Dn = false, t.beforeCreate && vr(t.beforeCreate, e, "bc");
    const { data: s, computed: i, methods: o, watch: c, provide: f, inject: h, created: u, beforeMount: p, mounted: S, beforeUpdate: C, updated: z, activated: L, deactivated: Q, beforeDestroy: H, beforeUnmount: G, destroyed: J, unmounted: M, render: k, renderTracked: we, renderTriggered: me, errorCaptured: Se, serverPrefetch: rt, expose: De, inheritAttrs: Ye, components: Xe, directives: F, filters: P } = t;
    if (h && io(h, r, null), o) for (const V in o) {
      const U = o[V];
      I(U) && (r[V] = U.bind(n));
    }
    if (s) {
      const V = s.call(n, n);
      Z(V) && (e.data = Zn(V));
    }
    if (Dn = true, i) for (const V in i) {
      const U = i[V], ne = I(U) ? U.bind(n, n) : I(U.get) ? U.get.bind(n, n) : Fe, Ce = !I(U) && I(U.set) ? U.set.bind(n) : Fe, pe = Xo({
        get: ne,
        set: Ce
      });
      Object.defineProperty(r, V, {
        enumerable: true,
        configurable: true,
        get: () => pe.value,
        set: (ee) => pe.value = ee
      });
    }
    if (c) for (const V in c) xs(c[V], r, n, V);
    if (f) {
      const V = I(f) ? f.call(n) : f;
      Reflect.ownKeys(V).forEach((U) => {
        uo(U, V[U]);
      });
    }
    u && vr(u, e, "c");
    function X(V, U) {
      A(U) ? U.forEach((ne) => V(ne.bind(n))) : U && V(U.bind(n));
    }
    if (X(Yi, p), X(rr, S), X(Xi, C), X(Ji, z), X(Gi, L), X(Ki, Q), X(to, Se), X(eo, we), X(Qi, me), X(ki, G), X(sr, M), X(Zi, rt), A(De)) if (De.length) {
      const V = e.exposed || (e.exposed = {});
      De.forEach((U) => {
        Object.defineProperty(V, U, {
          get: () => n[U],
          set: (ne) => n[U] = ne,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    k && e.render === Fe && (e.render = k), Ye != null && (e.inheritAttrs = Ye), Xe && (e.components = Xe), F && (e.directives = F), rt && bs(e);
  }
  function io(e, t, n = Fe) {
    A(e) && (e = Bn(e));
    for (const r in e) {
      const s = e[r];
      let i;
      Z(s) ? "default" in s ? i = Wt(s.from || r, s.default, true) : i = Wt(s.from || r) : i = Wt(s), se(i) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => i.value,
        set: (o) => i.value = o
      }) : t[r] = i;
    }
  }
  function vr(e, t, n) {
    Ie(A(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function xs(e, t, n, r) {
    let s = r.includes(".") ? Ds(n, r) : () => n[r];
    if (te(e)) {
      const i = t[e];
      I(i) && wn(s, i);
    } else if (I(e)) wn(s, e.bind(n));
    else if (Z(e)) if (A(e)) e.forEach((i) => xs(i, t, n, r));
    else {
      const i = I(e.handler) ? e.handler.bind(n) : t[e.handler];
      I(i) && wn(s, i, e);
    }
  }
  function ys(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: s, optionsCache: i, config: { optionMergeStrategies: o } } = e.appContext, c = i.get(t);
    let f;
    return c ? f = c : !s.length && !n && !r ? f = t : (f = {}, s.length && s.forEach((h) => tn(f, h, o, true)), tn(f, t, o)), Z(t) && i.set(t, f), f;
  }
  function tn(e, t, n, r = false) {
    const { mixins: s, extends: i } = t;
    i && tn(e, i, n, true), s && s.forEach((o) => tn(e, o, n, true));
    for (const o in t) if (!(r && o === "expose")) {
      const c = oo[o] || n && n[o];
      e[o] = c ? c(e[o], t[o]) : t[o];
    }
    return e;
  }
  const oo = {
    data: xr,
    props: yr,
    emits: yr,
    methods: xt,
    computed: xt,
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
    components: xt,
    directives: xt,
    watch: co,
    provide: xr,
    inject: lo
  };
  function xr(e, t) {
    return t ? e ? function() {
      return ie(I(e) ? e.call(this, this) : e, I(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function lo(e, t) {
    return xt(Bn(e), Bn(t));
  }
  function Bn(e) {
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
  function xt(e, t) {
    return e ? ie(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function yr(e, t) {
    return e ? A(e) && A(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : ie(/* @__PURE__ */ Object.create(null), mr(e), mr(t ?? {})) : t;
  }
  function co(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = ie(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = oe(e[r], t[r]);
    return n;
  }
  function ws() {
    return {
      app: null,
      config: {
        isNativeTag: qs,
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
  let ao = 0;
  function fo(e, t) {
    return function(r, s = null) {
      I(r) || (r = ie({}, r)), s != null && !Z(s) && (s = null);
      const i = ws(), o = /* @__PURE__ */ new WeakSet(), c = [];
      let f = false;
      const h = i.app = {
        _uid: ao++,
        _component: r,
        _props: s,
        _container: null,
        _context: i,
        _instance: null,
        version: Jo,
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
            const C = h._ceVNode || ye(r, s);
            return C.appContext = i, S === true ? S = "svg" : S === false && (S = void 0), e(C, u, S), f = true, h._container = u, u.__vue_app__ = h, cr(C.component);
          }
        },
        onUnmount(u) {
          c.push(u);
        },
        unmount() {
          f && (Ie(c, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
        },
        provide(u, p) {
          return i.provides[u] = p, h;
        },
        runWithContext(u) {
          const p = ut;
          ut = h;
          try {
            return u();
          } finally {
            ut = p;
          }
        }
      };
      return h;
    };
  }
  let ut = null;
  function uo(e, t) {
    if (ae) {
      let n = ae.provides;
      const r = ae.parent && ae.parent.provides;
      r === n && (n = ae.provides = Object.create(r)), n[e] = t;
    }
  }
  function Wt(e, t, n = false) {
    const r = $o();
    if (r || ut) {
      let s = ut ? ut._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (s && e in s) return s[e];
      if (arguments.length > 1) return n && I(t) ? t.call(r && r.proxy) : t;
    }
  }
  const Ss = {}, Cs = () => Object.create(Ss), Es = (e) => Object.getPrototypeOf(e) === Ss;
  function ho(e, t, n, r = false) {
    const s = {}, i = Cs();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Ts(e, t, s, i);
    for (const o in e.propsOptions[0]) o in s || (s[o] = void 0);
    n ? e.props = r ? s : Mi(s) : e.type.props ? e.props = s : e.props = i, e.attrs = i;
  }
  function po(e, t, n, r) {
    const { props: s, attrs: i, vnode: { patchFlag: o } } = e, c = j(s), [f] = e.propsOptions;
    let h = false;
    if ((r || o > 0) && !(o & 16)) {
      if (o & 8) {
        const u = e.vnode.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          let S = u[p];
          if (un(e.emitsOptions, S)) continue;
          const C = t[S];
          if (f) if ($(i, S)) C !== i[S] && (i[S] = C, h = true);
          else {
            const z = Ke(S);
            s[z] = Ln(f, c, z, C, e, false);
          }
          else C !== i[S] && (i[S] = C, h = true);
        }
      }
    } else {
      Ts(e, t, s, i) && (h = true);
      let u;
      for (const p in c) (!t || !$(t, p) && ((u = nt(p)) === p || !$(t, u))) && (f ? n && (n[p] !== void 0 || n[u] !== void 0) && (s[p] = Ln(f, c, p, void 0, e, true)) : delete s[p]);
      if (i !== c) for (const p in i) (!t || !$(t, p)) && (delete i[p], h = true);
    }
    h && ze(e.attrs, "set", "");
  }
  function Ts(e, t, n, r) {
    const [s, i] = e.propsOptions;
    let o = false, c;
    if (t) for (let f in t) {
      if (wt(f)) continue;
      const h = t[f];
      let u;
      s && $(s, u = Ke(f)) ? !i || !i.includes(u) ? n[u] = h : (c || (c = {}))[u] = h : un(e.emitsOptions, f) || (!(f in r) || h !== r[f]) && (r[f] = h, o = true);
    }
    if (i) {
      const f = j(n), h = c || Y;
      for (let u = 0; u < i.length; u++) {
        const p = i[u];
        n[p] = Ln(s, f, p, h[p], e, !$(h, p));
      }
    }
    return o;
  }
  function Ln(e, t, n, r, s, i) {
    const o = e[n];
    if (o != null) {
      const c = $(o, "default");
      if (c && r === void 0) {
        const f = o.default;
        if (o.type !== Function && !o.skipFactory && I(f)) {
          const { propsDefaults: h } = s;
          if (n in h) r = h[n];
          else {
            const u = Ut(s);
            r = h[n] = f.call(null, t), u();
          }
        } else r = f;
        s.ce && s.ce._setProp(n, r);
      }
      o[0] && (i && !c ? r = false : o[1] && (r === "" || r === nt(n)) && (r = true));
    }
    return r;
  }
  const _o = /* @__PURE__ */ new WeakMap();
  function Ps(e, t, n = false) {
    const r = n ? _o : t.propsCache, s = r.get(e);
    if (s) return s;
    const i = e.props, o = {}, c = [];
    let f = false;
    if (!I(e)) {
      const u = (p) => {
        f = true;
        const [S, C] = Ps(p, t, true);
        ie(o, S), C && c.push(...C);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!i && !f) return Z(e) && r.set(e, at), at;
    if (A(i)) for (let u = 0; u < i.length; u++) {
      const p = Ke(i[u]);
      wr(p) && (o[p] = Y);
    }
    else if (i) for (const u in i) {
      const p = Ke(u);
      if (wr(p)) {
        const S = i[u], C = o[p] = A(S) || I(S) ? {
          type: S
        } : ie({}, S), z = C.type;
        let L = false, Q = true;
        if (A(z)) for (let H = 0; H < z.length; ++H) {
          const G = z[H], J = I(G) && G.name;
          if (J === "Boolean") {
            L = true;
            break;
          } else J === "String" && (Q = false);
        }
        else L = I(z) && z.name === "Boolean";
        C[0] = L, C[1] = Q, (L || $(C, "default")) && c.push(p);
      }
    }
    const h = [
      o,
      c
    ];
    return Z(e) && r.set(e, h), h;
  }
  function wr(e) {
    return e[0] !== "$" && !wt(e);
  }
  const ir = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", or = (e) => A(e) ? e.map(Re) : [
    Re(e)
  ], go = (e, t, n) => {
    if (t._n) return t;
    const r = ji((...s) => or(t(...s)), n);
    return r._c = false, r;
  }, Ms = (e, t, n) => {
    const r = e._ctx;
    for (const s in e) {
      if (ir(s)) continue;
      const i = e[s];
      if (I(i)) t[s] = go(s, i, r);
      else if (i != null) {
        const o = or(i);
        t[s] = () => o;
      }
    }
  }, Os = (e, t) => {
    const n = or(t);
    e.slots.default = () => n;
  }, Rs = (e, t, n) => {
    for (const r in t) (n || !ir(r)) && (e[r] = t[r]);
  }, bo = (e, t, n) => {
    const r = e.slots = Cs();
    if (e.vnode.shapeFlag & 32) {
      const s = t.__;
      s && Pn(r, "__", s, true);
      const i = t._;
      i ? (Rs(r, t, n), n && Pn(r, "_", i, true)) : Ms(t, r);
    } else t && Os(e, t);
  }, mo = (e, t, n) => {
    const { vnode: r, slots: s } = e;
    let i = true, o = Y;
    if (r.shapeFlag & 32) {
      const c = t._;
      c ? n && c === 1 ? i = false : Rs(s, t, n) : (i = !t.$stable, Ms(t, s)), o = t;
    } else t && (Os(e, t), o = {
      default: 1
    });
    if (i) for (const c in s) !ir(c) && o[c] == null && delete s[c];
  }, ge = Fo;
  function vo(e) {
    return xo(e);
  }
  function xo(e, t) {
    const n = cn();
    n.__VUE__ = true;
    const { insert: r, remove: s, patchProp: i, createElement: o, createText: c, createComment: f, setText: h, setElementText: u, parentNode: p, nextSibling: S, setScopeId: C = Fe, insertStaticContent: z } = e, L = (l, a, d, b = null, _ = null, g = null, y = void 0, x = null, v = !!a.dynamicChildren) => {
      if (l === a) return;
      l && !vt(l, a) && (b = it(l), ee(l, _, g, true), l = null), a.patchFlag === -2 && (v = false, a.dynamicChildren = null);
      const { type: m, ref: T, shapeFlag: w } = a;
      switch (m) {
        case dn:
          Q(l, a, d, b);
          break;
        case qe:
          H(l, a, d, b);
          break;
        case Gt:
          l == null && G(a, d, b, y);
          break;
        case Ue:
          Xe(l, a, d, b, _, g, y, x, v);
          break;
        default:
          w & 1 ? k(l, a, d, b, _, g, y, x, v) : w & 6 ? F(l, a, d, b, _, g, y, x, v) : (w & 64 || w & 128) && m.process(l, a, d, b, _, g, y, x, v, gt);
      }
      T != null && _ ? Tt(T, l && l.ref, g, a || l, !a) : T == null && l && l.ref != null && Tt(l.ref, null, g, l, true);
    }, Q = (l, a, d, b) => {
      if (l == null) r(a.el = c(a.children), d, b);
      else {
        const _ = a.el = l.el;
        a.children !== l.children && h(_, a.children);
      }
    }, H = (l, a, d, b) => {
      l == null ? r(a.el = f(a.children || ""), d, b) : a.el = l.el;
    }, G = (l, a, d, b) => {
      [l.el, l.anchor] = z(l.children, a, d, b, l.el, l.anchor);
    }, J = ({ el: l, anchor: a }, d, b) => {
      let _;
      for (; l && l !== a; ) _ = S(l), r(l, d, b), l = _;
      r(a, d, b);
    }, M = ({ el: l, anchor: a }) => {
      let d;
      for (; l && l !== a; ) d = S(l), s(l), l = d;
      s(a);
    }, k = (l, a, d, b, _, g, y, x, v) => {
      a.type === "svg" ? y = "svg" : a.type === "math" && (y = "mathml"), l == null ? we(a, d, b, _, g, y, x, v) : rt(l, a, _, g, y, x, v);
    }, we = (l, a, d, b, _, g, y, x) => {
      let v, m;
      const { props: T, shapeFlag: w, transition: E, dirs: O } = l;
      if (v = l.el = o(l.type, g, T && T.is, T), w & 8 ? u(v, l.children) : w & 16 && Se(l.children, v, null, b, _, yn(l, g), y, x), O && ke(l, null, b, "created"), me(v, l, l.scopeId, y, b), T) {
        for (const K in T) K !== "value" && !wt(K) && i(v, K, null, T[K], g, b);
        "value" in T && i(v, "value", null, T.value, g), (m = T.onVnodeBeforeMount) && Me(m, b, l);
      }
      O && ke(l, null, b, "beforeMount");
      const N = yo(_, E);
      N && E.beforeEnter(v), r(v, a, d), ((m = T && T.onVnodeMounted) || N || O) && ge(() => {
        m && Me(m, b, l), N && E.enter(v), O && ke(l, null, b, "mounted");
      }, _);
    }, me = (l, a, d, b, _) => {
      if (d && C(l, d), b) for (let g = 0; g < b.length; g++) C(l, b[g]);
      if (_) {
        let g = _.subTree;
        if (a === g || Ls(g.type) && (g.ssContent === a || g.ssFallback === a)) {
          const y = _.vnode;
          me(l, y, y.scopeId, y.slotScopeIds, _.parent);
        }
      }
    }, Se = (l, a, d, b, _, g, y, x, v = 0) => {
      for (let m = v; m < l.length; m++) {
        const T = l[m] = x ? $e(l[m]) : Re(l[m]);
        L(null, T, a, d, b, _, g, y, x);
      }
    }, rt = (l, a, d, b, _, g, y) => {
      const x = a.el = l.el;
      let { patchFlag: v, dynamicChildren: m, dirs: T } = a;
      v |= l.patchFlag & 16;
      const w = l.props || Y, E = a.props || Y;
      let O;
      if (d && Ze(d, false), (O = E.onVnodeBeforeUpdate) && Me(O, d, a, l), T && ke(a, l, d, "beforeUpdate"), d && Ze(d, true), (w.innerHTML && E.innerHTML == null || w.textContent && E.textContent == null) && u(x, ""), m ? De(l.dynamicChildren, m, x, d, b, yn(a, _), g) : y || U(l, a, x, null, d, b, yn(a, _), g, false), v > 0) {
        if (v & 16) Ye(x, w, E, d, _);
        else if (v & 2 && w.class !== E.class && i(x, "class", null, E.class, _), v & 4 && i(x, "style", w.style, E.style, _), v & 8) {
          const N = a.dynamicProps;
          for (let K = 0; K < N.length; K++) {
            const W = N[K], fe = w[W], ue = E[W];
            (ue !== fe || W === "value") && i(x, W, fe, ue, _, d);
          }
        }
        v & 1 && l.children !== a.children && u(x, a.children);
      } else !y && m == null && Ye(x, w, E, d, _);
      ((O = E.onVnodeUpdated) || T) && ge(() => {
        O && Me(O, d, a, l), T && ke(a, l, d, "updated");
      }, b);
    }, De = (l, a, d, b, _, g, y) => {
      for (let x = 0; x < a.length; x++) {
        const v = l[x], m = a[x], T = v.el && (v.type === Ue || !vt(v, m) || v.shapeFlag & 198) ? p(v.el) : d;
        L(v, m, T, null, b, _, g, y, true);
      }
    }, Ye = (l, a, d, b, _) => {
      if (a !== d) {
        if (a !== Y) for (const g in a) !wt(g) && !(g in d) && i(l, g, a[g], null, _, b);
        for (const g in d) {
          if (wt(g)) continue;
          const y = d[g], x = a[g];
          y !== x && g !== "value" && i(l, g, x, y, _, b);
        }
        "value" in d && i(l, "value", a.value, d.value, _);
      }
    }, Xe = (l, a, d, b, _, g, y, x, v) => {
      const m = a.el = l ? l.el : c(""), T = a.anchor = l ? l.anchor : c("");
      let { patchFlag: w, dynamicChildren: E, slotScopeIds: O } = a;
      O && (x = x ? x.concat(O) : O), l == null ? (r(m, d, b), r(T, d, b), Se(a.children || [], d, T, _, g, y, x, v)) : w > 0 && w & 64 && E && l.dynamicChildren ? (De(l.dynamicChildren, E, d, _, g, y, x), (a.key != null || _ && a === _.subTree) && As(l, a, true)) : U(l, a, d, T, _, g, y, x, v);
    }, F = (l, a, d, b, _, g, y, x, v) => {
      a.slotScopeIds = x, l == null ? a.shapeFlag & 512 ? _.ctx.activate(a, d, b, y, v) : P(a, d, b, _, g, y, v) : B(l, a, v);
    }, P = (l, a, d, b, _, g, y) => {
      const x = l.component = jo(l, b, _);
      if (ms(l) && (x.ctx.renderer = gt), Wo(x, false, y), x.asyncDep) {
        if (_ && _.registerDep(x, X, y), !l.el) {
          const v = x.subTree = ye(qe);
          H(null, v, a, d), l.placeholder = v.el;
        }
      } else X(x, l, a, d, _, g, y);
    }, B = (l, a, d) => {
      const b = a.component = l.component;
      if (Ro(l, a, d)) if (b.asyncDep && !b.asyncResolved) {
        V(b, a, d);
        return;
      } else b.next = a, b.update();
      else a.el = l.el, b.vnode = a;
    }, X = (l, a, d, b, _, g, y) => {
      const x = () => {
        if (l.isMounted) {
          let { next: w, bu: E, u: O, parent: N, vnode: K } = l;
          {
            const Te = Fs(l);
            if (Te) {
              w && (w.el = K.el, V(l, w, y)), Te.asyncDep.then(() => {
                l.isUnmounted || x();
              });
              return;
            }
          }
          let W = w, fe;
          Ze(l, false), w ? (w.el = K.el, V(l, w, y)) : w = K, E && _n(E), (fe = w.props && w.props.onVnodeBeforeUpdate) && Me(fe, N, w, K), Ze(l, true);
          const ue = Cr(l), Ee = l.subTree;
          l.subTree = ue, L(Ee, ue, p(Ee.el), it(Ee), l, _, g), w.el = ue.el, W === null && Ao(l, ue.el), O && ge(O, _), (fe = w.props && w.props.onVnodeUpdated) && ge(() => Me(fe, N, w, K), _);
        } else {
          let w;
          const { el: E, props: O } = a, { bm: N, m: K, parent: W, root: fe, type: ue } = l, Ee = Pt(a);
          Ze(l, false), N && _n(N), !Ee && (w = O && O.onVnodeBeforeMount) && Me(w, W, a), Ze(l, true);
          {
            fe.ce && fe.ce._def.shadowRoot !== false && fe.ce._injectChildStyle(ue);
            const Te = l.subTree = Cr(l);
            L(null, Te, d, b, l, _, g), a.el = Te.el;
          }
          if (K && ge(K, _), !Ee && (w = O && O.onVnodeMounted)) {
            const Te = a;
            ge(() => Me(w, W, Te), _);
          }
          (a.shapeFlag & 256 || W && Pt(W.vnode) && W.vnode.shapeFlag & 256) && l.a && ge(l.a, _), l.isMounted = true, a = d = b = null;
        }
      };
      l.scope.on();
      const v = l.effect = new Xr(x);
      l.scope.off();
      const m = l.update = v.run.bind(v), T = l.job = v.runIfDirty.bind(v);
      T.i = l, T.id = l.uid, v.scheduler = () => tr(T), Ze(l, true), m();
    }, V = (l, a, d) => {
      a.component = l;
      const b = l.vnode.props;
      l.vnode = a, l.next = null, po(l, a.props, b, d), mo(l, a.children, d), Ne(), br(l), Ve();
    }, U = (l, a, d, b, _, g, y, x, v = false) => {
      const m = l && l.children, T = l ? l.shapeFlag : 0, w = a.children, { patchFlag: E, shapeFlag: O } = a;
      if (E > 0) {
        if (E & 128) {
          Ce(m, w, d, b, _, g, y, x, v);
          return;
        } else if (E & 256) {
          ne(m, w, d, b, _, g, y, x, v);
          return;
        }
      }
      O & 8 ? (T & 16 && Je(m, _, g), w !== m && u(d, w)) : T & 16 ? O & 16 ? Ce(m, w, d, b, _, g, y, x, v) : Je(m, _, g, true) : (T & 8 && u(d, ""), O & 16 && Se(w, d, b, _, g, y, x, v));
    }, ne = (l, a, d, b, _, g, y, x, v) => {
      l = l || at, a = a || at;
      const m = l.length, T = a.length, w = Math.min(m, T);
      let E;
      for (E = 0; E < w; E++) {
        const O = a[E] = v ? $e(a[E]) : Re(a[E]);
        L(l[E], O, d, null, _, g, y, x, v);
      }
      m > T ? Je(l, _, g, true, false, w) : Se(a, d, b, _, g, y, x, v, w);
    }, Ce = (l, a, d, b, _, g, y, x, v) => {
      let m = 0;
      const T = a.length;
      let w = l.length - 1, E = T - 1;
      for (; m <= w && m <= E; ) {
        const O = l[m], N = a[m] = v ? $e(a[m]) : Re(a[m]);
        if (vt(O, N)) L(O, N, d, null, _, g, y, x, v);
        else break;
        m++;
      }
      for (; m <= w && m <= E; ) {
        const O = l[w], N = a[E] = v ? $e(a[E]) : Re(a[E]);
        if (vt(O, N)) L(O, N, d, null, _, g, y, x, v);
        else break;
        w--, E--;
      }
      if (m > w) {
        if (m <= E) {
          const O = E + 1, N = O < T ? a[O].el : b;
          for (; m <= E; ) L(null, a[m] = v ? $e(a[m]) : Re(a[m]), d, N, _, g, y, x, v), m++;
        }
      } else if (m > E) for (; m <= w; ) ee(l[m], _, g, true), m++;
      else {
        const O = m, N = m, K = /* @__PURE__ */ new Map();
        for (m = N; m <= E; m++) {
          const _e = a[m] = v ? $e(a[m]) : Re(a[m]);
          _e.key != null && K.set(_e.key, m);
        }
        let W, fe = 0;
        const ue = E - N + 1;
        let Ee = false, Te = 0;
        const bt = new Array(ue);
        for (m = 0; m < ue; m++) bt[m] = 0;
        for (m = O; m <= w; m++) {
          const _e = l[m];
          if (fe >= ue) {
            ee(_e, _, g, true);
            continue;
          }
          let Pe;
          if (_e.key != null) Pe = K.get(_e.key);
          else for (W = N; W <= E; W++) if (bt[W - N] === 0 && vt(_e, a[W])) {
            Pe = W;
            break;
          }
          Pe === void 0 ? ee(_e, _, g, true) : (bt[Pe - N] = m + 1, Pe >= Te ? Te = Pe : Ee = true, L(_e, a[Pe], d, null, _, g, y, x, v), fe++);
        }
        const ur = Ee ? wo(bt) : at;
        for (W = ur.length - 1, m = ue - 1; m >= 0; m--) {
          const _e = N + m, Pe = a[_e], dr = a[_e + 1], hr = _e + 1 < T ? dr.el || dr.placeholder : b;
          bt[m] === 0 ? L(null, Pe, d, hr, _, g, y, x, v) : Ee && (W < 0 || m !== ur[W] ? pe(Pe, d, hr, 2) : W--);
        }
      }
    }, pe = (l, a, d, b, _ = null) => {
      const { el: g, type: y, transition: x, children: v, shapeFlag: m } = l;
      if (m & 6) {
        pe(l.component.subTree, a, d, b);
        return;
      }
      if (m & 128) {
        l.suspense.move(a, d, b);
        return;
      }
      if (m & 64) {
        y.move(l, a, d, gt);
        return;
      }
      if (y === Ue) {
        r(g, a, d);
        for (let w = 0; w < v.length; w++) pe(v[w], a, d, b);
        r(l.anchor, a, d);
        return;
      }
      if (y === Gt) {
        J(l, a, d);
        return;
      }
      if (b !== 2 && m & 1 && x) if (b === 0) x.beforeEnter(g), r(g, a, d), ge(() => x.enter(g), _);
      else {
        const { leave: w, delayLeave: E, afterLeave: O } = x, N = () => {
          l.ctx.isUnmounted ? s(g) : r(g, a, d);
        }, K = () => {
          w(g, () => {
            N(), O && O();
          });
        };
        E ? E(g, N, K) : K();
      }
      else r(g, a, d);
    }, ee = (l, a, d, b = false, _ = false) => {
      const { type: g, props: y, ref: x, children: v, dynamicChildren: m, shapeFlag: T, patchFlag: w, dirs: E, cacheIndex: O } = l;
      if (w === -2 && (_ = false), x != null && (Ne(), Tt(x, null, d, l, true), Ve()), O != null && (a.renderCache[O] = void 0), T & 256) {
        a.ctx.deactivate(l);
        return;
      }
      const N = T & 1 && E, K = !Pt(l);
      let W;
      if (K && (W = y && y.onVnodeBeforeUnmount) && Me(W, a, l), T & 6) _t(l.component, d, b);
      else {
        if (T & 128) {
          l.suspense.unmount(d, b);
          return;
        }
        N && ke(l, null, a, "beforeUnmount"), T & 64 ? l.type.remove(l, a, d, gt, b) : m && !m.hasOnce && (g !== Ue || w > 0 && w & 64) ? Je(m, a, d, false, true) : (g === Ue && w & 384 || !_ && T & 16) && Je(v, a, d), b && st(l);
      }
      (K && (W = y && y.onVnodeUnmounted) || N) && ge(() => {
        W && Me(W, a, l), N && ke(l, null, a, "unmounted");
      }, d);
    }, st = (l) => {
      const { type: a, el: d, anchor: b, transition: _ } = l;
      if (a === Ue) {
        pt(d, b);
        return;
      }
      if (a === Gt) {
        M(l);
        return;
      }
      const g = () => {
        s(d), _ && !_.persisted && _.afterLeave && _.afterLeave();
      };
      if (l.shapeFlag & 1 && _ && !_.persisted) {
        const { leave: y, delayLeave: x } = _, v = () => y(d, g);
        x ? x(l.el, g, v) : v();
      } else g();
    }, pt = (l, a) => {
      let d;
      for (; l !== a; ) d = S(l), s(l), l = d;
      s(a);
    }, _t = (l, a, d) => {
      const { bum: b, scope: _, job: g, subTree: y, um: x, m: v, a: m, parent: T, slots: { __: w } } = l;
      Sr(v), Sr(m), b && _n(b), T && A(w) && w.forEach((E) => {
        T.renderCache[E] = void 0;
      }), _.stop(), g && (g.flags |= 8, ee(y, l, a, d)), x && ge(x, a), ge(() => {
        l.isUnmounted = true;
      }, a), a && a.pendingBranch && !a.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === a.pendingId && (a.deps--, a.deps === 0 && a.resolve());
    }, Je = (l, a, d, b = false, _ = false, g = 0) => {
      for (let y = g; y < l.length; y++) ee(l[y], a, d, b, _);
    }, it = (l) => {
      if (l.shapeFlag & 6) return it(l.component.subTree);
      if (l.shapeFlag & 128) return l.suspense.next();
      const a = S(l.anchor || l.el), d = a && a[$i];
      return d ? S(d) : a;
    };
    let hn = false;
    const fr = (l, a, d) => {
      l == null ? a._vnode && ee(a._vnode, null, null, true) : L(a._vnode || null, l, a, null, null, null, d), a._vnode = l, hn || (hn = true, br(), hs(), hn = false);
    }, gt = {
      p: L,
      um: ee,
      m: pe,
      r: st,
      mt: P,
      mc: Se,
      pc: U,
      pbc: De,
      n: it,
      o: e
    };
    return {
      render: fr,
      hydrate: void 0,
      createApp: fo(fr)
    };
  }
  function yn({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function Ze({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function yo(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function As(e, t, n = false) {
    const r = e.children, s = t.children;
    if (A(r) && A(s)) for (let i = 0; i < r.length; i++) {
      const o = r[i];
      let c = s[i];
      c.shapeFlag & 1 && !c.dynamicChildren && ((c.patchFlag <= 0 || c.patchFlag === 32) && (c = s[i] = $e(s[i]), c.el = o.el), !n && c.patchFlag !== -2 && As(o, c)), c.type === dn && (c.el = o.el), c.type === qe && !c.el && (c.el = o.el);
    }
  }
  function wo(e) {
    const t = e.slice(), n = [
      0
    ];
    let r, s, i, o, c;
    const f = e.length;
    for (r = 0; r < f; r++) {
      const h = e[r];
      if (h !== 0) {
        if (s = n[n.length - 1], e[s] < h) {
          t[r] = s, n.push(r);
          continue;
        }
        for (i = 0, o = n.length - 1; i < o; ) c = i + o >> 1, e[n[c]] < h ? i = c + 1 : o = c;
        h < e[n[i]] && (i > 0 && (t[r] = n[i - 1]), n[i] = r);
      }
    }
    for (i = n.length, o = n[i - 1]; i-- > 0; ) n[i] = o, o = t[o];
    return n;
  }
  function Fs(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : Fs(t);
  }
  function Sr(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  const So = Symbol.for("v-scx"), Co = () => Wt(So);
  function wn(e, t, n) {
    return Is(e, t, n);
  }
  function Is(e, t, n = Y) {
    const { immediate: r, deep: s, flush: i, once: o } = n, c = ie({}, n), f = t && r || !t && i !== "post";
    let h;
    if (Bt) {
      if (i === "sync") {
        const C = Co();
        h = C.__watcherHandles || (C.__watcherHandles = []);
      } else if (!f) {
        const C = () => {
        };
        return C.stop = Fe, C.resume = Fe, C.pause = Fe, C;
      }
    }
    const u = ae;
    c.call = (C, z, L) => Ie(C, u, z, L);
    let p = false;
    i === "post" ? c.scheduler = (C) => {
      ge(C, u && u.suspense);
    } : i !== "sync" && (p = true, c.scheduler = (C, z) => {
      z ? C() : tr(C);
    }), c.augmentJob = (C) => {
      t && (C.flags |= 4), p && (C.flags |= 2, u && (C.id = u.uid, C.i = u));
    };
    const S = Ui(e, t, c);
    return Bt && (h ? h.push(S) : f && S()), S;
  }
  function Eo(e, t, n) {
    const r = this.proxy, s = te(e) ? e.includes(".") ? Ds(r, e) : () => r[e] : e.bind(r, r);
    let i;
    I(t) ? i = t : (i = t.handler, n = t);
    const o = Ut(this), c = Is(s, i.bind(r), n);
    return o(), c;
  }
  function Ds(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let s = 0; s < n.length && r; s++) r = r[n[s]];
      return r;
    };
  }
  const To = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Ke(t)}Modifiers`] || e[`${nt(t)}Modifiers`];
  function Po(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || Y;
    let s = n;
    const i = t.startsWith("update:"), o = i && To(r, t.slice(7));
    o && (o.trim && (s = n.map((u) => te(u) ? u.trim() : u)), o.number && (s = n.map(ti)));
    let c, f = r[c = pn(t)] || r[c = pn(Ke(t))];
    !f && i && (f = r[c = pn(nt(t))]), f && Ie(f, e, 6, s);
    const h = r[c + "Once"];
    if (h) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[c]) return;
      e.emitted[c] = true, Ie(h, e, 6, s);
    }
  }
  function Bs(e, t, n = false) {
    const r = t.emitsCache, s = r.get(e);
    if (s !== void 0) return s;
    const i = e.emits;
    let o = {}, c = false;
    if (!I(e)) {
      const f = (h) => {
        const u = Bs(h, t, true);
        u && (c = true, ie(o, u));
      };
      !n && t.mixins.length && t.mixins.forEach(f), e.extends && f(e.extends), e.mixins && e.mixins.forEach(f);
    }
    return !i && !c ? (Z(e) && r.set(e, null), null) : (A(i) ? i.forEach((f) => o[f] = null) : ie(o, i), Z(e) && r.set(e, o), o);
  }
  function un(e, t) {
    return !e || !sn(t) ? false : (t = t.slice(2).replace(/Once$/, ""), $(e, t[0].toLowerCase() + t.slice(1)) || $(e, nt(t)) || $(e, t));
  }
  function Cr(e) {
    const { type: t, vnode: n, proxy: r, withProxy: s, propsOptions: [i], slots: o, attrs: c, emit: f, render: h, renderCache: u, props: p, data: S, setupState: C, ctx: z, inheritAttrs: L } = e, Q = en(e);
    let H, G;
    try {
      if (n.shapeFlag & 4) {
        const M = s || r, k = M;
        H = Re(h.call(k, M, u, p, C, S, z)), G = c;
      } else {
        const M = t;
        H = Re(M.length > 1 ? M(p, {
          attrs: c,
          slots: o,
          emit: f
        }) : M(p, null)), G = t.props ? c : Mo(c);
      }
    } catch (M) {
      Ot.length = 0, an(M, e, 1), H = ye(qe);
    }
    let J = H;
    if (G && L !== false) {
      const M = Object.keys(G), { shapeFlag: k } = J;
      M.length && k & 7 && (i && M.some(Hn) && (G = Oo(G, i)), J = dt(J, G, false, true));
    }
    return n.dirs && (J = dt(J, null, false, true), J.dirs = J.dirs ? J.dirs.concat(n.dirs) : n.dirs), n.transition && nr(J, n.transition), H = J, en(Q), H;
  }
  const Mo = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || sn(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Oo = (e, t) => {
    const n = {};
    for (const r in e) (!Hn(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function Ro(e, t, n) {
    const { props: r, children: s, component: i } = e, { props: o, children: c, patchFlag: f } = t, h = i.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && f >= 0) {
      if (f & 1024) return true;
      if (f & 16) return r ? Er(r, o, h) : !!o;
      if (f & 8) {
        const u = t.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          const S = u[p];
          if (o[S] !== r[S] && !un(h, S)) return true;
        }
      }
    } else return (s || c) && (!c || !c.$stable) ? true : r === o ? false : r ? o ? Er(r, o, h) : true : !!o;
    return false;
  }
  function Er(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let s = 0; s < r.length; s++) {
      const i = r[s];
      if (t[i] !== e[i] && !un(n, i)) return true;
    }
    return false;
  }
  function Ao({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Ls = (e) => e.__isSuspense;
  function Fo(e, t) {
    t && t.pendingBranch ? A(e) ? t.effects.push(...e) : t.effects.push(e) : Hi(e);
  }
  const Ue = Symbol.for("v-fgt"), dn = Symbol.for("v-txt"), qe = Symbol.for("v-cmt"), Gt = Symbol.for("v-stc"), Ot = [];
  let be = null;
  function nn(e = false) {
    Ot.push(be = e ? null : []);
  }
  function Io() {
    Ot.pop(), be = Ot[Ot.length - 1] || null;
  }
  let Dt = 1;
  function Tr(e, t = false) {
    Dt += e, e < 0 && be && t && (be.hasOnce = true);
  }
  function Us(e) {
    return e.dynamicChildren = Dt > 0 ? be || at : null, Io(), Dt > 0 && be && be.push(e), e;
  }
  function Un(e, t, n, r, s, i) {
    return Us(de(e, t, n, r, s, i, true));
  }
  function Do(e, t, n, r, s) {
    return Us(ye(e, t, n, r, s, true));
  }
  function zs(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function vt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const Ns = ({ key: e }) => e ?? null, Kt = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? te(e) || se(e) || I(e) ? {
    i: Ae,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function de(e, t = null, n = null, r = 0, s = null, i = e === Ue ? 0 : 1, o = false, c = false) {
    const f = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && Ns(t),
      ref: t && Kt(t),
      scopeId: _s,
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
      ctx: Ae
    };
    return c ? (lr(f, n), i & 128 && e.normalize(f)) : n && (f.shapeFlag |= te(n) ? 8 : 16), Dt > 0 && !o && be && (f.patchFlag > 0 || i & 6) && f.patchFlag !== 32 && be.push(f), f;
  }
  const ye = Bo;
  function Bo(e, t = null, n = null, r = 0, s = null, i = false) {
    if ((!e || e === no) && (e = qe), zs(e)) {
      const c = dt(e, t, true);
      return n && lr(c, n), Dt > 0 && !i && be && (c.shapeFlag & 6 ? be[be.indexOf(e)] = c : be.push(c)), c.patchFlag = -2, c;
    }
    if (Yo(e) && (e = e.__vccOpts), t) {
      t = Lo(t);
      let { class: c, style: f } = t;
      c && !te(c) && (t.class = Gn(c)), Z(f) && (er(f) && !A(f) && (f = ie({}, f)), t.style = Wn(f));
    }
    const o = te(e) ? 1 : Ls(e) ? 128 : Wi(e) ? 64 : Z(e) ? 4 : I(e) ? 2 : 0;
    return de(e, t, n, r, s, o, i, true);
  }
  function Lo(e) {
    return e ? er(e) || Es(e) ? ie({}, e) : e : null;
  }
  function dt(e, t, n = false, r = false) {
    const { props: s, ref: i, patchFlag: o, children: c, transition: f } = e, h = t ? No(s || {}, t) : s, u = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: h,
      key: h && Ns(h),
      ref: t && t.ref ? n && i ? A(i) ? i.concat(Kt(t)) : [
        i,
        Kt(t)
      ] : Kt(t) : i,
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
      transition: f,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && dt(e.ssContent),
      ssFallback: e.ssFallback && dt(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return f && r && nr(u, f.clone(u)), u;
  }
  function qt(e = " ", t = 0) {
    return ye(dn, null, e, t);
  }
  function Uo(e, t) {
    const n = ye(Gt, null, e);
    return n.staticCount = t, n;
  }
  function zo(e = "", t = false) {
    return t ? (nn(), Do(qe, null, e)) : ye(qe, null, e);
  }
  function Re(e) {
    return e == null || typeof e == "boolean" ? ye(qe) : A(e) ? ye(Ue, null, e.slice()) : zs(e) ? $e(e) : ye(dn, null, String(e));
  }
  function $e(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : dt(e);
  }
  function lr(e, t) {
    let n = 0;
    const { shapeFlag: r } = e;
    if (t == null) t = null;
    else if (A(t)) n = 16;
    else if (typeof t == "object") if (r & 65) {
      const s = t.default;
      s && (s._c && (s._d = false), lr(e, s()), s._c && (s._d = true));
      return;
    } else {
      n = 32;
      const s = t._;
      !s && !Es(t) ? t._ctx = Ae : s === 3 && Ae && (Ae.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else I(t) ? (t = {
      default: t,
      _ctx: Ae
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      qt(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function No(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const s in r) if (s === "class") t.class !== r.class && (t.class = Gn([
        t.class,
        r.class
      ]));
      else if (s === "style") t.style = Wn([
        t.style,
        r.style
      ]);
      else if (sn(s)) {
        const i = t[s], o = r[s];
        o && i !== o && !(A(i) && i.includes(o)) && (t[s] = i ? [].concat(i, o) : o);
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
  const Vo = ws();
  let Ho = 0;
  function jo(e, t, n) {
    const r = e.type, s = (t ? t.appContext : e.appContext) || Vo, i = {
      uid: Ho++,
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
      scope: new ci(true),
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
      propsOptions: Ps(r, s),
      emitsOptions: Bs(r, s),
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
    return i.ctx = {
      _: i
    }, i.root = t ? t.root : i, i.emit = Po.bind(null, i), e.ce && e.ce(i), i;
  }
  let ae = null;
  const $o = () => ae || Ae;
  let rn, zn;
  {
    const e = cn(), t = (n, r) => {
      let s;
      return (s = e[n]) || (s = e[n] = []), s.push(r), (i) => {
        s.length > 1 ? s.forEach((o) => o(i)) : s[0](i);
      };
    };
    rn = t("__VUE_INSTANCE_SETTERS__", (n) => ae = n), zn = t("__VUE_SSR_SETTERS__", (n) => Bt = n);
  }
  const Ut = (e) => {
    const t = ae;
    return rn(e), e.scope.on(), () => {
      e.scope.off(), rn(t);
    };
  }, Pr = () => {
    ae && ae.scope.off(), rn(null);
  };
  function Vs(e) {
    return e.vnode.shapeFlag & 4;
  }
  let Bt = false;
  function Wo(e, t = false, n = false) {
    t && zn(t);
    const { props: r, children: s } = e.vnode, i = Vs(e);
    ho(e, r, i, t), bo(e, s, n || t);
    const o = i ? Go(e, t) : void 0;
    return t && zn(false), o;
  }
  function Go(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, ro);
    const { setup: r } = n;
    if (r) {
      Ne();
      const s = e.setupContext = r.length > 1 ? qo(e) : null, i = Ut(e), o = Lt(r, e, 0, [
        e.props,
        s
      ]), c = Kr(o);
      if (Ve(), i(), (c || e.sp) && !Pt(e) && bs(e), c) {
        if (o.then(Pr, Pr), t) return o.then((f) => {
          Mr(e, f);
        }).catch((f) => {
          an(f, e, 0);
        });
        e.asyncDep = o;
      } else Mr(e, o);
    } else Hs(e);
  }
  function Mr(e, t, n) {
    I(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Z(t) && (e.setupState = fs(t)), Hs(e);
  }
  function Hs(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || Fe);
    {
      const s = Ut(e);
      Ne();
      try {
        so(e);
      } finally {
        Ve(), s();
      }
    }
  }
  const Ko = {
    get(e, t) {
      return re(e, "get", ""), e[t];
    }
  };
  function qo(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, Ko),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function cr(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(fs(Oi(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in Mt) return Mt[n](e);
      },
      has(t, n) {
        return n in t || n in Mt;
      }
    })) : e.proxy;
  }
  function Yo(e) {
    return I(e) && "__vccOpts" in e;
  }
  const Xo = (e, t) => Bi(e, t, Bt), Jo = "3.5.18";
  let Nn;
  const Or = typeof window < "u" && window.trustedTypes;
  if (Or) try {
    Nn = Or.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const js = Nn ? (e) => Nn.createHTML(e) : (e) => e, ko = "http://www.w3.org/2000/svg", Zo = "http://www.w3.org/1998/Math/MathML", Le = typeof document < "u" ? document : null, Rr = Le && Le.createElement("template"), Qo = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const s = t === "svg" ? Le.createElementNS(ko, e) : t === "mathml" ? Le.createElementNS(Zo, e) : n ? Le.createElement(e, {
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
        Rr.innerHTML = js(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const c = Rr.content;
        if (r === "svg" || r === "mathml") {
          const f = c.firstChild;
          for (; f.firstChild; ) c.appendChild(f.firstChild);
          c.removeChild(f);
        }
        t.insertBefore(c, n);
      }
      return [
        o ? o.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild
      ];
    }
  }, el = Symbol("_vtc");
  function tl(e, t, n) {
    const r = e[el];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const Ar = Symbol("_vod"), nl = Symbol("_vsh"), rl = Symbol(""), sl = /(^|;)\s*display\s*:/;
  function il(e, t, n) {
    const r = e.style, s = te(n);
    let i = false;
    if (n && !s) {
      if (t) if (te(t)) for (const o of t.split(";")) {
        const c = o.slice(0, o.indexOf(":")).trim();
        n[c] == null && Yt(r, c, "");
      }
      else for (const o in t) n[o] == null && Yt(r, o, "");
      for (const o in n) o === "display" && (i = true), Yt(r, o, n[o]);
    } else if (s) {
      if (t !== n) {
        const o = r[rl];
        o && (n += ";" + o), r.cssText = n, i = sl.test(n);
      }
    } else t && e.removeAttribute("style");
    Ar in e && (e[Ar] = i ? r.display : "", e[nl] && (r.display = "none"));
  }
  const Fr = /\s*!important$/;
  function Yt(e, t, n) {
    if (A(n)) n.forEach((r) => Yt(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = ol(e, t);
      Fr.test(n) ? e.setProperty(nt(r), n.replace(Fr, ""), "important") : e[r] = n;
    }
  }
  const Ir = [
    "Webkit",
    "Moz",
    "ms"
  ], Sn = {};
  function ol(e, t) {
    const n = Sn[t];
    if (n) return n;
    let r = Ke(t);
    if (r !== "filter" && r in e) return Sn[t] = r;
    r = qr(r);
    for (let s = 0; s < Ir.length; s++) {
      const i = Ir[s] + r;
      if (i in e) return Sn[t] = i;
    }
    return t;
  }
  const Dr = "http://www.w3.org/1999/xlink";
  function Br(e, t, n, r, s, i = li(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Dr, t.slice(6, t.length)) : e.setAttributeNS(Dr, t, n) : n == null || i && !Yr(n) ? e.removeAttribute(t) : e.setAttribute(t, i ? "" : ht(n) ? String(n) : n);
  }
  function Lr(e, t, n, r, s) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? js(n) : n);
      return;
    }
    const i = e.tagName;
    if (t === "value" && i !== "PROGRESS" && !i.includes("-")) {
      const c = i === "OPTION" ? e.getAttribute("value") || "" : e.value, f = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
      (c !== f || !("_value" in e)) && (e.value = f), n == null && e.removeAttribute(t), e._value = n;
      return;
    }
    let o = false;
    if (n === "" || n == null) {
      const c = typeof e[t];
      c === "boolean" ? n = Yr(n) : n == null && c === "string" ? (n = "", o = true) : c === "number" && (n = 0, o = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    o && e.removeAttribute(s || t);
  }
  function ll(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function cl(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const Ur = Symbol("_vei");
  function al(e, t, n, r, s = null) {
    const i = e[Ur] || (e[Ur] = {}), o = i[t];
    if (r && o) o.value = r;
    else {
      const [c, f] = fl(t);
      if (r) {
        const h = i[t] = hl(r, s);
        ll(e, c, h, f);
      } else o && (cl(e, c, o, f), i[t] = void 0);
    }
  }
  const zr = /(?:Once|Passive|Capture)$/;
  function fl(e) {
    let t;
    if (zr.test(e)) {
      t = {};
      let r;
      for (; r = e.match(zr); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : nt(e.slice(2)),
      t
    ];
  }
  let Cn = 0;
  const ul = Promise.resolve(), dl = () => Cn || (ul.then(() => Cn = 0), Cn = Date.now());
  function hl(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Ie(pl(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = dl(), n;
  }
  function pl(e, t) {
    if (A(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (s) => !s._stopped && r && r(s));
    } else return t;
  }
  const Nr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, _l = (e, t, n, r, s, i) => {
    const o = s === "svg";
    t === "class" ? tl(e, r, o) : t === "style" ? il(e, n, r) : sn(t) ? Hn(t) || al(e, t, n, r, i) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : gl(e, t, r, o)) ? (Lr(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Br(e, t, r, o, i, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !te(r)) ? Lr(e, Ke(t), r, i, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), Br(e, t, r, o));
  };
  function gl(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Nr(t) && I(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const s = e.tagName;
      if (s === "IMG" || s === "VIDEO" || s === "CANVAS" || s === "SOURCE") return false;
    }
    return Nr(t) && te(n) ? false : t in e;
  }
  const bl = ie({
    patchProp: _l
  }, Qo);
  let Vr;
  function ml() {
    return Vr || (Vr = vo(bl));
  }
  const vl = (...e) => {
    const t = ml().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const s = yl(r);
      if (!s) return;
      const i = t._component;
      !I(i) && !i.render && !i.template && (i.template = s.innerHTML), s.nodeType === 1 && (s.textContent = "");
      const o = n(s, false, xl(s));
      return s instanceof Element && (s.removeAttribute("v-cloak"), s.setAttribute("data-v-app", "")), o;
    }, t;
  };
  function xl(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function yl(e) {
    return te(e) ? document.querySelector(e) : e;
  }
  const wl = `
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











`, Sl = `struct Uniforms {
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
}`, Cl = "" + new URL("mandelbrot_bg-Bo7yjBq-.wasm", import.meta.url).href, El = async (e = {}, t) => {
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
  let R;
  function Tl(e) {
    R = e;
  }
  let Ht = null;
  function Xt() {
    return (Ht === null || Ht.byteLength === 0) && (Ht = new Uint8Array(R.memory.buffer)), Ht;
  }
  const $s = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
  let Jt = new $s("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  Jt.decode();
  const Pl = 2146435072;
  let En = 0;
  function Ml(e, t) {
    return En += t, En >= Pl && (Jt = new $s("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), Jt.decode(), En = t), Jt.decode(Xt().subarray(e, e + t));
  }
  function Ws(e, t) {
    return e = e >>> 0, Ml(e, t);
  }
  let jt = null;
  function Ol() {
    return (jt === null || jt.byteLength === 0) && (jt = new Float64Array(R.memory.buffer)), jt;
  }
  function Rl(e, t) {
    return e = e >>> 0, Ol().subarray(e / 8, e / 8 + t);
  }
  let lt = null;
  function Al() {
    return (lt === null || lt.buffer.detached === true || lt.buffer.detached === void 0 && lt.buffer !== R.memory.buffer) && (lt = new DataView(R.memory.buffer)), lt;
  }
  function Fl(e, t) {
    e = e >>> 0;
    const n = Al(), r = [];
    for (let s = e; s < e + 4 * t; s += 4) r.push(R.__wbindgen_export_0.get(n.getUint32(s, true)));
    return R.__externref_drop_slice(e, t), r;
  }
  let Rt = 0;
  const Il = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder, kt = new Il("utf-8"), Dl = typeof kt.encodeInto == "function" ? function(e, t) {
    return kt.encodeInto(e, t);
  } : function(e, t) {
    const n = kt.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  };
  function Tn(e, t, n) {
    if (n === void 0) {
      const c = kt.encode(e), f = t(c.length, 1) >>> 0;
      return Xt().subarray(f, f + c.length).set(c), Rt = c.length, f;
    }
    let r = e.length, s = t(r, 1) >>> 0;
    const i = Xt();
    let o = 0;
    for (; o < r; o++) {
      const c = e.charCodeAt(o);
      if (c > 127) break;
      i[s + o] = c;
    }
    if (o !== r) {
      o !== 0 && (e = e.slice(o)), s = n(s, r, r = o + e.length * 3, 1) >>> 0;
      const c = Xt().subarray(s + o, s + r), f = Dl(e, c);
      o += f.written, s = n(s, r, o, 1) >>> 0;
    }
    return Rt = o, s;
  }
  const Hr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => R.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  class Bl {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Hr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      R.__wbg_mandelbrotnavigator_free(t, 0);
    }
    constructor(t, n, r, s, i) {
      const o = R.mandelbrotnavigator_new(t, n, r, s, i);
      return this.__wbg_ptr = o >>> 0, Hr.register(this, this.__wbg_ptr, this), this;
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
      var n = Rl(t[0], t[1]).slice();
      return R.__wbindgen_free(t[0], t[1] * 8, 8), n;
    }
    get_params() {
      const t = R.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = Fl(t[0], t[1]).slice();
      return R.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    compute_reference_orbit_ptr(t) {
      const n = R.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return ar.__wrap(n);
    }
    get_reference_orbit_len() {
      return R.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    get_reference_orbit_capacity() {
      return R.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    scale(t) {
      const n = Tn(t, R.__wbindgen_malloc, R.__wbindgen_realloc), r = Rt;
      R.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
    }
    angle(t) {
      R.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    origin(t, n) {
      const r = Tn(t, R.__wbindgen_malloc, R.__wbindgen_realloc), s = Rt, i = Tn(n, R.__wbindgen_malloc, R.__wbindgen_realloc), o = Rt;
      R.mandelbrotnavigator_origin(this.__wbg_ptr, r, s, i, o);
    }
  }
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => R.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const jr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => R.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class ar {
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(ar.prototype);
      return n.__wbg_ptr = t, jr.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, jr.unregister(this), t;
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
  function Nl(e) {
    console.log(e);
  }
  function Vl() {
    return Date.now();
  }
  function Hl(e) {
    console.warn(e);
  }
  function jl() {
    const e = R.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  function $l(e, t) {
    return Ws(e, t);
  }
  function Wl(e, t) {
    throw new Error(Ws(e, t));
  }
  URL = globalThis.URL;
  const D = await El({
    "./mandelbrot_bg.js": {
      __wbindgen_string_new: $l,
      __wbg_debug_58d16ea352cfbca1: Ll,
      __wbg_error_51ecdd39ec054205: Ul,
      __wbg_info_e56933705c348038: zl,
      __wbg_log_ea240990d83e374e: Nl,
      __wbg_warn_d89f6637da554c8d: Hl,
      __wbg_now_eb0821f3bd9f6529: Vl,
      __wbindgen_throw: Wl,
      __wbindgen_init_externref_table: jl
    }
  }, Cl), Gs = D.memory, Gl = D.__wbg_mandelbrotstep_free, Kl = D.__wbg_get_mandelbrotstep_zx, ql = D.__wbg_set_mandelbrotstep_zx, Yl = D.__wbg_get_mandelbrotstep_zy, Xl = D.__wbg_set_mandelbrotstep_zy, Jl = D.__wbg_get_mandelbrotstep_dx, kl = D.__wbg_set_mandelbrotstep_dx, Zl = D.__wbg_get_mandelbrotstep_dy, Ql = D.__wbg_set_mandelbrotstep_dy, ec = D.__wbg_mandelbrotnavigator_free, tc = D.mandelbrotnavigator_new, nc = D.mandelbrotnavigator_translate, rc = D.mandelbrotnavigator_rotate, sc = D.mandelbrotnavigator_translate_direct, ic = D.mandelbrotnavigator_rotate_direct, oc = D.mandelbrotnavigator_zoom, lc = D.mandelbrotnavigator_step, cc = D.mandelbrotnavigator_get_params, ac = D.mandelbrotnavigator_compute_reference_orbit_ptr, fc = D.mandelbrotnavigator_get_reference_orbit_len, uc = D.mandelbrotnavigator_get_reference_orbit_capacity, dc = D.mandelbrotnavigator_scale, hc = D.mandelbrotnavigator_angle, pc = D.mandelbrotnavigator_origin, _c = D.__wbg_orbitbufferinfo_free, gc = D.__wbg_get_orbitbufferinfo_ptr, bc = D.__wbg_set_orbitbufferinfo_ptr, mc = D.__wbg_get_orbitbufferinfo_offset, vc = D.__wbg_set_orbitbufferinfo_offset, xc = D.__wbg_get_orbitbufferinfo_count, yc = D.__wbg_set_orbitbufferinfo_count, wc = D.__wbindgen_export_0, Sc = D.__wbindgen_free, Cc = D.__externref_drop_slice, Ec = D.__wbindgen_malloc, Tc = D.__wbindgen_realloc, Ks = D.__wbindgen_start, Pc = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: Cc,
    __wbg_get_mandelbrotstep_dx: Jl,
    __wbg_get_mandelbrotstep_dy: Zl,
    __wbg_get_mandelbrotstep_zx: Kl,
    __wbg_get_mandelbrotstep_zy: Yl,
    __wbg_get_orbitbufferinfo_count: xc,
    __wbg_get_orbitbufferinfo_offset: mc,
    __wbg_get_orbitbufferinfo_ptr: gc,
    __wbg_mandelbrotnavigator_free: ec,
    __wbg_mandelbrotstep_free: Gl,
    __wbg_orbitbufferinfo_free: _c,
    __wbg_set_mandelbrotstep_dx: kl,
    __wbg_set_mandelbrotstep_dy: Ql,
    __wbg_set_mandelbrotstep_zx: ql,
    __wbg_set_mandelbrotstep_zy: Xl,
    __wbg_set_orbitbufferinfo_count: yc,
    __wbg_set_orbitbufferinfo_offset: vc,
    __wbg_set_orbitbufferinfo_ptr: bc,
    __wbindgen_export_0: wc,
    __wbindgen_free: Sc,
    __wbindgen_malloc: Ec,
    __wbindgen_realloc: Tc,
    __wbindgen_start: Ks,
    mandelbrotnavigator_angle: hc,
    mandelbrotnavigator_compute_reference_orbit_ptr: ac,
    mandelbrotnavigator_get_params: cc,
    mandelbrotnavigator_get_reference_orbit_capacity: uc,
    mandelbrotnavigator_get_reference_orbit_len: fc,
    mandelbrotnavigator_new: tc,
    mandelbrotnavigator_origin: pc,
    mandelbrotnavigator_rotate: rc,
    mandelbrotnavigator_rotate_direct: ic,
    mandelbrotnavigator_scale: dc,
    mandelbrotnavigator_step: lc,
    mandelbrotnavigator_translate: nc,
    mandelbrotnavigator_translate_direct: sc,
    mandelbrotnavigator_zoom: oc,
    memory: Gs
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  Tl(Pc);
  Ks();
  class Mc {
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
      this.canvas = t, this.shaderPass1 = wl, this.shaderPass2 = Sl, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
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
      const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) ?? this.canvas.clientWidth, s = (n == null ? void 0 : n.clientHeight) ?? this.canvas.clientHeight;
      if (this.width = Math.max(1, Math.round(r * t)), this.height = Math.max(1, Math.round(s * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = s + "px", this.ctx.configure({
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
      const c = Math.ceil(t.maxIterations);
      let f = this.mandelbrotNavigator.compute_reference_orbit_ptr(c);
      const h = new Float32Array(Gs.buffer, f.ptr, f.count * 4);
      f.offset < c && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, h, 0), this.previousMandelbrot = t;
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
      var _a, _b, _c2, _d;
      (_b = (_a = this.intermediateTexture) == null ? void 0 : _a.destroy) == null ? void 0 : _b.call(_a), (_d = (_c2 = this.mandelbrotReferenceBuffer) == null ? void 0 : _c2.destroy) == null ? void 0 : _d.call(_c2);
    }
  }
  const Oc = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, Rc = {
    class: "footer-love tag is-light is-medium is-hidden-touch"
  }, Ac = {
    href: "https://github.com/gcollombet/mandelbrot",
    target: "_blank",
    rel: "noopener",
    class: "",
    "aria-label": "GitHub"
  }, Fc = {
    class: "github-logo",
    height: "20",
    viewBox: "0 0 16 16",
    width: "20",
    fill: "currentColor",
    style: {
      "vertical-align": "middle",
      "margin-right": "4px"
    }
  }, $r = 1, Wr = 128, $t = 0.04, Gr = 0.025, Ic = gs({
    __name: "MandelbrotNavigator",
    setup(e) {
      const t = vn(null);
      let n, r, s;
      const i = vn({
        cx: "-1.5",
        cy: "0.0",
        mu: 1e4,
        scale: "2.5",
        angle: "0.0",
        maxIterations: 1e3,
        antialiasLevel: $r,
        palettePeriod: Wr
      });
      function o(F) {
        h[F.key.toLowerCase()] = true;
      }
      function c(F) {
        h[F.key.toLowerCase()] = false;
      }
      function f(F) {
        F.preventDefault();
        const P = 0.8;
        F.deltaY < 0 ? s.zoom(P) : s.zoom(1 / P);
      }
      const h = {};
      let u = false, p = false, S = 0, C = 0;
      const z = vn(false);
      let L = 0, Q = 0, H = 0, G = false;
      function J() {
        typeof window < "u" && window.navigator ? z.value = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent) : z.value = false;
      }
      function M(F) {
        const P = t.value;
        if (!P) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const B = P.getBoundingClientRect();
        return {
          x: F.clientX - B.left,
          y: F.clientY - B.top,
          width: B.width,
          height: B.height
        };
      }
      function k(F) {
        if (F.button === 2) p = true;
        else {
          u = true;
          const P = M(F);
          S = P.x, C = P.y;
        }
      }
      function we(F) {
        var _a;
        const P = M(F);
        if (p) {
          const ee = (_a = t.value) == null ? void 0 : _a.getBoundingClientRect();
          if (!ee) return;
          const st = ee.width / 2, pt = ee.height / 2, _t = P.x, Je = P.y, it = Math.atan2(Je - pt, _t - st);
          s.angle(it);
          return;
        }
        if (!u) return;
        const B = P.width, X = P.height, V = B / X, U = (P.x - S) / B * 2, ne = (P.y - C) / X * 2, Ce = -U * V, pe = ne;
        s.translate_direct(Ce, pe), S = P.x, C = P.y;
      }
      function me(F) {
        F.button === 2 ? p = false : u = false;
      }
      function Se(F) {
        var _a;
        if (F.touches.length === 1) {
          u = true;
          const P = F.touches[0], B = (_a = t.value) == null ? void 0 : _a.getBoundingClientRect();
          if (!B) return;
          S = P.clientX - B.left, C = P.clientY - B.top;
        } else if (F.touches.length === 2) {
          u = false, G = true;
          const [P, B] = F.touches;
          L = Math.hypot(B.clientX - P.clientX, B.clientY - P.clientY), Q = Math.atan2(B.clientY - P.clientY, B.clientX - P.clientX), H = parseFloat(i.value.angle);
        }
      }
      function rt(F) {
        var _a;
        if (u && F.touches.length === 1) {
          const P = F.touches[0], B = (_a = t.value) == null ? void 0 : _a.getBoundingClientRect();
          if (!B) return;
          const X = P.clientX - B.left, V = P.clientY - B.top, U = B.width, ne = B.height, Ce = U / ne, pe = (X - S) / U * 2, ee = (V - C) / ne * 2;
          s.translate_direct(-pe * Ce, ee), S = X, C = V;
        } else if (G && F.touches.length === 2) {
          const [P, B] = F.touches, X = Math.hypot(B.clientX - P.clientX, B.clientY - P.clientY), V = Math.atan2(B.clientY - P.clientY, B.clientX - P.clientX), U = L / X;
          s.zoom(U);
          const ne = V - Q;
          s.angle(H + ne);
        }
      }
      function De(F) {
        F.touches.length === 0 && (u = false, G = false);
      }
      async function Ye() {
        if (!t.value) return;
        n = t.value, s = new Bl(-0.5572506229492065, 0.6355989165839159, 1e4, 2.5, 0), r = new Mc(n, {
          antialiasLevel: 1,
          palettePeriod: 128
        }), await r.initialize(s), window.addEventListener("keydown", o), window.addEventListener("keyup", c), n.addEventListener("wheel", f, {
          passive: false
        }), n.addEventListener("mousedown", k), n.addEventListener("contextmenu", function(B) {
          B.preventDefault();
        }), window.addEventListener("mousemove", we), window.addEventListener("mouseup", me);
        function F() {
          h.z && s.translate(0, $t), h.s && s.translate(0, -$t), h.q && s.translate(-$t, 0), h.d && s.translate($t, 0), h.a && s.rotate(Gr), h.e && s.rotate(-Gr);
          const B = 0.8;
          h.r && s.zoom(B), h.f && s.zoom(1 / B), setTimeout(F, 16);
        }
        F();
        function P() {
          const B = i.value.epsilon, [X, V, U, ne] = s.step(), [Ce, pe, ee, st] = s.get_params(), pt = i.value.mu;
          i.value.cx = Ce, i.value.cy = pe, i.value.scale = ee, i.value.angle = st;
          const _t = Math.min(Math.max(100, 80 + 20 * Math.log2(1 / U)), 1e6);
          r.update({
            cx: X,
            cy: V,
            mu: pt,
            scale: U,
            angle: ne,
            maxIterations: _t,
            epsilon: B
          }, {
            antialiasLevel: $r,
            palettePeriod: Wr
          }), r.render(), requestAnimationFrame(P);
        }
        P();
      }
      function Xe() {
        if (!t.value || !r) return;
        const F = t.value.getBoundingClientRect();
        t.value.width = F.width, t.value.height = F.height, r.resize && r.resize(), r.render();
      }
      return rr(() => {
        J(), Ye(), window.addEventListener("resize", Xe), t.value && (t.value.addEventListener("touchstart", Se, {
          passive: false
        }), t.value.addEventListener("touchmove", rt, {
          passive: false
        }), t.value.addEventListener("touchend", De, {
          passive: false
        }));
      }), sr(() => {
        window.removeEventListener("resize", Xe);
      }), (F, P) => (nn(), Un("div", Oc, [
        P[4] || (P[4] = de("button", {
          class: "menu-hamburger tag is-light is-medium",
          "aria-label": "Menu"
        }, [
          de("span", {
            class: "hamburger-bar"
          }),
          de("span", {
            class: "hamburger-bar"
          }),
          de("span", {
            class: "hamburger-bar"
          })
        ], -1)),
        de("canvas", {
          ref_key: "canvasRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          }
        }, null, 512),
        zo("", true),
        P[5] || (P[5] = Uo('<div class="shortcut-hint tag is-light is-medium is-hidden-touch"> D\xE9placer\xA0 <span class="tag is-black">Clic gauche</span>\xA0 <span class="tag is-black">Z</span>\xA0 <span class="tag is-black">Q</span>\xA0 <span class="tag is-black">S</span>\xA0 <span class="tag is-black">D</span>\xA0 |\xA0Tourner\xA0 <span class="tag is-black">Clic droit</span>\xA0 <span class="tag is-black">A</span>\xA0 <span class="tag is-black">E</span>\xA0 |\xA0Zoomer\xA0 <span class="tag is-black">Molette</span>\xA0 <span class="tag is-black">R</span>\xA0 <span class="tag is-black">F</span></div>', 1)),
        de("div", Rc, [
          P[3] || (P[3] = de("small", null, [
            de("small", null, [
              qt(" Made with \u2764\uFE0F "),
              de("small", null, "by Guillaume Collombet"),
              qt("\xA0|\xA0 ")
            ])
          ], -1)),
          de("small", null, [
            de("a", Ac, [
              (nn(), Un("svg", Fc, P[1] || (P[1] = [
                de("path", {
                  d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                }, null, -1)
              ]))),
              P[2] || (P[2] = qt("GitHub ", -1))
            ])
          ])
        ])
      ]));
    }
  }), Dc = {
    id: "fullscreen"
  }, Bc = gs({
    __name: "App",
    setup(e) {
      return rr(() => {
      }), (t, n) => (nn(), Un("div", Dc, [
        ye(Ic)
      ]));
    }
  });
  vl(Bc).mount("#app");
})();
