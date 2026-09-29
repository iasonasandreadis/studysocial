const chapters = [
  {
    number: "01",
    title: "Make room for focus.",
    text: "A place to build your study rhythm, one manageable session at a time.",
    icon: "↗",
  },
  {
    number: "02",
    title: "Share the small wins.",
    text: "That finished chapter. Those finally-clear notes. The effort behind the result.",
    icon: "✳",
  },
  {
    number: "03",
    title: "Find your people.",
    text: "Encouragement from people working toward something, just like you.",
    icon: "↔",
  },
];

export default function Home() {
  return (
    <main id="main">
      <section className="container hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> A new chapter is coming
          </p>
          <h1 id="hero-title">
            Your goals.
            <br />
            Your people.
            <br />
            <span>Your next chapter.</span>
          </h1>
          <p className="hero-description">
            Big dreams start with small study sessions.
            <br className="desktop-break" /> Find the focus, share the effort,
            and grow together.
          </p>
          <a href="#idea" className="button">
            Meet StudySocial <span aria-hidden="true">↗</span>
          </a>
          <p className="hero-note">
            A social home for your study journey. In the making.
          </p>
        </div>
        <div
          className="study-art"
          role="img"
          aria-label="Illustration of a notebook, a pencil, and a reminder that small steps add up."
        >
          <div className="art-grid" />
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <div className="art-heading">
            A LITTLE FOCUS, A LITTLE TOGETHERNESS.
          </div>
          <div className="notebook">
            <div className="notebook-binding" />
            <div className="notebook-content">
              <span className="notebook-label">NOTE TO SELF / 001</span>
              <p>
                Small steps.
                <br />
                Big things.
              </p>
              <div className="notebook-rule" />
              <div className="notebook-rule short" />
              <span className="notebook-star">✳</span>
              <span className="notebook-bottom">Keep showing up for you.</span>
            </div>
          </div>
          <div className="pencil" />
          <div className="sticky-note">
            You don’t have to
            <br />
            do it alone.<span aria-hidden="true">↗</span>
          </div>
          <div className="art-caption">
            <span className="mini-spark">✧</span> Progress looks good on you.
          </div>
        </div>
      </section>
      <div className="loop-strip">
        <div className="container">
          <span>STUDY</span>
          <span aria-hidden="true">↗</span>
          <span>CAPTURE</span>
          <span aria-hidden="true">↗</span>
          <span>SHARE</span>
          <span aria-hidden="true">↗</span>
          <span>CONNECT</span>
          <span aria-hidden="true">↗</span>
          <span>GO AGAIN</span>
          <span aria-hidden="true">↺</span>
        </div>
      </div>
      <section
        className="container idea-section"
        id="idea"
        aria-labelledby="idea-title"
      >
        <div className="section-heading">
          <p className="eyebrow">THE IDEA</p>
          <h2 id="idea-title">
            Studying is personal.
            <br />
            <span>Motivation can be shared.</span>
          </h2>
          <p>
            We’re building a space for the real work in between the milestones.
            Less pressure. More people in your corner.
          </p>
        </div>
        <div className="chapter-grid">
          {chapters.map((chapter) => (
            <article className="chapter" key={chapter.number}>
              <div className="chapter-top">
                <span>{chapter.number} /</span>
                <span className="chapter-icon" aria-hidden="true">
                  {chapter.icon}
                </span>
              </div>
              <h3>{chapter.title}</h3>
              <p>{chapter.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        className="container next-section"
        id="what-is-next"
        aria-labelledby="next-title"
      >
        <div>
          <p className="eyebrow">STARTING SMALL. THINKING AHEAD.</p>
          <h2 id="next-title">
            The first chapter
            <br />
            is taking shape.
          </h2>
          <p>
            Starting with students preparing for Greece’s Panhellenic exams.
            Growing toward a study community without borders.
          </p>
        </div>
        <aside className="progress-note">
          <span className="coming-label">ON THE HORIZON</span>
          <h3>A space to make it yours.</h3>
          <p>
            Study sessions, photo moments, and supportive communities are
            planned. Account setup is the first step. Study tools are still on
            the way.
          </p>
          <div className="progress-note-bottom">
            <span className="status-dot" /> Built one thoughtful step at a time.
          </div>
        </aside>
      </section>
    </main>
  );
}
