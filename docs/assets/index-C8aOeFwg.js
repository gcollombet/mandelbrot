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
  function Yn(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const W = {}, ct = [], Ae = () => {
  }, es = () => false, dn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Xn = (e) => e.startsWith("onUpdate:"), oe = Object.assign, kn = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, ts = Object.prototype.hasOwnProperty, G = (e, t) => ts.call(e, t), I = Array.isArray, Ct = (e) => hn(e) === "[object Map]", ns = (e) => hn(e) === "[object Set]", F = (e) => typeof e == "function", ee = (e) => typeof e == "string", _t = (e) => typeof e == "symbol", J = (e) => e !== null && typeof e == "object", Jr = (e) => (J(e) || F(e)) && F(e.then) && F(e.catch), rs = Object.prototype.toString, hn = (e) => rs.call(e), is = (e) => hn(e).slice(8, -1), ss = (e) => hn(e) === "[object Object]", Jn = (e) => ee(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Pt = Yn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), pn = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  }, os = /-(\w)/g, Xe = pn((e) => e.replace(os, (t, n) => n ? n.toUpperCase() : "")), ls = /\B([A-Z])/g, it = pn((e) => e.replace(ls, "-$1").toLowerCase()), Zr = pn((e) => e.charAt(0).toUpperCase() + e.slice(1)), yn = pn((e) => e ? `on${Zr(e)}` : ""), Ye = (e, t) => !Object.is(e, t), wn = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, Dn = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, as = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  };
  let vr;
  const _n = () => vr || (vr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function Zn(e) {
    if (I(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], i = ee(r) ? ds(r) : Zn(r);
        if (i) for (const s in i) t[s] = i[s];
      }
      return t;
    } else if (ee(e) || J(e)) return e;
  }
  const cs = /;(?![^(]*\))/g, fs = /:([^]+)/, us = /\/\*[^]*?\*\//g;
  function ds(e) {
    const t = {};
    return e.replace(us, "").split(cs).forEach((n) => {
      if (n) {
        const r = n.split(fs);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }), t;
  }
  function ft(e) {
    let t = "";
    if (ee(e)) t = e;
    else if (I(e)) for (let n = 0; n < e.length; n++) {
      const r = ft(e[n]);
      r && (t += r + " ");
    }
    else if (J(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const hs = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", ps = Yn(hs);
  function Qr(e) {
    return !!e || e === "";
  }
  let he;
  class _s {
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
          const i = this.parent.scopes.pop();
          i && i !== this && (this.parent.scopes[this.index] = i, i.index = this.index);
        }
        this.parent = void 0;
      }
    }
  }
  function gs() {
    return he;
  }
  let q;
  const Sn = /* @__PURE__ */ new WeakSet();
  class ei {
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
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || ni(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, xr(this), ri(this);
      const t = q, n = xe;
      q = this, xe = true;
      try {
        return this.fn();
      } finally {
        ii(this), q = t, xe = n, this.flags &= -3;
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
      jn(this) && this.run();
    }
    get dirty() {
      return jn(this);
    }
  }
  let ti = 0, Rt, Mt;
  function ni(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = Mt, Mt = e;
      return;
    }
    e.next = Rt, Rt = e;
  }
  function Qn() {
    ti++;
  }
  function er() {
    if (--ti > 0) return;
    if (Mt) {
      let t = Mt;
      for (Mt = void 0; t; ) {
        const n = t.next;
        t.next = void 0, t.flags &= -9, t = n;
      }
    }
    let e;
    for (; Rt; ) {
      let t = Rt;
      for (Rt = void 0; t; ) {
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
  function ri(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function ii(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const i = r.prevDep;
      r.version === -1 ? (r === n && (n = i), tr(r), bs(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = i;
    }
    e.deps = t, e.depsTail = n;
  }
  function jn(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (si(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function si(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Bt) || (e.globalVersion = Bt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !jn(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = q, r = xe;
    q = e, xe = true;
    try {
      ri(e);
      const i = e.fn(e._value);
      (t.version === 0 || Ye(i, e._value)) && (e.flags |= 128, e._value = i, t.version++);
    } catch (i) {
      throw t.version++, i;
    } finally {
      q = n, xe = r, ii(e), e.flags &= -3;
    }
  }
  function tr(e, t = false) {
    const { dep: n, prevSub: r, nextSub: i } = e;
    if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
      n.computed.flags &= -5;
      for (let s = n.computed.deps; s; s = s.nextDep) tr(s, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function bs(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let xe = true;
  const oi = [];
  function Ve() {
    oi.push(xe), xe = false;
  }
  function Ge() {
    const e = oi.pop();
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
  let Bt = 0;
  class ms {
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
      if (n === void 0 || n.sub !== q) n = this.activeLink = new ms(q, this), q.deps ? (n.prevDep = q.depsTail, q.depsTail.nextDep = n, q.depsTail = n) : q.deps = q.depsTail = n, li(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = q.depsTail, n.nextDep = void 0, q.depsTail.nextDep = n, q.depsTail = n, q.deps === n && (q.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, Bt++, this.notify(t);
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
  function li(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let r = t.deps; r; r = r.nextDep) li(r);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const Bn = /* @__PURE__ */ new WeakMap(), nt = Symbol(""), Ln = Symbol(""), Lt = Symbol("");
  function ie(e, t, n) {
    if (xe && q) {
      let r = Bn.get(e);
      r || Bn.set(e, r = /* @__PURE__ */ new Map());
      let i = r.get(n);
      i || (r.set(n, i = new nr()), i.map = r, i.key = n), i.track();
    }
  }
  function ze(e, t, n, r, i, s) {
    const o = Bn.get(e);
    if (!o) {
      Bt++;
      return;
    }
    const a = (f) => {
      f && f.trigger();
    };
    if (Qn(), t === "clear") o.forEach(a);
    else {
      const f = I(e), h = f && Jn(n);
      if (f && n === "length") {
        const u = Number(r);
        o.forEach((p, S) => {
          (S === "length" || S === Lt || !_t(S) && S >= u) && a(p);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && a(o.get(n)), h && a(o.get(Lt)), t) {
        case "add":
          f ? h && a(o.get("length")) : (a(o.get(nt)), Ct(e) && a(o.get(Ln)));
          break;
        case "delete":
          f || (a(o.get(nt)), Ct(e) && a(o.get(Ln)));
          break;
        case "set":
          Ct(e) && a(o.get(nt));
          break;
      }
    }
    er();
  }
  function ot(e) {
    const t = V(e);
    return t === e ? t : (ie(t, "iterate", Lt), ye(e) ? t : t.map(ae));
  }
  function rr(e) {
    return ie(e = V(e), "iterate", Lt), e;
  }
  const vs = {
    __proto__: null,
    [Symbol.iterator]() {
      return Tn(this, Symbol.iterator, ae);
    },
    concat(...e) {
      return ot(this).concat(...e.map((t) => I(t) ? ot(t) : t));
    },
    entries() {
      return Tn(this, "entries", (e) => (e[1] = ae(e[1]), e));
    },
    every(e, t) {
      return je(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return je(this, "filter", e, t, (n) => n.map(ae), arguments);
    },
    find(e, t) {
      return je(this, "find", e, t, ae, arguments);
    },
    findIndex(e, t) {
      return je(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return je(this, "findLast", e, t, ae, arguments);
    },
    findLastIndex(e, t) {
      return je(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return je(this, "forEach", e, t, void 0, arguments);
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
      return je(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return yt(this, "pop");
    },
    push(...e) {
      return yt(this, "push", e);
    },
    reduce(e, ...t) {
      return yr(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return yr(this, "reduceRight", e, t);
    },
    shift() {
      return yt(this, "shift");
    },
    some(e, t) {
      return je(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return yt(this, "splice", e);
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
      return yt(this, "unshift", e);
    },
    values() {
      return Tn(this, "values", ae);
    }
  };
  function Tn(e, t, n) {
    const r = rr(e), i = r[t]();
    return r !== e && !ye(e) && (i._next = i.next, i.next = () => {
      const s = i._next();
      return s.value && (s.value = n(s.value)), s;
    }), i;
  }
  const xs = Array.prototype;
  function je(e, t, n, r, i, s) {
    const o = rr(e), a = o !== e && !ye(e), f = o[t];
    if (f !== xs[t]) {
      const p = f.apply(e, s);
      return a ? ae(p) : p;
    }
    let h = n;
    o !== e && (a ? h = function(p, S) {
      return n.call(this, ae(p), S, e);
    } : n.length > 2 && (h = function(p, S) {
      return n.call(this, p, S, e);
    }));
    const u = f.call(o, h, r);
    return a && i ? i(u) : u;
  }
  function yr(e, t, n, r) {
    const i = rr(e);
    let s = n;
    return i !== e && (ye(e) ? n.length > 3 && (s = function(o, a, f) {
      return n.call(this, o, a, f, e);
    }) : s = function(o, a, f) {
      return n.call(this, o, ae(a), f, e);
    }), i[t](s, ...r);
  }
  function En(e, t, n) {
    const r = V(e);
    ie(r, "iterate", Lt);
    const i = r[t](...n);
    return (i === -1 || i === false) && lr(n[0]) ? (n[0] = V(n[0]), r[t](...n)) : i;
  }
  function yt(e, t, n = []) {
    Ve(), Qn();
    const r = V(e)[t].apply(e, n);
    return er(), Ge(), r;
  }
  const ys = Yn("__proto__,__v_isRef,__isVue"), ai = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(_t));
  function ws(e) {
    _t(e) || (e = String(e));
    const t = V(this);
    return ie(t, "has", e), t.hasOwnProperty(e);
  }
  class ci {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const i = this._isReadonly, s = this._isShallow;
      if (n === "__v_isReactive") return !i;
      if (n === "__v_isReadonly") return i;
      if (n === "__v_isShallow") return s;
      if (n === "__v_raw") return r === (i ? s ? Fs : hi : s ? di : ui).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const o = I(t);
      if (!i) {
        let f;
        if (o && (f = vs[n])) return f;
        if (n === "hasOwnProperty") return ws;
      }
      const a = Reflect.get(t, n, se(t) ? t : r);
      return (_t(n) ? ai.has(n) : ys(n)) || (i || ie(t, "get", n), s) ? a : se(a) ? o && Jn(n) ? a : a.value : J(a) ? i ? pi(a) : sr(a) : a;
    }
  }
  class fi extends ci {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, i) {
      let s = t[n];
      if (!this._isShallow) {
        const f = rt(s);
        if (!ye(r) && !rt(r) && (s = V(s), r = V(r)), !I(t) && se(s) && !se(r)) return f ? false : (s.value = r, true);
      }
      const o = I(t) && Jn(n) ? Number(n) < t.length : G(t, n), a = Reflect.set(t, n, r, se(t) ? t : i);
      return t === V(i) && (o ? Ye(r, s) && ze(t, "set", n, r) : ze(t, "add", n, r)), a;
    }
    deleteProperty(t, n) {
      const r = G(t, n);
      t[n];
      const i = Reflect.deleteProperty(t, n);
      return i && r && ze(t, "delete", n, void 0), i;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!_t(n) || !ai.has(n)) && ie(t, "has", n), r;
    }
    ownKeys(t) {
      return ie(t, "iterate", I(t) ? "length" : nt), Reflect.ownKeys(t);
    }
  }
  class Ss extends ci {
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
  const Ts = new fi(), Es = new Ss(), Cs = new fi(true);
  const zn = (e) => e, $t = (e) => Reflect.getPrototypeOf(e);
  function Ps(e, t, n) {
    return function(...r) {
      const i = this.__v_raw, s = V(i), o = Ct(s), a = e === "entries" || e === Symbol.iterator && o, f = e === "keys" && o, h = i[e](...r), u = n ? zn : t ? Nn : ae;
      return !t && ie(s, "iterate", f ? Ln : nt), {
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
  function Kt(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function Rs(e, t) {
    const n = {
      get(i) {
        const s = this.__v_raw, o = V(s), a = V(i);
        e || (Ye(i, a) && ie(o, "get", i), ie(o, "get", a));
        const { has: f } = $t(o), h = t ? zn : e ? Nn : ae;
        if (f.call(o, i)) return h(s.get(i));
        if (f.call(o, a)) return h(s.get(a));
        s !== o && s.get(i);
      },
      get size() {
        const i = this.__v_raw;
        return !e && ie(V(i), "iterate", nt), Reflect.get(i, "size", i);
      },
      has(i) {
        const s = this.__v_raw, o = V(s), a = V(i);
        return e || (Ye(i, a) && ie(o, "has", i), ie(o, "has", a)), i === a ? s.has(i) : s.has(i) || s.has(a);
      },
      forEach(i, s) {
        const o = this, a = o.__v_raw, f = V(a), h = t ? zn : e ? Nn : ae;
        return !e && ie(f, "iterate", nt), a.forEach((u, p) => i.call(s, h(u), h(p), o));
      }
    };
    return oe(n, e ? {
      add: Kt("add"),
      set: Kt("set"),
      delete: Kt("delete"),
      clear: Kt("clear")
    } : {
      add(i) {
        !t && !ye(i) && !rt(i) && (i = V(i));
        const s = V(this);
        return $t(s).has.call(s, i) || (s.add(i), ze(s, "add", i, i)), this;
      },
      set(i, s) {
        !t && !ye(s) && !rt(s) && (s = V(s));
        const o = V(this), { has: a, get: f } = $t(o);
        let h = a.call(o, i);
        h || (i = V(i), h = a.call(o, i));
        const u = f.call(o, i);
        return o.set(i, s), h ? Ye(s, u) && ze(o, "set", i, s) : ze(o, "add", i, s), this;
      },
      delete(i) {
        const s = V(this), { has: o, get: a } = $t(s);
        let f = o.call(s, i);
        f || (i = V(i), f = o.call(s, i)), a && a.call(s, i);
        const h = s.delete(i);
        return f && ze(s, "delete", i, void 0), h;
      },
      clear() {
        const i = V(this), s = i.size !== 0, o = i.clear();
        return s && ze(i, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((i) => {
      n[i] = Ps(i, e, t);
    }), n;
  }
  function ir(e, t) {
    const n = Rs(e, t);
    return (r, i, s) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? r : Reflect.get(G(n, i) && i in r ? n : r, i, s);
  }
  const Ms = {
    get: ir(false, false)
  }, Os = {
    get: ir(false, true)
  }, As = {
    get: ir(true, false)
  };
  const ui = /* @__PURE__ */ new WeakMap(), di = /* @__PURE__ */ new WeakMap(), hi = /* @__PURE__ */ new WeakMap(), Fs = /* @__PURE__ */ new WeakMap();
  function Is(e) {
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
  function Us(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Is(is(e));
  }
  function sr(e) {
    return rt(e) ? e : or(e, false, Ts, Ms, ui);
  }
  function Ds(e) {
    return or(e, false, Cs, Os, di);
  }
  function pi(e) {
    return or(e, true, Es, As, hi);
  }
  function or(e, t, n, r, i) {
    if (!J(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const s = Us(e);
    if (s === 0) return e;
    const o = i.get(e);
    if (o) return o;
    const a = new Proxy(e, s === 2 ? r : n);
    return i.set(e, a), a;
  }
  function Ot(e) {
    return rt(e) ? Ot(e.__v_raw) : !!(e && e.__v_isReactive);
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
  function V(e) {
    const t = e && e.__v_raw;
    return t ? V(t) : e;
  }
  function js(e) {
    return !G(e, "__v_skip") && Object.isExtensible(e) && Dn(e, "__v_skip", true), e;
  }
  const ae = (e) => J(e) ? sr(e) : e, Nn = (e) => J(e) ? pi(e) : e;
  function se(e) {
    return e ? e.__v_isRef === true : false;
  }
  function Tt(e) {
    return Bs(e, false);
  }
  function Bs(e, t) {
    return se(e) ? e : new Ls(e, t);
  }
  class Ls {
    constructor(t, n) {
      this.dep = new nr(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : V(t), this._value = n ? t : ae(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || ye(t) || rt(t);
      t = r ? t : V(t), Ye(t, n) && (this._rawValue = t, this._value = r ? t : ae(t), this.dep.trigger());
    }
  }
  function zs(e) {
    return se(e) ? e.value : e;
  }
  const Ns = {
    get: (e, t, n) => t === "__v_raw" ? e : zs(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const i = e[t];
      return se(i) && !se(n) ? (i.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function _i(e) {
    return Ot(e) ? e : new Proxy(e, Ns);
  }
  class Vs {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new nr(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Bt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && q !== this) return ni(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return si(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function Gs(e, t, n = false) {
    let r, i;
    return F(e) ? r = e : (r = e.get, i = e.set), new Vs(r, i, n);
  }
  const qt = {}, on = /* @__PURE__ */ new WeakMap();
  let tt;
  function Hs(e, t = false, n = tt) {
    if (n) {
      let r = on.get(n);
      r || on.set(n, r = []), r.push(e);
    }
  }
  function Ws(e, t, n = W) {
    const { immediate: r, deep: i, once: s, scheduler: o, augmentJob: a, call: f } = n, h = (M) => i ? M : ye(M) || i === false || i === 0 ? Ne(M, 1) : Ne(M);
    let u, p, S, E, L = false, B = false;
    if (se(e) ? (p = () => e.value, L = ye(e)) : Ot(e) ? (p = () => h(e), L = true) : I(e) ? (B = true, L = e.some((M) => Ot(M) || ye(M)), p = () => e.map((M) => {
      if (se(M)) return M.value;
      if (Ot(M)) return h(M);
      if (F(M)) return f ? f(M, 2) : M();
    })) : F(e) ? t ? p = f ? () => f(e, 2) : e : p = () => {
      if (S) {
        Ve();
        try {
          S();
        } finally {
          Ge();
        }
      }
      const M = tt;
      tt = u;
      try {
        return f ? f(e, 3, [
          E
        ]) : e(E);
      } finally {
        tt = M;
      }
    } : p = Ae, t && i) {
      const M = p, k = i === true ? 1 / 0 : i;
      p = () => Ne(M(), k);
    }
    const Z = gs(), N = () => {
      u.stop(), Z && Z.active && kn(Z.effects, u);
    };
    if (s && t) {
      const M = t;
      t = (...k) => {
        M(...k), N();
      };
    }
    let $ = B ? new Array(e.length).fill(qt) : qt;
    const Y = (M) => {
      if (!(!(u.flags & 1) || !u.dirty && !M)) if (t) {
        const k = u.run();
        if (i || L || (B ? k.some((Se, me) => Ye(Se, $[me])) : Ye(k, $))) {
          S && S();
          const Se = tt;
          tt = u;
          try {
            const me = [
              k,
              $ === qt ? void 0 : B && $[0] === qt ? [] : $,
              E
            ];
            $ = k, f ? f(t, 3, me) : t(...me);
          } finally {
            tt = Se;
          }
        }
      } else u.run();
    };
    return a && a(Y), u = new ei(p), u.scheduler = o ? () => o(Y, false) : Y, E = (M) => Hs(M, false, u), S = u.onStop = () => {
      const M = on.get(u);
      if (M) {
        if (f) f(M, 4);
        else for (const k of M) k();
        on.delete(u);
      }
    }, t ? r ? Y(true) : $ = u.run() : o ? o(Y.bind(null, true), true) : u.run(), N.pause = u.pause.bind(u), N.resume = u.resume.bind(u), N.stop = N, N;
  }
  function Ne(e, t = 1 / 0, n) {
    if (t <= 0 || !J(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
    if (n.add(e), t--, se(e)) Ne(e.value, t, n);
    else if (I(e)) for (let r = 0; r < e.length; r++) Ne(e[r], t, n);
    else if (ns(e) || Ct(e)) e.forEach((r) => {
      Ne(r, t, n);
    });
    else if (ss(e)) {
      for (const r in e) Ne(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && Ne(e[r], t, n);
    }
    return e;
  }
  function Gt(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (i) {
      gn(i, t, n);
    }
  }
  function Fe(e, t, n, r) {
    if (F(e)) {
      const i = Gt(e, t, n, r);
      return i && Jr(i) && i.catch((s) => {
        gn(s, t, n);
      }), i;
    }
    if (I(e)) {
      const i = [];
      for (let s = 0; s < e.length; s++) i.push(Fe(e[s], t, n, r));
      return i;
    }
  }
  function gn(e, t, n, r = true) {
    const i = t ? t.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: o } = t && t.appContext.config || W;
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
      if (s) {
        Ve(), Gt(s, null, 10, [
          e,
          f,
          h
        ]), Ge();
        return;
      }
    }
    $s(e, n, i, r, o);
  }
  function $s(e, t, n, r = true, i = false) {
    if (i) throw e;
    console.error(e);
  }
  const ce = [];
  let Me = -1;
  const ut = [];
  let Ke = null, at = 0;
  const gi = Promise.resolve();
  let ln = null;
  function Vn(e) {
    const t = ln || gi;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function Ks(e) {
    let t = Me + 1, n = ce.length;
    for (; t < n; ) {
      const r = t + n >>> 1, i = ce[r], s = zt(i);
      s < e || s === e && i.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function ar(e) {
    if (!(e.flags & 1)) {
      const t = zt(e), n = ce[ce.length - 1];
      !n || !(e.flags & 2) && t >= zt(n) ? ce.push(e) : ce.splice(Ks(t), 0, e), e.flags |= 1, bi();
    }
  }
  function bi() {
    ln || (ln = gi.then(vi));
  }
  function qs(e) {
    I(e) ? ut.push(...e) : Ke && e.id === -1 ? Ke.splice(at + 1, 0, e) : e.flags & 1 || (ut.push(e), e.flags |= 1), bi();
  }
  function wr(e, t, n = Me + 1) {
    for (; n < ce.length; n++) {
      const r = ce[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        ce.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function mi(e) {
    if (ut.length) {
      const t = [
        ...new Set(ut)
      ].sort((n, r) => zt(n) - zt(r));
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
  const zt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function vi(e) {
    try {
      for (Me = 0; Me < ce.length; Me++) {
        const t = ce[Me];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Gt(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; Me < ce.length; Me++) {
        const t = ce[Me];
        t && (t.flags &= -2);
      }
      Me = -1, ce.length = 0, mi(), ln = null, (ce.length || ut.length) && vi();
    }
  }
  let ve = null, xi = null;
  function an(e) {
    const t = ve;
    return ve = e, xi = e && e.type.__scopeId || null, t;
  }
  function Ys(e, t = ve, n) {
    if (!t || e._n) return e;
    const r = (...i) => {
      r._d && Ar(-1);
      const s = an(t);
      let o;
      try {
        o = e(...i);
      } finally {
        an(s), r._d && Ar(1);
      }
      return o;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function Cn(e, t) {
    if (ve === null) return e;
    const n = xn(ve), r = e.dirs || (e.dirs = []);
    for (let i = 0; i < t.length; i++) {
      let [s, o, a, f = W] = t[i];
      s && (F(s) && (s = {
        mounted: s,
        updated: s
      }), s.deep && Ne(o), r.push({
        dir: s,
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
    const i = e.dirs, s = t && t.dirs;
    for (let o = 0; o < i.length; o++) {
      const a = i[o];
      s && (a.oldValue = s[o].value);
      let f = a.dir[r];
      f && (Ve(), Fe(f, n, 8, [
        e.el,
        a,
        e,
        t
      ]), Ge());
    }
  }
  const Xs = Symbol("_vte"), ks = (e) => e.__isTeleport;
  function cr(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, cr(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function yi(e, t) {
    return F(e) ? oe({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function wi(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function At(e, t, n, r, i = false) {
    if (I(e)) {
      e.forEach((L, B) => At(L, t && (I(t) ? t[B] : t), n, r, i));
      return;
    }
    if (Ft(r) && !i) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && At(e, t, n, r.component.subTree);
      return;
    }
    const s = r.shapeFlag & 4 ? xn(r.component) : r.el, o = i ? null : s, { i: a, r: f } = e, h = t && t.r, u = a.refs === W ? a.refs = {} : a.refs, p = a.setupState, S = V(p), E = p === W ? () => false : (L) => G(S, L);
    if (h != null && h !== f && (ee(h) ? (u[h] = null, E(h) && (p[h] = null)) : se(h) && (h.value = null)), F(f)) Gt(f, a, 12, [
      o,
      u
    ]);
    else {
      const L = ee(f), B = se(f);
      if (L || B) {
        const Z = () => {
          if (e.f) {
            const N = L ? E(f) ? p[f] : u[f] : f.value;
            i ? I(N) && kn(N, s) : I(N) ? N.includes(s) || N.push(s) : L ? (u[f] = [
              s
            ], E(f) && (p[f] = u[f])) : (f.value = [
              s
            ], e.k && (u[e.k] = f.value));
          } else L ? (u[f] = o, E(f) && (p[f] = o)) : B && (f.value = o, e.k && (u[e.k] = o));
        };
        o ? (Z.id = -1, ge(Z, n)) : Z();
      }
    }
  }
  _n().requestIdleCallback;
  _n().cancelIdleCallback;
  const Ft = (e) => !!e.type.__asyncLoader, Si = (e) => e.type.__isKeepAlive;
  function Js(e, t) {
    Ti(e, "a", t);
  }
  function Zs(e, t) {
    Ti(e, "da", t);
  }
  function Ti(e, t, n = fe) {
    const r = e.__wdc || (e.__wdc = () => {
      let i = n;
      for (; i; ) {
        if (i.isDeactivated) return;
        i = i.parent;
      }
      return e();
    });
    if (bn(t, r, n), n) {
      let i = n.parent;
      for (; i && i.parent; ) Si(i.parent.vnode) && Qs(r, t, n, i), i = i.parent;
    }
  }
  function Qs(e, t, n, r) {
    const i = bn(t, e, r, true);
    ur(() => {
      kn(r[t], i);
    }, n);
  }
  function bn(e, t, n = fe, r = false) {
    if (n) {
      const i = n[e] || (n[e] = []), s = t.__weh || (t.__weh = (...o) => {
        Ve();
        const a = Ht(n), f = Fe(t, n, e, o);
        return a(), Ge(), f;
      });
      return r ? i.unshift(s) : i.push(s), s;
    }
  }
  const He = (e) => (t, n = fe) => {
    (!Vt || e === "sp") && bn(e, (...r) => t(...r), n);
  }, eo = He("bm"), fr = He("m"), to = He("bu"), no = He("u"), ro = He("bum"), ur = He("um"), io = He("sp"), so = He("rtg"), oo = He("rtc");
  function lo(e, t = fe) {
    bn("ec", e, t);
  }
  const ao = Symbol.for("v-ndc"), Gn = (e) => e ? Ki(e) ? xn(e) : Gn(e.parent) : null, It = oe(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => Gn(e.parent),
    $root: (e) => Gn(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Ci(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      ar(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Vn.bind(e.proxy)),
    $watch: (e) => Ao.bind(e)
  }), Pn = (e, t) => e !== W && !e.__isScriptSetup && G(e, t), co = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: r, data: i, props: s, accessCache: o, type: a, appContext: f } = e;
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
          if (Pn(r, t)) return o[t] = 1, r[t];
          if (i !== W && G(i, t)) return o[t] = 2, i[t];
          if ((h = e.propsOptions[0]) && G(h, t)) return o[t] = 3, s[t];
          if (n !== W && G(n, t)) return o[t] = 4, n[t];
          Hn && (o[t] = 0);
        }
      }
      const u = It[t];
      let p, S;
      if (u) return t === "$attrs" && ie(e.attrs, "get", ""), u(e);
      if ((p = a.__cssModules) && (p = p[t])) return p;
      if (n !== W && G(n, t)) return o[t] = 4, n[t];
      if (S = f.config.globalProperties, G(S, t)) return S[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: i, ctx: s } = e;
      return Pn(i, t) ? (i[t] = n, true) : r !== W && G(r, t) ? (r[t] = n, true) : G(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (s[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, propsOptions: s } }, o) {
      let a;
      return !!n[o] || e !== W && G(e, o) || Pn(t, o) || (a = s[0]) && G(a, o) || G(r, o) || G(It, o) || G(i.config.globalProperties, o);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : G(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function Sr(e) {
    return I(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  let Hn = true;
  function fo(e) {
    const t = Ci(e), n = e.proxy, r = e.ctx;
    Hn = false, t.beforeCreate && Tr(t.beforeCreate, e, "bc");
    const { data: i, computed: s, methods: o, watch: a, provide: f, inject: h, created: u, beforeMount: p, mounted: S, beforeUpdate: E, updated: L, activated: B, deactivated: Z, beforeDestroy: N, beforeUnmount: $, destroyed: Y, unmounted: M, render: k, renderTracked: Se, renderTriggered: me, errorCaptured: Te, serverPrefetch: st, expose: Ie, inheritAttrs: Je, components: Ze, directives: pe, filters: gt } = t;
    if (h && uo(h, r, null), o) for (const C in o) {
      const D = o[C];
      F(D) && (r[C] = D.bind(n));
    }
    if (i) {
      const C = i.call(n, n);
      J(C) && (e.data = sr(C));
    }
    if (Hn = true, s) for (const C in s) {
      const D = s[C], X = F(D) ? D.bind(n, n) : F(D.get) ? D.get.bind(n, n) : Ae, te = !F(D) && F(D.set) ? D.set.bind(n) : Ae, Q = Qo({
        get: X,
        set: te
      });
      Object.defineProperty(r, C, {
        enumerable: true,
        configurable: true,
        get: () => Q.value,
        set: (re) => Q.value = re
      });
    }
    if (a) for (const C in a) Ei(a[C], r, n, C);
    if (f) {
      const C = F(f) ? f.call(n) : f;
      Reflect.ownKeys(C).forEach((D) => {
        mo(D, C[D]);
      });
    }
    u && Tr(u, e, "c");
    function T(C, D) {
      I(D) ? D.forEach((X) => C(X.bind(n))) : D && C(D.bind(n));
    }
    if (T(eo, p), T(fr, S), T(to, E), T(no, L), T(Js, B), T(Zs, Z), T(lo, Te), T(oo, Se), T(so, me), T(ro, $), T(ur, M), T(io, st), I(Ie)) if (Ie.length) {
      const C = e.exposed || (e.exposed = {});
      Ie.forEach((D) => {
        Object.defineProperty(C, D, {
          get: () => n[D],
          set: (X) => n[D] = X,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    k && e.render === Ae && (e.render = k), Je != null && (e.inheritAttrs = Je), Ze && (e.components = Ze), pe && (e.directives = pe), st && wi(e);
  }
  function uo(e, t, n = Ae) {
    I(e) && (e = Wn(e));
    for (const r in e) {
      const i = e[r];
      let s;
      J(i) ? "default" in i ? s = Jt(i.from || r, i.default, true) : s = Jt(i.from || r) : s = Jt(i), se(s) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => s.value,
        set: (o) => s.value = o
      }) : t[r] = s;
    }
  }
  function Tr(e, t, n) {
    Fe(I(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function Ei(e, t, n, r) {
    let i = r.includes(".") ? zi(n, r) : () => n[r];
    if (ee(e)) {
      const s = t[e];
      F(s) && Mn(i, s);
    } else if (F(e)) Mn(i, e.bind(n));
    else if (J(e)) if (I(e)) e.forEach((s) => Ei(s, t, n, r));
    else {
      const s = F(e.handler) ? e.handler.bind(n) : t[e.handler];
      F(s) && Mn(i, s, e);
    }
  }
  function Ci(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: i, optionsCache: s, config: { optionMergeStrategies: o } } = e.appContext, a = s.get(t);
    let f;
    return a ? f = a : !i.length && !n && !r ? f = t : (f = {}, i.length && i.forEach((h) => cn(f, h, o, true)), cn(f, t, o)), J(t) && s.set(t, f), f;
  }
  function cn(e, t, n, r = false) {
    const { mixins: i, extends: s } = t;
    s && cn(e, s, n, true), i && i.forEach((o) => cn(e, o, n, true));
    for (const o in t) if (!(r && o === "expose")) {
      const a = ho[o] || n && n[o];
      e[o] = a ? a(e[o], t[o]) : t[o];
    }
    return e;
  }
  const ho = {
    data: Er,
    props: Cr,
    emits: Cr,
    methods: Et,
    computed: Et,
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
    components: Et,
    directives: Et,
    watch: _o,
    provide: Er,
    inject: po
  };
  function Er(e, t) {
    return t ? e ? function() {
      return oe(F(e) ? e.call(this, this) : e, F(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function po(e, t) {
    return Et(Wn(e), Wn(t));
  }
  function Wn(e) {
    if (I(e)) {
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
  function Et(e, t) {
    return e ? oe(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function Cr(e, t) {
    return e ? I(e) && I(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : oe(/* @__PURE__ */ Object.create(null), Sr(e), Sr(t ?? {})) : t;
  }
  function _o(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = oe(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = le(e[r], t[r]);
    return n;
  }
  function Pi() {
    return {
      app: null,
      config: {
        isNativeTag: es,
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
  let go = 0;
  function bo(e, t) {
    return function(r, i = null) {
      F(r) || (r = oe({}, r)), i != null && !J(i) && (i = null);
      const s = Pi(), o = /* @__PURE__ */ new WeakSet(), a = [];
      let f = false;
      const h = s.app = {
        _uid: go++,
        _component: r,
        _props: i,
        _container: null,
        _context: s,
        _instance: null,
        version: el,
        get config() {
          return s.config;
        },
        set config(u) {
        },
        use(u, ...p) {
          return o.has(u) || (u && F(u.install) ? (o.add(u), u.install(h, ...p)) : F(u) && (o.add(u), u(h, ...p))), h;
        },
        mixin(u) {
          return s.mixins.includes(u) || s.mixins.push(u), h;
        },
        component(u, p) {
          return p ? (s.components[u] = p, h) : s.components[u];
        },
        directive(u, p) {
          return p ? (s.directives[u] = p, h) : s.directives[u];
        },
        mount(u, p, S) {
          if (!f) {
            const E = h._ceVNode || we(r, i);
            return E.appContext = s, S === true ? S = "svg" : S === false && (S = void 0), e(E, u, S), f = true, h._container = u, u.__vue_app__ = h, xn(E.component);
          }
        },
        onUnmount(u) {
          a.push(u);
        },
        unmount() {
          f && (Fe(a, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
        },
        provide(u, p) {
          return s.provides[u] = p, h;
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
  function mo(e, t) {
    if (fe) {
      let n = fe.provides;
      const r = fe.parent && fe.parent.provides;
      r === n && (n = fe.provides = Object.create(r)), n[e] = t;
    }
  }
  function Jt(e, t, n = false) {
    const r = qo();
    if (r || dt) {
      let i = dt ? dt._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (i && e in i) return i[e];
      if (arguments.length > 1) return n && F(t) ? t.call(r && r.proxy) : t;
    }
  }
  const Ri = {}, Mi = () => Object.create(Ri), Oi = (e) => Object.getPrototypeOf(e) === Ri;
  function vo(e, t, n, r = false) {
    const i = {}, s = Mi();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Ai(e, t, i, s);
    for (const o in e.propsOptions[0]) o in i || (i[o] = void 0);
    n ? e.props = r ? i : Ds(i) : e.type.props ? e.props = i : e.props = s, e.attrs = s;
  }
  function xo(e, t, n, r) {
    const { props: i, attrs: s, vnode: { patchFlag: o } } = e, a = V(i), [f] = e.propsOptions;
    let h = false;
    if ((r || o > 0) && !(o & 16)) {
      if (o & 8) {
        const u = e.vnode.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          let S = u[p];
          if (mn(e.emitsOptions, S)) continue;
          const E = t[S];
          if (f) if (G(s, S)) E !== s[S] && (s[S] = E, h = true);
          else {
            const L = Xe(S);
            i[L] = $n(f, a, L, E, e, false);
          }
          else E !== s[S] && (s[S] = E, h = true);
        }
      }
    } else {
      Ai(e, t, i, s) && (h = true);
      let u;
      for (const p in a) (!t || !G(t, p) && ((u = it(p)) === p || !G(t, u))) && (f ? n && (n[p] !== void 0 || n[u] !== void 0) && (i[p] = $n(f, a, p, void 0, e, true)) : delete i[p]);
      if (s !== a) for (const p in s) (!t || !G(t, p)) && (delete s[p], h = true);
    }
    h && ze(e.attrs, "set", "");
  }
  function Ai(e, t, n, r) {
    const [i, s] = e.propsOptions;
    let o = false, a;
    if (t) for (let f in t) {
      if (Pt(f)) continue;
      const h = t[f];
      let u;
      i && G(i, u = Xe(f)) ? !s || !s.includes(u) ? n[u] = h : (a || (a = {}))[u] = h : mn(e.emitsOptions, f) || (!(f in r) || h !== r[f]) && (r[f] = h, o = true);
    }
    if (s) {
      const f = V(n), h = a || W;
      for (let u = 0; u < s.length; u++) {
        const p = s[u];
        n[p] = $n(i, f, p, h[p], e, !G(h, p));
      }
    }
    return o;
  }
  function $n(e, t, n, r, i, s) {
    const o = e[n];
    if (o != null) {
      const a = G(o, "default");
      if (a && r === void 0) {
        const f = o.default;
        if (o.type !== Function && !o.skipFactory && F(f)) {
          const { propsDefaults: h } = i;
          if (n in h) r = h[n];
          else {
            const u = Ht(i);
            r = h[n] = f.call(null, t), u();
          }
        } else r = f;
        i.ce && i.ce._setProp(n, r);
      }
      o[0] && (s && !a ? r = false : o[1] && (r === "" || r === it(n)) && (r = true));
    }
    return r;
  }
  const yo = /* @__PURE__ */ new WeakMap();
  function Fi(e, t, n = false) {
    const r = n ? yo : t.propsCache, i = r.get(e);
    if (i) return i;
    const s = e.props, o = {}, a = [];
    let f = false;
    if (!F(e)) {
      const u = (p) => {
        f = true;
        const [S, E] = Fi(p, t, true);
        oe(o, S), E && a.push(...E);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!s && !f) return J(e) && r.set(e, ct), ct;
    if (I(s)) for (let u = 0; u < s.length; u++) {
      const p = Xe(s[u]);
      Pr(p) && (o[p] = W);
    }
    else if (s) for (const u in s) {
      const p = Xe(u);
      if (Pr(p)) {
        const S = s[u], E = o[p] = I(S) || F(S) ? {
          type: S
        } : oe({}, S), L = E.type;
        let B = false, Z = true;
        if (I(L)) for (let N = 0; N < L.length; ++N) {
          const $ = L[N], Y = F($) && $.name;
          if (Y === "Boolean") {
            B = true;
            break;
          } else Y === "String" && (Z = false);
        }
        else B = F(L) && L.name === "Boolean";
        E[0] = B, E[1] = Z, (B || G(E, "default")) && a.push(p);
      }
    }
    const h = [
      o,
      a
    ];
    return J(e) && r.set(e, h), h;
  }
  function Pr(e) {
    return e[0] !== "$" && !Pt(e);
  }
  const dr = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", hr = (e) => I(e) ? e.map(Oe) : [
    Oe(e)
  ], wo = (e, t, n) => {
    if (t._n) return t;
    const r = Ys((...i) => hr(t(...i)), n);
    return r._c = false, r;
  }, Ii = (e, t, n) => {
    const r = e._ctx;
    for (const i in e) {
      if (dr(i)) continue;
      const s = e[i];
      if (F(s)) t[i] = wo(i, s, r);
      else if (s != null) {
        const o = hr(s);
        t[i] = () => o;
      }
    }
  }, Ui = (e, t) => {
    const n = hr(t);
    e.slots.default = () => n;
  }, Di = (e, t, n) => {
    for (const r in t) (n || !dr(r)) && (e[r] = t[r]);
  }, So = (e, t, n) => {
    const r = e.slots = Mi();
    if (e.vnode.shapeFlag & 32) {
      const i = t.__;
      i && Dn(r, "__", i, true);
      const s = t._;
      s ? (Di(r, t, n), n && Dn(r, "_", s, true)) : Ii(t, r);
    } else t && Ui(e, t);
  }, To = (e, t, n) => {
    const { vnode: r, slots: i } = e;
    let s = true, o = W;
    if (r.shapeFlag & 32) {
      const a = t._;
      a ? n && a === 1 ? s = false : Di(i, t, n) : (s = !t.$stable, Ii(t, i)), o = t;
    } else t && (Ui(e, t), o = {
      default: 1
    });
    if (s) for (const a in i) !dr(a) && o[a] == null && delete i[a];
  }, ge = Lo;
  function Eo(e) {
    return Co(e);
  }
  function Co(e, t) {
    const n = _n();
    n.__VUE__ = true;
    const { insert: r, remove: i, patchProp: s, createElement: o, createText: a, createComment: f, setText: h, setElementText: u, parentNode: p, nextSibling: S, setScopeId: E = Ae, insertStaticContent: L } = e, B = (l, c, d, b = null, _ = null, g = null, y = void 0, x = null, v = !!c.dynamicChildren) => {
      if (l === c) return;
      l && !wt(l, c) && (b = $e(l), re(l, _, g, true), l = null), c.patchFlag === -2 && (v = false, c.dynamicChildren = null);
      const { type: m, ref: R, shapeFlag: w } = c;
      switch (m) {
        case vn:
          Z(l, c, d, b);
          break;
        case ke:
          N(l, c, d, b);
          break;
        case Zt:
          l == null && $(c, d, b, y);
          break;
        case Le:
          Ze(l, c, d, b, _, g, y, x, v);
          break;
        default:
          w & 1 ? k(l, c, d, b, _, g, y, x, v) : w & 6 ? pe(l, c, d, b, _, g, y, x, v) : (w & 64 || w & 128) && m.process(l, c, d, b, _, g, y, x, v, vt);
      }
      R != null && _ ? At(R, l && l.ref, g, c || l, !c) : R == null && l && l.ref != null && At(l.ref, null, g, l, true);
    }, Z = (l, c, d, b) => {
      if (l == null) r(c.el = a(c.children), d, b);
      else {
        const _ = c.el = l.el;
        c.children !== l.children && h(_, c.children);
      }
    }, N = (l, c, d, b) => {
      l == null ? r(c.el = f(c.children || ""), d, b) : c.el = l.el;
    }, $ = (l, c, d, b) => {
      [l.el, l.anchor] = L(l.children, c, d, b, l.el, l.anchor);
    }, Y = ({ el: l, anchor: c }, d, b) => {
      let _;
      for (; l && l !== c; ) _ = S(l), r(l, d, b), l = _;
      r(c, d, b);
    }, M = ({ el: l, anchor: c }) => {
      let d;
      for (; l && l !== c; ) d = S(l), i(l), l = d;
      i(c);
    }, k = (l, c, d, b, _, g, y, x, v) => {
      c.type === "svg" ? y = "svg" : c.type === "math" && (y = "mathml"), l == null ? Se(c, d, b, _, g, y, x, v) : st(l, c, _, g, y, x, v);
    }, Se = (l, c, d, b, _, g, y, x) => {
      let v, m;
      const { props: R, shapeFlag: w, transition: P, dirs: O } = l;
      if (v = l.el = o(l.type, g, R && R.is, R), w & 8 ? u(v, l.children) : w & 16 && Te(l.children, v, null, b, _, Rn(l, g), y, x), O && Qe(l, null, b, "created"), me(v, l, l.scopeId, y, b), R) {
        for (const K in R) K !== "value" && !Pt(K) && s(v, K, null, R[K], g, b);
        "value" in R && s(v, "value", null, R.value, g), (m = R.onVnodeBeforeMount) && Re(m, b, l);
      }
      O && Qe(l, null, b, "beforeMount");
      const z = Po(_, P);
      z && P.beforeEnter(v), r(v, c, d), ((m = R && R.onVnodeMounted) || z || O) && ge(() => {
        m && Re(m, b, l), z && P.enter(v), O && Qe(l, null, b, "mounted");
      }, _);
    }, me = (l, c, d, b, _) => {
      if (d && E(l, d), b) for (let g = 0; g < b.length; g++) E(l, b[g]);
      if (_) {
        let g = _.subTree;
        if (c === g || Vi(g.type) && (g.ssContent === c || g.ssFallback === c)) {
          const y = _.vnode;
          me(l, y, y.scopeId, y.slotScopeIds, _.parent);
        }
      }
    }, Te = (l, c, d, b, _, g, y, x, v = 0) => {
      for (let m = v; m < l.length; m++) {
        const R = l[m] = x ? qe(l[m]) : Oe(l[m]);
        B(null, R, c, d, b, _, g, y, x);
      }
    }, st = (l, c, d, b, _, g, y) => {
      const x = c.el = l.el;
      let { patchFlag: v, dynamicChildren: m, dirs: R } = c;
      v |= l.patchFlag & 16;
      const w = l.props || W, P = c.props || W;
      let O;
      if (d && et(d, false), (O = P.onVnodeBeforeUpdate) && Re(O, d, c, l), R && Qe(c, l, d, "beforeUpdate"), d && et(d, true), (w.innerHTML && P.innerHTML == null || w.textContent && P.textContent == null) && u(x, ""), m ? Ie(l.dynamicChildren, m, x, d, b, Rn(c, _), g) : y || D(l, c, x, null, d, b, Rn(c, _), g, false), v > 0) {
        if (v & 16) Je(x, w, P, d, _);
        else if (v & 2 && w.class !== P.class && s(x, "class", null, P.class, _), v & 4 && s(x, "style", w.style, P.style, _), v & 8) {
          const z = c.dynamicProps;
          for (let K = 0; K < z.length; K++) {
            const H = z[K], ue = w[H], de = P[H];
            (de !== ue || H === "value") && s(x, H, ue, de, _, d);
          }
        }
        v & 1 && l.children !== c.children && u(x, c.children);
      } else !y && m == null && Je(x, w, P, d, _);
      ((O = P.onVnodeUpdated) || R) && ge(() => {
        O && Re(O, d, c, l), R && Qe(c, l, d, "updated");
      }, b);
    }, Ie = (l, c, d, b, _, g, y) => {
      for (let x = 0; x < c.length; x++) {
        const v = l[x], m = c[x], R = v.el && (v.type === Le || !wt(v, m) || v.shapeFlag & 198) ? p(v.el) : d;
        B(v, m, R, null, b, _, g, y, true);
      }
    }, Je = (l, c, d, b, _) => {
      if (c !== d) {
        if (c !== W) for (const g in c) !Pt(g) && !(g in d) && s(l, g, c[g], null, _, b);
        for (const g in d) {
          if (Pt(g)) continue;
          const y = d[g], x = c[g];
          y !== x && g !== "value" && s(l, g, x, y, _, b);
        }
        "value" in d && s(l, "value", c.value, d.value, _);
      }
    }, Ze = (l, c, d, b, _, g, y, x, v) => {
      const m = c.el = l ? l.el : a(""), R = c.anchor = l ? l.anchor : a("");
      let { patchFlag: w, dynamicChildren: P, slotScopeIds: O } = c;
      O && (x = x ? x.concat(O) : O), l == null ? (r(m, d, b), r(R, d, b), Te(c.children || [], d, R, _, g, y, x, v)) : w > 0 && w & 64 && P && l.dynamicChildren ? (Ie(l.dynamicChildren, P, d, _, g, y, x), (c.key != null || _ && c === _.subTree) && ji(l, c, true)) : D(l, c, d, R, _, g, y, x, v);
    }, pe = (l, c, d, b, _, g, y, x, v) => {
      c.slotScopeIds = x, l == null ? c.shapeFlag & 512 ? _.ctx.activate(c, d, b, y, v) : gt(c, d, b, _, g, y, v) : U(l, c, v);
    }, gt = (l, c, d, b, _, g, y) => {
      const x = l.component = Ko(l, b, _);
      if (Si(l) && (x.ctx.renderer = vt), Yo(x, false, y), x.asyncDep) {
        if (_ && _.registerDep(x, T, y), !l.el) {
          const v = x.subTree = we(ke);
          N(null, v, c, d), l.placeholder = v.el;
        }
      } else T(x, l, c, d, _, g, y);
    }, U = (l, c, d) => {
      const b = c.component = l.component;
      if (jo(l, c, d)) if (b.asyncDep && !b.asyncResolved) {
        C(b, c, d);
        return;
      } else b.next = c, b.update();
      else c.el = l.el, b.vnode = c;
    }, T = (l, c, d, b, _, g, y) => {
      const x = () => {
        if (l.isMounted) {
          let { next: w, bu: P, u: O, parent: z, vnode: K } = l;
          {
            const Ce = Bi(l);
            if (Ce) {
              w && (w.el = K.el, C(l, w, y)), Ce.asyncDep.then(() => {
                l.isUnmounted || x();
              });
              return;
            }
          }
          let H = w, ue;
          et(l, false), w ? (w.el = K.el, C(l, w, y)) : w = K, P && wn(P), (ue = w.props && w.props.onVnodeBeforeUpdate) && Re(ue, z, w, K), et(l, true);
          const de = Mr(l), Ee = l.subTree;
          l.subTree = de, B(Ee, de, p(Ee.el), $e(Ee), l, _, g), w.el = de.el, H === null && Bo(l, de.el), O && ge(O, _), (ue = w.props && w.props.onVnodeUpdated) && ge(() => Re(ue, z, w, K), _);
        } else {
          let w;
          const { el: P, props: O } = c, { bm: z, m: K, parent: H, root: ue, type: de } = l, Ee = Ft(c);
          et(l, false), z && wn(z), !Ee && (w = O && O.onVnodeBeforeMount) && Re(w, H, c), et(l, true);
          {
            ue.ce && ue.ce._def.shadowRoot !== false && ue.ce._injectChildStyle(de);
            const Ce = l.subTree = Mr(l);
            B(null, Ce, d, b, l, _, g), c.el = Ce.el;
          }
          if (K && ge(K, _), !Ee && (w = O && O.onVnodeMounted)) {
            const Ce = c;
            ge(() => Re(w, H, Ce), _);
          }
          (c.shapeFlag & 256 || H && Ft(H.vnode) && H.vnode.shapeFlag & 256) && l.a && ge(l.a, _), l.isMounted = true, c = d = b = null;
        }
      };
      l.scope.on();
      const v = l.effect = new ei(x);
      l.scope.off();
      const m = l.update = v.run.bind(v), R = l.job = v.runIfDirty.bind(v);
      R.i = l, R.id = l.uid, v.scheduler = () => ar(R), et(l, true), m();
    }, C = (l, c, d) => {
      c.component = l;
      const b = l.vnode.props;
      l.vnode = c, l.next = null, xo(l, c.props, b, d), To(l, c.children, d), Ve(), wr(l), Ge();
    }, D = (l, c, d, b, _, g, y, x, v = false) => {
      const m = l && l.children, R = l ? l.shapeFlag : 0, w = c.children, { patchFlag: P, shapeFlag: O } = c;
      if (P > 0) {
        if (P & 128) {
          te(m, w, d, b, _, g, y, x, v);
          return;
        } else if (P & 256) {
          X(m, w, d, b, _, g, y, x, v);
          return;
        }
      }
      O & 8 ? (R & 16 && De(m, _, g), w !== m && u(d, w)) : R & 16 ? O & 16 ? te(m, w, d, b, _, g, y, x, v) : De(m, _, g, true) : (R & 8 && u(d, ""), O & 16 && Te(w, d, b, _, g, y, x, v));
    }, X = (l, c, d, b, _, g, y, x, v) => {
      l = l || ct, c = c || ct;
      const m = l.length, R = c.length, w = Math.min(m, R);
      let P;
      for (P = 0; P < w; P++) {
        const O = c[P] = v ? qe(c[P]) : Oe(c[P]);
        B(l[P], O, d, null, _, g, y, x, v);
      }
      m > R ? De(l, _, g, true, false, w) : Te(c, d, b, _, g, y, x, v, w);
    }, te = (l, c, d, b, _, g, y, x, v) => {
      let m = 0;
      const R = c.length;
      let w = l.length - 1, P = R - 1;
      for (; m <= w && m <= P; ) {
        const O = l[m], z = c[m] = v ? qe(c[m]) : Oe(c[m]);
        if (wt(O, z)) B(O, z, d, null, _, g, y, x, v);
        else break;
        m++;
      }
      for (; m <= w && m <= P; ) {
        const O = l[w], z = c[P] = v ? qe(c[P]) : Oe(c[P]);
        if (wt(O, z)) B(O, z, d, null, _, g, y, x, v);
        else break;
        w--, P--;
      }
      if (m > w) {
        if (m <= P) {
          const O = P + 1, z = O < R ? c[O].el : b;
          for (; m <= P; ) B(null, c[m] = v ? qe(c[m]) : Oe(c[m]), d, z, _, g, y, x, v), m++;
        }
      } else if (m > P) for (; m <= w; ) re(l[m], _, g, true), m++;
      else {
        const O = m, z = m, K = /* @__PURE__ */ new Map();
        for (m = z; m <= P; m++) {
          const _e = c[m] = v ? qe(c[m]) : Oe(c[m]);
          _e.key != null && K.set(_e.key, m);
        }
        let H, ue = 0;
        const de = P - z + 1;
        let Ee = false, Ce = 0;
        const xt = new Array(de);
        for (m = 0; m < de; m++) xt[m] = 0;
        for (m = O; m <= w; m++) {
          const _e = l[m];
          if (ue >= de) {
            re(_e, _, g, true);
            continue;
          }
          let Pe;
          if (_e.key != null) Pe = K.get(_e.key);
          else for (H = z; H <= P; H++) if (xt[H - z] === 0 && wt(_e, c[H])) {
            Pe = H;
            break;
          }
          Pe === void 0 ? re(_e, _, g, true) : (xt[Pe - z] = m + 1, Pe >= Ce ? Ce = Pe : Ee = true, B(_e, c[Pe], d, null, _, g, y, x, v), ue++);
        }
        const gr = Ee ? Ro(xt) : ct;
        for (H = gr.length - 1, m = de - 1; m >= 0; m--) {
          const _e = z + m, Pe = c[_e], br = c[_e + 1], mr = _e + 1 < R ? br.el || br.placeholder : b;
          xt[m] === 0 ? B(null, Pe, d, mr, _, g, y, x, v) : Ee && (H < 0 || m !== gr[H] ? Q(Pe, d, mr, 2) : H--);
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
        y.move(l, c, d, vt);
        return;
      }
      if (y === Le) {
        r(g, c, d);
        for (let w = 0; w < v.length; w++) Q(v[w], c, d, b);
        r(l.anchor, c, d);
        return;
      }
      if (y === Zt) {
        Y(l, c, d);
        return;
      }
      if (b !== 2 && m & 1 && x) if (b === 0) x.beforeEnter(g), r(g, c, d), ge(() => x.enter(g), _);
      else {
        const { leave: w, delayLeave: P, afterLeave: O } = x, z = () => {
          l.ctx.isUnmounted ? i(g) : r(g, c, d);
        }, K = () => {
          w(g, () => {
            z(), O && O();
          });
        };
        P ? P(g, z, K) : K();
      }
      else r(g, c, d);
    }, re = (l, c, d, b = false, _ = false) => {
      const { type: g, props: y, ref: x, children: v, dynamicChildren: m, shapeFlag: R, patchFlag: w, dirs: P, cacheIndex: O } = l;
      if (w === -2 && (_ = false), x != null && (Ve(), At(x, null, d, l, true), Ge()), O != null && (c.renderCache[O] = void 0), R & 256) {
        c.ctx.deactivate(l);
        return;
      }
      const z = R & 1 && P, K = !Ft(l);
      let H;
      if (K && (H = y && y.onVnodeBeforeUnmount) && Re(H, c, l), R & 6) bt(l.component, d, b);
      else {
        if (R & 128) {
          l.suspense.unmount(d, b);
          return;
        }
        z && Qe(l, null, c, "beforeUnmount"), R & 64 ? l.type.remove(l, c, d, vt, b) : m && !m.hasOnce && (g !== Le || w > 0 && w & 64) ? De(m, c, d, false, true) : (g === Le && w & 384 || !_ && R & 16) && De(v, c, d), b && We(l);
      }
      (K && (H = y && y.onVnodeUnmounted) || z) && ge(() => {
        H && Re(H, c, l), z && Qe(l, null, c, "unmounted");
      }, d);
    }, We = (l) => {
      const { type: c, el: d, anchor: b, transition: _ } = l;
      if (c === Le) {
        Ue(d, b);
        return;
      }
      if (c === Zt) {
        M(l);
        return;
      }
      const g = () => {
        i(d), _ && !_.persisted && _.afterLeave && _.afterLeave();
      };
      if (l.shapeFlag & 1 && _ && !_.persisted) {
        const { leave: y, delayLeave: x } = _, v = () => y(d, g);
        x ? x(l.el, g, v) : v();
      } else g();
    }, Ue = (l, c) => {
      let d;
      for (; l !== c; ) d = S(l), i(l), l = d;
      i(c);
    }, bt = (l, c, d) => {
      const { bum: b, scope: _, job: g, subTree: y, um: x, m: v, a: m, parent: R, slots: { __: w } } = l;
      Rr(v), Rr(m), b && wn(b), R && I(w) && w.forEach((P) => {
        R.renderCache[P] = void 0;
      }), _.stop(), g && (g.flags |= 8, re(y, l, c, d)), x && ge(x, c), ge(() => {
        l.isUnmounted = true;
      }, c), c && c.pendingBranch && !c.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === c.pendingId && (c.deps--, c.deps === 0 && c.resolve());
    }, De = (l, c, d, b = false, _ = false, g = 0) => {
      for (let y = g; y < l.length; y++) re(l[y], c, d, b, _);
    }, $e = (l) => {
      if (l.shapeFlag & 6) return $e(l.component.subTree);
      if (l.shapeFlag & 128) return l.suspense.next();
      const c = S(l.anchor || l.el), d = c && c[Xs];
      return d ? S(d) : c;
    };
    let mt = false;
    const Wt = (l, c, d) => {
      l == null ? c._vnode && re(c._vnode, null, null, true) : B(c._vnode || null, l, c, null, null, null, d), c._vnode = l, mt || (mt = true, wr(), mi(), mt = false);
    }, vt = {
      p: B,
      um: re,
      m: Q,
      r: We,
      mt: gt,
      mc: Te,
      pc: D,
      pbc: Ie,
      n: $e,
      o: e
    };
    return {
      render: Wt,
      hydrate: void 0,
      createApp: bo(Wt)
    };
  }
  function Rn({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function et({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function Po(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function ji(e, t, n = false) {
    const r = e.children, i = t.children;
    if (I(r) && I(i)) for (let s = 0; s < r.length; s++) {
      const o = r[s];
      let a = i[s];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[s] = qe(i[s]), a.el = o.el), !n && a.patchFlag !== -2 && ji(o, a)), a.type === vn && (a.el = o.el), a.type === ke && !a.el && (a.el = o.el);
    }
  }
  function Ro(e) {
    const t = e.slice(), n = [
      0
    ];
    let r, i, s, o, a;
    const f = e.length;
    for (r = 0; r < f; r++) {
      const h = e[r];
      if (h !== 0) {
        if (i = n[n.length - 1], e[i] < h) {
          t[r] = i, n.push(r);
          continue;
        }
        for (s = 0, o = n.length - 1; s < o; ) a = s + o >> 1, e[n[a]] < h ? s = a + 1 : o = a;
        h < e[n[s]] && (s > 0 && (t[r] = n[s - 1]), n[s] = r);
      }
    }
    for (s = n.length, o = n[s - 1]; s-- > 0; ) n[s] = o, o = t[o];
    return n;
  }
  function Bi(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : Bi(t);
  }
  function Rr(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  const Mo = Symbol.for("v-scx"), Oo = () => Jt(Mo);
  function Mn(e, t, n) {
    return Li(e, t, n);
  }
  function Li(e, t, n = W) {
    const { immediate: r, deep: i, flush: s, once: o } = n, a = oe({}, n), f = t && r || !t && s !== "post";
    let h;
    if (Vt) {
      if (s === "sync") {
        const E = Oo();
        h = E.__watcherHandles || (E.__watcherHandles = []);
      } else if (!f) {
        const E = () => {
        };
        return E.stop = Ae, E.resume = Ae, E.pause = Ae, E;
      }
    }
    const u = fe;
    a.call = (E, L, B) => Fe(E, u, L, B);
    let p = false;
    s === "post" ? a.scheduler = (E) => {
      ge(E, u && u.suspense);
    } : s !== "sync" && (p = true, a.scheduler = (E, L) => {
      L ? E() : ar(E);
    }), a.augmentJob = (E) => {
      t && (E.flags |= 4), p && (E.flags |= 2, u && (E.id = u.uid, E.i = u));
    };
    const S = Ws(e, t, a);
    return Vt && (h ? h.push(S) : f && S()), S;
  }
  function Ao(e, t, n) {
    const r = this.proxy, i = ee(e) ? e.includes(".") ? zi(r, e) : () => r[e] : e.bind(r, r);
    let s;
    F(t) ? s = t : (s = t.handler, n = t);
    const o = Ht(this), a = Li(i, s.bind(r), n);
    return o(), a;
  }
  function zi(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let i = 0; i < n.length && r; i++) r = r[n[i]];
      return r;
    };
  }
  const Fo = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Xe(t)}Modifiers`] || e[`${it(t)}Modifiers`];
  function Io(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || W;
    let i = n;
    const s = t.startsWith("update:"), o = s && Fo(r, t.slice(7));
    o && (o.trim && (i = n.map((u) => ee(u) ? u.trim() : u)), o.number && (i = n.map(as)));
    let a, f = r[a = yn(t)] || r[a = yn(Xe(t))];
    !f && s && (f = r[a = yn(it(t))]), f && Fe(f, e, 6, i);
    const h = r[a + "Once"];
    if (h) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[a]) return;
      e.emitted[a] = true, Fe(h, e, 6, i);
    }
  }
  function Ni(e, t, n = false) {
    const r = t.emitsCache, i = r.get(e);
    if (i !== void 0) return i;
    const s = e.emits;
    let o = {}, a = false;
    if (!F(e)) {
      const f = (h) => {
        const u = Ni(h, t, true);
        u && (a = true, oe(o, u));
      };
      !n && t.mixins.length && t.mixins.forEach(f), e.extends && f(e.extends), e.mixins && e.mixins.forEach(f);
    }
    return !s && !a ? (J(e) && r.set(e, null), null) : (I(s) ? s.forEach((f) => o[f] = null) : oe(o, s), J(e) && r.set(e, o), o);
  }
  function mn(e, t) {
    return !e || !dn(t) ? false : (t = t.slice(2).replace(/Once$/, ""), G(e, t[0].toLowerCase() + t.slice(1)) || G(e, it(t)) || G(e, t));
  }
  function Mr(e) {
    const { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [s], slots: o, attrs: a, emit: f, render: h, renderCache: u, props: p, data: S, setupState: E, ctx: L, inheritAttrs: B } = e, Z = an(e);
    let N, $;
    try {
      if (n.shapeFlag & 4) {
        const M = i || r, k = M;
        N = Oe(h.call(k, M, u, p, E, S, L)), $ = a;
      } else {
        const M = t;
        N = Oe(M.length > 1 ? M(p, {
          attrs: a,
          slots: o,
          emit: f
        }) : M(p, null)), $ = t.props ? a : Uo(a);
      }
    } catch (M) {
      Ut.length = 0, gn(M, e, 1), N = we(ke);
    }
    let Y = N;
    if ($ && B !== false) {
      const M = Object.keys($), { shapeFlag: k } = Y;
      M.length && k & 7 && (s && M.some(Xn) && ($ = Do($, s)), Y = pt(Y, $, false, true));
    }
    return n.dirs && (Y = pt(Y, null, false, true), Y.dirs = Y.dirs ? Y.dirs.concat(n.dirs) : n.dirs), n.transition && cr(Y, n.transition), N = Y, an(Z), N;
  }
  const Uo = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || dn(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Do = (e, t) => {
    const n = {};
    for (const r in e) (!Xn(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function jo(e, t, n) {
    const { props: r, children: i, component: s } = e, { props: o, children: a, patchFlag: f } = t, h = s.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && f >= 0) {
      if (f & 1024) return true;
      if (f & 16) return r ? Or(r, o, h) : !!o;
      if (f & 8) {
        const u = t.dynamicProps;
        for (let p = 0; p < u.length; p++) {
          const S = u[p];
          if (o[S] !== r[S] && !mn(h, S)) return true;
        }
      }
    } else return (i || a) && (!a || !a.$stable) ? true : r === o ? false : r ? o ? Or(r, o, h) : true : !!o;
    return false;
  }
  function Or(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let i = 0; i < r.length; i++) {
      const s = r[i];
      if (t[s] !== e[s] && !mn(n, s)) return true;
    }
    return false;
  }
  function Bo({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Vi = (e) => e.__isSuspense;
  function Lo(e, t) {
    t && t.pendingBranch ? I(e) ? t.effects.push(...e) : t.effects.push(e) : qs(e);
  }
  const Le = Symbol.for("v-fgt"), vn = Symbol.for("v-txt"), ke = Symbol.for("v-cmt"), Zt = Symbol.for("v-stc"), Ut = [];
  let be = null;
  function ht(e = false) {
    Ut.push(be = e ? null : []);
  }
  function zo() {
    Ut.pop(), be = Ut[Ut.length - 1] || null;
  }
  let Nt = 1;
  function Ar(e, t = false) {
    Nt += e, e < 0 && be && t && (be.hasOnce = true);
  }
  function Gi(e) {
    return e.dynamicChildren = Nt > 0 ? be || ct : null, zo(), Nt > 0 && be && be.push(e), e;
  }
  function Dt(e, t, n, r, i, s) {
    return Gi(ne(e, t, n, r, i, s, true));
  }
  function No(e, t, n, r, i) {
    return Gi(we(e, t, n, r, i, true));
  }
  function Hi(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function wt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const Wi = ({ key: e }) => e ?? null, Qt = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? ee(e) || se(e) || F(e) ? {
    i: ve,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function ne(e, t = null, n = null, r = 0, i = null, s = e === Le ? 0 : 1, o = false, a = false) {
    const f = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && Wi(t),
      ref: t && Qt(t),
      scopeId: xi,
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
      ctx: ve
    };
    return a ? (pr(f, n), s & 128 && e.normalize(f)) : n && (f.shapeFlag |= ee(n) ? 8 : 16), Nt > 0 && !o && be && (f.patchFlag > 0 || s & 6) && f.patchFlag !== 32 && be.push(f), f;
  }
  const we = Vo;
  function Vo(e, t = null, n = null, r = 0, i = null, s = false) {
    if ((!e || e === ao) && (e = ke), Hi(e)) {
      const a = pt(e, t, true);
      return n && pr(a, n), Nt > 0 && !s && be && (a.shapeFlag & 6 ? be[be.indexOf(e)] = a : be.push(a)), a.patchFlag = -2, a;
    }
    if (Zo(e) && (e = e.__vccOpts), t) {
      t = Go(t);
      let { class: a, style: f } = t;
      a && !ee(a) && (t.class = ft(a)), J(f) && (lr(f) && !I(f) && (f = oe({}, f)), t.style = Zn(f));
    }
    const o = ee(e) ? 1 : Vi(e) ? 128 : ks(e) ? 64 : J(e) ? 4 : F(e) ? 2 : 0;
    return ne(e, t, n, r, i, o, s, true);
  }
  function Go(e) {
    return e ? lr(e) || Oi(e) ? oe({}, e) : e : null;
  }
  function pt(e, t, n = false, r = false) {
    const { props: i, ref: s, patchFlag: o, children: a, transition: f } = e, h = t ? Ho(i || {}, t) : i, u = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: h,
      key: h && Wi(h),
      ref: t && t.ref ? n && s ? I(s) ? s.concat(Qt(t)) : [
        s,
        Qt(t)
      ] : Qt(t) : s,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: a,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== Le ? o === -1 ? 16 : o | 16 : o,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: f,
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
    return f && r && cr(u, f.clone(u)), u;
  }
  function en(e = " ", t = 0) {
    return we(vn, null, e, t);
  }
  function $i(e, t) {
    const n = we(Zt, null, e);
    return n.staticCount = t, n;
  }
  function Fr(e = "", t = false) {
    return t ? (ht(), No(ke, null, e)) : we(ke, null, e);
  }
  function Oe(e) {
    return e == null || typeof e == "boolean" ? we(ke) : I(e) ? we(Le, null, e.slice()) : Hi(e) ? qe(e) : we(vn, null, String(e));
  }
  function qe(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : pt(e);
  }
  function pr(e, t) {
    let n = 0;
    const { shapeFlag: r } = e;
    if (t == null) t = null;
    else if (I(t)) n = 16;
    else if (typeof t == "object") if (r & 65) {
      const i = t.default;
      i && (i._c && (i._d = false), pr(e, i()), i._c && (i._d = true));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !Oi(t) ? t._ctx = ve : i === 3 && ve && (ve.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else F(t) ? (t = {
      default: t,
      _ctx: ve
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      en(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function Ho(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const i in r) if (i === "class") t.class !== r.class && (t.class = ft([
        t.class,
        r.class
      ]));
      else if (i === "style") t.style = Zn([
        t.style,
        r.style
      ]);
      else if (dn(i)) {
        const s = t[i], o = r[i];
        o && s !== o && !(I(s) && s.includes(o)) && (t[i] = s ? [].concat(s, o) : o);
      } else i !== "" && (t[i] = r[i]);
    }
    return t;
  }
  function Re(e, t, n, r = null) {
    Fe(e, t, 7, [
      n,
      r
    ]);
  }
  const Wo = Pi();
  let $o = 0;
  function Ko(e, t, n) {
    const r = e.type, i = (t ? t.appContext : e.appContext) || Wo, s = {
      uid: $o++,
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
      scope: new _s(true),
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
      propsOptions: Fi(r, i),
      emitsOptions: Ni(r, i),
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
    return s.ctx = {
      _: s
    }, s.root = t ? t.root : s, s.emit = Io.bind(null, s), e.ce && e.ce(s), s;
  }
  let fe = null;
  const qo = () => fe || ve;
  let fn, Kn;
  {
    const e = _n(), t = (n, r) => {
      let i;
      return (i = e[n]) || (i = e[n] = []), i.push(r), (s) => {
        i.length > 1 ? i.forEach((o) => o(s)) : i[0](s);
      };
    };
    fn = t("__VUE_INSTANCE_SETTERS__", (n) => fe = n), Kn = t("__VUE_SSR_SETTERS__", (n) => Vt = n);
  }
  const Ht = (e) => {
    const t = fe;
    return fn(e), e.scope.on(), () => {
      e.scope.off(), fn(t);
    };
  }, Ir = () => {
    fe && fe.scope.off(), fn(null);
  };
  function Ki(e) {
    return e.vnode.shapeFlag & 4;
  }
  let Vt = false;
  function Yo(e, t = false, n = false) {
    t && Kn(t);
    const { props: r, children: i } = e.vnode, s = Ki(e);
    vo(e, r, s, t), So(e, i, n || t);
    const o = s ? Xo(e, t) : void 0;
    return t && Kn(false), o;
  }
  function Xo(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, co);
    const { setup: r } = n;
    if (r) {
      Ve();
      const i = e.setupContext = r.length > 1 ? Jo(e) : null, s = Ht(e), o = Gt(r, e, 0, [
        e.props,
        i
      ]), a = Jr(o);
      if (Ge(), s(), (a || e.sp) && !Ft(e) && wi(e), a) {
        if (o.then(Ir, Ir), t) return o.then((f) => {
          Ur(e, f);
        }).catch((f) => {
          gn(f, e, 0);
        });
        e.asyncDep = o;
      } else Ur(e, o);
    } else qi(e);
  }
  function Ur(e, t, n) {
    F(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : J(t) && (e.setupState = _i(t)), qi(e);
  }
  function qi(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || Ae);
    {
      const i = Ht(e);
      Ve();
      try {
        fo(e);
      } finally {
        Ge(), i();
      }
    }
  }
  const ko = {
    get(e, t) {
      return ie(e, "get", ""), e[t];
    }
  };
  function Jo(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, ko),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function xn(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(_i(js(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in It) return It[n](e);
      },
      has(t, n) {
        return n in t || n in It;
      }
    })) : e.proxy;
  }
  function Zo(e) {
    return F(e) && "__vccOpts" in e;
  }
  const Qo = (e, t) => Gs(e, t, Vt), el = "3.5.18";
  let qn;
  const Dr = typeof window < "u" && window.trustedTypes;
  if (Dr) try {
    qn = Dr.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const Yi = qn ? (e) => qn.createHTML(e) : (e) => e, tl = "http://www.w3.org/2000/svg", nl = "http://www.w3.org/1998/Math/MathML", Be = typeof document < "u" ? document : null, jr = Be && Be.createElement("template"), rl = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const i = t === "svg" ? Be.createElementNS(tl, e) : t === "mathml" ? Be.createElementNS(nl, e) : n ? Be.createElement(e, {
        is: n
      }) : Be.createElement(e);
      return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
    },
    createText: (e) => Be.createTextNode(e),
    createComment: (e) => Be.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => Be.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, r, i, s) {
      const o = n ? n.previousSibling : t.lastChild;
      if (i && (i === s || i.nextSibling)) for (; t.insertBefore(i.cloneNode(true), n), !(i === s || !(i = i.nextSibling)); ) ;
      else {
        jr.innerHTML = Yi(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const a = jr.content;
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
  }, il = Symbol("_vtc");
  function sl(e, t, n) {
    const r = e[il];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const un = Symbol("_vod"), Xi = Symbol("_vsh"), On = {
    beforeMount(e, { value: t }, { transition: n }) {
      e[un] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : St(e, t);
    },
    mounted(e, { value: t }, { transition: n }) {
      n && t && n.enter(e);
    },
    updated(e, { value: t, oldValue: n }, { transition: r }) {
      !t != !n && (r ? t ? (r.beforeEnter(e), St(e, true), r.enter(e)) : r.leave(e, () => {
        St(e, false);
      }) : St(e, t));
    },
    beforeUnmount(e, { value: t }) {
      St(e, t);
    }
  };
  function St(e, t) {
    e.style.display = t ? e[un] : "none", e[Xi] = !t;
  }
  const ol = Symbol(""), ll = /(^|;)\s*display\s*:/;
  function al(e, t, n) {
    const r = e.style, i = ee(n);
    let s = false;
    if (n && !i) {
      if (t) if (ee(t)) for (const o of t.split(";")) {
        const a = o.slice(0, o.indexOf(":")).trim();
        n[a] == null && tn(r, a, "");
      }
      else for (const o in t) n[o] == null && tn(r, o, "");
      for (const o in n) o === "display" && (s = true), tn(r, o, n[o]);
    } else if (i) {
      if (t !== n) {
        const o = r[ol];
        o && (n += ";" + o), r.cssText = n, s = ll.test(n);
      }
    } else t && e.removeAttribute("style");
    un in e && (e[un] = s ? r.display : "", e[Xi] && (r.display = "none"));
  }
  const Br = /\s*!important$/;
  function tn(e, t, n) {
    if (I(n)) n.forEach((r) => tn(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = cl(e, t);
      Br.test(n) ? e.setProperty(it(r), n.replace(Br, ""), "important") : e[r] = n;
    }
  }
  const Lr = [
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
    for (let i = 0; i < Lr.length; i++) {
      const s = Lr[i] + r;
      if (s in e) return An[t] = s;
    }
    return t;
  }
  const zr = "http://www.w3.org/1999/xlink";
  function Nr(e, t, n, r, i, s = ps(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(zr, t.slice(6, t.length)) : e.setAttributeNS(zr, t, n) : n == null || s && !Qr(n) ? e.removeAttribute(t) : e.setAttribute(t, s ? "" : _t(n) ? String(n) : n);
  }
  function Vr(e, t, n, r, i) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? Yi(n) : n);
      return;
    }
    const s = e.tagName;
    if (t === "value" && s !== "PROGRESS" && !s.includes("-")) {
      const a = s === "OPTION" ? e.getAttribute("value") || "" : e.value, f = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
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
    o && e.removeAttribute(i || t);
  }
  function fl(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function ul(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const Gr = Symbol("_vei");
  function dl(e, t, n, r, i = null) {
    const s = e[Gr] || (e[Gr] = {}), o = s[t];
    if (r && o) o.value = r;
    else {
      const [a, f] = hl(t);
      if (r) {
        const h = s[t] = gl(r, i);
        fl(e, a, h, f);
      } else o && (ul(e, a, o, f), s[t] = void 0);
    }
  }
  const Hr = /(?:Once|Passive|Capture)$/;
  function hl(e) {
    let t;
    if (Hr.test(e)) {
      t = {};
      let r;
      for (; r = e.match(Hr); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : it(e.slice(2)),
      t
    ];
  }
  let Fn = 0;
  const pl = Promise.resolve(), _l = () => Fn || (pl.then(() => Fn = 0), Fn = Date.now());
  function gl(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Fe(bl(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = _l(), n;
  }
  function bl(e, t) {
    if (I(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (i) => !i._stopped && r && r(i));
    } else return t;
  }
  const Wr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, ml = (e, t, n, r, i, s) => {
    const o = i === "svg";
    t === "class" ? sl(e, r, o) : t === "style" ? al(e, n, r) : dn(t) ? Xn(t) || dl(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : vl(e, t, r, o)) ? (Vr(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Nr(e, t, r, o, s, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !ee(r)) ? Vr(e, Xe(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), Nr(e, t, r, o));
  };
  function vl(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Wr(t) && F(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const i = e.tagName;
      if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE") return false;
    }
    return Wr(t) && ee(n) ? false : t in e;
  }
  const xl = oe({
    patchProp: ml
  }, rl);
  let $r;
  function yl() {
    return $r || ($r = Eo(xl));
  }
  const wl = (...e) => {
    const t = yl().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const i = Tl(r);
      if (!i) return;
      const s = t._component;
      !F(s) && !s.render && !s.template && (s.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
      const o = n(i, false, Sl(i));
      return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), o;
    }, t;
  };
  function Sl(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function Tl(e) {
    return ee(e) ? document.querySelector(e) : e;
  }
  const El = `struct MandelbrotStep {
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
@group(0) @binding(2) var prevReprojectTex: texture_2d<f32>;
@group(0) @binding(3) var prevSampler: sampler;

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
}
fn rotate(x: f32, y: f32, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * x - s * y, s * x + c * y);
}
@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let prev = textureSample(prevReprojectTex, prevSampler, vec2<f32>(fragCoord.x, fragCoord.y)); // inversion axe X pour corriger l'orientation
  if (prev.x != -1.0) {
    return prev;
    //return vec4<f32>(100.0, 1000.0, 0.0, 1.0);
  }
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
`, Cl = `struct Uniforms {
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
}`, Pl = `// filepath: /Users/guillaumecollombet/RustroverProjects/untitled/src/assets/reproject.wgsl
// Shader de reprojection : reprojette l'ancienne image dans la nouvelle vue (translation / rotation / zoom).
// Si un pixel ne correspond \xE0 aucune coordonn\xE9e valide de l'ancienne image, on \xE9crit la sentinelle (-1, -1, -1, 1).

struct ReprojectUniforms {
  prev_cx: f32,
  prev_cy: f32,
  prev_scale: f32,
  prev_angle: f32,
  curr_cx: f32,
  curr_cy: f32,
  curr_scale: f32,
  curr_angle: f32,
  aspect: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

@group(0) @binding(0) var<uniform> uni: ReprojectUniforms;
@group(0) @binding(1) var prevTex: texture_2d<f32>;
@group(0) @binding(2) var prevSampler: sampler;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) fragCoord: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var o: VSOut;
  o.position = vec4<f32>(pos[vid], 0.0, 1.0);
  o.fragCoord = (pos[vid] + vec2<f32>(1.0)) * 0.5; // [0,1]
  return o;
}

fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(
    c * v.x - s * v.y,
    s * v.x + c * v.y
  );
}

fn uv_to_xy(uv: vec2<f32>) -> vec2<f32> {
  // Conversion UV [0,1] -> NDC [-1,1] avec inversion de l'axe Y (wgpu/D3D/Metal)
  return vec2<f32>(
    uv.x * 2.0 - 1.0,
    (1.0 - uv.y) * 2.0 - 1.0,
  );
}

fn xy_to_uv(xy: vec2<f32>) -> vec2<f32> {
  // Conversion NDC [-1,1] -> UV [0,1] avec inversion de l'axe Y (wgpu/D3D/Metal)
  return vec2<f32>(
    (xy.x + 1.0) * 0.5,
    1.0 - ((xy.y + 1.0) * 0.5),
  );
}

@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let sentinelle = vec4<f32>(-1.0, -1.0, -1.0, 1.0);
  if (uni.curr_scale != uni.prev_scale) {
    return sentinelle;
  }
  // fragCoord in [0,1]
  // 1. Convertir en coordonn\xE9es normalis\xE9es [-1,1]
  let xy = uv_to_xy(fragCoord);
  // 2. Espace local courant
  let local = vec2<f32>(xy.x * uni.aspect * uni.curr_scale, xy.y * uni.curr_scale);
  // 3. D\xE9faire la rotation courante
  let local_rot = rotate(local, uni.curr_angle);
  // 4. Aller dans l\u2019espace monde
  let world = local_rot + vec2<f32>(uni.curr_cx, uni.curr_cy);
  // 5. Revenir dans l\u2019espace local de l\u2019ancienne vue
  let local_prev = world - vec2<f32>(uni.prev_cx, uni.prev_cy);
  // 6. Appliquer la rotation inverse de l\u2019ancienne vue
  let local_prev_rot = rotate(local_prev, -uni.prev_angle);
  // 7. Retour coordonn\xE9es \xE9cran ancienne vue
  let nx_prev = local_prev_rot.x / (uni.aspect * uni.prev_scale);
  let ny_prev = local_prev_rot.y / (uni.prev_scale);
  let frag_prev = xy_to_uv(vec2<f32>(nx_prev, ny_prev));

  var col = textureSample(prevTex, prevSampler, frag_prev);
  let in_bounds = all(frag_prev >= vec2<f32>(0.0)) && all(frag_prev <= vec2<f32>(1.0));
  return select(sentinelle, col, in_bounds);
}
`, Rl = "" + new URL("mandelbrot_bg-DUS3tTDB.wasm", import.meta.url).href, Ml = async (e = {}, t) => {
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
  let A;
  function Ol(e) {
    A = e;
  }
  let Yt = null;
  function nn() {
    return (Yt === null || Yt.byteLength === 0) && (Yt = new Uint8Array(A.memory.buffer)), Yt;
  }
  const ki = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
  let rn = new ki("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  rn.decode();
  const Al = 2146435072;
  let In = 0;
  function Fl(e, t) {
    return In += t, In >= Al && (rn = new ki("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), rn.decode(), In = t), rn.decode(nn().subarray(e, e + t));
  }
  function Ji(e, t) {
    return e = e >>> 0, Fl(e, t);
  }
  let Xt = null;
  function Il() {
    return (Xt === null || Xt.byteLength === 0) && (Xt = new Float64Array(A.memory.buffer)), Xt;
  }
  function Ul(e, t) {
    return e = e >>> 0, Il().subarray(e / 8, e / 8 + t);
  }
  let lt = null;
  function Dl() {
    return (lt === null || lt.buffer.detached === true || lt.buffer.detached === void 0 && lt.buffer !== A.memory.buffer) && (lt = new DataView(A.memory.buffer)), lt;
  }
  function jl(e, t) {
    e = e >>> 0;
    const n = Dl(), r = [];
    for (let i = e; i < e + 4 * t; i += 4) r.push(A.__wbindgen_export_0.get(n.getUint32(i, true)));
    return A.__externref_drop_slice(e, t), r;
  }
  let jt = 0;
  const Bl = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder, sn = new Bl("utf-8"), Ll = typeof sn.encodeInto == "function" ? function(e, t) {
    return sn.encodeInto(e, t);
  } : function(e, t) {
    const n = sn.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  };
  function Un(e, t, n) {
    if (n === void 0) {
      const a = sn.encode(e), f = t(a.length, 1) >>> 0;
      return nn().subarray(f, f + a.length).set(a), jt = a.length, f;
    }
    let r = e.length, i = t(r, 1) >>> 0;
    const s = nn();
    let o = 0;
    for (; o < r; o++) {
      const a = e.charCodeAt(o);
      if (a > 127) break;
      s[i + o] = a;
    }
    if (o !== r) {
      o !== 0 && (e = e.slice(o)), i = n(i, r, r = o + e.length * 3, 1) >>> 0;
      const a = nn().subarray(i + o, i + r), f = Ll(e, a);
      o += f.written, i = n(i, r, o, 1) >>> 0;
    }
    return jt = o, i;
  }
  const Kr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => A.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  class zl {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Kr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      A.__wbg_mandelbrotnavigator_free(t, 0);
    }
    constructor(t, n, r, i, s) {
      const o = A.mandelbrotnavigator_new(t, n, r, i, s);
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
      var n = Ul(t[0], t[1]).slice();
      return A.__wbindgen_free(t[0], t[1] * 8, 8), n;
    }
    get_params() {
      const t = A.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = jl(t[0], t[1]).slice();
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
      const n = Un(t, A.__wbindgen_malloc, A.__wbindgen_realloc), r = jt;
      A.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
    }
    angle(t) {
      A.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    origin(t, n) {
      const r = Un(t, A.__wbindgen_malloc, A.__wbindgen_realloc), i = jt, s = Un(n, A.__wbindgen_malloc, A.__wbindgen_realloc), o = jt;
      A.mandelbrotnavigator_origin(this.__wbg_ptr, r, i, s, o);
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
  function Gl(e) {
    console.info(e);
  }
  function Hl(e) {
    console.log(e);
  }
  function Wl() {
    return Date.now();
  }
  function $l(e) {
    console.warn(e);
  }
  function Kl() {
    const e = A.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  function ql(e, t) {
    return Ji(e, t);
  }
  function Yl(e, t) {
    throw new Error(Ji(e, t));
  }
  URL = globalThis.URL;
  const j = await Ml({
    "./mandelbrot_bg.js": {
      __wbindgen_string_new: ql,
      __wbg_debug_58d16ea352cfbca1: Nl,
      __wbg_error_51ecdd39ec054205: Vl,
      __wbg_info_e56933705c348038: Gl,
      __wbg_log_ea240990d83e374e: Hl,
      __wbg_warn_d89f6637da554c8d: $l,
      __wbg_now_eb0821f3bd9f6529: Wl,
      __wbindgen_throw: Yl,
      __wbindgen_init_externref_table: Kl
    }
  }, Rl), Zi = j.memory, Xl = j.__wbg_mandelbrotstep_free, kl = j.__wbg_get_mandelbrotstep_zx, Jl = j.__wbg_set_mandelbrotstep_zx, Zl = j.__wbg_get_mandelbrotstep_zy, Ql = j.__wbg_set_mandelbrotstep_zy, ea = j.__wbg_get_mandelbrotstep_dx, ta = j.__wbg_set_mandelbrotstep_dx, na = j.__wbg_get_mandelbrotstep_dy, ra = j.__wbg_set_mandelbrotstep_dy, ia = j.__wbg_mandelbrotnavigator_free, sa = j.mandelbrotnavigator_new, oa = j.mandelbrotnavigator_translate, la = j.mandelbrotnavigator_rotate, aa = j.mandelbrotnavigator_translate_direct, ca = j.mandelbrotnavigator_rotate_direct, fa = j.mandelbrotnavigator_zoom, ua = j.mandelbrotnavigator_step, da = j.mandelbrotnavigator_get_params, ha = j.mandelbrotnavigator_compute_reference_orbit_ptr, pa = j.mandelbrotnavigator_get_reference_orbit_len, _a = j.mandelbrotnavigator_get_reference_orbit_capacity, ga = j.mandelbrotnavigator_scale, ba = j.mandelbrotnavigator_angle, ma = j.mandelbrotnavigator_origin, va = j.__wbg_orbitbufferinfo_free, xa = j.__wbg_get_orbitbufferinfo_ptr, ya = j.__wbg_set_orbitbufferinfo_ptr, wa = j.__wbg_get_orbitbufferinfo_offset, Sa = j.__wbg_set_orbitbufferinfo_offset, Ta = j.__wbg_get_orbitbufferinfo_count, Ea = j.__wbg_set_orbitbufferinfo_count, Ca = j.__wbindgen_export_0, Pa = j.__wbindgen_free, Ra = j.__externref_drop_slice, Ma = j.__wbindgen_malloc, Oa = j.__wbindgen_realloc, Qi = j.__wbindgen_start, Aa = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: Ra,
    __wbg_get_mandelbrotstep_dx: ea,
    __wbg_get_mandelbrotstep_dy: na,
    __wbg_get_mandelbrotstep_zx: kl,
    __wbg_get_mandelbrotstep_zy: Zl,
    __wbg_get_orbitbufferinfo_count: Ta,
    __wbg_get_orbitbufferinfo_offset: wa,
    __wbg_get_orbitbufferinfo_ptr: xa,
    __wbg_mandelbrotnavigator_free: ia,
    __wbg_mandelbrotstep_free: Xl,
    __wbg_orbitbufferinfo_free: va,
    __wbg_set_mandelbrotstep_dx: ta,
    __wbg_set_mandelbrotstep_dy: ra,
    __wbg_set_mandelbrotstep_zx: Jl,
    __wbg_set_mandelbrotstep_zy: Ql,
    __wbg_set_orbitbufferinfo_count: Ea,
    __wbg_set_orbitbufferinfo_offset: Sa,
    __wbg_set_orbitbufferinfo_ptr: ya,
    __wbindgen_export_0: Ca,
    __wbindgen_free: Pa,
    __wbindgen_malloc: Ma,
    __wbindgen_realloc: Oa,
    __wbindgen_start: Qi,
    mandelbrotnavigator_angle: ba,
    mandelbrotnavigator_compute_reference_orbit_ptr: ha,
    mandelbrotnavigator_get_params: da,
    mandelbrotnavigator_get_reference_orbit_capacity: _a,
    mandelbrotnavigator_get_reference_orbit_len: pa,
    mandelbrotnavigator_new: sa,
    mandelbrotnavigator_origin: ma,
    mandelbrotnavigator_rotate: la,
    mandelbrotnavigator_rotate_direct: ca,
    mandelbrotnavigator_scale: ga,
    mandelbrotnavigator_step: ua,
    mandelbrotnavigator_translate: oa,
    mandelbrotnavigator_translate_direct: aa,
    mandelbrotnavigator_zoom: fa,
    memory: Zi
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  Ol(Aa);
  Qi();
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
      __publicField(this, "historyTexture");
      __publicField(this, "historyView");
      __publicField(this, "reprojectTexture");
      __publicField(this, "reprojectView");
      __publicField(this, "uniformBufferReproject");
      __publicField(this, "pipeline1");
      __publicField(this, "pipeline2");
      __publicField(this, "bindGroup1");
      __publicField(this, "bindGroup2");
      __publicField(this, "pipelineReproject");
      __publicField(this, "bindGroupReproject");
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
      __publicField(this, "prevFrameMandelbrot");
      __publicField(this, "clearHistoryNextFrame", false);
      __publicField(this, "maxTextureSize", 8192);
      this.canvas = t, this.shaderPass1 = El, this.shaderPass2 = Cl, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
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
      const n = Math.min(16384, this.adapter.limits.maxTextureDimension2D);
      this.maxTextureSize = n, this.device = await this.adapter.requestDevice({
        requiredLimits: {
          maxTextureDimension2D: n
        }
      }), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.sampler = this.device.createSampler({
        magFilter: "nearest",
        minFilter: "nearest",
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
        code: Pl,
        label: "Engine ShaderModule Reproject"
      }), n = this.device.createShaderModule({
        code: this.shaderPass1,
        label: "Engine ShaderModule Pass1"
      }), r = this.device.createShaderModule({
        code: this.shaderPass2,
        label: "Engine ShaderModule Pass2"
      }), i = this.device.createBindGroupLayout({
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
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
              sampleType: "float"
            }
          },
          {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {
              type: "filtering"
            }
          }
        ],
        label: "Engine BindGroupLayout Reproject"
      }), s = this.device.createBindGroupLayout({
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
          },
          {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
              sampleType: "float"
            }
          },
          {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {
              type: "filtering"
            }
          }
        ],
        label: "Engine RenderPipeline Mandelbrot"
      });
      this.pipelineReproject = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            i
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
        label: "Engine RenderPipeline Reproject"
      }), this.pipeline1 = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            s
          ]
        }),
        vertex: {
          module: n,
          entryPoint: "vs_main"
        },
        fragment: {
          module: n,
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
          module: r,
          entryPoint: "vs_main"
        },
        fragment: {
          module: r,
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
      }), this.uniformBufferReproject || (this.uniformBufferReproject = this.device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Reproject"
      })), this.bindGroup1 = void 0, this.bindGroup2 = void 0, this.bindGroupReproject = void 0;
    }
    resize() {
      var _a2, _b, _c, _d, _e, _f;
      const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) ?? this.canvas.clientWidth, i = (n == null ? void 0 : n.clientHeight) ?? this.canvas.clientHeight, s = this.maxTextureSize || 8192;
      if (this.width = Math.max(1, Math.min(Math.round(r * t), s)), this.height = Math.max(1, Math.min(Math.round(i * t), s)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = i + "px", this.ctx.configure({
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
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
        label: "Engine IntermediateTexture"
      }), this.intermediateView = this.intermediateTexture.createView(), this.intermediateView.label = "Engine IntermediateTextureView", this.historyTexture && ((_d = (_c = this.historyTexture).destroy) == null ? void 0 : _d.call(_c)), this.historyTexture = this.device.createTexture({
        size: {
          width: this.width,
          height: this.height,
          depthOrArrayLayers: 1
        },
        format: "rgba16float",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
        label: "Engine HistoryTexture"
      }), this.historyView = this.historyTexture.createView(), this.reprojectTexture && ((_f = (_e = this.reprojectTexture).destroy) == null ? void 0 : _f.call(_e)), this.reprojectTexture = this.device.createTexture({
        size: {
          width: this.width,
          height: this.height,
          depthOrArrayLayers: 1
        },
        format: "rgba16float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        label: "Engine ReprojectTexture"
      }), this.reprojectView = this.reprojectTexture.createView(), this.pipelineReproject) {
        const o = this.pipelineReproject.getBindGroupLayout(0);
        this.bindGroupReproject = this.device.createBindGroup({
          layout: o,
          entries: [
            {
              binding: 0,
              resource: {
                buffer: this.uniformBufferReproject
              }
            },
            {
              binding: 1,
              resource: this.historyView
            },
            {
              binding: 2,
              resource: this.sampler
            }
          ],
          label: "Engine BindGroup Reproject"
        });
      }
      if (this.pipeline1) {
        const o = this.pipeline1.getBindGroupLayout(0);
        this.bindGroup1 = this.device.createBindGroup({
          layout: o,
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
            },
            {
              binding: 2,
              resource: this.reprojectView
            },
            {
              binding: 3,
              resource: this.sampler
            }
          ],
          label: "Engine BindGroup Pass Mandelbrot"
        });
      }
      if (this.pipeline2) {
        const o = this.pipeline2.getBindGroupLayout(0), a = [
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
          layout: o,
          entries: a,
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
      const a = Math.ceil(t.maxIterations);
      let f = this.mandelbrotNavigator.compute_reference_orbit_ptr(a);
      const h = new Float32Array(Zi.buffer, f.ptr, f.count * 4);
      f.offset < a && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, h, 0), this.prevFrameMandelbrot || (this.prevFrameMandelbrot = {
        ...t
      }), this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== t.scale && (this.clearHistoryNextFrame = true), this.previousMandelbrot = t;
    }
    _writeReprojectUniforms() {
      if (!this.prevFrameMandelbrot || !this.previousMandelbrot) return;
      const t = this.width / Math.max(1, this.height), n = this.prevFrameMandelbrot, r = this.previousMandelbrot, i = new Float32Array([
        n.cx,
        n.cy,
        n.scale,
        n.angle,
        r.cx,
        r.cy,
        r.scale,
        r.angle,
        t,
        0,
        0,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferReproject, 0, i.buffer);
    }
    render(t = false) {
      if (!t && !this.needRender && this.extraFrames <= 0 || (!this.needRender && this.extraFrames > 0 && this.extraFrames--, !this.pipeline1 || !this.pipeline2 || !this.pipelineReproject)) return;
      this._writeReprojectUniforms();
      const n = this.device.createCommandEncoder();
      if (this.bindGroupReproject) {
        const o = n.beginRenderPass({
          colorAttachments: [
            {
              view: this.reprojectView,
              clearValue: {
                r: -1,
                g: -1,
                b: -1,
                a: 1
              },
              loadOp: "clear",
              storeOp: "store"
            }
          ]
        });
        this.prevFrameMandelbrot && (o.setPipeline(this.pipelineReproject), o.setBindGroup(0, this.bindGroupReproject), o.draw(6, 1, 0, 0)), o.end();
      }
      const r = n.beginRenderPass({
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
      r.setPipeline(this.pipeline1), this.bindGroup1 && r.setBindGroup(0, this.bindGroup1), r.draw(6, 1, 0, 0), r.end();
      const i = this.ctx.getCurrentTexture().createView(), s = n.beginRenderPass({
        colorAttachments: [
          {
            view: i,
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
      s.setPipeline(this.pipeline2), this.bindGroup2 && s.setBindGroup(0, this.bindGroup2), s.draw(6, 1, 0, 0), s.end(), this.historyTexture && this.intermediateTexture && n.copyTextureToTexture({
        texture: this.intermediateTexture
      }, {
        texture: this.historyTexture
      }, {
        width: this.width,
        height: this.height,
        depthOrArrayLayers: 1
      }), this.device.queue.submit([
        n.finish()
      ]), this.previousMandelbrot && (this.prevFrameMandelbrot = {
        ...this.previousMandelbrot
      });
    }
    destroy() {
      var _a2, _b, _c, _d, _e, _f, _g, _h, _i2, _j;
      (_b = (_a2 = this.intermediateTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d = (_c = this.mandelbrotReferenceBuffer) == null ? void 0 : _c.destroy) == null ? void 0 : _d.call(_c), (_f = (_e = this.historyTexture) == null ? void 0 : _e.destroy) == null ? void 0 : _f.call(_e), (_h = (_g = this.reprojectTexture) == null ? void 0 : _g.destroy) == null ? void 0 : _h.call(_g), (_j = (_i2 = this.uniformBufferReproject) == null ? void 0 : _i2.destroy) == null ? void 0 : _j.call(_i2);
    }
  }
  const Ia = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, Ua = {
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
  }, ja = {
    key: 1,
    class: "intro-title-container"
  }, Yr = 1, Xr = 128, kt = 0.04, kr = 0.025, Ba = yi({
    __name: "MandelbrotNavigator",
    setup(e) {
      const t = Tt(null);
      let n, r, i;
      const s = Tt({
        cx: "-1.5",
        cy: "0.0",
        mu: 1e4,
        scale: "2.5",
        angle: "0.0",
        maxIterations: 1e3,
        antialiasLevel: Yr,
        palettePeriod: Xr
      });
      function o(U) {
        h[U.key.toLowerCase()] = true;
      }
      function a(U) {
        h[U.key.toLowerCase()] = false;
      }
      function f(U) {
        U.preventDefault();
        const T = 0.8;
        U.deltaY < 0 ? i.zoom(T) : i.zoom(1 / T);
      }
      const h = {};
      let u = false, p = false, S = 0, E = 0;
      const L = Tt(false);
      let B = 0, Z = 0, N = 0, $ = false;
      function Y() {
        typeof window < "u" && window.navigator ? L.value = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent) : L.value = false;
      }
      function M(U) {
        const T = t.value;
        if (!T) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const C = T.getBoundingClientRect();
        return {
          x: U.clientX - C.left,
          y: U.clientY - C.top,
          width: C.width,
          height: C.height
        };
      }
      function k(U) {
        if (U.button === 2) p = true;
        else {
          u = true;
          const T = M(U);
          S = T.x, E = T.y;
        }
      }
      function Se(U) {
        var _a2;
        const T = M(U);
        if (p) {
          const Ue = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
          if (!Ue) return;
          const bt = Ue.width / 2, De = Ue.height / 2, $e = T.x, mt = T.y, Wt = Math.atan2(mt - De, $e - bt);
          i.angle(Wt);
          return;
        }
        if (!u) return;
        const C = T.width, D = T.height, X = C / D, te = (T.x - S) / C * 2, Q = (T.y - E) / D * 2, re = -te * X, We = Q;
        i.translate_direct(re, We), S = T.x, E = T.y;
      }
      function me(U) {
        U.button === 2 ? p = false : u = false;
      }
      function Te(U) {
        var _a2;
        if (U.touches.length === 1) {
          u = true;
          const T = U.touches[0], C = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
          if (!C) return;
          S = T.clientX - C.left, E = T.clientY - C.top;
        } else if (U.touches.length === 2) {
          u = false, $ = true;
          const [T, C] = U.touches;
          B = Math.hypot(C.clientX - T.clientX, C.clientY - T.clientY), Z = Math.atan2(C.clientY - T.clientY, C.clientX - T.clientX), N = parseFloat(s.value.angle);
        }
      }
      function st(U) {
        var _a2;
        if (u && U.touches.length === 1) {
          const T = U.touches[0], C = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
          if (!C) return;
          const D = T.clientX - C.left, X = T.clientY - C.top, te = C.width, Q = C.height, re = te / Q, We = (D - S) / te * 2, Ue = (X - E) / Q * 2;
          i.translate_direct(-We * re, Ue), S = D, E = X;
        } else if ($ && U.touches.length === 2) {
          const [T, C] = U.touches, D = Math.hypot(C.clientX - T.clientX, C.clientY - T.clientY), X = Math.atan2(C.clientY - T.clientY, C.clientX - T.clientX), te = B / D;
          i.zoom(te);
          const Q = X - Z;
          i.angle(N + Q);
        }
      }
      function Ie(U) {
        U.touches.length === 0 && (u = false, $ = false);
      }
      async function Je() {
        if (!t.value) return;
        n = t.value, i = new zl(-0.5572506229492065, 0.6355989165839159, 5e3, 1e3, 0), r = new Fa(n, {
          antialiasLevel: 1,
          palettePeriod: 128
        }), await r.initialize(i), window.addEventListener("keydown", o), window.addEventListener("keyup", a), n.addEventListener("wheel", f, {
          passive: false
        }), n.addEventListener("mousedown", k), n.addEventListener("contextmenu", function(C) {
          C.preventDefault();
        }), window.addEventListener("mousemove", Se), window.addEventListener("mouseup", me);
        function U() {
          h.z && i.translate(0, kt), h.s && i.translate(0, -kt), h.q && i.translate(-kt, 0), h.d && i.translate(kt, 0), h.a && i.rotate(kr), h.e && i.rotate(-kr);
          const C = 0.8;
          h.r && i.zoom(C), h.f && i.zoom(1 / C), setTimeout(U, 16);
        }
        U();
        function T() {
          const C = s.value.epsilon, [D, X, te, Q] = i.step(), [re, We, Ue, bt] = i.get_params(), De = s.value.mu;
          s.value.cx = re, s.value.cy = We, s.value.scale = Ue, s.value.angle = bt;
          const $e = Math.min(Math.max(100, 80 + 20 * Math.log2(1 / te)), 1e6);
          r.update({
            cx: D,
            cy: X,
            mu: De,
            scale: te,
            angle: Q,
            maxIterations: $e,
            epsilon: C
          }, {
            antialiasLevel: Yr,
            palettePeriod: Xr
          }), r.render(), requestAnimationFrame(T);
        }
        T();
      }
      function Ze() {
        if (!t.value || !r) return;
        const U = t.value.getBoundingClientRect();
        t.value.width = U.width, t.value.height = U.height, r.resize && r.resize(), r.render(true);
      }
      const pe = Tt(false);
      async function gt() {
        if (!i) return;
        await Vn(), await new Promise((D) => setTimeout(D, 500));
        const U = 3500, T = performance.now();
        function C(D) {
          const X = Math.min((D - T) / U, 1), te = X < 0.5 ? 2 * X * X : -1 + (4 - 2 * X) * X, Q = Math.PI / 2 * te;
          i.zoom(te), i.angle(Q), X < 1 ? requestAnimationFrame(C) : pe.value = true;
        }
        requestAnimationFrame(C);
      }
      return fr(async () => {
        Y(), await Je(), window.addEventListener("resize", Ze), t.value && (t.value.addEventListener("touchstart", Te, {
          passive: false
        }), t.value.addEventListener("touchmove", st, {
          passive: false
        }), t.value.addEventListener("touchend", Ie, {
          passive: false
        })), await Vn(), await gt();
      }), ur(() => {
        window.removeEventListener("resize", Ze);
      }), (U, T) => (ht(), Dt("div", Ia, [
        Cn(ne("button", {
          class: ft([
            "menu-hamburger tag is-light is-medium animate__animated",
            pe.value ? "animate__fadeInDown" : ""
          ]),
          "aria-label": "Menu"
        }, T[1] || (T[1] = [
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
            On,
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
        Fr("", true),
        Cn(ne("div", {
          class: ft([
            "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
            pe.value ? "animate__fadeInUp" : ""
          ])
        }, T[2] || (T[2] = [
          $i(' D\xE9placer\xA0 <span class="tag is-black">Clic gauche</span>\xA0 <span class="tag is-black">Z</span>\xA0 <span class="tag is-black">Q</span>\xA0 <span class="tag is-black">S</span>\xA0 <span class="tag is-black">D</span>\xA0 |\xA0Tourner\xA0 <span class="tag is-black">Clic droit</span>\xA0 <span class="tag is-black">A</span>\xA0 <span class="tag is-black">E</span>\xA0 |\xA0Zoomer\xA0 <span class="tag is-black">Molette</span>\xA0 <span class="tag is-black">R</span>\xA0 <span class="tag is-black">F</span>', 22)
        ]), 2), [
          [
            On,
            pe.value
          ]
        ]),
        Cn(ne("div", {
          class: ft([
            "footer-love tag is-light is-medium is-hidden-touch animate__animated",
            pe.value ? "animate__fadeInUp" : ""
          ])
        }, [
          T[5] || (T[5] = ne("small", null, [
            en(" Made with \u2764\uFE0F "),
            ne("span", null, "by Guillaume Collombet"),
            en("\xA0|\xA0 ")
          ], -1)),
          ne("small", null, [
            ne("a", Ua, [
              (ht(), Dt("svg", Da, T[3] || (T[3] = [
                ne("path", {
                  d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                }, null, -1)
              ]))),
              T[4] || (T[4] = en("GitHub ", -1))
            ])
          ])
        ], 2), [
          [
            On,
            pe.value
          ]
        ]),
        pe.value ? Fr("", true) : (ht(), Dt("div", ja, T[6] || (T[6] = [
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
    key: 0,
    id: "fullscreen"
  }, za = {
    key: 1,
    class: "section is-flex is-flex-direction-column is-align-items-center is-justify-content-center",
    style: {
      height: "100vh"
    }
  }, Na = yi({
    __name: "App",
    setup(e) {
      const t = Tt(false);
      return fr(() => {
        t.value = typeof navigator < "u" && "gpu" in navigator;
      }), (n, r) => t.value ? (ht(), Dt("div", La, [
        we(Ba)
      ])) : (ht(), Dt("div", za, r[0] || (r[0] = [
        $i('<div class="box has-text-centered" style="max-width:400px;"><span class="icon is-large has-text-danger"><i class="fas fa-exclamation-triangle fa-2x"></i></span><h1 class="title is-4 mt-3">WebGPU non support\xE9</h1><p>Ce navigateur ne supporte pas WebGPU.<br> Veuillez utiliser un navigateur compatible WebGPU.</p><a class="button is-link mt-4" href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility" target="_blank"> Liste des navigateurs compatibles WebGPU </a></div>', 1)
      ])));
    }
  });
  wl(Na).mount("#app");
})();
