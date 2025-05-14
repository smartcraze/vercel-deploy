"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Fira_Code } from "next/font/google";

const firaCode = Fira_Code({ subsets: ["latin"] });

export default function DeploymentLogs({
    repoURL,
    projectId,
}: {
    repoURL: string;
    projectId: string;
}) {
    const [logs, setLogs] = useState<string[]>([]);
    const [deployPreviewURL, setDeployPreviewURL] = useState<string>();
    const logContainerRef = useRef<HTMLElement>(null);
    const socketRef = useRef<Socket>(null);

    const isValidURL = useMemo(() => {
        const regex =
            /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/)?$/;
        return regex.test(repoURL);
    }, [repoURL]);

    const handleDeploy = useCallback(async () => {
        if (!isValidURL) return;

        const res = await fetch("http://localhost:9000/project", {
            method: "POST",
            body: JSON.stringify({ gitURL: repoURL, slug: projectId }),
            headers: { "Content-Type": "application/json" },
        });

        const { data } = await res.json();
        if (data) {
            const { projectSlug, url } = data;
            setDeployPreviewURL(url);
            socketRef.current?.emit("subscribe", `logs:${projectSlug}`);
        }
    }, [repoURL, projectId, isValidURL]);

    const handleSocketMessage = useCallback((message: string) => {
        try {
            const { log } = JSON.parse(message);
            setLogs((prev) => [...prev, log]);
            logContainerRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (e) {
            console.error("Failed to parse message", e);
        }
    }, []);

    useEffect(() => {
        const socket = io("http://localhost:9002");
        socketRef.current = socket;

        socket.on("message", handleSocketMessage);

        return () => {
            socket.off("message", handleSocketMessage);
            socket.disconnect();
        };
    }, [handleSocketMessage]);

    useEffect(() => {
        if (isValidURL && repoURL && projectId) {
            handleDeploy();
        }
    }, [repoURL, projectId, handleDeploy, isValidURL]);

    return (
        <div className="w-full">
            {deployPreviewURL && (
                <div className="mt-2 bg-slate-900 py-4 px-2 rounded-lg">
                    <p>
                        Preview URL{" "}
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 bg-sky-950 px-3 py-2 rounded-lg"
                            href={deployPreviewURL}
                        >
                            {deployPreviewURL}
                        </a>
                    </p>
                </div>
            )}
            {logs.length > 0 && (
                <div
                    className={`${firaCode.className} text-sm text-green-500 mt-5 border-green-500 border-2 rounded-lg p-4 h-[300px] overflow-y-auto`}
                >
                    <pre className="flex flex-col gap-1">
                        {logs.map((log, i) => (
                            <code
                                ref={logs.length - 1 === i ? logContainerRef : undefined}
                                key={i}
                            >
                                {`> ${log}`}
                            </code>
                        ))}
                    </pre>
                </div>
            )}
        </div>
    );
}
