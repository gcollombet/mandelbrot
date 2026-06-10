(async ()=>{
    var X = "" + new URL("mandelbrot_bg-CAQEE0d8.wasm", import.meta.url).href, Z = async (t = {}, e)=>{
        let r;
        if (e.startsWith("data:")) {
            const o = e.replace(/^data:.*?base64,/, "");
            let b;
            if (typeof Buffer == "function" && typeof Buffer.from == "function") b = Buffer.from(o, "base64");
            else if (typeof atob == "function") {
                const i = atob(o);
                b = new Uint8Array(i.length);
                for(let a = 0; a < i.length; a++)b[a] = i.charCodeAt(a);
            } else throw new Error("Cannot decode base64-encoded data URL");
            r = await WebAssembly.instantiate(b, t);
        } else {
            const o = await fetch(e), b = o.headers.get("Content-Type") || "";
            if ("instantiateStreaming" in WebAssembly && b.startsWith("application/wasm")) r = await WebAssembly.instantiateStreaming(o, t);
            else {
                const i = await o.arrayBuffer();
                r = await WebAssembly.instantiate(i, t);
            }
        }
        return r.instance.exports;
    };
    let _;
    function $(t) {
        _ = t;
    }
    let M = null;
    function k() {
        return (M === null || M.byteLength === 0) && (M = new Uint8Array(_.memory.buffer)), M;
    }
    let B = new TextDecoder("utf-8", {
        ignoreBOM: !0,
        fatal: !0
    });
    B.decode();
    const q = 2146435072;
    let U = 0;
    function G(t, e) {
        return U += e, U >= q && (B = new TextDecoder("utf-8", {
            ignoreBOM: !0,
            fatal: !0
        }), B.decode(), U = e), B.decode(k().subarray(t, t + e));
    }
    function Y(t, e) {
        return t = t >>> 0, G(t, e);
    }
    let w = null;
    function ee() {
        return (w === null || w.buffer.detached === !0 || w.buffer.detached === void 0 && w.buffer !== _.memory.buffer) && (w = new DataView(_.memory.buffer)), w;
    }
    function E(t, e) {
        t = t >>> 0;
        const r = ee(), o = [];
        for(let b = t; b < t + 4 * e; b += 4)o.push(_.__wbindgen_export_0.get(r.getUint32(b, !0)));
        return _.__externref_drop_slice(t, e), o;
    }
    let g = 0;
    const y = new TextEncoder;
    "encodeInto" in y || (y.encodeInto = function(t, e) {
        const r = y.encode(t);
        return e.set(r), {
            read: t.length,
            written: r.length
        };
    });
    function c(t, e, r) {
        if (r === void 0) {
            const l = y.encode(t), f = e(l.length, 1) >>> 0;
            return k().subarray(f, f + l.length).set(l), g = l.length, f;
        }
        let o = t.length, b = e(o, 1) >>> 0;
        const i = k();
        let a = 0;
        for(; a < o; a++){
            const l = t.charCodeAt(a);
            if (l > 127) break;
            i[b + a] = l;
        }
        if (a !== o) {
            a !== 0 && (t = t.slice(a)), b = r(b, o, o = a + t.length * 3, 1) >>> 0;
            const l = k().subarray(b + a, b + o), f = y.encodeInto(t, l);
            a += f.written, b = r(b, o, a, 1) >>> 0;
        }
        return g = a, b;
    }
    let S = null;
    function te() {
        return (S === null || S.byteLength === 0) && (S = new Float64Array(_.memory.buffer)), S;
    }
    function _e(t, e) {
        return t = t >>> 0, te().subarray(t / 8, t / 8 + e);
    }
    const j = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((t)=>_.__wbg_blabufferinfo_free(t >>> 0, 1));
    class A {
        static __wrap(e) {
            e = e >>> 0;
            const r = Object.create(A.prototype);
            return r.__wbg_ptr = e, j.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, j.unregister(this), e;
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
    Symbol.dispose && (A.prototype[Symbol.dispose] = A.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((t)=>_.__wbg_blalevel_free(t >>> 0, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((t)=>_.__wbg_blastep_free(t >>> 0, 1));
    const V = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((t)=>_.__wbg_mandelbrotnavigator_free(t >>> 0, 1));
    class D {
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
            var r = E(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), r;
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
        pixel_to_complex(e, r, o, b) {
            const i = _.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr, e, r, o, b);
            var a = E(i[0], i[1]).slice();
            return _.__wbindgen_free(i[0], i[1] * 4, 4), a;
        }
        reference_origin(e, r) {
            const o = c(e, _.__wbindgen_malloc, _.__wbindgen_realloc), b = g, i = c(r, _.__wbindgen_malloc, _.__wbindgen_realloc), a = g;
            _.mandelbrotnavigator_reference_origin(this.__wbg_ptr, o, b, i, a);
        }
        start_transition(e, r, o, b, i) {
            const a = c(e, _.__wbindgen_malloc, _.__wbindgen_realloc), l = g, f = c(r, _.__wbindgen_malloc, _.__wbindgen_realloc), p = g, v = c(o, _.__wbindgen_malloc, _.__wbindgen_realloc), T = g;
            _.mandelbrotnavigator_start_transition(this.__wbg_ptr, a, l, f, p, v, T, b, i);
        }
        translate_direct(e, r) {
            _.mandelbrotnavigator_translate_direct(this.__wbg_ptr, e, r);
        }
        use_perturbation() {
            _.mandelbrotnavigator_use_perturbation(this.__wbg_ptr);
        }
        cancel_transition() {
            _.mandelbrotnavigator_cancel_transition(this.__wbg_ptr);
        }
        coordinate_to_pixel(e, r, o, b) {
            const i = c(e, _.__wbindgen_malloc, _.__wbindgen_realloc), a = g, l = c(r, _.__wbindgen_malloc, _.__wbindgen_realloc), f = g, p = _.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr, i, a, l, f, o, b);
            var v = _e(p[0], p[1]).slice();
            return _.__wbindgen_free(p[0], p[1] * 8, 8), v;
        }
        get_reference_params() {
            const e = _.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);
            var r = E(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), r;
        }
        get_approximation_mode() {
            return _.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr);
        }
        get_reference_orbit_len() {
            return _.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        compute_bla_reference_ptr(e) {
            const r = _.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr, e);
            return A.__wrap(r);
        }
        compute_reference_orbit_ptr(e) {
            const r = _.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, e);
            return u.__wrap(r);
        }
        get_reference_orbit_capacity() {
            return _.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        compute_reference_orbit_chunk(e, r) {
            const o = _.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, e, r);
            return u.__wrap(o);
        }
        constructor(e, r, o, b){
            const i = c(e, _.__wbindgen_malloc, _.__wbindgen_realloc), a = g, l = c(r, _.__wbindgen_malloc, _.__wbindgen_realloc), f = g, p = c(o, _.__wbindgen_malloc, _.__wbindgen_realloc), v = g, T = _.mandelbrotnavigator_new(i, a, l, f, p, v, b);
            return this.__wbg_ptr = T >>> 0, V.register(this, this.__wbg_ptr, this), this;
        }
        step() {
            const e = _.mandelbrotnavigator_step(this.__wbg_ptr);
            var r = E(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), r;
        }
        zoom(e) {
            _.mandelbrotnavigator_zoom(this.__wbg_ptr, e);
        }
        angle(e) {
            _.mandelbrotnavigator_angle(this.__wbg_ptr, e);
        }
        scale(e) {
            const r = c(e, _.__wbindgen_malloc, _.__wbindgen_realloc), o = g;
            _.mandelbrotnavigator_scale(this.__wbg_ptr, r, o);
        }
        origin(e, r) {
            const o = c(e, _.__wbindgen_malloc, _.__wbindgen_realloc), b = g, i = c(r, _.__wbindgen_malloc, _.__wbindgen_realloc), a = g;
            _.mandelbrotnavigator_origin(this.__wbg_ptr, o, b, i, a);
        }
        rotate(e) {
            _.mandelbrotnavigator_rotate(this.__wbg_ptr, e);
        }
        use_bla() {
            _.mandelbrotnavigator_use_bla(this.__wbg_ptr);
        }
        translate(e, r) {
            _.mandelbrotnavigator_translate(this.__wbg_ptr, e, r);
        }
    }
    Symbol.dispose && (D.prototype[Symbol.dispose] = D.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((t)=>_.__wbg_mandelbrotstep_free(t >>> 0, 1));
    const N = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((t)=>_.__wbg_orbitbufferinfo_free(t >>> 0, 1));
    class u {
        static __wrap(e) {
            e = e >>> 0;
            const r = Object.create(u.prototype);
            return r.__wbg_ptr = e, N.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, N.unregister(this), e;
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
    Symbol.dispose && (u.prototype[Symbol.dispose] = u.prototype.free);
    function ne(t) {
        return Math.exp(t);
    }
    function re() {
        return Date.now();
    }
    function oe(t, e) {
        throw new Error(Y(t, e));
    }
    function ae(t, e) {
        return Y(t, e);
    }
    function be() {
        const t = _.__wbindgen_export_0, e = t.grow(4);
        t.set(0, void 0), t.set(e + 0, void 0), t.set(e + 1, null), t.set(e + 2, !0), t.set(e + 3, !1);
    }
    URL = globalThis.URL;
    const n = await Z({
        "./mandelbrot_bg.js": {
            __wbg_now_1e80617bcee43265: re,
            __wbg_exp_9293ded1248e1bd3: ne,
            __wbg_wbindgenthrow_451ec1a8469d7eb6: oe,
            __wbindgen_init_externref_table: be,
            __wbindgen_cast_2241b6af4c4b2941: ae
        }
    }, X), I = n.memory, ie = n.__wbg_blabufferinfo_free, se = n.__wbg_blalevel_free, le = n.__wbg_blastep_free, ge = n.__wbg_get_blabufferinfo_count, ce = n.__wbg_get_blabufferinfo_level_count, fe = n.__wbg_get_blabufferinfo_levels_ptr, de = n.__wbg_get_blabufferinfo_ptr, pe = n.__wbg_get_blastep_ax, we = n.__wbg_get_blastep_ay, ue = n.__wbg_get_blastep_bx, me = n.__wbg_get_blastep_by, ve = n.__wbg_get_blastep_radius_alpha, ye = n.__wbg_get_blastep_radius_beta, he = n.__wbg_mandelbrotnavigator_free, xe = n.__wbg_mandelbrotstep_free, ze = n.__wbg_orbitbufferinfo_free, Ae = n.__wbg_set_blabufferinfo_count, Fe = n.__wbg_set_blabufferinfo_level_count, Re = n.__wbg_set_blabufferinfo_levels_ptr, Me = n.__wbg_set_blabufferinfo_ptr, Ee = n.__wbg_set_blastep_ax, Se = n.__wbg_set_blastep_ay, ke = n.__wbg_set_blastep_bx, Be = n.__wbg_set_blastep_by, Ce = n.__wbg_set_blastep_radius_alpha, Ie = n.__wbg_set_blastep_radius_beta, Te = n.mandelbrotnavigator_angle, Ue = n.mandelbrotnavigator_cancel_transition, We = n.mandelbrotnavigator_compute_bla_reference_ptr, De = n.mandelbrotnavigator_compute_reference_orbit_chunk, Le = n.mandelbrotnavigator_compute_reference_orbit_ptr, Oe = n.mandelbrotnavigator_coordinate_to_pixel, je = n.mandelbrotnavigator_get_approximation_mode, Ve = n.mandelbrotnavigator_get_bla_epsilon, Ne = n.mandelbrotnavigator_get_params, Pe = n.mandelbrotnavigator_get_reference_orbit_capacity, Je = n.mandelbrotnavigator_get_reference_orbit_len, Ye = n.mandelbrotnavigator_get_reference_params, He = n.mandelbrotnavigator_is_in_transition, Ke = n.mandelbrotnavigator_new, Qe = n.mandelbrotnavigator_origin, Xe = n.mandelbrotnavigator_pixel_to_complex, Ze = n.mandelbrotnavigator_reference_origin, $e = n.mandelbrotnavigator_rotate, qe = n.mandelbrotnavigator_rotate_direct, Ge = n.mandelbrotnavigator_scale, et = n.mandelbrotnavigator_set_bla_epsilon, tt = n.mandelbrotnavigator_start_transition, _t = n.mandelbrotnavigator_step, nt = n.mandelbrotnavigator_translate, rt = n.mandelbrotnavigator_translate_direct, ot = n.mandelbrotnavigator_use_bla, at = n.mandelbrotnavigator_use_perturbation, bt = n.mandelbrotnavigator_zoom, it = n.__wbg_set_blalevel__padding, st = n.__wbg_set_blalevel_count, lt = n.__wbg_set_blalevel_offset, gt = n.__wbg_set_blalevel_skip, ct = n.__wbg_set_mandelbrotstep_dx, ft = n.__wbg_set_mandelbrotstep_dy, dt = n.__wbg_set_mandelbrotstep_zx, pt = n.__wbg_set_mandelbrotstep_zy, wt = n.__wbg_set_orbitbufferinfo_count, ut = n.__wbg_set_orbitbufferinfo_offset, mt = n.__wbg_set_orbitbufferinfo_ptr, vt = n.__wbg_get_blalevel__padding, yt = n.__wbg_get_blalevel_count, ht = n.__wbg_get_blalevel_offset, xt = n.__wbg_get_blalevel_skip, zt = n.__wbg_get_orbitbufferinfo_count, At = n.__wbg_get_orbitbufferinfo_offset, Ft = n.__wbg_get_orbitbufferinfo_ptr, Rt = n.__wbg_get_mandelbrotstep_dx, Mt = n.__wbg_get_mandelbrotstep_dy, Et = n.__wbg_get_mandelbrotstep_zx, St = n.__wbg_get_mandelbrotstep_zy, kt = n.__wbindgen_export_0, Bt = n.__externref_drop_slice, Ct = n.__wbindgen_free, It = n.__wbindgen_malloc, Tt = n.__wbindgen_realloc, H = n.__wbindgen_start;
    var Ut = Object.freeze({
        __proto__: null,
        __externref_drop_slice: Bt,
        __wbg_blabufferinfo_free: ie,
        __wbg_blalevel_free: se,
        __wbg_blastep_free: le,
        __wbg_get_blabufferinfo_count: ge,
        __wbg_get_blabufferinfo_level_count: ce,
        __wbg_get_blabufferinfo_levels_ptr: fe,
        __wbg_get_blabufferinfo_ptr: de,
        __wbg_get_blalevel__padding: vt,
        __wbg_get_blalevel_count: yt,
        __wbg_get_blalevel_offset: ht,
        __wbg_get_blalevel_skip: xt,
        __wbg_get_blastep_ax: pe,
        __wbg_get_blastep_ay: we,
        __wbg_get_blastep_bx: ue,
        __wbg_get_blastep_by: me,
        __wbg_get_blastep_radius_alpha: ve,
        __wbg_get_blastep_radius_beta: ye,
        __wbg_get_mandelbrotstep_dx: Rt,
        __wbg_get_mandelbrotstep_dy: Mt,
        __wbg_get_mandelbrotstep_zx: Et,
        __wbg_get_mandelbrotstep_zy: St,
        __wbg_get_orbitbufferinfo_count: zt,
        __wbg_get_orbitbufferinfo_offset: At,
        __wbg_get_orbitbufferinfo_ptr: Ft,
        __wbg_mandelbrotnavigator_free: he,
        __wbg_mandelbrotstep_free: xe,
        __wbg_orbitbufferinfo_free: ze,
        __wbg_set_blabufferinfo_count: Ae,
        __wbg_set_blabufferinfo_level_count: Fe,
        __wbg_set_blabufferinfo_levels_ptr: Re,
        __wbg_set_blabufferinfo_ptr: Me,
        __wbg_set_blalevel__padding: it,
        __wbg_set_blalevel_count: st,
        __wbg_set_blalevel_offset: lt,
        __wbg_set_blalevel_skip: gt,
        __wbg_set_blastep_ax: Ee,
        __wbg_set_blastep_ay: Se,
        __wbg_set_blastep_bx: ke,
        __wbg_set_blastep_by: Be,
        __wbg_set_blastep_radius_alpha: Ce,
        __wbg_set_blastep_radius_beta: Ie,
        __wbg_set_mandelbrotstep_dx: ct,
        __wbg_set_mandelbrotstep_dy: ft,
        __wbg_set_mandelbrotstep_zx: dt,
        __wbg_set_mandelbrotstep_zy: pt,
        __wbg_set_orbitbufferinfo_count: wt,
        __wbg_set_orbitbufferinfo_offset: ut,
        __wbg_set_orbitbufferinfo_ptr: mt,
        __wbindgen_export_0: kt,
        __wbindgen_free: Ct,
        __wbindgen_malloc: It,
        __wbindgen_realloc: Tt,
        __wbindgen_start: H,
        mandelbrotnavigator_angle: Te,
        mandelbrotnavigator_cancel_transition: Ue,
        mandelbrotnavigator_compute_bla_reference_ptr: We,
        mandelbrotnavigator_compute_reference_orbit_chunk: De,
        mandelbrotnavigator_compute_reference_orbit_ptr: Le,
        mandelbrotnavigator_coordinate_to_pixel: Oe,
        mandelbrotnavigator_get_approximation_mode: je,
        mandelbrotnavigator_get_bla_epsilon: Ve,
        mandelbrotnavigator_get_params: Ne,
        mandelbrotnavigator_get_reference_orbit_capacity: Pe,
        mandelbrotnavigator_get_reference_orbit_len: Je,
        mandelbrotnavigator_get_reference_params: Ye,
        mandelbrotnavigator_is_in_transition: He,
        mandelbrotnavigator_new: Ke,
        mandelbrotnavigator_origin: Qe,
        mandelbrotnavigator_pixel_to_complex: Xe,
        mandelbrotnavigator_reference_origin: Ze,
        mandelbrotnavigator_rotate: $e,
        mandelbrotnavigator_rotate_direct: qe,
        mandelbrotnavigator_scale: Ge,
        mandelbrotnavigator_set_bla_epsilon: et,
        mandelbrotnavigator_start_transition: tt,
        mandelbrotnavigator_step: _t,
        mandelbrotnavigator_translate: nt,
        mandelbrotnavigator_translate_direct: rt,
        mandelbrotnavigator_use_bla: ot,
        mandelbrotnavigator_use_perturbation: at,
        mandelbrotnavigator_zoom: bt,
        memory: I
    });
    $(Ut);
    H();
    const L = self;
    let s, d = 0, F = !1, m = 0, h = 0, W = !1, x = !1, C = "", O = "";
    const Wt = 1e3;
    function R(t, e) {
        L.postMessage(t, e ?? []);
    }
    function P() {
        return new Promise((t)=>setTimeout(t, 0));
    }
    function K(t, e) {
        const r = e instanceof Error ? e.message : String(e);
        R({
            type: "error",
            jobId: t,
            message: r
        });
    }
    function Q(t) {
        s && (t === "bla" ? s.use_bla() : s.use_perturbation());
    }
    function Dt(t) {
        s?.free(), s = new D(t.cx, t.cy, t.scale, t.angle), d = t.jobId, m = 0, h = t.maxIterations, x = !1, C = "", O = "", Q(t.approximationMode), s.set_bla_epsilon(t.blaEpsilon), z(t.jobId);
    }
    function Lt(t, e, r) {
        const b = Math.max(0, r - e), i = new Float32Array(I.buffer, t + e * 4 * Float32Array.BYTES_PER_ELEMENT, b * 4), a = new Float32Array(i.length);
        return a.set(i), a;
    }
    function J(t, e, r) {
        if (!s || t !== d || F || m >= e || r < e || s.get_approximation_mode() !== 1) return;
        const o = s.compute_bla_reference_ptr(e), b = new Float32Array(I.buffer, o.ptr, o.count * 6), i = new Float32Array(b.length);
        i.set(b);
        const a = new Uint32Array(I.buffer, o.levels_ptr, o.level_count * 4), l = new Uint32Array(a.length);
        l.set(a), m = e, R({
            type: "blaReady",
            jobId: t,
            maxIterations: e,
            steps: i,
            levels: l,
            levelCount: o.level_count
        }, [
            i.buffer,
            l.buffer
        ]);
    }
    async function z(t) {
        if (!W) {
            W = !0;
            try {
                for(; !F && s && t === d;){
                    const e = h, r = Math.max(0, s.get_reference_orbit_len());
                    if (r >= e && !x) {
                        if (J(t, e, r), await P(), h <= e) break;
                        continue;
                    }
                    const o = s.compute_reference_orbit_chunk(Wt, e);
                    x = !1;
                    const b = Lt(o.ptr, o.offset, o.count), [i, a] = s.get_reference_params();
                    C && (i !== C || a !== O) && (m = 0, R({
                        type: "referenceReset",
                        jobId: t,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: a
                    })), C = i, O = a;
                    const l = Math.max(0, o.count - 1);
                    R({
                        type: "orbitChunk",
                        jobId: t,
                        offset: o.offset,
                        count: o.count,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: a,
                        orbit: b
                    }, [
                        b.buffer
                    ]), J(t, e, l), await P();
                }
            } catch (e) {
                K(t, e);
            } finally{
                if (W = !1, !F && s) {
                    const e = Math.max(0, s.get_reference_orbit_len());
                    (t !== d || e < h || x) && z(d);
                }
            }
        }
    }
    L.onmessage = (t)=>{
        const e = t.data;
        try {
            switch(e.type){
                case "reset":
                    F || Dt(e);
                    break;
                case "updateView":
                    s && e.jobId === d && (s.origin(e.cx, e.cy), s.scale(e.scale), s.angle(e.angle), h = e.maxIterations, x = !0, z(e.jobId));
                    break;
                case "setApproximationMode":
                    e.jobId === d && (Q(e.approximationMode), m = 0, z(e.jobId));
                    break;
                case "setBlaEpsilon":
                    s && e.jobId === d && (s.set_bla_epsilon(e.blaEpsilon), m = 0, z(e.jobId));
                    break;
                case "dispose":
                    F = !0, s?.free(), s = void 0, L.close();
                    break;
            }
        } catch (r) {
            K("jobId" in e ? e.jobId : d, r);
        }
    };
    R({
        type: "ready"
    });
})();
