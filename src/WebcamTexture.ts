export class WebcamTexture {
    private video: HTMLVideoElement;
    private stream: MediaStream | null = null;
    private width: number;
    private height: number;
    private lastDrawTime: number = 0;
    private open: boolean = false;

    constructor(width: number = 1024, height: number = 1024) {
        this.width = width;
        this.height = height;
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.muted = true;
        this.video.width = width;
        this.video.height = height;
    }

    isOpen(): boolean {
        return this.open
    }

    async openWebcam(): Promise<void> {
        if (this.open) return
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: this.width },
                    height: { ideal: this.height },
                }
            });
            this.video.srcObject = this.stream;
            await this.video.play();
            this.width = this.video.videoWidth || this.width;
            this.height = this.video.videoHeight || this.height;
            this.open = true;
        } catch (e) {
            this.stream = null;
            this.open = false;
            console.warn('Webcam unavailable:', e);
        }
    }

    async drawWebGPUTexture(texture: GPUTexture, device: GPUDevice) {
        if (!this.open) return
        const now = performance.now();
        if (now - this.lastDrawTime > 15) {
            if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                return;
            }
            const copyW = Math.min(this.width, texture.width);
            const copyH = Math.min(this.height, texture.height);
            device.queue.copyExternalImageToTexture(
                { source: this.video },
                { texture: texture },
                [copyW, copyH]
            );
            this.lastDrawTime = now;
        }
    }

    closeWebcam() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.open = false;
    }
}
