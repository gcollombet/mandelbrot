(async ()=>{
    var qe = "" + new URL("mandelbrot_bg-CbDAtNse.wasm", import.meta.url).href, e_ = async (n = {}, e)=>{
        let i;
        if (e.startsWith("data:")) {
            const r = e.replace(/^data:.*?base64,/, "");
            let a;
            if (typeof Buffer == "function" && typeof Buffer.from == "function") a = Buffer.from(r, "base64");
            else if (typeof atob == "function") {
                const s = atob(r);
                a = new Uint8Array(s.length);
                for(let o = 0; o < s.length; o++)a[o] = s.charCodeAt(o);
            } else throw new Error("Cannot decode base64-encoded data URL");
            i = await WebAssembly.instantiate(a, n);
        } else {
            const r = await fetch(e), a = r.headers.get("Content-Type") || "";
            if ("instantiateStreaming" in WebAssembly && a.startsWith("application/wasm")) i = await WebAssembly.instantiateStreaming(r, n);
            else {
                const s = await r.arrayBuffer();
                i = await WebAssembly.instantiate(s, n);
            }
        }
        return i.instance.exports;
    };
    let _;
    function __(n) {
        _ = n;
    }
    let se = null;
    function le() {
        return (se === null || se.byteLength === 0) && (se = new Uint8Array(_.memory.buffer)), se;
    }
    let ge = new TextDecoder("utf-8", {
        ignoreBOM: !0,
        fatal: !0
    });
    ge.decode();
    const t_ = 2146435072;
    let he = 0;
    function n_(n, e) {
        return he += e, he >= t_ && (ge = new TextDecoder("utf-8", {
            ignoreBOM: !0,
            fatal: !0
        }), ge.decode(), he = e), ge.decode(le().subarray(n, n + e));
    }
    function Ve(n, e) {
        return n = n >>> 0, n_(n, e);
    }
    let W = null;
    function i_() {
        return (W === null || W.buffer.detached === !0 || W.buffer.detached === void 0 && W.buffer !== _.memory.buffer) && (W = new DataView(_.memory.buffer)), W;
    }
    function z(n, e) {
        n = n >>> 0;
        const i = i_(), r = [];
        for(let a = n; a < n + 4 * e; a += 4)r.push(_.__wbindgen_export_0.get(i.getUint32(a, !0)));
        return _.__externref_drop_slice(n, e), r;
    }
    let be = null;
    function r_() {
        return (be === null || be.byteLength === 0) && (be = new Float64Array(_.memory.buffer)), be;
    }
    function Ee(n, e) {
        return n = n >>> 0, r_().subarray(n / 8, n / 8 + e);
    }
    function y(n) {
        return n == null;
    }
    let p = 0;
    const te = new TextEncoder;
    "encodeInto" in te || (te.encodeInto = function(n, e) {
        const i = te.encode(n);
        return e.set(i), {
            read: n.length,
            written: i.length
        };
    });
    function h(n, e, i) {
        if (i === void 0) {
            const b = te.encode(n), l = e(b.length, 1) >>> 0;
            return le().subarray(l, l + b.length).set(b), p = b.length, l;
        }
        let r = n.length, a = e(r, 1) >>> 0;
        const s = le();
        let o = 0;
        for(; o < r; o++){
            const b = n.charCodeAt(o);
            if (b > 127) break;
            s[a + o] = b;
        }
        if (o !== r) {
            o !== 0 && (n = n.slice(o)), a = i(a, r, r = o + n.length * 3, 1) >>> 0;
            const b = le().subarray(a + o, a + r), l = te.encodeInto(n, b);
            o += l.written, a = i(a, r, o, 1) >>> 0;
        }
        return p = o, a;
    }
    const Te = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>_.__wbg_blabufferinfo_free(n >>> 0, 1));
    class ne {
        static __wrap(e) {
            e = e >>> 0;
            const i = Object.create(ne.prototype);
            return i.__wbg_ptr = e, Te.register(i, i.__wbg_ptr, i), i;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, Te.unregister(this), e;
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
    Symbol.dispose && (ne.prototype[Symbol.dispose] = ne.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((n)=>_.__wbg_blalevel_free(n >>> 0, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((n)=>_.__wbg_blastep_free(n >>> 0, 1));
    const ze = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>_.__wbg_incrementalunifiedbufferinfo_free(n >>> 0, 1));
    class ie {
        static __wrap(e) {
            e = e >>> 0;
            const i = Object.create(ie.prototype);
            return i.__wbg_ptr = e, ze.register(i, i.__wbg_ptr, i), i;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, ze.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_incrementalunifiedbufferinfo_free(e, 0);
        }
        get ranges_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_ranges_ptr(this.__wbg_ptr) >>> 0;
        }
        set ranges_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_ranges_ptr(this.__wbg_ptr, e);
        }
        get range_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_range_count(this.__wbg_ptr) >>> 0;
        }
        set range_count(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_range_count(this.__wbg_ptr, e);
        }
        get coeffs_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr) >>> 0;
        }
        set coeffs_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr, e);
        }
        get coeffs_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_coeffs_count(this.__wbg_ptr) >>> 0;
        }
        set coeffs_count(e) {
            _.__wbg_set_blastep_d_exp(this.__wbg_ptr, e);
        }
        get radii_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_radii_ptr(this.__wbg_ptr) >>> 0;
        }
        set radii_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_radii_ptr(this.__wbg_ptr, e);
        }
        get radii_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_radii_count(this.__wbg_ptr) >>> 0;
        }
        set radii_count(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_radii_count(this.__wbg_ptr, e);
        }
        get certificates_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_certificates_ptr(this.__wbg_ptr) >>> 0;
        }
        set certificates_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_certificates_ptr(this.__wbg_ptr, e);
        }
        get certificates_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_certificates_count(this.__wbg_ptr) >>> 0;
        }
        set certificates_count(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_certificates_count(this.__wbg_ptr, e);
        }
        get certificate_version() {
            return _.__wbg_get_incrementalunifiedbufferinfo_certificate_version(this.__wbg_ptr) >>> 0;
        }
        set certificate_version(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_certificate_version(this.__wbg_ptr, e);
        }
        get certificate_words_per_block() {
            return _.__wbg_get_incrementalunifiedbufferinfo_certificate_words_per_block(this.__wbg_ptr) >>> 0;
        }
        set certificate_words_per_block(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_certificate_words_per_block(this.__wbg_ptr, e);
        }
        get reference_log2_dc() {
            return _.__wbg_get_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr);
        }
        set reference_log2_dc(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr, e);
        }
        get covered_orbit_len() {
            return _.__wbg_get_incrementalunifiedbufferinfo_covered_orbit_len(this.__wbg_ptr) >>> 0;
        }
        set covered_orbit_len(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_covered_orbit_len(this.__wbg_ptr, e);
        }
        get published_orbit_len() {
            return _.__wbg_get_incrementalunifiedbufferinfo_published_orbit_len(this.__wbg_ptr) >>> 0;
        }
        set published_orbit_len(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_published_orbit_len(this.__wbg_ptr, e);
        }
        get reset() {
            return _.__wbg_get_incrementalunifiedbufferinfo_reset(this.__wbg_ptr) >>> 0;
        }
        set reset(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_reset(this.__wbg_ptr, e);
        }
        get has_more() {
            return _.__wbg_get_incrementalunifiedbufferinfo_has_more(this.__wbg_ptr) >>> 0;
        }
        set has_more(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_has_more(this.__wbg_ptr, e);
        }
        get cumulative_merges() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_merges(this.__wbg_ptr) >>> 0;
        }
        set cumulative_merges(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_merges(this.__wbg_ptr, e);
        }
        get cumulative_coefficients() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_coefficients(this.__wbg_ptr) >>> 0;
        }
        set cumulative_coefficients(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_coefficients(this.__wbg_ptr, e);
        }
        get cumulative_envelopes() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelopes(this.__wbg_ptr) >>> 0;
        }
        set cumulative_envelopes(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelopes(this.__wbg_ptr, e);
        }
        get peak_retained_bytes() {
            return _.__wbg_get_incrementalunifiedbufferinfo_peak_retained_bytes(this.__wbg_ptr) >>> 0;
        }
        set peak_retained_bytes(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_peak_retained_bytes(this.__wbg_ptr, e);
        }
        get cumulative_merge_coefficients_ms() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr);
        }
        set cumulative_merge_coefficients_ms(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr, e);
        }
        get cumulative_envelope_ms() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr);
        }
        set cumulative_envelope_ms(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (ie.prototype[Symbol.dispose] = ie.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((n)=>_.__wbg_incrementalunifiedrangeinfo_free(n >>> 0, 1));
    const Ne = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>_.__wbg_jetbufferinfo_free(n >>> 0, 1));
    class re {
        static __wrap(e) {
            e = e >>> 0;
            const i = Object.create(re.prototype);
            return i.__wbg_ptr = e, Ne.register(i, i.__wbg_ptr, i), i;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, Ne.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_jetbufferinfo_free(e, 0);
        }
        get coeffs_ptr() {
            return _.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set coeffs_ptr(e) {
            _.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, e);
        }
        get coeffs_count() {
            return _.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set coeffs_count(e) {
            _.__wbg_set_blabufferinfo_count(this.__wbg_ptr, e);
        }
        get radii_ptr() {
            return _.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set radii_ptr(e) {
            _.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, e);
        }
        get radii_count() {
            return _.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set radii_count(e) {
            _.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, e);
        }
        get levels_ptr() {
            return _.__wbg_get_incrementalunifiedrangeinfo_payload_offset(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(e) {
            _.__wbg_set_blastep_ab_exp(this.__wbg_ptr, e);
        }
        get level_count() {
            return _.__wbg_get_incrementalunifiedrangeinfo_committed_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(e) {
            _.__wbg_set_incrementalunifiedrangeinfo_committed_count(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (re.prototype[Symbol.dispose] = re.prototype.free);
    const Be = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>_.__wbg_mandelbrotnavigator_free(n >>> 0, 1));
    class xe {
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, Be.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_mandelbrotnavigator_free(e, 0);
        }
        get_params() {
            const e = _.mandelbrotnavigator_get_params(this.__wbg_ptr);
            var i = z(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), i;
        }
        use_unified() {
            _.mandelbrotnavigator_use_unified(this.__wbg_ptr);
        }
        find_minibrot(e, i) {
            const r = _.mandelbrotnavigator_find_minibrot(this.__wbg_ptr, e, i);
            var a = z(r[0], r[1]).slice();
            return _.__wbindgen_free(r[0], r[1] * 4, 4), a;
        }
        rotate_direct(e) {
            _.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, e);
        }
        view_floatexp() {
            const e = _.mandelbrotnavigator_view_floatexp(this.__wbg_ptr);
            var i = Ee(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 8, 8), i;
        }
        benchmark_pade(e) {
            const i = _.mandelbrotnavigator_benchmark_pade(this.__wbg_ptr, e);
            return ae.__wrap(i);
        }
        get_bla_epsilon() {
            return _.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr);
        }
        set_bla_epsilon(e) {
            _.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr, e);
        }
        step_with_input(e, i, r, a, s, o) {
            const b = _.mandelbrotnavigator_step_with_input(this.__wbg_ptr, e, i, r, a, !y(s), y(s) ? 0 : s, !y(o), y(o) ? 0 : o);
            var l = z(b[0], b[1]).slice();
            return _.__wbindgen_free(b[0], b[1] * 4, 4), l;
        }
        unified_is_cold(e) {
            return _.mandelbrotnavigator_unified_is_cold(this.__wbg_ptr, e) !== 0;
        }
        get_max_bla_skip() {
            return _.mandelbrotnavigator_get_max_bla_skip(this.__wbg_ptr) >>> 0;
        }
        is_in_transition() {
            return _.mandelbrotnavigator_is_in_transition(this.__wbg_ptr) !== 0;
        }
        pixel_to_complex(e, i, r, a) {
            const s = _.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr, e, i, r, a);
            var o = z(s[0], s[1]).slice();
            return _.__wbindgen_free(s[0], s[1] * 4, 4), o;
        }
        reference_origin(e, i) {
            const r = h(e, _.__wbindgen_malloc, _.__wbindgen_realloc), a = p, s = h(i, _.__wbindgen_malloc, _.__wbindgen_realloc), o = p;
            _.mandelbrotnavigator_reference_origin(this.__wbg_ptr, r, a, s, o);
        }
        reset_step_clock() {
            _.mandelbrotnavigator_reset_step_clock(this.__wbg_ptr);
        }
        set_max_bla_skip(e) {
            _.mandelbrotnavigator_set_max_bla_skip(this.__wbg_ptr, e);
        }
        start_transition(e, i, r, a, s) {
            const o = h(e, _.__wbindgen_malloc, _.__wbindgen_realloc), b = p, l = h(i, _.__wbindgen_malloc, _.__wbindgen_realloc), g = p, d = h(r, _.__wbindgen_malloc, _.__wbindgen_realloc), u = p;
            _.mandelbrotnavigator_start_transition(this.__wbg_ptr, o, b, l, g, d, u, a, s);
        }
        translate_direct(e, i, r, a) {
            _.mandelbrotnavigator_translate_direct(this.__wbg_ptr, e, i, !y(r), y(r) ? 0 : r, !y(a), y(a) ? 0 : a);
        }
        use_mobius_cplus() {
            _.mandelbrotnavigator_use_mobius_cplus(this.__wbg_ptr);
        }
        use_perturbation() {
            _.mandelbrotnavigator_use_perturbation(this.__wbg_ptr);
        }
        cancel_transition() {
            _.mandelbrotnavigator_cancel_transition(this.__wbg_ptr);
        }
        get_gate_emission() {
            return _.mandelbrotnavigator_get_gate_emission(this.__wbg_ptr) !== 0;
        }
        set_gate_emission(e) {
            _.mandelbrotnavigator_set_gate_emission(this.__wbg_ptr, e);
        }
        current_log2_c_max() {
            return _.mandelbrotnavigator_current_log2_c_max(this.__wbg_ptr);
        }
        unified_last_sa_n0() {
            return _.mandelbrotnavigator_unified_last_sa_n0(this.__wbg_ptr) >>> 0;
        }
        coordinate_to_pixel(e, i, r, a) {
            const s = h(e, _.__wbindgen_malloc, _.__wbindgen_realloc), o = p, b = h(i, _.__wbindgen_malloc, _.__wbindgen_realloc), l = p, g = _.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr, s, o, b, l, r, a);
            var d = Ee(g[0], g[1]).slice();
            return _.__wbindgen_free(g[0], g[1] * 8, 8), d;
        }
        set_viewport_aspect(e) {
            _.mandelbrotnavigator_set_viewport_aspect(this.__wbg_ptr, e);
        }
        unified_last_stages() {
            return _.mandelbrotnavigator_unified_last_stages(this.__wbg_ptr) >>> 0;
        }
        find_minibrot_framed(e, i, r) {
            const a = _.mandelbrotnavigator_find_minibrot_framed(this.__wbg_ptr, e, i, r);
            var s = z(a[0], a[1]).slice();
            return _.__wbindgen_free(a[0], a[1] * 4, 4), s;
        }
        get_reference_params() {
            const e = _.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);
            var i = z(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), i;
        }
        set_precision_budget(e) {
            const i = h(e, _.__wbindgen_malloc, _.__wbindgen_realloc), r = p;
            _.mandelbrotnavigator_set_precision_budget(this.__wbg_ptr, i, r);
        }
        compute_jet_reference(e) {
            const i = _.mandelbrotnavigator_compute_jet_reference(this.__wbg_ptr, e);
            return re.__wrap(i);
        }
        compute_unified_header(e) {
            const i = _.mandelbrotnavigator_compute_unified_header(this.__wbg_ptr, e);
            return O.__wrap(i);
        }
        get_approximation_mode() {
            return _.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr);
        }
        unified_last_band_log2() {
            return _.mandelbrotnavigator_unified_last_band_log2(this.__wbg_ptr);
        }
        begin_unified_reference(e) {
            _.mandelbrotnavigator_begin_unified_reference(this.__wbg_ptr, e);
        }
        get_reference_orbit_len() {
            return _.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        start_export_transition(e, i, r, a, s) {
            const o = h(e, _.__wbindgen_malloc, _.__wbindgen_realloc), b = p, l = h(i, _.__wbindgen_malloc, _.__wbindgen_realloc), g = p, d = h(r, _.__wbindgen_malloc, _.__wbindgen_realloc), u = p;
            _.mandelbrotnavigator_start_export_transition(this.__wbg_ptr, o, b, l, g, d, u, a, s);
        }
        step_at_transition_time(e, i, r) {
            const a = _.mandelbrotnavigator_step_at_transition_time(this.__wbg_ptr, !y(e), y(e) ? 0 : e, !y(i), y(i) ? 0 : i, r);
            var s = z(a[0], a[1]).slice();
            return _.__wbindgen_free(a[0], a[1] * 4, 4), s;
        }
        unified_last_gate_count() {
            return _.mandelbrotnavigator_unified_last_gate_count(this.__wbg_ptr) >>> 0;
        }
        unified_last_periodic_p() {
            return _.mandelbrotnavigator_unified_last_periodic_p(this.__wbg_ptr) >>> 0;
        }
        compute_mobius_reference(e) {
            const i = _.mandelbrotnavigator_compute_mobius_reference(this.__wbg_ptr, e);
            return oe.__wrap(i);
        }
        finish_unified_reference(e) {
            const i = _.mandelbrotnavigator_finish_unified_reference(this.__wbg_ptr, e);
            return O.__wrap(i);
        }
        unified_last_band_spread() {
            return _.mandelbrotnavigator_unified_last_band_spread(this.__wbg_ptr);
        }
        compute_bla_reference_ptr(e) {
            const i = _.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr, e);
            return ne.__wrap(i);
        }
        compute_unified_reference(e) {
            const i = _.mandelbrotnavigator_compute_unified_reference(this.__wbg_ptr, e);
            return O.__wrap(i);
        }
        get_dynamic_block_validity() {
            return _.mandelbrotnavigator_get_dynamic_block_validity(this.__wbg_ptr) !== 0;
        }
        set_dynamic_block_validity(e) {
            _.mandelbrotnavigator_set_dynamic_block_validity(this.__wbg_ptr, e);
        }
        compute_reference_orbit_ptr(e) {
            const i = _.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, e);
            return K.__wrap(i);
        }
        get_reference_orbit_capacity() {
            return _.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        unified_last_periodic_status() {
            return _.mandelbrotnavigator_unified_last_periodic_status(this.__wbg_ptr) >>> 0;
        }
        compute_reference_orbit_chunk(e, i) {
            const r = _.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, e, i);
            return K.__wrap(r);
        }
        get_incremental_reference_table() {
            return _.mandelbrotnavigator_get_incremental_reference_table(this.__wbg_ptr) !== 0;
        }
        set_incremental_reference_table(e) {
            _.mandelbrotnavigator_set_incremental_reference_table(this.__wbg_ptr, e);
        }
        unified_last_periodic_detected_p() {
            return _.mandelbrotnavigator_unified_last_periodic_detected_p(this.__wbg_ptr) >>> 0;
        }
        continue_unified_reference_bounds(e) {
            _.mandelbrotnavigator_continue_unified_reference_bounds(this.__wbg_ptr, e);
        }
        advance_incremental_unified_reference(e, i, r) {
            const a = _.mandelbrotnavigator_advance_incremental_unified_reference(this.__wbg_ptr, e, i, r);
            return ie.__wrap(a);
        }
        constructor(e, i, r, a){
            const s = h(e, _.__wbindgen_malloc, _.__wbindgen_realloc), o = p, b = h(i, _.__wbindgen_malloc, _.__wbindgen_realloc), l = p, g = h(r, _.__wbindgen_malloc, _.__wbindgen_realloc), d = p, u = _.mandelbrotnavigator_new(s, o, b, l, g, d, a);
            return this.__wbg_ptr = u >>> 0, Be.register(this, this.__wbg_ptr, this), this;
        }
        step(e, i) {
            const r = _.mandelbrotnavigator_step(this.__wbg_ptr, !y(e), y(e) ? 0 : e, !y(i), y(i) ? 0 : i);
            var a = z(r[0], r[1]).slice();
            return _.__wbindgen_free(r[0], r[1] * 4, 4), a;
        }
        zoom(e) {
            _.mandelbrotnavigator_zoom(this.__wbg_ptr, e);
        }
        angle(e) {
            _.mandelbrotnavigator_angle(this.__wbg_ptr, e);
        }
        scale(e) {
            const i = h(e, _.__wbindgen_malloc, _.__wbindgen_realloc), r = p;
            _.mandelbrotnavigator_scale(this.__wbg_ptr, i, r);
        }
        origin(e, i) {
            const r = h(e, _.__wbindgen_malloc, _.__wbindgen_realloc), a = p, s = h(i, _.__wbindgen_malloc, _.__wbindgen_realloc), o = p;
            _.mandelbrotnavigator_origin(this.__wbg_ptr, r, a, s, o);
        }
        rotate(e) {
            _.mandelbrotnavigator_rotate(this.__wbg_ptr, e);
        }
        use_bla() {
            _.mandelbrotnavigator_use_bla(this.__wbg_ptr);
        }
        use_jet() {
            _.mandelbrotnavigator_use_jet(this.__wbg_ptr);
        }
        use_pade() {
            _.mandelbrotnavigator_use_pade(this.__wbg_ptr);
        }
        translate(e, i) {
            _.mandelbrotnavigator_translate(this.__wbg_ptr, e, i);
        }
    }
    Symbol.dispose && (xe.prototype[Symbol.dispose] = xe.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((n)=>_.__wbg_mandelbrotstep_free(n >>> 0, 1));
    const De = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>_.__wbg_mobiusbufferinfo_free(n >>> 0, 1));
    class oe {
        static __wrap(e) {
            e = e >>> 0;
            const i = Object.create(oe.prototype);
            return i.__wbg_ptr = e, De.register(i, i.__wbg_ptr, i), i;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, De.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_mobiusbufferinfo_free(e, 0);
        }
        get coeffs_ptr() {
            return _.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set coeffs_ptr(e) {
            _.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, e);
        }
        get coeffs_count() {
            return _.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set coeffs_count(e) {
            _.__wbg_set_blabufferinfo_count(this.__wbg_ptr, e);
        }
        get radii_ptr() {
            return _.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set radii_ptr(e) {
            _.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, e);
        }
        get radii_count() {
            return _.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set radii_count(e) {
            _.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, e);
        }
        get levels_ptr() {
            return _.__wbg_get_incrementalunifiedrangeinfo_payload_offset(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(e) {
            _.__wbg_set_blastep_ab_exp(this.__wbg_ptr, e);
        }
        get level_count() {
            return _.__wbg_get_incrementalunifiedrangeinfo_committed_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(e) {
            _.__wbg_set_incrementalunifiedrangeinfo_committed_count(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (oe.prototype[Symbol.dispose] = oe.prototype.free);
    const Oe = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>_.__wbg_orbitbufferinfo_free(n >>> 0, 1));
    class K {
        static __wrap(e) {
            e = e >>> 0;
            const i = Object.create(K.prototype);
            return i.__wbg_ptr = e, Oe.register(i, i.__wbg_ptr, i), i;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, Oe.unregister(this), e;
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
    Symbol.dispose && (K.prototype[Symbol.dispose] = K.prototype.free);
    const Le = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>_.__wbg_padebenchmark_free(n >>> 0, 1));
    class ae {
        static __wrap(e) {
            e = e >>> 0;
            const i = Object.create(ae.prototype);
            return i.__wbg_ptr = e, Le.register(i, i.__wbg_ptr, i), i;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, Le.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_padebenchmark_free(e, 0);
        }
        get pixels() {
            return _.__wbg_get_incrementalunifiedbufferinfo_ranges_ptr(this.__wbg_ptr) >>> 0;
        }
        set pixels(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_ranges_ptr(this.__wbg_ptr, e);
        }
        get max_iter() {
            return _.__wbg_get_incrementalunifiedbufferinfo_range_count(this.__wbg_ptr) >>> 0;
        }
        set max_iter(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_range_count(this.__wbg_ptr, e);
        }
        get steps_exact() {
            return _.__wbg_get_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr);
        }
        set steps_exact(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr, e);
        }
        get steps_affine() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr);
        }
        set steps_affine(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr, e);
        }
        get steps_pade() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr);
        }
        set steps_pade(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr, e);
        }
        get pade_mismatches() {
            return _.__wbg_get_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr) >>> 0;
        }
        set pade_mismatches(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr, e);
        }
        get max_iter_delta() {
            return _.__wbg_get_incrementalunifiedbufferinfo_coeffs_count(this.__wbg_ptr) >>> 0;
        }
        set max_iter_delta(e) {
            _.__wbg_set_blastep_d_exp(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (ae.prototype[Symbol.dispose] = ae.prototype.free);
    const Ue = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((n)=>_.__wbg_unifiedbufferinfo_free(n >>> 0, 1));
    class O {
        static __wrap(e) {
            e = e >>> 0;
            const i = Object.create(O.prototype);
            return i.__wbg_ptr = e, Ue.register(i, i.__wbg_ptr, i), i;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, Ue.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_unifiedbufferinfo_free(e, 0);
        }
        get coeffs_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr) >>> 0;
        }
        set coeffs_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr, e);
        }
        get coeffs_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_coeffs_count(this.__wbg_ptr) >>> 0;
        }
        set coeffs_count(e) {
            _.__wbg_set_blastep_d_exp(this.__wbg_ptr, e);
        }
        get radii_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_radii_ptr(this.__wbg_ptr) >>> 0;
        }
        set radii_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_radii_ptr(this.__wbg_ptr, e);
        }
        get radii_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_radii_count(this.__wbg_ptr) >>> 0;
        }
        set radii_count(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_radii_count(this.__wbg_ptr, e);
        }
        get levels_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_certificates_ptr(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_certificates_ptr(this.__wbg_ptr, e);
        }
        get level_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_certificates_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_certificates_count(this.__wbg_ptr, e);
        }
        get optional_headers_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_certificate_version(this.__wbg_ptr) >>> 0;
        }
        set optional_headers_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_certificate_version(this.__wbg_ptr, e);
        }
        get optional_headers_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_certificate_words_per_block(this.__wbg_ptr) >>> 0;
        }
        set optional_headers_count(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_certificate_words_per_block(this.__wbg_ptr, e);
        }
        get optional_headers_version() {
            return _.__wbg_get_incrementalunifiedbufferinfo_covered_orbit_len(this.__wbg_ptr) >>> 0;
        }
        set optional_headers_version(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_covered_orbit_len(this.__wbg_ptr, e);
        }
        get optional_sa_log2_dc() {
            return _.__wbg_get_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr);
        }
        set optional_sa_log2_dc(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr, e);
        }
        get optional_periodic_log2_dc() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr);
        }
        set optional_periodic_log2_dc(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr, e);
        }
        get optional_gate_log2_dc() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr);
        }
        set optional_gate_log2_dc(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr, e);
        }
        get validity_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_published_orbit_len(this.__wbg_ptr) >>> 0;
        }
        set validity_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_published_orbit_len(this.__wbg_ptr, e);
        }
        get validity_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_reset(this.__wbg_ptr) >>> 0;
        }
        set validity_count(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_reset(this.__wbg_ptr, e);
        }
        get validity_diagnostics_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_has_more(this.__wbg_ptr) >>> 0;
        }
        set validity_diagnostics_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_has_more(this.__wbg_ptr, e);
        }
        get validity_diagnostics_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_merges(this.__wbg_ptr) >>> 0;
        }
        set validity_diagnostics_count(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_merges(this.__wbg_ptr, e);
        }
        get validity_diagnostics_words_per_block() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_coefficients(this.__wbg_ptr) >>> 0;
        }
        set validity_diagnostics_words_per_block(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_coefficients(this.__wbg_ptr, e);
        }
        get validity_levels_ptr() {
            return _.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelopes(this.__wbg_ptr) >>> 0;
        }
        set validity_levels_ptr(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelopes(this.__wbg_ptr, e);
        }
        get validity_level_count() {
            return _.__wbg_get_incrementalunifiedbufferinfo_peak_retained_bytes(this.__wbg_ptr) >>> 0;
        }
        set validity_level_count(e) {
            _.__wbg_set_incrementalunifiedbufferinfo_peak_retained_bytes(this.__wbg_ptr, e);
        }
        get validity_version() {
            return _.__wbg_get_unifiedbufferinfo_validity_version(this.__wbg_ptr) >>> 0;
        }
        set validity_version(e) {
            _.__wbg_set_unifiedbufferinfo_validity_version(this.__wbg_ptr, e);
        }
        get validity_words_per_block() {
            return _.__wbg_get_unifiedbufferinfo_validity_words_per_block(this.__wbg_ptr) >>> 0;
        }
        set validity_words_per_block(e) {
            _.__wbg_set_unifiedbufferinfo_validity_words_per_block(this.__wbg_ptr, e);
        }
        get validity_reference_log2_dc() {
            return _.__wbg_get_unifiedbufferinfo_validity_reference_log2_dc(this.__wbg_ptr);
        }
        set validity_reference_log2_dc(e) {
            _.__wbg_set_unifiedbufferinfo_validity_reference_log2_dc(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (O.prototype[Symbol.dispose] = O.prototype.free);
    function o_(n) {
        return Math.exp(n);
    }
    function a_(n) {
        return Math.log(n);
    }
    function f_() {
        return Date.now();
    }
    function s_(n, e) {
        throw new Error(Ve(n, e));
    }
    function b_(n, e) {
        return Ve(n, e);
    }
    function c_() {
        const n = _.__wbindgen_export_0, e = n.grow(4);
        n.set(0, void 0), n.set(e + 0, void 0), n.set(e + 1, null), n.set(e + 2, !0), n.set(e + 3, !1);
    }
    URL = globalThis.URL;
    const t = await e_({
        "./mandelbrot_bg.js": {
            __wbg_now_1e80617bcee43265: f_,
            __wbg_exp_9293ded1248e1bd3: o_,
            __wbg_log_5f75e13a39ba07fe: a_,
            __wbg_wbindgenthrow_451ec1a8469d7eb6: s_,
            __wbindgen_init_externref_table: c_,
            __wbindgen_cast_2241b6af4c4b2941: b_
        }
    }, qe), x = t.memory, l_ = t.__wbg_blabufferinfo_free, g_ = t.__wbg_blalevel_free, u_ = t.__wbg_blastep_free, d_ = t.__wbg_get_blabufferinfo_count, p_ = t.__wbg_get_blabufferinfo_level_count, w_ = t.__wbg_get_blabufferinfo_levels_ptr, m_ = t.__wbg_get_blabufferinfo_ptr, v_ = t.__wbg_get_blastep_ab_exp, h_ = t.__wbg_get_blastep_alpha_exp, y_ = t.__wbg_get_blastep_ax, k_ = t.__wbg_get_blastep_ay, x_ = t.__wbg_get_blastep_bx, R_ = t.__wbg_get_blastep_by, F_ = t.__wbg_get_blastep_d_exp, S_ = t.__wbg_get_blastep_dx, A_ = t.__wbg_get_blastep_dy, I_ = t.__wbg_get_blastep_log2_min_a, j_ = t.__wbg_get_blastep_radius_alpha, M_ = t.__wbg_get_blastep_radius_beta, C_ = t.__wbg_get_incrementalunifiedbufferinfo_certificate_version, E_ = t.__wbg_get_incrementalunifiedbufferinfo_certificate_words_per_block, T_ = t.__wbg_get_incrementalunifiedbufferinfo_certificates_count, z_ = t.__wbg_get_incrementalunifiedbufferinfo_certificates_ptr, N_ = t.__wbg_get_incrementalunifiedbufferinfo_coeffs_count, B_ = t.__wbg_get_incrementalunifiedbufferinfo_coeffs_ptr, D_ = t.__wbg_get_incrementalunifiedbufferinfo_covered_orbit_len, O_ = t.__wbg_get_incrementalunifiedbufferinfo_cumulative_coefficients, L_ = t.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms, U_ = t.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelopes, $_ = t.__wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms, P_ = t.__wbg_get_incrementalunifiedbufferinfo_cumulative_merges, W_ = t.__wbg_get_incrementalunifiedbufferinfo_has_more, G_ = t.__wbg_get_incrementalunifiedbufferinfo_peak_retained_bytes, V_ = t.__wbg_get_incrementalunifiedbufferinfo_published_orbit_len, H_ = t.__wbg_get_incrementalunifiedbufferinfo_radii_count, J_ = t.__wbg_get_incrementalunifiedbufferinfo_radii_ptr, K_ = t.__wbg_get_incrementalunifiedbufferinfo_range_count, Y_ = t.__wbg_get_incrementalunifiedbufferinfo_ranges_ptr, Q_ = t.__wbg_get_incrementalunifiedbufferinfo_reference_log2_dc, X_ = t.__wbg_get_incrementalunifiedbufferinfo_reset, Z_ = t.__wbg_get_incrementalunifiedrangeinfo_committed_count, q_ = t.__wbg_get_incrementalunifiedrangeinfo_payload_offset, et = t.__wbg_get_unifiedbufferinfo_validity_reference_log2_dc, _t = t.__wbg_get_unifiedbufferinfo_validity_version, tt = t.__wbg_get_unifiedbufferinfo_validity_words_per_block, nt = t.__wbg_incrementalunifiedbufferinfo_free, it = t.__wbg_incrementalunifiedrangeinfo_free, rt = t.__wbg_jetbufferinfo_free, ot = t.__wbg_mandelbrotnavigator_free, at = t.__wbg_mandelbrotstep_free, ft = t.__wbg_mobiusbufferinfo_free, st = t.__wbg_orbitbufferinfo_free, bt = t.__wbg_padebenchmark_free, ct = t.__wbg_set_blabufferinfo_count, lt = t.__wbg_set_blabufferinfo_level_count, gt = t.__wbg_set_blabufferinfo_levels_ptr, ut = t.__wbg_set_blabufferinfo_ptr, dt = t.__wbg_set_blastep_ab_exp, pt = t.__wbg_set_blastep_alpha_exp, wt = t.__wbg_set_blastep_ax, mt = t.__wbg_set_blastep_ay, vt = t.__wbg_set_blastep_bx, ht = t.__wbg_set_blastep_by, yt = t.__wbg_set_blastep_d_exp, kt = t.__wbg_set_blastep_dx, xt = t.__wbg_set_blastep_dy, Rt = t.__wbg_set_blastep_log2_min_a, Ft = t.__wbg_set_blastep_radius_alpha, St = t.__wbg_set_blastep_radius_beta, At = t.__wbg_set_incrementalunifiedbufferinfo_certificate_version, It = t.__wbg_set_incrementalunifiedbufferinfo_certificate_words_per_block, jt = t.__wbg_set_incrementalunifiedbufferinfo_certificates_count, Mt = t.__wbg_set_incrementalunifiedbufferinfo_certificates_ptr, Ct = t.__wbg_set_incrementalunifiedbufferinfo_coeffs_ptr, Et = t.__wbg_set_incrementalunifiedbufferinfo_covered_orbit_len, Tt = t.__wbg_set_incrementalunifiedbufferinfo_cumulative_coefficients, zt = t.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms, Nt = t.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelopes, Bt = t.__wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms, Dt = t.__wbg_set_incrementalunifiedbufferinfo_cumulative_merges, Ot = t.__wbg_set_incrementalunifiedbufferinfo_has_more, Lt = t.__wbg_set_incrementalunifiedbufferinfo_peak_retained_bytes, Ut = t.__wbg_set_incrementalunifiedbufferinfo_published_orbit_len, $t = t.__wbg_set_incrementalunifiedbufferinfo_radii_count, Pt = t.__wbg_set_incrementalunifiedbufferinfo_radii_ptr, Wt = t.__wbg_set_incrementalunifiedbufferinfo_range_count, Gt = t.__wbg_set_incrementalunifiedbufferinfo_ranges_ptr, Vt = t.__wbg_set_incrementalunifiedbufferinfo_reference_log2_dc, Ht = t.__wbg_set_incrementalunifiedbufferinfo_reset, Jt = t.__wbg_set_incrementalunifiedrangeinfo_committed_count, Kt = t.__wbg_set_unifiedbufferinfo_validity_reference_log2_dc, Yt = t.__wbg_set_unifiedbufferinfo_validity_version, Qt = t.__wbg_set_unifiedbufferinfo_validity_words_per_block, Xt = t.__wbg_unifiedbufferinfo_free, Zt = t.mandelbrotnavigator_advance_incremental_unified_reference, qt = t.mandelbrotnavigator_angle, en = t.mandelbrotnavigator_begin_unified_reference, _n = t.mandelbrotnavigator_benchmark_pade, tn = t.mandelbrotnavigator_cancel_transition, nn = t.mandelbrotnavigator_compute_bla_reference_ptr, rn = t.mandelbrotnavigator_compute_jet_reference, on = t.mandelbrotnavigator_compute_mobius_reference, an = t.mandelbrotnavigator_compute_reference_orbit_chunk, fn = t.mandelbrotnavigator_compute_reference_orbit_ptr, sn = t.mandelbrotnavigator_compute_unified_header, bn = t.mandelbrotnavigator_compute_unified_reference, cn = t.mandelbrotnavigator_continue_unified_reference_bounds, ln = t.mandelbrotnavigator_coordinate_to_pixel, gn = t.mandelbrotnavigator_current_log2_c_max, un = t.mandelbrotnavigator_find_minibrot, dn = t.mandelbrotnavigator_find_minibrot_framed, pn = t.mandelbrotnavigator_finish_unified_reference, wn = t.mandelbrotnavigator_get_approximation_mode, mn = t.mandelbrotnavigator_get_bla_epsilon, vn = t.mandelbrotnavigator_get_dynamic_block_validity, hn = t.mandelbrotnavigator_get_gate_emission, yn = t.mandelbrotnavigator_get_incremental_reference_table, kn = t.mandelbrotnavigator_get_max_bla_skip, xn = t.mandelbrotnavigator_get_params, Rn = t.mandelbrotnavigator_get_reference_orbit_capacity, Fn = t.mandelbrotnavigator_get_reference_orbit_len, Sn = t.mandelbrotnavigator_get_reference_params, An = t.mandelbrotnavigator_is_in_transition, In = t.mandelbrotnavigator_new, jn = t.mandelbrotnavigator_origin, Mn = t.mandelbrotnavigator_pixel_to_complex, Cn = t.mandelbrotnavigator_reference_origin, En = t.mandelbrotnavigator_reset_step_clock, Tn = t.mandelbrotnavigator_rotate, zn = t.mandelbrotnavigator_rotate_direct, Nn = t.mandelbrotnavigator_scale, Bn = t.mandelbrotnavigator_set_bla_epsilon, Dn = t.mandelbrotnavigator_set_dynamic_block_validity, On = t.mandelbrotnavigator_set_gate_emission, Ln = t.mandelbrotnavigator_set_incremental_reference_table, Un = t.mandelbrotnavigator_set_max_bla_skip, $n = t.mandelbrotnavigator_set_precision_budget, Pn = t.mandelbrotnavigator_set_viewport_aspect, Wn = t.mandelbrotnavigator_start_export_transition, Gn = t.mandelbrotnavigator_start_transition, Vn = t.mandelbrotnavigator_step, Hn = t.mandelbrotnavigator_step_at_transition_time, Jn = t.mandelbrotnavigator_step_with_input, Kn = t.mandelbrotnavigator_translate, Yn = t.mandelbrotnavigator_translate_direct, Qn = t.mandelbrotnavigator_unified_is_cold, Xn = t.mandelbrotnavigator_unified_last_band_log2, Zn = t.mandelbrotnavigator_unified_last_band_spread, qn = t.mandelbrotnavigator_unified_last_gate_count, ei = t.mandelbrotnavigator_unified_last_periodic_detected_p, _i = t.mandelbrotnavigator_unified_last_periodic_p, ti = t.mandelbrotnavigator_unified_last_periodic_status, ni = t.mandelbrotnavigator_unified_last_sa_n0, ii = t.mandelbrotnavigator_unified_last_stages, ri = t.mandelbrotnavigator_use_bla, oi = t.mandelbrotnavigator_use_jet, ai = t.mandelbrotnavigator_use_mobius_cplus, fi = t.mandelbrotnavigator_use_pade, si = t.mandelbrotnavigator_use_perturbation, bi = t.mandelbrotnavigator_use_unified, ci = t.mandelbrotnavigator_view_floatexp, li = t.mandelbrotnavigator_zoom, gi = t.__wbg_set_blalevel_count, ui = t.__wbg_set_blalevel_max_radius_bits, di = t.__wbg_set_blalevel_offset, pi = t.__wbg_set_blalevel_skip, wi = t.__wbg_set_incrementalunifiedbufferinfo_coeffs_count, mi = t.__wbg_set_incrementalunifiedrangeinfo_level, vi = t.__wbg_set_incrementalunifiedrangeinfo_payload_offset, hi = t.__wbg_set_incrementalunifiedrangeinfo_skip, yi = t.__wbg_set_incrementalunifiedrangeinfo_slot_count, ki = t.__wbg_set_incrementalunifiedrangeinfo_slot_start, xi = t.__wbg_set_jetbufferinfo_coeffs_count, Ri = t.__wbg_set_jetbufferinfo_coeffs_ptr, Fi = t.__wbg_set_jetbufferinfo_level_count, Si = t.__wbg_set_jetbufferinfo_levels_ptr, Ai = t.__wbg_set_jetbufferinfo_radii_count, Ii = t.__wbg_set_jetbufferinfo_radii_ptr, ji = t.__wbg_set_mandelbrotstep_pad0, Mi = t.__wbg_set_mandelbrotstep_pad1, Ci = t.__wbg_set_mandelbrotstep_zx, Ei = t.__wbg_set_mandelbrotstep_zy, Ti = t.__wbg_set_mobiusbufferinfo_coeffs_count, zi = t.__wbg_set_mobiusbufferinfo_coeffs_ptr, Ni = t.__wbg_set_mobiusbufferinfo_level_count, Bi = t.__wbg_set_mobiusbufferinfo_levels_ptr, Di = t.__wbg_set_mobiusbufferinfo_radii_count, Oi = t.__wbg_set_mobiusbufferinfo_radii_ptr, Li = t.__wbg_set_orbitbufferinfo_count, Ui = t.__wbg_set_orbitbufferinfo_offset, $i = t.__wbg_set_orbitbufferinfo_ptr, Pi = t.__wbg_set_padebenchmark_max_iter, Wi = t.__wbg_set_padebenchmark_max_iter_delta, Gi = t.__wbg_set_padebenchmark_pade_mismatches, Vi = t.__wbg_set_padebenchmark_pixels, Hi = t.__wbg_set_padebenchmark_steps_affine, Ji = t.__wbg_set_padebenchmark_steps_exact, Ki = t.__wbg_set_padebenchmark_steps_pade, Yi = t.__wbg_set_unifiedbufferinfo_coeffs_count, Qi = t.__wbg_set_unifiedbufferinfo_coeffs_ptr, Xi = t.__wbg_set_unifiedbufferinfo_level_count, Zi = t.__wbg_set_unifiedbufferinfo_levels_ptr, qi = t.__wbg_set_unifiedbufferinfo_optional_gate_log2_dc, er = t.__wbg_set_unifiedbufferinfo_optional_headers_count, _r = t.__wbg_set_unifiedbufferinfo_optional_headers_ptr, tr = t.__wbg_set_unifiedbufferinfo_optional_headers_version, nr = t.__wbg_set_unifiedbufferinfo_optional_periodic_log2_dc, ir = t.__wbg_set_unifiedbufferinfo_optional_sa_log2_dc, rr = t.__wbg_set_unifiedbufferinfo_radii_count, or = t.__wbg_set_unifiedbufferinfo_radii_ptr, ar = t.__wbg_set_unifiedbufferinfo_validity_count, fr = t.__wbg_set_unifiedbufferinfo_validity_diagnostics_count, sr = t.__wbg_set_unifiedbufferinfo_validity_diagnostics_ptr, br = t.__wbg_set_unifiedbufferinfo_validity_diagnostics_words_per_block, cr = t.__wbg_set_unifiedbufferinfo_validity_level_count, lr = t.__wbg_set_unifiedbufferinfo_validity_levels_ptr, gr = t.__wbg_set_unifiedbufferinfo_validity_ptr, ur = t.__wbg_get_blalevel_count, dr = t.__wbg_get_blalevel_max_radius_bits, pr = t.__wbg_get_blalevel_offset, wr = t.__wbg_get_blalevel_skip, mr = t.__wbg_get_incrementalunifiedrangeinfo_level, vr = t.__wbg_get_incrementalunifiedrangeinfo_skip, hr = t.__wbg_get_incrementalunifiedrangeinfo_slot_count, yr = t.__wbg_get_incrementalunifiedrangeinfo_slot_start, kr = t.__wbg_get_jetbufferinfo_coeffs_count, xr = t.__wbg_get_jetbufferinfo_coeffs_ptr, Rr = t.__wbg_get_jetbufferinfo_level_count, Fr = t.__wbg_get_jetbufferinfo_levels_ptr, Sr = t.__wbg_get_jetbufferinfo_radii_count, Ar = t.__wbg_get_jetbufferinfo_radii_ptr, Ir = t.__wbg_get_mobiusbufferinfo_coeffs_count, jr = t.__wbg_get_mobiusbufferinfo_coeffs_ptr, Mr = t.__wbg_get_mobiusbufferinfo_level_count, Cr = t.__wbg_get_mobiusbufferinfo_levels_ptr, Er = t.__wbg_get_mobiusbufferinfo_radii_count, Tr = t.__wbg_get_mobiusbufferinfo_radii_ptr, zr = t.__wbg_get_orbitbufferinfo_count, Nr = t.__wbg_get_orbitbufferinfo_offset, Br = t.__wbg_get_orbitbufferinfo_ptr, Dr = t.__wbg_get_padebenchmark_max_iter, Or = t.__wbg_get_padebenchmark_max_iter_delta, Lr = t.__wbg_get_padebenchmark_pade_mismatches, Ur = t.__wbg_get_padebenchmark_pixels, $r = t.__wbg_get_unifiedbufferinfo_coeffs_count, Pr = t.__wbg_get_unifiedbufferinfo_coeffs_ptr, Wr = t.__wbg_get_unifiedbufferinfo_level_count, Gr = t.__wbg_get_unifiedbufferinfo_levels_ptr, Vr = t.__wbg_get_unifiedbufferinfo_optional_headers_count, Hr = t.__wbg_get_unifiedbufferinfo_optional_headers_ptr, Jr = t.__wbg_get_unifiedbufferinfo_optional_headers_version, Kr = t.__wbg_get_unifiedbufferinfo_radii_count, Yr = t.__wbg_get_unifiedbufferinfo_radii_ptr, Qr = t.__wbg_get_unifiedbufferinfo_validity_count, Xr = t.__wbg_get_unifiedbufferinfo_validity_diagnostics_count, Zr = t.__wbg_get_unifiedbufferinfo_validity_diagnostics_ptr, qr = t.__wbg_get_unifiedbufferinfo_validity_diagnostics_words_per_block, eo = t.__wbg_get_unifiedbufferinfo_validity_level_count, _o = t.__wbg_get_unifiedbufferinfo_validity_levels_ptr, to = t.__wbg_get_unifiedbufferinfo_validity_ptr, no = t.__wbg_get_mandelbrotstep_pad0, io = t.__wbg_get_mandelbrotstep_pad1, ro = t.__wbg_get_mandelbrotstep_zx, oo = t.__wbg_get_mandelbrotstep_zy, ao = t.__wbg_get_padebenchmark_steps_affine, fo = t.__wbg_get_padebenchmark_steps_exact, so = t.__wbg_get_padebenchmark_steps_pade, bo = t.__wbg_get_unifiedbufferinfo_optional_gate_log2_dc, co = t.__wbg_get_unifiedbufferinfo_optional_periodic_log2_dc, lo = t.__wbg_get_unifiedbufferinfo_optional_sa_log2_dc, go = t.__wbindgen_export_0, uo = t.__externref_drop_slice, po = t.__wbindgen_free, wo = t.__wbindgen_malloc, mo = t.__wbindgen_realloc, He = t.__wbindgen_start;
    var vo = Object.freeze({
        __proto__: null,
        __externref_drop_slice: uo,
        __wbg_blabufferinfo_free: l_,
        __wbg_blalevel_free: g_,
        __wbg_blastep_free: u_,
        __wbg_get_blabufferinfo_count: d_,
        __wbg_get_blabufferinfo_level_count: p_,
        __wbg_get_blabufferinfo_levels_ptr: w_,
        __wbg_get_blabufferinfo_ptr: m_,
        __wbg_get_blalevel_count: ur,
        __wbg_get_blalevel_max_radius_bits: dr,
        __wbg_get_blalevel_offset: pr,
        __wbg_get_blalevel_skip: wr,
        __wbg_get_blastep_ab_exp: v_,
        __wbg_get_blastep_alpha_exp: h_,
        __wbg_get_blastep_ax: y_,
        __wbg_get_blastep_ay: k_,
        __wbg_get_blastep_bx: x_,
        __wbg_get_blastep_by: R_,
        __wbg_get_blastep_d_exp: F_,
        __wbg_get_blastep_dx: S_,
        __wbg_get_blastep_dy: A_,
        __wbg_get_blastep_log2_min_a: I_,
        __wbg_get_blastep_radius_alpha: j_,
        __wbg_get_blastep_radius_beta: M_,
        __wbg_get_incrementalunifiedbufferinfo_certificate_version: C_,
        __wbg_get_incrementalunifiedbufferinfo_certificate_words_per_block: E_,
        __wbg_get_incrementalunifiedbufferinfo_certificates_count: T_,
        __wbg_get_incrementalunifiedbufferinfo_certificates_ptr: z_,
        __wbg_get_incrementalunifiedbufferinfo_coeffs_count: N_,
        __wbg_get_incrementalunifiedbufferinfo_coeffs_ptr: B_,
        __wbg_get_incrementalunifiedbufferinfo_covered_orbit_len: D_,
        __wbg_get_incrementalunifiedbufferinfo_cumulative_coefficients: O_,
        __wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms: L_,
        __wbg_get_incrementalunifiedbufferinfo_cumulative_envelopes: U_,
        __wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms: $_,
        __wbg_get_incrementalunifiedbufferinfo_cumulative_merges: P_,
        __wbg_get_incrementalunifiedbufferinfo_has_more: W_,
        __wbg_get_incrementalunifiedbufferinfo_peak_retained_bytes: G_,
        __wbg_get_incrementalunifiedbufferinfo_published_orbit_len: V_,
        __wbg_get_incrementalunifiedbufferinfo_radii_count: H_,
        __wbg_get_incrementalunifiedbufferinfo_radii_ptr: J_,
        __wbg_get_incrementalunifiedbufferinfo_range_count: K_,
        __wbg_get_incrementalunifiedbufferinfo_ranges_ptr: Y_,
        __wbg_get_incrementalunifiedbufferinfo_reference_log2_dc: Q_,
        __wbg_get_incrementalunifiedbufferinfo_reset: X_,
        __wbg_get_incrementalunifiedrangeinfo_committed_count: Z_,
        __wbg_get_incrementalunifiedrangeinfo_level: mr,
        __wbg_get_incrementalunifiedrangeinfo_payload_offset: q_,
        __wbg_get_incrementalunifiedrangeinfo_skip: vr,
        __wbg_get_incrementalunifiedrangeinfo_slot_count: hr,
        __wbg_get_incrementalunifiedrangeinfo_slot_start: yr,
        __wbg_get_jetbufferinfo_coeffs_count: kr,
        __wbg_get_jetbufferinfo_coeffs_ptr: xr,
        __wbg_get_jetbufferinfo_level_count: Rr,
        __wbg_get_jetbufferinfo_levels_ptr: Fr,
        __wbg_get_jetbufferinfo_radii_count: Sr,
        __wbg_get_jetbufferinfo_radii_ptr: Ar,
        __wbg_get_mandelbrotstep_pad0: no,
        __wbg_get_mandelbrotstep_pad1: io,
        __wbg_get_mandelbrotstep_zx: ro,
        __wbg_get_mandelbrotstep_zy: oo,
        __wbg_get_mobiusbufferinfo_coeffs_count: Ir,
        __wbg_get_mobiusbufferinfo_coeffs_ptr: jr,
        __wbg_get_mobiusbufferinfo_level_count: Mr,
        __wbg_get_mobiusbufferinfo_levels_ptr: Cr,
        __wbg_get_mobiusbufferinfo_radii_count: Er,
        __wbg_get_mobiusbufferinfo_radii_ptr: Tr,
        __wbg_get_orbitbufferinfo_count: zr,
        __wbg_get_orbitbufferinfo_offset: Nr,
        __wbg_get_orbitbufferinfo_ptr: Br,
        __wbg_get_padebenchmark_max_iter: Dr,
        __wbg_get_padebenchmark_max_iter_delta: Or,
        __wbg_get_padebenchmark_pade_mismatches: Lr,
        __wbg_get_padebenchmark_pixels: Ur,
        __wbg_get_padebenchmark_steps_affine: ao,
        __wbg_get_padebenchmark_steps_exact: fo,
        __wbg_get_padebenchmark_steps_pade: so,
        __wbg_get_unifiedbufferinfo_coeffs_count: $r,
        __wbg_get_unifiedbufferinfo_coeffs_ptr: Pr,
        __wbg_get_unifiedbufferinfo_level_count: Wr,
        __wbg_get_unifiedbufferinfo_levels_ptr: Gr,
        __wbg_get_unifiedbufferinfo_optional_gate_log2_dc: bo,
        __wbg_get_unifiedbufferinfo_optional_headers_count: Vr,
        __wbg_get_unifiedbufferinfo_optional_headers_ptr: Hr,
        __wbg_get_unifiedbufferinfo_optional_headers_version: Jr,
        __wbg_get_unifiedbufferinfo_optional_periodic_log2_dc: co,
        __wbg_get_unifiedbufferinfo_optional_sa_log2_dc: lo,
        __wbg_get_unifiedbufferinfo_radii_count: Kr,
        __wbg_get_unifiedbufferinfo_radii_ptr: Yr,
        __wbg_get_unifiedbufferinfo_validity_count: Qr,
        __wbg_get_unifiedbufferinfo_validity_diagnostics_count: Xr,
        __wbg_get_unifiedbufferinfo_validity_diagnostics_ptr: Zr,
        __wbg_get_unifiedbufferinfo_validity_diagnostics_words_per_block: qr,
        __wbg_get_unifiedbufferinfo_validity_level_count: eo,
        __wbg_get_unifiedbufferinfo_validity_levels_ptr: _o,
        __wbg_get_unifiedbufferinfo_validity_ptr: to,
        __wbg_get_unifiedbufferinfo_validity_reference_log2_dc: et,
        __wbg_get_unifiedbufferinfo_validity_version: _t,
        __wbg_get_unifiedbufferinfo_validity_words_per_block: tt,
        __wbg_incrementalunifiedbufferinfo_free: nt,
        __wbg_incrementalunifiedrangeinfo_free: it,
        __wbg_jetbufferinfo_free: rt,
        __wbg_mandelbrotnavigator_free: ot,
        __wbg_mandelbrotstep_free: at,
        __wbg_mobiusbufferinfo_free: ft,
        __wbg_orbitbufferinfo_free: st,
        __wbg_padebenchmark_free: bt,
        __wbg_set_blabufferinfo_count: ct,
        __wbg_set_blabufferinfo_level_count: lt,
        __wbg_set_blabufferinfo_levels_ptr: gt,
        __wbg_set_blabufferinfo_ptr: ut,
        __wbg_set_blalevel_count: gi,
        __wbg_set_blalevel_max_radius_bits: ui,
        __wbg_set_blalevel_offset: di,
        __wbg_set_blalevel_skip: pi,
        __wbg_set_blastep_ab_exp: dt,
        __wbg_set_blastep_alpha_exp: pt,
        __wbg_set_blastep_ax: wt,
        __wbg_set_blastep_ay: mt,
        __wbg_set_blastep_bx: vt,
        __wbg_set_blastep_by: ht,
        __wbg_set_blastep_d_exp: yt,
        __wbg_set_blastep_dx: kt,
        __wbg_set_blastep_dy: xt,
        __wbg_set_blastep_log2_min_a: Rt,
        __wbg_set_blastep_radius_alpha: Ft,
        __wbg_set_blastep_radius_beta: St,
        __wbg_set_incrementalunifiedbufferinfo_certificate_version: At,
        __wbg_set_incrementalunifiedbufferinfo_certificate_words_per_block: It,
        __wbg_set_incrementalunifiedbufferinfo_certificates_count: jt,
        __wbg_set_incrementalunifiedbufferinfo_certificates_ptr: Mt,
        __wbg_set_incrementalunifiedbufferinfo_coeffs_count: wi,
        __wbg_set_incrementalunifiedbufferinfo_coeffs_ptr: Ct,
        __wbg_set_incrementalunifiedbufferinfo_covered_orbit_len: Et,
        __wbg_set_incrementalunifiedbufferinfo_cumulative_coefficients: Tt,
        __wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms: zt,
        __wbg_set_incrementalunifiedbufferinfo_cumulative_envelopes: Nt,
        __wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms: Bt,
        __wbg_set_incrementalunifiedbufferinfo_cumulative_merges: Dt,
        __wbg_set_incrementalunifiedbufferinfo_has_more: Ot,
        __wbg_set_incrementalunifiedbufferinfo_peak_retained_bytes: Lt,
        __wbg_set_incrementalunifiedbufferinfo_published_orbit_len: Ut,
        __wbg_set_incrementalunifiedbufferinfo_radii_count: $t,
        __wbg_set_incrementalunifiedbufferinfo_radii_ptr: Pt,
        __wbg_set_incrementalunifiedbufferinfo_range_count: Wt,
        __wbg_set_incrementalunifiedbufferinfo_ranges_ptr: Gt,
        __wbg_set_incrementalunifiedbufferinfo_reference_log2_dc: Vt,
        __wbg_set_incrementalunifiedbufferinfo_reset: Ht,
        __wbg_set_incrementalunifiedrangeinfo_committed_count: Jt,
        __wbg_set_incrementalunifiedrangeinfo_level: mi,
        __wbg_set_incrementalunifiedrangeinfo_payload_offset: vi,
        __wbg_set_incrementalunifiedrangeinfo_skip: hi,
        __wbg_set_incrementalunifiedrangeinfo_slot_count: yi,
        __wbg_set_incrementalunifiedrangeinfo_slot_start: ki,
        __wbg_set_jetbufferinfo_coeffs_count: xi,
        __wbg_set_jetbufferinfo_coeffs_ptr: Ri,
        __wbg_set_jetbufferinfo_level_count: Fi,
        __wbg_set_jetbufferinfo_levels_ptr: Si,
        __wbg_set_jetbufferinfo_radii_count: Ai,
        __wbg_set_jetbufferinfo_radii_ptr: Ii,
        __wbg_set_mandelbrotstep_pad0: ji,
        __wbg_set_mandelbrotstep_pad1: Mi,
        __wbg_set_mandelbrotstep_zx: Ci,
        __wbg_set_mandelbrotstep_zy: Ei,
        __wbg_set_mobiusbufferinfo_coeffs_count: Ti,
        __wbg_set_mobiusbufferinfo_coeffs_ptr: zi,
        __wbg_set_mobiusbufferinfo_level_count: Ni,
        __wbg_set_mobiusbufferinfo_levels_ptr: Bi,
        __wbg_set_mobiusbufferinfo_radii_count: Di,
        __wbg_set_mobiusbufferinfo_radii_ptr: Oi,
        __wbg_set_orbitbufferinfo_count: Li,
        __wbg_set_orbitbufferinfo_offset: Ui,
        __wbg_set_orbitbufferinfo_ptr: $i,
        __wbg_set_padebenchmark_max_iter: Pi,
        __wbg_set_padebenchmark_max_iter_delta: Wi,
        __wbg_set_padebenchmark_pade_mismatches: Gi,
        __wbg_set_padebenchmark_pixels: Vi,
        __wbg_set_padebenchmark_steps_affine: Hi,
        __wbg_set_padebenchmark_steps_exact: Ji,
        __wbg_set_padebenchmark_steps_pade: Ki,
        __wbg_set_unifiedbufferinfo_coeffs_count: Yi,
        __wbg_set_unifiedbufferinfo_coeffs_ptr: Qi,
        __wbg_set_unifiedbufferinfo_level_count: Xi,
        __wbg_set_unifiedbufferinfo_levels_ptr: Zi,
        __wbg_set_unifiedbufferinfo_optional_gate_log2_dc: qi,
        __wbg_set_unifiedbufferinfo_optional_headers_count: er,
        __wbg_set_unifiedbufferinfo_optional_headers_ptr: _r,
        __wbg_set_unifiedbufferinfo_optional_headers_version: tr,
        __wbg_set_unifiedbufferinfo_optional_periodic_log2_dc: nr,
        __wbg_set_unifiedbufferinfo_optional_sa_log2_dc: ir,
        __wbg_set_unifiedbufferinfo_radii_count: rr,
        __wbg_set_unifiedbufferinfo_radii_ptr: or,
        __wbg_set_unifiedbufferinfo_validity_count: ar,
        __wbg_set_unifiedbufferinfo_validity_diagnostics_count: fr,
        __wbg_set_unifiedbufferinfo_validity_diagnostics_ptr: sr,
        __wbg_set_unifiedbufferinfo_validity_diagnostics_words_per_block: br,
        __wbg_set_unifiedbufferinfo_validity_level_count: cr,
        __wbg_set_unifiedbufferinfo_validity_levels_ptr: lr,
        __wbg_set_unifiedbufferinfo_validity_ptr: gr,
        __wbg_set_unifiedbufferinfo_validity_reference_log2_dc: Kt,
        __wbg_set_unifiedbufferinfo_validity_version: Yt,
        __wbg_set_unifiedbufferinfo_validity_words_per_block: Qt,
        __wbg_unifiedbufferinfo_free: Xt,
        __wbindgen_export_0: go,
        __wbindgen_free: po,
        __wbindgen_malloc: wo,
        __wbindgen_realloc: mo,
        __wbindgen_start: He,
        mandelbrotnavigator_advance_incremental_unified_reference: Zt,
        mandelbrotnavigator_angle: qt,
        mandelbrotnavigator_begin_unified_reference: en,
        mandelbrotnavigator_benchmark_pade: _n,
        mandelbrotnavigator_cancel_transition: tn,
        mandelbrotnavigator_compute_bla_reference_ptr: nn,
        mandelbrotnavigator_compute_jet_reference: rn,
        mandelbrotnavigator_compute_mobius_reference: on,
        mandelbrotnavigator_compute_reference_orbit_chunk: an,
        mandelbrotnavigator_compute_reference_orbit_ptr: fn,
        mandelbrotnavigator_compute_unified_header: sn,
        mandelbrotnavigator_compute_unified_reference: bn,
        mandelbrotnavigator_continue_unified_reference_bounds: cn,
        mandelbrotnavigator_coordinate_to_pixel: ln,
        mandelbrotnavigator_current_log2_c_max: gn,
        mandelbrotnavigator_find_minibrot: un,
        mandelbrotnavigator_find_minibrot_framed: dn,
        mandelbrotnavigator_finish_unified_reference: pn,
        mandelbrotnavigator_get_approximation_mode: wn,
        mandelbrotnavigator_get_bla_epsilon: mn,
        mandelbrotnavigator_get_dynamic_block_validity: vn,
        mandelbrotnavigator_get_gate_emission: hn,
        mandelbrotnavigator_get_incremental_reference_table: yn,
        mandelbrotnavigator_get_max_bla_skip: kn,
        mandelbrotnavigator_get_params: xn,
        mandelbrotnavigator_get_reference_orbit_capacity: Rn,
        mandelbrotnavigator_get_reference_orbit_len: Fn,
        mandelbrotnavigator_get_reference_params: Sn,
        mandelbrotnavigator_is_in_transition: An,
        mandelbrotnavigator_new: In,
        mandelbrotnavigator_origin: jn,
        mandelbrotnavigator_pixel_to_complex: Mn,
        mandelbrotnavigator_reference_origin: Cn,
        mandelbrotnavigator_reset_step_clock: En,
        mandelbrotnavigator_rotate: Tn,
        mandelbrotnavigator_rotate_direct: zn,
        mandelbrotnavigator_scale: Nn,
        mandelbrotnavigator_set_bla_epsilon: Bn,
        mandelbrotnavigator_set_dynamic_block_validity: Dn,
        mandelbrotnavigator_set_gate_emission: On,
        mandelbrotnavigator_set_incremental_reference_table: Ln,
        mandelbrotnavigator_set_max_bla_skip: Un,
        mandelbrotnavigator_set_precision_budget: $n,
        mandelbrotnavigator_set_viewport_aspect: Pn,
        mandelbrotnavigator_start_export_transition: Wn,
        mandelbrotnavigator_start_transition: Gn,
        mandelbrotnavigator_step: Vn,
        mandelbrotnavigator_step_at_transition_time: Hn,
        mandelbrotnavigator_step_with_input: Jn,
        mandelbrotnavigator_translate: Kn,
        mandelbrotnavigator_translate_direct: Yn,
        mandelbrotnavigator_unified_is_cold: Qn,
        mandelbrotnavigator_unified_last_band_log2: Xn,
        mandelbrotnavigator_unified_last_band_spread: Zn,
        mandelbrotnavigator_unified_last_gate_count: qn,
        mandelbrotnavigator_unified_last_periodic_detected_p: ei,
        mandelbrotnavigator_unified_last_periodic_p: _i,
        mandelbrotnavigator_unified_last_periodic_status: ti,
        mandelbrotnavigator_unified_last_sa_n0: ni,
        mandelbrotnavigator_unified_last_stages: ii,
        mandelbrotnavigator_use_bla: ri,
        mandelbrotnavigator_use_jet: oi,
        mandelbrotnavigator_use_mobius_cplus: ai,
        mandelbrotnavigator_use_pade: fi,
        mandelbrotnavigator_use_perturbation: si,
        mandelbrotnavigator_use_unified: bi,
        mandelbrotnavigator_view_floatexp: ci,
        mandelbrotnavigator_zoom: li,
        memory: x
    });
    __(vo);
    He();
    const ho = 4, $e = 19, yo = 6, Pe = 27, ko = 4;
    function xo(n, e) {
        return n.jobId === e.jobId && n.refId === e.refId && n.tableGeneration === e.tableGeneration;
    }
    function Ro(n) {
        return n !== "viewport-update";
    }
    function Fo(n, e) {
        return n ? "epoch-reset" : e > 0 ? "reference-growth" : "none";
    }
    function So(n) {
        if (n.version !== ho || n.wordsPerBlock !== $e || n.rangesWords % yo !== 0 || n.coefficientFloats % Pe !== 0) return !1;
        const e = n.coefficientFloats / Pe;
        return n.sidecarFloats === e * ko && n.certificateWords === e * $e;
    }
    const Re = self;
    let f, k = 0, Y = !1, w = 0, F = !1, m = 0, G = 0, ye = !1, J = !1, Ao = 0, L = 0, _e = Number.NaN, ue = -1, de = -1, Io = 0, V = 0, H = 0, Fe = 0, Je = 0, Se = "none", S = "none", j = "";
    const Ae = 50, jo = 2, We = 1e7, Mo = Ae, Co = Ae;
    function A(n, e) {
        Re.postMessage(n, e ?? []);
    }
    function D() {
        return new Promise((n)=>setTimeout(n, 0));
    }
    function Ke(n, e) {
        const i = e instanceof Error ? e.message : String(e);
        A({
            type: "error",
            jobId: n,
            message: i
        });
    }
    function Ye(n) {
        f && (n === "bla" ? f.use_bla() : n === "pade" ? f.use_pade() : n === "jet" ? f.use_jet() : n === "mobius" ? f.use_mobius_cplus() : n === "auto" ? f.use_unified() : f.use_perturbation());
    }
    function Eo(n) {
        console.log("[REF worker] RESET (fresh navigator)", n.cx.slice(0, 14), "scale", n.scale.slice(0, 10)), f?.free(), f = new xe(n.cx, n.cy, n.scale, n.angle), f.set_precision_budget(n.precisionBudget), k = n.jobId, w = 0, F = !1, m = n.tableGeneration ?? 0, G = n.maxIterations, J = !1, Ye(n.approximationMode), f.set_bla_epsilon(n.blaEpsilon), f.set_gate_emission(!!n.gateEmission), f.set_dynamic_block_validity(!!n.dynamicBlockValidity), f.set_incremental_reference_table(!!n.incrementalReferenceTable), f.set_max_bla_skip(n.maxBlaSkip), f.set_viewport_aspect(n.viewportAspect ?? Number.NaN), _e = f.current_log2_c_max(), ue = -1, de = -1, V = 0, H = 0, Fe = 0, Je = 0, Se = "none", S = "epoch-reset", j = "", E(n.jobId);
    }
    function To(n, e, i) {
        const s = Math.max(0, i - e), o = new Float32Array(x.buffer, n + e * 4 * Float32Array.BYTES_PER_ELEMENT, s * 4), b = new Float32Array(s * 2);
        for(let l = 0; l < s; l++)b[l * 2] = o[l * 4], b[l * 2 + 1] = o[l * 4 + 1];
        return b;
    }
    function Qe(n, e) {
        if (n.optional_headers_count <= 0) return;
        if (n.optional_headers_version <= 0 || n.optional_headers_count < 11 || Number.isNaN(n.optional_sa_log2_dc) || Number.isNaN(n.optional_periodic_log2_dc) || Number.isNaN(n.optional_gate_log2_dc) || !Number.isFinite(e)) throw new Error(`invalid optional-header contract: version=${n.optional_headers_version} records=${n.optional_headers_count} domains=${n.optional_sa_log2_dc}/${n.optional_periodic_log2_dc}/${n.optional_gate_log2_dc}`);
        const i = new Float32Array(x.buffer, n.optional_headers_ptr, n.optional_headers_count * 4), r = new Float32Array(i.length);
        return r.set(i), {
            version: n.optional_headers_version,
            revision: ++Io,
            currentLog2CMax: e,
            saLog2Dc: n.optional_sa_log2_dc,
            periodicLog2Dc: n.optional_periodic_log2_dc,
            gateLog2Dc: n.optional_gate_log2_dc,
            data: r
        };
    }
    function zo(n) {
        let e = 1;
        const i = Math.max(1, Math.ceil(n));
        for(; e < i;)e *= 2;
        return e;
    }
    function pe(n, e, i, r) {
        return !Y && f === n && xo({
            jobId: k,
            refId: L,
            tableGeneration: m
        }, {
            jobId: e,
            refId: i,
            tableGeneration: r
        });
    }
    function ce(n, e) {
        const i = f;
        if (!i || i.get_approximation_mode() !== 5 || !i.get_dynamic_block_validity() || !i.get_incremental_reference_table()) return {
            hasMore: !1,
            published: !1
        };
        const r = L, a = m, s = i.current_log2_c_max();
        if (!pe(i, n, r, a)) return H++, {
            hasMore: !1,
            published: !1
        };
        const o = i.advance_incremental_unified_reference(e, Mo, Co);
        try {
            if (!pe(i, n, r, a)) return H++, {
                hasMore: !1,
                published: !1
            };
            const b = new Uint32Array(x.buffer, o.ranges_ptr, o.range_count * 6), l = new Uint32Array(b), g = new Float32Array(x.buffer, o.coeffs_ptr, o.coeffs_count * 27), d = new Float32Array(g), u = new Float32Array(x.buffer, o.radii_ptr, o.radii_count * 4), Q = new Float32Array(u);
            if (!So({
                version: o.certificate_version,
                wordsPerBlock: o.certificate_words_per_block,
                rangesWords: l.length,
                coefficientFloats: d.length,
                sidecarFloats: Q.length,
                certificateWords: o.certificates_count * o.certificate_words_per_block,
                referenceLog2Dc: o.reference_log2_dc
            }) || o.coeffs_count !== o.certificates_count) throw new Error(`incremental radial payload mismatch version=${o.certificate_version} words=${o.certificate_words_per_block} records=${o.coeffs_count}/${o.radii_count}/${o.certificates_count} domain=${o.reference_log2_dc}`);
            const I = new Uint32Array(x.buffer, o.certificates_ptr, o.certificates_count * o.certificate_words_per_block), fe = new Uint32Array(I);
            if (!pe(i, n, r, a)) return H++, {
                hasMore: !1,
                published: !1
            };
            const N = o.has_more !== 0 || o.covered_orbit_len < e + 1, U = l.length > 0 || o.reset !== 0;
            if (U) {
                const X = Fo(o.reset !== 0, o.certificates_count), c = o.reset !== 0 ? "epoch-reset" : S === "none" ? X : S;
                o.certificates_count > 0 && c === "reference-growth" && (Fe += o.certificates_count), c !== "none" && (Se = c);
                const B = Math.max(e, Math.max(0, o.covered_orbit_len - 1));
                A({
                    type: "tableRange",
                    jobId: n,
                    refId: r,
                    tableGeneration: a,
                    maxIterations: B,
                    capacityOrbitLength: zo(Math.max(1024, B + 1)),
                    coveredOrbitLength: o.published_orbit_len,
                    builtOrbitLength: o.covered_orbit_len,
                    reset: o.reset !== 0,
                    hasMore: N,
                    ranges: l,
                    coefficients: d,
                    radii: Q,
                    certificates: fe,
                    certificateVersion: o.certificate_version,
                    certificateWordsPerBlock: o.certificate_words_per_block,
                    referenceLog2Dc: o.reference_log2_dc,
                    currentLog2CMax: s,
                    cumulativeMerges: o.cumulative_merges,
                    cumulativeCoefficients: o.cumulative_coefficients,
                    cumulativeCertificates: o.cumulative_envelopes,
                    peakRetainedBytes: o.peak_retained_bytes,
                    cumulativeMergeCoefficientsMs: o.cumulative_merge_coefficients_ms,
                    cumulativeCertificateMs: o.cumulative_envelope_ms,
                    referenceGrowthCertificates: Fe,
                    viewportOnlyCertificateBuilds: Je,
                    lastCertificateBuildCause: Se,
                    yields: V,
                    cancellations: H
                }, [
                    l.buffer,
                    d.buffer,
                    Q.buffer,
                    fe.buffer
                ]);
            }
            return N || (S = "none"), {
                hasMore: N,
                published: U
            };
        } finally{
            o.free();
        }
    }
    function No(n, e) {
        const i = f;
        if (!i) return;
        const r = L, a = m, s = i.current_log2_c_max(), o = `${n}/${r}/${a}/${e}/${s}`;
        if (o === j) return;
        const b = performance.now(), l = i.compute_unified_header(e);
        try {
            if (!pe(i, n, r, a)) {
                H++;
                return;
            }
            const g = Qe(l, s);
            if (!g) return;
            j = o, A({
                type: "headersReady",
                jobId: n,
                refId: r,
                maxIterations: e,
                optionalHeaders: g,
                buildMs: performance.now() - b,
                buildStages: 16,
                tableStats: {
                    coefficientsMs: 0,
                    boundsMs: 0,
                    radiiMs: 0,
                    saN0: i.unified_last_sa_n0(),
                    periodicP: i.unified_last_periodic_p(),
                    periodicStatus: i.unified_last_periodic_status(),
                    periodicDetectedP: i.unified_last_periodic_detected_p(),
                    bandLog2: Number.NaN,
                    bandSpread: Number.NaN,
                    gateCount: 0
                },
                tableGeneration: a
            }, [
                g.data.buffer
            ]);
        } finally{
            l.free();
        }
    }
    function Ge(n, e, i) {
        if (!f || n !== k || Y) return;
        const r = f.get_approximation_mode(), a = (r === 3 || r === 4 || r === 5) && w > 0 && e <= Math.ceil(w * 1.5), s = w >= e || a, o = F && (r === 3 || r === 4 || r === 5), b = s ? w : Math.max(w, e);
        if (s && !o || i < b || r === 0) return;
        const l = L, g = r === 3, d = r === 4, u = r === 5, Q = u ? "unified" : d ? "mobius" : g ? "jet" : "bla", I = (R, C)=>{
            A({
                type: "tableProgress",
                jobId: n,
                refId: l,
                tableGeneration: m,
                kind: Q,
                progress: R,
                stage: C
            });
        };
        if (!g && !d && !u) {
            I(0, "coefficients");
            const R = f.compute_bla_reference_ptr(b);
            I(.9, "transfer");
            const C = new Float32Array(x.buffer, R.ptr, R.count * 12), T = new Float32Array(C.length);
            T.set(C);
            const ee = new Uint32Array(x.buffer, R.levels_ptr, R.level_count * 4), P = new Uint32Array(ee.length);
            P.set(ee), w = b, A({
                type: "blaReady",
                jobId: n,
                refId: l,
                maxIterations: b,
                kind: "bla",
                steps: T,
                levels: P,
                levelCount: R.level_count,
                tableGeneration: m
            }, [
                T.buffer,
                P.buffer
            ]);
            return;
        }
        const fe = performance.now();
        let N = 0, U = 0, X = 0, c;
        if (u) {
            const R = performance.now();
            f.begin_unified_reference(b), N = performance.now() - R;
            const C = performance.now();
            f.continue_unified_reference_bounds(b), U = performance.now() - C;
            const T = performance.now();
            c = f.finish_unified_reference(b), X = performance.now() - T;
        } else I(0, "coefficients"), c = d ? f.compute_mobius_reference(b) : f.compute_jet_reference(b);
        const B = performance.now() - fe, v = u ? f.unified_last_stages() : void 0;
        u && v !== void 0 ? ((v & 1) !== 0 && I(1 / 3, "coefficients"), (v & 2) !== 0 && I(2 / 3, "bounds"), (v & 12) !== 0 && I(.85, "radii"), (v & 15) !== 0 && I(.9, "transfer"), (v & 1) === 0 && (N = 0), (v & 2) === 0 && (U = 0), (v & 12) === 0 && (X = 0)) : I(.9, "transfer");
        const we = u ? {
            coefficientsMs: N,
            boundsMs: U,
            radiiMs: X,
            saN0: f.unified_last_sa_n0(),
            periodicP: f.unified_last_periodic_p(),
            periodicStatus: f.unified_last_periodic_status(),
            periodicDetectedP: f.unified_last_periodic_detected_p(),
            bandLog2: f.unified_last_band_log2(),
            bandSpread: f.unified_last_band_spread(),
            gateCount: f.unified_last_gate_count()
        } : void 0;
        console.log(`[REF worker] ${d ? "mobius" : u ? "unified" : "jet"} table built in ${B.toFixed(0)}ms (maxIter ${b}${v !== void 0 ? `, stages ${v}` : ""})`);
        const M = u ? Qe(c, f.current_log2_c_max()) : void 0;
        if (u && !M) throw new Error("unified table omitted its mandatory optional-header payload");
        if (w = Math.max(w, b), F = !1, u && f.get_dynamic_block_validity() && v === 16 && ue === l && de === m) {
            A({
                type: "headersReady",
                jobId: n,
                refId: l,
                maxIterations: b,
                optionalHeaders: M,
                buildMs: B,
                buildStages: v,
                tableStats: we,
                tableGeneration: m
            }, [
                M.data.buffer
            ]);
            return;
        }
        const Ie = new Float32Array(x.buffer, c.radii_ptr, c.radii_count * 4), Z = new Float32Array(Ie.length);
        Z.set(Ie);
        const je = new Uint32Array(x.buffer, c.levels_ptr, c.level_count * 4), q = new Uint32Array(je.length);
        if (q.set(je), u && v !== void 0 && (v & 4) !== 0 && (v & -21) === 0 && ue === l && de === m) {
            A({
                type: "radiiReady",
                jobId: n,
                refId: l,
                maxIterations: b,
                radii: Z,
                optionalHeaders: M,
                levels: q,
                levelCount: c.level_count,
                buildMs: B,
                buildStages: v,
                tableStats: we,
                tableGeneration: m
            }, [
                Z.buffer,
                q.buffer,
                ...M ? [
                    M.data.buffer
                ] : []
            ]);
            return;
        }
        const Xe = d ? 21 : 27, Me = new Float32Array(x.buffer, c.coeffs_ptr, c.coeffs_count * Xe), me = new Float32Array(Me.length);
        me.set(Me);
        let $;
        if (u && c.validity_count > 0) {
            if (c.validity_version <= 0 || c.validity_words_per_block <= 0 || c.validity_diagnostics_words_per_block <= 0 || c.validity_count !== c.coeffs_count || c.validity_diagnostics_count !== c.validity_count || c.validity_level_count !== c.level_count || !Number.isFinite(c.validity_reference_log2_dc)) throw new Error(`invalid dynamic-validity buffer contract: version=${c.validity_version} words=${c.validity_words_per_block} records=${c.validity_count}/${c.coeffs_count} diagnostics=${c.validity_diagnostics_words_per_block}x${c.validity_diagnostics_count} levels=${c.validity_level_count}/${c.level_count} domain=${c.validity_reference_log2_dc}`);
            const R = new Float32Array(x.buffer, c.validity_ptr, c.validity_count * c.validity_words_per_block), C = new Float32Array(R.length);
            C.set(R);
            const T = new Uint32Array(x.buffer, c.validity_diagnostics_ptr, c.validity_diagnostics_count * c.validity_diagnostics_words_per_block), ee = new Uint32Array(T.length);
            ee.set(T);
            const P = new Uint32Array(x.buffer, c.validity_levels_ptr, c.validity_level_count * 4), Ce = new Uint32Array(P.length);
            Ce.set(P), $ = {
                version: c.validity_version,
                wordsPerBlock: c.validity_words_per_block,
                diagnosticsWordsPerBlock: c.validity_diagnostics_words_per_block,
                referenceLog2Dc: c.validity_reference_log2_dc,
                envelopes: C,
                diagnostics: ee,
                levels: Ce,
                levelCount: c.validity_level_count
            };
        }
        u && (ue = l, de = m);
        const Ze = {
            type: "blaReady",
            jobId: n,
            refId: l,
            maxIterations: b,
            kind: d ? "mobius" : u ? "unified" : "jet",
            steps: me,
            radii: Z,
            optionalHeaders: M,
            validity: $,
            levels: q,
            levelCount: c.level_count,
            buildMs: B,
            buildStages: v,
            tableStats: we,
            tableGeneration: m
        }, ve = [
            me.buffer,
            Z.buffer,
            q.buffer
        ];
        M && ve.push(M.data.buffer), $ && ve.push($.envelopes.buffer, $.diagnostics.buffer, $.levels.buffer), A(Ze, ve);
    }
    function ke(n, e, i) {
        if (!f) return 0;
        const r = f.compute_reference_orbit_chunk(Ae, i);
        J = !1;
        const a = To(r.ptr, r.offset, r.count), [s, o] = f.get_reference_params();
        r.offset === 0 ? (S = "epoch-reset", L = ++Ao, w = 0, F = !1, j = "", console.log("[REF worker] orbit (re)start refId=", L, "ref=", s.slice(0, 14))) : S === "none" && (S = "reference-growth");
        const b = Math.max(0, r.count - 1);
        return A({
            type: "orbitChunk",
            jobId: n,
            refId: L,
            offset: r.offset,
            count: r.count,
            maxIterations: e,
            referenceCx: s,
            referenceCy: o,
            orbit: a
        }, [
            a.buffer
        ]), b;
    }
    async function E(n) {
        if (ye) return;
        ye = !0;
        let e = !1;
        try {
            for(; !Y && f && n === k;){
                const i = G, r = Math.min(i, We), a = Math.min(i * jo, We), s = Math.max(0, f.get_reference_orbit_len()), o = f.get_approximation_mode() === 5 && f.get_dynamic_block_validity() && f.get_incremental_reference_table();
                if (J || s < r) {
                    const l = ke(n, i, r);
                    o && l > 0 && ce(n, a), V += o ? 1 : 0, await D();
                    continue;
                }
                if (o) {
                    const l = ce(n, i);
                    if (l.published || l.hasMore) {
                        V++, await D();
                        continue;
                    }
                    if (w = Math.max(w, i), s < a) {
                        ke(n, i, a) > 0 && ce(n, a), V++, await D();
                        continue;
                    }
                    const g = ce(n, Math.min(s, a));
                    if (g.published || g.hasMore) {
                        V++, await D();
                        continue;
                    }
                    if (No(n, i), await D(), G <= i && !J) break;
                    continue;
                }
                if (s >= a) {
                    if (Ge(n, i, s), await D(), G <= i) break;
                    continue;
                }
                const b = ke(n, i, a);
                Ge(n, i, b), await D();
            }
        } catch (i) {
            e = !0, Ke(n, i);
        } finally{
            if (ye = !1, !e && !Y && f) {
                const i = Math.max(0, f.get_reference_orbit_len()), r = (w === 0 || F) && f.get_approximation_mode() !== 0;
                (n !== k || i < G || J || r) && E(k);
            }
        }
    }
    Re.onmessage = (n)=>{
        const e = n.data;
        try {
            switch(e.type){
                case "reset":
                    Y || Eo(e);
                    break;
                case "updateView":
                    if (f && e.jobId === k) {
                        f.origin(e.cx, e.cy), f.scale(e.scale), f.angle(e.angle), e.viewportAspect !== void 0 && f.set_viewport_aspect(e.viewportAspect), G = e.maxIterations, J = !0;
                        const i = f.get_approximation_mode();
                        if (i === 3 || i === 4 || i === 5) {
                            const r = f.current_log2_c_max();
                            if (!Number.isFinite(_e) || r > _e || r < _e - 2) {
                                _e = r;
                                const a = i === 5 && f.get_dynamic_block_validity() && f.get_incremental_reference_table(), s = Ro("viewport-update");
                                (!a || s) && (F = !0);
                            }
                        }
                        E(e.jobId);
                    }
                    break;
                case "setApproximationMode":
                    e.jobId === k && (Ye(e.approximationMode), f?.get_incremental_reference_table() && (f.set_incremental_reference_table(!1), f.set_incremental_reference_table(!0)), w = 0, F = !1, j = "", S = "epoch-reset", m = e.tableGeneration, E(e.jobId));
                    break;
                case "setBlaEpsilon":
                    f && e.jobId === k && (f.set_bla_epsilon(e.blaEpsilon), w = 0, F = !1, j = "", S = "epoch-reset", m = e.tableGeneration, E(e.jobId));
                    break;
                case "setGateEmission":
                    f && e.jobId === k && (f.set_gate_emission(e.on), w = 0, F = !1, j = "", m = e.tableGeneration, E(e.jobId));
                    break;
                case "setDynamicBlockValidity":
                    f && e.jobId === k && (f.set_dynamic_block_validity(e.on), w = 0, F = !1, j = "", S = "epoch-reset", m = e.tableGeneration, E(e.jobId));
                    break;
                case "setIncrementalReferenceTable":
                    f && e.jobId === k && (f.set_incremental_reference_table(e.on), w = 0, F = !1, j = "", S = "epoch-reset", m = e.tableGeneration, E(e.jobId));
                    break;
                case "setMaxBlaSkip":
                    f && e.jobId === k && (f.set_max_bla_skip(e.maxBlaSkip), w = 0, F = !1, j = "", S = "epoch-reset", m = e.tableGeneration, E(e.jobId));
                    break;
                case "findMinibrot":
                    if (f && e.jobId === k) {
                        const i = e.fill !== void 0, r = i ? f.find_minibrot_framed(e.maxIter, e.radiusFactor, e.fill) : f.find_minibrot(e.maxIter, e.radiusFactor), a = r[0];
                        A({
                            type: "minibrotFound",
                            jobId: e.jobId,
                            status: a,
                            cx: a === "ok" ? r[1] : null,
                            cy: a === "ok" ? r[2] : null,
                            period: a === "ok" ? Number(r[3]) : a === "nonewton" || a === "nosize" ? Number(r[1]) : null,
                            scale: a === "ok" && i ? r[4] : null
                        });
                    }
                    break;
                case "dispose":
                    Y = !0, f?.free(), f = void 0, Re.close();
                    break;
            }
        } catch (i) {
            Ke("jobId" in e ? e.jobId : k, i);
        }
    };
    A({
        type: "ready"
    });
})();
