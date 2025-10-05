// WebcamTexture.ts
// Classe pour gérer la webcam et extraire une image comme texture WebGPU

export class WebcamTexture {
    private video: HTMLVideoElement;
    private stream: MediaStream | null = null;
    private width: number;
    private height: number;
    private lastDrawTime: number = 0;

    constructor(width: number = 1024, height: number = 1024) {
        this.width = width;
        this.height = height;
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.width = width;
        this.video.height = height;
    }

    async openWebcam(): Promise<void> {
        if(!this.stream) {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: this.width, height: this.height } });
            this.video.srcObject = this.stream;
            await this.video.play();
        }
    }

    // Crée une texture WebGPU à partir de l'image courante
    async drawWebGPUTexture(texture: GPUTexture, device: GPUDevice) {
        const now = performance.now();
        if (now - this.lastDrawTime > 15) { // Limite la fréquence de mise à jour
            if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                return; // Pas encore de données vidéo
            }
            device.queue.copyExternalImageToTexture(
                { source: this.video },
                { texture: texture },
                [this.width, this.height]
            );
            this.lastDrawTime = now;
        }
    }

    // Nettoie la webcam
    closeWebcam() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}
