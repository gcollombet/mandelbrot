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
        for (const s of document.querySelectorAll('link[rel="modulepreload"]')) r(s);
        new MutationObserver((s) => {
          for (const i of s) if (i.type === "childList") for (const o of i.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && r(o);
        }).observe(document, {
          childList: true,
          subtree: true
        });
        function n(s) {
          const i = {};
          return s.integrity && (i.integrity = s.integrity), s.referrerPolicy && (i.referrerPolicy = s.referrerPolicy), s.crossOrigin === "use-credentials" ? i.credentials = "include" : s.crossOrigin === "anonymous" ? i.credentials = "omit" : i.credentials = "same-origin", i;
        }
        function r(s) {
          if (s.ep) return;
          s.ep = true;
          const i = n(s);
          fetch(s.href, i);
        }
      })();
      function cr(e) {
        const t = /* @__PURE__ */ Object.create(null);
        for (const n of e.split(",")) t[n] = 1;
        return (n) => n in t;
      }
      const G = {}, ht = [], Ue = () => {
      }, vi = () => false, vn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), lr = (e) => e.startsWith("onUpdate:"), le = Object.assign, ar = (e, t) => {
        const n = e.indexOf(t);
        n > -1 && e.splice(n, 1);
      }, xi = Object.prototype.hasOwnProperty, B = (e, t) => xi.call(e, t), R = Array.isArray, wt = (e) => Gt(e) === "[object Map]", xn = (e) => Gt(e) === "[object Set]", Dr = (e) => Gt(e) === "[object Date]", F = (e) => typeof e == "function", re = (e) => typeof e == "string", ze = (e) => typeof e == "symbol", Z = (e) => e !== null && typeof e == "object", ps = (e) => (Z(e) || F(e)) && F(e.then) && F(e.catch), hs = Object.prototype.toString, Gt = (e) => hs.call(e), Si = (e) => Gt(e).slice(8, -1), ws = (e) => Gt(e) === "[object Object]", fr = (e) => re(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, It = cr(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), Sn = (e) => {
        const t = /* @__PURE__ */ Object.create(null);
        return (n) => t[n] || (t[n] = e(n));
      }, Ci = /-(\w)/g, et = Sn((e) => e.replace(Ci, (t, n) => n ? n.toUpperCase() : "")), Ei = /\B([A-Z])/g, ft = Sn((e) => e.replace(Ei, "-$1").toLowerCase()), ms = Sn((e) => e.charAt(0).toUpperCase() + e.slice(1)), Vn = Sn((e) => e ? `on${ms(e)}` : ""), Ze = (e, t) => !Object.is(e, t), sn = (e, ...t) => {
        for (let n = 0; n < e.length; n++) e[n](...t);
      }, kn = (e, t, n, r = false) => {
        Object.defineProperty(e, t, {
          configurable: true,
          enumerable: false,
          writable: r,
          value: n
        });
      }, un = (e) => {
        const t = parseFloat(e);
        return isNaN(t) ? e : t;
      };
      let Vr;
      const Cn = () => Vr || (Vr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
      function _r(e) {
        if (R(e)) {
          const t = {};
          for (let n = 0; n < e.length; n++) {
            const r = e[n], s = re(r) ? Mi(r) : _r(r);
            if (s) for (const i in s) t[i] = s[i];
          }
          return t;
        } else if (re(e) || Z(e)) return e;
      }
      const Ti = /;(?![^(]*\))/g, Pi = /:([^]+)/, Oi = /\/\*[^]*?\*\//g;
      function Mi(e) {
        const t = {};
        return e.replace(Oi, "").split(Ti).forEach((n) => {
          if (n) {
            const r = n.split(Pi);
            r.length > 1 && (t[r[0].trim()] = r[1].trim());
          }
        }), t;
      }
      function ur(e) {
        let t = "";
        if (re(e)) t = e;
        else if (R(e)) for (let n = 0; n < e.length; n++) {
          const r = ur(e[n]);
          r && (t += r + " ");
        }
        else if (Z(e)) for (const n in e) e[n] && (t += n + " ");
        return t.trim();
      }
      const Ai = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Ri = cr(Ai);
      function ys(e) {
        return !!e || e === "";
      }
      function Ii(e, t) {
        if (e.length !== t.length) return false;
        let n = true;
        for (let r = 0; n && r < e.length; r++) n = En(e[r], t[r]);
        return n;
      }
      function En(e, t) {
        if (e === t) return true;
        let n = Dr(e), r = Dr(t);
        if (n || r) return n && r ? e.getTime() === t.getTime() : false;
        if (n = ze(e), r = ze(t), n || r) return e === t;
        if (n = R(e), r = R(t), n || r) return n && r ? Ii(e, t) : false;
        if (n = Z(e), r = Z(t), n || r) {
          if (!n || !r) return false;
          const s = Object.keys(e).length, i = Object.keys(t).length;
          if (s !== i) return false;
          for (const o in e) {
            const c = e.hasOwnProperty(o), a = t.hasOwnProperty(o);
            if (c && !a || !c && a || !En(e[o], t[o])) return false;
          }
        }
        return String(e) === String(t);
      }
      function Fi(e, t) {
        return e.findIndex((n) => En(n, t));
      }
      const vs = (e) => !!(e && e.__v_isRef === true), Yn = (e) => re(e) ? e : e == null ? "" : R(e) || Z(e) && (e.toString === hs || !F(e.toString)) ? vs(e) ? Yn(e.value) : JSON.stringify(e, xs, 2) : String(e), xs = (e, t) => vs(t) ? xs(e, t.value) : wt(t) ? {
        [`Map(${t.size})`]: [
          ...t.entries()
        ].reduce((n, [r, s], i) => (n[Un(r, i) + " =>"] = s, n), {})
      } : xn(t) ? {
        [`Set(${t.size})`]: [
          ...t.values()
        ].map((n) => Un(n))
      } : ze(t) ? Un(t) : Z(t) && !R(t) && !ws(t) ? String(t) : t, Un = (e, t = "") => {
        var n;
        return ze(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
      };
      let pe;
      class Li {
        constructor(t = false) {
          this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.parent = pe, !t && pe && (this.index = (pe.scopes || (pe.scopes = [])).push(this) - 1);
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
            const n = pe;
            try {
              return pe = this, t();
            } finally {
              pe = n;
            }
          }
        }
        on() {
          ++this._on === 1 && (this.prevScope = pe, pe = this);
        }
        off() {
          this._on > 0 && --this._on === 0 && (pe = this.prevScope, this.prevScope = void 0);
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
              const s = this.parent.scopes.pop();
              s && s !== this && (this.parent.scopes[this.index] = s, s.index = this.index);
            }
            this.parent = void 0;
          }
        }
      }
      function Di() {
        return pe;
      }
      let X;
      const zn = /* @__PURE__ */ new WeakSet();
      class Ss {
        constructor(t) {
          this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, pe && pe.active && pe.effects.push(this);
        }
        pause() {
          this.flags |= 64;
        }
        resume() {
          this.flags & 64 && (this.flags &= -65, zn.has(this) && (zn.delete(this), this.trigger()));
        }
        notify() {
          this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Es(this);
        }
        run() {
          if (!(this.flags & 1)) return this.fn();
          this.flags |= 2, Ur(this), Ts(this);
          const t = X, n = Oe;
          X = this, Oe = true;
          try {
            return this.fn();
          } finally {
            Ps(this), X = t, Oe = n, this.flags &= -3;
          }
        }
        stop() {
          if (this.flags & 1) {
            for (let t = this.deps; t; t = t.nextDep) gr(t);
            this.deps = this.depsTail = void 0, Ur(this), this.onStop && this.onStop(), this.flags &= -2;
          }
        }
        trigger() {
          this.flags & 64 ? zn.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
        }
        runIfDirty() {
          Xn(this) && this.run();
        }
        get dirty() {
          return Xn(this);
        }
      }
      let Cs = 0, Ft, Lt;
      function Es(e, t = false) {
        if (e.flags |= 8, t) {
          e.next = Lt, Lt = e;
          return;
        }
        e.next = Ft, Ft = e;
      }
      function dr() {
        Cs++;
      }
      function br() {
        if (--Cs > 0) return;
        if (Lt) {
          let t = Lt;
          for (Lt = void 0; t; ) {
            const n = t.next;
            t.next = void 0, t.flags &= -9, t = n;
          }
        }
        let e;
        for (; Ft; ) {
          let t = Ft;
          for (Ft = void 0; t; ) {
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
      function Ts(e) {
        for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
      }
      function Ps(e) {
        let t, n = e.depsTail, r = n;
        for (; r; ) {
          const s = r.prevDep;
          r.version === -1 ? (r === n && (n = s), gr(r), Vi(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = s;
        }
        e.deps = t, e.depsTail = n;
      }
      function Xn(e) {
        for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (Os(t.dep.computed) || t.dep.version !== t.version)) return true;
        return !!e._dirty;
      }
      function Os(e) {
        if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === qt) || (e.globalVersion = qt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Xn(e)))) return;
        e.flags |= 2;
        const t = e.dep, n = X, r = Oe;
        X = e, Oe = true;
        try {
          Ts(e);
          const s = e.fn(e._value);
          (t.version === 0 || Ze(s, e._value)) && (e.flags |= 128, e._value = s, t.version++);
        } catch (s) {
          throw t.version++, s;
        } finally {
          X = n, Oe = r, Ps(e), e.flags &= -3;
        }
      }
      function gr(e, t = false) {
        const { dep: n, prevSub: r, nextSub: s } = e;
        if (r && (r.nextSub = s, e.prevSub = void 0), s && (s.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
          n.computed.flags &= -5;
          for (let i = n.computed.deps; i; i = i.nextDep) gr(i, true);
        }
        !t && !--n.sc && n.map && n.map.delete(n.key);
      }
      function Vi(e) {
        const { prevDep: t, nextDep: n } = e;
        t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
      }
      let Oe = true;
      const Ms = [];
      function ke() {
        Ms.push(Oe), Oe = false;
      }
      function Ye() {
        const e = Ms.pop();
        Oe = e === void 0 ? true : e;
      }
      function Ur(e) {
        const { cleanup: t } = e;
        if (e.cleanup = void 0, t) {
          const n = X;
          X = void 0;
          try {
            t();
          } finally {
            X = n;
          }
        }
      }
      let qt = 0;
      class Ui {
        constructor(t, n) {
          this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
        }
      }
      class pr {
        constructor(t) {
          this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
        }
        track(t) {
          if (!X || !Oe || X === this.computed) return;
          let n = this.activeLink;
          if (n === void 0 || n.sub !== X) n = this.activeLink = new Ui(X, this), X.deps ? (n.prevDep = X.depsTail, X.depsTail.nextDep = n, X.depsTail = n) : X.deps = X.depsTail = n, As(n);
          else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
            const r = n.nextDep;
            r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = X.depsTail, n.nextDep = void 0, X.depsTail.nextDep = n, X.depsTail = n, X.deps === n && (X.deps = r);
          }
          return n;
        }
        trigger(t) {
          this.version++, qt++, this.notify(t);
        }
        notify(t) {
          dr();
          try {
            for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
          } finally {
            br();
          }
        }
      }
      function As(e) {
        if (e.dep.sc++, e.sub.flags & 4) {
          const t = e.dep.computed;
          if (t && !e.dep.subs) {
            t.flags |= 20;
            for (let r = t.deps; r; r = r.nextDep) As(r);
          }
          const n = e.dep.subs;
          n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
        }
      }
      const Jn = /* @__PURE__ */ new WeakMap(), at = Symbol(""), Qn = Symbol(""), Ht = Symbol("");
      function ce(e, t, n) {
        if (Oe && X) {
          let r = Jn.get(e);
          r || Jn.set(e, r = /* @__PURE__ */ new Map());
          let s = r.get(n);
          s || (r.set(n, s = new pr()), s.map = r, s.key = n), s.track();
        }
      }
      function $e(e, t, n, r, s, i) {
        const o = Jn.get(e);
        if (!o) {
          qt++;
          return;
        }
        const c = (a) => {
          a && a.trigger();
        };
        if (dr(), t === "clear") o.forEach(c);
        else {
          const a = R(e), u = a && fr(n);
          if (a && n === "length") {
            const _ = Number(r);
            o.forEach((b, S) => {
              (S === "length" || S === Ht || !ze(S) && S >= _) && c(b);
            });
          } else switch ((n !== void 0 || o.has(void 0)) && c(o.get(n)), u && c(o.get(Ht)), t) {
            case "add":
              a ? u && c(o.get("length")) : (c(o.get(at)), wt(e) && c(o.get(Qn)));
              break;
            case "delete":
              a || (c(o.get(at)), wt(e) && c(o.get(Qn)));
              break;
            case "set":
              wt(e) && c(o.get(at));
              break;
          }
        }
        br();
      }
      function bt(e) {
        const t = z(e);
        return t === e ? t : (ce(t, "iterate", Ht), Ce(e) ? t : t.map(se));
      }
      function Tn(e) {
        return ce(e = z(e), "iterate", Ht), e;
      }
      const zi = {
        __proto__: null,
        [Symbol.iterator]() {
          return Bn(this, Symbol.iterator, se);
        },
        concat(...e) {
          return bt(this).concat(...e.map((t) => R(t) ? bt(t) : t));
        },
        entries() {
          return Bn(this, "entries", (e) => (e[1] = se(e[1]), e));
        },
        every(e, t) {
          return He(this, "every", e, t, void 0, arguments);
        },
        filter(e, t) {
          return He(this, "filter", e, t, (n) => n.map(se), arguments);
        },
        find(e, t) {
          return He(this, "find", e, t, se, arguments);
        },
        findIndex(e, t) {
          return He(this, "findIndex", e, t, void 0, arguments);
        },
        findLast(e, t) {
          return He(this, "findLast", e, t, se, arguments);
        },
        findLastIndex(e, t) {
          return He(this, "findLastIndex", e, t, void 0, arguments);
        },
        forEach(e, t) {
          return He(this, "forEach", e, t, void 0, arguments);
        },
        includes(...e) {
          return jn(this, "includes", e);
        },
        indexOf(...e) {
          return jn(this, "indexOf", e);
        },
        join(e) {
          return bt(this).join(e);
        },
        lastIndexOf(...e) {
          return jn(this, "lastIndexOf", e);
        },
        map(e, t) {
          return He(this, "map", e, t, void 0, arguments);
        },
        pop() {
          return Pt(this, "pop");
        },
        push(...e) {
          return Pt(this, "push", e);
        },
        reduce(e, ...t) {
          return zr(this, "reduce", e, t);
        },
        reduceRight(e, ...t) {
          return zr(this, "reduceRight", e, t);
        },
        shift() {
          return Pt(this, "shift");
        },
        some(e, t) {
          return He(this, "some", e, t, void 0, arguments);
        },
        splice(...e) {
          return Pt(this, "splice", e);
        },
        toReversed() {
          return bt(this).toReversed();
        },
        toSorted(e) {
          return bt(this).toSorted(e);
        },
        toSpliced(...e) {
          return bt(this).toSpliced(...e);
        },
        unshift(...e) {
          return Pt(this, "unshift", e);
        },
        values() {
          return Bn(this, "values", se);
        }
      };
      function Bn(e, t, n) {
        const r = Tn(e), s = r[t]();
        return r !== e && !Ce(e) && (s._next = s.next, s.next = () => {
          const i = s._next();
          return i.value && (i.value = n(i.value)), i;
        }), s;
      }
      const Bi = Array.prototype;
      function He(e, t, n, r, s, i) {
        const o = Tn(e), c = o !== e && !Ce(e), a = o[t];
        if (a !== Bi[t]) {
          const b = a.apply(e, i);
          return c ? se(b) : b;
        }
        let u = n;
        o !== e && (c ? u = function(b, S) {
          return n.call(this, se(b), S, e);
        } : n.length > 2 && (u = function(b, S) {
          return n.call(this, b, S, e);
        }));
        const _ = a.call(o, u, r);
        return c && s ? s(_) : _;
      }
      function zr(e, t, n, r) {
        const s = Tn(e);
        let i = n;
        return s !== e && (Ce(e) ? n.length > 3 && (i = function(o, c, a) {
          return n.call(this, o, c, a, e);
        }) : i = function(o, c, a) {
          return n.call(this, o, se(c), a, e);
        }), s[t](i, ...r);
      }
      function jn(e, t, n) {
        const r = z(e);
        ce(r, "iterate", Ht);
        const s = r[t](...n);
        return (s === -1 || s === false) && yr(n[0]) ? (n[0] = z(n[0]), r[t](...n)) : s;
      }
      function Pt(e, t, n = []) {
        ke(), dr();
        const r = z(e)[t].apply(e, n);
        return br(), Ye(), r;
      }
      const ji = cr("__proto__,__v_isRef,__isVue"), Rs = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(ze));
      function Ni(e) {
        ze(e) || (e = String(e));
        const t = z(this);
        return ce(t, "has", e), t.hasOwnProperty(e);
      }
      class Is {
        constructor(t = false, n = false) {
          this._isReadonly = t, this._isShallow = n;
        }
        get(t, n, r) {
          if (n === "__v_skip") return t.__v_skip;
          const s = this._isReadonly, i = this._isShallow;
          if (n === "__v_isReactive") return !s;
          if (n === "__v_isReadonly") return s;
          if (n === "__v_isShallow") return i;
          if (n === "__v_raw") return r === (s ? i ? Ji : Vs : i ? Ds : Ls).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
          const o = R(t);
          if (!s) {
            let a;
            if (o && (a = zi[n])) return a;
            if (n === "hasOwnProperty") return Ni;
          }
          const c = Reflect.get(t, n, ie(t) ? t : r);
          return (ze(n) ? Rs.has(n) : ji(n)) || (s || ce(t, "get", n), i) ? c : ie(c) ? o && fr(n) ? c : c.value : Z(c) ? s ? Us(c) : wr(c) : c;
        }
      }
      class Fs extends Is {
        constructor(t = false) {
          super(false, t);
        }
        set(t, n, r, s) {
          let i = t[n];
          if (!this._isShallow) {
            const a = tt(i);
            if (!Ce(r) && !tt(r) && (i = z(i), r = z(r)), !R(t) && ie(i) && !ie(r)) return a ? false : (i.value = r, true);
          }
          const o = R(t) && fr(n) ? Number(n) < t.length : B(t, n), c = Reflect.set(t, n, r, ie(t) ? t : s);
          return t === z(s) && (o ? Ze(r, i) && $e(t, "set", n, r) : $e(t, "add", n, r)), c;
        }
        deleteProperty(t, n) {
          const r = B(t, n);
          t[n];
          const s = Reflect.deleteProperty(t, n);
          return s && r && $e(t, "delete", n, void 0), s;
        }
        has(t, n) {
          const r = Reflect.has(t, n);
          return (!ze(n) || !Rs.has(n)) && ce(t, "has", n), r;
        }
        ownKeys(t) {
          return ce(t, "iterate", R(t) ? "length" : at), Reflect.ownKeys(t);
        }
      }
      class qi extends Is {
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
      const Hi = new Fs(), Wi = new qi(), $i = new Fs(true);
      const Zn = (e) => e, Qt = (e) => Reflect.getPrototypeOf(e);
      function Ki(e, t, n) {
        return function(...r) {
          const s = this.__v_raw, i = z(s), o = wt(i), c = e === "entries" || e === Symbol.iterator && o, a = e === "keys" && o, u = s[e](...r), _ = n ? Zn : t ? dn : se;
          return !t && ce(i, "iterate", a ? Qn : at), {
            next() {
              const { value: b, done: S } = u.next();
              return S ? {
                value: b,
                done: S
              } : {
                value: c ? [
                  _(b[0]),
                  _(b[1])
                ] : _(b),
                done: S
              };
            },
            [Symbol.iterator]() {
              return this;
            }
          };
        };
      }
      function Zt(e) {
        return function(...t) {
          return e === "delete" ? false : e === "clear" ? void 0 : this;
        };
      }
      function Gi(e, t) {
        const n = {
          get(s) {
            const i = this.__v_raw, o = z(i), c = z(s);
            e || (Ze(s, c) && ce(o, "get", s), ce(o, "get", c));
            const { has: a } = Qt(o), u = t ? Zn : e ? dn : se;
            if (a.call(o, s)) return u(i.get(s));
            if (a.call(o, c)) return u(i.get(c));
            i !== o && i.get(s);
          },
          get size() {
            const s = this.__v_raw;
            return !e && ce(z(s), "iterate", at), Reflect.get(s, "size", s);
          },
          has(s) {
            const i = this.__v_raw, o = z(i), c = z(s);
            return e || (Ze(s, c) && ce(o, "has", s), ce(o, "has", c)), s === c ? i.has(s) : i.has(s) || i.has(c);
          },
          forEach(s, i) {
            const o = this, c = o.__v_raw, a = z(c), u = t ? Zn : e ? dn : se;
            return !e && ce(a, "iterate", at), c.forEach((_, b) => s.call(i, u(_), u(b), o));
          }
        };
        return le(n, e ? {
          add: Zt("add"),
          set: Zt("set"),
          delete: Zt("delete"),
          clear: Zt("clear")
        } : {
          add(s) {
            !t && !Ce(s) && !tt(s) && (s = z(s));
            const i = z(this);
            return Qt(i).has.call(i, s) || (i.add(s), $e(i, "add", s, s)), this;
          },
          set(s, i) {
            !t && !Ce(i) && !tt(i) && (i = z(i));
            const o = z(this), { has: c, get: a } = Qt(o);
            let u = c.call(o, s);
            u || (s = z(s), u = c.call(o, s));
            const _ = a.call(o, s);
            return o.set(s, i), u ? Ze(i, _) && $e(o, "set", s, i) : $e(o, "add", s, i), this;
          },
          delete(s) {
            const i = z(this), { has: o, get: c } = Qt(i);
            let a = o.call(i, s);
            a || (s = z(s), a = o.call(i, s)), c && c.call(i, s);
            const u = i.delete(s);
            return a && $e(i, "delete", s, void 0), u;
          },
          clear() {
            const s = z(this), i = s.size !== 0, o = s.clear();
            return i && $e(s, "clear", void 0, void 0), o;
          }
        }), [
          "keys",
          "values",
          "entries",
          Symbol.iterator
        ].forEach((s) => {
          n[s] = Ki(s, e, t);
        }), n;
      }
      function hr(e, t) {
        const n = Gi(e, t);
        return (r, s, i) => s === "__v_isReactive" ? !e : s === "__v_isReadonly" ? e : s === "__v_raw" ? r : Reflect.get(B(n, s) && s in r ? n : r, s, i);
      }
      const ki = {
        get: hr(false, false)
      }, Yi = {
        get: hr(false, true)
      }, Xi = {
        get: hr(true, false)
      };
      const Ls = /* @__PURE__ */ new WeakMap(), Ds = /* @__PURE__ */ new WeakMap(), Vs = /* @__PURE__ */ new WeakMap(), Ji = /* @__PURE__ */ new WeakMap();
      function Qi(e) {
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
      function Zi(e) {
        return e.__v_skip || !Object.isExtensible(e) ? 0 : Qi(Si(e));
      }
      function wr(e) {
        return tt(e) ? e : mr(e, false, Hi, ki, Ls);
      }
      function eo(e) {
        return mr(e, false, $i, Yi, Ds);
      }
      function Us(e) {
        return mr(e, true, Wi, Xi, Vs);
      }
      function mr(e, t, n, r, s) {
        if (!Z(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
        const i = Zi(e);
        if (i === 0) return e;
        const o = s.get(e);
        if (o) return o;
        const c = new Proxy(e, i === 2 ? r : n);
        return s.set(e, c), c;
      }
      function mt(e) {
        return tt(e) ? mt(e.__v_raw) : !!(e && e.__v_isReactive);
      }
      function tt(e) {
        return !!(e && e.__v_isReadonly);
      }
      function Ce(e) {
        return !!(e && e.__v_isShallow);
      }
      function yr(e) {
        return e ? !!e.__v_raw : false;
      }
      function z(e) {
        const t = e && e.__v_raw;
        return t ? z(t) : e;
      }
      function to(e) {
        return !B(e, "__v_skip") && Object.isExtensible(e) && kn(e, "__v_skip", true), e;
      }
      const se = (e) => Z(e) ? wr(e) : e, dn = (e) => Z(e) ? Us(e) : e;
      function ie(e) {
        return e ? e.__v_isRef === true : false;
      }
      function Dt(e) {
        return no(e, false);
      }
      function no(e, t) {
        return ie(e) ? e : new ro(e, t);
      }
      class ro {
        constructor(t, n) {
          this.dep = new pr(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : z(t), this._value = n ? t : se(t), this.__v_isShallow = n;
        }
        get value() {
          return this.dep.track(), this._value;
        }
        set value(t) {
          const n = this._rawValue, r = this.__v_isShallow || Ce(t) || tt(t);
          t = r ? t : z(t), Ze(t, n) && (this._rawValue = t, this._value = r ? t : se(t), this.dep.trigger());
        }
      }
      function zs(e) {
        return ie(e) ? e.value : e;
      }
      const so = {
        get: (e, t, n) => t === "__v_raw" ? e : zs(Reflect.get(e, t, n)),
        set: (e, t, n, r) => {
          const s = e[t];
          return ie(s) && !ie(n) ? (s.value = n, true) : Reflect.set(e, t, n, r);
        }
      };
      function Bs(e) {
        return mt(e) ? e : new Proxy(e, so);
      }
      class io {
        constructor(t, n, r) {
          this.fn = t, this.setter = n, this._value = void 0, this.dep = new pr(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = qt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
        }
        notify() {
          if (this.flags |= 16, !(this.flags & 8) && X !== this) return Es(this, true), true;
        }
        get value() {
          const t = this.dep.track();
          return Os(this), t && (t.version = this.dep.version), this._value;
        }
        set value(t) {
          this.setter && this.setter(t);
        }
      }
      function oo(e, t, n = false) {
        let r, s;
        return F(e) ? r = e : (r = e.get, s = e.set), new io(r, s, n);
      }
      const en = {}, bn = /* @__PURE__ */ new WeakMap();
      let ct;
      function co(e, t = false, n = ct) {
        if (n) {
          let r = bn.get(n);
          r || bn.set(n, r = []), r.push(e);
        }
      }
      function lo(e, t, n = G) {
        const { immediate: r, deep: s, once: i, scheduler: o, augmentJob: c, call: a } = n, u = (A) => s ? A : Ce(A) || s === false || s === 0 ? Ke(A, 1) : Ke(A);
        let _, b, S, E, T = false, v = false;
        if (ie(e) ? (b = () => e.value, T = Ce(e)) : mt(e) ? (b = () => u(e), T = true) : R(e) ? (v = true, T = e.some((A) => mt(A) || Ce(A)), b = () => e.map((A) => {
          if (ie(A)) return A.value;
          if (mt(A)) return u(A);
          if (F(A)) return a ? a(A, 2) : A();
        })) : F(e) ? t ? b = a ? () => a(e, 2) : e : b = () => {
          if (S) {
            ke();
            try {
              S();
            } finally {
              Ye();
            }
          }
          const A = ct;
          ct = _;
          try {
            return a ? a(e, 3, [
              E
            ]) : e(E);
          } finally {
            ct = A;
          }
        } : b = Ue, t && s) {
          const A = b, te = s === true ? 1 / 0 : s;
          b = () => Ke(A(), te);
        }
        const D = Di(), U = () => {
          _.stop(), D && D.active && ar(D.effects, _);
        };
        if (i && t) {
          const A = t;
          t = (...te) => {
            A(...te), U();
          };
        }
        let H = v ? new Array(e.length).fill(en) : en;
        const k = (A) => {
          if (!(!(_.flags & 1) || !_.dirty && !A)) if (t) {
            const te = _.run();
            if (s || T || (v ? te.some((Te, we) => Ze(Te, H[we])) : Ze(te, H))) {
              S && S();
              const Te = ct;
              ct = _;
              try {
                const we = [
                  te,
                  H === en ? void 0 : v && H[0] === en ? [] : H,
                  E
                ];
                H = te, a ? a(t, 3, we) : t(...we);
              } finally {
                ct = Te;
              }
            }
          } else _.run();
        };
        return c && c(k), _ = new Ss(b), _.scheduler = o ? () => o(k, false) : k, E = (A) => co(A, false, _), S = _.onStop = () => {
          const A = bn.get(_);
          if (A) {
            if (a) a(A, 4);
            else for (const te of A) te();
            bn.delete(_);
          }
        }, t ? r ? k(true) : H = _.run() : o ? o(k.bind(null, true), true) : _.run(), U.pause = _.pause.bind(_), U.resume = _.resume.bind(_), U.stop = U, U;
      }
      function Ke(e, t = 1 / 0, n) {
        if (t <= 0 || !Z(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
        if (n.add(e), t--, ie(e)) Ke(e.value, t, n);
        else if (R(e)) for (let r = 0; r < e.length; r++) Ke(e[r], t, n);
        else if (xn(e) || wt(e)) e.forEach((r) => {
          Ke(r, t, n);
        });
        else if (ws(e)) {
          for (const r in e) Ke(e[r], t, n);
          for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && Ke(e[r], t, n);
        }
        return e;
      }
      function kt(e, t, n, r) {
        try {
          return r ? e(...r) : e();
        } catch (s) {
          Pn(s, t, n);
        }
      }
      function Be(e, t, n, r) {
        if (F(e)) {
          const s = kt(e, t, n, r);
          return s && ps(s) && s.catch((i) => {
            Pn(i, t, n);
          }), s;
        }
        if (R(e)) {
          const s = [];
          for (let i = 0; i < e.length; i++) s.push(Be(e[i], t, n, r));
          return s;
        }
      }
      function Pn(e, t, n, r = true) {
        const s = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: o } = t && t.appContext.config || G;
        if (t) {
          let c = t.parent;
          const a = t.proxy, u = `https://vuejs.org/error-reference/#runtime-${n}`;
          for (; c; ) {
            const _ = c.ec;
            if (_) {
              for (let b = 0; b < _.length; b++) if (_[b](e, a, u) === false) return;
            }
            c = c.parent;
          }
          if (i) {
            ke(), kt(i, null, 10, [
              e,
              a,
              u
            ]), Ye();
            return;
          }
        }
        ao(e, n, s, r, o);
      }
      function ao(e, t, n, r = true, s = false) {
        if (s) throw e;
        console.error(e);
      }
      const _e = [];
      let Le = -1;
      const yt = [];
      let Je = null, pt = 0;
      const js = Promise.resolve();
      let gn = null;
      function Ns(e) {
        const t = gn || js;
        return e ? t.then(this ? e.bind(this) : e) : t;
      }
      function fo(e) {
        let t = Le + 1, n = _e.length;
        for (; t < n; ) {
          const r = t + n >>> 1, s = _e[r], i = Wt(s);
          i < e || i === e && s.flags & 2 ? t = r + 1 : n = r;
        }
        return t;
      }
      function vr(e) {
        if (!(e.flags & 1)) {
          const t = Wt(e), n = _e[_e.length - 1];
          !n || !(e.flags & 2) && t >= Wt(n) ? _e.push(e) : _e.splice(fo(t), 0, e), e.flags |= 1, qs();
        }
      }
      function qs() {
        gn || (gn = js.then(Ws));
      }
      function _o(e) {
        R(e) ? yt.push(...e) : Je && e.id === -1 ? Je.splice(pt + 1, 0, e) : e.flags & 1 || (yt.push(e), e.flags |= 1), qs();
      }
      function Br(e, t, n = Le + 1) {
        for (; n < _e.length; n++) {
          const r = _e[n];
          if (r && r.flags & 2) {
            if (e && r.id !== e.uid) continue;
            _e.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
          }
        }
      }
      function Hs(e) {
        if (yt.length) {
          const t = [
            ...new Set(yt)
          ].sort((n, r) => Wt(n) - Wt(r));
          if (yt.length = 0, Je) {
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
      const Wt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
      function Ws(e) {
        try {
          for (Le = 0; Le < _e.length; Le++) {
            const t = _e[Le];
            t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), kt(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
          }
        } finally {
          for (; Le < _e.length; Le++) {
            const t = _e[Le];
            t && (t.flags &= -2);
          }
          Le = -1, _e.length = 0, Hs(), gn = null, (_e.length || yt.length) && Ws();
        }
      }
      let Se = null, $s = null;
      function pn(e) {
        const t = Se;
        return Se = e, $s = e && e.type.__scopeId || null, t;
      }
      function uo(e, t = Se, n) {
        if (!t || e._n) return e;
        const r = (...s) => {
          r._d && Yr(-1);
          const i = pn(t);
          let o;
          try {
            o = e(...s);
          } finally {
            pn(i), r._d && Yr(1);
          }
          return o;
        };
        return r._n = true, r._c = true, r._d = true, r;
      }
      function jr(e, t) {
        if (Se === null) return e;
        const n = In(Se), r = e.dirs || (e.dirs = []);
        for (let s = 0; s < t.length; s++) {
          let [i, o, c, a = G] = t[s];
          i && (F(i) && (i = {
            mounted: i,
            updated: i
          }), i.deep && Ke(o), r.push({
            dir: i,
            instance: n,
            value: o,
            oldValue: void 0,
            arg: c,
            modifiers: a
          }));
        }
        return e;
      }
      function it(e, t, n, r) {
        const s = e.dirs, i = t && t.dirs;
        for (let o = 0; o < s.length; o++) {
          const c = s[o];
          i && (c.oldValue = i[o].value);
          let a = c.dir[r];
          a && (ke(), Be(a, n, 8, [
            e.el,
            c,
            e,
            t
          ]), Ye());
        }
      }
      const bo = Symbol("_vte"), go = (e) => e.__isTeleport;
      function xr(e, t) {
        e.shapeFlag & 6 && e.component ? (e.transition = t, xr(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
      }
      function Sr(e, t) {
        return F(e) ? le({
          name: e.name
        }, t, {
          setup: e
        }) : e;
      }
      function Ks(e) {
        e.ids = [
          e.ids[0] + e.ids[2]++ + "-",
          0,
          0
        ];
      }
      function Vt(e, t, n, r, s = false) {
        if (R(e)) {
          e.forEach((T, v) => Vt(T, t && (R(t) ? t[v] : t), n, r, s));
          return;
        }
        if (Ut(r) && !s) {
          r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Vt(e, t, n, r.component.subTree);
          return;
        }
        const i = r.shapeFlag & 4 ? In(r.component) : r.el, o = s ? null : i, { i: c, r: a } = e, u = t && t.r, _ = c.refs === G ? c.refs = {} : c.refs, b = c.setupState, S = z(b), E = b === G ? () => false : (T) => B(S, T);
        if (u != null && u !== a && (re(u) ? (_[u] = null, E(u) && (b[u] = null)) : ie(u) && (u.value = null)), F(a)) kt(a, c, 12, [
          o,
          _
        ]);
        else {
          const T = re(a), v = ie(a);
          if (T || v) {
            const D = () => {
              if (e.f) {
                const U = T ? E(a) ? b[a] : _[a] : a.value;
                s ? R(U) && ar(U, i) : R(U) ? U.includes(i) || U.push(i) : T ? (_[a] = [
                  i
                ], E(a) && (b[a] = _[a])) : (a.value = [
                  i
                ], e.k && (_[e.k] = a.value));
              } else T ? (_[a] = o, E(a) && (b[a] = o)) : v && (a.value = o, e.k && (_[e.k] = o));
            };
            o ? (D.id = -1, ve(D, n)) : D();
          }
        }
      }
      Cn().requestIdleCallback;
      Cn().cancelIdleCallback;
      const Ut = (e) => !!e.type.__asyncLoader, Gs = (e) => e.type.__isKeepAlive;
      function po(e, t) {
        ks(e, "a", t);
      }
      function ho(e, t) {
        ks(e, "da", t);
      }
      function ks(e, t, n = ue) {
        const r = e.__wdc || (e.__wdc = () => {
          let s = n;
          for (; s; ) {
            if (s.isDeactivated) return;
            s = s.parent;
          }
          return e();
        });
        if (On(t, r, n), n) {
          let s = n.parent;
          for (; s && s.parent; ) Gs(s.parent.vnode) && wo(r, t, n, s), s = s.parent;
        }
      }
      function wo(e, t, n, r) {
        const s = On(t, e, r, true);
        Ys(() => {
          ar(r[t], s);
        }, n);
      }
      function On(e, t, n = ue, r = false) {
        if (n) {
          const s = n[e] || (n[e] = []), i = t.__weh || (t.__weh = (...o) => {
            ke();
            const c = Yt(n), a = Be(t, n, e, o);
            return c(), Ye(), a;
          });
          return r ? s.unshift(i) : s.push(i), i;
        }
      }
      const Xe = (e) => (t, n = ue) => {
        (!Kt || e === "sp") && On(e, (...r) => t(...r), n);
      }, mo = Xe("bm"), Mn = Xe("m"), yo = Xe("bu"), vo = Xe("u"), xo = Xe("bum"), Ys = Xe("um"), So = Xe("sp"), Co = Xe("rtg"), Eo = Xe("rtc");
      function To(e, t = ue) {
        On("ec", e, t);
      }
      const Po = Symbol.for("v-ndc");
      function Oo(e, t, n, r) {
        let s;
        const i = n, o = R(e);
        if (o || re(e)) {
          const c = o && mt(e);
          let a = false, u = false;
          c && (a = !Ce(e), u = tt(e), e = Tn(e)), s = new Array(e.length);
          for (let _ = 0, b = e.length; _ < b; _++) s[_] = t(a ? u ? dn(se(e[_])) : se(e[_]) : e[_], _, void 0, i);
        } else if (typeof e == "number") {
          s = new Array(e);
          for (let c = 0; c < e; c++) s[c] = t(c + 1, c, void 0, i);
        } else if (Z(e)) if (e[Symbol.iterator]) s = Array.from(e, (c, a) => t(c, a, void 0, i));
        else {
          const c = Object.keys(e);
          s = new Array(c.length);
          for (let a = 0, u = c.length; a < u; a++) {
            const _ = c[a];
            s[a] = t(e[_], _, a, i);
          }
        }
        else s = [];
        return s;
      }
      const er = (e) => e ? gi(e) ? In(e) : er(e.parent) : null, zt = le(/* @__PURE__ */ Object.create(null), {
        $: (e) => e,
        $el: (e) => e.vnode.el,
        $data: (e) => e.data,
        $props: (e) => e.props,
        $attrs: (e) => e.attrs,
        $slots: (e) => e.slots,
        $refs: (e) => e.refs,
        $parent: (e) => er(e.parent),
        $root: (e) => er(e.root),
        $host: (e) => e.ce,
        $emit: (e) => e.emit,
        $options: (e) => Js(e),
        $forceUpdate: (e) => e.f || (e.f = () => {
          vr(e.update);
        }),
        $nextTick: (e) => e.n || (e.n = Ns.bind(e.proxy)),
        $watch: (e) => Xo.bind(e)
      }), Nn = (e, t) => e !== G && !e.__isScriptSetup && B(e, t), Mo = {
        get({ _: e }, t) {
          if (t === "__v_skip") return true;
          const { ctx: n, setupState: r, data: s, props: i, accessCache: o, type: c, appContext: a } = e;
          let u;
          if (t[0] !== "$") {
            const E = o[t];
            if (E !== void 0) switch (E) {
              case 1:
                return r[t];
              case 2:
                return s[t];
              case 4:
                return n[t];
              case 3:
                return i[t];
            }
            else {
              if (Nn(r, t)) return o[t] = 1, r[t];
              if (s !== G && B(s, t)) return o[t] = 2, s[t];
              if ((u = e.propsOptions[0]) && B(u, t)) return o[t] = 3, i[t];
              if (n !== G && B(n, t)) return o[t] = 4, n[t];
              tr && (o[t] = 0);
            }
          }
          const _ = zt[t];
          let b, S;
          if (_) return t === "$attrs" && ce(e.attrs, "get", ""), _(e);
          if ((b = c.__cssModules) && (b = b[t])) return b;
          if (n !== G && B(n, t)) return o[t] = 4, n[t];
          if (S = a.config.globalProperties, B(S, t)) return S[t];
        },
        set({ _: e }, t, n) {
          const { data: r, setupState: s, ctx: i } = e;
          return Nn(s, t) ? (s[t] = n, true) : r !== G && B(r, t) ? (r[t] = n, true) : B(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (i[t] = n, true);
        },
        has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: s, propsOptions: i } }, o) {
          let c;
          return !!n[o] || e !== G && B(e, o) || Nn(t, o) || (c = i[0]) && B(c, o) || B(r, o) || B(zt, o) || B(s.config.globalProperties, o);
        },
        defineProperty(e, t, n) {
          return n.get != null ? e._.accessCache[t] = 0 : B(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
        }
      };
      function Nr(e) {
        return R(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
      }
      let tr = true;
      function Ao(e) {
        const t = Js(e), n = e.proxy, r = e.ctx;
        tr = false, t.beforeCreate && qr(t.beforeCreate, e, "bc");
        const { data: s, computed: i, methods: o, watch: c, provide: a, inject: u, created: _, beforeMount: b, mounted: S, beforeUpdate: E, updated: T, activated: v, deactivated: D, beforeDestroy: U, beforeUnmount: H, destroyed: k, unmounted: A, render: te, renderTracked: Te, renderTriggered: we, errorCaptured: Pe, serverPrefetch: ut, expose: Ne, inheritAttrs: nt, components: W, directives: K, filters: me } = t;
        if (u && Ro(u, r, null), o) for (const $ in o) {
          const j = o[$];
          F(j) && (r[$] = j.bind(n));
        }
        if (s) {
          const $ = s.call(n, n);
          Z($) && (e.data = wr($));
        }
        if (tr = true, i) for (const $ in i) {
          const j = i[$], Me = F(j) ? j.bind(n, n) : F(j.get) ? j.get.bind(n, n) : Ue, dt = !F(j) && F(j.set) ? j.set.bind(n) : Ue, qe = Rt({
            get: Me,
            set: dt
          });
          Object.defineProperty(r, $, {
            enumerable: true,
            configurable: true,
            get: () => qe.value,
            set: (de) => qe.value = de
          });
        }
        if (c) for (const $ in c) Xs(c[$], r, n, $);
        if (a) {
          const $ = F(a) ? a.call(n) : a;
          Reflect.ownKeys($).forEach((j) => {
            Uo(j, $[j]);
          });
        }
        _ && qr(_, e, "c");
        function ne($, j) {
          R(j) ? j.forEach((Me) => $(Me.bind(n))) : j && $(j.bind(n));
        }
        if (ne(mo, b), ne(Mn, S), ne(yo, E), ne(vo, T), ne(po, v), ne(ho, D), ne(To, Pe), ne(Eo, Te), ne(Co, we), ne(xo, H), ne(Ys, A), ne(So, ut), R(Ne)) if (Ne.length) {
          const $ = e.exposed || (e.exposed = {});
          Ne.forEach((j) => {
            Object.defineProperty($, j, {
              get: () => n[j],
              set: (Me) => n[j] = Me,
              enumerable: true
            });
          });
        } else e.exposed || (e.exposed = {});
        te && e.render === Ue && (e.render = te), nt != null && (e.inheritAttrs = nt), W && (e.components = W), K && (e.directives = K), ut && Ks(e);
      }
      function Ro(e, t, n = Ue) {
        R(e) && (e = nr(e));
        for (const r in e) {
          const s = e[r];
          let i;
          Z(s) ? "default" in s ? i = on(s.from || r, s.default, true) : i = on(s.from || r) : i = on(s), ie(i) ? Object.defineProperty(t, r, {
            enumerable: true,
            configurable: true,
            get: () => i.value,
            set: (o) => i.value = o
          }) : t[r] = i;
        }
      }
      function qr(e, t, n) {
        Be(R(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
      }
      function Xs(e, t, n, r) {
        let s = r.includes(".") ? fi(n, r) : () => n[r];
        if (re(e)) {
          const i = t[e];
          F(i) && Hn(s, i);
        } else if (F(e)) Hn(s, e.bind(n));
        else if (Z(e)) if (R(e)) e.forEach((i) => Xs(i, t, n, r));
        else {
          const i = F(e.handler) ? e.handler.bind(n) : t[e.handler];
          F(i) && Hn(s, i, e);
        }
      }
      function Js(e) {
        const t = e.type, { mixins: n, extends: r } = t, { mixins: s, optionsCache: i, config: { optionMergeStrategies: o } } = e.appContext, c = i.get(t);
        let a;
        return c ? a = c : !s.length && !n && !r ? a = t : (a = {}, s.length && s.forEach((u) => hn(a, u, o, true)), hn(a, t, o)), Z(t) && i.set(t, a), a;
      }
      function hn(e, t, n, r = false) {
        const { mixins: s, extends: i } = t;
        i && hn(e, i, n, true), s && s.forEach((o) => hn(e, o, n, true));
        for (const o in t) if (!(r && o === "expose")) {
          const c = Io[o] || n && n[o];
          e[o] = c ? c(e[o], t[o]) : t[o];
        }
        return e;
      }
      const Io = {
        data: Hr,
        props: Wr,
        emits: Wr,
        methods: Mt,
        computed: Mt,
        beforeCreate: fe,
        created: fe,
        beforeMount: fe,
        mounted: fe,
        beforeUpdate: fe,
        updated: fe,
        beforeDestroy: fe,
        beforeUnmount: fe,
        destroyed: fe,
        unmounted: fe,
        activated: fe,
        deactivated: fe,
        errorCaptured: fe,
        serverPrefetch: fe,
        components: Mt,
        directives: Mt,
        watch: Lo,
        provide: Hr,
        inject: Fo
      };
      function Hr(e, t) {
        return t ? e ? function() {
          return le(F(e) ? e.call(this, this) : e, F(t) ? t.call(this, this) : t);
        } : t : e;
      }
      function Fo(e, t) {
        return Mt(nr(e), nr(t));
      }
      function nr(e) {
        if (R(e)) {
          const t = {};
          for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
          return t;
        }
        return e;
      }
      function fe(e, t) {
        return e ? [
          ...new Set([].concat(e, t))
        ] : t;
      }
      function Mt(e, t) {
        return e ? le(/* @__PURE__ */ Object.create(null), e, t) : t;
      }
      function Wr(e, t) {
        return e ? R(e) && R(t) ? [
          .../* @__PURE__ */ new Set([
            ...e,
            ...t
          ])
        ] : le(/* @__PURE__ */ Object.create(null), Nr(e), Nr(t ?? {})) : t;
      }
      function Lo(e, t) {
        if (!e) return t;
        if (!t) return e;
        const n = le(/* @__PURE__ */ Object.create(null), e);
        for (const r in t) n[r] = fe(e[r], t[r]);
        return n;
      }
      function Qs() {
        return {
          app: null,
          config: {
            isNativeTag: vi,
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
      let Do = 0;
      function Vo(e, t) {
        return function(r, s = null) {
          F(r) || (r = le({}, r)), s != null && !Z(s) && (s = null);
          const i = Qs(), o = /* @__PURE__ */ new WeakSet(), c = [];
          let a = false;
          const u = i.app = {
            _uid: Do++,
            _component: r,
            _props: s,
            _container: null,
            _context: i,
            _instance: null,
            version: wc,
            get config() {
              return i.config;
            },
            set config(_) {
            },
            use(_, ...b) {
              return o.has(_) || (_ && F(_.install) ? (o.add(_), _.install(u, ...b)) : F(_) && (o.add(_), _(u, ...b))), u;
            },
            mixin(_) {
              return i.mixins.includes(_) || i.mixins.push(_), u;
            },
            component(_, b) {
              return b ? (i.components[_] = b, u) : i.components[_];
            },
            directive(_, b) {
              return b ? (i.directives[_] = b, u) : i.directives[_];
            },
            mount(_, b, S) {
              if (!a) {
                const E = u._ceVNode || Ge(r, s);
                return E.appContext = i, S === true ? S = "svg" : S === false && (S = void 0), e(E, _, S), a = true, u._container = _, _.__vue_app__ = u, In(E.component);
              }
            },
            onUnmount(_) {
              c.push(_);
            },
            unmount() {
              a && (Be(c, u._instance, 16), e(null, u._container), delete u._container.__vue_app__);
            },
            provide(_, b) {
              return i.provides[_] = b, u;
            },
            runWithContext(_) {
              const b = vt;
              vt = u;
              try {
                return _();
              } finally {
                vt = b;
              }
            }
          };
          return u;
        };
      }
      let vt = null;
      function Uo(e, t) {
        if (ue) {
          let n = ue.provides;
          const r = ue.parent && ue.parent.provides;
          r === n && (n = ue.provides = Object.create(r)), n[e] = t;
        }
      }
      function on(e, t, n = false) {
        const r = uc();
        if (r || vt) {
          let s = vt ? vt._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
          if (s && e in s) return s[e];
          if (arguments.length > 1) return n && F(t) ? t.call(r && r.proxy) : t;
        }
      }
      const Zs = {}, ei = () => Object.create(Zs), ti = (e) => Object.getPrototypeOf(e) === Zs;
      function zo(e, t, n, r = false) {
        const s = {}, i = ei();
        e.propsDefaults = /* @__PURE__ */ Object.create(null), ni(e, t, s, i);
        for (const o in e.propsOptions[0]) o in s || (s[o] = void 0);
        n ? e.props = r ? s : eo(s) : e.type.props ? e.props = s : e.props = i, e.attrs = i;
      }
      function Bo(e, t, n, r) {
        const { props: s, attrs: i, vnode: { patchFlag: o } } = e, c = z(s), [a] = e.propsOptions;
        let u = false;
        if ((r || o > 0) && !(o & 16)) {
          if (o & 8) {
            const _ = e.vnode.dynamicProps;
            for (let b = 0; b < _.length; b++) {
              let S = _[b];
              if (An(e.emitsOptions, S)) continue;
              const E = t[S];
              if (a) if (B(i, S)) E !== i[S] && (i[S] = E, u = true);
              else {
                const T = et(S);
                s[T] = rr(a, c, T, E, e, false);
              }
              else E !== i[S] && (i[S] = E, u = true);
            }
          }
        } else {
          ni(e, t, s, i) && (u = true);
          let _;
          for (const b in c) (!t || !B(t, b) && ((_ = ft(b)) === b || !B(t, _))) && (a ? n && (n[b] !== void 0 || n[_] !== void 0) && (s[b] = rr(a, c, b, void 0, e, true)) : delete s[b]);
          if (i !== c) for (const b in i) (!t || !B(t, b)) && (delete i[b], u = true);
        }
        u && $e(e.attrs, "set", "");
      }
      function ni(e, t, n, r) {
        const [s, i] = e.propsOptions;
        let o = false, c;
        if (t) for (let a in t) {
          if (It(a)) continue;
          const u = t[a];
          let _;
          s && B(s, _ = et(a)) ? !i || !i.includes(_) ? n[_] = u : (c || (c = {}))[_] = u : An(e.emitsOptions, a) || (!(a in r) || u !== r[a]) && (r[a] = u, o = true);
        }
        if (i) {
          const a = z(n), u = c || G;
          for (let _ = 0; _ < i.length; _++) {
            const b = i[_];
            n[b] = rr(s, a, b, u[b], e, !B(u, b));
          }
        }
        return o;
      }
      function rr(e, t, n, r, s, i) {
        const o = e[n];
        if (o != null) {
          const c = B(o, "default");
          if (c && r === void 0) {
            const a = o.default;
            if (o.type !== Function && !o.skipFactory && F(a)) {
              const { propsDefaults: u } = s;
              if (n in u) r = u[n];
              else {
                const _ = Yt(s);
                r = u[n] = a.call(null, t), _();
              }
            } else r = a;
            s.ce && s.ce._setProp(n, r);
          }
          o[0] && (i && !c ? r = false : o[1] && (r === "" || r === ft(n)) && (r = true));
        }
        return r;
      }
      const jo = /* @__PURE__ */ new WeakMap();
      function ri(e, t, n = false) {
        const r = n ? jo : t.propsCache, s = r.get(e);
        if (s) return s;
        const i = e.props, o = {}, c = [];
        let a = false;
        if (!F(e)) {
          const _ = (b) => {
            a = true;
            const [S, E] = ri(b, t, true);
            le(o, S), E && c.push(...E);
          };
          !n && t.mixins.length && t.mixins.forEach(_), e.extends && _(e.extends), e.mixins && e.mixins.forEach(_);
        }
        if (!i && !a) return Z(e) && r.set(e, ht), ht;
        if (R(i)) for (let _ = 0; _ < i.length; _++) {
          const b = et(i[_]);
          $r(b) && (o[b] = G);
        }
        else if (i) for (const _ in i) {
          const b = et(_);
          if ($r(b)) {
            const S = i[_], E = o[b] = R(S) || F(S) ? {
              type: S
            } : le({}, S), T = E.type;
            let v = false, D = true;
            if (R(T)) for (let U = 0; U < T.length; ++U) {
              const H = T[U], k = F(H) && H.name;
              if (k === "Boolean") {
                v = true;
                break;
              } else k === "String" && (D = false);
            }
            else v = F(T) && T.name === "Boolean";
            E[0] = v, E[1] = D, (v || B(E, "default")) && c.push(b);
          }
        }
        const u = [
          o,
          c
        ];
        return Z(e) && r.set(e, u), u;
      }
      function $r(e) {
        return e[0] !== "$" && !It(e);
      }
      const Cr = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", Er = (e) => R(e) ? e.map(Ve) : [
        Ve(e)
      ], No = (e, t, n) => {
        if (t._n) return t;
        const r = uo((...s) => Er(t(...s)), n);
        return r._c = false, r;
      }, si = (e, t, n) => {
        const r = e._ctx;
        for (const s in e) {
          if (Cr(s)) continue;
          const i = e[s];
          if (F(i)) t[s] = No(s, i, r);
          else if (i != null) {
            const o = Er(i);
            t[s] = () => o;
          }
        }
      }, ii = (e, t) => {
        const n = Er(t);
        e.slots.default = () => n;
      }, oi = (e, t, n) => {
        for (const r in t) (n || !Cr(r)) && (e[r] = t[r]);
      }, qo = (e, t, n) => {
        const r = e.slots = ei();
        if (e.vnode.shapeFlag & 32) {
          const s = t.__;
          s && kn(r, "__", s, true);
          const i = t._;
          i ? (oi(r, t, n), n && kn(r, "_", i, true)) : si(t, r);
        } else t && ii(e, t);
      }, Ho = (e, t, n) => {
        const { vnode: r, slots: s } = e;
        let i = true, o = G;
        if (r.shapeFlag & 32) {
          const c = t._;
          c ? n && c === 1 ? i = false : oi(s, t, n) : (i = !t.$stable, si(t, s)), o = t;
        } else t && (ii(e, t), o = {
          default: 1
        });
        if (i) for (const c in s) !Cr(c) && o[c] == null && delete s[c];
      }, ve = rc;
      function Wo(e) {
        return $o(e);
      }
      function $o(e, t) {
        const n = Cn();
        n.__VUE__ = true;
        const { insert: r, remove: s, patchProp: i, createElement: o, createText: c, createComment: a, setText: u, setElementText: _, parentNode: b, nextSibling: S, setScopeId: E = Ue, insertStaticContent: T } = e, v = (l, f, d, h = null, g = null, p = null, x = void 0, y = null, m = !!f.dynamicChildren) => {
          if (l === f) return;
          l && !Ot(l, f) && (h = Jt(l), de(l, g, p, true), l = null), f.patchFlag === -2 && (m = false, f.dynamicChildren = null);
          const { type: w, ref: O, shapeFlag: C } = f;
          switch (w) {
            case Rn:
              D(l, f, d, h);
              break;
            case St:
              U(l, f, d, h);
              break;
            case Wn:
              l == null && H(f, d, h, x);
              break;
            case De:
              W(l, f, d, h, g, p, x, y, m);
              break;
            default:
              C & 1 ? te(l, f, d, h, g, p, x, y, m) : C & 6 ? K(l, f, d, h, g, p, x, y, m) : (C & 64 || C & 128) && w.process(l, f, d, h, g, p, x, y, m, Et);
          }
          O != null && g ? Vt(O, l && l.ref, p, f || l, !f) : O == null && l && l.ref != null && Vt(l.ref, null, p, l, true);
        }, D = (l, f, d, h) => {
          if (l == null) r(f.el = c(f.children), d, h);
          else {
            const g = f.el = l.el;
            f.children !== l.children && u(g, f.children);
          }
        }, U = (l, f, d, h) => {
          l == null ? r(f.el = a(f.children || ""), d, h) : f.el = l.el;
        }, H = (l, f, d, h) => {
          [l.el, l.anchor] = T(l.children, f, d, h, l.el, l.anchor);
        }, k = ({ el: l, anchor: f }, d, h) => {
          let g;
          for (; l && l !== f; ) g = S(l), r(l, d, h), l = g;
          r(f, d, h);
        }, A = ({ el: l, anchor: f }) => {
          let d;
          for (; l && l !== f; ) d = S(l), s(l), l = d;
          s(f);
        }, te = (l, f, d, h, g, p, x, y, m) => {
          f.type === "svg" ? x = "svg" : f.type === "math" && (x = "mathml"), l == null ? Te(f, d, h, g, p, x, y, m) : ut(l, f, g, p, x, y, m);
        }, Te = (l, f, d, h, g, p, x, y) => {
          let m, w;
          const { props: O, shapeFlag: C, transition: P, dirs: I } = l;
          if (m = l.el = o(l.type, p, O && O.is, O), C & 8 ? _(m, l.children) : C & 16 && Pe(l.children, m, null, h, g, qn(l, p), x, y), I && it(l, null, h, "created"), we(m, l, l.scopeId, x, h), O) {
            for (const Y in O) Y !== "value" && !It(Y) && i(m, Y, null, O[Y], p, h);
            "value" in O && i(m, "value", null, O.value, p), (w = O.onVnodeBeforeMount) && Fe(w, h, l);
          }
          I && it(l, null, h, "beforeMount");
          const V = Ko(g, P);
          V && P.beforeEnter(m), r(m, f, d), ((w = O && O.onVnodeMounted) || V || I) && ve(() => {
            w && Fe(w, h, l), V && P.enter(m), I && it(l, null, h, "mounted");
          }, g);
        }, we = (l, f, d, h, g) => {
          if (d && E(l, d), h) for (let p = 0; p < h.length; p++) E(l, h[p]);
          if (g) {
            let p = g.subTree;
            if (f === p || ui(p.type) && (p.ssContent === f || p.ssFallback === f)) {
              const x = g.vnode;
              we(l, x, x.scopeId, x.slotScopeIds, g.parent);
            }
          }
        }, Pe = (l, f, d, h, g, p, x, y, m = 0) => {
          for (let w = m; w < l.length; w++) {
            const O = l[w] = y ? Qe(l[w]) : Ve(l[w]);
            v(null, O, f, d, h, g, p, x, y);
          }
        }, ut = (l, f, d, h, g, p, x) => {
          const y = f.el = l.el;
          let { patchFlag: m, dynamicChildren: w, dirs: O } = f;
          m |= l.patchFlag & 16;
          const C = l.props || G, P = f.props || G;
          let I;
          if (d && ot(d, false), (I = P.onVnodeBeforeUpdate) && Fe(I, d, f, l), O && it(f, l, d, "beforeUpdate"), d && ot(d, true), (C.innerHTML && P.innerHTML == null || C.textContent && P.textContent == null) && _(y, ""), w ? Ne(l.dynamicChildren, w, y, d, h, qn(f, g), p) : x || j(l, f, y, null, d, h, qn(f, g), p, false), m > 0) {
            if (m & 16) nt(y, C, P, d, g);
            else if (m & 2 && C.class !== P.class && i(y, "class", null, P.class, g), m & 4 && i(y, "style", C.style, P.style, g), m & 8) {
              const V = f.dynamicProps;
              for (let Y = 0; Y < V.length; Y++) {
                const N = V[Y], be = C[N], ge = P[N];
                (ge !== be || N === "value") && i(y, N, be, ge, g, d);
              }
            }
            m & 1 && l.children !== f.children && _(y, f.children);
          } else !x && w == null && nt(y, C, P, d, g);
          ((I = P.onVnodeUpdated) || O) && ve(() => {
            I && Fe(I, d, f, l), O && it(f, l, d, "updated");
          }, h);
        }, Ne = (l, f, d, h, g, p, x) => {
          for (let y = 0; y < f.length; y++) {
            const m = l[y], w = f[y], O = m.el && (m.type === De || !Ot(m, w) || m.shapeFlag & 198) ? b(m.el) : d;
            v(m, w, O, null, h, g, p, x, true);
          }
        }, nt = (l, f, d, h, g) => {
          if (f !== d) {
            if (f !== G) for (const p in f) !It(p) && !(p in d) && i(l, p, f[p], null, g, h);
            for (const p in d) {
              if (It(p)) continue;
              const x = d[p], y = f[p];
              x !== y && p !== "value" && i(l, p, y, x, g, h);
            }
            "value" in d && i(l, "value", f.value, d.value, g);
          }
        }, W = (l, f, d, h, g, p, x, y, m) => {
          const w = f.el = l ? l.el : c(""), O = f.anchor = l ? l.anchor : c("");
          let { patchFlag: C, dynamicChildren: P, slotScopeIds: I } = f;
          I && (y = y ? y.concat(I) : I), l == null ? (r(w, d, h), r(O, d, h), Pe(f.children || [], d, O, g, p, x, y, m)) : C > 0 && C & 64 && P && l.dynamicChildren ? (Ne(l.dynamicChildren, P, d, g, p, x, y), (f.key != null || g && f === g.subTree) && ci(l, f, true)) : j(l, f, d, O, g, p, x, y, m);
        }, K = (l, f, d, h, g, p, x, y, m) => {
          f.slotScopeIds = y, l == null ? f.shapeFlag & 512 ? g.ctx.activate(f, d, h, x, m) : me(f, d, h, g, p, x, m) : rt(l, f, m);
        }, me = (l, f, d, h, g, p, x) => {
          const y = l.component = _c(l, h, g);
          if (Gs(l) && (y.ctx.renderer = Et), dc(y, false, x), y.asyncDep) {
            if (g && g.registerDep(y, ne, x), !l.el) {
              const m = y.subTree = Ge(St);
              U(null, m, f, d), l.placeholder = m.el;
            }
          } else ne(y, l, f, d, g, p, x);
        }, rt = (l, f, d) => {
          const h = f.component = l.component;
          if (tc(l, f, d)) if (h.asyncDep && !h.asyncResolved) {
            $(h, f, d);
            return;
          } else h.next = f, h.update();
          else f.el = l.el, h.vnode = f;
        }, ne = (l, f, d, h, g, p, x) => {
          const y = () => {
            if (l.isMounted) {
              let { next: C, bu: P, u: I, parent: V, vnode: Y } = l;
              {
                const Re = li(l);
                if (Re) {
                  C && (C.el = Y.el, $(l, C, x)), Re.asyncDep.then(() => {
                    l.isUnmounted || y();
                  });
                  return;
                }
              }
              let N = C, be;
              ot(l, false), C ? (C.el = Y.el, $(l, C, x)) : C = Y, P && sn(P), (be = C.props && C.props.onVnodeBeforeUpdate) && Fe(be, V, C, Y), ot(l, true);
              const ge = Gr(l), Ae = l.subTree;
              l.subTree = ge, v(Ae, ge, b(Ae.el), Jt(Ae), l, g, p), C.el = ge.el, N === null && nc(l, ge.el), I && ve(I, g), (be = C.props && C.props.onVnodeUpdated) && ve(() => Fe(be, V, C, Y), g);
            } else {
              let C;
              const { el: P, props: I } = f, { bm: V, m: Y, parent: N, root: be, type: ge } = l, Ae = Ut(f);
              ot(l, false), V && sn(V), !Ae && (C = I && I.onVnodeBeforeMount) && Fe(C, N, f), ot(l, true);
              {
                be.ce && be.ce._def.shadowRoot !== false && be.ce._injectChildStyle(ge);
                const Re = l.subTree = Gr(l);
                v(null, Re, d, h, l, g, p), f.el = Re.el;
              }
              if (Y && ve(Y, g), !Ae && (C = I && I.onVnodeMounted)) {
                const Re = f;
                ve(() => Fe(C, N, Re), g);
              }
              (f.shapeFlag & 256 || N && Ut(N.vnode) && N.vnode.shapeFlag & 256) && l.a && ve(l.a, g), l.isMounted = true, f = d = h = null;
            }
          };
          l.scope.on();
          const m = l.effect = new Ss(y);
          l.scope.off();
          const w = l.update = m.run.bind(m), O = l.job = m.runIfDirty.bind(m);
          O.i = l, O.id = l.uid, m.scheduler = () => vr(O), ot(l, true), w();
        }, $ = (l, f, d) => {
          f.component = l;
          const h = l.vnode.props;
          l.vnode = f, l.next = null, Bo(l, f.props, h, d), Ho(l, f.children, d), ke(), Br(l), Ye();
        }, j = (l, f, d, h, g, p, x, y, m = false) => {
          const w = l && l.children, O = l ? l.shapeFlag : 0, C = f.children, { patchFlag: P, shapeFlag: I } = f;
          if (P > 0) {
            if (P & 128) {
              dt(w, C, d, h, g, p, x, y, m);
              return;
            } else if (P & 256) {
              Me(w, C, d, h, g, p, x, y, m);
              return;
            }
          }
          I & 8 ? (O & 16 && st(w, g, p), C !== w && _(d, C)) : O & 16 ? I & 16 ? dt(w, C, d, h, g, p, x, y, m) : st(w, g, p, true) : (O & 8 && _(d, ""), I & 16 && Pe(C, d, h, g, p, x, y, m));
        }, Me = (l, f, d, h, g, p, x, y, m) => {
          l = l || ht, f = f || ht;
          const w = l.length, O = f.length, C = Math.min(w, O);
          let P;
          for (P = 0; P < C; P++) {
            const I = f[P] = m ? Qe(f[P]) : Ve(f[P]);
            v(l[P], I, d, null, g, p, x, y, m);
          }
          w > O ? st(l, g, p, true, false, C) : Pe(f, d, h, g, p, x, y, m, C);
        }, dt = (l, f, d, h, g, p, x, y, m) => {
          let w = 0;
          const O = f.length;
          let C = l.length - 1, P = O - 1;
          for (; w <= C && w <= P; ) {
            const I = l[w], V = f[w] = m ? Qe(f[w]) : Ve(f[w]);
            if (Ot(I, V)) v(I, V, d, null, g, p, x, y, m);
            else break;
            w++;
          }
          for (; w <= C && w <= P; ) {
            const I = l[C], V = f[P] = m ? Qe(f[P]) : Ve(f[P]);
            if (Ot(I, V)) v(I, V, d, null, g, p, x, y, m);
            else break;
            C--, P--;
          }
          if (w > C) {
            if (w <= P) {
              const I = P + 1, V = I < O ? f[I].el : h;
              for (; w <= P; ) v(null, f[w] = m ? Qe(f[w]) : Ve(f[w]), d, V, g, p, x, y, m), w++;
            }
          } else if (w > P) for (; w <= C; ) de(l[w], g, p, true), w++;
          else {
            const I = w, V = w, Y = /* @__PURE__ */ new Map();
            for (w = V; w <= P; w++) {
              const ye = f[w] = m ? Qe(f[w]) : Ve(f[w]);
              ye.key != null && Y.set(ye.key, w);
            }
            let N, be = 0;
            const ge = P - V + 1;
            let Ae = false, Re = 0;
            const Tt = new Array(ge);
            for (w = 0; w < ge; w++) Tt[w] = 0;
            for (w = I; w <= C; w++) {
              const ye = l[w];
              if (be >= ge) {
                de(ye, g, p, true);
                continue;
              }
              let Ie;
              if (ye.key != null) Ie = Y.get(ye.key);
              else for (N = V; N <= P; N++) if (Tt[N - V] === 0 && Ot(ye, f[N])) {
                Ie = N;
                break;
              }
              Ie === void 0 ? de(ye, g, p, true) : (Tt[Ie - V] = w + 1, Ie >= Re ? Re = Ie : Ae = true, v(ye, f[Ie], d, null, g, p, x, y, m), be++);
            }
            const Ir = Ae ? Go(Tt) : ht;
            for (N = Ir.length - 1, w = ge - 1; w >= 0; w--) {
              const ye = V + w, Ie = f[ye], Fr = f[ye + 1], Lr = ye + 1 < O ? Fr.el || Fr.placeholder : h;
              Tt[w] === 0 ? v(null, Ie, d, Lr, g, p, x, y, m) : Ae && (N < 0 || w !== Ir[N] ? qe(Ie, d, Lr, 2) : N--);
            }
          }
        }, qe = (l, f, d, h, g = null) => {
          const { el: p, type: x, transition: y, children: m, shapeFlag: w } = l;
          if (w & 6) {
            qe(l.component.subTree, f, d, h);
            return;
          }
          if (w & 128) {
            l.suspense.move(f, d, h);
            return;
          }
          if (w & 64) {
            x.move(l, f, d, Et);
            return;
          }
          if (x === De) {
            r(p, f, d);
            for (let C = 0; C < m.length; C++) qe(m[C], f, d, h);
            r(l.anchor, f, d);
            return;
          }
          if (x === Wn) {
            k(l, f, d);
            return;
          }
          if (h !== 2 && w & 1 && y) if (h === 0) y.beforeEnter(p), r(p, f, d), ve(() => y.enter(p), g);
          else {
            const { leave: C, delayLeave: P, afterLeave: I } = y, V = () => {
              l.ctx.isUnmounted ? s(p) : r(p, f, d);
            }, Y = () => {
              C(p, () => {
                V(), I && I();
              });
            };
            P ? P(p, V, Y) : Y();
          }
          else r(p, f, d);
        }, de = (l, f, d, h = false, g = false) => {
          const { type: p, props: x, ref: y, children: m, dynamicChildren: w, shapeFlag: O, patchFlag: C, dirs: P, cacheIndex: I } = l;
          if (C === -2 && (g = false), y != null && (ke(), Vt(y, null, d, l, true), Ye()), I != null && (f.renderCache[I] = void 0), O & 256) {
            f.ctx.deactivate(l);
            return;
          }
          const V = O & 1 && P, Y = !Ut(l);
          let N;
          if (Y && (N = x && x.onVnodeBeforeUnmount) && Fe(N, f, l), O & 6) Ln(l.component, d, h);
          else {
            if (O & 128) {
              l.suspense.unmount(d, h);
              return;
            }
            V && it(l, null, f, "beforeUnmount"), O & 64 ? l.type.remove(l, f, d, Et, h) : w && !w.hasOnce && (p !== De || C > 0 && C & 64) ? st(w, f, d, false, true) : (p === De && C & 384 || !g && O & 16) && st(m, f, d), h && Xt(l);
          }
          (Y && (N = x && x.onVnodeUnmounted) || V) && ve(() => {
            N && Fe(N, f, l), V && it(l, null, f, "unmounted");
          }, d);
        }, Xt = (l) => {
          const { type: f, el: d, anchor: h, transition: g } = l;
          if (f === De) {
            Fn(d, h);
            return;
          }
          if (f === Wn) {
            A(l);
            return;
          }
          const p = () => {
            s(d), g && !g.persisted && g.afterLeave && g.afterLeave();
          };
          if (l.shapeFlag & 1 && g && !g.persisted) {
            const { leave: x, delayLeave: y } = g, m = () => x(d, p);
            y ? y(l.el, p, m) : m();
          } else p();
        }, Fn = (l, f) => {
          let d;
          for (; l !== f; ) d = S(l), s(l), l = d;
          s(f);
        }, Ln = (l, f, d) => {
          const { bum: h, scope: g, job: p, subTree: x, um: y, m, a: w, parent: O, slots: { __: C } } = l;
          Kr(m), Kr(w), h && sn(h), O && R(C) && C.forEach((P) => {
            O.renderCache[P] = void 0;
          }), g.stop(), p && (p.flags |= 8, de(x, l, f, d)), y && ve(y, f), ve(() => {
            l.isUnmounted = true;
          }, f), f && f.pendingBranch && !f.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
        }, st = (l, f, d, h = false, g = false, p = 0) => {
          for (let x = p; x < l.length; x++) de(l[x], f, d, h, g);
        }, Jt = (l) => {
          if (l.shapeFlag & 6) return Jt(l.component.subTree);
          if (l.shapeFlag & 128) return l.suspense.next();
          const f = S(l.anchor || l.el), d = f && f[bo];
          return d ? S(d) : f;
        };
        let Dn = false;
        const Rr = (l, f, d) => {
          l == null ? f._vnode && de(f._vnode, null, null, true) : v(f._vnode || null, l, f, null, null, null, d), f._vnode = l, Dn || (Dn = true, Br(), Hs(), Dn = false);
        }, Et = {
          p: v,
          um: de,
          m: qe,
          r: Xt,
          mt: me,
          mc: Pe,
          pc: j,
          pbc: Ne,
          n: Jt,
          o: e
        };
        return {
          render: Rr,
          hydrate: void 0,
          createApp: Vo(Rr)
        };
      }
      function qn({ type: e, props: t }, n) {
        return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
      }
      function ot({ effect: e, job: t }, n) {
        n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
      }
      function Ko(e, t) {
        return (!e || e && !e.pendingBranch) && t && !t.persisted;
      }
      function ci(e, t, n = false) {
        const r = e.children, s = t.children;
        if (R(r) && R(s)) for (let i = 0; i < r.length; i++) {
          const o = r[i];
          let c = s[i];
          c.shapeFlag & 1 && !c.dynamicChildren && ((c.patchFlag <= 0 || c.patchFlag === 32) && (c = s[i] = Qe(s[i]), c.el = o.el), !n && c.patchFlag !== -2 && ci(o, c)), c.type === Rn && (c.el = o.el), c.type === St && !c.el && (c.el = o.el);
        }
      }
      function Go(e) {
        const t = e.slice(), n = [
          0
        ];
        let r, s, i, o, c;
        const a = e.length;
        for (r = 0; r < a; r++) {
          const u = e[r];
          if (u !== 0) {
            if (s = n[n.length - 1], e[s] < u) {
              t[r] = s, n.push(r);
              continue;
            }
            for (i = 0, o = n.length - 1; i < o; ) c = i + o >> 1, e[n[c]] < u ? i = c + 1 : o = c;
            u < e[n[i]] && (i > 0 && (t[r] = n[i - 1]), n[i] = r);
          }
        }
        for (i = n.length, o = n[i - 1]; i-- > 0; ) n[i] = o, o = t[o];
        return n;
      }
      function li(e) {
        const t = e.subTree.component;
        if (t) return t.asyncDep && !t.asyncResolved ? t : li(t);
      }
      function Kr(e) {
        if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
      }
      const ko = Symbol.for("v-scx"), Yo = () => on(ko);
      function Hn(e, t, n) {
        return ai(e, t, n);
      }
      function ai(e, t, n = G) {
        const { immediate: r, deep: s, flush: i, once: o } = n, c = le({}, n), a = t && r || !t && i !== "post";
        let u;
        if (Kt) {
          if (i === "sync") {
            const E = Yo();
            u = E.__watcherHandles || (E.__watcherHandles = []);
          } else if (!a) {
            const E = () => {
            };
            return E.stop = Ue, E.resume = Ue, E.pause = Ue, E;
          }
        }
        const _ = ue;
        c.call = (E, T, v) => Be(E, _, T, v);
        let b = false;
        i === "post" ? c.scheduler = (E) => {
          ve(E, _ && _.suspense);
        } : i !== "sync" && (b = true, c.scheduler = (E, T) => {
          T ? E() : vr(E);
        }), c.augmentJob = (E) => {
          t && (E.flags |= 4), b && (E.flags |= 2, _ && (E.id = _.uid, E.i = _));
        };
        const S = lo(e, t, c);
        return Kt && (u ? u.push(S) : a && S()), S;
      }
      function Xo(e, t, n) {
        const r = this.proxy, s = re(e) ? e.includes(".") ? fi(r, e) : () => r[e] : e.bind(r, r);
        let i;
        F(t) ? i = t : (i = t.handler, n = t);
        const o = Yt(this), c = ai(s, i.bind(r), n);
        return o(), c;
      }
      function fi(e, t) {
        const n = t.split(".");
        return () => {
          let r = e;
          for (let s = 0; s < n.length && r; s++) r = r[n[s]];
          return r;
        };
      }
      const Jo = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${et(t)}Modifiers`] || e[`${ft(t)}Modifiers`];
      function Qo(e, t, ...n) {
        if (e.isUnmounted) return;
        const r = e.vnode.props || G;
        let s = n;
        const i = t.startsWith("update:"), o = i && Jo(r, t.slice(7));
        o && (o.trim && (s = n.map((_) => re(_) ? _.trim() : _)), o.number && (s = n.map(un)));
        let c, a = r[c = Vn(t)] || r[c = Vn(et(t))];
        !a && i && (a = r[c = Vn(ft(t))]), a && Be(a, e, 6, s);
        const u = r[c + "Once"];
        if (u) {
          if (!e.emitted) e.emitted = {};
          else if (e.emitted[c]) return;
          e.emitted[c] = true, Be(u, e, 6, s);
        }
      }
      function _i(e, t, n = false) {
        const r = t.emitsCache, s = r.get(e);
        if (s !== void 0) return s;
        const i = e.emits;
        let o = {}, c = false;
        if (!F(e)) {
          const a = (u) => {
            const _ = _i(u, t, true);
            _ && (c = true, le(o, _));
          };
          !n && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
        }
        return !i && !c ? (Z(e) && r.set(e, null), null) : (R(i) ? i.forEach((a) => o[a] = null) : le(o, i), Z(e) && r.set(e, o), o);
      }
      function An(e, t) {
        return !e || !vn(t) ? false : (t = t.slice(2).replace(/Once$/, ""), B(e, t[0].toLowerCase() + t.slice(1)) || B(e, ft(t)) || B(e, t));
      }
      function Gr(e) {
        const { type: t, vnode: n, proxy: r, withProxy: s, propsOptions: [i], slots: o, attrs: c, emit: a, render: u, renderCache: _, props: b, data: S, setupState: E, ctx: T, inheritAttrs: v } = e, D = pn(e);
        let U, H;
        try {
          if (n.shapeFlag & 4) {
            const A = s || r, te = A;
            U = Ve(u.call(te, A, _, b, E, S, T)), H = c;
          } else {
            const A = t;
            U = Ve(A.length > 1 ? A(b, {
              attrs: c,
              slots: o,
              emit: a
            }) : A(b, null)), H = t.props ? c : Zo(c);
          }
        } catch (A) {
          Bt.length = 0, Pn(A, e, 1), U = Ge(St);
        }
        let k = U;
        if (H && v !== false) {
          const A = Object.keys(H), { shapeFlag: te } = k;
          A.length && te & 7 && (i && A.some(lr) && (H = ec(H, i)), k = Ct(k, H, false, true));
        }
        return n.dirs && (k = Ct(k, null, false, true), k.dirs = k.dirs ? k.dirs.concat(n.dirs) : n.dirs), n.transition && xr(k, n.transition), U = k, pn(D), U;
      }
      const Zo = (e) => {
        let t;
        for (const n in e) (n === "class" || n === "style" || vn(n)) && ((t || (t = {}))[n] = e[n]);
        return t;
      }, ec = (e, t) => {
        const n = {};
        for (const r in e) (!lr(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
        return n;
      };
      function tc(e, t, n) {
        const { props: r, children: s, component: i } = e, { props: o, children: c, patchFlag: a } = t, u = i.emitsOptions;
        if (t.dirs || t.transition) return true;
        if (n && a >= 0) {
          if (a & 1024) return true;
          if (a & 16) return r ? kr(r, o, u) : !!o;
          if (a & 8) {
            const _ = t.dynamicProps;
            for (let b = 0; b < _.length; b++) {
              const S = _[b];
              if (o[S] !== r[S] && !An(u, S)) return true;
            }
          }
        } else return (s || c) && (!c || !c.$stable) ? true : r === o ? false : r ? o ? kr(r, o, u) : true : !!o;
        return false;
      }
      function kr(e, t, n) {
        const r = Object.keys(t);
        if (r.length !== Object.keys(e).length) return true;
        for (let s = 0; s < r.length; s++) {
          const i = r[s];
          if (t[i] !== e[i] && !An(n, i)) return true;
        }
        return false;
      }
      function nc({ vnode: e, parent: t }, n) {
        for (; t; ) {
          const r = t.subTree;
          if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
          else break;
        }
      }
      const ui = (e) => e.__isSuspense;
      function rc(e, t) {
        t && t.pendingBranch ? R(e) ? t.effects.push(...e) : t.effects.push(e) : _o(e);
      }
      const De = Symbol.for("v-fgt"), Rn = Symbol.for("v-txt"), St = Symbol.for("v-cmt"), Wn = Symbol.for("v-stc"), Bt = [];
      let xe = null;
      function jt(e = false) {
        Bt.push(xe = e ? null : []);
      }
      function sc() {
        Bt.pop(), xe = Bt[Bt.length - 1] || null;
      }
      let $t = 1;
      function Yr(e, t = false) {
        $t += e, e < 0 && xe && t && (xe.hasOnce = true);
      }
      function ic(e) {
        return e.dynamicChildren = $t > 0 ? xe || ht : null, sc(), $t > 0 && xe && xe.push(e), e;
      }
      function Nt(e, t, n, r, s, i) {
        return ic(q(e, t, n, r, s, i, true));
      }
      function di(e) {
        return e ? e.__v_isVNode === true : false;
      }
      function Ot(e, t) {
        return e.type === t.type && e.key === t.key;
      }
      const bi = ({ key: e }) => e ?? null, cn = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? re(e) || ie(e) || F(e) ? {
        i: Se,
        r: e,
        k: t,
        f: !!n
      } : e : null);
      function q(e, t = null, n = null, r = 0, s = null, i = e === De ? 0 : 1, o = false, c = false) {
        const a = {
          __v_isVNode: true,
          __v_skip: true,
          type: e,
          props: t,
          key: t && bi(t),
          ref: t && cn(t),
          scopeId: $s,
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
          shapeFlag: i,
          patchFlag: r,
          dynamicProps: s,
          dynamicChildren: null,
          appContext: null,
          ctx: Se
        };
        return c ? (Tr(a, n), i & 128 && e.normalize(a)) : n && (a.shapeFlag |= re(n) ? 8 : 16), $t > 0 && !o && xe && (a.patchFlag > 0 || i & 6) && a.patchFlag !== 32 && xe.push(a), a;
      }
      const Ge = oc;
      function oc(e, t = null, n = null, r = 0, s = null, i = false) {
        if ((!e || e === Po) && (e = St), di(e)) {
          const c = Ct(e, t, true);
          return n && Tr(c, n), $t > 0 && !i && xe && (c.shapeFlag & 6 ? xe[xe.indexOf(e)] = c : xe.push(c)), c.patchFlag = -2, c;
        }
        if (hc(e) && (e = e.__vccOpts), t) {
          t = cc(t);
          let { class: c, style: a } = t;
          c && !re(c) && (t.class = ur(c)), Z(a) && (yr(a) && !R(a) && (a = le({}, a)), t.style = _r(a));
        }
        const o = re(e) ? 1 : ui(e) ? 128 : go(e) ? 64 : Z(e) ? 4 : F(e) ? 2 : 0;
        return q(e, t, n, r, s, o, i, true);
      }
      function cc(e) {
        return e ? yr(e) || ti(e) ? le({}, e) : e : null;
      }
      function Ct(e, t, n = false, r = false) {
        const { props: s, ref: i, patchFlag: o, children: c, transition: a } = e, u = t ? lc(s || {}, t) : s, _ = {
          __v_isVNode: true,
          __v_skip: true,
          type: e.type,
          props: u,
          key: u && bi(u),
          ref: t && t.ref ? n && i ? R(i) ? i.concat(cn(t)) : [
            i,
            cn(t)
          ] : cn(t) : i,
          scopeId: e.scopeId,
          slotScopeIds: e.slotScopeIds,
          children: c,
          target: e.target,
          targetStart: e.targetStart,
          targetAnchor: e.targetAnchor,
          staticCount: e.staticCount,
          shapeFlag: e.shapeFlag,
          patchFlag: t && e.type !== De ? o === -1 ? 16 : o | 16 : o,
          dynamicProps: e.dynamicProps,
          dynamicChildren: e.dynamicChildren,
          appContext: e.appContext,
          dirs: e.dirs,
          transition: a,
          component: e.component,
          suspense: e.suspense,
          ssContent: e.ssContent && Ct(e.ssContent),
          ssFallback: e.ssFallback && Ct(e.ssFallback),
          placeholder: e.placeholder,
          el: e.el,
          anchor: e.anchor,
          ctx: e.ctx,
          ce: e.ce
        };
        return a && r && xr(_, a.clone(_)), _;
      }
      function At(e = " ", t = 0) {
        return Ge(Rn, null, e, t);
      }
      function Ve(e) {
        return e == null || typeof e == "boolean" ? Ge(St) : R(e) ? Ge(De, null, e.slice()) : di(e) ? Qe(e) : Ge(Rn, null, String(e));
      }
      function Qe(e) {
        return e.el === null && e.patchFlag !== -1 || e.memo ? e : Ct(e);
      }
      function Tr(e, t) {
        let n = 0;
        const { shapeFlag: r } = e;
        if (t == null) t = null;
        else if (R(t)) n = 16;
        else if (typeof t == "object") if (r & 65) {
          const s = t.default;
          s && (s._c && (s._d = false), Tr(e, s()), s._c && (s._d = true));
          return;
        } else {
          n = 32;
          const s = t._;
          !s && !ti(t) ? t._ctx = Se : s === 3 && Se && (Se.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
        }
        else F(t) ? (t = {
          default: t,
          _ctx: Se
        }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
          At(t)
        ]) : n = 8);
        e.children = t, e.shapeFlag |= n;
      }
      function lc(...e) {
        const t = {};
        for (let n = 0; n < e.length; n++) {
          const r = e[n];
          for (const s in r) if (s === "class") t.class !== r.class && (t.class = ur([
            t.class,
            r.class
          ]));
          else if (s === "style") t.style = _r([
            t.style,
            r.style
          ]);
          else if (vn(s)) {
            const i = t[s], o = r[s];
            o && i !== o && !(R(i) && i.includes(o)) && (t[s] = i ? [].concat(i, o) : o);
          } else s !== "" && (t[s] = r[s]);
        }
        return t;
      }
      function Fe(e, t, n, r = null) {
        Be(e, t, 7, [
          n,
          r
        ]);
      }
      const ac = Qs();
      let fc = 0;
      function _c(e, t, n) {
        const r = e.type, s = (t ? t.appContext : e.appContext) || ac, i = {
          uid: fc++,
          vnode: e,
          type: r,
          parent: t,
          appContext: s,
          root: null,
          next: null,
          subTree: null,
          effect: null,
          update: null,
          job: null,
          scope: new Li(true),
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
          propsOptions: ri(r, s),
          emitsOptions: _i(r, s),
          emit: null,
          emitted: null,
          propsDefaults: G,
          inheritAttrs: r.inheritAttrs,
          ctx: G,
          data: G,
          props: G,
          attrs: G,
          slots: G,
          refs: G,
          setupState: G,
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
        return i.ctx = {
          _: i
        }, i.root = t ? t.root : i, i.emit = Qo.bind(null, i), e.ce && e.ce(i), i;
      }
      let ue = null;
      const uc = () => ue || Se;
      let wn, sr;
      {
        const e = Cn(), t = (n, r) => {
          let s;
          return (s = e[n]) || (s = e[n] = []), s.push(r), (i) => {
            s.length > 1 ? s.forEach((o) => o(i)) : s[0](i);
          };
        };
        wn = t("__VUE_INSTANCE_SETTERS__", (n) => ue = n), sr = t("__VUE_SSR_SETTERS__", (n) => Kt = n);
      }
      const Yt = (e) => {
        const t = ue;
        return wn(e), e.scope.on(), () => {
          e.scope.off(), wn(t);
        };
      }, Xr = () => {
        ue && ue.scope.off(), wn(null);
      };
      function gi(e) {
        return e.vnode.shapeFlag & 4;
      }
      let Kt = false;
      function dc(e, t = false, n = false) {
        t && sr(t);
        const { props: r, children: s } = e.vnode, i = gi(e);
        zo(e, r, i, t), qo(e, s, n || t);
        const o = i ? bc(e, t) : void 0;
        return t && sr(false), o;
      }
      function bc(e, t) {
        const n = e.type;
        e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Mo);
        const { setup: r } = n;
        if (r) {
          ke();
          const s = e.setupContext = r.length > 1 ? pc(e) : null, i = Yt(e), o = kt(r, e, 0, [
            e.props,
            s
          ]), c = ps(o);
          if (Ye(), i(), (c || e.sp) && !Ut(e) && Ks(e), c) {
            if (o.then(Xr, Xr), t) return o.then((a) => {
              Jr(e, a);
            }).catch((a) => {
              Pn(a, e, 0);
            });
            e.asyncDep = o;
          } else Jr(e, o);
        } else pi(e);
      }
      function Jr(e, t, n) {
        F(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Z(t) && (e.setupState = Bs(t)), pi(e);
      }
      function pi(e, t, n) {
        const r = e.type;
        e.render || (e.render = r.render || Ue);
        {
          const s = Yt(e);
          ke();
          try {
            Ao(e);
          } finally {
            Ye(), s();
          }
        }
      }
      const gc = {
        get(e, t) {
          return ce(e, "get", ""), e[t];
        }
      };
      function pc(e) {
        const t = (n) => {
          e.exposed = n || {};
        };
        return {
          attrs: new Proxy(e.attrs, gc),
          slots: e.slots,
          emit: e.emit,
          expose: t
        };
      }
      function In(e) {
        return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Bs(to(e.exposed)), {
          get(t, n) {
            if (n in t) return t[n];
            if (n in zt) return zt[n](e);
          },
          has(t, n) {
            return n in t || n in zt;
          }
        })) : e.proxy;
      }
      function hc(e) {
        return F(e) && "__vccOpts" in e;
      }
      const Rt = (e, t) => oo(e, t, Kt), wc = "3.5.18";
      let ir;
      const Qr = typeof window < "u" && window.trustedTypes;
      if (Qr) try {
        ir = Qr.createPolicy("vue", {
          createHTML: (e) => e
        });
      } catch {
      }
      const hi = ir ? (e) => ir.createHTML(e) : (e) => e, mc = "http://www.w3.org/2000/svg", yc = "http://www.w3.org/1998/Math/MathML", We = typeof document < "u" ? document : null, Zr = We && We.createElement("template"), vc = {
        insert: (e, t, n) => {
          t.insertBefore(e, n || null);
        },
        remove: (e) => {
          const t = e.parentNode;
          t && t.removeChild(e);
        },
        createElement: (e, t, n, r) => {
          const s = t === "svg" ? We.createElementNS(mc, e) : t === "mathml" ? We.createElementNS(yc, e) : n ? We.createElement(e, {
            is: n
          }) : We.createElement(e);
          return e === "select" && r && r.multiple != null && s.setAttribute("multiple", r.multiple), s;
        },
        createText: (e) => We.createTextNode(e),
        createComment: (e) => We.createComment(e),
        setText: (e, t) => {
          e.nodeValue = t;
        },
        setElementText: (e, t) => {
          e.textContent = t;
        },
        parentNode: (e) => e.parentNode,
        nextSibling: (e) => e.nextSibling,
        querySelector: (e) => We.querySelector(e),
        setScopeId(e, t) {
          e.setAttribute(t, "");
        },
        insertStaticContent(e, t, n, r, s, i) {
          const o = n ? n.previousSibling : t.lastChild;
          if (s && (s === i || s.nextSibling)) for (; t.insertBefore(s.cloneNode(true), n), !(s === i || !(s = s.nextSibling)); ) ;
          else {
            Zr.innerHTML = hi(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
            const c = Zr.content;
            if (r === "svg" || r === "mathml") {
              const a = c.firstChild;
              for (; a.firstChild; ) c.appendChild(a.firstChild);
              c.removeChild(a);
            }
            t.insertBefore(c, n);
          }
          return [
            o ? o.nextSibling : t.firstChild,
            n ? n.previousSibling : t.lastChild
          ];
        }
      }, xc = Symbol("_vtc");
      function Sc(e, t, n) {
        const r = e[xc];
        r && (t = (t ? [
          t,
          ...r
        ] : [
          ...r
        ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
      }
      const es = Symbol("_vod"), Cc = Symbol("_vsh"), Ec = Symbol(""), Tc = /(^|;)\s*display\s*:/;
      function Pc(e, t, n) {
        const r = e.style, s = re(n);
        let i = false;
        if (n && !s) {
          if (t) if (re(t)) for (const o of t.split(";")) {
            const c = o.slice(0, o.indexOf(":")).trim();
            n[c] == null && ln(r, c, "");
          }
          else for (const o in t) n[o] == null && ln(r, o, "");
          for (const o in n) o === "display" && (i = true), ln(r, o, n[o]);
        } else if (s) {
          if (t !== n) {
            const o = r[Ec];
            o && (n += ";" + o), r.cssText = n, i = Tc.test(n);
          }
        } else t && e.removeAttribute("style");
        es in e && (e[es] = i ? r.display : "", e[Cc] && (r.display = "none"));
      }
      const ts = /\s*!important$/;
      function ln(e, t, n) {
        if (R(n)) n.forEach((r) => ln(e, t, r));
        else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
        else {
          const r = Oc(e, t);
          ts.test(n) ? e.setProperty(ft(r), n.replace(ts, ""), "important") : e[r] = n;
        }
      }
      const ns = [
        "Webkit",
        "Moz",
        "ms"
      ], $n = {};
      function Oc(e, t) {
        const n = $n[t];
        if (n) return n;
        let r = et(t);
        if (r !== "filter" && r in e) return $n[t] = r;
        r = ms(r);
        for (let s = 0; s < ns.length; s++) {
          const i = ns[s] + r;
          if (i in e) return $n[t] = i;
        }
        return t;
      }
      const rs = "http://www.w3.org/1999/xlink";
      function ss(e, t, n, r, s, i = Ri(t)) {
        r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(rs, t.slice(6, t.length)) : e.setAttributeNS(rs, t, n) : n == null || i && !ys(n) ? e.removeAttribute(t) : e.setAttribute(t, i ? "" : ze(n) ? String(n) : n);
      }
      function is(e, t, n, r, s) {
        if (t === "innerHTML" || t === "textContent") {
          n != null && (e[t] = t === "innerHTML" ? hi(n) : n);
          return;
        }
        const i = e.tagName;
        if (t === "value" && i !== "PROGRESS" && !i.includes("-")) {
          const c = i === "OPTION" ? e.getAttribute("value") || "" : e.value, a = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
          (c !== a || !("_value" in e)) && (e.value = a), n == null && e.removeAttribute(t), e._value = n;
          return;
        }
        let o = false;
        if (n === "" || n == null) {
          const c = typeof e[t];
          c === "boolean" ? n = ys(n) : n == null && c === "string" ? (n = "", o = true) : c === "number" && (n = 0, o = true);
        }
        try {
          e[t] = n;
        } catch {
        }
        o && e.removeAttribute(s || t);
      }
      function lt(e, t, n, r) {
        e.addEventListener(t, n, r);
      }
      function Mc(e, t, n, r) {
        e.removeEventListener(t, n, r);
      }
      const os = Symbol("_vei");
      function Ac(e, t, n, r, s = null) {
        const i = e[os] || (e[os] = {}), o = i[t];
        if (r && o) o.value = r;
        else {
          const [c, a] = Rc(t);
          if (r) {
            const u = i[t] = Lc(r, s);
            lt(e, c, u, a);
          } else o && (Mc(e, c, o, a), i[t] = void 0);
        }
      }
      const cs = /(?:Once|Passive|Capture)$/;
      function Rc(e) {
        let t;
        if (cs.test(e)) {
          t = {};
          let r;
          for (; r = e.match(cs); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
        }
        return [
          e[2] === ":" ? e.slice(3) : ft(e.slice(2)),
          t
        ];
      }
      let Kn = 0;
      const Ic = Promise.resolve(), Fc = () => Kn || (Ic.then(() => Kn = 0), Kn = Date.now());
      function Lc(e, t) {
        const n = (r) => {
          if (!r._vts) r._vts = Date.now();
          else if (r._vts <= n.attached) return;
          Be(Dc(r, n.value), t, 5, [
            r
          ]);
        };
        return n.value = e, n.attached = Fc(), n;
      }
      function Dc(e, t) {
        if (R(t)) {
          const n = e.stopImmediatePropagation;
          return e.stopImmediatePropagation = () => {
            n.call(e), e._stopped = true;
          }, t.map((r) => (s) => !s._stopped && r && r(s));
        } else return t;
      }
      const ls = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Vc = (e, t, n, r, s, i) => {
        const o = s === "svg";
        t === "class" ? Sc(e, r, o) : t === "style" ? Pc(e, n, r) : vn(t) ? lr(t) || Ac(e, t, n, r, i) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : Uc(e, t, r, o)) ? (is(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && ss(e, t, r, o, i, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !re(r)) ? is(e, et(t), r, i, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), ss(e, t, r, o));
      };
      function Uc(e, t, n, r) {
        if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && ls(t) && F(n));
        if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
        if (t === "width" || t === "height") {
          const s = e.tagName;
          if (s === "IMG" || s === "VIDEO" || s === "CANVAS" || s === "SOURCE") return false;
        }
        return ls(t) && re(n) ? false : t in e;
      }
      const mn = (e) => {
        const t = e.props["onUpdate:modelValue"] || false;
        return R(t) ? (n) => sn(t, n) : t;
      };
      function zc(e) {
        e.target.composing = true;
      }
      function as(e) {
        const t = e.target;
        t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
      }
      const xt = Symbol("_assign"), Bc = {
        created(e, { modifiers: { lazy: t, trim: n, number: r } }, s) {
          e[xt] = mn(s);
          const i = r || s.props && s.props.type === "number";
          lt(e, t ? "change" : "input", (o) => {
            if (o.target.composing) return;
            let c = e.value;
            n && (c = c.trim()), i && (c = un(c)), e[xt](c);
          }), n && lt(e, "change", () => {
            e.value = e.value.trim();
          }), t || (lt(e, "compositionstart", zc), lt(e, "compositionend", as), lt(e, "change", as));
        },
        mounted(e, { value: t }) {
          e.value = t ?? "";
        },
        beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: s, number: i } }, o) {
          if (e[xt] = mn(o), e.composing) return;
          const c = (i || e.type === "number") && !/^0\d/.test(e.value) ? un(e.value) : e.value, a = t ?? "";
          c !== a && (document.activeElement === e && e.type !== "range" && (r && t === n || s && e.value.trim() === a) || (e.value = a));
        }
      }, jc = {
        deep: true,
        created(e, { value: t, modifiers: { number: n } }, r) {
          const s = xn(t);
          lt(e, "change", () => {
            const i = Array.prototype.filter.call(e.options, (o) => o.selected).map((o) => n ? un(yn(o)) : yn(o));
            e[xt](e.multiple ? s ? new Set(i) : i : i[0]), e._assigning = true, Ns(() => {
              e._assigning = false;
            });
          }), e[xt] = mn(r);
        },
        mounted(e, { value: t }) {
          fs(e, t);
        },
        beforeUpdate(e, t, n) {
          e[xt] = mn(n);
        },
        updated(e, { value: t }) {
          e._assigning || fs(e, t);
        }
      };
      function fs(e, t) {
        const n = e.multiple, r = R(t);
        if (!(n && !r && !xn(t))) {
          for (let s = 0, i = e.options.length; s < i; s++) {
            const o = e.options[s], c = yn(o);
            if (n) if (r) {
              const a = typeof c;
              a === "string" || a === "number" ? o.selected = t.some((u) => String(u) === String(c)) : o.selected = Fi(t, c) > -1;
            } else o.selected = t.has(c);
            else if (En(yn(o), t)) {
              e.selectedIndex !== s && (e.selectedIndex = s);
              return;
            }
          }
          !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
        }
      }
      function yn(e) {
        return "_value" in e ? e._value : e.value;
      }
      const Nc = le({
        patchProp: Vc
      }, vc);
      let _s;
      function qc() {
        return _s || (_s = Wo(Nc));
      }
      const Hc = (...e) => {
        const t = qc().createApp(...e), { mount: n } = t;
        return t.mount = (r) => {
          const s = $c(r);
          if (!s) return;
          const i = t._component;
          !F(i) && !i.render && !i.template && (i.template = s.innerHTML), s.nodeType === 1 && (s.textContent = "");
          const o = n(s, false, Wc(s));
          return s instanceof Element && (s.removeAttribute("v-cloak"), s.setAttribute("data-v-app", "")), o;
        }, t;
      };
      function Wc(e) {
        if (e instanceof SVGElement) return "svg";
        if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
      }
      function $c(e) {
        return re(e) ? document.querySelector(e) : e;
      }
      const Kc = `
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

@group(0) @binding(0) var<uniform> mandelbrot: Uniforms;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;

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
    var max = 100000.0;
    var d = vec2<f32>(1.0, 0.0);
    // create an epsilon var that is smaller when the zoom is bigger
    var epsilon = 0.00001;
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
    return vec2<f32>(i, 0.0);;


//  var x: f32 = 0.0;
//  var y: f32 = 0.0;
//  var iter: f32 = 0;
//  var x2: f32 = 0.0;
//  var y2: f32 = 0.0;
//  var dx: f32 = 0.0;
//  var dy: f32 = 0.0;
//  var w = 0.0;
//  var d: f32 = 1.0;
//  while (x2 + y2 <= 100.0 && iter < mandelbrot.maxIteration) {
//    x = x2 - y2 + x0;
//    y = w - x2 - y2 + y0;
//    x2 = x*x;
//    y2 = y*y;
//    w = (x + y) * (x + y);
//    // compute derivative d
//    d = 2.0 * sqrt(x2 + y2) * d + 1.0;
//    iter += 1.0;
//  }
//  var nu = 0.0;
//  if(x2 + y2 > 100.0) {
//      let log_zn = log(x2 + y2) / 2.0;
//      nu = f32(iter) + 1.0 - log(log_zn / log(2.0)) / log(2.0);
//  }
//  return vec2<f32>(nu, d);
}
fn rotate(x: f32, y: f32, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * x - s * y, s * x + c * y);
}
@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  var xy = rotate((fragCoord.x * 2.0 - 1.0) * mandelbrot.scale * mandelbrot.aspect, (fragCoord.y * 2.0 - 1.0) * mandelbrot.scale, mandelbrot.angle);
  let x0 = xy.x + mandelbrot.cx;
  let y0 = xy.y + mandelbrot.cy;
//     var coord = fragCoord;
//      // scale the coord with zoom
//      coord = coord * mandelbrot.zoom;
  var dc = vec2<f32>(
       xy.x,
       xy.y
  );
  let res = mandelbrot_func(dc.x, dc.y);
  return vec4<f32>(res.x, res.y, 0.0, 1.0);
}











`, Gc = `struct Uniforms {
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
  let blurSamples = 8; // Nombre d'\xE9chantillons pour le blur
  var color = vec3<f32>(0.0, 0.0, 0.0);
  let glowColor = vec3<f32>(0.2, 0.4, 1.0);
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
      let glow = exp(-d * 0.1);
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
}`, kc = "/assets/mandelbrot_bg-Y7XQRtnM.wasm", Yc = async (e = {}, t) => {
        let n;
        if (t.startsWith("data:")) {
          const r = t.replace(/^data:.*?base64,/, "");
          let s;
          if (typeof Buffer == "function" && typeof Buffer.from == "function") s = Buffer.from(r, "base64");
          else if (typeof atob == "function") {
            const i = atob(r);
            s = new Uint8Array(i.length);
            for (let o = 0; o < i.length; o++) s[o] = i.charCodeAt(o);
          } else throw new Error("Cannot decode base64-encoded data URL");
          n = await WebAssembly.instantiate(s, e);
        } else {
          const r = await fetch(t), s = r.headers.get("Content-Type") || "";
          if ("instantiateStreaming" in WebAssembly && s.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(r, e);
          else {
            const i = await r.arrayBuffer();
            n = await WebAssembly.instantiate(i, e);
          }
        }
        return n.instance.exports;
      };
      let M;
      function Xc(e) {
        M = e;
      }
      function ae(e) {
        return e == null;
      }
      function oe(e) {
        const t = M.__externref_table_alloc();
        return M.__wbindgen_export_1.set(t, e), t;
      }
      let tn = null;
      function an() {
        return (tn === null || tn.byteLength === 0) && (tn = new Uint8Array(M.memory.buffer)), tn;
      }
      const wi = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
      let fn = new wi("utf-8", {
        ignoreBOM: true,
        fatal: true
      });
      fn.decode();
      const Jc = 2146435072;
      let Gn = 0;
      function Qc(e, t) {
        return Gn += t, Gn >= Jc && (fn = new wi("utf-8", {
          ignoreBOM: true,
          fatal: true
        }), fn.decode(), Gn = t), fn.decode(an().subarray(e, e + t));
      }
      function J(e, t) {
        return e = e >>> 0, Qc(e, t);
      }
      function L(e, t) {
        try {
          return e.apply(this, t);
        } catch (n) {
          const r = oe(n);
          M.__wbindgen_exn_store(r);
        }
      }
      let he = 0;
      const Zc = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder, _n = new Zc("utf-8"), el = typeof _n.encodeInto == "function" ? function(e, t) {
        return _n.encodeInto(e, t);
      } : function(e, t) {
        const n = _n.encode(e);
        return t.set(n), {
          read: e.length,
          written: n.length
        };
      };
      function Ee(e, t, n) {
        if (n === void 0) {
          const c = _n.encode(e), a = t(c.length, 1) >>> 0;
          return an().subarray(a, a + c.length).set(c), he = c.length, a;
        }
        let r = e.length, s = t(r, 1) >>> 0;
        const i = an();
        let o = 0;
        for (; o < r; o++) {
          const c = e.charCodeAt(o);
          if (c > 127) break;
          i[s + o] = c;
        }
        if (o !== r) {
          o !== 0 && (e = e.slice(o)), s = n(s, r, r = o + e.length * 3, 1) >>> 0;
          const c = an().subarray(s + o, s + r), a = el(e, c);
          o += a.written, s = n(s, r, o, 1) >>> 0;
        }
        return he = o, s;
      }
      let gt = null;
      function ee() {
        return (gt === null || gt.buffer.detached === true || gt.buffer.detached === void 0 && gt.buffer !== M.memory.buffer) && (gt = new DataView(M.memory.buffer)), gt;
      }
      const us = typeof FinalizationRegistry > "u" ? {
        register: () => {
        },
        unregister: () => {
        }
      } : new FinalizationRegistry((e) => {
        M.__wbindgen_export_6.get(e.dtor)(e.a, e.b);
      });
      function je(e, t, n, r) {
        const s = {
          a: e,
          b: t,
          cnt: 1,
          dtor: n
        }, i = (...o) => {
          s.cnt++;
          const c = s.a;
          s.a = 0;
          try {
            return r(c, s.b, ...o);
          } finally {
            --s.cnt === 0 ? (M.__wbindgen_export_6.get(s.dtor)(c, s.b), us.unregister(s)) : s.a = c;
          }
        };
        return i.original = s, us.register(i, s, s), i;
      }
      function or(e) {
        const t = typeof e;
        if (t == "number" || t == "boolean" || e == null) return `${e}`;
        if (t == "string") return `"${e}"`;
        if (t == "symbol") {
          const s = e.description;
          return s == null ? "Symbol" : `Symbol(${s})`;
        }
        if (t == "function") {
          const s = e.name;
          return typeof s == "string" && s.length > 0 ? `Function(${s})` : "Function";
        }
        if (Array.isArray(e)) {
          const s = e.length;
          let i = "[";
          s > 0 && (i += or(e[0]));
          for (let o = 1; o < s; o++) i += ", " + or(e[o]);
          return i += "]", i;
        }
        const n = /\[object ([^\]]+)\]/.exec(toString.call(e));
        let r;
        if (n && n.length > 1) r = n[1];
        else return toString.call(e);
        if (r == "Object") try {
          return "Object(" + JSON.stringify(e) + ")";
        } catch {
          return "Object";
        }
        return e instanceof Error ? `${e.name}: ${e.message}
${e.stack}` : r;
      }
      function tl(e, t) {
        e = e >>> 0;
        const n = ee(), r = [];
        for (let s = e; s < e + 4 * t; s += 4) r.push(M.__wbindgen_export_1.get(n.getUint32(s, true)));
        return M.__externref_drop_slice(e, t), r;
      }
      function nl(e, t, n) {
        const r = M.mandelbrot(e, t, n);
        var s = tl(r[0], r[1]).slice();
        return M.__wbindgen_free(r[0], r[1] * 4, 4), s;
      }
      function _t(e, t, n) {
        M.closure441_externref_shim(e, t, n);
      }
      function rl(e, t) {
        M.wasm_bindgen__convert__closures_____invoke__he0c36f5f951d360f(e, t);
      }
      function sl(e, t, n, r) {
        M.closure442_externref_shim(e, t, n, r);
      }
      function il(e, t, n) {
        M.closure489_externref_shim(e, t, n);
      }
      const ol = [
        "opaque",
        "premultiplied"
      ], Pr = [
        "load",
        "clear"
      ], cl = [
        "low-power",
        "high-performance"
      ], Or = [
        "store",
        "discard"
      ], ll = [
        "all",
        "stencil-only",
        "depth-only"
      ], Mr = [
        "r8unorm",
        "r8snorm",
        "r8uint",
        "r8sint",
        "r16uint",
        "r16sint",
        "r16float",
        "rg8unorm",
        "rg8snorm",
        "rg8uint",
        "rg8sint",
        "r32uint",
        "r32sint",
        "r32float",
        "rg16uint",
        "rg16sint",
        "rg16float",
        "rgba8unorm",
        "rgba8unorm-srgb",
        "rgba8snorm",
        "rgba8uint",
        "rgba8sint",
        "bgra8unorm",
        "bgra8unorm-srgb",
        "rgb9e5ufloat",
        "rgb10a2uint",
        "rgb10a2unorm",
        "rg11b10ufloat",
        "rg32uint",
        "rg32sint",
        "rg32float",
        "rgba16uint",
        "rgba16sint",
        "rgba16float",
        "rgba32uint",
        "rgba32sint",
        "rgba32float",
        "stencil8",
        "depth16unorm",
        "depth24plus",
        "depth24plus-stencil8",
        "depth32float",
        "depth32float-stencil8",
        "bc1-rgba-unorm",
        "bc1-rgba-unorm-srgb",
        "bc2-rgba-unorm",
        "bc2-rgba-unorm-srgb",
        "bc3-rgba-unorm",
        "bc3-rgba-unorm-srgb",
        "bc4-r-unorm",
        "bc4-r-snorm",
        "bc5-rg-unorm",
        "bc5-rg-snorm",
        "bc6h-rgb-ufloat",
        "bc6h-rgb-float",
        "bc7-rgba-unorm",
        "bc7-rgba-unorm-srgb",
        "etc2-rgb8unorm",
        "etc2-rgb8unorm-srgb",
        "etc2-rgb8a1unorm",
        "etc2-rgb8a1unorm-srgb",
        "etc2-rgba8unorm",
        "etc2-rgba8unorm-srgb",
        "eac-r11unorm",
        "eac-r11snorm",
        "eac-rg11unorm",
        "eac-rg11snorm",
        "astc-4x4-unorm",
        "astc-4x4-unorm-srgb",
        "astc-5x4-unorm",
        "astc-5x4-unorm-srgb",
        "astc-5x5-unorm",
        "astc-5x5-unorm-srgb",
        "astc-6x5-unorm",
        "astc-6x5-unorm-srgb",
        "astc-6x6-unorm",
        "astc-6x6-unorm-srgb",
        "astc-8x5-unorm",
        "astc-8x5-unorm-srgb",
        "astc-8x6-unorm",
        "astc-8x6-unorm-srgb",
        "astc-8x8-unorm",
        "astc-8x8-unorm-srgb",
        "astc-10x5-unorm",
        "astc-10x5-unorm-srgb",
        "astc-10x6-unorm",
        "astc-10x6-unorm-srgb",
        "astc-10x8-unorm",
        "astc-10x8-unorm-srgb",
        "astc-10x10-unorm",
        "astc-10x10-unorm-srgb",
        "astc-12x10-unorm",
        "astc-12x10-unorm-srgb",
        "astc-12x12-unorm",
        "astc-12x12-unorm-srgb"
      ], al = [
        "1d",
        "2d",
        "2d-array",
        "cube",
        "cube-array",
        "3d"
      ], fl = [
        "border-box",
        "content-box",
        "device-pixel-content-box"
      ], _l = [
        "hidden",
        "visible"
      ], ds = typeof FinalizationRegistry > "u" ? {
        register: () => {
        },
        unregister: () => {
        }
      } : new FinalizationRegistry((e) => M.__wbg_mandelbrotstep_free(e >>> 0, 1));
      class Ar {
        static __wrap(t) {
          t = t >>> 0;
          const n = Object.create(Ar.prototype);
          return n.__wbg_ptr = t, ds.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
          const t = this.__wbg_ptr;
          return this.__wbg_ptr = 0, ds.unregister(this), t;
        }
        free() {
          const t = this.__destroy_into_raw();
          M.__wbg_mandelbrotstep_free(t, 0);
        }
        get zx() {
          return M.__wbg_get_mandelbrotstep_zx(this.__wbg_ptr);
        }
        set zx(t) {
          M.__wbg_set_mandelbrotstep_zx(this.__wbg_ptr, t);
        }
        get zy() {
          return M.__wbg_get_mandelbrotstep_zy(this.__wbg_ptr);
        }
        set zy(t) {
          M.__wbg_set_mandelbrotstep_zy(this.__wbg_ptr, t);
        }
        get dx() {
          return M.__wbg_get_mandelbrotstep_dx(this.__wbg_ptr);
        }
        set dx(t) {
          M.__wbg_set_mandelbrotstep_dx(this.__wbg_ptr, t);
        }
        get dy() {
          return M.__wbg_get_mandelbrotstep_dy(this.__wbg_ptr);
        }
        set dy(t) {
          M.__wbg_set_mandelbrotstep_dy(this.__wbg_ptr, t);
        }
      }
      function ul(e) {
        return e.Window;
      }
      function dl(e) {
        return e.Window;
      }
      function bl(e) {
        return e.WorkerGlobalScope;
      }
      function gl(e) {
        e.abort();
      }
      function pl(e) {
        const t = e.activeElement;
        return ae(t) ? 0 : oe(t);
      }
      function hl() {
        return L(function(e, t, n, r) {
          e.addEventListener(J(t, n), r);
        }, arguments);
      }
      function wl() {
        return L(function(e, t) {
          e.addListener(t);
        }, arguments);
      }
      function ml(e) {
        return e.altKey;
      }
      function yl(e) {
        return e.altKey;
      }
      function vl(e, t, n) {
        return e.animate(t, n);
      }
      function xl() {
        return L(function(e, t) {
          return e.appendChild(t);
        }, arguments);
      }
      function Sl() {
        return L(function(e, t) {
          return e.beginRenderPass(t);
        }, arguments);
      }
      function Cl(e) {
        return e.blockSize;
      }
      function El(e) {
        const t = e.body;
        return ae(t) ? 0 : oe(t);
      }
      function Tl(e, t) {
        const n = t.brand, r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
        ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
      }
      function Pl(e) {
        return e.brands;
      }
      function Ol(e) {
        return e.button;
      }
      function Ml(e) {
        return e.buttons;
      }
      function Al() {
        return L(function(e, t) {
          return e.call(t);
        }, arguments);
      }
      function Rl() {
        return L(function(e, t) {
          e.cancelAnimationFrame(t);
        }, arguments);
      }
      function Il(e, t) {
        e.cancelIdleCallback(t >>> 0);
      }
      function Fl(e) {
        e.cancel();
      }
      function Ll(e, t) {
        return e.catch(t);
      }
      function Dl(e, t) {
        e.clearTimeout(t);
      }
      function Vl(e) {
        e.close();
      }
      function Ul(e, t) {
        const n = t.code, r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
        ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
      }
      function zl() {
        return L(function(e, t) {
          e.configure(t);
        }, arguments);
      }
      function Bl(e, t) {
        return e.contains(t);
      }
      function jl(e) {
        return e.contentRect;
      }
      function Nl(e, t) {
        return e.createCommandEncoder(t);
      }
      function ql() {
        return L(function(e, t, n) {
          return e.createElement(J(t, n));
        }, arguments);
      }
      function Hl() {
        return L(function(e, t) {
          const n = URL.createObjectURL(t), r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
          ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
        }, arguments);
      }
      function Wl() {
        return L(function(e, t) {
          return e.createView(t);
        }, arguments);
      }
      function $l(e) {
        return e.ctrlKey;
      }
      function Kl(e) {
        return e.ctrlKey;
      }
      function Gl(e) {
        console.debug(e);
      }
      function kl(e) {
        return e.deltaMode;
      }
      function Yl(e) {
        return e.deltaX;
      }
      function Xl(e) {
        return e.deltaY;
      }
      function Jl(e) {
        return e.devicePixelContentBoxSize;
      }
      function Ql(e) {
        return e.devicePixelRatio;
      }
      function Zl(e) {
        e.disconnect();
      }
      function ea(e) {
        e.disconnect();
      }
      function ta(e) {
        const t = e.document;
        return ae(t) ? 0 : oe(t);
      }
      function na(e) {
        e.end();
      }
      function ra(e, t) {
        console.error(e, t);
      }
      function sa(e) {
        console.error(e);
      }
      function ia(e, t) {
        let n, r;
        try {
          n = e, r = t, console.error(J(e, t));
        } finally {
          M.__wbindgen_free(n, r, 1);
        }
      }
      function oa(e) {
        return e.finish();
      }
      function ca(e, t) {
        return e.finish(t);
      }
      function la() {
        return L(function(e) {
          e.focus();
        }, arguments);
      }
      function aa(e) {
        const t = e.fullscreenElement;
        return ae(t) ? 0 : oe(t);
      }
      function fa(e) {
        return e.getCoalescedEvents;
      }
      function _a(e) {
        return e.getCoalescedEvents();
      }
      function ua() {
        return L(function(e, t) {
          const n = e.getComputedStyle(t);
          return ae(n) ? 0 : oe(n);
        }, arguments);
      }
      function da() {
        return L(function(e, t, n) {
          const r = e.getContext(J(t, n));
          return ae(r) ? 0 : oe(r);
        }, arguments);
      }
      function ba() {
        return L(function(e, t, n) {
          const r = e.getContext(J(t, n));
          return ae(r) ? 0 : oe(r);
        }, arguments);
      }
      function ga() {
        return L(function(e) {
          return e.getCurrentTexture();
        }, arguments);
      }
      function pa(e, t, n) {
        const r = e.getElementById(J(t, n));
        return ae(r) ? 0 : oe(r);
      }
      function ha(e, t) {
        return Object.getOwnPropertyDescriptor(e, t);
      }
      function wa(e) {
        const t = e.getPreferredCanvasFormat();
        return (Mr.indexOf(t) + 1 || 96) - 1;
      }
      function ma() {
        return L(function(e, t, n, r) {
          const s = t.getPropertyValue(J(n, r)), i = Ee(s, M.__wbindgen_malloc, M.__wbindgen_realloc), o = he;
          ee().setInt32(e + 4, o, true), ee().setInt32(e + 0, i, true);
        }, arguments);
      }
      function ya(e, t) {
        const n = e[t >>> 0];
        return ae(n) ? 0 : oe(n);
      }
      function va(e, t) {
        return e[t >>> 0];
      }
      function xa(e) {
        return e.gpu;
      }
      function Sa(e) {
        return e.height;
      }
      function Ca(e) {
        console.info(e);
      }
      function Ea(e) {
        return e.inlineSize;
      }
      function Ta(e) {
        let t;
        try {
          t = e instanceof GPUAdapter;
        } catch {
          t = false;
        }
        return t;
      }
      function Pa(e) {
        let t;
        try {
          t = e instanceof GPUCanvasContext;
        } catch {
          t = false;
        }
        return t;
      }
      function Oa(e) {
        let t;
        try {
          t = e instanceof Window;
        } catch {
          t = false;
        }
        return t;
      }
      function Ma(e) {
        return e.isIntersecting;
      }
      function Aa(e, t) {
        return Object.is(e, t);
      }
      function Ra(e, t) {
        const n = t.key, r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
        ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
      }
      function Ia(e, t) {
        const n = t.label, r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
        ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
      }
      function Fa(e) {
        return e.length;
      }
      function La(e) {
        return e.location;
      }
      function Da(e) {
        console.log(e);
      }
      function Va(e) {
        return Ar.__wrap(e);
      }
      function Ua() {
        return L(function(e, t, n) {
          const r = e.matchMedia(J(t, n));
          return ae(r) ? 0 : oe(r);
        }, arguments);
      }
      function za(e) {
        return e.matches;
      }
      function Ba(e, t) {
        const n = t.media, r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
        ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
      }
      function ja(e) {
        return e.metaKey;
      }
      function Na(e) {
        return e.metaKey;
      }
      function qa(e) {
        return e.movementX;
      }
      function Ha(e) {
        return e.movementY;
      }
      function Wa(e) {
        return e.navigator;
      }
      function $a(e) {
        return e.navigator;
      }
      function Ka() {
        return new Object();
      }
      function Ga() {
        return L(function() {
          return new AbortController();
        }, arguments);
      }
      function ka() {
        return L(function(e, t) {
          return new Worker(J(e, t));
        }, arguments);
      }
      function Ya() {
        return new Array();
      }
      function Xa() {
        return L(function(e) {
          return new IntersectionObserver(e);
        }, arguments);
      }
      function Ja() {
        return L(function(e) {
          return new ResizeObserver(e);
        }, arguments);
      }
      function Qa() {
        return new Error();
      }
      function Za() {
        return L(function() {
          return new MessageChannel();
        }, arguments);
      }
      function ef(e, t) {
        return new Function(J(e, t));
      }
      function tf() {
        return L(function(e, t) {
          return new Blob(e, t);
        }, arguments);
      }
      function nf(e) {
        return e.now();
      }
      function rf(e, t) {
        e.observe(t);
      }
      function sf(e, t, n) {
        e.observe(t, n);
      }
      function of(e, t) {
        e.observe(t);
      }
      function cf(e) {
        return Array.of(e);
      }
      function lf(e, t) {
        return Array.of(e, t);
      }
      function af(e) {
        return e.offsetX;
      }
      function ff(e) {
        return e.offsetY;
      }
      function _f(e) {
        return e.performance;
      }
      function uf(e) {
        return e.persisted;
      }
      function df(e) {
        e.play();
      }
      function bf(e) {
        return e.pointerId;
      }
      function gf(e, t) {
        const n = t.pointerType, r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
        ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
      }
      function pf(e) {
        return e.port1;
      }
      function hf(e) {
        return e.port2;
      }
      function wf() {
        return L(function(e, t) {
          e.postMessage(t);
        }, arguments);
      }
      function mf() {
        return L(function(e, t, n) {
          e.postMessage(t, n);
        }, arguments);
      }
      function yf(e, t, n) {
        return e.postTask(t, n);
      }
      function vf(e) {
        return e.pressure;
      }
      function xf(e) {
        e.preventDefault();
      }
      function Sf() {
        return ResizeObserverEntry.prototype;
      }
      function Cf(e, t) {
        return e.push(t);
      }
      function Ef() {
        return L(function(e, t, n) {
          return e.querySelectorAll(J(t, n));
        }, arguments);
      }
      function Tf(e) {
        queueMicrotask(e);
      }
      function Pf(e, t) {
        e.queueMicrotask(t);
      }
      function Of(e) {
        return e.queueMicrotask;
      }
      function Mf(e) {
        return e.queue;
      }
      function Af() {
        return L(function(e, t, n, r) {
          e.removeEventListener(J(t, n), r);
        }, arguments);
      }
      function Rf() {
        return L(function(e, t) {
          e.removeListener(t);
        }, arguments);
      }
      function If() {
        return L(function(e, t, n, r) {
          const s = t.removeProperty(J(n, r)), i = Ee(s, M.__wbindgen_malloc, M.__wbindgen_realloc), o = he;
          ee().setInt32(e + 4, o, true), ee().setInt32(e + 0, i, true);
        }, arguments);
      }
      function Ff(e) {
        return e.repeat;
      }
      function Lf(e, t) {
        return e.requestAdapter(t);
      }
      function Df() {
        return L(function(e, t) {
          return e.requestAnimationFrame(t);
        }, arguments);
      }
      function Vf(e, t) {
        return e.requestDevice(t);
      }
      function Uf(e) {
        return e.requestFullscreen;
      }
      function zf(e) {
        return e.requestFullscreen();
      }
      function Bf(e) {
        return e.requestIdleCallback;
      }
      function jf() {
        return L(function(e, t) {
          return e.requestIdleCallback(t);
        }, arguments);
      }
      function Nf(e) {
        return Promise.resolve(e);
      }
      function qf() {
        return L(function(e, t) {
          URL.revokeObjectURL(J(e, t));
        }, arguments);
      }
      function Hf(e) {
        return e.scheduler;
      }
      function Wf(e) {
        return e.scheduler;
      }
      function $f() {
        return L(function(e, t, n, r, s) {
          e.setAttribute(J(t, n), J(r, s));
        }, arguments);
      }
      function Kf() {
        return L(function(e, t) {
          e.setPointerCapture(t);
        }, arguments);
      }
      function Gf() {
        return L(function(e, t, n, r, s) {
          e.setProperty(J(t, n), J(r, s));
        }, arguments);
      }
      function kf() {
        return L(function(e, t) {
          return e.setTimeout(t);
        }, arguments);
      }
      function Yf() {
        return L(function(e, t, n) {
          return e.setTimeout(t, n);
        }, arguments);
      }
      function Xf() {
        return L(function(e, t, n) {
          return Reflect.set(e, t, n);
        }, arguments);
      }
      function Jf(e, t) {
        e.a = t;
      }
      function Qf(e, t) {
        e.alphaMode = ol[t];
      }
      function Zf(e, t) {
        e.arrayLayerCount = t >>> 0;
      }
      function e_(e, t) {
        e.aspect = ll[t];
      }
      function t_(e, t) {
        e.b = t;
      }
      function n_(e, t) {
        e.baseArrayLayer = t >>> 0;
      }
      function r_(e, t) {
        e.baseMipLevel = t >>> 0;
      }
      function s_(e, t) {
        e.beginningOfPassWriteIndex = t >>> 0;
      }
      function i_(e, t) {
        e.box = fl[t];
      }
      function o_(e, t) {
        e.clearValue = t;
      }
      function c_(e, t) {
        e.colorAttachments = t;
      }
      function l_(e, t) {
        e.depthClearValue = t;
      }
      function a_(e, t) {
        e.depthLoadOp = Pr[t];
      }
      function f_(e, t) {
        e.depthReadOnly = t !== 0;
      }
      function __(e, t) {
        e.depthStencilAttachment = t;
      }
      function u_(e, t) {
        e.depthStoreOp = Or[t];
      }
      function d_(e, t) {
        e.device = t;
      }
      function b_(e, t) {
        e.dimension = al[t];
      }
      function g_(e, t) {
        e.endOfPassWriteIndex = t >>> 0;
      }
      function p_(e, t) {
        e.format = Mr[t];
      }
      function h_(e, t) {
        e.format = Mr[t];
      }
      function w_(e, t) {
        e.g = t;
      }
      function m_(e, t) {
        e.height = t >>> 0;
      }
      function y_(e, t) {
        e.height = t >>> 0;
      }
      function v_(e, t, n) {
        e.label = J(t, n);
      }
      function x_(e, t, n) {
        e.label = J(t, n);
      }
      function S_(e, t, n) {
        e.label = J(t, n);
      }
      function C_(e, t, n) {
        e.label = J(t, n);
      }
      function E_(e, t, n) {
        e.label = J(t, n);
      }
      function T_(e, t) {
        e.loadOp = Pr[t];
      }
      function P_(e, t) {
        e.mipLevelCount = t >>> 0;
      }
      function O_(e, t) {
        e.onmessage = t;
      }
      function M_(e, t) {
        e.powerPreference = cl[t];
      }
      function A_(e, t) {
        e.querySet = t;
      }
      function R_(e, t) {
        e.r = t;
      }
      function I_(e, t) {
        e.requiredFeatures = t;
      }
      function F_(e, t) {
        e.resolveTarget = t;
      }
      function L_(e, t) {
        e.stencilClearValue = t >>> 0;
      }
      function D_(e, t) {
        e.stencilLoadOp = Pr[t];
      }
      function V_(e, t) {
        e.stencilReadOnly = t !== 0;
      }
      function U_(e, t) {
        e.stencilStoreOp = Or[t];
      }
      function z_(e, t) {
        e.storeOp = Or[t];
      }
      function B_(e, t) {
        e.timestampWrites = t;
      }
      function j_(e, t, n) {
        e.type = J(t, n);
      }
      function N_(e, t) {
        e.usage = t >>> 0;
      }
      function q_(e, t) {
        e.usage = t >>> 0;
      }
      function H_(e, t) {
        e.view = t;
      }
      function W_(e, t) {
        e.view = t;
      }
      function $_(e, t) {
        e.viewFormats = t;
      }
      function K_(e, t) {
        e.width = t >>> 0;
      }
      function G_(e, t) {
        e.width = t >>> 0;
      }
      function k_(e) {
        return e.shiftKey;
      }
      function Y_(e) {
        return e.shiftKey;
      }
      function X_(e) {
        return e.signal;
      }
      function J_(e, t) {
        const n = t.stack, r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
        ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
      }
      function Q_(e) {
        e.start();
      }
      function Z_() {
        const e = typeof global > "u" ? null : global;
        return ae(e) ? 0 : oe(e);
      }
      function eu() {
        const e = typeof globalThis > "u" ? null : globalThis;
        return ae(e) ? 0 : oe(e);
      }
      function tu() {
        const e = typeof self > "u" ? null : self;
        return ae(e) ? 0 : oe(e);
      }
      function nu() {
        const e = typeof window > "u" ? null : window;
        return ae(e) ? 0 : oe(e);
      }
      function ru(e) {
        return e.style;
      }
      function su(e, t) {
        e.submit(t);
      }
      function iu(e, t, n) {
        return e.then(t, n);
      }
      function ou(e, t) {
        return e.then(t);
      }
      function cu(e, t) {
        e.unobserve(t);
      }
      function lu(e) {
        const t = e.userAgentData;
        return ae(t) ? 0 : oe(t);
      }
      function au() {
        return L(function(e, t) {
          const n = t.userAgent, r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
          ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
        }, arguments);
      }
      function fu(e) {
        const t = e.visibilityState;
        return (_l.indexOf(t) + 1 || 3) - 1;
      }
      function _u(e) {
        console.warn(e);
      }
      function uu(e) {
        const t = e.webkitFullscreenElement;
        return ae(t) ? 0 : oe(t);
      }
      function du(e) {
        e.webkitRequestFullscreen();
      }
      function bu(e) {
        return e.width;
      }
      function gu(e) {
        const t = e.original;
        return t.cnt-- == 1 ? (t.a = 0, true) : false;
      }
      function pu(e, t, n) {
        return je(e, t, 307, _t);
      }
      function hu(e, t, n) {
        return je(e, t, 307, _t);
      }
      function wu(e, t, n) {
        return je(e, t, 307, rl);
      }
      function mu(e, t, n) {
        return je(e, t, 307, _t);
      }
      function yu(e, t, n) {
        return je(e, t, 307, _t);
      }
      function vu(e, t, n) {
        return je(e, t, 307, _t);
      }
      function xu(e, t, n) {
        return je(e, t, 307, sl);
      }
      function Su(e, t, n) {
        return je(e, t, 307, _t);
      }
      function Cu(e, t, n) {
        return je(e, t, 307, _t);
      }
      function Eu(e, t, n) {
        return je(e, t, 488, il);
      }
      function Tu(e, t) {
        const n = or(t), r = Ee(n, M.__wbindgen_malloc, M.__wbindgen_realloc), s = he;
        ee().setInt32(e + 4, s, true), ee().setInt32(e + 0, r, true);
      }
      function Pu() {
        const e = M.__wbindgen_export_1, t = e.grow(4);
        e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
      }
      function Ou(e) {
        return typeof e == "function";
      }
      function Mu(e) {
        return e === null;
      }
      function Au(e) {
        return e === void 0;
      }
      function Ru(e) {
        return e;
      }
      function Iu(e, t) {
        return J(e, t);
      }
      function Fu(e, t) {
        throw new Error(J(e, t));
      }
      URL = globalThis.URL;
      const Q = await Yc({
        "./mandelbrot_bg.js": {
          __wbg_mandelbrotstep_new: Va,
          __wbg_new_8a6f238a6ece86ea: Qa,
          __wbg_stack_0ed75d68575b0f3c: J_,
          __wbg_error_7534b8e9a36f1ab4: ia,
          __wbindgen_string_new: Iu,
          __wbg_queue_39d4f3bda761adef: Mf,
          __wbg_instanceof_GpuAdapter_fb230cdccb184887: Ta,
          __wbg_instanceof_GpuCanvasContext_48ec5330c4425d84: Pa,
          __wbg_Window_a4c5a48392f234ba: ul,
          __wbindgen_is_undefined: Au,
          __wbg_gpu_a6bce2913fb8f574: xa,
          __wbg_WorkerGlobalScope_2b2b89e1ac952b50: bl,
          __wbg_setpowerpreference_229fffedb859fda8: M_,
          __wbg_requestAdapter_55d15e6d14e8392c: Lf,
          __wbindgen_number_new: Ru,
          __wbg_setrequiredfeatures_8135f6ab89e06b58: I_,
          __wbg_setlabel_a3e682ef8c10c947: C_,
          __wbg_requestDevice_66e864eaf1ffbb38: Vf,
          __wbg_setlabel_53b47ffdebccf638: v_,
          __wbg_createCommandEncoder_f8056019328bd192: Nl,
          __wbg_submit_068b03683463d934: su,
          __wbg_setdimension_8523a7df804e7839: b_,
          __wbg_setformat_726ed8f81a287fdc: h_,
          __wbg_setaspect_4066a62e6528c589: e_,
          __wbg_setbasearraylayer_85c4780859e3e025: n_,
          __wbg_setarraylayercount_3a8ad1adab3aded1: Zf,
          __wbg_setbasemiplevel_f90525112a282a1d: r_,
          __wbg_setmiplevelcount_9de96fe0db85420d: P_,
          __wbg_setlabel_95bae3d54f33d3c6: x_,
          __wbg_setusage_8a5ac4564d826d9d: q_,
          __wbg_setcolorattachments_6118b962baa6088d: c_,
          __wbg_setlabel_d5ff85faa53a8c67: E_,
          __wbg_setview_2ae2d88e6d071b88: H_,
          __wbg_setdepthclearvalue_e09b29c35f439d38: l_,
          __wbg_setdepthloadop_5292e3e4542c7770: a_,
          __wbg_setdepthstoreop_a7eddf1211b8cf40: u_,
          __wbg_setdepthreadonly_8e4aa6065b3f0cb1: f_,
          __wbg_setstencilclearvalue_1580738072a672c0: L_,
          __wbg_setstencilloadop_8486231257ee81bf: D_,
          __wbg_setstencilstoreop_39fcdf3cc001e427: U_,
          __wbg_setstencilreadonly_3f415ad876ffa592: V_,
          __wbg_setdepthstencilattachment_ef75a68ffe787e5a: __,
          __wbg_setqueryset_1f0efa5a49a1b2ad: A_,
          __wbg_setbeginningofpasswriteindex_c8a62bc66645f5cd: s_,
          __wbg_setendofpasswriteindex_7e0b2037985d92b3: g_,
          __wbg_settimestampwrites_9c3e9dd8a3e800a1: B_,
          __wbg_setlabel_a1c8caea9f6c17d7: S_,
          __wbg_finish_ab9e01a922269f3a: ca,
          __wbg_finish_17a0b297901010d5: oa,
          __wbg_end_b9d7079f54620f76: na,
          __wbg_setusage_7ffa4257ea250d02: N_,
          __wbg_setalphamode_1192a40e9bd8c3aa: Qf,
          __wbg_setviewformats_e21a9630b45aff68: $_,
          __wbg_configure_bced8e40e8dbaaa0: zl,
          __wbg_getPreferredCanvasFormat_9aef34efead2aa08: wa,
          __wbg_setdevice_44b06c4615b5e253: d_,
          __wbg_setformat_71f884d31aabe541: p_,
          __wbg_label_cda985b32d44cee0: Ia,
          __wbg_beginRenderPass_2bc62f5f78642ee0: Sl,
          __wbg_setloadop_15883d29f266b084: T_,
          __wbg_setstoreop_0e46dbc6c9712fbb: z_,
          __wbg_setview_5db167adcc0d1b9c: W_,
          __wbg_setclearvalue_1d26e1b07873908a: o_,
          __wbg_setresolvetarget_95ee5e55e47822ff: F_,
          __wbg_createView_0ce5c82d78f482df: Wl,
          __wbg_seta_add312ccdfbfaa2d: Jf,
          __wbg_setb_162f487856c3bad9: t_,
          __wbg_setg_d7b95d11c12af1cb: w_,
          __wbg_setr_6ad5c6f67a5f5a57: R_,
          __wbg_getCurrentTexture_d64323b76f42d5e0: ga,
          __wbindgen_is_null: Mu,
          __wbindgen_cb_drop: gu,
          __wbg_prototype_c28bca39c45aba9b: Sf,
          __wbg_Window_d1bf622f71ff0629: dl,
          __wbg_scheduler_48482a9974eeacbd: Hf,
          __wbg_scheduler_5156bb61cc1cf589: Wf,
          __wbg_requestIdleCallback_1b8d644ff564208f: Bf,
          __wbg_postTask_41d93e93941e4a3d: yf,
          __wbg_requestFullscreen_9f0611438eb929cf: zf,
          __wbg_cancel_09c394f0894744eb: Fl,
          __wbg_animate_6ec571f163cf6f8d: vl,
          __wbg_play_63bc12f42e16af91: df,
          __wbg_userAgentData_f7b0e61c05c54315: lu,
          __wbg_brands_a1e7a2bce052128f: Pl,
          __wbg_brand_9562792cbb4735c3: Tl,
          __wbg_webkitRequestFullscreen_23664c63833ff0e5: du,
          __wbg_webkitFullscreenElement_a9ca38b7214d1567: uu,
          __wbg_requestFullscreen_86fc6cdb76000482: Uf,
          __wbg_getCoalescedEvents_21492912fd0145ec: fa,
          __wbg_offsetX_cb6a38e6f23cb4a6: af,
          __wbg_offsetY_43e21941c5c1f8bf: ff,
          __wbg_instanceof_Window_68f3f67bad1729c1: Oa,
          __wbg_document_62abd3e2b80cbd9e: ta,
          __wbg_navigator_fc64ba1417939b25: $a,
          __wbg_devicePixelRatio_7554ba36d09d8a66: Ql,
          __wbg_cancelIdleCallback_9b66ad1125399aa6: Il,
          __wbg_getComputedStyle_9fc8631272abb86e: ua,
          __wbg_matchMedia_f6fead5956885195: Ua,
          __wbg_requestIdleCallback_c35f99c6231482bf: jf,
          __wbg_cancelAnimationFrame_2939f00622bc7c28: Rl,
          __wbg_requestAnimationFrame_72e2268c983f0d5f: Df,
          __wbg_clearTimeout_0e9bd2c8f258ce4f: Dl,
          __wbg_queueMicrotask_59501fe9a6b8d8ee: Pf,
          __wbg_setTimeout_3d31e18f97884f39: kf,
          __wbg_setTimeout_906fea9a7279f446: Yf,
          __wbg_body_9ce0d68f6f8c4231: El,
          __wbg_visibilityState_dd2c8013a31cb756: fu,
          __wbg_activeElement_417ce7a406f87caf: pl,
          __wbg_fullscreenElement_a2a202d0893a4ef5: aa,
          __wbg_createElement_12aa94dc33c0480f: ql,
          __wbg_getElementById_6cd98fa4e2fb8b6b: pa,
          __wbg_querySelectorAll_bf71c6b256d38064: Ef,
          __wbg_setAttribute_a6637d7afe48112f: $f,
          __wbg_setPointerCapture_f10920002f94ccd0: Kf,
          __wbg_navigator_6db993f5ffeb46be: Wa,
          __wbg_style_7337fe001c46487c: ru,
          __wbg_focus_7e6c35083244cb6b: la,
          __wbg_debug_58d16ea352cfbca1: Gl,
          __wbg_error_51ecdd39ec054205: sa,
          __wbg_error_3ff20bae955209a0: ra,
          __wbg_info_e56933705c348038: Ca,
          __wbg_log_ea240990d83e374e: Da,
          __wbg_warn_d89f6637da554c8d: _u,
          __wbg_altKey_8061c4dfb9cbf7b5: ml,
          __wbg_ctrlKey_c3f759e6fb63fb2a: Kl,
          __wbg_shiftKey_3b3f09be0981b1ca: k_,
          __wbg_metaKey_19999df0b359ea8f: ja,
          __wbg_location_cfb228a81da1b65f: La,
          __wbg_repeat_c59d3b80fe1598a2: Ff,
          __wbg_key_5513922ab1e29370: Ra,
          __wbg_code_ad4515c48b5f1aaf: Ul,
          __wbg_pointerId_5774d020c79f5884: bf,
          __wbg_pressure_ee2a32f0c7f9317e: vf,
          __wbg_pointerType_abd719229e189ed2: gf,
          __wbg_getCoalescedEvents_96dfe2b07d566895: _a,
          __wbg_deltaX_47715e3350e678c7: Yl,
          __wbg_deltaY_d604000d1ebb0302: Xl,
          __wbg_deltaMode_f45b0b9e27b90093: kl,
          __wbg_signal_b96223519a041faa: X_,
          __wbg_new_186abcfdff244e42: Ga,
          __wbg_abort_18ba44d46e13d7fe: gl,
          __wbg_setwidth_1d87b5f1ad4300d2: K_,
          __wbg_setheight_da5223b4d4959337: y_,
          __wbg_getContext_7413c456eda278ca: da,
          __wbg_setwidth_5bf47b58bc81373a: G_,
          __wbg_setheight_791d7ce190ad61bc: m_,
          __wbg_getContext_aaf9a2894cb5450a: ba,
          __wbg_settype_acc38e64fddb9e3f: j_,
          __wbg_ctrlKey_076cf4ddba3e2c92: $l,
          __wbg_shiftKey_65139d3881002796: Y_,
          __wbg_altKey_a8de3b788e0e0cc5: yl,
          __wbg_metaKey_87f241cb3857b2f9: Na,
          __wbg_button_c4f0997a075dca6d: Ol,
          __wbg_buttons_2043aaab9381999d: Ml,
          __wbg_movementX_403d2ff04d37d34d: qa,
          __wbg_movementY_251f26255775513a: Ha,
          __wbg_new_84e9d2d86df15a1d: Ja,
          __wbg_disconnect_c2a6d2d7afb60ce0: ea,
          __wbg_observe_06c90ab1726206eb: rf,
          __wbg_observe_441f29c8b714f51c: sf,
          __wbg_unobserve_54647103039cc2cd: cu,
          __wbg_setbox_e0ddaf0fda86f779: i_,
          __wbg_getPropertyValue_75e0d4c9d9783e7b: ma,
          __wbg_removeProperty_3788f45eb83cc061: If,
          __wbg_setProperty_5ee26828600418f6: Gf,
          __wbg_port1_07c24e0cb319304d: pf,
          __wbg_port2_ec66cbab4bb1b459: hf,
          __wbg_new_bf07bde7f6e59bba: Za,
          __wbg_get_1fd2b7a6af84707b: ya,
          __wbg_preventDefault_a063596d0087ba6f: xf,
          __wbg_setonmessage_33b738c924fce1c0: O_,
          __wbg_close_b5b2d841121ac054: Vl,
          __wbg_postMessage_451dfdc77bc899af: wf,
          __wbg_start_634ff8fd50d7879f: Q_,
          __wbg_userAgent_a24a493cd80cbd00: au,
          __wbg_newwithstrsequenceandoptions_3c68d739cf8f35ce: tf,
          __wbg_width_1bfba151b991157a: bu,
          __wbg_height_f19f08278715086c: Sa,
          __wbg_createObjectURL_1acd82bf8749f5a9: Hl,
          __wbg_revokeObjectURL_ffb9ce9155dbedaf: qf,
          __wbg_addEventListener_011de4ce408fd067: hl,
          __wbg_removeEventListener_98ce9b0181ba8d74: Af,
          __wbg_media_bd25dea1442c481b: Ba,
          __wbg_matches_dc8f84665982e2f8: za,
          __wbg_addListener_0bfd1a45e577b82f: wl,
          __wbg_removeListener_9c195437978158e9: Rf,
          __wbg_inlineSize_c36306fc8d7bf3f5: Ea,
          __wbg_blockSize_0de30d9eaea17aeb: Cl,
          __wbg_new_39fae4e38868373c: ka,
          __wbg_postMessage_acaa82cfcb43d6a6: mf,
          __wbg_new_713ee440434744d3: Xa,
          __wbg_disconnect_3fe08e14216367dc: Zl,
          __wbg_observe_902bb4080f1a53c3: of,
          __wbg_isIntersecting_73b8e6fa5198e367: Ma,
          __wbg_appendChild_0455c3748a28445a: xl,
          __wbg_contains_fa87e76715824be0: Bl,
          __wbg_persisted_30583f3cb6823f42: uf,
          __wbg_contentRect_98871a7d339de11d: jl,
          __wbg_devicePixelContentBoxSize_46a83f780892e4fe: Jl,
          __wbg_queueMicrotask_46c1df247678729f: Tf,
          __wbg_queueMicrotask_8acf3ccb75ed8d11: Of,
          __wbindgen_is_function: Ou,
          __wbg_performance_7a3ffd0b17f663ad: _f,
          __wbg_now_2c95c9de01293173: nf,
          __wbg_get_a131a44bd1eb6979: va,
          __wbg_length_f00ec12454a5d9fd: Fa,
          __wbg_new_58353953ad2097cc: Ya,
          __wbg_newnoargs_ff528e72d35de39a: ef,
          __wbg_new_07b483f72211fd66: Ka,
          __wbg_of_6894cf64ba33daf5: cf,
          __wbg_of_b87d5fd6efcb0d7f: lf,
          __wbg_push_73fd7b5550ebf707: Cf,
          __wbg_call_fbe8be8bf6436ce5: Al,
          __wbg_getOwnPropertyDescriptor_d7022024b40febb5: ha,
          __wbg_is_49ee71a294f7d2fe: Aa,
          __wbg_resolve_0dac8c580ffd4678: Nf,
          __wbg_catch_b51fce253ee18ec3: Ll,
          __wbg_then_db882932c0c714c6: ou,
          __wbg_then_82ab9fb4080f1707: iu,
          __wbg_static_accessor_GLOBAL_THIS_ee9704f328b6b291: eu,
          __wbg_static_accessor_SELF_78c9e3071b912620: tu,
          __wbg_static_accessor_WINDOW_a093d21393777366: nu,
          __wbg_static_accessor_GLOBAL_487c52c58d65314d: Z_,
          __wbg_set_c43293f93a35998a: Xf,
          __wbindgen_debug_string: Tu,
          __wbindgen_throw: Fu,
          __wbindgen_closure_wrapper1881: pu,
          __wbindgen_closure_wrapper1883: hu,
          __wbindgen_closure_wrapper1885: wu,
          __wbindgen_closure_wrapper1887: mu,
          __wbindgen_closure_wrapper1889: yu,
          __wbindgen_closure_wrapper1892: vu,
          __wbindgen_closure_wrapper1905: xu,
          __wbindgen_closure_wrapper1907: Su,
          __wbindgen_closure_wrapper1915: Cu,
          __wbindgen_closure_wrapper3348: Eu,
          __wbindgen_init_externref_table: Pu
        }
      }, kc), Lu = Q.memory, Du = Q.__wbg_mandelbrotstep_free, Vu = Q.__wbg_get_mandelbrotstep_zx, Uu = Q.__wbg_set_mandelbrotstep_zx, zu = Q.__wbg_get_mandelbrotstep_zy, Bu = Q.__wbg_set_mandelbrotstep_zy, ju = Q.__wbg_get_mandelbrotstep_dx, Nu = Q.__wbg_set_mandelbrotstep_dx, qu = Q.__wbg_get_mandelbrotstep_dy, Hu = Q.__wbg_set_mandelbrotstep_dy, Wu = Q.mandelbrot, $u = Q.run_web, Ku = Q.__externref_table_alloc, Gu = Q.__wbindgen_export_1, ku = Q.__wbindgen_exn_store, Yu = Q.__wbindgen_malloc, Xu = Q.__wbindgen_realloc, Ju = Q.__wbindgen_free, Qu = Q.__wbindgen_export_6, Zu = Q.__externref_drop_slice, ed = Q.__externref_table_dealloc, td = Q.closure441_externref_shim, nd = Q.wasm_bindgen__convert__closures_____invoke__he0c36f5f951d360f, rd = Q.closure442_externref_shim, sd = Q.closure489_externref_shim, mi = Q.__wbindgen_start, id = Object.freeze(Object.defineProperty({
        __proto__: null,
        __externref_drop_slice: Zu,
        __externref_table_alloc: Ku,
        __externref_table_dealloc: ed,
        __wbg_get_mandelbrotstep_dx: ju,
        __wbg_get_mandelbrotstep_dy: qu,
        __wbg_get_mandelbrotstep_zx: Vu,
        __wbg_get_mandelbrotstep_zy: zu,
        __wbg_mandelbrotstep_free: Du,
        __wbg_set_mandelbrotstep_dx: Nu,
        __wbg_set_mandelbrotstep_dy: Hu,
        __wbg_set_mandelbrotstep_zx: Uu,
        __wbg_set_mandelbrotstep_zy: Bu,
        __wbindgen_exn_store: ku,
        __wbindgen_export_1: Gu,
        __wbindgen_export_6: Qu,
        __wbindgen_free: Ju,
        __wbindgen_malloc: Yu,
        __wbindgen_realloc: Xu,
        __wbindgen_start: mi,
        closure441_externref_shim: td,
        closure442_externref_shim: rd,
        closure489_externref_shim: sd,
        mandelbrot: Wu,
        memory: Lu,
        run_web: $u,
        wasm_bindgen__convert__closures_____invoke__he0c36f5f951d360f: nd
      }, Symbol.toStringTag, {
        value: "Module"
      }));
      Xc(id);
      mi();
      class od {
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
          __publicField(this, "mandelbrotReferenceBuffer");
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
          __publicField(this, "extraFrames", 0);
          __publicField(this, "mandelbrotReference", new Float32Array(1e6));
          this.canvas = t, this.shaderPass1 = Kc, this.shaderPass2 = Gc, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
            maxIterations: 1,
            epsilon: 0,
            angle: 0,
            scale: 1,
            cy: 0,
            cx: 0
          };
        }
        async initialize() {
          if (!navigator.gpu) throw new Error("WebGPU non support\xE9");
          if (this.adapter = await navigator.gpu.requestAdapter(), !this.adapter) throw new Error("Adapter WebGPU introuvable");
          this.device = await this.adapter.requestDevice(), this.device.label = "Engine Device", this.queue = this.device.queue, this.queue.label = "Engine Queue", this.ctx = this.canvas.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.ctx.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
          }), this.sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "nearest"
          }), this.sampler.label = "Engine Sampler", this.uniformBufferMandelbrot = this.device.createBuffer({
            size: 32,
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
            code: this.shaderPass1,
            label: "Engine ShaderModule Pass1"
          }), n = this.device.createShaderModule({
            code: this.shaderPass2,
            label: "Engine ShaderModule Pass2"
          }), r = this.device.createBindGroupLayout({
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
              }
            ],
            label: "Engine RenderPipeline Mandelbrot"
          });
          this.pipeline1 = this.device.createRenderPipeline({
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
          }), this.pipeline2 = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
              module: n,
              entryPoint: "vs_main"
            },
            fragment: {
              module: n,
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
          }), this.bindGroup1 = this.device.createBindGroup({
            layout: r,
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
              }
            ],
            label: "Engine BindGroup Pass Mandelbrot"
          }), this.bindGroup2 = void 0;
        }
        resize() {
          var _a2, _b;
          const t = window.devicePixelRatio || 1, n = this.canvas.parentElement, r = (n == null ? void 0 : n.clientWidth) ?? this.canvas.clientWidth, s = (n == null ? void 0 : n.clientHeight) ?? this.canvas.clientHeight;
          if (this.width = Math.max(1, Math.round(r * t)), this.height = Math.max(1, Math.round(s * t)), this.canvas.width = this.width, this.canvas.height = this.height, this.canvas.style.width = r + "px", this.canvas.style.height = s + "px", this.ctx.configure({
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
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: "Engine IntermediateTexture"
          }), this.intermediateView = this.intermediateTexture.createView(), this.intermediateView.label = "Engine IntermediateTextureView", this.pipeline2) {
            const i = this.pipeline2.getBindGroupLayout(0);
            i.label = "Engine IntermediateTextureView";
            const o = [
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
            this.bindGroup2 = this.device.createBindGroup({
              layout: i,
              entries: o,
              label: "Engine BindGroup Color Pass"
            });
          }
        }
        areObjectsEqual(t, n) {
          const r = Object.keys(t), s = Object.keys(n);
          if (r.length !== s.length) return false;
          for (const i of r) if (t[i] !== n[i]) return false;
          return true;
        }
        update(t, n) {
          if (this.previousMandelbrot) {
            const c = this.needRender;
            this.needRender = !this.areObjectsEqual(t, this.previousMandelbrot), this.needRender ? this.extraFrames = 2 : c && this.needRender;
          }
          const r = this.width / Math.max(1, this.height), s = new Float32Array([
            t.cx,
            t.cy,
            t.scale,
            r,
            t.angle,
            t.maxIterations,
            t.epsilon,
            n.antialiasLevel
          ]);
          this.device.queue.writeBuffer(this.uniformBufferMandelbrot, 0, s.buffer);
          let i = this.previousMandelbrot.scale / t.scale;
          i < 1 && (i = 1 / i), i -= 1;
          const o = new Float32Array([
            n.palettePeriod,
            i * 2,
            0,
            0
          ]);
          this.device.queue.writeBuffer(this.uniformBufferColor, 0, o.buffer), this.previousMandelbrot && ((this.previousMandelbrot.cx !== t.cx || this.previousMandelbrot.cy !== t.cy || this.previousMandelbrot.maxIterations !== t.maxIterations) && (console.log("Calcul de l'orbite"), nl(t.cx, t.cy, t.maxIterations).forEach((a, u) => {
            this.mandelbrotReference[u * 4] = a.zx, this.mandelbrotReference[u * 4 + 1] = a.zy, this.mandelbrotReference[u * 4 + 2] = a.dx, this.mandelbrotReference[u * 4 + 3] = a.dy;
          })), this.previousMandelbrot = t), this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer, 0, this.mandelbrotReference.buffer);
        }
        render() {
          if (!this.needRender && this.extraFrames <= 0 || (!this.needRender && this.extraFrames > 0 && this.extraFrames--, console.count("Rendering"), !this.pipeline1 || !this.pipeline2)) return;
          const t = this.device.createCommandEncoder(), n = t.beginRenderPass({
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
          n.setPipeline(this.pipeline1), this.bindGroup1 && n.setBindGroup(0, this.bindGroup1), n.draw(6, 1, 0, 0), n.end();
          const r = this.ctx.getCurrentTexture().createView(), s = t.beginRenderPass({
            colorAttachments: [
              {
                view: r,
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
          s.setPipeline(this.pipeline2), this.bindGroup2 && s.setBindGroup(0, this.bindGroup2), s.draw(6, 1, 0, 0), s.end(), this.device.queue.submit([
            t.finish()
          ]);
        }
        destroy() {
          var _a2, _b, _c2, _d2;
          (_b = (_a2 = this.intermediateTexture) == null ? void 0 : _a2.destroy) == null ? void 0 : _b.call(_a2), (_d2 = (_c2 = this.mandelbrotReferenceBuffer) == null ? void 0 : _c2.destroy) == null ? void 0 : _d2.call(_c2);
        }
      }
      const cd = {
        class: "panel compact-panel"
      }, ld = {
        class: "panel-block compact-block"
      }, ad = {
        class: "math-display"
      }, fd = [
        "innerHTML"
      ], _d = {
        class: "panel-block compact-block"
      }, ud = {
        class: "math-display"
      }, dd = [
        "innerHTML"
      ], bd = {
        class: "math-display"
      }, gd = [
        "innerHTML"
      ], pd = {
        class: "panel-block compact-block"
      }, hd = {
        class: "math-display"
      }, wd = {
        class: "panel-block compact-block"
      }, md = {
        style: {
          display: "flex",
          "flex-direction": "column",
          gap: "0.3em"
        }
      }, yd = [
        "value"
      ], vd = {
        class: "panel-block compact-block"
      }, xd = {
        style: {
          display: "flex",
          gap: "0.5em",
          "align-items": "center"
        }
      }, bs = "mandelbrot_presets", Sd = Sr({
        __name: "Settings",
        props: {
          modelValue: {}
        },
        setup(e) {
          const t = e;
          function n(T, v = 8) {
            if (T === 0) return "0";
            const D = Math.floor(Math.log10(Math.abs(T))), U = T / Math.pow(10, D), H = D === 0 ? "" : `\xD710${r(D)}`;
            return `${U.toFixed(v)}${H}`;
          }
          function r(T) {
            const v = {
              "-": "\u207B",
              0: "\u2070",
              1: "\xB9",
              2: "\xB2",
              3: "\xB3",
              4: "\u2074",
              5: "\u2075",
              6: "\u2076",
              7: "\u2077",
              8: "\u2078",
              9: "\u2079"
            };
            return String(T).split("").map((D) => v[D] ?? D).join("");
          }
          const s = Rt(() => (t.modelValue.angle * 180 / Math.PI).toFixed(2)), i = Rt(() => n(t.modelValue.scale)), o = Rt(() => n(t.modelValue.cx)), c = Rt(() => n(t.modelValue.cy)), a = Dt(""), u = Dt([]), _ = Dt("");
          function b() {
            if (!a.value.trim()) return;
            const T = {
              name: a.value.trim(),
              cx: t.modelValue.cx,
              cy: t.modelValue.cy,
              scale: t.modelValue.scale,
              angle: t.modelValue.angle
            }, v = u.value.findIndex((D) => D.name === T.name);
            v >= 0 ? u.value[v] = T : u.value.push(T), localStorage.setItem(bs, JSON.stringify(u.value)), a.value = "";
          }
          function S() {
            const T = localStorage.getItem(bs);
            if (T) try {
              u.value = JSON.parse(T);
            } catch {
            }
          }
          function E(T) {
            const v = u.value.find((D) => D.name === T);
            v && (t.modelValue.cx = v.cx, t.modelValue.cy = v.cy, t.modelValue.scale = v.scale, t.modelValue.angle = v.angle, _.value = T);
          }
          return Mn(() => {
            S();
          }), (T, v) => (jt(), Nt("nav", cd, [
            v[11] || (v[11] = q("p", {
              class: "panel-heading compact-heading"
            }, "Param\xE8tres", -1)),
            q("div", ld, [
              q("span", ad, [
                v[3] || (v[3] = At(" \xC9chelle\xA0: ", -1)),
                q("span", {
                  innerHTML: i.value
                }, null, 8, fd)
              ])
            ]),
            q("div", _d, [
              q("p", null, [
                q("span", ud, [
                  v[4] || (v[4] = At("Cx\xA0:", -1)),
                  q("span", {
                    innerHTML: o.value
                  }, null, 8, dd)
                ])
              ]),
              q("p", null, [
                q("span", bd, [
                  v[5] || (v[5] = At("Cy\xA0:", -1)),
                  v[6] || (v[6] = q("span", {
                    class: "math-i"
                  }, "i", -1)),
                  q("span", {
                    innerHTML: c.value
                  }, null, 8, gd)
                ])
              ])
            ]),
            q("div", pd, [
              q("span", hd, [
                v[7] || (v[7] = At(" Angle\xA0: ", -1)),
                q("span", null, Yn(s.value) + "\xB0", 1)
              ])
            ]),
            q("div", wd, [
              v[9] || (v[9] = q("label", {
                class: "compact-label"
              }, "Presets enregistr\xE9s", -1)),
              q("div", md, [
                jr(q("select", {
                  class: "select compact-select",
                  "onUpdate:modelValue": v[0] || (v[0] = (D) => _.value = D),
                  onChange: v[1] || (v[1] = (D) => E(_.value)),
                  style: {
                    width: "100%"
                  }
                }, [
                  v[8] || (v[8] = q("option", {
                    value: "",
                    disabled: ""
                  }, "Choisir un preset...", -1)),
                  (jt(true), Nt(De, null, Oo(u.value, (D) => (jt(), Nt("option", {
                    key: D.name,
                    value: D.name
                  }, Yn(D.name), 9, yd))), 128))
                ], 544), [
                  [
                    jc,
                    _.value
                  ]
                ])
              ])
            ]),
            q("div", vd, [
              v[10] || (v[10] = q("label", {
                class: "compact-label"
              }, "Nom du preset", -1)),
              q("div", xd, [
                jr(q("input", {
                  class: "input compact-input",
                  "onUpdate:modelValue": v[2] || (v[2] = (D) => a.value = D),
                  type: "text",
                  placeholder: "Nom...",
                  style: {
                    width: "8em"
                  }
                }, null, 512), [
                  [
                    Bc,
                    a.value
                  ]
                ]),
                q("button", {
                  class: "button is-link is-small",
                  onClick: b
                }, "Enregistrer")
              ])
            ])
          ]));
        }
      }), yi = (e, t) => {
        const n = e.__vccOpts || e;
        for (const [r, s] of t) n[r] = s;
        return n;
      }, Cd = yi(Sd, [
        [
          "__scopeId",
          "data-v-0168128e"
        ]
      ]), Ed = {
        style: {
          position: "relative",
          height: "100vh",
          width: "100vw"
        }
      }, Td = {
        style: {
          position: "absolute",
          top: "0",
          left: "0",
          "z-index": "10",
          width: "320px",
          "pointer-events": "auto"
        }
      }, Pd = 1, Od = 128, nn = 0.05, rn = 0.7, gs = 0.025, Md = Sr({
        __name: "WebGpuSurface",
        setup(e) {
          const t = Dt(null);
          let n, r, s = {
            cx: -0.749208775,
            cy: -0.0798967515,
            scale: 2.5,
            angle: 0
          }, i = Dt({
            ...s
          }).value, o = 0.04, c = 0, a = 0, u = 0, _ = 0;
          async function b() {
            if (!t.value) return;
            n = t.value, r = new od(n, {
              antialiasLevel: 1,
              palettePeriod: 128
            }), await r.initialize();
            function S(W, K) {
              const me = Math.cos(s.angle), rt = Math.sin(s.angle), ne = me * W - rt * K, $ = rt * W + me * K;
              i.cx += ne, i.cy += $;
            }
            const E = {};
            function T(W) {
              E[W.key.toLowerCase()] = true;
            }
            function v(W) {
              E[W.key.toLowerCase()] = false;
            }
            function D(W) {
              W.preventDefault();
              const K = 0.8;
              W.deltaY < 0 ? i.scale *= K : i.scale /= K;
            }
            function U() {
              E.z && S(0, o * i.scale), E.s && S(0, -o * i.scale), E.q && S(-o * i.scale, 0), E.d && S(o * i.scale, 0), E.a && (i.angle += gs), E.e && (i.angle -= gs), c = (i.cx - s.cx) * nn + c * rn, a = (i.cy - s.cy) * nn + a * rn, u = (i.scale - s.scale) * nn + u * rn, _ = (i.angle - s.angle) * nn + _ * rn;
              const W = 1e-4;
              Math.abs(_) < 1e-3 && (_ = 0), Math.abs(a) < s.scale / n.height * 2 && (a = 0), Math.abs(c) < s.scale / n.width * 2 && (c = 0), Math.abs(u) < s.scale / 100 && (u = 0), s.cx += c, s.cy += a, s.scale += u, s.angle += _;
              const K = Math.min(Math.max(100, 80 + 40 * Math.log2(1 / s.scale)), 1e5);
              r.update({
                cx: s.cx,
                cy: s.cy,
                scale: s.scale,
                angle: s.angle,
                maxIterations: K,
                epsilon: W
              }, {
                antialiasLevel: Pd,
                palettePeriod: Od
              }), r.render(), requestAnimationFrame(U);
            }
            let H = false, k = false, A = 0, te = 0, Te = 0, we = 0;
            function Pe(W) {
              const K = t.value;
              if (!K) return {
                x: 0,
                y: 0,
                width: 0,
                height: 0
              };
              const me = K.getBoundingClientRect();
              return {
                x: W.clientX - me.left,
                y: W.clientY - me.top,
                width: me.width,
                height: me.height
              };
            }
            function ut(W) {
              if (W.button === 2) k = true;
              else {
                H = true;
                const K = Pe(W);
                A = K.x, te = K.y, Te = i.cx, we = i.cy;
              }
            }
            function Ne(W) {
              var _a2;
              const K = Pe(W);
              if (k) {
                const de = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
                if (!de) return;
                const Xt = de.width / 2, Fn = de.height / 2, Ln = K.x, st = K.y;
                i.angle = Math.atan2(st - Fn, Ln - Xt);
                return;
              }
              if (!H) return;
              const me = K.x - A, rt = K.y - te, ne = -me * i.scale * 2 / K.width * (K.width / K.height), $ = rt * i.scale * 2 / K.height, j = Math.cos(s.angle), Me = Math.sin(s.angle), dt = j * ne - Me * $, qe = Me * ne + j * $;
              i.cx = Te + dt, i.cy = we + qe;
            }
            function nt(W) {
              W.button === 2 ? k = false : H = false;
            }
            window.addEventListener("keydown", T), window.addEventListener("keyup", v), n.addEventListener("wheel", D, {
              passive: false
            }), n.addEventListener("mousedown", ut), n.addEventListener("contextmenu", function(W) {
              W.preventDefault();
            }), window.addEventListener("mousemove", Ne), window.addEventListener("mouseup", nt), U();
          }
          return Mn(() => {
            b();
          }), (S, E) => (jt(), Nt("div", Ed, [
            q("canvas", {
              ref_key: "canvasRef",
              ref: t,
              style: {
                width: "100%",
                height: "100%",
                display: "block"
              }
            }, null, 512),
            q("div", Td, [
              Ge(Cd, {
                modelValue: zs(i),
                "onUpdate:modelValue": E[0] || (E[0] = (T) => ie(i) ? i.value = T : i = T)
              }, null, 8, [
                "modelValue"
              ])
            ])
          ]));
        }
      }), Ad = yi(Md, [
        [
          "__scopeId",
          "data-v-30c077ae"
        ]
      ]), Rd = {
        id: "fullscreen"
      }, Id = Sr({
        __name: "App",
        setup(e) {
          return Mn(() => {
          }), (t, n) => (jt(), Nt("div", Rd, [
            Ge(Ad)
          ]));
        }
      });
      Hc(Id).mount("#app");
    })();
  }
});
export default require_stdin();
