(async ()=>{
    var v_ = "" + new URL("mandelbrot_bg-CqZZDBft.wasm", import.meta.url).href, h_ = async (r = {}, _)=>{
        let n;
        if (_.startsWith("data:")) {
            const o = _.replace(/^data:.*?base64,/, "");
            let a;
            if (typeof Buffer == "function" && typeof Buffer.from == "function") a = Buffer.from(o, "base64");
            else if (typeof atob == "function") {
                const s = atob(o);
                a = new Uint8Array(s.length);
                for(let i = 0; i < s.length; i++)a[i] = s.charCodeAt(i);
            } else throw new Error("Cannot decode base64-encoded data URL");
            n = await WebAssembly.instantiate(a, r);
        } else {
            const o = await fetch(_), a = o.headers.get("Content-Type") || "";
            if ("instantiateStreaming" in WebAssembly && a.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(o, r);
            else {
                const s = await o.arrayBuffer();
                n = await WebAssembly.instantiate(s, r);
            }
        }
        return n.instance.exports;
    };
    let e;
    function y_(r) {
        e = r;
    }
    let U = null;
    function L() {
        return (U === null || U.byteLength === 0) && (U = new Uint8Array(e.memory.buffer)), U;
    }
    let W = new TextDecoder("utf-8", {
        ignoreBOM: !0,
        fatal: !0
    });
    W.decode();
    const x_ = 2146435072;
    let q = 0;
    function k_(r, _) {
        return q += _, q >= x_ && (W = new TextDecoder("utf-8", {
            ignoreBOM: !0,
            fatal: !0
        }), W.decode(), q = _), W.decode(L().subarray(r, r + _));
    }
    function p_(r, _) {
        return r = r >>> 0, k_(r, _);
    }
    let x = null;
    function j_() {
        return (x === null || x.buffer.detached === !0 || x.buffer.detached === void 0 && x.buffer !== e.memory.buffer) && (x = new DataView(e.memory.buffer)), x;
    }
    function z(r, _) {
        r = r >>> 0;
        const n = j_(), o = [];
        for(let a = r; a < r + 4 * _; a += 4)o.push(e.__wbindgen_export_0.get(n.getUint32(a, !0)));
        return e.__externref_drop_slice(r, _), o;
    }
    let N = null;
    function F_() {
        return (N === null || N.byteLength === 0) && (N = new Float64Array(e.memory.buffer)), N;
    }
    function n_(r, _) {
        return r = r >>> 0, F_().subarray(r / 8, r / 8 + _);
    }
    let p = 0;
    const E = new TextEncoder;
    "encodeInto" in E || (E.encodeInto = function(r, _) {
        const n = E.encode(r);
        return _.set(n), {
            read: r.length,
            written: n.length
        };
    });
    function u(r, _, n) {
        if (n === void 0) {
            const f = E.encode(r), g = _(f.length, 1) >>> 0;
            return L().subarray(g, g + f.length).set(f), p = f.length, g;
        }
        let o = r.length, a = _(o, 1) >>> 0;
        const s = L();
        let i = 0;
        for(; i < o; i++){
            const f = r.charCodeAt(i);
            if (f > 127) break;
            s[a + i] = f;
        }
        if (i !== o) {
            i !== 0 && (r = r.slice(i)), a = n(a, o, o = i + r.length * 3, 1) >>> 0;
            const f = L().subarray(a + i, a + o), g = E.encodeInto(r, f);
            i += g.written, a = n(a, o, i, 1) >>> 0;
        }
        return p = i, a;
    }
    function h(r) {
        return r == null;
    }
    const o_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>e.__wbg_blabufferinfo_free(r >>> 0, 1));
    class A {
        static __wrap(_) {
            _ = _ >>> 0;
            const n = Object.create(A.prototype);
            return n.__wbg_ptr = _, o_.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, o_.unregister(this), _;
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
    Symbol.dispose && (A.prototype[Symbol.dispose] = A.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((r)=>e.__wbg_blalevel_free(r >>> 0, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((r)=>e.__wbg_blastep_free(r >>> 0, 1));
    const a_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>e.__wbg_jetbufferinfo_free(r >>> 0, 1));
    class T {
        static __wrap(_) {
            _ = _ >>> 0;
            const n = Object.create(T.prototype);
            return n.__wbg_ptr = _, a_.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, a_.unregister(this), _;
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
    Symbol.dispose && (T.prototype[Symbol.dispose] = T.prototype.free);
    const i_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>e.__wbg_mandelbrotnavigator_free(r >>> 0, 1));
    class K {
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, i_.unregister(this), _;
        }
        free() {
            const _ = this.__destroy_into_raw();
            e.__wbg_mandelbrotnavigator_free(_, 0);
        }
        get_params() {
            const _ = e.mandelbrotnavigator_get_params(this.__wbg_ptr);
            var n = z(_[0], _[1]).slice();
            return e.__wbindgen_free(_[0], _[1] * 4, 4), n;
        }
        use_unified() {
            e.mandelbrotnavigator_use_unified(this.__wbg_ptr);
        }
        find_minibrot(_, n) {
            const o = e.mandelbrotnavigator_find_minibrot(this.__wbg_ptr, _, n);
            var a = z(o[0], o[1]).slice();
            return e.__wbindgen_free(o[0], o[1] * 4, 4), a;
        }
        rotate_direct(_) {
            e.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, _);
        }
        view_floatexp() {
            const _ = e.mandelbrotnavigator_view_floatexp(this.__wbg_ptr);
            var n = n_(_[0], _[1]).slice();
            return e.__wbindgen_free(_[0], _[1] * 8, 8), n;
        }
        benchmark_pade(_) {
            const n = e.mandelbrotnavigator_benchmark_pade(this.__wbg_ptr, _);
            return D.__wrap(n);
        }
        get_bla_epsilon() {
            return e.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr);
        }
        set_bla_epsilon(_) {
            e.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr, _);
        }
        get_max_bla_skip() {
            return e.mandelbrotnavigator_get_max_bla_skip(this.__wbg_ptr) >>> 0;
        }
        is_in_transition() {
            return e.mandelbrotnavigator_is_in_transition(this.__wbg_ptr) !== 0;
        }
        pixel_to_complex(_, n, o, a) {
            const s = e.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr, _, n, o, a);
            var i = z(s[0], s[1]).slice();
            return e.__wbindgen_free(s[0], s[1] * 4, 4), i;
        }
        reference_origin(_, n) {
            const o = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), a = p, s = u(n, e.__wbindgen_malloc, e.__wbindgen_realloc), i = p;
            e.mandelbrotnavigator_reference_origin(this.__wbg_ptr, o, a, s, i);
        }
        set_max_bla_skip(_) {
            e.mandelbrotnavigator_set_max_bla_skip(this.__wbg_ptr, _);
        }
        start_transition(_, n, o, a, s) {
            const i = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), f = p, g = u(n, e.__wbindgen_malloc, e.__wbindgen_realloc), l = p, c = u(o, e.__wbindgen_malloc, e.__wbindgen_realloc), v = p;
            e.mandelbrotnavigator_start_transition(this.__wbg_ptr, i, f, g, l, c, v, a, s);
        }
        translate_direct(_, n, o, a) {
            e.mandelbrotnavigator_translate_direct(this.__wbg_ptr, _, n, !h(o), h(o) ? 0 : o, !h(a), h(a) ? 0 : a);
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
        coordinate_to_pixel(_, n, o, a) {
            const s = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), i = p, f = u(n, e.__wbindgen_malloc, e.__wbindgen_realloc), g = p, l = e.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr, s, i, f, g, o, a);
            var c = n_(l[0], l[1]).slice();
            return e.__wbindgen_free(l[0], l[1] * 8, 8), c;
        }
        unified_last_stages() {
            return e.mandelbrotnavigator_unified_last_stages(this.__wbg_ptr) >>> 0;
        }
        get_reference_params() {
            const _ = e.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);
            var n = z(_[0], _[1]).slice();
            return e.__wbindgen_free(_[0], _[1] * 4, 4), n;
        }
        set_precision_budget(_) {
            const n = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), o = p;
            e.mandelbrotnavigator_set_precision_budget(this.__wbg_ptr, n, o);
        }
        compute_jet_reference(_) {
            const n = e.mandelbrotnavigator_compute_jet_reference(this.__wbg_ptr, _);
            return T.__wrap(n);
        }
        get_approximation_mode() {
            return e.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr);
        }
        get_reference_orbit_len() {
            return e.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        compute_mobius_reference(_) {
            const n = e.mandelbrotnavigator_compute_mobius_reference(this.__wbg_ptr, _);
            return B.__wrap(n);
        }
        compute_bla_reference_ptr(_) {
            const n = e.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr, _);
            return A.__wrap(n);
        }
        compute_unified_reference(_) {
            const n = e.mandelbrotnavigator_compute_unified_reference(this.__wbg_ptr, _);
            return C.__wrap(n);
        }
        compute_reference_orbit_ptr(_) {
            const n = e.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, _);
            return j.__wrap(n);
        }
        get_reference_orbit_capacity() {
            return e.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        compute_reference_orbit_chunk(_, n) {
            const o = e.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, _, n);
            return j.__wrap(o);
        }
        constructor(_, n, o, a){
            const s = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), i = p, f = u(n, e.__wbindgen_malloc, e.__wbindgen_realloc), g = p, l = u(o, e.__wbindgen_malloc, e.__wbindgen_realloc), c = p, v = e.mandelbrotnavigator_new(s, i, f, g, l, c, a);
            return this.__wbg_ptr = v >>> 0, i_.register(this, this.__wbg_ptr, this), this;
        }
        step(_, n) {
            const o = e.mandelbrotnavigator_step(this.__wbg_ptr, !h(_), h(_) ? 0 : _, !h(n), h(n) ? 0 : n);
            var a = z(o[0], o[1]).slice();
            return e.__wbindgen_free(o[0], o[1] * 4, 4), a;
        }
        zoom(_) {
            e.mandelbrotnavigator_zoom(this.__wbg_ptr, _);
        }
        angle(_) {
            e.mandelbrotnavigator_angle(this.__wbg_ptr, _);
        }
        scale(_) {
            const n = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), o = p;
            e.mandelbrotnavigator_scale(this.__wbg_ptr, n, o);
        }
        origin(_, n) {
            const o = u(_, e.__wbindgen_malloc, e.__wbindgen_realloc), a = p, s = u(n, e.__wbindgen_malloc, e.__wbindgen_realloc), i = p;
            e.mandelbrotnavigator_origin(this.__wbg_ptr, o, a, s, i);
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
        translate(_, n) {
            e.mandelbrotnavigator_translate(this.__wbg_ptr, _, n);
        }
    }
    Symbol.dispose && (K.prototype[Symbol.dispose] = K.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((r)=>e.__wbg_mandelbrotstep_free(r >>> 0, 1));
    const b_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>e.__wbg_mobiusbufferinfo_free(r >>> 0, 1));
    class B {
        static __wrap(_) {
            _ = _ >>> 0;
            const n = Object.create(B.prototype);
            return n.__wbg_ptr = _, b_.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, b_.unregister(this), _;
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
    Symbol.dispose && (B.prototype[Symbol.dispose] = B.prototype.free);
    const s_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>e.__wbg_orbitbufferinfo_free(r >>> 0, 1));
    class j {
        static __wrap(_) {
            _ = _ >>> 0;
            const n = Object.create(j.prototype);
            return n.__wbg_ptr = _, s_.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, s_.unregister(this), _;
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
    Symbol.dispose && (j.prototype[Symbol.dispose] = j.prototype.free);
    const f_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>e.__wbg_padebenchmark_free(r >>> 0, 1));
    class D {
        static __wrap(_) {
            _ = _ >>> 0;
            const n = Object.create(D.prototype);
            return n.__wbg_ptr = _, f_.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, f_.unregister(this), _;
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
    Symbol.dispose && (D.prototype[Symbol.dispose] = D.prototype.free);
    const g_ = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((r)=>e.__wbg_unifiedbufferinfo_free(r >>> 0, 1));
    class C {
        static __wrap(_) {
            _ = _ >>> 0;
            const n = Object.create(C.prototype);
            return n.__wbg_ptr = _, g_.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const _ = this.__wbg_ptr;
            return this.__wbg_ptr = 0, g_.unregister(this), _;
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
    Symbol.dispose && (C.prototype[Symbol.dispose] = C.prototype.free);
    function R_(r) {
        return Math.exp(r);
    }
    function S_(r) {
        return Math.log(r);
    }
    function z_() {
        return Date.now();
    }
    function E_(r, _) {
        throw new Error(p_(r, _));
    }
    function I_(r, _) {
        return p_(r, _);
    }
    function M_() {
        const r = e.__wbindgen_export_0, _ = r.grow(4);
        r.set(0, void 0), r.set(_ + 0, void 0), r.set(_ + 1, null), r.set(_ + 2, !0), r.set(_ + 3, !1);
    }
    URL = globalThis.URL;
    const t = await h_({
        "./mandelbrot_bg.js": {
            __wbg_now_1e80617bcee43265: z_,
            __wbg_exp_9293ded1248e1bd3: R_,
            __wbg_log_5f75e13a39ba07fe: S_,
            __wbg_wbindgenthrow_451ec1a8469d7eb6: E_,
            __wbindgen_init_externref_table: M_,
            __wbindgen_cast_2241b6af4c4b2941: I_
        }
    }, v_), y = t.memory, A_ = t.__wbg_blabufferinfo_free, T_ = t.__wbg_blalevel_free, B_ = t.__wbg_blastep_free, D_ = t.__wbg_get_blabufferinfo_count, C_ = t.__wbg_get_blabufferinfo_level_count, O_ = t.__wbg_get_blabufferinfo_levels_ptr, U_ = t.__wbg_get_blabufferinfo_ptr, N_ = t.__wbg_get_blastep_ab_exp, L_ = t.__wbg_get_blastep_alpha_exp, W_ = t.__wbg_get_blastep_ax, P_ = t.__wbg_get_blastep_ay, V_ = t.__wbg_get_blastep_bx, $_ = t.__wbg_get_blastep_by, J_ = t.__wbg_get_blastep_d_exp, Z_ = t.__wbg_get_blastep_dx, Y_ = t.__wbg_get_blastep_dy, H_ = t.__wbg_get_blastep_log2_min_a, q_ = t.__wbg_get_blastep_radius_alpha, G_ = t.__wbg_get_blastep_radius_beta, K_ = t.__wbg_get_jetbufferinfo_level_count, X_ = t.__wbg_get_jetbufferinfo_levels_ptr, Q_ = t.__wbg_get_padebenchmark_max_iter, _e = t.__wbg_get_padebenchmark_max_iter_delta, ee = t.__wbg_get_padebenchmark_pade_mismatches, te = t.__wbg_get_padebenchmark_pixels, re = t.__wbg_get_padebenchmark_steps_affine, ne = t.__wbg_get_padebenchmark_steps_exact, oe = t.__wbg_get_padebenchmark_steps_pade, ae = t.__wbg_jetbufferinfo_free, ie = t.__wbg_mandelbrotnavigator_free, be = t.__wbg_mandelbrotstep_free, se = t.__wbg_mobiusbufferinfo_free, fe = t.__wbg_orbitbufferinfo_free, ge = t.__wbg_padebenchmark_free, le = t.__wbg_set_blabufferinfo_count, ce = t.__wbg_set_blabufferinfo_level_count, pe = t.__wbg_set_blabufferinfo_levels_ptr, ue = t.__wbg_set_blabufferinfo_ptr, de = t.__wbg_set_blastep_ab_exp, we = t.__wbg_set_blastep_alpha_exp, me = t.__wbg_set_blastep_ax, ve = t.__wbg_set_blastep_ay, he = t.__wbg_set_blastep_bx, ye = t.__wbg_set_blastep_by, xe = t.__wbg_set_blastep_d_exp, ke = t.__wbg_set_blastep_dx, je = t.__wbg_set_blastep_dy, Fe = t.__wbg_set_blastep_log2_min_a, Re = t.__wbg_set_blastep_radius_alpha, Se = t.__wbg_set_blastep_radius_beta, ze = t.__wbg_set_jetbufferinfo_level_count, Ee = t.__wbg_set_padebenchmark_max_iter, Ie = t.__wbg_set_padebenchmark_pade_mismatches, Me = t.__wbg_set_padebenchmark_pixels, Ae = t.__wbg_set_padebenchmark_steps_affine, Te = t.__wbg_set_padebenchmark_steps_exact, Be = t.__wbg_set_padebenchmark_steps_pade, De = t.__wbg_unifiedbufferinfo_free, Ce = t.mandelbrotnavigator_angle, Oe = t.mandelbrotnavigator_benchmark_pade, Ue = t.mandelbrotnavigator_cancel_transition, Ne = t.mandelbrotnavigator_compute_bla_reference_ptr, Le = t.mandelbrotnavigator_compute_jet_reference, We = t.mandelbrotnavigator_compute_mobius_reference, Pe = t.mandelbrotnavigator_compute_reference_orbit_chunk, Ve = t.mandelbrotnavigator_compute_reference_orbit_ptr, $e = t.mandelbrotnavigator_compute_unified_reference, Je = t.mandelbrotnavigator_coordinate_to_pixel, Ze = t.mandelbrotnavigator_find_minibrot, Ye = t.mandelbrotnavigator_get_approximation_mode, He = t.mandelbrotnavigator_get_bla_epsilon, qe = t.mandelbrotnavigator_get_max_bla_skip, Ge = t.mandelbrotnavigator_get_params, Ke = t.mandelbrotnavigator_get_reference_orbit_capacity, Xe = t.mandelbrotnavigator_get_reference_orbit_len, Qe = t.mandelbrotnavigator_get_reference_params, _t = t.mandelbrotnavigator_is_in_transition, et = t.mandelbrotnavigator_new, tt = t.mandelbrotnavigator_origin, rt = t.mandelbrotnavigator_pixel_to_complex, nt = t.mandelbrotnavigator_reference_origin, ot = t.mandelbrotnavigator_rotate, at = t.mandelbrotnavigator_rotate_direct, it = t.mandelbrotnavigator_scale, bt = t.mandelbrotnavigator_set_bla_epsilon, st = t.mandelbrotnavigator_set_max_bla_skip, ft = t.mandelbrotnavigator_set_precision_budget, gt = t.mandelbrotnavigator_start_transition, lt = t.mandelbrotnavigator_step, ct = t.mandelbrotnavigator_translate, pt = t.mandelbrotnavigator_translate_direct, ut = t.mandelbrotnavigator_unified_last_stages, dt = t.mandelbrotnavigator_use_bla, wt = t.mandelbrotnavigator_use_jet, mt = t.mandelbrotnavigator_use_mobius_cplus, vt = t.mandelbrotnavigator_use_pade, ht = t.mandelbrotnavigator_use_perturbation, yt = t.mandelbrotnavigator_use_unified, xt = t.mandelbrotnavigator_view_floatexp, kt = t.mandelbrotnavigator_zoom, jt = t.__wbg_set_blalevel_count, Ft = t.__wbg_set_blalevel_max_radius_bits, Rt = t.__wbg_set_blalevel_offset, St = t.__wbg_set_blalevel_skip, zt = t.__wbg_set_jetbufferinfo_coeffs_count, Et = t.__wbg_set_jetbufferinfo_coeffs_ptr, It = t.__wbg_set_jetbufferinfo_levels_ptr, Mt = t.__wbg_set_jetbufferinfo_radii_count, At = t.__wbg_set_jetbufferinfo_radii_ptr, Tt = t.__wbg_set_mandelbrotstep_pad0, Bt = t.__wbg_set_mandelbrotstep_pad1, Dt = t.__wbg_set_mandelbrotstep_zx, Ct = t.__wbg_set_mandelbrotstep_zy, Ot = t.__wbg_set_mobiusbufferinfo_coeffs_count, Ut = t.__wbg_set_mobiusbufferinfo_coeffs_ptr, Nt = t.__wbg_set_mobiusbufferinfo_level_count, Lt = t.__wbg_set_mobiusbufferinfo_levels_ptr, Wt = t.__wbg_set_mobiusbufferinfo_radii_count, Pt = t.__wbg_set_mobiusbufferinfo_radii_ptr, Vt = t.__wbg_set_orbitbufferinfo_count, $t = t.__wbg_set_orbitbufferinfo_offset, Jt = t.__wbg_set_orbitbufferinfo_ptr, Zt = t.__wbg_set_padebenchmark_max_iter_delta, Yt = t.__wbg_set_unifiedbufferinfo_coeffs_count, Ht = t.__wbg_set_unifiedbufferinfo_coeffs_ptr, qt = t.__wbg_set_unifiedbufferinfo_level_count, Gt = t.__wbg_set_unifiedbufferinfo_levels_ptr, Kt = t.__wbg_set_unifiedbufferinfo_radii_count, Xt = t.__wbg_set_unifiedbufferinfo_radii_ptr, Qt = t.__wbg_get_blalevel_count, _r = t.__wbg_get_blalevel_max_radius_bits, er = t.__wbg_get_blalevel_offset, tr = t.__wbg_get_blalevel_skip, rr = t.__wbg_get_jetbufferinfo_coeffs_count, nr = t.__wbg_get_jetbufferinfo_coeffs_ptr, or = t.__wbg_get_jetbufferinfo_radii_count, ar = t.__wbg_get_jetbufferinfo_radii_ptr, ir = t.__wbg_get_mobiusbufferinfo_coeffs_count, br = t.__wbg_get_mobiusbufferinfo_coeffs_ptr, sr = t.__wbg_get_mobiusbufferinfo_level_count, fr = t.__wbg_get_mobiusbufferinfo_levels_ptr, gr = t.__wbg_get_mobiusbufferinfo_radii_count, lr = t.__wbg_get_mobiusbufferinfo_radii_ptr, cr = t.__wbg_get_orbitbufferinfo_count, pr = t.__wbg_get_orbitbufferinfo_offset, ur = t.__wbg_get_orbitbufferinfo_ptr, dr = t.__wbg_get_unifiedbufferinfo_coeffs_count, wr = t.__wbg_get_unifiedbufferinfo_coeffs_ptr, mr = t.__wbg_get_unifiedbufferinfo_level_count, vr = t.__wbg_get_unifiedbufferinfo_levels_ptr, hr = t.__wbg_get_unifiedbufferinfo_radii_count, yr = t.__wbg_get_unifiedbufferinfo_radii_ptr, xr = t.__wbg_get_mandelbrotstep_pad0, kr = t.__wbg_get_mandelbrotstep_pad1, jr = t.__wbg_get_mandelbrotstep_zx, Fr = t.__wbg_get_mandelbrotstep_zy, Rr = t.__wbindgen_export_0, Sr = t.__externref_drop_slice, zr = t.__wbindgen_free, Er = t.__wbindgen_malloc, Ir = t.__wbindgen_realloc, u_ = t.__wbindgen_start;
    var Mr = Object.freeze({
        __proto__: null,
        __externref_drop_slice: Sr,
        __wbg_blabufferinfo_free: A_,
        __wbg_blalevel_free: T_,
        __wbg_blastep_free: B_,
        __wbg_get_blabufferinfo_count: D_,
        __wbg_get_blabufferinfo_level_count: C_,
        __wbg_get_blabufferinfo_levels_ptr: O_,
        __wbg_get_blabufferinfo_ptr: U_,
        __wbg_get_blalevel_count: Qt,
        __wbg_get_blalevel_max_radius_bits: _r,
        __wbg_get_blalevel_offset: er,
        __wbg_get_blalevel_skip: tr,
        __wbg_get_blastep_ab_exp: N_,
        __wbg_get_blastep_alpha_exp: L_,
        __wbg_get_blastep_ax: W_,
        __wbg_get_blastep_ay: P_,
        __wbg_get_blastep_bx: V_,
        __wbg_get_blastep_by: $_,
        __wbg_get_blastep_d_exp: J_,
        __wbg_get_blastep_dx: Z_,
        __wbg_get_blastep_dy: Y_,
        __wbg_get_blastep_log2_min_a: H_,
        __wbg_get_blastep_radius_alpha: q_,
        __wbg_get_blastep_radius_beta: G_,
        __wbg_get_jetbufferinfo_coeffs_count: rr,
        __wbg_get_jetbufferinfo_coeffs_ptr: nr,
        __wbg_get_jetbufferinfo_level_count: K_,
        __wbg_get_jetbufferinfo_levels_ptr: X_,
        __wbg_get_jetbufferinfo_radii_count: or,
        __wbg_get_jetbufferinfo_radii_ptr: ar,
        __wbg_get_mandelbrotstep_pad0: xr,
        __wbg_get_mandelbrotstep_pad1: kr,
        __wbg_get_mandelbrotstep_zx: jr,
        __wbg_get_mandelbrotstep_zy: Fr,
        __wbg_get_mobiusbufferinfo_coeffs_count: ir,
        __wbg_get_mobiusbufferinfo_coeffs_ptr: br,
        __wbg_get_mobiusbufferinfo_level_count: sr,
        __wbg_get_mobiusbufferinfo_levels_ptr: fr,
        __wbg_get_mobiusbufferinfo_radii_count: gr,
        __wbg_get_mobiusbufferinfo_radii_ptr: lr,
        __wbg_get_orbitbufferinfo_count: cr,
        __wbg_get_orbitbufferinfo_offset: pr,
        __wbg_get_orbitbufferinfo_ptr: ur,
        __wbg_get_padebenchmark_max_iter: Q_,
        __wbg_get_padebenchmark_max_iter_delta: _e,
        __wbg_get_padebenchmark_pade_mismatches: ee,
        __wbg_get_padebenchmark_pixels: te,
        __wbg_get_padebenchmark_steps_affine: re,
        __wbg_get_padebenchmark_steps_exact: ne,
        __wbg_get_padebenchmark_steps_pade: oe,
        __wbg_get_unifiedbufferinfo_coeffs_count: dr,
        __wbg_get_unifiedbufferinfo_coeffs_ptr: wr,
        __wbg_get_unifiedbufferinfo_level_count: mr,
        __wbg_get_unifiedbufferinfo_levels_ptr: vr,
        __wbg_get_unifiedbufferinfo_radii_count: hr,
        __wbg_get_unifiedbufferinfo_radii_ptr: yr,
        __wbg_jetbufferinfo_free: ae,
        __wbg_mandelbrotnavigator_free: ie,
        __wbg_mandelbrotstep_free: be,
        __wbg_mobiusbufferinfo_free: se,
        __wbg_orbitbufferinfo_free: fe,
        __wbg_padebenchmark_free: ge,
        __wbg_set_blabufferinfo_count: le,
        __wbg_set_blabufferinfo_level_count: ce,
        __wbg_set_blabufferinfo_levels_ptr: pe,
        __wbg_set_blabufferinfo_ptr: ue,
        __wbg_set_blalevel_count: jt,
        __wbg_set_blalevel_max_radius_bits: Ft,
        __wbg_set_blalevel_offset: Rt,
        __wbg_set_blalevel_skip: St,
        __wbg_set_blastep_ab_exp: de,
        __wbg_set_blastep_alpha_exp: we,
        __wbg_set_blastep_ax: me,
        __wbg_set_blastep_ay: ve,
        __wbg_set_blastep_bx: he,
        __wbg_set_blastep_by: ye,
        __wbg_set_blastep_d_exp: xe,
        __wbg_set_blastep_dx: ke,
        __wbg_set_blastep_dy: je,
        __wbg_set_blastep_log2_min_a: Fe,
        __wbg_set_blastep_radius_alpha: Re,
        __wbg_set_blastep_radius_beta: Se,
        __wbg_set_jetbufferinfo_coeffs_count: zt,
        __wbg_set_jetbufferinfo_coeffs_ptr: Et,
        __wbg_set_jetbufferinfo_level_count: ze,
        __wbg_set_jetbufferinfo_levels_ptr: It,
        __wbg_set_jetbufferinfo_radii_count: Mt,
        __wbg_set_jetbufferinfo_radii_ptr: At,
        __wbg_set_mandelbrotstep_pad0: Tt,
        __wbg_set_mandelbrotstep_pad1: Bt,
        __wbg_set_mandelbrotstep_zx: Dt,
        __wbg_set_mandelbrotstep_zy: Ct,
        __wbg_set_mobiusbufferinfo_coeffs_count: Ot,
        __wbg_set_mobiusbufferinfo_coeffs_ptr: Ut,
        __wbg_set_mobiusbufferinfo_level_count: Nt,
        __wbg_set_mobiusbufferinfo_levels_ptr: Lt,
        __wbg_set_mobiusbufferinfo_radii_count: Wt,
        __wbg_set_mobiusbufferinfo_radii_ptr: Pt,
        __wbg_set_orbitbufferinfo_count: Vt,
        __wbg_set_orbitbufferinfo_offset: $t,
        __wbg_set_orbitbufferinfo_ptr: Jt,
        __wbg_set_padebenchmark_max_iter: Ee,
        __wbg_set_padebenchmark_max_iter_delta: Zt,
        __wbg_set_padebenchmark_pade_mismatches: Ie,
        __wbg_set_padebenchmark_pixels: Me,
        __wbg_set_padebenchmark_steps_affine: Ae,
        __wbg_set_padebenchmark_steps_exact: Te,
        __wbg_set_padebenchmark_steps_pade: Be,
        __wbg_set_unifiedbufferinfo_coeffs_count: Yt,
        __wbg_set_unifiedbufferinfo_coeffs_ptr: Ht,
        __wbg_set_unifiedbufferinfo_level_count: qt,
        __wbg_set_unifiedbufferinfo_levels_ptr: Gt,
        __wbg_set_unifiedbufferinfo_radii_count: Kt,
        __wbg_set_unifiedbufferinfo_radii_ptr: Xt,
        __wbg_unifiedbufferinfo_free: De,
        __wbindgen_export_0: Rr,
        __wbindgen_free: zr,
        __wbindgen_malloc: Er,
        __wbindgen_realloc: Ir,
        __wbindgen_start: u_,
        mandelbrotnavigator_angle: Ce,
        mandelbrotnavigator_benchmark_pade: Oe,
        mandelbrotnavigator_cancel_transition: Ue,
        mandelbrotnavigator_compute_bla_reference_ptr: Ne,
        mandelbrotnavigator_compute_jet_reference: Le,
        mandelbrotnavigator_compute_mobius_reference: We,
        mandelbrotnavigator_compute_reference_orbit_chunk: Pe,
        mandelbrotnavigator_compute_reference_orbit_ptr: Ve,
        mandelbrotnavigator_compute_unified_reference: $e,
        mandelbrotnavigator_coordinate_to_pixel: Je,
        mandelbrotnavigator_find_minibrot: Ze,
        mandelbrotnavigator_get_approximation_mode: Ye,
        mandelbrotnavigator_get_bla_epsilon: He,
        mandelbrotnavigator_get_max_bla_skip: qe,
        mandelbrotnavigator_get_params: Ge,
        mandelbrotnavigator_get_reference_orbit_capacity: Ke,
        mandelbrotnavigator_get_reference_orbit_len: Xe,
        mandelbrotnavigator_get_reference_params: Qe,
        mandelbrotnavigator_is_in_transition: _t,
        mandelbrotnavigator_new: et,
        mandelbrotnavigator_origin: tt,
        mandelbrotnavigator_pixel_to_complex: rt,
        mandelbrotnavigator_reference_origin: nt,
        mandelbrotnavigator_rotate: ot,
        mandelbrotnavigator_rotate_direct: at,
        mandelbrotnavigator_scale: it,
        mandelbrotnavigator_set_bla_epsilon: bt,
        mandelbrotnavigator_set_max_bla_skip: st,
        mandelbrotnavigator_set_precision_budget: ft,
        mandelbrotnavigator_start_transition: gt,
        mandelbrotnavigator_step: lt,
        mandelbrotnavigator_translate: ct,
        mandelbrotnavigator_translate_direct: pt,
        mandelbrotnavigator_unified_last_stages: ut,
        mandelbrotnavigator_use_bla: dt,
        mandelbrotnavigator_use_jet: wt,
        mandelbrotnavigator_use_mobius_cplus: mt,
        mandelbrotnavigator_use_pade: vt,
        mandelbrotnavigator_use_perturbation: ht,
        mandelbrotnavigator_use_unified: yt,
        mandelbrotnavigator_view_floatexp: xt,
        mandelbrotnavigator_zoom: kt,
        memory: y
    });
    y_(Mr);
    u_();
    const Ar = 3.321928094887362;
    function Tr(r) {
        if (r = r.trim(), r.length === 0) return null;
        let _ = 1;
        r[0] === "-" ? (_ = -1, r = r.slice(1)) : r[0] === "+" && (r = r.slice(1));
        let n = 0;
        const o = r.search(/[eE]/);
        if (o >= 0) {
            const m = parseInt(r.slice(o + 1), 10);
            if (!Number.isFinite(m)) return null;
            n = m, r = r.slice(0, o);
        }
        const a = r.indexOf("."), s = a >= 0 ? r.slice(0, a) : r, i = a >= 0 ? r.slice(a + 1) : "";
        if (!/^[0-9]*$/.test(s) || !/^[0-9]*$/.test(i) || s + i === "") return null;
        const f = s + i, g = s.length;
        let l = -1;
        for(let m = 0; m < f.length; m++)if (f[m] !== "0") {
            l = m;
            break;
        }
        if (l < 0) return {
            sign: 1,
            m10: 0,
            d: 0
        };
        const c = f.slice(l, l + 18), v = parseFloat(c[0] + "." + c.slice(1)), R = g - 1 - l + n;
        return {
            sign: _,
            m10: v,
            d: R
        };
    }
    function d_(r) {
        const _ = Tr(r);
        return !_ || _.m10 === 0 ? -1 / 0 : (Math.log10(_.m10) + _.d) * Ar;
    }
    const X = self;
    let b, d = 0, O = !1, w = 0, I = 0, G = !1, M = !1, Br = 0, P = 0, V = Number.NaN;
    const Dr = 1e3, Cr = 2, Or = 1e6;
    function F(r, _) {
        X.postMessage(r, _ ?? []);
    }
    function l_() {
        return new Promise((r)=>setTimeout(r, 0));
    }
    function w_(r, _) {
        const n = _ instanceof Error ? _.message : String(_);
        F({
            type: "error",
            jobId: r,
            message: n
        });
    }
    function m_(r) {
        b && (r === "bla" ? b.use_bla() : r === "pade" ? b.use_pade() : r === "jet" ? b.use_jet() : r === "mobius" ? b.use_mobius_cplus() : r === "auto" ? b.use_unified() : b.use_perturbation());
    }
    function Ur(r) {
        console.log("[REF worker] RESET (fresh navigator)", r.cx.slice(0, 14), "scale", r.scale.slice(0, 10)), b?.free(), b = new K(r.cx, r.cy, r.scale, r.angle), b.set_precision_budget(r.precisionBudget), d = r.jobId, w = 0, I = r.maxIterations, M = !1, m_(r.approximationMode), b.set_bla_epsilon(r.blaEpsilon), b.set_max_bla_skip(r.maxBlaSkip), V = d_(r.scale), k(r.jobId);
    }
    function Nr(r, _, n) {
        const s = Math.max(0, n - _), i = new Float32Array(y.buffer, r + _ * 4 * Float32Array.BYTES_PER_ELEMENT, s * 4), f = new Float32Array(s * 2);
        for(let g = 0; g < s; g++)f[g * 2] = i[g * 4], f[g * 2 + 1] = i[g * 4 + 1];
        return f;
    }
    function c_(r, _, n) {
        if (!b || r !== d || O) return;
        const o = b.get_approximation_mode(), a = (o === 3 || o === 4 || o === 5) && w > 0 && _ <= Math.ceil(w * 1.5);
        if (w >= _ || a || n < _ || o === 0) return;
        const s = P, i = o === 3, f = o === 4, g = o === 5;
        if (!i && !f && !g) {
            const S = b.compute_bla_reference_ptr(_), t_ = new Float32Array(y.buffer, S.ptr, S.count * 12), Y = new Float32Array(t_.length);
            Y.set(t_);
            const r_ = new Uint32Array(y.buffer, S.levels_ptr, S.level_count * 4), H = new Uint32Array(r_.length);
            H.set(r_), w = _, F({
                type: "blaReady",
                jobId: r,
                refId: s,
                maxIterations: _,
                kind: "bla",
                steps: Y,
                levels: H,
                levelCount: S.level_count
            }, [
                Y.buffer,
                H.buffer
            ]);
            return;
        }
        const l = performance.now(), c = f ? b.compute_mobius_reference(_) : g ? b.compute_unified_reference(_) : b.compute_jet_reference(_), v = performance.now() - l, R = g ? b.unified_last_stages() : void 0;
        console.log(`[REF worker] ${f ? "mobius" : g ? "unified" : "jet"} table built in ${v.toFixed(0)}ms (maxIter ${_}${R !== void 0 ? `, stages ${R}` : ""})`);
        const m = f ? 15 : 27, Q = new Float32Array(y.buffer, c.coeffs_ptr, c.coeffs_count * m), $ = new Float32Array(Q.length);
        $.set(Q);
        const __ = new Float32Array(y.buffer, c.radii_ptr, c.radii_count * 4), J = new Float32Array(__.length);
        J.set(__);
        const e_ = new Uint32Array(y.buffer, c.levels_ptr, c.level_count * 4), Z = new Uint32Array(e_.length);
        Z.set(e_), w = _, F({
            type: "blaReady",
            jobId: r,
            refId: s,
            maxIterations: _,
            kind: f ? "mobius" : g ? "unified" : "jet",
            steps: $,
            radii: J,
            levels: Z,
            levelCount: c.level_count,
            buildMs: v,
            buildStages: R
        }, [
            $.buffer,
            J.buffer,
            Z.buffer
        ]);
    }
    async function k(r) {
        if (!G) {
            G = !0;
            try {
                for(; !O && b && r === d;){
                    const _ = I, n = Math.min(_ * Cr, Or), o = Math.max(0, b.get_reference_orbit_len());
                    if (o >= n && !M) {
                        if (c_(r, _, o), await l_(), I <= _) break;
                        continue;
                    }
                    const a = b.compute_reference_orbit_chunk(Dr, n);
                    M = !1;
                    const s = Nr(a.ptr, a.offset, a.count), [i, f] = b.get_reference_params();
                    a.offset === 0 && (P = ++Br, w = 0, console.log("[REF worker] orbit (re)start refId=", P, "ref=", i.slice(0, 14)));
                    const g = Math.max(0, a.count - 1);
                    F({
                        type: "orbitChunk",
                        jobId: r,
                        refId: P,
                        offset: a.offset,
                        count: a.count,
                        maxIterations: _,
                        referenceCx: i,
                        referenceCy: f,
                        orbit: s
                    }, [
                        s.buffer
                    ]), c_(r, _, g), await l_();
                }
            } catch (_) {
                w_(r, _);
            } finally{
                if (G = !1, !O && b) {
                    const _ = Math.max(0, b.get_reference_orbit_len());
                    (r !== d || _ < I || M) && k(d);
                }
            }
        }
    }
    X.onmessage = (r)=>{
        const _ = r.data;
        try {
            switch(_.type){
                case "reset":
                    O || Ur(_);
                    break;
                case "updateView":
                    if (b && _.jobId === d) {
                        console.log("[REF worker] updateView (reuse navigator)", _.cx.slice(0, 14), "scale", _.scale.slice(0, 10)), b.origin(_.cx, _.cy), b.scale(_.scale), b.angle(_.angle), I = _.maxIterations, M = !0;
                        const n = b.get_approximation_mode();
                        if (n === 3 || n === 4 || n === 5) {
                            const o = d_(_.scale);
                            (!Number.isFinite(V) || Math.abs(o - V) >= 2) && (V = o, w = 0);
                        }
                        k(_.jobId);
                    }
                    break;
                case "setApproximationMode":
                    _.jobId === d && (m_(_.approximationMode), w = 0, k(_.jobId));
                    break;
                case "setBlaEpsilon":
                    b && _.jobId === d && (b.set_bla_epsilon(_.blaEpsilon), w = 0, k(_.jobId));
                    break;
                case "setMaxBlaSkip":
                    b && _.jobId === d && (b.set_max_bla_skip(_.maxBlaSkip), w = 0, k(_.jobId));
                    break;
                case "findMinibrot":
                    if (b && _.jobId === d) {
                        const n = b.find_minibrot(_.maxIter, _.radiusFactor), o = n[0];
                        F({
                            type: "minibrotFound",
                            jobId: _.jobId,
                            status: o,
                            cx: o === "ok" ? n[1] : null,
                            cy: o === "ok" ? n[2] : null,
                            period: o === "ok" ? Number(n[3]) : o === "nonewton" ? Number(n[1]) : null
                        });
                    }
                    break;
                case "dispose":
                    O = !0, b?.free(), b = void 0, X.close();
                    break;
            }
        } catch (n) {
            w_("jobId" in _ ? _.jobId : d, n);
        }
    };
    F({
        type: "ready"
    });
})();
