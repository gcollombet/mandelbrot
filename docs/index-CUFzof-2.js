var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(async () => {
  (function() {
    const t = document.createElement("link").relList;
    if (t && t.supports && t.supports("modulepreload")) return;
    for (const o of document.querySelectorAll('link[rel="modulepreload"]')) i(o);
    new MutationObserver((o) => {
      for (const s of o) if (s.type === "childList") for (const r of s.addedNodes) r.tagName === "LINK" && r.rel === "modulepreload" && i(r);
    }).observe(document, {
      childList: true,
      subtree: true
    });
    function n(o) {
      const s = {};
      return o.integrity && (s.integrity = o.integrity), o.referrerPolicy && (s.referrerPolicy = o.referrerPolicy), o.crossOrigin === "use-credentials" ? s.credentials = "include" : o.crossOrigin === "anonymous" ? s.credentials = "omit" : s.credentials = "same-origin", s;
    }
    function i(o) {
      if (o.ep) return;
      o.ep = true;
      const s = n(o);
      fetch(o.href, s);
    }
  })();
  function ko(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const de = {}, hn = [], ht = () => {
  }, nr = () => false, zi = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Ro = (e) => e.startsWith("onUpdate:"), Le = Object.assign, Ao = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, Ia = Object.prototype.hasOwnProperty, pe = (e, t) => Ia.call(e, t), X = Array.isArray, gn = (e) => Jn(e) === "[object Map]", ir = (e) => Jn(e) === "[object Set]", ts = (e) => Jn(e) === "[object Date]", ee = (e) => typeof e == "function", Ce = (e) => typeof e == "string", bt = (e) => typeof e == "symbol", he = (e) => e !== null && typeof e == "object", or = (e) => (he(e) || ee(e)) && ee(e.then) && ee(e.catch), sr = Object.prototype.toString, Jn = (e) => sr.call(e), Oa = (e) => Jn(e).slice(8, -1), rr = (e) => Jn(e) === "[object Object]", zo = (e) => Ce(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Bn = ko(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), Bi = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return ((n) => t[n] || (t[n] = e(n)));
  }, Na = /-\w/g, Et = Bi((e) => e.replace(Na, (t) => t.slice(1).toUpperCase())), Ua = /\B([A-Z])/g, Vt = Bi((e) => e.replace(Ua, "-$1").toLowerCase()), ar = Bi((e) => e.charAt(0).toUpperCase() + e.slice(1)), Yi = Bi((e) => e ? `on${ar(e)}` : ""), qe = (e, t) => !Object.is(e, t), pi = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, lr = (e, t, n, i = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: i,
      value: n
    });
  }, Bo = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  }, Fa = (e) => {
    const t = Ce(e) ? Number(e) : NaN;
    return isNaN(t) ? e : t;
  };
  let ns;
  const Ii = () => ns || (ns = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function Qn(e) {
    if (X(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const i = e[n], o = Ce(i) ? Va(i) : Qn(i);
        if (o) for (const s in o) t[s] = o[s];
      }
      return t;
    } else if (Ce(e) || he(e)) return e;
  }
  const Da = /;(?![^(]*\))/g, $a = /:([^]+)/, Ga = /\/\*[^]*?\*\//g;
  function Va(e) {
    const t = {};
    return e.replace(Ga, "").split(Da).forEach((n) => {
      if (n) {
        const i = n.split($a);
        i.length > 1 && (t[i[0].trim()] = i[1].trim());
      }
    }), t;
  }
  function ce(e) {
    let t = "";
    if (Ce(e)) t = e;
    else if (X(e)) for (let n = 0; n < e.length; n++) {
      const i = ce(e[n]);
      i && (t += i + " ");
    }
    else if (he(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const Ha = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Wa = ko(Ha);
  function ur(e) {
    return !!e || e === "";
  }
  function ja(e, t) {
    if (e.length !== t.length) return false;
    let n = true;
    for (let i = 0; n && i < e.length; i++) n = Io(e[i], t[i]);
    return n;
  }
  function Io(e, t) {
    if (e === t) return true;
    let n = ts(e), i = ts(t);
    if (n || i) return n && i ? e.getTime() === t.getTime() : false;
    if (n = bt(e), i = bt(t), n || i) return e === t;
    if (n = X(e), i = X(t), n || i) return n && i ? ja(e, t) : false;
    if (n = he(e), i = he(t), n || i) {
      if (!n || !i) return false;
      const o = Object.keys(e).length, s = Object.keys(t).length;
      if (o !== s) return false;
      for (const r in e) {
        const a = e.hasOwnProperty(r), l = t.hasOwnProperty(r);
        if (a && !l || !a && l || !Io(e[r], t[r])) return false;
      }
    }
    return String(e) === String(t);
  }
  const cr = (e) => !!(e && e.__v_isRef === true), te = (e) => Ce(e) ? e : e == null ? "" : X(e) || he(e) && (e.toString === sr || !ee(e.toString)) ? cr(e) ? te(e.value) : JSON.stringify(e, fr, 2) : String(e), fr = (e, t) => cr(t) ? fr(e, t.value) : gn(t) ? {
    [`Map(${t.size})`]: [
      ...t.entries()
    ].reduce((n, [i, o], s) => (n[Ki(i, s) + " =>"] = o, n), {})
  } : ir(t) ? {
    [`Set(${t.size})`]: [
      ...t.values()
    ].map((n) => Ki(n))
  } : bt(t) ? Ki(t) : he(t) && !X(t) && !rr(t) ? String(t) : t, Ki = (e, t = "") => {
    var n;
    return bt(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
  let je;
  class qa {
    constructor(t = false) {
      this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.__v_skip = true, this.parent = je, !t && je && (this.index = (je.scopes || (je.scopes = [])).push(this) - 1);
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
        const n = je;
        try {
          return je = this, t();
        } finally {
          je = n;
        }
      }
    }
    on() {
      ++this._on === 1 && (this.prevScope = je, je = this);
    }
    off() {
      this._on > 0 && --this._on === 0 && (je = this.prevScope, this.prevScope = void 0);
    }
    stop(t) {
      if (this._active) {
        this._active = false;
        let n, i;
        for (n = 0, i = this.effects.length; n < i; n++) this.effects[n].stop();
        for (this.effects.length = 0, n = 0, i = this.cleanups.length; n < i; n++) this.cleanups[n]();
        if (this.cleanups.length = 0, this.scopes) {
          for (n = 0, i = this.scopes.length; n < i; n++) this.scopes[n].stop(true);
          this.scopes.length = 0;
        }
        if (!this.detached && this.parent && !t) {
          const o = this.parent.scopes.pop();
          o && o !== this && (this.parent.scopes[this.index] = o, o.index = this.index);
        }
        this.parent = void 0;
      }
    }
  }
  function Ya() {
    return je;
  }
  let xe;
  const Xi = /* @__PURE__ */ new WeakSet();
  class dr {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, je && je.active && je.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, Xi.has(this) && (Xi.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || hr(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, is(this), gr(this);
      const t = xe, n = rt;
      xe = this, rt = true;
      try {
        return this.fn();
      } finally {
        vr(this), xe = t, rt = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) Uo(t);
        this.deps = this.depsTail = void 0, is(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? Xi.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      po(this) && this.run();
    }
    get dirty() {
      return po(this);
    }
  }
  let pr = 0, In, On;
  function hr(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = On, On = e;
      return;
    }
    e.next = In, In = e;
  }
  function Oo() {
    pr++;
  }
  function No() {
    if (--pr > 0) return;
    if (On) {
      let t = On;
      for (On = void 0; t; ) {
        const n = t.next;
        t.next = void 0, t.flags &= -9, t = n;
      }
    }
    let e;
    for (; In; ) {
      let t = In;
      for (In = void 0; t; ) {
        const n = t.next;
        if (t.next = void 0, t.flags &= -9, t.flags & 1) try {
          t.trigger();
        } catch (i) {
          e || (e = i);
        }
        t = n;
      }
    }
    if (e) throw e;
  }
  function gr(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function vr(e) {
    let t, n = e.depsTail, i = n;
    for (; i; ) {
      const o = i.prevDep;
      i.version === -1 ? (i === n && (n = o), Uo(i), Ka(i)) : t = i, i.dep.activeLink = i.prevActiveLink, i.prevActiveLink = void 0, i = o;
    }
    e.deps = t, e.depsTail = n;
  }
  function po(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (mr(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function mr(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Gn) || (e.globalVersion = Gn, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !po(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = xe, i = rt;
    xe = e, rt = true;
    try {
      gr(e);
      const o = e.fn(e._value);
      (t.version === 0 || qe(o, e._value)) && (e.flags |= 128, e._value = o, t.version++);
    } catch (o) {
      throw t.version++, o;
    } finally {
      xe = n, rt = i, vr(e), e.flags &= -3;
    }
  }
  function Uo(e, t = false) {
    const { dep: n, prevSub: i, nextSub: o } = e;
    if (i && (i.nextSub = o, e.prevSub = void 0), o && (o.prevSub = i, e.nextSub = void 0), n.subs === e && (n.subs = i, !i && n.computed)) {
      n.computed.flags &= -5;
      for (let s = n.computed.deps; s; s = s.nextDep) Uo(s, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function Ka(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let rt = true;
  const br = [];
  function Pt() {
    br.push(rt), rt = false;
  }
  function Lt() {
    const e = br.pop();
    rt = e === void 0 ? true : e;
  }
  function is(e) {
    const { cleanup: t } = e;
    if (e.cleanup = void 0, t) {
      const n = xe;
      xe = void 0;
      try {
        t();
      } finally {
        xe = n;
      }
    }
  }
  let Gn = 0;
  class Xa {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class Oi {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!xe || !rt || xe === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== xe) n = this.activeLink = new Xa(xe, this), xe.deps ? (n.prevDep = xe.depsTail, xe.depsTail.nextDep = n, xe.depsTail = n) : xe.deps = xe.depsTail = n, _r(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const i = n.nextDep;
        i.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = i), n.prevDep = xe.depsTail, n.nextDep = void 0, xe.depsTail.nextDep = n, xe.depsTail = n, xe.deps === n && (xe.deps = i);
      }
      return n;
    }
    trigger(t) {
      this.version++, Gn++, this.notify(t);
    }
    notify(t) {
      Oo();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        No();
      }
    }
  }
  function _r(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let i = t.deps; i; i = i.nextDep) _r(i);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const ho = /* @__PURE__ */ new WeakMap(), tn = /* @__PURE__ */ Symbol(""), go = /* @__PURE__ */ Symbol(""), Vn = /* @__PURE__ */ Symbol("");
  function Ne(e, t, n) {
    if (rt && xe) {
      let i = ho.get(e);
      i || ho.set(e, i = /* @__PURE__ */ new Map());
      let o = i.get(n);
      o || (i.set(n, o = new Oi()), o.map = i, o.key = n), o.track();
    }
  }
  function Mt(e, t, n, i, o, s) {
    const r = ho.get(e);
    if (!r) {
      Gn++;
      return;
    }
    const a = (l) => {
      l && l.trigger();
    };
    if (Oo(), t === "clear") r.forEach(a);
    else {
      const l = X(e), f = l && zo(n);
      if (l && n === "length") {
        const u = Number(i);
        r.forEach((d, v) => {
          (v === "length" || v === Vn || !bt(v) && v >= u) && a(d);
        });
      } else switch ((n !== void 0 || r.has(void 0)) && a(r.get(n)), f && a(r.get(Vn)), t) {
        case "add":
          l ? f && a(r.get("length")) : (a(r.get(tn)), gn(e) && a(r.get(go)));
          break;
        case "delete":
          l || (a(r.get(tn)), gn(e) && a(r.get(go)));
          break;
        case "set":
          gn(e) && a(r.get(tn));
          break;
      }
    }
    No();
  }
  function ln(e) {
    const t = re(e);
    return t === e ? t : (Ne(t, "iterate", Vn), et(e) ? t : t.map(at));
  }
  function Ni(e) {
    return Ne(e = re(e), "iterate", Vn), e;
  }
  function Ut(e, t) {
    return kt(e) ? wn(nn(e) ? at(t) : t) : at(t);
  }
  const Za = {
    __proto__: null,
    [Symbol.iterator]() {
      return Zi(this, Symbol.iterator, (e) => Ut(this, e));
    },
    concat(...e) {
      return ln(this).concat(...e.map((t) => X(t) ? ln(t) : t));
    },
    entries() {
      return Zi(this, "entries", (e) => (e[1] = Ut(this, e[1]), e));
    },
    every(e, t) {
      return yt(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return yt(this, "filter", e, t, (n) => n.map((i) => Ut(this, i)), arguments);
    },
    find(e, t) {
      return yt(this, "find", e, t, (n) => Ut(this, n), arguments);
    },
    findIndex(e, t) {
      return yt(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return yt(this, "findLast", e, t, (n) => Ut(this, n), arguments);
    },
    findLastIndex(e, t) {
      return yt(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return yt(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return Ji(this, "includes", e);
    },
    indexOf(...e) {
      return Ji(this, "indexOf", e);
    },
    join(e) {
      return ln(this).join(e);
    },
    lastIndexOf(...e) {
      return Ji(this, "lastIndexOf", e);
    },
    map(e, t) {
      return yt(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return Ln(this, "pop");
    },
    push(...e) {
      return Ln(this, "push", e);
    },
    reduce(e, ...t) {
      return os(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return os(this, "reduceRight", e, t);
    },
    shift() {
      return Ln(this, "shift");
    },
    some(e, t) {
      return yt(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return Ln(this, "splice", e);
    },
    toReversed() {
      return ln(this).toReversed();
    },
    toSorted(e) {
      return ln(this).toSorted(e);
    },
    toSpliced(...e) {
      return ln(this).toSpliced(...e);
    },
    unshift(...e) {
      return Ln(this, "unshift", e);
    },
    values() {
      return Zi(this, "values", (e) => Ut(this, e));
    }
  };
  function Zi(e, t, n) {
    const i = Ni(e), o = i[t]();
    return i !== e && !et(e) && (o._next = o.next, o.next = () => {
      const s = o._next();
      return s.done || (s.value = n(s.value)), s;
    }), o;
  }
  const Ja = Array.prototype;
  function yt(e, t, n, i, o, s) {
    const r = Ni(e), a = r !== e && !et(e), l = r[t];
    if (l !== Ja[t]) {
      const d = l.apply(e, s);
      return a ? at(d) : d;
    }
    let f = n;
    r !== e && (a ? f = function(d, v) {
      return n.call(this, Ut(e, d), v, e);
    } : n.length > 2 && (f = function(d, v) {
      return n.call(this, d, v, e);
    }));
    const u = l.call(r, f, i);
    return a && o ? o(u) : u;
  }
  function os(e, t, n, i) {
    const o = Ni(e);
    let s = n;
    return o !== e && (et(e) ? n.length > 3 && (s = function(r, a, l) {
      return n.call(this, r, a, l, e);
    }) : s = function(r, a, l) {
      return n.call(this, r, Ut(e, a), l, e);
    }), o[t](s, ...i);
  }
  function Ji(e, t, n) {
    const i = re(e);
    Ne(i, "iterate", Vn);
    const o = i[t](...n);
    return (o === -1 || o === false) && $o(n[0]) ? (n[0] = re(n[0]), i[t](...n)) : o;
  }
  function Ln(e, t, n = []) {
    Pt(), Oo();
    const i = re(e)[t].apply(e, n);
    return No(), Lt(), i;
  }
  const Qa = ko("__proto__,__v_isRef,__isVue"), xr = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(bt));
  function el(e) {
    bt(e) || (e = String(e));
    const t = re(this);
    return Ne(t, "has", e), t.hasOwnProperty(e);
  }
  class yr {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, i) {
      if (n === "__v_skip") return t.__v_skip;
      const o = this._isReadonly, s = this._isShallow;
      if (n === "__v_isReactive") return !o;
      if (n === "__v_isReadonly") return o;
      if (n === "__v_isShallow") return s;
      if (n === "__v_raw") return i === (o ? s ? cl : Mr : s ? Tr : Sr).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(i) ? t : void 0;
      const r = X(t);
      if (!o) {
        let l;
        if (r && (l = Za[n])) return l;
        if (n === "hasOwnProperty") return el;
      }
      const a = Reflect.get(t, n, Fe(t) ? t : i);
      if ((bt(n) ? xr.has(n) : Qa(n)) || (o || Ne(t, "get", n), s)) return a;
      if (Fe(a)) {
        const l = r && zo(n) ? a : a.value;
        return o && he(l) ? mo(l) : l;
      }
      return he(a) ? o ? mo(a) : vn(a) : a;
    }
  }
  class wr extends yr {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, i, o) {
      let s = t[n];
      const r = X(t) && zo(n);
      if (!this._isShallow) {
        const f = kt(s);
        if (!et(i) && !kt(i) && (s = re(s), i = re(i)), !r && Fe(s) && !Fe(i)) return f || (s.value = i), true;
      }
      const a = r ? Number(n) < t.length : pe(t, n), l = Reflect.set(t, n, i, Fe(t) ? t : o);
      return t === re(o) && (a ? qe(i, s) && Mt(t, "set", n, i) : Mt(t, "add", n, i)), l;
    }
    deleteProperty(t, n) {
      const i = pe(t, n);
      t[n];
      const o = Reflect.deleteProperty(t, n);
      return o && i && Mt(t, "delete", n, void 0), o;
    }
    has(t, n) {
      const i = Reflect.has(t, n);
      return (!bt(n) || !xr.has(n)) && Ne(t, "has", n), i;
    }
    ownKeys(t) {
      return Ne(t, "iterate", X(t) ? "length" : tn), Reflect.ownKeys(t);
    }
  }
  class tl extends yr {
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
  const nl = new wr(), il = new tl(), ol = new wr(true);
  const vo = (e) => e, ii = (e) => Reflect.getPrototypeOf(e);
  function sl(e, t, n) {
    return function(...i) {
      const o = this.__v_raw, s = re(o), r = gn(s), a = e === "entries" || e === Symbol.iterator && r, l = e === "keys" && r, f = o[e](...i), u = n ? vo : t ? wn : at;
      return !t && Ne(s, "iterate", l ? go : tn), Le(Object.create(f), {
        next() {
          const { value: d, done: v } = f.next();
          return v ? {
            value: d,
            done: v
          } : {
            value: a ? [
              u(d[0]),
              u(d[1])
            ] : u(d),
            done: v
          };
        }
      });
    };
  }
  function oi(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function rl(e, t) {
    const n = {
      get(o) {
        const s = this.__v_raw, r = re(s), a = re(o);
        e || (qe(o, a) && Ne(r, "get", o), Ne(r, "get", a));
        const { has: l } = ii(r), f = t ? vo : e ? wn : at;
        if (l.call(r, o)) return f(s.get(o));
        if (l.call(r, a)) return f(s.get(a));
        s !== r && s.get(o);
      },
      get size() {
        const o = this.__v_raw;
        return !e && Ne(re(o), "iterate", tn), o.size;
      },
      has(o) {
        const s = this.__v_raw, r = re(s), a = re(o);
        return e || (qe(o, a) && Ne(r, "has", o), Ne(r, "has", a)), o === a ? s.has(o) : s.has(o) || s.has(a);
      },
      forEach(o, s) {
        const r = this, a = r.__v_raw, l = re(a), f = t ? vo : e ? wn : at;
        return !e && Ne(l, "iterate", tn), a.forEach((u, d) => o.call(s, f(u), f(d), r));
      }
    };
    return Le(n, e ? {
      add: oi("add"),
      set: oi("set"),
      delete: oi("delete"),
      clear: oi("clear")
    } : {
      add(o) {
        !t && !et(o) && !kt(o) && (o = re(o));
        const s = re(this);
        return ii(s).has.call(s, o) || (s.add(o), Mt(s, "add", o, o)), this;
      },
      set(o, s) {
        !t && !et(s) && !kt(s) && (s = re(s));
        const r = re(this), { has: a, get: l } = ii(r);
        let f = a.call(r, o);
        f || (o = re(o), f = a.call(r, o));
        const u = l.call(r, o);
        return r.set(o, s), f ? qe(s, u) && Mt(r, "set", o, s) : Mt(r, "add", o, s), this;
      },
      delete(o) {
        const s = re(this), { has: r, get: a } = ii(s);
        let l = r.call(s, o);
        l || (o = re(o), l = r.call(s, o)), a && a.call(s, o);
        const f = s.delete(o);
        return l && Mt(s, "delete", o, void 0), f;
      },
      clear() {
        const o = re(this), s = o.size !== 0, r = o.clear();
        return s && Mt(o, "clear", void 0, void 0), r;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((o) => {
      n[o] = sl(o, e, t);
    }), n;
  }
  function Fo(e, t) {
    const n = rl(e, t);
    return (i, o, s) => o === "__v_isReactive" ? !e : o === "__v_isReadonly" ? e : o === "__v_raw" ? i : Reflect.get(pe(n, o) && o in i ? n : i, o, s);
  }
  const al = {
    get: Fo(false, false)
  }, ll = {
    get: Fo(false, true)
  }, ul = {
    get: Fo(true, false)
  };
  const Sr = /* @__PURE__ */ new WeakMap(), Tr = /* @__PURE__ */ new WeakMap(), Mr = /* @__PURE__ */ new WeakMap(), cl = /* @__PURE__ */ new WeakMap();
  function fl(e) {
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
  function dl(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : fl(Oa(e));
  }
  function vn(e) {
    return kt(e) ? e : Do(e, false, nl, al, Sr);
  }
  function pl(e) {
    return Do(e, false, ol, ll, Tr);
  }
  function mo(e) {
    return Do(e, true, il, ul, Mr);
  }
  function Do(e, t, n, i, o) {
    if (!he(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const s = dl(e);
    if (s === 0) return e;
    const r = o.get(e);
    if (r) return r;
    const a = new Proxy(e, s === 2 ? i : n);
    return o.set(e, a), a;
  }
  function nn(e) {
    return kt(e) ? nn(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function kt(e) {
    return !!(e && e.__v_isReadonly);
  }
  function et(e) {
    return !!(e && e.__v_isShallow);
  }
  function $o(e) {
    return e ? !!e.__v_raw : false;
  }
  function re(e) {
    const t = e && e.__v_raw;
    return t ? re(t) : e;
  }
  function hl(e) {
    return !pe(e, "__v_skip") && Object.isExtensible(e) && lr(e, "__v_skip", true), e;
  }
  const at = (e) => he(e) ? vn(e) : e, wn = (e) => he(e) ? mo(e) : e;
  function Fe(e) {
    return e ? e.__v_isRef === true : false;
  }
  function Q(e) {
    return gl(e, false);
  }
  function gl(e, t) {
    return Fe(e) ? e : new vl(e, t);
  }
  class vl {
    constructor(t, n) {
      this.dep = new Oi(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : re(t), this._value = n ? t : at(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, i = this.__v_isShallow || et(t) || kt(t);
      t = i ? t : re(t), qe(t, n) && (this._rawValue = t, this._value = i ? t : at(t), this.dep.trigger());
    }
  }
  function ml(e) {
    return Fe(e) ? e.value : e;
  }
  const bl = {
    get: (e, t, n) => t === "__v_raw" ? e : ml(Reflect.get(e, t, n)),
    set: (e, t, n, i) => {
      const o = e[t];
      return Fe(o) && !Fe(n) ? (o.value = n, true) : Reflect.set(e, t, n, i);
    }
  };
  function Cr(e) {
    return nn(e) ? e : new Proxy(e, bl);
  }
  class _l {
    constructor(t) {
      this.__v_isRef = true, this._value = void 0;
      const n = this.dep = new Oi(), { get: i, set: o } = t(n.track.bind(n), n.trigger.bind(n));
      this._get = i, this._set = o;
    }
    get value() {
      return this._value = this._get();
    }
    set value(t) {
      this._set(t);
    }
  }
  function xl(e) {
    return new _l(e);
  }
  class yl {
    constructor(t, n, i) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new Oi(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Gn - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = i;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && xe !== this) return hr(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return mr(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function wl(e, t, n = false) {
    let i, o;
    return ee(e) ? i = e : (i = e.get, o = e.set), new yl(i, o, n);
  }
  const si = {}, xi = /* @__PURE__ */ new WeakMap();
  let Jt;
  function Sl(e, t = false, n = Jt) {
    if (n) {
      let i = xi.get(n);
      i || xi.set(n, i = []), i.push(e);
    }
  }
  function Tl(e, t, n = de) {
    const { immediate: i, deep: o, once: s, scheduler: r, augmentJob: a, call: l } = n, f = (U) => o ? U : et(U) || o === false || o === 0 ? Ct(U, 1) : Ct(U);
    let u, d, v, b, _ = false, x = false;
    if (Fe(e) ? (d = () => e.value, _ = et(e)) : nn(e) ? (d = () => f(e), _ = true) : X(e) ? (x = true, _ = e.some((U) => nn(U) || et(U)), d = () => e.map((U) => {
      if (Fe(U)) return U.value;
      if (nn(U)) return f(U);
      if (ee(U)) return l ? l(U, 2) : U();
    })) : ee(e) ? t ? d = l ? () => l(e, 2) : e : d = () => {
      if (v) {
        Pt();
        try {
          v();
        } finally {
          Lt();
        }
      }
      const U = Jt;
      Jt = u;
      try {
        return l ? l(e, 3, [
          b
        ]) : e(b);
      } finally {
        Jt = U;
      }
    } : d = ht, t && o) {
      const U = d, D = o === true ? 1 / 0 : o;
      d = () => Ct(U(), D);
    }
    const $ = Ya(), V = () => {
      u.stop(), $ && $.active && Ao($.effects, u);
    };
    if (s && t) {
      const U = t;
      t = (...D) => {
        U(...D), V();
      };
    }
    let k = x ? new Array(e.length).fill(si) : si;
    const T = (U) => {
      if (!(!(u.flags & 1) || !u.dirty && !U)) if (t) {
        const D = u.run();
        if (o || _ || (x ? D.some((q, oe) => qe(q, k[oe])) : qe(D, k))) {
          v && v();
          const q = Jt;
          Jt = u;
          try {
            const oe = [
              D,
              k === si ? void 0 : x && k[0] === si ? [] : k,
              b
            ];
            k = D, l ? l(t, 3, oe) : t(...oe);
          } finally {
            Jt = q;
          }
        }
      } else u.run();
    };
    return a && a(T), u = new dr(d), u.scheduler = r ? () => r(T, false) : T, b = (U) => Sl(U, false, u), v = u.onStop = () => {
      const U = xi.get(u);
      if (U) {
        if (l) l(U, 4);
        else for (const D of U) D();
        xi.delete(u);
      }
    }, t ? i ? T(true) : k = u.run() : r ? r(T.bind(null, true), true) : u.run(), V.pause = u.pause.bind(u), V.resume = u.resume.bind(u), V.stop = V, V;
  }
  function Ct(e, t = 1 / 0, n) {
    if (t <= 0 || !he(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
    if (n.set(e, t), t--, Fe(e)) Ct(e.value, t, n);
    else if (X(e)) for (let i = 0; i < e.length; i++) Ct(e[i], t, n);
    else if (ir(e) || gn(e)) e.forEach((i) => {
      Ct(i, t, n);
    });
    else if (rr(e)) {
      for (const i in e) Ct(e[i], t, n);
      for (const i of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, i) && Ct(e[i], t, n);
    }
    return e;
  }
  function ei(e, t, n, i) {
    try {
      return i ? e(...i) : e();
    } catch (o) {
      Ui(o, t, n);
    }
  }
  function lt(e, t, n, i) {
    if (ee(e)) {
      const o = ei(e, t, n, i);
      return o && or(o) && o.catch((s) => {
        Ui(s, t, n);
      }), o;
    }
    if (X(e)) {
      const o = [];
      for (let s = 0; s < e.length; s++) o.push(lt(e[s], t, n, i));
      return o;
    }
  }
  function Ui(e, t, n, i = true) {
    const o = t ? t.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: r } = t && t.appContext.config || de;
    if (t) {
      let a = t.parent;
      const l = t.proxy, f = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; a; ) {
        const u = a.ec;
        if (u) {
          for (let d = 0; d < u.length; d++) if (u[d](e, l, f) === false) return;
        }
        a = a.parent;
      }
      if (s) {
        Pt(), ei(s, null, 10, [
          e,
          l,
          f
        ]), Lt();
        return;
      }
    }
    Ml(e, n, o, i, r);
  }
  function Ml(e, t, n, i = true, o = false) {
    if (o) throw e;
    console.error(e);
  }
  const Ge = [];
  let ct = -1;
  const mn = [];
  let Ft = null, dn = 0;
  const Er = Promise.resolve();
  let yi = null;
  function Fi(e) {
    const t = yi || Er;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function Cl(e) {
    let t = ct + 1, n = Ge.length;
    for (; t < n; ) {
      const i = t + n >>> 1, o = Ge[i], s = Hn(o);
      s < e || s === e && o.flags & 2 ? t = i + 1 : n = i;
    }
    return t;
  }
  function Go(e) {
    if (!(e.flags & 1)) {
      const t = Hn(e), n = Ge[Ge.length - 1];
      !n || !(e.flags & 2) && t >= Hn(n) ? Ge.push(e) : Ge.splice(Cl(t), 0, e), e.flags |= 1, Pr();
    }
  }
  function Pr() {
    yi || (yi = Er.then(kr));
  }
  function El(e) {
    X(e) ? mn.push(...e) : Ft && e.id === -1 ? Ft.splice(dn + 1, 0, e) : e.flags & 1 || (mn.push(e), e.flags |= 1), Pr();
  }
  function ss(e, t, n = ct + 1) {
    for (; n < Ge.length; n++) {
      const i = Ge[n];
      if (i && i.flags & 2) {
        if (e && i.id !== e.uid) continue;
        Ge.splice(n, 1), n--, i.flags & 4 && (i.flags &= -2), i(), i.flags & 4 || (i.flags &= -2);
      }
    }
  }
  function Lr(e) {
    if (mn.length) {
      const t = [
        ...new Set(mn)
      ].sort((n, i) => Hn(n) - Hn(i));
      if (mn.length = 0, Ft) {
        Ft.push(...t);
        return;
      }
      for (Ft = t, dn = 0; dn < Ft.length; dn++) {
        const n = Ft[dn];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      Ft = null, dn = 0;
    }
  }
  const Hn = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function kr(e) {
    try {
      for (ct = 0; ct < Ge.length; ct++) {
        const t = Ge[ct];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), ei(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; ct < Ge.length; ct++) {
        const t = Ge[ct];
        t && (t.flags &= -2);
      }
      ct = -1, Ge.length = 0, Lr(), yi = null, (Ge.length || mn.length) && kr();
    }
  }
  let Qe = null, Rr = null;
  function wi(e) {
    const t = Qe;
    return Qe = e, Rr = e && e.type.__scopeId || null, t;
  }
  function Ar(e, t = Qe, n) {
    if (!t || e._n) return e;
    const i = (...o) => {
      i._d && Ci(-1);
      const s = wi(t);
      let r;
      try {
        r = e(...o);
      } finally {
        wi(s), i._d && Ci(1);
      }
      return r;
    };
    return i._n = true, i._c = true, i._d = true, i;
  }
  function $e(e, t) {
    if (Qe === null) return e;
    const n = Wi(Qe), i = e.dirs || (e.dirs = []);
    for (let o = 0; o < t.length; o++) {
      let [s, r, a, l = de] = t[o];
      s && (ee(s) && (s = {
        mounted: s,
        updated: s
      }), s.deep && Ct(r), i.push({
        dir: s,
        instance: n,
        value: r,
        oldValue: void 0,
        arg: a,
        modifiers: l
      }));
    }
    return e;
  }
  function Yt(e, t, n, i) {
    const o = e.dirs, s = t && t.dirs;
    for (let r = 0; r < o.length; r++) {
      const a = o[r];
      s && (a.oldValue = s[r].value);
      let l = a.dir[i];
      l && (Pt(), lt(l, n, 8, [
        e.el,
        a,
        e,
        t
      ]), Lt());
    }
  }
  function Pl(e, t) {
    if (He) {
      let n = He.provides;
      const i = He.parent && He.parent.provides;
      i === n && (n = He.provides = Object.create(i)), n[e] = t;
    }
  }
  function hi(e, t, n = false) {
    const i = qo();
    if (i || _n) {
      let o = _n ? _n._context.provides : i ? i.parent == null || i.ce ? i.vnode.appContext && i.vnode.appContext.provides : i.parent.provides : void 0;
      if (o && e in o) return o[e];
      if (arguments.length > 1) return n && ee(t) ? t.call(i && i.proxy) : t;
    }
  }
  const Ll = /* @__PURE__ */ Symbol.for("v-scx"), kl = () => hi(Ll);
  function Rl(e, t) {
    return Vo(e, null, {
      flush: "sync"
    });
  }
  function gt(e, t, n) {
    return Vo(e, t, n);
  }
  function Vo(e, t, n = de) {
    const { immediate: i, deep: o, flush: s, once: r } = n, a = Le({}, n), l = t && i || !t && s !== "post";
    let f;
    if (qn) {
      if (s === "sync") {
        const b = kl();
        f = b.__watcherHandles || (b.__watcherHandles = []);
      } else if (!l) {
        const b = () => {
        };
        return b.stop = ht, b.resume = ht, b.pause = ht, b;
      }
    }
    const u = He;
    a.call = (b, _, x) => lt(b, u, _, x);
    let d = false;
    s === "post" ? a.scheduler = (b) => {
      We(b, u && u.suspense);
    } : s !== "sync" && (d = true, a.scheduler = (b, _) => {
      _ ? b() : Go(b);
    }), a.augmentJob = (b) => {
      t && (b.flags |= 4), d && (b.flags |= 2, u && (b.id = u.uid, b.i = u));
    };
    const v = Tl(e, t, a);
    return qn && (f ? f.push(v) : l && v()), v;
  }
  function Al(e, t, n) {
    const i = this.proxy, o = Ce(e) ? e.includes(".") ? zr(i, e) : () => i[e] : e.bind(i, i);
    let s;
    ee(t) ? s = t : (s = t.handler, n = t);
    const r = ti(this), a = Vo(o, s.bind(i), n);
    return r(), a;
  }
  function zr(e, t) {
    const n = t.split(".");
    return () => {
      let i = e;
      for (let o = 0; o < n.length && i; o++) i = i[n[o]];
      return i;
    };
  }
  const zl = /* @__PURE__ */ Symbol("_vte"), Br = (e) => e.__isTeleport, ft = /* @__PURE__ */ Symbol("_leaveCb"), kn = /* @__PURE__ */ Symbol("_enterCb");
  function Bl() {
    const e = {
      isMounted: false,
      isLeaving: false,
      isUnmounting: false,
      leavingVNodes: /* @__PURE__ */ new Map()
    };
    return zt(() => {
      e.isMounted = true;
    }), Gr(() => {
      e.isUnmounting = true;
    }), e;
  }
  const Ze = [
    Function,
    Array
  ], Ir = {
    mode: String,
    appear: Boolean,
    persisted: Boolean,
    onBeforeEnter: Ze,
    onEnter: Ze,
    onAfterEnter: Ze,
    onEnterCancelled: Ze,
    onBeforeLeave: Ze,
    onLeave: Ze,
    onAfterLeave: Ze,
    onLeaveCancelled: Ze,
    onBeforeAppear: Ze,
    onAppear: Ze,
    onAfterAppear: Ze,
    onAppearCancelled: Ze
  }, Or = (e) => {
    const t = e.subTree;
    return t.component ? Or(t.component) : t;
  }, Il = {
    name: "BaseTransition",
    props: Ir,
    setup(e, { slots: t }) {
      const n = qo(), i = Bl();
      return () => {
        const o = t.default && Fr(t.default(), true);
        if (!o || !o.length) return;
        const s = Nr(o), r = re(e), { mode: a } = r;
        if (i.isLeaving) return Qi(s);
        const l = rs(s);
        if (!l) return Qi(s);
        let f = bo(l, r, i, n, (d) => f = d);
        l.type !== Ve && Wn(l, f);
        let u = n.subTree && rs(n.subTree);
        if (u && u.type !== Ve && !Qt(u, l) && Or(n).type !== Ve) {
          let d = bo(u, r, i, n);
          if (Wn(u, d), a === "out-in" && l.type !== Ve) return i.isLeaving = true, d.afterLeave = () => {
            i.isLeaving = false, n.job.flags & 8 || n.update(), delete d.afterLeave, u = void 0;
          }, Qi(s);
          a === "in-out" && l.type !== Ve ? d.delayLeave = (v, b, _) => {
            const x = Ur(i, u);
            x[String(u.key)] = u, v[ft] = () => {
              b(), v[ft] = void 0, delete f.delayedLeave, u = void 0;
            }, f.delayedLeave = () => {
              _(), delete f.delayedLeave, u = void 0;
            };
          } : u = void 0;
        } else u && (u = void 0);
        return s;
      };
    }
  };
  function Nr(e) {
    let t = e[0];
    if (e.length > 1) {
      for (const n of e) if (n.type !== Ve) {
        t = n;
        break;
      }
    }
    return t;
  }
  const Ol = Il;
  function Ur(e, t) {
    const { leavingVNodes: n } = e;
    let i = n.get(t.type);
    return i || (i = /* @__PURE__ */ Object.create(null), n.set(t.type, i)), i;
  }
  function bo(e, t, n, i, o) {
    const { appear: s, mode: r, persisted: a = false, onBeforeEnter: l, onEnter: f, onAfterEnter: u, onEnterCancelled: d, onBeforeLeave: v, onLeave: b, onAfterLeave: _, onLeaveCancelled: x, onBeforeAppear: $, onAppear: V, onAfterAppear: k, onAppearCancelled: T } = t, U = String(e.key), D = Ur(n, e), q = (Y, W) => {
      Y && lt(Y, i, 9, W);
    }, oe = (Y, W) => {
      const ne = W[1];
      q(Y, W), X(Y) ? Y.every((R) => R.length <= 1) && ne() : Y.length <= 1 && ne();
    }, le = {
      mode: r,
      persisted: a,
      beforeEnter(Y) {
        let W = l;
        if (!n.isMounted) if (s) W = $ || l;
        else return;
        Y[ft] && Y[ft](true);
        const ne = D[U];
        ne && Qt(e, ne) && ne.el[ft] && ne.el[ft](), q(W, [
          Y
        ]);
      },
      enter(Y) {
        let W = f, ne = u, R = d;
        if (!n.isMounted) if (s) W = V || f, ne = k || u, R = T || d;
        else return;
        let B = false;
        Y[kn] = (P) => {
          B || (B = true, P ? q(R, [
            Y
          ]) : q(ne, [
            Y
          ]), le.delayedLeave && le.delayedLeave(), Y[kn] = void 0);
        };
        const L = Y[kn].bind(null, false);
        W ? oe(W, [
          Y,
          L
        ]) : L();
      },
      leave(Y, W) {
        const ne = String(e.key);
        if (Y[kn] && Y[kn](true), n.isUnmounting) return W();
        q(v, [
          Y
        ]);
        let R = false;
        Y[ft] = (L) => {
          R || (R = true, W(), L ? q(x, [
            Y
          ]) : q(_, [
            Y
          ]), Y[ft] = void 0, D[ne] === e && delete D[ne]);
        };
        const B = Y[ft].bind(null, false);
        D[ne] = e, b ? oe(b, [
          Y,
          B
        ]) : B();
      },
      clone(Y) {
        const W = bo(Y, t, n, i, o);
        return o && o(W), W;
      }
    };
    return le;
  }
  function Qi(e) {
    if (Di(e)) return e = Gt(e), e.children = null, e;
  }
  function rs(e) {
    if (!Di(e)) return Br(e.type) && e.children ? Nr(e.children) : e;
    if (e.component) return e.component.subTree;
    const { shapeFlag: t, children: n } = e;
    if (n) {
      if (t & 16) return n[0];
      if (t & 32 && ee(n.default)) return n.default();
    }
  }
  function Wn(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, Wn(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function Fr(e, t = false, n) {
    let i = [], o = 0;
    for (let s = 0; s < e.length; s++) {
      let r = e[s];
      const a = n == null ? r.key : String(n) + String(r.key != null ? r.key : s);
      r.type === ze ? (r.patchFlag & 128 && o++, i = i.concat(Fr(r.children, t, a))) : (t || r.type !== Ve) && i.push(a != null ? Gt(r, {
        key: a
      }) : r);
    }
    if (o > 1) for (let s = 0; s < i.length; s++) i[s].patchFlag = -2;
    return i;
  }
  function Rt(e, t) {
    return ee(e) ? Le({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function Dr(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function as(e, t) {
    let n;
    return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
  }
  const Si = /* @__PURE__ */ new WeakMap();
  function Nn(e, t, n, i, o = false) {
    if (X(e)) {
      e.forEach((x, $) => Nn(x, t && (X(t) ? t[$] : t), n, i, o));
      return;
    }
    if (Un(i) && !o) {
      i.shapeFlag & 512 && i.type.__asyncResolved && i.component.subTree.component && Nn(e, t, n, i.component.subTree);
      return;
    }
    const s = i.shapeFlag & 4 ? Wi(i.component) : i.el, r = o ? null : s, { i: a, r: l } = e, f = t && t.r, u = a.refs === de ? a.refs = {} : a.refs, d = a.setupState, v = re(d), b = d === de ? nr : (x) => as(u, x) ? false : pe(v, x), _ = (x, $) => !($ && as(u, $));
    if (f != null && f !== l) {
      if (ls(t), Ce(f)) u[f] = null, b(f) && (d[f] = null);
      else if (Fe(f)) {
        const x = t;
        _(f, x.k) && (f.value = null), x.k && (u[x.k] = null);
      }
    }
    if (ee(l)) ei(l, a, 12, [
      r,
      u
    ]);
    else {
      const x = Ce(l), $ = Fe(l);
      if (x || $) {
        const V = () => {
          if (e.f) {
            const k = x ? b(l) ? d[l] : u[l] : _() || !e.k ? l.value : u[e.k];
            if (o) X(k) && Ao(k, s);
            else if (X(k)) k.includes(s) || k.push(s);
            else if (x) u[l] = [
              s
            ], b(l) && (d[l] = u[l]);
            else {
              const T = [
                s
              ];
              _(l, e.k) && (l.value = T), e.k && (u[e.k] = T);
            }
          } else x ? (u[l] = r, b(l) && (d[l] = r)) : $ && (_(l, e.k) && (l.value = r), e.k && (u[e.k] = r));
        };
        if (r) {
          const k = () => {
            V(), Si.delete(e);
          };
          k.id = -1, Si.set(e, k), We(k, n);
        } else ls(e), V();
      }
    }
  }
  function ls(e) {
    const t = Si.get(e);
    t && (t.flags |= 8, Si.delete(e));
  }
  Ii().requestIdleCallback;
  Ii().cancelIdleCallback;
  const Un = (e) => !!e.type.__asyncLoader, Di = (e) => e.type.__isKeepAlive;
  function Nl(e, t) {
    $r(e, "a", t);
  }
  function Ul(e, t) {
    $r(e, "da", t);
  }
  function $r(e, t, n = He) {
    const i = e.__wdc || (e.__wdc = () => {
      let o = n;
      for (; o; ) {
        if (o.isDeactivated) return;
        o = o.parent;
      }
      return e();
    });
    if ($i(t, i, n), n) {
      let o = n.parent;
      for (; o && o.parent; ) Di(o.parent.vnode) && Fl(i, t, n, o), o = o.parent;
    }
  }
  function Fl(e, t, n, i) {
    const o = $i(t, e, i, true);
    Mn(() => {
      Ao(i[t], o);
    }, n);
  }
  function $i(e, t, n = He, i = false) {
    if (n) {
      const o = n[e] || (n[e] = []), s = t.__weh || (t.__weh = (...r) => {
        Pt();
        const a = ti(n), l = lt(t, n, e, r);
        return a(), Lt(), l;
      });
      return i ? o.unshift(s) : o.push(s), s;
    }
  }
  const At = (e) => (t, n = He) => {
    (!qn || e === "sp") && $i(e, (...i) => t(...i), n);
  }, Dl = At("bm"), zt = At("m"), $l = At("bu"), Gl = At("u"), Gr = At("bum"), Mn = At("um"), Vl = At("sp"), Hl = At("rtg"), Wl = At("rtc");
  function jl(e, t = He) {
    $i("ec", e, t);
  }
  const ql = /* @__PURE__ */ Symbol.for("v-ndc");
  function bn(e, t, n, i) {
    let o;
    const s = n, r = X(e);
    if (r || Ce(e)) {
      const a = r && nn(e);
      let l = false, f = false;
      a && (l = !et(e), f = kt(e), e = Ni(e)), o = new Array(e.length);
      for (let u = 0, d = e.length; u < d; u++) o[u] = t(l ? f ? wn(at(e[u])) : at(e[u]) : e[u], u, void 0, s);
    } else if (typeof e == "number") {
      o = new Array(e);
      for (let a = 0; a < e; a++) o[a] = t(a + 1, a, void 0, s);
    } else if (he(e)) if (e[Symbol.iterator]) o = Array.from(e, (a, l) => t(a, l, void 0, s));
    else {
      const a = Object.keys(e);
      o = new Array(a.length);
      for (let l = 0, f = a.length; l < f; l++) {
        const u = a[l];
        o[l] = t(e[u], u, l, s);
      }
    }
    else o = [];
    return o;
  }
  const _o = (e) => e ? fa(e) ? Wi(e) : _o(e.parent) : null, Fn = Le(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => _o(e.parent),
    $root: (e) => _o(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Hr(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Go(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Fi.bind(e.proxy)),
    $watch: (e) => Al.bind(e)
  }), eo = (e, t) => e !== de && !e.__isScriptSetup && pe(e, t), Yl = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: i, data: o, props: s, accessCache: r, type: a, appContext: l } = e;
      if (t[0] !== "$") {
        const v = r[t];
        if (v !== void 0) switch (v) {
          case 1:
            return i[t];
          case 2:
            return o[t];
          case 4:
            return n[t];
          case 3:
            return s[t];
        }
        else {
          if (eo(i, t)) return r[t] = 1, i[t];
          if (o !== de && pe(o, t)) return r[t] = 2, o[t];
          if (pe(s, t)) return r[t] = 3, s[t];
          if (n !== de && pe(n, t)) return r[t] = 4, n[t];
          xo && (r[t] = 0);
        }
      }
      const f = Fn[t];
      let u, d;
      if (f) return t === "$attrs" && Ne(e.attrs, "get", ""), f(e);
      if ((u = a.__cssModules) && (u = u[t])) return u;
      if (n !== de && pe(n, t)) return r[t] = 4, n[t];
      if (d = l.config.globalProperties, pe(d, t)) return d[t];
    },
    set({ _: e }, t, n) {
      const { data: i, setupState: o, ctx: s } = e;
      return eo(o, t) ? (o[t] = n, true) : i !== de && pe(i, t) ? (i[t] = n, true) : pe(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (s[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: i, appContext: o, props: s, type: r } }, a) {
      let l;
      return !!(n[a] || e !== de && a[0] !== "$" && pe(e, a) || eo(t, a) || pe(s, a) || pe(i, a) || pe(Fn, a) || pe(o.config.globalProperties, a) || (l = r.__cssModules) && l[a]);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : pe(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function Ti(e) {
    return X(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  function Gi(e, t) {
    return !e || !t ? e || t : X(e) && X(t) ? e.concat(t) : Le({}, Ti(e), Ti(t));
  }
  let xo = true;
  function Kl(e) {
    const t = Hr(e), n = e.proxy, i = e.ctx;
    xo = false, t.beforeCreate && us(t.beforeCreate, e, "bc");
    const { data: o, computed: s, methods: r, watch: a, provide: l, inject: f, created: u, beforeMount: d, mounted: v, beforeUpdate: b, updated: _, activated: x, deactivated: $, beforeDestroy: V, beforeUnmount: k, destroyed: T, unmounted: U, render: D, renderTracked: q, renderTriggered: oe, errorCaptured: le, serverPrefetch: Y, expose: W, inheritAttrs: ne, components: R, directives: B, filters: L } = t;
    if (f && Xl(f, i, null), r) for (const O in r) {
      const H = r[O];
      ee(H) && (i[O] = H.bind(n));
    }
    if (o) {
      const O = o.call(n, n);
      he(O) && (e.data = vn(O));
    }
    if (xo = true, s) for (const O in s) {
      const H = s[O], be = ee(H) ? H.bind(n, n) : ee(H.get) ? H.get.bind(n, n) : ht, Me = !ee(H) && ee(H.set) ? H.set.bind(n) : ht, Re = Ae({
        get: be,
        set: Me
      });
      Object.defineProperty(i, O, {
        enumerable: true,
        configurable: true,
        get: () => Re.value,
        set: (Ee) => Re.value = Ee
      });
    }
    if (a) for (const O in a) Vr(a[O], i, n, O);
    if (l) {
      const O = ee(l) ? l.call(n) : l;
      Reflect.ownKeys(O).forEach((H) => {
        Pl(H, O[H]);
      });
    }
    u && us(u, e, "c");
    function A(O, H) {
      X(H) ? H.forEach((be) => O(be.bind(n))) : H && O(H.bind(n));
    }
    if (A(Dl, d), A(zt, v), A($l, b), A(Gl, _), A(Nl, x), A(Ul, $), A(jl, le), A(Wl, q), A(Hl, oe), A(Gr, k), A(Mn, U), A(Vl, Y), X(W)) if (W.length) {
      const O = e.exposed || (e.exposed = {});
      W.forEach((H) => {
        Object.defineProperty(O, H, {
          get: () => n[H],
          set: (be) => n[H] = be,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    D && e.render === ht && (e.render = D), ne != null && (e.inheritAttrs = ne), R && (e.components = R), B && (e.directives = B), Y && Dr(e);
  }
  function Xl(e, t, n = ht) {
    X(e) && (e = yo(e));
    for (const i in e) {
      const o = e[i];
      let s;
      he(o) ? "default" in o ? s = hi(o.from || i, o.default, true) : s = hi(o.from || i) : s = hi(o), Fe(s) ? Object.defineProperty(t, i, {
        enumerable: true,
        configurable: true,
        get: () => s.value,
        set: (r) => s.value = r
      }) : t[i] = s;
    }
  }
  function us(e, t, n) {
    lt(X(e) ? e.map((i) => i.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function Vr(e, t, n, i) {
    let o = i.includes(".") ? zr(n, i) : () => n[i];
    if (Ce(e)) {
      const s = t[e];
      ee(s) && gt(o, s);
    } else if (ee(e)) gt(o, e.bind(n));
    else if (he(e)) if (X(e)) e.forEach((s) => Vr(s, t, n, i));
    else {
      const s = ee(e.handler) ? e.handler.bind(n) : t[e.handler];
      ee(s) && gt(o, s, e);
    }
  }
  function Hr(e) {
    const t = e.type, { mixins: n, extends: i } = t, { mixins: o, optionsCache: s, config: { optionMergeStrategies: r } } = e.appContext, a = s.get(t);
    let l;
    return a ? l = a : !o.length && !n && !i ? l = t : (l = {}, o.length && o.forEach((f) => Mi(l, f, r, true)), Mi(l, t, r)), he(t) && s.set(t, l), l;
  }
  function Mi(e, t, n, i = false) {
    const { mixins: o, extends: s } = t;
    s && Mi(e, s, n, true), o && o.forEach((r) => Mi(e, r, n, true));
    for (const r in t) if (!(i && r === "expose")) {
      const a = Zl[r] || n && n[r];
      e[r] = a ? a(e[r], t[r]) : t[r];
    }
    return e;
  }
  const Zl = {
    data: cs,
    props: fs,
    emits: fs,
    methods: zn,
    computed: zn,
    beforeCreate: De,
    created: De,
    beforeMount: De,
    mounted: De,
    beforeUpdate: De,
    updated: De,
    beforeDestroy: De,
    beforeUnmount: De,
    destroyed: De,
    unmounted: De,
    activated: De,
    deactivated: De,
    errorCaptured: De,
    serverPrefetch: De,
    components: zn,
    directives: zn,
    watch: Ql,
    provide: cs,
    inject: Jl
  };
  function cs(e, t) {
    return t ? e ? function() {
      return Le(ee(e) ? e.call(this, this) : e, ee(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function Jl(e, t) {
    return zn(yo(e), yo(t));
  }
  function yo(e) {
    if (X(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
      return t;
    }
    return e;
  }
  function De(e, t) {
    return e ? [
      ...new Set([].concat(e, t))
    ] : t;
  }
  function zn(e, t) {
    return e ? Le(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function fs(e, t) {
    return e ? X(e) && X(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : Le(/* @__PURE__ */ Object.create(null), Ti(e), Ti(t ?? {})) : t;
  }
  function Ql(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = Le(/* @__PURE__ */ Object.create(null), e);
    for (const i in t) n[i] = De(e[i], t[i]);
    return n;
  }
  function Wr() {
    return {
      app: null,
      config: {
        isNativeTag: nr,
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
  let eu = 0;
  function tu(e, t) {
    return function(i, o = null) {
      ee(i) || (i = Le({}, i)), o != null && !he(o) && (o = null);
      const s = Wr(), r = /* @__PURE__ */ new WeakSet(), a = [];
      let l = false;
      const f = s.app = {
        _uid: eu++,
        _component: i,
        _props: o,
        _container: null,
        _context: s,
        _instance: null,
        version: Au,
        get config() {
          return s.config;
        },
        set config(u) {
        },
        use(u, ...d) {
          return r.has(u) || (u && ee(u.install) ? (r.add(u), u.install(f, ...d)) : ee(u) && (r.add(u), u(f, ...d))), f;
        },
        mixin(u) {
          return s.mixins.includes(u) || s.mixins.push(u), f;
        },
        component(u, d) {
          return d ? (s.components[u] = d, f) : s.components[u];
        },
        directive(u, d) {
          return d ? (s.directives[u] = d, f) : s.directives[u];
        },
        mount(u, d, v) {
          if (!l) {
            const b = f._ceVNode || Te(i, o);
            return b.appContext = s, v === true ? v = "svg" : v === false && (v = void 0), e(b, u, v), l = true, f._container = u, u.__vue_app__ = f, Wi(b.component);
          }
        },
        onUnmount(u) {
          a.push(u);
        },
        unmount() {
          l && (lt(a, f._instance, 16), e(null, f._container), delete f._container.__vue_app__);
        },
        provide(u, d) {
          return s.provides[u] = d, f;
        },
        runWithContext(u) {
          const d = _n;
          _n = f;
          try {
            return u();
          } finally {
            _n = d;
          }
        }
      };
      return f;
    };
  }
  let _n = null;
  function ot(e, t, n = de) {
    const i = qo(), o = Et(t), s = Vt(t), r = jr(e, o), a = xl((l, f) => {
      let u, d = de, v;
      return Rl(() => {
        const b = e[o];
        qe(u, b) && (u = b, f());
      }), {
        get() {
          return l(), n.get ? n.get(u) : u;
        },
        set(b) {
          const _ = n.set ? n.set(b) : b;
          if (!qe(_, u) && !(d !== de && qe(b, d))) return;
          const x = i.vnode.props;
          x && (t in x || o in x || s in x) && (`onUpdate:${t}` in x || `onUpdate:${o}` in x || `onUpdate:${s}` in x) || (u = b, f()), i.emit(`update:${t}`, _), qe(b, _) && qe(b, d) && !qe(_, v) && f(), d = b, v = _;
        }
      };
    });
    return a[Symbol.iterator] = () => {
      let l = 0;
      return {
        next() {
          return l < 2 ? {
            value: l++ ? r || de : a,
            done: false
          } : {
            done: true
          };
        }
      };
    }, a;
  }
  const jr = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Et(t)}Modifiers`] || e[`${Vt(t)}Modifiers`];
  function nu(e, t, ...n) {
    if (e.isUnmounted) return;
    const i = e.vnode.props || de;
    let o = n;
    const s = t.startsWith("update:"), r = s && jr(i, t.slice(7));
    r && (r.trim && (o = n.map((u) => Ce(u) ? u.trim() : u)), r.number && (o = n.map(Bo)));
    let a, l = i[a = Yi(t)] || i[a = Yi(Et(t))];
    !l && s && (l = i[a = Yi(Vt(t))]), l && lt(l, e, 6, o);
    const f = i[a + "Once"];
    if (f) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[a]) return;
      e.emitted[a] = true, lt(f, e, 6, o);
    }
  }
  const iu = /* @__PURE__ */ new WeakMap();
  function qr(e, t, n = false) {
    const i = n ? iu : t.emitsCache, o = i.get(e);
    if (o !== void 0) return o;
    const s = e.emits;
    let r = {}, a = false;
    if (!ee(e)) {
      const l = (f) => {
        const u = qr(f, t, true);
        u && (a = true, Le(r, u));
      };
      !n && t.mixins.length && t.mixins.forEach(l), e.extends && l(e.extends), e.mixins && e.mixins.forEach(l);
    }
    return !s && !a ? (he(e) && i.set(e, null), null) : (X(s) ? s.forEach((l) => r[l] = null) : Le(r, s), he(e) && i.set(e, r), r);
  }
  function Vi(e, t) {
    return !e || !zi(t) ? false : (t = t.slice(2).replace(/Once$/, ""), pe(e, t[0].toLowerCase() + t.slice(1)) || pe(e, Vt(t)) || pe(e, t));
  }
  function ds(e) {
    const { type: t, vnode: n, proxy: i, withProxy: o, propsOptions: [s], slots: r, attrs: a, emit: l, render: f, renderCache: u, props: d, data: v, setupState: b, ctx: _, inheritAttrs: x } = e, $ = wi(e);
    let V, k;
    try {
      if (n.shapeFlag & 4) {
        const U = o || i, D = U;
        V = dt(f.call(D, U, u, d, b, v, _)), k = a;
      } else {
        const U = t;
        V = dt(U.length > 1 ? U(d, {
          attrs: a,
          slots: r,
          emit: l
        }) : U(d, null)), k = t.props ? a : ou(a);
      }
    } catch (U) {
      Dn.length = 0, Ui(U, e, 1), V = Te(Ve);
    }
    let T = V;
    if (k && x !== false) {
      const U = Object.keys(k), { shapeFlag: D } = T;
      U.length && D & 7 && (s && U.some(Ro) && (k = su(k, s)), T = Gt(T, k, false, true));
    }
    return n.dirs && (T = Gt(T, null, false, true), T.dirs = T.dirs ? T.dirs.concat(n.dirs) : n.dirs), n.transition && Wn(T, n.transition), V = T, wi($), V;
  }
  const ou = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || zi(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, su = (e, t) => {
    const n = {};
    for (const i in e) (!Ro(i) || !(i.slice(9) in t)) && (n[i] = e[i]);
    return n;
  };
  function ru(e, t, n) {
    const { props: i, children: o, component: s } = e, { props: r, children: a, patchFlag: l } = t, f = s.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && l >= 0) {
      if (l & 1024) return true;
      if (l & 16) return i ? ps(i, r, f) : !!r;
      if (l & 8) {
        const u = t.dynamicProps;
        for (let d = 0; d < u.length; d++) {
          const v = u[d];
          if (Yr(r, i, v) && !Vi(f, v)) return true;
        }
      }
    } else return (o || a) && (!a || !a.$stable) ? true : i === r ? false : i ? r ? ps(i, r, f) : true : !!r;
    return false;
  }
  function ps(e, t, n) {
    const i = Object.keys(t);
    if (i.length !== Object.keys(e).length) return true;
    for (let o = 0; o < i.length; o++) {
      const s = i[o];
      if (Yr(t, e, s) && !Vi(n, s)) return true;
    }
    return false;
  }
  function Yr(e, t, n) {
    const i = e[n], o = t[n];
    return n === "style" && he(i) && he(o) ? !Io(i, o) : i !== o;
  }
  function au({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const i = t.subTree;
      if (i.suspense && i.suspense.activeBranch === e && (i.el = e.el), i === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Kr = {}, Xr = () => Object.create(Kr), Zr = (e) => Object.getPrototypeOf(e) === Kr;
  function lu(e, t, n, i = false) {
    const o = {}, s = Xr();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Jr(e, t, o, s);
    for (const r in e.propsOptions[0]) r in o || (o[r] = void 0);
    n ? e.props = i ? o : pl(o) : e.type.props ? e.props = o : e.props = s, e.attrs = s;
  }
  function uu(e, t, n, i) {
    const { props: o, attrs: s, vnode: { patchFlag: r } } = e, a = re(o), [l] = e.propsOptions;
    let f = false;
    if ((i || r > 0) && !(r & 16)) {
      if (r & 8) {
        const u = e.vnode.dynamicProps;
        for (let d = 0; d < u.length; d++) {
          let v = u[d];
          if (Vi(e.emitsOptions, v)) continue;
          const b = t[v];
          if (l) if (pe(s, v)) b !== s[v] && (s[v] = b, f = true);
          else {
            const _ = Et(v);
            o[_] = wo(l, a, _, b, e, false);
          }
          else b !== s[v] && (s[v] = b, f = true);
        }
      }
    } else {
      Jr(e, t, o, s) && (f = true);
      let u;
      for (const d in a) (!t || !pe(t, d) && ((u = Vt(d)) === d || !pe(t, u))) && (l ? n && (n[d] !== void 0 || n[u] !== void 0) && (o[d] = wo(l, a, d, void 0, e, true)) : delete o[d]);
      if (s !== a) for (const d in s) (!t || !pe(t, d)) && (delete s[d], f = true);
    }
    f && Mt(e.attrs, "set", "");
  }
  function Jr(e, t, n, i) {
    const [o, s] = e.propsOptions;
    let r = false, a;
    if (t) for (let l in t) {
      if (Bn(l)) continue;
      const f = t[l];
      let u;
      o && pe(o, u = Et(l)) ? !s || !s.includes(u) ? n[u] = f : (a || (a = {}))[u] = f : Vi(e.emitsOptions, l) || (!(l in i) || f !== i[l]) && (i[l] = f, r = true);
    }
    if (s) {
      const l = re(n), f = a || de;
      for (let u = 0; u < s.length; u++) {
        const d = s[u];
        n[d] = wo(o, l, d, f[d], e, !pe(f, d));
      }
    }
    return r;
  }
  function wo(e, t, n, i, o, s) {
    const r = e[n];
    if (r != null) {
      const a = pe(r, "default");
      if (a && i === void 0) {
        const l = r.default;
        if (r.type !== Function && !r.skipFactory && ee(l)) {
          const { propsDefaults: f } = o;
          if (n in f) i = f[n];
          else {
            const u = ti(o);
            i = f[n] = l.call(null, t), u();
          }
        } else i = l;
        o.ce && o.ce._setProp(n, i);
      }
      r[0] && (s && !a ? i = false : r[1] && (i === "" || i === Vt(n)) && (i = true));
    }
    return i;
  }
  const cu = /* @__PURE__ */ new WeakMap();
  function Qr(e, t, n = false) {
    const i = n ? cu : t.propsCache, o = i.get(e);
    if (o) return o;
    const s = e.props, r = {}, a = [];
    let l = false;
    if (!ee(e)) {
      const u = (d) => {
        l = true;
        const [v, b] = Qr(d, t, true);
        Le(r, v), b && a.push(...b);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!s && !l) return he(e) && i.set(e, hn), hn;
    if (X(s)) for (let u = 0; u < s.length; u++) {
      const d = Et(s[u]);
      hs(d) && (r[d] = de);
    }
    else if (s) for (const u in s) {
      const d = Et(u);
      if (hs(d)) {
        const v = s[u], b = r[d] = X(v) || ee(v) ? {
          type: v
        } : Le({}, v), _ = b.type;
        let x = false, $ = true;
        if (X(_)) for (let V = 0; V < _.length; ++V) {
          const k = _[V], T = ee(k) && k.name;
          if (T === "Boolean") {
            x = true;
            break;
          } else T === "String" && ($ = false);
        }
        else x = ee(_) && _.name === "Boolean";
        b[0] = x, b[1] = $, (x || pe(b, "default")) && a.push(d);
      }
    }
    const f = [
      r,
      a
    ];
    return he(e) && i.set(e, f), f;
  }
  function hs(e) {
    return e[0] !== "$" && !Bn(e);
  }
  const Ho = (e) => e === "_" || e === "_ctx" || e === "$stable", Wo = (e) => X(e) ? e.map(dt) : [
    dt(e)
  ], fu = (e, t, n) => {
    if (t._n) return t;
    const i = Ar((...o) => Wo(t(...o)), n);
    return i._c = false, i;
  }, ea = (e, t, n) => {
    const i = e._ctx;
    for (const o in e) {
      if (Ho(o)) continue;
      const s = e[o];
      if (ee(s)) t[o] = fu(o, s, i);
      else if (s != null) {
        const r = Wo(s);
        t[o] = () => r;
      }
    }
  }, ta = (e, t) => {
    const n = Wo(t);
    e.slots.default = () => n;
  }, na = (e, t, n) => {
    for (const i in t) (n || !Ho(i)) && (e[i] = t[i]);
  }, du = (e, t, n) => {
    const i = e.slots = Xr();
    if (e.vnode.shapeFlag & 32) {
      const o = t._;
      o ? (na(i, t, n), n && lr(i, "_", o, true)) : ea(t, i);
    } else t && ta(e, t);
  }, pu = (e, t, n) => {
    const { vnode: i, slots: o } = e;
    let s = true, r = de;
    if (i.shapeFlag & 32) {
      const a = t._;
      a ? n && a === 1 ? s = false : na(o, t, n) : (s = !t.$stable, ea(t, o)), r = t;
    } else t && (ta(e, t), r = {
      default: 1
    });
    if (s) for (const a in o) !Ho(a) && r[a] == null && delete o[a];
  }, We = bu;
  function hu(e) {
    return gu(e);
  }
  function gu(e, t) {
    const n = Ii();
    n.__VUE__ = true;
    const { insert: i, remove: o, patchProp: s, createElement: r, createText: a, createComment: l, setText: f, setElementText: u, parentNode: d, nextSibling: v, setScopeId: b = ht, insertStaticContent: _ } = e, x = (p, g, y, M = null, w = null, C = null, N = void 0, I = null, z = !!g.dynamicChildren) => {
      if (p === g) return;
      p && !Qt(p, g) && (M = It(p), Ee(p, w, C, true), p = null), g.patchFlag === -2 && (z = false, g.dynamicChildren = null);
      const { type: E, ref: K, shapeFlag: F } = g;
      switch (E) {
        case Hi:
          $(p, g, y, M);
          break;
        case Ve:
          V(p, g, y, M);
          break;
        case gi:
          p == null && k(g, y, M, N);
          break;
        case ze:
          R(p, g, y, M, w, C, N, I, z);
          break;
        default:
          F & 1 ? D(p, g, y, M, w, C, N, I, z) : F & 6 ? B(p, g, y, M, w, C, N, I, z) : (F & 64 || F & 128) && E.process(p, g, y, M, w, C, N, I, z, nt);
      }
      K != null && w ? Nn(K, p && p.ref, C, g || p, !g) : K == null && p && p.ref != null && Nn(p.ref, null, C, p, true);
    }, $ = (p, g, y, M) => {
      if (p == null) i(g.el = a(g.children), y, M);
      else {
        const w = g.el = p.el;
        g.children !== p.children && f(w, g.children);
      }
    }, V = (p, g, y, M) => {
      p == null ? i(g.el = l(g.children || ""), y, M) : g.el = p.el;
    }, k = (p, g, y, M) => {
      [p.el, p.anchor] = _(p.children, g, y, M, p.el, p.anchor);
    }, T = ({ el: p, anchor: g }, y, M) => {
      let w;
      for (; p && p !== g; ) w = v(p), i(p, y, M), p = w;
      i(g, y, M);
    }, U = ({ el: p, anchor: g }) => {
      let y;
      for (; p && p !== g; ) y = v(p), o(p), p = y;
      o(g);
    }, D = (p, g, y, M, w, C, N, I, z) => {
      if (g.type === "svg" ? N = "svg" : g.type === "math" && (N = "mathml"), p == null) q(g, y, M, w, C, N, I, z);
      else {
        const E = p.el && p.el._isVueCE ? p.el : null;
        try {
          E && E._beginPatch(), Y(p, g, w, C, N, I, z);
        } finally {
          E && E._endPatch();
        }
      }
    }, q = (p, g, y, M, w, C, N, I) => {
      let z, E;
      const { props: K, shapeFlag: F, transition: j, dirs: Z } = p;
      if (z = p.el = r(p.type, C, K && K.is, K), F & 8 ? u(z, p.children) : F & 16 && le(p.children, z, null, M, w, to(p, C), N, I), Z && Yt(p, null, M, "created"), oe(z, p, p.scopeId, N, M), K) {
        for (const ge in K) ge !== "value" && !Bn(ge) && s(z, ge, null, K[ge], C, M);
        "value" in K && s(z, "value", null, K.value, C), (E = K.onVnodeBeforeMount) && ut(E, M, p);
      }
      Z && Yt(p, null, M, "beforeMount");
      const se = vu(w, j);
      se && j.beforeEnter(z), i(z, g, y), ((E = K && K.onVnodeMounted) || se || Z) && We(() => {
        E && ut(E, M, p), se && j.enter(z), Z && Yt(p, null, M, "mounted");
      }, w);
    }, oe = (p, g, y, M, w) => {
      if (y && b(p, y), M) for (let C = 0; C < M.length; C++) b(p, M[C]);
      if (w) {
        let C = w.subTree;
        if (g === C || ra(C.type) && (C.ssContent === g || C.ssFallback === g)) {
          const N = w.vnode;
          oe(p, N, N.scopeId, N.slotScopeIds, w.parent);
        }
      }
    }, le = (p, g, y, M, w, C, N, I, z = 0) => {
      for (let E = z; E < p.length; E++) {
        const K = p[E] = I ? Tt(p[E]) : dt(p[E]);
        x(null, K, g, y, M, w, C, N, I);
      }
    }, Y = (p, g, y, M, w, C, N) => {
      const I = g.el = p.el;
      let { patchFlag: z, dynamicChildren: E, dirs: K } = g;
      z |= p.patchFlag & 16;
      const F = p.props || de, j = g.props || de;
      let Z;
      if (y && Kt(y, false), (Z = j.onVnodeBeforeUpdate) && ut(Z, y, g, p), K && Yt(g, p, y, "beforeUpdate"), y && Kt(y, true), (F.innerHTML && j.innerHTML == null || F.textContent && j.textContent == null) && u(I, ""), E ? W(p.dynamicChildren, E, I, y, M, to(g, w), C) : N || H(p, g, I, null, y, M, to(g, w), C, false), z > 0) {
        if (z & 16) ne(I, F, j, y, w);
        else if (z & 2 && F.class !== j.class && s(I, "class", null, j.class, w), z & 4 && s(I, "style", F.style, j.style, w), z & 8) {
          const se = g.dynamicProps;
          for (let ge = 0; ge < se.length; ge++) {
            const fe = se[ge], Be = F[fe], Ie = j[fe];
            (Ie !== Be || fe === "value") && s(I, fe, Be, Ie, w, y);
          }
        }
        z & 1 && p.children !== g.children && u(I, g.children);
      } else !N && E == null && ne(I, F, j, y, w);
      ((Z = j.onVnodeUpdated) || K) && We(() => {
        Z && ut(Z, y, g, p), K && Yt(g, p, y, "updated");
      }, M);
    }, W = (p, g, y, M, w, C, N) => {
      for (let I = 0; I < g.length; I++) {
        const z = p[I], E = g[I], K = z.el && (z.type === ze || !Qt(z, E) || z.shapeFlag & 198) ? d(z.el) : y;
        x(z, E, K, null, M, w, C, N, true);
      }
    }, ne = (p, g, y, M, w) => {
      if (g !== y) {
        if (g !== de) for (const C in g) !Bn(C) && !(C in y) && s(p, C, g[C], null, w, M);
        for (const C in y) {
          if (Bn(C)) continue;
          const N = y[C], I = g[C];
          N !== I && C !== "value" && s(p, C, I, N, w, M);
        }
        "value" in y && s(p, "value", g.value, y.value, w);
      }
    }, R = (p, g, y, M, w, C, N, I, z) => {
      const E = g.el = p ? p.el : a(""), K = g.anchor = p ? p.anchor : a("");
      let { patchFlag: F, dynamicChildren: j, slotScopeIds: Z } = g;
      Z && (I = I ? I.concat(Z) : Z), p == null ? (i(E, y, M), i(K, y, M), le(g.children || [], y, K, w, C, N, I, z)) : F > 0 && F & 64 && j && p.dynamicChildren && p.dynamicChildren.length === j.length ? (W(p.dynamicChildren, j, y, w, C, N, I), (g.key != null || w && g === w.subTree) && ia(p, g, true)) : H(p, g, y, K, w, C, N, I, z);
    }, B = (p, g, y, M, w, C, N, I, z) => {
      g.slotScopeIds = I, p == null ? g.shapeFlag & 512 ? w.ctx.activate(g, y, M, N, z) : L(g, y, M, w, C, N, z) : P(p, g, z);
    }, L = (p, g, y, M, w, C, N) => {
      const I = p.component = Mu(p, M, w);
      if (Di(p) && (I.ctx.renderer = nt), Cu(I, false, N), I.asyncDep) {
        if (w && w.registerDep(I, A, N), !p.el) {
          const z = I.subTree = Te(Ve);
          V(null, z, g, y), p.placeholder = z.el;
        }
      } else A(I, p, g, y, w, C, N);
    }, P = (p, g, y) => {
      const M = g.component = p.component;
      if (ru(p, g, y)) if (M.asyncDep && !M.asyncResolved) {
        O(M, g, y);
        return;
      } else M.next = g, M.update();
      else g.el = p.el, M.vnode = g;
    }, A = (p, g, y, M, w, C, N) => {
      const I = () => {
        if (p.isMounted) {
          let { next: F, bu: j, u: Z, parent: se, vnode: ge } = p;
          {
            const Xe = oa(p);
            if (Xe) {
              F && (F.el = ge.el, O(p, F, N)), Xe.asyncDep.then(() => {
                We(() => {
                  p.isUnmounted || E();
                }, w);
              });
              return;
            }
          }
          let fe = F, Be;
          Kt(p, false), F ? (F.el = ge.el, O(p, F, N)) : F = ge, j && pi(j), (Be = F.props && F.props.onVnodeBeforeUpdate) && ut(Be, se, F, ge), Kt(p, true);
          const Ie = ds(p), Ke = p.subTree;
          p.subTree = Ie, x(Ke, Ie, d(Ke.el), It(Ke), p, w, C), F.el = Ie.el, fe === null && au(p, Ie.el), Z && We(Z, w), (Be = F.props && F.props.onVnodeUpdated) && We(() => ut(Be, se, F, ge), w);
        } else {
          let F;
          const { el: j, props: Z } = g, { bm: se, m: ge, parent: fe, root: Be, type: Ie } = p, Ke = Un(g);
          Kt(p, false), se && pi(se), !Ke && (F = Z && Z.onVnodeBeforeMount) && ut(F, fe, g), Kt(p, true);
          {
            Be.ce && Be.ce._hasShadowRoot() && Be.ce._injectChildStyle(Ie);
            const Xe = p.subTree = ds(p);
            x(null, Xe, y, M, p, w, C), g.el = Xe.el;
          }
          if (ge && We(ge, w), !Ke && (F = Z && Z.onVnodeMounted)) {
            const Xe = g;
            We(() => ut(F, fe, Xe), w);
          }
          (g.shapeFlag & 256 || fe && Un(fe.vnode) && fe.vnode.shapeFlag & 256) && p.a && We(p.a, w), p.isMounted = true, g = y = M = null;
        }
      };
      p.scope.on();
      const z = p.effect = new dr(I);
      p.scope.off();
      const E = p.update = z.run.bind(z), K = p.job = z.runIfDirty.bind(z);
      K.i = p, K.id = p.uid, z.scheduler = () => Go(K), Kt(p, true), E();
    }, O = (p, g, y) => {
      g.component = p;
      const M = p.vnode.props;
      p.vnode = g, p.next = null, uu(p, g.props, M, y), pu(p, g.children, y), Pt(), ss(p), Lt();
    }, H = (p, g, y, M, w, C, N, I, z = false) => {
      const E = p && p.children, K = p ? p.shapeFlag : 0, F = g.children, { patchFlag: j, shapeFlag: Z } = g;
      if (j > 0) {
        if (j & 128) {
          Me(E, F, y, M, w, C, N, I, z);
          return;
        } else if (j & 256) {
          be(E, F, y, M, w, C, N, I, z);
          return;
        }
      }
      Z & 8 ? (K & 16 && xt(E, w, C), F !== E && u(y, F)) : K & 16 ? Z & 16 ? Me(E, F, y, M, w, C, N, I, z) : xt(E, w, C, true) : (K & 8 && u(y, ""), Z & 16 && le(F, y, M, w, C, N, I, z));
    }, be = (p, g, y, M, w, C, N, I, z) => {
      p = p || hn, g = g || hn;
      const E = p.length, K = g.length, F = Math.min(E, K);
      let j;
      for (j = 0; j < F; j++) {
        const Z = g[j] = z ? Tt(g[j]) : dt(g[j]);
        x(p[j], Z, y, null, w, C, N, I, z);
      }
      E > K ? xt(p, w, C, true, false, F) : le(g, y, M, w, C, N, I, z, F);
    }, Me = (p, g, y, M, w, C, N, I, z) => {
      let E = 0;
      const K = g.length;
      let F = p.length - 1, j = K - 1;
      for (; E <= F && E <= j; ) {
        const Z = p[E], se = g[E] = z ? Tt(g[E]) : dt(g[E]);
        if (Qt(Z, se)) x(Z, se, y, null, w, C, N, I, z);
        else break;
        E++;
      }
      for (; E <= F && E <= j; ) {
        const Z = p[F], se = g[j] = z ? Tt(g[j]) : dt(g[j]);
        if (Qt(Z, se)) x(Z, se, y, null, w, C, N, I, z);
        else break;
        F--, j--;
      }
      if (E > F) {
        if (E <= j) {
          const Z = j + 1, se = Z < K ? g[Z].el : M;
          for (; E <= j; ) x(null, g[E] = z ? Tt(g[E]) : dt(g[E]), y, se, w, C, N, I, z), E++;
        }
      } else if (E > j) for (; E <= F; ) Ee(p[E], w, C, true), E++;
      else {
        const Z = E, se = E, ge = /* @__PURE__ */ new Map();
        for (E = se; E <= j; E++) {
          const h = g[E] = z ? Tt(g[E]) : dt(g[E]);
          h.key != null && ge.set(h.key, E);
        }
        let fe, Be = 0;
        const Ie = j - se + 1;
        let Ke = false, Xe = 0;
        const jt = new Array(Ie);
        for (E = 0; E < Ie; E++) jt[E] = 0;
        for (E = Z; E <= F; E++) {
          const h = p[E];
          if (Be >= Ie) {
            Ee(h, w, C, true);
            continue;
          }
          let m;
          if (h.key != null) m = ge.get(h.key);
          else for (fe = se; fe <= j; fe++) if (jt[fe - se] === 0 && Qt(h, g[fe])) {
            m = fe;
            break;
          }
          m === void 0 ? Ee(h, w, C, true) : (jt[m - se] = E + 1, m >= Xe ? Xe = m : Ke = true, x(h, g[m], y, null, w, C, N, I, z), Be++);
        }
        const S = Ke ? mu(jt) : hn;
        for (fe = S.length - 1, E = Ie - 1; E >= 0; E--) {
          const h = se + E, m = g[h], G = g[h + 1], ye = h + 1 < K ? G.el || sa(G) : M;
          jt[E] === 0 ? x(null, m, y, ye, w, C, N, I, z) : Ke && (fe < 0 || E !== S[fe] ? Re(m, y, ye, 2) : fe--);
        }
      }
    }, Re = (p, g, y, M, w = null) => {
      const { el: C, type: N, transition: I, children: z, shapeFlag: E } = p;
      if (E & 6) {
        Re(p.component.subTree, g, y, M);
        return;
      }
      if (E & 128) {
        p.suspense.move(g, y, M);
        return;
      }
      if (E & 64) {
        N.move(p, g, y, nt);
        return;
      }
      if (N === ze) {
        i(C, g, y);
        for (let F = 0; F < z.length; F++) Re(z[F], g, y, M);
        i(p.anchor, g, y);
        return;
      }
      if (N === gi) {
        T(p, g, y);
        return;
      }
      if (M !== 2 && E & 1 && I) if (M === 0) I.beforeEnter(C), i(C, g, y), We(() => I.enter(C), w);
      else {
        const { leave: F, delayLeave: j, afterLeave: Z } = I, se = () => {
          p.ctx.isUnmounted ? o(C) : i(C, g, y);
        }, ge = () => {
          C._isLeaving && C[ft](true), F(C, () => {
            se(), Z && Z();
          });
        };
        j ? j(C, se, ge) : ge();
      }
      else i(C, g, y);
    }, Ee = (p, g, y, M = false, w = false) => {
      const { type: C, props: N, ref: I, children: z, dynamicChildren: E, shapeFlag: K, patchFlag: F, dirs: j, cacheIndex: Z } = p;
      if (F === -2 && (w = false), I != null && (Pt(), Nn(I, null, y, p, true), Lt()), Z != null && (g.renderCache[Z] = void 0), K & 256) {
        g.ctx.deactivate(p);
        return;
      }
      const se = K & 1 && j, ge = !Un(p);
      let fe;
      if (ge && (fe = N && N.onVnodeBeforeUnmount) && ut(fe, g, p), K & 6) Bt(p.component, y, M);
      else {
        if (K & 128) {
          p.suspense.unmount(y, M);
          return;
        }
        se && Yt(p, null, g, "beforeUnmount"), K & 64 ? p.type.remove(p, g, y, nt, M) : E && !E.hasOnce && (C !== ze || F > 0 && F & 64) ? xt(E, g, y, false, true) : (C === ze && F & 384 || !w && K & 16) && xt(z, g, y), M && _t(p);
      }
      (ge && (fe = N && N.onVnodeUnmounted) || se) && We(() => {
        fe && ut(fe, g, p), se && Yt(p, null, g, "unmounted");
      }, y);
    }, _t = (p) => {
      const { type: g, el: y, anchor: M, transition: w } = p;
      if (g === ze) {
        Wt(y, M);
        return;
      }
      if (g === gi) {
        U(p);
        return;
      }
      const C = () => {
        o(y), w && !w.persisted && w.afterLeave && w.afterLeave();
      };
      if (p.shapeFlag & 1 && w && !w.persisted) {
        const { leave: N, delayLeave: I } = w, z = () => N(y, C);
        I ? I(p.el, C, z) : z();
      } else C();
    }, Wt = (p, g) => {
      let y;
      for (; p !== g; ) y = v(p), o(p), p = y;
      o(g);
    }, Bt = (p, g, y) => {
      const { bum: M, scope: w, job: C, subTree: N, um: I, m: z, a: E } = p;
      gs(z), gs(E), M && pi(M), w.stop(), C && (C.flags |= 8, Ee(N, p, g, y)), I && We(I, g), We(() => {
        p.isUnmounted = true;
      }, g);
    }, xt = (p, g, y, M = false, w = false, C = 0) => {
      for (let N = C; N < p.length; N++) Ee(p[N], g, y, M, w);
    }, It = (p) => {
      if (p.shapeFlag & 6) return It(p.component.subTree);
      if (p.shapeFlag & 128) return p.suspense.next();
      const g = v(p.anchor || p.el), y = g && g[zl];
      return y ? v(y) : g;
    };
    let tt = false;
    const Ot = (p, g, y) => {
      let M;
      p == null ? g._vnode && (Ee(g._vnode, null, null, true), M = g._vnode.component) : x(g._vnode || null, p, g, null, null, null, y), g._vnode = p, tt || (tt = true, ss(M), Lr(), tt = false);
    }, nt = {
      p: x,
      um: Ee,
      m: Re,
      r: _t,
      mt: L,
      mc: le,
      pc: H,
      pbc: W,
      n: It,
      o: e
    };
    return {
      render: Ot,
      hydrate: void 0,
      createApp: tu(Ot)
    };
  }
  function to({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function Kt({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function vu(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function ia(e, t, n = false) {
    const i = e.children, o = t.children;
    if (X(i) && X(o)) for (let s = 0; s < i.length; s++) {
      const r = i[s];
      let a = o[s];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = o[s] = Tt(o[s]), a.el = r.el), !n && a.patchFlag !== -2 && ia(r, a)), a.type === Hi && (a.patchFlag === -1 && (a = o[s] = Tt(a)), a.el = r.el), a.type === Ve && !a.el && (a.el = r.el);
    }
  }
  function mu(e) {
    const t = e.slice(), n = [
      0
    ];
    let i, o, s, r, a;
    const l = e.length;
    for (i = 0; i < l; i++) {
      const f = e[i];
      if (f !== 0) {
        if (o = n[n.length - 1], e[o] < f) {
          t[i] = o, n.push(i);
          continue;
        }
        for (s = 0, r = n.length - 1; s < r; ) a = s + r >> 1, e[n[a]] < f ? s = a + 1 : r = a;
        f < e[n[s]] && (s > 0 && (t[i] = n[s - 1]), n[s] = i);
      }
    }
    for (s = n.length, r = n[s - 1]; s-- > 0; ) n[s] = r, r = t[r];
    return n;
  }
  function oa(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : oa(t);
  }
  function gs(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  function sa(e) {
    if (e.placeholder) return e.placeholder;
    const t = e.component;
    return t ? sa(t.subTree) : null;
  }
  const ra = (e) => e.__isSuspense;
  function bu(e, t) {
    t && t.pendingBranch ? X(e) ? t.effects.push(...e) : t.effects.push(e) : El(e);
  }
  const ze = /* @__PURE__ */ Symbol.for("v-fgt"), Hi = /* @__PURE__ */ Symbol.for("v-txt"), Ve = /* @__PURE__ */ Symbol.for("v-cmt"), gi = /* @__PURE__ */ Symbol.for("v-stc"), Dn = [];
  let Ye = null;
  function ae(e = false) {
    Dn.push(Ye = e ? null : []);
  }
  function _u() {
    Dn.pop(), Ye = Dn[Dn.length - 1] || null;
  }
  let jn = 1;
  function Ci(e, t = false) {
    jn += e, e < 0 && Ye && t && (Ye.hasOnce = true);
  }
  function aa(e) {
    return e.dynamicChildren = jn > 0 ? Ye || hn : null, _u(), jn > 0 && Ye && Ye.push(e), e;
  }
  function ue(e, t, n, i, o, s) {
    return aa(c(e, t, n, i, o, s, true));
  }
  function la(e, t, n, i, o) {
    return aa(Te(e, t, n, i, o, true));
  }
  function Ei(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function Qt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const ua = ({ key: e }) => e ?? null, vi = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? Ce(e) || Fe(e) || ee(e) ? {
    i: Qe,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function c(e, t = null, n = null, i = 0, o = null, s = e === ze ? 0 : 1, r = false, a = false) {
    const l = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && ua(t),
      ref: t && vi(t),
      scopeId: Rr,
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
      patchFlag: i,
      dynamicProps: o,
      dynamicChildren: null,
      appContext: null,
      ctx: Qe
    };
    return a ? (jo(l, n), s & 128 && e.normalize(l)) : n && (l.shapeFlag |= Ce(n) ? 8 : 16), jn > 0 && !r && Ye && (l.patchFlag > 0 || s & 6) && l.patchFlag !== 32 && Ye.push(l), l;
  }
  const Te = xu;
  function xu(e, t = null, n = null, i = 0, o = null, s = false) {
    if ((!e || e === ql) && (e = Ve), Ei(e)) {
      const a = Gt(e, t, true);
      return n && jo(a, n), jn > 0 && !s && Ye && (a.shapeFlag & 6 ? Ye[Ye.indexOf(e)] = a : Ye.push(a)), a.patchFlag = -2, a;
    }
    if (ku(e) && (e = e.__vccOpts), t) {
      t = yu(t);
      let { class: a, style: l } = t;
      a && !Ce(a) && (t.class = ce(a)), he(l) && ($o(l) && !X(l) && (l = Le({}, l)), t.style = Qn(l));
    }
    const r = Ce(e) ? 1 : ra(e) ? 128 : Br(e) ? 64 : he(e) ? 4 : ee(e) ? 2 : 0;
    return c(e, t, n, i, o, r, s, true);
  }
  function yu(e) {
    return e ? $o(e) || Zr(e) ? Le({}, e) : e : null;
  }
  function Gt(e, t, n = false, i = false) {
    const { props: o, ref: s, patchFlag: r, children: a, transition: l } = e, f = t ? wu(o || {}, t) : o, u = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: f,
      key: f && ua(f),
      ref: t && t.ref ? n && s ? X(s) ? s.concat(vi(t)) : [
        s,
        vi(t)
      ] : vi(t) : s,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: a,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== ze ? r === -1 ? 16 : r | 16 : r,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: l,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && Gt(e.ssContent),
      ssFallback: e.ssFallback && Gt(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return l && i && Wn(u, l.clone(u)), u;
  }
  function we(e = " ", t = 0) {
    return Te(Hi, null, e, t);
  }
  function ca(e, t) {
    const n = Te(gi, null, e);
    return n.staticCount = t, n;
  }
  function $t(e = "", t = false) {
    return t ? (ae(), la(Ve, null, e)) : Te(Ve, null, e);
  }
  function dt(e) {
    return e == null || typeof e == "boolean" ? Te(Ve) : X(e) ? Te(ze, null, e.slice()) : Ei(e) ? Tt(e) : Te(Hi, null, String(e));
  }
  function Tt(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : Gt(e);
  }
  function jo(e, t) {
    let n = 0;
    const { shapeFlag: i } = e;
    if (t == null) t = null;
    else if (X(t)) n = 16;
    else if (typeof t == "object") if (i & 65) {
      const o = t.default;
      o && (o._c && (o._d = false), jo(e, o()), o._c && (o._d = true));
      return;
    } else {
      n = 32;
      const o = t._;
      !o && !Zr(t) ? t._ctx = Qe : o === 3 && Qe && (Qe.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else ee(t) ? (t = {
      default: t,
      _ctx: Qe
    }, n = 32) : (t = String(t), i & 64 ? (n = 16, t = [
      we(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function wu(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const i = e[n];
      for (const o in i) if (o === "class") t.class !== i.class && (t.class = ce([
        t.class,
        i.class
      ]));
      else if (o === "style") t.style = Qn([
        t.style,
        i.style
      ]);
      else if (zi(o)) {
        const s = t[o], r = i[o];
        r && s !== r && !(X(s) && s.includes(r)) && (t[o] = s ? [].concat(s, r) : r);
      } else o !== "" && (t[o] = i[o]);
    }
    return t;
  }
  function ut(e, t, n, i = null) {
    lt(e, t, 7, [
      n,
      i
    ]);
  }
  const Su = Wr();
  let Tu = 0;
  function Mu(e, t, n) {
    const i = e.type, o = (t ? t.appContext : e.appContext) || Su, s = {
      uid: Tu++,
      vnode: e,
      type: i,
      parent: t,
      appContext: o,
      root: null,
      next: null,
      subTree: null,
      effect: null,
      update: null,
      job: null,
      scope: new qa(true),
      render: null,
      proxy: null,
      exposed: null,
      exposeProxy: null,
      withProxy: null,
      provides: t ? t.provides : Object.create(o.provides),
      ids: t ? t.ids : [
        "",
        0,
        0
      ],
      accessCache: null,
      renderCache: [],
      components: null,
      directives: null,
      propsOptions: Qr(i, o),
      emitsOptions: qr(i, o),
      emit: null,
      emitted: null,
      propsDefaults: de,
      inheritAttrs: i.inheritAttrs,
      ctx: de,
      data: de,
      props: de,
      attrs: de,
      slots: de,
      refs: de,
      setupState: de,
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
    }, s.root = t ? t.root : s, s.emit = nu.bind(null, s), e.ce && e.ce(s), s;
  }
  let He = null;
  const qo = () => He || Qe;
  let Pi, So;
  {
    const e = Ii(), t = (n, i) => {
      let o;
      return (o = e[n]) || (o = e[n] = []), o.push(i), (s) => {
        o.length > 1 ? o.forEach((r) => r(s)) : o[0](s);
      };
    };
    Pi = t("__VUE_INSTANCE_SETTERS__", (n) => He = n), So = t("__VUE_SSR_SETTERS__", (n) => qn = n);
  }
  const ti = (e) => {
    const t = He;
    return Pi(e), e.scope.on(), () => {
      e.scope.off(), Pi(t);
    };
  }, vs = () => {
    He && He.scope.off(), Pi(null);
  };
  function fa(e) {
    return e.vnode.shapeFlag & 4;
  }
  let qn = false;
  function Cu(e, t = false, n = false) {
    t && So(t);
    const { props: i, children: o } = e.vnode, s = fa(e);
    lu(e, i, s, t), du(e, o, n || t);
    const r = s ? Eu(e, t) : void 0;
    return t && So(false), r;
  }
  function Eu(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Yl);
    const { setup: i } = n;
    if (i) {
      Pt();
      const o = e.setupContext = i.length > 1 ? Lu(e) : null, s = ti(e), r = ei(i, e, 0, [
        e.props,
        o
      ]), a = or(r);
      if (Lt(), s(), (a || e.sp) && !Un(e) && Dr(e), a) {
        if (r.then(vs, vs), t) return r.then((l) => {
          ms(e, l);
        }).catch((l) => {
          Ui(l, e, 0);
        });
        e.asyncDep = r;
      } else ms(e, r);
    } else da(e);
  }
  function ms(e, t, n) {
    ee(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : he(t) && (e.setupState = Cr(t)), da(e);
  }
  function da(e, t, n) {
    const i = e.type;
    e.render || (e.render = i.render || ht);
    {
      const o = ti(e);
      Pt();
      try {
        Kl(e);
      } finally {
        Lt(), o();
      }
    }
  }
  const Pu = {
    get(e, t) {
      return Ne(e, "get", ""), e[t];
    }
  };
  function Lu(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, Pu),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function Wi(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Cr(hl(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in Fn) return Fn[n](e);
      },
      has(t, n) {
        return n in t || n in Fn;
      }
    })) : e.proxy;
  }
  function ku(e) {
    return ee(e) && "__vccOpts" in e;
  }
  const Ae = (e, t) => wl(e, t, qn);
  function Ru(e, t, n) {
    try {
      Ci(-1);
      const i = arguments.length;
      return i === 2 ? he(t) && !X(t) ? Ei(t) ? Te(e, null, [
        t
      ]) : Te(e, t) : Te(e, null, t) : (i > 3 ? n = Array.prototype.slice.call(arguments, 2) : i === 3 && Ei(n) && (n = [
        n
      ]), Te(e, t, n));
    } finally {
      Ci(1);
    }
  }
  const Au = "3.5.28";
  let To;
  const bs = typeof window < "u" && window.trustedTypes;
  if (bs) try {
    To = bs.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const pa = To ? (e) => To.createHTML(e) : (e) => e, zu = "http://www.w3.org/2000/svg", Bu = "http://www.w3.org/1998/Math/MathML", St = typeof document < "u" ? document : null, _s = St && St.createElement("template"), Iu = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, i) => {
      const o = t === "svg" ? St.createElementNS(zu, e) : t === "mathml" ? St.createElementNS(Bu, e) : n ? St.createElement(e, {
        is: n
      }) : St.createElement(e);
      return e === "select" && i && i.multiple != null && o.setAttribute("multiple", i.multiple), o;
    },
    createText: (e) => St.createTextNode(e),
    createComment: (e) => St.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => St.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, i, o, s) {
      const r = n ? n.previousSibling : t.lastChild;
      if (o && (o === s || o.nextSibling)) for (; t.insertBefore(o.cloneNode(true), n), !(o === s || !(o = o.nextSibling)); ) ;
      else {
        _s.innerHTML = pa(i === "svg" ? `<svg>${e}</svg>` : i === "mathml" ? `<math>${e}</math>` : e);
        const a = _s.content;
        if (i === "svg" || i === "mathml") {
          const l = a.firstChild;
          for (; l.firstChild; ) a.appendChild(l.firstChild);
          a.removeChild(l);
        }
        t.insertBefore(a, n);
      }
      return [
        r ? r.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild
      ];
    }
  }, Nt = "transition", Rn = "animation", Yn = /* @__PURE__ */ Symbol("_vtc"), ha = {
    name: String,
    type: String,
    css: {
      type: Boolean,
      default: true
    },
    duration: [
      String,
      Number,
      Object
    ],
    enterFromClass: String,
    enterActiveClass: String,
    enterToClass: String,
    appearFromClass: String,
    appearActiveClass: String,
    appearToClass: String,
    leaveFromClass: String,
    leaveActiveClass: String,
    leaveToClass: String
  }, Ou = Le({}, Ir, ha), Nu = (e) => (e.displayName = "Transition", e.props = Ou, e), Uu = Nu((e, { slots: t }) => Ru(Ol, Fu(e), t)), Xt = (e, t = []) => {
    X(e) ? e.forEach((n) => n(...t)) : e && e(...t);
  }, xs = (e) => e ? X(e) ? e.some((t) => t.length > 1) : e.length > 1 : false;
  function Fu(e) {
    const t = {};
    for (const R in e) R in ha || (t[R] = e[R]);
    if (e.css === false) return t;
    const { name: n = "v", type: i, duration: o, enterFromClass: s = `${n}-enter-from`, enterActiveClass: r = `${n}-enter-active`, enterToClass: a = `${n}-enter-to`, appearFromClass: l = s, appearActiveClass: f = r, appearToClass: u = a, leaveFromClass: d = `${n}-leave-from`, leaveActiveClass: v = `${n}-leave-active`, leaveToClass: b = `${n}-leave-to` } = e, _ = Du(o), x = _ && _[0], $ = _ && _[1], { onBeforeEnter: V, onEnter: k, onEnterCancelled: T, onLeave: U, onLeaveCancelled: D, onBeforeAppear: q = V, onAppear: oe = k, onAppearCancelled: le = T } = t, Y = (R, B, L, P) => {
      R._enterCancelled = P, Zt(R, B ? u : a), Zt(R, B ? f : r), L && L();
    }, W = (R, B) => {
      R._isLeaving = false, Zt(R, d), Zt(R, b), Zt(R, v), B && B();
    }, ne = (R) => (B, L) => {
      const P = R ? oe : k, A = () => Y(B, R, L);
      Xt(P, [
        B,
        A
      ]), ys(() => {
        Zt(B, R ? l : s), wt(B, R ? u : a), xs(P) || ws(B, i, x, A);
      });
    };
    return Le(t, {
      onBeforeEnter(R) {
        Xt(V, [
          R
        ]), wt(R, s), wt(R, r);
      },
      onBeforeAppear(R) {
        Xt(q, [
          R
        ]), wt(R, l), wt(R, f);
      },
      onEnter: ne(false),
      onAppear: ne(true),
      onLeave(R, B) {
        R._isLeaving = true;
        const L = () => W(R, B);
        wt(R, d), R._enterCancelled ? (wt(R, v), Ms(R)) : (Ms(R), wt(R, v)), ys(() => {
          R._isLeaving && (Zt(R, d), wt(R, b), xs(U) || ws(R, i, $, L));
        }), Xt(U, [
          R,
          L
        ]);
      },
      onEnterCancelled(R) {
        Y(R, false, void 0, true), Xt(T, [
          R
        ]);
      },
      onAppearCancelled(R) {
        Y(R, true, void 0, true), Xt(le, [
          R
        ]);
      },
      onLeaveCancelled(R) {
        W(R), Xt(D, [
          R
        ]);
      }
    });
  }
  function Du(e) {
    if (e == null) return null;
    if (he(e)) return [
      no(e.enter),
      no(e.leave)
    ];
    {
      const t = no(e);
      return [
        t,
        t
      ];
    }
  }
  function no(e) {
    return Fa(e);
  }
  function wt(e, t) {
    t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Yn] || (e[Yn] = /* @__PURE__ */ new Set())).add(t);
  }
  function Zt(e, t) {
    t.split(/\s+/).forEach((i) => i && e.classList.remove(i));
    const n = e[Yn];
    n && (n.delete(t), n.size || (e[Yn] = void 0));
  }
  function ys(e) {
    requestAnimationFrame(() => {
      requestAnimationFrame(e);
    });
  }
  let $u = 0;
  function ws(e, t, n, i) {
    const o = e._endId = ++$u, s = () => {
      o === e._endId && i();
    };
    if (n != null) return setTimeout(s, n);
    const { type: r, timeout: a, propCount: l } = Gu(e, t);
    if (!r) return i();
    const f = r + "end";
    let u = 0;
    const d = () => {
      e.removeEventListener(f, v), s();
    }, v = (b) => {
      b.target === e && ++u >= l && d();
    };
    setTimeout(() => {
      u < l && d();
    }, a + 1), e.addEventListener(f, v);
  }
  function Gu(e, t) {
    const n = window.getComputedStyle(e), i = (_) => (n[_] || "").split(", "), o = i(`${Nt}Delay`), s = i(`${Nt}Duration`), r = Ss(o, s), a = i(`${Rn}Delay`), l = i(`${Rn}Duration`), f = Ss(a, l);
    let u = null, d = 0, v = 0;
    t === Nt ? r > 0 && (u = Nt, d = r, v = s.length) : t === Rn ? f > 0 && (u = Rn, d = f, v = l.length) : (d = Math.max(r, f), u = d > 0 ? r > f ? Nt : Rn : null, v = u ? u === Nt ? s.length : l.length : 0);
    const b = u === Nt && /\b(?:transform|all)(?:,|$)/.test(i(`${Nt}Property`).toString());
    return {
      type: u,
      timeout: d,
      propCount: v,
      hasTransform: b
    };
  }
  function Ss(e, t) {
    for (; e.length < t.length; ) e = e.concat(e);
    return Math.max(...t.map((n, i) => Ts(n) + Ts(e[i])));
  }
  function Ts(e) {
    return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
  }
  function Ms(e) {
    return (e ? e.ownerDocument : document).body.offsetHeight;
  }
  function Vu(e, t, n) {
    const i = e[Yn];
    i && (t = (t ? [
      t,
      ...i
    ] : [
      ...i
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const Li = /* @__PURE__ */ Symbol("_vod"), ga = /* @__PURE__ */ Symbol("_vsh"), ri = {
    name: "show",
    beforeMount(e, { value: t }, { transition: n }) {
      e[Li] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : An(e, t);
    },
    mounted(e, { value: t }, { transition: n }) {
      n && t && n.enter(e);
    },
    updated(e, { value: t, oldValue: n }, { transition: i }) {
      !t != !n && (i ? t ? (i.beforeEnter(e), An(e, true), i.enter(e)) : i.leave(e, () => {
        An(e, false);
      }) : An(e, t));
    },
    beforeUnmount(e, { value: t }) {
      An(e, t);
    }
  };
  function An(e, t) {
    e.style.display = t ? e[Li] : "none", e[ga] = !t;
  }
  const Hu = /* @__PURE__ */ Symbol(""), Wu = /(?:^|;)\s*display\s*:/;
  function ju(e, t, n) {
    const i = e.style, o = Ce(n);
    let s = false;
    if (n && !o) {
      if (t) if (Ce(t)) for (const r of t.split(";")) {
        const a = r.slice(0, r.indexOf(":")).trim();
        n[a] == null && mi(i, a, "");
      }
      else for (const r in t) n[r] == null && mi(i, r, "");
      for (const r in n) r === "display" && (s = true), mi(i, r, n[r]);
    } else if (o) {
      if (t !== n) {
        const r = i[Hu];
        r && (n += ";" + r), i.cssText = n, s = Wu.test(n);
      }
    } else t && e.removeAttribute("style");
    Li in e && (e[Li] = s ? i.display : "", e[ga] && (i.display = "none"));
  }
  const Cs = /\s*!important$/;
  function mi(e, t, n) {
    if (X(n)) n.forEach((i) => mi(e, t, i));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const i = qu(e, t);
      Cs.test(n) ? e.setProperty(Vt(i), n.replace(Cs, ""), "important") : e[i] = n;
    }
  }
  const Es = [
    "Webkit",
    "Moz",
    "ms"
  ], io = {};
  function qu(e, t) {
    const n = io[t];
    if (n) return n;
    let i = Et(t);
    if (i !== "filter" && i in e) return io[t] = i;
    i = ar(i);
    for (let o = 0; o < Es.length; o++) {
      const s = Es[o] + i;
      if (s in e) return io[t] = s;
    }
    return t;
  }
  const Ps = "http://www.w3.org/1999/xlink";
  function Ls(e, t, n, i, o, s = Wa(t)) {
    i && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Ps, t.slice(6, t.length)) : e.setAttributeNS(Ps, t, n) : n == null || s && !ur(n) ? e.removeAttribute(t) : e.setAttribute(t, s ? "" : bt(n) ? String(n) : n);
  }
  function ks(e, t, n, i, o) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? pa(n) : n);
      return;
    }
    const s = e.tagName;
    if (t === "value" && s !== "PROGRESS" && !s.includes("-")) {
      const a = s === "OPTION" ? e.getAttribute("value") || "" : e.value, l = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
      (a !== l || !("_value" in e)) && (e.value = l), n == null && e.removeAttribute(t), e._value = n;
      return;
    }
    let r = false;
    if (n === "" || n == null) {
      const a = typeof e[t];
      a === "boolean" ? n = ur(n) : n == null && a === "string" ? (n = "", r = true) : a === "number" && (n = 0, r = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    r && e.removeAttribute(o || t);
  }
  function pn(e, t, n, i) {
    e.addEventListener(t, n, i);
  }
  function Yu(e, t, n, i) {
    e.removeEventListener(t, n, i);
  }
  const Rs = /* @__PURE__ */ Symbol("_vei");
  function Ku(e, t, n, i, o = null) {
    const s = e[Rs] || (e[Rs] = {}), r = s[t];
    if (i && r) r.value = i;
    else {
      const [a, l] = Xu(t);
      if (i) {
        const f = s[t] = Qu(i, o);
        pn(e, a, f, l);
      } else r && (Yu(e, a, r, l), s[t] = void 0);
    }
  }
  const As = /(?:Once|Passive|Capture)$/;
  function Xu(e) {
    let t;
    if (As.test(e)) {
      t = {};
      let i;
      for (; i = e.match(As); ) e = e.slice(0, e.length - i[0].length), t[i[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : Vt(e.slice(2)),
      t
    ];
  }
  let oo = 0;
  const Zu = Promise.resolve(), Ju = () => oo || (Zu.then(() => oo = 0), oo = Date.now());
  function Qu(e, t) {
    const n = (i) => {
      if (!i._vts) i._vts = Date.now();
      else if (i._vts <= n.attached) return;
      lt(ec(i, n.value), t, 5, [
        i
      ]);
    };
    return n.value = e, n.attached = Ju(), n;
  }
  function ec(e, t) {
    if (X(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((i) => (o) => !o._stopped && i && i(o));
    } else return t;
  }
  const zs = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, tc = (e, t, n, i, o, s) => {
    const r = o === "svg";
    t === "class" ? Vu(e, i, r) : t === "style" ? ju(e, n, i) : zi(t) ? Ro(t) || Ku(e, t, n, i, s) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : nc(e, t, i, r)) ? (ks(e, t, i), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Ls(e, t, i, r, s, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !Ce(i)) ? ks(e, Et(t), i, s, t) : (t === "true-value" ? e._trueValue = i : t === "false-value" && (e._falseValue = i), Ls(e, t, i, r));
  };
  function nc(e, t, n, i) {
    if (i) return !!(t === "innerHTML" || t === "textContent" || t in e && zs(t) && ee(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const o = e.tagName;
      if (o === "IMG" || o === "VIDEO" || o === "CANVAS" || o === "SOURCE") return false;
    }
    return zs(t) && Ce(n) ? false : t in e;
  }
  const Bs = (e) => {
    const t = e.props["onUpdate:modelValue"] || false;
    return X(t) ? (n) => pi(t, n) : t;
  };
  function ic(e) {
    e.target.composing = true;
  }
  function Is(e) {
    const t = e.target;
    t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
  }
  const so = /* @__PURE__ */ Symbol("_assign");
  function Os(e, t, n) {
    return t && (e = e.trim()), n && (e = Bo(e)), e;
  }
  const it = {
    created(e, { modifiers: { lazy: t, trim: n, number: i } }, o) {
      e[so] = Bs(o);
      const s = i || o.props && o.props.type === "number";
      pn(e, t ? "change" : "input", (r) => {
        r.target.composing || e[so](Os(e.value, n, s));
      }), (n || s) && pn(e, "change", () => {
        e.value = Os(e.value, n, s);
      }), t || (pn(e, "compositionstart", ic), pn(e, "compositionend", Is), pn(e, "change", Is));
    },
    mounted(e, { value: t }) {
      e.value = t ?? "";
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: i, trim: o, number: s } }, r) {
      if (e[so] = Bs(r), e.composing) return;
      const a = (s || e.type === "number") && !/^0\d/.test(e.value) ? Bo(e.value) : e.value, l = t ?? "";
      a !== l && (document.activeElement === e && e.type !== "range" && (i && t === n || o && e.value.trim() === l) || (e.value = l));
    }
  }, oc = [
    "ctrl",
    "shift",
    "alt",
    "meta"
  ], sc = {
    stop: (e) => e.stopPropagation(),
    prevent: (e) => e.preventDefault(),
    self: (e) => e.target !== e.currentTarget,
    ctrl: (e) => !e.ctrlKey,
    shift: (e) => !e.shiftKey,
    alt: (e) => !e.altKey,
    meta: (e) => !e.metaKey,
    left: (e) => "button" in e && e.button !== 0,
    middle: (e) => "button" in e && e.button !== 1,
    right: (e) => "button" in e && e.button !== 2,
    exact: (e, t) => oc.some((n) => e[`${n}Key`] && !t.includes(n))
  }, Mo = (e, t) => {
    if (!e) return e;
    const n = e._withMods || (e._withMods = {}), i = t.join(".");
    return n[i] || (n[i] = ((o, ...s) => {
      for (let r = 0; r < t.length; r++) {
        const a = sc[t[r]];
        if (a && a(o, t)) return;
      }
      return e(o, ...s);
    }));
  }, rc = Le({
    patchProp: tc
  }, Iu);
  let Ns;
  function ac() {
    return Ns || (Ns = hu(rc));
  }
  const lc = ((...e) => {
    const t = ac().createApp(...e), { mount: n } = t;
    return t.mount = (i) => {
      const o = cc(i);
      if (!o) return;
      const s = t._component;
      !ee(s) && !s.render && !s.template && (s.template = o.innerHTML), o.nodeType === 1 && (o.textContent = "");
      const r = n(o, false, uc(o));
      return o instanceof Element && (o.removeAttribute("v-cloak"), o.setAttribute("data-v-app", "")), r;
    }, t;
  });
  function uc(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function cc(e) {
    return Ce(e) ? document.querySelector(e) : e;
  }
  const fc = `// Mandelbrot progressive-iteration shader.
//
// Layer layout (r32float texture_2d_array, 7 layers):
//   0 : sentinel / iteration count (integer part).
//       Negative  => sentinel (brush/resolve system).  -1 = compute request.
//       0         => inside the set (confirmed), or budget fully exhausted at globalMaxIter.
//       > 0       => escaped (|z|\xB2 >= 4) or budget-exhausted mid-progress (|z|\xB2 < 4).
//   1 : mu \u2013 purely cosmetic smooth fractional part for coloring escaped pixels.
//       Only meaningful when iter > 0 AND |z|\xB2 >= 4 (escaped).
//   2 : z.x   (real part of current z, for resuming)
//   3 : z.y   (imag part of current z, for resuming)
//   4 : dz.x  (real part of derivative, for resuming)
//   5 : dz.y  (imag part of derivative, for resuming)
//   6 : angle_der (distance-estimation angle, for shading)
//
// Pixel state convention (iter-only, no mu in state logic):
//   iter == -1                     : sentinel, needs computation
//   iter == 0                      : confirmed inside the set (or exhausted at globalMaxIter)
//   iter > 0  AND  |z|\xB2 >= 4      : escaped \u2192 color with iter + mu
//   iter > 0  AND  |z|\xB2 < 4       : budget exhausted mid-progress \u2192 needs continuation

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
  maxIteration: f32,    // iterations to compute THIS pass
  epsilon: f32,
  antialiasLevel: f32,
  iterationOffset: f32, // iterations already completed in previous passes
  globalMaxIter: f32,   // total iteration target for the current view
  pad2: f32,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var rawIn: texture_2d_array<f32>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out: VertexOutput;
  out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  out.uv = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}

// \u2500\u2500 complex helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn cdiv(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  let denominator: f32 = b.x * b.x + b.y * b.y;
  return vec2<f32>((a.x * b.x + a.y * b.y) / denominator,
                   (a.y * b.x - a.x * b.y) / denominator);
}

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

// \u2500\u2500 output struct (7 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,  // .r = integer iteration count (or sentinel)
  @location(1) mu:        vec4<f32>,  // .r = smooth fractional part
  @location(2) zx:        vec4<f32>,  // .r = z.x
  @location(3) zy:        vec4<f32>,  // .r = z.y
  @location(4) dzx:       vec4<f32>,  // .r = derivative x
  @location(5) dzy:       vec4<f32>,  // .r = derivative y
  @location(6) ref_iter:       vec4<f32>,  // .r = atan2 of distance-estimation
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawIn, coord, layer, 0).r;
}

// \u2500\u2500 core computation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_nu: f32, prev_zx: f32, prev_zy: f32, prev_dzx: f32, prev_dzy: f32, prev_ref_iter: f32) -> FragOut {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let epsilon = mandelbrot.epsilon;

  // Resume state: if prev_iter > 0 we are continuing a previous pass.

  var i: f32 = 0.0;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var der = vec2<f32>(prev_dzx, prev_dzy);
  var ref_i = i32(prev_ref_iter)  ;
  var z = getOrbit(ref_i);
  var d = vec2<f32>(1.0, 0.0);

  var escaped = false;
  var inside = false;

  while (i < max_iteration && f32(ref_i) < mandelbrot.globalMaxIter) {
    z = getOrbit(ref_i);
    dz = 2.0 * cmul(dz, z) + cmul(dz, dz) + dc;
    ref_i += 1;

    z = getOrbit(ref_i) + dz;
    d = cdiv(der, z);

    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      escaped = true;
      break;
    }
    if (dot(der, der) < epsilon) {
      inside = true;
      break;
    }
    der = cmul(der * 2.0, z);

    let dot_dz = dot(dz, dz);
    if (dot_z < dot_dz || f32(ref_i) == mandelbrot.globalMaxIter) {
      dz = z;
      ref_i = 0;
    }
    i += 1.0;
  }

  var out: FragOut;

  if (inside) {
    // Confirmed inside the set.
    out.iter      = pack(0.0);
    out.mu        = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_iter = pack(0.0);
    return out;
  }

  let total_iter = prev_iter + i; // running total across all passes

  if (escaped) {
    // Smooth colouring: fractional correction normalised by the bailout radius.
    // Formula: nu = log2( log(|z|\xB2) / log(mu) )
    //          smooth_frac = 1 - nu   (in [0,1] when |z|\xB2 is between mu and mu\xB2)
    let log_z2 = log(z.x * z.x + z.y * z.y);  // = log(|z|\xB2)
    let nu = log(log_z2 / log(muLimit)) / log(2.0);
    let smooth_frac = clamp(1.0 - nu, 0.0, 1.0);
    let angle_der = atan2(d.y, d.x);

    out.iter      = pack(total_iter);
    out.mu        = pack(smooth_frac);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_iter = pack(angle_der);
    return out;
  }

  // Not escaped, not inside \u2014 budget exhausted for this pass.
  let globalMax = mandelbrot.globalMaxIter;

  if (total_iter >= globalMax) {
    // Reached the global iteration target without escaping.
    // Mark as "inside for now" (iter = 0).
    out.iter      = pack(0.0);
    out.mu        = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_iter = pack(0.0);
    return out;
  }

    // Smooth colouring: fractional correction normalised by the bailout radius.
    let log_z2 = log(z.x * z.x + z.y * z.y);
    let nu = log(log_z2 / log(muLimit)) / log(2.0);
    let smooth_frac = clamp(1.0 - nu, 0.0, 1.0);
    let angle_der = atan2(d.y, d.x);
  // Budget exhausted below globalMaxIter: store iter = total_iter, keep z/dz
  // for resumption.  |z|\xB2 < 4 distinguishes this from escaped pixels.
  out.iter      = pack(total_iter);
  out.mu        = pack(smooth_frac);
  out.zx        = pack(dz.x);
  out.zy        = pack(dz.y);
  out.dzx       = pack(der.x);
  out.dzy       = pack(der.y);
  out.ref_iter = pack(f32(ref_i));
  return out;
}

// \u2500\u2500 fragment entry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<i32>(textureDimensions(rawIn));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  let prev_iter = loadLayer(coord, 0);
  let prev_mu = loadLayer(coord, 1);
  let prev_zx   = loadLayer(coord, 2);
  let prev_zy   = loadLayer(coord, 3);
  let prev_ref_iter = loadLayer(coord, 6);

  // Determine pixel state (iter-only convention, no mu in state logic):
  //   iter == -1                     : sentinel, needs fresh computation
  //   iter == 0                      : confirmed inside the set, pass through
  //   iter > 0  AND  |z|\xB2 >= 4      : escaped, pass through
  //   iter > 0  AND  |z|\xB2 < 4       : budget exhausted mid-progress, needs continuation
  //   iter < 0  AND  iter != -1     : resolution sentinel, pass through
  let is_compute_request = (prev_iter == -1.0);
  let needs_continuation = (prev_iter > 0.0 && (prev_zx * prev_zx + prev_zy * prev_zy) < mandelbrot.mu);

  if (!is_compute_request && !needs_continuation) {
    // Pass through all 7 layers unchanged.
    var out: FragOut;
    out.iter      = pack(prev_iter);
    out.mu        = pack(prev_mu);
    out.zx        = pack(prev_zx);
    out.zy        = pack(prev_zy);
    out.dzx       = pack(loadLayer(coord, 4));
    out.dzy       = pack(loadLayer(coord, 5));
    out.ref_iter = pack(loadLayer(coord, 6));
    return out;
  }

  // Neutral mapping: the neutral texture is a square that can contain the rotated screen.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;

  let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
  let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;

  if (needs_continuation) {
    // Resume from stored state: iter > 0, |z|\xB2 < 4.
    let stored_dzx = loadLayer(coord, 4);
    let stored_dzy = loadLayer(coord, 5);
    return mandelbrot_compute(x0, y0, prev_iter, prev_mu, prev_zx, prev_zy, stored_dzx, stored_dzy, prev_ref_iter);
  }

  // Fresh computation (sentinel == -1).
  return mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0);
}
`, dc = `struct Uniforms {
  palettePeriod: f32,
  paletteOffset: f32,
  tessellationLevel: f32,
  shadingLevel: f32,
  bloomStrength: f32,
  time: f32,
  activateTessellation: f32,
  activateShading: f32,
  activateWebcam: f32,
  activatePalette: f32,
  activateSkybox: f32,
  activateSmoothness: f32,
  activateZebra: f32,
  aspect: f32,
  angle: f32,
  animate: f32,
  mu: f32,
  pad1: f32,
  pad2: f32,
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d_array<f32>; // resolved neutral texture (7 r32float layers)
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) fragCoord: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out: VertexOutput;
  out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  out.fragCoord = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}

fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

// Conversion d'une direction 3D en coordonne9es UV pour une skybox equirectangulaire
fn dir_to_skybox_uv(dir: vec3<f32>, dx: f32, dy: f32) -> vec2<f32> {
  let d = normalize(dir);
  let u = abs((dx + atan2(d.z, d.x) / (2.0 * 3.14159265)) % 2.0 - 1.0) / 2.0;
  let v = abs((dy + asin(d.y) / 3.14159265) % 2.0 - 1.0) / 2.0;
  return vec2<f32>(u, v);
}

fn tile_tessellation(tex_: texture_2d<f32>, v: f32, dist: f32, repeat: f32) -> vec3<f32> {
  let tileUV = vec2<f32>(fract(v * repeat), fract(dist * repeat));
  let tileIndex = vec2<i32>(i32(floor(v * repeat)), i32(floor(dist * repeat)));

  let mirrorX = (tileIndex.x % 2) == 1;
  let mirrorY = (tileIndex.y % 2) == 1;
  let uv = vec2<f32>(
    select(tileUV.x, 1.0 - tileUV.x, mirrorX),
    select(tileUV.y, 1.0 - tileUV.y, mirrorY)
  );
  let texSize = vec2<i32>(textureDimensions(tex_, 0));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  return textureLoad(tex_, coord, 0).rgb;
}

fn palette(v: f32, z: vec2<f32>,  d: f32, dx: f32, dy: f32) -> vec3<f32> {
  let deep = v * 2.0;

  let tessColor = tile_tessellation(tileTex, deep + dx, deep + dy, parameters.tessellationLevel);
  let webCamColor = tile_tessellation(
    webcamTex,
    deep + dx + cos(parameters.time * 0.1),
    deep + dy + sin(parameters.time * 0.15),
    parameters.tessellationLevel + sin(parameters.time * 0.05)
  );
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let palettePhase = fract(deep / paletteRepeat + parameters.paletteOffset );
  let paletteColor = tile_tessellation(paletteTex, palettePhase, 1.0, 1.0);

  var color = vec3<f32>(0.0, 0.0, 0.0);

  if (parameters.activatePalette == 1.0) {
    color = mix(color, paletteColor, 1.0 - color);
  }

  if (parameters.activateTessellation == 1.0) {
    color = mix(color, tessColor, 1.0 - color);
  }

  if (parameters.activateWebcam == 1.0) {
    color = mix(color, webCamColor, 1.0 - color);
  }

  if (parameters.activatePalette == 0.0
      && parameters.activateTessellation == 0.0
      && parameters.activateWebcam == 0.0
  ) {
    if (parameters.activateSkybox == 0.0) {
      color = vec3<f32>(0.5, 0.5, 0.5);
    } else {
      color = vec3<f32>(1.0, 1.0, 1.0);
    }
  }

  if (parameters.activateShading == 1.0) {
    let normal = normalize(vec3<f32>(cos(d), sin(d), 0.5));
    let lightDir = normalize(vec3<f32>(0.2, 0.3, 0.5));
    let viewDir = vec3<f32>(0.7, 0.8, 0.5);
    let diff = max(dot(normal, lightDir), 0.0);
    let ambient = 2.0;
    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(viewDir, reflectDir), 0.0), 1.0);
    var phong = ambient + 2.0 * diff + 1.0 * specular;

    if (parameters.activateSkybox == 1.0) {
      let skyboxDir = normalize(vec3<f32>(cos(d), sin(d), 1.0));
      let skyboxUV = dir_to_skybox_uv(skyboxDir, dx, dy);
      let skyboxSize = vec2<i32>(textureDimensions(skyboxTex, 0));
      let skyboxCoord = vec2<i32>(
        i32(clamp(skyboxUV.x * f32(skyboxSize.x), 0.0, f32(skyboxSize.x - 1))),
        i32(clamp((1.0 - skyboxUV.y) * f32(skyboxSize.y), 0.0, f32(skyboxSize.y - 1)))
      );

      let skyboxColor = textureLoad(skyboxTex, skyboxCoord, 0).rgb;
      let lum = 0.2126 * skyboxColor.r + 0.7152 * skyboxColor.g + 0.0722 * skyboxColor.b;
      phong = phong * lum * 1.0;
      color = color / phong * 1.0;
    } else {
      color = color / phong * 2.0;
    }
  }

  return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}

@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  // Screen uv in [0,1]
  let uv_screen = fragCoord;

  // Map from screen uv into the neutral texture uv.
  //
  // The neutral texture is a square large enough to contain the rotated screen.
  // We work in "local" coordinates where the screen rectangle is
  //   local.x in [-aspect, +aspect]
  //   local.y in [-1, +1]
  // Then we scale by the half-diagonal length so that any rotation stays in [-1, 1].
  let xy_screen = vec2<f32>(uv_screen.x * 2.0 - 1.0, uv_screen.y * 2.0 - 1.0);
  let local = vec2<f32>(xy_screen.x * parameters.aspect, xy_screen.y);
  let neutralExtent = sqrt(parameters.aspect * parameters.aspect + 1.0);
  let local_rot = rotate(local, parameters.angle);
  let xy_neutral = local_rot / neutralExtent;
  let uv_neutral = xy_neutral * 0.5 + vec2<f32>(0.5, 0.5);

  let texSize = vec2<i32>(textureDimensions(tex));
  let sampleCoord = vec2<i32>(
    i32(clamp(uv_neutral.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv_neutral.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );

  // Read individual layers from the texture array.
  let iter_val  = textureLoad(tex, sampleCoord, 0, 0).r; // layer 0: integer iter count / sentinel
  let mu_val    = textureLoad(tex, sampleCoord, 1, 0).r; // layer 1: smooth fractional part
  let zx_val    = textureLoad(tex, sampleCoord, 2, 0).r; // layer 2: z.x
  let zy_val    = textureLoad(tex, sampleCoord, 3, 0).r; // layer 3: z.y
  let angle_der = textureLoad(tex, sampleCoord, 6, 0).r; // layer 6: angle_der

  // Combine integer + fractional parts for smooth iteration value.
  var nu = iter_val + mu_val;

  // Sentinel: iter_val < 0 => uncomputed pixel.
  if (iter_val < 0.0) {
    let t = clamp((-iter_val) / 64.0, 0.0, 1.0);
    return vec4<f32>(0.15 + 0.35 * t, 0.0, 0.0, 1.0);
  }

  // Budget exhausted: iter > 0 but z hasn't escaped (|z|\xB2 < mu).
  // Render as green (debug) until continuation completes.
  if (iter_val > 0.0 && (zx_val * zx_val + zy_val * zy_val) < parameters.mu) {
    return vec4<f32>(0.0, 0.5, 0.0, 1.0);
  }

  // Inside the set: iter_val == 0 and mu >= 0.
  if (iter_val == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }

  if (parameters.activateZebra == 1.0 && floor(nu) % 2.0 == 0.0) {
    nu = 0.0;
  }

  // Edge case: nu <= 0 after combination (shouldn't happen for escaped points).
  if (nu < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.5, 1.0);
  }

  if (parameters.activateSmoothness == 0.0) {
    nu = iter_val;
  }

  let v = nu / 256.0;
  var color = palette(v, vec2<f32>(zx_val, zy_val), angle_der, uv_neutral.x, uv_neutral.y);

  return vec4<f32>(color, 1.0);
}

`, pc = `// Brush pass: updates sentinel levels in the neutral square texture.
//
// Uses a texture_2d_array<f32> with 7 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : mu \u2013 fractional smooth part (cosmetic only, used for coloring).
//       mu > 0  => pixel escaped; smooth coloring = iter + mu.
//       State logic uses iter + |z|\xB2 instead of mu.
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : angle_der
//
// Sentinels are stored in layer 0 as negative integers:
//   -1  : needs Mandelbrot computation (or continuation)
//   -2  : needs resolve with step=2
//   -4  : needs resolve with step=4
//   ...
//
// Pixel state convention (iter-only, no mu in state logic):
//   iter == -1                     : sentinel, needs computation
//   iter == 0                      : confirmed inside the set (or exhausted at globalMaxIter)
//   iter > 0  AND  |z|\xB2 >= 4      : escaped \u2192 color with iter + mu
//   iter > 0  AND  |z|\xB2 < 4       : budget exhausted mid-progress \u2192 needs continuation
//   The mandelbrot pass handles continuations directly; the brush does NOT
//   convert budget-exhausted pixels to sentinels.

struct BrushUniforms {
  aspect: f32,
  angle: f32,
  clearHistory: f32,
  seedStep: f32,
  baseSentinel: f32,
  shiftTexX: f32,
  shiftTexY: f32,
  mu: f32,
  gridOffsetX: f32,
  gridOffsetY: f32,
};

@group(0) @binding(0) var<uniform> uni: BrushUniforms;
@group(0) @binding(1) var prevRaw: texture_2d_array<f32>;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
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
  o.uv = (pos[vid] + vec2<f32>(1.0)) * 0.5;
  return o;
}

fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
  let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate(local_rot, -uni.angle);
  let inside_x = abs(local.x) <= uni.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
}

// \u2500\u2500 output struct (7 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,
  @location(1) mu:        vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) angle_der: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(prevRaw, coord, layer, 0).r;
}

fn loadAllLayers(coord: vec2<i32>) -> FragOut {
  var o: FragOut;
  o.iter      = pack(loadLayer(coord, 0));
  o.mu        = pack(loadLayer(coord, 1));
  o.zx        = pack(loadLayer(coord, 2));
  o.zy        = pack(loadLayer(coord, 3));
  o.dzx       = pack(loadLayer(coord, 4));
  o.dzy       = pack(loadLayer(coord, 5));
  o.angle_der = pack(loadLayer(coord, 6));
  return o;
}

fn makeCleared(sentinel: f32) -> FragOut {
  var o: FragOut;
  o.iter      = pack(sentinel);
  o.mu        = pack(0.0);
  o.zx        = pack(0.0);
  o.zy        = pack(0.0);
  o.dzx       = pack(0.0);
  o.dzy       = pack(0.0);
  o.angle_der = pack(0.0);
  return o;
}

fn refine_sentinel(s: f32, coord_out: vec2<i32>) -> f32 {
  let si = i32(round(s));
  if (si >= 0) {
    return s;
  }
  if (si == -1) {
    return -1.0;
  }

  let step = -si;
  if (step <= 1) {
    return -1.0;
  }

  let next_step = max(1, step / 2);
  let gx = i32(uni.gridOffsetX);
  let gy = i32(uni.gridOffsetY);
  let is_anchor = (((coord_out.x - gx) % next_step + next_step) % next_step == 0)
               && (((coord_out.y - gy) % next_step + next_step) % next_step == 0);
  return select(-f32(next_step), -1.0, is_anchor);
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<i32>(textureDimensions(prevRaw));
  let coord_out = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  // Full reset when needed.
  if (uni.clearHistory >= 0.5) {
    let step = i32(max(1.0, uni.seedStep));
    let is_anchor = (coord_out.x % step == 0) && (coord_out.y % step == 0);
    let sentinel = select(-uni.baseSentinel, -1.0, is_anchor);
    return makeCleared(sentinel);
  }

  // Translation reprojection.
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let coord_in = coord_out - shift;

  var prev: FragOut;
  if (coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y) {
    prev = makeCleared(-uni.baseSentinel);
  } else {
    prev = loadAllLayers(coord_in);
  }

  // Outside ROI: keep as-is.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  if (!is_inside_rotated_screen(xy_neutral)) {
    return prev;
  }

  let iter_val = prev.iter.r;

  // Sentinel refinement.
  if (iter_val < 0.0) {
    let refined = refine_sentinel(iter_val, coord_out);
    var out = prev;
    out.iter = pack(refined);
    return out;
  }

  // Already computed and escaped (iter > 0, mu > 0) or inside (iter == 0, mu >= 0).
  return prev;
}
`, hc = `// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Uses a texture_2d_array<f32> with 7 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : mu (smooth fractional part for escaped pixels; cosmetic only)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : angle_der
//
// Sentinel convention:
//   If layer0 == -step (step is power-of-two > 1), resolve by testing
//   all 4 corner anchors of the grid cell and using the first finished
//   one.  This ensures correct resolve regardless of pan direction.

struct ResolveUniforms {
  mu: f32,
  gridOffsetX: f32,
  gridOffsetY: f32,
};

@group(0) @binding(0) var<uniform> uni: ResolveUniforms;
@group(0) @binding(1) var rawTex: texture_2d_array<f32>;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
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
  o.uv = (pos[vid] + vec2<f32>(1.0)) * 0.5;
  return o;
}

// \u2500\u2500 output struct (7 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,
  @location(1) mu:        vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) angle_der: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawTex, coord, layer, 0).r;
}

fn loadAllLayers(coord: vec2<i32>) -> FragOut {
  var o: FragOut;
  o.iter      = pack(loadLayer(coord, 0));
  o.mu        = pack(loadLayer(coord, 1));
  o.zx        = pack(loadLayer(coord, 2));
  o.zy        = pack(loadLayer(coord, 3));
  o.dzx       = pack(loadLayer(coord, 4));
  o.dzy       = pack(loadLayer(coord, 5));
  o.angle_der = pack(loadLayer(coord, 6));
  return o;
}

fn floor_power_of_two(step: u32) -> u32 {
  // Returns the greatest power-of-two <= step.
  if (step == 0u) {
    return 1u;
  }
  let msb_index = 31u - countLeadingZeros(step);
  return 1u << msb_index;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<u32>(textureDimensions(rawTex));
  let x = u32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1u)));
  let y = u32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1u)));
  let coord = vec2<i32>(i32(x), i32(y));

  let iter_val = loadLayer(coord, 0);

  // Finished pixel: escaped (iter > 0, |z|\xB2 >= mu) or inside (iter == 0).
  // Pass through unchanged.
  if (iter_val == 0.0) {
    return loadAllLayers(coord);
  }
  if (iter_val > 0.0) {
    let zx = loadLayer(coord, 2);
    let zy = loadLayer(coord, 3);
    let z_sq = zx * zx + zy * zy;
    if (z_sq > uni.mu) {
      // Escaped \u2014 finished, pass through.
      return loadAllLayers(coord);
    }
    // Budget-exhausted anchor (iter > 0, |z|\xB2 < mu):
    // climb to a coarser finished ancestor starting at step 2.
  }

  // At this point the pixel is either:
  //   (a) a sentinel (iter < 0, step > 1) \u2014 snap to parent anchor, or
  //   (b) a budget-exhausted anchor \u2014 climb to a coarser finished ancestor.

  // -1 should not remain after Mandelbrot pass, but if it does: keep as-is.
  var step_u: u32;
  if (iter_val < 0.0) {
    let step_f = -iter_val;
    if (step_f <= 1.0) {
      return loadAllLayers(coord);
    }
    step_u = floor_power_of_two(u32(step_f));
  } else {
    // Budget-exhausted anchor: start climbing from the next coarser grid level.
    step_u = 2u;
  }

  // Snap to parent anchor, climbing to coarser steps if the anchor is
  // budget-exhausted (iter > 0 AND |z|\xB2 < mu).  This eliminates the
  // Sierpinski-triangle artifact that appeared when the resolve pass
  // blindly copied unfinished pixels.

  // Grid offset for sentinel alignment after translation.
  let gx = i32(uni.gridOffsetX);
  let gy = i32(uni.gridOffsetY);

  // Climb through coarser grid levels. The maximum number of doublings
  // before step_u exceeds the texture size is bounded by log2(max(dims)).
  // Using 20 iterations covers textures up to 2^20 = 1M pixels per side.
  for (var level = 0u; level < 10u; level = level + 1u) {
    // Safety: if step exceeds texture size, stop climbing and fall back
    // to the pixel itself (prevents runaway on pathological inputs
    // or when all ancestors are unfinished sentinels).
    if (step_u >= dims.x || step_u >= dims.y) {
      return loadAllLayers(coord);
    }

    let step_i = i32(step_u);
    // Snap to grid-aligned anchor, accounting for cumulative shift offset.
    let sx = i32(x) - gx;
    let sy = i32(y) - gy;
    let base_x = u32(sx - ((sx % step_i + step_i) % step_i) + gx);
    let base_y = u32(sy - ((sy % step_i + step_i) % step_i) + gy);

    // Test 4 candidate anchors (all corners of the grid cell) so that
    // resolve works regardless of the navigation direction.
    var candidates = array<vec2<u32>, 4>(
      vec2<u32>(base_x,          base_y),
      vec2<u32>(base_x + step_u, base_y),
      vec2<u32>(base_x,          base_y + step_u),
      vec2<u32>(base_x + step_u, base_y + step_u)
    );

    for (var i = 0u; i < 4u; i = i + 1u) {
      let cx = candidates[i].x;
      let cy = candidates[i].y;

      // Bounds check: skip candidates that fall outside the texture.
      if (cx >= dims.x || cy >= dims.y) {
        continue;
      }

      let ccoord = vec2<i32>(i32(cx), i32(cy));
      let citer = loadLayer(ccoord, 0);

      // Sentinel \u2014 this candidate is not computed yet.
      if (citer < 0.0) {
        continue;
      }

      // Inside set (iter == 0): use it.
      if (citer == 0.0) {
        return loadAllLayers(ccoord);
      }

      // iter > 0: check whether pixel actually escaped or is budget-exhausted.
      let zx = loadLayer(ccoord, 2);
      let zy = loadLayer(ccoord, 3);
      let z_sq = zx * zx + zy * zy;

      if (z_sq >= uni.mu) {
        // Escaped \u2014 use this pixel.
        return loadAllLayers(ccoord);
      }

      // Budget-exhausted: skip this candidate, try the others.
    }

    // None of the 4 candidates had a finished pixel \u2014 climb to the next
    // coarser grid level.
    step_u = step_u * 2u;
  }

  // Fallback after exhausting all grid levels.
  return loadAllLayers(coord);
}
`, gc = `// Compute pass: counts pixels that still need rendering work.
//
// Reads rawTexture (A) after the mandelbrot render pass:
//   Layer 0 : iter (sentinel / iteration count)
//   Layer 2 : z.x
//   Layer 3 : z.y
//
// A pixel needs work if:
//   iter < 0               : sentinel (any level), needs refinement + computation
//   iter > 0  AND  |z|\xB2 < mu : budget exhausted mid-progress, needs continuation
//
// Only pixels inside the rotated viewport are counted; pixels outside
// the projected frame on the neutral texture are ignored.
//
// The count is written to an atomic<u32> in a storage buffer, read back
// asynchronously by the CPU to determine when progressive rendering is done.

struct Params {
  mu: f32,
  aspect: f32,
  angle: f32,
};

struct CounterBuffer {
  count: atomic<u32>,
};

@group(0) @binding(0) var rawTex: texture_2d_array<f32>;
@group(0) @binding(1) var<storage, read_write> counter: CounterBuffer;
@group(0) @binding(2) var<uniform> params: Params;

fn rotate2d(v: vec2<f32>, a: f32) -> vec2<f32> {
  let s = sin(a);
  let c = cos(a);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
  let neutralExtent = sqrt(params.aspect * params.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate2d(local_rot, -params.angle);
  let inside_x = abs(local.x) <= params.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
}

@compute @workgroup_size(16, 16)
fn count_unfinished(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(rawTex);
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  // Map pixel coordinate to neutral-space [-1, 1]
  // Y is flipped to match the fragment-shader convention where uv.y=0 is
  // bottom and uv.y=1 is top, whereas gid.y=0 is the first texel row.
  let uv = vec2<f32>(
    (f32(gid.x) + 0.5) / f32(dims.x),
    1.0 - (f32(gid.y) + 0.5) / f32(dims.y),
  );
  let xy_neutral = uv * 2.0 - vec2<f32>(1.0);

  // Skip pixels outside the rotated viewport
  if (!is_inside_rotated_screen(xy_neutral)) {
    return;
  }

  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let iter = textureLoad(rawTex, coord, 0, 0).r;
  let zx   = textureLoad(rawTex, coord, 2, 0).r;
  let zy   = textureLoad(rawTex, coord, 3, 0).r;

  let is_sentinel        = (iter < 0.0);
  let needs_continuation = (iter > 0.0) && ((zx * zx + zy * zy) < params.mu);

  if (is_sentinel || needs_continuation) {
    atomicAdd(&counter.count, 1u);
  }
}
`, vc = "" + new URL("mandelbrot_bg-B7xpCMLZ.wasm", import.meta.url).href, mc = async (e = {}, t) => {
    let n;
    if (t.startsWith("data:")) {
      const i = t.replace(/^data:.*?base64,/, "");
      let o;
      if (typeof Buffer == "function" && typeof Buffer.from == "function") o = Buffer.from(i, "base64");
      else if (typeof atob == "function") {
        const s = atob(i);
        o = new Uint8Array(s.length);
        for (let r = 0; r < s.length; r++) o[r] = s.charCodeAt(r);
      } else throw new Error("Cannot decode base64-encoded data URL");
      n = await WebAssembly.instantiate(o, e);
    } else {
      const i = await fetch(t), o = i.headers.get("Content-Type") || "";
      if ("instantiateStreaming" in WebAssembly && o.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(i, e);
      else {
        const s = await i.arrayBuffer();
        n = await WebAssembly.instantiate(s, e);
      }
    }
    return n.instance.exports;
  };
  let J;
  function bc(e) {
    J = e;
  }
  function Yo(e, t) {
    try {
      return e.apply(this, t);
    } catch (n) {
      let i = (function() {
        try {
          return n instanceof Error ? `${n.message}

Stack:
${n.stack}` : n.toString();
        } catch {
          return "<failed to stringify thrown value>";
        }
      })();
      throw console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", i), n;
    }
  }
  let ai = null;
  function bi() {
    return (ai === null || ai.byteLength === 0) && (ai = new Uint8Array(J.memory.buffer)), ai;
  }
  let _i = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  _i.decode();
  const _c = 2146435072;
  let ro = 0;
  function xc(e, t) {
    return ro += t, ro >= _c && (_i = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), _i.decode(), ro = t), _i.decode(bi().subarray(e, e + t));
  }
  function va(e, t) {
    return e = e >>> 0, xc(e, t);
  }
  function _e(e) {
    if (typeof e != "number") throw new Error(`expected a number argument, found ${typeof e}`);
  }
  let un = null;
  function yc() {
    return (un === null || un.buffer.detached === true || un.buffer.detached === void 0 && un.buffer !== J.memory.buffer) && (un = new DataView(J.memory.buffer)), un;
  }
  function Us(e, t) {
    e = e >>> 0;
    const n = yc(), i = [];
    for (let o = e; o < e + 4 * t; o += 4) i.push(J.__wbindgen_export_0.get(n.getUint32(o, true)));
    return J.__externref_drop_slice(e, t), i;
  }
  let Dt = 0;
  const $n = new TextEncoder();
  "encodeInto" in $n || ($n.encodeInto = function(e, t) {
    const n = $n.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  });
  function cn(e, t, n) {
    if (typeof e != "string") throw new Error(`expected a string argument, found ${typeof e}`);
    if (n === void 0) {
      const a = $n.encode(e), l = t(a.length, 1) >>> 0;
      return bi().subarray(l, l + a.length).set(a), Dt = a.length, l;
    }
    let i = e.length, o = t(i, 1) >>> 0;
    const s = bi();
    let r = 0;
    for (; r < i; r++) {
      const a = e.charCodeAt(r);
      if (a > 127) break;
      s[o + r] = a;
    }
    if (r !== i) {
      r !== 0 && (e = e.slice(r)), o = n(o, i, i = r + e.length * 3, 1) >>> 0;
      const a = bi().subarray(o + r, o + i), l = $n.encodeInto(e, a);
      if (l.read !== e.length) throw new Error("failed to pass whole string");
      r += l.written, o = n(o, i, r, 1) >>> 0;
    }
    return Dt = r, o;
  }
  const Fs = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => J.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  class Co {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Fs.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      J.__wbg_mandelbrotnavigator_free(t, 0);
    }
    get_params() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr);
      const t = J.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = Us(t[0], t[1]).slice();
      return J.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    rotate_direct(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), J.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), J.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    get_reference_orbit_len() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return _e(this.__wbg_ptr), J.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    compute_reference_orbit_ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), _e(t);
      const n = J.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return Sn.__wrap(n);
    }
    get_reference_orbit_capacity() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return _e(this.__wbg_ptr), J.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    compute_reference_orbit_chunk(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), _e(t), _e(n);
      const i = J.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, t, n);
      return Sn.__wrap(i);
    }
    constructor(t, n, i, o) {
      const s = cn(t, J.__wbindgen_malloc, J.__wbindgen_realloc), r = Dt, a = cn(n, J.__wbindgen_malloc, J.__wbindgen_realloc), l = Dt, f = cn(i, J.__wbindgen_malloc, J.__wbindgen_realloc), u = Dt, d = J.mandelbrotnavigator_new(s, r, a, l, f, u, o);
      return this.__wbg_ptr = d >>> 0, Fs.register(this, this.__wbg_ptr, this), this;
    }
    step() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr);
      const t = J.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = Us(t[0], t[1]).slice();
      return J.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    zoom(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), J.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    angle(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), J.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    scale(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr);
      const n = cn(t, J.__wbindgen_malloc, J.__wbindgen_realloc), i = Dt;
      J.mandelbrotnavigator_scale(this.__wbg_ptr, n, i);
    }
    origin(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr);
      const i = cn(t, J.__wbindgen_malloc, J.__wbindgen_realloc), o = Dt, s = cn(n, J.__wbindgen_malloc, J.__wbindgen_realloc), r = Dt;
      J.mandelbrotnavigator_origin(this.__wbg_ptr, i, o, s, r);
    }
    rotate(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), J.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), J.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
  }
  Symbol.dispose && (Co.prototype[Symbol.dispose] = Co.prototype.free);
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => J.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const Ds = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => J.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class Sn {
    constructor() {
      throw new Error("cannot invoke `new` directly");
    }
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(Sn.prototype);
      return n.__wbg_ptr = t, Ds.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Ds.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      J.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return _e(this.__wbg_ptr), J.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), _e(t), J.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return _e(this.__wbg_ptr), J.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), _e(t), J.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return _e(this.__wbg_ptr), J.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr), _e(t), J.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  Symbol.dispose && (Sn.prototype[Symbol.dispose] = Sn.prototype.free);
  function wc() {
    return Yo(function(e) {
      return Math.exp(e);
    }, arguments);
  }
  function Sc() {
    return Yo(function() {
      return Date.now();
    }, arguments);
  }
  function Tc(e, t) {
    throw new Error(va(e, t));
  }
  function Mc() {
    return Yo(function(e, t) {
      return va(e, t);
    }, arguments);
  }
  function Cc() {
    const e = J.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  URL = globalThis.URL;
  const ie = await mc({
    "./mandelbrot_bg.js": {
      __wbg_now_1e80617bcee43265: Sc,
      __wbg_exp_9293ded1248e1bd3: wc,
      __wbg_wbindgenthrow_451ec1a8469d7eb6: Tc,
      __wbindgen_init_externref_table: Cc,
      __wbindgen_cast_2241b6af4c4b2941: Mc
    }
  }, vc), ma = ie.memory, Ec = ie.__wbg_get_mandelbrotstep_dx, Pc = ie.__wbg_get_mandelbrotstep_dy, Lc = ie.__wbg_get_mandelbrotstep_zx, kc = ie.__wbg_get_mandelbrotstep_zy, Rc = ie.__wbg_get_orbitbufferinfo_count, Ac = ie.__wbg_get_orbitbufferinfo_offset, zc = ie.__wbg_get_orbitbufferinfo_ptr, Bc = ie.__wbg_mandelbrotnavigator_free, Ic = ie.__wbg_mandelbrotstep_free, Oc = ie.__wbg_orbitbufferinfo_free, Nc = ie.__wbg_set_mandelbrotstep_dx, Uc = ie.__wbg_set_mandelbrotstep_dy, Fc = ie.__wbg_set_mandelbrotstep_zx, Dc = ie.__wbg_set_mandelbrotstep_zy, $c = ie.__wbg_set_orbitbufferinfo_count, Gc = ie.__wbg_set_orbitbufferinfo_offset, Vc = ie.__wbg_set_orbitbufferinfo_ptr, Hc = ie.mandelbrotnavigator_angle, Wc = ie.mandelbrotnavigator_compute_reference_orbit_chunk, jc = ie.mandelbrotnavigator_compute_reference_orbit_ptr, qc = ie.mandelbrotnavigator_get_params, Yc = ie.mandelbrotnavigator_get_reference_orbit_capacity, Kc = ie.mandelbrotnavigator_get_reference_orbit_len, Xc = ie.mandelbrotnavigator_new, Zc = ie.mandelbrotnavigator_origin, Jc = ie.mandelbrotnavigator_rotate, Qc = ie.mandelbrotnavigator_rotate_direct, ef = ie.mandelbrotnavigator_scale, tf = ie.mandelbrotnavigator_step, nf = ie.mandelbrotnavigator_translate, of = ie.mandelbrotnavigator_translate_direct, sf = ie.mandelbrotnavigator_zoom, rf = ie.__wbindgen_export_0, af = ie.__externref_drop_slice, lf = ie.__wbindgen_free, uf = ie.__wbindgen_malloc, cf = ie.__wbindgen_realloc, ba = ie.__wbindgen_start, ff = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: af,
    __wbg_get_mandelbrotstep_dx: Ec,
    __wbg_get_mandelbrotstep_dy: Pc,
    __wbg_get_mandelbrotstep_zx: Lc,
    __wbg_get_mandelbrotstep_zy: kc,
    __wbg_get_orbitbufferinfo_count: Rc,
    __wbg_get_orbitbufferinfo_offset: Ac,
    __wbg_get_orbitbufferinfo_ptr: zc,
    __wbg_mandelbrotnavigator_free: Bc,
    __wbg_mandelbrotstep_free: Ic,
    __wbg_orbitbufferinfo_free: Oc,
    __wbg_set_mandelbrotstep_dx: Nc,
    __wbg_set_mandelbrotstep_dy: Uc,
    __wbg_set_mandelbrotstep_zx: Fc,
    __wbg_set_mandelbrotstep_zy: Dc,
    __wbg_set_orbitbufferinfo_count: $c,
    __wbg_set_orbitbufferinfo_offset: Gc,
    __wbg_set_orbitbufferinfo_ptr: Vc,
    __wbindgen_export_0: rf,
    __wbindgen_free: lf,
    __wbindgen_malloc: uf,
    __wbindgen_realloc: cf,
    __wbindgen_start: ba,
    mandelbrotnavigator_angle: Hc,
    mandelbrotnavigator_compute_reference_orbit_chunk: Wc,
    mandelbrotnavigator_compute_reference_orbit_ptr: jc,
    mandelbrotnavigator_get_params: qc,
    mandelbrotnavigator_get_reference_orbit_capacity: Yc,
    mandelbrotnavigator_get_reference_orbit_len: Kc,
    mandelbrotnavigator_new: Xc,
    mandelbrotnavigator_origin: Zc,
    mandelbrotnavigator_rotate: Jc,
    mandelbrotnavigator_rotate_direct: Qc,
    mandelbrotnavigator_scale: ef,
    mandelbrotnavigator_step: tf,
    mandelbrotnavigator_translate: nf,
    mandelbrotnavigator_translate_direct: of,
    mandelbrotnavigator_zoom: sf,
    memory: ma
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  bc(ff);
  ba();
  class df {
    constructor(t = 1024, n = 1024) {
      __publicField(this, "video");
      __publicField(this, "stream", null);
      __publicField(this, "width");
      __publicField(this, "height");
      __publicField(this, "lastDrawTime", 0);
      this.width = t, this.height = n, this.video = document.createElement("video"), this.video.autoplay = true, this.video.width = t, this.video.height = n;
    }
    async openWebcam() {
      this.stream || (this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: this.width,
          height: this.height
        }
      }), this.video.srcObject = this.stream, await this.video.play());
    }
    async drawWebGPUTexture(t, n) {
      const i = performance.now();
      if (i - this.lastDrawTime > 15) {
        if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        n.queue.copyExternalImageToTexture({
          source: this.video
        }, {
          texture: t
        }, [
          this.width,
          this.height
        ]), this.lastDrawTime = i;
      }
    }
    closeWebcam() {
      this.stream && (this.stream.getTracks().forEach((t) => t.stop()), this.stream = null);
    }
  }
  function Cn(e, t, n) {
    e.prototype = t.prototype = n, n.constructor = e;
  }
  function ni(e, t) {
    var n = Object.create(e.prototype);
    for (var i in t) n[i] = t[i];
    return n;
  }
  function Ht() {
  }
  var rn = 0.7, Tn = 1 / rn, xn = "\\s*([+-]?\\d+)\\s*", Kn = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", vt = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", pf = /^#([0-9a-f]{3,8})$/, hf = new RegExp(`^rgb\\(${xn},${xn},${xn}\\)$`), gf = new RegExp(`^rgb\\(${vt},${vt},${vt}\\)$`), vf = new RegExp(`^rgba\\(${xn},${xn},${xn},${Kn}\\)$`), mf = new RegExp(`^rgba\\(${vt},${vt},${vt},${Kn}\\)$`), bf = new RegExp(`^hsl\\(${Kn},${vt},${vt}\\)$`), _f = new RegExp(`^hsla\\(${Kn},${vt},${vt},${Kn}\\)$`), $s = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  };
  Cn(Ht, Ko, {
    copy(e) {
      return Object.assign(new this.constructor(), this, e);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: Gs,
    formatHex: Gs,
    formatHex8: xf,
    formatHsl: yf,
    formatRgb: Vs,
    toString: Vs
  });
  function Gs() {
    return this.rgb().formatHex();
  }
  function xf() {
    return this.rgb().formatHex8();
  }
  function yf() {
    return _a(this).formatHsl();
  }
  function Vs() {
    return this.rgb().formatRgb();
  }
  function Ko(e) {
    var t, n;
    return e = (e + "").trim().toLowerCase(), (t = pf.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Hs(t) : n === 3 ? new ke(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? li(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? li(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = hf.exec(e)) ? new ke(t[1], t[2], t[3], 1) : (t = gf.exec(e)) ? new ke(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = vf.exec(e)) ? li(t[1], t[2], t[3], t[4]) : (t = mf.exec(e)) ? li(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = bf.exec(e)) ? qs(t[1], t[2] / 100, t[3] / 100, 1) : (t = _f.exec(e)) ? qs(t[1], t[2] / 100, t[3] / 100, t[4]) : $s.hasOwnProperty(e) ? Hs($s[e]) : e === "transparent" ? new ke(NaN, NaN, NaN, 0) : null;
  }
  function Hs(e) {
    return new ke(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
  }
  function li(e, t, n, i) {
    return i <= 0 && (e = t = n = NaN), new ke(e, t, n, i);
  }
  function Xo(e) {
    return e instanceof Ht || (e = Ko(e)), e ? (e = e.rgb(), new ke(e.r, e.g, e.b, e.opacity)) : new ke();
  }
  function me(e, t, n, i) {
    return arguments.length === 1 ? Xo(e) : new ke(e, t, n, i ?? 1);
  }
  function ke(e, t, n, i) {
    this.r = +e, this.g = +t, this.b = +n, this.opacity = +i;
  }
  Cn(ke, me, ni(Ht, {
    brighter(e) {
      return e = e == null ? Tn : Math.pow(Tn, e), new ke(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? rn : Math.pow(rn, e), new ke(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new ke(on(this.r), on(this.g), on(this.b), ki(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
    },
    hex: Ws,
    formatHex: Ws,
    formatHex8: wf,
    formatRgb: js,
    toString: js
  }));
  function Ws() {
    return `#${en(this.r)}${en(this.g)}${en(this.b)}`;
  }
  function wf() {
    return `#${en(this.r)}${en(this.g)}${en(this.b)}${en((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function js() {
    const e = ki(this.opacity);
    return `${e === 1 ? "rgb(" : "rgba("}${on(this.r)}, ${on(this.g)}, ${on(this.b)}${e === 1 ? ")" : `, ${e})`}`;
  }
  function ki(e) {
    return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
  }
  function on(e) {
    return Math.max(0, Math.min(255, Math.round(e) || 0));
  }
  function en(e) {
    return e = on(e), (e < 16 ? "0" : "") + e.toString(16);
  }
  function qs(e, t, n, i) {
    return i <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new st(e, t, n, i);
  }
  function _a(e) {
    if (e instanceof st) return new st(e.h, e.s, e.l, e.opacity);
    if (e instanceof Ht || (e = Ko(e)), !e) return new st();
    if (e instanceof st) return e;
    e = e.rgb();
    var t = e.r / 255, n = e.g / 255, i = e.b / 255, o = Math.min(t, n, i), s = Math.max(t, n, i), r = NaN, a = s - o, l = (s + o) / 2;
    return a ? (t === s ? r = (n - i) / a + (n < i) * 6 : n === s ? r = (i - t) / a + 2 : r = (t - n) / a + 4, a /= l < 0.5 ? s + o : 2 - s - o, r *= 60) : a = l > 0 && l < 1 ? 0 : r, new st(r, a, l, e.opacity);
  }
  function Xn(e, t, n, i) {
    return arguments.length === 1 ? _a(e) : new st(e, t, n, i ?? 1);
  }
  function st(e, t, n, i) {
    this.h = +e, this.s = +t, this.l = +n, this.opacity = +i;
  }
  Cn(st, Xn, ni(Ht, {
    brighter(e) {
      return e = e == null ? Tn : Math.pow(Tn, e), new st(this.h, this.s, this.l * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? rn : Math.pow(rn, e), new st(this.h, this.s, this.l * e, this.opacity);
    },
    rgb() {
      var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, i = n + (n < 0.5 ? n : 1 - n) * t, o = 2 * n - i;
      return new ke(ao(e >= 240 ? e - 240 : e + 120, o, i), ao(e, o, i), ao(e < 120 ? e + 240 : e - 120, o, i), this.opacity);
    },
    clamp() {
      return new st(Ys(this.h), ui(this.s), ui(this.l), ki(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
    },
    formatHsl() {
      const e = ki(this.opacity);
      return `${e === 1 ? "hsl(" : "hsla("}${Ys(this.h)}, ${ui(this.s) * 100}%, ${ui(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
    }
  }));
  function Ys(e) {
    return e = (e || 0) % 360, e < 0 ? e + 360 : e;
  }
  function ui(e) {
    return Math.max(0, Math.min(1, e || 0));
  }
  function ao(e, t, n) {
    return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
  }
  const xa = Math.PI / 180, ya = 180 / Math.PI, Ri = 18, wa = 0.96422, Sa = 1, Ta = 0.82521, Ma = 4 / 29, yn = 6 / 29, Ca = 3 * yn * yn, Sf = yn * yn * yn;
  function Ea(e) {
    if (e instanceof mt) return new mt(e.l, e.a, e.b, e.opacity);
    if (e instanceof pt) return La(e);
    e instanceof ke || (e = Xo(e));
    var t = fo(e.r), n = fo(e.g), i = fo(e.b), o = lo((0.2225045 * t + 0.7168786 * n + 0.0606169 * i) / Sa), s, r;
    return t === n && n === i ? s = r = o : (s = lo((0.4360747 * t + 0.3850649 * n + 0.1430804 * i) / wa), r = lo((0.0139322 * t + 0.0971045 * n + 0.7141733 * i) / Ta)), new mt(116 * o - 16, 500 * (s - o), 200 * (o - r), e.opacity);
  }
  function Eo(e, t, n, i) {
    return arguments.length === 1 ? Ea(e) : new mt(e, t, n, i ?? 1);
  }
  function mt(e, t, n, i) {
    this.l = +e, this.a = +t, this.b = +n, this.opacity = +i;
  }
  Cn(mt, Eo, ni(Ht, {
    brighter(e) {
      return new mt(this.l + Ri * (e ?? 1), this.a, this.b, this.opacity);
    },
    darker(e) {
      return new mt(this.l - Ri * (e ?? 1), this.a, this.b, this.opacity);
    },
    rgb() {
      var e = (this.l + 16) / 116, t = isNaN(this.a) ? e : e + this.a / 500, n = isNaN(this.b) ? e : e - this.b / 200;
      return t = wa * uo(t), e = Sa * uo(e), n = Ta * uo(n), new ke(co(3.1338561 * t - 1.6168667 * e - 0.4906146 * n), co(-0.9787684 * t + 1.9161415 * e + 0.033454 * n), co(0.0719453 * t - 0.2289914 * e + 1.4052427 * n), this.opacity);
    }
  }));
  function lo(e) {
    return e > Sf ? Math.pow(e, 1 / 3) : e / Ca + Ma;
  }
  function uo(e) {
    return e > yn ? e * e * e : Ca * (e - Ma);
  }
  function co(e) {
    return 255 * (e <= 31308e-7 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055);
  }
  function fo(e) {
    return (e /= 255) <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4);
  }
  function Pa(e) {
    if (e instanceof pt) return new pt(e.h, e.c, e.l, e.opacity);
    if (e instanceof mt || (e = Ea(e)), e.a === 0 && e.b === 0) return new pt(NaN, 0 < e.l && e.l < 100 ? 0 : NaN, e.l, e.opacity);
    var t = Math.atan2(e.b, e.a) * ya;
    return new pt(t < 0 ? t + 360 : t, Math.sqrt(e.a * e.a + e.b * e.b), e.l, e.opacity);
  }
  function Pe(e, t, n, i) {
    return arguments.length === 1 ? Pa(e) : new pt(n, t, e, 1);
  }
  function Po(e, t, n, i) {
    return arguments.length === 1 ? Pa(e) : new pt(e, t, n, i ?? 1);
  }
  function pt(e, t, n, i) {
    this.h = +e, this.c = +t, this.l = +n, this.opacity = +i;
  }
  function La(e) {
    if (isNaN(e.h)) return new mt(e.l, 0, 0, e.opacity);
    var t = e.h * xa;
    return new mt(e.l, Math.cos(t) * e.c, Math.sin(t) * e.c, e.opacity);
  }
  Cn(pt, Po, ni(Ht, {
    brighter(e) {
      return new pt(this.h, this.c, this.l + Ri * (e ?? 1), this.opacity);
    },
    darker(e) {
      return new pt(this.h, this.c, this.l - Ri * (e ?? 1), this.opacity);
    },
    rgb() {
      return La(this).rgb();
    }
  }));
  var ka = -0.14861, Zo = 1.78277, Jo = -0.29227, ji = -0.90649, Zn = 1.97294, Ks = Zn * ji, Xs = Zn * Zo, Zs = Zo * Jo - ji * ka;
  function Tf(e) {
    if (e instanceof sn) return new sn(e.h, e.s, e.l, e.opacity);
    e instanceof ke || (e = Xo(e));
    var t = e.r / 255, n = e.g / 255, i = e.b / 255, o = (Zs * i + Ks * t - Xs * n) / (Zs + Ks - Xs), s = i - o, r = (Zn * (n - o) - Jo * s) / ji, a = Math.sqrt(r * r + s * s) / (Zn * o * (1 - o)), l = a ? Math.atan2(r, s) * ya - 120 : NaN;
    return new sn(l < 0 ? l + 360 : l, a, o, e.opacity);
  }
  function Lo(e, t, n, i) {
    return arguments.length === 1 ? Tf(e) : new sn(e, t, n, i ?? 1);
  }
  function sn(e, t, n, i) {
    this.h = +e, this.s = +t, this.l = +n, this.opacity = +i;
  }
  Cn(sn, Lo, ni(Ht, {
    brighter(e) {
      return e = e == null ? Tn : Math.pow(Tn, e), new sn(this.h, this.s, this.l * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? rn : Math.pow(rn, e), new sn(this.h, this.s, this.l * e, this.opacity);
    },
    rgb() {
      var e = isNaN(this.h) ? 0 : (this.h + 120) * xa, t = +this.l, n = isNaN(this.s) ? 0 : this.s * t * (1 - t), i = Math.cos(e), o = Math.sin(e);
      return new ke(255 * (t + n * (ka * i + Zo * o)), 255 * (t + n * (Jo * i + ji * o)), 255 * (t + n * (Zn * i)), this.opacity);
    }
  }));
  const Qo = (e) => () => e;
  function Ra(e, t) {
    return function(n) {
      return e + n * t;
    };
  }
  function Mf(e, t, n) {
    return e = Math.pow(e, n), t = Math.pow(t, n) - e, n = 1 / n, function(i) {
      return Math.pow(e + i * t, n);
    };
  }
  function es(e, t) {
    var n = t - e;
    return n ? Ra(e, n > 180 || n < -180 ? n - 360 * Math.round(n / 360) : n) : Qo(isNaN(e) ? t : e);
  }
  function Cf(e) {
    return (e = +e) == 1 ? Ue : function(t, n) {
      return n - t ? Mf(t, n, e) : Qo(isNaN(t) ? n : t);
    };
  }
  function Ue(e, t) {
    var n = t - e;
    return n ? Ra(e, n) : Qo(isNaN(e) ? t : e);
  }
  const Ef = (function e(t) {
    var n = Cf(t);
    function i(o, s) {
      var r = n((o = me(o)).r, (s = me(s)).r), a = n(o.g, s.g), l = n(o.b, s.b), f = Ue(o.opacity, s.opacity);
      return function(u) {
        return o.r = r(u), o.g = a(u), o.b = l(u), o.opacity = f(u), o + "";
      };
    }
    return i.gamma = e, i;
  })(1);
  function Pf(e) {
    return function(t, n) {
      var i = e((t = Xn(t)).h, (n = Xn(n)).h), o = Ue(t.s, n.s), s = Ue(t.l, n.l), r = Ue(t.opacity, n.opacity);
      return function(a) {
        return t.h = i(a), t.s = o(a), t.l = s(a), t.opacity = r(a), t + "";
      };
    };
  }
  const Lf = Pf(es);
  function Aa(e, t) {
    var n = Ue((e = Eo(e)).l, (t = Eo(t)).l), i = Ue(e.a, t.a), o = Ue(e.b, t.b), s = Ue(e.opacity, t.opacity);
    return function(r) {
      return e.l = n(r), e.a = i(r), e.b = o(r), e.opacity = s(r), e + "";
    };
  }
  function kf(e) {
    return function(t, n) {
      var i = e((t = Po(t)).h, (n = Po(n)).h), o = Ue(t.c, n.c), s = Ue(t.l, n.l), r = Ue(t.opacity, n.opacity);
      return function(a) {
        return t.h = i(a), t.c = o(a), t.l = s(a), t.opacity = r(a), t + "";
      };
    };
  }
  const Rf = kf(es);
  function za(e) {
    return (function t(n) {
      n = +n;
      function i(o, s) {
        var r = e((o = Lo(o)).h, (s = Lo(s)).h), a = Ue(o.s, s.s), l = Ue(o.l, s.l), f = Ue(o.opacity, s.opacity);
        return function(u) {
          return o.h = r(u), o.s = a(u), o.l = l(Math.pow(u, n)), o.opacity = f(u), o + "";
        };
      }
      return i.gamma = t, i;
    })(1);
  }
  const Af = za(es);
  za(Ue);
  const zf = {
    lab: Aa,
    rgb: Ef,
    hcl: Rf,
    hsl: Lf,
    cubehelix: Af
  };
  class Ai {
    constructor(t, n = "lab") {
      __publicField(this, "points");
      __publicField(this, "interpolate");
      this.points = t.slice().sort((i, o) => i.position - o.position), this.interpolate = zf[n] ?? Aa;
    }
    getColorAt(t) {
      if (this.points.length === 0) return "#000";
      if (t <= this.points[0].position) return this.points[0].color;
      if (t >= this.points[this.points.length - 1].position) return this.points[this.points.length - 1].color;
      for (let n = 0; n < this.points.length - 1; ++n) {
        const i = this.points[n], o = this.points[n + 1];
        if (t >= i.position && t <= o.position) {
          const s = (t - i.position) / (o.position - i.position), r = this.interpolate(i.color, o.color);
          return me(r(s)).formatHex();
        }
      }
      return "#000";
    }
    generateTexture() {
      const i = new ImageData(4096, 1);
      for (let o = 0; o < 4096; ++o) {
        const s = o / 4095, r = me(this.getColorAt(s)), a = o * 4;
        i.data[a] = r.r, i.data[a + 1] = r.g, i.data[a + 2] = r.b, i.data[a + 3] = 255;
      }
      return i;
    }
  }
  const Js = "" + new URL("colored_tiles-DoIWdN30.jpg", import.meta.url).href, Qs = "" + new URL("gold-C0Fcepof.jpg", import.meta.url).href, Bf = 2048;
  function If(e) {
    const t = Math.max(1, Math.floor(e));
    return 2 ** Math.floor(Math.log2(t));
  }
  const _Je = class _Je {
    constructor(t, n) {
      __publicField(this, "snapshotCallback");
      __publicField(this, "snapshotDestWidth");
      __publicField(this, "canvas");
      __publicField(this, "device");
      __publicField(this, "queue");
      __publicField(this, "adapter");
      __publicField(this, "ctx");
      __publicField(this, "format");
      __publicField(this, "mandelbrotNavigator");
      __publicField(this, "rawTexture");
      __publicField(this, "rawArrayView");
      __publicField(this, "rawLayerViews", []);
      __publicField(this, "rawBrushTexture");
      __publicField(this, "rawBrushArrayView");
      __publicField(this, "rawBrushLayerViews", []);
      __publicField(this, "resolvedTexture");
      __publicField(this, "resolvedArrayView");
      __publicField(this, "resolvedLayerViews", []);
      __publicField(this, "uniformBufferMandelbrot");
      __publicField(this, "uniformBufferColor");
      __publicField(this, "uniformBufferBrush");
      __publicField(this, "uniformBufferResolve");
      __publicField(this, "mandelbrotReferenceBuffer");
      __publicField(this, "pipelineBrush");
      __publicField(this, "bindGroupBrush");
      __publicField(this, "pipelineMandelbrot");
      __publicField(this, "bindGroupMandelbrot");
      __publicField(this, "pipelineResolve");
      __publicField(this, "bindGroupResolve");
      __publicField(this, "pipelineColor");
      __publicField(this, "bindGroupColor");
      __publicField(this, "pipelineCount");
      __publicField(this, "counterBuffer");
      __publicField(this, "counterReadBuffer");
      __publicField(this, "counterBindGroup");
      __publicField(this, "uniformBufferCount");
      __publicField(this, "unfinishedPixelCount", -1);
      __publicField(this, "_rafId", null);
      __publicField(this, "_drawFn", null);
      __publicField(this, "fps", 0);
      __publicField(this, "isRendering", false);
      __publicField(this, "gpuFrameTimeMs", 0);
      __publicField(this, "_fpsFrameCount", 0);
      __publicField(this, "_fpsLastTime", 0);
      __publicField(this, "neutralSize", 0);
      __publicField(this, "shaderPassCompute");
      __publicField(this, "shaderPassColor");
      __publicField(this, "width", 0);
      __publicField(this, "height", 0);
      __publicField(this, "antialiasLevel");
      __publicField(this, "palettePeriod");
      __publicField(this, "previousMandelbrot");
      __publicField(this, "previousRenderOptions");
      __publicField(this, "needRender", true);
      __publicField(this, "orbitIncomplete", false);
      __publicField(this, "mandelbrotReference", new Float32Array(1e6));
      __publicField(this, "prevFrameMandelbrot");
      __publicField(this, "clearHistoryNextFrame", false);
      __publicField(this, "cumulativeShiftX", 0);
      __publicField(this, "cumulativeShiftY", 0);
      __publicField(this, "iterationBatchSize", 100);
      __publicField(this, "tileTexture");
      __publicField(this, "tileTextureView");
      __publicField(this, "skyboxTexture");
      __publicField(this, "skyboxTextureView");
      __publicField(this, "paletteTexture");
      __publicField(this, "paletteTextureView");
      __publicField(this, "webcamTexture");
      __publicField(this, "webcamTileTexture");
      __publicField(this, "webcamTextureView");
      __publicField(this, "webcamEnabled", true);
      __publicField(this, "time", 0);
      __publicField(this, "lastUpdateTime", 0);
      __publicField(this, "dprMultiplier", 1);
      this.canvas = t, this.shaderPassCompute = fc, this.shaderPassColor = dc, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.time = 0;
    }
    async initialize(t) {
      if (this.mandelbrotNavigator = t, !navigator.gpu) throw new Error("WebGPU non support\xE9");
      if (this.adapter = await navigator.gpu.requestAdapter(), !this.adapter) throw new Error("Adapter WebGPU introuvable");
      this.device = await this.adapter.requestDevice(), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), _Je._tileTexture || (_Je._tileTexture = await this._loadTexture(Js)), this.tileTexture = await this._loadTexture(Js), this.tileTextureView = this.tileTexture.createView(), _Je._skyboxTexture || (_Je._skyboxTexture = await this._loadTexture(Qs)), this.skyboxTexture = await this._loadTexture(Qs), this.skyboxTextureView = this.skyboxTexture.createView();
      const i = new Ai([]).generateTexture();
      this.paletteTexture = this.device.createTexture({
        size: [
          i.width,
          i.height,
          1
        ],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        label: "Engine PaletteTexture"
      }), this.device.queue.writeTexture({
        texture: this.paletteTexture
      }, i.data, {
        bytesPerRow: i.width * 4
      }, [
        i.width,
        i.height
      ]), this.paletteTextureView = this.paletteTexture.createView(), this.webcamTexture = new df(1920, 1080), this.webcamTileTexture = this.device.createTexture({
        size: [
          1920,
          1080,
          1
        ],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
      }), this.webcamTextureView = this.webcamTileTexture.createView(), this.uniformBufferMandelbrot = this.device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Mandelbrot"
      }), this.uniformBufferColor = this.device.createBuffer({
        size: 80,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Color"
      }), this.uniformBufferBrush = this.device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Brush"
      }), this.uniformBufferResolve = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Resolve"
      }), this.mandelbrotReferenceBuffer = this.device.createBuffer({
        size: 4 * 1e6,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        label: "Engine Mandelbrot Orbit ReferenceStorage Buffer"
      }), this.counterBuffer = this.device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        label: "Engine Counter Storage"
      }), this.counterReadBuffer = this.device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        label: "Engine Counter Readback"
      }), this.uniformBufferCount = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Count"
      }), await this._createPipelines(), this.resize();
    }
    async _createPipelines() {
      const t = this.device.createShaderModule({
        code: pc,
        label: "Engine ShaderModule Brush"
      }), n = this.device.createShaderModule({
        code: this.shaderPassCompute,
        label: "Engine ShaderModule Compute"
      }), i = this.device.createShaderModule({
        code: hc,
        label: "Engine ShaderModule Resolve"
      }), o = this.device.createShaderModule({
        code: this.shaderPassColor,
        label: "Engine ShaderModule Color"
      }), s = this.device.createShaderModule({
        code: gc,
        label: "Engine ShaderModule Count"
      }), r = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "uniform"
            }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
              sampleType: "unfilterable-float",
              viewDimension: "2d-array"
            }
          }
        ],
        label: "Engine BindGroupLayout Brush"
      }), a = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "uniform"
            }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "read-only-storage"
            }
          },
          {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
              sampleType: "unfilterable-float",
              viewDimension: "2d-array"
            }
          }
        ],
        label: "Engine BindGroupLayout Mandelbrot"
      }), l = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "uniform"
            }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
              sampleType: "unfilterable-float",
              viewDimension: "2d-array"
            }
          }
        ],
        label: "Engine BindGroupLayout Resolve"
      }), f = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "uniform"
            }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
              sampleType: "unfilterable-float",
              viewDimension: "2d-array"
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
            texture: {
              sampleType: "float"
            }
          },
          {
            binding: 4,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
              sampleType: "float"
            }
          },
          {
            binding: 5,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
              sampleType: "float"
            }
          }
        ],
        label: "Engine BindGroupLayout Color"
      }), u = Array.from({
        length: _Je.LAYER_COUNT
      }, () => ({
        format: "r32float"
      }));
      this.pipelineBrush = this.device.createRenderPipeline({
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
          targets: u
        },
        primitive: {
          topology: "triangle-list"
        },
        label: "Engine RenderPipeline Brush"
      }), this.pipelineMandelbrot = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            a
          ]
        }),
        vertex: {
          module: n,
          entryPoint: "vs_main"
        },
        fragment: {
          module: n,
          entryPoint: "fs_main",
          targets: u
        },
        primitive: {
          topology: "triangle-list"
        },
        label: "Engine RenderPipeline Mandelbrot"
      }), this.pipelineResolve = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            l
          ]
        }),
        vertex: {
          module: i,
          entryPoint: "vs_main"
        },
        fragment: {
          module: i,
          entryPoint: "fs_main",
          targets: u
        },
        primitive: {
          topology: "triangle-list"
        },
        label: "Engine RenderPipeline Resolve"
      }), this.pipelineColor = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            f
          ]
        }),
        vertex: {
          module: o,
          entryPoint: "vs_main"
        },
        fragment: {
          module: o,
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
        label: "Engine RenderPipeline Color"
      });
      const d = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            texture: {
              sampleType: "unfilterable-float",
              viewDimension: "2d-array"
            }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "storage"
            }
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "uniform"
            }
          }
        ],
        label: "Engine BindGroupLayout Count"
      });
      this.pipelineCount = this.device.createComputePipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            d
          ]
        }),
        compute: {
          module: s,
          entryPoint: "count_unfinished"
        },
        label: "Engine ComputePipeline Count"
      }), this.bindGroupBrush = void 0, this.bindGroupMandelbrot = void 0, this.bindGroupResolve = void 0, this.bindGroupColor = void 0, this.counterBindGroup = void 0;
    }
    resize() {
      var _a2, _b, _c2, _d2, _e2, _f2, _g, _h2;
      const t = (window.devicePixelRatio || 1) * this.dprMultiplier, n = this.canvas.parentElement, i = (n == null ? void 0 : n.clientWidth) || 1, o = (n == null ? void 0 : n.clientHeight) || 1;
      this.width = Math.max(1, Math.round(i * t)), this.height = Math.max(1, Math.round(o * t));
      const s = ((_b = (_a2 = this.device) == null ? void 0 : _a2.limits) == null ? void 0 : _b.maxTextureDimension2D) ?? 8192;
      this.width = Math.min(this.width, s), this.height = Math.min(this.height, s), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = i + "px", this.canvas.style.height = o + "px", this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.neutralSize = Math.ceil(Math.sqrt(this.width * this.width + this.height * this.height));
      const r = this.neutralSize;
      (_d2 = (_c2 = this.rawTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.rawBrushTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2), (_h2 = (_g = this.resolvedTexture) == null ? void 0 : _g.destroy) == null ? void 0 : _h2.call(_g);
      const a = _Je.LAYER_COUNT, l = (v) => {
        const b = this.device.createTexture({
          size: {
            width: r,
            height: r,
            depthOrArrayLayers: a
          },
          format: "r32float",
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
          label: v
        }), _ = b.createView({
          dimension: "2d-array",
          baseArrayLayer: 0,
          arrayLayerCount: a,
          label: v + " ArrayView"
        }), x = [];
        for (let $ = 0; $ < a; $++) x.push(b.createView({
          dimension: "2d",
          baseArrayLayer: $,
          arrayLayerCount: 1,
          label: v + ` Layer${$}`
        }));
        return {
          texture: b,
          arrayView: _,
          layerViews: x
        };
      }, f = l("Engine RawTexture (A)");
      this.rawTexture = f.texture, this.rawArrayView = f.arrayView, this.rawLayerViews = f.layerViews;
      const u = l("Engine RawBrushTexture (B)");
      this.rawBrushTexture = u.texture, this.rawBrushArrayView = u.arrayView, this.rawBrushLayerViews = u.layerViews;
      const d = l("Engine ResolvedTexture");
      if (this.resolvedTexture = d.texture, this.resolvedArrayView = d.arrayView, this.resolvedLayerViews = d.layerViews, this.pipelineBrush) {
        const v = this.pipelineBrush.getBindGroupLayout(0);
        this.bindGroupBrush = this.device.createBindGroup({
          layout: v,
          entries: [
            {
              binding: 0,
              resource: {
                buffer: this.uniformBufferBrush
              }
            },
            {
              binding: 1,
              resource: this.rawArrayView
            }
          ],
          label: "Engine BindGroup Brush"
        });
      }
      if (this.pipelineMandelbrot) {
        const v = this.pipelineMandelbrot.getBindGroupLayout(0);
        this.bindGroupMandelbrot = this.device.createBindGroup({
          layout: v,
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
              resource: this.rawBrushArrayView
            }
          ],
          label: "Engine BindGroup Mandelbrot"
        });
      }
      if (this.pipelineResolve) {
        const v = this.pipelineResolve.getBindGroupLayout(0);
        this.bindGroupResolve = this.device.createBindGroup({
          layout: v,
          entries: [
            {
              binding: 0,
              resource: {
                buffer: this.uniformBufferResolve
              }
            },
            {
              binding: 1,
              resource: this.rawArrayView
            }
          ],
          label: "Engine BindGroup Resolve"
        });
      }
      if (this.pipelineColor) {
        const v = this.pipelineColor.getBindGroupLayout(0), b = [
          {
            binding: 0,
            resource: {
              buffer: this.uniformBufferColor
            }
          },
          {
            binding: 1,
            resource: this.resolvedArrayView
          },
          {
            binding: 2,
            resource: this.tileTextureView
          },
          {
            binding: 3,
            resource: this.skyboxTextureView
          },
          {
            binding: 4,
            resource: this.webcamTextureView
          },
          {
            binding: 5,
            resource: this.paletteTextureView
          }
        ];
        this.bindGroupColor = this.device.createBindGroup({
          layout: v,
          entries: b,
          label: "Engine BindGroup Color"
        });
      }
      if (this.pipelineCount && this.counterBuffer && this.uniformBufferCount) {
        const v = this.pipelineCount.getBindGroupLayout(0);
        this.counterBindGroup = this.device.createBindGroup({
          layout: v,
          entries: [
            {
              binding: 0,
              resource: this.rawArrayView
            },
            {
              binding: 1,
              resource: {
                buffer: this.counterBuffer
              }
            },
            {
              binding: 2,
              resource: {
                buffer: this.uniformBufferCount
              }
            }
          ],
          label: "Engine BindGroup Count"
        });
      }
      this.prevFrameMandelbrot = void 0, this.previousMandelbrot = void 0, this.previousRenderOptions = void 0, this.needRender = true, this.unfinishedPixelCount = -1;
    }
    areObjectsEqual(t, n) {
      return t === void 0 || n === void 0 ? false : JSON.stringify(t) === JSON.stringify(n);
    }
    areColorStopsEqual(t, n) {
      if (t.length !== n.length) return false;
      for (const [i, o] of t.entries()) {
        const s = n[i];
        if (!s || o.color !== s.color || o.position !== s.position) return false;
      }
      return true;
    }
    async update(t, n) {
      var _a2, _b, _c2, _d2;
      const i = performance.now();
      this.lastUpdateTime === 0 && (this.lastUpdateTime = i);
      const o = (i - this.lastUpdateTime) / 1e3;
      this.time += o, this.lastUpdateTime = i, this.needRender = !(this.areObjectsEqual(t, this.previousMandelbrot) && this.areObjectsEqual(n, this.previousRenderOptions)), n.activateWebcam ? (await this.updateWebcamTexture(), this.needRender = true) : (_a2 = this.webcamTexture) == null ? void 0 : _a2.closeWebcam(), n.activateTessellation && (this.needRender = true), n.activateAnimate && (this.needRender = true);
      const s = this.width / Math.max(1, this.height);
      let r = ((_b = this.previousMandelbrot) == null ? void 0 : _b.scale) || 1 / t.scale;
      if (r < 1 && (r = 1 / r), r = Math.sqrt(r) - 1, !this.areColorStopsEqual(n.colorStops, ((_c2 = this.previousRenderOptions) == null ? void 0 : _c2.colorStops) || []) || n.interpolationMode !== ((_d2 = this.previousRenderOptions) == null ? void 0 : _d2.interpolationMode)) {
        const $ = new Ai(n.colorStops, n.interpolationMode).generateTexture();
        this.device.queue.writeTexture({
          texture: this.paletteTexture
        }, $.data, {
          bytesPerRow: $.width * 4
        }, [
          $.width,
          $.height
        ]), this.needRender = true;
      }
      const a = new Float32Array([
        n.palettePeriod,
        n.paletteOffset,
        n.tessellationLevel,
        n.shadingLevel,
        r,
        this.time,
        n.activateTessellation ? 1 : 0,
        n.activateShading ? 1 : 0,
        n.activateWebcam ? 1 : 0,
        n.activatePalette ? 1 : 0,
        n.activateSkybox ? 1 : 0,
        n.activateSmoothness ? 1 : 0,
        n.activateZebra ? 1 : 0,
        s,
        t.angle,
        n.activateAnimate ? 1 : 0,
        t.mu,
        0
      ]);
      if (this.device.queue.writeBuffer(this.uniformBufferColor, 0, a.buffer), !this.needsMoreFrames()) return;
      const l = Math.ceil(t.maxIterations), f = this.mandelbrotNavigator.compute_reference_orbit_chunk(_Je.ORBIT_CHUNK_SIZE, l), u = f.count, d = new Float32Array(ma.buffer, f.ptr, f.count * 4);
      f.offset < l && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, d, 0);
      const v = Math.min(l, u), b = new Float32Array([
        t.dx,
        t.dy,
        t.mu,
        t.scale,
        s,
        t.angle,
        this.iterationBatchSize,
        t.epsilon,
        n.antialiasLevel,
        0,
        v,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, b.buffer), this.orbitIncomplete = u < l;
      const _ = f.offset === 0 && !!this.prevFrameMandelbrot;
      this.clearHistoryNextFrame = false, (!this.prevFrameMandelbrot || _) && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== t.mu && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== t.scale && (this.clearHistoryNextFrame = true), this.previousMandelbrot = structuredClone(t), this.previousRenderOptions = structuredClone(n);
    }
    async render() {
      if (!this.needsMoreFrames() || !this.pipelineBrush || !this.pipelineMandelbrot || !this.pipelineResolve || !this.pipelineColor || !this.bindGroupBrush || !this.bindGroupMandelbrot || !this.bindGroupResolve || !this.bindGroupColor || !this.previousMandelbrot) return;
      const t = this.width / Math.max(1, this.height), n = If(Bf), i = n, o = this.clearHistoryNextFrame ? 1 : 0;
      let s = 0, r = 0;
      if (!this.clearHistoryNextFrame && this.prevFrameMandelbrot) {
        const D = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx, q = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy, oe = this.neutralSize, le = Math.sqrt(t * t + 1);
        s = -(D * oe) / (2 * this.previousMandelbrot.scale * le), r = q * oe / (2 * this.previousMandelbrot.scale * le);
      }
      this.clearHistoryNextFrame ? (this.cumulativeShiftX = 0, this.cumulativeShiftY = 0) : (this.cumulativeShiftX += Math.round(s), this.cumulativeShiftY += Math.round(r));
      const a = (this.cumulativeShiftX % i + i) % i, l = (this.cumulativeShiftY % i + i) % i, f = new Float32Array([
        t,
        this.previousMandelbrot.angle,
        o,
        n,
        i,
        s,
        r,
        this.previousMandelbrot.mu,
        a,
        l
      ]);
      this.device.queue.writeBuffer(this.uniformBufferBrush, 0, f.buffer);
      const u = new Float32Array([
        this.previousMandelbrot.mu,
        a,
        l
      ]);
      this.device.queue.writeBuffer(this.uniformBufferResolve, 0, u.buffer);
      const d = this.device.createCommandEncoder(), v = (D) => D.map((q) => ({
        view: q,
        clearValue: {
          r: 0,
          g: 0,
          b: 0,
          a: 0
        },
        loadOp: "clear",
        storeOp: "store"
      })), b = d.beginRenderPass({
        colorAttachments: v(this.rawBrushLayerViews)
      });
      b.setPipeline(this.pipelineBrush), b.setBindGroup(0, this.bindGroupBrush), b.draw(6, 1, 0, 0), b.end();
      const _ = d.beginRenderPass({
        colorAttachments: v(this.rawLayerViews)
      });
      if (_.setPipeline(this.pipelineMandelbrot), _.setBindGroup(0, this.bindGroupMandelbrot), _.draw(6, 1, 0, 0), _.end(), this.pipelineCount && this.counterBindGroup && this.counterBuffer && this.counterReadBuffer && this.uniformBufferCount) {
        const D = this.previousMandelbrot.mu;
        this.device.queue.writeBuffer(this.uniformBufferCount, 0, new Float32Array([
          D,
          t,
          this.previousMandelbrot.angle
        ])), d.clearBuffer(this.counterBuffer, 0, 4);
        const q = d.beginComputePass();
        q.setPipeline(this.pipelineCount), q.setBindGroup(0, this.counterBindGroup), q.dispatchWorkgroups(Math.ceil(this.neutralSize / 16), Math.ceil(this.neutralSize / 16)), q.end(), d.copyBufferToBuffer(this.counterBuffer, 0, this.counterReadBuffer, 0, 4);
      }
      const x = d.beginRenderPass({
        colorAttachments: v(this.resolvedLayerViews)
      });
      x.setPipeline(this.pipelineResolve), x.setBindGroup(0, this.bindGroupResolve), x.draw(6, 1, 0, 0), x.end();
      const $ = this.ctx.getCurrentTexture().createView(), V = d.beginRenderPass({
        colorAttachments: [
          {
            view: $,
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
      V.setPipeline(this.pipelineColor), V.setBindGroup(0, this.bindGroupColor), V.draw(6, 1, 0, 0), V.end();
      const k = performance.now();
      this.device.queue.submit([
        d.finish()
      ]), await this.device.queue.onSubmittedWorkDone();
      const T = performance.now() - k;
      if (this.gpuFrameTimeMs = T, T > 0) {
        const D = _Je.TARGET_FRAME_MS / T, q = this.iterationBatchSize * D;
        this.iterationBatchSize = Math.round(Math.min(_Je.MAX_BATCH_SIZE, Math.max(_Je.MIN_BATCH_SIZE, this.iterationBatchSize * 0.7 + q * 0.3)));
      }
      await this.counterReadBuffer.mapAsync(GPUMapMode.READ);
      const U = new Uint32Array(this.counterReadBuffer.getMappedRange());
      if (this.unfinishedPixelCount = U[0], this.counterReadBuffer.unmap(), this.prevFrameMandelbrot = {
        ...this.previousMandelbrot
      }, this.snapshotCallback) {
        try {
          const D = this.snapshotDestWidth ?? 256, q = Math.round(D * 9 / 16), oe = this.device.createTexture({
            size: [
              D,
              q,
              1
            ],
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
          });
          {
            const O = this.device.createCommandEncoder(), H = O.beginRenderPass({
              colorAttachments: [
                {
                  view: oe.createView(),
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
            H.setPipeline(this.pipelineColor), H.setBindGroup(0, this.bindGroupColor), H.draw(6, 1, 0, 0), H.end(), this.device.queue.submit([
              O.finish()
            ]);
          }
          const le = (O) => O + 255 & -256, Y = D * 4, W = le(Y), ne = W * q, R = this.device.createBuffer({
            size: ne,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
          });
          {
            const O = this.device.createCommandEncoder();
            O.copyTextureToBuffer({
              texture: oe
            }, {
              buffer: R,
              offset: 0,
              bytesPerRow: W
            }, {
              width: D,
              height: q,
              depthOrArrayLayers: 1
            }), this.device.queue.submit([
              O.finish()
            ]);
          }
          await this.device.queue.onSubmittedWorkDone(), await R.mapAsync(GPUMapMode.READ);
          const B = R.getMappedRange(), L = new Uint8ClampedArray(D * q * 4), P = new Uint8Array(B);
          for (let O = 0; O < q; ++O) for (let H = 0; H < D; ++H) {
            const be = O * W + H * 4, Me = (O * D + H) * 4;
            L[Me + 0] = P[be + 2], L[Me + 1] = P[be + 1], L[Me + 2] = P[be + 0], L[Me + 3] = P[be + 3];
          }
          const A = document.createElement("canvas");
          A.width = D, A.height = q, A.getContext("2d").putImageData(new ImageData(L, D, q), 0, 0), R.unmap(), this.snapshotCallback(A.toDataURL("image/png"));
        } catch {
          this.snapshotCallback("");
        }
        this.snapshotCallback = void 0, this.snapshotDestWidth = void 0;
      }
    }
    destroy() {
      var _a2, _b, _c2, _d2, _e2, _f2, _g, _h2, _i2, _j, _k, _l2, _m, _n2, _o2, _p2, _q, _r2, _s2, _t, _u2, _v, _w, _x, _y, _z, _A;
      this.stopRenderLoop(), (_b = (_a2 = this.rawTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.rawBrushTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.resolvedTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2), (_h2 = (_g = this.mandelbrotReferenceBuffer) == null ? void 0 : _g.destroy) == null ? void 0 : _h2.call(_g), (_j = (_i2 = this.uniformBufferMandelbrot) == null ? void 0 : _i2.destroy) == null ? void 0 : _j.call(_i2), (_l2 = (_k = this.uniformBufferColor) == null ? void 0 : _k.destroy) == null ? void 0 : _l2.call(_k), (_n2 = (_m = this.uniformBufferBrush) == null ? void 0 : _m.destroy) == null ? void 0 : _n2.call(_m), (_p2 = (_o2 = this.uniformBufferResolve) == null ? void 0 : _o2.destroy) == null ? void 0 : _p2.call(_o2), (_r2 = (_q = this.counterBuffer) == null ? void 0 : _q.destroy) == null ? void 0 : _r2.call(_q), (_t = (_s2 = this.counterReadBuffer) == null ? void 0 : _s2.destroy) == null ? void 0 : _t.call(_s2), (_v = (_u2 = this.uniformBufferCount) == null ? void 0 : _u2.destroy) == null ? void 0 : _v.call(_u2), (_w = this.webcamTexture) == null ? void 0 : _w.closeWebcam(), (_y = (_x = this.webcamTileTexture) == null ? void 0 : _x.destroy) == null ? void 0 : _y.call(_x), (_A = (_z = this.paletteTexture) == null ? void 0 : _z.destroy) == null ? void 0 : _A.call(_z);
    }
    needsMoreFrames() {
      return !!(this.needRender || this.unfinishedPixelCount !== 0);
    }
    getIterationBatchSize() {
      return this.iterationBatchSize;
    }
    startRenderLoop(t) {
      this._drawFn = t, this._rafId === null && (this._rafId = requestAnimationFrame(async () => this._loop()));
    }
    stopRenderLoop() {
      this._rafId !== null && (cancelAnimationFrame(this._rafId), this._rafId = null), this._drawFn = null;
    }
    async _loop() {
      if (this._drawFn) {
        const t = this.needsMoreFrames();
        this.isRendering = t, await this._drawFn(), t && this._fpsFrameCount++;
        const n = performance.now();
        this._fpsLastTime === 0 && (this._fpsLastTime = n);
        const i = n - this._fpsLastTime;
        i >= 1e3 && (this.fps = Math.round(this._fpsFrameCount * 1e3 / i), this._fpsFrameCount = 0, this._fpsLastTime = n), this._rafId = requestAnimationFrame(async () => this._loop());
      } else {
        this._rafId = null;
        return;
      }
    }
    async _loadTexture(t) {
      const n = new Image();
      n.src = t;
      try {
        await n.decode();
      } catch (s) {
        throw console.warn("\xC9chec du chargement de la texture : " + t, s), s;
      }
      const i = await createImageBitmap(n), o = this.device.createTexture({
        size: [
          i.width,
          i.height,
          1
        ],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        label: "Engine LoadedTexture " + t
      });
      return this.device.queue.copyExternalImageToTexture({
        source: i
      }, {
        texture: o
      }, [
        i.width,
        i.height
      ]), o;
    }
    async updateWebcamTexture() {
      var _a2, _b;
      await ((_a2 = this.webcamTexture) == null ? void 0 : _a2.openWebcam()), await ((_b = this.webcamTexture) == null ? void 0 : _b.drawWebGPUTexture(this.webcamTileTexture, this.device));
    }
    async getSnapshotPng(t = 256) {
      return await new Promise((n) => {
        this.snapshotCallback = n, this.snapshotDestWidth = t, this.needRender = true;
      });
    }
  };
  __publicField(_Je, "LAYER_COUNT", 7);
  __publicField(_Je, "MIN_BATCH_SIZE", 100);
  __publicField(_Je, "MAX_BATCH_SIZE", 1e4);
  __publicField(_Je, "TARGET_FRAME_MS", 16);
  __publicField(_Je, "ORBIT_CHUNK_SIZE", 100);
  __publicField(_Je, "_tileTexture");
  __publicField(_Je, "_tileTextureView");
  __publicField(_Je, "_skyboxTexture");
  __publicField(_Je, "_skyboxTextureView");
  __publicField(_Je, "_paletteTexture");
  __publicField(_Je, "_paletteTextureView");
  let Je = _Je;
  const Of = Rt({
    __name: "Mandelbrot",
    props: Gi({
      mu: {
        default: 1e6
      },
      epsilon: {
        default: 1e-5
      },
      colorStops: {
        default: () => [
          {
            color: "#0f0130",
            position: 0
          },
          {
            color: "#206bcb",
            position: 0.16
          },
          {
            color: "#ffceb6",
            position: 0.26
          },
          {
            color: "#edffff",
            position: 0.42
          },
          {
            color: "#ffaa00",
            position: 0.6425
          },
          {
            color: "#300200",
            position: 0.8575
          },
          {
            color: "#100000",
            position: 1
          }
        ]
      },
      palettePeriod: {
        default: 1
      },
      paletteOffset: {
        default: 0
      },
      antialiasLevel: {
        default: 1
      },
      tessellationLevel: {
        default: 2
      },
      shadingLevel: {
        default: 1
      },
      activatePalette: {
        type: Boolean,
        default: true
      },
      activateSkybox: {
        type: Boolean,
        default: false
      },
      activateTessellation: {
        type: Boolean,
        default: false
      },
      activateWebcam: {
        type: Boolean,
        default: false
      },
      activateShading: {
        type: Boolean,
        default: true
      },
      activateZebra: {
        type: Boolean,
        default: false
      },
      activateSmoothness: {
        type: Boolean,
        default: true
      },
      activateAnimate: {
        type: Boolean,
        default: false
      },
      dprMultiplier: {
        default: 1
      },
      maxIterationMultiplier: {
        default: 1
      },
      interpolationMode: {
        default: "lab"
      }
    }, {
      cx: {
        default: "-1.5"
      },
      cxModifiers: {},
      cy: {
        default: "0.0"
      },
      cyModifiers: {},
      scale: {
        default: "2.5"
      },
      scaleModifiers: {},
      angle: {
        default: 0
      },
      angleModifiers: {}
    }),
    emits: [
      "update:cx",
      "update:cy",
      "update:scale",
      "update:angle"
    ],
    setup(e, { expose: t }) {
      const n = Q(null);
      let i = null, o = null, s, r = false;
      const a = ot(e, "cx"), l = ot(e, "cy"), f = ot(e, "scale"), u = ot(e, "angle");
      gt(() => [
        a.value,
        l.value,
        f.value,
        u.value
      ], ([x, $, V, k], [T, U, D, q]) => {
        r || s && (!x || !$ || !V || ((x !== T || $ !== U) && s.origin(x, $), V !== D && s.scale(V), k !== q && s.angle(Number(k))));
      }, {
        flush: "sync"
      });
      const d = e;
      gt(() => d.dprMultiplier, (x) => {
        o && (o.dprMultiplier = x, _());
      });
      async function v() {
        if (!o || !s) return;
        const x = s.step();
        if (!x) return;
        const [$, V] = x, [k, T, U, D] = s.get_params();
        r = true, a.value = k, l.value = T, f.value = U, u.value = parseFloat(D), await Fi(), r = false;
        const q = Math.min(Math.max(100, 1e3 * d.maxIterationMultiplier * Math.log2(1 / parseFloat(U))), 1e5);
        await o.update({
          cx: k,
          cy: T,
          dx: parseFloat($),
          dy: parseFloat(V),
          mu: d.mu,
          scale: parseFloat(U),
          angle: parseFloat(D),
          maxIterations: q,
          epsilon: d.epsilon
        }, {
          shadingLevel: d.shadingLevel,
          tessellationLevel: d.tessellationLevel,
          antialiasLevel: d.antialiasLevel,
          palettePeriod: d.palettePeriod,
          paletteOffset: d.paletteOffset,
          colorStops: re(d.colorStops),
          interpolationMode: d.interpolationMode,
          activateShading: d.activateShading,
          activateTessellation: d.activateTessellation,
          activateWebcam: d.activateWebcam,
          activatePalette: d.activatePalette,
          activateSkybox: d.activateSkybox,
          activateSmoothness: d.activateSmoothness,
          activateZebra: d.activateZebra,
          activateAnimate: d.activateAnimate
        }), await o.render();
      }
      async function b() {
        if (n.value) return i = n.value, s = new Co(a.value, l.value, f.value, Number(u.value)), s.origin(a.value, l.value), s.scale(f.value), s.angle(Number(u.value)), o = new Je(i, {
          activatePalette: d.activatePalette,
          activateSkybox: d.activateSkybox,
          shadingLevel: d.shadingLevel,
          tessellationLevel: d.tessellationLevel,
          antialiasLevel: d.antialiasLevel,
          palettePeriod: d.palettePeriod,
          paletteOffset: d.paletteOffset,
          colorStops: d.colorStops,
          interpolationMode: d.interpolationMode,
          activateShading: d.activateShading,
          activateTessellation: d.activateTessellation,
          activateWebcam: d.activateWebcam,
          activateSmoothness: d.activateSmoothness,
          activateZebra: d.activateZebra,
          activateAnimate: d.activateAnimate
        }), o.initialize(s);
      }
      async function _() {
        if (!n.value || !o) return;
        const x = n.value.getBoundingClientRect();
        n.value.width = x.width, n.value.height = x.height, o.resize();
      }
      return zt(async () => {
        await b(), window.addEventListener("resize", _), await _(), o && o.startRenderLoop(v);
      }), Mn(() => {
        o == null ? void 0 : o.stopRenderLoop(), window.removeEventListener("resize", _);
      }), t({
        getCanvas: () => n.value,
        getEngine: () => o,
        getNavigator: () => s,
        translate: (x, $) => s == null ? void 0 : s.translate(x, $),
        translateDirect: (x, $) => s == null ? void 0 : s.translate_direct(x, $),
        rotate: (x) => s == null ? void 0 : s.rotate(x),
        angle: (x) => s == null ? void 0 : s.angle(x),
        zoom: (x) => s == null ? void 0 : s.zoom(x),
        step: () => s == null ? void 0 : s.step(),
        getParams: () => s == null ? void 0 : s.get_params(),
        drawOnce: async () => v(),
        resize: async () => _(),
        initialize: async () => b()
      }), (x, $) => (ae(), ue("canvas", {
        ref_key: "canvasRef",
        ref: n
      }, null, 512));
    }
  }), Nf = {
    class: "mobile-nav-controls"
  }, Uf = {
    key: 0,
    class: "directional-controls"
  }, Ff = Rt({
    __name: "MobileNavigationControls",
    props: Gi({
      mandelbrotRef: {}
    }, {
      expanded: {
        type: Boolean,
        default: false
      },
      expandedModifiers: {}
    }),
    emits: [
      "update:expanded"
    ],
    setup(e) {
      const t = e, n = ot(e, "expanded"), i = Q(null);
      let o = null;
      const s = () => {
        n.value = !n.value, n.value || a();
      }, r = (b) => {
        b.preventDefault(), b.stopPropagation(), s();
      }, a = () => {
        i.value = null, o !== null && (clearInterval(o), o = null);
      }, l = (b) => {
        i.value = b;
        const _ = 0.1, x = () => {
          if (t.mandelbrotRef) switch (b) {
            case "north":
              t.mandelbrotRef.translate(0, _);
              break;
            case "south":
              t.mandelbrotRef.translate(0, -_);
              break;
            case "west":
              t.mandelbrotRef.translate(-_, 0);
              break;
            case "east":
              t.mandelbrotRef.translate(_, 0);
              break;
          }
        };
        x(), o = window.setInterval(x, 16);
      }, f = (b) => {
        i.value = `rotate-${b}`;
        const _ = 0.025, x = () => {
          t.mandelbrotRef && (b === "left" ? t.mandelbrotRef.rotate(_) : t.mandelbrotRef.rotate(-_));
        };
        x(), o = window.setInterval(x, 16);
      }, u = (b) => {
        i.value = `zoom-${b}`;
        const _ = 0.6, x = () => {
          t.mandelbrotRef && (b === "in" ? t.mandelbrotRef.zoom(_) : t.mandelbrotRef.zoom(1 / _));
        };
        x(), o = window.setInterval(x, 16);
      }, d = (b, _) => {
        b.preventDefault(), _();
      }, v = (b) => {
        b.preventDefault(), a();
      };
      return (b, _) => (ae(), ue("div", Nf, [
        c("button", {
          class: ce([
            "nav-button compass-button",
            {
              active: n.value
            }
          ]),
          onClick: s,
          onTouchend: r,
          "aria-label": "Toggle navigation"
        }, [
          ..._[16] || (_[16] = [
            ca('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-51897cb8><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-51897cb8></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-51897cb8></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-51897cb8></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-51897cb8></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-51897cb8></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-51897cb8></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-51897cb8>N</text></svg>', 1)
          ])
        ], 34),
        Te(Uu, {
          name: "fade"
        }, {
          default: Ar(() => [
            n.value ? (ae(), ue("div", Uf, [
              c("button", {
                class: ce([
                  "nav-button direction-button north",
                  {
                    active: i.value === "north"
                  }
                ]),
                onTouchstart: _[0] || (_[0] = (x) => d(x, () => l("north"))),
                onTouchend: v,
                onMousedown: _[1] || (_[1] = (x) => l("north")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move North"
              }, [
                ..._[17] || (_[17] = [
                  c("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    c("path", {
                      d: "M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              c("button", {
                class: ce([
                  "nav-button direction-button south",
                  {
                    active: i.value === "south"
                  }
                ]),
                onTouchstart: _[2] || (_[2] = (x) => d(x, () => l("south"))),
                onTouchend: v,
                onMousedown: _[3] || (_[3] = (x) => l("south")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move South"
              }, [
                ..._[18] || (_[18] = [
                  c("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    c("path", {
                      d: "M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              c("button", {
                class: ce([
                  "nav-button direction-button west",
                  {
                    active: i.value === "west"
                  }
                ]),
                onTouchstart: _[4] || (_[4] = (x) => d(x, () => l("west"))),
                onTouchend: v,
                onMousedown: _[5] || (_[5] = (x) => l("west")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move West"
              }, [
                ..._[19] || (_[19] = [
                  c("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    c("path", {
                      d: "M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              c("button", {
                class: ce([
                  "nav-button direction-button east",
                  {
                    active: i.value === "east"
                  }
                ]),
                onTouchstart: _[6] || (_[6] = (x) => d(x, () => l("east"))),
                onTouchend: v,
                onMousedown: _[7] || (_[7] = (x) => l("east")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move East"
              }, [
                ..._[20] || (_[20] = [
                  c("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    c("path", {
                      d: "M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              c("button", {
                class: ce([
                  "nav-button corner-button rotate-left",
                  {
                    active: i.value === "rotate-left"
                  }
                ]),
                onTouchstart: _[8] || (_[8] = (x) => d(x, () => f("left"))),
                onTouchend: v,
                onMousedown: _[9] || (_[9] = (x) => f("left")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Rotate Left"
              }, [
                ..._[21] || (_[21] = [
                  c("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    c("path", {
                      d: "M16 8 A6 6 0 1 0 8 16",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round"
                    }),
                    c("path", {
                      d: "M5 16 L8 16 L8 13",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    })
                  ], -1)
                ])
              ], 34),
              c("button", {
                class: ce([
                  "nav-button corner-button rotate-right",
                  {
                    active: i.value === "rotate-right"
                  }
                ]),
                onTouchstart: _[10] || (_[10] = (x) => d(x, () => f("right"))),
                onTouchend: v,
                onMousedown: _[11] || (_[11] = (x) => f("right")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Rotate Right"
              }, [
                ..._[22] || (_[22] = [
                  c("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    c("path", {
                      d: "M8 8 A6 6 0 1 1 16 16",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round"
                    }),
                    c("path", {
                      d: "M19 16 L16 16 L16 13",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    })
                  ], -1)
                ])
              ], 34),
              c("button", {
                class: ce([
                  "nav-button corner-button zoom-out",
                  {
                    active: i.value === "zoom-out"
                  }
                ]),
                onTouchstart: _[12] || (_[12] = (x) => d(x, () => u("out"))),
                onTouchend: v,
                onMousedown: _[13] || (_[13] = (x) => u("out")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Zoom Out"
              }, [
                ..._[23] || (_[23] = [
                  c("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    c("circle", {
                      cx: "11",
                      cy: "11",
                      r: "7",
                      stroke: "currentColor",
                      "stroke-width": "2"
                    }),
                    c("path", {
                      d: "M18 18 L22 22",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    c("path", {
                      d: "M8 11 L14 11",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    })
                  ], -1)
                ])
              ], 34),
              c("button", {
                class: ce([
                  "nav-button corner-button zoom-in",
                  {
                    active: i.value === "zoom-in"
                  }
                ]),
                onTouchstart: _[14] || (_[14] = (x) => d(x, () => u("in"))),
                onTouchend: v,
                onMousedown: _[15] || (_[15] = (x) => u("in")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Zoom In"
              }, [
                ..._[24] || (_[24] = [
                  c("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    c("circle", {
                      cx: "11",
                      cy: "11",
                      r: "7",
                      stroke: "currentColor",
                      "stroke-width": "2"
                    }),
                    c("path", {
                      d: "M18 18 L22 22",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    c("path", {
                      d: "M11 8 L11 14",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    c("path", {
                      d: "M8 11 L14 11",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    })
                  ], -1)
                ])
              ], 34)
            ])) : $t("", true)
          ]),
          _: 1
        })
      ]));
    }
  }), En = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [i, o] of t) n[i] = o;
    return n;
  }, Df = En(Ff, [
    [
      "__scopeId",
      "data-v-51897cb8"
    ]
  ]), $f = {
    style: {
      position: "relative",
      width: "100%",
      height: "100%"
    }
  }, ci = 0.01, er = 0.025, Gf = Rt({
    __name: "MandelbrotController",
    props: Gi({
      mu: {},
      epsilon: {},
      colorStops: {},
      antialiasLevel: {},
      tessellationLevel: {},
      shadingLevel: {},
      palettePeriod: {},
      paletteOffset: {},
      activatePalette: {
        type: Boolean
      },
      activateSkybox: {
        type: Boolean
      },
      activateTessellation: {
        type: Boolean
      },
      activateWebcam: {
        type: Boolean
      },
      activateShading: {
        type: Boolean
      },
      activateZebra: {
        type: Boolean
      },
      activateSmoothness: {
        type: Boolean
      },
      activateAnimate: {
        type: Boolean
      },
      dprMultiplier: {},
      maxIterationMultiplier: {},
      interpolationMode: {}
    }, {
      cx: {},
      cxModifiers: {},
      cy: {},
      cyModifiers: {},
      scale: {},
      scaleModifiers: {},
      angle: {},
      angleModifiers: {},
      mobileNavExpanded: {
        type: Boolean,
        default: false
      },
      mobileNavExpandedModifiers: {}
    }),
    emits: [
      "update:cx",
      "update:cy",
      "update:scale",
      "update:angle",
      "update:mobileNavExpanded"
    ],
    setup(e, { expose: t }) {
      const n = ot(e, "cx"), i = ot(e, "cy"), o = ot(e, "scale"), s = ot(e, "angle"), r = ot(e, "mobileNavExpanded"), a = e, l = Q(null), f = {};
      t({
        getCanvas: T,
        getEngine: () => {
          var _a2;
          return ((_a2 = l.value) == null ? void 0 : _a2.getEngine()) ?? null;
        }
      });
      let u = false, d = false, v = 0, b = 0, _ = 0, x = 0, $ = 0, V = false, k = null;
      function T() {
        var _a2;
        return ((_a2 = l.value) == null ? void 0 : _a2.getCanvas()) ?? null;
      }
      function U(P) {
        const A = T();
        if (!A) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const O = A.getBoundingClientRect();
        return {
          x: P.clientX - O.left,
          y: P.clientY - O.top,
          width: O.width,
          height: O.height
        };
      }
      function D(P) {
        var _a2, _b, _c2;
        const A = (_b = (_a2 = P.target) == null ? void 0 : _a2.tagName) == null ? void 0 : _b.toLowerCase();
        A === "input" || A === "textarea" || A === "select" || ((_c2 = P.target) == null ? void 0 : _c2.isContentEditable) || (f[P.code] = true);
      }
      function q(P) {
        f[P.code] = false;
      }
      function oe(P) {
        var _a2, _b;
        P.preventDefault();
        const A = 0.6;
        P.deltaY < 0 ? (_a2 = l.value) == null ? void 0 : _a2.zoom(A) : (_b = l.value) == null ? void 0 : _b.zoom(1 / A);
      }
      function le(P) {
        if (P.button === 2) d = true;
        else {
          u = true;
          const A = U(P);
          v = A.x, b = A.y;
        }
      }
      function Y(P) {
        var _a2, _b;
        const A = U(P);
        if (d) {
          const Ee = T();
          if (!Ee) return;
          const _t = Ee.getBoundingClientRect(), Wt = _t.width / 2, Bt = _t.height / 2, xt = A.x, It = A.y, tt = Math.atan2(It - Bt, xt - Wt);
          (_a2 = l.value) == null ? void 0 : _a2.angle(tt);
          return;
        }
        if (!u) return;
        const O = A.width, H = A.height, be = O / H, Me = (A.x - v) / O * 2, Re = (A.y - b) / H * 2;
        (_b = l.value) == null ? void 0 : _b.translateDirect(-Me * be, Re), v = A.x, b = A.y;
      }
      function W(P) {
        P.button === 2 ? d = false : u = false;
      }
      function ne(P) {
        var _a2;
        const A = T();
        if (A) {
          if (P.touches.length === 1) {
            u = true;
            const O = P.touches[0], H = A.getBoundingClientRect();
            v = O.clientX - H.left, b = O.clientY - H.top;
          } else if (P.touches.length === 2) {
            u = false, V = true;
            const [O, H] = P.touches;
            _ = Math.hypot(H.clientX - O.clientX, H.clientY - O.clientY), x = Math.atan2(H.clientY - O.clientY, H.clientX - O.clientX);
            const be = (_a2 = l.value) == null ? void 0 : _a2.getParams();
            $ = be ? parseFloat(be[3]) : 0;
          }
        }
      }
      function R(P) {
        var _a2, _b, _c2;
        const A = T();
        if (A) {
          if (u && P.touches.length === 1) {
            const O = P.touches[0], H = A.getBoundingClientRect(), be = O.clientX - H.left, Me = O.clientY - H.top, Re = H.width, Ee = H.height, _t = Re / Ee, Wt = (be - v) / Re * 2, Bt = (Me - b) / Ee * 2;
            (_a2 = l.value) == null ? void 0 : _a2.translateDirect(-Wt * _t, Bt), v = be, b = Me;
          } else if (V && P.touches.length === 2) {
            const [O, H] = P.touches, be = Math.hypot(H.clientX - O.clientX, H.clientY - O.clientY), Me = Math.atan2(H.clientY - O.clientY, H.clientX - O.clientX), Re = _ / be;
            (_b = l.value) == null ? void 0 : _b.zoom(Re);
            const Ee = Me - x;
            (_c2 = l.value) == null ? void 0 : _c2.angle($ + Ee);
          }
        }
      }
      function B(P) {
        P.touches.length === 0 && (u = false, V = false);
      }
      function L() {
        var _a2, _b, _c2, _d2, _e2, _f2, _g, _h2;
        f.KeyW && ((_a2 = l.value) == null ? void 0 : _a2.translate(0, ci)), f.KeyS && ((_b = l.value) == null ? void 0 : _b.translate(0, -ci)), f.KeyA && ((_c2 = l.value) == null ? void 0 : _c2.translate(-ci, 0)), f.KeyD && ((_d2 = l.value) == null ? void 0 : _d2.translate(ci, 0)), f.KeyQ && ((_e2 = l.value) == null ? void 0 : _e2.rotate(er)), f.KeyE && ((_f2 = l.value) == null ? void 0 : _f2.rotate(-er));
        const P = 0.6;
        f.KeyR && ((_g = l.value) == null ? void 0 : _g.zoom(P)), f.KeyF && ((_h2 = l.value) == null ? void 0 : _h2.zoom(1 / P)), k = window.setTimeout(L, 16);
      }
      return zt(async () => {
        const P = T();
        P && (window.addEventListener("keydown", D), window.addEventListener("keyup", q), P.addEventListener("wheel", oe, {
          passive: false
        }), P.addEventListener("mousedown", le), P.addEventListener("contextmenu", (A) => A.preventDefault()), window.addEventListener("mousemove", Y), window.addEventListener("mouseup", W), P.addEventListener("touchstart", ne, {
          passive: false
        }), P.addEventListener("touchmove", R, {
          passive: false
        }), P.addEventListener("touchend", B, {
          passive: false
        }), L());
      }), Mn(() => {
        k !== null && clearTimeout(k);
        const P = T();
        window.removeEventListener("keydown", D), window.removeEventListener("keyup", q), window.removeEventListener("mousemove", Y), window.removeEventListener("mouseup", W), P && (P.removeEventListener("wheel", oe), P.removeEventListener("mousedown", le), P.removeEventListener("contextmenu", (A) => A.preventDefault()), P.removeEventListener("touchstart", ne), P.removeEventListener("touchmove", R), P.removeEventListener("touchend", B));
      }), (P, A) => (ae(), ue("div", $f, [
        Te(Of, {
          ref_key: "mandelbrotRef",
          ref: l,
          scale: o.value,
          "onUpdate:scale": A[0] || (A[0] = (O) => o.value = O),
          angle: s.value,
          "onUpdate:angle": A[1] || (A[1] = (O) => s.value = O),
          cx: n.value,
          "onUpdate:cx": A[2] || (A[2] = (O) => n.value = O),
          cy: i.value,
          "onUpdate:cy": A[3] || (A[3] = (O) => i.value = O),
          mu: a.mu,
          epsilon: a.epsilon,
          antialiasLevel: a.antialiasLevel,
          shadingLevel: a.shadingLevel,
          palettePeriod: a.palettePeriod,
          tessellationLevel: a.tessellationLevel,
          colorStops: a.colorStops,
          activatePalette: a.activatePalette,
          activateSkybox: a.activateSkybox,
          activateTessellation: a.activateTessellation,
          activateWebcam: a.activateWebcam,
          activateShading: a.activateShading,
          activateZebra: a.activateZebra,
          activateSmoothness: a.activateSmoothness,
          activateAnimate: a.activateAnimate,
          paletteOffset: a.paletteOffset,
          dprMultiplier: a.dprMultiplier,
          maxIterationMultiplier: a.maxIterationMultiplier,
          interpolationMode: a.interpolationMode
        }, null, 8, [
          "scale",
          "angle",
          "cx",
          "cy",
          "mu",
          "epsilon",
          "antialiasLevel",
          "shadingLevel",
          "palettePeriod",
          "tessellationLevel",
          "colorStops",
          "activatePalette",
          "activateSkybox",
          "activateTessellation",
          "activateWebcam",
          "activateShading",
          "activateZebra",
          "activateSmoothness",
          "activateAnimate",
          "paletteOffset",
          "dprMultiplier",
          "maxIterationMultiplier",
          "interpolationMode"
        ]),
        Te(Df, {
          "mandelbrot-ref": l.value,
          expanded: r.value,
          "onUpdate:expanded": A[4] || (A[4] = (O) => r.value = O)
        }, null, 8, [
          "mandelbrot-ref",
          "expanded"
        ])
      ]));
    }
  }), Vf = En(Gf, [
    [
      "__scopeId",
      "data-v-f9ccb1b3"
    ]
  ]), Hf = [
    "fill",
    "stroke"
  ], Wf = Rt({
    __name: "GlissiereHandle",
    props: {
      stop: {}
    },
    emits: [
      "update:position",
      "select"
    ],
    setup(e, { emit: t }) {
      const n = e, i = t, o = Q(null);
      function s(f) {
        let u = f.replace("#", "");
        u.length === 3 && (u = u.split("").map((_) => _ + _).join(""));
        const d = parseInt(u.substring(0, 2), 16) / 255, v = parseInt(u.substring(2, 4), 16) / 255, b = parseInt(u.substring(4, 6), 16) / 255;
        return 0.299 * d + 0.587 * v + 0.114 * b;
      }
      const r = Ae(() => s(n.stop.color) > 0.5 ? "#222" : "#fff");
      function a(f) {
        f.preventDefault(), i("select");
        const u = f.clientX, d = n.stop.position, v = o.value;
        if (!v) return;
        const _ = v.parentElement.getBoundingClientRect();
        function x(V) {
          const k = V.clientX - u;
          let T = d + k / _.width;
          T = Math.max(0, Math.min(1, T)), i("update:position", T);
        }
        function $() {
          window.removeEventListener("mousemove", x), window.removeEventListener("mouseup", $);
        }
        window.addEventListener("mousemove", x), window.addEventListener("mouseup", $);
      }
      function l(f) {
        f.preventDefault(), i("select");
        const u = f.touches[0];
        if (!u) return;
        const d = u.clientX, v = n.stop.position, b = o.value;
        if (!b) return;
        const x = b.parentElement.getBoundingClientRect();
        function $(k) {
          const T = k.touches[0];
          if (!T) return;
          const U = T.clientX - d;
          let D = v + U / x.width;
          D = Math.max(0, Math.min(1, D)), i("update:position", D);
        }
        function V() {
          window.removeEventListener("touchmove", $), window.removeEventListener("touchend", V), window.removeEventListener("touchcancel", V);
        }
        window.addEventListener("touchmove", $, {
          passive: false
        }), window.addEventListener("touchend", V), window.addEventListener("touchcancel", V);
      }
      return (f, u) => (ae(), ue("svg", {
        ref_key: "svgRef",
        ref: o,
        style: Qn({
          position: "absolute",
          left: n.stop.position * 100 + "%",
          top: 0,
          height: "100%",
          width: "32px",
          transform: "translateX(-50%)",
          zIndex: 1,
          cursor: "ew-resize",
          pointerEvents: "auto",
          background: "transparent"
        }),
        viewBox: "0 0 22 64",
        onMousedown: a,
        onTouchstart: l
      }, [
        c("rect", {
          x: "6",
          y: "0",
          width: "12",
          height: "64",
          rx: "8",
          fill: n.stop.color,
          stroke: r.value,
          "stroke-width": "2"
        }, null, 8, Hf)
      ], 36));
    }
  }), jf = {
    class: "palette-editor"
  }, qf = {
    class: "handles-overlay"
  }, Yf = {
    class: "color-picker-row"
  }, Kf = [
    "value"
  ], Xf = {
    class: "color-hex-label"
  }, Zf = 12, Jf = Rt({
    __name: "PaletteEditor",
    props: {
      colorStops: {},
      interpolationMode: {
        default: "lab"
      }
    },
    emits: [
      "update:colorStops"
    ],
    setup(e, { emit: t }) {
      const n = e, i = t, o = Q(null), s = Ae(() => new Ai(n.colorStops, n.interpolationMode).generateTexture());
      gt(s, (u) => {
        if (!o.value || !u) return;
        const d = o.value.getContext("2d");
        if (!d) return;
        d.clearRect(0, 0, 4096, 32);
        const v = document.createElement("canvas");
        v.width = u.width, v.height = u.height, v.getContext("2d").putImageData(u, 0, 0), d.drawImage(v, 0, 0, 4096, 1, 0, 0, 4096, 32);
      }), zt(() => {
        Fi(() => {
          const u = s.value;
          if (!o.value || !u) return;
          const d = o.value.getContext("2d");
          if (!d) return;
          d.clearRect(0, 0, 4096, 32);
          const v = document.createElement("canvas");
          v.width = u.width, v.height = u.height, v.getContext("2d").putImageData(u, 0, 0), d.drawImage(v, 0, 0, 4096, 1, 0, 0, 4096, 32);
        });
      });
      function r(u) {
        var _a2;
        if (n.colorStops.length >= Zf) return;
        const d = o.value;
        if (!d) return;
        const v = d.getBoundingClientRect();
        let b = (u.clientX - v.left) / v.width;
        b = Math.max(0, Math.min(1, b));
        const _ = a.value !== null && ((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff";
        n.colorStops.push({
          color: _,
          position: b
        }), i("update:colorStops", n.colorStops), a.value = n.colorStops.length - 1;
      }
      const a = Q(0);
      function l(u) {
        a.value = u;
      }
      const f = Ae({
        get() {
          var _a2;
          if (a.value === null || n.colorStops.length === 0) return "#ffffff";
          const u = ((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff";
          try {
            return me(u).formatHex();
          } catch {
            return "#ffffff";
          }
        },
        set(u) {
          a.value !== null && n.colorStops[a.value] && (n.colorStops[a.value] = {
            ...n.colorStops[a.value],
            color: u
          }, i("update:colorStops", n.colorStops));
        }
      });
      return (u, d) => (ae(), ue("div", jf, [
        c("div", {
          class: "canvas-row",
          style: {
            position: "relative"
          },
          onDblclick: r
        }, [
          c("canvas", {
            ref_key: "canvasRef",
            ref: o,
            width: "4096",
            height: "32",
            style: {
              width: "100%",
              "max-width": "100%",
              height: "32px",
              "border-radius": "2px",
              "box-shadow": "0 1px 4px #0001"
            }
          }, null, 512),
          c("div", qf, [
            (ae(true), ue(ze, null, bn(e.colorStops, (v, b) => (ae(), la(Wf, {
              key: "handle-" + b,
              stop: v,
              index: b,
              "onUpdate:position": (_) => e.colorStops[b].position = _,
              onSelect: (_) => l(b)
            }, null, 8, [
              "stop",
              "index",
              "onUpdate:position",
              "onSelect"
            ]))), 128))
          ])
        ], 32),
        c("div", Yf, [
          c("input", {
            type: "color",
            value: f.value,
            onInput: d[0] || (d[0] = (v) => f.value = v.target.value),
            class: "native-color-input"
          }, null, 40, Kf),
          c("span", Xf, te(f.value), 1)
        ])
      ]));
    }
  }), Qf = En(Jf, [
    [
      "__scopeId",
      "data-v-4e7e074b"
    ]
  ]), ed = {
    style: {
      color: "black !important"
    }
  }, td = {
    key: 0
  }, nd = {
    class: "mb-3",
    style: {
      "font-family": "monospace",
      "word-break": "break-all",
      "white-space": "pre-line"
    }
  }, id = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, od = {
    style: {
      "font-family": "monospace",
      "min-width": "7.5em",
      display: "inline-block"
    }
  }, sd = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, rd = {
    style: {
      "font-family": "monospace",
      "min-width": "5em",
      display: "inline-block"
    }
  }, ad = {
    key: 1
  }, ld = {
    class: "mb-3"
  }, ud = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, cd = {
    style: {
      display: "flex",
      "align-items": "center",
      "min-height": "36px"
    }
  }, fd = [
    "src"
  ], dd = {
    style: {
      flex: "1 1 auto",
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis"
    }
  }, pd = {
    class: "dropdown-menu",
    id: "dropdown-menu-presets",
    role: "menu",
    style: {
      width: "100%"
    }
  }, hd = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, gd = [
    "onClick"
  ], vd = [
    "src"
  ], md = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.11em"
    }
  }, bd = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, _d = {
    class: "control is-expanded"
  }, xd = {
    class: "control"
  }, yd = [
    "disabled"
  ], wd = {
    class: "field is-grouped"
  }, Sd = {
    class: "control"
  }, Td = [
    "disabled"
  ], Md = {
    class: "control"
  }, Cd = {
    key: 2
  }, Ed = {
    class: "mb-3"
  }, Pd = {
    class: "mb-3"
  }, Ld = {
    class: "buttons toggle-buttons"
  }, kd = [
    "onClick"
  ], Rd = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, Ad = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, zd = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, Bd = [
    "value"
  ], Id = {
    style: {
      "font-family": "monospace",
      "min-width": "3.5em",
      "text-align": "right"
    }
  }, Od = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, Nd = [
    "value"
  ], Ud = {
    style: {
      "font-family": "monospace",
      "min-width": "3.5em",
      "text-align": "right"
    }
  }, Fd = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, Dd = [
    "value"
  ], $d = {
    style: {
      "font-family": "monospace",
      "min-width": "3.5em",
      "text-align": "right"
    }
  }, Gd = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, Vd = [
    "value"
  ], Hd = {
    style: {
      "font-family": "monospace",
      "min-width": "3.5em",
      "text-align": "right"
    }
  }, Wd = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, jd = [
    "value"
  ], qd = {
    style: {
      "font-family": "monospace",
      "min-width": "3.5em",
      "text-align": "right"
    }
  }, Yd = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, Kd = [
    "value"
  ], Xd = {
    style: {
      "font-family": "monospace",
      "min-width": "3.5em",
      "text-align": "right"
    }
  }, Zd = {
    class: "mb-3"
  }, Jd = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, Qd = {
    style: {
      display: "flex",
      "align-items": "center",
      "flex-direction": "column",
      gap: "0.5em",
      padding: "0.4em 0"
    }
  }, ep = [
    "src"
  ], tp = {
    style: {
      width: "100%",
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      gap: "0.3em"
    }
  }, np = {
    style: {
      flex: "1 1 auto",
      "text-align": "center"
    }
  }, ip = {
    class: "dropdown-menu",
    id: "dropdown-menu-palettes",
    role: "menu",
    style: {
      width: "100%"
    }
  }, op = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, sp = [
    "onClick"
  ], rp = [
    "src"
  ], ap = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.05em",
      "text-align": "center"
    }
  }, lp = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, up = {
    class: "control is-expanded"
  }, cp = {
    class: "control"
  }, fp = [
    "disabled"
  ], dp = {
    class: "field is-grouped"
  }, pp = {
    class: "control"
  }, hp = [
    "disabled"
  ], gp = {
    class: "control"
  }, vp = {
    key: 3
  }, mp = {
    class: "field"
  }, bp = {
    class: "control",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.5em"
    }
  }, _p = {
    class: "field"
  }, xp = {
    class: "control"
  }, yp = {
    class: "field"
  }, wp = {
    class: "control"
  }, Sp = {
    class: "field"
  }, Tp = {
    class: "buttons toggle-buttons"
  }, Mp = {
    class: "field"
  }, Cp = {
    class: "label"
  }, Ep = {
    class: "control"
  }, Pp = {
    class: "field"
  }, Lp = {
    class: "label"
  }, kp = {
    class: "control"
  }, fi = "mandelbrot_presets", di = "mandelbrot_palettes", Rp = Rt({
    __name: "Settings",
    props: Gi({
      engine: {},
      suspendShortcuts: {
        type: Function
      },
      activeTab: {}
    }, {
      modelValue: {
        default: {
          angle: 0,
          cx: "0.0",
          cy: "0.0",
          scale: "2.5",
          mu: 1e6,
          epsilon: 1e-5,
          colorStops: [],
          palettePeriod: 1,
          paletteOffset: 0,
          antialiasLevel: 1,
          tessellationLevel: 2,
          shadingLevel: 1,
          activatePalette: true,
          activateSkybox: false,
          activateTessellation: false,
          activateWebcam: false,
          activateShading: true,
          activateZebra: false,
          activateSmoothness: true,
          activateAnimate: false,
          dprMultiplier: 1,
          maxIterationMultiplier: 1,
          interpolationMode: "lab"
        }
      },
      modelModifiers: {}
    }),
    emits: [
      "update:modelValue"
    ],
    setup(e) {
      const t = e, n = ot(e, "modelValue"), i = Ae(() => ((n.value.angle * 180 / Math.PI % 360 + 360) % 360).toFixed(2)), o = Ae({
        get: () => (n.value.angle * 180 / Math.PI % 360 + 360) % 360,
        set: (S) => {
          n.value.angle = S % 360 * Math.PI / 180;
        }
      }), s = Ae({
        get: () => (Math.log10(n.value.palettePeriod || 0.01) + 2) / 5,
        set: (S) => {
          n.value.palettePeriod = Number((10 ** (S * 5 - 2)).toPrecision(6));
        }
      }), r = Ae({
        get: () => {
          const S = Number(n.value.scale), h = S > 0 ? -Math.log2(S) : 126;
          return isFinite(h) ? Math.min(Math.max(Math.round(h), 1), 126) : 1;
        },
        set: (S) => {
          const h = Math.min(Math.max(Math.round(S), 1), 126);
          n.value.scale = (2 ** -h).toPrecision(10);
        }
      });
      function a(S, h) {
        const [m, G] = S.split(".");
        return G ? m + "." + G.slice(0, h) : m;
      }
      function l(S, h = "lab") {
        const m = document.createElement("canvas");
        m.width = 320, m.height = 40;
        const G = m.getContext("2d");
        if (!G) return "";
        if (S.length === 0) return G.fillStyle = "#000", G.fillRect(0, 0, m.width, m.height), m.toDataURL("image/png");
        const ve = new Ai(S, h).generateTexture(), Se = document.createElement("canvas");
        Se.width = ve.width, Se.height = 1;
        const Oe = Se.getContext("2d");
        return Oe ? (Oe.putImageData(ve, 0, 0), G.drawImage(Se, 0, 0, m.width, m.height), m.toDataURL("image/png")) : "";
      }
      const f = Q(null), u = Q(""), d = Q([]), v = Q(""), b = Q([]), _ = Q(""), x = Q(false);
      function $() {
        const S = u.value.trim();
        if (S && window.confirm(`Supprimer le preset "${S}" ? Cette action est irr\xE9versible.`)) {
          const h = d.value.findIndex((m) => m.name === S);
          h >= 0 && (d.value.splice(h, 1), localStorage.setItem(fi, JSON.stringify(d.value)), k.value = "", u.value = "");
        }
      }
      async function V() {
        t.engine && (f.value = await t.engine.getSnapshotPng(256));
      }
      const k = Q(""), T = Q(false), U = Ae(() => d.value.find((S) => S.name === k.value)), D = Ae(() => {
        var _a2;
        return (_a2 = U.value) == null ? void 0 : _a2.thumbnail;
      });
      function q(S) {
        L(S.name), T.value = false;
      }
      async function oe() {
        if (!u.value.trim()) return;
        let S, h = (/* @__PURE__ */ new Date()).toISOString();
        try {
          t.engine && (S = await t.engine.getSnapshotPng(256));
        } catch {
        }
        const m = {
          name: u.value.trim(),
          value: n.value,
          thumbnail: S,
          date: h
        }, G = d.value.findIndex((ye) => ye.name === m.name);
        G >= 0 ? d.value[G] = m : d.value.push(m), localStorage.setItem(fi, JSON.stringify(d.value)), u.value = "";
      }
      function le() {
        const S = localStorage.getItem(fi);
        if (S) try {
          d.value = JSON.parse(S);
        } catch {
        }
      }
      function Y() {
        const S = localStorage.getItem(di);
        if (S) try {
          b.value = JSON.parse(S);
        } catch {
        }
      }
      async function W() {
        if (!v.value.trim()) return;
        let S, h = (/* @__PURE__ */ new Date()).toISOString();
        try {
          S = l(n.value.colorStops, n.value.interpolationMode);
        } catch {
        }
        const m = {
          name: v.value.trim(),
          colorStops: structuredClone(re(n.value.colorStops)),
          thumbnail: S,
          date: h
        }, G = b.value.findIndex((ye) => ye.name === m.name);
        G >= 0 ? b.value[G] = m : b.value.push(m), localStorage.setItem(di, JSON.stringify(b.value)), v.value = "";
      }
      function ne(S) {
        const h = b.value.find((m) => m.name === S);
        h && (_.value = S, v.value = h.name, n.value.colorStops = structuredClone(re(h.colorStops)));
      }
      function R(S) {
        ne(S.name), x.value = false;
      }
      function B() {
        const S = v.value.trim();
        if (S && window.confirm(`Supprimer la palette "${S}" ? Cette action est irr\xE9versible.`)) {
          const h = b.value.findIndex((m) => m.name === S);
          h >= 0 && (b.value.splice(h, 1), localStorage.setItem(di, JSON.stringify(b.value)), _.value = "", v.value = "");
        }
      }
      function L(S) {
        const h = d.value.find((m) => m.name === S);
        h && (k.value = S, u.value = h.name, n.value = structuredClone(re(h.value)));
      }
      const P = Ae({
        get: () => Math.log10(n.value.mu ?? 1),
        set: (S) => {
          n.value.mu = Math.pow(10, S);
        }
      }), A = Ae({
        get: () => Math.log10(n.value.epsilon ?? 1e-8),
        set: (S) => {
          n.value.epsilon = Math.pow(10, S);
        }
      }), O = Ae({
        get: () => Math.log10(n.value.maxIterationMultiplier ?? 1),
        set: (S) => {
          n.value.maxIterationMultiplier = Number(Math.pow(10, S).toPrecision(3));
        }
      });
      zt(() => {
        le(), Y();
      });
      const H = Ae(() => b.value.find((S) => S.name === _.value)), be = Ae(() => {
        var _a2;
        return (_a2 = H.value) == null ? void 0 : _a2.thumbnail;
      });
      gt([
        () => t.activeTab,
        () => t.engine
      ], async ([S]) => {
        S === "navigation" && await V();
      }, {
        immediate: true
      });
      function Me() {
        const S = JSON.stringify(d.value, null, 2), h = new Blob([
          S
        ], {
          type: "application/json"
        }), m = URL.createObjectURL(h), G = document.createElement("a");
        G.href = m, G.download = "mandelbrot-presets.json", G.click(), URL.revokeObjectURL(m);
      }
      const Re = Q(null);
      function Ee() {
        var _a2;
        (_a2 = Re.value) == null ? void 0 : _a2.click();
      }
      function _t(S) {
        var _a2;
        const h = S.target, m = (_a2 = h.files) == null ? void 0 : _a2[0];
        if (!m) return;
        const G = new FileReader();
        G.onload = () => {
          try {
            const ye = JSON.parse(G.result);
            if (Array.isArray(ye)) {
              for (const ve of ye) {
                if (!ve.name || !ve.value) continue;
                const Se = d.value.findIndex((Oe) => Oe.name === ve.name);
                Se >= 0 ? d.value[Se] = ve : d.value.push(ve);
              }
              localStorage.setItem(fi, JSON.stringify(d.value));
            }
          } catch {
            window.alert("Format de fichier invalide.");
          }
        }, G.readAsText(m), h.value = "";
      }
      function Wt() {
        const S = JSON.stringify(b.value, null, 2), h = new Blob([
          S
        ], {
          type: "application/json"
        }), m = URL.createObjectURL(h), G = document.createElement("a");
        G.href = m, G.download = "mandelbrot-palettes.json", G.click(), URL.revokeObjectURL(m);
      }
      const Bt = Q(null);
      function xt() {
        var _a2;
        (_a2 = Bt.value) == null ? void 0 : _a2.click();
      }
      function It(S) {
        var _a2;
        const h = S.target, m = (_a2 = h.files) == null ? void 0 : _a2[0];
        if (!m) return;
        const G = new FileReader();
        G.onload = () => {
          try {
            const ye = JSON.parse(G.result);
            if (Array.isArray(ye)) {
              for (const ve of ye) {
                if (!ve.name || !ve.colorStops) continue;
                const Se = b.value.findIndex((Oe) => Oe.name === ve.name);
                Se >= 0 ? b.value[Se] = ve : b.value.push(ve);
              }
              localStorage.setItem(di, JSON.stringify(b.value));
            }
          } catch {
            window.alert("Format de fichier invalide.");
          }
        }, G.readAsText(m), h.value = "";
      }
      const tt = Q(null), Ot = Q(0), nt = Q(0), an = Q(0), p = Q(0), g = Q(0), y = Q(0);
      function M() {
        tt.value === null && (tt.value = structuredClone(re(n.value.colorStops)));
      }
      function w() {
        tt.value = null, Ot.value = 0, nt.value = 0, an.value = 0, p.value = 0, g.value = 0, y.value = 0;
      }
      function C(S) {
        M(), Ot.value = S, z();
      }
      function N(S) {
        M(), nt.value = S, z();
      }
      function I(S) {
        M(), an.value = S, z();
      }
      function z() {
        tt.value && (n.value.colorStops = tt.value.map((S) => {
          const h = me(S.color);
          if (h == null) return {
            ...S
          };
          const m = Pe(h);
          let G = (m.l || 0) + an.value;
          G = Math.max(0, Math.min(150, G));
          let ye = (m.c || 0) + nt.value;
          ye = Math.max(0, ye);
          let ve = (m.h || 0) + Ot.value;
          ve = (ve % 360 + 360) % 360;
          const Se = me(Pe(G, ye, ve)), Oe = Xn(Se);
          let qt = (Oe.h || 0) + y.value;
          qt = (qt % 360 + 360) % 360;
          let Pn = (Oe.s || 0) + p.value / 100;
          Pn = Math.max(0, Math.min(1, Pn));
          let qi = (Oe.l || 0) + g.value / 100;
          qi = Math.max(0, Math.min(1, qi));
          const Ba = Xn(qt, Pn, qi);
          return {
            color: me(Ba).formatHex(),
            position: S.position
          };
        }));
      }
      function E(S) {
        M(), p.value = S, z();
      }
      function K(S) {
        M(), g.value = S, z();
      }
      function F(S) {
        M(), y.value = S, z();
      }
      const j = [
        {
          key: "lab",
          label: "Lab"
        },
        {
          key: "rgb",
          label: "RGB"
        },
        {
          key: "hcl",
          label: "HCL"
        },
        {
          key: "hsl",
          label: "HSL"
        },
        {
          key: "cubehelix",
          label: "Cubehelix"
        }
      ];
      function Z() {
        n.value.colorStops.length !== 0 && (n.value.colorStops = n.value.colorStops.map((S) => ({
          color: S.color,
          position: 1 - S.position
        })).sort((S, h) => S.position - h.position), w());
      }
      function se() {
        if (n.value.colorStops.length === 0) return;
        const S = n.value.colorStops.map((m) => ({
          color: m.color,
          position: m.position * 0.5
        })), h = n.value.colorStops.map((m) => ({
          color: m.color,
          position: 0.5 + m.position * 0.5
        }));
        n.value.colorStops = [
          ...S,
          ...h
        ].sort((m, G) => m.position - G.position), w();
      }
      function ge() {
        if (n.value.colorStops.length === 0) return;
        const S = n.value.colorStops.map((m) => ({
          color: m.color,
          position: m.position * 0.5
        })), h = n.value.colorStops.map((m) => ({
          color: m.color,
          position: 1 - m.position * 0.5
        }));
        n.value.colorStops = [
          ...S,
          ...h
        ].sort((m, G) => m.position - G.position), w();
      }
      function fe() {
        const S = n.value.colorStops.slice().sort((m, G) => m.position - G.position);
        if (S.length < 2) return;
        const h = 1 / (S.length - 1);
        n.value.colorStops = S.map((m, G) => ({
          color: m.color,
          position: Number((G * h).toFixed(6))
        })), w();
      }
      function Be() {
        var _a2;
        const S = Pe(me(((_a2 = n.value.colorStops[0]) == null ? void 0 : _a2.color) || "#3273dc")), h = S.h || 0, m = S.c || 50, G = [], ye = 5;
        for (let ve = 0; ve < ye; ve++) {
          const Se = ve / (ye - 1), Oe = 15 + Se * 85, qt = Pe(Oe, m * (0.5 + 0.5 * Math.sin(Se * Math.PI)), h);
          G.push({
            color: me(qt).formatHex(),
            position: Se
          });
        }
        n.value.colorStops = G, w();
      }
      function Ie() {
        var _a2;
        const S = Pe(me(((_a2 = n.value.colorStops[0]) == null ? void 0 : _a2.color) || "#3273dc")), h = S.h || 0, m = (h + 180) % 360, G = S.c || 60;
        n.value.colorStops = [
          {
            color: me(Pe(25, G, h)).formatHex(),
            position: 0
          },
          {
            color: me(Pe(60, G, h)).formatHex(),
            position: 0.25
          },
          {
            color: me(Pe(90, G * 0.3, h)).formatHex(),
            position: 0.5
          },
          {
            color: me(Pe(60, G, m)).formatHex(),
            position: 0.75
          },
          {
            color: me(Pe(25, G, m)).formatHex(),
            position: 1
          }
        ], w();
      }
      function Ke() {
        var _a2;
        const S = Pe(me(((_a2 = n.value.colorStops[0]) == null ? void 0 : _a2.color) || "#3273dc")), h = S.h || 0, m = S.c || 60, G = 60, ye = 6, ve = [];
        for (let Se = 0; Se < ye; Se++) {
          const Oe = Se / (ye - 1), qt = ((h - G / 2 + Oe * G) % 360 + 360) % 360, Pn = 30 + Oe * 55;
          ve.push({
            color: me(Pe(Pn, m, qt)).formatHex(),
            position: Oe
          });
        }
        n.value.colorStops = ve, w();
      }
      function Xe() {
        var _a2;
        const S = Pe(me(((_a2 = n.value.colorStops[0]) == null ? void 0 : _a2.color) || "#3273dc")), h = S.h || 0, m = S.c || 60;
        n.value.colorStops = [
          {
            color: me(Pe(30, m, h)).formatHex(),
            position: 0
          },
          {
            color: me(Pe(70, m, h)).formatHex(),
            position: 0.17
          },
          {
            color: me(Pe(70, m, (h + 120) % 360)).formatHex(),
            position: 0.33
          },
          {
            color: me(Pe(90, m * 0.3, (h + 180) % 360)).formatHex(),
            position: 0.5
          },
          {
            color: me(Pe(70, m, (h + 240) % 360)).formatHex(),
            position: 0.67
          },
          {
            color: me(Pe(30, m, (h + 240) % 360)).formatHex(),
            position: 1
          }
        ], w();
      }
      function jt() {
        const S = 4 + Math.floor(Math.random() * 4), h = [];
        for (let m = 0; m < S; m++) {
          const G = m / (S - 1), ye = Math.random() * 360, ve = 30 + Math.random() * 80, Se = 15 + Math.random() * 80;
          h.push({
            color: me(Pe(Se, ve, ye)).formatHex(),
            position: G
          });
        }
        n.value.colorStops = h, w();
      }
      return (S, h) => {
        var _a2;
        return ae(), ue("div", ed, [
          e.activeTab === "navigation" ? (ae(), ue("div", td, [
            c("div", nd, [
              c("span", null, [
                h[32] || (h[32] = we("Cx: ", -1)),
                c("span", null, te(a(n.value.cx, 38)), 1)
              ]),
              h[34] || (h[34] = c("br", null, null, -1)),
              c("span", null, [
                h[33] || (h[33] = we("Cy: ", -1)),
                c("span", null, te(a(n.value.cy, 38)), 1)
              ])
            ]),
            c("div", id, [
              c("span", null, [
                h[35] || (h[35] = we("\xC9chelle\xA0: ", -1)),
                c("span", od, te(Number(n.value.scale).toExponential(2)), 1)
              ]),
              $e(c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "1 1 110px",
                  "min-width": "85px",
                  margin: "0 0.6em 0 0.6em"
                },
                type: "range",
                min: "1",
                max: "126",
                step: "1",
                "onUpdate:modelValue": h[0] || (h[0] = (m) => r.value = m)
              }, null, 512), [
                [
                  it,
                  r.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            c("div", sd, [
              c("span", null, [
                h[36] || (h[36] = we("Angle\xA0: ", -1)),
                c("span", rd, te(i.value) + "\xB0", 1)
              ]),
              $e(c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "1 1 110px",
                  "min-width": "85px",
                  margin: "0 0.6em 0 0.6em"
                },
                type: "range",
                min: "0",
                max: "359",
                step: "1",
                "onUpdate:modelValue": h[1] || (h[1] = (m) => o.value = m)
              }, null, 512), [
                [
                  it,
                  o.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ])
          ])) : e.activeTab === "presets" ? (ae(), ue("div", ad, [
            c("div", ld, [
              h[38] || (h[38] = c("label", {
                class: "label"
              }, "Presets enregistr\xE9s", -1)),
              c("div", {
                class: ce([
                  "dropdown",
                  {
                    "is-active": T.value
                  }
                ]),
                style: {
                  width: "100%"
                }
              }, [
                c("div", ud, [
                  c("button", {
                    class: "button is-fullwidth",
                    onClick: h[2] || (h[2] = (m) => T.value = !T.value),
                    "aria-haspopup": "true",
                    "aria-controls": "dropdown-menu-presets",
                    type: "button"
                  }, [
                    c("span", cd, [
                      D.value ? (ae(), ue("img", {
                        key: 0,
                        src: D.value,
                        alt: "miniature",
                        style: {
                          height: "32px",
                          width: "56px",
                          "object-fit": "cover",
                          "margin-right": "8px",
                          "border-radius": "3px",
                          background: "#888"
                        }
                      }, null, 8, fd)) : $t("", true),
                      c("span", dd, te(u.value || "Choisir un preset..."), 1),
                      h[37] || (h[37] = c("span", {
                        class: "icon is-small",
                        style: {
                          "margin-left": "5px"
                        }
                      }, [
                        c("i", {
                          class: "fas fa-angle-down",
                          "aria-hidden": "true"
                        })
                      ], -1))
                    ])
                  ])
                ]),
                c("div", pd, [
                  c("div", hd, [
                    (ae(true), ue(ze, null, bn(d.value, (m) => (ae(), ue("a", {
                      key: m.name,
                      class: ce([
                        "dropdown-item",
                        {
                          "is-active": k.value === m.name
                        }
                      ]),
                      onClick: Mo((G) => q(m), [
                        "prevent"
                      ]),
                      style: {
                        display: "flex",
                        "align-items": "center",
                        gap: "0.75em"
                      }
                    }, [
                      m.thumbnail ? (ae(), ue("img", {
                        key: 0,
                        src: m.thumbnail,
                        alt: "miniature",
                        style: {
                          height: "63px",
                          width: "112px",
                          "object-fit": "cover",
                          "border-radius": "4px",
                          background: "#aaa",
                          "margin-right": "0.75em",
                          "box-shadow": "0 1px 6px rgba(0,0,0,0.16)"
                        }
                      }, null, 8, vd)) : $t("", true),
                      c("span", md, te(m.name), 1)
                    ], 10, gd))), 128))
                  ])
                ])
              ], 2),
              c("div", bd, [
                c("div", _d, [
                  $e(c("input", {
                    class: "input",
                    "onUpdate:modelValue": h[3] || (h[3] = (m) => u.value = m),
                    type: "text",
                    placeholder: "Nom...",
                    onFocus: h[4] || (h[4] = (m) => t.suspendShortcuts && t.suspendShortcuts(true)),
                    onBlur: h[5] || (h[5] = (m) => t.suspendShortcuts && t.suspendShortcuts(false))
                  }, null, 544), [
                    [
                      it,
                      u.value
                    ]
                  ])
                ]),
                c("div", {
                  class: "control"
                }, [
                  c("button", {
                    class: "button is-link is-small",
                    onClick: oe
                  }, "Enregistrer")
                ]),
                c("div", xd, [
                  c("button", {
                    class: "button is-danger is-small",
                    onClick: $,
                    disabled: !u.value
                  }, "Supprimer", 8, yd)
                ])
              ]),
              h[39] || (h[39] = c("hr", {
                class: "section-sep"
              }, null, -1)),
              h[40] || (h[40] = c("label", {
                class: "label"
              }, "Import / Export", -1)),
              c("div", wd, [
                c("div", Sd, [
                  c("button", {
                    class: "button is-info is-small",
                    onClick: Me,
                    disabled: d.value.length === 0
                  }, " Exporter ", 8, Td)
                ]),
                c("div", Md, [
                  c("button", {
                    class: "button is-warning is-small",
                    onClick: Ee
                  }, " Importer "),
                  c("input", {
                    ref_key: "presetFileInput",
                    ref: Re,
                    type: "file",
                    accept: ".json",
                    style: {
                      display: "none"
                    },
                    onChange: _t
                  }, null, 544)
                ])
              ])
            ])
          ])) : e.activeTab === "palettes" ? (ae(), ue("div", Cd, [
            c("div", Ed, [
              Te(Qf, {
                "color-stops": n.value.colorStops,
                "interpolation-mode": n.value.interpolationMode
              }, null, 8, [
                "color-stops",
                "interpolation-mode"
              ])
            ]),
            c("div", Pd, [
              h[41] || (h[41] = c("label", {
                class: "label"
              }, "Interpolation", -1)),
              c("div", Ld, [
                (ae(), ue(ze, null, bn(j, (m) => c("button", {
                  key: m.key,
                  class: ce([
                    "button is-small",
                    n.value.interpolationMode === m.key ? "is-link" : "is-light"
                  ]),
                  onClick: (G) => n.value.interpolationMode = m.key
                }, te(m.label), 11, kd)), 64))
              ])
            ]),
            h[57] || (h[57] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            c("div", {
              class: "mb-3"
            }, [
              h[42] || (h[42] = c("label", {
                class: "label"
              }, "Outils palette", -1)),
              c("div", {
                class: "buttons",
                style: {
                  "flex-wrap": "wrap",
                  gap: "0.4em"
                }
              }, [
                c("button", {
                  class: "button is-small is-light",
                  onClick: Z,
                  title: "Inverser l'ordre des couleurs"
                }, "Inverser"),
                c("button", {
                  class: "button is-small is-light",
                  onClick: se,
                  title: "Comprimer et r\xE9p\xE9ter 2x"
                }, "Dupliquer"),
                c("button", {
                  class: "button is-small is-light",
                  onClick: ge,
                  title: "Effet miroir (palindrome)"
                }, "Miroir"),
                c("button", {
                  class: "button is-small is-light",
                  onClick: fe,
                  title: "R\xE9partir les stops uniform\xE9ment"
                }, "Distribuer")
              ])
            ]),
            h[58] || (h[58] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            c("div", {
              class: "mb-3"
            }, [
              h[43] || (h[43] = c("label", {
                class: "label"
              }, "G\xE9n\xE9rer une palette", -1)),
              h[44] || (h[44] = c("p", {
                style: {
                  "font-size": "0.85em",
                  color: "#555",
                  "margin-bottom": "0.5em"
                }
              }, "Bas\xE9 sur la 1\xE8re couleur actuelle", -1)),
              c("div", {
                class: "buttons",
                style: {
                  "flex-wrap": "wrap",
                  gap: "0.4em"
                }
              }, [
                c("button", {
                  class: "button is-small is-info is-light",
                  onClick: Be
                }, "Monochromatique"),
                c("button", {
                  class: "button is-small is-info is-light",
                  onClick: Ie
                }, "Compl\xE9mentaire"),
                c("button", {
                  class: "button is-small is-info is-light",
                  onClick: Ke
                }, "Analogique"),
                c("button", {
                  class: "button is-small is-info is-light",
                  onClick: Xe
                }, "Triadique"),
                c("button", {
                  class: "button is-small is-warning is-light",
                  onClick: jt
                }, "Al\xE9atoire")
              ])
            ]),
            h[59] || (h[59] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            c("div", Rd, [
              h[45] || (h[45] = c("label", {
                style: {
                  "white-space": "nowrap"
                }
              }, "P\xE9riode :", -1)),
              $e(c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "2 1 90px",
                  "min-width": "75px",
                  margin: "0 0.5em"
                },
                type: "range",
                min: "0",
                max: "1",
                step: "0.001",
                "onUpdate:modelValue": h[6] || (h[6] = (m) => s.value = m)
              }, null, 512), [
                [
                  it,
                  s.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            c("div", Ad, [
              h[46] || (h[46] = c("label", {
                style: {
                  "white-space": "nowrap"
                }
              }, "D\xE9calage :", -1)),
              $e(c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "2 1 90px",
                  "min-width": "75px",
                  margin: "0 0.5em"
                },
                type: "range",
                min: "0",
                max: "1",
                step: "0.001",
                "onUpdate:modelValue": h[7] || (h[7] = (m) => n.value.paletteOffset = m)
              }, null, 512), [
                [
                  it,
                  n.value.paletteOffset,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            h[60] || (h[60] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            h[61] || (h[61] = c("label", {
              class: "label"
            }, "Ajustement global", -1)),
            h[62] || (h[62] = c("p", {
              style: {
                "font-size": "0.82em",
                color: "#666",
                "margin-bottom": "0.4em",
                "font-weight": "600"
              }
            }, "LCH (perceptuel)", -1)),
            c("div", zd, [
              h[47] || (h[47] = c("label", {
                style: {
                  "white-space": "nowrap",
                  "min-width": "5.5em"
                }
              }, "Teinte :", -1)),
              c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "2 1 90px",
                  "min-width": "75px",
                  margin: "0 0.5em"
                },
                type: "range",
                min: "-180",
                max: "180",
                step: "1",
                value: Ot.value,
                onInput: h[8] || (h[8] = (m) => C(Number(m.target.value)))
              }, null, 40, Bd),
              c("span", Id, te(Ot.value) + "\xB0", 1)
            ]),
            c("div", Od, [
              h[48] || (h[48] = c("label", {
                style: {
                  "white-space": "nowrap",
                  "min-width": "5.5em"
                }
              }, "Chroma :", -1)),
              c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "2 1 90px",
                  "min-width": "75px",
                  margin: "0 0.5em"
                },
                type: "range",
                min: "-100",
                max: "100",
                step: "1",
                value: nt.value,
                onInput: h[9] || (h[9] = (m) => N(Number(m.target.value)))
              }, null, 40, Nd),
              c("span", Ud, te(nt.value), 1)
            ]),
            c("div", Fd, [
              h[49] || (h[49] = c("label", {
                style: {
                  "white-space": "nowrap",
                  "min-width": "5.5em"
                }
              }, "Clart\xE9 :", -1)),
              c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "2 1 90px",
                  "min-width": "75px",
                  margin: "0 0.5em"
                },
                type: "range",
                min: "-100",
                max: "100",
                step: "1",
                value: an.value,
                onInput: h[10] || (h[10] = (m) => I(Number(m.target.value)))
              }, null, 40, Dd),
              c("span", $d, te(an.value), 1)
            ]),
            h[63] || (h[63] = c("p", {
              style: {
                "font-size": "0.82em",
                color: "#666",
                "margin-bottom": "0.4em",
                "margin-top": "0.6em",
                "font-weight": "600"
              }
            }, "HSL (classique)", -1)),
            c("div", Gd, [
              h[50] || (h[50] = c("label", {
                style: {
                  "white-space": "nowrap",
                  "min-width": "5.5em"
                }
              }, "Teinte :", -1)),
              c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "2 1 90px",
                  "min-width": "75px",
                  margin: "0 0.5em"
                },
                type: "range",
                min: "-180",
                max: "180",
                step: "1",
                value: y.value,
                onInput: h[11] || (h[11] = (m) => F(Number(m.target.value)))
              }, null, 40, Vd),
              c("span", Hd, te(y.value) + "\xB0", 1)
            ]),
            c("div", Wd, [
              h[51] || (h[51] = c("label", {
                style: {
                  "white-space": "nowrap",
                  "min-width": "5.5em"
                }
              }, "Saturation :", -1)),
              c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "2 1 90px",
                  "min-width": "75px",
                  margin: "0 0.5em"
                },
                type: "range",
                min: "-100",
                max: "100",
                step: "1",
                value: p.value,
                onInput: h[12] || (h[12] = (m) => E(Number(m.target.value)))
              }, null, 40, jd),
              c("span", qd, te(p.value), 1)
            ]),
            c("div", Yd, [
              h[52] || (h[52] = c("label", {
                style: {
                  "white-space": "nowrap",
                  "min-width": "5.5em"
                }
              }, "Luminosit\xE9 :", -1)),
              c("input", {
                class: "slider is-fullwidth",
                style: {
                  flex: "2 1 90px",
                  "min-width": "75px",
                  margin: "0 0.5em"
                },
                type: "range",
                min: "-100",
                max: "100",
                step: "1",
                value: g.value,
                onInput: h[13] || (h[13] = (m) => K(Number(m.target.value)))
              }, null, 40, Kd),
              c("span", Xd, te(g.value), 1)
            ]),
            c("div", {
              class: "mb-3"
            }, [
              c("button", {
                class: "button is-small is-light",
                onClick: w
              }, "R\xE9initialiser")
            ]),
            h[64] || (h[64] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            c("div", Zd, [
              h[54] || (h[54] = c("label", {
                class: "label"
              }, "Palettes enregistr\xE9es", -1)),
              c("div", {
                class: ce([
                  "dropdown",
                  {
                    "is-active": x.value
                  }
                ]),
                style: {
                  width: "100%"
                }
              }, [
                c("div", Jd, [
                  c("button", {
                    class: "button is-fullwidth",
                    onClick: h[14] || (h[14] = (m) => x.value = !x.value),
                    "aria-haspopup": "true",
                    "aria-controls": "dropdown-menu-palettes",
                    type: "button"
                  }, [
                    c("span", Qd, [
                      be.value ? (ae(), ue("img", {
                        key: 0,
                        src: be.value,
                        alt: "miniature",
                        style: {
                          height: "24px",
                          width: "100%",
                          "max-width": "280px",
                          "object-fit": "cover",
                          "border-radius": "3px",
                          background: "#888",
                          "box-shadow": "0 1px 3px rgba(0,0,0,0.2)"
                        }
                      }, null, 8, ep)) : $t("", true),
                      c("span", tp, [
                        c("span", np, te(v.value || "Choisir une palette..."), 1),
                        h[53] || (h[53] = c("span", {
                          class: "icon is-small"
                        }, [
                          c("i", {
                            class: "fas fa-angle-down",
                            "aria-hidden": "true"
                          })
                        ], -1))
                      ])
                    ])
                  ])
                ]),
                c("div", ip, [
                  c("div", op, [
                    (ae(true), ue(ze, null, bn(b.value, (m) => (ae(), ue("a", {
                      key: m.name,
                      class: ce([
                        "dropdown-item",
                        {
                          "is-active": _.value === m.name
                        }
                      ]),
                      onClick: Mo((G) => R(m), [
                        "prevent"
                      ]),
                      style: {
                        display: "flex",
                        "flex-direction": "column",
                        gap: "0.5em",
                        padding: "0.75em"
                      }
                    }, [
                      m.thumbnail ? (ae(), ue("img", {
                        key: 0,
                        src: m.thumbnail,
                        alt: "miniature",
                        style: {
                          height: "32px",
                          width: "100%",
                          "object-fit": "cover",
                          "border-radius": "4px",
                          background: "#aaa",
                          "box-shadow": "0 1px 6px rgba(0,0,0,0.16)"
                        }
                      }, null, 8, rp)) : $t("", true),
                      c("span", ap, te(m.name), 1)
                    ], 10, sp))), 128))
                  ])
                ])
              ], 2),
              c("div", lp, [
                c("div", up, [
                  $e(c("input", {
                    class: "input",
                    "onUpdate:modelValue": h[15] || (h[15] = (m) => v.value = m),
                    type: "text",
                    placeholder: "Nom...",
                    onFocus: h[16] || (h[16] = (m) => t.suspendShortcuts && t.suspendShortcuts(true)),
                    onBlur: h[17] || (h[17] = (m) => t.suspendShortcuts && t.suspendShortcuts(false))
                  }, null, 544), [
                    [
                      it,
                      v.value
                    ]
                  ])
                ]),
                c("div", {
                  class: "control"
                }, [
                  c("button", {
                    class: "button is-link is-small",
                    onClick: W
                  }, "Enregistrer")
                ]),
                c("div", cp, [
                  c("button", {
                    class: "button is-danger is-small",
                    onClick: B,
                    disabled: !v.value
                  }, "Supprimer", 8, fp)
                ])
              ]),
              h[55] || (h[55] = c("hr", {
                class: "section-sep"
              }, null, -1)),
              h[56] || (h[56] = c("label", {
                class: "label"
              }, "Import / Export", -1)),
              c("div", dp, [
                c("div", pp, [
                  c("button", {
                    class: "button is-info is-small",
                    onClick: Wt,
                    disabled: b.value.length === 0
                  }, " Exporter ", 8, hp)
                ]),
                c("div", gp, [
                  c("button", {
                    class: "button is-warning is-small",
                    onClick: xt
                  }, " Importer "),
                  c("input", {
                    ref_key: "paletteFileInput",
                    ref: Bt,
                    type: "file",
                    accept: ".json",
                    style: {
                      display: "none"
                    },
                    onChange: It
                  }, null, 544)
                ])
              ])
            ])
          ])) : e.activeTab === "performance" ? (ae(), ue("div", vp, [
            c("div", mp, [
              h[65] || (h[65] = c("label", {
                class: "label"
              }, "Mu", -1)),
              c("div", bp, [
                $e(c("input", {
                  class: "slider is-fullwidth",
                  style: {
                    flex: "1"
                  },
                  type: "range",
                  min: "0",
                  max: "5",
                  step: "0.01",
                  "onUpdate:modelValue": h[18] || (h[18] = (m) => P.value = m)
                }, null, 512), [
                  [
                    it,
                    P.value
                  ]
                ]),
                c("button", {
                  class: "button is-small is-light",
                  onClick: h[19] || (h[19] = (m) => n.value.mu = 4),
                  title: "Mu = 4"
                }, "4")
              ]),
              c("span", null, te((n.value.mu ?? 1).toFixed(1)), 1)
            ]),
            c("div", _p, [
              h[66] || (h[66] = c("label", {
                class: "label"
              }, "Epsilon", -1)),
              c("div", xp, [
                $e(c("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "-12",
                  max: "0",
                  step: "0.01",
                  "onUpdate:modelValue": h[20] || (h[20] = (m) => A.value = m)
                }, null, 512), [
                  [
                    it,
                    A.value
                  ]
                ])
              ]),
              c("span", null, te((n.value.epsilon ?? 1e-8).toExponential(2)), 1)
            ]),
            c("div", yp, [
              h[67] || (h[67] = c("label", {
                class: "label"
              }, "Tessellation", -1)),
              c("div", wp, [
                $e(c("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "0.1",
                  max: "10",
                  step: "0.1",
                  "onUpdate:modelValue": h[21] || (h[21] = (m) => n.value.tessellationLevel = m)
                }, null, 512), [
                  [
                    it,
                    n.value.tessellationLevel,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              c("span", null, te(n.value.tessellationLevel), 1)
            ]),
            c("div", Sp, [
              h[68] || (h[68] = c("label", {
                class: "label"
              }, "Options de rendu", -1)),
              c("div", Tp, [
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateShading ? "is-link" : "is-light"
                  ]),
                  onClick: h[22] || (h[22] = (m) => n.value.activateShading = !n.value.activateShading)
                }, " Shading ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activatePalette ? "is-link" : "is-light"
                  ]),
                  onClick: h[23] || (h[23] = (m) => n.value.activatePalette = !n.value.activatePalette)
                }, " Palette ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateSmoothness ? "is-link" : "is-light"
                  ]),
                  onClick: h[24] || (h[24] = (m) => n.value.activateSmoothness = !n.value.activateSmoothness)
                }, " Smoothness ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateTessellation ? "is-link" : "is-light"
                  ]),
                  onClick: h[25] || (h[25] = (m) => n.value.activateTessellation = !n.value.activateTessellation)
                }, " Tessellation ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateSkybox ? "is-link" : "is-light"
                  ]),
                  onClick: h[26] || (h[26] = (m) => n.value.activateSkybox = !n.value.activateSkybox)
                }, " Skybox ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateWebcam ? "is-link" : "is-light"
                  ]),
                  onClick: h[27] || (h[27] = (m) => n.value.activateWebcam = !n.value.activateWebcam)
                }, " Webcam ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateZebra ? "is-link" : "is-light"
                  ]),
                  onClick: h[28] || (h[28] = (m) => n.value.activateZebra = !n.value.activateZebra)
                }, " Zebra ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateAnimate ? "is-link" : "is-light"
                  ]),
                  onClick: h[29] || (h[29] = (m) => n.value.activateAnimate = !n.value.activateAnimate)
                }, " Animate ", 2)
              ])
            ]),
            c("div", Mp, [
              c("label", Cp, "R\xE9solution (DPR \xD7 " + te(((_a2 = n.value.dprMultiplier) == null ? void 0 : _a2.toFixed(3)) ?? "1.000") + ")", 1),
              c("div", Ep, [
                $e(c("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "0.125",
                  max: "2",
                  step: "0.125",
                  "onUpdate:modelValue": h[30] || (h[30] = (m) => n.value.dprMultiplier = m)
                }, null, 512), [
                  [
                    it,
                    n.value.dprMultiplier,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ])
            ]),
            c("div", Pp, [
              c("label", Lp, "It\xE9rations (\xD7 " + te((n.value.maxIterationMultiplier ?? 1).toPrecision(3)) + ")", 1),
              c("div", kp, [
                $e(c("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "-2",
                  max: "1",
                  step: "0.01",
                  "onUpdate:modelValue": h[31] || (h[31] = (m) => O.value = m)
                }, null, 512), [
                  [
                    it,
                    O.value
                  ]
                ])
              ])
            ])
          ])) : $t("", true)
        ]);
      };
    }
  }), Ap = En(Rp, [
    [
      "__scopeId",
      "data-v-e14ef892"
    ]
  ]), zp = [
    "title"
  ], Bp = {
    class: "stats-fps"
  }, Ip = {
    class: "stats-toggle"
  }, Op = {
    key: 0,
    class: "stats-panel"
  }, Np = {
    class: "stats-grid"
  }, Up = {
    class: "stats-row"
  }, Fp = {
    class: "stats-value"
  }, Dp = {
    class: "stats-row"
  }, $p = {
    class: "stats-value"
  }, Gp = {
    class: "stats-row"
  }, Vp = {
    class: "stats-value"
  }, Hp = {
    class: "stats-row"
  }, Wp = {
    class: "stats-value"
  }, jp = {
    class: "stats-row"
  }, qp = {
    class: "stats-value"
  }, fn = 200, Yp = Rt({
    __name: "RenderStats",
    props: {
      engine: {}
    },
    setup(e) {
      const t = e, n = Q(false), i = Q(0), o = Q(false), s = Q(0), r = Q(-1), a = Q(0), l = Q(0), f = [], u = [], d = Q(null);
      let v = null;
      function b() {
        const k = t.engine;
        if (!k) return;
        i.value = k.fps ?? 0, o.value = k.isRendering ?? false, s.value = k.gpuFrameTimeMs ?? 0, r.value = k.unfinishedPixelCount ?? -1;
        const T = k.neutralSize ?? 0;
        a.value = T * T, l.value = typeof k.getIterationBatchSize == "function" ? k.getIterationBatchSize() : 0, f.push(r.value >= 0 ? r.value : 0), f.length > fn && f.shift(), u.push(i.value), u.length > fn && u.shift(), n.value && $();
      }
      zt(() => {
        v = setInterval(b, 150);
      }), Mn(() => {
        v !== null && clearInterval(v);
      }), gt(n, async (k) => {
        k && (await Fi(), $());
      });
      function _() {
        return a.value === 0 || r.value < 0 ? "--" : ((a.value - r.value) / a.value * 100).toFixed(1);
      }
      function x(k) {
        return k < 0 ? "--" : k >= 1e6 ? (k / 1e6).toFixed(1) + "M" : k >= 1e3 ? (k / 1e3).toFixed(1) + "k" : String(k);
      }
      function $() {
        const k = d.value;
        if (!k) return;
        const T = k.getContext("2d");
        if (!T) return;
        const U = window.devicePixelRatio || 1, D = k.clientWidth, q = k.clientHeight;
        k.width = D * U, k.height = q * U, T.scale(U, U), T.clearRect(0, 0, D, q), T.fillStyle = "rgba(0,0,0,0.06)", T.beginPath(), T.roundRect(0, 0, D, q, 8), T.fill();
        const oe = q - 4, le = 2;
        if (f.length > 1) {
          const Y = Math.max(...f, 1);
          T.beginPath(), T.moveTo(0, le + oe);
          for (let W = 0; W < f.length; W++) {
            const ne = W / (fn - 1) * D, R = le + oe - f[W] / Y * oe;
            T.lineTo(ne, R);
          }
          T.lineTo((f.length - 1) / (fn - 1) * D, le + oe), T.closePath(), T.fillStyle = "rgba(34,197,94,0.18)", T.fill(), T.strokeStyle = "rgba(34,197,94,0.7)", T.lineWidth = 1.5, T.beginPath();
          for (let W = 0; W < f.length; W++) {
            const ne = W / (fn - 1) * D, R = le + oe - f[W] / Y * oe;
            W === 0 ? T.moveTo(ne, R) : T.lineTo(ne, R);
          }
          T.stroke();
        }
        if (u.length > 1) {
          const Y = Math.max(...u, 1);
          T.strokeStyle = "rgba(255,170,0,0.8)", T.lineWidth = 1.5, T.beginPath();
          for (let W = 0; W < u.length; W++) {
            const ne = W / (fn - 1) * D, R = le + oe - u[W] / Y * oe;
            W === 0 ? T.moveTo(ne, R) : T.lineTo(ne, R);
          }
          T.stroke();
        }
      }
      function V() {
        n.value = !n.value;
      }
      return (k, T) => (ae(), ue("div", {
        class: ce([
          "render-stats",
          {
            "render-stats--expanded": n.value
          }
        ])
      }, [
        c("button", {
          class: "stats-header",
          onClick: V,
          title: n.value ? "Replier" : "Statistiques de rendu"
        }, [
          c("span", {
            class: ce([
              "status-dot",
              o.value ? "status-dot--active" : "status-dot--idle"
            ])
          }, null, 2),
          c("span", Bp, te(i.value) + " fps", 1),
          c("span", Ip, te(n.value ? "\u25B2" : "\u25BC"), 1)
        ], 8, zp),
        n.value ? (ae(), ue("div", Op, [
          c("canvas", {
            ref_key: "graphCanvas",
            ref: d,
            class: "stats-graph"
          }, null, 512),
          T[5] || (T[5] = ca('<div class="stats-legend" data-v-3c8da564><span class="legend-item" data-v-3c8da564><span class="legend-swatch legend-swatch--green" data-v-3c8da564></span>Pixels restants</span><span class="legend-item" data-v-3c8da564><span class="legend-swatch legend-swatch--orange" data-v-3c8da564></span>FPS</span></div>', 1)),
          c("div", Np, [
            c("div", Up, [
              T[0] || (T[0] = c("span", {
                class: "stats-label"
              }, "Completion", -1)),
              c("span", Fp, te(_()) + "%", 1)
            ]),
            c("div", Dp, [
              T[1] || (T[1] = c("span", {
                class: "stats-label"
              }, "Pixels restants", -1)),
              c("span", $p, te(x(r.value)), 1)
            ]),
            c("div", Gp, [
              T[2] || (T[2] = c("span", {
                class: "stats-label"
              }, "Total pixels", -1)),
              c("span", Vp, te(x(a.value)), 1)
            ]),
            c("div", Hp, [
              T[3] || (T[3] = c("span", {
                class: "stats-label"
              }, "GPU frame", -1)),
              c("span", Wp, te(s.value.toFixed(1)) + " ms", 1)
            ]),
            c("div", jp, [
              T[4] || (T[4] = c("span", {
                class: "stats-label"
              }, "Batch size", -1)),
              c("span", qp, te(l.value), 1)
            ])
          ])
        ])) : $t("", true)
      ], 2));
    }
  }), Kp = En(Yp, [
    [
      "__scopeId",
      "data-v-3c8da564"
    ]
  ]), Xp = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, Zp = {
    class: "top-settings-bar-inner"
  }, Jp = [
    "onClick"
  ], Qp = [
    "onMousedown"
  ], eh = [
    "onMousedown"
  ], th = {
    class: "settings-popup-title"
  }, nh = [
    "onClick"
  ], ih = {
    class: "settings-popup-body"
  }, oh = {
    class: "tag is-black"
  }, sh = {
    class: "tag is-black"
  }, rh = {
    class: "tag is-black"
  }, ah = {
    class: "tag is-black"
  }, lh = {
    class: "tag is-black"
  }, uh = {
    class: "tag is-black"
  }, ch = {
    class: "tag is-black"
  }, fh = {
    class: "tag is-black"
  }, dh = {
    href: "https://github.com/gcollombet/mandelbrot",
    target: "_blank",
    rel: "noopener",
    class: "footer-link",
    "aria-label": "GitHub"
  }, ph = {
    class: "github-logo",
    height: "20",
    viewBox: "0 0 16 16",
    width: "20",
    fill: "currentColor",
    style: {
      "vertical-align": "middle",
      "margin-right": "4px"
    }
  }, tr = "mandelbrot_last_settings", hh = Rt({
    __name: "MandelbrotViewer",
    setup(e) {
      const t = Q(null), n = Ae(() => {
        var _a2;
        return ((_a2 = t.value) == null ? void 0 : _a2.getEngine()) ?? null;
      }), i = vn(/* @__PURE__ */ new Set()), o = Q(false), s = vn({}), r = Q({}), a = Q(true), l = Q(false), f = Q({
        cx: "-0.743643887037158704752191506114774",
        cy: "0.131825904205311970493132056385139",
        mu: 1e4,
        scale: "2.5",
        angle: 0,
        maxIterations: 1e3,
        antialiasLevel: 1,
        palettePeriod: 1,
        paletteOffset: 0,
        shadingLevel: 1,
        tessellationLevel: 2,
        epsilon: 1e-5,
        colorStops: [
          {
            color: "#0f0130",
            position: 0
          },
          {
            color: "#206bcb",
            position: 0.16
          },
          {
            color: "#ffceb6",
            position: 0.26
          },
          {
            color: "#edffff",
            position: 0.42
          },
          {
            color: "#ffaa00",
            position: 0.6425
          },
          {
            color: "#300200",
            position: 0.8575
          },
          {
            color: "#100000",
            position: 1
          }
        ],
        activateShading: true,
        activateTessellation: false,
        activateWebcam: false,
        activatePalette: true,
        activateSkybox: false,
        activateSmoothness: true,
        activateZebra: false,
        activateAnimate: false,
        dprMultiplier: 1,
        maxIterationMultiplier: 1,
        interpolationMode: "lab"
      });
      zt(() => {
        window.addEventListener("keydown", _);
        try {
          const B = localStorage.getItem(tr);
          B && Object.assign(f.value, JSON.parse(B));
        } catch {
        }
      }), Mn(() => {
        window.removeEventListener("keydown", _);
      }), gt(f, (B) => {
        localStorage.setItem(tr, JSON.stringify(B));
      }, {
        deep: true
      }), gt(l, (B) => {
        B && b();
      });
      const u = [
        {
          key: "navigation",
          label: "Navigation"
        },
        {
          key: "presets",
          label: "Presets"
        },
        {
          key: "palettes",
          label: "Palettes"
        },
        {
          key: "performance",
          label: "Graphics"
        }
      ];
      function d(B) {
        i.has(B) ? (i.delete(B), delete s[B]) : (i.add(B), s[B] = {
          x: -1,
          y: -1
        });
      }
      function v(B) {
        i.delete(B), delete s[B];
      }
      function b() {
        i.clear();
        for (const B of Object.keys(s)) delete s[B];
      }
      function _(B) {
        var _a2, _b, _c2;
        if (B.key === "Escape" && i.size > 0) {
          B.preventDefault(), b();
          return;
        }
        if (o.value) return;
        const L = (_b = (_a2 = B.target) == null ? void 0 : _a2.tagName) == null ? void 0 : _b.toLowerCase();
        L === "input" || L === "textarea" || ((_c2 = B.target) == null ? void 0 : _c2.isContentEditable) || (B.key === "w" || B.key === "W") && !B.repeat && (B.preventDefault(), i.size > 0 ? b() : d("navigation"));
      }
      const x = Q(false), $ = Q({
        x: 0,
        y: 0
      }), V = Q(null), k = vn({});
      let T = 51;
      function U(B) {
        k[B] = T++;
      }
      function D(B, L) {
        r.value[B] = L;
      }
      function q(B, L) {
        var _a2;
        const P = r.value[B];
        if (!P) return;
        x.value = true, V.value = B;
        const A = P.getBoundingClientRect();
        $.value = {
          x: L.clientX - A.left,
          y: L.clientY - A.top
        }, (((_a2 = s[B]) == null ? void 0 : _a2.x) ?? -1) < 0 && (s[B] = {
          x: A.left,
          y: A.top
        }), U(B), window.addEventListener("mousemove", oe), window.addEventListener("mouseup", le);
      }
      function oe(B) {
        !x.value || !V.value || (s[V.value] = {
          x: B.clientX - $.value.x,
          y: B.clientY - $.value.y
        });
      }
      function le() {
        x.value = false, V.value = null, window.removeEventListener("mousemove", oe), window.removeEventListener("mouseup", le);
      }
      function Y(B) {
        const L = s[B] ?? {
          x: -1,
          y: -1
        }, P = k[B] ?? 50, A = B === "palettes" ? "860px" : "460px", O = B === "presets" ? "92vh" : "80vh";
        if (L.x < 0) {
          const Me = Array.from(i).indexOf(B) * 30;
          return {
            position: "fixed",
            top: `calc(50% + ${Me}px)`,
            left: `calc(50% + ${Me}px)`,
            transform: "translate(-50%, -50%)",
            zIndex: P,
            width: A,
            maxHeight: O
          };
        }
        return {
          position: "fixed",
          top: `${L.y}px`,
          left: `${L.x}px`,
          transform: "none",
          zIndex: P,
          width: A,
          maxHeight: O
        };
      }
      function W() {
        var _a2;
        const B = window.navigator.language || ((_a2 = window.navigator.languages) == null ? void 0 : _a2[0]) || "en";
        return B.startsWith("fr") || B.startsWith("be") ? "azerty" : "qwerty";
      }
      const ne = W(), R = Ae(() => ne === "azerty" ? {
        up: "Z",
        down: "S",
        left: "Q",
        right: "D",
        rotateLeft: "A",
        rotateRight: "E",
        zoomIn: "R",
        zoomOut: "F"
      } : {
        up: "W",
        down: "S",
        left: "A",
        right: "D",
        rotateLeft: "Q",
        rotateRight: "E",
        zoomIn: "R",
        zoomOut: "F"
      });
      return (B, L) => (ae(), ue("div", Xp, [
        $e(c("div", {
          class: ce([
            "top-settings-bar animate__animated",
            a.value ? "animate__fadeInDown" : ""
          ])
        }, [
          c("div", Zp, [
            (ae(), ue(ze, null, bn(u, (P) => c("button", {
              key: P.key,
              class: ce([
                "top-tab-btn",
                {
                  "is-active": i.has(P.key)
                }
              ]),
              onClick: (A) => d(P.key)
            }, te(P.label), 11, Jp)), 64))
          ])
        ], 2), [
          [
            ri,
            a.value && !l.value
          ]
        ]),
        $e(c("div", {
          class: ce([
            "render-stats-wrapper is-hidden-touch animate__animated",
            a.value ? "animate__fadeInUp" : ""
          ])
        }, [
          Te(Kp, {
            engine: n.value
          }, null, 8, [
            "engine"
          ])
        ], 2), [
          [
            ri,
            a.value
          ]
        ]),
        Te(Vf, {
          ref_key: "mandelbrotCtrlRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          },
          scale: f.value.scale,
          "onUpdate:scale": L[0] || (L[0] = (P) => f.value.scale = P),
          angle: f.value.angle,
          "onUpdate:angle": L[1] || (L[1] = (P) => f.value.angle = P),
          cx: f.value.cx,
          "onUpdate:cx": L[2] || (L[2] = (P) => f.value.cx = P),
          cy: f.value.cy,
          "onUpdate:cy": L[3] || (L[3] = (P) => f.value.cy = P),
          mobileNavExpanded: l.value,
          "onUpdate:mobileNavExpanded": L[4] || (L[4] = (P) => l.value = P),
          mu: f.value.mu,
          shadingLevel: f.value.shadingLevel,
          antialiasLevel: f.value.antialiasLevel,
          tessellationLevel: f.value.tessellationLevel,
          epsilon: f.value.epsilon,
          palettePeriod: f.value.palettePeriod,
          paletteOffset: f.value.paletteOffset,
          colorStops: f.value.colorStops,
          activatePalette: f.value.activatePalette,
          activateSkybox: f.value.activateSkybox,
          activateTessellation: f.value.activateTessellation,
          activateWebcam: f.value.activateWebcam,
          activateShading: f.value.activateShading,
          activateZebra: f.value.activateZebra,
          activateSmoothness: f.value.activateSmoothness,
          activateAnimate: f.value.activateAnimate,
          dprMultiplier: f.value.dprMultiplier,
          maxIterationMultiplier: f.value.maxIterationMultiplier,
          interpolationMode: f.value.interpolationMode
        }, null, 8, [
          "scale",
          "angle",
          "cx",
          "cy",
          "mobileNavExpanded",
          "mu",
          "shadingLevel",
          "antialiasLevel",
          "tessellationLevel",
          "epsilon",
          "palettePeriod",
          "paletteOffset",
          "colorStops",
          "activatePalette",
          "activateSkybox",
          "activateTessellation",
          "activateWebcam",
          "activateShading",
          "activateZebra",
          "activateSmoothness",
          "activateAnimate",
          "dprMultiplier",
          "maxIterationMultiplier",
          "interpolationMode"
        ]),
        (ae(), ue(ze, null, bn(u, (P) => (ae(), ue(ze, {
          key: "popup-" + P.key
        }, [
          i.has(P.key) ? (ae(), ue("div", {
            key: 0,
            ref_for: true,
            ref: (A) => D(P.key, A),
            class: "settings-popup",
            style: Qn(Y(P.key)),
            onMousedown: (A) => U(P.key)
          }, [
            c("div", {
              class: "settings-popup-header",
              onMousedown: Mo((A) => q(P.key, A), [
                "prevent"
              ])
            }, [
              c("span", th, te(P.label), 1),
              c("button", {
                class: "delete is-medium",
                "aria-label": "Fermer",
                onClick: (A) => v(P.key)
              }, null, 8, nh)
            ], 40, eh),
            c("div", ih, [
              Te(Ap, {
                modelValue: f.value,
                "onUpdate:modelValue": L[5] || (L[5] = (A) => f.value = A),
                engine: n.value,
                "suspend-shortcuts": (A) => {
                  o.value = A;
                },
                "active-tab": P.key
              }, null, 8, [
                "modelValue",
                "engine",
                "suspend-shortcuts",
                "active-tab"
              ])
            ])
          ], 44, Qp)) : $t("", true)
        ], 64))), 64)),
        $e(c("div", {
          class: ce([
            "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
            a.value ? "animate__fadeInUp" : ""
          ])
        }, [
          L[6] || (L[6] = we(" Move\xA0 ", -1)),
          L[7] || (L[7] = c("span", {
            class: "tag is-black"
          }, "Left clic", -1)),
          L[8] || (L[8] = we("\xA0 ", -1)),
          c("span", oh, te(R.value.up), 1),
          L[9] || (L[9] = we("\xA0 ", -1)),
          c("span", sh, te(R.value.left), 1),
          L[10] || (L[10] = we("\xA0 ", -1)),
          c("span", rh, te(R.value.down), 1),
          L[11] || (L[11] = we("\xA0 ", -1)),
          c("span", ah, te(R.value.right), 1),
          L[12] || (L[12] = we("\xA0 |\xA0Rotate\xA0 ", -1)),
          L[13] || (L[13] = c("span", {
            class: "tag is-black"
          }, "Right clic", -1)),
          L[14] || (L[14] = we("\xA0 ", -1)),
          c("span", lh, te(R.value.rotateLeft), 1),
          L[15] || (L[15] = we("\xA0 ", -1)),
          c("span", uh, te(R.value.rotateRight), 1),
          L[16] || (L[16] = we("\xA0 |\xA0Zoom\xA0 ", -1)),
          L[17] || (L[17] = c("span", {
            class: "tag is-black"
          }, "Wheel", -1)),
          L[18] || (L[18] = we("\xA0 ", -1)),
          c("span", ch, te(R.value.zoomIn), 1),
          L[19] || (L[19] = we("\xA0 ", -1)),
          c("span", fh, te(R.value.zoomOut), 1),
          L[20] || (L[20] = we("\xA0 |\xA0Settings\xA0 ", -1)),
          L[21] || (L[21] = c("span", {
            class: "tag is-black"
          }, "W", -1))
        ], 2), [
          [
            ri,
            a.value
          ]
        ]),
        $e(c("div", {
          class: ce([
            "footer-love tag is-light is-medium is-hidden-touch animate__animated",
            a.value ? "animate__fadeInUp" : ""
          ])
        }, [
          L[24] || (L[24] = c("small", null, [
            c("a", {
              href: "https://wgpu.rs/",
              target: "_blank",
              rel: "noopener",
              class: "footer-link",
              "aria-label": "wGPU"
            }, [
              we(" Made with "),
              c("img", {
                src: "https://raw.githubusercontent.com/gfx-rs/wgpu/refs/heads/trunk/logo.png",
                alt: "wGPU logo",
                style: {
                  height: "24px",
                  width: "24px",
                  "vertical-align": "middle"
                }
              })
            ])
          ], -1)),
          L[25] || (L[25] = we(" \xA0|\xA0 ", -1)),
          c("small", null, [
            c("a", dh, [
              (ae(), ue("svg", ph, [
                ...L[22] || (L[22] = [
                  c("path", {
                    d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                  }, null, -1)
                ])
              ])),
              L[23] || (L[23] = we(" GitHub ", -1))
            ])
          ])
        ], 2), [
          [
            ri,
            a.value
          ]
        ])
      ]));
    }
  }), gh = En(hh, [
    [
      "__scopeId",
      "data-v-ba9fbe5c"
    ]
  ]), vh = {
    key: 0,
    id: "fullscreen"
  }, mh = {
    key: 1,
    class: "section is-flex is-flex-direction-column is-align-items-center is-justify-content-center",
    style: {
      height: "100vh"
    }
  }, bh = {
    class: "box has-text-centered",
    style: {
      "max-width": "400px"
    }
  }, _h = {
    class: "title is-4 mt-3"
  }, xh = {
    key: 0
  }, yh = {
    key: 1
  }, wh = {
    class: "button is-link mt-4",
    href: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility",
    target: "_blank"
  }, Sh = Rt({
    __name: "App",
    setup(e) {
      const t = Q(false), n = Q(true);
      return zt(() => {
        t.value = typeof navigator < "u" && "gpu" in navigator, typeof navigator < "u" && (n.value = navigator.language.startsWith("fr"));
      }), (i, o) => t.value ? (ae(), ue("div", vh, [
        Te(gh)
      ])) : (ae(), ue("div", mh, [
        c("div", bh, [
          o[2] || (o[2] = c("span", {
            class: "icon is-large has-text-danger"
          }, [
            c("i", {
              class: "fas fa-exclamation-triangle fa-2x"
            })
          ], -1)),
          c("h1", _h, te(n.value ? "WebGPU non support\xE9" : "WebGPU not supported"), 1),
          c("p", null, [
            n.value ? (ae(), ue("span", xh, [
              ...o[0] || (o[0] = [
                we(" Ce navigateur ne supporte pas WebGPU.", -1),
                c("br", null, null, -1),
                we(" Veuillez utiliser un navigateur compatible WebGPU. ", -1)
              ])
            ])) : (ae(), ue("span", yh, [
              ...o[1] || (o[1] = [
                we(" This browser does not support WebGPU.", -1),
                c("br", null, null, -1),
                we(" Please use a WebGPU-compatible browser. ", -1)
              ])
            ]))
          ]),
          c("a", wh, te(n.value ? "Liste des navigateurs compatibles WebGPU" : "List of WebGPU-compatible browsers"), 1)
        ])
      ]));
    }
  });
  "serviceWorker" in navigator && window.addEventListener("load", () => {
    navigator.serviceWorker.register("/mandelbrot/sw.js");
  });
  lc(Sh).mount("#app");
})();
