// Run with `npm test`. See lib/auth/rules.test.ts for how the runner is set up.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEMO_EVENTS, DEMO_GUESTS } from "./sample-data.ts";

describe("demo sample data", () => {
  it("is internally consistent", () => {
    const ids = new Set(DEMO_EVENTS.map((e) => e.id));
    assert.equal(ids.size, DEMO_EVENTS.length, "ids are unique");
    for (const event of DEMO_EVENTS) {
      assert.ok(event.attending <= event.capacity, `${event.title}: attending <= capacity`);
      assert.match(event.startsOn, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("contains nothing that looks like a real person's contact details", () => {
    const text = JSON.stringify({ DEMO_EVENTS, DEMO_GUESTS });
    assert.doesNotMatch(text, /@/, "no email addresses");
    assert.doesNotMatch(text, /\d{3}[-. ]\d{3}[-. ]\d{4}/, "no phone numbers");
  });

  it("never touches the database: nothing under lib/demo imports Supabase", () => {
    const dir = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    // Matches `import ... from "...supabase..."`, `require("...supabase...")` and
    // dynamic `import("...supabase...")`, but not a comment that mentions the word.
    const importsSupabase = /(?:from|require\(|import\()\s*["'][^"']*supabase[^"']*["']/i;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      assert.doesNotMatch(readFileSync(join(dir, file), "utf8"), importsSupabase, `${file} must not import Supabase`);
    }
  });
});
