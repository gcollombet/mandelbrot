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
          for (const o of s) if (o.type === "childList") for (const i of o.addedNodes) i.tagName === "LINK" && i.rel === "modulepreload" && r(i);
        }).observe(document, {
          childList: true,
          subtree: true
        });
        function n(s) {
          const o = {};
          return s.integrity && (o.integrity = s.integrity), s.referrerPolicy && (o.referrerPolicy = s.referrerPolicy), s.crossOrigin === "use-credentials" ? o.credentials = "include" : s.crossOrigin === "anonymous" ? o.credentials = "omit" : o.credentials = "same-origin", o;
        }
        function r(s) {
          if (s.ep) return;
          s.ep = true;
          const o = n(s);
          fetch(s.href, o);
        }
      })();
      function rr(e) {
        const t = /* @__PURE__ */ Object.create(null);
        for (const n of e.split(",")) t[n] = 1;
        return (n) => n in t;
      }
      const $ = {}, ut = [], Fe = () => {
      }, Eo = () => false, mn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), sr = (e) => e.startsWith("onUpdate:"), ie = Object.assign, or = (e, t) => {
        const n = e.indexOf(t);
        n > -1 && e.splice(n, 1);
      }, To = Object.prototype.hasOwnProperty, q = (e, t) => To.call(e, t), R = Array.isArray, dt = (e) => Ht(e) === "[object Map]", wn = (e) => Ht(e) === "[object Set]", Fr = (e) => Ht(e) === "[object Date]", L = (e) => typeof e == "function", ee = (e) => typeof e == "string", Le = (e) => typeof e == "symbol", J = (e) => e !== null && typeof e == "object", ms = (e) => (J(e) || L(e)) && L(e.then) && L(e.catch), ws = Object.prototype.toString, Ht = (e) => ws.call(e), Po = (e) => Ht(e).slice(8, -1), vs = (e) => Ht(e) === "[object Object]", ir = (e) => ee(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Ot = rr(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), vn = (e) => {
        const t = /* @__PURE__ */ Object.create(null);
        return (n) => t[n] || (t[n] = e(n));
      }, Oo = /-(\w)/g, Xe = vn((e) => e.replace(Oo, (t, n) => n ? n.toUpperCase() : "")), Mo = /\B([A-Z])/g, it = vn((e) => e.replace(Mo, "-$1").toLowerCase()), ys = vn((e) => e.charAt(0).toUpperCase() + e.slice(1)), In = vn((e) => e ? `on${ys(e)}` : ""), Ye = (e, t) => !Object.is(e, t), tn = (e, ...t) => {
        for (let n = 0; n < e.length; n++) e[n](...t);
      }, Wn = (e, t, n, r = false) => {
        Object.defineProperty(e, t, {
          configurable: true,
          enumerable: false,
          writable: r,
          value: n
        });
      }, an = (e) => {
        const t = parseFloat(e);
        return isNaN(t) ? e : t;
      };
      let Lr;
      const yn = () => Lr || (Lr = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
      function cr(e) {
        if (R(e)) {
          const t = {};
          for (let n = 0; n < e.length; n++) {
            const r = e[n], s = ee(r) ? Fo(r) : cr(r);
            if (s) for (const o in s) t[o] = s[o];
          }
          return t;
        } else if (ee(e) || J(e)) return e;
      }
      const Ao = /;(?![^(]*\))/g, Ro = /:([^]+)/, Io = /\/\*[^]*?\*\//g;
      function Fo(e) {
        const t = {};
        return e.replace(Io, "").split(Ao).forEach((n) => {
          if (n) {
            const r = n.split(Ro);
            r.length > 1 && (t[r[0].trim()] = r[1].trim());
          }
        }), t;
      }
      function lr(e) {
        let t = "";
        if (ee(e)) t = e;
        else if (R(e)) for (let n = 0; n < e.length; n++) {
          const r = lr(e[n]);
          r && (t += r + " ");
        }
        else if (J(e)) for (const n in e) e[n] && (t += n + " ");
        return t.trim();
      }
      const Lo = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Do = rr(Lo);
      function xs(e) {
        return !!e || e === "";
      }
      function Vo(e, t) {
        if (e.length !== t.length) return false;
        let n = true;
        for (let r = 0; n && r < e.length; r++) n = xn(e[r], t[r]);
        return n;
      }
      function xn(e, t) {
        if (e === t) return true;
        let n = Fr(e), r = Fr(t);
        if (n || r) return n && r ? e.getTime() === t.getTime() : false;
        if (n = Le(e), r = Le(t), n || r) return e === t;
        if (n = R(e), r = R(t), n || r) return n && r ? Vo(e, t) : false;
        if (n = J(e), r = J(t), n || r) {
          if (!n || !r) return false;
          const s = Object.keys(e).length, o = Object.keys(t).length;
          if (s !== o) return false;
          for (const i in e) {
            const c = e.hasOwnProperty(i), a = t.hasOwnProperty(i);
            if (c && !a || !c && a || !xn(e[i], t[i])) return false;
          }
        }
        return String(e) === String(t);
      }
      function Uo(e, t) {
        return e.findIndex((n) => xn(n, t));
      }
      const Ss = (e) => !!(e && e.__v_isRef === true), $n = (e) => ee(e) ? e : e == null ? "" : R(e) || J(e) && (e.toString === ws || !L(e.toString)) ? Ss(e) ? $n(e.value) : JSON.stringify(e, Cs, 2) : String(e), Cs = (e, t) => Ss(t) ? Cs(e, t.value) : dt(t) ? {
        [`Map(${t.size})`]: [
          ...t.entries()
        ].reduce((n, [r, s], o) => (n[Fn(r, o) + " =>"] = s, n), {})
      } : wn(t) ? {
        [`Set(${t.size})`]: [
          ...t.values()
        ].map((n) => Fn(n))
      } : Le(t) ? Fn(t) : J(t) && !R(t) && !vs(t) ? String(t) : t, Fn = (e, t = "") => {
        var n;
        return Le(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
      };
      let be;
      class zo {
        constructor(t = false) {
          this.detached = t, this._active = true, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = false, this.parent = be, !t && be && (this.index = (be.scopes || (be.scopes = [])).push(this) - 1);
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
            const n = be;
            try {
              return be = this, t();
            } finally {
              be = n;
            }
          }
        }
        on() {
          ++this._on === 1 && (this.prevScope = be, be = this);
        }
        off() {
          this._on > 0 && --this._on === 0 && (be = this.prevScope, this.prevScope = void 0);
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
      function Bo() {
        return be;
      }
      let Y;
      const Ln = /* @__PURE__ */ new WeakSet();
      class Es {
        constructor(t) {
          this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, be && be.active && be.effects.push(this);
        }
        pause() {
          this.flags |= 64;
        }
        resume() {
          this.flags & 64 && (this.flags &= -65, Ln.has(this) && (Ln.delete(this), this.trigger()));
        }
        notify() {
          this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Ps(this);
        }
        run() {
          if (!(this.flags & 1)) return this.fn();
          this.flags |= 2, Dr(this), Os(this);
          const t = Y, n = Ce;
          Y = this, Ce = true;
          try {
            return this.fn();
          } finally {
            Ms(this), Y = t, Ce = n, this.flags &= -3;
          }
        }
        stop() {
          if (this.flags & 1) {
            for (let t = this.deps; t; t = t.nextDep) _r(t);
            this.deps = this.depsTail = void 0, Dr(this), this.onStop && this.onStop(), this.flags &= -2;
          }
        }
        trigger() {
          this.flags & 64 ? Ln.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
        }
        runIfDirty() {
          Kn(this) && this.run();
        }
        get dirty() {
          return Kn(this);
        }
      }
      let Ts = 0, Mt, At;
      function Ps(e, t = false) {
        if (e.flags |= 8, t) {
          e.next = At, At = e;
          return;
        }
        e.next = Mt, Mt = e;
      }
      function ar() {
        Ts++;
      }
      function fr() {
        if (--Ts > 0) return;
        if (At) {
          let t = At;
          for (At = void 0; t; ) {
            const n = t.next;
            t.next = void 0, t.flags &= -9, t = n;
          }
        }
        let e;
        for (; Mt; ) {
          let t = Mt;
          for (Mt = void 0; t; ) {
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
      function Os(e) {
        for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
      }
      function Ms(e) {
        let t, n = e.depsTail, r = n;
        for (; r; ) {
          const s = r.prevDep;
          r.version === -1 ? (r === n && (n = s), _r(r), No(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = s;
        }
        e.deps = t, e.depsTail = n;
      }
      function Kn(e) {
        for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (As(t.dep.computed) || t.dep.version !== t.version)) return true;
        return !!e._dirty;
      }
      function As(e) {
        if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === zt) || (e.globalVersion = zt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Kn(e)))) return;
        e.flags |= 2;
        const t = e.dep, n = Y, r = Ce;
        Y = e, Ce = true;
        try {
          Os(e);
          const s = e.fn(e._value);
          (t.version === 0 || Ye(s, e._value)) && (e.flags |= 128, e._value = s, t.version++);
        } catch (s) {
          throw t.version++, s;
        } finally {
          Y = n, Ce = r, Ms(e), e.flags &= -3;
        }
      }
      function _r(e, t = false) {
        const { dep: n, prevSub: r, nextSub: s } = e;
        if (r && (r.nextSub = s, e.prevSub = void 0), s && (s.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
          n.computed.flags &= -5;
          for (let o = n.computed.deps; o; o = o.nextDep) _r(o, true);
        }
        !t && !--n.sc && n.map && n.map.delete(n.key);
      }
      function No(e) {
        const { prevDep: t, nextDep: n } = e;
        t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
      }
      let Ce = true;
      const Rs = [];
      function He() {
        Rs.push(Ce), Ce = false;
      }
      function We() {
        const e = Rs.pop();
        Ce = e === void 0 ? true : e;
      }
      function Dr(e) {
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
      let zt = 0;
      class jo {
        constructor(t, n) {
          this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
        }
      }
      class ur {
        constructor(t) {
          this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = true;
        }
        track(t) {
          if (!Y || !Ce || Y === this.computed) return;
          let n = this.activeLink;
          if (n === void 0 || n.sub !== Y) n = this.activeLink = new jo(Y, this), Y.deps ? (n.prevDep = Y.depsTail, Y.depsTail.nextDep = n, Y.depsTail = n) : Y.deps = Y.depsTail = n, Is(n);
          else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
            const r = n.nextDep;
            r.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = r), n.prevDep = Y.depsTail, n.nextDep = void 0, Y.depsTail.nextDep = n, Y.depsTail = n, Y.deps === n && (Y.deps = r);
          }
          return n;
        }
        trigger(t) {
          this.version++, zt++, this.notify(t);
        }
        notify(t) {
          ar();
          try {
            for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
          } finally {
            fr();
          }
        }
      }
      function Is(e) {
        if (e.dep.sc++, e.sub.flags & 4) {
          const t = e.dep.computed;
          if (t && !e.dep.subs) {
            t.flags |= 20;
            for (let r = t.deps; r; r = r.nextDep) Is(r);
          }
          const n = e.dep.subs;
          n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
        }
      }
      const Gn = /* @__PURE__ */ new WeakMap(), ot = Symbol(""), kn = Symbol(""), Bt = Symbol("");
      function se(e, t, n) {
        if (Ce && Y) {
          let r = Gn.get(e);
          r || Gn.set(e, r = /* @__PURE__ */ new Map());
          let s = r.get(n);
          s || (r.set(n, s = new ur()), s.map = r, s.key = n), s.track();
        }
      }
      function Ne(e, t, n, r, s, o) {
        const i = Gn.get(e);
        if (!i) {
          zt++;
          return;
        }
        const c = (a) => {
          a && a.trigger();
        };
        if (ar(), t === "clear") i.forEach(c);
        else {
          const a = R(e), u = a && ir(n);
          if (a && n === "length") {
            const _ = Number(r);
            i.forEach((b, C) => {
              (C === "length" || C === Bt || !Le(C) && C >= _) && c(b);
            });
          } else switch ((n !== void 0 || i.has(void 0)) && c(i.get(n)), u && c(i.get(Bt)), t) {
            case "add":
              a ? u && c(i.get("length")) : (c(i.get(ot)), dt(e) && c(i.get(kn)));
              break;
            case "delete":
              a || (c(i.get(ot)), dt(e) && c(i.get(kn)));
              break;
            case "set":
              dt(e) && c(i.get(ot));
              break;
          }
        }
        fr();
      }
      function at(e) {
        const t = j(e);
        return t === e ? t : (se(t, "iterate", Bt), xe(e) ? t : t.map(ne));
      }
      function Sn(e) {
        return se(e = j(e), "iterate", Bt), e;
      }
      const qo = {
        __proto__: null,
        [Symbol.iterator]() {
          return Dn(this, Symbol.iterator, ne);
        },
        concat(...e) {
          return at(this).concat(...e.map((t) => R(t) ? at(t) : t));
        },
        entries() {
          return Dn(this, "entries", (e) => (e[1] = ne(e[1]), e));
        },
        every(e, t) {
          return ze(this, "every", e, t, void 0, arguments);
        },
        filter(e, t) {
          return ze(this, "filter", e, t, (n) => n.map(ne), arguments);
        },
        find(e, t) {
          return ze(this, "find", e, t, ne, arguments);
        },
        findIndex(e, t) {
          return ze(this, "findIndex", e, t, void 0, arguments);
        },
        findLast(e, t) {
          return ze(this, "findLast", e, t, ne, arguments);
        },
        findLastIndex(e, t) {
          return ze(this, "findLastIndex", e, t, void 0, arguments);
        },
        forEach(e, t) {
          return ze(this, "forEach", e, t, void 0, arguments);
        },
        includes(...e) {
          return Vn(this, "includes", e);
        },
        indexOf(...e) {
          return Vn(this, "indexOf", e);
        },
        join(e) {
          return at(this).join(e);
        },
        lastIndexOf(...e) {
          return Vn(this, "lastIndexOf", e);
        },
        map(e, t) {
          return ze(this, "map", e, t, void 0, arguments);
        },
        pop() {
          return St(this, "pop");
        },
        push(...e) {
          return St(this, "push", e);
        },
        reduce(e, ...t) {
          return Vr(this, "reduce", e, t);
        },
        reduceRight(e, ...t) {
          return Vr(this, "reduceRight", e, t);
        },
        shift() {
          return St(this, "shift");
        },
        some(e, t) {
          return ze(this, "some", e, t, void 0, arguments);
        },
        splice(...e) {
          return St(this, "splice", e);
        },
        toReversed() {
          return at(this).toReversed();
        },
        toSorted(e) {
          return at(this).toSorted(e);
        },
        toSpliced(...e) {
          return at(this).toSpliced(...e);
        },
        unshift(...e) {
          return St(this, "unshift", e);
        },
        values() {
          return Dn(this, "values", ne);
        }
      };
      function Dn(e, t, n) {
        const r = Sn(e), s = r[t]();
        return r !== e && !xe(e) && (s._next = s.next, s.next = () => {
          const o = s._next();
          return o.value && (o.value = n(o.value)), o;
        }), s;
      }
      const Ho = Array.prototype;
      function ze(e, t, n, r, s, o) {
        const i = Sn(e), c = i !== e && !xe(e), a = i[t];
        if (a !== Ho[t]) {
          const b = a.apply(e, o);
          return c ? ne(b) : b;
        }
        let u = n;
        i !== e && (c ? u = function(b, C) {
          return n.call(this, ne(b), C, e);
        } : n.length > 2 && (u = function(b, C) {
          return n.call(this, b, C, e);
        }));
        const _ = a.call(i, u, r);
        return c && s ? s(_) : _;
      }
      function Vr(e, t, n, r) {
        const s = Sn(e);
        let o = n;
        return s !== e && (xe(e) ? n.length > 3 && (o = function(i, c, a) {
          return n.call(this, i, c, a, e);
        }) : o = function(i, c, a) {
          return n.call(this, i, ne(c), a, e);
        }), s[t](o, ...r);
      }
      function Vn(e, t, n) {
        const r = j(e);
        se(r, "iterate", Bt);
        const s = r[t](...n);
        return (s === -1 || s === false) && pr(n[0]) ? (n[0] = j(n[0]), r[t](...n)) : s;
      }
      function St(e, t, n = []) {
        He(), ar();
        const r = j(e)[t].apply(e, n);
        return fr(), We(), r;
      }
      const Wo = rr("__proto__,__v_isRef,__isVue"), Fs = new Set(Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(Le));
      function $o(e) {
        Le(e) || (e = String(e));
        const t = j(this);
        return se(t, "has", e), t.hasOwnProperty(e);
      }
      class Ls {
        constructor(t = false, n = false) {
          this._isReadonly = t, this._isShallow = n;
        }
        get(t, n, r) {
          if (n === "__v_skip") return t.__v_skip;
          const s = this._isReadonly, o = this._isShallow;
          if (n === "__v_isReactive") return !s;
          if (n === "__v_isReadonly") return s;
          if (n === "__v_isShallow") return o;
          if (n === "__v_raw") return r === (s ? o ? ti : zs : o ? Us : Vs).get(t) || Object.getPrototypeOf(t) === Object.getPrototypeOf(r) ? t : void 0;
          const i = R(t);
          if (!s) {
            let a;
            if (i && (a = qo[n])) return a;
            if (n === "hasOwnProperty") return $o;
          }
          const c = Reflect.get(t, n, oe(t) ? t : r);
          return (Le(n) ? Fs.has(n) : Wo(n)) || (s || se(t, "get", n), o) ? c : oe(c) ? i && ir(n) ? c : c.value : J(c) ? s ? Bs(c) : br(c) : c;
        }
      }
      class Ds extends Ls {
        constructor(t = false) {
          super(false, t);
        }
        set(t, n, r, s) {
          let o = t[n];
          if (!this._isShallow) {
            const a = Je(o);
            if (!xe(r) && !Je(r) && (o = j(o), r = j(r)), !R(t) && oe(o) && !oe(r)) return a ? false : (o.value = r, true);
          }
          const i = R(t) && ir(n) ? Number(n) < t.length : q(t, n), c = Reflect.set(t, n, r, oe(t) ? t : s);
          return t === j(s) && (i ? Ye(r, o) && Ne(t, "set", n, r) : Ne(t, "add", n, r)), c;
        }
        deleteProperty(t, n) {
          const r = q(t, n);
          t[n];
          const s = Reflect.deleteProperty(t, n);
          return s && r && Ne(t, "delete", n, void 0), s;
        }
        has(t, n) {
          const r = Reflect.has(t, n);
          return (!Le(n) || !Fs.has(n)) && se(t, "has", n), r;
        }
        ownKeys(t) {
          return se(t, "iterate", R(t) ? "length" : ot), Reflect.ownKeys(t);
        }
      }
      class Ko extends Ls {
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
      const Go = new Ds(), ko = new Ko(), Yo = new Ds(true);
      const Yn = (e) => e, Yt = (e) => Reflect.getPrototypeOf(e);
      function Xo(e, t, n) {
        return function(...r) {
          const s = this.__v_raw, o = j(s), i = dt(o), c = e === "entries" || e === Symbol.iterator && i, a = e === "keys" && i, u = s[e](...r), _ = n ? Yn : t ? fn : ne;
          return !t && se(o, "iterate", a ? kn : ot), {
            next() {
              const { value: b, done: C } = u.next();
              return C ? {
                value: b,
                done: C
              } : {
                value: c ? [
                  _(b[0]),
                  _(b[1])
                ] : _(b),
                done: C
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
      function Jo(e, t) {
        const n = {
          get(s) {
            const o = this.__v_raw, i = j(o), c = j(s);
            e || (Ye(s, c) && se(i, "get", s), se(i, "get", c));
            const { has: a } = Yt(i), u = t ? Yn : e ? fn : ne;
            if (a.call(i, s)) return u(o.get(s));
            if (a.call(i, c)) return u(o.get(c));
            o !== i && o.get(s);
          },
          get size() {
            const s = this.__v_raw;
            return !e && se(j(s), "iterate", ot), Reflect.get(s, "size", s);
          },
          has(s) {
            const o = this.__v_raw, i = j(o), c = j(s);
            return e || (Ye(s, c) && se(i, "has", s), se(i, "has", c)), s === c ? o.has(s) : o.has(s) || o.has(c);
          },
          forEach(s, o) {
            const i = this, c = i.__v_raw, a = j(c), u = t ? Yn : e ? fn : ne;
            return !e && se(a, "iterate", ot), c.forEach((_, b) => s.call(o, u(_), u(b), i));
          }
        };
        return ie(n, e ? {
          add: Xt("add"),
          set: Xt("set"),
          delete: Xt("delete"),
          clear: Xt("clear")
        } : {
          add(s) {
            !t && !xe(s) && !Je(s) && (s = j(s));
            const o = j(this);
            return Yt(o).has.call(o, s) || (o.add(s), Ne(o, "add", s, s)), this;
          },
          set(s, o) {
            !t && !xe(o) && !Je(o) && (o = j(o));
            const i = j(this), { has: c, get: a } = Yt(i);
            let u = c.call(i, s);
            u || (s = j(s), u = c.call(i, s));
            const _ = a.call(i, s);
            return i.set(s, o), u ? Ye(o, _) && Ne(i, "set", s, o) : Ne(i, "add", s, o), this;
          },
          delete(s) {
            const o = j(this), { has: i, get: c } = Yt(o);
            let a = i.call(o, s);
            a || (s = j(s), a = i.call(o, s)), c && c.call(o, s);
            const u = o.delete(s);
            return a && Ne(o, "delete", s, void 0), u;
          },
          clear() {
            const s = j(this), o = s.size !== 0, i = s.clear();
            return o && Ne(s, "clear", void 0, void 0), i;
          }
        }), [
          "keys",
          "values",
          "entries",
          Symbol.iterator
        ].forEach((s) => {
          n[s] = Xo(s, e, t);
        }), n;
      }
      function dr(e, t) {
        const n = Jo(e, t);
        return (r, s, o) => s === "__v_isReactive" ? !e : s === "__v_isReadonly" ? e : s === "__v_raw" ? r : Reflect.get(q(n, s) && s in r ? n : r, s, o);
      }
      const Qo = {
        get: dr(false, false)
      }, Zo = {
        get: dr(false, true)
      }, ei = {
        get: dr(true, false)
      };
      const Vs = /* @__PURE__ */ new WeakMap(), Us = /* @__PURE__ */ new WeakMap(), zs = /* @__PURE__ */ new WeakMap(), ti = /* @__PURE__ */ new WeakMap();
      function ni(e) {
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
      function ri(e) {
        return e.__v_skip || !Object.isExtensible(e) ? 0 : ni(Po(e));
      }
      function br(e) {
        return Je(e) ? e : gr(e, false, Go, Qo, Vs);
      }
      function si(e) {
        return gr(e, false, Yo, Zo, Us);
      }
      function Bs(e) {
        return gr(e, true, ko, ei, zs);
      }
      function gr(e, t, n, r, s) {
        if (!J(e) || e.__v_raw && !(t && e.__v_isReactive)) return e;
        const o = ri(e);
        if (o === 0) return e;
        const i = s.get(e);
        if (i) return i;
        const c = new Proxy(e, o === 2 ? r : n);
        return s.set(e, c), c;
      }
      function bt(e) {
        return Je(e) ? bt(e.__v_raw) : !!(e && e.__v_isReactive);
      }
      function Je(e) {
        return !!(e && e.__v_isReadonly);
      }
      function xe(e) {
        return !!(e && e.__v_isShallow);
      }
      function pr(e) {
        return e ? !!e.__v_raw : false;
      }
      function j(e) {
        const t = e && e.__v_raw;
        return t ? j(t) : e;
      }
      function oi(e) {
        return !q(e, "__v_skip") && Object.isExtensible(e) && Wn(e, "__v_skip", true), e;
      }
      const ne = (e) => J(e) ? br(e) : e, fn = (e) => J(e) ? Bs(e) : e;
      function oe(e) {
        return e ? e.__v_isRef === true : false;
      }
      function Rt(e) {
        return ii(e, false);
      }
      function ii(e, t) {
        return oe(e) ? e : new ci(e, t);
      }
      class ci {
        constructor(t, n) {
          this.dep = new ur(), this.__v_isRef = true, this.__v_isShallow = false, this._rawValue = n ? t : j(t), this._value = n ? t : ne(t), this.__v_isShallow = n;
        }
        get value() {
          return this.dep.track(), this._value;
        }
        set value(t) {
          const n = this._rawValue, r = this.__v_isShallow || xe(t) || Je(t);
          t = r ? t : j(t), Ye(t, n) && (this._rawValue = t, this._value = r ? t : ne(t), this.dep.trigger());
        }
      }
      function li(e) {
        return oe(e) ? e.value : e;
      }
      const ai = {
        get: (e, t, n) => t === "__v_raw" ? e : li(Reflect.get(e, t, n)),
        set: (e, t, n, r) => {
          const s = e[t];
          return oe(s) && !oe(n) ? (s.value = n, true) : Reflect.set(e, t, n, r);
        }
      };
      function Ns(e) {
        return bt(e) ? e : new Proxy(e, ai);
      }
      class fi {
        constructor(t, n, r) {
          this.fn = t, this.setter = n, this._value = void 0, this.dep = new ur(this), this.__v_isRef = true, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = zt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = r;
        }
        notify() {
          if (this.flags |= 16, !(this.flags & 8) && Y !== this) return Ps(this, true), true;
        }
        get value() {
          const t = this.dep.track();
          return As(this), t && (t.version = this.dep.version), this._value;
        }
        set value(t) {
          this.setter && this.setter(t);
        }
      }
      function _i(e, t, n = false) {
        let r, s;
        return L(e) ? r = e : (r = e.get, s = e.set), new fi(r, s, n);
      }
      const Jt = {}, _n = /* @__PURE__ */ new WeakMap();
      let rt;
      function ui(e, t = false, n = rt) {
        if (n) {
          let r = _n.get(n);
          r || _n.set(n, r = []), r.push(e);
        }
      }
      function di(e, t, n = $) {
        const { immediate: r, deep: s, once: o, scheduler: i, augmentJob: c, call: a } = n, u = (E) => s ? E : xe(E) || s === false || s === 0 ? je(E, 1) : je(E);
        let _, b, C, P, A = false, y = false;
        if (oe(e) ? (b = () => e.value, A = xe(e)) : bt(e) ? (b = () => u(e), A = true) : R(e) ? (y = true, A = e.some((E) => bt(E) || xe(E)), b = () => e.map((E) => {
          if (oe(E)) return E.value;
          if (bt(E)) return u(E);
          if (L(E)) return a ? a(E, 2) : E();
        })) : L(e) ? t ? b = a ? () => a(e, 2) : e : b = () => {
          if (C) {
            He();
            try {
              C();
            } finally {
              We();
            }
          }
          const E = rt;
          rt = _;
          try {
            return a ? a(e, 3, [
              P
            ]) : e(P);
          } finally {
            rt = E;
          }
        } : b = Fe, t && s) {
          const E = b, N = s === true ? 1 / 0 : s;
          b = () => je(E(), N);
        }
        const V = Bo(), B = () => {
          _.stop(), V && V.active && or(V.effects, _);
        };
        if (o && t) {
          const E = t;
          t = (...N) => {
            E(...N), B();
          };
        }
        let K = y ? new Array(e.length).fill(Jt) : Jt;
        const F = (E) => {
          if (!(!(_.flags & 1) || !_.dirty && !E)) if (t) {
            const N = _.run();
            if (s || A || (y ? N.some((pe, te) => Ye(pe, K[te])) : Ye(N, K))) {
              C && C();
              const pe = rt;
              rt = _;
              try {
                const te = [
                  N,
                  K === Jt ? void 0 : y && K[0] === Jt ? [] : K,
                  P
                ];
                K = N, a ? a(t, 3, te) : t(...te);
              } finally {
                rt = pe;
              }
            }
          } else _.run();
        };
        return c && c(F), _ = new Es(b), _.scheduler = i ? () => i(F, false) : F, P = (E) => ui(E, false, _), C = _.onStop = () => {
          const E = _n.get(_);
          if (E) {
            if (a) a(E, 4);
            else for (const N of E) N();
            _n.delete(_);
          }
        }, t ? r ? F(true) : K = _.run() : i ? i(F.bind(null, true), true) : _.run(), B.pause = _.pause.bind(_), B.resume = _.resume.bind(_), B.stop = B, B;
      }
      function je(e, t = 1 / 0, n) {
        if (t <= 0 || !J(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e))) return e;
        if (n.add(e), t--, oe(e)) je(e.value, t, n);
        else if (R(e)) for (let r = 0; r < e.length; r++) je(e[r], t, n);
        else if (wn(e) || dt(e)) e.forEach((r) => {
          je(r, t, n);
        });
        else if (vs(e)) {
          for (const r in e) je(e[r], t, n);
          for (const r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && je(e[r], t, n);
        }
        return e;
      }
      function Wt(e, t, n, r) {
        try {
          return r ? e(...r) : e();
        } catch (s) {
          Cn(s, t, n);
        }
      }
      function De(e, t, n, r) {
        if (L(e)) {
          const s = Wt(e, t, n, r);
          return s && ms(s) && s.catch((o) => {
            Cn(o, t, n);
          }), s;
        }
        if (R(e)) {
          const s = [];
          for (let o = 0; o < e.length; o++) s.push(De(e[o], t, n, r));
          return s;
        }
      }
      function Cn(e, t, n, r = true) {
        const s = t ? t.vnode : null, { errorHandler: o, throwUnhandledErrorInProduction: i } = t && t.appContext.config || $;
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
          if (o) {
            He(), Wt(o, null, 10, [
              e,
              a,
              u
            ]), We();
            return;
          }
        }
        bi(e, n, s, r, i);
      }
      function bi(e, t, n, r = true, s = false) {
        if (s) throw e;
        console.error(e);
      }
      const fe = [];
      let Ae = -1;
      const gt = [];
      let Ge = null, _t = 0;
      const js = Promise.resolve();
      let un = null;
      function qs(e) {
        const t = un || js;
        return e ? t.then(this ? e.bind(this) : e) : t;
      }
      function gi(e) {
        let t = Ae + 1, n = fe.length;
        for (; t < n; ) {
          const r = t + n >>> 1, s = fe[r], o = Nt(s);
          o < e || o === e && s.flags & 2 ? t = r + 1 : n = r;
        }
        return t;
      }
      function hr(e) {
        if (!(e.flags & 1)) {
          const t = Nt(e), n = fe[fe.length - 1];
          !n || !(e.flags & 2) && t >= Nt(n) ? fe.push(e) : fe.splice(gi(t), 0, e), e.flags |= 1, Hs();
        }
      }
      function Hs() {
        un || (un = js.then($s));
      }
      function pi(e) {
        R(e) ? gt.push(...e) : Ge && e.id === -1 ? Ge.splice(_t + 1, 0, e) : e.flags & 1 || (gt.push(e), e.flags |= 1), Hs();
      }
      function Ur(e, t, n = Ae + 1) {
        for (; n < fe.length; n++) {
          const r = fe[n];
          if (r && r.flags & 2) {
            if (e && r.id !== e.uid) continue;
            fe.splice(n, 1), n--, r.flags & 4 && (r.flags &= -2), r(), r.flags & 4 || (r.flags &= -2);
          }
        }
      }
      function Ws(e) {
        if (gt.length) {
          const t = [
            ...new Set(gt)
          ].sort((n, r) => Nt(n) - Nt(r));
          if (gt.length = 0, Ge) {
            Ge.push(...t);
            return;
          }
          for (Ge = t, _t = 0; _t < Ge.length; _t++) {
            const n = Ge[_t];
            n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
          }
          Ge = null, _t = 0;
        }
      }
      const Nt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
      function $s(e) {
        try {
          for (Ae = 0; Ae < fe.length; Ae++) {
            const t = fe[Ae];
            t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), Wt(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
          }
        } finally {
          for (; Ae < fe.length; Ae++) {
            const t = fe[Ae];
            t && (t.flags &= -2);
          }
          Ae = -1, fe.length = 0, Ws(), un = null, (fe.length || gt.length) && $s();
        }
      }
      let ye = null, Ks = null;
      function dn(e) {
        const t = ye;
        return ye = e, Ks = e && e.type.__scopeId || null, t;
      }
      function hi(e, t = ye, n) {
        if (!t || e._n) return e;
        const r = (...s) => {
          r._d && Gr(-1);
          const o = dn(t);
          let i;
          try {
            i = e(...s);
          } finally {
            dn(o), r._d && Gr(1);
          }
          return i;
        };
        return r._n = true, r._c = true, r._d = true, r;
      }
      function zr(e, t) {
        if (ye === null) return e;
        const n = Mn(ye), r = e.dirs || (e.dirs = []);
        for (let s = 0; s < t.length; s++) {
          let [o, i, c, a = $] = t[s];
          o && (L(o) && (o = {
            mounted: o,
            updated: o
          }), o.deep && je(i), r.push({
            dir: o,
            instance: n,
            value: i,
            oldValue: void 0,
            arg: c,
            modifiers: a
          }));
        }
        return e;
      }
      function tt(e, t, n, r) {
        const s = e.dirs, o = t && t.dirs;
        for (let i = 0; i < s.length; i++) {
          const c = s[i];
          o && (c.oldValue = o[i].value);
          let a = c.dir[r];
          a && (He(), De(a, n, 8, [
            e.el,
            c,
            e,
            t
          ]), We());
        }
      }
      const mi = Symbol("_vte"), wi = (e) => e.__isTeleport;
      function mr(e, t) {
        e.shapeFlag & 6 && e.component ? (e.transition = t, mr(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
      }
      function wr(e, t) {
        return L(e) ? ie({
          name: e.name
        }, t, {
          setup: e
        }) : e;
      }
      function Gs(e) {
        e.ids = [
          e.ids[0] + e.ids[2]++ + "-",
          0,
          0
        ];
      }
      function It(e, t, n, r, s = false) {
        if (R(e)) {
          e.forEach((A, y) => It(A, t && (R(t) ? t[y] : t), n, r, s));
          return;
        }
        if (Ft(r) && !s) {
          r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && It(e, t, n, r.component.subTree);
          return;
        }
        const o = r.shapeFlag & 4 ? Mn(r.component) : r.el, i = s ? null : o, { i: c, r: a } = e, u = t && t.r, _ = c.refs === $ ? c.refs = {} : c.refs, b = c.setupState, C = j(b), P = b === $ ? () => false : (A) => q(C, A);
        if (u != null && u !== a && (ee(u) ? (_[u] = null, P(u) && (b[u] = null)) : oe(u) && (u.value = null)), L(a)) Wt(a, c, 12, [
          i,
          _
        ]);
        else {
          const A = ee(a), y = oe(a);
          if (A || y) {
            const V = () => {
              if (e.f) {
                const B = A ? P(a) ? b[a] : _[a] : a.value;
                s ? R(B) && or(B, o) : R(B) ? B.includes(o) || B.push(o) : A ? (_[a] = [
                  o
                ], P(a) && (b[a] = _[a])) : (a.value = [
                  o
                ], e.k && (_[e.k] = a.value));
              } else A ? (_[a] = i, P(a) && (b[a] = i)) : y && (a.value = i, e.k && (_[e.k] = i));
            };
            i ? (V.id = -1, we(V, n)) : V();
          }
        }
      }
      yn().requestIdleCallback;
      yn().cancelIdleCallback;
      const Ft = (e) => !!e.type.__asyncLoader, ks = (e) => e.type.__isKeepAlive;
      function vi(e, t) {
        Ys(e, "a", t);
      }
      function yi(e, t) {
        Ys(e, "da", t);
      }
      function Ys(e, t, n = _e) {
        const r = e.__wdc || (e.__wdc = () => {
          let s = n;
          for (; s; ) {
            if (s.isDeactivated) return;
            s = s.parent;
          }
          return e();
        });
        if (En(t, r, n), n) {
          let s = n.parent;
          for (; s && s.parent; ) ks(s.parent.vnode) && xi(r, t, n, s), s = s.parent;
        }
      }
      function xi(e, t, n, r) {
        const s = En(t, e, r, true);
        Xs(() => {
          or(r[t], s);
        }, n);
      }
      function En(e, t, n = _e, r = false) {
        if (n) {
          const s = n[e] || (n[e] = []), o = t.__weh || (t.__weh = (...i) => {
            He();
            const c = $t(n), a = De(t, n, e, i);
            return c(), We(), a;
          });
          return r ? s.unshift(o) : s.push(o), o;
        }
      }
      const $e = (e) => (t, n = _e) => {
        (!qt || e === "sp") && En(e, (...r) => t(...r), n);
      }, Si = $e("bm"), Tn = $e("m"), Ci = $e("bu"), Ei = $e("u"), Ti = $e("bum"), Xs = $e("um"), Pi = $e("sp"), Oi = $e("rtg"), Mi = $e("rtc");
      function Ai(e, t = _e) {
        En("ec", e, t);
      }
      const Ri = Symbol.for("v-ndc");
      function Ii(e, t, n, r) {
        let s;
        const o = n, i = R(e);
        if (i || ee(e)) {
          const c = i && bt(e);
          let a = false, u = false;
          c && (a = !xe(e), u = Je(e), e = Sn(e)), s = new Array(e.length);
          for (let _ = 0, b = e.length; _ < b; _++) s[_] = t(a ? u ? fn(ne(e[_])) : ne(e[_]) : e[_], _, void 0, o);
        } else if (typeof e == "number") {
          s = new Array(e);
          for (let c = 0; c < e; c++) s[c] = t(c + 1, c, void 0, o);
        } else if (J(e)) if (e[Symbol.iterator]) s = Array.from(e, (c, a) => t(c, a, void 0, o));
        else {
          const c = Object.keys(e);
          s = new Array(c.length);
          for (let a = 0, u = c.length; a < u; a++) {
            const _ = c[a];
            s[a] = t(e[_], _, a, o);
          }
        }
        else s = [];
        return s;
      }
      const Xn = (e) => e ? ho(e) ? Mn(e) : Xn(e.parent) : null, Lt = ie(/* @__PURE__ */ Object.create(null), {
        $: (e) => e,
        $el: (e) => e.vnode.el,
        $data: (e) => e.data,
        $props: (e) => e.props,
        $attrs: (e) => e.attrs,
        $slots: (e) => e.slots,
        $refs: (e) => e.refs,
        $parent: (e) => Xn(e.parent),
        $root: (e) => Xn(e.root),
        $host: (e) => e.ce,
        $emit: (e) => e.emit,
        $options: (e) => Qs(e),
        $forceUpdate: (e) => e.f || (e.f = () => {
          hr(e.update);
        }),
        $nextTick: (e) => e.n || (e.n = qs.bind(e.proxy)),
        $watch: (e) => ec.bind(e)
      }), Un = (e, t) => e !== $ && !e.__isScriptSetup && q(e, t), Fi = {
        get({ _: e }, t) {
          if (t === "__v_skip") return true;
          const { ctx: n, setupState: r, data: s, props: o, accessCache: i, type: c, appContext: a } = e;
          let u;
          if (t[0] !== "$") {
            const P = i[t];
            if (P !== void 0) switch (P) {
              case 1:
                return r[t];
              case 2:
                return s[t];
              case 4:
                return n[t];
              case 3:
                return o[t];
            }
            else {
              if (Un(r, t)) return i[t] = 1, r[t];
              if (s !== $ && q(s, t)) return i[t] = 2, s[t];
              if ((u = e.propsOptions[0]) && q(u, t)) return i[t] = 3, o[t];
              if (n !== $ && q(n, t)) return i[t] = 4, n[t];
              Jn && (i[t] = 0);
            }
          }
          const _ = Lt[t];
          let b, C;
          if (_) return t === "$attrs" && se(e.attrs, "get", ""), _(e);
          if ((b = c.__cssModules) && (b = b[t])) return b;
          if (n !== $ && q(n, t)) return i[t] = 4, n[t];
          if (C = a.config.globalProperties, q(C, t)) return C[t];
        },
        set({ _: e }, t, n) {
          const { data: r, setupState: s, ctx: o } = e;
          return Un(s, t) ? (s[t] = n, true) : r !== $ && q(r, t) ? (r[t] = n, true) : q(e.props, t) || t[0] === "$" && t.slice(1) in e ? false : (o[t] = n, true);
        },
        has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: s, propsOptions: o } }, i) {
          let c;
          return !!n[i] || e !== $ && q(e, i) || Un(t, i) || (c = o[0]) && q(c, i) || q(r, i) || q(Lt, i) || q(s.config.globalProperties, i);
        },
        defineProperty(e, t, n) {
          return n.get != null ? e._.accessCache[t] = 0 : q(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
        }
      };
      function Br(e) {
        return R(e) ? e.reduce((t, n) => (t[n] = null, t), {}) : e;
      }
      let Jn = true;
      function Li(e) {
        const t = Qs(e), n = e.proxy, r = e.ctx;
        Jn = false, t.beforeCreate && Nr(t.beforeCreate, e, "bc");
        const { data: s, computed: o, methods: i, watch: c, provide: a, inject: u, created: _, beforeMount: b, mounted: C, beforeUpdate: P, updated: A, activated: y, deactivated: V, beforeDestroy: B, beforeUnmount: K, destroyed: F, unmounted: E, render: N, renderTracked: pe, renderTriggered: te, errorCaptured: he, serverPrefetch: Ke, expose: Ue, inheritAttrs: Qe, components: lt, directives: Kt, filters: An } = t;
        if (u && Di(u, r, null), i) for (const Z in i) {
          const G = i[Z];
          L(G) && (r[Z] = G.bind(n));
        }
        if (s) {
          const Z = s.call(n, n);
          J(Z) && (e.data = br(Z));
        }
        if (Jn = true, o) for (const Z in o) {
          const G = o[Z], Ze = L(G) ? G.bind(n, n) : L(G.get) ? G.get.bind(n, n) : Fe, Gt = !L(G) && L(G.set) ? G.set.bind(n) : Fe, et = Pt({
            get: Ze,
            set: Gt
          });
          Object.defineProperty(r, Z, {
            enumerable: true,
            configurable: true,
            get: () => et.value,
            set: (Ee) => et.value = Ee
          });
        }
        if (c) for (const Z in c) Js(c[Z], r, n, Z);
        if (a) {
          const Z = L(a) ? a.call(n) : a;
          Reflect.ownKeys(Z).forEach((G) => {
            ji(G, Z[G]);
          });
        }
        _ && Nr(_, e, "c");
        function le(Z, G) {
          R(G) ? G.forEach((Ze) => Z(Ze.bind(n))) : G && Z(G.bind(n));
        }
        if (le(Si, b), le(Tn, C), le(Ci, P), le(Ei, A), le(vi, y), le(yi, V), le(Ai, he), le(Mi, pe), le(Oi, te), le(Ti, K), le(Xs, E), le(Pi, Ke), R(Ue)) if (Ue.length) {
          const Z = e.exposed || (e.exposed = {});
          Ue.forEach((G) => {
            Object.defineProperty(Z, G, {
              get: () => n[G],
              set: (Ze) => n[G] = Ze,
              enumerable: true
            });
          });
        } else e.exposed || (e.exposed = {});
        N && e.render === Fe && (e.render = N), Qe != null && (e.inheritAttrs = Qe), lt && (e.components = lt), Kt && (e.directives = Kt), Ke && Gs(e);
      }
      function Di(e, t, n = Fe) {
        R(e) && (e = Qn(e));
        for (const r in e) {
          const s = e[r];
          let o;
          J(s) ? "default" in s ? o = nn(s.from || r, s.default, true) : o = nn(s.from || r) : o = nn(s), oe(o) ? Object.defineProperty(t, r, {
            enumerable: true,
            configurable: true,
            get: () => o.value,
            set: (i) => o.value = i
          }) : t[r] = o;
        }
      }
      function Nr(e, t, n) {
        De(R(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
      }
      function Js(e, t, n, r) {
        let s = r.includes(".") ? _o(n, r) : () => n[r];
        if (ee(e)) {
          const o = t[e];
          L(o) && Bn(s, o);
        } else if (L(e)) Bn(s, e.bind(n));
        else if (J(e)) if (R(e)) e.forEach((o) => Js(o, t, n, r));
        else {
          const o = L(e.handler) ? e.handler.bind(n) : t[e.handler];
          L(o) && Bn(s, o, e);
        }
      }
      function Qs(e) {
        const t = e.type, { mixins: n, extends: r } = t, { mixins: s, optionsCache: o, config: { optionMergeStrategies: i } } = e.appContext, c = o.get(t);
        let a;
        return c ? a = c : !s.length && !n && !r ? a = t : (a = {}, s.length && s.forEach((u) => bn(a, u, i, true)), bn(a, t, i)), J(t) && o.set(t, a), a;
      }
      function bn(e, t, n, r = false) {
        const { mixins: s, extends: o } = t;
        o && bn(e, o, n, true), s && s.forEach((i) => bn(e, i, n, true));
        for (const i in t) if (!(r && i === "expose")) {
          const c = Vi[i] || n && n[i];
          e[i] = c ? c(e[i], t[i]) : t[i];
        }
        return e;
      }
      const Vi = {
        data: jr,
        props: qr,
        emits: qr,
        methods: Et,
        computed: Et,
        beforeCreate: ae,
        created: ae,
        beforeMount: ae,
        mounted: ae,
        beforeUpdate: ae,
        updated: ae,
        beforeDestroy: ae,
        beforeUnmount: ae,
        destroyed: ae,
        unmounted: ae,
        activated: ae,
        deactivated: ae,
        errorCaptured: ae,
        serverPrefetch: ae,
        components: Et,
        directives: Et,
        watch: zi,
        provide: jr,
        inject: Ui
      };
      function jr(e, t) {
        return t ? e ? function() {
          return ie(L(e) ? e.call(this, this) : e, L(t) ? t.call(this, this) : t);
        } : t : e;
      }
      function Ui(e, t) {
        return Et(Qn(e), Qn(t));
      }
      function Qn(e) {
        if (R(e)) {
          const t = {};
          for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
          return t;
        }
        return e;
      }
      function ae(e, t) {
        return e ? [
          ...new Set([].concat(e, t))
        ] : t;
      }
      function Et(e, t) {
        return e ? ie(/* @__PURE__ */ Object.create(null), e, t) : t;
      }
      function qr(e, t) {
        return e ? R(e) && R(t) ? [
          .../* @__PURE__ */ new Set([
            ...e,
            ...t
          ])
        ] : ie(/* @__PURE__ */ Object.create(null), Br(e), Br(t ?? {})) : t;
      }
      function zi(e, t) {
        if (!e) return t;
        if (!t) return e;
        const n = ie(/* @__PURE__ */ Object.create(null), e);
        for (const r in t) n[r] = ae(e[r], t[r]);
        return n;
      }
      function Zs() {
        return {
          app: null,
          config: {
            isNativeTag: Eo,
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
      let Bi = 0;
      function Ni(e, t) {
        return function(r, s = null) {
          L(r) || (r = ie({}, r)), s != null && !J(s) && (s = null);
          const o = Zs(), i = /* @__PURE__ */ new WeakSet(), c = [];
          let a = false;
          const u = o.app = {
            _uid: Bi++,
            _component: r,
            _props: s,
            _container: null,
            _context: o,
            _instance: null,
            version: xc,
            get config() {
              return o.config;
            },
            set config(_) {
            },
            use(_, ...b) {
              return i.has(_) || (_ && L(_.install) ? (i.add(_), _.install(u, ...b)) : L(_) && (i.add(_), _(u, ...b))), u;
            },
            mixin(_) {
              return o.mixins.includes(_) || o.mixins.push(_), u;
            },
            component(_, b) {
              return b ? (o.components[_] = b, u) : o.components[_];
            },
            directive(_, b) {
              return b ? (o.directives[_] = b, u) : o.directives[_];
            },
            mount(_, b, C) {
              if (!a) {
                const P = u._ceVNode || qe(r, s);
                return P.appContext = o, C === true ? C = "svg" : C === false && (C = void 0), e(P, _, C), a = true, u._container = _, _.__vue_app__ = u, Mn(P.component);
              }
            },
            onUnmount(_) {
              c.push(_);
            },
            unmount() {
              a && (De(c, u._instance, 16), e(null, u._container), delete u._container.__vue_app__);
            },
            provide(_, b) {
              return o.provides[_] = b, u;
            },
            runWithContext(_) {
              const b = pt;
              pt = u;
              try {
                return _();
              } finally {
                pt = b;
              }
            }
          };
          return u;
        };
      }
      let pt = null;
      function ji(e, t) {
        if (_e) {
          let n = _e.provides;
          const r = _e.parent && _e.parent.provides;
          r === n && (n = _e.provides = Object.create(r)), n[e] = t;
        }
      }
      function nn(e, t, n = false) {
        const r = pc();
        if (r || pt) {
          let s = pt ? pt._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
          if (s && e in s) return s[e];
          if (arguments.length > 1) return n && L(t) ? t.call(r && r.proxy) : t;
        }
      }
      const eo = {}, to = () => Object.create(eo), no = (e) => Object.getPrototypeOf(e) === eo;
      function qi(e, t, n, r = false) {
        const s = {}, o = to();
        e.propsDefaults = /* @__PURE__ */ Object.create(null), ro(e, t, s, o);
        for (const i in e.propsOptions[0]) i in s || (s[i] = void 0);
        n ? e.props = r ? s : si(s) : e.type.props ? e.props = s : e.props = o, e.attrs = o;
      }
      function Hi(e, t, n, r) {
        const { props: s, attrs: o, vnode: { patchFlag: i } } = e, c = j(s), [a] = e.propsOptions;
        let u = false;
        if ((r || i > 0) && !(i & 16)) {
          if (i & 8) {
            const _ = e.vnode.dynamicProps;
            for (let b = 0; b < _.length; b++) {
              let C = _[b];
              if (Pn(e.emitsOptions, C)) continue;
              const P = t[C];
              if (a) if (q(o, C)) P !== o[C] && (o[C] = P, u = true);
              else {
                const A = Xe(C);
                s[A] = Zn(a, c, A, P, e, false);
              }
              else P !== o[C] && (o[C] = P, u = true);
            }
          }
        } else {
          ro(e, t, s, o) && (u = true);
          let _;
          for (const b in c) (!t || !q(t, b) && ((_ = it(b)) === b || !q(t, _))) && (a ? n && (n[b] !== void 0 || n[_] !== void 0) && (s[b] = Zn(a, c, b, void 0, e, true)) : delete s[b]);
          if (o !== c) for (const b in o) (!t || !q(t, b)) && (delete o[b], u = true);
        }
        u && Ne(e.attrs, "set", "");
      }
      function ro(e, t, n, r) {
        const [s, o] = e.propsOptions;
        let i = false, c;
        if (t) for (let a in t) {
          if (Ot(a)) continue;
          const u = t[a];
          let _;
          s && q(s, _ = Xe(a)) ? !o || !o.includes(_) ? n[_] = u : (c || (c = {}))[_] = u : Pn(e.emitsOptions, a) || (!(a in r) || u !== r[a]) && (r[a] = u, i = true);
        }
        if (o) {
          const a = j(n), u = c || $;
          for (let _ = 0; _ < o.length; _++) {
            const b = o[_];
            n[b] = Zn(s, a, b, u[b], e, !q(u, b));
          }
        }
        return i;
      }
      function Zn(e, t, n, r, s, o) {
        const i = e[n];
        if (i != null) {
          const c = q(i, "default");
          if (c && r === void 0) {
            const a = i.default;
            if (i.type !== Function && !i.skipFactory && L(a)) {
              const { propsDefaults: u } = s;
              if (n in u) r = u[n];
              else {
                const _ = $t(s);
                r = u[n] = a.call(null, t), _();
              }
            } else r = a;
            s.ce && s.ce._setProp(n, r);
          }
          i[0] && (o && !c ? r = false : i[1] && (r === "" || r === it(n)) && (r = true));
        }
        return r;
      }
      const Wi = /* @__PURE__ */ new WeakMap();
      function so(e, t, n = false) {
        const r = n ? Wi : t.propsCache, s = r.get(e);
        if (s) return s;
        const o = e.props, i = {}, c = [];
        let a = false;
        if (!L(e)) {
          const _ = (b) => {
            a = true;
            const [C, P] = so(b, t, true);
            ie(i, C), P && c.push(...P);
          };
          !n && t.mixins.length && t.mixins.forEach(_), e.extends && _(e.extends), e.mixins && e.mixins.forEach(_);
        }
        if (!o && !a) return J(e) && r.set(e, ut), ut;
        if (R(o)) for (let _ = 0; _ < o.length; _++) {
          const b = Xe(o[_]);
          Hr(b) && (i[b] = $);
        }
        else if (o) for (const _ in o) {
          const b = Xe(_);
          if (Hr(b)) {
            const C = o[_], P = i[b] = R(C) || L(C) ? {
              type: C
            } : ie({}, C), A = P.type;
            let y = false, V = true;
            if (R(A)) for (let B = 0; B < A.length; ++B) {
              const K = A[B], F = L(K) && K.name;
              if (F === "Boolean") {
                y = true;
                break;
              } else F === "String" && (V = false);
            }
            else y = L(A) && A.name === "Boolean";
            P[0] = y, P[1] = V, (y || q(P, "default")) && c.push(b);
          }
        }
        const u = [
          i,
          c
        ];
        return J(e) && r.set(e, u), u;
      }
      function Hr(e) {
        return e[0] !== "$" && !Ot(e);
      }
      const vr = (e) => e === "_" || e === "__" || e === "_ctx" || e === "$stable", yr = (e) => R(e) ? e.map(Ie) : [
        Ie(e)
      ], $i = (e, t, n) => {
        if (t._n) return t;
        const r = hi((...s) => yr(t(...s)), n);
        return r._c = false, r;
      }, oo = (e, t, n) => {
        const r = e._ctx;
        for (const s in e) {
          if (vr(s)) continue;
          const o = e[s];
          if (L(o)) t[s] = $i(s, o, r);
          else if (o != null) {
            const i = yr(o);
            t[s] = () => i;
          }
        }
      }, io = (e, t) => {
        const n = yr(t);
        e.slots.default = () => n;
      }, co = (e, t, n) => {
        for (const r in t) (n || !vr(r)) && (e[r] = t[r]);
      }, Ki = (e, t, n) => {
        const r = e.slots = to();
        if (e.vnode.shapeFlag & 32) {
          const s = t.__;
          s && Wn(r, "__", s, true);
          const o = t._;
          o ? (co(r, t, n), n && Wn(r, "_", o, true)) : oo(t, r);
        } else t && io(e, t);
      }, Gi = (e, t, n) => {
        const { vnode: r, slots: s } = e;
        let o = true, i = $;
        if (r.shapeFlag & 32) {
          const c = t._;
          c ? n && c === 1 ? o = false : co(s, t, n) : (o = !t.$stable, oo(t, s)), i = t;
        } else t && (io(e, t), i = {
          default: 1
        });
        if (o) for (const c in s) !vr(c) && i[c] == null && delete s[c];
      }, we = cc;
      function ki(e) {
        return Yi(e);
      }
      function Yi(e, t) {
        const n = yn();
        n.__VUE__ = true;
        const { insert: r, remove: s, patchProp: o, createElement: i, createText: c, createComment: a, setText: u, setElementText: _, parentNode: b, nextSibling: C, setScopeId: P = Fe, insertStaticContent: A } = e, y = (l, f, d, h = null, g = null, p = null, x = void 0, v = null, w = !!f.dynamicChildren) => {
          if (l === f) return;
          l && !Ct(l, f) && (h = kt(l), Ee(l, g, p, true), l = null), f.patchFlag === -2 && (w = false, f.dynamicChildren = null);
          const { type: m, ref: M, shapeFlag: S } = f;
          switch (m) {
            case On:
              V(l, f, d, h);
              break;
            case mt:
              B(l, f, d, h);
              break;
            case Nn:
              l == null && K(f, d, h, x);
              break;
            case Re:
              lt(l, f, d, h, g, p, x, v, w);
              break;
            default:
              S & 1 ? N(l, f, d, h, g, p, x, v, w) : S & 6 ? Kt(l, f, d, h, g, p, x, v, w) : (S & 64 || S & 128) && m.process(l, f, d, h, g, p, x, v, w, yt);
          }
          M != null && g ? It(M, l && l.ref, p, f || l, !f) : M == null && l && l.ref != null && It(l.ref, null, p, l, true);
        }, V = (l, f, d, h) => {
          if (l == null) r(f.el = c(f.children), d, h);
          else {
            const g = f.el = l.el;
            f.children !== l.children && u(g, f.children);
          }
        }, B = (l, f, d, h) => {
          l == null ? r(f.el = a(f.children || ""), d, h) : f.el = l.el;
        }, K = (l, f, d, h) => {
          [l.el, l.anchor] = A(l.children, f, d, h, l.el, l.anchor);
        }, F = ({ el: l, anchor: f }, d, h) => {
          let g;
          for (; l && l !== f; ) g = C(l), r(l, d, h), l = g;
          r(f, d, h);
        }, E = ({ el: l, anchor: f }) => {
          let d;
          for (; l && l !== f; ) d = C(l), s(l), l = d;
          s(f);
        }, N = (l, f, d, h, g, p, x, v, w) => {
          f.type === "svg" ? x = "svg" : f.type === "math" && (x = "mathml"), l == null ? pe(f, d, h, g, p, x, v, w) : Ke(l, f, g, p, x, v, w);
        }, pe = (l, f, d, h, g, p, x, v) => {
          let w, m;
          const { props: M, shapeFlag: S, transition: O, dirs: I } = l;
          if (w = l.el = i(l.type, p, M && M.is, M), S & 8 ? _(w, l.children) : S & 16 && he(l.children, w, null, h, g, zn(l, p), x, v), I && tt(l, null, h, "created"), te(w, l, l.scopeId, x, h), M) {
            for (const k in M) k !== "value" && !Ot(k) && o(w, k, null, M[k], p, h);
            "value" in M && o(w, "value", null, M.value, p), (m = M.onVnodeBeforeMount) && Me(m, h, l);
          }
          I && tt(l, null, h, "beforeMount");
          const z = Xi(g, O);
          z && O.beforeEnter(w), r(w, f, d), ((m = M && M.onVnodeMounted) || z || I) && we(() => {
            m && Me(m, h, l), z && O.enter(w), I && tt(l, null, h, "mounted");
          }, g);
        }, te = (l, f, d, h, g) => {
          if (d && P(l, d), h) for (let p = 0; p < h.length; p++) P(l, h[p]);
          if (g) {
            let p = g.subTree;
            if (f === p || bo(p.type) && (p.ssContent === f || p.ssFallback === f)) {
              const x = g.vnode;
              te(l, x, x.scopeId, x.slotScopeIds, g.parent);
            }
          }
        }, he = (l, f, d, h, g, p, x, v, w = 0) => {
          for (let m = w; m < l.length; m++) {
            const M = l[m] = v ? ke(l[m]) : Ie(l[m]);
            y(null, M, f, d, h, g, p, x, v);
          }
        }, Ke = (l, f, d, h, g, p, x) => {
          const v = f.el = l.el;
          let { patchFlag: w, dynamicChildren: m, dirs: M } = f;
          w |= l.patchFlag & 16;
          const S = l.props || $, O = f.props || $;
          let I;
          if (d && nt(d, false), (I = O.onVnodeBeforeUpdate) && Me(I, d, f, l), M && tt(f, l, d, "beforeUpdate"), d && nt(d, true), (S.innerHTML && O.innerHTML == null || S.textContent && O.textContent == null) && _(v, ""), m ? Ue(l.dynamicChildren, m, v, d, h, zn(f, g), p) : x || G(l, f, v, null, d, h, zn(f, g), p, false), w > 0) {
            if (w & 16) Qe(v, S, O, d, g);
            else if (w & 2 && S.class !== O.class && o(v, "class", null, O.class, g), w & 4 && o(v, "style", S.style, O.style, g), w & 8) {
              const z = f.dynamicProps;
              for (let k = 0; k < z.length; k++) {
                const H = z[k], ue = S[H], de = O[H];
                (de !== ue || H === "value") && o(v, H, ue, de, g, d);
              }
            }
            w & 1 && l.children !== f.children && _(v, f.children);
          } else !x && m == null && Qe(v, S, O, d, g);
          ((I = O.onVnodeUpdated) || M) && we(() => {
            I && Me(I, d, f, l), M && tt(f, l, d, "updated");
          }, h);
        }, Ue = (l, f, d, h, g, p, x) => {
          for (let v = 0; v < f.length; v++) {
            const w = l[v], m = f[v], M = w.el && (w.type === Re || !Ct(w, m) || w.shapeFlag & 198) ? b(w.el) : d;
            y(w, m, M, null, h, g, p, x, true);
          }
        }, Qe = (l, f, d, h, g) => {
          if (f !== d) {
            if (f !== $) for (const p in f) !Ot(p) && !(p in d) && o(l, p, f[p], null, g, h);
            for (const p in d) {
              if (Ot(p)) continue;
              const x = d[p], v = f[p];
              x !== v && p !== "value" && o(l, p, v, x, g, h);
            }
            "value" in d && o(l, "value", f.value, d.value, g);
          }
        }, lt = (l, f, d, h, g, p, x, v, w) => {
          const m = f.el = l ? l.el : c(""), M = f.anchor = l ? l.anchor : c("");
          let { patchFlag: S, dynamicChildren: O, slotScopeIds: I } = f;
          I && (v = v ? v.concat(I) : I), l == null ? (r(m, d, h), r(M, d, h), he(f.children || [], d, M, g, p, x, v, w)) : S > 0 && S & 64 && O && l.dynamicChildren ? (Ue(l.dynamicChildren, O, d, g, p, x, v), (f.key != null || g && f === g.subTree) && lo(l, f, true)) : G(l, f, d, M, g, p, x, v, w);
        }, Kt = (l, f, d, h, g, p, x, v, w) => {
          f.slotScopeIds = v, l == null ? f.shapeFlag & 512 ? g.ctx.activate(f, d, h, x, w) : An(f, d, h, g, p, x, w) : Pr(l, f, w);
        }, An = (l, f, d, h, g, p, x) => {
          const v = l.component = gc(l, h, g);
          if (ks(l) && (v.ctx.renderer = yt), hc(v, false, x), v.asyncDep) {
            if (g && g.registerDep(v, le, x), !l.el) {
              const w = v.subTree = qe(mt);
              B(null, w, f, d), l.placeholder = w.el;
            }
          } else le(v, l, f, d, g, p, x);
        }, Pr = (l, f, d) => {
          const h = f.component = l.component;
          if (oc(l, f, d)) if (h.asyncDep && !h.asyncResolved) {
            Z(h, f, d);
            return;
          } else h.next = f, h.update();
          else f.el = l.el, h.vnode = f;
        }, le = (l, f, d, h, g, p, x) => {
          const v = () => {
            if (l.isMounted) {
              let { next: S, bu: O, u: I, parent: z, vnode: k } = l;
              {
                const Pe = ao(l);
                if (Pe) {
                  S && (S.el = k.el, Z(l, S, x)), Pe.asyncDep.then(() => {
                    l.isUnmounted || v();
                  });
                  return;
                }
              }
              let H = S, ue;
              nt(l, false), S ? (S.el = k.el, Z(l, S, x)) : S = k, O && tn(O), (ue = S.props && S.props.onVnodeBeforeUpdate) && Me(ue, z, S, k), nt(l, true);
              const de = $r(l), Te = l.subTree;
              l.subTree = de, y(Te, de, b(Te.el), kt(Te), l, g, p), S.el = de.el, H === null && ic(l, de.el), I && we(I, g), (ue = S.props && S.props.onVnodeUpdated) && we(() => Me(ue, z, S, k), g);
            } else {
              let S;
              const { el: O, props: I } = f, { bm: z, m: k, parent: H, root: ue, type: de } = l, Te = Ft(f);
              nt(l, false), z && tn(z), !Te && (S = I && I.onVnodeBeforeMount) && Me(S, H, f), nt(l, true);
              {
                ue.ce && ue.ce._def.shadowRoot !== false && ue.ce._injectChildStyle(de);
                const Pe = l.subTree = $r(l);
                y(null, Pe, d, h, l, g, p), f.el = Pe.el;
              }
              if (k && we(k, g), !Te && (S = I && I.onVnodeMounted)) {
                const Pe = f;
                we(() => Me(S, H, Pe), g);
              }
              (f.shapeFlag & 256 || H && Ft(H.vnode) && H.vnode.shapeFlag & 256) && l.a && we(l.a, g), l.isMounted = true, f = d = h = null;
            }
          };
          l.scope.on();
          const w = l.effect = new Es(v);
          l.scope.off();
          const m = l.update = w.run.bind(w), M = l.job = w.runIfDirty.bind(w);
          M.i = l, M.id = l.uid, w.scheduler = () => hr(M), nt(l, true), m();
        }, Z = (l, f, d) => {
          f.component = l;
          const h = l.vnode.props;
          l.vnode = f, l.next = null, Hi(l, f.props, h, d), Gi(l, f.children, d), He(), Ur(l), We();
        }, G = (l, f, d, h, g, p, x, v, w = false) => {
          const m = l && l.children, M = l ? l.shapeFlag : 0, S = f.children, { patchFlag: O, shapeFlag: I } = f;
          if (O > 0) {
            if (O & 128) {
              Gt(m, S, d, h, g, p, x, v, w);
              return;
            } else if (O & 256) {
              Ze(m, S, d, h, g, p, x, v, w);
              return;
            }
          }
          I & 8 ? (M & 16 && vt(m, g, p), S !== m && _(d, S)) : M & 16 ? I & 16 ? Gt(m, S, d, h, g, p, x, v, w) : vt(m, g, p, true) : (M & 8 && _(d, ""), I & 16 && he(S, d, h, g, p, x, v, w));
        }, Ze = (l, f, d, h, g, p, x, v, w) => {
          l = l || ut, f = f || ut;
          const m = l.length, M = f.length, S = Math.min(m, M);
          let O;
          for (O = 0; O < S; O++) {
            const I = f[O] = w ? ke(f[O]) : Ie(f[O]);
            y(l[O], I, d, null, g, p, x, v, w);
          }
          m > M ? vt(l, g, p, true, false, S) : he(f, d, h, g, p, x, v, w, S);
        }, Gt = (l, f, d, h, g, p, x, v, w) => {
          let m = 0;
          const M = f.length;
          let S = l.length - 1, O = M - 1;
          for (; m <= S && m <= O; ) {
            const I = l[m], z = f[m] = w ? ke(f[m]) : Ie(f[m]);
            if (Ct(I, z)) y(I, z, d, null, g, p, x, v, w);
            else break;
            m++;
          }
          for (; m <= S && m <= O; ) {
            const I = l[S], z = f[O] = w ? ke(f[O]) : Ie(f[O]);
            if (Ct(I, z)) y(I, z, d, null, g, p, x, v, w);
            else break;
            S--, O--;
          }
          if (m > S) {
            if (m <= O) {
              const I = O + 1, z = I < M ? f[I].el : h;
              for (; m <= O; ) y(null, f[m] = w ? ke(f[m]) : Ie(f[m]), d, z, g, p, x, v, w), m++;
            }
          } else if (m > O) for (; m <= S; ) Ee(l[m], g, p, true), m++;
          else {
            const I = m, z = m, k = /* @__PURE__ */ new Map();
            for (m = z; m <= O; m++) {
              const me = f[m] = w ? ke(f[m]) : Ie(f[m]);
              me.key != null && k.set(me.key, m);
            }
            let H, ue = 0;
            const de = O - z + 1;
            let Te = false, Pe = 0;
            const xt = new Array(de);
            for (m = 0; m < de; m++) xt[m] = 0;
            for (m = I; m <= S; m++) {
              const me = l[m];
              if (ue >= de) {
                Ee(me, g, p, true);
                continue;
              }
              let Oe;
              if (me.key != null) Oe = k.get(me.key);
              else for (H = z; H <= O; H++) if (xt[H - z] === 0 && Ct(me, f[H])) {
                Oe = H;
                break;
              }
              Oe === void 0 ? Ee(me, g, p, true) : (xt[Oe - z] = m + 1, Oe >= Pe ? Pe = Oe : Te = true, y(me, f[Oe], d, null, g, p, x, v, w), ue++);
            }
            const Ar = Te ? Ji(xt) : ut;
            for (H = Ar.length - 1, m = de - 1; m >= 0; m--) {
              const me = z + m, Oe = f[me], Rr = f[me + 1], Ir = me + 1 < M ? Rr.el || Rr.placeholder : h;
              xt[m] === 0 ? y(null, Oe, d, Ir, g, p, x, v, w) : Te && (H < 0 || m !== Ar[H] ? et(Oe, d, Ir, 2) : H--);
            }
          }
        }, et = (l, f, d, h, g = null) => {
          const { el: p, type: x, transition: v, children: w, shapeFlag: m } = l;
          if (m & 6) {
            et(l.component.subTree, f, d, h);
            return;
          }
          if (m & 128) {
            l.suspense.move(f, d, h);
            return;
          }
          if (m & 64) {
            x.move(l, f, d, yt);
            return;
          }
          if (x === Re) {
            r(p, f, d);
            for (let S = 0; S < w.length; S++) et(w[S], f, d, h);
            r(l.anchor, f, d);
            return;
          }
          if (x === Nn) {
            F(l, f, d);
            return;
          }
          if (h !== 2 && m & 1 && v) if (h === 0) v.beforeEnter(p), r(p, f, d), we(() => v.enter(p), g);
          else {
            const { leave: S, delayLeave: O, afterLeave: I } = v, z = () => {
              l.ctx.isUnmounted ? s(p) : r(p, f, d);
            }, k = () => {
              S(p, () => {
                z(), I && I();
              });
            };
            O ? O(p, z, k) : k();
          }
          else r(p, f, d);
        }, Ee = (l, f, d, h = false, g = false) => {
          const { type: p, props: x, ref: v, children: w, dynamicChildren: m, shapeFlag: M, patchFlag: S, dirs: O, cacheIndex: I } = l;
          if (S === -2 && (g = false), v != null && (He(), It(v, null, d, l, true), We()), I != null && (f.renderCache[I] = void 0), M & 256) {
            f.ctx.deactivate(l);
            return;
          }
          const z = M & 1 && O, k = !Ft(l);
          let H;
          if (k && (H = x && x.onVnodeBeforeUnmount) && Me(H, f, l), M & 6) Co(l.component, d, h);
          else {
            if (M & 128) {
              l.suspense.unmount(d, h);
              return;
            }
            z && tt(l, null, f, "beforeUnmount"), M & 64 ? l.type.remove(l, f, d, yt, h) : m && !m.hasOnce && (p !== Re || S > 0 && S & 64) ? vt(m, f, d, false, true) : (p === Re && S & 384 || !g && M & 16) && vt(w, f, d), h && Or(l);
          }
          (k && (H = x && x.onVnodeUnmounted) || z) && we(() => {
            H && Me(H, f, l), z && tt(l, null, f, "unmounted");
          }, d);
        }, Or = (l) => {
          const { type: f, el: d, anchor: h, transition: g } = l;
          if (f === Re) {
            So(d, h);
            return;
          }
          if (f === Nn) {
            E(l);
            return;
          }
          const p = () => {
            s(d), g && !g.persisted && g.afterLeave && g.afterLeave();
          };
          if (l.shapeFlag & 1 && g && !g.persisted) {
            const { leave: x, delayLeave: v } = g, w = () => x(d, p);
            v ? v(l.el, p, w) : w();
          } else p();
        }, So = (l, f) => {
          let d;
          for (; l !== f; ) d = C(l), s(l), l = d;
          s(f);
        }, Co = (l, f, d) => {
          const { bum: h, scope: g, job: p, subTree: x, um: v, m: w, a: m, parent: M, slots: { __: S } } = l;
          Wr(w), Wr(m), h && tn(h), M && R(S) && S.forEach((O) => {
            M.renderCache[O] = void 0;
          }), g.stop(), p && (p.flags |= 8, Ee(x, l, f, d)), v && we(v, f), we(() => {
            l.isUnmounted = true;
          }, f), f && f.pendingBranch && !f.isUnmounted && l.asyncDep && !l.asyncResolved && l.suspenseId === f.pendingId && (f.deps--, f.deps === 0 && f.resolve());
        }, vt = (l, f, d, h = false, g = false, p = 0) => {
          for (let x = p; x < l.length; x++) Ee(l[x], f, d, h, g);
        }, kt = (l) => {
          if (l.shapeFlag & 6) return kt(l.component.subTree);
          if (l.shapeFlag & 128) return l.suspense.next();
          const f = C(l.anchor || l.el), d = f && f[mi];
          return d ? C(d) : f;
        };
        let Rn = false;
        const Mr = (l, f, d) => {
          l == null ? f._vnode && Ee(f._vnode, null, null, true) : y(f._vnode || null, l, f, null, null, null, d), f._vnode = l, Rn || (Rn = true, Ur(), Ws(), Rn = false);
        }, yt = {
          p: y,
          um: Ee,
          m: et,
          r: Or,
          mt: An,
          mc: he,
          pc: G,
          pbc: Ue,
          n: kt,
          o: e
        };
        return {
          render: Mr,
          hydrate: void 0,
          createApp: Ni(Mr)
        };
      }
      function zn({ type: e, props: t }, n) {
        return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
      }
      function nt({ effect: e, job: t }, n) {
        n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
      }
      function Xi(e, t) {
        return (!e || e && !e.pendingBranch) && t && !t.persisted;
      }
      function lo(e, t, n = false) {
        const r = e.children, s = t.children;
        if (R(r) && R(s)) for (let o = 0; o < r.length; o++) {
          const i = r[o];
          let c = s[o];
          c.shapeFlag & 1 && !c.dynamicChildren && ((c.patchFlag <= 0 || c.patchFlag === 32) && (c = s[o] = ke(s[o]), c.el = i.el), !n && c.patchFlag !== -2 && lo(i, c)), c.type === On && (c.el = i.el), c.type === mt && !c.el && (c.el = i.el);
        }
      }
      function Ji(e) {
        const t = e.slice(), n = [
          0
        ];
        let r, s, o, i, c;
        const a = e.length;
        for (r = 0; r < a; r++) {
          const u = e[r];
          if (u !== 0) {
            if (s = n[n.length - 1], e[s] < u) {
              t[r] = s, n.push(r);
              continue;
            }
            for (o = 0, i = n.length - 1; o < i; ) c = o + i >> 1, e[n[c]] < u ? o = c + 1 : i = c;
            u < e[n[o]] && (o > 0 && (t[r] = n[o - 1]), n[o] = r);
          }
        }
        for (o = n.length, i = n[o - 1]; o-- > 0; ) n[o] = i, i = t[i];
        return n;
      }
      function ao(e) {
        const t = e.subTree.component;
        if (t) return t.asyncDep && !t.asyncResolved ? t : ao(t);
      }
      function Wr(e) {
        if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
      }
      const Qi = Symbol.for("v-scx"), Zi = () => nn(Qi);
      function Bn(e, t, n) {
        return fo(e, t, n);
      }
      function fo(e, t, n = $) {
        const { immediate: r, deep: s, flush: o, once: i } = n, c = ie({}, n), a = t && r || !t && o !== "post";
        let u;
        if (qt) {
          if (o === "sync") {
            const P = Zi();
            u = P.__watcherHandles || (P.__watcherHandles = []);
          } else if (!a) {
            const P = () => {
            };
            return P.stop = Fe, P.resume = Fe, P.pause = Fe, P;
          }
        }
        const _ = _e;
        c.call = (P, A, y) => De(P, _, A, y);
        let b = false;
        o === "post" ? c.scheduler = (P) => {
          we(P, _ && _.suspense);
        } : o !== "sync" && (b = true, c.scheduler = (P, A) => {
          A ? P() : hr(P);
        }), c.augmentJob = (P) => {
          t && (P.flags |= 4), b && (P.flags |= 2, _ && (P.id = _.uid, P.i = _));
        };
        const C = di(e, t, c);
        return qt && (u ? u.push(C) : a && C()), C;
      }
      function ec(e, t, n) {
        const r = this.proxy, s = ee(e) ? e.includes(".") ? _o(r, e) : () => r[e] : e.bind(r, r);
        let o;
        L(t) ? o = t : (o = t.handler, n = t);
        const i = $t(this), c = fo(s, o.bind(r), n);
        return i(), c;
      }
      function _o(e, t) {
        const n = t.split(".");
        return () => {
          let r = e;
          for (let s = 0; s < n.length && r; s++) r = r[n[s]];
          return r;
        };
      }
      const tc = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${Xe(t)}Modifiers`] || e[`${it(t)}Modifiers`];
      function nc(e, t, ...n) {
        if (e.isUnmounted) return;
        const r = e.vnode.props || $;
        let s = n;
        const o = t.startsWith("update:"), i = o && tc(r, t.slice(7));
        i && (i.trim && (s = n.map((_) => ee(_) ? _.trim() : _)), i.number && (s = n.map(an)));
        let c, a = r[c = In(t)] || r[c = In(Xe(t))];
        !a && o && (a = r[c = In(it(t))]), a && De(a, e, 6, s);
        const u = r[c + "Once"];
        if (u) {
          if (!e.emitted) e.emitted = {};
          else if (e.emitted[c]) return;
          e.emitted[c] = true, De(u, e, 6, s);
        }
      }
      function uo(e, t, n = false) {
        const r = t.emitsCache, s = r.get(e);
        if (s !== void 0) return s;
        const o = e.emits;
        let i = {}, c = false;
        if (!L(e)) {
          const a = (u) => {
            const _ = uo(u, t, true);
            _ && (c = true, ie(i, _));
          };
          !n && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
        }
        return !o && !c ? (J(e) && r.set(e, null), null) : (R(o) ? o.forEach((a) => i[a] = null) : ie(i, o), J(e) && r.set(e, i), i);
      }
      function Pn(e, t) {
        return !e || !mn(t) ? false : (t = t.slice(2).replace(/Once$/, ""), q(e, t[0].toLowerCase() + t.slice(1)) || q(e, it(t)) || q(e, t));
      }
      function $r(e) {
        const { type: t, vnode: n, proxy: r, withProxy: s, propsOptions: [o], slots: i, attrs: c, emit: a, render: u, renderCache: _, props: b, data: C, setupState: P, ctx: A, inheritAttrs: y } = e, V = dn(e);
        let B, K;
        try {
          if (n.shapeFlag & 4) {
            const E = s || r, N = E;
            B = Ie(u.call(N, E, _, b, P, C, A)), K = c;
          } else {
            const E = t;
            B = Ie(E.length > 1 ? E(b, {
              attrs: c,
              slots: i,
              emit: a
            }) : E(b, null)), K = t.props ? c : rc(c);
          }
        } catch (E) {
          Dt.length = 0, Cn(E, e, 1), B = qe(mt);
        }
        let F = B;
        if (K && y !== false) {
          const E = Object.keys(K), { shapeFlag: N } = F;
          E.length && N & 7 && (o && E.some(sr) && (K = sc(K, o)), F = wt(F, K, false, true));
        }
        return n.dirs && (F = wt(F, null, false, true), F.dirs = F.dirs ? F.dirs.concat(n.dirs) : n.dirs), n.transition && mr(F, n.transition), B = F, dn(V), B;
      }
      const rc = (e) => {
        let t;
        for (const n in e) (n === "class" || n === "style" || mn(n)) && ((t || (t = {}))[n] = e[n]);
        return t;
      }, sc = (e, t) => {
        const n = {};
        for (const r in e) (!sr(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
        return n;
      };
      function oc(e, t, n) {
        const { props: r, children: s, component: o } = e, { props: i, children: c, patchFlag: a } = t, u = o.emitsOptions;
        if (t.dirs || t.transition) return true;
        if (n && a >= 0) {
          if (a & 1024) return true;
          if (a & 16) return r ? Kr(r, i, u) : !!i;
          if (a & 8) {
            const _ = t.dynamicProps;
            for (let b = 0; b < _.length; b++) {
              const C = _[b];
              if (i[C] !== r[C] && !Pn(u, C)) return true;
            }
          }
        } else return (s || c) && (!c || !c.$stable) ? true : r === i ? false : r ? i ? Kr(r, i, u) : true : !!i;
        return false;
      }
      function Kr(e, t, n) {
        const r = Object.keys(t);
        if (r.length !== Object.keys(e).length) return true;
        for (let s = 0; s < r.length; s++) {
          const o = r[s];
          if (t[o] !== e[o] && !Pn(n, o)) return true;
        }
        return false;
      }
      function ic({ vnode: e, parent: t }, n) {
        for (; t; ) {
          const r = t.subTree;
          if (r.suspense && r.suspense.activeBranch === e && (r.el = e.el), r === e) (e = t.vnode).el = n, t = t.parent;
          else break;
        }
      }
      const bo = (e) => e.__isSuspense;
      function cc(e, t) {
        t && t.pendingBranch ? R(e) ? t.effects.push(...e) : t.effects.push(e) : pi(e);
      }
      const Re = Symbol.for("v-fgt"), On = Symbol.for("v-txt"), mt = Symbol.for("v-cmt"), Nn = Symbol.for("v-stc"), Dt = [];
      let ve = null;
      function Vt(e = false) {
        Dt.push(ve = e ? null : []);
      }
      function lc() {
        Dt.pop(), ve = Dt[Dt.length - 1] || null;
      }
      let jt = 1;
      function Gr(e, t = false) {
        jt += e, e < 0 && ve && t && (ve.hasOnce = true);
      }
      function ac(e) {
        return e.dynamicChildren = jt > 0 ? ve || ut : null, lc(), jt > 0 && ve && ve.push(e), e;
      }
      function Ut(e, t, n, r, s, o) {
        return ac(W(e, t, n, r, s, o, true));
      }
      function go(e) {
        return e ? e.__v_isVNode === true : false;
      }
      function Ct(e, t) {
        return e.type === t.type && e.key === t.key;
      }
      const po = ({ key: e }) => e ?? null, rn = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e != null ? ee(e) || oe(e) || L(e) ? {
        i: ye,
        r: e,
        k: t,
        f: !!n
      } : e : null);
      function W(e, t = null, n = null, r = 0, s = null, o = e === Re ? 0 : 1, i = false, c = false) {
        const a = {
          __v_isVNode: true,
          __v_skip: true,
          type: e,
          props: t,
          key: t && po(t),
          ref: t && rn(t),
          scopeId: Ks,
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
          dynamicProps: s,
          dynamicChildren: null,
          appContext: null,
          ctx: ye
        };
        return c ? (xr(a, n), o & 128 && e.normalize(a)) : n && (a.shapeFlag |= ee(n) ? 8 : 16), jt > 0 && !i && ve && (a.patchFlag > 0 || o & 6) && a.patchFlag !== 32 && ve.push(a), a;
      }
      const qe = fc;
      function fc(e, t = null, n = null, r = 0, s = null, o = false) {
        if ((!e || e === Ri) && (e = mt), go(e)) {
          const c = wt(e, t, true);
          return n && xr(c, n), jt > 0 && !o && ve && (c.shapeFlag & 6 ? ve[ve.indexOf(e)] = c : ve.push(c)), c.patchFlag = -2, c;
        }
        if (yc(e) && (e = e.__vccOpts), t) {
          t = _c(t);
          let { class: c, style: a } = t;
          c && !ee(c) && (t.class = lr(c)), J(a) && (pr(a) && !R(a) && (a = ie({}, a)), t.style = cr(a));
        }
        const i = ee(e) ? 1 : bo(e) ? 128 : wi(e) ? 64 : J(e) ? 4 : L(e) ? 2 : 0;
        return W(e, t, n, r, s, i, o, true);
      }
      function _c(e) {
        return e ? pr(e) || no(e) ? ie({}, e) : e : null;
      }
      function wt(e, t, n = false, r = false) {
        const { props: s, ref: o, patchFlag: i, children: c, transition: a } = e, u = t ? uc(s || {}, t) : s, _ = {
          __v_isVNode: true,
          __v_skip: true,
          type: e.type,
          props: u,
          key: u && po(u),
          ref: t && t.ref ? n && o ? R(o) ? o.concat(rn(t)) : [
            o,
            rn(t)
          ] : rn(t) : o,
          scopeId: e.scopeId,
          slotScopeIds: e.slotScopeIds,
          children: c,
          target: e.target,
          targetStart: e.targetStart,
          targetAnchor: e.targetAnchor,
          staticCount: e.staticCount,
          shapeFlag: e.shapeFlag,
          patchFlag: t && e.type !== Re ? i === -1 ? 16 : i | 16 : i,
          dynamicProps: e.dynamicProps,
          dynamicChildren: e.dynamicChildren,
          appContext: e.appContext,
          dirs: e.dirs,
          transition: a,
          component: e.component,
          suspense: e.suspense,
          ssContent: e.ssContent && wt(e.ssContent),
          ssFallback: e.ssFallback && wt(e.ssFallback),
          placeholder: e.placeholder,
          el: e.el,
          anchor: e.anchor,
          ctx: e.ctx,
          ce: e.ce
        };
        return a && r && mr(_, a.clone(_)), _;
      }
      function Tt(e = " ", t = 0) {
        return qe(On, null, e, t);
      }
      function Ie(e) {
        return e == null || typeof e == "boolean" ? qe(mt) : R(e) ? qe(Re, null, e.slice()) : go(e) ? ke(e) : qe(On, null, String(e));
      }
      function ke(e) {
        return e.el === null && e.patchFlag !== -1 || e.memo ? e : wt(e);
      }
      function xr(e, t) {
        let n = 0;
        const { shapeFlag: r } = e;
        if (t == null) t = null;
        else if (R(t)) n = 16;
        else if (typeof t == "object") if (r & 65) {
          const s = t.default;
          s && (s._c && (s._d = false), xr(e, s()), s._c && (s._d = true));
          return;
        } else {
          n = 32;
          const s = t._;
          !s && !no(t) ? t._ctx = ye : s === 3 && ye && (ye.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
        }
        else L(t) ? (t = {
          default: t,
          _ctx: ye
        }, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [
          Tt(t)
        ]) : n = 8);
        e.children = t, e.shapeFlag |= n;
      }
      function uc(...e) {
        const t = {};
        for (let n = 0; n < e.length; n++) {
          const r = e[n];
          for (const s in r) if (s === "class") t.class !== r.class && (t.class = lr([
            t.class,
            r.class
          ]));
          else if (s === "style") t.style = cr([
            t.style,
            r.style
          ]);
          else if (mn(s)) {
            const o = t[s], i = r[s];
            i && o !== i && !(R(o) && o.includes(i)) && (t[s] = o ? [].concat(o, i) : i);
          } else s !== "" && (t[s] = r[s]);
        }
        return t;
      }
      function Me(e, t, n, r = null) {
        De(e, t, 7, [
          n,
          r
        ]);
      }
      const dc = Zs();
      let bc = 0;
      function gc(e, t, n) {
        const r = e.type, s = (t ? t.appContext : e.appContext) || dc, o = {
          uid: bc++,
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
          scope: new zo(true),
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
          propsOptions: so(r, s),
          emitsOptions: uo(r, s),
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
        return o.ctx = {
          _: o
        }, o.root = t ? t.root : o, o.emit = nc.bind(null, o), e.ce && e.ce(o), o;
      }
      let _e = null;
      const pc = () => _e || ye;
      let gn, er;
      {
        const e = yn(), t = (n, r) => {
          let s;
          return (s = e[n]) || (s = e[n] = []), s.push(r), (o) => {
            s.length > 1 ? s.forEach((i) => i(o)) : s[0](o);
          };
        };
        gn = t("__VUE_INSTANCE_SETTERS__", (n) => _e = n), er = t("__VUE_SSR_SETTERS__", (n) => qt = n);
      }
      const $t = (e) => {
        const t = _e;
        return gn(e), e.scope.on(), () => {
          e.scope.off(), gn(t);
        };
      }, kr = () => {
        _e && _e.scope.off(), gn(null);
      };
      function ho(e) {
        return e.vnode.shapeFlag & 4;
      }
      let qt = false;
      function hc(e, t = false, n = false) {
        t && er(t);
        const { props: r, children: s } = e.vnode, o = ho(e);
        qi(e, r, o, t), Ki(e, s, n || t);
        const i = o ? mc(e, t) : void 0;
        return t && er(false), i;
      }
      function mc(e, t) {
        const n = e.type;
        e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Fi);
        const { setup: r } = n;
        if (r) {
          He();
          const s = e.setupContext = r.length > 1 ? vc(e) : null, o = $t(e), i = Wt(r, e, 0, [
            e.props,
            s
          ]), c = ms(i);
          if (We(), o(), (c || e.sp) && !Ft(e) && Gs(e), c) {
            if (i.then(kr, kr), t) return i.then((a) => {
              Yr(e, a);
            }).catch((a) => {
              Cn(a, e, 0);
            });
            e.asyncDep = i;
          } else Yr(e, i);
        } else mo(e);
      }
      function Yr(e, t, n) {
        L(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : J(t) && (e.setupState = Ns(t)), mo(e);
      }
      function mo(e, t, n) {
        const r = e.type;
        e.render || (e.render = r.render || Fe);
        {
          const s = $t(e);
          He();
          try {
            Li(e);
          } finally {
            We(), s();
          }
        }
      }
      const wc = {
        get(e, t) {
          return se(e, "get", ""), e[t];
        }
      };
      function vc(e) {
        const t = (n) => {
          e.exposed = n || {};
        };
        return {
          attrs: new Proxy(e.attrs, wc),
          slots: e.slots,
          emit: e.emit,
          expose: t
        };
      }
      function Mn(e) {
        return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Ns(oi(e.exposed)), {
          get(t, n) {
            if (n in t) return t[n];
            if (n in Lt) return Lt[n](e);
          },
          has(t, n) {
            return n in t || n in Lt;
          }
        })) : e.proxy;
      }
      function yc(e) {
        return L(e) && "__vccOpts" in e;
      }
      const Pt = (e, t) => _i(e, t, qt), xc = "3.5.18";
      let tr;
      const Xr = typeof window < "u" && window.trustedTypes;
      if (Xr) try {
        tr = Xr.createPolicy("vue", {
          createHTML: (e) => e
        });
      } catch {
      }
      const wo = tr ? (e) => tr.createHTML(e) : (e) => e, Sc = "http://www.w3.org/2000/svg", Cc = "http://www.w3.org/1998/Math/MathML", Be = typeof document < "u" ? document : null, Jr = Be && Be.createElement("template"), Ec = {
        insert: (e, t, n) => {
          t.insertBefore(e, n || null);
        },
        remove: (e) => {
          const t = e.parentNode;
          t && t.removeChild(e);
        },
        createElement: (e, t, n, r) => {
          const s = t === "svg" ? Be.createElementNS(Sc, e) : t === "mathml" ? Be.createElementNS(Cc, e) : n ? Be.createElement(e, {
            is: n
          }) : Be.createElement(e);
          return e === "select" && r && r.multiple != null && s.setAttribute("multiple", r.multiple), s;
        },
        createText: (e) => Be.createTextNode(e),
        createComment: (e) => Be.createComment(e),
        setText: (e, t) => {
          e.nodeValue = t;
        },
        setElementText: (e, t) => {
          e.textContent = t;
        },
        parentNode: (e) => e.parentNode,
        nextSibling: (e) => e.nextSibling,
        querySelector: (e) => Be.querySelector(e),
        setScopeId(e, t) {
          e.setAttribute(t, "");
        },
        insertStaticContent(e, t, n, r, s, o) {
          const i = n ? n.previousSibling : t.lastChild;
          if (s && (s === o || s.nextSibling)) for (; t.insertBefore(s.cloneNode(true), n), !(s === o || !(s = s.nextSibling)); ) ;
          else {
            Jr.innerHTML = wo(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
            const c = Jr.content;
            if (r === "svg" || r === "mathml") {
              const a = c.firstChild;
              for (; a.firstChild; ) c.appendChild(a.firstChild);
              c.removeChild(a);
            }
            t.insertBefore(c, n);
          }
          return [
            i ? i.nextSibling : t.firstChild,
            n ? n.previousSibling : t.lastChild
          ];
        }
      }, Tc = Symbol("_vtc");
      function Pc(e, t, n) {
        const r = e[Tc];
        r && (t = (t ? [
          t,
          ...r
        ] : [
          ...r
        ]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
      }
      const Qr = Symbol("_vod"), Oc = Symbol("_vsh"), Mc = Symbol(""), Ac = /(^|;)\s*display\s*:/;
      function Rc(e, t, n) {
        const r = e.style, s = ee(n);
        let o = false;
        if (n && !s) {
          if (t) if (ee(t)) for (const i of t.split(";")) {
            const c = i.slice(0, i.indexOf(":")).trim();
            n[c] == null && sn(r, c, "");
          }
          else for (const i in t) n[i] == null && sn(r, i, "");
          for (const i in n) i === "display" && (o = true), sn(r, i, n[i]);
        } else if (s) {
          if (t !== n) {
            const i = r[Mc];
            i && (n += ";" + i), r.cssText = n, o = Ac.test(n);
          }
        } else t && e.removeAttribute("style");
        Qr in e && (e[Qr] = o ? r.display : "", e[Oc] && (r.display = "none"));
      }
      const Zr = /\s*!important$/;
      function sn(e, t, n) {
        if (R(n)) n.forEach((r) => sn(e, t, r));
        else if (n == null && (n = ""), t.startsWith("--")) e.setProperty(t, n);
        else {
          const r = Ic(e, t);
          Zr.test(n) ? e.setProperty(it(r), n.replace(Zr, ""), "important") : e[r] = n;
        }
      }
      const es = [
        "Webkit",
        "Moz",
        "ms"
      ], jn = {};
      function Ic(e, t) {
        const n = jn[t];
        if (n) return n;
        let r = Xe(t);
        if (r !== "filter" && r in e) return jn[t] = r;
        r = ys(r);
        for (let s = 0; s < es.length; s++) {
          const o = es[s] + r;
          if (o in e) return jn[t] = o;
        }
        return t;
      }
      const ts = "http://www.w3.org/1999/xlink";
      function ns(e, t, n, r, s, o = Do(t)) {
        r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(ts, t.slice(6, t.length)) : e.setAttributeNS(ts, t, n) : n == null || o && !xs(n) ? e.removeAttribute(t) : e.setAttribute(t, o ? "" : Le(n) ? String(n) : n);
      }
      function rs(e, t, n, r, s) {
        if (t === "innerHTML" || t === "textContent") {
          n != null && (e[t] = t === "innerHTML" ? wo(n) : n);
          return;
        }
        const o = e.tagName;
        if (t === "value" && o !== "PROGRESS" && !o.includes("-")) {
          const c = o === "OPTION" ? e.getAttribute("value") || "" : e.value, a = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
          (c !== a || !("_value" in e)) && (e.value = a), n == null && e.removeAttribute(t), e._value = n;
          return;
        }
        let i = false;
        if (n === "" || n == null) {
          const c = typeof e[t];
          c === "boolean" ? n = xs(n) : n == null && c === "string" ? (n = "", i = true) : c === "number" && (n = 0, i = true);
        }
        try {
          e[t] = n;
        } catch {
        }
        i && e.removeAttribute(s || t);
      }
      function st(e, t, n, r) {
        e.addEventListener(t, n, r);
      }
      function Fc(e, t, n, r) {
        e.removeEventListener(t, n, r);
      }
      const ss = Symbol("_vei");
      function Lc(e, t, n, r, s = null) {
        const o = e[ss] || (e[ss] = {}), i = o[t];
        if (r && i) i.value = r;
        else {
          const [c, a] = Dc(t);
          if (r) {
            const u = o[t] = zc(r, s);
            st(e, c, u, a);
          } else i && (Fc(e, c, i, a), o[t] = void 0);
        }
      }
      const os = /(?:Once|Passive|Capture)$/;
      function Dc(e) {
        let t;
        if (os.test(e)) {
          t = {};
          let r;
          for (; r = e.match(os); ) e = e.slice(0, e.length - r[0].length), t[r[0].toLowerCase()] = true;
        }
        return [
          e[2] === ":" ? e.slice(3) : it(e.slice(2)),
          t
        ];
      }
      let qn = 0;
      const Vc = Promise.resolve(), Uc = () => qn || (Vc.then(() => qn = 0), qn = Date.now());
      function zc(e, t) {
        const n = (r) => {
          if (!r._vts) r._vts = Date.now();
          else if (r._vts <= n.attached) return;
          De(Bc(r, n.value), t, 5, [
            r
          ]);
        };
        return n.value = e, n.attached = Uc(), n;
      }
      function Bc(e, t) {
        if (R(t)) {
          const n = e.stopImmediatePropagation;
          return e.stopImmediatePropagation = () => {
            n.call(e), e._stopped = true;
          }, t.map((r) => (s) => !s._stopped && r && r(s));
        } else return t;
      }
      const is = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Nc = (e, t, n, r, s, o) => {
        const i = s === "svg";
        t === "class" ? Pc(e, r, i) : t === "style" ? Rc(e, n, r) : mn(t) ? sr(t) || Lc(e, t, n, r, o) : (t[0] === "." ? (t = t.slice(1), true) : t[0] === "^" ? (t = t.slice(1), false) : jc(e, t, r, i)) ? (rs(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && ns(e, t, r, i, o, t !== "value")) : e._isVueCE && (/[A-Z]/.test(t) || !ee(r)) ? rs(e, Xe(t), r, o, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), ns(e, t, r, i));
      };
      function jc(e, t, n, r) {
        if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && is(t) && L(n));
        if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return false;
        if (t === "width" || t === "height") {
          const s = e.tagName;
          if (s === "IMG" || s === "VIDEO" || s === "CANVAS" || s === "SOURCE") return false;
        }
        return is(t) && ee(n) ? false : t in e;
      }
      const pn = (e) => {
        const t = e.props["onUpdate:modelValue"] || false;
        return R(t) ? (n) => tn(t, n) : t;
      };
      function qc(e) {
        e.target.composing = true;
      }
      function cs(e) {
        const t = e.target;
        t.composing && (t.composing = false, t.dispatchEvent(new Event("input")));
      }
      const ht = Symbol("_assign"), Hc = {
        created(e, { modifiers: { lazy: t, trim: n, number: r } }, s) {
          e[ht] = pn(s);
          const o = r || s.props && s.props.type === "number";
          st(e, t ? "change" : "input", (i) => {
            if (i.target.composing) return;
            let c = e.value;
            n && (c = c.trim()), o && (c = an(c)), e[ht](c);
          }), n && st(e, "change", () => {
            e.value = e.value.trim();
          }), t || (st(e, "compositionstart", qc), st(e, "compositionend", cs), st(e, "change", cs));
        },
        mounted(e, { value: t }) {
          e.value = t ?? "";
        },
        beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: s, number: o } }, i) {
          if (e[ht] = pn(i), e.composing) return;
          const c = (o || e.type === "number") && !/^0\d/.test(e.value) ? an(e.value) : e.value, a = t ?? "";
          c !== a && (document.activeElement === e && e.type !== "range" && (r && t === n || s && e.value.trim() === a) || (e.value = a));
        }
      }, Wc = {
        deep: true,
        created(e, { value: t, modifiers: { number: n } }, r) {
          const s = wn(t);
          st(e, "change", () => {
            const o = Array.prototype.filter.call(e.options, (i) => i.selected).map((i) => n ? an(hn(i)) : hn(i));
            e[ht](e.multiple ? s ? new Set(o) : o : o[0]), e._assigning = true, qs(() => {
              e._assigning = false;
            });
          }), e[ht] = pn(r);
        },
        mounted(e, { value: t }) {
          ls(e, t);
        },
        beforeUpdate(e, t, n) {
          e[ht] = pn(n);
        },
        updated(e, { value: t }) {
          e._assigning || ls(e, t);
        }
      };
      function ls(e, t) {
        const n = e.multiple, r = R(t);
        if (!(n && !r && !wn(t))) {
          for (let s = 0, o = e.options.length; s < o; s++) {
            const i = e.options[s], c = hn(i);
            if (n) if (r) {
              const a = typeof c;
              a === "string" || a === "number" ? i.selected = t.some((u) => String(u) === String(c)) : i.selected = Uo(t, c) > -1;
            } else i.selected = t.has(c);
            else if (xn(hn(i), t)) {
              e.selectedIndex !== s && (e.selectedIndex = s);
              return;
            }
          }
          !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
        }
      }
      function hn(e) {
        return "_value" in e ? e._value : e.value;
      }
      const $c = ie({
        patchProp: Nc
      }, Ec);
      let as;
      function Kc() {
        return as || (as = ki($c));
      }
      const Gc = (...e) => {
        const t = Kc().createApp(...e), { mount: n } = t;
        return t.mount = (r) => {
          const s = Yc(r);
          if (!s) return;
          const o = t._component;
          !L(o) && !o.render && !o.template && (o.template = s.innerHTML), s.nodeType === 1 && (s.textContent = "");
          const i = n(s, false, kc(s));
          return s instanceof Element && (s.removeAttribute("v-cloak"), s.setAttribute("data-v-app", "")), i;
        }, t;
      };
      function kc(e) {
        if (e instanceof SVGElement) return "svg";
        if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
      }
      function Yc(e) {
        return ee(e) ? document.querySelector(e) : e;
      }
      const Xc = `
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
  var xy = rotate((fragCoord.x * 2.0 - 1.0)  * mandelbrot.aspect * mandelbrot.scale, (fragCoord.y * 2.0 - 1.0) * mandelbrot.scale, mandelbrot.angle);
  let x0 = xy.x + mandelbrot.cx;
  let y0 = xy.y + mandelbrot.cy;
  var dc = vec2<f32>(
       xy.x,
       xy.y
  );
  let res = mandelbrot_func(dc.x, dc.y);
  return vec4<f32>(res.x, res.y, 0.0, 1.0);
}











`, Jc = `struct Uniforms {
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
  let blurSamples = 16; // Nombre d'\xE9chantillons pour le blur
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
}`, Qc = "mandelbrot_bg-B_BXQ3QS.wasm", Zc = async (e = {}, t) => {
        let n;
        if (t.startsWith("data:")) {
          const r = t.replace(/^data:.*?base64,/, "");
          let s;
          if (typeof Buffer == "function" && typeof Buffer.from == "function") s = Buffer.from(r, "base64");
          else if (typeof atob == "function") {
            const o = atob(r);
            s = new Uint8Array(o.length);
            for (let i = 0; i < o.length; i++) s[i] = o.charCodeAt(i);
          } else throw new Error("Cannot decode base64-encoded data URL");
          n = await WebAssembly.instantiate(s, e);
        } else {
          const r = await fetch(t), s = r.headers.get("Content-Type") || "";
          if ("instantiateStreaming" in WebAssembly && s.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(r, e);
          else {
            const o = await r.arrayBuffer();
            n = await WebAssembly.instantiate(o, e);
          }
        }
        return n.instance.exports;
      };
      let T;
      function el(e) {
        T = e;
      }
      function ce(e) {
        return e == null;
      }
      function re(e) {
        const t = T.__externref_table_alloc();
        return T.__wbindgen_export_1.set(t, e), t;
      }
      let Qt = null;
      function on() {
        return (Qt === null || Qt.byteLength === 0) && (Qt = new Uint8Array(T.memory.buffer)), Qt;
      }
      const vo = typeof TextDecoder > "u" ? (0, module.require)("util").TextDecoder : TextDecoder;
      let cn = new vo("utf-8", {
        ignoreBOM: true,
        fatal: true
      });
      cn.decode();
      const tl = 2146435072;
      let Hn = 0;
      function nl(e, t) {
        return Hn += t, Hn >= tl && (cn = new vo("utf-8", {
          ignoreBOM: true,
          fatal: true
        }), cn.decode(), Hn = t), cn.decode(on().subarray(e, e + t));
      }
      function X(e, t) {
        return e = e >>> 0, nl(e, t);
      }
      function D(e, t) {
        try {
          return e.apply(this, t);
        } catch (n) {
          const r = re(n);
          T.__wbindgen_exn_store(r);
        }
      }
      let ge = 0;
      const rl = typeof TextEncoder > "u" ? (0, module.require)("util").TextEncoder : TextEncoder, ln = new rl("utf-8"), sl = typeof ln.encodeInto == "function" ? function(e, t) {
        return ln.encodeInto(e, t);
      } : function(e, t) {
        const n = ln.encode(e);
        return t.set(n), {
          read: e.length,
          written: n.length
        };
      };
      function Se(e, t, n) {
        if (n === void 0) {
          const c = ln.encode(e), a = t(c.length, 1) >>> 0;
          return on().subarray(a, a + c.length).set(c), ge = c.length, a;
        }
        let r = e.length, s = t(r, 1) >>> 0;
        const o = on();
        let i = 0;
        for (; i < r; i++) {
          const c = e.charCodeAt(i);
          if (c > 127) break;
          o[s + i] = c;
        }
        if (i !== r) {
          i !== 0 && (e = e.slice(i)), s = n(s, r, r = i + e.length * 3, 1) >>> 0;
          const c = on().subarray(s + i, s + r), a = sl(e, c);
          i += a.written, s = n(s, r, i, 1) >>> 0;
        }
        return ge = i, s;
      }
      let ft = null;
      function Q() {
        return (ft === null || ft.buffer.detached === true || ft.buffer.detached === void 0 && ft.buffer !== T.memory.buffer) && (ft = new DataView(T.memory.buffer)), ft;
      }
      const fs = typeof FinalizationRegistry > "u" ? {
        register: () => {
        },
        unregister: () => {
        }
      } : new FinalizationRegistry((e) => {
        T.__wbindgen_export_6.get(e.dtor)(e.a, e.b);
      });
      function Ve(e, t, n, r) {
        const s = {
          a: e,
          b: t,
          cnt: 1,
          dtor: n
        }, o = (...i) => {
          s.cnt++;
          const c = s.a;
          s.a = 0;
          try {
            return r(c, s.b, ...i);
          } finally {
            --s.cnt === 0 ? (T.__wbindgen_export_6.get(s.dtor)(c, s.b), fs.unregister(s)) : s.a = c;
          }
        };
        return o.original = s, fs.register(o, s, s), o;
      }
      function nr(e) {
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
          let o = "[";
          s > 0 && (o += nr(e[0]));
          for (let i = 1; i < s; i++) o += ", " + nr(e[i]);
          return o += "]", o;
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
      let Zt = null;
      function ol() {
        return (Zt === null || Zt.byteLength === 0) && (Zt = new Float64Array(T.memory.buffer)), Zt;
      }
      function _s(e, t) {
        return e = e >>> 0, ol().subarray(e / 8, e / 8 + t);
      }
      function il(e, t) {
        e = e >>> 0;
        const n = Q(), r = [];
        for (let s = e; s < e + 4 * t; s += 4) r.push(T.__wbindgen_export_1.get(n.getUint32(s, true)));
        return T.__externref_drop_slice(e, t), r;
      }
      function ct(e, t, n) {
        T.closure438_externref_shim(e, t, n);
      }
      function cl(e, t) {
        T.wasm_bindgen__convert__closures_____invoke__he0c36f5f951d360f(e, t);
      }
      function ll(e, t, n, r) {
        T.closure439_externref_shim(e, t, n, r);
      }
      function al(e, t, n) {
        T.closure486_externref_shim(e, t, n);
      }
      const fl = [
        "opaque",
        "premultiplied"
      ], Sr = [
        "load",
        "clear"
      ], _l = [
        "low-power",
        "high-performance"
      ], Cr = [
        "store",
        "discard"
      ], ul = [
        "all",
        "stencil-only",
        "depth-only"
      ], Er = [
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
      ], dl = [
        "1d",
        "2d",
        "2d-array",
        "cube",
        "cube-array",
        "3d"
      ], bl = [
        "border-box",
        "content-box",
        "device-pixel-content-box"
      ], gl = [
        "hidden",
        "visible"
      ], us = typeof FinalizationRegistry > "u" ? {
        register: () => {
        },
        unregister: () => {
        }
      } : new FinalizationRegistry((e) => T.__wbg_mandelbrotnavigator_free(e >>> 0, 1));
      class pl {
        __destroy_into_raw() {
          const t = this.__wbg_ptr;
          return this.__wbg_ptr = 0, us.unregister(this), t;
        }
        free() {
          const t = this.__destroy_into_raw();
          T.__wbg_mandelbrotnavigator_free(t, 0);
        }
        constructor(t, n, r, s) {
          const o = T.mandelbrotnavigator_new(t, n, r, s);
          return this.__wbg_ptr = o >>> 0, us.register(this, this.__wbg_ptr, this), this;
        }
        translate(t, n) {
          T.mandelbrotnavigator_translate(this.__wbg_ptr, t, n);
        }
        rotate(t) {
          T.mandelbrotnavigator_rotate(this.__wbg_ptr, t);
        }
        translate_direct(t, n) {
          T.mandelbrotnavigator_translate_direct(this.__wbg_ptr, t, n);
        }
        rotate_direct(t) {
          T.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, t);
        }
        zoom(t) {
          T.mandelbrotnavigator_zoom(this.__wbg_ptr, t);
        }
        step() {
          const t = T.mandelbrotnavigator_step(this.__wbg_ptr);
          var n = _s(t[0], t[1]).slice();
          return T.__wbindgen_free(t[0], t[1] * 8, 8), n;
        }
        get_params() {
          const t = T.mandelbrotnavigator_get_params(this.__wbg_ptr);
          var n = _s(t[0], t[1]).slice();
          return T.__wbindgen_free(t[0], t[1] * 8, 8), n;
        }
        compute_reference_orbit(t) {
          const n = T.mandelbrotnavigator_compute_reference_orbit(this.__wbg_ptr, t);
          var r = il(n[0], n[1]).slice();
          return T.__wbindgen_free(n[0], n[1] * 4, 4), r;
        }
      }
      const ds = typeof FinalizationRegistry > "u" ? {
        register: () => {
        },
        unregister: () => {
        }
      } : new FinalizationRegistry((e) => T.__wbg_mandelbrotstep_free(e >>> 0, 1));
      class Tr {
        static __wrap(t) {
          t = t >>> 0;
          const n = Object.create(Tr.prototype);
          return n.__wbg_ptr = t, ds.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
          const t = this.__wbg_ptr;
          return this.__wbg_ptr = 0, ds.unregister(this), t;
        }
        free() {
          const t = this.__destroy_into_raw();
          T.__wbg_mandelbrotstep_free(t, 0);
        }
        get zx() {
          return T.__wbg_get_mandelbrotstep_zx(this.__wbg_ptr);
        }
        set zx(t) {
          T.__wbg_set_mandelbrotstep_zx(this.__wbg_ptr, t);
        }
        get zy() {
          return T.__wbg_get_mandelbrotstep_zy(this.__wbg_ptr);
        }
        set zy(t) {
          T.__wbg_set_mandelbrotstep_zy(this.__wbg_ptr, t);
        }
        get dx() {
          return T.__wbg_get_mandelbrotstep_dx(this.__wbg_ptr);
        }
        set dx(t) {
          T.__wbg_set_mandelbrotstep_dx(this.__wbg_ptr, t);
        }
        get dy() {
          return T.__wbg_get_mandelbrotstep_dy(this.__wbg_ptr);
        }
        set dy(t) {
          T.__wbg_set_mandelbrotstep_dy(this.__wbg_ptr, t);
        }
      }
      function hl(e) {
        return e.Window;
      }
      function ml(e) {
        return e.Window;
      }
      function wl(e) {
        return e.WorkerGlobalScope;
      }
      function vl(e) {
        e.abort();
      }
      function yl(e) {
        const t = e.activeElement;
        return ce(t) ? 0 : re(t);
      }
      function xl() {
        return D(function(e, t, n, r) {
          e.addEventListener(X(t, n), r);
        }, arguments);
      }
      function Sl() {
        return D(function(e, t) {
          e.addListener(t);
        }, arguments);
      }
      function Cl(e) {
        return e.altKey;
      }
      function El(e) {
        return e.altKey;
      }
      function Tl(e, t, n) {
        return e.animate(t, n);
      }
      function Pl() {
        return D(function(e, t) {
          return e.appendChild(t);
        }, arguments);
      }
      function Ol() {
        return D(function(e, t) {
          return e.beginRenderPass(t);
        }, arguments);
      }
      function Ml(e) {
        return e.blockSize;
      }
      function Al(e) {
        const t = e.body;
        return ce(t) ? 0 : re(t);
      }
      function Rl(e, t) {
        const n = t.brand, r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
        Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
      }
      function Il(e) {
        return e.brands;
      }
      function Fl(e) {
        return e.button;
      }
      function Ll(e) {
        return e.buttons;
      }
      function Dl() {
        return D(function(e, t) {
          return e.call(t);
        }, arguments);
      }
      function Vl() {
        return D(function(e, t) {
          e.cancelAnimationFrame(t);
        }, arguments);
      }
      function Ul(e, t) {
        e.cancelIdleCallback(t >>> 0);
      }
      function zl(e) {
        e.cancel();
      }
      function Bl(e, t) {
        return e.catch(t);
      }
      function Nl(e, t) {
        e.clearTimeout(t);
      }
      function jl(e) {
        e.close();
      }
      function ql(e, t) {
        const n = t.code, r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
        Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
      }
      function Hl() {
        return D(function(e, t) {
          e.configure(t);
        }, arguments);
      }
      function Wl(e, t) {
        return e.contains(t);
      }
      function $l(e) {
        return e.contentRect;
      }
      function Kl(e, t) {
        return e.createCommandEncoder(t);
      }
      function Gl() {
        return D(function(e, t, n) {
          return e.createElement(X(t, n));
        }, arguments);
      }
      function kl() {
        return D(function(e, t) {
          const n = URL.createObjectURL(t), r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
          Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
        }, arguments);
      }
      function Yl() {
        return D(function(e, t) {
          return e.createView(t);
        }, arguments);
      }
      function Xl(e) {
        return e.ctrlKey;
      }
      function Jl(e) {
        return e.ctrlKey;
      }
      function Ql(e) {
        console.debug(e);
      }
      function Zl(e) {
        return e.deltaMode;
      }
      function ea(e) {
        return e.deltaX;
      }
      function ta(e) {
        return e.deltaY;
      }
      function na(e) {
        return e.devicePixelContentBoxSize;
      }
      function ra(e) {
        return e.devicePixelRatio;
      }
      function sa(e) {
        e.disconnect();
      }
      function oa(e) {
        e.disconnect();
      }
      function ia(e) {
        const t = e.document;
        return ce(t) ? 0 : re(t);
      }
      function ca(e) {
        e.end();
      }
      function la(e, t) {
        console.error(e, t);
      }
      function aa(e) {
        console.error(e);
      }
      function fa(e, t) {
        let n, r;
        try {
          n = e, r = t, console.error(X(e, t));
        } finally {
          T.__wbindgen_free(n, r, 1);
        }
      }
      function _a(e) {
        return e.finish();
      }
      function ua(e, t) {
        return e.finish(t);
      }
      function da() {
        return D(function(e) {
          e.focus();
        }, arguments);
      }
      function ba(e) {
        const t = e.fullscreenElement;
        return ce(t) ? 0 : re(t);
      }
      function ga(e) {
        return e.getCoalescedEvents;
      }
      function pa(e) {
        return e.getCoalescedEvents();
      }
      function ha() {
        return D(function(e, t) {
          const n = e.getComputedStyle(t);
          return ce(n) ? 0 : re(n);
        }, arguments);
      }
      function ma() {
        return D(function(e, t, n) {
          const r = e.getContext(X(t, n));
          return ce(r) ? 0 : re(r);
        }, arguments);
      }
      function wa() {
        return D(function(e, t, n) {
          const r = e.getContext(X(t, n));
          return ce(r) ? 0 : re(r);
        }, arguments);
      }
      function va() {
        return D(function(e) {
          return e.getCurrentTexture();
        }, arguments);
      }
      function ya(e, t, n) {
        const r = e.getElementById(X(t, n));
        return ce(r) ? 0 : re(r);
      }
      function xa(e, t) {
        return Object.getOwnPropertyDescriptor(e, t);
      }
      function Sa(e) {
        const t = e.getPreferredCanvasFormat();
        return (Er.indexOf(t) + 1 || 96) - 1;
      }
      function Ca() {
        return D(function(e, t, n, r) {
          const s = t.getPropertyValue(X(n, r)), o = Se(s, T.__wbindgen_malloc, T.__wbindgen_realloc), i = ge;
          Q().setInt32(e + 4, i, true), Q().setInt32(e + 0, o, true);
        }, arguments);
      }
      function Ea(e, t) {
        const n = e[t >>> 0];
        return ce(n) ? 0 : re(n);
      }
      function Ta(e, t) {
        return e[t >>> 0];
      }
      function Pa(e) {
        return e.gpu;
      }
      function Oa(e) {
        return e.height;
      }
      function Ma(e) {
        console.info(e);
      }
      function Aa(e) {
        return e.inlineSize;
      }
      function Ra(e) {
        let t;
        try {
          t = e instanceof GPUAdapter;
        } catch {
          t = false;
        }
        return t;
      }
      function Ia(e) {
        let t;
        try {
          t = e instanceof GPUCanvasContext;
        } catch {
          t = false;
        }
        return t;
      }
      function Fa(e) {
        let t;
        try {
          t = e instanceof Window;
        } catch {
          t = false;
        }
        return t;
      }
      function La(e) {
        return e.isIntersecting;
      }
      function Da(e, t) {
        return Object.is(e, t);
      }
      function Va(e, t) {
        const n = t.key, r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
        Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
      }
      function Ua(e, t) {
        const n = t.label, r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
        Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
      }
      function za(e) {
        return e.length;
      }
      function Ba(e) {
        return e.location;
      }
      function Na(e) {
        console.log(e);
      }
      function ja(e) {
        return Tr.__wrap(e);
      }
      function qa() {
        return D(function(e, t, n) {
          const r = e.matchMedia(X(t, n));
          return ce(r) ? 0 : re(r);
        }, arguments);
      }
      function Ha(e) {
        return e.matches;
      }
      function Wa(e, t) {
        const n = t.media, r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
        Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
      }
      function $a(e) {
        return e.metaKey;
      }
      function Ka(e) {
        return e.metaKey;
      }
      function Ga(e) {
        return e.movementX;
      }
      function ka(e) {
        return e.movementY;
      }
      function Ya(e) {
        return e.navigator;
      }
      function Xa(e) {
        return e.navigator;
      }
      function Ja() {
        return new Object();
      }
      function Qa() {
        return D(function() {
          return new AbortController();
        }, arguments);
      }
      function Za() {
        return D(function(e, t) {
          return new Worker(X(e, t));
        }, arguments);
      }
      function ef() {
        return new Array();
      }
      function tf() {
        return D(function(e) {
          return new IntersectionObserver(e);
        }, arguments);
      }
      function nf() {
        return D(function(e) {
          return new ResizeObserver(e);
        }, arguments);
      }
      function rf() {
        return new Error();
      }
      function sf() {
        return D(function() {
          return new MessageChannel();
        }, arguments);
      }
      function of(e, t) {
        return new Function(X(e, t));
      }
      function cf() {
        return D(function(e, t) {
          return new Blob(e, t);
        }, arguments);
      }
      function lf(e) {
        return e.now();
      }
      function af(e, t) {
        e.observe(t);
      }
      function ff(e, t, n) {
        e.observe(t, n);
      }
      function _f(e, t) {
        e.observe(t);
      }
      function uf(e) {
        return Array.of(e);
      }
      function df(e, t) {
        return Array.of(e, t);
      }
      function bf(e) {
        return e.offsetX;
      }
      function gf(e) {
        return e.offsetY;
      }
      function pf(e) {
        return e.performance;
      }
      function hf(e) {
        return e.persisted;
      }
      function mf(e) {
        e.play();
      }
      function wf(e) {
        return e.pointerId;
      }
      function vf(e, t) {
        const n = t.pointerType, r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
        Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
      }
      function yf(e) {
        return e.port1;
      }
      function xf(e) {
        return e.port2;
      }
      function Sf() {
        return D(function(e, t) {
          e.postMessage(t);
        }, arguments);
      }
      function Cf() {
        return D(function(e, t, n) {
          e.postMessage(t, n);
        }, arguments);
      }
      function Ef(e, t, n) {
        return e.postTask(t, n);
      }
      function Tf(e) {
        return e.pressure;
      }
      function Pf(e) {
        e.preventDefault();
      }
      function Of() {
        return ResizeObserverEntry.prototype;
      }
      function Mf(e, t) {
        return e.push(t);
      }
      function Af() {
        return D(function(e, t, n) {
          return e.querySelectorAll(X(t, n));
        }, arguments);
      }
      function Rf(e) {
        queueMicrotask(e);
      }
      function If(e, t) {
        e.queueMicrotask(t);
      }
      function Ff(e) {
        return e.queueMicrotask;
      }
      function Lf(e) {
        return e.queue;
      }
      function Df() {
        return D(function(e, t, n, r) {
          e.removeEventListener(X(t, n), r);
        }, arguments);
      }
      function Vf() {
        return D(function(e, t) {
          e.removeListener(t);
        }, arguments);
      }
      function Uf() {
        return D(function(e, t, n, r) {
          const s = t.removeProperty(X(n, r)), o = Se(s, T.__wbindgen_malloc, T.__wbindgen_realloc), i = ge;
          Q().setInt32(e + 4, i, true), Q().setInt32(e + 0, o, true);
        }, arguments);
      }
      function zf(e) {
        return e.repeat;
      }
      function Bf(e, t) {
        return e.requestAdapter(t);
      }
      function Nf() {
        return D(function(e, t) {
          return e.requestAnimationFrame(t);
        }, arguments);
      }
      function jf(e, t) {
        return e.requestDevice(t);
      }
      function qf(e) {
        return e.requestFullscreen;
      }
      function Hf(e) {
        return e.requestFullscreen();
      }
      function Wf(e) {
        return e.requestIdleCallback;
      }
      function $f() {
        return D(function(e, t) {
          return e.requestIdleCallback(t);
        }, arguments);
      }
      function Kf(e) {
        return Promise.resolve(e);
      }
      function Gf() {
        return D(function(e, t) {
          URL.revokeObjectURL(X(e, t));
        }, arguments);
      }
      function kf(e) {
        return e.scheduler;
      }
      function Yf(e) {
        return e.scheduler;
      }
      function Xf() {
        return D(function(e, t, n, r, s) {
          e.setAttribute(X(t, n), X(r, s));
        }, arguments);
      }
      function Jf() {
        return D(function(e, t) {
          e.setPointerCapture(t);
        }, arguments);
      }
      function Qf() {
        return D(function(e, t, n, r, s) {
          e.setProperty(X(t, n), X(r, s));
        }, arguments);
      }
      function Zf() {
        return D(function(e, t) {
          return e.setTimeout(t);
        }, arguments);
      }
      function e_() {
        return D(function(e, t, n) {
          return e.setTimeout(t, n);
        }, arguments);
      }
      function t_() {
        return D(function(e, t, n) {
          return Reflect.set(e, t, n);
        }, arguments);
      }
      function n_(e, t) {
        e.a = t;
      }
      function r_(e, t) {
        e.alphaMode = fl[t];
      }
      function s_(e, t) {
        e.arrayLayerCount = t >>> 0;
      }
      function o_(e, t) {
        e.aspect = ul[t];
      }
      function i_(e, t) {
        e.b = t;
      }
      function c_(e, t) {
        e.baseArrayLayer = t >>> 0;
      }
      function l_(e, t) {
        e.baseMipLevel = t >>> 0;
      }
      function a_(e, t) {
        e.beginningOfPassWriteIndex = t >>> 0;
      }
      function f_(e, t) {
        e.box = bl[t];
      }
      function __(e, t) {
        e.clearValue = t;
      }
      function u_(e, t) {
        e.colorAttachments = t;
      }
      function d_(e, t) {
        e.depthClearValue = t;
      }
      function b_(e, t) {
        e.depthLoadOp = Sr[t];
      }
      function g_(e, t) {
        e.depthReadOnly = t !== 0;
      }
      function p_(e, t) {
        e.depthStencilAttachment = t;
      }
      function h_(e, t) {
        e.depthStoreOp = Cr[t];
      }
      function m_(e, t) {
        e.device = t;
      }
      function w_(e, t) {
        e.dimension = dl[t];
      }
      function v_(e, t) {
        e.endOfPassWriteIndex = t >>> 0;
      }
      function y_(e, t) {
        e.format = Er[t];
      }
      function x_(e, t) {
        e.format = Er[t];
      }
      function S_(e, t) {
        e.g = t;
      }
      function C_(e, t) {
        e.height = t >>> 0;
      }
      function E_(e, t) {
        e.height = t >>> 0;
      }
      function T_(e, t, n) {
        e.label = X(t, n);
      }
      function P_(e, t, n) {
        e.label = X(t, n);
      }
      function O_(e, t, n) {
        e.label = X(t, n);
      }
      function M_(e, t, n) {
        e.label = X(t, n);
      }
      function A_(e, t, n) {
        e.label = X(t, n);
      }
      function R_(e, t) {
        e.loadOp = Sr[t];
      }
      function I_(e, t) {
        e.mipLevelCount = t >>> 0;
      }
      function F_(e, t) {
        e.onmessage = t;
      }
      function L_(e, t) {
        e.powerPreference = _l[t];
      }
      function D_(e, t) {
        e.querySet = t;
      }
      function V_(e, t) {
        e.r = t;
      }
      function U_(e, t) {
        e.requiredFeatures = t;
      }
      function z_(e, t) {
        e.resolveTarget = t;
      }
      function B_(e, t) {
        e.stencilClearValue = t >>> 0;
      }
      function N_(e, t) {
        e.stencilLoadOp = Sr[t];
      }
      function j_(e, t) {
        e.stencilReadOnly = t !== 0;
      }
      function q_(e, t) {
        e.stencilStoreOp = Cr[t];
      }
      function H_(e, t) {
        e.storeOp = Cr[t];
      }
      function W_(e, t) {
        e.timestampWrites = t;
      }
      function $_(e, t, n) {
        e.type = X(t, n);
      }
      function K_(e, t) {
        e.usage = t >>> 0;
      }
      function G_(e, t) {
        e.usage = t >>> 0;
      }
      function k_(e, t) {
        e.view = t;
      }
      function Y_(e, t) {
        e.view = t;
      }
      function X_(e, t) {
        e.viewFormats = t;
      }
      function J_(e, t) {
        e.width = t >>> 0;
      }
      function Q_(e, t) {
        e.width = t >>> 0;
      }
      function Z_(e) {
        return e.shiftKey;
      }
      function eu(e) {
        return e.shiftKey;
      }
      function tu(e) {
        return e.signal;
      }
      function nu(e, t) {
        const n = t.stack, r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
        Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
      }
      function ru(e) {
        e.start();
      }
      function su() {
        const e = typeof global > "u" ? null : global;
        return ce(e) ? 0 : re(e);
      }
      function ou() {
        const e = typeof globalThis > "u" ? null : globalThis;
        return ce(e) ? 0 : re(e);
      }
      function iu() {
        const e = typeof self > "u" ? null : self;
        return ce(e) ? 0 : re(e);
      }
      function cu() {
        const e = typeof window > "u" ? null : window;
        return ce(e) ? 0 : re(e);
      }
      function lu(e) {
        return e.style;
      }
      function au(e, t) {
        e.submit(t);
      }
      function fu(e, t, n) {
        return e.then(t, n);
      }
      function _u(e, t) {
        return e.then(t);
      }
      function uu(e, t) {
        e.unobserve(t);
      }
      function du(e) {
        const t = e.userAgentData;
        return ce(t) ? 0 : re(t);
      }
      function bu() {
        return D(function(e, t) {
          const n = t.userAgent, r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
          Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
        }, arguments);
      }
      function gu(e) {
        const t = e.visibilityState;
        return (gl.indexOf(t) + 1 || 3) - 1;
      }
      function pu(e) {
        console.warn(e);
      }
      function hu(e) {
        const t = e.webkitFullscreenElement;
        return ce(t) ? 0 : re(t);
      }
      function mu(e) {
        e.webkitRequestFullscreen();
      }
      function wu(e) {
        return e.width;
      }
      function vu(e) {
        const t = e.original;
        return t.cnt-- == 1 ? (t.a = 0, true) : false;
      }
      function yu(e, t, n) {
        return Ve(e, t, 304, ct);
      }
      function xu(e, t, n) {
        return Ve(e, t, 304, ct);
      }
      function Su(e, t, n) {
        return Ve(e, t, 304, cl);
      }
      function Cu(e, t, n) {
        return Ve(e, t, 304, ct);
      }
      function Eu(e, t, n) {
        return Ve(e, t, 304, ct);
      }
      function Tu(e, t, n) {
        return Ve(e, t, 304, ct);
      }
      function Pu(e, t, n) {
        return Ve(e, t, 304, ll);
      }
      function Ou(e, t, n) {
        return Ve(e, t, 304, ct);
      }
      function Mu(e, t, n) {
        return Ve(e, t, 304, ct);
      }
      function Au(e, t, n) {
        return Ve(e, t, 485, al);
      }
      function Ru(e, t) {
        const n = nr(t), r = Se(n, T.__wbindgen_malloc, T.__wbindgen_realloc), s = ge;
        Q().setInt32(e + 4, s, true), Q().setInt32(e + 0, r, true);
      }
      function Iu() {
        const e = T.__wbindgen_export_1, t = e.grow(4);
        e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
      }
      function Fu(e) {
        return typeof e == "function";
      }
      function Lu(e) {
        return e === null;
      }
      function Du(e) {
        return e === void 0;
      }
      function Vu(e) {
        return e;
      }
      function Uu(e, t) {
        return X(e, t);
      }
      function zu(e, t) {
        throw new Error(X(e, t));
      }
      URL = globalThis.URL;
      const U = await Zc({
        "./mandelbrot_bg.js": {
          __wbg_mandelbrotstep_new: ja,
          __wbg_new_8a6f238a6ece86ea: rf,
          __wbg_stack_0ed75d68575b0f3c: nu,
          __wbg_error_7534b8e9a36f1ab4: fa,
          __wbindgen_string_new: Uu,
          __wbg_queue_39d4f3bda761adef: Lf,
          __wbg_instanceof_GpuAdapter_fb230cdccb184887: Ra,
          __wbg_instanceof_GpuCanvasContext_48ec5330c4425d84: Ia,
          __wbg_Window_a4c5a48392f234ba: hl,
          __wbindgen_is_undefined: Du,
          __wbg_gpu_a6bce2913fb8f574: Pa,
          __wbg_WorkerGlobalScope_2b2b89e1ac952b50: wl,
          __wbg_setpowerpreference_229fffedb859fda8: L_,
          __wbg_requestAdapter_55d15e6d14e8392c: Bf,
          __wbindgen_number_new: Vu,
          __wbg_setrequiredfeatures_8135f6ab89e06b58: U_,
          __wbg_setlabel_a3e682ef8c10c947: M_,
          __wbg_requestDevice_66e864eaf1ffbb38: jf,
          __wbg_setlabel_53b47ffdebccf638: T_,
          __wbg_createCommandEncoder_f8056019328bd192: Kl,
          __wbg_submit_068b03683463d934: au,
          __wbg_setdimension_8523a7df804e7839: w_,
          __wbg_setformat_726ed8f81a287fdc: x_,
          __wbg_setaspect_4066a62e6528c589: o_,
          __wbg_setbasearraylayer_85c4780859e3e025: c_,
          __wbg_setarraylayercount_3a8ad1adab3aded1: s_,
          __wbg_setbasemiplevel_f90525112a282a1d: l_,
          __wbg_setmiplevelcount_9de96fe0db85420d: I_,
          __wbg_setlabel_95bae3d54f33d3c6: P_,
          __wbg_setusage_8a5ac4564d826d9d: G_,
          __wbg_setcolorattachments_6118b962baa6088d: u_,
          __wbg_setlabel_d5ff85faa53a8c67: A_,
          __wbg_setview_2ae2d88e6d071b88: k_,
          __wbg_setdepthclearvalue_e09b29c35f439d38: d_,
          __wbg_setdepthloadop_5292e3e4542c7770: b_,
          __wbg_setdepthstoreop_a7eddf1211b8cf40: h_,
          __wbg_setdepthreadonly_8e4aa6065b3f0cb1: g_,
          __wbg_setstencilclearvalue_1580738072a672c0: B_,
          __wbg_setstencilloadop_8486231257ee81bf: N_,
          __wbg_setstencilstoreop_39fcdf3cc001e427: q_,
          __wbg_setstencilreadonly_3f415ad876ffa592: j_,
          __wbg_setdepthstencilattachment_ef75a68ffe787e5a: p_,
          __wbg_setqueryset_1f0efa5a49a1b2ad: D_,
          __wbg_setbeginningofpasswriteindex_c8a62bc66645f5cd: a_,
          __wbg_setendofpasswriteindex_7e0b2037985d92b3: v_,
          __wbg_settimestampwrites_9c3e9dd8a3e800a1: W_,
          __wbg_setlabel_a1c8caea9f6c17d7: O_,
          __wbg_finish_ab9e01a922269f3a: ua,
          __wbg_finish_17a0b297901010d5: _a,
          __wbg_end_b9d7079f54620f76: ca,
          __wbg_setusage_7ffa4257ea250d02: K_,
          __wbg_setalphamode_1192a40e9bd8c3aa: r_,
          __wbg_setviewformats_e21a9630b45aff68: X_,
          __wbg_configure_bced8e40e8dbaaa0: Hl,
          __wbg_getPreferredCanvasFormat_9aef34efead2aa08: Sa,
          __wbg_setdevice_44b06c4615b5e253: m_,
          __wbg_setformat_71f884d31aabe541: y_,
          __wbg_label_cda985b32d44cee0: Ua,
          __wbg_beginRenderPass_2bc62f5f78642ee0: Ol,
          __wbg_setloadop_15883d29f266b084: R_,
          __wbg_setstoreop_0e46dbc6c9712fbb: H_,
          __wbg_setview_5db167adcc0d1b9c: Y_,
          __wbg_setclearvalue_1d26e1b07873908a: __,
          __wbg_setresolvetarget_95ee5e55e47822ff: z_,
          __wbg_createView_0ce5c82d78f482df: Yl,
          __wbg_seta_add312ccdfbfaa2d: n_,
          __wbg_setb_162f487856c3bad9: i_,
          __wbg_setg_d7b95d11c12af1cb: S_,
          __wbg_setr_6ad5c6f67a5f5a57: V_,
          __wbg_getCurrentTexture_d64323b76f42d5e0: va,
          __wbindgen_is_null: Lu,
          __wbindgen_cb_drop: vu,
          __wbg_prototype_c28bca39c45aba9b: Of,
          __wbg_Window_d1bf622f71ff0629: ml,
          __wbg_scheduler_48482a9974eeacbd: kf,
          __wbg_scheduler_5156bb61cc1cf589: Yf,
          __wbg_requestIdleCallback_1b8d644ff564208f: Wf,
          __wbg_postTask_41d93e93941e4a3d: Ef,
          __wbg_requestFullscreen_9f0611438eb929cf: Hf,
          __wbg_cancel_09c394f0894744eb: zl,
          __wbg_animate_6ec571f163cf6f8d: Tl,
          __wbg_play_63bc12f42e16af91: mf,
          __wbg_userAgentData_f7b0e61c05c54315: du,
          __wbg_brands_a1e7a2bce052128f: Il,
          __wbg_brand_9562792cbb4735c3: Rl,
          __wbg_webkitRequestFullscreen_23664c63833ff0e5: mu,
          __wbg_webkitFullscreenElement_a9ca38b7214d1567: hu,
          __wbg_requestFullscreen_86fc6cdb76000482: qf,
          __wbg_getCoalescedEvents_21492912fd0145ec: ga,
          __wbg_offsetX_cb6a38e6f23cb4a6: bf,
          __wbg_offsetY_43e21941c5c1f8bf: gf,
          __wbg_instanceof_Window_68f3f67bad1729c1: Fa,
          __wbg_document_62abd3e2b80cbd9e: ia,
          __wbg_navigator_fc64ba1417939b25: Xa,
          __wbg_devicePixelRatio_7554ba36d09d8a66: ra,
          __wbg_cancelIdleCallback_9b66ad1125399aa6: Ul,
          __wbg_getComputedStyle_9fc8631272abb86e: ha,
          __wbg_matchMedia_f6fead5956885195: qa,
          __wbg_requestIdleCallback_c35f99c6231482bf: $f,
          __wbg_cancelAnimationFrame_2939f00622bc7c28: Vl,
          __wbg_requestAnimationFrame_72e2268c983f0d5f: Nf,
          __wbg_clearTimeout_0e9bd2c8f258ce4f: Nl,
          __wbg_queueMicrotask_59501fe9a6b8d8ee: If,
          __wbg_setTimeout_3d31e18f97884f39: Zf,
          __wbg_setTimeout_906fea9a7279f446: e_,
          __wbg_body_9ce0d68f6f8c4231: Al,
          __wbg_visibilityState_dd2c8013a31cb756: gu,
          __wbg_activeElement_417ce7a406f87caf: yl,
          __wbg_fullscreenElement_a2a202d0893a4ef5: ba,
          __wbg_createElement_12aa94dc33c0480f: Gl,
          __wbg_getElementById_6cd98fa4e2fb8b6b: ya,
          __wbg_querySelectorAll_bf71c6b256d38064: Af,
          __wbg_setAttribute_a6637d7afe48112f: Xf,
          __wbg_setPointerCapture_f10920002f94ccd0: Jf,
          __wbg_navigator_6db993f5ffeb46be: Ya,
          __wbg_style_7337fe001c46487c: lu,
          __wbg_focus_7e6c35083244cb6b: da,
          __wbg_debug_58d16ea352cfbca1: Ql,
          __wbg_error_51ecdd39ec054205: aa,
          __wbg_error_3ff20bae955209a0: la,
          __wbg_info_e56933705c348038: Ma,
          __wbg_log_ea240990d83e374e: Na,
          __wbg_warn_d89f6637da554c8d: pu,
          __wbg_altKey_8061c4dfb9cbf7b5: Cl,
          __wbg_ctrlKey_c3f759e6fb63fb2a: Jl,
          __wbg_shiftKey_3b3f09be0981b1ca: Z_,
          __wbg_metaKey_19999df0b359ea8f: $a,
          __wbg_location_cfb228a81da1b65f: Ba,
          __wbg_repeat_c59d3b80fe1598a2: zf,
          __wbg_key_5513922ab1e29370: Va,
          __wbg_code_ad4515c48b5f1aaf: ql,
          __wbg_pointerId_5774d020c79f5884: wf,
          __wbg_pressure_ee2a32f0c7f9317e: Tf,
          __wbg_pointerType_abd719229e189ed2: vf,
          __wbg_getCoalescedEvents_96dfe2b07d566895: pa,
          __wbg_deltaX_47715e3350e678c7: ea,
          __wbg_deltaY_d604000d1ebb0302: ta,
          __wbg_deltaMode_f45b0b9e27b90093: Zl,
          __wbg_signal_b96223519a041faa: tu,
          __wbg_new_186abcfdff244e42: Qa,
          __wbg_abort_18ba44d46e13d7fe: vl,
          __wbg_setwidth_1d87b5f1ad4300d2: J_,
          __wbg_setheight_da5223b4d4959337: E_,
          __wbg_getContext_7413c456eda278ca: ma,
          __wbg_setwidth_5bf47b58bc81373a: Q_,
          __wbg_setheight_791d7ce190ad61bc: C_,
          __wbg_getContext_aaf9a2894cb5450a: wa,
          __wbg_settype_acc38e64fddb9e3f: $_,
          __wbg_ctrlKey_076cf4ddba3e2c92: Xl,
          __wbg_shiftKey_65139d3881002796: eu,
          __wbg_altKey_a8de3b788e0e0cc5: El,
          __wbg_metaKey_87f241cb3857b2f9: Ka,
          __wbg_button_c4f0997a075dca6d: Fl,
          __wbg_buttons_2043aaab9381999d: Ll,
          __wbg_movementX_403d2ff04d37d34d: Ga,
          __wbg_movementY_251f26255775513a: ka,
          __wbg_new_84e9d2d86df15a1d: nf,
          __wbg_disconnect_c2a6d2d7afb60ce0: oa,
          __wbg_observe_06c90ab1726206eb: af,
          __wbg_observe_441f29c8b714f51c: ff,
          __wbg_unobserve_54647103039cc2cd: uu,
          __wbg_setbox_e0ddaf0fda86f779: f_,
          __wbg_getPropertyValue_75e0d4c9d9783e7b: Ca,
          __wbg_removeProperty_3788f45eb83cc061: Uf,
          __wbg_setProperty_5ee26828600418f6: Qf,
          __wbg_port1_07c24e0cb319304d: yf,
          __wbg_port2_ec66cbab4bb1b459: xf,
          __wbg_new_bf07bde7f6e59bba: sf,
          __wbg_get_1fd2b7a6af84707b: Ea,
          __wbg_preventDefault_a063596d0087ba6f: Pf,
          __wbg_setonmessage_33b738c924fce1c0: F_,
          __wbg_close_b5b2d841121ac054: jl,
          __wbg_postMessage_451dfdc77bc899af: Sf,
          __wbg_start_634ff8fd50d7879f: ru,
          __wbg_userAgent_a24a493cd80cbd00: bu,
          __wbg_newwithstrsequenceandoptions_3c68d739cf8f35ce: cf,
          __wbg_width_1bfba151b991157a: wu,
          __wbg_height_f19f08278715086c: Oa,
          __wbg_createObjectURL_1acd82bf8749f5a9: kl,
          __wbg_revokeObjectURL_ffb9ce9155dbedaf: Gf,
          __wbg_addEventListener_011de4ce408fd067: xl,
          __wbg_removeEventListener_98ce9b0181ba8d74: Df,
          __wbg_media_bd25dea1442c481b: Wa,
          __wbg_matches_dc8f84665982e2f8: Ha,
          __wbg_addListener_0bfd1a45e577b82f: Sl,
          __wbg_removeListener_9c195437978158e9: Vf,
          __wbg_inlineSize_c36306fc8d7bf3f5: Aa,
          __wbg_blockSize_0de30d9eaea17aeb: Ml,
          __wbg_new_39fae4e38868373c: Za,
          __wbg_postMessage_acaa82cfcb43d6a6: Cf,
          __wbg_new_713ee440434744d3: tf,
          __wbg_disconnect_3fe08e14216367dc: sa,
          __wbg_observe_902bb4080f1a53c3: _f,
          __wbg_isIntersecting_73b8e6fa5198e367: La,
          __wbg_appendChild_0455c3748a28445a: Pl,
          __wbg_contains_fa87e76715824be0: Wl,
          __wbg_persisted_30583f3cb6823f42: hf,
          __wbg_contentRect_98871a7d339de11d: $l,
          __wbg_devicePixelContentBoxSize_46a83f780892e4fe: na,
          __wbg_queueMicrotask_46c1df247678729f: Rf,
          __wbg_queueMicrotask_8acf3ccb75ed8d11: Ff,
          __wbindgen_is_function: Fu,
          __wbg_performance_7a3ffd0b17f663ad: pf,
          __wbg_now_2c95c9de01293173: lf,
          __wbg_get_a131a44bd1eb6979: Ta,
          __wbg_length_f00ec12454a5d9fd: za,
          __wbg_new_58353953ad2097cc: ef,
          __wbg_newnoargs_ff528e72d35de39a: of,
          __wbg_new_07b483f72211fd66: Ja,
          __wbg_of_6894cf64ba33daf5: uf,
          __wbg_of_b87d5fd6efcb0d7f: df,
          __wbg_push_73fd7b5550ebf707: Mf,
          __wbg_call_fbe8be8bf6436ce5: Dl,
          __wbg_getOwnPropertyDescriptor_d7022024b40febb5: xa,
          __wbg_is_49ee71a294f7d2fe: Da,
          __wbg_resolve_0dac8c580ffd4678: Kf,
          __wbg_catch_b51fce253ee18ec3: Bl,
          __wbg_then_db882932c0c714c6: _u,
          __wbg_then_82ab9fb4080f1707: fu,
          __wbg_static_accessor_GLOBAL_THIS_ee9704f328b6b291: ou,
          __wbg_static_accessor_SELF_78c9e3071b912620: iu,
          __wbg_static_accessor_WINDOW_a093d21393777366: cu,
          __wbg_static_accessor_GLOBAL_487c52c58d65314d: su,
          __wbg_set_c43293f93a35998a: t_,
          __wbindgen_debug_string: Ru,
          __wbindgen_throw: zu,
          __wbindgen_closure_wrapper1941: yu,
          __wbindgen_closure_wrapper1943: xu,
          __wbindgen_closure_wrapper1945: Su,
          __wbindgen_closure_wrapper1947: Cu,
          __wbindgen_closure_wrapper1949: Eu,
          __wbindgen_closure_wrapper1952: Tu,
          __wbindgen_closure_wrapper1965: Pu,
          __wbindgen_closure_wrapper1967: Ou,
          __wbindgen_closure_wrapper1975: Mu,
          __wbindgen_closure_wrapper3408: Au,
          __wbindgen_init_externref_table: Iu
        }
      }, Qc), Bu = U.memory, Nu = U.__wbg_mandelbrotstep_free, ju = U.__wbg_get_mandelbrotstep_zx, qu = U.__wbg_set_mandelbrotstep_zx, Hu = U.__wbg_get_mandelbrotstep_zy, Wu = U.__wbg_set_mandelbrotstep_zy, $u = U.__wbg_get_mandelbrotstep_dx, Ku = U.__wbg_set_mandelbrotstep_dx, Gu = U.__wbg_get_mandelbrotstep_dy, ku = U.__wbg_set_mandelbrotstep_dy, Yu = U.moveMandelbrot, Xu = U.run_web, Ju = U.__wbg_mandelbrotnavigator_free, Qu = U.mandelbrotnavigator_new, Zu = U.mandelbrotnavigator_translate, ed = U.mandelbrotnavigator_rotate, td = U.mandelbrotnavigator_translate_direct, nd = U.mandelbrotnavigator_rotate_direct, rd = U.mandelbrotnavigator_zoom, sd = U.mandelbrotnavigator_step, od = U.mandelbrotnavigator_get_params, id = U.mandelbrotnavigator_compute_reference_orbit, cd = U.__externref_table_alloc, ld = U.__wbindgen_export_1, ad = U.__wbindgen_exn_store, fd = U.__wbindgen_malloc, _d = U.__wbindgen_realloc, ud = U.__wbindgen_free, dd = U.__wbindgen_export_6, bd = U.__externref_table_dealloc, gd = U.__externref_drop_slice, pd = U.closure438_externref_shim, hd = U.wasm_bindgen__convert__closures_____invoke__he0c36f5f951d360f, md = U.closure439_externref_shim, wd = U.closure486_externref_shim, yo = U.__wbindgen_start, vd = Object.freeze(Object.defineProperty({
        __proto__: null,
        __externref_drop_slice: gd,
        __externref_table_alloc: cd,
        __externref_table_dealloc: bd,
        __wbg_get_mandelbrotstep_dx: $u,
        __wbg_get_mandelbrotstep_dy: Gu,
        __wbg_get_mandelbrotstep_zx: ju,
        __wbg_get_mandelbrotstep_zy: Hu,
        __wbg_mandelbrotnavigator_free: Ju,
        __wbg_mandelbrotstep_free: Nu,
        __wbg_set_mandelbrotstep_dx: Ku,
        __wbg_set_mandelbrotstep_dy: ku,
        __wbg_set_mandelbrotstep_zx: qu,
        __wbg_set_mandelbrotstep_zy: Wu,
        __wbindgen_exn_store: ad,
        __wbindgen_export_1: ld,
        __wbindgen_export_6: dd,
        __wbindgen_free: ud,
        __wbindgen_malloc: fd,
        __wbindgen_realloc: _d,
        __wbindgen_start: yo,
        closure438_externref_shim: pd,
        closure439_externref_shim: md,
        closure486_externref_shim: wd,
        mandelbrotnavigator_compute_reference_orbit: id,
        mandelbrotnavigator_get_params: od,
        mandelbrotnavigator_new: Qu,
        mandelbrotnavigator_rotate: ed,
        mandelbrotnavigator_rotate_direct: nd,
        mandelbrotnavigator_step: sd,
        mandelbrotnavigator_translate: Zu,
        mandelbrotnavigator_translate_direct: td,
        mandelbrotnavigator_zoom: rd,
        memory: Bu,
        moveMandelbrot: Yu,
        run_web: Xu,
        wasm_bindgen__convert__closures_____invoke__he0c36f5f951d360f: hd
      }, Symbol.toStringTag, {
        value: "Module"
      }));
      el(vd);
      yo();
      class yd {
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
          this.canvas = t, this.shaderPass1 = Xc, this.shaderPass2 = Jc, this.antialiasLevel = n.antialiasLevel, this.palettePeriod = n.palettePeriod, this.previousMandelbrot = {
            maxIterations: 1,
            epsilon: 0,
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
            const o = this.pipeline2.getBindGroupLayout(0);
            o.label = "Engine IntermediateTextureView";
            const i = [
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
              layout: o,
              entries: i,
              label: "Engine BindGroup Color Pass"
            });
          }
        }
        areObjectsEqual(t, n) {
          const r = Object.keys(t), s = Object.keys(n);
          if (r.length !== s.length) return false;
          for (const o of r) if (t[o] !== n[o]) return false;
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
          let o = this.previousMandelbrot.scale / t.scale;
          o < 1 && (o = 1 / o), o -= 1;
          const i = new Float32Array([
            n.palettePeriod,
            o * 2,
            0,
            0
          ]);
          this.device.queue.writeBuffer(this.uniformBufferColor, 0, i.buffer), this.previousMandelbrot && ((this.previousMandelbrot.cx !== t.cx || this.previousMandelbrot.cy !== t.cy || this.previousMandelbrot.maxIterations !== t.maxIterations) && (console.log("Calcul de l'orbite"), this.mandelbrotNavigator.compute_reference_orbit(1e6).forEach((a, u) => {
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
      const xd = {
        class: "panel compact-panel"
      }, Sd = {
        class: "panel-block compact-block"
      }, Cd = {
        class: "math-display"
      }, Ed = [
        "innerHTML"
      ], Td = {
        class: "panel-block compact-block"
      }, Pd = {
        class: "math-display"
      }, Od = [
        "innerHTML"
      ], Md = {
        class: "math-display"
      }, Ad = [
        "innerHTML"
      ], Rd = {
        class: "panel-block compact-block"
      }, Id = {
        class: "math-display"
      }, Fd = {
        class: "panel-block compact-block"
      }, Ld = {
        style: {
          display: "flex",
          "flex-direction": "column",
          gap: "0.3em"
        }
      }, Dd = [
        "value"
      ], Vd = {
        class: "panel-block compact-block"
      }, Ud = {
        style: {
          display: "flex",
          gap: "0.5em",
          "align-items": "center"
        }
      }, bs = "mandelbrot_presets", zd = wr({
        __name: "Settings",
        props: {
          modelValue: {}
        },
        setup(e) {
          const t = e;
          function n(A, y = 8) {
            if (A === 0) return "0";
            const V = Math.floor(Math.log10(Math.abs(A))), B = A / Math.pow(10, V), K = V === 0 ? "" : `\xD710${r(V)}`;
            return `${B.toFixed(y)}${K}`;
          }
          function r(A) {
            const y = {
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
            return String(A).split("").map((V) => y[V] ?? V).join("");
          }
          const s = Pt(() => (t.modelValue.angle * 180 / Math.PI).toFixed(2)), o = Pt(() => n(t.modelValue.scale)), i = Pt(() => n(t.modelValue.cx)), c = Pt(() => n(t.modelValue.cy)), a = Rt(""), u = Rt([]), _ = Rt("");
          function b() {
            if (!a.value.trim()) return;
            const A = {
              name: a.value.trim(),
              cx: t.modelValue.cx,
              cy: t.modelValue.cy,
              scale: t.modelValue.scale,
              angle: t.modelValue.angle
            }, y = u.value.findIndex((V) => V.name === A.name);
            y >= 0 ? u.value[y] = A : u.value.push(A), localStorage.setItem(bs, JSON.stringify(u.value)), a.value = "";
          }
          function C() {
            const A = localStorage.getItem(bs);
            if (A) try {
              u.value = JSON.parse(A);
            } catch {
            }
          }
          function P(A) {
            const y = u.value.find((V) => V.name === A);
            y && (t.modelValue.cx = y.cx, t.modelValue.cy = y.cy, t.modelValue.scale = y.scale, t.modelValue.angle = y.angle, _.value = A);
          }
          return Tn(() => {
            C();
          }), (A, y) => (Vt(), Ut("nav", xd, [
            y[11] || (y[11] = W("p", {
              class: "panel-heading compact-heading"
            }, "Param\xE8tres", -1)),
            W("div", Sd, [
              W("span", Cd, [
                y[3] || (y[3] = Tt(" \xC9chelle\xA0: ", -1)),
                W("span", {
                  innerHTML: o.value
                }, null, 8, Ed)
              ])
            ]),
            W("div", Td, [
              W("p", null, [
                W("span", Pd, [
                  y[4] || (y[4] = Tt("Cx\xA0:", -1)),
                  W("span", {
                    innerHTML: i.value
                  }, null, 8, Od)
                ])
              ]),
              W("p", null, [
                W("span", Md, [
                  y[5] || (y[5] = Tt("Cy\xA0:", -1)),
                  y[6] || (y[6] = W("span", {
                    class: "math-i"
                  }, "i", -1)),
                  W("span", {
                    innerHTML: c.value
                  }, null, 8, Ad)
                ])
              ])
            ]),
            W("div", Rd, [
              W("span", Id, [
                y[7] || (y[7] = Tt(" Angle\xA0: ", -1)),
                W("span", null, $n(s.value) + "\xB0", 1)
              ])
            ]),
            W("div", Fd, [
              y[9] || (y[9] = W("label", {
                class: "compact-label"
              }, "Presets enregistr\xE9s", -1)),
              W("div", Ld, [
                zr(W("select", {
                  class: "select compact-select",
                  "onUpdate:modelValue": y[0] || (y[0] = (V) => _.value = V),
                  onChange: y[1] || (y[1] = (V) => P(_.value)),
                  style: {
                    width: "100%"
                  }
                }, [
                  y[8] || (y[8] = W("option", {
                    value: "",
                    disabled: ""
                  }, "Choisir un preset...", -1)),
                  (Vt(true), Ut(Re, null, Ii(u.value, (V) => (Vt(), Ut("option", {
                    key: V.name,
                    value: V.name
                  }, $n(V.name), 9, Dd))), 128))
                ], 544), [
                  [
                    Wc,
                    _.value
                  ]
                ])
              ])
            ]),
            W("div", Vd, [
              y[10] || (y[10] = W("label", {
                class: "compact-label"
              }, "Nom du preset", -1)),
              W("div", Ud, [
                zr(W("input", {
                  class: "input compact-input",
                  "onUpdate:modelValue": y[2] || (y[2] = (V) => a.value = V),
                  type: "text",
                  placeholder: "Nom...",
                  style: {
                    width: "8em"
                  }
                }, null, 512), [
                  [
                    Hc,
                    a.value
                  ]
                ]),
                W("button", {
                  class: "button is-link is-small",
                  onClick: b
                }, "Enregistrer")
              ])
            ])
          ]));
        }
      }), xo = (e, t) => {
        const n = e.__vccOpts || e;
        for (const [r, s] of t) n[r] = s;
        return n;
      }, Bd = xo(zd, [
        [
          "__scopeId",
          "data-v-0168128e"
        ]
      ]), Nd = {
        style: {
          position: "relative",
          height: "100vh",
          width: "100vw"
        }
      }, jd = {
        style: {
          position: "absolute",
          top: "0",
          left: "0",
          "z-index": "10",
          width: "320px",
          "pointer-events": "auto"
        }
      }, gs = 1, ps = 128, en = 0.04, hs = 0.025, qd = wr({
        __name: "WebGpuSurface",
        setup(e) {
          const t = Rt(null);
          let n, r, s;
          const o = Rt({
            cx: -0.749208775,
            cy: -0.0798967515,
            scale: 2.5,
            angle: 0,
            maxIterations: 1e3,
            antialiasLevel: gs,
            palettePeriod: ps
          });
          function i(F) {
            u[F.key.toLowerCase()] = true;
          }
          function c(F) {
            u[F.key.toLowerCase()] = false;
          }
          function a(F) {
            F.preventDefault();
            const E = 0.8;
            F.deltaY < 0 ? s.zoom(E) : s.zoom(1 / E);
          }
          const u = {};
          let _ = false, b = false, C = 0, P = 0;
          function A(F) {
            const E = t.value;
            if (!E) return {
              x: 0,
              y: 0,
              width: 0,
              height: 0
            };
            const N = E.getBoundingClientRect();
            return {
              x: F.clientX - N.left,
              y: F.clientY - N.top,
              width: N.width,
              height: N.height
            };
          }
          function y(F) {
            if (F.button === 2) b = true;
            else {
              _ = true;
              const E = A(F);
              C = E.x, P = E.y;
            }
          }
          function V(F) {
            var _a2;
            const E = A(F);
            if (b) {
              const te = (_a2 = t.value) == null ? void 0 : _a2.getBoundingClientRect();
              if (!te) return;
              const he = te.width / 2, Ke = te.height / 2, Ue = E.x, Qe = E.y, lt = Math.atan2(Qe - Ke, Ue - he);
              s.rotate(lt - s.get_params()[3]);
              return;
            }
            if (!_) return;
            const N = (E.x - C) / E.width, pe = (E.y - P) / E.height;
            s.translate_direct(-N, pe), C = E.x, P = E.y;
          }
          function B(F) {
            F.button === 2 ? b = false : _ = false;
          }
          async function K() {
            if (!t.value) return;
            n = t.value, s = new pl(-0.749208775, -0.0798967515, 2.5, 0), r = new yd(n, {
              antialiasLevel: 1,
              palettePeriod: 128
            }), await r.initialize(s), window.addEventListener("keydown", i), window.addEventListener("keyup", c), n.addEventListener("wheel", a, {
              passive: false
            }), n.addEventListener("mousedown", y), n.addEventListener("contextmenu", function(E) {
              E.preventDefault();
            }), window.addEventListener("mousemove", V), window.addEventListener("mouseup", B);
            function F() {
              u.z && s.translate(0, en), u.s && s.translate(0, -en), u.q && s.translate(-en, 0), u.d && s.translate(en, 0), u.a && s.rotate(hs), u.e && s.rotate(-hs);
              const E = 1e-4, [N, pe, te, he] = s.step();
              o.value.cx = N, o.value.cy = pe, o.value.scale = te, o.value.angle = he;
              const Ke = Math.min(Math.max(100, 80 + 30 * Math.log2(1 / te)), 1e6);
              r.update({
                cx: N,
                cy: pe,
                scale: te,
                angle: he,
                maxIterations: Ke,
                epsilon: E
              }, {
                antialiasLevel: gs,
                palettePeriod: ps
              }), r.render(), requestAnimationFrame(F);
            }
            F();
          }
          return Tn(() => {
            K();
          }), (F, E) => (Vt(), Ut("div", Nd, [
            W("canvas", {
              ref_key: "canvasRef",
              ref: t,
              style: {
                width: "100%",
                height: "100%",
                display: "block"
              }
            }, null, 512),
            W("div", jd, [
              qe(Bd, {
                modelValue: o.value,
                "onUpdate:modelValue": E[0] || (E[0] = (N) => o.value = N)
              }, null, 8, [
                "modelValue"
              ])
            ])
          ]));
        }
      }), Hd = xo(qd, [
        [
          "__scopeId",
          "data-v-de631916"
        ]
      ]), Wd = {
        id: "fullscreen"
      }, $d = wr({
        __name: "App",
        setup(e) {
          return Tn(() => {
          }), (t, n) => (Vt(), Ut("div", Wd, [
            qe(Hd)
          ]));
        }
      });
      Gc($d).mount("#app");
    })();
  }
});
export default require_stdin();
