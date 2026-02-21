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
  const ae = {}, un = [], ut = () => {
  }, ra = () => false, Qr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), ho = (e) => e.startsWith("onUpdate:"), Se = Object.assign, po = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  }, nu = Object.prototype.hasOwnProperty, le = (e, t) => nu.call(e, t), j = Array.isArray, cn = (e) => Qn(e) === "[object Map]", ei = (e) => Qn(e) === "[object Set]", Wo = (e) => Qn(e) === "[object Date]", ee = (e) => typeof e == "function", we = (e) => typeof e == "string", ht = (e) => typeof e == "symbol", ce = (e) => e !== null && typeof e == "object", ia = (e) => (ce(e) || ee(e)) && ee(e.then) && ee(e.catch), oa = Object.prototype.toString, Qn = (e) => oa.call(e), ru = (e) => Qn(e).slice(8, -1), sa = (e) => Qn(e) === "[object Object]", go = (e) => we(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, zn = fo(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), ti = (e) => {
    const t = /* @__PURE__ */ Object.create(null);
    return ((n) => t[n] || (t[n] = e(n)));
  }, iu = /-\w/g, Mt = ti((e) => e.replace(iu, (t) => t.slice(1).toUpperCase())), ou = /\B([A-Z])/g, Dt = ti((e) => e.replace(ou, "-$1").toLowerCase()), aa = ti((e) => e.charAt(0).toUpperCase() + e.slice(1)), vi = ti((e) => e ? `on${aa(e)}` : ""), Fe = (e, t) => !Object.is(e, t), _r = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  }, la = (e, t, n, r = false) => {
    Object.defineProperty(e, t, {
      configurable: true,
      enumerable: false,
      writable: r,
      value: n
    });
  }, mo = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  }, su = (e) => {
    const t = we(e) ? Number(e) : NaN;
    return isNaN(t) ? e : t;
  };
  let qo;
  const ni = () => qo || (qo = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
  function ri(e) {
    if (j(e)) {
      const t = {};
      for (let n = 0; n < e.length; n++) {
        const r = e[n], i = we(r) ? cu(r) : ri(r);
        if (i) for (const o in i) t[o] = i[o];
      }
      return t;
    } else if (we(e) || ce(e)) return e;
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
  function be(e) {
    let t = "";
    if (we(e)) t = e;
    else if (j(e)) for (let n = 0; n < e.length; n++) {
      const r = be(e[n]);
      r && (t += r + " ");
    }
    else if (ce(e)) for (const n in e) e[n] && (t += n + " ");
    return t.trim();
  }
  const fu = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", du = fo(fu);
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
    let n = Wo(e), r = Wo(t);
    if (n || r) return n && r ? e.getTime() === t.getTime() : false;
    if (n = ht(e), r = ht(t), n || r) return e === t;
    if (n = j(e), r = j(t), n || r) return n && r ? hu(e, t) : false;
    if (n = ce(e), r = ce(t), n || r) {
      if (!n || !r) return false;
      const i = Object.keys(e).length, o = Object.keys(t).length;
      if (i !== o) return false;
      for (const s in e) {
        const a = e.hasOwnProperty(s), l = t.hasOwnProperty(s);
        if (a && !l || !a && l || !er(e[s], t[s])) return false;
      }
    }
    return String(e) === String(t);
  }
  function ca(e, t) {
    return e.findIndex((n) => er(n, t));
  }
  const fa = (e) => !!(e && e.__v_isRef === true), ve = (e) => we(e) ? e : e == null ? "" : j(e) || ce(e) && (e.toString === oa || !ee(e.toString)) ? fa(e) ? ve(e.value) : JSON.stringify(e, da, 2) : String(e), da = (e, t) => fa(t) ? da(e, t.value) : cn(t) ? {
    [`Map(${t.size})`]: [
      ...t.entries()
    ].reduce((n, [r, i], o) => (n[_i(r, o) + " =>"] = i, n), {})
  } : ei(t) ? {
    [`Set(${t.size})`]: [
      ...t.values()
    ].map((n) => _i(n))
  } : ht(t) ? _i(t) : ce(t) && !j(t) && !sa(t) ? String(t) : t, _i = (e, t = "") => {
    var n;
    return ht(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
  let Be;
  class pu {
    constructor(t = false) {
      this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.__v_skip = true, this.parent = Be, !t && Be && (this.index = (Be.scopes || (Be.scopes = [])).push(this) - 1);
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
        const n = Be;
        try {
          return Be = this, t();
        } finally {
          Be = n;
        }
      }
    }
    on() {
      ++this._on === 1 && (this.prevScope = Be, Be = this);
    }
    off() {
      this._on > 0 && --this._on === 0 && (Be = this.prevScope, this.prevScope = void 0);
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
    return Be;
  }
  let ge;
  const bi = /* @__PURE__ */ new WeakSet();
  class ha {
    constructor(t) {
      this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, Be && Be.active && Be.effects.push(this);
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
      this.flags |= 2, Ko(this), ma(this);
      const t = ge, n = Ze;
      ge = this, Ze = true;
      try {
        return this.fn();
      } finally {
        va(this), ge = t, Ze = n, this.flags &= -3;
      }
    }
    stop() {
      if (this.flags & 1) {
        for (let t = this.deps; t; t = t.nextDep) bo(t);
        this.deps = this.depsTail = void 0, Ko(this), this.onStop && this.onStop(), this.flags &= -2;
      }
    }
    trigger() {
      this.flags & 64 ? bi.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
    }
    runIfDirty() {
      Di(this) && this.run();
    }
    get dirty() {
      return Di(this);
    }
  }
  let pa = 0, Nn, In;
  function ga(e, t = false) {
    if (e.flags |= 8, t) {
      e.next = In, In = e;
      return;
    }
    e.next = Nn, Nn = e;
  }
  function vo() {
    pa++;
  }
  function _o() {
    if (--pa > 0) return;
    if (In) {
      let t = In;
      for (In = void 0; t; ) {
        const n = t.next;
        t.next = void 0, t.flags &= -9, t = n;
      }
    }
    let e;
    for (; Nn; ) {
      let t = Nn;
      for (Nn = void 0; t; ) {
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
      r.version === -1 ? (r === n && (n = i), bo(r), mu(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = i;
    }
    e.deps = t, e.depsTail = n;
  }
  function Di(e) {
    for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (_a(t.dep.computed) || t.dep.version !== t.version)) return true;
    return !!e._dirty;
  }
  function _a(e) {
    if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === $n) || (e.globalVersion = $n, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Di(e)))) return;
    e.flags |= 2;
    const t = e.dep, n = ge, r = Ze;
    ge = e, Ze = true;
    try {
      ma(e);
      const i = e.fn(e._value);
      (t.version === 0 || Fe(i, e._value)) && (e.flags |= 128, e._value = i, t.version++);
    } catch (i) {
      throw t.version++, i;
    } finally {
      ge = n, Ze = r, va(e), e.flags &= -3;
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
  function mu(e) {
    const { prevDep: t, nextDep: n } = e;
    t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
  }
  let Ze = true;
  const ba = [];
  function Tt() {
    ba.push(Ze), Ze = false;
  }
  function kt() {
    const e = ba.pop();
    Ze = e === void 0 ? true : e;
  }
  function Ko(e) {
    const { cleanup: t } = e;
    if (e.cleanup = void 0, t) {
      const n = ge;
      ge = void 0;
      try {
        t();
      } finally {
        ge = n;
      }
    }
  }
  let $n = 0;
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
      if (!ge || !Ze || ge === this.computed) return;
      let n = this.activeLink;
      if (n === void 0 || n.sub !== ge) n = this.activeLink = new vu(ge, this), ge.deps ? (n.prevDep = ge.depsTail, ge.depsTail.nextDep = n, ge.depsTail = n) : ge.deps = ge.depsTail = n, ya(n);
      else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
        const r = n.nextDep;
        r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = ge.depsTail, n.nextDep = void 0, ge.depsTail.nextDep = n, ge.depsTail = n, ge.deps === n && (ge.deps = r);
      }
      return n;
    }
    trigger(t) {
      this.version++, $n++, this.notify(t);
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
  const Ui = /* @__PURE__ */ new WeakMap(), Xt = /* @__PURE__ */ Symbol(""), $i = /* @__PURE__ */ Symbol(""), Vn = /* @__PURE__ */ Symbol("");
  function ke(e, t, n) {
    if (Ze && ge) {
      let r = Ui.get(e);
      r || Ui.set(e, r = /* @__PURE__ */ new Map());
      let i = r.get(n);
      i || (r.set(n, i = new ii()), i.map = r, i.key = n), i.track();
    }
  }
  function xt(e, t, n, r, i, o) {
    const s = Ui.get(e);
    if (!s) {
      $n++;
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
        s.forEach((f, h) => {
          (h === "length" || h === Vn || !ht(h) && h >= c) && a(f);
        });
      } else switch ((n !== void 0 || s.has(void 0)) && a(s.get(n)), u && a(s.get(Vn)), t) {
        case "add":
          l ? u && a(s.get("length")) : (a(s.get(Xt)), cn(e) && a(s.get($i)));
          break;
        case "delete":
          l || (a(s.get(Xt)), cn(e) && a(s.get($i)));
          break;
        case "set":
          cn(e) && a(s.get(Xt));
          break;
      }
    }
    _o();
  }
  function nn(e) {
    const t = re(e);
    return t === e ? t : (ke(t, "iterate", Vn), qe(e) ? t : t.map(Je));
  }
  function oi(e) {
    return ke(e = re(e), "iterate", Vn), e;
  }
  function Nt(e, t) {
    return Ct(e) ? vn(Yt(e) ? Je(t) : t) : Je(t);
  }
  const _u = {
    __proto__: null,
    [Symbol.iterator]() {
      return yi(this, Symbol.iterator, (e) => Nt(this, e));
    },
    concat(...e) {
      return nn(this).concat(...e.map((t) => j(t) ? nn(t) : t));
    },
    entries() {
      return yi(this, "entries", (e) => (e[1] = Nt(this, e[1]), e));
    },
    every(e, t) {
      return mt(this, "every", e, t, void 0, arguments);
    },
    filter(e, t) {
      return mt(this, "filter", e, t, (n) => n.map((r) => Nt(this, r)), arguments);
    },
    find(e, t) {
      return mt(this, "find", e, t, (n) => Nt(this, n), arguments);
    },
    findIndex(e, t) {
      return mt(this, "findIndex", e, t, void 0, arguments);
    },
    findLast(e, t) {
      return mt(this, "findLast", e, t, (n) => Nt(this, n), arguments);
    },
    findLastIndex(e, t) {
      return mt(this, "findLastIndex", e, t, void 0, arguments);
    },
    forEach(e, t) {
      return mt(this, "forEach", e, t, void 0, arguments);
    },
    includes(...e) {
      return xi(this, "includes", e);
    },
    indexOf(...e) {
      return xi(this, "indexOf", e);
    },
    join(e) {
      return nn(this).join(e);
    },
    lastIndexOf(...e) {
      return xi(this, "lastIndexOf", e);
    },
    map(e, t) {
      return mt(this, "map", e, t, void 0, arguments);
    },
    pop() {
      return Mn(this, "pop");
    },
    push(...e) {
      return Mn(this, "push", e);
    },
    reduce(e, ...t) {
      return jo(this, "reduce", e, t);
    },
    reduceRight(e, ...t) {
      return jo(this, "reduceRight", e, t);
    },
    shift() {
      return Mn(this, "shift");
    },
    some(e, t) {
      return mt(this, "some", e, t, void 0, arguments);
    },
    splice(...e) {
      return Mn(this, "splice", e);
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
      return Mn(this, "unshift", e);
    },
    values() {
      return yi(this, "values", (e) => Nt(this, e));
    }
  };
  function yi(e, t, n) {
    const r = oi(e), i = r[t]();
    return r !== e && !qe(e) && (i._next = i.next, i.next = () => {
      const o = i._next();
      return o.done || (o.value = n(o.value)), o;
    }), i;
  }
  const bu = Array.prototype;
  function mt(e, t, n, r, i, o) {
    const s = oi(e), a = s !== e && !qe(e), l = s[t];
    if (l !== bu[t]) {
      const f = l.apply(e, o);
      return a ? Je(f) : f;
    }
    let u = n;
    s !== e && (a ? u = function(f, h) {
      return n.call(this, Nt(e, f), h, e);
    } : n.length > 2 && (u = function(f, h) {
      return n.call(this, f, h, e);
    }));
    const c = l.call(s, u, r);
    return a && i ? i(c) : c;
  }
  function jo(e, t, n, r) {
    const i = oi(e);
    let o = n;
    return i !== e && (qe(e) ? n.length > 3 && (o = function(s, a, l) {
      return n.call(this, s, a, l, e);
    }) : o = function(s, a, l) {
      return n.call(this, s, Nt(e, a), l, e);
    }), i[t](o, ...r);
  }
  function xi(e, t, n) {
    const r = re(e);
    ke(r, "iterate", Vn);
    const i = r[t](...n);
    return (i === -1 || i === false) && So(n[0]) ? (n[0] = re(n[0]), r[t](...n)) : i;
  }
  function Mn(e, t, n = []) {
    Tt(), vo();
    const r = re(e)[t].apply(e, n);
    return _o(), kt(), r;
  }
  const yu = fo("__proto__,__v_isRef,__isVue"), xa = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(ht));
  function xu(e) {
    ht(e) || (e = String(e));
    const t = re(this);
    return ke(t, "has", e), t.hasOwnProperty(e);
  }
  class wa {
    constructor(t = false, n = false) {
      this._isReadonly = t, this._isShallow = n;
    }
    get(t, n, r) {
      if (n === "__v_skip") return t.__v_skip;
      const i = this._isReadonly, o = this._isShallow;
      if (n === "__v_isReactive") return !i;
      if (n === "__v_isReadonly") return i;
      if (n === "__v_isShallow") return o;
      if (n === "__v_raw") return r === (i ? o ? Lu : ka : o ? Ta : Ma).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
      const s = j(t);
      if (!i) {
        let l;
        if (s && (l = _u[n])) return l;
        if (n === "hasOwnProperty") return xu;
      }
      const a = Reflect.get(t, n, Ee(t) ? t : r);
      if ((ht(n) ? xa.has(n) : yu(n)) || (i || ke(t, "get", n), o)) return a;
      if (Ee(a)) {
        const l = s && go(n) ? a : a.value;
        return i && ce(l) ? Gi(l) : l;
      }
      return ce(a) ? i ? Gi(a) : xo(a) : a;
    }
  }
  class Sa extends wa {
    constructor(t = false) {
      super(false, t);
    }
    set(t, n, r, i) {
      let o = t[n];
      const s = j(t) && go(n);
      if (!this._isShallow) {
        const u = Ct(o);
        if (!qe(r) && !Ct(r) && (o = re(o), r = re(r)), !s && Ee(o) && !Ee(r)) return u || (o.value = r), true;
      }
      const a = s ? Number(n) < t.length : le(t, n), l = Reflect.set(t, n, r, Ee(t) ? t : i);
      return t === re(i) && (a ? Fe(r, o) && xt(t, "set", n, r) : xt(t, "add", n, r)), l;
    }
    deleteProperty(t, n) {
      const r = le(t, n);
      t[n];
      const i = Reflect.deleteProperty(t, n);
      return i && r && xt(t, "delete", n, void 0), i;
    }
    has(t, n) {
      const r = Reflect.has(t, n);
      return (!ht(n) || !xa.has(n)) && ke(t, "has", n), r;
    }
    ownKeys(t) {
      return ke(t, "iterate", j(t) ? "length" : Xt), Reflect.ownKeys(t);
    }
  }
  class wu extends wa {
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
  const Su = new Sa(), Mu = new wu(), Tu = new Sa(true);
  const Vi = (e) => e, lr = (e) => Reflect.getPrototypeOf(e);
  function ku(e, t, n) {
    return function(...r) {
      const i = this.__v_raw, o = re(i), s = cn(o), a = e === "entries" || e === Symbol.iterator && s, l = e === "keys" && s, u = i[e](...r), c = n ? Vi : t ? vn : Je;
      return !t && ke(o, "iterate", l ? $i : Xt), Se(Object.create(u), {
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
  function ur(e) {
    return function(...t) {
      return e === "delete" ? false : e === "clear" ? void 0 : this;
    };
  }
  function Cu(e, t) {
    const n = {
      get(i) {
        const o = this.__v_raw, s = re(o), a = re(i);
        e || (Fe(i, a) && ke(s, "get", i), ke(s, "get", a));
        const { has: l } = lr(s), u = t ? Vi : e ? vn : Je;
        if (l.call(s, i)) return u(o.get(i));
        if (l.call(s, a)) return u(o.get(a));
        o !== s && o.get(i);
      },
      get size() {
        const i = this.__v_raw;
        return !e && ke(re(i), "iterate", Xt), i.size;
      },
      has(i) {
        const o = this.__v_raw, s = re(o), a = re(i);
        return e || (Fe(i, a) && ke(s, "has", i), ke(s, "has", a)), i === a ? o.has(i) : o.has(i) || o.has(a);
      },
      forEach(i, o) {
        const s = this, a = s.__v_raw, l = re(a), u = t ? Vi : e ? vn : Je;
        return !e && ke(l, "iterate", Xt), a.forEach((c, f) => i.call(o, u(c), u(f), s));
      }
    };
    return Se(n, e ? {
      add: ur("add"),
      set: ur("set"),
      delete: ur("delete"),
      clear: ur("clear")
    } : {
      add(i) {
        !t && !qe(i) && !Ct(i) && (i = re(i));
        const o = re(this);
        return lr(o).has.call(o, i) || (o.add(i), xt(o, "add", i, i)), this;
      },
      set(i, o) {
        !t && !qe(o) && !Ct(o) && (o = re(o));
        const s = re(this), { has: a, get: l } = lr(s);
        let u = a.call(s, i);
        u || (i = re(i), u = a.call(s, i));
        const c = l.call(s, i);
        return s.set(i, o), u ? Fe(o, c) && xt(s, "set", i, o) : xt(s, "add", i, o), this;
      },
      delete(i) {
        const o = re(this), { has: s, get: a } = lr(o);
        let l = s.call(o, i);
        l || (i = re(i), l = s.call(o, i)), a && a.call(o, i);
        const u = o.delete(i);
        return l && xt(o, "delete", i, void 0), u;
      },
      clear() {
        const i = re(this), o = i.size !== 0, s = i.clear();
        return o && xt(i, "clear", void 0, void 0), s;
      }
    }), [
      "keys",
      "values",
      "entries",
      Symbol.iterator
    ].forEach((i) => {
      n[i] = ku(i, e, t);
    }), n;
  }
  function yo(e, t) {
    const n = Cu(e, t);
    return (r, i, o) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? r : Reflect.get(le(n, i) && i in r ? n : r, i, o);
  }
  const Eu = {
    get: yo(false, false)
  }, Au = {
    get: yo(false, true)
  }, Pu = {
    get: yo(true, false)
  };
  const Ma = /* @__PURE__ */ new WeakMap(), Ta = /* @__PURE__ */ new WeakMap(), ka = /* @__PURE__ */ new WeakMap(), Lu = /* @__PURE__ */ new WeakMap();
  function Ru(e) {
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
  function zu(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Ru(ru(e));
  }
  function xo(e) {
    return Ct(e) ? e : wo(e, false, Su, Eu, Ma);
  }
  function Nu(e) {
    return wo(e, false, Tu, Au, Ta);
  }
  function Gi(e) {
    return wo(e, true, Mu, Pu, ka);
  }
  function wo(e, t, n, r, i) {
    if (!ce(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
    const o = zu(e);
    if (o === 0) return e;
    const s = i.get(e);
    if (s) return s;
    const a = new Proxy(e, o === 2 ? r : n);
    return i.set(e, a), a;
  }
  function Yt(e) {
    return Ct(e) ? Yt(e.__v_raw) : !!(e && e.__v_isReactive);
  }
  function Ct(e) {
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
  function Iu(e) {
    return !le(e, "__v_skip") && Object.isExtensible(e) && la(e, "__v_skip", true), e;
  }
  const Je = (e) => ce(e) ? xo(e) : e, vn = (e) => ce(e) ? Gi(e) : e;
  function Ee(e) {
    return e ? e.__v_isRef === true : false;
  }
  function me(e) {
    return Ou(e, false);
  }
  function Ou(e, t) {
    return Ee(e) ? e : new Bu(e, t);
  }
  class Bu {
    constructor(t, n) {
      this.dep = new ii(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : re(t), this._value = n ? t : Je(t), this.__v_isShallow = n;
    }
    get value() {
      return this.dep.track(), this._value;
    }
    set value(t) {
      const n = this._rawValue, r = this.__v_isShallow || qe(t) || Ct(t);
      t = r ? t : re(t), Fe(t, n) && (this._rawValue = t, this._value = r ? t : Je(t), this.dep.trigger());
    }
  }
  function Fu(e) {
    return Ee(e) ? e.value : e;
  }
  const Du = {
    get: (e, t, n) => t === "__v_raw" ? e : Fu(Reflect.get(e, t, n)),
    set: (e, t, n, r) => {
      const i = e[t];
      return Ee(i) && !Ee(n) ? (i.value = n, true) : Reflect.set(e, t, n, r);
    }
  };
  function Ca(e) {
    return Yt(e) ? e : new Proxy(e, Du);
  }
  class Uu {
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
  function $u(e) {
    return new Uu(e);
  }
  class Vu {
    constructor(t, n, r) {
      this.fn = t, this.setter = n, this._value = void 0, this.dep = new ii(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = $n - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
    }
    notify() {
      if (this.flags |= 16, !(this.flags & 8) && ge !== this) return ga(this, true), true;
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
    return ee(e) ? r = e : (r = e.get, i = e.set), new Vu(r, i, n);
  }
  const cr = {}, Ar = /* @__PURE__ */ new WeakMap();
  let Ht;
  function Hu(e, t = false, n = Ht) {
    if (n) {
      let r = Ar.get(n);
      r || Ar.set(n, r = []), r.push(e);
    }
  }
  function Wu(e, t, n = ae) {
    const { immediate: r, deep: i, once: o, scheduler: s, augmentJob: a, call: l } = n, u = (y) => i ? y : qe(y) || i === false || i === 0 ? wt(y, 1) : wt(y);
    let c, f, h, d, g = false, _ = false;
    if (Ee(e) ? (f = () => e.value, g = qe(e)) : Yt(e) ? (f = () => u(e), g = true) : j(e) ? (_ = true, g = e.some((y) => Yt(y) || qe(y)), f = () => e.map((y) => {
      if (Ee(y)) return y.value;
      if (Yt(y)) return u(y);
      if (ee(y)) return l ? l(y, 2) : y();
    })) : ee(e) ? t ? f = l ? () => l(e, 2) : e : f = () => {
      if (h) {
        Tt();
        try {
          h();
        } finally {
          kt();
        }
      }
      const y = Ht;
      Ht = c;
      try {
        return l ? l(e, 3, [
          d
        ]) : e(d);
      } finally {
        Ht = y;
      }
    } : f = ut, t && i) {
      const y = f, S = i === true ? 1 / 0 : i;
      f = () => wt(y(), S);
    }
    const F = gu(), N = () => {
      c.stop(), F && F.active && po(F.effects, c);
    };
    if (o && t) {
      const y = t;
      t = (...S) => {
        y(...S), N();
      };
    }
    let A = _ ? new Array(e.length).fill(cr) : cr;
    const O = (y) => {
      if (!(!(c.flags & 1) || !c.dirty && !y)) if (t) {
        const S = c.run();
        if (i || g || (_ ? S.some((P, W) => Fe(P, A[W])) : Fe(S, A))) {
          h && h();
          const P = Ht;
          Ht = c;
          try {
            const W = [
              S,
              A === cr ? void 0 : _ && A[0] === cr ? [] : A,
              d
            ];
            A = S, l ? l(t, 3, W) : t(...W);
          } finally {
            Ht = P;
          }
        }
      } else c.run();
    };
    return a && a(O), c = new ha(f), c.scheduler = s ? () => s(O, false) : O, d = (y) => Hu(y, false, c), h = c.onStop = () => {
      const y = Ar.get(c);
      if (y) {
        if (l) l(y, 4);
        else for (const S of y) S();
        Ar.delete(c);
      }
    }, t ? r ? O(true) : A = c.run() : s ? s(O.bind(null, true), true) : c.run(), N.pause = c.pause.bind(c), N.resume = c.resume.bind(c), N.stop = N, N;
  }
  function wt(e, t = 1 / 0, n) {
    if (t <= 0 || !ce(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
    if (n.set(e, t), t--, Ee(e)) wt(e.value, t, n);
    else if (j(e)) for (let r = 0; r < e.length; r++) wt(e[r], t, n);
    else if (ei(e) || cn(e)) e.forEach((r) => {
      wt(r, t, n);
    });
    else if (sa(e)) {
      for (const r in e) wt(e[r], t, n);
      for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && wt(e[r], t, n);
    }
    return e;
  }
  function tr(e, t, n, r) {
    try {
      return r ? e(...r) : e();
    } catch (i) {
      si(i, t, n);
    }
  }
  function Qe(e, t, n, r) {
    if (ee(e)) {
      const i = tr(e, t, n, r);
      return i && ia(i) && i.catch((o) => {
        si(o, t, n);
      }), i;
    }
    if (j(e)) {
      const i = [];
      for (let o = 0; o < e.length; o++) i.push(Qe(e[o], t, n, r));
      return i;
    }
  }
  function si(e, t, n, r = true) {
    const i = t ? t.vnode : null, { errorHandler: o, throwUnhandledErrorInProduction: s } = t && t.appContext.config || ae;
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
        Tt(), tr(o, null, 10, [
          e,
          l,
          u
        ]), kt();
        return;
      }
    }
    qu(e, n, i, r, s);
  }
  function qu(e, t, n, r = true, i = false) {
    if (i) throw e;
    console.error(e);
  }
  const Pe = [];
  let ot = -1;
  const fn = [];
  let It = null, sn = 0;
  const Ea = Promise.resolve();
  let Pr = null;
  function ai(e) {
    const t = Pr || Ea;
    return e ? t.then(this ? e.bind(this) : e) : t;
  }
  function Ku(e) {
    let t = ot + 1, n = Pe.length;
    for (; t < n; ) {
      const r = t + n >>> 1, i = Pe[r], o = Gn(i);
      o < e || o === e && i.flags & 2 ? t = r + 1 : n = r;
    }
    return t;
  }
  function Mo(e) {
    if (!(e.flags & 1)) {
      const t = Gn(e), n = Pe[Pe.length - 1];
      !n || !(e.flags & 2) && t >= Gn(n) ? Pe.push(e) : Pe.splice(Ku(t), 0, e), e.flags |= 1, Aa();
    }
  }
  function Aa() {
    Pr || (Pr = Ea.then(La));
  }
  function ju(e) {
    j(e) ? fn.push(...e) : It && e.id === -1 ? It.splice(sn + 1, 0, e) : e.flags & 1 || (fn.push(e), e.flags |= 1), Aa();
  }
  function Xo(e, t, n = ot + 1) {
    for (; n < Pe.length; n++) {
      const r = Pe[n];
      if (r && r.flags & 2) {
        if (e && r.id !== e.uid) continue;
        Pe.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
      }
    }
  }
  function Pa(e) {
    if (fn.length) {
      const t = [
        ...new Set(fn)
      ].sort((n, r) => Gn(n) - Gn(r));
      if (fn.length = 0, It) {
        It.push(...t);
        return;
      }
      for (It = t, sn = 0; sn < It.length; sn++) {
        const n = It[sn];
        n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
      }
      It = null, sn = 0;
    }
  }
  const Gn = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
  function La(e) {
    try {
      for (ot = 0; ot < Pe.length; ot++) {
        const t = Pe[ot];
        t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), tr(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
      }
    } finally {
      for (; ot < Pe.length; ot++) {
        const t = Pe[ot];
        t && (t.flags &= -2);
      }
      ot = -1, Pe.length = 0, Pa(), Pr = null, (Pe.length || fn.length) && La();
    }
  }
  let We = null, Ra = null;
  function Lr(e) {
    const t = We;
    return We = e, Ra = e && e.type.__scopeId || null, t;
  }
  function za(e, t = We, n) {
    if (!t || e._n) return e;
    const r = (...i) => {
      r._d && Ir(-1);
      const o = Lr(t);
      let s;
      try {
        s = e(...i);
      } finally {
        Lr(o), r._d && Ir(1);
      }
      return s;
    };
    return r._n = true, r._c = true, r._d = true, r;
  }
  function ye(e, t) {
    if (We === null) return e;
    const n = di(We), r = e.dirs || (e.dirs = []);
    for (let i = 0; i < t.length; i++) {
      let [o, s, a, l = ae] = t[i];
      o && (ee(o) && (o = {
        mounted: o,
        updated: o
      }), o.deep && wt(s), r.push({
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
  function Ut(e, t, n, r) {
    const i = e.dirs, o = t && t.dirs;
    for (let s = 0; s < i.length; s++) {
      const a = i[s];
      o && (a.oldValue = o[s].value);
      let l = a.dir[r];
      l && (Tt(), Qe(l, n, 8, [
        e.el,
        a,
        e,
        t
      ]), kt());
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
    const r = Po();
    if (r || dn) {
      let i = dn ? dn._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
      if (i && e in i) return i[e];
      if (arguments.length > 1) return n && ee(t) ? t.call(r && r.proxy) : t;
    }
  }
  const Yu = /* @__PURE__ */ Symbol.for("v-scx"), Zu = () => br(Yu);
  function Ju(e, t) {
    return To(e, null, {
      flush: "sync"
    });
  }
  function Bt(e, t, n) {
    return To(e, t, n);
  }
  function To(e, t, n = ae) {
    const { immediate: r, deep: i, flush: o, once: s } = n, a = Se({}, n), l = t && r || !t && o !== "post";
    let u;
    if (qn) {
      if (o === "sync") {
        const d = Zu();
        u = d.__watcherHandles || (d.__watcherHandles = []);
      } else if (!l) {
        const d = () => {
        };
        return d.stop = ut, d.resume = ut, d.pause = ut, d;
      }
    }
    const c = Re;
    a.call = (d, g, _) => Qe(d, c, g, _);
    let f = false;
    o === "post" ? a.scheduler = (d) => {
      Oe(d, c && c.suspense);
    } : o !== "sync" && (f = true, a.scheduler = (d, g) => {
      g ? d() : Mo(d);
    }), a.augmentJob = (d) => {
      t && (d.flags |= 4), f && (d.flags |= 2, c && (d.id = c.uid, d.i = c));
    };
    const h = Wu(e, t, a);
    return qn && (u ? u.push(h) : l && h()), h;
  }
  function Qu(e, t, n) {
    const r = this.proxy, i = we(e) ? e.includes(".") ? Na(r, e) : () => r[e] : e.bind(r, r);
    let o;
    ee(t) ? o = t : (o = t.handler, n = t);
    const s = rr(this), a = To(i, o.bind(r), n);
    return s(), a;
  }
  function Na(e, t) {
    const n = t.split(".");
    return () => {
      let r = e;
      for (let i = 0; i < n.length && r; i++) r = r[n[i]];
      return r;
    };
  }
  const ec = /* @__PURE__ */ Symbol("_vte"), Ia = (e) => e.__isTeleport, st = /* @__PURE__ */ Symbol("_leaveCb"), Tn = /* @__PURE__ */ Symbol("_enterCb");
  function tc() {
    const e = {
      isMounted: false,
      isLeaving: false,
      isUnmounting: false,
      leavingVNodes: /* @__PURE__ */ new Map()
    };
    return Lt(() => {
      e.isMounted = true;
    }), Ga(() => {
      e.isUnmounting = true;
    }), e;
  }
  const He = [
    Function,
    Array
  ], Oa = {
    mode: String,
    appear: Boolean,
    persisted: Boolean,
    onBeforeEnter: He,
    onEnter: He,
    onAfterEnter: He,
    onEnterCancelled: He,
    onBeforeLeave: He,
    onLeave: He,
    onAfterLeave: He,
    onLeaveCancelled: He,
    onBeforeAppear: He,
    onAppear: He,
    onAfterAppear: He,
    onAppearCancelled: He
  }, Ba = (e) => {
    const t = e.subTree;
    return t.component ? Ba(t.component) : t;
  }, nc = {
    name: "BaseTransition",
    props: Oa,
    setup(e, { slots: t }) {
      const n = Po(), r = tc();
      return () => {
        const i = t.default && Ua(t.default(), true);
        if (!i || !i.length) return;
        const o = Fa(i), s = re(e), { mode: a } = s;
        if (r.isLeaving) return wi(o);
        const l = Yo(o);
        if (!l) return wi(o);
        let u = Hi(l, s, r, n, (f) => u = f);
        l.type !== Le && Hn(l, u);
        let c = n.subTree && Yo(n.subTree);
        if (c && c.type !== Le && !Wt(c, l) && Ba(n).type !== Le) {
          let f = Hi(c, s, r, n);
          if (Hn(c, f), a === "out-in" && l.type !== Le) return r.isLeaving = true, f.afterLeave = () => {
            r.isLeaving = false, n.job.flags & 8 || n.update(), delete f.afterLeave, c = void 0;
          }, wi(o);
          a === "in-out" && l.type !== Le ? f.delayLeave = (h, d, g) => {
            const _ = Da(r, c);
            _[String(c.key)] = c, h[st] = () => {
              d(), h[st] = void 0, delete u.delayedLeave, c = void 0;
            }, u.delayedLeave = () => {
              g(), delete u.delayedLeave, c = void 0;
            };
          } : c = void 0;
        } else c && (c = void 0);
        return o;
      };
    }
  };
  function Fa(e) {
    let t = e[0];
    if (e.length > 1) {
      for (const n of e) if (n.type !== Le) {
        t = n;
        break;
      }
    }
    return t;
  }
  const rc = nc;
  function Da(e, t) {
    const { leavingVNodes: n } = e;
    let r = n.get(t.type);
    return r || (r = /* @__PURE__ */ Object.create(null), n.set(t.type, r)), r;
  }
  function Hi(e, t, n, r, i) {
    const { appear: o, mode: s, persisted: a = false, onBeforeEnter: l, onEnter: u, onAfterEnter: c, onEnterCancelled: f, onBeforeLeave: h, onLeave: d, onAfterLeave: g, onLeaveCancelled: _, onBeforeAppear: F, onAppear: N, onAfterAppear: A, onAppearCancelled: O } = t, y = String(e.key), S = Da(n, e), P = ($, H) => {
      $ && Qe($, r, 9, H);
    }, W = ($, H) => {
      const q = H[1];
      P($, H), j($) ? $.every((w) => w.length <= 1) && q() : $.length <= 1 && q();
    }, X = {
      mode: s,
      persisted: a,
      beforeEnter($) {
        let H = l;
        if (!n.isMounted) if (o) H = F || l;
        else return;
        $[st] && $[st](true);
        const q = S[y];
        q && Wt(e, q) && q.el[st] && q.el[st](), P(H, [
          $
        ]);
      },
      enter($) {
        let H = u, q = c, w = f;
        if (!n.isMounted) if (o) H = N || u, q = A || c, w = O || f;
        else return;
        let G = false;
        $[Tn] = (fe) => {
          G || (G = true, fe ? P(w, [
            $
          ]) : P(q, [
            $
          ]), X.delayedLeave && X.delayedLeave(), $[Tn] = void 0);
        };
        const Z = $[Tn].bind(null, false);
        H ? W(H, [
          $,
          Z
        ]) : Z();
      },
      leave($, H) {
        const q = String(e.key);
        if ($[Tn] && $[Tn](true), n.isUnmounting) return H();
        P(h, [
          $
        ]);
        let w = false;
        $[st] = (Z) => {
          w || (w = true, H(), Z ? P(_, [
            $
          ]) : P(g, [
            $
          ]), $[st] = void 0, S[q] === e && delete S[q]);
        };
        const G = $[st].bind(null, false);
        S[q] = e, d ? W(d, [
          $,
          G
        ]) : G();
      },
      clone($) {
        const H = Hi($, t, n, r, i);
        return i && i(H), H;
      }
    };
    return X;
  }
  function wi(e) {
    if (li(e)) return e = Ft(e), e.children = null, e;
  }
  function Yo(e) {
    if (!li(e)) return Ia(e.type) && e.children ? Fa(e.children) : e;
    if (e.component) return e.component.subTree;
    const { shapeFlag: t, children: n } = e;
    if (n) {
      if (t & 16) return n[0];
      if (t & 32 && ee(n.default)) return n.default();
    }
  }
  function Hn(e, t) {
    e.shapeFlag & 6 && e.component ? (e.transition = t, Hn(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
  }
  function Ua(e, t = false, n) {
    let r = [], i = 0;
    for (let o = 0; o < e.length; o++) {
      let s = e[o];
      const a = n == null ? s.key : String(n) + String(s.key != null ? s.key : o);
      s.type === Ue ? (s.patchFlag & 128 && i++, r = r.concat(Ua(s.children, t, a))) : (t || s.type !== Le) && r.push(a != null ? Ft(s, {
        key: a
      }) : s);
    }
    if (i > 1) for (let o = 0; o < r.length; o++) r[o].patchFlag = -2;
    return r;
  }
  function At(e, t) {
    return ee(e) ? Se({
      name: e.name
    }, t, {
      setup: e
    }) : e;
  }
  function $a(e) {
    e.ids = [
      e.ids[0] + e.ids[2]++ + "-",
      0,
      0
    ];
  }
  function Zo(e, t) {
    let n;
    return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
  }
  const Rr = /* @__PURE__ */ new WeakMap();
  function On(e, t, n, r, i = false) {
    if (j(e)) {
      e.forEach((_, F) => On(_, t && (j(t) ? t[F] : t), n, r, i));
      return;
    }
    if (Bn(r) && !i) {
      r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && On(e, t, n, r.component.subTree);
      return;
    }
    const o = r.shapeFlag & 4 ? di(r.component) : r.el, s = i ? null : o, { i: a, r: l } = e, u = t && t.r, c = a.refs === ae ? a.refs = {} : a.refs, f = a.setupState, h = re(f), d = f === ae ? ra : (_) => Zo(c, _) ? false : le(h, _), g = (_, F) => !(F && Zo(c, F));
    if (u != null && u !== l) {
      if (Jo(t), we(u)) c[u] = null, d(u) && (f[u] = null);
      else if (Ee(u)) {
        const _ = t;
        g(u, _.k) && (u.value = null), _.k && (c[_.k] = null);
      }
    }
    if (ee(l)) tr(l, a, 12, [
      s,
      c
    ]);
    else {
      const _ = we(l), F = Ee(l);
      if (_ || F) {
        const N = () => {
          if (e.f) {
            const A = _ ? d(l) ? f[l] : c[l] : g() || !e.k ? l.value : c[e.k];
            if (i) j(A) && po(A, o);
            else if (j(A)) A.includes(o) || A.push(o);
            else if (_) c[l] = [
              o
            ], d(l) && (f[l] = c[l]);
            else {
              const O = [
                o
              ];
              g(l, e.k) && (l.value = O), e.k && (c[e.k] = O);
            }
          } else _ ? (c[l] = s, d(l) && (f[l] = s)) : F && (g(l, e.k) && (l.value = s), e.k && (c[e.k] = s));
        };
        if (s) {
          const A = () => {
            N(), Rr.delete(e);
          };
          A.id = -1, Rr.set(e, A), Oe(A, n);
        } else Jo(e), N();
      }
    }
  }
  function Jo(e) {
    const t = Rr.get(e);
    t && (t.flags |= 8, Rr.delete(e));
  }
  ni().requestIdleCallback;
  ni().cancelIdleCallback;
  const Bn = (e) => !!e.type.__asyncLoader, li = (e) => e.type.__isKeepAlive;
  function ic(e, t) {
    Va(e, "a", t);
  }
  function oc(e, t) {
    Va(e, "da", t);
  }
  function Va(e, t, n = Re) {
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
      for (; i && i.parent; ) li(i.parent.vnode) && sc(r, t, n, i), i = i.parent;
    }
  }
  function sc(e, t, n, r) {
    const i = ui(t, e, r, true);
    nr(() => {
      po(r[t], i);
    }, n);
  }
  function ui(e, t, n = Re, r = false) {
    if (n) {
      const i = n[e] || (n[e] = []), o = t.__weh || (t.__weh = (...s) => {
        Tt();
        const a = rr(n), l = Qe(t, n, e, s);
        return a(), kt(), l;
      });
      return r ? i.unshift(o) : i.push(o), o;
    }
  }
  const Pt = (e) => (t, n = Re) => {
    (!qn || e === "sp") && ui(e, (...r) => t(...r), n);
  }, ac = Pt("bm"), Lt = Pt("m"), lc = Pt("bu"), uc = Pt("u"), Ga = Pt("bum"), nr = Pt("um"), cc = Pt("sp"), fc = Pt("rtg"), dc = Pt("rtc");
  function hc(e, t = Re) {
    ui("ec", e, t);
  }
  const pc = /* @__PURE__ */ Symbol.for("v-ndc");
  function Wi(e, t, n, r) {
    let i;
    const o = n, s = j(e);
    if (s || we(e)) {
      const a = s && Yt(e);
      let l = false, u = false;
      a && (l = !qe(e), u = Ct(e), e = oi(e)), i = new Array(e.length);
      for (let c = 0, f = e.length; c < f; c++) i[c] = t(l ? u ? vn(Je(e[c])) : Je(e[c]) : e[c], c, void 0, o);
    } else if (typeof e == "number") {
      i = new Array(e);
      for (let a = 0; a < e; a++) i[a] = t(a + 1, a, void 0, o);
    } else if (ce(e)) if (e[Symbol.iterator]) i = Array.from(e, (a, l) => t(a, l, void 0, o));
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
  const qi = (e) => e ? fl(e) ? di(e) : qi(e.parent) : null, Fn = Se(/* @__PURE__ */ Object.create(null), {
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
      Mo(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = ai.bind(e.proxy)),
    $watch: (e) => Qu.bind(e)
  }), Si = (e, t) => e !== ae && !e.__isScriptSetup && le(e, t), gc = {
    get({ _: e }, t) {
      if (t === "__v_skip") return true;
      const { ctx: n, setupState: r, data: i, props: o, accessCache: s, type: a, appContext: l } = e;
      if (t[0] !== "$") {
        const h = s[t];
        if (h !== void 0) switch (h) {
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
          if (Si(r, t)) return s[t] = 1, r[t];
          if (i !== ae && le(i, t)) return s[t] = 2, i[t];
          if (le(o, t)) return s[t] = 3, o[t];
          if (n !== ae && le(n, t)) return s[t] = 4, n[t];
          Ki && (s[t] = 0);
        }
      }
      const u = Fn[t];
      let c, f;
      if (u) return t === "$attrs" && ke(e.attrs, "get", ""), u(e);
      if ((c = a.__cssModules) && (c = c[t])) return c;
      if (n !== ae && le(n, t)) return s[t] = 4, n[t];
      if (f = l.config.globalProperties, le(f, t)) return f[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: i, ctx: o } = e;
      return Si(i, t) ? (i[t] = n, true) : r !== ae && le(r, t) ? (r[t] = n, true) : le(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (o[t] = n, true);
    },
    has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, props: o, type: s } }, a) {
      let l;
      return !!(n[a] || e !== ae && a[0] !== "$" && le(e, a) || Si(t, a) || le(o, a) || le(r, a) || le(Fn, a) || le(i.config.globalProperties, a) || (l = s.__cssModules) && l[a]);
    },
    defineProperty(e, t, n) {
      return n.get != null ? e._.accessCache[t] = 0 : le(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
    }
  };
  function zr(e) {
    return j(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
  }
  function ko(e, t) {
    return !e || !t ? e || t : j(e) && j(t) ? e.concat(t) : Se({}, zr(e), zr(t));
  }
  let Ki = true;
  function mc(e) {
    const t = Wa(e), n = e.proxy, r = e.ctx;
    Ki = false, t.beforeCreate && Qo(t.beforeCreate, e, "bc");
    const { data: i, computed: o, methods: s, watch: a, provide: l, inject: u, created: c, beforeMount: f, mounted: h, beforeUpdate: d, updated: g, activated: _, deactivated: F, beforeDestroy: N, beforeUnmount: A, destroyed: O, unmounted: y, render: S, renderTracked: P, renderTriggered: W, errorCaptured: X, serverPrefetch: $, expose: H, inheritAttrs: q, components: w, directives: G, filters: Z } = t;
    if (u && vc(u, r, null), s) for (const D in s) {
      const z = s[D];
      ee(z) && (r[D] = z.bind(n));
    }
    if (i) {
      const D = i.call(n, n);
      ce(D) && (e.data = xo(D));
    }
    if (Ki = true, o) for (const D in o) {
      const z = o[D], te = ee(z) ? z.bind(n, n) : ee(z.get) ? z.get.bind(n, n) : ut, se = !ee(z) && ee(z.set) ? z.set.bind(n) : ut, U = Te({
        get: te,
        set: se
      });
      Object.defineProperty(r, D, {
        enumerable: true,
        configurable: true,
        get: () => U.value,
        set: (b) => U.value = b
      });
    }
    if (a) for (const D in a) Ha(a[D], r, n, D);
    if (l) {
      const D = ee(l) ? l.call(n) : l;
      Reflect.ownKeys(D).forEach((z) => {
        Xu(z, D[z]);
      });
    }
    c && Qo(c, e, "c");
    function L(D, z) {
      j(z) ? z.forEach((te) => D(te.bind(n))) : z && D(z.bind(n));
    }
    if (L(ac, f), L(Lt, h), L(lc, d), L(uc, g), L(ic, _), L(oc, F), L(hc, X), L(dc, P), L(fc, W), L(Ga, A), L(nr, y), L(cc, $), j(H)) if (H.length) {
      const D = e.exposed || (e.exposed = {});
      H.forEach((z) => {
        Object.defineProperty(D, z, {
          get: () => n[z],
          set: (te) => n[z] = te,
          enumerable: true
        });
      });
    } else e.exposed || (e.exposed = {});
    S && e.render === ut && (e.render = S), q != null && (e.inheritAttrs = q), w && (e.components = w), G && (e.directives = G), $ && $a(e);
  }
  function vc(e, t, n = ut) {
    j(e) && (e = ji(e));
    for (const r in e) {
      const i = e[r];
      let o;
      ce(i) ? "default" in i ? o = br(i.from || r, i.default, true) : o = br(i.from || r) : o = br(i), Ee(o) ? Object.defineProperty(t, r, {
        enumerable: true,
        configurable: true,
        get: () => o.value,
        set: (s) => o.value = s
      }) : t[r] = o;
    }
  }
  function Qo(e, t, n) {
    Qe(j(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
  }
  function Ha(e, t, n, r) {
    let i = r.includes(".") ? Na(n, r) : () => n[r];
    if (we(e)) {
      const o = t[e];
      ee(o) && Bt(i, o);
    } else if (ee(e)) Bt(i, e.bind(n));
    else if (ce(e)) if (j(e)) e.forEach((o) => Ha(o, t, n, r));
    else {
      const o = ee(e.handler) ? e.handler.bind(n) : t[e.handler];
      ee(o) && Bt(i, o, e);
    }
  }
  function Wa(e) {
    const t = e.type, { mixins: n, extends: r } = t, { mixins: i, optionsCache: o, config: { optionMergeStrategies: s } } = e.appContext, a = o.get(t);
    let l;
    return a ? l = a : !i.length && !n && !r ? l = t : (l = {}, i.length && i.forEach((u) => Nr(l, u, s, true)), Nr(l, t, s)), ce(t) && o.set(t, l), l;
  }
  function Nr(e, t, n, r = false) {
    const { mixins: i, extends: o } = t;
    o && Nr(e, o, n, true), i && i.forEach((s) => Nr(e, s, n, true));
    for (const s in t) if (!(r && s === "expose")) {
      const a = _c[s] || n && n[s];
      e[s] = a ? a(e[s], t[s]) : t[s];
    }
    return e;
  }
  const _c = {
    data: es,
    props: ts,
    emits: ts,
    methods: An,
    computed: An,
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
    components: An,
    directives: An,
    watch: yc,
    provide: es,
    inject: bc
  };
  function es(e, t) {
    return t ? e ? function() {
      return Se(ee(e) ? e.call(this, this) : e, ee(t) ? t.call(this, this) : t);
    } : t : e;
  }
  function bc(e, t) {
    return An(ji(e), ji(t));
  }
  function ji(e) {
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
  function An(e, t) {
    return e ? Se(/* @__PURE__ */ Object.create(null), e, t) : t;
  }
  function ts(e, t) {
    return e ? j(e) && j(t) ? [
      .../* @__PURE__ */ new Set([
        ...e,
        ...t
      ])
    ] : Se(/* @__PURE__ */ Object.create(null), zr(e), zr(t ?? {})) : t;
  }
  function yc(e, t) {
    if (!e) return t;
    if (!t) return e;
    const n = Se(/* @__PURE__ */ Object.create(null), e);
    for (const r in t) n[r] = Ae(e[r], t[r]);
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
  let xc = 0;
  function wc(e, t) {
    return function(r, i = null) {
      ee(r) || (r = Se({}, r)), i != null && !ce(i) && (i = null);
      const o = qa(), s = /* @__PURE__ */ new WeakSet(), a = [];
      let l = false;
      const u = o.app = {
        _uid: xc++,
        _component: r,
        _props: i,
        _container: null,
        _context: o,
        _instance: null,
        version: ef,
        get config() {
          return o.config;
        },
        set config(c) {
        },
        use(c, ...f) {
          return s.has(c) || (c && ee(c.install) ? (s.add(c), c.install(u, ...f)) : ee(c) && (s.add(c), c(u, ...f))), u;
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
        mount(c, f, h) {
          if (!l) {
            const d = u._ceVNode || xe(r, i);
            return d.appContext = o, h === true ? h = "svg" : h === false && (h = void 0), e(d, c, h), l = true, u._container = c, c.__vue_app__ = u, di(d.component);
          }
        },
        onUnmount(c) {
          a.push(c);
        },
        unmount() {
          l && (Qe(a, u._instance, 16), e(null, u._container), delete u._container.__vue_app__);
        },
        provide(c, f) {
          return o.provides[c] = f, u;
        },
        runWithContext(c) {
          const f = dn;
          dn = u;
          try {
            return c();
          } finally {
            dn = f;
          }
        }
      };
      return u;
    };
  }
  let dn = null;
  function St(e, t, n = ae) {
    const r = Po(), i = Mt(t), o = Dt(t), s = Ka(e, i), a = $u((l, u) => {
      let c, f = ae, h;
      return Ju(() => {
        const d = e[i];
        Fe(c, d) && (c = d, u());
      }), {
        get() {
          return l(), n.get ? n.get(c) : c;
        },
        set(d) {
          const g = n.set ? n.set(d) : d;
          if (!Fe(g, c) && !(f !== ae && Fe(d, f))) return;
          const _ = r.vnode.props;
          _ && (t in _ || i in _ || o in _) && (`onUpdate:${t}` in _ || `onUpdate:${i}` in _ || `onUpdate:${o}` in _) || (c = d, u()), r.emit(`update:${t}`, g), Fe(d, g) && Fe(d, f) && !Fe(g, h) && u(), f = d, h = g;
        }
      };
    });
    return a[Symbol.iterator] = () => {
      let l = 0;
      return {
        next() {
          return l < 2 ? {
            value: l++ ? s || ae : a,
            done: false
          } : {
            done: true
          };
        }
      };
    }, a;
  }
  const Ka = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Mt(t)}Modifiers`] || e[`${Dt(t)}Modifiers`];
  function Sc(e, t, ...n) {
    if (e.isUnmounted) return;
    const r = e.vnode.props || ae;
    let i = n;
    const o = t.startsWith("update:"), s = o && Ka(r, t.slice(7));
    s && (s.trim && (i = n.map((c) => we(c) ? c.trim() : c)), s.number && (i = n.map(mo)));
    let a, l = r[a = vi(t)] || r[a = vi(Mt(t))];
    !l && o && (l = r[a = vi(Dt(t))]), l && Qe(l, e, 6, i);
    const u = r[a + "Once"];
    if (u) {
      if (!e.emitted) e.emitted = {};
      else if (e.emitted[a]) return;
      e.emitted[a] = true, Qe(u, e, 6, i);
    }
  }
  const Mc = /* @__PURE__ */ new WeakMap();
  function ja(e, t, n = false) {
    const r = n ? Mc : t.emitsCache, i = r.get(e);
    if (i !== void 0) return i;
    const o = e.emits;
    let s = {}, a = false;
    if (!ee(e)) {
      const l = (u) => {
        const c = ja(u, t, true);
        c && (a = true, Se(s, c));
      };
      !n && t.mixins.length && t.mixins.forEach(l), e.extends && l(e.extends), e.mixins && e.mixins.forEach(l);
    }
    return !o && !a ? (ce(e) && r.set(e, null), null) : (j(o) ? o.forEach((l) => s[l] = null) : Se(s, o), ce(e) && r.set(e, s), s);
  }
  function ci(e, t) {
    return !e || !Qr(t) ? false : (t = t.slice(2).replace(/Once$/, ""), le(e, t[0].toLowerCase() + t.slice(1)) || le(e, Dt(t)) || le(e, t));
  }
  function ns(e) {
    const { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [o], slots: s, attrs: a, emit: l, render: u, renderCache: c, props: f, data: h, setupState: d, ctx: g, inheritAttrs: _ } = e, F = Lr(e);
    let N, A;
    try {
      if (n.shapeFlag & 4) {
        const y = i || r, S = y;
        N = at(u.call(S, y, c, f, d, h, g)), A = a;
      } else {
        const y = t;
        N = at(y.length > 1 ? y(f, {
          attrs: a,
          slots: s,
          emit: l
        }) : y(f, null)), A = t.props ? a : Tc(a);
      }
    } catch (y) {
      Dn.length = 0, si(y, e, 1), N = xe(Le);
    }
    let O = N;
    if (A && _ !== false) {
      const y = Object.keys(A), { shapeFlag: S } = O;
      y.length && S & 7 && (o && y.some(ho) && (A = kc(A, o)), O = Ft(O, A, false, true));
    }
    return n.dirs && (O = Ft(O, null, false, true), O.dirs = O.dirs ? O.dirs.concat(n.dirs) : n.dirs), n.transition && Hn(O, n.transition), N = O, Lr(F), N;
  }
  const Tc = (e) => {
    let t;
    for (const n in e) (n === "class" || n === "style" || Qr(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  }, kc = (e, t) => {
    const n = {};
    for (const r in e) (!ho(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
  function Cc(e, t, n) {
    const { props: r, children: i, component: o } = e, { props: s, children: a, patchFlag: l } = t, u = o.emitsOptions;
    if (t.dirs || t.transition) return true;
    if (n && l >= 0) {
      if (l & 1024) return true;
      if (l & 16) return r ? rs(r, s, u) : !!s;
      if (l & 8) {
        const c = t.dynamicProps;
        for (let f = 0; f < c.length; f++) {
          const h = c[f];
          if (Xa(s, r, h) && !ci(u, h)) return true;
        }
      }
    } else return (i || a) && (!a || !a.$stable) ? true : r === s ? false : r ? s ? rs(r, s, u) : true : !!s;
    return false;
  }
  function rs(e, t, n) {
    const r = Object.keys(t);
    if (r.length !== Object.keys(e).length) return true;
    for (let i = 0; i < r.length; i++) {
      const o = r[i];
      if (Xa(t, e, o) && !ci(n, o)) return true;
    }
    return false;
  }
  function Xa(e, t, n) {
    const r = e[n], i = t[n];
    return n === "style" && ce(r) && ce(i) ? !er(r, i) : r !== i;
  }
  function Ec({ vnode: e, parent: t }, n) {
    for (; t; ) {
      const r = t.subTree;
      if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
      else break;
    }
  }
  const Ya = {}, Za = () => Object.create(Ya), Ja = (e) => Object.getPrototypeOf(e) === Ya;
  function Ac(e, t, n, r = false) {
    const i = {}, o = Za();
    e.propsDefaults = /* @__PURE__ */ Object.create(null), Qa(e, t, i, o);
    for (const s in e.propsOptions[0]) s in i || (i[s] = void 0);
    n ? e.props = r ? i : Nu(i) : e.type.props ? e.props = i : e.props = o, e.attrs = o;
  }
  function Pc(e, t, n, r) {
    const { props: i, attrs: o, vnode: { patchFlag: s } } = e, a = re(i), [l] = e.propsOptions;
    let u = false;
    if ((r || s > 0) && !(s & 16)) {
      if (s & 8) {
        const c = e.vnode.dynamicProps;
        for (let f = 0; f < c.length; f++) {
          let h = c[f];
          if (ci(e.emitsOptions, h)) continue;
          const d = t[h];
          if (l) if (le(o, h)) d !== o[h] && (o[h] = d, u = true);
          else {
            const g = Mt(h);
            i[g] = Xi(l, a, g, d, e, false);
          }
          else d !== o[h] && (o[h] = d, u = true);
        }
      }
    } else {
      Qa(e, t, i, o) && (u = true);
      let c;
      for (const f in a) (!t || !le(t, f) && ((c = Dt(f)) === f || !le(t, c))) && (l ? n && (n[f] !== void 0 || n[c] !== void 0) && (i[f] = Xi(l, a, f, void 0, e, true)) : delete i[f]);
      if (o !== a) for (const f in o) (!t || !le(t, f)) && (delete o[f], u = true);
    }
    u && xt(e.attrs, "set", "");
  }
  function Qa(e, t, n, r) {
    const [i, o] = e.propsOptions;
    let s = false, a;
    if (t) for (let l in t) {
      if (zn(l)) continue;
      const u = t[l];
      let c;
      i && le(i, c = Mt(l)) ? !o || !o.includes(c) ? n[c] = u : (a || (a = {}))[c] = u : ci(e.emitsOptions, l) || (!(l in r) || u !== r[l]) && (r[l] = u, s = true);
    }
    if (o) {
      const l = re(n), u = a || ae;
      for (let c = 0; c < o.length; c++) {
        const f = o[c];
        n[f] = Xi(i, l, f, u[f], e, !le(u, f));
      }
    }
    return s;
  }
  function Xi(e, t, n, r, i, o) {
    const s = e[n];
    if (s != null) {
      const a = le(s, "default");
      if (a && r === void 0) {
        const l = s.default;
        if (s.type !== Function && !s.skipFactory && ee(l)) {
          const { propsDefaults: u } = i;
          if (n in u) r = u[n];
          else {
            const c = rr(i);
            r = u[n] = l.call(null, t), c();
          }
        } else r = l;
        i.ce && i.ce._setProp(n, r);
      }
      s[0] && (o && !a ? r = false : s[1] && (r === "" || r === Dt(n)) && (r = true));
    }
    return r;
  }
  const Lc = /* @__PURE__ */ new WeakMap();
  function el(e, t, n = false) {
    const r = n ? Lc : t.propsCache, i = r.get(e);
    if (i) return i;
    const o = e.props, s = {}, a = [];
    let l = false;
    if (!ee(e)) {
      const c = (f) => {
        l = true;
        const [h, d] = el(f, t, true);
        Se(s, h), d && a.push(...d);
      };
      !n && t.mixins.length && t.mixins.forEach(c), e.extends && c(e.extends), e.mixins && e.mixins.forEach(c);
    }
    if (!o && !l) return ce(e) && r.set(e, un), un;
    if (j(o)) for (let c = 0; c < o.length; c++) {
      const f = Mt(o[c]);
      is(f) && (s[f] = ae);
    }
    else if (o) for (const c in o) {
      const f = Mt(c);
      if (is(f)) {
        const h = o[c], d = s[f] = j(h) || ee(h) ? {
          type: h
        } : Se({}, h), g = d.type;
        let _ = false, F = true;
        if (j(g)) for (let N = 0; N < g.length; ++N) {
          const A = g[N], O = ee(A) && A.name;
          if (O === "Boolean") {
            _ = true;
            break;
          } else O === "String" && (F = false);
        }
        else _ = ee(g) && g.name === "Boolean";
        d[0] = _, d[1] = F, (_ || le(d, "default")) && a.push(f);
      }
    }
    const u = [
      s,
      a
    ];
    return ce(e) && r.set(e, u), u;
  }
  function is(e) {
    return e[0] !== "$" && !zn(e);
  }
  const Co = (e) => e === "_" || e === "_ctx" || e === "$stable", Eo = (e) => j(e) ? e.map(at) : [
    at(e)
  ], Rc = (e, t, n) => {
    if (t._n) return t;
    const r = za((...i) => Eo(t(...i)), n);
    return r._c = false, r;
  }, tl = (e, t, n) => {
    const r = e._ctx;
    for (const i in e) {
      if (Co(i)) continue;
      const o = e[i];
      if (ee(o)) t[i] = Rc(i, o, r);
      else if (o != null) {
        const s = Eo(o);
        t[i] = () => s;
      }
    }
  }, nl = (e, t) => {
    const n = Eo(t);
    e.slots.default = () => n;
  }, rl = (e, t, n) => {
    for (const r in t) (n || !Co(r)) && (e[r] = t[r]);
  }, zc = (e, t, n) => {
    const r = e.slots = Za();
    if (e.vnode.shapeFlag & 32) {
      const i = t._;
      i ? (rl(r, t, n), n && la(r, "_", i, true)) : tl(t, r);
    } else t && nl(e, t);
  }, Nc = (e, t, n) => {
    const { vnode: r, slots: i } = e;
    let o = true, s = ae;
    if (r.shapeFlag & 32) {
      const a = t._;
      a ? n && a === 1 ? o = false : rl(i, t, n) : (o = !t.$stable, tl(t, i)), s = t;
    } else t && (nl(e, t), s = {
      default: 1
    });
    if (o) for (const a in i) !Co(a) && s[a] == null && delete i[a];
  }, Oe = Dc;
  function Ic(e) {
    return Oc(e);
  }
  function Oc(e, t) {
    const n = ni();
    n.__VUE__ = true;
    const { insert: r, remove: i, patchProp: o, createElement: s, createText: a, createComment: l, setText: u, setElementText: c, parentNode: f, nextSibling: h, setScopeId: d = ut, insertStaticContent: g } = e, _ = (p, v, x, E = null, M = null, T = null, B = void 0, I = null, R = !!v.dynamicChildren) => {
      if (p === v) return;
      p && !Wt(p, v) && (E = gt(p), b(p, M, T, true), p = null), v.patchFlag === -2 && (R = false, v.dynamicChildren = null);
      const { type: k, ref: Y, shapeFlag: V } = v;
      switch (k) {
        case fi:
          F(p, v, x, E);
          break;
        case Le:
          N(p, v, x, E);
          break;
        case yr:
          p == null && A(v, x, E, B);
          break;
        case Ue:
          w(p, v, x, E, M, T, B, I, R);
          break;
        default:
          V & 1 ? S(p, v, x, E, M, T, B, I, R) : V & 6 ? G(p, v, x, E, M, T, B, I, R) : (V & 64 || V & 128) && k.process(p, v, x, E, M, T, B, I, R, wn);
      }
      Y != null && M ? On(Y, p && p.ref, T, v || p, !v) : Y == null && p && p.ref != null && On(p.ref, null, T, p, true);
    }, F = (p, v, x, E) => {
      if (p == null) r(v.el = a(v.children), x, E);
      else {
        const M = v.el = p.el;
        v.children !== p.children && u(M, v.children);
      }
    }, N = (p, v, x, E) => {
      p == null ? r(v.el = l(v.children || ""), x, E) : v.el = p.el;
    }, A = (p, v, x, E) => {
      [p.el, p.anchor] = g(p.children, v, x, E, p.el, p.anchor);
    }, O = ({ el: p, anchor: v }, x, E) => {
      let M;
      for (; p && p !== v; ) M = h(p), r(p, x, E), p = M;
      r(v, x, E);
    }, y = ({ el: p, anchor: v }) => {
      let x;
      for (; p && p !== v; ) x = h(p), i(p), p = x;
      i(v);
    }, S = (p, v, x, E, M, T, B, I, R) => {
      if (v.type === "svg" ? B = "svg" : v.type === "math" && (B = "mathml"), p == null) P(v, x, E, M, T, B, I, R);
      else {
        const k = p.el && p.el._isVueCE ? p.el : null;
        try {
          k && k._beginPatch(), $(p, v, M, T, B, I, R);
        } finally {
          k && k._endPatch();
        }
      }
    }, P = (p, v, x, E, M, T, B, I) => {
      let R, k;
      const { props: Y, shapeFlag: V, transition: K, dirs: Q } = p;
      if (R = p.el = s(p.type, T, Y && Y.is, Y), V & 8 ? c(R, p.children) : V & 16 && X(p.children, R, null, E, M, Mi(p, T), B, I), Q && Ut(p, null, E, "created"), W(R, p, p.scopeId, B, E), Y) {
        for (const pe in Y) pe !== "value" && !zn(pe) && o(R, pe, null, Y[pe], T, E);
        "value" in Y && o(R, "value", null, Y.value, T), (k = Y.onVnodeBeforeMount) && it(k, E, p);
      }
      Q && Ut(p, null, E, "beforeMount");
      const ie = Bc(M, K);
      ie && K.beforeEnter(R), r(R, v, x), ((k = Y && Y.onVnodeMounted) || ie || Q) && Oe(() => {
        k && it(k, E, p), ie && K.enter(R), Q && Ut(p, null, E, "mounted");
      }, M);
    }, W = (p, v, x, E, M) => {
      if (x && d(p, x), E) for (let T = 0; T < E.length; T++) d(p, E[T]);
      if (M) {
        let T = M.subTree;
        if (v === T || al(T.type) && (T.ssContent === v || T.ssFallback === v)) {
          const B = M.vnode;
          W(p, B, B.scopeId, B.slotScopeIds, M.parent);
        }
      }
    }, X = (p, v, x, E, M, T, B, I, R = 0) => {
      for (let k = R; k < p.length; k++) {
        const Y = p[k] = I ? yt(p[k]) : at(p[k]);
        _(null, Y, v, x, E, M, T, B, I);
      }
    }, $ = (p, v, x, E, M, T, B) => {
      const I = v.el = p.el;
      let { patchFlag: R, dynamicChildren: k, dirs: Y } = v;
      R |= p.patchFlag & 16;
      const V = p.props || ae, K = v.props || ae;
      let Q;
      if (x && $t(x, false), (Q = K.onVnodeBeforeUpdate) && it(Q, x, v, p), Y && Ut(v, p, x, "beforeUpdate"), x && $t(x, true), (V.innerHTML && K.innerHTML == null || V.textContent && K.textContent == null) && c(I, ""), k ? H(p.dynamicChildren, k, I, x, E, Mi(v, M), T) : B || z(p, v, I, null, x, E, Mi(v, M), T, false), R > 0) {
        if (R & 16) q(I, V, K, x, M);
        else if (R & 2 && V.class !== K.class && o(I, "class", null, K.class, M), R & 4 && o(I, "style", V.style, K.style, M), R & 8) {
          const ie = v.dynamicProps;
          for (let pe = 0; pe < ie.length; pe++) {
            const de = ie[pe], Ne = V[de], Ie = K[de];
            (Ie !== Ne || de === "value") && o(I, de, Ne, Ie, M, x);
          }
        }
        R & 1 && p.children !== v.children && c(I, v.children);
      } else !B && k == null && q(I, V, K, x, M);
      ((Q = K.onVnodeUpdated) || Y) && Oe(() => {
        Q && it(Q, x, v, p), Y && Ut(v, p, x, "updated");
      }, E);
    }, H = (p, v, x, E, M, T, B) => {
      for (let I = 0; I < v.length; I++) {
        const R = p[I], k = v[I], Y = R.el && (R.type === Ue || !Wt(R, k) || R.shapeFlag & 198) ? f(R.el) : x;
        _(R, k, Y, null, E, M, T, B, true);
      }
    }, q = (p, v, x, E, M) => {
      if (v !== x) {
        if (v !== ae) for (const T in v) !zn(T) && !(T in x) && o(p, T, v[T], null, M, E);
        for (const T in x) {
          if (zn(T)) continue;
          const B = x[T], I = v[T];
          B !== I && T !== "value" && o(p, T, I, B, M, E);
        }
        "value" in x && o(p, "value", v.value, x.value, M);
      }
    }, w = (p, v, x, E, M, T, B, I, R) => {
      const k = v.el = p ? p.el : a(""), Y = v.anchor = p ? p.anchor : a("");
      let { patchFlag: V, dynamicChildren: K, slotScopeIds: Q } = v;
      Q && (I = I ? I.concat(Q) : Q), p == null ? (r(k, x, E), r(Y, x, E), X(v.children || [], x, Y, M, T, B, I, R)) : V > 0 && V & 64 && K && p.dynamicChildren && p.dynamicChildren.length === K.length ? (H(p.dynamicChildren, K, x, M, T, B, I), (v.key != null || M && v === M.subTree) && il(p, v, true)) : z(p, v, x, Y, M, T, B, I, R);
    }, G = (p, v, x, E, M, T, B, I, R) => {
      v.slotScopeIds = I, p == null ? v.shapeFlag & 512 ? M.ctx.activate(v, x, E, B, R) : Z(v, x, E, M, T, B, R) : fe(p, v, R);
    }, Z = (p, v, x, E, M, T, B) => {
      const I = p.component = Kc(p, E, M);
      if (li(p) && (I.ctx.renderer = wn), jc(I, false, B), I.asyncDep) {
        if (M && M.registerDep(I, L, B), !p.el) {
          const R = I.subTree = xe(Le);
          N(null, R, v, x), p.placeholder = R.el;
        }
      } else L(I, p, v, x, M, T, B);
    }, fe = (p, v, x) => {
      const E = v.component = p.component;
      if (Cc(p, v, x)) if (E.asyncDep && !E.asyncResolved) {
        D(E, v, x);
        return;
      } else E.next = v, E.update();
      else v.el = p.el, E.vnode = v;
    }, L = (p, v, x, E, M, T, B) => {
      const I = () => {
        if (p.isMounted) {
          let { next: V, bu: K, u: Q, parent: ie, vnode: pe } = p;
          {
            const nt = ol(p);
            if (nt) {
              V && (V.el = pe.el, D(p, V, B)), nt.asyncDep.then(() => {
                Oe(() => {
                  p.isUnmounted || k();
                }, M);
              });
              return;
            }
          }
          let de = V, Ne;
          $t(p, false), V ? (V.el = pe.el, D(p, V, B)) : V = pe, K && _r(K), (Ne = V.props && V.props.onVnodeBeforeUpdate) && it(Ne, ie, V, pe), $t(p, true);
          const Ie = ns(p), tt = p.subTree;
          p.subTree = Ie, _(tt, Ie, f(tt.el), gt(tt), p, M, T), V.el = Ie.el, de === null && Ec(p, Ie.el), Q && Oe(Q, M), (Ne = V.props && V.props.onVnodeUpdated) && Oe(() => it(Ne, ie, V, pe), M);
        } else {
          let V;
          const { el: K, props: Q } = v, { bm: ie, m: pe, parent: de, root: Ne, type: Ie } = p, tt = Bn(v);
          $t(p, false), ie && _r(ie), !tt && (V = Q && Q.onVnodeBeforeMount) && it(V, de, v), $t(p, true);
          {
            Ne.ce && Ne.ce._hasShadowRoot() && Ne.ce._injectChildStyle(Ie);
            const nt = p.subTree = ns(p);
            _(null, nt, x, E, p, M, T), v.el = nt.el;
          }
          if (pe && Oe(pe, M), !tt && (V = Q && Q.onVnodeMounted)) {
            const nt = v;
            Oe(() => it(V, de, nt), M);
          }
          (v.shapeFlag & 256 || de && Bn(de.vnode) && de.vnode.shapeFlag & 256) && p.a && Oe(p.a, M), p.isMounted = true, v = x = E = null;
        }
      };
      p.scope.on();
      const R = p.effect = new ha(I);
      p.scope.off();
      const k = p.update = R.run.bind(R), Y = p.job = R.runIfDirty.bind(R);
      Y.i = p, Y.id = p.uid, R.scheduler = () => Mo(Y), $t(p, true), k();
    }, D = (p, v, x) => {
      v.component = p;
      const E = p.vnode.props;
      p.vnode = v, p.next = null, Pc(p, v.props, E, x), Nc(p, v.children, x), Tt(), Xo(p), kt();
    }, z = (p, v, x, E, M, T, B, I, R = false) => {
      const k = p && p.children, Y = p ? p.shapeFlag : 0, V = v.children, { patchFlag: K, shapeFlag: Q } = v;
      if (K > 0) {
        if (K & 128) {
          se(k, V, x, E, M, T, B, I, R);
          return;
        } else if (K & 256) {
          te(k, V, x, E, M, T, B, I, R);
          return;
        }
      }
      Q & 8 ? (Y & 16 && ze(k, M, T), V !== k && c(x, V)) : Y & 16 ? Q & 16 ? se(k, V, x, E, M, T, B, I, R) : ze(k, M, T, true) : (Y & 8 && c(x, ""), Q & 16 && X(V, x, E, M, T, B, I, R));
    }, te = (p, v, x, E, M, T, B, I, R) => {
      p = p || un, v = v || un;
      const k = p.length, Y = v.length, V = Math.min(k, Y);
      let K;
      for (K = 0; K < V; K++) {
        const Q = v[K] = R ? yt(v[K]) : at(v[K]);
        _(p[K], Q, x, null, M, T, B, I, R);
      }
      k > Y ? ze(p, M, T, true, false, V) : X(v, x, E, M, T, B, I, R, V);
    }, se = (p, v, x, E, M, T, B, I, R) => {
      let k = 0;
      const Y = v.length;
      let V = p.length - 1, K = Y - 1;
      for (; k <= V && k <= K; ) {
        const Q = p[k], ie = v[k] = R ? yt(v[k]) : at(v[k]);
        if (Wt(Q, ie)) _(Q, ie, x, null, M, T, B, I, R);
        else break;
        k++;
      }
      for (; k <= V && k <= K; ) {
        const Q = p[V], ie = v[K] = R ? yt(v[K]) : at(v[K]);
        if (Wt(Q, ie)) _(Q, ie, x, null, M, T, B, I, R);
        else break;
        V--, K--;
      }
      if (k > V) {
        if (k <= K) {
          const Q = K + 1, ie = Q < Y ? v[Q].el : E;
          for (; k <= K; ) _(null, v[k] = R ? yt(v[k]) : at(v[k]), x, ie, M, T, B, I, R), k++;
        }
      } else if (k > K) for (; k <= V; ) b(p[k], M, T, true), k++;
      else {
        const Q = k, ie = k, pe = /* @__PURE__ */ new Map();
        for (k = ie; k <= K; k++) {
          const De = v[k] = R ? yt(v[k]) : at(v[k]);
          De.key != null && pe.set(De.key, k);
        }
        let de, Ne = 0;
        const Ie = K - ie + 1;
        let tt = false, nt = 0;
        const Sn = new Array(Ie);
        for (k = 0; k < Ie; k++) Sn[k] = 0;
        for (k = Q; k <= V; k++) {
          const De = p[k];
          if (Ne >= Ie) {
            b(De, M, T, true);
            continue;
          }
          let rt;
          if (De.key != null) rt = pe.get(De.key);
          else for (de = ie; de <= K; de++) if (Sn[de - ie] === 0 && Wt(De, v[de])) {
            rt = de;
            break;
          }
          rt === void 0 ? b(De, M, T, true) : (Sn[rt - ie] = k + 1, rt >= nt ? nt = rt : tt = true, _(De, v[rt], x, null, M, T, B, I, R), Ne++);
        }
        const Vo = tt ? Fc(Sn) : un;
        for (de = Vo.length - 1, k = Ie - 1; k >= 0; k--) {
          const De = ie + k, rt = v[De], Go = v[De + 1], Ho = De + 1 < Y ? Go.el || sl(Go) : E;
          Sn[k] === 0 ? _(null, rt, x, Ho, M, T, B, I, R) : tt && (de < 0 || k !== Vo[de] ? U(rt, x, Ho, 2) : de--);
        }
      }
    }, U = (p, v, x, E, M = null) => {
      const { el: T, type: B, transition: I, children: R, shapeFlag: k } = p;
      if (k & 6) {
        U(p.component.subTree, v, x, E);
        return;
      }
      if (k & 128) {
        p.suspense.move(v, x, E);
        return;
      }
      if (k & 64) {
        B.move(p, v, x, wn);
        return;
      }
      if (B === Ue) {
        r(T, v, x);
        for (let V = 0; V < R.length; V++) U(R[V], v, x, E);
        r(p.anchor, v, x);
        return;
      }
      if (B === yr) {
        O(p, v, x);
        return;
      }
      if (E !== 2 && k & 1 && I) if (E === 0) I.beforeEnter(T), r(T, v, x), Oe(() => I.enter(T), M);
      else {
        const { leave: V, delayLeave: K, afterLeave: Q } = I, ie = () => {
          p.ctx.isUnmounted ? i(T) : r(T, v, x);
        }, pe = () => {
          T._isLeaving && T[st](true), V(T, () => {
            ie(), Q && Q();
          });
        };
        K ? K(T, ie, pe) : pe();
      }
      else r(T, v, x);
    }, b = (p, v, x, E = false, M = false) => {
      const { type: T, props: B, ref: I, children: R, dynamicChildren: k, shapeFlag: Y, patchFlag: V, dirs: K, cacheIndex: Q } = p;
      if (V === -2 && (M = false), I != null && (Tt(), On(I, null, x, p, true), kt()), Q != null && (v.renderCache[Q] = void 0), Y & 256) {
        v.ctx.deactivate(p);
        return;
      }
      const ie = Y & 1 && K, pe = !Bn(p);
      let de;
      if (pe && (de = B && B.onVnodeBeforeUnmount) && it(de, v, p), Y & 6) Ge(p.component, x, E);
      else {
        if (Y & 128) {
          p.suspense.unmount(x, E);
          return;
        }
        ie && Ut(p, null, v, "beforeUnmount"), Y & 64 ? p.type.remove(p, v, x, wn, E) : k && !k.hasOnce && (T !== Ue || V > 0 && V & 64) ? ze(k, v, x, false, true) : (T === Ue && V & 384 || !M && Y & 16) && ze(R, v, x), E && C(p);
      }
      (pe && (de = B && B.onVnodeUnmounted) || ie) && Oe(() => {
        de && it(de, v, p), ie && Ut(p, null, v, "unmounted");
      }, x);
    }, C = (p) => {
      const { type: v, el: x, anchor: E, transition: M } = p;
      if (v === Ue) {
        Me(x, E);
        return;
      }
      if (v === yr) {
        y(p);
        return;
      }
      const T = () => {
        i(x), M && !M.persisted && M.afterLeave && M.afterLeave();
      };
      if (p.shapeFlag & 1 && M && !M.persisted) {
        const { leave: B, delayLeave: I } = M, R = () => B(x, T);
        I ? I(p.el, T, R) : R();
      } else T();
    }, Me = (p, v) => {
      let x;
      for (; p !== v; ) x = h(p), i(p), p = x;
      i(v);
    }, Ge = (p, v, x) => {
      const { bum: E, scope: M, job: T, subTree: B, um: I, m: R, a: k } = p;
      os(R), os(k), E && _r(E), M.stop(), T && (T.flags |= 8, b(B, p, v, x)), I && Oe(I, v), Oe(() => {
        p.isUnmounted = true;
      }, v);
    }, ze = (p, v, x, E = false, M = false, T = 0) => {
      for (let B = T; B < p.length; B++) b(p[B], v, x, E, M);
    }, gt = (p) => {
      if (p.shapeFlag & 6) return gt(p.component.subTree);
      if (p.shapeFlag & 128) return p.suspense.next();
      const v = h(p.anchor || p.el), x = v && v[ec];
      return x ? h(x) : v;
    };
    let xn = false;
    const ar = (p, v, x) => {
      let E;
      p == null ? v._vnode && (b(v._vnode, null, null, true), E = v._vnode.component) : _(v._vnode || null, p, v, null, null, null, x), v._vnode = p, xn || (xn = true, Xo(E), Pa(), xn = false);
    }, wn = {
      p: _,
      um: b,
      m: U,
      r: C,
      mt: Z,
      mc: X,
      pc: z,
      pbc: H,
      n: gt,
      o: e
    };
    return {
      render: ar,
      hydrate: void 0,
      createApp: wc(ar)
    };
  }
  function Mi({ type: e, props: t }, n) {
    return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
  }
  function $t({ effect: e, job: t }, n) {
    n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
  }
  function Bc(e, t) {
    return (!e || e && !e.pendingBranch) && t && !t.persisted;
  }
  function il(e, t, n = false) {
    const r = e.children, i = t.children;
    if (j(r) && j(i)) for (let o = 0; o < r.length; o++) {
      const s = r[o];
      let a = i[o];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[o] = yt(i[o]), a.el = s.el), !n && a.patchFlag !== -2 && il(s, a)), a.type === fi && (a.patchFlag === -1 && (a = i[o] = yt(a)), a.el = s.el), a.type === Le && !a.el && (a.el = s.el);
    }
  }
  function Fc(e) {
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
  function ol(e) {
    const t = e.subTree.component;
    if (t) return t.asyncDep && !t.asyncResolved ? t : ol(t);
  }
  function os(e) {
    if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
  }
  function sl(e) {
    if (e.placeholder) return e.placeholder;
    const t = e.component;
    return t ? sl(t.subTree) : null;
  }
  const al = (e) => e.__isSuspense;
  function Dc(e, t) {
    t && t.pendingBranch ? j(e) ? t.effects.push(...e) : t.effects.push(e) : ju(e);
  }
  const Ue = /* @__PURE__ */ Symbol.for("v-fgt"), fi = /* @__PURE__ */ Symbol.for("v-txt"), Le = /* @__PURE__ */ Symbol.for("v-cmt"), yr = /* @__PURE__ */ Symbol.for("v-stc"), Dn = [];
  let $e = null;
  function ue(e = false) {
    Dn.push($e = e ? null : []);
  }
  function Uc() {
    Dn.pop(), $e = Dn[Dn.length - 1] || null;
  }
  let Wn = 1;
  function Ir(e, t = false) {
    Wn += e, e < 0 && $e && t && ($e.hasOnce = true);
  }
  function ll(e) {
    return e.dynamicChildren = Wn > 0 ? $e || un : null, Uc(), Wn > 0 && $e && $e.push(e), e;
  }
  function he(e, t, n, r, i, o) {
    return ll(m(e, t, n, r, i, o, true));
  }
  function ul(e, t, n, r, i) {
    return ll(xe(e, t, n, r, i, true));
  }
  function Or(e) {
    return e ? e.__v_isVNode === true : false;
  }
  function Wt(e, t) {
    return e.type === t.type && e.key === t.key;
  }
  const cl = ({ key: e }) => e ?? null, xr = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? we(e) || Ee(e) || ee(e) ? {
    i: We,
    r: e,
    k: t,
    f: !!n
  } : e : null);
  function m(e, t = null, n = null, r = 0, i = null, o = e === Ue ? 0 : 1, s = false, a = false) {
    const l = {
      __v_isVNode: true,
      __v_skip: true,
      type: e,
      props: t,
      key: t && cl(t),
      ref: t && xr(t),
      scopeId: Ra,
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
    return a ? (Ao(l, n), o & 128 && e.normalize(l)) : n && (l.shapeFlag |= we(n) ? 8 : 16), Wn > 0 && !s && $e && (l.patchFlag > 0 || o & 6) && l.patchFlag !== 32 && $e.push(l), l;
  }
  const xe = $c;
  function $c(e, t = null, n = null, r = 0, i = null, o = false) {
    if ((!e || e === pc) && (e = Le), Or(e)) {
      const a = Ft(e, t, true);
      return n && Ao(a, n), Wn > 0 && !o && $e && (a.shapeFlag & 6 ? $e[$e.indexOf(e)] = a : $e.push(a)), a.patchFlag = -2, a;
    }
    if (Jc(e) && (e = e.__vccOpts), t) {
      t = Vc(t);
      let { class: a, style: l } = t;
      a && !we(a) && (t.class = be(a)), ce(l) && (So(l) && !j(l) && (l = Se({}, l)), t.style = ri(l));
    }
    const s = we(e) ? 1 : al(e) ? 128 : Ia(e) ? 64 : ce(e) ? 4 : ee(e) ? 2 : 0;
    return m(e, t, n, r, i, s, o, true);
  }
  function Vc(e) {
    return e ? So(e) || Ja(e) ? Se({}, e) : e : null;
  }
  function Ft(e, t, n = false, r = false) {
    const { props: i, ref: o, patchFlag: s, children: a, transition: l } = e, u = t ? Hc(i || {}, t) : i, c = {
      __v_isVNode: true,
      __v_skip: true,
      type: e.type,
      props: u,
      key: u && cl(u),
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
      ssContent: e.ssContent && Ft(e.ssContent),
      ssFallback: e.ssFallback && Ft(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
    return l && r && Hn(c, l.clone(c)), c;
  }
  function oe(e = " ", t = 0) {
    return xe(fi, null, e, t);
  }
  function Gc(e, t) {
    const n = xe(yr, null, e);
    return n.staticCount = t, n;
  }
  function qt(e = "", t = false) {
    return t ? (ue(), ul(Le, null, e)) : xe(Le, null, e);
  }
  function at(e) {
    return e == null || typeof e == "boolean" ? xe(Le) : j(e) ? xe(Ue, null, e.slice()) : Or(e) ? yt(e) : xe(fi, null, String(e));
  }
  function yt(e) {
    return e.el === null && e.patchFlag !== -1 || e.memo ? e : Ft(e);
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
      !i && !Ja(t) ? t._ctx = We : i === 3 && We && (We.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
    else ee(t) ? (t = {
      default: t,
      _ctx: We
    }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
      oe(t)
    ]) : n = 8);
    e.children = t, e.shapeFlag |= n;
  }
  function Hc(...e) {
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
    Qe(e, t, 7, [
      n,
      r
    ]);
  }
  const Wc = qa();
  let qc = 0;
  function Kc(e, t, n) {
    const r = e.type, i = (t ? t.appContext : e.appContext) || Wc, o = {
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
      propsDefaults: ae,
      inheritAttrs: r.inheritAttrs,
      ctx: ae,
      data: ae,
      props: ae,
      attrs: ae,
      slots: ae,
      refs: ae,
      setupState: ae,
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
    }, o.root = t ? t.root : o, o.emit = Sc.bind(null, o), e.ce && e.ce(o), o;
  }
  let Re = null;
  const Po = () => Re || We;
  let Br, Yi;
  {
    const e = ni(), t = (n, r) => {
      let i;
      return (i = e[n]) || (i = e[n] = []), i.push(r), (o) => {
        i.length > 1 ? i.forEach((s) => s(o)) : i[0](o);
      };
    };
    Br = t("__VUE_INSTANCE_SETTERS__", (n) => Re = n), Yi = t("__VUE_SSR_SETTERS__", (n) => qn = n);
  }
  const rr = (e) => {
    const t = Re;
    return Br(e), e.scope.on(), () => {
      e.scope.off(), Br(t);
    };
  }, ss = () => {
    Re && Re.scope.off(), Br(null);
  };
  function fl(e) {
    return e.vnode.shapeFlag & 4;
  }
  let qn = false;
  function jc(e, t = false, n = false) {
    t && Yi(t);
    const { props: r, children: i } = e.vnode, o = fl(e);
    Ac(e, r, o, t), zc(e, i, n || t);
    const s = o ? Xc(e, t) : void 0;
    return t && Yi(false), s;
  }
  function Xc(e, t) {
    const n = e.type;
    e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, gc);
    const { setup: r } = n;
    if (r) {
      Tt();
      const i = e.setupContext = r.length > 1 ? Zc(e) : null, o = rr(e), s = tr(r, e, 0, [
        e.props,
        i
      ]), a = ia(s);
      if (kt(), o(), (a || e.sp) && !Bn(e) && $a(e), a) {
        if (s.then(ss, ss), t) return s.then((l) => {
          as(e, l);
        }).catch((l) => {
          si(l, e, 0);
        });
        e.asyncDep = s;
      } else as(e, s);
    } else dl(e);
  }
  function as(e, t, n) {
    ee(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : ce(t) && (e.setupState = Ca(t)), dl(e);
  }
  function dl(e, t, n) {
    const r = e.type;
    e.render || (e.render = r.render || ut);
    {
      const i = rr(e);
      Tt();
      try {
        mc(e);
      } finally {
        kt(), i();
      }
    }
  }
  const Yc = {
    get(e, t) {
      return ke(e, "get", ""), e[t];
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
    return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Ca(Iu(e.exposed)), {
      get(t, n) {
        if (n in t) return t[n];
        if (n in Fn) return Fn[n](e);
      },
      has(t, n) {
        return n in t || n in Fn;
      }
    })) : e.proxy;
  }
  function Jc(e) {
    return ee(e) && "__vccOpts" in e;
  }
  const Te = (e, t) => Gu(e, t, qn);
  function Qc(e, t, n) {
    try {
      Ir(-1);
      const r = arguments.length;
      return r === 2 ? ce(t) && !j(t) ? Or(t) ? xe(e, null, [
        t
      ]) : xe(e, t) : xe(e, null, t) : (r > 3 ? n = Array.prototype.slice.call(arguments, 2) : r === 3 && Or(n) && (n = [
        n
      ]), xe(e, t, n));
    } finally {
      Ir(1);
    }
  }
  const ef = "3.5.28";
  let Zi;
  const ls = typeof window < "u" && window.trustedTypes;
  if (ls) try {
    Zi = ls.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
  const hl = Zi ? (e) => Zi.createHTML(e) : (e) => e, tf = "http://www.w3.org/2000/svg", nf = "http://www.w3.org/1998/Math/MathML", bt = typeof document < "u" ? document : null, us = bt && bt.createElement("template"), rf = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const i = t === "svg" ? bt.createElementNS(tf, e) : t === "mathml" ? bt.createElementNS(nf, e) : n ? bt.createElement(e, {
        is: n
      }) : bt.createElement(e);
      return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
    },
    createText: (e) => bt.createTextNode(e),
    createComment: (e) => bt.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => bt.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, r, i, o) {
      const s = n ? n.previousSibling : t.lastChild;
      if (i && (i === o || i.nextSibling)) for (; t.insertBefore(i.cloneNode(true), n), !(i === o || !(i = i.nextSibling)); ) ;
      else {
        us.innerHTML = hl(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
        const a = us.content;
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
  }, Rt = "transition", kn = "animation", Kn = /* @__PURE__ */ Symbol("_vtc"), pl = {
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
  }, of = Se({}, Oa, pl), sf = (e) => (e.displayName = "Transition", e.props = of, e), af = sf((e, { slots: t }) => Qc(rc, lf(e), t)), Vt = (e, t = []) => {
    j(e) ? e.forEach((n) => n(...t)) : e && e(...t);
  }, cs = (e) => e ? j(e) ? e.some((t) => t.length > 1) : e.length > 1 : false;
  function lf(e) {
    const t = {};
    for (const w in e) w in pl || (t[w] = e[w]);
    if (e.css === false) return t;
    const { name: n = "v", type: r, duration: i, enterFromClass: o = `${n}-enter-from`, enterActiveClass: s = `${n}-enter-active`, enterToClass: a = `${n}-enter-to`, appearFromClass: l = o, appearActiveClass: u = s, appearToClass: c = a, leaveFromClass: f = `${n}-leave-from`, leaveActiveClass: h = `${n}-leave-active`, leaveToClass: d = `${n}-leave-to` } = e, g = uf(i), _ = g && g[0], F = g && g[1], { onBeforeEnter: N, onEnter: A, onEnterCancelled: O, onLeave: y, onLeaveCancelled: S, onBeforeAppear: P = N, onAppear: W = A, onAppearCancelled: X = O } = t, $ = (w, G, Z, fe) => {
      w._enterCancelled = fe, Gt(w, G ? c : a), Gt(w, G ? u : s), Z && Z();
    }, H = (w, G) => {
      w._isLeaving = false, Gt(w, f), Gt(w, d), Gt(w, h), G && G();
    }, q = (w) => (G, Z) => {
      const fe = w ? W : A, L = () => $(G, w, Z);
      Vt(fe, [
        G,
        L
      ]), fs(() => {
        Gt(G, w ? l : o), vt(G, w ? c : a), cs(fe) || ds(G, r, _, L);
      });
    };
    return Se(t, {
      onBeforeEnter(w) {
        Vt(N, [
          w
        ]), vt(w, o), vt(w, s);
      },
      onBeforeAppear(w) {
        Vt(P, [
          w
        ]), vt(w, l), vt(w, u);
      },
      onEnter: q(false),
      onAppear: q(true),
      onLeave(w, G) {
        w._isLeaving = true;
        const Z = () => H(w, G);
        vt(w, f), w._enterCancelled ? (vt(w, h), gs(w)) : (gs(w), vt(w, h)), fs(() => {
          w._isLeaving && (Gt(w, f), vt(w, d), cs(y) || ds(w, r, F, Z));
        }), Vt(y, [
          w,
          Z
        ]);
      },
      onEnterCancelled(w) {
        $(w, false, void 0, true), Vt(O, [
          w
        ]);
      },
      onAppearCancelled(w) {
        $(w, true, void 0, true), Vt(X, [
          w
        ]);
      },
      onLeaveCancelled(w) {
        H(w), Vt(S, [
          w
        ]);
      }
    });
  }
  function uf(e) {
    if (e == null) return null;
    if (ce(e)) return [
      Ti(e.enter),
      Ti(e.leave)
    ];
    {
      const t = Ti(e);
      return [
        t,
        t
      ];
    }
  }
  function Ti(e) {
    return su(e);
  }
  function vt(e, t) {
    t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Kn] || (e[Kn] = /* @__PURE__ */ new Set())).add(t);
  }
  function Gt(e, t) {
    t.split(/\s+/).forEach((r) => r && e.classList.remove(r));
    const n = e[Kn];
    n && (n.delete(t), n.size || (e[Kn] = void 0));
  }
  function fs(e) {
    requestAnimationFrame(() => {
      requestAnimationFrame(e);
    });
  }
  let cf = 0;
  function ds(e, t, n, r) {
    const i = e._endId = ++cf, o = () => {
      i === e._endId && r();
    };
    if (n != null) return setTimeout(o, n);
    const { type: s, timeout: a, propCount: l } = ff(e, t);
    if (!s) return r();
    const u = s + "end";
    let c = 0;
    const f = () => {
      e.removeEventListener(u, h), o();
    }, h = (d) => {
      d.target === e && ++c >= l && f();
    };
    setTimeout(() => {
      c < l && f();
    }, a + 1), e.addEventListener(u, h);
  }
  function ff(e, t) {
    const n = window.getComputedStyle(e), r = (g) => (n[g] || "").split(", "), i = r(`${Rt}Delay`), o = r(`${Rt}Duration`), s = hs(i, o), a = r(`${kn}Delay`), l = r(`${kn}Duration`), u = hs(a, l);
    let c = null, f = 0, h = 0;
    t === Rt ? s > 0 && (c = Rt, f = s, h = o.length) : t === kn ? u > 0 && (c = kn, f = u, h = l.length) : (f = Math.max(s, u), c = f > 0 ? s > u ? Rt : kn : null, h = c ? c === Rt ? o.length : l.length : 0);
    const d = c === Rt && /\b(?:transform|all)(?:,|$)/.test(r(`${Rt}Property`).toString());
    return {
      type: c,
      timeout: f,
      propCount: h,
      hasTransform: d
    };
  }
  function hs(e, t) {
    for (; e.length < t.length; ) e = e.concat(e);
    return Math.max(...t.map((n, r) => ps(n) + ps(e[r])));
  }
  function ps(e) {
    return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
  }
  function gs(e) {
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
  const Fr = /* @__PURE__ */ Symbol("_vod"), gl = /* @__PURE__ */ Symbol("_vsh"), ki = {
    name: "show",
    beforeMount(e, { value: t }, { transition: n }) {
      e[Fr] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : Cn(e, t);
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
    e.style.display = t ? e[Fr] : "none", e[gl] = !t;
  }
  const hf = /* @__PURE__ */ Symbol(""), pf = /(?:^|;)\s*display\s*:/;
  function gf(e, t, n) {
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
        const s = r[hf];
        s && (n += ";" + s), r.cssText = n, o = pf.test(n);
      }
    } else t && e.removeAttribute("style");
    Fr in e && (e[Fr] = o ? r.display : "", e[gl] && (r.display = "none"));
  }
  const ms = /\s*!important$/;
  function wr(e, t, n) {
    if (j(n)) n.forEach((r) => wr(e, t, r));
    else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
    else {
      const r = mf(e, t);
      ms.test(n) ? e.setProperty(Dt(r), n.replace(ms, ""), "important") : e[r] = n;
    }
  }
  const vs = [
    "Webkit",
    "Moz",
    "ms"
  ], Ci = {};
  function mf(e, t) {
    const n = Ci[t];
    if (n) return n;
    let r = Mt(t);
    if (r !== "filter" && r in e) return Ci[t] = r;
    r = aa(r);
    for (let i = 0; i < vs.length; i++) {
      const o = vs[i] + r;
      if (o in e) return Ci[t] = o;
    }
    return t;
  }
  const _s = "http://www.w3.org/1999/xlink";
  function bs(e, t, n, r, i, o = du(t)) {
    r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(_s, t.slice(6, t.length)) : e.setAttributeNS(_s, t, n) : n == null || o && !ua(n) ? e.removeAttribute(t) : e.setAttribute(t, o ? "" : ht(n) ? String(n) : n);
  }
  function ys(e, t, n, r, i) {
    if (t === "innerHTML" || t === "textContent") {
      n != null && (e[t] = t === "innerHTML" ? hl(n) : n);
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
      a === "boolean" ? n = ua(n) : n == null && a === "string" ? (n = "", s = true) : a === "number" && (n = 0, s = true);
    }
    try {
      e[t] = n;
    } catch {
    }
    s && e.removeAttribute(i || t);
  }
  function Kt(e, t, n, r) {
    e.addEventListener(t, n, r);
  }
  function vf(e, t, n, r) {
    e.removeEventListener(t, n, r);
  }
  const xs = /* @__PURE__ */ Symbol("_vei");
  function _f(e, t, n, r, i = null) {
    const o = e[xs] || (e[xs] = {}), s = o[t];
    if (r && s) s.value = r;
    else {
      const [a, l] = bf(t);
      if (r) {
        const u = o[t] = wf(r, i);
        Kt(e, a, u, l);
      } else s && (vf(e, a, s, l), o[t] = void 0);
    }
  }
  const ws = /(?:Once|Passive|Capture)$/;
  function bf(e) {
    let t;
    if (ws.test(e)) {
      t = {};
      let r;
      for (; r = e.match(ws); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
    }
    return [
      e[2] === ":" ? e.slice(3) : Dt(e.slice(2)),
      t
    ];
  }
  let Ei = 0;
  const yf = Promise.resolve(), xf = () => Ei || (yf.then(() => Ei = 0), Ei = Date.now());
  function wf(e, t) {
    const n = (r) => {
      if (!r._vts) r._vts = Date.now();
      else if (r._vts <= n.attached) return;
      Qe(Sf(r, n.value), t, 5, [
        r
      ]);
    };
    return n.value = e, n.attached = xf(), n;
  }
  function Sf(e, t) {
    if (j(t)) {
      const n = e.stopImmediatePropagation;
      return e.stopImmediatePropagation = () => {
        n.call(e), e._stopped = true;
      }, t.map((r) => (i) => !i._stopped && r && r(i));
    } else return t;
  }
  const Ss = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Mf = (e, t, n, r, i, o) => {
    const s = i === "svg";
    t === "class" ? df(e, r, s) : t === "style" ? gf(e, n, r) : Qr(t) ? ho(t) || _f(e, t, n, r, o) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Tf(e, t, r, s)) ? (ys(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && bs(e, t, r, s, o, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !we(r)) ? ys(e, Mt(t), r, o, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), bs(e, t, r, s));
  };
  function Tf(e, t, n, r) {
    if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Ss(t) && ee(n));
    if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
    if (t === "width" || t === "height") {
      const i = e.tagName;
      if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE") return false;
    }
    return Ss(t) && we(n) ? false : t in e;
  }
  const Dr = (e) => {
    const t = e.props["onUpdate:modelValue"] || false;
    return j(t) ? (n) => _r(t, n) : t;
  };
  function kf(e) {
    e.target.composing = true;
  }
  function Ms(e) {
    const t = e.target;
    t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
  }
  const hn = /* @__PURE__ */ Symbol("_assign");
  function Ts(e, t, n) {
    return t && (e = e.trim()), n && (e = mo(e)), e;
  }
  const Ke = {
    created(e, { modifiers: { lazy: t, trim: n, number: r } }, i) {
      e[hn] = Dr(i);
      const o = r || i.props && i.props.type === "number";
      Kt(e, t ? "change" : "input", (s) => {
        s.target.composing || e[hn](Ts(e.value, n, o));
      }), (n || o) && Kt(e, "change", () => {
        e.value = Ts(e.value, n, o);
      }), t || (Kt(e, "compositionstart", kf), Kt(e, "compositionend", Ms), Kt(e, "change", Ms));
    },
    mounted(e, { value: t }) {
      e.value = t ?? "";
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: i, number: o } }, s) {
      if (e[hn] = Dr(s), e.composing) return;
      const a = (o || e.type === "number") && !/^0\d/.test(e.value) ? mo(e.value) : e.value, l = t ?? "";
      a !== l && (document.activeElement === e && e.type !== "range" && (r && t === n || i && e.value.trim() === l) || (e.value = l));
    }
  }, zt = {
    deep: true,
    created(e, t, n) {
      e[hn] = Dr(n), Kt(e, "change", () => {
        const r = e._modelValue, i = Cf(e), o = e.checked, s = e[hn];
        if (j(r)) {
          const a = ca(r, i), l = a !== -1;
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
        } else s(ml(e, o));
      });
    },
    mounted: ks,
    beforeUpdate(e, t, n) {
      e[hn] = Dr(n), ks(e, t, n);
    }
  };
  function ks(e, { value: t, oldValue: n }, r) {
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
  const Ef = [
    "ctrl",
    "shift",
    "alt",
    "meta"
  ], Af = {
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
    exact: (e, t) => Ef.some((n) => e[`${n}Key`] && !t.includes(n))
  }, Cs = (e, t) => {
    if (!e) return e;
    const n = e._withMods || (e._withMods = {}), r = t.join(".");
    return n[r] || (n[r] = ((i, ...o) => {
      for (let s = 0; s < t.length; s++) {
        const a = Af[t[s]];
        if (a && a(i, t)) return;
      }
      return e(i, ...o);
    }));
  }, Pf = Se({
    patchProp: Mf
  }, rf);
  let Es;
  function Lf() {
    return Es || (Es = Ic(Pf));
  }
  const Rf = ((...e) => {
    const t = Lf().createApp(...e), { mount: n } = t;
    return t.mount = (r) => {
      const i = Nf(r);
      if (!i) return;
      const o = t._component;
      !ee(o) && !o.render && !o.template && (o.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
      const s = n(i, false, zf(i));
      return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), s;
    }, t;
  });
  function zf(e) {
    if (e instanceof SVGElement) return "svg";
    if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
  }
  function Nf(e) {
    return we(e) ? document.querySelector(e) : e;
  }
  const If = `// Mandelbrot progressive-iteration shader.
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
`, Of = `struct Uniforms {
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

`, Bf = `// Brush pass: updates sentinel levels in the neutral square texture.
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
  let is_anchor = (coord_out.x % next_step == 0) && (coord_out.y % next_step == 0);
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
`, Ff = `// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
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
    if (z_sq >= uni.mu) {
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

  loop {
    // Safety: if step exceeds texture size, stop climbing and fall back
    // to the pixel itself (prevents infinite loop on pathological inputs
    // or when all ancestors are unfinished sentinels).
    if (step_u >= dims.x || step_u >= dims.y) {
      return loadAllLayers(coord);
    }

    let mask = ~(step_u - 1u);
    let base_x = x & mask;
    let base_y = y & mask;

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

  // Unreachable, but WGSL requires a return after the loop.
  return loadAllLayers(coord);
}
`, Df = "" + new URL("mandelbrot_bg-C_VnZsNz.wasm", import.meta.url).href, Uf = async (e = {}, t) => {
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
  let J;
  function $f(e) {
    J = e;
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
    return (fr === null || fr.byteLength === 0) && (fr = new Uint8Array(J.memory.buffer)), fr;
  }
  let Mr = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  Mr.decode();
  const Vf = 2146435072;
  let Ai = 0;
  function Gf(e, t) {
    return Ai += t, Ai >= Vf && (Mr = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true
    }), Mr.decode(), Ai = t), Mr.decode(Sr().subarray(e, e + t));
  }
  function vl(e, t) {
    return e = e >>> 0, Gf(e, t);
  }
  function _e(e) {
    if (typeof e != "number") throw new Error(`expected a number argument, found ${typeof e}`);
  }
  let rn = null;
  function Hf() {
    return (rn === null || rn.buffer.detached === true || rn.buffer.detached === void 0 && rn.buffer !== J.memory.buffer) && (rn = new DataView(J.memory.buffer)), rn;
  }
  function As(e, t) {
    e = e >>> 0;
    const n = Hf(), r = [];
    for (let i = e; i < e + 4 * t; i += 4) r.push(J.__wbindgen_export_0.get(n.getUint32(i, true)));
    return J.__externref_drop_slice(e, t), r;
  }
  let Ot = 0;
  const Un = new TextEncoder();
  "encodeInto" in Un || (Un.encodeInto = function(e, t) {
    const n = Un.encode(e);
    return t.set(n), {
      read: e.length,
      written: n.length
    };
  });
  function on(e, t, n) {
    if (typeof e != "string") throw new Error(`expected a string argument, found ${typeof e}`);
    if (n === void 0) {
      const a = Un.encode(e), l = t(a.length, 1) >>> 0;
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
      const a = Sr().subarray(i + s, i + r), l = Un.encodeInto(e, a);
      if (l.read !== e.length) throw new Error("failed to pass whole string");
      s += l.written, i = n(i, r, s, 1) >>> 0;
    }
    return Ot = s, i;
  }
  const Ps = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => J.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
  class Ji {
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Ps.unregister(this), t;
    }
    free() {
      const t = this.__destroy_into_raw();
      J.__wbg_mandelbrotnavigator_free(t, 0);
    }
    get_params() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr);
      const t = J.mandelbrotnavigator_get_params(this.__wbg_ptr);
      var n = As(t[0], t[1]).slice();
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
      return jn.__wrap(n);
    }
    get_reference_orbit_capacity() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      return _e(this.__wbg_ptr), J.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
    }
    constructor(t, n, r, i) {
      const o = on(t, J.__wbindgen_malloc, J.__wbindgen_realloc), s = Ot, a = on(n, J.__wbindgen_malloc, J.__wbindgen_realloc), l = Ot, u = on(r, J.__wbindgen_malloc, J.__wbindgen_realloc), c = Ot, f = J.mandelbrotnavigator_new(o, s, a, l, u, c, i);
      return this.__wbg_ptr = f >>> 0, Ps.register(this, this.__wbg_ptr, this), this;
    }
    step() {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr);
      const t = J.mandelbrotnavigator_step(this.__wbg_ptr);
      var n = As(t[0], t[1]).slice();
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
      const n = on(t, J.__wbindgen_malloc, J.__wbindgen_realloc), r = Ot;
      J.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
    }
    origin(t, n) {
      if (this.__wbg_ptr == 0) throw new Error("Attempt to use a moved value");
      _e(this.__wbg_ptr);
      const r = on(t, J.__wbindgen_malloc, J.__wbindgen_realloc), i = Ot, o = on(n, J.__wbindgen_malloc, J.__wbindgen_realloc), s = Ot;
      J.mandelbrotnavigator_origin(this.__wbg_ptr, r, i, o, s);
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
  Symbol.dispose && (Ji.prototype[Symbol.dispose] = Ji.prototype.free);
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => J.__wbg_mandelbrotstep_free(e >>> 0, 1));
  const Ls = typeof FinalizationRegistry > "u" ? {
    register: () => {
    },
    unregister: () => {
    }
  } : new FinalizationRegistry((e) => J.__wbg_orbitbufferinfo_free(e >>> 0, 1));
  class jn {
    constructor() {
      throw new Error("cannot invoke `new` directly");
    }
    static __wrap(t) {
      t = t >>> 0;
      const n = Object.create(jn.prototype);
      return n.__wbg_ptr = t, Ls.register(n, n.__wbg_ptr, n), n;
    }
    __destroy_into_raw() {
      const t = this.__wbg_ptr;
      return this.__wbg_ptr = 0, Ls.unregister(this), t;
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
  Symbol.dispose && (jn.prototype[Symbol.dispose] = jn.prototype.free);
  function Wf() {
    return Lo(function(e) {
      return Math.exp(e);
    }, arguments);
  }
  function qf() {
    return Lo(function() {
      return Date.now();
    }, arguments);
  }
  function Kf(e, t) {
    throw new Error(vl(e, t));
  }
  function jf() {
    return Lo(function(e, t) {
      return vl(e, t);
    }, arguments);
  }
  function Xf() {
    const e = J.__wbindgen_export_0, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }
  URL = globalThis.URL;
  const ne = await Uf({
    "./mandelbrot_bg.js": {
      __wbg_now_1e80617bcee43265: qf,
      __wbg_exp_9293ded1248e1bd3: Wf,
      __wbg_wbindgenthrow_451ec1a8469d7eb6: Kf,
      __wbindgen_init_externref_table: Xf,
      __wbindgen_cast_2241b6af4c4b2941: jf
    }
  }, Df), _l = ne.memory, Yf = ne.__wbg_get_mandelbrotstep_dx, Zf = ne.__wbg_get_mandelbrotstep_dy, Jf = ne.__wbg_get_mandelbrotstep_zx, Qf = ne.__wbg_get_mandelbrotstep_zy, ed = ne.__wbg_get_orbitbufferinfo_count, td = ne.__wbg_get_orbitbufferinfo_offset, nd = ne.__wbg_get_orbitbufferinfo_ptr, rd = ne.__wbg_mandelbrotnavigator_free, id = ne.__wbg_mandelbrotstep_free, od = ne.__wbg_orbitbufferinfo_free, sd = ne.__wbg_set_mandelbrotstep_dx, ad = ne.__wbg_set_mandelbrotstep_dy, ld = ne.__wbg_set_mandelbrotstep_zx, ud = ne.__wbg_set_mandelbrotstep_zy, cd = ne.__wbg_set_orbitbufferinfo_count, fd = ne.__wbg_set_orbitbufferinfo_offset, dd = ne.__wbg_set_orbitbufferinfo_ptr, hd = ne.mandelbrotnavigator_angle, pd = ne.mandelbrotnavigator_compute_reference_orbit_ptr, gd = ne.mandelbrotnavigator_get_params, md = ne.mandelbrotnavigator_get_reference_orbit_capacity, vd = ne.mandelbrotnavigator_get_reference_orbit_len, _d = ne.mandelbrotnavigator_new, bd = ne.mandelbrotnavigator_origin, yd = ne.mandelbrotnavigator_rotate, xd = ne.mandelbrotnavigator_rotate_direct, wd = ne.mandelbrotnavigator_scale, Sd = ne.mandelbrotnavigator_step, Md = ne.mandelbrotnavigator_translate, Td = ne.mandelbrotnavigator_translate_direct, kd = ne.mandelbrotnavigator_zoom, Cd = ne.__wbindgen_export_0, Ed = ne.__externref_drop_slice, Ad = ne.__wbindgen_free, Pd = ne.__wbindgen_malloc, Ld = ne.__wbindgen_realloc, bl = ne.__wbindgen_start, Rd = Object.freeze(Object.defineProperty({
    __proto__: null,
    __externref_drop_slice: Ed,
    __wbg_get_mandelbrotstep_dx: Yf,
    __wbg_get_mandelbrotstep_dy: Zf,
    __wbg_get_mandelbrotstep_zx: Jf,
    __wbg_get_mandelbrotstep_zy: Qf,
    __wbg_get_orbitbufferinfo_count: ed,
    __wbg_get_orbitbufferinfo_offset: td,
    __wbg_get_orbitbufferinfo_ptr: nd,
    __wbg_mandelbrotnavigator_free: rd,
    __wbg_mandelbrotstep_free: id,
    __wbg_orbitbufferinfo_free: od,
    __wbg_set_mandelbrotstep_dx: sd,
    __wbg_set_mandelbrotstep_dy: ad,
    __wbg_set_mandelbrotstep_zx: ld,
    __wbg_set_mandelbrotstep_zy: ud,
    __wbg_set_orbitbufferinfo_count: cd,
    __wbg_set_orbitbufferinfo_offset: fd,
    __wbg_set_orbitbufferinfo_ptr: dd,
    __wbindgen_export_0: Cd,
    __wbindgen_free: Ad,
    __wbindgen_malloc: Pd,
    __wbindgen_realloc: Ld,
    __wbindgen_start: bl,
    mandelbrotnavigator_angle: hd,
    mandelbrotnavigator_compute_reference_orbit_ptr: pd,
    mandelbrotnavigator_get_params: gd,
    mandelbrotnavigator_get_reference_orbit_capacity: md,
    mandelbrotnavigator_get_reference_orbit_len: vd,
    mandelbrotnavigator_new: _d,
    mandelbrotnavigator_origin: bd,
    mandelbrotnavigator_rotate: yd,
    mandelbrotnavigator_rotate_direct: xd,
    mandelbrotnavigator_scale: wd,
    mandelbrotnavigator_step: Sd,
    mandelbrotnavigator_translate: Md,
    mandelbrotnavigator_translate_direct: Td,
    mandelbrotnavigator_zoom: kd,
    memory: _l
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  $f(Rd);
  bl();
  class zd {
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
  function tn() {
  }
  var Xn = 0.7, Ur = 1 / Xn, pn = "\\s*([+-]?\\d+)\\s*", Yn = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", ct = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", Nd = /^#([0-9a-f]{3,8})$/, Id = new RegExp(`^rgb\\(${pn},${pn},${pn}\\)$`), Od = new RegExp(`^rgb\\(${ct},${ct},${ct}\\)$`), Bd = new RegExp(`^rgba\\(${pn},${pn},${pn},${Yn}\\)$`), Fd = new RegExp(`^rgba\\(${ct},${ct},${ct},${Yn}\\)$`), Dd = new RegExp(`^hsl\\(${Yn},${ct},${ct}\\)$`), Ud = new RegExp(`^hsla\\(${Yn},${ct},${ct},${Yn}\\)$`), Rs = {
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
  ir(tn, Jt, {
    copy(e) {
      return Object.assign(new this.constructor(), this, e);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: zs,
    formatHex: zs,
    formatHex8: $d,
    formatHsl: Vd,
    formatRgb: Ns,
    toString: Ns
  });
  function zs() {
    return this.rgb().formatHex();
  }
  function $d() {
    return this.rgb().formatHex8();
  }
  function Vd() {
    return xl(this).formatHsl();
  }
  function Ns() {
    return this.rgb().formatRgb();
  }
  function Jt(e) {
    var t, n;
    return e = (e + "").trim().toLowerCase(), (t = Nd.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Is(t) : n === 3 ? new Ce(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? dr(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? dr(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = Id.exec(e)) ? new Ce(t[1], t[2], t[3], 1) : (t = Od.exec(e)) ? new Ce(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = Bd.exec(e)) ? dr(t[1], t[2], t[3], t[4]) : (t = Fd.exec(e)) ? dr(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = Dd.exec(e)) ? Fs(t[1], t[2] / 100, t[3] / 100, 1) : (t = Ud.exec(e)) ? Fs(t[1], t[2] / 100, t[3] / 100, t[4]) : Rs.hasOwnProperty(e) ? Is(Rs[e]) : e === "transparent" ? new Ce(NaN, NaN, NaN, 0) : null;
  }
  function Is(e) {
    return new Ce(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
  }
  function dr(e, t, n, r) {
    return r <= 0 && (e = t = n = NaN), new Ce(e, t, n, r);
  }
  function yl(e) {
    return e instanceof tn || (e = Jt(e)), e ? (e = e.rgb(), new Ce(e.r, e.g, e.b, e.opacity)) : new Ce();
  }
  function ft(e, t, n, r) {
    return arguments.length === 1 ? yl(e) : new Ce(e, t, n, r ?? 1);
  }
  function Ce(e, t, n, r) {
    this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
  }
  ir(Ce, ft, hi(tn, {
    brighter(e) {
      return e = e == null ? Ur : Math.pow(Ur, e), new Ce(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? Xn : Math.pow(Xn, e), new Ce(this.r * e, this.g * e, this.b * e, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new Ce(Zt(this.r), Zt(this.g), Zt(this.b), $r(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
    },
    hex: Os,
    formatHex: Os,
    formatHex8: Gd,
    formatRgb: Bs,
    toString: Bs
  }));
  function Os() {
    return `#${jt(this.r)}${jt(this.g)}${jt(this.b)}`;
  }
  function Gd() {
    return `#${jt(this.r)}${jt(this.g)}${jt(this.b)}${jt((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function Bs() {
    const e = $r(this.opacity);
    return `${e === 1 ? "rgb(" : "rgba("}${Zt(this.r)}, ${Zt(this.g)}, ${Zt(this.b)}${e === 1 ? ")" : `, ${e})`}`;
  }
  function $r(e) {
    return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
  }
  function Zt(e) {
    return Math.max(0, Math.min(255, Math.round(e) || 0));
  }
  function jt(e) {
    return e = Zt(e), (e < 16 ? "0" : "") + e.toString(16);
  }
  function Fs(e, t, n, r) {
    return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new Ye(e, t, n, r);
  }
  function xl(e) {
    if (e instanceof Ye) return new Ye(e.h, e.s, e.l, e.opacity);
    if (e instanceof tn || (e = Jt(e)), !e) return new Ye();
    if (e instanceof Ye) return e;
    e = e.rgb();
    var t = e.r / 255, n = e.g / 255, r = e.b / 255, i = Math.min(t, n, r), o = Math.max(t, n, r), s = NaN, a = o - i, l = (o + i) / 2;
    return a ? (t === o ? s = (n - r) / a + (n < r) * 6 : n === o ? s = (r - t) / a + 2 : s = (t - n) / a + 4, a /= l < 0.5 ? o + i : 2 - o - i, s *= 60) : a = l > 0 && l < 1 ? 0 : s, new Ye(s, a, l, e.opacity);
  }
  function Hd(e, t, n, r) {
    return arguments.length === 1 ? xl(e) : new Ye(e, t, n, r ?? 1);
  }
  function Ye(e, t, n, r) {
    this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
  }
  ir(Ye, Hd, hi(tn, {
    brighter(e) {
      return e = e == null ? Ur : Math.pow(Ur, e), new Ye(this.h, this.s, this.l * e, this.opacity);
    },
    darker(e) {
      return e = e == null ? Xn : Math.pow(Xn, e), new Ye(this.h, this.s, this.l * e, this.opacity);
    },
    rgb() {
      var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < 0.5 ? n : 1 - n) * t, i = 2 * n - r;
      return new Ce(Pi(e >= 240 ? e - 240 : e + 120, i, r), Pi(e, i, r), Pi(e < 120 ? e + 240 : e - 120, i, r), this.opacity);
    },
    clamp() {
      return new Ye(Ds(this.h), hr(this.s), hr(this.l), $r(this.opacity));
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
  const Wd = Math.PI / 180, qd = 180 / Math.PI, Vr = 18, wl = 0.96422, Sl = 1, Ml = 0.82521, Tl = 4 / 29, gn = 6 / 29, kl = 3 * gn * gn, Kd = gn * gn * gn;
  function Cl(e) {
    if (e instanceof dt) return new dt(e.l, e.a, e.b, e.opacity);
    if (e instanceof lt) return Al(e);
    e instanceof Ce || (e = yl(e));
    var t = Ni(e.r), n = Ni(e.g), r = Ni(e.b), i = Li((0.2225045 * t + 0.7168786 * n + 0.0606169 * r) / Sl), o, s;
    return t === n && n === r ? o = s = i : (o = Li((0.4360747 * t + 0.3850649 * n + 0.1430804 * r) / wl), s = Li((0.0139322 * t + 0.0971045 * n + 0.7141733 * r) / Ml)), new dt(116 * i - 16, 500 * (o - i), 200 * (i - s), e.opacity);
  }
  function Qi(e, t, n, r) {
    return arguments.length === 1 ? Cl(e) : new dt(e, t, n, r ?? 1);
  }
  function dt(e, t, n, r) {
    this.l = +e, this.a = +t, this.b = +n, this.opacity = +r;
  }
  ir(dt, Qi, hi(tn, {
    brighter(e) {
      return new dt(this.l + Vr * (e ?? 1), this.a, this.b, this.opacity);
    },
    darker(e) {
      return new dt(this.l - Vr * (e ?? 1), this.a, this.b, this.opacity);
    },
    rgb() {
      var e = (this.l + 16) / 116, t = isNaN(this.a) ? e : e + this.a / 500, n = isNaN(this.b) ? e : e - this.b / 200;
      return t = wl * Ri(t), e = Sl * Ri(e), n = Ml * Ri(n), new Ce(zi(3.1338561 * t - 1.6168667 * e - 0.4906146 * n), zi(-0.9787684 * t + 1.9161415 * e + 0.033454 * n), zi(0.0719453 * t - 0.2289914 * e + 1.4052427 * n), this.opacity);
    }
  }));
  function Li(e) {
    return e > Kd ? Math.pow(e, 1 / 3) : e / kl + Tl;
  }
  function Ri(e) {
    return e > gn ? e * e * e : kl * (e - Tl);
  }
  function zi(e) {
    return 255 * (e <= 31308e-7 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055);
  }
  function Ni(e) {
    return (e /= 255) <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4);
  }
  function El(e) {
    if (e instanceof lt) return new lt(e.h, e.c, e.l, e.opacity);
    if (e instanceof dt || (e = Cl(e)), e.a === 0 && e.b === 0) return new lt(NaN, 0 < e.l && e.l < 100 ? 0 : NaN, e.l, e.opacity);
    var t = Math.atan2(e.b, e.a) * qd;
    return new lt(t < 0 ? t + 360 : t, Math.sqrt(e.a * e.a + e.b * e.b), e.l, e.opacity);
  }
  function eo(e, t, n, r) {
    return arguments.length === 1 ? El(e) : new lt(n, t, e, 1);
  }
  function jd(e, t, n, r) {
    return arguments.length === 1 ? El(e) : new lt(e, t, n, r ?? 1);
  }
  function lt(e, t, n, r) {
    this.h = +e, this.c = +t, this.l = +n, this.opacity = +r;
  }
  function Al(e) {
    if (isNaN(e.h)) return new dt(e.l, 0, 0, e.opacity);
    var t = e.h * Wd;
    return new dt(e.l, Math.cos(t) * e.c, Math.sin(t) * e.c, e.opacity);
  }
  ir(lt, jd, hi(tn, {
    brighter(e) {
      return new lt(this.h, this.c, this.l + Vr * (e ?? 1), this.opacity);
    },
    darker(e) {
      return new lt(this.h, this.c, this.l - Vr * (e ?? 1), this.opacity);
    },
    rgb() {
      return Al(this).rgb();
    }
  }));
  const Ro = (e) => () => e;
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
    return (e = +e) == 1 ? an : function(t, n) {
      return n - t ? Yd(t, n, e) : Ro(isNaN(t) ? n : t);
    };
  }
  function an(e, t) {
    var n = t - e;
    return n ? Xd(e, n) : Ro(isNaN(e) ? t : e);
  }
  const Gr = (function e(t) {
    var n = Zd(t);
    function r(i, o) {
      var s = n((i = ft(i)).r, (o = ft(o)).r), a = n(i.g, o.g), l = n(i.b, o.b), u = an(i.opacity, o.opacity);
      return function(c) {
        return i.r = s(c), i.g = a(c), i.b = l(c), i.opacity = u(c), i + "";
      };
    }
    return r.gamma = e, r;
  })(1);
  function Jd(e, t) {
    t || (t = []);
    var n = e ? Math.min(t.length, e.length) : 0, r = t.slice(), i;
    return function(o) {
      for (i = 0; i < n; ++i) r[i] = e[i] * (1 - o) + t[i] * o;
      return r;
    };
  }
  function Qd(e) {
    return ArrayBuffer.isView(e) && !(e instanceof DataView);
  }
  function eh(e, t) {
    var n = t ? t.length : 0, r = e ? Math.min(n, e.length) : 0, i = new Array(r), o = new Array(n), s;
    for (s = 0; s < r; ++s) i[s] = zo(e[s], t[s]);
    for (; s < n; ++s) o[s] = t[s];
    return function(a) {
      for (s = 0; s < r; ++s) o[s] = i[s](a);
      return o;
    };
  }
  function th(e, t) {
    var n = /* @__PURE__ */ new Date();
    return e = +e, t = +t, function(r) {
      return n.setTime(e * (1 - r) + t * r), n;
    };
  }
  function Xe(e, t) {
    return e = +e, t = +t, function(n) {
      return e * (1 - n) + t * n;
    };
  }
  function nh(e, t) {
    var n = {}, r = {}, i;
    (e === null || typeof e != "object") && (e = {}), (t === null || typeof t != "object") && (t = {});
    for (i in t) i in e ? n[i] = zo(e[i], t[i]) : r[i] = t[i];
    return function(o) {
      for (i in n) r[i] = n[i](o);
      return r;
    };
  }
  var to = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Ii = new RegExp(to.source, "g");
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
  function Pl(e, t) {
    var n = to.lastIndex = Ii.lastIndex = 0, r, i, o, s = -1, a = [], l = [];
    for (e = e + "", t = t + ""; (r = to.exec(e)) && (i = Ii.exec(t)); ) (o = i.index) > n && (o = t.slice(n, o), a[s] ? a[s] += o : a[++s] = o), (r = r[0]) === (i = i[0]) ? a[s] ? a[s] += i : a[++s] = i : (a[++s] = null, l.push({
      i: s,
      x: Xe(r, i)
    })), n = Ii.lastIndex;
    return n < t.length && (o = t.slice(n), a[s] ? a[s] += o : a[++s] = o), a.length < 2 ? l[0] ? ih(l[0].x) : rh(t) : (t = l.length, function(u) {
      for (var c = 0, f; c < t; ++c) a[(f = l[c]).i] = f.x(u);
      return a.join("");
    });
  }
  function zo(e, t) {
    var n = typeof t, r;
    return t == null || n === "boolean" ? Ro(t) : (n === "number" ? Xe : n === "string" ? (r = Jt(t)) ? (t = r, Gr) : Pl : t instanceof Jt ? Gr : t instanceof Date ? th : Qd(t) ? Jd : Array.isArray(t) ? eh : typeof t.valueOf != "function" && typeof t.toString != "function" || isNaN(t) ? nh : Xe)(e, t);
  }
  function oh(e, t) {
    return e = +e, t = +t, function(n) {
      return Math.round(e * (1 - n) + t * n);
    };
  }
  var Us = 180 / Math.PI, no = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function Ll(e, t, n, r, i, o) {
    var s, a, l;
    return (s = Math.sqrt(e * e + t * t)) && (e /= s, t /= s), (l = e * n + t * r) && (n -= e * l, r -= t * l), (a = Math.sqrt(n * n + r * r)) && (n /= a, r /= a, l /= a), e * r < t * n && (e = -e, t = -t, l = -l, s = -s), {
      translateX: i,
      translateY: o,
      rotate: Math.atan2(t, e) * Us,
      skewX: Math.atan(l) * Us,
      scaleX: s,
      scaleY: a
    };
  }
  var pr;
  function sh(e) {
    const t = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(e + "");
    return t.isIdentity ? no : Ll(t.a, t.b, t.c, t.d, t.e, t.f);
  }
  function ah(e) {
    return e == null || (pr || (pr = document.createElementNS("http://www.w3.org/2000/svg", "g")), pr.setAttribute("transform", e), !(e = pr.transform.baseVal.consolidate())) ? no : (e = e.matrix, Ll(e.a, e.b, e.c, e.d, e.e, e.f));
  }
  function Rl(e, t, n, r) {
    function i(u) {
      return u.length ? u.pop() + " " : "";
    }
    function o(u, c, f, h, d, g) {
      if (u !== f || c !== h) {
        var _ = d.push("translate(", null, t, null, n);
        g.push({
          i: _ - 4,
          x: Xe(u, f)
        }, {
          i: _ - 2,
          x: Xe(c, h)
        });
      } else (f || h) && d.push("translate(" + f + t + h + n);
    }
    function s(u, c, f, h) {
      u !== c ? (u - c > 180 ? c += 360 : c - u > 180 && (u += 360), h.push({
        i: f.push(i(f) + "rotate(", null, r) - 2,
        x: Xe(u, c)
      })) : c && f.push(i(f) + "rotate(" + c + r);
    }
    function a(u, c, f, h) {
      u !== c ? h.push({
        i: f.push(i(f) + "skewX(", null, r) - 2,
        x: Xe(u, c)
      }) : c && f.push(i(f) + "skewX(" + c + r);
    }
    function l(u, c, f, h, d, g) {
      if (u !== f || c !== h) {
        var _ = d.push(i(d) + "scale(", null, ",", null, ")");
        g.push({
          i: _ - 4,
          x: Xe(u, f)
        }, {
          i: _ - 2,
          x: Xe(c, h)
        });
      } else (f !== 1 || h !== 1) && d.push(i(d) + "scale(" + f + "," + h + ")");
    }
    return function(u, c) {
      var f = [], h = [];
      return u = e(u), c = e(c), o(u.translateX, u.translateY, c.translateX, c.translateY, f, h), s(u.rotate, c.rotate, f, h), a(u.skewX, c.skewX, f, h), l(u.scaleX, u.scaleY, c.scaleX, c.scaleY, f, h), u = c = null, function(d) {
        for (var g = -1, _ = h.length, F; ++g < _; ) f[(F = h[g]).i] = F.x(d);
        return f.join("");
      };
    };
  }
  var lh = Rl(sh, "px, ", "px)", "deg)"), uh = Rl(ah, ", ", ")", ")");
  function ch(e, t) {
    var n = an((e = Qi(e)).l, (t = Qi(t)).l), r = an(e.a, t.a), i = an(e.b, t.b), o = an(e.opacity, t.opacity);
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
          const o = (t - r.position) / (i.position - r.position), s = ch(r.color, i.color);
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
  const fh = 64;
  function dh(e) {
    const t = Math.max(1, Math.floor(e));
    return 2 ** Math.floor(Math.log2(t));
  }
  const _je = class _je {
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
      __publicField(this, "iterationBatchSize", 1e4);
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
      this.canvas = t, this.shaderPassCompute = If, this.shaderPassColor = Of, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.time = 0;
    }
    async initialize(t) {
      if (this.mandelbrotNavigator = t, !navigator.gpu) throw new Error("WebGPU non support\xE9");
      if (this.adapter = await navigator.gpu.requestAdapter(), !this.adapter) throw new Error("Adapter WebGPU introuvable");
      this.device = await this.adapter.requestDevice(), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), _je._tileTexture || (_je._tileTexture = await this._loadTexture("./colored_tiles.jpg")), this.tileTexture = await this._loadTexture("./colored_tiles.jpg"), this.tileTextureView = this.tileTexture.createView(), _je._skyboxTexture || (_je._skyboxTexture = await this._loadTexture("./gold.jpg")), this.skyboxTexture = await this._loadTexture("./gold.jpg"), this.skyboxTextureView = this.skyboxTexture.createView();
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
      ]), this.paletteTextureView = this.paletteTexture.createView(), this.webcamTexture = new zd(1920, 1080), this.webcamTileTexture = this.device.createTexture({
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
      }), this.uniformBufferResolve = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "Engine UniformBuffer Resolve"
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
        code: Ff,
        label: "Engine ShaderModule Resolve"
      }), i = this.device.createShaderModule({
        code: this.shaderPassColor,
        label: "Engine ShaderModule Color"
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
            texture: {
              sampleType: "unfilterable-float",
              viewDimension: "2d-array"
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
        length: _je.LAYER_COUNT
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
          targets: u
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
          targets: u
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
      const t = (window.devicePixelRatio || 1) * this.dprMultiplier, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) || 1, i = (n == null ? void 0 : n.clientHeight) || 1;
      this.width = Math.max(1, Math.round(r * t)), this.height = Math.max(1, Math.round(i * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = i + "px", this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      }), this.neutralSize = Math.ceil(Math.sqrt(this.width * this.width + this.height * this.height) * 1);
      const o = this.neutralSize;
      (_b = (_a2 = this.rawTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.rawBrushTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.resolvedTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2);
      const s = _je.LAYER_COUNT, a = (f) => {
        const h = this.device.createTexture({
          size: {
            width: o,
            height: o,
            depthOrArrayLayers: s
          },
          format: "r32float",
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
          label: f
        }), d = h.createView({
          dimension: "2d-array",
          baseArrayLayer: 0,
          arrayLayerCount: s,
          label: f + " ArrayView"
        }), g = [];
        for (let _ = 0; _ < s; _++) g.push(h.createView({
          dimension: "2d",
          baseArrayLayer: _,
          arrayLayerCount: 1,
          label: f + ` Layer${_}`
        }));
        return {
          texture: h,
          arrayView: d,
          layerViews: g
        };
      }, l = a("Engine RawTexture (A)");
      this.rawTexture = l.texture, this.rawArrayView = l.arrayView, this.rawLayerViews = l.layerViews;
      const u = a("Engine RawBrushTexture (B)");
      this.rawBrushTexture = u.texture, this.rawBrushArrayView = u.arrayView, this.rawBrushLayerViews = u.layerViews;
      const c = a("Engine ResolvedTexture");
      if (this.resolvedTexture = c.texture, this.resolvedArrayView = c.arrayView, this.resolvedLayerViews = c.layerViews, this.pipelineBrush) {
        const f = this.pipelineBrush.getBindGroupLayout(0);
        this.bindGroupBrush = this.device.createBindGroup({
          layout: f,
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
        const f = this.pipelineMandelbrot.getBindGroupLayout(0);
        this.bindGroupMandelbrot = this.device.createBindGroup({
          layout: f,
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
        const f = this.pipelineResolve.getBindGroupLayout(0);
        this.bindGroupResolve = this.device.createBindGroup({
          layout: f,
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
        const f = this.pipelineColor.getBindGroupLayout(0), h = [
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
          layout: f,
          entries: h,
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
      this.time += i, this.lastUpdateTime = r, this.needRender = !(this.areObjectsEqual(t, this.previousMandelbrot) && this.areObjectsEqual(n, this.previousRenderOptions)), this.needRender && (this.extraFrames = 1e3), n.activateWebcam ? (await this.updateWebcamTexture(), this.needRender = true) : (_a2 = this.webcamTexture) == null ? void 0 : _a2.closeWebcam(), n.activateTessellation && (this.needRender = true), n.activateAnimate && (this.needRender = true);
      const o = this.width / Math.max(1, this.height), s = new Float32Array([
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
        t.maxIterations,
        0
      ]);
      this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, s.buffer);
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
        o,
        t.angle,
        n.activateAnimate ? 1 : 0,
        t.mu,
        0
      ]);
      if (this.device.queue.writeBuffer(this.uniformBufferColor, 0, l.buffer), !this.needRender && this.extraFrames <= 0) return;
      const u = Math.ceil(t.maxIterations), c = this.mandelbrotNavigator.compute_reference_orbit_ptr(u), f = new Float32Array(_l.buffer, c.ptr, c.count * 4);
      c.offset < u && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, f, 0);
      const h = c.offset === 0 && !!this.prevFrameMandelbrot;
      this.clearHistoryNextFrame = false, (!this.prevFrameMandelbrot || h) && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.mu !== t.mu && (this.clearHistoryNextFrame = true), this.prevFrameMandelbrot && this.prevFrameMandelbrot.scale !== t.scale && (this.clearHistoryNextFrame = true), this.previousMandelbrot = structuredClone(t), this.previousRenderOptions = structuredClone(n);
    }
    async render() {
      if (!this.needRender && this.extraFrames <= 0 || (!this.needRender && this.extraFrames > 0 && this.extraFrames--, !this.pipelineBrush || !this.pipelineMandelbrot || !this.pipelineResolve || !this.pipelineColor) || !this.bindGroupBrush || !this.bindGroupMandelbrot || !this.bindGroupResolve || !this.bindGroupColor || !this.previousMandelbrot) return;
      const t = this.width / Math.max(1, this.height), n = dh(fh), r = n, i = this.clearHistoryNextFrame ? 1 : 0;
      let o = 0, s = 0;
      if (!this.clearHistoryNextFrame && this.prevFrameMandelbrot) {
        const N = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx, A = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy, O = this.neutralSize, y = Math.sqrt(t * t + 1);
        o = -(N * O) / (2 * this.previousMandelbrot.scale * y), s = A * O / (2 * this.previousMandelbrot.scale * y);
      }
      const a = new Float32Array([
        t,
        this.previousMandelbrot.angle,
        i,
        n,
        r,
        o,
        s,
        this.previousMandelbrot.mu
      ]);
      this.device.queue.writeBuffer(this.uniformBufferBrush, 0, a.buffer);
      const l = new Float32Array([
        this.previousMandelbrot.mu
      ]);
      this.device.queue.writeBuffer(this.uniformBufferResolve, 0, l.buffer);
      const u = this.device.createCommandEncoder(), c = (N) => N.map((A) => ({
        view: A,
        clearValue: {
          r: 0,
          g: 0,
          b: 0,
          a: 0
        },
        loadOp: "clear",
        storeOp: "store"
      })), f = u.beginRenderPass({
        colorAttachments: c(this.rawBrushLayerViews)
      });
      f.setPipeline(this.pipelineBrush), f.setBindGroup(0, this.bindGroupBrush), f.draw(6, 1, 0, 0), f.end();
      const h = u.beginRenderPass({
        colorAttachments: c(this.rawLayerViews)
      });
      h.setPipeline(this.pipelineMandelbrot), h.setBindGroup(0, this.bindGroupMandelbrot), h.draw(6, 1, 0, 0), h.end();
      const d = u.beginRenderPass({
        colorAttachments: c(this.resolvedLayerViews)
      });
      d.setPipeline(this.pipelineResolve), d.setBindGroup(0, this.bindGroupResolve), d.draw(6, 1, 0, 0), d.end();
      const g = this.ctx.getCurrentTexture().createView(), _ = u.beginRenderPass({
        colorAttachments: [
          {
            view: g,
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
      _.setPipeline(this.pipelineColor), _.setBindGroup(0, this.bindGroupColor), _.draw(6, 1, 0, 0), _.end();
      const F = performance.now();
      if (this.device.queue.submit([
        u.finish()
      ]), this.device.queue.onSubmittedWorkDone().then(() => {
        const N = performance.now() - F;
        if (N > 0) {
          const A = _je.TARGET_FRAME_MS / N, O = this.iterationBatchSize * A;
          this.iterationBatchSize = Math.round(Math.min(_je.MAX_BATCH_SIZE, Math.max(_je.MIN_BATCH_SIZE, this.iterationBatchSize * 0.7 + O * 0.3)));
        }
      }), this.prevFrameMandelbrot = {
        ...this.previousMandelbrot
      }, this.snapshotCallback) {
        try {
          const N = this.snapshotDestWidth ?? 256, A = Math.round(N * 9 / 16), O = this.device.createTexture({
            size: [
              N,
              A,
              1
            ],
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
          });
          {
            const G = this.device.createCommandEncoder(), Z = G.beginRenderPass({
              colorAttachments: [
                {
                  view: O.createView(),
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
            Z.setPipeline(this.pipelineColor), Z.setBindGroup(0, this.bindGroupColor), Z.draw(6, 1, 0, 0), Z.end(), this.device.queue.submit([
              G.finish()
            ]);
          }
          const y = (G) => G + 255 & -256, S = N * 4, P = y(S), W = P * A, X = this.device.createBuffer({
            size: W,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
          });
          {
            const G = this.device.createCommandEncoder();
            G.copyTextureToBuffer({
              texture: O
            }, {
              buffer: X,
              offset: 0,
              bytesPerRow: P
            }, {
              width: N,
              height: A,
              depthOrArrayLayers: 1
            }), this.device.queue.submit([
              G.finish()
            ]);
          }
          await this.device.queue.onSubmittedWorkDone(), await X.mapAsync(GPUMapMode.READ);
          const $ = X.getMappedRange(), H = new Uint8ClampedArray(N * A * 4), q = new Uint8Array($);
          for (let G = 0; G < A; ++G) for (let Z = 0; Z < N; ++Z) {
            const fe = G * P + Z * 4, L = (G * N + Z) * 4;
            H[L + 0] = q[fe + 2], H[L + 1] = q[fe + 1], H[L + 2] = q[fe + 0], H[L + 3] = q[fe + 3];
          }
          const w = document.createElement("canvas");
          w.width = N, w.height = A, w.getContext("2d").putImageData(new ImageData(H, N, A), 0, 0), X.unmap(), this.snapshotCallback(w.toDataURL("image/png"));
        } catch {
          this.snapshotCallback("");
        }
        this.snapshotCallback = void 0, this.snapshotDestWidth = void 0;
      }
    }
    destroy() {
      var _a2, _b, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j, _k, _l2, _m2, _n2, _o2, _p2, _q, _r2, _s2, _t2, _u2;
      (_b = (_a2 = this.rawTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.rawBrushTexture) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2), (_f2 = (_e2 = this.resolvedTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f2.call(_e2), (_h2 = (_g2 = this.mandelbrotReferenceBuffer) == null ? void 0 : _g2.destroy) == null ? void 0 : _h2.call(_g2), (_j = (_i2 = this.uniformBufferMandelbrot) == null ? void 0 : _i2.destroy) == null ? void 0 : _j.call(_i2), (_l2 = (_k = this.uniformBufferColor) == null ? void 0 : _k.destroy) == null ? void 0 : _l2.call(_k), (_n2 = (_m2 = this.uniformBufferBrush) == null ? void 0 : _m2.destroy) == null ? void 0 : _n2.call(_m2), (_p2 = (_o2 = this.uniformBufferResolve) == null ? void 0 : _o2.destroy) == null ? void 0 : _p2.call(_o2), (_q = this.webcamTexture) == null ? void 0 : _q.closeWebcam(), (_s2 = (_r2 = this.webcamTileTexture) == null ? void 0 : _r2.destroy) == null ? void 0 : _s2.call(_r2), (_u2 = (_t2 = this.paletteTexture) == null ? void 0 : _t2.destroy) == null ? void 0 : _u2.call(_t2);
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
  __publicField(_je, "LAYER_COUNT", 7);
  __publicField(_je, "MIN_BATCH_SIZE", 10);
  __publicField(_je, "MAX_BATCH_SIZE", 1e4);
  __publicField(_je, "TARGET_FRAME_MS", 16);
  __publicField(_je, "_tileTexture");
  __publicField(_je, "_tileTextureView");
  __publicField(_je, "_skyboxTexture");
  __publicField(_je, "_skyboxTextureView");
  __publicField(_je, "_paletteTexture");
  __publicField(_je, "_paletteTextureView");
  let je = _je;
  const hh = At({
    __name: "Mandelbrot",
    props: ko({
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
      const n = me(null);
      let r = null, i = null, o, s = false;
      const a = St(e, "cx"), l = St(e, "cy"), u = St(e, "scale"), c = St(e, "angle");
      Bt(() => [
        a.value,
        l.value,
        u.value,
        c.value
      ], ([_, F, N, A], [O, y, S, P]) => {
        s || o && (!_ || !F || !N || ((_ !== O || F !== y) && o.origin(_, F), N !== S && o.scale(N), A !== P && o.angle(A)));
      }, {
        flush: "sync"
      });
      const f = e;
      Bt(() => f.dprMultiplier, (_) => {
        i && (i.dprMultiplier = _, g());
      });
      async function h() {
        if (!i || !o) return;
        const _ = o.step();
        if (!_) return;
        const [F, N] = _, [A, O, y, S] = o.get_params();
        s = true, a.value = A, l.value = O, u.value = y, c.value = parseFloat(S), await ai(), s = false;
        const P = Math.min(Math.max(100, 1e3 * f.maxIterationMultiplier * Math.log2(1 / parseFloat(y))), 1e5);
        return await i.update({
          cx: A,
          cy: O,
          dx: parseFloat(F),
          dy: parseFloat(N),
          mu: f.mu,
          scale: parseFloat(y),
          angle: parseFloat(S),
          maxIterations: P,
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
        }), i.render();
      }
      async function d() {
        if (n.value) return r = n.value, o = new Ji(a.value, l.value, u.value, c.value), o.origin(a.value, l.value), o.scale(u.value), o.angle(c.value), i = new je(r, {
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
      async function g() {
        if (!n.value || !i) return;
        const _ = n.value.getBoundingClientRect();
        n.value.width = _.width, n.value.height = _.height, i.resize(), await h();
      }
      return Lt(async () => (await d(), window.addEventListener("resize", g), g())), nr(() => {
        window.removeEventListener("resize", g);
      }), t({
        getCanvas: () => n.value,
        getEngine: () => i,
        getNavigator: () => o,
        translate: (_, F) => o == null ? void 0 : o.translate(_, F),
        translateDirect: (_, F) => o == null ? void 0 : o.translate_direct(_, F),
        rotate: (_) => o == null ? void 0 : o.rotate(_),
        angle: (_) => o == null ? void 0 : o.angle(_),
        zoom: (_) => o == null ? void 0 : o.zoom(_),
        step: () => o == null ? void 0 : o.step(),
        getParams: () => o == null ? void 0 : o.get_params(),
        drawOnce: async () => h(),
        resize: async () => g(),
        initialize: async () => d()
      }), (_, F) => (ue(), he("canvas", {
        ref_key: "canvasRef",
        ref: n
      }, null, 512));
    }
  }), ph = {
    class: "mobile-nav-controls"
  }, gh = {
    key: 0,
    class: "directional-controls"
  }, mh = At({
    __name: "MobileNavigationControls",
    props: {
      mandelbrotRef: {}
    },
    setup(e) {
      const t = e, n = me(false), r = me(null);
      let i = null;
      const o = () => {
        n.value = !n.value, n.value || a();
      }, s = (d) => {
        d.preventDefault(), d.stopPropagation(), o();
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
      }, u = (d) => {
        r.value = `rotate-${d}`;
        const g = 0.025, _ = () => {
          t.mandelbrotRef && (d === "left" ? t.mandelbrotRef.rotate(g) : t.mandelbrotRef.rotate(-g));
        };
        _(), i = window.setInterval(_, 16);
      }, c = (d) => {
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
      return (d, g) => (ue(), he("div", ph, [
        m("button", {
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
          ...g[16] || (g[16] = [
            Gc('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-82fd1be4><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-82fd1be4></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-82fd1be4></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-82fd1be4></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-82fd1be4>N</text></svg>', 1)
          ])
        ], 34),
        xe(af, {
          name: "fade"
        }, {
          default: za(() => [
            n.value ? (ue(), he("div", gh, [
              m("button", {
                class: be([
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
                  m("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    m("path", {
                      d: "M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              m("button", {
                class: be([
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
                  m("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    m("path", {
                      d: "M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              m("button", {
                class: be([
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
                  m("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    m("path", {
                      d: "M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              m("button", {
                class: be([
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
                  m("svg", {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    m("path", {
                      d: "M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",
                      fill: "currentColor",
                      stroke: "black",
                      "stroke-width": "1"
                    })
                  ], -1)
                ])
              ], 34),
              m("button", {
                class: be([
                  "nav-button corner-button rotate-left",
                  {
                    active: r.value === "rotate-left"
                  }
                ]),
                onTouchstart: g[8] || (g[8] = (_) => f(_, () => u("left"))),
                onTouchend: h,
                onMousedown: g[9] || (g[9] = (_) => u("left")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Rotate Left"
              }, [
                ...g[21] || (g[21] = [
                  m("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    m("path", {
                      d: "M16 8 A6 6 0 1 0 8 16",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round"
                    }),
                    m("path", {
                      d: "M5 16 L8 16 L8 13",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    })
                  ], -1)
                ])
              ], 34),
              m("button", {
                class: be([
                  "nav-button corner-button rotate-right",
                  {
                    active: r.value === "rotate-right"
                  }
                ]),
                onTouchstart: g[10] || (g[10] = (_) => f(_, () => u("right"))),
                onTouchend: h,
                onMousedown: g[11] || (g[11] = (_) => u("right")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Rotate Right"
              }, [
                ...g[22] || (g[22] = [
                  m("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    m("path", {
                      d: "M8 8 A6 6 0 1 1 16 16",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round"
                    }),
                    m("path", {
                      d: "M19 16 L16 16 L16 13",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    })
                  ], -1)
                ])
              ], 34),
              m("button", {
                class: be([
                  "nav-button corner-button zoom-out",
                  {
                    active: r.value === "zoom-out"
                  }
                ]),
                onTouchstart: g[12] || (g[12] = (_) => f(_, () => c("out"))),
                onTouchend: h,
                onMousedown: g[13] || (g[13] = (_) => c("out")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Zoom Out"
              }, [
                ...g[23] || (g[23] = [
                  m("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    m("circle", {
                      cx: "11",
                      cy: "11",
                      r: "7",
                      stroke: "currentColor",
                      "stroke-width": "2"
                    }),
                    m("path", {
                      d: "M18 18 L22 22",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    m("path", {
                      d: "M8 11 L14 11",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    })
                  ], -1)
                ])
              ], 34),
              m("button", {
                class: be([
                  "nav-button corner-button zoom-in",
                  {
                    active: r.value === "zoom-in"
                  }
                ]),
                onTouchstart: g[14] || (g[14] = (_) => f(_, () => c("in"))),
                onTouchend: h,
                onMousedown: g[15] || (g[15] = (_) => c("in")),
                onMouseup: a,
                onMouseleave: a,
                "aria-label": "Zoom In"
              }, [
                ...g[24] || (g[24] = [
                  m("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    class: "nav-icon"
                  }, [
                    m("circle", {
                      cx: "11",
                      cy: "11",
                      r: "7",
                      stroke: "currentColor",
                      "stroke-width": "2"
                    }),
                    m("path", {
                      d: "M18 18 L22 22",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    m("path", {
                      d: "M11 8 L11 14",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    }),
                    m("path", {
                      d: "M8 11 L14 11",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round"
                    })
                  ], -1)
                ])
              ], 34)
            ])) : qt("", true)
          ]),
          _: 1
        })
      ]));
    }
  }), or = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [r, i] of t) n[r] = i;
    return n;
  }, vh = or(mh, [
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
  }, gr = 0.04, $s = 0.025, bh = At({
    __name: "MandelbrotController",
    props: ko({
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
      const n = St(e, "cx"), r = St(e, "cy"), i = St(e, "scale"), o = St(e, "angle"), s = e, a = me(null), l = {};
      t({
        getCanvas: O,
        getEngine: () => {
          var _a2;
          return ((_a2 = a.value) == null ? void 0 : _a2.getEngine()) ?? null;
        }
      });
      let u = false, c = false, f = 0, h = 0, d = 0, g = 0, _ = 0, F = false, N = null, A = null;
      function O() {
        var _a2;
        return ((_a2 = a.value) == null ? void 0 : _a2.getCanvas()) ?? null;
      }
      function y(L) {
        const D = O();
        if (!D) return {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        };
        const z = D.getBoundingClientRect();
        return {
          x: L.clientX - z.left,
          y: L.clientY - z.top,
          width: z.width,
          height: z.height
        };
      }
      function S(L) {
        l[L.code] = true;
      }
      function P(L) {
        l[L.code] = false;
      }
      function W(L) {
        var _a2, _b;
        L.preventDefault();
        const D = 0.6;
        L.deltaY < 0 ? (_a2 = a.value) == null ? void 0 : _a2.zoom(D) : (_b = a.value) == null ? void 0 : _b.zoom(1 / D);
      }
      function X(L) {
        if (L.button === 2) c = true;
        else {
          u = true;
          const D = y(L);
          f = D.x, h = D.y;
        }
      }
      function $(L) {
        var _a2, _b;
        const D = y(L);
        if (c) {
          const C = O();
          if (!C) return;
          const Me = C.getBoundingClientRect(), Ge = Me.width / 2, ze = Me.height / 2, gt = D.x, xn = D.y, ar = Math.atan2(xn - ze, gt - Ge);
          (_a2 = a.value) == null ? void 0 : _a2.angle(ar);
          return;
        }
        if (!u) return;
        const z = D.width, te = D.height, se = z / te, U = (D.x - f) / z * 2, b = (D.y - h) / te * 2;
        (_b = a.value) == null ? void 0 : _b.translateDirect(-U * se, b), f = D.x, h = D.y;
      }
      function H(L) {
        L.button === 2 ? c = false : u = false;
      }
      function q(L) {
        var _a2;
        const D = O();
        if (D) {
          if (L.touches.length === 1) {
            u = true;
            const z = L.touches[0], te = D.getBoundingClientRect();
            f = z.clientX - te.left, h = z.clientY - te.top;
          } else if (L.touches.length === 2) {
            u = false, F = true;
            const [z, te] = L.touches;
            d = Math.hypot(te.clientX - z.clientX, te.clientY - z.clientY), g = Math.atan2(te.clientY - z.clientY, te.clientX - z.clientX);
            const se = (_a2 = a.value) == null ? void 0 : _a2.getParams();
            _ = se ? parseFloat(se[3]) : 0;
          }
        }
      }
      function w(L) {
        var _a2, _b, _c2;
        const D = O();
        if (D) {
          if (u && L.touches.length === 1) {
            const z = L.touches[0], te = D.getBoundingClientRect(), se = z.clientX - te.left, U = z.clientY - te.top, b = te.width, C = te.height, Me = b / C, Ge = (se - f) / b * 2, ze = (U - h) / C * 2;
            (_a2 = a.value) == null ? void 0 : _a2.translateDirect(-Ge * Me, ze), f = se, h = U;
          } else if (F && L.touches.length === 2) {
            const [z, te] = L.touches, se = Math.hypot(te.clientX - z.clientX, te.clientY - z.clientY), U = Math.atan2(te.clientY - z.clientY, te.clientX - z.clientX), b = d / se;
            (_b = a.value) == null ? void 0 : _b.zoom(b);
            const C = U - g;
            (_c2 = a.value) == null ? void 0 : _c2.angle(_ + C);
          }
        }
      }
      function G(L) {
        L.touches.length === 0 && (u = false, F = false);
      }
      function Z() {
        var _a2, _b, _c2, _d2, _e2, _f2, _g2, _h2;
        l.KeyW && ((_a2 = a.value) == null ? void 0 : _a2.translate(0, gr)), l.KeyS && ((_b = a.value) == null ? void 0 : _b.translate(0, -gr)), l.KeyA && ((_c2 = a.value) == null ? void 0 : _c2.translate(-gr, 0)), l.KeyD && ((_d2 = a.value) == null ? void 0 : _d2.translate(gr, 0)), l.KeyQ && ((_e2 = a.value) == null ? void 0 : _e2.rotate($s)), l.KeyE && ((_f2 = a.value) == null ? void 0 : _f2.rotate(-$s));
        const L = 0.6;
        l.KeyR && ((_g2 = a.value) == null ? void 0 : _g2.zoom(L)), l.KeyF && ((_h2 = a.value) == null ? void 0 : _h2.zoom(1 / L)), A = window.setTimeout(Z, 16);
      }
      async function fe() {
        var _a2;
        await ((_a2 = a.value) == null ? void 0 : _a2.drawOnce()), N = requestAnimationFrame(fe);
      }
      return Lt(async () => {
        var _a2;
        await ai(), await ((_a2 = a.value) == null ? void 0 : _a2.initialize());
        const L = O();
        L && (window.addEventListener("keydown", S), window.addEventListener("keyup", P), L.addEventListener("wheel", W, {
          passive: false
        }), L.addEventListener("mousedown", X), L.addEventListener("contextmenu", (D) => D.preventDefault()), window.addEventListener("mousemove", $), window.addEventListener("mouseup", H), L.addEventListener("touchstart", q, {
          passive: false
        }), L.addEventListener("touchmove", w, {
          passive: false
        }), L.addEventListener("touchend", G, {
          passive: false
        }), Z(), await fe());
      }), nr(() => {
        N !== null && cancelAnimationFrame(N), A !== null && clearTimeout(A);
        const L = O();
        window.removeEventListener("keydown", S), window.removeEventListener("keyup", P), window.removeEventListener("mousemove", $), window.removeEventListener("mouseup", H), L && (L.removeEventListener("wheel", W), L.removeEventListener("mousedown", X), L.removeEventListener("contextmenu", (D) => D.preventDefault()), L.removeEventListener("touchstart", q), L.removeEventListener("touchmove", w), L.removeEventListener("touchend", G));
      }), (L, D) => (ue(), he("div", _h, [
        xe(hh, {
          ref_key: "mandelbrotRef",
          ref: a,
          scale: i.value,
          "onUpdate:scale": D[0] || (D[0] = (z) => i.value = z),
          angle: o.value,
          "onUpdate:angle": D[1] || (D[1] = (z) => o.value = z),
          cx: n.value,
          "onUpdate:cx": D[2] || (D[2] = (z) => n.value = z),
          cy: r.value,
          "onUpdate:cy": D[3] || (D[3] = (z) => r.value = z),
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
        xe(vh, {
          "mandelbrot-ref": a.value
        }, null, 8, [
          "mandelbrot-ref"
        ])
      ]));
    }
  }), yh = or(bh, [
    [
      "__scopeId",
      "data-v-7811d30a"
    ]
  ]), xh = [
    "fill",
    "stroke"
  ], wh = At({
    __name: "GlissiereHandle",
    props: {
      stop: {}
    },
    emits: [
      "update:position"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = me(null);
      function o(l) {
        let u = l.replace("#", "");
        u.length === 3 && (u = u.split("").map((d) => d + d).join(""));
        const c = parseInt(u.substring(0, 2), 16) / 255, f = parseInt(u.substring(2, 4), 16) / 255, h = parseInt(u.substring(4, 6), 16) / 255;
        return 0.299 * c + 0.587 * f + 0.114 * h;
      }
      const s = Te(() => o(n.stop.color) > 0.5 ? "#222" : "#fff");
      function a(l) {
        l.preventDefault();
        const u = l.clientX, c = n.stop.position, f = i.value;
        if (!f) return;
        const d = f.parentElement.getBoundingClientRect();
        function g(F) {
          const N = F.clientX - u;
          let A = c + N / d.width;
          A = Math.max(0, Math.min(1, A)), r("update:position", A);
        }
        function _() {
          window.removeEventListener("mousemove", g), window.removeEventListener("mouseup", _);
        }
        window.addEventListener("mousemove", g), window.addEventListener("mouseup", _);
      }
      return (l, u) => (ue(), he("svg", {
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
        m("rect", {
          x: "6",
          y: "0",
          width: "12",
          height: "64",
          rx: "8",
          fill: n.stop.color,
          stroke: s.value,
          "stroke-width": "2"
        }, null, 8, xh)
      ], 36));
    }
  });
  function Tr(e, t) {
    return e == null || t == null ? NaN : e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
  }
  function Sh(e, t) {
    return e == null || t == null ? NaN : t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
  }
  function zl(e) {
    let t, n, r;
    e.length !== 2 ? (t = Tr, n = (a, l) => Tr(e(a), l), r = (a, l) => e(a) - l) : (t = e === Tr || e === Sh ? e : Mh, n = e, r = e);
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
  function Mh() {
    return 0;
  }
  function Th(e) {
    return e === null ? NaN : +e;
  }
  const kh = zl(Tr), Ch = kh.right;
  zl(Th).center;
  const Eh = Math.sqrt(50), Ah = Math.sqrt(10), Ph = Math.sqrt(2);
  function Wr(e, t, n) {
    const r = (t - e) / Math.max(0, n), i = Math.floor(Math.log10(r)), o = r / Math.pow(10, i), s = o >= Eh ? 10 : o >= Ah ? 5 : o >= Ph ? 2 : 1;
    let a, l, u;
    return i < 0 ? (u = Math.pow(10, -i) / s, a = Math.round(e * u), l = Math.round(t * u), a / u < e && ++a, l / u > t && --l, u = -u) : (u = Math.pow(10, i) * s, a = Math.round(e / u), l = Math.round(t / u), a * u < e && ++a, l * u > t && --l), l < a && 0.5 <= n && n < 2 ? Wr(e, t, n * 2) : [
      a,
      l,
      u
    ];
  }
  function Lh(e, t, n) {
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
  function Rh(e, t, n) {
    t = +t, e = +e, n = +n;
    const r = t < e, i = r ? ro(t, e, n) : ro(e, t, n);
    return (r ? -1 : 1) * (i < 0 ? 1 / -i : i);
  }
  function zh(e) {
    return e;
  }
  var Nh = 3, Vs = 1e-6;
  function Ih(e) {
    return "translate(" + e + ",0)";
  }
  function Oh(e) {
    return (t) => +e(t);
  }
  function Bh(e, t) {
    return t = Math.max(0, e.bandwidth() - t * 2) / 2, e.round() && (t = Math.round(t)), (n) => +e(n) + t;
  }
  function Fh() {
    return !this.__axis;
  }
  function Dh(e, t) {
    var n = [], r = null, i = null, o = 6, s = 6, a = 3, l = typeof window < "u" && window.devicePixelRatio > 1 ? 0 : 0.5, u = 1, c = "y", f = Ih;
    function h(d) {
      var g = r ?? (t.ticks ? t.ticks.apply(t, n) : t.domain()), _ = i ?? (t.tickFormat ? t.tickFormat.apply(t, n) : zh), F = Math.max(o, 0) + a, N = t.range(), A = +N[0] + l, O = +N[N.length - 1] + l, y = (t.bandwidth ? Bh : Oh)(t.copy(), l), S = d.selection ? d.selection() : d, P = S.selectAll(".domain").data([
        null
      ]), W = S.selectAll(".tick").data(g, t).order(), X = W.exit(), $ = W.enter().append("g").attr("class", "tick"), H = W.select("line"), q = W.select("text");
      P = P.merge(P.enter().insert("path", ".tick").attr("class", "domain").attr("stroke", "currentColor")), W = W.merge($), H = H.merge($.append("line").attr("stroke", "currentColor").attr(c + "2", u * o)), q = q.merge($.append("text").attr("fill", "currentColor").attr(c, u * F).attr("dy", "0.71em")), d !== S && (P = P.transition(d), W = W.transition(d), H = H.transition(d), q = q.transition(d), X = X.transition(d).attr("opacity", Vs).attr("transform", function(w) {
        return isFinite(w = y(w)) ? f(w + l) : this.getAttribute("transform");
      }), $.attr("opacity", Vs).attr("transform", function(w) {
        var G = this.parentNode.__axis;
        return f((G && isFinite(G = G(w)) ? G : y(w)) + l);
      })), X.remove(), P.attr("d", s ? "M" + A + "," + u * s + "V" + l + "H" + O + "V" + u * s : "M" + A + "," + l + "H" + O), W.attr("opacity", 1).attr("transform", function(w) {
        return f(y(w) + l);
      }), H.attr(c + "2", u * o), q.attr(c, u * F).text(_), S.filter(Fh).attr("fill", "none").attr("font-size", 10).attr("font-family", "sans-serif").attr("text-anchor", "middle"), S.each(function() {
        this.__axis = y;
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
      return arguments.length ? (o = s = +d, h) : o;
    }, h.tickSizeInner = function(d) {
      return arguments.length ? (o = +d, h) : o;
    }, h.tickSizeOuter = function(d) {
      return arguments.length ? (s = +d, h) : s;
    }, h.tickPadding = function(d) {
      return arguments.length ? (a = +d, h) : a;
    }, h.offset = function(d) {
      return arguments.length ? (l = +d, h) : l;
    }, h;
  }
  function Uh(e) {
    return Dh(Nh, e);
  }
  var $h = {
    value: () => {
    }
  };
  function No() {
    for (var e = 0, t = arguments.length, n = {}, r; e < t; ++e) {
      if (!(r = arguments[e] + "") || r in n || /[\s.]/.test(r)) throw new Error("illegal type: " + r);
      n[r] = [];
    }
    return new kr(n);
  }
  function kr(e) {
    this._ = e;
  }
  function Vh(e, t) {
    return e.trim().split(/^|\s+/).map(function(n) {
      var r = "", i = n.indexOf(".");
      if (i >= 0 && (r = n.slice(i + 1), n = n.slice(0, i)), n && !t.hasOwnProperty(n)) throw new Error("unknown type: " + n);
      return {
        type: n,
        name: r
      };
    });
  }
  kr.prototype = No.prototype = {
    constructor: kr,
    on: function(e, t) {
      var n = this._, r = Vh(e + "", n), i, o = -1, s = r.length;
      if (arguments.length < 2) {
        for (; ++o < s; ) if ((i = (e = r[o]).type) && (i = Gh(n[i], e.name))) return i;
        return;
      }
      if (t != null && typeof t != "function") throw new Error("invalid callback: " + t);
      for (; ++o < s; ) if (i = (e = r[o]).type) n[i] = Gs(n[i], e.name, t);
      else if (t == null) for (i in n) n[i] = Gs(n[i], e.name, null);
      return this;
    },
    copy: function() {
      var e = {}, t = this._;
      for (var n in t) e[n] = t[n].slice();
      return new kr(e);
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
  function Gh(e, t) {
    for (var n = 0, r = e.length, i; n < r; ++n) if ((i = e[n]).name === t) return i.value;
  }
  function Gs(e, t, n) {
    for (var r = 0, i = e.length; r < i; ++r) if (e[r].name === t) {
      e[r] = $h, e = e.slice(0, r).concat(e.slice(r + 1));
      break;
    }
    return n != null && e.push({
      name: t,
      value: n
    }), e;
  }
  var io = "http://www.w3.org/1999/xhtml";
  const Hs = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: io,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };
  function pi(e) {
    var t = e += "", n = t.indexOf(":");
    return n >= 0 && (t = e.slice(0, n)) !== "xmlns" && (e = e.slice(n + 1)), Hs.hasOwnProperty(t) ? {
      space: Hs[t],
      local: e
    } : e;
  }
  function Hh(e) {
    return function() {
      var t = this.ownerDocument, n = this.namespaceURI;
      return n === io && t.documentElement.namespaceURI === io ? t.createElement(e) : t.createElementNS(n, e);
    };
  }
  function Wh(e) {
    return function() {
      return this.ownerDocument.createElementNS(e.space, e.local);
    };
  }
  function Io(e) {
    var t = pi(e);
    return (t.local ? Wh : Hh)(t);
  }
  function qh() {
  }
  function Oo(e) {
    return e == null ? qh : function() {
      return this.querySelector(e);
    };
  }
  function Kh(e) {
    typeof e != "function" && (e = Oo(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var o = t[i], s = o.length, a = r[i] = new Array(s), l, u, c = 0; c < s; ++c) (l = o[c]) && (u = e.call(l, l.__data__, c, o)) && ("__data__" in l && (u.__data__ = l.__data__), a[c] = u);
    return new Ve(r, this._parents);
  }
  function jh(e) {
    return e == null ? [] : Array.isArray(e) ? e : Array.from(e);
  }
  function Xh() {
    return [];
  }
  function Nl(e) {
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
    typeof e == "function" ? e = Yh(e) : e = Nl(e);
    for (var t = this._groups, n = t.length, r = [], i = [], o = 0; o < n; ++o) for (var s = t[o], a = s.length, l, u = 0; u < a; ++u) (l = s[u]) && (r.push(e.call(l, l.__data__, u, s)), i.push(l));
    return new Ve(r, i);
  }
  function Il(e) {
    return function() {
      return this.matches(e);
    };
  }
  function Ol(e) {
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
    return this.select(e == null ? ep : Qh(typeof e == "function" ? e : Ol(e)));
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
  function op(e) {
    return this.selectAll(e == null ? rp : ip(typeof e == "function" ? e : Ol(e)));
  }
  function sp(e) {
    typeof e != "function" && (e = Il(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var o = t[i], s = o.length, a = r[i] = [], l, u = 0; u < s; ++u) (l = o[u]) && e.call(l, l.__data__, u, o) && a.push(l);
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
  function up(e, t, n, r, i, o) {
    for (var s = 0, a, l = t.length, u = o.length; s < u; ++s) (a = t[s]) ? (a.__data__ = o[s], r[s] = a) : n[s] = new qr(e, o[s]);
    for (; s < l; ++s) (a = t[s]) && (i[s] = a);
  }
  function cp(e, t, n, r, i, o, s) {
    var a, l, u = /* @__PURE__ */ new Map(), c = t.length, f = o.length, h = new Array(c), d;
    for (a = 0; a < c; ++a) (l = t[a]) && (h[a] = d = s.call(l, l.__data__, a, t) + "", u.has(d) ? i[a] = l : u.set(d, l));
    for (a = 0; a < f; ++a) d = s.call(e, o[a], a, o) + "", (l = u.get(d)) ? (r[a] = l, l.__data__ = o[a], u.delete(d)) : n[a] = new qr(e, o[a]);
    for (a = 0; a < c; ++a) (l = t[a]) && u.get(h[a]) === l && (i[a] = l);
  }
  function fp(e) {
    return e.__data__;
  }
  function dp(e, t) {
    if (!arguments.length) return Array.from(this, fp);
    var n = t ? cp : up, r = this._parents, i = this._groups;
    typeof e != "function" && (e = lp(e));
    for (var o = i.length, s = new Array(o), a = new Array(o), l = new Array(o), u = 0; u < o; ++u) {
      var c = r[u], f = i[u], h = f.length, d = hp(e.call(c, c && c.__data__, u, r)), g = d.length, _ = a[u] = new Array(g), F = s[u] = new Array(g), N = l[u] = new Array(h);
      n(c, f, _, F, N, d, t);
      for (var A = 0, O = 0, y, S; A < g; ++A) if (y = _[A]) {
        for (A >= O && (O = A + 1); !(S = F[O]) && ++O < g; ) ;
        y._next = S || null;
      }
    }
    return s = new Ve(s, r), s._enter = a, s._exit = l, s;
  }
  function hp(e) {
    return typeof e == "object" && "length" in e ? e : Array.from(e);
  }
  function pp() {
    return new Ve(this._exit || this._groups.map(Bl), this._parents);
  }
  function gp(e, t, n) {
    var r = this.enter(), i = this, o = this.exit();
    return typeof e == "function" ? (r = e(r), r && (r = r.selection())) : r = r.append(e + ""), t != null && (i = t(i), i && (i = i.selection())), n == null ? o.remove() : n(o), r && i ? r.merge(i).order() : i;
  }
  function mp(e) {
    for (var t = e.selection ? e.selection() : e, n = this._groups, r = t._groups, i = n.length, o = r.length, s = Math.min(i, o), a = new Array(i), l = 0; l < s; ++l) for (var u = n[l], c = r[l], f = u.length, h = a[l] = new Array(f), d, g = 0; g < f; ++g) (d = u[g] || c[g]) && (h[g] = d);
    for (; l < i; ++l) a[l] = n[l];
    return new Ve(a, this._parents);
  }
  function vp() {
    for (var e = this._groups, t = -1, n = e.length; ++t < n; ) for (var r = e[t], i = r.length - 1, o = r[i], s; --i >= 0; ) (s = r[i]) && (o && s.compareDocumentPosition(o) ^ 4 && o.parentNode.insertBefore(s, o), o = s);
    return this;
  }
  function _p(e) {
    e || (e = bp);
    function t(f, h) {
      return f && h ? e(f.__data__, h.__data__) : !f - !h;
    }
    for (var n = this._groups, r = n.length, i = new Array(r), o = 0; o < r; ++o) {
      for (var s = n[o], a = s.length, l = i[o] = new Array(a), u, c = 0; c < a; ++c) (u = s[c]) && (l[c] = u);
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
  function xp() {
    return Array.from(this);
  }
  function wp() {
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, o = r.length; i < o; ++i) {
      var s = r[i];
      if (s) return s;
    }
    return null;
  }
  function Sp() {
    let e = 0;
    for (const t of this) ++e;
    return e;
  }
  function Mp() {
    return !this.node();
  }
  function Tp(e) {
    for (var t = this._groups, n = 0, r = t.length; n < r; ++n) for (var i = t[n], o = 0, s = i.length, a; o < s; ++o) (a = i[o]) && e.call(a, a.__data__, o, i);
    return this;
  }
  function kp(e) {
    return function() {
      this.removeAttribute(e);
    };
  }
  function Cp(e) {
    return function() {
      this.removeAttributeNS(e.space, e.local);
    };
  }
  function Ep(e, t) {
    return function() {
      this.setAttribute(e, t);
    };
  }
  function Ap(e, t) {
    return function() {
      this.setAttributeNS(e.space, e.local, t);
    };
  }
  function Pp(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? this.removeAttribute(e) : this.setAttribute(e, n);
    };
  }
  function Lp(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n);
    };
  }
  function Rp(e, t) {
    var n = pi(e);
    if (arguments.length < 2) {
      var r = this.node();
      return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n);
    }
    return this.each((t == null ? n.local ? Cp : kp : typeof t == "function" ? n.local ? Lp : Pp : n.local ? Ap : Ep)(n, t));
  }
  function Fl(e) {
    return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView;
  }
  function zp(e) {
    return function() {
      this.style.removeProperty(e);
    };
  }
  function Np(e, t, n) {
    return function() {
      this.style.setProperty(e, t, n);
    };
  }
  function Ip(e, t, n) {
    return function() {
      var r = t.apply(this, arguments);
      r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n);
    };
  }
  function Op(e, t, n) {
    return arguments.length > 1 ? this.each((t == null ? zp : typeof t == "function" ? Ip : Np)(e, t, n ?? "")) : _n(this.node(), e);
  }
  function _n(e, t) {
    return e.style.getPropertyValue(t) || Fl(e).getComputedStyle(e, null).getPropertyValue(t);
  }
  function Bp(e) {
    return function() {
      delete this[e];
    };
  }
  function Fp(e, t) {
    return function() {
      this[e] = t;
    };
  }
  function Dp(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      n == null ? delete this[e] : this[e] = n;
    };
  }
  function Up(e, t) {
    return arguments.length > 1 ? this.each((t == null ? Bp : typeof t == "function" ? Dp : Fp)(e, t)) : this.node()[e];
  }
  function Dl(e) {
    return e.trim().split(/^|\s+/);
  }
  function Bo(e) {
    return e.classList || new Ul(e);
  }
  function Ul(e) {
    this._node = e, this._names = Dl(e.getAttribute("class") || "");
  }
  Ul.prototype = {
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
  function $l(e, t) {
    for (var n = Bo(e), r = -1, i = t.length; ++r < i; ) n.add(t[r]);
  }
  function Vl(e, t) {
    for (var n = Bo(e), r = -1, i = t.length; ++r < i; ) n.remove(t[r]);
  }
  function $p(e) {
    return function() {
      $l(this, e);
    };
  }
  function Vp(e) {
    return function() {
      Vl(this, e);
    };
  }
  function Gp(e, t) {
    return function() {
      (t.apply(this, arguments) ? $l : Vl)(this, e);
    };
  }
  function Hp(e, t) {
    var n = Dl(e + "");
    if (arguments.length < 2) {
      for (var r = Bo(this.node()), i = -1, o = n.length; ++i < o; ) if (!r.contains(n[i])) return false;
      return true;
    }
    return this.each((typeof t == "function" ? Gp : t ? $p : Vp)(n, t));
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
    var t = typeof e == "function" ? e : Io(e);
    return this.select(function() {
      return this.appendChild(t.apply(this, arguments));
    });
  }
  function ig() {
    return null;
  }
  function og(e, t) {
    var n = typeof e == "function" ? e : Io(e), r = t == null ? ig : typeof t == "function" ? t : Oo(t);
    return this.select(function() {
      return this.insertBefore(n.apply(this, arguments), r.apply(this, arguments) || null);
    });
  }
  function sg() {
    var e = this.parentNode;
    e && e.removeChild(this);
  }
  function ag() {
    return this.each(sg);
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
        for (var n = 0, r = -1, i = t.length, o; n < i; ++n) o = t[n], (!e.type || o.type === e.type) && o.name === e.name ? this.removeEventListener(o.type, o.listener, o.options) : t[++r] = o;
        ++r ? t.length = r : delete this.__on;
      }
    };
  }
  function gg(e, t, n) {
    return function() {
      var r = this.__on, i, o = dg(t);
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
  function mg(e, t, n) {
    var r = hg(e + ""), i, o = r.length, s;
    if (arguments.length < 2) {
      var a = this.node().__on;
      if (a) {
        for (var l = 0, u = a.length, c; l < u; ++l) for (i = 0, c = a[l]; i < o; ++i) if ((s = r[i]).type === c.type && s.name === c.name) return c.value;
      }
      return;
    }
    for (a = t ? gg : pg, i = 0; i < o; ++i) this.each(a(r[i], t, n));
    return this;
  }
  function Gl(e, t, n) {
    var r = Fl(e), i = r.CustomEvent;
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
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, o = r.length, s; i < o; ++i) (s = r[i]) && (yield s);
  }
  var Hl = [
    null
  ];
  function Ve(e, t) {
    this._groups = e, this._parents = t;
  }
  function sr() {
    return new Ve([
      [
        document.documentElement
      ]
    ], Hl);
  }
  function xg() {
    return this;
  }
  Ve.prototype = sr.prototype = {
    constructor: Ve,
    select: Kh,
    selectAll: Zh,
    selectChild: tp,
    selectChildren: op,
    filter: sp,
    data: dp,
    enter: ap,
    exit: pp,
    join: gp,
    merge: mp,
    selection: xg,
    order: vp,
    sort: _p,
    call: yp,
    nodes: xp,
    node: wp,
    size: Sp,
    empty: Mp,
    each: Tp,
    attr: Rp,
    style: Op,
    property: Up,
    classed: Hp,
    text: jp,
    html: Jp,
    raise: eg,
    lower: ng,
    append: rg,
    insert: og,
    remove: ag,
    clone: cg,
    datum: fg,
    on: mg,
    dispatch: bg,
    [Symbol.iterator]: yg
  };
  function Qt(e) {
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
  function wg(e) {
    return Qt(Io(e).call(document.documentElement));
  }
  var Sg = 0;
  function Wl() {
    return new oo();
  }
  function oo() {
    this._ = "@" + (++Sg).toString(36);
  }
  oo.prototype = Wl.prototype = {
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
  function Mg(e) {
    let t;
    for (; t = e.sourceEvent; ) e = t;
    return e;
  }
  function Ws(e, t) {
    if (e = Mg(e), t === void 0 && (t = e.currentTarget), t) {
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
  const Tg = {
    passive: false
  }, Zn = {
    capture: true,
    passive: false
  };
  function Oi(e) {
    e.stopImmediatePropagation();
  }
  function mn(e) {
    e.preventDefault(), e.stopImmediatePropagation();
  }
  function kg(e) {
    var t = e.document.documentElement, n = Qt(e).on("dragstart.drag", mn, Zn);
    "onselectstart" in t ? n.on("selectstart.drag", mn, Zn) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = "none");
  }
  function Cg(e, t) {
    var n = e.document.documentElement, r = Qt(e).on("dragstart.drag", null);
    t && (r.on("click.drag", mn, Zn), setTimeout(function() {
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
  function Eg(e) {
    return !e.ctrlKey && !e.button;
  }
  function Ag() {
    return this.parentNode;
  }
  function Pg(e, t) {
    return t ?? {
      x: e.x,
      y: e.y
    };
  }
  function Lg() {
    return navigator.maxTouchPoints || "ontouchstart" in this;
  }
  function Rg() {
    var e = Eg, t = Ag, n = Pg, r = Lg, i = {}, o = No("start", "drag", "end"), s = 0, a, l, u, c, f = 0;
    function h(y) {
      y.on("mousedown.drag", d).filter(r).on("touchstart.drag", F).on("touchmove.drag", N, Tg).on("touchend.drag touchcancel.drag", A).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }
    function d(y, S) {
      if (!(c || !e.call(this, y, S))) {
        var P = O(this, t.call(this, y, S), y, S, "mouse");
        P && (Qt(y.view).on("mousemove.drag", g, Zn).on("mouseup.drag", _, Zn), kg(y.view), Oi(y), u = false, a = y.clientX, l = y.clientY, P("start", y));
      }
    }
    function g(y) {
      if (mn(y), !u) {
        var S = y.clientX - a, P = y.clientY - l;
        u = S * S + P * P > f;
      }
      i.mouse("drag", y);
    }
    function _(y) {
      Qt(y.view).on("mousemove.drag mouseup.drag", null), Cg(y.view, u), mn(y), i.mouse("end", y);
    }
    function F(y, S) {
      if (e.call(this, y, S)) {
        var P = y.changedTouches, W = t.call(this, y, S), X = P.length, $, H;
        for ($ = 0; $ < X; ++$) (H = O(this, W, y, S, P[$].identifier, P[$])) && (Oi(y), H("start", y, P[$]));
      }
    }
    function N(y) {
      var S = y.changedTouches, P = S.length, W, X;
      for (W = 0; W < P; ++W) (X = i[S[W].identifier]) && (mn(y), X("drag", y, S[W]));
    }
    function A(y) {
      var S = y.changedTouches, P = S.length, W, X;
      for (c && clearTimeout(c), c = setTimeout(function() {
        c = null;
      }, 500), W = 0; W < P; ++W) (X = i[S[W].identifier]) && (Oi(y), X("end", y, S[W]));
    }
    function O(y, S, P, W, X, $) {
      var H = o.copy(), q = Ws($ || P, S), w, G, Z;
      if ((Z = n.call(y, new so("beforestart", {
        sourceEvent: P,
        target: h,
        identifier: X,
        active: s,
        x: q[0],
        y: q[1],
        dx: 0,
        dy: 0,
        dispatch: H
      }), W)) != null) return w = Z.x - q[0] || 0, G = Z.y - q[1] || 0, function fe(L, D, z) {
        var te = q, se;
        switch (L) {
          case "start":
            i[X] = fe, se = s++;
            break;
          case "end":
            delete i[X], --s;
          case "drag":
            q = Ws(z || D, S), se = s;
            break;
        }
        H.call(L, y, new so(L, {
          sourceEvent: D,
          subject: Z,
          target: h,
          identifier: X,
          active: se,
          x: q[0] + w,
          y: q[1] + G,
          dx: q[0] - te[0],
          dy: q[1] - te[1],
          dispatch: H
        }), W);
      };
    }
    return h.filter = function(y) {
      return arguments.length ? (e = typeof y == "function" ? y : mr(!!y), h) : e;
    }, h.container = function(y) {
      return arguments.length ? (t = typeof y == "function" ? y : mr(y), h) : t;
    }, h.subject = function(y) {
      return arguments.length ? (n = typeof y == "function" ? y : mr(y), h) : n;
    }, h.touchable = function(y) {
      return arguments.length ? (r = typeof y == "function" ? y : mr(!!y), h) : r;
    }, h.on = function() {
      var y = o.on.apply(o, arguments);
      return y === o ? h : y;
    }, h.clickDistance = function(y) {
      return arguments.length ? (f = (y = +y) * y, h) : Math.sqrt(f);
    }, h;
  }
  var bn = 0, Pn = 0, En = 0, ql = 1e3, Kr, Ln, jr = 0, en = 0, gi = 0, Jn = typeof performance == "object" && performance.now ? performance : Date, Kl = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(e) {
    setTimeout(e, 17);
  };
  function Fo() {
    return en || (Kl(zg), en = Jn.now() + gi);
  }
  function zg() {
    en = 0;
  }
  function Xr() {
    this._call = this._time = this._next = null;
  }
  Xr.prototype = jl.prototype = {
    constructor: Xr,
    restart: function(e, t, n) {
      if (typeof e != "function") throw new TypeError("callback is not a function");
      n = (n == null ? Fo() : +n) + (t == null ? 0 : +t), !this._next && Ln !== this && (Ln ? Ln._next = this : Kr = this, Ln = this), this._call = e, this._time = n, ao();
    },
    stop: function() {
      this._call && (this._call = null, this._time = 1 / 0, ao());
    }
  };
  function jl(e, t, n) {
    var r = new Xr();
    return r.restart(e, t, n), r;
  }
  function Ng() {
    Fo(), ++bn;
    for (var e = Kr, t; e; ) (t = en - e._time) >= 0 && e._call.call(void 0, t), e = e._next;
    --bn;
  }
  function qs() {
    en = (jr = Jn.now()) + gi, bn = Pn = 0;
    try {
      Ng();
    } finally {
      bn = 0, Og(), en = 0;
    }
  }
  function Ig() {
    var e = Jn.now(), t = e - jr;
    t > ql && (gi -= t, jr = e);
  }
  function Og() {
    for (var e, t = Kr, n, r = 1 / 0; t; ) t._call ? (r > t._time && (r = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : Kr = n);
    Ln = e, ao(r);
  }
  function ao(e) {
    if (!bn) {
      Pn && (Pn = clearTimeout(Pn));
      var t = e - en;
      t > 24 ? (e < 1 / 0 && (Pn = setTimeout(qs, e - Jn.now() - gi)), En && (En = clearInterval(En))) : (En || (jr = Jn.now(), En = setInterval(Ig, ql)), bn = 1, Kl(qs));
    }
  }
  function Ks(e, t, n) {
    var r = new Xr();
    return t = t == null ? 0 : +t, r.restart((i) => {
      r.stop(), e(i + t);
    }, t, n), r;
  }
  var Bg = No("start", "end", "cancel", "interrupt"), Fg = [], Xl = 0, js = 1, lo = 2, Cr = 3, Xs = 4, uo = 5, Er = 6;
  function mi(e, t, n, r, i, o) {
    var s = e.__transition;
    if (!s) e.__transition = {};
    else if (n in s) return;
    Dg(e, n, {
      name: t,
      index: r,
      group: i,
      on: Bg,
      tween: Fg,
      time: o.time,
      delay: o.delay,
      duration: o.duration,
      ease: o.ease,
      timer: null,
      state: Xl
    });
  }
  function Do(e, t) {
    var n = et(e, t);
    if (n.state > Xl) throw new Error("too late; already scheduled");
    return n;
  }
  function pt(e, t) {
    var n = et(e, t);
    if (n.state > Cr) throw new Error("too late; already running");
    return n;
  }
  function et(e, t) {
    var n = e.__transition;
    if (!n || !(n = n[t])) throw new Error("transition not found");
    return n;
  }
  function Dg(e, t, n) {
    var r = e.__transition, i;
    r[t] = n, n.timer = jl(o, 0, n.time);
    function o(u) {
      n.state = js, n.timer.restart(s, n.delay, n.time), n.delay <= u && s(u - n.delay);
    }
    function s(u) {
      var c, f, h, d;
      if (n.state !== js) return l();
      for (c in r) if (d = r[c], d.name === n.name) {
        if (d.state === Cr) return Ks(s);
        d.state === Xs ? (d.state = Er, d.timer.stop(), d.on.call("interrupt", e, e.__data__, d.index, d.group), delete r[c]) : +c < t && (d.state = Er, d.timer.stop(), d.on.call("cancel", e, e.__data__, d.index, d.group), delete r[c]);
      }
      if (Ks(function() {
        n.state === Cr && (n.state = Xs, n.timer.restart(a, n.delay, n.time), a(u));
      }), n.state = lo, n.on.call("start", e, e.__data__, n.index, n.group), n.state === lo) {
        for (n.state = Cr, i = new Array(h = n.tween.length), c = 0, f = -1; c < h; ++c) (d = n.tween[c].value.call(e, e.__data__, n.index, n.group)) && (i[++f] = d);
        i.length = f + 1;
      }
    }
    function a(u) {
      for (var c = u < n.duration ? n.ease.call(null, u / n.duration) : (n.timer.restart(l), n.state = uo, 1), f = -1, h = i.length; ++f < h; ) i[f].call(e, c);
      n.state === uo && (n.on.call("end", e, e.__data__, n.index, n.group), l());
    }
    function l() {
      n.state = Er, n.timer.stop(), delete r[t];
      for (var u in r) return;
      delete e.__transition;
    }
  }
  function Ug(e, t) {
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
  function $g(e) {
    return this.each(function() {
      Ug(this, e);
    });
  }
  function Vg(e, t) {
    var n, r;
    return function() {
      var i = pt(this, e), o = i.tween;
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
  function Gg(e, t, n) {
    var r, i;
    if (typeof n != "function") throw new Error();
    return function() {
      var o = pt(this, e), s = o.tween;
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
  function Hg(e, t) {
    var n = this._id;
    if (e += "", arguments.length < 2) {
      for (var r = et(this.node(), n).tween, i = 0, o = r.length, s; i < o; ++i) if ((s = r[i]).name === e) return s.value;
      return null;
    }
    return this.each((t == null ? Vg : Gg)(n, e, t));
  }
  function Uo(e, t, n) {
    var r = e._id;
    return e.each(function() {
      var i = pt(this, r);
      (i.value || (i.value = {}))[t] = n.apply(this, arguments);
    }), function(i) {
      return et(i, r).value[t];
    };
  }
  function Yl(e, t) {
    var n;
    return (typeof t == "number" ? Xe : t instanceof Jt ? Gr : (n = Jt(t)) ? (t = n, Gr) : Pl)(e, t);
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
    var r, i = n + "", o;
    return function() {
      var s = this.getAttribute(e);
      return s === i ? null : s === r ? o : o = t(r = s, n);
    };
  }
  function jg(e, t, n) {
    var r, i = n + "", o;
    return function() {
      var s = this.getAttributeNS(e.space, e.local);
      return s === i ? null : s === r ? o : o = t(r = s, n);
    };
  }
  function Xg(e, t, n) {
    var r, i, o;
    return function() {
      var s, a = n(this), l;
      return a == null ? void this.removeAttribute(e) : (s = this.getAttribute(e), l = a + "", s === l ? null : s === r && l === i ? o : (i = l, o = t(r = s, a)));
    };
  }
  function Yg(e, t, n) {
    var r, i, o;
    return function() {
      var s, a = n(this), l;
      return a == null ? void this.removeAttributeNS(e.space, e.local) : (s = this.getAttributeNS(e.space, e.local), l = a + "", s === l ? null : s === r && l === i ? o : (i = l, o = t(r = s, a)));
    };
  }
  function Zg(e, t) {
    var n = pi(e), r = n === "transform" ? uh : Yl;
    return this.attrTween(e, typeof t == "function" ? (n.local ? Yg : Xg)(n, r, Uo(this, "attr." + e, t)) : t == null ? (n.local ? qg : Wg)(n) : (n.local ? jg : Kg)(n, r, t));
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
      var o = t.apply(this, arguments);
      return o !== r && (n = (r = o) && Qg(e, o)), n;
    }
    return i._value = t, i;
  }
  function tm(e, t) {
    var n, r;
    function i() {
      var o = t.apply(this, arguments);
      return o !== r && (n = (r = o) && Jg(e, o)), n;
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
      Do(this, e).delay = +t.apply(this, arguments);
    };
  }
  function im(e, t) {
    return t = +t, function() {
      Do(this, e).delay = t;
    };
  }
  function om(e) {
    var t = this._id;
    return arguments.length ? this.each((typeof e == "function" ? rm : im)(t, e)) : et(this.node(), t).delay;
  }
  function sm(e, t) {
    return function() {
      pt(this, e).duration = +t.apply(this, arguments);
    };
  }
  function am(e, t) {
    return t = +t, function() {
      pt(this, e).duration = t;
    };
  }
  function lm(e) {
    var t = this._id;
    return arguments.length ? this.each((typeof e == "function" ? sm : am)(t, e)) : et(this.node(), t).duration;
  }
  function um(e, t) {
    if (typeof t != "function") throw new Error();
    return function() {
      pt(this, e).ease = t;
    };
  }
  function cm(e) {
    var t = this._id;
    return arguments.length ? this.each(um(t, e)) : et(this.node(), t).ease;
  }
  function fm(e, t) {
    return function() {
      var n = t.apply(this, arguments);
      if (typeof n != "function") throw new Error();
      pt(this, e).ease = n;
    };
  }
  function dm(e) {
    if (typeof e != "function") throw new Error();
    return this.each(fm(this._id, e));
  }
  function hm(e) {
    typeof e != "function" && (e = Il(e));
    for (var t = this._groups, n = t.length, r = new Array(n), i = 0; i < n; ++i) for (var o = t[i], s = o.length, a = r[i] = [], l, u = 0; u < s; ++u) (l = o[u]) && e.call(l, l.__data__, u, o) && a.push(l);
    return new Et(r, this._parents, this._name, this._id);
  }
  function pm(e) {
    if (e._id !== this._id) throw new Error();
    for (var t = this._groups, n = e._groups, r = t.length, i = n.length, o = Math.min(r, i), s = new Array(r), a = 0; a < o; ++a) for (var l = t[a], u = n[a], c = l.length, f = s[a] = new Array(c), h, d = 0; d < c; ++d) (h = l[d] || u[d]) && (f[d] = h);
    for (; a < r; ++a) s[a] = t[a];
    return new Et(s, this._parents, this._name, this._id);
  }
  function gm(e) {
    return (e + "").trim().split(/^|\s+/).every(function(t) {
      var n = t.indexOf(".");
      return n >= 0 && (t = t.slice(0, n)), !t || t === "start";
    });
  }
  function mm(e, t, n) {
    var r, i, o = gm(t) ? Do : pt;
    return function() {
      var s = o(this, e), a = s.on;
      a !== r && (i = (r = a).copy()).on(t, n), s.on = i;
    };
  }
  function vm(e, t) {
    var n = this._id;
    return arguments.length < 2 ? et(this.node(), n).on.on(e) : this.each(mm(n, e, t));
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
    typeof e != "function" && (e = Oo(e));
    for (var r = this._groups, i = r.length, o = new Array(i), s = 0; s < i; ++s) for (var a = r[s], l = a.length, u = o[s] = new Array(l), c, f, h = 0; h < l; ++h) (c = a[h]) && (f = e.call(c, c.__data__, h, a)) && ("__data__" in c && (f.__data__ = c.__data__), u[h] = f, mi(u[h], t, n, h, u, et(c, n)));
    return new Et(o, this._parents, t, n);
  }
  function xm(e) {
    var t = this._name, n = this._id;
    typeof e != "function" && (e = Nl(e));
    for (var r = this._groups, i = r.length, o = [], s = [], a = 0; a < i; ++a) for (var l = r[a], u = l.length, c, f = 0; f < u; ++f) if (c = l[f]) {
      for (var h = e.call(c, c.__data__, f, l), d, g = et(c, n), _ = 0, F = h.length; _ < F; ++_) (d = h[_]) && mi(d, t, n, _, h, g);
      o.push(h), s.push(c);
    }
    return new Et(o, s, t, n);
  }
  var wm = sr.prototype.constructor;
  function Sm() {
    return new wm(this._groups, this._parents);
  }
  function Mm(e, t) {
    var n, r, i;
    return function() {
      var o = _n(this, e), s = (this.style.removeProperty(e), _n(this, e));
      return o === s ? null : o === n && s === r ? i : i = t(n = o, r = s);
    };
  }
  function Zl(e) {
    return function() {
      this.style.removeProperty(e);
    };
  }
  function Tm(e, t, n) {
    var r, i = n + "", o;
    return function() {
      var s = _n(this, e);
      return s === i ? null : s === r ? o : o = t(r = s, n);
    };
  }
  function km(e, t, n) {
    var r, i, o;
    return function() {
      var s = _n(this, e), a = n(this), l = a + "";
      return a == null && (l = a = (this.style.removeProperty(e), _n(this, e))), s === l ? null : s === r && l === i ? o : (i = l, o = t(r = s, a));
    };
  }
  function Cm(e, t) {
    var n, r, i, o = "style." + t, s = "end." + o, a;
    return function() {
      var l = pt(this, e), u = l.on, c = l.value[o] == null ? a || (a = Zl(t)) : void 0;
      (u !== n || i !== c) && (r = (n = u).copy()).on(s, i = c), l.on = r;
    };
  }
  function Em(e, t, n) {
    var r = (e += "") == "transform" ? lh : Yl;
    return t == null ? this.styleTween(e, Mm(e, r)).on("end.style." + e, Zl(e)) : typeof t == "function" ? this.styleTween(e, km(e, r, Uo(this, "style." + e, t))).each(Cm(this._id, e)) : this.styleTween(e, Tm(e, r, t), n).on("end.style." + e, null);
  }
  function Am(e, t, n) {
    return function(r) {
      this.style.setProperty(e, t.call(this, r), n);
    };
  }
  function Pm(e, t, n) {
    var r, i;
    function o() {
      var s = t.apply(this, arguments);
      return s !== i && (r = (i = s) && Am(e, s, n)), r;
    }
    return o._value = t, o;
  }
  function Lm(e, t, n) {
    var r = "style." + (e += "");
    if (arguments.length < 2) return (r = this.tween(r)) && r._value;
    if (t == null) return this.tween(r, null);
    if (typeof t != "function") throw new Error();
    return this.tween(r, Pm(e, t, n ?? ""));
  }
  function Rm(e) {
    return function() {
      this.textContent = e;
    };
  }
  function zm(e) {
    return function() {
      var t = e(this);
      this.textContent = t ?? "";
    };
  }
  function Nm(e) {
    return this.tween("text", typeof e == "function" ? zm(Uo(this, "text", e)) : Rm(e == null ? "" : e + ""));
  }
  function Im(e) {
    return function(t) {
      this.textContent = e.call(this, t);
    };
  }
  function Om(e) {
    var t, n;
    function r() {
      var i = e.apply(this, arguments);
      return i !== n && (t = (n = i) && Im(i)), t;
    }
    return r._value = e, r;
  }
  function Bm(e) {
    var t = "text";
    if (arguments.length < 1) return (t = this.tween(t)) && t._value;
    if (e == null) return this.tween(t, null);
    if (typeof e != "function") throw new Error();
    return this.tween(t, Om(e));
  }
  function Fm() {
    for (var e = this._name, t = this._id, n = Jl(), r = this._groups, i = r.length, o = 0; o < i; ++o) for (var s = r[o], a = s.length, l, u = 0; u < a; ++u) if (l = s[u]) {
      var c = et(l, t);
      mi(l, e, n, u, s, {
        time: c.time + c.delay + c.duration,
        delay: 0,
        duration: c.duration,
        ease: c.ease
      });
    }
    return new Et(r, this._parents, e, n);
  }
  function Dm() {
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
        var u = pt(this, r), c = u.on;
        c !== e && (t = (e = c).copy(), t._.cancel.push(a), t._.interrupt.push(a), t._.end.push(l)), u.on = t;
      }), i === 0 && o();
    });
  }
  var Um = 0;
  function Et(e, t, n, r) {
    this._groups = e, this._parents = t, this._name = n, this._id = r;
  }
  function Jl() {
    return ++Um;
  }
  var _t = sr.prototype;
  Et.prototype = {
    constructor: Et,
    select: ym,
    selectAll: xm,
    selectChild: _t.selectChild,
    selectChildren: _t.selectChildren,
    filter: hm,
    merge: pm,
    selection: Sm,
    transition: Fm,
    call: _t.call,
    nodes: _t.nodes,
    node: _t.node,
    size: _t.size,
    empty: _t.empty,
    each: _t.each,
    on: vm,
    attr: Zg,
    attrTween: nm,
    style: Em,
    styleTween: Lm,
    text: Nm,
    textTween: Bm,
    remove: bm,
    tween: Hg,
    delay: om,
    duration: lm,
    ease: cm,
    easeVarying: dm,
    end: Dm,
    [Symbol.iterator]: _t[Symbol.iterator]
  };
  function $m(e) {
    return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2;
  }
  var Vm = {
    time: null,
    delay: 0,
    duration: 250,
    ease: $m
  };
  function Gm(e, t) {
    for (var n; !(n = e.__transition) || !(n = n[t]); ) if (!(e = e.parentNode)) throw new Error(`transition ${t} not found`);
    return n;
  }
  function Hm(e) {
    var t, n;
    e instanceof Et ? (t = e._id, e = e._name) : (t = Jl(), (n = Vm).time = Fo(), e = e == null ? null : e + "");
    for (var r = this._groups, i = r.length, o = 0; o < i; ++o) for (var s = r[o], a = s.length, l, u = 0; u < a; ++u) (l = s[u]) && mi(l, e, t, u, s, n || Gm(l, t));
    return new Et(r, this._parents, e, t);
  }
  sr.prototype.interrupt = $g;
  sr.prototype.transition = Hm;
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
      for (var i = n.length, o = [], s = 0, a = e[0], l = 0; i > 0 && a > 0 && (l + a + 1 > r && (a = Math.max(1, r - l)), o.push(n.substring(i -= a, i + a)), !((l += a + 1) > r)); ) a = e[s = (s + 1) % e.length];
      return o.reverse().join(t);
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
    var r = n[0], i = n[1], o = i - (Jr = Math.max(-8, Math.min(8, Math.floor(i / 3))) * 3) + 1, s = r.length;
    return o === s ? r : o > s ? r + new Array(o - s + 1).join("0") : o > 0 ? r.slice(0, o) + "." + r.slice(o) : "0." + new Array(1 - o).join("0") + Yr(e, Math.max(0, t + o - 1))[0];
  }
  function Ys(e, t) {
    var n = Yr(e, t);
    if (!n) return e + "";
    var r = n[0], i = n[1];
    return i < 0 ? "0." + new Array(-i).join("0") + r : r.length > i + 1 ? r.slice(0, i + 1) + "." + r.slice(i + 1) : r + new Array(i - r.length + 2).join("0");
  }
  const Zs = {
    "%": (e, t) => (e * 100).toFixed(t),
    b: (e) => Math.round(e).toString(2),
    c: (e) => e + "",
    d: Wm,
    e: (e, t) => e.toExponential(t),
    f: (e, t) => e.toFixed(t),
    g: (e, t) => e.toPrecision(t),
    o: (e) => Math.round(e).toString(8),
    p: (e, t) => Ys(e * 100, t),
    r: Ys,
    s: Ym,
    X: (e) => Math.round(e).toString(16).toUpperCase(),
    x: (e) => Math.round(e).toString(16)
  };
  function Js(e) {
    return e;
  }
  var Qs = Array.prototype.map, ea = [
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
    var t = e.grouping === void 0 || e.thousands === void 0 ? Js : qm(Qs.call(e.grouping, Number), e.thousands + ""), n = e.currency === void 0 ? "" : e.currency[0] + "", r = e.currency === void 0 ? "" : e.currency[1] + "", i = e.decimal === void 0 ? "." : e.decimal + "", o = e.numerals === void 0 ? Js : Km(Qs.call(e.numerals, String)), s = e.percent === void 0 ? "%" : e.percent + "", a = e.minus === void 0 ? "\u2212" : e.minus + "", l = e.nan === void 0 ? "NaN" : e.nan + "";
    function u(f, h) {
      f = Zr(f);
      var d = f.fill, g = f.align, _ = f.sign, F = f.symbol, N = f.zero, A = f.width, O = f.comma, y = f.precision, S = f.trim, P = f.type;
      P === "n" ? (O = true, P = "g") : Zs[P] || (y === void 0 && (y = 12), S = true, P = "g"), (N || d === "0" && g === "=") && (N = true, d = "0", g = "=");
      var W = (h && h.prefix !== void 0 ? h.prefix : "") + (F === "$" ? n : F === "#" && /[boxX]/.test(P) ? "0" + P.toLowerCase() : ""), X = (F === "$" ? r : /[%p]/.test(P) ? s : "") + (h && h.suffix !== void 0 ? h.suffix : ""), $ = Zs[P], H = /[defgprs%]/.test(P);
      y = y === void 0 ? 6 : /[gprs]/.test(P) ? Math.max(1, Math.min(21, y)) : Math.max(0, Math.min(20, y));
      function q(w) {
        var G = W, Z = X, fe, L, D;
        if (P === "c") Z = $(w) + Z, w = "";
        else {
          w = +w;
          var z = w < 0 || 1 / w < 0;
          if (w = isNaN(w) ? l : $(Math.abs(w), y), S && (w = Xm(w)), z && +w == 0 && _ !== "+" && (z = false), G = (z ? _ === "(" ? _ : a : _ === "-" || _ === "(" ? "" : _) + G, Z = (P === "s" && !isNaN(w) && Jr !== void 0 ? ea[8 + Jr / 3] : "") + Z + (z && _ === "(" ? ")" : ""), H) {
            for (fe = -1, L = w.length; ++fe < L; ) if (D = w.charCodeAt(fe), 48 > D || D > 57) {
              Z = (D === 46 ? i + w.slice(fe + 1) : w.slice(fe)) + Z, w = w.slice(0, fe);
              break;
            }
          }
        }
        O && !N && (w = t(w, 1 / 0));
        var te = G.length + w.length + Z.length, se = te < A ? new Array(A - te + 1).join(d) : "";
        switch (O && N && (w = t(se + w, se.length ? A - Z.length : 1 / 0), se = ""), g) {
          case "<":
            w = G + w + Z + se;
            break;
          case "=":
            w = G + se + w + Z;
            break;
          case "^":
            w = se.slice(0, te = se.length >> 1) + G + w + Z + se.slice(te);
            break;
          default:
            w = se + G + w + Z;
            break;
        }
        return o(w);
      }
      return q.toString = function() {
        return f + "";
      }, q;
    }
    function c(f, h) {
      var d = Math.max(-8, Math.min(8, Math.floor(yn(h) / 3))) * 3, g = Math.pow(10, -d), _ = u((f = Zr(f), f.type = "f", f), {
        suffix: ea[8 + d / 3]
      });
      return function(F) {
        return _(g * F);
      };
    }
    return {
      format: u,
      formatPrefix: c
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
  function ev(e, t) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(yn(t) / 3))) * 3 - yn(Math.abs(e)));
  }
  function tv(e, t) {
    return e = Math.abs(e), t = Math.abs(t) - e, Math.max(0, yn(t) - yn(e)) + 1;
  }
  function nv(e, t) {
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
  function rv(e) {
    return function() {
      return e;
    };
  }
  function iv(e) {
    return +e;
  }
  var ta = [
    0,
    1
  ];
  function ln(e) {
    return e;
  }
  function co(e, t) {
    return (t -= e = +e) ? function(n) {
      return (n - e) / t;
    } : rv(isNaN(t) ? NaN : 0.5);
  }
  function ov(e, t) {
    var n;
    return e > t && (n = e, e = t, t = n), function(r) {
      return Math.max(e, Math.min(t, r));
    };
  }
  function sv(e, t, n) {
    var r = e[0], i = e[1], o = t[0], s = t[1];
    return i < r ? (r = co(i, r), o = n(s, o)) : (r = co(r, i), o = n(o, s)), function(a) {
      return o(r(a));
    };
  }
  function av(e, t, n) {
    var r = Math.min(e.length, t.length) - 1, i = new Array(r), o = new Array(r), s = -1;
    for (e[r] < e[0] && (e = e.slice().reverse(), t = t.slice().reverse()); ++s < r; ) i[s] = co(e[s], e[s + 1]), o[s] = n(t[s], t[s + 1]);
    return function(a) {
      var l = Ch(e, a, 1, r) - 1;
      return o[l](i[l](a));
    };
  }
  function lv(e, t) {
    return t.domain(e.domain()).range(e.range()).interpolate(e.interpolate()).clamp(e.clamp()).unknown(e.unknown());
  }
  function uv() {
    var e = ta, t = ta, n = zo, r, i, o, s = ln, a, l, u;
    function c() {
      var h = Math.min(e.length, t.length);
      return s !== ln && (s = ov(e[0], e[h - 1])), a = h > 2 ? av : sv, l = u = null, f;
    }
    function f(h) {
      return h == null || isNaN(h = +h) ? o : (l || (l = a(e.map(r), t, n)))(r(s(h)));
    }
    return f.invert = function(h) {
      return s(i((u || (u = a(t, e.map(r), Xe)))(h)));
    }, f.domain = function(h) {
      return arguments.length ? (e = Array.from(h, iv), c()) : e.slice();
    }, f.range = function(h) {
      return arguments.length ? (t = Array.from(h), c()) : t.slice();
    }, f.rangeRound = function(h) {
      return t = Array.from(h), n = oh, c();
    }, f.clamp = function(h) {
      return arguments.length ? (s = h ? true : ln, c()) : s !== ln;
    }, f.interpolate = function(h) {
      return arguments.length ? (n = h, c()) : n;
    }, f.unknown = function(h) {
      return arguments.length ? (o = h, f) : o;
    }, function(h, d) {
      return r = h, i = d, c();
    };
  }
  function cv() {
    return uv()(ln, ln);
  }
  function fv(e, t, n, r) {
    var i = Rh(e, t, n), o;
    switch (r = Zr(r ?? ",f"), r.type) {
      case "s": {
        var s = Math.max(Math.abs(e), Math.abs(t));
        return r.precision == null && !isNaN(o = ev(i, s)) && (r.precision = o), eu(r, s);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        r.precision == null && !isNaN(o = tv(i, Math.max(Math.abs(e), Math.abs(t)))) && (r.precision = o - (r.type === "e"));
        break;
      }
      case "f":
      case "%": {
        r.precision == null && !isNaN(o = Qm(i)) && (r.precision = o - (r.type === "%") * 2);
        break;
      }
    }
    return Ql(r);
  }
  function dv(e) {
    var t = e.domain;
    return e.ticks = function(n) {
      var r = t();
      return Lh(r[0], r[r.length - 1], n ?? 10);
    }, e.tickFormat = function(n, r) {
      var i = t();
      return fv(i[0], i[i.length - 1], n ?? 10, r);
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
  function tu() {
    var e = cv();
    return e.copy = function() {
      return lv(e, tu());
    }, nv.apply(e, arguments), dv(e);
  }
  function Rn(e, t, n) {
    this.k = e, this.x = t, this.y = n;
  }
  Rn.prototype = {
    constructor: Rn,
    scale: function(e) {
      return e === 1 ? this : new Rn(this.k * e, this.x, this.y);
    },
    translate: function(e, t) {
      return e === 0 & t === 0 ? this : new Rn(this.k, this.x + this.k * e, this.y + this.k * t);
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
  Rn.prototype;
  const hv = 30, pv = At({
    __name: "LchPicker",
    props: {
      modelValue: {},
      width: {}
    },
    emits: [
      "update:modelValue"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = me(null), o = n.width ?? 450;
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
        }, o, hv, (c, f) => {
          r("update:modelValue", c);
        });
        u && i.value.appendChild(u);
      }
      Lt(() => {
        s();
      });
      function a(l, u, c, f, h) {
        const d = {
          ...u
        };
        l = l.map(({ name: S, domain: P }) => ({
          name: S,
          domain: P,
          scale: tu().domain(P).range([
            0,
            c
          ])
        }));
        for (const S of l) S.x = Math.round(S.scale(d[S.name]));
        const g = wg("div"), _ = ft("white"), F = ft("black"), N = g.selectAll("div").data(l).join("div"), A = Wl(), O = N.append("canvas").attr("width", c).attr("height", 1).style("max-width", "100%").style("width", `${c}px`).style("height", `${f}px`).each(function() {
          const S = this.getContext("2d"), P = S.createImageData(c, 1);
          A.set(this, {
            context: S,
            image: P,
            data: P.data
          });
        }).each(function(S) {
          y.call(this, S);
        }).on("click", function(S, P) {
          const W = this.getBoundingClientRect(), X = S.clientX - W.left;
          P.x = Math.max(0, Math.min(c - 1, X)), d[P.name] = P.scale.invert(P.x), O.each(function($) {
            y.call(this, $);
          }), h({
            ...d
          }, false, P.name);
        });
        N.each(function(S) {
          Qt(this).select("canvas").call(Rg().subject(function() {
            return {
              x: S.x ?? 0,
              y: 0
            };
          }).on("start", function() {
            h({
              ...d
            }, true, S.name);
          }).on("drag", function(W) {
            S.x = Math.max(1, Math.min(c - 1, W.x)), d[S.name] = S.scale.invert(S.x), O.each(function(X) {
              y.call(this, X);
            }), h({
              ...d
            }, true, S.name);
          }).on("end", function(W) {
            S.x = Math.max(1, Math.min(c - 1, W.x)), d[S.name] = S.scale.invert(S.x), O.each(function(X) {
              y.call(this, X);
            }), h({
              ...d
            }, false, S.name);
          }));
        });
        function y(S) {
          const P = A.get(this), { context: W, image: X, data: $ } = P;
          for (let H = 0, q = -1; H < c; ++H) {
            let w;
            if (H === Math.round(S.x)) w = _;
            else if (H === Math.round(S.x) - 1) w = F;
            else {
              const G = {
                ...d
              };
              G[S.name] = S.scale.invert(H), w = ft(eo(G.l, G.c, G.h));
            }
            $[++q] = w.r, $[++q] = w.g, $[++q] = w.b, $[++q] = 255;
          }
          W.putImageData(X, 0, 0);
        }
        return N.append("svg").attr("width", c).attr("height", 20).attr("viewBox", [
          0,
          0,
          c,
          20
        ]).style("max-width", "100%").style("overflow", "visible").append("g").each(function(S) {
          Qt(this).call(Uh(S.scale).ticks(Math.min(c / 80, 10)));
        }).append("text").attr("x", c).attr("y", 9).attr("dy", ".72em").style("text-anchor", "middle").style("text-transform", "uppercase").attr("fill", "currentColor").text((S) => S.name), g.node();
      }
      return (l, u) => (ue(), he("div", {
        ref_key: "container",
        ref: i
      }, null, 512));
    }
  }), gv = {
    class: "palette-editor"
  }, mv = {
    class: "handles-overlay"
  }, vv = 12, _v = At({
    __name: "PaletteEditor",
    props: {
      colorStops: {}
    },
    emits: [
      "update:colorStops"
    ],
    setup(e, { emit: t }) {
      const n = e, r = t, i = me(null), o = Te(() => new Hr(n.colorStops).generateTexture());
      Bt(o, (h) => {
        if (!i.value || !h) return;
        const d = i.value.getContext("2d");
        if (!d) return;
        d.clearRect(0, 0, 4096, 32);
        const g = document.createElement("canvas");
        g.width = h.width, g.height = h.height, g.getContext("2d").putImageData(h, 0, 0), d.drawImage(g, 0, 0, 4096, 1, 0, 0, 4096, 32);
      }), Lt(() => {
        ai(() => {
          const h = o.value;
          if (!i.value || !h) return;
          const d = i.value.getContext("2d");
          if (!d) return;
          d.clearRect(0, 0, 4096, 32);
          const g = document.createElement("canvas");
          g.width = h.width, g.height = h.height, g.getContext("2d").putImageData(h, 0, 0), d.drawImage(g, 0, 0, 4096, 1, 0, 0, 4096, 32);
        });
      });
      function s(h) {
        var _a2;
        if (n.colorStops.length >= vv) return;
        const d = i.value;
        if (!d) return;
        const g = d.getBoundingClientRect();
        let _ = (h.clientX - g.left) / g.width;
        _ = Math.max(0, Math.min(1, _));
        const F = a.value !== null && ((_a2 = n.colorStops[a.value]) == null ? void 0 : _a2.color) || "#ffffff";
        n.colorStops.push({
          color: F,
          position: _
        }), r("update:colorStops", n.colorStops), a.value = n.colorStops.length - 1;
      }
      const a = me(0);
      function l(h) {
        a.value = h;
      }
      function u(h) {
        const d = ft(h);
        if (!d) return {
          l: 100,
          c: 0,
          h: 0
        };
        const g = eo(d);
        return {
          l: g.l,
          c: g.c,
          h: g.h
        };
      }
      function c(h) {
        const d = eo(h.l, h.c, h.h);
        return ft(d).formatHex();
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
        set(h) {
          a.value !== null && n.colorStops[a.value] && (n.colorStops[a.value] = {
            ...n.colorStops[a.value],
            color: c(h)
          }, r("update:colorStops", n.colorStops));
        }
      });
      return (h, d) => (ue(), he("div", gv, [
        m("div", {
          class: "canvas-row",
          style: {
            position: "relative"
          },
          onDblclick: s
        }, [
          m("canvas", {
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
          m("div", mv, [
            (ue(true), he(Ue, null, Wi(e.colorStops, (g, _) => (ue(), ul(wh, {
              key: "handle-" + _,
              stop: g,
              index: _,
              "onUpdate:position": (F) => e.colorStops[_].position = F,
              onClick: (F) => l(_)
            }, null, 8, [
              "stop",
              "index",
              "onUpdate:position",
              "onClick"
            ]))), 128))
          ])
        ], 32),
        xe(pv, {
          modelValue: f.value,
          "onUpdate:modelValue": d[0] || (d[0] = (g) => f.value = g),
          width: 450
        }, null, 8, [
          "modelValue"
        ])
      ]));
    }
  }), bv = or(_v, [
    [
      "__scopeId",
      "data-v-0e5e7bb6"
    ]
  ]), yv = {
    class: "block bulma-settings-block",
    style: {
      color: "black !important"
    }
  }, xv = {
    class: "tabs is-toggle is-fullwidth is-small"
  }, wv = {
    class: "tab-content"
  }, Sv = {
    key: 0
  }, Mv = {
    class: "mb-3",
    style: {
      "font-family": "monospace",
      "word-break": "break-all",
      "white-space": "pre-line"
    }
  }, Tv = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, kv = {
    style: {
      "font-family": "monospace",
      "min-width": "7.5em",
      display: "inline-block"
    }
  }, Cv = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "0.8em"
    }
  }, Ev = {
    style: {
      "font-family": "monospace",
      "min-width": "5em",
      display: "inline-block"
    }
  }, Av = {
    key: 1
  }, Pv = {
    class: "mb-3"
  }, Lv = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, Rv = {
    style: {
      display: "flex",
      "align-items": "center",
      "min-height": "36px"
    }
  }, zv = [
    "src"
  ], Nv = {
    style: {
      flex: "1 1 auto",
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis"
    }
  }, Iv = {
    class: "dropdown-menu",
    id: "dropdown-menu-presets",
    role: "menu",
    style: {
      width: "100%"
    }
  }, Ov = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, Bv = [
    "onClick"
  ], Fv = [
    "src"
  ], Dv = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.11em"
    }
  }, Uv = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, $v = {
    class: "control is-expanded"
  }, Vv = {
    class: "control"
  }, Gv = [
    "disabled"
  ], Hv = {
    key: 2
  }, Wv = {
    class: "mb-3"
  }, qv = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, Kv = {
    class: "mb-3",
    style: {
      display: "flex",
      "align-items": "center",
      gap: "1em"
    }
  }, jv = {
    class: "mb-3"
  }, Xv = {
    class: "dropdown-trigger",
    style: {
      width: "100%"
    }
  }, Yv = {
    style: {
      display: "flex",
      "align-items": "center",
      "flex-direction": "column",
      gap: "0.5em",
      padding: "0.4em 0"
    }
  }, Zv = [
    "src"
  ], Jv = {
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
  }, Qv = {
    style: {
      flex: "1 1 auto",
      "text-align": "center"
    }
  }, e0 = {
    class: "dropdown-menu",
    id: "dropdown-menu-palettes",
    role: "menu",
    style: {
      width: "100%"
    }
  }, t0 = {
    class: "dropdown-content",
    style: {
      "max-height": "450px",
      "overflow-y": "auto"
    }
  }, n0 = [
    "onClick"
  ], r0 = [
    "src"
  ], i0 = {
    style: {
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "font-size": "1.05em",
      "text-align": "center"
    }
  }, o0 = {
    class: "field is-grouped",
    style: {
      "margin-top": "0.8em"
    }
  }, s0 = {
    class: "control is-expanded"
  }, a0 = {
    class: "control"
  }, l0 = [
    "disabled"
  ], u0 = {
    key: 3
  }, c0 = {
    class: "field"
  }, f0 = {
    class: "control"
  }, d0 = {
    class: "field"
  }, h0 = {
    class: "control"
  }, p0 = {
    class: "field"
  }, g0 = {
    class: "control"
  }, m0 = {
    class: "field"
  }, v0 = {
    class: "checkbox"
  }, _0 = {
    class: "field"
  }, b0 = {
    class: "checkbox"
  }, y0 = {
    class: "field"
  }, x0 = {
    class: "checkbox"
  }, w0 = {
    class: "field"
  }, S0 = {
    class: "checkbox"
  }, M0 = {
    class: "field"
  }, T0 = {
    class: "checkbox"
  }, k0 = {
    class: "field"
  }, C0 = {
    class: "checkbox"
  }, E0 = {
    class: "field"
  }, A0 = {
    class: "checkbox"
  }, P0 = {
    class: "field"
  }, L0 = {
    class: "checkbox"
  }, R0 = {
    class: "field"
  }, z0 = {
    class: "label"
  }, N0 = {
    class: "control"
  }, I0 = {
    class: "field"
  }, O0 = {
    class: "label"
  }, B0 = {
    class: "control"
  }, Bi = "mandelbrot_presets", Fi = "mandelbrot_palettes", F0 = At({
    __name: "Settings",
    props: ko({
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
      const t = e, n = St(e, "modelValue"), r = Te(() => ((n.value.angle * 180 / Math.PI % 360 + 360) % 360).toFixed(2)), i = Te({
        get: () => (n.value.angle * 180 / Math.PI % 360 + 360) % 360,
        set: (U) => {
          n.value.angle = U % 360 * Math.PI / 180;
        }
      }), o = Te({
        get: () => (Math.log10(n.value.palettePeriod || 0.01) + 2) / 5,
        set: (U) => {
          n.value.palettePeriod = Number((10 ** (U * 5 - 2)).toPrecision(6));
        }
      }), s = Te({
        get: () => {
          const U = Number(n.value.scale), b = U > 0 ? -Math.log2(U) : 126;
          return isFinite(b) ? Math.min(Math.max(Math.round(b), 1), 126) : 1;
        },
        set: (U) => {
          const b = Math.min(Math.max(Math.round(U), 1), 126);
          n.value.scale = (2 ** -b).toPrecision(10);
        }
      });
      function a(U, b) {
        const [C, Me] = U.split(".");
        return Me ? C + "." + Me.slice(0, b) : C;
      }
      function l(U) {
        const b = document.createElement("canvas");
        b.width = 320, b.height = 40;
        const C = b.getContext("2d");
        if (!C) return "";
        if (U.length === 0) return C.fillStyle = "#000", C.fillRect(0, 0, b.width, b.height), b.toDataURL("image/png");
        const Ge = new Hr(U).generateTexture(), ze = document.createElement("canvas");
        ze.width = Ge.width, ze.height = 1;
        const gt = ze.getContext("2d");
        return gt ? (gt.putImageData(Ge, 0, 0), C.drawImage(ze, 0, 0, b.width, b.height), b.toDataURL("image/png")) : "";
      }
      const u = me(null), c = me(""), f = me([]), h = me(""), d = me([]), g = me(""), _ = me(false);
      function F() {
        const U = c.value.trim();
        if (U && window.confirm(`Supprimer le preset "${U}" ? Cette action est irr\xE9versible.`)) {
          const b = f.value.findIndex((C) => C.name === U);
          b >= 0 && (f.value.splice(b, 1), localStorage.setItem(Bi, JSON.stringify(f.value)), A.value = "", c.value = "");
        }
      }
      async function N() {
        t.engine && (u.value = await t.engine.getSnapshotPng(256));
      }
      const A = me(""), O = me(false), y = Te(() => f.value.find((U) => U.name === A.value)), S = Te(() => {
        var _a2;
        return (_a2 = y.value) == null ? void 0 : _a2.thumbnail;
      });
      function P(U) {
        Z(U.name), O.value = false;
      }
      async function W() {
        if (!c.value.trim()) return;
        let U, b = (/* @__PURE__ */ new Date()).toISOString();
        try {
          t.engine && (U = await t.engine.getSnapshotPng(256));
        } catch {
        }
        const C = {
          name: c.value.trim(),
          value: n.value,
          thumbnail: U,
          date: b
        }, Me = f.value.findIndex((Ge) => Ge.name === C.name);
        Me >= 0 ? f.value[Me] = C : f.value.push(C), localStorage.setItem(Bi, JSON.stringify(f.value)), c.value = "";
      }
      function X() {
        const U = localStorage.getItem(Bi);
        if (U) try {
          f.value = JSON.parse(U);
        } catch {
        }
      }
      function $() {
        const U = localStorage.getItem(Fi);
        if (U) try {
          d.value = JSON.parse(U);
        } catch {
        }
      }
      async function H() {
        if (!h.value.trim()) return;
        let U, b = (/* @__PURE__ */ new Date()).toISOString();
        try {
          U = l(n.value.colorStops);
        } catch {
        }
        const C = {
          name: h.value.trim(),
          colorStops: structuredClone(re(n.value.colorStops)),
          thumbnail: U,
          date: b
        }, Me = d.value.findIndex((Ge) => Ge.name === C.name);
        Me >= 0 ? d.value[Me] = C : d.value.push(C), localStorage.setItem(Fi, JSON.stringify(d.value)), h.value = "";
      }
      function q(U) {
        const b = d.value.find((C) => C.name === U);
        b && (g.value = U, h.value = b.name, n.value.colorStops = structuredClone(re(b.colorStops)));
      }
      function w(U) {
        q(U.name), _.value = false;
      }
      function G() {
        const U = h.value.trim();
        if (U && window.confirm(`Supprimer la palette "${U}" ? Cette action est irr\xE9versible.`)) {
          const b = d.value.findIndex((C) => C.name === U);
          b >= 0 && (d.value.splice(b, 1), localStorage.setItem(Fi, JSON.stringify(d.value)), g.value = "", h.value = "");
        }
      }
      function Z(U) {
        const b = f.value.find((C) => C.name === U);
        b && (A.value = U, c.value = b.name, n.value = structuredClone(re(b.value)));
      }
      const fe = Te({
        get: () => Math.log10(n.value.mu ?? 1),
        set: (U) => {
          n.value.mu = Math.pow(10, U);
        }
      }), L = Te({
        get: () => Math.log10(n.value.epsilon ?? 1e-8),
        set: (U) => {
          n.value.epsilon = Math.pow(10, U);
        }
      }), D = Te({
        get: () => Math.log10(n.value.maxIterationMultiplier ?? 1),
        set: (U) => {
          n.value.maxIterationMultiplier = Number(Math.pow(10, U).toPrecision(3));
        }
      });
      Lt(() => {
        X(), $();
      });
      const z = me("navigation"), te = Te(() => d.value.find((U) => U.name === g.value)), se = Te(() => {
        var _a2;
        return (_a2 = te.value) == null ? void 0 : _a2.thumbnail;
      });
      return Bt([
        z,
        () => t.engine
      ], async ([U]) => {
        U === "navigation" && await N();
      }, {
        immediate: true
      }), (U, b) => {
        var _a2;
        return ue(), he("div", yv, [
          m("div", xv, [
            m("ul", null, [
              m("li", {
                class: be({
                  "is-active": z.value === "navigation"
                })
              }, [
                m("a", {
                  onClick: b[0] || (b[0] = (C) => z.value = "navigation")
                }, "Navigation")
              ], 2),
              m("li", {
                class: be({
                  "is-active": z.value === "presets"
                })
              }, [
                m("a", {
                  onClick: b[1] || (b[1] = (C) => z.value = "presets")
                }, "Presets")
              ], 2),
              m("li", {
                class: be({
                  "is-active": z.value === "palettes"
                })
              }, [
                m("a", {
                  onClick: b[2] || (b[2] = (C) => z.value = "palettes")
                }, "Palettes")
              ], 2),
              m("li", {
                class: be({
                  "is-active": z.value === "performance"
                })
              }, [
                m("a", {
                  onClick: b[3] || (b[3] = (C) => z.value = "performance")
                }, "Graphics")
              ], 2)
            ])
          ]),
          m("div", wv, [
            z.value === "navigation" ? (ue(), he("div", Sv, [
              m("div", Mv, [
                m("span", null, [
                  b[29] || (b[29] = oe("Cx: ", -1)),
                  m("span", null, ve(a(n.value.cx, 38)), 1)
                ]),
                b[31] || (b[31] = m("br", null, null, -1)),
                m("span", null, [
                  b[30] || (b[30] = oe("Cy: ", -1)),
                  m("span", null, ve(a(n.value.cy, 38)), 1)
                ])
              ]),
              m("div", Tv, [
                m("span", null, [
                  b[32] || (b[32] = oe("\xC9chelle\xA0: ", -1)),
                  m("span", kv, ve(Number(n.value.scale).toExponential(2)), 1)
                ]),
                ye(m("input", {
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
                  "onUpdate:modelValue": b[4] || (b[4] = (C) => s.value = C)
                }, null, 512), [
                  [
                    Ke,
                    s.value,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              m("div", Cv, [
                m("span", null, [
                  b[33] || (b[33] = oe("Angle\xA0: ", -1)),
                  m("span", Ev, ve(r.value) + "\xB0", 1)
                ]),
                ye(m("input", {
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
                  "onUpdate:modelValue": b[5] || (b[5] = (C) => i.value = C)
                }, null, 512), [
                  [
                    Ke,
                    i.value,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ])
            ])) : z.value === "presets" ? (ue(), he("div", Av, [
              m("div", Pv, [
                b[35] || (b[35] = m("label", {
                  class: "label"
                }, "Presets enregistr\xE9s", -1)),
                m("div", {
                  class: be([
                    "dropdown",
                    {
                      "is-active": O.value
                    }
                  ]),
                  style: {
                    width: "100%"
                  }
                }, [
                  m("div", Lv, [
                    m("button", {
                      class: "button is-fullwidth",
                      onClick: b[6] || (b[6] = (C) => O.value = !O.value),
                      "aria-haspopup": "true",
                      "aria-controls": "dropdown-menu-presets",
                      type: "button"
                    }, [
                      m("span", Rv, [
                        S.value ? (ue(), he("img", {
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
                        }, null, 8, zv)) : qt("", true),
                        m("span", Nv, ve(c.value || "Choisir un preset..."), 1),
                        b[34] || (b[34] = m("span", {
                          class: "icon is-small",
                          style: {
                            "margin-left": "5px"
                          }
                        }, [
                          m("i", {
                            class: "fas fa-angle-down",
                            "aria-hidden": "true"
                          })
                        ], -1))
                      ])
                    ])
                  ]),
                  m("div", Iv, [
                    m("div", Ov, [
                      (ue(true), he(Ue, null, Wi(f.value, (C) => (ue(), he("a", {
                        key: C.name,
                        class: be([
                          "dropdown-item",
                          {
                            "is-active": A.value === C.name
                          }
                        ]),
                        onClick: Cs((Me) => P(C), [
                          "prevent"
                        ]),
                        style: {
                          display: "flex",
                          "align-items": "center",
                          gap: "0.75em"
                        }
                      }, [
                        C.thumbnail ? (ue(), he("img", {
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
                        }, null, 8, Fv)) : qt("", true),
                        m("span", Dv, ve(C.name), 1)
                      ], 10, Bv))), 128))
                    ])
                  ])
                ], 2),
                m("div", Uv, [
                  m("div", $v, [
                    ye(m("input", {
                      class: "input",
                      "onUpdate:modelValue": b[7] || (b[7] = (C) => c.value = C),
                      type: "text",
                      placeholder: "Nom...",
                      onFocus: b[8] || (b[8] = (C) => t.suspendShortcuts && t.suspendShortcuts(true)),
                      onBlur: b[9] || (b[9] = (C) => t.suspendShortcuts && t.suspendShortcuts(false))
                    }, null, 544), [
                      [
                        Ke,
                        c.value
                      ]
                    ])
                  ]),
                  m("div", {
                    class: "control"
                  }, [
                    m("button", {
                      class: "button is-link is-small",
                      onClick: W
                    }, "Enregistrer")
                  ]),
                  m("div", Vv, [
                    m("button", {
                      class: "button is-danger is-small",
                      onClick: F,
                      disabled: !c.value
                    }, "Supprimer", 8, Gv)
                  ])
                ])
              ])
            ])) : z.value === "palettes" ? (ue(), he("div", Hv, [
              m("div", Wv, [
                xe(bv, {
                  "color-stops": n.value.colorStops
                }, null, 8, [
                  "color-stops"
                ])
              ]),
              m("div", qv, [
                b[36] || (b[36] = m("label", {
                  style: {
                    "white-space": "nowrap"
                  }
                }, "P\xE9riode :", -1)),
                ye(m("input", {
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
                  "onUpdate:modelValue": b[10] || (b[10] = (C) => o.value = C)
                }, null, 512), [
                  [
                    Ke,
                    o.value,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              m("div", Kv, [
                b[37] || (b[37] = m("label", {
                  style: {
                    "white-space": "nowrap"
                  }
                }, "D\xE9calage :", -1)),
                ye(m("input", {
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
                  "onUpdate:modelValue": b[11] || (b[11] = (C) => n.value.paletteOffset = C)
                }, null, 512), [
                  [
                    Ke,
                    n.value.paletteOffset,
                    void 0,
                    {
                      number: true
                    }
                  ]
                ])
              ]),
              b[40] || (b[40] = m("hr", {
                class: "section-sep"
              }, null, -1)),
              m("div", jv, [
                b[39] || (b[39] = m("label", {
                  class: "label"
                }, "Palettes enregistr\xE9es", -1)),
                m("div", {
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
                  m("div", Xv, [
                    m("button", {
                      class: "button is-fullwidth",
                      onClick: b[12] || (b[12] = (C) => _.value = !_.value),
                      "aria-haspopup": "true",
                      "aria-controls": "dropdown-menu-palettes",
                      type: "button"
                    }, [
                      m("span", Yv, [
                        se.value ? (ue(), he("img", {
                          key: 0,
                          src: se.value,
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
                        }, null, 8, Zv)) : qt("", true),
                        m("span", Jv, [
                          m("span", Qv, ve(h.value || "Choisir une palette..."), 1),
                          b[38] || (b[38] = m("span", {
                            class: "icon is-small"
                          }, [
                            m("i", {
                              class: "fas fa-angle-down",
                              "aria-hidden": "true"
                            })
                          ], -1))
                        ])
                      ])
                    ])
                  ]),
                  m("div", e0, [
                    m("div", t0, [
                      (ue(true), he(Ue, null, Wi(d.value, (C) => (ue(), he("a", {
                        key: C.name,
                        class: be([
                          "dropdown-item",
                          {
                            "is-active": g.value === C.name
                          }
                        ]),
                        onClick: Cs((Me) => w(C), [
                          "prevent"
                        ]),
                        style: {
                          display: "flex",
                          "flex-direction": "column",
                          gap: "0.5em",
                          padding: "0.75em"
                        }
                      }, [
                        C.thumbnail ? (ue(), he("img", {
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
                        }, null, 8, r0)) : qt("", true),
                        m("span", i0, ve(C.name), 1)
                      ], 10, n0))), 128))
                    ])
                  ])
                ], 2),
                m("div", o0, [
                  m("div", s0, [
                    ye(m("input", {
                      class: "input",
                      "onUpdate:modelValue": b[13] || (b[13] = (C) => h.value = C),
                      type: "text",
                      placeholder: "Nom...",
                      onFocus: b[14] || (b[14] = (C) => t.suspendShortcuts && t.suspendShortcuts(true)),
                      onBlur: b[15] || (b[15] = (C) => t.suspendShortcuts && t.suspendShortcuts(false))
                    }, null, 544), [
                      [
                        Ke,
                        h.value
                      ]
                    ])
                  ]),
                  m("div", {
                    class: "control"
                  }, [
                    m("button", {
                      class: "button is-link is-small",
                      onClick: H
                    }, "Enregistrer")
                  ]),
                  m("div", a0, [
                    m("button", {
                      class: "button is-danger is-small",
                      onClick: G,
                      disabled: !h.value
                    }, "Supprimer", 8, l0)
                  ])
                ])
              ])
            ])) : z.value === "performance" ? (ue(), he("div", u0, [
              m("div", c0, [
                b[41] || (b[41] = m("label", {
                  class: "label"
                }, "Mu (log)", -1)),
                m("div", f0, [
                  ye(m("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "0",
                    max: "5",
                    step: "0.01",
                    "onUpdate:modelValue": b[16] || (b[16] = (C) => fe.value = C)
                  }, null, 512), [
                    [
                      Ke,
                      fe.value
                    ]
                  ])
                ]),
                m("span", null, ve((n.value.mu ?? 1).toFixed(1)), 1)
              ]),
              m("div", d0, [
                b[42] || (b[42] = m("label", {
                  class: "label"
                }, "Epsilon (log)", -1)),
                m("div", h0, [
                  ye(m("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "-12",
                    max: "0",
                    step: "0.01",
                    "onUpdate:modelValue": b[17] || (b[17] = (C) => L.value = C)
                  }, null, 512), [
                    [
                      Ke,
                      L.value
                    ]
                  ])
                ]),
                m("span", null, ve((n.value.epsilon ?? 1e-8).toExponential(2)), 1)
              ]),
              m("div", p0, [
                b[43] || (b[43] = m("label", {
                  class: "label"
                }, "Tessellation", -1)),
                m("div", g0, [
                  ye(m("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "0.1",
                    max: "10",
                    step: "0.1",
                    "onUpdate:modelValue": b[18] || (b[18] = (C) => n.value.tessellationLevel = C)
                  }, null, 512), [
                    [
                      Ke,
                      n.value.tessellationLevel,
                      void 0,
                      {
                        number: true
                      }
                    ]
                  ])
                ]),
                m("span", null, ve(n.value.tessellationLevel), 1)
              ]),
              m("div", m0, [
                m("label", v0, [
                  ye(m("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[19] || (b[19] = (C) => n.value.activateWebcam = C)
                  }, null, 512), [
                    [
                      zt,
                      n.value.activateWebcam
                    ]
                  ]),
                  b[44] || (b[44] = oe(" \xA0Activer la webcam ", -1))
                ])
              ]),
              m("div", _0, [
                m("label", b0, [
                  ye(m("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[20] || (b[20] = (C) => n.value.activateTessellation = C)
                  }, null, 512), [
                    [
                      zt,
                      n.value.activateTessellation
                    ]
                  ]),
                  b[45] || (b[45] = oe(" \xA0Tessellation GPU ", -1))
                ])
              ]),
              m("div", y0, [
                m("label", x0, [
                  ye(m("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[21] || (b[21] = (C) => n.value.activateShading = C)
                  }, null, 512), [
                    [
                      zt,
                      n.value.activateShading
                    ]
                  ]),
                  b[46] || (b[46] = oe(" \xA0Shading avanc\xE9 ", -1))
                ])
              ]),
              m("div", w0, [
                m("label", S0, [
                  ye(m("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[22] || (b[22] = (C) => n.value.activateSkybox = C)
                  }, null, 512), [
                    [
                      zt,
                      n.value.activateSkybox
                    ]
                  ]),
                  b[47] || (b[47] = oe(" \xA0Skybox ", -1))
                ])
              ]),
              m("div", M0, [
                m("label", T0, [
                  ye(m("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[23] || (b[23] = (C) => n.value.activatePalette = C)
                  }, null, 512), [
                    [
                      zt,
                      n.value.activatePalette
                    ]
                  ]),
                  b[48] || (b[48] = oe(" \xA0Palette ", -1))
                ])
              ]),
              m("div", k0, [
                m("label", C0, [
                  ye(m("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[24] || (b[24] = (C) => n.value.activateSmoothness = C)
                  }, null, 512), [
                    [
                      zt,
                      n.value.activateSmoothness
                    ]
                  ]),
                  b[49] || (b[49] = oe(" \xA0Smoothness ", -1))
                ])
              ]),
              m("div", E0, [
                m("label", A0, [
                  ye(m("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[25] || (b[25] = (C) => n.value.activateZebra = C)
                  }, null, 512), [
                    [
                      zt,
                      n.value.activateZebra
                    ]
                  ]),
                  b[50] || (b[50] = oe(" \xA0Zebra ", -1))
                ])
              ]),
              m("div", P0, [
                m("label", L0, [
                  ye(m("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": b[26] || (b[26] = (C) => n.value.activateAnimate = C)
                  }, null, 512), [
                    [
                      zt,
                      n.value.activateAnimate
                    ]
                  ]),
                  b[51] || (b[51] = oe(" \xA0Animate ", -1))
                ])
              ]),
              m("div", R0, [
                m("label", z0, "R\xE9solution (DPR \xD7 " + ve(((_a2 = n.value.dprMultiplier) == null ? void 0 : _a2.toFixed(3)) ?? "1.000") + ")", 1),
                m("div", N0, [
                  ye(m("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "0.125",
                    max: "2",
                    step: "0.125",
                    "onUpdate:modelValue": b[27] || (b[27] = (C) => n.value.dprMultiplier = C)
                  }, null, 512), [
                    [
                      Ke,
                      n.value.dprMultiplier,
                      void 0,
                      {
                        number: true
                      }
                    ]
                  ])
                ])
              ]),
              m("div", I0, [
                m("label", O0, "It\xE9rations (\xD7 " + ve((n.value.maxIterationMultiplier ?? 1).toPrecision(3)) + ")", 1),
                m("div", B0, [
                  ye(m("input", {
                    class: "slider is-fullwidth",
                    type: "range",
                    min: "-1",
                    max: "1",
                    step: "0.01",
                    "onUpdate:modelValue": b[28] || (b[28] = (C) => D.value = C)
                  }, null, 512), [
                    [
                      Ke,
                      D.value
                    ]
                  ])
                ])
              ])
            ])) : qt("", true)
          ])
        ]);
      };
    }
  }), D0 = or(F0, [
    [
      "__scopeId",
      "data-v-60dbe098"
    ]
  ]), U0 = {
    style: {
      position: "relative",
      height: "100vh",
      width: "100vw"
    }
  }, $0 = {
    key: 0,
    style: {
      position: "absolute",
      top: "0",
      left: "0",
      "z-index": "10",
      "pointer-events": "auto",
      height: "100vh"
    }
  }, V0 = {
    class: "tag is-black"
  }, G0 = {
    class: "tag is-black"
  }, H0 = {
    class: "tag is-black"
  }, W0 = {
    class: "tag is-black"
  }, q0 = {
    class: "tag is-black"
  }, K0 = {
    class: "tag is-black"
  }, j0 = {
    class: "tag is-black"
  }, X0 = {
    class: "tag is-black"
  }, Y0 = {
    href: "https://github.com/gcollombet/mandelbrot",
    target: "_blank",
    rel: "noopener",
    class: "footer-link",
    "aria-label": "GitHub"
  }, Z0 = {
    class: "github-logo",
    height: "20",
    viewBox: "0 0 16 16",
    width: "20",
    fill: "currentColor",
    style: {
      "vertical-align": "middle",
      "margin-right": "4px"
    }
  }, na = "mandelbrot_last_settings", J0 = At({
    __name: "MandelbrotViewer",
    setup(e) {
      const t = me(null), n = Te(() => {
        var _a2;
        return ((_a2 = t.value) == null ? void 0 : _a2.getEngine()) ?? null;
      }), r = me(false), i = me(false), o = me(true), s = me({
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
      Lt(() => {
        window.addEventListener("keydown", l);
        try {
          const h = localStorage.getItem(na);
          h && Object.assign(s.value, JSON.parse(h));
        } catch {
        }
      }), nr(() => {
        window.removeEventListener("keydown", l);
      }), Bt(s, (h) => {
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
      function u() {
        var _a2;
        const h = window.navigator.language || ((_a2 = window.navigator.languages) == null ? void 0 : _a2[0]) || "en";
        return h.startsWith("fr") || h.startsWith("be") ? "azerty" : "qwerty";
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
      return (h, d) => (ue(), he("div", U0, [
        ye(m("button", {
          class: be([
            "menu-hamburger tag is-light is-medium animate__animated",
            o.value ? "animate__fadeInDown" : ""
          ]),
          "aria-label": "Menu",
          onClick: a
        }, [
          ...d[5] || (d[5] = [
            m("span", {
              class: "hamburger-bar"
            }, null, -1),
            m("span", {
              class: "hamburger-bar"
            }, null, -1),
            m("span", {
              class: "hamburger-bar"
            }, null, -1)
          ])
        ], 2), [
          [
            ki,
            o.value
          ]
        ]),
        xe(yh, {
          ref_key: "mandelbrotCtrlRef",
          ref: t,
          style: {
            width: "100%",
            height: "100%",
            display: "block"
          },
          scale: s.value.scale,
          "onUpdate:scale": d[0] || (d[0] = (g) => s.value.scale = g),
          angle: s.value.angle,
          "onUpdate:angle": d[1] || (d[1] = (g) => s.value.angle = g),
          cx: s.value.cx,
          "onUpdate:cx": d[2] || (d[2] = (g) => s.value.cx = g),
          cy: s.value.cy,
          "onUpdate:cy": d[3] || (d[3] = (g) => s.value.cy = g),
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
        r.value ? (ue(), he("div", $0, [
          xe(D0, {
            modelValue: s.value,
            "onUpdate:modelValue": d[4] || (d[4] = (g) => s.value = g),
            engine: n.value,
            "suspend-shortcuts": (g) => {
              i.value = g;
            }
          }, null, 8, [
            "modelValue",
            "engine",
            "suspend-shortcuts"
          ])
        ])) : qt("", true),
        ye(m("div", {
          class: be([
            "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
            o.value ? "animate__fadeInUp" : ""
          ])
        }, [
          d[6] || (d[6] = oe(" Move\xA0 ", -1)),
          d[7] || (d[7] = m("span", {
            class: "tag is-black"
          }, "Left clic", -1)),
          d[8] || (d[8] = oe("\xA0 ", -1)),
          m("span", V0, ve(f.value.up), 1),
          d[9] || (d[9] = oe("\xA0 ", -1)),
          m("span", G0, ve(f.value.left), 1),
          d[10] || (d[10] = oe("\xA0 ", -1)),
          m("span", H0, ve(f.value.down), 1),
          d[11] || (d[11] = oe("\xA0 ", -1)),
          m("span", W0, ve(f.value.right), 1),
          d[12] || (d[12] = oe("\xA0 |\xA0Rotate\xA0 ", -1)),
          d[13] || (d[13] = m("span", {
            class: "tag is-black"
          }, "Right clic", -1)),
          d[14] || (d[14] = oe("\xA0 ", -1)),
          m("span", q0, ve(f.value.rotateLeft), 1),
          d[15] || (d[15] = oe("\xA0 ", -1)),
          m("span", K0, ve(f.value.rotateRight), 1),
          d[16] || (d[16] = oe("\xA0 |\xA0Zoom\xA0 ", -1)),
          d[17] || (d[17] = m("span", {
            class: "tag is-black"
          }, "Wheel", -1)),
          d[18] || (d[18] = oe("\xA0 ", -1)),
          m("span", j0, ve(f.value.zoomIn), 1),
          d[19] || (d[19] = oe("\xA0 ", -1)),
          m("span", X0, ve(f.value.zoomOut), 1),
          d[20] || (d[20] = oe("\xA0 |\xA0Settings\xA0 ", -1)),
          d[21] || (d[21] = m("span", {
            class: "tag is-black"
          }, "W", -1))
        ], 2), [
          [
            ki,
            o.value
          ]
        ]),
        ye(m("div", {
          class: be([
            "footer-love tag is-light is-medium is-hidden-touch animate__animated",
            o.value ? "animate__fadeInUp" : ""
          ])
        }, [
          d[24] || (d[24] = m("small", null, [
            m("a", {
              href: "https://wgpu.rs/",
              target: "_blank",
              rel: "noopener",
              class: "footer-link",
              "aria-label": "wGPU"
            }, [
              oe(" Made with "),
              m("img", {
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
          d[25] || (d[25] = oe(" \xA0|\xA0 ", -1)),
          m("small", null, [
            m("a", Y0, [
              (ue(), he("svg", Z0, [
                ...d[22] || (d[22] = [
                  m("path", {
                    d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                  }, null, -1)
                ])
              ])),
              d[23] || (d[23] = oe(" GitHub ", -1))
            ])
          ])
        ], 2), [
          [
            ki,
            o.value
          ]
        ])
      ]));
    }
  }), Q0 = or(J0, [
    [
      "__scopeId",
      "data-v-3ecec7a3"
    ]
  ]), e_ = {
    key: 0,
    id: "fullscreen"
  }, t_ = {
    key: 1,
    class: "section is-flex is-flex-direction-column is-align-items-center is-justify-content-center",
    style: {
      height: "100vh"
    }
  }, n_ = {
    class: "box has-text-centered",
    style: {
      "max-width": "400px"
    }
  }, r_ = {
    class: "title is-4 mt-3"
  }, i_ = {
    key: 0
  }, o_ = {
    key: 1
  }, s_ = {
    class: "button is-link mt-4",
    href: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility",
    target: "_blank"
  }, a_ = At({
    __name: "App",
    setup(e) {
      const t = me(false), n = me(true);
      return Lt(() => {
        t.value = typeof navigator < "u" && "gpu" in navigator, typeof navigator < "u" && (n.value = navigator.language.startsWith("fr"));
      }), (r, i) => t.value ? (ue(), he("div", e_, [
        xe(Q0)
      ])) : (ue(), he("div", t_, [
        m("div", n_, [
          i[2] || (i[2] = m("span", {
            class: "icon is-large has-text-danger"
          }, [
            m("i", {
              class: "fas fa-exclamation-triangle fa-2x"
            })
          ], -1)),
          m("h1", r_, ve(n.value ? "WebGPU non support\xE9" : "WebGPU not supported"), 1),
          m("p", null, [
            n.value ? (ue(), he("span", i_, [
              ...i[0] || (i[0] = [
                oe(" Ce navigateur ne supporte pas WebGPU.", -1),
                m("br", null, null, -1),
                oe(" Veuillez utiliser un navigateur compatible WebGPU. ", -1)
              ])
            ])) : (ue(), he("span", o_, [
              ...i[1] || (i[1] = [
                oe(" This browser does not support WebGPU.", -1),
                m("br", null, null, -1),
                oe(" Please use a WebGPU-compatible browser. ", -1)
              ])
            ]))
          ]),
          m("a", s_, ve(n.value ? "Liste des navigateurs compatibles WebGPU" : "List of WebGPU-compatible browsers"), 1)
        ])
      ]));
    }
  });
  "serviceWorker" in navigator && window.addEventListener("load", () => {
    navigator.serviceWorker.register("/mandelbrot/sw.js");
  });
  Rf(a_).mount("#app");
})();
