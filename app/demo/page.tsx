import type { Metadata } from "next";
import { DEMO_EVENTS, DEMO_GUESTS, DEMO_ORGANISATION } from "@/lib/demo/sample-data";

export const metadata: Metadata = { title: "Guest demo" };

// PUBLIC and static on purpose: no cookies, no session, no database. Nothing on
// this page comes from a real account (see lib/demo/sample-data.ts), so a
// guest can look around but can't reach any real organisation's information.
// This is backend scaffolding; the frontend owner styles it.
export default function DemoPage() {
  return (
    <main>
      <h1>Guest demo</h1>
      <p>You&apos;re exploring sample data. Sign up to create your own events.</p>
      <h2>{DEMO_ORGANISATION}</h2>
      <ul>
        {DEMO_EVENTS.map((event) => (
          <li key={event.id}>
            {event.title} · {event.startsOn} · {event.location} · {event.attending}/{event.capacity} attending
          </li>
        ))}
      </ul>
      <h2>Sample guest list</h2>
      <ul>
        {DEMO_GUESTS.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </main>
  );
}
