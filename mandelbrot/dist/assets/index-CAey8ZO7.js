(function() {
  const t = document.createElement("link").relList;
  if (t && t.supports && t.supports("modulepreload")) return;
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) n(r);
  new MutationObserver((r) => {
    for (const i of r) if (i.type === "childList") for (const o of i.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && n(o);
  }).observe(document, { childList: true, subtree: true });
  function s(r) {
    const i = {};
    return r.integrity && (i.integrity = r.integrity), r.referrerPolicy && (i.referrerPolicy = r.referrerPolicy), r.crossOrigin === "use-credentials" ? i.credentials = "include" : r.crossOrigin === "anonymous" ? i.credentials = "omit" : i.credentials = "same-origin", i;
  }
  function n(r) {
    if (r.ep) return;
    r.ep = true;
    const i = s(r);
    fetch(r.href, i);
  }
})();
/**
* @vue/shared v3.5.18
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Ss(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const s of e.split(",")) t[s] = 1;
  return (s) => s in t;
}
const Y = {}, rt = [], Ae = () => {
}, Cr = () => false, Yt = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Es = (e) => e.startsWith("onUpdate:"), se = Object.assign, Ts = (e, t) => {
  const s = e.indexOf(t);
  s > -1 && e.splice(s, 1);
}, Sr = Object.prototype.hasOwnProperty, $ = (e, t) => Sr.call(e, t), M = Array.isArray, xt = (e) => zt(e) === "[object Map]", Er = (e) => zt(e) === "[object Set]", I = (e) => typeof e == "function", Q = (e) => typeof e == "string", ft = (e) => typeof e == "symbol", X = (e) => e !== null && typeof e == "object", Cn = (e) => (X(e) || I(e)) && I(e.then) && I(e.catch), Tr = Object.prototype.toString, zt = (e) => Tr.call(e), Or = (e) => zt(e).slice(8, -1), Pr = (e) => zt(e) === "[object Object]", Os = (e) => Q(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, vt = /* @__PURE__ */ Ss(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), Jt = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (s) => t[s] || (t[s] = e(s));
}, Ar = /-(\w)/g, We = Jt((e) => e.replace(Ar, (t, s) => s ? s.toUpperCase() : "")), Mr = /\B([A-Z])/g, Qe = Jt((e) => e.replace(Mr, "-$1").toLowerCase()), Sn = Jt((e) => e.charAt(0).toUpperCase() + e.slice(1)), ts = Jt((e) => e ? `on${Sn(e)}` : ""), Ve = (e, t) => !Object.is(e, t), ss = (e, ...t) => {
  for (let s = 0; s < e.length; s++) e[s](...t);
}, ds = (e, t, s, n = false) => {
  Object.defineProperty(e, t, { configurable: true, enumerable: false, writable: n, value: s });
}, Rr = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
};
let Js;
const Xt = () => Js || (Js = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Ps(e) {
  if (M(e)) {
    const t = {};
    for (let s = 0; s < e.length; s++) {
      const n = e[s], r = Q(n) ? Lr(n) : Ps(n);
      if (r) for (const i in r) t[i] = r[i];
    }
    return t;
  } else if (Q(e) || X(e)) return e;
}
const Ir = /;(?![^(]*\))/g, Fr = /:([^]+)/, Dr = /\/\*[^]*?\*\//g;
function Lr(e) {
  const t = {};
  return e.replace(Dr, "").split(Ir).forEach((s) => {
    if (s) {
      const n = s.split(Fr);
      n.length > 1 && (t[n[0].trim()] = n[1].trim());
    }
  }), t;
}
function As(e) {
  let t = "";
  if (Q(e)) t = e;
  else if (M(e)) for (let s = 0; s < e.length; s++) {
    const n = As(e[s]);
    n && (t += n + " ");
  }
  else if (X(e)) for (const s in e) e[s] && (t += s + " ");
  return t.trim();
}
const Hr = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Nr = /* @__PURE__ */ Ss(Hr);
function En(e) {
  return !!e || e === "";
}
/**
* @vue/reactivity v3.5.18
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
let ue;
class jr {
  constructor(t = false) {
    this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.parent = ue, !t && ue && (this.index = (ue.scopes || (ue.scopes = [])).push(this) - 1);
  }
  get active() {
    return this._active;
  }
  pause() {
    if (this._active) {
      this._isPaused = true;
      let t, s;
      if (this.scopes) for (t = 0, s = this.scopes.length; t < s; t++) this.scopes[t].pause();
      for (t = 0, s = this.effects.length; t < s; t++) this.effects[t].pause();
    }
  }
  resume() {
    if (this._active && this._isPaused) {
      this._isPaused = false;
      let t, s;
      if (this.scopes) for (t = 0, s = this.scopes.length; t < s; t++) this.scopes[t].resume();
      for (t = 0, s = this.effects.length; t < s; t++) this.effects[t].resume();
    }
  }
  run(t) {
    if (this._active) {
      const s = ue;
      try {
        return ue = this, t();
      } finally {
        ue = s;
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
      let s, n;
      for (s = 0, n = this.effects.length; s < n; s++) this.effects[s].stop();
      for (this.effects.length = 0, s = 0, n = this.cleanups.length; s < n; s++) this.cleanups[s]();
      if (this.cleanups.length = 0, this.scopes) {
        for (s = 0, n = this.scopes.length; s < n; s++) this.scopes[s].stop(true);
        this.scopes.length = 0;
      }
      if (!this.detached && this.parent && !t) {
        const r = this.parent.scopes.pop();
        r && r !== this && (this.parent.scopes[this.index] = r, r.index = this.index);
      }
      this.parent = void 0;
    }
  }
}
function $r() {
  return ue;
}
let G;
const ns = /* @__PURE__ */ new WeakSet();
class Tn {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, ue && ue.active && ue.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, ns.has(this) && (ns.delete(this), this.trigger()));
  }
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Pn(this);
  }
  run() {
    if (!(this.flags & 1)) return this.fn();
    this.flags |= 2, Xs(this), An(this);
    const t = G, s = ve;
    G = this, ve = true;
    try {
      return this.fn();
    } finally {
      Mn(this), G = t, ve = s, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep) Is(t);
      this.deps = this.depsTail = void 0, Xs(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? ns.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  runIfDirty() {
    hs(this) && this.run();
  }
  get dirty() {
    return hs(this);
  }
}
let On = 0, yt, bt;
function Pn(e, t = false) {
  if (e.flags |= 8, t) {
    e.next = bt, bt = e;
    return;
  }
  e.next = yt, yt = e;
}
function Ms() {
  On++;
}
function Rs() {
  if (--On > 0) return;
  if (bt) {
    let t = bt;
    for (bt = void 0; t; ) {
      const s = t.next;
      t.next = void 0, t.flags &= -9, t = s;
    }
  }
  let e;
  for (; yt; ) {
    let t = yt;
    for (yt = void 0; t; ) {
      const s = t.next;
      if (t.next = void 0, t.flags &= -9, t.flags & 1) try {
        t.trigger();
      } catch (n) {
        e || (e = n);
      }
      t = s;
    }
  }
  if (e) throw e;
}
function An(e) {
  for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function Mn(e) {
  let t, s = e.depsTail, n = s;
  for (; n; ) {
    const r = n.prevDep;
    n.version === -1 ? (n === s && (s = r), Is(n), Ur(n)) : t = n, n.dep.activeLink = n.prevActiveLink, n.prevActiveLink = void 0, n = r;
  }
  e.deps = t, e.depsTail = s;
}
function hs(e) {
  for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (Rn(t.dep.computed) || t.dep.version !== t.version)) return true;
  return !!e._dirty;
}
function Rn(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Ot) || (e.globalVersion = Ot, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !hs(e)))) return;
  e.flags |= 2;
  const t = e.dep, s = G, n = ve;
  G = e, ve = true;
  try {
    An(e);
    const r = e.fn(e._value);
    (t.version === 0 || Ve(r, e._value)) && (e.flags |= 128, e._value = r, t.version++);
  } catch (r) {
    throw t.version++, r;
  } finally {
    G = s, ve = n, Mn(e), e.flags &= -3;
  }
}
function Is(e, t = false) {
  const { dep: s, prevSub: n, nextSub: r } = e;
  if (n && (n.nextSub = r, e.prevSub = void 0), r && (r.prevSub = n, e.nextSub = void 0), s.subs === e && (s.subs = n, !n && s.computed)) {
    s.computed.flags &= -5;
    for (let i = s.computed.deps; i; i = i.nextDep) Is(i, true);
  }
  !t && !--s.sc && s.map && s.map.delete(s.key);
}
function Ur(e) {
  const { prevDep: t, nextDep: s } = e;
  t && (t.nextDep = s, e.prevDep = void 0), s && (s.prevDep = t, e.nextDep = void 0);
}
let ve = true;
const In = [];
function Le() {
  In.push(ve), ve = false;
}
function He() {
  const e = In.pop();
  ve = e === void 0 ? true : e;
}
function Xs(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const s = G;
    G = void 0;
    try {
      t();
    } finally {
      G = s;
    }
  }
}
let Ot = 0;
class Br {
  constructor(t, s) {
    this.sub = t, this.dep = s, this.version = s.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class Fs {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
  }
  track(t) {
    if (!G || !ve || G === this.computed) return;
    let s = this.activeLink;
    if (s === void 0 || s.sub !== G) s = this.activeLink = new Br(G, this), G.deps ? (s.prevDep = G.depsTail, G.depsTail.nextDep = s, G.depsTail = s) : G.deps = G.depsTail = s, Fn(s);
    else if (s.version === -1 && (s.version = this.version, s.nextDep)) {
      const n = s.nextDep;
      n.prevDep = s.prevDep, s.prevDep && (s.prevDep.nextDep = n), s.prevDep = G.depsTail, s.nextDep = void 0, G.depsTail.nextDep = s, G.depsTail = s, G.deps === s && (G.deps = n);
    }
    return s;
  }
  trigger(t) {
    this.version++, Ot++, this.notify(t);
  }
  notify(t) {
    Ms();
    try {
      for (let s = this.subs; s; s = s.prevSub) s.sub.notify() && s.sub.dep.notify();
    } finally {
      Rs();
    }
  }
}
function Fn(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let n = t.deps; n; n = n.nextDep) Fn(n);
    }
    const s = e.dep.subs;
    s !== e && (e.prevSub = s, s && (s.nextSub = e)), e.dep.subs = e;
  }
}
const ps = /* @__PURE__ */ new WeakMap(), Xe = Symbol(""), gs = Symbol(""), Pt = Symbol("");
function ee(e, t, s) {
  if (ve && G) {
    let n = ps.get(e);
    n || ps.set(e, n = /* @__PURE__ */ new Map());
    let r = n.get(s);
    r || (n.set(s, r = new Fs()), r.map = n, r.key = s), r.track();
  }
}
function De(e, t, s, n, r, i) {
  const o = ps.get(e);
  if (!o) {
    Ot++;
    return;
  }
  const c = (u) => {
    u && u.trigger();
  };
  if (Ms(), t === "clear") o.forEach(c);
  else {
    const u = M(e), h = u && Os(s);
    if (u && s === "length") {
      const a = Number(n);
      o.forEach((p, C) => {
        (C === "length" || C === Pt || !ft(C) && C >= a) && c(p);
      });
    } else switch ((s !== void 0 || o.has(void 0)) && c(o.get(s)), h && c(o.get(Pt)), t) {
      case "add":
        u ? h && c(o.get("length")) : (c(o.get(Xe)), xt(e) && c(o.get(gs)));
        break;
      case "delete":
        u || (c(o.get(Xe)), xt(e) && c(o.get(gs)));
        break;
      case "set":
        xt(e) && c(o.get(Xe));
        break;
    }
  }
  Rs();
}
function st(e) {
  const t = j(e);
  return t === e ? t : (ee(t, "iterate", Pt), ye(e) ? t : t.map(re));
}
function Ds(e) {
  return ee(e = j(e), "iterate", Pt), e;
}
const Vr = { __proto__: null, [Symbol.iterator]() {
  return rs(this, Symbol.iterator, re);
}, concat(...e) {
  return st(this).concat(...e.map((t) => M(t) ? st(t) : t));
}, entries() {
  return rs(this, "entries", (e) => (e[1] = re(e[1]), e));
}, every(e, t) {
  return Re(this, "every", e, t, void 0, arguments);
}, filter(e, t) {
  return Re(this, "filter", e, t, (s) => s.map(re), arguments);
}, find(e, t) {
  return Re(this, "find", e, t, re, arguments);
}, findIndex(e, t) {
  return Re(this, "findIndex", e, t, void 0, arguments);
}, findLast(e, t) {
  return Re(this, "findLast", e, t, re, arguments);
}, findLastIndex(e, t) {
  return Re(this, "findLastIndex", e, t, void 0, arguments);
}, forEach(e, t) {
  return Re(this, "forEach", e, t, void 0, arguments);
}, includes(...e) {
  return is(this, "includes", e);
}, indexOf(...e) {
  return is(this, "indexOf", e);
}, join(e) {
  return st(this).join(e);
}, lastIndexOf(...e) {
  return is(this, "lastIndexOf", e);
}, map(e, t) {
  return Re(this, "map", e, t, void 0, arguments);
}, pop() {
  return gt(this, "pop");
}, push(...e) {
  return gt(this, "push", e);
}, reduce(e, ...t) {
  return Zs(this, "reduce", e, t);
}, reduceRight(e, ...t) {
  return Zs(this, "reduceRight", e, t);
}, shift() {
  return gt(this, "shift");
}, some(e, t) {
  return Re(this, "some", e, t, void 0, arguments);
}, splice(...e) {
  return gt(this, "splice", e);
}, toReversed() {
  return st(this).toReversed();
}, toSorted(e) {
  return st(this).toSorted(e);
}, toSpliced(...e) {
  return st(this).toSpliced(...e);
}, unshift(...e) {
  return gt(this, "unshift", e);
}, values() {
  return rs(this, "values", re);
} };
function rs(e, t, s) {
  const n = Ds(e), r = n[t]();
  return n !== e && !ye(e) && (r._next = r.next, r.next = () => {
    const i = r._next();
    return i.value && (i.value = s(i.value)), i;
  }), r;
}
const Kr = Array.prototype;
function Re(e, t, s, n, r, i) {
  const o = Ds(e), c = o !== e && !ye(e), u = o[t];
  if (u !== Kr[t]) {
    const p = u.apply(e, i);
    return c ? re(p) : p;
  }
  let h = s;
  o !== e && (c ? h = function(p, C) {
    return s.call(this, re(p), C, e);
  } : s.length > 2 && (h = function(p, C) {
    return s.call(this, p, C, e);
  }));
  const a = u.call(o, h, n);
  return c && r ? r(a) : a;
}
function Zs(e, t, s, n) {
  const r = Ds(e);
  let i = s;
  return r !== e && (ye(e) ? s.length > 3 && (i = function(o, c, u) {
    return s.call(this, o, c, u, e);
  }) : i = function(o, c, u) {
    return s.call(this, o, re(c), u, e);
  }), r[t](i, ...n);
}
function is(e, t, s) {
  const n = j(e);
  ee(n, "iterate", Pt);
  const r = n[t](...s);
  return (r === -1 || r === false) && js(s[0]) ? (s[0] = j(s[0]), n[t](...s)) : r;
}
function gt(e, t, s = []) {
  Le(), Ms();
  const n = j(e)[t].apply(e, s);
  return Rs(), He(), n;
}
const Wr = /* @__PURE__ */ Ss("__proto__,__v_isRef,__isVue"), Dn = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(ft));
function qr(e) {
  ft(e) || (e = String(e));
  const t = j(this);
  return ee(t, "has", e), t.hasOwnProperty(e);
}
class Ln {
  constructor(t = false, s = false) {
    this._isReadonly = t, this._isShallow = s;
  }
  get(t, s, n) {
    if (s === "__v_skip") return t.__v_skip;
    const r = this._isReadonly, i = this._isShallow;
    if (s === "__v_isReactive") return !r;
    if (s === "__v_isReadonly") return r;
    if (s === "__v_isShallow") return i;
    if (s === "__v_raw") return n === (r ? i ? ti : $n : i ? jn : Nn).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(n) ? t : void 0;
    const o = M(t);
    if (!r) {
      let u;
      if (o && (u = Vr[s])) return u;
      if (s === "hasOwnProperty") return qr;
    }
    const c = Reflect.get(t, s, te(t) ? t : n);
    return (ft(s) ? Dn.has(s) : Wr(s)) || (r || ee(t, "get", s), i) ? c : te(c) ? o && Os(s) ? c : c.value : X(c) ? r ? Un(c) : Hs(c) : c;
  }
}
class Hn extends Ln {
  constructor(t = false) {
    super(false, t);
  }
  set(t, s, n, r) {
    let i = t[s];
    if (!this._isShallow) {
      const u = Ze(i);
      if (!ye(n) && !Ze(n) && (i = j(i), n = j(n)), !M(t) && te(i) && !te(n)) return u ? false : (i.value = n, true);
    }
    const o = M(t) && Os(s) ? Number(s) < t.length : $(t, s), c = Reflect.set(t, s, n, te(t) ? t : r);
    return t === j(r) && (o ? Ve(n, i) && De(t, "set", s, n) : De(t, "add", s, n)), c;
  }
  deleteProperty(t, s) {
    const n = $(t, s);
    t[s];
    const r = Reflect.deleteProperty(t, s);
    return r && n && De(t, "delete", s, void 0), r;
  }
  has(t, s) {
    const n = Reflect.has(t, s);
    return (!ft(s) || !Dn.has(s)) && ee(t, "has", s), n;
  }
  ownKeys(t) {
    return ee(t, "iterate", M(t) ? "length" : Xe), Reflect.ownKeys(t);
  }
}
class Gr extends Ln {
  constructor(t = false) {
    super(true, t);
  }
  set(t, s) {
    return true;
  }
  deleteProperty(t, s) {
    return true;
  }
}
const Yr = new Hn(), zr = new Gr(), Jr = new Hn(true);
const ms = (e) => e, Ht = (e) => Reflect.getPrototypeOf(e);
function Xr(e, t, s) {
  return function(...n) {
    const r = this.__v_raw, i = j(r), o = xt(i), c = e === "entries" || e === Symbol.iterator && o, u = e === "keys" && o, h = r[e](...n), a = s ? ms : t ? _s : re;
    return !t && ee(i, "iterate", u ? gs : Xe), { next() {
      const { value: p, done: C } = h.next();
      return C ? { value: p, done: C } : { value: c ? [a(p[0]), a(p[1])] : a(p), done: C };
    }, [Symbol.iterator]() {
      return this;
    } };
  };
}
function Nt(e) {
  return function(...t) {
    return e === "delete" ? false : e === "clear" ? void 0 : this;
  };
}
function Zr(e, t) {
  const s = { get(r) {
    const i = this.__v_raw, o = j(i), c = j(r);
    e || (Ve(r, c) && ee(o, "get", r), ee(o, "get", c));
    const { has: u } = Ht(o), h = t ? ms : e ? _s : re;
    if (u.call(o, r)) return h(i.get(r));
    if (u.call(o, c)) return h(i.get(c));
    i !== o && i.get(r);
  }, get size() {
    const r = this.__v_raw;
    return !e && ee(j(r), "iterate", Xe), Reflect.get(r, "size", r);
  }, has(r) {
    const i = this.__v_raw, o = j(i), c = j(r);
    return e || (Ve(r, c) && ee(o, "has", r), ee(o, "has", c)), r === c ? i.has(r) : i.has(r) || i.has(c);
  }, forEach(r, i) {
    const o = this, c = o.__v_raw, u = j(c), h = t ? ms : e ? _s : re;
    return !e && ee(u, "iterate", Xe), c.forEach((a, p) => r.call(i, h(a), h(p), o));
  } };
  return se(s, e ? { add: Nt("add"), set: Nt("set"), delete: Nt("delete"), clear: Nt("clear") } : { add(r) {
    !t && !ye(r) && !Ze(r) && (r = j(r));
    const i = j(this);
    return Ht(i).has.call(i, r) || (i.add(r), De(i, "add", r, r)), this;
  }, set(r, i) {
    !t && !ye(i) && !Ze(i) && (i = j(i));
    const o = j(this), { has: c, get: u } = Ht(o);
    let h = c.call(o, r);
    h || (r = j(r), h = c.call(o, r));
    const a = u.call(o, r);
    return o.set(r, i), h ? Ve(i, a) && De(o, "set", r, i) : De(o, "add", r, i), this;
  }, delete(r) {
    const i = j(this), { has: o, get: c } = Ht(i);
    let u = o.call(i, r);
    u || (r = j(r), u = o.call(i, r)), c && c.call(i, r);
    const h = i.delete(r);
    return u && De(i, "delete", r, void 0), h;
  }, clear() {
    const r = j(this), i = r.size !== 0, o = r.clear();
    return i && De(r, "clear", void 0, void 0), o;
  } }), ["keys", "values", "entries", Symbol.iterator].forEach((r) => {
    s[r] = Xr(r, e, t);
  }), s;
}
function Ls(e, t) {
  const s = Zr(e, t);
  return (n, r, i) => r === "__v_isReactive" ? !e : r === "__v_isReadonly" ? e : r === "__v_raw" ? n : Reflect.get($(s, r) && r in n ? s : n, r, i);
}
const Qr = { get: Ls(false, false) }, kr = { get: Ls(false, true) }, ei = { get: Ls(true, false) };
const Nn = /* @__PURE__ */ new WeakMap(), jn = /* @__PURE__ */ new WeakMap(), $n = /* @__PURE__ */ new WeakMap(), ti = /* @__PURE__ */ new WeakMap();
function si(e) {
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
function ni(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : si(Or(e));
}
function Hs(e) {
  return Ze(e) ? e : Ns(e, false, Yr, Qr, Nn);
}
function ri(e) {
  return Ns(e, false, Jr, kr, jn);
}
function Un(e) {
  return Ns(e, true, zr, ei, $n);
}
function Ns(e, t, s, n, r) {
  if (!X(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
  const i = ni(e);
  if (i === 0) return e;
  const o = r.get(e);
  if (o) return o;
  const c = new Proxy(e, i === 2 ? n : s);
  return r.set(e, c), c;
}
function wt(e) {
  return Ze(e) ? wt(e.__v_raw) : !!(e && e.__v_isReactive);
}
function Ze(e) {
  return !!(e && e.__v_isReadonly);
}
function ye(e) {
  return !!(e && e.__v_isShallow);
}
function js(e) {
  return e ? !!e.__v_raw : false;
}
function j(e) {
  const t = e && e.__v_raw;
  return t ? j(t) : e;
}
function ii(e) {
  return !$(e, "__v_skip") && Object.isExtensible(e) && ds(e, "__v_skip", true), e;
}
const re = (e) => X(e) ? Hs(e) : e, _s = (e) => X(e) ? Un(e) : e;
function te(e) {
  return e ? e.__v_isRef === true : false;
}
function oi(e) {
  return li(e, false);
}
function li(e, t) {
  return te(e) ? e : new ci(e, t);
}
class ci {
  constructor(t, s) {
    this.dep = new Fs(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = s ? t : j(t), this._value = s ? t : re(t), this.__v_isShallow = s;
  }
  get value() {
    return this.dep.track(), this._value;
  }
  set value(t) {
    const s = this._rawValue, n = this.__v_isShallow || ye(t) || Ze(t);
    t = n ? t : j(t), Ve(t, s) && (this._rawValue = t, this._value = n ? t : re(t), this.dep.trigger());
  }
}
function fi(e) {
  return te(e) ? e.value : e;
}
const ui = { get: (e, t, s) => t === "__v_raw" ? e : fi(Reflect.get(e, t, s)), set: (e, t, s, n) => {
  const r = e[t];
  return te(r) && !te(s) ? (r.value = s, true) : Reflect.set(e, t, s, n);
} };
function Bn(e) {
  return wt(e) ? e : new Proxy(e, ui);
}
class ai {
  constructor(t, s, n) {
    this.fn = t, this.setter = s, this._value = void 0, this.dep = new Fs(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Ot - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !s, this.isSSR = n;
  }
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && G !== this) return Pn(this, true), true;
  }
  get value() {
    const t = this.dep.track();
    return Rn(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter && this.setter(t);
  }
}
function di(e, t, s = false) {
  let n, r;
  return I(e) ? n = e : (n = e.get, r = e.set), new ai(n, r, s);
}
const jt = {}, Vt = /* @__PURE__ */ new WeakMap();
let Je;
function hi(e, t = false, s = Je) {
  if (s) {
    let n = Vt.get(s);
    n || Vt.set(s, n = []), n.push(e);
  }
}
function pi(e, t, s = Y) {
  const { immediate: n, deep: r, once: i, scheduler: o, augmentJob: c, call: u } = s, h = (O) => r ? O : ye(O) || r === false || r === 0 ? Be(O, 1) : Be(O);
  let a, p, C, S, R = false, A = false;
  if (te(e) ? (p = () => e.value, R = ye(e)) : wt(e) ? (p = () => h(e), R = true) : M(e) ? (A = true, R = e.some((O) => wt(O) || ye(O)), p = () => e.map((O) => {
    if (te(O)) return O.value;
    if (wt(O)) return h(O);
    if (I(O)) return u ? u(O, 2) : O();
  })) : I(e) ? t ? p = u ? () => u(e, 2) : e : p = () => {
    if (C) {
      Le();
      try {
        C();
      } finally {
        He();
      }
    }
    const O = Je;
    Je = a;
    try {
      return u ? u(e, 3, [S]) : e(S);
    } finally {
      Je = O;
    }
  } : p = Ae, t && r) {
    const O = p, W = r === true ? 1 / 0 : r;
    p = () => Be(O(), W);
  }
  const L = $r(), F = () => {
    a.stop(), L && L.active && Ts(L.effects, a);
  };
  if (i && t) {
    const O = t;
    t = (...W) => {
      O(...W), F();
    };
  }
  let H = A ? new Array(e.length).fill(jt) : jt;
  const U = (O) => {
    if (!(!(a.flags & 1) || !a.dirty && !O)) if (t) {
      const W = a.run();
      if (r || R || (A ? W.some((J, k) => Ve(J, H[k])) : Ve(W, H))) {
        C && C();
        const J = Je;
        Je = a;
        try {
          const k = [W, H === jt ? void 0 : A && H[0] === jt ? [] : H, S];
          H = W, u ? u(t, 3, k) : t(...k);
        } finally {
          Je = J;
        }
      }
    } else a.run();
  };
  return c && c(U), a = new Tn(p), a.scheduler = o ? () => o(U, false) : U, S = (O) => hi(O, false, a), C = a.onStop = () => {
    const O = Vt.get(a);
    if (O) {
      if (u) u(O, 4);
      else for (const W of O) W();
      Vt.delete(a);
    }
  }, t ? n ? U(true) : H = a.run() : o ? o(U.bind(null, true), true) : a.run(), F.pause = a.pause.bind(a), F.resume = a.resume.bind(a), F.stop = F, F;
}
function Be(e, t = 1 / 0, s) {
  if (t <= 0 || !X(e) || e.__v_skip || (s = s || /* @__PURE__ */ new Set(), s.has(e))) return e;
  if (s.add(e), t--, te(e)) Be(e.value, t, s);
  else if (M(e)) for (let n = 0; n < e.length; n++) Be(e[n], t, s);
  else if (Er(e) || xt(e)) e.forEach((n) => {
    Be(n, t, s);
  });
  else if (Pr(e)) {
    for (const n in e) Be(e[n], t, s);
    for (const n of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, n) && Be(e[n], t, s);
  }
  return e;
}
/**
* @vue/runtime-core v3.5.18
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
function It(e, t, s, n) {
  try {
    return n ? e(...n) : e();
  } catch (r) {
    Zt(r, t, s);
  }
}
function Me(e, t, s, n) {
  if (I(e)) {
    const r = It(e, t, s, n);
    return r && Cn(r) && r.catch((i) => {
      Zt(i, t, s);
    }), r;
  }
  if (M(e)) {
    const r = [];
    for (let i = 0; i < e.length; i++) r.push(Me(e[i], t, s, n));
    return r;
  }
}
function Zt(e, t, s, n = true) {
  const r = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: o } = t && t.appContext.config || Y;
  if (t) {
    let c = t.parent;
    const u = t.proxy, h = `https://vuejs.org/error-reference/#runtime-${s}`;
    for (; c; ) {
      const a = c.ec;
      if (a) {
        for (let p = 0; p < a.length; p++) if (a[p](e, u, h) === false) return;
      }
      c = c.parent;
    }
    if (i) {
      Le(), It(i, null, 10, [e, u, h]), He();
      return;
    }
  }
  gi(e, s, r, n, o);
}
function gi(e, t, s, n = true, r = false) {
  if (r) throw e;
  console.error(e);
}
const ie = [];
let Te = -1;
const it = [];
let $e = null, nt = 0;
const Vn = Promise.resolve();
let Kt = null;
function mi(e) {
  const t = Kt || Vn;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function _i(e) {
  let t = Te + 1, s = ie.length;
  for (; t < s; ) {
    const n = t + s >>> 1, r = ie[n], i = At(r);
    i < e || i === e && r.flags & 2 ? t = n + 1 : s = n;
  }
  return t;
}
function $s(e) {
  if (!(e.flags & 1)) {
    const t = At(e), s = ie[ie.length - 1];
    !s || !(e.flags & 2) && t >= At(s) ? ie.push(e) : ie.splice(_i(t), 0, e), e.flags |= 1, Kn();
  }
}
function Kn() {
  Kt || (Kt = Vn.then(qn));
}
function xi(e) {
  M(e) ? it.push(...e) : $e && e.id === -1 ? $e.splice(nt + 1, 0, e) : e.flags & 1 || (it.push(e), e.flags |= 1), Kn();
}
function Qs(e, t, s = Te + 1) {
  for (; s < ie.length; s++) {
    const n = ie[s];
    if (n && n.flags & 2) {
      if (e && n.id !== e.uid) continue;
      ie.splice(s, 1), s--, n.flags & 4 && (n.flags &= -2), n(), n.flags & 4 || (n.flags &= -2);
    }
  }
}
function Wn(e) {
  if (it.length) {
    const t = [...new Set(it)].sort((s, n) => At(s) - At(n));
    if (it.length = 0, $e) {
      $e.push(...t);
      return;
    }
    for ($e = t, nt = 0; nt < $e.length; nt++) {
      const s = $e[nt];
      s.flags & 4 && (s.flags &= -2), s.flags & 8 || s(), s.flags &= -2;
    }
    $e = null, nt = 0;
  }
}
const At = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function qn(e) {
  try {
    for (Te = 0; Te < ie.length; Te++) {
      const t = ie[Te];
      t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), It(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
    }
  } finally {
    for (; Te < ie.length; Te++) {
      const t = ie[Te];
      t && (t.flags &= -2);
    }
    Te = -1, ie.length = 0, Wn(), Kt = null, (ie.length || it.length) && qn();
  }
}
let Pe = null, Gn = null;
function Wt(e) {
  const t = Pe;
  return Pe = e, Gn = e && e.type.__scopeId || null, t;
}
function vi(e, t = Pe, s) {
  if (!t || e._n) return e;
  const n = (...r) => {
    n._d && cn(-1);
    const i = Wt(t);
    let o;
    try {
      o = e(...r);
    } finally {
      Wt(i), n._d && cn(1);
    }
    return o;
  };
  return n._n = true, n._c = true, n._d = true, n;
}
function Ye(e, t, s, n) {
  const r = e.dirs, i = t && t.dirs;
  for (let o = 0; o < r.length; o++) {
    const c = r[o];
    i && (c.oldValue = i[o].value);
    let u = c.dir[n];
    u && (Le(), Me(u, s, 8, [e.el, c, e, t]), He());
  }
}
const yi = Symbol("_vte"), bi = (e) => e.__isTeleport;
function Us(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, Us(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Yn(e, t) {
  return I(e) ? se({ name: e.name }, t, { setup: e }) : e;
}
function zn(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
function Ct(e, t, s, n, r = false) {
  if (M(e)) {
    e.forEach((R, A) => Ct(R, t && (M(t) ? t[A] : t), s, n, r));
    return;
  }
  if (St(n) && !r) {
    n.shapeFlag & 512 && n.type.__asyncResolved && n.component.subTree.component && Ct(e, t, s, n.component.subTree);
    return;
  }
  const i = n.shapeFlag & 4 ? qs(n.component) : n.el, o = r ? null : i, { i: c, r: u } = e, h = t && t.r, a = c.refs === Y ? c.refs = {} : c.refs, p = c.setupState, C = j(p), S = p === Y ? () => false : (R) => $(C, R);
  if (h != null && h !== u && (Q(h) ? (a[h] = null, S(h) && (p[h] = null)) : te(h) && (h.value = null)), I(u)) It(u, c, 12, [o, a]);
  else {
    const R = Q(u), A = te(u);
    if (R || A) {
      const L = () => {
        if (e.f) {
          const F = R ? S(u) ? p[u] : a[u] : u.value;
          r ? M(F) && Ts(F, i) : M(F) ? F.includes(i) || F.push(i) : R ? (a[u] = [i], S(u) && (p[u] = a[u])) : (u.value = [i], e.k && (a[e.k] = u.value));
        } else R ? (a[u] = o, S(u) && (p[u] = o)) : A && (u.value = o, e.k && (a[e.k] = o));
      };
      o ? (L.id = -1, ge(L, s)) : L();
    }
  }
}
Xt().requestIdleCallback;
Xt().cancelIdleCallback;
const St = (e) => !!e.type.__asyncLoader, Jn = (e) => e.type.__isKeepAlive;
function wi(e, t) {
  Xn(e, "a", t);
}
function Ci(e, t) {
  Xn(e, "da", t);
}
function Xn(e, t, s = oe) {
  const n = e.__wdc || (e.__wdc = () => {
    let r = s;
    for (; r; ) {
      if (r.isDeactivated) return;
      r = r.parent;
    }
    return e();
  });
  if (Qt(t, n, s), s) {
    let r = s.parent;
    for (; r && r.parent; ) Jn(r.parent.vnode) && Si(n, t, s, r), r = r.parent;
  }
}
function Si(e, t, s, n) {
  const r = Qt(t, e, n, true);
  Zn(() => {
    Ts(n[t], r);
  }, s);
}
function Qt(e, t, s = oe, n = false) {
  if (s) {
    const r = s[e] || (s[e] = []), i = t.__weh || (t.__weh = (...o) => {
      Le();
      const c = Ft(s), u = Me(t, s, e, o);
      return c(), He(), u;
    });
    return n ? r.unshift(i) : r.push(i), i;
  }
}
const Ne = (e) => (t, s = oe) => {
  (!Rt || e === "sp") && Qt(e, (...n) => t(...n), s);
}, Ei = Ne("bm"), Bs = Ne("m"), Ti = Ne("bu"), Oi = Ne("u"), Pi = Ne("bum"), Zn = Ne("um"), Ai = Ne("sp"), Mi = Ne("rtg"), Ri = Ne("rtc");
function Ii(e, t = oe) {
  Qt("ec", e, t);
}
const Fi = Symbol.for("v-ndc"), xs = (e) => e ? yr(e) ? qs(e) : xs(e.parent) : null, Et = se(/* @__PURE__ */ Object.create(null), { $: (e) => e, $el: (e) => e.vnode.el, $data: (e) => e.data, $props: (e) => e.props, $attrs: (e) => e.attrs, $slots: (e) => e.slots, $refs: (e) => e.refs, $parent: (e) => xs(e.parent), $root: (e) => xs(e.root), $host: (e) => e.ce, $emit: (e) => e.emit, $options: (e) => kn(e), $forceUpdate: (e) => e.f || (e.f = () => {
  $s(e.update);
}), $nextTick: (e) => e.n || (e.n = mi.bind(e.proxy)), $watch: (e) => to.bind(e) }), os = (e, t) => e !== Y && !e.__isScriptSetup && $(e, t), Di = { get({ _: e }, t) {
  if (t === "__v_skip") return true;
  const { ctx: s, setupState: n, data: r, props: i, accessCache: o, type: c, appContext: u } = e;
  let h;
  if (t[0] !== "$") {
    const S = o[t];
    if (S !== void 0) switch (S) {
      case 1:
        return n[t];
      case 2:
        return r[t];
      case 4:
        return s[t];
      case 3:
        return i[t];
    }
    else {
      if (os(n, t)) return o[t] = 1, n[t];
      if (r !== Y && $(r, t)) return o[t] = 2, r[t];
      if ((h = e.propsOptions[0]) && $(h, t)) return o[t] = 3, i[t];
      if (s !== Y && $(s, t)) return o[t] = 4, s[t];
      vs && (o[t] = 0);
    }
  }
  const a = Et[t];
  let p, C;
  if (a) return t === "$attrs" && ee(e.attrs, "get", ""), a(e);
  if ((p = c.__cssModules) && (p = p[t])) return p;
  if (s !== Y && $(s, t)) return o[t] = 4, s[t];
  if (C = u.config.globalProperties, $(C, t)) return C[t];
}, set({ _: e }, t, s) {
  const { data: n, setupState: r, ctx: i } = e;
  return os(r, t) ? (r[t] = s, true) : n !== Y && $(n, t) ? (n[t] = s, true) : $(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (i[t] = s, true);
}, has({ _: { data: e, setupState: t, accessCache: s, ctx: n, appContext: r, propsOptions: i } }, o) {
  let c;
  return !!s[o] || e !== Y && $(e, o) || os(t, o) || (c = i[0]) && $(c, o) || $(n, o) || $(Et, o) || $(r.config.globalProperties, o);
}, defineProperty(e, t, s) {
  return s.get != null ? e._.accessCache[t] = 0 : $(s, "value") && this.set(e, t, s.value, null), Reflect.defineProperty(e, t, s);
} };
function ks(e) {
  return M(e) ? e.reduce((t, s) => (t[s] = null, t), {}) : e;
}
let vs = true;
function Li(e) {
  const t = kn(e), s = e.proxy, n = e.ctx;
  vs = false, t.beforeCreate && en(t.beforeCreate, e, "bc");
  const { data: r, computed: i, methods: o, watch: c, provide: u, inject: h, created: a, beforeMount: p, mounted: C, beforeUpdate: S, updated: R, activated: A, deactivated: L, beforeDestroy: F, beforeUnmount: H, destroyed: U, unmounted: O, render: W, renderTracked: J, renderTriggered: k, errorCaptured: ae, serverPrefetch: qe, expose: _e, inheritAttrs: le, components: ke, directives: et, filters: ut } = t;
  if (h && Hi(h, n, null), o) for (const z in o) {
    const B = o[z];
    I(B) && (n[z] = B.bind(s));
  }
  if (r) {
    const z = r.call(s, s);
    X(z) && (e.data = Hs(z));
  }
  if (vs = true, i) for (const z in i) {
    const B = i[z], xe = I(B) ? B.bind(s, s) : I(B.get) ? B.get.bind(s, s) : Ae, je = !I(B) && I(B.set) ? B.set.bind(s) : Ae, be = Eo({ get: xe, set: je });
    Object.defineProperty(n, z, { enumerable: true, configurable: true, get: () => be.value, set: (de) => be.value = de });
  }
  if (c) for (const z in c) Qn(c[z], n, s, z);
  if (u) {
    const z = I(u) ? u.call(s) : u;
    Reflect.ownKeys(z).forEach((B) => {
      Vi(B, z[B]);
    });
  }
  a && en(a, e, "c");
  function Z(z, B) {
    M(B) ? B.forEach((xe) => z(xe.bind(s))) : B && z(B.bind(s));
  }
  if (Z(Ei, p), Z(Bs, C), Z(Ti, S), Z(Oi, R), Z(wi, A), Z(Ci, L), Z(Ii, ae), Z(Ri, J), Z(Mi, k), Z(Pi, H), Z(Zn, O), Z(Ai, qe), M(_e)) if (_e.length) {
    const z = e.exposed || (e.exposed = {});
    _e.forEach((B) => {
      Object.defineProperty(z, B, { get: () => s[B], set: (xe) => s[B] = xe, enumerable: true });
    });
  } else e.exposed || (e.exposed = {});
  W && e.render === Ae && (e.render = W), le != null && (e.inheritAttrs = le), ke && (e.components = ke), et && (e.directives = et), qe && zn(e);
}
function Hi(e, t, s = Ae) {
  M(e) && (e = ys(e));
  for (const n in e) {
    const r = e[n];
    let i;
    X(r) ? "default" in r ? i = $t(r.from || n, r.default, true) : i = $t(r.from || n) : i = $t(r), te(i) ? Object.defineProperty(t, n, { enumerable: true, configurable: true, get: () => i.value, set: (o) => i.value = o }) : t[n] = i;
  }
}
function en(e, t, s) {
  Me(M(e) ? e.map((n) => n.bind(t.proxy)) : e.bind(t.proxy), t, s);
}
function Qn(e, t, s, n) {
  let r = n.includes(".") ? dr(s, n) : () => s[n];
  if (Q(e)) {
    const i = t[e];
    I(i) && cs(r, i);
  } else if (I(e)) cs(r, e.bind(s));
  else if (X(e)) if (M(e)) e.forEach((i) => Qn(i, t, s, n));
  else {
    const i = I(e.handler) ? e.handler.bind(s) : t[e.handler];
    I(i) && cs(r, i, e);
  }
}
function kn(e) {
  const t = e.type, { mixins: s, extends: n } = t, { mixins: r, optionsCache: i, config: { optionMergeStrategies: o } } = e.appContext, c = i.get(t);
  let u;
  return c ? u = c : !r.length && !s && !n ? u = t : (u = {}, r.length && r.forEach((h) => qt(u, h, o, true)), qt(u, t, o)), X(t) && i.set(t, u), u;
}
function qt(e, t, s, n = false) {
  const { mixins: r, extends: i } = t;
  i && qt(e, i, s, true), r && r.forEach((o) => qt(e, o, s, true));
  for (const o in t) if (!(n && o === "expose")) {
    const c = Ni[o] || s && s[o];
    e[o] = c ? c(e[o], t[o]) : t[o];
  }
  return e;
}
const Ni = { data: tn, props: sn, emits: sn, methods: _t, computed: _t, beforeCreate: ne, created: ne, beforeMount: ne, mounted: ne, beforeUpdate: ne, updated: ne, beforeDestroy: ne, beforeUnmount: ne, destroyed: ne, unmounted: ne, activated: ne, deactivated: ne, errorCaptured: ne, serverPrefetch: ne, components: _t, directives: _t, watch: $i, provide: tn, inject: ji };
function tn(e, t) {
  return t ? e ? function() {
    return se(I(e) ? e.call(this, this) : e, I(t) ? t.call(this, this) : t);
  } : t : e;
}
function ji(e, t) {
  return _t(ys(e), ys(t));
}
function ys(e) {
  if (M(e)) {
    const t = {};
    for (let s = 0; s < e.length; s++) t[e[s]] = e[s];
    return t;
  }
  return e;
}
function ne(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function _t(e, t) {
  return e ? se(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function sn(e, t) {
  return e ? M(e) && M(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : se(/* @__PURE__ */ Object.create(null), ks(e), ks(t ?? {})) : t;
}
function $i(e, t) {
  if (!e) return t;
  if (!t) return e;
  const s = se(/* @__PURE__ */ Object.create(null), e);
  for (const n in t) s[n] = ne(e[n], t[n]);
  return s;
}
function er() {
  return { app: null, config: { isNativeTag: Cr, performance: false, globalProperties: {}, optionMergeStrategies: {}, errorHandler: void 0, warnHandler: void 0, compilerOptions: {} }, mixins: [], components: {}, directives: {}, provides: /* @__PURE__ */ Object.create(null), optionsCache: /* @__PURE__ */ new WeakMap(), propsCache: /* @__PURE__ */ new WeakMap(), emitsCache: /* @__PURE__ */ new WeakMap() };
}
let Ui = 0;
function Bi(e, t) {
  return function(n, r = null) {
    I(n) || (n = se({}, n)), r != null && !X(r) && (r = null);
    const i = er(), o = /* @__PURE__ */ new WeakSet(), c = [];
    let u = false;
    const h = i.app = { _uid: Ui++, _component: n, _props: r, _container: null, _context: i, _instance: null, version: To, get config() {
      return i.config;
    }, set config(a) {
    }, use(a, ...p) {
      return o.has(a) || (a && I(a.install) ? (o.add(a), a.install(h, ...p)) : I(a) && (o.add(a), a(h, ...p))), h;
    }, mixin(a) {
      return i.mixins.includes(a) || i.mixins.push(a), h;
    }, component(a, p) {
      return p ? (i.components[a] = p, h) : i.components[a];
    }, directive(a, p) {
      return p ? (i.directives[a] = p, h) : i.directives[a];
    }, mount(a, p, C) {
      if (!u) {
        const S = h._ceVNode || Ke(n, r);
        return S.appContext = i, C === true ? C = "svg" : C === false && (C = void 0), e(S, a, C), u = true, h._container = a, a.__vue_app__ = h, qs(S.component);
      }
    }, onUnmount(a) {
      c.push(a);
    }, unmount() {
      u && (Me(c, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
    }, provide(a, p) {
      return i.provides[a] = p, h;
    }, runWithContext(a) {
      const p = ot;
      ot = h;
      try {
        return a();
      } finally {
        ot = p;
      }
    } };
    return h;
  };
}
let ot = null;
function Vi(e, t) {
  if (oe) {
    let s = oe.provides;
    const n = oe.parent && oe.parent.provides;
    n === s && (s = oe.provides = Object.create(n)), s[e] = t;
  }
}
function $t(e, t, s = false) {
  const n = vo();
  if (n || ot) {
    let r = ot ? ot._context.provides : n ? n.parent == null || n.ce ? n.vnode.appContext && n.vnode.appContext.provides : n.parent.provides : void 0;
    if (r && e in r) return r[e];
    if (arguments.length > 1) return s && I(t) ? t.call(n && n.proxy) : t;
  }
}
const tr = {}, sr = () => Object.create(tr), nr = (e) => Object.getPrototypeOf(e) === tr;
function Ki(e, t, s, n = false) {
  const r = {}, i = sr();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), rr(e, t, r, i);
  for (const o in e.propsOptions[0]) o in r || (r[o] = void 0);
  s ? e.props = n ? r : ri(r) : e.type.props ? e.props = r : e.props = i, e.attrs = i;
}
function Wi(e, t, s, n) {
  const { props: r, attrs: i, vnode: { patchFlag: o } } = e, c = j(r), [u] = e.propsOptions;
  let h = false;
  if ((n || o > 0) && !(o & 16)) {
    if (o & 8) {
      const a = e.vnode.dynamicProps;
      for (let p = 0; p < a.length; p++) {
        let C = a[p];
        if (kt(e.emitsOptions, C)) continue;
        const S = t[C];
        if (u) if ($(i, C)) S !== i[C] && (i[C] = S, h = true);
        else {
          const R = We(C);
          r[R] = bs(u, c, R, S, e, false);
        }
        else S !== i[C] && (i[C] = S, h = true);
      }
    }
  } else {
    rr(e, t, r, i) && (h = true);
    let a;
    for (const p in c) (!t || !$(t, p) && ((a = Qe(p)) === p || !$(t, a))) && (u ? s && (s[p] !== void 0 || s[a] !== void 0) && (r[p] = bs(u, c, p, void 0, e, true)) : delete r[p]);
    if (i !== c) for (const p in i) (!t || !$(t, p)) && (delete i[p], h = true);
  }
  h && De(e.attrs, "set", "");
}
function rr(e, t, s, n) {
  const [r, i] = e.propsOptions;
  let o = false, c;
  if (t) for (let u in t) {
    if (vt(u)) continue;
    const h = t[u];
    let a;
    r && $(r, a = We(u)) ? !i || !i.includes(a) ? s[a] = h : (c || (c = {}))[a] = h : kt(e.emitsOptions, u) || (!(u in n) || h !== n[u]) && (n[u] = h, o = true);
  }
  if (i) {
    const u = j(s), h = c || Y;
    for (let a = 0; a < i.length; a++) {
      const p = i[a];
      s[p] = bs(r, u, p, h[p], e, !$(h, p));
    }
  }
  return o;
}
function bs(e, t, s, n, r, i) {
  const o = e[s];
  if (o != null) {
    const c = $(o, "default");
    if (c && n === void 0) {
      const u = o.default;
      if (o.type !== Function && !o.skipFactory && I(u)) {
        const { propsDefaults: h } = r;
        if (s in h) n = h[s];
        else {
          const a = Ft(r);
          n = h[s] = u.call(null, t), a();
        }
      } else n = u;
      r.ce && r.ce._setProp(s, n);
    }
    o[0] && (i && !c ? n = false : o[1] && (n === "" || n === Qe(s)) && (n = true));
  }
  return n;
}
const qi = /* @__PURE__ */ new WeakMap();
function ir(e, t, s = false) {
  const n = s ? qi : t.propsCache, r = n.get(e);
  if (r) return r;
  const i = e.props, o = {}, c = [];
  let u = false;
  if (!I(e)) {
    const a = (p) => {
      u = true;
      const [C, S] = ir(p, t, true);
      se(o, C), S && c.push(...S);
    };
    !s && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
  }
  if (!i && !u) return X(e) && n.set(e, rt), rt;
  if (M(i)) for (let a = 0; a < i.length; a++) {
    const p = We(i[a]);
    nn(p) && (o[p] = Y);
  }
  else if (i) for (const a in i) {
    const p = We(a);
    if (nn(p)) {
      const C = i[a], S = o[p] = M(C) || I(C) ? { type: C } : se({}, C), R = S.type;
      let A = false, L = true;
      if (M(R)) for (let F = 0; F < R.length; ++F) {
        const H = R[F], U = I(H) && H.name;
        if (U === "Boolean") {
          A = true;
          break;
        } else U === "String" && (L = false);
      }
      else A = I(R) && R.name === "Boolean";
      S[0] = A, S[1] = L, (A || $(S, "default")) && c.push(p);
    }
  }
  const h = [o, c];
  return X(e) && n.set(e, h), h;
}
function nn(e) {
  return e[0] !== "$" && !vt(e);
}
const Vs = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", Ks = (e) => M(e) ? e.map(Oe) : [Oe(e)], Gi = (e, t, s) => {
  if (t._n) return t;
  const n = vi((...r) => Ks(t(...r)), s);
  return n._c = false, n;
}, or = (e, t, s) => {
  const n = e._ctx;
  for (const r in e) {
    if (Vs(r)) continue;
    const i = e[r];
    if (I(i)) t[r] = Gi(r, i, n);
    else if (i != null) {
      const o = Ks(i);
      t[r] = () => o;
    }
  }
}, lr = (e, t) => {
  const s = Ks(t);
  e.slots.default = () => s;
}, cr = (e, t, s) => {
  for (const n in t) (s || !Vs(n)) && (e[n] = t[n]);
}, Yi = (e, t, s) => {
  const n = e.slots = sr();
  if (e.vnode.shapeFlag & 32) {
    const r = t.__;
    r && ds(n, "__", r, true);
    const i = t._;
    i ? (cr(n, t, s), s && ds(n, "_", i, true)) : or(t, n);
  } else t && lr(e, t);
}, zi = (e, t, s) => {
  const { vnode: n, slots: r } = e;
  let i = true, o = Y;
  if (n.shapeFlag & 32) {
    const c = t._;
    c ? s && c === 1 ? i = false : cr(r, t, s) : (i = !t.$stable, or(t, r)), o = t;
  } else t && (lr(e, t), o = { default: 1 });
  if (i) for (const c in r) !Vs(c) && o[c] == null && delete r[c];
}, ge = co;
function Ji(e) {
  return Xi(e);
}
function Xi(e, t) {
  const s = Xt();
  s.__VUE__ = true;
  const { insert: n, remove: r, patchProp: i, createElement: o, createText: c, createComment: u, setText: h, setElementText: a, parentNode: p, nextSibling: C, setScopeId: S = Ae, insertStaticContent: R } = e, A = (l, f, d, _ = null, g = null, m = null, b = void 0, y = null, v = !!f.dynamicChildren) => {
    if (l === f) return;
    l && !mt(l, f) && (_ = tt(l), de(l, g, m, true), l = null), f.patchFlag === -2 && (v = false, f.dynamicChildren = null);
    const { type: x, ref: E, shapeFlag: w } = f;
    switch (x) {
      case es:
        L(l, f, d, _);
        break;
      case lt:
        F(l, f, d, _);
        break;
      case fs:
        l == null && H(f, d, _, b);
        break;
      case Fe:
        ke(l, f, d, _, g, m, b, y, v);
        break;
      default:
        w & 1 ? W(l, f, d, _, g, m, b, y, v) : w & 6 ? et(l, f, d, _, g, m, b, y, v) : (w & 64 || w & 128) && x.process(l, f, d, _, g, m, b, y, v, V);
    }
    E != null && g ? Ct(E, l && l.ref, m, f || l, !f) : E == null && l && l.ref != null && Ct(l.ref, null, m, l, true);
  }, L = (l, f, d, _) => {
    if (l == null) n(f.el = c(f.children), d, _);
    else {
      const g = f.el = l.el;
      f.children !== l.children && h(g, f.children);
    }
  }, F = (l, f, d, _) => {
    l == null ? n(f.el = u(f.children || ""), d, _) : f.el = l.el;
  }, H = (l, f, d, _) => {
    [l.el, l.anchor] = R(l.children, f, d, _, l.el, l.anchor);
  }, U = ({ el: l, anchor: f }, d, _) => {
    let g;
    for (; l && l !== f; ) g = C(l), n(l, d, _), l = g;
    n(f, d, _);
  }, O = ({ el: l, anchor: f }) => {
    let d;
    for (; l && l !== f; ) d = C(l), r(l), l = d;
    r(f);
  }, W = (l, f, d, _, g, m, b, y, v) => {
    f.type === "svg" ? b = "svg" : f.type === "math" && (b = "mathml"), l == null ? J(f, d, _, g, m, b, y, v) : qe(l, f, g, m, b, y, v);
  }, J = (l, f, d, _, g, m, b, y) => {
    let v, x;
    const { props: E, shapeFlag: w, transition: T, dirs: P } = l;
    if (v = l.el = o(l.type, m, E && E.is, E), w & 8 ? a(v, l.children) : w & 16 && ae(l.children, v, null, _, g, ls(l, m), b, y), P && Ye(l, null, _, "created"), k(v, l, l.scopeId, b, _), E) {
      for (const q in E) q !== "value" && !vt(q) && i(v, q, null, E[q], m, _);
      "value" in E && i(v, "value", null, E.value, m), (x = E.onVnodeBeforeMount) && Ee(x, _, l);
    }
    P && Ye(l, null, _, "beforeMount");
    const D = Zi(g, T);
    D && T.beforeEnter(v), n(v, f, d), ((x = E && E.onVnodeMounted) || D || P) && ge(() => {
      x && Ee(x, _, l), D && T.enter(v), P && Ye(l, null, _, "mounted");
    }, g);
  }, k = (l, f, d, _, g) => {
    if (d && S(l, d), _) for (let m = 0; m < _.length; m++) S(l, _[m]);
    if (g) {
      let m = g.subTree;
      if (f === m || pr(m.type) && (m.ssContent === f || m.ssFallback === f)) {
        const b = g.vnode;
        k(l, b, b.scopeId, b.slotScopeIds, g.parent);
      }
    }
  }, ae = (l, f, d, _, g, m, b, y, v = 0) => {
    for (let x = v; x < l.length; x++) {
      const E = l[x] = y ? Ue(l[x]) : Oe(l[x]);
      A(null, E, f, d, _, g, m, b, y);
    }
  }, qe = (l, f, d, _, g, m, b) => {
    const y = f.el = l.el;
    let { patchFlag: v, dynamicChildren: x, dirs: E } = f;
    v |= l.patchFlag & 16;
    const w = l.props || Y, T = f.props || Y;
    let P;
    if (d && ze(d, false), (P = T.onVnodeBeforeUpdate) && Ee(P, d, f, l), E && Ye(f, l, d, "beforeUpdate"), d && ze(d, true), (w.innerHTML && T.innerHTML == null || w.textContent && T.textContent == null) && a(y, ""), x ? _e(l.dynamicChildren, x, y, d, _, ls(f, g), m) : b || B(l, f, y, null, d, _, ls(f, g), m, false), v > 0) {
      if (v & 16) le(y, w, T, d, g);
      else if (v & 2 && w.class !== T.class && i(y, "class", null, T.class, g), v & 4 && i(y, "style", w.style, T.style, g), v & 8) {
        const D = f.dynamicProps;
        for (let q = 0; q < D.length; q++) {
          const K = D[q], ce = w[K], fe = T[K];
          (fe !== ce || K === "value") && i(y, K, ce, fe, g, d);
        }
      }
      v & 1 && l.children !== f.children && a(y, f.children);
    } else !b && x == null && le(y, w, T, d, g);
    ((P = T.onVnodeUpdated) || E) && ge(() => {
      P && Ee(P, d, f, l), E && Ye(f, l, d, "updated");
    }, _);
  }, _e = (l, f, d, _, g, m, b) => {
    for (let y = 0; y < f.length; y++) {
      const v = l[y], x = f[y], E = v.el && (v.type === Fe || !mt(v, x) || v.shapeFlag & 198) ? p(v.el) : d;
      A(v, x, E, null, _, g, m, b, true);
    }
  }, le = (l, f, d, _, g) => {
    if (f !== d) {
      if (f !== Y) for (const m in f) !vt(m) && !(m in d) && i(l, m, f[m], null, g, _);
      for (const m in d) {
        if (vt(m)) continue;
        const b = d[m], y = f[m];
        b !== y && m !== "value" && i(l, m, y, b, g, _);
      }
      "value" in d && i(l, "value", f.value, d.value, g);
    }
  }, ke = (l, f, d, _, g, m, b, y, v) => {
    const x = f.el = l ? l.el : c(""), E = f.anchor = l ? l.anchor : c("");
    let { patchFlag: w, dynamicChildren: T, slotScopeIds: P } = f;
    P && (y = y ? y.concat(P) : P), l == null ? (n(x, d, _), n(E, d, _), ae(f.children || [], d, E, g, m, b, y, v)) : w > 0 && w & 64 && T && l.dynamicChildren ? (_e(l.dynamicChildren, T, d, g, m, b, y), (f.key != null || g && f === g.subTree) && fr(l, f, true)) : B(l, f, d, E, g, m, b, y, v);
  }, et = (l, f, d, _, g, m, b, y, v) => {
    f.slotScopeIds = y, l == null ? f.shapeFlag & 512 ? g.ctx.activate(f, d, _, b, v) : ut(f, d, _, g, m, b, v) : at(l, f, v);
  }, ut = (l, f, d, _, g, m, b) => {
    const y = l.component = xo(l, _, g);
    if (Jn(l) && (y.ctx.renderer = V), yo(y, false, b), y.asyncDep) {
      if (g && g.registerDep(y, Z, b), !l.el) {
        const v = y.subTree = Ke(lt);
        F(null, v, f, d), l.placeholder = v.el;
      }
    } else Z(y, l, f, d, g, m, b);
  }, at = (l, f, d) => {
    const _ = f.component = l.component;
    if (oo(l, f, d)) if (_.asyncDep && !_.asyncResolved) {
      z(_, f, d);
      return;
    } else _.next = f, _.update();
    else f.el = l.el, _.vnode = f;
  }, Z = (l, f, d, _, g, m, b) => {
    const y = () => {
      if (l.isMounted) {
        let { next: w, bu: T, u: P, parent: D, vnode: q } = l;
        {
          const Ce = ur(l);
          if (Ce) {
            w && (w.el = q.el, z(l, w, b)), Ce.asyncDep.then(() => {
              l.isUnmounted || y();
            });
            return;
          }
        }
        let K = w, ce;
        ze(l, false), w ? (w.el = q.el, z(l, w, b)) : w = q, T && ss(T), (ce = w.props && w.props.onVnodeBeforeUpdate) && Ee(ce, D, w, q), ze(l, true);
        const fe = on(l), we = l.subTree;
        l.subTree = fe, A(we, fe, p(we.el), tt(we), l, g, m), w.el = fe.el, K === null && lo(l, fe.el), P && ge(P, g), (ce = w.props && w.props.onVnodeUpdated) && ge(() => Ee(ce, D, w, q), g);
      } else {
        let w;
        const { el: T, props: P } = f, { bm: D, m: q, parent: K, root: ce, type: fe } = l, we = St(f);
        ze(l, false), D && ss(D), !we && (w = P && P.onVnodeBeforeMount) && Ee(w, K, f), ze(l, true);
        {
          ce.ce && ce.ce._def.shadowRoot !== false && ce.ce._injectChildStyle(fe);
          const Ce = l.subTree = on(l);
          A(null, Ce, d, _, l, g, m), f.el = Ce.el;
        }
        if (q && ge(q, g), !we && (w = P && P.onVnodeMounted)) {
          const Ce = f;
          ge(() => Ee(w, K, Ce), g);
        }
        (f.shapeFlag & 256 || K && St(K.vnode) && K.vnode.shapeFlag & 256) && l.a && ge(l.a, g), l.isMounted = true, f = d = _ = null;
      }
    };
    l.scope.on();
    const v = l.effect = new Tn(y);
    l.scope.off();
    const x = l.update = v.run.bind(v), E = l.job = v.runIfDirty.bind(v);
    E.i = l, E.id = l.uid, v.scheduler = () => $s(E), ze(l, true), x();
  }, z = (l, f, d) => {
    f.component = l;
    const _ = l.vnode.props;
    l.vnode = f, l.next = null, Wi(l, f.props, _, d), zi(l, f.children, d), Le(), Qs(l), He();
  }, B = (l, f, d, _, g, m, b, y, v = false) => {
    const x = l && l.children, E = l ? l.shapeFlag : 0, w = f.children, { patchFlag: T, shapeFlag: P } = f;
    if (T > 0) {
      if (T & 128) {
        je(x, w, d, _, g, m, b, y, v);
        return;
      } else if (T & 256) {
        xe(x, w, d, _, g, m, b, y, v);
        return;
      }
    }
    P & 8 ? (E & 16 && Ge(x, g, m), w !== x && a(d, w)) : E & 16 ? P & 16 ? je(x, w, d, _, g, m, b, y, v) : Ge(x, g, m, true) : (E & 8 && a(d, ""), P & 16 && ae(w, d, _, g, m, b, y, v));
  }, xe = (l, f, d, _, g, m, b, y, v) => {
    l = l || rt, f = f || rt;
    const x = l.length, E = f.length, w = Math.min(x, E);
    let T;
    for (T = 0; T < w; T++) {
      const P = f[T] = v ? Ue(f[T]) : Oe(f[T]);
      A(l[T], P, d, null, g, m, b, y, v);
    }
    x > E ? Ge(l, g, m, true, false, w) : ae(f, d, _, g, m, b, y, v, w);
  }, je = (l, f, d, _, g, m, b, y, v) => {
    let x = 0;
    const E = f.length;
    let w = l.length - 1, T = E - 1;
    for (; x <= w && x <= T; ) {
      const P = l[x], D = f[x] = v ? Ue(f[x]) : Oe(f[x]);
      if (mt(P, D)) A(P, D, d, null, g, m, b, y, v);
      else break;
      x++;
    }
    for (; x <= w && x <= T; ) {
      const P = l[w], D = f[T] = v ? Ue(f[T]) : Oe(f[T]);
      if (mt(P, D)) A(P, D, d, null, g, m, b, y, v);
      else break;
      w--, T--;
    }
    if (x > w) {
      if (x <= T) {
        const P = T + 1, D = P < E ? f[P].el : _;
        for (; x <= T; ) A(null, f[x] = v ? Ue(f[x]) : Oe(f[x]), d, D, g, m, b, y, v), x++;
      }
    } else if (x > T) for (; x <= w; ) de(l[x], g, m, true), x++;
    else {
      const P = x, D = x, q = /* @__PURE__ */ new Map();
      for (x = D; x <= T; x++) {
        const pe = f[x] = v ? Ue(f[x]) : Oe(f[x]);
        pe.key != null && q.set(pe.key, x);
      }
      let K, ce = 0;
      const fe = T - D + 1;
      let we = false, Ce = 0;
      const pt = new Array(fe);
      for (x = 0; x < fe; x++) pt[x] = 0;
      for (x = P; x <= w; x++) {
        const pe = l[x];
        if (ce >= fe) {
          de(pe, g, m, true);
          continue;
        }
        let Se;
        if (pe.key != null) Se = q.get(pe.key);
        else for (K = D; K <= T; K++) if (pt[K - D] === 0 && mt(pe, f[K])) {
          Se = K;
          break;
        }
        Se === void 0 ? de(pe, g, m, true) : (pt[Se - D] = x + 1, Se >= Ce ? Ce = Se : we = true, A(pe, f[Se], d, null, g, m, b, y, v), ce++);
      }
      const Gs = we ? Qi(pt) : rt;
      for (K = Gs.length - 1, x = fe - 1; x >= 0; x--) {
        const pe = D + x, Se = f[pe], Ys = f[pe + 1], zs = pe + 1 < E ? Ys.el || Ys.placeholder : _;
        pt[x] === 0 ? A(null, Se, d, zs, g, m, b, y, v) : we && (K < 0 || x !== Gs[K] ? be(Se, d, zs, 2) : K--);
      }
    }
  }, be = (l, f, d, _, g = null) => {
    const { el: m, type: b, transition: y, children: v, shapeFlag: x } = l;
    if (x & 6) {
      be(l.component.subTree, f, d, _);
      return;
    }
    if (x & 128) {
      l.suspense.move(f, d, _);
      return;
    }
    if (x & 64) {
      b.move(l, f, d, V);
      return;
    }
    if (b === Fe) {
      n(m, f, d);
      for (let w = 0; w < v.length; w++) be(v[w], f, d, _);
      n(l.anchor, f, d);
      return;
    }
    if (b === fs) {
      U(l, f, d);
      return;
    }
    if (_ !== 2 && x & 1 && y) if (_ === 0) y.beforeEnter(m), n(m, f, d), ge(() => y.enter(m), g);
    else {
      const { leave: w, delayLeave: T, afterLeave: P } = y, D = () => {
        l.ctx.isUnmounted ? r(m) : n(m, f, d);
      }, q = () => {
        w(m, () => {
          D(), P && P();
        });
      };
      T ? T(m, D, q) : q();
    }
    else n(m, f, d);
  }, de = (l, f, d, _ = false, g = false) => {
    const { type: m, props: b, ref: y, children: v, dynamicChildren: x, shapeFlag: E, patchFlag: w, dirs: T, cacheIndex: P } = l;
    if (w === -2 && (g = false), y != null && (Le(), Ct(y, null, d, l, true), He()), P != null && (f.renderCache[P] = void 0), E & 256) {
      f.ctx.deactivate(l);
      return;
    }
    const D = E & 1 && T, q = !St(l);
    let K;
    if (q && (K = b && b.onVnodeBeforeUnmount) && Ee(K, f, l), E & 6) Lt(l.component, d, _);
    else {
      if (E & 128) {
        l.suspense.unmount(d, _);
        return;
      }
      D && Ye(l, null, f, "beforeUnmount"), E & 64 ? l.type.remove(l, f, d, V, _) : x && !x.hasOnce && (m !== Fe || w > 0 && w & 64) ? Ge(x, f, d, false, true) : (m === Fe && w & 384 || !g && E & 16) && Ge(v, f, d), _ && dt(l);
    }
    (q && (K = b && b.onVnodeUnmounted) || D) && ge(() => {
      K && Ee(K, f, l), D && Ye(l, null, f, "unmounted");
    }, d);
  }, dt = (l) => {
    const { type: f, el: d, anchor: _, transition: g } = l;
    if (f === Fe) {
      Dt(d, _);
      return;
    }
    if (f === fs) {
      O(l);
      return;
    }
    const m = () => {
      r(d), g && !g.persisted && g.afterLeave && g.afterLeave();
    };
    if (l.shapeFlag & 1 && g && !g.persisted) {
      const { leave: b, delayLeave: y } = g, v = () => b(d, m);
      y ? y(l.el, m, v) : v();
    } else m();
  }, Dt = (l, f) => {
    let d;
    for (; l !== f; ) d = C(l), r(l), l = d;
    r(f);
  }, Lt = (l, f, d) => {
    const { bum: _, scope: g, job: m, subTree: b, um: y, m: v, a: x, parent: E, slots: { __: w } } = l;
    rn(v), rn(x), _ && ss(_), E && M(w) && w.forEach((T) => {
      E.renderCache[T] = void 0;
    }), g.stop(), m && (m.flags |= 8, de(b, l, f, d)), y && ge(y, f), ge(() => {
      l.isUnmounted = true;
    }, f), f && f.pendingBranch && !f.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
  }, Ge = (l, f, d, _ = false, g = false, m = 0) => {
    for (let b = m; b < l.length; b++) de(l[b], f, d, _, g);
  }, tt = (l) => {
    if (l.shapeFlag & 6) return tt(l.component.subTree);
    if (l.shapeFlag & 128) return l.suspense.next();
    const f = C(l.anchor || l.el), d = f && f[yi];
    return d ? C(d) : f;
  };
  let ht = false;
  const N = (l, f, d) => {
    l == null ? f._vnode && de(f._vnode, null, null, true) : A(f._vnode || null, l, f, null, null, null, d), f._vnode = l, ht || (ht = true, Qs(), Wn(), ht = false);
  }, V = { p: A, um: de, m: be, r: dt, mt: ut, mc: ae, pc: B, pbc: _e, n: tt, o: e };
  return { render: N, hydrate: void 0, createApp: Bi(N) };
}
function ls({ type: e, props: t }, s) {
  return s === "svg" && e === "foreignObject" || s === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : s;
}
function ze({ effect: e, job: t }, s) {
  s ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Zi(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function fr(e, t, s = false) {
  const n = e.children, r = t.children;
  if (M(n) && M(r)) for (let i = 0; i < n.length; i++) {
    const o = n[i];
    let c = r[i];
    c.shapeFlag & 1 && !c.dynamicChildren && ((c.patchFlag <= 0 || c.patchFlag === 32) && (c = r[i] = Ue(r[i]), c.el = o.el), !s && c.patchFlag !== -2 && fr(o, c)), c.type === es && (c.el = o.el), c.type === lt && !c.el && (c.el = o.el);
  }
}
function Qi(e) {
  const t = e.slice(), s = [0];
  let n, r, i, o, c;
  const u = e.length;
  for (n = 0; n < u; n++) {
    const h = e[n];
    if (h !== 0) {
      if (r = s[s.length - 1], e[r] < h) {
        t[n] = r, s.push(n);
        continue;
      }
      for (i = 0, o = s.length - 1; i < o; ) c = i + o >> 1, e[s[c]] < h ? i = c + 1 : o = c;
      h < e[s[i]] && (i > 0 && (t[n] = s[i - 1]), s[i] = n);
    }
  }
  for (i = s.length, o = s[i - 1]; i-- > 0; ) s[i] = o, o = t[o];
  return s;
}
function ur(e) {
  const t = e.subTree.component;
  if (t) return t.asyncDep && !t.asyncResolved ? t : ur(t);
}
function rn(e) {
  if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
const ki = Symbol.for("v-scx"), eo = () => $t(ki);
function cs(e, t, s) {
  return ar(e, t, s);
}
function ar(e, t, s = Y) {
  const { immediate: n, deep: r, flush: i, once: o } = s, c = se({}, s), u = t && n || !t && i !== "post";
  let h;
  if (Rt) {
    if (i === "sync") {
      const S = eo();
      h = S.__watcherHandles || (S.__watcherHandles = []);
    } else if (!u) {
      const S = () => {
      };
      return S.stop = Ae, S.resume = Ae, S.pause = Ae, S;
    }
  }
  const a = oe;
  c.call = (S, R, A) => Me(S, a, R, A);
  let p = false;
  i === "post" ? c.scheduler = (S) => {
    ge(S, a && a.suspense);
  } : i !== "sync" && (p = true, c.scheduler = (S, R) => {
    R ? S() : $s(S);
  }), c.augmentJob = (S) => {
    t && (S.flags |= 4), p && (S.flags |= 2, a && (S.id = a.uid, S.i = a));
  };
  const C = pi(e, t, c);
  return Rt && (h ? h.push(C) : u && C()), C;
}
function to(e, t, s) {
  const n = this.proxy, r = Q(e) ? e.includes(".") ? dr(n, e) : () => n[e] : e.bind(n, n);
  let i;
  I(t) ? i = t : (i = t.handler, s = t);
  const o = Ft(this), c = ar(r, i.bind(n), s);
  return o(), c;
}
function dr(e, t) {
  const s = t.split(".");
  return () => {
    let n = e;
    for (let r = 0; r < s.length && n; r++) n = n[s[r]];
    return n;
  };
}
const so = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${We(t)}Modifiers`] || e[`${Qe(t)}Modifiers`];
function no(e, t, ...s) {
  if (e.isUnmounted) return;
  const n = e.vnode.props || Y;
  let r = s;
  const i = t.startsWith("update:"), o = i && so(n, t.slice(7));
  o && (o.trim && (r = s.map((a) => Q(a) ? a.trim() : a)), o.number && (r = s.map(Rr)));
  let c, u = n[c = ts(t)] || n[c = ts(We(t))];
  !u && i && (u = n[c = ts(Qe(t))]), u && Me(u, e, 6, r);
  const h = n[c + "Once"];
  if (h) {
    if (!e.emitted) e.emitted = {};
    else if (e.emitted[c]) return;
    e.emitted[c] = true, Me(h, e, 6, r);
  }
}
function hr(e, t, s = false) {
  const n = t.emitsCache, r = n.get(e);
  if (r !== void 0) return r;
  const i = e.emits;
  let o = {}, c = false;
  if (!I(e)) {
    const u = (h) => {
      const a = hr(h, t, true);
      a && (c = true, se(o, a));
    };
    !s && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
  }
  return !i && !c ? (X(e) && n.set(e, null), null) : (M(i) ? i.forEach((u) => o[u] = null) : se(o, i), X(e) && n.set(e, o), o);
}
function kt(e, t) {
  return !e || !Yt(t) ? false : (t = t.slice(2).replace(/Once$/, ""), $(e, t[0].toLowerCase() + t.slice(1)) || $(e, Qe(t)) || $(e, t));
}
function on(e) {
  const { type: t, vnode: s, proxy: n, withProxy: r, propsOptions: [i], slots: o, attrs: c, emit: u, render: h, renderCache: a, props: p, data: C, setupState: S, ctx: R, inheritAttrs: A } = e, L = Wt(e);
  let F, H;
  try {
    if (s.shapeFlag & 4) {
      const O = r || n, W = O;
      F = Oe(h.call(W, O, a, p, S, C, R)), H = c;
    } else {
      const O = t;
      F = Oe(O.length > 1 ? O(p, { attrs: c, slots: o, emit: u }) : O(p, null)), H = t.props ? c : ro(c);
    }
  } catch (O) {
    Tt.length = 0, Zt(O, e, 1), F = Ke(lt);
  }
  let U = F;
  if (H && A !== false) {
    const O = Object.keys(H), { shapeFlag: W } = U;
    O.length && W & 7 && (i && O.some(Es) && (H = io(H, i)), U = ct(U, H, false, true));
  }
  return s.dirs && (U = ct(U, null, false, true), U.dirs = U.dirs ? U.dirs.concat(s.dirs) : s.dirs), s.transition && Us(U, s.transition), F = U, Wt(L), F;
}
const ro = (e) => {
  let t;
  for (const s in e) (s === "class" || s === "style" || Yt(s)) && ((t || (t = {}))[s] = e[s]);
  return t;
}, io = (e, t) => {
  const s = {};
  for (const n in e) (!Es(n) || !(n.slice(9) in t)) && (s[n] = e[n]);
  return s;
};
function oo(e, t, s) {
  const { props: n, children: r, component: i } = e, { props: o, children: c, patchFlag: u } = t, h = i.emitsOptions;
  if (t.dirs || t.transition) return true;
  if (s && u >= 0) {
    if (u & 1024) return true;
    if (u & 16) return n ? ln(n, o, h) : !!o;
    if (u & 8) {
      const a = t.dynamicProps;
      for (let p = 0; p < a.length; p++) {
        const C = a[p];
        if (o[C] !== n[C] && !kt(h, C)) return true;
      }
    }
  } else return (r || c) && (!c || !c.$stable) ? true : n === o ? false : n ? o ? ln(n, o, h) : true : !!o;
  return false;
}
function ln(e, t, s) {
  const n = Object.keys(t);
  if (n.length !== Object.keys(e).length) return true;
  for (let r = 0; r < n.length; r++) {
    const i = n[r];
    if (t[i] !== e[i] && !kt(s, i)) return true;
  }
  return false;
}
function lo({ vnode: e, parent: t }, s) {
  for (; t; ) {
    const n = t.subTree;
    if (n.suspense && n.suspense.activeBranch === e && (n.el = e.el), n === e) (e = t.vnode).el = s, t = t.parent;
    else break;
  }
}
const pr = (e) => e.__isSuspense;
function co(e, t) {
  t && t.pendingBranch ? M(e) ? t.effects.push(...e) : t.effects.push(e) : xi(e);
}
const Fe = Symbol.for("v-fgt"), es = Symbol.for("v-txt"), lt = Symbol.for("v-cmt"), fs = Symbol.for("v-stc"), Tt = [];
let me = null;
function gr(e = false) {
  Tt.push(me = e ? null : []);
}
function fo() {
  Tt.pop(), me = Tt[Tt.length - 1] || null;
}
let Mt = 1;
function cn(e, t = false) {
  Mt += e, e < 0 && me && t && (me.hasOnce = true);
}
function uo(e) {
  return e.dynamicChildren = Mt > 0 ? me || rt : null, fo(), Mt > 0 && me && me.push(e), e;
}
function mr(e, t, s, n, r, i) {
  return uo(vr(e, t, s, n, r, i, true));
}
function _r(e) {
  return e ? e.__v_isVNode === true : false;
}
function mt(e, t) {
  return e.type === t.type && e.key === t.key;
}
const xr = ({ key: e }) => e ?? null, Ut = ({ ref: e, ref_key: t, ref_for: s }) => (typeof e == "number" && (e = "" + e), e != null ? Q(e) || te(e) || I(e) ? { i: Pe, r: e, k: t, f: !!s } : e : null);
function vr(e, t = null, s = null, n = 0, r = null, i = e === Fe ? 0 : 1, o = false, c = false) {
  const u = { __v_isVNode: true, __v_skip: true, type: e, props: t, key: t && xr(t), ref: t && Ut(t), scopeId: Gn, slotScopeIds: null, children: s, component: null, suspense: null, ssContent: null, ssFallback: null, dirs: null, transition: null, el: null, anchor: null, target: null, targetStart: null, targetAnchor: null, staticCount: 0, shapeFlag: i, patchFlag: n, dynamicProps: r, dynamicChildren: null, appContext: null, ctx: Pe };
  return c ? (Ws(u, s), i & 128 && e.normalize(u)) : s && (u.shapeFlag |= Q(s) ? 8 : 16), Mt > 0 && !o && me && (u.patchFlag > 0 || i & 6) && u.patchFlag !== 32 && me.push(u), u;
}
const Ke = ao;
function ao(e, t = null, s = null, n = 0, r = null, i = false) {
  if ((!e || e === Fi) && (e = lt), _r(e)) {
    const c = ct(e, t, true);
    return s && Ws(c, s), Mt > 0 && !i && me && (c.shapeFlag & 6 ? me[me.indexOf(e)] = c : me.push(c)), c.patchFlag = -2, c;
  }
  if (So(e) && (e = e.__vccOpts), t) {
    t = ho(t);
    let { class: c, style: u } = t;
    c && !Q(c) && (t.class = As(c)), X(u) && (js(u) && !M(u) && (u = se({}, u)), t.style = Ps(u));
  }
  const o = Q(e) ? 1 : pr(e) ? 128 : bi(e) ? 64 : X(e) ? 4 : I(e) ? 2 : 0;
  return vr(e, t, s, n, r, o, i, true);
}
function ho(e) {
  return e ? js(e) || nr(e) ? se({}, e) : e : null;
}
function ct(e, t, s = false, n = false) {
  const { props: r, ref: i, patchFlag: o, children: c, transition: u } = e, h = t ? go(r || {}, t) : r, a = { __v_isVNode: true, __v_skip: true, type: e.type, props: h, key: h && xr(h), ref: t && t.ref ? s && i ? M(i) ? i.concat(Ut(t)) : [i, Ut(t)] : Ut(t) : i, scopeId: e.scopeId, slotScopeIds: e.slotScopeIds, children: c, target: e.target, targetStart: e.targetStart, targetAnchor: e.targetAnchor, staticCount: e.staticCount, shapeFlag: e.shapeFlag, patchFlag: t && e.type !== Fe ? o === -1 ? 16 : o | 16 : o, dynamicProps: e.dynamicProps, dynamicChildren: e.dynamicChildren, appContext: e.appContext, dirs: e.dirs, transition: u, component: e.component, suspense: e.suspense, ssContent: e.ssContent && ct(e.ssContent), ssFallback: e.ssFallback && ct(e.ssFallback), placeholder: e.placeholder, el: e.el, anchor: e.anchor, ctx: e.ctx, ce: e.ce };
  return u && n && Us(a, u.clone(a)), a;
}
function po(e = " ", t = 0) {
  return Ke(es, null, e, t);
}
function Oe(e) {
  return e == null || typeof e == "boolean" ? Ke(lt) : M(e) ? Ke(Fe, null, e.slice()) : _r(e) ? Ue(e) : Ke(es, null, String(e));
}
function Ue(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : ct(e);
}
function Ws(e, t) {
  let s = 0;
  const { shapeFlag: n } = e;
  if (t == null) t = null;
  else if (M(t)) s = 16;
  else if (typeof t == "object") if (n & 65) {
    const r = t.default;
    r && (r._c && (r._d = false), Ws(e, r()), r._c && (r._d = true));
    return;
  } else {
    s = 32;
    const r = t._;
    !r && !nr(t) ? t._ctx = Pe : r === 3 && Pe && (Pe.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
  }
  else I(t) ? (t = { default: t, _ctx: Pe }, s = 32) : (t = String(t), n & 64 ? (s = 16, t = [po(t)]) : s = 8);
  e.children = t, e.shapeFlag |= s;
}
function go(...e) {
  const t = {};
  for (let s = 0; s < e.length; s++) {
    const n = e[s];
    for (const r in n) if (r === "class") t.class !== n.class && (t.class = As([t.class, n.class]));
    else if (r === "style") t.style = Ps([t.style, n.style]);
    else if (Yt(r)) {
      const i = t[r], o = n[r];
      o && i !== o && !(M(i) && i.includes(o)) && (t[r] = i ? [].concat(i, o) : o);
    } else r !== "" && (t[r] = n[r]);
  }
  return t;
}
function Ee(e, t, s, n = null) {
  Me(e, t, 7, [s, n]);
}
const mo = er();
let _o = 0;
function xo(e, t, s) {
  const n = e.type, r = (t ? t.appContext : e.appContext) || mo, i = { uid: _o++, vnode: e, type: n, parent: t, appContext: r, root: null, next: null, subTree: null, effect: null, update: null, job: null, scope: new jr(true), render: null, proxy: null, exposed: null, exposeProxy: null, withProxy: null, provides: t ? t.provides : Object.create(r.provides), ids: t ? t.ids : ["", 0, 0], accessCache: null, renderCache: [], components: null, directives: null, propsOptions: ir(n, r), emitsOptions: hr(n, r), emit: null, emitted: null, propsDefaults: Y, inheritAttrs: n.inheritAttrs, ctx: Y, data: Y, props: Y, attrs: Y, slots: Y, refs: Y, setupState: Y, setupContext: null, suspense: s, suspenseId: s ? s.pendingId : 0, asyncDep: null, asyncResolved: false, isMounted: false, isUnmounted: false, isDeactivated: false, bc: null, c: null, bm: null, m: null, bu: null, u: null, um: null, bum: null, da: null, a: null, rtg: null, rtc: null, ec: null, sp: null };
  return i.ctx = { _: i }, i.root = t ? t.root : i, i.emit = no.bind(null, i), e.ce && e.ce(i), i;
}
let oe = null;
const vo = () => oe || Pe;
let Gt, ws;
{
  const e = Xt(), t = (s, n) => {
    let r;
    return (r = e[s]) || (r = e[s] = []), r.push(n), (i) => {
      r.length > 1 ? r.forEach((o) => o(i)) : r[0](i);
    };
  };
  Gt = t("__VUE_INSTANCE_SETTERS__", (s) => oe = s), ws = t("__VUE_SSR_SETTERS__", (s) => Rt = s);
}
const Ft = (e) => {
  const t = oe;
  return Gt(e), e.scope.on(), () => {
    e.scope.off(), Gt(t);
  };
}, fn = () => {
  oe && oe.scope.off(), Gt(null);
};
function yr(e) {
  return e.vnode.shapeFlag & 4;
}
let Rt = false;
function yo(e, t = false, s = false) {
  t && ws(t);
  const { props: n, children: r } = e.vnode, i = yr(e);
  Ki(e, n, i, t), Yi(e, r, s || t);
  const o = i ? bo(e, t) : void 0;
  return t && ws(false), o;
}
function bo(e, t) {
  const s = e.type;
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Di);
  const { setup: n } = s;
  if (n) {
    Le();
    const r = e.setupContext = n.length > 1 ? Co(e) : null, i = Ft(e), o = It(n, e, 0, [e.props, r]), c = Cn(o);
    if (He(), i(), (c || e.sp) && !St(e) && zn(e), c) {
      if (o.then(fn, fn), t) return o.then((u) => {
        un(e, u);
      }).catch((u) => {
        Zt(u, e, 0);
      });
      e.asyncDep = o;
    } else un(e, o);
  } else br(e);
}
function un(e, t, s) {
  I(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : X(t) && (e.setupState = Bn(t)), br(e);
}
function br(e, t, s) {
  const n = e.type;
  e.render || (e.render = n.render || Ae);
  {
    const r = Ft(e);
    Le();
    try {
      Li(e);
    } finally {
      He(), r();
    }
  }
}
const wo = { get(e, t) {
  return ee(e, "get", ""), e[t];
} };
function Co(e) {
  const t = (s) => {
    e.exposed = s || {};
  };
  return { attrs: new Proxy(e.attrs, wo), slots: e.slots, emit: e.emit, expose: t };
}
function qs(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Bn(ii(e.exposed)), { get(t, s) {
    if (s in t) return t[s];
    if (s in Et) return Et[s](e);
  }, has(t, s) {
    return s in t || s in Et;
  } })) : e.proxy;
}
function So(e) {
  return I(e) && "__vccOpts" in e;
}
const Eo = (e, t) => di(e, t, Rt), To = "3.5.18";
/**
* @vue/runtime-dom v3.5.18
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
let Cs;
const an = typeof window < "u" && window.trustedTypes;
if (an) try {
  Cs = an.createPolicy("vue", { createHTML: (e) => e });
} catch {
}
const wr = Cs ? (e) => Cs.createHTML(e) : (e) => e, Oo = "http://www.w3.org/2000/svg", Po = "http://www.w3.org/1998/Math/MathML", Ie = typeof document < "u" ? document : null, dn = Ie && Ie.createElement("template"), Ao = { insert: (e, t, s) => {
  t.insertBefore(e, s || null);
}, remove: (e) => {
  const t = e.parentNode;
  t && t.removeChild(e);
}, createElement: (e, t, s, n) => {
  const r = t === "svg" ? Ie.createElementNS(Oo, e) : t === "mathml" ? Ie.createElementNS(Po, e) : s ? Ie.createElement(e, { is: s }) : Ie.createElement(e);
  return e === "select" && n && n.multiple != null && r.setAttribute("multiple", n.multiple), r;
}, createText: (e) => Ie.createTextNode(e), createComment: (e) => Ie.createComment(e), setText: (e, t) => {
  e.nodeValue = t;
}, setElementText: (e, t) => {
  e.textContent = t;
}, parentNode: (e) => e.parentNode, nextSibling: (e) => e.nextSibling, querySelector: (e) => Ie.querySelector(e), setScopeId(e, t) {
  e.setAttribute(t, "");
}, insertStaticContent(e, t, s, n, r, i) {
  const o = s ? s.previousSibling : t.lastChild;
  if (r && (r === i || r.nextSibling)) for (; t.insertBefore(r.cloneNode(true), s), !(r === i || !(r = r.nextSibling)); ) ;
  else {
    dn.innerHTML = wr(n === "svg" ? `<svg>${e}</svg>` : n === "mathml" ? `<math>${e}</math>` : e);
    const c = dn.content;
    if (n === "svg" || n === "mathml") {
      const u = c.firstChild;
      for (; u.firstChild; ) c.appendChild(u.firstChild);
      c.removeChild(u);
    }
    t.insertBefore(c, s);
  }
  return [o ? o.nextSibling : t.firstChild, s ? s.previousSibling : t.lastChild];
} }, Mo = Symbol("_vtc");
function Ro(e, t, s) {
  const n = e[Mo];
  n && (t = (t ? [t, ...n] : [...n]).join(" ")), t == null ? e.removeAttribute("class") : s ? e.setAttribute("class", t) : e.className = t;
}
const hn = Symbol("_vod"), Io = Symbol("_vsh"), Fo = Symbol(""), Do = /(^|;)\s*display\s*:/;
function Lo(e, t, s) {
  const n = e.style, r = Q(s);
  let i = false;
  if (s && !r) {
    if (t) if (Q(t)) for (const o of t.split(";")) {
      const c = o.slice(0, o.indexOf(":")).trim();
      s[c] == null && Bt(n, c, "");
    }
    else for (const o in t) s[o] == null && Bt(n, o, "");
    for (const o in s) o === "display" && (i = true), Bt(n, o, s[o]);
  } else if (r) {
    if (t !== s) {
      const o = n[Fo];
      o && (s += ";" + o), n.cssText = s, i = Do.test(s);
    }
  } else t && e.removeAttribute("style");
  hn in e && (e[hn] = i ? n.display : "", e[Io] && (n.display = "none"));
}
const pn = /\s*!important$/;
function Bt(e, t, s) {
  if (M(s)) s.forEach((n) => Bt(e, t, n));
  else if (s == null && (s = ""), t.startsWith("--")) e.setProperty(t, s);
  else {
    const n = Ho(e, t);
    pn.test(s) ? e.setProperty(Qe(n), s.replace(pn, ""), "important") : e[n] = s;
  }
}
const gn = ["Webkit", "Moz", "ms"], us = {};
function Ho(e, t) {
  const s = us[t];
  if (s) return s;
  let n = We(t);
  if (n !== "filter" && n in e) return us[t] = n;
  n = Sn(n);
  for (let r = 0; r < gn.length; r++) {
    const i = gn[r] + n;
    if (i in e) return us[t] = i;
  }
  return t;
}
const mn = "http://www.w3.org/1999/xlink";
function _n(e, t, s, n, r, i = Nr(t)) {
  n && t.startsWith("xlink:") ? s == null ? e.removeAttributeNS(mn, t.slice(6, t.length)) : e.setAttributeNS(mn, t, s) : s == null || i && !En(s) ? e.removeAttribute(t) : e.setAttribute(t, i ? "" : ft(s) ? String(s) : s);
}
function xn(e, t, s, n, r) {
  if (t === "innerHTML" || t === "textContent") {
    s != null && (e[t] = t === "innerHTML" ? wr(s) : s);
    return;
  }
  const i = e.tagName;
  if (t === "value" && i !== "PROGRESS" && !i.includes("-")) {
    const c = i === "OPTION" ? e.getAttribute("value") || "" : e.value, u = s == null ? e.type === "checkbox" ? "on" : "" : String(s);
    (c !== u || !("_value" in e)) && (e.value = u), s == null && e.removeAttribute(t), e._value = s;
    return;
  }
  let o = false;
  if (s === "" || s == null) {
    const c = typeof e[t];
    c === "boolean" ? s = En(s) : s == null && c === "string" ? (s = "", o = true) : c === "number" && (s = 0, o = true);
  }
  try {
    e[t] = s;
  } catch {
  }
  o && e.removeAttribute(r || t);
}
function No(e, t, s, n) {
  e.addEventListener(t, s, n);
}
function jo(e, t, s, n) {
  e.removeEventListener(t, s, n);
}
const vn = Symbol("_vei");
function $o(e, t, s, n, r = null) {
  const i = e[vn] || (e[vn] = {}), o = i[t];
  if (n && o) o.value = n;
  else {
    const [c, u] = Uo(t);
    if (n) {
      const h = i[t] = Ko(n, r);
      No(e, c, h, u);
    } else o && (jo(e, c, o, u), i[t] = void 0);
  }
}
const yn = /(?:Once|Passive|Capture)$/;
function Uo(e) {
  let t;
  if (yn.test(e)) {
    t = {};
    let n;
    for (; n = e.match(yn); ) e = e.slice(0, e.length - n[0].length), t[n[0].toLowerCase()] = true;
  }
  return [e[2] === ":" ? e.slice(3) : Qe(e.slice(2)), t];
}
let as = 0;
const Bo = Promise.resolve(), Vo = () => as || (Bo.then(() => as = 0), as = Date.now());
function Ko(e, t) {
  const s = (n) => {
    if (!n._vts) n._vts = Date.now();
    else if (n._vts <= s.attached) return;
    Me(Wo(n, s.value), t, 5, [n]);
  };
  return s.value = e, s.attached = Vo(), s;
}
function Wo(e, t) {
  if (M(t)) {
    const s = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      s.call(e), e._stopped = true;
    }, t.map((n) => (r) => !r._stopped && n && n(r));
  } else return t;
}
const bn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, qo = (e, t, s, n, r, i) => {
  const o = r === "svg";
  t === "class" ? Ro(e, n, o) : t === "style" ? Lo(e, s, n) : Yt(t) ? Es(t) || $o(e, t, s, n, i) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Go(e, t, n, o)) ? (xn(e, t, n), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && _n(e, t, n, o, i, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !Q(n)) ? xn(e, We(t), n, i, t) : (t === "true-value" ? e._trueValue = n : t === "false-value" && (e._falseValue = n), _n(e, t, n, o));
};
function Go(e, t, s, n) {
  if (n) return !!(t === "innerHTML" || t === "textContent" || t in e && bn(t) && I(s));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
  if (t === "width" || t === "height") {
    const r = e.tagName;
    if (r === "IMG" || r === "VIDEO" || r === "CANVAS" || r === "SOURCE") return false;
  }
  return bn(t) && Q(s) ? false : t in e;
}
const Yo = se({ patchProp: qo }, Ao);
let wn;
function zo() {
  return wn || (wn = Ji(Yo));
}
const Jo = (...e) => {
  const t = zo().createApp(...e), { mount: s } = t;
  return t.mount = (n) => {
    const r = Zo(n);
    if (!r) return;
    const i = t._component;
    !I(i) && !i.render && !i.template && (i.template = r.innerHTML), r.nodeType === 1 && (r.textContent = "");
    const o = s(r, false, Xo(r));
    return r instanceof Element && (r.removeAttribute("v-cloak"), r.setAttribute("data-v-app", "")), o;
  }, t;
};
function Xo(e) {
  if (e instanceof SVGElement) return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
}
function Zo(e) {
  return Q(e) ? document.querySelector(e) : e;
}
const Qo = 1, ko = 128, el = /* @__PURE__ */ Yn({ __name: "WebGpuSurface", setup(e) {
  const t = oi(null);
  function s(r, i, o, c, u, h, a, p, C, S) {
    const R = `
    struct Uniforms {
      cx: f32,
      cy: f32,
      scale: f32,
      aspect: f32,
      antialiasLevel: i32,
      angle: f32,
      palettePeriod: f32,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

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

    fn palette(v: f32, dx: f32, dy: f32) -> vec3<f32> {
      let t = abs(v * 2.0 - 1.0);
      let r = 0.5 + 0.5 * cos(1.0 + t * 6.28 - dx / 2.0);
      let g = 0.5 + 0.5 * sin(2.0 + t * 5.88 - dy / 4.0);
      let b = 0.5 + 0.5 * cos(t * 3.14 + ((dx * dy) / 8.0));
      return vec3<f32>(r, g, b);
    }

    fn mandelbrot(x0: f32, y0: f32, dx: f32, dy: f32) -> vec3<f32> {
      // Calcul dynamique du nombre d'it\xE9rations optimal selon le zoom
      let max_iter_f: f32 = clamp(80.0 + 40.0 * log2(1.0 / uniforms.scale), 128.0, 4096.0);
      let max_iter: i32 = i32(max_iter_f);
      var x: f32 = 0.0;
      var y: f32 = 0.0;
      var iter: i32 = 0;
      var x2: f32 = 0.0;
      var y2: f32 = 0.0;
      while (x2 + y2 <= 1000.0 && iter < max_iter) {
        let xtemp = x*x - y*y + x0;
        y = 2.0*x*y + y0;
        x = xtemp;
        x2 = x*x;
        y2 = y*y;
        iter = iter + 1;
      }
      if (iter == max_iter) {
        return vec3<f32>(0.0, 0.0, 0.0);
      }
      // Lissage des it\xE9rations
      let log_zn = log(x2 + y2) / 2.0;
      let nu = f32(iter) + 1.0 - log(log_zn / log(2.0)) / log(2.0);
      // Palette cyclique liss\xE9e
      let period = uniforms.palettePeriod;
      let v = nu % period / period;
      return palette(v, dx, dy);
    }

    fn rotate(x: f32, y: f32, angle: f32) -> vec2<f32> {
      let s = sin(angle);
      let c = cos(angle);
      return vec2<f32>(c * x - s * y, s * x + c * y);
    }

    @fragment
    fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
      var color = vec3<f32>(0.0, 0.0, 0.0);
      let aa = uniforms.antialiasLevel;
       if (aa == 2) {
         let offsets = array<vec2<f32>, 2>(
           vec2<f32>(0.25, 0.25),
           vec2<f32>(0.75, 0.75)
         );
         for (var i = 0; i < 2; i = i + 1) {
           let uv = fragCoord + (offsets[i] - vec2<f32>(0.5, 0.5)) / f32(${c});
           var xy = rotate((uv.x * 2.0 - 1.0) * uniforms.scale * uniforms.aspect, (uv.y * 2.0 - 1.0) * uniforms.scale, uniforms.angle);
           let x0 = xy.x + uniforms.cx;
           let y0 = xy.y + uniforms.cy;
           color = color + mandelbrot(x0, y0, fragCoord.x, fragCoord.y);
         }
         color = color / 2.0;
       } else if (aa == 4) {
        let offsets = array<vec2<f32>, 4>(
          vec2<f32>(0.25, 0.25),
          vec2<f32>(0.75, 0.25),
          vec2<f32>(0.25, 0.75),
          vec2<f32>(0.75, 0.75)
        );
        for (var i = 0; i < 4; i = i + 1) {
          let uv = fragCoord + (offsets[i] - vec2<f32>(0.5, 0.5)) / f32(${c});
          var xy = rotate((uv.x * 2.0 - 1.0) * uniforms.scale * uniforms.aspect, (uv.y * 2.0 - 1.0) * uniforms.scale, uniforms.angle);
          let x0 = xy.x + uniforms.cx;
          let y0 = xy.y + uniforms.cy;
          color = color + mandelbrot(x0, y0, fragCoord.x, fragCoord.y);
        }
        color = color / 4.0;
       } else {
        var xy = rotate((fragCoord.x * 2.0 - 1.0) * uniforms.scale * uniforms.aspect, (fragCoord.y * 2.0 - 1.0) * uniforms.scale, uniforms.angle);
        let x0 = xy.x + uniforms.cx;
        let y0 = xy.y + uniforms.cy;
        color = mandelbrot(x0, y0, fragCoord.x, fragCoord.y);
      }
      return vec4<f32>(color, 1.0);
    }
  `, A = new Float32Array([h, a, p, c / u, C, S, ko]), L = i.createBuffer({ size: A.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    i.queue.writeBuffer(L, 0, A.buffer);
    const F = i.createShaderModule({ code: R }), H = i.createRenderPipeline({ layout: "auto", vertex: { module: F, entryPoint: "vs_main" }, fragment: { module: F, entryPoint: "fs_main", targets: [{ format: o }] }, primitive: { topology: "triangle-list" } }), U = i.createBindGroup({ layout: H.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: L } }] }), O = i.createCommandEncoder(), W = r.getCurrentTexture().createView(), J = O.beginRenderPass({ colorAttachments: [{ view: W, clearValue: { r: 1, g: 1, b: 1, a: 1 }, loadOp: "clear", storeOp: "store" }] });
    J.setPipeline(H), J.setBindGroup(0, U), J.draw(6, 1, 0, 0), J.end(), i.queue.submit([O.finish()]);
  }
  async function n() {
    const r = t.value;
    if (!r) return;
    if (!navigator.gpu) {
      alert("WebGPU non support\xE9 sur ce navigateur.");
      return;
    }
    const i = await navigator.gpu.requestAdapter();
    if (!i) return;
    const o = await i.requestDevice(), c = r.getContext("webgpu"), u = navigator.gpu.getPreferredCanvasFormat();
    c.configure({ device: o, format: u, alphaMode: "opaque" });
    let h = -0.7436438870371587, a = 0.13182590420531198, p = 2.5, C = false, S = 0.04, R = h, A = a, L = p, F = 0, H = 0, U = 0;
    const O = 0.05, W = 0.7;
    let J = 0, k = 0, ae = 0;
    const qe = 0.025;
    function _e(N, V) {
      const he = Math.cos(J), l = Math.sin(J), f = he * N - l * V, d = l * N + he * V;
      R += f, A += d;
    }
    const le = {};
    function ke(N) {
      le[N.key.toLowerCase()] = true;
    }
    function et(N) {
      le[N.key.toLowerCase()] = false;
    }
    function ut(N) {
      N.preventDefault(), C = true;
      const V = 0.9;
      N.deltaY < 0 ? L *= V : L /= V;
    }
    const at = [{ cx: -0.7436438870371587, cy: 0.13182590420531198 }, { cx: -1.749705768080503, cy: -613369029080495e-19 }, { cx: -0.5503295086752807, cy: -0.6259346555912755 }, { cx: -0.19569582393630502, cy: 1.1000276413181806 }];
    let Z = 0;
    function z() {
      var _a, _b;
      if (!r) return;
      const N = window.devicePixelRatio || 1, V = ((_a = r.parentElement) == null ? void 0 : _a.clientWidth) || 0, he = ((_b = r.parentElement) == null ? void 0 : _b.clientHeight) || 0;
      r.width = Math.round(V * N), r.height = Math.round(he * N), r.style.width = V + "px", r.style.height = he + "px";
    }
    function B() {
      if (z(), !!r) {
        if (le.z && _e(0, S * L), le.s && _e(0, -S * L), le.q && _e(-S * L, 0), le.d && _e(S * L, 0), le.a && (k += qe), le.e && (k -= qe), F = (R - h) * O + F * W, H = (A - a) * O + H * W, U = (L - p) * O + U * W, ae = (k - J) * O + ae * W, h += F, a += H, p += U, J += ae, s(c, o, u, r.width, r.height, h, a, p, Qo, J), !C && p > 1e-4 && (L *= 0.985), p < 1e-5) {
          Z = (Z + 1) % at.length;
          const N = at[Z];
          R = h = N.cx, A = a = N.cy, L = p = 2.5, F = H = U = 0, C = false, k = J = 0, ae = 0;
        }
        requestAnimationFrame(B);
      }
    }
    let xe = false, je = false, be = 0, de = 0, dt = 0, Dt = 0;
    function Lt(N) {
      const V = t.value;
      if (!V) return { x: 0, y: 0, width: 0, height: 0 };
      const he = V.getBoundingClientRect();
      return { x: N.clientX - he.left, y: N.clientY - he.top, width: he.width, height: he.height };
    }
    function Ge(N) {
      if (N.button === 2) je = true;
      else {
        xe = true;
        const V = Lt(N);
        be = V.x, de = V.y, dt = R, Dt = A;
      }
    }
    function tt(N) {
      var _a;
      const V = Lt(N);
      if (je) {
        const y = (_a = t.value) == null ? void 0 : _a.getBoundingClientRect();
        if (!y) return;
        const v = y.width / 2, x = y.height / 2, E = V.x, w = V.y;
        k = Math.atan2(w - x, E - v);
        return;
      }
      if (!xe) return;
      const he = V.x - be, l = V.y - de, f = -he * L * 2 / V.width * (V.width / V.height), d = l * L * 2 / V.height, _ = Math.cos(J), g = Math.sin(J), m = _ * f - g * d, b = g * f + _ * d;
      R = dt + m, A = Dt + b;
    }
    function ht(N) {
      N.button === 2 ? je = false : xe = false;
    }
    window.addEventListener("keydown", ke), window.addEventListener("keyup", et), r.addEventListener("wheel", ut, { passive: false }), r.addEventListener("mousedown", Ge), r.addEventListener("contextmenu", function(N) {
      N.preventDefault();
    }), window.addEventListener("mousemove", tt), window.addEventListener("mouseup", ht), B();
  }
  return Bs(() => {
    n();
  }), (r, i) => (gr(), mr("canvas", { ref_key: "canvasRef", ref: t }, null, 512));
} }), tl = (e, t) => {
  const s = e.__vccOpts || e;
  for (const [n, r] of t) s[n] = r;
  return s;
}, sl = tl(el, [["__scopeId", "data-v-c5d7e6ed"]]), nl = { id: "fullscreen" }, rl = /* @__PURE__ */ Yn({ __name: "App", setup(e) {
  return Bs(() => {
  }), (t, s) => (gr(), mr("div", nl, [Ke(sl)]));
} });
Jo(rl).mount("#app");
