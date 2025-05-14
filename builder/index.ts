import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";
// @ts-ignore
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import Redis from "ioredis";

const execAsync = promisify(exec);

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PROJECT_ID = process.env.PROJECT_ID;

if (!BUCKET_NAME || !PROJECT_ID) {
  console.error("ERROR: BUCKET_NAME or PROJECT_ID is missing in environment variables.");
  process.exit(1);
}

// Redis setup
const publisher = new Redis(process.env.REDIS_URL!);

function publishLog(log: string) {
  console.log(log); 
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
}

/**
 * Recursively retrieves all files from a directory, including subdirectories.
 */
function getAllFiles(directoryPath: string): string[] {
  let filesList: string[] = [];
  const directoryContents = fs.readdirSync(directoryPath);

  directoryContents.forEach((item) => {
    const itemPath = path.join(directoryPath, item);
    const itemStats = fs.statSync(itemPath);

    if (itemStats.isDirectory()) {
      filesList = filesList.concat(getAllFiles(itemPath));
    } else {
      filesList.push(itemPath);
    }
  });

  return filesList;
}

/**
 * Runs the build process for the project.
 */
async function buildProject() {
  try {
    publishLog("🚀 Starting the build process...");

    const outputDirectory = path.join(__dirname, "output");

    if (!fs.existsSync(outputDirectory)) {
      const error = "❌ ERROR: Output directory not found. The cloning process might have failed.";
      console.error(error);
      publishLog(error);
      process.exit(1);
    }

    publishLog("📦 Running npm install and build...");

    await execAsync(`cd ${outputDirectory} && npm install && npm run build`);

    publishLog("✅ Build process completed successfully.");

    const buildOutputDirectory = path.join(outputDirectory, "dist");

    if (!fs.existsSync(buildOutputDirectory)) {
      const error = "ERROR: Build output directory (dist) not found.";
      console.error(error);
      publishLog(error);
      process.exit(1);
    }

    const filesToUpload = getAllFiles(buildOutputDirectory);
    publishLog(`📁 Found ${filesToUpload.length} files to upload.`);

    await uploadFilesToS3(filesToUpload, buildOutputDirectory);

    publishLog("✅ Deployment process completed successfully.");
  } catch (error: any) {
    const msg = ` ERROR: Build process failed. ${error.message}`;
    console.error(msg, error);
    publishLog(msg);
    process.exit(1);
  }
}

/**
 * Uploads all files to the configured S3-compatible storage.
 */
async function uploadFilesToS3(files: string[], baseDirectory: string) {
  await Promise.all(
    files.map(async (filePath) => {
      const relativeFilePath = path.relative(baseDirectory, filePath);
      const mimeType = mime.lookup(filePath) || "application/octet-stream";

      publishLog(`📤 Uploading file: ${relativeFilePath} (MIME Type: ${mimeType})`);

      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `__outputs/${PROJECT_ID}/${relativeFilePath}`,
        Body: fs.createReadStream(filePath),
        ContentType: mimeType,
      });

      try {
        await s3Client.send(uploadCommand);
        publishLog(`✅ Upload successful: ${relativeFilePath}`);
      } catch (error: any) {
        const msg = `❌ ERROR: Failed to upload ${relativeFilePath}. ${error.message}`;
        console.error(msg);
        publishLog(msg);
        process.exit(1);
      }
    })
  );
}

buildProject();
