"use client";
import { useActionState } from "react";
import {
  createCommunity,
  communityAction,
  schoolDiscovery,
} from "@/app/communities/actions";
export function Membership({
  id,
  action,
  label,
  member,
}: {
  id: string;
  action: string;
  label: string;
  member?: string;
}) {
  const [state, submit, pending] = useActionState(communityAction, {});
  return (
    <form action={submit}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="member" value={member ?? ""} />
      <button className="button" disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="field-hint">
          {state.message}
        </p>
      )}
    </form>
  );
}
export function SchoolChoice({ shared }: { shared: boolean }) {
  const [state, action, pending] = useActionState(schoolDiscovery, {});
  return (
    <form action={action} className="account-form">
      <label className="check-option">
        <input name="share_school" type="checkbox" defaultChecked={shared} />{" "}
        Let people who can view my profile find me by my saved school
      </label>
      <p className="field-hint">
        Off by default. This permits school matching and searching your custom
        school name. Your other academic sharing choices are in Edit profile.
      </p>
      <button className="text-button" disabled={pending}>
        Save school discovery choice
      </button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
export function CommunityForm({
  id,
  schools,
}: {
  id: string;
  schools: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createCommunity, {});
  return (
    <form
      action={action}
      className="account-form"
      onReset={(e) => e.preventDefault()}
    >
      <input type="hidden" name="id" value={id} />
      <fieldset disabled={pending}>
        <label>
          Name
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Description
          <textarea name="description" maxLength={1000} rows={3} />
        </label>
        <label>
          Club type
          <select name="kind" defaultValue="school">
            {["school", "university", "subject", "exam", "goal", "group"].map(
              (k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          School <span className="optional">(optional)</span>
          <select name="school_id">
            <option value="">No catalog school</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visibility
          <select name="visibility" defaultValue="private">
            <option value="private">Private — approve requests</option>
            <option value="public">Public — anyone signed in can view</option>
          </select>
        </label>
        <p className="field-hint">
          Clubs are created by students. A private club’s details are visible
          only to members; people with its link can request to join.
        </p>
        <button className="button">
          {pending ? "Creating…" : "Create club"}
        </button>
      </fieldset>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
