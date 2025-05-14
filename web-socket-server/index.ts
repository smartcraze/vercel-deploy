import express, { Request, Response } from "express";
import { generateSlug } from "random-word-slugs";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { Server } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";
import exec from "child_process";
import cors from "cors";
import http from "http";

dotenv.config();

const app = express();
const server = http.createServer(app); // 👈 attach http server
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = 9000;
const subscriber = new Redis(process.env.REDIS_URL!);

app.use(cors());
app.use(express.json());

// WebSocket logic
io.on("connection", (socket) => {
  console.log("New WebSocket connection");

  socket.on("subscribe", (channel) => {
    console.log(`Client subscribed to ${channel}`);
    socket.join(channel);
    socket.emit("message", JSON.stringify({ log: `Joined ${channel}` }));
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

io.on("error", (error) => {
  console.error("WebSocket error:", error);
});

// AWS ECS client config (commented out unless you use it)
const ecsClient = new ECSClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const config = {
  CLUSTER: process.env.CLUSTER!,
  TASK: process.env.TASK!,
};

type ProjectRequestBody = {
  gitURL: string;
  slug?: string;
};

// Function for ECS task execution (not used in current version)
async function runECSTask(gitURL: string, projectSlug: string) {
  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: process.env.SUBNETS?.split(",") || [],
        securityGroups: process.env.SECURITY_GROUPS?.split(",") || [],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder",
          environment: [
            { name: "GIT_REPOSITORY__URL", value: gitURL },
            { name: "PROJECT_ID", value: projectSlug },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);
}

// Endpoint to start a project
app.post("/project", async (req: Request, res: Response) => {
  const { gitURL, slug } = req.body as ProjectRequestBody;
  const projectSlug = slug || generateSlug();

  // ECS Fargate version (optional)
  // await runECSTask(gitURL, projectSlug);

  // Docker local run version
  const command = `docker run -d \
    --name ${projectSlug} \
    -e GIT_REPOSITORY__URL=${gitURL} \
    -e PROJECT_ID=${projectSlug} \
    -e R2_ACCESS_KEY=${process.env.R2_ACCESS_KEY} \
    -e R2_SECRET_KEY=${process.env.R2_SECRET_KEY} \
    -e R2_ENDPOINT=${process.env.R2_ENDPOINT} \
    -e R2_BUCKET_NAME=${process.env.R2_BUCKET_NAME} \
    -e REDIS_URL=${process.env.REDIS_URL} \
    builder`;

  exec.exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Container started with ID: ${stdout}`);
  });

  res.json({
    status: "queued",
    data: {
      projectSlug,
      url: `http://${projectSlug}.localhost:8000`,
    },
  });
});

async function initRedisSubscribe() {
  console.log("Subscribed to logs...");
  subscriber.psubscribe("logs:*");

  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message);
  });
}

initRedisSubscribe();

server.listen(PORT, () => {
  console.log(`API + WebSocket server running at http://localhost:${PORT}`);
});
