import {
  Fragment,
  Teleport,
  Transition,
  computed,
  createApp,
  createBaseVNode,
  createBlock,
  createCommentVNode,
  createElementBlock,
  createVNode,
  defineComponent,
  h,
  mergeProps,
  nextTick,
  normalizeClass,
  onMounted,
  onUnmounted,
  openBlock,
  reactive,
  ref,
  renderList,
  toDisplayString,
  unref,
  vShow,
  withCtx,
  withDirectives,
  withModifiers
} from "./chunk-JLJ73CPZ.js";

// node_modules/@miletorix/vitepress-image-viewer/dist/image-viewer.es.js
var Xe = { class: "iv-controls" };
var $e = { class: "iv-left" };
var je = {
  class: "iv-counter",
  title: "Position in gallery"
};
var Fe = {
  class: "iv-buttons",
  role: "toolbar",
  "aria-label": "Image viewer controls"
};
var Ke = ["disabled"];
var Ue = ["disabled"];
var Ge = ["disabled"];
var Je = ["title"];
var Qe = { class: "iv-side-nav" };
var et = ["disabled"];
var tt = ["disabled"];
var nt = ["src"];
var ot = {
  key: 0,
  class: "iv-caption",
  role: "note"
};
var at = {
  key: 0,
  class: "iv-thumbs-bottom",
  role: "region",
  "aria-label": "Thumbnails panel"
};
var lt = { class: "iv-thumbs-inner" };
var st = ["onClick"];
var it = ["src"];
var V = 0.5;
var H = 3;
var I = 1e-3;
var rt = 300;
var ut = defineComponent({
  __name: "ImageViewer",
  props: {
    autoShowThumbnails: { type: Boolean }
  },
  setup(h2, { expose: x }) {
    const u = h2, p = computed(() => u.autoShowThumbnails !== false), f = ref(false), w = ref(""), c = ref(""), s = ref(1), l = reactive({ x: 0, y: 0 }), _ = ref(false), q = ref(false), P = ref({ x: 0, y: 0 }), O = ref(0), K = computed(() => s.value < H - I), U = computed(() => s.value > V + I), fe = computed(() => Math.abs(s.value - 1) > I || Math.abs(l.x) > I || Math.abs(l.y) > I), we = ref(null), y = ref(window.innerWidth < 768), g = ref(
      !y.value && p.value
    ), i = ref([]), a = ref(-1);
    let E = ref(0), z = null;
    const k = ref("iv-fade");
    function G(e) {
      const t = [
        "nav",
        "header",
        ".navbar",
        ".site-logo",
        ".logo",
        ".vp-nav",
        ".vp-site-logo",
        ".theme-toggle",
        ".vp-navbar",
        ".link-card-logo",
        ".thumb"
      ], o = document.querySelector("main, article, .content, .vp-doc, .theme-doc, #main"), b = Array.from((e ?? o ?? document).querySelectorAll("img:not(.no-viewer)")), M = 60, S = b.filter((d) => {
        for (const L of t)
          if (d.closest(L)) return false;
        return !(!d.src || d.classList.contains("iv-thumb") || d.naturalWidth > 0 && d.naturalHeight > 0 && d.naturalWidth < M && d.naturalHeight < M);
      }), B = /* @__PURE__ */ new Set(), ce = [];
      S.forEach((d) => {
        const L = (d.currentSrc || d.src).split("#")[0];
        if (!B.has(L)) {
          B.add(L);
          const ze = d.getAttribute("alt") ?? "";
          ce.push({ src: L, alt: ze });
        }
      }), i.value = ce;
    }
    function ge() {
      document.body.style.overflow = "hidden";
    }
    function pe() {
      document.body.style.overflow = "";
    }
    async function be(e, t = "", o) {
      z = o?.closest("main, article, .content, .vp-doc, .theme-doc, #main") ?? document.querySelector("main, article, .content, .vp-doc, .theme-doc, #main") ?? null, G(z ?? void 0), k.value = "iv-fade";
      const b = (e || "").split("#")[0], M = o?.getAttribute("alt") ?? t ?? "";
      let S = i.value.findIndex((B) => B.src === b);
      S === -1 && (i.value.unshift({ src: b, alt: M }), S = 0), a.value = S, w.value = i.value[a.value].src, c.value = M || i.value[a.value].alt || "", s.value = 1, l.x = 0, l.y = 0, f.value = true, ge(), O.value = Date.now(), await nextTick(), y.value || (g.value = p.value && window.innerHeight > 800);
    }
    x({ open: be, visible: f });
    function N() {
      f.value = false, pe(), O.value = Date.now(), g.value = !y.value && p.value, k.value = "iv-fade", setTimeout(() => {
        w.value = "", c.value = "", a.value = -1, i.value = [], z = null, s.value = 1, l.x = 0, l.y = 0;
      }, rt + 20);
    }
    function xe() {
      Date.now() - O.value < 300 || N();
    }
    function J() {
      s.value = 1, l.x = 0, l.y = 0, q.value = false;
    }
    function ye() {
      K.value && (s.value = Math.min(s.value + 0.1, H));
    }
    function ke() {
      U.value && (s.value = Math.max(s.value - 0.1, V));
    }
    function _e(e) {
      const t = e.deltaY > 0 ? -0.1 : 0.1, o = s.value + t;
      s.value = Math.min(H, Math.max(V, o));
    }
    function Q(e) {
      _.value = true, q.value = false;
      const t = "touches" in e ? e.touches[0] : e;
      P.value = { x: t.clientX - l.x, y: t.clientY - l.y }, window.addEventListener("mousemove", A), window.addEventListener("mouseup", D), window.addEventListener("touchmove", A, { passive: false }), window.addEventListener("touchend", D);
    }
    function A(e) {
      if (!_.value) return;
      const t = "touches" in e ? e.touches[0] : e;
      l.x = t.clientX - P.value.x, l.y = t.clientY - P.value.y, q.value = true, e.preventDefault();
    }
    function D() {
      _.value = false, window.removeEventListener("mousemove", A), window.removeEventListener("mouseup", D), window.removeEventListener("touchmove", A), window.removeEventListener("touchend", D);
    }
    function Ce() {
      G(z ?? void 0), g.value = !g.value;
    }
    function R(e) {
      e < 0 || e >= i.value.length || (a.value === -1 ? k.value = "iv-fade" : e > a.value ? k.value = "iv-slide-left" : e < a.value ? k.value = "iv-slide-right" : k.value = "iv-fade", a.value = e, w.value = i.value[e].src, c.value = i.value[e].alt || "", J());
    }
    const ee = computed(() => a.value > 0), te = computed(() => a.value >= 0 && a.value < i.value.length - 1);
    function ne() {
      i.value.length && ee.value && R(a.value - 1);
    }
    function oe() {
      i.value.length && te.value && R(a.value + 1);
    }
    function ae(e) {
      f.value && (e.key === "Escape" ? N() : e.key === "ArrowLeft" ? ne() : e.key === "ArrowRight" && oe());
    }
    let W = 0, le = 1;
    function se(e) {
      const [t, o] = [e[0], e[1]], v = o.clientX - t.clientX, b = o.clientY - t.clientY;
      return Math.sqrt(v * v + b * b);
    }
    function ie(e) {
      e.touches.length === 2 && (W = se(e.touches), le = s.value);
    }
    function re(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const o = se(e.touches) / W;
        s.value = Math.min(
          H,
          Math.max(V, le * o)
        );
      }
    }
    function ue(e) {
      e.touches.length < 2 && (W = 0);
    }
    function Ee() {
      const e = document.createElement("a");
      e.href = w.value, e.download = c.value || "image", e.click();
    }
    const Me = computed(() => g.value ? y.value ? "70vh" : "68vh" : "80vh"), Se = computed(() => ({
      transform: `translate(${l.x}px, ${l.y}px) scale(${s.value})`,
      transition: _.value ? "none" : "transform 0.28s ease, opacity 0.22s ease",
      cursor: _.value ? "grabbing" : "grab",
      zIndex: 9999,
      maxHeight: Me.value
    })), Le = computed(() => i.value.length), Te = computed(() => a.value >= 0 ? a.value + 1 : 0), Ie = computed(() => {
      const e = i.value.length;
      if (!e || a.value < 0) return [];
      if (!y.value)
        return E.value = 0, i.value;
      const t = 1, o = t * 2 + 1;
      let v = Math.max(0, a.value - t);
      return v + o > e && (v = Math.max(0, e - o)), E.value = v, i.value.slice(v, v + o);
    });
    function ve() {
      const e = window.innerWidth < 768;
      y.value !== e && (y.value = e, g.value = !e && p.value);
    }
    return onMounted(() => {
      window.addEventListener("keydown", ae), window.addEventListener("touchstart", ie, { passive: false }), window.addEventListener("touchmove", re, { passive: false }), window.addEventListener("touchend", ue), window.addEventListener("resize", ve);
    }), onUnmounted(() => {
      window.removeEventListener("keydown", ae), window.removeEventListener("touchstart", ie), window.removeEventListener("touchmove", re), window.removeEventListener("touchend", ue), window.removeEventListener("resize", ve);
    }), (e, t) => (openBlock(), createBlock(Teleport, { to: "body" }, [
      createVNode(Transition, { name: "iv-fade" }, {
        default: withCtx(() => [
          withDirectives(createBaseVNode("div", {
            class: "iv-overlay",
            onClick: withModifiers(xe, ["self"]),
            onWheel: withModifiers(_e, ["prevent"])
          }, [
            createBaseVNode("div", Xe, [
              createBaseVNode("div", $e, [
                createBaseVNode("div", je, toDisplayString(Te.value) + " / " + toDisplayString(Le.value), 1)
              ]),
              createBaseVNode("div", Fe, [
                createBaseVNode("button", {
                  onClick: ke,
                  disabled: !U.value,
                  "aria-label": "Zoom out",
                  title: "Zoom out"
                }, [...t[0] || (t[0] = [
                  createBaseVNode("svg", {
                    class: "iv-icon",
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 24 24"
                  }, [
                    createBaseVNode("path", {
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "stroke-width": "1.5",
                      d: "m21 21l-4.343-4.343m0 0A8 8 0 1 0 5.343 5.343a8 8 0 0 0 11.314 11.314M8 11h6"
                    })
                  ], -1)
                ])], 8, Ke),
                createBaseVNode("button", {
                  onClick: ye,
                  disabled: !K.value,
                  "aria-label": "Zoom in",
                  title: "Zoom in"
                }, [...t[1] || (t[1] = [
                  createBaseVNode("svg", {
                    class: "iv-icon",
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 24 24"
                  }, [
                    createBaseVNode("path", {
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "stroke-width": "1.5",
                      d: "m21 21l-4.343-4.343m0 0A8 8 0 1 0 5.343 5.343a8 8 0 0 0 11.314 11.314M11 8v6m-3-3h6"
                    })
                  ], -1)
                ])], 8, Ue),
                createBaseVNode("button", {
                  onClick: J,
                  disabled: !fe.value,
                  "aria-label": "Reset",
                  title: "Reset"
                }, [...t[2] || (t[2] = [
                  createBaseVNode("svg", {
                    class: "iv-icon",
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 1024 1024"
                  }, [
                    createBaseVNode("path", {
                      fill: "currentColor",
                      d: "M813.176 180.706a60.235 60.235 0 0 1 60.236 60.235v481.883a60.235 60.235 0 0 1-60.236 60.235H210.824a60.235 60.235 0 0 1-60.236-60.235V240.94a60.235 60.235 0 0 1 60.236-60.235h602.352zm0-60.235H210.824A120.47 120.47 0 0 0 90.353 240.94v481.883a120.47 120.47 0 0 0 120.47 120.47h602.353a120.47 120.47 0 0 0 120.471-120.47V240.94a120.47 120.47 0 0 0-120.47-120.47zm-120.47 180.705a30.12 30.12 0 0 0-30.118 30.118v301.177a30.118 30.118 0 0 0 60.236 0V331.294a30.12 30.12 0 0 0-30.118-30.118m-361.412 0a30.12 30.12 0 0 0-30.118 30.118v301.177a30.118 30.118 0 1 0 60.236 0V331.294a30.12 30.12 0 0 0-30.118-30.118M512 361.412a30.12 30.12 0 0 0-30.118 30.117v30.118a30.118 30.118 0 0 0 60.236 0V391.53A30.12 30.12 0 0 0 512 361.412M512 512a30.12 30.12 0 0 0-30.118 30.118v30.117a30.118 30.118 0 0 0 60.236 0v-30.117A30.12 30.12 0 0 0 512 512"
                    })
                  ], -1)
                ])], 8, Ge),
                createBaseVNode("button", {
                  onClick: Ce,
                  "aria-label": "Toggle thumbnails",
                  title: g.value ? "Hide thumbnails" : "Show thumbnails"
                }, [...t[3] || (t[3] = [
                  createBaseVNode("svg", {
                    class: "iv-icon",
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 32 32"
                  }, [
                    createBaseVNode("path", {
                      fill: "currentColor",
                      d: "M8 30H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2m-4-6v4h4v-4zm14 6h-4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2m-4-6v4h4v-4zm14 6h-4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2m-4-6v4h4v-4zm4-4H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2M4 4v14h24V4z"
                    })
                  ], -1)
                ])], 8, Je),
                createBaseVNode("button", {
                  onClick: Ee,
                  "aria-label": "Download",
                  title: "Download"
                }, [...t[4] || (t[4] = [
                  createBaseVNode("svg", {
                    class: "iv-icon",
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 32 32"
                  }, [
                    createBaseVNode("path", {
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "stroke-width": "2",
                      d: "M9 22c-9 1-8-10 0-9C6 2 23 2 22 10c10-3 10 13 1 12m-12 4l5 4l5-4m-5-10v14"
                    })
                  ], -1)
                ])]),
                createBaseVNode("button", {
                  onClick: N,
                  "aria-label": "Close",
                  title: "Close"
                }, [...t[5] || (t[5] = [
                  createBaseVNode("svg", {
                    class: "iv-icon",
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 24 24"
                  }, [
                    createBaseVNode("path", {
                      fill: "currentColor",
                      d: "m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"
                    })
                  ], -1)
                ])])
              ])
            ]),
            createBaseVNode("div", Qe, [
              createBaseVNode("button", {
                class: "iv-side iv-side-left",
                onClick: ne,
                disabled: !ee.value,
                "aria-label": "Previous"
              }, [...t[6] || (t[6] = [
                createBaseVNode("svg", {
                  xmlns: "http://www.w3.org/2000/svg",
                  width: "32",
                  height: "32",
                  viewBox: "0 0 24 24"
                }, [
                  createBaseVNode("path", {
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2",
                    d: "M22 12H2m9-9l-9 9l9 9"
                  })
                ], -1)
              ])], 8, et),
              createBaseVNode("button", {
                class: "iv-side iv-side-right",
                onClick: oe,
                disabled: !te.value,
                "aria-label": "Next"
              }, [...t[7] || (t[7] = [
                createBaseVNode("svg", {
                  xmlns: "http://www.w3.org/2000/svg",
                  width: "32",
                  height: "32",
                  viewBox: "0 0 24 24"
                }, [
                  createBaseVNode("path", {
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2",
                    d: "M2 12h20m-9-9l9 9l-9 9"
                  })
                ], -1)
              ])], 8, tt)
            ]),
            createVNode(Transition, {
              name: k.value,
              mode: "out-in"
            }, {
              default: withCtx(() => [
                w.value ? (openBlock(), createElementBlock("div", {
                  key: w.value + "-" + a.value,
                  class: "iv-image-wrap"
                }, [
                  createBaseVNode("img", mergeProps({
                    ref_key: "animatedImage",
                    ref: we,
                    src: w.value
                  }, c.value ? { alt: c.value } : {}, {
                    class: "iv-image",
                    style: Se.value,
                    onMousedown: Q,
                    onTouchstart: Q,
                    draggable: "false"
                  }), null, 16, nt)
                ])) : createCommentVNode("", true)
              ]),
              _: 1
            }, 8, ["name"]),
            !g.value && c.value ? (openBlock(), createElementBlock("div", ot, toDisplayString(c.value), 1)) : createCommentVNode("", true),
            createVNode(Transition, { name: "iv-slide-up" }, {
              default: withCtx(() => [
                g.value ? (openBlock(), createElementBlock("div", at, [
                  createBaseVNode("div", lt, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(Ie.value, (o, v) => (openBlock(), createElementBlock("div", {
                      key: o.src + "_" + (unref(E) + v),
                      class: normalizeClass(["iv-thumb", { active: unref(E) + v === a.value }]),
                      onClick: (b) => R(unref(E) + v),
                      role: "button",
                      tabindex: "0"
                    }, [
                      createBaseVNode("img", mergeProps({
                        src: o.src
                      }, { ref_for: true }, o.alt ? { alt: o.alt } : {}), null, 16, it)
                    ], 10, st))), 128))
                  ])
                ])) : createCommentVNode("", true)
              ]),
              _: 1
            })
          ], 544), [
            [vShow, f.value]
          ])
        ]),
        _: 1
      })
    ]));
  }
});
var vt = (h2, x) => {
  const u = h2.__vccOpts || h2;
  for (const [p, f] of x)
    u[p] = f;
  return u;
};
var ct = vt(ut, [["__scopeId", "data-v-945cd8c0"]]);
function dt(h2) {
  document.querySelectorAll("img:not(.no-viewer)").forEach((u) => {
    u.dataset.viewerBound !== "true" && (u.style.cursor = "zoom-in", u.addEventListener("click", () => {
      h2 && typeof h2.open == "function" && !h2.visible && h2.open(u.src, u.alt || "", u);
    }), u.dataset.viewerBound = "true");
  });
}
function ht(h2, x = {}) {
  if (typeof window > "u" || window.__vitepress_image_viewer_installed) return;
  window.__vitepress_image_viewer_installed = true;
  const u = document.createElement("div");
  document.body.appendChild(u);
  const p = document.documentElement.style, f = x.transparentBg !== false, w = x.autoShowThumbnails !== false;
  p.setProperty(
    "--iv-overlay-bg",
    f ? "rgba(0, 0, 0, 0.75)" : "var(--vp-code-block-bg)"
  );
  const c = ref(null);
  createApp({
    render: () => h(ct, {
      ref: c,
      autoShowThumbnails: w
    })
  }).mount(u);
  const l = () => {
    nextTick(() => {
      dt(c.value);
    });
  };
  l(), new MutationObserver(() => {
    l();
  }).observe(document.querySelector("#app"), {
    childList: true,
    subtree: true
  });
}
export {
  ht as default
};
//# sourceMappingURL=@miletorix_vitepress-image-viewer.js.map
