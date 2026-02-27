var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(async () => {
  (function() {
    const t = document.createElement("link").relList;
    if (t && t.supports && t.supports("modulepreload")) return;
    for (const s of document.querySelectorAll('link[rel="modulepreload"]')) i(s);
    new MutationObserver((s) => {
      for (const r of s) if (r.type === "childList") for (const o of r.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && i(o);
    }).observe(document, {
      childList: true,
      subtree: true
    });
    function n(s) {
      const r = {};
      return s.integrity && (r.integrity = s.integrity), s.referrerPolicy && (r.referrerPolicy = s.referrerPolicy), s.crossOrigin === "use-credentials" ? r.credentials = "include" : s.crossOrigin === "anonymous" ? r.credentials = "omit" : r.credentials = "same-origin", r;
    }
    function i(s) {
      if (s.ep) return;
      s.ep = true;
      const r = n(s);
      fetch(s.href, r);
    }
  })();
  function Ps(e) {
    const t = /* @__PURE__ */ Object.create(null);
    for (const n of e.split(",")) t[n] = 1;
    return (n) => n in t;
  }
  const de = {}, hn = [], dt = () => {
  }, to = () => false, zi = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Ls = (e) => e.startsWith("onUpdate:"), Ee = Object.assign, ks = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, Ia = Object.prototype.hasOwnProperty, pe = (e, t) => Ia.call(e, t), K = Array.isArray, gn = (e) => Jn(e) === "[object Map]", no = (e) => Jn(e) === "[object Set]", er = (e) => Jn(e) === "[object Date]", te = (e) => typeof e == "function", Me = (e) => typeof e == "string", gt = (e) => typeof e == "symbol", he = (e) => e !== null && typeof e == "object", io = (e) => (he(e) || te(e)) && te(e.then) && te(e.catch), so = Object.prototype.toString, Jn = (e) => so.call(e), Oa = (e) => Jn(e).slice(8, -1), ro = (e) => Jn(e) === "[object Object]", Rs = (e) => Me(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Bn = Ps(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), Bi = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return ((n) => t[n] || (t[n] = e(n)));
  }, Na = /-\w/g, Ct = Bi((e) => e.replace(Na, (t) => t.slice(1).toUpperCase())), Ua = /\B([A-Z])/g, Gt = Bi((e) => e.replace(Ua, "-$1").toLowerCase()), oo = Bi((e) => e.charAt(0).toUpperCase() + e.slice(1)), qi = Bi((e) => e ? `on${oo(e)}` : ""), qe = (e, t) => !Object.is(e, t), pi = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, ao = (e, t, n, i = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: i,
      value: n
    });
  }, As = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  }, Fa = (e) => {
    const t = Me(e) ? Number(e) : NaN;
    return isNaN(t) ? e : t;
  };
  let tr;
  const Ii = () => tr || (tr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function Qn(e) {
    if (K(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const i = e[n], s = Me(i) ? Va(i) : Qn(i);
        if (s) for (const r in s) t[r] = s[r];
      }
      return t;
    } else if (Me(e) || he(e)) return e;
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
    if (Me(e)) t = e;
    else if (K(e)) for (let n = 0; n < e.length; n++) {
      const i = ce(e[n]);
      i && (t += i + " ");
    }
    else if (he(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const Ha = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Wa = Ps(Ha);
  function lo(e) {
    return !!e || e === "";
  }
  function ja(e, t) {
    if (e.length !== t.length) return false;
    let n = true;
    for (let i = 0; n && i < e.length; i++) n = zs(e[i], t[i]);
    return n;
  }
  function zs(e, t) {
    if (e === t) return true;
    let n = er(e), i = er(t);
    if (n || i) return n && i ? e.getTime() === t.getTime() : false;
    if (n = gt(e), i = gt(t), n || i) return e === t;
    if (n = K(e), i = K(t), n || i) return n && i ? ja(e, t) : false;
    if (n = he(e), i = he(t), n || i) {
      if (!n || !i) return false;
      const s = Object.keys(e).length, r = Object.keys(t).length;
      if (s !== r) return false;
      for (const o in e) {
        const a = e.hasOwnProperty(o), l = t.hasOwnProperty(o);
        if (a && !l || !a && l || !zs(e[o], t[o])) return false;
      }
    }
    return String(e) === String(t);
  }
  const uo = (e) => !!(e && e.__v_isRef === true), ne = (e) => Me(e) ? e : e == null ? "" : K(e) || he(e) && (e.toString === so || !te(e.toString)) ? uo(e) ? ne(e.value) : JSON.stringify(e, co, 2) : String(e), co = (e, t) => uo(t) ? co(e, t.value) : gn(t) ? {
    [`Map(${t.size})`]: [
      ...t.entries()
    ].reduce((n, [i, s], r) => (n[Yi(i, r) + " =>"] = s, n), {})
  } : no(t) ? {
    [`Set(${t.size})`]: [
      ...t.values()
    ].map((n) => Yi(n))
  } : gt(t) ? Yi(t) : he(t) && !K(t) && !ro(t) ? String(t) : t, Yi = (e, t = "") => {
    var n;
    return gt(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
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
          const s = this.parent.scopes.pop();
          s && s !== this && (this.parent.scopes[this.index] = s, s.index = this.index);
        }
        this.parent = void 0;
      }
    }
  }
  function Ya() {
    return je;
  }
  let _e;
  const Ki = /* @__PURE__ */ new WeakSet();
  class fo {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, je && je.active && je.effects.push(this);
    }
    pause() {
      this.flags |= 64;
    }
    resume() {
      this.flags & 64 && (this.flags &= -65, Ki.has(this) && (Ki.delete(this), this.trigger()));
    }
    notify() {
      this.flags & 2 && !(this.flags & 32) || this.flags & 8 || ho(this);
    }
    run() {
      if (!(this.flags & 1)) return this.fn();
      this.flags |= 2, nr(this), go(this);
      const t = _e, n = st;
      _e = this, st = true;
      try {
        return this.fn();
      } finally {
        vo(this), _e = t, st = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) Os(t);
        this.deps = this.depsTail = void 0, nr(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? Ki.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      fs(this) && this.run();
    }
    get dirty() {
      return fs(this);
    }
  }
  let po = 0, In, On;
  function ho(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = On, On = e;
      return;
    }
    e.next = In, In = e;
  }
  function Bs() {
    po++;
  }
  function Is() {
    if (--po > 0) return;
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
  function go(e) {
    for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
  }
  function vo(e) {
    let t, n = e.depsTail, i = n;
    for (; i; ) {
      const s = i.prevDep;
      i.version === -1 ? (i === n && (n = s), Os(i), Ka(i)) : t = i, i.dep.activeLink = i.prevActiveLink, i.prevActiveLink = void 0, i = s;
    }
    e.deps = t, e.depsTail = n;
  }
  function fs(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (mo(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function mo(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Gn) || (e.globalVersion = Gn, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !fs(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = _e, i = st;
    _e = e, st = true;
    try {
      go(e);
      const s = e.fn(e._value);
      (t.version === 0 || qe(s, e._value)) && (e.flags |= 128, e._value = s, t.version++);
    } catch (s) {
      throw t.version++, s;
    } finally {
      _e = n, st = i, vo(e), e.flags &= -3;
    }
  }
  function Os(e, t = false) {
    const { dep: n, prevSub: i, nextSub: s } = e;
    if (i && (i.nextSub = s, e.prevSub = void 0), s && (s.prevSub = i, e.nextSub = void 0), n.subs === e && (n.subs = i, !i && n.computed)) {
      n.computed.flags &= -5;
      for (let r = n.computed.deps; r; r = r.nextDep) Os(r, true);
    }
    !t && !--n.sc && n.map && n.map.delete(n.key);
  }
  function Ka(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let st = true;
  const bo = [];
  function Et() {
    bo.push(st), st = false;
  }
  function Pt() {
    const e = bo.pop();
    st = e === void 0 ? true : e;
  }
  function nr(e) {
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
      if (!_e || !st || _e === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== _e) n = this.activeLink = new Xa(_e, this), _e.deps ? (n.prevDep = _e.depsTail, _e.depsTail.nextDep = n, _e.depsTail = n) : _e.deps = _e.depsTail = n, _o(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const i = n.nextDep;
        i.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = i), n.prevDep = _e.depsTail, n.nextDep = void 0, _e.depsTail.nextDep = n, _e.depsTail = n, _e.deps === n && (_e.deps = i);
      }
      return n;
    }
    trigger(t) {
      this.version++, Gn++, this.notify(t);
    }
    notify(t) {
      Bs();
      try {
        for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
      } finally {
        Is();
      }
    }
  }
  function _o(e) {
    if (e.dep.sc++, e.sub.flags & 4) {
      const t = e.dep.computed;
      if (t && !e.dep.subs) {
        t.flags |= 20;
        for (let i = t.deps; i; i = i.nextDep) _o(i);
      }
      const n = e.dep.subs;
      n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
    }
  }
  const ds = /* @__PURE__ */ new WeakMap(), en = /* @__PURE__ */ Symbol(""), ps = /* @__PURE__ */ Symbol(""), Vn = /* @__PURE__ */ Symbol("");
  function Ne(e, t, n) {
    if (st && _e) {
      let i = ds.get(e);
      i || ds.set(e, i = /* @__PURE__ */ new Map());
      let s = i.get(n);
      s || (i.set(n, s = new Oi()), s.map = i, s.key = n), s.track();
    }
  }
  function wt(e, t, n, i, s, r) {
    const o = ds.get(e);
    if (!o) {
      Gn++;
      return;
    }
    const a = (l) => {
      l && l.trigger();
    };
    if (Bs(), t === "clear") o.forEach(a);
    else {
      const l = K(e), h = l && Rs(n);
      if (l && n === "length") {
        const u = Number(i);
        o.forEach((f, v) => {
          (v === "length" || v === Vn || !gt(v) && v >= u) && a(f);
        });
      } else switch ((n !== void 0 || o.has(void 0)) && a(o.get(n)), h && a(o.get(Vn)), t) {
        case "add":
          l ? h && a(o.get("length")) : (a(o.get(en)), gn(e) && a(o.get(ps)));
          break;
        case "delete":
          l || (a(o.get(en)), gn(e) && a(o.get(ps)));
          break;
        case "set":
          gn(e) && a(o.get(en));
          break;
      }
    }
    Is();
  }
  function ln(e) {
    const t = oe(e);
    return t === e ? t : (Ne(t, "iterate", Vn), et(e) ? t : t.map(rt));
  }
  function Ni(e) {
    return Ne(e = oe(e), "iterate", Vn), e;
  }
  function Nt(e, t) {
    return Lt(e) ? wn(tn(e) ? rt(t) : t) : rt(t);
  }
  const Za = {
    __proto__: null,
    [Symbol.iterator]() {
      return Xi(this, Symbol.iterator, (e) => Nt(this, e));
    },
    concat(...e) {
      return ln(this).concat(...e.map((t) => K(t) ? ln(t) : t));
    },
    entries() {
      return Xi(this, "entries", (e) => (e[1] = Nt(this, e[1]), e));
    },
    every(e, t) {
      return bt(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return bt(this, "filter", e, t, (n) => n.map((i) => Nt(this, i)), arguments);
    },
    find(e, t) {
      return bt(this, "find", e, t, (n) => Nt(this, n), arguments);
    },
    findIndex(e, t) {
      return bt(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return bt(this, "findLast", e, t, (n) => Nt(this, n), arguments);
    },
    findLastIndex(e, t) {
      return bt(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return bt(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return Zi(this, "includes", e);
    },
    indexOf(...e) {
      return Zi(this, "indexOf", e);
    },
    join(e) {
      return ln(this).join(e);
    },
    lastIndexOf(...e) {
      return Zi(this, "lastIndexOf", e);
    },
    map(e, t) {
      return bt(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return Ln(this, "pop");
    },
    push(...e) {
      return Ln(this, "push", e);
    },
    reduce(e, ...t) {
      return ir(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return ir(this, "reduceRight", e, t);
    },
    shift() {
      return Ln(this, "shift");
    },
    some(e, t) {
      return bt(this, "some", e, t, void 0, arguments);
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
      return Xi(this, "values", (e) => Nt(this, e));
    }
  };
  function Xi(e, t, n) {
    const i = Ni(e), s = i[t]();
    return i !== e && !et(e) && (s._next = s.next, s.next = () => {
      const r = s._next();
      return r.done || (r.value = n(r.value)), r;
    }), s;
  }
  const Ja = Array.prototype;
  function bt(e, t, n, i, s, r) {
    const o = Ni(e), a = o !== e && !et(e), l = o[t];
    if (l !== Ja[t]) {
      const f = l.apply(e, r);
      return a ? rt(f) : f;
    }
    let h = n;
    o !== e && (a ? h = function(f, v) {
      return n.call(this, Nt(e, f), v, e);
    } : n.length > 2 && (h = function(f, v) {
      return n.call(this, f, v, e);
    }));
    const u = l.call(o, h, i);
    return a && s ? s(u) : u;
  }
  function ir(e, t, n, i) {
    const s = Ni(e);
    let r = n;
    return s !== e && (et(e) ? n.length > 3 && (r = function(o, a, l) {
      return n.call(this, o, a, l, e);
    }) : r = function(o, a, l) {
      return n.call(this, o, Nt(e, a), l, e);
    }), s[t](r, ...i);
  }
  function Zi(e, t, n) {
    const i = oe(e);
    Ne(i, "iterate", Vn);
    const s = i[t](...n);
    return (s === -1 || s === false) && Fs(n[0]) ? (n[0] = oe(n[0]), i[t](...n)) : s;
  }
  function Ln(e, t, n = []) {
    Et(), Bs();
    const i = oe(e)[t].apply(e, n);
    return Is(), Pt(), i;
  }
  const Qa = Ps("__proto__,__v_isRef,__isVue"), xo = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(gt));
  function el(e) {
    gt(e) || (e = String(e));
    const t = oe(this);
    return Ne(t, "has", e), t.hasOwnProperty(e);
  }
  class yo {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, i) {
      if (n === "__v_skip") return t.__v_skip;
      const s = this._isReadonly, r = this._isShallow;
      if (n === "__v_isReactive") return !s;
      if (n === "__v_isReadonly") return s;
      if (n === "__v_isShallow") return r;
      if (n === "__v_raw") return i === (s ? r ? cl : Mo : r ? To : So).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(i) ? t : void 0;
      const o = K(t);
      if (!s) {
        let l;
        if (o && (l = Za[n])) return l;
        if (n === "hasOwnProperty") return el;
      }
      const a = Reflect.get(t, n, Fe(t) ? t : i);
      if ((gt(n) ? xo.has(n) : Qa(n)) || (s || Ne(t, "get", n), r)) return a;
      if (Fe(a)) {
        const l = o && Rs(n) ? a : a.value;
        return s && he(l) ? gs(l) : l;
      }
      return he(a) ? s ? gs(a) : vn(a) : a;
    }
  }
  class wo extends yo {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, i, s) {
      let r = t[n];
      const o = K(t) && Rs(n);
      if (!this._isShallow) {
        const h = Lt(r);
        if (!et(i) && !Lt(i) && (r = oe(r), i = oe(i)), !o && Fe(r) && !Fe(i)) return h || (r.value = i), true;
      }
      const a = o ? Number(n) < t.length : pe(t, n), l = Reflect.set(t, n, i, Fe(t) ? t : s);
      return t === oe(s) && (a ? qe(i, r) && wt(t, "set", n, i) : wt(t, "add", n, i)), l;
    }
    deleteProperty(t, n) {
      const i = pe(t, n);
      t[n];
      const s = Reflect.deleteProperty(t, n);
      return s && i && wt(t, "delete", n, void 0), s;
    }
    has(t, n) {
      const i = Reflect.has(t, n);
      return (!gt(n) || !xo.has(n)) && Ne(t, "has", n), i;
    }
    ownKeys(t) {
      return Ne(t, "iterate", K(t) ? "length" : en), Reflect.ownKeys(t);
    }
  }
  class tl extends yo {
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
  const nl = new wo(), il = new tl(), sl = new wo(true);
  const hs = (e) => e, ii = (e) => Reflect.getPrototypeOf(e);
  function rl(e, t, n) {
    return function(...i) {
      const s = this.__v_raw, r = oe(s), o = gn(r), a = e === "entries" || e === Symbol.iterator && o, l = e === "keys" && o, h = s[e](...i), u = n ? hs : t ? wn : rt;
      return !t && Ne(r, "iterate", l ? ps : en), Ee(Object.create(h), {
        next() {
          const { value: f, done: v } = h.next();
          return v ? {
            value: f,
            done: v
          } : {
            value: a ? [
              u(f[0]),
              u(f[1])
            ] : u(f),
            done: v
          };
        }
      });
    };
  }
  function si(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function ol(e, t) {
    const n = {
      get(s) {
        const r = this.__v_raw, o = oe(r), a = oe(s);
        e || (qe(s, a) && Ne(o, "get", s), Ne(o, "get", a));
        const { has: l } = ii(o), h = t ? hs : e ? wn : rt;
        if (l.call(o, s)) return h(r.get(s));
        if (l.call(o, a)) return h(r.get(a));
        r !== o && r.get(s);
      },
      get size() {
        const s = this.__v_raw;
        return !e && Ne(oe(s), "iterate", en), s.size;
      },
      has(s) {
        const r = this.__v_raw, o = oe(r), a = oe(s);
        return e || (qe(s, a) && Ne(o, "has", s), Ne(o, "has", a)), s === a ? r.has(s) : r.has(s) || r.has(a);
      },
      forEach(s, r) {
        const o = this, a = o.__v_raw, l = oe(a), h = t ? hs : e ? wn : rt;
        return !e && Ne(l, "iterate", en), a.forEach((u, f) => s.call(r, h(u), h(f), o));
      }
    };
    return Ee(n, e ? {
      add: si("add"),
      set: si("set"),
      delete: si("delete"),
      clear: si("clear")
    } : {
      add(s) {
        !t && !et(s) && !Lt(s) && (s = oe(s));
        const r = oe(this);
        return ii(r).has.call(r, s) || (r.add(s), wt(r, "add", s, s)), this;
      },
      set(s, r) {
        !t && !et(r) && !Lt(r) && (r = oe(r));
        const o = oe(this), { has: a, get: l } = ii(o);
        let h = a.call(o, s);
        h || (s = oe(s), h = a.call(o, s));
        const u = l.call(o, s);
        return o.set(s, r), h ? qe(r, u) && wt(o, "set", s, r) : wt(o, "add", s, r), this;
      },
      delete(s) {
        const r = oe(this), { has: o, get: a } = ii(r);
        let l = o.call(r, s);
        l || (s = oe(s), l = o.call(r, s)), a && a.call(r, s);
        const h = r.delete(s);
        return l && wt(r, "delete", s, void 0), h;
      },
      clear() {
        const s = oe(this), r = s.size !== 0, o = s.clear();
        return r && wt(s, "clear", void 0, void 0), o;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((s) => {
      n[s] = rl(s, e, t);
    }), n;
  }
  function Ns(e, t) {
    const n = ol(e, t);
    return (i, s, r) => s === "__v_isReactive" ? !e : s === "__v_isReadonly" ? e : s === "__v_raw" ? i : Reflect.get(pe(n, s) && s in i ? n : i, s, r);
  }
  const al = {
    get: Ns(false, false)
  }, ll = {
    get: Ns(false, true)
  }, ul = {
    get: Ns(true, false)
  };
  const So = /* @__PURE__ */ new WeakMap(), To = /* @__PURE__ */ new WeakMap(), Mo = /* @__PURE__ */ new WeakMap(), cl = /* @__PURE__ */ new WeakMap();
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
    return Lt(e) ? e : Us(e, false, nl, al, So);
  }
  function pl(e) {
    return Us(e, false, sl, ll, To);
  }
  function gs(e) {
    return Us(e, true, il, ul, Mo);
  }
  function Us(e, t, n, i, s) {
    if (!he(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const r = dl(e);
    if (r === 0) return e;
    const o = s.get(e);
    if (o) return o;
    const a = new Proxy(e, r === 2 ? i : n);
    return s.set(e, a), a;
  }
  function tn(e) {
    return Lt(e) ? tn(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function Lt(e) {
    return !!(e && e.__v_isReadonly);
  }
  function et(e) {
    return !!(e && e.__v_isShallow);
  }
  function Fs(e) {
    return e ? !!e.__v_raw : false;
  }
  function oe(e) {
    const t = e && e.__v_raw;
    return t ? oe(t) : e;
  }
  function hl(e) {
    return !pe(e, "__v_skip") && Object.isExtensible(e) && ao(e, "__v_skip", true), e;
  }
  const rt = (e) => he(e) ? vn(e) : e, wn = (e) => he(e) ? gs(e) : e;
  function Fe(e) {
    return e ? e.__v_isRef === true : false;
  }
  function ee(e) {
    return gl(e, false);
  }
  function gl(e, t) {
    return Fe(e) ? e : new vl(e, t);
  }
  class vl {
    constructor(t, n) {
      this.dep = new Oi(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : oe(t), this._value = n ? t : rt(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, i = this.__v_isShallow || et(t) || Lt(t);
      t = i ? t : oe(t), qe(t, n) && (this._rawValue = t, this._value = i ? t : rt(t), this.dep.trigger());
    }
  }
  function ml(e) {
    return Fe(e) ? e.value : e;
  }
  const bl = {
    get: (e, t, n) => t === "__v_raw" ? e : ml(Reflect.get(e, t, n)),
    set: (e, t, n, i) => {
      const s = e[t];
      return Fe(s) && !Fe(n) ? (s.value = n, true) : Reflect.set(e, t, n, i);
    }
  };
  function Co(e) {
    return tn(e) ? e : new Proxy(e, bl);
  }
  class _l {
    constructor(t) {
      this.__v_isRef = true, this._value = void 0;
      const n = this.dep = new Oi(), { get: i, set: s } = t(n.track.bind(n), n.trigger.bind(n));
      this._get = i, this._set = s;
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
      if (this.flags |= 16, !(this.flags & 8) && _e !== this) return ho(this, true), true;
    }
    get value() {
      const t = this.dep.track();
      return mo(this), t && (t.version = this.dep.version), this._value;
    }
    set value(t) {
      this.setter && this.setter(t);
    }
  }
  function wl(e, t, n = false) {
    let i, s;
    return te(e) ? i = e : (i = e.get, s = e.set), new yl(i, s, n);
  }
  const ri = {}, xi = /* @__PURE__ */ new WeakMap();
  let Zt;
  function Sl(e, t = false, n = Zt) {
    if (n) {
      let i = xi.get(n);
      i || xi.set(n, i = []), i.push(e);
    }
  }
  function Tl(e, t, n = de) {
    const { immediate: i, deep: s, once: r, scheduler: o, augmentJob: a, call: l } = n, h = (O) => s ? O : et(O) || s === false || s === 0 ? St(O, 1) : St(O);
    let u, f, v, b, _ = false, x = false;
    if (Fe(e) ? (f = () => e.value, _ = et(e)) : tn(e) ? (f = () => h(e), _ = true) : K(e) ? (x = true, _ = e.some((O) => tn(O) || et(O)), f = () => e.map((O) => {
      if (Fe(O)) return O.value;
      if (tn(O)) return h(O);
      if (te(O)) return l ? l(O, 2) : O();
    })) : te(e) ? t ? f = l ? () => l(e, 2) : e : f = () => {
      if (v) {
        Et();
        try {
          v();
        } finally {
          Pt();
        }
      }
      const O = Zt;
      Zt = u;
      try {
        return l ? l(e, 3, [
          b
        ]) : e(b);
      } finally {
        Zt = O;
      }
    } : f = dt, t && s) {
      const O = f, U = s === true ? 1 / 0 : s;
      f = () => St(O(), U);
    }
    const F = Ya(), V = () => {
      u.stop(), F && F.active && ks(F.effects, u);
    };
    if (r && t) {
      const O = t;
      t = (...U) => {
        O(...U), V();
      };
    }
    let R = x ? new Array(e.length).fill(ri) : ri;
    const E = (O) => {
      if (!(!(u.flags & 1) || !u.dirty && !O)) if (t) {
        const U = u.run();
        if (s || _ || (x ? U.some((j, se) => qe(j, R[se])) : qe(U, R))) {
          v && v();
          const j = Zt;
          Zt = u;
          try {
            const se = [
              U,
              R === ri ? void 0 : x && R[0] === ri ? [] : R,
              b
            ];
            R = U, l ? l(t, 3, se) : t(...se);
          } finally {
            Zt = j;
          }
        }
      } else u.run();
    };
    return a && a(E), u = new fo(f), u.scheduler = o ? () => o(E, false) : E, b = (O) => Sl(O, false, u), v = u.onStop = () => {
      const O = xi.get(u);
      if (O) {
        if (l) l(O, 4);
        else for (const U of O) U();
        xi.delete(u);
      }
    }, t ? i ? E(true) : R = u.run() : o ? o(E.bind(null, true), true) : u.run(), V.pause = u.pause.bind(u), V.resume = u.resume.bind(u), V.stop = V, V;
  }
  function St(e, t = 1 / 0, n) {
    if (t <= 0 || !he(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
    if (n.set(e, t), t--, Fe(e)) St(e.value, t, n);
    else if (K(e)) for (let i = 0; i < e.length; i++) St(e[i], t, n);
    else if (no(e) || gn(e)) e.forEach((i) => {
      St(i, t, n);
    });
    else if (ro(e)) {
      for (const i in e) St(e[i], t, n);
      for (const i of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, i) && St(e[i], t, n);
    }
    return e;
  }
  function ei(e, t, n, i) {
    try {
      return i ? e(...i) : e();
    } catch (s) {
      Ui(s, t, n);
    }
  }
  function ot(e, t, n, i) {
    if (te(e)) {
      const s = ei(e, t, n, i);
      return s && io(s) && s.catch((r) => {
        Ui(r, t, n);
      }), s;
    }
    if (K(e)) {
      const s = [];
      for (let r = 0; r < e.length; r++) s.push(ot(e[r], t, n, i));
      return s;
    }
  }
  function Ui(e, t, n, i = true) {
    const s = t ? t.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: o } = t && t.appContext.config || de;
    if (t) {
      let a = t.parent;
      const l = t.proxy, h = `https://vuejs.org/error-reference/#runtime-${n}`;
      for (; a; ) {
        const u = a.ec;
        if (u) {
          for (let f = 0; f < u.length; f++) if (u[f](e, l, h) === false) return;
        }
        a = a.parent;
      }
      if (r) {
        Et(), ei(r, null, 10, [
          e,
          l,
          h
        ]), Pt();
        return;
      }
    }
    Ml(e, n, s, i, o);
  }
  function Ml(e, t, n, i = true, s = false) {
    if (s) throw e;
    console.error(e);
  }
  const Ge = [];
  let lt = -1;
  const mn = [];
  let Ut = null, dn = 0;
  const Eo = Promise.resolve();
  let yi = null;
  function Fi(e) {
    const t = yi || Eo;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function Cl(e) {
    let t = lt + 1, n = Ge.length;
    for (; t < n; ) {
      const i = t + n >>> 1, s = Ge[i], r = Hn(s);
      r < e || r === e && s.flags & 2 ? t = i + 1 : n = i;
    }
    return t;
  }
  function Ds(e) {
    if (!(e.flags & 1)) {
      const t = Hn(e), n = Ge[Ge.length - 1];
      !n || !(e.flags & 2) && t >= Hn(n) ? Ge.push(e) : Ge.splice(Cl(t), 0, e), e.flags |= 1, Po();
    }
  }
  function Po() {
    yi || (yi = Eo.then(ko));
  }
  function El(e) {
    K(e) ? mn.push(...e) : Ut && e.id === -1 ? Ut.splice(dn + 1, 0, e) : e.flags & 1 || (mn.push(e), e.flags |= 1), Po();
  }
  function sr(e, t, n = lt + 1) {
    for (; n < Ge.length; n++) {
      const i = Ge[n];
      if (i && i.flags & 2) {
        if (e && i.id !== e.uid) continue;
        Ge.splice(n, 1), n--, i.flags & 4 && (i.flags &= -2), i(), i.flags & 4 || (i.flags &= -2);
      }
    }
  }
  function Lo(e) {
    if (mn.length) {
      const t = [
        ...new Set(mn)
      ].sort((n, i) => Hn(n) - Hn(i));
      if (mn.length = 0, Ut) {
        Ut.push(...t);
        return;
      }
      for (Ut = t, dn = 0; dn < Ut.length; dn++) {
        const n = Ut[dn];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      Ut = null, dn = 0;
    }
  }
  const Hn = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function ko(e) {
    try {
      for (lt = 0; lt < Ge.length; lt++) {
        const t = Ge[lt];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), ei(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; lt < Ge.length; lt++) {
        const t = Ge[lt];
        t && (t.flags &= -2);
      }
      lt = -1, Ge.length = 0, Lo(), yi = null, (Ge.length || mn.length) && ko();
    }
  }
  let Qe = null, Ro = null;
  function wi(e) {
    const t = Qe;
    return Qe = e, Ro = e && e.type.__scopeId || null, t;
  }
  function Ao(e, t = Qe, n) {
    if (!t || e._n) return e;
    const i = (...s) => {
      i._d && Ci(-1);
      const r = wi(t);
      let o;
      try {
        o = e(...s);
      } finally {
        wi(r), i._d && Ci(1);
      }
      return o;
    };
    return i._n = true, i._c = true, i._d = true, i;
  }
  function $e(e, t) {
    if (Qe === null) return e;
    const n = Hi(Qe), i = e.dirs || (e.dirs = []);
    for (let s = 0; s < t.length; s++) {
      let [r, o, a, l = de] = t[s];
      r && (te(r) && (r = {
        mounted: r,
        updated: r
      }), r.deep && St(o), i.push({
        dir: r,
        instance: n,
        value: o,
        oldValue: void 0,
        arg: a,
        modifiers: l
      }));
    }
    return e;
  }
  function qt(e, t, n, i) {
    const s = e.dirs, r = t && t.dirs;
    for (let o = 0; o < s.length; o++) {
      const a = s[o];
      r && (a.oldValue = r[o].value);
      let l = a.dir[i];
      l && (Et(), ot(l, n, 8, [
        e.el,
        a,
        e,
        t
      ]), Pt());
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
    const i = js();
    if (i || _n) {
      let s = _n ? _n._context.provides : i ? i.parent == null || i.ce ? i.vnode.appContext && i.vnode.appContext.provides : i.parent.provides : void 0;
      if (s && e in s) return s[e];
      if (arguments.length > 1) return n && te(t) ? t.call(i && i.proxy) : t;
    }
  }
  const Ll = /* @__PURE__ */ Symbol.for("v-scx"), kl = () => hi(Ll);
  function Rl(e, t) {
    return $s(e, null, {
      flush: "sync"
    });
  }
  function Mt(e, t, n) {
    return $s(e, t, n);
  }
  function $s(e, t, n = de) {
    const { immediate: i, deep: s, flush: r, once: o } = n, a = Ee({}, n), l = t && i || !t && r !== "post";
    let h;
    if (qn) {
      if (r === "sync") {
        const b = kl();
        h = b.__watcherHandles || (b.__watcherHandles = []);
      } else if (!l) {
        const b = () => {
        };
        return b.stop = dt, b.resume = dt, b.pause = dt, b;
      }
    }
    const u = He;
    a.call = (b, _, x) => ot(b, u, _, x);
    let f = false;
    r === "post" ? a.scheduler = (b) => {
      We(b, u && u.suspense);
    } : r !== "sync" && (f = true, a.scheduler = (b, _) => {
      _ ? b() : Ds(b);
    }), a.augmentJob = (b) => {
      t && (b.flags |= 4), f && (b.flags |= 2, u && (b.id = u.uid, b.i = u));
    };
    const v = Tl(e, t, a);
    return qn && (h ? h.push(v) : l && v()), v;
  }
  function Al(e, t, n) {
    const i = this.proxy, s = Me(e) ? e.includes(".") ? zo(i, e) : () => i[e] : e.bind(i, i);
    let r;
    te(t) ? r = t : (r = t.handler, n = t);
    const o = ti(this), a = $s(s, r.bind(i), n);
    return o(), a;
  }
  function zo(e, t) {
    const n = t.split(".");
    return () => {
      let i = e;
      for (let s = 0; s < n.length && i; s++) i = i[n[s]];
      return i;
    };
  }
  const zl = /* @__PURE__ */ Symbol("_vte"), Bo = (e) => e.__isTeleport, ut = /* @__PURE__ */ Symbol("_leaveCb"), kn = /* @__PURE__ */ Symbol("_enterCb");
  function Bl() {
    const e = {
      isMounted: false,
      isLeaving: false,
      isUnmounting: false,
      leavingVNodes: /* @__PURE__ */ new Map()
    };
    return At(() => {
      e.isMounted = true;
    }), Go(() => {
      e.isUnmounting = true;
    }), e;
  }
  const Ze = [
    Function,
    Array
  ], Io = {
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
  }, Oo = (e) => {
    const t = e.subTree;
    return t.component ? Oo(t.component) : t;
  }, Il = {
    name: "BaseTransition",
    props: Io,
    setup(e, { slots: t }) {
      const n = js(), i = Bl();
      return () => {
        const s = t.default && Fo(t.default(), true);
        if (!s || !s.length) return;
        const r = No(s), o = oe(e), { mode: a } = o;
        if (i.isLeaving) return Ji(r);
        const l = rr(r);
        if (!l) return Ji(r);
        let h = vs(l, o, i, n, (f) => h = f);
        l.type !== Ve && Wn(l, h);
        let u = n.subTree && rr(n.subTree);
        if (u && u.type !== Ve && !Jt(u, l) && Oo(n).type !== Ve) {
          let f = vs(u, o, i, n);
          if (Wn(u, f), a === "out-in" && l.type !== Ve) return i.isLeaving = true, f.afterLeave = () => {
            i.isLeaving = false, n.job.flags & 8 || n.update(), delete f.afterLeave, u = void 0;
          }, Ji(r);
          a === "in-out" && l.type !== Ve ? f.delayLeave = (v, b, _) => {
            const x = Uo(i, u);
            x[String(u.key)] = u, v[ut] = () => {
              b(), v[ut] = void 0, delete h.delayedLeave, u = void 0;
            }, h.delayedLeave = () => {
              _(), delete h.delayedLeave, u = void 0;
            };
          } : u = void 0;
        } else u && (u = void 0);
        return r;
      };
    }
  };
  function No(e) {
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
  function Uo(e, t) {
    const { leavingVNodes: n } = e;
    let i = n.get(t.type);
    return i || (i = /* @__PURE__ */ Object.create(null), n.set(t.type, i)), i;
  }
  function vs(e, t, n, i, s) {
    const { appear: r, mode: o, persisted: a = false, onBeforeEnter: l, onEnter: h, onAfterEnter: u, onEnterCancelled: f, onBeforeLeave: v, onLeave: b, onAfterLeave: _, onLeaveCancelled: x, onBeforeAppear: F, onAppear: V, onAfterAppear: R, onAppearCancelled: E } = t, O = String(e.key), U = Uo(n, e), j = (q, H) => {
      q && ot(q, i, 9, H);
    }, se = (q, H) => {
      const Z = H[1];
      j(q, H), K(q) ? q.every((w) => w.length <= 1) && Z() : q.length <= 1 && Z();
    }, ue = {
      mode: o,
      persisted: a,
      beforeEnter(q) {
        let H = l;
        if (!n.isMounted) if (r) H = F || l;
        else return;
        q[ut] && q[ut](true);
        const Z = U[O];
        Z && Jt(e, Z) && Z.el[ut] && Z.el[ut](), j(H, [
          q
        ]);
      },
      enter(q) {
        let H = h, Z = u, w = f;
        if (!n.isMounted) if (r) H = V || h, Z = R || u, w = E || f;
        else return;
        let k = false;
        q[kn] = (B) => {
          k || (k = true, B ? j(w, [
            q
          ]) : j(Z, [
            q
          ]), ue.delayedLeave && ue.delayedLeave(), q[kn] = void 0);
        };
        const M = q[kn].bind(null, false);
        H ? se(H, [
          q,
          M
        ]) : M();
      },
      leave(q, H) {
        const Z = String(e.key);
        if (q[kn] && q[kn](true), n.isUnmounting) return H();
        j(v, [
          q
        ]);
        let w = false;
        q[ut] = (M) => {
          w || (w = true, H(), M ? j(x, [
            q
          ]) : j(_, [
            q
          ]), q[ut] = void 0, U[Z] === e && delete U[Z]);
        };
        const k = q[ut].bind(null, false);
        U[Z] = e, b ? se(b, [
          q,
          k
        ]) : k();
      },
      clone(q) {
        const H = vs(q, t, n, i, s);
        return s && s(H), H;
      }
    };
    return ue;
  }
  function Ji(e) {
    if (Di(e)) return e = $t(e), e.children = null, e;
  }
  function rr(e) {
    if (!Di(e)) return Bo(e.type) && e.children ? No(e.children) : e;
    if (e.component) return e.component.subTree;
    const { shapeFlag: t, children: n } = e;
    if (n) {
      if (t & 16) return n[0];
      if (t & 32 && te(n.default)) return n.default();
    }
  }
  function Wn(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, Wn(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function Fo(e, t = false, n) {
    let i = [], s = 0;
    for (let r = 0; r < e.length; r++) {
      let o = e[r];
      const a = n == null ? o.key : String(n) + String(o.key != null ? o.key : r);
      o.type === ze ? (o.patchFlag & 128 && s++, i = i.concat(Fo(o.children, t, a))) : (t || o.type !== Ve) && i.push(a != null ? $t(o, {
        key: a
      }) : o);
    }
    if (s > 1) for (let r = 0; r < i.length; r++) i[r].patchFlag = -2;
    return i;
  }
  function kt(e, t) {
    return te(e) ? Ee({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function Do(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function or(e, t) {
    let n;
    return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
  }
  const Si = /* @__PURE__ */ new WeakMap();
  function Nn(e, t, n, i, s = false) {
    if (K(e)) {
      e.forEach((x, F) => Nn(x, t && (K(t) ? t[F] : t), n, i, s));
      return;
    }
    if (Un(i) && !s) {
      i.shapeFlag & 512 && i.type.__asyncResolved && i.component.subTree.component && Nn(e, t, n, i.component.subTree);
      return;
    }
    const r = i.shapeFlag & 4 ? Hi(i.component) : i.el, o = s ? null : r, { i: a, r: l } = e, h = t && t.r, u = a.refs === de ? a.refs = {} : a.refs, f = a.setupState, v = oe(f), b = f === de ? to : (x) => or(u, x) ? false : pe(v, x), _ = (x, F) => !(F && or(u, F));
    if (h != null && h !== l) {
      if (ar(t), Me(h)) u[h] = null, b(h) && (f[h] = null);
      else if (Fe(h)) {
        const x = t;
        _(h, x.k) && (h.value = null), x.k && (u[x.k] = null);
      }
    }
    if (te(l)) ei(l, a, 12, [
      o,
      u
    ]);
    else {
      const x = Me(l), F = Fe(l);
      if (x || F) {
        const V = () => {
          if (e.f) {
            const R = x ? b(l) ? f[l] : u[l] : _() || !e.k ? l.value : u[e.k];
            if (s) K(R) && ks(R, r);
            else if (K(R)) R.includes(r) || R.push(r);
            else if (x) u[l] = [
              r
            ], b(l) && (f[l] = u[l]);
            else {
              const E = [
                r
              ];
              _(l, e.k) && (l.value = E), e.k && (u[e.k] = E);
            }
          } else x ? (u[l] = o, b(l) && (f[l] = o)) : F && (_(l, e.k) && (l.value = o), e.k && (u[e.k] = o));
        };
        if (o) {
          const R = () => {
            V(), Si.delete(e);
          };
          R.id = -1, Si.set(e, R), We(R, n);
        } else ar(e), V();
      }
    }
  }
  function ar(e) {
    const t = Si.get(e);
    t && (t.flags |= 8, Si.delete(e));
  }
  Ii().requestIdleCallback;
  Ii().cancelIdleCallback;
  const Un = (e) => !!e.type.__asyncLoader, Di = (e) => e.type.__isKeepAlive;
  function Nl(e, t) {
    $o(e, "a", t);
  }
  function Ul(e, t) {
    $o(e, "da", t);
  }
  function $o(e, t, n = He) {
    const i = e.__wdc || (e.__wdc = () => {
      let s = n;
      for (; s; ) {
        if (s.isDeactivated) return;
        s = s.parent;
      }
      return e();
    });
    if ($i(t, i, n), n) {
      let s = n.parent;
      for (; s && s.parent; ) Di(s.parent.vnode) && Fl(i, t, n, s), s = s.parent;
    }
  }
  function Fl(e, t, n, i) {
    const s = $i(t, e, i, true);
    Mn(() => {
      ks(i[t], s);
    }, n);
  }
  function $i(e, t, n = He, i = false) {
    if (n) {
      const s = n[e] || (n[e] = []), r = t.__weh || (t.__weh = (...o) => {
        Et();
        const a = ti(n), l = ot(t, n, e, o);
        return a(), Pt(), l;
      });
      return i ? s.unshift(r) : s.push(r), r;
    }
  }
  const Rt = (e) => (t, n = He) => {
    (!qn || e === "sp") && $i(e, (...i) => t(...i), n);
  }, Dl = Rt("bm"), At = Rt("m"), $l = Rt("bu"), Gl = Rt("u"), Go = Rt("bum"), Mn = Rt("um"), Vl = Rt("sp"), Hl = Rt("rtg"), Wl = Rt("rtc");
  function jl(e, t = He) {
    $i("ec", e, t);
  }
  const ql = /* @__PURE__ */ Symbol.for("v-ndc");
  function bn(e, t, n, i) {
    let s;
    const r = n, o = K(e);
    if (o || Me(e)) {
      const a = o && tn(e);
      let l = false, h = false;
      a && (l = !et(e), h = Lt(e), e = Ni(e)), s = new Array(e.length);
      for (let u = 0, f = e.length; u < f; u++) s[u] = t(l ? h ? wn(rt(e[u])) : rt(e[u]) : e[u], u, void 0, r);
    } else if (typeof e == "number") {
      s = new Array(e);
      for (let a = 0; a < e; a++) s[a] = t(a + 1, a, void 0, r);
    } else if (he(e)) if (e[Symbol.iterator]) s = Array.from(e, (a, l) => t(a, l, void 0, r));
    else {
      const a = Object.keys(e);
      s = new Array(a.length);
      for (let l = 0, h = a.length; l < h; l++) {
        const u = a[l];
        s[l] = t(e[u], u, l, r);
      }
    }
    else s = [];
    return s;
  }
  const ms = (e) => e ? fa(e) ? Hi(e) : ms(e.parent) : null, Fn = Ee(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => ms(e.parent),
    $root: (e) => ms(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Ho(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Ds(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Fi.bind(e.proxy)),
    $watch: (e) => Al.bind(e)
  }), Qi = (e, t) => e !== de && !e.__isScriptSetup && pe(e, t), Yl = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: i, data: s, props: r, accessCache: o, type: a, appContext: l } = e;
      if (t[0] !== "$") {
        const v = o[t];
        if (v !== void 0) switch (v) {
          case 1:
            return i[t];
          case 2:
            return s[t];
          case 4:
            return n[t];
          case 3:
            return r[t];
        }
        else {
          if (Qi(i, t)) return o[t] = 1, i[t];
          if (s !== de && pe(s, t)) return o[t] = 2, s[t];
          if (pe(r, t)) return o[t] = 3, r[t];
          if (n !== de && pe(n, t)) return o[t] = 4, n[t];
          bs && (o[t] = 0);
        }
      }
      const h = Fn[t];
      let u, f;
      if (h) return t === "$attrs" && Ne(e.attrs, "get", ""), h(e);
      if ((u = a.__cssModules) && (u = u[t])) return u;
      if (n !== de && pe(n, t)) return o[t] = 4, n[t];
      if (f = l.config.globalProperties, pe(f, t)) return f[t];
    },
    set({ _: e }, t, n) {
      const { data: i, setupState: s, ctx: r } = e;
      return Qi(s, t) ? (s[t] = n, true) : i !== de && pe(i, t) ? (i[t] = n, true) : pe(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (r[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: i, appContext: s, props: r, type: o } }, a) {
      let l;
      return !!(n[a] || e !== de && a[0] !== "$" && pe(e, a) || Qi(t, a) || pe(r, a) || pe(i, a) || pe(Fn, a) || pe(s.config.globalProperties, a) || (l = o.__cssModules) && l[a]);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : pe(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function Ti(e) {
    return K(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  function Gs(e, t) {
    return !e || !t ? e || t : K(e) && K(t) ? e.concat(t) : Ee({}, Ti(e), Ti(t));
  }
  let bs = true;
  function Kl(e) {
    const t = Ho(e), n = e.proxy, i = e.ctx;
    bs = false, t.beforeCreate && lr(t.beforeCreate, e, "bc");
    const { data: s, computed: r, methods: o, watch: a, provide: l, inject: h, created: u, beforeMount: f, mounted: v, beforeUpdate: b, updated: _, activated: x, deactivated: F, beforeDestroy: V, beforeUnmount: R, destroyed: E, unmounted: O, render: U, renderTracked: j, renderTriggered: se, errorCaptured: ue, serverPrefetch: q, expose: H, inheritAttrs: Z, components: w, directives: k, filters: M } = t;
    if (h && Xl(h, i, null), o) for (const $ in o) {
      const X = o[$];
      te(X) && (i[$] = X.bind(n));
    }
    if (s) {
      const $ = s.call(n, n);
      he($) && (e.data = vn($));
    }
    if (bs = true, r) for (const $ in r) {
      const X = r[$], xe = te(X) ? X.bind(n, n) : te(X.get) ? X.get.bind(n, n) : dt, Pe = !te(X) && te(X.set) ? X.set.bind(n) : dt, Le = Ae({
        get: xe,
        set: Pe
      });
      Object.defineProperty(i, $, {
        enumerable: true,
        configurable: true,
        get: () => Le.value,
        set: (Re) => Le.value = Re
      });
    }
    if (a) for (const $ in a) Vo(a[$], i, n, $);
    if (l) {
      const $ = te(l) ? l.call(n) : l;
      Reflect.ownKeys($).forEach((X) => {
        Pl(X, $[X]);
      });
    }
    u && lr(u, e, "c");
    function D($, X) {
      K(X) ? X.forEach((xe) => $(xe.bind(n))) : X && $(X.bind(n));
    }
    if (D(Dl, f), D(At, v), D($l, b), D(Gl, _), D(Nl, x), D(Ul, F), D(jl, ue), D(Wl, j), D(Hl, se), D(Go, R), D(Mn, O), D(Vl, q), K(H)) if (H.length) {
      const $ = e.exposed || (e.exposed = {});
      H.forEach((X) => {
        Object.defineProperty($, X, {
          get: () => n[X],
          set: (xe) => n[X] = xe,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    U && e.render === dt && (e.render = U), Z != null && (e.inheritAttrs = Z), w && (e.components = w), k && (e.directives = k), q && Do(e);
  }
  function Xl(e, t, n = dt) {
    K(e) && (e = _s(e));
    for (const i in e) {
      const s = e[i];
      let r;
      he(s) ? "default" in s ? r = hi(s.from || i, s.default, true) : r = hi(s.from || i) : r = hi(s), Fe(r) ? Object.defineProperty(t, i, {
        enumerable: true,
        configurable: true,
        get: () => r.value,
        set: (o) => r.value = o
      }) : t[i] = r;
    }
  }
  function lr(e, t, n) {
    ot(K(e) ? e.map((i) => i.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function Vo(e, t, n, i) {
    let s = i.includes(".") ? zo(n, i) : () => n[i];
    if (Me(e)) {
      const r = t[e];
      te(r) && Mt(s, r);
    } else if (te(e)) Mt(s, e.bind(n));
    else if (he(e)) if (K(e)) e.forEach((r) => Vo(r, t, n, i));
    else {
      const r = te(e.handler) ? e.handler.bind(n) : t[e.handler];
      te(r) && Mt(s, r, e);
    }
  }
  function Ho(e) {
    const t = e.type, { mixins: n, extends: i } = t, { mixins: s, optionsCache: r, config: { optionMergeStrategies: o } } = e.appContext, a = r.get(t);
    let l;
    return a ? l = a : !s.length && !n && !i ? l = t : (l = {}, s.length && s.forEach((h) => Mi(l, h, o, true)), Mi(l, t, o)), he(t) && r.set(t, l), l;
  }
  function Mi(e, t, n, i = false) {
    const { mixins: s, extends: r } = t;
    r && Mi(e, r, n, true), s && s.forEach((o) => Mi(e, o, n, true));
    for (const o in t) if (!(i && o === "expose")) {
      const a = Zl[o] || n && n[o];
      e[o] = a ? a(e[o], t[o]) : t[o];
    }
    return e;
  }
  const Zl = {
    data: ur,
    props: cr,
    emits: cr,
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
    provide: ur,
    inject: Jl
  };
  function ur(e, t) {
    return t ? e ? function() {
      return Ee(te(e) ? e.call(this, this) : e, te(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function Jl(e, t) {
    return zn(_s(e), _s(t));
  }
  function _s(e) {
    if (K(e)) {
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
    return e ? Ee(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function cr(e, t) {
    return e ? K(e) && K(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : Ee(/* @__PURE__ */ Object.create(null), Ti(e), Ti(t ?? {})) : t;
  }
  function Ql(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = Ee(/* @__PURE__ */ Object.create(null), e);
    for (const i in t) n[i] = De(e[i], t[i]);
    return n;
  }
  function Wo() {
    return {
      app: null,
      config: {
        isNativeTag: to,
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
    return function(i, s = null) {
      te(i) || (i = Ee({}, i)), s != null && !he(s) && (s = null);
      const r = Wo(), o = /* @__PURE__ */ new WeakSet(), a = [];
      let l = false;
      const h = r.app = {
        _uid: eu++,
        _component: i,
        _props: s,
        _container: null,
        _context: r,
        _instance: null,
        version: Au,
        get config() {
          return r.config;
        },
        set config(u) {
        },
        use(u, ...f) {
          return o.has(u) || (u && te(u.install) ? (o.add(u), u.install(h, ...f)) : te(u) && (o.add(u), u(h, ...f))), h;
        },
        mixin(u) {
          return r.mixins.includes(u) || r.mixins.push(u), h;
        },
        component(u, f) {
          return f ? (r.components[u] = f, h) : r.components[u];
        },
        directive(u, f) {
          return f ? (r.directives[u] = f, h) : r.directives[u];
        },
        mount(u, f, v) {
          if (!l) {
            const b = h._ceVNode || Te(i, s);
            return b.appContext = r, v === true ? v = "svg" : v === false && (v = void 0), e(b, u, v), l = true, h._container = u, u.__vue_app__ = h, Hi(b.component);
          }
        },
        onUnmount(u) {
          a.push(u);
        },
        unmount() {
          l && (ot(a, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
        },
        provide(u, f) {
          return r.provides[u] = f, h;
        },
        runWithContext(u) {
          const f = _n;
          _n = h;
          try {
            return u();
          } finally {
            _n = f;
          }
        }
      };
      return h;
    };
  }
  let _n = null;
  function Tt(e, t, n = de) {
    const i = js(), s = Ct(t), r = Gt(t), o = jo(e, s), a = xl((l, h) => {
      let u, f = de, v;
      return Rl(() => {
        const b = e[s];
        qe(u, b) && (u = b, h());
      }), {
        get() {
          return l(), n.get ? n.get(u) : u;
        },
        set(b) {
          const _ = n.set ? n.set(b) : b;
          if (!qe(_, u) && !(f !== de && qe(b, f))) return;
          const x = i.vnode.props;
          x && (t in x || s in x || r in x) && (`onUpdate:${t}` in x || `onUpdate:${s}` in x || `onUpdate:${r}` in x) || (u = b, h()), i.emit(`update:${t}`, _), qe(b, _) && qe(b, f) && !qe(_, v) && h(), f = b, v = _;
        }
      };
    });
    return a[Symbol.iterator] = () => {
      let l = 0;
      return {
        next() {
          return l < 2 ? {
            value: l++ ? o || de : a,
            done: false
          } : {
            done: true
          };
        }
      };
    }, a;
  }
  const jo = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Ct(t)}Modifiers`] || e[`${Gt(t)}Modifiers`];
  function nu(e, t, ...n) {
    if (e.isUnmounted) return;
    const i = e.vnode.props || de;
    let s = n;
    const r = t.startsWith("update:"), o = r && jo(i, t.slice(7));
    o && (o.trim && (s = n.map((u) => Me(u) ? u.trim() : u)), o.number && (s = n.map(As)));
    let a, l = i[a = qi(t)] || i[a = qi(Ct(t))];
    !l && r && (l = i[a = qi(Gt(t))]), l && ot(l, e, 6, s);
    const h = i[a + "Once"];
    if (h) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[a]) return;
      e.emitted[a] = true, ot(h, e, 6, s);
    }
  }
  const iu = /* @__PURE__ */ new WeakMap();
  function qo(e, t, n = false) {
    const i = n ? iu : t.emitsCache, s = i.get(e);
    if (s !== void 0) return s;
    const r = e.emits;
    let o = {}, a = false;
    if (!te(e)) {
      const l = (h) => {
        const u = qo(h, t, true);
        u && (a = true, Ee(o, u));
      };
      !n && t.mixins.length && t.mixins.forEach(l), e.extends && l(e.extends), e.mixins && e.mixins.forEach(l);
    }
    return !r && !a ? (he(e) && i.set(e, null), null) : (K(r) ? r.forEach((l) => o[l] = null) : Ee(o, r), he(e) && i.set(e, o), o);
  }
  function Gi(e, t) {
    return !e || !zi(t) ? false : (t = t.slice(2).replace(/Once$/, ""), pe(e, t[0].toLowerCase() + t.slice(1)) || pe(e, Gt(t)) || pe(e, t));
  }
  function fr(e) {
    const { type: t, vnode: n, proxy: i, withProxy: s, propsOptions: [r], slots: o, attrs: a, emit: l, render: h, renderCache: u, props: f, data: v, setupState: b, ctx: _, inheritAttrs: x } = e, F = wi(e);
    let V, R;
    try {
      if (n.shapeFlag & 4) {
        const O = s || i, U = O;
        V = ct(h.call(U, O, u, f, b, v, _)), R = a;
      } else {
        const O = t;
        V = ct(O.length > 1 ? O(f, {
          attrs: a,
          slots: o,
          emit: l
        }) : O(f, null)), R = t.props ? a : su(a);
      }
    } catch (O) {
      Dn.length = 0, Ui(O, e, 1), V = Te(Ve);
    }
    let E = V;
    if (R && x !== false) {
      const O = Object.keys(R), { shapeFlag: U } = E;
      O.length && U & 7 && (r && O.some(Ls) && (R = ru(R, r)), E = $t(E, R, false, true));
    }
    return n.dirs && (E = $t(E, null, false, true), E.dirs = E.dirs ? E.dirs.concat(n.dirs) : n.dirs), n.transition && Wn(E, n.transition), V = E, wi(F), V;
  }
  const su = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || zi(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, ru = (e, t) => {
    const n = {};
    for (const i in e) (!Ls(i) || !(i.slice(9) in t)) && (n[i] = e[i]);
    return n;
  };
  function ou(e, t, n) {
    const { props: i, children: s, component: r } = e, { props: o, children: a, patchFlag: l } = t, h = r.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && l >= 0) {
      if (l & 1024) return true;
      if (l & 16) return i ? dr(i, o, h) : !!o;
      if (l & 8) {
        const u = t.dynamicProps;
        for (let f = 0; f < u.length; f++) {
          const v = u[f];
          if (Yo(o, i, v) && !Gi(h, v)) return true;
        }
      }
    } else return (s || a) && (!a || !a.$stable) ? true : i === o ? false : i ? o ? dr(i, o, h) : true : !!o;
    return false;
  }
  function dr(e, t, n) {
    const i = Object.keys(t);
    if (i.length !== Object.keys(e).length) return true;
    for (let s = 0; s < i.length; s++) {
      const r = i[s];
      if (Yo(t, e, r) && !Gi(n, r)) return true;
    }
    return false;
  }
  function Yo(e, t, n) {
    const i = e[n], s = t[n];
    return n === "style" && he(i) && he(s) ? !zs(i, s) : i !== s;
  }
  function au({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const i = t.subTree;
      if (i.suspense && i.suspense.activeBranch === e && (i.el = e.el), i === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Ko = {}, Xo = () => Object.create(Ko), Zo = (e) => Object.getPrototypeOf(e) === Ko;
  function lu(e, t, n, i = false) {
    const s = {}, r = Xo();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Jo(e, t, s, r);
    for (const o in e.propsOptions[0]) o in s || (s[o] = void 0);
    n ? e.props = i ? s : pl(s) : e.type.props ? e.props = s : e.props = r, e.attrs = r;
  }
  function uu(e, t, n, i) {
    const { props: s, attrs: r, vnode: { patchFlag: o } } = e, a = oe(s), [l] = e.propsOptions;
    let h = false;
    if ((i || o > 0) && !(o & 16)) {
      if (o & 8) {
        const u = e.vnode.dynamicProps;
        for (let f = 0; f < u.length; f++) {
          let v = u[f];
          if (Gi(e.emitsOptions, v)) continue;
          const b = t[v];
          if (l) if (pe(r, v)) b !== r[v] && (r[v] = b, h = true);
          else {
            const _ = Ct(v);
            s[_] = xs(l, a, _, b, e, false);
          }
          else b !== r[v] && (r[v] = b, h = true);
        }
      }
    } else {
      Jo(e, t, s, r) && (h = true);
      let u;
      for (const f in a) (!t || !pe(t, f) && ((u = Gt(f)) === f || !pe(t, u))) && (l ? n && (n[f] !== void 0 || n[u] !== void 0) && (s[f] = xs(l, a, f, void 0, e, true)) : delete s[f]);
      if (r !== a) for (const f in r) (!t || !pe(t, f)) && (delete r[f], h = true);
    }
    h && wt(e.attrs, "set", "");
  }
  function Jo(e, t, n, i) {
    const [s, r] = e.propsOptions;
    let o = false, a;
    if (t) for (let l in t) {
      if (Bn(l)) continue;
      const h = t[l];
      let u;
      s && pe(s, u = Ct(l)) ? !r || !r.includes(u) ? n[u] = h : (a || (a = {}))[u] = h : Gi(e.emitsOptions, l) || (!(l in i) || h !== i[l]) && (i[l] = h, o = true);
    }
    if (r) {
      const l = oe(n), h = a || de;
      for (let u = 0; u < r.length; u++) {
        const f = r[u];
        n[f] = xs(s, l, f, h[f], e, !pe(h, f));
      }
    }
    return o;
  }
  function xs(e, t, n, i, s, r) {
    const o = e[n];
    if (o != null) {
      const a = pe(o, "default");
      if (a && i === void 0) {
        const l = o.default;
        if (o.type !== Function && !o.skipFactory && te(l)) {
          const { propsDefaults: h } = s;
          if (n in h) i = h[n];
          else {
            const u = ti(s);
            i = h[n] = l.call(null, t), u();
          }
        } else i = l;
        s.ce && s.ce._setProp(n, i);
      }
      o[0] && (r && !a ? i = false : o[1] && (i === "" || i === Gt(n)) && (i = true));
    }
    return i;
  }
  const cu = /* @__PURE__ */ new WeakMap();
  function Qo(e, t, n = false) {
    const i = n ? cu : t.propsCache, s = i.get(e);
    if (s) return s;
    const r = e.props, o = {}, a = [];
    let l = false;
    if (!te(e)) {
      const u = (f) => {
        l = true;
        const [v, b] = Qo(f, t, true);
        Ee(o, v), b && a.push(...b);
      };
      !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
    }
    if (!r && !l) return he(e) && i.set(e, hn), hn;
    if (K(r)) for (let u = 0; u < r.length; u++) {
      const f = Ct(r[u]);
      pr(f) && (o[f] = de);
    }
    else if (r) for (const u in r) {
      const f = Ct(u);
      if (pr(f)) {
        const v = r[u], b = o[f] = K(v) || te(v) ? {
          type: v
        } : Ee({}, v), _ = b.type;
        let x = false, F = true;
        if (K(_)) for (let V = 0; V < _.length; ++V) {
          const R = _[V], E = te(R) && R.name;
          if (E === "Boolean") {
            x = true;
            break;
          } else E === "String" && (F = false);
        }
        else x = te(_) && _.name === "Boolean";
        b[0] = x, b[1] = F, (x || pe(b, "default")) && a.push(f);
      }
    }
    const h = [
      o,
      a
    ];
    return he(e) && i.set(e, h), h;
  }
  function pr(e) {
    return e[0] !== "$" && !Bn(e);
  }
  const Vs = (e) => e === "_" || e === "_ctx" || e === "$stable", Hs = (e) => K(e) ? e.map(ct) : [
    ct(e)
  ], fu = (e, t, n) => {
    if (t._n) return t;
    const i = Ao((...s) => Hs(t(...s)), n);
    return i._c = false, i;
  }, ea = (e, t, n) => {
    const i = e._ctx;
    for (const s in e) {
      if (Vs(s)) continue;
      const r = e[s];
      if (te(r)) t[s] = fu(s, r, i);
      else if (r != null) {
        const o = Hs(r);
        t[s] = () => o;
      }
    }
  }, ta = (e, t) => {
    const n = Hs(t);
    e.slots.default = () => n;
  }, na = (e, t, n) => {
    for (const i in t) (n || !Vs(i)) && (e[i] = t[i]);
  }, du = (e, t, n) => {
    const i = e.slots = Xo();
    if (e.vnode.shapeFlag & 32) {
      const s = t._;
      s ? (na(i, t, n), n && ao(i, "_", s, true)) : ea(t, i);
    } else t && ta(e, t);
  }, pu = (e, t, n) => {
    const { vnode: i, slots: s } = e;
    let r = true, o = de;
    if (i.shapeFlag & 32) {
      const a = t._;
      a ? n && a === 1 ? r = false : na(s, t, n) : (r = !t.$stable, ea(t, s)), o = t;
    } else t && (ta(e, t), o = {
      default: 1
    });
    if (r) for (const a in s) !Vs(a) && o[a] == null && delete s[a];
  }, We = bu;
  function hu(e) {
    return gu(e);
  }
  function gu(e, t) {
    const n = Ii();
    n.__VUE__ = true;
    const { insert: i, remove: s, patchProp: r, createElement: o, createText: a, createComment: l, setText: h, setElementText: u, parentNode: f, nextSibling: v, setScopeId: b = dt, insertStaticContent: _ } = e, x = (d, g, y, C = null, S = null, P = null, I = void 0, z = null, A = !!g.dynamicChildren) => {
      if (d === g) return;
      d && !Jt(d, g) && (C = Bt(d), Re(d, S, P, true), d = null), g.patchFlag === -2 && (A = false, g.dynamicChildren = null);
      const { type: L, ref: Y, shapeFlag: N } = g;
      switch (L) {
        case Vi:
          F(d, g, y, C);
          break;
        case Ve:
          V(d, g, y, C);
          break;
        case gi:
          d == null && R(g, y, C, I);
          break;
        case ze:
          w(d, g, y, C, S, P, I, z, A);
          break;
        default:
          N & 1 ? U(d, g, y, C, S, P, I, z, A) : N & 6 ? k(d, g, y, C, S, P, I, z, A) : (N & 64 || N & 128) && L.process(d, g, y, C, S, P, I, z, A, tt);
      }
      Y != null && S ? Nn(Y, d && d.ref, P, g || d, !g) : Y == null && d && d.ref != null && Nn(d.ref, null, P, d, true);
    }, F = (d, g, y, C) => {
      if (d == null) i(g.el = a(g.children), y, C);
      else {
        const S = g.el = d.el;
        g.children !== d.children && h(S, g.children);
      }
    }, V = (d, g, y, C) => {
      d == null ? i(g.el = l(g.children || ""), y, C) : g.el = d.el;
    }, R = (d, g, y, C) => {
      [d.el, d.anchor] = _(d.children, g, y, C, d.el, d.anchor);
    }, E = ({ el: d, anchor: g }, y, C) => {
      let S;
      for (; d && d !== g; ) S = v(d), i(d, y, C), d = S;
      i(g, y, C);
    }, O = ({ el: d, anchor: g }) => {
      let y;
      for (; d && d !== g; ) y = v(d), s(d), d = y;
      s(g);
    }, U = (d, g, y, C, S, P, I, z, A) => {
      if (g.type === "svg" ? I = "svg" : g.type === "math" && (I = "mathml"), d == null) j(g, y, C, S, P, I, z, A);
      else {
        const L = d.el && d.el._isVueCE ? d.el : null;
        try {
          L && L._beginPatch(), q(d, g, S, P, I, z, A);
        } finally {
          L && L._endPatch();
        }
      }
    }, j = (d, g, y, C, S, P, I, z) => {
      let A, L;
      const { props: Y, shapeFlag: N, transition: W, dirs: J } = d;
      if (A = d.el = o(d.type, P, Y && Y.is, Y), N & 8 ? u(A, d.children) : N & 16 && ue(d.children, A, null, C, S, es(d, P), I, z), J && qt(d, null, C, "created"), se(A, d, d.scopeId, I, C), Y) {
        for (const ge in Y) ge !== "value" && !Bn(ge) && r(A, ge, null, Y[ge], P, C);
        "value" in Y && r(A, "value", null, Y.value, P), (L = Y.onVnodeBeforeMount) && at(L, C, d);
      }
      J && qt(d, null, C, "beforeMount");
      const re = vu(S, W);
      re && W.beforeEnter(A), i(A, g, y), ((L = Y && Y.onVnodeMounted) || re || J) && We(() => {
        L && at(L, C, d), re && W.enter(A), J && qt(d, null, C, "mounted");
      }, S);
    }, se = (d, g, y, C, S) => {
      if (y && b(d, y), C) for (let P = 0; P < C.length; P++) b(d, C[P]);
      if (S) {
        let P = S.subTree;
        if (g === P || oa(P.type) && (P.ssContent === g || P.ssFallback === g)) {
          const I = S.vnode;
          se(d, I, I.scopeId, I.slotScopeIds, S.parent);
        }
      }
    }, ue = (d, g, y, C, S, P, I, z, A = 0) => {
      for (let L = A; L < d.length; L++) {
        const Y = d[L] = z ? yt(d[L]) : ct(d[L]);
        x(null, Y, g, y, C, S, P, I, z);
      }
    }, q = (d, g, y, C, S, P, I) => {
      const z = g.el = d.el;
      let { patchFlag: A, dynamicChildren: L, dirs: Y } = g;
      A |= d.patchFlag & 16;
      const N = d.props || de, W = g.props || de;
      let J;
      if (y && Yt(y, false), (J = W.onVnodeBeforeUpdate) && at(J, y, g, d), Y && qt(g, d, y, "beforeUpdate"), y && Yt(y, true), (N.innerHTML && W.innerHTML == null || N.textContent && W.textContent == null) && u(z, ""), L ? H(d.dynamicChildren, L, z, y, C, es(g, S), P) : I || X(d, g, z, null, y, C, es(g, S), P, false), A > 0) {
        if (A & 16) Z(z, N, W, y, S);
        else if (A & 2 && N.class !== W.class && r(z, "class", null, W.class, S), A & 4 && r(z, "style", N.style, W.style, S), A & 8) {
          const re = g.dynamicProps;
          for (let ge = 0; ge < re.length; ge++) {
            const fe = re[ge], Be = N[fe], Ie = W[fe];
            (Ie !== Be || fe === "value") && r(z, fe, Be, Ie, S, y);
          }
        }
        A & 1 && d.children !== g.children && u(z, g.children);
      } else !I && L == null && Z(z, N, W, y, S);
      ((J = W.onVnodeUpdated) || Y) && We(() => {
        J && at(J, y, g, d), Y && qt(g, d, y, "updated");
      }, C);
    }, H = (d, g, y, C, S, P, I) => {
      for (let z = 0; z < g.length; z++) {
        const A = d[z], L = g[z], Y = A.el && (A.type === ze || !Jt(A, L) || A.shapeFlag & 198) ? f(A.el) : y;
        x(A, L, Y, null, C, S, P, I, true);
      }
    }, Z = (d, g, y, C, S) => {
      if (g !== y) {
        if (g !== de) for (const P in g) !Bn(P) && !(P in y) && r(d, P, g[P], null, S, C);
        for (const P in y) {
          if (Bn(P)) continue;
          const I = y[P], z = g[P];
          I !== z && P !== "value" && r(d, P, z, I, S, C);
        }
        "value" in y && r(d, "value", g.value, y.value, S);
      }
    }, w = (d, g, y, C, S, P, I, z, A) => {
      const L = g.el = d ? d.el : a(""), Y = g.anchor = d ? d.anchor : a("");
      let { patchFlag: N, dynamicChildren: W, slotScopeIds: J } = g;
      J && (z = z ? z.concat(J) : J), d == null ? (i(L, y, C), i(Y, y, C), ue(g.children || [], y, Y, S, P, I, z, A)) : N > 0 && N & 64 && W && d.dynamicChildren && d.dynamicChildren.length === W.length ? (H(d.dynamicChildren, W, y, S, P, I, z), (g.key != null || S && g === S.subTree) && ia(d, g, true)) : X(d, g, y, Y, S, P, I, z, A);
    }, k = (d, g, y, C, S, P, I, z, A) => {
      g.slotScopeIds = z, d == null ? g.shapeFlag & 512 ? S.ctx.activate(g, y, C, I, A) : M(g, y, C, S, P, I, A) : B(d, g, A);
    }, M = (d, g, y, C, S, P, I) => {
      const z = d.component = Mu(d, C, S);
      if (Di(d) && (z.ctx.renderer = tt), Cu(z, false, I), z.asyncDep) {
        if (S && S.registerDep(z, D, I), !d.el) {
          const A = z.subTree = Te(Ve);
          V(null, A, g, y), d.placeholder = A.el;
        }
      } else D(z, d, g, y, S, P, I);
    }, B = (d, g, y) => {
      const C = g.component = d.component;
      if (ou(d, g, y)) if (C.asyncDep && !C.asyncResolved) {
        $(C, g, y);
        return;
      } else C.next = g, C.update();
      else g.el = d.el, C.vnode = g;
    }, D = (d, g, y, C, S, P, I) => {
      const z = () => {
        if (d.isMounted) {
          let { next: N, bu: W, u: J, parent: re, vnode: ge } = d;
          {
            const Xe = sa(d);
            if (Xe) {
              N && (N.el = ge.el, $(d, N, I)), Xe.asyncDep.then(() => {
                We(() => {
                  d.isUnmounted || L();
                }, S);
              });
              return;
            }
          }
          let fe = N, Be;
          Yt(d, false), N ? (N.el = ge.el, $(d, N, I)) : N = ge, W && pi(W), (Be = N.props && N.props.onVnodeBeforeUpdate) && at(Be, re, N, ge), Yt(d, true);
          const Ie = fr(d), Ke = d.subTree;
          d.subTree = Ie, x(Ke, Ie, f(Ke.el), Bt(Ke), d, S, P), N.el = Ie.el, fe === null && au(d, Ie.el), J && We(J, S), (Be = N.props && N.props.onVnodeUpdated) && We(() => at(Be, re, N, ge), S);
        } else {
          let N;
          const { el: W, props: J } = g, { bm: re, m: ge, parent: fe, root: Be, type: Ie } = d, Ke = Un(g);
          Yt(d, false), re && pi(re), !Ke && (N = J && J.onVnodeBeforeMount) && at(N, fe, g), Yt(d, true);
          {
            Be.ce && Be.ce._hasShadowRoot() && Be.ce._injectChildStyle(Ie);
            const Xe = d.subTree = fr(d);
            x(null, Xe, y, C, d, S, P), g.el = Xe.el;
          }
          if (ge && We(ge, S), !Ke && (N = J && J.onVnodeMounted)) {
            const Xe = g;
            We(() => at(N, fe, Xe), S);
          }
          (g.shapeFlag & 256 || fe && Un(fe.vnode) && fe.vnode.shapeFlag & 256) && d.a && We(d.a, S), d.isMounted = true, g = y = C = null;
        }
      };
      d.scope.on();
      const A = d.effect = new fo(z);
      d.scope.off();
      const L = d.update = A.run.bind(A), Y = d.job = A.runIfDirty.bind(A);
      Y.i = d, Y.id = d.uid, A.scheduler = () => Ds(Y), Yt(d, true), L();
    }, $ = (d, g, y) => {
      g.component = d;
      const C = d.vnode.props;
      d.vnode = g, d.next = null, uu(d, g.props, C, y), pu(d, g.children, y), Et(), sr(d), Pt();
    }, X = (d, g, y, C, S, P, I, z, A = false) => {
      const L = d && d.children, Y = d ? d.shapeFlag : 0, N = g.children, { patchFlag: W, shapeFlag: J } = g;
      if (W > 0) {
        if (W & 128) {
          Pe(L, N, y, C, S, P, I, z, A);
          return;
        } else if (W & 256) {
          xe(L, N, y, C, S, P, I, z, A);
          return;
        }
      }
      J & 8 ? (Y & 16 && vt(L, S, P), N !== L && u(y, N)) : Y & 16 ? J & 16 ? Pe(L, N, y, C, S, P, I, z, A) : vt(L, S, P, true) : (Y & 8 && u(y, ""), J & 16 && ue(N, y, C, S, P, I, z, A));
    }, xe = (d, g, y, C, S, P, I, z, A) => {
      d = d || hn, g = g || hn;
      const L = d.length, Y = g.length, N = Math.min(L, Y);
      let W;
      for (W = 0; W < N; W++) {
        const J = g[W] = A ? yt(g[W]) : ct(g[W]);
        x(d[W], J, y, null, S, P, I, z, A);
      }
      L > Y ? vt(d, S, P, true, false, N) : ue(g, y, C, S, P, I, z, A, N);
    }, Pe = (d, g, y, C, S, P, I, z, A) => {
      let L = 0;
      const Y = g.length;
      let N = d.length - 1, W = Y - 1;
      for (; L <= N && L <= W; ) {
        const J = d[L], re = g[L] = A ? yt(g[L]) : ct(g[L]);
        if (Jt(J, re)) x(J, re, y, null, S, P, I, z, A);
        else break;
        L++;
      }
      for (; L <= N && L <= W; ) {
        const J = d[N], re = g[W] = A ? yt(g[W]) : ct(g[W]);
        if (Jt(J, re)) x(J, re, y, null, S, P, I, z, A);
        else break;
        N--, W--;
      }
      if (L > N) {
        if (L <= W) {
          const J = W + 1, re = J < Y ? g[J].el : C;
          for (; L <= W; ) x(null, g[L] = A ? yt(g[L]) : ct(g[L]), y, re, S, P, I, z, A), L++;
        }
      } else if (L > W) for (; L <= N; ) Re(d[L], S, P, true), L++;
      else {
        const J = L, re = L, ge = /* @__PURE__ */ new Map();
        for (L = re; L <= W; L++) {
          const p = g[L] = A ? yt(g[L]) : ct(g[L]);
          p.key != null && ge.set(p.key, L);
        }
        let fe, Be = 0;
        const Ie = W - re + 1;
        let Ke = false, Xe = 0;
        const Wt = new Array(Ie);
        for (L = 0; L < Ie; L++) Wt[L] = 0;
        for (L = J; L <= N; L++) {
          const p = d[L];
          if (Be >= Ie) {
            Re(p, S, P, true);
            continue;
          }
          let m;
          if (p.key != null) m = ge.get(p.key);
          else for (fe = re; fe <= W; fe++) if (Wt[fe - re] === 0 && Jt(p, g[fe])) {
            m = fe;
            break;
          }
          m === void 0 ? Re(p, S, P, true) : (Wt[m - re] = L + 1, m >= Xe ? Xe = m : Ke = true, x(p, g[m], y, null, S, P, I, z, A), Be++);
        }
        const T = Ke ? mu(Wt) : hn;
        for (fe = T.length - 1, L = Ie - 1; L >= 0; L--) {
          const p = re + L, m = g[p], G = g[p + 1], ye = p + 1 < Y ? G.el || ra(G) : C;
          Wt[L] === 0 ? x(null, m, y, ye, S, P, I, z, A) : Ke && (fe < 0 || L !== T[fe] ? Le(m, y, ye, 2) : fe--);
        }
      }
    }, Le = (d, g, y, C, S = null) => {
      const { el: P, type: I, transition: z, children: A, shapeFlag: L } = d;
      if (L & 6) {
        Le(d.component.subTree, g, y, C);
        return;
      }
      if (L & 128) {
        d.suspense.move(g, y, C);
        return;
      }
      if (L & 64) {
        I.move(d, g, y, tt);
        return;
      }
      if (I === ze) {
        i(P, g, y);
        for (let N = 0; N < A.length; N++) Le(A[N], g, y, C);
        i(d.anchor, g, y);
        return;
      }
      if (I === gi) {
        E(d, g, y);
        return;
      }
      if (C !== 2 && L & 1 && z) if (C === 0) z.beforeEnter(P), i(P, g, y), We(() => z.enter(P), S);
      else {
        const { leave: N, delayLeave: W, afterLeave: J } = z, re = () => {
          d.ctx.isUnmounted ? s(P) : i(P, g, y);
        }, ge = () => {
          P._isLeaving && P[ut](true), N(P, () => {
            re(), J && J();
          });
        };
        W ? W(P, re, ge) : ge();
      }
      else i(P, g, y);
    }, Re = (d, g, y, C = false, S = false) => {
      const { type: P, props: I, ref: z, children: A, dynamicChildren: L, shapeFlag: Y, patchFlag: N, dirs: W, cacheIndex: J } = d;
      if (N === -2 && (S = false), z != null && (Et(), Nn(z, null, y, d, true), Pt()), J != null && (g.renderCache[J] = void 0), Y & 256) {
        g.ctx.deactivate(d);
        return;
      }
      const re = Y & 1 && W, ge = !Un(d);
      let fe;
      if (ge && (fe = I && I.onVnodeBeforeUnmount) && at(fe, g, d), Y & 6) on(d.component, y, C);
      else {
        if (Y & 128) {
          d.suspense.unmount(y, C);
          return;
        }
        re && qt(d, null, g, "beforeUnmount"), Y & 64 ? d.type.remove(d, g, y, tt, C) : L && !L.hasOnce && (P !== ze || N > 0 && N & 64) ? vt(L, g, y, false, true) : (P === ze && N & 384 || !S && Y & 16) && vt(A, g, y), C && zt(d);
      }
      (ge && (fe = I && I.onVnodeUnmounted) || re) && We(() => {
        fe && at(fe, g, d), re && qt(d, null, g, "unmounted");
      }, y);
    }, zt = (d) => {
      const { type: g, el: y, anchor: C, transition: S } = d;
      if (g === ze) {
        Ht(y, C);
        return;
      }
      if (g === gi) {
        O(d);
        return;
      }
      const P = () => {
        s(y), S && !S.persisted && S.afterLeave && S.afterLeave();
      };
      if (d.shapeFlag & 1 && S && !S.persisted) {
        const { leave: I, delayLeave: z } = S, A = () => I(y, P);
        z ? z(d.el, P, A) : A();
      } else P();
    }, Ht = (d, g) => {
      let y;
      for (; d !== g; ) y = v(d), s(d), d = y;
      s(g);
    }, on = (d, g, y) => {
      const { bum: C, scope: S, job: P, subTree: I, um: z, m: A, a: L } = d;
      hr(A), hr(L), C && pi(C), S.stop(), P && (P.flags |= 8, Re(I, d, g, y)), z && We(z, g), We(() => {
        d.isUnmounted = true;
      }, g);
    }, vt = (d, g, y, C = false, S = false, P = 0) => {
      for (let I = P; I < d.length; I++) Re(d[I], g, y, C, S);
    }, Bt = (d) => {
      if (d.shapeFlag & 6) return Bt(d.component.subTree);
      if (d.shapeFlag & 128) return d.suspense.next();
      const g = v(d.anchor || d.el), y = g && g[zl];
      return y ? v(y) : g;
    };
    let mt = false;
    const It = (d, g, y) => {
      let C;
      d == null ? g._vnode && (Re(g._vnode, null, null, true), C = g._vnode.component) : x(g._vnode || null, d, g, null, null, null, y), g._vnode = d, mt || (mt = true, sr(C), Lo(), mt = false);
    }, tt = {
      p: x,
      um: Re,
      m: Le,
      r: zt,
      mt: M,
      mc: ue,
      pc: X,
      pbc: H,
      n: Bt,
      o: e
    };
    return {
      render: It,
      hydrate: void 0,
      createApp: tu(It)
    };
  }
  function es({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function Yt({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function vu(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function ia(e, t, n = false) {
    const i = e.children, s = t.children;
    if (K(i) && K(s)) for (let r = 0; r < i.length; r++) {
      const o = i[r];
      let a = s[r];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = s[r] = yt(s[r]), a.el = o.el), !n && a.patchFlag !== -2 && ia(o, a)), a.type === Vi && (a.patchFlag === -1 && (a = s[r] = yt(a)), a.el = o.el), a.type === Ve && !a.el && (a.el = o.el);
    }
  }
  function mu(e) {
    const t = e.slice(), n = [
      0
    ];
    let i, s, r, o, a;
    const l = e.length;
    for (i = 0; i < l; i++) {
      const h = e[i];
      if (h !== 0) {
        if (s = n[n.length - 1], e[s] < h) {
          t[i] = s, n.push(i);
          continue;
        }
        for (r = 0, o = n.length - 1; r < o; ) a = r + o >> 1, e[n[a]] < h ? r = a + 1 : o = a;
        h < e[n[r]] && (r > 0 && (t[i] = n[r - 1]), n[r] = i);
      }
    }
    for (r = n.length, o = n[r - 1]; r-- > 0; ) n[r] = o, o = t[o];
    return n;
  }
  function sa(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : sa(t);
  }
  function hr(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  function ra(e) {
    if (e.placeholder) return e.placeholder;
    const t = e.component;
    return t ? ra(t.subTree) : null;
  }
  const oa = (e) => e.__isSuspense;
  function bu(e, t) {
    t && t.pendingBranch ? K(e) ? t.effects.push(...e) : t.effects.push(e) : El(e);
  }
  const ze = /* @__PURE__ */ Symbol.for("v-fgt"), Vi = /* @__PURE__ */ Symbol.for("v-txt"), Ve = /* @__PURE__ */ Symbol.for("v-cmt"), gi = /* @__PURE__ */ Symbol.for("v-stc"), Dn = [];
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
  function le(e, t, n, i, s, r) {
    return aa(c(e, t, n, i, s, r, true));
  }
  function la(e, t, n, i, s) {
    return aa(Te(e, t, n, i, s, true));
  }
  function Ei(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function Jt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const ua = ({ key: e }) => e ?? null, vi = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? Me(e) || Fe(e) || te(e) ? {
    i: Qe,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function c(e, t = null, n = null, i = 0, s = null, r = e === ze ? 0 : 1, o = false, a = false) {
    const l = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && ua(t),
      ref: t && vi(t),
      scopeId: Ro,
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
      shapeFlag: r,
      patchFlag: i,
      dynamicProps: s,
      dynamicChildren: null,
      appContext: null,
      ctx: Qe
    };
    return a ? (Ws(l, n), r & 128 && e.normalize(l)) : n && (l.shapeFlag |= Me(n) ? 8 : 16), jn > 0 && !o && Ye && (l.patchFlag > 0 || r & 6) && l.patchFlag !== 32 && Ye.push(l), l;
  }
  const Te = xu;
  function xu(e, t = null, n = null, i = 0, s = null, r = false) {
    if ((!e || e === ql) && (e = Ve), Ei(e)) {
      const a = $t(e, t, true);
      return n && Ws(a, n), jn > 0 && !r && Ye && (a.shapeFlag & 6 ? Ye[Ye.indexOf(e)] = a : Ye.push(a)), a.patchFlag = -2, a;
    }
    if (ku(e) && (e = e.__vccOpts), t) {
      t = yu(t);
      let { class: a, style: l } = t;
      a && !Me(a) && (t.class = ce(a)), he(l) && (Fs(l) && !K(l) && (l = Ee({}, l)), t.style = Qn(l));
    }
    const o = Me(e) ? 1 : oa(e) ? 128 : Bo(e) ? 64 : he(e) ? 4 : te(e) ? 2 : 0;
    return c(e, t, n, i, s, o, r, true);
  }
  function yu(e) {
    return e ? Fs(e) || Zo(e) ? Ee({}, e) : e : null;
  }
  function $t(e, t, n = false, i = false) {
    const { props: s, ref: r, patchFlag: o, children: a, transition: l } = e, h = t ? wu(s || {}, t) : s, u = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: h,
      key: h && ua(h),
      ref: t && t.ref ? n && r ? K(r) ? r.concat(vi(t)) : [
        r,
        vi(t)
      ] : vi(t) : r,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: a,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== ze ? o === -1 ? 16 : o | 16 : o,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: l,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && $t(e.ssContent),
      ssFallback: e.ssFallback && $t(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return l && i && Wn(u, l.clone(u)), u;
  }
  function we(e = " ", t = 0) {
    return Te(Vi, null, e, t);
  }
  function ca(e, t) {
    const n = Te(gi, null, e);
    return n.staticCount = t, n;
  }
  function Dt(e = "", t = false) {
    return t ? (ae(), la(Ve, null, e)) : Te(Ve, null, e);
  }
  function ct(e) {
    return e == null || typeof e == "boolean" ? Te(Ve) : K(e) ? Te(ze, null, e.slice()) : Ei(e) ? yt(e) : Te(Vi, null, String(e));
  }
  function yt(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : $t(e);
  }
  function Ws(e, t) {
    let n = 0;
    const { shapeFlag: i } = e;
    if (t == null) t = null;
    else if (K(t)) n = 16;
    else if (typeof t == "object") if (i & 65) {
      const s = t.default;
      s && (s._c && (s._d = false), Ws(e, s()), s._c && (s._d = true));
      return;
    } else {
      n = 32;
      const s = t._;
      !s && !Zo(t) ? t._ctx = Qe : s === 3 && Qe && (Qe.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else te(t) ? (t = {
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
      for (const s in i) if (s === "class") t.class !== i.class && (t.class = ce([
        t.class,
        i.class
      ]));
      else if (s === "style") t.style = Qn([
        t.style,
        i.style
      ]);
      else if (zi(s)) {
        const r = t[s], o = i[s];
        o && r !== o && !(K(r) && r.includes(o)) && (t[s] = r ? [].concat(r, o) : o);
      } else s !== "" && (t[s] = i[s]);
    }
    return t;
  }
  function at(e, t, n, i = null) {
    ot(e, t, 7, [
      n,
      i
    ]);
  }
  const Su = Wo();
  let Tu = 0;
  function Mu(e, t, n) {
    const i = e.type, s = (t ? t.appContext : e.appContext) || Su, r = {
      uid: Tu++,
      vnode: e,
      type: i,
      parent: t,
      appContext: s,
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
      propsOptions: Qo(i, s),
      emitsOptions: qo(i, s),
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
    return r.ctx = {
      _: r
    }, r.root = t ? t.root : r, r.emit = nu.bind(null, r), e.ce && e.ce(r), r;
  }
  let He = null;
  const js = () => He || Qe;
  let Pi, ys;
  {
    const e = Ii(), t = (n, i) => {
      let s;
      return (s = e[n]) || (s = e[n] = []), s.push(i), (r) => {
        s.length > 1 ? s.forEach((o) => o(r)) : s[0](r);
      };
    };
    Pi = t("__VUE_INSTANCE_SETTERS__", (n) => He = n), ys = t("__VUE_SSR_SETTERS__", (n) => qn = n);
  }
  const ti = (e) => {
    const t = He;
    return Pi(e), e.scope.on(), () => {
      e.scope.off(), Pi(t);
    };
  }, gr = () => {
    He && He.scope.off(), Pi(null);
  };
  function fa(e) {
    return e.vnode.shapeFlag & 4;
  }
  let qn = false;
  function Cu(e, t = false, n = false) {
    t && ys(t);
    const { props: i, children: s } = e.vnode, r = fa(e);
    lu(e, i, r, t), du(e, s, n || t);
    const o = r ? Eu(e, t) : void 0;
    return t && ys(false), o;
  }
  function Eu(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Yl);
    const { setup: i } = n;
    if (i) {
      Et();
      const s = e.setupContext = i.length > 1 ? Lu(e) : null, r = ti(e), o = ei(i, e, 0, [
        e.props,
        s
      ]), a = io(o);
      if (Pt(), r(), (a || e.sp) && !Un(e) && Do(e), a) {
        if (o.then(gr, gr), t) return o.then((l) => {
          vr(e, l);
        }).catch((l) => {
          Ui(l, e, 0);
        });
        e.asyncDep = o;
      } else vr(e, o);
    } else da(e);
  }
  function vr(e, t, n) {
    te(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : he(t) && (e.setupState = Co(t)), da(e);
  }
  function da(e, t, n) {
    const i = e.type;
    e.render || (e.render = i.render || dt);
    {
      const s = ti(e);
      Et();
      try {
        Kl(e);
      } finally {
        Pt(), s();
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
  function Hi(e) {
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Co(hl(e.exposed)), {
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
    return te(e) && "__vccOpts" in e;
  }
  const Ae = (e, t) => wl(e, t, qn);
  function Ru(e, t, n) {
    try {
      Ci(-1);
      const i = arguments.length;
      return i === 2 ? he(t) && !K(t) ? Ei(t) ? Te(e, null, [
        t
      ]) : Te(e, t) : Te(e, null, t) : (i > 3 ? n = Array.prototype.slice.call(arguments, 2) : i === 3 && Ei(n) && (n = [
        n
      ]), Te(e, t, n));
    } finally {
      Ci(1);
    }
  }
  const Au = "3.5.28";
  let ws;
  const mr = typeof window < "u" && window.trustedTypes;
  if (mr) try {
    ws = mr.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const pa = ws ? (e) => ws.createHTML(e) : (e) => e, zu = "http://www.w3.org/2000/svg", Bu = "http://www.w3.org/1998/Math/MathML", xt = typeof document < "u" ? document : null, br = xt && xt.createElement("template"), Iu = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, i) => {
      const s = t === "svg" ? xt.createElementNS(zu, e) : t === "mathml" ? xt.createElementNS(Bu, e) : n ? xt.createElement(e, {
        is: n
      }) : xt.createElement(e);
      return e === "select" && i && i.multiple != null && s.setAttribute("multiple", i.multiple), s;
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
    insertStaticContent(e, t, n, i, s, r) {
      const o = n ? n.previousSibling : t.lastChild;
      if (s && (s === r || s.nextSibling)) for (; t.insertBefore(s.cloneNode(true), n), !(s === r || !(s = s.nextSibling)); ) ;
      else {
        br.innerHTML = pa(i === "svg" ? `<svg>${e}</svg>` : i === "mathml" ? `<math>${e}</math>` : e);
        const a = br.content;
        if (i === "svg" || i === "mathml") {
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
  }, Ot = "transition", Rn = "animation", Yn = /* @__PURE__ */ Symbol("_vtc"), ha = {
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
  }, Ou = Ee({}, Io, ha), Nu = (e) => (e.displayName = "Transition", e.props = Ou, e), Uu = Nu((e, { slots: t }) => Ru(Ol, Fu(e), t)), Kt = (e, t = []) => {
    K(e) ? e.forEach((n) => n(...t)) : e && e(...t);
  }, _r = (e) => e ? K(e) ? e.some((t) => t.length > 1) : e.length > 1 : false;
  function Fu(e) {
    const t = {};
    for (const w in e) w in ha || (t[w] = e[w]);
    if (e.css === false) return t;
    const { name: n = "v", type: i, duration: s, enterFromClass: r = `${n}-enter-from`, enterActiveClass: o = `${n}-enter-active`, enterToClass: a = `${n}-enter-to`, appearFromClass: l = r, appearActiveClass: h = o, appearToClass: u = a, leaveFromClass: f = `${n}-leave-from`, leaveActiveClass: v = `${n}-leave-active`, leaveToClass: b = `${n}-leave-to` } = e, _ = Du(s), x = _ && _[0], F = _ && _[1], { onBeforeEnter: V, onEnter: R, onEnterCancelled: E, onLeave: O, onLeaveCancelled: U, onBeforeAppear: j = V, onAppear: se = R, onAppearCancelled: ue = E } = t, q = (w, k, M, B) => {
      w._enterCancelled = B, Xt(w, k ? u : a), Xt(w, k ? h : o), M && M();
    }, H = (w, k) => {
      w._isLeaving = false, Xt(w, f), Xt(w, b), Xt(w, v), k && k();
    }, Z = (w) => (k, M) => {
      const B = w ? se : R, D = () => q(k, w, M);
      Kt(B, [
        k,
        D
      ]), xr(() => {
        Xt(k, w ? l : r), _t(k, w ? u : a), _r(B) || yr(k, i, x, D);
      });
    };
    return Ee(t, {
      onBeforeEnter(w) {
        Kt(V, [
          w
        ]), _t(w, r), _t(w, o);
      },
      onBeforeAppear(w) {
        Kt(j, [
          w
        ]), _t(w, l), _t(w, h);
      },
      onEnter: Z(false),
      onAppear: Z(true),
      onLeave(w, k) {
        w._isLeaving = true;
        const M = () => H(w, k);
        _t(w, f), w._enterCancelled ? (_t(w, v), Tr(w)) : (Tr(w), _t(w, v)), xr(() => {
          w._isLeaving && (Xt(w, f), _t(w, b), _r(O) || yr(w, i, F, M));
        }), Kt(O, [
          w,
          M
        ]);
      },
      onEnterCancelled(w) {
        q(w, false, void 0, true), Kt(E, [
          w
        ]);
      },
      onAppearCancelled(w) {
        q(w, true, void 0, true), Kt(ue, [
          w
        ]);
      },
      onLeaveCancelled(w) {
        H(w), Kt(U, [
          w
        ]);
      }
    });
  }
  function Du(e) {
    if (e == null) return null;
    if (he(e)) return [
      ts(e.enter),
      ts(e.leave)
    ];
    {
      const t = ts(e);
      return [
        t,
        t
      ];
    }
  }
  function ts(e) {
    return Fa(e);
  }
  function _t(e, t) {
    t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Yn] || (e[Yn] = /* @__PURE__ */ new Set())).add(t);
  }
  function Xt(e, t) {
    t.split(/\s+/).forEach((i) => i && e.classList.remove(i));
    const n = e[Yn];
    n && (n.delete(t), n.size || (e[Yn] = void 0));
  }
  function xr(e) {
    requestAnimationFrame(() => {
      requestAnimationFrame(e);
    });
  }
  let $u = 0;
  function yr(e, t, n, i) {
    const s = e._endId = ++$u, r = () => {
      s === e._endId && i();
    };
    if (n != null) return setTimeout(r, n);
    const { type: o, timeout: a, propCount: l } = Gu(e, t);
    if (!o) return i();
    const h = o + "end";
    let u = 0;
    const f = () => {
      e.removeEventListener(h, v), r();
    }, v = (b) => {
      b.target === e && ++u >= l && f();
    };
    setTimeout(() => {
      u < l && f();
    }, a + 1), e.addEventListener(h, v);
  }
  function Gu(e, t) {
    const n = window.getComputedStyle(e), i = (_) => (n[_] || "").split(", "), s = i(`${Ot}Delay`), r = i(`${Ot}Duration`), o = wr(s, r), a = i(`${Rn}Delay`), l = i(`${Rn}Duration`), h = wr(a, l);
    let u = null, f = 0, v = 0;
    t === Ot ? o > 0 && (u = Ot, f = o, v = r.length) : t === Rn ? h > 0 && (u = Rn, f = h, v = l.length) : (f = Math.max(o, h), u = f > 0 ? o > h ? Ot : Rn : null, v = u ? u === Ot ? r.length : l.length : 0);
    const b = u === Ot && /\b(?:transform|all)(?:,|$)/.test(i(`${Ot}Property`).toString());
    return {
      type: u,
      timeout: f,
      propCount: v,
      hasTransform: b
    };
  }
  function wr(e, t) {
    for (; e.length < t.length; ) e = e.concat(e);
    return Math.max(...t.map((n, i) => Sr(n) + Sr(e[i])));
  }
  function Sr(e) {
    return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
  }
  function Tr(e) {
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
  const Li = /* @__PURE__ */ Symbol("_vod"), ga = /* @__PURE__ */ Symbol("_vsh"), oi = {
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
    const i = e.style, s = Me(n);
    let r = false;
    if (n && !s) {
      if (t) if (Me(t)) for (const o of t.split(";")) {
        const a = o.slice(0, o.indexOf(":")).trim();
        n[a] == null && mi(i, a, "");
      }
      else for (const o in t) n[o] == null && mi(i, o, "");
      for (const o in n) o === "display" && (r = true), mi(i, o, n[o]);
    } else if (s) {
      if (t !== n) {
        const o = i[Hu];
        o && (n += ";" + o), i.cssText = n, r = Wu.test(n);
      }
    } else t && e.removeAttribute("style");
    Li in e && (e[Li] = r ? i.display : "", e[ga] && (i.display = "none"));
  }
  const Mr = /\s*!important$/;
  function mi(e, t, n) {
    if (K(n)) n.forEach((i) => mi(e, t, i));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const i = qu(e, t);
      Mr.test(n) ? e.setProperty(Gt(i), n.replace(Mr, ""), "important") : e[i] = n;
    }
  }
  const Cr = [
    "Webkit",
    "Moz",
    "ms"
  ], ns = {};
  function qu(e, t) {
    const n = ns[t];
    if (n) return n;
    let i = Ct(t);
    if (i !== "filter" && i in e) return ns[t] = i;
    i = oo(i);
    for (let s = 0; s < Cr.length; s++) {
      const r = Cr[s] + i;
      if (r in e) return ns[t] = r;
    }
    return t;
  }
  const Er = "http://www.w3.org/1999/xlink";
  function Pr(e, t, n, i, s, r = Wa(t)) {
    i && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Er, t.slice(6, t.length)) : e.setAttributeNS(Er, t, n) : n == null || r && !lo(n) ? e.removeAttribute(t) : e.setAttribute(t, r ? "" : gt(n) ? String(n) : n);
  }
  function Lr(e, t, n, i, s) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? pa(n) : n);
      return;
    }
    const r = e.tagName;
    if (t === "value" && r !== "PROGRESS" && !r.includes("-")) {
      const a = r === "OPTION" ? e.getAttribute("value") || "" : e.value, l = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
      (a !== l || !("_value" in e)) && (e.value = l), n == null && e.removeAttribute(t), e._value = n;
      return;
    }
    let o = false;
    if (n === "" || n == null) {
      const a = typeof e[t];
      a === "boolean" ? n = lo(n) : n == null && a === "string" ? (n = "", o = true) : a === "number" && (n = 0, o = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    o && e.removeAttribute(s || t);
  }
  function pn(e, t, n, i) {
    e.addEventListener(t, n, i);
  }
  function Yu(e, t, n, i) {
    e.removeEventListener(t, n, i);
  }
  const kr = /* @__PURE__ */ Symbol("_vei");
  function Ku(e, t, n, i, s = null) {
    const r = e[kr] || (e[kr] = {}), o = r[t];
    if (i && o) o.value = i;
    else {
      const [a, l] = Xu(t);
      if (i) {
        const h = r[t] = Qu(i, s);
        pn(e, a, h, l);
      } else o && (Yu(e, a, o, l), r[t] = void 0);
    }
  }
  const Rr = /(?:Once|Passive|Capture)$/;
  function Xu(e) {
    let t;
    if (Rr.test(e)) {
      t = {};
      let i;
      for (; i = e.match(Rr); ) e = e.slice(0, e.length - i[0].length), t[i[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : Gt(e.slice(2)),
      t
    ];
  }
  let is = 0;
  const Zu = Promise.resolve(), Ju = () => is || (Zu.then(() => is = 0), is = Date.now());
  function Qu(e, t) {
    const n = (i) => {
      if (!i._vts) i._vts = Date.now();
      else if (i._vts <= n.attached) return;
      ot(ec(i, n.value), t, 5, [
        i
      ]);
    };
    return n.value = e, n.attached = Ju(), n;
  }
  function ec(e, t) {
    if (K(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((i) => (s) => !s._stopped && i && i(s));
    } else return t;
  }
  const Ar = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, tc = (e, t, n, i, s, r) => {
    const o = s === "svg";
    t === "class" ? Vu(e, i, o) : t === "style" ? ju(e, n, i) : zi(t) ? Ls(t) || Ku(e, t, n, i, r) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : nc(e, t, i, o)) ? (Lr(e, t, i), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Pr(e, t, i, o, r, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !Me(i)) ? Lr(e, Ct(t), i, r, t) : (t === "true-value" ? e._trueValue = i : t === "false-value" && (e._falseValue = i), Pr(e, t, i, o));
  };
  function nc(e, t, n, i) {
    if (i) return !!(t === "innerHTML" || t === "textContent" || t in e && Ar(t) && te(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const s = e.tagName;
      if (s === "IMG" || s === "VIDEO" || s === "CANVAS" || s === "SOURCE") return false;
    }
    return Ar(t) && Me(n) ? false : t in e;
  }
  const zr = (e) => {
    const t = e.props["onUpdate:modelValue"] || false;
    return K(t) ? (n) => pi(t, n) : t;
  };
  function ic(e) {
    e.target.composing = true;
  }
  function Br(e) {
    const t = e.target;
    t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
  }
  const ss = /* @__PURE__ */ Symbol("_assign");
  function Ir(e, t, n) {
    return t && (e = e.trim()), n && (e = As(e)), e;
  }
  const nt = {
    created(e, { modifiers: { lazy: t, trim: n, number: i } }, s) {
      e[ss] = zr(s);
      const r = i || s.props && s.props.type === "number";
      pn(e, t ? "change" : "input", (o) => {
        o.target.composing || e[ss](Ir(e.value, n, r));
      }), (n || r) && pn(e, "change", () => {
        e.value = Ir(e.value, n, r);
      }), t || (pn(e, "compositionstart", ic), pn(e, "compositionend", Br), pn(e, "change", Br));
    },
    mounted(e, { value: t }) {
      e.value = t ?? "";
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: i, trim: s, number: r } }, o) {
      if (e[ss] = zr(o), e.composing) return;
      const a = (r || e.type === "number") && !/^0\d/.test(e.value) ? As(e.value) : e.value, l = t ?? "";
      a !== l && (document.activeElement === e && e.type !== "range" && (i && t === n || s && e.value.trim() === l) || (e.value = l));
    }
  }, sc = [
    "ctrl",
    "shift",
    "alt",
    "meta"
  ], rc = {
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
    exact: (e, t) => sc.some((n) => e[`${n}Key`] && !t.includes(n))
  }, Ss = (e, t) => {
    if (!e) return e;
    const n = e._withMods || (e._withMods = {}), i = t.join(".");
    return n[i] || (n[i] = ((s, ...r) => {
      for (let o = 0; o < t.length; o++) {
        const a = rc[t[o]];
        if (a && a(s, t)) return;
      }
      return e(s, ...r);
    }));
  }, oc = Ee({
    patchProp: tc
  }, Iu);
  let Or;
  function ac() {
    return Or || (Or = hu(oc));
  }
  const lc = ((...e) => {
    const t = ac().createApp(...e), { mount: n } = t;
    return t.mount = (i) => {
      const s = cc(i);
      if (!s) return;
      const r = t._component;
      !te(r) && !r.render && !r.template && (r.template = s.innerHTML), s.nodeType === 1 && (s.textContent = "");
      const o = n(s, false, uc(s));
      return s instanceof Element && (s.removeAttribute("v-cloak"), s.setAttribute("data-v-app", "")), o;
    }, t;
  });
  function uc(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function cc(e) {
    return Me(e) ? document.querySelector(e) : e;
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
      let s;
      if (typeof Buffer == "function" && typeof Buffer.from == "function") s = Buffer.from(i, "base64");
      else if (typeof atob == "function") {
        const r = atob(i);
        s = new Uint8Array(r.length);
        for (let o = 0; o < r.length; o++) s[o] = r.charCodeAt(o);
      } else throw new Error("Cannot decode base64-encoded data URL");
      n = await WebAssembly.instantiate(s, e);
    } else {
      const i = await fetch(t), s = i.headers.get("Content-Type") || "";
      if ("instantiateStreaming" in WebAssembly && s.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(i, e);
      else {
        const r = await i.arrayBuffer();
        n = await WebAssembly.instantiate(r, e);
      }
    }
    return n.instance.exports;
  };
  let Q;
  function bc(e) {
    Q = e;
  }
  function qs(e, t) {
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
    return (ai === null || ai.byteLength === 0) && (ai = new Uint8Array(Q.memory.buffer)), ai;
  }
  let _i = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  _i.decode();
  const _c = 2146435072;
  let rs = 0;
  function xc(e, t) {
    return rs += t, rs >= _c && (_i = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), _i.decode(), rs = t), _i.decode(bi().subarray(e, e + t));
  }
  function va(e, t) {
    return e = e >>> 0, xc(e, t);
  }
  function be(e) {
    if (typeof e != "number") throw new Error(`expected a number argument, found ${typeof e}`);
  }
  let un = null;
  function yc() {
    return (un === null || un.buffer.detached === true || un.buffer.detached === void 0 && un.buffer !== Q.memory.buffer) && (un = new DataView(Q.memory.buffer)), un;
  }
  function Nr(e, t) {
    e = e >>> 0;
    const n = yc(), i = [];
    for (let s = e; s < e + 4 * t; s += 4) i.push(Q.__wbindgen_export_0.get(n.getUint32(s, true)));
    return Q.__externref_drop_slice(e, t), i;
  }
  let Ft = 0;
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
      return bi().subarray(l, l + a.length).set(a), Ft = a.length, l;
    }
    let i = e.length, s = t(i, 1) >>> 0;
    const r = bi();
    let o = 0;
    for (; o < i; o++) {
      const a = e.charCodeAt(o);
      if (a > 127) break;
      r[s + o] = a;
    }
    if (o !== i) {
      o !== 0 && (e = e.slice(o)), s = n(s, i, i = o + e.length * 3, 1) >>> 0;
      const a = bi().subarray(s + o, s + i), l = $n.encodeInto(e, a);
      if (l.read !== e.length) throw new Error("failed to pass whole string");
      o += l.written, s = n(s, i, o, 1) >>> 0;
    }
    return Ft = o, s;
  }
  const Ur = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => Q.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  class Ts {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Ur.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      Q.__wbg_mandelbrotnavigator_free(t, 0);
    }
    get_params() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr);
      const t = Q.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = Nr(t[0], t[1]).slice();
      return Q.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    rotate_direct(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), Q.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
    }
    translate_direct(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), Q.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
    }
    get_reference_orbit_len() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return be(this.__wbg_ptr), Q.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
    }
    compute_reference_orbit_ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), be(t);
      const n = Q.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
      return Sn.__wrap(n);
    }
    get_reference_orbit_capacity() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return be(this.__wbg_ptr), Q.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    compute_reference_orbit_chunk(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), be(t), be(n);
      const i = Q.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, t, n);
      return Sn.__wrap(i);
    }
    constructor(t, n, i, s) {
      const r = cn(t, Q.__wbindgen_malloc, Q.__wbindgen_realloc), o = Ft, a = cn(n, Q.__wbindgen_malloc, Q.__wbindgen_realloc), l = Ft, h = cn(i, Q.__wbindgen_malloc, Q.__wbindgen_realloc), u = Ft, f = Q.mandelbrotnavigator_new(r, o, a, l, h, u, s);
      return this.__wbg_ptr = f >>> 0, Ur.register(this, this.__wbg_ptr, this), this;
    }
    step() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr);
      const t = Q.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = Nr(t[0], t[1]).slice();
      return Q.__wbindgen_free(t[0], t[1] * 4, 4), n;
    }
    zoom(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), Q.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
    }
    angle(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), Q.mandelbrotnavigator_angle(this.__wbg_ptr, t);
    }
    scale(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr);
      const n = cn(t, Q.__wbindgen_malloc, Q.__wbindgen_realloc), i = Ft;
      Q.mandelbrotnavigator_scale(this.__wbg_ptr, n, i);
    }
    origin(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr);
      const i = cn(t, Q.__wbindgen_malloc, Q.__wbindgen_realloc), s = Ft, r = cn(n, Q.__wbindgen_malloc, Q.__wbindgen_realloc), o = Ft;
      Q.mandelbrotnavigator_origin(this.__wbg_ptr, i, s, r, o);
    }
    rotate(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), Q.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
    }
    translate(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), Q.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
    }
  }
  Symbol.dispose && (Ts.prototype[Symbol.dispose] = Ts.prototype.free);
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => Q.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const Fr = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => Q.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class Sn {
    constructor() {
      throw new Error("cannot invoke `new` directly");
    }
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(Sn.prototype);
      return n.__wbg_ptr = t, Fr.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Fr.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      Q.__wbg_orbitbufferinfo_free(t, 0);
    }
    get ptr() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return be(this.__wbg_ptr), Q.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
    }
    set ptr(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), be(t), Q.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
    }
    get offset() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return be(this.__wbg_ptr), Q.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
    }
    set offset(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), be(t), Q.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
    }
    get count() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return be(this.__wbg_ptr), Q.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
    }
    set count(t) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      be(this.__wbg_ptr), be(t), Q.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
    }
  }
  Symbol.dispose && (Sn.prototype[Symbol.dispose] = Sn.prototype.free);
  function wc() {
    return qs(function(e) {
      return Math.exp(e);
    }, arguments);
  }
  function Sc() {
    return qs(function() {
      return Date.now();
    }, arguments);
  }
  function Tc(e, t) {
    throw new Error(va(e, t));
  }
  function Mc() {
    return qs(function(e, t) {
      return va(e, t);
    }, arguments);
  }
  function Cc() {
    const e = Q.__wbindgen_export_0, t = e.grow(4);
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
  }, vc), ma = ie.memory, Ec = ie.__wbg_get_mandelbrotstep_dx, Pc = ie.__wbg_get_mandelbrotstep_dy, Lc = ie.__wbg_get_mandelbrotstep_zx, kc = ie.__wbg_get_mandelbrotstep_zy, Rc = ie.__wbg_get_orbitbufferinfo_count, Ac = ie.__wbg_get_orbitbufferinfo_offset, zc = ie.__wbg_get_orbitbufferinfo_ptr, Bc = ie.__wbg_mandelbrotnavigator_free, Ic = ie.__wbg_mandelbrotstep_free, Oc = ie.__wbg_orbitbufferinfo_free, Nc = ie.__wbg_set_mandelbrotstep_dx, Uc = ie.__wbg_set_mandelbrotstep_dy, Fc = ie.__wbg_set_mandelbrotstep_zx, Dc = ie.__wbg_set_mandelbrotstep_zy, $c = ie.__wbg_set_orbitbufferinfo_count, Gc = ie.__wbg_set_orbitbufferinfo_offset, Vc = ie.__wbg_set_orbitbufferinfo_ptr, Hc = ie.mandelbrotnavigator_angle, Wc = ie.mandelbrotnavigator_compute_reference_orbit_chunk, jc = ie.mandelbrotnavigator_compute_reference_orbit_ptr, qc = ie.mandelbrotnavigator_get_params, Yc = ie.mandelbrotnavigator_get_reference_orbit_capacity, Kc = ie.mandelbrotnavigator_get_reference_orbit_len, Xc = ie.mandelbrotnavigator_new, Zc = ie.mandelbrotnavigator_origin, Jc = ie.mandelbrotnavigator_rotate, Qc = ie.mandelbrotnavigator_rotate_direct, ef = ie.mandelbrotnavigator_scale, tf = ie.mandelbrotnavigator_step, nf = ie.mandelbrotnavigator_translate, sf = ie.mandelbrotnavigator_translate_direct, rf = ie.mandelbrotnavigator_zoom, of = ie.__wbindgen_export_0, af = ie.__externref_drop_slice, lf = ie.__wbindgen_free, uf = ie.__wbindgen_malloc, cf = ie.__wbindgen_realloc, ba = ie.__wbindgen_start, ff = Object.freeze(Object.defineProperty({
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
    __wbindgen_export_0: of,
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
    mandelbrotnavigator_translate_direct: sf,
    mandelbrotnavigator_zoom: rf,
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
  function Vt() {
  }
  var rn = 0.7, Tn = 1 / rn, xn = "\\s*([+-]?\\d+)\\s*", Kn = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", pt = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", pf = /^#([0-9a-f]{3,8})$/, hf = new RegExp(`^rgb\\(${xn},${xn},${xn}\\)$`), gf = new RegExp(`^rgb\\(${pt},${pt},${pt}\\)$`), vf = new RegExp(`^rgba\\(${xn},${xn},${xn},${Kn}\\)$`), mf = new RegExp(`^rgba\\(${pt},${pt},${pt},${Kn}\\)$`), bf = new RegExp(`^hsl\\(${Kn},${pt},${pt}\\)$`), _f = new RegExp(`^hsla\\(${Kn},${pt},${pt},${Kn}\\)$`), Dr = {
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
  Cn(Vt, Ys, {
    copy(e) {
      return Object.assign(new this.constructor(), this, e);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: $r,
    formatHex: $r,
    formatHex8: xf,
    formatHsl: yf,
    formatRgb: Gr,
    toString: Gr
  });
  function $r() {
    return this.rgb().formatHex();
  }
  function xf() {
    return this.rgb().formatHex8();
  }
  function yf() {
    return _a(this).formatHsl();
  }
  function Gr() {
    return this.rgb().formatRgb();
  }
  function Ys(e) {
    var t, n;
    return e = (e + "").trim().toLowerCase(), (t = pf.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Vr(t) : n === 3 ? new ke(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? li(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? li(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = hf.exec(e)) ? new ke(t[1], t[2], t[3], 1) : (t = gf.exec(e)) ? new ke(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = vf.exec(e)) ? li(t[1], t[2], t[3], t[4]) : (t = mf.exec(e)) ? li(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = bf.exec(e)) ? jr(t[1], t[2] / 100, t[3] / 100, 1) : (t = _f.exec(e)) ? jr(t[1], t[2] / 100, t[3] / 100, t[4]) : Dr.hasOwnProperty(e) ? Vr(Dr[e]) : e === "transparent" ? new ke(NaN, NaN, NaN, 0) : null;
  }
  function Vr(e) {
    return new ke(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
  }
  function li(e, t, n, i) {
    return i <= 0 && (e = t = n = NaN), new ke(e, t, n, i);
  }
  function Ks(e) {
    return e instanceof Vt || (e = Ys(e)), e ? (e = e.rgb(), new ke(e.r, e.g, e.b, e.opacity)) : new ke();
  }
  function me(e, t, n, i) {
    return arguments.length === 1 ? Ks(e) : new ke(e, t, n, i ?? 1);
  }
  function ke(e, t, n, i) {
    this.r = +e, this.g = +t, this.b = +n, this.opacity = +i;
  }
  Cn(ke, me, ni(Vt, {
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
      return new ke(nn(this.r), nn(this.g), nn(this.b), ki(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
    },
    hex: Hr,
    formatHex: Hr,
    formatHex8: wf,
    formatRgb: Wr,
    toString: Wr
  }));
  function Hr() {
    return `#${Qt(this.r)}${Qt(this.g)}${Qt(this.b)}`;
  }
  function wf() {
    return `#${Qt(this.r)}${Qt(this.g)}${Qt(this.b)}${Qt((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function Wr() {
    const e = ki(this.opacity);
    return `${e === 1 ? "rgb(" : "rgba("}${nn(this.r)}, ${nn(this.g)}, ${nn(this.b)}${e === 1 ? ")" : `, ${e})`}`;
  }
  function ki(e) {
    return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
  }
  function nn(e) {
    return Math.max(0, Math.min(255, Math.round(e) || 0));
  }
  function Qt(e) {
    return e = nn(e), (e < 16 ? "0" : "") + e.toString(16);
  }
  function jr(e, t, n, i) {
    return i <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new it(e, t, n, i);
  }
  function _a(e) {
    if (e instanceof it) return new it(e.h, e.s, e.l, e.opacity);
    if (e instanceof Vt || (e = Ys(e)), !e) return new it();
    if (e instanceof it) return e;
    e = e.rgb();
    var t = e.r / 255, n = e.g / 255, i = e.b / 255, s = Math.min(t, n, i), r = Math.max(t, n, i), o = NaN, a = r - s, l = (r + s) / 2;
    return a ? (t === r ? o = (n - i) / a + (n < i) * 6 : n === r ? o = (i - t) / a + 2 : o = (t - n) / a + 4, a /= l < 0.5 ? r + s : 2 - r - s, o *= 60) : a = l > 0 && l < 1 ? 0 : o, new it(o, a, l, e.opacity);
  }
  function Xn(e, t, n, i) {
    return arguments.length === 1 ? _a(e) : new it(e, t, n, i ?? 1);
  }
  function it(e, t, n, i) {
    this.h = +e, this.s = +t, this.l = +n, this.opacity = +i;
  }
  Cn(it, Xn, ni(Vt, {
    brighter(e) {
      return e = e == null ? Tn : Math.pow(Tn, e), new it(this.h, this.s, this.l * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? rn : Math.pow(rn, e), new it(this.h, this.s, this.l * e, this.opacity);
    },
    rgb() {
      var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, i = n + (n < 0.5 ? n : 1 - n) * t, s = 2 * n - i;
      return new ke(os(e >= 240 ? e - 240 : e + 120, s, i), os(e, s, i), os(e < 120 ? e + 240 : e - 120, s, i), this.opacity);
    },
    clamp() {
      return new it(qr(this.h), ui(this.s), ui(this.l), ki(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
    },
    formatHsl() {
      const e = ki(this.opacity);
      return `${e === 1 ? "hsl(" : "hsla("}${qr(this.h)}, ${ui(this.s) * 100}%, ${ui(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
    }
  }));
  function qr(e) {
    return e = (e || 0) % 360, e < 0 ? e + 360 : e;
  }
  function ui(e) {
    return Math.max(0, Math.min(1, e || 0));
  }
  function os(e, t, n) {
    return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
  }
  const xa = Math.PI / 180, ya = 180 / Math.PI, Ri = 18, wa = 0.96422, Sa = 1, Ta = 0.82521, Ma = 4 / 29, yn = 6 / 29, Ca = 3 * yn * yn, Sf = yn * yn * yn;
  function Ea(e) {
    if (e instanceof ht) return new ht(e.l, e.a, e.b, e.opacity);
    if (e instanceof ft) return La(e);
    e instanceof ke || (e = Ks(e));
    var t = cs(e.r), n = cs(e.g), i = cs(e.b), s = as((0.2225045 * t + 0.7168786 * n + 0.0606169 * i) / Sa), r, o;
    return t === n && n === i ? r = o = s : (r = as((0.4360747 * t + 0.3850649 * n + 0.1430804 * i) / wa), o = as((0.0139322 * t + 0.0971045 * n + 0.7141733 * i) / Ta)), new ht(116 * s - 16, 500 * (r - s), 200 * (s - o), e.opacity);
  }
  function Ms(e, t, n, i) {
    return arguments.length === 1 ? Ea(e) : new ht(e, t, n, i ?? 1);
  }
  function ht(e, t, n, i) {
    this.l = +e, this.a = +t, this.b = +n, this.opacity = +i;
  }
  Cn(ht, Ms, ni(Vt, {
    brighter(e) {
      return new ht(this.l + Ri * (e ?? 1), this.a, this.b, this.opacity);
    },
    darker(e) {
      return new ht(this.l - Ri * (e ?? 1), this.a, this.b, this.opacity);
    },
    rgb() {
      var e = (this.l + 16) / 116, t = isNaN(this.a) ? e : e + this.a / 500, n = isNaN(this.b) ? e : e - this.b / 200;
      return t = wa * ls(t), e = Sa * ls(e), n = Ta * ls(n), new ke(us(3.1338561 * t - 1.6168667 * e - 0.4906146 * n), us(-0.9787684 * t + 1.9161415 * e + 0.033454 * n), us(0.0719453 * t - 0.2289914 * e + 1.4052427 * n), this.opacity);
    }
  }));
  function as(e) {
    return e > Sf ? Math.pow(e, 1 / 3) : e / Ca + Ma;
  }
  function ls(e) {
    return e > yn ? e * e * e : Ca * (e - Ma);
  }
  function us(e) {
    return 255 * (e <= 31308e-7 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055);
  }
  function cs(e) {
    return (e /= 255) <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4);
  }
  function Pa(e) {
    if (e instanceof ft) return new ft(e.h, e.c, e.l, e.opacity);
    if (e instanceof ht || (e = Ea(e)), e.a === 0 && e.b === 0) return new ft(NaN, 0 < e.l && e.l < 100 ? 0 : NaN, e.l, e.opacity);
    var t = Math.atan2(e.b, e.a) * ya;
    return new ft(t < 0 ? t + 360 : t, Math.sqrt(e.a * e.a + e.b * e.b), e.l, e.opacity);
  }
  function Ce(e, t, n, i) {
    return arguments.length === 1 ? Pa(e) : new ft(n, t, e, 1);
  }
  function Cs(e, t, n, i) {
    return arguments.length === 1 ? Pa(e) : new ft(e, t, n, i ?? 1);
  }
  function ft(e, t, n, i) {
    this.h = +e, this.c = +t, this.l = +n, this.opacity = +i;
  }
  function La(e) {
    if (isNaN(e.h)) return new ht(e.l, 0, 0, e.opacity);
    var t = e.h * xa;
    return new ht(e.l, Math.cos(t) * e.c, Math.sin(t) * e.c, e.opacity);
  }
  Cn(ft, Cs, ni(Vt, {
    brighter(e) {
      return new ft(this.h, this.c, this.l + Ri * (e ?? 1), this.opacity);
    },
    darker(e) {
      return new ft(this.h, this.c, this.l - Ri * (e ?? 1), this.opacity);
    },
    rgb() {
      return La(this).rgb();
    }
  }));
  var ka = -0.14861, Xs = 1.78277, Zs = -0.29227, Wi = -0.90649, Zn = 1.97294, Yr = Zn * Wi, Kr = Zn * Xs, Xr = Xs * Zs - Wi * ka;
  function Tf(e) {
    if (e instanceof sn) return new sn(e.h, e.s, e.l, e.opacity);
    e instanceof ke || (e = Ks(e));
    var t = e.r / 255, n = e.g / 255, i = e.b / 255, s = (Xr * i + Yr * t - Kr * n) / (Xr + Yr - Kr), r = i - s, o = (Zn * (n - s) - Zs * r) / Wi, a = Math.sqrt(o * o + r * r) / (Zn * s * (1 - s)), l = a ? Math.atan2(o, r) * ya - 120 : NaN;
    return new sn(l < 0 ? l + 360 : l, a, s, e.opacity);
  }
  function Es(e, t, n, i) {
    return arguments.length === 1 ? Tf(e) : new sn(e, t, n, i ?? 1);
  }
  function sn(e, t, n, i) {
    this.h = +e, this.s = +t, this.l = +n, this.opacity = +i;
  }
  Cn(sn, Es, ni(Vt, {
    brighter(e) {
      return e = e == null ? Tn : Math.pow(Tn, e), new sn(this.h, this.s, this.l * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? rn : Math.pow(rn, e), new sn(this.h, this.s, this.l * e, this.opacity);
    },
    rgb() {
      var e = isNaN(this.h) ? 0 : (this.h + 120) * xa, t = +this.l, n = isNaN(this.s) ? 0 : this.s * t * (1 - t), i = Math.cos(e), s = Math.sin(e);
      return new ke(255 * (t + n * (ka * i + Xs * s)), 255 * (t + n * (Zs * i + Wi * s)), 255 * (t + n * (Zn * i)), this.opacity);
    }
  }));
  const Js = (e) => () => e;
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
  function Qs(e, t) {
    var n = t - e;
    return n ? Ra(e, n > 180 || n < -180 ? n - 360 * Math.round(n / 360) : n) : Js(isNaN(e) ? t : e);
  }
  function Cf(e) {
    return (e = +e) == 1 ? Ue : function(t, n) {
      return n - t ? Mf(t, n, e) : Js(isNaN(t) ? n : t);
    };
  }
  function Ue(e, t) {
    var n = t - e;
    return n ? Ra(e, n) : Js(isNaN(e) ? t : e);
  }
  const Ef = (function e(t) {
    var n = Cf(t);
    function i(s, r) {
      var o = n((s = me(s)).r, (r = me(r)).r), a = n(s.g, r.g), l = n(s.b, r.b), h = Ue(s.opacity, r.opacity);
      return function(u) {
        return s.r = o(u), s.g = a(u), s.b = l(u), s.opacity = h(u), s + "";
      };
    }
    return i.gamma = e, i;
  })(1);
  function Pf(e) {
    return function(t, n) {
      var i = e((t = Xn(t)).h, (n = Xn(n)).h), s = Ue(t.s, n.s), r = Ue(t.l, n.l), o = Ue(t.opacity, n.opacity);
      return function(a) {
        return t.h = i(a), t.s = s(a), t.l = r(a), t.opacity = o(a), t + "";
      };
    };
  }
  const Lf = Pf(Qs);
  function Aa(e, t) {
    var n = Ue((e = Ms(e)).l, (t = Ms(t)).l), i = Ue(e.a, t.a), s = Ue(e.b, t.b), r = Ue(e.opacity, t.opacity);
    return function(o) {
      return e.l = n(o), e.a = i(o), e.b = s(o), e.opacity = r(o), e + "";
    };
  }
  function kf(e) {
    return function(t, n) {
      var i = e((t = Cs(t)).h, (n = Cs(n)).h), s = Ue(t.c, n.c), r = Ue(t.l, n.l), o = Ue(t.opacity, n.opacity);
      return function(a) {
        return t.h = i(a), t.c = s(a), t.l = r(a), t.opacity = o(a), t + "";
      };
    };
  }
  const Rf = kf(Qs);
  function za(e) {
    return (function t(n) {
      n = +n;
      function i(s, r) {
        var o = e((s = Es(s)).h, (r = Es(r)).h), a = Ue(s.s, r.s), l = Ue(s.l, r.l), h = Ue(s.opacity, r.opacity);
        return function(u) {
          return s.h = o(u), s.s = a(u), s.l = l(Math.pow(u, n)), s.opacity = h(u), s + "";
        };
      }
      return i.gamma = t, i;
    })(1);
  }
  const Af = za(Qs);
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
      this.points = t.slice().sort((i, s) => i.position - s.position), this.interpolate = zf[n] ?? Aa;
    }
    getColorAt(t) {
      if (this.points.length === 0) return "#000";
      if (t <= this.points[0].position) return this.points[0].color;
      if (t >= this.points[this.points.length - 1].position) return this.points[this.points.length - 1].color;
      for (let n = 0; n < this.points.length - 1; ++n) {
        const i = this.points[n], s = this.points[n + 1];
        if (t >= i.position && t <= s.position) {
          const r = (t - i.position) / (s.position - i.position), o = this.interpolate(i.color, s.color);
          return me(o(r)).formatHex();
        }
      }
      return "#000";
    }
    generateTexture() {
      const i = new ImageData(4096, 1);
      for (let s = 0; s < 4096; ++s) {
        const r = s / 4095, o = me(this.getColorAt(r)), a = s * 4;
        i.data[a] = o.r, i.data[a + 1] = o.g, i.data[a + 2] = o.b, i.data[a + 3] = 255;
      }
      return i;
    }
  }
  const Zr = "" + new URL("colored_tiles-DoIWdN30.jpg", import.meta.url).href, Jr = "" + new URL("gold-C0Fcepof.jpg", import.meta.url).href, Bf = 2048;
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
      }), _Je._tileTexture || (_Je._tileTexture = await this._loadTexture(Zr)), this.tileTexture = await this._loadTexture(Zr), this.tileTextureView = this.tileTexture.createView(), _Je._skyboxTexture || (_Je._skyboxTexture = await this._loadTexture(Jr)), this.skyboxTexture = await this._loadTexture(Jr), this.skyboxTextureView = this.skyboxTexture.createView();
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
      }), s = this.device.createShaderModule({
        code: this.shaderPassColor,
        label: "Engine ShaderModule Color"
      }), r = this.device.createShaderModule({
        code: gc,
        label: "Engine ShaderModule Count"
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
      }), h = this.device.createBindGroupLayout({
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
            o
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
            h
          ]
        }),
        vertex: {
          module: s,
          entryPoint: "vs_main"
        },
        fragment: {
          module: s,
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
          module: r,
          entryPoint: "count_unfinished"
        },
        label: "Engine ComputePipeline Count"
      }), this.bindGroupBrush = void 0, this.bindGroupMandelbrot = void 0, this.bindGroupResolve = void 0, this.bindGroupColor = void 0, this.counterBindGroup = void 0;
    }
    resize() {
      var _a2, _b, _c2, _d2, _e2, _f2, _g, _h2;
      const t = (window.devicePixelRatio || 1) * this.dprMultiplier, n = this.canvas.parentElement, i = (n == null ? void 0 : n.clientWidth) || 1, s = (n == null ? void 0 : n.clientHeight) || 1;
      this.width = Math.max(1, Math.round(i * t)), this.height = Math.max(1, Math.round(s * t));
      const r = ((_b = (_a2 = this.device) == null ? void 0 : _a2.limits) == null ? void 0 : _b.maxTextureDimension2D) ?? 8192;
      this.width = Math.min(this.width, r), this.height = Math.min(this.height, r), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = i + "px", this.canvas.style.height = s + "px", this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.neutralSize = Math.ceil(Math.sqrt(this.width * this.width + this.height * this.height));
      const o = this.neutralSize;
      (_d2 = (_c2 = this.rawTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.rawBrushTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2), (_h2 = (_g = this.resolvedTexture) == null ? void 0 : _g.destroy) == null ? void 0 : _h2.call(_g);
      const a = _Je.LAYER_COUNT, l = (v) => {
        const b = this.device.createTexture({
          size: {
            width: o,
            height: o,
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
        for (let F = 0; F < a; F++) x.push(b.createView({
          dimension: "2d",
          baseArrayLayer: F,
          arrayLayerCount: 1,
          label: v + ` Layer${F}`
        }));
        return {
          texture: b,
          arrayView: _,
          layerViews: x
        };
      }, h = l("Engine RawTexture (A)");
      this.rawTexture = h.texture, this.rawArrayView = h.arrayView, this.rawLayerViews = h.layerViews;
      const u = l("Engine RawBrushTexture (B)");
      this.rawBrushTexture = u.texture, this.rawBrushArrayView = u.arrayView, this.rawBrushLayerViews = u.layerViews;
      const f = l("Engine ResolvedTexture");
      if (this.resolvedTexture = f.texture, this.resolvedArrayView = f.arrayView, this.resolvedLayerViews = f.layerViews, this.pipelineBrush) {
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
      for (const [i, s] of t.entries()) {
        const r = n[i];
        if (!r || s.color !== r.color || s.position !== r.position) return false;
      }
      return true;
    }
    async update(t, n) {
      var _a2, _b, _c2, _d2;
      const i = performance.now();
      this.lastUpdateTime === 0 && (this.lastUpdateTime = i);
      const s = (i - this.lastUpdateTime) / 1e3;
      this.time += s, this.lastUpdateTime = i, this.needRender = !(this.areObjectsEqual(t, this.previousMandelbrot) && this.areObjectsEqual(n, this.previousRenderOptions)), n.activateWebcam ? (await this.updateWebcamTexture(), this.needRender = true) : (_a2 = this.webcamTexture) == null ? void 0 : _a2.closeWebcam(), n.activateTessellation && (this.needRender = true), n.activateAnimate && (this.needRender = true);
      const r = this.width / Math.max(1, this.height);
      let o = ((_b = this.previousMandelbrot) == null ? void 0 : _b.scale) || 1 / t.scale;
      if (o < 1 && (o = 1 / o), o = Math.sqrt(o) - 1, !this.areColorStopsEqual(n.colorStops, ((_c2 = this.previousRenderOptions) == null ? void 0 : _c2.colorStops) || []) || n.interpolationMode !== ((_d2 = this.previousRenderOptions) == null ? void 0 : _d2.interpolationMode)) {
        const F = new Ai(n.colorStops, n.interpolationMode).generateTexture();
        this.device.queue.writeTexture({
          texture: this.paletteTexture
        }, F.data, {
          bytesPerRow: F.width * 4
        }, [
          F.width,
          F.height
        ]), this.needRender = true;
      }
      const a = new Float32Array([
        n.palettePeriod,
        n.paletteOffset,
        n.tessellationLevel,
        n.shadingLevel,
        o,
        this.time,
        n.activateTessellation ? 1 : 0,
        n.activateShading ? 1 : 0,
        n.activateWebcam ? 1 : 0,
        n.activatePalette ? 1 : 0,
        n.activateSkybox ? 1 : 0,
        n.activateSmoothness ? 1 : 0,
        n.activateZebra ? 1 : 0,
        r,
        t.angle,
        n.activateAnimate ? 1 : 0,
        t.mu,
        0
      ]);
      if (this.device.queue.writeBuffer(this.uniformBufferColor, 0, a.buffer), !this.needsMoreFrames()) return;
      const l = Math.ceil(t.maxIterations), h = this.mandelbrotNavigator.compute_reference_orbit_chunk(_Je.ORBIT_CHUNK_SIZE, l), u = h.count, f = new Float32Array(ma.buffer, h.ptr, h.count * 4);
      h.offset < l && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, f, 0);
      const v = Math.min(l, u), b = new Float32Array([
        t.dx,
        t.dy,
        t.mu,
        t.scale,
        r,
        t.angle,
        this.iterationBatchSize,
        t.epsilon,
        n.antialiasLevel,
        0,
        v,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, b.buffer), this.orbitIncomplete = u < l;
      const _ = h.offset === 0 && !!this.prevFrameMandelbrot;
      this.clearHistoryNextFrame = false, (!this.prevFrameMandelbrot || _) && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== t.mu && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== t.scale && (this.clearHistoryNextFrame = true), this.previousMandelbrot = structuredClone(t), this.previousRenderOptions = structuredClone(n);
    }
    async render() {
      if (!this.needsMoreFrames() || !this.pipelineBrush || !this.pipelineMandelbrot || !this.pipelineResolve || !this.pipelineColor || !this.bindGroupBrush || !this.bindGroupMandelbrot || !this.bindGroupResolve || !this.bindGroupColor || !this.previousMandelbrot) return;
      const t = this.width / Math.max(1, this.height), n = If(Bf), i = n, s = this.clearHistoryNextFrame ? 1 : 0;
      let r = 0, o = 0;
      if (!this.clearHistoryNextFrame && this.prevFrameMandelbrot) {
        const U = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx, j = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy, se = this.neutralSize, ue = Math.sqrt(t * t + 1);
        r = -(U * se) / (2 * this.previousMandelbrot.scale * ue), o = j * se / (2 * this.previousMandelbrot.scale * ue);
      }
      this.clearHistoryNextFrame ? (this.cumulativeShiftX = 0, this.cumulativeShiftY = 0) : (this.cumulativeShiftX += Math.round(r), this.cumulativeShiftY += Math.round(o));
      const a = (this.cumulativeShiftX % i + i) % i, l = (this.cumulativeShiftY % i + i) % i, h = new Float32Array([
        t,
        this.previousMandelbrot.angle,
        s,
        n,
        i,
        r,
        o,
        this.previousMandelbrot.mu,
        a,
        l
      ]);
      this.device.queue.writeBuffer(this.uniformBufferBrush, 0, h.buffer);
      const u = new Float32Array([
        this.previousMandelbrot.mu,
        a,
        l
      ]);
      this.device.queue.writeBuffer(this.uniformBufferResolve, 0, u.buffer);
      const f = this.device.createCommandEncoder(), v = (U) => U.map((j) => ({
        view: j,
        clearValue: {
          r: 0,
          g: 0,
          b: 0,
          a: 0
        },
        loadOp: "clear",
        storeOp: "store"
      })), b = f.beginRenderPass({
        colorAttachments: v(this.rawBrushLayerViews)
      });
      b.setPipeline(this.pipelineBrush), b.setBindGroup(0, this.bindGroupBrush), b.draw(6, 1, 0, 0), b.end();
      const _ = f.beginRenderPass({
        colorAttachments: v(this.rawLayerViews)
      });
      if (_.setPipeline(this.pipelineMandelbrot), _.setBindGroup(0, this.bindGroupMandelbrot), _.draw(6, 1, 0, 0), _.end(), this.pipelineCount && this.counterBindGroup && this.counterBuffer && this.counterReadBuffer && this.uniformBufferCount) {
        const U = this.previousMandelbrot.mu;
        this.device.queue.writeBuffer(this.uniformBufferCount, 0, new Float32Array([
          U,
          t,
          this.previousMandelbrot.angle
        ])), f.clearBuffer(this.counterBuffer, 0, 4);
        const j = f.beginComputePass();
        j.setPipeline(this.pipelineCount), j.setBindGroup(0, this.counterBindGroup), j.dispatchWorkgroups(Math.ceil(this.neutralSize / 16), Math.ceil(this.neutralSize / 16)), j.end(), f.copyBufferToBuffer(this.counterBuffer, 0, this.counterReadBuffer, 0, 4);
      }
      const x = f.beginRenderPass({
        colorAttachments: v(this.resolvedLayerViews)
      });
      x.setPipeline(this.pipelineResolve), x.setBindGroup(0, this.bindGroupResolve), x.draw(6, 1, 0, 0), x.end();
      const F = this.ctx.getCurrentTexture().createView(), V = f.beginRenderPass({
        colorAttachments: [
          {
            view: F,
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
      const R = performance.now();
      this.device.queue.submit([
        f.finish()
      ]), await this.device.queue.onSubmittedWorkDone();
      const E = performance.now() - R;
      if (this.gpuFrameTimeMs = E, E > 0) {
        const U = _Je.TARGET_FRAME_MS / E, j = this.iterationBatchSize * U;
        this.iterationBatchSize = Math.round(Math.min(_Je.MAX_BATCH_SIZE, Math.max(_Je.MIN_BATCH_SIZE, this.iterationBatchSize * 0.7 + j * 0.3)));
      }
      await this.counterReadBuffer.mapAsync(GPUMapMode.READ);
      const O = new Uint32Array(this.counterReadBuffer.getMappedRange());
      if (this.unfinishedPixelCount = O[0], this.counterReadBuffer.unmap(), this.prevFrameMandelbrot = {
        ...this.previousMandelbrot
      }, this.snapshotCallback) {
        try {
          const U = this.snapshotDestWidth ?? 256, j = Math.round(U * 9 / 16), se = this.device.createTexture({
            size: [
              U,
              j,
              1
            ],
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
          });
          {
            const $ = this.device.createCommandEncoder(), X = $.beginRenderPass({
              colorAttachments: [
                {
                  view: se.createView(),
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
            X.setPipeline(this.pipelineColor), X.setBindGroup(0, this.bindGroupColor), X.draw(6, 1, 0, 0), X.end(), this.device.queue.submit([
              $.finish()
            ]);
          }
          const ue = ($) => $ + 255 & -256, q = U * 4, H = ue(q), Z = H * j, w = this.device.createBuffer({
            size: Z,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
          });
          {
            const $ = this.device.createCommandEncoder();
            $.copyTextureToBuffer({
              texture: se
            }, {
              buffer: w,
              offset: 0,
              bytesPerRow: H
            }, {
              width: U,
              height: j,
              depthOrArrayLayers: 1
            }), this.device.queue.submit([
              $.finish()
            ]);
          }
          await this.device.queue.onSubmittedWorkDone(), await w.mapAsync(GPUMapMode.READ);
          const k = w.getMappedRange(), M = new Uint8ClampedArray(U * j * 4), B = new Uint8Array(k);
          for (let $ = 0; $ < j; ++$) for (let X = 0; X < U; ++X) {
            const xe = $ * H + X * 4, Pe = ($ * U + X) * 4;
            M[Pe + 0] = B[xe + 2], M[Pe + 1] = B[xe + 1], M[Pe + 2] = B[xe + 0], M[Pe + 3] = B[xe + 3];
          }
          const D = document.createElement("canvas");
          D.width = U, D.height = j, D.getContext("2d").putImageData(new ImageData(M, U, j), 0, 0), w.unmap(), this.snapshotCallback(D.toDataURL("image/png"));
        } catch {
          this.snapshotCallback("");
        }
        this.snapshotCallback = void 0, this.snapshotDestWidth = void 0;
      }
    }
    destroy() {
      var _a2, _b, _c2, _d2, _e2, _f2, _g, _h2, _i2, _j, _k, _l2, _m, _n2, _o2, _p2, _q, _r2, _s2, _t2, _u2, _v, _w, _x, _y, _z, _A;
      this.stopRenderLoop(), (_b = (_a2 = this.rawTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.rawBrushTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.resolvedTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2), (_h2 = (_g = this.mandelbrotReferenceBuffer) == null ? void 0 : _g.destroy) == null ? void 0 : _h2.call(_g), (_j = (_i2 = this.uniformBufferMandelbrot) == null ? void 0 : _i2.destroy) == null ? void 0 : _j.call(_i2), (_l2 = (_k = this.uniformBufferColor) == null ? void 0 : _k.destroy) == null ? void 0 : _l2.call(_k), (_n2 = (_m = this.uniformBufferBrush) == null ? void 0 : _m.destroy) == null ? void 0 : _n2.call(_m), (_p2 = (_o2 = this.uniformBufferResolve) == null ? void 0 : _o2.destroy) == null ? void 0 : _p2.call(_o2), (_r2 = (_q = this.counterBuffer) == null ? void 0 : _q.destroy) == null ? void 0 : _r2.call(_q), (_t2 = (_s2 = this.counterReadBuffer) == null ? void 0 : _s2.destroy) == null ? void 0 : _t2.call(_s2), (_v = (_u2 = this.uniformBufferCount) == null ? void 0 : _u2.destroy) == null ? void 0 : _v.call(_u2), (_w = this.webcamTexture) == null ? void 0 : _w.closeWebcam(), (_y = (_x = this.webcamTileTexture) == null ? void 0 : _x.destroy) == null ? void 0 : _y.call(_x), (_A = (_z = this.paletteTexture) == null ? void 0 : _z.destroy) == null ? void 0 : _A.call(_z);
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
      } catch (r) {
        throw console.warn("\xC9chec du chargement de la texture : " + t, r), r;
      }
      const i = await createImageBitmap(n), s = this.device.createTexture({
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
        texture: s
      }, [
        i.width,
        i.height
      ]), s;
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
  const Of = kt({
    __name: "Mandelbrot",
    props: Gs({
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
      const n = ee(null);
      let i = null, s = null, r, o = false;
      const a = Tt(e, "cx"), l = Tt(e, "cy"), h = Tt(e, "scale"), u = Tt(e, "angle");
      Mt(() => [
        a.value,
        l.value,
        h.value,
        u.value
      ], ([x, F, V, R], [E, O, U, j]) => {
        o || r && (!x || !F || !V || ((x !== E || F !== O) && r.origin(x, F), V !== U && r.scale(V), R !== j && r.angle(Number(R))));
      }, {
        flush: "sync"
      });
      const f = e;
      Mt(() => f.dprMultiplier, (x) => {
        s && (s.dprMultiplier = x, _());
      });
      async function v() {
        if (!s || !r) return;
        const x = r.step();
        if (!x) return;
        const [F, V] = x, [R, E, O, U] = r.get_params();
        o = true, a.value = R, l.value = E, h.value = O, u.value = parseFloat(U), await Fi(), o = false;
        const j = Math.min(Math.max(100, 1e3 * f.maxIterationMultiplier * Math.log2(1 / parseFloat(O))), 1e5);
        await s.update({
          cx: R,
          cy: E,
          dx: parseFloat(F),
          dy: parseFloat(V),
          mu: f.mu,
          scale: parseFloat(O),
          angle: parseFloat(U),
          maxIterations: j,
          epsilon: f.epsilon
        }, {
          shadingLevel: f.shadingLevel,
          tessellationLevel: f.tessellationLevel,
          antialiasLevel: f.antialiasLevel,
          palettePeriod: f.palettePeriod,
          paletteOffset: f.paletteOffset,
          colorStops: oe(f.colorStops),
          interpolationMode: f.interpolationMode,
          activateShading: f.activateShading,
          activateTessellation: f.activateTessellation,
          activateWebcam: f.activateWebcam,
          activatePalette: f.activatePalette,
          activateSkybox: f.activateSkybox,
          activateSmoothness: f.activateSmoothness,
          activateZebra: f.activateZebra,
          activateAnimate: f.activateAnimate
        }), await s.render();
      }
      async function b() {
        if (n.value) return i = n.value, r = new Ts(a.value, l.value, h.value, Number(u.value)), r.origin(a.value, l.value), r.scale(h.value), r.angle(Number(u.value)), s = new Je(i, {
          activatePalette: f.activatePalette,
          activateSkybox: f.activateSkybox,
          shadingLevel: f.shadingLevel,
          tessellationLevel: f.tessellationLevel,
          antialiasLevel: f.antialiasLevel,
          palettePeriod: f.palettePeriod,
          paletteOffset: f.paletteOffset,
          colorStops: f.colorStops,
          interpolationMode: f.interpolationMode,
          activateShading: f.activateShading,
          activateTessellation: f.activateTessellation,
          activateWebcam: f.activateWebcam,
          activateSmoothness: f.activateSmoothness,
          activateZebra: f.activateZebra,
          activateAnimate: f.activateAnimate
        }), s.initialize(r);
      }
      async function _() {
        if (!n.value || !s) return;
        const x = n.value.getBoundingClientRect();
        n.value.width = x.width, n.value.height = x.height, s.resize();
      }
      return At(async () => {
        await b(), window.addEventListener("resize", _), await _(), s && s.startRenderLoop(v);
      }), Mn(() => {
        s == null ? void 0 : s.stopRenderLoop(), window.removeEventListener("resize", _);
      }), t({
        getCanvas: () => n.value,
        getEngine: () => s,
        getNavigator: () => r,
        translate: (x, F) => r == null ? void 0 : r.translate(x, F),
        translateDirect: (x, F) => r == null ? void 0 : r.translate_direct(x, F),
        rotate: (x) => r == null ? void 0 : r.rotate(x),
        angle: (x) => r == null ? void 0 : r.angle(x),
        zoom: (x) => r == null ? void 0 : r.zoom(x),
        step: () => r == null ? void 0 : r.step(),
        getParams: () => r == null ? void 0 : r.get_params(),
        drawOnce: async () => v(),
        resize: async () => _(),
        initialize: async () => b()
      }), (x, F) => (ae(), le("canvas", {
        ref_key: "canvasRef",
        ref: n
      }, null, 512));
    }
  }), Nf = {
    class: "mobile-nav-controls"
  }, Uf = {
    key: 0,
    class: "directional-controls"
  }, Ff = kt({
    __name: "MobileNavigationControls",
    props: {
      mandelbrotRef: {}
    },
    setup(e) {
      const t = e, n = ee(false), i = ee(null);
      let s = null;
      const r = () => {
        n.value = !n.value, n.value || a();
      }, o = (b) => {
        b.preventDefault(), b.stopPropagation(), r();
      }, a = () => {
        i.value = null, s !== null && (clearInterval(s), s = null);
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
        x(), s = window.setInterval(x, 16);
      }, h = (b) => {
        i.value = `rotate-${b}`;
        const _ = 0.025, x = () => {
          t.mandelbrotRef && (b === "left" ? t.mandelbrotRef.rotate(_) : t.mandelbrotRef.rotate(-_));
        };
        x(), s = window.setInterval(x, 16);
      }, u = (b) => {
        i.value = `zoom-${b}`;
        const _ = 0.6, x = () => {
          t.mandelbrotRef && (b === "in" ? t.mandelbrotRef.zoom(_) : t.mandelbrotRef.zoom(1 / _));
        };
        x(), s = window.setInterval(x, 16);
      }, f = (b, _) => {
        b.preventDefault(), _();
      }, v = (b) => {
        b.preventDefault(), a();
      };
      return (b, _) => (ae(), le("div", Nf, [
        c("button", {
          class: ce([
            "nav-button compass-button",
            {
              active: n.value
            }
          ]),
          onClick: r,
          onTouchend: o,
          "aria-label": "Toggle navigation"
        }, [
          ..._[16] || (_[16] = [
            ca('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-82fd1be4><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-82fd1be4></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-82fd1be4></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-82fd1be4>N</text></svg>', 1)
          ])
        ], 34),
        Te(Uu, {
          name: "fade"
        }, {
          default: Ao(() => [
            n.value ? (ae(), le("div", Uf, [
              c("button", {
                class: ce([
                  "nav-button direction-button north",
                  {
                    active: i.value === "north"
                  }
                ]),
                onTouchstart: _[0] || (_[0] = (x) => f(x, () => l("north"))),
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
                onTouchstart: _[2] || (_[2] = (x) => f(x, () => l("south"))),
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
                onTouchstart: _[4] || (_[4] = (x) => f(x, () => l("west"))),
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
                onTouchstart: _[6] || (_[6] = (x) => f(x, () => l("east"))),
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
                onTouchstart: _[8] || (_[8] = (x) => f(x, () => h("left"))),
                onTouchend: v,
                onMousedown: _[9] || (_[9] = (x) => h("left")),
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
                onTouchstart: _[10] || (_[10] = (x) => f(x, () => h("right"))),
                onTouchend: v,
                onMousedown: _[11] || (_[11] = (x) => h("right")),
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
                onTouchstart: _[12] || (_[12] = (x) => f(x, () => u("out"))),
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
                onTouchstart: _[14] || (_[14] = (x) => f(x, () => u("in"))),
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
            ])) : Dt("", true)
          ]),
          _: 1
        })
      ]));
    }
  }), En = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [i, s] of t) n[i] = s;
    return n;
  }, Df = En(Ff, [
    [
      "__scopeId",
      "data-v-82fd1be4"
    ]
  ]), $f = {
    style: {
      position: "relative",
      width: "100%",
      height: "100%"
    }
  }, ci = 0.01, Qr = 0.025, Gf = kt({
    __name: "MandelbrotController",
    props: Gs({
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
      angleModifiers: {}
    }),
    emits: [
      "update:cx",
      "update:cy",
      "update:scale",
      "update:angle"
    ],
    setup(e, { expose: t }) {
      const n = Tt(e, "cx"), i = Tt(e, "cy"), s = Tt(e, "scale"), r = Tt(e, "angle"), o = e, a = ee(null), l = {};
      t({
        getCanvas: R,
        getEngine: () => {
          var _a2;
          return ((_a2 = a.value) == null ? void 0 : _a2.getEngine()) ?? null;
        }
      });
      let h = false, u = false, f = 0, v = 0, b = 0, _ = 0, x = 0, F = false, V = null;
      function R() {
        var _a2;
        return ((_a2 = a.value) == null ? void 0 : _a2.getCanvas()) ?? null;
      }
      function E(M) {
        const B = R();
        if (!B) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const D = B.getBoundingClientRect();
        return {
          x: M.clientX - D.left,
          y: M.clientY - D.top,
          width: D.width,
          height: D.height
        };
      }
      function O(M) {
        var _a2, _b, _c2;
        const B = (_b = (_a2 = M.target) == null ? void 0 : _a2.tagName) == null ? void 0 : _b.toLowerCase();
        B === "input" || B === "textarea" || B === "select" || ((_c2 = M.target) == null ? void 0 : _c2.isContentEditable) || (l[M.code] = true);
      }
      function U(M) {
        l[M.code] = false;
      }
      function j(M) {
        var _a2, _b;
        M.preventDefault();
        const B = 0.6;
        M.deltaY < 0 ? (_a2 = a.value) == null ? void 0 : _a2.zoom(B) : (_b = a.value) == null ? void 0 : _b.zoom(1 / B);
      }
      function se(M) {
        if (M.button === 2) u = true;
        else {
          h = true;
          const B = E(M);
          f = B.x, v = B.y;
        }
      }
      function ue(M) {
        var _a2, _b;
        const B = E(M);
        if (u) {
          const Le = R();
          if (!Le) return;
          const Re = Le.getBoundingClientRect(), zt = Re.width / 2, Ht = Re.height / 2, on = B.x, vt = B.y, Bt = Math.atan2(vt - Ht, on - zt);
          (_a2 = a.value) == null ? void 0 : _a2.angle(Bt);
          return;
        }
        if (!h) return;
        const D = B.width, $ = B.height, X = D / $, xe = (B.x - f) / D * 2, Pe = (B.y - v) / $ * 2;
        (_b = a.value) == null ? void 0 : _b.translateDirect(-xe * X, Pe), f = B.x, v = B.y;
      }
      function q(M) {
        M.button === 2 ? u = false : h = false;
      }
      function H(M) {
        var _a2;
        const B = R();
        if (B) {
          if (M.touches.length === 1) {
            h = true;
            const D = M.touches[0], $ = B.getBoundingClientRect();
            f = D.clientX - $.left, v = D.clientY - $.top;
          } else if (M.touches.length === 2) {
            h = false, F = true;
            const [D, $] = M.touches;
            b = Math.hypot($.clientX - D.clientX, $.clientY - D.clientY), _ = Math.atan2($.clientY - D.clientY, $.clientX - D.clientX);
            const X = (_a2 = a.value) == null ? void 0 : _a2.getParams();
            x = X ? parseFloat(X[3]) : 0;
          }
        }
      }
      function Z(M) {
        var _a2, _b, _c2;
        const B = R();
        if (B) {
          if (h && M.touches.length === 1) {
            const D = M.touches[0], $ = B.getBoundingClientRect(), X = D.clientX - $.left, xe = D.clientY - $.top, Pe = $.width, Le = $.height, Re = Pe / Le, zt = (X - f) / Pe * 2, Ht = (xe - v) / Le * 2;
            (_a2 = a.value) == null ? void 0 : _a2.translateDirect(-zt * Re, Ht), f = X, v = xe;
          } else if (F && M.touches.length === 2) {
            const [D, $] = M.touches, X = Math.hypot($.clientX - D.clientX, $.clientY - D.clientY), xe = Math.atan2($.clientY - D.clientY, $.clientX - D.clientX), Pe = b / X;
            (_b = a.value) == null ? void 0 : _b.zoom(Pe);
            const Le = xe - _;
            (_c2 = a.value) == null ? void 0 : _c2.angle(x + Le);
          }
        }
      }
      function w(M) {
        M.touches.length === 0 && (h = false, F = false);
      }
      function k() {
        var _a2, _b, _c2, _d2, _e2, _f2, _g, _h2;
        l.KeyW && ((_a2 = a.value) == null ? void 0 : _a2.translate(0, ci)), l.KeyS && ((_b = a.value) == null ? void 0 : _b.translate(0, -ci)), l.KeyA && ((_c2 = a.value) == null ? void 0 : _c2.translate(-ci, 0)), l.KeyD && ((_d2 = a.value) == null ? void 0 : _d2.translate(ci, 0)), l.KeyQ && ((_e2 = a.value) == null ? void 0 : _e2.rotate(Qr)), l.KeyE && ((_f2 = a.value) == null ? void 0 : _f2.rotate(-Qr));
        const M = 0.6;
        l.KeyR && ((_g = a.value) == null ? void 0 : _g.zoom(M)), l.KeyF && ((_h2 = a.value) == null ? void 0 : _h2.zoom(1 / M)), V = window.setTimeout(k, 16);
      }
      return At(async () => {
        const M = R();
        M && (window.addEventListener("keydown", O), window.addEventListener("keyup", U), M.addEventListener("wheel", j, {
          passive: false
        }), M.addEventListener("mousedown", se), M.addEventListener("contextmenu", (B) => B.preventDefault()), window.addEventListener("mousemove", ue), window.addEventListener("mouseup", q), M.addEventListener("touchstart", H, {
          passive: false
        }), M.addEventListener("touchmove", Z, {
          passive: false
        }), M.addEventListener("touchend", w, {
          passive: false
        }), k());
      }), Mn(() => {
        V !== null && clearTimeout(V);
        const M = R();
        window.removeEventListener("keydown", O), window.removeEventListener("keyup", U), window.removeEventListener("mousemove", ue), window.removeEventListener("mouseup", q), M && (M.removeEventListener("wheel", j), M.removeEventListener("mousedown", se), M.removeEventListener("contextmenu", (B) => B.preventDefault()), M.removeEventListener("touchstart", H), M.removeEventListener("touchmove", Z), M.removeEventListener("touchend", w));
      }), (M, B) => (ae(), le("div", $f, [
        Te(Of, {
          ref_key: "mandelbrotRef",
          ref: a,
          scale: s.value,
          "onUpdate:scale": B[0] || (B[0] = (D) => s.value = D),
          angle: r.value,
          "onUpdate:angle": B[1] || (B[1] = (D) => r.value = D),
          cx: n.value,
          "onUpdate:cx": B[2] || (B[2] = (D) => n.value = D),
          cy: i.value,
          "onUpdate:cy": B[3] || (B[3] = (D) => i.value = D),
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
          activateAnimate: o.activateAnimate,
          paletteOffset: o.paletteOffset,
          dprMultiplier: o.dprMultiplier,
          maxIterationMultiplier: o.maxIterationMultiplier,
          interpolationMode: o.interpolationMode
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
          "mandelbrot-ref": a.value
        }, null, 8, [
          "mandelbrot-ref"
        ])
      ]));
    }
  }), Vf = En(Gf, [
    [
      "__scopeId",
      "data-v-a13c973e"
    ]
  ]), Hf = [
    "fill",
    "stroke"
  ], Wf = kt({
    __name: "GlissiereHandle",
    props: {
      stop: {}
    },
    emits: [
      "update:position",
      "select"
    ],
    setup(e, { emit: t }) {
      const n = e, i = t, s = ee(null);
      function r(h) {
        let u = h.replace("#", "");
        u.length === 3 && (u = u.split("").map((_) => _ + _).join(""));
        const f = parseInt(u.substring(0, 2), 16) / 255, v = parseInt(u.substring(2, 4), 16) / 255, b = parseInt(u.substring(4, 6), 16) / 255;
        return 0.299 * f + 0.587 * v + 0.114 * b;
      }
      const o = Ae(() => r(n.stop.color) > 0.5 ? "#222" : "#fff");
      function a(h) {
        h.preventDefault(), i("select");
        const u = h.clientX, f = n.stop.position, v = s.value;
        if (!v) return;
        const _ = v.parentElement.getBoundingClientRect();
        function x(V) {
          const R = V.clientX - u;
          let E = f + R / _.width;
          E = Math.max(0, Math.min(1, E)), i("update:position", E);
        }
        function F() {
          window.removeEventListener("mousemove", x), window.removeEventListener("mouseup", F);
        }
        window.addEventListener("mousemove", x), window.addEventListener("mouseup", F);
      }
      function l(h) {
        h.preventDefault(), i("select");
        const u = h.touches[0];
        if (!u) return;
        const f = u.clientX, v = n.stop.position, b = s.value;
        if (!b) return;
        const x = b.parentElement.getBoundingClientRect();
        function F(R) {
          const E = R.touches[0];
          if (!E) return;
          const O = E.clientX - f;
          let U = v + O / x.width;
          U = Math.max(0, Math.min(1, U)), i("update:position", U);
        }
        function V() {
          window.removeEventListener("touchmove", F), window.removeEventListener("touchend", V), window.removeEventListener("touchcancel", V);
        }
        window.addEventListener("touchmove", F, {
          passive: false
        }), window.addEventListener("touchend", V), window.addEventListener("touchcancel", V);
      }
      return (h, u) => (ae(), le("svg", {
        ref_key: "svgRef",
        ref: s,
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
          stroke: o.value,
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
  }, Zf = 12, Jf = kt({
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
      const n = e, i = t, s = ee(null), r = Ae(() => new Ai(n.colorStops, n.interpolationMode).generateTexture());
      Mt(r, (u) => {
        if (!s.value || !u) return;
        const f = s.value.getContext("2d");
        if (!f) return;
        f.clearRect(0, 0, 4096, 32);
        const v = document.createElement("canvas");
        v.width = u.width, v.height = u.height, v.getContext("2d").putImageData(u, 0, 0), f.drawImage(v, 0, 0, 4096, 1, 0, 0, 4096, 32);
      }), At(() => {
        Fi(() => {
          const u = r.value;
          if (!s.value || !u) return;
          const f = s.value.getContext("2d");
          if (!f) return;
          f.clearRect(0, 0, 4096, 32);
          const v = document.createElement("canvas");
          v.width = u.width, v.height = u.height, v.getContext("2d").putImageData(u, 0, 0), f.drawImage(v, 0, 0, 4096, 1, 0, 0, 4096, 32);
        });
      });
      function o(u) {
        var _a2;
        if (n.colorStops.length >= Zf) return;
        const f = s.value;
        if (!f) return;
        const v = f.getBoundingClientRect();
        let b = (u.clientX - v.left) / v.width;
        b = Math.max(0, Math.min(1, b));
        const _ = a.value !== null && ((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff";
        n.colorStops.push({
          color: _,
          position: b
        }), i("update:colorStops", n.colorStops), a.value = n.colorStops.length - 1;
      }
      const a = ee(0);
      function l(u) {
        a.value = u;
      }
      const h = Ae({
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
      return (u, f) => (ae(), le("div", jf, [
        c("div", {
          class: "canvas-row",
          style: {
            position: "relative"
          },
          onDblclick: o
        }, [
          c("canvas", {
            ref_key: "canvasRef",
            ref: s,
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
            (ae(true), le(ze, null, bn(e.colorStops, (v, b) => (ae(), la(Wf, {
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
            value: h.value,
            onInput: f[0] || (f[0] = (v) => h.value = v.target.value),
            class: "native-color-input"
          }, null, 40, Kf),
          c("span", Xf, ne(h.value), 1)
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
  }, sd = {
    style: {
      "font-family": "monospace",
      "min-width": "7.5em",
      display: "inline-block"
    }
  }, rd = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, od = {
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
  }, sp = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, rp = [
    "onClick"
  ], op = [
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
  }, fi = "mandelbrot_presets", di = "mandelbrot_palettes", Rp = kt({
    __name: "Settings",
    props: Gs({
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
      const t = e, n = Tt(e, "modelValue"), i = Ae(() => ((n.value.angle * 180 / Math.PI % 360 + 360) % 360).toFixed(2)), s = Ae({
        get: () => (n.value.angle * 180 / Math.PI % 360 + 360) % 360,
        set: (T) => {
          n.value.angle = T % 360 * Math.PI / 180;
        }
      }), r = Ae({
        get: () => (Math.log10(n.value.palettePeriod || 0.01) + 2) / 5,
        set: (T) => {
          n.value.palettePeriod = Number((10 ** (T * 5 - 2)).toPrecision(6));
        }
      }), o = Ae({
        get: () => {
          const T = Number(n.value.scale), p = T > 0 ? -Math.log2(T) : 126;
          return isFinite(p) ? Math.min(Math.max(Math.round(p), 1), 126) : 1;
        },
        set: (T) => {
          const p = Math.min(Math.max(Math.round(T), 1), 126);
          n.value.scale = (2 ** -p).toPrecision(10);
        }
      });
      function a(T, p) {
        const [m, G] = T.split(".");
        return G ? m + "." + G.slice(0, p) : m;
      }
      function l(T, p = "lab") {
        const m = document.createElement("canvas");
        m.width = 320, m.height = 40;
        const G = m.getContext("2d");
        if (!G) return "";
        if (T.length === 0) return G.fillStyle = "#000", G.fillRect(0, 0, m.width, m.height), m.toDataURL("image/png");
        const ve = new Ai(T, p).generateTexture(), Se = document.createElement("canvas");
        Se.width = ve.width, Se.height = 1;
        const Oe = Se.getContext("2d");
        return Oe ? (Oe.putImageData(ve, 0, 0), G.drawImage(Se, 0, 0, m.width, m.height), m.toDataURL("image/png")) : "";
      }
      const h = ee(null), u = ee(""), f = ee([]), v = ee(""), b = ee([]), _ = ee(""), x = ee(false);
      function F() {
        const T = u.value.trim();
        if (T && window.confirm(`Supprimer le preset "${T}" ? Cette action est irr\xE9versible.`)) {
          const p = f.value.findIndex((m) => m.name === T);
          p >= 0 && (f.value.splice(p, 1), localStorage.setItem(fi, JSON.stringify(f.value)), R.value = "", u.value = "");
        }
      }
      async function V() {
        t.engine && (h.value = await t.engine.getSnapshotPng(256));
      }
      const R = ee(""), E = ee(false), O = Ae(() => f.value.find((T) => T.name === R.value)), U = Ae(() => {
        var _a2;
        return (_a2 = O.value) == null ? void 0 : _a2.thumbnail;
      });
      function j(T) {
        M(T.name), E.value = false;
      }
      async function se() {
        if (!u.value.trim()) return;
        let T, p = (/* @__PURE__ */ new Date()).toISOString();
        try {
          t.engine && (T = await t.engine.getSnapshotPng(256));
        } catch {
        }
        const m = {
          name: u.value.trim(),
          value: n.value,
          thumbnail: T,
          date: p
        }, G = f.value.findIndex((ye) => ye.name === m.name);
        G >= 0 ? f.value[G] = m : f.value.push(m), localStorage.setItem(fi, JSON.stringify(f.value)), u.value = "";
      }
      function ue() {
        const T = localStorage.getItem(fi);
        if (T) try {
          f.value = JSON.parse(T);
        } catch {
        }
      }
      function q() {
        const T = localStorage.getItem(di);
        if (T) try {
          b.value = JSON.parse(T);
        } catch {
        }
      }
      async function H() {
        if (!v.value.trim()) return;
        let T, p = (/* @__PURE__ */ new Date()).toISOString();
        try {
          T = l(n.value.colorStops, n.value.interpolationMode);
        } catch {
        }
        const m = {
          name: v.value.trim(),
          colorStops: structuredClone(oe(n.value.colorStops)),
          thumbnail: T,
          date: p
        }, G = b.value.findIndex((ye) => ye.name === m.name);
        G >= 0 ? b.value[G] = m : b.value.push(m), localStorage.setItem(di, JSON.stringify(b.value)), v.value = "";
      }
      function Z(T) {
        const p = b.value.find((m) => m.name === T);
        p && (_.value = T, v.value = p.name, n.value.colorStops = structuredClone(oe(p.colorStops)));
      }
      function w(T) {
        Z(T.name), x.value = false;
      }
      function k() {
        const T = v.value.trim();
        if (T && window.confirm(`Supprimer la palette "${T}" ? Cette action est irr\xE9versible.`)) {
          const p = b.value.findIndex((m) => m.name === T);
          p >= 0 && (b.value.splice(p, 1), localStorage.setItem(di, JSON.stringify(b.value)), _.value = "", v.value = "");
        }
      }
      function M(T) {
        const p = f.value.find((m) => m.name === T);
        p && (R.value = T, u.value = p.name, n.value = structuredClone(oe(p.value)));
      }
      const B = Ae({
        get: () => Math.log10(n.value.mu ?? 1),
        set: (T) => {
          n.value.mu = Math.pow(10, T);
        }
      }), D = Ae({
        get: () => Math.log10(n.value.epsilon ?? 1e-8),
        set: (T) => {
          n.value.epsilon = Math.pow(10, T);
        }
      }), $ = Ae({
        get: () => Math.log10(n.value.maxIterationMultiplier ?? 1),
        set: (T) => {
          n.value.maxIterationMultiplier = Number(Math.pow(10, T).toPrecision(3));
        }
      });
      At(() => {
        ue(), q();
      });
      const X = Ae(() => b.value.find((T) => T.name === _.value)), xe = Ae(() => {
        var _a2;
        return (_a2 = X.value) == null ? void 0 : _a2.thumbnail;
      });
      Mt([
        () => t.activeTab,
        () => t.engine
      ], async ([T]) => {
        T === "navigation" && await V();
      }, {
        immediate: true
      });
      function Pe() {
        const T = JSON.stringify(f.value, null, 2), p = new Blob([
          T
        ], {
          type: "application/json"
        }), m = URL.createObjectURL(p), G = document.createElement("a");
        G.href = m, G.download = "mandelbrot-presets.json", G.click(), URL.revokeObjectURL(m);
      }
      const Le = ee(null);
      function Re() {
        var _a2;
        (_a2 = Le.value) == null ? void 0 : _a2.click();
      }
      function zt(T) {
        var _a2;
        const p = T.target, m = (_a2 = p.files) == null ? void 0 : _a2[0];
        if (!m) return;
        const G = new FileReader();
        G.onload = () => {
          try {
            const ye = JSON.parse(G.result);
            if (Array.isArray(ye)) {
              for (const ve of ye) {
                if (!ve.name || !ve.value) continue;
                const Se = f.value.findIndex((Oe) => Oe.name === ve.name);
                Se >= 0 ? f.value[Se] = ve : f.value.push(ve);
              }
              localStorage.setItem(fi, JSON.stringify(f.value));
            }
          } catch {
            window.alert("Format de fichier invalide.");
          }
        }, G.readAsText(m), p.value = "";
      }
      function Ht() {
        const T = JSON.stringify(b.value, null, 2), p = new Blob([
          T
        ], {
          type: "application/json"
        }), m = URL.createObjectURL(p), G = document.createElement("a");
        G.href = m, G.download = "mandelbrot-palettes.json", G.click(), URL.revokeObjectURL(m);
      }
      const on = ee(null);
      function vt() {
        var _a2;
        (_a2 = on.value) == null ? void 0 : _a2.click();
      }
      function Bt(T) {
        var _a2;
        const p = T.target, m = (_a2 = p.files) == null ? void 0 : _a2[0];
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
        }, G.readAsText(m), p.value = "";
      }
      const mt = ee(null), It = ee(0), tt = ee(0), an = ee(0), d = ee(0), g = ee(0), y = ee(0);
      function C() {
        mt.value === null && (mt.value = structuredClone(oe(n.value.colorStops)));
      }
      function S() {
        mt.value = null, It.value = 0, tt.value = 0, an.value = 0, d.value = 0, g.value = 0, y.value = 0;
      }
      function P(T) {
        C(), It.value = T, A();
      }
      function I(T) {
        C(), tt.value = T, A();
      }
      function z(T) {
        C(), an.value = T, A();
      }
      function A() {
        mt.value && (n.value.colorStops = mt.value.map((T) => {
          const p = me(T.color);
          if (p == null) return {
            ...T
          };
          const m = Ce(p);
          let G = (m.l || 0) + an.value;
          G = Math.max(0, Math.min(150, G));
          let ye = (m.c || 0) + tt.value;
          ye = Math.max(0, ye);
          let ve = (m.h || 0) + It.value;
          ve = (ve % 360 + 360) % 360;
          const Se = me(Ce(G, ye, ve)), Oe = Xn(Se);
          let jt = (Oe.h || 0) + y.value;
          jt = (jt % 360 + 360) % 360;
          let Pn = (Oe.s || 0) + d.value / 100;
          Pn = Math.max(0, Math.min(1, Pn));
          let ji = (Oe.l || 0) + g.value / 100;
          ji = Math.max(0, Math.min(1, ji));
          const Ba = Xn(jt, Pn, ji);
          return {
            color: me(Ba).formatHex(),
            position: T.position
          };
        }));
      }
      function L(T) {
        C(), d.value = T, A();
      }
      function Y(T) {
        C(), g.value = T, A();
      }
      function N(T) {
        C(), y.value = T, A();
      }
      const W = [
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
      function J() {
        n.value.colorStops.length !== 0 && (n.value.colorStops = n.value.colorStops.map((T) => ({
          color: T.color,
          position: 1 - T.position
        })).sort((T, p) => T.position - p.position), S());
      }
      function re() {
        if (n.value.colorStops.length === 0) return;
        const T = n.value.colorStops.map((m) => ({
          color: m.color,
          position: m.position * 0.5
        })), p = n.value.colorStops.map((m) => ({
          color: m.color,
          position: 0.5 + m.position * 0.5
        }));
        n.value.colorStops = [
          ...T,
          ...p
        ].sort((m, G) => m.position - G.position), S();
      }
      function ge() {
        if (n.value.colorStops.length === 0) return;
        const T = n.value.colorStops.map((m) => ({
          color: m.color,
          position: m.position * 0.5
        })), p = n.value.colorStops.map((m) => ({
          color: m.color,
          position: 1 - m.position * 0.5
        }));
        n.value.colorStops = [
          ...T,
          ...p
        ].sort((m, G) => m.position - G.position), S();
      }
      function fe() {
        const T = n.value.colorStops.slice().sort((m, G) => m.position - G.position);
        if (T.length < 2) return;
        const p = 1 / (T.length - 1);
        n.value.colorStops = T.map((m, G) => ({
          color: m.color,
          position: Number((G * p).toFixed(6))
        })), S();
      }
      function Be() {
        var _a2;
        const T = Ce(me(((_a2 = n.value.colorStops[0]) == null ? void 0 : _a2.color) || "#3273dc")), p = T.h || 0, m = T.c || 50, G = [], ye = 5;
        for (let ve = 0; ve < ye; ve++) {
          const Se = ve / (ye - 1), Oe = 15 + Se * 85, jt = Ce(Oe, m * (0.5 + 0.5 * Math.sin(Se * Math.PI)), p);
          G.push({
            color: me(jt).formatHex(),
            position: Se
          });
        }
        n.value.colorStops = G, S();
      }
      function Ie() {
        var _a2;
        const T = Ce(me(((_a2 = n.value.colorStops[0]) == null ? void 0 : _a2.color) || "#3273dc")), p = T.h || 0, m = (p + 180) % 360, G = T.c || 60;
        n.value.colorStops = [
          {
            color: me(Ce(25, G, p)).formatHex(),
            position: 0
          },
          {
            color: me(Ce(60, G, p)).formatHex(),
            position: 0.25
          },
          {
            color: me(Ce(90, G * 0.3, p)).formatHex(),
            position: 0.5
          },
          {
            color: me(Ce(60, G, m)).formatHex(),
            position: 0.75
          },
          {
            color: me(Ce(25, G, m)).formatHex(),
            position: 1
          }
        ], S();
      }
      function Ke() {
        var _a2;
        const T = Ce(me(((_a2 = n.value.colorStops[0]) == null ? void 0 : _a2.color) || "#3273dc")), p = T.h || 0, m = T.c || 60, G = 60, ye = 6, ve = [];
        for (let Se = 0; Se < ye; Se++) {
          const Oe = Se / (ye - 1), jt = ((p - G / 2 + Oe * G) % 360 + 360) % 360, Pn = 30 + Oe * 55;
          ve.push({
            color: me(Ce(Pn, m, jt)).formatHex(),
            position: Oe
          });
        }
        n.value.colorStops = ve, S();
      }
      function Xe() {
        var _a2;
        const T = Ce(me(((_a2 = n.value.colorStops[0]) == null ? void 0 : _a2.color) || "#3273dc")), p = T.h || 0, m = T.c || 60;
        n.value.colorStops = [
          {
            color: me(Ce(30, m, p)).formatHex(),
            position: 0
          },
          {
            color: me(Ce(70, m, p)).formatHex(),
            position: 0.17
          },
          {
            color: me(Ce(70, m, (p + 120) % 360)).formatHex(),
            position: 0.33
          },
          {
            color: me(Ce(90, m * 0.3, (p + 180) % 360)).formatHex(),
            position: 0.5
          },
          {
            color: me(Ce(70, m, (p + 240) % 360)).formatHex(),
            position: 0.67
          },
          {
            color: me(Ce(30, m, (p + 240) % 360)).formatHex(),
            position: 1
          }
        ], S();
      }
      function Wt() {
        const T = 4 + Math.floor(Math.random() * 4), p = [];
        for (let m = 0; m < T; m++) {
          const G = m / (T - 1), ye = Math.random() * 360, ve = 30 + Math.random() * 80, Se = 15 + Math.random() * 80;
          p.push({
            color: me(Ce(Se, ve, ye)).formatHex(),
            position: G
          });
        }
        n.value.colorStops = p, S();
      }
      return (T, p) => {
        var _a2;
        return ae(), le("div", ed, [
          e.activeTab === "navigation" ? (ae(), le("div", td, [
            c("div", nd, [
              c("span", null, [
                p[32] || (p[32] = we("Cx: ", -1)),
                c("span", null, ne(a(n.value.cx, 38)), 1)
              ]),
              p[34] || (p[34] = c("br", null, null, -1)),
              c("span", null, [
                p[33] || (p[33] = we("Cy: ", -1)),
                c("span", null, ne(a(n.value.cy, 38)), 1)
              ])
            ]),
            c("div", id, [
              c("span", null, [
                p[35] || (p[35] = we("\xC9chelle\xA0: ", -1)),
                c("span", sd, ne(Number(n.value.scale).toExponential(2)), 1)
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
                "onUpdate:modelValue": p[0] || (p[0] = (m) => o.value = m)
              }, null, 512), [
                [
                  nt,
                  o.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            c("div", rd, [
              c("span", null, [
                p[36] || (p[36] = we("Angle\xA0: ", -1)),
                c("span", od, ne(i.value) + "\xB0", 1)
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
                "onUpdate:modelValue": p[1] || (p[1] = (m) => s.value = m)
              }, null, 512), [
                [
                  nt,
                  s.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ])
          ])) : e.activeTab === "presets" ? (ae(), le("div", ad, [
            c("div", ld, [
              p[38] || (p[38] = c("label", {
                class: "label"
              }, "Presets enregistr\xE9s", -1)),
              c("div", {
                class: ce([
                  "dropdown",
                  {
                    "is-active": E.value
                  }
                ]),
                style: {
                  width: "100%"
                }
              }, [
                c("div", ud, [
                  c("button", {
                    class: "button is-fullwidth",
                    onClick: p[2] || (p[2] = (m) => E.value = !E.value),
                    "aria-haspopup": "true",
                    "aria-controls": "dropdown-menu-presets",
                    type: "button"
                  }, [
                    c("span", cd, [
                      U.value ? (ae(), le("img", {
                        key: 0,
                        src: U.value,
                        alt: "miniature",
                        style: {
                          height: "32px",
                          width: "56px",
                          "object-fit": "cover",
                          "margin-right": "8px",
                          "border-radius": "3px",
                          background: "#888"
                        }
                      }, null, 8, fd)) : Dt("", true),
                      c("span", dd, ne(u.value || "Choisir un preset..."), 1),
                      p[37] || (p[37] = c("span", {
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
                    (ae(true), le(ze, null, bn(f.value, (m) => (ae(), le("a", {
                      key: m.name,
                      class: ce([
                        "dropdown-item",
                        {
                          "is-active": R.value === m.name
                        }
                      ]),
                      onClick: Ss((G) => j(m), [
                        "prevent"
                      ]),
                      style: {
                        display: "flex",
                        "align-items": "center",
                        gap: "0.75em"
                      }
                    }, [
                      m.thumbnail ? (ae(), le("img", {
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
                      }, null, 8, vd)) : Dt("", true),
                      c("span", md, ne(m.name), 1)
                    ], 10, gd))), 128))
                  ])
                ])
              ], 2),
              c("div", bd, [
                c("div", _d, [
                  $e(c("input", {
                    class: "input",
                    "onUpdate:modelValue": p[3] || (p[3] = (m) => u.value = m),
                    type: "text",
                    placeholder: "Nom...",
                    onFocus: p[4] || (p[4] = (m) => t.suspendShortcuts && t.suspendShortcuts(true)),
                    onBlur: p[5] || (p[5] = (m) => t.suspendShortcuts && t.suspendShortcuts(false))
                  }, null, 544), [
                    [
                      nt,
                      u.value
                    ]
                  ])
                ]),
                c("div", {
                  class: "control"
                }, [
                  c("button", {
                    class: "button is-link is-small",
                    onClick: se
                  }, "Enregistrer")
                ]),
                c("div", xd, [
                  c("button", {
                    class: "button is-danger is-small",
                    onClick: F,
                    disabled: !u.value
                  }, "Supprimer", 8, yd)
                ])
              ]),
              p[39] || (p[39] = c("hr", {
                class: "section-sep"
              }, null, -1)),
              p[40] || (p[40] = c("label", {
                class: "label"
              }, "Import / Export", -1)),
              c("div", wd, [
                c("div", Sd, [
                  c("button", {
                    class: "button is-info is-small",
                    onClick: Pe,
                    disabled: f.value.length === 0
                  }, " Exporter ", 8, Td)
                ]),
                c("div", Md, [
                  c("button", {
                    class: "button is-warning is-small",
                    onClick: Re
                  }, " Importer "),
                  c("input", {
                    ref_key: "presetFileInput",
                    ref: Le,
                    type: "file",
                    accept: ".json",
                    style: {
                      display: "none"
                    },
                    onChange: zt
                  }, null, 544)
                ])
              ])
            ])
          ])) : e.activeTab === "palettes" ? (ae(), le("div", Cd, [
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
              p[41] || (p[41] = c("label", {
                class: "label"
              }, "Interpolation", -1)),
              c("div", Ld, [
                (ae(), le(ze, null, bn(W, (m) => c("button", {
                  key: m.key,
                  class: ce([
                    "button is-small",
                    n.value.interpolationMode === m.key ? "is-link" : "is-light"
                  ]),
                  onClick: (G) => n.value.interpolationMode = m.key
                }, ne(m.label), 11, kd)), 64))
              ])
            ]),
            p[57] || (p[57] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            c("div", {
              class: "mb-3"
            }, [
              p[42] || (p[42] = c("label", {
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
                  onClick: J,
                  title: "Inverser l'ordre des couleurs"
                }, "Inverser"),
                c("button", {
                  class: "button is-small is-light",
                  onClick: re,
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
            p[58] || (p[58] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            c("div", {
              class: "mb-3"
            }, [
              p[43] || (p[43] = c("label", {
                class: "label"
              }, "G\xE9n\xE9rer une palette", -1)),
              p[44] || (p[44] = c("p", {
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
                  onClick: Wt
                }, "Al\xE9atoire")
              ])
            ]),
            p[59] || (p[59] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            c("div", Rd, [
              p[45] || (p[45] = c("label", {
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
                "onUpdate:modelValue": p[6] || (p[6] = (m) => r.value = m)
              }, null, 512), [
                [
                  nt,
                  r.value,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            c("div", Ad, [
              p[46] || (p[46] = c("label", {
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
                "onUpdate:modelValue": p[7] || (p[7] = (m) => n.value.paletteOffset = m)
              }, null, 512), [
                [
                  nt,
                  n.value.paletteOffset,
                  void 0,
                  {
                    number: true
                  }
                ]
              ])
            ]),
            p[60] || (p[60] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            p[61] || (p[61] = c("label", {
              class: "label"
            }, "Ajustement global", -1)),
            p[62] || (p[62] = c("p", {
              style: {
                "font-size": "0.82em",
                color: "#666",
                "margin-bottom": "0.4em",
                "font-weight": "600"
              }
            }, "LCH (perceptuel)", -1)),
            c("div", zd, [
              p[47] || (p[47] = c("label", {
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
                value: It.value,
                onInput: p[8] || (p[8] = (m) => P(Number(m.target.value)))
              }, null, 40, Bd),
              c("span", Id, ne(It.value) + "\xB0", 1)
            ]),
            c("div", Od, [
              p[48] || (p[48] = c("label", {
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
                value: tt.value,
                onInput: p[9] || (p[9] = (m) => I(Number(m.target.value)))
              }, null, 40, Nd),
              c("span", Ud, ne(tt.value), 1)
            ]),
            c("div", Fd, [
              p[49] || (p[49] = c("label", {
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
                onInput: p[10] || (p[10] = (m) => z(Number(m.target.value)))
              }, null, 40, Dd),
              c("span", $d, ne(an.value), 1)
            ]),
            p[63] || (p[63] = c("p", {
              style: {
                "font-size": "0.82em",
                color: "#666",
                "margin-bottom": "0.4em",
                "margin-top": "0.6em",
                "font-weight": "600"
              }
            }, "HSL (classique)", -1)),
            c("div", Gd, [
              p[50] || (p[50] = c("label", {
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
                onInput: p[11] || (p[11] = (m) => N(Number(m.target.value)))
              }, null, 40, Vd),
              c("span", Hd, ne(y.value) + "\xB0", 1)
            ]),
            c("div", Wd, [
              p[51] || (p[51] = c("label", {
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
                value: d.value,
                onInput: p[12] || (p[12] = (m) => L(Number(m.target.value)))
              }, null, 40, jd),
              c("span", qd, ne(d.value), 1)
            ]),
            c("div", Yd, [
              p[52] || (p[52] = c("label", {
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
                onInput: p[13] || (p[13] = (m) => Y(Number(m.target.value)))
              }, null, 40, Kd),
              c("span", Xd, ne(g.value), 1)
            ]),
            c("div", {
              class: "mb-3"
            }, [
              c("button", {
                class: "button is-small is-light",
                onClick: S
              }, "R\xE9initialiser")
            ]),
            p[64] || (p[64] = c("hr", {
              class: "section-sep"
            }, null, -1)),
            c("div", Zd, [
              p[54] || (p[54] = c("label", {
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
                    onClick: p[14] || (p[14] = (m) => x.value = !x.value),
                    "aria-haspopup": "true",
                    "aria-controls": "dropdown-menu-palettes",
                    type: "button"
                  }, [
                    c("span", Qd, [
                      xe.value ? (ae(), le("img", {
                        key: 0,
                        src: xe.value,
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
                      }, null, 8, ep)) : Dt("", true),
                      c("span", tp, [
                        c("span", np, ne(v.value || "Choisir une palette..."), 1),
                        p[53] || (p[53] = c("span", {
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
                  c("div", sp, [
                    (ae(true), le(ze, null, bn(b.value, (m) => (ae(), le("a", {
                      key: m.name,
                      class: ce([
                        "dropdown-item",
                        {
                          "is-active": _.value === m.name
                        }
                      ]),
                      onClick: Ss((G) => w(m), [
                        "prevent"
                      ]),
                      style: {
                        display: "flex",
                        "flex-direction": "column",
                        gap: "0.5em",
                        padding: "0.75em"
                      }
                    }, [
                      m.thumbnail ? (ae(), le("img", {
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
                      }, null, 8, op)) : Dt("", true),
                      c("span", ap, ne(m.name), 1)
                    ], 10, rp))), 128))
                  ])
                ])
              ], 2),
              c("div", lp, [
                c("div", up, [
                  $e(c("input", {
                    class: "input",
                    "onUpdate:modelValue": p[15] || (p[15] = (m) => v.value = m),
                    type: "text",
                    placeholder: "Nom...",
                    onFocus: p[16] || (p[16] = (m) => t.suspendShortcuts && t.suspendShortcuts(true)),
                    onBlur: p[17] || (p[17] = (m) => t.suspendShortcuts && t.suspendShortcuts(false))
                  }, null, 544), [
                    [
                      nt,
                      v.value
                    ]
                  ])
                ]),
                c("div", {
                  class: "control"
                }, [
                  c("button", {
                    class: "button is-link is-small",
                    onClick: H
                  }, "Enregistrer")
                ]),
                c("div", cp, [
                  c("button", {
                    class: "button is-danger is-small",
                    onClick: k,
                    disabled: !v.value
                  }, "Supprimer", 8, fp)
                ])
              ]),
              p[55] || (p[55] = c("hr", {
                class: "section-sep"
              }, null, -1)),
              p[56] || (p[56] = c("label", {
                class: "label"
              }, "Import / Export", -1)),
              c("div", dp, [
                c("div", pp, [
                  c("button", {
                    class: "button is-info is-small",
                    onClick: Ht,
                    disabled: b.value.length === 0
                  }, " Exporter ", 8, hp)
                ]),
                c("div", gp, [
                  c("button", {
                    class: "button is-warning is-small",
                    onClick: vt
                  }, " Importer "),
                  c("input", {
                    ref_key: "paletteFileInput",
                    ref: on,
                    type: "file",
                    accept: ".json",
                    style: {
                      display: "none"
                    },
                    onChange: Bt
                  }, null, 544)
                ])
              ])
            ])
          ])) : e.activeTab === "performance" ? (ae(), le("div", vp, [
            c("div", mp, [
              p[65] || (p[65] = c("label", {
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
                  "onUpdate:modelValue": p[18] || (p[18] = (m) => B.value = m)
                }, null, 512), [
                  [
                    nt,
                    B.value
                  ]
                ]),
                c("button", {
                  class: "button is-small is-light",
                  onClick: p[19] || (p[19] = (m) => n.value.mu = 4),
                  title: "Mu = 4"
                }, "4")
              ]),
              c("span", null, ne((n.value.mu ?? 1).toFixed(1)), 1)
            ]),
            c("div", _p, [
              p[66] || (p[66] = c("label", {
                class: "label"
              }, "Epsilon", -1)),
              c("div", xp, [
                $e(c("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "-12",
                  max: "0",
                  step: "0.01",
                  "onUpdate:modelValue": p[20] || (p[20] = (m) => D.value = m)
                }, null, 512), [
                  [
                    nt,
                    D.value
                  ]
                ])
              ]),
              c("span", null, ne((n.value.epsilon ?? 1e-8).toExponential(2)), 1)
            ]),
            c("div", yp, [
              p[67] || (p[67] = c("label", {
                class: "label"
              }, "Tessellation", -1)),
              c("div", wp, [
                $e(c("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "0.1",
                  max: "10",
                  step: "0.1",
                  "onUpdate:modelValue": p[21] || (p[21] = (m) => n.value.tessellationLevel = m)
                }, null, 512), [
                  [
                    nt,
                    n.value.tessellationLevel,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              c("span", null, ne(n.value.tessellationLevel), 1)
            ]),
            c("div", Sp, [
              p[68] || (p[68] = c("label", {
                class: "label"
              }, "Options de rendu", -1)),
              c("div", Tp, [
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateShading ? "is-link" : "is-light"
                  ]),
                  onClick: p[22] || (p[22] = (m) => n.value.activateShading = !n.value.activateShading)
                }, " Shading ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activatePalette ? "is-link" : "is-light"
                  ]),
                  onClick: p[23] || (p[23] = (m) => n.value.activatePalette = !n.value.activatePalette)
                }, " Palette ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateSmoothness ? "is-link" : "is-light"
                  ]),
                  onClick: p[24] || (p[24] = (m) => n.value.activateSmoothness = !n.value.activateSmoothness)
                }, " Smoothness ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateTessellation ? "is-link" : "is-light"
                  ]),
                  onClick: p[25] || (p[25] = (m) => n.value.activateTessellation = !n.value.activateTessellation)
                }, " Tessellation ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateSkybox ? "is-link" : "is-light"
                  ]),
                  onClick: p[26] || (p[26] = (m) => n.value.activateSkybox = !n.value.activateSkybox)
                }, " Skybox ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateWebcam ? "is-link" : "is-light"
                  ]),
                  onClick: p[27] || (p[27] = (m) => n.value.activateWebcam = !n.value.activateWebcam)
                }, " Webcam ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateZebra ? "is-link" : "is-light"
                  ]),
                  onClick: p[28] || (p[28] = (m) => n.value.activateZebra = !n.value.activateZebra)
                }, " Zebra ", 2),
                c("button", {
                  class: ce([
                    "button is-small",
                    n.value.activateAnimate ? "is-link" : "is-light"
                  ]),
                  onClick: p[29] || (p[29] = (m) => n.value.activateAnimate = !n.value.activateAnimate)
                }, " Animate ", 2)
              ])
            ]),
            c("div", Mp, [
              c("label", Cp, "R\xE9solution (DPR \xD7 " + ne(((_a2 = n.value.dprMultiplier) == null ? void 0 : _a2.toFixed(3)) ?? "1.000") + ")", 1),
              c("div", Ep, [
                $e(c("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "0.125",
                  max: "2",
                  step: "0.125",
                  "onUpdate:modelValue": p[30] || (p[30] = (m) => n.value.dprMultiplier = m)
                }, null, 512), [
                  [
                    nt,
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
              c("label", Lp, "It\xE9rations (\xD7 " + ne((n.value.maxIterationMultiplier ?? 1).toPrecision(3)) + ")", 1),
              c("div", kp, [
                $e(c("input", {
                  class: "slider is-fullwidth",
                  type: "range",
                  min: "-2",
                  max: "1",
                  step: "0.01",
                  "onUpdate:modelValue": p[31] || (p[31] = (m) => $.value = m)
                }, null, 512), [
                  [
                    nt,
                    $.value
                  ]
                ])
              ])
            ])
          ])) : Dt("", true)
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
  }, fn = 200, Yp = kt({
    __name: "RenderStats",
    props: {
      engine: {}
    },
    setup(e) {
      const t = e, n = ee(false), i = ee(0), s = ee(false), r = ee(0), o = ee(-1), a = ee(0), l = ee(0), h = [], u = [], f = ee(null);
      let v = null;
      function b() {
        const R = t.engine;
        if (!R) return;
        i.value = R.fps ?? 0, s.value = R.isRendering ?? false, r.value = R.gpuFrameTimeMs ?? 0, o.value = R.unfinishedPixelCount ?? -1;
        const E = R.neutralSize ?? 0;
        a.value = E * E, l.value = typeof R.getIterationBatchSize == "function" ? R.getIterationBatchSize() : 0, h.push(o.value >= 0 ? o.value : 0), h.length > fn && h.shift(), u.push(i.value), u.length > fn && u.shift(), n.value && F();
      }
      At(() => {
        v = setInterval(b, 150);
      }), Mn(() => {
        v !== null && clearInterval(v);
      }), Mt(n, async (R) => {
        R && (await Fi(), F());
      });
      function _() {
        return a.value === 0 || o.value < 0 ? "--" : ((a.value - o.value) / a.value * 100).toFixed(1);
      }
      function x(R) {
        return R < 0 ? "--" : R >= 1e6 ? (R / 1e6).toFixed(1) + "M" : R >= 1e3 ? (R / 1e3).toFixed(1) + "k" : String(R);
      }
      function F() {
        const R = f.value;
        if (!R) return;
        const E = R.getContext("2d");
        if (!E) return;
        const O = window.devicePixelRatio || 1, U = R.clientWidth, j = R.clientHeight;
        R.width = U * O, R.height = j * O, E.scale(O, O), E.clearRect(0, 0, U, j), E.fillStyle = "rgba(0,0,0,0.06)", E.beginPath(), E.roundRect(0, 0, U, j, 8), E.fill();
        const se = j - 4, ue = 2;
        if (h.length > 1) {
          const q = Math.max(...h, 1);
          E.beginPath(), E.moveTo(0, ue + se);
          for (let H = 0; H < h.length; H++) {
            const Z = H / (fn - 1) * U, w = ue + se - h[H] / q * se;
            E.lineTo(Z, w);
          }
          E.lineTo((h.length - 1) / (fn - 1) * U, ue + se), E.closePath(), E.fillStyle = "rgba(34,197,94,0.18)", E.fill(), E.strokeStyle = "rgba(34,197,94,0.7)", E.lineWidth = 1.5, E.beginPath();
          for (let H = 0; H < h.length; H++) {
            const Z = H / (fn - 1) * U, w = ue + se - h[H] / q * se;
            H === 0 ? E.moveTo(Z, w) : E.lineTo(Z, w);
          }
          E.stroke();
        }
        if (u.length > 1) {
          const q = Math.max(...u, 1);
          E.strokeStyle = "rgba(255,170,0,0.8)", E.lineWidth = 1.5, E.beginPath();
          for (let H = 0; H < u.length; H++) {
            const Z = H / (fn - 1) * U, w = ue + se - u[H] / q * se;
            H === 0 ? E.moveTo(Z, w) : E.lineTo(Z, w);
          }
          E.stroke();
        }
      }
      function V() {
        n.value = !n.value;
      }
      return (R, E) => (ae(), le("div", {
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
              s.value ? "status-dot--active" : "status-dot--idle"
            ])
          }, null, 2),
          c("span", Bp, ne(i.value) + " fps", 1),
          c("span", Ip, ne(n.value ? "\u25B2" : "\u25BC"), 1)
        ], 8, zp),
        n.value ? (ae(), le("div", Op, [
          c("canvas", {
            ref_key: "graphCanvas",
            ref: f,
            class: "stats-graph"
          }, null, 512),
          E[5] || (E[5] = ca('<div class="stats-legend" data-v-3c8da564><span class="legend-item" data-v-3c8da564><span class="legend-swatch legend-swatch--green" data-v-3c8da564></span>Pixels restants</span><span class="legend-item" data-v-3c8da564><span class="legend-swatch legend-swatch--orange" data-v-3c8da564></span>FPS</span></div>', 1)),
          c("div", Np, [
            c("div", Up, [
              E[0] || (E[0] = c("span", {
                class: "stats-label"
              }, "Completion", -1)),
              c("span", Fp, ne(_()) + "%", 1)
            ]),
            c("div", Dp, [
              E[1] || (E[1] = c("span", {
                class: "stats-label"
              }, "Pixels restants", -1)),
              c("span", $p, ne(x(o.value)), 1)
            ]),
            c("div", Gp, [
              E[2] || (E[2] = c("span", {
                class: "stats-label"
              }, "Total pixels", -1)),
              c("span", Vp, ne(x(a.value)), 1)
            ]),
            c("div", Hp, [
              E[3] || (E[3] = c("span", {
                class: "stats-label"
              }, "GPU frame", -1)),
              c("span", Wp, ne(r.value.toFixed(1)) + " ms", 1)
            ]),
            c("div", jp, [
              E[4] || (E[4] = c("span", {
                class: "stats-label"
              }, "Batch size", -1)),
              c("span", qp, ne(l.value), 1)
            ])
          ])
        ])) : Dt("", true)
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
  }, Zp = [
    "onClick"
  ], Jp = [
    "onMousedown"
  ], Qp = [
    "onMousedown"
  ], eh = {
    class: "settings-popup-title"
  }, th = [
    "onClick"
  ], nh = {
    class: "settings-popup-body"
  }, ih = {
    class: "tag is-black"
  }, sh = {
    class: "tag is-black"
  }, rh = {
    class: "tag is-black"
  }, oh = {
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
    href: "https://github.com/gcollombet/mandelbrot",
    target: "_blank",
    rel: "noopener",
    class: "footer-link",
    "aria-label": "GitHub"
  }, dh = {
    class: "github-logo",
    height: "20",
    viewBox: "0 0 16 16",
    width: "20",
    fill: "currentColor",
    style: {
      "vertical-align": "middle",
      "margin-right": "4px"
    }
  }, eo = "mandelbrot_last_settings", ph = kt({
    __name: "MandelbrotViewer",
    setup(e) {
      const t = ee(null), n = Ae(() => {
        var _a2;
        return ((_a2 = t.value) == null ? void 0 : _a2.getEngine()) ?? null;
      }), i = vn(/* @__PURE__ */ new Set()), s = ee(false), r = vn({}), o = ee({}), a = ee(true), l = ee({
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
      At(() => {
        window.addEventListener("keydown", b);
        try {
          const w = localStorage.getItem(eo);
          w && Object.assign(l.value, JSON.parse(w));
        } catch {
        }
      }), Mn(() => {
        window.removeEventListener("keydown", b);
      }), Mt(l, (w) => {
        localStorage.setItem(eo, JSON.stringify(w));
      }, {
        deep: true
      });
      const h = [
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
      function u(w) {
        i.has(w) ? (i.delete(w), delete r[w]) : (i.add(w), r[w] = {
          x: -1,
          y: -1
        });
      }
      function f(w) {
        i.delete(w), delete r[w];
      }
      function v() {
        i.clear();
        for (const w of Object.keys(r)) delete r[w];
      }
      function b(w) {
        var _a2, _b, _c2;
        if (w.key === "Escape" && i.size > 0) {
          w.preventDefault(), v();
          return;
        }
        if (s.value) return;
        const k = (_b = (_a2 = w.target) == null ? void 0 : _a2.tagName) == null ? void 0 : _b.toLowerCase();
        k === "input" || k === "textarea" || ((_c2 = w.target) == null ? void 0 : _c2.isContentEditable) || (w.key === "w" || w.key === "W") && !w.repeat && (w.preventDefault(), i.size > 0 ? v() : u("navigation"));
      }
      const _ = ee(false), x = ee({
        x: 0,
        y: 0
      }), F = ee(null), V = vn({});
      let R = 51;
      function E(w) {
        V[w] = R++;
      }
      function O(w, k) {
        o.value[w] = k;
      }
      function U(w, k) {
        var _a2;
        const M = o.value[w];
        if (!M) return;
        _.value = true, F.value = w;
        const B = M.getBoundingClientRect();
        x.value = {
          x: k.clientX - B.left,
          y: k.clientY - B.top
        }, (((_a2 = r[w]) == null ? void 0 : _a2.x) ?? -1) < 0 && (r[w] = {
          x: B.left,
          y: B.top
        }), E(w), window.addEventListener("mousemove", j), window.addEventListener("mouseup", se);
      }
      function j(w) {
        !_.value || !F.value || (r[F.value] = {
          x: w.clientX - x.value.x,
          y: w.clientY - x.value.y
        });
      }
      function se() {
        _.value = false, F.value = null, window.removeEventListener("mousemove", j), window.removeEventListener("mouseup", se);
      }
      function ue(w) {
        const k = r[w] ?? {
          x: -1,
          y: -1
        }, M = V[w] ?? 50, B = w === "palettes" ? "860px" : "460px", D = w === "presets" ? "92vh" : "80vh";
        if (k.x < 0) {
          const xe = Array.from(i).indexOf(w) * 30;
          return {
            position: "fixed",
            top: `calc(50% + ${xe}px)`,
            left: `calc(50% + ${xe}px)`,
            transform: "translate(-50%, -50%)",
            zIndex: M,
            width: B,
            maxHeight: D
          };
        }
        return {
          position: "fixed",
          top: `${k.y}px`,
          left: `${k.x}px`,
          transform: "none",
          zIndex: M,
          width: B,
          maxHeight: D
        };
      }
      function q() {
        var _a2;
        const w = window.navigator.language || ((_a2 = window.navigator.languages) == null ? void 0 : _a2[0]) || "en";
        return w.startsWith("fr") || w.startsWith("be") ? "azerty" : "qwerty";
      }
      const H = q(), Z = Ae(() => H === "azerty" ? {
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
      return (w, k) => (ae(), le("div", Xp, [
        $e(c("div", {
          class: ce([
            "top-settings-bar animate__animated",
            a.value ? "animate__fadeInDown" : ""
          ])
        }, [
          (ae(), le(ze, null, bn(h, (M) => c("button", {
            key: M.key,
            class: ce([
              "top-tab-btn",
              {
                "is-active": i.has(M.key)
              }
            ]),
            onClick: (B) => u(M.key)
          }, ne(M.label), 11, Zp)), 64))
        ], 2), [
          [
            oi,
            a.value
          ]
        ]),
        $e(c("div", {
          class: ce([
            "render-stats-wrapper animate__animated",
            a.value ? "animate__fadeInDown" : ""
          ])
        }, [
          Te(Kp, {
            engine: n.value
          }, null, 8, [
            "engine"
          ])
        ], 2), [
          [
            oi,
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
          scale: l.value.scale,
          "onUpdate:scale": k[0] || (k[0] = (M) => l.value.scale = M),
          angle: l.value.angle,
          "onUpdate:angle": k[1] || (k[1] = (M) => l.value.angle = M),
          cx: l.value.cx,
          "onUpdate:cx": k[2] || (k[2] = (M) => l.value.cx = M),
          cy: l.value.cy,
          "onUpdate:cy": k[3] || (k[3] = (M) => l.value.cy = M),
          mu: l.value.mu,
          shadingLevel: l.value.shadingLevel,
          antialiasLevel: l.value.antialiasLevel,
          tessellationLevel: l.value.tessellationLevel,
          epsilon: l.value.epsilon,
          palettePeriod: l.value.palettePeriod,
          paletteOffset: l.value.paletteOffset,
          colorStops: l.value.colorStops,
          activatePalette: l.value.activatePalette,
          activateSkybox: l.value.activateSkybox,
          activateTessellation: l.value.activateTessellation,
          activateWebcam: l.value.activateWebcam,
          activateShading: l.value.activateShading,
          activateZebra: l.value.activateZebra,
          activateSmoothness: l.value.activateSmoothness,
          activateAnimate: l.value.activateAnimate,
          dprMultiplier: l.value.dprMultiplier,
          maxIterationMultiplier: l.value.maxIterationMultiplier,
          interpolationMode: l.value.interpolationMode
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
          "maxIterationMultiplier",
          "interpolationMode"
        ]),
        (ae(), le(ze, null, bn(h, (M) => (ae(), le(ze, {
          key: "popup-" + M.key
        }, [
          i.has(M.key) ? (ae(), le("div", {
            key: 0,
            ref_for: true,
            ref: (B) => O(M.key, B),
            class: "settings-popup",
            style: Qn(ue(M.key)),
            onMousedown: (B) => E(M.key)
          }, [
            c("div", {
              class: "settings-popup-header",
              onMousedown: Ss((B) => U(M.key, B), [
                "prevent"
              ])
            }, [
              c("span", eh, ne(M.label), 1),
              c("button", {
                class: "delete is-medium",
                "aria-label": "Fermer",
                onClick: (B) => f(M.key)
              }, null, 8, th)
            ], 40, Qp),
            c("div", nh, [
              Te(Ap, {
                modelValue: l.value,
                "onUpdate:modelValue": k[4] || (k[4] = (B) => l.value = B),
                engine: n.value,
                "suspend-shortcuts": (B) => {
                  s.value = B;
                },
                "active-tab": M.key
              }, null, 8, [
                "modelValue",
                "engine",
                "suspend-shortcuts",
                "active-tab"
              ])
            ])
          ], 44, Jp)) : Dt("", true)
        ], 64))), 64)),
        $e(c("div", {
          class: ce([
            "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
            a.value ? "animate__fadeInUp" : ""
          ])
        }, [
          k[5] || (k[5] = we(" Move\xA0 ", -1)),
          k[6] || (k[6] = c("span", {
            class: "tag is-black"
          }, "Left clic", -1)),
          k[7] || (k[7] = we("\xA0 ", -1)),
          c("span", ih, ne(Z.value.up), 1),
          k[8] || (k[8] = we("\xA0 ", -1)),
          c("span", sh, ne(Z.value.left), 1),
          k[9] || (k[9] = we("\xA0 ", -1)),
          c("span", rh, ne(Z.value.down), 1),
          k[10] || (k[10] = we("\xA0 ", -1)),
          c("span", oh, ne(Z.value.right), 1),
          k[11] || (k[11] = we("\xA0 |\xA0Rotate\xA0 ", -1)),
          k[12] || (k[12] = c("span", {
            class: "tag is-black"
          }, "Right clic", -1)),
          k[13] || (k[13] = we("\xA0 ", -1)),
          c("span", ah, ne(Z.value.rotateLeft), 1),
          k[14] || (k[14] = we("\xA0 ", -1)),
          c("span", lh, ne(Z.value.rotateRight), 1),
          k[15] || (k[15] = we("\xA0 |\xA0Zoom\xA0 ", -1)),
          k[16] || (k[16] = c("span", {
            class: "tag is-black"
          }, "Wheel", -1)),
          k[17] || (k[17] = we("\xA0 ", -1)),
          c("span", uh, ne(Z.value.zoomIn), 1),
          k[18] || (k[18] = we("\xA0 ", -1)),
          c("span", ch, ne(Z.value.zoomOut), 1),
          k[19] || (k[19] = we("\xA0 |\xA0Settings\xA0 ", -1)),
          k[20] || (k[20] = c("span", {
            class: "tag is-black"
          }, "W", -1))
        ], 2), [
          [
            oi,
            a.value
          ]
        ]),
        $e(c("div", {
          class: ce([
            "footer-love tag is-light is-medium is-hidden-touch animate__animated",
            a.value ? "animate__fadeInUp" : ""
          ])
        }, [
          k[23] || (k[23] = c("small", null, [
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
          k[24] || (k[24] = we(" \xA0|\xA0 ", -1)),
          c("small", null, [
            c("a", fh, [
              (ae(), le("svg", dh, [
                ...k[21] || (k[21] = [
                  c("path", {
                    d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                  }, null, -1)
                ])
              ])),
              k[22] || (k[22] = we(" GitHub ", -1))
            ])
          ])
        ], 2), [
          [
            oi,
            a.value
          ]
        ])
      ]));
    }
  }), hh = En(ph, [
    [
      "__scopeId",
      "data-v-097e7a79"
    ]
  ]), gh = {
    key: 0,
    id: "fullscreen"
  }, vh = {
    key: 1,
    class: "section is-flex is-flex-direction-column is-align-items-center is-justify-content-center",
    style: {
      height: "100vh"
    }
  }, mh = {
    class: "box has-text-centered",
    style: {
      "max-width": "400px"
    }
  }, bh = {
    class: "title is-4 mt-3"
  }, _h = {
    key: 0
  }, xh = {
    key: 1
  }, yh = {
    class: "button is-link mt-4",
    href: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility",
    target: "_blank"
  }, wh = kt({
    __name: "App",
    setup(e) {
      const t = ee(false), n = ee(true);
      return At(() => {
        t.value = typeof navigator < "u" && "gpu" in navigator, typeof navigator < "u" && (n.value = navigator.language.startsWith("fr"));
      }), (i, s) => t.value ? (ae(), le("div", gh, [
        Te(hh)
      ])) : (ae(), le("div", vh, [
        c("div", mh, [
          s[2] || (s[2] = c("span", {
            class: "icon is-large has-text-danger"
          }, [
            c("i", {
              class: "fas fa-exclamation-triangle fa-2x"
            })
          ], -1)),
          c("h1", bh, ne(n.value ? "WebGPU non support\xE9" : "WebGPU not supported"), 1),
          c("p", null, [
            n.value ? (ae(), le("span", _h, [
              ...s[0] || (s[0] = [
                we(" Ce navigateur ne supporte pas WebGPU.", -1),
                c("br", null, null, -1),
                we(" Veuillez utiliser un navigateur compatible WebGPU. ", -1)
              ])
            ])) : (ae(), le("span", xh, [
              ...s[1] || (s[1] = [
                we(" This browser does not support WebGPU.", -1),
                c("br", null, null, -1),
                we(" Please use a WebGPU-compatible browser. ", -1)
              ])
            ]))
          ]),
          c("a", yh, ne(n.value ? "Liste des navigateurs compatibles WebGPU" : "List of WebGPU-compatible browsers"), 1)
        ])
      ]));
    }
  });
  "serviceWorker" in navigator && window.addEventListener("load", () => {
    navigator.serviceWorker.register("/mandelbrot/sw.js");
  });
  lc(wh).mount("#app");
})();
