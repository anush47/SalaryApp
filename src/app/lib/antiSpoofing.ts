import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import path from 'path';

export class AntiSpoofingDetector {
    private session: ort.InferenceSession | null = null;
    private readonly MODEL_PATH = path.join(process.cwd(), 'public/models/antispoofing.onnx');
    private readonly INPUT_SIZE = 128; // Model expects 128x128 input

    async initialize() {
        if (!this.session) {
            try {
                this.session = await ort.InferenceSession.create(this.MODEL_PATH);
                console.log('[AntiSpoof] ✓ Model loaded successfully');
            } catch (err) {
                console.error('[AntiSpoof] ✗ Failed to load model:', err);
                throw new Error('Anti-spoofing model not found. Please ensure the ONNX model is placed in public/models/antispoofing.onnx');
            }
        }
    }

    async predict(imageBase64: string): Promise<{
        isReal: boolean;
        confidence: number;
        score: number;
    }> {
        await this.initialize();

        try {
            // 1. Decode base64 image
            const imageBuffer = Buffer.from(
                imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                'base64'
            );

            // 2. Preprocess image
            const preprocessed = await this.preprocessImage(imageBuffer);

            // 3. Run inference
            const feeds = {
                input: new ort.Tensor('float32', preprocessed, [1, 3, this.INPUT_SIZE, this.INPUT_SIZE])
            };
            const results = await this.session!.run(feeds);

            // 4. Parse output - Model outputs [real_score, fake_score] (indices were swapped!)
            const output = results.output.data as Float32Array;
            const realScore = output[0];  // First output is REAL
            const fakeScore = output[1];  // Second output is FAKE

            // Apply softmax to convert logits to probabilities
            const expFake = Math.exp(fakeScore);
            const expReal = Math.exp(realScore);
            const sumExp = expFake + expReal;

            const fakeProbability = expFake / sumExp;
            const realProbability = expReal / sumExp;

            const isReal = realScore > fakeScore; // Compare raw logits
            const confidence = realProbability; // Use probability as confidence

            console.log('[AntiSpoof] Prediction:', {
                isReal,
                confidence: confidence.toFixed(3),
                realScore: realScore.toFixed(3),
                fakeScore: fakeScore.toFixed(3),
                realProb: realProbability.toFixed(3),
                fakeProb: fakeProbability.toFixed(3)
            });

            return {
                isReal,
                confidence,
                score: realProbability
            };
        } catch (err) {
            console.error('[AntiSpoof] Prediction error:', err);
            throw err;
        }
    }

    private async preprocessImage(buffer: Buffer): Promise<Float32Array> {
        try {
            // Get original image dimensions
            const metadata = await sharp(buffer).metadata();
            const oldWidth = metadata.width!;
            const oldHeight = metadata.height!;

            // Calculate aspect-ratio preserving resize
            const ratio = this.INPUT_SIZE / Math.max(oldWidth, oldHeight);
            const scaledWidth = Math.round(oldWidth * ratio);
            const scaledHeight = Math.round(oldHeight * ratio);

            // Calculate padding to center the image
            const deltaW = this.INPUT_SIZE - scaledWidth;
            const deltaH = this.INPUT_SIZE - scaledHeight;
            const top = Math.floor(deltaH / 2);
            const bottom = deltaH - top;
            const left = Math.floor(deltaW / 2);
            const right = deltaW - left;

            // Resize with aspect ratio preserved, then pad with black borders
            const { data } = await sharp(buffer)
                .resize(scaledWidth, scaledHeight, {
                    fit: 'fill',
                    kernel: sharp.kernel.lanczos3
                })
                .extend({
                    top,
                    bottom,
                    left,
                    right,
                    background: { r: 0, g: 0, b: 0, alpha: 1 }
                })
                .removeAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            // Convert to CHW format and normalize to [0, 1]
            const pixelCount = this.INPUT_SIZE * this.INPUT_SIZE;
            const chw = new Float32Array(3 * pixelCount);

            for (let i = 0; i < pixelCount; i++) {
                const rgbIndex = i * 3;
                chw[i] = data[rgbIndex] / 255.0;                      // R channel
                chw[pixelCount + i] = data[rgbIndex + 1] / 255.0;     // G channel
                chw[2 * pixelCount + i] = data[rgbIndex + 2] / 255.0; // B channel
            }

            return chw;
        } catch (err) {
            console.error('[AntiSpoof] Image preprocessing error:', err);
            throw err;
        }
    }
}

// Singleton instance
let detector: AntiSpoofingDetector | null = null;

export async function detectSpoofing(imageBase64: string) {
    if (!detector) {
        detector = new AntiSpoofingDetector();
    }
    return detector.predict(imageBase64);
}
