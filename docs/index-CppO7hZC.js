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
  function ji(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const ie = {}, en = [], rt = () => {
  }, Uo = () => false, Br = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Yi = (e) => e.startsWith("onUpdate:"), ye = Object.assign, Zi = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, Cl = Object.prototype.hasOwnProperty, oe = (e, t) => Cl.call(e, t), W = Array.isArray, tn = (e) => Gn(e) === "[object Map]", $r = (e) => Gn(e) === "[object Set]", As = (e) => Gn(e) === "[object Date]", Z = (e) => typeof e == "function", _e = (e) => typeof e == "string", at = (e) => typeof e == "symbol", ue = (e) => e !== null && typeof e == "object", Do = (e) => (ue(e) || Z(e)) && Z(e.then) && Z(e.catch), Fo = Object.prototype.toString, Gn = (e) => Fo.call(e), Al = (e) => Gn(e).slice(8, -1), Bo = (e) => Gn(e) === "[object Object]", Ji = (e) => _e(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Mn = ji(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), Vr = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return ((n) => t[n] || (t[n] = e(n)));
  }, Rl = /-\w/g, _t = Vr((e) => e.replace(Rl, (t) => t.slice(1).toUpperCase())), kl = /\B([A-Z])/g, Ct = Vr((e) => e.replace(kl, "-$1").toLowerCase()), $o = Vr((e) => e.charAt(0).toUpperCase() + e.slice(1)), ri = Vr((e) => e ? `on${$o(e)}` : ""), Ie = (e, t) => !Object.is(e, t), ar = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, Vo = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, Qi = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  };
  let Rs;
  const zr = () => Rs || (Rs = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function Gr(e) {
    if (W(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], i = _e(r) ? Ll(r) : Gr(r);
        if (i) for (const s in i) t[s] = i[s];
      }
      return t;
    } else if (_e(e) || ue(e)) return e;
  }
  const Nl = /;(?![^(]*\))/g, Ol = /:([^]+)/, Il = /\/\*[^]*?\*\//g;
  function Ll(e) {
    const t = {};
    return e.replace(Il, "").split(Nl).forEach((n) => {
      if (n) {
        const r = n.split(Ol);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }), t;
  }
  function Oe(e) {
    let t = "";
    if (_e(e)) t = e;
    else if (W(e)) for (let n = 0; n < e.length; n++) {
      const r = Oe(e[n]);
      r && (t += r + " ");
    }
    else if (ue(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const Ul = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Dl = ji(Ul);
  function zo(e) {
    return !!e || e === "";
  }
  function Fl(e, t) {
    if (e.length !== t.length) return false;
    let n = true;
    for (let r = 0; n && r < e.length; r++) n = Hn(e[r], t[r]);
    return n;
  }
  function Hn(e, t) {
    if (e === t) return true;
    let n = As(e), r = As(t);
    if (n || r) return n && r ? e.getTime() === t.getTime() : false;
    if (n = at(e), r = at(t), n || r) return e === t;
    if (n = W(e), r = W(t), n || r) return n && r ? Fl(e, t) : false;
    if (n = ue(e), r = ue(t), n || r) {
      if (!n || !r) return false;
      const i = Object.keys(e).length, s = Object.keys(t).length;
      if (i !== s) return false;
      for (const o in e) {
        const a = e.hasOwnProperty(o), l = t.hasOwnProperty(o);
        if (a && !l || !a && l || !Hn(e[o], t[o])) return false;
      }
    }
    return String(e) === String(t);
  }
  function Go(e, t) {
    return e.findIndex((n) => Hn(n, t));
  }
  const Ho = (e) => !!(e && e.__v_isRef === true), ve = (e) => _e(e) ? e : e == null ? "" : W(e) || ue(e) && (e.toString === Fo || !Z(e.toString)) ? Ho(e) ? ve(e.value) : JSON.stringify(e, Wo, 2) : String(e), Wo = (e, t) => Ho(t) ? Wo(e, t.value) : tn(t) ? {
    [`Map(${t.size})`]: [
      ...t.entries()
    ].reduce((n, [r, i], s) => (n[ii(r, s) + " =>"] = i, n), {})
  } : $r(t) ? {
    [`Set(${t.size})`]: [
      ...t.values()
    ].map((n) => ii(n))
  } : at(t) ? ii(t) : ue(t) && !W(t) && !Bo(t) ? String(t) : t, ii = (e, t = "") => {
    var n;
    return at(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
  let Ne;
  class Bl {
    constructor(t = false) {
      this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.__v_skip = true, this.parent = Ne, !t && Ne && (this.index = (Ne.scopes || (Ne.scopes = [])).push(this) - 1);
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
        const n = Ne;
        try {
          return Ne = this, t();
        } finally {
          Ne = n;
        }
      }
    }
    on() {
      ++this._on === 1 && (this.prevScope = Ne, Ne = this);
    }
    off() {
      this._on > 0 && --this._on === 0 && (Ne = this.prevScope, this.prevScope = void 0);
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
  function $l() {
    return Ne;
  }
  let de;
  const si = /* @__PURE__ */ new WeakSet();
  class qo {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, Ne && Ne.active && Ne.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, si.has(this) && (si.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Xo(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, ks(this), jo(this);
      const t = de, n = qe;
      de = this, qe = true;
      try {
        return this.fn();
      } finally {
        Yo(this), de = t, qe = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) ns(t);
        this.deps = this.depsTail = void 0, ks(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? si.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      Ti(this) && this.run();
    }
    get dirty() {
      return Ti(this);
    }
  }
  let Ko = 0, En, Pn;
  function Xo(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = Pn, Pn = e;
      return;
    }
    e.next = En, En = e;
  }
  function es() {
    Ko++;
  }
  function ts() {
    if (--Ko > 0) return;
    if (Pn) {
      let t = Pn;
      for (Pn = void 0; t; ) {
        const n = t.next;
        t.next = void 0, t.flags &= -9, t = n;
      }
    }
    let e;
    for (; En; ) {
      let t = En;
      for (En = void 0; t; ) {
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
  function jo(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function Yo(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const i = r.prevDep;
      r.version === -1 ? (r === n && (n = i), ns(r), Vl(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = i;
    }
    e.deps = t, e.depsTail = n;
  }
  function Ti(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (Zo(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function Zo(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === On) || (e.globalVersion = On, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Ti(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = de, r = qe;
    de = e, qe = true;
    try {
      jo(e);
      const i = e.fn(e._value);
      (t.version === 0 || Ie(i, e._value)) && (e.flags |= 128, e._value = i, t.version++);
    } catch (i) {
      throw t.version++, i;
    } finally {
      de = n, qe = r, Yo(e), e.flags &= -3;
    }
  }
  function ns(e, t = false) {
    const { dep: n, prevSub: r, nextSub: i } = e;
    if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
      n.computed.flags &= -5;
      for (let s = n.computed.deps; s; s = s.nextDep) ns(s, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function Vl(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let qe = true;
  const Jo = [];
  function bt() {
    Jo.push(qe), qe = false;
  }
  function yt() {
    const e = Jo.pop();
    qe = e === void 0 ? true : e;
  }
  function ks(e) {
    const { cleanup: t } = e;
    if (e.cleanup = void 0, t) {
      const n = de;
      de = void 0;
      try {
        t();
      } finally {
        de = n;
      }
    }
  }
  let On = 0;
  class zl {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class Hr {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!de || !qe || de === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== de) n = this.activeLink = new zl(de, this), de.deps ? (n.prevDep = de.depsTail, de.depsTail.nextDep = n, de.depsTail = n) : de.deps = de.depsTail = n, Qo(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = de.depsTail, n.nextDep = void 0, de.depsTail.nextDep = n, de.depsTail = n, de.deps === n && (de.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, On++, this.notify(t);
    }
    notify(t) {
      es();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        ts();
      }
    }
  }
  function Qo(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let r = t.deps; r; r = r.nextDep) Qo(r);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const Mi = /* @__PURE__ */ new WeakMap(), Dt = /* @__PURE__ */ Symbol(""), Ei = /* @__PURE__ */ Symbol(""), In = /* @__PURE__ */ Symbol("");
  function Se(e, t, n) {
    if (qe && de) {
      let r = Mi.get(e);
      r || Mi.set(e, r = /* @__PURE__ */ new Map());
      let i = r.get(n);
      i || (r.set(n, i = new Hr()), i.map = r, i.key = n), i.track();
    }
  }
  function gt(e, t, n, r, i, s) {
    const o = Mi.get(e);
    if (!o) {
      On++;
      return;
    }
    const a = (l) => {
      l && l.trigger();
    };
    if (es(), t === "clear") o.forEach(a);
    else {
      const l = W(e), u = l && Ji(n);
      if (l && n === "length") {
        const c = Number(r);
        o.forEach((f, h) => {
          (h === "length" || h === In || !at(h) && h >= c) && a(f);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && a(o.get(n)), u && a(o.get(In)), t) {
        case "add":
          l ? u && a(o.get("length")) : (a(o.get(Dt)), tn(e) && a(o.get(Ei)));
          break;
        case "delete":
          l || (a(o.get(Dt)), tn(e) && a(o.get(Ei)));
          break;
        case "set":
          tn(e) && a(o.get(Dt));
          break;
      }
    }
    ts();
  }
  function qt(e) {
    const t = re(e);
    return t === e ? t : (Se(t, "iterate", In), Ge(e) ? t : t.map(Ke));
  }
  function Wr(e) {
    return Se(e = re(e), "iterate", In), e;
  }
  function Tt(e, t) {
    return xt(e) ? un(Ft(e) ? Ke(t) : t) : Ke(t);
  }
  const Gl = {
    __proto__: null,
    [Symbol.iterator]() {
      return oi(this, Symbol.iterator, (e) => Tt(this, e));
    },
    concat(...e) {
      return qt(this).concat(...e.map((t) => W(t) ? qt(t) : t));
    },
    entries() {
      return oi(this, "entries", (e) => (e[1] = Tt(this, e[1]), e));
    },
    every(e, t) {
      return ct(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return ct(this, "filter", e, t, (n) => n.map((r) => Tt(this, r)), arguments);
    },
    find(e, t) {
      return ct(this, "find", e, t, (n) => Tt(this, n), arguments);
    },
    findIndex(e, t) {
      return ct(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return ct(this, "findLast", e, t, (n) => Tt(this, n), arguments);
    },
    findLastIndex(e, t) {
      return ct(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return ct(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return ai(this, "includes", e);
    },
    indexOf(...e) {
      return ai(this, "indexOf", e);
    },
    join(e) {
      return qt(this).join(e);
    },
    lastIndexOf(...e) {
      return ai(this, "lastIndexOf", e);
    },
    map(e, t) {
      return ct(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return vn(this, "pop");
    },
    push(...e) {
      return vn(this, "push", e);
    },
    reduce(e, ...t) {
      return Ns(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return Ns(this, "reduceRight", e, t);
    },
    shift() {
      return vn(this, "shift");
    },
    some(e, t) {
      return ct(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return vn(this, "splice", e);
    },
    toReversed() {
      return qt(this).toReversed();
    },
    toSorted(e) {
      return qt(this).toSorted(e);
    },
    toSpliced(...e) {
      return qt(this).toSpliced(...e);
    },
    unshift(...e) {
      return vn(this, "unshift", e);
    },
    values() {
      return oi(this, "values", (e) => Tt(this, e));
    }
  };
  function oi(e, t, n) {
    const r = Wr(e), i = r[t]();
    return r !== e && !Ge(e) && (i._next = i.next, i.next = () => {
      const s = i._next();
      return s.done || (s.value = n(s.value)), s;
    }), i;
  }
  const Hl = Array.prototype;
  function ct(e, t, n, r, i, s) {
    const o = Wr(e), a = o !== e && !Ge(e), l = o[t];
    if (l !== Hl[t]) {
      const f = l.apply(e, s);
      return a ? Ke(f) : f;
    }
    let u = n;
    o !== e && (a ? u = function(f, h) {
      return n.call(this, Tt(e, f), h, e);
    } : n.length > 2 && (u = function(f, h) {
      return n.call(this, f, h, e);
    }));
    const c = l.call(o, u, r);
    return a && i ? i(c) : c;
  }
  function Ns(e, t, n, r) {
    const i = Wr(e);
    let s = n;
    return i !== e && (Ge(e) ? n.length > 3 && (s = function(o, a, l) {
      return n.call(this, o, a, l, e);
    }) : s = function(o, a, l) {
      return n.call(this, o, Tt(e, a), l, e);
    }), i[t](s, ...r);
  }
  function ai(e, t, n) {
    const r = re(e);
    Se(r, "iterate", In);
    const i = r[t](...n);
    return (i === -1 || i === false) && os(n[0]) ? (n[0] = re(n[0]), r[t](...n)) : i;
  }
  function vn(e, t, n = []) {
    bt(), es();
    const r = re(e)[t].apply(e, n);
    return ts(), yt(), r;
  }
  const Wl = ji("__proto__,__v_isRef,__isVue"), ea = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(at));
  function ql(e) {
    at(e) || (e = String(e));
    const t = re(this);
    return Se(t, "has", e), t.hasOwnProperty(e);
  }
  class ta {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const i = this._isReadonly, s = this._isShallow;
      if (n === "__v_isReactive") return !i;
      if (n === "__v_isReadonly") return i;
      if (n === "__v_isShallow") return s;
      if (n === "__v_raw") return r === (i ? s ? nu : sa : s ? ia : ra).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const o = W(t);
      if (!i) {
        let l;
        if (o && (l = Gl[n])) return l;
        if (n === "hasOwnProperty") return ql;
      }
      const a = Reflect.get(t, n, Me(t) ? t : r);
      if ((at(n) ? ea.has(n) : Wl(n)) || (i || Se(t, "get", n), s)) return a;
      if (Me(a)) {
        const l = o && Ji(n) ? a : a.value;
        return i && ue(l) ? Ci(l) : l;
      }
      return ue(a) ? i ? Ci(a) : is(a) : a;
    }
  }
  class na extends ta {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, i) {
      let s = t[n];
      const o = W(t) && Ji(n);
      if (!this._isShallow) {
        const u = xt(s);
        if (!Ge(r) && !xt(r) && (s = re(s), r = re(r)), !o && Me(s) && !Me(r)) return u || (s.value = r), true;
      }
      const a = o ? Number(n) < t.length : oe(t, n), l = Reflect.set(t, n, r, Me(t) ? t : i);
      return t === re(i) && (a ? Ie(r, s) && gt(t, "set", n, r) : gt(t, "add", n, r)), l;
    }
    deleteProperty(t, n) {
      const r = oe(t, n);
      t[n];
      const i = Reflect.deleteProperty(t, n);
      return i && r && gt(t, "delete", n, void 0), i;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!at(n) || !ea.has(n)) && Se(t, "has", n), r;
    }
    ownKeys(t) {
      return Se(t, "iterate", W(t) ? "length" : Dt), Reflect.ownKeys(t);
    }
  }
  class Kl extends ta {
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
  const Xl = new na(), jl = new Kl(), Yl = new na(true);
  const Pi = (e) => e, Zn = (e) => Reflect.getPrototypeOf(e);
  function Zl(e, t, n) {
    return function(...r) {
      const i = this.__v_raw, s = re(i), o = tn(s), a = e === "entries" || e === Symbol.iterator && o, l = e === "keys" && o, u = i[e](...r), c = n ? Pi : t ? un : Ke;
      return !t && Se(s, "iterate", l ? Ei : Dt), ye(Object.create(u), {
        next() {
          const { value: f, done: h } = u.next();
          return h ? {
            value: f,
            done: h
          } : {
            value: a ? [
              c(f[0]),
              c(f[1])
            ] : c(f),
            done: h
          };
        }
      });
    };
  }
  function Jn(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function Jl(e, t) {
    const n = {
      get(i) {
        const s = this.__v_raw, o = re(s), a = re(i);
        e || (Ie(i, a) && Se(o, "get", i), Se(o, "get", a));
        const { has: l } = Zn(o), u = t ? Pi : e ? un : Ke;
        if (l.call(o, i)) return u(s.get(i));
        if (l.call(o, a)) return u(s.get(a));
        s !== o && s.get(i);
      },
      get size() {
        const i = this.__v_raw;
        return !e && Se(re(i), "iterate", Dt), i.size;
      },
      has(i) {
        const s = this.__v_raw, o = re(s), a = re(i);
        return e || (Ie(i, a) && Se(o, "has", i), Se(o, "has", a)), i === a ? s.has(i) : s.has(i) || s.has(a);
      },
      forEach(i, s) {
        const o = this, a = o.__v_raw, l = re(a), u = t ? Pi : e ? un : Ke;
        return !e && Se(l, "iterate", Dt), a.forEach((c, f) => i.call(s, u(c), u(f), o));
      }
    };
    return ye(n, e ? {
      add: Jn("add"),
      set: Jn("set"),
      delete: Jn("delete"),
      clear: Jn("clear")
    } : {
      add(i) {
        !t && !Ge(i) && !xt(i) && (i = re(i));
        const s = re(this);
        return Zn(s).has.call(s, i) || (s.add(i), gt(s, "add", i, i)), this;
      },
      set(i, s) {
        !t && !Ge(s) && !xt(s) && (s = re(s));
        const o = re(this), { has: a, get: l } = Zn(o);
        let u = a.call(o, i);
        u || (i = re(i), u = a.call(o, i));
        const c = l.call(o, i);
        return o.set(i, s), u ? Ie(s, c) && gt(o, "set", i, s) : gt(o, "add", i, s), this;
      },
      delete(i) {
        const s = re(this), { has: o, get: a } = Zn(s);
        let l = o.call(s, i);
        l || (i = re(i), l = o.call(s, i)), a && a.call(s, i);
        const u = s.delete(i);
        return l && gt(s, "delete", i, void 0), u;
      },
      clear() {
        const i = re(this), s = i.size !== 0, o = i.clear();
        return s && gt(i, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((i) => {
      n[i] = Zl(i, e, t);
    }), n;
  }
  function rs(e, t) {
    const n = Jl(e, t);
    return (r, i, s) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? r : Reflect.get(oe(n, i) && i in r ? n : r, i, s);
  }
  const Ql = {
    get: rs(false, false)
  }, eu = {
    get: rs(false, true)
  }, tu = {
    get: rs(true, false)
  };
  const ra = /* @__PURE__ */ new WeakMap(), ia = /* @__PURE__ */ new WeakMap(), sa = /* @__PURE__ */ new WeakMap(), nu = /* @__PURE__ */ new WeakMap();
  function ru(e) {
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
  function iu(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : ru(Al(e));
  }
  function is(e) {
    return xt(e) ? e : ss(e, false, Xl, Ql, ra);
  }
  function su(e) {
    return ss(e, false, Yl, eu, ia);
  }
  function Ci(e) {
    return ss(e, true, jl, tu, sa);
  }
  function ss(e, t, n, r, i) {
    if (!ue(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const s = iu(e);
    if (s === 0) return e;
    const o = i.get(e);
    if (o) return o;
    const a = new Proxy(e, s === 2 ? r : n);
    return i.set(e, a), a;
  }
  function Ft(e) {
    return xt(e) ? Ft(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function xt(e) {
    return !!(e && e.__v_isReadonly);
  }
  function Ge(e) {
    return !!(e && e.__v_isShallow);
  }
  function os(e) {
    return e ? !!e.__v_raw : false;
  }
  function re(e) {
    const t = e && e.__v_raw;
    return t ? re(t) : e;
  }
  function ou(e) {
    return !oe(e, "__v_skip") && Object.isExtensible(e) && Vo(e, "__v_skip", true), e;
  }
  const Ke = (e) => ue(e) ? is(e) : e, un = (e) => ue(e) ? Ci(e) : e;
  function Me(e) {
    return e ? e.__v_isRef === true : false;
  }
  function ge(e) {
    return au(e, false);
  }
  function au(e, t) {
    return Me(e) ? e : new lu(e, t);
  }
  class lu {
    constructor(t, n) {
      this.dep = new Hr(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : re(t), this._value = n ? t : Ke(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || Ge(t) || xt(t);
      t = r ? t : re(t), Ie(t, n) && (this._rawValue = t, this._value = r ? t : Ke(t), this.dep.trigger());
    }
  }
  function uu(e) {
    return Me(e) ? e.value : e;
  }
  const cu = {
    get: (e, t, n) => t === "__v_raw" ? e : uu(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const i = e[t];
      return Me(i) && !Me(n) ? (i.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function oa(e) {
    return Ft(e) ? e : new Proxy(e, cu);
  }
  class fu {
    constructor(t) {
      this.__v_isRef = true, this._value = void 0;
      const n = this.dep = new Hr(), { get: r, set: i } = t(n.track.bind(n), n.trigger.bind(n));
      this._get = r, this._set = i;
    }
    get value() {
      return this._value = this._get();
    }
    set value(t) {
      this._set(t);
    }
  }
  function du(e) {
    return new fu(e);
  }
  class hu {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new Hr(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = On - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && de !== this) return Xo(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return Zo(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function pu(e, t, n = false) {
    let r, i;
    return Z(e) ? r = e : (r = e.get, i = e.set), new hu(r, i, n);
  }
  const Qn = {}, vr = /* @__PURE__ */ new WeakMap();
  let It;
  function gu(e, t = false, n = It) {
    if (n) {
      let r = vr.get(n);
      r || vr.set(n, r = []), r.push(e);
    }
  }
  function mu(e, t, n = ie) {
    const { immediate: r, deep: i, once: s, scheduler: o, augmentJob: a, call: l } = n, u = (_) => i ? _ : Ge(_) || i === false || i === 0 ? mt(_, 1) : mt(_);
    let c, f, h, d, b = false, y = false;
    if (Me(e) ? (f = () => e.value, b = Ge(e)) : Ft(e) ? (f = () => u(e), b = true) : W(e) ? (y = true, b = e.some((_) => Ft(_) || Ge(_)), f = () => e.map((_) => {
      if (Me(_)) return _.value;
      if (Ft(_)) return u(_);
      if (Z(_)) return l ? l(_, 2) : _();
    })) : Z(e) ? t ? f = l ? () => l(e, 2) : e : f = () => {
      if (h) {
        bt();
        try {
          h();
        } finally {
          yt();
        }
      }
      const _ = It;
      It = c;
      try {
        return l ? l(e, 3, [
          d
        ]) : e(d);
      } finally {
        It = _;
      }
    } : f = rt, t && i) {
      const _ = f, w = i === true ? 1 / 0 : i;
      f = () => mt(_(), w);
    }
    const L = $l(), V = () => {
      c.stop(), L && L.active && Zi(L.effects, c);
    };
    if (s && t) {
      const _ = t;
      t = (...w) => {
        _(...w), V();
      };
    }
    let U = y ? new Array(e.length).fill(Qn) : Qn;
    const $ = (_) => {
      if (!(!(c.flags & 1) || !c.dirty && !_)) if (t) {
        const w = c.run();
        if (i || b || (y ? w.some((I, z) => Ie(I, U[z])) : Ie(w, U))) {
          h && h();
          const I = It;
          It = c;
          try {
            const z = [
              w,
              U === Qn ? void 0 : y && U[0] === Qn ? [] : U,
              d
            ];
            U = w, l ? l(t, 3, z) : t(...z);
          } finally {
            It = I;
          }
        }
      } else c.run();
    };
    return a && a($), c = new qo(f), c.scheduler = o ? () => o($, false) : $, d = (_) => gu(_, false, c), h = c.onStop = () => {
      const _ = vr.get(c);
      if (_) {
        if (l) l(_, 4);
        else for (const w of _) w();
        vr.delete(c);
      }
    }, t ? r ? $(true) : U = c.run() : o ? o($.bind(null, true), true) : c.run(), V.pause = c.pause.bind(c), V.resume = c.resume.bind(c), V.stop = V, V;
  }
  function mt(e, t = 1 / 0, n) {
    if (t <= 0 || !ue(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
    if (n.set(e, t), t--, Me(e)) mt(e.value, t, n);
    else if (W(e)) for (let r = 0; r < e.length; r++) mt(e[r], t, n);
    else if ($r(e) || tn(e)) e.forEach((r) => {
      mt(r, t, n);
    });
    else if (Bo(e)) {
      for (const r in e) mt(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && mt(e[r], t, n);
    }
    return e;
  }
  function Wn(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (i) {
      qr(i, t, n);
    }
  }
  function lt(e, t, n, r) {
    if (Z(e)) {
      const i = Wn(e, t, n, r);
      return i && Do(i) && i.catch((s) => {
        qr(s, t, n);
      }), i;
    }
    if (W(e)) {
      const i = [];
      for (let s = 0; s < e.length; s++) i.push(lt(e[s], t, n, r));
      return i;
    }
  }
  function qr(e, t, n, r = true) {
    const i = t ? t.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: o } = t && t.appContext.config || ie;
    if (t) {
      let a = t.parent;
      const l = t.proxy, u = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; a; ) {
        const c = a.ec;
        if (c) {
          for (let f = 0; f < c.length; f++) if (c[f](e, l, u) === false) return;
        }
        a = a.parent;
      }
      if (s) {
        bt(), Wn(s, null, 10, [
          e,
          l,
          u
        ]), yt();
        return;
      }
    }
    vu(e, n, i, r, o);
  }
  function vu(e, t, n, r = true, i = false) {
    if (i) throw e;
    console.error(e);
  }
  const Pe = [];
  let et = -1;
  const nn = [];
  let Mt = null, jt = 0;
  const aa = Promise.resolve();
  let _r = null;
  function Kr(e) {
    const t = _r || aa;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function _u(e) {
    let t = et + 1, n = Pe.length;
    for (; t < n; ) {
      const r = t + n >>> 1, i = Pe[r], s = Ln(i);
      s < e || s === e && i.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function as(e) {
    if (!(e.flags & 1)) {
      const t = Ln(e), n = Pe[Pe.length - 1];
      !n || !(e.flags & 2) && t >= Ln(n) ? Pe.push(e) : Pe.splice(_u(t), 0, e), e.flags |= 1, la();
    }
  }
  function la() {
    _r || (_r = aa.then(ca));
  }
  function bu(e) {
    W(e) ? nn.push(...e) : Mt && e.id === -1 ? Mt.splice(jt + 1, 0, e) : e.flags & 1 || (nn.push(e), e.flags |= 1), la();
  }
  function Os(e, t, n = et + 1) {
    for (; n < Pe.length; n++) {
      const r = Pe[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        Pe.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function ua(e) {
    if (nn.length) {
      const t = [
        ...new Set(nn)
      ].sort((n, r) => Ln(n) - Ln(r));
      if (nn.length = 0, Mt) {
        Mt.push(...t);
        return;
      }
      for (Mt = t, jt = 0; jt < Mt.length; jt++) {
        const n = Mt[jt];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      Mt = null, jt = 0;
    }
  }
  const Ln = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function ca(e) {
    try {
      for (et = 0; et < Pe.length; et++) {
        const t = Pe[et];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Wn(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; et < Pe.length; et++) {
        const t = Pe[et];
        t && (t.flags &= -2);
      }
      et = -1, Pe.length = 0, ua(), _r = null, (Pe.length || nn.length) && ca();
    }
  }
  let ze = null, fa = null;
  function br(e) {
    const t = ze;
    return ze = e, fa = e && e.type.__scopeId || null, t;
  }
  function yu(e, t = ze, n) {
    if (!t || e._n) return e;
    const r = (...i) => {
      r._d && Gs(-1);
      const s = br(t);
      let o;
      try {
        o = e(...i);
      } finally {
        br(s), r._d && Gs(1);
      }
      return o;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function be(e, t) {
    if (ze === null) return e;
    const n = Zr(ze), r = e.dirs || (e.dirs = []);
    for (let i = 0; i < t.length; i++) {
      let [s, o, a, l = ie] = t[i];
      s && (Z(s) && (s = {
        mounted: s,
        updated: s
      }), s.deep && mt(o), r.push({
        dir: s,
        instance: n,
        value: o,
        oldValue: void 0,
        arg: a,
        modifiers: l
      }));
    }
    return e;
  }
  function kt(e, t, n, r) {
    const i = e.dirs, s = t && t.dirs;
    for (let o = 0; o < i.length; o++) {
      const a = i[o];
      s && (a.oldValue = s[o].value);
      let l = a.dir[r];
      l && (bt(), lt(l, n, 8, [
        e.el,
        a,
        e,
        t
      ]), yt());
    }
  }
  function xu(e, t) {
    if (Ce) {
      let n = Ce.provides;
      const r = Ce.parent && Ce.parent.provides;
      r === n && (n = Ce.provides = Object.create(r)), n[e] = t;
    }
  }
  function lr(e, t, n = false) {
    const r = Da();
    if (r || rn) {
      let i = rn ? rn._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (i && e in i) return i[e];
      if (arguments.length > 1) return n && Z(t) ? t.call(r && r.proxy) : t;
    }
  }
  const wu = /* @__PURE__ */ Symbol.for("v-scx"), Su = () => lr(wu);
  function Tu(e, t) {
    return ls(e, null, {
      flush: "sync"
    });
  }
  function Bt(e, t, n) {
    return ls(e, t, n);
  }
  function ls(e, t, n = ie) {
    const { immediate: r, deep: i, flush: s, once: o } = n, a = ye({}, n), l = t && r || !t && s !== "post";
    let u;
    if (Dn) {
      if (s === "sync") {
        const d = Su();
        u = d.__watcherHandles || (d.__watcherHandles = []);
      } else if (!l) {
        const d = () => {
        };
        return d.stop = rt, d.resume = rt, d.pause = rt, d;
      }
    }
    const c = Ce;
    a.call = (d, b, y) => lt(d, c, b, y);
    let f = false;
    s === "post" ? a.scheduler = (d) => {
      ke(d, c && c.suspense);
    } : s !== "sync" && (f = true, a.scheduler = (d, b) => {
      b ? d() : as(d);
    }), a.augmentJob = (d) => {
      t && (d.flags |= 4), f && (d.flags |= 2, c && (d.id = c.uid, d.i = c));
    };
    const h = mu(e, t, a);
    return Dn && (u ? u.push(h) : l && h()), h;
  }
  function Mu(e, t, n) {
    const r = this.proxy, i = _e(e) ? e.includes(".") ? da(r, e) : () => r[e] : e.bind(r, r);
    let s;
    Z(t) ? s = t : (s = t.handler, n = t);
    const o = Kn(this), a = ls(i, s.bind(r), n);
    return o(), a;
  }
  function da(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let i = 0; i < n.length && r; i++) r = r[n[i]];
      return r;
    };
  }
  const Eu = /* @__PURE__ */ Symbol("_vte"), Pu = (e) => e.__isTeleport, Cu = /* @__PURE__ */ Symbol("_leaveCb");
  function us(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, us(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function At(e, t) {
    return Z(e) ? ye({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function ha(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function Is(e, t) {
    let n;
    return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
  }
  const yr = /* @__PURE__ */ new WeakMap();
  function Cn(e, t, n, r, i = false) {
    if (W(e)) {
      e.forEach((y, L) => Cn(y, t && (W(t) ? t[L] : t), n, r, i));
      return;
    }
    if (An(r) && !i) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Cn(e, t, n, r.component.subTree);
      return;
    }
    const s = r.shapeFlag & 4 ? Zr(r.component) : r.el, o = i ? null : s, { i: a, r: l } = e, u = t && t.r, c = a.refs === ie ? a.refs = {} : a.refs, f = a.setupState, h = re(f), d = f === ie ? Uo : (y) => Is(c, y) ? false : oe(h, y), b = (y, L) => !(L && Is(c, L));
    if (u != null && u !== l) {
      if (Ls(t), _e(u)) c[u] = null, d(u) && (f[u] = null);
      else if (Me(u)) {
        const y = t;
        b(u, y.k) && (u.value = null), y.k && (c[y.k] = null);
      }
    }
    if (Z(l)) Wn(l, a, 12, [
      o,
      c
    ]);
    else {
      const y = _e(l), L = Me(l);
      if (y || L) {
        const V = () => {
          if (e.f) {
            const U = y ? d(l) ? f[l] : c[l] : b() || !e.k ? l.value : c[e.k];
            if (i) W(U) && Zi(U, s);
            else if (W(U)) U.includes(s) || U.push(s);
            else if (y) c[l] = [
              s
            ], d(l) && (f[l] = c[l]);
            else {
              const $ = [
                s
              ];
              b(l, e.k) && (l.value = $), e.k && (c[e.k] = $);
            }
          } else y ? (c[l] = o, d(l) && (f[l] = o)) : L && (b(l, e.k) && (l.value = o), e.k && (c[e.k] = o));
        };
        if (o) {
          const U = () => {
            V(), yr.delete(e);
          };
          U.id = -1, yr.set(e, U), ke(U, n);
        } else Ls(e), V();
      }
    }
  }
  function Ls(e) {
    const t = yr.get(e);
    t && (t.flags |= 8, yr.delete(e));
  }
  zr().requestIdleCallback;
  zr().cancelIdleCallback;
  const An = (e) => !!e.type.__asyncLoader, pa = (e) => e.type.__isKeepAlive;
  function Au(e, t) {
    ga(e, "a", t);
  }
  function Ru(e, t) {
    ga(e, "da", t);
  }
  function ga(e, t, n = Ce) {
    const r = e.__wdc || (e.__wdc = () => {
      let i = n;
      for (; i; ) {
        if (i.isDeactivated) return;
        i = i.parent;
      }
      return e();
    });
    if (Xr(t, r, n), n) {
      let i = n.parent;
      for (; i && i.parent; ) pa(i.parent.vnode) && ku(r, t, n, i), i = i.parent;
    }
  }
  function ku(e, t, n, r) {
    const i = Xr(t, e, r, true);
    qn(() => {
      Zi(r[t], i);
    }, n);
  }
  function Xr(e, t, n = Ce, r = false) {
    if (n) {
      const i = n[e] || (n[e] = []), s = t.__weh || (t.__weh = (...o) => {
        bt();
        const a = Kn(n), l = lt(t, n, e, o);
        return a(), yt(), l;
      });
      return r ? i.unshift(s) : i.push(s), s;
    }
  }
  const St = (e) => (t, n = Ce) => {
    (!Dn || e === "sp") && Xr(e, (...r) => t(...r), n);
  }, Nu = St("bm"), Rt = St("m"), Ou = St("bu"), Iu = St("u"), Lu = St("bum"), qn = St("um"), Uu = St("sp"), Du = St("rtg"), Fu = St("rtc");
  function Bu(e, t = Ce) {
    Xr("ec", e, t);
  }
  const $u = /* @__PURE__ */ Symbol.for("v-ndc");
  function Ai(e, t, n, r) {
    let i;
    const s = n, o = W(e);
    if (o || _e(e)) {
      const a = o && Ft(e);
      let l = false, u = false;
      a && (l = !Ge(e), u = xt(e), e = Wr(e)), i = new Array(e.length);
      for (let c = 0, f = e.length; c < f; c++) i[c] = t(l ? u ? un(Ke(e[c])) : Ke(e[c]) : e[c], c, void 0, s);
    } else if (typeof e == "number") {
      i = new Array(e);
      for (let a = 0; a < e; a++) i[a] = t(a + 1, a, void 0, s);
    } else if (ue(e)) if (e[Symbol.iterator]) i = Array.from(e, (a, l) => t(a, l, void 0, s));
    else {
      const a = Object.keys(e);
      i = new Array(a.length);
      for (let l = 0, u = a.length; l < u; l++) {
        const c = a[l];
        i[l] = t(e[c], c, l, s);
      }
    }
    else i = [];
    return i;
  }
  const Ri = (e) => e ? Fa(e) ? Zr(e) : Ri(e.parent) : null, Rn = ye(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => Ri(e.parent),
    $root: (e) => Ri(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => va(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      as(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Kr.bind(e.proxy)),
    $watch: (e) => Mu.bind(e)
  }), li = (e, t) => e !== ie && !e.__isScriptSetup && oe(e, t), Vu = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: r, data: i, props: s, accessCache: o, type: a, appContext: l } = e;
      if (t[0] !== "$") {
        const h = o[t];
        if (h !== void 0) switch (h) {
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
          if (li(r, t)) return o[t] = 1, r[t];
          if (i !== ie && oe(i, t)) return o[t] = 2, i[t];
          if (oe(s, t)) return o[t] = 3, s[t];
          if (n !== ie && oe(n, t)) return o[t] = 4, n[t];
          ki && (o[t] = 0);
        }
      }
      const u = Rn[t];
      let c, f;
      if (u) return t === "$attrs" && Se(e.attrs, "get", ""), u(e);
      if ((c = a.__cssModules) && (c = c[t])) return c;
      if (n !== ie && oe(n, t)) return o[t] = 4, n[t];
      if (f = l.config.globalProperties, oe(f, t)) return f[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: i, ctx: s } = e;
      return li(i, t) ? (i[t] = n, true) : r !== ie && oe(r, t) ? (r[t] = n, true) : oe(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (s[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, props: s, type: o } }, a) {
      let l;
      return !!(n[a] || e !== ie && a[0] !== "$" && oe(e, a) || li(t, a) || oe(s, a) || oe(r, a) || oe(Rn, a) || oe(i.config.globalProperties, a) || (l = o.__cssModules) && l[a]);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : oe(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function xr(e) {
    return W(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  function cs(e, t) {
    return !e || !t ? e || t : W(e) && W(t) ? e.concat(t) : ye({}, xr(e), xr(t));
  }
  let ki = true;
  function zu(e) {
    const t = va(e), n = e.proxy, r = e.ctx;
    ki = false, t.beforeCreate && Us(t.beforeCreate, e, "bc");
    const { data: i, computed: s, methods: o, watch: a, provide: l, inject: u, created: c, beforeMount: f, mounted: h, beforeUpdate: d, updated: b, activated: y, deactivated: L, beforeDestroy: V, beforeUnmount: U, destroyed: $, unmounted: _, render: w, renderTracked: I, renderTriggered: z, errorCaptured: X, serverPrefetch: Q, expose: q, inheritAttrs: j, components: F, directives: te, filters: ce } = t;
    if (u && Gu(u, r, null), o) for (const A in o) {
      const B = o[A];
      Z(B) && (r[A] = B.bind(n));
    }
    if (i) {
      const A = i.call(n, n);
      ue(A) && (e.data = is(A));
    }
    if (ki = true, s) for (const A in s) {
      const B = s[A], J = Z(B) ? B.bind(n, n) : Z(B.get) ? B.get.bind(n, n) : rt, C = !Z(B) && Z(B.set) ? B.set.bind(n) : rt, m = we({
        get: J,
        set: C
      });
      Object.defineProperty(r, A, {
        enumerable: true,
        configurable: true,
        get: () => m.value,
        set: (E) => m.value = E
      });
    }
    if (a) for (const A in a) ma(a[A], r, n, A);
    if (l) {
      const A = Z(l) ? l.call(n) : l;
      Reflect.ownKeys(A).forEach((B) => {
        xu(B, A[B]);
      });
    }
    c && Us(c, e, "c");
    function N(A, B) {
      W(B) ? B.forEach((J) => A(J.bind(n))) : B && A(B.bind(n));
    }
    if (N(Nu, f), N(Rt, h), N(Ou, d), N(Iu, b), N(Au, y), N(Ru, L), N(Bu, X), N(Fu, I), N(Du, z), N(Lu, U), N(qn, _), N(Uu, Q), W(q)) if (q.length) {
      const A = e.exposed || (e.exposed = {});
      q.forEach((B) => {
        Object.defineProperty(A, B, {
          get: () => n[B],
          set: (J) => n[B] = J,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    w && e.render === rt && (e.render = w), j != null && (e.inheritAttrs = j), F && (e.components = F), te && (e.directives = te), Q && ha(e);
  }
  function Gu(e, t, n = rt) {
    W(e) && (e = Ni(e));
    for (const r in e) {
      const i = e[r];
      let s;
      ue(i) ? "default" in i ? s = lr(i.from || r, i.default, true) : s = lr(i.from || r) : s = lr(i), Me(s) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => s.value,
        set: (o) => s.value = o
      }) : t[r] = s;
    }
  }
  function Us(e, t, n) {
    lt(W(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function ma(e, t, n, r) {
    let i = r.includes(".") ? da(n, r) : () => n[r];
    if (_e(e)) {
      const s = t[e];
      Z(s) && Bt(i, s);
    } else if (Z(e)) Bt(i, e.bind(n));
    else if (ue(e)) if (W(e)) e.forEach((s) => ma(s, t, n, r));
    else {
      const s = Z(e.handler) ? e.handler.bind(n) : t[e.handler];
      Z(s) && Bt(i, s, e);
    }
  }
  function va(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: i, optionsCache: s, config: { optionMergeStrategies: o } } = e.appContext, a = s.get(t);
    let l;
    return a ? l = a : !i.length && !n && !r ? l = t : (l = {}, i.length && i.forEach((u) => wr(l, u, o, true)), wr(l, t, o)), ue(t) && s.set(t, l), l;
  }
  function wr(e, t, n, r = false) {
    const { mixins: i, extends: s } = t;
    s && wr(e, s, n, true), i && i.forEach((o) => wr(e, o, n, true));
    for (const o in t) if (!(r && o === "expose")) {
      const a = Hu[o] || n && n[o];
      e[o] = a ? a(e[o], t[o]) : t[o];
    }
    return e;
  }
  const Hu = {
    data: Ds,
    props: Fs,
    emits: Fs,
    methods: xn,
    computed: xn,
    beforeCreate: Ee,
    created: Ee,
    beforeMount: Ee,
    mounted: Ee,
    beforeUpdate: Ee,
    updated: Ee,
    beforeDestroy: Ee,
    beforeUnmount: Ee,
    destroyed: Ee,
    unmounted: Ee,
    activated: Ee,
    deactivated: Ee,
    errorCaptured: Ee,
    serverPrefetch: Ee,
    components: xn,
    directives: xn,
    watch: qu,
    provide: Ds,
    inject: Wu
  };
  function Ds(e, t) {
    return t ? e ? function() {
      return ye(Z(e) ? e.call(this, this) : e, Z(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function Wu(e, t) {
    return xn(Ni(e), Ni(t));
  }
  function Ni(e) {
    if (W(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
      return t;
    }
    return e;
  }
  function Ee(e, t) {
    return e ? [
      ...new Set([].concat(e, t))
    ] : t;
  }
  function xn(e, t) {
    return e ? ye(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function Fs(e, t) {
    return e ? W(e) && W(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : ye(/* @__PURE__ */ Object.create(null), xr(e), xr(t ?? {})) : t;
  }
  function qu(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = ye(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = Ee(e[r], t[r]);
    return n;
  }
  function _a() {
    return {
      app: null,
      config: {
        isNativeTag: Uo,
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
  let Ku = 0;
  function Xu(e, t) {
    return function(r, i = null) {
      Z(r) || (r = ye({}, r)), i != null && !ue(i) && (i = null);
      const s = _a(), o = /* @__PURE__ */ new WeakSet(), a = [];
      let l = false;
      const u = s.app = {
        _uid: Ku++,
        _component: r,
        _props: i,
        _container: null,
        _context: s,
        _instance: null,
        version: Tc,
        get config() {
          return s.config;
        },
        set config(c) {
        },
        use(c, ...f) {
          return o.has(c) || (c && Z(c.install) ? (o.add(c), c.install(u, ...f)) : Z(c) && (o.add(c), c(u, ...f))), u;
        },
        mixin(c) {
          return s.mixins.includes(c) || s.mixins.push(c), u;
        },
        component(c, f) {
          return f ? (s.components[c] = f, u) : s.components[c];
        },
        directive(c, f) {
          return f ? (s.directives[c] = f, u) : s.directives[c];
        },
        mount(c, f, h) {
          if (!l) {
            const d = u._ceVNode || Le(r, i);
            return d.appContext = s, h === true ? h = "svg" : h === false && (h = void 0), e(d, c, h), l = true, u._container = c, c.__vue_app__ = u, Zr(d.component);
          }
        },
        onUnmount(c) {
          a.push(c);
        },
        unmount() {
          l && (lt(a, u._instance, 16), e(null, u._container), delete u._container.__vue_app__);
        },
        provide(c, f) {
          return s.provides[c] = f, u;
        },
        runWithContext(c) {
          const f = rn;
          rn = u;
          try {
            return c();
          } finally {
            rn = f;
          }
        }
      };
      return u;
    };
  }
  let rn = null;
  function vt(e, t, n = ie) {
    const r = Da(), i = _t(t), s = Ct(t), o = ba(e, i), a = du((l, u) => {
      let c, f = ie, h;
      return Tu(() => {
        const d = e[i];
        Ie(c, d) && (c = d, u());
      }), {
        get() {
          return l(), n.get ? n.get(c) : c;
        },
        set(d) {
          const b = n.set ? n.set(d) : d;
          if (!Ie(b, c) && !(f !== ie && Ie(d, f))) return;
          const y = r.vnode.props;
          y && (t in y || i in y || s in y) && (`onUpdate:${t}` in y || `onUpdate:${i}` in y || `onUpdate:${s}` in y) || (c = d, u()), r.emit(`update:${t}`, b), Ie(d, b) && Ie(d, f) && !Ie(b, h) && u(), f = d, h = b;
        }
      };
    });
    return a[Symbol.iterator] = () => {
      let l = 0;
      return {
        next() {
          return l < 2 ? {
            value: l++ ? o || ie : a,
            done: false
          } : {
            done: true
          };
        }
      };
    }, a;
  }
  const ba = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${_t(t)}Modifiers`] || e[`${Ct(t)}Modifiers`];
  function ju(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || ie;
    let i = n;
    const s = t.startsWith("update:"), o = s && ba(r, t.slice(7));
    o && (o.trim && (i = n.map((c) => _e(c) ? c.trim() : c)), o.number && (i = n.map(Qi)));
    let a, l = r[a = ri(t)] || r[a = ri(_t(t))];
    !l && s && (l = r[a = ri(Ct(t))]), l && lt(l, e, 6, i);
    const u = r[a + "Once"];
    if (u) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[a]) return;
      e.emitted[a] = true, lt(u, e, 6, i);
    }
  }
  const Yu = /* @__PURE__ */ new WeakMap();
  function ya(e, t, n = false) {
    const r = n ? Yu : t.emitsCache, i = r.get(e);
    if (i !== void 0) return i;
    const s = e.emits;
    let o = {}, a = false;
    if (!Z(e)) {
      const l = (u) => {
        const c = ya(u, t, true);
        c && (a = true, ye(o, c));
      };
      !n && t.mixins.length && t.mixins.forEach(l), e.extends && l(e.extends), e.mixins && e.mixins.forEach(l);
    }
    return !s && !a ? (ue(e) && r.set(e, null), null) : (W(s) ? s.forEach((l) => o[l] = null) : ye(o, s), ue(e) && r.set(e, o), o);
  }
  function jr(e, t) {
    return !e || !Br(t) ? false : (t = t.slice(2).replace(/Once$/, ""), oe(e, t[0].toLowerCase() + t.slice(1)) || oe(e, Ct(t)) || oe(e, t));
  }
  function Bs(e) {
    const { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [s], slots: o, attrs: a, emit: l, render: u, renderCache: c, props: f, data: h, setupState: d, ctx: b, inheritAttrs: y } = e, L = br(e);
    let V, U;
    try {
      if (n.shapeFlag & 4) {
        const _ = i || r, w = _;
        V = tt(u.call(w, _, c, f, d, h, b)), U = a;
      } else {
        const _ = t;
        V = tt(_.length > 1 ? _(f, {
          attrs: a,
          slots: o,
          emit: l
        }) : _(f, null)), U = t.props ? a : Zu(a);
      }
    } catch (_) {
      kn.length = 0, qr(_, e, 1), V = Le(Pt);
    }
    let $ = V;
    if (U && y !== false) {
      const _ = Object.keys(U), { shapeFlag: w } = $;
      _.length && w & 7 && (s && _.some(Yi) && (U = Ju(U, s)), $ = cn($, U, false, true));
    }
    return n.dirs && ($ = cn($, null, false, true), $.dirs = $.dirs ? $.dirs.concat(n.dirs) : n.dirs), n.transition && us($, n.transition), V = $, br(L), V;
  }
  const Zu = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || Br(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Ju = (e, t) => {
    const n = {};
    for (const r in e) (!Yi(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function Qu(e, t, n) {
    const { props: r, children: i, component: s } = e, { props: o, children: a, patchFlag: l } = t, u = s.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && l >= 0) {
      if (l & 1024) return true;
      if (l & 16) return r ? $s(r, o, u) : !!o;
      if (l & 8) {
        const c = t.dynamicProps;
        for (let f = 0; f < c.length; f++) {
          const h = c[f];
          if (xa(o, r, h) && !jr(u, h)) return true;
        }
      }
    } else return (i || a) && (!a || !a.$stable) ? true : r === o ? false : r ? o ? $s(r, o, u) : true : !!o;
    return false;
  }
  function $s(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let i = 0; i < r.length; i++) {
      const s = r[i];
      if (xa(t, e, s) && !jr(n, s)) return true;
    }
    return false;
  }
  function xa(e, t, n) {
    const r = e[n], i = t[n];
    return n === "style" && ue(r) && ue(i) ? !Hn(r, i) : r !== i;
  }
  function ec({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const wa = {}, Sa = () => Object.create(wa), Ta = (e) => Object.getPrototypeOf(e) === wa;
  function tc(e, t, n, r = false) {
    const i = {}, s = Sa();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Ma(e, t, i, s);
    for (const o in e.propsOptions[0]) o in i || (i[o] = void 0);
    n ? e.props = r ? i : su(i) : e.type.props ? e.props = i : e.props = s, e.attrs = s;
  }
  function nc(e, t, n, r) {
    const { props: i, attrs: s, vnode: { patchFlag: o } } = e, a = re(i), [l] = e.propsOptions;
    let u = false;
    if ((r || o > 0) && !(o & 16)) {
      if (o & 8) {
        const c = e.vnode.dynamicProps;
        for (let f = 0; f < c.length; f++) {
          let h = c[f];
          if (jr(e.emitsOptions, h)) continue;
          const d = t[h];
          if (l) if (oe(s, h)) d !== s[h] && (s[h] = d, u = true);
          else {
            const b = _t(h);
            i[b] = Oi(l, a, b, d, e, false);
          }
          else d !== s[h] && (s[h] = d, u = true);
        }
      }
    } else {
      Ma(e, t, i, s) && (u = true);
      let c;
      for (const f in a) (!t || !oe(t, f) && ((c = Ct(f)) === f || !oe(t, c))) && (l ? n && (n[f] !== void 0 || n[c] !== void 0) && (i[f] = Oi(l, a, f, void 0, e, true)) : delete i[f]);
      if (s !== a) for (const f in s) (!t || !oe(t, f)) && (delete s[f], u = true);
    }
    u && gt(e.attrs, "set", "");
  }
  function Ma(e, t, n, r) {
    const [i, s] = e.propsOptions;
    let o = false, a;
    if (t) for (let l in t) {
      if (Mn(l)) continue;
      const u = t[l];
      let c;
      i && oe(i, c = _t(l)) ? !s || !s.includes(c) ? n[c] = u : (a || (a = {}))[c] = u : jr(e.emitsOptions, l) || (!(l in r) || u !== r[l]) && (r[l] = u, o = true);
    }
    if (s) {
      const l = re(n), u = a || ie;
      for (let c = 0; c < s.length; c++) {
        const f = s[c];
        n[f] = Oi(i, l, f, u[f], e, !oe(u, f));
      }
    }
    return o;
  }
  function Oi(e, t, n, r, i, s) {
    const o = e[n];
    if (o != null) {
      const a = oe(o, "default");
      if (a && r === void 0) {
        const l = o.default;
        if (o.type !== Function && !o.skipFactory && Z(l)) {
          const { propsDefaults: u } = i;
          if (n in u) r = u[n];
          else {
            const c = Kn(i);
            r = u[n] = l.call(null, t), c();
          }
        } else r = l;
        i.ce && i.ce._setProp(n, r);
      }
      o[0] && (s && !a ? r = false : o[1] && (r === "" || r === Ct(n)) && (r = true));
    }
    return r;
  }
  const rc = /* @__PURE__ */ new WeakMap();
  function Ea(e, t, n = false) {
    const r = n ? rc : t.propsCache, i = r.get(e);
    if (i) return i;
    const s = e.props, o = {}, a = [];
    let l = false;
    if (!Z(e)) {
      const c = (f) => {
        l = true;
        const [h, d] = Ea(f, t, true);
        ye(o, h), d && a.push(...d);
      };
      !n && t.mixins.length && t.mixins.forEach(c), e.extends && c(e.extends), e.mixins && e.mixins.forEach(c);
    }
    if (!s && !l) return ue(e) && r.set(e, en), en;
    if (W(s)) for (let c = 0; c < s.length; c++) {
      const f = _t(s[c]);
      Vs(f) && (o[f] = ie);
    }
    else if (s) for (const c in s) {
      const f = _t(c);
      if (Vs(f)) {
        const h = s[c], d = o[f] = W(h) || Z(h) ? {
          type: h
        } : ye({}, h), b = d.type;
        let y = false, L = true;
        if (W(b)) for (let V = 0; V < b.length; ++V) {
          const U = b[V], $ = Z(U) && U.name;
          if ($ === "Boolean") {
            y = true;
            break;
          } else $ === "String" && (L = false);
        }
        else y = Z(b) && b.name === "Boolean";
        d[0] = y, d[1] = L, (y || oe(d, "default")) && a.push(f);
      }
    }
    const u = [
      o,
      a
    ];
    return ue(e) && r.set(e, u), u;
  }
  function Vs(e) {
    return e[0] !== "$" && !Mn(e);
  }
  const fs = (e) => e === "_" || e === "_ctx" || e === "$stable", ds = (e) => W(e) ? e.map(tt) : [
    tt(e)
  ], ic = (e, t, n) => {
    if (t._n) return t;
    const r = yu((...i) => ds(t(...i)), n);
    return r._c = false, r;
  }, Pa = (e, t, n) => {
    const r = e._ctx;
    for (const i in e) {
      if (fs(i)) continue;
      const s = e[i];
      if (Z(s)) t[i] = ic(i, s, r);
      else if (s != null) {
        const o = ds(s);
        t[i] = () => o;
      }
    }
  }, Ca = (e, t) => {
    const n = ds(t);
    e.slots.default = () => n;
  }, Aa = (e, t, n) => {
    for (const r in t) (n || !fs(r)) && (e[r] = t[r]);
  }, sc = (e, t, n) => {
    const r = e.slots = Sa();
    if (e.vnode.shapeFlag & 32) {
      const i = t._;
      i ? (Aa(r, t, n), n && Vo(r, "_", i, true)) : Pa(t, r);
    } else t && Ca(e, t);
  }, oc = (e, t, n) => {
    const { vnode: r, slots: i } = e;
    let s = true, o = ie;
    if (r.shapeFlag & 32) {
      const a = t._;
      a ? n && a === 1 ? s = false : Aa(i, t, n) : (s = !t.$stable, Pa(t, i)), o = t;
    } else t && (Ca(e, t), o = {
      default: 1
    });
    if (s) for (const a in i) !fs(a) && o[a] == null && delete i[a];
  }, ke = fc;
  function ac(e) {
    return lc(e);
  }
  function lc(e, t) {
    const n = zr();
    n.__VUE__ = true;
    const { insert: r, remove: i, patchProp: s, createElement: o, createText: a, createComment: l, setText: u, setElementText: c, parentNode: f, nextSibling: h, setScopeId: d = rt, insertStaticContent: b } = e, y = (p, g, x, P = null, S = null, T = null, O = void 0, k = null, R = !!g.dynamicChildren) => {
      if (p === g) return;
      p && !_n(p, g) && (P = Wt(p), E(p, S, T, true), p = null), g.patchFlag === -2 && (R = false, g.dynamicChildren = null);
      const { type: M, ref: H, shapeFlag: D } = g;
      switch (M) {
        case Yr:
          L(p, g, x, P);
          break;
        case Pt:
          V(p, g, x, P);
          break;
        case ci:
          p == null && U(g, x, P, O);
          break;
        case Ve:
          F(p, g, x, P, S, T, O, k, R);
          break;
        default:
          D & 1 ? w(p, g, x, P, S, T, O, k, R) : D & 6 ? te(p, g, x, P, S, T, O, k, R) : (D & 64 || D & 128) && M.process(p, g, x, P, S, T, O, k, R, gn);
      }
      H != null && S ? Cn(H, p && p.ref, T, g || p, !g) : H == null && p && p.ref != null && Cn(p.ref, null, T, p, true);
    }, L = (p, g, x, P) => {
      if (p == null) r(g.el = a(g.children), x, P);
      else {
        const S = g.el = p.el;
        g.children !== p.children && u(S, g.children);
      }
    }, V = (p, g, x, P) => {
      p == null ? r(g.el = l(g.children || ""), x, P) : g.el = p.el;
    }, U = (p, g, x, P) => {
      [p.el, p.anchor] = b(p.children, g, x, P, p.el, p.anchor);
    }, $ = ({ el: p, anchor: g }, x, P) => {
      let S;
      for (; p && p !== g; ) S = h(p), r(p, x, P), p = S;
      r(g, x, P);
    }, _ = ({ el: p, anchor: g }) => {
      let x;
      for (; p && p !== g; ) x = h(p), i(p), p = x;
      i(g);
    }, w = (p, g, x, P, S, T, O, k, R) => {
      if (g.type === "svg" ? O = "svg" : g.type === "math" && (O = "mathml"), p == null) I(g, x, P, S, T, O, k, R);
      else {
        const M = p.el && p.el._isVueCE ? p.el : null;
        try {
          M && M._beginPatch(), Q(p, g, S, T, O, k, R);
        } finally {
          M && M._endPatch();
        }
      }
    }, I = (p, g, x, P, S, T, O, k) => {
      let R, M;
      const { props: H, shapeFlag: D, transition: G, dirs: Y } = p;
      if (R = p.el = o(p.type, T, H && H.is, H), D & 8 ? c(R, p.children) : D & 16 && X(p.children, R, null, P, S, ui(p, T), O, k), Y && kt(p, null, P, "created"), z(R, p, p.scopeId, O, P), H) {
        for (const fe in H) fe !== "value" && !Mn(fe) && s(R, fe, null, H[fe], T, P);
        "value" in H && s(R, "value", null, H.value, T), (M = H.onVnodeBeforeMount) && Qe(M, P, p);
      }
      Y && kt(p, null, P, "beforeMount");
      const ne = uc(S, G);
      ne && G.beforeEnter(R), r(R, g, x), ((M = H && H.onVnodeMounted) || ne || Y) && ke(() => {
        M && Qe(M, P, p), ne && G.enter(R), Y && kt(p, null, P, "mounted");
      }, S);
    }, z = (p, g, x, P, S) => {
      if (x && d(p, x), P) for (let T = 0; T < P.length; T++) d(p, P[T]);
      if (S) {
        let T = S.subTree;
        if (g === T || Oa(T.type) && (T.ssContent === g || T.ssFallback === g)) {
          const O = S.vnode;
          z(p, O, O.scopeId, O.slotScopeIds, S.parent);
        }
      }
    }, X = (p, g, x, P, S, T, O, k, R = 0) => {
      for (let M = R; M < p.length; M++) {
        const H = p[M] = k ? pt(p[M]) : tt(p[M]);
        y(null, H, g, x, P, S, T, O, k);
      }
    }, Q = (p, g, x, P, S, T, O) => {
      const k = g.el = p.el;
      let { patchFlag: R, dynamicChildren: M, dirs: H } = g;
      R |= p.patchFlag & 16;
      const D = p.props || ie, G = g.props || ie;
      let Y;
      if (x && Nt(x, false), (Y = G.onVnodeBeforeUpdate) && Qe(Y, x, g, p), H && kt(g, p, x, "beforeUpdate"), x && Nt(x, true), (D.innerHTML && G.innerHTML == null || D.textContent && G.textContent == null) && c(k, ""), M ? q(p.dynamicChildren, M, k, x, P, ui(g, S), T) : O || B(p, g, k, null, x, P, ui(g, S), T, false), R > 0) {
        if (R & 16) j(k, D, G, x, S);
        else if (R & 2 && D.class !== G.class && s(k, "class", null, G.class, S), R & 4 && s(k, "style", D.style, G.style, S), R & 8) {
          const ne = g.dynamicProps;
          for (let fe = 0; fe < ne.length; fe++) {
            const ae = ne[fe], Ae = D[ae], Re = G[ae];
            (Re !== Ae || ae === "value") && s(k, ae, Ae, Re, S, x);
          }
        }
        R & 1 && p.children !== g.children && c(k, g.children);
      } else !O && M == null && j(k, D, G, x, S);
      ((Y = G.onVnodeUpdated) || H) && ke(() => {
        Y && Qe(Y, x, g, p), H && kt(g, p, x, "updated");
      }, P);
    }, q = (p, g, x, P, S, T, O) => {
      for (let k = 0; k < g.length; k++) {
        const R = p[k], M = g[k], H = R.el && (R.type === Ve || !_n(R, M) || R.shapeFlag & 198) ? f(R.el) : x;
        y(R, M, H, null, P, S, T, O, true);
      }
    }, j = (p, g, x, P, S) => {
      if (g !== x) {
        if (g !== ie) for (const T in g) !Mn(T) && !(T in x) && s(p, T, g[T], null, S, P);
        for (const T in x) {
          if (Mn(T)) continue;
          const O = x[T], k = g[T];
          O !== k && T !== "value" && s(p, T, k, O, S, P);
        }
        "value" in x && s(p, "value", g.value, x.value, S);
      }
    }, F = (p, g, x, P, S, T, O, k, R) => {
      const M = g.el = p ? p.el : a(""), H = g.anchor = p ? p.anchor : a("");
      let { patchFlag: D, dynamicChildren: G, slotScopeIds: Y } = g;
      Y && (k = k ? k.concat(Y) : Y), p == null ? (r(M, x, P), r(H, x, P), X(g.children || [], x, H, S, T, O, k, R)) : D > 0 && D & 64 && G && p.dynamicChildren && p.dynamicChildren.length === G.length ? (q(p.dynamicChildren, G, x, S, T, O, k), (g.key != null || S && g === S.subTree) && Ra(p, g, true)) : B(p, g, x, H, S, T, O, k, R);
    }, te = (p, g, x, P, S, T, O, k, R) => {
      g.slotScopeIds = k, p == null ? g.shapeFlag & 512 ? S.ctx.activate(g, x, P, O, R) : ce(g, x, P, S, T, O, R) : xe(p, g, R);
    }, ce = (p, g, x, P, S, T, O) => {
      const k = p.component = _c(p, P, S);
      if (pa(p) && (k.ctx.renderer = gn), bc(k, false, O), k.asyncDep) {
        if (S && S.registerDep(k, N, O), !p.el) {
          const R = k.subTree = Le(Pt);
          V(null, R, g, x), p.placeholder = R.el;
        }
      } else N(k, p, g, x, S, T, O);
    }, xe = (p, g, x) => {
      const P = g.component = p.component;
      if (Qu(p, g, x)) if (P.asyncDep && !P.asyncResolved) {
        A(P, g, x);
        return;
      } else P.next = g, P.update();
      else g.el = p.el, P.vnode = g;
    }, N = (p, g, x, P, S, T, O) => {
      const k = () => {
        if (p.isMounted) {
          let { next: D, bu: G, u: Y, parent: ne, vnode: fe } = p;
          {
            const Ze = ka(p);
            if (Ze) {
              D && (D.el = fe.el, A(p, D, O)), Ze.asyncDep.then(() => {
                ke(() => {
                  p.isUnmounted || M();
                }, S);
              });
              return;
            }
          }
          let ae = D, Ae;
          Nt(p, false), D ? (D.el = fe.el, A(p, D, O)) : D = fe, G && ar(G), (Ae = D.props && D.props.onVnodeBeforeUpdate) && Qe(Ae, ne, D, fe), Nt(p, true);
          const Re = Bs(p), Ye = p.subTree;
          p.subTree = Re, y(Ye, Re, f(Ye.el), Wt(Ye), p, S, T), D.el = Re.el, ae === null && ec(p, Re.el), Y && ke(Y, S), (Ae = D.props && D.props.onVnodeUpdated) && ke(() => Qe(Ae, ne, D, fe), S);
        } else {
          let D;
          const { el: G, props: Y } = g, { bm: ne, m: fe, parent: ae, root: Ae, type: Re } = p, Ye = An(g);
          Nt(p, false), ne && ar(ne), !Ye && (D = Y && Y.onVnodeBeforeMount) && Qe(D, ae, g), Nt(p, true);
          {
            Ae.ce && Ae.ce._hasShadowRoot() && Ae.ce._injectChildStyle(Re);
            const Ze = p.subTree = Bs(p);
            y(null, Ze, x, P, p, S, T), g.el = Ze.el;
          }
          if (fe && ke(fe, S), !Ye && (D = Y && Y.onVnodeMounted)) {
            const Ze = g;
            ke(() => Qe(D, ae, Ze), S);
          }
          (g.shapeFlag & 256 || ae && An(ae.vnode) && ae.vnode.shapeFlag & 256) && p.a && ke(p.a, S), p.isMounted = true, g = x = P = null;
        }
      };
      p.scope.on();
      const R = p.effect = new qo(k);
      p.scope.off();
      const M = p.update = R.run.bind(R), H = p.job = R.runIfDirty.bind(R);
      H.i = p, H.id = p.uid, R.scheduler = () => as(H), Nt(p, true), M();
    }, A = (p, g, x) => {
      g.component = p;
      const P = p.vnode.props;
      p.vnode = g, p.next = null, nc(p, g.props, P, x), oc(p, g.children, x), bt(), Os(p), yt();
    }, B = (p, g, x, P, S, T, O, k, R = false) => {
      const M = p && p.children, H = p ? p.shapeFlag : 0, D = g.children, { patchFlag: G, shapeFlag: Y } = g;
      if (G > 0) {
        if (G & 128) {
          C(M, D, x, P, S, T, O, k, R);
          return;
        } else if (G & 256) {
          J(M, D, x, P, S, T, O, k, R);
          return;
        }
      }
      Y & 8 ? (H & 16 && $e(M, S, T), D !== M && c(x, D)) : H & 16 ? Y & 16 ? C(M, D, x, P, S, T, O, k, R) : $e(M, S, T, true) : (H & 8 && c(x, ""), Y & 16 && X(D, x, P, S, T, O, k, R));
    }, J = (p, g, x, P, S, T, O, k, R) => {
      p = p || en, g = g || en;
      const M = p.length, H = g.length, D = Math.min(M, H);
      let G;
      for (G = 0; G < D; G++) {
        const Y = g[G] = R ? pt(g[G]) : tt(g[G]);
        y(p[G], Y, x, null, S, T, O, k, R);
      }
      M > H ? $e(p, S, T, true, false, D) : X(g, x, P, S, T, O, k, R, D);
    }, C = (p, g, x, P, S, T, O, k, R) => {
      let M = 0;
      const H = g.length;
      let D = p.length - 1, G = H - 1;
      for (; M <= D && M <= G; ) {
        const Y = p[M], ne = g[M] = R ? pt(g[M]) : tt(g[M]);
        if (_n(Y, ne)) y(Y, ne, x, null, S, T, O, k, R);
        else break;
        M++;
      }
      for (; M <= D && M <= G; ) {
        const Y = p[D], ne = g[G] = R ? pt(g[G]) : tt(g[G]);
        if (_n(Y, ne)) y(Y, ne, x, null, S, T, O, k, R);
        else break;
        D--, G--;
      }
      if (M > D) {
        if (M <= G) {
          const Y = G + 1, ne = Y < H ? g[Y].el : P;
          for (; M <= G; ) y(null, g[M] = R ? pt(g[M]) : tt(g[M]), x, ne, S, T, O, k, R), M++;
        }
      } else if (M > G) for (; M <= D; ) E(p[M], S, T, true), M++;
      else {
        const Y = M, ne = M, fe = /* @__PURE__ */ new Map();
        for (M = ne; M <= G; M++) {
          const De = g[M] = R ? pt(g[M]) : tt(g[M]);
          De.key != null && fe.set(De.key, M);
        }
        let ae, Ae = 0;
        const Re = G - ne + 1;
        let Ye = false, Ze = 0;
        const mn = new Array(Re);
        for (M = 0; M < Re; M++) mn[M] = 0;
        for (M = Y; M <= D; M++) {
          const De = p[M];
          if (Ae >= Re) {
            E(De, S, T, true);
            continue;
          }
          let Je;
          if (De.key != null) Je = fe.get(De.key);
          else for (ae = ne; ae <= G; ae++) if (mn[ae - ne] === 0 && _n(De, g[ae])) {
            Je = ae;
            break;
          }
          Je === void 0 ? E(De, S, T, true) : (mn[Je - ne] = M + 1, Je >= Ze ? Ze = Je : Ye = true, y(De, g[Je], x, null, S, T, O, k, R), Ae++);
        }
        const Es = Ye ? cc(mn) : en;
        for (ae = Es.length - 1, M = Re - 1; M >= 0; M--) {
          const De = ne + M, Je = g[De], Ps = g[De + 1], Cs = De + 1 < H ? Ps.el || Na(Ps) : P;
          mn[M] === 0 ? y(null, Je, x, Cs, S, T, O, k, R) : Ye && (ae < 0 || M !== Es[ae] ? m(Je, x, Cs, 2) : ae--);
        }
      }
    }, m = (p, g, x, P, S = null) => {
      const { el: T, type: O, transition: k, children: R, shapeFlag: M } = p;
      if (M & 6) {
        m(p.component.subTree, g, x, P);
        return;
      }
      if (M & 128) {
        p.suspense.move(g, x, P);
        return;
      }
      if (M & 64) {
        O.move(p, g, x, gn);
        return;
      }
      if (O === Ve) {
        r(T, g, x);
        for (let D = 0; D < R.length; D++) m(R[D], g, x, P);
        r(p.anchor, g, x);
        return;
      }
      if (O === ci) {
        $(p, g, x);
        return;
      }
      if (P !== 2 && M & 1 && k) if (P === 0) k.beforeEnter(T), r(T, g, x), ke(() => k.enter(T), S);
      else {
        const { leave: D, delayLeave: G, afterLeave: Y } = k, ne = () => {
          p.ctx.isUnmounted ? i(T) : r(T, g, x);
        }, fe = () => {
          T._isLeaving && T[Cu](true), D(T, () => {
            ne(), Y && Y();
          });
        };
        G ? G(T, ne, fe) : fe();
      }
      else r(T, g, x);
    }, E = (p, g, x, P = false, S = false) => {
      const { type: T, props: O, ref: k, children: R, dynamicChildren: M, shapeFlag: H, patchFlag: D, dirs: G, cacheIndex: Y } = p;
      if (D === -2 && (S = false), k != null && (bt(), Cn(k, null, x, p, true), yt()), Y != null && (g.renderCache[Y] = void 0), H & 256) {
        g.ctx.deactivate(p);
        return;
      }
      const ne = H & 1 && G, fe = !An(p);
      let ae;
      if (fe && (ae = O && O.onVnodeBeforeUnmount) && Qe(ae, g, p), H & 6) je(p.component, x, P);
      else {
        if (H & 128) {
          p.suspense.unmount(x, P);
          return;
        }
        ne && kt(p, null, g, "beforeUnmount"), H & 64 ? p.type.remove(p, g, x, gn, P) : M && !M.hasOnce && (T !== Ve || D > 0 && D & 64) ? $e(M, g, x, false, true) : (T === Ve && D & 384 || !S && H & 16) && $e(R, g, x), P && me(p);
      }
      (fe && (ae = O && O.onVnodeUnmounted) || ne) && ke(() => {
        ae && Qe(ae, g, p), ne && kt(p, null, g, "unmounted");
      }, x);
    }, me = (p) => {
      const { type: g, el: x, anchor: P, transition: S } = p;
      if (g === Ve) {
        Ue(x, P);
        return;
      }
      if (g === ci) {
        _(p);
        return;
      }
      const T = () => {
        i(x), S && !S.persisted && S.afterLeave && S.afterLeave();
      };
      if (p.shapeFlag & 1 && S && !S.persisted) {
        const { leave: O, delayLeave: k } = S, R = () => O(x, T);
        k ? k(p.el, T, R) : R();
      } else T();
    }, Ue = (p, g) => {
      let x;
      for (; p !== g; ) x = h(p), i(p), p = x;
      i(g);
    }, je = (p, g, x) => {
      const { bum: P, scope: S, job: T, subTree: O, um: k, m: R, a: M } = p;
      zs(R), zs(M), P && ar(P), S.stop(), T && (T.flags |= 8, E(O, p, g, x)), k && ke(k, g), ke(() => {
        p.isUnmounted = true;
      }, g);
    }, $e = (p, g, x, P = false, S = false, T = 0) => {
      for (let O = T; O < p.length; O++) E(p[O], g, x, P, S);
    }, Wt = (p) => {
      if (p.shapeFlag & 6) return Wt(p.component.subTree);
      if (p.shapeFlag & 128) return p.suspense.next();
      const g = h(p.anchor || p.el), x = g && g[Eu];
      return x ? h(x) : g;
    };
    let pn = false;
    const Yn = (p, g, x) => {
      let P;
      p == null ? g._vnode && (E(g._vnode, null, null, true), P = g._vnode.component) : y(g._vnode || null, p, g, null, null, null, x), g._vnode = p, pn || (pn = true, Os(P), ua(), pn = false);
    }, gn = {
      p: y,
      um: E,
      m,
      r: me,
      mt: ce,
      mc: X,
      pc: B,
      pbc: q,
      n: Wt,
      o: e
    };
    return {
      render: Yn,
      hydrate: void 0,
      createApp: Xu(Yn)
    };
  }
  function ui({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function Nt({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function uc(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function Ra(e, t, n = false) {
    const r = e.children, i = t.children;
    if (W(r) && W(i)) for (let s = 0; s < r.length; s++) {
      const o = r[s];
      let a = i[s];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[s] = pt(i[s]), a.el = o.el), !n && a.patchFlag !== -2 && Ra(o, a)), a.type === Yr && (a.patchFlag === -1 && (a = i[s] = pt(a)), a.el = o.el), a.type === Pt && !a.el && (a.el = o.el);
    }
  }
  function cc(e) {
    const t = e.slice(), n = [
      0
    ];
    let r, i, s, o, a;
    const l = e.length;
    for (r = 0; r < l; r++) {
      const u = e[r];
      if (u !== 0) {
        if (i = n[n.length - 1], e[i] < u) {
          t[r] = i, n.push(r);
          continue;
        }
        for (s = 0, o = n.length - 1; s < o; ) a = s + o >> 1, e[n[a]] < u ? s = a + 1 : o = a;
        u < e[n[s]] && (s > 0 && (t[r] = n[s - 1]), n[s] = r);
      }
    }
    for (s = n.length, o = n[s - 1]; s-- > 0; ) n[s] = o, o = t[o];
    return n;
  }
  function ka(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : ka(t);
  }
  function zs(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  function Na(e) {
    if (e.placeholder) return e.placeholder;
    const t = e.component;
    return t ? Na(t.subTree) : null;
  }
  const Oa = (e) => e.__isSuspense;
  function fc(e, t) {
    t && t.pendingBranch ? W(e) ? t.effects.push(...e) : t.effects.push(e) : bu(e);
  }
  const Ve = /* @__PURE__ */ Symbol.for("v-fgt"), Yr = /* @__PURE__ */ Symbol.for("v-txt"), Pt = /* @__PURE__ */ Symbol.for("v-cmt"), ci = /* @__PURE__ */ Symbol.for("v-stc"), kn = [];
  let Fe = null;
  function le(e = false) {
    kn.push(Fe = e ? null : []);
  }
  function dc() {
    kn.pop(), Fe = kn[kn.length - 1] || null;
  }
  let Un = 1;
  function Gs(e, t = false) {
    Un += e, e < 0 && Fe && t && (Fe.hasOnce = true);
  }
  function Ia(e) {
    return e.dynamicChildren = Un > 0 ? Fe || en : null, dc(), Un > 0 && Fe && Fe.push(e), e;
  }
  function he(e, t, n, r, i, s) {
    return Ia(v(e, t, n, r, i, s, true));
  }
  function hs(e, t, n, r, i) {
    return Ia(Le(e, t, n, r, i, true));
  }
  function La(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function _n(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const Ua = ({ key: e }) => e ?? null, ur = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? _e(e) || Me(e) || Z(e) ? {
    i: ze,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function v(e, t = null, n = null, r = 0, i = null, s = e === Ve ? 0 : 1, o = false, a = false) {
    const l = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && Ua(t),
      ref: t && ur(t),
      scopeId: fa,
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
      ctx: ze
    };
    return a ? (ps(l, n), s & 128 && e.normalize(l)) : n && (l.shapeFlag |= _e(n) ? 8 : 16), Un > 0 && !o && Fe && (l.patchFlag > 0 || s & 6) && l.patchFlag !== 32 && Fe.push(l), l;
  }
  const Le = hc;
  function hc(e, t = null, n = null, r = 0, i = null, s = false) {
    if ((!e || e === $u) && (e = Pt), La(e)) {
      const a = cn(e, t, true);
      return n && ps(a, n), Un > 0 && !s && Fe && (a.shapeFlag & 6 ? Fe[Fe.indexOf(e)] = a : Fe.push(a)), a.patchFlag = -2, a;
    }
    if (Sc(e) && (e = e.__vccOpts), t) {
      t = pc(t);
      let { class: a, style: l } = t;
      a && !_e(a) && (t.class = Oe(a)), ue(l) && (os(l) && !W(l) && (l = ye({}, l)), t.style = Gr(l));
    }
    const o = _e(e) ? 1 : Oa(e) ? 128 : Pu(e) ? 64 : ue(e) ? 4 : Z(e) ? 2 : 0;
    return v(e, t, n, r, i, o, s, true);
  }
  function pc(e) {
    return e ? os(e) || Ta(e) ? ye({}, e) : e : null;
  }
  function cn(e, t, n = false, r = false) {
    const { props: i, ref: s, patchFlag: o, children: a, transition: l } = e, u = t ? gc(i || {}, t) : i, c = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: u,
      key: u && Ua(u),
      ref: t && t.ref ? n && s ? W(s) ? s.concat(ur(t)) : [
        s,
        ur(t)
      ] : ur(t) : s,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: a,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== Ve ? o === -1 ? 16 : o | 16 : o,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: l,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && cn(e.ssContent),
      ssFallback: e.ssFallback && cn(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return l && r && us(c, l.clone(c)), c;
  }
  function se(e = " ", t = 0) {
    return Le(Yr, null, e, t);
  }
  function Yt(e = "", t = false) {
    return t ? (le(), hs(Pt, null, e)) : Le(Pt, null, e);
  }
  function tt(e) {
    return e == null || typeof e == "boolean" ? Le(Pt) : W(e) ? Le(Ve, null, e.slice()) : La(e) ? pt(e) : Le(Yr, null, String(e));
  }
  function pt(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : cn(e);
  }
  function ps(e, t) {
    let n = 0;
    const { shapeFlag: r } = e;
    if (t == null) t = null;
    else if (W(t)) n = 16;
    else if (typeof t == "object") if (r & 65) {
      const i = t.default;
      i && (i._c && (i._d = false), ps(e, i()), i._c && (i._d = true));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !Ta(t) ? t._ctx = ze : i === 3 && ze && (ze.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else Z(t) ? (t = {
      default: t,
      _ctx: ze
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      se(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function gc(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const i in r) if (i === "class") t.class !== r.class && (t.class = Oe([
        t.class,
        r.class
      ]));
      else if (i === "style") t.style = Gr([
        t.style,
        r.style
      ]);
      else if (Br(i)) {
        const s = t[i], o = r[i];
        o && s !== o && !(W(s) && s.includes(o)) && (t[i] = s ? [].concat(s, o) : o);
      } else i !== "" && (t[i] = r[i]);
    }
    return t;
  }
  function Qe(e, t, n, r = null) {
    lt(e, t, 7, [
      n,
      r
    ]);
  }
  const mc = _a();
  let vc = 0;
  function _c(e, t, n) {
    const r = e.type, i = (t ? t.appContext : e.appContext) || mc, s = {
      uid: vc++,
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
      scope: new Bl(true),
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
      propsOptions: Ea(r, i),
      emitsOptions: ya(r, i),
      emit: null,
      emitted: null,
      propsDefaults: ie,
      inheritAttrs: r.inheritAttrs,
      ctx: ie,
      data: ie,
      props: ie,
      attrs: ie,
      slots: ie,
      refs: ie,
      setupState: ie,
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
    }, s.root = t ? t.root : s, s.emit = ju.bind(null, s), e.ce && e.ce(s), s;
  }
  let Ce = null;
  const Da = () => Ce || ze;
  let Sr, Ii;
  {
    const e = zr(), t = (n, r) => {
      let i;
      return (i = e[n]) || (i = e[n] = []), i.push(r), (s) => {
        i.length > 1 ? i.forEach((o) => o(s)) : i[0](s);
      };
    };
    Sr = t("__VUE_INSTANCE_SETTERS__", (n) => Ce = n), Ii = t("__VUE_SSR_SETTERS__", (n) => Dn = n);
  }
  const Kn = (e) => {
    const t = Ce;
    return Sr(e), e.scope.on(), () => {
      e.scope.off(), Sr(t);
    };
  }, Hs = () => {
    Ce && Ce.scope.off(), Sr(null);
  };
  function Fa(e) {
    return e.vnode.shapeFlag & 4;
  }
  let Dn = false;
  function bc(e, t = false, n = false) {
    t && Ii(t);
    const { props: r, children: i } = e.vnode, s = Fa(e);
    tc(e, r, s, t), sc(e, i, n || t);
    const o = s ? yc(e, t) : void 0;
    return t && Ii(false), o;
  }
  function yc(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Vu);
    const { setup: r } = n;
    if (r) {
      bt();
      const i = e.setupContext = r.length > 1 ? wc(e) : null, s = Kn(e), o = Wn(r, e, 0, [
        e.props,
        i
      ]), a = Do(o);
      if (yt(), s(), (a || e.sp) && !An(e) && ha(e), a) {
        if (o.then(Hs, Hs), t) return o.then((l) => {
          Ws(e, l);
        }).catch((l) => {
          qr(l, e, 0);
        });
        e.asyncDep = o;
      } else Ws(e, o);
    } else Ba(e);
  }
  function Ws(e, t, n) {
    Z(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : ue(t) && (e.setupState = oa(t)), Ba(e);
  }
  function Ba(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || rt);
    {
      const i = Kn(e);
      bt();
      try {
        zu(e);
      } finally {
        yt(), i();
      }
    }
  }
  const xc = {
    get(e, t) {
      return Se(e, "get", ""), e[t];
    }
  };
  function wc(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, xc),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function Zr(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(oa(ou(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in Rn) return Rn[n](e);
      },
      has(t, n) {
        return n in t || n in Rn;
      }
    })) : e.proxy;
  }
  function Sc(e) {
    return Z(e) && "__vccOpts" in e;
  }
  const we = (e, t) => pu(e, t, Dn), Tc = "3.5.28";
  let Li;
  const qs = typeof window < "u" && window.trustedTypes;
  if (qs) try {
    Li = qs.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const $a = Li ? (e) => Li.createHTML(e) : (e) => e, Mc = "http://www.w3.org/2000/svg", Ec = "http://www.w3.org/1998/Math/MathML", ht = typeof document < "u" ? document : null, Ks = ht && ht.createElement("template"), Pc = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const i = t === "svg" ? ht.createElementNS(Mc, e) : t === "mathml" ? ht.createElementNS(Ec, e) : n ? ht.createElement(e, {
        is: n
      }) : ht.createElement(e);
      return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
    },
    createText: (e) => ht.createTextNode(e),
    createComment: (e) => ht.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => ht.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, r, i, s) {
      const o = n ? n.previousSibling : t.lastChild;
      if (i && (i === s || i.nextSibling)) for (; t.insertBefore(i.cloneNode(true), n), !(i === s || !(i = i.nextSibling)); ) ;
      else {
        Ks.innerHTML = $a(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const a = Ks.content;
        if (r === "svg" || r === "mathml") {
          const l = a.firstChild;
          for (; l.firstChild; ) a.appendChild(l.firstChild);
          a.removeChild(l);
        }
        t.insertBefore(a, n);
      }
      return [
        o ? o.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild
      ];
    }
  }, Cc = /* @__PURE__ */ Symbol("_vtc");
  function Ac(e, t, n) {
    const r = e[Cc];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const Tr = /* @__PURE__ */ Symbol("_vod"), Va = /* @__PURE__ */ Symbol("_vsh"), fi = {
    name: "show",
    beforeMount(e, { value: t }, { transition: n }) {
      e[Tr] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : bn(e, t);
    },
    mounted(e, { value: t }, { transition: n }) {
      n && t && n.enter(e);
    },
    updated(e, { value: t, oldValue: n }, { transition: r }) {
      !t != !n && (r ? t ? (r.beforeEnter(e), bn(e, true), r.enter(e)) : r.leave(e, () => {
        bn(e, false);
      }) : bn(e, t));
    },
    beforeUnmount(e, { value: t }) {
      bn(e, t);
    }
  };
  function bn(e, t) {
    e.style.display = t ? e[Tr] : "none", e[Va] = !t;
  }
  const Rc = /* @__PURE__ */ Symbol(""), kc = /(?:^|;)\s*display\s*:/;
  function Nc(e, t, n) {
    const r = e.style, i = _e(n);
    let s = false;
    if (n && !i) {
      if (t) if (_e(t)) for (const o of t.split(";")) {
        const a = o.slice(0, o.indexOf(":")).trim();
        n[a] == null && cr(r, a, "");
      }
      else for (const o in t) n[o] == null && cr(r, o, "");
      for (const o in n) o === "display" && (s = true), cr(r, o, n[o]);
    } else if (i) {
      if (t !== n) {
        const o = r[Rc];
        o && (n += ";" + o), r.cssText = n, s = kc.test(n);
      }
    } else t && e.removeAttribute("style");
    Tr in e && (e[Tr] = s ? r.display : "", e[Va] && (r.display = "none"));
  }
  const Xs = /\s*!important$/;
  function cr(e, t, n) {
    if (W(n)) n.forEach((r) => cr(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = Oc(e, t);
      Xs.test(n) ? e.setProperty(Ct(r), n.replace(Xs, ""), "important") : e[r] = n;
    }
  }
  const js = [
    "Webkit",
    "Moz",
    "ms"
  ], di = {};
  function Oc(e, t) {
    const n = di[t];
    if (n) return n;
    let r = _t(t);
    if (r !== "filter" && r in e) return di[t] = r;
    r = $o(r);
    for (let i = 0; i < js.length; i++) {
      const s = js[i] + r;
      if (s in e) return di[t] = s;
    }
    return t;
  }
  const Ys = "http://www.w3.org/1999/xlink";
  function Zs(e, t, n, r, i, s = Dl(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Ys, t.slice(6, t.length)) : e.setAttributeNS(Ys, t, n) : n == null || s && !zo(n) ? e.removeAttribute(t) : e.setAttribute(t, s ? "" : at(n) ? String(n) : n);
  }
  function Js(e, t, n, r, i) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? $a(n) : n);
      return;
    }
    const s = e.tagName;
    if (t === "value" && s !== "PROGRESS" && !s.includes("-")) {
      const a = s === "OPTION" ? e.getAttribute("value") || "" : e.value, l = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
      (a !== l || !("_value" in e)) && (e.value = l), n == null && e.removeAttribute(t), e._value = n;
      return;
    }
    let o = false;
    if (n === "" || n == null) {
      const a = typeof e[t];
      a === "boolean" ? n = zo(n) : n == null && a === "string" ? (n = "", o = true) : a === "number" && (n = 0, o = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    o && e.removeAttribute(i || t);
  }
  function Lt(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function Ic(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const Qs = /* @__PURE__ */ Symbol("_vei");
  function Lc(e, t, n, r, i = null) {
    const s = e[Qs] || (e[Qs] = {}), o = s[t];
    if (r && o) o.value = r;
    else {
      const [a, l] = Uc(t);
      if (r) {
        const u = s[t] = Bc(r, i);
        Lt(e, a, u, l);
      } else o && (Ic(e, a, o, l), s[t] = void 0);
    }
  }
  const eo = /(?:Once|Passive|Capture)$/;
  function Uc(e) {
    let t;
    if (eo.test(e)) {
      t = {};
      let r;
      for (; r = e.match(eo); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : Ct(e.slice(2)),
      t
    ];
  }
  let hi = 0;
  const Dc = Promise.resolve(), Fc = () => hi || (Dc.then(() => hi = 0), hi = Date.now());
  function Bc(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      lt($c(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = Fc(), n;
  }
  function $c(e, t) {
    if (W(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (i) => !i._stopped && r && r(i));
    } else return t;
  }
  const to = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Vc = (e, t, n, r, i, s) => {
    const o = i === "svg";
    t === "class" ? Ac(e, r, o) : t === "style" ? Nc(e, n, r) : Br(t) ? Yi(t) || Lc(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : zc(e, t, r, o)) ? (Js(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Zs(e, t, r, o, s, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !_e(r)) ? Js(e, _t(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), Zs(e, t, r, o));
  };
  function zc(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && to(t) && Z(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const i = e.tagName;
      if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE") return false;
    }
    return to(t) && _e(n) ? false : t in e;
  }
  const Mr = (e) => {
    const t = e.props["onUpdate:modelValue"] || false;
    return W(t) ? (n) => ar(t, n) : t;
  };
  function Gc(e) {
    e.target.composing = true;
  }
  function no(e) {
    const t = e.target;
    t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
  }
  const sn = /* @__PURE__ */ Symbol("_assign");
  function ro(e, t, n) {
    return t && (e = e.trim()), n && (e = Qi(e)), e;
  }
  const ft = {
    created(e, { modifiers: { lazy: t, trim: n, number: r } }, i) {
      e[sn] = Mr(i);
      const s = r || i.props && i.props.type === "number";
      Lt(e, t ? "change" : "input", (o) => {
        o.target.composing || e[sn](ro(e.value, n, s));
      }), (n || s) && Lt(e, "change", () => {
        e.value = ro(e.value, n, s);
      }), t || (Lt(e, "compositionstart", Gc), Lt(e, "compositionend", no), Lt(e, "change", no));
    },
    mounted(e, { value: t }) {
      e.value = t ?? "";
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: i, number: s } }, o) {
      if (e[sn] = Mr(o), e.composing) return;
      const a = (s || e.type === "number") && !/^0\d/.test(e.value) ? Qi(e.value) : e.value, l = t ?? "";
      a !== l && (document.activeElement === e && e.type !== "range" && (r && t === n || i && e.value.trim() === l) || (e.value = l));
    }
  }, Ot = {
    deep: true,
    created(e, t, n) {
      e[sn] = Mr(n), Lt(e, "change", () => {
        const r = e._modelValue, i = Hc(e), s = e.checked, o = e[sn];
        if (W(r)) {
          const a = Go(r, i), l = a !== -1;
          if (s && !l) o(r.concat(i));
          else if (!s && l) {
            const u = [
              ...r
            ];
            u.splice(a, 1), o(u);
          }
        } else if ($r(r)) {
          const a = new Set(r);
          s ? a.add(i) : a.delete(i), o(a);
        } else o(za(e, s));
      });
    },
    mounted: io,
    beforeUpdate(e, t, n) {
      e[sn] = Mr(n), io(e, t, n);
    }
  };
  function io(e, { value: t, oldValue: n }, r) {
    e._modelValue = t;
    let i;
    if (W(t)) i = Go(t, r.props.value) > -1;
    else if ($r(t)) i = t.has(r.props.value);
    else {
      if (t === n) return;
      i = Hn(t, za(e, true));
    }
    e.checked !== i && (e.checked = i);
  }
  function Hc(e) {
    return "_value" in e ? e._value : e.value;
  }
  function za(e, t) {
    const n = t ? "_trueValue" : "_falseValue";
    return n in e ? e[n] : t;
  }
  const Wc = [
    "ctrl",
    "shift",
    "alt",
    "meta"
  ], qc = {
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
    exact: (e, t) => Wc.some((n) => e[`${n}Key`] && !t.includes(n))
  }, so = (e, t) => {
    if (!e) return e;
    const n = e._withMods || (e._withMods = {}), r = t.join(".");
    return n[r] || (n[r] = ((i, ...s) => {
      for (let o = 0; o < t.length; o++) {
        const a = qc[t[o]];
        if (a && a(i, t)) return;
      }
      return e(i, ...s);
    }));
  }, Kc = ye({
    patchProp: Vc
  }, Pc);
  let oo;
  function Xc() {
    return oo || (oo = ac(Kc));
  }
  const jc = ((...e) => {
    const t = Xc().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const i = Zc(r);
      if (!i) return;
      const s = t._component;
      !Z(s) && !s.render && !s.template && (s.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
      const o = n(i, false, Yc(i));
      return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), o;
    }, t;
  });
  function Yc(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function Zc(e) {
    return _e(e) ? document.querySelector(e) : e;
  }
  const Jc = `struct MandelbrotStep {
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
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var rawIn: texture_2d<f32>;

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

// Fragment shader
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn cdiv(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  let denominator: f32 = b.x * b.x + b.y * b.y;
  return vec2<f32>((a.x * b.x + a.y * b.y) / denominator, (a.y * b.x - a.x * b.y) / denominator);
}

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

fn mandelbrot_func(x0: f32, y0: f32) -> vec4<f32> {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  var z = getOrbit(0);
  var dz = vec2<f32>(0.0, 0.0);
  var der = vec2<f32>(1.0, 0.0);
  var i = 0.0;
  var ref_i = 0;
  let muLimit = mandelbrot.mu;
  var d = vec2<f32>(1.0, 0.0);
  let epsilon = mandelbrot.epsilon;

  while (i < max_iteration) {
    z = getOrbit(ref_i);
    dz = 2.0 * cmul(dz, z) + cmul(dz, dz) + dc;
    ref_i += 1;

    z = getOrbit(ref_i) + dz;
    d = cdiv(der, z);

    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      break;
    }
    if (dot(der, der) < epsilon) {
      // Keep negative values reserved for sentinels.
      // Treat this case as "inside" (nu == 0.0).
      i = 0.0;
      break;
    }
    der = cmul(der * 2.0, z);

    let dot_dz = dot(dz, dz);
    if (dot_z < dot_dz || f32(ref_i) == max_iteration) {
      dz = z;
      ref_i = 0;
    }
    i += 1.0;
  }

  if (i >= max_iteration) {
    i = 0.0;
  } else {
    if (i >= 0.0) {
      let log_zn = log(dz.x * dz.x + dz.y * dz.y) / 2.0;
      let nu = log(log_zn / log(2.0)) / log(2.0);
      i = i + 1.0 - nu;
      i = abs(i);
    }
  }

  // Reserve negative values for progressive sentinels only.
  i = max(i, 0.0);

  let angle_der = atan2(d.y, d.x);
  let distance = dot(z, z) * 2.0 * log(dot(z, z)) / dot(d, d);
  return vec4<f32>(i, distance / (mandelbrot.scale * 1000.0), angle_der, length(dz));
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<i32>(textureDimensions(rawIn, 0));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  let prev = textureLoad(rawIn, coord, 0);
  if (prev.x != -1.0) {
    // Pass-through already computed pixels and non -1 sentinels.
    return prev;
  }

  // Neutral mapping: the neutral texture is a square that can contain the rotated screen.
  // We map neutral uv -> local_rot (aspect is already applied on X) using the half-diagonal extent.
  // Rotation is applied later in the final color pass, so we generate the full local_rot domain here.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;

  let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
  let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;
  return mandelbrot_func(x0, y0);
}
`, Qc = `struct Uniforms {
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
  pad0: f32,
  pad1: f32,
  pad2: f32,
  pad3: f32,
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>; // resolved neutral texture
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

fn palette(v: f32, len: f32, zd: vec2<f32>, dx: f32, dy: f32) -> vec3<f32> {
  let d = vec2<f32>(cos(zd.x), sin(zd.x));
  let deep = v * 2.0;

  let tessColor = tile_tessellation(tileTex, deep + dx, deep + dy, parameters.tessellationLevel);
  let webCamColor = tile_tessellation(
    webcamTex,
    deep + dx + cos(parameters.time * 0.1),
    deep + dy + sin(parameters.time * 0.15),
    parameters.tessellationLevel + sin(parameters.time * 0.05)
  );
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let palettePhase = fract(deep / paletteRepeat + parameters.paletteOffset);
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
    let normal = normalize(vec3<f32>(d.y, d.x, 1.0));
    let lightDir = normalize(vec3<f32>(0.2, 0.3, 0.9));
    let viewDir = vec3<f32>(0.0, 0.6, 1.0);
    let diff = max(dot(normal, lightDir), 0.0);
    let ambient = 2.0;
    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(viewDir, reflectDir), 0.0), 1.0);
    var phong = ambient + 2.0 * diff + 1.0 * specular;

    if (parameters.activateSkybox == 1.0) {
      let skyboxDir = normalize(vec3<f32>(d.x, d.y, 1.0));
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
      color = color / phong * 3.0;
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

  let texSize = vec2<i32>(textureDimensions(tex, 0));
  let sampleCoord = vec2<i32>(
    i32(clamp(uv_neutral.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv_neutral.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );

  let data = textureLoad(tex, sampleCoord, 0);
  var nu = data.x;

  if (parameters.activateZebra == 1.0 && floor(nu) % 2.0 == 0.0) {
    // Zebra is a display option; keep negative reserved for sentinels.
    nu = 0.0;
  }

  // Distinguish "uncomputed" (sentinels) from the set interior (nu == 0).
  if (nu < 0.0) {
    let t = clamp((-nu) / 64.0, 0.0, 1.0);
    return vec4<f32>(0.15 + 0.35 * t, 0.0, 0.0, 1.0);
  }

  if (nu == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }

  if (parameters.activateSmoothness == 0.0) {
    nu = floor(nu);
  }

  let v = nu / 256.0;
  let color = palette(v, data.y, vec2<f32>(data.z, data.w), uv_neutral.x, uv_neutral.y);
  return vec4<f32>(color, 1.0);
}
`, ef = `// Brush pass: updates sentinel levels in the neutral square texture.
//
// Sentinels are stored in the red channel as negative integers:
//   -1  : needs Mandelbrot computation
//   -2  : needs resolve with step=2
//   -4  : needs resolve with step=4
//   ...
// We keep the rest of the pixel data unchanged for already-computed pixels.
//
// This pass outputs a new raw texture (ping-pong A -> B).

struct BrushUniforms {
  aspect: f32,
  angle: f32,
  clearHistory: f32,
  seedStep: f32,
  baseSentinel: f32,
  shiftTexX: f32,
  shiftTexY: f32,
  pad0: f32,
};

@group(0) @binding(0) var<uniform> uni: BrushUniforms;
@group(0) @binding(1) var prevRaw: texture_2d<f32>;

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
  // Neutral texture uses a square domain large enough to contain the rotated screen.
  // We work in "local" coordinates where the screen rectangle is:
  //   local.x in [-aspect, +aspect]
  //   local.y in [-1, +1]
  // The neutral square corresponds to the half-diagonal extent:
  //   neutralExtent = sqrt(aspect^2 + 1)
  let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate(local_rot, -uni.angle);
  let inside_x = abs(local.x) <= uni.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
}

fn refine_sentinel(s: f32, coord_out: vec2<i32>) -> f32 {
  // Progressively refine the neutral texture by creating new "anchor" points.
  //
  // Convention:
  //   s == -step (step is power-of-two)
  // Meaning:
  //   - the pixel is not computed yet
  //   - the resolve pass will snap to the parent at multiples of \`step\`
  //
  // To make resolve work at each refinement level, we must ensure the parent pixels
  // are themselves computed. We do that by turning pixels aligned with \`step/2\`
  // into -1 (compute request), while the others become -(step/2).
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
  // For step==2, \`next_step\` becomes 1, which makes everything an anchor.
  let is_anchor = (coord_out.x % next_step == 0) && (coord_out.y % next_step == 0);
  return select(-f32(next_step), -1.0, is_anchor);
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<i32>(textureDimensions(prevRaw, 0));
  let coord_out = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  // Full reset when needed: seed base sentinel everywhere,
  // and create anchors with -1 on a regular grid.
  if (uni.clearHistory >= 0.5) {
    let step = i32(max(1.0, uni.seedStep));
    let is_anchor = (coord_out.x % step == 0) && (coord_out.y % step == 0);
    let sentinel = select(-uni.baseSentinel, -1.0, is_anchor);
    return vec4<f32>(sentinel, 0.0, 0.0, 1.0);
  }

  // Translation reprojection: sample the previous texture at a shifted coordinate.
  // shiftTexX / shiftTexY are in texel units.
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let coord_in = coord_out - shift;

  // Outside previous texture: newly exposed area -> seed at -baseSentinel.
  // We keep processing it (ROI test + refinement) so we can create anchors immediately.
  var prev = vec4<f32>(-uni.baseSentinel, 0.0, 0.0, 1.0);
  if (!(coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y)) {
    prev = textureLoad(prevRaw, coord_in, 0);
  }

  // Outside ROI: keep reprojected previous as-is.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, (uv.y * 2.0 - 1.0));
  if (!is_inside_rotated_screen(xy_neutral)) {
    return prev;
  }

  // Inside ROI: if it's a sentinel, refine it and schedule new anchors.
  if (prev.x < 0.0) {
    let refined = refine_sentinel(prev.x, coord_out);
    return vec4<f32>(refined, prev.y, prev.z, prev.w);
  }

  // Already computed.
  return prev;
}
`, tf = `// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Sentinel convention:
//   If raw.x == -step (step is power-of-two), it will be resolved by sampling
//   the parent at (x & ~(step-1), y & ~(step-1)).

@group(0) @binding(0) var rawTex: texture_2d<f32>;

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

fn floor_power_of_two(step: u32) -> u32 {
  // Returns the greatest power-of-two <= step.
  if (step == 0u) {
    return 1u;
  }
  let msb_index = 31u - countLeadingZeros(step);
  return 1u << msb_index;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<u32>(textureDimensions(rawTex, 0));
  let x = u32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1u)));
  let y = u32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1u)));
  let coord = vec2<i32>(i32(x), i32(y));

  let v = textureLoad(rawTex, coord, 0);
  if (v.x >= 0.0) {
    return v;
  }

  // -1 should not remain, but if it does: keep it as a sentinel.
  let step_f = -v.x;
  if (step_f <= 1.0) {
    return v;
  }

  let step_u = floor_power_of_two(u32(step_f));
  let mask = ~(step_u - 1u);
  let px = x & mask;
  let py = y & mask;

  let parent = textureLoad(rawTex, vec2<i32>(i32(px), i32(py)), 0);
  return parent;
}
`, nf = "" + new URL("mandelbrot_bg-6-A5Vb1U.wasm", import.meta.url).href, rf = async (e = {}, t) => {
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
  let K;
  function sf(e) {
    K = e;
  }
  function gs(e, t) {
    try {
      return e.apply(this, t);
    } catch (n) {
      let r = (function() {
        try {
          return n instanceof Error ? `${n.message}

Stack:
${n.stack}` : n.toString();
        } catch {
          return "<failed to stringify thrown value>";
        }
      })();
      throw console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", r), n;
    }
  }
  let er = null;
  function fr() {
    return (er === null || er.byteLength === 0) && (er = new Uint8Array(K.memory.buffer)), er;
  }
  let dr = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  dr.decode();
  const of = 2146435072;
  let pi = 0;
  function af(e, t) {
    return pi += t, pi >= of && (dr = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), dr.decode(), pi = t), dr.decode(fr().subarray(e, e + t));
  }
  function Ga(e, t) {
    return e = e >>> 0, af(e, t);
  }
  function pe(e) {
    if (typeof e != "number") throw new Error(`expected a number argument, found ${typeof e}`);
  }
  let Kt = null;
  function lf() {
    return (Kt === null || Kt.buffer.detached === true || Kt.buffer.detached === void 0 && Kt.buffer !== K.memory.buffer) && (Kt = new DataView(K.memory.buffer)), Kt;
  }
  function ao(e, t) {
    e = e >>> 0;
    const n = lf(), r = [];
    for (let i = e; i < e + 4 * t; i += 4) r.push(K.__wbindgen_export_0.get(n.getUint32(i, true)));
    return K.__externref_drop_slice(e, t), r;
  }
  let Et = 0;
  const Nn = new TextEncoder();
  "encodeInto" in Nn || (Nn.encodeInto = function(e, t) {
    const n = Nn.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  });
  function Xt(e, t, n) {
    if (typeof e != "string") throw new Error(`expected a string argument, found ${typeof e}`);
    if (n === void 0) {
      const a = Nn.encode(e), l = t(a.length, 1) >>> 0;
      return fr().subarray(l, l + a.length).set(a), Et = a.length, l;
    }
    let r = e.length, i = t(r, 1) >>> 0;
    const s = fr();
    let o = 0;
    for (; o < r; o++) {
      const a = e.charCodeAt(o);
      if (a > 127) break;
      s[i + o] = a;
    }
    if (o !== r) {
      o !== 0 && (e = e.slice(o)), i = n(i, r, r = o + e.length * 3, 1) >>> 0;
      const a = fr().subarray(i + o, i + r), l = Nn.encodeInto(e, a);
      if (l.read !== e.length) throw new Error("failed to pass whole string");
      o += l.written, i = n(i, r, o, 1) >>> 0;
    }
    return Et = o, i;
  }
  const lo = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => K.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  class Ui {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, lo.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      K.__wbg_mandelbrotnavigator_free(t, 0);
    }
    get_params() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr);
      const t = K.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = ao(t[0], t[1]).slice();
      return K.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    rotate_direct(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), K.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), K.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    get_reference_orbit_len() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return pe(this.__wbg_ptr), K.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    compute_reference_orbit_ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), pe(t);
      const n = K.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return Fn.__wrap(n);
    }
    get_reference_orbit_capacity() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return pe(this.__wbg_ptr), K.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    constructor(t, n, r, i) {
      const s = Xt(t, K.__wbindgen_malloc, K.__wbindgen_realloc), o = Et, a = Xt(n, K.__wbindgen_malloc, K.__wbindgen_realloc), l = Et, u = Xt(r, K.__wbindgen_malloc, K.__wbindgen_realloc), c = Et, f = K.mandelbrotnavigator_new(s, o, a, l, u, c, i);
      return this.__wbg_ptr = f >>> 0, lo.register(this, this.__wbg_ptr, this), this;
    }
    step() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr);
      const t = K.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = ao(t[0], t[1]).slice();
      return K.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    zoom(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), K.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    angle(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), K.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    scale(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr);
      const n = Xt(t, K.__wbindgen_malloc, K.__wbindgen_realloc), r = Et;
      K.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
    }
    origin(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr);
      const r = Xt(t, K.__wbindgen_malloc, K.__wbindgen_realloc), i = Et, s = Xt(n, K.__wbindgen_malloc, K.__wbindgen_realloc), o = Et;
      K.mandelbrotnavigator_origin(this.__wbg_ptr, r, i, s, o);
    }
    rotate(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), K.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), K.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
  }
  Symbol.dispose && (Ui.prototype[Symbol.dispose] = Ui.prototype.free);
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => K.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const uo = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => K.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class Fn {
    constructor() {
      throw new Error("cannot invoke `new` directly");
    }
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(Fn.prototype);
      return n.__wbg_ptr = t, uo.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, uo.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      K.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return pe(this.__wbg_ptr), K.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), pe(t), K.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return pe(this.__wbg_ptr), K.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), pe(t), K.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return pe(this.__wbg_ptr), K.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      pe(this.__wbg_ptr), pe(t), K.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  Symbol.dispose && (Fn.prototype[Symbol.dispose] = Fn.prototype.free);
  function uf() {
    return gs(function(e) {
      return Math.exp(e);
    }, arguments);
  }
  function cf() {
    return gs(function() {
      return Date.now();
    }, arguments);
  }
  function ff(e, t) {
    throw new Error(Ga(e, t));
  }
  function df() {
    return gs(function(e, t) {
      return Ga(e, t);
    }, arguments);
  }
  function hf() {
    const e = K.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  URL = globalThis.URL;
  const ee = await rf({
    "./mandelbrot_bg.js": {
      __wbg_now_1e80617bcee43265: cf,
      __wbg_exp_9293ded1248e1bd3: uf,
      __wbg_wbindgenthrow_451ec1a8469d7eb6: ff,
      __wbindgen_init_externref_table: hf,
      __wbindgen_cast_2241b6af4c4b2941: df
    }
  }, nf), Ha = ee.memory, pf = ee.__wbg_get_mandelbrotstep_dx, gf = ee.__wbg_get_mandelbrotstep_dy, mf = ee.__wbg_get_mandelbrotstep_zx, vf = ee.__wbg_get_mandelbrotstep_zy, _f = ee.__wbg_get_orbitbufferinfo_count, bf = ee.__wbg_get_orbitbufferinfo_offset, yf = ee.__wbg_get_orbitbufferinfo_ptr, xf = ee.__wbg_mandelbrotnavigator_free, wf = ee.__wbg_mandelbrotstep_free, Sf = ee.__wbg_orbitbufferinfo_free, Tf = ee.__wbg_set_mandelbrotstep_dx, Mf = ee.__wbg_set_mandelbrotstep_dy, Ef = ee.__wbg_set_mandelbrotstep_zx, Pf = ee.__wbg_set_mandelbrotstep_zy, Cf = ee.__wbg_set_orbitbufferinfo_count, Af = ee.__wbg_set_orbitbufferinfo_offset, Rf = ee.__wbg_set_orbitbufferinfo_ptr, kf = ee.mandelbrotnavigator_angle, Nf = ee.mandelbrotnavigator_compute_reference_orbit_ptr, Of = ee.mandelbrotnavigator_get_params, If = ee.mandelbrotnavigator_get_reference_orbit_capacity, Lf = ee.mandelbrotnavigator_get_reference_orbit_len, Uf = ee.mandelbrotnavigator_new, Df = ee.mandelbrotnavigator_origin, Ff = ee.mandelbrotnavigator_rotate, Bf = ee.mandelbrotnavigator_rotate_direct, $f = ee.mandelbrotnavigator_scale, Vf = ee.mandelbrotnavigator_step, zf = ee.mandelbrotnavigator_translate, Gf = ee.mandelbrotnavigator_translate_direct, Hf = ee.mandelbrotnavigator_zoom, Wf = ee.__wbindgen_export_0, qf = ee.__externref_drop_slice, Kf = ee.__wbindgen_free, Xf = ee.__wbindgen_malloc, jf = ee.__wbindgen_realloc, Wa = ee.__wbindgen_start, Yf = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: qf,
    __wbg_get_mandelbrotstep_dx: pf,
    __wbg_get_mandelbrotstep_dy: gf,
    __wbg_get_mandelbrotstep_zx: mf,
    __wbg_get_mandelbrotstep_zy: vf,
    __wbg_get_orbitbufferinfo_count: _f,
    __wbg_get_orbitbufferinfo_offset: bf,
    __wbg_get_orbitbufferinfo_ptr: yf,
    __wbg_mandelbrotnavigator_free: xf,
    __wbg_mandelbrotstep_free: wf,
    __wbg_orbitbufferinfo_free: Sf,
    __wbg_set_mandelbrotstep_dx: Tf,
    __wbg_set_mandelbrotstep_dy: Mf,
    __wbg_set_mandelbrotstep_zx: Ef,
    __wbg_set_mandelbrotstep_zy: Pf,
    __wbg_set_orbitbufferinfo_count: Cf,
    __wbg_set_orbitbufferinfo_offset: Af,
    __wbg_set_orbitbufferinfo_ptr: Rf,
    __wbindgen_export_0: Wf,
    __wbindgen_free: Kf,
    __wbindgen_malloc: Xf,
    __wbindgen_realloc: jf,
    __wbindgen_start: Wa,
    mandelbrotnavigator_angle: kf,
    mandelbrotnavigator_compute_reference_orbit_ptr: Nf,
    mandelbrotnavigator_get_params: Of,
    mandelbrotnavigator_get_reference_orbit_capacity: If,
    mandelbrotnavigator_get_reference_orbit_len: Lf,
    mandelbrotnavigator_new: Uf,
    mandelbrotnavigator_origin: Df,
    mandelbrotnavigator_rotate: Ff,
    mandelbrotnavigator_rotate_direct: Bf,
    mandelbrotnavigator_scale: $f,
    mandelbrotnavigator_step: Vf,
    mandelbrotnavigator_translate: zf,
    mandelbrotnavigator_translate_direct: Gf,
    mandelbrotnavigator_zoom: Hf,
    memory: Ha
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  sf(Yf);
  Wa();
  class Zf {
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
      const r = performance.now();
      if (r - this.lastDrawTime > 15) {
        if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        n.queue.copyExternalImageToTexture({
          source: this.video
        }, {
          texture: t
        }, [
          this.width,
          this.height
        ]), this.lastDrawTime = r;
      }
    }
    closeWebcam() {
      this.stream && (this.stream.getTracks().forEach((t) => t.stop()), this.stream = null);
    }
  }
  function Xn(e, t, n) {
    e.prototype = t.prototype = n, n.constructor = e;
  }
  function Jr(e, t) {
    var n = Object.create(e.prototype);
    for (var r in t) n[r] = t[r];
    return n;
  }
  function Ht() {
  }
  var Bn = 0.7, Er = 1 / Bn, on = "\\s*([+-]?\\d+)\\s*", $n = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", it = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", Jf = /^#([0-9a-f]{3,8})$/, Qf = new RegExp(`^rgb\\(${on},${on},${on}\\)$`), ed = new RegExp(`^rgb\\(${it},${it},${it}\\)$`), td = new RegExp(`^rgba\\(${on},${on},${on},${$n}\\)$`), nd = new RegExp(`^rgba\\(${it},${it},${it},${$n}\\)$`), rd = new RegExp(`^hsl\\(${$n},${it},${it}\\)$`), id = new RegExp(`^hsla\\(${$n},${it},${it},${$n}\\)$`), co = {
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
  Xn(Ht, Vt, {
    copy(e) {
      return Object.assign(new this.constructor(), this, e);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: fo,
    formatHex: fo,
    formatHex8: sd,
    formatHsl: od,
    formatRgb: ho,
    toString: ho
  });
  function fo() {
    return this.rgb().formatHex();
  }
  function sd() {
    return this.rgb().formatHex8();
  }
  function od() {
    return Ka(this).formatHsl();
  }
  function ho() {
    return this.rgb().formatRgb();
  }
  function Vt(e) {
    var t, n;
    return e = (e + "").trim().toLowerCase(), (t = Jf.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? po(t) : n === 3 ? new Te(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? tr(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? tr(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = Qf.exec(e)) ? new Te(t[1], t[2], t[3], 1) : (t = ed.exec(e)) ? new Te(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = td.exec(e)) ? tr(t[1], t[2], t[3], t[4]) : (t = nd.exec(e)) ? tr(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = rd.exec(e)) ? vo(t[1], t[2] / 100, t[3] / 100, 1) : (t = id.exec(e)) ? vo(t[1], t[2] / 100, t[3] / 100, t[4]) : co.hasOwnProperty(e) ? po(co[e]) : e === "transparent" ? new Te(NaN, NaN, NaN, 0) : null;
  }
  function po(e) {
    return new Te(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
  }
  function tr(e, t, n, r) {
    return r <= 0 && (e = t = n = NaN), new Te(e, t, n, r);
  }
  function qa(e) {
    return e instanceof Ht || (e = Vt(e)), e ? (e = e.rgb(), new Te(e.r, e.g, e.b, e.opacity)) : new Te();
  }
  function st(e, t, n, r) {
    return arguments.length === 1 ? qa(e) : new Te(e, t, n, r ?? 1);
  }
  function Te(e, t, n, r) {
    this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
  }
  Xn(Te, st, Jr(Ht, {
    brighter(e) {
      return e = e == null ? Er : Math.pow(Er, e), new Te(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? Bn : Math.pow(Bn, e), new Te(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new Te($t(this.r), $t(this.g), $t(this.b), Pr(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
    },
    hex: go,
    formatHex: go,
    formatHex8: ad,
    formatRgb: mo,
    toString: mo
  }));
  function go() {
    return `#${Ut(this.r)}${Ut(this.g)}${Ut(this.b)}`;
  }
  function ad() {
    return `#${Ut(this.r)}${Ut(this.g)}${Ut(this.b)}${Ut((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function mo() {
    const e = Pr(this.opacity);
    return `${e === 1 ? "rgb(" : "rgba("}${$t(this.r)}, ${$t(this.g)}, ${$t(this.b)}${e === 1 ? ")" : `, ${e})`}`;
  }
  function Pr(e) {
    return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
  }
  function $t(e) {
    return Math.max(0, Math.min(255, Math.round(e) || 0));
  }
  function Ut(e) {
    return e = $t(e), (e < 16 ? "0" : "") + e.toString(16);
  }
  function vo(e, t, n, r) {
    return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new We(e, t, n, r);
  }
  function Ka(e) {
    if (e instanceof We) return new We(e.h, e.s, e.l, e.opacity);
    if (e instanceof Ht || (e = Vt(e)), !e) return new We();
    if (e instanceof We) return e;
    e = e.rgb();
    var t = e.r / 255, n = e.g / 255, r = e.b / 255, i = Math.min(t, n, r), s = Math.max(t, n, r), o = NaN, a = s - i, l = (s + i) / 2;
    return a ? (t === s ? o = (n - r) / a + (n < r) * 6 : n === s ? o = (r - t) / a + 2 : o = (t - n) / a + 4, a /= l < 0.5 ? s + i : 2 - s - i, o *= 60) : a = l > 0 && l < 1 ? 0 : o, new We(o, a, l, e.opacity);
  }
  function ld(e, t, n, r) {
    return arguments.length === 1 ? Ka(e) : new We(e, t, n, r ?? 1);
  }
  function We(e, t, n, r) {
    this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
  }
  Xn(We, ld, Jr(Ht, {
    brighter(e) {
      return e = e == null ? Er : Math.pow(Er, e), new We(this.h, this.s, this.l * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? Bn : Math.pow(Bn, e), new We(this.h, this.s, this.l * e, this.opacity);
    },
    rgb() {
      var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < 0.5 ? n : 1 - n) * t, i = 2 * n - r;
      return new Te(gi(e >= 240 ? e - 240 : e + 120, i, r), gi(e, i, r), gi(e < 120 ? e + 240 : e - 120, i, r), this.opacity);
    },
    clamp() {
      return new We(_o(this.h), nr(this.s), nr(this.l), Pr(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
    },
    formatHsl() {
      const e = Pr(this.opacity);
      return `${e === 1 ? "hsl(" : "hsla("}${_o(this.h)}, ${nr(this.s) * 100}%, ${nr(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
    }
  }));
  function _o(e) {
    return e = (e || 0) % 360, e < 0 ? e + 360 : e;
  }
  function nr(e) {
    return Math.max(0, Math.min(1, e || 0));
  }
  function gi(e, t, n) {
    return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
  }
  const ud = Math.PI / 180, cd = 180 / Math.PI, Cr = 18, Xa = 0.96422, ja = 1, Ya = 0.82521, Za = 4 / 29, an = 6 / 29, Ja = 3 * an * an, fd = an * an * an;
  function Qa(e) {
    if (e instanceof ot) return new ot(e.l, e.a, e.b, e.opacity);
    if (e instanceof nt) return tl(e);
    e instanceof Te || (e = qa(e));
    var t = bi(e.r), n = bi(e.g), r = bi(e.b), i = mi((0.2225045 * t + 0.7168786 * n + 0.0606169 * r) / ja), s, o;
    return t === n && n === r ? s = o = i : (s = mi((0.4360747 * t + 0.3850649 * n + 0.1430804 * r) / Xa), o = mi((0.0139322 * t + 0.0971045 * n + 0.7141733 * r) / Ya)), new ot(116 * i - 16, 500 * (s - i), 200 * (i - o), e.opacity);
  }
  function Di(e, t, n, r) {
    return arguments.length === 1 ? Qa(e) : new ot(e, t, n, r ?? 1);
  }
  function ot(e, t, n, r) {
    this.l = +e, this.a = +t, this.b = +n, this.opacity = +r;
  }
  Xn(ot, Di, Jr(Ht, {
    brighter(e) {
      return new ot(this.l + Cr * (e ?? 1), this.a, this.b, this.opacity);
    },
    darker(e) {
      return new ot(this.l - Cr * (e ?? 1), this.a, this.b, this.opacity);
    },
    rgb() {
      var e = (this.l + 16) / 116, t = isNaN(this.a) ? e : e + this.a / 500, n = isNaN(this.b) ? e : e - this.b / 200;
      return t = Xa * vi(t), e = ja * vi(e), n = Ya * vi(n), new Te(_i(3.1338561 * t - 1.6168667 * e - 0.4906146 * n), _i(-0.9787684 * t + 1.9161415 * e + 0.033454 * n), _i(0.0719453 * t - 0.2289914 * e + 1.4052427 * n), this.opacity);
    }
  }));
  function mi(e) {
    return e > fd ? Math.pow(e, 1 / 3) : e / Ja + Za;
  }
  function vi(e) {
    return e > an ? e * e * e : Ja * (e - Za);
  }
  function _i(e) {
    return 255 * (e <= 31308e-7 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055);
  }
  function bi(e) {
    return (e /= 255) <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4);
  }
  function el(e) {
    if (e instanceof nt) return new nt(e.h, e.c, e.l, e.opacity);
    if (e instanceof ot || (e = Qa(e)), e.a === 0 && e.b === 0) return new nt(NaN, 0 < e.l && e.l < 100 ? 0 : NaN, e.l, e.opacity);
    var t = Math.atan2(e.b, e.a) * cd;
    return new nt(t < 0 ? t + 360 : t, Math.sqrt(e.a * e.a + e.b * e.b), e.l, e.opacity);
  }
  function Fi(e, t, n, r) {
    return arguments.length === 1 ? el(e) : new nt(n, t, e, 1);
  }
  function dd(e, t, n, r) {
    return arguments.length === 1 ? el(e) : new nt(e, t, n, r ?? 1);
  }
  function nt(e, t, n, r) {
    this.h = +e, this.c = +t, this.l = +n, this.opacity = +r;
  }
  function tl(e) {
    if (isNaN(e.h)) return new ot(e.l, 0, 0, e.opacity);
    var t = e.h * ud;
    return new ot(e.l, Math.cos(t) * e.c, Math.sin(t) * e.c, e.opacity);
  }
  Xn(nt, dd, Jr(Ht, {
    brighter(e) {
      return new nt(this.h, this.c, this.l + Cr * (e ?? 1), this.opacity);
    },
    darker(e) {
      return new nt(this.h, this.c, this.l - Cr * (e ?? 1), this.opacity);
    },
    rgb() {
      return tl(this).rgb();
    }
  }));
  const ms = (e) => () => e;
  function hd(e, t) {
    return function(n) {
      return e + n * t;
    };
  }
  function pd(e, t, n) {
    return e = Math.pow(e, n), t = Math.pow(t, n) - e, n = 1 / n, function(r) {
      return Math.pow(e + r * t, n);
    };
  }
  function gd(e) {
    return (e = +e) == 1 ? Zt : function(t, n) {
      return n - t ? pd(t, n, e) : ms(isNaN(t) ? n : t);
    };
  }
  function Zt(e, t) {
    var n = t - e;
    return n ? hd(e, n) : ms(isNaN(e) ? t : e);
  }
  const Ar = (function e(t) {
    var n = gd(t);
    function r(i, s) {
      var o = n((i = st(i)).r, (s = st(s)).r), a = n(i.g, s.g), l = n(i.b, s.b), u = Zt(i.opacity, s.opacity);
      return function(c) {
        return i.r = o(c), i.g = a(c), i.b = l(c), i.opacity = u(c), i + "";
      };
    }
    return r.gamma = e, r;
  })(1);
  function md(e, t) {
    t || (t = []);
    var n = e ? Math.min(t.length, e.length) : 0, r = t.slice(), i;
    return function(s) {
      for (i = 0; i < n; ++i) r[i] = e[i] * (1 - s) + t[i] * s;
      return r;
    };
  }
  function vd(e) {
    return ArrayBuffer.isView(e) && !(e instanceof DataView);
  }
  function _d(e, t) {
    var n = t ? t.length : 0, r = e ? Math.min(n, e.length) : 0, i = new Array(r), s = new Array(n), o;
    for (o = 0; o < r; ++o) i[o] = vs(e[o], t[o]);
    for (; o < n; ++o) s[o] = t[o];
    return function(a) {
      for (o = 0; o < r; ++o) s[o] = i[o](a);
      return s;
    };
  }
  function bd(e, t) {
    var n = /* @__PURE__ */ new Date();
    return e = +e, t = +t, function(r) {
      return n.setTime(e * (1 - r) + t * r), n;
    };
  }
  function He(e, t) {
    return e = +e, t = +t, function(n) {
      return e * (1 - n) + t * n;
    };
  }
  function yd(e, t) {
    var n = {}, r = {}, i;
    (e === null || typeof e != "object") && (e = {}), (t === null || typeof t != "object") && (t = {});
    for (i in t) i in e ? n[i] = vs(e[i], t[i]) : r[i] = t[i];
    return function(s) {
      for (i in n) r[i] = n[i](s);
      return r;
    };
  }
  var Bi = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, yi = new RegExp(Bi.source, "g");
  function xd(e) {
    return function() {
      return e;
    };
  }
  function wd(e) {
    return function(t) {
      return e(t) + "";
    };
  }
  function nl(e, t) {
    var n = Bi.lastIndex = yi.lastIndex = 0, r, i, s, o = -1, a = [], l = [];
    for (e = e + "", t = t + ""; (r = Bi.exec(e)) && (i = yi.exec(t)); ) (s = i.index) > n && (s = t.slice(n, s), a[o] ? a[o] += s : a[++o] = s), (r = r[0]) === (i = i[0]) ? a[o] ? a[o] += i : a[++o] = i : (a[++o] = null, l.push({
      i: o,
      x: He(r, i)
    })), n = yi.lastIndex;
    return n < t.length && (s = t.slice(n), a[o] ? a[o] += s : a[++o] = s), a.length < 2 ? l[0] ? wd(l[0].x) : xd(t) : (t = l.length, function(u) {
      for (var c = 0, f; c < t; ++c) a[(f = l[c]).i] = f.x(u);
      return a.join("");
    });
  }
  function vs(e, t) {
    var n = typeof t, r;
    return t == null || n === "boolean" ? ms(t) : (n === "number" ? He : n === "string" ? (r = Vt(t)) ? (t = r, Ar) : nl : t instanceof Vt ? Ar : t instanceof Date ? bd : vd(t) ? md : Array.isArray(t) ? _d : typeof t.valueOf != "function" && typeof t.toString != "function" || isNaN(t) ? yd : He)(e, t);
  }
  function Sd(e, t) {
    return e = +e, t = +t, function(n) {
      return Math.round(e * (1 - n) + t * n);
    };
  }
  var bo = 180 / Math.PI, $i = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function rl(e, t, n, r, i, s) {
    var o, a, l;
    return (o = Math.sqrt(e * e + t * t)) && (e /= o, t /= o), (l = e * n + t * r) && (n -= e * l, r -= t * l), (a = Math.sqrt(n * n + r * r)) && (n /= a, r /= a, l /= a), e * r < t * n && (e = -e, t = -t, l = -l, o = -o), {
      translateX: i,
      translateY: s,
      rotate: Math.atan2(t, e) * bo,
      skewX: Math.atan(l) * bo,
      scaleX: o,
      scaleY: a
    };
  }
  var rr;
  function Td(e) {
    const t = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(e + "");
    return t.isIdentity ? $i : rl(t.a, t.b, t.c, t.d, t.e, t.f);
  }
  function Md(e) {
    return e == null || (rr || (rr = document.createElementNS("http://www.w3.org/2000/svg", "g")), rr.setAttribute("transform", e), !(e = rr.transform.baseVal.consolidate())) ? $i : (e = e.matrix, rl(e.a, e.b, e.c, e.d, e.e, e.f));
  }
  function il(e, t, n, r) {
    function i(u) {
      return u.length ? u.pop() + " " : "";
    }
    function s(u, c, f, h, d, b) {
      if (u !== f || c !== h) {
        var y = d.push("translate(", null, t, null, n);
        b.push({
          i: y - 4,
          x: He(u, f)
        }, {
          i: y - 2,
          x: He(c, h)
        });
      } else (f || h) && d.push("translate(" + f + t + h + n);
    }
    function o(u, c, f, h) {
      u !== c ? (u - c > 180 ? c += 360 : c - u > 180 && (u += 360), h.push({
        i: f.push(i(f) + "rotate(", null, r) - 2,
        x: He(u, c)
      })) : c && f.push(i(f) + "rotate(" + c + r);
    }
    function a(u, c, f, h) {
      u !== c ? h.push({
        i: f.push(i(f) + "skewX(", null, r) - 2,
        x: He(u, c)
      }) : c && f.push(i(f) + "skewX(" + c + r);
    }
    function l(u, c, f, h, d, b) {
      if (u !== f || c !== h) {
        var y = d.push(i(d) + "scale(", null, ",", null, ")");
        b.push({
          i: y - 4,
          x: He(u, f)
        }, {
          i: y - 2,
          x: He(c, h)
        });
      } else (f !== 1 || h !== 1) && d.push(i(d) + "scale(" + f + "," + h + ")");
    }
    return function(u, c) {
      var f = [], h = [];
      return u = e(u), c = e(c), s(u.translateX, u.translateY, c.translateX, c.translateY, f, h), o(u.rotate, c.rotate, f, h), a(u.skewX, c.skewX, f, h), l(u.scaleX, u.scaleY, c.scaleX, c.scaleY, f, h), u = c = null, function(d) {
        for (var b = -1, y = h.length, L; ++b < y; ) f[(L = h[b]).i] = L.x(d);
        return f.join("");
      };
    };
  }
  var Ed = il(Td, "px, ", "px)", "deg)"), Pd = il(Md, ", ", ")", ")");
  function Cd(e, t) {
    var n = Zt((e = Di(e)).l, (t = Di(t)).l), r = Zt(e.a, t.a), i = Zt(e.b, t.b), s = Zt(e.opacity, t.opacity);
    return function(o) {
      return e.l = n(o), e.a = r(o), e.b = i(o), e.opacity = s(o), e + "";
    };
  }
  class Rr {
    constructor(t) {
      __publicField(this, "points");
      this.points = t.slice().sort((n, r) => n.position - r.position);
    }
    getColorAt(t) {
      if (this.points.length === 0) return "#000";
      if (t <= this.points[0].position) return this.points[0].color;
      if (t >= this.points[this.points.length - 1].position) return this.points[this.points.length - 1].color;
      for (let n = 0; n < this.points.length - 1; ++n) {
        const r = this.points[n], i = this.points[n + 1];
        if (t >= r.position && t <= i.position) {
          const s = (t - r.position) / (i.position - r.position), o = Cd(r.color, i.color);
          return st(o(s)).formatHex();
        }
      }
      return "#000";
    }
    generateTexture() {
      const r = new ImageData(4096, 1);
      for (let i = 0; i < 4096; ++i) {
        const s = i / 4095, o = st(this.getColorAt(s)), a = i * 4;
        r.data[a] = o.r, r.data[a + 1] = o.g, r.data[a + 2] = o.b, r.data[a + 3] = 255;
      }
      return r;
    }
  }
  const Ad = 64;
  function Rd(e) {
    const t = Math.max(1, Math.floor(e));
    return 2 ** Math.floor(Math.log2(t));
  }
  const _Jt = class _Jt {
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
      __publicField(this, "rawView");
      __publicField(this, "rawBrushTexture");
      __publicField(this, "rawBrushView");
      __publicField(this, "resolvedTexture");
      __publicField(this, "resolvedView");
      __publicField(this, "uniformBufferMandelbrot");
      __publicField(this, "uniformBufferColor");
      __publicField(this, "uniformBufferBrush");
      __publicField(this, "mandelbrotReferenceBuffer");
      __publicField(this, "pipelineBrush");
      __publicField(this, "bindGroupBrush");
      __publicField(this, "pipelineMandelbrot");
      __publicField(this, "bindGroupMandelbrot");
      __publicField(this, "pipelineResolve");
      __publicField(this, "bindGroupResolve");
      __publicField(this, "pipelineColor");
      __publicField(this, "bindGroupColor");
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
      __publicField(this, "extraFrames", 0);
      __publicField(this, "mandelbrotReference", new Float32Array(1e6));
      __publicField(this, "prevFrameMandelbrot");
      __publicField(this, "clearHistoryNextFrame", false);
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
      this.canvas = t, this.shaderPassCompute = Jc, this.shaderPassColor = Qc, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.time = 0;
    }
    async initialize(t) {
      if (this.mandelbrotNavigator = t, !navigator.gpu) throw new Error("WebGPU non support\xE9");
      if (this.adapter = await navigator.gpu.requestAdapter(), !this.adapter) throw new Error("Adapter WebGPU introuvable");
      this.device = await this.adapter.requestDevice(), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), _Jt._tileTexture || (_Jt._tileTexture = await this._loadTexture("./colored_tiles.jpg")), this.tileTexture = await this._loadTexture("./colored_tiles.jpg"), this.tileTextureView = this.tileTexture.createView(), _Jt._skyboxTexture || (_Jt._skyboxTexture = await this._loadTexture("./gold.jpg")), this.skyboxTexture = await this._loadTexture("./gold.jpg"), this.skyboxTextureView = this.skyboxTexture.createView();
      const r = new Rr([]).generateTexture();
      this.paletteTexture = this.device.createTexture({
        size: [
          r.width,
          r.height,
          1
        ],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        label: "Engine PaletteTexture"
      }), this.device.queue.writeTexture({
        texture: this.paletteTexture
      }, r.data, {
        bytesPerRow: r.width * 4
      }, [
        r.width,
        r.height
      ]), this.paletteTextureView = this.paletteTexture.createView(), this.webcamTexture = new Zf(1920, 1080), this.webcamTileTexture = this.device.createTexture({
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
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Brush"
      }), this.mandelbrotReferenceBuffer = this.device.createBuffer({
        size: 4 * 1e6,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        label: "Engine Mandelbrot Orbit ReferenceStorage Buffer"
      }), await this._createPipelines(), this.resize();
    }
    async _createPipelines() {
      const t = this.device.createShaderModule({
        code: ef,
        label: "Engine ShaderModule Brush"
      }), n = this.device.createShaderModule({
        code: this.shaderPassCompute,
        label: "Engine ShaderModule Compute"
      }), r = this.device.createShaderModule({
        code: tf,
        label: "Engine ShaderModule Resolve"
      }), i = this.device.createShaderModule({
        code: this.shaderPassColor,
        label: "Engine ShaderModule Color"
      }), s = this.device.createBindGroupLayout({
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
              sampleType: "float"
            }
          }
        ],
        label: "Engine BindGroupLayout Brush"
      }), o = this.device.createBindGroupLayout({
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
              sampleType: "float"
            }
          }
        ],
        label: "Engine BindGroupLayout Mandelbrot"
      }), a = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
              sampleType: "float"
            }
          }
        ],
        label: "Engine BindGroupLayout Resolve"
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
              sampleType: "float"
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
      });
      this.pipelineBrush = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            s
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
        label: "Engine RenderPipeline Brush"
      }), this.pipelineMandelbrot = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            o
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
        label: "Engine RenderPipeline Mandelbrot"
      }), this.pipelineResolve = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            a
          ]
        }),
        vertex: {
          module: r,
          entryPoint: "vs_main"
        },
        fragment: {
          module: r,
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
        label: "Engine RenderPipeline Resolve"
      }), this.pipelineColor = this.device.createRenderPipeline({
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
      }), this.bindGroupBrush = void 0, this.bindGroupMandelbrot = void 0, this.bindGroupResolve = void 0, this.bindGroupColor = void 0;
    }
    resize() {
      var _a2, _b, _c2, _d2, _e2, _f2;
      const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) || 1, i = (n == null ? void 0 : n.clientHeight) || 1;
      this.width = Math.max(1, Math.round(r * t)), this.height = Math.max(1, Math.round(i * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = i + "px", this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.neutralSize = Math.ceil(Math.sqrt(this.width * this.width + this.height * this.height) * 1);
      const s = this.neutralSize;
      if ((_b = (_a2 = this.rawTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.rawBrushTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.resolvedTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2), this.rawTexture = this.device.createTexture({
        size: {
          width: s,
          height: s,
          depthOrArrayLayers: 1
        },
        format: "rgba16float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        label: "Engine RawTexture (A)"
      }), this.rawView = this.rawTexture.createView(), this.rawBrushTexture = this.device.createTexture({
        size: {
          width: s,
          height: s,
          depthOrArrayLayers: 1
        },
        format: "rgba16float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        label: "Engine RawBrushTexture (B)"
      }), this.rawBrushView = this.rawBrushTexture.createView(), this.resolvedTexture = this.device.createTexture({
        size: {
          width: s,
          height: s,
          depthOrArrayLayers: 1
        },
        format: "rgba16float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        label: "Engine ResolvedTexture"
      }), this.resolvedView = this.resolvedTexture.createView(), this.pipelineBrush) {
        const o = this.pipelineBrush.getBindGroupLayout(0);
        this.bindGroupBrush = this.device.createBindGroup({
          layout: o,
          entries: [
            {
              binding: 0,
              resource: {
                buffer: this.uniformBufferBrush
              }
            },
            {
              binding: 1,
              resource: this.rawView
            }
          ],
          label: "Engine BindGroup Brush"
        });
      }
      if (this.pipelineMandelbrot) {
        const o = this.pipelineMandelbrot.getBindGroupLayout(0);
        this.bindGroupMandelbrot = this.device.createBindGroup({
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
              resource: this.rawBrushView
            }
          ],
          label: "Engine BindGroup Mandelbrot"
        });
      }
      if (this.pipelineResolve) {
        const o = this.pipelineResolve.getBindGroupLayout(0);
        this.bindGroupResolve = this.device.createBindGroup({
          layout: o,
          entries: [
            {
              binding: 0,
              resource: this.rawView
            }
          ],
          label: "Engine BindGroup Resolve"
        });
      }
      if (this.pipelineColor) {
        const o = this.pipelineColor.getBindGroupLayout(0), a = [
          {
            binding: 0,
            resource: {
              buffer: this.uniformBufferColor
            }
          },
          {
            binding: 1,
            resource: this.resolvedView
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
          layout: o,
          entries: a,
          label: "Engine BindGroup Color"
        });
      }
      this.prevFrameMandelbrot = void 0, this.needRender = true;
    }
    areObjectsEqual(t, n) {
      return t === void 0 || n === void 0 ? false : JSON.stringify(t) === JSON.stringify(n);
    }
    areColorStopsEqual(t, n) {
      if (t.length !== n.length) return false;
      for (const [r, i] of t.entries()) {
        const s = n[r];
        if (!s || i.color !== s.color || i.position !== s.position) return false;
      }
      return true;
    }
    async update(t, n) {
      var _a2, _b, _c2;
      const r = performance.now();
      this.lastUpdateTime === 0 && (this.lastUpdateTime = r);
      const i = (r - this.lastUpdateTime) / 1e3;
      this.time += i, this.lastUpdateTime = r, this.needRender = !(this.areObjectsEqual(t, this.previousMandelbrot) && this.areObjectsEqual(n, this.previousRenderOptions)), this.needRender && (this.extraFrames = 10), n.activateWebcam ? (await this.updateWebcamTexture(), this.needRender = true) : (_a2 = this.webcamTexture) == null ? void 0 : _a2.closeWebcam(), n.activateTessellation && (this.needRender = true);
      const s = this.width / Math.max(1, this.height), o = new Float32Array([
        t.dx,
        t.dy,
        t.mu,
        t.scale,
        s,
        t.angle,
        t.maxIterations,
        t.epsilon,
        n.antialiasLevel,
        0,
        0,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, o.buffer);
      let a = ((_b = this.previousMandelbrot) == null ? void 0 : _b.scale) || 1 / t.scale;
      if (a < 1 && (a = 1 / a), a = Math.sqrt(a) - 1, !this.areColorStopsEqual(n.colorStops, ((_c2 = this.previousRenderOptions) == null ? void 0 : _c2.colorStops) || [])) {
        const b = new Rr(n.colorStops).generateTexture();
        this.device.queue.writeTexture({
          texture: this.paletteTexture
        }, b.data, {
          bytesPerRow: b.width * 4
        }, [
          b.width,
          b.height
        ]), this.needRender = true;
      }
      const l = new Float32Array([
        n.palettePeriod,
        n.paletteOffset,
        n.tessellationLevel,
        n.shadingLevel,
        a,
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
        0,
        0,
        0,
        0
      ]);
      if (this.device.queue.writeBuffer(this.uniformBufferColor, 0, l.buffer), !this.needRender && this.extraFrames <= 0) return;
      const u = Math.ceil(t.maxIterations), c = this.mandelbrotNavigator.compute_reference_orbit_ptr(u), f = new Float32Array(Ha.buffer, c.ptr, c.count * 4);
      c.offset < u && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, f, 0);
      const h = c.offset === 0 && !!this.prevFrameMandelbrot;
      this.clearHistoryNextFrame = false, (!this.prevFrameMandelbrot || h) && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== t.mu && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== t.scale && (this.clearHistoryNextFrame = true), this.previousMandelbrot = structuredClone(t), this.previousRenderOptions = structuredClone(n);
    }
    async render() {
      if (!this.needRender && this.extraFrames <= 0 || (!this.needRender && this.extraFrames > 0 && this.extraFrames--, !this.pipelineBrush || !this.pipelineMandelbrot || !this.pipelineResolve || !this.pipelineColor) || !this.bindGroupBrush || !this.bindGroupMandelbrot || !this.bindGroupResolve || !this.bindGroupColor || !this.previousMandelbrot) return;
      const t = this.width / Math.max(1, this.height), n = Rd(Ad), r = n, i = this.clearHistoryNextFrame ? 1 : 0;
      let s = 0, o = 0;
      if (!this.clearHistoryNextFrame && this.prevFrameMandelbrot) {
        const b = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx, y = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy, L = this.neutralSize, V = Math.sqrt(t * t + 1);
        s = -(b * L) / (2 * this.previousMandelbrot.scale * V), o = y * L / (2 * this.previousMandelbrot.scale * V);
      }
      const a = new Float32Array([
        t,
        this.previousMandelbrot.angle,
        i,
        n,
        r,
        s,
        o,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferBrush, 0, a.buffer);
      const l = this.device.createCommandEncoder(), u = l.beginRenderPass({
        colorAttachments: [
          {
            view: this.rawBrushView,
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
      u.setPipeline(this.pipelineBrush), u.setBindGroup(0, this.bindGroupBrush), u.draw(6, 1, 0, 0), u.end();
      const c = l.beginRenderPass({
        colorAttachments: [
          {
            view: this.rawView,
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
      c.setPipeline(this.pipelineMandelbrot), c.setBindGroup(0, this.bindGroupMandelbrot), c.draw(6, 1, 0, 0), c.end();
      const f = l.beginRenderPass({
        colorAttachments: [
          {
            view: this.resolvedView,
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
      f.setPipeline(this.pipelineResolve), f.setBindGroup(0, this.bindGroupResolve), f.draw(6, 1, 0, 0), f.end();
      const h = this.ctx.getCurrentTexture().createView(), d = l.beginRenderPass({
        colorAttachments: [
          {
            view: h,
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
      if (d.setPipeline(this.pipelineColor), d.setBindGroup(0, this.bindGroupColor), d.draw(6, 1, 0, 0), d.end(), this.device.queue.submit([
        l.finish()
      ]), this.prevFrameMandelbrot = {
        ...this.previousMandelbrot
      }, this.snapshotCallback) {
        try {
          const b = this.snapshotDestWidth ?? 256, y = Math.round(b * 9 / 16), L = this.device.createTexture({
            size: [
              b,
              y,
              1
            ],
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
          });
          {
            const q = this.device.createCommandEncoder(), j = q.beginRenderPass({
              colorAttachments: [
                {
                  view: L.createView(),
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
            j.setPipeline(this.pipelineColor), j.setBindGroup(0, this.bindGroupColor), j.draw(6, 1, 0, 0), j.end(), this.device.queue.submit([
              q.finish()
            ]);
          }
          const V = (q) => q + 255 & -256, U = b * 4, $ = V(U), _ = $ * y, w = this.device.createBuffer({
            size: _,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
          });
          {
            const q = this.device.createCommandEncoder();
            q.copyTextureToBuffer({
              texture: L
            }, {
              buffer: w,
              offset: 0,
              bytesPerRow: $
            }, {
              width: b,
              height: y,
              depthOrArrayLayers: 1
            }), this.device.queue.submit([
              q.finish()
            ]);
          }
          await this.device.queue.onSubmittedWorkDone(), await w.mapAsync(GPUMapMode.READ);
          const I = w.getMappedRange(), z = new Uint8ClampedArray(b * y * 4), X = new Uint8Array(I);
          for (let q = 0; q < y; ++q) for (let j = 0; j < b; ++j) {
            const F = q * $ + j * 4, te = (q * b + j) * 4;
            z[te + 0] = X[F + 2], z[te + 1] = X[F + 1], z[te + 2] = X[F + 0], z[te + 3] = X[F + 3];
          }
          const Q = document.createElement("canvas");
          Q.width = b, Q.height = y, Q.getContext("2d").putImageData(new ImageData(z, b, y), 0, 0), w.unmap(), this.snapshotCallback(Q.toDataURL("image/png"));
        } catch {
          this.snapshotCallback("");
        }
        this.snapshotCallback = void 0, this.snapshotDestWidth = void 0;
      }
    }
    destroy() {
      var _a2, _b, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j, _k, _l2, _m2, _n2, _o2, _p2, _q, _r2, _s2;
      (_b = (_a2 = this.rawTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.rawBrushTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.resolvedTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2), (_h2 = (_g2 = this.mandelbrotReferenceBuffer) == null ? void 0 : _g2.destroy) == null ? void 0 : _h2.call(_g2), (_j = (_i2 = this.uniformBufferMandelbrot) == null ? void 0 : _i2.destroy) == null ? void 0 : _j.call(_i2), (_l2 = (_k = this.uniformBufferColor) == null ? void 0 : _k.destroy) == null ? void 0 : _l2.call(_k), (_n2 = (_m2 = this.uniformBufferBrush) == null ? void 0 : _m2.destroy) == null ? void 0 : _n2.call(_m2), (_o2 = this.webcamTexture) == null ? void 0 : _o2.closeWebcam(), (_q = (_p2 = this.webcamTileTexture) == null ? void 0 : _p2.destroy) == null ? void 0 : _q.call(_p2), (_s2 = (_r2 = this.paletteTexture) == null ? void 0 : _r2.destroy) == null ? void 0 : _s2.call(_r2);
    }
    async _loadTexture(t) {
      const n = new Image();
      n.src = t;
      try {
        await n.decode();
      } catch (s) {
        throw console.warn("\xC9chec du chargement de la texture : " + t, s), s;
      }
      const r = await createImageBitmap(n), i = this.device.createTexture({
        size: [
          r.width,
          r.height,
          1
        ],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        label: "Engine LoadedTexture " + t
      });
      return this.device.queue.copyExternalImageToTexture({
        source: r
      }, {
        texture: i
      }, [
        r.width,
        r.height
      ]), i;
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
  __publicField(_Jt, "_tileTexture");
  __publicField(_Jt, "_tileTextureView");
  __publicField(_Jt, "_skyboxTexture");
  __publicField(_Jt, "_skyboxTextureView");
  __publicField(_Jt, "_paletteTexture");
  __publicField(_Jt, "_paletteTextureView");
  let Jt = _Jt;
  const kd = At({
    __name: "Mandelbrot",
    props: cs({
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
      const n = ge(null);
      let r = null, i = null, s, o = false;
      const a = vt(e, "cx"), l = vt(e, "cy"), u = vt(e, "scale"), c = vt(e, "angle");
      Bt(() => [
        a.value,
        l.value,
        u.value,
        c.value
      ], ([y, L, V, U], [$, _, w, I]) => {
        o || s && (!y || !L || !V || ((y !== $ || L !== _) && s.origin(y, L), V !== w && s.scale(V), U !== I && s.angle(U)));
      }, {
        flush: "sync"
      });
      const f = e;
      async function h() {
        if (!i || !s) return;
        const y = s.step();
        if (!y) return;
        const [L, V] = y, [U, $, _, w] = s.get_params();
        o = true, a.value = U, l.value = $, u.value = _, c.value = parseFloat(w), await Kr(), o = false;
        const I = Math.min(Math.max(100, 200 * Math.log2(1 / parseFloat(_))), 1e5);
        return await i.update({
          cx: U,
          cy: $,
          dx: parseFloat(L),
          dy: parseFloat(V),
          mu: f.mu,
          scale: parseFloat(_),
          angle: parseFloat(w),
          maxIterations: I,
          epsilon: f.epsilon
        }, {
          shadingLevel: f.shadingLevel,
          tessellationLevel: f.tessellationLevel,
          antialiasLevel: f.antialiasLevel,
          palettePeriod: f.palettePeriod,
          paletteOffset: f.paletteOffset,
          colorStops: re(f.colorStops),
          activateShading: f.activateShading,
          activateTessellation: f.activateTessellation,
          activateWebcam: f.activateWebcam,
          activatePalette: f.activatePalette,
          activateSkybox: f.activateSkybox,
          activateSmoothness: f.activateSmoothness,
          activateZebra: f.activateZebra
        }), i.render();
      }
      async function d() {
        if (n.value) return r = n.value, s = new Ui(a.value, l.value, u.value, c.value), s.origin(a.value, l.value), s.scale(u.value), s.angle(c.value), i = new Jt(r, {
          activatePalette: f.activatePalette,
          activateSkybox: f.activateSkybox,
          shadingLevel: f.shadingLevel,
          tessellationLevel: f.tessellationLevel,
          antialiasLevel: f.antialiasLevel,
          palettePeriod: f.palettePeriod,
          paletteOffset: f.paletteOffset,
          colorStops: f.colorStops,
          activateShading: f.activateShading,
          activateTessellation: f.activateTessellation,
          activateWebcam: f.activateWebcam,
          activateSmoothness: f.activateSmoothness,
          activateZebra: f.activateZebra
        }), i.initialize(s);
      }
      async function b() {
        if (!n.value || !i) return;
        const y = n.value.getBoundingClientRect();
        n.value.width = y.width, n.value.height = y.height, i.resize(), await h();
      }
      return Rt(async () => (await d(), window.addEventListener("resize", b), b())), qn(() => {
        window.removeEventListener("resize", b);
      }), t({
        getCanvas: () => n.value,
        getEngine: () => i,
        getNavigator: () => s,
        translate: (y, L) => s == null ? void 0 : s.translate(y, L),
        translateDirect: (y, L) => s == null ? void 0 : s.translate_direct(y, L),
        rotate: (y) => s == null ? void 0 : s.rotate(y),
        angle: (y) => s == null ? void 0 : s.angle(y),
        zoom: (y) => s == null ? void 0 : s.zoom(y),
        step: () => s == null ? void 0 : s.step(),
        getParams: () => s == null ? void 0 : s.get_params(),
        drawOnce: async () => h(),
        resize: async () => b(),
        initialize: async () => d()
      }), (y, L) => (le(), he("canvas", {
        ref_key: "canvasRef",
        ref: n
      }, null, 512));
    }
  }), ir = 0.04, yo = 0.025, Nd = At({
    __name: "MandelbrotController",
    props: cs({
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
      }
    }, {
      cx: {},
      cxModifiers: {},
      cy: {},
      cyModifiers: {},
      scale: {},
      scaleModifiers: {},
      angle: {},
      angleModifiers: {}
    }),
    emits: [
      "update:cx",
      "update:cy",
      "update:scale",
      "update:angle"
    ],
    setup(e, { expose: t }) {
      const n = vt(e, "cx"), r = vt(e, "cy"), i = vt(e, "scale"), s = vt(e, "angle"), o = e, a = ge(null), l = {};
      t({
        getCanvas: $,
        getEngine: () => {
          var _a2;
          return ((_a2 = a.value) == null ? void 0 : _a2.getEngine()) ?? null;
        }
      });
      let u = false, c = false, f = 0, h = 0, d = 0, b = 0, y = 0, L = false, V = null, U = null;
      function $() {
        var _a2;
        return ((_a2 = a.value) == null ? void 0 : _a2.getCanvas()) ?? null;
      }
      function _(N) {
        const A = $();
        if (!A) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const B = A.getBoundingClientRect();
        return {
          x: N.clientX - B.left,
          y: N.clientY - B.top,
          width: B.width,
          height: B.height
        };
      }
      function w(N) {
        l[N.code] = true;
      }
      function I(N) {
        l[N.code] = false;
      }
      function z(N) {
        var _a2, _b;
        N.preventDefault();
        const A = 0.8;
        N.deltaY < 0 ? (_a2 = a.value) == null ? void 0 : _a2.zoom(A) : (_b = a.value) == null ? void 0 : _b.zoom(1 / A);
      }
      function X(N) {
        if (N.button === 2) c = true;
        else {
          u = true;
          const A = _(N);
          f = A.x, h = A.y;
        }
      }
      function Q(N) {
        var _a2, _b;
        const A = _(N);
        if (c) {
          const me = $();
          if (!me) return;
          const Ue = me.getBoundingClientRect(), je = Ue.width / 2, $e = Ue.height / 2, Wt = A.x, pn = A.y, Yn = Math.atan2(pn - $e, Wt - je);
          (_a2 = a.value) == null ? void 0 : _a2.angle(Yn);
          return;
        }
        if (!u) return;
        const B = A.width, J = A.height, C = B / J, m = (A.x - f) / B * 2, E = (A.y - h) / J * 2;
        (_b = a.value) == null ? void 0 : _b.translateDirect(-m * C, E), f = A.x, h = A.y;
      }
      function q(N) {
        N.button === 2 ? c = false : u = false;
      }
      function j(N) {
        var _a2;
        const A = $();
        if (A) {
          if (N.touches.length === 1) {
            u = true;
            const B = N.touches[0], J = A.getBoundingClientRect();
            f = B.clientX - J.left, h = B.clientY - J.top;
          } else if (N.touches.length === 2) {
            u = false, L = true;
            const [B, J] = N.touches;
            d = Math.hypot(J.clientX - B.clientX, J.clientY - B.clientY), b = Math.atan2(J.clientY - B.clientY, J.clientX - B.clientX);
            const C = (_a2 = a.value) == null ? void 0 : _a2.getParams();
            y = C ? parseFloat(C[3]) : 0;
          }
        }
      }
      function F(N) {
        var _a2, _b, _c2;
        const A = $();
        if (A) {
          if (u && N.touches.length === 1) {
            const B = N.touches[0], J = A.getBoundingClientRect(), C = B.clientX - J.left, m = B.clientY - J.top, E = J.width, me = J.height, Ue = E / me, je = (C - f) / E * 2, $e = (m - h) / me * 2;
            (_a2 = a.value) == null ? void 0 : _a2.translateDirect(-je * Ue, $e), f = C, h = m;
          } else if (L && N.touches.length === 2) {
            const [B, J] = N.touches, C = Math.hypot(J.clientX - B.clientX, J.clientY - B.clientY), m = Math.atan2(J.clientY - B.clientY, J.clientX - B.clientX), E = d / C;
            (_b = a.value) == null ? void 0 : _b.zoom(E);
            const me = m - b;
            (_c2 = a.value) == null ? void 0 : _c2.angle(y + me);
          }
        }
      }
      function te(N) {
        N.touches.length === 0 && (u = false, L = false);
      }
      function ce() {
        var _a2, _b, _c2, _d2, _e2, _f2, _g2, _h2;
        l.KeyW && ((_a2 = a.value) == null ? void 0 : _a2.translate(0, ir)), l.KeyS && ((_b = a.value) == null ? void 0 : _b.translate(0, -ir)), l.KeyA && ((_c2 = a.value) == null ? void 0 : _c2.translate(-ir, 0)), l.KeyD && ((_d2 = a.value) == null ? void 0 : _d2.translate(ir, 0)), l.KeyQ && ((_e2 = a.value) == null ? void 0 : _e2.rotate(yo)), l.KeyE && ((_f2 = a.value) == null ? void 0 : _f2.rotate(-yo));
        const N = 0.8;
        l.KeyR && ((_g2 = a.value) == null ? void 0 : _g2.zoom(N)), l.KeyF && ((_h2 = a.value) == null ? void 0 : _h2.zoom(1 / N)), U = window.setTimeout(ce, 16);
      }
      async function xe() {
        var _a2;
        await ((_a2 = a.value) == null ? void 0 : _a2.drawOnce()), V = requestAnimationFrame(xe);
      }
      return Rt(async () => {
        var _a2;
        await Kr(), await ((_a2 = a.value) == null ? void 0 : _a2.initialize());
        const N = $();
        N && (window.addEventListener("keydown", w), window.addEventListener("keyup", I), N.addEventListener("wheel", z, {
          passive: false
        }), N.addEventListener("mousedown", X), N.addEventListener("contextmenu", (A) => A.preventDefault()), window.addEventListener("mousemove", Q), window.addEventListener("mouseup", q), N.addEventListener("touchstart", j, {
          passive: false
        }), N.addEventListener("touchmove", F, {
          passive: false
        }), N.addEventListener("touchend", te, {
          passive: false
        }), ce(), await xe());
      }), qn(() => {
        V !== null && cancelAnimationFrame(V), U !== null && clearTimeout(U);
        const N = $();
        window.removeEventListener("keydown", w), window.removeEventListener("keyup", I), window.removeEventListener("mousemove", Q), window.removeEventListener("mouseup", q), N && (N.removeEventListener("wheel", z), N.removeEventListener("mousedown", X), N.removeEventListener("contextmenu", (A) => A.preventDefault()), N.removeEventListener("touchstart", j), N.removeEventListener("touchmove", F), N.removeEventListener("touchend", te));
      }), (N, A) => (le(), hs(kd, {
        ref_key: "mandelbrotRef",
        ref: a,
        scale: i.value,
        "onUpdate:scale": A[0] || (A[0] = (B) => i.value = B),
        angle: s.value,
        "onUpdate:angle": A[1] || (A[1] = (B) => s.value = B),
        cx: n.value,
        "onUpdate:cx": A[2] || (A[2] = (B) => n.value = B),
        cy: r.value,
        "onUpdate:cy": A[3] || (A[3] = (B) => r.value = B),
        mu: o.mu,
        epsilon: o.epsilon,
        antialiasLevel: o.antialiasLevel,
        shadingLevel: o.shadingLevel,
        palettePeriod: o.palettePeriod,
        tessellationLevel: o.tessellationLevel,
        colorStops: o.colorStops,
        activatePalette: o.activatePalette,
        activateSkybox: o.activateSkybox,
        activateTessellation: o.activateTessellation,
        activateWebcam: o.activateWebcam,
        activateShading: o.activateShading,
        activateZebra: o.activateZebra,
        activateSmoothness: o.activateSmoothness,
        paletteOffset: o.paletteOffset
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
        "paletteOffset"
      ]));
    }
  }), Qr = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [r, i] of t) n[r] = i;
    return n;
  }, Od = Qr(Nd, [
    [
      "__scopeId",
      "data-v-f3845487"
    ]
  ]), Id = [
    "fill",
    "stroke"
  ], Ld = At({
    __name: "GlissiereHandle",
    props: {
      stop: {}
    },
    emits: [
      "update:position"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = ge(null);
      function s(l) {
        let u = l.replace("#", "");
        u.length === 3 && (u = u.split("").map((d) => d + d).join(""));
        const c = parseInt(u.substring(0, 2), 16) / 255, f = parseInt(u.substring(2, 4), 16) / 255, h = parseInt(u.substring(4, 6), 16) / 255;
        return 0.299 * c + 0.587 * f + 0.114 * h;
      }
      const o = we(() => s(n.stop.color) > 0.5 ? "#222" : "#fff");
      function a(l) {
        l.preventDefault();
        const u = l.clientX, c = n.stop.position, f = i.value;
        if (!f) return;
        const d = f.parentElement.getBoundingClientRect();
        function b(L) {
          const V = L.clientX - u;
          let U = c + V / d.width;
          U = Math.max(0, Math.min(1, U)), r("update:position", U);
        }
        function y() {
          window.removeEventListener("mousemove", b), window.removeEventListener("mouseup", y);
        }
        window.addEventListener("mousemove", b), window.addEventListener("mouseup", y);
      }
      return (l, u) => (le(), he("svg", {
        ref_key: "svgRef",
        ref: i,
        style: Gr({
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
        onMousedown: a
      }, [
        v("rect", {
          x: "6",
          y: "0",
          width: "12",
          height: "64",
          rx: "8",
          fill: n.stop.color,
          stroke: o.value,
          "stroke-width": "2"
        }, null, 8, Id)
      ], 36));
    }
  });
  function hr(e, t) {
    return e == null || t == null ? NaN : e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
  }
  function Ud(e, t) {
    return e == null || t == null ? NaN : t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
  }
  function sl(e) {
    let t, n, r;
    e.length !== 2 ? (t = hr, n = (a, l) => hr(e(a), l), r = (a, l) => e(a) - l) : (t = e === hr || e === Ud ? e : Dd, n = e, r = e);
    function i(a, l, u = 0, c = a.length) {
      if (u < c) {
        if (t(l, l) !== 0) return c;
        do {
          const f = u + c >>> 1;
          n(a[f], l) < 0 ? u = f + 1 : c = f;
        } while (u < c);
      }
      return u;
    }
    function s(a, l, u = 0, c = a.length) {
      if (u < c) {
        if (t(l, l) !== 0) return c;
        do {
          const f = u + c >>> 1;
          n(a[f], l) <= 0 ? u = f + 1 : c = f;
        } while (u < c);
      }
      return u;
    }
    function o(a, l, u = 0, c = a.length) {
      const f = i(a, l, u, c - 1);
      return f > u && r(a[f - 1], l) > -r(a[f], l) ? f - 1 : f;
    }
    return {
      left: i,
      center: o,
      right: s
    };
  }
  function Dd() {
    return 0;
  }
  function Fd(e) {
    return e === null ? NaN : +e;
  }
  const Bd = sl(hr), $d = Bd.right;
  sl(Fd).center;
  const Vd = Math.sqrt(50), zd = Math.sqrt(10), Gd = Math.sqrt(2);
  function kr(e, t, n) {
    const r = (t - e) / Math.max(0, n), i = Math.floor(Math.log10(r)), s = r / Math.pow(10, i), o = s >= Vd ? 10 : s >= zd ? 5 : s >= Gd ? 2 : 1;
    let a, l, u;
    return i < 0 ? (u = Math.pow(10, -i) / o, a = Math.round(e * u), l = Math.round(t * u), a / u < e && ++a, l / u > t && --l, u = -u) : (u = Math.pow(10, i) * o, a = Math.round(e / u), l = Math.round(t / u), a * u < e && ++a, l * u > t && --l), l < a && 0.5 <= n && n < 2 ? kr(e, t, n * 2) : [
      a,
      l,
      u
    ];
  }
  function Hd(e, t, n) {
    if (t = +t, e = +e, n = +n, !(n > 0)) return [];
    if (e === t) return [
      e
    ];
    const r = t < e, [i, s, o] = r ? kr(t, e, n) : kr(e, t, n);
    if (!(s >= i)) return [];
    const a = s - i + 1, l = new Array(a);
    if (r) if (o < 0) for (let u = 0; u < a; ++u) l[u] = (s - u) / -o;
    else for (let u = 0; u < a; ++u) l[u] = (s - u) * o;
    else if (o < 0) for (let u = 0; u < a; ++u) l[u] = (i + u) / -o;
    else for (let u = 0; u < a; ++u) l[u] = (i + u) * o;
    return l;
  }
  function Vi(e, t, n) {
    return t = +t, e = +e, n = +n, kr(e, t, n)[2];
  }
  function Wd(e, t, n) {
    t = +t, e = +e, n = +n;
    const r = t < e, i = r ? Vi(t, e, n) : Vi(e, t, n);
    return (r ? -1 : 1) * (i < 0 ? 1 / -i : i);
  }
  function qd(e) {
    return e;
  }
  var Kd = 3, xo = 1e-6;
  function Xd(e) {
    return "translate(" + e + ",0)";
  }
  function jd(e) {
    return (t) => +e(t);
  }
  function Yd(e, t) {
    return t = Math.max(0, e.bandwidth() - t * 2) / 2, e.round() && (t = Math.round(t)), (n) => +e(n) + t;
  }
  function Zd() {
    return !this.__axis;
  }
  function Jd(e, t) {
    var n = [], r = null, i = null, s = 6, o = 6, a = 3, l = typeof window < "u" && window.devicePixelRatio > 1 ? 0 : 0.5, u = 1, c = "y", f = Xd;
    function h(d) {
      var b = r ?? (t.ticks ? t.ticks.apply(t, n) : t.domain()), y = i ?? (t.tickFormat ? t.tickFormat.apply(t, n) : qd), L = Math.max(s, 0) + a, V = t.range(), U = +V[0] + l, $ = +V[V.length - 1] + l, _ = (t.bandwidth ? Yd : jd)(t.copy(), l), w = d.selection ? d.selection() : d, I = w.selectAll(".domain").data([
        null
      ]), z = w.selectAll(".tick").data(b, t).order(), X = z.exit(), Q = z.enter().append("g").attr("class", "tick"), q = z.select("line"), j = z.select("text");
      I = I.merge(I.enter().insert("path", ".tick").attr("class", "domain").attr("stroke", "currentColor")), z = z.merge(Q), q = q.merge(Q.append("line").attr("stroke", "currentColor").attr(c + "2", u * s)), j = j.merge(Q.append("text").attr("fill", "currentColor").attr(c, u * L).attr("dy", "0.71em")), d !== w && (I = I.transition(d), z = z.transition(d), q = q.transition(d), j = j.transition(d), X = X.transition(d).attr("opacity", xo).attr("transform", function(F) {
        return isFinite(F = _(F)) ? f(F + l) : this.getAttribute("transform");
      }), Q.attr("opacity", xo).attr("transform", function(F) {
        var te = this.parentNode.__axis;
        return f((te && isFinite(te = te(F)) ? te : _(F)) + l);
      })), X.remove(), I.attr("d", o ? "M" + U + "," + u * o + "V" + l + "H" + $ + "V" + u * o : "M" + U + "," + l + "H" + $), z.attr("opacity", 1).attr("transform", function(F) {
        return f(_(F) + l);
      }), q.attr(c + "2", u * s), j.attr(c, u * L).text(y), w.filter(Zd).attr("fill", "none").attr("font-size", 10).attr("font-family", "sans-serif").attr("text-anchor", "middle"), w.each(function() {
        this.__axis = _;
      });
    }
    return h.scale = function(d) {
      return arguments.length ? (t = d, h) : t;
    }, h.ticks = function() {
      return n = Array.from(arguments), h;
    }, h.tickArguments = function(d) {
      return arguments.length ? (n = d == null ? [] : Array.from(d), h) : n.slice();
    }, h.tickValues = function(d) {
      return arguments.length ? (r = d == null ? null : Array.from(d), h) : r && r.slice();
    }, h.tickFormat = function(d) {
      return arguments.length ? (i = d, h) : i;
    }, h.tickSize = function(d) {
      return arguments.length ? (s = o = +d, h) : s;
    }, h.tickSizeInner = function(d) {
      return arguments.length ? (s = +d, h) : s;
    }, h.tickSizeOuter = function(d) {
      return arguments.length ? (o = +d, h) : o;
    }, h.tickPadding = function(d) {
      return arguments.length ? (a = +d, h) : a;
    }, h.offset = function(d) {
      return arguments.length ? (l = +d, h) : l;
    }, h;
  }
  function Qd(e) {
    return Jd(Kd, e);
  }
  var eh = {
    value: () => {
    }
  };
  function _s() {
    for (var e = 0, t = arguments.length, n = {}, r; e < t; ++e) {
      if (!(r = arguments[e] + "") || r in n || /[\s.]/.test(r)) throw new Error("illegal type: " + r);
      n[r] = [];
    }
    return new pr(n);
  }
  function pr(e) {
    this._ = e;
  }
  function th(e, t) {
    return e.trim().split(/^|\s+/).map(function(n) {
      var r = "", i = n.indexOf(".");
      if (i >= 0 && (r = n.slice(i + 1), n = n.slice(0, i)), n && !t.hasOwnProperty(n)) throw new Error("unknown type: " + n);
      return {
        type: n,
        name: r
      };
    });
  }
  pr.prototype = _s.prototype = {
    constructor: pr,
    on: function(e, t) {
      var n = this._, r = th(e + "", n), i, s = -1, o = r.length;
      if (arguments.length < 2) {
        for (; ++s < o; ) if ((i = (e = r[s]).type) && (i = nh(n[i], e.name))) return i;
        return;
      }
      if (t != null && typeof t != "function") throw new Error("invalid callback: " + t);
      for (; ++s < o; ) if (i = (e = r[s]).type) n[i] = wo(n[i], e.name, t);
      else if (t == null) for (i in n) n[i] = wo(n[i], e.name, null);
      return this;
    },
    copy: function() {
      var e = {}, t = this._;
      for (var n in t) e[n] = t[n].slice();
      return new pr(e);
    },
    call: function(e, t) {
      if ((i = arguments.length - 2) > 0) for (var n = new Array(i), r = 0, i, s; r < i; ++r) n[r] = arguments[r + 2];
      if (!this._.hasOwnProperty(e)) throw new Error("unknown type: " + e);
      for (s = this._[e], r = 0, i = s.length; r < i; ++r) s[r].value.apply(t, n);
    },
    apply: function(e, t, n) {
      if (!this._.hasOwnProperty(e)) throw new Error("unknown type: " + e);
      for (var r = this._[e], i = 0, s = r.length; i < s; ++i) r[i].value.apply(t, n);
    }
  };
  function nh(e, t) {
    for (var n = 0, r = e.length, i; n < r; ++n) if ((i = e[n]).name === t) return i.value;
  }
  function wo(e, t, n) {
    for (var r = 0, i = e.length; r < i; ++r) if (e[r].name === t) {
      e[r] = eh, e = e.slice(0, r).concat(e.slice(r + 1));
      break;
    }
    return n != null && e.push({
      name: t,
      value: n
    }), e;
  }
  var zi = "http://www.w3.org/1999/xhtml";
  const So = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: zi,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };
  function ei(e) {
    var t = e += "", n = t.indexOf(":");
    return n >= 0 && (t = e.slice(0, n)) !== "xmlns" && (e = e.slice(n + 1)), So.hasOwnProperty(t) ? {
      space: So[t],
      local: e
    } : e;
  }
  function rh(e) {
    return function() {
      var t = this.ownerDocument, n = this.namespaceURI;
      return n === zi && t.documentElement.namespaceURI === zi ? t.createElement(e) : t.createElementNS(n, e);
    };
  }
  function ih(e) {
    return function() {
      return this.ownerDocument.createElementNS(e.space, e.local);
    };
  }
  function bs(e) {
    var t = ei(e);
    return (t.local ? ih : rh)(t);
  }
  function sh() {
  }
  function ys(e) {
    return e == null ? sh : function() {
      return this.querySelector(e);
    };
  }
  function oh(e) {
    typeof e != "function" && (e = ys(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var s = t[i], o = s.length, a = r[i] = new Array(o), l, u, c = 0; c < o; ++c) (l = s[c]) && (u = e.call(l, l.__data__, c, s)) && ("__data__" in l && (u.__data__ = l.__data__), a[c] = u);
    return new Be(r, this._parents);
  }
  function ah(e) {
    return e == null ? [] : Array.isArray(e) ? e : Array.from(e);
  }
  function lh() {
    return [];
  }
  function ol(e) {
    return e == null ? lh : function() {
      return this.querySelectorAll(e);
    };
  }
  function uh(e) {
    return function() {
      return ah(e.apply(this, arguments));
    };
  }
  function ch(e) {
    typeof e == "function" ? e = uh(e) : e = ol(e);
    for (var t = this._groups, n = t.length, r = [], i = [], s = 0; s < n; ++s) for (var o = t[s], a = o.length, l, u = 0; u < a; ++u) (l = o[u]) && (r.push(e.call(l, l.__data__, u, o)), i.push(l));
    return new Be(r, i);
  }
  function al(e) {
    return function() {
      return this.matches(e);
    };
  }
  function ll(e) {
    return function(t) {
      return t.matches(e);
    };
  }
  var fh = Array.prototype.find;
  function dh(e) {
    return function() {
      return fh.call(this.children, e);
    };
  }
  function hh() {
    return this.firstElementChild;
  }
  function ph(e) {
    return this.select(e == null ? hh : dh(typeof e == "function" ? e : ll(e)));
  }
  var gh = Array.prototype.filter;
  function mh() {
    return Array.from(this.children);
  }
  function vh(e) {
    return function() {
      return gh.call(this.children, e);
    };
  }
  function _h(e) {
    return this.selectAll(e == null ? mh : vh(typeof e == "function" ? e : ll(e)));
  }
  function bh(e) {
    typeof e != "function" && (e = al(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var s = t[i], o = s.length, a = r[i] = [], l, u = 0; u < o; ++u) (l = s[u]) && e.call(l, l.__data__, u, s) && a.push(l);
    return new Be(r, this._parents);
  }
  function ul(e) {
    return new Array(e.length);
  }
  function yh() {
    return new Be(this._enter || this._groups.map(ul), this._parents);
  }
  function Nr(e, t) {
    this.ownerDocument = e.ownerDocument, this.namespaceURI = e.namespaceURI, this._next = null, this._parent = e, this.__data__ = t;
  }
  Nr.prototype = {
    constructor: Nr,
    appendChild: function(e) {
      return this._parent.insertBefore(e, this._next);
    },
    insertBefore: function(e, t) {
      return this._parent.insertBefore(e, t);
    },
    querySelector: function(e) {
      return this._parent.querySelector(e);
    },
    querySelectorAll: function(e) {
      return this._parent.querySelectorAll(e);
    }
  };
  function xh(e) {
    return function() {
      return e;
    };
  }
  function wh(e, t, n, r, i, s) {
    for (var o = 0, a, l = t.length, u = s.length; o < u; ++o) (a = t[o]) ? (a.__data__ = s[o], r[o] = a) : n[o] = new Nr(e, s[o]);
    for (; o < l; ++o) (a = t[o]) && (i[o] = a);
  }
  function Sh(e, t, n, r, i, s, o) {
    var a, l, u = /* @__PURE__ */ new Map(), c = t.length, f = s.length, h = new Array(c), d;
    for (a = 0; a < c; ++a) (l = t[a]) && (h[a] = d = o.call(l, l.__data__, a, t) + "", u.has(d) ? i[a] = l : u.set(d, l));
    for (a = 0; a < f; ++a) d = o.call(e, s[a], a, s) + "", (l = u.get(d)) ? (r[a] = l, l.__data__ = s[a], u.delete(d)) : n[a] = new Nr(e, s[a]);
    for (a = 0; a < c; ++a) (l = t[a]) && u.get(h[a]) === l && (i[a] = l);
  }
  function Th(e) {
    return e.__data__;
  }
  function Mh(e, t) {
    if (!arguments.length) return Array.from(this, Th);
    var n = t ? Sh : wh, r = this._parents, i = this._groups;
    typeof e != "function" && (e = xh(e));
    for (var s = i.length, o = new Array(s), a = new Array(s), l = new Array(s), u = 0; u < s; ++u) {
      var c = r[u], f = i[u], h = f.length, d = Eh(e.call(c, c && c.__data__, u, r)), b = d.length, y = a[u] = new Array(b), L = o[u] = new Array(b), V = l[u] = new Array(h);
      n(c, f, y, L, V, d, t);
      for (var U = 0, $ = 0, _, w; U < b; ++U) if (_ = y[U]) {
        for (U >= $ && ($ = U + 1); !(w = L[$]) && ++$ < b; ) ;
        _._next = w || null;
      }
    }
    return o = new Be(o, r), o._enter = a, o._exit = l, o;
  }
  function Eh(e) {
    return typeof e == "object" && "length" in e ? e : Array.from(e);
  }
  function Ph() {
    return new Be(this._exit || this._groups.map(ul), this._parents);
  }
  function Ch(e, t, n) {
    var r = this.enter(), i = this, s = this.exit();
    return typeof e == "function" ? (r = e(r), r && (r = r.selection())) : r = r.append(e + ""), t != null && (i = t(i), i && (i = i.selection())), n == null ? s.remove() : n(s), r && i ? r.merge(i).order() : i;
  }
  function Ah(e) {
    for (var t = e.selection ? e.selection() : e, n = this._groups, r = t._groups, i = n.length, s = r.length, o = Math.min(i, s), a = new Array(i), l = 0; l < o; ++l) for (var u = n[l], c = r[l], f = u.length, h = a[l] = new Array(f), d, b = 0; b < f; ++b) (d = u[b] || c[b]) && (h[b] = d);
    for (; l < i; ++l) a[l] = n[l];
    return new Be(a, this._parents);
  }
  function Rh() {
    for (var e = this._groups, t = -1, n = e.length; ++t < n; ) for (var r = e[t], i = r.length - 1, s = r[i], o; --i >= 0; ) (o = r[i]) && (s && o.compareDocumentPosition(s) ^ 4 && s.parentNode.insertBefore(o, s), s = o);
    return this;
  }
  function kh(e) {
    e || (e = Nh);
    function t(f, h) {
      return f && h ? e(f.__data__, h.__data__) : !f - !h;
    }
    for (var n = this._groups, r = n.length, i = new Array(r), s = 0; s < r; ++s) {
      for (var o = n[s], a = o.length, l = i[s] = new Array(a), u, c = 0; c < a; ++c) (u = o[c]) && (l[c] = u);
      l.sort(t);
    }
    return new Be(i, this._parents).order();
  }
  function Nh(e, t) {
    return e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
  }
  function Oh() {
    var e = arguments[0];
    return arguments[0] = this, e.apply(null, arguments), this;
  }
  function Ih() {
    return Array.from(this);
  }
  function Lh() {
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, s = r.length; i < s; ++i) {
      var o = r[i];
      if (o) return o;
    }
    return null;
  }
  function Uh() {
    let e = 0;
    for (const t of this) ++e;
    return e;
  }
  function Dh() {
    return !this.node();
  }
  function Fh(e) {
    for (var t = this._groups, n = 0, r = t.length; n < r; ++n) for (var i = t[n], s = 0, o = i.length, a; s < o; ++s) (a = i[s]) && e.call(a, a.__data__, s, i);
    return this;
  }
  function Bh(e) {
    return function() {
      this.removeAttribute(e);
    };
  }
  function $h(e) {
    return function() {
      this.removeAttributeNS(e.space, e.local);
    };
  }
  function Vh(e, t) {
    return function() {
      this.setAttribute(e, t);
    };
  }
  function zh(e, t) {
    return function() {
      this.setAttributeNS(e.space, e.local, t);
    };
  }
  function Gh(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? this.removeAttribute(e) : this.setAttribute(e, n);
    };
  }
  function Hh(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n);
    };
  }
  function Wh(e, t) {
    var n = ei(e);
    if (arguments.length < 2) {
      var r = this.node();
      return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n);
    }
    return this.each((t == null ? n.local ? $h : Bh : typeof t == "function" ? n.local ? Hh : Gh : n.local ? zh : Vh)(n, t));
  }
  function cl(e) {
    return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView;
  }
  function qh(e) {
    return function() {
      this.style.removeProperty(e);
    };
  }
  function Kh(e, t, n) {
    return function() {
      this.style.setProperty(e, t, n);
    };
  }
  function Xh(e, t, n) {
    return function() {
      var r = t.apply(this, arguments);
      r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n);
    };
  }
  function jh(e, t, n) {
    return arguments.length > 1 ? this.each((t == null ? qh : typeof t == "function" ? Xh : Kh)(e, t, n ?? "")) : fn(this.node(), e);
  }
  function fn(e, t) {
    return e.style.getPropertyValue(t) || cl(e).getComputedStyle(e, null).getPropertyValue(t);
  }
  function Yh(e) {
    return function() {
      delete this[e];
    };
  }
  function Zh(e, t) {
    return function() {
      this[e] = t;
    };
  }
  function Jh(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? delete this[e] : this[e] = n;
    };
  }
  function Qh(e, t) {
    return arguments.length > 1 ? this.each((t == null ? Yh : typeof t == "function" ? Jh : Zh)(e, t)) : this.node()[e];
  }
  function fl(e) {
    return e.trim().split(/^|\s+/);
  }
  function xs(e) {
    return e.classList || new dl(e);
  }
  function dl(e) {
    this._node = e, this._names = fl(e.getAttribute("class") || "");
  }
  dl.prototype = {
    add: function(e) {
      var t = this._names.indexOf(e);
      t < 0 && (this._names.push(e), this._node.setAttribute("class", this._names.join(" ")));
    },
    remove: function(e) {
      var t = this._names.indexOf(e);
      t >= 0 && (this._names.splice(t, 1), this._node.setAttribute("class", this._names.join(" ")));
    },
    contains: function(e) {
      return this._names.indexOf(e) >= 0;
    }
  };
  function hl(e, t) {
    for (var n = xs(e), r = -1, i = t.length; ++r < i; ) n.add(t[r]);
  }
  function pl(e, t) {
    for (var n = xs(e), r = -1, i = t.length; ++r < i; ) n.remove(t[r]);
  }
  function ep(e) {
    return function() {
      hl(this, e);
    };
  }
  function tp(e) {
    return function() {
      pl(this, e);
    };
  }
  function np(e, t) {
    return function() {
      (t.apply(this, arguments) ? hl : pl)(this, e);
    };
  }
  function rp(e, t) {
    var n = fl(e + "");
    if (arguments.length < 2) {
      for (var r = xs(this.node()), i = -1, s = n.length; ++i < s; ) if (!r.contains(n[i])) return false;
      return true;
    }
    return this.each((typeof t == "function" ? np : t ? ep : tp)(n, t));
  }
  function ip() {
    this.textContent = "";
  }
  function sp(e) {
    return function() {
      this.textContent = e;
    };
  }
  function op(e) {
    return function() {
      var t = e.apply(this, arguments);
      this.textContent = t ?? "";
    };
  }
  function ap(e) {
    return arguments.length ? this.each(e == null ? ip : (typeof e == "function" ? op : sp)(e)) : this.node().textContent;
  }
  function lp() {
    this.innerHTML = "";
  }
  function up(e) {
    return function() {
      this.innerHTML = e;
    };
  }
  function cp(e) {
    return function() {
      var t = e.apply(this, arguments);
      this.innerHTML = t ?? "";
    };
  }
  function fp(e) {
    return arguments.length ? this.each(e == null ? lp : (typeof e == "function" ? cp : up)(e)) : this.node().innerHTML;
  }
  function dp() {
    this.nextSibling && this.parentNode.appendChild(this);
  }
  function hp() {
    return this.each(dp);
  }
  function pp() {
    this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }
  function gp() {
    return this.each(pp);
  }
  function mp(e) {
    var t = typeof e == "function" ? e : bs(e);
    return this.select(function() {
      return this.appendChild(t.apply(this, arguments));
    });
  }
  function vp() {
    return null;
  }
  function _p(e, t) {
    var n = typeof e == "function" ? e : bs(e), r = t == null ? vp : typeof t == "function" ? t : ys(t);
    return this.select(function() {
      return this.insertBefore(n.apply(this, arguments), r.apply(this, arguments) || null);
    });
  }
  function bp() {
    var e = this.parentNode;
    e && e.removeChild(this);
  }
  function yp() {
    return this.each(bp);
  }
  function xp() {
    var e = this.cloneNode(false), t = this.parentNode;
    return t ? t.insertBefore(e, this.nextSibling) : e;
  }
  function wp() {
    var e = this.cloneNode(true), t = this.parentNode;
    return t ? t.insertBefore(e, this.nextSibling) : e;
  }
  function Sp(e) {
    return this.select(e ? wp : xp);
  }
  function Tp(e) {
    return arguments.length ? this.property("__data__", e) : this.node().__data__;
  }
  function Mp(e) {
    return function(t) {
      e.call(this, t, this.__data__);
    };
  }
  function Ep(e) {
    return e.trim().split(/^|\s+/).map(function(t) {
      var n = "", r = t.indexOf(".");
      return r >= 0 && (n = t.slice(r + 1), t = t.slice(0, r)), {
        type: t,
        name: n
      };
    });
  }
  function Pp(e) {
    return function() {
      var t = this.__on;
      if (t) {
        for (var n = 0, r = -1, i = t.length, s; n < i; ++n) s = t[n], (!e.type || s.type === e.type) && s.name === e.name ? this.removeEventListener(s.type, s.listener, s.options) : t[++r] = s;
        ++r ? t.length = r : delete this.__on;
      }
    };
  }
  function Cp(e, t, n) {
    return function() {
      var r = this.__on, i, s = Mp(t);
      if (r) {
        for (var o = 0, a = r.length; o < a; ++o) if ((i = r[o]).type === e.type && i.name === e.name) {
          this.removeEventListener(i.type, i.listener, i.options), this.addEventListener(i.type, i.listener = s, i.options = n), i.value = t;
          return;
        }
      }
      this.addEventListener(e.type, s, n), i = {
        type: e.type,
        name: e.name,
        value: t,
        listener: s,
        options: n
      }, r ? r.push(i) : this.__on = [
        i
      ];
    };
  }
  function Ap(e, t, n) {
    var r = Ep(e + ""), i, s = r.length, o;
    if (arguments.length < 2) {
      var a = this.node().__on;
      if (a) {
        for (var l = 0, u = a.length, c; l < u; ++l) for (i = 0, c = a[l]; i < s; ++i) if ((o = r[i]).type === c.type && o.name === c.name) return c.value;
      }
      return;
    }
    for (a = t ? Cp : Pp, i = 0; i < s; ++i) this.each(a(r[i], t, n));
    return this;
  }
  function gl(e, t, n) {
    var r = cl(e), i = r.CustomEvent;
    typeof i == "function" ? i = new i(t, n) : (i = r.document.createEvent("Event"), n ? (i.initEvent(t, n.bubbles, n.cancelable), i.detail = n.detail) : i.initEvent(t, false, false)), e.dispatchEvent(i);
  }
  function Rp(e, t) {
    return function() {
      return gl(this, e, t);
    };
  }
  function kp(e, t) {
    return function() {
      return gl(this, e, t.apply(this, arguments));
    };
  }
  function Np(e, t) {
    return this.each((typeof t == "function" ? kp : Rp)(e, t));
  }
  function* Op() {
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, s = r.length, o; i < s; ++i) (o = r[i]) && (yield o);
  }
  var ml = [
    null
  ];
  function Be(e, t) {
    this._groups = e, this._parents = t;
  }
  function jn() {
    return new Be([
      [
        document.documentElement
      ]
    ], ml);
  }
  function Ip() {
    return this;
  }
  Be.prototype = jn.prototype = {
    constructor: Be,
    select: oh,
    selectAll: ch,
    selectChild: ph,
    selectChildren: _h,
    filter: bh,
    data: Mh,
    enter: yh,
    exit: Ph,
    join: Ch,
    merge: Ah,
    selection: Ip,
    order: Rh,
    sort: kh,
    call: Oh,
    nodes: Ih,
    node: Lh,
    size: Uh,
    empty: Dh,
    each: Fh,
    attr: Wh,
    style: jh,
    property: Qh,
    classed: rp,
    text: ap,
    html: fp,
    raise: hp,
    lower: gp,
    append: mp,
    insert: _p,
    remove: yp,
    clone: Sp,
    datum: Tp,
    on: Ap,
    dispatch: Np,
    [Symbol.iterator]: Op
  };
  function zt(e) {
    return typeof e == "string" ? new Be([
      [
        document.querySelector(e)
      ]
    ], [
      document.documentElement
    ]) : new Be([
      [
        e
      ]
    ], ml);
  }
  function Lp(e) {
    return zt(bs(e).call(document.documentElement));
  }
  var Up = 0;
  function vl() {
    return new Gi();
  }
  function Gi() {
    this._ = "@" + (++Up).toString(36);
  }
  Gi.prototype = vl.prototype = {
    constructor: Gi,
    get: function(e) {
      for (var t = this._; !(t in e); ) if (!(e = e.parentNode)) return;
      return e[t];
    },
    set: function(e, t) {
      return e[this._] = t;
    },
    remove: function(e) {
      return this._ in e && delete e[this._];
    },
    toString: function() {
      return this._;
    }
  };
  function Dp(e) {
    let t;
    for (; t = e.sourceEvent; ) e = t;
    return e;
  }
  function To(e, t) {
    if (e = Dp(e), t === void 0 && (t = e.currentTarget), t) {
      var n = t.ownerSVGElement || t;
      if (n.createSVGPoint) {
        var r = n.createSVGPoint();
        return r.x = e.clientX, r.y = e.clientY, r = r.matrixTransform(t.getScreenCTM().inverse()), [
          r.x,
          r.y
        ];
      }
      if (t.getBoundingClientRect) {
        var i = t.getBoundingClientRect();
        return [
          e.clientX - i.left - t.clientLeft,
          e.clientY - i.top - t.clientTop
        ];
      }
    }
    return [
      e.pageX,
      e.pageY
    ];
  }
  const Fp = {
    passive: false
  }, Vn = {
    capture: true,
    passive: false
  };
  function xi(e) {
    e.stopImmediatePropagation();
  }
  function ln(e) {
    e.preventDefault(), e.stopImmediatePropagation();
  }
  function Bp(e) {
    var t = e.document.documentElement, n = zt(e).on("dragstart.drag", ln, Vn);
    "onselectstart" in t ? n.on("selectstart.drag", ln, Vn) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = "none");
  }
  function $p(e, t) {
    var n = e.document.documentElement, r = zt(e).on("dragstart.drag", null);
    t && (r.on("click.drag", ln, Vn), setTimeout(function() {
      r.on("click.drag", null);
    }, 0)), "onselectstart" in n ? r.on("selectstart.drag", null) : (n.style.MozUserSelect = n.__noselect, delete n.__noselect);
  }
  const sr = (e) => () => e;
  function Hi(e, { sourceEvent: t, subject: n, target: r, identifier: i, active: s, x: o, y: a, dx: l, dy: u, dispatch: c }) {
    Object.defineProperties(this, {
      type: {
        value: e,
        enumerable: true,
        configurable: true
      },
      sourceEvent: {
        value: t,
        enumerable: true,
        configurable: true
      },
      subject: {
        value: n,
        enumerable: true,
        configurable: true
      },
      target: {
        value: r,
        enumerable: true,
        configurable: true
      },
      identifier: {
        value: i,
        enumerable: true,
        configurable: true
      },
      active: {
        value: s,
        enumerable: true,
        configurable: true
      },
      x: {
        value: o,
        enumerable: true,
        configurable: true
      },
      y: {
        value: a,
        enumerable: true,
        configurable: true
      },
      dx: {
        value: l,
        enumerable: true,
        configurable: true
      },
      dy: {
        value: u,
        enumerable: true,
        configurable: true
      },
      _: {
        value: c
      }
    });
  }
  Hi.prototype.on = function() {
    var e = this._.on.apply(this._, arguments);
    return e === this._ ? this : e;
  };
  function Vp(e) {
    return !e.ctrlKey && !e.button;
  }
  function zp() {
    return this.parentNode;
  }
  function Gp(e, t) {
    return t ?? {
      x: e.x,
      y: e.y
    };
  }
  function Hp() {
    return navigator.maxTouchPoints || "ontouchstart" in this;
  }
  function Wp() {
    var e = Vp, t = zp, n = Gp, r = Hp, i = {}, s = _s("start", "drag", "end"), o = 0, a, l, u, c, f = 0;
    function h(_) {
      _.on("mousedown.drag", d).filter(r).on("touchstart.drag", L).on("touchmove.drag", V, Fp).on("touchend.drag touchcancel.drag", U).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }
    function d(_, w) {
      if (!(c || !e.call(this, _, w))) {
        var I = $(this, t.call(this, _, w), _, w, "mouse");
        I && (zt(_.view).on("mousemove.drag", b, Vn).on("mouseup.drag", y, Vn), Bp(_.view), xi(_), u = false, a = _.clientX, l = _.clientY, I("start", _));
      }
    }
    function b(_) {
      if (ln(_), !u) {
        var w = _.clientX - a, I = _.clientY - l;
        u = w * w + I * I > f;
      }
      i.mouse("drag", _);
    }
    function y(_) {
      zt(_.view).on("mousemove.drag mouseup.drag", null), $p(_.view, u), ln(_), i.mouse("end", _);
    }
    function L(_, w) {
      if (e.call(this, _, w)) {
        var I = _.changedTouches, z = t.call(this, _, w), X = I.length, Q, q;
        for (Q = 0; Q < X; ++Q) (q = $(this, z, _, w, I[Q].identifier, I[Q])) && (xi(_), q("start", _, I[Q]));
      }
    }
    function V(_) {
      var w = _.changedTouches, I = w.length, z, X;
      for (z = 0; z < I; ++z) (X = i[w[z].identifier]) && (ln(_), X("drag", _, w[z]));
    }
    function U(_) {
      var w = _.changedTouches, I = w.length, z, X;
      for (c && clearTimeout(c), c = setTimeout(function() {
        c = null;
      }, 500), z = 0; z < I; ++z) (X = i[w[z].identifier]) && (xi(_), X("end", _, w[z]));
    }
    function $(_, w, I, z, X, Q) {
      var q = s.copy(), j = To(Q || I, w), F, te, ce;
      if ((ce = n.call(_, new Hi("beforestart", {
        sourceEvent: I,
        target: h,
        identifier: X,
        active: o,
        x: j[0],
        y: j[1],
        dx: 0,
        dy: 0,
        dispatch: q
      }), z)) != null) return F = ce.x - j[0] || 0, te = ce.y - j[1] || 0, function xe(N, A, B) {
        var J = j, C;
        switch (N) {
          case "start":
            i[X] = xe, C = o++;
            break;
          case "end":
            delete i[X], --o;
          case "drag":
            j = To(B || A, w), C = o;
            break;
        }
        q.call(N, _, new Hi(N, {
          sourceEvent: A,
          subject: ce,
          target: h,
          identifier: X,
          active: C,
          x: j[0] + F,
          y: j[1] + te,
          dx: j[0] - J[0],
          dy: j[1] - J[1],
          dispatch: q
        }), z);
      };
    }
    return h.filter = function(_) {
      return arguments.length ? (e = typeof _ == "function" ? _ : sr(!!_), h) : e;
    }, h.container = function(_) {
      return arguments.length ? (t = typeof _ == "function" ? _ : sr(_), h) : t;
    }, h.subject = function(_) {
      return arguments.length ? (n = typeof _ == "function" ? _ : sr(_), h) : n;
    }, h.touchable = function(_) {
      return arguments.length ? (r = typeof _ == "function" ? _ : sr(!!_), h) : r;
    }, h.on = function() {
      var _ = s.on.apply(s, arguments);
      return _ === s ? h : _;
    }, h.clickDistance = function(_) {
      return arguments.length ? (f = (_ = +_) * _, h) : Math.sqrt(f);
    }, h;
  }
  var dn = 0, wn = 0, yn = 0, _l = 1e3, Or, Sn, Ir = 0, Gt = 0, ti = 0, zn = typeof performance == "object" && performance.now ? performance : Date, bl = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(e) {
    setTimeout(e, 17);
  };
  function ws() {
    return Gt || (bl(qp), Gt = zn.now() + ti);
  }
  function qp() {
    Gt = 0;
  }
  function Lr() {
    this._call = this._time = this._next = null;
  }
  Lr.prototype = yl.prototype = {
    constructor: Lr,
    restart: function(e, t, n) {
      if (typeof e != "function") throw new TypeError("callback is not a function");
      n = (n == null ? ws() : +n) + (t == null ? 0 : +t), !this._next && Sn !== this && (Sn ? Sn._next = this : Or = this, Sn = this), this._call = e, this._time = n, Wi();
    },
    stop: function() {
      this._call && (this._call = null, this._time = 1 / 0, Wi());
    }
  };
  function yl(e, t, n) {
    var r = new Lr();
    return r.restart(e, t, n), r;
  }
  function Kp() {
    ws(), ++dn;
    for (var e = Or, t; e; ) (t = Gt - e._time) >= 0 && e._call.call(void 0, t), e = e._next;
    --dn;
  }
  function Mo() {
    Gt = (Ir = zn.now()) + ti, dn = wn = 0;
    try {
      Kp();
    } finally {
      dn = 0, jp(), Gt = 0;
    }
  }
  function Xp() {
    var e = zn.now(), t = e - Ir;
    t > _l && (ti -= t, Ir = e);
  }
  function jp() {
    for (var e, t = Or, n, r = 1 / 0; t; ) t._call ? (r > t._time && (r = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : Or = n);
    Sn = e, Wi(r);
  }
  function Wi(e) {
    if (!dn) {
      wn && (wn = clearTimeout(wn));
      var t = e - Gt;
      t > 24 ? (e < 1 / 0 && (wn = setTimeout(Mo, e - zn.now() - ti)), yn && (yn = clearInterval(yn))) : (yn || (Ir = zn.now(), yn = setInterval(Xp, _l)), dn = 1, bl(Mo));
    }
  }
  function Eo(e, t, n) {
    var r = new Lr();
    return t = t == null ? 0 : +t, r.restart((i) => {
      r.stop(), e(i + t);
    }, t, n), r;
  }
  var Yp = _s("start", "end", "cancel", "interrupt"), Zp = [], xl = 0, Po = 1, qi = 2, gr = 3, Co = 4, Ki = 5, mr = 6;
  function ni(e, t, n, r, i, s) {
    var o = e.__transition;
    if (!o) e.__transition = {};
    else if (n in o) return;
    Jp(e, n, {
      name: t,
      index: r,
      group: i,
      on: Yp,
      tween: Zp,
      time: s.time,
      delay: s.delay,
      duration: s.duration,
      ease: s.ease,
      timer: null,
      state: xl
    });
  }
  function Ss(e, t) {
    var n = Xe(e, t);
    if (n.state > xl) throw new Error("too late; already scheduled");
    return n;
  }
  function ut(e, t) {
    var n = Xe(e, t);
    if (n.state > gr) throw new Error("too late; already running");
    return n;
  }
  function Xe(e, t) {
    var n = e.__transition;
    if (!n || !(n = n[t])) throw new Error("transition not found");
    return n;
  }
  function Jp(e, t, n) {
    var r = e.__transition, i;
    r[t] = n, n.timer = yl(s, 0, n.time);
    function s(u) {
      n.state = Po, n.timer.restart(o, n.delay, n.time), n.delay <= u && o(u - n.delay);
    }
    function o(u) {
      var c, f, h, d;
      if (n.state !== Po) return l();
      for (c in r) if (d = r[c], d.name === n.name) {
        if (d.state === gr) return Eo(o);
        d.state === Co ? (d.state = mr, d.timer.stop(), d.on.call("interrupt", e, e.__data__, d.index, d.group), delete r[c]) : +c < t && (d.state = mr, d.timer.stop(), d.on.call("cancel", e, e.__data__, d.index, d.group), delete r[c]);
      }
      if (Eo(function() {
        n.state === gr && (n.state = Co, n.timer.restart(a, n.delay, n.time), a(u));
      }), n.state = qi, n.on.call("start", e, e.__data__, n.index, n.group), n.state === qi) {
        for (n.state = gr, i = new Array(h = n.tween.length), c = 0, f = -1; c < h; ++c) (d = n.tween[c].value.call(e, e.__data__, n.index, n.group)) && (i[++f] = d);
        i.length = f + 1;
      }
    }
    function a(u) {
      for (var c = u < n.duration ? n.ease.call(null, u / n.duration) : (n.timer.restart(l), n.state = Ki, 1), f = -1, h = i.length; ++f < h; ) i[f].call(e, c);
      n.state === Ki && (n.on.call("end", e, e.__data__, n.index, n.group), l());
    }
    function l() {
      n.state = mr, n.timer.stop(), delete r[t];
      for (var u in r) return;
      delete e.__transition;
    }
  }
  function Qp(e, t) {
    var n = e.__transition, r, i, s = true, o;
    if (n) {
      t = t == null ? null : t + "";
      for (o in n) {
        if ((r = n[o]).name !== t) {
          s = false;
          continue;
        }
        i = r.state > qi && r.state < Ki, r.state = mr, r.timer.stop(), r.on.call(i ? "interrupt" : "cancel", e, e.__data__, r.index, r.group), delete n[o];
      }
      s && delete e.__transition;
    }
  }
  function eg(e) {
    return this.each(function() {
      Qp(this, e);
    });
  }
  function tg(e, t) {
    var n, r;
    return function() {
      var i = ut(this, e), s = i.tween;
      if (s !== n) {
        r = n = s;
        for (var o = 0, a = r.length; o < a; ++o) if (r[o].name === t) {
          r = r.slice(), r.splice(o, 1);
          break;
        }
      }
      i.tween = r;
    };
  }
  function ng(e, t, n) {
    var r, i;
    if (typeof n != "function") throw new Error();
    return function() {
      var s = ut(this, e), o = s.tween;
      if (o !== r) {
        i = (r = o).slice();
        for (var a = {
          name: t,
          value: n
        }, l = 0, u = i.length; l < u; ++l) if (i[l].name === t) {
          i[l] = a;
          break;
        }
        l === u && i.push(a);
      }
      s.tween = i;
    };
  }
  function rg(e, t) {
    var n = this._id;
    if (e += "", arguments.length < 2) {
      for (var r = Xe(this.node(), n).tween, i = 0, s = r.length, o; i < s; ++i) if ((o = r[i]).name === e) return o.value;
      return null;
    }
    return this.each((t == null ? tg : ng)(n, e, t));
  }
  function Ts(e, t, n) {
    var r = e._id;
    return e.each(function() {
      var i = ut(this, r);
      (i.value || (i.value = {}))[t] = n.apply(this, arguments);
    }), function(i) {
      return Xe(i, r).value[t];
    };
  }
  function wl(e, t) {
    var n;
    return (typeof t == "number" ? He : t instanceof Vt ? Ar : (n = Vt(t)) ? (t = n, Ar) : nl)(e, t);
  }
  function ig(e) {
    return function() {
      this.removeAttribute(e);
    };
  }
  function sg(e) {
    return function() {
      this.removeAttributeNS(e.space, e.local);
    };
  }
  function og(e, t, n) {
    var r, i = n + "", s;
    return function() {
      var o = this.getAttribute(e);
      return o === i ? null : o === r ? s : s = t(r = o, n);
    };
  }
  function ag(e, t, n) {
    var r, i = n + "", s;
    return function() {
      var o = this.getAttributeNS(e.space, e.local);
      return o === i ? null : o === r ? s : s = t(r = o, n);
    };
  }
  function lg(e, t, n) {
    var r, i, s;
    return function() {
      var o, a = n(this), l;
      return a == null ? void this.removeAttribute(e) : (o = this.getAttribute(e), l = a + "", o === l ? null : o === r && l === i ? s : (i = l, s = t(r = o, a)));
    };
  }
  function ug(e, t, n) {
    var r, i, s;
    return function() {
      var o, a = n(this), l;
      return a == null ? void this.removeAttributeNS(e.space, e.local) : (o = this.getAttributeNS(e.space, e.local), l = a + "", o === l ? null : o === r && l === i ? s : (i = l, s = t(r = o, a)));
    };
  }
  function cg(e, t) {
    var n = ei(e), r = n === "transform" ? Pd : wl;
    return this.attrTween(e, typeof t == "function" ? (n.local ? ug : lg)(n, r, Ts(this, "attr." + e, t)) : t == null ? (n.local ? sg : ig)(n) : (n.local ? ag : og)(n, r, t));
  }
  function fg(e, t) {
    return function(n) {
      this.setAttribute(e, t.call(this, n));
    };
  }
  function dg(e, t) {
    return function(n) {
      this.setAttributeNS(e.space, e.local, t.call(this, n));
    };
  }
  function hg(e, t) {
    var n, r;
    function i() {
      var s = t.apply(this, arguments);
      return s !== r && (n = (r = s) && dg(e, s)), n;
    }
    return i._value = t, i;
  }
  function pg(e, t) {
    var n, r;
    function i() {
      var s = t.apply(this, arguments);
      return s !== r && (n = (r = s) && fg(e, s)), n;
    }
    return i._value = t, i;
  }
  function gg(e, t) {
    var n = "attr." + e;
    if (arguments.length < 2) return (n = this.tween(n)) && n._value;
    if (t == null) return this.tween(n, null);
    if (typeof t != "function") throw new Error();
    var r = ei(e);
    return this.tween(n, (r.local ? hg : pg)(r, t));
  }
  function mg(e, t) {
    return function() {
      Ss(this, e).delay = +t.apply(this, arguments);
    };
  }
  function vg(e, t) {
    return t = +t, function() {
      Ss(this, e).delay = t;
    };
  }
  function _g(e) {
    var t = this._id;
    return arguments.length ? this.each((typeof e == "function" ? mg : vg)(t, e)) : Xe(this.node(), t).delay;
  }
  function bg(e, t) {
    return function() {
      ut(this, e).duration = +t.apply(this, arguments);
    };
  }
  function yg(e, t) {
    return t = +t, function() {
      ut(this, e).duration = t;
    };
  }
  function xg(e) {
    var t = this._id;
    return arguments.length ? this.each((typeof e == "function" ? bg : yg)(t, e)) : Xe(this.node(), t).duration;
  }
  function wg(e, t) {
    if (typeof t != "function") throw new Error();
    return function() {
      ut(this, e).ease = t;
    };
  }
  function Sg(e) {
    var t = this._id;
    return arguments.length ? this.each(wg(t, e)) : Xe(this.node(), t).ease;
  }
  function Tg(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      if (typeof n != "function") throw new Error();
      ut(this, e).ease = n;
    };
  }
  function Mg(e) {
    if (typeof e != "function") throw new Error();
    return this.each(Tg(this._id, e));
  }
  function Eg(e) {
    typeof e != "function" && (e = al(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var s = t[i], o = s.length, a = r[i] = [], l, u = 0; u < o; ++u) (l = s[u]) && e.call(l, l.__data__, u, s) && a.push(l);
    return new wt(r, this._parents, this._name, this._id);
  }
  function Pg(e) {
    if (e._id !== this._id) throw new Error();
    for (var t = this._groups, n = e._groups, r = t.length, i = n.length, s = Math.min(r, i), o = new Array(r), a = 0; a < s; ++a) for (var l = t[a], u = n[a], c = l.length, f = o[a] = new Array(c), h, d = 0; d < c; ++d) (h = l[d] || u[d]) && (f[d] = h);
    for (; a < r; ++a) o[a] = t[a];
    return new wt(o, this._parents, this._name, this._id);
  }
  function Cg(e) {
    return (e + "").trim().split(/^|\s+/).every(function(t) {
      var n = t.indexOf(".");
      return n >= 0 && (t = t.slice(0, n)), !t || t === "start";
    });
  }
  function Ag(e, t, n) {
    var r, i, s = Cg(t) ? Ss : ut;
    return function() {
      var o = s(this, e), a = o.on;
      a !== r && (i = (r = a).copy()).on(t, n), o.on = i;
    };
  }
  function Rg(e, t) {
    var n = this._id;
    return arguments.length < 2 ? Xe(this.node(), n).on.on(e) : this.each(Ag(n, e, t));
  }
  function kg(e) {
    return function() {
      var t = this.parentNode;
      for (var n in this.__transition) if (+n !== e) return;
      t && t.removeChild(this);
    };
  }
  function Ng() {
    return this.on("end.remove", kg(this._id));
  }
  function Og(e) {
    var t = this._name, n = this._id;
    typeof e != "function" && (e = ys(e));
    for (var r = this._groups, i = r.length, s = new Array(i), o = 0; o < i; ++o) for (var a = r[o], l = a.length, u = s[o] = new Array(l), c, f, h = 0; h < l; ++h) (c = a[h]) && (f = e.call(c, c.__data__, h, a)) && ("__data__" in c && (f.__data__ = c.__data__), u[h] = f, ni(u[h], t, n, h, u, Xe(c, n)));
    return new wt(s, this._parents, t, n);
  }
  function Ig(e) {
    var t = this._name, n = this._id;
    typeof e != "function" && (e = ol(e));
    for (var r = this._groups, i = r.length, s = [], o = [], a = 0; a < i; ++a) for (var l = r[a], u = l.length, c, f = 0; f < u; ++f) if (c = l[f]) {
      for (var h = e.call(c, c.__data__, f, l), d, b = Xe(c, n), y = 0, L = h.length; y < L; ++y) (d = h[y]) && ni(d, t, n, y, h, b);
      s.push(h), o.push(c);
    }
    return new wt(s, o, t, n);
  }
  var Lg = jn.prototype.constructor;
  function Ug() {
    return new Lg(this._groups, this._parents);
  }
  function Dg(e, t) {
    var n, r, i;
    return function() {
      var s = fn(this, e), o = (this.style.removeProperty(e), fn(this, e));
      return s === o ? null : s === n && o === r ? i : i = t(n = s, r = o);
    };
  }
  function Sl(e) {
    return function() {
      this.style.removeProperty(e);
    };
  }
  function Fg(e, t, n) {
    var r, i = n + "", s;
    return function() {
      var o = fn(this, e);
      return o === i ? null : o === r ? s : s = t(r = o, n);
    };
  }
  function Bg(e, t, n) {
    var r, i, s;
    return function() {
      var o = fn(this, e), a = n(this), l = a + "";
      return a == null && (l = a = (this.style.removeProperty(e), fn(this, e))), o === l ? null : o === r && l === i ? s : (i = l, s = t(r = o, a));
    };
  }
  function $g(e, t) {
    var n, r, i, s = "style." + t, o = "end." + s, a;
    return function() {
      var l = ut(this, e), u = l.on, c = l.value[s] == null ? a || (a = Sl(t)) : void 0;
      (u !== n || i !== c) && (r = (n = u).copy()).on(o, i = c), l.on = r;
    };
  }
  function Vg(e, t, n) {
    var r = (e += "") == "transform" ? Ed : wl;
    return t == null ? this.styleTween(e, Dg(e, r)).on("end.style." + e, Sl(e)) : typeof t == "function" ? this.styleTween(e, Bg(e, r, Ts(this, "style." + e, t))).each($g(this._id, e)) : this.styleTween(e, Fg(e, r, t), n).on("end.style." + e, null);
  }
  function zg(e, t, n) {
    return function(r) {
      this.style.setProperty(e, t.call(this, r), n);
    };
  }
  function Gg(e, t, n) {
    var r, i;
    function s() {
      var o = t.apply(this, arguments);
      return o !== i && (r = (i = o) && zg(e, o, n)), r;
    }
    return s._value = t, s;
  }
  function Hg(e, t, n) {
    var r = "style." + (e += "");
    if (arguments.length < 2) return (r = this.tween(r)) && r._value;
    if (t == null) return this.tween(r, null);
    if (typeof t != "function") throw new Error();
    return this.tween(r, Gg(e, t, n ?? ""));
  }
  function Wg(e) {
    return function() {
      this.textContent = e;
    };
  }
  function qg(e) {
    return function() {
      var t = e(this);
      this.textContent = t ?? "";
    };
  }
  function Kg(e) {
    return this.tween("text", typeof e == "function" ? qg(Ts(this, "text", e)) : Wg(e == null ? "" : e + ""));
  }
  function Xg(e) {
    return function(t) {
      this.textContent = e.call(this, t);
    };
  }
  function jg(e) {
    var t, n;
    function r() {
      var i = e.apply(this, arguments);
      return i !== n && (t = (n = i) && Xg(i)), t;
    }
    return r._value = e, r;
  }
  function Yg(e) {
    var t = "text";
    if (arguments.length < 1) return (t = this.tween(t)) && t._value;
    if (e == null) return this.tween(t, null);
    if (typeof e != "function") throw new Error();
    return this.tween(t, jg(e));
  }
  function Zg() {
    for (var e = this._name, t = this._id, n = Tl(), r = this._groups, i = r.length, s = 0; s < i; ++s) for (var o = r[s], a = o.length, l, u = 0; u < a; ++u) if (l = o[u]) {
      var c = Xe(l, t);
      ni(l, e, n, u, o, {
        time: c.time + c.delay + c.duration,
        delay: 0,
        duration: c.duration,
        ease: c.ease
      });
    }
    return new wt(r, this._parents, e, n);
  }
  function Jg() {
    var e, t, n = this, r = n._id, i = n.size();
    return new Promise(function(s, o) {
      var a = {
        value: o
      }, l = {
        value: function() {
          --i === 0 && s();
        }
      };
      n.each(function() {
        var u = ut(this, r), c = u.on;
        c !== e && (t = (e = c).copy(), t._.cancel.push(a), t._.interrupt.push(a), t._.end.push(l)), u.on = t;
      }), i === 0 && s();
    });
  }
  var Qg = 0;
  function wt(e, t, n, r) {
    this._groups = e, this._parents = t, this._name = n, this._id = r;
  }
  function Tl() {
    return ++Qg;
  }
  var dt = jn.prototype;
  wt.prototype = {
    constructor: wt,
    select: Og,
    selectAll: Ig,
    selectChild: dt.selectChild,
    selectChildren: dt.selectChildren,
    filter: Eg,
    merge: Pg,
    selection: Ug,
    transition: Zg,
    call: dt.call,
    nodes: dt.nodes,
    node: dt.node,
    size: dt.size,
    empty: dt.empty,
    each: dt.each,
    on: Rg,
    attr: cg,
    attrTween: gg,
    style: Vg,
    styleTween: Hg,
    text: Kg,
    textTween: Yg,
    remove: Ng,
    tween: rg,
    delay: _g,
    duration: xg,
    ease: Sg,
    easeVarying: Mg,
    end: Jg,
    [Symbol.iterator]: dt[Symbol.iterator]
  };
  function e0(e) {
    return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2;
  }
  var t0 = {
    time: null,
    delay: 0,
    duration: 250,
    ease: e0
  };
  function n0(e, t) {
    for (var n; !(n = e.__transition) || !(n = n[t]); ) if (!(e = e.parentNode)) throw new Error(`transition ${t} not found`);
    return n;
  }
  function r0(e) {
    var t, n;
    e instanceof wt ? (t = e._id, e = e._name) : (t = Tl(), (n = t0).time = ws(), e = e == null ? null : e + "");
    for (var r = this._groups, i = r.length, s = 0; s < i; ++s) for (var o = r[s], a = o.length, l, u = 0; u < a; ++u) (l = o[u]) && ni(l, e, t, u, o, n || n0(l, t));
    return new wt(r, this._parents, e, t);
  }
  jn.prototype.interrupt = eg;
  jn.prototype.transition = r0;
  function i0(e) {
    return Math.abs(e = Math.round(e)) >= 1e21 ? e.toLocaleString("en").replace(/,/g, "") : e.toString(10);
  }
  function Ur(e, t) {
    if (!isFinite(e) || e === 0) return null;
    var n = (e = t ? e.toExponential(t - 1) : e.toExponential()).indexOf("e"), r = e.slice(0, n);
    return [
      r.length > 1 ? r[0] + r.slice(2) : r,
      +e.slice(n + 1)
    ];
  }
  function hn(e) {
    return e = Ur(Math.abs(e)), e ? e[1] : NaN;
  }
  function s0(e, t) {
    return function(n, r) {
      for (var i = n.length, s = [], o = 0, a = e[0], l = 0; i > 0 && a > 0 && (l + a + 1 > r && (a = Math.max(1, r - l)), s.push(n.substring(i -= a, i + a)), !((l += a + 1) > r)); ) a = e[o = (o + 1) % e.length];
      return s.reverse().join(t);
    };
  }
  function o0(e) {
    return function(t) {
      return t.replace(/[0-9]/g, function(n) {
        return e[+n];
      });
    };
  }
  var a0 = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
  function Dr(e) {
    if (!(t = a0.exec(e))) throw new Error("invalid format: " + e);
    var t;
    return new Ms({
      fill: t[1],
      align: t[2],
      sign: t[3],
      symbol: t[4],
      zero: t[5],
      width: t[6],
      comma: t[7],
      precision: t[8] && t[8].slice(1),
      trim: t[9],
      type: t[10]
    });
  }
  Dr.prototype = Ms.prototype;
  function Ms(e) {
    this.fill = e.fill === void 0 ? " " : e.fill + "", this.align = e.align === void 0 ? ">" : e.align + "", this.sign = e.sign === void 0 ? "-" : e.sign + "", this.symbol = e.symbol === void 0 ? "" : e.symbol + "", this.zero = !!e.zero, this.width = e.width === void 0 ? void 0 : +e.width, this.comma = !!e.comma, this.precision = e.precision === void 0 ? void 0 : +e.precision, this.trim = !!e.trim, this.type = e.type === void 0 ? "" : e.type + "";
  }
  Ms.prototype.toString = function() {
    return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
  };
  function l0(e) {
    e: for (var t = e.length, n = 1, r = -1, i; n < t; ++n) switch (e[n]) {
      case ".":
        r = i = n;
        break;
      case "0":
        r === 0 && (r = n), i = n;
        break;
      default:
        if (!+e[n]) break e;
        r > 0 && (r = 0);
        break;
    }
    return r > 0 ? e.slice(0, r) + e.slice(i + 1) : e;
  }
  var Fr;
  function u0(e, t) {
    var n = Ur(e, t);
    if (!n) return Fr = void 0, e.toPrecision(t);
    var r = n[0], i = n[1], s = i - (Fr = Math.max(-8, Math.min(8, Math.floor(i / 3))) * 3) + 1, o = r.length;
    return s === o ? r : s > o ? r + new Array(s - o + 1).join("0") : s > 0 ? r.slice(0, s) + "." + r.slice(s) : "0." + new Array(1 - s).join("0") + Ur(e, Math.max(0, t + s - 1))[0];
  }
  function Ao(e, t) {
    var n = Ur(e, t);
    if (!n) return e + "";
    var r = n[0], i = n[1];
    return i < 0 ? "0." + new Array(-i).join("0") + r : r.length > i + 1 ? r.slice(0, i + 1) + "." + r.slice(i + 1) : r + new Array(i - r.length + 2).join("0");
  }
  const Ro = {
    "%": (e, t) => (e * 100).toFixed(t),
    b: (e) => Math.round(e).toString(2),
    c: (e) => e + "",
    d: i0,
    e: (e, t) => e.toExponential(t),
    f: (e, t) => e.toFixed(t),
    g: (e, t) => e.toPrecision(t),
    o: (e) => Math.round(e).toString(8),
    p: (e, t) => Ao(e * 100, t),
    r: Ao,
    s: u0,
    X: (e) => Math.round(e).toString(16).toUpperCase(),
    x: (e) => Math.round(e).toString(16)
  };
  function ko(e) {
    return e;
  }
  var No = Array.prototype.map, Oo = [
    "y",
    "z",
    "a",
    "f",
    "p",
    "n",
    "\xB5",
    "m",
    "",
    "k",
    "M",
    "G",
    "T",
    "P",
    "E",
    "Z",
    "Y"
  ];
  function c0(e) {
    var t = e.grouping === void 0 || e.thousands === void 0 ? ko : s0(No.call(e.grouping, Number), e.thousands + ""), n = e.currency === void 0 ? "" : e.currency[0] + "", r = e.currency === void 0 ? "" : e.currency[1] + "", i = e.decimal === void 0 ? "." : e.decimal + "", s = e.numerals === void 0 ? ko : o0(No.call(e.numerals, String)), o = e.percent === void 0 ? "%" : e.percent + "", a = e.minus === void 0 ? "\u2212" : e.minus + "", l = e.nan === void 0 ? "NaN" : e.nan + "";
    function u(f, h) {
      f = Dr(f);
      var d = f.fill, b = f.align, y = f.sign, L = f.symbol, V = f.zero, U = f.width, $ = f.comma, _ = f.precision, w = f.trim, I = f.type;
      I === "n" ? ($ = true, I = "g") : Ro[I] || (_ === void 0 && (_ = 12), w = true, I = "g"), (V || d === "0" && b === "=") && (V = true, d = "0", b = "=");
      var z = (h && h.prefix !== void 0 ? h.prefix : "") + (L === "$" ? n : L === "#" && /[boxX]/.test(I) ? "0" + I.toLowerCase() : ""), X = (L === "$" ? r : /[%p]/.test(I) ? o : "") + (h && h.suffix !== void 0 ? h.suffix : ""), Q = Ro[I], q = /[defgprs%]/.test(I);
      _ = _ === void 0 ? 6 : /[gprs]/.test(I) ? Math.max(1, Math.min(21, _)) : Math.max(0, Math.min(20, _));
      function j(F) {
        var te = z, ce = X, xe, N, A;
        if (I === "c") ce = Q(F) + ce, F = "";
        else {
          F = +F;
          var B = F < 0 || 1 / F < 0;
          if (F = isNaN(F) ? l : Q(Math.abs(F), _), w && (F = l0(F)), B && +F == 0 && y !== "+" && (B = false), te = (B ? y === "(" ? y : a : y === "-" || y === "(" ? "" : y) + te, ce = (I === "s" && !isNaN(F) && Fr !== void 0 ? Oo[8 + Fr / 3] : "") + ce + (B && y === "(" ? ")" : ""), q) {
            for (xe = -1, N = F.length; ++xe < N; ) if (A = F.charCodeAt(xe), 48 > A || A > 57) {
              ce = (A === 46 ? i + F.slice(xe + 1) : F.slice(xe)) + ce, F = F.slice(0, xe);
              break;
            }
          }
        }
        $ && !V && (F = t(F, 1 / 0));
        var J = te.length + F.length + ce.length, C = J < U ? new Array(U - J + 1).join(d) : "";
        switch ($ && V && (F = t(C + F, C.length ? U - ce.length : 1 / 0), C = ""), b) {
          case "<":
            F = te + F + ce + C;
            break;
          case "=":
            F = te + C + F + ce;
            break;
          case "^":
            F = C.slice(0, J = C.length >> 1) + te + F + ce + C.slice(J);
            break;
          default:
            F = C + te + F + ce;
            break;
        }
        return s(F);
      }
      return j.toString = function() {
        return f + "";
      }, j;
    }
    function c(f, h) {
      var d = Math.max(-8, Math.min(8, Math.floor(hn(h) / 3))) * 3, b = Math.pow(10, -d), y = u((f = Dr(f), f.type = "f", f), {
        suffix: Oo[8 + d / 3]
      });
      return function(L) {
        return y(b * L);
      };
    }
    return {
      format: u,
      formatPrefix: c
    };
  }
  var or, Ml, El;
  f0({
    thousands: ",",
    grouping: [
      3
    ],
    currency: [
      "$",
      ""
    ]
  });
  function f0(e) {
    return or = c0(e), Ml = or.format, El = or.formatPrefix, or;
  }
  function d0(e) {
    return Math.max(0, -hn(Math.abs(e)));
  }
  function h0(e, t) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(hn(t) / 3))) * 3 - hn(Math.abs(e)));
  }
  function p0(e, t) {
    return e = Math.abs(e), t = Math.abs(t) - e, Math.max(0, hn(t) - hn(e)) + 1;
  }
  function g0(e, t) {
    switch (arguments.length) {
      case 0:
        break;
      case 1:
        this.range(e);
        break;
      default:
        this.range(t).domain(e);
        break;
    }
    return this;
  }
  function m0(e) {
    return function() {
      return e;
    };
  }
  function v0(e) {
    return +e;
  }
  var Io = [
    0,
    1
  ];
  function Qt(e) {
    return e;
  }
  function Xi(e, t) {
    return (t -= e = +e) ? function(n) {
      return (n - e) / t;
    } : m0(isNaN(t) ? NaN : 0.5);
  }
  function _0(e, t) {
    var n;
    return e > t && (n = e, e = t, t = n), function(r) {
      return Math.max(e, Math.min(t, r));
    };
  }
  function b0(e, t, n) {
    var r = e[0], i = e[1], s = t[0], o = t[1];
    return i < r ? (r = Xi(i, r), s = n(o, s)) : (r = Xi(r, i), s = n(s, o)), function(a) {
      return s(r(a));
    };
  }
  function y0(e, t, n) {
    var r = Math.min(e.length, t.length) - 1, i = new Array(r), s = new Array(r), o = -1;
    for (e[r] < e[0] && (e = e.slice().reverse(), t = t.slice().reverse()); ++o < r; ) i[o] = Xi(e[o], e[o + 1]), s[o] = n(t[o], t[o + 1]);
    return function(a) {
      var l = $d(e, a, 1, r) - 1;
      return s[l](i[l](a));
    };
  }
  function x0(e, t) {
    return t.domain(e.domain()).range(e.range()).interpolate(e.interpolate()).clamp(e.clamp()).unknown(e.unknown());
  }
  function w0() {
    var e = Io, t = Io, n = vs, r, i, s, o = Qt, a, l, u;
    function c() {
      var h = Math.min(e.length, t.length);
      return o !== Qt && (o = _0(e[0], e[h - 1])), a = h > 2 ? y0 : b0, l = u = null, f;
    }
    function f(h) {
      return h == null || isNaN(h = +h) ? s : (l || (l = a(e.map(r), t, n)))(r(o(h)));
    }
    return f.invert = function(h) {
      return o(i((u || (u = a(t, e.map(r), He)))(h)));
    }, f.domain = function(h) {
      return arguments.length ? (e = Array.from(h, v0), c()) : e.slice();
    }, f.range = function(h) {
      return arguments.length ? (t = Array.from(h), c()) : t.slice();
    }, f.rangeRound = function(h) {
      return t = Array.from(h), n = Sd, c();
    }, f.clamp = function(h) {
      return arguments.length ? (o = h ? true : Qt, c()) : o !== Qt;
    }, f.interpolate = function(h) {
      return arguments.length ? (n = h, c()) : n;
    }, f.unknown = function(h) {
      return arguments.length ? (s = h, f) : s;
    }, function(h, d) {
      return r = h, i = d, c();
    };
  }
  function S0() {
    return w0()(Qt, Qt);
  }
  function T0(e, t, n, r) {
    var i = Wd(e, t, n), s;
    switch (r = Dr(r ?? ",f"), r.type) {
      case "s": {
        var o = Math.max(Math.abs(e), Math.abs(t));
        return r.precision == null && !isNaN(s = h0(i, o)) && (r.precision = s), El(r, o);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        r.precision == null && !isNaN(s = p0(i, Math.max(Math.abs(e), Math.abs(t)))) && (r.precision = s - (r.type === "e"));
        break;
      }
      case "f":
      case "%": {
        r.precision == null && !isNaN(s = d0(i)) && (r.precision = s - (r.type === "%") * 2);
        break;
      }
    }
    return Ml(r);
  }
  function M0(e) {
    var t = e.domain;
    return e.ticks = function(n) {
      var r = t();
      return Hd(r[0], r[r.length - 1], n ?? 10);
    }, e.tickFormat = function(n, r) {
      var i = t();
      return T0(i[0], i[i.length - 1], n ?? 10, r);
    }, e.nice = function(n) {
      n == null && (n = 10);
      var r = t(), i = 0, s = r.length - 1, o = r[i], a = r[s], l, u, c = 10;
      for (a < o && (u = o, o = a, a = u, u = i, i = s, s = u); c-- > 0; ) {
        if (u = Vi(o, a, n), u === l) return r[i] = o, r[s] = a, t(r);
        if (u > 0) o = Math.floor(o / u) * u, a = Math.ceil(a / u) * u;
        else if (u < 0) o = Math.ceil(o * u) / u, a = Math.floor(a * u) / u;
        else break;
        l = u;
      }
      return e;
    }, e;
  }
  function Pl() {
    var e = S0();
    return e.copy = function() {
      return x0(e, Pl());
    }, g0.apply(e, arguments), M0(e);
  }
  function Tn(e, t, n) {
    this.k = e, this.x = t, this.y = n;
  }
  Tn.prototype = {
    constructor: Tn,
    scale: function(e) {
      return e === 1 ? this : new Tn(this.k * e, this.x, this.y);
    },
    translate: function(e, t) {
      return e === 0 & t === 0 ? this : new Tn(this.k, this.x + this.k * e, this.y + this.k * t);
    },
    apply: function(e) {
      return [
        e[0] * this.k + this.x,
        e[1] * this.k + this.y
      ];
    },
    applyX: function(e) {
      return e * this.k + this.x;
    },
    applyY: function(e) {
      return e * this.k + this.y;
    },
    invert: function(e) {
      return [
        (e[0] - this.x) / this.k,
        (e[1] - this.y) / this.k
      ];
    },
    invertX: function(e) {
      return (e - this.x) / this.k;
    },
    invertY: function(e) {
      return (e - this.y) / this.k;
    },
    rescaleX: function(e) {
      return e.copy().domain(e.range().map(this.invertX, this).map(e.invert, e));
    },
    rescaleY: function(e) {
      return e.copy().domain(e.range().map(this.invertY, this).map(e.invert, e));
    },
    toString: function() {
      return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
    }
  };
  Tn.prototype;
  const E0 = 30, P0 = At({
    __name: "LchPicker",
    props: {
      modelValue: {},
      width: {}
    },
    emits: [
      "update:modelValue"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = ge(null), s = n.width ?? 450;
      function o() {
        if (!i.value) return;
        i.value.innerHTML = "";
        const u = a([
          {
            name: "l",
            domain: [
              0,
              150
            ]
          },
          {
            name: "c",
            domain: [
              0,
              100
            ]
          },
          {
            name: "h",
            domain: [
              0,
              360
            ]
          }
        ], {
          ...n.modelValue
        }, s, E0, (c, f) => {
          r("update:modelValue", c);
        });
        u && i.value.appendChild(u);
      }
      Rt(() => {
        o();
      });
      function a(l, u, c, f, h) {
        const d = {
          ...u
        };
        l = l.map(({ name: w, domain: I }) => ({
          name: w,
          domain: I,
          scale: Pl().domain(I).range([
            0,
            c
          ])
        }));
        for (const w of l) w.x = Math.round(w.scale(d[w.name]));
        const b = Lp("div"), y = st("white"), L = st("black"), V = b.selectAll("div").data(l).join("div"), U = vl(), $ = V.append("canvas").attr("width", c).attr("height", 1).style("max-width", "100%").style("width", `${c}px`).style("height", `${f}px`).each(function() {
          const w = this.getContext("2d"), I = w.createImageData(c, 1);
          U.set(this, {
            context: w,
            image: I,
            data: I.data
          });
        }).each(function(w) {
          _.call(this, w);
        }).on("click", function(w, I) {
          const z = this.getBoundingClientRect(), X = w.clientX - z.left;
          I.x = Math.max(0, Math.min(c - 1, X)), d[I.name] = I.scale.invert(I.x), $.each(function(Q) {
            _.call(this, Q);
          }), h({
            ...d
          }, false, I.name);
        });
        V.each(function(w) {
          zt(this).select("canvas").call(Wp().subject(function() {
            return {
              x: w.x ?? 0,
              y: 0
            };
          }).on("start", function() {
            h({
              ...d
            }, true, w.name);
          }).on("drag", function(z) {
            w.x = Math.max(1, Math.min(c - 1, z.x)), d[w.name] = w.scale.invert(w.x), $.each(function(X) {
              _.call(this, X);
            }), h({
              ...d
            }, true, w.name);
          }).on("end", function(z) {
            w.x = Math.max(1, Math.min(c - 1, z.x)), d[w.name] = w.scale.invert(w.x), $.each(function(X) {
              _.call(this, X);
            }), h({
              ...d
            }, false, w.name);
          }));
        });
        function _(w) {
          const I = U.get(this), { context: z, image: X, data: Q } = I;
          for (let q = 0, j = -1; q < c; ++q) {
            let F;
            if (q === Math.round(w.x)) F = y;
            else if (q === Math.round(w.x) - 1) F = L;
            else {
              const te = {
                ...d
              };
              te[w.name] = w.scale.invert(q), F = st(Fi(te.l, te.c, te.h));
            }
            Q[++j] = F.r, Q[++j] = F.g, Q[++j] = F.b, Q[++j] = 255;
          }
          z.putImageData(X, 0, 0);
        }
        return V.append("svg").attr("width", c).attr("height", 20).attr("viewBox", [
          0,
          0,
          c,
          20
        ]).style("max-width", "100%").style("overflow", "visible").append("g").each(function(w) {
          zt(this).call(Qd(w.scale).ticks(Math.min(c / 80, 10)));
        }).append("text").attr("x", c).attr("y", 9).attr("dy", ".72em").style("text-anchor", "middle").style("text-transform", "uppercase").attr("fill", "currentColor").text((w) => w.name), b.node();
      }
      return (l, u) => (le(), he("div", {
        ref_key: "container",
        ref: i
      }, null, 512));
    }
  }), C0 = {
    class: "palette-editor"
  }, A0 = {
    class: "handles-overlay"
  }, R0 = 12, k0 = At({
    __name: "PaletteEditor",
    props: {
      colorStops: {}
    },
    emits: [
      "update:colorStops"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = ge(null), s = we(() => new Rr(n.colorStops).generateTexture());
      Bt(s, (h) => {
        if (!i.value || !h) return;
        const d = i.value.getContext("2d");
        if (!d) return;
        d.clearRect(0, 0, 4096, 32);
        const b = document.createElement("canvas");
        b.width = h.width, b.height = h.height, b.getContext("2d").putImageData(h, 0, 0), d.drawImage(b, 0, 0, 4096, 1, 0, 0, 4096, 32);
      }), Rt(() => {
        Kr(() => {
          const h = s.value;
          if (!i.value || !h) return;
          const d = i.value.getContext("2d");
          if (!d) return;
          d.clearRect(0, 0, 4096, 32);
          const b = document.createElement("canvas");
          b.width = h.width, b.height = h.height, b.getContext("2d").putImageData(h, 0, 0), d.drawImage(b, 0, 0, 4096, 1, 0, 0, 4096, 32);
        });
      });
      function o(h) {
        var _a2;
        if (n.colorStops.length >= R0) return;
        const d = i.value;
        if (!d) return;
        const b = d.getBoundingClientRect();
        let y = (h.clientX - b.left) / b.width;
        y = Math.max(0, Math.min(1, y));
        const L = a.value !== null && ((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff";
        n.colorStops.push({
          color: L,
          position: y
        }), r("update:colorStops", n.colorStops), a.value = n.colorStops.length - 1;
      }
      const a = ge(0);
      function l(h) {
        a.value = h;
      }
      function u(h) {
        const d = st(h);
        if (!d) return {
          l: 100,
          c: 0,
          h: 0
        };
        const b = Fi(d);
        return {
          l: b.l,
          c: b.c,
          h: b.h
        };
      }
      function c(h) {
        const d = Fi(h.l, h.c, h.h);
        return st(d).formatHex();
      }
      const f = we({
        get() {
          var _a2;
          return a.value === null || n.colorStops.length === 0 ? {
            l: 100,
            c: 0,
            h: 0
          } : u(((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff");
        },
        set(h) {
          a.value !== null && n.colorStops[a.value] && (n.colorStops[a.value] = {
            ...n.colorStops[a.value],
            color: c(h)
          }, r("update:colorStops", n.colorStops));
        }
      });
      return (h, d) => (le(), he("div", C0, [
        v("div", {
          class: "canvas-row",
          style: {
            position: "relative"
          },
          onDblclick: o
        }, [
          v("canvas", {
            ref_key: "canvasRef",
            ref: i,
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
          v("div", A0, [
            (le(true), he(Ve, null, Ai(e.colorStops, (b, y) => (le(), hs(Ld, {
              key: "handle-" + y,
              stop: b,
              index: y,
              "onUpdate:position": (L) => e.colorStops[y].position = L,
              onClick: (L) => l(y)
            }, null, 8, [
              "stop",
              "index",
              "onUpdate:position",
              "onClick"
            ]))), 128))
          ])
        ], 32),
        Le(P0, {
          modelValue: f.value,
          "onUpdate:modelValue": d[0] || (d[0] = (b) => f.value = b),
          width: 450
        }, null, 8, [
          "modelValue"
        ])
      ]));
    }
  }), N0 = Qr(k0, [
    [
      "__scopeId",
      "data-v-0e5e7bb6"
    ]
  ]), O0 = {
    class: "block bulma-settings-block",
    style: {
      color: "black !important"
    }
  }, I0 = {
    class: "tabs is-toggle is-fullwidth is-small"
  }, L0 = {
    class: "tab-content"
  }, U0 = {
    key: 0
  }, D0 = {
    class: "mb-3",
    style: {
      "font-family": "monospace",
      "word-break": "break-all",
      "white-space": "pre-line"
    }
  }, F0 = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, B0 = {
    style: {
      "font-family": "monospace",
      "min-width": "7.5em",
      display: "inline-block"
    }
  }, $0 = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, V0 = {
    style: {
      "font-family": "monospace",
      "min-width": "5em",
      display: "inline-block"
    }
  }, z0 = {
    key: 1
  }, G0 = {
    class: "mb-3"
  }, H0 = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, W0 = {
    style: {
      display: "flex",
      "align-items": "center",
      "min-height": "36px"
    }
  }, q0 = [
    "src"
  ], K0 = {
    style: {
      flex: "1 1 auto",
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis"
    }
  }, X0 = {
    class: "dropdown-menu",
    id: "dropdown-menu-presets",
    role: "menu",
    style: {
      width: "100%"
    }
  }, j0 = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, Y0 = [
    "onClick"
  ], Z0 = [
    "src"
  ], J0 = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.11em"
    }
  }, Q0 = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, em = {
    class: "control is-expanded"
  }, tm = {
    class: "control"
  }, nm = [
    "disabled"
  ], rm = {
    key: 2
  }, im = {
    class: "mb-3"
  }, sm = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, om = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, am = {
    class: "mb-3"
  }, lm = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, um = {
    style: {
      display: "flex",
      "align-items": "center",
      "flex-direction": "column",
      gap: "0.5em",
      padding: "0.4em 0"
    }
  }, cm = [
    "src"
  ], fm = {
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
  }, dm = {
    style: {
      flex: "1 1 auto",
      "text-align": "center"
    }
  }, hm = {
    class: "dropdown-menu",
    id: "dropdown-menu-palettes",
    role: "menu",
    style: {
      width: "100%"
    }
  }, pm = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, gm = [
    "onClick"
  ], mm = [
    "src"
  ], vm = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.05em",
      "text-align": "center"
    }
  }, _m = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, bm = {
    class: "control is-expanded"
  }, ym = {
    class: "control"
  }, xm = [
    "disabled"
  ], wm = {
    key: 3
  }, Sm = {
    class: "field"
  }, Tm = {
    class: "control"
  }, Mm = {
    class: "field"
  }, Em = {
    class: "control"
  }, Pm = {
    class: "field"
  }, Cm = {
    class: "control"
  }, Am = {
    class: "field"
  }, Rm = {
    class: "checkbox"
  }, km = {
    class: "field"
  }, Nm = {
    class: "checkbox"
  }, Om = {
    class: "field"
  }, Im = {
    class: "checkbox"
  }, Lm = {
    class: "field"
  }, Um = {
    class: "checkbox"
  }, Dm = {
    class: "field"
  }, Fm = {
    class: "checkbox"
  }, Bm = {
    class: "field"
  }, $m = {
    class: "checkbox"
  }, Vm = {
    class: "field"
  }, zm = {
    class: "checkbox"
  }, wi = "mandelbrot_presets", Si = "mandelbrot_palettes", Gm = At({
    __name: "Settings",
    props: cs({
      engine: {},
      suspendShortcuts: {
        type: Function
      }
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
          activateSmoothness: true
        }
      },
      modelModifiers: {}
    }),
    emits: [
      "update:modelValue"
    ],
    setup(e) {
      const t = e, n = vt(e, "modelValue"), r = we(() => ((n.value.angle * 180 / Math.PI % 360 + 360) % 360).toFixed(2)), i = we({
        get: () => (n.value.angle * 180 / Math.PI % 360 + 360) % 360,
        set: (C) => {
          n.value.angle = C % 360 * Math.PI / 180;
        }
      }), s = we({
        get: () => (Math.log10(n.value.palettePeriod || 0.01) + 2) / 5,
        set: (C) => {
          n.value.palettePeriod = Number((10 ** (C * 5 - 2)).toPrecision(6));
        }
      }), o = we({
        get: () => {
          const C = Number(n.value.scale), m = C > 0 ? -Math.log2(C) : 126;
          return isFinite(m) ? Math.min(Math.max(Math.round(m), 1), 126) : 1;
        },
        set: (C) => {
          const m = Math.min(Math.max(Math.round(C), 1), 126);
          n.value.scale = (2 ** -m).toPrecision(10);
        }
      });
      function a(C, m) {
        const [E, me] = C.split(".");
        return me ? E + "." + me.slice(0, m) : E;
      }
      function l(C) {
        const m = document.createElement("canvas");
        m.width = 320, m.height = 40;
        const E = m.getContext("2d");
        if (!E) return "";
        if (C.length === 0) return E.fillStyle = "#000", E.fillRect(0, 0, m.width, m.height), m.toDataURL("image/png");
        const Ue = new Rr(C).generateTexture(), je = document.createElement("canvas");
        je.width = Ue.width, je.height = 1;
        const $e = je.getContext("2d");
        return $e ? ($e.putImageData(Ue, 0, 0), E.drawImage(je, 0, 0, m.width, m.height), m.toDataURL("image/png")) : "";
      }
      const u = ge(null), c = ge(""), f = ge([]), h = ge(""), d = ge([]), b = ge(""), y = ge(false);
      function L() {
        const C = c.value.trim();
        if (C && window.confirm(`Supprimer le preset "${C}" ? Cette action est irr\xE9versible.`)) {
          const m = f.value.findIndex((E) => E.name === C);
          m >= 0 && (f.value.splice(m, 1), localStorage.setItem(wi, JSON.stringify(f.value)), U.value = "", c.value = "");
        }
      }
      async function V() {
        t.engine && (u.value = await t.engine.getSnapshotPng(256));
      }
      const U = ge(""), $ = ge(false), _ = we(() => f.value.find((C) => C.name === U.value)), w = we(() => {
        var _a2;
        return (_a2 = _.value) == null ? void 0 : _a2.thumbnail;
      });
      function I(C) {
        ce(C.name), $.value = false;
      }
      async function z() {
        if (!c.value.trim()) return;
        let C, m = (/* @__PURE__ */ new Date()).toISOString();
        try {
          t.engine && (C = await t.engine.getSnapshotPng(256));
        } catch {
        }
        const E = {
          name: c.value.trim(),
          value: n.value,
          thumbnail: C,
          date: m
        }, me = f.value.findIndex((Ue) => Ue.name === E.name);
        me >= 0 ? f.value[me] = E : f.value.push(E), localStorage.setItem(wi, JSON.stringify(f.value)), c.value = "";
      }
      function X() {
        const C = localStorage.getItem(wi);
        if (C) try {
          f.value = JSON.parse(C);
        } catch {
        }
      }
      function Q() {
        const C = localStorage.getItem(Si);
        if (C) try {
          d.value = JSON.parse(C);
        } catch {
        }
      }
      async function q() {
        if (!h.value.trim()) return;
        let C, m = (/* @__PURE__ */ new Date()).toISOString();
        try {
          C = l(n.value.colorStops);
        } catch {
        }
        const E = {
          name: h.value.trim(),
          colorStops: structuredClone(re(n.value.colorStops)),
          thumbnail: C,
          date: m
        }, me = d.value.findIndex((Ue) => Ue.name === E.name);
        me >= 0 ? d.value[me] = E : d.value.push(E), localStorage.setItem(Si, JSON.stringify(d.value)), h.value = "";
      }
      function j(C) {
        const m = d.value.find((E) => E.name === C);
        m && (b.value = C, h.value = m.name, n.value.colorStops = structuredClone(re(m.colorStops)));
      }
      function F(C) {
        j(C.name), y.value = false;
      }
      function te() {
        const C = h.value.trim();
        if (C && window.confirm(`Supprimer la palette "${C}" ? Cette action est irr\xE9versible.`)) {
          const m = d.value.findIndex((E) => E.name === C);
          m >= 0 && (d.value.splice(m, 1), localStorage.setItem(Si, JSON.stringify(d.value)), b.value = "", h.value = "");
        }
      }
      function ce(C) {
        const m = f.value.find((E) => E.name === C);
        m && (U.value = C, c.value = m.name, n.value = structuredClone(re(m.value)));
      }
      const xe = we({
        get: () => Math.log10(n.value.mu ?? 1),
        set: (C) => {
          n.value.mu = Math.pow(10, C);
        }
      }), N = we({
        get: () => Math.log10(n.value.epsilon ?? 1e-8),
        set: (C) => {
          n.value.epsilon = Math.pow(10, C);
        }
      });
      Rt(() => {
        X(), Q();
      });
      const A = ge("navigation"), B = we(() => d.value.find((C) => C.name === b.value)), J = we(() => {
        var _a2;
        return (_a2 = B.value) == null ? void 0 : _a2.thumbnail;
      });
      return Bt([
        A,
        () => t.engine
      ], async ([C]) => {
        C === "navigation" && await V();
      }, {
        immediate: true
      }), (C, m) => (le(), he("div", O0, [
        v("div", I0, [
          v("ul", null, [
            v("li", {
              class: Oe({
                "is-active": A.value === "navigation"
              })
            }, [
              v("a", {
                onClick: m[0] || (m[0] = (E) => A.value = "navigation")
              }, "Navigation")
            ], 2),
            v("li", {
              class: Oe({
                "is-active": A.value === "presets"
              })
            }, [
              v("a", {
                onClick: m[1] || (m[1] = (E) => A.value = "presets")
              }, "Presets")
            ], 2),
            v("li", {
              class: Oe({
                "is-active": A.value === "palettes"
              })
            }, [
              v("a", {
                onClick: m[2] || (m[2] = (E) => A.value = "palettes")
              }, "Palettes")
            ], 2),
            v("li", {
              class: Oe({
                "is-active": A.value === "performance"
              })
            }, [
              v("a", {
                onClick: m[3] || (m[3] = (E) => A.value = "performance")
              }, "Graphics")
            ], 2)
          ])
        ]),
        v("div", L0, [
          A.value === "navigation" ? (le(), he("div", U0, [
            v("div", D0, [
              v("span", null, [
                m[26] || (m[26] = se("Cx: ", -1)),
                v("span", null, ve(a(n.value.cx, 38)), 1)
              ]),
              m[28] || (m[28] = v("br", null, null, -1)),
              v("span", null, [
                m[27] || (m[27] = se("Cy: ", -1)),
                v("span", null, ve(a(n.value.cy, 38)), 1)
              ])
            ]),
            v("div", F0, [
              v("span", null, [
                m[29] || (m[29] = se("\xC9chelle\xA0: ", -1)),
                v("span", B0, ve(Number(n.value.scale).toExponential(2)), 1)
              ]),
              be(v("input", {
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
                "onUpdate:modelValue": m[4] || (m[4] = (E) => o.value = E)
              }, null, 512), [
                [
                  ft,
                  o.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            v("div", $0, [
              v("span", null, [
                m[30] || (m[30] = se("Angle\xA0: ", -1)),
                v("span", V0, ve(r.value) + "\xB0", 1)
              ]),
              be(v("input", {
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
                "onUpdate:modelValue": m[5] || (m[5] = (E) => i.value = E)
              }, null, 512), [
                [
                  ft,
                  i.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ])
          ])) : A.value === "presets" ? (le(), he("div", z0, [
            v("div", G0, [
              m[32] || (m[32] = v("label", {
                class: "label"
              }, "Presets enregistr\xE9s", -1)),
              v("div", {
                class: Oe([
                  "dropdown",
                  {
                    "is-active": $.value
                  }
                ]),
                style: {
                  width: "100%"
                }
              }, [
                v("div", H0, [
                  v("button", {
                    class: "button is-fullwidth",
                    onClick: m[6] || (m[6] = (E) => $.value = !$.value),
                    "aria-haspopup": "true",
                    "aria-controls": "dropdown-menu-presets",
                    type: "button"
                  }, [
                    v("span", W0, [
                      w.value ? (le(), he("img", {
                        key: 0,
                        src: w.value,
                        alt: "miniature",
                        style: {
                          height: "32px",
                          width: "56px",
                          "object-fit": "cover",
                          "margin-right": "8px",
                          "border-radius": "3px",
                          background: "#888"
                        }
                      }, null, 8, q0)) : Yt("", true),
                      v("span", K0, ve(c.value || "Choisir un preset..."), 1),
                      m[31] || (m[31] = v("span", {
                        class: "icon is-small",
                        style: {
                          "margin-left": "5px"
                        }
                      }, [
                        v("i", {
                          class: "fas fa-angle-down",
                          "aria-hidden": "true"
                        })
                      ], -1))
                    ])
                  ])
                ]),
                v("div", X0, [
                  v("div", j0, [
                    (le(true), he(Ve, null, Ai(f.value, (E) => (le(), he("a", {
                      key: E.name,
                      class: Oe([
                        "dropdown-item",
                        {
                          "is-active": U.value === E.name
                        }
                      ]),
                      onClick: so((me) => I(E), [
                        "prevent"
                      ]),
                      style: {
                        display: "flex",
                        "align-items": "center",
                        gap: "0.75em"
                      }
                    }, [
                      E.thumbnail ? (le(), he("img", {
                        key: 0,
                        src: E.thumbnail,
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
                      }, null, 8, Z0)) : Yt("", true),
                      v("span", J0, ve(E.name), 1)
                    ], 10, Y0))), 128))
                  ])
                ])
              ], 2),
              v("div", Q0, [
                v("div", em, [
                  be(v("input", {
                    class: "input",
                    "onUpdate:modelValue": m[7] || (m[7] = (E) => c.value = E),
                    type: "text",
                    placeholder: "Nom...",
                    onFocus: m[8] || (m[8] = (E) => t.suspendShortcuts && t.suspendShortcuts(true)),
                    onBlur: m[9] || (m[9] = (E) => t.suspendShortcuts && t.suspendShortcuts(false))
                  }, null, 544), [
                    [
                      ft,
                      c.value
                    ]
                  ])
                ]),
                v("div", {
                  class: "control"
                }, [
                  v("button", {
                    class: "button is-link is-small",
                    onClick: z
                  }, "Enregistrer")
                ]),
                v("div", tm, [
                  v("button", {
                    class: "button is-danger is-small",
                    onClick: L,
                    disabled: !c.value
                  }, "Supprimer", 8, nm)
                ])
              ])
            ])
          ])) : A.value === "palettes" ? (le(), he("div", rm, [
            v("div", im, [
              Le(N0, {
                "color-stops": n.value.colorStops
              }, null, 8, [
                "color-stops"
              ])
            ]),
            v("div", sm, [
              m[33] || (m[33] = v("label", {
                style: {
                  "white-space": "nowrap"
                }
              }, "P\xE9riode :", -1)),
              be(v("input", {
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
                "onUpdate:modelValue": m[10] || (m[10] = (E) => s.value = E)
              }, null, 512), [
                [
                  ft,
                  s.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            v("div", om, [
              m[34] || (m[34] = v("label", {
                style: {
                  "white-space": "nowrap"
                }
              }, "D\xE9calage :", -1)),
              be(v("input", {
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
                "onUpdate:modelValue": m[11] || (m[11] = (E) => n.value.paletteOffset = E)
              }, null, 512), [
                [
                  ft,
                  n.value.paletteOffset,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            m[37] || (m[37] = v("hr", {
              class: "section-sep"
            }, null, -1)),
            v("div", am, [
              m[36] || (m[36] = v("label", {
                class: "label"
              }, "Palettes enregistr\xE9es", -1)),
              v("div", {
                class: Oe([
                  "dropdown",
                  {
                    "is-active": y.value
                  }
                ]),
                style: {
                  width: "100%"
                }
              }, [
                v("div", lm, [
                  v("button", {
                    class: "button is-fullwidth",
                    onClick: m[12] || (m[12] = (E) => y.value = !y.value),
                    "aria-haspopup": "true",
                    "aria-controls": "dropdown-menu-palettes",
                    type: "button"
                  }, [
                    v("span", um, [
                      J.value ? (le(), he("img", {
                        key: 0,
                        src: J.value,
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
                      }, null, 8, cm)) : Yt("", true),
                      v("span", fm, [
                        v("span", dm, ve(h.value || "Choisir une palette..."), 1),
                        m[35] || (m[35] = v("span", {
                          class: "icon is-small"
                        }, [
                          v("i", {
                            class: "fas fa-angle-down",
                            "aria-hidden": "true"
                          })
                        ], -1))
                      ])
                    ])
                  ])
                ]),
                v("div", hm, [
                  v("div", pm, [
                    (le(true), he(Ve, null, Ai(d.value, (E) => (le(), he("a", {
                      key: E.name,
                      class: Oe([
                        "dropdown-item",
                        {
                          "is-active": b.value === E.name
                        }
                      ]),
                      onClick: so((me) => F(E), [
                        "prevent"
                      ]),
                      style: {
                        display: "flex",
                        "flex-direction": "column",
                        gap: "0.5em",
                        padding: "0.75em"
                      }
                    }, [
                      E.thumbnail ? (le(), he("img", {
                        key: 0,
                        src: E.thumbnail,
                        alt: "miniature",
                        style: {
                          height: "32px",
                          width: "100%",
                          "object-fit": "cover",
                          "border-radius": "4px",
                          background: "#aaa",
                          "box-shadow": "0 1px 6px rgba(0,0,0,0.16)"
                        }
                      }, null, 8, mm)) : Yt("", true),
                      v("span", vm, ve(E.name), 1)
                    ], 10, gm))), 128))
                  ])
                ])
              ], 2),
              v("div", _m, [
                v("div", bm, [
                  be(v("input", {
                    class: "input",
                    "onUpdate:modelValue": m[13] || (m[13] = (E) => h.value = E),
                    type: "text",
                    placeholder: "Nom...",
                    onFocus: m[14] || (m[14] = (E) => t.suspendShortcuts && t.suspendShortcuts(true)),
                    onBlur: m[15] || (m[15] = (E) => t.suspendShortcuts && t.suspendShortcuts(false))
                  }, null, 544), [
                    [
                      ft,
                      h.value
                    ]
                  ])
                ]),
                v("div", {
                  class: "control"
                }, [
                  v("button", {
                    class: "button is-link is-small",
                    onClick: q
                  }, "Enregistrer")
                ]),
                v("div", ym, [
                  v("button", {
                    class: "button is-danger is-small",
                    onClick: te,
                    disabled: !h.value
                  }, "Supprimer", 8, xm)
                ])
              ])
            ])
          ])) : A.value === "performance" ? (le(), he("div", wm, [
            v("div", Sm, [
              m[38] || (m[38] = v("label", {
                class: "label"
              }, "Mu (log)", -1)),
              v("div", Tm, [
                be(v("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "0",
                  max: "5",
                  step: "0.01",
                  "onUpdate:modelValue": m[16] || (m[16] = (E) => xe.value = E)
                }, null, 512), [
                  [
                    ft,
                    xe.value
                  ]
                ])
              ]),
              v("span", null, ve((n.value.mu ?? 1).toFixed(1)), 1)
            ]),
            v("div", Mm, [
              m[39] || (m[39] = v("label", {
                class: "label"
              }, "Epsilon (log)", -1)),
              v("div", Em, [
                be(v("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "-12",
                  max: "0",
                  step: "0.01",
                  "onUpdate:modelValue": m[17] || (m[17] = (E) => N.value = E)
                }, null, 512), [
                  [
                    ft,
                    N.value
                  ]
                ])
              ]),
              v("span", null, ve((n.value.epsilon ?? 1e-8).toExponential(2)), 1)
            ]),
            v("div", Pm, [
              m[40] || (m[40] = v("label", {
                class: "label"
              }, "Tessellation", -1)),
              v("div", Cm, [
                be(v("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "0.1",
                  max: "10",
                  step: "0.1",
                  "onUpdate:modelValue": m[18] || (m[18] = (E) => n.value.tessellationLevel = E)
                }, null, 512), [
                  [
                    ft,
                    n.value.tessellationLevel,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              v("span", null, ve(n.value.tessellationLevel), 1)
            ]),
            v("div", Am, [
              v("label", Rm, [
                be(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": m[19] || (m[19] = (E) => n.value.activateWebcam = E)
                }, null, 512), [
                  [
                    Ot,
                    n.value.activateWebcam
                  ]
                ]),
                m[41] || (m[41] = se(" \xA0Activer la webcam ", -1))
              ])
            ]),
            v("div", km, [
              v("label", Nm, [
                be(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": m[20] || (m[20] = (E) => n.value.activateTessellation = E)
                }, null, 512), [
                  [
                    Ot,
                    n.value.activateTessellation
                  ]
                ]),
                m[42] || (m[42] = se(" \xA0Tessellation GPU ", -1))
              ])
            ]),
            v("div", Om, [
              v("label", Im, [
                be(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": m[21] || (m[21] = (E) => n.value.activateShading = E)
                }, null, 512), [
                  [
                    Ot,
                    n.value.activateShading
                  ]
                ]),
                m[43] || (m[43] = se(" \xA0Shading avanc\xE9 ", -1))
              ])
            ]),
            v("div", Lm, [
              v("label", Um, [
                be(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": m[22] || (m[22] = (E) => n.value.activateSkybox = E)
                }, null, 512), [
                  [
                    Ot,
                    n.value.activateSkybox
                  ]
                ]),
                m[44] || (m[44] = se(" \xA0Skybox ", -1))
              ])
            ]),
            v("div", Dm, [
              v("label", Fm, [
                be(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": m[23] || (m[23] = (E) => n.value.activatePalette = E)
                }, null, 512), [
                  [
                    Ot,
                    n.value.activatePalette
                  ]
                ]),
                m[45] || (m[45] = se(" \xA0Palette ", -1))
              ])
            ]),
            v("div", Bm, [
              v("label", $m, [
                be(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": m[24] || (m[24] = (E) => n.value.activateSmoothness = E)
                }, null, 512), [
                  [
                    Ot,
                    n.value.activateSmoothness
                  ]
                ]),
                m[46] || (m[46] = se(" \xA0Smoothness ", -1))
              ])
            ]),
            v("div", Vm, [
              v("label", zm, [
                be(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": m[25] || (m[25] = (E) => n.value.activateZebra = E)
                }, null, 512), [
                  [
                    Ot,
                    n.value.activateZebra
                  ]
                ]),
                m[47] || (m[47] = se(" \xA0Zebra ", -1))
              ])
            ])
          ])) : Yt("", true)
        ])
      ]));
    }
  }), Hm = Qr(Gm, [
    [
      "__scopeId",
      "data-v-681ceda4"
    ]
  ]), Wm = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, qm = {
    key: 0,
    style: {
      position: "absolute",
      top: "0",
      left: "0",
      "z-index": "10",
      "pointer-events": "auto",
      height: "100vh"
    }
  }, Km = {
    class: "tag is-black"
  }, Xm = {
    class: "tag is-black"
  }, jm = {
    class: "tag is-black"
  }, Ym = {
    class: "tag is-black"
  }, Zm = {
    class: "tag is-black"
  }, Jm = {
    class: "tag is-black"
  }, Qm = {
    class: "tag is-black"
  }, ev = {
    class: "tag is-black"
  }, tv = {
    href: "https://github.com/gcollombet/mandelbrot",
    target: "_blank",
    rel: "noopener",
    class: "footer-link",
    "aria-label": "GitHub"
  }, nv = {
    class: "github-logo",
    height: "20",
    viewBox: "0 0 16 16",
    width: "20",
    fill: "currentColor",
    style: {
      "vertical-align": "middle",
      "margin-right": "4px"
    }
  }, Lo = "mandelbrot_last_settings", rv = At({
    __name: "MandelbrotViewer",
    setup(e) {
      const t = ge(null), n = we(() => {
        var _a2;
        return ((_a2 = t.value) == null ? void 0 : _a2.getEngine()) ?? null;
      }), r = ge(false), i = ge(false), s = ge(true), o = ge({
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
        activateZebra: false
      });
      Rt(() => {
        window.addEventListener("keydown", l);
        try {
          const h = localStorage.getItem(Lo);
          h && Object.assign(o.value, JSON.parse(h));
        } catch {
        }
      }), qn(() => {
        window.removeEventListener("keydown", l);
      }), Bt(o, (h) => {
        localStorage.setItem(Lo, JSON.stringify(h));
      }, {
        deep: true
      });
      function a() {
        r.value = !r.value;
      }
      function l(h) {
        var _a2, _b, _c2;
        if (i.value) return;
        const d = (_b = (_a2 = h.target) == null ? void 0 : _a2.tagName) == null ? void 0 : _b.toLowerCase();
        d === "input" || d === "textarea" || ((_c2 = h.target) == null ? void 0 : _c2.isContentEditable) || (h.key === "w" || h.key === "W") && !h.repeat && (h.preventDefault(), a());
      }
      function u() {
        var _a2;
        const h = window.navigator.language || ((_a2 = window.navigator.languages) == null ? void 0 : _a2[0]) || "en";
        return h.startsWith("fr") || h.startsWith("be") ? "azerty" : "qwerty";
      }
      const c = u(), f = we(() => c === "azerty" ? {
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
      return (h, d) => (le(), he("div", Wm, [
        be(v("button", {
          class: Oe([
            "menu-hamburger tag is-light is-medium animate__animated",
            s.value ? "animate__fadeInDown" : ""
          ]),
          "aria-label": "Menu",
          onClick: a
        }, [
          ...d[5] || (d[5] = [
            v("span", {
              class: "hamburger-bar"
            }, null, -1),
            v("span", {
              class: "hamburger-bar"
            }, null, -1),
            v("span", {
              class: "hamburger-bar"
            }, null, -1)
          ])
        ], 2), [
          [
            fi,
            s.value
          ]
        ]),
        Le(Od, {
          ref_key: "mandelbrotCtrlRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          },
          scale: o.value.scale,
          "onUpdate:scale": d[0] || (d[0] = (b) => o.value.scale = b),
          angle: o.value.angle,
          "onUpdate:angle": d[1] || (d[1] = (b) => o.value.angle = b),
          cx: o.value.cx,
          "onUpdate:cx": d[2] || (d[2] = (b) => o.value.cx = b),
          cy: o.value.cy,
          "onUpdate:cy": d[3] || (d[3] = (b) => o.value.cy = b),
          mu: o.value.mu,
          shadingLevel: o.value.shadingLevel,
          antialiasLevel: o.value.antialiasLevel,
          tessellationLevel: o.value.tessellationLevel,
          epsilon: o.value.epsilon,
          palettePeriod: o.value.palettePeriod,
          paletteOffset: o.value.paletteOffset,
          colorStops: o.value.colorStops,
          activatePalette: o.value.activatePalette,
          activateSkybox: o.value.activateSkybox,
          activateTessellation: o.value.activateTessellation,
          activateWebcam: o.value.activateWebcam,
          activateShading: o.value.activateShading,
          activateZebra: o.value.activateZebra,
          activateSmoothness: o.value.activateSmoothness
        }, null, 8, [
          "scale",
          "angle",
          "cx",
          "cy",
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
          "activateSmoothness"
        ]),
        r.value ? (le(), he("div", qm, [
          Le(Hm, {
            modelValue: o.value,
            "onUpdate:modelValue": d[4] || (d[4] = (b) => o.value = b),
            engine: n.value,
            "suspend-shortcuts": (b) => {
              i.value = b;
            }
          }, null, 8, [
            "modelValue",
            "engine",
            "suspend-shortcuts"
          ])
        ])) : Yt("", true),
        be(v("div", {
          class: Oe([
            "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
            s.value ? "animate__fadeInUp" : ""
          ])
        }, [
          d[6] || (d[6] = se(" Move\xA0 ", -1)),
          d[7] || (d[7] = v("span", {
            class: "tag is-black"
          }, "Left clic", -1)),
          d[8] || (d[8] = se("\xA0 ", -1)),
          v("span", Km, ve(f.value.up), 1),
          d[9] || (d[9] = se("\xA0 ", -1)),
          v("span", Xm, ve(f.value.left), 1),
          d[10] || (d[10] = se("\xA0 ", -1)),
          v("span", jm, ve(f.value.down), 1),
          d[11] || (d[11] = se("\xA0 ", -1)),
          v("span", Ym, ve(f.value.right), 1),
          d[12] || (d[12] = se("\xA0 |\xA0Rotate\xA0 ", -1)),
          d[13] || (d[13] = v("span", {
            class: "tag is-black"
          }, "Right clic", -1)),
          d[14] || (d[14] = se("\xA0 ", -1)),
          v("span", Zm, ve(f.value.rotateLeft), 1),
          d[15] || (d[15] = se("\xA0 ", -1)),
          v("span", Jm, ve(f.value.rotateRight), 1),
          d[16] || (d[16] = se("\xA0 |\xA0Zoom\xA0 ", -1)),
          d[17] || (d[17] = v("span", {
            class: "tag is-black"
          }, "Wheel", -1)),
          d[18] || (d[18] = se("\xA0 ", -1)),
          v("span", Qm, ve(f.value.zoomIn), 1),
          d[19] || (d[19] = se("\xA0 ", -1)),
          v("span", ev, ve(f.value.zoomOut), 1)
        ], 2), [
          [
            fi,
            s.value
          ]
        ]),
        be(v("div", {
          class: Oe([
            "footer-love tag is-light is-medium is-hidden-touch animate__animated",
            s.value ? "animate__fadeInUp" : ""
          ])
        }, [
          d[22] || (d[22] = v("small", null, [
            v("a", {
              href: "https://wgpu.rs/",
              target: "_blank",
              rel: "noopener",
              class: "footer-link",
              "aria-label": "wGPU"
            }, [
              se(" Made with "),
              v("img", {
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
          d[23] || (d[23] = se(" \xA0|\xA0 ", -1)),
          v("small", null, [
            v("a", tv, [
              (le(), he("svg", nv, [
                ...d[20] || (d[20] = [
                  v("path", {
                    d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                  }, null, -1)
                ])
              ])),
              d[21] || (d[21] = se(" GitHub ", -1))
            ])
          ])
        ], 2), [
          [
            fi,
            s.value
          ]
        ])
      ]));
    }
  }), iv = Qr(rv, [
    [
      "__scopeId",
      "data-v-03961ea1"
    ]
  ]), sv = {
    key: 0,
    id: "fullscreen"
  }, ov = {
    key: 1,
    class: "section is-flex is-flex-direction-column is-align-items-center is-justify-content-center",
    style: {
      height: "100vh"
    }
  }, av = {
    class: "box has-text-centered",
    style: {
      "max-width": "400px"
    }
  }, lv = {
    class: "title is-4 mt-3"
  }, uv = {
    key: 0
  }, cv = {
    key: 1
  }, fv = {
    class: "button is-link mt-4",
    href: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility",
    target: "_blank"
  }, dv = At({
    __name: "App",
    setup(e) {
      const t = ge(false), n = ge(true);
      return Rt(() => {
        t.value = typeof navigator < "u" && "gpu" in navigator, typeof navigator < "u" && (n.value = navigator.language.startsWith("fr"));
      }), (r, i) => t.value ? (le(), he("div", sv, [
        Le(iv)
      ])) : (le(), he("div", ov, [
        v("div", av, [
          i[2] || (i[2] = v("span", {
            class: "icon is-large has-text-danger"
          }, [
            v("i", {
              class: "fas fa-exclamation-triangle fa-2x"
            })
          ], -1)),
          v("h1", lv, ve(n.value ? "WebGPU non support\xE9" : "WebGPU not supported"), 1),
          v("p", null, [
            n.value ? (le(), he("span", uv, [
              ...i[0] || (i[0] = [
                se(" Ce navigateur ne supporte pas WebGPU.", -1),
                v("br", null, null, -1),
                se(" Veuillez utiliser un navigateur compatible WebGPU. ", -1)
              ])
            ])) : (le(), he("span", cv, [
              ...i[1] || (i[1] = [
                se(" This browser does not support WebGPU.", -1),
                v("br", null, null, -1),
                se(" Please use a WebGPU-compatible browser. ", -1)
              ])
            ]))
          ]),
          v("a", fv, ve(n.value ? "Liste des navigateurs compatibles WebGPU" : "List of WebGPU-compatible browsers"), 1)
        ])
      ]));
    }
  });
  "serviceWorker" in navigator && window.addEventListener("load", () => {
    navigator.serviceWorker.register("/mandelbrot/sw.js");
  });
  jc(dv).mount("#app");
})();
