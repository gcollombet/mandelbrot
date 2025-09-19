var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var require_stdin = __commonJS({
  "<stdin>"(exports, module) {
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
      function Jn(e) {
        const t = /* @__PURE__ */ Object.create(null);
        for (const n of e.split(",")) t[n] = 1;
        return (n) => n in t;
      }
      const $ = {}, gt = [], De = () => {
      }, as = () => false, pn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Qn = (e) => e.startsWith("onUpdate:"), oe = Object.assign, Zn = (e, t) => {
        const n = e.indexOf(t);
        n > -1 && e.splice(n, 1);
      }, cs = Object.prototype.hasOwnProperty, V = (e, t) => cs.call(e, t), A = Array.isArray, _t = (e) => gn(e) === "[object Map]", ei = (e) => gn(e) === "[object Set]", I = (e) => typeof e == "function", te = (e) => typeof e == "string", nt = (e) => typeof e == "symbol", Q = (e) => e !== null && typeof e == "object", ti = (e) => (Q(e) || I(e)) && I(e.then) && I(e.catch), ni = Object.prototype.toString, gn = (e) => ni.call(e), fs = (e) => gn(e).slice(8, -1), ri = (e) => gn(e) === "[object Object]", er = (e) => te(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Ot = Jn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), _n = (e) => {
        const t = /* @__PURE__ */ Object.create(null);
        return (n) => t[n] || (t[n] = e(n));
      }, us = /-(\w)/g, et = _n((e) => e.replace(us, (t, n) => n ? n.toUpperCase() : "")), ds = /\B([A-Z])/g, ft = _n((e) => e.replace(ds, "-$1").toLowerCase()), ii = _n((e) => e.charAt(0).toUpperCase() + e.slice(1)), Sn = _n((e) => e ? `on${ii(e)}` : ""), Ze = (e, t) => !Object.is(e, t), Tn = (e, ...t) => {
        for (let n = 0; n < e.length; n++) e[n](...t);
      }, Ln = (e, t, n, r = false) => {
        Object.defineProperty(e, t, {
          configurable: true,
          enumerable: false,
          writable: r,
          value: n
        });
      }, hs = (e) => {
        const t = parseFloat(e);
        return isNaN(t) ? e : t;
      };
      let wr;
      const bn = () => wr || (wr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
      function tr(e) {
        if (A(e)) {
          const t = {};
          for (let n = 0; n < e.length; n++) {
            const r = e[n], i = te(r) ? bs(r) : tr(r);
            if (i) for (const s in i) t[s] = i[s];
          }
          return t;
        } else if (te(e) || Q(e)) return e;
      }
      const ps = /;(?![^(]*\))/g, gs = /:([^]+)/, _s = /\/\*[^]*?\*\//g;
      function bs(e) {
        const t = {};
        return e.replace(_s, "").split(ps).forEach((n) => {
          if (n) {
            const r = n.split(gs);
            r.length > 1 && (t[r[0].trim()] = r[1].trim());
          }
        }), t;
      }
      function bt(e) {
        let t = "";
        if (te(e)) t = e;
        else if (A(e)) for (let n = 0; n < e.length; n++) {
          const r = bt(e[n]);
          r && (t += r + " ");
        }
        else if (Q(e)) for (const n in e) e[n] && (t += n + " ");
        return t.trim();
      }
      const ms = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", vs = Jn(ms);
      function si(e) {
        return !!e || e === "";
      }
      const oi = (e) => !!(e && e.__v_isRef === true), Ve = (e) => te(e) ? e : e == null ? "" : A(e) || Q(e) && (e.toString === ni || !I(e.toString)) ? oi(e) ? Ve(e.value) : JSON.stringify(e, li, 2) : String(e), li = (e, t) => oi(t) ? li(e, t.value) : _t(t) ? {
        [`Map(${t.size})`]: [
          ...t.entries()
        ].reduce((n, [r, i], s) => (n[Cn(r, s) + " =>"] = i, n), {})
      } : ei(t) ? {
        [`Set(${t.size})`]: [
          ...t.values()
        ].map((n) => Cn(n))
      } : nt(t) ? Cn(t) : Q(t) && !A(t) && !ri(t) ? String(t) : t, Cn = (e, t = "") => {
        var n;
        return nt(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
      };
      let _e;
      class ys {
        constructor(t = false) {
          this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.parent = _e, !t && _e && (this.index = (_e.scopes || (_e.scopes = [])).push(this) - 1);
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
            const n = _e;
            try {
              return _e = this, t();
            } finally {
              _e = n;
            }
          }
        }
        on() {
          ++this._on === 1 && (this.prevScope = _e, _e = this);
        }
        off() {
          this._on > 0 && --this._on === 0 && (_e = this.prevScope, this.prevScope = void 0);
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
      function xs() {
        return _e;
      }
      let Y;
      const Rn = /* @__PURE__ */ new WeakSet();
      class ai {
        constructor(t) {
          this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, _e && _e.active && _e.effects.push(this);
        }
        pause() {
          this.flags |= 64;
        }
        resume() {
          this.flags & 64 && (this.flags &= -65, Rn.has(this) && (Rn.delete(this), this.trigger()));
        }
        notify() {
          this.flags & 2 && !(this.flags & 32) || this.flags & 8 || fi(this);
        }
        run() {
          if (!(this.flags & 1)) return this.fn();
          this.flags |= 2, Sr(this), ui(this);
          const t = Y, n = Te;
          Y = this, Te = true;
          try {
            return this.fn();
          } finally {
            di(this), Y = t, Te = n, this.flags &= -3;
          }
        }
        stop() {
          if (this.flags & 1) {
            for (let t = this.deps; t; t = t.nextDep) ir(t);
            this.deps = this.depsTail = void 0, Sr(this), this.onStop && this.onStop(), this.flags &= -2;
          }
        }
        trigger() {
          this.flags & 64 ? Rn.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
        }
        runIfDirty() {
          zn(this) && this.run();
        }
        get dirty() {
          return zn(this);
        }
      }
      let ci = 0, At, It;
      function fi(e, t = false) {
        if (e.flags |= 8, t) {
          e.next = It, It = e;
          return;
        }
        e.next = At, At = e;
      }
      function nr() {
        ci++;
      }
      function rr() {
        if (--ci > 0) return;
        if (It) {
          let t = It;
          for (It = void 0; t; ) {
            const n = t.next;
            t.next = void 0, t.flags &= -9, t = n;
          }
        }
        let e;
        for (; At; ) {
          let t = At;
          for (At = void 0; t; ) {
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
      function ui(e) {
        for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
      }
      function di(e) {
        let t, n = e.depsTail, r = n;
        for (; r; ) {
          const i = r.prevDep;
          r.version === -1 ? (r === n && (n = i), ir(r), ws(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = i;
        }
        e.deps = t, e.depsTail = n;
      }
      function zn(e) {
        for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (hi(t.dep.computed) || t.dep.version !== t.version)) return true;
        return !!e._dirty;
      }
      function hi(e) {
        if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Nt) || (e.globalVersion = Nt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !zn(e)))) return;
        e.flags |= 2;
        const t = e.dep, n = Y, r = Te;
        Y = e, Te = true;
        try {
          ui(e);
          const i = e.fn(e._value);
          (t.version === 0 || Ze(i, e._value)) && (e.flags |= 128, e._value = i, t.version++);
        } catch (i) {
          throw t.version++, i;
        } finally {
          Y = n, Te = r, di(e), e.flags &= -3;
        }
      }
      function ir(e, t = false) {
        const { dep: n, prevSub: r, nextSub: i } = e;
        if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
          n.computed.flags &= -5;
          for (let s = n.computed.deps; s; s = s.nextDep) ir(s, true);
        }
        !t && !--n.sc && n.map && n.map.delete(n.key);
      }
      function ws(e) {
        const { prevDep: t, nextDep: n } = e;
        t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
      }
      let Te = true;
      const pi = [];
      function Ke() {
        pi.push(Te), Te = false;
      }
      function qe() {
        const e = pi.pop();
        Te = e === void 0 ? true : e;
      }
      function Sr(e) {
        const { cleanup: t } = e;
        if (e.cleanup = void 0, t) {
          const n = Y;
          Y = void 0;
          try {
            t();
          } finally {
            Y = n;
          }
        }
      }
      let Nt = 0;
      class Ss {
        constructor(t, n) {
          this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
        }
      }
      class sr {
        constructor(t) {
          this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
        }
        track(t) {
          if (!Y || !Te || Y === this.computed) return;
          let n = this.activeLink;
          if (n === void 0 || n.sub !== Y) n = this.activeLink = new Ss(Y, this), Y.deps ? (n.prevDep = Y.depsTail, Y.depsTail.nextDep = n, Y.depsTail = n) : Y.deps = Y.depsTail = n, gi(n);
          else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
            const r = n.nextDep;
            r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = Y.depsTail, n.nextDep = void 0, Y.depsTail.nextDep = n, Y.depsTail = n, Y.deps === n && (Y.deps = r);
          }
          return n;
        }
        trigger(t) {
          this.version++, Nt++, this.notify(t);
        }
        notify(t) {
          nr();
          try {
            for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
          } finally {
            rr();
          }
        }
      }
      function gi(e) {
        if (e.dep.sc++, e.sub.flags & 4) {
          const t = e.dep.computed;
          if (t && !e.dep.subs) {
            t.flags |= 20;
            for (let r = t.deps; r; r = r.nextDep) gi(r);
          }
          const n = e.dep.subs;
          n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
        }
      }
      const Nn = /* @__PURE__ */ new WeakMap(), at = Symbol(""), Vn = Symbol(""), Vt = Symbol("");
      function ie(e, t, n) {
        if (Te && Y) {
          let r = Nn.get(e);
          r || Nn.set(e, r = /* @__PURE__ */ new Map());
          let i = r.get(n);
          i || (r.set(n, i = new sr()), i.map = r, i.key = n), i.track();
        }
      }
      function We(e, t, n, r, i, s) {
        const o = Nn.get(e);
        if (!o) {
          Nt++;
          return;
        }
        const a = (f) => {
          f && f.trigger();
        };
        if (nr(), t === "clear") o.forEach(a);
        else {
          const f = A(e), h = f && er(n);
          if (f && n === "length") {
            const u = Number(r);
            o.forEach((p, T) => {
              (T === "length" || T === Vt || !nt(T) && T >= u) && a(p);
            });
          } else switch ((n !== void 0 || o.has(void 0)) && a(o.get(n)), h && a(o.get(Vt)), t) {
            case "add":
              f ? h && a(o.get("length")) : (a(o.get(at)), _t(e) && a(o.get(Vn)));
              break;
            case "delete":
              f || (a(o.get(at)), _t(e) && a(o.get(Vn)));
              break;
            case "set":
              _t(e) && a(o.get(at));
              break;
          }
        }
        rr();
      }
      function dt(e) {
        const t = N(e);
        return t === e ? t : (ie(t, "iterate", Vt), Ce(e) ? t : t.map(ue));
      }
      function or(e) {
        return ie(e = N(e), "iterate", Vt), e;
      }
      const Ts = {
        __proto__: null,
        [Symbol.iterator]() {
          return En(this, Symbol.iterator, ue);
        },
        concat(...e) {
          return dt(this).concat(...e.map((t) => A(t) ? dt(t) : t));
        },
        entries() {
          return En(this, "entries", (e) => (e[1] = ue(e[1]), e));
        },
        every(e, t) {
          return Ne(this, "every", e, t, void 0, arguments);
        },
        filter(e, t) {
          return Ne(this, "filter", e, t, (n) => n.map(ue), arguments);
        },
        find(e, t) {
          return Ne(this, "find", e, t, ue, arguments);
        },
        findIndex(e, t) {
          return Ne(this, "findIndex", e, t, void 0, arguments);
        },
        findLast(e, t) {
          return Ne(this, "findLast", e, t, ue, arguments);
        },
        findLastIndex(e, t) {
          return Ne(this, "findLastIndex", e, t, void 0, arguments);
        },
        forEach(e, t) {
          return Ne(this, "forEach", e, t, void 0, arguments);
        },
        includes(...e) {
          return Pn(this, "includes", e);
        },
        indexOf(...e) {
          return Pn(this, "indexOf", e);
        },
        join(e) {
          return dt(this).join(e);
        },
        lastIndexOf(...e) {
          return Pn(this, "lastIndexOf", e);
        },
        map(e, t) {
          return Ne(this, "map", e, t, void 0, arguments);
        },
        pop() {
          return Ct(this, "pop");
        },
        push(...e) {
          return Ct(this, "push", e);
        },
        reduce(e, ...t) {
          return Tr(this, "reduce", e, t);
        },
        reduceRight(e, ...t) {
          return Tr(this, "reduceRight", e, t);
        },
        shift() {
          return Ct(this, "shift");
        },
        some(e, t) {
          return Ne(this, "some", e, t, void 0, arguments);
        },
        splice(...e) {
          return Ct(this, "splice", e);
        },
        toReversed() {
          return dt(this).toReversed();
        },
        toSorted(e) {
          return dt(this).toSorted(e);
        },
        toSpliced(...e) {
          return dt(this).toSpliced(...e);
        },
        unshift(...e) {
          return Ct(this, "unshift", e);
        },
        values() {
          return En(this, "values", ue);
        }
      };
      function En(e, t, n) {
        const r = or(e), i = r[t]();
        return r !== e && !Ce(e) && (i._next = i.next, i.next = () => {
          const s = i._next();
          return s.value && (s.value = n(s.value)), s;
        }), i;
      }
      const Cs = Array.prototype;
      function Ne(e, t, n, r, i, s) {
        const o = or(e), a = o !== e && !Ce(e), f = o[t];
        if (f !== Cs[t]) {
          const p = f.apply(e, s);
          return a ? ue(p) : p;
        }
        let h = n;
        o !== e && (a ? h = function(p, T) {
          return n.call(this, ue(p), T, e);
        } : n.length > 2 && (h = function(p, T) {
          return n.call(this, p, T, e);
        }));
        const u = f.call(o, h, r);
        return a && i ? i(u) : u;
      }
      function Tr(e, t, n, r) {
        const i = or(e);
        let s = n;
        return i !== e && (Ce(e) ? n.length > 3 && (s = function(o, a, f) {
          return n.call(this, o, a, f, e);
        }) : s = function(o, a, f) {
          return n.call(this, o, ue(a), f, e);
        }), i[t](s, ...r);
      }
      function Pn(e, t, n) {
        const r = N(e);
        ie(r, "iterate", Vt);
        const i = r[t](...n);
        return (i === -1 || i === false) && fr(n[0]) ? (n[0] = N(n[0]), r[t](...n)) : i;
      }
      function Ct(e, t, n = []) {
        Ke(), nr();
        const r = N(e)[t].apply(e, n);
        return rr(), qe(), r;
      }
      const Rs = Jn("__proto__,__v_isRef,__isVue"), _i = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(nt));
      function Es(e) {
        nt(e) || (e = String(e));
        const t = N(this);
        return ie(t, "has", e), t.hasOwnProperty(e);
      }
      class bi {
        constructor(t = false, n = false) {
          this._isReadonly = t, this._isShallow = n;
        }
        get(t, n, r) {
          if (n === "__v_skip") return t.__v_skip;
          const i = this._isReadonly, s = this._isShallow;
          if (n === "__v_isReactive") return !i;
          if (n === "__v_isReadonly") return i;
          if (n === "__v_isShallow") return s;
          if (n === "__v_raw") return r === (i ? s ? Bs : xi : s ? yi : vi).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
          const o = A(t);
          if (!i) {
            let f;
            if (o && (f = Ts[n])) return f;
            if (n === "hasOwnProperty") return Es;
          }
          const a = Reflect.get(t, n, se(t) ? t : r);
          return (nt(n) ? _i.has(n) : Rs(n)) || (i || ie(t, "get", n), s) ? a : se(a) ? o && er(n) ? a : a.value : Q(a) ? i ? wi(a) : ar(a) : a;
        }
      }
      class mi extends bi {
        constructor(t = false) {
          super(false, t);
        }
        set(t, n, r, i) {
          let s = t[n];
          if (!this._isShallow) {
            const f = ct(s);
            if (!Ce(r) && !ct(r) && (s = N(s), r = N(r)), !A(t) && se(s) && !se(r)) return f ? false : (s.value = r, true);
          }
          const o = A(t) && er(n) ? Number(n) < t.length : V(t, n), a = Reflect.set(t, n, r, se(t) ? t : i);
          return t === N(i) && (o ? Ze(r, s) && We(t, "set", n, r) : We(t, "add", n, r)), a;
        }
        deleteProperty(t, n) {
          const r = V(t, n);
          t[n];
          const i = Reflect.deleteProperty(t, n);
          return i && r && We(t, "delete", n, void 0), i;
        }
        has(t, n) {
          const r = Reflect.has(t, n);
          return (!nt(n) || !_i.has(n)) && ie(t, "has", n), r;
        }
        ownKeys(t) {
          return ie(t, "iterate", A(t) ? "length" : at), Reflect.ownKeys(t);
        }
      }
      class Ps extends bi {
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
      const Ms = new mi(), Os = new Ps(), As = new mi(true);
      const Gn = (e) => e, Yt = (e) => Reflect.getPrototypeOf(e);
      function Is(e, t, n) {
        return function(...r) {
          const i = this.__v_raw, s = N(i), o = _t(s), a = e === "entries" || e === Symbol.iterator && o, f = e === "keys" && o, h = i[e](...r), u = n ? Gn : t ? Hn : ue;
          return !t && ie(s, "iterate", f ? Vn : at), {
            next() {
              const { value: p, done: T } = h.next();
              return T ? {
                value: p,
                done: T
              } : {
                value: a ? [
                  u(p[0]),
                  u(p[1])
                ] : u(p),
                done: T
              };
            },
            [Symbol.iterator]() {
              return this;
            }
          };
        };
      }
      function Xt(e) {
        return function(...t) {
          return e === "delete" ? false : e === "clear" ? void 0 : this;
        };
      }
      function Fs(e, t) {
        const n = {
          get(i) {
            const s = this.__v_raw, o = N(s), a = N(i);
            e || (Ze(i, a) && ie(o, "get", i), ie(o, "get", a));
            const { has: f } = Yt(o), h = t ? Gn : e ? Hn : ue;
            if (f.call(o, i)) return h(s.get(i));
            if (f.call(o, a)) return h(s.get(a));
            s !== o && s.get(i);
          },
          get size() {
            const i = this.__v_raw;
            return !e && ie(N(i), "iterate", at), Reflect.get(i, "size", i);
          },
          has(i) {
            const s = this.__v_raw, o = N(s), a = N(i);
            return e || (Ze(i, a) && ie(o, "has", i), ie(o, "has", a)), i === a ? s.has(i) : s.has(i) || s.has(a);
          },
          forEach(i, s) {
            const o = this, a = o.__v_raw, f = N(a), h = t ? Gn : e ? Hn : ue;
            return !e && ie(f, "iterate", at), a.forEach((u, p) => i.call(s, h(u), h(p), o));
          }
        };
        return oe(n, e ? {
          add: Xt("add"),
          set: Xt("set"),
          delete: Xt("delete"),
          clear: Xt("clear")
        } : {
          add(i) {
            !t && !Ce(i) && !ct(i) && (i = N(i));
            const s = N(this);
            return Yt(s).has.call(s, i) || (s.add(i), We(s, "add", i, i)), this;
          },
          set(i, s) {
            !t && !Ce(s) && !ct(s) && (s = N(s));
            const o = N(this), { has: a, get: f } = Yt(o);
            let h = a.call(o, i);
            h || (i = N(i), h = a.call(o, i));
            const u = f.call(o, i);
            return o.set(i, s), h ? Ze(s, u) && We(o, "set", i, s) : We(o, "add", i, s), this;
          },
          delete(i) {
            const s = N(this), { has: o, get: a } = Yt(s);
            let f = o.call(s, i);
            f || (i = N(i), f = o.call(s, i)), a && a.call(s, i);
            const h = s.delete(i);
            return f && We(s, "delete", i, void 0), h;
          },
          clear() {
            const i = N(this), s = i.size !== 0, o = i.clear();
            return s && We(i, "clear", void 0, void 0), o;
          }
        }), [
          "keys",
          "values",
          "entries",
          Symbol.iterator
        ].forEach((i) => {
          n[i] = Is(i, e, t);
        }), n;
      }
      function lr(e, t) {
        const n = Fs(e, t);
        return (r, i, s) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? r : Reflect.get(V(n, i) && i in r ? n : r, i, s);
      }
      const Us = {
        get: lr(false, false)
      }, Ds = {
        get: lr(false, true)
      }, js = {
        get: lr(true, false)
      };
      const vi = /* @__PURE__ */ new WeakMap(), yi = /* @__PURE__ */ new WeakMap(), xi = /* @__PURE__ */ new WeakMap(), Bs = /* @__PURE__ */ new WeakMap();
      function Ls(e) {
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
      function zs(e) {
        return e.__v_skip || !Object.isExtensible(e) ? 0 : Ls(fs(e));
      }
      function ar(e) {
        return ct(e) ? e : cr(e, false, Ms, Us, vi);
      }
      function Ns(e) {
        return cr(e, false, As, Ds, yi);
      }
      function wi(e) {
        return cr(e, true, Os, js, xi);
      }
      function cr(e, t, n, r, i) {
        if (!Q(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
        const s = zs(e);
        if (s === 0) return e;
        const o = i.get(e);
        if (o) return o;
        const a = new Proxy(e, s === 2 ? r : n);
        return i.set(e, a), a;
      }
      function Ft(e) {
        return ct(e) ? Ft(e.__v_raw) : !!(e && e.__v_isReactive);
      }
      function ct(e) {
        return !!(e && e.__v_isReadonly);
      }
      function Ce(e) {
        return !!(e && e.__v_isShallow);
      }
      function fr(e) {
        return e ? !!e.__v_raw : false;
      }
      function N(e) {
        const t = e && e.__v_raw;
        return t ? N(t) : e;
      }
      function Vs(e) {
        return !V(e, "__v_skip") && Object.isExtensible(e) && Ln(e, "__v_skip", true), e;
      }
      const ue = (e) => Q(e) ? ar(e) : e, Hn = (e) => Q(e) ? wi(e) : e;
      function se(e) {
        return e ? e.__v_isRef === true : false;
      }
      function Pt(e) {
        return Gs(e, false);
      }
      function Gs(e, t) {
        return se(e) ? e : new Hs(e, t);
      }
      class Hs {
        constructor(t, n) {
          this.dep = new sr(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : N(t), this._value = n ? t : ue(t), this.__v_isShallow = n;
        }
        get value() {
          return this.dep.track(), this._value;
        }
        set value(t) {
          const n = this._rawValue, r = this.__v_isShallow || Ce(t) || ct(t);
          t = r ? t : N(t), Ze(t, n) && (this._rawValue = t, this._value = r ? t : ue(t), this.dep.trigger());
        }
      }
      function Ws(e) {
        return se(e) ? e.value : e;
      }
      const $s = {
        get: (e, t, n) => t === "__v_raw" ? e : Ws(Reflect.get(e, t, n)),
        set: (e, t, n, r) => {
          const i = e[t];
          return se(i) && !se(n) ? (i.value = n, true) : Reflect.set(e, t, n, r);
        }
      };
      function Si(e) {
        return Ft(e) ? e : new Proxy(e, $s);
      }
      class Ks {
        constructor(t, n, r) {
          this.fn = t, this.setter = n, this._value = void 0, this.dep = new sr(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Nt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
        }
        notify() {
          if (this.flags |= 16, !(this.flags & 8) && Y !== this) return fi(this, true), true;
        }
        get value() {
          const t = this.dep.track();
          return hi(this), t && (t.version = this.dep.version), this._value;
        }
        set value(t) {
          this.setter && this.setter(t);
        }
      }
      function qs(e, t, n = false) {
        let r, i;
        return I(e) ? r = e : (r = e.get, i = e.set), new Ks(r, i, n);
      }
      const kt = {}, an = /* @__PURE__ */ new WeakMap();
      let lt;
      function Ys(e, t = false, n = lt) {
        if (n) {
          let r = an.get(n);
          r || an.set(n, r = []), r.push(e);
        }
      }
      function Xs(e, t, n = $) {
        const { immediate: r, deep: i, once: s, scheduler: o, augmentJob: a, call: f } = n, h = (M) => i ? M : Ce(M) || i === false || i === 0 ? $e(M, 1) : $e(M);
        let u, p, T, C, j = false, D = false;
        if (se(e) ? (p = () => e.value, j = Ce(e)) : Ft(e) ? (p = () => h(e), j = true) : A(e) ? (D = true, j = e.some((M) => Ft(M) || Ce(M)), p = () => e.map((M) => {
          if (se(M)) return M.value;
          if (Ft(M)) return h(M);
          if (I(M)) return f ? f(M, 2) : M();
        })) : I(e) ? t ? p = f ? () => f(e, 2) : e : p = () => {
          if (T) {
            Ke();
            try {
              T();
            } finally {
              qe();
            }
          }
          const M = lt;
          lt = u;
          try {
            return f ? f(e, 3, [
              C
            ]) : e(C);
          } finally {
            lt = M;
          }
        } : p = De, t && i) {
          const M = p, Z = i === true ? 1 / 0 : i;
          p = () => $e(M(), Z);
        }
        const ee = xs(), z = () => {
          u.stop(), ee && ee.active && Zn(ee.effects, u);
        };
        if (s && t) {
          const M = t;
          t = (...Z) => {
            M(...Z), z();
          };
        }
        let K = D ? new Array(e.length).fill(kt) : kt;
        const k = (M) => {
          if (!(!(u.flags & 1) || !u.dirty && !M)) if (t) {
            const Z = u.run();
            if (i || j || (D ? Z.some((Ee, we) => Ze(Ee, K[we])) : Ze(Z, K))) {
              T && T();
              const Ee = lt;
              lt = u;
              try {
                const we = [
                  Z,
                  K === kt ? void 0 : D && K[0] === kt ? [] : K,
                  C
                ];
                K = Z, f ? f(t, 3, we) : t(...we);
              } finally {
                lt = Ee;
              }
            }
          } else u.run();
        };
        return a && a(k), u = new ai(p), u.scheduler = o ? () => o(k, false) : k, C = (M) => Ys(M, false, u), T = u.onStop = () => {
          const M = an.get(u);
          if (M) {
            if (f) f(M, 4);
            else for (const Z of M) Z();
            an.delete(u);
          }
        }, t ? r ? k(true) : K = u.run() : o ? o(k.bind(null, true), true) : u.run(), z.pause = u.pause.bind(u), z.resume = u.resume.bind(u), z.stop = z, z;
      }
      function $e(e, t = 1 / 0, n) {
        if (t <= 0 || !Q(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
        if (n.add(e), t--, se(e)) $e(e.value, t, n);
        else if (A(e)) for (let r = 0; r < e.length; r++) $e(e[r], t, n);
        else if (ei(e) || _t(e)) e.forEach((r) => {
          $e(r, t, n);
        });
        else if (ri(e)) {
          for (const r in e) $e(e[r], t, n);
          for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && $e(e[r], t, n);
        }
        return e;
      }
      function $t(e, t, n, r) {
        try {
          return r ? e(...r) : e();
        } catch (i) {
          mn(i, t, n);
        }
      }
      function je(e, t, n, r) {
        if (I(e)) {
          const i = $t(e, t, n, r);
          return i && ti(i) && i.catch((s) => {
            mn(s, t, n);
          }), i;
        }
        if (A(e)) {
          const i = [];
          for (let s = 0; s < e.length; s++) i.push(je(e[s], t, n, r));
          return i;
        }
      }
      function mn(e, t, n, r = true) {
        const i = t ? t.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: o } = t && t.appContext.config || $;
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
            Ke(), $t(s, null, 10, [
              e,
              f,
              h
            ]), qe();
            return;
          }
        }
        ks(e, n, i, r, o);
      }
      function ks(e, t, n, r = true, i = false) {
        if (i) throw e;
        console.error(e);
      }
      const de = [];
      let Fe = -1;
      const mt = [];
      let Je = null, pt = 0;
      const Ti = Promise.resolve();
      let cn = null;
      function Wn(e) {
        const t = cn || Ti;
        return e ? t.then(this ? e.bind(this) : e) : t;
      }
      function Js(e) {
        let t = Fe + 1, n = de.length;
        for (; t < n; ) {
          const r = t + n >>> 1, i = de[r], s = Gt(i);
          s < e || s === e && i.flags & 2 ? t = r + 1 : n = r;
        }
        return t;
      }
      function ur(e) {
        if (!(e.flags & 1)) {
          const t = Gt(e), n = de[de.length - 1];
          !n || !(e.flags & 2) && t >= Gt(n) ? de.push(e) : de.splice(Js(t), 0, e), e.flags |= 1, Ci();
        }
      }
      function Ci() {
        cn || (cn = Ti.then(Ei));
      }
      function Qs(e) {
        A(e) ? mt.push(...e) : Je && e.id === -1 ? Je.splice(pt + 1, 0, e) : e.flags & 1 || (mt.push(e), e.flags |= 1), Ci();
      }
      function Cr(e, t, n = Fe + 1) {
        for (; n < de.length; n++) {
          const r = de[n];
          if (r && r.flags & 2) {
            if (e && r.id !== e.uid) continue;
            de.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
          }
        }
      }
      function Ri(e) {
        if (mt.length) {
          const t = [
            ...new Set(mt)
          ].sort((n, r) => Gt(n) - Gt(r));
          if (mt.length = 0, Je) {
            Je.push(...t);
            return;
          }
          for (Je = t, pt = 0; pt < Je.length; pt++) {
            const n = Je[pt];
            n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
          }
          Je = null, pt = 0;
        }
      }
      const Gt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
      function Ei(e) {
        try {
          for (Fe = 0; Fe < de.length; Fe++) {
            const t = de[Fe];
            t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), $t(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
          }
        } finally {
          for (; Fe < de.length; Fe++) {
            const t = de[Fe];
            t && (t.flags &= -2);
          }
          Fe = -1, de.length = 0, Ri(), cn = null, (de.length || mt.length) && Ei();
        }
      }
      let Se = null, Pi = null;
      function fn(e) {
        const t = Se;
        return Se = e, Pi = e && e.type.__scopeId || null, t;
      }
      function Zs(e, t = Se, n) {
        if (!t || e._n) return e;
        const r = (...i) => {
          r._d && Ur(-1);
          const s = fn(t);
          let o;
          try {
            o = e(...i);
          } finally {
            fn(s), r._d && Ur(1);
          }
          return o;
        };
        return r._n = true, r._c = true, r._d = true, r;
      }
      function Mn(e, t) {
        if (Se === null) return e;
        const n = wn(Se), r = e.dirs || (e.dirs = []);
        for (let i = 0; i < t.length; i++) {
          let [s, o, a, f = $] = t[i];
          s && (I(s) && (s = {
            mounted: s,
            updated: s
          }), s.deep && $e(o), r.push({
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
      function st(e, t, n, r) {
        const i = e.dirs, s = t && t.dirs;
        for (let o = 0; o < i.length; o++) {
          const a = i[o];
          s && (a.oldValue = s[o].value);
          let f = a.dir[r];
          f && (Ke(), je(f, n, 8, [
            e.el,
            a,
            e,
            t
          ]), qe());
        }
      }
      const eo = Symbol("_vte"), to = (e) => e.__isTeleport;
      function dr(e, t) {
        e.shapeFlag & 6 && e.component ? (e.transition = t, dr(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
      }
      function Mi(e, t) {
        return I(e) ? oe({
          name: e.name
        }, t, {
          setup: e
        }) : e;
      }
      function Oi(e) {
        e.ids = [
          e.ids[0] + e.ids[2]++ + "-",
          0,
          0
        ];
      }
      function Ut(e, t, n, r, i = false) {
        if (A(e)) {
          e.forEach((j, D) => Ut(j, t && (A(t) ? t[D] : t), n, r, i));
          return;
        }
        if (Dt(r) && !i) {
          r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Ut(e, t, n, r.component.subTree);
          return;
        }
        const s = r.shapeFlag & 4 ? wn(r.component) : r.el, o = i ? null : s, { i: a, r: f } = e, h = t && t.r, u = a.refs === $ ? a.refs = {} : a.refs, p = a.setupState, T = N(p), C = p === $ ? () => false : (j) => V(T, j);
        if (h != null && h !== f && (te(h) ? (u[h] = null, C(h) && (p[h] = null)) : se(h) && (h.value = null)), I(f)) $t(f, a, 12, [
          o,
          u
        ]);
        else {
          const j = te(f), D = se(f);
          if (j || D) {
            const ee = () => {
              if (e.f) {
                const z = j ? C(f) ? p[f] : u[f] : f.value;
                i ? A(z) && Zn(z, s) : A(z) ? z.includes(s) || z.push(s) : j ? (u[f] = [
                  s
                ], C(f) && (p[f] = u[f])) : (f.value = [
                  s
                ], e.k && (u[e.k] = f.value));
              } else j ? (u[f] = o, C(f) && (p[f] = o)) : D && (f.value = o, e.k && (u[e.k] = o));
            };
            o ? (ee.id = -1, ye(ee, n)) : ee();
          }
        }
      }
      bn().requestIdleCallback;
      bn().cancelIdleCallback;
      const Dt = (e) => !!e.type.__asyncLoader, Ai = (e) => e.type.__isKeepAlive;
      function no(e, t) {
        Ii(e, "a", t);
      }
      function ro(e, t) {
        Ii(e, "da", t);
      }
      function Ii(e, t, n = he) {
        const r = e.__wdc || (e.__wdc = () => {
          let i = n;
          for (; i; ) {
            if (i.isDeactivated) return;
            i = i.parent;
          }
          return e();
        });
        if (vn(t, r, n), n) {
          let i = n.parent;
          for (; i && i.parent; ) Ai(i.parent.vnode) && io(r, t, n, i), i = i.parent;
        }
      }
      function io(e, t, n, r) {
        const i = vn(t, e, r, true);
        pr(() => {
          Zn(r[t], i);
        }, n);
      }
      function vn(e, t, n = he, r = false) {
        if (n) {
          const i = n[e] || (n[e] = []), s = t.__weh || (t.__weh = (...o) => {
            Ke();
            const a = Kt(n), f = je(t, n, e, o);
            return a(), qe(), f;
          });
          return r ? i.unshift(s) : i.push(s), s;
        }
      }
      const Ye = (e) => (t, n = he) => {
        (!Wt || e === "sp") && vn(e, (...r) => t(...r), n);
      }, so = Ye("bm"), hr = Ye("m"), oo = Ye("bu"), lo = Ye("u"), ao = Ye("bum"), pr = Ye("um"), co = Ye("sp"), fo = Ye("rtg"), uo = Ye("rtc");
      function ho(e, t = he) {
        vn("ec", e, t);
      }
      const po = Symbol.for("v-ndc"), $n = (e) => e ? Zi(e) ? wn(e) : $n(e.parent) : null, jt = oe(/* @__PURE__ */ Object.create(null), {
        $: (e) => e,
        $el: (e) => e.vnode.el,
        $data: (e) => e.data,
        $props: (e) => e.props,
        $attrs: (e) => e.attrs,
        $slots: (e) => e.slots,
        $refs: (e) => e.refs,
        $parent: (e) => $n(e.parent),
        $root: (e) => $n(e.root),
        $host: (e) => e.ce,
        $emit: (e) => e.emit,
        $options: (e) => Ui(e),
        $forceUpdate: (e) => e.f || (e.f = () => {
          ur(e.update);
        }),
        $nextTick: (e) => e.n || (e.n = Wn.bind(e.proxy)),
        $watch: (e) => jo.bind(e)
      }), On = (e, t) => e !== $ && !e.__isScriptSetup && V(e, t), go = {
        get({ _: e }, t) {
          if (t === "__v_skip") return true;
          const { ctx: n, setupState: r, data: i, props: s, accessCache: o, type: a, appContext: f } = e;
          let h;
          if (t[0] !== "$") {
            const C = o[t];
            if (C !== void 0) switch (C) {
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
              if (On(r, t)) return o[t] = 1, r[t];
              if (i !== $ && V(i, t)) return o[t] = 2, i[t];
              if ((h = e.propsOptions[0]) && V(h, t)) return o[t] = 3, s[t];
              if (n !== $ && V(n, t)) return o[t] = 4, n[t];
              Kn && (o[t] = 0);
            }
          }
          const u = jt[t];
          let p, T;
          if (u) return t === "$attrs" && ie(e.attrs, "get", ""), u(e);
          if ((p = a.__cssModules) && (p = p[t])) return p;
          if (n !== $ && V(n, t)) return o[t] = 4, n[t];
          if (T = f.config.globalProperties, V(T, t)) return T[t];
        },
        set({ _: e }, t, n) {
          const { data: r, setupState: i, ctx: s } = e;
          return On(i, t) ? (i[t] = n, true) : r !== $ && V(r, t) ? (r[t] = n, true) : V(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (s[t] = n, true);
        },
        has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, propsOptions: s } }, o) {
          let a;
          return !!n[o] || e !== $ && V(e, o) || On(t, o) || (a = s[0]) && V(a, o) || V(r, o) || V(jt, o) || V(i.config.globalProperties, o);
        },
        defineProperty(e, t, n) {
          return n.get != null ? e._.accessCache[t] = 0 : V(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
        }
      };
      function Rr(e) {
        return A(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
      }
      let Kn = true;
      function _o(e) {
        const t = Ui(e), n = e.proxy, r = e.ctx;
        Kn = false, t.beforeCreate && Er(t.beforeCreate, e, "bc");
        const { data: i, computed: s, methods: o, watch: a, provide: f, inject: h, created: u, beforeMount: p, mounted: T, beforeUpdate: C, updated: j, activated: D, deactivated: ee, beforeDestroy: z, beforeUnmount: K, destroyed: k, unmounted: M, render: Z, renderTracked: Ee, renderTriggered: we, errorCaptured: Pe, serverPrefetch: ut, expose: Be, inheritAttrs: Xe, components: rt, directives: it, filters: wt } = t;
        if (h && bo(h, r, null), o) for (const X in o) {
          const W = o[X];
          I(W) && (r[X] = W.bind(n));
        }
        if (i) {
          const X = i.call(n, n);
          Q(X) && (e.data = ar(X));
        }
        if (Kn = true, s) for (const X in s) {
          const W = s[X], Le = I(W) ? W.bind(n, n) : I(W.get) ? W.get.bind(n, n) : De, be = !I(W) && I(W.set) ? W.set.bind(n) : De, R = ts({
            get: Le,
            set: be
          });
          Object.defineProperty(r, X, {
            enumerable: true,
            configurable: true,
            get: () => R.value,
            set: (v) => R.value = v
          });
        }
        if (a) for (const X in a) Fi(a[X], r, n, X);
        if (f) {
          const X = I(f) ? f.call(n) : f;
          Reflect.ownKeys(X).forEach((W) => {
            So(W, X[W]);
          });
        }
        u && Er(u, e, "c");
        function J(X, W) {
          A(W) ? W.forEach((Le) => X(Le.bind(n))) : W && X(W.bind(n));
        }
        if (J(so, p), J(hr, T), J(oo, C), J(lo, j), J(no, D), J(ro, ee), J(ho, Pe), J(uo, Ee), J(fo, we), J(ao, K), J(pr, M), J(co, ut), A(Be)) if (Be.length) {
          const X = e.exposed || (e.exposed = {});
          Be.forEach((W) => {
            Object.defineProperty(X, W, {
              get: () => n[W],
              set: (Le) => n[W] = Le,
              enumerable: true
            });
          });
        } else e.exposed || (e.exposed = {});
        Z && e.render === De && (e.render = Z), Xe != null && (e.inheritAttrs = Xe), rt && (e.components = rt), it && (e.directives = it), ut && Oi(e);
      }
      function bo(e, t, n = De) {
        A(e) && (e = qn(e));
        for (const r in e) {
          const i = e[r];
          let s;
          Q(i) ? "default" in i ? s = en(i.from || r, i.default, true) : s = en(i.from || r) : s = en(i), se(s) ? Object.defineProperty(t, r, {
            enumerable: true,
            configurable: true,
            get: () => s.value,
            set: (o) => s.value = o
          }) : t[r] = s;
        }
      }
      function Er(e, t, n) {
        je(A(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
      }
      function Fi(e, t, n, r) {
        let i = r.includes(".") ? qi(n, r) : () => n[r];
        if (te(e)) {
          const s = t[e];
          I(s) && In(i, s);
        } else if (I(e)) In(i, e.bind(n));
        else if (Q(e)) if (A(e)) e.forEach((s) => Fi(s, t, n, r));
        else {
          const s = I(e.handler) ? e.handler.bind(n) : t[e.handler];
          I(s) && In(i, s, e);
        }
      }
      function Ui(e) {
        const t = e.type, { mixins: n, extends: r } = t, { mixins: i, optionsCache: s, config: { optionMergeStrategies: o } } = e.appContext, a = s.get(t);
        let f;
        return a ? f = a : !i.length && !n && !r ? f = t : (f = {}, i.length && i.forEach((h) => un(f, h, o, true)), un(f, t, o)), Q(t) && s.set(t, f), f;
      }
      function un(e, t, n, r = false) {
        const { mixins: i, extends: s } = t;
        s && un(e, s, n, true), i && i.forEach((o) => un(e, o, n, true));
        for (const o in t) if (!(r && o === "expose")) {
          const a = mo[o] || n && n[o];
          e[o] = a ? a(e[o], t[o]) : t[o];
        }
        return e;
      }
      const mo = {
        data: Pr,
        props: Mr,
        emits: Mr,
        methods: Mt,
        computed: Mt,
        beforeCreate: ce,
        created: ce,
        beforeMount: ce,
        mounted: ce,
        beforeUpdate: ce,
        updated: ce,
        beforeDestroy: ce,
        beforeUnmount: ce,
        destroyed: ce,
        unmounted: ce,
        activated: ce,
        deactivated: ce,
        errorCaptured: ce,
        serverPrefetch: ce,
        components: Mt,
        directives: Mt,
        watch: yo,
        provide: Pr,
        inject: vo
      };
      function Pr(e, t) {
        return t ? e ? function() {
          return oe(I(e) ? e.call(this, this) : e, I(t) ? t.call(this, this) : t);
        } : t : e;
      }
      function vo(e, t) {
        return Mt(qn(e), qn(t));
      }
      function qn(e) {
        if (A(e)) {
          const t = {};
          for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
          return t;
        }
        return e;
      }
      function ce(e, t) {
        return e ? [
          ...new Set([].concat(e, t))
        ] : t;
      }
      function Mt(e, t) {
        return e ? oe(/* @__PURE__ */ Object.create(null), e, t) : t;
      }
      function Mr(e, t) {
        return e ? A(e) && A(t) ? [
          .../* @__PURE__ */ new Set([
            ...e,
            ...t
          ])
        ] : oe(/* @__PURE__ */ Object.create(null), Rr(e), Rr(t ?? {})) : t;
      }
      function yo(e, t) {
        if (!e) return t;
        if (!t) return e;
        const n = oe(/* @__PURE__ */ Object.create(null), e);
        for (const r in t) n[r] = ce(e[r], t[r]);
        return n;
      }
      function Di() {
        return {
          app: null,
          config: {
            isNativeTag: as,
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
      let xo = 0;
      function wo(e, t) {
        return function(r, i = null) {
          I(r) || (r = oe({}, r)), i != null && !Q(i) && (i = null);
          const s = Di(), o = /* @__PURE__ */ new WeakSet(), a = [];
          let f = false;
          const h = s.app = {
            _uid: xo++,
            _component: r,
            _props: i,
            _container: null,
            _context: s,
            _instance: null,
            version: sl,
            get config() {
              return s.config;
            },
            set config(u) {
            },
            use(u, ...p) {
              return o.has(u) || (u && I(u.install) ? (o.add(u), u.install(h, ...p)) : I(u) && (o.add(u), u(h, ...p))), h;
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
            mount(u, p, T) {
              if (!f) {
                const C = h._ceVNode || Re(r, i);
                return C.appContext = s, T === true ? T = "svg" : T === false && (T = void 0), e(C, u, T), f = true, h._container = u, u.__vue_app__ = h, wn(C.component);
              }
            },
            onUnmount(u) {
              a.push(u);
            },
            unmount() {
              f && (je(a, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
            },
            provide(u, p) {
              return s.provides[u] = p, h;
            },
            runWithContext(u) {
              const p = vt;
              vt = h;
              try {
                return u();
              } finally {
                vt = p;
              }
            }
          };
          return h;
        };
      }
      let vt = null;
      function So(e, t) {
        if (he) {
          let n = he.provides;
          const r = he.parent && he.parent.provides;
          r === n && (n = he.provides = Object.create(r)), n[e] = t;
        }
      }
      function en(e, t, n = false) {
        const r = Zo();
        if (r || vt) {
          let i = vt ? vt._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
          if (i && e in i) return i[e];
          if (arguments.length > 1) return n && I(t) ? t.call(r && r.proxy) : t;
        }
      }
      const ji = {}, Bi = () => Object.create(ji), Li = (e) => Object.getPrototypeOf(e) === ji;
      function To(e, t, n, r = false) {
        const i = {}, s = Bi();
        e.propsDefaults = /* @__PURE__ */ Object.create(null), zi(e, t, i, s);
        for (const o in e.propsOptions[0]) o in i || (i[o] = void 0);
        n ? e.props = r ? i : Ns(i) : e.type.props ? e.props = i : e.props = s, e.attrs = s;
      }
      function Co(e, t, n, r) {
        const { props: i, attrs: s, vnode: { patchFlag: o } } = e, a = N(i), [f] = e.propsOptions;
        let h = false;
        if ((r || o > 0) && !(o & 16)) {
          if (o & 8) {
            const u = e.vnode.dynamicProps;
            for (let p = 0; p < u.length; p++) {
              let T = u[p];
              if (yn(e.emitsOptions, T)) continue;
              const C = t[T];
              if (f) if (V(s, T)) C !== s[T] && (s[T] = C, h = true);
              else {
                const j = et(T);
                i[j] = Yn(f, a, j, C, e, false);
              }
              else C !== s[T] && (s[T] = C, h = true);
            }
          }
        } else {
          zi(e, t, i, s) && (h = true);
          let u;
          for (const p in a) (!t || !V(t, p) && ((u = ft(p)) === p || !V(t, u))) && (f ? n && (n[p] !== void 0 || n[u] !== void 0) && (i[p] = Yn(f, a, p, void 0, e, true)) : delete i[p]);
          if (s !== a) for (const p in s) (!t || !V(t, p)) && (delete s[p], h = true);
        }
        h && We(e.attrs, "set", "");
      }
      function zi(e, t, n, r) {
        const [i, s] = e.propsOptions;
        let o = false, a;
        if (t) for (let f in t) {
          if (Ot(f)) continue;
          const h = t[f];
          let u;
          i && V(i, u = et(f)) ? !s || !s.includes(u) ? n[u] = h : (a || (a = {}))[u] = h : yn(e.emitsOptions, f) || (!(f in r) || h !== r[f]) && (r[f] = h, o = true);
        }
        if (s) {
          const f = N(n), h = a || $;
          for (let u = 0; u < s.length; u++) {
            const p = s[u];
            n[p] = Yn(i, f, p, h[p], e, !V(h, p));
          }
        }
        return o;
      }
      function Yn(e, t, n, r, i, s) {
        const o = e[n];
        if (o != null) {
          const a = V(o, "default");
          if (a && r === void 0) {
            const f = o.default;
            if (o.type !== Function && !o.skipFactory && I(f)) {
              const { propsDefaults: h } = i;
              if (n in h) r = h[n];
              else {
                const u = Kt(i);
                r = h[n] = f.call(null, t), u();
              }
            } else r = f;
            i.ce && i.ce._setProp(n, r);
          }
          o[0] && (s && !a ? r = false : o[1] && (r === "" || r === ft(n)) && (r = true));
        }
        return r;
      }
      const Ro = /* @__PURE__ */ new WeakMap();
      function Ni(e, t, n = false) {
        const r = n ? Ro : t.propsCache, i = r.get(e);
        if (i) return i;
        const s = e.props, o = {}, a = [];
        let f = false;
        if (!I(e)) {
          const u = (p) => {
            f = true;
            const [T, C] = Ni(p, t, true);
            oe(o, T), C && a.push(...C);
          };
          !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
        }
        if (!s && !f) return Q(e) && r.set(e, gt), gt;
        if (A(s)) for (let u = 0; u < s.length; u++) {
          const p = et(s[u]);
          Or(p) && (o[p] = $);
        }
        else if (s) for (const u in s) {
          const p = et(u);
          if (Or(p)) {
            const T = s[u], C = o[p] = A(T) || I(T) ? {
              type: T
            } : oe({}, T), j = C.type;
            let D = false, ee = true;
            if (A(j)) for (let z = 0; z < j.length; ++z) {
              const K = j[z], k = I(K) && K.name;
              if (k === "Boolean") {
                D = true;
                break;
              } else k === "String" && (ee = false);
            }
            else D = I(j) && j.name === "Boolean";
            C[0] = D, C[1] = ee, (D || V(C, "default")) && a.push(p);
          }
        }
        const h = [
          o,
          a
        ];
        return Q(e) && r.set(e, h), h;
      }
      function Or(e) {
        return e[0] !== "$" && !Ot(e);
      }
      const gr = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", _r = (e) => A(e) ? e.map(Ue) : [
        Ue(e)
      ], Eo = (e, t, n) => {
        if (t._n) return t;
        const r = Zs((...i) => _r(t(...i)), n);
        return r._c = false, r;
      }, Vi = (e, t, n) => {
        const r = e._ctx;
        for (const i in e) {
          if (gr(i)) continue;
          const s = e[i];
          if (I(s)) t[i] = Eo(i, s, r);
          else if (s != null) {
            const o = _r(s);
            t[i] = () => o;
          }
        }
      }, Gi = (e, t) => {
        const n = _r(t);
        e.slots.default = () => n;
      }, Hi = (e, t, n) => {
        for (const r in t) (n || !gr(r)) && (e[r] = t[r]);
      }, Po = (e, t, n) => {
        const r = e.slots = Bi();
        if (e.vnode.shapeFlag & 32) {
          const i = t.__;
          i && Ln(r, "__", i, true);
          const s = t._;
          s ? (Hi(r, t, n), n && Ln(r, "_", s, true)) : Vi(t, r);
        } else t && Gi(e, t);
      }, Mo = (e, t, n) => {
        const { vnode: r, slots: i } = e;
        let s = true, o = $;
        if (r.shapeFlag & 32) {
          const a = t._;
          a ? n && a === 1 ? s = false : Hi(i, t, n) : (s = !t.$stable, Vi(t, i)), o = t;
        } else t && (Gi(e, t), o = {
          default: 1
        });
        if (s) for (const a in i) !gr(a) && o[a] == null && delete i[a];
      }, ye = Ho;
      function Oo(e) {
        return Ao(e);
      }
      function Ao(e, t) {
        const n = bn();
        n.__VUE__ = true;
        const { insert: r, remove: i, patchProp: s, createElement: o, createText: a, createComment: f, setText: h, setElementText: u, parentNode: p, nextSibling: T, setScopeId: C = De, insertStaticContent: j } = e, D = (l, c, d, b = null, g = null, _ = null, w = void 0, x = null, y = !!c.dynamicChildren) => {
          if (l === c) return;
          l && !Rt(l, c) && (b = ae(l), v(l, g, _, true), l = null), c.patchFlag === -2 && (y = false, c.dynamicChildren = null);
          const { type: m, ref: P, shapeFlag: S } = c;
          switch (m) {
            case xn:
              ee(l, c, d, b);
              break;
            case tt:
              z(l, c, d, b);
              break;
            case tn:
              l == null && K(c, d, b, w);
              break;
            case He:
              rt(l, c, d, b, g, _, w, x, y);
              break;
            default:
              S & 1 ? Z(l, c, d, b, g, _, w, x, y) : S & 6 ? it(l, c, d, b, g, _, w, x, y) : (S & 64 || S & 128) && m.process(l, c, d, b, g, _, w, x, y, me);
          }
          P != null && g ? Ut(P, l && l.ref, _, c || l, !c) : P == null && l && l.ref != null && Ut(l.ref, null, _, l, true);
        }, ee = (l, c, d, b) => {
          if (l == null) r(c.el = a(c.children), d, b);
          else {
            const g = c.el = l.el;
            c.children !== l.children && h(g, c.children);
          }
        }, z = (l, c, d, b) => {
          l == null ? r(c.el = f(c.children || ""), d, b) : c.el = l.el;
        }, K = (l, c, d, b) => {
          [l.el, l.anchor] = j(l.children, c, d, b, l.el, l.anchor);
        }, k = ({ el: l, anchor: c }, d, b) => {
          let g;
          for (; l && l !== c; ) g = T(l), r(l, d, b), l = g;
          r(c, d, b);
        }, M = ({ el: l, anchor: c }) => {
          let d;
          for (; l && l !== c; ) d = T(l), i(l), l = d;
          i(c);
        }, Z = (l, c, d, b, g, _, w, x, y) => {
          c.type === "svg" ? w = "svg" : c.type === "math" && (w = "mathml"), l == null ? Ee(c, d, b, g, _, w, x, y) : ut(l, c, g, _, w, x, y);
        }, Ee = (l, c, d, b, g, _, w, x) => {
          let y, m;
          const { props: P, shapeFlag: S, transition: E, dirs: O } = l;
          if (y = l.el = o(l.type, _, P && P.is, P), S & 8 ? u(y, l.children) : S & 16 && Pe(l.children, y, null, b, g, An(l, _), w, x), O && st(l, null, b, "created"), we(y, l, l.scopeId, w, b), P) {
            for (const q in P) q !== "value" && !Ot(q) && s(y, q, null, P[q], _, b);
            "value" in P && s(y, "value", null, P.value, _), (m = P.onVnodeBeforeMount) && Ie(m, b, l);
          }
          O && st(l, null, b, "beforeMount");
          const L = Io(g, E);
          L && E.beforeEnter(y), r(y, c, d), ((m = P && P.onVnodeMounted) || L || O) && ye(() => {
            m && Ie(m, b, l), L && E.enter(y), O && st(l, null, b, "mounted");
          }, g);
        }, we = (l, c, d, b, g) => {
          if (d && C(l, d), b) for (let _ = 0; _ < b.length; _++) C(l, b[_]);
          if (g) {
            let _ = g.subTree;
            if (c === _ || Xi(_.type) && (_.ssContent === c || _.ssFallback === c)) {
              const w = g.vnode;
              we(l, w, w.scopeId, w.slotScopeIds, g.parent);
            }
          }
        }, Pe = (l, c, d, b, g, _, w, x, y = 0) => {
          for (let m = y; m < l.length; m++) {
            const P = l[m] = x ? Qe(l[m]) : Ue(l[m]);
            D(null, P, c, d, b, g, _, w, x);
          }
        }, ut = (l, c, d, b, g, _, w) => {
          const x = c.el = l.el;
          let { patchFlag: y, dynamicChildren: m, dirs: P } = c;
          y |= l.patchFlag & 16;
          const S = l.props || $, E = c.props || $;
          let O;
          if (d && ot(d, false), (O = E.onVnodeBeforeUpdate) && Ie(O, d, c, l), P && st(c, l, d, "beforeUpdate"), d && ot(d, true), (S.innerHTML && E.innerHTML == null || S.textContent && E.textContent == null) && u(x, ""), m ? Be(l.dynamicChildren, m, x, d, b, An(c, g), _) : w || W(l, c, x, null, d, b, An(c, g), _, false), y > 0) {
            if (y & 16) Xe(x, S, E, d, g);
            else if (y & 2 && S.class !== E.class && s(x, "class", null, E.class, g), y & 4 && s(x, "style", S.style, E.style, g), y & 8) {
              const L = c.dynamicProps;
              for (let q = 0; q < L.length; q++) {
                const G = L[q], pe = S[G], ge = E[G];
                (ge !== pe || G === "value") && s(x, G, pe, ge, g, d);
              }
            }
            y & 1 && l.children !== c.children && u(x, c.children);
          } else !w && m == null && Xe(x, S, E, d, g);
          ((O = E.onVnodeUpdated) || P) && ye(() => {
            O && Ie(O, d, c, l), P && st(c, l, d, "updated");
          }, b);
        }, Be = (l, c, d, b, g, _, w) => {
          for (let x = 0; x < c.length; x++) {
            const y = l[x], m = c[x], P = y.el && (y.type === He || !Rt(y, m) || y.shapeFlag & 198) ? p(y.el) : d;
            D(y, m, P, null, b, g, _, w, true);
          }
        }, Xe = (l, c, d, b, g) => {
          if (c !== d) {
            if (c !== $) for (const _ in c) !Ot(_) && !(_ in d) && s(l, _, c[_], null, g, b);
            for (const _ in d) {
              if (Ot(_)) continue;
              const w = d[_], x = c[_];
              w !== x && _ !== "value" && s(l, _, x, w, g, b);
            }
            "value" in d && s(l, "value", c.value, d.value, g);
          }
        }, rt = (l, c, d, b, g, _, w, x, y) => {
          const m = c.el = l ? l.el : a(""), P = c.anchor = l ? l.anchor : a("");
          let { patchFlag: S, dynamicChildren: E, slotScopeIds: O } = c;
          O && (x = x ? x.concat(O) : O), l == null ? (r(m, d, b), r(P, d, b), Pe(c.children || [], d, P, g, _, w, x, y)) : S > 0 && S & 64 && E && l.dynamicChildren ? (Be(l.dynamicChildren, E, d, g, _, w, x), (c.key != null || g && c === g.subTree) && Wi(l, c, true)) : W(l, c, d, P, g, _, w, x, y);
        }, it = (l, c, d, b, g, _, w, x, y) => {
          c.slotScopeIds = x, l == null ? c.shapeFlag & 512 ? g.ctx.activate(c, d, b, w, y) : wt(c, d, b, g, _, w, y) : St(l, c, y);
        }, wt = (l, c, d, b, g, _, w) => {
          const x = l.component = Qo(l, b, g);
          if (Ai(l) && (x.ctx.renderer = me), el(x, false, w), x.asyncDep) {
            if (g && g.registerDep(x, J, w), !l.el) {
              const y = x.subTree = Re(tt);
              z(null, y, c, d), l.placeholder = y.el;
            }
          } else J(x, l, c, d, g, _, w);
        }, St = (l, c, d) => {
          const b = c.component = l.component;
          if (Vo(l, c, d)) if (b.asyncDep && !b.asyncResolved) {
            X(b, c, d);
            return;
          } else b.next = c, b.update();
          else c.el = l.el, b.vnode = c;
        }, J = (l, c, d, b, g, _, w) => {
          const x = () => {
            if (l.isMounted) {
              let { next: S, bu: E, u: O, parent: L, vnode: q } = l;
              {
                const Oe = $i(l);
                if (Oe) {
                  S && (S.el = q.el, X(l, S, w)), Oe.asyncDep.then(() => {
                    l.isUnmounted || x();
                  });
                  return;
                }
              }
              let G = S, pe;
              ot(l, false), S ? (S.el = q.el, X(l, S, w)) : S = q, E && Tn(E), (pe = S.props && S.props.onVnodeBeforeUpdate) && Ie(pe, L, S, q), ot(l, true);
              const ge = Ir(l), Me = l.subTree;
              l.subTree = ge, D(Me, ge, p(Me.el), ae(Me), l, g, _), S.el = ge.el, G === null && Go(l, ge.el), O && ye(O, g), (pe = S.props && S.props.onVnodeUpdated) && ye(() => Ie(pe, L, S, q), g);
            } else {
              let S;
              const { el: E, props: O } = c, { bm: L, m: q, parent: G, root: pe, type: ge } = l, Me = Dt(c);
              ot(l, false), L && Tn(L), !Me && (S = O && O.onVnodeBeforeMount) && Ie(S, G, c), ot(l, true);
              {
                pe.ce && pe.ce._def.shadowRoot !== false && pe.ce._injectChildStyle(ge);
                const Oe = l.subTree = Ir(l);
                D(null, Oe, d, b, l, g, _), c.el = Oe.el;
              }
              if (q && ye(q, g), !Me && (S = O && O.onVnodeMounted)) {
                const Oe = c;
                ye(() => Ie(S, G, Oe), g);
              }
              (c.shapeFlag & 256 || G && Dt(G.vnode) && G.vnode.shapeFlag & 256) && l.a && ye(l.a, g), l.isMounted = true, c = d = b = null;
            }
          };
          l.scope.on();
          const y = l.effect = new ai(x);
          l.scope.off();
          const m = l.update = y.run.bind(y), P = l.job = y.runIfDirty.bind(y);
          P.i = l, P.id = l.uid, y.scheduler = () => ur(P), ot(l, true), m();
        }, X = (l, c, d) => {
          c.component = l;
          const b = l.vnode.props;
          l.vnode = c, l.next = null, Co(l, c.props, b, d), Mo(l, c.children, d), Ke(), Cr(l), qe();
        }, W = (l, c, d, b, g, _, w, x, y = false) => {
          const m = l && l.children, P = l ? l.shapeFlag : 0, S = c.children, { patchFlag: E, shapeFlag: O } = c;
          if (E > 0) {
            if (E & 128) {
              be(m, S, d, b, g, _, w, x, y);
              return;
            } else if (E & 256) {
              Le(m, S, d, b, g, _, w, x, y);
              return;
            }
          }
          O & 8 ? (P & 16 && re(m, g, _), S !== m && u(d, S)) : P & 16 ? O & 16 ? be(m, S, d, b, g, _, w, x, y) : re(m, g, _, true) : (P & 8 && u(d, ""), O & 16 && Pe(S, d, b, g, _, w, x, y));
        }, Le = (l, c, d, b, g, _, w, x, y) => {
          l = l || gt, c = c || gt;
          const m = l.length, P = c.length, S = Math.min(m, P);
          let E;
          for (E = 0; E < S; E++) {
            const O = c[E] = y ? Qe(c[E]) : Ue(c[E]);
            D(l[E], O, d, null, g, _, w, x, y);
          }
          m > P ? re(l, g, _, true, false, S) : Pe(c, d, b, g, _, w, x, y, S);
        }, be = (l, c, d, b, g, _, w, x, y) => {
          let m = 0;
          const P = c.length;
          let S = l.length - 1, E = P - 1;
          for (; m <= S && m <= E; ) {
            const O = l[m], L = c[m] = y ? Qe(c[m]) : Ue(c[m]);
            if (Rt(O, L)) D(O, L, d, null, g, _, w, x, y);
            else break;
            m++;
          }
          for (; m <= S && m <= E; ) {
            const O = l[S], L = c[E] = y ? Qe(c[E]) : Ue(c[E]);
            if (Rt(O, L)) D(O, L, d, null, g, _, w, x, y);
            else break;
            S--, E--;
          }
          if (m > S) {
            if (m <= E) {
              const O = E + 1, L = O < P ? c[O].el : b;
              for (; m <= E; ) D(null, c[m] = y ? Qe(c[m]) : Ue(c[m]), d, L, g, _, w, x, y), m++;
            }
          } else if (m > E) for (; m <= S; ) v(l[m], g, _, true), m++;
          else {
            const O = m, L = m, q = /* @__PURE__ */ new Map();
            for (m = L; m <= E; m++) {
              const ve = c[m] = y ? Qe(c[m]) : Ue(c[m]);
              ve.key != null && q.set(ve.key, m);
            }
            let G, pe = 0;
            const ge = E - L + 1;
            let Me = false, Oe = 0;
            const Tt = new Array(ge);
            for (m = 0; m < ge; m++) Tt[m] = 0;
            for (m = O; m <= S; m++) {
              const ve = l[m];
              if (pe >= ge) {
                v(ve, g, _, true);
                continue;
              }
              let Ae;
              if (ve.key != null) Ae = q.get(ve.key);
              else for (G = L; G <= E; G++) if (Tt[G - L] === 0 && Rt(ve, c[G])) {
                Ae = G;
                break;
              }
              Ae === void 0 ? v(ve, g, _, true) : (Tt[Ae - L] = m + 1, Ae >= Oe ? Oe = Ae : Me = true, D(ve, c[Ae], d, null, g, _, w, x, y), pe++);
            }
            const vr = Me ? Fo(Tt) : gt;
            for (G = vr.length - 1, m = ge - 1; m >= 0; m--) {
              const ve = L + m, Ae = c[ve], yr = c[ve + 1], xr = ve + 1 < P ? yr.el || yr.placeholder : b;
              Tt[m] === 0 ? D(null, Ae, d, xr, g, _, w, x, y) : Me && (G < 0 || m !== vr[G] ? R(Ae, d, xr, 2) : G--);
            }
          }
        }, R = (l, c, d, b, g = null) => {
          const { el: _, type: w, transition: x, children: y, shapeFlag: m } = l;
          if (m & 6) {
            R(l.component.subTree, c, d, b);
            return;
          }
          if (m & 128) {
            l.suspense.move(c, d, b);
            return;
          }
          if (m & 64) {
            w.move(l, c, d, me);
            return;
          }
          if (w === He) {
            r(_, c, d);
            for (let S = 0; S < y.length; S++) R(y[S], c, d, b);
            r(l.anchor, c, d);
            return;
          }
          if (w === tn) {
            k(l, c, d);
            return;
          }
          if (b !== 2 && m & 1 && x) if (b === 0) x.beforeEnter(_), r(_, c, d), ye(() => x.enter(_), g);
          else {
            const { leave: S, delayLeave: E, afterLeave: O } = x, L = () => {
              l.ctx.isUnmounted ? i(_) : r(_, c, d);
            }, q = () => {
              S(_, () => {
                L(), O && O();
              });
            };
            E ? E(_, L, q) : q();
          }
          else r(_, c, d);
        }, v = (l, c, d, b = false, g = false) => {
          const { type: _, props: w, ref: x, children: y, dynamicChildren: m, shapeFlag: P, patchFlag: S, dirs: E, cacheIndex: O } = l;
          if (S === -2 && (g = false), x != null && (Ke(), Ut(x, null, d, l, true), qe()), O != null && (c.renderCache[O] = void 0), P & 256) {
            c.ctx.deactivate(l);
            return;
          }
          const L = P & 1 && E, q = !Dt(l);
          let G;
          if (q && (G = w && w.onVnodeBeforeUnmount) && Ie(G, c, l), P & 6) ne(l.component, d, b);
          else {
            if (P & 128) {
              l.suspense.unmount(d, b);
              return;
            }
            L && st(l, null, c, "beforeUnmount"), P & 64 ? l.type.remove(l, c, d, me, b) : m && !m.hasOnce && (_ !== He || S > 0 && S & 64) ? re(m, c, d, false, true) : (_ === He && S & 384 || !g && P & 16) && re(y, c, d), b && B(l);
          }
          (q && (G = w && w.onVnodeUnmounted) || L) && ye(() => {
            G && Ie(G, c, l), L && st(l, null, c, "unmounted");
          }, d);
        }, B = (l) => {
          const { type: c, el: d, anchor: b, transition: g } = l;
          if (c === He) {
            le(d, b);
            return;
          }
          if (c === tn) {
            M(l);
            return;
          }
          const _ = () => {
            i(d), g && !g.persisted && g.afterLeave && g.afterLeave();
          };
          if (l.shapeFlag & 1 && g && !g.persisted) {
            const { leave: w, delayLeave: x } = g, y = () => w(d, _);
            x ? x(l.el, _, y) : y();
          } else _();
        }, le = (l, c) => {
          let d;
          for (; l !== c; ) d = T(l), i(l), l = d;
          i(c);
        }, ne = (l, c, d) => {
          const { bum: b, scope: g, job: _, subTree: w, um: x, m: y, a: m, parent: P, slots: { __: S } } = l;
          Ar(y), Ar(m), b && Tn(b), P && A(S) && S.forEach((E) => {
            P.renderCache[E] = void 0;
          }), g.stop(), _ && (_.flags |= 8, v(w, l, c, d)), x && ye(x, c), ye(() => {
            l.isUnmounted = true;
          }, c), c && c.pendingBranch && !c.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === c.pendingId && (c.deps--, c.deps === 0 && c.resolve());
        }, re = (l, c, d, b = false, g = false, _ = 0) => {
          for (let w = _; w < l.length; w++) v(l[w], c, d, b, g);
        }, ae = (l) => {
          if (l.shapeFlag & 6) return ae(l.component.subTree);
          if (l.shapeFlag & 128) return l.suspense.next();
          const c = T(l.anchor || l.el), d = c && c[eo];
          return d ? T(d) : c;
        };
        let ze = false;
        const ke = (l, c, d) => {
          l == null ? c._vnode && v(c._vnode, null, null, true) : D(c._vnode || null, l, c, null, null, null, d), c._vnode = l, ze || (ze = true, Cr(), Ri(), ze = false);
        }, me = {
          p: D,
          um: v,
          m: R,
          r: B,
          mt: wt,
          mc: Pe,
          pc: W,
          pbc: Be,
          n: ae,
          o: e
        };
        return {
          render: ke,
          hydrate: void 0,
          createApp: wo(ke)
        };
      }
      function An({ type: e, props: t }, n) {
        return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
      }
      function ot({ effect: e, job: t }, n) {
        n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
      }
      function Io(e, t) {
        return (!e || e && !e.pendingBranch) && t && !t.persisted;
      }
      function Wi(e, t, n = false) {
        const r = e.children, i = t.children;
        if (A(r) && A(i)) for (let s = 0; s < r.length; s++) {
          const o = r[s];
          let a = i[s];
          a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[s] = Qe(i[s]), a.el = o.el), !n && a.patchFlag !== -2 && Wi(o, a)), a.type === xn && (a.el = o.el), a.type === tt && !a.el && (a.el = o.el);
        }
      }
      function Fo(e) {
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
      function $i(e) {
        const t = e.subTree.component;
        if (t) return t.asyncDep && !t.asyncResolved ? t : $i(t);
      }
      function Ar(e) {
        if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
      }
      const Uo = Symbol.for("v-scx"), Do = () => en(Uo);
      function In(e, t, n) {
        return Ki(e, t, n);
      }
      function Ki(e, t, n = $) {
        const { immediate: r, deep: i, flush: s, once: o } = n, a = oe({}, n), f = t && r || !t && s !== "post";
        let h;
        if (Wt) {
          if (s === "sync") {
            const C = Do();
            h = C.__watcherHandles || (C.__watcherHandles = []);
          } else if (!f) {
            const C = () => {
            };
            return C.stop = De, C.resume = De, C.pause = De, C;
          }
        }
        const u = he;
        a.call = (C, j, D) => je(C, u, j, D);
        let p = false;
        s === "post" ? a.scheduler = (C) => {
          ye(C, u && u.suspense);
        } : s !== "sync" && (p = true, a.scheduler = (C, j) => {
          j ? C() : ur(C);
        }), a.augmentJob = (C) => {
          t && (C.flags |= 4), p && (C.flags |= 2, u && (C.id = u.uid, C.i = u));
        };
        const T = Xs(e, t, a);
        return Wt && (h ? h.push(T) : f && T()), T;
      }
      function jo(e, t, n) {
        const r = this.proxy, i = te(e) ? e.includes(".") ? qi(r, e) : () => r[e] : e.bind(r, r);
        let s;
        I(t) ? s = t : (s = t.handler, n = t);
        const o = Kt(this), a = Ki(i, s.bind(r), n);
        return o(), a;
      }
      function qi(e, t) {
        const n = t.split(".");
        return () => {
          let r = e;
          for (let i = 0; i < n.length && r; i++) r = r[n[i]];
          return r;
        };
      }
      const Bo = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${et(t)}Modifiers`] || e[`${ft(t)}Modifiers`];
      function Lo(e, t, ...n) {
        if (e.isUnmounted) return;
        const r = e.vnode.props || $;
        let i = n;
        const s = t.startsWith("update:"), o = s && Bo(r, t.slice(7));
        o && (o.trim && (i = n.map((u) => te(u) ? u.trim() : u)), o.number && (i = n.map(hs)));
        let a, f = r[a = Sn(t)] || r[a = Sn(et(t))];
        !f && s && (f = r[a = Sn(ft(t))]), f && je(f, e, 6, i);
        const h = r[a + "Once"];
        if (h) {
          if (!e.emitted) e.emitted = {};
          else if (e.emitted[a]) return;
          e.emitted[a] = true, je(h, e, 6, i);
        }
      }
      function Yi(e, t, n = false) {
        const r = t.emitsCache, i = r.get(e);
        if (i !== void 0) return i;
        const s = e.emits;
        let o = {}, a = false;
        if (!I(e)) {
          const f = (h) => {
            const u = Yi(h, t, true);
            u && (a = true, oe(o, u));
          };
          !n && t.mixins.length && t.mixins.forEach(f), e.extends && f(e.extends), e.mixins && e.mixins.forEach(f);
        }
        return !s && !a ? (Q(e) && r.set(e, null), null) : (A(s) ? s.forEach((f) => o[f] = null) : oe(o, s), Q(e) && r.set(e, o), o);
      }
      function yn(e, t) {
        return !e || !pn(t) ? false : (t = t.slice(2).replace(/Once$/, ""), V(e, t[0].toLowerCase() + t.slice(1)) || V(e, ft(t)) || V(e, t));
      }
      function Ir(e) {
        const { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [s], slots: o, attrs: a, emit: f, render: h, renderCache: u, props: p, data: T, setupState: C, ctx: j, inheritAttrs: D } = e, ee = fn(e);
        let z, K;
        try {
          if (n.shapeFlag & 4) {
            const M = i || r, Z = M;
            z = Ue(h.call(Z, M, u, p, C, T, j)), K = a;
          } else {
            const M = t;
            z = Ue(M.length > 1 ? M(p, {
              attrs: a,
              slots: o,
              emit: f
            }) : M(p, null)), K = t.props ? a : zo(a);
          }
        } catch (M) {
          Bt.length = 0, mn(M, e, 1), z = Re(tt);
        }
        let k = z;
        if (K && D !== false) {
          const M = Object.keys(K), { shapeFlag: Z } = k;
          M.length && Z & 7 && (s && M.some(Qn) && (K = No(K, s)), k = xt(k, K, false, true));
        }
        return n.dirs && (k = xt(k, null, false, true), k.dirs = k.dirs ? k.dirs.concat(n.dirs) : n.dirs), n.transition && dr(k, n.transition), z = k, fn(ee), z;
      }
      const zo = (e) => {
        let t;
        for (const n in e) (n === "class" || n === "style" || pn(n)) && ((t || (t = {}))[n] = e[n]);
        return t;
      }, No = (e, t) => {
        const n = {};
        for (const r in e) (!Qn(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
        return n;
      };
      function Vo(e, t, n) {
        const { props: r, children: i, component: s } = e, { props: o, children: a, patchFlag: f } = t, h = s.emitsOptions;
        if (t.dirs || t.transition) return true;
        if (n && f >= 0) {
          if (f & 1024) return true;
          if (f & 16) return r ? Fr(r, o, h) : !!o;
          if (f & 8) {
            const u = t.dynamicProps;
            for (let p = 0; p < u.length; p++) {
              const T = u[p];
              if (o[T] !== r[T] && !yn(h, T)) return true;
            }
          }
        } else return (i || a) && (!a || !a.$stable) ? true : r === o ? false : r ? o ? Fr(r, o, h) : true : !!o;
        return false;
      }
      function Fr(e, t, n) {
        const r = Object.keys(t);
        if (r.length !== Object.keys(e).length) return true;
        for (let i = 0; i < r.length; i++) {
          const s = r[i];
          if (t[s] !== e[s] && !yn(n, s)) return true;
        }
        return false;
      }
      function Go({ vnode: e, parent: t }, n) {
        for (; t; ) {
          const r = t.subTree;
          if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
          else break;
        }
      }
      const Xi = (e) => e.__isSuspense;
      function Ho(e, t) {
        t && t.pendingBranch ? A(e) ? t.effects.push(...e) : t.effects.push(e) : Qs(e);
      }
      const He = Symbol.for("v-fgt"), xn = Symbol.for("v-txt"), tt = Symbol.for("v-cmt"), tn = Symbol.for("v-stc"), Bt = [];
      let xe = null;
      function yt(e = false) {
        Bt.push(xe = e ? null : []);
      }
      function Wo() {
        Bt.pop(), xe = Bt[Bt.length - 1] || null;
      }
      let Ht = 1;
      function Ur(e, t = false) {
        Ht += e, e < 0 && xe && t && (xe.hasOnce = true);
      }
      function ki(e) {
        return e.dynamicChildren = Ht > 0 ? xe || gt : null, Wo(), Ht > 0 && xe && xe.push(e), e;
      }
      function Lt(e, t, n, r, i, s) {
        return ki(H(e, t, n, r, i, s, true));
      }
      function $o(e, t, n, r, i) {
        return ki(Re(e, t, n, r, i, true));
      }
      function Ji(e) {
        return e ? e.__v_isVNode === true : false;
      }
      function Rt(e, t) {
        return e.type === t.type && e.key === t.key;
      }
      const Qi = ({ key: e }) => e ?? null, nn = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? te(e) || se(e) || I(e) ? {
        i: Se,
        r: e,
        k: t,
        f: !!n
      } : e : null);
      function H(e, t = null, n = null, r = 0, i = null, s = e === He ? 0 : 1, o = false, a = false) {
        const f = {
          __v_isVNode: true,
          __v_skip: true,
          type: e,
          props: t,
          key: t && Qi(t),
          ref: t && nn(t),
          scopeId: Pi,
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
          ctx: Se
        };
        return a ? (br(f, n), s & 128 && e.normalize(f)) : n && (f.shapeFlag |= te(n) ? 8 : 16), Ht > 0 && !o && xe && (f.patchFlag > 0 || s & 6) && f.patchFlag !== 32 && xe.push(f), f;
      }
      const Re = Ko;
      function Ko(e, t = null, n = null, r = 0, i = null, s = false) {
        if ((!e || e === po) && (e = tt), Ji(e)) {
          const a = xt(e, t, true);
          return n && br(a, n), Ht > 0 && !s && xe && (a.shapeFlag & 6 ? xe[xe.indexOf(e)] = a : xe.push(a)), a.patchFlag = -2, a;
        }
        if (il(e) && (e = e.__vccOpts), t) {
          t = qo(t);
          let { class: a, style: f } = t;
          a && !te(a) && (t.class = bt(a)), Q(f) && (fr(f) && !A(f) && (f = oe({}, f)), t.style = tr(f));
        }
        const o = te(e) ? 1 : Xi(e) ? 128 : to(e) ? 64 : Q(e) ? 4 : I(e) ? 2 : 0;
        return H(e, t, n, r, i, o, s, true);
      }
      function qo(e) {
        return e ? fr(e) || Li(e) ? oe({}, e) : e : null;
      }
      function xt(e, t, n = false, r = false) {
        const { props: i, ref: s, patchFlag: o, children: a, transition: f } = e, h = t ? Xo(i || {}, t) : i, u = {
          __v_isVNode: true,
          __v_skip: true,
          type: e.type,
          props: h,
          key: h && Qi(h),
          ref: t && t.ref ? n && s ? A(s) ? s.concat(nn(t)) : [
            s,
            nn(t)
          ] : nn(t) : s,
          scopeId: e.scopeId,
          slotScopeIds: e.slotScopeIds,
          children: a,
          target: e.target,
          targetStart: e.targetStart,
          targetAnchor: e.targetAnchor,
          staticCount: e.staticCount,
          shapeFlag: e.shapeFlag,
          patchFlag: t && e.type !== He ? o === -1 ? 16 : o | 16 : o,
          dynamicProps: e.dynamicProps,
          dynamicChildren: e.dynamicChildren,
          appContext: e.appContext,
          dirs: e.dirs,
          transition: f,
          component: e.component,
          suspense: e.suspense,
          ssContent: e.ssContent && xt(e.ssContent),
          ssFallback: e.ssFallback && xt(e.ssFallback),
          placeholder: e.placeholder,
          el: e.el,
          anchor: e.anchor,
          ctx: e.ctx,
          ce: e.ce
        };
        return f && r && dr(u, f.clone(u)), u;
      }
      function fe(e = " ", t = 0) {
        return Re(xn, null, e, t);
      }
      function Yo(e, t) {
        const n = Re(tn, null, e);
        return n.staticCount = t, n;
      }
      function Dr(e = "", t = false) {
        return t ? (yt(), $o(tt, null, e)) : Re(tt, null, e);
      }
      function Ue(e) {
        return e == null || typeof e == "boolean" ? Re(tt) : A(e) ? Re(He, null, e.slice()) : Ji(e) ? Qe(e) : Re(xn, null, String(e));
      }
      function Qe(e) {
        return e.el === null && e.patchFlag !== -1 || e.memo ? e : xt(e);
      }
      function br(e, t) {
        let n = 0;
        const { shapeFlag: r } = e;
        if (t == null) t = null;
        else if (A(t)) n = 16;
        else if (typeof t == "object") if (r & 65) {
          const i = t.default;
          i && (i._c && (i._d = false), br(e, i()), i._c && (i._d = true));
          return;
        } else {
          n = 32;
          const i = t._;
          !i && !Li(t) ? t._ctx = Se : i === 3 && Se && (Se.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
        }
        else I(t) ? (t = {
          default: t,
          _ctx: Se
        }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
          fe(t)
        ]) : n = 8);
        e.children = t, e.shapeFlag |= n;
      }
      function Xo(...e) {
        const t = {};
        for (let n = 0; n < e.length; n++) {
          const r = e[n];
          for (const i in r) if (i === "class") t.class !== r.class && (t.class = bt([
            t.class,
            r.class
          ]));
          else if (i === "style") t.style = tr([
            t.style,
            r.style
          ]);
          else if (pn(i)) {
            const s = t[i], o = r[i];
            o && s !== o && !(A(s) && s.includes(o)) && (t[i] = s ? [].concat(s, o) : o);
          } else i !== "" && (t[i] = r[i]);
        }
        return t;
      }
      function Ie(e, t, n, r = null) {
        je(e, t, 7, [
          n,
          r
        ]);
      }
      const ko = Di();
      let Jo = 0;
      function Qo(e, t, n) {
        const r = e.type, i = (t ? t.appContext : e.appContext) || ko, s = {
          uid: Jo++,
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
          scope: new ys(true),
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
          propsOptions: Ni(r, i),
          emitsOptions: Yi(r, i),
          emit: null,
          emitted: null,
          propsDefaults: $,
          inheritAttrs: r.inheritAttrs,
          ctx: $,
          data: $,
          props: $,
          attrs: $,
          slots: $,
          refs: $,
          setupState: $,
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
        }, s.root = t ? t.root : s, s.emit = Lo.bind(null, s), e.ce && e.ce(s), s;
      }
      let he = null;
      const Zo = () => he || Se;
      let dn, Xn;
      {
        const e = bn(), t = (n, r) => {
          let i;
          return (i = e[n]) || (i = e[n] = []), i.push(r), (s) => {
            i.length > 1 ? i.forEach((o) => o(s)) : i[0](s);
          };
        };
        dn = t("__VUE_INSTANCE_SETTERS__", (n) => he = n), Xn = t("__VUE_SSR_SETTERS__", (n) => Wt = n);
      }
      const Kt = (e) => {
        const t = he;
        return dn(e), e.scope.on(), () => {
          e.scope.off(), dn(t);
        };
      }, jr = () => {
        he && he.scope.off(), dn(null);
      };
      function Zi(e) {
        return e.vnode.shapeFlag & 4;
      }
      let Wt = false;
      function el(e, t = false, n = false) {
        t && Xn(t);
        const { props: r, children: i } = e.vnode, s = Zi(e);
        To(e, r, s, t), Po(e, i, n || t);
        const o = s ? tl(e, t) : void 0;
        return t && Xn(false), o;
      }
      function tl(e, t) {
        const n = e.type;
        e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, go);
        const { setup: r } = n;
        if (r) {
          Ke();
          const i = e.setupContext = r.length > 1 ? rl(e) : null, s = Kt(e), o = $t(r, e, 0, [
            e.props,
            i
          ]), a = ti(o);
          if (qe(), s(), (a || e.sp) && !Dt(e) && Oi(e), a) {
            if (o.then(jr, jr), t) return o.then((f) => {
              Br(e, f);
            }).catch((f) => {
              mn(f, e, 0);
            });
            e.asyncDep = o;
          } else Br(e, o);
        } else es(e);
      }
      function Br(e, t, n) {
        I(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Q(t) && (e.setupState = Si(t)), es(e);
      }
      function es(e, t, n) {
        const r = e.type;
        e.render || (e.render = r.render || De);
        {
          const i = Kt(e);
          Ke();
          try {
            _o(e);
          } finally {
            qe(), i();
          }
        }
      }
      const nl = {
        get(e, t) {
          return ie(e, "get", ""), e[t];
        }
      };
      function rl(e) {
        const t = (n) => {
          e.exposed = n || {};
        };
        return {
          attrs: new Proxy(e.attrs, nl),
          slots: e.slots,
          emit: e.emit,
          expose: t
        };
      }
      function wn(e) {
        return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Si(Vs(e.exposed)), {
          get(t, n) {
            if (n in t) return t[n];
            if (n in jt) return jt[n](e);
          },
          has(t, n) {
            return n in t || n in jt;
          }
        })) : e.proxy;
      }
      function il(e) {
        return I(e) && "__vccOpts" in e;
      }
      const ts = (e, t) => qs(e, t, Wt), sl = "3.5.18";
      let kn;
      const Lr = typeof window < "u" && window.trustedTypes;
      if (Lr) try {
        kn = Lr.createPolicy("vue", {
          createHTML: (e) => e
        });
      } catch {
      }
      const ns = kn ? (e) => kn.createHTML(e) : (e) => e, ol = "http://www.w3.org/2000/svg", ll = "http://www.w3.org/1998/Math/MathML", Ge = typeof document < "u" ? document : null, zr = Ge && Ge.createElement("template"), al = {
        insert: (e, t, n) => {
          t.insertBefore(e, n || null);
        },
        remove: (e) => {
          const t = e.parentNode;
          t && t.removeChild(e);
        },
        createElement: (e, t, n, r) => {
          const i = t === "svg" ? Ge.createElementNS(ol, e) : t === "mathml" ? Ge.createElementNS(ll, e) : n ? Ge.createElement(e, {
            is: n
          }) : Ge.createElement(e);
          return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
        },
        createText: (e) => Ge.createTextNode(e),
        createComment: (e) => Ge.createComment(e),
        setText: (e, t) => {
          e.nodeValue = t;
        },
        setElementText: (e, t) => {
          e.textContent = t;
        },
        parentNode: (e) => e.parentNode,
        nextSibling: (e) => e.nextSibling,
        querySelector: (e) => Ge.querySelector(e),
        setScopeId(e, t) {
          e.setAttribute(t, "");
        },
        insertStaticContent(e, t, n, r, i, s) {
          const o = n ? n.previousSibling : t.lastChild;
          if (i && (i === s || i.nextSibling)) for (; t.insertBefore(i.cloneNode(true), n), !(i === s || !(i = i.nextSibling)); ) ;
          else {
            zr.innerHTML = ns(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
            const a = zr.content;
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
      }, cl = Symbol("_vtc");
      function fl(e, t, n) {
        const r = e[cl];
        r && (t = (t ? [
          t,
          ...r
        ] : [
          ...r
        ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
      }
      const hn = Symbol("_vod"), rs = Symbol("_vsh"), Fn = {
        beforeMount(e, { value: t }, { transition: n }) {
          e[hn] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : Et(e, t);
        },
        mounted(e, { value: t }, { transition: n }) {
          n && t && n.enter(e);
        },
        updated(e, { value: t, oldValue: n }, { transition: r }) {
          !t != !n && (r ? t ? (r.beforeEnter(e), Et(e, true), r.enter(e)) : r.leave(e, () => {
            Et(e, false);
          }) : Et(e, t));
        },
        beforeUnmount(e, { value: t }) {
          Et(e, t);
        }
      };
      function Et(e, t) {
        e.style.display = t ? e[hn] : "none", e[rs] = !t;
      }
      const ul = Symbol(""), dl = /(^|;)\s*display\s*:/;
      function hl(e, t, n) {
        const r = e.style, i = te(n);
        let s = false;
        if (n && !i) {
          if (t) if (te(t)) for (const o of t.split(";")) {
            const a = o.slice(0, o.indexOf(":")).trim();
            n[a] == null && rn(r, a, "");
          }
          else for (const o in t) n[o] == null && rn(r, o, "");
          for (const o in n) o === "display" && (s = true), rn(r, o, n[o]);
        } else if (i) {
          if (t !== n) {
            const o = r[ul];
            o && (n += ";" + o), r.cssText = n, s = dl.test(n);
          }
        } else t && e.removeAttribute("style");
        hn in e && (e[hn] = s ? r.display : "", e[rs] && (r.display = "none"));
      }
      const Nr = /\s*!important$/;
      function rn(e, t, n) {
        if (A(n)) n.forEach((r) => rn(e, t, r));
        else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
        else {
          const r = pl(e, t);
          Nr.test(n) ? e.setProperty(ft(r), n.replace(Nr, ""), "important") : e[r] = n;
        }
      }
      const Vr = [
        "Webkit",
        "Moz",
        "ms"
      ], Un = {};
      function pl(e, t) {
        const n = Un[t];
        if (n) return n;
        let r = et(t);
        if (r !== "filter" && r in e) return Un[t] = r;
        r = ii(r);
        for (let i = 0; i < Vr.length; i++) {
          const s = Vr[i] + r;
          if (s in e) return Un[t] = s;
        }
        return t;
      }
      const Gr = "http://www.w3.org/1999/xlink";
      function Hr(e, t, n, r, i, s = vs(t)) {
        r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Gr, t.slice(6, t.length)) : e.setAttributeNS(Gr, t, n) : n == null || s && !si(n) ? e.removeAttribute(t) : e.setAttribute(t, s ? "" : nt(n) ? String(n) : n);
      }
      function Wr(e, t, n, r, i) {
        if (t === "innerHTML" || t === "textContent") {
          n != null && (e[t] = t === "innerHTML" ? ns(n) : n);
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
          a === "boolean" ? n = si(n) : n == null && a === "string" ? (n = "", o = true) : a === "number" && (n = 0, o = true);
        }
        try {
          e[t] = n;
        } catch {
        }
        o && e.removeAttribute(i || t);
      }
      function gl(e, t, n, r) {
        e.addEventListener(t, n, r);
      }
      function _l(e, t, n, r) {
        e.removeEventListener(t, n, r);
      }
      const $r = Symbol("_vei");
      function bl(e, t, n, r, i = null) {
        const s = e[$r] || (e[$r] = {}), o = s[t];
        if (r && o) o.value = r;
        else {
          const [a, f] = ml(t);
          if (r) {
            const h = s[t] = xl(r, i);
            gl(e, a, h, f);
          } else o && (_l(e, a, o, f), s[t] = void 0);
        }
      }
      const Kr = /(?:Once|Passive|Capture)$/;
      function ml(e) {
        let t;
        if (Kr.test(e)) {
          t = {};
          let r;
          for (; r = e.match(Kr); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
        }
        return [
          e[2] === ":" ? e.slice(3) : ft(e.slice(2)),
          t
        ];
      }
      let Dn = 0;
      const vl = Promise.resolve(), yl = () => Dn || (vl.then(() => Dn = 0), Dn = Date.now());
      function xl(e, t) {
        const n = (r) => {
          if (!r._vts) r._vts = Date.now();
          else if (r._vts <= n.attached) return;
          je(wl(r, n.value), t, 5, [
            r
          ]);
        };
        return n.value = e, n.attached = yl(), n;
      }
      function wl(e, t) {
        if (A(t)) {
          const n = e.stopImmediatePropagation;
          return e.stopImmediatePropagation = () => {
            n.call(e), e._stopped = true;
          }, t.map((r) => (i) => !i._stopped && r && r(i));
        } else return t;
      }
      const qr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Sl = (e, t, n, r, i, s) => {
        const o = i === "svg";
        t === "class" ? fl(e, r, o) : t === "style" ? hl(e, n, r) : pn(t) ? Qn(t) || bl(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Tl(e, t, r, o)) ? (Wr(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Hr(e, t, r, o, s, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !te(r)) ? Wr(e, et(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), Hr(e, t, r, o));
      };
      function Tl(e, t, n, r) {
        if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && qr(t) && I(n));
        if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
        if (t === "width" || t === "height") {
          const i = e.tagName;
          if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE") return false;
        }
        return qr(t) && te(n) ? false : t in e;
      }
      const Cl = oe({
        patchProp: Sl
      }, al);
      let Yr;
      function Rl() {
        return Yr || (Yr = Oo(Cl));
      }
      const El = (...e) => {
        const t = Rl().createApp(...e), { mount: n } = t;
        return t.mount = (r) => {
          const i = Ml(r);
          if (!i) return;
          const s = t._component;
          !I(s) && !s.render && !s.template && (s.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
          const o = n(i, false, Pl(i));
          return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), o;
        }, t;
      };
      function Pl(e) {
        if (e instanceof SVGElement) return "svg";
        if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
      }
      function Ml(e) {
        return te(e) ? document.querySelector(e) : e;
      }
      const Ol = `struct MandelbrotStep {
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
`, Al = `struct Uniforms {
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
}`, Il = `// filepath: /Users/guillaumecollombet/RustroverProjects/untitled/src/assets/reproject.wgsl
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
`, Fl = "/mandelbrot/assets/mandelbrot_bg-CMJ4_2Jn.wasm", Ul = async (e = {}, t) => {
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
      let F;
      function Dl(e) {
        F = e;
      }
      let Jt = null;
      function sn() {
        return (Jt === null || Jt.byteLength === 0) && (Jt = new Uint8Array(F.memory.buffer)), Jt;
      }
      const is = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
      let on = new is("utf-8", {
        ignoreBOM: true,
        fatal: true
      });
      on.decode();
      const jl = 2146435072;
      let jn = 0;
      function Bl(e, t) {
        return jn += t, jn >= jl && (on = new is("utf-8", {
          ignoreBOM: true,
          fatal: true
        }), on.decode(), jn = t), on.decode(sn().subarray(e, e + t));
      }
      function ss(e, t) {
        return e = e >>> 0, Bl(e, t);
      }
      let Qt = null;
      function Ll() {
        return (Qt === null || Qt.byteLength === 0) && (Qt = new Float64Array(F.memory.buffer)), Qt;
      }
      function zl(e, t) {
        return e = e >>> 0, Ll().subarray(e / 8, e / 8 + t);
      }
      let ht = null;
      function Nl() {
        return (ht === null || ht.buffer.detached === true || ht.buffer.detached === void 0 && ht.buffer !== F.memory.buffer) && (ht = new DataView(F.memory.buffer)), ht;
      }
      function Vl(e, t) {
        e = e >>> 0;
        const n = Nl(), r = [];
        for (let i = e; i < e + 4 * t; i += 4) r.push(F.__wbindgen_export_0.get(n.getUint32(i, true)));
        return F.__externref_drop_slice(e, t), r;
      }
      let zt = 0;
      const Gl = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder, ln = new Gl("utf-8"), Hl = typeof ln.encodeInto == "function" ? function(e, t) {
        return ln.encodeInto(e, t);
      } : function(e, t) {
        const n = ln.encode(e);
        return t.set(n), {
          read: e.length,
          written: n.length
        };
      };
      function Bn(e, t, n) {
        if (n === void 0) {
          const a = ln.encode(e), f = t(a.length, 1) >>> 0;
          return sn().subarray(f, f + a.length).set(a), zt = a.length, f;
        }
        let r = e.length, i = t(r, 1) >>> 0;
        const s = sn();
        let o = 0;
        for (; o < r; o++) {
          const a = e.charCodeAt(o);
          if (a > 127) break;
          s[i + o] = a;
        }
        if (o !== r) {
          o !== 0 && (e = e.slice(o)), i = n(i, r, r = o + e.length * 3, 1) >>> 0;
          const a = sn().subarray(i + o, i + r), f = Hl(e, a);
          o += f.written, i = n(i, r, o, 1) >>> 0;
        }
        return zt = o, i;
      }
      const Xr = typeof FinalizationRegistry > "u" ? {
        register: () => {
        },
        unregister: () => {
        }
      } : new FinalizationRegistry((e) => F.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
      class Wl {
        __destroy_into_raw() {
          const t = this.__wbg_ptr;
          return this.__wbg_ptr = 0, Xr.unregister(this), t;
        }
        free() {
          const t = this.__destroy_into_raw();
          F.__wbg_mandelbrotnavigator_free(t, 0);
        }
        constructor(t, n, r, i, s) {
          const o = F.mandelbrotnavigator_new(t, n, r, i, s);
          return this.__wbg_ptr = o >>> 0, Xr.register(this, this.__wbg_ptr, this), this;
        }
        translate(t, n) {
          F.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
        }
        rotate(t) {
          F.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
        }
        translate_direct(t, n) {
          F.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
        }
        rotate_direct(t) {
          F.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
        }
        zoom(t) {
          F.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
        }
        step() {
          const t = F.mandelbrotnavigator_step(this.__wbg_ptr);
          var n = zl(t[0], t[1]).slice();
          return F.__wbindgen_free(t[0], t[1] * 8, 8), n;
        }
        get_params() {
          const t = F.mandelbrotnavigator_get_params(this.__wbg_ptr);
          var n = Vl(t[0], t[1]).slice();
          return F.__wbindgen_free(t[0], t[1] * 4, 4), n;
        }
        compute_reference_orbit_ptr(t) {
          const n = F.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
          return mr.__wrap(n);
        }
        get_reference_orbit_len() {
          return F.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        get_reference_orbit_capacity() {
          return F.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        scale(t) {
          const n = Bn(t, F.__wbindgen_malloc, F.__wbindgen_realloc), r = zt;
          F.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
        }
        angle(t) {
          F.mandelbrotnavigator_angle(this.__wbg_ptr, t);
        }
        origin(t, n) {
          const r = Bn(t, F.__wbindgen_malloc, F.__wbindgen_realloc), i = zt, s = Bn(n, F.__wbindgen_malloc, F.__wbindgen_realloc), o = zt;
          F.mandelbrotnavigator_origin(this.__wbg_ptr, r, i, s, o);
        }
      }
      typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => F.__wbg_mandelbrotstep_free(e >>> 0, 1));
      const kr = typeof FinalizationRegistry > "u" ? {
        register: () => {
        },
        unregister: () => {
        }
      } : new FinalizationRegistry((e) => F.__wbg_orbitbufferinfo_free(e >>> 0, 1));
      class mr {
        static __wrap(t) {
          t = t >>> 0;
          const n = Object.create(mr.prototype);
          return n.__wbg_ptr = t, kr.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
          const t = this.__wbg_ptr;
          return this.__wbg_ptr = 0, kr.unregister(this), t;
        }
        free() {
          const t = this.__destroy_into_raw();
          F.__wbg_orbitbufferinfo_free(t, 0);
        }
        get ptr() {
          return F.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(t) {
          F.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
        }
        get offset() {
          return F.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
        }
        set offset(t) {
          F.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
        }
        get count() {
          return F.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set count(t) {
          F.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
        }
      }
      function $l(e) {
        console.debug(e);
      }
      function Kl(e) {
        console.error(e);
      }
      function ql(e) {
        console.info(e);
      }
      function Yl(e) {
        console.log(e);
      }
      function Xl() {
        return Date.now();
      }
      function kl(e) {
        console.warn(e);
      }
      function Jl() {
        const e = F.__wbindgen_export_0, t = e.grow(4);
        e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
      }
      function Ql(e, t) {
        return ss(e, t);
      }
      function Zl(e, t) {
        throw new Error(ss(e, t));
      }
      URL = globalThis.URL;
      const U = await Ul({
        "./mandelbrot_bg.js": {
          __wbindgen_string_new: Ql,
          __wbg_debug_58d16ea352cfbca1: $l,
          __wbg_error_51ecdd39ec054205: Kl,
          __wbg_info_e56933705c348038: ql,
          __wbg_log_ea240990d83e374e: Yl,
          __wbg_warn_d89f6637da554c8d: kl,
          __wbg_now_eb0821f3bd9f6529: Xl,
          __wbindgen_throw: Zl,
          __wbindgen_init_externref_table: Jl
        }
      }, Fl), os = U.memory, ea = U.__wbg_mandelbrotstep_free, ta = U.__wbg_get_mandelbrotstep_zx, na = U.__wbg_set_mandelbrotstep_zx, ra = U.__wbg_get_mandelbrotstep_zy, ia = U.__wbg_set_mandelbrotstep_zy, sa = U.__wbg_get_mandelbrotstep_dx, oa = U.__wbg_set_mandelbrotstep_dx, la = U.__wbg_get_mandelbrotstep_dy, aa = U.__wbg_set_mandelbrotstep_dy, ca = U.__wbg_mandelbrotnavigator_free, fa = U.mandelbrotnavigator_new, ua = U.mandelbrotnavigator_translate, da = U.mandelbrotnavigator_rotate, ha = U.mandelbrotnavigator_translate_direct, pa = U.mandelbrotnavigator_rotate_direct, ga = U.mandelbrotnavigator_zoom, _a = U.mandelbrotnavigator_step, ba = U.mandelbrotnavigator_get_params, ma = U.mandelbrotnavigator_compute_reference_orbit_ptr, va = U.mandelbrotnavigator_get_reference_orbit_len, ya = U.mandelbrotnavigator_get_reference_orbit_capacity, xa = U.mandelbrotnavigator_scale, wa = U.mandelbrotnavigator_angle, Sa = U.mandelbrotnavigator_origin, Ta = U.__wbg_orbitbufferinfo_free, Ca = U.__wbg_get_orbitbufferinfo_ptr, Ra = U.__wbg_set_orbitbufferinfo_ptr, Ea = U.__wbg_get_orbitbufferinfo_offset, Pa = U.__wbg_set_orbitbufferinfo_offset, Ma = U.__wbg_get_orbitbufferinfo_count, Oa = U.__wbg_set_orbitbufferinfo_count, Aa = U.__wbindgen_export_0, Ia = U.__wbindgen_free, Fa = U.__externref_drop_slice, Ua = U.__wbindgen_malloc, Da = U.__wbindgen_realloc, ls = U.__wbindgen_start, ja = Object.freeze(Object.defineProperty({
        __proto__: null,
        __externref_drop_slice: Fa,
        __wbg_get_mandelbrotstep_dx: sa,
        __wbg_get_mandelbrotstep_dy: la,
        __wbg_get_mandelbrotstep_zx: ta,
        __wbg_get_mandelbrotstep_zy: ra,
        __wbg_get_orbitbufferinfo_count: Ma,
        __wbg_get_orbitbufferinfo_offset: Ea,
        __wbg_get_orbitbufferinfo_ptr: Ca,
        __wbg_mandelbrotnavigator_free: ca,
        __wbg_mandelbrotstep_free: ea,
        __wbg_orbitbufferinfo_free: Ta,
        __wbg_set_mandelbrotstep_dx: oa,
        __wbg_set_mandelbrotstep_dy: aa,
        __wbg_set_mandelbrotstep_zx: na,
        __wbg_set_mandelbrotstep_zy: ia,
        __wbg_set_orbitbufferinfo_count: Oa,
        __wbg_set_orbitbufferinfo_offset: Pa,
        __wbg_set_orbitbufferinfo_ptr: Ra,
        __wbindgen_export_0: Aa,
        __wbindgen_free: Ia,
        __wbindgen_malloc: Ua,
        __wbindgen_realloc: Da,
        __wbindgen_start: ls,
        mandelbrotnavigator_angle: wa,
        mandelbrotnavigator_compute_reference_orbit_ptr: ma,
        mandelbrotnavigator_get_params: ba,
        mandelbrotnavigator_get_reference_orbit_capacity: ya,
        mandelbrotnavigator_get_reference_orbit_len: va,
        mandelbrotnavigator_new: fa,
        mandelbrotnavigator_origin: Sa,
        mandelbrotnavigator_rotate: da,
        mandelbrotnavigator_rotate_direct: pa,
        mandelbrotnavigator_scale: xa,
        mandelbrotnavigator_step: _a,
        mandelbrotnavigator_translate: ua,
        mandelbrotnavigator_translate_direct: ha,
        mandelbrotnavigator_zoom: ga,
        memory: os
      }, Symbol.toStringTag, {
        value: "Module"
      }));
      Dl(ja);
      ls();
      class Ba {
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
          __publicField(this, "pipelineComputeIteration");
          __publicField(this, "pipelineColor");
          __publicField(this, "bindGroupComputeIteration");
          __publicField(this, "bindGroupColor");
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
          this.canvas = t, this.shaderPass1 = Ol, this.shaderPass2 = Al, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
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
          this.device = await this.adapter.requestDevice(), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({
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
            code: Il,
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
          }), this.pipelineComputeIteration = this.device.createRenderPipeline({
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
          }), this.pipelineColor = this.device.createRenderPipeline({
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
          })), this.bindGroupComputeIteration = void 0, this.bindGroupColor = void 0, this.bindGroupReproject = void 0;
        }
        resize() {
          var _a2, _b, _c, _d, _e2, _f;
          const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) ?? this.canvas.clientWidth, i = (n == null ? void 0 : n.clientHeight) ?? this.canvas.clientHeight;
          if (this.width = Math.max(1, Math.round(r * t)), this.height = Math.max(1, Math.round(i * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = i + "px", this.ctx.configure({
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
          }), this.historyView = this.historyTexture.createView(), this.reprojectTexture && ((_f = (_e2 = this.reprojectTexture).destroy) == null ? void 0 : _f.call(_e2)), this.reprojectTexture = this.device.createTexture({
            size: {
              width: this.width,
              height: this.height,
              depthOrArrayLayers: 1
            },
            format: "rgba16float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: "Engine ReprojectTexture"
          }), this.reprojectView = this.reprojectTexture.createView(), this.pipelineReproject) {
            const s = this.pipelineReproject.getBindGroupLayout(0);
            this.bindGroupReproject = this.device.createBindGroup({
              layout: s,
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
          if (this.pipelineComputeIteration) {
            const s = this.pipelineComputeIteration.getBindGroupLayout(0);
            this.bindGroupComputeIteration = this.device.createBindGroup({
              layout: s,
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
          if (this.pipelineColor) {
            const s = this.pipelineColor.getBindGroupLayout(0), o = [
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
            this.bindGroupColor = this.device.createBindGroup({
              layout: s,
              entries: o,
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
          const h = new Float32Array(os.buffer, f.ptr, f.count * 4);
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
          if (!t && !this.needRender && this.extraFrames <= 0 || (!this.needRender && this.extraFrames > 0 && this.extraFrames--, !this.pipelineComputeIteration || !this.pipelineColor || !this.pipelineReproject)) return;
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
            this.prevFrameMandelbrot && !t && (o.setPipeline(this.pipelineReproject), o.setBindGroup(0, this.bindGroupReproject), o.draw(6, 1, 0, 0)), o.end();
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
          r.setPipeline(this.pipelineComputeIteration), this.bindGroupComputeIteration && r.setBindGroup(0, this.bindGroupComputeIteration), r.draw(6, 1, 0, 0), r.end();
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
          s.setPipeline(this.pipelineColor), this.bindGroupColor && s.setBindGroup(0, this.bindGroupColor), s.draw(6, 1, 0, 0), s.end(), this.historyTexture && this.intermediateTexture && n.copyTextureToTexture({
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
          var _a2, _b, _c, _d, _e2, _f, _g, _h, _i2, _j;
          (_b = (_a2 = this.intermediateTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d = (_c = this.mandelbrotReferenceBuffer) == null ? void 0 : _c.destroy) == null ? void 0 : _d.call(_c), (_f = (_e2 = this.historyTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f.call(_e2), (_h = (_g = this.reprojectTexture) == null ? void 0 : _g.destroy) == null ? void 0 : _h.call(_g), (_j = (_i2 = this.uniformBufferReproject) == null ? void 0 : _i2.destroy) == null ? void 0 : _j.call(_i2);
        }
      }
      const La = {
        style: {
          position: "relative",
          height: "100vh",
          width: "100vw"
        }
      }, za = {
        class: "tag is-black"
      }, Na = {
        class: "tag is-black"
      }, Va = {
        class: "tag is-black"
      }, Ga = {
        class: "tag is-black"
      }, Ha = {
        class: "tag is-black"
      }, Wa = {
        class: "tag is-black"
      }, $a = {
        class: "tag is-black"
      }, Ka = {
        class: "tag is-black"
      }, qa = {
        href: "https://github.com/gcollombet/mandelbrot",
        target: "_blank",
        rel: "noopener",
        class: "footer-link",
        "aria-label": "GitHub"
      }, Ya = {
        class: "github-logo",
        height: "20",
        viewBox: "0 0 16 16",
        width: "20",
        fill: "currentColor",
        style: {
          "vertical-align": "middle",
          "margin-right": "4px"
        }
      }, Xa = {
        key: 1,
        class: "intro-title-container"
      }, Jr = 1, Qr = 128, Zt = 0.04, Zr = 0.025, ka = Mi({
        __name: "MandelbrotNavigator",
        setup(e) {
          const t = Pt(null);
          let n, r, i;
          const s = Pt({
            cx: "-1.5",
            cy: "0.0",
            mu: 1e4,
            scale: "2.5",
            angle: "0.0",
            maxIterations: 1e3,
            antialiasLevel: Jr,
            palettePeriod: Qr
          }), o = {};
          function a(R) {
            o[R.code] = true;
          }
          function f(R) {
            o[R.code] = false;
          }
          function h(R) {
            R.preventDefault();
            const v = 0.8;
            R.deltaY < 0 ? i.zoom(v) : i.zoom(1 / v);
          }
          let u = false, p = false, T = 0, C = 0;
          const j = Pt(false);
          let D = 0, ee = 0, z = 0, K = false;
          function k() {
            typeof window < "u" && window.navigator ? j.value = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent) : j.value = false;
          }
          function M(R) {
            const v = t.value;
            if (!v) return {
              x: 0,
              y: 0,
              width: 0,
              height: 0
            };
            const B = v.getBoundingClientRect();
            return {
              x: R.clientX - B.left,
              y: R.clientY - B.top,
              width: B.width,
              height: B.height
            };
          }
          function Z(R) {
            if (R.button === 2) p = true;
            else {
              u = true;
              const v = M(R);
              T = v.x, C = v.y;
            }
          }
          function Ee(R) {
            var _a2;
            const v = M(R);
            if (p) {
              const me = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
              if (!me) return;
              const qt = me.width / 2, l = me.height / 2, c = v.x, d = v.y, b = Math.atan2(d - l, c - qt);
              i.angle(b);
              return;
            }
            if (!u) return;
            const B = v.width, le = v.height, ne = B / le, re = (v.x - T) / B * 2, ae = (v.y - C) / le * 2, ze = -re * ne, ke = ae;
            i.translate_direct(ze, ke), T = v.x, C = v.y;
          }
          function we(R) {
            R.button === 2 ? p = false : u = false;
          }
          function Pe(R) {
            var _a2;
            if (R.touches.length === 1) {
              u = true;
              const v = R.touches[0], B = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
              if (!B) return;
              T = v.clientX - B.left, C = v.clientY - B.top;
            } else if (R.touches.length === 2) {
              u = false, K = true;
              const [v, B] = R.touches;
              D = Math.hypot(B.clientX - v.clientX, B.clientY - v.clientY), ee = Math.atan2(B.clientY - v.clientY, B.clientX - v.clientX), z = parseFloat(s.value.angle);
            }
          }
          function ut(R) {
            var _a2;
            if (u && R.touches.length === 1) {
              const v = R.touches[0], B = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
              if (!B) return;
              const le = v.clientX - B.left, ne = v.clientY - B.top, re = B.width, ae = B.height, ze = re / ae, ke = (le - T) / re * 2, me = (ne - C) / ae * 2;
              i.translate_direct(-ke * ze, me), T = le, C = ne;
            } else if (K && R.touches.length === 2) {
              const [v, B] = R.touches, le = Math.hypot(B.clientX - v.clientX, B.clientY - v.clientY), ne = Math.atan2(B.clientY - v.clientY, B.clientX - v.clientX), re = D / le;
              i.zoom(re);
              const ae = ne - ee;
              i.angle(z + ae);
            }
          }
          function Be(R) {
            R.touches.length === 0 && (u = false, K = false);
          }
          function Xe() {
            o.KeyW && i.translate(0, Zt), o.KeyS && i.translate(0, -Zt), o.KeyA && i.translate(-Zt, 0), o.KeyD && i.translate(Zt, 0), o.KeyQ && i.rotate(Zr), o.KeyE && i.rotate(-Zr);
            const R = 0.7;
            o.KeyR && i.zoom(R), o.KeyF && i.zoom(1 / R), setTimeout(Xe, 16);
          }
          function rt() {
            it(), requestAnimationFrame(rt);
          }
          function it(R = false) {
            const v = s.value.epsilon, [B, le, ne, re] = i.step(), [ae, ze, ke, me] = i.get_params(), qt = s.value.mu;
            s.value.cx = ae, s.value.cy = ze, s.value.scale = ke, s.value.angle = me;
            const l = Math.min(Math.max(100, 80 + 20 * Math.log2(1 / ne)), 1e6);
            r.update({
              cx: B,
              cy: le,
              mu: qt,
              scale: ne,
              angle: re,
              maxIterations: l,
              epsilon: v
            }, {
              antialiasLevel: Jr,
              palettePeriod: Qr
            }), r.render(R);
          }
          async function wt() {
            t.value && (n = t.value, i = new Wl(-0.5572506229492065, 0.6355989165839159, 5e3, 1e3, 0), r = new Ba(n, {
              antialiasLevel: 1,
              palettePeriod: 128
            }), await r.initialize(i), window.addEventListener("keydown", a), window.addEventListener("keyup", f), n.addEventListener("wheel", h, {
              passive: false
            }), n.addEventListener("mousedown", Z), n.addEventListener("contextmenu", function(R) {
              R.preventDefault();
            }), window.addEventListener("mousemove", Ee), window.addEventListener("mouseup", we), Xe(), rt());
          }
          function St() {
            if (!t.value || !r) return;
            const R = t.value.getBoundingClientRect();
            t.value.width = R.width, t.value.height = R.height, r.resize(), it(true);
          }
          const J = Pt(false);
          async function X() {
            if (!i) return;
            await Wn(), await new Promise((le) => setTimeout(le, 500));
            const R = 3500, v = performance.now();
            function B(le) {
              const ne = Math.min((le - v) / R, 1), re = ne < 0.5 ? 2 * ne * ne : -1 + (4 - 2 * ne) * ne, ae = Math.PI / 2 * re;
              i.zoom(re), i.angle(ae), ne < 1 ? requestAnimationFrame(B) : J.value = true;
            }
            requestAnimationFrame(B);
          }
          function W() {
            var _a2;
            const R = window.navigator.language || ((_a2 = window.navigator.languages) == null ? void 0 : _a2[0]) || "en";
            return R.startsWith("fr") || R.startsWith("be") ? "azerty" : (R.startsWith("en") || R.startsWith("us"), "qwerty");
          }
          const Le = W(), be = ts(() => Le === "azerty" ? {
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
          return hr(async () => {
            k(), await wt(), window.addEventListener("resize", St), t.value && (t.value.addEventListener("touchstart", Pe, {
              passive: false
            }), t.value.addEventListener("touchmove", ut, {
              passive: false
            }), t.value.addEventListener("touchend", Be, {
              passive: false
            })), await Wn(), await X();
          }), pr(() => {
            window.removeEventListener("resize", St);
          }), (R, v) => (yt(), Lt("div", La, [
            Mn(H("button", {
              class: bt([
                "menu-hamburger tag is-light is-medium animate__animated",
                J.value ? "animate__fadeInDown" : ""
              ]),
              "aria-label": "Menu"
            }, v[1] || (v[1] = [
              H("span", {
                class: "hamburger-bar"
              }, null, -1),
              H("span", {
                class: "hamburger-bar"
              }, null, -1),
              H("span", {
                class: "hamburger-bar"
              }, null, -1)
            ]), 2), [
              [
                Fn,
                J.value
              ]
            ]),
            H("canvas", {
              ref_key: "canvasRef",
              ref: t,
              style: {
                width: "100%",
                height: "100%",
                display: "block"
              }
            }, null, 512),
            Dr("", true),
            Mn(H("div", {
              class: bt([
                "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
                J.value ? "animate__fadeInUp" : ""
              ])
            }, [
              v[2] || (v[2] = fe(" Move\xA0 ", -1)),
              v[3] || (v[3] = H("span", {
                class: "tag is-black"
              }, "Left clic", -1)),
              v[4] || (v[4] = fe("\xA0 ", -1)),
              H("span", za, Ve(be.value.up), 1),
              v[5] || (v[5] = fe("\xA0 ", -1)),
              H("span", Na, Ve(be.value.left), 1),
              v[6] || (v[6] = fe("\xA0 ", -1)),
              H("span", Va, Ve(be.value.down), 1),
              v[7] || (v[7] = fe("\xA0 ", -1)),
              H("span", Ga, Ve(be.value.right), 1),
              v[8] || (v[8] = fe("\xA0 |\xA0Rotate\xA0 ", -1)),
              v[9] || (v[9] = H("span", {
                class: "tag is-black"
              }, "Right clic", -1)),
              v[10] || (v[10] = fe("\xA0 ", -1)),
              H("span", Ha, Ve(be.value.rotateLeft), 1),
              v[11] || (v[11] = fe("\xA0 ", -1)),
              H("span", Wa, Ve(be.value.rotateRight), 1),
              v[12] || (v[12] = fe("\xA0 |\xA0Zoom\xA0 ", -1)),
              v[13] || (v[13] = H("span", {
                class: "tag is-black"
              }, "Wheel", -1)),
              v[14] || (v[14] = fe("\xA0 ", -1)),
              H("span", $a, Ve(be.value.zoomIn), 1),
              v[15] || (v[15] = fe("\xA0 ", -1)),
              H("span", Ka, Ve(be.value.zoomOut), 1)
            ], 2), [
              [
                Fn,
                J.value
              ]
            ]),
            Mn(H("div", {
              class: bt([
                "footer-love tag is-light is-medium is-hidden-touch animate__animated",
                J.value ? "animate__fadeInUp" : ""
              ])
            }, [
              v[18] || (v[18] = H("small", null, [
                H("a", {
                  href: "https://wgpu.rs/",
                  target: "_blank",
                  rel: "noopener",
                  class: "footer-link",
                  "aria-label": "wGPU"
                }, [
                  fe(" Made with "),
                  H("img", {
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
              v[19] || (v[19] = fe(" \xA0|\xA0 ", -1)),
              H("small", null, [
                H("a", qa, [
                  (yt(), Lt("svg", Ya, v[16] || (v[16] = [
                    H("path", {
                      d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                    }, null, -1)
                  ]))),
                  v[17] || (v[17] = fe(" GitHub ", -1))
                ])
              ])
            ], 2), [
              [
                Fn,
                J.value
              ]
            ]),
            J.value ? Dr("", true) : (yt(), Lt("div", Xa, v[20] || (v[20] = [
              H("div", {
                class: "animate__animated animate__fadeIn"
              }, [
                H("h1", {
                  class: "intro-title animate__animated animate__fadeInDown"
                }, "Realtime Mandelbrot Viewer"),
                H("h2", {
                  class: "intro-sub animate__animated animate__fadeInUp animate__delay-1s"
                }, "deep zoom")
              ], -1)
            ])))
          ]));
        }
      }), Ja = {
        key: 0,
        id: "fullscreen"
      }, Qa = {
        key: 1,
        class: "section is-flex is-flex-direction-column is-align-items-center is-justify-content-center",
        style: {
          height: "100vh"
        }
      }, Za = Mi({
        __name: "App",
        setup(e) {
          const t = Pt(false);
          return hr(() => {
            t.value = typeof navigator < "u" && "gpu" in navigator;
          }), (n, r) => t.value ? (yt(), Lt("div", Ja, [
            Re(ka)
          ])) : (yt(), Lt("div", Qa, r[0] || (r[0] = [
            Yo('<div class="box has-text-centered" style="max-width:400px;"><span class="icon is-large has-text-danger"><i class="fas fa-exclamation-triangle fa-2x"></i></span><h1 class="title is-4 mt-3">WebGPU non support\xE9</h1><p>Ce navigateur ne supporte pas WebGPU.<br> Veuillez utiliser un navigateur compatible WebGPU.</p><a class="button is-link mt-4" href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility" target="_blank"> Liste des navigateurs compatibles WebGPU </a></div>', 1)
          ])));
        }
      });
      "serviceWorker" in navigator && window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js");
      });
      El(Za).mount("#app");
    })();
  }
});
export default require_stdin();
