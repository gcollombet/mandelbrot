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
      const $ = {}, mt = [], ze = () => {
      }, as = () => false, pn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Qn = (e) => e.startsWith("onUpdate:"), le = Object.assign, Zn = (e, t) => {
        const n = e.indexOf(t);
        n > -1 && e.splice(n, 1);
      }, cs = Object.prototype.hasOwnProperty, N = (e, t) => cs.call(e, t), A = Array.isArray, vt = (e) => gn(e) === "[object Map]", ei = (e) => gn(e) === "[object Set]", I = (e) => typeof e == "function", re = (e) => typeof e == "string", et = (e) => typeof e == "symbol", J = (e) => e !== null && typeof e == "object", ti = (e) => (J(e) || I(e)) && I(e.then) && I(e.catch), ni = Object.prototype.toString, gn = (e) => ni.call(e), fs = (e) => gn(e).slice(8, -1), ri = (e) => gn(e) === "[object Object]", er = (e) => re(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, At = Jn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), _n = (e) => {
        const t = /* @__PURE__ */ Object.create(null);
        return (n) => t[n] || (t[n] = e(n));
      }, us = /-(\w)/g, Qe = _n((e) => e.replace(us, (t, n) => n ? n.toUpperCase() : "")), ds = /\B([A-Z])/g, at = _n((e) => e.replace(ds, "-$1").toLowerCase()), ii = _n((e) => e.charAt(0).toUpperCase() + e.slice(1)), Tn = _n((e) => e ? `on${ii(e)}` : ""), Je = (e, t) => !Object.is(e, t), Sn = (e, ...t) => {
        for (let n = 0; n < e.length; n++) e[n](...t);
      }, jn = (e, t, n, r = false) => {
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
            const r = e[n], i = re(r) ? bs(r) : tr(r);
            if (i) for (const s in i) t[s] = i[s];
          }
          return t;
        } else if (re(e) || J(e)) return e;
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
      function xt(e) {
        let t = "";
        if (re(e)) t = e;
        else if (A(e)) for (let n = 0; n < e.length; n++) {
          const r = xt(e[n]);
          r && (t += r + " ");
        }
        else if (J(e)) for (const n in e) e[n] && (t += n + " ");
        return t.trim();
      }
      const ms = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", vs = Jn(ms);
      function si(e) {
        return !!e || e === "";
      }
      const oi = (e) => !!(e && e.__v_isRef === true), Ge = (e) => re(e) ? e : e == null ? "" : A(e) || J(e) && (e.toString === ni || !I(e.toString)) ? oi(e) ? Ge(e.value) : JSON.stringify(e, li, 2) : String(e), li = (e, t) => oi(t) ? li(e, t.value) : vt(t) ? {
        [`Map(${t.size})`]: [
          ...t.entries()
        ].reduce((n, [r, i], s) => (n[Cn(r, s) + " =>"] = i, n), {})
      } : ei(t) ? {
        [`Set(${t.size})`]: [
          ...t.values()
        ].map((n) => Cn(n))
      } : et(t) ? Cn(t) : J(t) && !A(t) && !ri(t) ? String(t) : t, Cn = (e, t = "") => {
        var n;
        return et(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
      };
      let _e;
      class xs {
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
      function ys() {
        return _e;
      }
      let q;
      const En = /* @__PURE__ */ new WeakSet();
      class ai {
        constructor(t) {
          this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, _e && _e.active && _e.effects.push(this);
        }
        pause() {
          this.flags |= 64;
        }
        resume() {
          this.flags & 64 && (this.flags &= -65, En.has(this) && (En.delete(this), this.trigger()));
        }
        notify() {
          this.flags & 2 && !(this.flags & 32) || this.flags & 8 || fi(this);
        }
        run() {
          if (!(this.flags & 1)) return this.fn();
          this.flags |= 2, Tr(this), ui(this);
          const t = q, n = Ce;
          q = this, Ce = true;
          try {
            return this.fn();
          } finally {
            di(this), q = t, Ce = n, this.flags &= -3;
          }
        }
        stop() {
          if (this.flags & 1) {
            for (let t = this.deps; t; t = t.nextDep) ir(t);
            this.deps = this.depsTail = void 0, Tr(this), this.onStop && this.onStop(), this.flags &= -2;
          }
        }
        trigger() {
          this.flags & 64 ? En.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
        }
        runIfDirty() {
          Vn(this) && this.run();
        }
        get dirty() {
          return Vn(this);
        }
      }
      let ci = 0, It, Ut;
      function fi(e, t = false) {
        if (e.flags |= 8, t) {
          e.next = Ut, Ut = e;
          return;
        }
        e.next = It, It = e;
      }
      function nr() {
        ci++;
      }
      function rr() {
        if (--ci > 0) return;
        if (Ut) {
          let t = Ut;
          for (Ut = void 0; t; ) {
            const n = t.next;
            t.next = void 0, t.flags &= -9, t = n;
          }
        }
        let e;
        for (; It; ) {
          let t = It;
          for (It = void 0; t; ) {
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
      function Vn(e) {
        for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (hi(t.dep.computed) || t.dep.version !== t.version)) return true;
        return !!e._dirty;
      }
      function hi(e) {
        if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Gt) || (e.globalVersion = Gt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Vn(e)))) return;
        e.flags |= 2;
        const t = e.dep, n = q, r = Ce;
        q = e, Ce = true;
        try {
          ui(e);
          const i = e.fn(e._value);
          (t.version === 0 || Je(i, e._value)) && (e.flags |= 128, e._value = i, t.version++);
        } catch (i) {
          throw t.version++, i;
        } finally {
          q = n, Ce = r, di(e), e.flags &= -3;
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
      let Ce = true;
      const pi = [];
      function Ke() {
        pi.push(Ce), Ce = false;
      }
      function ke() {
        const e = pi.pop();
        Ce = e === void 0 ? true : e;
      }
      function Tr(e) {
        const { cleanup: t } = e;
        if (e.cleanup = void 0, t) {
          const n = q;
          q = void 0;
          try {
            t();
          } finally {
            q = n;
          }
        }
      }
      let Gt = 0;
      class Ts {
        constructor(t, n) {
          this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
        }
      }
      class sr {
        constructor(t) {
          this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
        }
        track(t) {
          if (!q || !Ce || q === this.computed) return;
          let n = this.activeLink;
          if (n === void 0 || n.sub !== q) n = this.activeLink = new Ts(q, this), q.deps ? (n.prevDep = q.depsTail, q.depsTail.nextDep = n, q.depsTail = n) : q.deps = q.depsTail = n, gi(n);
          else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
            const r = n.nextDep;
            r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = q.depsTail, n.nextDep = void 0, q.depsTail.nextDep = n, q.depsTail = n, q.deps === n && (q.deps = r);
          }
          return n;
        }
        trigger(t) {
          this.version++, Gt++, this.notify(t);
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
      const Ln = /* @__PURE__ */ new WeakMap(), ot = Symbol(""), Gn = Symbol(""), Nt = Symbol("");
      function se(e, t, n) {
        if (Ce && q) {
          let r = Ln.get(e);
          r || Ln.set(e, r = /* @__PURE__ */ new Map());
          let i = r.get(n);
          i || (r.set(n, i = new sr()), i.map = r, i.key = n), i.track();
        }
      }
      function He(e, t, n, r, i, s) {
        const o = Ln.get(e);
        if (!o) {
          Gt++;
          return;
        }
        const a = (c) => {
          c && c.trigger();
        };
        if (nr(), t === "clear") o.forEach(a);
        else {
          const c = A(e), h = c && er(n);
          if (c && n === "length") {
            const u = Number(r);
            o.forEach((p, T) => {
              (T === "length" || T === Nt || !et(T) && T >= u) && a(p);
            });
          } else switch ((n !== void 0 || o.has(void 0)) && a(o.get(n)), h && a(o.get(Nt)), t) {
            case "add":
              c ? h && a(o.get("length")) : (a(o.get(ot)), vt(e) && a(o.get(Gn)));
              break;
            case "delete":
              c || (a(o.get(ot)), vt(e) && a(o.get(Gn)));
              break;
            case "set":
              vt(e) && a(o.get(ot));
              break;
          }
        }
        rr();
      }
      function pt(e) {
        const t = G(e);
        return t === e ? t : (se(t, "iterate", Nt), Ee(e) ? t : t.map(ue));
      }
      function or(e) {
        return se(e = G(e), "iterate", Nt), e;
      }
      const Ss = {
        __proto__: null,
        [Symbol.iterator]() {
          return Pn(this, Symbol.iterator, ue);
        },
        concat(...e) {
          return pt(this).concat(...e.map((t) => A(t) ? pt(t) : t));
        },
        entries() {
          return Pn(this, "entries", (e) => (e[1] = ue(e[1]), e));
        },
        every(e, t) {
          return Le(this, "every", e, t, void 0, arguments);
        },
        filter(e, t) {
          return Le(this, "filter", e, t, (n) => n.map(ue), arguments);
        },
        find(e, t) {
          return Le(this, "find", e, t, ue, arguments);
        },
        findIndex(e, t) {
          return Le(this, "findIndex", e, t, void 0, arguments);
        },
        findLast(e, t) {
          return Le(this, "findLast", e, t, ue, arguments);
        },
        findLastIndex(e, t) {
          return Le(this, "findLastIndex", e, t, void 0, arguments);
        },
        forEach(e, t) {
          return Le(this, "forEach", e, t, void 0, arguments);
        },
        includes(...e) {
          return Rn(this, "includes", e);
        },
        indexOf(...e) {
          return Rn(this, "indexOf", e);
        },
        join(e) {
          return pt(this).join(e);
        },
        lastIndexOf(...e) {
          return Rn(this, "lastIndexOf", e);
        },
        map(e, t) {
          return Le(this, "map", e, t, void 0, arguments);
        },
        pop() {
          return Pt(this, "pop");
        },
        push(...e) {
          return Pt(this, "push", e);
        },
        reduce(e, ...t) {
          return Sr(this, "reduce", e, t);
        },
        reduceRight(e, ...t) {
          return Sr(this, "reduceRight", e, t);
        },
        shift() {
          return Pt(this, "shift");
        },
        some(e, t) {
          return Le(this, "some", e, t, void 0, arguments);
        },
        splice(...e) {
          return Pt(this, "splice", e);
        },
        toReversed() {
          return pt(this).toReversed();
        },
        toSorted(e) {
          return pt(this).toSorted(e);
        },
        toSpliced(...e) {
          return pt(this).toSpliced(...e);
        },
        unshift(...e) {
          return Pt(this, "unshift", e);
        },
        values() {
          return Pn(this, "values", ue);
        }
      };
      function Pn(e, t, n) {
        const r = or(e), i = r[t]();
        return r !== e && !Ee(e) && (i._next = i.next, i.next = () => {
          const s = i._next();
          return s.value && (s.value = n(s.value)), s;
        }), i;
      }
      const Cs = Array.prototype;
      function Le(e, t, n, r, i, s) {
        const o = or(e), a = o !== e && !Ee(e), c = o[t];
        if (c !== Cs[t]) {
          const p = c.apply(e, s);
          return a ? ue(p) : p;
        }
        let h = n;
        o !== e && (a ? h = function(p, T) {
          return n.call(this, ue(p), T, e);
        } : n.length > 2 && (h = function(p, T) {
          return n.call(this, p, T, e);
        }));
        const u = c.call(o, h, r);
        return a && i ? i(u) : u;
      }
      function Sr(e, t, n, r) {
        const i = or(e);
        let s = n;
        return i !== e && (Ee(e) ? n.length > 3 && (s = function(o, a, c) {
          return n.call(this, o, a, c, e);
        }) : s = function(o, a, c) {
          return n.call(this, o, ue(a), c, e);
        }), i[t](s, ...r);
      }
      function Rn(e, t, n) {
        const r = G(e);
        se(r, "iterate", Nt);
        const i = r[t](...n);
        return (i === -1 || i === false) && fr(n[0]) ? (n[0] = G(n[0]), r[t](...n)) : i;
      }
      function Pt(e, t, n = []) {
        Ke(), nr();
        const r = G(e)[t].apply(e, n);
        return rr(), ke(), r;
      }
      const Es = Jn("__proto__,__v_isRef,__isVue"), _i = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(et));
      function Ps(e) {
        et(e) || (e = String(e));
        const t = G(this);
        return se(t, "has", e), t.hasOwnProperty(e);
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
          if (n === "__v_raw") return r === (i ? s ? Bs : yi : s ? xi : vi).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
          const o = A(t);
          if (!i) {
            let c;
            if (o && (c = Ss[n])) return c;
            if (n === "hasOwnProperty") return Ps;
          }
          const a = Reflect.get(t, n, oe(t) ? t : r);
          return (et(n) ? _i.has(n) : Es(n)) || (i || se(t, "get", n), s) ? a : oe(a) ? o && er(n) ? a : a.value : J(a) ? i ? wi(a) : ar(a) : a;
        }
      }
      class mi extends bi {
        constructor(t = false) {
          super(false, t);
        }
        set(t, n, r, i) {
          let s = t[n];
          if (!this._isShallow) {
            const c = lt(s);
            if (!Ee(r) && !lt(r) && (s = G(s), r = G(r)), !A(t) && oe(s) && !oe(r)) return c ? false : (s.value = r, true);
          }
          const o = A(t) && er(n) ? Number(n) < t.length : N(t, n), a = Reflect.set(t, n, r, oe(t) ? t : i);
          return t === G(i) && (o ? Je(r, s) && He(t, "set", n, r) : He(t, "add", n, r)), a;
        }
        deleteProperty(t, n) {
          const r = N(t, n);
          t[n];
          const i = Reflect.deleteProperty(t, n);
          return i && r && He(t, "delete", n, void 0), i;
        }
        has(t, n) {
          const r = Reflect.has(t, n);
          return (!et(n) || !_i.has(n)) && se(t, "has", n), r;
        }
        ownKeys(t) {
          return se(t, "iterate", A(t) ? "length" : ot), Reflect.ownKeys(t);
        }
      }
      class Rs extends bi {
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
      const Ms = new mi(), Os = new Rs(), As = new mi(true);
      const Nn = (e) => e, qt = (e) => Reflect.getPrototypeOf(e);
      function Is(e, t, n) {
        return function(...r) {
          const i = this.__v_raw, s = G(i), o = vt(s), a = e === "entries" || e === Symbol.iterator && o, c = e === "keys" && o, h = i[e](...r), u = n ? Nn : t ? Wn : ue;
          return !t && se(s, "iterate", c ? Gn : ot), {
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
      function Yt(e) {
        return function(...t) {
          return e === "delete" ? false : e === "clear" ? void 0 : this;
        };
      }
      function Us(e, t) {
        const n = {
          get(i) {
            const s = this.__v_raw, o = G(s), a = G(i);
            e || (Je(i, a) && se(o, "get", i), se(o, "get", a));
            const { has: c } = qt(o), h = t ? Nn : e ? Wn : ue;
            if (c.call(o, i)) return h(s.get(i));
            if (c.call(o, a)) return h(s.get(a));
            s !== o && s.get(i);
          },
          get size() {
            const i = this.__v_raw;
            return !e && se(G(i), "iterate", ot), Reflect.get(i, "size", i);
          },
          has(i) {
            const s = this.__v_raw, o = G(s), a = G(i);
            return e || (Je(i, a) && se(o, "has", i), se(o, "has", a)), i === a ? s.has(i) : s.has(i) || s.has(a);
          },
          forEach(i, s) {
            const o = this, a = o.__v_raw, c = G(a), h = t ? Nn : e ? Wn : ue;
            return !e && se(c, "iterate", ot), a.forEach((u, p) => i.call(s, h(u), h(p), o));
          }
        };
        return le(n, e ? {
          add: Yt("add"),
          set: Yt("set"),
          delete: Yt("delete"),
          clear: Yt("clear")
        } : {
          add(i) {
            !t && !Ee(i) && !lt(i) && (i = G(i));
            const s = G(this);
            return qt(s).has.call(s, i) || (s.add(i), He(s, "add", i, i)), this;
          },
          set(i, s) {
            !t && !Ee(s) && !lt(s) && (s = G(s));
            const o = G(this), { has: a, get: c } = qt(o);
            let h = a.call(o, i);
            h || (i = G(i), h = a.call(o, i));
            const u = c.call(o, i);
            return o.set(i, s), h ? Je(s, u) && He(o, "set", i, s) : He(o, "add", i, s), this;
          },
          delete(i) {
            const s = G(this), { has: o, get: a } = qt(s);
            let c = o.call(s, i);
            c || (i = G(i), c = o.call(s, i)), a && a.call(s, i);
            const h = s.delete(i);
            return c && He(s, "delete", i, void 0), h;
          },
          clear() {
            const i = G(this), s = i.size !== 0, o = i.clear();
            return s && He(i, "clear", void 0, void 0), o;
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
        const n = Us(e, t);
        return (r, i, s) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? r : Reflect.get(N(n, i) && i in r ? n : r, i, s);
      }
      const Fs = {
        get: lr(false, false)
      }, zs = {
        get: lr(false, true)
      }, Ds = {
        get: lr(true, false)
      };
      const vi = /* @__PURE__ */ new WeakMap(), xi = /* @__PURE__ */ new WeakMap(), yi = /* @__PURE__ */ new WeakMap(), Bs = /* @__PURE__ */ new WeakMap();
      function js(e) {
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
      function Vs(e) {
        return e.__v_skip || !Object.isExtensible(e) ? 0 : js(fs(e));
      }
      function ar(e) {
        return lt(e) ? e : cr(e, false, Ms, Fs, vi);
      }
      function Ls(e) {
        return cr(e, false, As, zs, xi);
      }
      function wi(e) {
        return cr(e, true, Os, Ds, yi);
      }
      function cr(e, t, n, r, i) {
        if (!J(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
        const s = Vs(e);
        if (s === 0) return e;
        const o = i.get(e);
        if (o) return o;
        const a = new Proxy(e, s === 2 ? r : n);
        return i.set(e, a), a;
      }
      function Ft(e) {
        return lt(e) ? Ft(e.__v_raw) : !!(e && e.__v_isReactive);
      }
      function lt(e) {
        return !!(e && e.__v_isReadonly);
      }
      function Ee(e) {
        return !!(e && e.__v_isShallow);
      }
      function fr(e) {
        return e ? !!e.__v_raw : false;
      }
      function G(e) {
        const t = e && e.__v_raw;
        return t ? G(t) : e;
      }
      function Gs(e) {
        return !N(e, "__v_skip") && Object.isExtensible(e) && jn(e, "__v_skip", true), e;
      }
      const ue = (e) => J(e) ? ar(e) : e, Wn = (e) => J(e) ? wi(e) : e;
      function oe(e) {
        return e ? e.__v_isRef === true : false;
      }
      function _t(e) {
        return Ns(e, false);
      }
      function Ns(e, t) {
        return oe(e) ? e : new Ws(e, t);
      }
      class Ws {
        constructor(t, n) {
          this.dep = new sr(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : G(t), this._value = n ? t : ue(t), this.__v_isShallow = n;
        }
        get value() {
          return this.dep.track(), this._value;
        }
        set value(t) {
          const n = this._rawValue, r = this.__v_isShallow || Ee(t) || lt(t);
          t = r ? t : G(t), Je(t, n) && (this._rawValue = t, this._value = r ? t : ue(t), this.dep.trigger());
        }
      }
      function Hs(e) {
        return oe(e) ? e.value : e;
      }
      const $s = {
        get: (e, t, n) => t === "__v_raw" ? e : Hs(Reflect.get(e, t, n)),
        set: (e, t, n, r) => {
          const i = e[t];
          return oe(i) && !oe(n) ? (i.value = n, true) : Reflect.set(e, t, n, r);
        }
      };
      function Ti(e) {
        return Ft(e) ? e : new Proxy(e, $s);
      }
      class Ks {
        constructor(t, n, r) {
          this.fn = t, this.setter = n, this._value = void 0, this.dep = new sr(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Gt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
        }
        notify() {
          if (this.flags |= 16, !(this.flags & 8) && q !== this) return fi(this, true), true;
        }
        get value() {
          const t = this.dep.track();
          return hi(this), t && (t.version = this.dep.version), this._value;
        }
        set value(t) {
          this.setter && this.setter(t);
        }
      }
      function ks(e, t, n = false) {
        let r, i;
        return I(e) ? r = e : (r = e.get, i = e.set), new Ks(r, i, n);
      }
      const Xt = {}, an = /* @__PURE__ */ new WeakMap();
      let st;
      function qs(e, t = false, n = st) {
        if (n) {
          let r = an.get(n);
          r || an.set(n, r = []), r.push(e);
        }
      }
      function Ys(e, t, n = $) {
        const { immediate: r, deep: i, once: s, scheduler: o, augmentJob: a, call: c } = n, h = (R) => i ? R : Ee(R) || i === false || i === 0 ? $e(R, 1) : $e(R);
        let u, p, T, C, z = false, F = false;
        if (oe(e) ? (p = () => e.value, z = Ee(e)) : Ft(e) ? (p = () => h(e), z = true) : A(e) ? (F = true, z = e.some((R) => Ft(R) || Ee(R)), p = () => e.map((R) => {
          if (oe(R)) return R.value;
          if (Ft(R)) return h(R);
          if (I(R)) return c ? c(R, 2) : R();
        })) : I(e) ? t ? p = c ? () => c(e, 2) : e : p = () => {
          if (T) {
            Ke();
            try {
              T();
            } finally {
              ke();
            }
          }
          const R = st;
          st = u;
          try {
            return c ? c(e, 3, [
              C
            ]) : e(C);
          } finally {
            st = R;
          }
        } : p = ze, t && i) {
          const R = p, Q = i === true ? 1 / 0 : i;
          p = () => $e(R(), Q);
        }
        const ee = ys(), L = () => {
          u.stop(), ee && ee.active && Zn(ee.effects, u);
        };
        if (s && t) {
          const R = t;
          t = (...Q) => {
            R(...Q), L();
          };
        }
        let Y = F ? new Array(e.length).fill(Xt) : Xt;
        const X = (R) => {
          if (!(!(u.flags & 1) || !u.dirty && !R)) if (t) {
            const Q = u.run();
            if (i || z || (F ? Q.some((Te, ye) => Je(Te, Y[ye])) : Je(Q, Y))) {
              T && T();
              const Te = st;
              st = u;
              try {
                const ye = [
                  Q,
                  Y === Xt ? void 0 : F && Y[0] === Xt ? [] : Y,
                  C
                ];
                Y = Q, c ? c(t, 3, ye) : t(...ye);
              } finally {
                st = Te;
              }
            }
          } else u.run();
        };
        return a && a(X), u = new ai(p), u.scheduler = o ? () => o(X, false) : X, C = (R) => qs(R, false, u), T = u.onStop = () => {
          const R = an.get(u);
          if (R) {
            if (c) c(R, 4);
            else for (const Q of R) Q();
            an.delete(u);
          }
        }, t ? r ? X(true) : Y = u.run() : o ? o(X.bind(null, true), true) : u.run(), L.pause = u.pause.bind(u), L.resume = u.resume.bind(u), L.stop = L, L;
      }
      function $e(e, t = 1 / 0, n) {
        if (t <= 0 || !J(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
        if (n.add(e), t--, oe(e)) $e(e.value, t, n);
        else if (A(e)) for (let r = 0; r < e.length; r++) $e(e[r], t, n);
        else if (ei(e) || vt(e)) e.forEach((r) => {
          $e(r, t, n);
        });
        else if (ri(e)) {
          for (const r in e) $e(e[r], t, n);
          for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && $e(e[r], t, n);
        }
        return e;
      }
      function Kt(e, t, n, r) {
        try {
          return r ? e(...r) : e();
        } catch (i) {
          mn(i, t, n);
        }
      }
      function De(e, t, n, r) {
        if (I(e)) {
          const i = Kt(e, t, n, r);
          return i && ti(i) && i.catch((s) => {
            mn(s, t, n);
          }), i;
        }
        if (A(e)) {
          const i = [];
          for (let s = 0; s < e.length; s++) i.push(De(e[s], t, n, r));
          return i;
        }
      }
      function mn(e, t, n, r = true) {
        const i = t ? t.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: o } = t && t.appContext.config || $;
        if (t) {
          let a = t.parent;
          const c = t.proxy, h = `https://vuejs.org/error-reference/#runtime-${n}`;
          for (; a; ) {
            const u = a.ec;
            if (u) {
              for (let p = 0; p < u.length; p++) if (u[p](e, c, h) === false) return;
            }
            a = a.parent;
          }
          if (s) {
            Ke(), Kt(s, null, 10, [
              e,
              c,
              h
            ]), ke();
            return;
          }
        }
        Xs(e, n, i, r, o);
      }
      function Xs(e, t, n, r = true, i = false) {
        if (i) throw e;
        console.error(e);
      }
      const de = [];
      let Ue = -1;
      const yt = [];
      let Ye = null, bt = 0;
      const Si = Promise.resolve();
      let cn = null;
      function Hn(e) {
        const t = cn || Si;
        return e ? t.then(this ? e.bind(this) : e) : t;
      }
      function Js(e) {
        let t = Ue + 1, n = de.length;
        for (; t < n; ) {
          const r = t + n >>> 1, i = de[r], s = Wt(i);
          s < e || s === e && i.flags & 2 ? t = r + 1 : n = r;
        }
        return t;
      }
      function ur(e) {
        if (!(e.flags & 1)) {
          const t = Wt(e), n = de[de.length - 1];
          !n || !(e.flags & 2) && t >= Wt(n) ? de.push(e) : de.splice(Js(t), 0, e), e.flags |= 1, Ci();
        }
      }
      function Ci() {
        cn || (cn = Si.then(Pi));
      }
      function Qs(e) {
        A(e) ? yt.push(...e) : Ye && e.id === -1 ? Ye.splice(bt + 1, 0, e) : e.flags & 1 || (yt.push(e), e.flags |= 1), Ci();
      }
      function Cr(e, t, n = Ue + 1) {
        for (; n < de.length; n++) {
          const r = de[n];
          if (r && r.flags & 2) {
            if (e && r.id !== e.uid) continue;
            de.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
          }
        }
      }
      function Ei(e) {
        if (yt.length) {
          const t = [
            ...new Set(yt)
          ].sort((n, r) => Wt(n) - Wt(r));
          if (yt.length = 0, Ye) {
            Ye.push(...t);
            return;
          }
          for (Ye = t, bt = 0; bt < Ye.length; bt++) {
            const n = Ye[bt];
            n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
          }
          Ye = null, bt = 0;
        }
      }
      const Wt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
      function Pi(e) {
        try {
          for (Ue = 0; Ue < de.length; Ue++) {
            const t = de[Ue];
            t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Kt(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
          }
        } finally {
          for (; Ue < de.length; Ue++) {
            const t = de[Ue];
            t && (t.flags &= -2);
          }
          Ue = -1, de.length = 0, Ei(), cn = null, (de.length || yt.length) && Pi();
        }
      }
      let we = null, Ri = null;
      function fn(e) {
        const t = we;
        return we = e, Ri = e && e.type.__scopeId || null, t;
      }
      function Zs(e, t = we, n) {
        if (!t || e._n) return e;
        const r = (...i) => {
          r._d && Fr(-1);
          const s = fn(t);
          let o;
          try {
            o = e(...i);
          } finally {
            fn(s), r._d && Fr(1);
          }
          return o;
        };
        return r._n = true, r._c = true, r._d = true, r;
      }
      function Mn(e, t) {
        if (we === null) return e;
        const n = wn(we), r = e.dirs || (e.dirs = []);
        for (let i = 0; i < t.length; i++) {
          let [s, o, a, c = $] = t[i];
          s && (I(s) && (s = {
            mounted: s,
            updated: s
          }), s.deep && $e(o), r.push({
            dir: s,
            instance: n,
            value: o,
            oldValue: void 0,
            arg: a,
            modifiers: c
          }));
        }
        return e;
      }
      function rt(e, t, n, r) {
        const i = e.dirs, s = t && t.dirs;
        for (let o = 0; o < i.length; o++) {
          const a = i[o];
          s && (a.oldValue = s[o].value);
          let c = a.dir[r];
          c && (Ke(), De(c, n, 8, [
            e.el,
            a,
            e,
            t
          ]), ke());
        }
      }
      const eo = Symbol("_vte"), to = (e) => e.__isTeleport;
      function dr(e, t) {
        e.shapeFlag & 6 && e.component ? (e.transition = t, dr(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
      }
      function Mi(e, t) {
        return I(e) ? le({
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
      function zt(e, t, n, r, i = false) {
        if (A(e)) {
          e.forEach((z, F) => zt(z, t && (A(t) ? t[F] : t), n, r, i));
          return;
        }
        if (Dt(r) && !i) {
          r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && zt(e, t, n, r.component.subTree);
          return;
        }
        const s = r.shapeFlag & 4 ? wn(r.component) : r.el, o = i ? null : s, { i: a, r: c } = e, h = t && t.r, u = a.refs === $ ? a.refs = {} : a.refs, p = a.setupState, T = G(p), C = p === $ ? () => false : (z) => N(T, z);
        if (h != null && h !== c && (re(h) ? (u[h] = null, C(h) && (p[h] = null)) : oe(h) && (h.value = null)), I(c)) Kt(c, a, 12, [
          o,
          u
        ]);
        else {
          const z = re(c), F = oe(c);
          if (z || F) {
            const ee = () => {
              if (e.f) {
                const L = z ? C(c) ? p[c] : u[c] : c.value;
                i ? A(L) && Zn(L, s) : A(L) ? L.includes(s) || L.push(s) : z ? (u[c] = [
                  s
                ], C(c) && (p[c] = u[c])) : (c.value = [
                  s
                ], e.k && (u[e.k] = c.value));
              } else z ? (u[c] = o, C(c) && (p[c] = o)) : F && (c.value = o, e.k && (u[e.k] = o));
            };
            o ? (ee.id = -1, ve(ee, n)) : ee();
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
            const a = kt(n), c = De(t, n, e, o);
            return a(), ke(), c;
          });
          return r ? i.unshift(s) : i.push(s), s;
        }
      }
      const qe = (e) => (t, n = he) => {
        (!$t || e === "sp") && vn(e, (...r) => t(...r), n);
      }, so = qe("bm"), hr = qe("m"), oo = qe("bu"), lo = qe("u"), ao = qe("bum"), pr = qe("um"), co = qe("sp"), fo = qe("rtg"), uo = qe("rtc");
      function ho(e, t = he) {
        vn("ec", e, t);
      }
      const po = Symbol.for("v-ndc"), $n = (e) => e ? Zi(e) ? wn(e) : $n(e.parent) : null, Bt = le(/* @__PURE__ */ Object.create(null), {
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
        $options: (e) => Fi(e),
        $forceUpdate: (e) => e.f || (e.f = () => {
          ur(e.update);
        }),
        $nextTick: (e) => e.n || (e.n = Hn.bind(e.proxy)),
        $watch: (e) => Do.bind(e)
      }), On = (e, t) => e !== $ && !e.__isScriptSetup && N(e, t), go = {
        get({ _: e }, t) {
          if (t === "__v_skip") return true;
          const { ctx: n, setupState: r, data: i, props: s, accessCache: o, type: a, appContext: c } = e;
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
              if (i !== $ && N(i, t)) return o[t] = 2, i[t];
              if ((h = e.propsOptions[0]) && N(h, t)) return o[t] = 3, s[t];
              if (n !== $ && N(n, t)) return o[t] = 4, n[t];
              Kn && (o[t] = 0);
            }
          }
          const u = Bt[t];
          let p, T;
          if (u) return t === "$attrs" && se(e.attrs, "get", ""), u(e);
          if ((p = a.__cssModules) && (p = p[t])) return p;
          if (n !== $ && N(n, t)) return o[t] = 4, n[t];
          if (T = c.config.globalProperties, N(T, t)) return T[t];
        },
        set({ _: e }, t, n) {
          const { data: r, setupState: i, ctx: s } = e;
          return On(i, t) ? (i[t] = n, true) : r !== $ && N(r, t) ? (r[t] = n, true) : N(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (s[t] = n, true);
        },
        has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, propsOptions: s } }, o) {
          let a;
          return !!n[o] || e !== $ && N(e, o) || On(t, o) || (a = s[0]) && N(a, o) || N(r, o) || N(Bt, o) || N(i.config.globalProperties, o);
        },
        defineProperty(e, t, n) {
          return n.get != null ? e._.accessCache[t] = 0 : N(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
        }
      };
      function Er(e) {
        return A(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
      }
      let Kn = true;
      function _o(e) {
        const t = Fi(e), n = e.proxy, r = e.ctx;
        Kn = false, t.beforeCreate && Pr(t.beforeCreate, e, "bc");
        const { data: i, computed: s, methods: o, watch: a, provide: c, inject: h, created: u, beforeMount: p, mounted: T, beforeUpdate: C, updated: z, activated: F, deactivated: ee, beforeDestroy: L, beforeUnmount: Y, destroyed: X, unmounted: R, render: Q, renderTracked: Te, renderTriggered: ye, errorCaptured: Re, serverPrefetch: ct, expose: Be, inheritAttrs: tt, components: ft, directives: nt, filters: ut } = t;
        if (h && bo(h, r, null), o) for (const K in o) {
          const B = o[K];
          I(B) && (r[K] = B.bind(n));
        }
        if (i) {
          const K = i.call(n, n);
          J(K) && (e.data = ar(K));
        }
        if (Kn = true, s) for (const K in s) {
          const B = s[K], je = I(B) ? B.bind(n, n) : I(B.get) ? B.get.bind(n, n) : ze, dt = !I(B) && I(B.set) ? B.set.bind(n) : ze, Ve = ts({
            get: je,
            set: dt
          });
          Object.defineProperty(r, K, {
            enumerable: true,
            configurable: true,
            get: () => Ve.value,
            set: (te) => Ve.value = te
          });
        }
        if (a) for (const K in a) Ui(a[K], r, n, K);
        if (c) {
          const K = I(c) ? c.call(n) : c;
          Reflect.ownKeys(K).forEach((B) => {
            To(B, K[B]);
          });
        }
        u && Pr(u, e, "c");
        function ie(K, B) {
          A(B) ? B.forEach((je) => K(je.bind(n))) : B && K(B.bind(n));
        }
        if (ie(so, p), ie(hr, T), ie(oo, C), ie(lo, z), ie(no, F), ie(ro, ee), ie(ho, Re), ie(uo, Te), ie(fo, ye), ie(ao, Y), ie(pr, R), ie(co, ct), A(Be)) if (Be.length) {
          const K = e.exposed || (e.exposed = {});
          Be.forEach((B) => {
            Object.defineProperty(K, B, {
              get: () => n[B],
              set: (je) => n[B] = je,
              enumerable: true
            });
          });
        } else e.exposed || (e.exposed = {});
        Q && e.render === ze && (e.render = Q), tt != null && (e.inheritAttrs = tt), ft && (e.components = ft), nt && (e.directives = nt), ct && Oi(e);
      }
      function bo(e, t, n = ze) {
        A(e) && (e = kn(e));
        for (const r in e) {
          const i = e[r];
          let s;
          J(i) ? "default" in i ? s = en(i.from || r, i.default, true) : s = en(i.from || r) : s = en(i), oe(s) ? Object.defineProperty(t, r, {
            enumerable: true,
            configurable: true,
            get: () => s.value,
            set: (o) => s.value = o
          }) : t[r] = s;
        }
      }
      function Pr(e, t, n) {
        De(A(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
      }
      function Ui(e, t, n, r) {
        let i = r.includes(".") ? ki(n, r) : () => n[r];
        if (re(e)) {
          const s = t[e];
          I(s) && In(i, s);
        } else if (I(e)) In(i, e.bind(n));
        else if (J(e)) if (A(e)) e.forEach((s) => Ui(s, t, n, r));
        else {
          const s = I(e.handler) ? e.handler.bind(n) : t[e.handler];
          I(s) && In(i, s, e);
        }
      }
      function Fi(e) {
        const t = e.type, { mixins: n, extends: r } = t, { mixins: i, optionsCache: s, config: { optionMergeStrategies: o } } = e.appContext, a = s.get(t);
        let c;
        return a ? c = a : !i.length && !n && !r ? c = t : (c = {}, i.length && i.forEach((h) => un(c, h, o, true)), un(c, t, o)), J(t) && s.set(t, c), c;
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
        data: Rr,
        props: Mr,
        emits: Mr,
        methods: Ot,
        computed: Ot,
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
        components: Ot,
        directives: Ot,
        watch: xo,
        provide: Rr,
        inject: vo
      };
      function Rr(e, t) {
        return t ? e ? function() {
          return le(I(e) ? e.call(this, this) : e, I(t) ? t.call(this, this) : t);
        } : t : e;
      }
      function vo(e, t) {
        return Ot(kn(e), kn(t));
      }
      function kn(e) {
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
      function Ot(e, t) {
        return e ? le(/* @__PURE__ */ Object.create(null), e, t) : t;
      }
      function Mr(e, t) {
        return e ? A(e) && A(t) ? [
          .../* @__PURE__ */ new Set([
            ...e,
            ...t
          ])
        ] : le(/* @__PURE__ */ Object.create(null), Er(e), Er(t ?? {})) : t;
      }
      function xo(e, t) {
        if (!e) return t;
        if (!t) return e;
        const n = le(/* @__PURE__ */ Object.create(null), e);
        for (const r in t) n[r] = ce(e[r], t[r]);
        return n;
      }
      function zi() {
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
      let yo = 0;
      function wo(e, t) {
        return function(r, i = null) {
          I(r) || (r = le({}, r)), i != null && !J(i) && (i = null);
          const s = zi(), o = /* @__PURE__ */ new WeakSet(), a = [];
          let c = false;
          const h = s.app = {
            _uid: yo++,
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
              if (!c) {
                const C = h._ceVNode || Pe(r, i);
                return C.appContext = s, T === true ? T = "svg" : T === false && (T = void 0), e(C, u, T), c = true, h._container = u, u.__vue_app__ = h, wn(C.component);
              }
            },
            onUnmount(u) {
              a.push(u);
            },
            unmount() {
              c && (De(a, h._instance, 16), e(null, h._container), delete h._container.__vue_app__);
            },
            provide(u, p) {
              return s.provides[u] = p, h;
            },
            runWithContext(u) {
              const p = wt;
              wt = h;
              try {
                return u();
              } finally {
                wt = p;
              }
            }
          };
          return h;
        };
      }
      let wt = null;
      function To(e, t) {
        if (he) {
          let n = he.provides;
          const r = he.parent && he.parent.provides;
          r === n && (n = he.provides = Object.create(r)), n[e] = t;
        }
      }
      function en(e, t, n = false) {
        const r = Zo();
        if (r || wt) {
          let i = wt ? wt._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
          if (i && e in i) return i[e];
          if (arguments.length > 1) return n && I(t) ? t.call(r && r.proxy) : t;
        }
      }
      const Di = {}, Bi = () => Object.create(Di), ji = (e) => Object.getPrototypeOf(e) === Di;
      function So(e, t, n, r = false) {
        const i = {}, s = Bi();
        e.propsDefaults = /* @__PURE__ */ Object.create(null), Vi(e, t, i, s);
        for (const o in e.propsOptions[0]) o in i || (i[o] = void 0);
        n ? e.props = r ? i : Ls(i) : e.type.props ? e.props = i : e.props = s, e.attrs = s;
      }
      function Co(e, t, n, r) {
        const { props: i, attrs: s, vnode: { patchFlag: o } } = e, a = G(i), [c] = e.propsOptions;
        let h = false;
        if ((r || o > 0) && !(o & 16)) {
          if (o & 8) {
            const u = e.vnode.dynamicProps;
            for (let p = 0; p < u.length; p++) {
              let T = u[p];
              if (xn(e.emitsOptions, T)) continue;
              const C = t[T];
              if (c) if (N(s, T)) C !== s[T] && (s[T] = C, h = true);
              else {
                const z = Qe(T);
                i[z] = qn(c, a, z, C, e, false);
              }
              else C !== s[T] && (s[T] = C, h = true);
            }
          }
        } else {
          Vi(e, t, i, s) && (h = true);
          let u;
          for (const p in a) (!t || !N(t, p) && ((u = at(p)) === p || !N(t, u))) && (c ? n && (n[p] !== void 0 || n[u] !== void 0) && (i[p] = qn(c, a, p, void 0, e, true)) : delete i[p]);
          if (s !== a) for (const p in s) (!t || !N(t, p)) && (delete s[p], h = true);
        }
        h && He(e.attrs, "set", "");
      }
      function Vi(e, t, n, r) {
        const [i, s] = e.propsOptions;
        let o = false, a;
        if (t) for (let c in t) {
          if (At(c)) continue;
          const h = t[c];
          let u;
          i && N(i, u = Qe(c)) ? !s || !s.includes(u) ? n[u] = h : (a || (a = {}))[u] = h : xn(e.emitsOptions, c) || (!(c in r) || h !== r[c]) && (r[c] = h, o = true);
        }
        if (s) {
          const c = G(n), h = a || $;
          for (let u = 0; u < s.length; u++) {
            const p = s[u];
            n[p] = qn(i, c, p, h[p], e, !N(h, p));
          }
        }
        return o;
      }
      function qn(e, t, n, r, i, s) {
        const o = e[n];
        if (o != null) {
          const a = N(o, "default");
          if (a && r === void 0) {
            const c = o.default;
            if (o.type !== Function && !o.skipFactory && I(c)) {
              const { propsDefaults: h } = i;
              if (n in h) r = h[n];
              else {
                const u = kt(i);
                r = h[n] = c.call(null, t), u();
              }
            } else r = c;
            i.ce && i.ce._setProp(n, r);
          }
          o[0] && (s && !a ? r = false : o[1] && (r === "" || r === at(n)) && (r = true));
        }
        return r;
      }
      const Eo = /* @__PURE__ */ new WeakMap();
      function Li(e, t, n = false) {
        const r = n ? Eo : t.propsCache, i = r.get(e);
        if (i) return i;
        const s = e.props, o = {}, a = [];
        let c = false;
        if (!I(e)) {
          const u = (p) => {
            c = true;
            const [T, C] = Li(p, t, true);
            le(o, T), C && a.push(...C);
          };
          !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
        }
        if (!s && !c) return J(e) && r.set(e, mt), mt;
        if (A(s)) for (let u = 0; u < s.length; u++) {
          const p = Qe(s[u]);
          Or(p) && (o[p] = $);
        }
        else if (s) for (const u in s) {
          const p = Qe(u);
          if (Or(p)) {
            const T = s[u], C = o[p] = A(T) || I(T) ? {
              type: T
            } : le({}, T), z = C.type;
            let F = false, ee = true;
            if (A(z)) for (let L = 0; L < z.length; ++L) {
              const Y = z[L], X = I(Y) && Y.name;
              if (X === "Boolean") {
                F = true;
                break;
              } else X === "String" && (ee = false);
            }
            else F = I(z) && z.name === "Boolean";
            C[0] = F, C[1] = ee, (F || N(C, "default")) && a.push(p);
          }
        }
        const h = [
          o,
          a
        ];
        return J(e) && r.set(e, h), h;
      }
      function Or(e) {
        return e[0] !== "$" && !At(e);
      }
      const gr = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", _r = (e) => A(e) ? e.map(Fe) : [
        Fe(e)
      ], Po = (e, t, n) => {
        if (t._n) return t;
        const r = Zs((...i) => _r(t(...i)), n);
        return r._c = false, r;
      }, Gi = (e, t, n) => {
        const r = e._ctx;
        for (const i in e) {
          if (gr(i)) continue;
          const s = e[i];
          if (I(s)) t[i] = Po(i, s, r);
          else if (s != null) {
            const o = _r(s);
            t[i] = () => o;
          }
        }
      }, Ni = (e, t) => {
        const n = _r(t);
        e.slots.default = () => n;
      }, Wi = (e, t, n) => {
        for (const r in t) (n || !gr(r)) && (e[r] = t[r]);
      }, Ro = (e, t, n) => {
        const r = e.slots = Bi();
        if (e.vnode.shapeFlag & 32) {
          const i = t.__;
          i && jn(r, "__", i, true);
          const s = t._;
          s ? (Wi(r, t, n), n && jn(r, "_", s, true)) : Gi(t, r);
        } else t && Ni(e, t);
      }, Mo = (e, t, n) => {
        const { vnode: r, slots: i } = e;
        let s = true, o = $;
        if (r.shapeFlag & 32) {
          const a = t._;
          a ? n && a === 1 ? s = false : Wi(i, t, n) : (s = !t.$stable, Gi(t, i)), o = t;
        } else t && (Ni(e, t), o = {
          default: 1
        });
        if (s) for (const a in i) !gr(a) && o[a] == null && delete i[a];
      }, ve = Wo;
      function Oo(e) {
        return Ao(e);
      }
      function Ao(e, t) {
        const n = bn();
        n.__VUE__ = true;
        const { insert: r, remove: i, patchProp: s, createElement: o, createText: a, createComment: c, setText: h, setElementText: u, parentNode: p, nextSibling: T, setScopeId: C = ze, insertStaticContent: z } = e, F = (l, f, d, b = null, g = null, _ = null, w = void 0, y = null, v = !!f.dynamicChildren) => {
          if (l === f) return;
          l && !Rt(l, f) && (b = Z(l), te(l, g, _, true), l = null), f.patchFlag === -2 && (v = false, f.dynamicChildren = null);
          const { type: m, ref: P, shapeFlag: S } = f;
          switch (m) {
            case yn:
              ee(l, f, d, b);
              break;
            case Ze:
              L(l, f, d, b);
              break;
            case tn:
              l == null && Y(f, d, b, w);
              break;
            case We:
              ft(l, f, d, b, g, _, w, y, v);
              break;
            default:
              S & 1 ? Q(l, f, d, b, g, _, w, y, v) : S & 6 ? nt(l, f, d, b, g, _, w, y, v) : (S & 64 || S & 128) && m.process(l, f, d, b, g, _, w, y, v, Se);
          }
          P != null && g ? zt(P, l && l.ref, _, f || l, !f) : P == null && l && l.ref != null && zt(l.ref, null, _, l, true);
        }, ee = (l, f, d, b) => {
          if (l == null) r(f.el = a(f.children), d, b);
          else {
            const g = f.el = l.el;
            f.children !== l.children && h(g, f.children);
          }
        }, L = (l, f, d, b) => {
          l == null ? r(f.el = c(f.children || ""), d, b) : f.el = l.el;
        }, Y = (l, f, d, b) => {
          [l.el, l.anchor] = z(l.children, f, d, b, l.el, l.anchor);
        }, X = ({ el: l, anchor: f }, d, b) => {
          let g;
          for (; l && l !== f; ) g = T(l), r(l, d, b), l = g;
          r(f, d, b);
        }, R = ({ el: l, anchor: f }) => {
          let d;
          for (; l && l !== f; ) d = T(l), i(l), l = d;
          i(f);
        }, Q = (l, f, d, b, g, _, w, y, v) => {
          f.type === "svg" ? w = "svg" : f.type === "math" && (w = "mathml"), l == null ? Te(f, d, b, g, _, w, y, v) : ct(l, f, g, _, w, y, v);
        }, Te = (l, f, d, b, g, _, w, y) => {
          let v, m;
          const { props: P, shapeFlag: S, transition: E, dirs: O } = l;
          if (v = l.el = o(l.type, _, P && P.is, P), S & 8 ? u(v, l.children) : S & 16 && Re(l.children, v, null, b, g, An(l, _), w, y), O && rt(l, null, b, "created"), ye(v, l, l.scopeId, w, b), P) {
            for (const k in P) k !== "value" && !At(k) && s(v, k, null, P[k], _, b);
            "value" in P && s(v, "value", null, P.value, _), (m = P.onVnodeBeforeMount) && Ie(m, b, l);
          }
          O && rt(l, null, b, "beforeMount");
          const V = Io(g, E);
          V && E.beforeEnter(v), r(v, f, d), ((m = P && P.onVnodeMounted) || V || O) && ve(() => {
            m && Ie(m, b, l), V && E.enter(v), O && rt(l, null, b, "mounted");
          }, g);
        }, ye = (l, f, d, b, g) => {
          if (d && C(l, d), b) for (let _ = 0; _ < b.length; _++) C(l, b[_]);
          if (g) {
            let _ = g.subTree;
            if (f === _ || Yi(_.type) && (_.ssContent === f || _.ssFallback === f)) {
              const w = g.vnode;
              ye(l, w, w.scopeId, w.slotScopeIds, g.parent);
            }
          }
        }, Re = (l, f, d, b, g, _, w, y, v = 0) => {
          for (let m = v; m < l.length; m++) {
            const P = l[m] = y ? Xe(l[m]) : Fe(l[m]);
            F(null, P, f, d, b, g, _, w, y);
          }
        }, ct = (l, f, d, b, g, _, w) => {
          const y = f.el = l.el;
          let { patchFlag: v, dynamicChildren: m, dirs: P } = f;
          v |= l.patchFlag & 16;
          const S = l.props || $, E = f.props || $;
          let O;
          if (d && it(d, false), (O = E.onVnodeBeforeUpdate) && Ie(O, d, f, l), P && rt(f, l, d, "beforeUpdate"), d && it(d, true), (S.innerHTML && E.innerHTML == null || S.textContent && E.textContent == null) && u(y, ""), m ? Be(l.dynamicChildren, m, y, d, b, An(f, g), _) : w || B(l, f, y, null, d, b, An(f, g), _, false), v > 0) {
            if (v & 16) tt(y, S, E, d, g);
            else if (v & 2 && S.class !== E.class && s(y, "class", null, E.class, g), v & 4 && s(y, "style", S.style, E.style, g), v & 8) {
              const V = f.dynamicProps;
              for (let k = 0; k < V.length; k++) {
                const W = V[k], pe = S[W], ge = E[W];
                (ge !== pe || W === "value") && s(y, W, pe, ge, g, d);
              }
            }
            v & 1 && l.children !== f.children && u(y, f.children);
          } else !w && m == null && tt(y, S, E, d, g);
          ((O = E.onVnodeUpdated) || P) && ve(() => {
            O && Ie(O, d, f, l), P && rt(f, l, d, "updated");
          }, b);
        }, Be = (l, f, d, b, g, _, w) => {
          for (let y = 0; y < f.length; y++) {
            const v = l[y], m = f[y], P = v.el && (v.type === We || !Rt(v, m) || v.shapeFlag & 198) ? p(v.el) : d;
            F(v, m, P, null, b, g, _, w, true);
          }
        }, tt = (l, f, d, b, g) => {
          if (f !== d) {
            if (f !== $) for (const _ in f) !At(_) && !(_ in d) && s(l, _, f[_], null, g, b);
            for (const _ in d) {
              if (At(_)) continue;
              const w = d[_], y = f[_];
              w !== y && _ !== "value" && s(l, _, y, w, g, b);
            }
            "value" in d && s(l, "value", f.value, d.value, g);
          }
        }, ft = (l, f, d, b, g, _, w, y, v) => {
          const m = f.el = l ? l.el : a(""), P = f.anchor = l ? l.anchor : a("");
          let { patchFlag: S, dynamicChildren: E, slotScopeIds: O } = f;
          O && (y = y ? y.concat(O) : O), l == null ? (r(m, d, b), r(P, d, b), Re(f.children || [], d, P, g, _, w, y, v)) : S > 0 && S & 64 && E && l.dynamicChildren ? (Be(l.dynamicChildren, E, d, g, _, w, y), (f.key != null || g && f === g.subTree) && Hi(l, f, true)) : B(l, f, d, P, g, _, w, y, v);
        }, nt = (l, f, d, b, g, _, w, y, v) => {
          f.slotScopeIds = y, l == null ? f.shapeFlag & 512 ? g.ctx.activate(f, d, b, w, v) : ut(f, d, b, g, _, w, v) : Ct(l, f, v);
        }, ut = (l, f, d, b, g, _, w) => {
          const y = l.component = Qo(l, b, g);
          if (Ai(l) && (y.ctx.renderer = Se), el(y, false, w), y.asyncDep) {
            if (g && g.registerDep(y, ie, w), !l.el) {
              const v = y.subTree = Pe(Ze);
              L(null, v, f, d), l.placeholder = v.el;
            }
          } else ie(y, l, f, d, g, _, w);
        }, Ct = (l, f, d) => {
          const b = f.component = l.component;
          if (Go(l, f, d)) if (b.asyncDep && !b.asyncResolved) {
            K(b, f, d);
            return;
          } else b.next = f, b.update();
          else f.el = l.el, b.vnode = f;
        }, ie = (l, f, d, b, g, _, w) => {
          const y = () => {
            if (l.isMounted) {
              let { next: S, bu: E, u: O, parent: V, vnode: k } = l;
              {
                const Oe = $i(l);
                if (Oe) {
                  S && (S.el = k.el, K(l, S, w)), Oe.asyncDep.then(() => {
                    l.isUnmounted || y();
                  });
                  return;
                }
              }
              let W = S, pe;
              it(l, false), S ? (S.el = k.el, K(l, S, w)) : S = k, E && Sn(E), (pe = S.props && S.props.onVnodeBeforeUpdate) && Ie(pe, V, S, k), it(l, true);
              const ge = Ir(l), Me = l.subTree;
              l.subTree = ge, F(Me, ge, p(Me.el), Z(Me), l, g, _), S.el = ge.el, W === null && No(l, ge.el), O && ve(O, g), (pe = S.props && S.props.onVnodeUpdated) && ve(() => Ie(pe, V, S, k), g);
            } else {
              let S;
              const { el: E, props: O } = f, { bm: V, m: k, parent: W, root: pe, type: ge } = l, Me = Dt(f);
              it(l, false), V && Sn(V), !Me && (S = O && O.onVnodeBeforeMount) && Ie(S, W, f), it(l, true);
              {
                pe.ce && pe.ce._def.shadowRoot !== false && pe.ce._injectChildStyle(ge);
                const Oe = l.subTree = Ir(l);
                F(null, Oe, d, b, l, g, _), f.el = Oe.el;
              }
              if (k && ve(k, g), !Me && (S = O && O.onVnodeMounted)) {
                const Oe = f;
                ve(() => Ie(S, W, Oe), g);
              }
              (f.shapeFlag & 256 || W && Dt(W.vnode) && W.vnode.shapeFlag & 256) && l.a && ve(l.a, g), l.isMounted = true, f = d = b = null;
            }
          };
          l.scope.on();
          const v = l.effect = new ai(y);
          l.scope.off();
          const m = l.update = v.run.bind(v), P = l.job = v.runIfDirty.bind(v);
          P.i = l, P.id = l.uid, v.scheduler = () => ur(P), it(l, true), m();
        }, K = (l, f, d) => {
          f.component = l;
          const b = l.vnode.props;
          l.vnode = f, l.next = null, Co(l, f.props, b, d), Mo(l, f.children, d), Ke(), Cr(l), ke();
        }, B = (l, f, d, b, g, _, w, y, v = false) => {
          const m = l && l.children, P = l ? l.shapeFlag : 0, S = f.children, { patchFlag: E, shapeFlag: O } = f;
          if (E > 0) {
            if (E & 128) {
              dt(m, S, d, b, g, _, w, y, v);
              return;
            } else if (E & 256) {
              je(m, S, d, b, g, _, w, y, v);
              return;
            }
          }
          O & 8 ? (P & 16 && ne(m, g, _), S !== m && u(d, S)) : P & 16 ? O & 16 ? dt(m, S, d, b, g, _, w, y, v) : ne(m, g, _, true) : (P & 8 && u(d, ""), O & 16 && Re(S, d, b, g, _, w, y, v));
        }, je = (l, f, d, b, g, _, w, y, v) => {
          l = l || mt, f = f || mt;
          const m = l.length, P = f.length, S = Math.min(m, P);
          let E;
          for (E = 0; E < S; E++) {
            const O = f[E] = v ? Xe(f[E]) : Fe(f[E]);
            F(l[E], O, d, null, g, _, w, y, v);
          }
          m > P ? ne(l, g, _, true, false, S) : Re(f, d, b, g, _, w, y, v, S);
        }, dt = (l, f, d, b, g, _, w, y, v) => {
          let m = 0;
          const P = f.length;
          let S = l.length - 1, E = P - 1;
          for (; m <= S && m <= E; ) {
            const O = l[m], V = f[m] = v ? Xe(f[m]) : Fe(f[m]);
            if (Rt(O, V)) F(O, V, d, null, g, _, w, y, v);
            else break;
            m++;
          }
          for (; m <= S && m <= E; ) {
            const O = l[S], V = f[E] = v ? Xe(f[E]) : Fe(f[E]);
            if (Rt(O, V)) F(O, V, d, null, g, _, w, y, v);
            else break;
            S--, E--;
          }
          if (m > S) {
            if (m <= E) {
              const O = E + 1, V = O < P ? f[O].el : b;
              for (; m <= E; ) F(null, f[m] = v ? Xe(f[m]) : Fe(f[m]), d, V, g, _, w, y, v), m++;
            }
          } else if (m > E) for (; m <= S; ) te(l[m], g, _, true), m++;
          else {
            const O = m, V = m, k = /* @__PURE__ */ new Map();
            for (m = V; m <= E; m++) {
              const me = f[m] = v ? Xe(f[m]) : Fe(f[m]);
              me.key != null && k.set(me.key, m);
            }
            let W, pe = 0;
            const ge = E - V + 1;
            let Me = false, Oe = 0;
            const Et = new Array(ge);
            for (m = 0; m < ge; m++) Et[m] = 0;
            for (m = O; m <= S; m++) {
              const me = l[m];
              if (pe >= ge) {
                te(me, g, _, true);
                continue;
              }
              let Ae;
              if (me.key != null) Ae = k.get(me.key);
              else for (W = V; W <= E; W++) if (Et[W - V] === 0 && Rt(me, f[W])) {
                Ae = W;
                break;
              }
              Ae === void 0 ? te(me, g, _, true) : (Et[Ae - V] = m + 1, Ae >= Oe ? Oe = Ae : Me = true, F(me, f[Ae], d, null, g, _, w, y, v), pe++);
            }
            const vr = Me ? Uo(Et) : mt;
            for (W = vr.length - 1, m = ge - 1; m >= 0; m--) {
              const me = V + m, Ae = f[me], xr = f[me + 1], yr = me + 1 < P ? xr.el || xr.placeholder : b;
              Et[m] === 0 ? F(null, Ae, d, yr, g, _, w, y, v) : Me && (W < 0 || m !== vr[W] ? Ve(Ae, d, yr, 2) : W--);
            }
          }
        }, Ve = (l, f, d, b, g = null) => {
          const { el: _, type: w, transition: y, children: v, shapeFlag: m } = l;
          if (m & 6) {
            Ve(l.component.subTree, f, d, b);
            return;
          }
          if (m & 128) {
            l.suspense.move(f, d, b);
            return;
          }
          if (m & 64) {
            w.move(l, f, d, Se);
            return;
          }
          if (w === We) {
            r(_, f, d);
            for (let S = 0; S < v.length; S++) Ve(v[S], f, d, b);
            r(l.anchor, f, d);
            return;
          }
          if (w === tn) {
            X(l, f, d);
            return;
          }
          if (b !== 2 && m & 1 && y) if (b === 0) y.beforeEnter(_), r(_, f, d), ve(() => y.enter(_), g);
          else {
            const { leave: S, delayLeave: E, afterLeave: O } = y, V = () => {
              l.ctx.isUnmounted ? i(_) : r(_, f, d);
            }, k = () => {
              S(_, () => {
                V(), O && O();
              });
            };
            E ? E(_, V, k) : k();
          }
          else r(_, f, d);
        }, te = (l, f, d, b = false, g = false) => {
          const { type: _, props: w, ref: y, children: v, dynamicChildren: m, shapeFlag: P, patchFlag: S, dirs: E, cacheIndex: O } = l;
          if (S === -2 && (g = false), y != null && (Ke(), zt(y, null, d, l, true), ke()), O != null && (f.renderCache[O] = void 0), P & 256) {
            f.ctx.deactivate(l);
            return;
          }
          const V = P & 1 && E, k = !Dt(l);
          let W;
          if (k && (W = w && w.onVnodeBeforeUnmount) && Ie(W, f, l), P & 6) j(l.component, d, b);
          else {
            if (P & 128) {
              l.suspense.unmount(d, b);
              return;
            }
            V && rt(l, null, f, "beforeUnmount"), P & 64 ? l.type.remove(l, f, d, Se, b) : m && !m.hasOnce && (_ !== We || S > 0 && S & 64) ? ne(m, f, d, false, true) : (_ === We && S & 384 || !g && P & 16) && ne(v, f, d), b && M(l);
          }
          (k && (W = w && w.onVnodeUnmounted) || V) && ve(() => {
            W && Ie(W, f, l), V && rt(l, null, f, "unmounted");
          }, d);
        }, M = (l) => {
          const { type: f, el: d, anchor: b, transition: g } = l;
          if (f === We) {
            x(d, b);
            return;
          }
          if (f === tn) {
            R(l);
            return;
          }
          const _ = () => {
            i(d), g && !g.persisted && g.afterLeave && g.afterLeave();
          };
          if (l.shapeFlag & 1 && g && !g.persisted) {
            const { leave: w, delayLeave: y } = g, v = () => w(d, _);
            y ? y(l.el, _, v) : v();
          } else _();
        }, x = (l, f) => {
          let d;
          for (; l !== f; ) d = T(l), i(l), l = d;
          i(f);
        }, j = (l, f, d) => {
          const { bum: b, scope: g, job: _, subTree: w, um: y, m: v, a: m, parent: P, slots: { __: S } } = l;
          Ar(v), Ar(m), b && Sn(b), P && A(S) && S.forEach((E) => {
            P.renderCache[E] = void 0;
          }), g.stop(), _ && (_.flags |= 8, te(w, l, f, d)), y && ve(y, f), ve(() => {
            l.isUnmounted = true;
          }, f), f && f.pendingBranch && !f.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
        }, ne = (l, f, d, b = false, g = false, _ = 0) => {
          for (let w = _; w < l.length; w++) te(l[w], f, d, b, g);
        }, Z = (l) => {
          if (l.shapeFlag & 6) return Z(l.component.subTree);
          if (l.shapeFlag & 128) return l.suspense.next();
          const f = T(l.anchor || l.el), d = f && f[eo];
          return d ? T(d) : f;
        };
        let ae = false;
        const be = (l, f, d) => {
          l == null ? f._vnode && te(f._vnode, null, null, true) : F(f._vnode || null, l, f, null, null, null, d), f._vnode = l, ae || (ae = true, Cr(), Ei(), ae = false);
        }, Se = {
          p: F,
          um: te,
          m: Ve,
          r: M,
          mt: ut,
          mc: Re,
          pc: B,
          pbc: Be,
          n: Z,
          o: e
        };
        return {
          render: be,
          hydrate: void 0,
          createApp: wo(be)
        };
      }
      function An({ type: e, props: t }, n) {
        return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
      }
      function it({ effect: e, job: t }, n) {
        n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
      }
      function Io(e, t) {
        return (!e || e && !e.pendingBranch) && t && !t.persisted;
      }
      function Hi(e, t, n = false) {
        const r = e.children, i = t.children;
        if (A(r) && A(i)) for (let s = 0; s < r.length; s++) {
          const o = r[s];
          let a = i[s];
          a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[s] = Xe(i[s]), a.el = o.el), !n && a.patchFlag !== -2 && Hi(o, a)), a.type === yn && (a.el = o.el), a.type === Ze && !a.el && (a.el = o.el);
        }
      }
      function Uo(e) {
        const t = e.slice(), n = [
          0
        ];
        let r, i, s, o, a;
        const c = e.length;
        for (r = 0; r < c; r++) {
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
      const Fo = Symbol.for("v-scx"), zo = () => en(Fo);
      function In(e, t, n) {
        return Ki(e, t, n);
      }
      function Ki(e, t, n = $) {
        const { immediate: r, deep: i, flush: s, once: o } = n, a = le({}, n), c = t && r || !t && s !== "post";
        let h;
        if ($t) {
          if (s === "sync") {
            const C = zo();
            h = C.__watcherHandles || (C.__watcherHandles = []);
          } else if (!c) {
            const C = () => {
            };
            return C.stop = ze, C.resume = ze, C.pause = ze, C;
          }
        }
        const u = he;
        a.call = (C, z, F) => De(C, u, z, F);
        let p = false;
        s === "post" ? a.scheduler = (C) => {
          ve(C, u && u.suspense);
        } : s !== "sync" && (p = true, a.scheduler = (C, z) => {
          z ? C() : ur(C);
        }), a.augmentJob = (C) => {
          t && (C.flags |= 4), p && (C.flags |= 2, u && (C.id = u.uid, C.i = u));
        };
        const T = Ys(e, t, a);
        return $t && (h ? h.push(T) : c && T()), T;
      }
      function Do(e, t, n) {
        const r = this.proxy, i = re(e) ? e.includes(".") ? ki(r, e) : () => r[e] : e.bind(r, r);
        let s;
        I(t) ? s = t : (s = t.handler, n = t);
        const o = kt(this), a = Ki(i, s.bind(r), n);
        return o(), a;
      }
      function ki(e, t) {
        const n = t.split(".");
        return () => {
          let r = e;
          for (let i = 0; i < n.length && r; i++) r = r[n[i]];
          return r;
        };
      }
      const Bo = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Qe(t)}Modifiers`] || e[`${at(t)}Modifiers`];
      function jo(e, t, ...n) {
        if (e.isUnmounted) return;
        const r = e.vnode.props || $;
        let i = n;
        const s = t.startsWith("update:"), o = s && Bo(r, t.slice(7));
        o && (o.trim && (i = n.map((u) => re(u) ? u.trim() : u)), o.number && (i = n.map(hs)));
        let a, c = r[a = Tn(t)] || r[a = Tn(Qe(t))];
        !c && s && (c = r[a = Tn(at(t))]), c && De(c, e, 6, i);
        const h = r[a + "Once"];
        if (h) {
          if (!e.emitted) e.emitted = {};
          else if (e.emitted[a]) return;
          e.emitted[a] = true, De(h, e, 6, i);
        }
      }
      function qi(e, t, n = false) {
        const r = t.emitsCache, i = r.get(e);
        if (i !== void 0) return i;
        const s = e.emits;
        let o = {}, a = false;
        if (!I(e)) {
          const c = (h) => {
            const u = qi(h, t, true);
            u && (a = true, le(o, u));
          };
          !n && t.mixins.length && t.mixins.forEach(c), e.extends && c(e.extends), e.mixins && e.mixins.forEach(c);
        }
        return !s && !a ? (J(e) && r.set(e, null), null) : (A(s) ? s.forEach((c) => o[c] = null) : le(o, s), J(e) && r.set(e, o), o);
      }
      function xn(e, t) {
        return !e || !pn(t) ? false : (t = t.slice(2).replace(/Once$/, ""), N(e, t[0].toLowerCase() + t.slice(1)) || N(e, at(t)) || N(e, t));
      }
      function Ir(e) {
        const { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [s], slots: o, attrs: a, emit: c, render: h, renderCache: u, props: p, data: T, setupState: C, ctx: z, inheritAttrs: F } = e, ee = fn(e);
        let L, Y;
        try {
          if (n.shapeFlag & 4) {
            const R = i || r, Q = R;
            L = Fe(h.call(Q, R, u, p, C, T, z)), Y = a;
          } else {
            const R = t;
            L = Fe(R.length > 1 ? R(p, {
              attrs: a,
              slots: o,
              emit: c
            }) : R(p, null)), Y = t.props ? a : Vo(a);
          }
        } catch (R) {
          jt.length = 0, mn(R, e, 1), L = Pe(Ze);
        }
        let X = L;
        if (Y && F !== false) {
          const R = Object.keys(Y), { shapeFlag: Q } = X;
          R.length && Q & 7 && (s && R.some(Qn) && (Y = Lo(Y, s)), X = St(X, Y, false, true));
        }
        return n.dirs && (X = St(X, null, false, true), X.dirs = X.dirs ? X.dirs.concat(n.dirs) : n.dirs), n.transition && dr(X, n.transition), L = X, fn(ee), L;
      }
      const Vo = (e) => {
        let t;
        for (const n in e) (n === "class" || n === "style" || pn(n)) && ((t || (t = {}))[n] = e[n]);
        return t;
      }, Lo = (e, t) => {
        const n = {};
        for (const r in e) (!Qn(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
        return n;
      };
      function Go(e, t, n) {
        const { props: r, children: i, component: s } = e, { props: o, children: a, patchFlag: c } = t, h = s.emitsOptions;
        if (t.dirs || t.transition) return true;
        if (n && c >= 0) {
          if (c & 1024) return true;
          if (c & 16) return r ? Ur(r, o, h) : !!o;
          if (c & 8) {
            const u = t.dynamicProps;
            for (let p = 0; p < u.length; p++) {
              const T = u[p];
              if (o[T] !== r[T] && !xn(h, T)) return true;
            }
          }
        } else return (i || a) && (!a || !a.$stable) ? true : r === o ? false : r ? o ? Ur(r, o, h) : true : !!o;
        return false;
      }
      function Ur(e, t, n) {
        const r = Object.keys(t);
        if (r.length !== Object.keys(e).length) return true;
        for (let i = 0; i < r.length; i++) {
          const s = r[i];
          if (t[s] !== e[s] && !xn(n, s)) return true;
        }
        return false;
      }
      function No({ vnode: e, parent: t }, n) {
        for (; t; ) {
          const r = t.subTree;
          if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
          else break;
        }
      }
      const Yi = (e) => e.__isSuspense;
      function Wo(e, t) {
        t && t.pendingBranch ? A(e) ? t.effects.push(...e) : t.effects.push(e) : Qs(e);
      }
      const We = Symbol.for("v-fgt"), yn = Symbol.for("v-txt"), Ze = Symbol.for("v-cmt"), tn = Symbol.for("v-stc"), jt = [];
      let xe = null;
      function Tt(e = false) {
        jt.push(xe = e ? null : []);
      }
      function Ho() {
        jt.pop(), xe = jt[jt.length - 1] || null;
      }
      let Ht = 1;
      function Fr(e, t = false) {
        Ht += e, e < 0 && xe && t && (xe.hasOnce = true);
      }
      function Xi(e) {
        return e.dynamicChildren = Ht > 0 ? xe || mt : null, Ho(), Ht > 0 && xe && xe.push(e), e;
      }
      function Vt(e, t, n, r, i, s) {
        return Xi(H(e, t, n, r, i, s, true));
      }
      function $o(e, t, n, r, i) {
        return Xi(Pe(e, t, n, r, i, true));
      }
      function Ji(e) {
        return e ? e.__v_isVNode === true : false;
      }
      function Rt(e, t) {
        return e.type === t.type && e.key === t.key;
      }
      const Qi = ({ key: e }) => e ?? null, nn = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? re(e) || oe(e) || I(e) ? {
        i: we,
        r: e,
        k: t,
        f: !!n
      } : e : null);
      function H(e, t = null, n = null, r = 0, i = null, s = e === We ? 0 : 1, o = false, a = false) {
        const c = {
          __v_isVNode: true,
          __v_skip: true,
          type: e,
          props: t,
          key: t && Qi(t),
          ref: t && nn(t),
          scopeId: Ri,
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
          ctx: we
        };
        return a ? (br(c, n), s & 128 && e.normalize(c)) : n && (c.shapeFlag |= re(n) ? 8 : 16), Ht > 0 && !o && xe && (c.patchFlag > 0 || s & 6) && c.patchFlag !== 32 && xe.push(c), c;
      }
      const Pe = Ko;
      function Ko(e, t = null, n = null, r = 0, i = null, s = false) {
        if ((!e || e === po) && (e = Ze), Ji(e)) {
          const a = St(e, t, true);
          return n && br(a, n), Ht > 0 && !s && xe && (a.shapeFlag & 6 ? xe[xe.indexOf(e)] = a : xe.push(a)), a.patchFlag = -2, a;
        }
        if (il(e) && (e = e.__vccOpts), t) {
          t = ko(t);
          let { class: a, style: c } = t;
          a && !re(a) && (t.class = xt(a)), J(c) && (fr(c) && !A(c) && (c = le({}, c)), t.style = tr(c));
        }
        const o = re(e) ? 1 : Yi(e) ? 128 : to(e) ? 64 : J(e) ? 4 : I(e) ? 2 : 0;
        return H(e, t, n, r, i, o, s, true);
      }
      function ko(e) {
        return e ? fr(e) || ji(e) ? le({}, e) : e : null;
      }
      function St(e, t, n = false, r = false) {
        const { props: i, ref: s, patchFlag: o, children: a, transition: c } = e, h = t ? Yo(i || {}, t) : i, u = {
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
          patchFlag: t && e.type !== We ? o === -1 ? 16 : o | 16 : o,
          dynamicProps: e.dynamicProps,
          dynamicChildren: e.dynamicChildren,
          appContext: e.appContext,
          dirs: e.dirs,
          transition: c,
          component: e.component,
          suspense: e.suspense,
          ssContent: e.ssContent && St(e.ssContent),
          ssFallback: e.ssFallback && St(e.ssFallback),
          placeholder: e.placeholder,
          el: e.el,
          anchor: e.anchor,
          ctx: e.ctx,
          ce: e.ce
        };
        return c && r && dr(u, c.clone(u)), u;
      }
      function fe(e = " ", t = 0) {
        return Pe(yn, null, e, t);
      }
      function qo(e, t) {
        const n = Pe(tn, null, e);
        return n.staticCount = t, n;
      }
      function zr(e = "", t = false) {
        return t ? (Tt(), $o(Ze, null, e)) : Pe(Ze, null, e);
      }
      function Fe(e) {
        return e == null || typeof e == "boolean" ? Pe(Ze) : A(e) ? Pe(We, null, e.slice()) : Ji(e) ? Xe(e) : Pe(yn, null, String(e));
      }
      function Xe(e) {
        return e.el === null && e.patchFlag !== -1 || e.memo ? e : St(e);
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
          !i && !ji(t) ? t._ctx = we : i === 3 && we && (we.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
        }
        else I(t) ? (t = {
          default: t,
          _ctx: we
        }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
          fe(t)
        ]) : n = 8);
        e.children = t, e.shapeFlag |= n;
      }
      function Yo(...e) {
        const t = {};
        for (let n = 0; n < e.length; n++) {
          const r = e[n];
          for (const i in r) if (i === "class") t.class !== r.class && (t.class = xt([
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
        De(e, t, 7, [
          n,
          r
        ]);
      }
      const Xo = zi();
      let Jo = 0;
      function Qo(e, t, n) {
        const r = e.type, i = (t ? t.appContext : e.appContext) || Xo, s = {
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
          scope: new xs(true),
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
          propsOptions: Li(r, i),
          emitsOptions: qi(r, i),
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
        }, s.root = t ? t.root : s, s.emit = jo.bind(null, s), e.ce && e.ce(s), s;
      }
      let he = null;
      const Zo = () => he || we;
      let dn, Yn;
      {
        const e = bn(), t = (n, r) => {
          let i;
          return (i = e[n]) || (i = e[n] = []), i.push(r), (s) => {
            i.length > 1 ? i.forEach((o) => o(s)) : i[0](s);
          };
        };
        dn = t("__VUE_INSTANCE_SETTERS__", (n) => he = n), Yn = t("__VUE_SSR_SETTERS__", (n) => $t = n);
      }
      const kt = (e) => {
        const t = he;
        return dn(e), e.scope.on(), () => {
          e.scope.off(), dn(t);
        };
      }, Dr = () => {
        he && he.scope.off(), dn(null);
      };
      function Zi(e) {
        return e.vnode.shapeFlag & 4;
      }
      let $t = false;
      function el(e, t = false, n = false) {
        t && Yn(t);
        const { props: r, children: i } = e.vnode, s = Zi(e);
        So(e, r, s, t), Ro(e, i, n || t);
        const o = s ? tl(e, t) : void 0;
        return t && Yn(false), o;
      }
      function tl(e, t) {
        const n = e.type;
        e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, go);
        const { setup: r } = n;
        if (r) {
          Ke();
          const i = e.setupContext = r.length > 1 ? rl(e) : null, s = kt(e), o = Kt(r, e, 0, [
            e.props,
            i
          ]), a = ti(o);
          if (ke(), s(), (a || e.sp) && !Dt(e) && Oi(e), a) {
            if (o.then(Dr, Dr), t) return o.then((c) => {
              Br(e, c);
            }).catch((c) => {
              mn(c, e, 0);
            });
            e.asyncDep = o;
          } else Br(e, o);
        } else es(e);
      }
      function Br(e, t, n) {
        I(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : J(t) && (e.setupState = Ti(t)), es(e);
      }
      function es(e, t, n) {
        const r = e.type;
        e.render || (e.render = r.render || ze);
        {
          const i = kt(e);
          Ke();
          try {
            _o(e);
          } finally {
            ke(), i();
          }
        }
      }
      const nl = {
        get(e, t) {
          return se(e, "get", ""), e[t];
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
        return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Ti(Gs(e.exposed)), {
          get(t, n) {
            if (n in t) return t[n];
            if (n in Bt) return Bt[n](e);
          },
          has(t, n) {
            return n in t || n in Bt;
          }
        })) : e.proxy;
      }
      function il(e) {
        return I(e) && "__vccOpts" in e;
      }
      const ts = (e, t) => ks(e, t, $t), sl = "3.5.18";
      let Xn;
      const jr = typeof window < "u" && window.trustedTypes;
      if (jr) try {
        Xn = jr.createPolicy("vue", {
          createHTML: (e) => e
        });
      } catch {
      }
      const ns = Xn ? (e) => Xn.createHTML(e) : (e) => e, ol = "http://www.w3.org/2000/svg", ll = "http://www.w3.org/1998/Math/MathML", Ne = typeof document < "u" ? document : null, Vr = Ne && Ne.createElement("template"), al = {
        insert: (e, t, n) => {
          t.insertBefore(e, n || null);
        },
        remove: (e) => {
          const t = e.parentNode;
          t && t.removeChild(e);
        },
        createElement: (e, t, n, r) => {
          const i = t === "svg" ? Ne.createElementNS(ol, e) : t === "mathml" ? Ne.createElementNS(ll, e) : n ? Ne.createElement(e, {
            is: n
          }) : Ne.createElement(e);
          return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
        },
        createText: (e) => Ne.createTextNode(e),
        createComment: (e) => Ne.createComment(e),
        setText: (e, t) => {
          e.nodeValue = t;
        },
        setElementText: (e, t) => {
          e.textContent = t;
        },
        parentNode: (e) => e.parentNode,
        nextSibling: (e) => e.nextSibling,
        querySelector: (e) => Ne.querySelector(e),
        setScopeId(e, t) {
          e.setAttribute(t, "");
        },
        insertStaticContent(e, t, n, r, i, s) {
          const o = n ? n.previousSibling : t.lastChild;
          if (i && (i === s || i.nextSibling)) for (; t.insertBefore(i.cloneNode(true), n), !(i === s || !(i = i.nextSibling)); ) ;
          else {
            Vr.innerHTML = ns(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
            const a = Vr.content;
            if (r === "svg" || r === "mathml") {
              const c = a.firstChild;
              for (; c.firstChild; ) a.appendChild(c.firstChild);
              a.removeChild(c);
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
      const hn = Symbol("_vod"), rs = Symbol("_vsh"), Un = {
        beforeMount(e, { value: t }, { transition: n }) {
          e[hn] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : Mt(e, t);
        },
        mounted(e, { value: t }, { transition: n }) {
          n && t && n.enter(e);
        },
        updated(e, { value: t, oldValue: n }, { transition: r }) {
          !t != !n && (r ? t ? (r.beforeEnter(e), Mt(e, true), r.enter(e)) : r.leave(e, () => {
            Mt(e, false);
          }) : Mt(e, t));
        },
        beforeUnmount(e, { value: t }) {
          Mt(e, t);
        }
      };
      function Mt(e, t) {
        e.style.display = t ? e[hn] : "none", e[rs] = !t;
      }
      const ul = Symbol(""), dl = /(^|;)\s*display\s*:/;
      function hl(e, t, n) {
        const r = e.style, i = re(n);
        let s = false;
        if (n && !i) {
          if (t) if (re(t)) for (const o of t.split(";")) {
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
      const Lr = /\s*!important$/;
      function rn(e, t, n) {
        if (A(n)) n.forEach((r) => rn(e, t, r));
        else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
        else {
          const r = pl(e, t);
          Lr.test(n) ? e.setProperty(at(r), n.replace(Lr, ""), "important") : e[r] = n;
        }
      }
      const Gr = [
        "Webkit",
        "Moz",
        "ms"
      ], Fn = {};
      function pl(e, t) {
        const n = Fn[t];
        if (n) return n;
        let r = Qe(t);
        if (r !== "filter" && r in e) return Fn[t] = r;
        r = ii(r);
        for (let i = 0; i < Gr.length; i++) {
          const s = Gr[i] + r;
          if (s in e) return Fn[t] = s;
        }
        return t;
      }
      const Nr = "http://www.w3.org/1999/xlink";
      function Wr(e, t, n, r, i, s = vs(t)) {
        r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Nr, t.slice(6, t.length)) : e.setAttributeNS(Nr, t, n) : n == null || s && !si(n) ? e.removeAttribute(t) : e.setAttribute(t, s ? "" : et(n) ? String(n) : n);
      }
      function Hr(e, t, n, r, i) {
        if (t === "innerHTML" || t === "textContent") {
          n != null && (e[t] = t === "innerHTML" ? ns(n) : n);
          return;
        }
        const s = e.tagName;
        if (t === "value" && s !== "PROGRESS" && !s.includes("-")) {
          const a = s === "OPTION" ? e.getAttribute("value") || "" : e.value, c = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
          (a !== c || !("_value" in e)) && (e.value = c), n == null && e.removeAttribute(t), e._value = n;
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
          const [a, c] = ml(t);
          if (r) {
            const h = s[t] = yl(r, i);
            gl(e, a, h, c);
          } else o && (_l(e, a, o, c), s[t] = void 0);
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
          e[2] === ":" ? e.slice(3) : at(e.slice(2)),
          t
        ];
      }
      let zn = 0;
      const vl = Promise.resolve(), xl = () => zn || (vl.then(() => zn = 0), zn = Date.now());
      function yl(e, t) {
        const n = (r) => {
          if (!r._vts) r._vts = Date.now();
          else if (r._vts <= n.attached) return;
          De(wl(r, n.value), t, 5, [
            r
          ]);
        };
        return n.value = e, n.attached = xl(), n;
      }
      function wl(e, t) {
        if (A(t)) {
          const n = e.stopImmediatePropagation;
          return e.stopImmediatePropagation = () => {
            n.call(e), e._stopped = true;
          }, t.map((r) => (i) => !i._stopped && r && r(i));
        } else return t;
      }
      const kr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Tl = (e, t, n, r, i, s) => {
        const o = i === "svg";
        t === "class" ? fl(e, r, o) : t === "style" ? hl(e, n, r) : pn(t) ? Qn(t) || bl(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Sl(e, t, r, o)) ? (Hr(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Wr(e, t, r, o, s, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !re(r)) ? Hr(e, Qe(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), Wr(e, t, r, o));
      };
      function Sl(e, t, n, r) {
        if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && kr(t) && I(n));
        if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
        if (t === "width" || t === "height") {
          const i = e.tagName;
          if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE") return false;
        }
        return kr(t) && re(n) ? false : t in e;
      }
      const Cl = le({
        patchProp: Tl
      }, al);
      let qr;
      function El() {
        return qr || (qr = Oo(Cl));
      }
      const Pl = (...e) => {
        const t = El().createApp(...e), { mount: n } = t;
        return t.mount = (r) => {
          const i = Ml(r);
          if (!i) return;
          const s = t._component;
          !I(s) && !s.render && !s.template && (s.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
          const o = n(i, false, Rl(i));
          return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), o;
        }, t;
      };
      function Rl(e) {
        if (e instanceof SVGElement) return "svg";
        if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
      }
      function Ml(e) {
        return re(e) ? document.querySelector(e) : e;
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

fn mandelbrot_func(x0: f32, y0: f32) -> vec4<f32> {
    var dc = vec2<f32>(x0, y0);
//  let max_iter_f: f32 = clamp(80.0 + 40.0 * log2(1.0 / uniforms.scale), 128.0, 1000000.0);
    let max_iteration = mandelbrot.maxIteration;
    // draw a mandelbrot set
    var z = getOrbit(0);
    var dz = vec2<f32>(0.0, 0.0);
    var der = vec2<f32>(1.0, 0.0);
//    var distance = 0.0;
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
            i = i % min(256, max_iteration) + 1.0;
            i += (1.0 - nu) ;
        }
    }
//    let normalized_der
    let normalized_der = normalize(d);
    // length of d
//    let length_d = 1 / length(d);
    //let distance = 0.5 * log(dot_z) * dot_z / dot(d, d);

    // d = 0.5*sqrt(lz2/ld2)*(1.0-pow(lz2,-k))/k;

   // distance = 0.5 * sqrt(dot_z / dot(d,d)) * log(dot_z);
   	let distance = 0.5*sqrt(dot(dz,dz)/dot(d,d))*log(dot(dz,dz));
    return vec4<f32>(i, distance, normalized_der.x, normalized_der.y);
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
  return mandelbrot_func(dc.x, dc.y);
}
`, Al = `struct Uniforms {
  palettePeriod: f32,
  bloomStrength: f32,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
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

// Conversion d'une direction 3D en coordonn\xE9es UV pour une skybox equirectangulaire
fn dir_to_skybox_uv(dir: vec3<f32>) -> vec2<f32> {
  let d = normalize(dir);
  let u = 0.5 + atan2(d.z, d.x) / (2.0 * 3.14159265);
  let v = 0.5 - asin(d.y) / 3.14159265;
  return vec2<f32>(u, v);
}

fn tile_tessellation(v: f32, dist: f32, repeat: f32) -> vec3<f32> {
  let tileUV = vec2<f32>(fract(v * repeat), fract(dist * repeat));
  let tileIndex = vec2<i32>(i32(floor(v * repeat)), i32(floor(dist * repeat)));

  // Inversion en miroir sur x et/ou y selon la parit\xE9 de l'index
  let mirrorX = (tileIndex.x % 2) == 1;
  let mirrorY = (tileIndex.y % 2) == 1;
let uv = vec2<f32>(
  select(tileUV.x, 1.0 - tileUV.x, mirrorX),
  select(tileUV.y, 1.0 - tileUV.y, mirrorY)
);
  let texSize = vec2<i32>(textureDimensions(tileTex, 0));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  return textureLoad(tileTex, coord, 0).rgb;
}

fn palette(v: f32, len: f32, d: vec2<f32>, dx: f32, dy: f32) -> vec3<f32> {
  // Couleur de base
  let t = abs(v * 2.0 - 1.0);
  let r = 0.5 + 0.5 * cos(1.0 + t * 6.28 - dx / 2.0);
  let g = 0.5 + 0.5 * sin(2.0 + t * 5.88 - dy / 4.0);
  let b = 0.5 + 0.5 * cos(t * 3.14 + ((dx) / 8.0));
  var baseColor = vec3<f32>(r, g, b);

  // Calcul de la distance au centre de l'\xE9cran (coordonn\xE9es normalis\xE9es 0..1)
  let center = vec2<f32>(0.5, 0.5);
  let dist = distance(vec2<f32>(dx, dy), center);
  // Tesselation avec tileTex bas\xE9e sur v et la distance au centre
  let tessColor = tile_tessellation(sqrt(v) * 3.0 + dx, dy , 1.0);
//  let tessColor = tile_tessellation(sqrt(v) * 2.0,  (dy + 0.5) * (dx + 0.5) , 2.0);
  // M\xE9lange la couleur fractale avec la tesselation (modulation)
  let color =  tessColor;

  // --- Phong shading corrig\xE9 ---
  let normal = normalize(vec3<f32>(d.y, d.x, 1.0));
  let lightDir = normalize(vec3<f32>(0.2, 0.3, 0.9));
  let viewDir = vec3<f32>(0.0, 0.6, 1.0);
  let diff = max(dot(normal, lightDir), 0.0);
  let ambient = 1.0;
  let reflectDir = reflect(-lightDir, normal);
  let specular = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);
  let skyboxUV = dir_to_skybox_uv(reflectDir);
  let skyboxSize = vec2<i32>(textureDimensions(skyboxTex, 0));
  let skyboxCoord = vec2<i32>(
    i32(clamp(skyboxUV.x * f32(skyboxSize.x), 0.0, f32(skyboxSize.x - 1))),
    i32(clamp((1.0 - skyboxUV.y) * f32(skyboxSize.y), 0.0, f32(skyboxSize.y - 1)))
  );
  let skyboxColor = textureLoad(skyboxTex, skyboxCoord, 0).rgb;
  let phong = ambient + 1.0 * diff + 1.0 * specular * skyboxColor;
  let finalColor = color / phong * 2.0 ;
//  let finalColor = color * skyboxColor * phong ;
//  let finalColor = mix(color, skyboxColor * phong , 0.5);
  // invert finalColor for a more "spacey" look
//  finalColor = vec3<f32>(1.0) - finalColor;
  return clamp(finalColor, vec3<f32>(0.0), vec3<f32>(1.0));
  //return vec3<f32>(0.0,  1.0 - len , 0.0);

}


@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord;
  let texSize = vec2<i32>(textureDimensions(tex, 0));
  let center = vec2<f32>(0.5, 0.5);
  let blurStrength = uniforms.bloomStrength; // Utilis\xE9 comme force du blur radial
  let blurSamples = 4; // Nombre d'\xE9chantillons pour le blur
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
      sampleColor = vec3<f32>(0.0, 0.0, 0.0);
    } else {
      let v = fract(nu / period);
      sampleColor = palette(v, data.y, vec2<f32>(data.z, data.w), sampleUV.x, sampleUV.y);
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
`, Ul = "/mandelbrot/assets/mandelbrot_bg-CMJ4_2Jn.wasm", Fl = async (e = {}, t) => {
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
      let U;
      function zl(e) {
        U = e;
      }
      let Jt = null;
      function sn() {
        return (Jt === null || Jt.byteLength === 0) && (Jt = new Uint8Array(U.memory.buffer)), Jt;
      }
      const is = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
      let on = new is("utf-8", {
        ignoreBOM: true,
        fatal: true
      });
      on.decode();
      const Dl = 2146435072;
      let Dn = 0;
      function Bl(e, t) {
        return Dn += t, Dn >= Dl && (on = new is("utf-8", {
          ignoreBOM: true,
          fatal: true
        }), on.decode(), Dn = t), on.decode(sn().subarray(e, e + t));
      }
      function ss(e, t) {
        return e = e >>> 0, Bl(e, t);
      }
      let Qt = null;
      function jl() {
        return (Qt === null || Qt.byteLength === 0) && (Qt = new Float64Array(U.memory.buffer)), Qt;
      }
      function Vl(e, t) {
        return e = e >>> 0, jl().subarray(e / 8, e / 8 + t);
      }
      let gt = null;
      function Ll() {
        return (gt === null || gt.buffer.detached === true || gt.buffer.detached === void 0 && gt.buffer !== U.memory.buffer) && (gt = new DataView(U.memory.buffer)), gt;
      }
      function Gl(e, t) {
        e = e >>> 0;
        const n = Ll(), r = [];
        for (let i = e; i < e + 4 * t; i += 4) r.push(U.__wbindgen_export_0.get(n.getUint32(i, true)));
        return U.__externref_drop_slice(e, t), r;
      }
      let Lt = 0;
      const Nl = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder, ln = new Nl("utf-8"), Wl = typeof ln.encodeInto == "function" ? function(e, t) {
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
          const a = ln.encode(e), c = t(a.length, 1) >>> 0;
          return sn().subarray(c, c + a.length).set(a), Lt = a.length, c;
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
          const a = sn().subarray(i + o, i + r), c = Wl(e, a);
          o += c.written, i = n(i, r, o, 1) >>> 0;
        }
        return Lt = o, i;
      }
      const Yr = typeof FinalizationRegistry > "u" ? {
        register: () => {
        },
        unregister: () => {
        }
      } : new FinalizationRegistry((e) => U.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
      class Hl {
        __destroy_into_raw() {
          const t = this.__wbg_ptr;
          return this.__wbg_ptr = 0, Yr.unregister(this), t;
        }
        free() {
          const t = this.__destroy_into_raw();
          U.__wbg_mandelbrotnavigator_free(t, 0);
        }
        constructor(t, n, r, i, s) {
          const o = U.mandelbrotnavigator_new(t, n, r, i, s);
          return this.__wbg_ptr = o >>> 0, Yr.register(this, this.__wbg_ptr, this), this;
        }
        translate(t, n) {
          U.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
        }
        rotate(t) {
          U.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
        }
        translate_direct(t, n) {
          U.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
        }
        rotate_direct(t) {
          U.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
        }
        zoom(t) {
          U.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
        }
        step() {
          const t = U.mandelbrotnavigator_step(this.__wbg_ptr);
          var n = Vl(t[0], t[1]).slice();
          return U.__wbindgen_free(t[0], t[1] * 8, 8), n;
        }
        get_params() {
          const t = U.mandelbrotnavigator_get_params(this.__wbg_ptr);
          var n = Gl(t[0], t[1]).slice();
          return U.__wbindgen_free(t[0], t[1] * 4, 4), n;
        }
        compute_reference_orbit_ptr(t) {
          const n = U.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, t);
          return mr.__wrap(n);
        }
        get_reference_orbit_len() {
          return U.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        get_reference_orbit_capacity() {
          return U.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        scale(t) {
          const n = Bn(t, U.__wbindgen_malloc, U.__wbindgen_realloc), r = Lt;
          U.mandelbrotnavigator_scale(this.__wbg_ptr, n, r);
        }
        angle(t) {
          U.mandelbrotnavigator_angle(this.__wbg_ptr, t);
        }
        origin(t, n) {
          const r = Bn(t, U.__wbindgen_malloc, U.__wbindgen_realloc), i = Lt, s = Bn(n, U.__wbindgen_malloc, U.__wbindgen_realloc), o = Lt;
          U.mandelbrotnavigator_origin(this.__wbg_ptr, r, i, s, o);
        }
      }
      typeof FinalizationRegistry > "u" || new FinalizationRegistry((e) => U.__wbg_mandelbrotstep_free(e >>> 0, 1));
      const Xr = typeof FinalizationRegistry > "u" ? {
        register: () => {
        },
        unregister: () => {
        }
      } : new FinalizationRegistry((e) => U.__wbg_orbitbufferinfo_free(e >>> 0, 1));
      class mr {
        static __wrap(t) {
          t = t >>> 0;
          const n = Object.create(mr.prototype);
          return n.__wbg_ptr = t, Xr.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
          const t = this.__wbg_ptr;
          return this.__wbg_ptr = 0, Xr.unregister(this), t;
        }
        free() {
          const t = this.__destroy_into_raw();
          U.__wbg_orbitbufferinfo_free(t, 0);
        }
        get ptr() {
          return U.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(t) {
          U.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, t);
        }
        get offset() {
          return U.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
        }
        set offset(t) {
          U.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, t);
        }
        get count() {
          return U.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set count(t) {
          U.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, t);
        }
      }
      function $l(e) {
        console.debug(e);
      }
      function Kl(e) {
        console.error(e);
      }
      function kl(e) {
        console.info(e);
      }
      function ql(e) {
        console.log(e);
      }
      function Yl() {
        return Date.now();
      }
      function Xl(e) {
        console.warn(e);
      }
      function Jl() {
        const e = U.__wbindgen_export_0, t = e.grow(4);
        e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
      }
      function Ql(e, t) {
        return ss(e, t);
      }
      function Zl(e, t) {
        throw new Error(ss(e, t));
      }
      URL = globalThis.URL;
      const D = await Fl({
        "./mandelbrot_bg.js": {
          __wbindgen_string_new: Ql,
          __wbg_debug_58d16ea352cfbca1: $l,
          __wbg_error_51ecdd39ec054205: Kl,
          __wbg_info_e56933705c348038: kl,
          __wbg_log_ea240990d83e374e: ql,
          __wbg_warn_d89f6637da554c8d: Xl,
          __wbg_now_eb0821f3bd9f6529: Yl,
          __wbindgen_throw: Zl,
          __wbindgen_init_externref_table: Jl
        }
      }, Ul), os = D.memory, ea = D.__wbg_mandelbrotstep_free, ta = D.__wbg_get_mandelbrotstep_zx, na = D.__wbg_set_mandelbrotstep_zx, ra = D.__wbg_get_mandelbrotstep_zy, ia = D.__wbg_set_mandelbrotstep_zy, sa = D.__wbg_get_mandelbrotstep_dx, oa = D.__wbg_set_mandelbrotstep_dx, la = D.__wbg_get_mandelbrotstep_dy, aa = D.__wbg_set_mandelbrotstep_dy, ca = D.__wbg_mandelbrotnavigator_free, fa = D.mandelbrotnavigator_new, ua = D.mandelbrotnavigator_translate, da = D.mandelbrotnavigator_rotate, ha = D.mandelbrotnavigator_translate_direct, pa = D.mandelbrotnavigator_rotate_direct, ga = D.mandelbrotnavigator_zoom, _a = D.mandelbrotnavigator_step, ba = D.mandelbrotnavigator_get_params, ma = D.mandelbrotnavigator_compute_reference_orbit_ptr, va = D.mandelbrotnavigator_get_reference_orbit_len, xa = D.mandelbrotnavigator_get_reference_orbit_capacity, ya = D.mandelbrotnavigator_scale, wa = D.mandelbrotnavigator_angle, Ta = D.mandelbrotnavigator_origin, Sa = D.__wbg_orbitbufferinfo_free, Ca = D.__wbg_get_orbitbufferinfo_ptr, Ea = D.__wbg_set_orbitbufferinfo_ptr, Pa = D.__wbg_get_orbitbufferinfo_offset, Ra = D.__wbg_set_orbitbufferinfo_offset, Ma = D.__wbg_get_orbitbufferinfo_count, Oa = D.__wbg_set_orbitbufferinfo_count, Aa = D.__wbindgen_export_0, Ia = D.__wbindgen_free, Ua = D.__externref_drop_slice, Fa = D.__wbindgen_malloc, za = D.__wbindgen_realloc, ls = D.__wbindgen_start, Da = Object.freeze(Object.defineProperty({
        __proto__: null,
        __externref_drop_slice: Ua,
        __wbg_get_mandelbrotstep_dx: sa,
        __wbg_get_mandelbrotstep_dy: la,
        __wbg_get_mandelbrotstep_zx: ta,
        __wbg_get_mandelbrotstep_zy: ra,
        __wbg_get_orbitbufferinfo_count: Ma,
        __wbg_get_orbitbufferinfo_offset: Pa,
        __wbg_get_orbitbufferinfo_ptr: Ca,
        __wbg_mandelbrotnavigator_free: ca,
        __wbg_mandelbrotstep_free: ea,
        __wbg_orbitbufferinfo_free: Sa,
        __wbg_set_mandelbrotstep_dx: oa,
        __wbg_set_mandelbrotstep_dy: aa,
        __wbg_set_mandelbrotstep_zx: na,
        __wbg_set_mandelbrotstep_zy: ia,
        __wbg_set_orbitbufferinfo_count: Oa,
        __wbg_set_orbitbufferinfo_offset: Ra,
        __wbg_set_orbitbufferinfo_ptr: Ea,
        __wbindgen_export_0: Aa,
        __wbindgen_free: Ia,
        __wbindgen_malloc: Fa,
        __wbindgen_realloc: za,
        __wbindgen_start: ls,
        mandelbrotnavigator_angle: wa,
        mandelbrotnavigator_compute_reference_orbit_ptr: ma,
        mandelbrotnavigator_get_params: ba,
        mandelbrotnavigator_get_reference_orbit_capacity: xa,
        mandelbrotnavigator_get_reference_orbit_len: va,
        mandelbrotnavigator_new: fa,
        mandelbrotnavigator_origin: Ta,
        mandelbrotnavigator_rotate: da,
        mandelbrotnavigator_rotate_direct: pa,
        mandelbrotnavigator_scale: ya,
        mandelbrotnavigator_step: _a,
        mandelbrotnavigator_translate: ua,
        mandelbrotnavigator_translate_direct: ha,
        mandelbrotnavigator_zoom: ga,
        memory: os
      }, Symbol.toStringTag, {
        value: "Module"
      }));
      zl(Da);
      ls();
      class Ba {
        constructor(t = 1024, n = 1024) {
          __publicField(this, "video");
          __publicField(this, "canvas");
          __publicField(this, "ctx");
          __publicField(this, "stream", null);
          __publicField(this, "width");
          __publicField(this, "height");
          this.width = t, this.height = n, this.video = document.createElement("video"), this.video.autoplay = true, this.video.width = t, this.video.height = n, this.canvas = document.createElement("canvas"), this.canvas.width = t, this.canvas.height = n;
          const r = this.canvas.getContext("2d");
          if (!r) throw new Error("Impossible de cr\xE9er le contexte 2D du canvas");
          this.ctx = r;
        }
        async openWebcam() {
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: this.width,
              height: this.height
            }
          }), this.video.srcObject = this.stream, await this.video.play();
        }
        captureFrame() {
          return this.ctx.drawImage(this.video, 0, 0, this.width, this.height), this.ctx.getImageData(0, 0, this.width, this.height);
        }
        async createWebGPUTexture(t) {
          this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
          const n = await createImageBitmap(this.canvas), r = t.createTexture({
            size: [
              this.width,
              this.height,
              1
            ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
          });
          return t.queue.copyExternalImageToTexture({
            source: n
          }, {
            texture: r
          }, [
            this.width,
            this.height
          ]), r;
        }
        closeWebcam() {
          this.stream && (this.stream.getTracks().forEach((t) => t.stop()), this.stream = null);
        }
      }
      class ja {
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
          __publicField(this, "tileTexture");
          __publicField(this, "tileTextureView");
          __publicField(this, "skyboxTexture");
          __publicField(this, "skyboxTextureView");
          __publicField(this, "webcamTexture");
          __publicField(this, "webcamTileTexture");
          __publicField(this, "webcamEnabled", false);
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
          }), this.sampler.label = "Engine Sampler", this.tileTexture = await this._loadTexture("./tile.jpeg"), this.tileTextureView = this.tileTexture.createView(), this.skyboxTexture = await this._loadTexture("./skybox.jpeg"), this.skyboxTextureView = this.skyboxTexture.createView(), this.webcamEnabled && (this.webcamTexture = new Ba(1024, 1024), await this.webcamTexture.openWebcam(), this.webcamTileTexture = await this.webcamTexture.createWebGPUTexture(this.device)), this.uniformBufferMandelbrot = this.device.createBuffer({
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
              }
            ],
            label: "Engine BindGroupLayout Color"
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
            layout: this.device.createPipelineLayout({
              bindGroupLayouts: [
                o
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
          var _a2, _b, _c, _d;
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
          }), this.intermediateView = this.intermediateTexture.createView(), this.intermediateView.label = "Engine IntermediateTextureView", this.reprojectTexture && ((_d = (_c = this.reprojectTexture).destroy) == null ? void 0 : _d.call(_c)), this.reprojectTexture = this.device.createTexture({
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
                  resource: this.intermediateView
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
            const s = this.pipelineColor.getBindGroupLayout(0), o = this.webcamEnabled && this.webcamTileTexture ? this.webcamTileTexture.createView() : this.tileTextureView, a = [
              {
                binding: 0,
                resource: {
                  buffer: this.uniformBufferColor
                }
              },
              {
                binding: 1,
                resource: this.intermediateView
              },
              {
                binding: 2,
                resource: o
              },
              {
                binding: 3,
                resource: this.skyboxTextureView
              }
            ];
            this.bindGroupColor = this.device.createBindGroup({
              layout: s,
              entries: a,
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
          let c = this.mandelbrotNavigator.compute_reference_orbit_ptr(a);
          const h = new Float32Array(os.buffer, c.ptr, c.count * 4);
          c.offset < a && this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, h, 0), this.prevFrameMandelbrot || (this.prevFrameMandelbrot = {
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
        async render(t = false) {
          if (this.webcamEnabled && this.webcamTexture && (await this.updateWebcamTexture(), this.pipelineColor)) {
            const o = this.pipelineColor.getBindGroupLayout(0), a = this.webcamTileTexture ? this.webcamTileTexture.createView() : this.tileTextureView, c = [
              {
                binding: 0,
                resource: {
                  buffer: this.uniformBufferColor
                }
              },
              {
                binding: 1,
                resource: this.intermediateView
              },
              {
                binding: 2,
                resource: a
              },
              {
                binding: 3,
                resource: this.skyboxTextureView
              }
            ];
            this.bindGroupColor = this.device.createBindGroup({
              layout: o,
              entries: c,
              label: "Engine BindGroup Color Pass"
            });
          }
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
          s.setPipeline(this.pipelineColor), this.bindGroupColor && s.setBindGroup(0, this.bindGroupColor), s.draw(6, 1, 0, 0), s.end(), this.device.queue.submit([
            n.finish()
          ]), this.previousMandelbrot && (this.prevFrameMandelbrot = {
            ...this.previousMandelbrot
          });
        }
        destroy() {
          var _a2, _b, _c, _d, _e2, _f, _g, _h;
          (_b = (_a2 = this.intermediateTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d = (_c = this.mandelbrotReferenceBuffer) == null ? void 0 : _c.destroy) == null ? void 0 : _d.call(_c), (_f = (_e2 = this.reprojectTexture) == null ? void 0 : _e2.destroy) == null ? void 0 : _f.call(_e2), (_h = (_g = this.uniformBufferReproject) == null ? void 0 : _g.destroy) == null ? void 0 : _h.call(_g);
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
          this.webcamEnabled && this.webcamTexture && (this.webcamTileTexture = await this.webcamTexture.createWebGPUTexture(this.device));
        }
      }
      const Va = {
        style: {
          position: "relative",
          height: "100vh",
          width: "100vw"
        }
      }, La = {
        class: "tag is-black"
      }, Ga = {
        class: "tag is-black"
      }, Na = {
        class: "tag is-black"
      }, Wa = {
        class: "tag is-black"
      }, Ha = {
        class: "tag is-black"
      }, $a = {
        class: "tag is-black"
      }, Ka = {
        class: "tag is-black"
      }, ka = {
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
      }, Jr = 1, Qr = 256, Zt = 0.04, Zr = 0.025, Ja = Mi({
        __name: "MandelbrotNavigator",
        setup(e) {
          const t = _t(null);
          let n, r, i;
          const s = _t({
            cx: "-1.5",
            cy: "0.0",
            mu: 1e4,
            scale: "2.5",
            angle: "0.0",
            maxIterations: 1e3,
            antialiasLevel: Jr,
            palettePeriod: Qr
          }), o = _t(false);
          function a() {
            o.value = !o.value;
          }
          const c = {};
          function h(M) {
            c[M.code] = true;
          }
          function u(M) {
            c[M.code] = false;
          }
          function p(M) {
            M.preventDefault();
            const x = 0.8;
            M.deltaY < 0 ? i.zoom(x) : i.zoom(1 / x);
          }
          let T = false, C = false, z = 0, F = 0;
          const ee = _t(false);
          let L = 0, Y = 0, X = 0, R = false;
          function Q() {
            typeof window < "u" && window.navigator ? ee.value = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent) : ee.value = false;
          }
          function Te(M) {
            const x = t.value;
            if (!x) return {
              x: 0,
              y: 0,
              width: 0,
              height: 0
            };
            const j = x.getBoundingClientRect();
            return {
              x: M.clientX - j.left,
              y: M.clientY - j.top,
              width: j.width,
              height: j.height
            };
          }
          function ye(M) {
            if (M.button === 2) C = true;
            else {
              T = true;
              const x = Te(M);
              z = x.x, F = x.y;
            }
          }
          function Re(M) {
            var _a2;
            const x = Te(M);
            if (C) {
              const l = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
              if (!l) return;
              const f = l.width / 2, d = l.height / 2, b = x.x, g = x.y, _ = Math.atan2(g - d, b - f);
              i.angle(_);
              return;
            }
            if (!T) return;
            const j = x.width, ne = x.height, Z = j / ne, ae = (x.x - z) / j * 2, be = (x.y - F) / ne * 2, Se = -ae * Z, ht = be;
            i.translate_direct(Se, ht), z = x.x, F = x.y;
          }
          function ct(M) {
            M.button === 2 ? C = false : T = false;
          }
          function Be(M) {
            var _a2;
            if (M.touches.length === 1) {
              T = true;
              const x = M.touches[0], j = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
              if (!j) return;
              z = x.clientX - j.left, F = x.clientY - j.top;
            } else if (M.touches.length === 2) {
              T = false, R = true;
              const [x, j] = M.touches;
              L = Math.hypot(j.clientX - x.clientX, j.clientY - x.clientY), Y = Math.atan2(j.clientY - x.clientY, j.clientX - x.clientX), X = parseFloat(s.value.angle);
            }
          }
          function tt(M) {
            var _a2;
            if (T && M.touches.length === 1) {
              const x = M.touches[0], j = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
              if (!j) return;
              const ne = x.clientX - j.left, Z = x.clientY - j.top, ae = j.width, be = j.height, Se = ae / be, ht = (ne - z) / ae * 2, l = (Z - F) / be * 2;
              i.translate_direct(-ht * Se, l), z = ne, F = Z;
            } else if (R && M.touches.length === 2) {
              const [x, j] = M.touches, ne = Math.hypot(j.clientX - x.clientX, j.clientY - x.clientY), Z = Math.atan2(j.clientY - x.clientY, j.clientX - x.clientX), ae = L / ne;
              i.zoom(ae);
              const be = Z - Y;
              i.angle(X + be);
            }
          }
          function ft(M) {
            M.touches.length === 0 && (T = false, R = false);
          }
          function nt() {
            c.KeyW && i.translate(0, Zt), c.KeyS && i.translate(0, -Zt), c.KeyA && i.translate(-Zt, 0), c.KeyD && i.translate(Zt, 0), c.KeyQ && i.rotate(Zr), c.KeyE && i.rotate(-Zr);
            const M = 0.7;
            c.KeyR && i.zoom(M), c.KeyF && i.zoom(1 / M), setTimeout(nt, 16);
          }
          function ut() {
            Ct(false), requestAnimationFrame(ut);
          }
          function Ct(M = false) {
            const x = s.value.epsilon, [j, ne, Z, ae] = i.step(), [be, Se, ht, l] = i.get_params(), f = s.value.mu;
            s.value.cx = be, s.value.cy = Se, s.value.scale = ht, s.value.angle = l;
            const d = Math.min(Math.max(100, 80 + 60 * Math.log2(1 / Z)), 1e6);
            r.update({
              cx: j,
              cy: ne,
              mu: f,
              scale: Z,
              angle: ae,
              maxIterations: d,
              epsilon: x
            }, {
              antialiasLevel: Jr,
              palettePeriod: Qr
            }), r.render(M);
          }
          async function ie() {
            t.value && (n = t.value, i = new Hl(-1.87003, 0, 5e3, 1e3, 0), r = new ja(n, {
              antialiasLevel: 1,
              palettePeriod: 128
            }), await r.initialize(i), window.addEventListener("keydown", h), window.addEventListener("keyup", u), n.addEventListener("wheel", p, {
              passive: false
            }), n.addEventListener("mousedown", ye), n.addEventListener("contextmenu", function(M) {
              M.preventDefault();
            }), window.addEventListener("mousemove", Re), window.addEventListener("mouseup", ct), nt(), ut());
          }
          function K() {
            if (!t.value || !r) return;
            const M = t.value.getBoundingClientRect();
            t.value.width = M.width, t.value.height = M.height, r.resize(), Ct(true);
          }
          const B = _t(false);
          async function je() {
            if (!i) return;
            await Hn(), await new Promise((ne) => setTimeout(ne, 500));
            const M = 3500, x = performance.now();
            function j(ne) {
              const Z = Math.min((ne - x) / M, 1), ae = Z < 0.5 ? 2 * Z * Z : -1 + (4 - 2 * Z) * Z, be = Math.PI / 2 * ae;
              i.zoom(ae), i.angle(be), Z < 1 ? requestAnimationFrame(j) : B.value = true;
            }
            requestAnimationFrame(j);
          }
          function dt() {
            var _a2;
            const M = window.navigator.language || ((_a2 = window.navigator.languages) == null ? void 0 : _a2[0]) || "en";
            return M.startsWith("fr") || M.startsWith("be") ? "azerty" : (M.startsWith("en") || M.startsWith("us"), "qwerty");
          }
          const Ve = dt(), te = ts(() => Ve === "azerty" ? {
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
            Q(), await ie(), window.addEventListener("resize", K), t.value && (t.value.addEventListener("touchstart", Be, {
              passive: false
            }), t.value.addEventListener("touchmove", tt, {
              passive: false
            }), t.value.addEventListener("touchend", ft, {
              passive: false
            })), await Hn(), await je();
          }), pr(() => {
            window.removeEventListener("resize", K);
          }), (M, x) => (Tt(), Vt("div", Va, [
            Mn(H("button", {
              class: xt([
                "menu-hamburger tag is-light is-medium animate__animated",
                B.value ? "animate__fadeInDown" : ""
              ]),
              "aria-label": "Menu",
              onClick: a
            }, x[1] || (x[1] = [
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
                Un,
                B.value
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
            zr("", true),
            Mn(H("div", {
              class: xt([
                "shortcut-hint tag is-light is-medium is-hidden-touch animate__animated",
                B.value ? "animate__fadeInUp" : ""
              ])
            }, [
              x[2] || (x[2] = fe(" Move\xA0 ", -1)),
              x[3] || (x[3] = H("span", {
                class: "tag is-black"
              }, "Left clic", -1)),
              x[4] || (x[4] = fe("\xA0 ", -1)),
              H("span", La, Ge(te.value.up), 1),
              x[5] || (x[5] = fe("\xA0 ", -1)),
              H("span", Ga, Ge(te.value.left), 1),
              x[6] || (x[6] = fe("\xA0 ", -1)),
              H("span", Na, Ge(te.value.down), 1),
              x[7] || (x[7] = fe("\xA0 ", -1)),
              H("span", Wa, Ge(te.value.right), 1),
              x[8] || (x[8] = fe("\xA0 |\xA0Rotate\xA0 ", -1)),
              x[9] || (x[9] = H("span", {
                class: "tag is-black"
              }, "Right clic", -1)),
              x[10] || (x[10] = fe("\xA0 ", -1)),
              H("span", Ha, Ge(te.value.rotateLeft), 1),
              x[11] || (x[11] = fe("\xA0 ", -1)),
              H("span", $a, Ge(te.value.rotateRight), 1),
              x[12] || (x[12] = fe("\xA0 |\xA0Zoom\xA0 ", -1)),
              x[13] || (x[13] = H("span", {
                class: "tag is-black"
              }, "Wheel", -1)),
              x[14] || (x[14] = fe("\xA0 ", -1)),
              H("span", Ka, Ge(te.value.zoomIn), 1),
              x[15] || (x[15] = fe("\xA0 ", -1)),
              H("span", ka, Ge(te.value.zoomOut), 1)
            ], 2), [
              [
                Un,
                B.value
              ]
            ]),
            Mn(H("div", {
              class: xt([
                "footer-love tag is-light is-medium is-hidden-touch animate__animated",
                B.value ? "animate__fadeInUp" : ""
              ])
            }, [
              x[18] || (x[18] = H("small", null, [
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
              x[19] || (x[19] = fe(" \xA0|\xA0 ", -1)),
              H("small", null, [
                H("a", qa, [
                  (Tt(), Vt("svg", Ya, x[16] || (x[16] = [
                    H("path", {
                      d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                    }, null, -1)
                  ]))),
                  x[17] || (x[17] = fe(" GitHub ", -1))
                ])
              ])
            ], 2), [
              [
                Un,
                B.value
              ]
            ]),
            B.value ? zr("", true) : (Tt(), Vt("div", Xa, x[20] || (x[20] = [
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
      }), Qa = {
        key: 0,
        id: "fullscreen"
      }, Za = {
        key: 1,
        class: "section is-flex is-flex-direction-column is-align-items-center is-justify-content-center",
        style: {
          height: "100vh"
        }
      }, ec = Mi({
        __name: "App",
        setup(e) {
          const t = _t(false);
          return hr(() => {
            t.value = typeof navigator < "u" && "gpu" in navigator;
          }), (n, r) => t.value ? (Tt(), Vt("div", Qa, [
            Pe(Ja)
          ])) : (Tt(), Vt("div", Za, r[0] || (r[0] = [
            qo('<div class="box has-text-centered" style="max-width:400px;"><span class="icon is-large has-text-danger"><i class="fas fa-exclamation-triangle fa-2x"></i></span><h1 class="title is-4 mt-3">WebGPU non support\xE9</h1><p>Ce navigateur ne supporte pas WebGPU.<br> Veuillez utiliser un navigateur compatible WebGPU.</p><a class="button is-link mt-4" href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility" target="_blank"> Liste des navigateurs compatibles WebGPU </a></div>', 1)
          ])));
        }
      });
      "serviceWorker" in navigator && window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js");
      });
      Pl(ec).mount("#app");
    })();
  }
});
export default require_stdin();
