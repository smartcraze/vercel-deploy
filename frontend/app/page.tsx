"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Github } from "lucide-react";
import { Fira_Code } from "next/font/google";
import axios from "axios";

const firaCode = Fira_Code({ subsets: ["latin"] });

export default function Home() {
  const [repoURL, setRepoURL] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string>();
  const [deployPreviewURL, setDeployPreviewURL] = useState<string>();

  const logContainerRef = useRef<HTMLElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const isValidURL = useMemo(() => {
    const regex =
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/)?$/;
    return regex.test(repoURL);
  }, [repoURL]);

  const handleDeploy = useCallback(async () => {
    if (!isValidURL) return;
    setLoading(true);
    setLogs([]);

    try {
      const { data } = await axios.post("http://localhost:9000/project", {
        gitURL: repoURL,
        slug: projectId,
      });

      if (data?.data) {
        const { projectSlug, url } = data.data;
        setProjectId(projectSlug);
        setDeployPreviewURL(url);
        socketRef.current?.emit("subscribe", `logs:${projectSlug}`);
      }
    } catch (error) {
      console.error("Deployment error:", error);
      setLogs((prev) => [...prev, "❌ Deployment failed. Check server logs."]);
    } finally {
      setLoading(false);
    }
  }, [repoURL, projectId, isValidURL]);

  const handleSocketMessage = useCallback((message: string) => {
    try {
      if (typeof message === "string" && message.trim().startsWith("{")) {
        const { log } = JSON.parse(message);
        setLogs((prev) => [...prev, log]);
      } else {
        setLogs((prev) => [...prev, message]);
      }

      logContainerRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Failed to parse log message:", err);
    }
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:9000"); 
    socketRef.current = socket;

    socket.on("message", handleSocketMessage);

    return () => {
      socket.off("message", handleSocketMessage);
      socket.disconnect();
    };
  }, [handleSocketMessage]);
  

  return (
    <main className="flex justify-center items-center min-h-screen bg-zinc-950 text-white px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold text-center">GitHub Auto Deploy</h1>

        <div className="flex items-center gap-3 bg-zinc-800 rounded-lg px-4 py-3">
          <Github className="text-xl shrink-0 text-white" />
          <input
            type="url"
            placeholder="Enter GitHub Repository URL"
            value={repoURL}
            onChange={(e) => setRepoURL(e.target.value)}
            disabled={loading}
            className="bg-transparent border-none outline-none text-white w-full placeholder-gray-400"
          />
        </div>

        <button
          onClick={handleDeploy}
          disabled={!isValidURL || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
        >
          {loading ? "Deploying..." : "Deploy"}
        </button>

        {deployPreviewURL && (
          <div className="bg-green-900/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg">
            ✅ Preview URL:{" "}
            <a
              href={deployPreviewURL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-green-400"
            >
              {deployPreviewURL}
            </a>
          </div>
        )}

        {logs.length > 0 && (
          <div
            className={`${firaCode.className} text-sm text-green-400 bg-zinc-900 border border-green-700 rounded-lg p-4 h-[300px] overflow-y-auto whitespace-pre-wrap`}
          >
            <pre className="flex flex-col gap-1">
              {logs.map((log, i) => (
                <code
                  ref={logs.length - 1 === i ? logContainerRef : undefined}
                  key={i}
                >{`> ${log}`}</code>
              ))}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
