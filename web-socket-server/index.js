"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const random_word_slugs_1 = require("random-word-slugs");
const client_ecs_1 = require("@aws-sdk/client-ecs");
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = __importDefault(require("child_process"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app); // 👈 attach http server
const io = new socket_io_1.Server(server, {
    cors: { origin: "*" },
});
const PORT = 9000;
const subscriber = new ioredis_1.default(process.env.REDIS_URL);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
const ecsClient = new client_ecs_1.ECSClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const config = {
    CLUSTER: process.env.CLUSTER,
    TASK: process.env.TASK,
};
// Function for ECS task execution (not used in current version)
function runECSTask(gitURL, projectSlug) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const command = new client_ecs_1.RunTaskCommand({
            cluster: config.CLUSTER,
            taskDefinition: config.TASK,
            launchType: "FARGATE",
            count: 1,
            networkConfiguration: {
                awsvpcConfiguration: {
                    assignPublicIp: "ENABLED",
                    subnets: ((_a = process.env.SUBNETS) === null || _a === void 0 ? void 0 : _a.split(",")) || [],
                    securityGroups: ((_b = process.env.SECURITY_GROUPS) === null || _b === void 0 ? void 0 : _b.split(",")) || [],
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
        yield ecsClient.send(command);
    });
}
// Endpoint to start a project
app.post("/project", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { gitURL, slug } = req.body;
    const projectSlug = slug || (0, random_word_slugs_1.generateSlug)();
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
    child_process_1.default.exec(command, (error, stdout, stderr) => {
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
}));
function initRedisSubscribe() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Subscribed to logs...");
        subscriber.psubscribe("logs:*");
        subscriber.on("pmessage", (pattern, channel, message) => {
            io.to(channel).emit("message", message);
        });
    });
}
initRedisSubscribe();
server.listen(PORT, () => {
    console.log(`API + WebSocket server running at http://localhost:${PORT}`);
});
