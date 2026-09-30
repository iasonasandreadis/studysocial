import Link from "next/link";
export default function Home() {
  return (
    <main id="main" className="social-landing container">
      <section className="social-hero">
        <p className="eyebrow">STUDY DAYS. GOOD COMPANY.</p>
        <h1>
          A little studying.
          <br />A lot of <span>being you.</span>
        </h1>
        <p className="social-intro">
          The desk selfies. The revision memes. The friends who get it. Your
          student life has a home here.
        </p>
        <div className="landing-actions">
          <Link href="/signup" className="button">
            Join StudySocial →
          </Link>
          <Link href="/login" className="text-button">
            Already here? Log in
          </Link>
        </div>
        <p className="hero-note">Start private. Share with your people.</p>
      </section>
      <section className="moment-board" aria-label="What you can share">
        <div className="moment-tile lilac">
          <span aria-hidden="true">✳</span>
          <p>
            Desk selfie?
            <br />
            Always.
          </p>
          <small>YOUR EVERYDAY MOMENTS</small>
        </div>
        <div className="moment-tile peach">
          <span aria-hidden="true">☺</span>
          <p>
            Here for the
            <br />
            study breaks.
          </p>
          <small>MEMES & LITTLE WINS</small>
        </div>
        <div className="moment-tile blue">
          <span aria-hidden="true">↗</span>
          <p>
            Find your
            <br />
            kind of people.
          </p>
          <small>FRIENDS & CLUBS</small>
        </div>
      </section>
      <section className="landing-bottom">
        <h2>Your people make it better.</h2>
        <p>
          Share a photo, find friends, or start a club for your school or
          favourite subject. Study timers are here when you want them, too.
        </p>
        <Link className="button" href="/signup">
          Create your account
        </Link>
      </section>
    </main>
  );
}
