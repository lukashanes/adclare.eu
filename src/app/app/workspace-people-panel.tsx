"use client";

import { Plus, RefreshCw, Save, X } from "lucide-react";
import type { AppMemberUpdateInput, AppWorkspacePayload, InviteInput } from "@/lib/workspace-types";

function roleNeedsBranch(role: InviteInput["role"]) {
  return role !== "PARTY_ADMIN" && role !== "CENTRAL_REVIEWER" && role !== "READONLY_AUDITOR" && role !== "SUPER_ADMIN" && role !== "CANDIDATE";
}

function roleNeedsCandidate(role: InviteInput["role"]) {
  return role === "CANDIDATE";
}

function invitationEmailText(invitation: AppWorkspacePayload["users"]["invitations"][number]) {
  if (invitation.emailStatusKey === "SENT") {
    return "e-mail odeslán";
  }

  if (invitation.emailStatusKey === "FAILED") {
    return "e-mail se nepodařilo odeslat";
  }

  return "čeká na odeslání";
}

export function PeoplePanel({
  users,
  form,
  saving,
  retryingInviteId,
  invitationActionId,
  memberSavingId,
  message,
  onChange,
  onCreate,
  onRetryEmail,
  onRevokeInvitation,
  onUpdateMember,
}: {
  users: AppWorkspacePayload["users"];
  form: InviteInput;
  saving: boolean;
  retryingInviteId: string;
  invitationActionId: string;
  memberSavingId: string;
  message: string;
  onChange: (form: InviteInput) => void;
  onCreate: () => void;
  onRetryEmail: (invitationId: string) => void;
  onRevokeInvitation: (invitationId: string) => void;
  onUpdateMember: (memberId: string, input: AppMemberUpdateInput) => void;
}) {
  const inviteRoleNeedsBranch = roleNeedsBranch(form.role);
  const inviteRoleNeedsCandidate = roleNeedsCandidate(form.role);
  const activeCandidates = users.candidates.filter((candidate) => !candidate.archived);
  const inviteCandidate = users.candidates.find((candidate) => candidate.id === form.candidateId) ?? activeCandidates[0] ?? null;
  const activeCount = users.members.filter((member) => member.statusKey === "ACTIVE").length;
  const disabledCount = users.members.filter((member) => member.statusKey === "DISABLED").length;
  const pendingInvitations = users.invitations.filter((invitation) => invitation.statusKey === "PENDING").length;
  const emailActionCount = users.invitations.filter((invitation) => invitation.statusKey === "PENDING" && invitation.emailStatusKey !== "SENT").length;
  const roleCounts = Array.from(
    users.members.reduce((counts, member) => counts.set(member.role, (counts.get(member.role) ?? 0) + 1), new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "cs"));
  const displayedMembers = [...users.members].sort(
    (a, b) => Number(a.statusKey === "DISABLED") - Number(b.statusKey === "DISABLED") || a.name.localeCompare(b.name, "cs"),
  );
  const actionInvitations = users.invitations.filter((invitation) => invitation.statusKey === "PENDING" && invitation.emailStatusKey !== "SENT").slice(0, 3);
  const inviteCandidateMissing = inviteRoleNeedsCandidate && !form.candidateId;

  function updateInviteRole(role: InviteInput["role"]) {
    const nextCandidate = roleNeedsCandidate(role) ? inviteCandidate : null;
    onChange({
      ...form,
      role,
      candidateId: nextCandidate?.id ?? "",
      branchId: roleNeedsCandidate(role) ? nextCandidate?.branchId ?? "" : form.branchId,
    });
  }

  function updateInviteCandidate(candidateId: string) {
    const candidate = users.candidates.find((item) => item.id === candidateId);
    onChange({
      ...form,
      candidateId,
      branchId: candidate?.branchId ?? form.branchId,
    });
  }

  return (
    <section id="people" className="grid min-w-0 scroll-mt-6 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <article className="min-w-0 rounded-md border border-black/10 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-black">Správa lidí</h2>
            <p className="mt-1 text-sm text-[#59616b]">Přístupy, role a pozvánky.</p>
          </div>
          <span className="inline-flex w-fit rounded-md border border-black/10 bg-[#fbfbfc] px-3 py-1.5 text-sm font-semibold text-[#25282d]">
            {activeCount} aktivních
          </span>
        </div>

        <div className="mt-4 rounded-md border border-black/10 bg-[#fbfbfc] p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-black">Přístupy a pozvánky</h3>
              <p className="mt-1 text-sm leading-6 text-[#59616b]">
                Kdo má přístup, kdo čeká a komu poslat e-mail znovu.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[560px]">
              {[
                ["Aktivní přístupy", activeCount],
                ["Čeká na přijetí", pendingInvitations],
                ["E-maily k odeslání", emailActionCount],
                ["Pozastaveno", disabledCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-black/10 bg-white p-2">
                  <div className="text-xs font-semibold text-[#68707a]">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-black">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-md border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">Role v týmu</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roleCounts.length ? (
                  roleCounts.map(([role, count]) => (
                    <span key={role} className="rounded-md bg-[#f1f2f4] px-2 py-1 text-xs font-semibold text-[#59616b]">
                      {role}: {count}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[#59616b]">Zatím bez členů.</span>
                )}
              </div>
            </div>
            <div className="rounded-md border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68707a]">Pozvánky k dořešení</div>
              {actionInvitations.length ? (
                <div className="mt-2 grid gap-1.5">
                  {actionInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md bg-orange-50 px-2 py-1.5 text-xs font-semibold text-orange-800">
                      <span className="min-w-0 break-all">{invitation.email}</span>
                      <span>{invitationEmailText(invitation)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#59616b]">Žádná pozvánka teď nečeká na dořešení e-mailu.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#68707a]">Členové týmu</h3>
            <div className="mt-2 grid gap-2">
              {displayedMembers.map((member) => (
                <form
                  key={member.id}
                  className="grid min-w-0 gap-2 rounded-md border border-black/10 bg-[#fbfbfc] p-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(160px,1.1fr)_minmax(150px,190px)_minmax(150px,190px)_minmax(150px,190px)_130px_120px] 2xl:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    onUpdateMember(member.id, {
                      name: String(formData.get("name") ?? ""),
                      role: String(formData.get("role") ?? member.roleKey) as AppMemberUpdateInput["role"],
                      branchId: String(formData.get("branchId") ?? ""),
                      candidateId: String(formData.get("candidateId") ?? ""),
                      status: String(formData.get("status") ?? member.statusKey) as AppMemberUpdateInput["status"],
                    });
                  }}
                >
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Jméno
                    <input
                      name="name"
                      defaultValue={member.name}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#f45d1f]"
                    />
                    <span className="break-all text-xs font-medium text-[#59616b]">{member.email}</span>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Role
                    <select
                      name="role"
                      defaultValue={member.roleKey}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]"
                    >
                      {users.assignableRoles.some((role) => role.value === member.roleKey) ? null : <option value={member.roleKey}>{member.role}</option>}
                      {users.assignableRoles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Pobočka
                    <select
                      name="branchId"
                      defaultValue={member.branchId}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]"
                    >
                      <option value="">Celá strana</option>
                      {users.branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Kandidát
                    <select
                      name="candidateId"
                      defaultValue={member.candidateId}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]"
                    >
                      <option value="">Bez kandidáta</option>
                      {users.candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#68707a]">
                    Stav
                    <select
                      name="status"
                      defaultValue={member.statusKey}
                      className="min-w-0 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#20242a] outline-none focus:border-[#f45d1f]"
                    >
                      <option value="ACTIVE">Aktivní</option>
                      <option value="DISABLED">Pozastavený</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={Boolean(memberSavingId)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#11161c] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
                  >
                    <Save size={15} />
                    {memberSavingId === member.id ? "Ukládám" : "Uložit"}
                  </button>
                </form>
              ))}
              {users.members.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Zatím není přidaný žádný člověk.</div> : null}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#68707a]">Poslední pozvánky</h3>
            <div className="mt-2 grid gap-2">
              {users.invitations.slice(0, 6).map((invitation) => (
                <div key={invitation.id} className="rounded-md border border-black/10 bg-[#fbfbfc] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="break-all font-semibold text-black">{invitation.email}</div>
                      <div className="mt-1 text-sm text-[#59616b]">
                        {invitation.role} · {invitation.scope}
                      </div>
                    </div>
                    <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-[#25282d]">{invitation.status}</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[#68707a]">
                    {invitationEmailText(invitation)} · do {invitation.expiresAt}
                  </div>
                  {invitation.inviteUrl ? (
                    <a className="mt-2 block break-all text-xs font-semibold text-[#d94410]" href={invitation.inviteUrl}>
                      {invitation.inviteUrl}
                    </a>
                  ) : null}
                  {invitation.emailStatusKey !== "SENT" ? (
                    <button
                      type="button"
                      onClick={() => onRetryEmail(invitation.id)}
                      disabled={Boolean(retryingInviteId) || invitation.statusKey === "REVOKED" || invitation.statusKey === "ACCEPTED"}
                      className="mt-2 inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800 disabled:cursor-not-allowed disabled:text-[#9aa0a8]"
                    >
                      <RefreshCw size={15} />
                      {retryingInviteId === invitation.id ? "Odesílám" : "Zkusit odeslat znovu"}
                    </button>
                  ) : null}
                  {invitation.statusKey !== "ACCEPTED" && invitation.statusKey !== "REVOKED" ? (
                    <button
                      type="button"
                      onClick={() => onRevokeInvitation(invitation.id)}
                      disabled={Boolean(invitationActionId)}
                      className="mt-2 inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#25282d] disabled:cursor-not-allowed disabled:text-[#9aa0a8]"
                    >
                      <X size={15} />
                      {invitationActionId === invitation.id ? "Ruším" : "Zrušit pozvánku"}
                    </button>
                  ) : null}
                </div>
              ))}
              {users.invitations.length === 0 ? <div className="rounded-md border border-black/10 p-3 text-sm text-[#59616b]">Zatím nebyla odeslaná žádná pozvánka.</div> : null}
            </div>
          </div>
        </div>
      </article>

      <aside className="min-w-0 rounded-md border border-black/10 bg-white p-4">
        <h2 className="text-lg font-semibold text-black">Pozvat člověka</h2>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
              placeholder="napr. grafik@example.cz"
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f]"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
            Role
            <select
              value={form.role}
              onChange={(event) => updateInviteRole(event.target.value as InviteInput["role"])}
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f]"
            >
              {users.assignableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          {inviteRoleNeedsCandidate ? (
            <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
              Kandidát
              <select
                value={form.candidateId ?? ""}
                onChange={(event) => updateInviteCandidate(event.target.value)}
                className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f]"
              >
                <option value="">Vyberte kandidáta</option>
                {activeCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="grid gap-1.5 text-sm font-semibold text-[#20242a]">
            Pobočka nebo oblast
            <select
              value={form.branchId ?? ""}
              onChange={(event) => onChange({ ...form, branchId: event.target.value })}
              disabled={!inviteRoleNeedsBranch}
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-normal outline-none focus:border-[#f45d1f] disabled:bg-[#f1f2f4]"
            >
              <option value="">{inviteRoleNeedsBranch ? "Vyberte pobočku" : "Celá strana"}</option>
              {users.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onCreate}
            disabled={saving || !form.email.trim() || (inviteRoleNeedsBranch && !form.branchId) || inviteCandidateMissing}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#11161c] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9cdd3]"
          >
            <Plus size={15} />
            {saving ? "Posílám" : "Poslat pozvánku"}
          </button>

          {message ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              Pozvánka je připravená.
              <a className="mt-1 block break-all text-[#166534]" href={message}>
                {message}
              </a>
            </div>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
