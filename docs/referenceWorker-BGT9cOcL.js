(async ()=>{
    var K = "" + new URL("mandelbrot_bg-DxN0Jrck.wasm", import.meta.url).href, X = async (t = {}, e)=>{
        let r;
        if (e.startsWith("data:")) {
            const n = e.replace(/^data:.*?base64,/, "");
            let a;
            if (typeof Buffer == "function" && typeof Buffer.from == "function") a = Buffer.from(n, "base64");
            else if (typeof atob == "function") {
                const i = atob(n);
                a = new Uint8Array(i.length);
                for(let o = 0; o < i.length; o++)a[o] = i.charCodeAt(o);
            } else throw new Error("Cannot decode base64-encoded data URL");
            r = await WebAssembly.instantiate(a, t);
        } else {
            const n = await fetch(e), a = n.headers.get("Content-Type") || "";
            if ("instantiateStreaming" in WebAssembly && a.startsWith("application/wasm")) r = await WebAssembly.instantiateStreaming(n, t);
            else {
                const i = await n.arrayBuffer();
                r = await WebAssembly.instantiate(i, t);
            }
        }
        return r.instance.exports;
    };
    class h {
        static __wrap(e) {
            const r = Object.create(h.prototype);
            return r.__wbg_ptr = e, U.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, U.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_blabufferinfo_free(e, 0);
        }
        get count() {
            return _.__wbg_get_blabufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        get level_count() {
            return _.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr) >>> 0;
        }
        get levels_ptr() {
            return _.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr) >>> 0;
        }
        get ptr() {
            return _.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set count(e) {
            _.__wbg_set_blabufferinfo_count(this.__wbg_ptr, e);
        }
        set level_count(e) {
            _.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr, e);
        }
        set levels_ptr(e) {
            _.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr, e);
        }
        set ptr(e) {
            _.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (h.prototype[Symbol.dispose] = h.prototype.free);
    class I {
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, W.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_mandelbrotnavigator_free(e, 0);
        }
        angle(e) {
            _.mandelbrotnavigator_angle(this.__wbg_ptr, e);
        }
        compute_bla_reference_ptr(e) {
            const r = _.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr, e);
            return h.__wrap(r);
        }
        compute_reference_orbit_chunk(e, r) {
            const n = _.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr, e, r);
            return w.__wrap(n);
        }
        compute_reference_orbit_ptr(e) {
            const r = _.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr, e);
            return w.__wrap(r);
        }
        get_approximation_mode() {
            return _.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr);
        }
        get_bla_epsilon() {
            return _.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr);
        }
        get_params() {
            const e = _.mandelbrotnavigator_get_params(this.__wbg_ptr);
            var r = z(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), r;
        }
        get_reference_orbit_capacity() {
            return _.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr) >>> 0;
        }
        get_reference_orbit_len() {
            return _.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr) >>> 0;
        }
        get_reference_params() {
            const e = _.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);
            var r = z(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), r;
        }
        constructor(e, r, n, a){
            const i = g(e, _.__wbindgen_malloc, _.__wbindgen_realloc), o = l, s = g(r, _.__wbindgen_malloc, _.__wbindgen_realloc), c = l, J = g(n, _.__wbindgen_malloc, _.__wbindgen_realloc), Y = l, H = _.mandelbrotnavigator_new(i, o, s, c, J, Y, a);
            return this.__wbg_ptr = H, W.register(this, this.__wbg_ptr, this), this;
        }
        origin(e, r) {
            const n = g(e, _.__wbindgen_malloc, _.__wbindgen_realloc), a = l, i = g(r, _.__wbindgen_malloc, _.__wbindgen_realloc), o = l;
            _.mandelbrotnavigator_origin(this.__wbg_ptr, n, a, i, o);
        }
        pixel_to_complex(e, r, n, a) {
            const i = _.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr, e, r, n, a);
            var o = z(i[0], i[1]).slice();
            return _.__wbindgen_free(i[0], i[1] * 4, 4), o;
        }
        reference_origin(e, r) {
            const n = g(e, _.__wbindgen_malloc, _.__wbindgen_realloc), a = l, i = g(r, _.__wbindgen_malloc, _.__wbindgen_realloc), o = l;
            _.mandelbrotnavigator_reference_origin(this.__wbg_ptr, n, a, i, o);
        }
        rotate(e) {
            _.mandelbrotnavigator_rotate(this.__wbg_ptr, e);
        }
        rotate_direct(e) {
            _.mandelbrotnavigator_rotate_direct(this.__wbg_ptr, e);
        }
        scale(e) {
            const r = g(e, _.__wbindgen_malloc, _.__wbindgen_realloc), n = l;
            _.mandelbrotnavigator_scale(this.__wbg_ptr, r, n);
        }
        set_bla_epsilon(e) {
            _.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr, e);
        }
        step() {
            const e = _.mandelbrotnavigator_step(this.__wbg_ptr);
            var r = z(e[0], e[1]).slice();
            return _.__wbindgen_free(e[0], e[1] * 4, 4), r;
        }
        translate(e, r) {
            _.mandelbrotnavigator_translate(this.__wbg_ptr, e, r);
        }
        translate_direct(e, r) {
            _.mandelbrotnavigator_translate_direct(this.__wbg_ptr, e, r);
        }
        use_bla() {
            _.mandelbrotnavigator_use_bla(this.__wbg_ptr);
        }
        use_perturbation() {
            _.mandelbrotnavigator_use_perturbation(this.__wbg_ptr);
        }
        zoom(e) {
            _.mandelbrotnavigator_zoom(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (I.prototype[Symbol.dispose] = I.prototype.free);
    class w {
        static __wrap(e) {
            const r = Object.create(w.prototype);
            return r.__wbg_ptr = e, D.register(r, r.__wbg_ptr, r), r;
        }
        __destroy_into_raw() {
            const e = this.__wbg_ptr;
            return this.__wbg_ptr = 0, D.unregister(this), e;
        }
        free() {
            const e = this.__destroy_into_raw();
            _.__wbg_orbitbufferinfo_free(e, 0);
        }
        get count() {
            return _.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr) >>> 0;
        }
        get offset() {
            return _.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr) >>> 0;
        }
        get ptr() {
            return _.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr) >>> 0;
        }
        set count(e) {
            _.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr, e);
        }
        set offset(e) {
            _.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr, e);
        }
        set ptr(e) {
            _.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr, e);
        }
    }
    Symbol.dispose && (w.prototype[Symbol.dispose] = w.prototype.free);
    function Z(t, e) {
        throw new Error(j(t, e));
    }
    function $(t) {
        return Math.exp(t);
    }
    function q() {
        return Date.now();
    }
    function G(t, e) {
        return j(t, e);
    }
    function Q() {
        const t = _.__wbindgen_externrefs, e = t.grow(4);
        t.set(0, void 0), t.set(e + 0, void 0), t.set(e + 1, null), t.set(e + 2, !0), t.set(e + 3, !1);
    }
    const U = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((t)=>_.__wbg_blabufferinfo_free(t, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((t)=>_.__wbg_blalevel_free(t, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((t)=>_.__wbg_blastep_free(t, 1));
    const W = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((t)=>_.__wbg_mandelbrotnavigator_free(t, 1));
    typeof FinalizationRegistry > "u" || new FinalizationRegistry((t)=>_.__wbg_mandelbrotstep_free(t, 1));
    const D = typeof FinalizationRegistry > "u" ? {
        register: ()=>{},
        unregister: ()=>{}
    } : new FinalizationRegistry((t)=>_.__wbg_orbitbufferinfo_free(t, 1));
    function z(t, e) {
        t = t >>> 0;
        const r = ee(), n = [];
        for(let a = t; a < t + 4 * e; a += 4)n.push(_.__wbindgen_externrefs.get(r.getUint32(a, !0)));
        return _.__externref_drop_slice(t, e), n;
    }
    let p = null;
    function ee() {
        return (p === null || p.buffer.detached === !0 || p.buffer.detached === void 0 && p.buffer !== _.memory.buffer) && (p = new DataView(_.memory.buffer)), p;
    }
    function j(t, e) {
        return _e(t >>> 0, e);
    }
    let R = null;
    function A() {
        return (R === null || R.byteLength === 0) && (R = new Uint8Array(_.memory.buffer)), R;
    }
    function g(t, e, r) {
        if (r === void 0) {
            const s = u.encode(t), c = e(s.length, 1) >>> 0;
            return A().subarray(c, c + s.length).set(s), l = s.length, c;
        }
        let n = t.length, a = e(n, 1) >>> 0;
        const i = A();
        let o = 0;
        for(; o < n; o++){
            const s = t.charCodeAt(o);
            if (s > 127) break;
            i[a + o] = s;
        }
        if (o !== n) {
            o !== 0 && (t = t.slice(o)), a = r(a, n, n = o + t.length * 3, 1) >>> 0;
            const s = A().subarray(a + o, a + n), c = u.encodeInto(t, s);
            o += c.written, a = r(a, n, o, 1) >>> 0;
        }
        return l = o, a;
    }
    let F = new TextDecoder("utf-8", {
        ignoreBOM: !0,
        fatal: !0
    });
    F.decode();
    const te = 2146435072;
    let k = 0;
    function _e(t, e) {
        return k += e, k >= te && (F = new TextDecoder("utf-8", {
            ignoreBOM: !0,
            fatal: !0
        }), F.decode(), k = e), F.decode(A().subarray(t, t + e));
    }
    const u = new TextEncoder;
    "encodeInto" in u || (u.encodeInto = function(t, e) {
        const r = u.encode(t);
        return e.set(r), {
            read: t.length,
            written: r.length
        };
    });
    let l = 0, _;
    function re(t) {
        _ = t;
    }
    URL = globalThis.URL;
    const ne = await X({
        "./mandelbrot_bg.js": {
            __wbg_now_190933fa139cc119: q,
            __wbg_exp_a8d3fe1b16ee4e89: $,
            __wbg___wbindgen_throw_1506f2235d1bdba0: Z,
            __wbindgen_init_externref_table: Q,
            __wbindgen_cast_0000000000000001: G
        }
    }, K), { memory: S, __wbg_blabufferinfo_free: oe, __wbg_blalevel_free: ae, __wbg_blastep_free: ie, __wbg_get_blabufferinfo_count: be, __wbg_get_blabufferinfo_level_count: se, __wbg_get_blabufferinfo_levels_ptr: le, __wbg_get_blabufferinfo_ptr: ge, __wbg_get_blastep_ax: fe, __wbg_get_blastep_ay: ce, __wbg_get_blastep_bx: pe, __wbg_get_blastep_by: we, __wbg_get_blastep_radius_alpha: de, __wbg_get_blastep_radius_beta: ue, __wbg_mandelbrotnavigator_free: me, __wbg_mandelbrotstep_free: ve, __wbg_orbitbufferinfo_free: ye, __wbg_set_blabufferinfo_count: he, __wbg_set_blabufferinfo_level_count: xe, __wbg_set_blabufferinfo_levels_ptr: ze, __wbg_set_blabufferinfo_ptr: Re, __wbg_set_blastep_ax: Ae, __wbg_set_blastep_ay: Fe, __wbg_set_blastep_bx: Me, __wbg_set_blastep_by: Se, __wbg_set_blastep_radius_alpha: Ee, __wbg_set_blastep_radius_beta: ke, mandelbrotnavigator_angle: Be, mandelbrotnavigator_compute_bla_reference_ptr: Ie, mandelbrotnavigator_compute_reference_orbit_chunk: Te, mandelbrotnavigator_compute_reference_orbit_ptr: Ce, mandelbrotnavigator_get_approximation_mode: Ue, mandelbrotnavigator_get_bla_epsilon: We, mandelbrotnavigator_get_params: De, mandelbrotnavigator_get_reference_orbit_capacity: Oe, mandelbrotnavigator_get_reference_orbit_len: Le, mandelbrotnavigator_get_reference_params: je, mandelbrotnavigator_new: Ne, mandelbrotnavigator_origin: Ve, mandelbrotnavigator_pixel_to_complex: Pe, mandelbrotnavigator_reference_origin: Je, mandelbrotnavigator_rotate: Ye, mandelbrotnavigator_rotate_direct: He, mandelbrotnavigator_scale: Ke, mandelbrotnavigator_set_bla_epsilon: Xe, mandelbrotnavigator_step: Ze, mandelbrotnavigator_translate: $e, mandelbrotnavigator_translate_direct: qe, mandelbrotnavigator_use_bla: Ge, mandelbrotnavigator_use_perturbation: Qe, mandelbrotnavigator_zoom: et, __wbg_get_mandelbrotstep_dx: tt, __wbg_get_mandelbrotstep_dy: _t, __wbg_get_mandelbrotstep_zx: rt, __wbg_get_mandelbrotstep_zy: nt, __wbg_set_blalevel__padding: ot, __wbg_set_blalevel_count: at, __wbg_set_blalevel_offset: it, __wbg_set_blalevel_skip: bt, __wbg_set_mandelbrotstep_dx: st, __wbg_set_mandelbrotstep_dy: lt, __wbg_set_mandelbrotstep_zx: gt, __wbg_set_mandelbrotstep_zy: ft, __wbg_set_orbitbufferinfo_count: ct, __wbg_set_orbitbufferinfo_offset: pt, __wbg_set_orbitbufferinfo_ptr: wt, __wbg_get_blalevel__padding: dt, __wbg_get_blalevel_count: ut, __wbg_get_blalevel_offset: mt, __wbg_get_blalevel_skip: vt, __wbg_get_orbitbufferinfo_count: yt, __wbg_get_orbitbufferinfo_offset: ht, __wbg_get_orbitbufferinfo_ptr: xt, __wbindgen_externrefs: zt, __externref_drop_slice: Rt, __wbindgen_free: At, __wbindgen_malloc: Ft, __wbindgen_realloc: Mt, __wbindgen_start: N } = ne;
    var St = Object.freeze({
        __proto__: null,
        __externref_drop_slice: Rt,
        __wbg_blabufferinfo_free: oe,
        __wbg_blalevel_free: ae,
        __wbg_blastep_free: ie,
        __wbg_get_blabufferinfo_count: be,
        __wbg_get_blabufferinfo_level_count: se,
        __wbg_get_blabufferinfo_levels_ptr: le,
        __wbg_get_blabufferinfo_ptr: ge,
        __wbg_get_blalevel__padding: dt,
        __wbg_get_blalevel_count: ut,
        __wbg_get_blalevel_offset: mt,
        __wbg_get_blalevel_skip: vt,
        __wbg_get_blastep_ax: fe,
        __wbg_get_blastep_ay: ce,
        __wbg_get_blastep_bx: pe,
        __wbg_get_blastep_by: we,
        __wbg_get_blastep_radius_alpha: de,
        __wbg_get_blastep_radius_beta: ue,
        __wbg_get_mandelbrotstep_dx: tt,
        __wbg_get_mandelbrotstep_dy: _t,
        __wbg_get_mandelbrotstep_zx: rt,
        __wbg_get_mandelbrotstep_zy: nt,
        __wbg_get_orbitbufferinfo_count: yt,
        __wbg_get_orbitbufferinfo_offset: ht,
        __wbg_get_orbitbufferinfo_ptr: xt,
        __wbg_mandelbrotnavigator_free: me,
        __wbg_mandelbrotstep_free: ve,
        __wbg_orbitbufferinfo_free: ye,
        __wbg_set_blabufferinfo_count: he,
        __wbg_set_blabufferinfo_level_count: xe,
        __wbg_set_blabufferinfo_levels_ptr: ze,
        __wbg_set_blabufferinfo_ptr: Re,
        __wbg_set_blalevel__padding: ot,
        __wbg_set_blalevel_count: at,
        __wbg_set_blalevel_offset: it,
        __wbg_set_blalevel_skip: bt,
        __wbg_set_blastep_ax: Ae,
        __wbg_set_blastep_ay: Fe,
        __wbg_set_blastep_bx: Me,
        __wbg_set_blastep_by: Se,
        __wbg_set_blastep_radius_alpha: Ee,
        __wbg_set_blastep_radius_beta: ke,
        __wbg_set_mandelbrotstep_dx: st,
        __wbg_set_mandelbrotstep_dy: lt,
        __wbg_set_mandelbrotstep_zx: gt,
        __wbg_set_mandelbrotstep_zy: ft,
        __wbg_set_orbitbufferinfo_count: ct,
        __wbg_set_orbitbufferinfo_offset: pt,
        __wbg_set_orbitbufferinfo_ptr: wt,
        __wbindgen_externrefs: zt,
        __wbindgen_free: At,
        __wbindgen_malloc: Ft,
        __wbindgen_realloc: Mt,
        __wbindgen_start: N,
        mandelbrotnavigator_angle: Be,
        mandelbrotnavigator_compute_bla_reference_ptr: Ie,
        mandelbrotnavigator_compute_reference_orbit_chunk: Te,
        mandelbrotnavigator_compute_reference_orbit_ptr: Ce,
        mandelbrotnavigator_get_approximation_mode: Ue,
        mandelbrotnavigator_get_bla_epsilon: We,
        mandelbrotnavigator_get_params: De,
        mandelbrotnavigator_get_reference_orbit_capacity: Oe,
        mandelbrotnavigator_get_reference_orbit_len: Le,
        mandelbrotnavigator_get_reference_params: je,
        mandelbrotnavigator_new: Ne,
        mandelbrotnavigator_origin: Ve,
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
        mandelbrotnavigator_zoom: et,
        memory: S
    });
    re(St);
    N();
    const T = self;
    let b, f = 0, x = !1, d = 0, m = 0, B = !1, v = !1, M = "", C = "";
    const Et = 1e3;
    function E(t, e) {
        T.postMessage(t, e ?? []);
    }
    function O() {
        return new Promise((t)=>setTimeout(t, 0));
    }
    function V(t, e) {
        const r = e instanceof Error ? e.message : String(e);
        E({
            type: "error",
            jobId: t,
            message: r
        });
    }
    function P(t) {
        b && (t === "bla" ? b.use_bla() : b.use_perturbation());
    }
    function kt(t) {
        b?.free(), b = new I(t.cx, t.cy, t.scale, t.angle), f = t.jobId, d = 0, m = t.maxIterations, v = !1, M = "", C = "", P(t.approximationMode), b.set_bla_epsilon(t.blaEpsilon), y(t.jobId);
    }
    function Bt(t, e, r) {
        const a = Math.max(0, r - e), i = new Float32Array(S.buffer, t + e * 4 * Float32Array.BYTES_PER_ELEMENT, a * 4), o = new Float32Array(i.length);
        return o.set(i), o;
    }
    function L(t, e, r) {
        if (!b || t !== f || x || d >= e || r < e || b.get_approximation_mode() !== 1) return;
        const n = b.compute_bla_reference_ptr(e), a = new Float32Array(S.buffer, n.ptr, n.count * 6), i = new Float32Array(a.length);
        i.set(a);
        const o = new Uint32Array(S.buffer, n.levels_ptr, n.level_count * 4), s = new Uint32Array(o.length);
        s.set(o), d = e, E({
            type: "blaReady",
            jobId: t,
            maxIterations: e,
            steps: i,
            levels: s,
            levelCount: n.level_count
        }, [
            i.buffer,
            s.buffer
        ]);
    }
    async function y(t) {
        if (!B) {
            B = !0;
            try {
                for(; !x && b && t === f;){
                    const e = m, r = Math.max(0, b.get_reference_orbit_len());
                    if (r >= e && !v) {
                        if (L(t, e, r), await O(), m <= e) break;
                        continue;
                    }
                    const n = b.compute_reference_orbit_chunk(Et, e);
                    v = !1;
                    const a = Bt(n.ptr, n.offset, n.count), [i, o] = b.get_reference_params();
                    M && (i !== M || o !== C) && (d = 0, E({
                        type: "referenceReset",
                        jobId: t,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: o
                    })), M = i, C = o;
                    const s = Math.max(0, n.count - 1);
                    E({
                        type: "orbitChunk",
                        jobId: t,
                        offset: n.offset,
                        count: n.count,
                        maxIterations: e,
                        referenceCx: i,
                        referenceCy: o,
                        orbit: a
                    }, [
                        a.buffer
                    ]), L(t, e, s), await O();
                }
            } catch (e) {
                V(t, e);
            } finally{
                B = !1, !x && b && t === f && (Math.max(0, b.get_reference_orbit_len()) < m || v) && y(t);
            }
        }
    }
    T.onmessage = (t)=>{
        const e = t.data;
        try {
            switch(e.type){
                case "reset":
                    x || kt(e);
                    break;
                case "updateView":
                    b && e.jobId === f && (b.origin(e.cx, e.cy), b.scale(e.scale), b.angle(e.angle), m = e.maxIterations, v = !0, y(e.jobId));
                    break;
                case "setApproximationMode":
                    e.jobId === f && (P(e.approximationMode), d = 0, y(e.jobId));
                    break;
                case "setBlaEpsilon":
                    b && e.jobId === f && (b.set_bla_epsilon(e.blaEpsilon), d = 0, y(e.jobId));
                    break;
                case "dispose":
                    x = !0, b?.free(), b = void 0, T.close();
                    break;
            }
        } catch (r) {
            V("jobId" in e ? e.jobId : f, r);
        }
    };
})();
