var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function() {
  const t = document.createElement("link").relList;
  if (t && t.supports && t.supports("modulepreload")) return;
  for (const i of document.querySelectorAll('link[rel="modulepreload"]')) s(i);
  new MutationObserver((i) => {
    for (const r of i) if (r.type === "childList") for (const o of r.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && s(o);
  }).observe(document, { childList: true, subtree: true });
  function n(i) {
    const r = {};
    return i.integrity && (r.integrity = i.integrity), i.referrerPolicy && (r.referrerPolicy = i.referrerPolicy), i.crossOrigin === "use-credentials" ? r.credentials = "include" : i.crossOrigin === "anonymous" ? r.credentials = "omit" : r.credentials = "same-origin", r;
  }
  function s(i) {
    if (i.ep) return;
    i.ep = true;
    const r = n(i);
    fetch(i.href, r);
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
const K = {}, lt = [], Oe = () => {
}, Ci = () => false, qt = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), En = (e) => e.startsWith("onUpdate:"), te = Object.assign, Pn = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, Si = Object.prototype.hasOwnProperty, B = (e, t) => Si.call(e, t), M = Array.isArray, xt = (e) => zt(e) === "[object Map]", Ei = (e) => zt(e) === "[object Set]", A = (e) => typeof e == "function", Q = (e) => typeof e == "string", dt = (e) => typeof e == "symbol", J = (e) => e !== null && typeof e == "object", Cs = (e) => (J(e) || A(e)) && A(e.then) && A(e.catch), Pi = Object.prototype.toString, zt = (e) => Pi.call(e), Ti = (e) => zt(e).slice(8, -1), Oi = (e) => zt(e) === "[object Object]", Tn = (e) => Q(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, bt = /* @__PURE__ */ Sn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), Yt = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, Mi = /-(\w)/g, Ye = Yt((e) => e.replace(Mi, (t, n) => n ? n.toUpperCase() : "")), Ai = /\B([A-Z])/g, nt = Yt((e) => e.replace(Ai, "-$1").toLowerCase()), Ss = Yt((e) => e.charAt(0).toUpperCase() + e.slice(1)), en = Yt((e) => e ? `on${Ss(e)}` : ""), qe = (e, t) => !Object.is(e, t), tn = (e, ...t) => {
  for (let n = 0; n < e.length; n++) e[n](...t);
}, dn = (e, t, n, s = false) => {
  Object.defineProperty(e, t, { configurable: true, enumerable: false, writable: s, value: n });
}, Ri = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
};
let Xn;
const Jt = () => Xn || (Xn = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function On(e) {
  if (M(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const s = e[n], i = Q(s) ? Li(s) : On(s);
      if (i) for (const r in i) t[r] = i[r];
    }
    return t;
  } else if (Q(e) || J(e)) return e;
}
const Ii = /;(?![^(]*\))/g, Fi = /:([^]+)/, Di = /\/\*[^]*?\*\//g;
function Li(e) {
  const t = {};
  return e.replace(Di, "").split(Ii).forEach((n) => {
    if (n) {
      const s = n.split(Fi);
      s.length > 1 && (t[s[0].trim()] = s[1].trim());
    }
  }), t;
}
function Mn(e) {
  let t = "";
  if (Q(e)) t = e;
  else if (M(e)) for (let n = 0; n < e.length; n++) {
    const s = Mn(e[n]);
    s && (t += s + " ");
  }
  else if (J(e)) for (const n in e) e[n] && (t += n + " ");
  return t.trim();
}
const Bi = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Ui = /* @__PURE__ */ Sn(Bi);
function Es(e) {
  return !!e || e === "";
}
/**
* @vue/reactivity v3.5.18
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
let fe;
class Hi {
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
        const i = this.parent.scopes.pop();
        i && i !== this && (this.parent.scopes[this.index] = i, i.index = this.index);
      }
      this.parent = void 0;
    }
  }
}
function Ni() {
  return fe;
}
let W;
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
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Os(this);
  }
  run() {
    if (!(this.flags & 1)) return this.fn();
    this.flags |= 2, Qn(this), Ms(this);
    const t = W, n = ge;
    W = this, ge = true;
    try {
      return this.fn();
    } finally {
      As(this), W = t, ge = n, this.flags &= -3;
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
function Os(e, t = false) {
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
function Ms(e) {
  for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function As(e) {
  let t, n = e.depsTail, s = n;
  for (; s; ) {
    const i = s.prevDep;
    s.version === -1 ? (s === n && (n = i), In(s), ji(s)) : t = s, s.dep.activeLink = s.prevActiveLink, s.prevActiveLink = void 0, s = i;
  }
  e.deps = t, e.depsTail = n;
}
function hn(e) {
  for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (Rs(t.dep.computed) || t.dep.version !== t.version)) return true;
  return !!e._dirty;
}
function Rs(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Ot) || (e.globalVersion = Ot, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !hn(e)))) return;
  e.flags |= 2;
  const t = e.dep, n = W, s = ge;
  W = e, ge = true;
  try {
    Ms(e);
    const i = e.fn(e._value);
    (t.version === 0 || qe(i, e._value)) && (e.flags |= 128, e._value = i, t.version++);
  } catch (i) {
    throw t.version++, i;
  } finally {
    W = n, ge = s, As(e), e.flags &= -3;
  }
}
function In(e, t = false) {
  const { dep: n, prevSub: s, nextSub: i } = e;
  if (s && (s.nextSub = i, e.prevSub = void 0), i && (i.prevSub = s, e.nextSub = void 0), n.subs === e && (n.subs = s, !s && n.computed)) {
    n.computed.flags &= -5;
    for (let r = n.computed.deps; r; r = r.nextDep) In(r, true);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function ji(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let ge = true;
const Is = [];
function Ue() {
  Is.push(ge), ge = false;
}
function He() {
  const e = Is.pop();
  ge = e === void 0 ? true : e;
}
function Qn(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const n = W;
    W = void 0;
    try {
      t();
    } finally {
      W = n;
    }
  }
}
let Ot = 0;
class Vi {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class Fn {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
  }
  track(t) {
    if (!W || !ge || W === this.computed) return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== W) n = this.activeLink = new Vi(W, this), W.deps ? (n.prevDep = W.depsTail, W.depsTail.nextDep = n, W.depsTail = n) : W.deps = W.depsTail = n, Fs(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const s = n.nextDep;
      s.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = s), n.prevDep = W.depsTail, n.nextDep = void 0, W.depsTail.nextDep = n, W.depsTail = n, W.deps === n && (W.deps = s);
    }
    return n;
  }
  trigger(t) {
    this.version++, Ot++, this.notify(t);
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
const pn = /* @__PURE__ */ new WeakMap(), et = Symbol(""), gn = Symbol(""), Mt = Symbol("");
function k(e, t, n) {
  if (ge && W) {
    let s = pn.get(e);
    s || pn.set(e, s = /* @__PURE__ */ new Map());
    let i = s.get(n);
    i || (s.set(n, i = new Fn()), i.map = s, i.key = n), i.track();
  }
}
function Be(e, t, n, s, i, r) {
  const o = pn.get(e);
  if (!o) {
    Ot++;
    return;
  }
  const c = (u) => {
    u && u.trigger();
  };
  if (An(), t === "clear") o.forEach(c);
  else {
    const u = M(e), h = u && Tn(n);
    if (u && n === "length") {
      const a = Number(s);
      o.forEach((p, C) => {
        (C === "length" || C === Mt || !dt(C) && C >= a) && c(p);
      });
    } else switch ((n !== void 0 || o.has(void 0)) && c(o.get(n)), h && c(o.get(Mt)), t) {
      case "add":
        u ? h && c(o.get("length")) : (c(o.get(et)), xt(e) && c(o.get(gn)));
        break;
      case "delete":
        u || (c(o.get(et)), xt(e) && c(o.get(gn)));
        break;
      case "set":
        xt(e) && c(o.get(et));
        break;
    }
  }
  Rn();
}
function rt(e) {
  const t = L(e);
  return t === e ? t : (k(t, "iterate", Mt), me(e) ? t : t.map(se));
}
function Dn(e) {
  return k(e = L(e), "iterate", Mt), e;
}
const $i = { __proto__: null, [Symbol.iterator]() {
  return sn(this, Symbol.iterator, se);
}, concat(...e) {
  return rt(this).concat(...e.map((t) => M(t) ? rt(t) : t));
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
  return rt(this).join(e);
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
  return rt(this).toReversed();
}, toSorted(e) {
  return rt(this).toSorted(e);
}, toSpliced(...e) {
  return rt(this).toSpliced(...e);
}, unshift(...e) {
  return mt(this, "unshift", e);
}, values() {
  return sn(this, "values", se);
} };
function sn(e, t, n) {
  const s = Dn(e), i = s[t]();
  return s !== e && !me(e) && (i._next = i.next, i.next = () => {
    const r = i._next();
    return r.value && (r.value = n(r.value)), r;
  }), i;
}
const Gi = Array.prototype;
function Fe(e, t, n, s, i, r) {
  const o = Dn(e), c = o !== e && !me(e), u = o[t];
  if (u !== Gi[t]) {
    const p = u.apply(e, r);
    return c ? se(p) : p;
  }
  let h = n;
  o !== e && (c ? h = function(p, C) {
    return n.call(this, se(p), C, e);
  } : n.length > 2 && (h = function(p, C) {
    return n.call(this, p, C, e);
  }));
  const a = u.call(o, h, s);
  return c && i ? i(a) : a;
}
function Zn(e, t, n, s) {
  const i = Dn(e);
  let r = n;
  return i !== e && (me(e) ? n.length > 3 && (r = function(o, c, u) {
    return n.call(this, o, c, u, e);
  }) : r = function(o, c, u) {
    return n.call(this, o, se(c), u, e);
  }), i[t](r, ...s);
}
function rn(e, t, n) {
  const s = L(e);
  k(s, "iterate", Mt);
  const i = s[t](...n);
  return (i === -1 || i === false) && Hn(n[0]) ? (n[0] = L(n[0]), s[t](...n)) : i;
}
function mt(e, t, n = []) {
  Ue(), An();
  const s = L(e)[t].apply(e, n);
  return Rn(), He(), s;
}
const Wi = /* @__PURE__ */ Sn("__proto__,__v_isRef,__isVue"), Ds = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(dt));
function Ki(e) {
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
    const i = this._isReadonly, r = this._isShallow;
    if (n === "__v_isReactive") return !i;
    if (n === "__v_isReadonly") return i;
    if (n === "__v_isShallow") return r;
    if (n === "__v_raw") return s === (i ? r ? tr : Ns : r ? Hs : Us).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(s) ? t : void 0;
    const o = M(t);
    if (!i) {
      let u;
      if (o && (u = $i[n])) return u;
      if (n === "hasOwnProperty") return Ki;
    }
    const c = Reflect.get(t, n, ee(t) ? t : s);
    return (dt(n) ? Ds.has(n) : Wi(n)) || (i || k(t, "get", n), r) ? c : ee(c) ? o && Tn(n) ? c : c.value : J(c) ? i ? js(c) : Bn(c) : c;
  }
}
class Bs extends Ls {
  constructor(t = false) {
    super(false, t);
  }
  set(t, n, s, i) {
    let r = t[n];
    if (!this._isShallow) {
      const u = tt(r);
      if (!me(s) && !tt(s) && (r = L(r), s = L(s)), !M(t) && ee(r) && !ee(s)) return u ? false : (r.value = s, true);
    }
    const o = M(t) && Tn(n) ? Number(n) < t.length : B(t, n), c = Reflect.set(t, n, s, ee(t) ? t : i);
    return t === L(i) && (o ? qe(s, r) && Be(t, "set", n, s) : Be(t, "add", n, s)), c;
  }
  deleteProperty(t, n) {
    const s = B(t, n);
    t[n];
    const i = Reflect.deleteProperty(t, n);
    return i && s && Be(t, "delete", n, void 0), i;
  }
  has(t, n) {
    const s = Reflect.has(t, n);
    return (!dt(n) || !Ds.has(n)) && k(t, "has", n), s;
  }
  ownKeys(t) {
    return k(t, "iterate", M(t) ? "length" : et), Reflect.ownKeys(t);
  }
}
class qi extends Ls {
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
const zi = new Bs(), Yi = new qi(), Ji = new Bs(true);
const mn = (e) => e, Lt = (e) => Reflect.getPrototypeOf(e);
function Xi(e, t, n) {
  return function(...s) {
    const i = this.__v_raw, r = L(i), o = xt(r), c = e === "entries" || e === Symbol.iterator && o, u = e === "keys" && o, h = i[e](...s), a = n ? mn : t ? vn : se;
    return !t && k(r, "iterate", u ? gn : et), { next() {
      const { value: p, done: C } = h.next();
      return C ? { value: p, done: C } : { value: c ? [a(p[0]), a(p[1])] : a(p), done: C };
    }, [Symbol.iterator]() {
      return this;
    } };
  };
}
function Bt(e) {
  return function(...t) {
    return e === "delete" ? false : e === "clear" ? void 0 : this;
  };
}
function Qi(e, t) {
  const n = { get(i) {
    const r = this.__v_raw, o = L(r), c = L(i);
    e || (qe(i, c) && k(o, "get", i), k(o, "get", c));
    const { has: u } = Lt(o), h = t ? mn : e ? vn : se;
    if (u.call(o, i)) return h(r.get(i));
    if (u.call(o, c)) return h(r.get(c));
    r !== o && r.get(i);
  }, get size() {
    const i = this.__v_raw;
    return !e && k(L(i), "iterate", et), Reflect.get(i, "size", i);
  }, has(i) {
    const r = this.__v_raw, o = L(r), c = L(i);
    return e || (qe(i, c) && k(o, "has", i), k(o, "has", c)), i === c ? r.has(i) : r.has(i) || r.has(c);
  }, forEach(i, r) {
    const o = this, c = o.__v_raw, u = L(c), h = t ? mn : e ? vn : se;
    return !e && k(u, "iterate", et), c.forEach((a, p) => i.call(r, h(a), h(p), o));
  } };
  return te(n, e ? { add: Bt("add"), set: Bt("set"), delete: Bt("delete"), clear: Bt("clear") } : { add(i) {
    !t && !me(i) && !tt(i) && (i = L(i));
    const r = L(this);
    return Lt(r).has.call(r, i) || (r.add(i), Be(r, "add", i, i)), this;
  }, set(i, r) {
    !t && !me(r) && !tt(r) && (r = L(r));
    const o = L(this), { has: c, get: u } = Lt(o);
    let h = c.call(o, i);
    h || (i = L(i), h = c.call(o, i));
    const a = u.call(o, i);
    return o.set(i, r), h ? qe(r, a) && Be(o, "set", i, r) : Be(o, "add", i, r), this;
  }, delete(i) {
    const r = L(this), { has: o, get: c } = Lt(r);
    let u = o.call(r, i);
    u || (i = L(i), u = o.call(r, i)), c && c.call(r, i);
    const h = r.delete(i);
    return u && Be(r, "delete", i, void 0), h;
  }, clear() {
    const i = L(this), r = i.size !== 0, o = i.clear();
    return r && Be(i, "clear", void 0, void 0), o;
  } }), ["keys", "values", "entries", Symbol.iterator].forEach((i) => {
    n[i] = Xi(i, e, t);
  }), n;
}
function Ln(e, t) {
  const n = Qi(e, t);
  return (s, i, r) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? s : Reflect.get(B(n, i) && i in s ? n : s, i, r);
}
const Zi = { get: Ln(false, false) }, ki = { get: Ln(false, true) }, er = { get: Ln(true, false) };
const Us = /* @__PURE__ */ new WeakMap(), Hs = /* @__PURE__ */ new WeakMap(), Ns = /* @__PURE__ */ new WeakMap(), tr = /* @__PURE__ */ new WeakMap();
function nr(e) {
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
function sr(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : nr(Ti(e));
}
function Bn(e) {
  return tt(e) ? e : Un(e, false, zi, Zi, Us);
}
function ir(e) {
  return Un(e, false, Ji, ki, Hs);
}
function js(e) {
  return Un(e, true, Yi, er, Ns);
}
function Un(e, t, n, s, i) {
  if (!J(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
  const r = sr(e);
  if (r === 0) return e;
  const o = i.get(e);
  if (o) return o;
  const c = new Proxy(e, r === 2 ? s : n);
  return i.set(e, c), c;
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
function rr(e) {
  return !B(e, "__v_skip") && Object.isExtensible(e) && dn(e, "__v_skip", true), e;
}
const se = (e) => J(e) ? Bn(e) : e, vn = (e) => J(e) ? js(e) : e;
function ee(e) {
  return e ? e.__v_isRef === true : false;
}
function or(e) {
  return lr(e, false);
}
function lr(e, t) {
  return ee(e) ? e : new cr(e, t);
}
class cr {
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
function fr(e) {
  return ee(e) ? e.value : e;
}
const ur = { get: (e, t, n) => t === "__v_raw" ? e : fr(Reflect.get(e, t, n)), set: (e, t, n, s) => {
  const i = e[t];
  return ee(i) && !ee(n) ? (i.value = n, true) : Reflect.set(e, t, n, s);
} };
function Vs(e) {
  return Ct(e) ? e : new Proxy(e, ur);
}
class ar {
  constructor(t, n, s) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new Fn(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Ot - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = s;
  }
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && W !== this) return Os(this, true), true;
  }
  get value() {
    const t = this.dep.track();
    return Rs(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter && this.setter(t);
  }
}
function dr(e, t, n = false) {
  let s, i;
  return A(e) ? s = e : (s = e.get, i = e.set), new ar(s, i, n);
}
const Ut = {}, Vt = /* @__PURE__ */ new WeakMap();
let ke;
function hr(e, t = false, n = ke) {
  if (n) {
    let s = Vt.get(n);
    s || Vt.set(n, s = []), s.push(e);
  }
}
function pr(e, t, n = K) {
  const { immediate: s, deep: i, once: r, scheduler: o, augmentJob: c, call: u } = n, h = (T) => i ? T : me(T) || i === false || i === 0 ? Ke(T, 1) : Ke(T);
  let a, p, C, S, R = false, I = false;
  if (ee(e) ? (p = () => e.value, R = me(e)) : Ct(e) ? (p = () => h(e), R = true) : M(e) ? (I = true, R = e.some((T) => Ct(T) || me(T)), p = () => e.map((T) => {
    if (ee(T)) return T.value;
    if (Ct(T)) return h(T);
    if (A(T)) return u ? u(T, 2) : T();
  })) : A(e) ? t ? p = u ? () => u(e, 2) : e : p = () => {
    if (C) {
      Ue();
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
  } : p = Oe, t && i) {
    const T = p, q = i === true ? 1 / 0 : i;
    p = () => Ke(T(), q);
  }
  const Y = Ni(), F = () => {
    a.stop(), Y && Y.active && Pn(Y.effects, a);
  };
  if (r && t) {
    const T = t;
    t = (...q) => {
      T(...q), F();
    };
  }
  let j = I ? new Array(e.length).fill(Ut) : Ut;
  const U = (T) => {
    if (!(!(a.flags & 1) || !a.dirty && !T)) if (t) {
      const q = a.run();
      if (i || R || (I ? q.some((Z, he) => qe(Z, j[he])) : qe(q, j))) {
        C && C();
        const Z = ke;
        ke = a;
        try {
          const he = [q, j === Ut ? void 0 : I && j[0] === Ut ? [] : j, S];
          j = q, u ? u(t, 3, he) : t(...he);
        } finally {
          ke = Z;
        }
      }
    } else a.run();
  };
  return c && c(U), a = new Ps(p), a.scheduler = o ? () => o(U, false) : U, S = (T) => hr(T, false, a), C = a.onStop = () => {
    const T = Vt.get(a);
    if (T) {
      if (u) u(T, 4);
      else for (const q of T) q();
      Vt.delete(a);
    }
  }, t ? s ? U(true) : j = a.run() : o ? o(U.bind(null, true), true) : a.run(), F.pause = a.pause.bind(a), F.resume = a.resume.bind(a), F.stop = F, F;
}
function Ke(e, t = 1 / 0, n) {
  if (t <= 0 || !J(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
  if (n.add(e), t--, ee(e)) Ke(e.value, t, n);
  else if (M(e)) for (let s = 0; s < e.length; s++) Ke(e[s], t, n);
  else if (Ei(e) || xt(e)) e.forEach((s) => {
    Ke(s, t, n);
  });
  else if (Oi(e)) {
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
  } catch (i) {
    Xt(i, t, n);
  }
}
function Me(e, t, n, s) {
  if (A(e)) {
    const i = Ft(e, t, n, s);
    return i && Cs(i) && i.catch((r) => {
      Xt(r, t, n);
    }), i;
  }
  if (M(e)) {
    const i = [];
    for (let r = 0; r < e.length; r++) i.push(Me(e[r], t, n, s));
    return i;
  }
}
function Xt(e, t, n, s = true) {
  const i = t ? t.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: o } = t && t.appContext.config || K;
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
    if (r) {
      Ue(), Ft(r, null, 10, [e, u, h]), He();
      return;
    }
  }
  gr(e, n, i, s, o);
}
function gr(e, t, n, s = true, i = false) {
  if (i) throw e;
  console.error(e);
}
const ie = [];
let Ee = -1;
const ct = [];
let Ge = null, ot = 0;
const $s = Promise.resolve();
let $t = null;
function mr(e) {
  const t = $t || $s;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function vr(e) {
  let t = Ee + 1, n = ie.length;
  for (; t < n; ) {
    const s = t + n >>> 1, i = ie[s], r = At(i);
    r < e || r === e && i.flags & 2 ? t = s + 1 : n = s;
  }
  return t;
}
function Nn(e) {
  if (!(e.flags & 1)) {
    const t = At(e), n = ie[ie.length - 1];
    !n || !(e.flags & 2) && t >= At(n) ? ie.push(e) : ie.splice(vr(t), 0, e), e.flags |= 1, Gs();
  }
}
function Gs() {
  $t || ($t = $s.then(Ks));
}
function _r(e) {
  M(e) ? ct.push(...e) : Ge && e.id === -1 ? Ge.splice(ot + 1, 0, e) : e.flags & 1 || (ct.push(e), e.flags |= 1), Gs();
}
function kn(e, t, n = Ee + 1) {
  for (; n < ie.length; n++) {
    const s = ie[n];
    if (s && s.flags & 2) {
      if (e && s.id !== e.uid) continue;
      ie.splice(n, 1), n--, s.flags & 4 && (s.flags &= -2), s(), s.flags & 4 || (s.flags &= -2);
    }
  }
}
function Ws(e) {
  if (ct.length) {
    const t = [...new Set(ct)].sort((n, s) => At(n) - At(s));
    if (ct.length = 0, Ge) {
      Ge.push(...t);
      return;
    }
    for (Ge = t, ot = 0; ot < Ge.length; ot++) {
      const n = Ge[ot];
      n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
    }
    Ge = null, ot = 0;
  }
}
const At = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function Ks(e) {
  try {
    for (Ee = 0; Ee < ie.length; Ee++) {
      const t = ie[Ee];
      t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Ft(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
    }
  } finally {
    for (; Ee < ie.length; Ee++) {
      const t = ie[Ee];
      t && (t.flags &= -2);
    }
    Ee = -1, ie.length = 0, Ws(), $t = null, (ie.length || ct.length) && Ks();
  }
}
let Te = null, qs = null;
function Gt(e) {
  const t = Te;
  return Te = e, qs = e && e.type.__scopeId || null, t;
}
function xr(e, t = Te, n) {
  if (!t || e._n) return e;
  const s = (...i) => {
    s._d && cs(-1);
    const r = Gt(t);
    let o;
    try {
      o = e(...i);
    } finally {
      Gt(r), s._d && cs(1);
    }
    return o;
  };
  return s._n = true, s._c = true, s._d = true, s;
}
function Qe(e, t, n, s) {
  const i = e.dirs, r = t && t.dirs;
  for (let o = 0; o < i.length; o++) {
    const c = i[o];
    r && (c.oldValue = r[o].value);
    let u = c.dir[s];
    u && (Ue(), Me(u, n, 8, [e.el, c, e, t]), He());
  }
}
const br = Symbol("_vte"), yr = (e) => e.__isTeleport;
function jn(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, jn(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function zs(e, t) {
  return A(e) ? te({ name: e.name }, t, { setup: e }) : e;
}
function Ys(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
function St(e, t, n, s, i = false) {
  if (M(e)) {
    e.forEach((R, I) => St(R, t && (M(t) ? t[I] : t), n, s, i));
    return;
  }
  if (Et(s) && !i) {
    s.shapeFlag & 512 && s.type.__asyncResolved && s.component.subTree.component && St(e, t, n, s.component.subTree);
    return;
  }
  const r = s.shapeFlag & 4 ? Kn(s.component) : s.el, o = i ? null : r, { i: c, r: u } = e, h = t && t.r, a = c.refs === K ? c.refs = {} : c.refs, p = c.setupState, C = L(p), S = p === K ? () => false : (R) => B(C, R);
  if (h != null && h !== u && (Q(h) ? (a[h] = null, S(h) && (p[h] = null)) : ee(h) && (h.value = null)), A(u)) Ft(u, c, 12, [o, a]);
  else {
    const R = Q(u), I = ee(u);
    if (R || I) {
      const Y = () => {
        if (e.f) {
          const F = R ? S(u) ? p[u] : a[u] : u.value;
          i ? M(F) && Pn(F, r) : M(F) ? F.includes(r) || F.push(r) : R ? (a[u] = [r], S(u) && (p[u] = a[u])) : (u.value = [r], e.k && (a[e.k] = u.value));
        } else R ? (a[u] = o, S(u) && (p[u] = o)) : I && (u.value = o, e.k && (a[e.k] = o));
      };
      o ? (Y.id = -1, ae(Y, n)) : Y();
    }
  }
}
Jt().requestIdleCallback;
Jt().cancelIdleCallback;
const Et = (e) => !!e.type.__asyncLoader, Js = (e) => e.type.__isKeepAlive;
function wr(e, t) {
  Xs(e, "a", t);
}
function Cr(e, t) {
  Xs(e, "da", t);
}
function Xs(e, t, n = re) {
  const s = e.__wdc || (e.__wdc = () => {
    let i = n;
    for (; i; ) {
      if (i.isDeactivated) return;
      i = i.parent;
    }
    return e();
  });
  if (Qt(t, s, n), n) {
    let i = n.parent;
    for (; i && i.parent; ) Js(i.parent.vnode) && Sr(s, t, n, i), i = i.parent;
  }
}
function Sr(e, t, n, s) {
  const i = Qt(t, e, s, true);
  Qs(() => {
    Pn(s[t], i);
  }, n);
}
function Qt(e, t, n = re, s = false) {
  if (n) {
    const i = n[e] || (n[e] = []), r = t.__weh || (t.__weh = (...o) => {
      Ue();
      const c = Dt(n), u = Me(t, n, e, o);
      return c(), He(), u;
    });
    return s ? i.unshift(r) : i.push(r), r;
  }
}
const Ne = (e) => (t, n = re) => {
  (!It || e === "sp") && Qt(e, (...s) => t(...s), n);
}, Er = Ne("bm"), Vn = Ne("m"), Pr = Ne("bu"), Tr = Ne("u"), Or = Ne("bum"), Qs = Ne("um"), Mr = Ne("sp"), Ar = Ne("rtg"), Rr = Ne("rtc");
function Ir(e, t = re) {
  Qt("ec", e, t);
}
const Fr = Symbol.for("v-ndc"), _n = (e) => e ? bi(e) ? Kn(e) : _n(e.parent) : null, Pt = te(/* @__PURE__ */ Object.create(null), { $: (e) => e, $el: (e) => e.vnode.el, $data: (e) => e.data, $props: (e) => e.props, $attrs: (e) => e.attrs, $slots: (e) => e.slots, $refs: (e) => e.refs, $parent: (e) => _n(e.parent), $root: (e) => _n(e.root), $host: (e) => e.ce, $emit: (e) => e.emit, $options: (e) => ks(e), $forceUpdate: (e) => e.f || (e.f = () => {
  Nn(e.update);
}), $nextTick: (e) => e.n || (e.n = mr.bind(e.proxy)), $watch: (e) => to.bind(e) }), on = (e, t) => e !== K && !e.__isScriptSetup && B(e, t), Dr = { get({ _: e }, t) {
  if (t === "__v_skip") return true;
  const { ctx: n, setupState: s, data: i, props: r, accessCache: o, type: c, appContext: u } = e;
  let h;
  if (t[0] !== "$") {
    const S = o[t];
    if (S !== void 0) switch (S) {
      case 1:
        return s[t];
      case 2:
        return i[t];
      case 4:
        return n[t];
      case 3:
        return r[t];
    }
    else {
      if (on(s, t)) return o[t] = 1, s[t];
      if (i !== K && B(i, t)) return o[t] = 2, i[t];
      if ((h = e.propsOptions[0]) && B(h, t)) return o[t] = 3, r[t];
      if (n !== K && B(n, t)) return o[t] = 4, n[t];
      xn && (o[t] = 0);
    }
  }
  const a = Pt[t];
  let p, C;
  if (a) return t === "$attrs" && k(e.attrs, "get", ""), a(e);
  if ((p = c.__cssModules) && (p = p[t])) return p;
  if (n !== K && B(n, t)) return o[t] = 4, n[t];
  if (C = u.config.globalProperties, B(C, t)) return C[t];
}, set({ _: e }, t, n) {
  const { data: s, setupState: i, ctx: r } = e;
  return on(i, t) ? (i[t] = n, true) : s !== K && B(s, t) ? (s[t] = n, true) : B(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (r[t] = n, true);
}, has({ _: { data: e, setupState: t, accessCache: n, ctx: s, appContext: i, propsOptions: r } }, o) {
  let c;
  return !!n[o] || e !== K && B(e, o) || on(t, o) || (c = r[0]) && B(c, o) || B(s, o) || B(Pt, o) || B(i.config.globalProperties, o);
}, defineProperty(e, t, n) {
  return n.get != null ? e._.accessCache[t] = 0 : B(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
} };
function es(e) {
  return M(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
}
let xn = true;
function Lr(e) {
  const t = ks(e), n = e.proxy, s = e.ctx;
  xn = false, t.beforeCreate && ts(t.beforeCreate, e, "bc");
  const { data: i, computed: r, methods: o, watch: c, provide: u, inject: h, created: a, beforeMount: p, mounted: C, beforeUpdate: S, updated: R, activated: I, deactivated: Y, beforeDestroy: F, beforeUnmount: j, destroyed: U, unmounted: T, render: q, renderTracked: Z, renderTriggered: he, errorCaptured: ve, serverPrefetch: st, expose: _e, inheritAttrs: Ae, components: Je, directives: je, filters: Xe } = t;
  if (h && Br(h, s, null), o) for (const V in o) {
    const H = o[V];
    A(H) && (s[V] = H.bind(n));
  }
  if (i) {
    const V = i.call(n, n);
    J(V) && (e.data = Bn(V));
  }
  if (xn = true, r) for (const V in r) {
    const H = r[V], xe = A(H) ? H.bind(n, n) : A(H.get) ? H.get.bind(n, n) : Oe, it = !A(H) && A(H.set) ? H.set.bind(n) : Oe, Re = Eo({ get: xe, set: it });
    Object.defineProperty(s, V, { enumerable: true, configurable: true, get: () => Re.value, set: (pe) => Re.value = pe });
  }
  if (c) for (const V in c) Zs(c[V], s, n, V);
  if (u) {
    const V = A(u) ? u.call(n) : u;
    Reflect.ownKeys(V).forEach((H) => {
      $r(H, V[H]);
    });
  }
  a && ts(a, e, "c");
  function X(V, H) {
    M(H) ? H.forEach((xe) => V(xe.bind(n))) : H && V(H.bind(n));
  }
  if (X(Er, p), X(Vn, C), X(Pr, S), X(Tr, R), X(wr, I), X(Cr, Y), X(Ir, ve), X(Rr, Z), X(Ar, he), X(Or, j), X(Qs, T), X(Mr, st), M(_e)) if (_e.length) {
    const V = e.exposed || (e.exposed = {});
    _e.forEach((H) => {
      Object.defineProperty(V, H, { get: () => n[H], set: (xe) => n[H] = xe, enumerable: true });
    });
  } else e.exposed || (e.exposed = {});
  q && e.render === Oe && (e.render = q), Ae != null && (e.inheritAttrs = Ae), Je && (e.components = Je), je && (e.directives = je), st && Ys(e);
}
function Br(e, t, n = Oe) {
  M(e) && (e = bn(e));
  for (const s in e) {
    const i = e[s];
    let r;
    J(i) ? "default" in i ? r = Ht(i.from || s, i.default, true) : r = Ht(i.from || s) : r = Ht(i), ee(r) ? Object.defineProperty(t, s, { enumerable: true, configurable: true, get: () => r.value, set: (o) => r.value = o }) : t[s] = r;
  }
}
function ts(e, t, n) {
  Me(M(e) ? e.map((s) => s.bind(t.proxy)) : e.bind(t.proxy), t, n);
}
function Zs(e, t, n, s) {
  let i = s.includes(".") ? di(n, s) : () => n[s];
  if (Q(e)) {
    const r = t[e];
    A(r) && cn(i, r);
  } else if (A(e)) cn(i, e.bind(n));
  else if (J(e)) if (M(e)) e.forEach((r) => Zs(r, t, n, s));
  else {
    const r = A(e.handler) ? e.handler.bind(n) : t[e.handler];
    A(r) && cn(i, r, e);
  }
}
function ks(e) {
  const t = e.type, { mixins: n, extends: s } = t, { mixins: i, optionsCache: r, config: { optionMergeStrategies: o } } = e.appContext, c = r.get(t);
  let u;
  return c ? u = c : !i.length && !n && !s ? u = t : (u = {}, i.length && i.forEach((h) => Wt(u, h, o, true)), Wt(u, t, o)), J(t) && r.set(t, u), u;
}
function Wt(e, t, n, s = false) {
  const { mixins: i, extends: r } = t;
  r && Wt(e, r, n, true), i && i.forEach((o) => Wt(e, o, n, true));
  for (const o in t) if (!(s && o === "expose")) {
    const c = Ur[o] || n && n[o];
    e[o] = c ? c(e[o], t[o]) : t[o];
  }
  return e;
}
const Ur = { data: ns, props: ss, emits: ss, methods: _t, computed: _t, beforeCreate: ne, created: ne, beforeMount: ne, mounted: ne, beforeUpdate: ne, updated: ne, beforeDestroy: ne, beforeUnmount: ne, destroyed: ne, unmounted: ne, activated: ne, deactivated: ne, errorCaptured: ne, serverPrefetch: ne, components: _t, directives: _t, watch: Nr, provide: ns, inject: Hr };
function ns(e, t) {
  return t ? e ? function() {
    return te(A(e) ? e.call(this, this) : e, A(t) ? t.call(this, this) : t);
  } : t : e;
}
function Hr(e, t) {
  return _t(bn(e), bn(t));
}
function bn(e) {
  if (M(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
    return t;
  }
  return e;
}
function ne(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function _t(e, t) {
  return e ? te(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function ss(e, t) {
  return e ? M(e) && M(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : te(/* @__PURE__ */ Object.create(null), es(e), es(t ?? {})) : t;
}
function Nr(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = te(/* @__PURE__ */ Object.create(null), e);
  for (const s in t) n[s] = ne(e[s], t[s]);
  return n;
}
function ei() {
  return { app: null, config: { isNativeTag: Ci, performance: false, globalProperties: {}, optionMergeStrategies: {}, errorHandler: void 0, warnHandler: void 0, compilerOptions: {} }, mixins: [], components: {}, directives: {}, provides: /* @__PURE__ */ Object.create(null), optionsCache: /* @__PURE__ */ new WeakMap(), propsCache: /* @__PURE__ */ new WeakMap(), emitsCache: /* @__PURE__ */ new WeakMap() };
}
let jr = 0;
function Vr(e, t) {
  return function(s, i = null) {
    A(s) || (s = te({}, s)), i != null && !J(i) && (i = null);
    const r = ei(), o = /* @__PURE__ */ new WeakSet(), c = [];
    let u = false;
    const h = r.app = { _uid: jr++, _component: s, _props: i, _container: null, _context: r, _instance: null, version: Po, get config() {
      return r.config;
    }, set config(a) {
    }, use(a, ...p) {
      return o.has(a) || (a && A(a.install) ? (o.add(a), a.install(h, ...p)) : A(a) && (o.add(a), a(h, ...p))), h;
    }, mixin(a) {
      return r.mixins.includes(a) || r.mixins.push(a), h;
    }, component(a, p) {
      return p ? (r.components[a] = p, h) : r.components[a];
    }, directive(a, p) {
      return p ? (r.directives[a] = p, h) : r.directives[a];
    }, mount(a, p, C) {
      if (!u) {
        const S = h._ceVNode || ze(s, i);
        return S.appContext = r, C === true ? C = "svg" : C === false && (C = void 0), e(S, a, C), u = true, h._container = a, a.__vue_app__ = h, Kn(S.component);
      }
    }, onUnmount(a) {
      c.push(a);
    }, unmount() {
      u && (Me(c, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
    }, provide(a, p) {
      return r.provides[a] = p, h;
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
function $r(e, t) {
  if (re) {
    let n = re.provides;
    const s = re.parent && re.parent.provides;
    s === n && (n = re.provides = Object.create(s)), n[e] = t;
  }
}
function Ht(e, t, n = false) {
  const s = xo();
  if (s || ft) {
    let i = ft ? ft._context.provides : s ? s.parent == null || s.ce ? s.vnode.appContext && s.vnode.appContext.provides : s.parent.provides : void 0;
    if (i && e in i) return i[e];
    if (arguments.length > 1) return n && A(t) ? t.call(s && s.proxy) : t;
  }
}
const ti = {}, ni = () => Object.create(ti), si = (e) => Object.getPrototypeOf(e) === ti;
function Gr(e, t, n, s = false) {
  const i = {}, r = ni();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), ii(e, t, i, r);
  for (const o in e.propsOptions[0]) o in i || (i[o] = void 0);
  n ? e.props = s ? i : ir(i) : e.type.props ? e.props = i : e.props = r, e.attrs = r;
}
function Wr(e, t, n, s) {
  const { props: i, attrs: r, vnode: { patchFlag: o } } = e, c = L(i), [u] = e.propsOptions;
  let h = false;
  if ((s || o > 0) && !(o & 16)) {
    if (o & 8) {
      const a = e.vnode.dynamicProps;
      for (let p = 0; p < a.length; p++) {
        let C = a[p];
        if (Zt(e.emitsOptions, C)) continue;
        const S = t[C];
        if (u) if (B(r, C)) S !== r[C] && (r[C] = S, h = true);
        else {
          const R = Ye(C);
          i[R] = yn(u, c, R, S, e, false);
        }
        else S !== r[C] && (r[C] = S, h = true);
      }
    }
  } else {
    ii(e, t, i, r) && (h = true);
    let a;
    for (const p in c) (!t || !B(t, p) && ((a = nt(p)) === p || !B(t, a))) && (u ? n && (n[p] !== void 0 || n[a] !== void 0) && (i[p] = yn(u, c, p, void 0, e, true)) : delete i[p]);
    if (r !== c) for (const p in r) (!t || !B(t, p)) && (delete r[p], h = true);
  }
  h && Be(e.attrs, "set", "");
}
function ii(e, t, n, s) {
  const [i, r] = e.propsOptions;
  let o = false, c;
  if (t) for (let u in t) {
    if (bt(u)) continue;
    const h = t[u];
    let a;
    i && B(i, a = Ye(u)) ? !r || !r.includes(a) ? n[a] = h : (c || (c = {}))[a] = h : Zt(e.emitsOptions, u) || (!(u in s) || h !== s[u]) && (s[u] = h, o = true);
  }
  if (r) {
    const u = L(n), h = c || K;
    for (let a = 0; a < r.length; a++) {
      const p = r[a];
      n[p] = yn(i, u, p, h[p], e, !B(h, p));
    }
  }
  return o;
}
function yn(e, t, n, s, i, r) {
  const o = e[n];
  if (o != null) {
    const c = B(o, "default");
    if (c && s === void 0) {
      const u = o.default;
      if (o.type !== Function && !o.skipFactory && A(u)) {
        const { propsDefaults: h } = i;
        if (n in h) s = h[n];
        else {
          const a = Dt(i);
          s = h[n] = u.call(null, t), a();
        }
      } else s = u;
      i.ce && i.ce._setProp(n, s);
    }
    o[0] && (r && !c ? s = false : o[1] && (s === "" || s === nt(n)) && (s = true));
  }
  return s;
}
const Kr = /* @__PURE__ */ new WeakMap();
function ri(e, t, n = false) {
  const s = n ? Kr : t.propsCache, i = s.get(e);
  if (i) return i;
  const r = e.props, o = {}, c = [];
  let u = false;
  if (!A(e)) {
    const a = (p) => {
      u = true;
      const [C, S] = ri(p, t, true);
      te(o, C), S && c.push(...S);
    };
    !n && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
  }
  if (!r && !u) return J(e) && s.set(e, lt), lt;
  if (M(r)) for (let a = 0; a < r.length; a++) {
    const p = Ye(r[a]);
    is(p) && (o[p] = K);
  }
  else if (r) for (const a in r) {
    const p = Ye(a);
    if (is(p)) {
      const C = r[a], S = o[p] = M(C) || A(C) ? { type: C } : te({}, C), R = S.type;
      let I = false, Y = true;
      if (M(R)) for (let F = 0; F < R.length; ++F) {
        const j = R[F], U = A(j) && j.name;
        if (U === "Boolean") {
          I = true;
          break;
        } else U === "String" && (Y = false);
      }
      else I = A(R) && R.name === "Boolean";
      S[0] = I, S[1] = Y, (I || B(S, "default")) && c.push(p);
    }
  }
  const h = [o, c];
  return J(e) && s.set(e, h), h;
}
function is(e) {
  return e[0] !== "$" && !bt(e);
}
const $n = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", Gn = (e) => M(e) ? e.map(Pe) : [Pe(e)], qr = (e, t, n) => {
  if (t._n) return t;
  const s = xr((...i) => Gn(t(...i)), n);
  return s._c = false, s;
}, oi = (e, t, n) => {
  const s = e._ctx;
  for (const i in e) {
    if ($n(i)) continue;
    const r = e[i];
    if (A(r)) t[i] = qr(i, r, s);
    else if (r != null) {
      const o = Gn(r);
      t[i] = () => o;
    }
  }
}, li = (e, t) => {
  const n = Gn(t);
  e.slots.default = () => n;
}, ci = (e, t, n) => {
  for (const s in t) (n || !$n(s)) && (e[s] = t[s]);
}, zr = (e, t, n) => {
  const s = e.slots = ni();
  if (e.vnode.shapeFlag & 32) {
    const i = t.__;
    i && dn(s, "__", i, true);
    const r = t._;
    r ? (ci(s, t, n), n && dn(s, "_", r, true)) : oi(t, s);
  } else t && li(e, t);
}, Yr = (e, t, n) => {
  const { vnode: s, slots: i } = e;
  let r = true, o = K;
  if (s.shapeFlag & 32) {
    const c = t._;
    c ? n && c === 1 ? r = false : ci(i, t, n) : (r = !t.$stable, oi(t, i)), o = t;
  } else t && (li(e, t), o = { default: 1 });
  if (r) for (const c in i) !$n(c) && o[c] == null && delete i[c];
}, ae = co;
function Jr(e) {
  return Xr(e);
}
function Xr(e, t) {
  const n = Jt();
  n.__VUE__ = true;
  const { insert: s, remove: i, patchProp: r, createElement: o, createText: c, createComment: u, setText: h, setElementText: a, parentNode: p, nextSibling: C, setScopeId: S = Oe, insertStaticContent: R } = e, I = (l, f, d, v = null, g = null, m = null, y = void 0, b = null, x = !!f.dynamicChildren) => {
    if (l === f) return;
    l && !vt(l, f) && (v = Ie(l), pe(l, g, m, true), l = null), f.patchFlag === -2 && (x = false, f.dynamicChildren = null);
    const { type: _, ref: P, shapeFlag: w } = f;
    switch (_) {
      case kt:
        Y(l, f, d, v);
        break;
      case ut:
        F(l, f, d, v);
        break;
      case fn:
        l == null && j(f, d, v, y);
        break;
      case Le:
        Je(l, f, d, v, g, m, y, b, x);
        break;
      default:
        w & 1 ? q(l, f, d, v, g, m, y, b, x) : w & 6 ? je(l, f, d, v, g, m, y, b, x) : (w & 64 || w & 128) && _.process(l, f, d, v, g, m, y, b, x, $e);
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
  }, j = (l, f, d, v) => {
    [l.el, l.anchor] = R(l.children, f, d, v, l.el, l.anchor);
  }, U = ({ el: l, anchor: f }, d, v) => {
    let g;
    for (; l && l !== f; ) g = C(l), s(l, d, v), l = g;
    s(f, d, v);
  }, T = ({ el: l, anchor: f }) => {
    let d;
    for (; l && l !== f; ) d = C(l), i(l), l = d;
    i(f);
  }, q = (l, f, d, v, g, m, y, b, x) => {
    f.type === "svg" ? y = "svg" : f.type === "math" && (y = "mathml"), l == null ? Z(f, d, v, g, m, y, b, x) : st(l, f, g, m, y, b, x);
  }, Z = (l, f, d, v, g, m, y, b) => {
    let x, _;
    const { props: P, shapeFlag: w, transition: E, dirs: O } = l;
    if (x = l.el = o(l.type, m, P && P.is, P), w & 8 ? a(x, l.children) : w & 16 && ve(l.children, x, null, v, g, ln(l, m), y, b), O && Qe(l, null, v, "created"), he(x, l, l.scopeId, y, v), P) {
      for (const G in P) G !== "value" && !bt(G) && r(x, G, null, P[G], m, v);
      "value" in P && r(x, "value", null, P.value, m), (_ = P.onVnodeBeforeMount) && Se(_, v, l);
    }
    O && Qe(l, null, v, "beforeMount");
    const D = Qr(g, E);
    D && E.beforeEnter(x), s(x, f, d), ((_ = P && P.onVnodeMounted) || D || O) && ae(() => {
      _ && Se(_, v, l), D && E.enter(x), O && Qe(l, null, v, "mounted");
    }, g);
  }, he = (l, f, d, v, g) => {
    if (d && S(l, d), v) for (let m = 0; m < v.length; m++) S(l, v[m]);
    if (g) {
      let m = g.subTree;
      if (f === m || pi(m.type) && (m.ssContent === f || m.ssFallback === f)) {
        const y = g.vnode;
        he(l, y, y.scopeId, y.slotScopeIds, g.parent);
      }
    }
  }, ve = (l, f, d, v, g, m, y, b, x = 0) => {
    for (let _ = x; _ < l.length; _++) {
      const P = l[_] = b ? We(l[_]) : Pe(l[_]);
      I(null, P, f, d, v, g, m, y, b);
    }
  }, st = (l, f, d, v, g, m, y) => {
    const b = f.el = l.el;
    let { patchFlag: x, dynamicChildren: _, dirs: P } = f;
    x |= l.patchFlag & 16;
    const w = l.props || K, E = f.props || K;
    let O;
    if (d && Ze(d, false), (O = E.onVnodeBeforeUpdate) && Se(O, d, f, l), P && Qe(f, l, d, "beforeUpdate"), d && Ze(d, true), (w.innerHTML && E.innerHTML == null || w.textContent && E.textContent == null) && a(b, ""), _ ? _e(l.dynamicChildren, _, b, d, v, ln(f, g), m) : y || H(l, f, b, null, d, v, ln(f, g), m, false), x > 0) {
      if (x & 16) Ae(b, w, E, d, g);
      else if (x & 2 && w.class !== E.class && r(b, "class", null, E.class, g), x & 4 && r(b, "style", w.style, E.style, g), x & 8) {
        const D = f.dynamicProps;
        for (let G = 0; G < D.length; G++) {
          const N = D[G], le = w[N], ce = E[N];
          (ce !== le || N === "value") && r(b, N, le, ce, g, d);
        }
      }
      x & 1 && l.children !== f.children && a(b, f.children);
    } else !y && _ == null && Ae(b, w, E, d, g);
    ((O = E.onVnodeUpdated) || P) && ae(() => {
      O && Se(O, d, f, l), P && Qe(f, l, d, "updated");
    }, v);
  }, _e = (l, f, d, v, g, m, y) => {
    for (let b = 0; b < f.length; b++) {
      const x = l[b], _ = f[b], P = x.el && (x.type === Le || !vt(x, _) || x.shapeFlag & 198) ? p(x.el) : d;
      I(x, _, P, null, v, g, m, y, true);
    }
  }, Ae = (l, f, d, v, g) => {
    if (f !== d) {
      if (f !== K) for (const m in f) !bt(m) && !(m in d) && r(l, m, f[m], null, g, v);
      for (const m in d) {
        if (bt(m)) continue;
        const y = d[m], b = f[m];
        y !== b && m !== "value" && r(l, m, b, y, g, v);
      }
      "value" in d && r(l, "value", f.value, d.value, g);
    }
  }, Je = (l, f, d, v, g, m, y, b, x) => {
    const _ = f.el = l ? l.el : c(""), P = f.anchor = l ? l.anchor : c("");
    let { patchFlag: w, dynamicChildren: E, slotScopeIds: O } = f;
    O && (b = b ? b.concat(O) : O), l == null ? (s(_, d, v), s(P, d, v), ve(f.children || [], d, P, g, m, y, b, x)) : w > 0 && w & 64 && E && l.dynamicChildren ? (_e(l.dynamicChildren, E, d, g, m, y, b), (f.key != null || g && f === g.subTree) && fi(l, f, true)) : H(l, f, d, P, g, m, y, b, x);
  }, je = (l, f, d, v, g, m, y, b, x) => {
    f.slotScopeIds = b, l == null ? f.shapeFlag & 512 ? g.ctx.activate(f, d, v, y, x) : Xe(f, d, v, g, m, y, x) : ht(l, f, x);
  }, Xe = (l, f, d, v, g, m, y) => {
    const b = l.component = _o(l, v, g);
    if (Js(l) && (b.ctx.renderer = $e), bo(b, false, y), b.asyncDep) {
      if (g && g.registerDep(b, X, y), !l.el) {
        const x = b.subTree = ze(ut);
        F(null, x, f, d), l.placeholder = x.el;
      }
    } else X(b, l, f, d, g, m, y);
  }, ht = (l, f, d) => {
    const v = f.component = l.component;
    if (oo(l, f, d)) if (v.asyncDep && !v.asyncResolved) {
      V(v, f, d);
      return;
    } else v.next = f, v.update();
    else f.el = l.el, v.vnode = f;
  }, X = (l, f, d, v, g, m, y) => {
    const b = () => {
      if (l.isMounted) {
        let { next: w, bu: E, u: O, parent: D, vnode: G } = l;
        {
          const we = ui(l);
          if (we) {
            w && (w.el = G.el, V(l, w, y)), we.asyncDep.then(() => {
              l.isUnmounted || b();
            });
            return;
          }
        }
        let N = w, le;
        Ze(l, false), w ? (w.el = G.el, V(l, w, y)) : w = G, E && tn(E), (le = w.props && w.props.onVnodeBeforeUpdate) && Se(le, D, w, G), Ze(l, true);
        const ce = os(l), ye = l.subTree;
        l.subTree = ce, I(ye, ce, p(ye.el), Ie(ye), l, g, m), w.el = ce.el, N === null && lo(l, ce.el), O && ae(O, g), (le = w.props && w.props.onVnodeUpdated) && ae(() => Se(le, D, w, G), g);
      } else {
        let w;
        const { el: E, props: O } = f, { bm: D, m: G, parent: N, root: le, type: ce } = l, ye = Et(f);
        Ze(l, false), D && tn(D), !ye && (w = O && O.onVnodeBeforeMount) && Se(w, N, f), Ze(l, true);
        {
          le.ce && le.ce._def.shadowRoot !== false && le.ce._injectChildStyle(ce);
          const we = l.subTree = os(l);
          I(null, we, d, v, l, g, m), f.el = we.el;
        }
        if (G && ae(G, g), !ye && (w = O && O.onVnodeMounted)) {
          const we = f;
          ae(() => Se(w, N, we), g);
        }
        (f.shapeFlag & 256 || N && Et(N.vnode) && N.vnode.shapeFlag & 256) && l.a && ae(l.a, g), l.isMounted = true, f = d = v = null;
      }
    };
    l.scope.on();
    const x = l.effect = new Ps(b);
    l.scope.off();
    const _ = l.update = x.run.bind(x), P = l.job = x.runIfDirty.bind(x);
    P.i = l, P.id = l.uid, x.scheduler = () => Nn(P), Ze(l, true), _();
  }, V = (l, f, d) => {
    f.component = l;
    const v = l.vnode.props;
    l.vnode = f, l.next = null, Wr(l, f.props, v, d), Yr(l, f.children, d), Ue(), kn(l), He();
  }, H = (l, f, d, v, g, m, y, b, x = false) => {
    const _ = l && l.children, P = l ? l.shapeFlag : 0, w = f.children, { patchFlag: E, shapeFlag: O } = f;
    if (E > 0) {
      if (E & 128) {
        it(_, w, d, v, g, m, y, b, x);
        return;
      } else if (E & 256) {
        xe(_, w, d, v, g, m, y, b, x);
        return;
      }
    }
    O & 8 ? (P & 16 && be(_, g, m), w !== _ && a(d, w)) : P & 16 ? O & 16 ? it(_, w, d, v, g, m, y, b, x) : be(_, g, m, true) : (P & 8 && a(d, ""), O & 16 && ve(w, d, v, g, m, y, b, x));
  }, xe = (l, f, d, v, g, m, y, b, x) => {
    l = l || lt, f = f || lt;
    const _ = l.length, P = f.length, w = Math.min(_, P);
    let E;
    for (E = 0; E < w; E++) {
      const O = f[E] = x ? We(f[E]) : Pe(f[E]);
      I(l[E], O, d, null, g, m, y, b, x);
    }
    _ > P ? be(l, g, m, true, false, w) : ve(f, d, v, g, m, y, b, x, w);
  }, it = (l, f, d, v, g, m, y, b, x) => {
    let _ = 0;
    const P = f.length;
    let w = l.length - 1, E = P - 1;
    for (; _ <= w && _ <= E; ) {
      const O = l[_], D = f[_] = x ? We(f[_]) : Pe(f[_]);
      if (vt(O, D)) I(O, D, d, null, g, m, y, b, x);
      else break;
      _++;
    }
    for (; _ <= w && _ <= E; ) {
      const O = l[w], D = f[E] = x ? We(f[E]) : Pe(f[E]);
      if (vt(O, D)) I(O, D, d, null, g, m, y, b, x);
      else break;
      w--, E--;
    }
    if (_ > w) {
      if (_ <= E) {
        const O = E + 1, D = O < P ? f[O].el : v;
        for (; _ <= E; ) I(null, f[_] = x ? We(f[_]) : Pe(f[_]), d, D, g, m, y, b, x), _++;
      }
    } else if (_ > E) for (; _ <= w; ) pe(l[_], g, m, true), _++;
    else {
      const O = _, D = _, G = /* @__PURE__ */ new Map();
      for (_ = D; _ <= E; _++) {
        const ue = f[_] = x ? We(f[_]) : Pe(f[_]);
        ue.key != null && G.set(ue.key, _);
      }
      let N, le = 0;
      const ce = E - D + 1;
      let ye = false, we = 0;
      const gt = new Array(ce);
      for (_ = 0; _ < ce; _++) gt[_] = 0;
      for (_ = O; _ <= w; _++) {
        const ue = l[_];
        if (le >= ce) {
          pe(ue, g, m, true);
          continue;
        }
        let Ce;
        if (ue.key != null) Ce = G.get(ue.key);
        else for (N = D; N <= E; N++) if (gt[N - D] === 0 && vt(ue, f[N])) {
          Ce = N;
          break;
        }
        Ce === void 0 ? pe(ue, g, m, true) : (gt[Ce - D] = _ + 1, Ce >= we ? we = Ce : ye = true, I(ue, f[Ce], d, null, g, m, y, b, x), le++);
      }
      const zn = ye ? Zr(gt) : lt;
      for (N = zn.length - 1, _ = ce - 1; _ >= 0; _--) {
        const ue = D + _, Ce = f[ue], Yn = f[ue + 1], Jn = ue + 1 < P ? Yn.el || Yn.placeholder : v;
        gt[_] === 0 ? I(null, Ce, d, Jn, g, m, y, b, x) : ye && (N < 0 || _ !== zn[N] ? Re(Ce, d, Jn, 2) : N--);
      }
    }
  }, Re = (l, f, d, v, g = null) => {
    const { el: m, type: y, transition: b, children: x, shapeFlag: _ } = l;
    if (_ & 6) {
      Re(l.component.subTree, f, d, v);
      return;
    }
    if (_ & 128) {
      l.suspense.move(f, d, v);
      return;
    }
    if (_ & 64) {
      y.move(l, f, d, $e);
      return;
    }
    if (y === Le) {
      s(m, f, d);
      for (let w = 0; w < x.length; w++) Re(x[w], f, d, v);
      s(l.anchor, f, d);
      return;
    }
    if (y === fn) {
      U(l, f, d);
      return;
    }
    if (v !== 2 && _ & 1 && b) if (v === 0) b.beforeEnter(m), s(m, f, d), ae(() => b.enter(m), g);
    else {
      const { leave: w, delayLeave: E, afterLeave: O } = b, D = () => {
        l.ctx.isUnmounted ? i(m) : s(m, f, d);
      }, G = () => {
        w(m, () => {
          D(), O && O();
        });
      };
      E ? E(m, D, G) : G();
    }
    else s(m, f, d);
  }, pe = (l, f, d, v = false, g = false) => {
    const { type: m, props: y, ref: b, children: x, dynamicChildren: _, shapeFlag: P, patchFlag: w, dirs: E, cacheIndex: O } = l;
    if (w === -2 && (g = false), b != null && (Ue(), St(b, null, d, l, true), He()), O != null && (f.renderCache[O] = void 0), P & 256) {
      f.ctx.deactivate(l);
      return;
    }
    const D = P & 1 && E, G = !Et(l);
    let N;
    if (G && (N = y && y.onVnodeBeforeUnmount) && Se(N, f, l), P & 6) oe(l.component, d, v);
    else {
      if (P & 128) {
        l.suspense.unmount(d, v);
        return;
      }
      D && Qe(l, null, f, "beforeUnmount"), P & 64 ? l.type.remove(l, f, d, $e, v) : _ && !_.hasOnce && (m !== Le || w > 0 && w & 64) ? be(_, f, d, false, true) : (m === Le && w & 384 || !g && P & 16) && be(x, f, d), v && $(l);
    }
    (G && (N = y && y.onVnodeUnmounted) || D) && ae(() => {
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
      i(d), g && !g.persisted && g.afterLeave && g.afterLeave();
    };
    if (l.shapeFlag & 1 && g && !g.persisted) {
      const { leave: y, delayLeave: b } = g, x = () => y(d, m);
      b ? b(l.el, m, x) : x();
    } else m();
  }, z = (l, f) => {
    let d;
    for (; l !== f; ) d = C(l), i(l), l = d;
    i(f);
  }, oe = (l, f, d) => {
    const { bum: v, scope: g, job: m, subTree: y, um: b, m: x, a: _, parent: P, slots: { __: w } } = l;
    rs(x), rs(_), v && tn(v), P && M(w) && w.forEach((E) => {
      P.renderCache[E] = void 0;
    }), g.stop(), m && (m.flags |= 8, pe(y, l, f, d)), b && ae(b, f), ae(() => {
      l.isUnmounted = true;
    }, f), f && f.pendingBranch && !f.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
  }, be = (l, f, d, v = false, g = false, m = 0) => {
    for (let y = m; y < l.length; y++) pe(l[y], f, d, v, g);
  }, Ie = (l) => {
    if (l.shapeFlag & 6) return Ie(l.component.subTree);
    if (l.shapeFlag & 128) return l.suspense.next();
    const f = C(l.anchor || l.el), d = f && f[br];
    return d ? C(d) : f;
  };
  let Ve = false;
  const pt = (l, f, d) => {
    l == null ? f._vnode && pe(f._vnode, null, null, true) : I(f._vnode || null, l, f, null, null, null, d), f._vnode = l, Ve || (Ve = true, kn(), Ws(), Ve = false);
  }, $e = { p: I, um: pe, m: Re, r: $, mt: Xe, mc: ve, pc: H, pbc: _e, n: Ie, o: e };
  return { render: pt, hydrate: void 0, createApp: Vr(pt) };
}
function ln({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function Ze({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Qr(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function fi(e, t, n = false) {
  const s = e.children, i = t.children;
  if (M(s) && M(i)) for (let r = 0; r < s.length; r++) {
    const o = s[r];
    let c = i[r];
    c.shapeFlag & 1 && !c.dynamicChildren && ((c.patchFlag <= 0 || c.patchFlag === 32) && (c = i[r] = We(i[r]), c.el = o.el), !n && c.patchFlag !== -2 && fi(o, c)), c.type === kt && (c.el = o.el), c.type === ut && !c.el && (c.el = o.el);
  }
}
function Zr(e) {
  const t = e.slice(), n = [0];
  let s, i, r, o, c;
  const u = e.length;
  for (s = 0; s < u; s++) {
    const h = e[s];
    if (h !== 0) {
      if (i = n[n.length - 1], e[i] < h) {
        t[s] = i, n.push(s);
        continue;
      }
      for (r = 0, o = n.length - 1; r < o; ) c = r + o >> 1, e[n[c]] < h ? r = c + 1 : o = c;
      h < e[n[r]] && (r > 0 && (t[s] = n[r - 1]), n[r] = s);
    }
  }
  for (r = n.length, o = n[r - 1]; r-- > 0; ) n[r] = o, o = t[o];
  return n;
}
function ui(e) {
  const t = e.subTree.component;
  if (t) return t.asyncDep && !t.asyncResolved ? t : ui(t);
}
function rs(e) {
  if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
const kr = Symbol.for("v-scx"), eo = () => Ht(kr);
function cn(e, t, n) {
  return ai(e, t, n);
}
function ai(e, t, n = K) {
  const { immediate: s, deep: i, flush: r, once: o } = n, c = te({}, n), u = t && s || !t && r !== "post";
  let h;
  if (It) {
    if (r === "sync") {
      const S = eo();
      h = S.__watcherHandles || (S.__watcherHandles = []);
    } else if (!u) {
      const S = () => {
      };
      return S.stop = Oe, S.resume = Oe, S.pause = Oe, S;
    }
  }
  const a = re;
  c.call = (S, R, I) => Me(S, a, R, I);
  let p = false;
  r === "post" ? c.scheduler = (S) => {
    ae(S, a && a.suspense);
  } : r !== "sync" && (p = true, c.scheduler = (S, R) => {
    R ? S() : Nn(S);
  }), c.augmentJob = (S) => {
    t && (S.flags |= 4), p && (S.flags |= 2, a && (S.id = a.uid, S.i = a));
  };
  const C = pr(e, t, c);
  return It && (h ? h.push(C) : u && C()), C;
}
function to(e, t, n) {
  const s = this.proxy, i = Q(e) ? e.includes(".") ? di(s, e) : () => s[e] : e.bind(s, s);
  let r;
  A(t) ? r = t : (r = t.handler, n = t);
  const o = Dt(this), c = ai(i, r.bind(s), n);
  return o(), c;
}
function di(e, t) {
  const n = t.split(".");
  return () => {
    let s = e;
    for (let i = 0; i < n.length && s; i++) s = s[n[i]];
    return s;
  };
}
const no = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Ye(t)}Modifiers`] || e[`${nt(t)}Modifiers`];
function so(e, t, ...n) {
  if (e.isUnmounted) return;
  const s = e.vnode.props || K;
  let i = n;
  const r = t.startsWith("update:"), o = r && no(s, t.slice(7));
  o && (o.trim && (i = n.map((a) => Q(a) ? a.trim() : a)), o.number && (i = n.map(Ri)));
  let c, u = s[c = en(t)] || s[c = en(Ye(t))];
  !u && r && (u = s[c = en(nt(t))]), u && Me(u, e, 6, i);
  const h = s[c + "Once"];
  if (h) {
    if (!e.emitted) e.emitted = {};
    else if (e.emitted[c]) return;
    e.emitted[c] = true, Me(h, e, 6, i);
  }
}
function hi(e, t, n = false) {
  const s = t.emitsCache, i = s.get(e);
  if (i !== void 0) return i;
  const r = e.emits;
  let o = {}, c = false;
  if (!A(e)) {
    const u = (h) => {
      const a = hi(h, t, true);
      a && (c = true, te(o, a));
    };
    !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
  }
  return !r && !c ? (J(e) && s.set(e, null), null) : (M(r) ? r.forEach((u) => o[u] = null) : te(o, r), J(e) && s.set(e, o), o);
}
function Zt(e, t) {
  return !e || !qt(t) ? false : (t = t.slice(2).replace(/Once$/, ""), B(e, t[0].toLowerCase() + t.slice(1)) || B(e, nt(t)) || B(e, t));
}
function os(e) {
  const { type: t, vnode: n, proxy: s, withProxy: i, propsOptions: [r], slots: o, attrs: c, emit: u, render: h, renderCache: a, props: p, data: C, setupState: S, ctx: R, inheritAttrs: I } = e, Y = Gt(e);
  let F, j;
  try {
    if (n.shapeFlag & 4) {
      const T = i || s, q = T;
      F = Pe(h.call(q, T, a, p, S, C, R)), j = c;
    } else {
      const T = t;
      F = Pe(T.length > 1 ? T(p, { attrs: c, slots: o, emit: u }) : T(p, null)), j = t.props ? c : io(c);
    }
  } catch (T) {
    Tt.length = 0, Xt(T, e, 1), F = ze(ut);
  }
  let U = F;
  if (j && I !== false) {
    const T = Object.keys(j), { shapeFlag: q } = U;
    T.length && q & 7 && (r && T.some(En) && (j = ro(j, r)), U = at(U, j, false, true));
  }
  return n.dirs && (U = at(U, null, false, true), U.dirs = U.dirs ? U.dirs.concat(n.dirs) : n.dirs), n.transition && jn(U, n.transition), F = U, Gt(Y), F;
}
const io = (e) => {
  let t;
  for (const n in e) (n === "class" || n === "style" || qt(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, ro = (e, t) => {
  const n = {};
  for (const s in e) (!En(s) || !(s.slice(9) in t)) && (n[s] = e[s]);
  return n;
};
function oo(e, t, n) {
  const { props: s, children: i, component: r } = e, { props: o, children: c, patchFlag: u } = t, h = r.emitsOptions;
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
  } else return (i || c) && (!c || !c.$stable) ? true : s === o ? false : s ? o ? ls(s, o, h) : true : !!o;
  return false;
}
function ls(e, t, n) {
  const s = Object.keys(t);
  if (s.length !== Object.keys(e).length) return true;
  for (let i = 0; i < s.length; i++) {
    const r = s[i];
    if (t[r] !== e[r] && !Zt(n, r)) return true;
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
const pi = (e) => e.__isSuspense;
function co(e, t) {
  t && t.pendingBranch ? M(e) ? t.effects.push(...e) : t.effects.push(e) : _r(e);
}
const Le = Symbol.for("v-fgt"), kt = Symbol.for("v-txt"), ut = Symbol.for("v-cmt"), fn = Symbol.for("v-stc"), Tt = [];
let de = null;
function gi(e = false) {
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
function mi(e, t, n, s, i, r) {
  return uo(xi(e, t, n, s, i, r, true));
}
function vi(e) {
  return e ? e.__v_isVNode === true : false;
}
function vt(e, t) {
  return e.type === t.type && e.key === t.key;
}
const _i = ({ key: e }) => e ?? null, Nt = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? Q(e) || ee(e) || A(e) ? { i: Te, r: e, k: t, f: !!n } : e : null);
function xi(e, t = null, n = null, s = 0, i = null, r = e === Le ? 0 : 1, o = false, c = false) {
  const u = { __v_isVNode: true, __v_skip: true, type: e, props: t, key: t && _i(t), ref: t && Nt(t), scopeId: qs, slotScopeIds: null, children: n, component: null, suspense: null, ssContent: null, ssFallback: null, dirs: null, transition: null, el: null, anchor: null, target: null, targetStart: null, targetAnchor: null, staticCount: 0, shapeFlag: r, patchFlag: s, dynamicProps: i, dynamicChildren: null, appContext: null, ctx: Te };
  return c ? (Wn(u, n), r & 128 && e.normalize(u)) : n && (u.shapeFlag |= Q(n) ? 8 : 16), Rt > 0 && !o && de && (u.patchFlag > 0 || r & 6) && u.patchFlag !== 32 && de.push(u), u;
}
const ze = ao;
function ao(e, t = null, n = null, s = 0, i = null, r = false) {
  if ((!e || e === Fr) && (e = ut), vi(e)) {
    const c = at(e, t, true);
    return n && Wn(c, n), Rt > 0 && !r && de && (c.shapeFlag & 6 ? de[de.indexOf(e)] = c : de.push(c)), c.patchFlag = -2, c;
  }
  if (So(e) && (e = e.__vccOpts), t) {
    t = ho(t);
    let { class: c, style: u } = t;
    c && !Q(c) && (t.class = Mn(c)), J(u) && (Hn(u) && !M(u) && (u = te({}, u)), t.style = On(u));
  }
  const o = Q(e) ? 1 : pi(e) ? 128 : yr(e) ? 64 : J(e) ? 4 : A(e) ? 2 : 0;
  return xi(e, t, n, s, i, o, r, true);
}
function ho(e) {
  return e ? Hn(e) || si(e) ? te({}, e) : e : null;
}
function at(e, t, n = false, s = false) {
  const { props: i, ref: r, patchFlag: o, children: c, transition: u } = e, h = t ? go(i || {}, t) : i, a = { __v_isVNode: true, __v_skip: true, type: e.type, props: h, key: h && _i(h), ref: t && t.ref ? n && r ? M(r) ? r.concat(Nt(t)) : [r, Nt(t)] : Nt(t) : r, scopeId: e.scopeId, slotScopeIds: e.slotScopeIds, children: c, target: e.target, targetStart: e.targetStart, targetAnchor: e.targetAnchor, staticCount: e.staticCount, shapeFlag: e.shapeFlag, patchFlag: t && e.type !== Le ? o === -1 ? 16 : o | 16 : o, dynamicProps: e.dynamicProps, dynamicChildren: e.dynamicChildren, appContext: e.appContext, dirs: e.dirs, transition: u, component: e.component, suspense: e.suspense, ssContent: e.ssContent && at(e.ssContent), ssFallback: e.ssFallback && at(e.ssFallback), placeholder: e.placeholder, el: e.el, anchor: e.anchor, ctx: e.ctx, ce: e.ce };
  return u && s && jn(a, u.clone(a)), a;
}
function po(e = " ", t = 0) {
  return ze(kt, null, e, t);
}
function Pe(e) {
  return e == null || typeof e == "boolean" ? ze(ut) : M(e) ? ze(Le, null, e.slice()) : vi(e) ? We(e) : ze(kt, null, String(e));
}
function We(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : at(e);
}
function Wn(e, t) {
  let n = 0;
  const { shapeFlag: s } = e;
  if (t == null) t = null;
  else if (M(t)) n = 16;
  else if (typeof t == "object") if (s & 65) {
    const i = t.default;
    i && (i._c && (i._d = false), Wn(e, i()), i._c && (i._d = true));
    return;
  } else {
    n = 32;
    const i = t._;
    !i && !si(t) ? t._ctx = Te : i === 3 && Te && (Te.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
  }
  else A(t) ? (t = { default: t, _ctx: Te }, n = 32) : (t = String(t), s & 64 ? (n = 16, t = [po(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function go(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const s = e[n];
    for (const i in s) if (i === "class") t.class !== s.class && (t.class = Mn([t.class, s.class]));
    else if (i === "style") t.style = On([t.style, s.style]);
    else if (qt(i)) {
      const r = t[i], o = s[i];
      o && r !== o && !(M(r) && r.includes(o)) && (t[i] = r ? [].concat(r, o) : o);
    } else i !== "" && (t[i] = s[i]);
  }
  return t;
}
function Se(e, t, n, s = null) {
  Me(e, t, 7, [n, s]);
}
const mo = ei();
let vo = 0;
function _o(e, t, n) {
  const s = e.type, i = (t ? t.appContext : e.appContext) || mo, r = { uid: vo++, vnode: e, type: s, parent: t, appContext: i, root: null, next: null, subTree: null, effect: null, update: null, job: null, scope: new Hi(true), render: null, proxy: null, exposed: null, exposeProxy: null, withProxy: null, provides: t ? t.provides : Object.create(i.provides), ids: t ? t.ids : ["", 0, 0], accessCache: null, renderCache: [], components: null, directives: null, propsOptions: ri(s, i), emitsOptions: hi(s, i), emit: null, emitted: null, propsDefaults: K, inheritAttrs: s.inheritAttrs, ctx: K, data: K, props: K, attrs: K, slots: K, refs: K, setupState: K, setupContext: null, suspense: n, suspenseId: n ? n.pendingId : 0, asyncDep: null, asyncResolved: false, isMounted: false, isUnmounted: false, isDeactivated: false, bc: null, c: null, bm: null, m: null, bu: null, u: null, um: null, bum: null, da: null, a: null, rtg: null, rtc: null, ec: null, sp: null };
  return r.ctx = { _: r }, r.root = t ? t.root : r, r.emit = so.bind(null, r), e.ce && e.ce(r), r;
}
let re = null;
const xo = () => re || Te;
let Kt, wn;
{
  const e = Jt(), t = (n, s) => {
    let i;
    return (i = e[n]) || (i = e[n] = []), i.push(s), (r) => {
      i.length > 1 ? i.forEach((o) => o(r)) : i[0](r);
    };
  };
  Kt = t("__VUE_INSTANCE_SETTERS__", (n) => re = n), wn = t("__VUE_SSR_SETTERS__", (n) => It = n);
}
const Dt = (e) => {
  const t = re;
  return Kt(e), e.scope.on(), () => {
    e.scope.off(), Kt(t);
  };
}, fs = () => {
  re && re.scope.off(), Kt(null);
};
function bi(e) {
  return e.vnode.shapeFlag & 4;
}
let It = false;
function bo(e, t = false, n = false) {
  t && wn(t);
  const { props: s, children: i } = e.vnode, r = bi(e);
  Gr(e, s, r, t), zr(e, i, n || t);
  const o = r ? yo(e, t) : void 0;
  return t && wn(false), o;
}
function yo(e, t) {
  const n = e.type;
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Dr);
  const { setup: s } = n;
  if (s) {
    Ue();
    const i = e.setupContext = s.length > 1 ? Co(e) : null, r = Dt(e), o = Ft(s, e, 0, [e.props, i]), c = Cs(o);
    if (He(), r(), (c || e.sp) && !Et(e) && Ys(e), c) {
      if (o.then(fs, fs), t) return o.then((u) => {
        us(e, u);
      }).catch((u) => {
        Xt(u, e, 0);
      });
      e.asyncDep = o;
    } else us(e, o);
  } else yi(e);
}
function us(e, t, n) {
  A(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : J(t) && (e.setupState = Vs(t)), yi(e);
}
function yi(e, t, n) {
  const s = e.type;
  e.render || (e.render = s.render || Oe);
  {
    const i = Dt(e);
    Ue();
    try {
      Lr(e);
    } finally {
      He(), i();
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
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Vs(rr(e.exposed)), { get(t, n) {
    if (n in t) return t[n];
    if (n in Pt) return Pt[n](e);
  }, has(t, n) {
    return n in t || n in Pt;
  } })) : e.proxy;
}
function So(e) {
  return A(e) && "__vccOpts" in e;
}
const Eo = (e, t) => dr(e, t, It), Po = "3.5.18";
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
const wi = Cn ? (e) => Cn.createHTML(e) : (e) => e, To = "http://www.w3.org/2000/svg", Oo = "http://www.w3.org/1998/Math/MathML", De = typeof document < "u" ? document : null, ds = De && De.createElement("template"), Mo = { insert: (e, t, n) => {
  t.insertBefore(e, n || null);
}, remove: (e) => {
  const t = e.parentNode;
  t && t.removeChild(e);
}, createElement: (e, t, n, s) => {
  const i = t === "svg" ? De.createElementNS(To, e) : t === "mathml" ? De.createElementNS(Oo, e) : n ? De.createElement(e, { is: n }) : De.createElement(e);
  return e === "select" && s && s.multiple != null && i.setAttribute("multiple", s.multiple), i;
}, createText: (e) => De.createTextNode(e), createComment: (e) => De.createComment(e), setText: (e, t) => {
  e.nodeValue = t;
}, setElementText: (e, t) => {
  e.textContent = t;
}, parentNode: (e) => e.parentNode, nextSibling: (e) => e.nextSibling, querySelector: (e) => De.querySelector(e), setScopeId(e, t) {
  e.setAttribute(t, "");
}, insertStaticContent(e, t, n, s, i, r) {
  const o = n ? n.previousSibling : t.lastChild;
  if (i && (i === r || i.nextSibling)) for (; t.insertBefore(i.cloneNode(true), n), !(i === r || !(i = i.nextSibling)); ) ;
  else {
    ds.innerHTML = wi(s === "svg" ? `<svg>${e}</svg>` : s === "mathml" ? `<math>${e}</math>` : e);
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
  const s = e.style, i = Q(n);
  let r = false;
  if (n && !i) {
    if (t) if (Q(t)) for (const o of t.split(";")) {
      const c = o.slice(0, o.indexOf(":")).trim();
      n[c] == null && jt(s, c, "");
    }
    else for (const o in t) n[o] == null && jt(s, o, "");
    for (const o in n) o === "display" && (r = true), jt(s, o, n[o]);
  } else if (i) {
    if (t !== n) {
      const o = s[Fo];
      o && (n += ";" + o), s.cssText = n, r = Do.test(n);
    }
  } else t && e.removeAttribute("style");
  hs in e && (e[hs] = r ? s.display : "", e[Io] && (s.display = "none"));
}
const ps = /\s*!important$/;
function jt(e, t, n) {
  if (M(n)) n.forEach((s) => jt(e, t, s));
  else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
  else {
    const s = Bo(e, t);
    ps.test(n) ? e.setProperty(nt(s), n.replace(ps, ""), "important") : e[s] = n;
  }
}
const gs = ["Webkit", "Moz", "ms"], un = {};
function Bo(e, t) {
  const n = un[t];
  if (n) return n;
  let s = Ye(t);
  if (s !== "filter" && s in e) return un[t] = s;
  s = Ss(s);
  for (let i = 0; i < gs.length; i++) {
    const r = gs[i] + s;
    if (r in e) return un[t] = r;
  }
  return t;
}
const ms = "http://www.w3.org/1999/xlink";
function vs(e, t, n, s, i, r = Ui(t)) {
  s && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(ms, t.slice(6, t.length)) : e.setAttributeNS(ms, t, n) : n == null || r && !Es(n) ? e.removeAttribute(t) : e.setAttribute(t, r ? "" : dt(n) ? String(n) : n);
}
function _s(e, t, n, s, i) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? wi(n) : n);
    return;
  }
  const r = e.tagName;
  if (t === "value" && r !== "PROGRESS" && !r.includes("-")) {
    const c = r === "OPTION" ? e.getAttribute("value") || "" : e.value, u = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
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
  o && e.removeAttribute(i || t);
}
function Uo(e, t, n, s) {
  e.addEventListener(t, n, s);
}
function Ho(e, t, n, s) {
  e.removeEventListener(t, n, s);
}
const xs = Symbol("_vei");
function No(e, t, n, s, i = null) {
  const r = e[xs] || (e[xs] = {}), o = r[t];
  if (s && o) o.value = s;
  else {
    const [c, u] = jo(t);
    if (s) {
      const h = r[t] = Go(s, i);
      Uo(e, c, h, u);
    } else o && (Ho(e, c, o, u), r[t] = void 0);
  }
}
const bs = /(?:Once|Passive|Capture)$/;
function jo(e) {
  let t;
  if (bs.test(e)) {
    t = {};
    let s;
    for (; s = e.match(bs); ) e = e.slice(0, e.length - s[0].length), t[s[0].toLowerCase()] = true;
  }
  return [e[2] === ":" ? e.slice(3) : nt(e.slice(2)), t];
}
let an = 0;
const Vo = Promise.resolve(), $o = () => an || (Vo.then(() => an = 0), an = Date.now());
function Go(e, t) {
  const n = (s) => {
    if (!s._vts) s._vts = Date.now();
    else if (s._vts <= n.attached) return;
    Me(Wo(s, n.value), t, 5, [s]);
  };
  return n.value = e, n.attached = $o(), n;
}
function Wo(e, t) {
  if (M(t)) {
    const n = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      n.call(e), e._stopped = true;
    }, t.map((s) => (i) => !i._stopped && s && s(i));
  } else return t;
}
const ys = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Ko = (e, t, n, s, i, r) => {
  const o = i === "svg";
  t === "class" ? Ro(e, s, o) : t === "style" ? Lo(e, n, s) : qt(t) ? En(t) || No(e, t, n, s, r) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : qo(e, t, s, o)) ? (_s(e, t, s), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && vs(e, t, s, o, r, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !Q(s)) ? _s(e, Ye(t), s, r, t) : (t === "true-value" ? e._trueValue = s : t === "false-value" && (e._falseValue = s), vs(e, t, s, o));
};
function qo(e, t, n, s) {
  if (s) return !!(t === "innerHTML" || t === "textContent" || t in e && ys(t) && A(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
  if (t === "width" || t === "height") {
    const i = e.tagName;
    if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE") return false;
  }
  return ys(t) && Q(n) ? false : t in e;
}
const zo = te({ patchProp: Ko }, Mo);
let ws;
function Yo() {
  return ws || (ws = Jr(zo));
}
const Jo = (...e) => {
  const t = Yo().createApp(...e), { mount: n } = t;
  return t.mount = (s) => {
    const i = Qo(s);
    if (!i) return;
    const r = t._component;
    !A(r) && !r.render && !r.template && (r.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const o = n(i, false, Xo(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), o;
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
  bloomRadius: f32,
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
  let pixelCoord = vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  let data = textureLoad(tex, pixelCoord, 0);
  let nu = data.x;
  let d = data.y;
  let period = uniforms.palettePeriod;
  if (nu <= 0.0) {
    // Glow color (par exemple bleu)
    let glowColor = vec3<f32>(0.2, 0.4, 1.0);
    // Intensit\xE9 du glow selon la distance
    let glow = exp(-d * 3.0);
    return vec4<f32>(glowColor * glow, 1.0);
  }
  let v = fract(nu / period);
  let baseColor = palette(v, d, fragCoord.x, fragCoord.y);
  return vec4<f32>(baseColor, 1.0);
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
    const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, s = (n == null ? void 0 : n.clientWidth) ?? this.canvas.clientWidth, i = (n == null ? void 0 : n.clientHeight) ?? this.canvas.clientHeight;
    if (this.width = Math.max(1, Math.round(s * t)), this.height = Math.max(1, Math.round(i * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = s + "px", this.canvas.style.height = i + "px", this.ctx.configure({ device: this.device, format: this.format, alphaMode: "opaque" }), this.intermediateTexture && ((_b = (_a = this.intermediateTexture).destroy) == null ? void 0 : _b.call(_a)), this.intermediateTexture = this.device.createTexture({ size: { width: this.width, height: this.height, depthOrArrayLayers: 1 }, format: "rgba16float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING, label: "Engine IntermediateTexture" }), this.intermediateView = this.intermediateTexture.createView(), this.intermediateView.label = "Engine IntermediateTextureView", this.pipeline2) {
      const r = this.pipeline2.getBindGroupLayout(0);
      r.label = "Engine IntermediateTextureView";
      const o = [{ binding: 0, resource: { buffer: this.uniformBufferColor } }, { binding: 1, resource: this.intermediateView }];
      this.bindGroup2 = this.device.createBindGroup({ layout: r, entries: o, label: "Engine BindGroup Color Pass" });
    }
  }
  areObjectsEqual(t, n) {
    const s = Object.keys(t), i = Object.keys(n);
    if (s.length !== i.length) return false;
    for (const r of s) if (t[r] !== n[r]) return false;
    return true;
  }
  update(t, n) {
    this.previousMandelbrot && (this.needRender = !this.areObjectsEqual(t, this.previousMandelbrot)), this.previousMandelbrot = t;
    const s = this.width / Math.max(1, this.height), i = new Float32Array([t.cx, t.cy, t.scale, s, t.angle, t.maxIterations, t.epsilon, n.antialiasLevel]);
    this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, i.buffer);
    const r = new Float32Array([n.palettePeriod, 0, 0, 0]);
    this.device.queue.writeBuffer(this.uniformBufferColor, 0, r.buffer);
  }
  render() {
    if (!this.needRender || (console.count("Rendering"), !this.pipeline1 || !this.pipeline2)) return;
    const t = this.device.createCommandEncoder(), n = t.beginRenderPass({ colorAttachments: [{ view: this.intermediateView, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }] });
    n.setPipeline(this.pipeline1), this.bindGroup1 && n.setBindGroup(0, this.bindGroup1), n.draw(6, 1, 0, 0), n.end();
    const s = this.ctx.getCurrentTexture().createView(), i = t.beginRenderPass({ colorAttachments: [{ view: s, clearValue: { r: 1, g: 1, b: 1, a: 1 }, loadOp: "clear", storeOp: "store" }] });
    i.setPipeline(this.pipeline2), this.bindGroup2 && i.setBindGroup(0, this.bindGroup2), i.draw(6, 1, 0, 0), i.end(), this.device.queue.submit([t.finish()]);
  }
  destroy() {
    var _a, _b, _c, _d;
    (_b = (_a = this.intermediateTexture) == null ? void 0 : _a.destroy) == null ? void 0 : _b.call(_a), (_d = (_c = this.mandelbrotBuffer) == null ? void 0 : _c.destroy) == null ? void 0 : _d.call(_c);
  }
}
const tl = 1, nl = 128, sl = /* @__PURE__ */ zs({ __name: "WebGpuSurface", setup(e) {
  const t = or(null);
  let n, s;
  async function i() {
    if (!t.value) return;
    n = t.value, s = new el(n, { antialiasLevel: 1, palettePeriod: 128 }), await s.initialize();
    let r = -0.7436438870371587, o = 0.13182590420531198, c = 2.5, u = 0.04, h = r, a = o, p = c, C = 0, S = 0, R = 0;
    const I = 0.05, Y = 0.7;
    let F = 0, j = 0, U = 0;
    const T = 0.025;
    function q($, z) {
      const oe = Math.cos(F), be = Math.sin(F), Ie = oe * $ - be * z, Ve = be * $ + oe * z;
      h += Ie, a += Ve;
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
    const _e = [{ cx: -0.7436438870371587, cy: 0.13182590420531198 }, { cx: -1.749705768080503, cy: -613369029080495e-19 }, { cx: -0.5503295086752807, cy: -0.6259346555912755 }, { cx: -0.19569582393630502, cy: 1.1000276413181806 }];
    let Ae = 0;
    function Je() {
      Z.z && q(0, u * p), Z.s && q(0, -u * p), Z.q && q(-u * p, 0), Z.d && q(u * p, 0), Z.a && (j += T), Z.e && (j -= T), C = (h - r) * I + C * Y, S = (a - o) * I + S * Y, R = (p - c) * I + R * Y, U = (j - F) * I + U * Y;
      const $ = 1e-4;
      Math.abs(U) < 1e-3 && (U = 0), Math.abs(S) < c / n.height * 2 && (S = 0), Math.abs(C) < c / n.width * 2 && (C = 0), Math.abs(R) < c / 100 && (R = 0), r += C, o += S, c += R, F += U;
      const z = Math.min(Math.max(100, 80 + 40 * Math.log2(1 / c)), 1e5);
      if (s.update({ cx: r, cy: o, scale: c, angle: F, maxIterations: z, epsilon: $ }, { antialiasLevel: tl, palettePeriod: nl }), s.render(), c < 1e-7) {
        Ae = (Ae + 1) % _e.length;
        const oe = _e[Ae];
        h = r = oe.cx, a = o = oe.cy, p = c = 2.5, C = S = R = 0, j = F = 0, U = 0;
      }
      requestAnimationFrame(Je);
    }
    let je = false, Xe = false, ht = 0, X = 0, V = 0, H = 0;
    function xe($) {
      const z = t.value;
      if (!z) return { x: 0, y: 0, width: 0, height: 0 };
      const oe = z.getBoundingClientRect();
      return { x: $.clientX - oe.left, y: $.clientY - oe.top, width: oe.width, height: oe.height };
    }
    function it($) {
      if ($.button === 2) Xe = true;
      else {
        je = true;
        const z = xe($);
        ht = z.x, X = z.y, V = h, H = a;
      }
    }
    function Re($) {
      var _a;
      const z = xe($);
      if (Xe) {
        const f = (_a = t.value) == null ? void 0 : _a.getBoundingClientRect();
        if (!f) return;
        const d = f.width / 2, v = f.height / 2, g = z.x, m = z.y;
        j = Math.atan2(m - v, g - d);
        return;
      }
      if (!je) return;
      const oe = z.x - ht, be = z.y - X, Ie = -oe * p * 2 / z.width * (z.width / z.height), Ve = be * p * 2 / z.height, pt = Math.cos(F), $e = Math.sin(F), qn = pt * Ie - $e * Ve, l = $e * Ie + pt * Ve;
      h = V + qn, a = H + l;
    }
    function pe($) {
      $.button === 2 ? Xe = false : je = false;
    }
    window.addEventListener("keydown", he), window.addEventListener("keyup", ve), n.addEventListener("wheel", st, { passive: false }), n.addEventListener("mousedown", it), n.addEventListener("contextmenu", function($) {
      $.preventDefault();
    }), window.addEventListener("mousemove", Re), window.addEventListener("mouseup", pe), Je();
  }
  return Vn(() => {
    i();
  }), (r, o) => (gi(), mi("canvas", { ref_key: "canvasRef", ref: t }, null, 512));
} }), il = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [s, i] of t) n[s] = i;
  return n;
}, rl = il(sl, [["__scopeId", "data-v-1fc433b0"]]), ol = { id: "fullscreen" }, ll = /* @__PURE__ */ zs({ __name: "App", setup(e) {
  return Vn(() => {
  }), (t, n) => (gi(), mi("div", ol, [ze(rl)]));
} });
Jo(ll).mount("#app");
