import * as ort from 'onnxruntime-web';

export class ClientAntiSpoofing {
    private session: ort.InferenceSession | null = null;
    private readonly MODEL_PATH = '/models/antispoofing.onnx';
    private readonly INPUT_SIZE = 128;

    async initialize() {
        if (!this.session) {
            try {
                // Configure WASM to use threaded (if supported) or single-threaded
                ort.env.wasm.numThreads = 2; // Use 2 threads for better performance on client
                ort.env.wasm.proxy = true; // Use proxy for web worker if possible
                ort.env.wasm.wasmPaths = '/wasm/'; // Load from local public/wasm directory

                this.session = await ort.InferenceSession.create(this.MODEL_PATH, {
                    executionProviders: ['wasm'],
                    graphOptimizationLevel: 'all'
                });
                console.log('[ClientAntiSpoof] ✓ Model loaded successfully');
            } catch (err) {
                console.error('[ClientAntiSpoof] ✗ Failed to load model:', err);
                throw new Error('Failed to load anti-spoofing model');
            }
        }
    }

    async predict(videoElement: HTMLVideoElement | HTMLImageElement): Promise<{ isReal: boolean; confidence: number }> {
        if (!this.session) await this.initialize();
        if (!this.session) throw new Error("Model not initialized");

        // 1. Preprocess image using Canvas
        const inputTensor = this.preprocess(videoElement);

        // 2. Run Inference
        const feeds = { input: inputTensor };
        const results = await this.session.run(feeds);

        // 3. Parse Output
        const output = results.output.data as Float32Array;
        const realScore = output[0];
        const fakeScore = output[1];

        // Softmax
        const expReal = Math.exp(realScore);
        const expFake = Math.exp(fakeScore);
        const sumExp = expReal + expFake;
        const realProb = expReal / sumExp;

        const isReal = realScore > fakeScore;

        console.log(`[ClientAntiSpoof] Real: ${realProb.toFixed(2)} (${realScore.toFixed(2)}) | Fake: ${(expFake / sumExp).toFixed(2)} (${fakeScore.toFixed(2)})`);

        return {
            isReal,
            confidence: realProb
        };
    }

    private preprocess(source: HTMLVideoElement | HTMLImageElement): ort.Tensor {
        const canvas = document.createElement('canvas');
        canvas.width = this.INPUT_SIZE;
        canvas.height = this.INPUT_SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) throw new Error("Could not get canvas context");

        // Draw and resize
        ctx.drawImage(source, 0, 0, this.INPUT_SIZE, this.INPUT_SIZE);

        const imageData = ctx.getImageData(0, 0, this.INPUT_SIZE, this.INPUT_SIZE);
        const { data } = imageData; // RGBA

        const float32Data = new Float32Array(3 * this.INPUT_SIZE * this.INPUT_SIZE);

        // Convert RGBA to RGB and HWC to CHW, normalize to [0, 1]
        for (let i = 0; i < this.INPUT_SIZE * this.INPUT_SIZE; i++) {
            // R
            float32Data[i] = data[i * 4] / 255.0;
            // G
            float32Data[i + this.INPUT_SIZE * this.INPUT_SIZE] = data[i * 4 + 1] / 255.0;
            // B
            float32Data[i + 2 * this.INPUT_SIZE * this.INPUT_SIZE] = data[i * 4 + 2] / 255.0;
        }

        return new ort.Tensor('float32', float32Data, [1, 3, this.INPUT_SIZE, this.INPUT_SIZE]);
    }
}

// Singleton for the client
export const antiSpoofing = new ClientAntiSpoofing();
