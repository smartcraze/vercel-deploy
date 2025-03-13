"use client";

import { useState } from "react";

export default function Form() {
  const [projectId, setProjectId] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidGitHubUrl = (url: string) => {
    return /^https:\/\/github\.com\/[\w-]+\/[\w-]+(\.git)?$/.test(url);
  };

  const handleDeploy = async () => {
    setStatus("");

    if (!gitUrl) return setStatus(" Please enter a GitHub URL.");
    if (!isValidGitHubUrl(gitUrl)) return setStatus("Invalid GitHub URL.");
    if (!projectId) return setStatus(" Please enter a Project ID.");

    setLoading(true);
    setStatus("🚀 Deploying... Please wait.");

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        body: JSON.stringify({ projectId, gitUrl }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        setLoading(false);
        return setStatus(" Deployment failed. Please try again.");
      }

      const { deploymentId } = await response.json();
      pollDeploymentStatus(deploymentId);
    } catch (error) {
      setLoading(false);
      setStatus(" Something went wrong. Please try again.");
    }
  };

  const pollDeploymentStatus = async (deploymentId: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/status?deploymentId=${deploymentId}`);
      const { success } = await res.json();

      if (success) {
        clearInterval(interval);
        setLoading(false);
        setStatus(
          `✅ Successfully deployed at http://${projectId}.localhost:8000`
        );
      }
    }, 5000);
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] overflow-hidden">
      <div className={glowingBg}></div>

      <div className="relative flex flex-col items-center space-y-4 bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/10 shadow-xl">
        <h1 className="text-white text-2xl font-semibold">
          Deploy Your Project
        </h1>

        <input
          type="text"
          placeholder="GitHub URL"
          className="w-72 p-3 rounded-lg bg-black text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          value={gitUrl}
          onChange={(e) => setGitUrl(e.target.value)}
        />

        <input
          type="text"
          placeholder="Enter Project ID"
          className="w-72 p-3 rounded-lg bg-black text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />

        <button
          className="w-72 p-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition duration-300 disabled:opacity-50"
          onClick={handleDeploy}
          disabled={loading}
        >
          {loading ? "Deploying..." : "Deploy 🚀"}
        </button>

        {status && <p className="text-white mt-2">{status}</p>}
      </div>
    </div>
  );
}

const glowingBg =
  "absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle,rgba(255,215,0,0.15)_0%,rgba(0,0,0,1)_90%)] before:blur-3xl before:opacity-50";
