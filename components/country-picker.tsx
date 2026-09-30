"use client";

import { useState, useTransition } from "react";
import { saveCountry } from "@/app/settings/actions";
import { Picker } from "@/components/ui/picker";

// Settings: your country, for Popular in ... and where to watch. Automatic works it out from where
// you are (and names what it found); or pick one.
export function CountryPicker({ current, detected, countries }: { current: string | null; detected: string; countries: { code: string; name: string }[] }) {
  const [value, setValue] = useState(current ?? "auto");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  return (
    <div>
      <Picker
        value={value}
        label="Your country"
        options={[{ value: "auto", label: `Automatic (${detected})` }, ...countries.map((c) => ({ value: c.code, label: c.name }))]}
        onChange={(next) => {
          const before = value;
          setValue(next);
          setError(null);
          start(async () => {
            const res = await saveCountry(next);
            if (res.error) {
              setValue(before);
              setError(res.error);
            }
          });
        }}
        className="w-full"
      />
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
