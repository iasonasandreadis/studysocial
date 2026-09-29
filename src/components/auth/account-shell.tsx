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
        <p className="eyebrow">YOUR NEXT CHAPTER</p>
        <h1>
          A little focus.
          <br />A little
          <br />
          <span>togetherness.</span>
        </h1>
        <p>
          You bring the ambition.
          <br />
          Let’s make room for the journey.
        </p>
        <span className="account-spark" aria-hidden="true">
          ✳
        </span>
      </aside>
      <section className="account-card" aria-labelledby="account-title">
        <p className="eyebrow">WELCOME TO STUDYSOCIAL</p>
        <h2 id="account-title">{title}</h2>
        <p className="account-description">{description}</p>
        {children}
      </section>
    </main>
  );
}
