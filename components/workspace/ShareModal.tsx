"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Avatar, Button, Modal, Toggle, inputCls } from "../ui";

const ROLES = [
  { id: "viewer", label: "Can view", sub: "Preview and comment" },
  { id: "builder", label: "Can build", sub: "Chat with the agent, edit UI" },
  { id: "developer", label: "Developer", sub: "Code, terminal, secrets, deploy" },
];

export function ShareModal({ open, onClose, projectName, owner }: { open: boolean; onClose: () => void; projectName: string; owner: { name: string; email: string } }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("developer");
  const [people, setPeople] = useState<{ email: string; role: string }[]>([]);
  const [linkOn, setLinkOn] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title={`Share ${projectName}`} subtitle="Invite teammates to the same project. Builders and developers work on one source of truth.">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\S+@\S+\.\S+$/.test(email)) return;
          setPeople((p) => [...p, { email, role }]);
          setEmail("");
        }}
      >
        <input className={inputCls} placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px] outline-none" aria-label="Role">
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <Button variant="primary" type="submit">Invite</Button>
      </form>
      <p className="mt-1.5 text-[11.5px] text-ink-3">{ROLES.find((r) => r.id === role)?.sub}</p>

      <ul className="mt-4 space-y-2">
        <li className="flex items-center gap-2.5 text-[13px]">
          <Avatar name={owner.name} size={28} />
          <span className="flex-1"><span className="font-medium">{owner.name}</span> <span className="text-ink-3">(you)</span><span className="block text-[12px] text-ink-3">{owner.email}</span></span>
          <span className="text-[12px] text-ink-3">Owner</span>
        </li>
        {people.map((p) => (
          <li key={p.email} className="anim-rise flex items-center gap-2.5 text-[13px]">
            <Avatar name={p.email} size={28} />
            <span className="flex-1"><span className="font-medium">{p.email}</span><span className="block text-[12px] text-ink-3">Invite pending</span></span>
            <span className="text-[12px] text-ink-3">{ROLES.find((r) => r.id === p.role)?.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center gap-3 rounded-lg border border-line p-3">
        <Link2 className="size-4 text-ink-3" />
        <span className="flex-1 text-[13px]">
          <span className="font-medium">Anyone with the link can view the preview</span>
          <span className="block text-[12px] text-ink-3">Great for quick feedback. Viewers can&apos;t edit.</span>
        </span>
        <Toggle on={linkOn} onChange={setLinkOn} label="Link sharing" />
      </div>
      {linkOn && (
        <Button
          className="mt-2 w-full"
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy preview link"}
        </Button>
      )}
    </Modal>
  );
}
