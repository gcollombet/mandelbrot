import { interpolateLab } from 'd3-interpolate';
import { rgb } from 'd3-color';
import type {ColorStop} from "./ColorStop.ts";


export class Palette {
  points: ColorStop[];

  constructor(points: ColorStop[]) {
    this.points = points.slice().sort((a, b) => a.position - b.position);
  }

  getColorAt(t: number): string {
    if (this.points.length === 0) return '#000';
    if (t <= this.points[0].position) return this.points[0].color;
    if (t >= this.points[this.points.length - 1].position) return this.points[this.points.length - 1].color;
    for (let i = 0; i < this.points.length - 1; ++i) {
      const a = this.points[i];
      const b = this.points[i + 1];
      if (t >= a.position && t <= b.position) {
        const localT = (t - a.position) / (b.position - a.position);
        const interp = interpolateLab(a.color, b.color);
        return rgb(interp(localT)).formatHex();
      }
    }
    return '#000';
  }

  generateTexture(): ImageData {
    const width = 4096;
    const height = 1;
    const imageData = new ImageData(width, height);
    for (let x = 0; x < width; ++x) {
      const t = x / (width - 1);
      const color = rgb(this.getColorAt(t));
      const idx = x * 4;
      imageData.data[idx] = color.r;
      imageData.data[idx + 1] = color.g;
      imageData.data[idx + 2] = color.b;
      imageData.data[idx + 3] = 255;
    }
    return imageData;
  }
}

