import path from "node:path";
import { isDemoMode, resolveProjectRoot, resolveSeedDir } from "./paths";

const cwd = "/tmp/vibestudio";

if (isDemoMode({ VIBESTUDIO_DEMO_MODE: "0" })) {
  throw new Error("demo mode enabled for zero");
}
if (!isDemoMode({ VIBESTUDIO_DEMO_MODE: "1" })) {
  throw new Error("demo mode not enabled");
}

const localRoot = resolveProjectRoot(cwd, {});
if (localRoot !== path.resolve(cwd, "..")) {
  throw new Error(`unexpected local root: ${localRoot}`);
}

const demoRoot = resolveProjectRoot(cwd, { VIBESTUDIO_DEMO_MODE: "1" });
if (demoRoot !== path.join(cwd, ".vibestudio-demo")) {
  throw new Error(`unexpected demo root: ${demoRoot}`);
}

const configuredRoot = resolveProjectRoot(cwd, {
  VIBESTUDIO_DEMO_MODE: "1",
  ARUTLEE_PROJECT_ROOT: "/tmp/explicit-vibestudio",
});
if (configuredRoot !== "/tmp/explicit-vibestudio") {
  throw new Error(`explicit root did not win: ${configuredRoot}`);
}

if (resolveSeedDir(cwd, {}) !== path.join(cwd, "data-seeds")) {
  throw new Error("local seed directory changed");
}
if (
  resolveSeedDir(cwd, { VIBESTUDIO_DEMO_MODE: "1" }) !==
  path.join(cwd, "demo-seeds")
) {
  throw new Error("demo seed directory not isolated");
}
