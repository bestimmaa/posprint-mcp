#!/usr/bin/env node
"use strict";

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const dockerImage = "mangogolia/posprint-mcp";
const smokeTestPort = 39191;
const smokeTestToken = "docker-release-smoke-test-token";
const platforms = ["linux/amd64", "linux/arm64"];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio || "pipe"
  });
}

function ensureCleanWorktree() {
  try {
    run("git", ["diff", "--quiet"]);
    run("git", ["diff", "--cached", "--quiet"]);
    const untrackedFiles = run("git", ["ls-files", "--others", "--exclude-standard"]).trim();
    if (untrackedFiles !== "") {
      throw new Error("Docker release requires a clean git worktree.");
    }
  } catch {
    throw new Error("Docker release requires a clean git worktree.");
  }
}

function ensureDockerAvailable() {
  try {
    run("docker", ["--version"]);
  } catch {
    throw new Error("Docker release requires Docker to be installed and running.");
  }
}

function ensureBuildxAvailable() {
  try {
    run("docker", ["buildx", "version"]);
  } catch {
    throw new Error("Docker release requires buildx to be available. Run 'docker buildx create --use' if needed.");
  }
}

function ensureGitTagExists(version) {
  const tag = `v${version}`;
  let taggedCommit;

  try {
    taggedCommit = run("git", ["rev-parse", `${tag}^{commit}`]).trim();
  } catch {
    throw new Error(`Docker release requires git tag ${tag} to exist. Run "npm run release" first.`);
  }

  const headCommit = run("git", ["rev-parse", "HEAD"]).trim();
  if (headCommit !== taggedCommit) {
    throw new Error(`Docker release requires HEAD to be at tag ${tag}. Checkout the tag first: git checkout ${tag}`);
  }

  return tag;
}

function buildAndPushImage(version) {
  const versionTag = `${dockerImage}:${version}`;
  const latestTag = `${dockerImage}:latest`;

  run(
    "docker",
    [
      "buildx",
      "build",
      "--platform", platforms.join(","),
      "--tag", versionTag,
      "--tag", latestTag,
      "--push",
      "."
    ],
    { stdio: "inherit" }
  );

  return { versionTag, latestTag };
}

function pullSinglePlatformImage(tag, platform) {
  const platformTag = `${tag}-${platform.replace(/\//g, "-")}`;
  const buildxTag = `${tag}-${platform.replace(/\//g, "-")}`;

  run(
    "docker",
    [
      "buildx",
      "build",
      "--platform", platform,
      "--tag", platformTag,
      "--load",
      "."
    ],
    { stdio: "inherit" }
  );

  return platformTag;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smokeTestImage(versionTag) {
  const containerName = `posprint-mcp-release-check-${Date.now()}`;

  run("docker", [
    "run",
    "-d",
    "--name",
    containerName,
    "-p",
    `${smokeTestPort}:3000`,
    "-e",
    `POSPRINT_AUTH_TOKEN=${smokeTestToken}`,
    versionTag
  ]);

  try {
    let healthy = false;

    for (let attempt = 0; attempt < 10 && !healthy; attempt += 1) {
      await sleep(500);
      try {
        const response = await fetch(`http://localhost:${smokeTestPort}/healthz`);
        healthy = response.status === 200;
      } catch {
        // Server not ready yet; retry.
      }
    }

    if (!healthy) {
      const logs = run("docker", ["logs", containerName]);
      throw new Error(`Docker image smoke test failed: /healthz never returned 200.\n${logs}`);
    }
  } finally {
    run("docker", ["rm", "-f", containerName]);
  }
}

async function main() {
  ensureDockerAvailable();
  ensureBuildxAvailable();
  ensureCleanWorktree();

  const version = pkg.version;
  const tag = ensureGitTagExists(version);

  console.log(`Building ${dockerImage} at version ${version} (git tag ${tag}) for ${platforms.join(", ")}...`);
  const { versionTag } = buildAndPushImage(version);

  console.log("Pulling local platform image for smoke test...");
  const localPlatformTag = pullSinglePlatformImage(versionTag, process.arch === "arm64" ? "linux/arm64" : "linux/amd64");

  console.log("Running smoke test (start container, check GET /healthz)...");
  await smokeTestImage(localPlatformTag);

  console.log(`Docker image built, pushed, and verified: ${versionTag}`);
  console.log(`Next: docker pull ${versionTag}`);
  console.log(`Next: docker pull ${dockerImage}:latest`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await main();
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

export { ensureCleanWorktree, ensureGitTagExists, main };
