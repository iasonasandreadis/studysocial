import type { ReactNode } from "react";
export function AccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="container account-shell">
      <aside className="account-story">
        <p className="eyebrow">YOUR PEOPLE. YOUR PLACE.</p>
        <h2>
          Study days.
          <br />
          Good
          <br />
          <span>company.</span>
        </h2>
        <p>
          Come as you are.
          <br />
          The study selfies and the study breaks.
        </p>
        <span className="account-spark" aria-hidden="true">
          ✳
        </span>
      </aside>
      <section className="account-card" aria-labelledby="account-title">
        <p className="eyebrow">WELCOME TO STUDYSOCIAL</p>
        <h1 id="account-title">{title}</h1>
        <p className="account-description">{description}</p>
        {children}
      </section>
    </main>
  );
}
