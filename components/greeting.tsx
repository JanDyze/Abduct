"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

function partOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// "Good evening, Sam" by the phone's clock (the server's is UTC). Says "Hello" until it knows.
export function Greeting({ name }: { name: string | null }) {
  const hello = useSyncExternalStore(noSubscription, partOfDay, () => "Hello");
  return (
    <>
      {hello}
      {name ? `, ${name}` : ""}
    </>
  );
}
