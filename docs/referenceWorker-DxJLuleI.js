(async ()=>{
    var $ = "" + new URL("mandelbrot_bg-DtRmUkTA.wasm", import.meta.url).href, q = async (_ = {}, e)=>{
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
            n = await WebAssembly.instantiate(a, _);
        } else {
            const o = await fetch(e), a = o.headers.get("Content-Type") || "";
            if ("instantiateStreaming" in WebAssembly && a.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(o, _);
            else {
                const i = await o.arrayBuffer();
                n = await WebAssembly.instantiate(i, _);
            }
        }
        return n.instance.exports;
    };
    let t;
    function G(_) {
        t = _;
    }
    let k = null;
    function T() {
        return (k === null || k.byteLength === 0) && (k = new Uint8Array(t.memory.buffer)), k;
    }
    let B = new TextDecoder("utf-8", {
        ignoreBOM: !0,
        fatal: !0
    });
    B.decode();
    const Q = 2146435072;
    let W = 0;
    function ee(_, e) {
        return W += e, W >= Q && (B = new TextDecoder("utf-8", {
            ignoreBOM: !0,
            fatal: !0
        }), B.decode(), W = e), B.decode(T().subarray(_, _ + e));
    }
    function H(_, e) {
        return _ = _ >>> 0, ee(_, e);
    }
    let u = null;
    function _e() {
        return (u === null || u.buffer.detached === !0 || u.buffer.detached === void 0 && u.buffer !== t.memory.buffer) && (u = new DataView(t.memory.buffer)), u;
    }
    function S(_, e) {
        _ = _ >>> 0;
        const n = _e(), o = [];
        for(let a = _; a < _ + 4 * e; a += 4)o.push(t.__wbindgen_export_0.get(n.getUint32(a, !0)));
        return t.__externref_drop_slice(_, e), o;
    }
    let g = 0;
    const h = new TextEncoder;
    "encodeInto" in h || (h.encodeInto = function(_, e) {
        const n = h.encode(_);
        return e.set(n), {
            read: _.length,
            written: n.length
        };
    });
    function c(_, e, n) {
        if (n === void 0) {
            const l = h.encode(_), f = e(l.length, 1) >>> 0;
            return T().subarray(f, f + l.length).set(l), g = l.length, f;
        }
        let o = _.length, a = e(o, 1) >>> 0;
        const i = T();
        let b = 0;
        for(; b < o; b++){
            const l = _.charCodeAt(b);
            if (l > 127) break;
            i[a + b] = l;
        }
        if (b !== o) {
            b !== 0 && (_ = _.slice(b)), a = n(a, o, o = b + _.length * 3, 1) >>> 0;
            const l = T().subarray(a + b, a + o), f = h.encodeInto(_, l);
            b += f.written, a = n(a, o, b, 1) >>> 0;
        }
        return g = b, a;
    }
    function d(_) {
        return _ == null;
    }
    let E = null;
    function te() {
        return (E === null || E.byteLength === 0) && (E = new Float64Array(t.memory.buffer)), E;
    }
    function re(_, e) {
        return _ = _ >>> 0, te().subarray(_ / 8, _ / 8 + e);
    }
    const N = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((_)=>t.__wbg_blabufferinfo_free(_ >>> 0, 1));
    class F {
        static __wrap(e) {
            e = e >>> 0;
            const n = Object.create(F.prototype);
            return n.__wbg_ptr = e, N.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, N.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            t.__wbg_blabufferinfo_free(e, 0);
        }
        get ptr() {
            return t.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(e) {
            t.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, e);
        }
        get count() {
            return t.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set count(e) {
            t.__wbg_set_blabufferinfo_count(this.__wbg_ptr, e);
        }
        get levels_ptr() {
            return t.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(e) {
            t.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, e);
        }
        get level_count() {
            return t.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(e) {
            t.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (F.prototype[Symbol.dispose] = F.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((_)=>t.__wbg_blalevel_free(_ >>> 0, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((_)=>t.__wbg_blastep_free(_ >>> 0, 1));
    const V = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((_)=>t.__wbg_mandelbrotnavigator_free(_ >>> 0, 1));
    class L {
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, V.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            t.__wbg_mandelbrotnavigator_free(e, 0);
        }
        get_params() {
            const e = t.mandelbrotnavigator_get_params(this.__wbg_ptr);
            var n = S(e[0], e[1]).slice();
            return t.__wbindgen_free(e[0], e[1] * 4, 4), n;
        }
        rotate_direct(e) {
            t.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, e);
        }
        get_bla_epsilon() {
            return t.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr);
        }
        set_bla_epsilon(e) {
            t.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr, e);
        }
        is_in_transition() {
            return t.mandelbrotnavigator_is_in_transition(this.__wbg_ptr) !== 0;
        }
        pixel_to_complex(e, n, o, a) {
            const i = t.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr, e, n, o, a);
            var b = S(i[0], i[1]).slice();
            return t.__wbindgen_free(i[0], i[1] * 4, 4), b;
        }
        reference_origin(e, n) {
            const o = c(e, t.__wbindgen_malloc, t.__wbindgen_realloc), a = g, i = c(n, t.__wbindgen_malloc, t.__wbindgen_realloc), b = g;
            t.mandelbrotnavigator_reference_origin(this.__wbg_ptr, o, a, i, b);
        }
        start_transition(e, n, o, a, i) {
            const b = c(e, t.__wbindgen_malloc, t.__wbindgen_realloc), l = g, f = c(n, t.__wbindgen_malloc, t.__wbindgen_realloc), w = g, y = c(o, t.__wbindgen_malloc, t.__wbindgen_realloc), U = g;
            t.mandelbrotnavigator_start_transition(this.__wbg_ptr, b, l, f, w, y, U, a, i);
        }
        translate_direct(e, n, o, a) {
            t.mandelbrotnavigator_translate_direct(this.__wbg_ptr, e, n, !d(o), d(o) ? 0 : o, !d(a), d(a) ? 0 : a);
        }
        use_perturbation() {
            t.mandelbrotnavigator_use_perturbation(this.__wbg_ptr);
        }
        cancel_transition() {
            t.mandelbrotnavigator_cancel_transition(this.__wbg_ptr);
        }
        coordinate_to_pixel(e, n, o, a) {
            const i = c(e, t.__wbindgen_malloc, t.__wbindgen_realloc), b = g, l = c(n, t.__wbindgen_malloc, t.__wbindgen_realloc), f = g, w = t.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr, i, b, l, f, o, a);
            var y = re(w[0], w[1]).slice();
            return t.__wbindgen_free(w[0], w[1] * 8, 8), y;
        }
        get_reference_params() {
            const e = t.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);
            var n = S(e[0], e[1]).slice();
            return t.__wbindgen_free(e[0], e[1] * 4, 4), n;
        }
        get_approximation_mode() {
            return t.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr);
        }
        get_reference_orbit_len() {
            return t.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        compute_bla_reference_ptr(e) {
            const n = t.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr, e);
            return F.__wrap(n);
        }
        compute_reference_orbit_ptr(e) {
            const n = t.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, e);
            return m.__wrap(n);
        }
        get_reference_orbit_capacity() {
            return t.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        compute_reference_orbit_chunk(e, n) {
            const o = t.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, e, n);
            return m.__wrap(o);
        }
        constructor(e, n, o, a){
            const i = c(e, t.__wbindgen_malloc, t.__wbindgen_realloc), b = g, l = c(n, t.__wbindgen_malloc, t.__wbindgen_realloc), f = g, w = c(o, t.__wbindgen_malloc, t.__wbindgen_realloc), y = g, U = t.mandelbrotnavigator_new(i, b, l, f, w, y, a);
            return this.__wbg_ptr = U >>> 0, V.register(this, this.__wbg_ptr, this), this;
        }
        step(e, n) {
            const o = t.mandelbrotnavigator_step(this.__wbg_ptr, !d(e), d(e) ? 0 : e, !d(n), d(n) ? 0 : n);
            var a = S(o[0], o[1]).slice();
            return t.__wbindgen_free(o[0], o[1] * 4, 4), a;
        }
        zoom(e) {
            t.mandelbrotnavigator_zoom(this.__wbg_ptr, e);
        }
        angle(e) {
            t.mandelbrotnavigator_angle(this.__wbg_ptr, e);
        }
        scale(e) {
            const n = c(e, t.__wbindgen_malloc, t.__wbindgen_realloc), o = g;
            t.mandelbrotnavigator_scale(this.__wbg_ptr, n, o);
        }
        origin(e, n) {
            const o = c(e, t.__wbindgen_malloc, t.__wbindgen_realloc), a = g, i = c(n, t.__wbindgen_malloc, t.__wbindgen_realloc), b = g;
            t.mandelbrotnavigator_origin(this.__wbg_ptr, o, a, i, b);
        }
        rotate(e) {
            t.mandelbrotnavigator_rotate(this.__wbg_ptr, e);
        }
        use_bla() {
            t.mandelbrotnavigator_use_bla(this.__wbg_ptr);
        }
        translate(e, n) {
            t.mandelbrotnavigator_translate(this.__wbg_ptr, e, n);
        }
    }
    Symbol.dispose && (L.prototype[Symbol.dispose] = L.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((_)=>t.__wbg_mandelbrotstep_free(_ >>> 0, 1));
    const P = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((_)=>t.__wbg_orbitbufferinfo_free(_ >>> 0, 1));
    class m {
        static __wrap(e) {
            e = e >>> 0;
            const n = Object.create(m.prototype);
            return n.__wbg_ptr = e, P.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, P.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            t.__wbg_orbitbufferinfo_free(e, 0);
        }
        get ptr() {
            return t.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(e) {
            t.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, e);
        }
        get offset() {
            return t.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set offset(e) {
            t.__wbg_set_blabufferinfo_count(this.__wbg_ptr, e);
        }
        get count() {
            return t.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set count(e) {
            t.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (m.prototype[Symbol.dispose] = m.prototype.free);
    function ne(_) {
        return Math.exp(_);
    }
    function oe() {
        return Date.now();
    }
    function ae(_, e) {
        throw new Error(H(_, e));
    }
    function be(_, e) {
        return H(_, e);
    }
    function ie() {
        const _ = t.__wbindgen_export_0, e = _.grow(4);
        _.set(0, void 0), _.set(e + 0, void 0), _.set(e + 1, null), _.set(e + 2, !0), _.set(e + 3, !1);
    }
    URL = globalThis.URL;
    const r = await q({
        "./mandelbrot_bg.js": {
            __wbg_now_1e80617bcee43265: oe,
            __wbg_exp_9293ded1248e1bd3: ne,
            __wbg_wbindgenthrow_451ec1a8469d7eb6: ae,
            __wbindgen_init_externref_table: ie,
            __wbindgen_cast_2241b6af4c4b2941: be
        }
    }, $), C = r.memory, se = r.__wbg_blabufferinfo_free, le = r.__wbg_blalevel_free, ge = r.__wbg_blastep_free, ce = r.__wbg_get_blabufferinfo_count, fe = r.__wbg_get_blabufferinfo_level_count, pe = r.__wbg_get_blabufferinfo_levels_ptr, we = r.__wbg_get_blabufferinfo_ptr, de = r.__wbg_get_blastep_ab_exp, ue = r.__wbg_get_blastep_alpha_exp, me = r.__wbg_get_blastep_ax, ve = r.__wbg_get_blastep_ay, ye = r.__wbg_get_blastep_bx, he = r.__wbg_get_blastep_by, xe = r.__wbg_get_blastep_radius_alpha, ze = r.__wbg_get_blastep_radius_beta, Ae = r.__wbg_mandelbrotnavigator_free, Fe = r.__wbg_mandelbrotstep_free, Re = r.__wbg_orbitbufferinfo_free, Me = r.__wbg_set_blabufferinfo_count, ke = r.__wbg_set_blabufferinfo_level_count, Se = r.__wbg_set_blabufferinfo_levels_ptr, Ee = r.__wbg_set_blabufferinfo_ptr, Te = r.__wbg_set_blastep_ab_exp, Be = r.__wbg_set_blastep_alpha_exp, Ie = r.__wbg_set_blastep_ax, Ce = r.__wbg_set_blastep_ay, Ue = r.__wbg_set_blastep_bx, We = r.__wbg_set_blastep_by, De = r.__wbg_set_blastep_radius_alpha, Le = r.__wbg_set_blastep_radius_beta, Oe = r.mandelbrotnavigator_angle, je = r.mandelbrotnavigator_cancel_transition, Ne = r.mandelbrotnavigator_compute_bla_reference_ptr, Ve = r.mandelbrotnavigator_compute_reference_orbit_chunk, Pe = r.mandelbrotnavigator_compute_reference_orbit_ptr, Je = r.mandelbrotnavigator_coordinate_to_pixel, Ye = r.mandelbrotnavigator_get_approximation_mode, He = r.mandelbrotnavigator_get_bla_epsilon, Ke = r.mandelbrotnavigator_get_params, Xe = r.mandelbrotnavigator_get_reference_orbit_capacity, Ze = r.mandelbrotnavigator_get_reference_orbit_len, $e = r.mandelbrotnavigator_get_reference_params, qe = r.mandelbrotnavigator_is_in_transition, Ge = r.mandelbrotnavigator_new, Qe = r.mandelbrotnavigator_origin, e_ = r.mandelbrotnavigator_pixel_to_complex, __ = r.mandelbrotnavigator_reference_origin, t_ = r.mandelbrotnavigator_rotate, r_ = r.mandelbrotnavigator_rotate_direct, n_ = r.mandelbrotnavigator_scale, o_ = r.mandelbrotnavigator_set_bla_epsilon, a_ = r.mandelbrotnavigator_start_transition, b_ = r.mandelbrotnavigator_step, i_ = r.mandelbrotnavigator_translate, s_ = r.mandelbrotnavigator_translate_direct, l_ = r.mandelbrotnavigator_use_bla, g_ = r.mandelbrotnavigator_use_perturbation, c_ = r.mandelbrotnavigator_zoom, f_ = r.__wbg_set_blalevel_count, p_ = r.__wbg_set_blalevel_max_radius_bits, w_ = r.__wbg_set_blalevel_offset, d_ = r.__wbg_set_blalevel_skip, u_ = r.__wbg_set_mandelbrotstep_zx, m_ = r.__wbg_set_mandelbrotstep_zx_lo, v_ = r.__wbg_set_mandelbrotstep_zy, y_ = r.__wbg_set_mandelbrotstep_zy_lo, h_ = r.__wbg_set_orbitbufferinfo_count, x_ = r.__wbg_set_orbitbufferinfo_offset, z_ = r.__wbg_set_orbitbufferinfo_ptr, A_ = r.__wbg_get_blalevel_count, F_ = r.__wbg_get_blalevel_max_radius_bits, R_ = r.__wbg_get_blalevel_offset, M_ = r.__wbg_get_blalevel_skip, k_ = r.__wbg_get_orbitbufferinfo_count, S_ = r.__wbg_get_orbitbufferinfo_offset, E_ = r.__wbg_get_orbitbufferinfo_ptr, T_ = r.__wbg_get_mandelbrotstep_zx, B_ = r.__wbg_get_mandelbrotstep_zx_lo, I_ = r.__wbg_get_mandelbrotstep_zy, C_ = r.__wbg_get_mandelbrotstep_zy_lo, U_ = r.__wbindgen_export_0, W_ = r.__externref_drop_slice, D_ = r.__wbindgen_free, L_ = r.__wbindgen_malloc, O_ = r.__wbindgen_realloc, K = r.__wbindgen_start;
    var j_ = Object.freeze({
        __proto__: null,
        __externref_drop_slice: W_,
        __wbg_blabufferinfo_free: se,
        __wbg_blalevel_free: le,
        __wbg_blastep_free: ge,
        __wbg_get_blabufferinfo_count: ce,
        __wbg_get_blabufferinfo_level_count: fe,
        __wbg_get_blabufferinfo_levels_ptr: pe,
        __wbg_get_blabufferinfo_ptr: we,
        __wbg_get_blalevel_count: A_,
        __wbg_get_blalevel_max_radius_bits: F_,
        __wbg_get_blalevel_offset: R_,
        __wbg_get_blalevel_skip: M_,
        __wbg_get_blastep_ab_exp: de,
        __wbg_get_blastep_alpha_exp: ue,
        __wbg_get_blastep_ax: me,
        __wbg_get_blastep_ay: ve,
        __wbg_get_blastep_bx: ye,
        __wbg_get_blastep_by: he,
        __wbg_get_blastep_radius_alpha: xe,
        __wbg_get_blastep_radius_beta: ze,
        __wbg_get_mandelbrotstep_zx: T_,
        __wbg_get_mandelbrotstep_zx_lo: B_,
        __wbg_get_mandelbrotstep_zy: I_,
        __wbg_get_mandelbrotstep_zy_lo: C_,
        __wbg_get_orbitbufferinfo_count: k_,
        __wbg_get_orbitbufferinfo_offset: S_,
        __wbg_get_orbitbufferinfo_ptr: E_,
        __wbg_mandelbrotnavigator_free: Ae,
        __wbg_mandelbrotstep_free: Fe,
        __wbg_orbitbufferinfo_free: Re,
        __wbg_set_blabufferinfo_count: Me,
        __wbg_set_blabufferinfo_level_count: ke,
        __wbg_set_blabufferinfo_levels_ptr: Se,
        __wbg_set_blabufferinfo_ptr: Ee,
        __wbg_set_blalevel_count: f_,
        __wbg_set_blalevel_max_radius_bits: p_,
        __wbg_set_blalevel_offset: w_,
        __wbg_set_blalevel_skip: d_,
        __wbg_set_blastep_ab_exp: Te,
        __wbg_set_blastep_alpha_exp: Be,
        __wbg_set_blastep_ax: Ie,
        __wbg_set_blastep_ay: Ce,
        __wbg_set_blastep_bx: Ue,
        __wbg_set_blastep_by: We,
        __wbg_set_blastep_radius_alpha: De,
        __wbg_set_blastep_radius_beta: Le,
        __wbg_set_mandelbrotstep_zx: u_,
        __wbg_set_mandelbrotstep_zx_lo: m_,
        __wbg_set_mandelbrotstep_zy: v_,
        __wbg_set_mandelbrotstep_zy_lo: y_,
        __wbg_set_orbitbufferinfo_count: h_,
        __wbg_set_orbitbufferinfo_offset: x_,
        __wbg_set_orbitbufferinfo_ptr: z_,
        __wbindgen_export_0: U_,
        __wbindgen_free: D_,
        __wbindgen_malloc: L_,
        __wbindgen_realloc: O_,
        __wbindgen_start: K,
        mandelbrotnavigator_angle: Oe,
        mandelbrotnavigator_cancel_transition: je,
        mandelbrotnavigator_compute_bla_reference_ptr: Ne,
        mandelbrotnavigator_compute_reference_orbit_chunk: Ve,
        mandelbrotnavigator_compute_reference_orbit_ptr: Pe,
        mandelbrotnavigator_coordinate_to_pixel: Je,
        mandelbrotnavigator_get_approximation_mode: Ye,
        mandelbrotnavigator_get_bla_epsilon: He,
        mandelbrotnavigator_get_params: Ke,
        mandelbrotnavigator_get_reference_orbit_capacity: Xe,
        mandelbrotnavigator_get_reference_orbit_len: Ze,
        mandelbrotnavigator_get_reference_params: $e,
        mandelbrotnavigator_is_in_transition: qe,
        mandelbrotnavigator_new: Ge,
        mandelbrotnavigator_origin: Qe,
        mandelbrotnavigator_pixel_to_complex: e_,
        mandelbrotnavigator_reference_origin: __,
        mandelbrotnavigator_rotate: t_,
        mandelbrotnavigator_rotate_direct: r_,
        mandelbrotnavigator_scale: n_,
        mandelbrotnavigator_set_bla_epsilon: o_,
        mandelbrotnavigator_start_transition: a_,
        mandelbrotnavigator_step: b_,
        mandelbrotnavigator_translate: i_,
        mandelbrotnavigator_translate_direct: s_,
        mandelbrotnavigator_use_bla: l_,
        mandelbrotnavigator_use_perturbation: g_,
        mandelbrotnavigator_zoom: c_,
        memory: C
    });
    G(j_);
    K();
    const O = self;
    let s, p = 0, R = !1, v = 0, x = 0, D = !1, z = !1, I = "", j = "";
    const N_ = 1e3;
    function M(_, e) {
        O.postMessage(_, e ?? []);
    }
    function J() {
        return new Promise((_)=>setTimeout(_, 0));
    }
    function X(_, e) {
        const n = e instanceof Error ? e.message : String(e);
        M({
            type: "error",
            jobId: _,
            message: n
        });
    }
    function Z(_) {
        s && (_ === "bla" ? s.use_bla() : s.use_perturbation());
    }
    function V_(_) {
        s?.free(), s = new L(_.cx, _.cy, _.scale, _.angle), p = _.jobId, v = 0, x = _.maxIterations, z = !1, I = "", j = "", Z(_.approximationMode), s.set_bla_epsilon(_.blaEpsilon), A(_.jobId);
    }
    function P_(_, e, n) {
        const a = Math.max(0, n - e), i = new Float32Array(C.buffer, _ + e * 4 * Float32Array.BYTES_PER_ELEMENT, a * 4), b = new Float32Array(i.length);
        return b.set(i), b;
    }
    function Y(_, e, n) {
        if (!s || _ !== p || R || v >= e || n < e || s.get_approximation_mode() !== 1) return;
        const o = s.compute_bla_reference_ptr(e), a = new Float32Array(C.buffer, o.ptr, o.count * 8), i = new Float32Array(a.length);
        i.set(a);
        const b = new Uint32Array(C.buffer, o.levels_ptr, o.level_count * 4), l = new Uint32Array(b.length);
        l.set(b), v = e, M({
            type: "blaReady",
            jobId: _,
            maxIterations: e,
            steps: i,
            levels: l,
            levelCount: o.level_count
        }, [
            i.buffer,
            l.buffer
        ]);
    }
    async function A(_) {
        if (!D) {
            D = !0;
            try {
                for(; !R && s && _ === p;){
                    const e = x, n = Math.max(0, s.get_reference_orbit_len());
                    if (n >= e && !z) {
                        if (Y(_, e, n), await J(), x <= e) break;
                        continue;
                    }
                    const o = s.compute_reference_orbit_chunk(N_, e);
                    z = !1;
                    const a = P_(o.ptr, o.offset, o.count), [i, b] = s.get_reference_params();
                    I && (i !== I || b !== j) && (v = 0, M({
                        type: "referenceReset",
                        jobId: _,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: b
                    })), I = i, j = b;
                    const l = Math.max(0, o.count - 1);
                    M({
                        type: "orbitChunk",
                        jobId: _,
                        offset: o.offset,
                        count: o.count,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: b,
                        orbit: a
                    }, [
                        a.buffer
                    ]), Y(_, e, l), await J();
                }
            } catch (e) {
                X(_, e);
            } finally{
                if (D = !1, !R && s) {
                    const e = Math.max(0, s.get_reference_orbit_len());
                    (_ !== p || e < x || z) && A(p);
                }
            }
        }
    }
    O.onmessage = (_)=>{
        const e = _.data;
        try {
            switch(e.type){
                case "reset":
                    R || V_(e);
                    break;
                case "updateView":
                    s && e.jobId === p && (s.origin(e.cx, e.cy), s.scale(e.scale), s.angle(e.angle), x = e.maxIterations, z = !0, A(e.jobId));
                    break;
                case "setApproximationMode":
                    e.jobId === p && (Z(e.approximationMode), v = 0, A(e.jobId));
                    break;
                case "setBlaEpsilon":
                    s && e.jobId === p && (s.set_bla_epsilon(e.blaEpsilon), v = 0, A(e.jobId));
                    break;
                case "dispose":
                    R = !0, s?.free(), s = void 0, O.close();
                    break;
            }
        } catch (n) {
            X("jobId" in e ? e.jobId : p, n);
        }
    };
    M({
        type: "ready"
    });
})();
