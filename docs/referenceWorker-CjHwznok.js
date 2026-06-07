(async ()=>{
    var X = "" + new URL("mandelbrot_bg-BuFW6ywS.wasm", import.meta.url).href, Z = async (_ = {}, e)=>{
        let n;
        if (e.startsWith("data:")) {
            const o = e.replace(/^data:.*?base64,/, "");
            let b;
            if (typeof Buffer == "function" && typeof Buffer.from == "function") b = Buffer.from(o, "base64");
            else if (typeof atob == "function") {
                const i = atob(o);
                b = new Uint8Array(i.length);
                for(let a = 0; a < i.length; a++)b[a] = i.charCodeAt(a);
            } else throw new Error("Cannot decode base64-encoded data URL");
            n = await WebAssembly.instantiate(b, _);
        } else {
            const o = await fetch(e), b = o.headers.get("Content-Type") || "";
            if ("instantiateStreaming" in WebAssembly && b.startsWith("application/wasm")) n = await WebAssembly.instantiateStreaming(o, _);
            else {
                const i = await o.arrayBuffer();
                n = await WebAssembly.instantiate(i, _);
            }
        }
        return n.instance.exports;
    };
    let r;
    function $(_) {
        r = _;
    }
    let F = null;
    function M() {
        return (F === null || F.byteLength === 0) && (F = new Uint8Array(r.memory.buffer)), F;
    }
    let S = new TextDecoder("utf-8", {
        ignoreBOM: !0,
        fatal: !0
    });
    S.decode();
    const q = 2146435072;
    let B = 0;
    function G(_, e) {
        return B += e, B >= q && (S = new TextDecoder("utf-8", {
            ignoreBOM: !0,
            fatal: !0
        }), S.decode(), B = e), S.decode(M().subarray(_, _ + e));
    }
    function V(_, e) {
        return _ = _ >>> 0, G(_, e);
    }
    let d = null;
    function Q() {
        return (d === null || d.buffer.detached === !0 || d.buffer.detached === void 0 && d.buffer !== r.memory.buffer) && (d = new DataView(r.memory.buffer)), d;
    }
    function A(_, e) {
        _ = _ >>> 0;
        const n = Q(), o = [];
        for(let b = _; b < _ + 4 * e; b += 4)o.push(r.__wbindgen_export_0.get(n.getUint32(b, !0)));
        return r.__externref_drop_slice(_, e), o;
    }
    let g = 0;
    const m = new TextEncoder;
    "encodeInto" in m || (m.encodeInto = function(_, e) {
        const n = m.encode(_);
        return e.set(n), {
            read: _.length,
            written: n.length
        };
    });
    function c(_, e, n) {
        if (n === void 0) {
            const l = m.encode(_), p = e(l.length, 1) >>> 0;
            return M().subarray(p, p + l.length).set(l), g = l.length, p;
        }
        let o = _.length, b = e(o, 1) >>> 0;
        const i = M();
        let a = 0;
        for(; a < o; a++){
            const l = _.charCodeAt(a);
            if (l > 127) break;
            i[b + a] = l;
        }
        if (a !== o) {
            a !== 0 && (_ = _.slice(a)), b = n(b, o, o = a + _.length * 3, 1) >>> 0;
            const l = M().subarray(b + a, b + o), p = m.encodeInto(_, l);
            a += p.written, b = n(b, o, a, 1) >>> 0;
        }
        return g = a, b;
    }
    const W = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((_)=>r.__wbg_blabufferinfo_free(_ >>> 0, 1));
    class x {
        static __wrap(e) {
            e = e >>> 0;
            const n = Object.create(x.prototype);
            return n.__wbg_ptr = e, W.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, W.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            r.__wbg_blabufferinfo_free(e, 0);
        }
        get ptr() {
            return r.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(e) {
            r.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, e);
        }
        get count() {
            return r.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set count(e) {
            r.__wbg_set_blabufferinfo_count(this.__wbg_ptr, e);
        }
        get levels_ptr() {
            return r.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set levels_ptr(e) {
            r.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, e);
        }
        get level_count() {
            return r.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        set level_count(e) {
            r.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (x.prototype[Symbol.dispose] = x.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((_)=>r.__wbg_blalevel_free(_ >>> 0, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((_)=>r.__wbg_blastep_free(_ >>> 0, 1));
    const D = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((_)=>r.__wbg_mandelbrotnavigator_free(_ >>> 0, 1));
    class T {
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, D.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            r.__wbg_mandelbrotnavigator_free(e, 0);
        }
        get_params() {
            const e = r.mandelbrotnavigator_get_params(this.__wbg_ptr);
            var n = A(e[0], e[1]).slice();
            return r.__wbindgen_free(e[0], e[1] * 4, 4), n;
        }
        rotate_direct(e) {
            r.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, e);
        }
        get_bla_epsilon() {
            return r.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr);
        }
        set_bla_epsilon(e) {
            r.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr, e);
        }
        pixel_to_complex(e, n, o, b) {
            const i = r.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr, e, n, o, b);
            var a = A(i[0], i[1]).slice();
            return r.__wbindgen_free(i[0], i[1] * 4, 4), a;
        }
        reference_origin(e, n) {
            const o = c(e, r.__wbindgen_malloc, r.__wbindgen_realloc), b = g, i = c(n, r.__wbindgen_malloc, r.__wbindgen_realloc), a = g;
            r.mandelbrotnavigator_reference_origin(this.__wbg_ptr, o, b, i, a);
        }
        translate_direct(e, n) {
            r.mandelbrotnavigator_translate_direct(this.__wbg_ptr, e, n);
        }
        use_perturbation() {
            r.mandelbrotnavigator_use_perturbation(this.__wbg_ptr);
        }
        get_reference_params() {
            const e = r.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);
            var n = A(e[0], e[1]).slice();
            return r.__wbindgen_free(e[0], e[1] * 4, 4), n;
        }
        get_approximation_mode() {
            return r.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr);
        }
        get_reference_orbit_len() {
            return r.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        compute_bla_reference_ptr(e) {
            const n = r.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr, e);
            return x.__wrap(n);
        }
        compute_reference_orbit_ptr(e) {
            const n = r.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, e);
            return w.__wrap(n);
        }
        get_reference_orbit_capacity() {
            return r.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        compute_reference_orbit_chunk(e, n) {
            const o = r.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, e, n);
            return w.__wrap(o);
        }
        constructor(e, n, o, b){
            const i = c(e, r.__wbindgen_malloc, r.__wbindgen_realloc), a = g, l = c(n, r.__wbindgen_malloc, r.__wbindgen_realloc), p = g, Y = c(o, r.__wbindgen_malloc, r.__wbindgen_realloc), H = g, K = r.mandelbrotnavigator_new(i, a, l, p, Y, H, b);
            return this.__wbg_ptr = K >>> 0, D.register(this, this.__wbg_ptr, this), this;
        }
        step() {
            const e = r.mandelbrotnavigator_step(this.__wbg_ptr);
            var n = A(e[0], e[1]).slice();
            return r.__wbindgen_free(e[0], e[1] * 4, 4), n;
        }
        zoom(e) {
            r.mandelbrotnavigator_zoom(this.__wbg_ptr, e);
        }
        angle(e) {
            r.mandelbrotnavigator_angle(this.__wbg_ptr, e);
        }
        scale(e) {
            const n = c(e, r.__wbindgen_malloc, r.__wbindgen_realloc), o = g;
            r.mandelbrotnavigator_scale(this.__wbg_ptr, n, o);
        }
        origin(e, n) {
            const o = c(e, r.__wbindgen_malloc, r.__wbindgen_realloc), b = g, i = c(n, r.__wbindgen_malloc, r.__wbindgen_realloc), a = g;
            r.mandelbrotnavigator_origin(this.__wbg_ptr, o, b, i, a);
        }
        rotate(e) {
            r.mandelbrotnavigator_rotate(this.__wbg_ptr, e);
        }
        use_bla() {
            r.mandelbrotnavigator_use_bla(this.__wbg_ptr);
        }
        translate(e, n) {
            r.mandelbrotnavigator_translate(this.__wbg_ptr, e, n);
        }
    }
    Symbol.dispose && (T.prototype[Symbol.dispose] = T.prototype.free);
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((_)=>r.__wbg_mandelbrotstep_free(_ >>> 0, 1));
    const O = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((_)=>r.__wbg_orbitbufferinfo_free(_ >>> 0, 1));
    class w {
        static __wrap(e) {
            e = e >>> 0;
            const n = Object.create(w.prototype);
            return n.__wbg_ptr = e, O.register(n, n.__wbg_ptr, n), n;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, O.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            r.__wbg_orbitbufferinfo_free(e, 0);
        }
        get ptr() {
            return r.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set ptr(e) {
            r.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, e);
        }
        get offset() {
            return r.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        set offset(e) {
            r.__wbg_set_blabufferinfo_count(this.__wbg_ptr, e);
        }
        get count() {
            return r.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        set count(e) {
            r.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (w.prototype[Symbol.dispose] = w.prototype.free);
    function ee(_) {
        return Math.exp(_);
    }
    function _e() {
        return Date.now();
    }
    function te(_, e) {
        throw new Error(V(_, e));
    }
    function re(_, e) {
        return V(_, e);
    }
    function ne() {
        const _ = r.__wbindgen_export_0, e = _.grow(4);
        _.set(0, void 0), _.set(e + 0, void 0), _.set(e + 1, null), _.set(e + 2, !0), _.set(e + 3, !1);
    }
    URL = globalThis.URL;
    const t = await Z({
        "./mandelbrot_bg.js": {
            __wbg_now_1e80617bcee43265: _e,
            __wbg_exp_9293ded1248e1bd3: ee,
            __wbg_wbindgenthrow_451ec1a8469d7eb6: te,
            __wbindgen_init_externref_table: ne,
            __wbindgen_cast_2241b6af4c4b2941: re
        }
    }, X), E = t.memory, oe = t.__wbg_blabufferinfo_free, ae = t.__wbg_blalevel_free, be = t.__wbg_blastep_free, ie = t.__wbg_get_blabufferinfo_count, se = t.__wbg_get_blabufferinfo_level_count, le = t.__wbg_get_blabufferinfo_levels_ptr, ge = t.__wbg_get_blabufferinfo_ptr, fe = t.__wbg_get_blastep_ax, ce = t.__wbg_get_blastep_ay, pe = t.__wbg_get_blastep_bx, de = t.__wbg_get_blastep_by, we = t.__wbg_get_blastep_radius_alpha, ue = t.__wbg_get_blastep_radius_beta, me = t.__wbg_mandelbrotnavigator_free, ve = t.__wbg_mandelbrotstep_free, ye = t.__wbg_orbitbufferinfo_free, he = t.__wbg_set_blabufferinfo_count, xe = t.__wbg_set_blabufferinfo_level_count, ze = t.__wbg_set_blabufferinfo_levels_ptr, Re = t.__wbg_set_blabufferinfo_ptr, Fe = t.__wbg_set_blastep_ax, Ae = t.__wbg_set_blastep_ay, Me = t.__wbg_set_blastep_bx, Se = t.__wbg_set_blastep_by, ke = t.__wbg_set_blastep_radius_alpha, Ee = t.__wbg_set_blastep_radius_beta, Be = t.mandelbrotnavigator_angle, Ie = t.mandelbrotnavigator_compute_bla_reference_ptr, Te = t.mandelbrotnavigator_compute_reference_orbit_chunk, Ce = t.mandelbrotnavigator_compute_reference_orbit_ptr, Ue = t.mandelbrotnavigator_get_approximation_mode, We = t.mandelbrotnavigator_get_bla_epsilon, De = t.mandelbrotnavigator_get_params, Oe = t.mandelbrotnavigator_get_reference_orbit_capacity, je = t.mandelbrotnavigator_get_reference_orbit_len, Le = t.mandelbrotnavigator_get_reference_params, Ve = t.mandelbrotnavigator_new, Ne = t.mandelbrotnavigator_origin, Pe = t.mandelbrotnavigator_pixel_to_complex, Je = t.mandelbrotnavigator_reference_origin, Ye = t.mandelbrotnavigator_rotate, He = t.mandelbrotnavigator_rotate_direct, Ke = t.mandelbrotnavigator_scale, Xe = t.mandelbrotnavigator_set_bla_epsilon, Ze = t.mandelbrotnavigator_step, $e = t.mandelbrotnavigator_translate, qe = t.mandelbrotnavigator_translate_direct, Ge = t.mandelbrotnavigator_use_bla, Qe = t.mandelbrotnavigator_use_perturbation, e_ = t.mandelbrotnavigator_zoom, __ = t.__wbg_set_blalevel__padding, t_ = t.__wbg_set_blalevel_count, r_ = t.__wbg_set_blalevel_offset, n_ = t.__wbg_set_blalevel_skip, o_ = t.__wbg_set_mandelbrotstep_dx, a_ = t.__wbg_set_mandelbrotstep_dy, b_ = t.__wbg_set_mandelbrotstep_zx, i_ = t.__wbg_set_mandelbrotstep_zy, s_ = t.__wbg_set_orbitbufferinfo_count, l_ = t.__wbg_set_orbitbufferinfo_offset, g_ = t.__wbg_set_orbitbufferinfo_ptr, f_ = t.__wbg_get_blalevel__padding, c_ = t.__wbg_get_blalevel_count, p_ = t.__wbg_get_blalevel_offset, d_ = t.__wbg_get_blalevel_skip, w_ = t.__wbg_get_orbitbufferinfo_count, u_ = t.__wbg_get_orbitbufferinfo_offset, m_ = t.__wbg_get_orbitbufferinfo_ptr, v_ = t.__wbg_get_mandelbrotstep_dx, y_ = t.__wbg_get_mandelbrotstep_dy, h_ = t.__wbg_get_mandelbrotstep_zx, x_ = t.__wbg_get_mandelbrotstep_zy, z_ = t.__wbindgen_export_0, R_ = t.__externref_drop_slice, F_ = t.__wbindgen_free, A_ = t.__wbindgen_malloc, M_ = t.__wbindgen_realloc, N = t.__wbindgen_start;
    var S_ = Object.freeze({
        __proto__: null,
        __externref_drop_slice: R_,
        __wbg_blabufferinfo_free: oe,
        __wbg_blalevel_free: ae,
        __wbg_blastep_free: be,
        __wbg_get_blabufferinfo_count: ie,
        __wbg_get_blabufferinfo_level_count: se,
        __wbg_get_blabufferinfo_levels_ptr: le,
        __wbg_get_blabufferinfo_ptr: ge,
        __wbg_get_blalevel__padding: f_,
        __wbg_get_blalevel_count: c_,
        __wbg_get_blalevel_offset: p_,
        __wbg_get_blalevel_skip: d_,
        __wbg_get_blastep_ax: fe,
        __wbg_get_blastep_ay: ce,
        __wbg_get_blastep_bx: pe,
        __wbg_get_blastep_by: de,
        __wbg_get_blastep_radius_alpha: we,
        __wbg_get_blastep_radius_beta: ue,
        __wbg_get_mandelbrotstep_dx: v_,
        __wbg_get_mandelbrotstep_dy: y_,
        __wbg_get_mandelbrotstep_zx: h_,
        __wbg_get_mandelbrotstep_zy: x_,
        __wbg_get_orbitbufferinfo_count: w_,
        __wbg_get_orbitbufferinfo_offset: u_,
        __wbg_get_orbitbufferinfo_ptr: m_,
        __wbg_mandelbrotnavigator_free: me,
        __wbg_mandelbrotstep_free: ve,
        __wbg_orbitbufferinfo_free: ye,
        __wbg_set_blabufferinfo_count: he,
        __wbg_set_blabufferinfo_level_count: xe,
        __wbg_set_blabufferinfo_levels_ptr: ze,
        __wbg_set_blabufferinfo_ptr: Re,
        __wbg_set_blalevel__padding: __,
        __wbg_set_blalevel_count: t_,
        __wbg_set_blalevel_offset: r_,
        __wbg_set_blalevel_skip: n_,
        __wbg_set_blastep_ax: Fe,
        __wbg_set_blastep_ay: Ae,
        __wbg_set_blastep_bx: Me,
        __wbg_set_blastep_by: Se,
        __wbg_set_blastep_radius_alpha: ke,
        __wbg_set_blastep_radius_beta: Ee,
        __wbg_set_mandelbrotstep_dx: o_,
        __wbg_set_mandelbrotstep_dy: a_,
        __wbg_set_mandelbrotstep_zx: b_,
        __wbg_set_mandelbrotstep_zy: i_,
        __wbg_set_orbitbufferinfo_count: s_,
        __wbg_set_orbitbufferinfo_offset: l_,
        __wbg_set_orbitbufferinfo_ptr: g_,
        __wbindgen_export_0: z_,
        __wbindgen_free: F_,
        __wbindgen_malloc: A_,
        __wbindgen_realloc: M_,
        __wbindgen_start: N,
        mandelbrotnavigator_angle: Be,
        mandelbrotnavigator_compute_bla_reference_ptr: Ie,
        mandelbrotnavigator_compute_reference_orbit_chunk: Te,
        mandelbrotnavigator_compute_reference_orbit_ptr: Ce,
        mandelbrotnavigator_get_approximation_mode: Ue,
        mandelbrotnavigator_get_bla_epsilon: We,
        mandelbrotnavigator_get_params: De,
        mandelbrotnavigator_get_reference_orbit_capacity: Oe,
        mandelbrotnavigator_get_reference_orbit_len: je,
        mandelbrotnavigator_get_reference_params: Le,
        mandelbrotnavigator_new: Ve,
        mandelbrotnavigator_origin: Ne,
        mandelbrotnavigator_pixel_to_complex: Pe,
        mandelbrotnavigator_reference_origin: Je,
        mandelbrotnavigator_rotate: Ye,
        mandelbrotnavigator_rotate_direct: He,
        mandelbrotnavigator_scale: Ke,
        mandelbrotnavigator_set_bla_epsilon: Xe,
        mandelbrotnavigator_step: Ze,
        mandelbrotnavigator_translate: $e,
        mandelbrotnavigator_translate_direct: qe,
        mandelbrotnavigator_use_bla: Ge,
        mandelbrotnavigator_use_perturbation: Qe,
        mandelbrotnavigator_zoom: e_,
        memory: E
    });
    $(S_);
    N();
    const C = self;
    let s, f = 0, z = !1, u = 0, v = 0, I = !1, y = !1, k = "", U = "";
    const k_ = 1e3;
    function R(_, e) {
        C.postMessage(_, e ?? []);
    }
    function j() {
        return new Promise((_)=>setTimeout(_, 0));
    }
    function P(_, e) {
        const n = e instanceof Error ? e.message : String(e);
        R({
            type: "error",
            jobId: _,
            message: n
        });
    }
    function J(_) {
        s && (_ === "bla" ? s.use_bla() : s.use_perturbation());
    }
    function E_(_) {
        s?.free(), s = new T(_.cx, _.cy, _.scale, _.angle), f = _.jobId, u = 0, v = _.maxIterations, y = !1, k = "", U = "", J(_.approximationMode), s.set_bla_epsilon(_.blaEpsilon), h(_.jobId);
    }
    function B_(_, e, n) {
        const b = Math.max(0, n - e), i = new Float32Array(E.buffer, _ + e * 4 * Float32Array.BYTES_PER_ELEMENT, b * 4), a = new Float32Array(i.length);
        return a.set(i), a;
    }
    function L(_, e, n) {
        if (!s || _ !== f || z || u >= e || n < e || s.get_approximation_mode() !== 1) return;
        const o = s.compute_bla_reference_ptr(e), b = new Float32Array(E.buffer, o.ptr, o.count * 6), i = new Float32Array(b.length);
        i.set(b);
        const a = new Uint32Array(E.buffer, o.levels_ptr, o.level_count * 4), l = new Uint32Array(a.length);
        l.set(a), u = e, R({
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
    async function h(_) {
        if (!I) {
            I = !0;
            try {
                for(; !z && s && _ === f;){
                    const e = v, n = Math.max(0, s.get_reference_orbit_len());
                    if (n >= e && !y) {
                        if (L(_, e, n), await j(), v <= e) break;
                        continue;
                    }
                    const o = s.compute_reference_orbit_chunk(k_, e);
                    y = !1;
                    const b = B_(o.ptr, o.offset, o.count), [i, a] = s.get_reference_params();
                    k && (i !== k || a !== U) && (u = 0, R({
                        type: "referenceReset",
                        jobId: _,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: a
                    })), k = i, U = a;
                    const l = Math.max(0, o.count - 1);
                    R({
                        type: "orbitChunk",
                        jobId: _,
                        offset: o.offset,
                        count: o.count,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: a,
                        orbit: b
                    }, [
                        b.buffer
                    ]), L(_, e, l), await j();
                }
            } catch (e) {
                P(_, e);
            } finally{
                if (I = !1, !z && s) {
                    const e = Math.max(0, s.get_reference_orbit_len());
                    (_ !== f || e < v || y) && h(f);
                }
            }
        }
    }
    C.onmessage = (_)=>{
        const e = _.data;
        try {
            switch(e.type){
                case "reset":
                    z || E_(e);
                    break;
                case "updateView":
                    s && e.jobId === f && (s.origin(e.cx, e.cy), s.scale(e.scale), s.angle(e.angle), v = e.maxIterations, y = !0, h(e.jobId));
                    break;
                case "setApproximationMode":
                    e.jobId === f && (J(e.approximationMode), u = 0, h(e.jobId));
                    break;
                case "setBlaEpsilon":
                    s && e.jobId === f && (s.set_bla_epsilon(e.blaEpsilon), u = 0, h(e.jobId));
                    break;
                case "dispose":
                    z = !0, s?.free(), s = void 0, C.close();
                    break;
            }
        } catch (n) {
            P("jobId" in e ? e.jobId : f, n);
        }
    };
    R({
        type: "ready"
    });
})();
