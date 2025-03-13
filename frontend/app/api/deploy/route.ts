import { NextRequest, NextResponse } from "next/server";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const { gitUrl, projectid } = await request.json();
  // spin up docker container for deployment
  const ecsClient = new ECSClient({
    region: "auto",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });

  const config = {
    CLUSTER: "",
    TASK: "",
  };

  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: ["", "", ""],
        securityGroups: [""],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: process.env.IMAGE_NAME,
          environment: [
            { name: "GIT_REPOSITORY__URL", value: gitUrl },
            { name: "PROJECT_ID", value: projectid },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);
  const headersList = await headers();
  const hostname = headersList.get("host");
  const HOST_NAME = hostname as string;

  return NextResponse.json(
    {
      message: "Success",
      data: { gitUrl, projectid },
      url: `https://${projectid}.${HOST_NAME}`,
    },
    { status: 200 }
  );
}
