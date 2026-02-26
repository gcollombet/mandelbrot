var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(async () => {
  (function() {
    const t = document.createElement("link").relList;
    if (t && t.supports && t.supports("modulepreload")) return;
    for (const i of document.querySelectorAll('link[rel="modulepreload"]')) r(i);
    new MutationObserver((i) => {
      for (const o of i) if (o.type === "childList") for (const s of o.addedNodes) s.tagName === "LINK" && s.rel === "modulepreload" && r(s);
    }).observe(document, {
      childList: true,
      subtree: true
    });
    function n(i) {
      const o = {};
      return i.integrity && (o.integrity = i.integrity), i.referrerPolicy && (o.referrerPolicy = i.referrerPolicy), i.crossOrigin === "use-credentials" ? o.credentials = "include" : i.crossOrigin === "anonymous" ? o.credentials = "omit" : o.credentials = "same-origin", o;
    }
    function r(i) {
      if (i.ep) return;
      i.ep = true;
      const o = n(i);
      fetch(i.href, o);
    }
  })();
  function fo(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const ce = {}, cn = [], ut = () => {
  }, sa = () => false, Qr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), ho = (e) => e.startsWith("onUpdate:"), Se = Object.assign, po = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, su = Object.prototype.hasOwnProperty, fe = (e, t) => su.call(e, t), j = Array.isArray, fn = (e) => tr(e) === "[object Map]", ei = (e) => tr(e) === "[object Set]", qo = (e) => tr(e) === "[object Date]", te = (e) => typeof e == "function", we = (e) => typeof e == "string", ht = (e) => typeof e == "symbol", he = (e) => e !== null && typeof e == "object", aa = (e) => (he(e) || te(e)) && te(e.then) && te(e.catch), la = Object.prototype.toString, tr = (e) => la.call(e), au = (e) => tr(e).slice(8, -1), ua = (e) => tr(e) === "[object Object]", go = (e) => we(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, In = fo(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), ti = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return ((n) => t[n] || (t[n] = e(n)));
  }, lu = /-\w/g, kt = ti((e) => e.replace(lu, (t) => t.slice(1).toUpperCase())), uu = /\B([A-Z])/g, Dt = ti((e) => e.replace(uu, "-$1").toLowerCase()), ca = ti((e) => e.charAt(0).toUpperCase() + e.slice(1)), _i = ti((e) => e ? `on${ca(e)}` : ""), Oe = (e, t) => !Object.is(e, t), _r = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, fa = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, mo = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  }, cu = (e) => {
    const t = we(e) ? Number(e) : NaN;
    return isNaN(t) ? e : t;
  };
  let Yo;
  const ni = () => Yo || (Yo = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function ri(e) {
    if (j(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], i = we(r) ? pu(r) : ri(r);
        if (i) for (const o in i) t[o] = i[o];
      }
      return t;
    } else if (we(e) || he(e)) return e;
  }
  const fu = /;(?![^(]*\))/g, du = /:([^]+)/, hu = /\/\*[^]*?\*\//g;
  function pu(e) {
    const t = {};
    return e.replace(hu, "").split(fu).forEach((n) => {
      if (n) {
        const r = n.split(du);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }), t;
  }
  function be(e) {
    let t = "";
    if (we(e)) t = e;
    else if (j(e)) for (let n = 0; n < e.length; n++) {
      const r = be(e[n]);
      r && (t += r + " ");
    }
    else if (he(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const gu = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", mu = fo(gu);
  function da(e) {
    return !!e || e === "";
  }
  function vu(e, t) {
    if (e.length !== t.length) return false;
    let n = true;
    for (let r = 0; n && r < e.length; r++) n = nr(e[r], t[r]);
    return n;
  }
  function nr(e, t) {
    if (e === t) return true;
    let n = qo(e), r = qo(t);
    if (n || r) return n && r ? e.getTime() === t.getTime() : false;
    if (n = ht(e), r = ht(t), n || r) return e === t;
    if (n = j(e), r = j(t), n || r) return n && r ? vu(e, t) : false;
    if (n = he(e), r = he(t), n || r) {
      if (!n || !r) return false;
      const i = Object.keys(e).length, o = Object.keys(t).length;
      if (i !== o) return false;
      for (const s in e) {
        const a = e.hasOwnProperty(s), l = t.hasOwnProperty(s);
        if (a && !l || !a && l || !nr(e[s], t[s])) return false;
      }
    }
    return String(e) === String(t);
  }
  function ha(e, t) {
    return e.findIndex((n) => nr(n, t));
  }
  const pa = (e) => !!(e && e.__v_isRef === true), ue = (e) => we(e) ? e : e == null ? "" : j(e) || he(e) && (e.toString === la || !te(e.toString)) ? pa(e) ? ue(e.value) : JSON.stringify(e, ga, 2) : String(e), ga = (e, t) => pa(t) ? ga(e, t.value) : fn(t) ? {
    [`Map(${t.size})`]: [
      ...t.entries()
    ].reduce((n, [r, i], o) => (n[bi(r, o) + " =>"] = i, n), {})
  } : ei(t) ? {
    [`Set(${t.size})`]: [
      ...t.values()
    ].map((n) => bi(n))
  } : ht(t) ? bi(t) : he(t) && !j(t) && !ua(t) ? String(t) : t, bi = (e, t = "") => {
    var n;
    return ht(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
  let Ie;
  class _u {
    constructor(t = false) {
      this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.__v_skip = true, this.parent = Ie, !t && Ie && (this.index = (Ie.scopes || (Ie.scopes = [])).push(this) - 1);
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
        const n = Ie;
        try {
          return Ie = this, t();
        } finally {
          Ie = n;
        }
      }
    }
    on() {
      ++this._on === 1 && (this.prevScope = Ie, Ie = this);
    }
    off() {
      this._on > 0 && --this._on === 0 && (Ie = this.prevScope, this.prevScope = void 0);
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
  function bu() {
    return Ie;
  }
  let _e;
  const yi = /* @__PURE__ */ new WeakSet();
  class ma {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, Ie && Ie.active && Ie.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, yi.has(this) && (yi.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || _a(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, Ko(this), ba(this);
      const t = _e, n = je;
      _e = this, je = true;
      try {
        return this.fn();
      } finally {
        ya(this), _e = t, je = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) bo(t);
        this.deps = this.depsTail = void 0, Ko(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? yi.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      Ui(this) && this.run();
    }
    get dirty() {
      return Ui(this);
    }
  }
  let va = 0, On, Fn;
  function _a(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = Fn, Fn = e;
      return;
    }
    e.next = On, On = e;
  }
  function vo() {
    va++;
  }
  function _o() {
    if (--va > 0) return;
    if (Fn) {
      let t = Fn;
      for (Fn = void 0; t; ) {
        const n = t.next;
        t.next = void 0, t.flags &= -9, t = n;
      }
    }
    let e;
    for (; On; ) {
      let t = On;
      for (On = void 0; t; ) {
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
  function ba(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function ya(e) {
    let t, n = e.depsTail, r = n;
    for (; r; ) {
      const i = r.prevDep;
      r.version === -1 ? (r === n && (n = i), bo(r), yu(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = i;
    }
    e.deps = t, e.depsTail = n;
  }
  function Ui(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (xa(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function xa(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Hn) || (e.globalVersion = Hn, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Ui(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = _e, r = je;
    _e = e, je = true;
    try {
      ba(e);
      const i = e.fn(e._value);
      (t.version === 0 || Oe(i, e._value)) && (e.flags |= 128, e._value = i, t.version++);
    } catch (i) {
      throw t.version++, i;
    } finally {
      _e = n, je = r, ya(e), e.flags &= -3;
    }
  }
  function bo(e, t = false) {
    const { dep: n, prevSub: r, nextSub: i } = e;
    if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
      n.computed.flags &= -5;
      for (let o = n.computed.deps; o; o = o.nextDep) bo(o, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function yu(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let je = true;
  const wa = [];
  function Et() {
    wa.push(je), je = false;
  }
  function At() {
    const e = wa.pop();
    je = e === void 0 ? true : e;
  }
  function Ko(e) {
    const { cleanup: t } = e;
    if (e.cleanup = void 0, t) {
      const n = _e;
      _e = void 0;
      try {
        t();
      } finally {
        _e = n;
      }
    }
  }
  let Hn = 0;
  class xu {
    constructor(t, n) {
      this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
    }
  }
  class ii {
    constructor(t) {
      this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
    }
    track(t) {
      if (!_e || !je || _e === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== _e) n = this.activeLink = new xu(_e, this), _e.deps ? (n.prevDep = _e.depsTail, _e.depsTail.nextDep = n, _e.depsTail = n) : _e.deps = _e.depsTail = n, Sa(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = _e.depsTail, n.nextDep = void 0, _e.depsTail.nextDep = n, _e.depsTail = n, _e.deps === n && (_e.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, Hn++, this.notify(t);
    }
    notify(t) {
      vo();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        _o();
      }
    }
  }
  function Sa(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let r = t.deps; r; r = r.nextDep) Sa(r);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const Di = /* @__PURE__ */ new WeakMap(), Xt = /* @__PURE__ */ Symbol(""), $i = /* @__PURE__ */ Symbol(""), Wn = /* @__PURE__ */ Symbol("");
  function Ce(e, t, n) {
    if (je && _e) {
      let r = Di.get(e);
      r || Di.set(e, r = /* @__PURE__ */ new Map());
      let i = r.get(n);
      i || (r.set(n, i = new ii()), i.map = r, i.key = n), i.track();
    }
  }
  function St(e, t, n, r, i, o) {
    const s = Di.get(e);
    if (!s) {
      Hn++;
      return;
    }
    const a = (l) => {
      l && l.trigger();
    };
    if (vo(), t === "clear") s.forEach(a);
    else {
      const l = j(e), u = l && go(n);
      if (l && n === "length") {
        const c = Number(r);
        s.forEach((f, d) => {
          (d === "length" || d === Wn || !ht(d) && d >= c) && a(f);
        });
      } else switch ((n !== void 0 || s.has(void 0)) && a(s.get(n)), u && a(s.get(Wn)), t) {
        case "add":
          l ? u && a(s.get("length")) : (a(s.get(Xt)), fn(e) && a(s.get($i)));
          break;
        case "delete":
          l || (a(s.get(Xt)), fn(e) && a(s.get($i)));
          break;
        case "set":
          fn(e) && a(s.get(Xt));
          break;
      }
    }
    _o();
  }
  function nn(e) {
    const t = re(e);
    return t === e ? t : (Ce(t, "iterate", Wn), qe(e) ? t : t.map(Ze));
  }
  function oi(e) {
    return Ce(e = re(e), "iterate", Wn), e;
  }
  function Bt(e, t) {
    return Pt(e) ? _n(jt(e) ? Ze(t) : t) : Ze(t);
  }
  const wu = {
    __proto__: null,
    [Symbol.iterator]() {
      return xi(this, Symbol.iterator, (e) => Bt(this, e));
    },
    concat(...e) {
      return nn(this).concat(...e.map((t) => j(t) ? nn(t) : t));
    },
    entries() {
      return xi(this, "entries", (e) => (e[1] = Bt(this, e[1]), e));
    },
    every(e, t) {
      return _t(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return _t(this, "filter", e, t, (n) => n.map((r) => Bt(this, r)), arguments);
    },
    find(e, t) {
      return _t(this, "find", e, t, (n) => Bt(this, n), arguments);
    },
    findIndex(e, t) {
      return _t(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return _t(this, "findLast", e, t, (n) => Bt(this, n), arguments);
    },
    findLastIndex(e, t) {
      return _t(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return _t(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return wi(this, "includes", e);
    },
    indexOf(...e) {
      return wi(this, "indexOf", e);
    },
    join(e) {
      return nn(this).join(e);
    },
    lastIndexOf(...e) {
      return wi(this, "lastIndexOf", e);
    },
    map(e, t) {
      return _t(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return kn(this, "pop");
    },
    push(...e) {
      return kn(this, "push", e);
    },
    reduce(e, ...t) {
      return Xo(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return Xo(this, "reduceRight", e, t);
    },
    shift() {
      return kn(this, "shift");
    },
    some(e, t) {
      return _t(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return kn(this, "splice", e);
    },
    toReversed() {
      return nn(this).toReversed();
    },
    toSorted(e) {
      return nn(this).toSorted(e);
    },
    toSpliced(...e) {
      return nn(this).toSpliced(...e);
    },
    unshift(...e) {
      return kn(this, "unshift", e);
    },
    values() {
      return xi(this, "values", (e) => Bt(this, e));
    }
  };
  function xi(e, t, n) {
    const r = oi(e), i = r[t]();
    return r !== e && !qe(e) && (i._next = i.next, i.next = () => {
      const o = i._next();
      return o.done || (o.value = n(o.value)), o;
    }), i;
  }
  const Su = Array.prototype;
  function _t(e, t, n, r, i, o) {
    const s = oi(e), a = s !== e && !qe(e), l = s[t];
    if (l !== Su[t]) {
      const f = l.apply(e, o);
      return a ? Ze(f) : f;
    }
    let u = n;
    s !== e && (a ? u = function(f, d) {
      return n.call(this, Bt(e, f), d, e);
    } : n.length > 2 && (u = function(f, d) {
      return n.call(this, f, d, e);
    }));
    const c = l.call(s, u, r);
    return a && i ? i(c) : c;
  }
  function Xo(e, t, n, r) {
    const i = oi(e);
    let o = n;
    return i !== e && (qe(e) ? n.length > 3 && (o = function(s, a, l) {
      return n.call(this, s, a, l, e);
    }) : o = function(s, a, l) {
      return n.call(this, s, Bt(e, a), l, e);
    }), i[t](o, ...r);
  }
  function wi(e, t, n) {
    const r = re(e);
    Ce(r, "iterate", Wn);
    const i = r[t](...n);
    return (i === -1 || i === false) && So(n[0]) ? (n[0] = re(n[0]), r[t](...n)) : i;
  }
  function kn(e, t, n = []) {
    Et(), vo();
    const r = re(e)[t].apply(e, n);
    return _o(), At(), r;
  }
  const Mu = fo("__proto__,__v_isRef,__isVue"), Ma = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(ht));
  function Tu(e) {
    ht(e) || (e = String(e));
    const t = re(this);
    return Ce(t, "has", e), t.hasOwnProperty(e);
  }
  class Ta {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const i = this._isReadonly, o = this._isShallow;
      if (n === "__v_isReactive") return !i;
      if (n === "__v_isReadonly") return i;
      if (n === "__v_isShallow") return o;
      if (n === "__v_raw") return r === (i ? o ? Bu : Aa : o ? Ea : ka).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const s = j(t);
      if (!i) {
        let l;
        if (s && (l = wu[n])) return l;
        if (n === "hasOwnProperty") return Tu;
      }
      const a = Reflect.get(t, n, Ee(t) ? t : r);
      if ((ht(n) ? Ma.has(n) : Mu(n)) || (i || Ce(t, "get", n), o)) return a;
      if (Ee(a)) {
        const l = s && go(n) ? a : a.value;
        return i && he(l) ? Gi(l) : l;
      }
      return he(a) ? i ? Gi(a) : xo(a) : a;
    }
  }
  class Ca extends Ta {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, i) {
      let o = t[n];
      const s = j(t) && go(n);
      if (!this._isShallow) {
        const u = Pt(o);
        if (!qe(r) && !Pt(r) && (o = re(o), r = re(r)), !s && Ee(o) && !Ee(r)) return u || (o.value = r), true;
      }
      const a = s ? Number(n) < t.length : fe(t, n), l = Reflect.set(t, n, r, Ee(t) ? t : i);
      return t === re(i) && (a ? Oe(r, o) && St(t, "set", n, r) : St(t, "add", n, r)), l;
    }
    deleteProperty(t, n) {
      const r = fe(t, n);
      t[n];
      const i = Reflect.deleteProperty(t, n);
      return i && r && St(t, "delete", n, void 0), i;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!ht(n) || !Ma.has(n)) && Ce(t, "has", n), r;
    }
    ownKeys(t) {
      return Ce(t, "iterate", j(t) ? "length" : Xt), Reflect.ownKeys(t);
    }
  }
  class Cu extends Ta {
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
  const ku = new Ca(), Eu = new Cu(), Au = new Ca(true);
  const Vi = (e) => e, ar = (e) => Reflect.getPrototypeOf(e);
  function Pu(e, t, n) {
    return function(...r) {
      const i = this.__v_raw, o = re(i), s = fn(o), a = e === "entries" || e === Symbol.iterator && s, l = e === "keys" && s, u = i[e](...r), c = n ? Vi : t ? _n : Ze;
      return !t && Ce(o, "iterate", l ? $i : Xt), Se(Object.create(u), {
        next() {
          const { value: f, done: d } = u.next();
          return d ? {
            value: f,
            done: d
          } : {
            value: a ? [
              c(f[0]),
              c(f[1])
            ] : c(f),
            done: d
          };
        }
      });
    };
  }
  function lr(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function Lu(e, t) {
    const n = {
      get(i) {
        const o = this.__v_raw, s = re(o), a = re(i);
        e || (Oe(i, a) && Ce(s, "get", i), Ce(s, "get", a));
        const { has: l } = ar(s), u = t ? Vi : e ? _n : Ze;
        if (l.call(s, i)) return u(o.get(i));
        if (l.call(s, a)) return u(o.get(a));
        o !== s && o.get(i);
      },
      get size() {
        const i = this.__v_raw;
        return !e && Ce(re(i), "iterate", Xt), i.size;
      },
      has(i) {
        const o = this.__v_raw, s = re(o), a = re(i);
        return e || (Oe(i, a) && Ce(s, "has", i), Ce(s, "has", a)), i === a ? o.has(i) : o.has(i) || o.has(a);
      },
      forEach(i, o) {
        const s = this, a = s.__v_raw, l = re(a), u = t ? Vi : e ? _n : Ze;
        return !e && Ce(l, "iterate", Xt), a.forEach((c, f) => i.call(o, u(c), u(f), s));
      }
    };
    return Se(n, e ? {
      add: lr("add"),
      set: lr("set"),
      delete: lr("delete"),
      clear: lr("clear")
    } : {
      add(i) {
        !t && !qe(i) && !Pt(i) && (i = re(i));
        const o = re(this);
        return ar(o).has.call(o, i) || (o.add(i), St(o, "add", i, i)), this;
      },
      set(i, o) {
        !t && !qe(o) && !Pt(o) && (o = re(o));
        const s = re(this), { has: a, get: l } = ar(s);
        let u = a.call(s, i);
        u || (i = re(i), u = a.call(s, i));
        const c = l.call(s, i);
        return s.set(i, o), u ? Oe(o, c) && St(s, "set", i, o) : St(s, "add", i, o), this;
      },
      delete(i) {
        const o = re(this), { has: s, get: a } = ar(o);
        let l = s.call(o, i);
        l || (i = re(i), l = s.call(o, i)), a && a.call(o, i);
        const u = o.delete(i);
        return l && St(o, "delete", i, void 0), u;
      },
      clear() {
        const i = re(this), o = i.size !== 0, s = i.clear();
        return o && St(i, "clear", void 0, void 0), s;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((i) => {
      n[i] = Pu(i, e, t);
    }), n;
  }
  function yo(e, t) {
    const n = Lu(e, t);
    return (r, i, o) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? r : Reflect.get(fe(n, i) && i in r ? n : r, i, o);
  }
  const Ru = {
    get: yo(false, false)
  }, zu = {
    get: yo(false, true)
  }, Nu = {
    get: yo(true, false)
  };
  const ka = /* @__PURE__ */ new WeakMap(), Ea = /* @__PURE__ */ new WeakMap(), Aa = /* @__PURE__ */ new WeakMap(), Bu = /* @__PURE__ */ new WeakMap();
  function Iu(e) {
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
  function Ou(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Iu(au(e));
  }
  function xo(e) {
    return Pt(e) ? e : wo(e, false, ku, Ru, ka);
  }
  function Fu(e) {
    return wo(e, false, Au, zu, Ea);
  }
  function Gi(e) {
    return wo(e, true, Eu, Nu, Aa);
  }
  function wo(e, t, n, r, i) {
    if (!he(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const o = Ou(e);
    if (o === 0) return e;
    const s = i.get(e);
    if (s) return s;
    const a = new Proxy(e, o === 2 ? r : n);
    return i.set(e, a), a;
  }
  function jt(e) {
    return Pt(e) ? jt(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function Pt(e) {
    return !!(e && e.__v_isReadonly);
  }
  function qe(e) {
    return !!(e && e.__v_isShallow);
  }
  function So(e) {
    return e ? !!e.__v_raw : false;
  }
  function re(e) {
    const t = e && e.__v_raw;
    return t ? re(t) : e;
  }
  function Uu(e) {
    return !fe(e, "__v_skip") && Object.isExtensible(e) && fa(e, "__v_skip", true), e;
  }
  const Ze = (e) => he(e) ? xo(e) : e, _n = (e) => he(e) ? Gi(e) : e;
  function Ee(e) {
    return e ? e.__v_isRef === true : false;
  }
  function se(e) {
    return Du(e, false);
  }
  function Du(e, t) {
    return Ee(e) ? e : new $u(e, t);
  }
  class $u {
    constructor(t, n) {
      this.dep = new ii(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : re(t), this._value = n ? t : Ze(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || qe(t) || Pt(t);
      t = r ? t : re(t), Oe(t, n) && (this._rawValue = t, this._value = r ? t : Ze(t), this.dep.trigger());
    }
  }
  function Vu(e) {
    return Ee(e) ? e.value : e;
  }
  const Gu = {
    get: (e, t, n) => t === "__v_raw" ? e : Vu(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const i = e[t];
      return Ee(i) && !Ee(n) ? (i.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function Pa(e) {
    return jt(e) ? e : new Proxy(e, Gu);
  }
  class Hu {
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
  function Wu(e) {
    return new Hu(e);
  }
  class qu {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new ii(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Hn - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && _e !== this) return _a(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return xa(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function Yu(e, t, n = false) {
    let r, i;
    return te(e) ? r = e : (r = e.get, i = e.set), new qu(r, i, n);
  }
  const ur = {}, Ar = /* @__PURE__ */ new WeakMap();
  let Wt;
  function Ku(e, t = false, n = Wt) {
    if (n) {
      let r = Ar.get(n);
      r || Ar.set(n, r = []), r.push(e);
    }
  }
  function Xu(e, t, n = ce) {
    const { immediate: r, deep: i, once: o, scheduler: s, augmentJob: a, call: l } = n, u = (y) => i ? y : qe(y) || i === false || i === 0 ? Mt(y, 1) : Mt(y);
    let c, f, d, h, m = false, _ = false;
    if (Ee(e) ? (f = () => e.value, m = qe(e)) : jt(e) ? (f = () => u(e), m = true) : j(e) ? (_ = true, m = e.some((y) => jt(y) || qe(y)), f = () => e.map((y) => {
      if (Ee(y)) return y.value;
      if (jt(y)) return u(y);
      if (te(y)) return l ? l(y, 2) : y();
    })) : te(e) ? t ? f = l ? () => l(e, 2) : e : f = () => {
      if (d) {
        Et();
        try {
          d();
        } finally {
          At();
        }
      }
      const y = Wt;
      Wt = c;
      try {
        return l ? l(e, 3, [
          h
        ]) : e(h);
      } finally {
        Wt = y;
      }
    } : f = ut, t && i) {
      const y = f, x = i === true ? 1 / 0 : i;
      f = () => Mt(y(), x);
    }
    const z = bu(), G = () => {
      c.stop(), z && z.active && po(z.effects, c);
    };
    if (o && t) {
      const y = t;
      t = (...x) => {
        y(...x), G();
      };
    }
    let T = _ ? new Array(e.length).fill(ur) : ur;
    const M = (y) => {
      if (!(!(c.flags & 1) || !c.dirty && !y)) if (t) {
        const x = c.run();
        if (i || m || (_ ? x.some((C, U) => Oe(C, T[U])) : Oe(x, T))) {
          d && d();
          const C = Wt;
          Wt = c;
          try {
            const U = [
              x,
              T === ur ? void 0 : _ && T[0] === ur ? [] : T,
              h
            ];
            T = x, l ? l(t, 3, U) : t(...U);
          } finally {
            Wt = C;
          }
        }
      } else c.run();
    };
    return a && a(M), c = new ma(f), c.scheduler = s ? () => s(M, false) : M, h = (y) => Ku(y, false, c), d = c.onStop = () => {
      const y = Ar.get(c);
      if (y) {
        if (l) l(y, 4);
        else for (const x of y) x();
        Ar.delete(c);
      }
    }, t ? r ? M(true) : T = c.run() : s ? s(M.bind(null, true), true) : c.run(), G.pause = c.pause.bind(c), G.resume = c.resume.bind(c), G.stop = G, G;
  }
  function Mt(e, t = 1 / 0, n) {
    if (t <= 0 || !he(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
    if (n.set(e, t), t--, Ee(e)) Mt(e.value, t, n);
    else if (j(e)) for (let r = 0; r < e.length; r++) Mt(e[r], t, n);
    else if (ei(e) || fn(e)) e.forEach((r) => {
      Mt(r, t, n);
    });
    else if (ua(e)) {
      for (const r in e) Mt(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && Mt(e[r], t, n);
    }
    return e;
  }
  function rr(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (i) {
      si(i, t, n);
    }
  }
  function Je(e, t, n, r) {
    if (te(e)) {
      const i = rr(e, t, n, r);
      return i && aa(i) && i.catch((o) => {
        si(o, t, n);
      }), i;
    }
    if (j(e)) {
      const i = [];
      for (let o = 0; o < e.length; o++) i.push(Je(e[o], t, n, r));
      return i;
    }
  }
  function si(e, t, n, r = true) {
    const i = t ? t.vnode : null, { errorHandler: o, throwUnhandledErrorInProduction: s } = t && t.appContext.config || ce;
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
      if (o) {
        Et(), rr(o, null, 10, [
          e,
          l,
          u
        ]), At();
        return;
      }
    }
    ju(e, n, i, r, s);
  }
  function ju(e, t, n, r = true, i = false) {
    if (i) throw e;
    console.error(e);
  }
  const Pe = [];
  let ot = -1;
  const dn = [];
  let It = null, an = 0;
  const La = Promise.resolve();
  let Pr = null;
  function ai(e) {
    const t = Pr || La;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function Zu(e) {
    let t = ot + 1, n = Pe.length;
    for (; t < n; ) {
      const r = t + n >>> 1, i = Pe[r], o = qn(i);
      o < e || o === e && i.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function Mo(e) {
    if (!(e.flags & 1)) {
      const t = qn(e), n = Pe[Pe.length - 1];
      !n || !(e.flags & 2) && t >= qn(n) ? Pe.push(e) : Pe.splice(Zu(t), 0, e), e.flags |= 1, Ra();
    }
  }
  function Ra() {
    Pr || (Pr = La.then(Na));
  }
  function Ju(e) {
    j(e) ? dn.push(...e) : It && e.id === -1 ? It.splice(an + 1, 0, e) : e.flags & 1 || (dn.push(e), e.flags |= 1), Ra();
  }
  function jo(e, t, n = ot + 1) {
    for (; n < Pe.length; n++) {
      const r = Pe[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        Pe.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function za(e) {
    if (dn.length) {
      const t = [
        ...new Set(dn)
      ].sort((n, r) => qn(n) - qn(r));
      if (dn.length = 0, It) {
        It.push(...t);
        return;
      }
      for (It = t, an = 0; an < It.length; an++) {
        const n = It[an];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      It = null, an = 0;
    }
  }
  const qn = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function Na(e) {
    try {
      for (ot = 0; ot < Pe.length; ot++) {
        const t = Pe[ot];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), rr(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; ot < Pe.length; ot++) {
        const t = Pe[ot];
        t && (t.flags &= -2);
      }
      ot = -1, Pe.length = 0, za(), Pr = null, (Pe.length || dn.length) && Na();
    }
  }
  let We = null, Ba = null;
  function Lr(e) {
    const t = We;
    return We = e, Ba = e && e.type.__scopeId || null, t;
  }
  function Ia(e, t = We, n) {
    if (!t || e._n) return e;
    const r = (...i) => {
      r._d && Br(-1);
      const o = Lr(t);
      let s;
      try {
        s = e(...i);
      } finally {
        Lr(o), r._d && Br(1);
      }
      return s;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function ye(e, t) {
    if (We === null) return e;
    const n = di(We), r = e.dirs || (e.dirs = []);
    for (let i = 0; i < t.length; i++) {
      let [o, s, a, l = ce] = t[i];
      o && (te(o) && (o = {
        mounted: o,
        updated: o
      }), o.deep && Mt(s), r.push({
        dir: o,
        instance: n,
        value: s,
        oldValue: void 0,
        arg: a,
        modifiers: l
      }));
    }
    return e;
  }
  function $t(e, t, n, r) {
    const i = e.dirs, o = t && t.dirs;
    for (let s = 0; s < i.length; s++) {
      const a = i[s];
      o && (a.oldValue = o[s].value);
      let l = a.dir[r];
      l && (Et(), Je(l, n, 8, [
        e.el,
        a,
        e,
        t
      ]), At());
    }
  }
  function Qu(e, t) {
    if (Re) {
      let n = Re.provides;
      const r = Re.parent && Re.parent.provides;
      r === n && (n = Re.provides = Object.create(r)), n[e] = t;
    }
  }
  function br(e, t, n = false) {
    const r = Po();
    if (r || hn) {
      let i = hn ? hn._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (i && e in i) return i[e];
      if (arguments.length > 1) return n && te(t) ? t.call(r && r.proxy) : t;
    }
  }
  const ec = /* @__PURE__ */ Symbol.for("v-scx"), tc = () => br(ec);
  function nc(e, t) {
    return To(e, null, {
      flush: "sync"
    });
  }
  function Ct(e, t, n) {
    return To(e, t, n);
  }
  function To(e, t, n = ce) {
    const { immediate: r, deep: i, flush: o, once: s } = n, a = Se({}, n), l = t && r || !t && o !== "post";
    let u;
    if (Xn) {
      if (o === "sync") {
        const h = tc();
        u = h.__watcherHandles || (h.__watcherHandles = []);
      } else if (!l) {
        const h = () => {
        };
        return h.stop = ut, h.resume = ut, h.pause = ut, h;
      }
    }
    const c = Re;
    a.call = (h, m, _) => Je(h, c, m, _);
    let f = false;
    o === "post" ? a.scheduler = (h) => {
      Be(h, c && c.suspense);
    } : o !== "sync" && (f = true, a.scheduler = (h, m) => {
      m ? h() : Mo(h);
    }), a.augmentJob = (h) => {
      t && (h.flags |= 4), f && (h.flags |= 2, c && (h.id = c.uid, h.i = c));
    };
    const d = Xu(e, t, a);
    return Xn && (u ? u.push(d) : l && d()), d;
  }
  function rc(e, t, n) {
    const r = this.proxy, i = we(e) ? e.includes(".") ? Oa(r, e) : () => r[e] : e.bind(r, r);
    let o;
    te(t) ? o = t : (o = t.handler, n = t);
    const s = ir(this), a = To(i, o.bind(r), n);
    return s(), a;
  }
  function Oa(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let i = 0; i < n.length && r; i++) r = r[n[i]];
      return r;
    };
  }
  const ic = /* @__PURE__ */ Symbol("_vte"), Fa = (e) => e.__isTeleport, st = /* @__PURE__ */ Symbol("_leaveCb"), En = /* @__PURE__ */ Symbol("_enterCb");
  function oc() {
    const e = {
      isMounted: false,
      isLeaving: false,
      isUnmounting: false,
      leavingVNodes: /* @__PURE__ */ new Map()
    };
    return gt(() => {
      e.isMounted = true;
    }), qa(() => {
      e.isUnmounting = true;
    }), e;
  }
  const Ge = [
    Function,
    Array
  ], Ua = {
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
  }, Da = (e) => {
    const t = e.subTree;
    return t.component ? Da(t.component) : t;
  }, sc = {
    name: "BaseTransition",
    props: Ua,
    setup(e, { slots: t }) {
      const n = Po(), r = oc();
      return () => {
        const i = t.default && Ga(t.default(), true);
        if (!i || !i.length) return;
        const o = $a(i), s = re(e), { mode: a } = s;
        if (r.isLeaving) return Si(o);
        const l = Zo(o);
        if (!l) return Si(o);
        let u = Hi(l, s, r, n, (f) => u = f);
        l.type !== Le && Yn(l, u);
        let c = n.subTree && Zo(n.subTree);
        if (c && c.type !== Le && !qt(c, l) && Da(n).type !== Le) {
          let f = Hi(c, s, r, n);
          if (Yn(c, f), a === "out-in" && l.type !== Le) return r.isLeaving = true, f.afterLeave = () => {
            r.isLeaving = false, n.job.flags & 8 || n.update(), delete f.afterLeave, c = void 0;
          }, Si(o);
          a === "in-out" && l.type !== Le ? f.delayLeave = (d, h, m) => {
            const _ = Va(r, c);
            _[String(c.key)] = c, d[st] = () => {
              h(), d[st] = void 0, delete u.delayedLeave, c = void 0;
            }, u.delayedLeave = () => {
              m(), delete u.delayedLeave, c = void 0;
            };
          } : c = void 0;
        } else c && (c = void 0);
        return o;
      };
    }
  };
  function $a(e) {
    let t = e[0];
    if (e.length > 1) {
      for (const n of e) if (n.type !== Le) {
        t = n;
        break;
      }
    }
    return t;
  }
  const ac = sc;
  function Va(e, t) {
    const { leavingVNodes: n } = e;
    let r = n.get(t.type);
    return r || (r = /* @__PURE__ */ Object.create(null), n.set(t.type, r)), r;
  }
  function Hi(e, t, n, r, i) {
    const { appear: o, mode: s, persisted: a = false, onBeforeEnter: l, onEnter: u, onAfterEnter: c, onEnterCancelled: f, onBeforeLeave: d, onLeave: h, onAfterLeave: m, onLeaveCancelled: _, onBeforeAppear: z, onAppear: G, onAfterAppear: T, onAppearCancelled: M } = t, y = String(e.key), x = Va(n, e), C = (I, O) => {
      I && Je(I, r, 9, O);
    }, U = (I, O) => {
      const q = O[1];
      C(I, O), j(I) ? I.every((w) => w.length <= 1) && q() : I.length <= 1 && q();
    }, K = {
      mode: s,
      persisted: a,
      beforeEnter(I) {
        let O = l;
        if (!n.isMounted) if (o) O = z || l;
        else return;
        I[st] && I[st](true);
        const q = x[y];
        q && qt(e, q) && q.el[st] && q.el[st](), C(O, [
          I
        ]);
      },
      enter(I) {
        let O = u, q = c, w = f;
        if (!n.isMounted) if (o) O = G || u, q = T || c, w = M || f;
        else return;
        let Z = false;
        I[En] = (Y) => {
          Z || (Z = true, Y ? C(w, [
            I
          ]) : C(q, [
            I
          ]), K.delayedLeave && K.delayedLeave(), I[En] = void 0);
        };
        const R = I[En].bind(null, false);
        O ? U(O, [
          I,
          R
        ]) : R();
      },
      leave(I, O) {
        const q = String(e.key);
        if (I[En] && I[En](true), n.isUnmounting) return O();
        C(d, [
          I
        ]);
        let w = false;
        I[st] = (R) => {
          w || (w = true, O(), R ? C(_, [
            I
          ]) : C(m, [
            I
          ]), I[st] = void 0, x[q] === e && delete x[q]);
        };
        const Z = I[st].bind(null, false);
        x[q] = e, h ? U(h, [
          I,
          Z
        ]) : Z();
      },
      clone(I) {
        const O = Hi(I, t, n, r, i);
        return i && i(O), O;
      }
    };
    return K;
  }
  function Si(e) {
    if (li(e)) return e = Ut(e), e.children = null, e;
  }
  function Zo(e) {
    if (!li(e)) return Fa(e.type) && e.children ? $a(e.children) : e;
    if (e.component) return e.component.subTree;
    const { shapeFlag: t, children: n } = e;
    if (n) {
      if (t & 16) return n[0];
      if (t & 32 && te(n.default)) return n.default();
    }
  }
  function Yn(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, Yn(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function Ga(e, t = false, n) {
    let r = [], i = 0;
    for (let o = 0; o < e.length; o++) {
      let s = e[o];
      const a = n == null ? s.key : String(n) + String(s.key != null ? s.key : o);
      s.type === Ue ? (s.patchFlag & 128 && i++, r = r.concat(Ga(s.children, t, a))) : (t || s.type !== Le) && r.push(a != null ? Ut(s, {
        key: a
      }) : s);
    }
    if (i > 1) for (let o = 0; o < r.length; o++) r[o].patchFlag = -2;
    return r;
  }
  function pt(e, t) {
    return te(e) ? Se({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function Ha(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function Jo(e, t) {
    let n;
    return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
  }
  const Rr = /* @__PURE__ */ new WeakMap();
  function Un(e, t, n, r, i = false) {
    if (j(e)) {
      e.forEach((_, z) => Un(_, t && (j(t) ? t[z] : t), n, r, i));
      return;
    }
    if (Dn(r) && !i) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Un(e, t, n, r.component.subTree);
      return;
    }
    const o = r.shapeFlag & 4 ? di(r.component) : r.el, s = i ? null : o, { i: a, r: l } = e, u = t && t.r, c = a.refs === ce ? a.refs = {} : a.refs, f = a.setupState, d = re(f), h = f === ce ? sa : (_) => Jo(c, _) ? false : fe(d, _), m = (_, z) => !(z && Jo(c, z));
    if (u != null && u !== l) {
      if (Qo(t), we(u)) c[u] = null, h(u) && (f[u] = null);
      else if (Ee(u)) {
        const _ = t;
        m(u, _.k) && (u.value = null), _.k && (c[_.k] = null);
      }
    }
    if (te(l)) rr(l, a, 12, [
      s,
      c
    ]);
    else {
      const _ = we(l), z = Ee(l);
      if (_ || z) {
        const G = () => {
          if (e.f) {
            const T = _ ? h(l) ? f[l] : c[l] : m() || !e.k ? l.value : c[e.k];
            if (i) j(T) && po(T, o);
            else if (j(T)) T.includes(o) || T.push(o);
            else if (_) c[l] = [
              o
            ], h(l) && (f[l] = c[l]);
            else {
              const M = [
                o
              ];
              m(l, e.k) && (l.value = M), e.k && (c[e.k] = M);
            }
          } else _ ? (c[l] = s, h(l) && (f[l] = s)) : z && (m(l, e.k) && (l.value = s), e.k && (c[e.k] = s));
        };
        if (s) {
          const T = () => {
            G(), Rr.delete(e);
          };
          T.id = -1, Rr.set(e, T), Be(T, n);
        } else Qo(e), G();
      }
    }
  }
  function Qo(e) {
    const t = Rr.get(e);
    t && (t.flags |= 8, Rr.delete(e));
  }
  ni().requestIdleCallback;
  ni().cancelIdleCallback;
  const Dn = (e) => !!e.type.__asyncLoader, li = (e) => e.type.__isKeepAlive;
  function lc(e, t) {
    Wa(e, "a", t);
  }
  function uc(e, t) {
    Wa(e, "da", t);
  }
  function Wa(e, t, n = Re) {
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
      for (; i && i.parent; ) li(i.parent.vnode) && cc(r, t, n, i), i = i.parent;
    }
  }
  function cc(e, t, n, r) {
    const i = ui(t, e, r, true);
    Sn(() => {
      po(r[t], i);
    }, n);
  }
  function ui(e, t, n = Re, r = false) {
    if (n) {
      const i = n[e] || (n[e] = []), o = t.__weh || (t.__weh = (...s) => {
        Et();
        const a = ir(n), l = Je(t, n, e, s);
        return a(), At(), l;
      });
      return r ? i.unshift(o) : i.push(o), o;
    }
  }
  const Rt = (e) => (t, n = Re) => {
    (!Xn || e === "sp") && ui(e, (...r) => t(...r), n);
  }, fc = Rt("bm"), gt = Rt("m"), dc = Rt("bu"), hc = Rt("u"), qa = Rt("bum"), Sn = Rt("um"), pc = Rt("sp"), gc = Rt("rtg"), mc = Rt("rtc");
  function vc(e, t = Re) {
    ui("ec", e, t);
  }
  const _c = /* @__PURE__ */ Symbol.for("v-ndc");
  function Wi(e, t, n, r) {
    let i;
    const o = n, s = j(e);
    if (s || we(e)) {
      const a = s && jt(e);
      let l = false, u = false;
      a && (l = !qe(e), u = Pt(e), e = oi(e)), i = new Array(e.length);
      for (let c = 0, f = e.length; c < f; c++) i[c] = t(l ? u ? _n(Ze(e[c])) : Ze(e[c]) : e[c], c, void 0, o);
    } else if (typeof e == "number") {
      i = new Array(e);
      for (let a = 0; a < e; a++) i[a] = t(a + 1, a, void 0, o);
    } else if (he(e)) if (e[Symbol.iterator]) i = Array.from(e, (a, l) => t(a, l, void 0, o));
    else {
      const a = Object.keys(e);
      i = new Array(a.length);
      for (let l = 0, u = a.length; l < u; l++) {
        const c = a[l];
        i[l] = t(e[c], c, l, o);
      }
    }
    else i = [];
    return i;
  }
  const qi = (e) => e ? gl(e) ? di(e) : qi(e.parent) : null, $n = Se(/* @__PURE__ */ Object.create(null), {
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
    $options: (e) => Ka(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Mo(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = ai.bind(e.proxy)),
    $watch: (e) => rc.bind(e)
  }), Mi = (e, t) => e !== ce && !e.__isScriptSetup && fe(e, t), bc = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: r, data: i, props: o, accessCache: s, type: a, appContext: l } = e;
      if (t[0] !== "$") {
        const d = s[t];
        if (d !== void 0) switch (d) {
          case 1:
            return r[t];
          case 2:
            return i[t];
          case 4:
            return n[t];
          case 3:
            return o[t];
        }
        else {
          if (Mi(r, t)) return s[t] = 1, r[t];
          if (i !== ce && fe(i, t)) return s[t] = 2, i[t];
          if (fe(o, t)) return s[t] = 3, o[t];
          if (n !== ce && fe(n, t)) return s[t] = 4, n[t];
          Yi && (s[t] = 0);
        }
      }
      const u = $n[t];
      let c, f;
      if (u) return t === "$attrs" && Ce(e.attrs, "get", ""), u(e);
      if ((c = a.__cssModules) && (c = c[t])) return c;
      if (n !== ce && fe(n, t)) return s[t] = 4, n[t];
      if (f = l.config.globalProperties, fe(f, t)) return f[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: i, ctx: o } = e;
      return Mi(i, t) ? (i[t] = n, true) : r !== ce && fe(r, t) ? (r[t] = n, true) : fe(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (o[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, props: o, type: s } }, a) {
      let l;
      return !!(n[a] || e !== ce && a[0] !== "$" && fe(e, a) || Mi(t, a) || fe(o, a) || fe(r, a) || fe($n, a) || fe(i.config.globalProperties, a) || (l = s.__cssModules) && l[a]);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : fe(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function zr(e) {
    return j(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  function Co(e, t) {
    return !e || !t ? e || t : j(e) && j(t) ? e.concat(t) : Se({}, zr(e), zr(t));
  }
  let Yi = true;
  function yc(e) {
    const t = Ka(e), n = e.proxy, r = e.ctx;
    Yi = false, t.beforeCreate && es(t.beforeCreate, e, "bc");
    const { data: i, computed: o, methods: s, watch: a, provide: l, inject: u, created: c, beforeMount: f, mounted: d, beforeUpdate: h, updated: m, activated: _, deactivated: z, beforeDestroy: G, beforeUnmount: T, destroyed: M, unmounted: y, render: x, renderTracked: C, renderTriggered: U, errorCaptured: K, serverPrefetch: I, expose: O, inheritAttrs: q, components: w, directives: Z, filters: R } = t;
    if (u && xc(u, r, null), s) for (const V in s) {
      const H = s[V];
      te(H) && (r[V] = H.bind(n));
    }
    if (i) {
      const V = i.call(n, n);
      he(V) && (e.data = xo(V));
    }
    if (Yi = true, o) for (const V in o) {
      const H = o[V], pe = te(H) ? H.bind(n, n) : te(H.get) ? H.get.bind(n, n) : ut, oe = !te(H) && te(H.set) ? H.set.bind(n) : ut, D = Te({
        get: pe,
        set: oe
      });
      Object.defineProperty(r, V, {
        enumerable: true,
        configurable: true,
        get: () => D.value,
        set: (b) => D.value = b
      });
    }
    if (a) for (const V in a) Ya(a[V], r, n, V);
    if (l) {
      const V = te(l) ? l.call(n) : l;
      Reflect.ownKeys(V).forEach((H) => {
        Qu(H, V[H]);
      });
    }
    c && es(c, e, "c");
    function W(V, H) {
      j(H) ? H.forEach((pe) => V(pe.bind(n))) : H && V(H.bind(n));
    }
    if (W(fc, f), W(gt, d), W(dc, h), W(hc, m), W(lc, _), W(uc, z), W(vc, K), W(mc, C), W(gc, U), W(qa, T), W(Sn, y), W(pc, I), j(O)) if (O.length) {
      const V = e.exposed || (e.exposed = {});
      O.forEach((H) => {
        Object.defineProperty(V, H, {
          get: () => n[H],
          set: (pe) => n[H] = pe,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    x && e.render === ut && (e.render = x), q != null && (e.inheritAttrs = q), w && (e.components = w), Z && (e.directives = Z), I && Ha(e);
  }
  function xc(e, t, n = ut) {
    j(e) && (e = Ki(e));
    for (const r in e) {
      const i = e[r];
      let o;
      he(i) ? "default" in i ? o = br(i.from || r, i.default, true) : o = br(i.from || r) : o = br(i), Ee(o) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => o.value,
        set: (s) => o.value = s
      }) : t[r] = o;
    }
  }
  function es(e, t, n) {
    Je(j(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function Ya(e, t, n, r) {
    let i = r.includes(".") ? Oa(n, r) : () => n[r];
    if (we(e)) {
      const o = t[e];
      te(o) && Ct(i, o);
    } else if (te(e)) Ct(i, e.bind(n));
    else if (he(e)) if (j(e)) e.forEach((o) => Ya(o, t, n, r));
    else {
      const o = te(e.handler) ? e.handler.bind(n) : t[e.handler];
      te(o) && Ct(i, o, e);
    }
  }
  function Ka(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: i, optionsCache: o, config: { optionMergeStrategies: s } } = e.appContext, a = o.get(t);
    let l;
    return a ? l = a : !i.length && !n && !r ? l = t : (l = {}, i.length && i.forEach((u) => Nr(l, u, s, true)), Nr(l, t, s)), he(t) && o.set(t, l), l;
  }
  function Nr(e, t, n, r = false) {
    const { mixins: i, extends: o } = t;
    o && Nr(e, o, n, true), i && i.forEach((s) => Nr(e, s, n, true));
    for (const s in t) if (!(r && s === "expose")) {
      const a = wc[s] || n && n[s];
      e[s] = a ? a(e[s], t[s]) : t[s];
    }
    return e;
  }
  const wc = {
    data: ts,
    props: ns,
    emits: ns,
    methods: Rn,
    computed: Rn,
    beforeCreate: Ae,
    created: Ae,
    beforeMount: Ae,
    mounted: Ae,
    beforeUpdate: Ae,
    updated: Ae,
    beforeDestroy: Ae,
    beforeUnmount: Ae,
    destroyed: Ae,
    unmounted: Ae,
    activated: Ae,
    deactivated: Ae,
    errorCaptured: Ae,
    serverPrefetch: Ae,
    components: Rn,
    directives: Rn,
    watch: Mc,
    provide: ts,
    inject: Sc
  };
  function ts(e, t) {
    return t ? e ? function() {
      return Se(te(e) ? e.call(this, this) : e, te(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function Sc(e, t) {
    return Rn(Ki(e), Ki(t));
  }
  function Ki(e) {
    if (j(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
      return t;
    }
    return e;
  }
  function Ae(e, t) {
    return e ? [
      ...new Set([].concat(e, t))
    ] : t;
  }
  function Rn(e, t) {
    return e ? Se(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function ns(e, t) {
    return e ? j(e) && j(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : Se(/* @__PURE__ */ Object.create(null), zr(e), zr(t ?? {})) : t;
  }
  function Mc(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = Se(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = Ae(e[r], t[r]);
    return n;
  }
  function Xa() {
    return {
      app: null,
      config: {
        isNativeTag: sa,
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
  let Tc = 0;
  function Cc(e, t) {
    return function(r, i = null) {
      te(r) || (r = Se({}, r)), i != null && !he(i) && (i = null);
      const o = Xa(), s = /* @__PURE__ */ new WeakSet(), a = [];
      let l = false;
      const u = o.app = {
        _uid: Tc++,
        _component: r,
        _props: i,
        _container: null,
        _context: o,
        _instance: null,
        version: rf,
        get config() {
          return o.config;
        },
        set config(c) {
        },
        use(c, ...f) {
          return s.has(c) || (c && te(c.install) ? (s.add(c), c.install(u, ...f)) : te(c) && (s.add(c), c(u, ...f))), u;
        },
        mixin(c) {
          return o.mixins.includes(c) || o.mixins.push(c), u;
        },
        component(c, f) {
          return f ? (o.components[c] = f, u) : o.components[c];
        },
        directive(c, f) {
          return f ? (o.directives[c] = f, u) : o.directives[c];
        },
        mount(c, f, d) {
          if (!l) {
            const h = u._ceVNode || xe(r, i);
            return h.appContext = o, d === true ? d = "svg" : d === false && (d = void 0), e(h, c, d), l = true, u._container = c, c.__vue_app__ = u, di(h.component);
          }
        },
        onUnmount(c) {
          a.push(c);
        },
        unmount() {
          l && (Je(a, u._instance, 16), e(null, u._container), delete u._container.__vue_app__);
        },
        provide(c, f) {
          return o.provides[c] = f, u;
        },
        runWithContext(c) {
          const f = hn;
          hn = u;
          try {
            return c();
          } finally {
            hn = f;
          }
        }
      };
      return u;
    };
  }
  let hn = null;
  function Tt(e, t, n = ce) {
    const r = Po(), i = kt(t), o = Dt(t), s = ja(e, i), a = Wu((l, u) => {
      let c, f = ce, d;
      return nc(() => {
        const h = e[i];
        Oe(c, h) && (c = h, u());
      }), {
        get() {
          return l(), n.get ? n.get(c) : c;
        },
        set(h) {
          const m = n.set ? n.set(h) : h;
          if (!Oe(m, c) && !(f !== ce && Oe(h, f))) return;
          const _ = r.vnode.props;
          _ && (t in _ || i in _ || o in _) && (`onUpdate:${t}` in _ || `onUpdate:${i}` in _ || `onUpdate:${o}` in _) || (c = h, u()), r.emit(`update:${t}`, m), Oe(h, m) && Oe(h, f) && !Oe(m, d) && u(), f = h, d = m;
        }
      };
    });
    return a[Symbol.iterator] = () => {
      let l = 0;
      return {
        next() {
          return l < 2 ? {
            value: l++ ? s || ce : a,
            done: false
          } : {
            done: true
          };
        }
      };
    }, a;
  }
  const ja = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${kt(t)}Modifiers`] || e[`${Dt(t)}Modifiers`];
  function kc(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || ce;
    let i = n;
    const o = t.startsWith("update:"), s = o && ja(r, t.slice(7));
    s && (s.trim && (i = n.map((c) => we(c) ? c.trim() : c)), s.number && (i = n.map(mo)));
    let a, l = r[a = _i(t)] || r[a = _i(kt(t))];
    !l && o && (l = r[a = _i(Dt(t))]), l && Je(l, e, 6, i);
    const u = r[a + "Once"];
    if (u) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[a]) return;
      e.emitted[a] = true, Je(u, e, 6, i);
    }
  }
  const Ec = /* @__PURE__ */ new WeakMap();
  function Za(e, t, n = false) {
    const r = n ? Ec : t.emitsCache, i = r.get(e);
    if (i !== void 0) return i;
    const o = e.emits;
    let s = {}, a = false;
    if (!te(e)) {
      const l = (u) => {
        const c = Za(u, t, true);
        c && (a = true, Se(s, c));
      };
      !n && t.mixins.length && t.mixins.forEach(l), e.extends && l(e.extends), e.mixins && e.mixins.forEach(l);
    }
    return !o && !a ? (he(e) && r.set(e, null), null) : (j(o) ? o.forEach((l) => s[l] = null) : Se(s, o), he(e) && r.set(e, s), s);
  }
  function ci(e, t) {
    return !e || !Qr(t) ? false : (t = t.slice(2).replace(/Once$/, ""), fe(e, t[0].toLowerCase() + t.slice(1)) || fe(e, Dt(t)) || fe(e, t));
  }
  function rs(e) {
    const { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [o], slots: s, attrs: a, emit: l, render: u, renderCache: c, props: f, data: d, setupState: h, ctx: m, inheritAttrs: _ } = e, z = Lr(e);
    let G, T;
    try {
      if (n.shapeFlag & 4) {
        const y = i || r, x = y;
        G = at(u.call(x, y, c, f, h, d, m)), T = a;
      } else {
        const y = t;
        G = at(y.length > 1 ? y(f, {
          attrs: a,
          slots: s,
          emit: l
        }) : y(f, null)), T = t.props ? a : Ac(a);
      }
    } catch (y) {
      Vn.length = 0, si(y, e, 1), G = xe(Le);
    }
    let M = G;
    if (T && _ !== false) {
      const y = Object.keys(T), { shapeFlag: x } = M;
      y.length && x & 7 && (o && y.some(ho) && (T = Pc(T, o)), M = Ut(M, T, false, true));
    }
    return n.dirs && (M = Ut(M, null, false, true), M.dirs = M.dirs ? M.dirs.concat(n.dirs) : n.dirs), n.transition && Yn(M, n.transition), G = M, Lr(z), G;
  }
  const Ac = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || Qr(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, Pc = (e, t) => {
    const n = {};
    for (const r in e) (!ho(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function Lc(e, t, n) {
    const { props: r, children: i, component: o } = e, { props: s, children: a, patchFlag: l } = t, u = o.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && l >= 0) {
      if (l & 1024) return true;
      if (l & 16) return r ? is(r, s, u) : !!s;
      if (l & 8) {
        const c = t.dynamicProps;
        for (let f = 0; f < c.length; f++) {
          const d = c[f];
          if (Ja(s, r, d) && !ci(u, d)) return true;
        }
      }
    } else return (i || a) && (!a || !a.$stable) ? true : r === s ? false : r ? s ? is(r, s, u) : true : !!s;
    return false;
  }
  function is(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let i = 0; i < r.length; i++) {
      const o = r[i];
      if (Ja(t, e, o) && !ci(n, o)) return true;
    }
    return false;
  }
  function Ja(e, t, n) {
    const r = e[n], i = t[n];
    return n === "style" && he(r) && he(i) ? !nr(r, i) : r !== i;
  }
  function Rc({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Qa = {}, el = () => Object.create(Qa), tl = (e) => Object.getPrototypeOf(e) === Qa;
  function zc(e, t, n, r = false) {
    const i = {}, o = el();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), nl(e, t, i, o);
    for (const s in e.propsOptions[0]) s in i || (i[s] = void 0);
    n ? e.props = r ? i : Fu(i) : e.type.props ? e.props = i : e.props = o, e.attrs = o;
  }
  function Nc(e, t, n, r) {
    const { props: i, attrs: o, vnode: { patchFlag: s } } = e, a = re(i), [l] = e.propsOptions;
    let u = false;
    if ((r || s > 0) && !(s & 16)) {
      if (s & 8) {
        const c = e.vnode.dynamicProps;
        for (let f = 0; f < c.length; f++) {
          let d = c[f];
          if (ci(e.emitsOptions, d)) continue;
          const h = t[d];
          if (l) if (fe(o, d)) h !== o[d] && (o[d] = h, u = true);
          else {
            const m = kt(d);
            i[m] = Xi(l, a, m, h, e, false);
          }
          else h !== o[d] && (o[d] = h, u = true);
        }
      }
    } else {
      nl(e, t, i, o) && (u = true);
      let c;
      for (const f in a) (!t || !fe(t, f) && ((c = Dt(f)) === f || !fe(t, c))) && (l ? n && (n[f] !== void 0 || n[c] !== void 0) && (i[f] = Xi(l, a, f, void 0, e, true)) : delete i[f]);
      if (o !== a) for (const f in o) (!t || !fe(t, f)) && (delete o[f], u = true);
    }
    u && St(e.attrs, "set", "");
  }
  function nl(e, t, n, r) {
    const [i, o] = e.propsOptions;
    let s = false, a;
    if (t) for (let l in t) {
      if (In(l)) continue;
      const u = t[l];
      let c;
      i && fe(i, c = kt(l)) ? !o || !o.includes(c) ? n[c] = u : (a || (a = {}))[c] = u : ci(e.emitsOptions, l) || (!(l in r) || u !== r[l]) && (r[l] = u, s = true);
    }
    if (o) {
      const l = re(n), u = a || ce;
      for (let c = 0; c < o.length; c++) {
        const f = o[c];
        n[f] = Xi(i, l, f, u[f], e, !fe(u, f));
      }
    }
    return s;
  }
  function Xi(e, t, n, r, i, o) {
    const s = e[n];
    if (s != null) {
      const a = fe(s, "default");
      if (a && r === void 0) {
        const l = s.default;
        if (s.type !== Function && !s.skipFactory && te(l)) {
          const { propsDefaults: u } = i;
          if (n in u) r = u[n];
          else {
            const c = ir(i);
            r = u[n] = l.call(null, t), c();
          }
        } else r = l;
        i.ce && i.ce._setProp(n, r);
      }
      s[0] && (o && !a ? r = false : s[1] && (r === "" || r === Dt(n)) && (r = true));
    }
    return r;
  }
  const Bc = /* @__PURE__ */ new WeakMap();
  function rl(e, t, n = false) {
    const r = n ? Bc : t.propsCache, i = r.get(e);
    if (i) return i;
    const o = e.props, s = {}, a = [];
    let l = false;
    if (!te(e)) {
      const c = (f) => {
        l = true;
        const [d, h] = rl(f, t, true);
        Se(s, d), h && a.push(...h);
      };
      !n && t.mixins.length && t.mixins.forEach(c), e.extends && c(e.extends), e.mixins && e.mixins.forEach(c);
    }
    if (!o && !l) return he(e) && r.set(e, cn), cn;
    if (j(o)) for (let c = 0; c < o.length; c++) {
      const f = kt(o[c]);
      os(f) && (s[f] = ce);
    }
    else if (o) for (const c in o) {
      const f = kt(c);
      if (os(f)) {
        const d = o[c], h = s[f] = j(d) || te(d) ? {
          type: d
        } : Se({}, d), m = h.type;
        let _ = false, z = true;
        if (j(m)) for (let G = 0; G < m.length; ++G) {
          const T = m[G], M = te(T) && T.name;
          if (M === "Boolean") {
            _ = true;
            break;
          } else M === "String" && (z = false);
        }
        else _ = te(m) && m.name === "Boolean";
        h[0] = _, h[1] = z, (_ || fe(h, "default")) && a.push(f);
      }
    }
    const u = [
      s,
      a
    ];
    return he(e) && r.set(e, u), u;
  }
  function os(e) {
    return e[0] !== "$" && !In(e);
  }
  const ko = (e) => e === "_" || e === "_ctx" || e === "$stable", Eo = (e) => j(e) ? e.map(at) : [
    at(e)
  ], Ic = (e, t, n) => {
    if (t._n) return t;
    const r = Ia((...i) => Eo(t(...i)), n);
    return r._c = false, r;
  }, il = (e, t, n) => {
    const r = e._ctx;
    for (const i in e) {
      if (ko(i)) continue;
      const o = e[i];
      if (te(o)) t[i] = Ic(i, o, r);
      else if (o != null) {
        const s = Eo(o);
        t[i] = () => s;
      }
    }
  }, ol = (e, t) => {
    const n = Eo(t);
    e.slots.default = () => n;
  }, sl = (e, t, n) => {
    for (const r in t) (n || !ko(r)) && (e[r] = t[r]);
  }, Oc = (e, t, n) => {
    const r = e.slots = el();
    if (e.vnode.shapeFlag & 32) {
      const i = t._;
      i ? (sl(r, t, n), n && fa(r, "_", i, true)) : il(t, r);
    } else t && ol(e, t);
  }, Fc = (e, t, n) => {
    const { vnode: r, slots: i } = e;
    let o = true, s = ce;
    if (r.shapeFlag & 32) {
      const a = t._;
      a ? n && a === 1 ? o = false : sl(i, t, n) : (o = !t.$stable, il(t, i)), s = t;
    } else t && (ol(e, t), s = {
      default: 1
    });
    if (o) for (const a in i) !ko(a) && s[a] == null && delete i[a];
  }, Be = Gc;
  function Uc(e) {
    return Dc(e);
  }
  function Dc(e, t) {
    const n = ni();
    n.__VUE__ = true;
    const { insert: r, remove: i, patchProp: o, createElement: s, createText: a, createComment: l, setText: u, setElementText: c, parentNode: f, nextSibling: d, setScopeId: h = ut, insertStaticContent: m } = e, _ = (p, v, S, P = null, k = null, E = null, F = void 0, B = null, N = !!v.dynamicChildren) => {
      if (p === v) return;
      p && !qt(p, v) && (P = vt(p), b(p, k, E, true), p = null), v.patchFlag === -2 && (N = false, v.dynamicChildren = null);
      const { type: A, ref: J, shapeFlag: $ } = v;
      switch (A) {
        case fi:
          z(p, v, S, P);
          break;
        case Le:
          G(p, v, S, P);
          break;
        case yr:
          p == null && T(v, S, P, F);
          break;
        case Ue:
          w(p, v, S, P, k, E, F, B, N);
          break;
        default:
          $ & 1 ? x(p, v, S, P, k, E, F, B, N) : $ & 6 ? Z(p, v, S, P, k, E, F, B, N) : ($ & 64 || $ & 128) && A.process(p, v, S, P, k, E, F, B, N, Tn);
      }
      J != null && k ? Un(J, p && p.ref, E, v || p, !v) : J == null && p && p.ref != null && Un(p.ref, null, E, p, true);
    }, z = (p, v, S, P) => {
      if (p == null) r(v.el = a(v.children), S, P);
      else {
        const k = v.el = p.el;
        v.children !== p.children && u(k, v.children);
      }
    }, G = (p, v, S, P) => {
      p == null ? r(v.el = l(v.children || ""), S, P) : v.el = p.el;
    }, T = (p, v, S, P) => {
      [p.el, p.anchor] = m(p.children, v, S, P, p.el, p.anchor);
    }, M = ({ el: p, anchor: v }, S, P) => {
      let k;
      for (; p && p !== v; ) k = d(p), r(p, S, P), p = k;
      r(v, S, P);
    }, y = ({ el: p, anchor: v }) => {
      let S;
      for (; p && p !== v; ) S = d(p), i(p), p = S;
      i(v);
    }, x = (p, v, S, P, k, E, F, B, N) => {
      if (v.type === "svg" ? F = "svg" : v.type === "math" && (F = "mathml"), p == null) C(v, S, P, k, E, F, B, N);
      else {
        const A = p.el && p.el._isVueCE ? p.el : null;
        try {
          A && A._beginPatch(), I(p, v, k, E, F, B, N);
        } finally {
          A && A._endPatch();
        }
      }
    }, C = (p, v, S, P, k, E, F, B) => {
      let N, A;
      const { props: J, shapeFlag: $, transition: X, dirs: ee } = p;
      if (N = p.el = s(p.type, E, J && J.is, J), $ & 8 ? c(N, p.children) : $ & 16 && K(p.children, N, null, P, k, Ti(p, E), F, B), ee && $t(p, null, P, "created"), U(N, p, p.scopeId, F, P), J) {
        for (const me in J) me !== "value" && !In(me) && o(N, me, null, J[me], E, P);
        "value" in J && o(N, "value", null, J.value, E), (A = J.onVnodeBeforeMount) && it(A, P, p);
      }
      ee && $t(p, null, P, "beforeMount");
      const ie = $c(k, X);
      ie && X.beforeEnter(N), r(N, v, S), ((A = J && J.onVnodeMounted) || ie || ee) && Be(() => {
        A && it(A, P, p), ie && X.enter(N), ee && $t(p, null, P, "mounted");
      }, k);
    }, U = (p, v, S, P, k) => {
      if (S && h(p, S), P) for (let E = 0; E < P.length; E++) h(p, P[E]);
      if (k) {
        let E = k.subTree;
        if (v === E || cl(E.type) && (E.ssContent === v || E.ssFallback === v)) {
          const F = k.vnode;
          U(p, F, F.scopeId, F.slotScopeIds, k.parent);
        }
      }
    }, K = (p, v, S, P, k, E, F, B, N = 0) => {
      for (let A = N; A < p.length; A++) {
        const J = p[A] = B ? wt(p[A]) : at(p[A]);
        _(null, J, v, S, P, k, E, F, B);
      }
    }, I = (p, v, S, P, k, E, F) => {
      const B = v.el = p.el;
      let { patchFlag: N, dynamicChildren: A, dirs: J } = v;
      N |= p.patchFlag & 16;
      const $ = p.props || ce, X = v.props || ce;
      let ee;
      if (S && Vt(S, false), (ee = X.onVnodeBeforeUpdate) && it(ee, S, v, p), J && $t(v, p, S, "beforeUpdate"), S && Vt(S, true), ($.innerHTML && X.innerHTML == null || $.textContent && X.textContent == null) && c(B, ""), A ? O(p.dynamicChildren, A, B, S, P, Ti(v, k), E) : F || H(p, v, B, null, S, P, Ti(v, k), E, false), N > 0) {
        if (N & 16) q(B, $, X, S, k);
        else if (N & 2 && $.class !== X.class && o(B, "class", null, X.class, k), N & 4 && o(B, "style", $.style, X.style, k), N & 8) {
          const ie = v.dynamicProps;
          for (let me = 0; me < ie.length; me++) {
            const ge = ie[me], ze = $[ge], Ne = X[ge];
            (Ne !== ze || ge === "value") && o(B, ge, ze, Ne, k, S);
          }
        }
        N & 1 && p.children !== v.children && c(B, v.children);
      } else !F && A == null && q(B, $, X, S, k);
      ((ee = X.onVnodeUpdated) || J) && Be(() => {
        ee && it(ee, S, v, p), J && $t(v, p, S, "updated");
      }, P);
    }, O = (p, v, S, P, k, E, F) => {
      for (let B = 0; B < v.length; B++) {
        const N = p[B], A = v[B], J = N.el && (N.type === Ue || !qt(N, A) || N.shapeFlag & 198) ? f(N.el) : S;
        _(N, A, J, null, P, k, E, F, true);
      }
    }, q = (p, v, S, P, k) => {
      if (v !== S) {
        if (v !== ce) for (const E in v) !In(E) && !(E in S) && o(p, E, v[E], null, k, P);
        for (const E in S) {
          if (In(E)) continue;
          const F = S[E], B = v[E];
          F !== B && E !== "value" && o(p, E, B, F, k, P);
        }
        "value" in S && o(p, "value", v.value, S.value, k);
      }
    }, w = (p, v, S, P, k, E, F, B, N) => {
      const A = v.el = p ? p.el : a(""), J = v.anchor = p ? p.anchor : a("");
      let { patchFlag: $, dynamicChildren: X, slotScopeIds: ee } = v;
      ee && (B = B ? B.concat(ee) : ee), p == null ? (r(A, S, P), r(J, S, P), K(v.children || [], S, J, k, E, F, B, N)) : $ > 0 && $ & 64 && X && p.dynamicChildren && p.dynamicChildren.length === X.length ? (O(p.dynamicChildren, X, S, k, E, F, B), (v.key != null || k && v === k.subTree) && al(p, v, true)) : H(p, v, S, J, k, E, F, B, N);
    }, Z = (p, v, S, P, k, E, F, B, N) => {
      v.slotScopeIds = B, p == null ? v.shapeFlag & 512 ? k.ctx.activate(v, S, P, F, N) : R(v, S, P, k, E, F, N) : Y(p, v, N);
    }, R = (p, v, S, P, k, E, F) => {
      const B = p.component = jc(p, P, k);
      if (li(p) && (B.ctx.renderer = Tn), Zc(B, false, F), B.asyncDep) {
        if (k && k.registerDep(B, W, F), !p.el) {
          const N = B.subTree = xe(Le);
          G(null, N, v, S), p.placeholder = N.el;
        }
      } else W(B, p, v, S, k, E, F);
    }, Y = (p, v, S) => {
      const P = v.component = p.component;
      if (Lc(p, v, S)) if (P.asyncDep && !P.asyncResolved) {
        V(P, v, S);
        return;
      } else P.next = v, P.update();
      else v.el = p.el, P.vnode = v;
    }, W = (p, v, S, P, k, E, F) => {
      const B = () => {
        if (p.isMounted) {
          let { next: $, bu: X, u: ee, parent: ie, vnode: me } = p;
          {
            const nt = ll(p);
            if (nt) {
              $ && ($.el = me.el, V(p, $, F)), nt.asyncDep.then(() => {
                Be(() => {
                  p.isUnmounted || A();
                }, k);
              });
              return;
            }
          }
          let ge = $, ze;
          Vt(p, false), $ ? ($.el = me.el, V(p, $, F)) : $ = me, X && _r(X), (ze = $.props && $.props.onVnodeBeforeUpdate) && it(ze, ie, $, me), Vt(p, true);
          const Ne = rs(p), tt = p.subTree;
          p.subTree = Ne, _(tt, Ne, f(tt.el), vt(tt), p, k, E), $.el = Ne.el, ge === null && Rc(p, Ne.el), ee && Be(ee, k), (ze = $.props && $.props.onVnodeUpdated) && Be(() => it(ze, ie, $, me), k);
        } else {
          let $;
          const { el: X, props: ee } = v, { bm: ie, m: me, parent: ge, root: ze, type: Ne } = p, tt = Dn(v);
          Vt(p, false), ie && _r(ie), !tt && ($ = ee && ee.onVnodeBeforeMount) && it($, ge, v), Vt(p, true);
          {
            ze.ce && ze.ce._hasShadowRoot() && ze.ce._injectChildStyle(Ne);
            const nt = p.subTree = rs(p);
            _(null, nt, S, P, p, k, E), v.el = nt.el;
          }
          if (me && Be(me, k), !tt && ($ = ee && ee.onVnodeMounted)) {
            const nt = v;
            Be(() => it($, ge, nt), k);
          }
          (v.shapeFlag & 256 || ge && Dn(ge.vnode) && ge.vnode.shapeFlag & 256) && p.a && Be(p.a, k), p.isMounted = true, v = S = P = null;
        }
      };
      p.scope.on();
      const N = p.effect = new ma(B);
      p.scope.off();
      const A = p.update = N.run.bind(N), J = p.job = N.runIfDirty.bind(N);
      J.i = p, J.id = p.uid, N.scheduler = () => Mo(J), Vt(p, true), A();
    }, V = (p, v, S) => {
      v.component = p;
      const P = p.vnode.props;
      p.vnode = v, p.next = null, Nc(p, v.props, P, S), Fc(p, v.children, S), Et(), jo(p), At();
    }, H = (p, v, S, P, k, E, F, B, N = false) => {
      const A = p && p.children, J = p ? p.shapeFlag : 0, $ = v.children, { patchFlag: X, shapeFlag: ee } = v;
      if (X > 0) {
        if (X & 128) {
          oe(A, $, S, P, k, E, F, B, N);
          return;
        } else if (X & 256) {
          pe(A, $, S, P, k, E, F, B, N);
          return;
        }
      }
      ee & 8 ? (J & 16 && Ve(A, k, E), $ !== A && c(S, $)) : J & 16 ? ee & 16 ? oe(A, $, S, P, k, E, F, B, N) : Ve(A, k, E, true) : (J & 8 && c(S, ""), ee & 16 && K($, S, P, k, E, F, B, N));
    }, pe = (p, v, S, P, k, E, F, B, N) => {
      p = p || cn, v = v || cn;
      const A = p.length, J = v.length, $ = Math.min(A, J);
      let X;
      for (X = 0; X < $; X++) {
        const ee = v[X] = N ? wt(v[X]) : at(v[X]);
        _(p[X], ee, S, null, k, E, F, B, N);
      }
      A > J ? Ve(p, k, E, true, false, $) : K(v, S, P, k, E, F, B, N, $);
    }, oe = (p, v, S, P, k, E, F, B, N) => {
      let A = 0;
      const J = v.length;
      let $ = p.length - 1, X = J - 1;
      for (; A <= $ && A <= X; ) {
        const ee = p[A], ie = v[A] = N ? wt(v[A]) : at(v[A]);
        if (qt(ee, ie)) _(ee, ie, S, null, k, E, F, B, N);
        else break;
        A++;
      }
      for (; A <= $ && A <= X; ) {
        const ee = p[$], ie = v[X] = N ? wt(v[X]) : at(v[X]);
        if (qt(ee, ie)) _(ee, ie, S, null, k, E, F, B, N);
        else break;
        $--, X--;
      }
      if (A > $) {
        if (A <= X) {
          const ee = X + 1, ie = ee < J ? v[ee].el : P;
          for (; A <= X; ) _(null, v[A] = N ? wt(v[A]) : at(v[A]), S, ie, k, E, F, B, N), A++;
        }
      } else if (A > X) for (; A <= $; ) b(p[A], k, E, true), A++;
      else {
        const ee = A, ie = A, me = /* @__PURE__ */ new Map();
        for (A = ie; A <= X; A++) {
          const Fe = v[A] = N ? wt(v[A]) : at(v[A]);
          Fe.key != null && me.set(Fe.key, A);
        }
        let ge, ze = 0;
        const Ne = X - ie + 1;
        let tt = false, nt = 0;
        const Cn = new Array(Ne);
        for (A = 0; A < Ne; A++) Cn[A] = 0;
        for (A = ee; A <= $; A++) {
          const Fe = p[A];
          if (ze >= Ne) {
            b(Fe, k, E, true);
            continue;
          }
          let rt;
          if (Fe.key != null) rt = me.get(Fe.key);
          else for (ge = ie; ge <= X; ge++) if (Cn[ge - ie] === 0 && qt(Fe, v[ge])) {
            rt = ge;
            break;
          }
          rt === void 0 ? b(Fe, k, E, true) : (Cn[rt - ie] = A + 1, rt >= nt ? nt = rt : tt = true, _(Fe, v[rt], S, null, k, E, F, B, N), ze++);
        }
        const Go = tt ? Vc(Cn) : cn;
        for (ge = Go.length - 1, A = Ne - 1; A >= 0; A--) {
          const Fe = ie + A, rt = v[Fe], Ho = v[Fe + 1], Wo = Fe + 1 < J ? Ho.el || ul(Ho) : P;
          Cn[A] === 0 ? _(null, rt, S, Wo, k, E, F, B, N) : tt && (ge < 0 || A !== Go[ge] ? D(rt, S, Wo, 2) : ge--);
        }
      }
    }, D = (p, v, S, P, k = null) => {
      const { el: E, type: F, transition: B, children: N, shapeFlag: A } = p;
      if (A & 6) {
        D(p.component.subTree, v, S, P);
        return;
      }
      if (A & 128) {
        p.suspense.move(v, S, P);
        return;
      }
      if (A & 64) {
        F.move(p, v, S, Tn);
        return;
      }
      if (F === Ue) {
        r(E, v, S);
        for (let $ = 0; $ < N.length; $++) D(N[$], v, S, P);
        r(p.anchor, v, S);
        return;
      }
      if (F === yr) {
        M(p, v, S);
        return;
      }
      if (P !== 2 && A & 1 && B) if (P === 0) B.beforeEnter(E), r(E, v, S), Be(() => B.enter(E), k);
      else {
        const { leave: $, delayLeave: X, afterLeave: ee } = B, ie = () => {
          p.ctx.isUnmounted ? i(E) : r(E, v, S);
        }, me = () => {
          E._isLeaving && E[st](true), $(E, () => {
            ie(), ee && ee();
          });
        };
        X ? X(E, ie, me) : me();
      }
      else r(E, v, S);
    }, b = (p, v, S, P = false, k = false) => {
      const { type: E, props: F, ref: B, children: N, dynamicChildren: A, shapeFlag: J, patchFlag: $, dirs: X, cacheIndex: ee } = p;
      if ($ === -2 && (k = false), B != null && (Et(), Un(B, null, S, p, true), At()), ee != null && (v.renderCache[ee] = void 0), J & 256) {
        v.ctx.deactivate(p);
        return;
      }
      const ie = J & 1 && X, me = !Dn(p);
      let ge;
      if (me && (ge = F && F.onVnodeBeforeUnmount) && it(ge, v, p), J & 6) et(p.component, S, P);
      else {
        if (J & 128) {
          p.suspense.unmount(S, P);
          return;
        }
        ie && $t(p, null, v, "beforeUnmount"), J & 64 ? p.type.remove(p, v, S, Tn, P) : A && !A.hasOnce && (E !== Ue || $ > 0 && $ & 64) ? Ve(A, v, S, false, true) : (E === Ue && $ & 384 || !k && J & 16) && Ve(N, v, S), P && L(p);
      }
      (me && (ge = F && F.onVnodeUnmounted) || ie) && Be(() => {
        ge && it(ge, v, p), ie && $t(p, null, v, "unmounted");
      }, S);
    }, L = (p) => {
      const { type: v, el: S, anchor: P, transition: k } = p;
      if (v === Ue) {
        Me(S, P);
        return;
      }
      if (v === yr) {
        y(p);
        return;
      }
      const E = () => {
        i(S), k && !k.persisted && k.afterLeave && k.afterLeave();
      };
      if (p.shapeFlag & 1 && k && !k.persisted) {
        const { leave: F, delayLeave: B } = k, N = () => F(S, E);
        B ? B(p.el, E, N) : N();
      } else E();
    }, Me = (p, v) => {
      let S;
      for (; p !== v; ) S = d(p), i(p), p = S;
      i(v);
    }, et = (p, v, S) => {
      const { bum: P, scope: k, job: E, subTree: F, um: B, m: N, a: A } = p;
      ss(N), ss(A), P && _r(P), k.stop(), E && (E.flags |= 8, b(F, p, v, S)), B && Be(B, v), Be(() => {
        p.isUnmounted = true;
      }, v);
    }, Ve = (p, v, S, P = false, k = false, E = 0) => {
      for (let F = E; F < p.length; F++) b(p[F], v, S, P, k);
    }, vt = (p) => {
      if (p.shapeFlag & 6) return vt(p.component.subTree);
      if (p.shapeFlag & 128) return p.suspense.next();
      const v = d(p.anchor || p.el), S = v && v[ic];
      return S ? d(S) : v;
    };
    let vi = false;
    const Vo = (p, v, S) => {
      let P;
      p == null ? v._vnode && (b(v._vnode, null, null, true), P = v._vnode.component) : _(v._vnode || null, p, v, null, null, null, S), v._vnode = p, vi || (vi = true, jo(P), za(), vi = false);
    }, Tn = {
      p: _,
      um: b,
      m: D,
      r: L,
      mt: R,
      mc: K,
      pc: H,
      pbc: O,
      n: vt,
      o: e
    };
    return {
      render: Vo,
      hydrate: void 0,
      createApp: Cc(Vo)
    };
  }
  function Ti({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function Vt({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function $c(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function al(e, t, n = false) {
    const r = e.children, i = t.children;
    if (j(r) && j(i)) for (let o = 0; o < r.length; o++) {
      const s = r[o];
      let a = i[o];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[o] = wt(i[o]), a.el = s.el), !n && a.patchFlag !== -2 && al(s, a)), a.type === fi && (a.patchFlag === -1 && (a = i[o] = wt(a)), a.el = s.el), a.type === Le && !a.el && (a.el = s.el);
    }
  }
  function Vc(e) {
    const t = e.slice(), n = [
      0
    ];
    let r, i, o, s, a;
    const l = e.length;
    for (r = 0; r < l; r++) {
      const u = e[r];
      if (u !== 0) {
        if (i = n[n.length - 1], e[i] < u) {
          t[r] = i, n.push(r);
          continue;
        }
        for (o = 0, s = n.length - 1; o < s; ) a = o + s >> 1, e[n[a]] < u ? o = a + 1 : s = a;
        u < e[n[o]] && (o > 0 && (t[r] = n[o - 1]), n[o] = r);
      }
    }
    for (o = n.length, s = n[o - 1]; o-- > 0; ) n[o] = s, s = t[s];
    return n;
  }
  function ll(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : ll(t);
  }
  function ss(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  function ul(e) {
    if (e.placeholder) return e.placeholder;
    const t = e.component;
    return t ? ul(t.subTree) : null;
  }
  const cl = (e) => e.__isSuspense;
  function Gc(e, t) {
    t && t.pendingBranch ? j(e) ? t.effects.push(...e) : t.effects.push(e) : Ju(e);
  }
  const Ue = /* @__PURE__ */ Symbol.for("v-fgt"), fi = /* @__PURE__ */ Symbol.for("v-txt"), Le = /* @__PURE__ */ Symbol.for("v-cmt"), yr = /* @__PURE__ */ Symbol.for("v-stc"), Vn = [];
  let De = null;
  function le(e = false) {
    Vn.push(De = e ? null : []);
  }
  function Hc() {
    Vn.pop(), De = Vn[Vn.length - 1] || null;
  }
  let Kn = 1;
  function Br(e, t = false) {
    Kn += e, e < 0 && De && t && (De.hasOnce = true);
  }
  function fl(e) {
    return e.dynamicChildren = Kn > 0 ? De || cn : null, Hc(), Kn > 0 && De && De.push(e), e;
  }
  function de(e, t, n, r, i, o) {
    return fl(g(e, t, n, r, i, o, true));
  }
  function dl(e, t, n, r, i) {
    return fl(xe(e, t, n, r, i, true));
  }
  function Ir(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function qt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const hl = ({ key: e }) => e ?? null, xr = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? we(e) || Ee(e) || te(e) ? {
    i: We,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function g(e, t = null, n = null, r = 0, i = null, o = e === Ue ? 0 : 1, s = false, a = false) {
    const l = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && hl(t),
      ref: t && xr(t),
      scopeId: Ba,
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
      shapeFlag: o,
      patchFlag: r,
      dynamicProps: i,
      dynamicChildren: null,
      appContext: null,
      ctx: We
    };
    return a ? (Ao(l, n), o & 128 && e.normalize(l)) : n && (l.shapeFlag |= we(n) ? 8 : 16), Kn > 0 && !s && De && (l.patchFlag > 0 || o & 6) && l.patchFlag !== 32 && De.push(l), l;
  }
  const xe = Wc;
  function Wc(e, t = null, n = null, r = 0, i = null, o = false) {
    if ((!e || e === _c) && (e = Le), Ir(e)) {
      const a = Ut(e, t, true);
      return n && Ao(a, n), Kn > 0 && !o && De && (a.shapeFlag & 6 ? De[De.indexOf(e)] = a : De.push(a)), a.patchFlag = -2, a;
    }
    if (tf(e) && (e = e.__vccOpts), t) {
      t = qc(t);
      let { class: a, style: l } = t;
      a && !we(a) && (t.class = be(a)), he(l) && (So(l) && !j(l) && (l = Se({}, l)), t.style = ri(l));
    }
    const s = we(e) ? 1 : cl(e) ? 128 : Fa(e) ? 64 : he(e) ? 4 : te(e) ? 2 : 0;
    return g(e, t, n, r, i, s, o, true);
  }
  function qc(e) {
    return e ? So(e) || tl(e) ? Se({}, e) : e : null;
  }
  function Ut(e, t, n = false, r = false) {
    const { props: i, ref: o, patchFlag: s, children: a, transition: l } = e, u = t ? Yc(i || {}, t) : i, c = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: u,
      key: u && hl(u),
      ref: t && t.ref ? n && o ? j(o) ? o.concat(xr(t)) : [
        o,
        xr(t)
      ] : xr(t) : o,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: a,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== Ue ? s === -1 ? 16 : s | 16 : s,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: l,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && Ut(e.ssContent),
      ssFallback: e.ssFallback && Ut(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return l && r && Yn(c, l.clone(c)), c;
  }
  function ae(e = " ", t = 0) {
    return xe(fi, null, e, t);
  }
  function pl(e, t) {
    const n = xe(yr, null, e);
    return n.staticCount = t, n;
  }
  function Ft(e = "", t = false) {
    return t ? (le(), dl(Le, null, e)) : xe(Le, null, e);
  }
  function at(e) {
    return e == null || typeof e == "boolean" ? xe(Le) : j(e) ? xe(Ue, null, e.slice()) : Ir(e) ? wt(e) : xe(fi, null, String(e));
  }
  function wt(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : Ut(e);
  }
  function Ao(e, t) {
    let n = 0;
    const { shapeFlag: r } = e;
    if (t == null) t = null;
    else if (j(t)) n = 16;
    else if (typeof t == "object") if (r & 65) {
      const i = t.default;
      i && (i._c && (i._d = false), Ao(e, i()), i._c && (i._d = true));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !tl(t) ? t._ctx = We : i === 3 && We && (We.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else te(t) ? (t = {
      default: t,
      _ctx: We
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      ae(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function Yc(...e) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n];
      for (const i in r) if (i === "class") t.class !== r.class && (t.class = be([
        t.class,
        r.class
      ]));
      else if (i === "style") t.style = ri([
        t.style,
        r.style
      ]);
      else if (Qr(i)) {
        const o = t[i], s = r[i];
        s && o !== s && !(j(o) && o.includes(s)) && (t[i] = o ? [].concat(o, s) : s);
      } else i !== "" && (t[i] = r[i]);
    }
    return t;
  }
  function it(e, t, n, r = null) {
    Je(e, t, 7, [
      n,
      r
    ]);
  }
  const Kc = Xa();
  let Xc = 0;
  function jc(e, t, n) {
    const r = e.type, i = (t ? t.appContext : e.appContext) || Kc, o = {
      uid: Xc++,
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
      scope: new _u(true),
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
      propsOptions: rl(r, i),
      emitsOptions: Za(r, i),
      emit: null,
      emitted: null,
      propsDefaults: ce,
      inheritAttrs: r.inheritAttrs,
      ctx: ce,
      data: ce,
      props: ce,
      attrs: ce,
      slots: ce,
      refs: ce,
      setupState: ce,
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
    return o.ctx = {
      _: o
    }, o.root = t ? t.root : o, o.emit = kc.bind(null, o), e.ce && e.ce(o), o;
  }
  let Re = null;
  const Po = () => Re || We;
  let Or, ji;
  {
    const e = ni(), t = (n, r) => {
      let i;
      return (i = e[n]) || (i = e[n] = []), i.push(r), (o) => {
        i.length > 1 ? i.forEach((s) => s(o)) : i[0](o);
      };
    };
    Or = t("__VUE_INSTANCE_SETTERS__", (n) => Re = n), ji = t("__VUE_SSR_SETTERS__", (n) => Xn = n);
  }
  const ir = (e) => {
    const t = Re;
    return Or(e), e.scope.on(), () => {
      e.scope.off(), Or(t);
    };
  }, as = () => {
    Re && Re.scope.off(), Or(null);
  };
  function gl(e) {
    return e.vnode.shapeFlag & 4;
  }
  let Xn = false;
  function Zc(e, t = false, n = false) {
    t && ji(t);
    const { props: r, children: i } = e.vnode, o = gl(e);
    zc(e, r, o, t), Oc(e, i, n || t);
    const s = o ? Jc(e, t) : void 0;
    return t && ji(false), s;
  }
  function Jc(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, bc);
    const { setup: r } = n;
    if (r) {
      Et();
      const i = e.setupContext = r.length > 1 ? ef(e) : null, o = ir(e), s = rr(r, e, 0, [
        e.props,
        i
      ]), a = aa(s);
      if (At(), o(), (a || e.sp) && !Dn(e) && Ha(e), a) {
        if (s.then(as, as), t) return s.then((l) => {
          ls(e, l);
        }).catch((l) => {
          si(l, e, 0);
        });
        e.asyncDep = s;
      } else ls(e, s);
    } else ml(e);
  }
  function ls(e, t, n) {
    te(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : he(t) && (e.setupState = Pa(t)), ml(e);
  }
  function ml(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || ut);
    {
      const i = ir(e);
      Et();
      try {
        yc(e);
      } finally {
        At(), i();
      }
    }
  }
  const Qc = {
    get(e, t) {
      return Ce(e, "get", ""), e[t];
    }
  };
  function ef(e) {
    const t = (n) => {
      e.exposed = n || {};
    };
    return {
      attrs: new Proxy(e.attrs, Qc),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
  }
  function di(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Pa(Uu(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in $n) return $n[n](e);
      },
      has(t, n) {
        return n in t || n in $n;
      }
    })) : e.proxy;
  }
  function tf(e) {
    return te(e) && "__vccOpts" in e;
  }
  const Te = (e, t) => Yu(e, t, Xn);
  function nf(e, t, n) {
    try {
      Br(-1);
      const r = arguments.length;
      return r === 2 ? he(t) && !j(t) ? Ir(t) ? xe(e, null, [
        t
      ]) : xe(e, t) : xe(e, null, t) : (r > 3 ? n = Array.prototype.slice.call(arguments, 2) : r === 3 && Ir(n) && (n = [
        n
      ]), xe(e, t, n));
    } finally {
      Br(1);
    }
  }
  const rf = "3.5.28";
  let Zi;
  const us = typeof window < "u" && window.trustedTypes;
  if (us) try {
    Zi = us.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const vl = Zi ? (e) => Zi.createHTML(e) : (e) => e, of = "http://www.w3.org/2000/svg", sf = "http://www.w3.org/1998/Math/MathML", xt = typeof document < "u" ? document : null, cs = xt && xt.createElement("template"), af = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const i = t === "svg" ? xt.createElementNS(of, e) : t === "mathml" ? xt.createElementNS(sf, e) : n ? xt.createElement(e, {
        is: n
      }) : xt.createElement(e);
      return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
    },
    createText: (e) => xt.createTextNode(e),
    createComment: (e) => xt.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => xt.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, r, i, o) {
      const s = n ? n.previousSibling : t.lastChild;
      if (i && (i === o || i.nextSibling)) for (; t.insertBefore(i.cloneNode(true), n), !(i === o || !(i = i.nextSibling)); ) ;
      else {
        cs.innerHTML = vl(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const a = cs.content;
        if (r === "svg" || r === "mathml") {
          const l = a.firstChild;
          for (; l.firstChild; ) a.appendChild(l.firstChild);
          a.removeChild(l);
        }
        t.insertBefore(a, n);
      }
      return [
        s ? s.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild
      ];
    }
  }, zt = "transition", An = "animation", jn = /* @__PURE__ */ Symbol("_vtc"), _l = {
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
  }, lf = Se({}, Ua, _l), uf = (e) => (e.displayName = "Transition", e.props = lf, e), cf = uf((e, { slots: t }) => nf(ac, ff(e), t)), Gt = (e, t = []) => {
    j(e) ? e.forEach((n) => n(...t)) : e && e(...t);
  }, fs = (e) => e ? j(e) ? e.some((t) => t.length > 1) : e.length > 1 : false;
  function ff(e) {
    const t = {};
    for (const w in e) w in _l || (t[w] = e[w]);
    if (e.css === false) return t;
    const { name: n = "v", type: r, duration: i, enterFromClass: o = `${n}-enter-from`, enterActiveClass: s = `${n}-enter-active`, enterToClass: a = `${n}-enter-to`, appearFromClass: l = o, appearActiveClass: u = s, appearToClass: c = a, leaveFromClass: f = `${n}-leave-from`, leaveActiveClass: d = `${n}-leave-active`, leaveToClass: h = `${n}-leave-to` } = e, m = df(i), _ = m && m[0], z = m && m[1], { onBeforeEnter: G, onEnter: T, onEnterCancelled: M, onLeave: y, onLeaveCancelled: x, onBeforeAppear: C = G, onAppear: U = T, onAppearCancelled: K = M } = t, I = (w, Z, R, Y) => {
      w._enterCancelled = Y, Ht(w, Z ? c : a), Ht(w, Z ? u : s), R && R();
    }, O = (w, Z) => {
      w._isLeaving = false, Ht(w, f), Ht(w, h), Ht(w, d), Z && Z();
    }, q = (w) => (Z, R) => {
      const Y = w ? U : T, W = () => I(Z, w, R);
      Gt(Y, [
        Z,
        W
      ]), ds(() => {
        Ht(Z, w ? l : o), bt(Z, w ? c : a), fs(Y) || hs(Z, r, _, W);
      });
    };
    return Se(t, {
      onBeforeEnter(w) {
        Gt(G, [
          w
        ]), bt(w, o), bt(w, s);
      },
      onBeforeAppear(w) {
        Gt(C, [
          w
        ]), bt(w, l), bt(w, u);
      },
      onEnter: q(false),
      onAppear: q(true),
      onLeave(w, Z) {
        w._isLeaving = true;
        const R = () => O(w, Z);
        bt(w, f), w._enterCancelled ? (bt(w, d), ms(w)) : (ms(w), bt(w, d)), ds(() => {
          w._isLeaving && (Ht(w, f), bt(w, h), fs(y) || hs(w, r, z, R));
        }), Gt(y, [
          w,
          R
        ]);
      },
      onEnterCancelled(w) {
        I(w, false, void 0, true), Gt(M, [
          w
        ]);
      },
      onAppearCancelled(w) {
        I(w, true, void 0, true), Gt(K, [
          w
        ]);
      },
      onLeaveCancelled(w) {
        O(w), Gt(x, [
          w
        ]);
      }
    });
  }
  function df(e) {
    if (e == null) return null;
    if (he(e)) return [
      Ci(e.enter),
      Ci(e.leave)
    ];
    {
      const t = Ci(e);
      return [
        t,
        t
      ];
    }
  }
  function Ci(e) {
    return cu(e);
  }
  function bt(e, t) {
    t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[jn] || (e[jn] = /* @__PURE__ */ new Set())).add(t);
  }
  function Ht(e, t) {
    t.split(/\s+/).forEach((r) => r && e.classList.remove(r));
    const n = e[jn];
    n && (n.delete(t), n.size || (e[jn] = void 0));
  }
  function ds(e) {
    requestAnimationFrame(() => {
      requestAnimationFrame(e);
    });
  }
  let hf = 0;
  function hs(e, t, n, r) {
    const i = e._endId = ++hf, o = () => {
      i === e._endId && r();
    };
    if (n != null) return setTimeout(o, n);
    const { type: s, timeout: a, propCount: l } = pf(e, t);
    if (!s) return r();
    const u = s + "end";
    let c = 0;
    const f = () => {
      e.removeEventListener(u, d), o();
    }, d = (h) => {
      h.target === e && ++c >= l && f();
    };
    setTimeout(() => {
      c < l && f();
    }, a + 1), e.addEventListener(u, d);
  }
  function pf(e, t) {
    const n = window.getComputedStyle(e), r = (m) => (n[m] || "").split(", "), i = r(`${zt}Delay`), o = r(`${zt}Duration`), s = ps(i, o), a = r(`${An}Delay`), l = r(`${An}Duration`), u = ps(a, l);
    let c = null, f = 0, d = 0;
    t === zt ? s > 0 && (c = zt, f = s, d = o.length) : t === An ? u > 0 && (c = An, f = u, d = l.length) : (f = Math.max(s, u), c = f > 0 ? s > u ? zt : An : null, d = c ? c === zt ? o.length : l.length : 0);
    const h = c === zt && /\b(?:transform|all)(?:,|$)/.test(r(`${zt}Property`).toString());
    return {
      type: c,
      timeout: f,
      propCount: d,
      hasTransform: h
    };
  }
  function ps(e, t) {
    for (; e.length < t.length; ) e = e.concat(e);
    return Math.max(...t.map((n, r) => gs(n) + gs(e[r])));
  }
  function gs(e) {
    return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
  }
  function ms(e) {
    return (e ? e.ownerDocument : document).body.offsetHeight;
  }
  function gf(e, t, n) {
    const r = e[jn];
    r && (t = (t ? [
      t,
      ...r
    ] : [
      ...r
    ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
  }
  const Fr = /* @__PURE__ */ Symbol("_vod"), bl = /* @__PURE__ */ Symbol("_vsh"), cr = {
    name: "show",
    beforeMount(e, { value: t }, { transition: n }) {
      e[Fr] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : Pn(e, t);
    },
    mounted(e, { value: t }, { transition: n }) {
      n && t && n.enter(e);
    },
    updated(e, { value: t, oldValue: n }, { transition: r }) {
      !t != !n && (r ? t ? (r.beforeEnter(e), Pn(e, true), r.enter(e)) : r.leave(e, () => {
        Pn(e, false);
      }) : Pn(e, t));
    },
    beforeUnmount(e, { value: t }) {
      Pn(e, t);
    }
  };
  function Pn(e, t) {
    e.style.display = t ? e[Fr] : "none", e[bl] = !t;
  }
  const mf = /* @__PURE__ */ Symbol(""), vf = /(?:^|;)\s*display\s*:/;
  function _f(e, t, n) {
    const r = e.style, i = we(n);
    let o = false;
    if (n && !i) {
      if (t) if (we(t)) for (const s of t.split(";")) {
        const a = s.slice(0, s.indexOf(":")).trim();
        n[a] == null && wr(r, a, "");
      }
      else for (const s in t) n[s] == null && wr(r, s, "");
      for (const s in n) s === "display" && (o = true), wr(r, s, n[s]);
    } else if (i) {
      if (t !== n) {
        const s = r[mf];
        s && (n += ";" + s), r.cssText = n, o = vf.test(n);
      }
    } else t && e.removeAttribute("style");
    Fr in e && (e[Fr] = o ? r.display : "", e[bl] && (r.display = "none"));
  }
  const vs = /\s*!important$/;
  function wr(e, t, n) {
    if (j(n)) n.forEach((r) => wr(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = bf(e, t);
      vs.test(n) ? e.setProperty(Dt(r), n.replace(vs, ""), "important") : e[r] = n;
    }
  }
  const _s = [
    "Webkit",
    "Moz",
    "ms"
  ], ki = {};
  function bf(e, t) {
    const n = ki[t];
    if (n) return n;
    let r = kt(t);
    if (r !== "filter" && r in e) return ki[t] = r;
    r = ca(r);
    for (let i = 0; i < _s.length; i++) {
      const o = _s[i] + r;
      if (o in e) return ki[t] = o;
    }
    return t;
  }
  const bs = "http://www.w3.org/1999/xlink";
  function ys(e, t, n, r, i, o = mu(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(bs, t.slice(6, t.length)) : e.setAttributeNS(bs, t, n) : n == null || o && !da(n) ? e.removeAttribute(t) : e.setAttribute(t, o ? "" : ht(n) ? String(n) : n);
  }
  function xs(e, t, n, r, i) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? vl(n) : n);
      return;
    }
    const o = e.tagName;
    if (t === "value" && o !== "PROGRESS" && !o.includes("-")) {
      const a = o === "OPTION" ? e.getAttribute("value") || "" : e.value, l = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
      (a !== l || !("_value" in e)) && (e.value = l), n == null && e.removeAttribute(t), e._value = n;
      return;
    }
    let s = false;
    if (n === "" || n == null) {
      const a = typeof e[t];
      a === "boolean" ? n = da(n) : n == null && a === "string" ? (n = "", s = true) : a === "number" && (n = 0, s = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    s && e.removeAttribute(i || t);
  }
  function Yt(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function yf(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const ws = /* @__PURE__ */ Symbol("_vei");
  function xf(e, t, n, r, i = null) {
    const o = e[ws] || (e[ws] = {}), s = o[t];
    if (r && s) s.value = r;
    else {
      const [a, l] = wf(t);
      if (r) {
        const u = o[t] = Tf(r, i);
        Yt(e, a, u, l);
      } else s && (yf(e, a, s, l), o[t] = void 0);
    }
  }
  const Ss = /(?:Once|Passive|Capture)$/;
  function wf(e) {
    let t;
    if (Ss.test(e)) {
      t = {};
      let r;
      for (; r = e.match(Ss); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : Dt(e.slice(2)),
      t
    ];
  }
  let Ei = 0;
  const Sf = Promise.resolve(), Mf = () => Ei || (Sf.then(() => Ei = 0), Ei = Date.now());
  function Tf(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Je(Cf(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = Mf(), n;
  }
  function Cf(e, t) {
    if (j(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (i) => !i._stopped && r && r(i));
    } else return t;
  }
  const Ms = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, kf = (e, t, n, r, i, o) => {
    const s = i === "svg";
    t === "class" ? gf(e, r, s) : t === "style" ? _f(e, n, r) : Qr(t) ? ho(t) || xf(e, t, n, r, o) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Ef(e, t, r, s)) ? (xs(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && ys(e, t, r, s, o, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !we(r)) ? xs(e, kt(t), r, o, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), ys(e, t, r, s));
  };
  function Ef(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Ms(t) && te(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const i = e.tagName;
      if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE") return false;
    }
    return Ms(t) && we(n) ? false : t in e;
  }
  const Ur = (e) => {
    const t = e.props["onUpdate:modelValue"] || false;
    return j(t) ? (n) => _r(t, n) : t;
  };
  function Af(e) {
    e.target.composing = true;
  }
  function Ts(e) {
    const t = e.target;
    t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
  }
  const pn = /* @__PURE__ */ Symbol("_assign");
  function Cs(e, t, n) {
    return t && (e = e.trim()), n && (e = mo(e)), e;
  }
  const Ye = {
    created(e, { modifiers: { lazy: t, trim: n, number: r } }, i) {
      e[pn] = Ur(i);
      const o = r || i.props && i.props.type === "number";
      Yt(e, t ? "change" : "input", (s) => {
        s.target.composing || e[pn](Cs(e.value, n, o));
      }), (n || o) && Yt(e, "change", () => {
        e.value = Cs(e.value, n, o);
      }), t || (Yt(e, "compositionstart", Af), Yt(e, "compositionend", Ts), Yt(e, "change", Ts));
    },
    mounted(e, { value: t }) {
      e.value = t ?? "";
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: i, number: o } }, s) {
      if (e[pn] = Ur(s), e.composing) return;
      const a = (o || e.type === "number") && !/^0\d/.test(e.value) ? mo(e.value) : e.value, l = t ?? "";
      a !== l && (document.activeElement === e && e.type !== "range" && (r && t === n || i && e.value.trim() === l) || (e.value = l));
    }
  }, Nt = {
    deep: true,
    created(e, t, n) {
      e[pn] = Ur(n), Yt(e, "change", () => {
        const r = e._modelValue, i = Pf(e), o = e.checked, s = e[pn];
        if (j(r)) {
          const a = ha(r, i), l = a !== -1;
          if (o && !l) s(r.concat(i));
          else if (!o && l) {
            const u = [
              ...r
            ];
            u.splice(a, 1), s(u);
          }
        } else if (ei(r)) {
          const a = new Set(r);
          o ? a.add(i) : a.delete(i), s(a);
        } else s(yl(e, o));
      });
    },
    mounted: ks,
    beforeUpdate(e, t, n) {
      e[pn] = Ur(n), ks(e, t, n);
    }
  };
  function ks(e, { value: t, oldValue: n }, r) {
    e._modelValue = t;
    let i;
    if (j(t)) i = ha(t, r.props.value) > -1;
    else if (ei(t)) i = t.has(r.props.value);
    else {
      if (t === n) return;
      i = nr(t, yl(e, true));
    }
    e.checked !== i && (e.checked = i);
  }
  function Pf(e) {
    return "_value" in e ? e._value : e.value;
  }
  function yl(e, t) {
    const n = t ? "_trueValue" : "_falseValue";
    return n in e ? e[n] : t;
  }
  const Lf = [
    "ctrl",
    "shift",
    "alt",
    "meta"
  ], Rf = {
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
    exact: (e, t) => Lf.some((n) => e[`${n}Key`] && !t.includes(n))
  }, Es = (e, t) => {
    if (!e) return e;
    const n = e._withMods || (e._withMods = {}), r = t.join(".");
    return n[r] || (n[r] = ((i, ...o) => {
      for (let s = 0; s < t.length; s++) {
        const a = Rf[t[s]];
        if (a && a(i, t)) return;
      }
      return e(i, ...o);
    }));
  }, zf = Se({
    patchProp: kf
  }, af);
  let As;
  function Nf() {
    return As || (As = Uc(zf));
  }
  const Bf = ((...e) => {
    const t = Nf().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const i = Of(r);
      if (!i) return;
      const o = t._component;
      !te(o) && !o.render && !o.template && (o.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
      const s = n(i, false, If(i));
      return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), s;
    }, t;
  });
  function If(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function Of(e) {
    return we(e) ? document.querySelector(e) : e;
  }
  const Ff = `// Mandelbrot progressive-iteration shader.
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
`, Uf = `struct Uniforms {
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

`, Df = `// Brush pass: updates sentinel levels in the neutral square texture.
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
`, $f = `// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
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
`, Vf = `// Compute pass: counts pixels that still need rendering work.
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
`, Gf = "" + new URL("mandelbrot_bg-B7xpCMLZ.wasm", import.meta.url).href, Hf = async (e = {}, t) => {
    let n;
    if (t.startsWith("data:")) {
      const r = t.replace(/^data:.*?base64,/, "");
      let i;
      if (typeof Buffer == "function" && typeof Buffer.from == "function") i = Buffer.from(r, "base64");
      else if (typeof atob == "function") {
        const o = atob(r);
        i = new Uint8Array(o.length);
        for (let s = 0; s < o.length; s++) i[s] = o.charCodeAt(s);
      } else throw new Error("Cannot decode base64-encoded data URL");
      n = await WebAssembly.instantiate(i, e);
    } else {
      const r = await fetch(t), i = r.headers.get("Content-Type") || "";
      if ("instantiateStreaming" in WebAssembly && i.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(r, e);
      else {
        const o = await r.arrayBuffer();
        n = await WebAssembly.instantiate(o, e);
      }
    }
    return n.instance.exports;
  };
  let Q;
  function Wf(e) {
    Q = e;
  }
  function Lo(e, t) {
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
    return (fr === null || fr.byteLength === 0) && (fr = new Uint8Array(Q.memory.buffer)), fr;
  }
  let Mr = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  Mr.decode();
  const qf = 2146435072;
  let Ai = 0;
  function Yf(e, t) {
    return Ai += t, Ai >= qf && (Mr = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), Mr.decode(), Ai = t), Mr.decode(Sr().subarray(e, e + t));
  }
  function xl(e, t) {
    return e = e >>> 0, Yf(e, t);
  }
  function ve(e) {
    if (typeof e != "number") throw new Error(`expected a number argument, found ${typeof e}`);
  }
  let rn = null;
  function Kf() {
    return (rn === null || rn.buffer.detached === true || rn.buffer.detached === void 0 && rn.buffer !== Q.memory.buffer) && (rn = new DataView(Q.memory.buffer)), rn;
  }
  function Ps(e, t) {
    e = e >>> 0;
    const n = Kf(), r = [];
    for (let i = e; i < e + 4 * t; i += 4) r.push(Q.__wbindgen_export_0.get(n.getUint32(i, true)));
    return Q.__externref_drop_slice(e, t), r;
  }
  let Ot = 0;
  const Gn = new TextEncoder();
  "encodeInto" in Gn || (Gn.encodeInto = function(e, t) {
    const n = Gn.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  });
  function on(e, t, n) {
    if (typeof e != "string") throw new Error(`expected a string argument, found ${typeof e}`);
    if (n === void 0) {
      const a = Gn.encode(e), l = t(a.length, 1) >>> 0;
      return Sr().subarray(l, l + a.length).set(a), Ot = a.length, l;
    }
    let r = e.length, i = t(r, 1) >>> 0;
    const o = Sr();
    let s = 0;
    for (; s < r; s++) {
      const a = e.charCodeAt(s);
      if (a > 127) break;
      o[i + s] = a;
    }
    if (s !== r) {
      s !== 0 && (e = e.slice(s)), i = n(i, r, r = s + e.length * 3, 1) >>> 0;
      const a = Sr().subarray(i + s, i + r), l = Gn.encodeInto(e, a);
      if (l.read !== e.length) throw new Error("failed to pass whole string");
      s += l.written, i = n(i, r, s, 1) >>> 0;
    }
    return Ot = s, i;
  }
  const Ls = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => Q.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  class Ji {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Ls.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      Q.__wbg_mandelbrotnavigator_free(t, 0);
    }
    get_params() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr);
      const t = Q.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = Ps(t[0], t[1]).slice();
      return Q.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    rotate_direct(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), Q.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), Q.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    get_reference_orbit_len() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return ve(this.__wbg_ptr), Q.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    compute_reference_orbit_ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), ve(t);
      const n = Q.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return bn.__wrap(n);
    }
    get_reference_orbit_capacity() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return ve(this.__wbg_ptr), Q.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    compute_reference_orbit_chunk(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), ve(t), ve(n);
      const r = Q.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, t, n);
      return bn.__wrap(r);
    }
    constructor(t, n, r, i) {
      const o = on(t, Q.__wbindgen_malloc, Q.__wbindgen_realloc), s = Ot, a = on(n, Q.__wbindgen_malloc, Q.__wbindgen_realloc), l = Ot, u = on(r, Q.__wbindgen_malloc, Q.__wbindgen_realloc), c = Ot, f = Q.mandelbrotnavigator_new(o, s, a, l, u, c, i);
      return this.__wbg_ptr = f >>> 0, Ls.register(this, this.__wbg_ptr, this), this;
    }
    step() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr);
      const t = Q.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = Ps(t[0], t[1]).slice();
      return Q.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    zoom(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), Q.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    angle(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), Q.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    scale(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr);
      const n = on(t, Q.__wbindgen_malloc, Q.__wbindgen_realloc), r = Ot;
      Q.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
    }
    origin(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr);
      const r = on(t, Q.__wbindgen_malloc, Q.__wbindgen_realloc), i = Ot, o = on(n, Q.__wbindgen_malloc, Q.__wbindgen_realloc), s = Ot;
      Q.mandelbrotnavigator_origin(this.__wbg_ptr, r, i, o, s);
    }
    rotate(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), Q.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), Q.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
  }
  Symbol.dispose && (Ji.prototype[Symbol.dispose] = Ji.prototype.free);
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => Q.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const Rs = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => Q.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class bn {
    constructor() {
      throw new Error("cannot invoke `new` directly");
    }
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(bn.prototype);
      return n.__wbg_ptr = t, Rs.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Rs.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      Q.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return ve(this.__wbg_ptr), Q.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), ve(t), Q.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return ve(this.__wbg_ptr), Q.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), ve(t), Q.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return ve(this.__wbg_ptr), Q.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      ve(this.__wbg_ptr), ve(t), Q.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  Symbol.dispose && (bn.prototype[Symbol.dispose] = bn.prototype.free);
  function Xf() {
    return Lo(function(e) {
      return Math.exp(e);
    }, arguments);
  }
  function jf() {
    return Lo(function() {
      return Date.now();
    }, arguments);
  }
  function Zf(e, t) {
    throw new Error(xl(e, t));
  }
  function Jf() {
    return Lo(function(e, t) {
      return xl(e, t);
    }, arguments);
  }
  function Qf() {
    const e = Q.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  URL = globalThis.URL;
  const ne = await Hf({
    "./mandelbrot_bg.js": {
      __wbg_now_1e80617bcee43265: jf,
      __wbg_exp_9293ded1248e1bd3: Xf,
      __wbg_wbindgenthrow_451ec1a8469d7eb6: Zf,
      __wbindgen_init_externref_table: Qf,
      __wbindgen_cast_2241b6af4c4b2941: Jf
    }
  }, Gf), wl = ne.memory, ed = ne.__wbg_get_mandelbrotstep_dx, td = ne.__wbg_get_mandelbrotstep_dy, nd = ne.__wbg_get_mandelbrotstep_zx, rd = ne.__wbg_get_mandelbrotstep_zy, id = ne.__wbg_get_orbitbufferinfo_count, od = ne.__wbg_get_orbitbufferinfo_offset, sd = ne.__wbg_get_orbitbufferinfo_ptr, ad = ne.__wbg_mandelbrotnavigator_free, ld = ne.__wbg_mandelbrotstep_free, ud = ne.__wbg_orbitbufferinfo_free, cd = ne.__wbg_set_mandelbrotstep_dx, fd = ne.__wbg_set_mandelbrotstep_dy, dd = ne.__wbg_set_mandelbrotstep_zx, hd = ne.__wbg_set_mandelbrotstep_zy, pd = ne.__wbg_set_orbitbufferinfo_count, gd = ne.__wbg_set_orbitbufferinfo_offset, md = ne.__wbg_set_orbitbufferinfo_ptr, vd = ne.mandelbrotnavigator_angle, _d = ne.mandelbrotnavigator_compute_reference_orbit_chunk, bd = ne.mandelbrotnavigator_compute_reference_orbit_ptr, yd = ne.mandelbrotnavigator_get_params, xd = ne.mandelbrotnavigator_get_reference_orbit_capacity, wd = ne.mandelbrotnavigator_get_reference_orbit_len, Sd = ne.mandelbrotnavigator_new, Md = ne.mandelbrotnavigator_origin, Td = ne.mandelbrotnavigator_rotate, Cd = ne.mandelbrotnavigator_rotate_direct, kd = ne.mandelbrotnavigator_scale, Ed = ne.mandelbrotnavigator_step, Ad = ne.mandelbrotnavigator_translate, Pd = ne.mandelbrotnavigator_translate_direct, Ld = ne.mandelbrotnavigator_zoom, Rd = ne.__wbindgen_export_0, zd = ne.__externref_drop_slice, Nd = ne.__wbindgen_free, Bd = ne.__wbindgen_malloc, Id = ne.__wbindgen_realloc, Sl = ne.__wbindgen_start, Od = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: zd,
    __wbg_get_mandelbrotstep_dx: ed,
    __wbg_get_mandelbrotstep_dy: td,
    __wbg_get_mandelbrotstep_zx: nd,
    __wbg_get_mandelbrotstep_zy: rd,
    __wbg_get_orbitbufferinfo_count: id,
    __wbg_get_orbitbufferinfo_offset: od,
    __wbg_get_orbitbufferinfo_ptr: sd,
    __wbg_mandelbrotnavigator_free: ad,
    __wbg_mandelbrotstep_free: ld,
    __wbg_orbitbufferinfo_free: ud,
    __wbg_set_mandelbrotstep_dx: cd,
    __wbg_set_mandelbrotstep_dy: fd,
    __wbg_set_mandelbrotstep_zx: dd,
    __wbg_set_mandelbrotstep_zy: hd,
    __wbg_set_orbitbufferinfo_count: pd,
    __wbg_set_orbitbufferinfo_offset: gd,
    __wbg_set_orbitbufferinfo_ptr: md,
    __wbindgen_export_0: Rd,
    __wbindgen_free: Nd,
    __wbindgen_malloc: Bd,
    __wbindgen_realloc: Id,
    __wbindgen_start: Sl,
    mandelbrotnavigator_angle: vd,
    mandelbrotnavigator_compute_reference_orbit_chunk: _d,
    mandelbrotnavigator_compute_reference_orbit_ptr: bd,
    mandelbrotnavigator_get_params: yd,
    mandelbrotnavigator_get_reference_orbit_capacity: xd,
    mandelbrotnavigator_get_reference_orbit_len: wd,
    mandelbrotnavigator_new: Sd,
    mandelbrotnavigator_origin: Md,
    mandelbrotnavigator_rotate: Td,
    mandelbrotnavigator_rotate_direct: Cd,
    mandelbrotnavigator_scale: kd,
    mandelbrotnavigator_step: Ed,
    mandelbrotnavigator_translate: Ad,
    mandelbrotnavigator_translate_direct: Pd,
    mandelbrotnavigator_zoom: Ld,
    memory: wl
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  Wf(Od);
  Sl();
  class Fd {
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
  function or(e, t, n) {
    e.prototype = t.prototype = n, n.constructor = e;
  }
  function hi(e, t) {
    var n = Object.create(e.prototype);
    for (var r in t) n[r] = t[r];
    return n;
  }
  function tn() {
  }
  var Zn = 0.7, Dr = 1 / Zn, gn = "\\s*([+-]?\\d+)\\s*", Jn = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", ct = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", Ud = /^#([0-9a-f]{3,8})$/, Dd = new RegExp(`^rgb\\(${gn},${gn},${gn}\\)$`), $d = new RegExp(`^rgb\\(${ct},${ct},${ct}\\)$`), Vd = new RegExp(`^rgba\\(${gn},${gn},${gn},${Jn}\\)$`), Gd = new RegExp(`^rgba\\(${ct},${ct},${ct},${Jn}\\)$`), Hd = new RegExp(`^hsl\\(${Jn},${ct},${ct}\\)$`), Wd = new RegExp(`^hsla\\(${Jn},${ct},${ct},${Jn}\\)$`), zs = {
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
  or(tn, Jt, {
    copy(e) {
      return Object.assign(new this.constructor(), this, e);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: Ns,
    formatHex: Ns,
    formatHex8: qd,
    formatHsl: Yd,
    formatRgb: Bs,
    toString: Bs
  });
  function Ns() {
    return this.rgb().formatHex();
  }
  function qd() {
    return this.rgb().formatHex8();
  }
  function Yd() {
    return Tl(this).formatHsl();
  }
  function Bs() {
    return this.rgb().formatRgb();
  }
  function Jt(e) {
    var t, n;
    return e = (e + "").trim().toLowerCase(), (t = Ud.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Is(t) : n === 3 ? new ke(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? dr(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? dr(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = Dd.exec(e)) ? new ke(t[1], t[2], t[3], 1) : (t = $d.exec(e)) ? new ke(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = Vd.exec(e)) ? dr(t[1], t[2], t[3], t[4]) : (t = Gd.exec(e)) ? dr(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = Hd.exec(e)) ? Us(t[1], t[2] / 100, t[3] / 100, 1) : (t = Wd.exec(e)) ? Us(t[1], t[2] / 100, t[3] / 100, t[4]) : zs.hasOwnProperty(e) ? Is(zs[e]) : e === "transparent" ? new ke(NaN, NaN, NaN, 0) : null;
  }
  function Is(e) {
    return new ke(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
  }
  function dr(e, t, n, r) {
    return r <= 0 && (e = t = n = NaN), new ke(e, t, n, r);
  }
  function Ml(e) {
    return e instanceof tn || (e = Jt(e)), e ? (e = e.rgb(), new ke(e.r, e.g, e.b, e.opacity)) : new ke();
  }
  function ft(e, t, n, r) {
    return arguments.length === 1 ? Ml(e) : new ke(e, t, n, r ?? 1);
  }
  function ke(e, t, n, r) {
    this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
  }
  or(ke, ft, hi(tn, {
    brighter(e) {
      return e = e == null ? Dr : Math.pow(Dr, e), new ke(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? Zn : Math.pow(Zn, e), new ke(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new ke(Zt(this.r), Zt(this.g), Zt(this.b), $r(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
    },
    hex: Os,
    formatHex: Os,
    formatHex8: Kd,
    formatRgb: Fs,
    toString: Fs
  }));
  function Os() {
    return `#${Kt(this.r)}${Kt(this.g)}${Kt(this.b)}`;
  }
  function Kd() {
    return `#${Kt(this.r)}${Kt(this.g)}${Kt(this.b)}${Kt((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function Fs() {
    const e = $r(this.opacity);
    return `${e === 1 ? "rgb(" : "rgba("}${Zt(this.r)}, ${Zt(this.g)}, ${Zt(this.b)}${e === 1 ? ")" : `, ${e})`}`;
  }
  function $r(e) {
    return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
  }
  function Zt(e) {
    return Math.max(0, Math.min(255, Math.round(e) || 0));
  }
  function Kt(e) {
    return e = Zt(e), (e < 16 ? "0" : "") + e.toString(16);
  }
  function Us(e, t, n, r) {
    return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new Xe(e, t, n, r);
  }
  function Tl(e) {
    if (e instanceof Xe) return new Xe(e.h, e.s, e.l, e.opacity);
    if (e instanceof tn || (e = Jt(e)), !e) return new Xe();
    if (e instanceof Xe) return e;
    e = e.rgb();
    var t = e.r / 255, n = e.g / 255, r = e.b / 255, i = Math.min(t, n, r), o = Math.max(t, n, r), s = NaN, a = o - i, l = (o + i) / 2;
    return a ? (t === o ? s = (n - r) / a + (n < r) * 6 : n === o ? s = (r - t) / a + 2 : s = (t - n) / a + 4, a /= l < 0.5 ? o + i : 2 - o - i, s *= 60) : a = l > 0 && l < 1 ? 0 : s, new Xe(s, a, l, e.opacity);
  }
  function Xd(e, t, n, r) {
    return arguments.length === 1 ? Tl(e) : new Xe(e, t, n, r ?? 1);
  }
  function Xe(e, t, n, r) {
    this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
  }
  or(Xe, Xd, hi(tn, {
    brighter(e) {
      return e = e == null ? Dr : Math.pow(Dr, e), new Xe(this.h, this.s, this.l * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? Zn : Math.pow(Zn, e), new Xe(this.h, this.s, this.l * e, this.opacity);
    },
    rgb() {
      var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < 0.5 ? n : 1 - n) * t, i = 2 * n - r;
      return new ke(Pi(e >= 240 ? e - 240 : e + 120, i, r), Pi(e, i, r), Pi(e < 120 ? e + 240 : e - 120, i, r), this.opacity);
    },
    clamp() {
      return new Xe(Ds(this.h), hr(this.s), hr(this.l), $r(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
    },
    formatHsl() {
      const e = $r(this.opacity);
      return `${e === 1 ? "hsl(" : "hsla("}${Ds(this.h)}, ${hr(this.s) * 100}%, ${hr(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
    }
  }));
  function Ds(e) {
    return e = (e || 0) % 360, e < 0 ? e + 360 : e;
  }
  function hr(e) {
    return Math.max(0, Math.min(1, e || 0));
  }
  function Pi(e, t, n) {
    return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
  }
  const jd = Math.PI / 180, Zd = 180 / Math.PI, Vr = 18, Cl = 0.96422, kl = 1, El = 0.82521, Al = 4 / 29, mn = 6 / 29, Pl = 3 * mn * mn, Jd = mn * mn * mn;
  function Ll(e) {
    if (e instanceof dt) return new dt(e.l, e.a, e.b, e.opacity);
    if (e instanceof lt) return zl(e);
    e instanceof ke || (e = Ml(e));
    var t = Ni(e.r), n = Ni(e.g), r = Ni(e.b), i = Li((0.2225045 * t + 0.7168786 * n + 0.0606169 * r) / kl), o, s;
    return t === n && n === r ? o = s = i : (o = Li((0.4360747 * t + 0.3850649 * n + 0.1430804 * r) / Cl), s = Li((0.0139322 * t + 0.0971045 * n + 0.7141733 * r) / El)), new dt(116 * i - 16, 500 * (o - i), 200 * (i - s), e.opacity);
  }
  function Qi(e, t, n, r) {
    return arguments.length === 1 ? Ll(e) : new dt(e, t, n, r ?? 1);
  }
  function dt(e, t, n, r) {
    this.l = +e, this.a = +t, this.b = +n, this.opacity = +r;
  }
  or(dt, Qi, hi(tn, {
    brighter(e) {
      return new dt(this.l + Vr * (e ?? 1), this.a, this.b, this.opacity);
    },
    darker(e) {
      return new dt(this.l - Vr * (e ?? 1), this.a, this.b, this.opacity);
    },
    rgb() {
      var e = (this.l + 16) / 116, t = isNaN(this.a) ? e : e + this.a / 500, n = isNaN(this.b) ? e : e - this.b / 200;
      return t = Cl * Ri(t), e = kl * Ri(e), n = El * Ri(n), new ke(zi(3.1338561 * t - 1.6168667 * e - 0.4906146 * n), zi(-0.9787684 * t + 1.9161415 * e + 0.033454 * n), zi(0.0719453 * t - 0.2289914 * e + 1.4052427 * n), this.opacity);
    }
  }));
  function Li(e) {
    return e > Jd ? Math.pow(e, 1 / 3) : e / Pl + Al;
  }
  function Ri(e) {
    return e > mn ? e * e * e : Pl * (e - Al);
  }
  function zi(e) {
    return 255 * (e <= 31308e-7 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055);
  }
  function Ni(e) {
    return (e /= 255) <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4);
  }
  function Rl(e) {
    if (e instanceof lt) return new lt(e.h, e.c, e.l, e.opacity);
    if (e instanceof dt || (e = Ll(e)), e.a === 0 && e.b === 0) return new lt(NaN, 0 < e.l && e.l < 100 ? 0 : NaN, e.l, e.opacity);
    var t = Math.atan2(e.b, e.a) * Zd;
    return new lt(t < 0 ? t + 360 : t, Math.sqrt(e.a * e.a + e.b * e.b), e.l, e.opacity);
  }
  function eo(e, t, n, r) {
    return arguments.length === 1 ? Rl(e) : new lt(n, t, e, 1);
  }
  function Qd(e, t, n, r) {
    return arguments.length === 1 ? Rl(e) : new lt(e, t, n, r ?? 1);
  }
  function lt(e, t, n, r) {
    this.h = +e, this.c = +t, this.l = +n, this.opacity = +r;
  }
  function zl(e) {
    if (isNaN(e.h)) return new dt(e.l, 0, 0, e.opacity);
    var t = e.h * jd;
    return new dt(e.l, Math.cos(t) * e.c, Math.sin(t) * e.c, e.opacity);
  }
  or(lt, Qd, hi(tn, {
    brighter(e) {
      return new lt(this.h, this.c, this.l + Vr * (e ?? 1), this.opacity);
    },
    darker(e) {
      return new lt(this.h, this.c, this.l - Vr * (e ?? 1), this.opacity);
    },
    rgb() {
      return zl(this).rgb();
    }
  }));
  const Ro = (e) => () => e;
  function eh(e, t) {
    return function(n) {
      return e + n * t;
    };
  }
  function th(e, t, n) {
    return e = Math.pow(e, n), t = Math.pow(t, n) - e, n = 1 / n, function(r) {
      return Math.pow(e + r * t, n);
    };
  }
  function nh(e) {
    return (e = +e) == 1 ? ln : function(t, n) {
      return n - t ? th(t, n, e) : Ro(isNaN(t) ? n : t);
    };
  }
  function ln(e, t) {
    var n = t - e;
    return n ? eh(e, n) : Ro(isNaN(e) ? t : e);
  }
  const Gr = (function e(t) {
    var n = nh(t);
    function r(i, o) {
      var s = n((i = ft(i)).r, (o = ft(o)).r), a = n(i.g, o.g), l = n(i.b, o.b), u = ln(i.opacity, o.opacity);
      return function(c) {
        return i.r = s(c), i.g = a(c), i.b = l(c), i.opacity = u(c), i + "";
      };
    }
    return r.gamma = e, r;
  })(1);
  function rh(e, t) {
    t || (t = []);
    var n = e ? Math.min(t.length, e.length) : 0, r = t.slice(), i;
    return function(o) {
      for (i = 0; i < n; ++i) r[i] = e[i] * (1 - o) + t[i] * o;
      return r;
    };
  }
  function ih(e) {
    return ArrayBuffer.isView(e) && !(e instanceof DataView);
  }
  function oh(e, t) {
    var n = t ? t.length : 0, r = e ? Math.min(n, e.length) : 0, i = new Array(r), o = new Array(n), s;
    for (s = 0; s < r; ++s) i[s] = zo(e[s], t[s]);
    for (; s < n; ++s) o[s] = t[s];
    return function(a) {
      for (s = 0; s < r; ++s) o[s] = i[s](a);
      return o;
    };
  }
  function sh(e, t) {
    var n = /* @__PURE__ */ new Date();
    return e = +e, t = +t, function(r) {
      return n.setTime(e * (1 - r) + t * r), n;
    };
  }
  function Ke(e, t) {
    return e = +e, t = +t, function(n) {
      return e * (1 - n) + t * n;
    };
  }
  function ah(e, t) {
    var n = {}, r = {}, i;
    (e === null || typeof e != "object") && (e = {}), (t === null || typeof t != "object") && (t = {});
    for (i in t) i in e ? n[i] = zo(e[i], t[i]) : r[i] = t[i];
    return function(o) {
      for (i in n) r[i] = n[i](o);
      return r;
    };
  }
  var to = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Bi = new RegExp(to.source, "g");
  function lh(e) {
    return function() {
      return e;
    };
  }
  function uh(e) {
    return function(t) {
      return e(t) + "";
    };
  }
  function Nl(e, t) {
    var n = to.lastIndex = Bi.lastIndex = 0, r, i, o, s = -1, a = [], l = [];
    for (e = e + "", t = t + ""; (r = to.exec(e)) && (i = Bi.exec(t)); ) (o = i.index) > n && (o = t.slice(n, o), a[s] ? a[s] += o : a[++s] = o), (r = r[0]) === (i = i[0]) ? a[s] ? a[s] += i : a[++s] = i : (a[++s] = null, l.push({
      i: s,
      x: Ke(r, i)
    })), n = Bi.lastIndex;
    return n < t.length && (o = t.slice(n), a[s] ? a[s] += o : a[++s] = o), a.length < 2 ? l[0] ? uh(l[0].x) : lh(t) : (t = l.length, function(u) {
      for (var c = 0, f; c < t; ++c) a[(f = l[c]).i] = f.x(u);
      return a.join("");
    });
  }
  function zo(e, t) {
    var n = typeof t, r;
    return t == null || n === "boolean" ? Ro(t) : (n === "number" ? Ke : n === "string" ? (r = Jt(t)) ? (t = r, Gr) : Nl : t instanceof Jt ? Gr : t instanceof Date ? sh : ih(t) ? rh : Array.isArray(t) ? oh : typeof t.valueOf != "function" && typeof t.toString != "function" || isNaN(t) ? ah : Ke)(e, t);
  }
  function ch(e, t) {
    return e = +e, t = +t, function(n) {
      return Math.round(e * (1 - n) + t * n);
    };
  }
  var $s = 180 / Math.PI, no = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function Bl(e, t, n, r, i, o) {
    var s, a, l;
    return (s = Math.sqrt(e * e + t * t)) && (e /= s, t /= s), (l = e * n + t * r) && (n -= e * l, r -= t * l), (a = Math.sqrt(n * n + r * r)) && (n /= a, r /= a, l /= a), e * r < t * n && (e = -e, t = -t, l = -l, s = -s), {
      translateX: i,
      translateY: o,
      rotate: Math.atan2(t, e) * $s,
      skewX: Math.atan(l) * $s,
      scaleX: s,
      scaleY: a
    };
  }
  var pr;
  function fh(e) {
    const t = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(e + "");
    return t.isIdentity ? no : Bl(t.a, t.b, t.c, t.d, t.e, t.f);
  }
  function dh(e) {
    return e == null || (pr || (pr = document.createElementNS("http://www.w3.org/2000/svg", "g")), pr.setAttribute("transform", e), !(e = pr.transform.baseVal.consolidate())) ? no : (e = e.matrix, Bl(e.a, e.b, e.c, e.d, e.e, e.f));
  }
  function Il(e, t, n, r) {
    function i(u) {
      return u.length ? u.pop() + " " : "";
    }
    function o(u, c, f, d, h, m) {
      if (u !== f || c !== d) {
        var _ = h.push("translate(", null, t, null, n);
        m.push({
          i: _ - 4,
          x: Ke(u, f)
        }, {
          i: _ - 2,
          x: Ke(c, d)
        });
      } else (f || d) && h.push("translate(" + f + t + d + n);
    }
    function s(u, c, f, d) {
      u !== c ? (u - c > 180 ? c += 360 : c - u > 180 && (u += 360), d.push({
        i: f.push(i(f) + "rotate(", null, r) - 2,
        x: Ke(u, c)
      })) : c && f.push(i(f) + "rotate(" + c + r);
    }
    function a(u, c, f, d) {
      u !== c ? d.push({
        i: f.push(i(f) + "skewX(", null, r) - 2,
        x: Ke(u, c)
      }) : c && f.push(i(f) + "skewX(" + c + r);
    }
    function l(u, c, f, d, h, m) {
      if (u !== f || c !== d) {
        var _ = h.push(i(h) + "scale(", null, ",", null, ")");
        m.push({
          i: _ - 4,
          x: Ke(u, f)
        }, {
          i: _ - 2,
          x: Ke(c, d)
        });
      } else (f !== 1 || d !== 1) && h.push(i(h) + "scale(" + f + "," + d + ")");
    }
    return function(u, c) {
      var f = [], d = [];
      return u = e(u), c = e(c), o(u.translateX, u.translateY, c.translateX, c.translateY, f, d), s(u.rotate, c.rotate, f, d), a(u.skewX, c.skewX, f, d), l(u.scaleX, u.scaleY, c.scaleX, c.scaleY, f, d), u = c = null, function(h) {
        for (var m = -1, _ = d.length, z; ++m < _; ) f[(z = d[m]).i] = z.x(h);
        return f.join("");
      };
    };
  }
  var hh = Il(fh, "px, ", "px)", "deg)"), ph = Il(dh, ", ", ")", ")");
  function gh(e, t) {
    var n = ln((e = Qi(e)).l, (t = Qi(t)).l), r = ln(e.a, t.a), i = ln(e.b, t.b), o = ln(e.opacity, t.opacity);
    return function(s) {
      return e.l = n(s), e.a = r(s), e.b = i(s), e.opacity = o(s), e + "";
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
          const o = (t - r.position) / (i.position - r.position), s = gh(r.color, i.color);
          return ft(s(o)).formatHex();
        }
      }
      return "#000";
    }
    generateTexture() {
      const r = new ImageData(4096, 1);
      for (let i = 0; i < 4096; ++i) {
        const o = i / 4095, s = ft(this.getColorAt(o)), a = i * 4;
        r.data[a] = s.r, r.data[a + 1] = s.g, r.data[a + 2] = s.b, r.data[a + 3] = 255;
      }
      return r;
    }
  }
  const Vs = "" + new URL("colored_tiles-DoIWdN30.jpg", import.meta.url).href, Gs = "" + new URL("gold-C0Fcepof.jpg", import.meta.url).href, mh = 2048;
  function vh(e) {
    const t = Math.max(1, Math.floor(e));
    return 2 ** Math.floor(Math.log2(t));
  }
  const _He = class _He {
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
      this.canvas = t, this.shaderPassCompute = Ff, this.shaderPassColor = Uf, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.time = 0;
    }
    async initialize(t) {
      if (this.mandelbrotNavigator = t, !navigator.gpu) throw new Error("WebGPU non support\xE9");
      if (this.adapter = await navigator.gpu.requestAdapter(), !this.adapter) throw new Error("Adapter WebGPU introuvable");
      this.device = await this.adapter.requestDevice(), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), _He._tileTexture || (_He._tileTexture = await this._loadTexture(Vs)), this.tileTexture = await this._loadTexture(Vs), this.tileTextureView = this.tileTexture.createView(), _He._skyboxTexture || (_He._skyboxTexture = await this._loadTexture(Gs)), this.skyboxTexture = await this._loadTexture(Gs), this.skyboxTextureView = this.skyboxTexture.createView();
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
      ]), this.paletteTextureView = this.paletteTexture.createView(), this.webcamTexture = new Fd(1920, 1080), this.webcamTileTexture = this.device.createTexture({
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
        code: Df,
        label: "Engine ShaderModule Brush"
      }), n = this.device.createShaderModule({
        code: this.shaderPassCompute,
        label: "Engine ShaderModule Compute"
      }), r = this.device.createShaderModule({
        code: $f,
        label: "Engine ShaderModule Resolve"
      }), i = this.device.createShaderModule({
        code: this.shaderPassColor,
        label: "Engine ShaderModule Color"
      }), o = this.device.createShaderModule({
        code: Vf,
        label: "Engine ShaderModule Count"
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
      }), u = this.device.createBindGroupLayout({
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
      }), c = Array.from({
        length: _He.LAYER_COUNT
      }, () => ({
        format: "r32float"
      }));
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
          targets: c
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
          targets: c
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
          module: r,
          entryPoint: "vs_main"
        },
        fragment: {
          module: r,
          entryPoint: "fs_main",
          targets: c
        },
        primitive: {
          topology: "triangle-list"
        },
        label: "Engine RenderPipeline Resolve"
      }), this.pipelineColor = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            u
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
      });
      const f = this.device.createBindGroupLayout({
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
            f
          ]
        }),
        compute: {
          module: o,
          entryPoint: "count_unfinished"
        },
        label: "Engine ComputePipeline Count"
      }), this.bindGroupBrush = void 0, this.bindGroupMandelbrot = void 0, this.bindGroupResolve = void 0, this.bindGroupColor = void 0, this.counterBindGroup = void 0;
    }
    resize() {
      var _a2, _b, _c2, _d2, _e2, _f2, _g2, _h2;
      const t = (window.devicePixelRatio || 1) * this.dprMultiplier, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) || 1, i = (n == null ? void 0 : n.clientHeight) || 1;
      this.width = Math.max(1, Math.round(r * t)), this.height = Math.max(1, Math.round(i * t));
      const o = ((_b = (_a2 = this.device) == null ? void 0 : _a2.limits) == null ? void 0 : _b.maxTextureDimension2D) ?? 8192;
      this.width = Math.min(this.width, o), this.height = Math.min(this.height, o), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = i + "px", this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.neutralSize = Math.ceil(Math.sqrt(this.width * this.width + this.height * this.height));
      const s = this.neutralSize;
      (_d2 = (_c2 = this.rawTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.rawBrushTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2), (_h2 = (_g2 = this.resolvedTexture) == null ? void 0 : _g2.destroy) == null ? void 0 : _h2.call(_g2);
      const a = _He.LAYER_COUNT, l = (d) => {
        const h = this.device.createTexture({
          size: {
            width: s,
            height: s,
            depthOrArrayLayers: a
          },
          format: "r32float",
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
          label: d
        }), m = h.createView({
          dimension: "2d-array",
          baseArrayLayer: 0,
          arrayLayerCount: a,
          label: d + " ArrayView"
        }), _ = [];
        for (let z = 0; z < a; z++) _.push(h.createView({
          dimension: "2d",
          baseArrayLayer: z,
          arrayLayerCount: 1,
          label: d + ` Layer${z}`
        }));
        return {
          texture: h,
          arrayView: m,
          layerViews: _
        };
      }, u = l("Engine RawTexture (A)");
      this.rawTexture = u.texture, this.rawArrayView = u.arrayView, this.rawLayerViews = u.layerViews;
      const c = l("Engine RawBrushTexture (B)");
      this.rawBrushTexture = c.texture, this.rawBrushArrayView = c.arrayView, this.rawBrushLayerViews = c.layerViews;
      const f = l("Engine ResolvedTexture");
      if (this.resolvedTexture = f.texture, this.resolvedArrayView = f.arrayView, this.resolvedLayerViews = f.layerViews, this.pipelineBrush) {
        const d = this.pipelineBrush.getBindGroupLayout(0);
        this.bindGroupBrush = this.device.createBindGroup({
          layout: d,
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
        const d = this.pipelineMandelbrot.getBindGroupLayout(0);
        this.bindGroupMandelbrot = this.device.createBindGroup({
          layout: d,
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
        const d = this.pipelineResolve.getBindGroupLayout(0);
        this.bindGroupResolve = this.device.createBindGroup({
          layout: d,
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
        const d = this.pipelineColor.getBindGroupLayout(0), h = [
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
          layout: d,
          entries: h,
          label: "Engine BindGroup Color"
        });
      }
      if (this.pipelineCount && this.counterBuffer && this.uniformBufferCount) {
        const d = this.pipelineCount.getBindGroupLayout(0);
        this.counterBindGroup = this.device.createBindGroup({
          layout: d,
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
      for (const [r, i] of t.entries()) {
        const o = n[r];
        if (!o || i.color !== o.color || i.position !== o.position) return false;
      }
      return true;
    }
    async update(t, n) {
      var _a2, _b, _c2;
      const r = performance.now();
      this.lastUpdateTime === 0 && (this.lastUpdateTime = r);
      const i = (r - this.lastUpdateTime) / 1e3;
      this.time += i, this.lastUpdateTime = r, this.needRender = !(this.areObjectsEqual(t, this.previousMandelbrot) && this.areObjectsEqual(n, this.previousRenderOptions)), n.activateWebcam ? (await this.updateWebcamTexture(), this.needRender = true) : (_a2 = this.webcamTexture) == null ? void 0 : _a2.closeWebcam(), n.activateTessellation && (this.needRender = true), n.activateAnimate && (this.needRender = true);
      const o = this.width / Math.max(1, this.height);
      let s = ((_b = this.previousMandelbrot) == null ? void 0 : _b.scale) || 1 / t.scale;
      if (s < 1 && (s = 1 / s), s = Math.sqrt(s) - 1, !this.areColorStopsEqual(n.colorStops, ((_c2 = this.previousRenderOptions) == null ? void 0 : _c2.colorStops) || [])) {
        const z = new Hr(n.colorStops).generateTexture();
        this.device.queue.writeTexture({
          texture: this.paletteTexture
        }, z.data, {
          bytesPerRow: z.width * 4
        }, [
          z.width,
          z.height
        ]), this.needRender = true;
      }
      const a = new Float32Array([
        n.palettePeriod,
        n.paletteOffset,
        n.tessellationLevel,
        n.shadingLevel,
        s,
        this.time,
        n.activateTessellation ? 1 : 0,
        n.activateShading ? 1 : 0,
        n.activateWebcam ? 1 : 0,
        n.activatePalette ? 1 : 0,
        n.activateSkybox ? 1 : 0,
        n.activateSmoothness ? 1 : 0,
        n.activateZebra ? 1 : 0,
        o,
        t.angle,
        n.activateAnimate ? 1 : 0,
        t.mu,
        0
      ]);
      if (this.device.queue.writeBuffer(this.uniformBufferColor, 0, a.buffer), !this.needsMoreFrames()) return;
      const l = Math.ceil(t.maxIterations), u = this.mandelbrotNavigator.compute_reference_orbit_chunk(_He.ORBIT_CHUNK_SIZE, l), c = u.count, f = new Float32Array(wl.buffer, u.ptr, u.count * 4);
      u.offset < l && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, f, 0);
      const d = Math.min(l, c), h = new Float32Array([
        t.dx,
        t.dy,
        t.mu,
        t.scale,
        o,
        t.angle,
        this.iterationBatchSize,
        t.epsilon,
        n.antialiasLevel,
        0,
        d,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, h.buffer), this.orbitIncomplete = c < l;
      const m = u.offset === 0 && !!this.prevFrameMandelbrot;
      this.clearHistoryNextFrame = false, (!this.prevFrameMandelbrot || m) && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== t.mu && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== t.scale && (this.clearHistoryNextFrame = true), this.previousMandelbrot = structuredClone(t), this.previousRenderOptions = structuredClone(n);
    }
    async render() {
      if (!this.needsMoreFrames() || !this.pipelineBrush || !this.pipelineMandelbrot || !this.pipelineResolve || !this.pipelineColor || !this.bindGroupBrush || !this.bindGroupMandelbrot || !this.bindGroupResolve || !this.bindGroupColor || !this.previousMandelbrot) return;
      const t = this.width / Math.max(1, this.height), n = vh(mh), r = n, i = this.clearHistoryNextFrame ? 1 : 0;
      let o = 0, s = 0;
      if (!this.clearHistoryNextFrame && this.prevFrameMandelbrot) {
        const x = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx, C = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy, U = this.neutralSize, K = Math.sqrt(t * t + 1);
        o = -(x * U) / (2 * this.previousMandelbrot.scale * K), s = C * U / (2 * this.previousMandelbrot.scale * K);
      }
      this.clearHistoryNextFrame ? (this.cumulativeShiftX = 0, this.cumulativeShiftY = 0) : (this.cumulativeShiftX += Math.round(o), this.cumulativeShiftY += Math.round(s));
      const a = (this.cumulativeShiftX % r + r) % r, l = (this.cumulativeShiftY % r + r) % r, u = new Float32Array([
        t,
        this.previousMandelbrot.angle,
        i,
        n,
        r,
        o,
        s,
        this.previousMandelbrot.mu,
        a,
        l
      ]);
      this.device.queue.writeBuffer(this.uniformBufferBrush, 0, u.buffer);
      const c = new Float32Array([
        this.previousMandelbrot.mu,
        a,
        l
      ]);
      this.device.queue.writeBuffer(this.uniformBufferResolve, 0, c.buffer);
      const f = this.device.createCommandEncoder(), d = (x) => x.map((C) => ({
        view: C,
        clearValue: {
          r: 0,
          g: 0,
          b: 0,
          a: 0
        },
        loadOp: "clear",
        storeOp: "store"
      })), h = f.beginRenderPass({
        colorAttachments: d(this.rawBrushLayerViews)
      });
      h.setPipeline(this.pipelineBrush), h.setBindGroup(0, this.bindGroupBrush), h.draw(6, 1, 0, 0), h.end();
      const m = f.beginRenderPass({
        colorAttachments: d(this.rawLayerViews)
      });
      if (m.setPipeline(this.pipelineMandelbrot), m.setBindGroup(0, this.bindGroupMandelbrot), m.draw(6, 1, 0, 0), m.end(), this.pipelineCount && this.counterBindGroup && this.counterBuffer && this.counterReadBuffer && this.uniformBufferCount) {
        const x = this.previousMandelbrot.mu;
        this.device.queue.writeBuffer(this.uniformBufferCount, 0, new Float32Array([
          x,
          t,
          this.previousMandelbrot.angle
        ])), f.clearBuffer(this.counterBuffer, 0, 4);
        const C = f.beginComputePass();
        C.setPipeline(this.pipelineCount), C.setBindGroup(0, this.counterBindGroup), C.dispatchWorkgroups(Math.ceil(this.neutralSize / 16), Math.ceil(this.neutralSize / 16)), C.end(), f.copyBufferToBuffer(this.counterBuffer, 0, this.counterReadBuffer, 0, 4);
      }
      const _ = f.beginRenderPass({
        colorAttachments: d(this.resolvedLayerViews)
      });
      _.setPipeline(this.pipelineResolve), _.setBindGroup(0, this.bindGroupResolve), _.draw(6, 1, 0, 0), _.end();
      const z = this.ctx.getCurrentTexture().createView(), G = f.beginRenderPass({
        colorAttachments: [
          {
            view: z,
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
      G.setPipeline(this.pipelineColor), G.setBindGroup(0, this.bindGroupColor), G.draw(6, 1, 0, 0), G.end();
      const T = performance.now();
      this.device.queue.submit([
        f.finish()
      ]), await this.device.queue.onSubmittedWorkDone();
      const M = performance.now() - T;
      if (this.gpuFrameTimeMs = M, M > 0) {
        const x = _He.TARGET_FRAME_MS / M, C = this.iterationBatchSize * x;
        this.iterationBatchSize = Math.round(Math.min(_He.MAX_BATCH_SIZE, Math.max(_He.MIN_BATCH_SIZE, this.iterationBatchSize * 0.7 + C * 0.3)));
      }
      await this.counterReadBuffer.mapAsync(GPUMapMode.READ);
      const y = new Uint32Array(this.counterReadBuffer.getMappedRange());
      if (this.unfinishedPixelCount = y[0], this.counterReadBuffer.unmap(), this.prevFrameMandelbrot = {
        ...this.previousMandelbrot
      }, this.snapshotCallback) {
        try {
          const x = this.snapshotDestWidth ?? 256, C = Math.round(x * 9 / 16), U = this.device.createTexture({
            size: [
              x,
              C,
              1
            ],
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
          });
          {
            const V = this.device.createCommandEncoder(), H = V.beginRenderPass({
              colorAttachments: [
                {
                  view: U.createView(),
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
              V.finish()
            ]);
          }
          const K = (V) => V + 255 & -256, I = x * 4, O = K(I), q = O * C, w = this.device.createBuffer({
            size: q,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
          });
          {
            const V = this.device.createCommandEncoder();
            V.copyTextureToBuffer({
              texture: U
            }, {
              buffer: w,
              offset: 0,
              bytesPerRow: O
            }, {
              width: x,
              height: C,
              depthOrArrayLayers: 1
            }), this.device.queue.submit([
              V.finish()
            ]);
          }
          await this.device.queue.onSubmittedWorkDone(), await w.mapAsync(GPUMapMode.READ);
          const Z = w.getMappedRange(), R = new Uint8ClampedArray(x * C * 4), Y = new Uint8Array(Z);
          for (let V = 0; V < C; ++V) for (let H = 0; H < x; ++H) {
            const pe = V * O + H * 4, oe = (V * x + H) * 4;
            R[oe + 0] = Y[pe + 2], R[oe + 1] = Y[pe + 1], R[oe + 2] = Y[pe + 0], R[oe + 3] = Y[pe + 3];
          }
          const W = document.createElement("canvas");
          W.width = x, W.height = C, W.getContext("2d").putImageData(new ImageData(R, x, C), 0, 0), w.unmap(), this.snapshotCallback(W.toDataURL("image/png"));
        } catch {
          this.snapshotCallback("");
        }
        this.snapshotCallback = void 0, this.snapshotDestWidth = void 0;
      }
    }
    destroy() {
      var _a2, _b, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j, _k, _l2, _m2, _n2, _o2, _p2, _q, _r2, _s2, _t2, _u2, _v2, _w, _x, _y, _z, _A;
      this.stopRenderLoop(), (_b = (_a2 = this.rawTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.rawBrushTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.resolvedTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2), (_h2 = (_g2 = this.mandelbrotReferenceBuffer) == null ? void 0 : _g2.destroy) == null ? void 0 : _h2.call(_g2), (_j = (_i2 = this.uniformBufferMandelbrot) == null ? void 0 : _i2.destroy) == null ? void 0 : _j.call(_i2), (_l2 = (_k = this.uniformBufferColor) == null ? void 0 : _k.destroy) == null ? void 0 : _l2.call(_k), (_n2 = (_m2 = this.uniformBufferBrush) == null ? void 0 : _m2.destroy) == null ? void 0 : _n2.call(_m2), (_p2 = (_o2 = this.uniformBufferResolve) == null ? void 0 : _o2.destroy) == null ? void 0 : _p2.call(_o2), (_r2 = (_q = this.counterBuffer) == null ? void 0 : _q.destroy) == null ? void 0 : _r2.call(_q), (_t2 = (_s2 = this.counterReadBuffer) == null ? void 0 : _s2.destroy) == null ? void 0 : _t2.call(_s2), (_v2 = (_u2 = this.uniformBufferCount) == null ? void 0 : _u2.destroy) == null ? void 0 : _v2.call(_u2), (_w = this.webcamTexture) == null ? void 0 : _w.closeWebcam(), (_y = (_x = this.webcamTileTexture) == null ? void 0 : _x.destroy) == null ? void 0 : _y.call(_x), (_A = (_z = this.paletteTexture) == null ? void 0 : _z.destroy) == null ? void 0 : _A.call(_z);
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
        const r = n - this._fpsLastTime;
        r >= 1e3 && (this.fps = Math.round(this._fpsFrameCount * 1e3 / r), this._fpsFrameCount = 0, this._fpsLastTime = n), this._rafId = requestAnimationFrame(async () => this._loop());
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
      } catch (o) {
        throw console.warn("\xC9chec du chargement de la texture : " + t, o), o;
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
  __publicField(_He, "LAYER_COUNT", 7);
  __publicField(_He, "MIN_BATCH_SIZE", 100);
  __publicField(_He, "MAX_BATCH_SIZE", 1e4);
  __publicField(_He, "TARGET_FRAME_MS", 16);
  __publicField(_He, "ORBIT_CHUNK_SIZE", 100);
  __publicField(_He, "_tileTexture");
  __publicField(_He, "_tileTextureView");
  __publicField(_He, "_skyboxTexture");
  __publicField(_He, "_skyboxTextureView");
  __publicField(_He, "_paletteTexture");
  __publicField(_He, "_paletteTextureView");
  let He = _He;
  const _h = pt({
    __name: "Mandelbrot",
    props: Co({
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
      const n = se(null);
      let r = null, i = null, o, s = false;
      const a = Tt(e, "cx"), l = Tt(e, "cy"), u = Tt(e, "scale"), c = Tt(e, "angle");
      Ct(() => [
        a.value,
        l.value,
        u.value,
        c.value
      ], ([_, z, G, T], [M, y, x, C]) => {
        s || o && (!_ || !z || !G || ((_ !== M || z !== y) && o.origin(_, z), G !== x && o.scale(G), T !== C && o.angle(Number(T))));
      }, {
        flush: "sync"
      });
      const f = e;
      Ct(() => f.dprMultiplier, (_) => {
        i && (i.dprMultiplier = _, m());
      });
      async function d() {
        if (!i || !o) return;
        const _ = o.step();
        if (!_) return;
        const [z, G] = _, [T, M, y, x] = o.get_params();
        s = true, a.value = T, l.value = M, u.value = y, c.value = parseFloat(x), await ai(), s = false;
        const C = Math.min(Math.max(100, 1e3 * f.maxIterationMultiplier * Math.log2(1 / parseFloat(y))), 1e5);
        await i.update({
          cx: T,
          cy: M,
          dx: parseFloat(z),
          dy: parseFloat(G),
          mu: f.mu,
          scale: parseFloat(y),
          angle: parseFloat(x),
          maxIterations: C,
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
          activateZebra: f.activateZebra,
          activateAnimate: f.activateAnimate
        }), await i.render();
      }
      async function h() {
        if (n.value) return r = n.value, o = new Ji(a.value, l.value, u.value, Number(c.value)), o.origin(a.value, l.value), o.scale(u.value), o.angle(Number(c.value)), i = new He(r, {
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
          activateZebra: f.activateZebra,
          activateAnimate: f.activateAnimate
        }), i.initialize(o);
      }
      async function m() {
        if (!n.value || !i) return;
        const _ = n.value.getBoundingClientRect();
        n.value.width = _.width, n.value.height = _.height, i.resize();
      }
      return gt(async () => {
        await h(), window.addEventListener("resize", m), await m(), i && i.startRenderLoop(d);
      }), Sn(() => {
        i == null ? void 0 : i.stopRenderLoop(), window.removeEventListener("resize", m);
      }), t({
        getCanvas: () => n.value,
        getEngine: () => i,
        getNavigator: () => o,
        translate: (_, z) => o == null ? void 0 : o.translate(_, z),
        translateDirect: (_, z) => o == null ? void 0 : o.translate_direct(_, z),
        rotate: (_) => o == null ? void 0 : o.rotate(_),
        angle: (_) => o == null ? void 0 : o.angle(_),
        zoom: (_) => o == null ? void 0 : o.zoom(_),
        step: () => o == null ? void 0 : o.step(),
        getParams: () => o == null ? void 0 : o.get_params(),
        drawOnce: async () => d(),
        resize: async () => m(),
        initialize: async () => h()
      }), (_, z) => (le(), de("canvas", {
        ref_key: "canvasRef",
        ref: n
      }, null, 512));
    }
  }), bh = {
    class: "mobile-nav-controls"
  }, yh = {
    key: 0,
    class: "directional-controls"
  }, xh = pt({
    __name: "MobileNavigationControls",
    props: {
      mandelbrotRef: {}
    },
    setup(e) {
      const t = e, n = se(false), r = se(null);
      let i = null;
      const o = () => {
        n.value = !n.value, n.value || a();
      }, s = (h) => {
        h.preventDefault(), h.stopPropagation(), o();
      }, a = () => {
        r.value = null, i !== null && (clearInterval(i), i = null);
      }, l = (h) => {
        r.value = h;
        const m = 0.1, _ = () => {
          if (t.mandelbrotRef) switch (h) {
            case "north":
              t.mandelbrotRef.translate(0, m);
              break;
            case "south":
              t.mandelbrotRef.translate(0, -m);
              break;
            case "west":
              t.mandelbrotRef.translate(-m, 0);
              break;
            case "east":
              t.mandelbrotRef.translate(m, 0);
              break;
          }
        };
        _(), i = window.setInterval(_, 16);
      }, u = (h) => {
        r.value = `rotate-${h}`;
        const m = 0.025, _ = () => {
          t.mandelbrotRef && (h === "left" ? t.mandelbrotRef.rotate(m) : t.mandelbrotRef.rotate(-m));
        };
        _(), i = window.setInterval(_, 16);
      }, c = (h) => {
        r.value = `zoom-${h}`;
        const m = 0.6, _ = () => {
          t.mandelbrotRef && (h === "in" ? t.mandelbrotRef.zoom(m) : t.mandelbrotRef.zoom(1 / m));
        };
        _(), i = window.setInterval(_, 16);
      }, f = (h, m) => {
        h.preventDefault(), m();
      }, d = (h) => {
        h.preventDefault(), a();
      };
      return (h, m) => (le(), de("div", bh, [
        g("button", {
          class: be([
            "nav-button compass-button",
            {
              active: n.value
            }
          ]),
          onClick: o,
          onTouchend: s,
          "aria-label": "Toggle navigation"
        }, [
          ...m[16] || (m[16] = [
            pl('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-82fd1be4><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-82fd1be4></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-82fd1be4></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-82fd1be4>N</text></svg>', 1)
          ])
        ], 34),
        xe(cf, {
          name: "fade"
        }, {
          default: Ia(() => [
            n.value ? (le(), de("div", yh, [
              g("button", {
                class: be([
                  "nav-button direction-button north",
                  {
                    active: r.value === "north"
                  }
                ]),
                onTouchstart: m[0] || (m[0] = (_) => f(_, () => l("north"))),
                onTouchend: d,
                onMousedown: m[1] || (m[1] = (_) => l("north")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move North"
              }, [
                ...m[17] || (m[17] = [
                  g("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    g("path", {
                      d: "M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              g("button", {
                class: be([
                  "nav-button direction-button south",
                  {
                    active: r.value === "south"
                  }
                ]),
                onTouchstart: m[2] || (m[2] = (_) => f(_, () => l("south"))),
                onTouchend: d,
                onMousedown: m[3] || (m[3] = (_) => l("south")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move South"
              }, [
                ...m[18] || (m[18] = [
                  g("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    g("path", {
                      d: "M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              g("button", {
                class: be([
                  "nav-button direction-button west",
                  {
                    active: r.value === "west"
                  }
                ]),
                onTouchstart: m[4] || (m[4] = (_) => f(_, () => l("west"))),
                onTouchend: d,
                onMousedown: m[5] || (m[5] = (_) => l("west")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move West"
              }, [
                ...m[19] || (m[19] = [
                  g("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    g("path", {
                      d: "M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              g("button", {
                class: be([
                  "nav-button direction-button east",
                  {
                    active: r.value === "east"
                  }
                ]),
                onTouchstart: m[6] || (m[6] = (_) => f(_, () => l("east"))),
                onTouchend: d,
                onMousedown: m[7] || (m[7] = (_) => l("east")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Move East"
              }, [
                ...m[20] || (m[20] = [
                  g("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    g("path", {
                      d: "M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              g("button", {
                class: be([
                  "nav-button corner-button rotate-left",
                  {
                    active: r.value === "rotate-left"
                  }
                ]),
                onTouchstart: m[8] || (m[8] = (_) => f(_, () => u("left"))),
                onTouchend: d,
                onMousedown: m[9] || (m[9] = (_) => u("left")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Rotate Left"
              }, [
                ...m[21] || (m[21] = [
                  g("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    g("path", {
                      d: "M16 8 A6 6 0 1 0 8 16",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round"
                    }),
                    g("path", {
                      d: "M5 16 L8 16 L8 13",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    })
                  ], -1)
                ])
              ], 34),
              g("button", {
                class: be([
                  "nav-button corner-button rotate-right",
                  {
                    active: r.value === "rotate-right"
                  }
                ]),
                onTouchstart: m[10] || (m[10] = (_) => f(_, () => u("right"))),
                onTouchend: d,
                onMousedown: m[11] || (m[11] = (_) => u("right")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Rotate Right"
              }, [
                ...m[22] || (m[22] = [
                  g("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    g("path", {
                      d: "M8 8 A6 6 0 1 1 16 16",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round"
                    }),
                    g("path", {
                      d: "M19 16 L16 16 L16 13",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    })
                  ], -1)
                ])
              ], 34),
              g("button", {
                class: be([
                  "nav-button corner-button zoom-out",
                  {
                    active: r.value === "zoom-out"
                  }
                ]),
                onTouchstart: m[12] || (m[12] = (_) => f(_, () => c("out"))),
                onTouchend: d,
                onMousedown: m[13] || (m[13] = (_) => c("out")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Zoom Out"
              }, [
                ...m[23] || (m[23] = [
                  g("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    g("circle", {
                      cx: "11",
                      cy: "11",
                      r: "7",
                      stroke: "currentColor",
                      "stroke-width": "2"
                    }),
                    g("path", {
                      d: "M18 18 L22 22",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    g("path", {
                      d: "M8 11 L14 11",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    })
                  ], -1)
                ])
              ], 34),
              g("button", {
                class: be([
                  "nav-button corner-button zoom-in",
                  {
                    active: r.value === "zoom-in"
                  }
                ]),
                onTouchstart: m[14] || (m[14] = (_) => f(_, () => c("in"))),
                onTouchend: d,
                onMousedown: m[15] || (m[15] = (_) => c("in")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Zoom In"
              }, [
                ...m[24] || (m[24] = [
                  g("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    g("circle", {
                      cx: "11",
                      cy: "11",
                      r: "7",
                      stroke: "currentColor",
                      "stroke-width": "2"
                    }),
                    g("path", {
                      d: "M18 18 L22 22",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    g("path", {
                      d: "M11 8 L11 14",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    g("path", {
                      d: "M8 11 L14 11",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    })
                  ], -1)
                ])
              ], 34)
            ])) : Ft("", true)
          ]),
          _: 1
        })
      ]));
    }
  }), Mn = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [r, i] of t) n[r] = i;
    return n;
  }, wh = Mn(xh, [
    [
      "__scopeId",
      "data-v-82fd1be4"
    ]
  ]), Sh = {
    style: {
      position: "relative",
      width: "100%",
      height: "100%"
    }
  }, gr = 0.01, Hs = 0.025, Mh = pt({
    __name: "MandelbrotController",
    props: Co({
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
      maxIterationMultiplier: {}
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
      const n = Tt(e, "cx"), r = Tt(e, "cy"), i = Tt(e, "scale"), o = Tt(e, "angle"), s = e, a = se(null), l = {};
      t({
        getCanvas: T,
        getEngine: () => {
          var _a2;
          return ((_a2 = a.value) == null ? void 0 : _a2.getEngine()) ?? null;
        }
      });
      let u = false, c = false, f = 0, d = 0, h = 0, m = 0, _ = 0, z = false, G = null;
      function T() {
        var _a2;
        return ((_a2 = a.value) == null ? void 0 : _a2.getCanvas()) ?? null;
      }
      function M(R) {
        const Y = T();
        if (!Y) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const W = Y.getBoundingClientRect();
        return {
          x: R.clientX - W.left,
          y: R.clientY - W.top,
          width: W.width,
          height: W.height
        };
      }
      function y(R) {
        l[R.code] = true;
      }
      function x(R) {
        l[R.code] = false;
      }
      function C(R) {
        var _a2, _b;
        R.preventDefault();
        const Y = 0.6;
        R.deltaY < 0 ? (_a2 = a.value) == null ? void 0 : _a2.zoom(Y) : (_b = a.value) == null ? void 0 : _b.zoom(1 / Y);
      }
      function U(R) {
        if (R.button === 2) c = true;
        else {
          u = true;
          const Y = M(R);
          f = Y.x, d = Y.y;
        }
      }
      function K(R) {
        var _a2, _b;
        const Y = M(R);
        if (c) {
          const D = T();
          if (!D) return;
          const b = D.getBoundingClientRect(), L = b.width / 2, Me = b.height / 2, et = Y.x, Ve = Y.y, vt = Math.atan2(Ve - Me, et - L);
          (_a2 = a.value) == null ? void 0 : _a2.angle(vt);
          return;
        }
        if (!u) return;
        const W = Y.width, V = Y.height, H = W / V, pe = (Y.x - f) / W * 2, oe = (Y.y - d) / V * 2;
        (_b = a.value) == null ? void 0 : _b.translateDirect(-pe * H, oe), f = Y.x, d = Y.y;
      }
      function I(R) {
        R.button === 2 ? c = false : u = false;
      }
      function O(R) {
        var _a2;
        const Y = T();
        if (Y) {
          if (R.touches.length === 1) {
            u = true;
            const W = R.touches[0], V = Y.getBoundingClientRect();
            f = W.clientX - V.left, d = W.clientY - V.top;
          } else if (R.touches.length === 2) {
            u = false, z = true;
            const [W, V] = R.touches;
            h = Math.hypot(V.clientX - W.clientX, V.clientY - W.clientY), m = Math.atan2(V.clientY - W.clientY, V.clientX - W.clientX);
            const H = (_a2 = a.value) == null ? void 0 : _a2.getParams();
            _ = H ? parseFloat(H[3]) : 0;
          }
        }
      }
      function q(R) {
        var _a2, _b, _c2;
        const Y = T();
        if (Y) {
          if (u && R.touches.length === 1) {
            const W = R.touches[0], V = Y.getBoundingClientRect(), H = W.clientX - V.left, pe = W.clientY - V.top, oe = V.width, D = V.height, b = oe / D, L = (H - f) / oe * 2, Me = (pe - d) / D * 2;
            (_a2 = a.value) == null ? void 0 : _a2.translateDirect(-L * b, Me), f = H, d = pe;
          } else if (z && R.touches.length === 2) {
            const [W, V] = R.touches, H = Math.hypot(V.clientX - W.clientX, V.clientY - W.clientY), pe = Math.atan2(V.clientY - W.clientY, V.clientX - W.clientX), oe = h / H;
            (_b = a.value) == null ? void 0 : _b.zoom(oe);
            const D = pe - m;
            (_c2 = a.value) == null ? void 0 : _c2.angle(_ + D);
          }
        }
      }
      function w(R) {
        R.touches.length === 0 && (u = false, z = false);
      }
      function Z() {
        var _a2, _b, _c2, _d2, _e2, _f2, _g2, _h2;
        l.KeyW && ((_a2 = a.value) == null ? void 0 : _a2.translate(0, gr)), l.KeyS && ((_b = a.value) == null ? void 0 : _b.translate(0, -gr)), l.KeyA && ((_c2 = a.value) == null ? void 0 : _c2.translate(-gr, 0)), l.KeyD && ((_d2 = a.value) == null ? void 0 : _d2.translate(gr, 0)), l.KeyQ && ((_e2 = a.value) == null ? void 0 : _e2.rotate(Hs)), l.KeyE && ((_f2 = a.value) == null ? void 0 : _f2.rotate(-Hs));
        const R = 0.6;
        l.KeyR && ((_g2 = a.value) == null ? void 0 : _g2.zoom(R)), l.KeyF && ((_h2 = a.value) == null ? void 0 : _h2.zoom(1 / R)), G = window.setTimeout(Z, 16);
      }
      return gt(async () => {
        const R = T();
        R && (window.addEventListener("keydown", y), window.addEventListener("keyup", x), R.addEventListener("wheel", C, {
          passive: false
        }), R.addEventListener("mousedown", U), R.addEventListener("contextmenu", (Y) => Y.preventDefault()), window.addEventListener("mousemove", K), window.addEventListener("mouseup", I), R.addEventListener("touchstart", O, {
          passive: false
        }), R.addEventListener("touchmove", q, {
          passive: false
        }), R.addEventListener("touchend", w, {
          passive: false
        }), Z());
      }), Sn(() => {
        G !== null && clearTimeout(G);
        const R = T();
        window.removeEventListener("keydown", y), window.removeEventListener("keyup", x), window.removeEventListener("mousemove", K), window.removeEventListener("mouseup", I), R && (R.removeEventListener("wheel", C), R.removeEventListener("mousedown", U), R.removeEventListener("contextmenu", (Y) => Y.preventDefault()), R.removeEventListener("touchstart", O), R.removeEventListener("touchmove", q), R.removeEventListener("touchend", w));
      }), (R, Y) => (le(), de("div", Sh, [
        xe(_h, {
          ref_key: "mandelbrotRef",
          ref: a,
          scale: i.value,
          "onUpdate:scale": Y[0] || (Y[0] = (W) => i.value = W),
          angle: o.value,
          "onUpdate:angle": Y[1] || (Y[1] = (W) => o.value = W),
          cx: n.value,
          "onUpdate:cx": Y[2] || (Y[2] = (W) => n.value = W),
          cy: r.value,
          "onUpdate:cy": Y[3] || (Y[3] = (W) => r.value = W),
          mu: s.mu,
          epsilon: s.epsilon,
          antialiasLevel: s.antialiasLevel,
          shadingLevel: s.shadingLevel,
          palettePeriod: s.palettePeriod,
          tessellationLevel: s.tessellationLevel,
          colorStops: s.colorStops,
          activatePalette: s.activatePalette,
          activateSkybox: s.activateSkybox,
          activateTessellation: s.activateTessellation,
          activateWebcam: s.activateWebcam,
          activateShading: s.activateShading,
          activateZebra: s.activateZebra,
          activateSmoothness: s.activateSmoothness,
          activateAnimate: s.activateAnimate,
          paletteOffset: s.paletteOffset,
          dprMultiplier: s.dprMultiplier,
          maxIterationMultiplier: s.maxIterationMultiplier
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
          "maxIterationMultiplier"
        ]),
        xe(wh, {
          "mandelbrot-ref": a.value
        }, null, 8, [
          "mandelbrot-ref"
        ])
      ]));
    }
  }), Th = Mn(Mh, [
    [
      "__scopeId",
      "data-v-6aa19e19"
    ]
  ]), Ch = [
    "fill",
    "stroke"
  ], kh = pt({
    __name: "GlissiereHandle",
    props: {
      stop: {}
    },
    emits: [
      "update:position"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = se(null);
      function o(l) {
        let u = l.replace("#", "");
        u.length === 3 && (u = u.split("").map((h) => h + h).join(""));
        const c = parseInt(u.substring(0, 2), 16) / 255, f = parseInt(u.substring(2, 4), 16) / 255, d = parseInt(u.substring(4, 6), 16) / 255;
        return 0.299 * c + 0.587 * f + 0.114 * d;
      }
      const s = Te(() => o(n.stop.color) > 0.5 ? "#222" : "#fff");
      function a(l) {
        l.preventDefault();
        const u = l.clientX, c = n.stop.position, f = i.value;
        if (!f) return;
        const h = f.parentElement.getBoundingClientRect();
        function m(z) {
          const G = z.clientX - u;
          let T = c + G / h.width;
          T = Math.max(0, Math.min(1, T)), r("update:position", T);
        }
        function _() {
          window.removeEventListener("mousemove", m), window.removeEventListener("mouseup", _);
        }
        window.addEventListener("mousemove", m), window.addEventListener("mouseup", _);
      }
      return (l, u) => (le(), de("svg", {
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
        g("rect", {
          x: "6",
          y: "0",
          width: "12",
          height: "64",
          rx: "8",
          fill: n.stop.color,
          stroke: s.value,
          "stroke-width": "2"
        }, null, 8, Ch)
      ], 36));
    }
  });
  function Tr(e, t) {
    return e == null || t == null ? NaN : e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
  }
  function Eh(e, t) {
    return e == null || t == null ? NaN : t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
  }
  function Ol(e) {
    let t, n, r;
    e.length !== 2 ? (t = Tr, n = (a, l) => Tr(e(a), l), r = (a, l) => e(a) - l) : (t = e === Tr || e === Eh ? e : Ah, n = e, r = e);
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
    function o(a, l, u = 0, c = a.length) {
      if (u < c) {
        if (t(l, l) !== 0) return c;
        do {
          const f = u + c >>> 1;
          n(a[f], l) <= 0 ? u = f + 1 : c = f;
        } while (u < c);
      }
      return u;
    }
    function s(a, l, u = 0, c = a.length) {
      const f = i(a, l, u, c - 1);
      return f > u && r(a[f - 1], l) > -r(a[f], l) ? f - 1 : f;
    }
    return {
      left: i,
      center: s,
      right: o
    };
  }
  function Ah() {
    return 0;
  }
  function Ph(e) {
    return e === null ? NaN : +e;
  }
  const Lh = Ol(Tr), Rh = Lh.right;
  Ol(Ph).center;
  const zh = Math.sqrt(50), Nh = Math.sqrt(10), Bh = Math.sqrt(2);
  function Wr(e, t, n) {
    const r = (t - e) / Math.max(0, n), i = Math.floor(Math.log10(r)), o = r / Math.pow(10, i), s = o >= zh ? 10 : o >= Nh ? 5 : o >= Bh ? 2 : 1;
    let a, l, u;
    return i < 0 ? (u = Math.pow(10, -i) / s, a = Math.round(e * u), l = Math.round(t * u), a / u < e && ++a, l / u > t && --l, u = -u) : (u = Math.pow(10, i) * s, a = Math.round(e / u), l = Math.round(t / u), a * u < e && ++a, l * u > t && --l), l < a && 0.5 <= n && n < 2 ? Wr(e, t, n * 2) : [
      a,
      l,
      u
    ];
  }
  function Ih(e, t, n) {
    if (t = +t, e = +e, n = +n, !(n > 0)) return [];
    if (e === t) return [
      e
    ];
    const r = t < e, [i, o, s] = r ? Wr(t, e, n) : Wr(e, t, n);
    if (!(o >= i)) return [];
    const a = o - i + 1, l = new Array(a);
    if (r) if (s < 0) for (let u = 0; u < a; ++u) l[u] = (o - u) / -s;
    else for (let u = 0; u < a; ++u) l[u] = (o - u) * s;
    else if (s < 0) for (let u = 0; u < a; ++u) l[u] = (i + u) / -s;
    else for (let u = 0; u < a; ++u) l[u] = (i + u) * s;
    return l;
  }
  function ro(e, t, n) {
    return t = +t, e = +e, n = +n, Wr(e, t, n)[2];
  }
  function Oh(e, t, n) {
    t = +t, e = +e, n = +n;
    const r = t < e, i = r ? ro(t, e, n) : ro(e, t, n);
    return (r ? -1 : 1) * (i < 0 ? 1 / -i : i);
  }
  function Fh(e) {
    return e;
  }
  var Uh = 3, Ws = 1e-6;
  function Dh(e) {
    return "translate(" + e + ",0)";
  }
  function $h(e) {
    return (t) => +e(t);
  }
  function Vh(e, t) {
    return t = Math.max(0, e.bandwidth() - t * 2) / 2, e.round() && (t = Math.round(t)), (n) => +e(n) + t;
  }
  function Gh() {
    return !this.__axis;
  }
  function Hh(e, t) {
    var n = [], r = null, i = null, o = 6, s = 6, a = 3, l = typeof window < "u" && window.devicePixelRatio > 1 ? 0 : 0.5, u = 1, c = "y", f = Dh;
    function d(h) {
      var m = r ?? (t.ticks ? t.ticks.apply(t, n) : t.domain()), _ = i ?? (t.tickFormat ? t.tickFormat.apply(t, n) : Fh), z = Math.max(o, 0) + a, G = t.range(), T = +G[0] + l, M = +G[G.length - 1] + l, y = (t.bandwidth ? Vh : $h)(t.copy(), l), x = h.selection ? h.selection() : h, C = x.selectAll(".domain").data([
        null
      ]), U = x.selectAll(".tick").data(m, t).order(), K = U.exit(), I = U.enter().append("g").attr("class", "tick"), O = U.select("line"), q = U.select("text");
      C = C.merge(C.enter().insert("path", ".tick").attr("class", "domain").attr("stroke", "currentColor")), U = U.merge(I), O = O.merge(I.append("line").attr("stroke", "currentColor").attr(c + "2", u * o)), q = q.merge(I.append("text").attr("fill", "currentColor").attr(c, u * z).attr("dy", "0.71em")), h !== x && (C = C.transition(h), U = U.transition(h), O = O.transition(h), q = q.transition(h), K = K.transition(h).attr("opacity", Ws).attr("transform", function(w) {
        return isFinite(w = y(w)) ? f(w + l) : this.getAttribute("transform");
      }), I.attr("opacity", Ws).attr("transform", function(w) {
        var Z = this.parentNode.__axis;
        return f((Z && isFinite(Z = Z(w)) ? Z : y(w)) + l);
      })), K.remove(), C.attr("d", s ? "M" + T + "," + u * s + "V" + l + "H" + M + "V" + u * s : "M" + T + "," + l + "H" + M), U.attr("opacity", 1).attr("transform", function(w) {
        return f(y(w) + l);
      }), O.attr(c + "2", u * o), q.attr(c, u * z).text(_), x.filter(Gh).attr("fill", "none").attr("font-size", 10).attr("font-family", "sans-serif").attr("text-anchor", "middle"), x.each(function() {
        this.__axis = y;
      });
    }
    return d.scale = function(h) {
      return arguments.length ? (t = h, d) : t;
    }, d.ticks = function() {
      return n = Array.from(arguments), d;
    }, d.tickArguments = function(h) {
      return arguments.length ? (n = h == null ? [] : Array.from(h), d) : n.slice();
    }, d.tickValues = function(h) {
      return arguments.length ? (r = h == null ? null : Array.from(h), d) : r && r.slice();
    }, d.tickFormat = function(h) {
      return arguments.length ? (i = h, d) : i;
    }, d.tickSize = function(h) {
      return arguments.length ? (o = s = +h, d) : o;
    }, d.tickSizeInner = function(h) {
      return arguments.length ? (o = +h, d) : o;
    }, d.tickSizeOuter = function(h) {
      return arguments.length ? (s = +h, d) : s;
    }, d.tickPadding = function(h) {
      return arguments.length ? (a = +h, d) : a;
    }, d.offset = function(h) {
      return arguments.length ? (l = +h, d) : l;
    }, d;
  }
  function Wh(e) {
    return Hh(Uh, e);
  }
  var qh = {
    value: () => {
    }
  };
  function No() {
    for (var e = 0, t = arguments.length, n = {}, r; e < t; ++e) {
      if (!(r = arguments[e] + "") || r in n || /[\s.]/.test(r)) throw new Error("illegal type: " + r);
      n[r] = [];
    }
    return new Cr(n);
  }
  function Cr(e) {
    this._ = e;
  }
  function Yh(e, t) {
    return e.trim().split(/^|\s+/).map(function(n) {
      var r = "", i = n.indexOf(".");
      if (i >= 0 && (r = n.slice(i + 1), n = n.slice(0, i)), n && !t.hasOwnProperty(n)) throw new Error("unknown type: " + n);
      return {
        type: n,
        name: r
      };
    });
  }
  Cr.prototype = No.prototype = {
    constructor: Cr,
    on: function(e, t) {
      var n = this._, r = Yh(e + "", n), i, o = -1, s = r.length;
      if (arguments.length < 2) {
        for (; ++o < s; ) if ((i = (e = r[o]).type) && (i = Kh(n[i], e.name))) return i;
        return;
      }
      if (t != null && typeof t != "function") throw new Error("invalid callback: " + t);
      for (; ++o < s; ) if (i = (e = r[o]).type) n[i] = qs(n[i], e.name, t);
      else if (t == null) for (i in n) n[i] = qs(n[i], e.name, null);
      return this;
    },
    copy: function() {
      var e = {}, t = this._;
      for (var n in t) e[n] = t[n].slice();
      return new Cr(e);
    },
    call: function(e, t) {
      if ((i = arguments.length - 2) > 0) for (var n = new Array(i), r = 0, i, o; r < i; ++r) n[r] = arguments[r + 2];
      if (!this._.hasOwnProperty(e)) throw new Error("unknown type: " + e);
      for (o = this._[e], r = 0, i = o.length; r < i; ++r) o[r].value.apply(t, n);
    },
    apply: function(e, t, n) {
      if (!this._.hasOwnProperty(e)) throw new Error("unknown type: " + e);
      for (var r = this._[e], i = 0, o = r.length; i < o; ++i) r[i].value.apply(t, n);
    }
  };
  function Kh(e, t) {
    for (var n = 0, r = e.length, i; n < r; ++n) if ((i = e[n]).name === t) return i.value;
  }
  function qs(e, t, n) {
    for (var r = 0, i = e.length; r < i; ++r) if (e[r].name === t) {
      e[r] = qh, e = e.slice(0, r).concat(e.slice(r + 1));
      break;
    }
    return n != null && e.push({
      name: t,
      value: n
    }), e;
  }
  var io = "http://www.w3.org/1999/xhtml";
  const Ys = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: io,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };
  function pi(e) {
    var t = e += "", n = t.indexOf(":");
    return n >= 0 && (t = e.slice(0, n)) !== "xmlns" && (e = e.slice(n + 1)), Ys.hasOwnProperty(t) ? {
      space: Ys[t],
      local: e
    } : e;
  }
  function Xh(e) {
    return function() {
      var t = this.ownerDocument, n = this.namespaceURI;
      return n === io && t.documentElement.namespaceURI === io ? t.createElement(e) : t.createElementNS(n, e);
    };
  }
  function jh(e) {
    return function() {
      return this.ownerDocument.createElementNS(e.space, e.local);
    };
  }
  function Bo(e) {
    var t = pi(e);
    return (t.local ? jh : Xh)(t);
  }
  function Zh() {
  }
  function Io(e) {
    return e == null ? Zh : function() {
      return this.querySelector(e);
    };
  }
  function Jh(e) {
    typeof e != "function" && (e = Io(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var o = t[i], s = o.length, a = r[i] = new Array(s), l, u, c = 0; c < s; ++c) (l = o[c]) && (u = e.call(l, l.__data__, c, o)) && ("__data__" in l && (u.__data__ = l.__data__), a[c] = u);
    return new $e(r, this._parents);
  }
  function Qh(e) {
    return e == null ? [] : Array.isArray(e) ? e : Array.from(e);
  }
  function ep() {
    return [];
  }
  function Fl(e) {
    return e == null ? ep : function() {
      return this.querySelectorAll(e);
    };
  }
  function tp(e) {
    return function() {
      return Qh(e.apply(this, arguments));
    };
  }
  function np(e) {
    typeof e == "function" ? e = tp(e) : e = Fl(e);
    for (var t = this._groups, n = t.length, r = [], i = [], o = 0; o < n; ++o) for (var s = t[o], a = s.length, l, u = 0; u < a; ++u) (l = s[u]) && (r.push(e.call(l, l.__data__, u, s)), i.push(l));
    return new $e(r, i);
  }
  function Ul(e) {
    return function() {
      return this.matches(e);
    };
  }
  function Dl(e) {
    return function(t) {
      return t.matches(e);
    };
  }
  var rp = Array.prototype.find;
  function ip(e) {
    return function() {
      return rp.call(this.children, e);
    };
  }
  function op() {
    return this.firstElementChild;
  }
  function sp(e) {
    return this.select(e == null ? op : ip(typeof e == "function" ? e : Dl(e)));
  }
  var ap = Array.prototype.filter;
  function lp() {
    return Array.from(this.children);
  }
  function up(e) {
    return function() {
      return ap.call(this.children, e);
    };
  }
  function cp(e) {
    return this.selectAll(e == null ? lp : up(typeof e == "function" ? e : Dl(e)));
  }
  function fp(e) {
    typeof e != "function" && (e = Ul(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var o = t[i], s = o.length, a = r[i] = [], l, u = 0; u < s; ++u) (l = o[u]) && e.call(l, l.__data__, u, o) && a.push(l);
    return new $e(r, this._parents);
  }
  function $l(e) {
    return new Array(e.length);
  }
  function dp() {
    return new $e(this._enter || this._groups.map($l), this._parents);
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
  function hp(e) {
    return function() {
      return e;
    };
  }
  function pp(e, t, n, r, i, o) {
    for (var s = 0, a, l = t.length, u = o.length; s < u; ++s) (a = t[s]) ? (a.__data__ = o[s], r[s] = a) : n[s] = new qr(e, o[s]);
    for (; s < l; ++s) (a = t[s]) && (i[s] = a);
  }
  function gp(e, t, n, r, i, o, s) {
    var a, l, u = /* @__PURE__ */ new Map(), c = t.length, f = o.length, d = new Array(c), h;
    for (a = 0; a < c; ++a) (l = t[a]) && (d[a] = h = s.call(l, l.__data__, a, t) + "", u.has(h) ? i[a] = l : u.set(h, l));
    for (a = 0; a < f; ++a) h = s.call(e, o[a], a, o) + "", (l = u.get(h)) ? (r[a] = l, l.__data__ = o[a], u.delete(h)) : n[a] = new qr(e, o[a]);
    for (a = 0; a < c; ++a) (l = t[a]) && u.get(d[a]) === l && (i[a] = l);
  }
  function mp(e) {
    return e.__data__;
  }
  function vp(e, t) {
    if (!arguments.length) return Array.from(this, mp);
    var n = t ? gp : pp, r = this._parents, i = this._groups;
    typeof e != "function" && (e = hp(e));
    for (var o = i.length, s = new Array(o), a = new Array(o), l = new Array(o), u = 0; u < o; ++u) {
      var c = r[u], f = i[u], d = f.length, h = _p(e.call(c, c && c.__data__, u, r)), m = h.length, _ = a[u] = new Array(m), z = s[u] = new Array(m), G = l[u] = new Array(d);
      n(c, f, _, z, G, h, t);
      for (var T = 0, M = 0, y, x; T < m; ++T) if (y = _[T]) {
        for (T >= M && (M = T + 1); !(x = z[M]) && ++M < m; ) ;
        y._next = x || null;
      }
    }
    return s = new $e(s, r), s._enter = a, s._exit = l, s;
  }
  function _p(e) {
    return typeof e == "object" && "length" in e ? e : Array.from(e);
  }
  function bp() {
    return new $e(this._exit || this._groups.map($l), this._parents);
  }
  function yp(e, t, n) {
    var r = this.enter(), i = this, o = this.exit();
    return typeof e == "function" ? (r = e(r), r && (r = r.selection())) : r = r.append(e + ""), t != null && (i = t(i), i && (i = i.selection())), n == null ? o.remove() : n(o), r && i ? r.merge(i).order() : i;
  }
  function xp(e) {
    for (var t = e.selection ? e.selection() : e, n = this._groups, r = t._groups, i = n.length, o = r.length, s = Math.min(i, o), a = new Array(i), l = 0; l < s; ++l) for (var u = n[l], c = r[l], f = u.length, d = a[l] = new Array(f), h, m = 0; m < f; ++m) (h = u[m] || c[m]) && (d[m] = h);
    for (; l < i; ++l) a[l] = n[l];
    return new $e(a, this._parents);
  }
  function wp() {
    for (var e = this._groups, t = -1, n = e.length; ++t < n; ) for (var r = e[t], i = r.length - 1, o = r[i], s; --i >= 0; ) (s = r[i]) && (o && s.compareDocumentPosition(o) ^ 4 && o.parentNode.insertBefore(s, o), o = s);
    return this;
  }
  function Sp(e) {
    e || (e = Mp);
    function t(f, d) {
      return f && d ? e(f.__data__, d.__data__) : !f - !d;
    }
    for (var n = this._groups, r = n.length, i = new Array(r), o = 0; o < r; ++o) {
      for (var s = n[o], a = s.length, l = i[o] = new Array(a), u, c = 0; c < a; ++c) (u = s[c]) && (l[c] = u);
      l.sort(t);
    }
    return new $e(i, this._parents).order();
  }
  function Mp(e, t) {
    return e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
  }
  function Tp() {
    var e = arguments[0];
    return arguments[0] = this, e.apply(null, arguments), this;
  }
  function Cp() {
    return Array.from(this);
  }
  function kp() {
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, o = r.length; i < o; ++i) {
      var s = r[i];
      if (s) return s;
    }
    return null;
  }
  function Ep() {
    let e = 0;
    for (const t of this) ++e;
    return e;
  }
  function Ap() {
    return !this.node();
  }
  function Pp(e) {
    for (var t = this._groups, n = 0, r = t.length; n < r; ++n) for (var i = t[n], o = 0, s = i.length, a; o < s; ++o) (a = i[o]) && e.call(a, a.__data__, o, i);
    return this;
  }
  function Lp(e) {
    return function() {
      this.removeAttribute(e);
    };
  }
  function Rp(e) {
    return function() {
      this.removeAttributeNS(e.space, e.local);
    };
  }
  function zp(e, t) {
    return function() {
      this.setAttribute(e, t);
    };
  }
  function Np(e, t) {
    return function() {
      this.setAttributeNS(e.space, e.local, t);
    };
  }
  function Bp(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? this.removeAttribute(e) : this.setAttribute(e, n);
    };
  }
  function Ip(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n);
    };
  }
  function Op(e, t) {
    var n = pi(e);
    if (arguments.length < 2) {
      var r = this.node();
      return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n);
    }
    return this.each((t == null ? n.local ? Rp : Lp : typeof t == "function" ? n.local ? Ip : Bp : n.local ? Np : zp)(n, t));
  }
  function Vl(e) {
    return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView;
  }
  function Fp(e) {
    return function() {
      this.style.removeProperty(e);
    };
  }
  function Up(e, t, n) {
    return function() {
      this.style.setProperty(e, t, n);
    };
  }
  function Dp(e, t, n) {
    return function() {
      var r = t.apply(this, arguments);
      r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n);
    };
  }
  function $p(e, t, n) {
    return arguments.length > 1 ? this.each((t == null ? Fp : typeof t == "function" ? Dp : Up)(e, t, n ?? "")) : yn(this.node(), e);
  }
  function yn(e, t) {
    return e.style.getPropertyValue(t) || Vl(e).getComputedStyle(e, null).getPropertyValue(t);
  }
  function Vp(e) {
    return function() {
      delete this[e];
    };
  }
  function Gp(e, t) {
    return function() {
      this[e] = t;
    };
  }
  function Hp(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? delete this[e] : this[e] = n;
    };
  }
  function Wp(e, t) {
    return arguments.length > 1 ? this.each((t == null ? Vp : typeof t == "function" ? Hp : Gp)(e, t)) : this.node()[e];
  }
  function Gl(e) {
    return e.trim().split(/^|\s+/);
  }
  function Oo(e) {
    return e.classList || new Hl(e);
  }
  function Hl(e) {
    this._node = e, this._names = Gl(e.getAttribute("class") || "");
  }
  Hl.prototype = {
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
  function Wl(e, t) {
    for (var n = Oo(e), r = -1, i = t.length; ++r < i; ) n.add(t[r]);
  }
  function ql(e, t) {
    for (var n = Oo(e), r = -1, i = t.length; ++r < i; ) n.remove(t[r]);
  }
  function qp(e) {
    return function() {
      Wl(this, e);
    };
  }
  function Yp(e) {
    return function() {
      ql(this, e);
    };
  }
  function Kp(e, t) {
    return function() {
      (t.apply(this, arguments) ? Wl : ql)(this, e);
    };
  }
  function Xp(e, t) {
    var n = Gl(e + "");
    if (arguments.length < 2) {
      for (var r = Oo(this.node()), i = -1, o = n.length; ++i < o; ) if (!r.contains(n[i])) return false;
      return true;
    }
    return this.each((typeof t == "function" ? Kp : t ? qp : Yp)(n, t));
  }
  function jp() {
    this.textContent = "";
  }
  function Zp(e) {
    return function() {
      this.textContent = e;
    };
  }
  function Jp(e) {
    return function() {
      var t = e.apply(this, arguments);
      this.textContent = t ?? "";
    };
  }
  function Qp(e) {
    return arguments.length ? this.each(e == null ? jp : (typeof e == "function" ? Jp : Zp)(e)) : this.node().textContent;
  }
  function eg() {
    this.innerHTML = "";
  }
  function tg(e) {
    return function() {
      this.innerHTML = e;
    };
  }
  function ng(e) {
    return function() {
      var t = e.apply(this, arguments);
      this.innerHTML = t ?? "";
    };
  }
  function rg(e) {
    return arguments.length ? this.each(e == null ? eg : (typeof e == "function" ? ng : tg)(e)) : this.node().innerHTML;
  }
  function ig() {
    this.nextSibling && this.parentNode.appendChild(this);
  }
  function og() {
    return this.each(ig);
  }
  function sg() {
    this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }
  function ag() {
    return this.each(sg);
  }
  function lg(e) {
    var t = typeof e == "function" ? e : Bo(e);
    return this.select(function() {
      return this.appendChild(t.apply(this, arguments));
    });
  }
  function ug() {
    return null;
  }
  function cg(e, t) {
    var n = typeof e == "function" ? e : Bo(e), r = t == null ? ug : typeof t == "function" ? t : Io(t);
    return this.select(function() {
      return this.insertBefore(n.apply(this, arguments), r.apply(this, arguments) || null);
    });
  }
  function fg() {
    var e = this.parentNode;
    e && e.removeChild(this);
  }
  function dg() {
    return this.each(fg);
  }
  function hg() {
    var e = this.cloneNode(false), t = this.parentNode;
    return t ? t.insertBefore(e, this.nextSibling) : e;
  }
  function pg() {
    var e = this.cloneNode(true), t = this.parentNode;
    return t ? t.insertBefore(e, this.nextSibling) : e;
  }
  function gg(e) {
    return this.select(e ? pg : hg);
  }
  function mg(e) {
    return arguments.length ? this.property("__data__", e) : this.node().__data__;
  }
  function vg(e) {
    return function(t) {
      e.call(this, t, this.__data__);
    };
  }
  function _g(e) {
    return e.trim().split(/^|\s+/).map(function(t) {
      var n = "", r = t.indexOf(".");
      return r >= 0 && (n = t.slice(r + 1), t = t.slice(0, r)), {
        type: t,
        name: n
      };
    });
  }
  function bg(e) {
    return function() {
      var t = this.__on;
      if (t) {
        for (var n = 0, r = -1, i = t.length, o; n < i; ++n) o = t[n], (!e.type || o.type === e.type) && o.name === e.name ? this.removeEventListener(o.type, o.listener, o.options) : t[++r] = o;
        ++r ? t.length = r : delete this.__on;
      }
    };
  }
  function yg(e, t, n) {
    return function() {
      var r = this.__on, i, o = vg(t);
      if (r) {
        for (var s = 0, a = r.length; s < a; ++s) if ((i = r[s]).type === e.type && i.name === e.name) {
          this.removeEventListener(i.type, i.listener, i.options), this.addEventListener(i.type, i.listener = o, i.options = n), i.value = t;
          return;
        }
      }
      this.addEventListener(e.type, o, n), i = {
        type: e.type,
        name: e.name,
        value: t,
        listener: o,
        options: n
      }, r ? r.push(i) : this.__on = [
        i
      ];
    };
  }
  function xg(e, t, n) {
    var r = _g(e + ""), i, o = r.length, s;
    if (arguments.length < 2) {
      var a = this.node().__on;
      if (a) {
        for (var l = 0, u = a.length, c; l < u; ++l) for (i = 0, c = a[l]; i < o; ++i) if ((s = r[i]).type === c.type && s.name === c.name) return c.value;
      }
      return;
    }
    for (a = t ? yg : bg, i = 0; i < o; ++i) this.each(a(r[i], t, n));
    return this;
  }
  function Yl(e, t, n) {
    var r = Vl(e), i = r.CustomEvent;
    typeof i == "function" ? i = new i(t, n) : (i = r.document.createEvent("Event"), n ? (i.initEvent(t, n.bubbles, n.cancelable), i.detail = n.detail) : i.initEvent(t, false, false)), e.dispatchEvent(i);
  }
  function wg(e, t) {
    return function() {
      return Yl(this, e, t);
    };
  }
  function Sg(e, t) {
    return function() {
      return Yl(this, e, t.apply(this, arguments));
    };
  }
  function Mg(e, t) {
    return this.each((typeof t == "function" ? Sg : wg)(e, t));
  }
  function* Tg() {
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, o = r.length, s; i < o; ++i) (s = r[i]) && (yield s);
  }
  var Kl = [
    null
  ];
  function $e(e, t) {
    this._groups = e, this._parents = t;
  }
  function sr() {
    return new $e([
      [
        document.documentElement
      ]
    ], Kl);
  }
  function Cg() {
    return this;
  }
  $e.prototype = sr.prototype = {
    constructor: $e,
    select: Jh,
    selectAll: np,
    selectChild: sp,
    selectChildren: cp,
    filter: fp,
    data: vp,
    enter: dp,
    exit: bp,
    join: yp,
    merge: xp,
    selection: Cg,
    order: wp,
    sort: Sp,
    call: Tp,
    nodes: Cp,
    node: kp,
    size: Ep,
    empty: Ap,
    each: Pp,
    attr: Op,
    style: $p,
    property: Wp,
    classed: Xp,
    text: Qp,
    html: rg,
    raise: og,
    lower: ag,
    append: lg,
    insert: cg,
    remove: dg,
    clone: gg,
    datum: mg,
    on: xg,
    dispatch: Mg,
    [Symbol.iterator]: Tg
  };
  function Qt(e) {
    return typeof e == "string" ? new $e([
      [
        document.querySelector(e)
      ]
    ], [
      document.documentElement
    ]) : new $e([
      [
        e
      ]
    ], Kl);
  }
  function kg(e) {
    return Qt(Bo(e).call(document.documentElement));
  }
  var Eg = 0;
  function Xl() {
    return new oo();
  }
  function oo() {
    this._ = "@" + (++Eg).toString(36);
  }
  oo.prototype = Xl.prototype = {
    constructor: oo,
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
  function Ag(e) {
    let t;
    for (; t = e.sourceEvent; ) e = t;
    return e;
  }
  function Ks(e, t) {
    if (e = Ag(e), t === void 0 && (t = e.currentTarget), t) {
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
  const Pg = {
    passive: false
  }, Qn = {
    capture: true,
    passive: false
  };
  function Ii(e) {
    e.stopImmediatePropagation();
  }
  function vn(e) {
    e.preventDefault(), e.stopImmediatePropagation();
  }
  function Lg(e) {
    var t = e.document.documentElement, n = Qt(e).on("dragstart.drag", vn, Qn);
    "onselectstart" in t ? n.on("selectstart.drag", vn, Qn) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = "none");
  }
  function Rg(e, t) {
    var n = e.document.documentElement, r = Qt(e).on("dragstart.drag", null);
    t && (r.on("click.drag", vn, Qn), setTimeout(function() {
      r.on("click.drag", null);
    }, 0)), "onselectstart" in n ? r.on("selectstart.drag", null) : (n.style.MozUserSelect = n.__noselect, delete n.__noselect);
  }
  const mr = (e) => () => e;
  function so(e, { sourceEvent: t, subject: n, target: r, identifier: i, active: o, x: s, y: a, dx: l, dy: u, dispatch: c }) {
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
        value: o,
        enumerable: true,
        configurable: true
      },
      x: {
        value: s,
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
  so.prototype.on = function() {
    var e = this._.on.apply(this._, arguments);
    return e === this._ ? this : e;
  };
  function zg(e) {
    return !e.ctrlKey && !e.button;
  }
  function Ng() {
    return this.parentNode;
  }
  function Bg(e, t) {
    return t ?? {
      x: e.x,
      y: e.y
    };
  }
  function Ig() {
    return navigator.maxTouchPoints || "ontouchstart" in this;
  }
  function Og() {
    var e = zg, t = Ng, n = Bg, r = Ig, i = {}, o = No("start", "drag", "end"), s = 0, a, l, u, c, f = 0;
    function d(y) {
      y.on("mousedown.drag", h).filter(r).on("touchstart.drag", z).on("touchmove.drag", G, Pg).on("touchend.drag touchcancel.drag", T).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }
    function h(y, x) {
      if (!(c || !e.call(this, y, x))) {
        var C = M(this, t.call(this, y, x), y, x, "mouse");
        C && (Qt(y.view).on("mousemove.drag", m, Qn).on("mouseup.drag", _, Qn), Lg(y.view), Ii(y), u = false, a = y.clientX, l = y.clientY, C("start", y));
      }
    }
    function m(y) {
      if (vn(y), !u) {
        var x = y.clientX - a, C = y.clientY - l;
        u = x * x + C * C > f;
      }
      i.mouse("drag", y);
    }
    function _(y) {
      Qt(y.view).on("mousemove.drag mouseup.drag", null), Rg(y.view, u), vn(y), i.mouse("end", y);
    }
    function z(y, x) {
      if (e.call(this, y, x)) {
        var C = y.changedTouches, U = t.call(this, y, x), K = C.length, I, O;
        for (I = 0; I < K; ++I) (O = M(this, U, y, x, C[I].identifier, C[I])) && (Ii(y), O("start", y, C[I]));
      }
    }
    function G(y) {
      var x = y.changedTouches, C = x.length, U, K;
      for (U = 0; U < C; ++U) (K = i[x[U].identifier]) && (vn(y), K("drag", y, x[U]));
    }
    function T(y) {
      var x = y.changedTouches, C = x.length, U, K;
      for (c && clearTimeout(c), c = setTimeout(function() {
        c = null;
      }, 500), U = 0; U < C; ++U) (K = i[x[U].identifier]) && (Ii(y), K("end", y, x[U]));
    }
    function M(y, x, C, U, K, I) {
      var O = o.copy(), q = Ks(I || C, x), w, Z, R;
      if ((R = n.call(y, new so("beforestart", {
        sourceEvent: C,
        target: d,
        identifier: K,
        active: s,
        x: q[0],
        y: q[1],
        dx: 0,
        dy: 0,
        dispatch: O
      }), U)) != null) return w = R.x - q[0] || 0, Z = R.y - q[1] || 0, function Y(W, V, H) {
        var pe = q, oe;
        switch (W) {
          case "start":
            i[K] = Y, oe = s++;
            break;
          case "end":
            delete i[K], --s;
          case "drag":
            q = Ks(H || V, x), oe = s;
            break;
        }
        O.call(W, y, new so(W, {
          sourceEvent: V,
          subject: R,
          target: d,
          identifier: K,
          active: oe,
          x: q[0] + w,
          y: q[1] + Z,
          dx: q[0] - pe[0],
          dy: q[1] - pe[1],
          dispatch: O
        }), U);
      };
    }
    return d.filter = function(y) {
      return arguments.length ? (e = typeof y == "function" ? y : mr(!!y), d) : e;
    }, d.container = function(y) {
      return arguments.length ? (t = typeof y == "function" ? y : mr(y), d) : t;
    }, d.subject = function(y) {
      return arguments.length ? (n = typeof y == "function" ? y : mr(y), d) : n;
    }, d.touchable = function(y) {
      return arguments.length ? (r = typeof y == "function" ? y : mr(!!y), d) : r;
    }, d.on = function() {
      var y = o.on.apply(o, arguments);
      return y === o ? d : y;
    }, d.clickDistance = function(y) {
      return arguments.length ? (f = (y = +y) * y, d) : Math.sqrt(f);
    }, d;
  }
  var xn = 0, zn = 0, Ln = 0, jl = 1e3, Yr, Nn, Kr = 0, en = 0, gi = 0, er = typeof performance == "object" && performance.now ? performance : Date, Zl = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(e) {
    setTimeout(e, 17);
  };
  function Fo() {
    return en || (Zl(Fg), en = er.now() + gi);
  }
  function Fg() {
    en = 0;
  }
  function Xr() {
    this._call = this._time = this._next = null;
  }
  Xr.prototype = Jl.prototype = {
    constructor: Xr,
    restart: function(e, t, n) {
      if (typeof e != "function") throw new TypeError("callback is not a function");
      n = (n == null ? Fo() : +n) + (t == null ? 0 : +t), !this._next && Nn !== this && (Nn ? Nn._next = this : Yr = this, Nn = this), this._call = e, this._time = n, ao();
    },
    stop: function() {
      this._call && (this._call = null, this._time = 1 / 0, ao());
    }
  };
  function Jl(e, t, n) {
    var r = new Xr();
    return r.restart(e, t, n), r;
  }
  function Ug() {
    Fo(), ++xn;
    for (var e = Yr, t; e; ) (t = en - e._time) >= 0 && e._call.call(void 0, t), e = e._next;
    --xn;
  }
  function Xs() {
    en = (Kr = er.now()) + gi, xn = zn = 0;
    try {
      Ug();
    } finally {
      xn = 0, $g(), en = 0;
    }
  }
  function Dg() {
    var e = er.now(), t = e - Kr;
    t > jl && (gi -= t, Kr = e);
  }
  function $g() {
    for (var e, t = Yr, n, r = 1 / 0; t; ) t._call ? (r > t._time && (r = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : Yr = n);
    Nn = e, ao(r);
  }
  function ao(e) {
    if (!xn) {
      zn && (zn = clearTimeout(zn));
      var t = e - en;
      t > 24 ? (e < 1 / 0 && (zn = setTimeout(Xs, e - er.now() - gi)), Ln && (Ln = clearInterval(Ln))) : (Ln || (Kr = er.now(), Ln = setInterval(Dg, jl)), xn = 1, Zl(Xs));
    }
  }
  function js(e, t, n) {
    var r = new Xr();
    return t = t == null ? 0 : +t, r.restart((i) => {
      r.stop(), e(i + t);
    }, t, n), r;
  }
  var Vg = No("start", "end", "cancel", "interrupt"), Gg = [], Ql = 0, Zs = 1, lo = 2, kr = 3, Js = 4, uo = 5, Er = 6;
  function mi(e, t, n, r, i, o) {
    var s = e.__transition;
    if (!s) e.__transition = {};
    else if (n in s) return;
    Hg(e, n, {
      name: t,
      index: r,
      group: i,
      on: Vg,
      tween: Gg,
      time: o.time,
      delay: o.delay,
      duration: o.duration,
      ease: o.ease,
      timer: null,
      state: Ql
    });
  }
  function Uo(e, t) {
    var n = Qe(e, t);
    if (n.state > Ql) throw new Error("too late; already scheduled");
    return n;
  }
  function mt(e, t) {
    var n = Qe(e, t);
    if (n.state > kr) throw new Error("too late; already running");
    return n;
  }
  function Qe(e, t) {
    var n = e.__transition;
    if (!n || !(n = n[t])) throw new Error("transition not found");
    return n;
  }
  function Hg(e, t, n) {
    var r = e.__transition, i;
    r[t] = n, n.timer = Jl(o, 0, n.time);
    function o(u) {
      n.state = Zs, n.timer.restart(s, n.delay, n.time), n.delay <= u && s(u - n.delay);
    }
    function s(u) {
      var c, f, d, h;
      if (n.state !== Zs) return l();
      for (c in r) if (h = r[c], h.name === n.name) {
        if (h.state === kr) return js(s);
        h.state === Js ? (h.state = Er, h.timer.stop(), h.on.call("interrupt", e, e.__data__, h.index, h.group), delete r[c]) : +c < t && (h.state = Er, h.timer.stop(), h.on.call("cancel", e, e.__data__, h.index, h.group), delete r[c]);
      }
      if (js(function() {
        n.state === kr && (n.state = Js, n.timer.restart(a, n.delay, n.time), a(u));
      }), n.state = lo, n.on.call("start", e, e.__data__, n.index, n.group), n.state === lo) {
        for (n.state = kr, i = new Array(d = n.tween.length), c = 0, f = -1; c < d; ++c) (h = n.tween[c].value.call(e, e.__data__, n.index, n.group)) && (i[++f] = h);
        i.length = f + 1;
      }
    }
    function a(u) {
      for (var c = u < n.duration ? n.ease.call(null, u / n.duration) : (n.timer.restart(l), n.state = uo, 1), f = -1, d = i.length; ++f < d; ) i[f].call(e, c);
      n.state === uo && (n.on.call("end", e, e.__data__, n.index, n.group), l());
    }
    function l() {
      n.state = Er, n.timer.stop(), delete r[t];
      for (var u in r) return;
      delete e.__transition;
    }
  }
  function Wg(e, t) {
    var n = e.__transition, r, i, o = true, s;
    if (n) {
      t = t == null ? null : t + "";
      for (s in n) {
        if ((r = n[s]).name !== t) {
          o = false;
          continue;
        }
        i = r.state > lo && r.state < uo, r.state = Er, r.timer.stop(), r.on.call(i ? "interrupt" : "cancel", e, e.__data__, r.index, r.group), delete n[s];
      }
      o && delete e.__transition;
    }
  }
  function qg(e) {
    return this.each(function() {
      Wg(this, e);
    });
  }
  function Yg(e, t) {
    var n, r;
    return function() {
      var i = mt(this, e), o = i.tween;
      if (o !== n) {
        r = n = o;
        for (var s = 0, a = r.length; s < a; ++s) if (r[s].name === t) {
          r = r.slice(), r.splice(s, 1);
          break;
        }
      }
      i.tween = r;
    };
  }
  function Kg(e, t, n) {
    var r, i;
    if (typeof n != "function") throw new Error();
    return function() {
      var o = mt(this, e), s = o.tween;
      if (s !== r) {
        i = (r = s).slice();
        for (var a = {
          name: t,
          value: n
        }, l = 0, u = i.length; l < u; ++l) if (i[l].name === t) {
          i[l] = a;
          break;
        }
        l === u && i.push(a);
      }
      o.tween = i;
    };
  }
  function Xg(e, t) {
    var n = this._id;
    if (e += "", arguments.length < 2) {
      for (var r = Qe(this.node(), n).tween, i = 0, o = r.length, s; i < o; ++i) if ((s = r[i]).name === e) return s.value;
      return null;
    }
    return this.each((t == null ? Yg : Kg)(n, e, t));
  }
  function Do(e, t, n) {
    var r = e._id;
    return e.each(function() {
      var i = mt(this, r);
      (i.value || (i.value = {}))[t] = n.apply(this, arguments);
    }), function(i) {
      return Qe(i, r).value[t];
    };
  }
  function eu(e, t) {
    var n;
    return (typeof t == "number" ? Ke : t instanceof Jt ? Gr : (n = Jt(t)) ? (t = n, Gr) : Nl)(e, t);
  }
  function jg(e) {
    return function() {
      this.removeAttribute(e);
    };
  }
  function Zg(e) {
    return function() {
      this.removeAttributeNS(e.space, e.local);
    };
  }
  function Jg(e, t, n) {
    var r, i = n + "", o;
    return function() {
      var s = this.getAttribute(e);
      return s === i ? null : s === r ? o : o = t(r = s, n);
    };
  }
  function Qg(e, t, n) {
    var r, i = n + "", o;
    return function() {
      var s = this.getAttributeNS(e.space, e.local);
      return s === i ? null : s === r ? o : o = t(r = s, n);
    };
  }
  function em(e, t, n) {
    var r, i, o;
    return function() {
      var s, a = n(this), l;
      return a == null ? void this.removeAttribute(e) : (s = this.getAttribute(e), l = a + "", s === l ? null : s === r && l === i ? o : (i = l, o = t(r = s, a)));
    };
  }
  function tm(e, t, n) {
    var r, i, o;
    return function() {
      var s, a = n(this), l;
      return a == null ? void this.removeAttributeNS(e.space, e.local) : (s = this.getAttributeNS(e.space, e.local), l = a + "", s === l ? null : s === r && l === i ? o : (i = l, o = t(r = s, a)));
    };
  }
  function nm(e, t) {
    var n = pi(e), r = n === "transform" ? ph : eu;
    return this.attrTween(e, typeof t == "function" ? (n.local ? tm : em)(n, r, Do(this, "attr." + e, t)) : t == null ? (n.local ? Zg : jg)(n) : (n.local ? Qg : Jg)(n, r, t));
  }
  function rm(e, t) {
    return function(n) {
      this.setAttribute(e, t.call(this, n));
    };
  }
  function im(e, t) {
    return function(n) {
      this.setAttributeNS(e.space, e.local, t.call(this, n));
    };
  }
  function om(e, t) {
    var n, r;
    function i() {
      var o = t.apply(this, arguments);
      return o !== r && (n = (r = o) && im(e, o)), n;
    }
    return i._value = t, i;
  }
  function sm(e, t) {
    var n, r;
    function i() {
      var o = t.apply(this, arguments);
      return o !== r && (n = (r = o) && rm(e, o)), n;
    }
    return i._value = t, i;
  }
  function am(e, t) {
    var n = "attr." + e;
    if (arguments.length < 2) return (n = this.tween(n)) && n._value;
    if (t == null) return this.tween(n, null);
    if (typeof t != "function") throw new Error();
    var r = pi(e);
    return this.tween(n, (r.local ? om : sm)(r, t));
  }
  function lm(e, t) {
    return function() {
      Uo(this, e).delay = +t.apply(this, arguments);
    };
  }
  function um(e, t) {
    return t = +t, function() {
      Uo(this, e).delay = t;
    };
  }
  function cm(e) {
    var t = this._id;
    return arguments.length ? this.each((typeof e == "function" ? lm : um)(t, e)) : Qe(this.node(), t).delay;
  }
  function fm(e, t) {
    return function() {
      mt(this, e).duration = +t.apply(this, arguments);
    };
  }
  function dm(e, t) {
    return t = +t, function() {
      mt(this, e).duration = t;
    };
  }
  function hm(e) {
    var t = this._id;
    return arguments.length ? this.each((typeof e == "function" ? fm : dm)(t, e)) : Qe(this.node(), t).duration;
  }
  function pm(e, t) {
    if (typeof t != "function") throw new Error();
    return function() {
      mt(this, e).ease = t;
    };
  }
  function gm(e) {
    var t = this._id;
    return arguments.length ? this.each(pm(t, e)) : Qe(this.node(), t).ease;
  }
  function mm(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      if (typeof n != "function") throw new Error();
      mt(this, e).ease = n;
    };
  }
  function vm(e) {
    if (typeof e != "function") throw new Error();
    return this.each(mm(this._id, e));
  }
  function _m(e) {
    typeof e != "function" && (e = Ul(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var o = t[i], s = o.length, a = r[i] = [], l, u = 0; u < s; ++u) (l = o[u]) && e.call(l, l.__data__, u, o) && a.push(l);
    return new Lt(r, this._parents, this._name, this._id);
  }
  function bm(e) {
    if (e._id !== this._id) throw new Error();
    for (var t = this._groups, n = e._groups, r = t.length, i = n.length, o = Math.min(r, i), s = new Array(r), a = 0; a < o; ++a) for (var l = t[a], u = n[a], c = l.length, f = s[a] = new Array(c), d, h = 0; h < c; ++h) (d = l[h] || u[h]) && (f[h] = d);
    for (; a < r; ++a) s[a] = t[a];
    return new Lt(s, this._parents, this._name, this._id);
  }
  function ym(e) {
    return (e + "").trim().split(/^|\s+/).every(function(t) {
      var n = t.indexOf(".");
      return n >= 0 && (t = t.slice(0, n)), !t || t === "start";
    });
  }
  function xm(e, t, n) {
    var r, i, o = ym(t) ? Uo : mt;
    return function() {
      var s = o(this, e), a = s.on;
      a !== r && (i = (r = a).copy()).on(t, n), s.on = i;
    };
  }
  function wm(e, t) {
    var n = this._id;
    return arguments.length < 2 ? Qe(this.node(), n).on.on(e) : this.each(xm(n, e, t));
  }
  function Sm(e) {
    return function() {
      var t = this.parentNode;
      for (var n in this.__transition) if (+n !== e) return;
      t && t.removeChild(this);
    };
  }
  function Mm() {
    return this.on("end.remove", Sm(this._id));
  }
  function Tm(e) {
    var t = this._name, n = this._id;
    typeof e != "function" && (e = Io(e));
    for (var r = this._groups, i = r.length, o = new Array(i), s = 0; s < i; ++s) for (var a = r[s], l = a.length, u = o[s] = new Array(l), c, f, d = 0; d < l; ++d) (c = a[d]) && (f = e.call(c, c.__data__, d, a)) && ("__data__" in c && (f.__data__ = c.__data__), u[d] = f, mi(u[d], t, n, d, u, Qe(c, n)));
    return new Lt(o, this._parents, t, n);
  }
  function Cm(e) {
    var t = this._name, n = this._id;
    typeof e != "function" && (e = Fl(e));
    for (var r = this._groups, i = r.length, o = [], s = [], a = 0; a < i; ++a) for (var l = r[a], u = l.length, c, f = 0; f < u; ++f) if (c = l[f]) {
      for (var d = e.call(c, c.__data__, f, l), h, m = Qe(c, n), _ = 0, z = d.length; _ < z; ++_) (h = d[_]) && mi(h, t, n, _, d, m);
      o.push(d), s.push(c);
    }
    return new Lt(o, s, t, n);
  }
  var km = sr.prototype.constructor;
  function Em() {
    return new km(this._groups, this._parents);
  }
  function Am(e, t) {
    var n, r, i;
    return function() {
      var o = yn(this, e), s = (this.style.removeProperty(e), yn(this, e));
      return o === s ? null : o === n && s === r ? i : i = t(n = o, r = s);
    };
  }
  function tu(e) {
    return function() {
      this.style.removeProperty(e);
    };
  }
  function Pm(e, t, n) {
    var r, i = n + "", o;
    return function() {
      var s = yn(this, e);
      return s === i ? null : s === r ? o : o = t(r = s, n);
    };
  }
  function Lm(e, t, n) {
    var r, i, o;
    return function() {
      var s = yn(this, e), a = n(this), l = a + "";
      return a == null && (l = a = (this.style.removeProperty(e), yn(this, e))), s === l ? null : s === r && l === i ? o : (i = l, o = t(r = s, a));
    };
  }
  function Rm(e, t) {
    var n, r, i, o = "style." + t, s = "end." + o, a;
    return function() {
      var l = mt(this, e), u = l.on, c = l.value[o] == null ? a || (a = tu(t)) : void 0;
      (u !== n || i !== c) && (r = (n = u).copy()).on(s, i = c), l.on = r;
    };
  }
  function zm(e, t, n) {
    var r = (e += "") == "transform" ? hh : eu;
    return t == null ? this.styleTween(e, Am(e, r)).on("end.style." + e, tu(e)) : typeof t == "function" ? this.styleTween(e, Lm(e, r, Do(this, "style." + e, t))).each(Rm(this._id, e)) : this.styleTween(e, Pm(e, r, t), n).on("end.style." + e, null);
  }
  function Nm(e, t, n) {
    return function(r) {
      this.style.setProperty(e, t.call(this, r), n);
    };
  }
  function Bm(e, t, n) {
    var r, i;
    function o() {
      var s = t.apply(this, arguments);
      return s !== i && (r = (i = s) && Nm(e, s, n)), r;
    }
    return o._value = t, o;
  }
  function Im(e, t, n) {
    var r = "style." + (e += "");
    if (arguments.length < 2) return (r = this.tween(r)) && r._value;
    if (t == null) return this.tween(r, null);
    if (typeof t != "function") throw new Error();
    return this.tween(r, Bm(e, t, n ?? ""));
  }
  function Om(e) {
    return function() {
      this.textContent = e;
    };
  }
  function Fm(e) {
    return function() {
      var t = e(this);
      this.textContent = t ?? "";
    };
  }
  function Um(e) {
    return this.tween("text", typeof e == "function" ? Fm(Do(this, "text", e)) : Om(e == null ? "" : e + ""));
  }
  function Dm(e) {
    return function(t) {
      this.textContent = e.call(this, t);
    };
  }
  function $m(e) {
    var t, n;
    function r() {
      var i = e.apply(this, arguments);
      return i !== n && (t = (n = i) && Dm(i)), t;
    }
    return r._value = e, r;
  }
  function Vm(e) {
    var t = "text";
    if (arguments.length < 1) return (t = this.tween(t)) && t._value;
    if (e == null) return this.tween(t, null);
    if (typeof e != "function") throw new Error();
    return this.tween(t, $m(e));
  }
  function Gm() {
    for (var e = this._name, t = this._id, n = nu(), r = this._groups, i = r.length, o = 0; o < i; ++o) for (var s = r[o], a = s.length, l, u = 0; u < a; ++u) if (l = s[u]) {
      var c = Qe(l, t);
      mi(l, e, n, u, s, {
        time: c.time + c.delay + c.duration,
        delay: 0,
        duration: c.duration,
        ease: c.ease
      });
    }
    return new Lt(r, this._parents, e, n);
  }
  function Hm() {
    var e, t, n = this, r = n._id, i = n.size();
    return new Promise(function(o, s) {
      var a = {
        value: s
      }, l = {
        value: function() {
          --i === 0 && o();
        }
      };
      n.each(function() {
        var u = mt(this, r), c = u.on;
        c !== e && (t = (e = c).copy(), t._.cancel.push(a), t._.interrupt.push(a), t._.end.push(l)), u.on = t;
      }), i === 0 && o();
    });
  }
  var Wm = 0;
  function Lt(e, t, n, r) {
    this._groups = e, this._parents = t, this._name = n, this._id = r;
  }
  function nu() {
    return ++Wm;
  }
  var yt = sr.prototype;
  Lt.prototype = {
    constructor: Lt,
    select: Tm,
    selectAll: Cm,
    selectChild: yt.selectChild,
    selectChildren: yt.selectChildren,
    filter: _m,
    merge: bm,
    selection: Em,
    transition: Gm,
    call: yt.call,
    nodes: yt.nodes,
    node: yt.node,
    size: yt.size,
    empty: yt.empty,
    each: yt.each,
    on: wm,
    attr: nm,
    attrTween: am,
    style: zm,
    styleTween: Im,
    text: Um,
    textTween: Vm,
    remove: Mm,
    tween: Xg,
    delay: cm,
    duration: hm,
    ease: gm,
    easeVarying: vm,
    end: Hm,
    [Symbol.iterator]: yt[Symbol.iterator]
  };
  function qm(e) {
    return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2;
  }
  var Ym = {
    time: null,
    delay: 0,
    duration: 250,
    ease: qm
  };
  function Km(e, t) {
    for (var n; !(n = e.__transition) || !(n = n[t]); ) if (!(e = e.parentNode)) throw new Error(`transition ${t} not found`);
    return n;
  }
  function Xm(e) {
    var t, n;
    e instanceof Lt ? (t = e._id, e = e._name) : (t = nu(), (n = Ym).time = Fo(), e = e == null ? null : e + "");
    for (var r = this._groups, i = r.length, o = 0; o < i; ++o) for (var s = r[o], a = s.length, l, u = 0; u < a; ++u) (l = s[u]) && mi(l, e, t, u, s, n || Km(l, t));
    return new Lt(r, this._parents, e, t);
  }
  sr.prototype.interrupt = qg;
  sr.prototype.transition = Xm;
  function jm(e) {
    return Math.abs(e = Math.round(e)) >= 1e21 ? e.toLocaleString("en").replace(/,/g, "") : e.toString(10);
  }
  function jr(e, t) {
    if (!isFinite(e) || e === 0) return null;
    var n = (e = t ? e.toExponential(t - 1) : e.toExponential()).indexOf("e"), r = e.slice(0, n);
    return [
      r.length > 1 ? r[0] + r.slice(2) : r,
      +e.slice(n + 1)
    ];
  }
  function wn(e) {
    return e = jr(Math.abs(e)), e ? e[1] : NaN;
  }
  function Zm(e, t) {
    return function(n, r) {
      for (var i = n.length, o = [], s = 0, a = e[0], l = 0; i > 0 && a > 0 && (l + a + 1 > r && (a = Math.max(1, r - l)), o.push(n.substring(i -= a, i + a)), !((l += a + 1) > r)); ) a = e[s = (s + 1) % e.length];
      return o.reverse().join(t);
    };
  }
  function Jm(e) {
    return function(t) {
      return t.replace(/[0-9]/g, function(n) {
        return e[+n];
      });
    };
  }
  var Qm = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
  function Zr(e) {
    if (!(t = Qm.exec(e))) throw new Error("invalid format: " + e);
    var t;
    return new $o({
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
  Zr.prototype = $o.prototype;
  function $o(e) {
    this.fill = e.fill === void 0 ? " " : e.fill + "", this.align = e.align === void 0 ? ">" : e.align + "", this.sign = e.sign === void 0 ? "-" : e.sign + "", this.symbol = e.symbol === void 0 ? "" : e.symbol + "", this.zero = !!e.zero, this.width = e.width === void 0 ? void 0 : +e.width, this.comma = !!e.comma, this.precision = e.precision === void 0 ? void 0 : +e.precision, this.trim = !!e.trim, this.type = e.type === void 0 ? "" : e.type + "";
  }
  $o.prototype.toString = function() {
    return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
  };
  function ev(e) {
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
  function tv(e, t) {
    var n = jr(e, t);
    if (!n) return Jr = void 0, e.toPrecision(t);
    var r = n[0], i = n[1], o = i - (Jr = Math.max(-8, Math.min(8, Math.floor(i / 3))) * 3) + 1, s = r.length;
    return o === s ? r : o > s ? r + new Array(o - s + 1).join("0") : o > 0 ? r.slice(0, o) + "." + r.slice(o) : "0." + new Array(1 - o).join("0") + jr(e, Math.max(0, t + o - 1))[0];
  }
  function Qs(e, t) {
    var n = jr(e, t);
    if (!n) return e + "";
    var r = n[0], i = n[1];
    return i < 0 ? "0." + new Array(-i).join("0") + r : r.length > i + 1 ? r.slice(0, i + 1) + "." + r.slice(i + 1) : r + new Array(i - r.length + 2).join("0");
  }
  const ea = {
    "%": (e, t) => (e * 100).toFixed(t),
    b: (e) => Math.round(e).toString(2),
    c: (e) => e + "",
    d: jm,
    e: (e, t) => e.toExponential(t),
    f: (e, t) => e.toFixed(t),
    g: (e, t) => e.toPrecision(t),
    o: (e) => Math.round(e).toString(8),
    p: (e, t) => Qs(e * 100, t),
    r: Qs,
    s: tv,
    X: (e) => Math.round(e).toString(16).toUpperCase(),
    x: (e) => Math.round(e).toString(16)
  };
  function ta(e) {
    return e;
  }
  var na = Array.prototype.map, ra = [
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
  function nv(e) {
    var t = e.grouping === void 0 || e.thousands === void 0 ? ta : Zm(na.call(e.grouping, Number), e.thousands + ""), n = e.currency === void 0 ? "" : e.currency[0] + "", r = e.currency === void 0 ? "" : e.currency[1] + "", i = e.decimal === void 0 ? "." : e.decimal + "", o = e.numerals === void 0 ? ta : Jm(na.call(e.numerals, String)), s = e.percent === void 0 ? "%" : e.percent + "", a = e.minus === void 0 ? "\u2212" : e.minus + "", l = e.nan === void 0 ? "NaN" : e.nan + "";
    function u(f, d) {
      f = Zr(f);
      var h = f.fill, m = f.align, _ = f.sign, z = f.symbol, G = f.zero, T = f.width, M = f.comma, y = f.precision, x = f.trim, C = f.type;
      C === "n" ? (M = true, C = "g") : ea[C] || (y === void 0 && (y = 12), x = true, C = "g"), (G || h === "0" && m === "=") && (G = true, h = "0", m = "=");
      var U = (d && d.prefix !== void 0 ? d.prefix : "") + (z === "$" ? n : z === "#" && /[boxX]/.test(C) ? "0" + C.toLowerCase() : ""), K = (z === "$" ? r : /[%p]/.test(C) ? s : "") + (d && d.suffix !== void 0 ? d.suffix : ""), I = ea[C], O = /[defgprs%]/.test(C);
      y = y === void 0 ? 6 : /[gprs]/.test(C) ? Math.max(1, Math.min(21, y)) : Math.max(0, Math.min(20, y));
      function q(w) {
        var Z = U, R = K, Y, W, V;
        if (C === "c") R = I(w) + R, w = "";
        else {
          w = +w;
          var H = w < 0 || 1 / w < 0;
          if (w = isNaN(w) ? l : I(Math.abs(w), y), x && (w = ev(w)), H && +w == 0 && _ !== "+" && (H = false), Z = (H ? _ === "(" ? _ : a : _ === "-" || _ === "(" ? "" : _) + Z, R = (C === "s" && !isNaN(w) && Jr !== void 0 ? ra[8 + Jr / 3] : "") + R + (H && _ === "(" ? ")" : ""), O) {
            for (Y = -1, W = w.length; ++Y < W; ) if (V = w.charCodeAt(Y), 48 > V || V > 57) {
              R = (V === 46 ? i + w.slice(Y + 1) : w.slice(Y)) + R, w = w.slice(0, Y);
              break;
            }
          }
        }
        M && !G && (w = t(w, 1 / 0));
        var pe = Z.length + w.length + R.length, oe = pe < T ? new Array(T - pe + 1).join(h) : "";
        switch (M && G && (w = t(oe + w, oe.length ? T - R.length : 1 / 0), oe = ""), m) {
          case "<":
            w = Z + w + R + oe;
            break;
          case "=":
            w = Z + oe + w + R;
            break;
          case "^":
            w = oe.slice(0, pe = oe.length >> 1) + Z + w + R + oe.slice(pe);
            break;
          default:
            w = oe + Z + w + R;
            break;
        }
        return o(w);
      }
      return q.toString = function() {
        return f + "";
      }, q;
    }
    function c(f, d) {
      var h = Math.max(-8, Math.min(8, Math.floor(wn(d) / 3))) * 3, m = Math.pow(10, -h), _ = u((f = Zr(f), f.type = "f", f), {
        suffix: ra[8 + h / 3]
      });
      return function(z) {
        return _(m * z);
      };
    }
    return {
      format: u,
      formatPrefix: c
    };
  }
  var vr, ru, iu;
  rv({
    thousands: ",",
    grouping: [
      3
    ],
    currency: [
      "$",
      ""
    ]
  });
  function rv(e) {
    return vr = nv(e), ru = vr.format, iu = vr.formatPrefix, vr;
  }
  function iv(e) {
    return Math.max(0, -wn(Math.abs(e)));
  }
  function ov(e, t) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(wn(t) / 3))) * 3 - wn(Math.abs(e)));
  }
  function sv(e, t) {
    return e = Math.abs(e), t = Math.abs(t) - e, Math.max(0, wn(t) - wn(e)) + 1;
  }
  function av(e, t) {
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
  function lv(e) {
    return function() {
      return e;
    };
  }
  function uv(e) {
    return +e;
  }
  var ia = [
    0,
    1
  ];
  function un(e) {
    return e;
  }
  function co(e, t) {
    return (t -= e = +e) ? function(n) {
      return (n - e) / t;
    } : lv(isNaN(t) ? NaN : 0.5);
  }
  function cv(e, t) {
    var n;
    return e > t && (n = e, e = t, t = n), function(r) {
      return Math.max(e, Math.min(t, r));
    };
  }
  function fv(e, t, n) {
    var r = e[0], i = e[1], o = t[0], s = t[1];
    return i < r ? (r = co(i, r), o = n(s, o)) : (r = co(r, i), o = n(o, s)), function(a) {
      return o(r(a));
    };
  }
  function dv(e, t, n) {
    var r = Math.min(e.length, t.length) - 1, i = new Array(r), o = new Array(r), s = -1;
    for (e[r] < e[0] && (e = e.slice().reverse(), t = t.slice().reverse()); ++s < r; ) i[s] = co(e[s], e[s + 1]), o[s] = n(t[s], t[s + 1]);
    return function(a) {
      var l = Rh(e, a, 1, r) - 1;
      return o[l](i[l](a));
    };
  }
  function hv(e, t) {
    return t.domain(e.domain()).range(e.range()).interpolate(e.interpolate()).clamp(e.clamp()).unknown(e.unknown());
  }
  function pv() {
    var e = ia, t = ia, n = zo, r, i, o, s = un, a, l, u;
    function c() {
      var d = Math.min(e.length, t.length);
      return s !== un && (s = cv(e[0], e[d - 1])), a = d > 2 ? dv : fv, l = u = null, f;
    }
    function f(d) {
      return d == null || isNaN(d = +d) ? o : (l || (l = a(e.map(r), t, n)))(r(s(d)));
    }
    return f.invert = function(d) {
      return s(i((u || (u = a(t, e.map(r), Ke)))(d)));
    }, f.domain = function(d) {
      return arguments.length ? (e = Array.from(d, uv), c()) : e.slice();
    }, f.range = function(d) {
      return arguments.length ? (t = Array.from(d), c()) : t.slice();
    }, f.rangeRound = function(d) {
      return t = Array.from(d), n = ch, c();
    }, f.clamp = function(d) {
      return arguments.length ? (s = d ? true : un, c()) : s !== un;
    }, f.interpolate = function(d) {
      return arguments.length ? (n = d, c()) : n;
    }, f.unknown = function(d) {
      return arguments.length ? (o = d, f) : o;
    }, function(d, h) {
      return r = d, i = h, c();
    };
  }
  function gv() {
    return pv()(un, un);
  }
  function mv(e, t, n, r) {
    var i = Oh(e, t, n), o;
    switch (r = Zr(r ?? ",f"), r.type) {
      case "s": {
        var s = Math.max(Math.abs(e), Math.abs(t));
        return r.precision == null && !isNaN(o = ov(i, s)) && (r.precision = o), iu(r, s);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        r.precision == null && !isNaN(o = sv(i, Math.max(Math.abs(e), Math.abs(t)))) && (r.precision = o - (r.type === "e"));
        break;
      }
      case "f":
      case "%": {
        r.precision == null && !isNaN(o = iv(i)) && (r.precision = o - (r.type === "%") * 2);
        break;
      }
    }
    return ru(r);
  }
  function vv(e) {
    var t = e.domain;
    return e.ticks = function(n) {
      var r = t();
      return Ih(r[0], r[r.length - 1], n ?? 10);
    }, e.tickFormat = function(n, r) {
      var i = t();
      return mv(i[0], i[i.length - 1], n ?? 10, r);
    }, e.nice = function(n) {
      n == null && (n = 10);
      var r = t(), i = 0, o = r.length - 1, s = r[i], a = r[o], l, u, c = 10;
      for (a < s && (u = s, s = a, a = u, u = i, i = o, o = u); c-- > 0; ) {
        if (u = ro(s, a, n), u === l) return r[i] = s, r[o] = a, t(r);
        if (u > 0) s = Math.floor(s / u) * u, a = Math.ceil(a / u) * u;
        else if (u < 0) s = Math.ceil(s * u) / u, a = Math.floor(a * u) / u;
        else break;
        l = u;
      }
      return e;
    }, e;
  }
  function ou() {
    var e = gv();
    return e.copy = function() {
      return hv(e, ou());
    }, av.apply(e, arguments), vv(e);
  }
  function Bn(e, t, n) {
    this.k = e, this.x = t, this.y = n;
  }
  Bn.prototype = {
    constructor: Bn,
    scale: function(e) {
      return e === 1 ? this : new Bn(this.k * e, this.x, this.y);
    },
    translate: function(e, t) {
      return e === 0 & t === 0 ? this : new Bn(this.k, this.x + this.k * e, this.y + this.k * t);
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
  Bn.prototype;
  const _v = 30, bv = pt({
    __name: "LchPicker",
    props: {
      modelValue: {},
      width: {}
    },
    emits: [
      "update:modelValue"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = se(null), o = n.width ?? 450;
      function s() {
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
        }, o, _v, (c, f) => {
          r("update:modelValue", c);
        });
        u && i.value.appendChild(u);
      }
      gt(() => {
        s();
      });
      function a(l, u, c, f, d) {
        const h = {
          ...u
        };
        l = l.map(({ name: x, domain: C }) => ({
          name: x,
          domain: C,
          scale: ou().domain(C).range([
            0,
            c
          ])
        }));
        for (const x of l) x.x = Math.round(x.scale(h[x.name]));
        const m = kg("div"), _ = ft("white"), z = ft("black"), G = m.selectAll("div").data(l).join("div"), T = Xl(), M = G.append("canvas").attr("width", c).attr("height", 1).style("max-width", "100%").style("width", `${c}px`).style("height", `${f}px`).each(function() {
          const x = this.getContext("2d"), C = x.createImageData(c, 1);
          T.set(this, {
            context: x,
            image: C,
            data: C.data
          });
        }).each(function(x) {
          y.call(this, x);
        }).on("click", function(x, C) {
          const U = this.getBoundingClientRect(), K = x.clientX - U.left;
          C.x = Math.max(0, Math.min(c - 1, K)), h[C.name] = C.scale.invert(C.x), M.each(function(I) {
            y.call(this, I);
          }), d({
            ...h
          }, false, C.name);
        });
        G.each(function(x) {
          Qt(this).select("canvas").call(Og().subject(function() {
            return {
              x: x.x ?? 0,
              y: 0
            };
          }).on("start", function() {
            d({
              ...h
            }, true, x.name);
          }).on("drag", function(U) {
            x.x = Math.max(1, Math.min(c - 1, U.x)), h[x.name] = x.scale.invert(x.x), M.each(function(K) {
              y.call(this, K);
            }), d({
              ...h
            }, true, x.name);
          }).on("end", function(U) {
            x.x = Math.max(1, Math.min(c - 1, U.x)), h[x.name] = x.scale.invert(x.x), M.each(function(K) {
              y.call(this, K);
            }), d({
              ...h
            }, false, x.name);
          }));
        });
        function y(x) {
          const C = T.get(this), { context: U, image: K, data: I } = C;
          for (let O = 0, q = -1; O < c; ++O) {
            let w;
            if (O === Math.round(x.x)) w = _;
            else if (O === Math.round(x.x) - 1) w = z;
            else {
              const Z = {
                ...h
              };
              Z[x.name] = x.scale.invert(O), w = ft(eo(Z.l, Z.c, Z.h));
            }
            I[++q] = w.r, I[++q] = w.g, I[++q] = w.b, I[++q] = 255;
          }
          U.putImageData(K, 0, 0);
        }
        return G.append("svg").attr("width", c).attr("height", 20).attr("viewBox", [
          0,
          0,
          c,
          20
        ]).style("max-width", "100%").style("overflow", "visible").append("g").each(function(x) {
          Qt(this).call(Wh(x.scale).ticks(Math.min(c / 80, 10)));
        }).append("text").attr("x", c).attr("y", 9).attr("dy", ".72em").style("text-anchor", "middle").style("text-transform", "uppercase").attr("fill", "currentColor").text((x) => x.name), m.node();
      }
      return (l, u) => (le(), de("div", {
        ref_key: "container",
        ref: i
      }, null, 512));
    }
  }), yv = {
    class: "palette-editor"
  }, xv = {
    class: "handles-overlay"
  }, wv = 12, Sv = pt({
    __name: "PaletteEditor",
    props: {
      colorStops: {}
    },
    emits: [
      "update:colorStops"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = se(null), o = Te(() => new Hr(n.colorStops).generateTexture());
      Ct(o, (d) => {
        if (!i.value || !d) return;
        const h = i.value.getContext("2d");
        if (!h) return;
        h.clearRect(0, 0, 4096, 32);
        const m = document.createElement("canvas");
        m.width = d.width, m.height = d.height, m.getContext("2d").putImageData(d, 0, 0), h.drawImage(m, 0, 0, 4096, 1, 0, 0, 4096, 32);
      }), gt(() => {
        ai(() => {
          const d = o.value;
          if (!i.value || !d) return;
          const h = i.value.getContext("2d");
          if (!h) return;
          h.clearRect(0, 0, 4096, 32);
          const m = document.createElement("canvas");
          m.width = d.width, m.height = d.height, m.getContext("2d").putImageData(d, 0, 0), h.drawImage(m, 0, 0, 4096, 1, 0, 0, 4096, 32);
        });
      });
      function s(d) {
        var _a2;
        if (n.colorStops.length >= wv) return;
        const h = i.value;
        if (!h) return;
        const m = h.getBoundingClientRect();
        let _ = (d.clientX - m.left) / m.width;
        _ = Math.max(0, Math.min(1, _));
        const z = a.value !== null && ((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff";
        n.colorStops.push({
          color: z,
          position: _
        }), r("update:colorStops", n.colorStops), a.value = n.colorStops.length - 1;
      }
      const a = se(0);
      function l(d) {
        a.value = d;
      }
      function u(d) {
        const h = ft(d);
        if (!h) return {
          l: 100,
          c: 0,
          h: 0
        };
        const m = eo(h);
        return {
          l: m.l,
          c: m.c,
          h: m.h
        };
      }
      function c(d) {
        const h = eo(d.l, d.c, d.h);
        return ft(h).formatHex();
      }
      const f = Te({
        get() {
          var _a2;
          return a.value === null || n.colorStops.length === 0 ? {
            l: 100,
            c: 0,
            h: 0
          } : u(((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff");
        },
        set(d) {
          a.value !== null && n.colorStops[a.value] && (n.colorStops[a.value] = {
            ...n.colorStops[a.value],
            color: c(d)
          }, r("update:colorStops", n.colorStops));
        }
      });
      return (d, h) => (le(), de("div", yv, [
        g("div", {
          class: "canvas-row",
          style: {
            position: "relative"
          },
          onDblclick: s
        }, [
          g("canvas", {
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
          g("div", xv, [
            (le(true), de(Ue, null, Wi(e.colorStops, (m, _) => (le(), dl(kh, {
              key: "handle-" + _,
              stop: m,
              index: _,
              "onUpdate:position": (z) => e.colorStops[_].position = z,
              onClick: (z) => l(_)
            }, null, 8, [
              "stop",
              "index",
              "onUpdate:position",
              "onClick"
            ]))), 128))
          ])
        ], 32),
        xe(bv, {
          modelValue: f.value,
          "onUpdate:modelValue": h[0] || (h[0] = (m) => f.value = m),
          width: 450
        }, null, 8, [
          "modelValue"
        ])
      ]));
    }
  }), Mv = Mn(Sv, [
    [
      "__scopeId",
      "data-v-0e5e7bb6"
    ]
  ]), Tv = {
    class: "block bulma-settings-block",
    style: {
      color: "black !important"
    }
  }, Cv = {
    class: "tabs is-toggle is-fullwidth is-small"
  }, kv = {
    class: "tab-content"
  }, Ev = {
    key: 0
  }, Av = {
    class: "mb-3",
    style: {
      "font-family": "monospace",
      "word-break": "break-all",
      "white-space": "pre-line"
    }
  }, Pv = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, Lv = {
    style: {
      "font-family": "monospace",
      "min-width": "7.5em",
      display: "inline-block"
    }
  }, Rv = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, zv = {
    style: {
      "font-family": "monospace",
      "min-width": "5em",
      display: "inline-block"
    }
  }, Nv = {
    key: 1
  }, Bv = {
    class: "mb-3"
  }, Iv = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, Ov = {
    style: {
      display: "flex",
      "align-items": "center",
      "min-height": "36px"
    }
  }, Fv = [
    "src"
  ], Uv = {
    style: {
      flex: "1 1 auto",
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis"
    }
  }, Dv = {
    class: "dropdown-menu",
    id: "dropdown-menu-presets",
    role: "menu",
    style: {
      width: "100%"
    }
  }, $v = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, Vv = [
    "onClick"
  ], Gv = [
    "src"
  ], Hv = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.11em"
    }
  }, Wv = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, qv = {
    class: "control is-expanded"
  }, Yv = {
    class: "control"
  }, Kv = [
    "disabled"
  ], Xv = {
    key: 2
  }, jv = {
    class: "mb-3"
  }, Zv = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, Jv = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, Qv = {
    class: "mb-3"
  }, e0 = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, t0 = {
    style: {
      display: "flex",
      "align-items": "center",
      "flex-direction": "column",
      gap: "0.5em",
      padding: "0.4em 0"
    }
  }, n0 = [
    "src"
  ], r0 = {
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
  }, i0 = {
    style: {
      flex: "1 1 auto",
      "text-align": "center"
    }
  }, o0 = {
    class: "dropdown-menu",
    id: "dropdown-menu-palettes",
    role: "menu",
    style: {
      width: "100%"
    }
  }, s0 = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, a0 = [
    "onClick"
  ], l0 = [
    "src"
  ], u0 = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.05em",
      "text-align": "center"
    }
  }, c0 = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, f0 = {
    class: "control is-expanded"
  }, d0 = {
    class: "control"
  }, h0 = [
    "disabled"
  ], p0 = {
    key: 3
  }, g0 = {
    class: "field"
  }, m0 = {
    class: "control"
  }, v0 = {
    class: "field"
  }, _0 = {
    class: "control"
  }, b0 = {
    class: "field"
  }, y0 = {
    class: "control"
  }, x0 = {
    class: "field"
  }, w0 = {
    class: "checkbox"
  }, S0 = {
    class: "field"
  }, M0 = {
    class: "checkbox"
  }, T0 = {
    class: "field"
  }, C0 = {
    class: "checkbox"
  }, k0 = {
    class: "field"
  }, E0 = {
    class: "checkbox"
  }, A0 = {
    class: "field"
  }, P0 = {
    class: "checkbox"
  }, L0 = {
    class: "field"
  }, R0 = {
    class: "checkbox"
  }, z0 = {
    class: "field"
  }, N0 = {
    class: "checkbox"
  }, B0 = {
    class: "field"
  }, I0 = {
    class: "checkbox"
  }, O0 = {
    class: "field"
  }, F0 = {
    class: "label"
  }, U0 = {
    class: "control"
  }, D0 = {
    class: "field"
  }, $0 = {
    class: "label"
  }, V0 = {
    class: "control"
  }, Oi = "mandelbrot_presets", Fi = "mandelbrot_palettes", G0 = pt({
    __name: "Settings",
    props: Co({
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
          activateSmoothness: true,
          activateAnimate: false,
          dprMultiplier: 1,
          maxIterationMultiplier: 1
        }
      },
      modelModifiers: {}
    }),
    emits: [
      "update:modelValue"
    ],
    setup(e) {
      const t = e, n = Tt(e, "modelValue"), r = Te(() => ((n.value.angle * 180 / Math.PI % 360 + 360) % 360).toFixed(2)), i = Te({
        get: () => (n.value.angle * 180 / Math.PI % 360 + 360) % 360,
        set: (D) => {
          n.value.angle = D % 360 * Math.PI / 180;
        }
      }), o = Te({
        get: () => (Math.log10(n.value.palettePeriod || 0.01) + 2) / 5,
        set: (D) => {
          n.value.palettePeriod = Number((10 ** (D * 5 - 2)).toPrecision(6));
        }
      }), s = Te({
        get: () => {
          const D = Number(n.value.scale), b = D > 0 ? -Math.log2(D) : 126;
          return isFinite(b) ? Math.min(Math.max(Math.round(b), 1), 126) : 1;
        },
        set: (D) => {
          const b = Math.min(Math.max(Math.round(D), 1), 126);
          n.value.scale = (2 ** -b).toPrecision(10);
        }
      });
      function a(D, b) {
        const [L, Me] = D.split(".");
        return Me ? L + "." + Me.slice(0, b) : L;
      }
      function l(D) {
        const b = document.createElement("canvas");
        b.width = 320, b.height = 40;
        const L = b.getContext("2d");
        if (!L) return "";
        if (D.length === 0) return L.fillStyle = "#000", L.fillRect(0, 0, b.width, b.height), b.toDataURL("image/png");
        const et = new Hr(D).generateTexture(), Ve = document.createElement("canvas");
        Ve.width = et.width, Ve.height = 1;
        const vt = Ve.getContext("2d");
        return vt ? (vt.putImageData(et, 0, 0), L.drawImage(Ve, 0, 0, b.width, b.height), b.toDataURL("image/png")) : "";
      }
      const u = se(null), c = se(""), f = se([]), d = se(""), h = se([]), m = se(""), _ = se(false);
      function z() {
        const D = c.value.trim();
        if (D && window.confirm(`Supprimer le preset "${D}" ? Cette action est irr\xE9versible.`)) {
          const b = f.value.findIndex((L) => L.name === D);
          b >= 0 && (f.value.splice(b, 1), localStorage.setItem(Oi, JSON.stringify(f.value)), T.value = "", c.value = "");
        }
      }
      async function G() {
        t.engine && (u.value = await t.engine.getSnapshotPng(256));
      }
      const T = se(""), M = se(false), y = Te(() => f.value.find((D) => D.name === T.value)), x = Te(() => {
        var _a2;
        return (_a2 = y.value) == null ? void 0 : _a2.thumbnail;
      });
      function C(D) {
        R(D.name), M.value = false;
      }
      async function U() {
        if (!c.value.trim()) return;
        let D, b = (/* @__PURE__ */ new Date()).toISOString();
        try {
          t.engine && (D = await t.engine.getSnapshotPng(256));
        } catch {
        }
        const L = {
          name: c.value.trim(),
          value: n.value,
          thumbnail: D,
          date: b
        }, Me = f.value.findIndex((et) => et.name === L.name);
        Me >= 0 ? f.value[Me] = L : f.value.push(L), localStorage.setItem(Oi, JSON.stringify(f.value)), c.value = "";
      }
      function K() {
        const D = localStorage.getItem(Oi);
        if (D) try {
          f.value = JSON.parse(D);
        } catch {
        }
      }
      function I() {
        const D = localStorage.getItem(Fi);
        if (D) try {
          h.value = JSON.parse(D);
        } catch {
        }
      }
      async function O() {
        if (!d.value.trim()) return;
        let D, b = (/* @__PURE__ */ new Date()).toISOString();
        try {
          D = l(n.value.colorStops);
        } catch {
        }
        const L = {
          name: d.value.trim(),
          colorStops: structuredClone(re(n.value.colorStops)),
          thumbnail: D,
          date: b
        }, Me = h.value.findIndex((et) => et.name === L.name);
        Me >= 0 ? h.value[Me] = L : h.value.push(L), localStorage.setItem(Fi, JSON.stringify(h.value)), d.value = "";
      }
      function q(D) {
        const b = h.value.find((L) => L.name === D);
        b && (m.value = D, d.value = b.name, n.value.colorStops = structuredClone(re(b.colorStops)));
      }
      function w(D) {
        q(D.name), _.value = false;
      }
      function Z() {
        const D = d.value.trim();
        if (D && window.confirm(`Supprimer la palette "${D}" ? Cette action est irr\xE9versible.`)) {
          const b = h.value.findIndex((L) => L.name === D);
          b >= 0 && (h.value.splice(b, 1), localStorage.setItem(Fi, JSON.stringify(h.value)), m.value = "", d.value = "");
        }
      }
      function R(D) {
        const b = f.value.find((L) => L.name === D);
        b && (T.value = D, c.value = b.name, n.value = structuredClone(re(b.value)));
      }
      const Y = Te({
        get: () => Math.log10(n.value.mu ?? 1),
        set: (D) => {
          n.value.mu = Math.pow(10, D);
        }
      }), W = Te({
        get: () => Math.log10(n.value.epsilon ?? 1e-8),
        set: (D) => {
          n.value.epsilon = Math.pow(10, D);
        }
      }), V = Te({
        get: () => Math.log10(n.value.maxIterationMultiplier ?? 1),
        set: (D) => {
          n.value.maxIterationMultiplier = Number(Math.pow(10, D).toPrecision(3));
        }
      });
      gt(() => {
        K(), I();
      });
      const H = se("navigation"), pe = Te(() => h.value.find((D) => D.name === m.value)), oe = Te(() => {
        var _a2;
        return (_a2 = pe.value) == null ? void 0 : _a2.thumbnail;
      });
      return Ct([
        H,
        () => t.engine
      ], async ([D]) => {
        D === "navigation" && await G();
      }, {
        immediate: true
      }), (D, b) => {
        var _a2;
        return le(), de("div", Tv, [
          g("div", Cv, [
            g("ul", null, [
              g("li", {
                class: be({
                  "is-active": H.value === "navigation"
                })
              }, [
                g("a", {
                  onClick: b[0] || (b[0] = (L) => H.value = "navigation")
                }, "Navigation")
              ], 2),
              g("li", {
                class: be({
                  "is-active": H.value === "presets"
                })
              }, [
                g("a", {
                  onClick: b[1] || (b[1] = (L) => H.value = "presets")
                }, "Presets")
              ], 2),
              g("li", {
                class: be({
                  "is-active": H.value === "palettes"
                })
              }, [
                g("a", {
                  onClick: b[2] || (b[2] = (L) => H.value = "palettes")
                }, "Palettes")
              ], 2),
              g("li", {
                class: be({
                  "is-active": H.value === "performance"
                })
              }, [
                g("a", {
                  onClick: b[3] || (b[3] = (L) => H.value = "performance")
                }, "Graphics")
              ], 2)
            ])
          ]),
          g("div", kv, [
            H.value === "navigation" ? (le(), de("div", Ev, [
              g("div", Av, [
                g("span", null, [
                  b[29] || (b[29] = ae("Cx: ", -1)),
                  g("span", null, ue(a(n.value.cx, 38)), 1)
                ]),
                b[31] || (b[31] = g("br", null, null, -1)),
                g("span", null, [
                  b[30] || (b[30] = ae("Cy: ", -1)),
                  g("span", null, ue(a(n.value.cy, 38)), 1)
                ])
              ]),
              g("div", Pv, [
                g("span", null, [
                  b[32] || (b[32] = ae("\xC9chelle\xA0: ", -1)),
                  g("span", Lv, ue(Number(n.value.scale).toExponential(2)), 1)
                ]),
                ye(g("input", {
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
                  "onUpdate:modelValue": b[4] || (b[4] = (L) => s.value = L)
                }, null, 512), [
                  [
                    Ye,
                    s.value,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              g("div", Rv, [
                g("span", null, [
                  b[33] || (b[33] = ae("Angle\xA0: ", -1)),
                  g("span", zv, ue(r.value) + "\xB0", 1)
                ]),
                ye(g("input", {
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
                  "onUpdate:modelValue": b[5] || (b[5] = (L) => i.value = L)
                }, null, 512), [
                  [
                    Ye,
                    i.value,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ])
            ])) : H.value === "presets" ? (le(), de("div", Nv, [
              g("div", Bv, [
                b[35] || (b[35] = g("label", {
                  class: "label"
                }, "Presets enregistr\xE9s", -1)),
                g("div", {
                  class: be([
                    "dropdown",
                    {
                      "is-active": M.value
                    }
                  ]),
                  style: {
                    width: "100%"
                  }
                }, [
                  g("div", Iv, [
                    g("button", {
                      class: "button is-fullwidth",
                      onClick: b[6] || (b[6] = (L) => M.value = !M.value),
                      "aria-haspopup": "true",
                      "aria-controls": "dropdown-menu-presets",
                      type: "button"
                    }, [
                      g("span", Ov, [
                        x.value ? (le(), de("img", {
                          key: 0,
                          src: x.value,
                          alt: "miniature",
                          style: {
                            height: "32px",
                            width: "56px",
                            "object-fit": "cover",
                            "margin-right": "8px",
                            "border-radius": "3px",
                            background: "#888"
                          }
                        }, null, 8, Fv)) : Ft("", true),
                        g("span", Uv, ue(c.value || "Choisir un preset..."), 1),
                        b[34] || (b[34] = g("span", {
                          class: "icon is-small",
                          style: {
                            "margin-left": "5px"
                          }
                        }, [
                          g("i", {
                            class: "fas fa-angle-down",
                            "aria-hidden": "true"
                          })
                        ], -1))
                      ])
                    ])
                  ]),
                  g("div", Dv, [
                    g("div", $v, [
                      (le(true), de(Ue, null, Wi(f.value, (L) => (le(), de("a", {
                        key: L.name,
                        class: be([
                          "dropdown-item",
                          {
                            "is-active": T.value === L.name
                          }
                        ]),
                        onClick: Es((Me) => C(L), [
                          "prevent"
                        ]),
                        style: {
                          display: "flex",
                          "align-items": "center",
                          gap: "0.75em"
                        }
                      }, [
                        L.thumbnail ? (le(), de("img", {
                          key: 0,
                          src: L.thumbnail,
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
                        }, null, 8, Gv)) : Ft("", true),
                        g("span", Hv, ue(L.name), 1)
                      ], 10, Vv))), 128))
                    ])
                  ])
                ], 2),
                g("div", Wv, [
                  g("div", qv, [
                    ye(g("input", {
                      class: "input",
                      "onUpdate:modelValue": b[7] || (b[7] = (L) => c.value = L),
                      type: "text",
                      placeholder: "Nom...",
                      onFocus: b[8] || (b[8] = (L) => t.suspendShortcuts && t.suspendShortcuts(true)),
                      onBlur: b[9] || (b[9] = (L) => t.suspendShortcuts && t.suspendShortcuts(false))
                    }, null, 544), [
                      [
                        Ye,
                        c.value
                      ]
                    ])
                  ]),
                  g("div", {
                    class: "control"
                  }, [
                    g("button", {
                      class: "button is-link is-small",
                      onClick: U
                    }, "Enregistrer")
                  ]),
                  g("div", Yv, [
                    g("button", {
                      class: "button is-danger is-small",
                      onClick: z,
                      disabled: !c.value
                    }, "Supprimer", 8, Kv)
                  ])
                ])
              ])
            ])) : H.value === "palettes" ? (le(), de("div", Xv, [
              g("div", jv, [
                xe(Mv, {
                  "color-stops": n.value.colorStops
                }, null, 8, [
                  "color-stops"
                ])
              ]),
              g("div", Zv, [
                b[36] || (b[36] = g("label", {
                  style: {
                    "white-space": "nowrap"
                  }
                }, "P\xE9riode :", -1)),
                ye(g("input", {
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
                  "onUpdate:modelValue": b[10] || (b[10] = (L) => o.value = L)
                }, null, 512), [
                  [
                    Ye,
                    o.value,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              g("div", Jv, [
                b[37] || (b[37] = g("label", {
                  style: {
                    "white-space": "nowrap"
                  }
                }, "D\xE9calage :", -1)),
                ye(g("input", {
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
                  "onUpdate:modelValue": b[11] || (b[11] = (L) => n.value.paletteOffset = L)
                }, null, 512), [
                  [
                    Ye,
                    n.value.paletteOffset,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              b[40] || (b[40] = g("hr", {
                class: "section-sep"
              }, null, -1)),
              g("div", Qv, [
                b[39] || (b[39] = g("label", {
                  class: "label"
                }, "Palettes enregistr\xE9es", -1)),
                g("div", {
                  class: be([
                    "dropdown",
                    {
                      "is-active": _.value
                    }
                  ]),
                  style: {
                    width: "100%"
                  }
                }, [
                  g("div", e0, [
                    g("button", {
                      class: "button is-fullwidth",
                      onClick: b[12] || (b[12] = (L) => _.value = !_.value),
                      "aria-haspopup": "true",
                      "aria-controls": "dropdown-menu-palettes",
                      type: "button"
                    }, [
                      g("span", t0, [
                        oe.value ? (le(), de("img", {
                          key: 0,
                          src: oe.value,
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
                        }, null, 8, n0)) : Ft("", true),
                        g("span", r0, [
                          g("span", i0, ue(d.value || "Choisir une palette..."), 1),
                          b[38] || (b[38] = g("span", {
                            class: "icon is-small"
                          }, [
                            g("i", {
                              class: "fas fa-angle-down",
                              "aria-hidden": "true"
                            })
                          ], -1))
                        ])
                      ])
                    ])
                  ]),
                  g("div", o0, [
                    g("div", s0, [
                      (le(true), de(Ue, null, Wi(h.value, (L) => (le(), de("a", {
                        key: L.name,
                        class: be([
                          "dropdown-item",
                          {
                            "is-active": m.value === L.name
                          }
                        ]),
                        onClick: Es((Me) => w(L), [
                          "prevent"
                        ]),
                        style: {
                          display: "flex",
                          "flex-direction": "column",
                          gap: "0.5em",
                          padding: "0.75em"
                        }
                      }, [
                        L.thumbnail ? (le(), de("img", {
                          key: 0,
                          src: L.thumbnail,
                          alt: "miniature",
                          style: {
                            height: "32px",
                            width: "100%",
                            "object-fit": "cover",
                            "border-radius": "4px",
                            background: "#aaa",
                            "box-shadow": "0 1px 6px rgba(0,0,0,0.16)"
                          }
                        }, null, 8, l0)) : Ft("", true),
                        g("span", u0, ue(L.name), 1)
                      ], 10, a0))), 128))
                    ])
                  ])
                ], 2),
                g("div", c0, [
                  g("div", f0, [
                    ye(g("input", {
                      class: "input",
                      "onUpdate:modelValue": b[13] || (b[13] = (L) => d.value = L),
                      type: "text",
                      placeholder: "Nom...",
                      onFocus: b[14] || (b[14] = (L) => t.suspendShortcuts && t.suspendShortcuts(true)),
                      onBlur: b[15] || (b[15] = (L) => t.suspendShortcuts && t.suspendShortcuts(false))
                    }, null, 544), [
                      [
                        Ye,
                        d.value
                      ]
                    ])
                  ]),
                  g("div", {
                    class: "control"
                  }, [
                    g("button", {
                      class: "button is-link is-small",
                      onClick: O
                    }, "Enregistrer")
                  ]),
                  g("div", d0, [
                    g("button", {
                      class: "button is-danger is-small",
                      onClick: Z,
                      disabled: !d.value
                    }, "Supprimer", 8, h0)
                  ])
                ])
              ])
            ])) : H.value === "performance" ? (le(), de("div", p0, [
              g("div", g0, [
                b[41] || (b[41] = g("label", {
                  class: "label"
                }, "Mu (log)", -1)),
                g("div", m0, [
                  ye(g("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "0",
                    max: "5",
                    step: "0.01",
                    "onUpdate:modelValue": b[16] || (b[16] = (L) => Y.value = L)
                  }, null, 512), [
                    [
                      Ye,
                      Y.value
                    ]
                  ])
                ]),
                g("span", null, ue((n.value.mu ?? 1).toFixed(1)), 1)
              ]),
              g("div", v0, [
                b[42] || (b[42] = g("label", {
                  class: "label"
                }, "Epsilon (log)", -1)),
                g("div", _0, [
                  ye(g("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "-12",
                    max: "0",
                    step: "0.01",
                    "onUpdate:modelValue": b[17] || (b[17] = (L) => W.value = L)
                  }, null, 512), [
                    [
                      Ye,
                      W.value
                    ]
                  ])
                ]),
                g("span", null, ue((n.value.epsilon ?? 1e-8).toExponential(2)), 1)
              ]),
              g("div", b0, [
                b[43] || (b[43] = g("label", {
                  class: "label"
                }, "Tessellation", -1)),
                g("div", y0, [
                  ye(g("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "0.1",
                    max: "10",
                    step: "0.1",
                    "onUpdate:modelValue": b[18] || (b[18] = (L) => n.value.tessellationLevel = L)
                  }, null, 512), [
                    [
                      Ye,
                      n.value.tessellationLevel,
                      void 0,
                      {
                        number: true
                      }
                    ]
                  ])
                ]),
                g("span", null, ue(n.value.tessellationLevel), 1)
              ]),
              g("div", x0, [
                g("label", w0, [
                  ye(g("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[19] || (b[19] = (L) => n.value.activateWebcam = L)
                  }, null, 512), [
                    [
                      Nt,
                      n.value.activateWebcam
                    ]
                  ]),
                  b[44] || (b[44] = ae(" \xA0Activer la webcam ", -1))
                ])
              ]),
              g("div", S0, [
                g("label", M0, [
                  ye(g("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[20] || (b[20] = (L) => n.value.activateTessellation = L)
                  }, null, 512), [
                    [
                      Nt,
                      n.value.activateTessellation
                    ]
                  ]),
                  b[45] || (b[45] = ae(" \xA0Tessellation GPU ", -1))
                ])
              ]),
              g("div", T0, [
                g("label", C0, [
                  ye(g("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[21] || (b[21] = (L) => n.value.activateShading = L)
                  }, null, 512), [
                    [
                      Nt,
                      n.value.activateShading
                    ]
                  ]),
                  b[46] || (b[46] = ae(" \xA0Shading avanc\xE9 ", -1))
                ])
              ]),
              g("div", k0, [
                g("label", E0, [
                  ye(g("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[22] || (b[22] = (L) => n.value.activateSkybox = L)
                  }, null, 512), [
                    [
                      Nt,
                      n.value.activateSkybox
                    ]
                  ]),
                  b[47] || (b[47] = ae(" \xA0Skybox ", -1))
                ])
              ]),
              g("div", A0, [
                g("label", P0, [
                  ye(g("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[23] || (b[23] = (L) => n.value.activatePalette = L)
                  }, null, 512), [
                    [
                      Nt,
                      n.value.activatePalette
                    ]
                  ]),
                  b[48] || (b[48] = ae(" \xA0Palette ", -1))
                ])
              ]),
              g("div", L0, [
                g("label", R0, [
                  ye(g("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[24] || (b[24] = (L) => n.value.activateSmoothness = L)
                  }, null, 512), [
                    [
                      Nt,
                      n.value.activateSmoothness
                    ]
                  ]),
                  b[49] || (b[49] = ae(" \xA0Smoothness ", -1))
                ])
              ]),
              g("div", z0, [
                g("label", N0, [
                  ye(g("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[25] || (b[25] = (L) => n.value.activateZebra = L)
                  }, null, 512), [
                    [
                      Nt,
                      n.value.activateZebra
                    ]
                  ]),
                  b[50] || (b[50] = ae(" \xA0Zebra ", -1))
                ])
              ]),
              g("div", B0, [
                g("label", I0, [
                  ye(g("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[26] || (b[26] = (L) => n.value.activateAnimate = L)
                  }, null, 512), [
                    [
                      Nt,
                      n.value.activateAnimate
                    ]
                  ]),
                  b[51] || (b[51] = ae(" \xA0Animate ", -1))
                ])
              ]),
              g("div", O0, [
                g("label", F0, "R\xE9solution (DPR \xD7 " + ue(((_a2 = n.value.dprMultiplier) == null ? void 0 : _a2.toFixed(3)) ?? "1.000") + ")", 1),
                g("div", U0, [
                  ye(g("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "0.125",
                    max: "2",
                    step: "0.125",
                    "onUpdate:modelValue": b[27] || (b[27] = (L) => n.value.dprMultiplier = L)
                  }, null, 512), [
                    [
                      Ye,
                      n.value.dprMultiplier,
                      void 0,
                      {
                        number: true
                      }
                    ]
                  ])
                ])
              ]),
              g("div", D0, [
                g("label", $0, "It\xE9rations (\xD7 " + ue((n.value.maxIterationMultiplier ?? 1).toPrecision(3)) + ")", 1),
                g("div", V0, [
                  ye(g("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "-1",
                    max: "1",
                    step: "0.01",
                    "onUpdate:modelValue": b[28] || (b[28] = (L) => V.value = L)
                  }, null, 512), [
                    [
                      Ye,
                      V.value
                    ]
                  ])
                ])
              ])
            ])) : Ft("", true)
          ])
        ]);
      };
    }
  }), H0 = Mn(G0, [
    [
      "__scopeId",
      "data-v-60dbe098"
    ]
  ]), W0 = [
    "title"
  ], q0 = {
    class: "stats-fps"
  }, Y0 = {
    class: "stats-toggle"
  }, K0 = {
    key: 0,
    class: "stats-panel"
  }, X0 = {
    class: "stats-grid"
  }, j0 = {
    class: "stats-row"
  }, Z0 = {
    class: "stats-value"
  }, J0 = {
    class: "stats-row"
  }, Q0 = {
    class: "stats-value"
  }, e_ = {
    class: "stats-row"
  }, t_ = {
    class: "stats-value"
  }, n_ = {
    class: "stats-row"
  }, r_ = {
    class: "stats-value"
  }, i_ = {
    class: "stats-row"
  }, o_ = {
    class: "stats-value"
  }, sn = 200, s_ = pt({
    __name: "RenderStats",
    props: {
      engine: {}
    },
    setup(e) {
      const t = e, n = se(false), r = se(0), i = se(false), o = se(0), s = se(-1), a = se(0), l = se(0), u = [], c = [], f = se(null);
      let d = null;
      function h() {
        const T = t.engine;
        if (!T) return;
        r.value = T.fps ?? 0, i.value = T.isRendering ?? false, o.value = T.gpuFrameTimeMs ?? 0, s.value = T.unfinishedPixelCount ?? -1;
        const M = T.neutralSize ?? 0;
        a.value = M * M, l.value = typeof T.getIterationBatchSize == "function" ? T.getIterationBatchSize() : 0, u.push(s.value >= 0 ? s.value : 0), u.length > sn && u.shift(), c.push(r.value), c.length > sn && c.shift(), n.value && z();
      }
      gt(() => {
        d = setInterval(h, 150);
      }), Sn(() => {
        d !== null && clearInterval(d);
      }), Ct(n, async (T) => {
        T && (await ai(), z());
      });
      function m() {
        return a.value === 0 || s.value < 0 ? "--" : ((a.value - s.value) / a.value * 100).toFixed(1);
      }
      function _(T) {
        return T < 0 ? "--" : T >= 1e6 ? (T / 1e6).toFixed(1) + "M" : T >= 1e3 ? (T / 1e3).toFixed(1) + "k" : String(T);
      }
      function z() {
        const T = f.value;
        if (!T) return;
        const M = T.getContext("2d");
        if (!M) return;
        const y = window.devicePixelRatio || 1, x = T.clientWidth, C = T.clientHeight;
        T.width = x * y, T.height = C * y, M.scale(y, y), M.clearRect(0, 0, x, C), M.fillStyle = "rgba(0,0,0,0.06)", M.beginPath(), M.roundRect(0, 0, x, C, 8), M.fill();
        const U = C - 4, K = 2;
        if (u.length > 1) {
          const I = Math.max(...u, 1);
          M.beginPath(), M.moveTo(0, K + U);
          for (let O = 0; O < u.length; O++) {
            const q = O / (sn - 1) * x, w = K + U - u[O] / I * U;
            M.lineTo(q, w);
          }
          M.lineTo((u.length - 1) / (sn - 1) * x, K + U), M.closePath(), M.fillStyle = "rgba(34,197,94,0.18)", M.fill(), M.strokeStyle = "rgba(34,197,94,0.7)", M.lineWidth = 1.5, M.beginPath();
          for (let O = 0; O < u.length; O++) {
            const q = O / (sn - 1) * x, w = K + U - u[O] / I * U;
            O === 0 ? M.moveTo(q, w) : M.lineTo(q, w);
          }
          M.stroke();
        }
        if (c.length > 1) {
          const I = Math.max(...c, 1);
          M.strokeStyle = "rgba(255,170,0,0.8)", M.lineWidth = 1.5, M.beginPath();
          for (let O = 0; O < c.length; O++) {
            const q = O / (sn - 1) * x, w = K + U - c[O] / I * U;
            O === 0 ? M.moveTo(q, w) : M.lineTo(q, w);
          }
          M.stroke();
        }
      }
      function G() {
        n.value = !n.value;
      }
      return (T, M) => (le(), de("div", {
        class: be([
          "render-stats",
          {
            "render-stats--expanded": n.value
          }
        ])
      }, [
        g("button", {
          class: "stats-header",
          onClick: G,
          title: n.value ? "Replier" : "Statistiques de rendu"
        }, [
          g("span", {
            class: be([
              "status-dot",
              i.value ? "status-dot--active" : "status-dot--idle"
            ])
          }, null, 2),
          g("span", q0, ue(r.value) + " fps", 1),
          g("span", Y0, ue(n.value ? "\u25B2" : "\u25BC"), 1)
        ], 8, W0),
        n.value ? (le(), de("div", K0, [
          g("canvas", {
            ref_key: "graphCanvas",
            ref: f,
            class: "stats-graph"
          }, null, 512),
          M[5] || (M[5] = pl('<div class="stats-legend" data-v-3c8da564><span class="legend-item" data-v-3c8da564><span class="legend-swatch legend-swatch--green" data-v-3c8da564></span>Pixels restants</span><span class="legend-item" data-v-3c8da564><span class="legend-swatch legend-swatch--orange" data-v-3c8da564></span>FPS</span></div>', 1)),
          g("div", X0, [
            g("div", j0, [
              M[0] || (M[0] = g("span", {
                class: "stats-label"
              }, "Completion", -1)),
              g("span", Z0, ue(m()) + "%", 1)
            ]),
            g("div", J0, [
              M[1] || (M[1] = g("span", {
                class: "stats-label"
              }, "Pixels restants", -1)),
              g("span", Q0, ue(_(s.value)), 1)
            ]),
            g("div", e_, [
              M[2] || (M[2] = g("span", {
                class: "stats-label"
              }, "Total pixels", -1)),
              g("span", t_, ue(_(a.value)), 1)
            ]),
            g("div", n_, [
              M[3] || (M[3] = g("span", {
                class: "stats-label"
              }, "GPU frame", -1)),
              g("span", r_, ue(o.value.toFixed(1)) + " ms", 1)
            ]),
            g("div", i_, [
              M[4] || (M[4] = g("span", {
                class: "stats-label"
              }, "Batch size", -1)),
              g("span", o_, ue(l.value), 1)
            ])
          ])
        ])) : Ft("", true)
      ], 2));
    }
  }), a_ = Mn(s_, [
    [
      "__scopeId",
      "data-v-3c8da564"
    ]
  ]), l_ = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, u_ = {
    key: 0,
    style: {
      position: "absolute",
      top: "0",
      left: "0",
      "z-index": "10",
      "pointer-events": "auto",
      height: "100vh"
    }
  }, c_ = {
    class: "tag is-black"
  }, f_ = {
    class: "tag is-black"
  }, d_ = {
    class: "tag is-black"
  }, h_ = {
    class: "tag is-black"
  }, p_ = {
    class: "tag is-black"
  }, g_ = {
    class: "tag is-black"
  }, m_ = {
    class: "tag is-black"
  }, v_ = {
    class: "tag is-black"
  }, __ = {
    href: "https://github.com/gcollombet/mandelbrot",
    target: "_blank",
    rel: "noopener",
    class: "footer-link",
    "aria-label": "GitHub"
  }, b_ = {
    class: "github-logo",
    height: "20",
    viewBox: "0 0 16 16",
    width: "20",
    fill: "currentColor",
    style: {
      "vertical-align": "middle",
      "margin-right": "4px"
    }
  }, oa = "mandelbrot_last_settings", y_ = pt({
    __name: "MandelbrotViewer",
    setup(e) {
      const t = se(null), n = Te(() => {
        var _a2;
        return ((_a2 = t.value) == null ? void 0 : _a2.getEngine()) ?? null;
      }), r = se(false), i = se(false), o = se(true), s = se({
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
        maxIterationMultiplier: 1
      });
      gt(() => {
        window.addEventListener("keydown", l);
        try {
          const d = localStorage.getItem(oa);
          d && Object.assign(s.value, JSON.parse(d));
        } catch {
        }
      }), Sn(() => {
        window.removeEventListener("keydown", l);
      }), Ct(s, (d) => {
        localStorage.setItem(oa, JSON.stringify(d));
      }, {
        deep: true
      });
      function a() {
        r.value = !r.value;
      }
      function l(d) {
        var _a2, _b, _c2;
        if (i.value) return;
        const h = (_b = (_a2 = d.target) == null ? void 0 : _a2.tagName) == null ? void 0 : _b.toLowerCase();
        h === "input" || h === "textarea" || ((_c2 = d.target) == null ? void 0 : _c2.isContentEditable) || (d.key === "w" || d.key === "W") && !d.repeat && (d.preventDefault(), a());
      }
      function u() {
        var _a2;
        const d = window.navigator.language || ((_a2 = window.navigator.languages) == null ? void 0 : _a2[0]) || "en";
        return d.startsWith("fr") || d.startsWith("be") ? "azerty" : "qwerty";
      }
      const c = u(), f = Te(() => c === "azerty" ? {
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
      return (d, h) => (le(), de("div", l_, [
        ye(g("button", {
          class: be([
            "menu-hamburger tag is-light is-medium animate__animated",
            o.value ? "animate__fadeInDown" : ""
          ]),
          "aria-label": "Menu",
          onClick: a
        }, [
          ...h[5] || (h[5] = [
            g("span", {
              class: "hamburger-bar"
            }, null, -1),
            g("span", {
              class: "hamburger-bar"
            }, null, -1),
            g("span", {
              class: "hamburger-bar"
            }, null, -1)
          ])
        ], 2), [
          [
            cr,
            o.value
          ]
        ]),
        ye(g("div", {
          class: be([
            "render-stats-wrapper animate__animated",
            o.value ? "animate__fadeInDown" : ""
          ])
        }, [
          xe(a_, {
            engine: n.value
          }, null, 8, [
            "engine"
          ])
        ], 2), [
          [
            cr,
            o.value
          ]
        ]),
        xe(Th, {
          ref_key: "mandelbrotCtrlRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          },
          scale: s.value.scale,
          "onUpdate:scale": h[0] || (h[0] = (m) => s.value.scale = m),
          angle: s.value.angle,
          "onUpdate:angle": h[1] || (h[1] = (m) => s.value.angle = m),
          cx: s.value.cx,
          "onUpdate:cx": h[2] || (h[2] = (m) => s.value.cx = m),
          cy: s.value.cy,
          "onUpdate:cy": h[3] || (h[3] = (m) => s.value.cy = m),
          mu: s.value.mu,
          shadingLevel: s.value.shadingLevel,
          antialiasLevel: s.value.antialiasLevel,
          tessellationLevel: s.value.tessellationLevel,
          epsilon: s.value.epsilon,
          palettePeriod: s.value.palettePeriod,
          paletteOffset: s.value.paletteOffset,
          colorStops: s.value.colorStops,
          activatePalette: s.value.activatePalette,
          activateSkybox: s.value.activateSkybox,
          activateTessellation: s.value.activateTessellation,
          activateWebcam: s.value.activateWebcam,
          activateShading: s.value.activateShading,
          activateZebra: s.value.activateZebra,
          activateSmoothness: s.value.activateSmoothness,
          activateAnimate: s.value.activateAnimate,
          dprMultiplier: s.value.dprMultiplier,
          maxIterationMultiplier: s.value.maxIterationMultiplier
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
          "activateSmoothness",
          "activateAnimate",
          "dprMultiplier",
          "maxIterationMultiplier"
        ]),
        r.value ? (le(), de("div", u_, [
          xe(H0, {
            modelValue: s.value,
            "onUpdate:modelValue": h[4] || (h[4] = (m) => s.value = m),
            engine: n.value,
            "suspend-shortcuts": (m) => {
              i.value = m;
            }
          }, null, 8, [
            "modelValue",
            "engine",
            "suspend-shortcuts"
          ])
        ])) : Ft("", true),
        ye(g("div", {
          class: be([
            "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
            o.value ? "animate__fadeInUp" : ""
          ])
        }, [
          h[6] || (h[6] = ae(" Move\xA0 ", -1)),
          h[7] || (h[7] = g("span", {
            class: "tag is-black"
          }, "Left clic", -1)),
          h[8] || (h[8] = ae("\xA0 ", -1)),
          g("span", c_, ue(f.value.up), 1),
          h[9] || (h[9] = ae("\xA0 ", -1)),
          g("span", f_, ue(f.value.left), 1),
          h[10] || (h[10] = ae("\xA0 ", -1)),
          g("span", d_, ue(f.value.down), 1),
          h[11] || (h[11] = ae("\xA0 ", -1)),
          g("span", h_, ue(f.value.right), 1),
          h[12] || (h[12] = ae("\xA0 |\xA0Rotate\xA0 ", -1)),
          h[13] || (h[13] = g("span", {
            class: "tag is-black"
          }, "Right clic", -1)),
          h[14] || (h[14] = ae("\xA0 ", -1)),
          g("span", p_, ue(f.value.rotateLeft), 1),
          h[15] || (h[15] = ae("\xA0 ", -1)),
          g("span", g_, ue(f.value.rotateRight), 1),
          h[16] || (h[16] = ae("\xA0 |\xA0Zoom\xA0 ", -1)),
          h[17] || (h[17] = g("span", {
            class: "tag is-black"
          }, "Wheel", -1)),
          h[18] || (h[18] = ae("\xA0 ", -1)),
          g("span", m_, ue(f.value.zoomIn), 1),
          h[19] || (h[19] = ae("\xA0 ", -1)),
          g("span", v_, ue(f.value.zoomOut), 1),
          h[20] || (h[20] = ae("\xA0 |\xA0Settings\xA0 ", -1)),
          h[21] || (h[21] = g("span", {
            class: "tag is-black"
          }, "W", -1))
        ], 2), [
          [
            cr,
            o.value
          ]
        ]),
        ye(g("div", {
          class: be([
            "footer-love tag is-light is-medium is-hidden-touch animate__animated",
            o.value ? "animate__fadeInUp" : ""
          ])
        }, [
          h[24] || (h[24] = g("small", null, [
            g("a", {
              href: "https://wgpu.rs/",
              target: "_blank",
              rel: "noopener",
              class: "footer-link",
              "aria-label": "wGPU"
            }, [
              ae(" Made with "),
              g("img", {
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
          h[25] || (h[25] = ae(" \xA0|\xA0 ", -1)),
          g("small", null, [
            g("a", __, [
              (le(), de("svg", b_, [
                ...h[22] || (h[22] = [
                  g("path", {
                    d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                  }, null, -1)
                ])
              ])),
              h[23] || (h[23] = ae(" GitHub ", -1))
            ])
          ])
        ], 2), [
          [
            cr,
            o.value
          ]
        ])
      ]));
    }
  }), x_ = Mn(y_, [
    [
      "__scopeId",
      "data-v-f216eabc"
    ]
  ]), w_ = {
    key: 0,
    id: "fullscreen"
  }, S_ = {
    key: 1,
    class: "section is-flex is-flex-direction-column is-align-items-center is-justify-content-center",
    style: {
      height: "100vh"
    }
  }, M_ = {
    class: "box has-text-centered",
    style: {
      "max-width": "400px"
    }
  }, T_ = {
    class: "title is-4 mt-3"
  }, C_ = {
    key: 0
  }, k_ = {
    key: 1
  }, E_ = {
    class: "button is-link mt-4",
    href: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility",
    target: "_blank"
  }, A_ = pt({
    __name: "App",
    setup(e) {
      const t = se(false), n = se(true);
      return gt(() => {
        t.value = typeof navigator < "u" && "gpu" in navigator, typeof navigator < "u" && (n.value = navigator.language.startsWith("fr"));
      }), (r, i) => t.value ? (le(), de("div", w_, [
        xe(x_)
      ])) : (le(), de("div", S_, [
        g("div", M_, [
          i[2] || (i[2] = g("span", {
            class: "icon is-large has-text-danger"
          }, [
            g("i", {
              class: "fas fa-exclamation-triangle fa-2x"
            })
          ], -1)),
          g("h1", T_, ue(n.value ? "WebGPU non support\xE9" : "WebGPU not supported"), 1),
          g("p", null, [
            n.value ? (le(), de("span", C_, [
              ...i[0] || (i[0] = [
                ae(" Ce navigateur ne supporte pas WebGPU.", -1),
                g("br", null, null, -1),
                ae(" Veuillez utiliser un navigateur compatible WebGPU. ", -1)
              ])
            ])) : (le(), de("span", k_, [
              ...i[1] || (i[1] = [
                ae(" This browser does not support WebGPU.", -1),
                g("br", null, null, -1),
                ae(" Please use a WebGPU-compatible browser. ", -1)
              ])
            ]))
          ]),
          g("a", E_, ue(n.value ? "Liste des navigateurs compatibles WebGPU" : "List of WebGPU-compatible browsers"), 1)
        ])
      ]));
    }
  });
  "serviceWorker" in navigator && window.addEventListener("load", () => {
    navigator.serviceWorker.register("/mandelbrot/sw.js");
  });
  Bf(A_).mount("#app");
})();
