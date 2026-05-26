"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, CircleAlert, UserPlus } from "lucide-react";
import type { InvitationNotice } from "@/lib/admin-demo-types";

export function InviteAcceptClient({ invitation }: { invitation: InvitationNotice }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "accepted" | "error">(invitation.status === "PENDING" ? "idle" : "error");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "saving" || invitation.status !== "PENDING") {
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch(`/api/invite/${encodeURIComponent(invitation.token)}/accept?locale=cs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      setStatus(response.ok ? "accepted" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "accepted") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={17} />
          Pozvánka je přijatá. Přístup je připravený pro {invitation.email}.
        </div>
      </div>
    );
  }

  if (invitation.status !== "PENDING") {
    return (
      <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-800">
        <div className="flex items-center gap-2">
          <CircleAlert size={17} />
          Tato pozvánka už není aktivní.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-[#20242a]">
        Jméno uživatele
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Např. Jana Nováková"
          className="rounded-md border border-black/10 bg-white px-3 py-3 font-normal text-[#20242a] outline-none transition focus:border-[#f45d1f]"
        />
      </label>
      <button
        type="submit"
        disabled={status === "saving"}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f45d1f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d94410] disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
      >
        <UserPlus size={16} />
        {status === "saving" ? "Ukládám" : "Přijmout pozvánku"}
      </button>
      {status === "error" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Pozvánku se nepodařilo přijmout. Požádej administrátora o novou pozvánku.
        </div>
      ) : null}
    </form>
  );
}
