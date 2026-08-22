import { describe, expect, it } from "vitest";
import { parseGitHubUrl } from "../src/modules/repository/repo-url.util";
import { ApiError } from "../src/shared/utils/api-error";

function expectBadRequest(input: string | null, messagePattern?: RegExp) {
  try {
    parseGitHubUrl(input as string);
    throw new Error("expected parseGitHubUrl to throw");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).statusCode).toBe(400);
    if (messagePattern) expect((err as ApiError).message).toMatch(messagePattern);
  }
}

describe("parseGitHubUrl", () => {
  it("parses a plain https URL", () => {
    expect(parseGitHubUrl("https://github.com/acme/widgets")).toEqual({
      owner: "acme",
      repo: "widgets"
    });
  });

  it("accepts http scheme and trailing slash", () => {
    expect(parseGitHubUrl("http://github.com/octo/cat/")).toEqual({ owner: "octo", repo: "cat" });
  });

  it("strips www subdomain", () => {
    expect(parseGitHubUrl("https://www.github.com/a/b")).toEqual({ owner: "a", repo: "b" });
  });

  it("strips the .git suffix", () => {
    expect(parseGitHubUrl("https://github.com/acme/widgets.git")).toEqual({
      owner: "acme",
      repo: "widgets"
    });
  });

  it("extracts branch from /tree/<branch> URLs", () => {
    expect(parseGitHubUrl("https://github.com/acme/widgets/tree/main")).toEqual({
      owner: "acme",
      repo: "widgets",
      branch: "main"
    });
  });

  it("supports nested branch names with slashes", () => {
    expect(parseGitHubUrl("https://github.com/acme/widgets/tree/feature/cool-thing"))
      .toEqual({
        owner: "acme",
        repo: "widgets",
        branch: "feature/cool-thing"
      });
  });

  it("ignores /tree when only owner/repo present", () => {
    const parsed = parseGitHubUrl("https://github.com/acme/tree");
    expect(parsed).toEqual({ owner: "acme", repo: "tree" });
  });

  it("parses scp-like git@ URLs with and without .git", () => {
    expect(parseGitHubUrl("git@github.com:acme/widgets.git")).toEqual({ owner: "acme", repo: "widgets" });
    expect(parseGitHubUrl("git@github.com:acme/widgets")).toEqual({ owner: "acme", repo: "widgets" });
  });

  it("auto-prefixes https for bare github.com URLs", () => {
    expect(parseGitHubUrl("github.com/acme/widgets")).toEqual({ owner: "acme", repo: "widgets" });
  });

  it("is case-preserving for owner/repo but tolerant of host casing", () => {
    expect(parseGitHubUrl("https://GITHUB.COM/ACME/Widgets")).toEqual({
      owner: "ACME",
      repo: "Widgets"
    });
  });

  it("allows dots, dashes and underscores in names", () => {
    expect(parseGitHubUrl("https://github.com/my.org/some_repo-name.js")).toEqual({
      owner: "my.org",
      repo: "some_repo-name.js".replace(/\.git$/i, "") // dots kept except .git
    });
  });

  it("rejects empty/null input", () => {
    expectBadRequest("", /required/i);
    expectBadRequest(null, /required/i);
  });

  it("rejects unparseable garbage", () => {
    expectBadRequest(":::", /invalid github url/i);
    expectBadRequest("ht!tp://###"); // parses as a weird URL but is not github
    expectBadRequest("   ", /required|invalid/i);
  });

  it("rejects non-github hosts", () => {
    expectBadRequest("https://gitlab.com/acme/widgets", /only github\.com/i);
    expectBadRequest("https://github.com.evil.io/acme/widgets", /only github\.com/i);
    expectBadRequest("https://bitbucket.org/acme/widgets", /only github\.com/i);
  });

  it("allows github.company.com style enterprise subdomains? -> no, MVP rejects", () => {
    // hostname regex requires host itself to be github.com or *.github.com
    expect(parseGitHubUrl("https://ghe.acme.github.com/team/repo").owner).toBe("team");
  });

  it("requires owner AND repo segments", () => {
    expectBadRequest("https://github.com/just-owner", /owner and repository/i);
    expectBadRequest("https://github.com/", /owner and repository/i);
  });

  it("rejects invalid characters in owner or repo", () => {
    expectBadRequest("https://github.com/bad%20owner/repo", /invalid owner or repository/i);
    expectBadRequest("https://github.com/acme/repo!!", /invalid owner or repository/i);
  });
});
