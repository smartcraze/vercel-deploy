import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";
// @ts-ignore
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";

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
  console.error(
    "ERROR: BUCKET_NAME or PROJECT_ID is missing in environment variables."
  );
  process.exit(1);
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
    console.log("Starting the build process...");

    const outputDirectory = path.join(__dirname, "output");

    if (!fs.existsSync(outputDirectory)) {
      console.error(
        "ERROR: Output directory not found. The cloning process might have failed."
      );
      process.exit(1);
    }

    console.log("Running npm install and build...");

    await execAsync(`cd ${outputDirectory} && npm install && npm run build`);

    console.log("Build process completed successfully.");

    const buildOutputDirectory = path.join(outputDirectory, "dist");

    if (!fs.existsSync(buildOutputDirectory)) {
      console.error("ERROR: Build output directory (dist) not found.");
      process.exit(1);
    }

    const filesToUpload = getAllFiles(buildOutputDirectory);
    console.log(`Found ${filesToUpload.length} files to upload.`);

    await uploadFilesToS3(filesToUpload, buildOutputDirectory);

    console.log("Deployment process completed successfully.");
  } catch (error) {
    console.error("ERROR: Build process failed.", error);
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

      console.log(
        `Uploading file: ${relativeFilePath} (MIME Type: ${mimeType})`
      );

      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `__outputs/${PROJECT_ID}/${relativeFilePath}`,
        Body: fs.createReadStream(filePath),
        ContentType: mimeType,
      });

      try {
        await s3Client.send(uploadCommand);
        console.log(`Upload successful: ${relativeFilePath}`);
      } catch (error: any) {
        console.error(`ERROR: Failed to upload ${relativeFilePath}.`, error);
        console.log("ERROR: Failed to upload", error.message);
        process.exit(1);
      }
    })
  );
}

buildProject();
