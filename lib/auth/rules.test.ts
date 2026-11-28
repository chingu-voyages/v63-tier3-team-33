// Run with `npm test`. Uses Node's built-in test runner (no extra dependencies);
// Node 26 runs TypeScript files directly.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_MESSAGES,
  OTP_EXPIRY_SECONDS,
  authErrorMessage,
  hasErrors,
  homePathFor,
  isRole,
  isSelfServiceRole,
  otpErrorMessage,
  readSignUpForm,
  validateOtp,
  validateSignUp,
  type SignUpInput,
} from "./rules.ts";

const valid: SignUpInput = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  password: "correct-horse",
  confirmPassword: "correct-horse",
  accountType: "manager",
  referralSource: "",
  acceptTerms: true,
  marketingOptIn: false,
};

describe("validateSignUp", () => {
  it("accepts a complete, valid form", () => {
    assert.deepEqual(validateSignUp(valid), {});
  });

  it("flags every missing required field", () => {
    const errors = validateSignUp({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountType: "",
      referralSource: "",
      acceptTerms: false,
      marketingOptIn: false,
    });
    assert.deepEqual(Object.keys(errors).sort(), [
      "acceptTerms",
      "accountType",
      "confirmPassword",
      "email",
      "fullName",
      "password",
    ]);
  });

  it("rejects malformed emails", () => {
    for (const email of ["ada", "ada@", "ada@example", "a da@example.com"]) {
      assert.ok(validateSignUp({ ...valid, email }).email, email);
    }
  });

  it("rejects mismatched passwords", () => {
    const errors = validateSignUp({ ...valid, confirmPassword: "different" });
    assert.equal(errors.confirmPassword, "Passwords do not match.");
  });

  it("rejects short passwords", () => {
    const errors = validateSignUp({ ...valid, password: "short", confirmPassword: "short" });
    assert.match(errors.password ?? "", /at least 8/);
  });

  it("accepts both self-service roles", () => {
    assert.equal(validateSignUp({ ...valid, accountType: "manager" }).accountType, undefined);
    assert.equal(validateSignUp({ ...valid, accountType: "guest" }).accountType, undefined);
  });

  it("refuses self sign-up as admin (e.g. a tampered form)", () => {
    assert.ok(validateSignUp({ ...valid, accountType: "admin" }).accountType);
  });

  it("rejects unknown roles", () => {
    assert.ok(validateSignUp({ ...valid, accountType: "superuser" }).accountType);
  });

  it("requires agreeing to the terms", () => {
    assert.ok(validateSignUp({ ...valid, acceptTerms: false }).acceptTerms);
  });
});

describe("readSignUpForm", () => {
  it("trims the name, normalises the email and leaves passwords untouched", () => {
    const formData = new FormData();
    formData.set("fullName", "  Ada  ");
    formData.set("email", "  Ada@Example.COM ");
    formData.set("password", " pass word ");
    const input = readSignUpForm(formData);
    assert.equal(input.fullName, "Ada");
    assert.equal(input.email, "ada@example.com");
    assert.equal(input.password, " pass word ");
    assert.equal(input.accountType, "");
    assert.equal(input.acceptTerms, false);
    assert.equal(input.marketingOptIn, false);
  });

  it("reads ticked checkboxes and known referral sources", () => {
    const formData = new FormData();
    formData.set("acceptTerms", "on");
    formData.set("marketingOptIn", "on");
    formData.set("referralSource", "friend");
    const input = readSignUpForm(formData);
    assert.equal(input.acceptTerms, true);
    assert.equal(input.marketingOptIn, true);
    assert.equal(input.referralSource, "friend");
  });

  it("drops unknown referral sources", () => {
    const formData = new FormData();
    formData.set("referralSource", "<script>");
    assert.equal(readSignUpForm(formData).referralSource, "");
  });
});

describe("validateOtp", () => {
  it("accepts 6-10 digit codes", () => {
    assert.equal(validateOtp("123456"), undefined);
    assert.equal(validateOtp("1234567890"), undefined);
  });

  it("rejects empty, short or non-numeric codes", () => {
    for (const code of ["", "12345", "12345a", "12345678901"]) {
      assert.ok(validateOtp(code), code);
    }
  });
});

describe("roles", () => {
  it("recognises admin, manager and guest", () => {
    for (const role of ["admin", "manager", "guest"]) assert.ok(isRole(role), role);
    assert.ok(!isRole("organizer"));
    assert.ok(!isRole(undefined));
  });

  it("only lets people pick manager or guest for themselves", () => {
    assert.ok(isSelfServiceRole("manager"));
    assert.ok(isSelfServiceRole("guest"));
    assert.ok(!isSelfServiceRole("admin"));
  });

  it("routes managers to setup, and guests and admins to the dashboard", () => {
    assert.equal(homePathFor("manager"), "/onboarding/organisation");
    assert.equal(homePathFor("guest"), "/dashboard");
    assert.equal(homePathFor("admin"), "/dashboard");
  });
});

describe("authErrorMessage", () => {
  it("maps known Supabase error codes", () => {
    assert.equal(authErrorMessage({ code: "user_already_exists" }), AUTH_MESSAGES.emailTaken);
    assert.equal(authErrorMessage({ code: "over_email_send_rate_limit" }), AUTH_MESSAGES.rateLimited);
    assert.equal(authErrorMessage({ code: "invalid_credentials" }), AUTH_MESSAGES.invalidCredentials);
  });

  it("detects email delivery failures", () => {
    const error = { status: 500, code: "unexpected_failure", message: "Error sending confirmation email" };
    assert.equal(authErrorMessage(error), AUTH_MESSAGES.emailDeliveryFailed);
  });

  it("never leaks unknown server messages", () => {
    assert.equal(authErrorMessage({ message: "pq: relation does not exist" }), AUTH_MESSAGES.generic);
  });
});

describe("otpErrorMessage", () => {
  const sentAt = 1_000_000;
  const expired = { code: "otp_expired" };

  it("reports an incorrect code while the code is still fresh", () => {
    assert.equal(otpErrorMessage(expired, sentAt, sentAt + 1000), AUTH_MESSAGES.invalidCode);
  });

  it("reports an expired code once the expiry window has passed", () => {
    const later = sentAt + OTP_EXPIRY_SECONDS * 1000 + 1;
    assert.equal(otpErrorMessage(expired, sentAt, later), AUTH_MESSAGES.expiredCode);
  });

  it("falls back to the general mapping for other errors", () => {
    assert.equal(
      otpErrorMessage({ code: "over_request_rate_limit" }, sentAt, sentAt),
      AUTH_MESSAGES.rateLimited,
    );
  });
});

describe("hasErrors", () => {
  it("is true only when there is at least one error", () => {
    assert.equal(hasErrors({}), false);
    assert.equal(hasErrors({ email: "x" }), true);
  });
});
