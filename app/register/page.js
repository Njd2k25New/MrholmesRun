"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function UserResponseForm() {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  // Success popup
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredRun, setRegisteredRun] = useState(null);

  const inputStyle = `
    w-full
    bg-transparent
    border-0 border-b border-black/25
    px-0 py-3
    text-[15px] text-[#171512]
    outline-none
    transition-colors duration-300
    focus:border-black
    focus:ring-0
    placeholder:text-black/30
  `;

  const labelStyle = `
    block
    text-[10px]
    uppercase
    tracking-[0.18em]
    text-black/50
  `;

  // ========================================
  // LOAD AVAILABLE RUNS
  // ========================================

  async function loadEvents() {
    try {
      const response = await fetch("/api/events", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load available runs."
        );
      }

      setEvents(data.events);
    } catch (error) {
      console.error("EVENT LOAD ERROR:", error);

      setSuccess(false);

      setMessage(
        "Unable to load available runs. Please try again."
      );
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  // ========================================
  // SUCCESS MODAL BEHAVIOUR
  // ========================================

  useEffect(() => {
    if (!showSuccessModal) return;

    const previousOverflow = document.body.style.overflow;

    // Prevent page behind modal from scrolling
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setShowSuccessModal(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSuccessModal]);

  // ========================================
  // SUBMIT REGISTRATION
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();

    // Store form reference before any await
    const form = event.currentTarget;

    // Clear previous messages
    setMessage("");
    setSuccess(false);

    const formData = new FormData(form);

    const registrationData = {
      fullName: formData.get("name"),
      age: formData.get("age"),
      gender: formData.get("gender"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      eventId: formData.get("eventId"),
      honeypot: formData.get("company_fax_number"),
    };

    // ========================================
    // CLIENT VALIDATION
    // ========================================

    if (!registrationData.eventId) {
      setSuccess(false);
      setMessage("Please select a run date.");
      return;
    }

    // Save the selected run before the form resets
    const runBeingRegistered = events.find(
      (run) => run.eventId === registrationData.eventId
    );

    try {
      setSubmitting(true);

      // ========================================
      // SEND REGISTRATION
      // ========================================

      const response = await fetch("/api/register", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      // ========================================
      // API ERROR
      // ========================================

      if (!response.ok || !data.success) {
        setSuccess(false);

        setMessage(
          data.message || "Registration failed."
        );

        return;
      }

      // ========================================
      // HONEYPOT RESPONSE
      // ========================================
      // Honeypot fake-success responses do not
      // contain a registration object.
      // Never show the real success modal here.
      // ========================================

      if (!data.registration) {
        setSuccess(true);

        setMessage(
          data.message || "Your response has been captured."
        );

        return;
      }

      // ========================================
      // REAL REGISTRATION SUCCESS
      // ========================================

      setSuccess(true);

      setMessage(
        data.message ||
          "Your response has been captured. Registration completed successfully."
      );

      // Store run details for popup
      setRegisteredRun(runBeingRegistered || null);

      // Show popup ONLY for real registration
      setShowSuccessModal(true);

      // Reset form safely
      form.reset();

      // Reset controlled event selector
      setSelectedEvent("");

      // ========================================
      // REFRESH LIVE SLOT COUNT
      // ========================================

      try {
        const eventsResponse = await fetch("/api/events", {
          cache: "no-store",
        });

        const eventsData = await eventsResponse.json();

        if (
          eventsResponse.ok &&
          eventsData.success
        ) {
          setEvents(eventsData.events);
        }
      } catch (refreshError) {
        console.error(
          "SLOT REFRESH ERROR:",
          refreshError
        );

        // Registration already succeeded.
        // Don't replace success popup/message.
      }
    } catch (error) {
      console.error(
        "REGISTRATION ERROR:",
        error
      );

      setSuccess(false);

      setMessage(
        "Unable to complete registration. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ========================================
  // SELECTED RUN
  // ========================================

  const selectedRun = events.find(
    (event) =>
      event.eventId === selectedEvent
  );

  // ========================================
  // PAGE
  // ========================================

  return (
    <section className="min-h-screen w-full overflow-hidden bg-[#f3ecdf]">

      {/* ========================================
          SUCCESS MODAL
      ======================================== */}

      {showSuccessModal && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-center justify-center
            bg-black/60
            px-5 py-8
            backdrop-blur-sm
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="registration-success-title"
        >
          <div
            className="
              relative
              w-full
              max-w-[540px]
              border
              border-black/15
              bg-[#f3ecdf]
              px-7
              py-9
              text-center
              shadow-2xl
              sm:px-12
              sm:py-12
            "
          >
            {/* CHECK ICON */}

            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                bg-[#171512]
                text-xl
                text-[#f3ecdf]
              "
            >
              ✓
            </div>

            {/* LABEL */}

            <p
              className="
                mt-7
                text-[10px]
                uppercase
                tracking-[0.3em]
                text-black/45
              "
            >
              Registration Complete
            </p>

            {/* MAIN HEADING */}

            <h2
              id="registration-success-title"
              className="
                mt-3
                text-4xl
                font-medium
                tracking-[-0.04em]
                text-[#171512]
                sm:text-5xl
              "
            >
              YOU&apos;RE IN.
            </h2>

            {/* THANK YOU */}

            <p
              className="
                mx-auto
                mt-6
                max-w-md
                text-[15px]
                leading-7
                text-black/65
              "
            >
              Thank you for joining the Mr Holmes Run Club.
            </p>

            <p
              className="
                mx-auto
                mt-3
                max-w-md
                text-sm
                leading-6
                text-black/50
              "
            >
              We&apos;re thrilled to have you as part of the
              run. Get ready to move, connect, and share the
              experience with the community.
            </p>

            <p
              className="
                mt-4
                text-sm
                font-medium
                text-[#171512]
              "
            >
              See you at the starting line.
            </p>

            {/* ========================================
                REGISTERED RUN
            ======================================== */}

            {registeredRun && (
              <div
                className="
                  mx-auto
                  mt-8
                  max-w-sm
                  border-y
                  border-black/10
                  py-5
                "
              >
                <p
                  className="
                    text-[9px]
                    uppercase
                    tracking-[0.25em]
                    text-black/40
                  "
                >
                  Your Run
                </p>

                <p
                  className="
                    mt-2
                    text-base
                    font-medium
                    text-[#171512]
                  "
                >
                  {registeredRun.date}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-black/45
                  "
                >
                  {registeredRun.eventName}
                </p>
              </div>
            )}

            {/* DONE BUTTON */}

            <button
              type="button"
              onClick={() =>
                setShowSuccessModal(false)
              }
              className="
                mt-8
                w-full
                bg-[#171512]
                px-6
                py-4
                text-[11px]
                uppercase
                tracking-[0.22em]
                text-[#f3ecdf]
                transition-opacity
                duration-300
                hover:opacity-90
              "
            >
              Done
            </button>

            {/* BRAND */}

            <p
              className="
                mt-7
                text-[9px]
                uppercase
                tracking-[0.25em]
                text-black/30
              "
            >
              Mr Holmes Run Club
            </p>
          </div>
        </div>
      )}

      <div
        className="
          mx-auto
          flex min-h-screen
          max-w-[1500px]
          flex-col
          items-center
          px-5
          sm:px-8
          lg:flex-row
          lg:px-12
        "
      >
        {/* ========================================
            LEFT ARTWORK
        ======================================== */}

        <div
          className="
            relative
            h-[300px]
            w-full
            sm:h-[420px]
            lg:h-[700px]
            lg:w-[52%]
          "
        >
          <Image
            src="/images/register/register.png"
            alt="Mr Holmes Run Club"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="object-contain"
          />
        </div>

        {/* ========================================
            RIGHT FORM
        ======================================== */}

        <div
          className="
            w-full
            px-2
            py-10
            sm:px-8
            lg:w-[48%]
            lg:px-12
            lg:py-20
            xl:px-16
          "
        >
          {/* ========================================
              HEADING
          ======================================== */}

          <div className="mb-10">
            <p className="mb-4 text-[10px] uppercase tracking-[0.3em] text-black/45">
              Registration
            </p>

            <h2
              className="
                text-4xl
                font-medium
                tracking-[-0.04em]
                text-[#171512]
                sm:text-5xl
                lg:text-6xl
              "
            >
              Join the Run.
            </h2>

            <p className="mt-4 max-w-md text-sm leading-6 text-black/50">
              Fill in your details and become part of the
              Mr Holmes Run Club.
            </p>
          </div>

          {/* ========================================
              FORM
          ======================================== */}

          <form
            onSubmit={handleSubmit}
            className="space-y-7"
          >
            {/* HONEYPOT */}

            <div
              aria-hidden="true"
              className="fixed left-[-10000px] top-0 h-0 w-0 overflow-hidden"
            >
              <label htmlFor="company_fax_number">
                Company Fax Number
              </label>

              <input
                id="company_fax_number"
                type="text"
                name="company_fax_number"
                tabIndex={-1}
                autoComplete="new-password"
                defaultValue=""
              />
            </div>

            {/* ========================================
                FULL NAME
            ======================================== */}

            <div>
              <label
                htmlFor="name"
                className={labelStyle}
              >
                Full Name
              </label>

              <input
                id="name"
                type="text"
                name="name"
                placeholder="Your full name"
                autoComplete="name"
                required
                className={inputStyle}
              />
            </div>

            {/* ========================================
                AGE + GENDER
            ======================================== */}

            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-8">

              {/* AGE */}

              <div>
                <label
                  htmlFor="age"
                  className={labelStyle}
                >
                  Age
                </label>

                <input
                  id="age"
                  type="number"
                  name="age"
                  min="1"
                  max="100"
                  placeholder="Your age"
                  required
                  className={inputStyle}
                />
              </div>

              {/* GENDER */}

              <div>
                <label
                  htmlFor="gender"
                  className={labelStyle}
                >
                  Gender
                </label>

                <select
                  id="gender"
                  name="gender"
                  defaultValue=""
                  required
                  className={`${inputStyle} cursor-pointer`}
                >
                  <option
                    value=""
                    disabled
                  >
                    Select gender
                  </option>

                  <option value="male">
                    Male
                  </option>

                  <option value="female">
                    Female
                  </option>
                </select>
              </div>
            </div>

            {/* ========================================
                EMAIL
            ======================================== */}

            <div>
              <label
                htmlFor="email"
                className={labelStyle}
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                name="email"
                placeholder="name@example.com"
                autoComplete="email"
                required
                className={inputStyle}
              />
            </div>

            {/* ========================================
                PHONE
            ======================================== */}

            <div>
              <label
                htmlFor="phone"
                className={labelStyle}
              >
                Phone Number
              </label>

              <input
                id="phone"
                type="tel"
                name="phone"
                placeholder="+965 XXXX XXXX"
                autoComplete="tel"
                required
                className={inputStyle}
              />
            </div>

            {/* ========================================
                AVAILABLE RUN
            ======================================== */}

            <div>
              <label
                htmlFor="eventId"
                className={labelStyle}
              >
                Choose Run Date
              </label>

              {loadingEvents ? (
                <p className="border-b border-black/25 py-3 text-sm text-black/40">
                  Loading available runs...
                </p>
              ) : events.length === 0 ? (
                <p className="border-b border-black/25 py-3 text-sm text-black/50">
                  No runs are currently available.
                </p>
              ) : (
                <select
                  id="eventId"
                  name="eventId"
                  value={selectedEvent}
                  onChange={(event) => {
                    setSelectedEvent(
                      event.target.value
                    );

                    // Clear old error when
                    // selecting another event

                    if (!success) {
                      setMessage("");
                    }
                  }}
                  required
                  className={`${inputStyle} cursor-pointer`}
                >
                  <option value="">
                    Select available run
                  </option>

                  {events.map((run) => (
                    <option
                      key={run.eventId}
                      value={run.eventId}
                    >
                      {run.date} —{" "}
                      {run.eventName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ========================================
                LIVE SLOT INFORMATION
            ======================================== */}

            {selectedRun && (
              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-y
                  border-black/10
                  py-4
                "
              >
                <div>
                  <p
                    className="
                      text-[9px]
                      uppercase
                      tracking-[0.2em]
                      text-black/40
                    "
                  >
                    Selected Run
                  </p>

                  <p className="mt-1 text-sm text-[#171512]">
                    {selectedRun.date}
                  </p>

                  <p className="mt-1 text-xs text-black/40">
                    {selectedRun.eventName}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className="
                      text-[9px]
                      uppercase
                      tracking-[0.2em]
                      text-black/40
                    "
                  >
                    Availability
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#171512]">
                    {selectedRun.availableSlots}{" "}
                    slots left
                  </p>
                </div>
              </div>
            )}

            {/* ========================================
                SUBMIT BUTTON
            ======================================== */}

            <div className="pt-3">
              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingEvents ||
                  events.length === 0
                }
                className="
                  group
                  flex
                  w-full
                  items-center
                  justify-between
                  bg-[#171512]
                  px-6
                  py-4
                  text-[#f3ecdf]
                  transition-all
                  duration-300
                  hover:bg-black
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                  sm:px-7
                  sm:py-[18px]
                "
              >
                <span
                  className="
                    text-[11px]
                    uppercase
                    tracking-[0.2em]
                  "
                >
                  {submitting
                    ? "Registering..."
                    : "Register Now"}
                </span>

                <span
                  className="
                    text-lg
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                  "
                >
                  →
                </span>
              </button>

              {/* ========================================
                  ERROR MESSAGE
              ======================================== */}

              {!success && message && (
                <div
                  className="
                    mt-3
                    border
                    border-red-900/20
                    bg-red-950/[0.03]
                    px-4
                    py-3
                  "
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="
                        mt-[1px]
                        flex
                        h-5
                        w-5
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-red-900/30
                        text-[10px]
                        font-medium
                        text-red-900
                      "
                    >
                      !
                    </span>

                    <p className="text-[13px] leading-5 text-red-900">
                      {message}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}

            <p
              className="
                pt-1
                text-center
                text-[9px]
                uppercase
                tracking-[0.2em]
                text-black/30
              "
            >
              Mr Holmes Run Club
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}