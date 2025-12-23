import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class StorageService {
    private static client: S3Client;
    private static bucketName: string;

    private static getClient(): S3Client {
        if (!this.client) {
            if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
                throw new Error("Missing R2 credentials in environment variables");
            }

            this.client = new S3Client({
                region: "auto",
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID,
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
                },
            });
        }
        return this.client;
    }

    private static getBucket(): string {
        if (!this.bucketName) {
            if (!process.env.R2_BUCKET_NAME) {
                throw new Error("Missing R2_BUCKET_NAME in environment variables");
            }
            this.bucketName = process.env.R2_BUCKET_NAME;
        }
        return this.bucketName;
    }

    /**
     * Generates a presigned URL for uploading a file (PUT)
     * @param key The destination path in the bucket (e.g. "companies/1/docs/contract.pdf")
     * @param contentType MIME type of the file
     * @param expiresInSeconds Duration URL is valid (default 300s = 5 mins)
     */
    static async getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds: number = 300): Promise<string> {
        const client = this.getClient();
        const command = new PutObjectCommand({
            Bucket: this.getBucket(),
            Key: key,
            ContentType: contentType,
        });

        return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    }

    /**
     * Generates a presigned URL for downloading/viewing a file (GET)
     * @param key The file path in the bucket
     * @param expiresInSeconds Duration URL is valid (default 900s = 15 mins)
     */
    static async getPresignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
        const client = this.getClient();
        const command = new GetObjectCommand({
            Bucket: this.getBucket(),
            Key: key,
        });

        return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    }

    /**
     * Deletes a file from the bucket
     * @param key The file path to delete
     */
    static async deleteFile(key: string): Promise<void> {
        const client = this.getClient();
        const command = new DeleteObjectCommand({
            Bucket: this.getBucket(),
            Key: key,
        });

        await client.send(command);
    }
}
