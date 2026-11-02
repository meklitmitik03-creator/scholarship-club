
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const cfg = window.NCA_CONFIG || {};

  const configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("PASTE_") &&
    !cfg.SUPABASE_ANON_KEY.includes("PASTE_");

  const client = configured && window.supabase
    ? window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY
      )
    : null;

  const demoScholarships = [
    {
      id: "demo1",
      title: "Add your first scholarship",
      country: "Global",
      university: "Official scholarship listing",
      study_level: "Bachelor's",
      funding_details: "Funding details",
      eligibility: "Add eligibility criteria in the database.",
      deadline: null,
      official_url: "https://www.scholarshipportal.com",
      status: "published"
    },
    {
      id: "demo2",
      title: "Explore official opportunities",
      country: "Global",
      university: "Check the provider website",
      study_level: "Other",
      funding_details: "Varies by provider",
      eligibility: "Verify all requirements on the official website.",
      deadline: null,
      official_url: "https://www.studyportals.com",
      status: "published"
    }
  ];

  let scholarships = [];
  let announcements = [];
  let mode = "signup";
  let toastTimer;

  function toast(message) {
    const node = $("toast");
    node.textContent = message;
    node.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      node.classList.remove("show");
    }, 3200);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(value);

      return (
        url.protocol === "https:" ||
        url.protocol === "http:"
      ) ? url.href : "";

    } catch {
      return "";
    }
  }

  function formatDate(value) {
    if (!value) return "Check official deadline";

    const date = new Date(value + "T00:00:00");

    return Number.isNaN(date.getTime())
      ? "Check official deadline"
      : "Deadline: " + date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
  }

  function renderCountries() {
    const select = $("country-filter");
    const current = select.value;

    const countries = [
      ...new Set(
        scholarships
          .map(s => s.country)
          .filter(Boolean)
      )
    ].sort();

    select.innerHTML =
      '<option value="">All countries</option>' +
      countries.map(country =>
        `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`
      ).join("");

    select.value = countries.includes(current) ? current : "";
  }

  function renderScholarships() {
    const query = $("search").value.trim().toLowerCase();
    const country = $("country-filter").value;
    const level = $("level-filter").value;

    const filtered = scholarships.filter(s => {
      const searchable = [
        s.title,
        s.country,
        s.university,
        s.study_level,
        s.funding_details,
        s.eligibility
      ].join(" ").toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (!country || s.country === country) &&
        (!level || s.study_level === level)
      );
    });

    $("scholarship-count").textContent =
      `${filtered.length} opportunity${filtered.length === 1 ? "" : "ies"}`;

    const root = $("scholarship-list");

    if (!filtered.length) {
      root.innerHTML =
        '<div class="empty-state">No matching scholarships. Try another search or filter.</div>';
      return;
    }

    root.innerHTML = filtered.map(s => {
      const url = safeHttpUrl(s.official_url);
      const funding = s.funding_details || "Check funding details";
      const level = s.study_level || "Study level varies";

      return `
        <article class="scholarship-card">
          <div class="card-top">
            <span class="flag">🌍 ${escapeHtml(s.country || "Global")}</span>
            <span class="flag funded">Opportunity</span>
          </div>

          <h3>${escapeHtml(s.title)}</h3>

          <p class="school">
            ${escapeHtml(s.university || "University details on official website")}
          </p>

          <div class="card-meta">
            <span>${escapeHtml(level)}</span>
            <span>${escapeHtml(funding)}</span>
          </div>

          <div class="card-bottom">
            <span class="deadline">
              ${escapeHtml(formatDate(s.deadline))}
            </span>

            ${
              url
                ? `<a class="apply-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Official site ↗</a>`
                : '<span class="deadline">Official link pending</span>'
            }
          </div>
        </article>
      `;
    }).join("");
  }

  function renderAnnouncements() {
    const root = $("announcement-list");

    if (!announcements.length) {
      root.innerHTML =
        '<div class="empty-state">No announcements published yet. Club leaders can add updates after the admin tools are configured.</div>';
      return;
    }

    root.innerHTML = announcements.map(a => `
      <article class="announcement">
        <time>
          ${escapeHtml(
            a.created_at
              ? new Date(a.created_at).toLocaleDateString()
              : "NCA CLUB UPDATE"
          )}
        </time>

        <h3>${escapeHtml(a.title)}</h3>

        <p>${escapeHtml(a.body)}</p>
      </article>
    `).join("");
  }

  async function loadData() {
    if (!client) {
      scholarships = demoScholarships;
      announcements = [];

      renderCountries();
      renderScholarships();
      renderAnnouncements();

      $("scholarship-count").textContent = "Demo listings";

      toast(
        "Add your Supabase URL and public key in config.js to connect the database."
      );

      return;
    }

    const [scholarshipResult, announcementResult] =
      await Promise.all([
        client
          .from("scholarships")
          .select(
            "id,title,country,university,study_level,funding_details,eligibility,deadline,official_url,status"
          )
          .eq("status", "published")
          .order("deadline", {
            ascending: true,
            nullsFirst: false
          }),

        client
          .from("announcements")
          .select("id,title,body,created_at")
          .eq("published", true)
          .order("created_at", {
            ascending: false
          })
      ]);

    if (scholarshipResult.error) {
      console.error(
        "Scholarship load error:",
        scholarshipResult.error
      );

      scholarships = [];

      $("scholarship-list").innerHTML =
        '<div class="empty-state">Scholarships could not be loaded. Check your database tables and read policies.</div>';

    } else {
      scholarships = scholarshipResult.data || [];
    }

    if (announcementResult.error) {
      console.error(
        "Announcement load error:",
        announcementResult.error
      );

      announcements = [];

    } else {
      announcements = announcementResult.data || [];
    }

    renderCountries();
    renderScholarships();
    renderAnnouncements();
  }

  function setMode(nextMode) {
    mode = nextMode;

    document.querySelectorAll(".auth-tabs button")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.mode === mode
        );
      });

    $("name-wrap").classList.toggle(
      "hidden",
      mode === "signin"
    );

    $("full-name").required = mode === "signup";

    $("auth-submit").textContent =
      mode === "signup" ? "Create account" : "Sign in";

    $("auth-message").textContent = "";
  }

  function showAuth(startMode = "signup") {
    $("auth-modal").classList.remove("hidden");
    setMode(startMode);
  }

  function hideAuth() {
    $("auth-modal").classList.add("hidden");
  }

  async function submitAuth(event) {
    event.preventDefault();

    const message = $("auth-message");
    const button = $("auth-submit");

    if (!client) {
      message.textContent =
        "Connect Supabase first by filling in config.js.";
      return;
    }

    const email = $("email").value.trim();
    const password = $("password").value;

    button.disabled = true;
    message.textContent = "Please wait…";

    try {
      if (mode === "signup") {
        const fullName = $("full-name").value.trim();

        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });

        if (error) throw error;

        message.textContent =
          "Account request submitted. Check your email for confirmation; leader approval may also be required.";

      } else {
        const { error } =
          await client.auth.signInWithPassword({
            email,
            password
          });

        if (error) throw error;

        message.textContent = "Signed in successfully.";

        toast(
          "You're signed in. Member dashboard features are the next setup step."
        );

        setTimeout(hideAuth, 900);
      }

    } catch (error) {
      message.textContent =
        error.message || "Something went wrong. Please try again.";

    } finally {
      button.disabled = false;
    }
  }

  // Website initialization

  $("year").textContent = new Date().getFullYear();

  $("menu-toggle").addEventListener("click", () => {
    $("nav").classList.toggle("open");
  });

  $("nav").querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      $("nav").classList.remove("open");
    });
  });

  ["open-auth", "hero-join", "banner-join"].forEach(id => {
    $(id).addEventListener("click", () => {
      showAuth("signup");
    });
  });

  $("close-auth").addEventListener("click", hideAuth);

  $("auth-modal").addEventListener("click", event => {
    if (event.target === $("auth-modal")) {
      hideAuth();
    }
  });

  document.querySelectorAll(".auth-tabs button")
    .forEach(button => {
      button.addEventListener("click", () => {
        setMode(button.dataset.mode);
      });
    });

  $("auth-form").addEventListener("submit", submitAuth);

  ["search", "country-filter", "level-filter"].forEach(id => {
    $(id).addEventListener(
      id === "search" ? "input" : "change",
      renderScholarships
    );
  });

  loadData();
})();
