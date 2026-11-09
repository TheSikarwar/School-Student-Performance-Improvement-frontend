import Link from "next/link";
import "./home.css";

const services = [
  {
    number: "01",
    title: "School Management",
    description:
      "Organize schools, academic years, classes, sections, students and staff in one connected workspace.",
    icon: "▦",
  },
  {
    number: "02",
    title: "Teacher & Academic Management",
    description:
      "Coordinate class-teacher responsibilities, subject assignments and academic timetables.",
    icon: "♙",
  },
  {
    number: "03",
    title: "Student Performance",
    description:
      "Manage marks and understand academic progress through student reports, trends and analysis.",
    icon: "▤",
  },
  {
    number: "04",
    title: "Parent Engagement",
    description:
      "Make it easier for parents to understand their child's progress and areas that need attention.",
    icon: "♡",
  },
  {
    number: "05",
    title: "AI-Powered Insights",
    description:
      "Use early-warning indicators, performance predictions and personalized study-plan support.",
    icon: "✧",
  },
  {
    number: "06",
    title: "Academic Planning",
    description:
      "Bring class schedules, subject allocation and day-to-day academic coordination together.",
    icon: "▣",
  },
];

const audiences = [
  {
    title: "For school leaders",
    description:
      "Get a clearer view of school operations, academic activity and student performance.",
    tag: "Manage the school",
  },
  {
    title: "For teachers",
    description:
      "Access assigned classes, subjects, timetables and the academic information needed for teaching.",
    tag: "Support better teaching",
  },
  {
    title: "For students",
    description:
      "Understand academic progress and identify subjects or topics where more attention may help.",
    tag: "Improve learning",
  },
  {
    title: "For parents",
    description:
      "Stay informed about learning progress and work together with the school to support improvement.",
    tag: "Stay connected",
  },
];

export default function HomePage() {
  return (
    <main className="public-site">
      <header className="site-header">
        <div className="site-nav-wrap">
          <Link href="/" className="site-brand" aria-label="EduRise home">
            <span className="site-brand-mark">E</span>
            <span>Edu<span className="brand-light">Rise</span></span>
          </Link>

          <nav className="site-nav" aria-label="Main navigation">
            <a href="#solutions">Solutions</a>
            <a href="#who-we-help">Who we help</a>
            <a href="#about">About</a>
          </nav>

          <div className="site-nav-actions">
            <Link href="/login" className="nav-login">School login</Link>
            <Link href="/superadmin/login" className="nav-admin">Platform admin</Link>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> SCHOOL MANAGEMENT · STUDENT SUCCESS</span>
            <h1>Better school management. <span>Brighter student futures.</span></h1>
            <p className="hero-description">
              EduRise brings school operations, academic management and
              student performance insights together—helping schools make
              informed decisions and support every learner.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="button-primary">Access your school <span>→</span></Link>
              <a href="#solutions" className="button-secondary">Explore solutions</a>
            </div>
            <div className="hero-note">
              <span className="note-check">✓</span>
              One connected platform for school teams and learning communities
            </div>
          </div>

          <div className="hero-visual" aria-label="Illustration of the EduRise education dashboard">
            <div className="visual-glow" />
            <div className="dashboard-preview">
              <div className="preview-topbar">
                <div className="preview-brand"><span>E</span> EduRise</div>
                <div className="preview-user"><i /> School workspace</div>
              </div>
              <div className="preview-body">
                <div className="preview-sidebar">
                  <b />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="preview-content">
                  <div className="preview-heading">
                    <div><small>ACADEMIC OVERVIEW</small><strong>School dashboard</strong></div>
                    <span>Academic year</span>
                  </div>
                  <div className="preview-stats">
                    <div><small>Students</small><b>•••</b><em /></div>
                    <div><small>Classes</small><b>••</b><em /></div>
                    <div><small>Teachers</small><b>••</b><em /></div>
                  </div>
                  <div className="preview-panel">
                    <div className="panel-title"><b>Performance overview</b><span>Progress insights</span></div>
                    <div className="chart-bars">
                      <i style={{height:"38%"}}/><i style={{height:"57%"}}/><i style={{height:"48%"}}/><i style={{height:"76%"}}/><i style={{height:"63%"}}/><i style={{height:"91%"}}/><i style={{height:"82%"}}/>
                    </div>
                    <div className="chart-labels"><span>Term 1</span><span>Term 2</span><span>Term 3</span></div>
                  </div>
                  <div className="preview-bottom">
                    <div><small>ACADEMIC PLANNING</small><b>Timetable & classes</b></div>
                    <div><small>STUDENT SUPPORT</small><b>Performance reports</b></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-insight"><span>✧</span><div><b>Actionable insights</b><small>Understand progress clearly</small></div></div>
          </div>
        </div>
        <div className="hero-decoration decoration-one" />
        <div className="hero-decoration decoration-two" />
      </section>

      <section className="trust-strip">
        <div className="trust-inner">
          <span>ONE PLATFORM</span><i />
          <p>School operations</p><i />
          <p>Academic management</p><i />
          <p>Student improvement</p><i />
          <p>AI-powered insights</p>
        </div>
      </section>

      <section className="section solutions-section" id="solutions">
        <div className="section-heading">
          <span className="eyebrow">WHAT EDURISE OFFERS</span>
          <h2>Everything working together for <span>better education.</span></h2>
          <p>Connect everyday school administration with the academic information that helps students move forward.</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.number}>
              <div className="service-card-top"><span className="service-icon">{service.icon}</span><small>{service.number}</small></div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <span className="service-line" />
            </article>
          ))}
        </div>
      </section>

      <section className="audience-section" id="who-we-help">
        <div className="section audience-inner">
          <div className="audience-intro">
            <span className="eyebrow">BUILT AROUND YOUR SCHOOL COMMUNITY</span>
            <h2>One platform.<br/><span>Every perspective.</span></h2>
            <p>When school teams, teachers, students and parents can work from a shared understanding, it becomes easier to support learning.</p>
            <Link href="/login" className="text-link">Go to school login <span>→</span></Link>
          </div>
          <div className="audience-grid">
            {audiences.map((item, index) => (
              <article className="audience-card" key={item.title}>
                <span className="audience-index">0{index + 1}</span>
                <small>{item.tag}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ai-section" id="about">
        <div className="ai-inner">
          <div className="ai-symbol">✧</div>
          <div>
            <span className="eyebrow">INSIGHTS THAT SUPPORT ACTION</span>
            <h2>Go beyond marks.<br/><span>Understand the learning journey.</span></h2>
            <p>EduRise is designed to turn academic information into useful insight—with performance analysis, trends, early-warning signals and study-plan support.</p>
          </div>
          <div className="ai-points">
            <div><span>01</span><b>Understand performance</b></div>
            <div><span>02</span><b>Identify areas for support</b></div>
            <div><span>03</span><b>Plan the next learning steps</b></div>
          </div>
        </div>
      </section>

      <section className="closing-section">
        <div>
          <span className="eyebrow">MOVE YOUR SCHOOL FORWARD</span>
          <h2>Make every academic decision more informed.</h2>
          <p>Bring your school community and academic information together with EduRise.</p>
        </div>
        <Link href="/login" className="button-primary">Access your school <span>→</span></Link>
      </section>

      <footer className="site-footer">
        <Link href="/" className="site-brand"><span className="site-brand-mark">E</span><span>Edu<span className="brand-light">Rise</span></span></Link>
        <p>School management and student performance improvement platform.</p>
        <div><Link href="/login">School login</Link><Link href="/superadmin/login">Platform admin</Link></div>
        <small>© {new Date().getFullYear()} EduRise. All rights reserved.</small>
      </footer>
    </main>
  );
}
