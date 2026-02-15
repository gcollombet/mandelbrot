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
  function fs(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const oe = {}, un = [], at = () => {
  }, ra = () => false, Qr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), ds = (e) => e.startsWith("onUpdate:"), xe = Object.assign, hs = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, nu = Object.prototype.hasOwnProperty, ae = (e, t) => nu.call(e, t), j = Array.isArray, cn = (e) => Qn(e) === "[object Map]", ei = (e) => Qn(e) === "[object Set]", Hs = (e) => Qn(e) === "[object Date]", Q = (e) => typeof e == "function", we = (e) => typeof e == "string", ft = (e) => typeof e == "symbol", ue = (e) => e !== null && typeof e == "object", ia = (e) => (ue(e) || Q(e)) && Q(e.then) && Q(e.catch), sa = Object.prototype.toString, Qn = (e) => sa.call(e), ru = (e) => Qn(e).slice(8, -1), oa = (e) => Qn(e) === "[object Object]", ps = (e) => we(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Nn = fs(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), ti = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return ((n) => t[n] || (t[n] = e(n)));
  }, iu = /-\w/g, xt = ti((e) => e.replace(iu, (t) => t.slice(1).toUpperCase())), su = /\B([A-Z])/g, Ot = ti((e) => e.replace(su, "-$1").toLowerCase()), aa = ti((e) => e.charAt(0).toUpperCase() + e.slice(1)), vi = ti((e) => e ? `on${aa(e)}` : ""), $e = (e, t) => !Object.is(e, t), _r = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, la = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, gs = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  }, ou = (e) => {
    const t = we(e) ? Number(e) : NaN;
    return isNaN(t) ? e : t;
  };
  let Ws;
  const ni = () => Ws || (Ws = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function ri(e) {
    if (j(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], i = we(r) ? cu(r) : ri(r);
        if (i) for (const s in i) t[s] = i[s];
      }
      return t;
    } else if (we(e) || ue(e)) return e;
  }
  const au = /;(?![^(]*\))/g, lu = /:([^]+)/, uu = /\/\*[^]*?\*\//g;
  function cu(e) {
    const t = {};
    return e.replace(uu, "").split(au).forEach((n) => {
      if (n) {
        const r = n.split(lu);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }), t;
  }
  function ve(e) {
    let t = "";
    if (we(e)) t = e;
    else if (j(e)) for (let n = 0; n < e.length; n++) {
      const r = ve(e[n]);
      r && (t += r + " ");
    }
    else if (ue(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const fu = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", du = fs(fu);
  function ua(e) {
    return !!e || e === "";
  }
  function hu(e, t) {
    if (e.length !== t.length) return false;
    let n = true;
    for (let r = 0; n && r < e.length; r++) n = er(e[r], t[r]);
    return n;
  }
  function er(e, t) {
    if (e === t) return true;
    let n = Hs(e), r = Hs(t);
    if (n || r) return n && r ? e.getTime() === t.getTime() : false;
    if (n = ft(e), r = ft(t), n || r) return e === t;
    if (n = j(e), r = j(t), n || r) return n && r ? hu(e, t) : false;
    if (n = ue(e), r = ue(t), n || r) {
      if (!n || !r) return false;
      const i = Object.keys(e).length, s = Object.keys(t).length;
      if (i !== s) return false;
      for (const o in e) {
        const a = e.hasOwnProperty(o), l = t.hasOwnProperty(o);
        if (a && !l || !a && l || !er(e[o], t[o])) return false;
      }
    }
    return String(e) === String(t);
  }
  function ca(e, t) {
    return e.findIndex((n) => er(n, t));
  }
  const fa = (e) => !!(e && e.__v_isRef === true), be = (e) => we(e) ? e : e == null ? "" : j(e) || ue(e) && (e.toString === sa || !Q(e.toString)) ? fa(e) ? be(e.value) : JSON.stringify(e, da, 2) : String(e), da = (e, t) => fa(t) ? da(e, t.value) : cn(t) ? {
    [`Map(${t.size})`]: [
      ...t.entries()
    ].reduce((n, [r, i], s) => (n[_i(r, s) + " =>"] = i, n), {})
  } : ei(t) ? {
    [`Set(${t.size})`]: [
      ...t.values()
    ].map((n) => _i(n))
  } : ft(t) ? _i(t) : ue(t) && !j(t) && !oa(t) ? String(t) : t, _i = (e, t = "") => {
    var n;
    return ft(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
  let Oe;
  class pu {
    constructor(t = false) {
      this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.__v_skip = true, this.parent = Oe, !t && Oe && (this.index = (Oe.scopes || (Oe.scopes = [])).push(this) - 1);
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
        const n = Oe;
        try {
          return Oe = this, t();
        } finally {
          Oe = n;
        }
      }
    }
    on() {
      ++this._on === 1 && (this.prevScope = Oe, Oe = this);
    }
    off() {
      this._on > 0 && --this._on === 0 && (Oe = this.prevScope, this.prevScope = void 0);
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
  function gu() {
    return Oe;
  }
  let he;
  const bi = /* @__PURE__ */ new WeakSet();
  class ha {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, Oe && Oe.active && Oe.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, bi.has(this) && (bi.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || ga(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, qs(this), ma(this);
      const t = he, n = je;
      he = this, je = true;
      try {
        return this.fn();
      } finally {
        va(this), he = t, je = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) _s(t);
        this.deps = this.depsTail = void 0, qs(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? bi.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      Ui(this) && this.run();
    }
    get dirty() {
      return Ui(this);
    }
  }
  let pa = 0, In, On;
  function ga(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = On, On = e;
      return;
    }
    e.next = In, In = e;
  }
  function ms() {
    pa++;
  }
  function vs() {
    if (--pa > 0) return;
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
        } catch (r) {
          e || (e = r);
        }
        t = n;
      }
    }
    if (e) throw e;
  }
  function ma(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function va(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const i = r.prevDep;
      r.version === -1 ? (r === n && (n = i), _s(r), mu(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = i;
    }
    e.deps = t, e.depsTail = n;
  }
  function Ui(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (_a(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function _a(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Vn) || (e.globalVersion = Vn, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Ui(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = he, r = je;
    he = e, je = true;
    try {
      ma(e);
      const i = e.fn(e._value);
      (t.version === 0 || $e(i, e._value)) && (e.flags |= 128, e._value = i, t.version++);
    } catch (i) {
      throw t.version++, i;
    } finally {
      he = n, je = r, va(e), e.flags &= -3;
    }
  }
  function _s(e, t = false) {
    const { dep: n, prevSub: r, nextSub: i } = e;
    if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
      n.computed.flags &= -5;
      for (let s = n.computed.deps; s; s = s.nextDep) _s(s, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function mu(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let je = true;
  const ba = [];
  function St() {
    ba.push(je), je = false;
  }
  function Tt() {
    const e = ba.pop();
    je = e === void 0 ? true : e;
  }
  function qs(e) {
    const { cleanup: t } = e;
    if (e.cleanup = void 0, t) {
      const n = he;
      he = void 0;
      try {
        t();
      } finally {
        he = n;
      }
    }
  }
  let Vn = 0;
  class vu {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class ii {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!he || !je || he === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== he) n = this.activeLink = new vu(he, this), he.deps ? (n.prevDep = he.depsTail, he.depsTail.nextDep = n, he.depsTail = n) : he.deps = he.depsTail = n, ya(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = he.depsTail, n.nextDep = void 0, he.depsTail.nextDep = n, he.depsTail = n, he.deps === n && (he.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, Vn++, this.notify(t);
    }
    notify(t) {
      ms();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        vs();
      }
    }
  }
  function ya(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let r = t.deps; r; r = r.nextDep) ya(r);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const Fi = /* @__PURE__ */ new WeakMap(), qt = /* @__PURE__ */ Symbol(""), Vi = /* @__PURE__ */ Symbol(""), zn = /* @__PURE__ */ Symbol("");
  function Me(e, t, n) {
    if (je && he) {
      let r = Fi.get(e);
      r || Fi.set(e, r = /* @__PURE__ */ new Map());
      let i = r.get(n);
      i || (r.set(n, i = new ii()), i.map = r, i.key = n), i.track();
    }
  }
  function bt(e, t, n, r, i, s) {
    const o = Fi.get(e);
    if (!o) {
      Vn++;
      return;
    }
    const a = (l) => {
      l && l.trigger();
    };
    if (ms(), t === "clear") o.forEach(a);
    else {
      const l = j(e), c = l && ps(n);
      if (l && n === "length") {
        const u = Number(r);
        o.forEach((f, h) => {
          (h === "length" || h === zn || !ft(h) && h >= u) && a(f);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && a(o.get(n)), c && a(o.get(zn)), t) {
        case "add":
          l ? c && a(o.get("length")) : (a(o.get(qt)), cn(e) && a(o.get(Vi)));
          break;
        case "delete":
          l || (a(o.get(qt)), cn(e) && a(o.get(Vi)));
          break;
        case "set":
          cn(e) && a(o.get(qt));
          break;
      }
    }
    vs();
  }
  function tn(e) {
    const t = re(e);
    return t === e ? t : (Me(t, "iterate", zn), We(e) ? t : t.map(Xe));
  }
  function si(e) {
    return Me(e = re(e), "iterate", zn), e;
  }
  function Rt(e, t) {
    return Mt(e) ? vn(Kt(e) ? Xe(t) : t) : Xe(t);
  }
  const _u = {
    __proto__: null,
    [Symbol.iterator]() {
      return yi(this, Symbol.iterator, (e) => Rt(this, e));
    },
    concat(...e) {
      return tn(this).concat(...e.map((t) => j(t) ? tn(t) : t));
    },
    entries() {
      return yi(this, "entries", (e) => (e[1] = Rt(this, e[1]), e));
    },
    every(e, t) {
      return ht(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return ht(this, "filter", e, t, (n) => n.map((r) => Rt(this, r)), arguments);
    },
    find(e, t) {
      return ht(this, "find", e, t, (n) => Rt(this, n), arguments);
    },
    findIndex(e, t) {
      return ht(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return ht(this, "findLast", e, t, (n) => Rt(this, n), arguments);
    },
    findLastIndex(e, t) {
      return ht(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return ht(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return wi(this, "includes", e);
    },
    indexOf(...e) {
      return wi(this, "indexOf", e);
    },
    join(e) {
      return tn(this).join(e);
    },
    lastIndexOf(...e) {
      return wi(this, "lastIndexOf", e);
    },
    map(e, t) {
      return ht(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return Tn(this, "pop");
    },
    push(...e) {
      return Tn(this, "push", e);
    },
    reduce(e, ...t) {
      return Ks(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return Ks(this, "reduceRight", e, t);
    },
    shift() {
      return Tn(this, "shift");
    },
    some(e, t) {
      return ht(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return Tn(this, "splice", e);
    },
    toReversed() {
      return tn(this).toReversed();
    },
    toSorted(e) {
      return tn(this).toSorted(e);
    },
    toSpliced(...e) {
      return tn(this).toSpliced(...e);
    },
    unshift(...e) {
      return Tn(this, "unshift", e);
    },
    values() {
      return yi(this, "values", (e) => Rt(this, e));
    }
  };
  function yi(e, t, n) {
    const r = si(e), i = r[t]();
    return r !== e && !We(e) && (i._next = i.next, i.next = () => {
      const s = i._next();
      return s.done || (s.value = n(s.value)), s;
    }), i;
  }
  const bu = Array.prototype;
  function ht(e, t, n, r, i, s) {
    const o = si(e), a = o !== e && !We(e), l = o[t];
    if (l !== bu[t]) {
      const f = l.apply(e, s);
      return a ? Xe(f) : f;
    }
    let c = n;
    o !== e && (a ? c = function(f, h) {
      return n.call(this, Rt(e, f), h, e);
    } : n.length > 2 && (c = function(f, h) {
      return n.call(this, f, h, e);
    }));
    const u = l.call(o, c, r);
    return a && i ? i(u) : u;
  }
  function Ks(e, t, n, r) {
    const i = si(e);
    let s = n;
    return i !== e && (We(e) ? n.length > 3 && (s = function(o, a, l) {
      return n.call(this, o, a, l, e);
    }) : s = function(o, a, l) {
      return n.call(this, o, Rt(e, a), l, e);
    }), i[t](s, ...r);
  }
  function wi(e, t, n) {
    const r = re(e);
    Me(r, "iterate", zn);
    const i = r[t](...n);
    return (i === -1 || i === false) && xs(n[0]) ? (n[0] = re(n[0]), r[t](...n)) : i;
  }
  function Tn(e, t, n = []) {
    St(), ms();
    const r = re(e)[t].apply(e, n);
    return vs(), Tt(), r;
  }
  const yu = fs("__proto__,__v_isRef,__isVue"), wa = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(ft));
  function wu(e) {
    ft(e) || (e = String(e));
    const t = re(this);
    return Me(t, "has", e), t.hasOwnProperty(e);
  }
  class xa {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const i = this._isReadonly, s = this._isShallow;
      if (n === "__v_isReactive") return !i;
      if (n === "__v_isReadonly") return i;
      if (n === "__v_isShallow") return s;
      if (n === "__v_raw") return r === (i ? s ? Ru : Ea : s ? Ma : Ta).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const o = j(t);
      if (!i) {
        let l;
        if (o && (l = _u[n])) return l;
        if (n === "hasOwnProperty") return wu;
      }
      const a = Reflect.get(t, n, Ce(t) ? t : r);
      if ((ft(n) ? wa.has(n) : yu(n)) || (i || Me(t, "get", n), s)) return a;
      if (Ce(a)) {
        const l = o && ps(n) ? a : a.value;
        return i && ue(l) ? Gi(l) : l;
      }
      return ue(a) ? i ? Gi(a) : ys(a) : a;
    }
  }
  class Sa extends xa {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, i) {
      let s = t[n];
      const o = j(t) && ps(n);
      if (!this._isShallow) {
        const c = Mt(s);
        if (!We(r) && !Mt(r) && (s = re(s), r = re(r)), !o && Ce(s) && !Ce(r)) return c || (s.value = r), true;
      }
      const a = o ? Number(n) < t.length : ae(t, n), l = Reflect.set(t, n, r, Ce(t) ? t : i);
      return t === re(i) && (a ? $e(r, s) && bt(t, "set", n, r) : bt(t, "add", n, r)), l;
    }
    deleteProperty(t, n) {
      const r = ae(t, n);
      t[n];
      const i = Reflect.deleteProperty(t, n);
      return i && r && bt(t, "delete", n, void 0), i;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!ft(n) || !wa.has(n)) && Me(t, "has", n), r;
    }
    ownKeys(t) {
      return Me(t, "iterate", j(t) ? "length" : qt), Reflect.ownKeys(t);
    }
  }
  class xu extends xa {
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
  const Su = new Sa(), Tu = new xu(), Mu = new Sa(true);
  const zi = (e) => e, lr = (e) => Reflect.getPrototypeOf(e);
  function Eu(e, t, n) {
    return function(...r) {
      const i = this.__v_raw, s = re(i), o = cn(s), a = e === "entries" || e === Symbol.iterator && o, l = e === "keys" && o, c = i[e](...r), u = n ? zi : t ? vn : Xe;
      return !t && Me(s, "iterate", l ? Vi : qt), xe(Object.create(c), {
        next() {
          const { value: f, done: h } = c.next();
          return h ? {
            value: f,
            done: h
          } : {
            value: a ? [
              u(f[0]),
              u(f[1])
            ] : u(f),
            done: h
          };
        }
      });
    };
  }
  function ur(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function Cu(e, t) {
    const n = {
      get(i) {
        const s = this.__v_raw, o = re(s), a = re(i);
        e || ($e(i, a) && Me(o, "get", i), Me(o, "get", a));
        const { has: l } = lr(o), c = t ? zi : e ? vn : Xe;
        if (l.call(o, i)) return c(s.get(i));
        if (l.call(o, a)) return c(s.get(a));
        s !== o && s.get(i);
      },
      get size() {
        const i = this.__v_raw;
        return !e && Me(re(i), "iterate", qt), i.size;
      },
      has(i) {
        const s = this.__v_raw, o = re(s), a = re(i);
        return e || ($e(i, a) && Me(o, "has", i), Me(o, "has", a)), i === a ? s.has(i) : s.has(i) || s.has(a);
      },
      forEach(i, s) {
        const o = this, a = o.__v_raw, l = re(a), c = t ? zi : e ? vn : Xe;
        return !e && Me(l, "iterate", qt), a.forEach((u, f) => i.call(s, c(u), c(f), o));
      }
    };
    return xe(n, e ? {
      add: ur("add"),
      set: ur("set"),
      delete: ur("delete"),
      clear: ur("clear")
    } : {
      add(i) {
        !t && !We(i) && !Mt(i) && (i = re(i));
        const s = re(this);
        return lr(s).has.call(s, i) || (s.add(i), bt(s, "add", i, i)), this;
      },
      set(i, s) {
        !t && !We(s) && !Mt(s) && (s = re(s));
        const o = re(this), { has: a, get: l } = lr(o);
        let c = a.call(o, i);
        c || (i = re(i), c = a.call(o, i));
        const u = l.call(o, i);
        return o.set(i, s), c ? $e(s, u) && bt(o, "set", i, s) : bt(o, "add", i, s), this;
      },
      delete(i) {
        const s = re(this), { has: o, get: a } = lr(s);
        let l = o.call(s, i);
        l || (i = re(i), l = o.call(s, i)), a && a.call(s, i);
        const c = s.delete(i);
        return l && bt(s, "delete", i, void 0), c;
      },
      clear() {
        const i = re(this), s = i.size !== 0, o = i.clear();
        return s && bt(i, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((i) => {
      n[i] = Eu(i, e, t);
    }), n;
  }
  function bs(e, t) {
    const n = Cu(e, t);
    return (r, i, s) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? r : Reflect.get(ae(n, i) && i in r ? n : r, i, s);
  }
  const ku = {
    get: bs(false, false)
  }, Pu = {
    get: bs(false, true)
  }, Au = {
    get: bs(true, false)
  };
  const Ta = /* @__PURE__ */ new WeakMap(), Ma = /* @__PURE__ */ new WeakMap(), Ea = /* @__PURE__ */ new WeakMap(), Ru = /* @__PURE__ */ new WeakMap();
  function Lu(e) {
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
  function Nu(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Lu(ru(e));
  }
  function ys(e) {
    return Mt(e) ? e : ws(e, false, Su, ku, Ta);
  }
  function Iu(e) {
    return ws(e, false, Mu, Pu, Ma);
  }
  function Gi(e) {
    return ws(e, true, Tu, Au, Ea);
  }
  function ws(e, t, n, r, i) {
    if (!ue(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const s = Nu(e);
    if (s === 0) return e;
    const o = i.get(e);
    if (o) return o;
    const a = new Proxy(e, s === 2 ? r : n);
    return i.set(e, a), a;
  }
  function Kt(e) {
    return Mt(e) ? Kt(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function Mt(e) {
    return !!(e && e.__v_isReadonly);
  }
  function We(e) {
    return !!(e && e.__v_isShallow);
  }
  function xs(e) {
    return e ? !!e.__v_raw : false;
  }
  function re(e) {
    const t = e && e.__v_raw;
    return t ? re(t) : e;
  }
  function Ou(e) {
    return !ae(e, "__v_skip") && Object.isExtensible(e) && la(e, "__v_skip", true), e;
  }
  const Xe = (e) => ue(e) ? ys(e) : e, vn = (e) => ue(e) ? Gi(e) : e;
  function Ce(e) {
    return e ? e.__v_isRef === true : false;
  }
  function pe(e) {
    return $u(e, false);
  }
  function $u(e, t) {
    return Ce(e) ? e : new Bu(e, t);
  }
  class Bu {
    constructor(t, n) {
      this.dep = new ii(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : re(t), this._value = n ? t : Xe(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || We(t) || Mt(t);
      t = r ? t : re(t), $e(t, n) && (this._rawValue = t, this._value = r ? t : Xe(t), this.dep.trigger());
    }
  }
  function Du(e) {
    return Ce(e) ? e.value : e;
  }
  const Uu = {
    get: (e, t, n) => t === "__v_raw" ? e : Du(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const i = e[t];
      return Ce(i) && !Ce(n) ? (i.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function Ca(e) {
    return Kt(e) ? e : new Proxy(e, Uu);
  }
  class Fu {
    constructor(t) {
      this.__v_isRef = true, this._value = void 0;
      const n = this.dep = new ii(), { get: r, set: i } = t(n.track.bind(n), n.trigger.bind(n));
      this._get = r, this._set = i;
    }
    get value() {
      return this._value = this._get();
    }
    set value(t) {
      this._set(t);
    }
  }
  function Vu(e) {
    return new Fu(e);
  }
  class zu {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new ii(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Vn - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && he !== this) return ga(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return _a(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function Gu(e, t, n = false) {
    let r, i;
    return Q(e) ? r = e : (r = e.get, i = e.set), new zu(r, i, n);
  }
  const cr = {}, Pr = /* @__PURE__ */ new WeakMap();
  let Vt;
  function Hu(e, t = false, n = Vt) {
    if (n) {
      let r = Pr.get(n);
      r || Pr.set(n, r = []), r.push(e);
    }
  }
  function Wu(e, t, n = oe) {
    const { immediate: r, deep: i, once: s, scheduler: o, augmentJob: a, call: l } = n, c = (b) => i ? b : We(b) || i === false || i === 0 ? yt(b, 1) : yt(b);
    let u, f, h, d, g = false, _ = false;
    if (Ce(e) ? (f = () => e.value, g = We(e)) : Kt(e) ? (f = () => c(e), g = true) : j(e) ? (_ = true, g = e.some((b) => Kt(b) || We(b)), f = () => e.map((b) => {
      if (Ce(b)) return b.value;
      if (Kt(b)) return c(b);
      if (Q(b)) return l ? l(b, 2) : b();
    })) : Q(e) ? t ? f = l ? () => l(e, 2) : e : f = () => {
      if (h) {
        St();
        try {
          h();
        } finally {
          Tt();
        }
      }
      const b = Vt;
      Vt = u;
      try {
        return l ? l(e, 3, [
          d
        ]) : e(d);
      } finally {
        Vt = b;
      }
    } : f = at, t && i) {
      const b = f, S = i === true ? 1 / 0 : i;
      f = () => yt(b(), S);
    }
    const $ = gu(), G = () => {
      u.stop(), $ && $.active && hs($.effects, u);
    };
    if (s && t) {
      const b = t;
      t = (...S) => {
        b(...S), G();
      };
    }
    let O = _ ? new Array(e.length).fill(cr) : cr;
    const U = (b) => {
      if (!(!(u.flags & 1) || !u.dirty && !b)) if (t) {
        const S = u.run();
        if (i || g || (_ ? S.some((A, H) => $e(A, O[H])) : $e(S, O))) {
          h && h();
          const A = Vt;
          Vt = u;
          try {
            const H = [
              S,
              O === cr ? void 0 : _ && O[0] === cr ? [] : O,
              d
            ];
            O = S, l ? l(t, 3, H) : t(...H);
          } finally {
            Vt = A;
          }
        }
      } else u.run();
    };
    return a && a(U), u = new ha(f), u.scheduler = o ? () => o(U, false) : U, d = (b) => Hu(b, false, u), h = u.onStop = () => {
      const b = Pr.get(u);
      if (b) {
        if (l) l(b, 4);
        else for (const S of b) S();
        Pr.delete(u);
      }
    }, t ? r ? U(true) : O = u.run() : o ? o(U.bind(null, true), true) : u.run(), G.pause = u.pause.bind(u), G.resume = u.resume.bind(u), G.stop = G, G;
  }
  function yt(e, t = 1 / 0, n) {
    if (t <= 0 || !ue(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
    if (n.set(e, t), t--, Ce(e)) yt(e.value, t, n);
    else if (j(e)) for (let r = 0; r < e.length; r++) yt(e[r], t, n);
    else if (ei(e) || cn(e)) e.forEach((r) => {
      yt(r, t, n);
    });
    else if (oa(e)) {
      for (const r in e) yt(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && yt(e[r], t, n);
    }
    return e;
  }
  function tr(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (i) {
      oi(i, t, n);
    }
  }
  function Ye(e, t, n, r) {
    if (Q(e)) {
      const i = tr(e, t, n, r);
      return i && ia(i) && i.catch((s) => {
        oi(s, t, n);
      }), i;
    }
    if (j(e)) {
      const i = [];
      for (let s = 0; s < e.length; s++) i.push(Ye(e[s], t, n, r));
      return i;
    }
  }
  function oi(e, t, n, r = true) {
    const i = t ? t.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: o } = t && t.appContext.config || oe;
    if (t) {
      let a = t.parent;
      const l = t.proxy, c = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; a; ) {
        const u = a.ec;
        if (u) {
          for (let f = 0; f < u.length; f++) if (u[f](e, l, c) === false) return;
        }
        a = a.parent;
      }
      if (s) {
        St(), tr(s, null, 10, [
          e,
          l,
          c
        ]), Tt();
        return;
      }
    }
    qu(e, n, i, r, o);
  }
  function qu(e, t, n, r = true, i = false) {
    if (i) throw e;
    console.error(e);
  }
  const Pe = [];
  let rt = -1;
  const fn = [];
  let Lt = null, sn = 0;
  const ka = Promise.resolve();
  let Ar = null;
  function ai(e) {
    const t = Ar || ka;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function Ku(e) {
    let t = rt + 1, n = Pe.length;
    for (; t < n; ) {
      const r = t + n >>> 1, i = Pe[r], s = Gn(i);
      s < e || s === e && i.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function Ss(e) {
    if (!(e.flags & 1)) {
      const t = Gn(e), n = Pe[Pe.length - 1];
      !n || !(e.flags & 2) && t >= Gn(n) ? Pe.push(e) : Pe.splice(Ku(t), 0, e), e.flags |= 1, Pa();
    }
  }
  function Pa() {
    Ar || (Ar = ka.then(Ra));
  }
  function ju(e) {
    j(e) ? fn.push(...e) : Lt && e.id === -1 ? Lt.splice(sn + 1, 0, e) : e.flags & 1 || (fn.push(e), e.flags |= 1), Pa();
  }
  function js(e, t, n = rt + 1) {
    for (; n < Pe.length; n++) {
      const r = Pe[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        Pe.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function Aa(e) {
    if (fn.length) {
      const t = [
        ...new Set(fn)
      ].sort((n, r) => Gn(n) - Gn(r));
      if (fn.length = 0, Lt) {
        Lt.push(...t);
        return;
      }
      for (Lt = t, sn = 0; sn < Lt.length; sn++) {
        const n = Lt[sn];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      Lt = null, sn = 0;
    }
  }
  const Gn = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function Ra(e) {
    try {
      for (rt = 0; rt < Pe.length; rt++) {
        const t = Pe[rt];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), tr(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; rt < Pe.length; rt++) {
        const t = Pe[rt];
        t && (t.flags &= -2);
      }
      rt = -1, Pe.length = 0, Aa(), Ar = null, (Pe.length || fn.length) && Ra();
    }
  }
  let He = null, La = null;
  function Rr(e) {
    const t = He;
    return He = e, La = e && e.type.__scopeId || null, t;
  }
  function Na(e, t = He, n) {
    if (!t || e._n) return e;
    const r = (...i) => {
      r._d && Or(-1);
      const s = Rr(t);
      let o;
      try {
        o = e(...i);
      } finally {
        Rr(s), r._d && Or(1);
      }
      return o;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function Se(e, t) {
    if (He === null) return e;
    const n = di(He), r = e.dirs || (e.dirs = []);
    for (let i = 0; i < t.length; i++) {
      let [s, o, a, l = oe] = t[i];
      s && (Q(s) && (s = {
        mounted: s,
        updated: s
      }), s.deep && yt(o), r.push({
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
  function $t(e, t, n, r) {
    const i = e.dirs, s = t && t.dirs;
    for (let o = 0; o < i.length; o++) {
      const a = i[o];
      s && (a.oldValue = s[o].value);
      let l = a.dir[r];
      l && (St(), Ye(l, n, 8, [
        e.el,
        a,
        e,
        t
      ]), Tt());
    }
  }
  function Xu(e, t) {
    if (Re) {
      let n = Re.provides;
      const r = Re.parent && Re.parent.provides;
      r === n && (n = Re.provides = Object.create(r)), n[e] = t;
    }
  }
  function br(e, t, n = false) {
    const r = Ps();
    if (r || dn) {
      let i = dn ? dn._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (i && e in i) return i[e];
      if (arguments.length > 1) return n && Q(t) ? t.call(r && r.proxy) : t;
    }
  }
  const Yu = /* @__PURE__ */ Symbol.for("v-scx"), Zu = () => br(Yu);
  function Ju(e, t) {
    return Ts(e, null, {
      flush: "sync"
    });
  }
  function jt(e, t, n) {
    return Ts(e, t, n);
  }
  function Ts(e, t, n = oe) {
    const { immediate: r, deep: i, flush: s, once: o } = n, a = xe({}, n), l = t && r || !t && s !== "post";
    let c;
    if (qn) {
      if (s === "sync") {
        const d = Zu();
        c = d.__watcherHandles || (d.__watcherHandles = []);
      } else if (!l) {
        const d = () => {
        };
        return d.stop = at, d.resume = at, d.pause = at, d;
      }
    }
    const u = Re;
    a.call = (d, g, _) => Ye(d, u, g, _);
    let f = false;
    s === "post" ? a.scheduler = (d) => {
      Ie(d, u && u.suspense);
    } : s !== "sync" && (f = true, a.scheduler = (d, g) => {
      g ? d() : Ss(d);
    }), a.augmentJob = (d) => {
      t && (d.flags |= 4), f && (d.flags |= 2, u && (d.id = u.uid, d.i = u));
    };
    const h = Wu(e, t, a);
    return qn && (c ? c.push(h) : l && h()), h;
  }
  function Qu(e, t, n) {
    const r = this.proxy, i = we(e) ? e.includes(".") ? Ia(r, e) : () => r[e] : e.bind(r, r);
    let s;
    Q(t) ? s = t : (s = t.handler, n = t);
    const o = rr(this), a = Ts(i, s.bind(r), n);
    return o(), a;
  }
  function Ia(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let i = 0; i < n.length && r; i++) r = r[n[i]];
      return r;
    };
  }
  const ec = /* @__PURE__ */ Symbol("_vte"), Oa = (e) => e.__isTeleport, it = /* @__PURE__ */ Symbol("_leaveCb"), Mn = /* @__PURE__ */ Symbol("_enterCb");
  function tc() {
    const e = {
      isMounted: false,
      isLeaving: false,
      isUnmounting: false,
      leavingVNodes: /* @__PURE__ */ new Map()
    };
    return Pt(() => {
      e.isMounted = true;
    }), Ga(() => {
      e.isUnmounting = true;
    }), e;
  }
  const Ge = [
    Function,
    Array
  ], $a = {
    mode: String,
    appear: Boolean,
    persisted: Boolean,
    onBeforeEnter: Ge,
    onEnter: Ge,
    onAfterEnter: Ge,
    onEnterCancelled: Ge,
    onBeforeLeave: Ge,
    onLeave: Ge,
    onAfterLeave: Ge,
    onLeaveCancelled: Ge,
    onBeforeAppear: Ge,
    onAppear: Ge,
    onAfterAppear: Ge,
    onAppearCancelled: Ge
  }, Ba = (e) => {
    const t = e.subTree;
    return t.component ? Ba(t.component) : t;
  }, nc = {
    name: "BaseTransition",
    props: $a,
    setup(e, { slots: t }) {
      const n = Ps(), r = tc();
      return () => {
        const i = t.default && Fa(t.default(), true);
        if (!i || !i.length) return;
        const s = Da(i), o = re(e), { mode: a } = o;
        if (r.isLeaving) return xi(s);
        const l = Xs(s);
        if (!l) return xi(s);
        let c = Hi(l, o, r, n, (f) => c = f);
        l.type !== Ae && Hn(l, c);
        let u = n.subTree && Xs(n.subTree);
        if (u && u.type !== Ae && !zt(u, l) && Ba(n).type !== Ae) {
          let f = Hi(u, o, r, n);
          if (Hn(u, f), a === "out-in" && l.type !== Ae) return r.isLeaving = true, f.afterLeave = () => {
            r.isLeaving = false, n.job.flags & 8 || n.update(), delete f.afterLeave, u = void 0;
          }, xi(s);
          a === "in-out" && l.type !== Ae ? f.delayLeave = (h, d, g) => {
            const _ = Ua(r, u);
            _[String(u.key)] = u, h[it] = () => {
              d(), h[it] = void 0, delete c.delayedLeave, u = void 0;
            }, c.delayedLeave = () => {
              g(), delete c.delayedLeave, u = void 0;
            };
          } : u = void 0;
        } else u && (u = void 0);
        return s;
      };
    }
  };
  function Da(e) {
    let t = e[0];
    if (e.length > 1) {
      for (const n of e) if (n.type !== Ae) {
        t = n;
        break;
      }
    }
    return t;
  }
  const rc = nc;
  function Ua(e, t) {
    const { leavingVNodes: n } = e;
    let r = n.get(t.type);
    return r || (r = /* @__PURE__ */ Object.create(null), n.set(t.type, r)), r;
  }
  function Hi(e, t, n, r, i) {
    const { appear: s, mode: o, persisted: a = false, onBeforeEnter: l, onEnter: c, onAfterEnter: u, onEnterCancelled: f, onBeforeLeave: h, onLeave: d, onAfterLeave: g, onLeaveCancelled: _, onBeforeAppear: $, onAppear: G, onAfterAppear: O, onAppearCancelled: U } = t, b = String(e.key), S = Ua(n, e), A = (B, V) => {
      B && Ye(B, r, 9, V);
    }, H = (B, V) => {
      const W = V[1];
      A(B, V), j(B) ? B.every((x) => x.length <= 1) && W() : B.length <= 1 && W();
    }, X = {
      mode: o,
      persisted: a,
      beforeEnter(B) {
        let V = l;
        if (!n.isMounted) if (s) V = $ || l;
        else return;
        B[it] && B[it](true);
        const W = S[b];
        W && zt(e, W) && W.el[it] && W.el[it](), A(V, [
          B
        ]);
      },
      enter(B) {
        let V = c, W = u, x = f;
        if (!n.isMounted) if (s) V = G || c, W = O || u, x = U || f;
        else return;
        let q = false;
        B[Mn] = (ge) => {
          q || (q = true, ge ? A(x, [
            B
          ]) : A(W, [
            B
          ]), X.delayedLeave && X.delayedLeave(), B[Mn] = void 0);
        };
        const ee = B[Mn].bind(null, false);
        V ? H(V, [
          B,
          ee
        ]) : ee();
      },
      leave(B, V) {
        const W = String(e.key);
        if (B[Mn] && B[Mn](true), n.isUnmounting) return V();
        A(h, [
          B
        ]);
        let x = false;
        B[it] = (ee) => {
          x || (x = true, V(), ee ? A(_, [
            B
          ]) : A(g, [
            B
          ]), B[it] = void 0, S[W] === e && delete S[W]);
        };
        const q = B[it].bind(null, false);
        S[W] = e, d ? H(d, [
          B,
          q
        ]) : q();
      },
      clone(B) {
        const V = Hi(B, t, n, r, i);
        return i && i(V), V;
      }
    };
    return X;
  }
  function xi(e) {
    if (li(e)) return e = It(e), e.children = null, e;
  }
  function Xs(e) {
    if (!li(e)) return Oa(e.type) && e.children ? Da(e.children) : e;
    if (e.component) return e.component.subTree;
    const { shapeFlag: t, children: n } = e;
    if (n) {
      if (t & 16) return n[0];
      if (t & 32 && Q(n.default)) return n.default();
    }
  }
  function Hn(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, Hn(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function Fa(e, t = false, n) {
    let r = [], i = 0;
    for (let s = 0; s < e.length; s++) {
      let o = e[s];
      const a = n == null ? o.key : String(n) + String(o.key != null ? o.key : s);
      o.type === Ue ? (o.patchFlag & 128 && i++, r = r.concat(Fa(o.children, t, a))) : (t || o.type !== Ae) && r.push(a != null ? It(o, {
        key: a
      }) : o);
    }
    if (i > 1) for (let s = 0; s < r.length; s++) r[s].patchFlag = -2;
    return r;
  }
  function Ct(e, t) {
    return Q(e) ? xe({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function Va(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function Ys(e, t) {
    let n;
    return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
  }
  const Lr = /* @__PURE__ */ new WeakMap();
  function $n(e, t, n, r, i = false) {
    if (j(e)) {
      e.forEach((_, $) => $n(_, t && (j(t) ? t[$] : t), n, r, i));
      return;
    }
    if (Bn(r) && !i) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && $n(e, t, n, r.component.subTree);
      return;
    }
    const s = r.shapeFlag & 4 ? di(r.component) : r.el, o = i ? null : s, { i: a, r: l } = e, c = t && t.r, u = a.refs === oe ? a.refs = {} : a.refs, f = a.setupState, h = re(f), d = f === oe ? ra : (_) => Ys(u, _) ? false : ae(h, _), g = (_, $) => !($ && Ys(u, $));
    if (c != null && c !== l) {
      if (Zs(t), we(c)) u[c] = null, d(c) && (f[c] = null);
      else if (Ce(c)) {
        const _ = t;
        g(c, _.k) && (c.value = null), _.k && (u[_.k] = null);
      }
    }
    if (Q(l)) tr(l, a, 12, [
      o,
      u
    ]);
    else {
      const _ = we(l), $ = Ce(l);
      if (_ || $) {
        const G = () => {
          if (e.f) {
            const O = _ ? d(l) ? f[l] : u[l] : g() || !e.k ? l.value : u[e.k];
            if (i) j(O) && hs(O, s);
            else if (j(O)) O.includes(s) || O.push(s);
            else if (_) u[l] = [
              s
            ], d(l) && (f[l] = u[l]);
            else {
              const U = [
                s
              ];
              g(l, e.k) && (l.value = U), e.k && (u[e.k] = U);
            }
          } else _ ? (u[l] = o, d(l) && (f[l] = o)) : $ && (g(l, e.k) && (l.value = o), e.k && (u[e.k] = o));
        };
        if (o) {
          const O = () => {
            G(), Lr.delete(e);
          };
          O.id = -1, Lr.set(e, O), Ie(O, n);
        } else Zs(e), G();
      }
    }
  }
  function Zs(e) {
    const t = Lr.get(e);
    t && (t.flags |= 8, Lr.delete(e));
  }
  ni().requestIdleCallback;
  ni().cancelIdleCallback;
  const Bn = (e) => !!e.type.__asyncLoader, li = (e) => e.type.__isKeepAlive;
  function ic(e, t) {
    za(e, "a", t);
  }
  function sc(e, t) {
    za(e, "da", t);
  }
  function za(e, t, n = Re) {
    const r = e.__wdc || (e.__wdc = () => {
      let i = n;
      for (; i; ) {
        if (i.isDeactivated) return;
        i = i.parent;
      }
      return e();
    });
    if (ui(t, r, n), n) {
      let i = n.parent;
      for (; i && i.parent; ) li(i.parent.vnode) && oc(r, t, n, i), i = i.parent;
    }
  }
  function oc(e, t, n, r) {
    const i = ui(t, e, r, true);
    nr(() => {
      hs(r[t], i);
    }, n);
  }
  function ui(e, t, n = Re, r = false) {
    if (n) {
      const i = n[e] || (n[e] = []), s = t.__weh || (t.__weh = (...o) => {
        St();
        const a = rr(n), l = Ye(t, n, e, o);
        return a(), Tt(), l;
      });
      return r ? i.unshift(s) : i.push(s), s;
    }
  }
  const kt = (e) => (t, n = Re) => {
    (!qn || e === "sp") && ui(e, (...r) => t(...r), n);
  }, ac = kt("bm"), Pt = kt("m"), lc = kt("bu"), uc = kt("u"), Ga = kt("bum"), nr = kt("um"), cc = kt("sp"), fc = kt("rtg"), dc = kt("rtc");
  function hc(e, t = Re) {
    ui("ec", e, t);
  }
  const pc = /* @__PURE__ */ Symbol.for("v-ndc");
  function Wi(e, t, n, r) {
    let i;
    const s = n, o = j(e);
    if (o || we(e)) {
      const a = o && Kt(e);
      let l = false, c = false;
      a && (l = !We(e), c = Mt(e), e = si(e)), i = new Array(e.length);
      for (let u = 0, f = e.length; u < f; u++) i[u] = t(l ? c ? vn(Xe(e[u])) : Xe(e[u]) : e[u], u, void 0, s);
    } else if (typeof e == "number") {
      i = new Array(e);
      for (let a = 0; a < e; a++) i[a] = t(a + 1, a, void 0, s);
    } else if (ue(e)) if (e[Symbol.iterator]) i = Array.from(e, (a, l) => t(a, l, void 0, s));
    else {
      const a = Object.keys(e);
      i = new Array(a.length);
      for (let l = 0, c = a.length; l < c; l++) {
        const u = a[l];
        i[l] = t(e[u], u, l, s);
      }
    }
    else i = [];
    return i;
  }
  const qi = (e) => e ? fl(e) ? di(e) : qi(e.parent) : null, Dn = xe(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => qi(e.parent),
    $root: (e) => qi(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Wa(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Ss(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = ai.bind(e.proxy)),
    $watch: (e) => Qu.bind(e)
  }), Si = (e, t) => e !== oe && !e.__isScriptSetup && ae(e, t), gc = {
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
          if (Si(r, t)) return o[t] = 1, r[t];
          if (i !== oe && ae(i, t)) return o[t] = 2, i[t];
          if (ae(s, t)) return o[t] = 3, s[t];
          if (n !== oe && ae(n, t)) return o[t] = 4, n[t];
          Ki && (o[t] = 0);
        }
      }
      const c = Dn[t];
      let u, f;
      if (c) return t === "$attrs" && Me(e.attrs, "get", ""), c(e);
      if ((u = a.__cssModules) && (u = u[t])) return u;
      if (n !== oe && ae(n, t)) return o[t] = 4, n[t];
      if (f = l.config.globalProperties, ae(f, t)) return f[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: i, ctx: s } = e;
      return Si(i, t) ? (i[t] = n, true) : r !== oe && ae(r, t) ? (r[t] = n, true) : ae(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (s[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, props: s, type: o } }, a) {
      let l;
      return !!(n[a] || e !== oe && a[0] !== "$" && ae(e, a) || Si(t, a) || ae(s, a) || ae(r, a) || ae(Dn, a) || ae(i.config.globalProperties, a) || (l = o.__cssModules) && l[a]);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : ae(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function Nr(e) {
    return j(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  function Ms(e, t) {
    return !e || !t ? e || t : j(e) && j(t) ? e.concat(t) : xe({}, Nr(e), Nr(t));
  }
  let Ki = true;
  function mc(e) {
    const t = Wa(e), n = e.proxy, r = e.ctx;
    Ki = false, t.beforeCreate && Js(t.beforeCreate, e, "bc");
    const { data: i, computed: s, methods: o, watch: a, provide: l, inject: c, created: u, beforeMount: f, mounted: h, beforeUpdate: d, updated: g, activated: _, deactivated: $, beforeDestroy: G, beforeUnmount: O, destroyed: U, unmounted: b, render: S, renderTracked: A, renderTriggered: H, errorCaptured: X, serverPrefetch: B, expose: V, inheritAttrs: W, components: x, directives: q, filters: ee } = t;
    if (c && vc(c, r, null), o) for (const R in o) {
      const z = o[R];
      Q(z) && (r[R] = z.bind(n));
    }
    if (i) {
      const R = i.call(n, n);
      ue(R) && (e.data = ys(R));
    }
    if (Ki = true, s) for (const R in s) {
      const z = s[R], te = Q(z) ? z.bind(n, n) : Q(z.get) ? z.get.bind(n, n) : at, P = !Q(z) && Q(z.set) ? z.set.bind(n) : at, y = Te({
        get: te,
        set: P
      });
      Object.defineProperty(r, R, {
        enumerable: true,
        configurable: true,
        get: () => y.value,
        set: (C) => y.value = C
      });
    }
    if (a) for (const R in a) Ha(a[R], r, n, R);
    if (l) {
      const R = Q(l) ? l.call(n) : l;
      Reflect.ownKeys(R).forEach((z) => {
        Xu(z, R[z]);
      });
    }
    u && Js(u, e, "c");
    function N(R, z) {
      j(z) ? z.forEach((te) => R(te.bind(n))) : z && R(z.bind(n));
    }
    if (N(ac, f), N(Pt, h), N(lc, d), N(uc, g), N(ic, _), N(sc, $), N(hc, X), N(dc, A), N(fc, H), N(Ga, O), N(nr, b), N(cc, B), j(V)) if (V.length) {
      const R = e.exposed || (e.exposed = {});
      V.forEach((z) => {
        Object.defineProperty(R, z, {
          get: () => n[z],
          set: (te) => n[z] = te,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    S && e.render === at && (e.render = S), W != null && (e.inheritAttrs = W), x && (e.components = x), q && (e.directives = q), B && Va(e);
  }
  function vc(e, t, n = at) {
    j(e) && (e = ji(e));
    for (const r in e) {
      const i = e[r];
      let s;
      ue(i) ? "default" in i ? s = br(i.from || r, i.default, true) : s = br(i.from || r) : s = br(i), Ce(s) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => s.value,
        set: (o) => s.value = o
      }) : t[r] = s;
    }
  }
  function Js(e, t, n) {
    Ye(j(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function Ha(e, t, n, r) {
    let i = r.includes(".") ? Ia(n, r) : () => n[r];
    if (we(e)) {
      const s = t[e];
      Q(s) && jt(i, s);
    } else if (Q(e)) jt(i, e.bind(n));
    else if (ue(e)) if (j(e)) e.forEach((s) => Ha(s, t, n, r));
    else {
      const s = Q(e.handler) ? e.handler.bind(n) : t[e.handler];
      Q(s) && jt(i, s, e);
    }
  }
  function Wa(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: i, optionsCache: s, config: { optionMergeStrategies: o } } = e.appContext, a = s.get(t);
    let l;
    return a ? l = a : !i.length && !n && !r ? l = t : (l = {}, i.length && i.forEach((c) => Ir(l, c, o, true)), Ir(l, t, o)), ue(t) && s.set(t, l), l;
  }
  function Ir(e, t, n, r = false) {
    const { mixins: i, extends: s } = t;
    s && Ir(e, s, n, true), i && i.forEach((o) => Ir(e, o, n, true));
    for (const o in t) if (!(r && o === "expose")) {
      const a = _c[o] || n && n[o];
      e[o] = a ? a(e[o], t[o]) : t[o];
    }
    return e;
  }
  const _c = {
    data: Qs,
    props: eo,
    emits: eo,
    methods: Pn,
    computed: Pn,
    beforeCreate: ke,
    created: ke,
    beforeMount: ke,
    mounted: ke,
    beforeUpdate: ke,
    updated: ke,
    beforeDestroy: ke,
    beforeUnmount: ke,
    destroyed: ke,
    unmounted: ke,
    activated: ke,
    deactivated: ke,
    errorCaptured: ke,
    serverPrefetch: ke,
    components: Pn,
    directives: Pn,
    watch: yc,
    provide: Qs,
    inject: bc
  };
  function Qs(e, t) {
    return t ? e ? function() {
      return xe(Q(e) ? e.call(this, this) : e, Q(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function bc(e, t) {
    return Pn(ji(e), ji(t));
  }
  function ji(e) {
    if (j(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
      return t;
    }
    return e;
  }
  function ke(e, t) {
    return e ? [
      ...new Set([].concat(e, t))
    ] : t;
  }
  function Pn(e, t) {
    return e ? xe(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function eo(e, t) {
    return e ? j(e) && j(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : xe(/* @__PURE__ */ Object.create(null), Nr(e), Nr(t ?? {})) : t;
  }
  function yc(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = xe(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = ke(e[r], t[r]);
    return n;
  }
  function qa() {
    return {
      app: null,
      config: {
        isNativeTag: ra,
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
  let wc = 0;
  function xc(e, t) {
    return function(r, i = null) {
      Q(r) || (r = xe({}, r)), i != null && !ue(i) && (i = null);
      const s = qa(), o = /* @__PURE__ */ new WeakSet(), a = [];
      let l = false;
      const c = s.app = {
        _uid: wc++,
        _component: r,
        _props: i,
        _container: null,
        _context: s,
        _instance: null,
        version: ef,
        get config() {
          return s.config;
        },
        set config(u) {
        },
        use(u, ...f) {
          return o.has(u) || (u && Q(u.install) ? (o.add(u), u.install(c, ...f)) : Q(u) && (o.add(u), u(c, ...f))), c;
        },
        mixin(u) {
          return s.mixins.includes(u) || s.mixins.push(u), c;
        },
        component(u, f) {
          return f ? (s.components[u] = f, c) : s.components[u];
        },
        directive(u, f) {
          return f ? (s.directives[u] = f, c) : s.directives[u];
        },
        mount(u, f, h) {
          if (!l) {
            const d = c._ceVNode || ye(r, i);
            return d.appContext = s, h === true ? h = "svg" : h === false && (h = void 0), e(d, u, h), l = true, c._container = u, u.__vue_app__ = c, di(d.component);
          }
        },
        onUnmount(u) {
          a.push(u);
        },
        unmount() {
          l && (Ye(a, c._instance, 16), e(null, c._container), delete c._container.__vue_app__);
        },
        provide(u, f) {
          return s.provides[u] = f, c;
        },
        runWithContext(u) {
          const f = dn;
          dn = c;
          try {
            return u();
          } finally {
            dn = f;
          }
        }
      };
      return c;
    };
  }
  let dn = null;
  function wt(e, t, n = oe) {
    const r = Ps(), i = xt(t), s = Ot(t), o = Ka(e, i), a = Vu((l, c) => {
      let u, f = oe, h;
      return Ju(() => {
        const d = e[i];
        $e(u, d) && (u = d, c());
      }), {
        get() {
          return l(), n.get ? n.get(u) : u;
        },
        set(d) {
          const g = n.set ? n.set(d) : d;
          if (!$e(g, u) && !(f !== oe && $e(d, f))) return;
          const _ = r.vnode.props;
          _ && (t in _ || i in _ || s in _) && (`onUpdate:${t}` in _ || `onUpdate:${i}` in _ || `onUpdate:${s}` in _) || (u = d, c()), r.emit(`update:${t}`, g), $e(d, g) && $e(d, f) && !$e(g, h) && c(), f = d, h = g;
        }
      };
    });
    return a[Symbol.iterator] = () => {
      let l = 0;
      return {
        next() {
          return l < 2 ? {
            value: l++ ? o || oe : a,
            done: false
          } : {
            done: true
          };
        }
      };
    }, a;
  }
  const Ka = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${xt(t)}Modifiers`] || e[`${Ot(t)}Modifiers`];
  function Sc(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || oe;
    let i = n;
    const s = t.startsWith("update:"), o = s && Ka(r, t.slice(7));
    o && (o.trim && (i = n.map((u) => we(u) ? u.trim() : u)), o.number && (i = n.map(gs)));
    let a, l = r[a = vi(t)] || r[a = vi(xt(t))];
    !l && s && (l = r[a = vi(Ot(t))]), l && Ye(l, e, 6, i);
    const c = r[a + "Once"];
    if (c) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[a]) return;
      e.emitted[a] = true, Ye(c, e, 6, i);
    }
  }
  const Tc = /* @__PURE__ */ new WeakMap();
  function ja(e, t, n = false) {
    const r = n ? Tc : t.emitsCache, i = r.get(e);
    if (i !== void 0) return i;
    const s = e.emits;
    let o = {}, a = false;
    if (!Q(e)) {
      const l = (c) => {
        const u = ja(c, t, true);
        u && (a = true, xe(o, u));
      };
      !n && t.mixins.length && t.mixins.forEach(l), e.extends && l(e.extends), e.mixins && e.mixins.forEach(l);
    }
    return !s && !a ? (ue(e) && r.set(e, null), null) : (j(s) ? s.forEach((l) => o[l] = null) : xe(o, s), ue(e) && r.set(e, o), o);
  }
  function ci(e, t) {
    return !e || !Qr(t) ? false : (t = t.slice(2).replace(/Once$/, ""), ae(e, t[0].toLowerCase() + t.slice(1)) || ae(e, Ot(t)) || ae(e, t));
  }
  function to(e) {
    const { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [s], slots: o, attrs: a, emit: l, render: c, renderCache: u, props: f, data: h, setupState: d, ctx: g, inheritAttrs: _ } = e, $ = Rr(e);
    let G, O;
    try {
      if (n.shapeFlag & 4) {
        const b = i || r, S = b;
        G = st(c.call(S, b, u, f, d, h, g)), O = a;
      } else {
        const b = t;
        G = st(b.length > 1 ? b(f, {
          attrs: a,
          slots: o,
          emit: l
        }) : b(f, null)), O = t.props ? a : Mc(a);
      }
    } catch (b) {
      Un.length = 0, oi(b, e, 1), G = ye(Ae);
    }
    let U = G;
    if (O && _ !== false) {
      const b = Object.keys(O), { shapeFlag: S } = U;
      b.length && S & 7 && (s && b.some(ds) && (O = Ec(O, s)), U = It(U, O, false, true));
    }
    return n.dirs && (U = It(U, null, false, true), U.dirs = U.dirs ? U.dirs.concat(n.dirs) : n.dirs), n.transition && Hn(U, n.transition), G = U, Rr($), G;
  }
  const Mc = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || Qr(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Ec = (e, t) => {
    const n = {};
    for (const r in e) (!ds(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function Cc(e, t, n) {
    const { props: r, children: i, component: s } = e, { props: o, children: a, patchFlag: l } = t, c = s.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && l >= 0) {
      if (l & 1024) return true;
      if (l & 16) return r ? no(r, o, c) : !!o;
      if (l & 8) {
        const u = t.dynamicProps;
        for (let f = 0; f < u.length; f++) {
          const h = u[f];
          if (Xa(o, r, h) && !ci(c, h)) return true;
        }
      }
    } else return (i || a) && (!a || !a.$stable) ? true : r === o ? false : r ? o ? no(r, o, c) : true : !!o;
    return false;
  }
  function no(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let i = 0; i < r.length; i++) {
      const s = r[i];
      if (Xa(t, e, s) && !ci(n, s)) return true;
    }
    return false;
  }
  function Xa(e, t, n) {
    const r = e[n], i = t[n];
    return n === "style" && ue(r) && ue(i) ? !er(r, i) : r !== i;
  }
  function kc({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Ya = {}, Za = () => Object.create(Ya), Ja = (e) => Object.getPrototypeOf(e) === Ya;
  function Pc(e, t, n, r = false) {
    const i = {}, s = Za();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Qa(e, t, i, s);
    for (const o in e.propsOptions[0]) o in i || (i[o] = void 0);
    n ? e.props = r ? i : Iu(i) : e.type.props ? e.props = i : e.props = s, e.attrs = s;
  }
  function Ac(e, t, n, r) {
    const { props: i, attrs: s, vnode: { patchFlag: o } } = e, a = re(i), [l] = e.propsOptions;
    let c = false;
    if ((r || o > 0) && !(o & 16)) {
      if (o & 8) {
        const u = e.vnode.dynamicProps;
        for (let f = 0; f < u.length; f++) {
          let h = u[f];
          if (ci(e.emitsOptions, h)) continue;
          const d = t[h];
          if (l) if (ae(s, h)) d !== s[h] && (s[h] = d, c = true);
          else {
            const g = xt(h);
            i[g] = Xi(l, a, g, d, e, false);
          }
          else d !== s[h] && (s[h] = d, c = true);
        }
      }
    } else {
      Qa(e, t, i, s) && (c = true);
      let u;
      for (const f in a) (!t || !ae(t, f) && ((u = Ot(f)) === f || !ae(t, u))) && (l ? n && (n[f] !== void 0 || n[u] !== void 0) && (i[f] = Xi(l, a, f, void 0, e, true)) : delete i[f]);
      if (s !== a) for (const f in s) (!t || !ae(t, f)) && (delete s[f], c = true);
    }
    c && bt(e.attrs, "set", "");
  }
  function Qa(e, t, n, r) {
    const [i, s] = e.propsOptions;
    let o = false, a;
    if (t) for (let l in t) {
      if (Nn(l)) continue;
      const c = t[l];
      let u;
      i && ae(i, u = xt(l)) ? !s || !s.includes(u) ? n[u] = c : (a || (a = {}))[u] = c : ci(e.emitsOptions, l) || (!(l in r) || c !== r[l]) && (r[l] = c, o = true);
    }
    if (s) {
      const l = re(n), c = a || oe;
      for (let u = 0; u < s.length; u++) {
        const f = s[u];
        n[f] = Xi(i, l, f, c[f], e, !ae(c, f));
      }
    }
    return o;
  }
  function Xi(e, t, n, r, i, s) {
    const o = e[n];
    if (o != null) {
      const a = ae(o, "default");
      if (a && r === void 0) {
        const l = o.default;
        if (o.type !== Function && !o.skipFactory && Q(l)) {
          const { propsDefaults: c } = i;
          if (n in c) r = c[n];
          else {
            const u = rr(i);
            r = c[n] = l.call(null, t), u();
          }
        } else r = l;
        i.ce && i.ce._setProp(n, r);
      }
      o[0] && (s && !a ? r = false : o[1] && (r === "" || r === Ot(n)) && (r = true));
    }
    return r;
  }
  const Rc = /* @__PURE__ */ new WeakMap();
  function el(e, t, n = false) {
    const r = n ? Rc : t.propsCache, i = r.get(e);
    if (i) return i;
    const s = e.props, o = {}, a = [];
    let l = false;
    if (!Q(e)) {
      const u = (f) => {
        l = true;
        const [h, d] = el(f, t, true);
        xe(o, h), d && a.push(...d);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!s && !l) return ue(e) && r.set(e, un), un;
    if (j(s)) for (let u = 0; u < s.length; u++) {
      const f = xt(s[u]);
      ro(f) && (o[f] = oe);
    }
    else if (s) for (const u in s) {
      const f = xt(u);
      if (ro(f)) {
        const h = s[u], d = o[f] = j(h) || Q(h) ? {
          type: h
        } : xe({}, h), g = d.type;
        let _ = false, $ = true;
        if (j(g)) for (let G = 0; G < g.length; ++G) {
          const O = g[G], U = Q(O) && O.name;
          if (U === "Boolean") {
            _ = true;
            break;
          } else U === "String" && ($ = false);
        }
        else _ = Q(g) && g.name === "Boolean";
        d[0] = _, d[1] = $, (_ || ae(d, "default")) && a.push(f);
      }
    }
    const c = [
      o,
      a
    ];
    return ue(e) && r.set(e, c), c;
  }
  function ro(e) {
    return e[0] !== "$" && !Nn(e);
  }
  const Es = (e) => e === "_" || e === "_ctx" || e === "$stable", Cs = (e) => j(e) ? e.map(st) : [
    st(e)
  ], Lc = (e, t, n) => {
    if (t._n) return t;
    const r = Na((...i) => Cs(t(...i)), n);
    return r._c = false, r;
  }, tl = (e, t, n) => {
    const r = e._ctx;
    for (const i in e) {
      if (Es(i)) continue;
      const s = e[i];
      if (Q(s)) t[i] = Lc(i, s, r);
      else if (s != null) {
        const o = Cs(s);
        t[i] = () => o;
      }
    }
  }, nl = (e, t) => {
    const n = Cs(t);
    e.slots.default = () => n;
  }, rl = (e, t, n) => {
    for (const r in t) (n || !Es(r)) && (e[r] = t[r]);
  }, Nc = (e, t, n) => {
    const r = e.slots = Za();
    if (e.vnode.shapeFlag & 32) {
      const i = t._;
      i ? (rl(r, t, n), n && la(r, "_", i, true)) : tl(t, r);
    } else t && nl(e, t);
  }, Ic = (e, t, n) => {
    const { vnode: r, slots: i } = e;
    let s = true, o = oe;
    if (r.shapeFlag & 32) {
      const a = t._;
      a ? n && a === 1 ? s = false : rl(i, t, n) : (s = !t.$stable, tl(t, i)), o = t;
    } else t && (nl(e, t), o = {
      default: 1
    });
    if (s) for (const a in i) !Es(a) && o[a] == null && delete i[a];
  }, Ie = Uc;
  function Oc(e) {
    return $c(e);
  }
  function $c(e, t) {
    const n = ni();
    n.__VUE__ = true;
    const { insert: r, remove: i, patchProp: s, createElement: o, createText: a, createComment: l, setText: c, setElementText: u, parentNode: f, nextSibling: h, setScopeId: d = at, insertStaticContent: g } = e, _ = (p, m, w, k = null, T = null, M = null, D = void 0, I = null, L = !!m.dynamicChildren) => {
      if (p === m) return;
      p && !zt(p, m) && (k = en(p), C(p, T, M, true), p = null), m.patchFlag === -2 && (L = false, m.dynamicChildren = null);
      const { type: E, ref: Y, shapeFlag: F } = m;
      switch (E) {
        case fi:
          $(p, m, w, k);
          break;
        case Ae:
          G(p, m, w, k);
          break;
        case yr:
          p == null && O(m, w, k, D);
          break;
        case Ue:
          x(p, m, w, k, T, M, D, I, L);
          break;
        default:
          F & 1 ? S(p, m, w, k, T, M, D, I, L) : F & 6 ? q(p, m, w, k, T, M, D, I, L) : (F & 64 || F & 128) && E.process(p, m, w, k, T, M, D, I, L, xn);
      }
      Y != null && T ? $n(Y, p && p.ref, M, m || p, !m) : Y == null && p && p.ref != null && $n(p.ref, null, M, p, true);
    }, $ = (p, m, w, k) => {
      if (p == null) r(m.el = a(m.children), w, k);
      else {
        const T = m.el = p.el;
        m.children !== p.children && c(T, m.children);
      }
    }, G = (p, m, w, k) => {
      p == null ? r(m.el = l(m.children || ""), w, k) : m.el = p.el;
    }, O = (p, m, w, k) => {
      [p.el, p.anchor] = g(p.children, m, w, k, p.el, p.anchor);
    }, U = ({ el: p, anchor: m }, w, k) => {
      let T;
      for (; p && p !== m; ) T = h(p), r(p, w, k), p = T;
      r(m, w, k);
    }, b = ({ el: p, anchor: m }) => {
      let w;
      for (; p && p !== m; ) w = h(p), i(p), p = w;
      i(m);
    }, S = (p, m, w, k, T, M, D, I, L) => {
      if (m.type === "svg" ? D = "svg" : m.type === "math" && (D = "mathml"), p == null) A(m, w, k, T, M, D, I, L);
      else {
        const E = p.el && p.el._isVueCE ? p.el : null;
        try {
          E && E._beginPatch(), B(p, m, T, M, D, I, L);
        } finally {
          E && E._endPatch();
        }
      }
    }, A = (p, m, w, k, T, M, D, I) => {
      let L, E;
      const { props: Y, shapeFlag: F, transition: K, dirs: J } = p;
      if (L = p.el = o(p.type, M, Y && Y.is, Y), F & 8 ? u(L, p.children) : F & 16 && X(p.children, L, null, k, T, Ti(p, M), D, I), J && $t(p, null, k, "created"), H(L, p, p.scopeId, D, k), Y) {
        for (const de in Y) de !== "value" && !Nn(de) && s(L, de, null, Y[de], M, k);
        "value" in Y && s(L, "value", null, Y.value, M), (E = Y.onVnodeBeforeMount) && nt(E, k, p);
      }
      J && $t(p, null, k, "beforeMount");
      const ie = Bc(T, K);
      ie && K.beforeEnter(L), r(L, m, w), ((E = Y && Y.onVnodeMounted) || ie || J) && Ie(() => {
        E && nt(E, k, p), ie && K.enter(L), J && $t(p, null, k, "mounted");
      }, T);
    }, H = (p, m, w, k, T) => {
      if (w && d(p, w), k) for (let M = 0; M < k.length; M++) d(p, k[M]);
      if (T) {
        let M = T.subTree;
        if (m === M || al(M.type) && (M.ssContent === m || M.ssFallback === m)) {
          const D = T.vnode;
          H(p, D, D.scopeId, D.slotScopeIds, T.parent);
        }
      }
    }, X = (p, m, w, k, T, M, D, I, L = 0) => {
      for (let E = L; E < p.length; E++) {
        const Y = p[E] = I ? _t(p[E]) : st(p[E]);
        _(null, Y, m, w, k, T, M, D, I);
      }
    }, B = (p, m, w, k, T, M, D) => {
      const I = m.el = p.el;
      let { patchFlag: L, dynamicChildren: E, dirs: Y } = m;
      L |= p.patchFlag & 16;
      const F = p.props || oe, K = m.props || oe;
      let J;
      if (w && Bt(w, false), (J = K.onVnodeBeforeUpdate) && nt(J, w, m, p), Y && $t(m, p, w, "beforeUpdate"), w && Bt(w, true), (F.innerHTML && K.innerHTML == null || F.textContent && K.textContent == null) && u(I, ""), E ? V(p.dynamicChildren, E, I, w, k, Ti(m, T), M) : D || z(p, m, I, null, w, k, Ti(m, T), M, false), L > 0) {
        if (L & 16) W(I, F, K, w, T);
        else if (L & 2 && F.class !== K.class && s(I, "class", null, K.class, T), L & 4 && s(I, "style", F.style, K.style, T), L & 8) {
          const ie = m.dynamicProps;
          for (let de = 0; de < ie.length; de++) {
            const ce = ie[de], Le = F[ce], Ne = K[ce];
            (Ne !== Le || ce === "value") && s(I, ce, Le, Ne, T, w);
          }
        }
        L & 1 && p.children !== m.children && u(I, m.children);
      } else !D && E == null && W(I, F, K, w, T);
      ((J = K.onVnodeUpdated) || Y) && Ie(() => {
        J && nt(J, w, m, p), Y && $t(m, p, w, "updated");
      }, k);
    }, V = (p, m, w, k, T, M, D) => {
      for (let I = 0; I < m.length; I++) {
        const L = p[I], E = m[I], Y = L.el && (L.type === Ue || !zt(L, E) || L.shapeFlag & 198) ? f(L.el) : w;
        _(L, E, Y, null, k, T, M, D, true);
      }
    }, W = (p, m, w, k, T) => {
      if (m !== w) {
        if (m !== oe) for (const M in m) !Nn(M) && !(M in w) && s(p, M, m[M], null, T, k);
        for (const M in w) {
          if (Nn(M)) continue;
          const D = w[M], I = m[M];
          D !== I && M !== "value" && s(p, M, I, D, T, k);
        }
        "value" in w && s(p, "value", m.value, w.value, T);
      }
    }, x = (p, m, w, k, T, M, D, I, L) => {
      const E = m.el = p ? p.el : a(""), Y = m.anchor = p ? p.anchor : a("");
      let { patchFlag: F, dynamicChildren: K, slotScopeIds: J } = m;
      J && (I = I ? I.concat(J) : J), p == null ? (r(E, w, k), r(Y, w, k), X(m.children || [], w, Y, T, M, D, I, L)) : F > 0 && F & 64 && K && p.dynamicChildren && p.dynamicChildren.length === K.length ? (V(p.dynamicChildren, K, w, T, M, D, I), (m.key != null || T && m === T.subTree) && il(p, m, true)) : z(p, m, w, Y, T, M, D, I, L);
    }, q = (p, m, w, k, T, M, D, I, L) => {
      m.slotScopeIds = I, p == null ? m.shapeFlag & 512 ? T.ctx.activate(m, w, k, D, L) : ee(m, w, k, T, M, D, L) : ge(p, m, L);
    }, ee = (p, m, w, k, T, M, D) => {
      const I = p.component = Kc(p, k, T);
      if (li(p) && (I.ctx.renderer = xn), jc(I, false, D), I.asyncDep) {
        if (T && T.registerDep(I, N, D), !p.el) {
          const L = I.subTree = ye(Ae);
          G(null, L, m, w), p.placeholder = L.el;
        }
      } else N(I, p, m, w, T, M, D);
    }, ge = (p, m, w) => {
      const k = m.component = p.component;
      if (Cc(p, m, w)) if (k.asyncDep && !k.asyncResolved) {
        R(k, m, w);
        return;
      } else k.next = m, k.update();
      else m.el = p.el, k.vnode = m;
    }, N = (p, m, w, k, T, M, D) => {
      const I = () => {
        if (p.isMounted) {
          let { next: F, bu: K, u: J, parent: ie, vnode: de } = p;
          {
            const et = sl(p);
            if (et) {
              F && (F.el = de.el, R(p, F, D)), et.asyncDep.then(() => {
                Ie(() => {
                  p.isUnmounted || E();
                }, T);
              });
              return;
            }
          }
          let ce = F, Le;
          Bt(p, false), F ? (F.el = de.el, R(p, F, D)) : F = de, K && _r(K), (Le = F.props && F.props.onVnodeBeforeUpdate) && nt(Le, ie, F, de), Bt(p, true);
          const Ne = to(p), Qe = p.subTree;
          p.subTree = Ne, _(Qe, Ne, f(Qe.el), en(Qe), p, T, M), F.el = Ne.el, ce === null && kc(p, Ne.el), J && Ie(J, T), (Le = F.props && F.props.onVnodeUpdated) && Ie(() => nt(Le, ie, F, de), T);
        } else {
          let F;
          const { el: K, props: J } = m, { bm: ie, m: de, parent: ce, root: Le, type: Ne } = p, Qe = Bn(m);
          Bt(p, false), ie && _r(ie), !Qe && (F = J && J.onVnodeBeforeMount) && nt(F, ce, m), Bt(p, true);
          {
            Le.ce && Le.ce._hasShadowRoot() && Le.ce._injectChildStyle(Ne);
            const et = p.subTree = to(p);
            _(null, et, w, k, p, T, M), m.el = et.el;
          }
          if (de && Ie(de, T), !Qe && (F = J && J.onVnodeMounted)) {
            const et = m;
            Ie(() => nt(F, ce, et), T);
          }
          (m.shapeFlag & 256 || ce && Bn(ce.vnode) && ce.vnode.shapeFlag & 256) && p.a && Ie(p.a, T), p.isMounted = true, m = w = k = null;
        }
      };
      p.scope.on();
      const L = p.effect = new ha(I);
      p.scope.off();
      const E = p.update = L.run.bind(L), Y = p.job = L.runIfDirty.bind(L);
      Y.i = p, Y.id = p.uid, L.scheduler = () => Ss(Y), Bt(p, true), E();
    }, R = (p, m, w) => {
      m.component = p;
      const k = p.vnode.props;
      p.vnode = m, p.next = null, Ac(p, m.props, k, w), Ic(p, m.children, w), St(), js(p), Tt();
    }, z = (p, m, w, k, T, M, D, I, L = false) => {
      const E = p && p.children, Y = p ? p.shapeFlag : 0, F = m.children, { patchFlag: K, shapeFlag: J } = m;
      if (K > 0) {
        if (K & 128) {
          P(E, F, w, k, T, M, D, I, L);
          return;
        } else if (K & 256) {
          te(E, F, w, k, T, M, D, I, L);
          return;
        }
      }
      J & 8 ? (Y & 16 && ze(E, T, M), F !== E && u(w, F)) : Y & 16 ? J & 16 ? P(E, F, w, k, T, M, D, I, L) : ze(E, T, M, true) : (Y & 8 && u(w, ""), J & 16 && X(F, w, k, T, M, D, I, L));
    }, te = (p, m, w, k, T, M, D, I, L) => {
      p = p || un, m = m || un;
      const E = p.length, Y = m.length, F = Math.min(E, Y);
      let K;
      for (K = 0; K < F; K++) {
        const J = m[K] = L ? _t(m[K]) : st(m[K]);
        _(p[K], J, w, null, T, M, D, I, L);
      }
      E > Y ? ze(p, T, M, true, false, F) : X(m, w, k, T, M, D, I, L, F);
    }, P = (p, m, w, k, T, M, D, I, L) => {
      let E = 0;
      const Y = m.length;
      let F = p.length - 1, K = Y - 1;
      for (; E <= F && E <= K; ) {
        const J = p[E], ie = m[E] = L ? _t(m[E]) : st(m[E]);
        if (zt(J, ie)) _(J, ie, w, null, T, M, D, I, L);
        else break;
        E++;
      }
      for (; E <= F && E <= K; ) {
        const J = p[F], ie = m[K] = L ? _t(m[K]) : st(m[K]);
        if (zt(J, ie)) _(J, ie, w, null, T, M, D, I, L);
        else break;
        F--, K--;
      }
      if (E > F) {
        if (E <= K) {
          const J = K + 1, ie = J < Y ? m[J].el : k;
          for (; E <= K; ) _(null, m[E] = L ? _t(m[E]) : st(m[E]), w, ie, T, M, D, I, L), E++;
        }
      } else if (E > K) for (; E <= F; ) C(p[E], T, M, true), E++;
      else {
        const J = E, ie = E, de = /* @__PURE__ */ new Map();
        for (E = ie; E <= K; E++) {
          const De = m[E] = L ? _t(m[E]) : st(m[E]);
          De.key != null && de.set(De.key, E);
        }
        let ce, Le = 0;
        const Ne = K - ie + 1;
        let Qe = false, et = 0;
        const Sn = new Array(Ne);
        for (E = 0; E < Ne; E++) Sn[E] = 0;
        for (E = J; E <= F; E++) {
          const De = p[E];
          if (Le >= Ne) {
            C(De, T, M, true);
            continue;
          }
          let tt;
          if (De.key != null) tt = de.get(De.key);
          else for (ce = ie; ce <= K; ce++) if (Sn[ce - ie] === 0 && zt(De, m[ce])) {
            tt = ce;
            break;
          }
          tt === void 0 ? C(De, T, M, true) : (Sn[tt - ie] = E + 1, tt >= et ? et = tt : Qe = true, _(De, m[tt], w, null, T, M, D, I, L), Le++);
        }
        const Vs = Qe ? Dc(Sn) : un;
        for (ce = Vs.length - 1, E = Ne - 1; E >= 0; E--) {
          const De = ie + E, tt = m[De], zs = m[De + 1], Gs = De + 1 < Y ? zs.el || ol(zs) : k;
          Sn[E] === 0 ? _(null, tt, w, Gs, T, M, D, I, L) : Qe && (ce < 0 || E !== Vs[ce] ? y(tt, w, Gs, 2) : ce--);
        }
      }
    }, y = (p, m, w, k, T = null) => {
      const { el: M, type: D, transition: I, children: L, shapeFlag: E } = p;
      if (E & 6) {
        y(p.component.subTree, m, w, k);
        return;
      }
      if (E & 128) {
        p.suspense.move(m, w, k);
        return;
      }
      if (E & 64) {
        D.move(p, m, w, xn);
        return;
      }
      if (D === Ue) {
        r(M, m, w);
        for (let F = 0; F < L.length; F++) y(L[F], m, w, k);
        r(p.anchor, m, w);
        return;
      }
      if (D === yr) {
        U(p, m, w);
        return;
      }
      if (k !== 2 && E & 1 && I) if (k === 0) I.beforeEnter(M), r(M, m, w), Ie(() => I.enter(M), T);
      else {
        const { leave: F, delayLeave: K, afterLeave: J } = I, ie = () => {
          p.ctx.isUnmounted ? i(M) : r(M, m, w);
        }, de = () => {
          M._isLeaving && M[it](true), F(M, () => {
            ie(), J && J();
          });
        };
        K ? K(M, ie, de) : de();
      }
      else r(M, m, w);
    }, C = (p, m, w, k = false, T = false) => {
      const { type: M, props: D, ref: I, children: L, dynamicChildren: E, shapeFlag: Y, patchFlag: F, dirs: K, cacheIndex: J } = p;
      if (F === -2 && (T = false), I != null && (St(), $n(I, null, w, p, true), Tt()), J != null && (m.renderCache[J] = void 0), Y & 256) {
        m.ctx.deactivate(p);
        return;
      }
      const ie = Y & 1 && K, de = !Bn(p);
      let ce;
      if (de && (ce = D && D.onVnodeBeforeUnmount) && nt(ce, m, p), Y & 6) Je(p.component, w, k);
      else {
        if (Y & 128) {
          p.suspense.unmount(w, k);
          return;
        }
        ie && $t(p, null, m, "beforeUnmount"), Y & 64 ? p.type.remove(p, m, w, xn, k) : E && !E.hasOnce && (M !== Ue || F > 0 && F & 64) ? ze(E, m, w, false, true) : (M === Ue && F & 384 || !T && Y & 16) && ze(L, m, w), k && _e(p);
      }
      (de && (ce = D && D.onVnodeUnmounted) || ie) && Ie(() => {
        ce && nt(ce, m, p), ie && $t(p, null, m, "unmounted");
      }, w);
    }, _e = (p) => {
      const { type: m, el: w, anchor: k, transition: T } = p;
      if (m === Ue) {
        Be(w, k);
        return;
      }
      if (m === yr) {
        b(p);
        return;
      }
      const M = () => {
        i(w), T && !T.persisted && T.afterLeave && T.afterLeave();
      };
      if (p.shapeFlag & 1 && T && !T.persisted) {
        const { leave: D, delayLeave: I } = T, L = () => D(w, M);
        I ? I(p.el, M, L) : L();
      } else M();
    }, Be = (p, m) => {
      let w;
      for (; p !== m; ) w = h(p), i(p), p = w;
      i(m);
    }, Je = (p, m, w) => {
      const { bum: k, scope: T, job: M, subTree: D, um: I, m: L, a: E } = p;
      io(L), io(E), k && _r(k), T.stop(), M && (M.flags |= 8, C(D, p, m, w)), I && Ie(I, m), Ie(() => {
        p.isUnmounted = true;
      }, m);
    }, ze = (p, m, w, k = false, T = false, M = 0) => {
      for (let D = M; D < p.length; D++) C(p[D], m, w, k, T);
    }, en = (p) => {
      if (p.shapeFlag & 6) return en(p.component.subTree);
      if (p.shapeFlag & 128) return p.suspense.next();
      const m = h(p.anchor || p.el), w = m && m[ec];
      return w ? h(w) : m;
    };
    let wn = false;
    const ar = (p, m, w) => {
      let k;
      p == null ? m._vnode && (C(m._vnode, null, null, true), k = m._vnode.component) : _(m._vnode || null, p, m, null, null, null, w), m._vnode = p, wn || (wn = true, js(k), Aa(), wn = false);
    }, xn = {
      p: _,
      um: C,
      m: y,
      r: _e,
      mt: ee,
      mc: X,
      pc: z,
      pbc: V,
      n: en,
      o: e
    };
    return {
      render: ar,
      hydrate: void 0,
      createApp: xc(ar)
    };
  }
  function Ti({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function Bt({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function Bc(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function il(e, t, n = false) {
    const r = e.children, i = t.children;
    if (j(r) && j(i)) for (let s = 0; s < r.length; s++) {
      const o = r[s];
      let a = i[s];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[s] = _t(i[s]), a.el = o.el), !n && a.patchFlag !== -2 && il(o, a)), a.type === fi && (a.patchFlag === -1 && (a = i[s] = _t(a)), a.el = o.el), a.type === Ae && !a.el && (a.el = o.el);
    }
  }
  function Dc(e) {
    const t = e.slice(), n = [
      0
    ];
    let r, i, s, o, a;
    const l = e.length;
    for (r = 0; r < l; r++) {
      const c = e[r];
      if (c !== 0) {
        if (i = n[n.length - 1], e[i] < c) {
          t[r] = i, n.push(r);
          continue;
        }
        for (s = 0, o = n.length - 1; s < o; ) a = s + o >> 1, e[n[a]] < c ? s = a + 1 : o = a;
        c < e[n[s]] && (s > 0 && (t[r] = n[s - 1]), n[s] = r);
      }
    }
    for (s = n.length, o = n[s - 1]; s-- > 0; ) n[s] = o, o = t[o];
    return n;
  }
  function sl(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : sl(t);
  }
  function io(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  function ol(e) {
    if (e.placeholder) return e.placeholder;
    const t = e.component;
    return t ? ol(t.subTree) : null;
  }
  const al = (e) => e.__isSuspense;
  function Uc(e, t) {
    t && t.pendingBranch ? j(e) ? t.effects.push(...e) : t.effects.push(e) : ju(e);
  }
  const Ue = /* @__PURE__ */ Symbol.for("v-fgt"), fi = /* @__PURE__ */ Symbol.for("v-txt"), Ae = /* @__PURE__ */ Symbol.for("v-cmt"), yr = /* @__PURE__ */ Symbol.for("v-stc"), Un = [];
  let Fe = null;
  function le(e = false) {
    Un.push(Fe = e ? null : []);
  }
  function Fc() {
    Un.pop(), Fe = Un[Un.length - 1] || null;
  }
  let Wn = 1;
  function Or(e, t = false) {
    Wn += e, e < 0 && Fe && t && (Fe.hasOnce = true);
  }
  function ll(e) {
    return e.dynamicChildren = Wn > 0 ? Fe || un : null, Fc(), Wn > 0 && Fe && Fe.push(e), e;
  }
  function fe(e, t, n, r, i, s) {
    return ll(v(e, t, n, r, i, s, true));
  }
  function ul(e, t, n, r, i) {
    return ll(ye(e, t, n, r, i, true));
  }
  function $r(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function zt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const cl = ({ key: e }) => e ?? null, wr = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? we(e) || Ce(e) || Q(e) ? {
    i: He,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function v(e, t = null, n = null, r = 0, i = null, s = e === Ue ? 0 : 1, o = false, a = false) {
    const l = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && cl(t),
      ref: t && wr(t),
      scopeId: La,
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
      ctx: He
    };
    return a ? (ks(l, n), s & 128 && e.normalize(l)) : n && (l.shapeFlag |= we(n) ? 8 : 16), Wn > 0 && !o && Fe && (l.patchFlag > 0 || s & 6) && l.patchFlag !== 32 && Fe.push(l), l;
  }
  const ye = Vc;
  function Vc(e, t = null, n = null, r = 0, i = null, s = false) {
    if ((!e || e === pc) && (e = Ae), $r(e)) {
      const a = It(e, t, true);
      return n && ks(a, n), Wn > 0 && !s && Fe && (a.shapeFlag & 6 ? Fe[Fe.indexOf(e)] = a : Fe.push(a)), a.patchFlag = -2, a;
    }
    if (Jc(e) && (e = e.__vccOpts), t) {
      t = zc(t);
      let { class: a, style: l } = t;
      a && !we(a) && (t.class = ve(a)), ue(l) && (xs(l) && !j(l) && (l = xe({}, l)), t.style = ri(l));
    }
    const o = we(e) ? 1 : al(e) ? 128 : Oa(e) ? 64 : ue(e) ? 4 : Q(e) ? 2 : 0;
    return v(e, t, n, r, i, o, s, true);
  }
  function zc(e) {
    return e ? xs(e) || Ja(e) ? xe({}, e) : e : null;
  }
  function It(e, t, n = false, r = false) {
    const { props: i, ref: s, patchFlag: o, children: a, transition: l } = e, c = t ? Hc(i || {}, t) : i, u = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: c,
      key: c && cl(c),
      ref: t && t.ref ? n && s ? j(s) ? s.concat(wr(t)) : [
        s,
        wr(t)
      ] : wr(t) : s,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: a,
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
      transition: l,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && It(e.ssContent),
      ssFallback: e.ssFallback && It(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return l && r && Hn(u, l.clone(u)), u;
  }
  function se(e = " ", t = 0) {
    return ye(fi, null, e, t);
  }
  function Gc(e, t) {
    const n = ye(yr, null, e);
    return n.staticCount = t, n;
  }
  function Gt(e = "", t = false) {
    return t ? (le(), ul(Ae, null, e)) : ye(Ae, null, e);
  }
  function st(e) {
    return e == null || typeof e == "boolean" ? ye(Ae) : j(e) ? ye(Ue, null, e.slice()) : $r(e) ? _t(e) : ye(fi, null, String(e));
  }
  function _t(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : It(e);
  }
  function ks(e, t) {
    let n = 0;
    const { shapeFlag: r } = e;
    if (t == null) t = null;
    else if (j(t)) n = 16;
    else if (typeof t == "object") if (r & 65) {
      const i = t.default;
      i && (i._c && (i._d = false), ks(e, i()), i._c && (i._d = true));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !Ja(t) ? t._ctx = He : i === 3 && He && (He.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else Q(t) ? (t = {
      default: t,
      _ctx: He
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      se(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function Hc(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const i in r) if (i === "class") t.class !== r.class && (t.class = ve([
        t.class,
        r.class
      ]));
      else if (i === "style") t.style = ri([
        t.style,
        r.style
      ]);
      else if (Qr(i)) {
        const s = t[i], o = r[i];
        o && s !== o && !(j(s) && s.includes(o)) && (t[i] = s ? [].concat(s, o) : o);
      } else i !== "" && (t[i] = r[i]);
    }
    return t;
  }
  function nt(e, t, n, r = null) {
    Ye(e, t, 7, [
      n,
      r
    ]);
  }
  const Wc = qa();
  let qc = 0;
  function Kc(e, t, n) {
    const r = e.type, i = (t ? t.appContext : e.appContext) || Wc, s = {
      uid: qc++,
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
      scope: new pu(true),
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
      propsOptions: el(r, i),
      emitsOptions: ja(r, i),
      emit: null,
      emitted: null,
      propsDefaults: oe,
      inheritAttrs: r.inheritAttrs,
      ctx: oe,
      data: oe,
      props: oe,
      attrs: oe,
      slots: oe,
      refs: oe,
      setupState: oe,
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
    }, s.root = t ? t.root : s, s.emit = Sc.bind(null, s), e.ce && e.ce(s), s;
  }
  let Re = null;
  const Ps = () => Re || He;
  let Br, Yi;
  {
    const e = ni(), t = (n, r) => {
      let i;
      return (i = e[n]) || (i = e[n] = []), i.push(r), (s) => {
        i.length > 1 ? i.forEach((o) => o(s)) : i[0](s);
      };
    };
    Br = t("__VUE_INSTANCE_SETTERS__", (n) => Re = n), Yi = t("__VUE_SSR_SETTERS__", (n) => qn = n);
  }
  const rr = (e) => {
    const t = Re;
    return Br(e), e.scope.on(), () => {
      e.scope.off(), Br(t);
    };
  }, so = () => {
    Re && Re.scope.off(), Br(null);
  };
  function fl(e) {
    return e.vnode.shapeFlag & 4;
  }
  let qn = false;
  function jc(e, t = false, n = false) {
    t && Yi(t);
    const { props: r, children: i } = e.vnode, s = fl(e);
    Pc(e, r, s, t), Nc(e, i, n || t);
    const o = s ? Xc(e, t) : void 0;
    return t && Yi(false), o;
  }
  function Xc(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, gc);
    const { setup: r } = n;
    if (r) {
      St();
      const i = e.setupContext = r.length > 1 ? Zc(e) : null, s = rr(e), o = tr(r, e, 0, [
        e.props,
        i
      ]), a = ia(o);
      if (Tt(), s(), (a || e.sp) && !Bn(e) && Va(e), a) {
        if (o.then(so, so), t) return o.then((l) => {
          oo(e, l);
        }).catch((l) => {
          oi(l, e, 0);
        });
        e.asyncDep = o;
      } else oo(e, o);
    } else dl(e);
  }
  function oo(e, t, n) {
    Q(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : ue(t) && (e.setupState = Ca(t)), dl(e);
  }
  function dl(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || at);
    {
      const i = rr(e);
      St();
      try {
        mc(e);
      } finally {
        Tt(), i();
      }
    }
  }
  const Yc = {
    get(e, t) {
      return Me(e, "get", ""), e[t];
    }
  };
  function Zc(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, Yc),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function di(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Ca(Ou(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in Dn) return Dn[n](e);
      },
      has(t, n) {
        return n in t || n in Dn;
      }
    })) : e.proxy;
  }
  function Jc(e) {
    return Q(e) && "__vccOpts" in e;
  }
  const Te = (e, t) => Gu(e, t, qn);
  function Qc(e, t, n) {
    try {
      Or(-1);
      const r = arguments.length;
      return r === 2 ? ue(t) && !j(t) ? $r(t) ? ye(e, null, [
        t
      ]) : ye(e, t) : ye(e, null, t) : (r > 3 ? n = Array.prototype.slice.call(arguments, 2) : r === 3 && $r(n) && (n = [
        n
      ]), ye(e, t, n));
    } finally {
      Or(1);
    }
  }
  const ef = "3.5.28";
  let Zi;
  const ao = typeof window < "u" && window.trustedTypes;
  if (ao) try {
    Zi = ao.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const hl = Zi ? (e) => Zi.createHTML(e) : (e) => e, tf = "http://www.w3.org/2000/svg", nf = "http://www.w3.org/1998/Math/MathML", vt = typeof document < "u" ? document : null, lo = vt && vt.createElement("template"), rf = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const i = t === "svg" ? vt.createElementNS(tf, e) : t === "mathml" ? vt.createElementNS(nf, e) : n ? vt.createElement(e, {
        is: n
      }) : vt.createElement(e);
      return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
    },
    createText: (e) => vt.createTextNode(e),
    createComment: (e) => vt.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => vt.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, r, i, s) {
      const o = n ? n.previousSibling : t.lastChild;
      if (i && (i === s || i.nextSibling)) for (; t.insertBefore(i.cloneNode(true), n), !(i === s || !(i = i.nextSibling)); ) ;
      else {
        lo.innerHTML = hl(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const a = lo.content;
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
  }, At = "transition", En = "animation", Kn = /* @__PURE__ */ Symbol("_vtc"), pl = {
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
  }, sf = xe({}, $a, pl), of = (e) => (e.displayName = "Transition", e.props = sf, e), af = of((e, { slots: t }) => Qc(rc, lf(e), t)), Dt = (e, t = []) => {
    j(e) ? e.forEach((n) => n(...t)) : e && e(...t);
  }, uo = (e) => e ? j(e) ? e.some((t) => t.length > 1) : e.length > 1 : false;
  function lf(e) {
    const t = {};
    for (const x in e) x in pl || (t[x] = e[x]);
    if (e.css === false) return t;
    const { name: n = "v", type: r, duration: i, enterFromClass: s = `${n}-enter-from`, enterActiveClass: o = `${n}-enter-active`, enterToClass: a = `${n}-enter-to`, appearFromClass: l = s, appearActiveClass: c = o, appearToClass: u = a, leaveFromClass: f = `${n}-leave-from`, leaveActiveClass: h = `${n}-leave-active`, leaveToClass: d = `${n}-leave-to` } = e, g = uf(i), _ = g && g[0], $ = g && g[1], { onBeforeEnter: G, onEnter: O, onEnterCancelled: U, onLeave: b, onLeaveCancelled: S, onBeforeAppear: A = G, onAppear: H = O, onAppearCancelled: X = U } = t, B = (x, q, ee, ge) => {
      x._enterCancelled = ge, Ut(x, q ? u : a), Ut(x, q ? c : o), ee && ee();
    }, V = (x, q) => {
      x._isLeaving = false, Ut(x, f), Ut(x, d), Ut(x, h), q && q();
    }, W = (x) => (q, ee) => {
      const ge = x ? H : O, N = () => B(q, x, ee);
      Dt(ge, [
        q,
        N
      ]), co(() => {
        Ut(q, x ? l : s), pt(q, x ? u : a), uo(ge) || fo(q, r, _, N);
      });
    };
    return xe(t, {
      onBeforeEnter(x) {
        Dt(G, [
          x
        ]), pt(x, s), pt(x, o);
      },
      onBeforeAppear(x) {
        Dt(A, [
          x
        ]), pt(x, l), pt(x, c);
      },
      onEnter: W(false),
      onAppear: W(true),
      onLeave(x, q) {
        x._isLeaving = true;
        const ee = () => V(x, q);
        pt(x, f), x._enterCancelled ? (pt(x, h), go(x)) : (go(x), pt(x, h)), co(() => {
          x._isLeaving && (Ut(x, f), pt(x, d), uo(b) || fo(x, r, $, ee));
        }), Dt(b, [
          x,
          ee
        ]);
      },
      onEnterCancelled(x) {
        B(x, false, void 0, true), Dt(U, [
          x
        ]);
      },
      onAppearCancelled(x) {
        B(x, true, void 0, true), Dt(X, [
          x
        ]);
      },
      onLeaveCancelled(x) {
        V(x), Dt(S, [
          x
        ]);
      }
    });
  }
  function uf(e) {
    if (e == null) return null;
    if (ue(e)) return [
      Mi(e.enter),
      Mi(e.leave)
    ];
    {
      const t = Mi(e);
      return [
        t,
        t
      ];
    }
  }
  function Mi(e) {
    return ou(e);
  }
  function pt(e, t) {
    t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Kn] || (e[Kn] = /* @__PURE__ */ new Set())).add(t);
  }
  function Ut(e, t) {
    t.split(/\s+/).forEach((r) => r && e.classList.remove(r));
    const n = e[Kn];
    n && (n.delete(t), n.size || (e[Kn] = void 0));
  }
  function co(e) {
    requestAnimationFrame(() => {
      requestAnimationFrame(e);
    });
  }
  let cf = 0;
  function fo(e, t, n, r) {
    const i = e._endId = ++cf, s = () => {
      i === e._endId && r();
    };
    if (n != null) return setTimeout(s, n);
    const { type: o, timeout: a, propCount: l } = ff(e, t);
    if (!o) return r();
    const c = o + "end";
    let u = 0;
    const f = () => {
      e.removeEventListener(c, h), s();
    }, h = (d) => {
      d.target === e && ++u >= l && f();
    };
    setTimeout(() => {
      u < l && f();
    }, a + 1), e.addEventListener(c, h);
  }
  function ff(e, t) {
    const n = window.getComputedStyle(e), r = (g) => (n[g] || "").split(", "), i = r(`${At}Delay`), s = r(`${At}Duration`), o = ho(i, s), a = r(`${En}Delay`), l = r(`${En}Duration`), c = ho(a, l);
    let u = null, f = 0, h = 0;
    t === At ? o > 0 && (u = At, f = o, h = s.length) : t === En ? c > 0 && (u = En, f = c, h = l.length) : (f = Math.max(o, c), u = f > 0 ? o > c ? At : En : null, h = u ? u === At ? s.length : l.length : 0);
    const d = u === At && /\b(?:transform|all)(?:,|$)/.test(r(`${At}Property`).toString());
    return {
      type: u,
      timeout: f,
      propCount: h,
      hasTransform: d
    };
  }
  function ho(e, t) {
    for (; e.length < t.length; ) e = e.concat(e);
    return Math.max(...t.map((n, r) => po(n) + po(e[r])));
  }
  function po(e) {
    return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
  }
  function go(e) {
    return (e ? e.ownerDocument : document).body.offsetHeight;
  }
  function df(e, t, n) {
    const r = e[Kn];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const Dr = /* @__PURE__ */ Symbol("_vod"), gl = /* @__PURE__ */ Symbol("_vsh"), Ei = {
    name: "show",
    beforeMount(e, { value: t }, { transition: n }) {
      e[Dr] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : Cn(e, t);
    },
    mounted(e, { value: t }, { transition: n }) {
      n && t && n.enter(e);
    },
    updated(e, { value: t, oldValue: n }, { transition: r }) {
      !t != !n && (r ? t ? (r.beforeEnter(e), Cn(e, true), r.enter(e)) : r.leave(e, () => {
        Cn(e, false);
      }) : Cn(e, t));
    },
    beforeUnmount(e, { value: t }) {
      Cn(e, t);
    }
  };
  function Cn(e, t) {
    e.style.display = t ? e[Dr] : "none", e[gl] = !t;
  }
  const hf = /* @__PURE__ */ Symbol(""), pf = /(?:^|;)\s*display\s*:/;
  function gf(e, t, n) {
    const r = e.style, i = we(n);
    let s = false;
    if (n && !i) {
      if (t) if (we(t)) for (const o of t.split(";")) {
        const a = o.slice(0, o.indexOf(":")).trim();
        n[a] == null && xr(r, a, "");
      }
      else for (const o in t) n[o] == null && xr(r, o, "");
      for (const o in n) o === "display" && (s = true), xr(r, o, n[o]);
    } else if (i) {
      if (t !== n) {
        const o = r[hf];
        o && (n += ";" + o), r.cssText = n, s = pf.test(n);
      }
    } else t && e.removeAttribute("style");
    Dr in e && (e[Dr] = s ? r.display : "", e[gl] && (r.display = "none"));
  }
  const mo = /\s*!important$/;
  function xr(e, t, n) {
    if (j(n)) n.forEach((r) => xr(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = mf(e, t);
      mo.test(n) ? e.setProperty(Ot(r), n.replace(mo, ""), "important") : e[r] = n;
    }
  }
  const vo = [
    "Webkit",
    "Moz",
    "ms"
  ], Ci = {};
  function mf(e, t) {
    const n = Ci[t];
    if (n) return n;
    let r = xt(t);
    if (r !== "filter" && r in e) return Ci[t] = r;
    r = aa(r);
    for (let i = 0; i < vo.length; i++) {
      const s = vo[i] + r;
      if (s in e) return Ci[t] = s;
    }
    return t;
  }
  const _o = "http://www.w3.org/1999/xlink";
  function bo(e, t, n, r, i, s = du(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(_o, t.slice(6, t.length)) : e.setAttributeNS(_o, t, n) : n == null || s && !ua(n) ? e.removeAttribute(t) : e.setAttribute(t, s ? "" : ft(n) ? String(n) : n);
  }
  function yo(e, t, n, r, i) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? hl(n) : n);
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
      a === "boolean" ? n = ua(n) : n == null && a === "string" ? (n = "", o = true) : a === "number" && (n = 0, o = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    o && e.removeAttribute(i || t);
  }
  function Ht(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function vf(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const wo = /* @__PURE__ */ Symbol("_vei");
  function _f(e, t, n, r, i = null) {
    const s = e[wo] || (e[wo] = {}), o = s[t];
    if (r && o) o.value = r;
    else {
      const [a, l] = bf(t);
      if (r) {
        const c = s[t] = xf(r, i);
        Ht(e, a, c, l);
      } else o && (vf(e, a, o, l), s[t] = void 0);
    }
  }
  const xo = /(?:Once|Passive|Capture)$/;
  function bf(e) {
    let t;
    if (xo.test(e)) {
      t = {};
      let r;
      for (; r = e.match(xo); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : Ot(e.slice(2)),
      t
    ];
  }
  let ki = 0;
  const yf = Promise.resolve(), wf = () => ki || (yf.then(() => ki = 0), ki = Date.now());
  function xf(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Ye(Sf(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = wf(), n;
  }
  function Sf(e, t) {
    if (j(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (i) => !i._stopped && r && r(i));
    } else return t;
  }
  const So = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Tf = (e, t, n, r, i, s) => {
    const o = i === "svg";
    t === "class" ? df(e, r, o) : t === "style" ? gf(e, n, r) : Qr(t) ? ds(t) || _f(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Mf(e, t, r, o)) ? (yo(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && bo(e, t, r, o, s, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !we(r)) ? yo(e, xt(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), bo(e, t, r, o));
  };
  function Mf(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && So(t) && Q(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const i = e.tagName;
      if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE") return false;
    }
    return So(t) && we(n) ? false : t in e;
  }
  const Ur = (e) => {
    const t = e.props["onUpdate:modelValue"] || false;
    return j(t) ? (n) => _r(t, n) : t;
  };
  function Ef(e) {
    e.target.composing = true;
  }
  function To(e) {
    const t = e.target;
    t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
  }
  const hn = /* @__PURE__ */ Symbol("_assign");
  function Mo(e, t, n) {
    return t && (e = e.trim()), n && (e = gs(e)), e;
  }
  const gt = {
    created(e, { modifiers: { lazy: t, trim: n, number: r } }, i) {
      e[hn] = Ur(i);
      const s = r || i.props && i.props.type === "number";
      Ht(e, t ? "change" : "input", (o) => {
        o.target.composing || e[hn](Mo(e.value, n, s));
      }), (n || s) && Ht(e, "change", () => {
        e.value = Mo(e.value, n, s);
      }), t || (Ht(e, "compositionstart", Ef), Ht(e, "compositionend", To), Ht(e, "change", To));
    },
    mounted(e, { value: t }) {
      e.value = t ?? "";
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: i, number: s } }, o) {
      if (e[hn] = Ur(o), e.composing) return;
      const a = (s || e.type === "number") && !/^0\d/.test(e.value) ? gs(e.value) : e.value, l = t ?? "";
      a !== l && (document.activeElement === e && e.type !== "range" && (r && t === n || i && e.value.trim() === l) || (e.value = l));
    }
  }, Ft = {
    deep: true,
    created(e, t, n) {
      e[hn] = Ur(n), Ht(e, "change", () => {
        const r = e._modelValue, i = Cf(e), s = e.checked, o = e[hn];
        if (j(r)) {
          const a = ca(r, i), l = a !== -1;
          if (s && !l) o(r.concat(i));
          else if (!s && l) {
            const c = [
              ...r
            ];
            c.splice(a, 1), o(c);
          }
        } else if (ei(r)) {
          const a = new Set(r);
          s ? a.add(i) : a.delete(i), o(a);
        } else o(ml(e, s));
      });
    },
    mounted: Eo,
    beforeUpdate(e, t, n) {
      e[hn] = Ur(n), Eo(e, t, n);
    }
  };
  function Eo(e, { value: t, oldValue: n }, r) {
    e._modelValue = t;
    let i;
    if (j(t)) i = ca(t, r.props.value) > -1;
    else if (ei(t)) i = t.has(r.props.value);
    else {
      if (t === n) return;
      i = er(t, ml(e, true));
    }
    e.checked !== i && (e.checked = i);
  }
  function Cf(e) {
    return "_value" in e ? e._value : e.value;
  }
  function ml(e, t) {
    const n = t ? "_trueValue" : "_falseValue";
    return n in e ? e[n] : t;
  }
  const kf = [
    "ctrl",
    "shift",
    "alt",
    "meta"
  ], Pf = {
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
    exact: (e, t) => kf.some((n) => e[`${n}Key`] && !t.includes(n))
  }, Co = (e, t) => {
    if (!e) return e;
    const n = e._withMods || (e._withMods = {}), r = t.join(".");
    return n[r] || (n[r] = ((i, ...s) => {
      for (let o = 0; o < t.length; o++) {
        const a = Pf[t[o]];
        if (a && a(i, t)) return;
      }
      return e(i, ...s);
    }));
  }, Af = xe({
    patchProp: Tf
  }, rf);
  let ko;
  function Rf() {
    return ko || (ko = Oc(Af));
  }
  const Lf = ((...e) => {
    const t = Rf().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const i = If(r);
      if (!i) return;
      const s = t._component;
      !Q(s) && !s.render && !s.template && (s.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
      const o = n(i, false, Nf(i));
      return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), o;
    }, t;
  });
  function Nf(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function If(e) {
    return we(e) ? document.querySelector(e) : e;
  }
  const Of = `struct MandelbrotStep {
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
`, $f = `struct Uniforms {
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
`, Bf = `// Brush pass: updates sentinel levels in the neutral square texture.
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
`, Df = `// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
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
`, Uf = "" + new URL("mandelbrot_bg-vrZBR1hs.wasm", import.meta.url).href, Ff = async (e = {}, t) => {
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
  let Z;
  function Vf(e) {
    Z = e;
  }
  function As(e, t) {
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
  let fr = null;
  function Sr() {
    return (fr === null || fr.byteLength === 0) && (fr = new Uint8Array(Z.memory.buffer)), fr;
  }
  let Tr = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  Tr.decode();
  const zf = 2146435072;
  let Pi = 0;
  function Gf(e, t) {
    return Pi += t, Pi >= zf && (Tr = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), Tr.decode(), Pi = t), Tr.decode(Sr().subarray(e, e + t));
  }
  function vl(e, t) {
    return e = e >>> 0, Gf(e, t);
  }
  function me(e) {
    if (typeof e != "number") throw new Error(`expected a number argument, found ${typeof e}`);
  }
  let nn = null;
  function Hf() {
    return (nn === null || nn.buffer.detached === true || nn.buffer.detached === void 0 && nn.buffer !== Z.memory.buffer) && (nn = new DataView(Z.memory.buffer)), nn;
  }
  function Po(e, t) {
    e = e >>> 0;
    const n = Hf(), r = [];
    for (let i = e; i < e + 4 * t; i += 4) r.push(Z.__wbindgen_export_0.get(n.getUint32(i, true)));
    return Z.__externref_drop_slice(e, t), r;
  }
  let Nt = 0;
  const Fn = new TextEncoder();
  "encodeInto" in Fn || (Fn.encodeInto = function(e, t) {
    const n = Fn.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  });
  function rn(e, t, n) {
    if (typeof e != "string") throw new Error(`expected a string argument, found ${typeof e}`);
    if (n === void 0) {
      const a = Fn.encode(e), l = t(a.length, 1) >>> 0;
      return Sr().subarray(l, l + a.length).set(a), Nt = a.length, l;
    }
    let r = e.length, i = t(r, 1) >>> 0;
    const s = Sr();
    let o = 0;
    for (; o < r; o++) {
      const a = e.charCodeAt(o);
      if (a > 127) break;
      s[i + o] = a;
    }
    if (o !== r) {
      o !== 0 && (e = e.slice(o)), i = n(i, r, r = o + e.length * 3, 1) >>> 0;
      const a = Sr().subarray(i + o, i + r), l = Fn.encodeInto(e, a);
      if (l.read !== e.length) throw new Error("failed to pass whole string");
      o += l.written, i = n(i, r, o, 1) >>> 0;
    }
    return Nt = o, i;
  }
  const Ao = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => Z.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  class Ji {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Ao.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      Z.__wbg_mandelbrotnavigator_free(t, 0);
    }
    get_params() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr);
      const t = Z.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = Po(t[0], t[1]).slice();
      return Z.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    rotate_direct(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), Z.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), Z.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    get_reference_orbit_len() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return me(this.__wbg_ptr), Z.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    compute_reference_orbit_ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), me(t);
      const n = Z.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return jn.__wrap(n);
    }
    get_reference_orbit_capacity() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return me(this.__wbg_ptr), Z.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    constructor(t, n, r, i) {
      const s = rn(t, Z.__wbindgen_malloc, Z.__wbindgen_realloc), o = Nt, a = rn(n, Z.__wbindgen_malloc, Z.__wbindgen_realloc), l = Nt, c = rn(r, Z.__wbindgen_malloc, Z.__wbindgen_realloc), u = Nt, f = Z.mandelbrotnavigator_new(s, o, a, l, c, u, i);
      return this.__wbg_ptr = f >>> 0, Ao.register(this, this.__wbg_ptr, this), this;
    }
    step() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr);
      const t = Z.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = Po(t[0], t[1]).slice();
      return Z.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    zoom(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), Z.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    angle(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), Z.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    scale(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr);
      const n = rn(t, Z.__wbindgen_malloc, Z.__wbindgen_realloc), r = Nt;
      Z.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
    }
    origin(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr);
      const r = rn(t, Z.__wbindgen_malloc, Z.__wbindgen_realloc), i = Nt, s = rn(n, Z.__wbindgen_malloc, Z.__wbindgen_realloc), o = Nt;
      Z.mandelbrotnavigator_origin(this.__wbg_ptr, r, i, s, o);
    }
    rotate(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), Z.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), Z.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
  }
  Symbol.dispose && (Ji.prototype[Symbol.dispose] = Ji.prototype.free);
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => Z.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const Ro = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => Z.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class jn {
    constructor() {
      throw new Error("cannot invoke `new` directly");
    }
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(jn.prototype);
      return n.__wbg_ptr = t, Ro.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Ro.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      Z.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return me(this.__wbg_ptr), Z.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), me(t), Z.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return me(this.__wbg_ptr), Z.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), me(t), Z.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return me(this.__wbg_ptr), Z.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      me(this.__wbg_ptr), me(t), Z.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  Symbol.dispose && (jn.prototype[Symbol.dispose] = jn.prototype.free);
  function Wf() {
    return As(function(e) {
      return Math.exp(e);
    }, arguments);
  }
  function qf() {
    return As(function() {
      return Date.now();
    }, arguments);
  }
  function Kf(e, t) {
    throw new Error(vl(e, t));
  }
  function jf() {
    return As(function(e, t) {
      return vl(e, t);
    }, arguments);
  }
  function Xf() {
    const e = Z.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  URL = globalThis.URL;
  const ne = await Ff({
    "./mandelbrot_bg.js": {
      __wbg_now_1e80617bcee43265: qf,
      __wbg_exp_9293ded1248e1bd3: Wf,
      __wbg_wbindgenthrow_451ec1a8469d7eb6: Kf,
      __wbindgen_init_externref_table: Xf,
      __wbindgen_cast_2241b6af4c4b2941: jf
    }
  }, Uf), _l = ne.memory, Yf = ne.__wbg_get_mandelbrotstep_dx, Zf = ne.__wbg_get_mandelbrotstep_dy, Jf = ne.__wbg_get_mandelbrotstep_zx, Qf = ne.__wbg_get_mandelbrotstep_zy, ed = ne.__wbg_get_orbitbufferinfo_count, td = ne.__wbg_get_orbitbufferinfo_offset, nd = ne.__wbg_get_orbitbufferinfo_ptr, rd = ne.__wbg_mandelbrotnavigator_free, id = ne.__wbg_mandelbrotstep_free, sd = ne.__wbg_orbitbufferinfo_free, od = ne.__wbg_set_mandelbrotstep_dx, ad = ne.__wbg_set_mandelbrotstep_dy, ld = ne.__wbg_set_mandelbrotstep_zx, ud = ne.__wbg_set_mandelbrotstep_zy, cd = ne.__wbg_set_orbitbufferinfo_count, fd = ne.__wbg_set_orbitbufferinfo_offset, dd = ne.__wbg_set_orbitbufferinfo_ptr, hd = ne.mandelbrotnavigator_angle, pd = ne.mandelbrotnavigator_compute_reference_orbit_ptr, gd = ne.mandelbrotnavigator_get_params, md = ne.mandelbrotnavigator_get_reference_orbit_capacity, vd = ne.mandelbrotnavigator_get_reference_orbit_len, _d = ne.mandelbrotnavigator_new, bd = ne.mandelbrotnavigator_origin, yd = ne.mandelbrotnavigator_rotate, wd = ne.mandelbrotnavigator_rotate_direct, xd = ne.mandelbrotnavigator_scale, Sd = ne.mandelbrotnavigator_step, Td = ne.mandelbrotnavigator_translate, Md = ne.mandelbrotnavigator_translate_direct, Ed = ne.mandelbrotnavigator_zoom, Cd = ne.__wbindgen_export_0, kd = ne.__externref_drop_slice, Pd = ne.__wbindgen_free, Ad = ne.__wbindgen_malloc, Rd = ne.__wbindgen_realloc, bl = ne.__wbindgen_start, Ld = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: kd,
    __wbg_get_mandelbrotstep_dx: Yf,
    __wbg_get_mandelbrotstep_dy: Zf,
    __wbg_get_mandelbrotstep_zx: Jf,
    __wbg_get_mandelbrotstep_zy: Qf,
    __wbg_get_orbitbufferinfo_count: ed,
    __wbg_get_orbitbufferinfo_offset: td,
    __wbg_get_orbitbufferinfo_ptr: nd,
    __wbg_mandelbrotnavigator_free: rd,
    __wbg_mandelbrotstep_free: id,
    __wbg_orbitbufferinfo_free: sd,
    __wbg_set_mandelbrotstep_dx: od,
    __wbg_set_mandelbrotstep_dy: ad,
    __wbg_set_mandelbrotstep_zx: ld,
    __wbg_set_mandelbrotstep_zy: ud,
    __wbg_set_orbitbufferinfo_count: cd,
    __wbg_set_orbitbufferinfo_offset: fd,
    __wbg_set_orbitbufferinfo_ptr: dd,
    __wbindgen_export_0: Cd,
    __wbindgen_free: Pd,
    __wbindgen_malloc: Ad,
    __wbindgen_realloc: Rd,
    __wbindgen_start: bl,
    mandelbrotnavigator_angle: hd,
    mandelbrotnavigator_compute_reference_orbit_ptr: pd,
    mandelbrotnavigator_get_params: gd,
    mandelbrotnavigator_get_reference_orbit_capacity: md,
    mandelbrotnavigator_get_reference_orbit_len: vd,
    mandelbrotnavigator_new: _d,
    mandelbrotnavigator_origin: bd,
    mandelbrotnavigator_rotate: yd,
    mandelbrotnavigator_rotate_direct: wd,
    mandelbrotnavigator_scale: xd,
    mandelbrotnavigator_step: Sd,
    mandelbrotnavigator_translate: Td,
    mandelbrotnavigator_translate_direct: Md,
    mandelbrotnavigator_zoom: Ed,
    memory: _l
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  Vf(Ld);
  bl();
  class Nd {
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
  function ir(e, t, n) {
    e.prototype = t.prototype = n, n.constructor = e;
  }
  function hi(e, t) {
    var n = Object.create(e.prototype);
    for (var r in t) n[r] = t[r];
    return n;
  }
  function Qt() {
  }
  var Xn = 0.7, Fr = 1 / Xn, pn = "\\s*([+-]?\\d+)\\s*", Yn = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", lt = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", Id = /^#([0-9a-f]{3,8})$/, Od = new RegExp(`^rgb\\(${pn},${pn},${pn}\\)$`), $d = new RegExp(`^rgb\\(${lt},${lt},${lt}\\)$`), Bd = new RegExp(`^rgba\\(${pn},${pn},${pn},${Yn}\\)$`), Dd = new RegExp(`^rgba\\(${lt},${lt},${lt},${Yn}\\)$`), Ud = new RegExp(`^hsl\\(${Yn},${lt},${lt}\\)$`), Fd = new RegExp(`^hsla\\(${Yn},${lt},${lt},${Yn}\\)$`), Lo = {
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
  ir(Qt, Yt, {
    copy(e) {
      return Object.assign(new this.constructor(), this, e);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: No,
    formatHex: No,
    formatHex8: Vd,
    formatHsl: zd,
    formatRgb: Io,
    toString: Io
  });
  function No() {
    return this.rgb().formatHex();
  }
  function Vd() {
    return this.rgb().formatHex8();
  }
  function zd() {
    return wl(this).formatHsl();
  }
  function Io() {
    return this.rgb().formatRgb();
  }
  function Yt(e) {
    var t, n;
    return e = (e + "").trim().toLowerCase(), (t = Id.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Oo(t) : n === 3 ? new Ee(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? dr(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? dr(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = Od.exec(e)) ? new Ee(t[1], t[2], t[3], 1) : (t = $d.exec(e)) ? new Ee(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = Bd.exec(e)) ? dr(t[1], t[2], t[3], t[4]) : (t = Dd.exec(e)) ? dr(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = Ud.exec(e)) ? Do(t[1], t[2] / 100, t[3] / 100, 1) : (t = Fd.exec(e)) ? Do(t[1], t[2] / 100, t[3] / 100, t[4]) : Lo.hasOwnProperty(e) ? Oo(Lo[e]) : e === "transparent" ? new Ee(NaN, NaN, NaN, 0) : null;
  }
  function Oo(e) {
    return new Ee(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
  }
  function dr(e, t, n, r) {
    return r <= 0 && (e = t = n = NaN), new Ee(e, t, n, r);
  }
  function yl(e) {
    return e instanceof Qt || (e = Yt(e)), e ? (e = e.rgb(), new Ee(e.r, e.g, e.b, e.opacity)) : new Ee();
  }
  function ut(e, t, n, r) {
    return arguments.length === 1 ? yl(e) : new Ee(e, t, n, r ?? 1);
  }
  function Ee(e, t, n, r) {
    this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
  }
  ir(Ee, ut, hi(Qt, {
    brighter(e) {
      return e = e == null ? Fr : Math.pow(Fr, e), new Ee(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? Xn : Math.pow(Xn, e), new Ee(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new Ee(Xt(this.r), Xt(this.g), Xt(this.b), Vr(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
    },
    hex: $o,
    formatHex: $o,
    formatHex8: Gd,
    formatRgb: Bo,
    toString: Bo
  }));
  function $o() {
    return `#${Wt(this.r)}${Wt(this.g)}${Wt(this.b)}`;
  }
  function Gd() {
    return `#${Wt(this.r)}${Wt(this.g)}${Wt(this.b)}${Wt((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function Bo() {
    const e = Vr(this.opacity);
    return `${e === 1 ? "rgb(" : "rgba("}${Xt(this.r)}, ${Xt(this.g)}, ${Xt(this.b)}${e === 1 ? ")" : `, ${e})`}`;
  }
  function Vr(e) {
    return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
  }
  function Xt(e) {
    return Math.max(0, Math.min(255, Math.round(e) || 0));
  }
  function Wt(e) {
    return e = Xt(e), (e < 16 ? "0" : "") + e.toString(16);
  }
  function Do(e, t, n, r) {
    return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new Ke(e, t, n, r);
  }
  function wl(e) {
    if (e instanceof Ke) return new Ke(e.h, e.s, e.l, e.opacity);
    if (e instanceof Qt || (e = Yt(e)), !e) return new Ke();
    if (e instanceof Ke) return e;
    e = e.rgb();
    var t = e.r / 255, n = e.g / 255, r = e.b / 255, i = Math.min(t, n, r), s = Math.max(t, n, r), o = NaN, a = s - i, l = (s + i) / 2;
    return a ? (t === s ? o = (n - r) / a + (n < r) * 6 : n === s ? o = (r - t) / a + 2 : o = (t - n) / a + 4, a /= l < 0.5 ? s + i : 2 - s - i, o *= 60) : a = l > 0 && l < 1 ? 0 : o, new Ke(o, a, l, e.opacity);
  }
  function Hd(e, t, n, r) {
    return arguments.length === 1 ? wl(e) : new Ke(e, t, n, r ?? 1);
  }
  function Ke(e, t, n, r) {
    this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
  }
  ir(Ke, Hd, hi(Qt, {
    brighter(e) {
      return e = e == null ? Fr : Math.pow(Fr, e), new Ke(this.h, this.s, this.l * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? Xn : Math.pow(Xn, e), new Ke(this.h, this.s, this.l * e, this.opacity);
    },
    rgb() {
      var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < 0.5 ? n : 1 - n) * t, i = 2 * n - r;
      return new Ee(Ai(e >= 240 ? e - 240 : e + 120, i, r), Ai(e, i, r), Ai(e < 120 ? e + 240 : e - 120, i, r), this.opacity);
    },
    clamp() {
      return new Ke(Uo(this.h), hr(this.s), hr(this.l), Vr(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
    },
    formatHsl() {
      const e = Vr(this.opacity);
      return `${e === 1 ? "hsl(" : "hsla("}${Uo(this.h)}, ${hr(this.s) * 100}%, ${hr(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
    }
  }));
  function Uo(e) {
    return e = (e || 0) % 360, e < 0 ? e + 360 : e;
  }
  function hr(e) {
    return Math.max(0, Math.min(1, e || 0));
  }
  function Ai(e, t, n) {
    return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
  }
  const Wd = Math.PI / 180, qd = 180 / Math.PI, zr = 18, xl = 0.96422, Sl = 1, Tl = 0.82521, Ml = 4 / 29, gn = 6 / 29, El = 3 * gn * gn, Kd = gn * gn * gn;
  function Cl(e) {
    if (e instanceof ct) return new ct(e.l, e.a, e.b, e.opacity);
    if (e instanceof ot) return Pl(e);
    e instanceof Ee || (e = yl(e));
    var t = Ii(e.r), n = Ii(e.g), r = Ii(e.b), i = Ri((0.2225045 * t + 0.7168786 * n + 0.0606169 * r) / Sl), s, o;
    return t === n && n === r ? s = o = i : (s = Ri((0.4360747 * t + 0.3850649 * n + 0.1430804 * r) / xl), o = Ri((0.0139322 * t + 0.0971045 * n + 0.7141733 * r) / Tl)), new ct(116 * i - 16, 500 * (s - i), 200 * (i - o), e.opacity);
  }
  function Qi(e, t, n, r) {
    return arguments.length === 1 ? Cl(e) : new ct(e, t, n, r ?? 1);
  }
  function ct(e, t, n, r) {
    this.l = +e, this.a = +t, this.b = +n, this.opacity = +r;
  }
  ir(ct, Qi, hi(Qt, {
    brighter(e) {
      return new ct(this.l + zr * (e ?? 1), this.a, this.b, this.opacity);
    },
    darker(e) {
      return new ct(this.l - zr * (e ?? 1), this.a, this.b, this.opacity);
    },
    rgb() {
      var e = (this.l + 16) / 116, t = isNaN(this.a) ? e : e + this.a / 500, n = isNaN(this.b) ? e : e - this.b / 200;
      return t = xl * Li(t), e = Sl * Li(e), n = Tl * Li(n), new Ee(Ni(3.1338561 * t - 1.6168667 * e - 0.4906146 * n), Ni(-0.9787684 * t + 1.9161415 * e + 0.033454 * n), Ni(0.0719453 * t - 0.2289914 * e + 1.4052427 * n), this.opacity);
    }
  }));
  function Ri(e) {
    return e > Kd ? Math.pow(e, 1 / 3) : e / El + Ml;
  }
  function Li(e) {
    return e > gn ? e * e * e : El * (e - Ml);
  }
  function Ni(e) {
    return 255 * (e <= 31308e-7 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055);
  }
  function Ii(e) {
    return (e /= 255) <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4);
  }
  function kl(e) {
    if (e instanceof ot) return new ot(e.h, e.c, e.l, e.opacity);
    if (e instanceof ct || (e = Cl(e)), e.a === 0 && e.b === 0) return new ot(NaN, 0 < e.l && e.l < 100 ? 0 : NaN, e.l, e.opacity);
    var t = Math.atan2(e.b, e.a) * qd;
    return new ot(t < 0 ? t + 360 : t, Math.sqrt(e.a * e.a + e.b * e.b), e.l, e.opacity);
  }
  function es(e, t, n, r) {
    return arguments.length === 1 ? kl(e) : new ot(n, t, e, 1);
  }
  function jd(e, t, n, r) {
    return arguments.length === 1 ? kl(e) : new ot(e, t, n, r ?? 1);
  }
  function ot(e, t, n, r) {
    this.h = +e, this.c = +t, this.l = +n, this.opacity = +r;
  }
  function Pl(e) {
    if (isNaN(e.h)) return new ct(e.l, 0, 0, e.opacity);
    var t = e.h * Wd;
    return new ct(e.l, Math.cos(t) * e.c, Math.sin(t) * e.c, e.opacity);
  }
  ir(ot, jd, hi(Qt, {
    brighter(e) {
      return new ot(this.h, this.c, this.l + zr * (e ?? 1), this.opacity);
    },
    darker(e) {
      return new ot(this.h, this.c, this.l - zr * (e ?? 1), this.opacity);
    },
    rgb() {
      return Pl(this).rgb();
    }
  }));
  const Rs = (e) => () => e;
  function Xd(e, t) {
    return function(n) {
      return e + n * t;
    };
  }
  function Yd(e, t, n) {
    return e = Math.pow(e, n), t = Math.pow(t, n) - e, n = 1 / n, function(r) {
      return Math.pow(e + r * t, n);
    };
  }
  function Zd(e) {
    return (e = +e) == 1 ? on : function(t, n) {
      return n - t ? Yd(t, n, e) : Rs(isNaN(t) ? n : t);
    };
  }
  function on(e, t) {
    var n = t - e;
    return n ? Xd(e, n) : Rs(isNaN(e) ? t : e);
  }
  const Gr = (function e(t) {
    var n = Zd(t);
    function r(i, s) {
      var o = n((i = ut(i)).r, (s = ut(s)).r), a = n(i.g, s.g), l = n(i.b, s.b), c = on(i.opacity, s.opacity);
      return function(u) {
        return i.r = o(u), i.g = a(u), i.b = l(u), i.opacity = c(u), i + "";
      };
    }
    return r.gamma = e, r;
  })(1);
  function Jd(e, t) {
    t || (t = []);
    var n = e ? Math.min(t.length, e.length) : 0, r = t.slice(), i;
    return function(s) {
      for (i = 0; i < n; ++i) r[i] = e[i] * (1 - s) + t[i] * s;
      return r;
    };
  }
  function Qd(e) {
    return ArrayBuffer.isView(e) && !(e instanceof DataView);
  }
  function eh(e, t) {
    var n = t ? t.length : 0, r = e ? Math.min(n, e.length) : 0, i = new Array(r), s = new Array(n), o;
    for (o = 0; o < r; ++o) i[o] = Ls(e[o], t[o]);
    for (; o < n; ++o) s[o] = t[o];
    return function(a) {
      for (o = 0; o < r; ++o) s[o] = i[o](a);
      return s;
    };
  }
  function th(e, t) {
    var n = /* @__PURE__ */ new Date();
    return e = +e, t = +t, function(r) {
      return n.setTime(e * (1 - r) + t * r), n;
    };
  }
  function qe(e, t) {
    return e = +e, t = +t, function(n) {
      return e * (1 - n) + t * n;
    };
  }
  function nh(e, t) {
    var n = {}, r = {}, i;
    (e === null || typeof e != "object") && (e = {}), (t === null || typeof t != "object") && (t = {});
    for (i in t) i in e ? n[i] = Ls(e[i], t[i]) : r[i] = t[i];
    return function(s) {
      for (i in n) r[i] = n[i](s);
      return r;
    };
  }
  var ts = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Oi = new RegExp(ts.source, "g");
  function rh(e) {
    return function() {
      return e;
    };
  }
  function ih(e) {
    return function(t) {
      return e(t) + "";
    };
  }
  function Al(e, t) {
    var n = ts.lastIndex = Oi.lastIndex = 0, r, i, s, o = -1, a = [], l = [];
    for (e = e + "", t = t + ""; (r = ts.exec(e)) && (i = Oi.exec(t)); ) (s = i.index) > n && (s = t.slice(n, s), a[o] ? a[o] += s : a[++o] = s), (r = r[0]) === (i = i[0]) ? a[o] ? a[o] += i : a[++o] = i : (a[++o] = null, l.push({
      i: o,
      x: qe(r, i)
    })), n = Oi.lastIndex;
    return n < t.length && (s = t.slice(n), a[o] ? a[o] += s : a[++o] = s), a.length < 2 ? l[0] ? ih(l[0].x) : rh(t) : (t = l.length, function(c) {
      for (var u = 0, f; u < t; ++u) a[(f = l[u]).i] = f.x(c);
      return a.join("");
    });
  }
  function Ls(e, t) {
    var n = typeof t, r;
    return t == null || n === "boolean" ? Rs(t) : (n === "number" ? qe : n === "string" ? (r = Yt(t)) ? (t = r, Gr) : Al : t instanceof Yt ? Gr : t instanceof Date ? th : Qd(t) ? Jd : Array.isArray(t) ? eh : typeof t.valueOf != "function" && typeof t.toString != "function" || isNaN(t) ? nh : qe)(e, t);
  }
  function sh(e, t) {
    return e = +e, t = +t, function(n) {
      return Math.round(e * (1 - n) + t * n);
    };
  }
  var Fo = 180 / Math.PI, ns = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function Rl(e, t, n, r, i, s) {
    var o, a, l;
    return (o = Math.sqrt(e * e + t * t)) && (e /= o, t /= o), (l = e * n + t * r) && (n -= e * l, r -= t * l), (a = Math.sqrt(n * n + r * r)) && (n /= a, r /= a, l /= a), e * r < t * n && (e = -e, t = -t, l = -l, o = -o), {
      translateX: i,
      translateY: s,
      rotate: Math.atan2(t, e) * Fo,
      skewX: Math.atan(l) * Fo,
      scaleX: o,
      scaleY: a
    };
  }
  var pr;
  function oh(e) {
    const t = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(e + "");
    return t.isIdentity ? ns : Rl(t.a, t.b, t.c, t.d, t.e, t.f);
  }
  function ah(e) {
    return e == null || (pr || (pr = document.createElementNS("http://www.w3.org/2000/svg", "g")), pr.setAttribute("transform", e), !(e = pr.transform.baseVal.consolidate())) ? ns : (e = e.matrix, Rl(e.a, e.b, e.c, e.d, e.e, e.f));
  }
  function Ll(e, t, n, r) {
    function i(c) {
      return c.length ? c.pop() + " " : "";
    }
    function s(c, u, f, h, d, g) {
      if (c !== f || u !== h) {
        var _ = d.push("translate(", null, t, null, n);
        g.push({
          i: _ - 4,
          x: qe(c, f)
        }, {
          i: _ - 2,
          x: qe(u, h)
        });
      } else (f || h) && d.push("translate(" + f + t + h + n);
    }
    function o(c, u, f, h) {
      c !== u ? (c - u > 180 ? u += 360 : u - c > 180 && (c += 360), h.push({
        i: f.push(i(f) + "rotate(", null, r) - 2,
        x: qe(c, u)
      })) : u && f.push(i(f) + "rotate(" + u + r);
    }
    function a(c, u, f, h) {
      c !== u ? h.push({
        i: f.push(i(f) + "skewX(", null, r) - 2,
        x: qe(c, u)
      }) : u && f.push(i(f) + "skewX(" + u + r);
    }
    function l(c, u, f, h, d, g) {
      if (c !== f || u !== h) {
        var _ = d.push(i(d) + "scale(", null, ",", null, ")");
        g.push({
          i: _ - 4,
          x: qe(c, f)
        }, {
          i: _ - 2,
          x: qe(u, h)
        });
      } else (f !== 1 || h !== 1) && d.push(i(d) + "scale(" + f + "," + h + ")");
    }
    return function(c, u) {
      var f = [], h = [];
      return c = e(c), u = e(u), s(c.translateX, c.translateY, u.translateX, u.translateY, f, h), o(c.rotate, u.rotate, f, h), a(c.skewX, u.skewX, f, h), l(c.scaleX, c.scaleY, u.scaleX, u.scaleY, f, h), c = u = null, function(d) {
        for (var g = -1, _ = h.length, $; ++g < _; ) f[($ = h[g]).i] = $.x(d);
        return f.join("");
      };
    };
  }
  var lh = Ll(oh, "px, ", "px)", "deg)"), uh = Ll(ah, ", ", ")", ")");
  function ch(e, t) {
    var n = on((e = Qi(e)).l, (t = Qi(t)).l), r = on(e.a, t.a), i = on(e.b, t.b), s = on(e.opacity, t.opacity);
    return function(o) {
      return e.l = n(o), e.a = r(o), e.b = i(o), e.opacity = s(o), e + "";
    };
  }
  class Hr {
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
          const s = (t - r.position) / (i.position - r.position), o = ch(r.color, i.color);
          return ut(o(s)).formatHex();
        }
      }
      return "#000";
    }
    generateTexture() {
      const r = new ImageData(4096, 1);
      for (let i = 0; i < 4096; ++i) {
        const s = i / 4095, o = ut(this.getColorAt(s)), a = i * 4;
        r.data[a] = o.r, r.data[a + 1] = o.g, r.data[a + 2] = o.b, r.data[a + 3] = 255;
      }
      return r;
    }
  }
  const fh = 64;
  function dh(e) {
    const t = Math.max(1, Math.floor(e));
    return 2 ** Math.floor(Math.log2(t));
  }
  const _an = class _an {
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
      this.canvas = t, this.shaderPassCompute = Of, this.shaderPassColor = $f, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.time = 0;
    }
    async initialize(t) {
      if (this.mandelbrotNavigator = t, !navigator.gpu) throw new Error("WebGPU non support\xE9");
      if (this.adapter = await navigator.gpu.requestAdapter(), !this.adapter) throw new Error("Adapter WebGPU introuvable");
      this.device = await this.adapter.requestDevice(), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), _an._tileTexture || (_an._tileTexture = await this._loadTexture("./colored_tiles.jpg")), this.tileTexture = await this._loadTexture("./colored_tiles.jpg"), this.tileTextureView = this.tileTexture.createView(), _an._skyboxTexture || (_an._skyboxTexture = await this._loadTexture("./gold.jpg")), this.skyboxTexture = await this._loadTexture("./gold.jpg"), this.skyboxTextureView = this.skyboxTexture.createView();
      const r = new Hr([]).generateTexture();
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
      ]), this.paletteTextureView = this.paletteTexture.createView(), this.webcamTexture = new Nd(1920, 1080), this.webcamTileTexture = this.device.createTexture({
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
        code: Bf,
        label: "Engine ShaderModule Brush"
      }), n = this.device.createShaderModule({
        code: this.shaderPassCompute,
        label: "Engine ShaderModule Compute"
      }), r = this.device.createShaderModule({
        code: Df,
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
      var _a2, _b, _c2, _d2, _e, _f2;
      const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) || 1, i = (n == null ? void 0 : n.clientHeight) || 1;
      this.width = Math.max(1, Math.round(r * t)), this.height = Math.max(1, Math.round(i * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = i + "px", this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.neutralSize = Math.ceil(Math.sqrt(this.width * this.width + this.height * this.height) * 1);
      const s = this.neutralSize;
      if ((_b = (_a2 = this.rawTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.rawBrushTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e = this.resolvedTexture) == null ? void 0 : _e.destroy) == null ? void 0 : _f2.call(_e), this.rawTexture = this.device.createTexture({
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
        const g = new Hr(n.colorStops).generateTexture();
        this.device.queue.writeTexture({
          texture: this.paletteTexture
        }, g.data, {
          bytesPerRow: g.width * 4
        }, [
          g.width,
          g.height
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
      const c = Math.ceil(t.maxIterations), u = this.mandelbrotNavigator.compute_reference_orbit_ptr(c), f = new Float32Array(_l.buffer, u.ptr, u.count * 4);
      u.offset < c && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, f, 0);
      const h = u.offset === 0 && !!this.prevFrameMandelbrot;
      this.clearHistoryNextFrame = false, (!this.prevFrameMandelbrot || h) && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== t.mu && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== t.scale && (this.clearHistoryNextFrame = true), this.previousMandelbrot = structuredClone(t), this.previousRenderOptions = structuredClone(n);
    }
    async render() {
      if (!this.needRender && this.extraFrames <= 0 || (!this.needRender && this.extraFrames > 0 && this.extraFrames--, !this.pipelineBrush || !this.pipelineMandelbrot || !this.pipelineResolve || !this.pipelineColor) || !this.bindGroupBrush || !this.bindGroupMandelbrot || !this.bindGroupResolve || !this.bindGroupColor || !this.previousMandelbrot) return;
      const t = this.width / Math.max(1, this.height), n = dh(fh), r = n, i = this.clearHistoryNextFrame ? 1 : 0;
      let s = 0, o = 0;
      if (!this.clearHistoryNextFrame && this.prevFrameMandelbrot) {
        const g = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx, _ = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy, $ = this.neutralSize, G = Math.sqrt(t * t + 1);
        s = -(g * $) / (2 * this.previousMandelbrot.scale * G), o = _ * $ / (2 * this.previousMandelbrot.scale * G);
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
      const l = this.device.createCommandEncoder(), c = l.beginRenderPass({
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
      c.setPipeline(this.pipelineBrush), c.setBindGroup(0, this.bindGroupBrush), c.draw(6, 1, 0, 0), c.end();
      const u = l.beginRenderPass({
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
      u.setPipeline(this.pipelineMandelbrot), u.setBindGroup(0, this.bindGroupMandelbrot), u.draw(6, 1, 0, 0), u.end();
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
          const g = this.snapshotDestWidth ?? 256, _ = Math.round(g * 9 / 16), $ = this.device.createTexture({
            size: [
              g,
              _,
              1
            ],
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
          });
          {
            const V = this.device.createCommandEncoder(), W = V.beginRenderPass({
              colorAttachments: [
                {
                  view: $.createView(),
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
            W.setPipeline(this.pipelineColor), W.setBindGroup(0, this.bindGroupColor), W.draw(6, 1, 0, 0), W.end(), this.device.queue.submit([
              V.finish()
            ]);
          }
          const G = (V) => V + 255 & -256, O = g * 4, U = G(O), b = U * _, S = this.device.createBuffer({
            size: b,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
          });
          {
            const V = this.device.createCommandEncoder();
            V.copyTextureToBuffer({
              texture: $
            }, {
              buffer: S,
              offset: 0,
              bytesPerRow: U
            }, {
              width: g,
              height: _,
              depthOrArrayLayers: 1
            }), this.device.queue.submit([
              V.finish()
            ]);
          }
          await this.device.queue.onSubmittedWorkDone(), await S.mapAsync(GPUMapMode.READ);
          const A = S.getMappedRange(), H = new Uint8ClampedArray(g * _ * 4), X = new Uint8Array(A);
          for (let V = 0; V < _; ++V) for (let W = 0; W < g; ++W) {
            const x = V * U + W * 4, q = (V * g + W) * 4;
            H[q + 0] = X[x + 2], H[q + 1] = X[x + 1], H[q + 2] = X[x + 0], H[q + 3] = X[x + 3];
          }
          const B = document.createElement("canvas");
          B.width = g, B.height = _, B.getContext("2d").putImageData(new ImageData(H, g, _), 0, 0), S.unmap(), this.snapshotCallback(B.toDataURL("image/png"));
        } catch {
          this.snapshotCallback("");
        }
        this.snapshotCallback = void 0, this.snapshotDestWidth = void 0;
      }
    }
    destroy() {
      var _a2, _b, _c2, _d2, _e, _f2, _g2, _h2, _i2, _j, _k, _l2, _m2, _n2, _o2, _p2, _q, _r2, _s2;
      (_b = (_a2 = this.rawTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.rawBrushTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e = this.resolvedTexture) == null ? void 0 : _e.destroy) == null ? void 0 : _f2.call(_e), (_h2 = (_g2 = this.mandelbrotReferenceBuffer) == null ? void 0 : _g2.destroy) == null ? void 0 : _h2.call(_g2), (_j = (_i2 = this.uniformBufferMandelbrot) == null ? void 0 : _i2.destroy) == null ? void 0 : _j.call(_i2), (_l2 = (_k = this.uniformBufferColor) == null ? void 0 : _k.destroy) == null ? void 0 : _l2.call(_k), (_n2 = (_m2 = this.uniformBufferBrush) == null ? void 0 : _m2.destroy) == null ? void 0 : _n2.call(_m2), (_o2 = this.webcamTexture) == null ? void 0 : _o2.closeWebcam(), (_q = (_p2 = this.webcamTileTexture) == null ? void 0 : _p2.destroy) == null ? void 0 : _q.call(_p2), (_s2 = (_r2 = this.paletteTexture) == null ? void 0 : _r2.destroy) == null ? void 0 : _s2.call(_r2);
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
  __publicField(_an, "_tileTexture");
  __publicField(_an, "_tileTextureView");
  __publicField(_an, "_skyboxTexture");
  __publicField(_an, "_skyboxTextureView");
  __publicField(_an, "_paletteTexture");
  __publicField(_an, "_paletteTextureView");
  let an = _an;
  const hh = Ct({
    __name: "Mandelbrot",
    props: Ms({
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
      const n = pe(null);
      let r = null, i = null, s, o = false;
      const a = wt(e, "cx"), l = wt(e, "cy"), c = wt(e, "scale"), u = wt(e, "angle");
      jt(() => [
        a.value,
        l.value,
        c.value,
        u.value
      ], ([_, $, G, O], [U, b, S, A]) => {
        o || s && (!_ || !$ || !G || ((_ !== U || $ !== b) && s.origin(_, $), G !== S && s.scale(G), O !== A && s.angle(O)));
      }, {
        flush: "sync"
      });
      const f = e;
      async function h() {
        if (!i || !s) return;
        const _ = s.step();
        if (!_) return;
        const [$, G] = _, [O, U, b, S] = s.get_params();
        o = true, a.value = O, l.value = U, c.value = b, u.value = parseFloat(S), await ai(), o = false;
        const A = Math.min(Math.max(100, 200 * Math.log2(1 / parseFloat(b))), 1e5);
        return await i.update({
          cx: O,
          cy: U,
          dx: parseFloat($),
          dy: parseFloat(G),
          mu: f.mu,
          scale: parseFloat(b),
          angle: parseFloat(S),
          maxIterations: A,
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
        if (n.value) return r = n.value, s = new Ji(a.value, l.value, c.value, u.value), s.origin(a.value, l.value), s.scale(c.value), s.angle(u.value), i = new an(r, {
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
      async function g() {
        if (!n.value || !i) return;
        const _ = n.value.getBoundingClientRect();
        n.value.width = _.width, n.value.height = _.height, i.resize(), await h();
      }
      return Pt(async () => (await d(), window.addEventListener("resize", g), g())), nr(() => {
        window.removeEventListener("resize", g);
      }), t({
        getCanvas: () => n.value,
        getEngine: () => i,
        getNavigator: () => s,
        translate: (_, $) => s == null ? void 0 : s.translate(_, $),
        translateDirect: (_, $) => s == null ? void 0 : s.translate_direct(_, $),
        rotate: (_) => s == null ? void 0 : s.rotate(_),
        angle: (_) => s == null ? void 0 : s.angle(_),
        zoom: (_) => s == null ? void 0 : s.zoom(_),
        step: () => s == null ? void 0 : s.step(),
        getParams: () => s == null ? void 0 : s.get_params(),
        drawOnce: async () => h(),
        resize: async () => g(),
        initialize: async () => d()
      }), (_, $) => (le(), fe("canvas", {
        ref_key: "canvasRef",
        ref: n
      }, null, 512));
    }
  }), ph = {
    class: "mobile-nav-controls"
  }, gh = {
    key: 0,
    class: "directional-controls"
  }, mh = Ct({
    __name: "MobileNavigationControls",
    props: {
      mandelbrotRef: {}
    },
    setup(e) {
      const t = e, n = pe(false), r = pe(null);
      let i = null;
      const s = () => {
        n.value = !n.value, n.value || a();
      }, o = (d) => {
        d.preventDefault(), d.stopPropagation(), s();
      }, a = () => {
        r.value = null, i !== null && (clearInterval(i), i = null);
      }, l = (d) => {
        r.value = d;
        const g = 0.1, _ = () => {
          if (t.mandelbrotRef) switch (d) {
            case "north":
              t.mandelbrotRef.translate(0, g);
              break;
            case "south":
              t.mandelbrotRef.translate(0, -g);
              break;
            case "west":
              t.mandelbrotRef.translate(-g, 0);
              break;
            case "east":
              t.mandelbrotRef.translate(g, 0);
              break;
          }
        };
        _(), i = window.setInterval(_, 16);
      }, c = (d) => {
        r.value = `rotate-${d}`;
        const g = 0.025, _ = () => {
          t.mandelbrotRef && (d === "left" ? t.mandelbrotRef.rotate(g) : t.mandelbrotRef.rotate(-g));
        };
        _(), i = window.setInterval(_, 16);
      }, u = (d) => {
        r.value = `zoom-${d}`;
        const g = 0.6, _ = () => {
          t.mandelbrotRef && (d === "in" ? t.mandelbrotRef.zoom(g) : t.mandelbrotRef.zoom(1 / g));
        };
        _(), i = window.setInterval(_, 16);
      }, f = (d, g) => {
        d.preventDefault(), g();
      }, h = (d) => {
        d.preventDefault(), a();
      };
      return (d, g) => (le(), fe("div", ph, [
        v("button", {
          class: ve([
            "nav-button compass-button",
            {
              active: n.value
            }
          ]),
          onClick: s,
          onTouchend: o,
          "aria-label": "Toggle navigation"
        }, [
          ...g[16] || (g[16] = [
            Gc('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-82fd1be4><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-82fd1be4></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-82fd1be4></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-82fd1be4>N</text></svg>', 1)
          ])
        ], 34),
        ye(af, {
          name: "fade"
        }, {
          default: Na(() => [
            n.value ? (le(), fe("div", gh, [
              v("button", {
                class: ve([
                  "nav-button direction-button north",
                  {
                    active: r.value === "north"
                  }
                ]),
                onTouchstart: g[0] || (g[0] = (_) => f(_, () => l("north"))),
                onTouchend: h,
                onMousedown: g[1] || (g[1] = (_) => l("north")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move North"
              }, [
                ...g[17] || (g[17] = [
                  v("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    v("path", {
                      d: "M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              v("button", {
                class: ve([
                  "nav-button direction-button south",
                  {
                    active: r.value === "south"
                  }
                ]),
                onTouchstart: g[2] || (g[2] = (_) => f(_, () => l("south"))),
                onTouchend: h,
                onMousedown: g[3] || (g[3] = (_) => l("south")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move South"
              }, [
                ...g[18] || (g[18] = [
                  v("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    v("path", {
                      d: "M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              v("button", {
                class: ve([
                  "nav-button direction-button west",
                  {
                    active: r.value === "west"
                  }
                ]),
                onTouchstart: g[4] || (g[4] = (_) => f(_, () => l("west"))),
                onTouchend: h,
                onMousedown: g[5] || (g[5] = (_) => l("west")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move West"
              }, [
                ...g[19] || (g[19] = [
                  v("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    v("path", {
                      d: "M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              v("button", {
                class: ve([
                  "nav-button direction-button east",
                  {
                    active: r.value === "east"
                  }
                ]),
                onTouchstart: g[6] || (g[6] = (_) => f(_, () => l("east"))),
                onTouchend: h,
                onMousedown: g[7] || (g[7] = (_) => l("east")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move East"
              }, [
                ...g[20] || (g[20] = [
                  v("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    v("path", {
                      d: "M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              v("button", {
                class: ve([
                  "nav-button corner-button rotate-left",
                  {
                    active: r.value === "rotate-left"
                  }
                ]),
                onTouchstart: g[8] || (g[8] = (_) => f(_, () => c("left"))),
                onTouchend: h,
                onMousedown: g[9] || (g[9] = (_) => c("left")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Rotate Left"
              }, [
                ...g[21] || (g[21] = [
                  v("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    v("path", {
                      d: "M16 8 A6 6 0 1 0 8 16",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round"
                    }),
                    v("path", {
                      d: "M5 16 L8 16 L8 13",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    })
                  ], -1)
                ])
              ], 34),
              v("button", {
                class: ve([
                  "nav-button corner-button rotate-right",
                  {
                    active: r.value === "rotate-right"
                  }
                ]),
                onTouchstart: g[10] || (g[10] = (_) => f(_, () => c("right"))),
                onTouchend: h,
                onMousedown: g[11] || (g[11] = (_) => c("right")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Rotate Right"
              }, [
                ...g[22] || (g[22] = [
                  v("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    v("path", {
                      d: "M8 8 A6 6 0 1 1 16 16",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round"
                    }),
                    v("path", {
                      d: "M19 16 L16 16 L16 13",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    })
                  ], -1)
                ])
              ], 34),
              v("button", {
                class: ve([
                  "nav-button corner-button zoom-out",
                  {
                    active: r.value === "zoom-out"
                  }
                ]),
                onTouchstart: g[12] || (g[12] = (_) => f(_, () => u("out"))),
                onTouchend: h,
                onMousedown: g[13] || (g[13] = (_) => u("out")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Zoom Out"
              }, [
                ...g[23] || (g[23] = [
                  v("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    v("circle", {
                      cx: "11",
                      cy: "11",
                      r: "7",
                      stroke: "currentColor",
                      "stroke-width": "2"
                    }),
                    v("path", {
                      d: "M18 18 L22 22",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    v("path", {
                      d: "M8 11 L14 11",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    })
                  ], -1)
                ])
              ], 34),
              v("button", {
                class: ve([
                  "nav-button corner-button zoom-in",
                  {
                    active: r.value === "zoom-in"
                  }
                ]),
                onTouchstart: g[14] || (g[14] = (_) => f(_, () => u("in"))),
                onTouchend: h,
                onMousedown: g[15] || (g[15] = (_) => u("in")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Zoom In"
              }, [
                ...g[24] || (g[24] = [
                  v("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    v("circle", {
                      cx: "11",
                      cy: "11",
                      r: "7",
                      stroke: "currentColor",
                      "stroke-width": "2"
                    }),
                    v("path", {
                      d: "M18 18 L22 22",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    v("path", {
                      d: "M11 8 L11 14",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    v("path", {
                      d: "M8 11 L14 11",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    })
                  ], -1)
                ])
              ], 34)
            ])) : Gt("", true)
          ]),
          _: 1
        })
      ]));
    }
  }), sr = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [r, i] of t) n[r] = i;
    return n;
  }, vh = sr(mh, [
    [
      "__scopeId",
      "data-v-82fd1be4"
    ]
  ]), _h = {
    style: {
      position: "relative",
      width: "100%",
      height: "100%"
    }
  }, gr = 0.04, Vo = 0.025, bh = Ct({
    __name: "MandelbrotController",
    props: Ms({
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
      const n = wt(e, "cx"), r = wt(e, "cy"), i = wt(e, "scale"), s = wt(e, "angle"), o = e, a = pe(null), l = {};
      t({
        getCanvas: U,
        getEngine: () => {
          var _a2;
          return ((_a2 = a.value) == null ? void 0 : _a2.getEngine()) ?? null;
        }
      });
      let c = false, u = false, f = 0, h = 0, d = 0, g = 0, _ = 0, $ = false, G = null, O = null;
      function U() {
        var _a2;
        return ((_a2 = a.value) == null ? void 0 : _a2.getCanvas()) ?? null;
      }
      function b(N) {
        const R = U();
        if (!R) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const z = R.getBoundingClientRect();
        return {
          x: N.clientX - z.left,
          y: N.clientY - z.top,
          width: z.width,
          height: z.height
        };
      }
      function S(N) {
        l[N.code] = true;
      }
      function A(N) {
        l[N.code] = false;
      }
      function H(N) {
        var _a2, _b;
        N.preventDefault();
        const R = 0.6;
        N.deltaY < 0 ? (_a2 = a.value) == null ? void 0 : _a2.zoom(R) : (_b = a.value) == null ? void 0 : _b.zoom(1 / R);
      }
      function X(N) {
        if (N.button === 2) u = true;
        else {
          c = true;
          const R = b(N);
          f = R.x, h = R.y;
        }
      }
      function B(N) {
        var _a2, _b;
        const R = b(N);
        if (u) {
          const _e = U();
          if (!_e) return;
          const Be = _e.getBoundingClientRect(), Je = Be.width / 2, ze = Be.height / 2, en = R.x, wn = R.y, ar = Math.atan2(wn - ze, en - Je);
          (_a2 = a.value) == null ? void 0 : _a2.angle(ar);
          return;
        }
        if (!c) return;
        const z = R.width, te = R.height, P = z / te, y = (R.x - f) / z * 2, C = (R.y - h) / te * 2;
        (_b = a.value) == null ? void 0 : _b.translateDirect(-y * P, C), f = R.x, h = R.y;
      }
      function V(N) {
        N.button === 2 ? u = false : c = false;
      }
      function W(N) {
        var _a2;
        const R = U();
        if (R) {
          if (N.touches.length === 1) {
            c = true;
            const z = N.touches[0], te = R.getBoundingClientRect();
            f = z.clientX - te.left, h = z.clientY - te.top;
          } else if (N.touches.length === 2) {
            c = false, $ = true;
            const [z, te] = N.touches;
            d = Math.hypot(te.clientX - z.clientX, te.clientY - z.clientY), g = Math.atan2(te.clientY - z.clientY, te.clientX - z.clientX);
            const P = (_a2 = a.value) == null ? void 0 : _a2.getParams();
            _ = P ? parseFloat(P[3]) : 0;
          }
        }
      }
      function x(N) {
        var _a2, _b, _c2;
        const R = U();
        if (R) {
          if (c && N.touches.length === 1) {
            const z = N.touches[0], te = R.getBoundingClientRect(), P = z.clientX - te.left, y = z.clientY - te.top, C = te.width, _e = te.height, Be = C / _e, Je = (P - f) / C * 2, ze = (y - h) / _e * 2;
            (_a2 = a.value) == null ? void 0 : _a2.translateDirect(-Je * Be, ze), f = P, h = y;
          } else if ($ && N.touches.length === 2) {
            const [z, te] = N.touches, P = Math.hypot(te.clientX - z.clientX, te.clientY - z.clientY), y = Math.atan2(te.clientY - z.clientY, te.clientX - z.clientX), C = d / P;
            (_b = a.value) == null ? void 0 : _b.zoom(C);
            const _e = y - g;
            (_c2 = a.value) == null ? void 0 : _c2.angle(_ + _e);
          }
        }
      }
      function q(N) {
        N.touches.length === 0 && (c = false, $ = false);
      }
      function ee() {
        var _a2, _b, _c2, _d2, _e, _f2, _g2, _h2;
        l.KeyW && ((_a2 = a.value) == null ? void 0 : _a2.translate(0, gr)), l.KeyS && ((_b = a.value) == null ? void 0 : _b.translate(0, -gr)), l.KeyA && ((_c2 = a.value) == null ? void 0 : _c2.translate(-gr, 0)), l.KeyD && ((_d2 = a.value) == null ? void 0 : _d2.translate(gr, 0)), l.KeyQ && ((_e = a.value) == null ? void 0 : _e.rotate(Vo)), l.KeyE && ((_f2 = a.value) == null ? void 0 : _f2.rotate(-Vo));
        const N = 0.6;
        l.KeyR && ((_g2 = a.value) == null ? void 0 : _g2.zoom(N)), l.KeyF && ((_h2 = a.value) == null ? void 0 : _h2.zoom(1 / N)), O = window.setTimeout(ee, 16);
      }
      async function ge() {
        var _a2;
        await ((_a2 = a.value) == null ? void 0 : _a2.drawOnce()), G = requestAnimationFrame(ge);
      }
      return Pt(async () => {
        var _a2;
        await ai(), await ((_a2 = a.value) == null ? void 0 : _a2.initialize());
        const N = U();
        N && (window.addEventListener("keydown", S), window.addEventListener("keyup", A), N.addEventListener("wheel", H, {
          passive: false
        }), N.addEventListener("mousedown", X), N.addEventListener("contextmenu", (R) => R.preventDefault()), window.addEventListener("mousemove", B), window.addEventListener("mouseup", V), N.addEventListener("touchstart", W, {
          passive: false
        }), N.addEventListener("touchmove", x, {
          passive: false
        }), N.addEventListener("touchend", q, {
          passive: false
        }), ee(), await ge());
      }), nr(() => {
        G !== null && cancelAnimationFrame(G), O !== null && clearTimeout(O);
        const N = U();
        window.removeEventListener("keydown", S), window.removeEventListener("keyup", A), window.removeEventListener("mousemove", B), window.removeEventListener("mouseup", V), N && (N.removeEventListener("wheel", H), N.removeEventListener("mousedown", X), N.removeEventListener("contextmenu", (R) => R.preventDefault()), N.removeEventListener("touchstart", W), N.removeEventListener("touchmove", x), N.removeEventListener("touchend", q));
      }), (N, R) => (le(), fe("div", _h, [
        ye(hh, {
          ref_key: "mandelbrotRef",
          ref: a,
          scale: i.value,
          "onUpdate:scale": R[0] || (R[0] = (z) => i.value = z),
          angle: s.value,
          "onUpdate:angle": R[1] || (R[1] = (z) => s.value = z),
          cx: n.value,
          "onUpdate:cx": R[2] || (R[2] = (z) => n.value = z),
          cy: r.value,
          "onUpdate:cy": R[3] || (R[3] = (z) => r.value = z),
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
        ]),
        ye(vh, {
          "mandelbrot-ref": a.value
        }, null, 8, [
          "mandelbrot-ref"
        ])
      ]));
    }
  }), yh = sr(bh, [
    [
      "__scopeId",
      "data-v-0d50e619"
    ]
  ]), wh = [
    "fill",
    "stroke"
  ], xh = Ct({
    __name: "GlissiereHandle",
    props: {
      stop: {}
    },
    emits: [
      "update:position"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = pe(null);
      function s(l) {
        let c = l.replace("#", "");
        c.length === 3 && (c = c.split("").map((d) => d + d).join(""));
        const u = parseInt(c.substring(0, 2), 16) / 255, f = parseInt(c.substring(2, 4), 16) / 255, h = parseInt(c.substring(4, 6), 16) / 255;
        return 0.299 * u + 0.587 * f + 0.114 * h;
      }
      const o = Te(() => s(n.stop.color) > 0.5 ? "#222" : "#fff");
      function a(l) {
        l.preventDefault();
        const c = l.clientX, u = n.stop.position, f = i.value;
        if (!f) return;
        const d = f.parentElement.getBoundingClientRect();
        function g($) {
          const G = $.clientX - c;
          let O = u + G / d.width;
          O = Math.max(0, Math.min(1, O)), r("update:position", O);
        }
        function _() {
          window.removeEventListener("mousemove", g), window.removeEventListener("mouseup", _);
        }
        window.addEventListener("mousemove", g), window.addEventListener("mouseup", _);
      }
      return (l, c) => (le(), fe("svg", {
        ref_key: "svgRef",
        ref: i,
        style: ri({
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
        }, null, 8, wh)
      ], 36));
    }
  });
  function Mr(e, t) {
    return e == null || t == null ? NaN : e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
  }
  function Sh(e, t) {
    return e == null || t == null ? NaN : t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
  }
  function Nl(e) {
    let t, n, r;
    e.length !== 2 ? (t = Mr, n = (a, l) => Mr(e(a), l), r = (a, l) => e(a) - l) : (t = e === Mr || e === Sh ? e : Th, n = e, r = e);
    function i(a, l, c = 0, u = a.length) {
      if (c < u) {
        if (t(l, l) !== 0) return u;
        do {
          const f = c + u >>> 1;
          n(a[f], l) < 0 ? c = f + 1 : u = f;
        } while (c < u);
      }
      return c;
    }
    function s(a, l, c = 0, u = a.length) {
      if (c < u) {
        if (t(l, l) !== 0) return u;
        do {
          const f = c + u >>> 1;
          n(a[f], l) <= 0 ? c = f + 1 : u = f;
        } while (c < u);
      }
      return c;
    }
    function o(a, l, c = 0, u = a.length) {
      const f = i(a, l, c, u - 1);
      return f > c && r(a[f - 1], l) > -r(a[f], l) ? f - 1 : f;
    }
    return {
      left: i,
      center: o,
      right: s
    };
  }
  function Th() {
    return 0;
  }
  function Mh(e) {
    return e === null ? NaN : +e;
  }
  const Eh = Nl(Mr), Ch = Eh.right;
  Nl(Mh).center;
  const kh = Math.sqrt(50), Ph = Math.sqrt(10), Ah = Math.sqrt(2);
  function Wr(e, t, n) {
    const r = (t - e) / Math.max(0, n), i = Math.floor(Math.log10(r)), s = r / Math.pow(10, i), o = s >= kh ? 10 : s >= Ph ? 5 : s >= Ah ? 2 : 1;
    let a, l, c;
    return i < 0 ? (c = Math.pow(10, -i) / o, a = Math.round(e * c), l = Math.round(t * c), a / c < e && ++a, l / c > t && --l, c = -c) : (c = Math.pow(10, i) * o, a = Math.round(e / c), l = Math.round(t / c), a * c < e && ++a, l * c > t && --l), l < a && 0.5 <= n && n < 2 ? Wr(e, t, n * 2) : [
      a,
      l,
      c
    ];
  }
  function Rh(e, t, n) {
    if (t = +t, e = +e, n = +n, !(n > 0)) return [];
    if (e === t) return [
      e
    ];
    const r = t < e, [i, s, o] = r ? Wr(t, e, n) : Wr(e, t, n);
    if (!(s >= i)) return [];
    const a = s - i + 1, l = new Array(a);
    if (r) if (o < 0) for (let c = 0; c < a; ++c) l[c] = (s - c) / -o;
    else for (let c = 0; c < a; ++c) l[c] = (s - c) * o;
    else if (o < 0) for (let c = 0; c < a; ++c) l[c] = (i + c) / -o;
    else for (let c = 0; c < a; ++c) l[c] = (i + c) * o;
    return l;
  }
  function rs(e, t, n) {
    return t = +t, e = +e, n = +n, Wr(e, t, n)[2];
  }
  function Lh(e, t, n) {
    t = +t, e = +e, n = +n;
    const r = t < e, i = r ? rs(t, e, n) : rs(e, t, n);
    return (r ? -1 : 1) * (i < 0 ? 1 / -i : i);
  }
  function Nh(e) {
    return e;
  }
  var Ih = 3, zo = 1e-6;
  function Oh(e) {
    return "translate(" + e + ",0)";
  }
  function $h(e) {
    return (t) => +e(t);
  }
  function Bh(e, t) {
    return t = Math.max(0, e.bandwidth() - t * 2) / 2, e.round() && (t = Math.round(t)), (n) => +e(n) + t;
  }
  function Dh() {
    return !this.__axis;
  }
  function Uh(e, t) {
    var n = [], r = null, i = null, s = 6, o = 6, a = 3, l = typeof window < "u" && window.devicePixelRatio > 1 ? 0 : 0.5, c = 1, u = "y", f = Oh;
    function h(d) {
      var g = r ?? (t.ticks ? t.ticks.apply(t, n) : t.domain()), _ = i ?? (t.tickFormat ? t.tickFormat.apply(t, n) : Nh), $ = Math.max(s, 0) + a, G = t.range(), O = +G[0] + l, U = +G[G.length - 1] + l, b = (t.bandwidth ? Bh : $h)(t.copy(), l), S = d.selection ? d.selection() : d, A = S.selectAll(".domain").data([
        null
      ]), H = S.selectAll(".tick").data(g, t).order(), X = H.exit(), B = H.enter().append("g").attr("class", "tick"), V = H.select("line"), W = H.select("text");
      A = A.merge(A.enter().insert("path", ".tick").attr("class", "domain").attr("stroke", "currentColor")), H = H.merge(B), V = V.merge(B.append("line").attr("stroke", "currentColor").attr(u + "2", c * s)), W = W.merge(B.append("text").attr("fill", "currentColor").attr(u, c * $).attr("dy", "0.71em")), d !== S && (A = A.transition(d), H = H.transition(d), V = V.transition(d), W = W.transition(d), X = X.transition(d).attr("opacity", zo).attr("transform", function(x) {
        return isFinite(x = b(x)) ? f(x + l) : this.getAttribute("transform");
      }), B.attr("opacity", zo).attr("transform", function(x) {
        var q = this.parentNode.__axis;
        return f((q && isFinite(q = q(x)) ? q : b(x)) + l);
      })), X.remove(), A.attr("d", o ? "M" + O + "," + c * o + "V" + l + "H" + U + "V" + c * o : "M" + O + "," + l + "H" + U), H.attr("opacity", 1).attr("transform", function(x) {
        return f(b(x) + l);
      }), V.attr(u + "2", c * s), W.attr(u, c * $).text(_), S.filter(Dh).attr("fill", "none").attr("font-size", 10).attr("font-family", "sans-serif").attr("text-anchor", "middle"), S.each(function() {
        this.__axis = b;
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
  function Fh(e) {
    return Uh(Ih, e);
  }
  var Vh = {
    value: () => {
    }
  };
  function Ns() {
    for (var e = 0, t = arguments.length, n = {}, r; e < t; ++e) {
      if (!(r = arguments[e] + "") || r in n || /[\s.]/.test(r)) throw new Error("illegal type: " + r);
      n[r] = [];
    }
    return new Er(n);
  }
  function Er(e) {
    this._ = e;
  }
  function zh(e, t) {
    return e.trim().split(/^|\s+/).map(function(n) {
      var r = "", i = n.indexOf(".");
      if (i >= 0 && (r = n.slice(i + 1), n = n.slice(0, i)), n && !t.hasOwnProperty(n)) throw new Error("unknown type: " + n);
      return {
        type: n,
        name: r
      };
    });
  }
  Er.prototype = Ns.prototype = {
    constructor: Er,
    on: function(e, t) {
      var n = this._, r = zh(e + "", n), i, s = -1, o = r.length;
      if (arguments.length < 2) {
        for (; ++s < o; ) if ((i = (e = r[s]).type) && (i = Gh(n[i], e.name))) return i;
        return;
      }
      if (t != null && typeof t != "function") throw new Error("invalid callback: " + t);
      for (; ++s < o; ) if (i = (e = r[s]).type) n[i] = Go(n[i], e.name, t);
      else if (t == null) for (i in n) n[i] = Go(n[i], e.name, null);
      return this;
    },
    copy: function() {
      var e = {}, t = this._;
      for (var n in t) e[n] = t[n].slice();
      return new Er(e);
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
  function Gh(e, t) {
    for (var n = 0, r = e.length, i; n < r; ++n) if ((i = e[n]).name === t) return i.value;
  }
  function Go(e, t, n) {
    for (var r = 0, i = e.length; r < i; ++r) if (e[r].name === t) {
      e[r] = Vh, e = e.slice(0, r).concat(e.slice(r + 1));
      break;
    }
    return n != null && e.push({
      name: t,
      value: n
    }), e;
  }
  var is = "http://www.w3.org/1999/xhtml";
  const Ho = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: is,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };
  function pi(e) {
    var t = e += "", n = t.indexOf(":");
    return n >= 0 && (t = e.slice(0, n)) !== "xmlns" && (e = e.slice(n + 1)), Ho.hasOwnProperty(t) ? {
      space: Ho[t],
      local: e
    } : e;
  }
  function Hh(e) {
    return function() {
      var t = this.ownerDocument, n = this.namespaceURI;
      return n === is && t.documentElement.namespaceURI === is ? t.createElement(e) : t.createElementNS(n, e);
    };
  }
  function Wh(e) {
    return function() {
      return this.ownerDocument.createElementNS(e.space, e.local);
    };
  }
  function Is(e) {
    var t = pi(e);
    return (t.local ? Wh : Hh)(t);
  }
  function qh() {
  }
  function Os(e) {
    return e == null ? qh : function() {
      return this.querySelector(e);
    };
  }
  function Kh(e) {
    typeof e != "function" && (e = Os(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var s = t[i], o = s.length, a = r[i] = new Array(o), l, c, u = 0; u < o; ++u) (l = s[u]) && (c = e.call(l, l.__data__, u, s)) && ("__data__" in l && (c.__data__ = l.__data__), a[u] = c);
    return new Ve(r, this._parents);
  }
  function jh(e) {
    return e == null ? [] : Array.isArray(e) ? e : Array.from(e);
  }
  function Xh() {
    return [];
  }
  function Il(e) {
    return e == null ? Xh : function() {
      return this.querySelectorAll(e);
    };
  }
  function Yh(e) {
    return function() {
      return jh(e.apply(this, arguments));
    };
  }
  function Zh(e) {
    typeof e == "function" ? e = Yh(e) : e = Il(e);
    for (var t = this._groups, n = t.length, r = [], i = [], s = 0; s < n; ++s) for (var o = t[s], a = o.length, l, c = 0; c < a; ++c) (l = o[c]) && (r.push(e.call(l, l.__data__, c, o)), i.push(l));
    return new Ve(r, i);
  }
  function Ol(e) {
    return function() {
      return this.matches(e);
    };
  }
  function $l(e) {
    return function(t) {
      return t.matches(e);
    };
  }
  var Jh = Array.prototype.find;
  function Qh(e) {
    return function() {
      return Jh.call(this.children, e);
    };
  }
  function ep() {
    return this.firstElementChild;
  }
  function tp(e) {
    return this.select(e == null ? ep : Qh(typeof e == "function" ? e : $l(e)));
  }
  var np = Array.prototype.filter;
  function rp() {
    return Array.from(this.children);
  }
  function ip(e) {
    return function() {
      return np.call(this.children, e);
    };
  }
  function sp(e) {
    return this.selectAll(e == null ? rp : ip(typeof e == "function" ? e : $l(e)));
  }
  function op(e) {
    typeof e != "function" && (e = Ol(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var s = t[i], o = s.length, a = r[i] = [], l, c = 0; c < o; ++c) (l = s[c]) && e.call(l, l.__data__, c, s) && a.push(l);
    return new Ve(r, this._parents);
  }
  function Bl(e) {
    return new Array(e.length);
  }
  function ap() {
    return new Ve(this._enter || this._groups.map(Bl), this._parents);
  }
  function qr(e, t) {
    this.ownerDocument = e.ownerDocument, this.namespaceURI = e.namespaceURI, this._next = null, this._parent = e, this.__data__ = t;
  }
  qr.prototype = {
    constructor: qr,
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
  function lp(e) {
    return function() {
      return e;
    };
  }
  function up(e, t, n, r, i, s) {
    for (var o = 0, a, l = t.length, c = s.length; o < c; ++o) (a = t[o]) ? (a.__data__ = s[o], r[o] = a) : n[o] = new qr(e, s[o]);
    for (; o < l; ++o) (a = t[o]) && (i[o] = a);
  }
  function cp(e, t, n, r, i, s, o) {
    var a, l, c = /* @__PURE__ */ new Map(), u = t.length, f = s.length, h = new Array(u), d;
    for (a = 0; a < u; ++a) (l = t[a]) && (h[a] = d = o.call(l, l.__data__, a, t) + "", c.has(d) ? i[a] = l : c.set(d, l));
    for (a = 0; a < f; ++a) d = o.call(e, s[a], a, s) + "", (l = c.get(d)) ? (r[a] = l, l.__data__ = s[a], c.delete(d)) : n[a] = new qr(e, s[a]);
    for (a = 0; a < u; ++a) (l = t[a]) && c.get(h[a]) === l && (i[a] = l);
  }
  function fp(e) {
    return e.__data__;
  }
  function dp(e, t) {
    if (!arguments.length) return Array.from(this, fp);
    var n = t ? cp : up, r = this._parents, i = this._groups;
    typeof e != "function" && (e = lp(e));
    for (var s = i.length, o = new Array(s), a = new Array(s), l = new Array(s), c = 0; c < s; ++c) {
      var u = r[c], f = i[c], h = f.length, d = hp(e.call(u, u && u.__data__, c, r)), g = d.length, _ = a[c] = new Array(g), $ = o[c] = new Array(g), G = l[c] = new Array(h);
      n(u, f, _, $, G, d, t);
      for (var O = 0, U = 0, b, S; O < g; ++O) if (b = _[O]) {
        for (O >= U && (U = O + 1); !(S = $[U]) && ++U < g; ) ;
        b._next = S || null;
      }
    }
    return o = new Ve(o, r), o._enter = a, o._exit = l, o;
  }
  function hp(e) {
    return typeof e == "object" && "length" in e ? e : Array.from(e);
  }
  function pp() {
    return new Ve(this._exit || this._groups.map(Bl), this._parents);
  }
  function gp(e, t, n) {
    var r = this.enter(), i = this, s = this.exit();
    return typeof e == "function" ? (r = e(r), r && (r = r.selection())) : r = r.append(e + ""), t != null && (i = t(i), i && (i = i.selection())), n == null ? s.remove() : n(s), r && i ? r.merge(i).order() : i;
  }
  function mp(e) {
    for (var t = e.selection ? e.selection() : e, n = this._groups, r = t._groups, i = n.length, s = r.length, o = Math.min(i, s), a = new Array(i), l = 0; l < o; ++l) for (var c = n[l], u = r[l], f = c.length, h = a[l] = new Array(f), d, g = 0; g < f; ++g) (d = c[g] || u[g]) && (h[g] = d);
    for (; l < i; ++l) a[l] = n[l];
    return new Ve(a, this._parents);
  }
  function vp() {
    for (var e = this._groups, t = -1, n = e.length; ++t < n; ) for (var r = e[t], i = r.length - 1, s = r[i], o; --i >= 0; ) (o = r[i]) && (s && o.compareDocumentPosition(s) ^ 4 && s.parentNode.insertBefore(o, s), s = o);
    return this;
  }
  function _p(e) {
    e || (e = bp);
    function t(f, h) {
      return f && h ? e(f.__data__, h.__data__) : !f - !h;
    }
    for (var n = this._groups, r = n.length, i = new Array(r), s = 0; s < r; ++s) {
      for (var o = n[s], a = o.length, l = i[s] = new Array(a), c, u = 0; u < a; ++u) (c = o[u]) && (l[u] = c);
      l.sort(t);
    }
    return new Ve(i, this._parents).order();
  }
  function bp(e, t) {
    return e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
  }
  function yp() {
    var e = arguments[0];
    return arguments[0] = this, e.apply(null, arguments), this;
  }
  function wp() {
    return Array.from(this);
  }
  function xp() {
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, s = r.length; i < s; ++i) {
      var o = r[i];
      if (o) return o;
    }
    return null;
  }
  function Sp() {
    let e = 0;
    for (const t of this) ++e;
    return e;
  }
  function Tp() {
    return !this.node();
  }
  function Mp(e) {
    for (var t = this._groups, n = 0, r = t.length; n < r; ++n) for (var i = t[n], s = 0, o = i.length, a; s < o; ++s) (a = i[s]) && e.call(a, a.__data__, s, i);
    return this;
  }
  function Ep(e) {
    return function() {
      this.removeAttribute(e);
    };
  }
  function Cp(e) {
    return function() {
      this.removeAttributeNS(e.space, e.local);
    };
  }
  function kp(e, t) {
    return function() {
      this.setAttribute(e, t);
    };
  }
  function Pp(e, t) {
    return function() {
      this.setAttributeNS(e.space, e.local, t);
    };
  }
  function Ap(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? this.removeAttribute(e) : this.setAttribute(e, n);
    };
  }
  function Rp(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n);
    };
  }
  function Lp(e, t) {
    var n = pi(e);
    if (arguments.length < 2) {
      var r = this.node();
      return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n);
    }
    return this.each((t == null ? n.local ? Cp : Ep : typeof t == "function" ? n.local ? Rp : Ap : n.local ? Pp : kp)(n, t));
  }
  function Dl(e) {
    return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView;
  }
  function Np(e) {
    return function() {
      this.style.removeProperty(e);
    };
  }
  function Ip(e, t, n) {
    return function() {
      this.style.setProperty(e, t, n);
    };
  }
  function Op(e, t, n) {
    return function() {
      var r = t.apply(this, arguments);
      r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n);
    };
  }
  function $p(e, t, n) {
    return arguments.length > 1 ? this.each((t == null ? Np : typeof t == "function" ? Op : Ip)(e, t, n ?? "")) : _n(this.node(), e);
  }
  function _n(e, t) {
    return e.style.getPropertyValue(t) || Dl(e).getComputedStyle(e, null).getPropertyValue(t);
  }
  function Bp(e) {
    return function() {
      delete this[e];
    };
  }
  function Dp(e, t) {
    return function() {
      this[e] = t;
    };
  }
  function Up(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? delete this[e] : this[e] = n;
    };
  }
  function Fp(e, t) {
    return arguments.length > 1 ? this.each((t == null ? Bp : typeof t == "function" ? Up : Dp)(e, t)) : this.node()[e];
  }
  function Ul(e) {
    return e.trim().split(/^|\s+/);
  }
  function $s(e) {
    return e.classList || new Fl(e);
  }
  function Fl(e) {
    this._node = e, this._names = Ul(e.getAttribute("class") || "");
  }
  Fl.prototype = {
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
  function Vl(e, t) {
    for (var n = $s(e), r = -1, i = t.length; ++r < i; ) n.add(t[r]);
  }
  function zl(e, t) {
    for (var n = $s(e), r = -1, i = t.length; ++r < i; ) n.remove(t[r]);
  }
  function Vp(e) {
    return function() {
      Vl(this, e);
    };
  }
  function zp(e) {
    return function() {
      zl(this, e);
    };
  }
  function Gp(e, t) {
    return function() {
      (t.apply(this, arguments) ? Vl : zl)(this, e);
    };
  }
  function Hp(e, t) {
    var n = Ul(e + "");
    if (arguments.length < 2) {
      for (var r = $s(this.node()), i = -1, s = n.length; ++i < s; ) if (!r.contains(n[i])) return false;
      return true;
    }
    return this.each((typeof t == "function" ? Gp : t ? Vp : zp)(n, t));
  }
  function Wp() {
    this.textContent = "";
  }
  function qp(e) {
    return function() {
      this.textContent = e;
    };
  }
  function Kp(e) {
    return function() {
      var t = e.apply(this, arguments);
      this.textContent = t ?? "";
    };
  }
  function jp(e) {
    return arguments.length ? this.each(e == null ? Wp : (typeof e == "function" ? Kp : qp)(e)) : this.node().textContent;
  }
  function Xp() {
    this.innerHTML = "";
  }
  function Yp(e) {
    return function() {
      this.innerHTML = e;
    };
  }
  function Zp(e) {
    return function() {
      var t = e.apply(this, arguments);
      this.innerHTML = t ?? "";
    };
  }
  function Jp(e) {
    return arguments.length ? this.each(e == null ? Xp : (typeof e == "function" ? Zp : Yp)(e)) : this.node().innerHTML;
  }
  function Qp() {
    this.nextSibling && this.parentNode.appendChild(this);
  }
  function eg() {
    return this.each(Qp);
  }
  function tg() {
    this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }
  function ng() {
    return this.each(tg);
  }
  function rg(e) {
    var t = typeof e == "function" ? e : Is(e);
    return this.select(function() {
      return this.appendChild(t.apply(this, arguments));
    });
  }
  function ig() {
    return null;
  }
  function sg(e, t) {
    var n = typeof e == "function" ? e : Is(e), r = t == null ? ig : typeof t == "function" ? t : Os(t);
    return this.select(function() {
      return this.insertBefore(n.apply(this, arguments), r.apply(this, arguments) || null);
    });
  }
  function og() {
    var e = this.parentNode;
    e && e.removeChild(this);
  }
  function ag() {
    return this.each(og);
  }
  function lg() {
    var e = this.cloneNode(false), t = this.parentNode;
    return t ? t.insertBefore(e, this.nextSibling) : e;
  }
  function ug() {
    var e = this.cloneNode(true), t = this.parentNode;
    return t ? t.insertBefore(e, this.nextSibling) : e;
  }
  function cg(e) {
    return this.select(e ? ug : lg);
  }
  function fg(e) {
    return arguments.length ? this.property("__data__", e) : this.node().__data__;
  }
  function dg(e) {
    return function(t) {
      e.call(this, t, this.__data__);
    };
  }
  function hg(e) {
    return e.trim().split(/^|\s+/).map(function(t) {
      var n = "", r = t.indexOf(".");
      return r >= 0 && (n = t.slice(r + 1), t = t.slice(0, r)), {
        type: t,
        name: n
      };
    });
  }
  function pg(e) {
    return function() {
      var t = this.__on;
      if (t) {
        for (var n = 0, r = -1, i = t.length, s; n < i; ++n) s = t[n], (!e.type || s.type === e.type) && s.name === e.name ? this.removeEventListener(s.type, s.listener, s.options) : t[++r] = s;
        ++r ? t.length = r : delete this.__on;
      }
    };
  }
  function gg(e, t, n) {
    return function() {
      var r = this.__on, i, s = dg(t);
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
  function mg(e, t, n) {
    var r = hg(e + ""), i, s = r.length, o;
    if (arguments.length < 2) {
      var a = this.node().__on;
      if (a) {
        for (var l = 0, c = a.length, u; l < c; ++l) for (i = 0, u = a[l]; i < s; ++i) if ((o = r[i]).type === u.type && o.name === u.name) return u.value;
      }
      return;
    }
    for (a = t ? gg : pg, i = 0; i < s; ++i) this.each(a(r[i], t, n));
    return this;
  }
  function Gl(e, t, n) {
    var r = Dl(e), i = r.CustomEvent;
    typeof i == "function" ? i = new i(t, n) : (i = r.document.createEvent("Event"), n ? (i.initEvent(t, n.bubbles, n.cancelable), i.detail = n.detail) : i.initEvent(t, false, false)), e.dispatchEvent(i);
  }
  function vg(e, t) {
    return function() {
      return Gl(this, e, t);
    };
  }
  function _g(e, t) {
    return function() {
      return Gl(this, e, t.apply(this, arguments));
    };
  }
  function bg(e, t) {
    return this.each((typeof t == "function" ? _g : vg)(e, t));
  }
  function* yg() {
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, s = r.length, o; i < s; ++i) (o = r[i]) && (yield o);
  }
  var Hl = [
    null
  ];
  function Ve(e, t) {
    this._groups = e, this._parents = t;
  }
  function or() {
    return new Ve([
      [
        document.documentElement
      ]
    ], Hl);
  }
  function wg() {
    return this;
  }
  Ve.prototype = or.prototype = {
    constructor: Ve,
    select: Kh,
    selectAll: Zh,
    selectChild: tp,
    selectChildren: sp,
    filter: op,
    data: dp,
    enter: ap,
    exit: pp,
    join: gp,
    merge: mp,
    selection: wg,
    order: vp,
    sort: _p,
    call: yp,
    nodes: wp,
    node: xp,
    size: Sp,
    empty: Tp,
    each: Mp,
    attr: Lp,
    style: $p,
    property: Fp,
    classed: Hp,
    text: jp,
    html: Jp,
    raise: eg,
    lower: ng,
    append: rg,
    insert: sg,
    remove: ag,
    clone: cg,
    datum: fg,
    on: mg,
    dispatch: bg,
    [Symbol.iterator]: yg
  };
  function Zt(e) {
    return typeof e == "string" ? new Ve([
      [
        document.querySelector(e)
      ]
    ], [
      document.documentElement
    ]) : new Ve([
      [
        e
      ]
    ], Hl);
  }
  function xg(e) {
    return Zt(Is(e).call(document.documentElement));
  }
  var Sg = 0;
  function Wl() {
    return new ss();
  }
  function ss() {
    this._ = "@" + (++Sg).toString(36);
  }
  ss.prototype = Wl.prototype = {
    constructor: ss,
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
  function Tg(e) {
    let t;
    for (; t = e.sourceEvent; ) e = t;
    return e;
  }
  function Wo(e, t) {
    if (e = Tg(e), t === void 0 && (t = e.currentTarget), t) {
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
  const Mg = {
    passive: false
  }, Zn = {
    capture: true,
    passive: false
  };
  function $i(e) {
    e.stopImmediatePropagation();
  }
  function mn(e) {
    e.preventDefault(), e.stopImmediatePropagation();
  }
  function Eg(e) {
    var t = e.document.documentElement, n = Zt(e).on("dragstart.drag", mn, Zn);
    "onselectstart" in t ? n.on("selectstart.drag", mn, Zn) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = "none");
  }
  function Cg(e, t) {
    var n = e.document.documentElement, r = Zt(e).on("dragstart.drag", null);
    t && (r.on("click.drag", mn, Zn), setTimeout(function() {
      r.on("click.drag", null);
    }, 0)), "onselectstart" in n ? r.on("selectstart.drag", null) : (n.style.MozUserSelect = n.__noselect, delete n.__noselect);
  }
  const mr = (e) => () => e;
  function os(e, { sourceEvent: t, subject: n, target: r, identifier: i, active: s, x: o, y: a, dx: l, dy: c, dispatch: u }) {
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
        value: c,
        enumerable: true,
        configurable: true
      },
      _: {
        value: u
      }
    });
  }
  os.prototype.on = function() {
    var e = this._.on.apply(this._, arguments);
    return e === this._ ? this : e;
  };
  function kg(e) {
    return !e.ctrlKey && !e.button;
  }
  function Pg() {
    return this.parentNode;
  }
  function Ag(e, t) {
    return t ?? {
      x: e.x,
      y: e.y
    };
  }
  function Rg() {
    return navigator.maxTouchPoints || "ontouchstart" in this;
  }
  function Lg() {
    var e = kg, t = Pg, n = Ag, r = Rg, i = {}, s = Ns("start", "drag", "end"), o = 0, a, l, c, u, f = 0;
    function h(b) {
      b.on("mousedown.drag", d).filter(r).on("touchstart.drag", $).on("touchmove.drag", G, Mg).on("touchend.drag touchcancel.drag", O).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }
    function d(b, S) {
      if (!(u || !e.call(this, b, S))) {
        var A = U(this, t.call(this, b, S), b, S, "mouse");
        A && (Zt(b.view).on("mousemove.drag", g, Zn).on("mouseup.drag", _, Zn), Eg(b.view), $i(b), c = false, a = b.clientX, l = b.clientY, A("start", b));
      }
    }
    function g(b) {
      if (mn(b), !c) {
        var S = b.clientX - a, A = b.clientY - l;
        c = S * S + A * A > f;
      }
      i.mouse("drag", b);
    }
    function _(b) {
      Zt(b.view).on("mousemove.drag mouseup.drag", null), Cg(b.view, c), mn(b), i.mouse("end", b);
    }
    function $(b, S) {
      if (e.call(this, b, S)) {
        var A = b.changedTouches, H = t.call(this, b, S), X = A.length, B, V;
        for (B = 0; B < X; ++B) (V = U(this, H, b, S, A[B].identifier, A[B])) && ($i(b), V("start", b, A[B]));
      }
    }
    function G(b) {
      var S = b.changedTouches, A = S.length, H, X;
      for (H = 0; H < A; ++H) (X = i[S[H].identifier]) && (mn(b), X("drag", b, S[H]));
    }
    function O(b) {
      var S = b.changedTouches, A = S.length, H, X;
      for (u && clearTimeout(u), u = setTimeout(function() {
        u = null;
      }, 500), H = 0; H < A; ++H) (X = i[S[H].identifier]) && ($i(b), X("end", b, S[H]));
    }
    function U(b, S, A, H, X, B) {
      var V = s.copy(), W = Wo(B || A, S), x, q, ee;
      if ((ee = n.call(b, new os("beforestart", {
        sourceEvent: A,
        target: h,
        identifier: X,
        active: o,
        x: W[0],
        y: W[1],
        dx: 0,
        dy: 0,
        dispatch: V
      }), H)) != null) return x = ee.x - W[0] || 0, q = ee.y - W[1] || 0, function ge(N, R, z) {
        var te = W, P;
        switch (N) {
          case "start":
            i[X] = ge, P = o++;
            break;
          case "end":
            delete i[X], --o;
          case "drag":
            W = Wo(z || R, S), P = o;
            break;
        }
        V.call(N, b, new os(N, {
          sourceEvent: R,
          subject: ee,
          target: h,
          identifier: X,
          active: P,
          x: W[0] + x,
          y: W[1] + q,
          dx: W[0] - te[0],
          dy: W[1] - te[1],
          dispatch: V
        }), H);
      };
    }
    return h.filter = function(b) {
      return arguments.length ? (e = typeof b == "function" ? b : mr(!!b), h) : e;
    }, h.container = function(b) {
      return arguments.length ? (t = typeof b == "function" ? b : mr(b), h) : t;
    }, h.subject = function(b) {
      return arguments.length ? (n = typeof b == "function" ? b : mr(b), h) : n;
    }, h.touchable = function(b) {
      return arguments.length ? (r = typeof b == "function" ? b : mr(!!b), h) : r;
    }, h.on = function() {
      var b = s.on.apply(s, arguments);
      return b === s ? h : b;
    }, h.clickDistance = function(b) {
      return arguments.length ? (f = (b = +b) * b, h) : Math.sqrt(f);
    }, h;
  }
  var bn = 0, An = 0, kn = 0, ql = 1e3, Kr, Rn, jr = 0, Jt = 0, gi = 0, Jn = typeof performance == "object" && performance.now ? performance : Date, Kl = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(e) {
    setTimeout(e, 17);
  };
  function Bs() {
    return Jt || (Kl(Ng), Jt = Jn.now() + gi);
  }
  function Ng() {
    Jt = 0;
  }
  function Xr() {
    this._call = this._time = this._next = null;
  }
  Xr.prototype = jl.prototype = {
    constructor: Xr,
    restart: function(e, t, n) {
      if (typeof e != "function") throw new TypeError("callback is not a function");
      n = (n == null ? Bs() : +n) + (t == null ? 0 : +t), !this._next && Rn !== this && (Rn ? Rn._next = this : Kr = this, Rn = this), this._call = e, this._time = n, as();
    },
    stop: function() {
      this._call && (this._call = null, this._time = 1 / 0, as());
    }
  };
  function jl(e, t, n) {
    var r = new Xr();
    return r.restart(e, t, n), r;
  }
  function Ig() {
    Bs(), ++bn;
    for (var e = Kr, t; e; ) (t = Jt - e._time) >= 0 && e._call.call(void 0, t), e = e._next;
    --bn;
  }
  function qo() {
    Jt = (jr = Jn.now()) + gi, bn = An = 0;
    try {
      Ig();
    } finally {
      bn = 0, $g(), Jt = 0;
    }
  }
  function Og() {
    var e = Jn.now(), t = e - jr;
    t > ql && (gi -= t, jr = e);
  }
  function $g() {
    for (var e, t = Kr, n, r = 1 / 0; t; ) t._call ? (r > t._time && (r = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : Kr = n);
    Rn = e, as(r);
  }
  function as(e) {
    if (!bn) {
      An && (An = clearTimeout(An));
      var t = e - Jt;
      t > 24 ? (e < 1 / 0 && (An = setTimeout(qo, e - Jn.now() - gi)), kn && (kn = clearInterval(kn))) : (kn || (jr = Jn.now(), kn = setInterval(Og, ql)), bn = 1, Kl(qo));
    }
  }
  function Ko(e, t, n) {
    var r = new Xr();
    return t = t == null ? 0 : +t, r.restart((i) => {
      r.stop(), e(i + t);
    }, t, n), r;
  }
  var Bg = Ns("start", "end", "cancel", "interrupt"), Dg = [], Xl = 0, jo = 1, ls = 2, Cr = 3, Xo = 4, us = 5, kr = 6;
  function mi(e, t, n, r, i, s) {
    var o = e.__transition;
    if (!o) e.__transition = {};
    else if (n in o) return;
    Ug(e, n, {
      name: t,
      index: r,
      group: i,
      on: Bg,
      tween: Dg,
      time: s.time,
      delay: s.delay,
      duration: s.duration,
      ease: s.ease,
      timer: null,
      state: Xl
    });
  }
  function Ds(e, t) {
    var n = Ze(e, t);
    if (n.state > Xl) throw new Error("too late; already scheduled");
    return n;
  }
  function dt(e, t) {
    var n = Ze(e, t);
    if (n.state > Cr) throw new Error("too late; already running");
    return n;
  }
  function Ze(e, t) {
    var n = e.__transition;
    if (!n || !(n = n[t])) throw new Error("transition not found");
    return n;
  }
  function Ug(e, t, n) {
    var r = e.__transition, i;
    r[t] = n, n.timer = jl(s, 0, n.time);
    function s(c) {
      n.state = jo, n.timer.restart(o, n.delay, n.time), n.delay <= c && o(c - n.delay);
    }
    function o(c) {
      var u, f, h, d;
      if (n.state !== jo) return l();
      for (u in r) if (d = r[u], d.name === n.name) {
        if (d.state === Cr) return Ko(o);
        d.state === Xo ? (d.state = kr, d.timer.stop(), d.on.call("interrupt", e, e.__data__, d.index, d.group), delete r[u]) : +u < t && (d.state = kr, d.timer.stop(), d.on.call("cancel", e, e.__data__, d.index, d.group), delete r[u]);
      }
      if (Ko(function() {
        n.state === Cr && (n.state = Xo, n.timer.restart(a, n.delay, n.time), a(c));
      }), n.state = ls, n.on.call("start", e, e.__data__, n.index, n.group), n.state === ls) {
        for (n.state = Cr, i = new Array(h = n.tween.length), u = 0, f = -1; u < h; ++u) (d = n.tween[u].value.call(e, e.__data__, n.index, n.group)) && (i[++f] = d);
        i.length = f + 1;
      }
    }
    function a(c) {
      for (var u = c < n.duration ? n.ease.call(null, c / n.duration) : (n.timer.restart(l), n.state = us, 1), f = -1, h = i.length; ++f < h; ) i[f].call(e, u);
      n.state === us && (n.on.call("end", e, e.__data__, n.index, n.group), l());
    }
    function l() {
      n.state = kr, n.timer.stop(), delete r[t];
      for (var c in r) return;
      delete e.__transition;
    }
  }
  function Fg(e, t) {
    var n = e.__transition, r, i, s = true, o;
    if (n) {
      t = t == null ? null : t + "";
      for (o in n) {
        if ((r = n[o]).name !== t) {
          s = false;
          continue;
        }
        i = r.state > ls && r.state < us, r.state = kr, r.timer.stop(), r.on.call(i ? "interrupt" : "cancel", e, e.__data__, r.index, r.group), delete n[o];
      }
      s && delete e.__transition;
    }
  }
  function Vg(e) {
    return this.each(function() {
      Fg(this, e);
    });
  }
  function zg(e, t) {
    var n, r;
    return function() {
      var i = dt(this, e), s = i.tween;
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
  function Gg(e, t, n) {
    var r, i;
    if (typeof n != "function") throw new Error();
    return function() {
      var s = dt(this, e), o = s.tween;
      if (o !== r) {
        i = (r = o).slice();
        for (var a = {
          name: t,
          value: n
        }, l = 0, c = i.length; l < c; ++l) if (i[l].name === t) {
          i[l] = a;
          break;
        }
        l === c && i.push(a);
      }
      s.tween = i;
    };
  }
  function Hg(e, t) {
    var n = this._id;
    if (e += "", arguments.length < 2) {
      for (var r = Ze(this.node(), n).tween, i = 0, s = r.length, o; i < s; ++i) if ((o = r[i]).name === e) return o.value;
      return null;
    }
    return this.each((t == null ? zg : Gg)(n, e, t));
  }
  function Us(e, t, n) {
    var r = e._id;
    return e.each(function() {
      var i = dt(this, r);
      (i.value || (i.value = {}))[t] = n.apply(this, arguments);
    }), function(i) {
      return Ze(i, r).value[t];
    };
  }
  function Yl(e, t) {
    var n;
    return (typeof t == "number" ? qe : t instanceof Yt ? Gr : (n = Yt(t)) ? (t = n, Gr) : Al)(e, t);
  }
  function Wg(e) {
    return function() {
      this.removeAttribute(e);
    };
  }
  function qg(e) {
    return function() {
      this.removeAttributeNS(e.space, e.local);
    };
  }
  function Kg(e, t, n) {
    var r, i = n + "", s;
    return function() {
      var o = this.getAttribute(e);
      return o === i ? null : o === r ? s : s = t(r = o, n);
    };
  }
  function jg(e, t, n) {
    var r, i = n + "", s;
    return function() {
      var o = this.getAttributeNS(e.space, e.local);
      return o === i ? null : o === r ? s : s = t(r = o, n);
    };
  }
  function Xg(e, t, n) {
    var r, i, s;
    return function() {
      var o, a = n(this), l;
      return a == null ? void this.removeAttribute(e) : (o = this.getAttribute(e), l = a + "", o === l ? null : o === r && l === i ? s : (i = l, s = t(r = o, a)));
    };
  }
  function Yg(e, t, n) {
    var r, i, s;
    return function() {
      var o, a = n(this), l;
      return a == null ? void this.removeAttributeNS(e.space, e.local) : (o = this.getAttributeNS(e.space, e.local), l = a + "", o === l ? null : o === r && l === i ? s : (i = l, s = t(r = o, a)));
    };
  }
  function Zg(e, t) {
    var n = pi(e), r = n === "transform" ? uh : Yl;
    return this.attrTween(e, typeof t == "function" ? (n.local ? Yg : Xg)(n, r, Us(this, "attr." + e, t)) : t == null ? (n.local ? qg : Wg)(n) : (n.local ? jg : Kg)(n, r, t));
  }
  function Jg(e, t) {
    return function(n) {
      this.setAttribute(e, t.call(this, n));
    };
  }
  function Qg(e, t) {
    return function(n) {
      this.setAttributeNS(e.space, e.local, t.call(this, n));
    };
  }
  function em(e, t) {
    var n, r;
    function i() {
      var s = t.apply(this, arguments);
      return s !== r && (n = (r = s) && Qg(e, s)), n;
    }
    return i._value = t, i;
  }
  function tm(e, t) {
    var n, r;
    function i() {
      var s = t.apply(this, arguments);
      return s !== r && (n = (r = s) && Jg(e, s)), n;
    }
    return i._value = t, i;
  }
  function nm(e, t) {
    var n = "attr." + e;
    if (arguments.length < 2) return (n = this.tween(n)) && n._value;
    if (t == null) return this.tween(n, null);
    if (typeof t != "function") throw new Error();
    var r = pi(e);
    return this.tween(n, (r.local ? em : tm)(r, t));
  }
  function rm(e, t) {
    return function() {
      Ds(this, e).delay = +t.apply(this, arguments);
    };
  }
  function im(e, t) {
    return t = +t, function() {
      Ds(this, e).delay = t;
    };
  }
  function sm(e) {
    var t = this._id;
    return arguments.length ? this.each((typeof e == "function" ? rm : im)(t, e)) : Ze(this.node(), t).delay;
  }
  function om(e, t) {
    return function() {
      dt(this, e).duration = +t.apply(this, arguments);
    };
  }
  function am(e, t) {
    return t = +t, function() {
      dt(this, e).duration = t;
    };
  }
  function lm(e) {
    var t = this._id;
    return arguments.length ? this.each((typeof e == "function" ? om : am)(t, e)) : Ze(this.node(), t).duration;
  }
  function um(e, t) {
    if (typeof t != "function") throw new Error();
    return function() {
      dt(this, e).ease = t;
    };
  }
  function cm(e) {
    var t = this._id;
    return arguments.length ? this.each(um(t, e)) : Ze(this.node(), t).ease;
  }
  function fm(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      if (typeof n != "function") throw new Error();
      dt(this, e).ease = n;
    };
  }
  function dm(e) {
    if (typeof e != "function") throw new Error();
    return this.each(fm(this._id, e));
  }
  function hm(e) {
    typeof e != "function" && (e = Ol(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var s = t[i], o = s.length, a = r[i] = [], l, c = 0; c < o; ++c) (l = s[c]) && e.call(l, l.__data__, c, s) && a.push(l);
    return new Et(r, this._parents, this._name, this._id);
  }
  function pm(e) {
    if (e._id !== this._id) throw new Error();
    for (var t = this._groups, n = e._groups, r = t.length, i = n.length, s = Math.min(r, i), o = new Array(r), a = 0; a < s; ++a) for (var l = t[a], c = n[a], u = l.length, f = o[a] = new Array(u), h, d = 0; d < u; ++d) (h = l[d] || c[d]) && (f[d] = h);
    for (; a < r; ++a) o[a] = t[a];
    return new Et(o, this._parents, this._name, this._id);
  }
  function gm(e) {
    return (e + "").trim().split(/^|\s+/).every(function(t) {
      var n = t.indexOf(".");
      return n >= 0 && (t = t.slice(0, n)), !t || t === "start";
    });
  }
  function mm(e, t, n) {
    var r, i, s = gm(t) ? Ds : dt;
    return function() {
      var o = s(this, e), a = o.on;
      a !== r && (i = (r = a).copy()).on(t, n), o.on = i;
    };
  }
  function vm(e, t) {
    var n = this._id;
    return arguments.length < 2 ? Ze(this.node(), n).on.on(e) : this.each(mm(n, e, t));
  }
  function _m(e) {
    return function() {
      var t = this.parentNode;
      for (var n in this.__transition) if (+n !== e) return;
      t && t.removeChild(this);
    };
  }
  function bm() {
    return this.on("end.remove", _m(this._id));
  }
  function ym(e) {
    var t = this._name, n = this._id;
    typeof e != "function" && (e = Os(e));
    for (var r = this._groups, i = r.length, s = new Array(i), o = 0; o < i; ++o) for (var a = r[o], l = a.length, c = s[o] = new Array(l), u, f, h = 0; h < l; ++h) (u = a[h]) && (f = e.call(u, u.__data__, h, a)) && ("__data__" in u && (f.__data__ = u.__data__), c[h] = f, mi(c[h], t, n, h, c, Ze(u, n)));
    return new Et(s, this._parents, t, n);
  }
  function wm(e) {
    var t = this._name, n = this._id;
    typeof e != "function" && (e = Il(e));
    for (var r = this._groups, i = r.length, s = [], o = [], a = 0; a < i; ++a) for (var l = r[a], c = l.length, u, f = 0; f < c; ++f) if (u = l[f]) {
      for (var h = e.call(u, u.__data__, f, l), d, g = Ze(u, n), _ = 0, $ = h.length; _ < $; ++_) (d = h[_]) && mi(d, t, n, _, h, g);
      s.push(h), o.push(u);
    }
    return new Et(s, o, t, n);
  }
  var xm = or.prototype.constructor;
  function Sm() {
    return new xm(this._groups, this._parents);
  }
  function Tm(e, t) {
    var n, r, i;
    return function() {
      var s = _n(this, e), o = (this.style.removeProperty(e), _n(this, e));
      return s === o ? null : s === n && o === r ? i : i = t(n = s, r = o);
    };
  }
  function Zl(e) {
    return function() {
      this.style.removeProperty(e);
    };
  }
  function Mm(e, t, n) {
    var r, i = n + "", s;
    return function() {
      var o = _n(this, e);
      return o === i ? null : o === r ? s : s = t(r = o, n);
    };
  }
  function Em(e, t, n) {
    var r, i, s;
    return function() {
      var o = _n(this, e), a = n(this), l = a + "";
      return a == null && (l = a = (this.style.removeProperty(e), _n(this, e))), o === l ? null : o === r && l === i ? s : (i = l, s = t(r = o, a));
    };
  }
  function Cm(e, t) {
    var n, r, i, s = "style." + t, o = "end." + s, a;
    return function() {
      var l = dt(this, e), c = l.on, u = l.value[s] == null ? a || (a = Zl(t)) : void 0;
      (c !== n || i !== u) && (r = (n = c).copy()).on(o, i = u), l.on = r;
    };
  }
  function km(e, t, n) {
    var r = (e += "") == "transform" ? lh : Yl;
    return t == null ? this.styleTween(e, Tm(e, r)).on("end.style." + e, Zl(e)) : typeof t == "function" ? this.styleTween(e, Em(e, r, Us(this, "style." + e, t))).each(Cm(this._id, e)) : this.styleTween(e, Mm(e, r, t), n).on("end.style." + e, null);
  }
  function Pm(e, t, n) {
    return function(r) {
      this.style.setProperty(e, t.call(this, r), n);
    };
  }
  function Am(e, t, n) {
    var r, i;
    function s() {
      var o = t.apply(this, arguments);
      return o !== i && (r = (i = o) && Pm(e, o, n)), r;
    }
    return s._value = t, s;
  }
  function Rm(e, t, n) {
    var r = "style." + (e += "");
    if (arguments.length < 2) return (r = this.tween(r)) && r._value;
    if (t == null) return this.tween(r, null);
    if (typeof t != "function") throw new Error();
    return this.tween(r, Am(e, t, n ?? ""));
  }
  function Lm(e) {
    return function() {
      this.textContent = e;
    };
  }
  function Nm(e) {
    return function() {
      var t = e(this);
      this.textContent = t ?? "";
    };
  }
  function Im(e) {
    return this.tween("text", typeof e == "function" ? Nm(Us(this, "text", e)) : Lm(e == null ? "" : e + ""));
  }
  function Om(e) {
    return function(t) {
      this.textContent = e.call(this, t);
    };
  }
  function $m(e) {
    var t, n;
    function r() {
      var i = e.apply(this, arguments);
      return i !== n && (t = (n = i) && Om(i)), t;
    }
    return r._value = e, r;
  }
  function Bm(e) {
    var t = "text";
    if (arguments.length < 1) return (t = this.tween(t)) && t._value;
    if (e == null) return this.tween(t, null);
    if (typeof e != "function") throw new Error();
    return this.tween(t, $m(e));
  }
  function Dm() {
    for (var e = this._name, t = this._id, n = Jl(), r = this._groups, i = r.length, s = 0; s < i; ++s) for (var o = r[s], a = o.length, l, c = 0; c < a; ++c) if (l = o[c]) {
      var u = Ze(l, t);
      mi(l, e, n, c, o, {
        time: u.time + u.delay + u.duration,
        delay: 0,
        duration: u.duration,
        ease: u.ease
      });
    }
    return new Et(r, this._parents, e, n);
  }
  function Um() {
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
        var c = dt(this, r), u = c.on;
        u !== e && (t = (e = u).copy(), t._.cancel.push(a), t._.interrupt.push(a), t._.end.push(l)), c.on = t;
      }), i === 0 && s();
    });
  }
  var Fm = 0;
  function Et(e, t, n, r) {
    this._groups = e, this._parents = t, this._name = n, this._id = r;
  }
  function Jl() {
    return ++Fm;
  }
  var mt = or.prototype;
  Et.prototype = {
    constructor: Et,
    select: ym,
    selectAll: wm,
    selectChild: mt.selectChild,
    selectChildren: mt.selectChildren,
    filter: hm,
    merge: pm,
    selection: Sm,
    transition: Dm,
    call: mt.call,
    nodes: mt.nodes,
    node: mt.node,
    size: mt.size,
    empty: mt.empty,
    each: mt.each,
    on: vm,
    attr: Zg,
    attrTween: nm,
    style: km,
    styleTween: Rm,
    text: Im,
    textTween: Bm,
    remove: bm,
    tween: Hg,
    delay: sm,
    duration: lm,
    ease: cm,
    easeVarying: dm,
    end: Um,
    [Symbol.iterator]: mt[Symbol.iterator]
  };
  function Vm(e) {
    return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2;
  }
  var zm = {
    time: null,
    delay: 0,
    duration: 250,
    ease: Vm
  };
  function Gm(e, t) {
    for (var n; !(n = e.__transition) || !(n = n[t]); ) if (!(e = e.parentNode)) throw new Error(`transition ${t} not found`);
    return n;
  }
  function Hm(e) {
    var t, n;
    e instanceof Et ? (t = e._id, e = e._name) : (t = Jl(), (n = zm).time = Bs(), e = e == null ? null : e + "");
    for (var r = this._groups, i = r.length, s = 0; s < i; ++s) for (var o = r[s], a = o.length, l, c = 0; c < a; ++c) (l = o[c]) && mi(l, e, t, c, o, n || Gm(l, t));
    return new Et(r, this._parents, e, t);
  }
  or.prototype.interrupt = Vg;
  or.prototype.transition = Hm;
  function Wm(e) {
    return Math.abs(e = Math.round(e)) >= 1e21 ? e.toLocaleString("en").replace(/,/g, "") : e.toString(10);
  }
  function Yr(e, t) {
    if (!isFinite(e) || e === 0) return null;
    var n = (e = t ? e.toExponential(t - 1) : e.toExponential()).indexOf("e"), r = e.slice(0, n);
    return [
      r.length > 1 ? r[0] + r.slice(2) : r,
      +e.slice(n + 1)
    ];
  }
  function yn(e) {
    return e = Yr(Math.abs(e)), e ? e[1] : NaN;
  }
  function qm(e, t) {
    return function(n, r) {
      for (var i = n.length, s = [], o = 0, a = e[0], l = 0; i > 0 && a > 0 && (l + a + 1 > r && (a = Math.max(1, r - l)), s.push(n.substring(i -= a, i + a)), !((l += a + 1) > r)); ) a = e[o = (o + 1) % e.length];
      return s.reverse().join(t);
    };
  }
  function Km(e) {
    return function(t) {
      return t.replace(/[0-9]/g, function(n) {
        return e[+n];
      });
    };
  }
  var jm = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
  function Zr(e) {
    if (!(t = jm.exec(e))) throw new Error("invalid format: " + e);
    var t;
    return new Fs({
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
  Zr.prototype = Fs.prototype;
  function Fs(e) {
    this.fill = e.fill === void 0 ? " " : e.fill + "", this.align = e.align === void 0 ? ">" : e.align + "", this.sign = e.sign === void 0 ? "-" : e.sign + "", this.symbol = e.symbol === void 0 ? "" : e.symbol + "", this.zero = !!e.zero, this.width = e.width === void 0 ? void 0 : +e.width, this.comma = !!e.comma, this.precision = e.precision === void 0 ? void 0 : +e.precision, this.trim = !!e.trim, this.type = e.type === void 0 ? "" : e.type + "";
  }
  Fs.prototype.toString = function() {
    return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
  };
  function Xm(e) {
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
  var Jr;
  function Ym(e, t) {
    var n = Yr(e, t);
    if (!n) return Jr = void 0, e.toPrecision(t);
    var r = n[0], i = n[1], s = i - (Jr = Math.max(-8, Math.min(8, Math.floor(i / 3))) * 3) + 1, o = r.length;
    return s === o ? r : s > o ? r + new Array(s - o + 1).join("0") : s > 0 ? r.slice(0, s) + "." + r.slice(s) : "0." + new Array(1 - s).join("0") + Yr(e, Math.max(0, t + s - 1))[0];
  }
  function Yo(e, t) {
    var n = Yr(e, t);
    if (!n) return e + "";
    var r = n[0], i = n[1];
    return i < 0 ? "0." + new Array(-i).join("0") + r : r.length > i + 1 ? r.slice(0, i + 1) + "." + r.slice(i + 1) : r + new Array(i - r.length + 2).join("0");
  }
  const Zo = {
    "%": (e, t) => (e * 100).toFixed(t),
    b: (e) => Math.round(e).toString(2),
    c: (e) => e + "",
    d: Wm,
    e: (e, t) => e.toExponential(t),
    f: (e, t) => e.toFixed(t),
    g: (e, t) => e.toPrecision(t),
    o: (e) => Math.round(e).toString(8),
    p: (e, t) => Yo(e * 100, t),
    r: Yo,
    s: Ym,
    X: (e) => Math.round(e).toString(16).toUpperCase(),
    x: (e) => Math.round(e).toString(16)
  };
  function Jo(e) {
    return e;
  }
  var Qo = Array.prototype.map, ea = [
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
  function Zm(e) {
    var t = e.grouping === void 0 || e.thousands === void 0 ? Jo : qm(Qo.call(e.grouping, Number), e.thousands + ""), n = e.currency === void 0 ? "" : e.currency[0] + "", r = e.currency === void 0 ? "" : e.currency[1] + "", i = e.decimal === void 0 ? "." : e.decimal + "", s = e.numerals === void 0 ? Jo : Km(Qo.call(e.numerals, String)), o = e.percent === void 0 ? "%" : e.percent + "", a = e.minus === void 0 ? "\u2212" : e.minus + "", l = e.nan === void 0 ? "NaN" : e.nan + "";
    function c(f, h) {
      f = Zr(f);
      var d = f.fill, g = f.align, _ = f.sign, $ = f.symbol, G = f.zero, O = f.width, U = f.comma, b = f.precision, S = f.trim, A = f.type;
      A === "n" ? (U = true, A = "g") : Zo[A] || (b === void 0 && (b = 12), S = true, A = "g"), (G || d === "0" && g === "=") && (G = true, d = "0", g = "=");
      var H = (h && h.prefix !== void 0 ? h.prefix : "") + ($ === "$" ? n : $ === "#" && /[boxX]/.test(A) ? "0" + A.toLowerCase() : ""), X = ($ === "$" ? r : /[%p]/.test(A) ? o : "") + (h && h.suffix !== void 0 ? h.suffix : ""), B = Zo[A], V = /[defgprs%]/.test(A);
      b = b === void 0 ? 6 : /[gprs]/.test(A) ? Math.max(1, Math.min(21, b)) : Math.max(0, Math.min(20, b));
      function W(x) {
        var q = H, ee = X, ge, N, R;
        if (A === "c") ee = B(x) + ee, x = "";
        else {
          x = +x;
          var z = x < 0 || 1 / x < 0;
          if (x = isNaN(x) ? l : B(Math.abs(x), b), S && (x = Xm(x)), z && +x == 0 && _ !== "+" && (z = false), q = (z ? _ === "(" ? _ : a : _ === "-" || _ === "(" ? "" : _) + q, ee = (A === "s" && !isNaN(x) && Jr !== void 0 ? ea[8 + Jr / 3] : "") + ee + (z && _ === "(" ? ")" : ""), V) {
            for (ge = -1, N = x.length; ++ge < N; ) if (R = x.charCodeAt(ge), 48 > R || R > 57) {
              ee = (R === 46 ? i + x.slice(ge + 1) : x.slice(ge)) + ee, x = x.slice(0, ge);
              break;
            }
          }
        }
        U && !G && (x = t(x, 1 / 0));
        var te = q.length + x.length + ee.length, P = te < O ? new Array(O - te + 1).join(d) : "";
        switch (U && G && (x = t(P + x, P.length ? O - ee.length : 1 / 0), P = ""), g) {
          case "<":
            x = q + x + ee + P;
            break;
          case "=":
            x = q + P + x + ee;
            break;
          case "^":
            x = P.slice(0, te = P.length >> 1) + q + x + ee + P.slice(te);
            break;
          default:
            x = P + q + x + ee;
            break;
        }
        return s(x);
      }
      return W.toString = function() {
        return f + "";
      }, W;
    }
    function u(f, h) {
      var d = Math.max(-8, Math.min(8, Math.floor(yn(h) / 3))) * 3, g = Math.pow(10, -d), _ = c((f = Zr(f), f.type = "f", f), {
        suffix: ea[8 + d / 3]
      });
      return function($) {
        return _(g * $);
      };
    }
    return {
      format: c,
      formatPrefix: u
    };
  }
  var vr, Ql, eu;
  Jm({
    thousands: ",",
    grouping: [
      3
    ],
    currency: [
      "$",
      ""
    ]
  });
  function Jm(e) {
    return vr = Zm(e), Ql = vr.format, eu = vr.formatPrefix, vr;
  }
  function Qm(e) {
    return Math.max(0, -yn(Math.abs(e)));
  }
  function e0(e, t) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(yn(t) / 3))) * 3 - yn(Math.abs(e)));
  }
  function t0(e, t) {
    return e = Math.abs(e), t = Math.abs(t) - e, Math.max(0, yn(t) - yn(e)) + 1;
  }
  function n0(e, t) {
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
  function r0(e) {
    return function() {
      return e;
    };
  }
  function i0(e) {
    return +e;
  }
  var ta = [
    0,
    1
  ];
  function ln(e) {
    return e;
  }
  function cs(e, t) {
    return (t -= e = +e) ? function(n) {
      return (n - e) / t;
    } : r0(isNaN(t) ? NaN : 0.5);
  }
  function s0(e, t) {
    var n;
    return e > t && (n = e, e = t, t = n), function(r) {
      return Math.max(e, Math.min(t, r));
    };
  }
  function o0(e, t, n) {
    var r = e[0], i = e[1], s = t[0], o = t[1];
    return i < r ? (r = cs(i, r), s = n(o, s)) : (r = cs(r, i), s = n(s, o)), function(a) {
      return s(r(a));
    };
  }
  function a0(e, t, n) {
    var r = Math.min(e.length, t.length) - 1, i = new Array(r), s = new Array(r), o = -1;
    for (e[r] < e[0] && (e = e.slice().reverse(), t = t.slice().reverse()); ++o < r; ) i[o] = cs(e[o], e[o + 1]), s[o] = n(t[o], t[o + 1]);
    return function(a) {
      var l = Ch(e, a, 1, r) - 1;
      return s[l](i[l](a));
    };
  }
  function l0(e, t) {
    return t.domain(e.domain()).range(e.range()).interpolate(e.interpolate()).clamp(e.clamp()).unknown(e.unknown());
  }
  function u0() {
    var e = ta, t = ta, n = Ls, r, i, s, o = ln, a, l, c;
    function u() {
      var h = Math.min(e.length, t.length);
      return o !== ln && (o = s0(e[0], e[h - 1])), a = h > 2 ? a0 : o0, l = c = null, f;
    }
    function f(h) {
      return h == null || isNaN(h = +h) ? s : (l || (l = a(e.map(r), t, n)))(r(o(h)));
    }
    return f.invert = function(h) {
      return o(i((c || (c = a(t, e.map(r), qe)))(h)));
    }, f.domain = function(h) {
      return arguments.length ? (e = Array.from(h, i0), u()) : e.slice();
    }, f.range = function(h) {
      return arguments.length ? (t = Array.from(h), u()) : t.slice();
    }, f.rangeRound = function(h) {
      return t = Array.from(h), n = sh, u();
    }, f.clamp = function(h) {
      return arguments.length ? (o = h ? true : ln, u()) : o !== ln;
    }, f.interpolate = function(h) {
      return arguments.length ? (n = h, u()) : n;
    }, f.unknown = function(h) {
      return arguments.length ? (s = h, f) : s;
    }, function(h, d) {
      return r = h, i = d, u();
    };
  }
  function c0() {
    return u0()(ln, ln);
  }
  function f0(e, t, n, r) {
    var i = Lh(e, t, n), s;
    switch (r = Zr(r ?? ",f"), r.type) {
      case "s": {
        var o = Math.max(Math.abs(e), Math.abs(t));
        return r.precision == null && !isNaN(s = e0(i, o)) && (r.precision = s), eu(r, o);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        r.precision == null && !isNaN(s = t0(i, Math.max(Math.abs(e), Math.abs(t)))) && (r.precision = s - (r.type === "e"));
        break;
      }
      case "f":
      case "%": {
        r.precision == null && !isNaN(s = Qm(i)) && (r.precision = s - (r.type === "%") * 2);
        break;
      }
    }
    return Ql(r);
  }
  function d0(e) {
    var t = e.domain;
    return e.ticks = function(n) {
      var r = t();
      return Rh(r[0], r[r.length - 1], n ?? 10);
    }, e.tickFormat = function(n, r) {
      var i = t();
      return f0(i[0], i[i.length - 1], n ?? 10, r);
    }, e.nice = function(n) {
      n == null && (n = 10);
      var r = t(), i = 0, s = r.length - 1, o = r[i], a = r[s], l, c, u = 10;
      for (a < o && (c = o, o = a, a = c, c = i, i = s, s = c); u-- > 0; ) {
        if (c = rs(o, a, n), c === l) return r[i] = o, r[s] = a, t(r);
        if (c > 0) o = Math.floor(o / c) * c, a = Math.ceil(a / c) * c;
        else if (c < 0) o = Math.ceil(o * c) / c, a = Math.floor(a * c) / c;
        else break;
        l = c;
      }
      return e;
    }, e;
  }
  function tu() {
    var e = c0();
    return e.copy = function() {
      return l0(e, tu());
    }, n0.apply(e, arguments), d0(e);
  }
  function Ln(e, t, n) {
    this.k = e, this.x = t, this.y = n;
  }
  Ln.prototype = {
    constructor: Ln,
    scale: function(e) {
      return e === 1 ? this : new Ln(this.k * e, this.x, this.y);
    },
    translate: function(e, t) {
      return e === 0 & t === 0 ? this : new Ln(this.k, this.x + this.k * e, this.y + this.k * t);
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
  Ln.prototype;
  const h0 = 30, p0 = Ct({
    __name: "LchPicker",
    props: {
      modelValue: {},
      width: {}
    },
    emits: [
      "update:modelValue"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = pe(null), s = n.width ?? 450;
      function o() {
        if (!i.value) return;
        i.value.innerHTML = "";
        const c = a([
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
        }, s, h0, (u, f) => {
          r("update:modelValue", u);
        });
        c && i.value.appendChild(c);
      }
      Pt(() => {
        o();
      });
      function a(l, c, u, f, h) {
        const d = {
          ...c
        };
        l = l.map(({ name: S, domain: A }) => ({
          name: S,
          domain: A,
          scale: tu().domain(A).range([
            0,
            u
          ])
        }));
        for (const S of l) S.x = Math.round(S.scale(d[S.name]));
        const g = xg("div"), _ = ut("white"), $ = ut("black"), G = g.selectAll("div").data(l).join("div"), O = Wl(), U = G.append("canvas").attr("width", u).attr("height", 1).style("max-width", "100%").style("width", `${u}px`).style("height", `${f}px`).each(function() {
          const S = this.getContext("2d"), A = S.createImageData(u, 1);
          O.set(this, {
            context: S,
            image: A,
            data: A.data
          });
        }).each(function(S) {
          b.call(this, S);
        }).on("click", function(S, A) {
          const H = this.getBoundingClientRect(), X = S.clientX - H.left;
          A.x = Math.max(0, Math.min(u - 1, X)), d[A.name] = A.scale.invert(A.x), U.each(function(B) {
            b.call(this, B);
          }), h({
            ...d
          }, false, A.name);
        });
        G.each(function(S) {
          Zt(this).select("canvas").call(Lg().subject(function() {
            return {
              x: S.x ?? 0,
              y: 0
            };
          }).on("start", function() {
            h({
              ...d
            }, true, S.name);
          }).on("drag", function(H) {
            S.x = Math.max(1, Math.min(u - 1, H.x)), d[S.name] = S.scale.invert(S.x), U.each(function(X) {
              b.call(this, X);
            }), h({
              ...d
            }, true, S.name);
          }).on("end", function(H) {
            S.x = Math.max(1, Math.min(u - 1, H.x)), d[S.name] = S.scale.invert(S.x), U.each(function(X) {
              b.call(this, X);
            }), h({
              ...d
            }, false, S.name);
          }));
        });
        function b(S) {
          const A = O.get(this), { context: H, image: X, data: B } = A;
          for (let V = 0, W = -1; V < u; ++V) {
            let x;
            if (V === Math.round(S.x)) x = _;
            else if (V === Math.round(S.x) - 1) x = $;
            else {
              const q = {
                ...d
              };
              q[S.name] = S.scale.invert(V), x = ut(es(q.l, q.c, q.h));
            }
            B[++W] = x.r, B[++W] = x.g, B[++W] = x.b, B[++W] = 255;
          }
          H.putImageData(X, 0, 0);
        }
        return G.append("svg").attr("width", u).attr("height", 20).attr("viewBox", [
          0,
          0,
          u,
          20
        ]).style("max-width", "100%").style("overflow", "visible").append("g").each(function(S) {
          Zt(this).call(Fh(S.scale).ticks(Math.min(u / 80, 10)));
        }).append("text").attr("x", u).attr("y", 9).attr("dy", ".72em").style("text-anchor", "middle").style("text-transform", "uppercase").attr("fill", "currentColor").text((S) => S.name), g.node();
      }
      return (l, c) => (le(), fe("div", {
        ref_key: "container",
        ref: i
      }, null, 512));
    }
  }), g0 = {
    class: "palette-editor"
  }, m0 = {
    class: "handles-overlay"
  }, v0 = 12, _0 = Ct({
    __name: "PaletteEditor",
    props: {
      colorStops: {}
    },
    emits: [
      "update:colorStops"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = pe(null), s = Te(() => new Hr(n.colorStops).generateTexture());
      jt(s, (h) => {
        if (!i.value || !h) return;
        const d = i.value.getContext("2d");
        if (!d) return;
        d.clearRect(0, 0, 4096, 32);
        const g = document.createElement("canvas");
        g.width = h.width, g.height = h.height, g.getContext("2d").putImageData(h, 0, 0), d.drawImage(g, 0, 0, 4096, 1, 0, 0, 4096, 32);
      }), Pt(() => {
        ai(() => {
          const h = s.value;
          if (!i.value || !h) return;
          const d = i.value.getContext("2d");
          if (!d) return;
          d.clearRect(0, 0, 4096, 32);
          const g = document.createElement("canvas");
          g.width = h.width, g.height = h.height, g.getContext("2d").putImageData(h, 0, 0), d.drawImage(g, 0, 0, 4096, 1, 0, 0, 4096, 32);
        });
      });
      function o(h) {
        var _a2;
        if (n.colorStops.length >= v0) return;
        const d = i.value;
        if (!d) return;
        const g = d.getBoundingClientRect();
        let _ = (h.clientX - g.left) / g.width;
        _ = Math.max(0, Math.min(1, _));
        const $ = a.value !== null && ((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff";
        n.colorStops.push({
          color: $,
          position: _
        }), r("update:colorStops", n.colorStops), a.value = n.colorStops.length - 1;
      }
      const a = pe(0);
      function l(h) {
        a.value = h;
      }
      function c(h) {
        const d = ut(h);
        if (!d) return {
          l: 100,
          c: 0,
          h: 0
        };
        const g = es(d);
        return {
          l: g.l,
          c: g.c,
          h: g.h
        };
      }
      function u(h) {
        const d = es(h.l, h.c, h.h);
        return ut(d).formatHex();
      }
      const f = Te({
        get() {
          var _a2;
          return a.value === null || n.colorStops.length === 0 ? {
            l: 100,
            c: 0,
            h: 0
          } : c(((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff");
        },
        set(h) {
          a.value !== null && n.colorStops[a.value] && (n.colorStops[a.value] = {
            ...n.colorStops[a.value],
            color: u(h)
          }, r("update:colorStops", n.colorStops));
        }
      });
      return (h, d) => (le(), fe("div", g0, [
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
          v("div", m0, [
            (le(true), fe(Ue, null, Wi(e.colorStops, (g, _) => (le(), ul(xh, {
              key: "handle-" + _,
              stop: g,
              index: _,
              "onUpdate:position": ($) => e.colorStops[_].position = $,
              onClick: ($) => l(_)
            }, null, 8, [
              "stop",
              "index",
              "onUpdate:position",
              "onClick"
            ]))), 128))
          ])
        ], 32),
        ye(p0, {
          modelValue: f.value,
          "onUpdate:modelValue": d[0] || (d[0] = (g) => f.value = g),
          width: 450
        }, null, 8, [
          "modelValue"
        ])
      ]));
    }
  }), b0 = sr(_0, [
    [
      "__scopeId",
      "data-v-0e5e7bb6"
    ]
  ]), y0 = {
    class: "block bulma-settings-block",
    style: {
      color: "black !important"
    }
  }, w0 = {
    class: "tabs is-toggle is-fullwidth is-small"
  }, x0 = {
    class: "tab-content"
  }, S0 = {
    key: 0
  }, T0 = {
    class: "mb-3",
    style: {
      "font-family": "monospace",
      "word-break": "break-all",
      "white-space": "pre-line"
    }
  }, M0 = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, E0 = {
    style: {
      "font-family": "monospace",
      "min-width": "7.5em",
      display: "inline-block"
    }
  }, C0 = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, k0 = {
    style: {
      "font-family": "monospace",
      "min-width": "5em",
      display: "inline-block"
    }
  }, P0 = {
    key: 1
  }, A0 = {
    class: "mb-3"
  }, R0 = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, L0 = {
    style: {
      display: "flex",
      "align-items": "center",
      "min-height": "36px"
    }
  }, N0 = [
    "src"
  ], I0 = {
    style: {
      flex: "1 1 auto",
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis"
    }
  }, O0 = {
    class: "dropdown-menu",
    id: "dropdown-menu-presets",
    role: "menu",
    style: {
      width: "100%"
    }
  }, $0 = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, B0 = [
    "onClick"
  ], D0 = [
    "src"
  ], U0 = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.11em"
    }
  }, F0 = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, V0 = {
    class: "control is-expanded"
  }, z0 = {
    class: "control"
  }, G0 = [
    "disabled"
  ], H0 = {
    key: 2
  }, W0 = {
    class: "mb-3"
  }, q0 = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, K0 = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, j0 = {
    class: "mb-3"
  }, X0 = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, Y0 = {
    style: {
      display: "flex",
      "align-items": "center",
      "flex-direction": "column",
      gap: "0.5em",
      padding: "0.4em 0"
    }
  }, Z0 = [
    "src"
  ], J0 = {
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
  }, Q0 = {
    style: {
      flex: "1 1 auto",
      "text-align": "center"
    }
  }, ev = {
    class: "dropdown-menu",
    id: "dropdown-menu-palettes",
    role: "menu",
    style: {
      width: "100%"
    }
  }, tv = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, nv = [
    "onClick"
  ], rv = [
    "src"
  ], iv = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.05em",
      "text-align": "center"
    }
  }, sv = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, ov = {
    class: "control is-expanded"
  }, av = {
    class: "control"
  }, lv = [
    "disabled"
  ], uv = {
    key: 3
  }, cv = {
    class: "field"
  }, fv = {
    class: "control"
  }, dv = {
    class: "field"
  }, hv = {
    class: "control"
  }, pv = {
    class: "field"
  }, gv = {
    class: "control"
  }, mv = {
    class: "field"
  }, vv = {
    class: "checkbox"
  }, _v = {
    class: "field"
  }, bv = {
    class: "checkbox"
  }, yv = {
    class: "field"
  }, wv = {
    class: "checkbox"
  }, xv = {
    class: "field"
  }, Sv = {
    class: "checkbox"
  }, Tv = {
    class: "field"
  }, Mv = {
    class: "checkbox"
  }, Ev = {
    class: "field"
  }, Cv = {
    class: "checkbox"
  }, kv = {
    class: "field"
  }, Pv = {
    class: "checkbox"
  }, Bi = "mandelbrot_presets", Di = "mandelbrot_palettes", Av = Ct({
    __name: "Settings",
    props: Ms({
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
      const t = e, n = wt(e, "modelValue"), r = Te(() => ((n.value.angle * 180 / Math.PI % 360 + 360) % 360).toFixed(2)), i = Te({
        get: () => (n.value.angle * 180 / Math.PI % 360 + 360) % 360,
        set: (P) => {
          n.value.angle = P % 360 * Math.PI / 180;
        }
      }), s = Te({
        get: () => (Math.log10(n.value.palettePeriod || 0.01) + 2) / 5,
        set: (P) => {
          n.value.palettePeriod = Number((10 ** (P * 5 - 2)).toPrecision(6));
        }
      }), o = Te({
        get: () => {
          const P = Number(n.value.scale), y = P > 0 ? -Math.log2(P) : 126;
          return isFinite(y) ? Math.min(Math.max(Math.round(y), 1), 126) : 1;
        },
        set: (P) => {
          const y = Math.min(Math.max(Math.round(P), 1), 126);
          n.value.scale = (2 ** -y).toPrecision(10);
        }
      });
      function a(P, y) {
        const [C, _e] = P.split(".");
        return _e ? C + "." + _e.slice(0, y) : C;
      }
      function l(P) {
        const y = document.createElement("canvas");
        y.width = 320, y.height = 40;
        const C = y.getContext("2d");
        if (!C) return "";
        if (P.length === 0) return C.fillStyle = "#000", C.fillRect(0, 0, y.width, y.height), y.toDataURL("image/png");
        const Be = new Hr(P).generateTexture(), Je = document.createElement("canvas");
        Je.width = Be.width, Je.height = 1;
        const ze = Je.getContext("2d");
        return ze ? (ze.putImageData(Be, 0, 0), C.drawImage(Je, 0, 0, y.width, y.height), y.toDataURL("image/png")) : "";
      }
      const c = pe(null), u = pe(""), f = pe([]), h = pe(""), d = pe([]), g = pe(""), _ = pe(false);
      function $() {
        const P = u.value.trim();
        if (P && window.confirm(`Supprimer le preset "${P}" ? Cette action est irr\xE9versible.`)) {
          const y = f.value.findIndex((C) => C.name === P);
          y >= 0 && (f.value.splice(y, 1), localStorage.setItem(Bi, JSON.stringify(f.value)), O.value = "", u.value = "");
        }
      }
      async function G() {
        t.engine && (c.value = await t.engine.getSnapshotPng(256));
      }
      const O = pe(""), U = pe(false), b = Te(() => f.value.find((P) => P.name === O.value)), S = Te(() => {
        var _a2;
        return (_a2 = b.value) == null ? void 0 : _a2.thumbnail;
      });
      function A(P) {
        ee(P.name), U.value = false;
      }
      async function H() {
        if (!u.value.trim()) return;
        let P, y = (/* @__PURE__ */ new Date()).toISOString();
        try {
          t.engine && (P = await t.engine.getSnapshotPng(256));
        } catch {
        }
        const C = {
          name: u.value.trim(),
          value: n.value,
          thumbnail: P,
          date: y
        }, _e = f.value.findIndex((Be) => Be.name === C.name);
        _e >= 0 ? f.value[_e] = C : f.value.push(C), localStorage.setItem(Bi, JSON.stringify(f.value)), u.value = "";
      }
      function X() {
        const P = localStorage.getItem(Bi);
        if (P) try {
          f.value = JSON.parse(P);
        } catch {
        }
      }
      function B() {
        const P = localStorage.getItem(Di);
        if (P) try {
          d.value = JSON.parse(P);
        } catch {
        }
      }
      async function V() {
        if (!h.value.trim()) return;
        let P, y = (/* @__PURE__ */ new Date()).toISOString();
        try {
          P = l(n.value.colorStops);
        } catch {
        }
        const C = {
          name: h.value.trim(),
          colorStops: structuredClone(re(n.value.colorStops)),
          thumbnail: P,
          date: y
        }, _e = d.value.findIndex((Be) => Be.name === C.name);
        _e >= 0 ? d.value[_e] = C : d.value.push(C), localStorage.setItem(Di, JSON.stringify(d.value)), h.value = "";
      }
      function W(P) {
        const y = d.value.find((C) => C.name === P);
        y && (g.value = P, h.value = y.name, n.value.colorStops = structuredClone(re(y.colorStops)));
      }
      function x(P) {
        W(P.name), _.value = false;
      }
      function q() {
        const P = h.value.trim();
        if (P && window.confirm(`Supprimer la palette "${P}" ? Cette action est irr\xE9versible.`)) {
          const y = d.value.findIndex((C) => C.name === P);
          y >= 0 && (d.value.splice(y, 1), localStorage.setItem(Di, JSON.stringify(d.value)), g.value = "", h.value = "");
        }
      }
      function ee(P) {
        const y = f.value.find((C) => C.name === P);
        y && (O.value = P, u.value = y.name, n.value = structuredClone(re(y.value)));
      }
      const ge = Te({
        get: () => Math.log10(n.value.mu ?? 1),
        set: (P) => {
          n.value.mu = Math.pow(10, P);
        }
      }), N = Te({
        get: () => Math.log10(n.value.epsilon ?? 1e-8),
        set: (P) => {
          n.value.epsilon = Math.pow(10, P);
        }
      });
      Pt(() => {
        X(), B();
      });
      const R = pe("navigation"), z = Te(() => d.value.find((P) => P.name === g.value)), te = Te(() => {
        var _a2;
        return (_a2 = z.value) == null ? void 0 : _a2.thumbnail;
      });
      return jt([
        R,
        () => t.engine
      ], async ([P]) => {
        P === "navigation" && await G();
      }, {
        immediate: true
      }), (P, y) => (le(), fe("div", y0, [
        v("div", w0, [
          v("ul", null, [
            v("li", {
              class: ve({
                "is-active": R.value === "navigation"
              })
            }, [
              v("a", {
                onClick: y[0] || (y[0] = (C) => R.value = "navigation")
              }, "Navigation")
            ], 2),
            v("li", {
              class: ve({
                "is-active": R.value === "presets"
              })
            }, [
              v("a", {
                onClick: y[1] || (y[1] = (C) => R.value = "presets")
              }, "Presets")
            ], 2),
            v("li", {
              class: ve({
                "is-active": R.value === "palettes"
              })
            }, [
              v("a", {
                onClick: y[2] || (y[2] = (C) => R.value = "palettes")
              }, "Palettes")
            ], 2),
            v("li", {
              class: ve({
                "is-active": R.value === "performance"
              })
            }, [
              v("a", {
                onClick: y[3] || (y[3] = (C) => R.value = "performance")
              }, "Graphics")
            ], 2)
          ])
        ]),
        v("div", x0, [
          R.value === "navigation" ? (le(), fe("div", S0, [
            v("div", T0, [
              v("span", null, [
                y[26] || (y[26] = se("Cx: ", -1)),
                v("span", null, be(a(n.value.cx, 38)), 1)
              ]),
              y[28] || (y[28] = v("br", null, null, -1)),
              v("span", null, [
                y[27] || (y[27] = se("Cy: ", -1)),
                v("span", null, be(a(n.value.cy, 38)), 1)
              ])
            ]),
            v("div", M0, [
              v("span", null, [
                y[29] || (y[29] = se("\xC9chelle\xA0: ", -1)),
                v("span", E0, be(Number(n.value.scale).toExponential(2)), 1)
              ]),
              Se(v("input", {
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
                "onUpdate:modelValue": y[4] || (y[4] = (C) => o.value = C)
              }, null, 512), [
                [
                  gt,
                  o.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            v("div", C0, [
              v("span", null, [
                y[30] || (y[30] = se("Angle\xA0: ", -1)),
                v("span", k0, be(r.value) + "\xB0", 1)
              ]),
              Se(v("input", {
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
                "onUpdate:modelValue": y[5] || (y[5] = (C) => i.value = C)
              }, null, 512), [
                [
                  gt,
                  i.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ])
          ])) : R.value === "presets" ? (le(), fe("div", P0, [
            v("div", A0, [
              y[32] || (y[32] = v("label", {
                class: "label"
              }, "Presets enregistr\xE9s", -1)),
              v("div", {
                class: ve([
                  "dropdown",
                  {
                    "is-active": U.value
                  }
                ]),
                style: {
                  width: "100%"
                }
              }, [
                v("div", R0, [
                  v("button", {
                    class: "button is-fullwidth",
                    onClick: y[6] || (y[6] = (C) => U.value = !U.value),
                    "aria-haspopup": "true",
                    "aria-controls": "dropdown-menu-presets",
                    type: "button"
                  }, [
                    v("span", L0, [
                      S.value ? (le(), fe("img", {
                        key: 0,
                        src: S.value,
                        alt: "miniature",
                        style: {
                          height: "32px",
                          width: "56px",
                          "object-fit": "cover",
                          "margin-right": "8px",
                          "border-radius": "3px",
                          background: "#888"
                        }
                      }, null, 8, N0)) : Gt("", true),
                      v("span", I0, be(u.value || "Choisir un preset..."), 1),
                      y[31] || (y[31] = v("span", {
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
                v("div", O0, [
                  v("div", $0, [
                    (le(true), fe(Ue, null, Wi(f.value, (C) => (le(), fe("a", {
                      key: C.name,
                      class: ve([
                        "dropdown-item",
                        {
                          "is-active": O.value === C.name
                        }
                      ]),
                      onClick: Co((_e) => A(C), [
                        "prevent"
                      ]),
                      style: {
                        display: "flex",
                        "align-items": "center",
                        gap: "0.75em"
                      }
                    }, [
                      C.thumbnail ? (le(), fe("img", {
                        key: 0,
                        src: C.thumbnail,
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
                      }, null, 8, D0)) : Gt("", true),
                      v("span", U0, be(C.name), 1)
                    ], 10, B0))), 128))
                  ])
                ])
              ], 2),
              v("div", F0, [
                v("div", V0, [
                  Se(v("input", {
                    class: "input",
                    "onUpdate:modelValue": y[7] || (y[7] = (C) => u.value = C),
                    type: "text",
                    placeholder: "Nom...",
                    onFocus: y[8] || (y[8] = (C) => t.suspendShortcuts && t.suspendShortcuts(true)),
                    onBlur: y[9] || (y[9] = (C) => t.suspendShortcuts && t.suspendShortcuts(false))
                  }, null, 544), [
                    [
                      gt,
                      u.value
                    ]
                  ])
                ]),
                v("div", {
                  class: "control"
                }, [
                  v("button", {
                    class: "button is-link is-small",
                    onClick: H
                  }, "Enregistrer")
                ]),
                v("div", z0, [
                  v("button", {
                    class: "button is-danger is-small",
                    onClick: $,
                    disabled: !u.value
                  }, "Supprimer", 8, G0)
                ])
              ])
            ])
          ])) : R.value === "palettes" ? (le(), fe("div", H0, [
            v("div", W0, [
              ye(b0, {
                "color-stops": n.value.colorStops
              }, null, 8, [
                "color-stops"
              ])
            ]),
            v("div", q0, [
              y[33] || (y[33] = v("label", {
                style: {
                  "white-space": "nowrap"
                }
              }, "P\xE9riode :", -1)),
              Se(v("input", {
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
                "onUpdate:modelValue": y[10] || (y[10] = (C) => s.value = C)
              }, null, 512), [
                [
                  gt,
                  s.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            v("div", K0, [
              y[34] || (y[34] = v("label", {
                style: {
                  "white-space": "nowrap"
                }
              }, "D\xE9calage :", -1)),
              Se(v("input", {
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
                "onUpdate:modelValue": y[11] || (y[11] = (C) => n.value.paletteOffset = C)
              }, null, 512), [
                [
                  gt,
                  n.value.paletteOffset,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            y[37] || (y[37] = v("hr", {
              class: "section-sep"
            }, null, -1)),
            v("div", j0, [
              y[36] || (y[36] = v("label", {
                class: "label"
              }, "Palettes enregistr\xE9es", -1)),
              v("div", {
                class: ve([
                  "dropdown",
                  {
                    "is-active": _.value
                  }
                ]),
                style: {
                  width: "100%"
                }
              }, [
                v("div", X0, [
                  v("button", {
                    class: "button is-fullwidth",
                    onClick: y[12] || (y[12] = (C) => _.value = !_.value),
                    "aria-haspopup": "true",
                    "aria-controls": "dropdown-menu-palettes",
                    type: "button"
                  }, [
                    v("span", Y0, [
                      te.value ? (le(), fe("img", {
                        key: 0,
                        src: te.value,
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
                      }, null, 8, Z0)) : Gt("", true),
                      v("span", J0, [
                        v("span", Q0, be(h.value || "Choisir une palette..."), 1),
                        y[35] || (y[35] = v("span", {
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
                v("div", ev, [
                  v("div", tv, [
                    (le(true), fe(Ue, null, Wi(d.value, (C) => (le(), fe("a", {
                      key: C.name,
                      class: ve([
                        "dropdown-item",
                        {
                          "is-active": g.value === C.name
                        }
                      ]),
                      onClick: Co((_e) => x(C), [
                        "prevent"
                      ]),
                      style: {
                        display: "flex",
                        "flex-direction": "column",
                        gap: "0.5em",
                        padding: "0.75em"
                      }
                    }, [
                      C.thumbnail ? (le(), fe("img", {
                        key: 0,
                        src: C.thumbnail,
                        alt: "miniature",
                        style: {
                          height: "32px",
                          width: "100%",
                          "object-fit": "cover",
                          "border-radius": "4px",
                          background: "#aaa",
                          "box-shadow": "0 1px 6px rgba(0,0,0,0.16)"
                        }
                      }, null, 8, rv)) : Gt("", true),
                      v("span", iv, be(C.name), 1)
                    ], 10, nv))), 128))
                  ])
                ])
              ], 2),
              v("div", sv, [
                v("div", ov, [
                  Se(v("input", {
                    class: "input",
                    "onUpdate:modelValue": y[13] || (y[13] = (C) => h.value = C),
                    type: "text",
                    placeholder: "Nom...",
                    onFocus: y[14] || (y[14] = (C) => t.suspendShortcuts && t.suspendShortcuts(true)),
                    onBlur: y[15] || (y[15] = (C) => t.suspendShortcuts && t.suspendShortcuts(false))
                  }, null, 544), [
                    [
                      gt,
                      h.value
                    ]
                  ])
                ]),
                v("div", {
                  class: "control"
                }, [
                  v("button", {
                    class: "button is-link is-small",
                    onClick: V
                  }, "Enregistrer")
                ]),
                v("div", av, [
                  v("button", {
                    class: "button is-danger is-small",
                    onClick: q,
                    disabled: !h.value
                  }, "Supprimer", 8, lv)
                ])
              ])
            ])
          ])) : R.value === "performance" ? (le(), fe("div", uv, [
            v("div", cv, [
              y[38] || (y[38] = v("label", {
                class: "label"
              }, "Mu (log)", -1)),
              v("div", fv, [
                Se(v("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "0",
                  max: "5",
                  step: "0.01",
                  "onUpdate:modelValue": y[16] || (y[16] = (C) => ge.value = C)
                }, null, 512), [
                  [
                    gt,
                    ge.value
                  ]
                ])
              ]),
              v("span", null, be((n.value.mu ?? 1).toFixed(1)), 1)
            ]),
            v("div", dv, [
              y[39] || (y[39] = v("label", {
                class: "label"
              }, "Epsilon (log)", -1)),
              v("div", hv, [
                Se(v("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "-12",
                  max: "0",
                  step: "0.01",
                  "onUpdate:modelValue": y[17] || (y[17] = (C) => N.value = C)
                }, null, 512), [
                  [
                    gt,
                    N.value
                  ]
                ])
              ]),
              v("span", null, be((n.value.epsilon ?? 1e-8).toExponential(2)), 1)
            ]),
            v("div", pv, [
              y[40] || (y[40] = v("label", {
                class: "label"
              }, "Tessellation", -1)),
              v("div", gv, [
                Se(v("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "0.1",
                  max: "10",
                  step: "0.1",
                  "onUpdate:modelValue": y[18] || (y[18] = (C) => n.value.tessellationLevel = C)
                }, null, 512), [
                  [
                    gt,
                    n.value.tessellationLevel,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              v("span", null, be(n.value.tessellationLevel), 1)
            ]),
            v("div", mv, [
              v("label", vv, [
                Se(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": y[19] || (y[19] = (C) => n.value.activateWebcam = C)
                }, null, 512), [
                  [
                    Ft,
                    n.value.activateWebcam
                  ]
                ]),
                y[41] || (y[41] = se(" \xA0Activer la webcam ", -1))
              ])
            ]),
            v("div", _v, [
              v("label", bv, [
                Se(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": y[20] || (y[20] = (C) => n.value.activateTessellation = C)
                }, null, 512), [
                  [
                    Ft,
                    n.value.activateTessellation
                  ]
                ]),
                y[42] || (y[42] = se(" \xA0Tessellation GPU ", -1))
              ])
            ]),
            v("div", yv, [
              v("label", wv, [
                Se(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": y[21] || (y[21] = (C) => n.value.activateShading = C)
                }, null, 512), [
                  [
                    Ft,
                    n.value.activateShading
                  ]
                ]),
                y[43] || (y[43] = se(" \xA0Shading avanc\xE9 ", -1))
              ])
            ]),
            v("div", xv, [
              v("label", Sv, [
                Se(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": y[22] || (y[22] = (C) => n.value.activateSkybox = C)
                }, null, 512), [
                  [
                    Ft,
                    n.value.activateSkybox
                  ]
                ]),
                y[44] || (y[44] = se(" \xA0Skybox ", -1))
              ])
            ]),
            v("div", Tv, [
              v("label", Mv, [
                Se(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": y[23] || (y[23] = (C) => n.value.activatePalette = C)
                }, null, 512), [
                  [
                    Ft,
                    n.value.activatePalette
                  ]
                ]),
                y[45] || (y[45] = se(" \xA0Palette ", -1))
              ])
            ]),
            v("div", Ev, [
              v("label", Cv, [
                Se(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": y[24] || (y[24] = (C) => n.value.activateSmoothness = C)
                }, null, 512), [
                  [
                    Ft,
                    n.value.activateSmoothness
                  ]
                ]),
                y[46] || (y[46] = se(" \xA0Smoothness ", -1))
              ])
            ]),
            v("div", kv, [
              v("label", Pv, [
                Se(v("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": y[25] || (y[25] = (C) => n.value.activateZebra = C)
                }, null, 512), [
                  [
                    Ft,
                    n.value.activateZebra
                  ]
                ]),
                y[47] || (y[47] = se(" \xA0Zebra ", -1))
              ])
            ])
          ])) : Gt("", true)
        ])
      ]));
    }
  }), Rv = sr(Av, [
    [
      "__scopeId",
      "data-v-681ceda4"
    ]
  ]), Lv = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, Nv = {
    key: 0,
    style: {
      position: "absolute",
      top: "0",
      left: "0",
      "z-index": "10",
      "pointer-events": "auto",
      height: "100vh"
    }
  }, Iv = {
    class: "tag is-black"
  }, Ov = {
    class: "tag is-black"
  }, $v = {
    class: "tag is-black"
  }, Bv = {
    class: "tag is-black"
  }, Dv = {
    class: "tag is-black"
  }, Uv = {
    class: "tag is-black"
  }, Fv = {
    class: "tag is-black"
  }, Vv = {
    class: "tag is-black"
  }, zv = {
    href: "https://github.com/gcollombet/mandelbrot",
    target: "_blank",
    rel: "noopener",
    class: "footer-link",
    "aria-label": "GitHub"
  }, Gv = {
    class: "github-logo",
    height: "20",
    viewBox: "0 0 16 16",
    width: "20",
    fill: "currentColor",
    style: {
      "vertical-align": "middle",
      "margin-right": "4px"
    }
  }, na = "mandelbrot_last_settings", Hv = Ct({
    __name: "MandelbrotViewer",
    setup(e) {
      const t = pe(null), n = Te(() => {
        var _a2;
        return ((_a2 = t.value) == null ? void 0 : _a2.getEngine()) ?? null;
      }), r = pe(false), i = pe(false), s = pe(true), o = pe({
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
      Pt(() => {
        window.addEventListener("keydown", l);
        try {
          const h = localStorage.getItem(na);
          h && Object.assign(o.value, JSON.parse(h));
        } catch {
        }
      }), nr(() => {
        window.removeEventListener("keydown", l);
      }), jt(o, (h) => {
        localStorage.setItem(na, JSON.stringify(h));
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
      function c() {
        var _a2;
        const h = window.navigator.language || ((_a2 = window.navigator.languages) == null ? void 0 : _a2[0]) || "en";
        return h.startsWith("fr") || h.startsWith("be") ? "azerty" : "qwerty";
      }
      const u = c(), f = Te(() => u === "azerty" ? {
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
      return (h, d) => (le(), fe("div", Lv, [
        Se(v("button", {
          class: ve([
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
            Ei,
            s.value
          ]
        ]),
        ye(yh, {
          ref_key: "mandelbrotCtrlRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          },
          scale: o.value.scale,
          "onUpdate:scale": d[0] || (d[0] = (g) => o.value.scale = g),
          angle: o.value.angle,
          "onUpdate:angle": d[1] || (d[1] = (g) => o.value.angle = g),
          cx: o.value.cx,
          "onUpdate:cx": d[2] || (d[2] = (g) => o.value.cx = g),
          cy: o.value.cy,
          "onUpdate:cy": d[3] || (d[3] = (g) => o.value.cy = g),
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
        r.value ? (le(), fe("div", Nv, [
          ye(Rv, {
            modelValue: o.value,
            "onUpdate:modelValue": d[4] || (d[4] = (g) => o.value = g),
            engine: n.value,
            "suspend-shortcuts": (g) => {
              i.value = g;
            }
          }, null, 8, [
            "modelValue",
            "engine",
            "suspend-shortcuts"
          ])
        ])) : Gt("", true),
        Se(v("div", {
          class: ve([
            "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
            s.value ? "animate__fadeInUp" : ""
          ])
        }, [
          d[6] || (d[6] = se(" Move\xA0 ", -1)),
          d[7] || (d[7] = v("span", {
            class: "tag is-black"
          }, "Left clic", -1)),
          d[8] || (d[8] = se("\xA0 ", -1)),
          v("span", Iv, be(f.value.up), 1),
          d[9] || (d[9] = se("\xA0 ", -1)),
          v("span", Ov, be(f.value.left), 1),
          d[10] || (d[10] = se("\xA0 ", -1)),
          v("span", $v, be(f.value.down), 1),
          d[11] || (d[11] = se("\xA0 ", -1)),
          v("span", Bv, be(f.value.right), 1),
          d[12] || (d[12] = se("\xA0 |\xA0Rotate\xA0 ", -1)),
          d[13] || (d[13] = v("span", {
            class: "tag is-black"
          }, "Right clic", -1)),
          d[14] || (d[14] = se("\xA0 ", -1)),
          v("span", Dv, be(f.value.rotateLeft), 1),
          d[15] || (d[15] = se("\xA0 ", -1)),
          v("span", Uv, be(f.value.rotateRight), 1),
          d[16] || (d[16] = se("\xA0 |\xA0Zoom\xA0 ", -1)),
          d[17] || (d[17] = v("span", {
            class: "tag is-black"
          }, "Wheel", -1)),
          d[18] || (d[18] = se("\xA0 ", -1)),
          v("span", Fv, be(f.value.zoomIn), 1),
          d[19] || (d[19] = se("\xA0 ", -1)),
          v("span", Vv, be(f.value.zoomOut), 1),
          d[20] || (d[20] = se("\xA0 |\xA0Settings\xA0 ", -1)),
          d[21] || (d[21] = v("span", {
            class: "tag is-black"
          }, "W", -1))
        ], 2), [
          [
            Ei,
            s.value
          ]
        ]),
        Se(v("div", {
          class: ve([
            "footer-love tag is-light is-medium is-hidden-touch animate__animated",
            s.value ? "animate__fadeInUp" : ""
          ])
        }, [
          d[24] || (d[24] = v("small", null, [
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
          d[25] || (d[25] = se(" \xA0|\xA0 ", -1)),
          v("small", null, [
            v("a", zv, [
              (le(), fe("svg", Gv, [
                ...d[22] || (d[22] = [
                  v("path", {
                    d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                  }, null, -1)
                ])
              ])),
              d[23] || (d[23] = se(" GitHub ", -1))
            ])
          ])
        ], 2), [
          [
            Ei,
            s.value
          ]
        ])
      ]));
    }
  }), Wv = sr(Hv, [
    [
      "__scopeId",
      "data-v-5eedf4ec"
    ]
  ]), qv = {
    key: 0,
    id: "fullscreen"
  }, Kv = {
    key: 1,
    class: "section is-flex is-flex-direction-column is-align-items-center is-justify-content-center",
    style: {
      height: "100vh"
    }
  }, jv = {
    class: "box has-text-centered",
    style: {
      "max-width": "400px"
    }
  }, Xv = {
    class: "title is-4 mt-3"
  }, Yv = {
    key: 0
  }, Zv = {
    key: 1
  }, Jv = {
    class: "button is-link mt-4",
    href: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility",
    target: "_blank"
  }, Qv = Ct({
    __name: "App",
    setup(e) {
      const t = pe(false), n = pe(true);
      return Pt(() => {
        t.value = typeof navigator < "u" && "gpu" in navigator, typeof navigator < "u" && (n.value = navigator.language.startsWith("fr"));
      }), (r, i) => t.value ? (le(), fe("div", qv, [
        ye(Wv)
      ])) : (le(), fe("div", Kv, [
        v("div", jv, [
          i[2] || (i[2] = v("span", {
            class: "icon is-large has-text-danger"
          }, [
            v("i", {
              class: "fas fa-exclamation-triangle fa-2x"
            })
          ], -1)),
          v("h1", Xv, be(n.value ? "WebGPU non support\xE9" : "WebGPU not supported"), 1),
          v("p", null, [
            n.value ? (le(), fe("span", Yv, [
              ...i[0] || (i[0] = [
                se(" Ce navigateur ne supporte pas WebGPU.", -1),
                v("br", null, null, -1),
                se(" Veuillez utiliser un navigateur compatible WebGPU. ", -1)
              ])
            ])) : (le(), fe("span", Zv, [
              ...i[1] || (i[1] = [
                se(" This browser does not support WebGPU.", -1),
                v("br", null, null, -1),
                se(" Please use a WebGPU-compatible browser. ", -1)
              ])
            ]))
          ]),
          v("a", Jv, be(n.value ? "Liste des navigateurs compatibles WebGPU" : "List of WebGPU-compatible browsers"), 1)
        ])
      ]));
    }
  });
  "serviceWorker" in navigator && window.addEventListener("load", () => {
    navigator.serviceWorker.register("/mandelbrot/sw.js");
  });
  Lf(Qv).mount("#app");
})();
