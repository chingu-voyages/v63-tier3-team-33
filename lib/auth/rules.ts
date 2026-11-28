/**
 * Pure auth rules: no network, no cookies, no framework imports.
 *
 * Server Actions use these as the authoritative checks, and `rules.test.ts`
 * unit-tests them with `npm test`.
 */

// --- Roles ------------------------------------------------------------------
//
//   admin   - full rights to every event + user CRUD. Granted via SQL only.
//   manager - event creator: CRUD on their own events, incl. inviting guests.
//   guest   - reads events they're invited to, edits their own RSVP.
//
// Must match the `public.app_role` enum in supabase/migrations.

export const ROLES = ["admin", "manager", "guest"] as const;
export type Role = (typeof ROLES)[number];

/** The roles a person may pick for themselves at sign-up. Never includes admin. */
export const SELF_SERVICE_ROLES = ["manager", "guest"] as const satisfies readonly Role[];
export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isSelfServiceRole(value: unknown): value is SelfServiceRole {
  return typeof value === "string" && (SELF_SERVICE_ROLES as readonly string[]).includes(value);
}

/** Where each role lands after verifying their email or signing in. */
export function homePathFor(role: Role): string {
  // Managers set up their organisation first; admins and guests go to the dashboard.
  return role === "manager" ? "/onboarding/organisation" : "/dashboard";
}

// --- Settings (keep in sync with the Supabase dashboard; see docs/auth_setup.md)

export const PASSWORD_MIN_LENGTH = 8;
export const FULL_NAME_MAX_LENGTH = 100;
/** Must match Authentication > Providers > Email > "Email OTP Length". The UI draws this many boxes. */
export const OTP_LENGTH = 6;
/** Must match Authentication > Providers > Email > "Email OTP Expiration". */
export const OTP_EXPIRY_SECONDS = 10 * 60;
/** Supabase refuses a second email to the same address within 60s; the UI mirrors that. */
export const RESEND_COOLDOWN_SECONDS = 60;

// --- Validation -------------------------------------------------------------

// Deliberately loose: "something@something.tld". Supabase does the strict
// check, and the code we email proves the address is real.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Supabase lets the OTP length be configured between 6 and 10 digits.
const OTP_PATTERN = /^\d{6,10}$/;

/** Options for the optional "How did you hear about us" field. Values are stored; labels are shown. */
export const REFERRAL_SOURCES = [
  { value: "search", label: "Search engine" },
  { value: "social", label: "Social media" },
  { value: "friend", label: "Friend or colleague" },
  { value: "event", label: "At an event" },
  { value: "other", label: "Other" },
] as const;

function isReferralSource(value: string): boolean {
  return REFERRAL_SOURCES.some((source) => source.value === value);
}

export type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  /** The role picked at sign-up. Must be a SelfServiceRole ("admin" is rejected). */
  accountType: string;
  /** "" when not answered (the field is optional). */
  referralSource: string;
  acceptTerms: boolean;
  marketingOptIn: boolean;
};

export type SignUpErrors = Partial<Record<keyof SignUpInput, string>>;

export function validateEmail(email: string): string | undefined {
  if (!email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address, like name@example.com.";
  return undefined;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function readSignUpForm(formData: FormData): SignUpInput {
  const field = (name: string) => String(formData.get(name) ?? "");
  const referralSource = field("referralSource");
  return {
    fullName: field("fullName").trim(),
    email: normaliseEmail(field("email")),
    // Passwords are never trimmed: spaces are valid characters.
    password: field("password"),
    confirmPassword: field("confirmPassword"),
    accountType: field("accountType"),
    // Unknown values (e.g. a tampered form) are dropped, not rejected: the field is optional.
    referralSource: isReferralSource(referralSource) ? referralSource : "",
    // Browsers only send a checkbox when it's ticked, with the value "on".
    acceptTerms: formData.get("acceptTerms") === "on",
    marketingOptIn: formData.get("marketingOptIn") === "on",
  };
}

export type PasswordPairErrors = { password?: string; confirmPassword?: string };

/** Shared by sign-up and password reset so both enforce the same rules. */
export function validatePasswordPair(password: string, confirmPassword: string): PasswordPairErrors {
  const errors: PasswordPairErrors = {};
  if (!password) {
    errors.password = "Create a password.";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export function validateSignUp(input: SignUpInput): SignUpErrors {
  const errors: SignUpErrors = {};

  if (!input.fullName) {
    errors.fullName = "Enter your full name.";
  } else if (input.fullName.length > FULL_NAME_MAX_LENGTH) {
    errors.fullName = `Full name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.`;
  }

  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;

  Object.assign(errors, validatePasswordPair(input.password, input.confirmPassword));

  // isSelfServiceRole, not isRole: nobody can sign themselves up as admin.
  if (!isSelfServiceRole(input.accountType)) {
    errors.accountType = "Choose an account type.";
  }

  if (!input.acceptTerms) {
    errors.acceptTerms = "Please agree to the Terms of Service and Privacy Policy.";
  }

  return errors;
}

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string };

/**
 * Rough strength for the 4-bar meter on the sign-up form. It's guidance only:
 * the real rules are the minimum length (above) and Supabase's own checks.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };
  if (password.length < PASSWORD_MIN_LENGTH) return { score: 1, label: "Too short" };

  // How many kinds of character: lowercase, uppercase, digits, symbols.
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) => kind.test(password)).length;
  if (password.length >= 12 && variety >= 3) return { score: 4, label: "Strong" };
  if (variety >= 3) return { score: 3, label: "Good" };
  if (variety === 2) return { score: 2, label: "Fair" };
  return { score: 1, label: "Weak" };
}

/** 42 -> "0:42", 75 -> "1:15". Used by the resend countdown. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

export function validateOtp(code: string): string | undefined {
  if (!code) return "Enter the verification code from your email.";
  if (!OTP_PATTERN.test(code)) {
    return "That doesn't look like a verification code. Enter the digits from your email.";
  }
  return undefined;
}

// --- Error messages ---------------------------------------------------------

export const AUTH_MESSAGES = {
  emailTaken: "An account with this email already exists. Sign in instead.",
  emailNotAllowed: "That email address can't be used. Try a different one.",
  invalidCode: "That code is incorrect. Check your email and try again.",
  expiredCode: "That code has expired. Request a new code below.",
  rateLimited: "Too many attempts. Please wait a minute and try again.",
  emailDeliveryFailed:
    "We couldn't send the verification email. Please try again in a few minutes.",
  invalidCredentials: "Incorrect email or password.",
  weakPassword:
    "That password is too easy to guess. Try a longer one with a mix of letters, numbers and symbols.",
  verificationSessionMissing:
    "Your verification session has expired. Sign in to get a new code.",
  captchaFailed: "We couldn't confirm you're not a robot. Please try the check again.",
  samePassword: "Your new password must be different from your current one.",
  generic: "Something went wrong. Please try again.",
} as const;

// --- Password reset ---------------------------------------------------------

export const RESET_MESSAGES = {
  // Same wording whether or not the account exists, so the form can't be used
  // to find out who has an account.
  codeSent: "If an account exists for that email, we've sent it a verification code.",
  sessionMissing: "Your reset session has expired. Request a new code to continue.",
  resetWindowExpired: "For your security, please verify a new code before choosing a password.",
} as const;

/**
 * How long after verifying the emailed code the user may set a new password.
 * Keeps an unattended, still-signed-in browser from being used later.
 */
export const RESET_WINDOW_SECONDS = 15 * 60;

/** Matches Supabase's JWT `amr` claim, which may be objects or plain strings. */
export type AmrClaim = ReadonlyArray<{ method: string; timestamp: number } | string> | undefined;

/**
 * True if the session proves the user just verified an emailed code.
 *
 * Supabase records verifying ANY emailed code as an "otp" entry in the
 * session's `amr` (authentication methods). Requiring one from the last
 * RESET_WINDOW_SECONDS means a merely signed-in session (password login)
 * can't use the reset form to change the password without the code.
 */
export function canResetPassword(amr: AmrClaim, nowSeconds: number): boolean {
  return (amr ?? []).some(
    (entry) =>
      typeof entry === "object" &&
      entry.method === "otp" &&
      nowSeconds - entry.timestamp <= RESET_WINDOW_SECONDS,
  );
}

/** The parts of Supabase's `AuthError` we use (keeps this file framework-free). */
export type AuthErrorLike = { code?: string; status?: number; message?: string };

/** Turn a Supabase Auth error into a message that's safe and useful to show users. */
export function authErrorMessage(error: AuthErrorLike): string {
  switch (error.code) {
    case "email_exists":
    case "user_already_exists":
      return AUTH_MESSAGES.emailTaken;
    case "email_address_invalid":
      return AUTH_MESSAGES.emailNotAllowed;
    case "otp_expired":
      return AUTH_MESSAGES.invalidCode;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return AUTH_MESSAGES.rateLimited;
    case "weak_password":
      return AUTH_MESSAGES.weakPassword;
    case "same_password":
      return AUTH_MESSAGES.samePassword;
    case "invalid_credentials":
      return AUTH_MESSAGES.invalidCredentials;
    case "captcha_failed":
      return AUTH_MESSAGES.captchaFailed;
    // Returned while the project still uses Supabase's built-in mailer, which
    // only delivers to team members. Configuring Brevo SMTP fixes it.
    case "email_address_not_authorized":
      return AUTH_MESSAGES.emailDeliveryFailed;
  }
  // SMTP failures come back as a 500 like "Error sending confirmation email".
  if (/sending .*email|smtp/i.test(error.message ?? "")) {
    return AUTH_MESSAGES.emailDeliveryFailed;
  }
  return AUTH_MESSAGES.generic;
}

/**
 * Supabase returns the same `otp_expired` error for a wrong code AND an expired
 * one. We know when we sent the code, so we use that to say which it is.
 */
export function otpErrorMessage(
  error: AuthErrorLike,
  sentAt: number,
  now: number,
): string {
  if (error.code !== "otp_expired") return authErrorMessage(error);
  const expired = now - sentAt > OTP_EXPIRY_SECONDS * 1000;
  return expired ? AUTH_MESSAGES.expiredCode : AUTH_MESSAGES.invalidCode;
}
