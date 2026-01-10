import * as faceapi from 'face-api.js';

// Configuration
const MODEL_URL = '/models';
let isLoaded = false;

export async function loadModels() {
    if (isLoaded) return;
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        // await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL); // Included in download but optional
        isLoaded = true;
        console.log("FaceAPI matching models loaded");
    } catch (err) {
        console.error("Failed to load FaceAPI models:", err);
        throw err;
    }
}

export async function detectFace(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
    if (!isLoaded) await loadModels();

    // Detect single face with highest confidence
    // We use SSD MobileNet V1 for better accuracy than Tiny Face Detector
    const result = await faceapi
        .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

    return result;
}

export async function getAllFaces(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
    if (!isLoaded) await loadModels();

    const results = await faceapi
        .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

    return results;
}

export function createMatcher(labeledDescriptors: faceapi.LabeledFaceDescriptors[]) {
    return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
}
