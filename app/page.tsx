import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();
  if (session?.role === "TECH") redirect("/tech");
  if (session?.role === "REVIEWER") redirect("/review");
  if (session?.role === "ADMIN") redirect("/admin");

  // Unauthenticated — show marketing landing page
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, system-ui, sans-serif" }}>
      <style>{`
        /* ── Design tokens ─────────────────────────────────── */
        :root {
          --ground:      #F5F2EC;
          --surface:     #EDEAE3;
          --surface-2:   #E2DDD5;
          --ink-strong:  #151A24;
          --ink:         #2C3346;
          --ink-dim:     #6C7280;
          --accent:      #B85C1A;
          --accent-h:    #9E4F16;
          --rule:        #CFC9BF;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --ground:     #0F1219;
            --surface:    #171D28;
            --surface-2:  #1E2535;
            --ink-strong: #EDE9E2;
            --ink:        #C2BDB4;
            --ink-dim:    #8A8F9A;
            --accent:     #D4721F;
            --accent-h:   #E07E2A;
            --rule:       #283040;
          }
        }
        :root[data-theme="light"] {
          --ground:#F5F2EC; --surface:#EDEAE3; --surface-2:#E2DDD5;
          --ink-strong:#151A24; --ink:#2C3346; --ink-dim:#6C7280;
          --accent:#B85C1A; --accent-h:#9E4F16; --rule:#CFC9BF;
        }
        :root[data-theme="dark"] {
          --ground:#0F1219; --surface:#171D28; --surface-2:#1E2535;
          --ink-strong:#EDE9E2; --ink:#C2BDB4; --ink-dim:#8A8F9A;
          --accent:#D4721F; --accent-h:#E07E2A; --rule:#283040;
        }

        .lp-body { background: var(--ground); color: var(--ink); min-height: 100vh; }

        /* Nav */
        .lp-nav {
          position: sticky; top: 0; z-index: 100;
          background: var(--ground); border-bottom: 1px solid var(--rule);
          height: 3.5rem; display: flex; align-items: center;
          justify-content: space-between;
          padding: 0 clamp(1.25rem, 4vw, 3rem);
        }
        .lp-logo {
          font-size: 1.125rem; font-weight: 800; letter-spacing: -0.025em;
          color: var(--ink-strong); text-decoration: none;
        }
        .lp-logo .G { color: var(--accent); }
        .lp-nav-btn {
          font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.01em;
          color: var(--accent); text-decoration: none;
          border: 1.5px solid var(--accent); padding: 0.4rem 1rem;
          border-radius: 2px; transition: background 0.14s, color 0.14s;
        }
        .lp-nav-btn:hover { background: var(--accent); color: #fff; }
        .lp-nav-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        /* Hero */
        .lp-hero {
          min-height: calc(100vh - 3.5rem);
          display: flex; flex-direction: column; justify-content: center;
          padding: 7rem clamp(1.25rem, 4vw, 3rem);
          max-width: 72rem; margin: 0 auto;
        }
        .lp-question {
          font-size: clamp(0.875rem, 2vw, 1.25rem); font-weight: 400;
          color: var(--ink-dim); margin-bottom: 0.375rem;
        }
        .lp-brand {
          font-size: clamp(5rem, 14vw, 10.5rem); font-weight: 800;
          letter-spacing: -0.045em; line-height: 0.9;
          color: var(--ink-strong); margin-bottom: 2rem;
        }
        .lp-brand .G { color: var(--accent); }
        .lp-rule { width: 2.5rem; height: 2px; background: var(--accent); margin-bottom: 1.5rem; }
        .lp-sub {
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(1rem, 2vw, 1.1875rem);
          color: var(--ink); max-width: 36rem; line-height: 1.7; margin-bottom: 2.25rem;
        }
        .lp-hero-btns { display: flex; gap: 1rem; flex-wrap: wrap; }
        .btn-tour {
          display: inline-block; font-size: 0.9375rem; font-weight: 700;
          letter-spacing: 0.01em; color: #fff; background: var(--accent);
          border: none; padding: 0.9375rem 1.75rem; border-radius: 2px;
          cursor: pointer; text-decoration: none; transition: background 0.14s;
        }
        .btn-tour:hover { background: var(--accent-h); }
        .btn-tour:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        .btn-ghost {
          display: inline-block; font-size: 0.875rem; font-weight: 600;
          color: var(--ink-dim); text-decoration: none;
          border: 1.5px solid var(--rule); padding: 0.875rem 1.5rem;
          border-radius: 2px; transition: border-color 0.14s, color 0.14s;
        }
        .btn-ghost:hover { border-color: var(--ink-dim); color: var(--ink-strong); }

        /* Sections */
        .s-tinted {
          padding: 4.5rem clamp(1.25rem, 4vw, 3rem);
          background: var(--surface); border-top: 1px solid var(--rule);
          border-bottom: 1px solid var(--rule);
        }
        .s-light { padding: 4.5rem clamp(1.25rem, 4vw, 3rem); background: var(--ground); }
        .s-dark { padding: 6rem clamp(1.25rem, 4vw, 3rem); background: var(--ink-strong); }
        .s-inner { max-width: 72rem; margin: 0 auto; }
        .eyebrow {
          font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--ink-dim); margin-bottom: 1.75rem;
        }

        /* Problem */
        .problem-grid {
          display: grid; grid-template-columns: 1fr 18rem; gap: 3.5rem; align-items: start;
        }
        @media (max-width: 720px) { .problem-grid { grid-template-columns: 1fr; gap: 2rem; } }
        .problem-copy p {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1.0625rem; line-height: 1.78; color: var(--ink);
        }
        .problem-copy p + p { margin-top: 1.125rem; }
        .stat-block {
          border-left: 3px solid var(--accent); padding: 1.375rem 1.5rem;
          background: var(--surface-2);
        }
        .stat-num {
          font-size: 2.75rem; font-weight: 800; letter-spacing: -0.04em;
          color: var(--ink-strong); line-height: 1; margin-bottom: 0.625rem;
          font-variant-numeric: tabular-nums;
        }
        .stat-caption {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 0.9rem; color: var(--ink-dim); line-height: 1.6;
        }

        /* Features */
        .features-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          border-top: 1px solid var(--rule); border-left: 1px solid var(--rule);
        }
        @media (max-width: 640px) { .features-grid { grid-template-columns: 1fr; } }
        .feature {
          padding: 1.75rem 1.75rem 1.75rem 1.5rem;
          border-right: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
        }
        .feature-id { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.12em; color: var(--accent); margin-bottom: 0.625rem; }
        .feature-title { font-size: 0.9375rem; font-weight: 700; letter-spacing: -0.01em; color: var(--ink-strong); margin-bottom: 0.5rem; }
        .feature-desc { font-family: Georgia, "Times New Roman", serif; font-size: 0.9375rem; color: var(--ink); line-height: 1.7; }

        /* Why Now */
        .why-list { border-top: 1px solid var(--rule); }
        .why-item {
          display: grid; grid-template-columns: 2.75rem 1fr;
          gap: 1.5rem; padding: 1.75rem 0; border-bottom: 1px solid var(--rule); align-items: start;
        }
        @media (max-width: 480px) { .why-item { grid-template-columns: 2rem 1fr; gap: 1rem; } }
        .why-marker { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; color: var(--accent); padding-top: 0.25rem; }
        .why-body { font-family: Georgia, "Times New Roman", serif; font-size: 1rem; line-height: 1.75; color: var(--ink); }
        .why-body strong {
          font-family: "Helvetica Neue", Arial, system-ui, sans-serif;
          font-weight: 700; font-size: 0.9375rem; color: var(--ink-strong);
          display: block; margin-bottom: 0.375rem;
        }

        /* CTA */
        .cta-inner { max-width: 40rem; margin: 0 auto; text-align: center; }
        .cta-headline {
          font-size: clamp(2.25rem, 5vw, 3.5rem); font-weight: 800;
          letter-spacing: -0.04em; color: #fff; line-height: 1.05;
          margin-bottom: 1rem; text-wrap: balance;
        }
        .cta-headline .G { color: var(--accent); }
        .cta-sub {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1rem; color: rgba(255,255,255,0.55); line-height: 1.65;
          max-width: 32rem; margin: 0 auto 2.25rem;
        }
        .cta-btn {
          display: inline-block; font-size: 1rem; font-weight: 700;
          letter-spacing: 0.01em; color: var(--ink-strong); background: #fff;
          border: none; padding: 1rem 2rem; border-radius: 2px;
          cursor: pointer; text-decoration: none; transition: opacity 0.14s;
        }
        .cta-btn:hover { opacity: 0.88; }
        .cta-btn:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

        /* Footer */
        .lp-footer { background: var(--ink-strong); border-top: 1px solid rgba(255,255,255,0.07); padding: 1.75rem clamp(1.25rem, 4vw, 3rem); }
        .footer-inner { max-width: 72rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        .footer-brand { font-weight: 800; font-size: 0.9375rem; letter-spacing: -0.02em; color: rgba(255,255,255,0.75); }
        .footer-brand .G { color: var(--accent); }
        .footer-tagline { font-family: Georgia, "Times New Roman", serif; font-size: 0.8125rem; color: rgba(255,255,255,0.3); margin-top: 0.2rem; }
        .footer-links { display: flex; gap: 1.5rem; list-style: none; padding: 0; margin: 0; }
        .footer-links a { font-size: 0.8125rem; color: rgba(255,255,255,0.35); text-decoration: none; transition: color 0.12s; }
        .footer-links a:hover { color: rgba(255,255,255,0.7); }

        /* Scroll reveal */
        @media (prefers-reduced-motion: no-preference) {
          .reveal { opacity: 0; transform: translateY(14px); transition: opacity 0.55s ease, transform 0.55s ease; }
          .reveal.in { opacity: 1; transform: none; }
        }
      `}</style>

      <div className="lp-body">
        {/* Nav */}
        <nav className="lp-nav">
          <span className="lp-logo">Hau<span className="G">G</span>en</span>
          <Link href="/login" className="lp-nav-btn">Take the tour →</Link>
        </nav>

        {/* Hero */}
        <section className="lp-hero">
          <p className="lp-question">How do you diagnose it?</p>
          <h1 className="lp-brand">Hau<span className="G">G</span>en.</h1>
          <div className="lp-rule" />
          <p className="lp-sub">An AI diagnostic companion that gives plumbing technicians a confidence-scored second opinion in the field — in seconds, not service calls.</p>
          <div className="lp-hero-btns">
            <Link href="/login" className="btn-tour">Take the tour →</Link>
            <a href="#why" className="btn-ghost">Learn more</a>
          </div>
        </section>

        {/* Problem */}
        <div className="s-tinted">
          <div className="s-inner reveal">
            <p className="eyebrow">The gap</p>
            <div className="problem-grid">
              <div className="problem-copy">
                <p>AI diagnostic tools have transformed clinical medicine — supporting physicians through complex differentials, catching what fatigued humans miss, documenting the reasoning trail. The skilled trades have none of that, despite comparable stakes and a worsening labor shortage.</p>
                <p>A generation of veteran technicians who carry decades of diagnostic judgment is retiring. There is no system to capture, transfer, or scale that knowledge. The people coming up behind them are left to figure it out alone, in the field, under time pressure — exactly where mistakes are most expensive.</p>
              </div>
              <div className="stat-block">
                <div className="stat-num">500K+</div>
                <div className="stat-caption">Plumbing and HVAC technicians expected to retire in the next decade, taking irreplaceable field judgment with them — with no structured succession for that expertise.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="s-light">
          <div className="s-inner reveal">
            <p className="eyebrow">What it does</p>
            <div className="features-grid">
              <div className="feature">
                <div className="feature-id">01</div>
                <div className="feature-title">Branching diagnostic intelligence</div>
                <p className="feature-desc">A tech describes or photographs a symptom and HauGen walks them through a structured diagnostic path — not a generic chatbot guess, but a reasoned sequence matched to the equipment type and failure pattern.</p>
              </div>
              <div className="feature">
                <div className="feature-id">02</div>
                <div className="feature-title">Confidence-scored second opinions</div>
                <p className="feature-desc">When the AI isn&apos;t certain — or the issue is safety-critical — the case routes to a credentialed expert review layer before a part gets ordered or a repair gets made. The confidence score isn&apos;t hidden; the tech sees it.</p>
              </div>
              <div className="feature">
                <div className="feature-id">03</div>
                <div className="feature-title">Built on real trade data</div>
                <p className="feature-desc">Trained on defect taxonomies and inspection standards used across the industry, manufacturer technical bulletins, and continuously improving from every job that runs through the platform.</p>
              </div>
              <div className="feature">
                <div className="feature-id">04</div>
                <div className="feature-title">Works inside your existing tools</div>
                <p className="feature-desc">Designed to integrate with the field service platforms companies already use. No rip-and-replace. HauGen is the intelligence layer that makes what you already have measurably better.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Why Now */}
        <div className="s-tinted" id="why">
          <div className="s-inner reveal">
            <p className="eyebrow">Why HauGen, why now</p>
            <div className="why-list">
              <div className="why-item">
                <div className="why-marker">I</div>
                <div className="why-body">
                  <strong>The trades have been overlooked.</strong>
                  AI investment has poured into software, finance, and healthcare — industries already rich with structured data. The skilled trades, where diagnostic judgment lives entirely in people&apos;s heads, have been treated as too hard. That is the gap HauGen is built for.
                </div>
              </div>
              <div className="why-item">
                <div className="why-marker">II</div>
                <div className="why-body">
                  <strong>This is not a chatbot bolted onto a scheduling tool.</strong>
                  HauGen is purpose-built diagnostic reasoning — the way clinical decision support exists in medicine, not as a feature, but as the product. The architecture is different because the problem requires it.
                </div>
              </div>
              <div className="why-item">
                <div className="why-marker">III</div>
                <div className="why-body">
                  <strong>The data and the network compound over time.</strong>
                  Every job run through the platform makes the system more accurate. The credentialed reviewer network — the expert layer that catches what the AI flags — is a structural advantage that takes real time and real relationships to replicate.
                </div>
              </div>
              <div className="why-item">
                <div className="why-marker">IV</div>
                <div className="why-body">
                  <strong>The urgency is real, not manufactured.</strong>
                  The labor shortage and the retirement wave are not projections — they are already in motion. Companies that embed structured diagnostic intelligence now will carry a durable operating advantage over those that wait.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="s-dark">
          <div className="cta-inner reveal">
            <h2 className="cta-headline">See it for yourself.</h2>
            <p className="cta-sub">Walk the full technician diagnostic flow, explore the admin dashboard, and see confidence scoring in action — the complete prototype is live.</p>
            <Link href="/login" className="cta-btn">Take the tour →</Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="lp-footer">
          <div className="footer-inner">
            <div>
              <div className="footer-brand">Hau<span className="G">G</span>en</div>
              <div className="footer-tagline">AI diagnostic intelligence for the plumbing trade.</div>
            </div>
            <ul className="footer-links">
              <li><a href="#">Contact</a></li>
              <li><a href="#">Privacy</a></li>
            </ul>
          </div>
        </footer>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        const io = new IntersectionObserver(
          entries => entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
          }),
          { threshold: 0.07 }
        );
        document.querySelectorAll(".reveal").forEach(el => io.observe(el));
      ` }} />
    </div>
  );
}
