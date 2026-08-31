import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readWorkflow = (name: string): string =>
  readFileSync(resolve(process.cwd(), `.github/workflows/${name}.yml`), "utf8");
const cdWorkflow = readWorkflow("cd");
const ciWorkflow = readWorkflow("ci");
const packageManifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

describe("React package boundary", () => {
  it("uses the host React instance instead of shipping a second copy", () => {
    expect(packageManifest.dependencies).not.toHaveProperty("react");
    expect(packageManifest.dependencies).not.toHaveProperty("react-dom");
    expect(packageManifest.peerDependencies?.react).toBe("^19");
    expect(packageManifest.devDependencies?.react).toBe(
      packageManifest.devDependencies?.["react-dom"],
    );
  });
});

describe("package release trust boundary", () => {
  it("uses exact-main hosted OIDC publication without write tokens", () => {
    expect(cdWorkflow).toContain("runs-on: ubuntu-latest");
    expect(cdWorkflow).toContain("environment: production");
    expect(cdWorkflow).toContain("id-token: write");
    expect(cdWorkflow).toContain("Enforce exact-main successful CI");
    expect(cdWorkflow).toContain("refs/remotes/origin/main");
    expect(cdWorkflow).toContain("-f branch=main");
    expect(cdWorkflow).toContain("-f event=push");
    expect(cdWorkflow).toContain('-f head_sha="${EXPECTED_SHA}"');
    expect(cdWorkflow).toContain('conclusion == "success"');
    expect(cdWorkflow).toContain("Verify release runtime");
    expect(cdWorkflow).toContain('ACTUAL_NODE%%.*');
    expect(cdWorkflow).toContain('"11.5.1"');
    expect(cdWorkflow).toContain("--provenance");
    expect(cdWorkflow).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/u);
  });

  it("uses hosted pull-request runners and trusted repository runners", () => {
    expect(ciWorkflow).toContain("pull_request:");
    expect(ciWorkflow).toContain("workflow_dispatch:");
    expect(ciWorkflow).not.toMatch(/\n\s+cache:\s*["']?npm["']?/u);
    expect(ciWorkflow.match(/runs-on: \$\{\{ fromJSON\(github\.event_name == 'pull_request'/gu)).toHaveLength(2);
    expect(ciWorkflow).toContain('["ubuntu-latest"]');
    expect(ciWorkflow).toContain('["self-hosted","Linux","X64"]');
    expect(ciWorkflow).toContain("github.event.pull_request.head.repo.full_name == github.repository");
    expect(ciWorkflow).not.toContain("pull_request_target");
    expect(ciWorkflow).not.toContain("fromJSON(vars.");
  });
});
