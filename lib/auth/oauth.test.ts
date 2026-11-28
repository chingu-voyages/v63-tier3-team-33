// Run with `npm test`. See rules.test.ts for how the runner is set up.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OAUTH_ERRORS, oauthErrorKey, oauthErrorMessage, postOAuthPath, safeNextPath } from "./oauth.ts";

describe("safeNextPath", () => {
  it("allows plain same-site paths, including query strings", () => {
    assert.equal(safeNextPath("/dashboard"), "/dashboard");
    assert.equal(safeNextPath("/onboarding/organisation?step=1"), "/onboarding/organisation?step=1");
  });

  it("falls back when there is no destination", () => {
    assert.equal(safeNextPath(null), "/dashboard");
    assert.equal(safeNextPath(undefined, "/x"), "/x");
    assert.equal(safeNextPath(""), "/dashboard");
  });

  it("blocks anything that could leave the site", () => {
    for (const next of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "evil.example/path",
      "/\t/evil.example",
      "/ok\\..\\evil",
    ]) {
      assert.equal(safeNextPath(next), "/dashboard", next);
    }
  });
});

describe("oauthErrorKey", () => {
  it("returns nothing when there is no error", () => {
    assert.equal(oauthErrorKey({}), undefined);
    assert.equal(oauthErrorKey({ error: null, error_code: null }), undefined);
  });

  it("recognises the user cancelling on Google's screen", () => {
    assert.equal(oauthErrorKey({ error: "access_denied", error_description: "The user denied access" }), "cancelled");
  });

  it("recognises an unverified Google email", () => {
    assert.equal(oauthErrorKey({ error: "access_denied", error_code: "provider_email_needs_verification" }), "emailUnverified");
    assert.equal(oauthErrorKey({ error: "access_denied", error_code: "email_exists" }), "emailUnverified");
  });

  it("recognises a missing email", () => {
    assert.equal(
      oauthErrorKey({ error: "server_error", error_description: "Error getting user email from external provider" }),
      "emailUnavailable",
    );
  });

  it("recognises expired or invalid sessions", () => {
    for (const error_code of ["bad_oauth_state", "bad_oauth_callback", "flow_state_expired", "flow_state_not_found"]) {
      assert.equal(oauthErrorKey({ error: "invalid_request", error_code }), "invalidSession", error_code);
    }
  });

  it("recognises Google being unreachable", () => {
    assert.equal(oauthErrorKey({ error: "temporarily_unavailable" }), "unavailable");
    assert.equal(oauthErrorKey({ error: "server_error", error_code: "request_timeout" }), "unavailable");
  });

  it("recognises blocked accounts and closed sign-ups", () => {
    assert.equal(oauthErrorKey({ error: "access_denied", error_code: "user_banned" }), "accountBlocked");
    assert.equal(oauthErrorKey({ error: "access_denied", error_code: "signup_disabled" }), "signupClosed");
  });

  it("uses a generic message for anything unknown, never the raw description", () => {
    const key = oauthErrorKey({ error: "server_error", error_description: "pq: relation does not exist" });
    assert.equal(key, "failed");
    assert.ok(!OAUTH_ERRORS[key].includes("pq:"));
  });
});

describe("oauthErrorMessage", () => {
  it("looks up our own message for a known key", () => {
    assert.equal(oauthErrorMessage("cancelled"), OAUTH_ERRORS.cancelled);
  });

  it("shows nothing when there is no error", () => {
    assert.equal(oauthErrorMessage(null), undefined);
    assert.equal(oauthErrorMessage(""), undefined);
  });

  it("never echoes text from the URL: unknown keys get the generic message", () => {
    assert.equal(oauthErrorMessage("<b>Your account is hacked, call 555</b>"), OAUTH_ERRORS.failed);
    assert.equal(oauthErrorMessage("toString"), OAUTH_ERRORS.failed);
    assert.equal(oauthErrorMessage("__proto__"), OAUTH_ERRORS.failed);
  });
});

describe("postOAuthPath", () => {
  it("sends a returning manager to onboarding and a guest to the dashboard", () => {
    assert.equal(postOAuthPath({ role: "manager", roleChosen: true }, null), "/onboarding/organisation");
    assert.equal(postOAuthPath({ role: "guest", roleChosen: true }, null), "/dashboard");
    assert.equal(postOAuthPath({ role: "admin", roleChosen: true }, null), "/dashboard");
  });

  it("honours a safe next path for a returning user", () => {
    assert.equal(postOAuthPath({ role: "guest", roleChosen: true }, "/dashboard?x=1"), "/dashboard?x=1");
  });

  it("ignores an unsafe next path", () => {
    assert.equal(postOAuthPath({ role: "guest", roleChosen: true }, "//evil.example"), "/dashboard");
  });

  it("sends a new Google user to pick an account type first", () => {
    assert.equal(postOAuthPath({ role: "guest", roleChosen: false }, null), "/choose-account-type");
  });

  it("keeps a safe next path through the account-type step, and drops an unsafe one", () => {
    assert.equal(
      postOAuthPath({ role: "guest", roleChosen: false }, "/dashboard"),
      "/choose-account-type?next=%2Fdashboard",
    );
    assert.equal(postOAuthPath({ role: "guest", roleChosen: false }, "https://evil.example"), "/choose-account-type");
  });

  it("sends people with no usable profile back to sign in", () => {
    assert.equal(postOAuthPath(null, null), "/sign-in");
    assert.equal(postOAuthPath({ role: "superuser", roleChosen: true }, null), "/sign-in");
  });
});
