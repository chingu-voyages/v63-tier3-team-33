/**
 * Sample data for the public guest demo ("Continue as Guest").
 *
 * Everything here is made up and lives in code, NOT in the database. That is
 * the point: a demo visitor has no session, so there is no path from the demo
 * to real organisations, events, invitees or registrations. Never import
 * `@/lib/supabase/*` into anything under lib/demo or the demo pages.
 *
 * Replace or extend this when the real event model exists, keeping the same
 * shape so the demo pages can render either.
 */

export type DemoEvent = {
  id: string;
  title: string;
  /** ISO date (no time zone): demo events are always shown as "upcoming". */
  startsOn: string;
  location: string;
  organiser: string;
  attending: number;
  capacity: number;
};

export const DEMO_ORGANISATION = "Acme Events (demo)";

export const DEMO_EVENTS: readonly DemoEvent[] = [
  { id: "demo-1", title: "Product Launch Mixer", startsOn: "2027-03-12", location: "Riverside Hall", organiser: DEMO_ORGANISATION, attending: 84, capacity: 120 },
  { id: "demo-2", title: "Community Garden Day", startsOn: "2027-04-02", location: "Elm Street Park", organiser: DEMO_ORGANISATION, attending: 31, capacity: 60 },
  { id: "demo-3", title: "Annual Team Offsite", startsOn: "2027-05-20", location: "Lakeside Lodge", organiser: DEMO_ORGANISATION, attending: 47, capacity: 50 },
];

/** Clearly fake guest names for the demo RSVP list. */
export const DEMO_GUESTS: readonly string[] = ["Alex Sample", "Jordan Example", "Sam Placeholder", "Riley Demo"];
