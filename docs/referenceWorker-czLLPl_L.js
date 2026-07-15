(async ()=>{
    var x_ = "" + new URL("mandelbrot_bg-DYyWA2Xc.wasm", import.meta.url).href, k_ = async (n = {}, _)=>{
        let r;
        if (_.startsWith("data:")) {
            const o = _.replace(/^data:.*?base64,/, "");
            let i;
            if (typeof Buffer == "function" && typeof Buffer.from == "function") i = Buffer.from(o, "base64");
            else if (typeof atob == "function") {
                const s = atob(o);
                i = new Uint8Array(s.length);
                for(let b = 0; b < s.length; b++)i[b] = s.charCodeAt(b);
            } else throw new Error("Cannot decode base64-encoded data URL");
            r = await WebAssembly.instantiate(i, n);
        } else {
            const o = await fetch(_), i = o.headers.get("Content-Type") || "";
            if ("instantiateStreaming" in WebAssembly && i.startsWith("application/wasm")) r = await WebAssembly.instantiateStreaming(o, n);
            else {
                const s = await o.arrayBuffer();
                r = await WebAssembly.instantiate(s, n);
            }
        }
        return r.instance.exports;
    };
    let e;
    function j_(n) {
        e = n;
    }
    let L = null;
    function V() {
        return (L === null || L.byteLength === 0) && (L = new Uint8Array(e.memory.buffer)), L;
    }
    let P = new TextDecoder("utf-8", {
        ignoreBOM: !0,
        fatal: !0
    });
    P.decode();
    const R_ = 2146435072;
    let X = 0;
    function S_(n, _) {
        return X += _, X >= R_ && (P = new TextDecoder("utf-8", {
            ignoreBOM: !0,
            fatal: !0
        }), P.decode(), X = _), P.decode(V().subarray(n, n + _));
    }
    function w_(n, _) {
        return n = n >>> 0, S_(n, _);
    }
    let j = null;
    function F_() {
        return (j === null || j.buffer.detached === !0 || j.buffer.detached === void 0 && j.buffer !== e.memory.buffer) && (j = new DataView(e.memory.buffer)), j;
    }
    function T(n, _) {
        n = n >>> 0;
        const r = F_(), o = [];
        for(let i = n; i < n + 4 * _; i += 4)o.push(e.__wbindgen_export_0.get(r.getUint32(i, !0)));
        return e.__externref_drop_slice(n, _), o;
    }
    let G = null;
    function z_() {
        return (G === null || G.byteLength === 0) && (G = new Float64Array(e.memory.buffer)), G;
    }
    function i_(n, _) {
        return n = n >>> 0, z_().subarray(n / 8, n / 8 + _);
    }
    let l = 0;
    const I = new TextEncoder;
    "encodeInto" in I || (I.encodeInto = function(n, _) {
        const r = I.encode(n);
        return _.set(r), {
            read: n.length,
            written: r.length
        };
    });
    function u(n, _, r) {
        if (r === void 0) {
            const g = I.encode(n), f = _(g.length, 1) >>> 0;
            return V().subarray(f, f + g.length).set(g), l = g.length, f;
        }
        let o = n.length, i = _(o, 1) >>> 0;
        const s = V();
        let b = 0;
        for(; b < o; b++){
            const g = n.charCodeAt(b);
            if (g > 127) break;
            s[i + b] = g;
        }
        if (b !== o) {
            b !== 0 && (n = n.slice(b)), i = r(i, o, o = b + n.length * 3, 1) >>> 0;
            const g = V().subarray(i + b, i + o), f = I.encodeInto(n, g);
            b += f.written, i = r(i, o, b, 1) >>> 0;
        }
        return l = b, i;
    }
    function v(n) {
        return n == null;
    }
    const b_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>e.__wbg_blabufferinfo_free(n >>> 0, 1));
    class D {
        static __wrap(_) {
            _ = _ >>> 0;
            const r = Object.create(D.prototype);
            return r.__wbg_ptr = _, b_.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, b_.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            e.__wbg_blabufferinfo_free(_, 0);
        }
        get ptr() {
            return e.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(_) {
            e.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, _);
        }
        get count() {
            return e.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set count(_) {
            e.__wbg_set_blabufferinfo_count(this.__wbg_ptr, _);
        }
        get levels_ptr() {
            return e.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(_) {
            e.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, _);
        }
        get level_count() {
            return e.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(_) {
            e.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, _);
        }
    }
    Symbol.dispose && (D.prototype[Symbol.dispose] = D.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((n)=>e.__wbg_blalevel_free(n >>> 0, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((n)=>e.__wbg_blastep_free(n >>> 0, 1));
    const s_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>e.__wbg_jetbufferinfo_free(n >>> 0, 1));
    class N {
        static __wrap(_) {
            _ = _ >>> 0;
            const r = Object.create(N.prototype);
            return r.__wbg_ptr = _, s_.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, s_.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            e.__wbg_jetbufferinfo_free(_, 0);
        }
        get coeffs_ptr() {
            return e.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set coeffs_ptr(_) {
            e.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, _);
        }
        get coeffs_count() {
            return e.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set coeffs_count(_) {
            e.__wbg_set_blabufferinfo_count(this.__wbg_ptr, _);
        }
        get radii_ptr() {
            return e.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set radii_ptr(_) {
            e.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, _);
        }
        get radii_count() {
            return e.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set radii_count(_) {
            e.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, _);
        }
        get levels_ptr() {
            return e.__wbg_get_jetbufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(_) {
            e.__wbg_set_blastep_ab_exp(this.__wbg_ptr, _);
        }
        get level_count() {
            return e.__wbg_get_jetbufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(_) {
            e.__wbg_set_jetbufferinfo_level_count(this.__wbg_ptr, _);
        }
    }
    Symbol.dispose && (N.prototype[Symbol.dispose] = N.prototype.free);
    const f_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>e.__wbg_mandelbrotnavigator_free(n >>> 0, 1));
    class Z {
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, f_.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            e.__wbg_mandelbrotnavigator_free(_, 0);
        }
        get_params() {
            const _ = e.mandelbrotnavigator_get_params(this.__wbg_ptr);
            var r = T(_[0], _[1]).slice();
            return e.__wbindgen_free(_[0], _[1] * 4, 4), r;
        }
        use_unified() {
            e.mandelbrotnavigator_use_unified(this.__wbg_ptr);
        }
        find_minibrot(_, r) {
            const o = e.mandelbrotnavigator_find_minibrot(this.__wbg_ptr, _, r);
            var i = T(o[0], o[1]).slice();
            return e.__wbindgen_free(o[0], o[1] * 4, 4), i;
        }
        rotate_direct(_) {
            e.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, _);
        }
        view_floatexp() {
            const _ = e.mandelbrotnavigator_view_floatexp(this.__wbg_ptr);
            var r = i_(_[0], _[1]).slice();
            return e.__wbindgen_free(_[0], _[1] * 8, 8), r;
        }
        benchmark_pade(_) {
            const r = e.mandelbrotnavigator_benchmark_pade(this.__wbg_ptr, _);
            return U.__wrap(r);
        }
        get_bla_epsilon() {
            return e.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr);
        }
        set_bla_epsilon(_) {
            e.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr, _);
        }
        unified_is_cold(_) {
            return e.mandelbrotnavigator_unified_is_cold(this.__wbg_ptr, _) !== 0;
        }
        get_max_bla_skip() {
            return e.mandelbrotnavigator_get_max_bla_skip(this.__wbg_ptr) >>> 0;
        }
        is_in_transition() {
            return e.mandelbrotnavigator_is_in_transition(this.__wbg_ptr) !== 0;
        }
        pixel_to_complex(_, r, o, i) {
            const s = e.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr, _, r, o, i);
            var b = T(s[0], s[1]).slice();
            return e.__wbindgen_free(s[0], s[1] * 4, 4), b;
        }
        reference_origin(_, r) {
            const o = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), i = l, s = u(r, e.__wbindgen_malloc, e.__wbindgen_realloc), b = l;
            e.mandelbrotnavigator_reference_origin(this.__wbg_ptr, o, i, s, b);
        }
        set_max_bla_skip(_) {
            e.mandelbrotnavigator_set_max_bla_skip(this.__wbg_ptr, _);
        }
        start_transition(_, r, o, i, s) {
            const b = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), g = l, f = u(r, e.__wbindgen_malloc, e.__wbindgen_realloc), w = l, c = u(o, e.__wbindgen_malloc, e.__wbindgen_realloc), h = l;
            e.mandelbrotnavigator_start_transition(this.__wbg_ptr, b, g, f, w, c, h, i, s);
        }
        translate_direct(_, r, o, i) {
            e.mandelbrotnavigator_translate_direct(this.__wbg_ptr, _, r, !v(o), v(o) ? 0 : o, !v(i), v(i) ? 0 : i);
        }
        use_mobius_cplus() {
            e.mandelbrotnavigator_use_mobius_cplus(this.__wbg_ptr);
        }
        use_perturbation() {
            e.mandelbrotnavigator_use_perturbation(this.__wbg_ptr);
        }
        cancel_transition() {
            e.mandelbrotnavigator_cancel_transition(this.__wbg_ptr);
        }
        get_gate_emission() {
            return e.mandelbrotnavigator_get_gate_emission(this.__wbg_ptr) !== 0;
        }
        set_gate_emission(_) {
            e.mandelbrotnavigator_set_gate_emission(this.__wbg_ptr, _);
        }
        current_log2_c_max() {
            return e.mandelbrotnavigator_current_log2_c_max(this.__wbg_ptr);
        }
        unified_last_sa_n0() {
            return e.mandelbrotnavigator_unified_last_sa_n0(this.__wbg_ptr) >>> 0;
        }
        coordinate_to_pixel(_, r, o, i) {
            const s = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), b = l, g = u(r, e.__wbindgen_malloc, e.__wbindgen_realloc), f = l, w = e.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr, s, b, g, f, o, i);
            var c = i_(w[0], w[1]).slice();
            return e.__wbindgen_free(w[0], w[1] * 8, 8), c;
        }
        set_viewport_aspect(_) {
            e.mandelbrotnavigator_set_viewport_aspect(this.__wbg_ptr, _);
        }
        unified_last_stages() {
            return e.mandelbrotnavigator_unified_last_stages(this.__wbg_ptr) >>> 0;
        }
        get_reference_params() {
            const _ = e.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);
            var r = T(_[0], _[1]).slice();
            return e.__wbindgen_free(_[0], _[1] * 4, 4), r;
        }
        set_precision_budget(_) {
            const r = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), o = l;
            e.mandelbrotnavigator_set_precision_budget(this.__wbg_ptr, r, o);
        }
        compute_jet_reference(_) {
            const r = e.mandelbrotnavigator_compute_jet_reference(this.__wbg_ptr, _);
            return N.__wrap(r);
        }
        compute_unified_header(_) {
            const r = e.mandelbrotnavigator_compute_unified_header(this.__wbg_ptr, _);
            return S.__wrap(r);
        }
        get_approximation_mode() {
            return e.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr);
        }
        unified_last_band_log2() {
            return e.mandelbrotnavigator_unified_last_band_log2(this.__wbg_ptr);
        }
        get_reference_orbit_len() {
            return e.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        unified_last_gate_count() {
            return e.mandelbrotnavigator_unified_last_gate_count(this.__wbg_ptr) >>> 0;
        }
        unified_last_periodic_p() {
            return e.mandelbrotnavigator_unified_last_periodic_p(this.__wbg_ptr) >>> 0;
        }
        compute_mobius_reference(_) {
            const r = e.mandelbrotnavigator_compute_mobius_reference(this.__wbg_ptr, _);
            return O.__wrap(r);
        }
        unified_last_band_spread() {
            return e.mandelbrotnavigator_unified_last_band_spread(this.__wbg_ptr);
        }
        compute_bla_reference_ptr(_) {
            const r = e.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr, _);
            return D.__wrap(r);
        }
        compute_unified_reference(_) {
            const r = e.mandelbrotnavigator_compute_unified_reference(this.__wbg_ptr, _);
            return S.__wrap(r);
        }
        compute_reference_orbit_ptr(_) {
            const r = e.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, _);
            return R.__wrap(r);
        }
        get_reference_orbit_capacity() {
            return e.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        unified_last_periodic_status() {
            return e.mandelbrotnavigator_unified_last_periodic_status(this.__wbg_ptr) >>> 0;
        }
        compute_reference_orbit_chunk(_, r) {
            const o = e.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, _, r);
            return R.__wrap(o);
        }
        unified_last_periodic_detected_p() {
            return e.mandelbrotnavigator_unified_last_periodic_detected_p(this.__wbg_ptr) >>> 0;
        }
        constructor(_, r, o, i){
            const s = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), b = l, g = u(r, e.__wbindgen_malloc, e.__wbindgen_realloc), f = l, w = u(o, e.__wbindgen_malloc, e.__wbindgen_realloc), c = l, h = e.mandelbrotnavigator_new(s, b, g, f, w, c, i);
            return this.__wbg_ptr = h >>> 0, f_.register(this, this.__wbg_ptr, this), this;
        }
        step(_, r) {
            const o = e.mandelbrotnavigator_step(this.__wbg_ptr, !v(_), v(_) ? 0 : _, !v(r), v(r) ? 0 : r);
            var i = T(o[0], o[1]).slice();
            return e.__wbindgen_free(o[0], o[1] * 4, 4), i;
        }
        zoom(_) {
            e.mandelbrotnavigator_zoom(this.__wbg_ptr, _);
        }
        angle(_) {
            e.mandelbrotnavigator_angle(this.__wbg_ptr, _);
        }
        scale(_) {
            const r = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), o = l;
            e.mandelbrotnavigator_scale(this.__wbg_ptr, r, o);
        }
        origin(_, r) {
            const o = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), i = l, s = u(r, e.__wbindgen_malloc, e.__wbindgen_realloc), b = l;
            e.mandelbrotnavigator_origin(this.__wbg_ptr, o, i, s, b);
        }
        rotate(_) {
            e.mandelbrotnavigator_rotate(this.__wbg_ptr, _);
        }
        use_bla() {
            e.mandelbrotnavigator_use_bla(this.__wbg_ptr);
        }
        use_jet() {
            e.mandelbrotnavigator_use_jet(this.__wbg_ptr);
        }
        use_pade() {
            e.mandelbrotnavigator_use_pade(this.__wbg_ptr);
        }
        translate(_, r) {
            e.mandelbrotnavigator_translate(this.__wbg_ptr, _, r);
        }
    }
    Symbol.dispose && (Z.prototype[Symbol.dispose] = Z.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((n)=>e.__wbg_mandelbrotstep_free(n >>> 0, 1));
    const g_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>e.__wbg_mobiusbufferinfo_free(n >>> 0, 1));
    class O {
        static __wrap(_) {
            _ = _ >>> 0;
            const r = Object.create(O.prototype);
            return r.__wbg_ptr = _, g_.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, g_.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            e.__wbg_mobiusbufferinfo_free(_, 0);
        }
        get coeffs_ptr() {
            return e.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set coeffs_ptr(_) {
            e.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, _);
        }
        get coeffs_count() {
            return e.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set coeffs_count(_) {
            e.__wbg_set_blabufferinfo_count(this.__wbg_ptr, _);
        }
        get radii_ptr() {
            return e.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set radii_ptr(_) {
            e.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, _);
        }
        get radii_count() {
            return e.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set radii_count(_) {
            e.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, _);
        }
        get levels_ptr() {
            return e.__wbg_get_jetbufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(_) {
            e.__wbg_set_blastep_ab_exp(this.__wbg_ptr, _);
        }
        get level_count() {
            return e.__wbg_get_jetbufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(_) {
            e.__wbg_set_jetbufferinfo_level_count(this.__wbg_ptr, _);
        }
    }
    Symbol.dispose && (O.prototype[Symbol.dispose] = O.prototype.free);
    const l_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>e.__wbg_orbitbufferinfo_free(n >>> 0, 1));
    class R {
        static __wrap(_) {
            _ = _ >>> 0;
            const r = Object.create(R.prototype);
            return r.__wbg_ptr = _, l_.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, l_.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            e.__wbg_orbitbufferinfo_free(_, 0);
        }
        get ptr() {
            return e.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(_) {
            e.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, _);
        }
        get offset() {
            return e.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set offset(_) {
            e.__wbg_set_blabufferinfo_count(this.__wbg_ptr, _);
        }
        get count() {
            return e.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set count(_) {
            e.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, _);
        }
    }
    Symbol.dispose && (R.prototype[Symbol.dispose] = R.prototype.free);
    const c_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>e.__wbg_padebenchmark_free(n >>> 0, 1));
    class U {
        static __wrap(_) {
            _ = _ >>> 0;
            const r = Object.create(U.prototype);
            return r.__wbg_ptr = _, c_.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, c_.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            e.__wbg_padebenchmark_free(_, 0);
        }
        get pixels() {
            return e.__wbg_get_padebenchmark_pixels(this.__wbg_ptr) >>> 0;
        }
        set pixels(_) {
            e.__wbg_set_padebenchmark_pixels(this.__wbg_ptr, _);
        }
        get max_iter() {
            return e.__wbg_get_padebenchmark_max_iter(this.__wbg_ptr) >>> 0;
        }
        set max_iter(_) {
            e.__wbg_set_padebenchmark_max_iter(this.__wbg_ptr, _);
        }
        get steps_exact() {
            return e.__wbg_get_padebenchmark_steps_exact(this.__wbg_ptr);
        }
        set steps_exact(_) {
            e.__wbg_set_padebenchmark_steps_exact(this.__wbg_ptr, _);
        }
        get steps_affine() {
            return e.__wbg_get_padebenchmark_steps_affine(this.__wbg_ptr);
        }
        set steps_affine(_) {
            e.__wbg_set_padebenchmark_steps_affine(this.__wbg_ptr, _);
        }
        get steps_pade() {
            return e.__wbg_get_padebenchmark_steps_pade(this.__wbg_ptr);
        }
        set steps_pade(_) {
            e.__wbg_set_padebenchmark_steps_pade(this.__wbg_ptr, _);
        }
        get pade_mismatches() {
            return e.__wbg_get_padebenchmark_pade_mismatches(this.__wbg_ptr) >>> 0;
        }
        set pade_mismatches(_) {
            e.__wbg_set_padebenchmark_pade_mismatches(this.__wbg_ptr, _);
        }
        get max_iter_delta() {
            return e.__wbg_get_padebenchmark_max_iter_delta(this.__wbg_ptr) >>> 0;
        }
        set max_iter_delta(_) {
            e.__wbg_set_blastep_d_exp(this.__wbg_ptr, _);
        }
    }
    Symbol.dispose && (U.prototype[Symbol.dispose] = U.prototype.free);
    const u_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>e.__wbg_unifiedbufferinfo_free(n >>> 0, 1));
    class S {
        static __wrap(_) {
            _ = _ >>> 0;
            const r = Object.create(S.prototype);
            return r.__wbg_ptr = _, u_.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, u_.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            e.__wbg_unifiedbufferinfo_free(_, 0);
        }
        get coeffs_ptr() {
            return e.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set coeffs_ptr(_) {
            e.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, _);
        }
        get coeffs_count() {
            return e.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set coeffs_count(_) {
            e.__wbg_set_blabufferinfo_count(this.__wbg_ptr, _);
        }
        get radii_ptr() {
            return e.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set radii_ptr(_) {
            e.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, _);
        }
        get radii_count() {
            return e.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set radii_count(_) {
            e.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, _);
        }
        get levels_ptr() {
            return e.__wbg_get_jetbufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(_) {
            e.__wbg_set_blastep_ab_exp(this.__wbg_ptr, _);
        }
        get level_count() {
            return e.__wbg_get_jetbufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(_) {
            e.__wbg_set_jetbufferinfo_level_count(this.__wbg_ptr, _);
        }
    }
    Symbol.dispose && (S.prototype[Symbol.dispose] = S.prototype.free);
    function E_(n) {
        return Math.exp(n);
    }
    function A_(n) {
        return Math.log(n);
    }
    function T_() {
        return Date.now();
    }
    function M_(n, _) {
        throw new Error(w_(n, _));
    }
    function I_(n, _) {
        return w_(n, _);
    }
    function C_() {
        const n = e.__wbindgen_export_0, _ = n.grow(4);
        n.set(0, void 0), n.set(_ + 0, void 0), n.set(_ + 1, null), n.set(_ + 2, !0), n.set(_ + 3, !1);
    }
    URL = globalThis.URL;
    const t = await k_({
        "./mandelbrot_bg.js": {
            __wbg_now_1e80617bcee43265: T_,
            __wbg_exp_9293ded1248e1bd3: E_,
            __wbg_log_5f75e13a39ba07fe: A_,
            __wbg_wbindgenthrow_451ec1a8469d7eb6: M_,
            __wbindgen_init_externref_table: C_,
            __wbindgen_cast_2241b6af4c4b2941: I_
        }
    }, x_), y = t.memory, B_ = t.__wbg_blabufferinfo_free, D_ = t.__wbg_blalevel_free, N_ = t.__wbg_blastep_free, O_ = t.__wbg_get_blabufferinfo_count, U_ = t.__wbg_get_blabufferinfo_level_count, W_ = t.__wbg_get_blabufferinfo_levels_ptr, L_ = t.__wbg_get_blabufferinfo_ptr, G_ = t.__wbg_get_blastep_ab_exp, V_ = t.__wbg_get_blastep_alpha_exp, P_ = t.__wbg_get_blastep_ax, $_ = t.__wbg_get_blastep_ay, J_ = t.__wbg_get_blastep_bx, Y_ = t.__wbg_get_blastep_by, H_ = t.__wbg_get_blastep_d_exp, X_ = t.__wbg_get_blastep_dx, K_ = t.__wbg_get_blastep_dy, Z_ = t.__wbg_get_blastep_log2_min_a, q_ = t.__wbg_get_blastep_radius_alpha, Q_ = t.__wbg_get_blastep_radius_beta, _e = t.__wbg_get_jetbufferinfo_level_count, ee = t.__wbg_get_jetbufferinfo_levels_ptr, te = t.__wbg_get_padebenchmark_max_iter, re = t.__wbg_get_padebenchmark_max_iter_delta, ne = t.__wbg_get_padebenchmark_pade_mismatches, oe = t.__wbg_get_padebenchmark_pixels, ae = t.__wbg_get_padebenchmark_steps_affine, ie = t.__wbg_get_padebenchmark_steps_exact, be = t.__wbg_get_padebenchmark_steps_pade, se = t.__wbg_jetbufferinfo_free, fe = t.__wbg_mandelbrotnavigator_free, ge = t.__wbg_mandelbrotstep_free, le = t.__wbg_mobiusbufferinfo_free, ce = t.__wbg_orbitbufferinfo_free, ue = t.__wbg_padebenchmark_free, pe = t.__wbg_set_blabufferinfo_count, de = t.__wbg_set_blabufferinfo_level_count, we = t.__wbg_set_blabufferinfo_levels_ptr, me = t.__wbg_set_blabufferinfo_ptr, ve = t.__wbg_set_blastep_ab_exp, he = t.__wbg_set_blastep_alpha_exp, ye = t.__wbg_set_blastep_ax, xe = t.__wbg_set_blastep_ay, ke = t.__wbg_set_blastep_bx, je = t.__wbg_set_blastep_by, Re = t.__wbg_set_blastep_d_exp, Se = t.__wbg_set_blastep_dx, Fe = t.__wbg_set_blastep_dy, ze = t.__wbg_set_blastep_log2_min_a, Ee = t.__wbg_set_blastep_radius_alpha, Ae = t.__wbg_set_blastep_radius_beta, Te = t.__wbg_set_jetbufferinfo_level_count, Me = t.__wbg_set_padebenchmark_max_iter, Ie = t.__wbg_set_padebenchmark_pade_mismatches, Ce = t.__wbg_set_padebenchmark_pixels, Be = t.__wbg_set_padebenchmark_steps_affine, De = t.__wbg_set_padebenchmark_steps_exact, Ne = t.__wbg_set_padebenchmark_steps_pade, Oe = t.__wbg_unifiedbufferinfo_free, Ue = t.mandelbrotnavigator_angle, We = t.mandelbrotnavigator_benchmark_pade, Le = t.mandelbrotnavigator_cancel_transition, Ge = t.mandelbrotnavigator_compute_bla_reference_ptr, Ve = t.mandelbrotnavigator_compute_jet_reference, Pe = t.mandelbrotnavigator_compute_mobius_reference, $e = t.mandelbrotnavigator_compute_reference_orbit_chunk, Je = t.mandelbrotnavigator_compute_reference_orbit_ptr, Ye = t.mandelbrotnavigator_compute_unified_header, He = t.mandelbrotnavigator_compute_unified_reference, Xe = t.mandelbrotnavigator_coordinate_to_pixel, Ke = t.mandelbrotnavigator_current_log2_c_max, Ze = t.mandelbrotnavigator_find_minibrot, qe = t.mandelbrotnavigator_get_approximation_mode, Qe = t.mandelbrotnavigator_get_bla_epsilon, _t = t.mandelbrotnavigator_get_gate_emission, et = t.mandelbrotnavigator_get_max_bla_skip, tt = t.mandelbrotnavigator_get_params, rt = t.mandelbrotnavigator_get_reference_orbit_capacity, nt = t.mandelbrotnavigator_get_reference_orbit_len, ot = t.mandelbrotnavigator_get_reference_params, at = t.mandelbrotnavigator_is_in_transition, it = t.mandelbrotnavigator_new, bt = t.mandelbrotnavigator_origin, st = t.mandelbrotnavigator_pixel_to_complex, ft = t.mandelbrotnavigator_reference_origin, gt = t.mandelbrotnavigator_rotate, lt = t.mandelbrotnavigator_rotate_direct, ct = t.mandelbrotnavigator_scale, ut = t.mandelbrotnavigator_set_bla_epsilon, pt = t.mandelbrotnavigator_set_gate_emission, dt = t.mandelbrotnavigator_set_max_bla_skip, wt = t.mandelbrotnavigator_set_precision_budget, mt = t.mandelbrotnavigator_set_viewport_aspect, vt = t.mandelbrotnavigator_start_transition, ht = t.mandelbrotnavigator_step, yt = t.mandelbrotnavigator_translate, xt = t.mandelbrotnavigator_translate_direct, kt = t.mandelbrotnavigator_unified_is_cold, jt = t.mandelbrotnavigator_unified_last_band_log2, Rt = t.mandelbrotnavigator_unified_last_band_spread, St = t.mandelbrotnavigator_unified_last_gate_count, Ft = t.mandelbrotnavigator_unified_last_periodic_detected_p, zt = t.mandelbrotnavigator_unified_last_periodic_p, Et = t.mandelbrotnavigator_unified_last_periodic_status, At = t.mandelbrotnavigator_unified_last_sa_n0, Tt = t.mandelbrotnavigator_unified_last_stages, Mt = t.mandelbrotnavigator_use_bla, It = t.mandelbrotnavigator_use_jet, Ct = t.mandelbrotnavigator_use_mobius_cplus, Bt = t.mandelbrotnavigator_use_pade, Dt = t.mandelbrotnavigator_use_perturbation, Nt = t.mandelbrotnavigator_use_unified, Ot = t.mandelbrotnavigator_view_floatexp, Ut = t.mandelbrotnavigator_zoom, Wt = t.__wbg_set_blalevel_count, Lt = t.__wbg_set_blalevel_max_radius_bits, Gt = t.__wbg_set_blalevel_offset, Vt = t.__wbg_set_blalevel_skip, Pt = t.__wbg_set_jetbufferinfo_coeffs_count, $t = t.__wbg_set_jetbufferinfo_coeffs_ptr, Jt = t.__wbg_set_jetbufferinfo_levels_ptr, Yt = t.__wbg_set_jetbufferinfo_radii_count, Ht = t.__wbg_set_jetbufferinfo_radii_ptr, Xt = t.__wbg_set_mandelbrotstep_pad0, Kt = t.__wbg_set_mandelbrotstep_pad1, Zt = t.__wbg_set_mandelbrotstep_zx, qt = t.__wbg_set_mandelbrotstep_zy, Qt = t.__wbg_set_mobiusbufferinfo_coeffs_count, _r = t.__wbg_set_mobiusbufferinfo_coeffs_ptr, er = t.__wbg_set_mobiusbufferinfo_level_count, tr = t.__wbg_set_mobiusbufferinfo_levels_ptr, rr = t.__wbg_set_mobiusbufferinfo_radii_count, nr = t.__wbg_set_mobiusbufferinfo_radii_ptr, or = t.__wbg_set_orbitbufferinfo_count, ar = t.__wbg_set_orbitbufferinfo_offset, ir = t.__wbg_set_orbitbufferinfo_ptr, br = t.__wbg_set_padebenchmark_max_iter_delta, sr = t.__wbg_set_unifiedbufferinfo_coeffs_count, fr = t.__wbg_set_unifiedbufferinfo_coeffs_ptr, gr = t.__wbg_set_unifiedbufferinfo_level_count, lr = t.__wbg_set_unifiedbufferinfo_levels_ptr, cr = t.__wbg_set_unifiedbufferinfo_radii_count, ur = t.__wbg_set_unifiedbufferinfo_radii_ptr, pr = t.__wbg_get_blalevel_count, dr = t.__wbg_get_blalevel_max_radius_bits, wr = t.__wbg_get_blalevel_offset, mr = t.__wbg_get_blalevel_skip, vr = t.__wbg_get_jetbufferinfo_coeffs_count, hr = t.__wbg_get_jetbufferinfo_coeffs_ptr, yr = t.__wbg_get_jetbufferinfo_radii_count, xr = t.__wbg_get_jetbufferinfo_radii_ptr, kr = t.__wbg_get_mobiusbufferinfo_coeffs_count, jr = t.__wbg_get_mobiusbufferinfo_coeffs_ptr, Rr = t.__wbg_get_mobiusbufferinfo_level_count, Sr = t.__wbg_get_mobiusbufferinfo_levels_ptr, Fr = t.__wbg_get_mobiusbufferinfo_radii_count, zr = t.__wbg_get_mobiusbufferinfo_radii_ptr, Er = t.__wbg_get_orbitbufferinfo_count, Ar = t.__wbg_get_orbitbufferinfo_offset, Tr = t.__wbg_get_orbitbufferinfo_ptr, Mr = t.__wbg_get_unifiedbufferinfo_coeffs_count, Ir = t.__wbg_get_unifiedbufferinfo_coeffs_ptr, Cr = t.__wbg_get_unifiedbufferinfo_level_count, Br = t.__wbg_get_unifiedbufferinfo_levels_ptr, Dr = t.__wbg_get_unifiedbufferinfo_radii_count, Nr = t.__wbg_get_unifiedbufferinfo_radii_ptr, Or = t.__wbg_get_mandelbrotstep_pad0, Ur = t.__wbg_get_mandelbrotstep_pad1, Wr = t.__wbg_get_mandelbrotstep_zx, Lr = t.__wbg_get_mandelbrotstep_zy, Gr = t.__wbindgen_export_0, Vr = t.__externref_drop_slice, Pr = t.__wbindgen_free, $r = t.__wbindgen_malloc, Jr = t.__wbindgen_realloc, m_ = t.__wbindgen_start;
    var Yr = Object.freeze({
        __proto__: null,
        __externref_drop_slice: Vr,
        __wbg_blabufferinfo_free: B_,
        __wbg_blalevel_free: D_,
        __wbg_blastep_free: N_,
        __wbg_get_blabufferinfo_count: O_,
        __wbg_get_blabufferinfo_level_count: U_,
        __wbg_get_blabufferinfo_levels_ptr: W_,
        __wbg_get_blabufferinfo_ptr: L_,
        __wbg_get_blalevel_count: pr,
        __wbg_get_blalevel_max_radius_bits: dr,
        __wbg_get_blalevel_offset: wr,
        __wbg_get_blalevel_skip: mr,
        __wbg_get_blastep_ab_exp: G_,
        __wbg_get_blastep_alpha_exp: V_,
        __wbg_get_blastep_ax: P_,
        __wbg_get_blastep_ay: $_,
        __wbg_get_blastep_bx: J_,
        __wbg_get_blastep_by: Y_,
        __wbg_get_blastep_d_exp: H_,
        __wbg_get_blastep_dx: X_,
        __wbg_get_blastep_dy: K_,
        __wbg_get_blastep_log2_min_a: Z_,
        __wbg_get_blastep_radius_alpha: q_,
        __wbg_get_blastep_radius_beta: Q_,
        __wbg_get_jetbufferinfo_coeffs_count: vr,
        __wbg_get_jetbufferinfo_coeffs_ptr: hr,
        __wbg_get_jetbufferinfo_level_count: _e,
        __wbg_get_jetbufferinfo_levels_ptr: ee,
        __wbg_get_jetbufferinfo_radii_count: yr,
        __wbg_get_jetbufferinfo_radii_ptr: xr,
        __wbg_get_mandelbrotstep_pad0: Or,
        __wbg_get_mandelbrotstep_pad1: Ur,
        __wbg_get_mandelbrotstep_zx: Wr,
        __wbg_get_mandelbrotstep_zy: Lr,
        __wbg_get_mobiusbufferinfo_coeffs_count: kr,
        __wbg_get_mobiusbufferinfo_coeffs_ptr: jr,
        __wbg_get_mobiusbufferinfo_level_count: Rr,
        __wbg_get_mobiusbufferinfo_levels_ptr: Sr,
        __wbg_get_mobiusbufferinfo_radii_count: Fr,
        __wbg_get_mobiusbufferinfo_radii_ptr: zr,
        __wbg_get_orbitbufferinfo_count: Er,
        __wbg_get_orbitbufferinfo_offset: Ar,
        __wbg_get_orbitbufferinfo_ptr: Tr,
        __wbg_get_padebenchmark_max_iter: te,
        __wbg_get_padebenchmark_max_iter_delta: re,
        __wbg_get_padebenchmark_pade_mismatches: ne,
        __wbg_get_padebenchmark_pixels: oe,
        __wbg_get_padebenchmark_steps_affine: ae,
        __wbg_get_padebenchmark_steps_exact: ie,
        __wbg_get_padebenchmark_steps_pade: be,
        __wbg_get_unifiedbufferinfo_coeffs_count: Mr,
        __wbg_get_unifiedbufferinfo_coeffs_ptr: Ir,
        __wbg_get_unifiedbufferinfo_level_count: Cr,
        __wbg_get_unifiedbufferinfo_levels_ptr: Br,
        __wbg_get_unifiedbufferinfo_radii_count: Dr,
        __wbg_get_unifiedbufferinfo_radii_ptr: Nr,
        __wbg_jetbufferinfo_free: se,
        __wbg_mandelbrotnavigator_free: fe,
        __wbg_mandelbrotstep_free: ge,
        __wbg_mobiusbufferinfo_free: le,
        __wbg_orbitbufferinfo_free: ce,
        __wbg_padebenchmark_free: ue,
        __wbg_set_blabufferinfo_count: pe,
        __wbg_set_blabufferinfo_level_count: de,
        __wbg_set_blabufferinfo_levels_ptr: we,
        __wbg_set_blabufferinfo_ptr: me,
        __wbg_set_blalevel_count: Wt,
        __wbg_set_blalevel_max_radius_bits: Lt,
        __wbg_set_blalevel_offset: Gt,
        __wbg_set_blalevel_skip: Vt,
        __wbg_set_blastep_ab_exp: ve,
        __wbg_set_blastep_alpha_exp: he,
        __wbg_set_blastep_ax: ye,
        __wbg_set_blastep_ay: xe,
        __wbg_set_blastep_bx: ke,
        __wbg_set_blastep_by: je,
        __wbg_set_blastep_d_exp: Re,
        __wbg_set_blastep_dx: Se,
        __wbg_set_blastep_dy: Fe,
        __wbg_set_blastep_log2_min_a: ze,
        __wbg_set_blastep_radius_alpha: Ee,
        __wbg_set_blastep_radius_beta: Ae,
        __wbg_set_jetbufferinfo_coeffs_count: Pt,
        __wbg_set_jetbufferinfo_coeffs_ptr: $t,
        __wbg_set_jetbufferinfo_level_count: Te,
        __wbg_set_jetbufferinfo_levels_ptr: Jt,
        __wbg_set_jetbufferinfo_radii_count: Yt,
        __wbg_set_jetbufferinfo_radii_ptr: Ht,
        __wbg_set_mandelbrotstep_pad0: Xt,
        __wbg_set_mandelbrotstep_pad1: Kt,
        __wbg_set_mandelbrotstep_zx: Zt,
        __wbg_set_mandelbrotstep_zy: qt,
        __wbg_set_mobiusbufferinfo_coeffs_count: Qt,
        __wbg_set_mobiusbufferinfo_coeffs_ptr: _r,
        __wbg_set_mobiusbufferinfo_level_count: er,
        __wbg_set_mobiusbufferinfo_levels_ptr: tr,
        __wbg_set_mobiusbufferinfo_radii_count: rr,
        __wbg_set_mobiusbufferinfo_radii_ptr: nr,
        __wbg_set_orbitbufferinfo_count: or,
        __wbg_set_orbitbufferinfo_offset: ar,
        __wbg_set_orbitbufferinfo_ptr: ir,
        __wbg_set_padebenchmark_max_iter: Me,
        __wbg_set_padebenchmark_max_iter_delta: br,
        __wbg_set_padebenchmark_pade_mismatches: Ie,
        __wbg_set_padebenchmark_pixels: Ce,
        __wbg_set_padebenchmark_steps_affine: Be,
        __wbg_set_padebenchmark_steps_exact: De,
        __wbg_set_padebenchmark_steps_pade: Ne,
        __wbg_set_unifiedbufferinfo_coeffs_count: sr,
        __wbg_set_unifiedbufferinfo_coeffs_ptr: fr,
        __wbg_set_unifiedbufferinfo_level_count: gr,
        __wbg_set_unifiedbufferinfo_levels_ptr: lr,
        __wbg_set_unifiedbufferinfo_radii_count: cr,
        __wbg_set_unifiedbufferinfo_radii_ptr: ur,
        __wbg_unifiedbufferinfo_free: Oe,
        __wbindgen_export_0: Gr,
        __wbindgen_free: Pr,
        __wbindgen_malloc: $r,
        __wbindgen_realloc: Jr,
        __wbindgen_start: m_,
        mandelbrotnavigator_angle: Ue,
        mandelbrotnavigator_benchmark_pade: We,
        mandelbrotnavigator_cancel_transition: Le,
        mandelbrotnavigator_compute_bla_reference_ptr: Ge,
        mandelbrotnavigator_compute_jet_reference: Ve,
        mandelbrotnavigator_compute_mobius_reference: Pe,
        mandelbrotnavigator_compute_reference_orbit_chunk: $e,
        mandelbrotnavigator_compute_reference_orbit_ptr: Je,
        mandelbrotnavigator_compute_unified_header: Ye,
        mandelbrotnavigator_compute_unified_reference: He,
        mandelbrotnavigator_coordinate_to_pixel: Xe,
        mandelbrotnavigator_current_log2_c_max: Ke,
        mandelbrotnavigator_find_minibrot: Ze,
        mandelbrotnavigator_get_approximation_mode: qe,
        mandelbrotnavigator_get_bla_epsilon: Qe,
        mandelbrotnavigator_get_gate_emission: _t,
        mandelbrotnavigator_get_max_bla_skip: et,
        mandelbrotnavigator_get_params: tt,
        mandelbrotnavigator_get_reference_orbit_capacity: rt,
        mandelbrotnavigator_get_reference_orbit_len: nt,
        mandelbrotnavigator_get_reference_params: ot,
        mandelbrotnavigator_is_in_transition: at,
        mandelbrotnavigator_new: it,
        mandelbrotnavigator_origin: bt,
        mandelbrotnavigator_pixel_to_complex: st,
        mandelbrotnavigator_reference_origin: ft,
        mandelbrotnavigator_rotate: gt,
        mandelbrotnavigator_rotate_direct: lt,
        mandelbrotnavigator_scale: ct,
        mandelbrotnavigator_set_bla_epsilon: ut,
        mandelbrotnavigator_set_gate_emission: pt,
        mandelbrotnavigator_set_max_bla_skip: dt,
        mandelbrotnavigator_set_precision_budget: wt,
        mandelbrotnavigator_set_viewport_aspect: mt,
        mandelbrotnavigator_start_transition: vt,
        mandelbrotnavigator_step: ht,
        mandelbrotnavigator_translate: yt,
        mandelbrotnavigator_translate_direct: xt,
        mandelbrotnavigator_unified_is_cold: kt,
        mandelbrotnavigator_unified_last_band_log2: jt,
        mandelbrotnavigator_unified_last_band_spread: Rt,
        mandelbrotnavigator_unified_last_gate_count: St,
        mandelbrotnavigator_unified_last_periodic_detected_p: Ft,
        mandelbrotnavigator_unified_last_periodic_p: zt,
        mandelbrotnavigator_unified_last_periodic_status: Et,
        mandelbrotnavigator_unified_last_sa_n0: At,
        mandelbrotnavigator_unified_last_stages: Tt,
        mandelbrotnavigator_use_bla: Mt,
        mandelbrotnavigator_use_jet: It,
        mandelbrotnavigator_use_mobius_cplus: Ct,
        mandelbrotnavigator_use_pade: Bt,
        mandelbrotnavigator_use_perturbation: Dt,
        mandelbrotnavigator_use_unified: Nt,
        mandelbrotnavigator_view_floatexp: Ot,
        mandelbrotnavigator_zoom: Ut,
        memory: y
    });
    j_(Yr);
    m_();
    const q = self;
    let a, d = 0, W = !1, p = 0, m = 0, C = 0, K = !1, B = !1, Hr = 0, $ = 0, M = Number.NaN, Q = -1, __ = -1;
    const Xr = 1e3, Kr = 2, Zr = 1e7;
    function k(n, _) {
        q.postMessage(n, _ ?? []);
    }
    function p_() {
        return new Promise((n)=>setTimeout(n, 0));
    }
    function v_(n, _) {
        const r = _ instanceof Error ? _.message : String(_);
        k({
            type: "error",
            jobId: n,
            message: r
        });
    }
    function h_(n) {
        a && (n === "bla" ? a.use_bla() : n === "pade" ? a.use_pade() : n === "jet" ? a.use_jet() : n === "mobius" ? a.use_mobius_cplus() : n === "auto" ? a.use_unified() : a.use_perturbation());
    }
    function qr(n) {
        console.log("[REF worker] RESET (fresh navigator)", n.cx.slice(0, 14), "scale", n.scale.slice(0, 10)), a?.free(), a = new Z(n.cx, n.cy, n.scale, n.angle), a.set_precision_budget(n.precisionBudget), d = n.jobId, p = 0, m = n.tableGeneration ?? 0, C = n.maxIterations, B = !1, h_(n.approximationMode), a.set_bla_epsilon(n.blaEpsilon), a.set_gate_emission(!!n.gateEmission), a.set_max_bla_skip(n.maxBlaSkip), a.set_viewport_aspect(n.viewportAspect ?? Number.NaN), M = a.current_log2_c_max(), Q = -1, __ = -1, x(n.jobId);
    }
    function Qr(n, _, r) {
        const s = Math.max(0, r - _), b = new Float32Array(y.buffer, n + _ * 4 * Float32Array.BYTES_PER_ELEMENT, s * 4), g = new Float32Array(s * 2);
        for(let f = 0; f < s; f++)g[f * 2] = b[f * 4], g[f * 2 + 1] = b[f * 4 + 1];
        return g;
    }
    function d_(n, _, r) {
        if (!a || n !== d || W) return;
        const o = a.get_approximation_mode(), i = (o === 3 || o === 4 || o === 5) && p > 0 && _ <= Math.ceil(p * 1.5);
        if (p >= _ || i || r < _ || o === 0) return;
        const s = $, b = o === 3, g = o === 4, f = o === 5;
        if (!b && !g && !f) {
            const A = a.compute_bla_reference_ptr(_), o_ = new Float32Array(y.buffer, A.ptr, A.count * 12), Y = new Float32Array(o_.length);
            Y.set(o_);
            const a_ = new Uint32Array(y.buffer, A.levels_ptr, A.level_count * 4), H = new Uint32Array(a_.length);
            H.set(a_), p = _, k({
                type: "blaReady",
                jobId: n,
                refId: s,
                maxIterations: _,
                kind: "bla",
                steps: Y,
                levels: H,
                levelCount: A.level_count,
                tableGeneration: m
            }, [
                Y.buffer,
                H.buffer
            ]);
            return;
        }
        const w = performance.now(), c = g ? a.compute_mobius_reference(_) : f ? a.compute_unified_reference(_) : a.compute_jet_reference(_), h = performance.now() - w, F = f ? a.unified_last_stages() : void 0, e_ = f ? {
            saN0: a.unified_last_sa_n0(),
            periodicP: a.unified_last_periodic_p(),
            periodicStatus: a.unified_last_periodic_status(),
            periodicDetectedP: a.unified_last_periodic_detected_p(),
            bandLog2: a.unified_last_band_log2(),
            bandSpread: a.unified_last_band_spread(),
            gateCount: a.unified_last_gate_count()
        } : void 0;
        console.log(`[REF worker] ${g ? "mobius" : f ? "unified" : "jet"} table built in ${h.toFixed(0)}ms (maxIter ${_}${F !== void 0 ? `, stages ${F}` : ""})`);
        const t_ = new Float32Array(y.buffer, c.radii_ptr, c.radii_count * 4), z = new Float32Array(t_.length);
        z.set(t_);
        const r_ = new Uint32Array(y.buffer, c.levels_ptr, c.level_count * 4), E = new Uint32Array(r_.length);
        if (E.set(r_), p = _, f && F === 4 && Q === s && __ === m) {
            k({
                type: "radiiReady",
                jobId: n,
                refId: s,
                maxIterations: _,
                radii: z,
                levels: E,
                levelCount: c.level_count,
                buildMs: h,
                buildStages: F,
                tableStats: e_,
                tableGeneration: m
            }, [
                z.buffer,
                E.buffer
            ]);
            return;
        }
        const y_ = g ? 21 : 27, n_ = new Float32Array(y.buffer, c.coeffs_ptr, c.coeffs_count * y_), J = new Float32Array(n_.length);
        J.set(n_), f && (Q = s, __ = m), k({
            type: "blaReady",
            jobId: n,
            refId: s,
            maxIterations: _,
            kind: g ? "mobius" : f ? "unified" : "jet",
            steps: J,
            radii: z,
            levels: E,
            levelCount: c.level_count,
            buildMs: h,
            buildStages: F,
            tableStats: e_,
            tableGeneration: m
        }, [
            J.buffer,
            z.buffer,
            E.buffer
        ]);
    }
    async function x(n) {
        if (!K) {
            K = !0;
            try {
                for(; !W && a && n === d;){
                    const _ = C, r = Math.min(_ * Kr, Zr), o = Math.max(0, a.get_reference_orbit_len());
                    if (o >= r && !B) {
                        if (d_(n, _, o), await p_(), C <= _) break;
                        continue;
                    }
                    const i = a.compute_reference_orbit_chunk(Xr, r);
                    B = !1;
                    const s = Qr(i.ptr, i.offset, i.count), [b, g] = a.get_reference_params();
                    i.offset === 0 && ($ = ++Hr, p = 0, console.log("[REF worker] orbit (re)start refId=", $, "ref=", b.slice(0, 14)));
                    const f = Math.max(0, i.count - 1);
                    k({
                        type: "orbitChunk",
                        jobId: n,
                        refId: $,
                        offset: i.offset,
                        count: i.count,
                        maxIterations: _,
                        referenceCx: b,
                        referenceCy: g,
                        orbit: s
                    }, [
                        s.buffer
                    ]), d_(n, _, f), await p_();
                }
            } catch (_) {
                v_(n, _);
            } finally{
                if (K = !1, !W && a) {
                    const _ = Math.max(0, a.get_reference_orbit_len()), r = p === 0 && a.get_approximation_mode() !== 0;
                    (n !== d || _ < C || B || r) && x(d);
                }
            }
        }
    }
    q.onmessage = (n)=>{
        const _ = n.data;
        try {
            switch(_.type){
                case "reset":
                    W || qr(_);
                    break;
                case "updateView":
                    if (a && _.jobId === d) {
                        console.log("[REF worker] updateView (reuse navigator)", _.cx.slice(0, 14), "scale", _.scale.slice(0, 10)), a.origin(_.cx, _.cy), a.scale(_.scale), a.angle(_.angle), _.viewportAspect !== void 0 && a.set_viewport_aspect(_.viewportAspect), C = _.maxIterations, B = !0;
                        const r = a.get_approximation_mode();
                        if (r === 3 || r === 4 || r === 5) {
                            const o = a.current_log2_c_max();
                            (!Number.isFinite(M) || o > M || o < M - 2) && (M = o, p = 0);
                        }
                        x(_.jobId);
                    }
                    break;
                case "setApproximationMode":
                    _.jobId === d && (h_(_.approximationMode), p = 0, m = _.tableGeneration, x(_.jobId));
                    break;
                case "setBlaEpsilon":
                    a && _.jobId === d && (a.set_bla_epsilon(_.blaEpsilon), p = 0, m = _.tableGeneration, x(_.jobId));
                    break;
                case "setGateEmission":
                    a && _.jobId === d && (a.set_gate_emission(_.on), p = 0, m = _.tableGeneration, x(_.jobId));
                    break;
                case "setMaxBlaSkip":
                    a && _.jobId === d && (a.set_max_bla_skip(_.maxBlaSkip), p = 0, m = _.tableGeneration, x(_.jobId));
                    break;
                case "findMinibrot":
                    if (a && _.jobId === d) {
                        const r = a.find_minibrot(_.maxIter, _.radiusFactor), o = r[0];
                        k({
                            type: "minibrotFound",
                            jobId: _.jobId,
                            status: o,
                            cx: o === "ok" ? r[1] : null,
                            cy: o === "ok" ? r[2] : null,
                            period: o === "ok" ? Number(r[3]) : o === "nonewton" ? Number(r[1]) : null
                        });
                    }
                    break;
                case "dispose":
                    W = !0, a?.free(), a = void 0, q.close();
                    break;
            }
        } catch (r) {
            v_("jobId" in _ ? _.jobId : d, r);
        }
    };
    k({
        type: "ready"
    });
})();
