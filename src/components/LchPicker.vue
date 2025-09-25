<script setup lang="ts">
import { ref, onMounted } from 'vue';
import * as d3 from 'd3';

const props = defineProps<{
  modelValue: { l: number, c: number, h: number },
  width?: number,
}>();
const emit = defineEmits(['update:modelValue']);

const container = ref<HTMLDivElement | null>(null);
const width = props.width ?? 450;
const height = 30;

function renderPicker() {
  if (!container.value) return;
  container.value.innerHTML = '';
  const channels: Channel[] = [
    { name: 'l', domain: [0, 150] },
    { name: 'c', domain: [0, 100] },
    { name: 'h', domain: [0, 360] },
  ];
  const pickerNode = picker(
    channels,
    { ...props.modelValue },
    width,
    height,
    (newColor: LCHColor, _dragState: boolean) => {
      emit('update:modelValue', newColor);
    }
  );
  if (pickerNode) container.value.appendChild(pickerNode);
}

onMounted(() => {
  renderPicker();
});


type ChannelName = 'l' | 'c' | 'h';
type Channel = {
  name: ChannelName;
  domain: [number, number];
  scale?: d3.ScaleLinear<number, number>;
  removeLastTick?: boolean;
  x?: number;
};

interface LCHColor {
  l: number;
  c: number;
  h: number;
}

function picker(
  channels: Channel[],
  color: LCHColor,
  width: number,
  height: number,
  onInput: (newColor: LCHColor, dragState: boolean, changedChannel: ChannelName) => void
): HTMLElement {
  const current = { ...color };
  channels = channels.map(({ name, domain }: { name: ChannelName; domain: [number, number] }) => ({
    name,
    domain,
    scale: d3.scaleLinear().domain(domain).range([0, width])
  }));
  for (const d of channels) d.x = Math.round(d.scale!(current[d.name]));
  const wrapper = d3.create('div');
  const white = d3.rgb('white');
  const black = d3.rgb('black');
  const channel = wrapper.selectAll('div').data(channels).join('div');
  const ctx = d3.local<{ context: CanvasRenderingContext2D, image: ImageData, data: Uint8ClampedArray }>();
  const canvas = channel
    .append('canvas')
    .attr('width', width)
    .attr('height', 1)
    .style('max-width', '100%')
    .style('width', `${width}px`)
    .style('height', `${height}px`)
    .each(function(this: HTMLCanvasElement) {
      const context = this.getContext('2d')!;
      const image = context.createImageData(width, 1);
      ctx.set(this, { context, image, data: image.data });
    })
    .each(function(this: HTMLCanvasElement, d: Channel) { render.call(this, d); })
    .on('click', function(event, d: Channel) {
      // Calculer la position x du clic relatif au canvas
      const rect = this.getBoundingClientRect();
      const x = event.clientX - rect.left;
      // Mettre à jour la valeur de la channel
      d.x = Math.max(0, Math.min(width - 1, x));
      current[d.name] = d.scale!.invert(d.x);
      // Re-rendre tous les canvas
      canvas.each(function(this: HTMLCanvasElement, d: Channel) { render.call(this, d); });
      // Emettre l'événement d'input immédiatement
      onInput({ ...current }, false, d.name);
    });
  channel.each(function(d: Channel, i: number) {
    const node = this as HTMLElement;
    d3.select(node).select('canvas').call(
      d3.drag<HTMLCanvasElement, Channel>()
        .subject(function(event) {
          // Commencer le drag exactement à la position du curseur
          return { x: d.x ?? 0, y: 0 };
        })
        .on('start', function() {
          onInput({ ...current }, true, d.name);
        })
        .on('drag', function(event) {
          d.x = Math.max(1, Math.min(width - 1, event.x));
          current[d.name] = d.scale!.invert(d.x);
          canvas.each(function(this: HTMLCanvasElement, d: Channel) { render.call(this, d); });
          onInput({ ...current }, true, d.name);
        })
        .on('end', function(event) {
          d.x = Math.max(1, Math.min(width - 1, event.x));
          current[d.name] = d.scale!.invert(d.x);
          canvas.each(function(this: HTMLCanvasElement, d: Channel) { render.call(this, d); });
          onInput({ ...current }, false, d.name);
        })
    );
  });
  function render(this: HTMLCanvasElement, d: Channel) {
    const ctxVal = ctx.get(this)!;
    const { context, image, data } = ctxVal;
    for (let x = 0, i = -1; x < width; ++x) {
      let c;
      if (x === Math.round(d.x!)) c = white;
      else if (x === Math.round(d.x!) - 1) c = black;
      else {
        const preview = { ...current };
        preview[d.name] = d.scale!.invert(x);
        c = d3.rgb(d3.lch(preview.l, preview.c, preview.h));
      }
      data[++i] = c.r;
      data[++i] = c.g;
      data[++i] = c.b;
      data[++i] = 255;
    }
    context.putImageData(image, 0, 0);
  }
  channel
    .append('svg')
    .attr('width', width)
    .attr('height', 20)
    .attr('viewBox', [0, 0, width, 20])
    .style('max-width', '100%')
    .style('overflow', 'visible')
    .append('g')
    .each(function(this: SVGGElement, d: Channel) {
      d3.select(this).call(
        d3.axisBottom(d.scale!).ticks(Math.min(width / 80, 10))
      );
    })
    .append('text')
    .attr('x', width)
    .attr('y', 9)
    .attr('dy', '.72em')
    .style('text-anchor', 'middle')
    .style('text-transform', 'uppercase')
    .attr('fill', 'currentColor')
    .text((d: Channel) => d.name);
  return wrapper.node() as HTMLElement;
}
</script>

<template>
  <div ref="container"></div>
</template>
