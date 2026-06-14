(async ()=>{
    var q = "" + new URL("mandelbrot_bg-DhBvJ-Be.wasm", import.meta.url).href, G = async (t = {}, e)=>{
        let n;
        if (e.startsWith("data:")) {
            const o = e.replace(/^data:.*?base64,/, "");
            let a;
            if (typeof Buffer == "function" && typeof Buffer.from == "function") a = Buffer.from(o, "base64");
            else if (typeof atob == "function") {
                const i = atob(o);
                a = new Uint8Array(i.length);
                for(let b = 0; b < i.length; b++)a[b] = i.charCodeAt(b);
            } else throw new Error("Cannot decode base64-encoded data URL");
            n = await WebAssembly.instantiate(a, t);
        } else {
            const o = await fetch(e), a = o.headers.get("Content-Type") || "";
            if ("instantiateStreaming" in WebAssembly && a.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(o, t);
            else {
                const i = await o.arrayBuffer();
                n = await WebAssembly.instantiate(i, t);
            }
        }
        return n.instance.exports;
    };
    let _;
    function Q(t) {
        _ = t;
    }
    let S = null;
    function B() {
        return (S === null || S.byteLength === 0) && (S = new Uint8Array(_.memory.buffer)), S;
    }
    let I = new TextDecoder("utf-8", {
        ignoreBOM: !0,
        fatal: !0
    });
    I.decode();
    const ee = 2146435072;
    let W = 0;
    function te(t, e) {
        return W += e, W >= ee && (I = new TextDecoder("utf-8", {
            ignoreBOM: !0,
            fatal: !0
        }), I.decode(), W = e), I.decode(B().subarray(t, t + e));
    }
    function H(t, e) {
        return t = t >>> 0, te(t, e);
    }
    let u = null;
    function _e() {
        return (u === null || u.buffer.detached === !0 || u.buffer.detached === void 0 && u.buffer !== _.memory.buffer) && (u = new DataView(_.memory.buffer)), u;
    }
    function E(t, e) {
        t = t >>> 0;
        const n = _e(), o = [];
        for(let a = t; a < t + 4 * e; a += 4)o.push(_.__wbindgen_export_0.get(n.getUint32(a, !0)));
        return _.__externref_drop_slice(t, e), o;
    }
    let c = 0;
    const h = new TextEncoder;
    "encodeInto" in h || (h.encodeInto = function(t, e) {
        const n = h.encode(t);
        return e.set(n), {
            read: t.length,
            written: n.length
        };
    });
    function f(t, e, n) {
        if (n === void 0) {
            const l = h.encode(t), g = e(l.length, 1) >>> 0;
            return B().subarray(g, g + l.length).set(l), c = l.length, g;
        }
        let o = t.length, a = e(o, 1) >>> 0;
        const i = B();
        let b = 0;
        for(; b < o; b++){
            const l = t.charCodeAt(b);
            if (l > 127) break;
            i[a + b] = l;
        }
        if (b !== o) {
            b !== 0 && (t = t.slice(b)), a = n(a, o, o = b + t.length * 3, 1) >>> 0;
            const l = B().subarray(a + b, a + o), g = h.encodeInto(t, l);
            b += g.written, a = n(a, o, b, 1) >>> 0;
        }
        return c = b, a;
    }
    function w(t) {
        return t == null;
    }
    let k = null;
    function re() {
        return (k === null || k.byteLength === 0) && (k = new Float64Array(_.memory.buffer)), k;
    }
    function ne(t, e) {
        return t = t >>> 0, re().subarray(t / 8, t / 8 + e);
    }
    const P = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((t)=>_.__wbg_blabufferinfo_free(t >>> 0, 1));
    class F {
        static __wrap(e) {
            e = e >>> 0;
            const n = Object.create(F.prototype);
            return n.__wbg_ptr = e, P.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, P.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_blabufferinfo_free(e, 0);
        }
        get ptr() {
            return _.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(e) {
            _.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, e);
        }
        get count() {
            return _.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set count(e) {
            _.__wbg_set_blabufferinfo_count(this.__wbg_ptr, e);
        }
        get levels_ptr() {
            return _.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(e) {
            _.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, e);
        }
        get level_count() {
            return _.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(e) {
            _.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (F.prototype[Symbol.dispose] = F.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((t)=>_.__wbg_blalevel_free(t >>> 0, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((t)=>_.__wbg_blastep_free(t >>> 0, 1));
    const V = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((t)=>_.__wbg_mandelbrotnavigator_free(t >>> 0, 1));
    class N {
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, V.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_mandelbrotnavigator_free(e, 0);
        }
        get_params() {
            const e = _.mandelbrotnavigator_get_params(this.__wbg_ptr);
            var n = E(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), n;
        }
        rotate_direct(e) {
            _.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, e);
        }
        get_bla_epsilon() {
            return _.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr);
        }
        set_bla_epsilon(e) {
            _.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr, e);
        }
        is_in_transition() {
            return _.mandelbrotnavigator_is_in_transition(this.__wbg_ptr) !== 0;
        }
        pixel_to_complex(e, n, o, a) {
            const i = _.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr, e, n, o, a);
            var b = E(i[0], i[1]).slice();
            return _.__wbindgen_free(i[0], i[1] * 4, 4), b;
        }
        reference_origin(e, n) {
            const o = f(e, _.__wbindgen_malloc, _.__wbindgen_realloc), a = c, i = f(n, _.__wbindgen_malloc, _.__wbindgen_realloc), b = c;
            _.mandelbrotnavigator_reference_origin(this.__wbg_ptr, o, a, i, b);
        }
        start_transition(e, n, o, a, i) {
            const b = f(e, _.__wbindgen_malloc, _.__wbindgen_realloc), l = c, g = f(n, _.__wbindgen_malloc, _.__wbindgen_realloc), d = c, y = f(o, _.__wbindgen_malloc, _.__wbindgen_realloc), U = c;
            _.mandelbrotnavigator_start_transition(this.__wbg_ptr, b, l, g, d, y, U, a, i);
        }
        translate_direct(e, n, o, a) {
            _.mandelbrotnavigator_translate_direct(this.__wbg_ptr, e, n, !w(o), w(o) ? 0 : o, !w(a), w(a) ? 0 : a);
        }
        use_perturbation() {
            _.mandelbrotnavigator_use_perturbation(this.__wbg_ptr);
        }
        cancel_transition() {
            _.mandelbrotnavigator_cancel_transition(this.__wbg_ptr);
        }
        coordinate_to_pixel(e, n, o, a) {
            const i = f(e, _.__wbindgen_malloc, _.__wbindgen_realloc), b = c, l = f(n, _.__wbindgen_malloc, _.__wbindgen_realloc), g = c, d = _.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr, i, b, l, g, o, a);
            var y = ne(d[0], d[1]).slice();
            return _.__wbindgen_free(d[0], d[1] * 8, 8), y;
        }
        get_reference_params() {
            const e = _.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);
            var n = E(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), n;
        }
        get_approximation_mode() {
            return _.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr);
        }
        get_reference_orbit_len() {
            return _.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        compute_bla_reference_ptr(e) {
            const n = _.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr, e);
            return F.__wrap(n);
        }
        compute_reference_orbit_ptr(e) {
            const n = _.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, e);
            return m.__wrap(n);
        }
        get_reference_orbit_capacity() {
            return _.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        compute_reference_orbit_chunk(e, n) {
            const o = _.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, e, n);
            return m.__wrap(o);
        }
        constructor(e, n, o, a){
            const i = f(e, _.__wbindgen_malloc, _.__wbindgen_realloc), b = c, l = f(n, _.__wbindgen_malloc, _.__wbindgen_realloc), g = c, d = f(o, _.__wbindgen_malloc, _.__wbindgen_realloc), y = c, U = _.mandelbrotnavigator_new(i, b, l, g, d, y, a);
            return this.__wbg_ptr = U >>> 0, V.register(this, this.__wbg_ptr, this), this;
        }
        step(e, n) {
            const o = _.mandelbrotnavigator_step(this.__wbg_ptr, !w(e), w(e) ? 0 : e, !w(n), w(n) ? 0 : n);
            var a = E(o[0], o[1]).slice();
            return _.__wbindgen_free(o[0], o[1] * 4, 4), a;
        }
        zoom(e) {
            _.mandelbrotnavigator_zoom(this.__wbg_ptr, e);
        }
        angle(e) {
            _.mandelbrotnavigator_angle(this.__wbg_ptr, e);
        }
        scale(e) {
            const n = f(e, _.__wbindgen_malloc, _.__wbindgen_realloc), o = c;
            _.mandelbrotnavigator_scale(this.__wbg_ptr, n, o);
        }
        origin(e, n) {
            const o = f(e, _.__wbindgen_malloc, _.__wbindgen_realloc), a = c, i = f(n, _.__wbindgen_malloc, _.__wbindgen_realloc), b = c;
            _.mandelbrotnavigator_origin(this.__wbg_ptr, o, a, i, b);
        }
        rotate(e) {
            _.mandelbrotnavigator_rotate(this.__wbg_ptr, e);
        }
        use_bla() {
            _.mandelbrotnavigator_use_bla(this.__wbg_ptr);
        }
        translate(e, n) {
            _.mandelbrotnavigator_translate(this.__wbg_ptr, e, n);
        }
    }
    Symbol.dispose && (N.prototype[Symbol.dispose] = N.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((t)=>_.__wbg_mandelbrotstep_free(t >>> 0, 1));
    const J = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((t)=>_.__wbg_orbitbufferinfo_free(t >>> 0, 1));
    class m {
        static __wrap(e) {
            e = e >>> 0;
            const n = Object.create(m.prototype);
            return n.__wbg_ptr = e, J.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, J.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_orbitbufferinfo_free(e, 0);
        }
        get ptr() {
            return _.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(e) {
            _.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, e);
        }
        get offset() {
            return _.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set offset(e) {
            _.__wbg_set_blabufferinfo_count(this.__wbg_ptr, e);
        }
        get count() {
            return _.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set count(e) {
            _.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (m.prototype[Symbol.dispose] = m.prototype.free);
    function oe(t) {
        return Math.exp(t);
    }
    function ae() {
        return Date.now();
    }
    function be(t, e) {
        throw new Error(H(t, e));
    }
    function ie(t, e) {
        return H(t, e);
    }
    function se() {
        const t = _.__wbindgen_export_0, e = t.grow(4);
        t.set(0, void 0), t.set(e + 0, void 0), t.set(e + 1, null), t.set(e + 2, !0), t.set(e + 3, !1);
    }
    URL = globalThis.URL;
    const r = await G({
        "./mandelbrot_bg.js": {
            __wbg_now_1e80617bcee43265: ae,
            __wbg_exp_9293ded1248e1bd3: oe,
            __wbg_wbindgenthrow_451ec1a8469d7eb6: be,
            __wbindgen_init_externref_table: se,
            __wbindgen_cast_2241b6af4c4b2941: ie
        }
    }, q), T = r.memory, le = r.__wbg_blabufferinfo_free, ge = r.__wbg_blalevel_free, ce = r.__wbg_blastep_free, fe = r.__wbg_get_blabufferinfo_count, pe = r.__wbg_get_blabufferinfo_level_count, de = r.__wbg_get_blabufferinfo_levels_ptr, we = r.__wbg_get_blabufferinfo_ptr, ue = r.__wbg_get_blastep_ax, me = r.__wbg_get_blastep_ay, ve = r.__wbg_get_blastep_bx, ye = r.__wbg_get_blastep_by, he = r.__wbg_get_blastep_radius_alpha, xe = r.__wbg_get_blastep_radius_beta, ze = r.__wbg_mandelbrotnavigator_free, Ae = r.__wbg_mandelbrotstep_free, Fe = r.__wbg_orbitbufferinfo_free, Re = r.__wbg_set_blabufferinfo_count, Me = r.__wbg_set_blabufferinfo_level_count, Se = r.__wbg_set_blabufferinfo_levels_ptr, Ee = r.__wbg_set_blabufferinfo_ptr, ke = r.__wbg_set_blastep_ax, Be = r.__wbg_set_blastep_ay, Ie = r.__wbg_set_blastep_bx, Ce = r.__wbg_set_blastep_by, Te = r.__wbg_set_blastep_radius_alpha, Le = r.__wbg_set_blastep_radius_beta, Ue = r.mandelbrotnavigator_angle, We = r.mandelbrotnavigator_cancel_transition, De = r.mandelbrotnavigator_compute_bla_reference_ptr, Ne = r.mandelbrotnavigator_compute_reference_orbit_chunk, Oe = r.mandelbrotnavigator_compute_reference_orbit_ptr, je = r.mandelbrotnavigator_coordinate_to_pixel, Pe = r.mandelbrotnavigator_get_approximation_mode, Ve = r.mandelbrotnavigator_get_bla_epsilon, Je = r.mandelbrotnavigator_get_params, Ke = r.mandelbrotnavigator_get_reference_orbit_capacity, Ye = r.mandelbrotnavigator_get_reference_orbit_len, He = r.mandelbrotnavigator_get_reference_params, Xe = r.mandelbrotnavigator_is_in_transition, Ze = r.mandelbrotnavigator_new, $e = r.mandelbrotnavigator_origin, qe = r.mandelbrotnavigator_pixel_to_complex, Ge = r.mandelbrotnavigator_reference_origin, Qe = r.mandelbrotnavigator_rotate, et = r.mandelbrotnavigator_rotate_direct, tt = r.mandelbrotnavigator_scale, _t = r.mandelbrotnavigator_set_bla_epsilon, rt = r.mandelbrotnavigator_start_transition, nt = r.mandelbrotnavigator_step, ot = r.mandelbrotnavigator_translate, at = r.mandelbrotnavigator_translate_direct, bt = r.mandelbrotnavigator_use_bla, it = r.mandelbrotnavigator_use_perturbation, st = r.mandelbrotnavigator_zoom, lt = r.__wbg_set_blalevel_count, gt = r.__wbg_set_blalevel_max_radius_bits, ct = r.__wbg_set_blalevel_offset, ft = r.__wbg_set_blalevel_skip, pt = r.__wbg_set_mandelbrotstep_dx, dt = r.__wbg_set_mandelbrotstep_dy, wt = r.__wbg_set_mandelbrotstep_zx, ut = r.__wbg_set_mandelbrotstep_zy, mt = r.__wbg_set_orbitbufferinfo_count, vt = r.__wbg_set_orbitbufferinfo_offset, yt = r.__wbg_set_orbitbufferinfo_ptr, ht = r.__wbg_get_blalevel_count, xt = r.__wbg_get_blalevel_max_radius_bits, zt = r.__wbg_get_blalevel_offset, At = r.__wbg_get_blalevel_skip, Ft = r.__wbg_get_orbitbufferinfo_count, Rt = r.__wbg_get_orbitbufferinfo_offset, Mt = r.__wbg_get_orbitbufferinfo_ptr, St = r.__wbg_get_mandelbrotstep_dx, Et = r.__wbg_get_mandelbrotstep_dy, kt = r.__wbg_get_mandelbrotstep_zx, Bt = r.__wbg_get_mandelbrotstep_zy, It = r.__wbindgen_export_0, Ct = r.__externref_drop_slice, Tt = r.__wbindgen_free, Lt = r.__wbindgen_malloc, Ut = r.__wbindgen_realloc, X = r.__wbindgen_start;
    var Wt = Object.freeze({
        __proto__: null,
        __externref_drop_slice: Ct,
        __wbg_blabufferinfo_free: le,
        __wbg_blalevel_free: ge,
        __wbg_blastep_free: ce,
        __wbg_get_blabufferinfo_count: fe,
        __wbg_get_blabufferinfo_level_count: pe,
        __wbg_get_blabufferinfo_levels_ptr: de,
        __wbg_get_blabufferinfo_ptr: we,
        __wbg_get_blalevel_count: ht,
        __wbg_get_blalevel_max_radius_bits: xt,
        __wbg_get_blalevel_offset: zt,
        __wbg_get_blalevel_skip: At,
        __wbg_get_blastep_ax: ue,
        __wbg_get_blastep_ay: me,
        __wbg_get_blastep_bx: ve,
        __wbg_get_blastep_by: ye,
        __wbg_get_blastep_radius_alpha: he,
        __wbg_get_blastep_radius_beta: xe,
        __wbg_get_mandelbrotstep_dx: St,
        __wbg_get_mandelbrotstep_dy: Et,
        __wbg_get_mandelbrotstep_zx: kt,
        __wbg_get_mandelbrotstep_zy: Bt,
        __wbg_get_orbitbufferinfo_count: Ft,
        __wbg_get_orbitbufferinfo_offset: Rt,
        __wbg_get_orbitbufferinfo_ptr: Mt,
        __wbg_mandelbrotnavigator_free: ze,
        __wbg_mandelbrotstep_free: Ae,
        __wbg_orbitbufferinfo_free: Fe,
        __wbg_set_blabufferinfo_count: Re,
        __wbg_set_blabufferinfo_level_count: Me,
        __wbg_set_blabufferinfo_levels_ptr: Se,
        __wbg_set_blabufferinfo_ptr: Ee,
        __wbg_set_blalevel_count: lt,
        __wbg_set_blalevel_max_radius_bits: gt,
        __wbg_set_blalevel_offset: ct,
        __wbg_set_blalevel_skip: ft,
        __wbg_set_blastep_ax: ke,
        __wbg_set_blastep_ay: Be,
        __wbg_set_blastep_bx: Ie,
        __wbg_set_blastep_by: Ce,
        __wbg_set_blastep_radius_alpha: Te,
        __wbg_set_blastep_radius_beta: Le,
        __wbg_set_mandelbrotstep_dx: pt,
        __wbg_set_mandelbrotstep_dy: dt,
        __wbg_set_mandelbrotstep_zx: wt,
        __wbg_set_mandelbrotstep_zy: ut,
        __wbg_set_orbitbufferinfo_count: mt,
        __wbg_set_orbitbufferinfo_offset: vt,
        __wbg_set_orbitbufferinfo_ptr: yt,
        __wbindgen_export_0: It,
        __wbindgen_free: Tt,
        __wbindgen_malloc: Lt,
        __wbindgen_realloc: Ut,
        __wbindgen_start: X,
        mandelbrotnavigator_angle: Ue,
        mandelbrotnavigator_cancel_transition: We,
        mandelbrotnavigator_compute_bla_reference_ptr: De,
        mandelbrotnavigator_compute_reference_orbit_chunk: Ne,
        mandelbrotnavigator_compute_reference_orbit_ptr: Oe,
        mandelbrotnavigator_coordinate_to_pixel: je,
        mandelbrotnavigator_get_approximation_mode: Pe,
        mandelbrotnavigator_get_bla_epsilon: Ve,
        mandelbrotnavigator_get_params: Je,
        mandelbrotnavigator_get_reference_orbit_capacity: Ke,
        mandelbrotnavigator_get_reference_orbit_len: Ye,
        mandelbrotnavigator_get_reference_params: He,
        mandelbrotnavigator_is_in_transition: Xe,
        mandelbrotnavigator_new: Ze,
        mandelbrotnavigator_origin: $e,
        mandelbrotnavigator_pixel_to_complex: qe,
        mandelbrotnavigator_reference_origin: Ge,
        mandelbrotnavigator_rotate: Qe,
        mandelbrotnavigator_rotate_direct: et,
        mandelbrotnavigator_scale: tt,
        mandelbrotnavigator_set_bla_epsilon: _t,
        mandelbrotnavigator_start_transition: rt,
        mandelbrotnavigator_step: nt,
        mandelbrotnavigator_translate: ot,
        mandelbrotnavigator_translate_direct: at,
        mandelbrotnavigator_use_bla: bt,
        mandelbrotnavigator_use_perturbation: it,
        mandelbrotnavigator_zoom: st,
        memory: T
    });
    Q(Wt);
    X();
    const O = self;
    let s, p = 0, R = !1, v = 0, x = 0, D = !1, z = !1, C = "", j = "", L = "";
    const Dt = 1e3, Nt = 1e-35;
    function M(t, e) {
        O.postMessage(t, e ?? []);
    }
    function K() {
        return new Promise((t)=>setTimeout(t, 0));
    }
    function Z(t, e) {
        const n = e instanceof Error ? e.message : String(e);
        M({
            type: "error",
            jobId: t,
            message: n
        });
    }
    function $(t) {
        s && (t === "bla" ? s.use_bla() : s.use_perturbation());
    }
    function Ot(t) {
        s?.free(), s = new N(t.cx, t.cy, t.scale, t.angle), p = t.jobId, v = 0, x = t.maxIterations, z = !1, C = "", j = "", L = t.scale, $(t.approximationMode), s.set_bla_epsilon(t.blaEpsilon), A(t.jobId);
    }
    function jt(t, e, n) {
        const a = Math.max(0, n - e), i = new Float32Array(T.buffer, t + e * 4 * Float32Array.BYTES_PER_ELEMENT, a * 4), b = new Float32Array(i.length);
        return b.set(i), b;
    }
    function Y(t, e, n) {
        if (!s || t !== p || R) return;
        const o = L ? Number(L) : NaN;
        if (Number.isFinite(o) && o < Nt || v >= e || n < e || s.get_approximation_mode() !== 1) return;
        const a = s.compute_bla_reference_ptr(e), i = new Float32Array(T.buffer, a.ptr, a.count * 6), b = new Float32Array(i.length);
        b.set(i);
        const l = new Uint32Array(T.buffer, a.levels_ptr, a.level_count * 4), g = new Uint32Array(l.length);
        g.set(l), v = e, M({
            type: "blaReady",
            jobId: t,
            maxIterations: e,
            steps: b,
            levels: g,
            levelCount: a.level_count
        }, [
            b.buffer,
            g.buffer
        ]);
    }
    async function A(t) {
        if (!D) {
            D = !0;
            try {
                for(; !R && s && t === p;){
                    const e = x, n = Math.max(0, s.get_reference_orbit_len());
                    if (n >= e && !z) {
                        if (Y(t, e, n), await K(), x <= e) break;
                        continue;
                    }
                    const o = s.compute_reference_orbit_chunk(Dt, e);
                    z = !1;
                    const a = jt(o.ptr, o.offset, o.count), [i, b] = s.get_reference_params();
                    C && (i !== C || b !== j) && (v = 0, M({
                        type: "referenceReset",
                        jobId: t,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: b
                    })), C = i, j = b;
                    const l = Math.max(0, o.count - 1);
                    M({
                        type: "orbitChunk",
                        jobId: t,
                        offset: o.offset,
                        count: o.count,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: b,
                        orbit: a
                    }, [
                        a.buffer
                    ]), Y(t, e, l), await K();
                }
            } catch (e) {
                Z(t, e);
            } finally{
                if (D = !1, !R && s) {
                    const e = Math.max(0, s.get_reference_orbit_len());
                    (t !== p || e < x || z) && A(p);
                }
            }
        }
    }
    O.onmessage = (t)=>{
        const e = t.data;
        try {
            switch(e.type){
                case "reset":
                    R || Ot(e);
                    break;
                case "updateView":
                    s && e.jobId === p && (s.origin(e.cx, e.cy), s.scale(e.scale), s.angle(e.angle), L = e.scale, x = e.maxIterations, z = !0, A(e.jobId));
                    break;
                case "setApproximationMode":
                    e.jobId === p && ($(e.approximationMode), v = 0, A(e.jobId));
                    break;
                case "setBlaEpsilon":
                    s && e.jobId === p && (s.set_bla_epsilon(e.blaEpsilon), v = 0, A(e.jobId));
                    break;
                case "dispose":
                    R = !0, s?.free(), s = void 0, O.close();
                    break;
            }
        } catch (n) {
            Z("jobId" in e ? e.jobId : p, n);
        }
    };
    M({
        type: "ready"
    });
})();
