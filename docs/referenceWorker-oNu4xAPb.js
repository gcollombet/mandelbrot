(async ()=>{
    var G = "" + new URL("mandelbrot_bg-Bc65vEoX.wasm", import.meta.url).href, Q = async (r = {}, _)=>{
        let a;
        if (_.startsWith("data:")) {
            const n = _.replace(/^data:.*?base64,/, "");
            let o;
            if (typeof Buffer == "function" && typeof Buffer.from == "function") o = Buffer.from(n, "base64");
            else if (typeof atob == "function") {
                const s = atob(n);
                o = new Uint8Array(s.length);
                for(let b = 0; b < s.length; b++)o[b] = s.charCodeAt(b);
            } else throw new Error("Cannot decode base64-encoded data URL");
            a = await WebAssembly.instantiate(o, r);
        } else {
            const n = await fetch(_), o = n.headers.get("Content-Type") || "";
            if ("instantiateStreaming" in WebAssembly && o.startsWith("application/wasm")) a = await WebAssembly.instantiateStreaming(n, r);
            else {
                const s = await n.arrayBuffer();
                a = await WebAssembly.instantiate(s, r);
            }
        }
        return a.instance.exports;
    };
    let t;
    function __(r) {
        t = r;
    }
    let A = null;
    function B() {
        return (A === null || A.byteLength === 0) && (A = new Uint8Array(t.memory.buffer)), A;
    }
    let D = new TextDecoder("utf-8", {
        ignoreBOM: !0,
        fatal: !0
    });
    D.decode();
    const e_ = 2146435072;
    let L = 0;
    function t_(r, _) {
        return L += _, L >= e_ && (D = new TextDecoder("utf-8", {
            ignoreBOM: !0,
            fatal: !0
        }), D.decode(), L = _), D.decode(B().subarray(r, r + _));
    }
    function K(r, _) {
        return r = r >>> 0, t_(r, _);
    }
    let v = null;
    function r_() {
        return (v === null || v.buffer.detached === !0 || v.buffer.detached === void 0 && v.buffer !== t.memory.buffer) && (v = new DataView(t.memory.buffer)), v;
    }
    function k(r, _) {
        r = r >>> 0;
        const a = r_(), n = [];
        for(let o = r; o < r + 4 * _; o += 4)n.push(t.__wbindgen_export_0.get(a.getUint32(o, !0)));
        return t.__externref_drop_slice(r, _), n;
    }
    let c = 0;
    const S = new TextEncoder;
    "encodeInto" in S || (S.encodeInto = function(r, _) {
        const a = S.encode(r);
        return _.set(a), {
            read: r.length,
            written: a.length
        };
    });
    function p(r, _, a) {
        if (a === void 0) {
            const l = S.encode(r), g = _(l.length, 1) >>> 0;
            return B().subarray(g, g + l.length).set(l), c = l.length, g;
        }
        let n = r.length, o = _(n, 1) >>> 0;
        const s = B();
        let b = 0;
        for(; b < n; b++){
            const l = r.charCodeAt(b);
            if (l > 127) break;
            s[o + b] = l;
        }
        if (b !== n) {
            b !== 0 && (r = r.slice(b)), o = a(o, n, n = b + r.length * 3, 1) >>> 0;
            const l = B().subarray(o + b, o + n), g = S.encodeInto(r, l);
            b += g.written, o = a(o, n, b, 1) >>> 0;
        }
        return c = b, o;
    }
    function w(r) {
        return r == null;
    }
    let M = null;
    function a_() {
        return (M === null || M.byteLength === 0) && (M = new Float64Array(t.memory.buffer)), M;
    }
    function n_(r, _) {
        return r = r >>> 0, a_().subarray(r / 8, r / 8 + _);
    }
    const V = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>t.__wbg_blabufferinfo_free(r >>> 0, 1));
    class I {
        static __wrap(_) {
            _ = _ >>> 0;
            const a = Object.create(I.prototype);
            return a.__wbg_ptr = _, V.register(a, a.__wbg_ptr, a), a;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, V.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            t.__wbg_blabufferinfo_free(_, 0);
        }
        get ptr() {
            return t.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(_) {
            t.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, _);
        }
        get count() {
            return t.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set count(_) {
            t.__wbg_set_blabufferinfo_count(this.__wbg_ptr, _);
        }
        get levels_ptr() {
            return t.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(_) {
            t.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, _);
        }
        get level_count() {
            return t.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(_) {
            t.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, _);
        }
    }
    Symbol.dispose && (I.prototype[Symbol.dispose] = I.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((r)=>t.__wbg_blalevel_free(r >>> 0, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((r)=>t.__wbg_blastep_free(r >>> 0, 1));
    const P = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>t.__wbg_mandelbrotnavigator_free(r >>> 0, 1));
    class W {
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, P.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            t.__wbg_mandelbrotnavigator_free(_, 0);
        }
        get_params() {
            const _ = t.mandelbrotnavigator_get_params(this.__wbg_ptr);
            var a = k(_[0], _[1]).slice();
            return t.__wbindgen_free(_[0], _[1] * 4, 4), a;
        }
        find_minibrot(_, a) {
            const n = t.mandelbrotnavigator_find_minibrot(this.__wbg_ptr, _, a);
            var o = k(n[0], n[1]).slice();
            return t.__wbindgen_free(n[0], n[1] * 4, 4), o;
        }
        rotate_direct(_) {
            t.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, _);
        }
        benchmark_pade(_) {
            const a = t.mandelbrotnavigator_benchmark_pade(this.__wbg_ptr, _);
            return z.__wrap(a);
        }
        get_bla_epsilon() {
            return t.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr);
        }
        set_bla_epsilon(_) {
            t.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr, _);
        }
        get_max_bla_skip() {
            return t.mandelbrotnavigator_get_max_bla_skip(this.__wbg_ptr) >>> 0;
        }
        is_in_transition() {
            return t.mandelbrotnavigator_is_in_transition(this.__wbg_ptr) !== 0;
        }
        pixel_to_complex(_, a, n, o) {
            const s = t.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr, _, a, n, o);
            var b = k(s[0], s[1]).slice();
            return t.__wbindgen_free(s[0], s[1] * 4, 4), b;
        }
        reference_origin(_, a) {
            const n = p(_, t.__wbindgen_malloc, t.__wbindgen_realloc), o = c, s = p(a, t.__wbindgen_malloc, t.__wbindgen_realloc), b = c;
            t.mandelbrotnavigator_reference_origin(this.__wbg_ptr, n, o, s, b);
        }
        set_max_bla_skip(_) {
            t.mandelbrotnavigator_set_max_bla_skip(this.__wbg_ptr, _);
        }
        start_transition(_, a, n, o, s) {
            const b = p(_, t.__wbindgen_malloc, t.__wbindgen_realloc), l = c, g = p(a, t.__wbindgen_malloc, t.__wbindgen_realloc), f = c, y = p(n, t.__wbindgen_malloc, t.__wbindgen_realloc), j = c;
            t.mandelbrotnavigator_start_transition(this.__wbg_ptr, b, l, g, f, y, j, o, s);
        }
        translate_direct(_, a, n, o) {
            t.mandelbrotnavigator_translate_direct(this.__wbg_ptr, _, a, !w(n), w(n) ? 0 : n, !w(o), w(o) ? 0 : o);
        }
        use_perturbation() {
            t.mandelbrotnavigator_use_perturbation(this.__wbg_ptr);
        }
        cancel_transition() {
            t.mandelbrotnavigator_cancel_transition(this.__wbg_ptr);
        }
        coordinate_to_pixel(_, a, n, o) {
            const s = p(_, t.__wbindgen_malloc, t.__wbindgen_realloc), b = c, l = p(a, t.__wbindgen_malloc, t.__wbindgen_realloc), g = c, f = t.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr, s, b, l, g, n, o);
            var y = n_(f[0], f[1]).slice();
            return t.__wbindgen_free(f[0], f[1] * 8, 8), y;
        }
        get_reference_params() {
            const _ = t.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);
            var a = k(_[0], _[1]).slice();
            return t.__wbindgen_free(_[0], _[1] * 4, 4), a;
        }
        get_approximation_mode() {
            return t.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr);
        }
        get_reference_orbit_len() {
            return t.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        compute_bla_reference_ptr(_) {
            const a = t.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr, _);
            return I.__wrap(a);
        }
        compute_reference_orbit_ptr(_) {
            const a = t.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, _);
            return x.__wrap(a);
        }
        get_reference_orbit_capacity() {
            return t.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        compute_reference_orbit_chunk(_, a) {
            const n = t.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, _, a);
            return x.__wrap(n);
        }
        constructor(_, a, n, o){
            const s = p(_, t.__wbindgen_malloc, t.__wbindgen_realloc), b = c, l = p(a, t.__wbindgen_malloc, t.__wbindgen_realloc), g = c, f = p(n, t.__wbindgen_malloc, t.__wbindgen_realloc), y = c, j = t.mandelbrotnavigator_new(s, b, l, g, f, y, o);
            return this.__wbg_ptr = j >>> 0, P.register(this, this.__wbg_ptr, this), this;
        }
        step(_, a) {
            const n = t.mandelbrotnavigator_step(this.__wbg_ptr, !w(_), w(_) ? 0 : _, !w(a), w(a) ? 0 : a);
            var o = k(n[0], n[1]).slice();
            return t.__wbindgen_free(n[0], n[1] * 4, 4), o;
        }
        zoom(_) {
            t.mandelbrotnavigator_zoom(this.__wbg_ptr, _);
        }
        angle(_) {
            t.mandelbrotnavigator_angle(this.__wbg_ptr, _);
        }
        scale(_) {
            const a = p(_, t.__wbindgen_malloc, t.__wbindgen_realloc), n = c;
            t.mandelbrotnavigator_scale(this.__wbg_ptr, a, n);
        }
        origin(_, a) {
            const n = p(_, t.__wbindgen_malloc, t.__wbindgen_realloc), o = c, s = p(a, t.__wbindgen_malloc, t.__wbindgen_realloc), b = c;
            t.mandelbrotnavigator_origin(this.__wbg_ptr, n, o, s, b);
        }
        rotate(_) {
            t.mandelbrotnavigator_rotate(this.__wbg_ptr, _);
        }
        use_bla() {
            t.mandelbrotnavigator_use_bla(this.__wbg_ptr);
        }
        use_pade() {
            t.mandelbrotnavigator_use_pade(this.__wbg_ptr);
        }
        translate(_, a) {
            t.mandelbrotnavigator_translate(this.__wbg_ptr, _, a);
        }
    }
    Symbol.dispose && (W.prototype[Symbol.dispose] = W.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((r)=>t.__wbg_mandelbrotstep_free(r >>> 0, 1));
    const J = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>t.__wbg_orbitbufferinfo_free(r >>> 0, 1));
    class x {
        static __wrap(_) {
            _ = _ >>> 0;
            const a = Object.create(x.prototype);
            return a.__wbg_ptr = _, J.register(a, a.__wbg_ptr, a), a;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, J.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            t.__wbg_orbitbufferinfo_free(_, 0);
        }
        get ptr() {
            return t.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(_) {
            t.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, _);
        }
        get offset() {
            return t.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set offset(_) {
            t.__wbg_set_blabufferinfo_count(this.__wbg_ptr, _);
        }
        get count() {
            return t.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set count(_) {
            t.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, _);
        }
    }
    Symbol.dispose && (x.prototype[Symbol.dispose] = x.prototype.free);
    const X = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>t.__wbg_padebenchmark_free(r >>> 0, 1));
    class z {
        static __wrap(_) {
            _ = _ >>> 0;
            const a = Object.create(z.prototype);
            return a.__wbg_ptr = _, X.register(a, a.__wbg_ptr, a), a;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, X.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            t.__wbg_padebenchmark_free(_, 0);
        }
        get pixels() {
            return t.__wbg_get_padebenchmark_pixels(this.__wbg_ptr) >>> 0;
        }
        set pixels(_) {
            t.__wbg_set_padebenchmark_pixels(this.__wbg_ptr, _);
        }
        get max_iter() {
            return t.__wbg_get_padebenchmark_max_iter(this.__wbg_ptr) >>> 0;
        }
        set max_iter(_) {
            t.__wbg_set_padebenchmark_max_iter(this.__wbg_ptr, _);
        }
        get steps_exact() {
            return t.__wbg_get_padebenchmark_steps_exact(this.__wbg_ptr);
        }
        set steps_exact(_) {
            t.__wbg_set_padebenchmark_steps_exact(this.__wbg_ptr, _);
        }
        get steps_affine() {
            return t.__wbg_get_padebenchmark_steps_affine(this.__wbg_ptr);
        }
        set steps_affine(_) {
            t.__wbg_set_padebenchmark_steps_affine(this.__wbg_ptr, _);
        }
        get steps_pade() {
            return t.__wbg_get_padebenchmark_steps_pade(this.__wbg_ptr);
        }
        set steps_pade(_) {
            t.__wbg_set_padebenchmark_steps_pade(this.__wbg_ptr, _);
        }
        get pade_mismatches() {
            return t.__wbg_get_padebenchmark_pade_mismatches(this.__wbg_ptr) >>> 0;
        }
        set pade_mismatches(_) {
            t.__wbg_set_padebenchmark_pade_mismatches(this.__wbg_ptr, _);
        }
        get max_iter_delta() {
            return t.__wbg_get_padebenchmark_max_iter_delta(this.__wbg_ptr) >>> 0;
        }
        set max_iter_delta(_) {
            t.__wbg_set_blastep_d_exp(this.__wbg_ptr, _);
        }
    }
    Symbol.dispose && (z.prototype[Symbol.dispose] = z.prototype.free);
    function o_(r) {
        return Math.exp(r);
    }
    function b_() {
        return Date.now();
    }
    function s_(r, _) {
        throw new Error(K(r, _));
    }
    function i_(r, _) {
        return K(r, _);
    }
    function l_() {
        const r = t.__wbindgen_export_0, _ = r.grow(4);
        r.set(0, void 0), r.set(_ + 0, void 0), r.set(_ + 1, null), r.set(_ + 2, !0), r.set(_ + 3, !1);
    }
    URL = globalThis.URL;
    const e = await Q({
        "./mandelbrot_bg.js": {
            __wbg_now_1e80617bcee43265: b_,
            __wbg_exp_9293ded1248e1bd3: o_,
            __wbg_wbindgenthrow_451ec1a8469d7eb6: s_,
            __wbindgen_init_externref_table: l_,
            __wbindgen_cast_2241b6af4c4b2941: i_
        }
    }, G), C = e.memory, g_ = e.__wbg_blabufferinfo_free, c_ = e.__wbg_blalevel_free, p_ = e.__wbg_blastep_free, d_ = e.__wbg_get_blabufferinfo_count, f_ = e.__wbg_get_blabufferinfo_level_count, w_ = e.__wbg_get_blabufferinfo_levels_ptr, m_ = e.__wbg_get_blabufferinfo_ptr, u_ = e.__wbg_get_blastep_ab_exp, v_ = e.__wbg_get_blastep_alpha_exp, h_ = e.__wbg_get_blastep_ax, x_ = e.__wbg_get_blastep_ay, y_ = e.__wbg_get_blastep_bx, k_ = e.__wbg_get_blastep_by, R_ = e.__wbg_get_blastep_d_exp, S_ = e.__wbg_get_blastep_dx, E_ = e.__wbg_get_blastep_dy, F_ = e.__wbg_get_blastep_log2_min_a, I_ = e.__wbg_get_blastep_radius_alpha, z_ = e.__wbg_get_blastep_radius_beta, T_ = e.__wbg_get_padebenchmark_max_iter, A_ = e.__wbg_get_padebenchmark_max_iter_delta, M_ = e.__wbg_get_padebenchmark_pade_mismatches, B_ = e.__wbg_get_padebenchmark_pixels, D_ = e.__wbg_get_padebenchmark_steps_affine, C_ = e.__wbg_get_padebenchmark_steps_exact, j_ = e.__wbg_get_padebenchmark_steps_pade, L_ = e.__wbg_mandelbrotnavigator_free, U_ = e.__wbg_mandelbrotstep_free, W_ = e.__wbg_orbitbufferinfo_free, O_ = e.__wbg_padebenchmark_free, N_ = e.__wbg_set_blabufferinfo_count, V_ = e.__wbg_set_blabufferinfo_level_count, P_ = e.__wbg_set_blabufferinfo_levels_ptr, J_ = e.__wbg_set_blabufferinfo_ptr, X_ = e.__wbg_set_blastep_ab_exp, Y_ = e.__wbg_set_blastep_alpha_exp, H_ = e.__wbg_set_blastep_ax, K_ = e.__wbg_set_blastep_ay, Z_ = e.__wbg_set_blastep_bx, $_ = e.__wbg_set_blastep_by, q_ = e.__wbg_set_blastep_d_exp, G_ = e.__wbg_set_blastep_dx, Q_ = e.__wbg_set_blastep_dy, _e = e.__wbg_set_blastep_log2_min_a, ee = e.__wbg_set_blastep_radius_alpha, te = e.__wbg_set_blastep_radius_beta, re = e.__wbg_set_padebenchmark_max_iter, ae = e.__wbg_set_padebenchmark_pade_mismatches, ne = e.__wbg_set_padebenchmark_pixels, oe = e.__wbg_set_padebenchmark_steps_affine, be = e.__wbg_set_padebenchmark_steps_exact, se = e.__wbg_set_padebenchmark_steps_pade, ie = e.mandelbrotnavigator_angle, le = e.mandelbrotnavigator_benchmark_pade, ge = e.mandelbrotnavigator_cancel_transition, ce = e.mandelbrotnavigator_compute_bla_reference_ptr, pe = e.mandelbrotnavigator_compute_reference_orbit_chunk, de = e.mandelbrotnavigator_compute_reference_orbit_ptr, fe = e.mandelbrotnavigator_coordinate_to_pixel, we = e.mandelbrotnavigator_find_minibrot, me = e.mandelbrotnavigator_get_approximation_mode, ue = e.mandelbrotnavigator_get_bla_epsilon, ve = e.mandelbrotnavigator_get_max_bla_skip, he = e.mandelbrotnavigator_get_params, xe = e.mandelbrotnavigator_get_reference_orbit_capacity, ye = e.mandelbrotnavigator_get_reference_orbit_len, ke = e.mandelbrotnavigator_get_reference_params, Re = e.mandelbrotnavigator_is_in_transition, Se = e.mandelbrotnavigator_new, Ee = e.mandelbrotnavigator_origin, Fe = e.mandelbrotnavigator_pixel_to_complex, Ie = e.mandelbrotnavigator_reference_origin, ze = e.mandelbrotnavigator_rotate, Te = e.mandelbrotnavigator_rotate_direct, Ae = e.mandelbrotnavigator_scale, Me = e.mandelbrotnavigator_set_bla_epsilon, Be = e.mandelbrotnavigator_set_max_bla_skip, De = e.mandelbrotnavigator_start_transition, Ce = e.mandelbrotnavigator_step, je = e.mandelbrotnavigator_translate, Le = e.mandelbrotnavigator_translate_direct, Ue = e.mandelbrotnavigator_use_bla, We = e.mandelbrotnavigator_use_pade, Oe = e.mandelbrotnavigator_use_perturbation, Ne = e.mandelbrotnavigator_zoom, Ve = e.__wbg_set_blalevel_count, Pe = e.__wbg_set_blalevel_max_radius_bits, Je = e.__wbg_set_blalevel_offset, Xe = e.__wbg_set_blalevel_skip, Ye = e.__wbg_set_mandelbrotstep_pad0, He = e.__wbg_set_mandelbrotstep_pad1, Ke = e.__wbg_set_mandelbrotstep_zx, Ze = e.__wbg_set_mandelbrotstep_zy, $e = e.__wbg_set_orbitbufferinfo_count, qe = e.__wbg_set_orbitbufferinfo_offset, Ge = e.__wbg_set_orbitbufferinfo_ptr, Qe = e.__wbg_set_padebenchmark_max_iter_delta, _t = e.__wbg_get_blalevel_count, et = e.__wbg_get_blalevel_max_radius_bits, tt = e.__wbg_get_blalevel_offset, rt = e.__wbg_get_blalevel_skip, at = e.__wbg_get_orbitbufferinfo_count, nt = e.__wbg_get_orbitbufferinfo_offset, ot = e.__wbg_get_orbitbufferinfo_ptr, bt = e.__wbg_get_mandelbrotstep_pad0, st = e.__wbg_get_mandelbrotstep_pad1, it = e.__wbg_get_mandelbrotstep_zx, lt = e.__wbg_get_mandelbrotstep_zy, gt = e.__wbindgen_export_0, ct = e.__externref_drop_slice, pt = e.__wbindgen_free, dt = e.__wbindgen_malloc, ft = e.__wbindgen_realloc, Z = e.__wbindgen_start;
    var wt = Object.freeze({
        __proto__: null,
        __externref_drop_slice: ct,
        __wbg_blabufferinfo_free: g_,
        __wbg_blalevel_free: c_,
        __wbg_blastep_free: p_,
        __wbg_get_blabufferinfo_count: d_,
        __wbg_get_blabufferinfo_level_count: f_,
        __wbg_get_blabufferinfo_levels_ptr: w_,
        __wbg_get_blabufferinfo_ptr: m_,
        __wbg_get_blalevel_count: _t,
        __wbg_get_blalevel_max_radius_bits: et,
        __wbg_get_blalevel_offset: tt,
        __wbg_get_blalevel_skip: rt,
        __wbg_get_blastep_ab_exp: u_,
        __wbg_get_blastep_alpha_exp: v_,
        __wbg_get_blastep_ax: h_,
        __wbg_get_blastep_ay: x_,
        __wbg_get_blastep_bx: y_,
        __wbg_get_blastep_by: k_,
        __wbg_get_blastep_d_exp: R_,
        __wbg_get_blastep_dx: S_,
        __wbg_get_blastep_dy: E_,
        __wbg_get_blastep_log2_min_a: F_,
        __wbg_get_blastep_radius_alpha: I_,
        __wbg_get_blastep_radius_beta: z_,
        __wbg_get_mandelbrotstep_pad0: bt,
        __wbg_get_mandelbrotstep_pad1: st,
        __wbg_get_mandelbrotstep_zx: it,
        __wbg_get_mandelbrotstep_zy: lt,
        __wbg_get_orbitbufferinfo_count: at,
        __wbg_get_orbitbufferinfo_offset: nt,
        __wbg_get_orbitbufferinfo_ptr: ot,
        __wbg_get_padebenchmark_max_iter: T_,
        __wbg_get_padebenchmark_max_iter_delta: A_,
        __wbg_get_padebenchmark_pade_mismatches: M_,
        __wbg_get_padebenchmark_pixels: B_,
        __wbg_get_padebenchmark_steps_affine: D_,
        __wbg_get_padebenchmark_steps_exact: C_,
        __wbg_get_padebenchmark_steps_pade: j_,
        __wbg_mandelbrotnavigator_free: L_,
        __wbg_mandelbrotstep_free: U_,
        __wbg_orbitbufferinfo_free: W_,
        __wbg_padebenchmark_free: O_,
        __wbg_set_blabufferinfo_count: N_,
        __wbg_set_blabufferinfo_level_count: V_,
        __wbg_set_blabufferinfo_levels_ptr: P_,
        __wbg_set_blabufferinfo_ptr: J_,
        __wbg_set_blalevel_count: Ve,
        __wbg_set_blalevel_max_radius_bits: Pe,
        __wbg_set_blalevel_offset: Je,
        __wbg_set_blalevel_skip: Xe,
        __wbg_set_blastep_ab_exp: X_,
        __wbg_set_blastep_alpha_exp: Y_,
        __wbg_set_blastep_ax: H_,
        __wbg_set_blastep_ay: K_,
        __wbg_set_blastep_bx: Z_,
        __wbg_set_blastep_by: $_,
        __wbg_set_blastep_d_exp: q_,
        __wbg_set_blastep_dx: G_,
        __wbg_set_blastep_dy: Q_,
        __wbg_set_blastep_log2_min_a: _e,
        __wbg_set_blastep_radius_alpha: ee,
        __wbg_set_blastep_radius_beta: te,
        __wbg_set_mandelbrotstep_pad0: Ye,
        __wbg_set_mandelbrotstep_pad1: He,
        __wbg_set_mandelbrotstep_zx: Ke,
        __wbg_set_mandelbrotstep_zy: Ze,
        __wbg_set_orbitbufferinfo_count: $e,
        __wbg_set_orbitbufferinfo_offset: qe,
        __wbg_set_orbitbufferinfo_ptr: Ge,
        __wbg_set_padebenchmark_max_iter: re,
        __wbg_set_padebenchmark_max_iter_delta: Qe,
        __wbg_set_padebenchmark_pade_mismatches: ae,
        __wbg_set_padebenchmark_pixels: ne,
        __wbg_set_padebenchmark_steps_affine: oe,
        __wbg_set_padebenchmark_steps_exact: be,
        __wbg_set_padebenchmark_steps_pade: se,
        __wbindgen_export_0: gt,
        __wbindgen_free: pt,
        __wbindgen_malloc: dt,
        __wbindgen_realloc: ft,
        __wbindgen_start: Z,
        mandelbrotnavigator_angle: ie,
        mandelbrotnavigator_benchmark_pade: le,
        mandelbrotnavigator_cancel_transition: ge,
        mandelbrotnavigator_compute_bla_reference_ptr: ce,
        mandelbrotnavigator_compute_reference_orbit_chunk: pe,
        mandelbrotnavigator_compute_reference_orbit_ptr: de,
        mandelbrotnavigator_coordinate_to_pixel: fe,
        mandelbrotnavigator_find_minibrot: we,
        mandelbrotnavigator_get_approximation_mode: me,
        mandelbrotnavigator_get_bla_epsilon: ue,
        mandelbrotnavigator_get_max_bla_skip: ve,
        mandelbrotnavigator_get_params: he,
        mandelbrotnavigator_get_reference_orbit_capacity: xe,
        mandelbrotnavigator_get_reference_orbit_len: ye,
        mandelbrotnavigator_get_reference_params: ke,
        mandelbrotnavigator_is_in_transition: Re,
        mandelbrotnavigator_new: Se,
        mandelbrotnavigator_origin: Ee,
        mandelbrotnavigator_pixel_to_complex: Fe,
        mandelbrotnavigator_reference_origin: Ie,
        mandelbrotnavigator_rotate: ze,
        mandelbrotnavigator_rotate_direct: Te,
        mandelbrotnavigator_scale: Ae,
        mandelbrotnavigator_set_bla_epsilon: Me,
        mandelbrotnavigator_set_max_bla_skip: Be,
        mandelbrotnavigator_start_transition: De,
        mandelbrotnavigator_step: Ce,
        mandelbrotnavigator_translate: je,
        mandelbrotnavigator_translate_direct: Le,
        mandelbrotnavigator_use_bla: Ue,
        mandelbrotnavigator_use_pade: We,
        mandelbrotnavigator_use_perturbation: Oe,
        mandelbrotnavigator_zoom: Ne,
        memory: C
    });
    __(wt);
    Z();
    const O = self;
    let i, d = 0, T = !1, m = 0, E = 0, U = !1, F = !1, R = "", N = "";
    const mt = 1e3;
    function u(r, _) {
        O.postMessage(r, _ ?? []);
    }
    function Y() {
        return new Promise((r)=>setTimeout(r, 0));
    }
    function $(r, _) {
        const a = _ instanceof Error ? _.message : String(_);
        u({
            type: "error",
            jobId: r,
            message: a
        });
    }
    function q(r) {
        i && (r === "bla" ? i.use_bla() : r === "pade" ? i.use_pade() : i.use_perturbation());
    }
    function ut(r) {
        console.log("[REF worker] RESET (fresh navigator)", r.cx.slice(0, 14), "scale", r.scale.slice(0, 10)), i?.free(), i = new W(r.cx, r.cy, r.scale, r.angle), d = r.jobId, m = 0, E = r.maxIterations, F = !1, R = "", N = "", q(r.approximationMode), i.set_bla_epsilon(r.blaEpsilon), i.set_max_bla_skip(r.maxBlaSkip), h(r.jobId);
    }
    function vt(r, _, a) {
        const s = Math.max(0, a - _), b = new Float32Array(C.buffer, r + _ * 4 * Float32Array.BYTES_PER_ELEMENT, s * 4), l = new Float32Array(s * 2);
        for(let g = 0; g < s; g++)l[g * 2] = b[g * 4], l[g * 2 + 1] = b[g * 4 + 1];
        return l;
    }
    function H(r, _, a) {
        if (!i || r !== d || T || m >= _ || a < _ || i.get_approximation_mode() === 0) return;
        const n = i.compute_bla_reference_ptr(_), o = 12, s = new Float32Array(C.buffer, n.ptr, n.count * o), b = new Float32Array(s.length);
        b.set(s);
        const l = new Uint32Array(C.buffer, n.levels_ptr, n.level_count * 4), g = new Uint32Array(l.length);
        g.set(l), m = _, u({
            type: "blaReady",
            jobId: r,
            maxIterations: _,
            steps: b,
            levels: g,
            levelCount: n.level_count
        }, [
            b.buffer,
            g.buffer
        ]);
    }
    async function h(r) {
        if (!U) {
            U = !0;
            try {
                for(; !T && i && r === d;){
                    const _ = E, a = Math.max(0, i.get_reference_orbit_len());
                    if (a >= _ && !F) {
                        if (H(r, _, a), await Y(), E <= _) break;
                        continue;
                    }
                    const n = i.compute_reference_orbit_chunk(mt, _);
                    F = !1;
                    const o = vt(n.ptr, n.offset, n.count), [s, b] = i.get_reference_params();
                    n.offset === 0 && console.log("[REF worker] orbit (re)start ref=", s.slice(0, 14), "prevRef=", R.slice(0, 14) || "(none)"), R && (s !== R || b !== N) && (console.log("[REF worker] -> referenceReset (recenter) newRef=", s.slice(0, 14)), m = 0, u({
                        type: "referenceReset",
                        jobId: r,
                        maxIterations: _,
                        referenceCx: s,
                        referenceCy: b
                    })), R = s, N = b;
                    const l = Math.max(0, n.count - 1);
                    u({
                        type: "orbitChunk",
                        jobId: r,
                        offset: n.offset,
                        count: n.count,
                        maxIterations: _,
                        referenceCx: s,
                        referenceCy: b,
                        orbit: o
                    }, [
                        o.buffer
                    ]), H(r, _, l), await Y();
                }
            } catch (_) {
                $(r, _);
            } finally{
                if (U = !1, !T && i) {
                    const _ = Math.max(0, i.get_reference_orbit_len());
                    (r !== d || _ < E || F) && h(d);
                }
            }
        }
    }
    O.onmessage = (r)=>{
        const _ = r.data;
        try {
            switch(_.type){
                case "reset":
                    T || ut(_);
                    break;
                case "updateView":
                    i && _.jobId === d && (console.log("[REF worker] updateView (reuse navigator)", _.cx.slice(0, 14), "scale", _.scale.slice(0, 10)), i.origin(_.cx, _.cy), i.scale(_.scale), i.angle(_.angle), E = _.maxIterations, F = !0, h(_.jobId));
                    break;
                case "setApproximationMode":
                    _.jobId === d && (q(_.approximationMode), m = 0, h(_.jobId));
                    break;
                case "setBlaEpsilon":
                    i && _.jobId === d && (i.set_bla_epsilon(_.blaEpsilon), m = 0, h(_.jobId));
                    break;
                case "setMaxBlaSkip":
                    i && _.jobId === d && (i.set_max_bla_skip(_.maxBlaSkip), m = 0, h(_.jobId));
                    break;
                case "benchmarkPade":
                    if (i && _.jobId === d) {
                        const a = i.benchmark_pade(_.grid);
                        u({
                            type: "padeBenchmark",
                            jobId: _.jobId,
                            result: {
                                pixels: a.pixels,
                                maxIter: a.max_iter,
                                stepsExact: a.steps_exact,
                                stepsAffine: a.steps_affine,
                                stepsPade: a.steps_pade,
                                mismatches: a.pade_mismatches,
                                maxIterDelta: a.max_iter_delta
                            }
                        }), a.free();
                    }
                    break;
                case "findMinibrot":
                    if (i && _.jobId === d) {
                        const a = i.find_minibrot(_.maxIter, _.radiusFactor), n = a[0];
                        u({
                            type: "minibrotFound",
                            jobId: _.jobId,
                            status: n,
                            cx: n === "ok" ? a[1] : null,
                            cy: n === "ok" ? a[2] : null,
                            period: n === "ok" ? Number(a[3]) : n === "nonewton" ? Number(a[1]) : null
                        });
                    }
                    break;
                case "dispose":
                    T = !0, i?.free(), i = void 0, O.close();
                    break;
            }
        } catch (a) {
            $("jobId" in _ ? _.jobId : d, a);
        }
    };
    u({
        type: "ready"
    });
})();
