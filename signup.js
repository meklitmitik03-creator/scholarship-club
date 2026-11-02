
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const form = $("signup-form");
  const grade = $("grade");
  const section = $("section");
  const category = $("category");
  const leaderField = $("leader-id-field");
  const leaderId = $("leader-id");
  const message = $("signup-message");
  const submitButton = $("signup-submit");

  $("signup-year").textContent = new Date().getFullYear();

  // Automatically display the correct class sections.
  grade.addEventListener("change", () => {
    const selectedGrade = grade.value;
    const lastSection = selectedGrade === "9" ? "I" : "H";

    section.innerHTML = '<option value="">Select section</option>';

    if (!selectedGrade) {
      section.disabled = true;
      return;
    }

    section.disabled = false;

    const letters = "ABCDEFGHI";

    for (const letter of letters) {
      section.add(new Option(letter, letter));

      if (letter === lastSection) break;
    }
  });

  // Show or hide the Leader ID field.
  category.addEventListener("change", () => {
    const isLeader = category.value === "leader";

    leaderField.classList.toggle("hidden", !isLeader);
    leaderId.required = isLeader;

    if (!isLeader) {
      leaderId.value = "";
    }
  });

  function showMessage(text, type = "error") {
    message.textContent = text;
    message.classList.toggle("success", type === "success");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("");

    const fullName = $("full-name").value.trim();
    const selectedGrade = grade.value;
    const selectedSection = section.value;
    const gender = $("gender").value;
    const age = Number($("age").value);
    const email = $("email").value.trim();
    const phone = $("phone").value.trim();
    const password = $("password").value;
    const confirmPassword = $("confirm-password").value;
    const selectedCategory = category.value;
    const idNumber = leaderId.value.trim();

    // Validate the information.
    if (!fullName || !selectedGrade || !selectedSection ||
        !gender || !email || !phone || !selectedCategory) {
      showMessage("Please complete all required fields.");
      return;
    }

    if (!Number.isInteger(age) || age < 10 || age > 25) {
      showMessage("Please enter a valid age.");
      return;
    }

    if (password.length < 8) {
      showMessage("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Your passwords do not match.");
      return;
    }

    if (selectedCategory === "leader" && !idNumber) {
      showMessage("Please enter your Leader ID number.");
      return;
    }

    // Supabase connection.
    const config = window.NCA_CONFIG || {};

    const isConfigured =
      config.SUPABASE_URL &&
      config.SUPABASE_ANON_KEY &&
      !config.SUPABASE_URL.includes("PASTE_") &&
      !config.SUPABASE_ANON_KEY.includes("PASTE_");

    if (!isConfigured || !window.supabase) {
      showMessage(
        "Your form is ready, but Supabase is not connected yet. We need to configure config.js."
      );
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Creating your account...";

    try {
      const supabaseClient = window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_ANON_KEY
      );

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,

        options: {
          data: {
            full_name: fullName,
            grade: selectedGrade,
            section: selectedSection,
            gender,
            age,
            phone,
            requested_category: selectedCategory,
            leader_id: selectedCategory === "leader" ? idNumber : null
          }
        }
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Account creation could not be confirmed. Please try again.");
      }

      if (selectedCategory === "leader") {
        showMessage(
          "Your leader application has been submitted. Your ID must be verified by the club administrator before leader access is granted.",
          "success"
        );
      } else {
        showMessage(
          "Your registration was submitted successfully! Check your email for a confirmation message. Your membership may require club approval.",
          "success"
        );
      }

      form.reset();
      section.disabled = true;
      section.innerHTML = '<option value="">Select grade first</option>';
      leaderField.classList.add("hidden");
      leaderId.required = false;

    } catch (error) {
      console.error("Registration error:", error);

      showMessage(
        error.message || "Registration failed. Please try again."
      );

    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Create my account <span>→</span>';
    }
  });
});
