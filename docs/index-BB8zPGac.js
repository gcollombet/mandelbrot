var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function() {
  const t = document.createElement("link").relList;
  if (t && t.supports && t.supports("modulepreload")) return;
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) s(r);
  new MutationObserver((r) => {
    for (const i of r) if (i.type === "childList") for (const o of i.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && s(o);
  }).observe(document, { childList: true, subtree: true });
  function n(r) {
    const i = {};
    return r.integrity && (i.integrity = r.integrity), r.referrerPolicy && (i.referrerPolicy = r.referrerPolicy), r.crossOrigin === "use-credentials" ? i.credentials = "include" : r.crossOrigin === "anonymous" ? i.credentials = "omit" : i.credentials = "same-origin", i;
  }
  function s(r) {
    if (r.ep) return;
    r.ep = true;
    const i = n(r);
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
function Sn(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const K = {}, lt = [], Me = () => {
}, Cr = () => false, qt = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), En = (e) => e.startsWith("onUpdate:"), te = Object.assign, Pn = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, Sr = Object.prototype.hasOwnProperty, U = (e, t) => Sr.call(e, t), O = Array.isArray, _t = (e) => zt(e) === "[object Map]", Er = (e) => zt(e) === "[object Set]", A = (e) => typeof e == "function", Q = (e) => typeof e == "string", dt = (e) => typeof e == "symbol", J = (e) => e !== null && typeof e == "object", Cs = (e) => (J(e) || A(e)) && A(e.then) && A(e.catch), Pr = Object.prototype.toString, zt = (e) => Pr.call(e), Tr = (e) => zt(e).slice(8, -1), Mr = (e) => zt(e) === "[object Object]", Tn = (e) => Q(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, xt = /* @__PURE__ */ Sn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), Yt = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, Or = /-(\w)/g, Ye = Yt((e) => e.replace(Or, (t, n) => n ? n.toUpperCase() : "")), Ar = /\B([A-Z])/g, nt = Yt((e) => e.replace(Ar, "-$1").toLowerCase()), Ss = Yt((e) => e.charAt(0).toUpperCase() + e.slice(1)), en = Yt((e) => e ? `on${Ss(e)}` : ""), qe = (e, t) => !Object.is(e, t), tn = (e, ...t) => {
  for (let n = 0; n < e.length; n++) e[n](...t);
}, dn = (e, t, n, s = false) => {
  Object.defineProperty(e, t, { configurable: true, enumerable: false, writable: s, value: n });
}, Rr = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
};
let Xn;
const Jt = () => Xn || (Xn = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Mn(e) {
  if (O(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const s = e[n], r = Q(s) ? Lr(s) : Mn(s);
      if (r) for (const i in r) t[i] = r[i];
    }
    return t;
  } else if (Q(e) || J(e)) return e;
}
const Ir = /;(?![^(]*\))/g, Fr = /:([^]+)/, Dr = /\/\*[^]*?\*\//g;
function Lr(e) {
  const t = {};
  return e.replace(Dr, "").split(Ir).forEach((n) => {
    if (n) {
      const s = n.split(Fr);
      s.length > 1 && (t[s[0].trim()] = s[1].trim());
    }
  }), t;
}
function On(e) {
  let t = "";
  if (Q(e)) t = e;
  else if (O(e)) for (let n = 0; n < e.length; n++) {
    const s = On(e[n]);
    s && (t += s + " ");
  }
  else if (J(e)) for (const n in e) e[n] && (t += n + " ");
  return t.trim();
}
const Ur = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Br = /* @__PURE__ */ Sn(Ur);
function Es(e) {
  return !!e || e === "";
}
/**
* @vue/reactivity v3.5.18
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
let fe;
class Hr {
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
      let n, s;
      for (n = 0, s = this.effects.length; n < s; n++) this.effects[n].stop();
      for (this.effects.length = 0, n = 0, s = this.cleanups.length; n < s; n++) this.cleanups[n]();
      if (this.cleanups.length = 0, this.scopes) {
        for (n = 0, s = this.scopes.length; n < s; n++) this.scopes[n].stop(true);
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
function Nr() {
  return fe;
}
let G;
const nn = /* @__PURE__ */ new WeakSet();
class Ps {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, fe && fe.active && fe.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, nn.has(this) && (nn.delete(this), this.trigger()));
  }
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Ms(this);
  }
  run() {
    if (!(this.flags & 1)) return this.fn();
    this.flags |= 2, Qn(this), Os(this);
    const t = G, n = ge;
    G = this, ge = true;
    try {
      return this.fn();
    } finally {
      As(this), G = t, ge = n, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep) In(t);
      this.deps = this.depsTail = void 0, Qn(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? nn.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  runIfDirty() {
    hn(this) && this.run();
  }
  get dirty() {
    return hn(this);
  }
}
let Ts = 0, yt, wt;
function Ms(e, t = false) {
  if (e.flags |= 8, t) {
    e.next = wt, wt = e;
    return;
  }
  e.next = yt, yt = e;
}
function An() {
  Ts++;
}
function Rn() {
  if (--Ts > 0) return;
  if (wt) {
    let t = wt;
    for (wt = void 0; t; ) {
      const n = t.next;
      t.next = void 0, t.flags &= -9, t = n;
    }
  }
  let e;
  for (; yt; ) {
    let t = yt;
    for (yt = void 0; t; ) {
      const n = t.next;
      if (t.next = void 0, t.flags &= -9, t.flags & 1) try {
        t.trigger();
      } catch (s) {
        e || (e = s);
      }
      t = n;
    }
  }
  if (e) throw e;
}
function Os(e) {
  for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function As(e) {
  let t, n = e.depsTail, s = n;
  for (; s; ) {
    const r = s.prevDep;
    s.version === -1 ? (s === n && (n = r), In(s), Vr(s)) : t = s, s.dep.activeLink = s.prevActiveLink, s.prevActiveLink = void 0, s = r;
  }
  e.deps = t, e.depsTail = n;
}
function hn(e) {
  for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (Rs(t.dep.computed) || t.dep.version !== t.version)) return true;
  return !!e._dirty;
}
function Rs(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Mt) || (e.globalVersion = Mt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !hn(e)))) return;
  e.flags |= 2;
  const t = e.dep, n = G, s = ge;
  G = e, ge = true;
  try {
    Os(e);
    const r = e.fn(e._value);
    (t.version === 0 || qe(r, e._value)) && (e.flags |= 128, e._value = r, t.version++);
  } catch (r) {
    throw t.version++, r;
  } finally {
    G = n, ge = s, As(e), e.flags &= -3;
  }
}
function In(e, t = false) {
  const { dep: n, prevSub: s, nextSub: r } = e;
  if (s && (s.nextSub = r, e.prevSub = void 0), r && (r.prevSub = s, e.nextSub = void 0), n.subs === e && (n.subs = s, !s && n.computed)) {
    n.computed.flags &= -5;
    for (let i = n.computed.deps; i; i = i.nextDep) In(i, true);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function Vr(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let ge = true;
const Is = [];
function Be() {
  Is.push(ge), ge = false;
}
function He() {
  const e = Is.pop();
  ge = e === void 0 ? true : e;
}
function Qn(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const n = G;
    G = void 0;
    try {
      t();
    } finally {
      G = n;
    }
  }
}
let Mt = 0;
class jr {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class Fn {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
  }
  track(t) {
    if (!G || !ge || G === this.computed) return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== G) n = this.activeLink = new jr(G, this), G.deps ? (n.prevDep = G.depsTail, G.depsTail.nextDep = n, G.depsTail = n) : G.deps = G.depsTail = n, Fs(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const s = n.nextDep;
      s.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = s), n.prevDep = G.depsTail, n.nextDep = void 0, G.depsTail.nextDep = n, G.depsTail = n, G.deps === n && (G.deps = s);
    }
    return n;
  }
  trigger(t) {
    this.version++, Mt++, this.notify(t);
  }
  notify(t) {
    An();
    try {
      for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
    } finally {
      Rn();
    }
  }
}
function Fs(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let s = t.deps; s; s = s.nextDep) Fs(s);
    }
    const n = e.dep.subs;
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
  }
}
const pn = /* @__PURE__ */ new WeakMap(), et = Symbol(""), gn = Symbol(""), Ot = Symbol("");
function k(e, t, n) {
  if (ge && G) {
    let s = pn.get(e);
    s || pn.set(e, s = /* @__PURE__ */ new Map());
    let r = s.get(n);
    r || (s.set(n, r = new Fn()), r.map = s, r.key = n), r.track();
  }
}
function Ue(e, t, n, s, r, i) {
  const o = pn.get(e);
  if (!o) {
    Mt++;
    return;
  }
  const c = (u) => {
    u && u.trigger();
  };
  if (An(), t === "clear") o.forEach(c);
  else {
    const u = O(e), h = u && Tn(n);
    if (u && n === "length") {
      const a = Number(s);
      o.forEach((p, C) => {
        (C === "length" || C === Ot || !dt(C) && C >= a) && c(p);
      });
    } else switch ((n !== void 0 || o.has(void 0)) && c(o.get(n)), h && c(o.get(Ot)), t) {
      case "add":
        u ? h && c(o.get("length")) : (c(o.get(et)), _t(e) && c(o.get(gn)));
        break;
      case "delete":
        u || (c(o.get(et)), _t(e) && c(o.get(gn)));
        break;
      case "set":
        _t(e) && c(o.get(et));
        break;
    }
  }
  Rn();
}
function it(e) {
  const t = L(e);
  return t === e ? t : (k(t, "iterate", Ot), me(e) ? t : t.map(se));
}
function Dn(e) {
  return k(e = L(e), "iterate", Ot), e;
}
const $r = { __proto__: null, [Symbol.iterator]() {
  return sn(this, Symbol.iterator, se);
}, concat(...e) {
  return it(this).concat(...e.map((t) => O(t) ? it(t) : t));
}, entries() {
  return sn(this, "entries", (e) => (e[1] = se(e[1]), e));
}, every(e, t) {
  return Fe(this, "every", e, t, void 0, arguments);
}, filter(e, t) {
  return Fe(this, "filter", e, t, (n) => n.map(se), arguments);
}, find(e, t) {
  return Fe(this, "find", e, t, se, arguments);
}, findIndex(e, t) {
  return Fe(this, "findIndex", e, t, void 0, arguments);
}, findLast(e, t) {
  return Fe(this, "findLast", e, t, se, arguments);
}, findLastIndex(e, t) {
  return Fe(this, "findLastIndex", e, t, void 0, arguments);
}, forEach(e, t) {
  return Fe(this, "forEach", e, t, void 0, arguments);
}, includes(...e) {
  return rn(this, "includes", e);
}, indexOf(...e) {
  return rn(this, "indexOf", e);
}, join(e) {
  return it(this).join(e);
}, lastIndexOf(...e) {
  return rn(this, "lastIndexOf", e);
}, map(e, t) {
  return Fe(this, "map", e, t, void 0, arguments);
}, pop() {
  return mt(this, "pop");
}, push(...e) {
  return mt(this, "push", e);
}, reduce(e, ...t) {
  return Zn(this, "reduce", e, t);
}, reduceRight(e, ...t) {
  return Zn(this, "reduceRight", e, t);
}, shift() {
  return mt(this, "shift");
}, some(e, t) {
  return Fe(this, "some", e, t, void 0, arguments);
}, splice(...e) {
  return mt(this, "splice", e);
}, toReversed() {
  return it(this).toReversed();
}, toSorted(e) {
  return it(this).toSorted(e);
}, toSpliced(...e) {
  return it(this).toSpliced(...e);
}, unshift(...e) {
  return mt(this, "unshift", e);
}, values() {
  return sn(this, "values", se);
} };
function sn(e, t, n) {
  const s = Dn(e), r = s[t]();
  return s !== e && !me(e) && (r._next = r.next, r.next = () => {
    const i = r._next();
    return i.value && (i.value = n(i.value)), i;
  }), r;
}
const Wr = Array.prototype;
function Fe(e, t, n, s, r, i) {
  const o = Dn(e), c = o !== e && !me(e), u = o[t];
  if (u !== Wr[t]) {
    const p = u.apply(e, i);
    return c ? se(p) : p;
  }
  let h = n;
  o !== e && (c ? h = function(p, C) {
    return n.call(this, se(p), C, e);
  } : n.length > 2 && (h = function(p, C) {
    return n.call(this, p, C, e);
  }));
  const a = u.call(o, h, s);
  return c && r ? r(a) : a;
}
function Zn(e, t, n, s) {
  const r = Dn(e);
  let i = n;
  return r !== e && (me(e) ? n.length > 3 && (i = function(o, c, u) {
    return n.call(this, o, c, u, e);
  }) : i = function(o, c, u) {
    return n.call(this, o, se(c), u, e);
  }), r[t](i, ...s);
}
function rn(e, t, n) {
  const s = L(e);
  k(s, "iterate", Ot);
  const r = s[t](...n);
  return (r === -1 || r === false) && Hn(n[0]) ? (n[0] = L(n[0]), s[t](...n)) : r;
}
function mt(e, t, n = []) {
  Be(), An();
  const s = L(e)[t].apply(e, n);
  return Rn(), He(), s;
}
const Gr = /* @__PURE__ */ Sn("__proto__,__v_isRef,__isVue"), Ds = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(dt));
function Kr(e) {
  dt(e) || (e = String(e));
  const t = L(this);
  return k(t, "has", e), t.hasOwnProperty(e);
}
class Ls {
  constructor(t = false, n = false) {
    this._isReadonly = t, this._isShallow = n;
  }
  get(t, n, s) {
    if (n === "__v_skip") return t.__v_skip;
    const r = this._isReadonly, i = this._isShallow;
    if (n === "__v_isReactive") return !r;
    if (n === "__v_isReadonly") return r;
    if (n === "__v_isShallow") return i;
    if (n === "__v_raw") return s === (r ? i ? ti : Ns : i ? Hs : Bs).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(s) ? t : void 0;
    const o = O(t);
    if (!r) {
      let u;
      if (o && (u = $r[n])) return u;
      if (n === "hasOwnProperty") return Kr;
    }
    const c = Reflect.get(t, n, ee(t) ? t : s);
    return (dt(n) ? Ds.has(n) : Gr(n)) || (r || k(t, "get", n), i) ? c : ee(c) ? o && Tn(n) ? c : c.value : J(c) ? r ? Vs(c) : Un(c) : c;
  }
}
class Us extends Ls {
  constructor(t = false) {
    super(false, t);
  }
  set(t, n, s, r) {
    let i = t[n];
    if (!this._isShallow) {
      const u = tt(i);
      if (!me(s) && !tt(s) && (i = L(i), s = L(s)), !O(t) && ee(i) && !ee(s)) return u ? false : (i.value = s, true);
    }
    const o = O(t) && Tn(n) ? Number(n) < t.length : U(t, n), c = Reflect.set(t, n, s, ee(t) ? t : r);
    return t === L(r) && (o ? qe(s, i) && Ue(t, "set", n, s) : Ue(t, "add", n, s)), c;
  }
  deleteProperty(t, n) {
    const s = U(t, n);
    t[n];
    const r = Reflect.deleteProperty(t, n);
    return r && s && Ue(t, "delete", n, void 0), r;
  }
  has(t, n) {
    const s = Reflect.has(t, n);
    return (!dt(n) || !Ds.has(n)) && k(t, "has", n), s;
  }
  ownKeys(t) {
    return k(t, "iterate", O(t) ? "length" : et), Reflect.ownKeys(t);
  }
}
class qr extends Ls {
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
const zr = new Us(), Yr = new qr(), Jr = new Us(true);
const mn = (e) => e, Lt = (e) => Reflect.getPrototypeOf(e);
function Xr(e, t, n) {
  return function(...s) {
    const r = this.__v_raw, i = L(r), o = _t(i), c = e === "entries" || e === Symbol.iterator && o, u = e === "keys" && o, h = r[e](...s), a = n ? mn : t ? vn : se;
    return !t && k(i, "iterate", u ? gn : et), { next() {
      const { value: p, done: C } = h.next();
      return C ? { value: p, done: C } : { value: c ? [a(p[0]), a(p[1])] : a(p), done: C };
    }, [Symbol.iterator]() {
      return this;
    } };
  };
}
function Ut(e) {
  return function(...t) {
    return e === "delete" ? false : e === "clear" ? void 0 : this;
  };
}
function Qr(e, t) {
  const n = { get(r) {
    const i = this.__v_raw, o = L(i), c = L(r);
    e || (qe(r, c) && k(o, "get", r), k(o, "get", c));
    const { has: u } = Lt(o), h = t ? mn : e ? vn : se;
    if (u.call(o, r)) return h(i.get(r));
    if (u.call(o, c)) return h(i.get(c));
    i !== o && i.get(r);
  }, get size() {
    const r = this.__v_raw;
    return !e && k(L(r), "iterate", et), Reflect.get(r, "size", r);
  }, has(r) {
    const i = this.__v_raw, o = L(i), c = L(r);
    return e || (qe(r, c) && k(o, "has", r), k(o, "has", c)), r === c ? i.has(r) : i.has(r) || i.has(c);
  }, forEach(r, i) {
    const o = this, c = o.__v_raw, u = L(c), h = t ? mn : e ? vn : se;
    return !e && k(u, "iterate", et), c.forEach((a, p) => r.call(i, h(a), h(p), o));
  } };
  return te(n, e ? { add: Ut("add"), set: Ut("set"), delete: Ut("delete"), clear: Ut("clear") } : { add(r) {
    !t && !me(r) && !tt(r) && (r = L(r));
    const i = L(this);
    return Lt(i).has.call(i, r) || (i.add(r), Ue(i, "add", r, r)), this;
  }, set(r, i) {
    !t && !me(i) && !tt(i) && (i = L(i));
    const o = L(this), { has: c, get: u } = Lt(o);
    let h = c.call(o, r);
    h || (r = L(r), h = c.call(o, r));
    const a = u.call(o, r);
    return o.set(r, i), h ? qe(i, a) && Ue(o, "set", r, i) : Ue(o, "add", r, i), this;
  }, delete(r) {
    const i = L(this), { has: o, get: c } = Lt(i);
    let u = o.call(i, r);
    u || (r = L(r), u = o.call(i, r)), c && c.call(i, r);
    const h = i.delete(r);
    return u && Ue(i, "delete", r, void 0), h;
  }, clear() {
    const r = L(this), i = r.size !== 0, o = r.clear();
    return i && Ue(r, "clear", void 0, void 0), o;
  } }), ["keys", "values", "entries", Symbol.iterator].forEach((r) => {
    n[r] = Xr(r, e, t);
  }), n;
}
function Ln(e, t) {
  const n = Qr(e, t);
  return (s, r, i) => r === "__v_isReactive" ? !e : r === "__v_isReadonly" ? e : r === "__v_raw" ? s : Reflect.get(U(n, r) && r in s ? n : s, r, i);
}
const Zr = { get: Ln(false, false) }, kr = { get: Ln(false, true) }, ei = { get: Ln(true, false) };
const Bs = /* @__PURE__ */ new WeakMap(), Hs = /* @__PURE__ */ new WeakMap(), Ns = /* @__PURE__ */ new WeakMap(), ti = /* @__PURE__ */ new WeakMap();
function ni(e) {
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
function si(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : ni(Tr(e));
}
function Un(e) {
  return tt(e) ? e : Bn(e, false, zr, Zr, Bs);
}
function ri(e) {
  return Bn(e, false, Jr, kr, Hs);
}
function Vs(e) {
  return Bn(e, true, Yr, ei, Ns);
}
function Bn(e, t, n, s, r) {
  if (!J(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
  const i = si(e);
  if (i === 0) return e;
  const o = r.get(e);
  if (o) return o;
  const c = new Proxy(e, i === 2 ? s : n);
  return r.set(e, c), c;
}
function Ct(e) {
  return tt(e) ? Ct(e.__v_raw) : !!(e && e.__v_isReactive);
}
function tt(e) {
  return !!(e && e.__v_isReadonly);
}
function me(e) {
  return !!(e && e.__v_isShallow);
}
function Hn(e) {
  return e ? !!e.__v_raw : false;
}
function L(e) {
  const t = e && e.__v_raw;
  return t ? L(t) : e;
}
function ii(e) {
  return !U(e, "__v_skip") && Object.isExtensible(e) && dn(e, "__v_skip", true), e;
}
const se = (e) => J(e) ? Un(e) : e, vn = (e) => J(e) ? Vs(e) : e;
function ee(e) {
  return e ? e.__v_isRef === true : false;
}
function oi(e) {
  return li(e, false);
}
function li(e, t) {
  return ee(e) ? e : new ci(e, t);
}
class ci {
  constructor(t, n) {
    this.dep = new Fn(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : L(t), this._value = n ? t : se(t), this.__v_isShallow = n;
  }
  get value() {
    return this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, s = this.__v_isShallow || me(t) || tt(t);
    t = s ? t : L(t), qe(t, n) && (this._rawValue = t, this._value = s ? t : se(t), this.dep.trigger());
  }
}
function fi(e) {
  return ee(e) ? e.value : e;
}
const ui = { get: (e, t, n) => t === "__v_raw" ? e : fi(Reflect.get(e, t, n)), set: (e, t, n, s) => {
  const r = e[t];
  return ee(r) && !ee(n) ? (r.value = n, true) : Reflect.set(e, t, n, s);
} };
function js(e) {
  return Ct(e) ? e : new Proxy(e, ui);
}
class ai {
  constructor(t, n, s) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new Fn(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Mt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = s;
  }
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && G !== this) return Ms(this, true), true;
  }
  get value() {
    const t = this.dep.track();
    return Rs(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter && this.setter(t);
  }
}
function di(e, t, n = false) {
  let s, r;
  return A(e) ? s = e : (s = e.get, r = e.set), new ai(s, r, n);
}
const Bt = {}, jt = /* @__PURE__ */ new WeakMap();
let ke;
function hi(e, t = false, n = ke) {
  if (n) {
    let s = jt.get(n);
    s || jt.set(n, s = []), s.push(e);
  }
}
function pi(e, t, n = K) {
  const { immediate: s, deep: r, once: i, scheduler: o, augmentJob: c, call: u } = n, h = (T) => r ? T : me(T) || r === false || r === 0 ? Ke(T, 1) : Ke(T);
  let a, p, C, S, R = false, I = false;
  if (ee(e) ? (p = () => e.value, R = me(e)) : Ct(e) ? (p = () => h(e), R = true) : O(e) ? (I = true, R = e.some((T) => Ct(T) || me(T)), p = () => e.map((T) => {
    if (ee(T)) return T.value;
    if (Ct(T)) return h(T);
    if (A(T)) return u ? u(T, 2) : T();
  })) : A(e) ? t ? p = u ? () => u(e, 2) : e : p = () => {
    if (C) {
      Be();
      try {
        C();
      } finally {
        He();
      }
    }
    const T = ke;
    ke = a;
    try {
      return u ? u(e, 3, [S]) : e(S);
    } finally {
      ke = T;
    }
  } : p = Me, t && r) {
    const T = p, q = r === true ? 1 / 0 : r;
    p = () => Ke(T(), q);
  }
  const Y = Nr(), F = () => {
    a.stop(), Y && Y.active && Pn(Y.effects, a);
  };
  if (i && t) {
    const T = t;
    t = (...q) => {
      T(...q), F();
    };
  }
  let V = I ? new Array(e.length).fill(Bt) : Bt;
  const B = (T) => {
    if (!(!(a.flags & 1) || !a.dirty && !T)) if (t) {
      const q = a.run();
      if (r || R || (I ? q.some((Z, he) => qe(Z, V[he])) : qe(q, V))) {
        C && C();
        const Z = ke;
        ke = a;
        try {
          const he = [q, V === Bt ? void 0 : I && V[0] === Bt ? [] : V, S];
          V = q, u ? u(t, 3, he) : t(...he);
        } finally {
          ke = Z;
        }
      }
    } else a.run();
  };
  return c && c(B), a = new Ps(p), a.scheduler = o ? () => o(B, false) : B, S = (T) => hi(T, false, a), C = a.onStop = () => {
    const T = jt.get(a);
    if (T) {
      if (u) u(T, 4);
      else for (const q of T) q();
      jt.delete(a);
    }
  }, t ? s ? B(true) : V = a.run() : o ? o(B.bind(null, true), true) : a.run(), F.pause = a.pause.bind(a), F.resume = a.resume.bind(a), F.stop = F, F;
}
function Ke(e, t = 1 / 0, n) {
  if (t <= 0 || !J(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
  if (n.add(e), t--, ee(e)) Ke(e.value, t, n);
  else if (O(e)) for (let s = 0; s < e.length; s++) Ke(e[s], t, n);
  else if (Er(e) || _t(e)) e.forEach((s) => {
    Ke(s, t, n);
  });
  else if (Mr(e)) {
    for (const s in e) Ke(e[s], t, n);
    for (const s of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, s) && Ke(e[s], t, n);
  }
  return e;
}
/**
* @vue/runtime-core v3.5.18
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
function Ft(e, t, n, s) {
  try {
    return s ? e(...s) : e();
  } catch (r) {
    Xt(r, t, n);
  }
}
function Oe(e, t, n, s) {
  if (A(e)) {
    const r = Ft(e, t, n, s);
    return r && Cs(r) && r.catch((i) => {
      Xt(i, t, n);
    }), r;
  }
  if (O(e)) {
    const r = [];
    for (let i = 0; i < e.length; i++) r.push(Oe(e[i], t, n, s));
    return r;
  }
}
function Xt(e, t, n, s = true) {
  const r = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: o } = t && t.appContext.config || K;
  if (t) {
    let c = t.parent;
    const u = t.proxy, h = `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; c; ) {
      const a = c.ec;
      if (a) {
        for (let p = 0; p < a.length; p++) if (a[p](e, u, h) === false) return;
      }
      c = c.parent;
    }
    if (i) {
      Be(), Ft(i, null, 10, [e, u, h]), He();
      return;
    }
  }
  gi(e, n, r, s, o);
}
function gi(e, t, n, s = true, r = false) {
  if (r) throw e;
  console.error(e);
}
const re = [];
let Ee = -1;
const ct = [];
let We = null, ot = 0;
const $s = Promise.resolve();
let $t = null;
function mi(e) {
  const t = $t || $s;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function vi(e) {
  let t = Ee + 1, n = re.length;
  for (; t < n; ) {
    const s = t + n >>> 1, r = re[s], i = At(r);
    i < e || i === e && r.flags & 2 ? t = s + 1 : n = s;
  }
  return t;
}
function Nn(e) {
  if (!(e.flags & 1)) {
    const t = At(e), n = re[re.length - 1];
    !n || !(e.flags & 2) && t >= At(n) ? re.push(e) : re.splice(vi(t), 0, e), e.flags |= 1, Ws();
  }
}
function Ws() {
  $t || ($t = $s.then(Ks));
}
function bi(e) {
  O(e) ? ct.push(...e) : We && e.id === -1 ? We.splice(ot + 1, 0, e) : e.flags & 1 || (ct.push(e), e.flags |= 1), Ws();
}
function kn(e, t, n = Ee + 1) {
  for (; n < re.length; n++) {
    const s = re[n];
    if (s && s.flags & 2) {
      if (e && s.id !== e.uid) continue;
      re.splice(n, 1), n--, s.flags & 4 && (s.flags &= -2), s(), s.flags & 4 || (s.flags &= -2);
    }
  }
}
function Gs(e) {
  if (ct.length) {
    const t = [...new Set(ct)].sort((n, s) => At(n) - At(s));
    if (ct.length = 0, We) {
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
const At = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function Ks(e) {
  try {
    for (Ee = 0; Ee < re.length; Ee++) {
      const t = re[Ee];
      t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Ft(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
    }
  } finally {
    for (; Ee < re.length; Ee++) {
      const t = re[Ee];
      t && (t.flags &= -2);
    }
    Ee = -1, re.length = 0, Gs(), $t = null, (re.length || ct.length) && Ks();
  }
}
let Te = null, qs = null;
function Wt(e) {
  const t = Te;
  return Te = e, qs = e && e.type.__scopeId || null, t;
}
function _i(e, t = Te, n) {
  if (!t || e._n) return e;
  const s = (...r) => {
    s._d && cs(-1);
    const i = Wt(t);
    let o;
    try {
      o = e(...r);
    } finally {
      Wt(i), s._d && cs(1);
    }
    return o;
  };
  return s._n = true, s._c = true, s._d = true, s;
}
function Qe(e, t, n, s) {
  const r = e.dirs, i = t && t.dirs;
  for (let o = 0; o < r.length; o++) {
    const c = r[o];
    i && (c.oldValue = i[o].value);
    let u = c.dir[s];
    u && (Be(), Oe(u, n, 8, [e.el, c, e, t]), He());
  }
}
const xi = Symbol("_vte"), yi = (e) => e.__isTeleport;
function Vn(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, Vn(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function zs(e, t) {
  return A(e) ? te({ name: e.name }, t, { setup: e }) : e;
}
function Ys(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
function St(e, t, n, s, r = false) {
  if (O(e)) {
    e.forEach((R, I) => St(R, t && (O(t) ? t[I] : t), n, s, r));
    return;
  }
  if (Et(s) && !r) {
    s.shapeFlag & 512 && s.type.__asyncResolved && s.component.subTree.component && St(e, t, n, s.component.subTree);
    return;
  }
  const i = s.shapeFlag & 4 ? Kn(s.component) : s.el, o = r ? null : i, { i: c, r: u } = e, h = t && t.r, a = c.refs === K ? c.refs = {} : c.refs, p = c.setupState, C = L(p), S = p === K ? () => false : (R) => U(C, R);
  if (h != null && h !== u && (Q(h) ? (a[h] = null, S(h) && (p[h] = null)) : ee(h) && (h.value = null)), A(u)) Ft(u, c, 12, [o, a]);
  else {
    const R = Q(u), I = ee(u);
    if (R || I) {
      const Y = () => {
        if (e.f) {
          const F = R ? S(u) ? p[u] : a[u] : u.value;
          r ? O(F) && Pn(F, i) : O(F) ? F.includes(i) || F.push(i) : R ? (a[u] = [i], S(u) && (p[u] = a[u])) : (u.value = [i], e.k && (a[e.k] = u.value));
        } else R ? (a[u] = o, S(u) && (p[u] = o)) : I && (u.value = o, e.k && (a[e.k] = o));
      };
      o ? (Y.id = -1, ae(Y, n)) : Y();
    }
  }
}
Jt().requestIdleCallback;
Jt().cancelIdleCallback;
const Et = (e) => !!e.type.__asyncLoader, Js = (e) => e.type.__isKeepAlive;
function wi(e, t) {
  Xs(e, "a", t);
}
function Ci(e, t) {
  Xs(e, "da", t);
}
function Xs(e, t, n = ie) {
  const s = e.__wdc || (e.__wdc = () => {
    let r = n;
    for (; r; ) {
      if (r.isDeactivated) return;
      r = r.parent;
    }
    return e();
  });
  if (Qt(t, s, n), n) {
    let r = n.parent;
    for (; r && r.parent; ) Js(r.parent.vnode) && Si(s, t, n, r), r = r.parent;
  }
}
function Si(e, t, n, s) {
  const r = Qt(t, e, s, true);
  Qs(() => {
    Pn(s[t], r);
  }, n);
}
function Qt(e, t, n = ie, s = false) {
  if (n) {
    const r = n[e] || (n[e] = []), i = t.__weh || (t.__weh = (...o) => {
      Be();
      const c = Dt(n), u = Oe(t, n, e, o);
      return c(), He(), u;
    });
    return s ? r.unshift(i) : r.push(i), i;
  }
}
const Ne = (e) => (t, n = ie) => {
  (!It || e === "sp") && Qt(e, (...s) => t(...s), n);
}, Ei = Ne("bm"), jn = Ne("m"), Pi = Ne("bu"), Ti = Ne("u"), Mi = Ne("bum"), Qs = Ne("um"), Oi = Ne("sp"), Ai = Ne("rtg"), Ri = Ne("rtc");
function Ii(e, t = ie) {
  Qt("ec", e, t);
}
const Fi = Symbol.for("v-ndc"), bn = (e) => e ? xr(e) ? Kn(e) : bn(e.parent) : null, Pt = te(/* @__PURE__ */ Object.create(null), { $: (e) => e, $el: (e) => e.vnode.el, $data: (e) => e.data, $props: (e) => e.props, $attrs: (e) => e.attrs, $slots: (e) => e.slots, $refs: (e) => e.refs, $parent: (e) => bn(e.parent), $root: (e) => bn(e.root), $host: (e) => e.ce, $emit: (e) => e.emit, $options: (e) => ks(e), $forceUpdate: (e) => e.f || (e.f = () => {
  Nn(e.update);
}), $nextTick: (e) => e.n || (e.n = mi.bind(e.proxy)), $watch: (e) => to.bind(e) }), on = (e, t) => e !== K && !e.__isScriptSetup && U(e, t), Di = { get({ _: e }, t) {
  if (t === "__v_skip") return true;
  const { ctx: n, setupState: s, data: r, props: i, accessCache: o, type: c, appContext: u } = e;
  let h;
  if (t[0] !== "$") {
    const S = o[t];
    if (S !== void 0) switch (S) {
      case 1:
        return s[t];
      case 2:
        return r[t];
      case 4:
        return n[t];
      case 3:
        return i[t];
    }
    else {
      if (on(s, t)) return o[t] = 1, s[t];
      if (r !== K && U(r, t)) return o[t] = 2, r[t];
      if ((h = e.propsOptions[0]) && U(h, t)) return o[t] = 3, i[t];
      if (n !== K && U(n, t)) return o[t] = 4, n[t];
      _n && (o[t] = 0);
    }
  }
  const a = Pt[t];
  let p, C;
  if (a) return t === "$attrs" && k(e.attrs, "get", ""), a(e);
  if ((p = c.__cssModules) && (p = p[t])) return p;
  if (n !== K && U(n, t)) return o[t] = 4, n[t];
  if (C = u.config.globalProperties, U(C, t)) return C[t];
}, set({ _: e }, t, n) {
  const { data: s, setupState: r, ctx: i } = e;
  return on(r, t) ? (r[t] = n, true) : s !== K && U(s, t) ? (s[t] = n, true) : U(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (i[t] = n, true);
}, has({ _: { data: e, setupState: t, accessCache: n, ctx: s, appContext: r, propsOptions: i } }, o) {
  let c;
  return !!n[o] || e !== K && U(e, o) || on(t, o) || (c = i[0]) && U(c, o) || U(s, o) || U(Pt, o) || U(r.config.globalProperties, o);
}, defineProperty(e, t, n) {
  return n.get != null ? e._.accessCache[t] = 0 : U(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
} };
function es(e) {
  return O(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
}
let _n = true;
function Li(e) {
  const t = ks(e), n = e.proxy, s = e.ctx;
  _n = false, t.beforeCreate && ts(t.beforeCreate, e, "bc");
  const { data: r, computed: i, methods: o, watch: c, provide: u, inject: h, created: a, beforeMount: p, mounted: C, beforeUpdate: S, updated: R, activated: I, deactivated: Y, beforeDestroy: F, beforeUnmount: V, destroyed: B, unmounted: T, render: q, renderTracked: Z, renderTriggered: he, errorCaptured: ve, serverPrefetch: st, expose: be, inheritAttrs: Ae, components: Je, directives: Ve, filters: Xe } = t;
  if (h && Ui(h, s, null), o) for (const j in o) {
    const H = o[j];
    A(H) && (s[j] = H.bind(n));
  }
  if (r) {
    const j = r.call(n, n);
    J(j) && (e.data = Un(j));
  }
  if (_n = true, i) for (const j in i) {
    const H = i[j], _e = A(H) ? H.bind(n, n) : A(H.get) ? H.get.bind(n, n) : Me, rt = !A(H) && A(H.set) ? H.set.bind(n) : Me, Re = Eo({ get: _e, set: rt });
    Object.defineProperty(s, j, { enumerable: true, configurable: true, get: () => Re.value, set: (pe) => Re.value = pe });
  }
  if (c) for (const j in c) Zs(c[j], s, n, j);
  if (u) {
    const j = A(u) ? u.call(n) : u;
    Reflect.ownKeys(j).forEach((H) => {
      $i(H, j[H]);
    });
  }
  a && ts(a, e, "c");
  function X(j, H) {
    O(H) ? H.forEach((_e) => j(_e.bind(n))) : H && j(H.bind(n));
  }
  if (X(Ei, p), X(jn, C), X(Pi, S), X(Ti, R), X(wi, I), X(Ci, Y), X(Ii, ve), X(Ri, Z), X(Ai, he), X(Mi, V), X(Qs, T), X(Oi, st), O(be)) if (be.length) {
    const j = e.exposed || (e.exposed = {});
    be.forEach((H) => {
      Object.defineProperty(j, H, { get: () => n[H], set: (_e) => n[H] = _e, enumerable: true });
    });
  } else e.exposed || (e.exposed = {});
  q && e.render === Me && (e.render = q), Ae != null && (e.inheritAttrs = Ae), Je && (e.components = Je), Ve && (e.directives = Ve), st && Ys(e);
}
function Ui(e, t, n = Me) {
  O(e) && (e = xn(e));
  for (const s in e) {
    const r = e[s];
    let i;
    J(r) ? "default" in r ? i = Ht(r.from || s, r.default, true) : i = Ht(r.from || s) : i = Ht(r), ee(i) ? Object.defineProperty(t, s, { enumerable: true, configurable: true, get: () => i.value, set: (o) => i.value = o }) : t[s] = i;
  }
}
function ts(e, t, n) {
  Oe(O(e) ? e.map((s) => s.bind(t.proxy)) : e.bind(t.proxy), t, n);
}
function Zs(e, t, n, s) {
  let r = s.includes(".") ? dr(n, s) : () => n[s];
  if (Q(e)) {
    const i = t[e];
    A(i) && cn(r, i);
  } else if (A(e)) cn(r, e.bind(n));
  else if (J(e)) if (O(e)) e.forEach((i) => Zs(i, t, n, s));
  else {
    const i = A(e.handler) ? e.handler.bind(n) : t[e.handler];
    A(i) && cn(r, i, e);
  }
}
function ks(e) {
  const t = e.type, { mixins: n, extends: s } = t, { mixins: r, optionsCache: i, config: { optionMergeStrategies: o } } = e.appContext, c = i.get(t);
  let u;
  return c ? u = c : !r.length && !n && !s ? u = t : (u = {}, r.length && r.forEach((h) => Gt(u, h, o, true)), Gt(u, t, o)), J(t) && i.set(t, u), u;
}
function Gt(e, t, n, s = false) {
  const { mixins: r, extends: i } = t;
  i && Gt(e, i, n, true), r && r.forEach((o) => Gt(e, o, n, true));
  for (const o in t) if (!(s && o === "expose")) {
    const c = Bi[o] || n && n[o];
    e[o] = c ? c(e[o], t[o]) : t[o];
  }
  return e;
}
const Bi = { data: ns, props: ss, emits: ss, methods: bt, computed: bt, beforeCreate: ne, created: ne, beforeMount: ne, mounted: ne, beforeUpdate: ne, updated: ne, beforeDestroy: ne, beforeUnmount: ne, destroyed: ne, unmounted: ne, activated: ne, deactivated: ne, errorCaptured: ne, serverPrefetch: ne, components: bt, directives: bt, watch: Ni, provide: ns, inject: Hi };
function ns(e, t) {
  return t ? e ? function() {
    return te(A(e) ? e.call(this, this) : e, A(t) ? t.call(this, this) : t);
  } : t : e;
}
function Hi(e, t) {
  return bt(xn(e), xn(t));
}
function xn(e) {
  if (O(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
    return t;
  }
  return e;
}
function ne(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function bt(e, t) {
  return e ? te(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function ss(e, t) {
  return e ? O(e) && O(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : te(/* @__PURE__ */ Object.create(null), es(e), es(t ?? {})) : t;
}
function Ni(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = te(/* @__PURE__ */ Object.create(null), e);
  for (const s in t) n[s] = ne(e[s], t[s]);
  return n;
}
function er() {
  return { app: null, config: { isNativeTag: Cr, performance: false, globalProperties: {}, optionMergeStrategies: {}, errorHandler: void 0, warnHandler: void 0, compilerOptions: {} }, mixins: [], components: {}, directives: {}, provides: /* @__PURE__ */ Object.create(null), optionsCache: /* @__PURE__ */ new WeakMap(), propsCache: /* @__PURE__ */ new WeakMap(), emitsCache: /* @__PURE__ */ new WeakMap() };
}
let Vi = 0;
function ji(e, t) {
  return function(s, r = null) {
    A(s) || (s = te({}, s)), r != null && !J(r) && (r = null);
    const i = er(), o = /* @__PURE__ */ new WeakSet(), c = [];
    let u = false;
    const h = i.app = { _uid: Vi++, _component: s, _props: r, _container: null, _context: i, _instance: null, version: Po, get config() {
      return i.config;
    }, set config(a) {
    }, use(a, ...p) {
      return o.has(a) || (a && A(a.install) ? (o.add(a), a.install(h, ...p)) : A(a) && (o.add(a), a(h, ...p))), h;
    }, mixin(a) {
      return i.mixins.includes(a) || i.mixins.push(a), h;
    }, component(a, p) {
      return p ? (i.components[a] = p, h) : i.components[a];
    }, directive(a, p) {
      return p ? (i.directives[a] = p, h) : i.directives[a];
    }, mount(a, p, C) {
      if (!u) {
        const S = h._ceVNode || ze(s, r);
        return S.appContext = i, C === true ? C = "svg" : C === false && (C = void 0), e(S, a, C), u = true, h._container = a, a.__vue_app__ = h, Kn(S.component);
      }
    }, onUnmount(a) {
      c.push(a);
    }, unmount() {
      u && (Oe(c, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
    }, provide(a, p) {
      return i.provides[a] = p, h;
    }, runWithContext(a) {
      const p = ft;
      ft = h;
      try {
        return a();
      } finally {
        ft = p;
      }
    } };
    return h;
  };
}
let ft = null;
function $i(e, t) {
  if (ie) {
    let n = ie.provides;
    const s = ie.parent && ie.parent.provides;
    s === n && (n = ie.provides = Object.create(s)), n[e] = t;
  }
}
function Ht(e, t, n = false) {
  const s = _o();
  if (s || ft) {
    let r = ft ? ft._context.provides : s ? s.parent == null || s.ce ? s.vnode.appContext && s.vnode.appContext.provides : s.parent.provides : void 0;
    if (r && e in r) return r[e];
    if (arguments.length > 1) return n && A(t) ? t.call(s && s.proxy) : t;
  }
}
const tr = {}, nr = () => Object.create(tr), sr = (e) => Object.getPrototypeOf(e) === tr;
function Wi(e, t, n, s = false) {
  const r = {}, i = nr();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), rr(e, t, r, i);
  for (const o in e.propsOptions[0]) o in r || (r[o] = void 0);
  n ? e.props = s ? r : ri(r) : e.type.props ? e.props = r : e.props = i, e.attrs = i;
}
function Gi(e, t, n, s) {
  const { props: r, attrs: i, vnode: { patchFlag: o } } = e, c = L(r), [u] = e.propsOptions;
  let h = false;
  if ((s || o > 0) && !(o & 16)) {
    if (o & 8) {
      const a = e.vnode.dynamicProps;
      for (let p = 0; p < a.length; p++) {
        let C = a[p];
        if (Zt(e.emitsOptions, C)) continue;
        const S = t[C];
        if (u) if (U(i, C)) S !== i[C] && (i[C] = S, h = true);
        else {
          const R = Ye(C);
          r[R] = yn(u, c, R, S, e, false);
        }
        else S !== i[C] && (i[C] = S, h = true);
      }
    }
  } else {
    rr(e, t, r, i) && (h = true);
    let a;
    for (const p in c) (!t || !U(t, p) && ((a = nt(p)) === p || !U(t, a))) && (u ? n && (n[p] !== void 0 || n[a] !== void 0) && (r[p] = yn(u, c, p, void 0, e, true)) : delete r[p]);
    if (i !== c) for (const p in i) (!t || !U(t, p)) && (delete i[p], h = true);
  }
  h && Ue(e.attrs, "set", "");
}
function rr(e, t, n, s) {
  const [r, i] = e.propsOptions;
  let o = false, c;
  if (t) for (let u in t) {
    if (xt(u)) continue;
    const h = t[u];
    let a;
    r && U(r, a = Ye(u)) ? !i || !i.includes(a) ? n[a] = h : (c || (c = {}))[a] = h : Zt(e.emitsOptions, u) || (!(u in s) || h !== s[u]) && (s[u] = h, o = true);
  }
  if (i) {
    const u = L(n), h = c || K;
    for (let a = 0; a < i.length; a++) {
      const p = i[a];
      n[p] = yn(r, u, p, h[p], e, !U(h, p));
    }
  }
  return o;
}
function yn(e, t, n, s, r, i) {
  const o = e[n];
  if (o != null) {
    const c = U(o, "default");
    if (c && s === void 0) {
      const u = o.default;
      if (o.type !== Function && !o.skipFactory && A(u)) {
        const { propsDefaults: h } = r;
        if (n in h) s = h[n];
        else {
          const a = Dt(r);
          s = h[n] = u.call(null, t), a();
        }
      } else s = u;
      r.ce && r.ce._setProp(n, s);
    }
    o[0] && (i && !c ? s = false : o[1] && (s === "" || s === nt(n)) && (s = true));
  }
  return s;
}
const Ki = /* @__PURE__ */ new WeakMap();
function ir(e, t, n = false) {
  const s = n ? Ki : t.propsCache, r = s.get(e);
  if (r) return r;
  const i = e.props, o = {}, c = [];
  let u = false;
  if (!A(e)) {
    const a = (p) => {
      u = true;
      const [C, S] = ir(p, t, true);
      te(o, C), S && c.push(...S);
    };
    !n && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
  }
  if (!i && !u) return J(e) && s.set(e, lt), lt;
  if (O(i)) for (let a = 0; a < i.length; a++) {
    const p = Ye(i[a]);
    rs(p) && (o[p] = K);
  }
  else if (i) for (const a in i) {
    const p = Ye(a);
    if (rs(p)) {
      const C = i[a], S = o[p] = O(C) || A(C) ? { type: C } : te({}, C), R = S.type;
      let I = false, Y = true;
      if (O(R)) for (let F = 0; F < R.length; ++F) {
        const V = R[F], B = A(V) && V.name;
        if (B === "Boolean") {
          I = true;
          break;
        } else B === "String" && (Y = false);
      }
      else I = A(R) && R.name === "Boolean";
      S[0] = I, S[1] = Y, (I || U(S, "default")) && c.push(p);
    }
  }
  const h = [o, c];
  return J(e) && s.set(e, h), h;
}
function rs(e) {
  return e[0] !== "$" && !xt(e);
}
const $n = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", Wn = (e) => O(e) ? e.map(Pe) : [Pe(e)], qi = (e, t, n) => {
  if (t._n) return t;
  const s = _i((...r) => Wn(t(...r)), n);
  return s._c = false, s;
}, or = (e, t, n) => {
  const s = e._ctx;
  for (const r in e) {
    if ($n(r)) continue;
    const i = e[r];
    if (A(i)) t[r] = qi(r, i, s);
    else if (i != null) {
      const o = Wn(i);
      t[r] = () => o;
    }
  }
}, lr = (e, t) => {
  const n = Wn(t);
  e.slots.default = () => n;
}, cr = (e, t, n) => {
  for (const s in t) (n || !$n(s)) && (e[s] = t[s]);
}, zi = (e, t, n) => {
  const s = e.slots = nr();
  if (e.vnode.shapeFlag & 32) {
    const r = t.__;
    r && dn(s, "__", r, true);
    const i = t._;
    i ? (cr(s, t, n), n && dn(s, "_", i, true)) : or(t, s);
  } else t && lr(e, t);
}, Yi = (e, t, n) => {
  const { vnode: s, slots: r } = e;
  let i = true, o = K;
  if (s.shapeFlag & 32) {
    const c = t._;
    c ? n && c === 1 ? i = false : cr(r, t, n) : (i = !t.$stable, or(t, r)), o = t;
  } else t && (lr(e, t), o = { default: 1 });
  if (i) for (const c in r) !$n(c) && o[c] == null && delete r[c];
}, ae = co;
function Ji(e) {
  return Xi(e);
}
function Xi(e, t) {
  const n = Jt();
  n.__VUE__ = true;
  const { insert: s, remove: r, patchProp: i, createElement: o, createText: c, createComment: u, setText: h, setElementText: a, parentNode: p, nextSibling: C, setScopeId: S = Me, insertStaticContent: R } = e, I = (l, f, d, v = null, g = null, m = null, y = void 0, x = null, _ = !!f.dynamicChildren) => {
    if (l === f) return;
    l && !vt(l, f) && (v = Ie(l), pe(l, g, m, true), l = null), f.patchFlag === -2 && (_ = false, f.dynamicChildren = null);
    const { type: b, ref: P, shapeFlag: w } = f;
    switch (b) {
      case kt:
        Y(l, f, d, v);
        break;
      case ut:
        F(l, f, d, v);
        break;
      case fn:
        l == null && V(f, d, v, y);
        break;
      case Le:
        Je(l, f, d, v, g, m, y, x, _);
        break;
      default:
        w & 1 ? q(l, f, d, v, g, m, y, x, _) : w & 6 ? Ve(l, f, d, v, g, m, y, x, _) : (w & 64 || w & 128) && b.process(l, f, d, v, g, m, y, x, _, $e);
    }
    P != null && g ? St(P, l && l.ref, m, f || l, !f) : P == null && l && l.ref != null && St(l.ref, null, m, l, true);
  }, Y = (l, f, d, v) => {
    if (l == null) s(f.el = c(f.children), d, v);
    else {
      const g = f.el = l.el;
      f.children !== l.children && h(g, f.children);
    }
  }, F = (l, f, d, v) => {
    l == null ? s(f.el = u(f.children || ""), d, v) : f.el = l.el;
  }, V = (l, f, d, v) => {
    [l.el, l.anchor] = R(l.children, f, d, v, l.el, l.anchor);
  }, B = ({ el: l, anchor: f }, d, v) => {
    let g;
    for (; l && l !== f; ) g = C(l), s(l, d, v), l = g;
    s(f, d, v);
  }, T = ({ el: l, anchor: f }) => {
    let d;
    for (; l && l !== f; ) d = C(l), r(l), l = d;
    r(f);
  }, q = (l, f, d, v, g, m, y, x, _) => {
    f.type === "svg" ? y = "svg" : f.type === "math" && (y = "mathml"), l == null ? Z(f, d, v, g, m, y, x, _) : st(l, f, g, m, y, x, _);
  }, Z = (l, f, d, v, g, m, y, x) => {
    let _, b;
    const { props: P, shapeFlag: w, transition: E, dirs: M } = l;
    if (_ = l.el = o(l.type, m, P && P.is, P), w & 8 ? a(_, l.children) : w & 16 && ve(l.children, _, null, v, g, ln(l, m), y, x), M && Qe(l, null, v, "created"), he(_, l, l.scopeId, y, v), P) {
      for (const W in P) W !== "value" && !xt(W) && i(_, W, null, P[W], m, v);
      "value" in P && i(_, "value", null, P.value, m), (b = P.onVnodeBeforeMount) && Se(b, v, l);
    }
    M && Qe(l, null, v, "beforeMount");
    const D = Qi(g, E);
    D && E.beforeEnter(_), s(_, f, d), ((b = P && P.onVnodeMounted) || D || M) && ae(() => {
      b && Se(b, v, l), D && E.enter(_), M && Qe(l, null, v, "mounted");
    }, g);
  }, he = (l, f, d, v, g) => {
    if (d && S(l, d), v) for (let m = 0; m < v.length; m++) S(l, v[m]);
    if (g) {
      let m = g.subTree;
      if (f === m || pr(m.type) && (m.ssContent === f || m.ssFallback === f)) {
        const y = g.vnode;
        he(l, y, y.scopeId, y.slotScopeIds, g.parent);
      }
    }
  }, ve = (l, f, d, v, g, m, y, x, _ = 0) => {
    for (let b = _; b < l.length; b++) {
      const P = l[b] = x ? Ge(l[b]) : Pe(l[b]);
      I(null, P, f, d, v, g, m, y, x);
    }
  }, st = (l, f, d, v, g, m, y) => {
    const x = f.el = l.el;
    let { patchFlag: _, dynamicChildren: b, dirs: P } = f;
    _ |= l.patchFlag & 16;
    const w = l.props || K, E = f.props || K;
    let M;
    if (d && Ze(d, false), (M = E.onVnodeBeforeUpdate) && Se(M, d, f, l), P && Qe(f, l, d, "beforeUpdate"), d && Ze(d, true), (w.innerHTML && E.innerHTML == null || w.textContent && E.textContent == null) && a(x, ""), b ? be(l.dynamicChildren, b, x, d, v, ln(f, g), m) : y || H(l, f, x, null, d, v, ln(f, g), m, false), _ > 0) {
      if (_ & 16) Ae(x, w, E, d, g);
      else if (_ & 2 && w.class !== E.class && i(x, "class", null, E.class, g), _ & 4 && i(x, "style", w.style, E.style, g), _ & 8) {
        const D = f.dynamicProps;
        for (let W = 0; W < D.length; W++) {
          const N = D[W], le = w[N], ce = E[N];
          (ce !== le || N === "value") && i(x, N, le, ce, g, d);
        }
      }
      _ & 1 && l.children !== f.children && a(x, f.children);
    } else !y && b == null && Ae(x, w, E, d, g);
    ((M = E.onVnodeUpdated) || P) && ae(() => {
      M && Se(M, d, f, l), P && Qe(f, l, d, "updated");
    }, v);
  }, be = (l, f, d, v, g, m, y) => {
    for (let x = 0; x < f.length; x++) {
      const _ = l[x], b = f[x], P = _.el && (_.type === Le || !vt(_, b) || _.shapeFlag & 198) ? p(_.el) : d;
      I(_, b, P, null, v, g, m, y, true);
    }
  }, Ae = (l, f, d, v, g) => {
    if (f !== d) {
      if (f !== K) for (const m in f) !xt(m) && !(m in d) && i(l, m, f[m], null, g, v);
      for (const m in d) {
        if (xt(m)) continue;
        const y = d[m], x = f[m];
        y !== x && m !== "value" && i(l, m, x, y, g, v);
      }
      "value" in d && i(l, "value", f.value, d.value, g);
    }
  }, Je = (l, f, d, v, g, m, y, x, _) => {
    const b = f.el = l ? l.el : c(""), P = f.anchor = l ? l.anchor : c("");
    let { patchFlag: w, dynamicChildren: E, slotScopeIds: M } = f;
    M && (x = x ? x.concat(M) : M), l == null ? (s(b, d, v), s(P, d, v), ve(f.children || [], d, P, g, m, y, x, _)) : w > 0 && w & 64 && E && l.dynamicChildren ? (be(l.dynamicChildren, E, d, g, m, y, x), (f.key != null || g && f === g.subTree) && fr(l, f, true)) : H(l, f, d, P, g, m, y, x, _);
  }, Ve = (l, f, d, v, g, m, y, x, _) => {
    f.slotScopeIds = x, l == null ? f.shapeFlag & 512 ? g.ctx.activate(f, d, v, y, _) : Xe(f, d, v, g, m, y, _) : ht(l, f, _);
  }, Xe = (l, f, d, v, g, m, y) => {
    const x = l.component = bo(l, v, g);
    if (Js(l) && (x.ctx.renderer = $e), xo(x, false, y), x.asyncDep) {
      if (g && g.registerDep(x, X, y), !l.el) {
        const _ = x.subTree = ze(ut);
        F(null, _, f, d), l.placeholder = _.el;
      }
    } else X(x, l, f, d, g, m, y);
  }, ht = (l, f, d) => {
    const v = f.component = l.component;
    if (oo(l, f, d)) if (v.asyncDep && !v.asyncResolved) {
      j(v, f, d);
      return;
    } else v.next = f, v.update();
    else f.el = l.el, v.vnode = f;
  }, X = (l, f, d, v, g, m, y) => {
    const x = () => {
      if (l.isMounted) {
        let { next: w, bu: E, u: M, parent: D, vnode: W } = l;
        {
          const we = ur(l);
          if (we) {
            w && (w.el = W.el, j(l, w, y)), we.asyncDep.then(() => {
              l.isUnmounted || x();
            });
            return;
          }
        }
        let N = w, le;
        Ze(l, false), w ? (w.el = W.el, j(l, w, y)) : w = W, E && tn(E), (le = w.props && w.props.onVnodeBeforeUpdate) && Se(le, D, w, W), Ze(l, true);
        const ce = os(l), ye = l.subTree;
        l.subTree = ce, I(ye, ce, p(ye.el), Ie(ye), l, g, m), w.el = ce.el, N === null && lo(l, ce.el), M && ae(M, g), (le = w.props && w.props.onVnodeUpdated) && ae(() => Se(le, D, w, W), g);
      } else {
        let w;
        const { el: E, props: M } = f, { bm: D, m: W, parent: N, root: le, type: ce } = l, ye = Et(f);
        Ze(l, false), D && tn(D), !ye && (w = M && M.onVnodeBeforeMount) && Se(w, N, f), Ze(l, true);
        {
          le.ce && le.ce._def.shadowRoot !== false && le.ce._injectChildStyle(ce);
          const we = l.subTree = os(l);
          I(null, we, d, v, l, g, m), f.el = we.el;
        }
        if (W && ae(W, g), !ye && (w = M && M.onVnodeMounted)) {
          const we = f;
          ae(() => Se(w, N, we), g);
        }
        (f.shapeFlag & 256 || N && Et(N.vnode) && N.vnode.shapeFlag & 256) && l.a && ae(l.a, g), l.isMounted = true, f = d = v = null;
      }
    };
    l.scope.on();
    const _ = l.effect = new Ps(x);
    l.scope.off();
    const b = l.update = _.run.bind(_), P = l.job = _.runIfDirty.bind(_);
    P.i = l, P.id = l.uid, _.scheduler = () => Nn(P), Ze(l, true), b();
  }, j = (l, f, d) => {
    f.component = l;
    const v = l.vnode.props;
    l.vnode = f, l.next = null, Gi(l, f.props, v, d), Yi(l, f.children, d), Be(), kn(l), He();
  }, H = (l, f, d, v, g, m, y, x, _ = false) => {
    const b = l && l.children, P = l ? l.shapeFlag : 0, w = f.children, { patchFlag: E, shapeFlag: M } = f;
    if (E > 0) {
      if (E & 128) {
        rt(b, w, d, v, g, m, y, x, _);
        return;
      } else if (E & 256) {
        _e(b, w, d, v, g, m, y, x, _);
        return;
      }
    }
    M & 8 ? (P & 16 && xe(b, g, m), w !== b && a(d, w)) : P & 16 ? M & 16 ? rt(b, w, d, v, g, m, y, x, _) : xe(b, g, m, true) : (P & 8 && a(d, ""), M & 16 && ve(w, d, v, g, m, y, x, _));
  }, _e = (l, f, d, v, g, m, y, x, _) => {
    l = l || lt, f = f || lt;
    const b = l.length, P = f.length, w = Math.min(b, P);
    let E;
    for (E = 0; E < w; E++) {
      const M = f[E] = _ ? Ge(f[E]) : Pe(f[E]);
      I(l[E], M, d, null, g, m, y, x, _);
    }
    b > P ? xe(l, g, m, true, false, w) : ve(f, d, v, g, m, y, x, _, w);
  }, rt = (l, f, d, v, g, m, y, x, _) => {
    let b = 0;
    const P = f.length;
    let w = l.length - 1, E = P - 1;
    for (; b <= w && b <= E; ) {
      const M = l[b], D = f[b] = _ ? Ge(f[b]) : Pe(f[b]);
      if (vt(M, D)) I(M, D, d, null, g, m, y, x, _);
      else break;
      b++;
    }
    for (; b <= w && b <= E; ) {
      const M = l[w], D = f[E] = _ ? Ge(f[E]) : Pe(f[E]);
      if (vt(M, D)) I(M, D, d, null, g, m, y, x, _);
      else break;
      w--, E--;
    }
    if (b > w) {
      if (b <= E) {
        const M = E + 1, D = M < P ? f[M].el : v;
        for (; b <= E; ) I(null, f[b] = _ ? Ge(f[b]) : Pe(f[b]), d, D, g, m, y, x, _), b++;
      }
    } else if (b > E) for (; b <= w; ) pe(l[b], g, m, true), b++;
    else {
      const M = b, D = b, W = /* @__PURE__ */ new Map();
      for (b = D; b <= E; b++) {
        const ue = f[b] = _ ? Ge(f[b]) : Pe(f[b]);
        ue.key != null && W.set(ue.key, b);
      }
      let N, le = 0;
      const ce = E - D + 1;
      let ye = false, we = 0;
      const gt = new Array(ce);
      for (b = 0; b < ce; b++) gt[b] = 0;
      for (b = M; b <= w; b++) {
        const ue = l[b];
        if (le >= ce) {
          pe(ue, g, m, true);
          continue;
        }
        let Ce;
        if (ue.key != null) Ce = W.get(ue.key);
        else for (N = D; N <= E; N++) if (gt[N - D] === 0 && vt(ue, f[N])) {
          Ce = N;
          break;
        }
        Ce === void 0 ? pe(ue, g, m, true) : (gt[Ce - D] = b + 1, Ce >= we ? we = Ce : ye = true, I(ue, f[Ce], d, null, g, m, y, x, _), le++);
      }
      const zn = ye ? Zi(gt) : lt;
      for (N = zn.length - 1, b = ce - 1; b >= 0; b--) {
        const ue = D + b, Ce = f[ue], Yn = f[ue + 1], Jn = ue + 1 < P ? Yn.el || Yn.placeholder : v;
        gt[b] === 0 ? I(null, Ce, d, Jn, g, m, y, x, _) : ye && (N < 0 || b !== zn[N] ? Re(Ce, d, Jn, 2) : N--);
      }
    }
  }, Re = (l, f, d, v, g = null) => {
    const { el: m, type: y, transition: x, children: _, shapeFlag: b } = l;
    if (b & 6) {
      Re(l.component.subTree, f, d, v);
      return;
    }
    if (b & 128) {
      l.suspense.move(f, d, v);
      return;
    }
    if (b & 64) {
      y.move(l, f, d, $e);
      return;
    }
    if (y === Le) {
      s(m, f, d);
      for (let w = 0; w < _.length; w++) Re(_[w], f, d, v);
      s(l.anchor, f, d);
      return;
    }
    if (y === fn) {
      B(l, f, d);
      return;
    }
    if (v !== 2 && b & 1 && x) if (v === 0) x.beforeEnter(m), s(m, f, d), ae(() => x.enter(m), g);
    else {
      const { leave: w, delayLeave: E, afterLeave: M } = x, D = () => {
        l.ctx.isUnmounted ? r(m) : s(m, f, d);
      }, W = () => {
        w(m, () => {
          D(), M && M();
        });
      };
      E ? E(m, D, W) : W();
    }
    else s(m, f, d);
  }, pe = (l, f, d, v = false, g = false) => {
    const { type: m, props: y, ref: x, children: _, dynamicChildren: b, shapeFlag: P, patchFlag: w, dirs: E, cacheIndex: M } = l;
    if (w === -2 && (g = false), x != null && (Be(), St(x, null, d, l, true), He()), M != null && (f.renderCache[M] = void 0), P & 256) {
      f.ctx.deactivate(l);
      return;
    }
    const D = P & 1 && E, W = !Et(l);
    let N;
    if (W && (N = y && y.onVnodeBeforeUnmount) && Se(N, f, l), P & 6) oe(l.component, d, v);
    else {
      if (P & 128) {
        l.suspense.unmount(d, v);
        return;
      }
      D && Qe(l, null, f, "beforeUnmount"), P & 64 ? l.type.remove(l, f, d, $e, v) : b && !b.hasOnce && (m !== Le || w > 0 && w & 64) ? xe(b, f, d, false, true) : (m === Le && w & 384 || !g && P & 16) && xe(_, f, d), v && $(l);
    }
    (W && (N = y && y.onVnodeUnmounted) || D) && ae(() => {
      N && Se(N, f, l), D && Qe(l, null, f, "unmounted");
    }, d);
  }, $ = (l) => {
    const { type: f, el: d, anchor: v, transition: g } = l;
    if (f === Le) {
      z(d, v);
      return;
    }
    if (f === fn) {
      T(l);
      return;
    }
    const m = () => {
      r(d), g && !g.persisted && g.afterLeave && g.afterLeave();
    };
    if (l.shapeFlag & 1 && g && !g.persisted) {
      const { leave: y, delayLeave: x } = g, _ = () => y(d, m);
      x ? x(l.el, m, _) : _();
    } else m();
  }, z = (l, f) => {
    let d;
    for (; l !== f; ) d = C(l), r(l), l = d;
    r(f);
  }, oe = (l, f, d) => {
    const { bum: v, scope: g, job: m, subTree: y, um: x, m: _, a: b, parent: P, slots: { __: w } } = l;
    is(_), is(b), v && tn(v), P && O(w) && w.forEach((E) => {
      P.renderCache[E] = void 0;
    }), g.stop(), m && (m.flags |= 8, pe(y, l, f, d)), x && ae(x, f), ae(() => {
      l.isUnmounted = true;
    }, f), f && f.pendingBranch && !f.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
  }, xe = (l, f, d, v = false, g = false, m = 0) => {
    for (let y = m; y < l.length; y++) pe(l[y], f, d, v, g);
  }, Ie = (l) => {
    if (l.shapeFlag & 6) return Ie(l.component.subTree);
    if (l.shapeFlag & 128) return l.suspense.next();
    const f = C(l.anchor || l.el), d = f && f[xi];
    return d ? C(d) : f;
  };
  let je = false;
  const pt = (l, f, d) => {
    l == null ? f._vnode && pe(f._vnode, null, null, true) : I(f._vnode || null, l, f, null, null, null, d), f._vnode = l, je || (je = true, kn(), Gs(), je = false);
  }, $e = { p: I, um: pe, m: Re, r: $, mt: Xe, mc: ve, pc: H, pbc: be, n: Ie, o: e };
  return { render: pt, hydrate: void 0, createApp: ji(pt) };
}
function ln({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function Ze({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Qi(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function fr(e, t, n = false) {
  const s = e.children, r = t.children;
  if (O(s) && O(r)) for (let i = 0; i < s.length; i++) {
    const o = s[i];
    let c = r[i];
    c.shapeFlag & 1 && !c.dynamicChildren && ((c.patchFlag <= 0 || c.patchFlag === 32) && (c = r[i] = Ge(r[i]), c.el = o.el), !n && c.patchFlag !== -2 && fr(o, c)), c.type === kt && (c.el = o.el), c.type === ut && !c.el && (c.el = o.el);
  }
}
function Zi(e) {
  const t = e.slice(), n = [0];
  let s, r, i, o, c;
  const u = e.length;
  for (s = 0; s < u; s++) {
    const h = e[s];
    if (h !== 0) {
      if (r = n[n.length - 1], e[r] < h) {
        t[s] = r, n.push(s);
        continue;
      }
      for (i = 0, o = n.length - 1; i < o; ) c = i + o >> 1, e[n[c]] < h ? i = c + 1 : o = c;
      h < e[n[i]] && (i > 0 && (t[s] = n[i - 1]), n[i] = s);
    }
  }
  for (i = n.length, o = n[i - 1]; i-- > 0; ) n[i] = o, o = t[o];
  return n;
}
function ur(e) {
  const t = e.subTree.component;
  if (t) return t.asyncDep && !t.asyncResolved ? t : ur(t);
}
function is(e) {
  if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
const ki = Symbol.for("v-scx"), eo = () => Ht(ki);
function cn(e, t, n) {
  return ar(e, t, n);
}
function ar(e, t, n = K) {
  const { immediate: s, deep: r, flush: i, once: o } = n, c = te({}, n), u = t && s || !t && i !== "post";
  let h;
  if (It) {
    if (i === "sync") {
      const S = eo();
      h = S.__watcherHandles || (S.__watcherHandles = []);
    } else if (!u) {
      const S = () => {
      };
      return S.stop = Me, S.resume = Me, S.pause = Me, S;
    }
  }
  const a = ie;
  c.call = (S, R, I) => Oe(S, a, R, I);
  let p = false;
  i === "post" ? c.scheduler = (S) => {
    ae(S, a && a.suspense);
  } : i !== "sync" && (p = true, c.scheduler = (S, R) => {
    R ? S() : Nn(S);
  }), c.augmentJob = (S) => {
    t && (S.flags |= 4), p && (S.flags |= 2, a && (S.id = a.uid, S.i = a));
  };
  const C = pi(e, t, c);
  return It && (h ? h.push(C) : u && C()), C;
}
function to(e, t, n) {
  const s = this.proxy, r = Q(e) ? e.includes(".") ? dr(s, e) : () => s[e] : e.bind(s, s);
  let i;
  A(t) ? i = t : (i = t.handler, n = t);
  const o = Dt(this), c = ar(r, i.bind(s), n);
  return o(), c;
}
function dr(e, t) {
  const n = t.split(".");
  return () => {
    let s = e;
    for (let r = 0; r < n.length && s; r++) s = s[n[r]];
    return s;
  };
}
const no = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Ye(t)}Modifiers`] || e[`${nt(t)}Modifiers`];
function so(e, t, ...n) {
  if (e.isUnmounted) return;
  const s = e.vnode.props || K;
  let r = n;
  const i = t.startsWith("update:"), o = i && no(s, t.slice(7));
  o && (o.trim && (r = n.map((a) => Q(a) ? a.trim() : a)), o.number && (r = n.map(Rr)));
  let c, u = s[c = en(t)] || s[c = en(Ye(t))];
  !u && i && (u = s[c = en(nt(t))]), u && Oe(u, e, 6, r);
  const h = s[c + "Once"];
  if (h) {
    if (!e.emitted) e.emitted = {};
    else if (e.emitted[c]) return;
    e.emitted[c] = true, Oe(h, e, 6, r);
  }
}
function hr(e, t, n = false) {
  const s = t.emitsCache, r = s.get(e);
  if (r !== void 0) return r;
  const i = e.emits;
  let o = {}, c = false;
  if (!A(e)) {
    const u = (h) => {
      const a = hr(h, t, true);
      a && (c = true, te(o, a));
    };
    !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
  }
  return !i && !c ? (J(e) && s.set(e, null), null) : (O(i) ? i.forEach((u) => o[u] = null) : te(o, i), J(e) && s.set(e, o), o);
}
function Zt(e, t) {
  return !e || !qt(t) ? false : (t = t.slice(2).replace(/Once$/, ""), U(e, t[0].toLowerCase() + t.slice(1)) || U(e, nt(t)) || U(e, t));
}
function os(e) {
  const { type: t, vnode: n, proxy: s, withProxy: r, propsOptions: [i], slots: o, attrs: c, emit: u, render: h, renderCache: a, props: p, data: C, setupState: S, ctx: R, inheritAttrs: I } = e, Y = Wt(e);
  let F, V;
  try {
    if (n.shapeFlag & 4) {
      const T = r || s, q = T;
      F = Pe(h.call(q, T, a, p, S, C, R)), V = c;
    } else {
      const T = t;
      F = Pe(T.length > 1 ? T(p, { attrs: c, slots: o, emit: u }) : T(p, null)), V = t.props ? c : ro(c);
    }
  } catch (T) {
    Tt.length = 0, Xt(T, e, 1), F = ze(ut);
  }
  let B = F;
  if (V && I !== false) {
    const T = Object.keys(V), { shapeFlag: q } = B;
    T.length && q & 7 && (i && T.some(En) && (V = io(V, i)), B = at(B, V, false, true));
  }
  return n.dirs && (B = at(B, null, false, true), B.dirs = B.dirs ? B.dirs.concat(n.dirs) : n.dirs), n.transition && Vn(B, n.transition), F = B, Wt(Y), F;
}
const ro = (e) => {
  let t;
  for (const n in e) (n === "class" || n === "style" || qt(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, io = (e, t) => {
  const n = {};
  for (const s in e) (!En(s) || !(s.slice(9) in t)) && (n[s] = e[s]);
  return n;
};
function oo(e, t, n) {
  const { props: s, children: r, component: i } = e, { props: o, children: c, patchFlag: u } = t, h = i.emitsOptions;
  if (t.dirs || t.transition) return true;
  if (n && u >= 0) {
    if (u & 1024) return true;
    if (u & 16) return s ? ls(s, o, h) : !!o;
    if (u & 8) {
      const a = t.dynamicProps;
      for (let p = 0; p < a.length; p++) {
        const C = a[p];
        if (o[C] !== s[C] && !Zt(h, C)) return true;
      }
    }
  } else return (r || c) && (!c || !c.$stable) ? true : s === o ? false : s ? o ? ls(s, o, h) : true : !!o;
  return false;
}
function ls(e, t, n) {
  const s = Object.keys(t);
  if (s.length !== Object.keys(e).length) return true;
  for (let r = 0; r < s.length; r++) {
    const i = s[r];
    if (t[i] !== e[i] && !Zt(n, i)) return true;
  }
  return false;
}
function lo({ vnode: e, parent: t }, n) {
  for (; t; ) {
    const s = t.subTree;
    if (s.suspense && s.suspense.activeBranch === e && (s.el = e.el), s === e) (e = t.vnode).el = n, t = t.parent;
    else break;
  }
}
const pr = (e) => e.__isSuspense;
function co(e, t) {
  t && t.pendingBranch ? O(e) ? t.effects.push(...e) : t.effects.push(e) : bi(e);
}
const Le = Symbol.for("v-fgt"), kt = Symbol.for("v-txt"), ut = Symbol.for("v-cmt"), fn = Symbol.for("v-stc"), Tt = [];
let de = null;
function gr(e = false) {
  Tt.push(de = e ? null : []);
}
function fo() {
  Tt.pop(), de = Tt[Tt.length - 1] || null;
}
let Rt = 1;
function cs(e, t = false) {
  Rt += e, e < 0 && de && t && (de.hasOnce = true);
}
function uo(e) {
  return e.dynamicChildren = Rt > 0 ? de || lt : null, fo(), Rt > 0 && de && de.push(e), e;
}
function mr(e, t, n, s, r, i) {
  return uo(_r(e, t, n, s, r, i, true));
}
function vr(e) {
  return e ? e.__v_isVNode === true : false;
}
function vt(e, t) {
  return e.type === t.type && e.key === t.key;
}
const br = ({ key: e }) => e ?? null, Nt = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? Q(e) || ee(e) || A(e) ? { i: Te, r: e, k: t, f: !!n } : e : null);
function _r(e, t = null, n = null, s = 0, r = null, i = e === Le ? 0 : 1, o = false, c = false) {
  const u = { __v_isVNode: true, __v_skip: true, type: e, props: t, key: t && br(t), ref: t && Nt(t), scopeId: qs, slotScopeIds: null, children: n, component: null, suspense: null, ssContent: null, ssFallback: null, dirs: null, transition: null, el: null, anchor: null, target: null, targetStart: null, targetAnchor: null, staticCount: 0, shapeFlag: i, patchFlag: s, dynamicProps: r, dynamicChildren: null, appContext: null, ctx: Te };
  return c ? (Gn(u, n), i & 128 && e.normalize(u)) : n && (u.shapeFlag |= Q(n) ? 8 : 16), Rt > 0 && !o && de && (u.patchFlag > 0 || i & 6) && u.patchFlag !== 32 && de.push(u), u;
}
const ze = ao;
function ao(e, t = null, n = null, s = 0, r = null, i = false) {
  if ((!e || e === Fi) && (e = ut), vr(e)) {
    const c = at(e, t, true);
    return n && Gn(c, n), Rt > 0 && !i && de && (c.shapeFlag & 6 ? de[de.indexOf(e)] = c : de.push(c)), c.patchFlag = -2, c;
  }
  if (So(e) && (e = e.__vccOpts), t) {
    t = ho(t);
    let { class: c, style: u } = t;
    c && !Q(c) && (t.class = On(c)), J(u) && (Hn(u) && !O(u) && (u = te({}, u)), t.style = Mn(u));
  }
  const o = Q(e) ? 1 : pr(e) ? 128 : yi(e) ? 64 : J(e) ? 4 : A(e) ? 2 : 0;
  return _r(e, t, n, s, r, o, i, true);
}
function ho(e) {
  return e ? Hn(e) || sr(e) ? te({}, e) : e : null;
}
function at(e, t, n = false, s = false) {
  const { props: r, ref: i, patchFlag: o, children: c, transition: u } = e, h = t ? go(r || {}, t) : r, a = { __v_isVNode: true, __v_skip: true, type: e.type, props: h, key: h && br(h), ref: t && t.ref ? n && i ? O(i) ? i.concat(Nt(t)) : [i, Nt(t)] : Nt(t) : i, scopeId: e.scopeId, slotScopeIds: e.slotScopeIds, children: c, target: e.target, targetStart: e.targetStart, targetAnchor: e.targetAnchor, staticCount: e.staticCount, shapeFlag: e.shapeFlag, patchFlag: t && e.type !== Le ? o === -1 ? 16 : o | 16 : o, dynamicProps: e.dynamicProps, dynamicChildren: e.dynamicChildren, appContext: e.appContext, dirs: e.dirs, transition: u, component: e.component, suspense: e.suspense, ssContent: e.ssContent && at(e.ssContent), ssFallback: e.ssFallback && at(e.ssFallback), placeholder: e.placeholder, el: e.el, anchor: e.anchor, ctx: e.ctx, ce: e.ce };
  return u && s && Vn(a, u.clone(a)), a;
}
function po(e = " ", t = 0) {
  return ze(kt, null, e, t);
}
function Pe(e) {
  return e == null || typeof e == "boolean" ? ze(ut) : O(e) ? ze(Le, null, e.slice()) : vr(e) ? Ge(e) : ze(kt, null, String(e));
}
function Ge(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : at(e);
}
function Gn(e, t) {
  let n = 0;
  const { shapeFlag: s } = e;
  if (t == null) t = null;
  else if (O(t)) n = 16;
  else if (typeof t == "object") if (s & 65) {
    const r = t.default;
    r && (r._c && (r._d = false), Gn(e, r()), r._c && (r._d = true));
    return;
  } else {
    n = 32;
    const r = t._;
    !r && !sr(t) ? t._ctx = Te : r === 3 && Te && (Te.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
  }
  else A(t) ? (t = { default: t, _ctx: Te }, n = 32) : (t = String(t), s & 64 ? (n = 16, t = [po(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function go(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const s = e[n];
    for (const r in s) if (r === "class") t.class !== s.class && (t.class = On([t.class, s.class]));
    else if (r === "style") t.style = Mn([t.style, s.style]);
    else if (qt(r)) {
      const i = t[r], o = s[r];
      o && i !== o && !(O(i) && i.includes(o)) && (t[r] = i ? [].concat(i, o) : o);
    } else r !== "" && (t[r] = s[r]);
  }
  return t;
}
function Se(e, t, n, s = null) {
  Oe(e, t, 7, [n, s]);
}
const mo = er();
let vo = 0;
function bo(e, t, n) {
  const s = e.type, r = (t ? t.appContext : e.appContext) || mo, i = { uid: vo++, vnode: e, type: s, parent: t, appContext: r, root: null, next: null, subTree: null, effect: null, update: null, job: null, scope: new Hr(true), render: null, proxy: null, exposed: null, exposeProxy: null, withProxy: null, provides: t ? t.provides : Object.create(r.provides), ids: t ? t.ids : ["", 0, 0], accessCache: null, renderCache: [], components: null, directives: null, propsOptions: ir(s, r), emitsOptions: hr(s, r), emit: null, emitted: null, propsDefaults: K, inheritAttrs: s.inheritAttrs, ctx: K, data: K, props: K, attrs: K, slots: K, refs: K, setupState: K, setupContext: null, suspense: n, suspenseId: n ? n.pendingId : 0, asyncDep: null, asyncResolved: false, isMounted: false, isUnmounted: false, isDeactivated: false, bc: null, c: null, bm: null, m: null, bu: null, u: null, um: null, bum: null, da: null, a: null, rtg: null, rtc: null, ec: null, sp: null };
  return i.ctx = { _: i }, i.root = t ? t.root : i, i.emit = so.bind(null, i), e.ce && e.ce(i), i;
}
let ie = null;
const _o = () => ie || Te;
let Kt, wn;
{
  const e = Jt(), t = (n, s) => {
    let r;
    return (r = e[n]) || (r = e[n] = []), r.push(s), (i) => {
      r.length > 1 ? r.forEach((o) => o(i)) : r[0](i);
    };
  };
  Kt = t("__VUE_INSTANCE_SETTERS__", (n) => ie = n), wn = t("__VUE_SSR_SETTERS__", (n) => It = n);
}
const Dt = (e) => {
  const t = ie;
  return Kt(e), e.scope.on(), () => {
    e.scope.off(), Kt(t);
  };
}, fs = () => {
  ie && ie.scope.off(), Kt(null);
};
function xr(e) {
  return e.vnode.shapeFlag & 4;
}
let It = false;
function xo(e, t = false, n = false) {
  t && wn(t);
  const { props: s, children: r } = e.vnode, i = xr(e);
  Wi(e, s, i, t), zi(e, r, n || t);
  const o = i ? yo(e, t) : void 0;
  return t && wn(false), o;
}
function yo(e, t) {
  const n = e.type;
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Di);
  const { setup: s } = n;
  if (s) {
    Be();
    const r = e.setupContext = s.length > 1 ? Co(e) : null, i = Dt(e), o = Ft(s, e, 0, [e.props, r]), c = Cs(o);
    if (He(), i(), (c || e.sp) && !Et(e) && Ys(e), c) {
      if (o.then(fs, fs), t) return o.then((u) => {
        us(e, u);
      }).catch((u) => {
        Xt(u, e, 0);
      });
      e.asyncDep = o;
    } else us(e, o);
  } else yr(e);
}
function us(e, t, n) {
  A(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : J(t) && (e.setupState = js(t)), yr(e);
}
function yr(e, t, n) {
  const s = e.type;
  e.render || (e.render = s.render || Me);
  {
    const r = Dt(e);
    Be();
    try {
      Li(e);
    } finally {
      He(), r();
    }
  }
}
const wo = { get(e, t) {
  return k(e, "get", ""), e[t];
} };
function Co(e) {
  const t = (n) => {
    e.exposed = n || {};
  };
  return { attrs: new Proxy(e.attrs, wo), slots: e.slots, emit: e.emit, expose: t };
}
function Kn(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(js(ii(e.exposed)), { get(t, n) {
    if (n in t) return t[n];
    if (n in Pt) return Pt[n](e);
  }, has(t, n) {
    return n in t || n in Pt;
  } })) : e.proxy;
}
function So(e) {
  return A(e) && "__vccOpts" in e;
}
const Eo = (e, t) => di(e, t, It), Po = "3.5.18";
/**
* @vue/runtime-dom v3.5.18
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
let Cn;
const as = typeof window < "u" && window.trustedTypes;
if (as) try {
  Cn = as.createPolicy("vue", { createHTML: (e) => e });
} catch {
}
const wr = Cn ? (e) => Cn.createHTML(e) : (e) => e, To = "http://www.w3.org/2000/svg", Mo = "http://www.w3.org/1998/Math/MathML", De = typeof document < "u" ? document : null, ds = De && De.createElement("template"), Oo = { insert: (e, t, n) => {
  t.insertBefore(e, n || null);
}, remove: (e) => {
  const t = e.parentNode;
  t && t.removeChild(e);
}, createElement: (e, t, n, s) => {
  const r = t === "svg" ? De.createElementNS(To, e) : t === "mathml" ? De.createElementNS(Mo, e) : n ? De.createElement(e, { is: n }) : De.createElement(e);
  return e === "select" && s && s.multiple != null && r.setAttribute("multiple", s.multiple), r;
}, createText: (e) => De.createTextNode(e), createComment: (e) => De.createComment(e), setText: (e, t) => {
  e.nodeValue = t;
}, setElementText: (e, t) => {
  e.textContent = t;
}, parentNode: (e) => e.parentNode, nextSibling: (e) => e.nextSibling, querySelector: (e) => De.querySelector(e), setScopeId(e, t) {
  e.setAttribute(t, "");
}, insertStaticContent(e, t, n, s, r, i) {
  const o = n ? n.previousSibling : t.lastChild;
  if (r && (r === i || r.nextSibling)) for (; t.insertBefore(r.cloneNode(true), n), !(r === i || !(r = r.nextSibling)); ) ;
  else {
    ds.innerHTML = wr(s === "svg" ? `<svg>${e}</svg>` : s === "mathml" ? `<math>${e}</math>` : e);
    const c = ds.content;
    if (s === "svg" || s === "mathml") {
      const u = c.firstChild;
      for (; u.firstChild; ) c.appendChild(u.firstChild);
      c.removeChild(u);
    }
    t.insertBefore(c, n);
  }
  return [o ? o.nextSibling : t.firstChild, n ? n.previousSibling : t.lastChild];
} }, Ao = Symbol("_vtc");
function Ro(e, t, n) {
  const s = e[Ao];
  s && (t = (t ? [t, ...s] : [...s]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
const hs = Symbol("_vod"), Io = Symbol("_vsh"), Fo = Symbol(""), Do = /(^|;)\s*display\s*:/;
function Lo(e, t, n) {
  const s = e.style, r = Q(n);
  let i = false;
  if (n && !r) {
    if (t) if (Q(t)) for (const o of t.split(";")) {
      const c = o.slice(0, o.indexOf(":")).trim();
      n[c] == null && Vt(s, c, "");
    }
    else for (const o in t) n[o] == null && Vt(s, o, "");
    for (const o in n) o === "display" && (i = true), Vt(s, o, n[o]);
  } else if (r) {
    if (t !== n) {
      const o = s[Fo];
      o && (n += ";" + o), s.cssText = n, i = Do.test(n);
    }
  } else t && e.removeAttribute("style");
  hs in e && (e[hs] = i ? s.display : "", e[Io] && (s.display = "none"));
}
const ps = /\s*!important$/;
function Vt(e, t, n) {
  if (O(n)) n.forEach((s) => Vt(e, t, s));
  else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
  else {
    const s = Uo(e, t);
    ps.test(n) ? e.setProperty(nt(s), n.replace(ps, ""), "important") : e[s] = n;
  }
}
const gs = ["Webkit", "Moz", "ms"], un = {};
function Uo(e, t) {
  const n = un[t];
  if (n) return n;
  let s = Ye(t);
  if (s !== "filter" && s in e) return un[t] = s;
  s = Ss(s);
  for (let r = 0; r < gs.length; r++) {
    const i = gs[r] + s;
    if (i in e) return un[t] = i;
  }
  return t;
}
const ms = "http://www.w3.org/1999/xlink";
function vs(e, t, n, s, r, i = Br(t)) {
  s && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(ms, t.slice(6, t.length)) : e.setAttributeNS(ms, t, n) : n == null || i && !Es(n) ? e.removeAttribute(t) : e.setAttribute(t, i ? "" : dt(n) ? String(n) : n);
}
function bs(e, t, n, s, r) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? wr(n) : n);
    return;
  }
  const i = e.tagName;
  if (t === "value" && i !== "PROGRESS" && !i.includes("-")) {
    const c = i === "OPTION" ? e.getAttribute("value") || "" : e.value, u = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
    (c !== u || !("_value" in e)) && (e.value = u), n == null && e.removeAttribute(t), e._value = n;
    return;
  }
  let o = false;
  if (n === "" || n == null) {
    const c = typeof e[t];
    c === "boolean" ? n = Es(n) : n == null && c === "string" ? (n = "", o = true) : c === "number" && (n = 0, o = true);
  }
  try {
    e[t] = n;
  } catch {
  }
  o && e.removeAttribute(r || t);
}
function Bo(e, t, n, s) {
  e.addEventListener(t, n, s);
}
function Ho(e, t, n, s) {
  e.removeEventListener(t, n, s);
}
const _s = Symbol("_vei");
function No(e, t, n, s, r = null) {
  const i = e[_s] || (e[_s] = {}), o = i[t];
  if (s && o) o.value = s;
  else {
    const [c, u] = Vo(t);
    if (s) {
      const h = i[t] = Wo(s, r);
      Bo(e, c, h, u);
    } else o && (Ho(e, c, o, u), i[t] = void 0);
  }
}
const xs = /(?:Once|Passive|Capture)$/;
function Vo(e) {
  let t;
  if (xs.test(e)) {
    t = {};
    let s;
    for (; s = e.match(xs); ) e = e.slice(0, e.length - s[0].length), t[s[0].toLowerCase()] = true;
  }
  return [e[2] === ":" ? e.slice(3) : nt(e.slice(2)), t];
}
let an = 0;
const jo = Promise.resolve(), $o = () => an || (jo.then(() => an = 0), an = Date.now());
function Wo(e, t) {
  const n = (s) => {
    if (!s._vts) s._vts = Date.now();
    else if (s._vts <= n.attached) return;
    Oe(Go(s, n.value), t, 5, [s]);
  };
  return n.value = e, n.attached = $o(), n;
}
function Go(e, t) {
  if (O(t)) {
    const n = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      n.call(e), e._stopped = true;
    }, t.map((s) => (r) => !r._stopped && s && s(r));
  } else return t;
}
const ys = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Ko = (e, t, n, s, r, i) => {
  const o = r === "svg";
  t === "class" ? Ro(e, s, o) : t === "style" ? Lo(e, n, s) : qt(t) ? En(t) || No(e, t, n, s, i) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : qo(e, t, s, o)) ? (bs(e, t, s), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && vs(e, t, s, o, i, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !Q(s)) ? bs(e, Ye(t), s, i, t) : (t === "true-value" ? e._trueValue = s : t === "false-value" && (e._falseValue = s), vs(e, t, s, o));
};
function qo(e, t, n, s) {
  if (s) return !!(t === "innerHTML" || t === "textContent" || t in e && ys(t) && A(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
  if (t === "width" || t === "height") {
    const r = e.tagName;
    if (r === "IMG" || r === "VIDEO" || r === "CANVAS" || r === "SOURCE") return false;
  }
  return ys(t) && Q(n) ? false : t in e;
}
const zo = te({ patchProp: Ko }, Oo);
let ws;
function Yo() {
  return ws || (ws = Ji(zo));
}
const Jo = (...e) => {
  const t = Yo().createApp(...e), { mount: n } = t;
  return t.mount = (s) => {
    const r = Qo(s);
    if (!r) return;
    const i = t._component;
    !A(i) && !i.render && !i.template && (i.template = r.innerHTML), r.nodeType === 1 && (r.textContent = "");
    const o = n(r, false, Xo(r));
    return r instanceof Element && (r.removeAttribute("v-cloak"), r.setAttribute("data-v-app", "")), o;
  }, t;
};
function Xo(e) {
  if (e instanceof SVGElement) return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
}
function Qo(e) {
  return Q(e) ? document.querySelector(e) : e;
}
const Zo = `
struct MandelbrotStep {
zx: f32,
zy: f32,
dx: f32,
dy: f32,
};

struct Uniforms {
cx: f32,
cy: f32,
scale: f32,
aspect: f32,
angle: f32,
maxIteration: f32,
epsilon: f32,
antialiasLevel: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

//@group(0) @binding(1) var<storage, read> mandelbrot: array<MandelbrotStep>;

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

fn mandelbrot_func(x0: f32, y0: f32) -> vec2<f32> {
//  let max_iter_f: f32 = clamp(80.0 + 40.0 * log2(1.0 / uniforms.scale), 128.0, 1000000.0);
  let max_iter: u32 = u32(uniforms.maxIteration);
  var x: f32 = 0.0;
  var y: f32 = 0.0;
  var iter: u32 = 0;
  var x2: f32 = 0.0;
  var y2: f32 = 0.0;
  var dx: f32 = 0.0;
  var dy: f32 = 0.0;
  var w = 0.0;
  var d: f32 = 1.0;
  while (x2 + y2 <= 100.0 && iter < max_iter) {
    x = x2 - y2 + x0;
    y = w - x2 - y2 + y0;
    x2 = x*x;
    y2 = y*y;
    w = (x + y) * (x + y);
    // compute derivative d
    d = 2.0 * sqrt(x2 + y2) * d + 1.0;
    iter += 1;
  }
  var nu = 0.0;
  if(x2 + y2 > 100.0) {
      let log_zn = log(x2 + y2) / 2.0;
      nu = f32(iter) + 1.0 - log(log_zn / log(2.0)) / log(2.0);
  }
  return vec2<f32>(nu, d);
}
fn rotate(x: f32, y: f32, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * x - s * y, s * x + c * y);
}
@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  var xy = rotate((fragCoord.x * 2.0 - 1.0) * uniforms.scale * uniforms.aspect, (fragCoord.y * 2.0 - 1.0) * uniforms.scale, uniforms.angle);
  let x0 = xy.x + uniforms.cx;
  let y0 = xy.y + uniforms.cy;
  let res = mandelbrot_func(x0, y0);
  return vec4<f32>(res.x, res.y, 0.0, 1.0);
}











`, ko = `struct Uniforms {
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
  // Effet tunnel\xA0: on replie le rayon pour cr\xE9er des anneaux
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
      let glowColor = vec3<f32>(0.2, 0.4, 1.0);
      let glow = exp(-d * 3.0);
      sampleColor = glowColor * glow;
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
}`;
class el {
  constructor(t, n) {
    __publicField(this, "canvas");
    __publicField(this, "device");
    __publicField(this, "queue");
    __publicField(this, "adapter");
    __publicField(this, "ctx");
    __publicField(this, "format");
    __publicField(this, "intermediateTexture");
    __publicField(this, "intermediateView");
    __publicField(this, "sampler");
    __publicField(this, "uniformBufferMandelbrot");
    __publicField(this, "uniformBufferColor");
    __publicField(this, "mandelbrotBuffer");
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
    this.canvas = t, this.shaderPass1 = Zo, this.shaderPass2 = ko, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = { maxIterations: 1, epsilon: 0, angle: 0, scale: 1, cy: 0, cx: 0 };
  }
  async initialize() {
    if (!navigator.gpu) throw new Error("WebGPU non support\xE9");
    if (this.adapter = await navigator.gpu.requestAdapter(), !this.adapter) throw new Error("Adapter WebGPU introuvable");
    this.device = await this.adapter.requestDevice(), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({ device: this.device, format: this.format, alphaMode: "opaque" }), this.sampler = this.device.createSampler({ magFilter: "linear", minFilter: "linear", mipmapFilter: "nearest" }), this.sampler.label = "Engine Sampler", this.uniformBufferMandelbrot = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "Engine UniformBuffer Mandelbrot" }), this.uniformBufferColor = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "Engine UniformBuffer Color" }), this.mandelbrotBuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "Engine Mandelbrot Orbit Storage Buffer" }), await this._createPipelines(), this.resize();
  }
  async _createPipelines() {
    const t = this.device.createShaderModule({ code: this.shaderPass1, label: "Engine ShaderModule Pass1" }), n = this.device.createShaderModule({ code: this.shaderPass2, label: "Engine ShaderModule Pass2" });
    this.pipeline1 = this.device.createRenderPipeline({ layout: "auto", vertex: { module: t, entryPoint: "vs_main" }, fragment: { module: t, entryPoint: "fs_main", targets: [{ format: "rgba16float" }] }, primitive: { topology: "triangle-list" }, label: "Engine RenderPipeline Pass Mandelbrot" }), this.pipeline2 = this.device.createRenderPipeline({ layout: "auto", vertex: { module: n, entryPoint: "vs_main" }, fragment: { module: n, entryPoint: "fs_main", targets: [{ format: this.format }] }, primitive: { topology: "triangle-list" }, label: "Engine RenderPipeline Pass Color" });
    const s = this.pipeline1.getBindGroupLayout(0);
    s.label = "Engine RenderPipeline Mandelbrot", this.bindGroup1 = this.device.createBindGroup({ layout: s, entries: [{ binding: 0, resource: { buffer: this.uniformBufferMandelbrot } }], label: "Engine BindGroup Pass Mandelbrot" }), this.bindGroup2 = void 0;
  }
  resize() {
    var _a, _b;
    const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, s = (n == null ? void 0 : n.clientWidth) ?? this.canvas.clientWidth, r = (n == null ? void 0 : n.clientHeight) ?? this.canvas.clientHeight;
    if (this.width = Math.max(1, Math.round(s * t)), this.height = Math.max(1, Math.round(r * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = s + "px", this.canvas.style.height = r + "px", this.ctx.configure({ device: this.device, format: this.format, alphaMode: "opaque" }), this.intermediateTexture && ((_b = (_a = this.intermediateTexture).destroy) == null ? void 0 : _b.call(_a)), this.intermediateTexture = this.device.createTexture({ size: { width: this.width, height: this.height, depthOrArrayLayers: 1 }, format: "rgba16float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING, label: "Engine IntermediateTexture" }), this.intermediateView = this.intermediateTexture.createView(), this.intermediateView.label = "Engine IntermediateTextureView", this.pipeline2) {
      const i = this.pipeline2.getBindGroupLayout(0);
      i.label = "Engine IntermediateTextureView";
      const o = [{ binding: 0, resource: { buffer: this.uniformBufferColor } }, { binding: 1, resource: this.intermediateView }];
      this.bindGroup2 = this.device.createBindGroup({ layout: i, entries: o, label: "Engine BindGroup Color Pass" });
    }
  }
  areObjectsEqual(t, n) {
    const s = Object.keys(t), r = Object.keys(n);
    if (s.length !== r.length) return false;
    for (const i of s) if (t[i] !== n[i]) return false;
    return true;
  }
  update(t, n) {
    this.previousMandelbrot && (this.needRender = !this.areObjectsEqual(t, this.previousMandelbrot));
    const s = this.width / Math.max(1, this.height), r = new Float32Array([t.cx, t.cy, t.scale, s, t.angle, t.maxIterations, t.epsilon, n.antialiasLevel]);
    this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, r.buffer);
    let i = this.previousMandelbrot.scale / t.scale;
    i < 1 && (i = 1 / i), i -= 1;
    const o = new Float32Array([n.palettePeriod, i * 2, 0, 0]);
    this.device.queue.writeBuffer(this.uniformBufferColor, 0, o.buffer), this.previousMandelbrot = t;
  }
  render() {
    if (!this.needRender || (console.count("Rendering"), !this.pipeline1 || !this.pipeline2)) return;
    const t = this.device.createCommandEncoder(), n = t.beginRenderPass({ colorAttachments: [{ view: this.intermediateView, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }] });
    n.setPipeline(this.pipeline1), this.bindGroup1 && n.setBindGroup(0, this.bindGroup1), n.draw(6, 1, 0, 0), n.end();
    const s = this.ctx.getCurrentTexture().createView(), r = t.beginRenderPass({ colorAttachments: [{ view: s, clearValue: { r: 1, g: 1, b: 1, a: 1 }, loadOp: "clear", storeOp: "store" }] });
    r.setPipeline(this.pipeline2), this.bindGroup2 && r.setBindGroup(0, this.bindGroup2), r.draw(6, 1, 0, 0), r.end(), this.device.queue.submit([t.finish()]);
  }
  destroy() {
    var _a, _b, _c, _d;
    (_b = (_a = this.intermediateTexture) == null ? void 0 : _a.destroy) == null ? void 0 : _b.call(_a), (_d = (_c = this.mandelbrotBuffer) == null ? void 0 : _c.destroy) == null ? void 0 : _d.call(_c);
  }
}
const tl = 1, nl = 128, sl = /* @__PURE__ */ zs({ __name: "WebGpuSurface", setup(e) {
  const t = oi(null);
  let n, s;
  async function r() {
    if (!t.value) return;
    n = t.value, s = new el(n, { antialiasLevel: 1, palettePeriod: 128 }), await s.initialize();
    let i = -0.7436438870371587, o = 0.13182590420531198, c = 2.5, u = 0.04, h = i, a = o, p = c, C = 0, S = 0, R = 0;
    const I = 0.05, Y = 0.7;
    let F = 0, V = 0, B = 0;
    const T = 0.025;
    function q($, z) {
      const oe = Math.cos(F), xe = Math.sin(F), Ie = oe * $ - xe * z, je = xe * $ + oe * z;
      h += Ie, a += je;
    }
    const Z = {};
    function he($) {
      Z[$.key.toLowerCase()] = true;
    }
    function ve($) {
      Z[$.key.toLowerCase()] = false;
    }
    function st($) {
      $.preventDefault();
      const z = 0.8;
      $.deltaY < 0 ? p *= z : p /= z;
    }
    const be = [{ cx: -0.7436438870371587, cy: 0.13182590420531198 }, { cx: -1.749705768080503, cy: -613369029080495e-19 }, { cx: -0.5503295086752807, cy: -0.6259346555912755 }, { cx: -0.19569582393630502, cy: 1.1000276413181806 }];
    let Ae = 0;
    function Je() {
      Z.z && q(0, u * p), Z.s && q(0, -u * p), Z.q && q(-u * p, 0), Z.d && q(u * p, 0), Z.a && (V += T), Z.e && (V -= T), C = (h - i) * I + C * Y, S = (a - o) * I + S * Y, R = (p - c) * I + R * Y, B = (V - F) * I + B * Y;
      const $ = 1e-4;
      Math.abs(B) < 1e-3 && (B = 0), Math.abs(S) < c / n.height * 2 && (S = 0), Math.abs(C) < c / n.width * 2 && (C = 0), Math.abs(R) < c / 100 && (R = 0), i += C, o += S, c += R, F += B;
      const z = Math.min(Math.max(100, 80 + 40 * Math.log2(1 / c)), 1e5);
      if (s.update({ cx: i, cy: o, scale: c, angle: F, maxIterations: z, epsilon: $ }, { antialiasLevel: tl, palettePeriod: nl }), s.render(), c < 1e-7) {
        Ae = (Ae + 1) % be.length;
        const oe = be[Ae];
        h = i = oe.cx, a = o = oe.cy, p = c = 2.5, C = S = R = 0, V = F = 0, B = 0;
      }
      requestAnimationFrame(Je);
    }
    let Ve = false, Xe = false, ht = 0, X = 0, j = 0, H = 0;
    function _e($) {
      const z = t.value;
      if (!z) return { x: 0, y: 0, width: 0, height: 0 };
      const oe = z.getBoundingClientRect();
      return { x: $.clientX - oe.left, y: $.clientY - oe.top, width: oe.width, height: oe.height };
    }
    function rt($) {
      if ($.button === 2) Xe = true;
      else {
        Ve = true;
        const z = _e($);
        ht = z.x, X = z.y, j = h, H = a;
      }
    }
    function Re($) {
      var _a;
      const z = _e($);
      if (Xe) {
        const f = (_a = t.value) == null ? void 0 : _a.getBoundingClientRect();
        if (!f) return;
        const d = f.width / 2, v = f.height / 2, g = z.x, m = z.y;
        V = Math.atan2(m - v, g - d);
        return;
      }
      if (!Ve) return;
      const oe = z.x - ht, xe = z.y - X, Ie = -oe * p * 2 / z.width * (z.width / z.height), je = xe * p * 2 / z.height, pt = Math.cos(F), $e = Math.sin(F), qn = pt * Ie - $e * je, l = $e * Ie + pt * je;
      h = j + qn, a = H + l;
    }
    function pe($) {
      $.button === 2 ? Xe = false : Ve = false;
    }
    window.addEventListener("keydown", he), window.addEventListener("keyup", ve), n.addEventListener("wheel", st, { passive: false }), n.addEventListener("mousedown", rt), n.addEventListener("contextmenu", function($) {
      $.preventDefault();
    }), window.addEventListener("mousemove", Re), window.addEventListener("mouseup", pe), Je();
  }
  return jn(() => {
    r();
  }), (i, o) => (gr(), mr("canvas", { ref_key: "canvasRef", ref: t }, null, 512));
} }), rl = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [s, r] of t) n[s] = r;
  return n;
}, il = rl(sl, [["__scopeId", "data-v-1fc433b0"]]), ol = { id: "fullscreen" }, ll = /* @__PURE__ */ zs({ __name: "App", setup(e) {
  return jn(() => {
  }), (t, n) => (gr(), mr("div", ol, [ze(il)]));
} });
Jo(ll).mount("#app");
