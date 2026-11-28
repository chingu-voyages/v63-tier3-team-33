// Run with `npm test`. See rules.test.ts for how the runner is set up.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  REMEMBER_ME_SECONDS,
  SIGN_IN_MESSAGES,
  accountTypeMismatch,
  isDemoVisitor,
  readRememberMe,
  readSignInForm,
  validateSignIn,
  withSessionLifetime,
  type SignInInput,
} from "./signin.ts";

const valid: SignInInput = {
  email: "ada@example.com",
  password: "anything-at-all",
  accountType: "guest",
  rememberMe: false,
};

describe("validateSignIn", () => {
  it("accepts a complete form", () => {
    assert.deepEqual(validateSignIn(valid), {});
  });

  it("requires every field", () => {
    const errors = validateSignIn({ email: "", password: "", accountType: "", rememberMe: false });
    assert.deepEqual(Object.keys(errors).sort(), ["accountType", "email", "password"]);
  });

  it("rejects a malformed email", () => {
    assert.ok(validateSignIn({ ...valid, email: "ada@" }).email);
  });

  it("does not apply password length rules when signing in", () => {
    assert.equal(validateSignIn({ ...valid, password: "x" }).password, undefined);
  });

  it("does not offer admin as an account type", () => {
    assert.ok(validateSignIn({ ...valid, accountType: "admin" }).accountType);
  });
});

describe("readSignInForm", () => {
  it("normalises the email, keeps the password exactly as typed, and reads the checkbox", () => {
    const formData = new FormData();
    formData.set("email", "  Ada@Example.COM ");
    formData.set("password", " pass word ");
    formData.set("accountType", "manager");
    formData.set("rememberMe", "on");
    assert.deepEqual(readSignInForm(formData), {
      email: "ada@example.com",
      password: " pass word ",
      accountType: "manager",
      rememberMe: true,
      captchaToken: undefined,
    });
  });

  it("reads a CAPTCHA token from either supported widget", () => {
    for (const field of ["captchaToken", "cf-turnstile-response", "h-captcha-response"]) {
      const formData = new FormData();
      formData.set(field, "token-123");
      assert.equal(readSignInForm(formData).captchaToken, "token-123", field);
    }
  });

  it("treats a missing form as empty, not as an error", () => {
    const input = readSignInForm(new FormData());
    assert.deepEqual([input.email, input.password, input.accountType, input.rememberMe], ["", "", "", false]);
  });
});

describe("readRememberMe", () => {
  it("is on only when the checkbox was ticked", () => {
    const ticked = new FormData();
    ticked.set("rememberMe", "on");
    assert.equal(readRememberMe(ticked), true);
    assert.equal(readRememberMe(new FormData()), false);
  });
});

describe("withSessionLifetime", () => {
  const supabaseDefaults = { path: "/", sameSite: "lax", httpOnly: false, maxAge: 400 * 24 * 60 * 60 };

  it("ends the session with the browser when Remember Me is off", () => {
    const result = withSessionLifetime(supabaseDefaults, false);
    assert.equal("maxAge" in result, false);
    assert.equal(result.path, "/");
    assert.equal(result.sameSite, "lax");
  });

  it("uses 30 days when Remember Me is on, not Supabase's 400", () => {
    assert.equal(withSessionLifetime(supabaseDefaults, true).maxAge, REMEMBER_ME_SECONDS);
    assert.equal(REMEMBER_ME_SECONDS, 2_592_000);
  });

  it("drops a fixed expiry date either way", () => {
    const withExpiry = { ...supabaseDefaults, expires: new Date(0) };
    assert.equal("expires" in withSessionLifetime(withExpiry, true), false);
    assert.equal("expires" in withSessionLifetime(withExpiry, false), false);
  });

  it("never touches cookies being deleted, so sign-out still works", () => {
    const deleting = { path: "/", maxAge: 0 };
    assert.deepEqual(withSessionLifetime(deleting, false), deleting);
    assert.deepEqual(withSessionLifetime(deleting, true), deleting);
  });

  it("does not modify the object it was given", () => {
    const original = { ...supabaseDefaults };
    withSessionLifetime(original, false);
    assert.deepEqual(original, supabaseDefaults);
  });
});

describe("accountTypeMismatch", () => {
  it("accepts a matching type", () => {
    assert.equal(accountTypeMismatch("manager", "manager"), undefined);
    assert.equal(accountTypeMismatch("guest", "guest"), undefined);
  });

  it("tells the user their real type when they picked the wrong one", () => {
    assert.match(accountTypeMismatch("guest", "manager") ?? "", /Event Creator/);
    assert.match(accountTypeMismatch("manager", "guest") ?? "", /Guest/);
  });

  it("lets an admin sign in under either type", () => {
    assert.equal(accountTypeMismatch("guest", "admin"), undefined);
    assert.equal(accountTypeMismatch("manager", "admin"), undefined);
  });

  it("falls back to the generic message for unknown values", () => {
    assert.equal(accountTypeMismatch("superuser", "guest"), SIGN_IN_MESSAGES.invalidCredentials);
    assert.equal(accountTypeMismatch("guest", "something"), SIGN_IN_MESSAGES.invalidCredentials);
  });
});

describe("isDemoVisitor", () => {
  it("is true only for anonymous Supabase users", () => {
    assert.equal(isDemoVisitor({ is_anonymous: true }), true);
    assert.equal(isDemoVisitor({ is_anonymous: false }), false);
    assert.equal(isDemoVisitor({}), false);
    assert.equal(isDemoVisitor(null), false);
    assert.equal(isDemoVisitor({ is_anonymous: "true" }), false);
  });
});
