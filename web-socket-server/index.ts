import express, { Request, Response } from "express";
import { generateSlug } from "random-word-slugs";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { Server } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 9000;

const subscriber = new Redis(process.env.REDIS_URL!);

const io = new Server({ cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});

io.listen(9002);
io.on("disconnect", () => {
  console.log("Client disconnected");
});

// ECS client init (only needed if ECS used)
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

app.use(express.json());

type ProjectRequestBody = {
  gitURL: string;
  slug?: string;
};

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

app.post("/project", async (req: Request, res: Response) => {
  const { gitURL, slug } = req.body as ProjectRequestBody;
  const projectSlug = slug ? slug : generateSlug();

  // await runECSTask(gitURL, projectSlug);

  res.json({
    status: "queued",
    data: { projectSlug, url: `http://${projectSlug}.localhost:8000` },
  });
});

async function initRedisSubscribe() {
  console.log("Subscribed to logs....");
  subscriber.psubscribe("logs:*");
  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message);
  });
}

initRedisSubscribe();

app.listen(PORT, () => console.log(`API Server Running on port ${PORT}`));
