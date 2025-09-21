// WebcamTexture.ts
// Classe pour gérer la webcam et extraire une image comme texture WebGPU

export class WebcamTexture {
    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private stream: MediaStream | null = null;
    private width: number;
    private height: number;

    constructor(width: number = 1024, height: number = 1024) {
        this.width = width;
        this.height = height;
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.width = width;
        this.video.height = height;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Impossible de créer le contexte 2D du canvas');
        this.ctx = ctx;
    }

    async openWebcam(): Promise<void> {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: this.width, height: this.height } });
        this.video.srcObject = this.stream;
        await this.video.play();
    }

    // Capture l'image courante de la webcam dans le canvas
    captureFrame(): ImageData {
        this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
        return this.ctx.getImageData(0, 0, this.width, this.height);
    }

    // Crée une texture WebGPU à partir de l'image courante
    async createWebGPUTexture(device: GPUDevice): Promise<GPUTexture> {
        this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
        const imageBitmap = await createImageBitmap(this.canvas);
        const texture = device.createTexture({
            size: [this.width, this.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: texture },
            [this.width, this.height]
        );
        return texture;
    }

    // Nettoie la webcam
    closeWebcam() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}

