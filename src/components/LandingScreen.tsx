import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Phone,
  Pill,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Truck,
  Users,
  X,
} from "lucide-react";

interface LandingScreenProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  from?: "bottom" | "left" | "right";
  scale?: boolean;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className = "",
  delay = 0,
  from = "bottom",
  scale = false,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] =
    useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const updateMotionPreference = () => {
      setReducedMotion(mediaQuery.matches);
    };

    updateMotionPreference();

    mediaQuery.addEventListener(
      "change",
      updateMotionPreference,
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateMotionPreference,
      );
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return;
    }

    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -60px 0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [reducedMotion]);

  const hiddenTransform =
    from === "left"
      ? "-translate-x-8"
      : from === "right"
        ? "translate-x-8"
        : "translate-y-8";

  const hiddenScale = scale
    ? "scale-[0.97]"
    : "scale-100";

  const visibleClasses =
    "translate-x-0 translate-y-0 opacity-100 scale-100";

  const hiddenClasses = `${hiddenTransform} ${hiddenScale} opacity-0`;

  return (
    <div
      ref={ref}
      className={`${visible ? visibleClasses : hiddenClasses} transition-all duration-700 ease-out ${className}`}
      style={{
        transitionDelay: reducedMotion
          ? "0ms"
          : `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

const navItems = [
  {
    label: "Home",
    href: "#home",
  },
  {
    label: "Features",
    href: "#features",
  },
  {
    label: "About",
    href: "#about",
  },
  {
    label: "How It Works",
    href: "#how-it-works",
  },
  {
    label: "Contact",
    href: "#contact",
  },
];

const features = [
  {
    icon: Package,
    image: "inventory.jpg",
    title: "Smart Inventory Management",
    description:
      "Keep medicines, quantities, batches and expiry information organized in one secure system.",
    href: "/features/inventory",
  },
  {
    icon: Pill,
    image: "dispensing.jpg",
    title: "Fast Dispensing",
    description:
      "Process prescriptions efficiently while keeping dispensing records connected to patient information.",
    href: "/features/dispensing",
  },
  {
    icon: Users,
    image: "patients.jpg",
    title: "Patient Records",
    description:
      "Maintain accessible patient records and medication history to support better pharmacy workflows.",
    href: "/features/patients",
  },
  {
    icon: Truck,
    image: "suppliers.jpg",
    title: "Supplier Management",
    description:
      "Organize supplier information and keep stock receiving and supplier activities easier to track.",
    href: "/features/suppliers",
  },
  {
    icon: BarChart3,
    image: "reports.jpg",
    title: "Reports & Insights",
    description:
      "Turn pharmacy activity into useful reports that help you understand operations and make informed decisions.",
    href: "/features/reports",
  },
  {
    icon: ShieldCheck,
    image: "security.jpg",
    title: "Secure Access",
    description:
      "Role-based access and secure authentication help protect sensitive pharmacy information.",
    href: "/features/security",
  },
];

const steps = [
  {
    number: "01",
    icon: Building2,
    title: "Set Up Your Pharmacy",
    description:
      "Create your secure account and configure your pharmacy information.",
  },
  {
    number: "02",
    icon: Database,
    title: "Organize Your Data",
    description:
      "Manage medicines, suppliers, patients and other essential pharmacy records.",
  },
  {
    number: "03",
    icon: Activity,
    title: "Run Daily Operations",
    description:
      "Dispense medicines, receive stock, record adjustments and monitor activity.",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Understand Your Business",
    description:
      "Use reports and operational information to keep your pharmacy moving forward.",
  },
];

const contactReasons = [
  "General Enquiry",
  "Request a Demonstration",
  "Product Information",
  "Technical Support",
  "Partnership Enquiry",
  "Other",
];

const LandingScreen: React.FC<LandingScreenProps> = ({
  onLoginClick,
  onSignUpClick,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [contactSubmitted, setContactSubmitted] =
    useState(false);

  const handleContactSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setContactSubmitted(true);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const scrollTo = (href: string) => {
    closeMobileMenu();

    const element = document.querySelector(href);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      {/* =========================================================
          NAVIGATION
      ========================================================= */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#173F57]/95 shadow-lg backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => scrollTo("#home")}
            className="flex items-center gap-3"
            aria-label="Go to PharmaTrack home"
          >
            <img
              src="/logo/logo.png"
              alt="PharmaTrack"
              className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
            />

            <div className="hidden sm:block">
              <div className="text-lg font-extrabold tracking-tight text-white">
                PharmaTrack
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Pharmacy Management
              </div>
            </div>
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => scrollTo(item.href)}
                className="text-sm font-semibold text-white/75 transition-colors hover:text-[#80ED99]"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={onLoginClick}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white/90 transition-colors hover:bg-white/10 hover:text-[#80ED99]"
            >
              Log In
            </button>

            <button
              type="button"
              onClick={onSignUpClick}
              className="rounded-xl bg-[#80ED99] px-5 py-2.5 text-sm font-bold text-[#173F57] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#95F2AA] hover:shadow-md"
            >
              Get Started
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((previous) => !previous)
            }
            className="rounded-xl p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
            aria-label={
              mobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#173F57] px-5 py-5 shadow-lg lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => scrollTo(item.href)}
                  className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-[#80ED99]"
                >
                  {item.label}
                </button>
              ))}

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onLoginClick();
                  }}
                  className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Log In
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onSignUpClick();
                  }}
                  className="rounded-xl bg-[#80ED99] px-4 py-3 text-sm font-bold text-[#173F57] transition-colors hover:bg-[#95F2AA]"
                >
                  Get Started
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* =========================================================
          HOME / HERO
      ========================================================= */}
      <section
        id="home"
        className="relative scroll-mt-20 overflow-hidden bg-gradient-to-br from-white via-[#F4FAF8] to-[#E8F7EF]"
      >
        <div className="pointer-events-none absolute -left-32 top-16 h-80 w-80 rounded-full bg-[#80ED99]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sky-100/70 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8 lg:pb-24 lg:pt-40">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
            <Reveal
              from="left"
              delay={100}
              className="relative z-10"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#80ED99]/60 bg-white/90 px-4 py-2 text-xs font-bold text-[#22577A] shadow-sm">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Modern pharmacy management made simpler
              </div>

              <h1 className="max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-[#173F57] sm:text-5xl lg:text-6xl">
                Smarter pharmacy operations.
                <span className="mt-2 block text-[#278653]">
                  Better patient care.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                PharmaTrack helps pharmacies organize inventory,
                dispensing, patients, suppliers, reports and daily
                operations in one secure management system.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onSignUpClick}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#80ED99] px-6 py-3.5 text-sm font-extrabold text-[#173F57] shadow-lg shadow-emerald-900/10 transition-all hover:-translate-y-0.5 hover:bg-[#95F2AA] hover:shadow-xl"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={onLoginClick}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#22577A]/20 bg-white px-6 py-3.5 text-sm font-extrabold text-[#22577A] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#22577A]/40 hover:shadow-md"
                >
                  Log In
                </button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  "Secure access",
                  "Centralized records",
                  "Operational visibility",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-600"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    {item}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal
              from="right"
              delay={220}
              scale
              className="relative"
            >
              <div className="absolute -inset-4 rounded-[2rem] bg-[#80ED99]/30 blur-2xl" />

              <div className="relative">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-2xl shadow-[#173F57]/15 sm:aspect-[5/4]">
                  <img
                    src="/hero/pharmacy-hero-new.jpg"
                    alt="Professional pharmacist working in a modern pharmacy"
                    className="h-full w-full object-cover"
                    fetchPriority="high"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#12324A]/40 via-transparent to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/50 bg-white/95 p-4 shadow-lg backdrop-blur-md sm:bottom-5 sm:left-5 sm:right-5 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F7EF]">
                        <Pill className="h-5 w-5 text-[#22577A]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-[#173F57]">
                          Your pharmacy, connected
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Inventory, dispensing and records in one place.
                        </p>
                      </div>

                      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 sm:flex">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-2 top-5 flex items-center gap-2 rounded-xl border border-white/80 bg-white px-3 py-2.5 shadow-lg sm:-right-5 sm:top-8 sm:px-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                    <Activity className="h-4 w-4 text-emerald-600" />
                  </span>
                  <span className="text-xs font-extrabold text-[#173F57]">
                    Smarter daily operations
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <div className="relative flex justify-center pb-7">
          <button
            type="button"
            onClick={() => scrollTo("#features")}
            className="flex flex-col items-center gap-1 text-[#22577A]/60 transition-colors hover:text-[#22577A]"
            aria-label="Scroll to features"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">
              Explore
            </span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </button>
        </div>
      </section>

      {/* =========================================================
          FEATURES
      ========================================================= */}
      <section
        id="features"
        className="scroll-mt-20 bg-white py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#F4FAF8] px-3.5 py-2 text-xs font-bold text-[#22577A]">
              <Sparkles className="h-3.5 w-3.5" />
              Everything you need
            </div>

            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              One system for your pharmacy operations
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-500">
              Bring your most important pharmacy workflows together
              in a system designed to make everyday work clearer and
              more manageable.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
  const Icon = feature.icon;

  return (
    <Reveal
      key={feature.title}
      delay={index * 70}
      scale
    >
      <Link
        to={feature.href}
        className="group block h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#80ED99] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#22577A]/15"
        aria-label={`Learn more about ${feature.title}`}
      >
        <div className="relative h-52 overflow-hidden bg-[#173F57] sm:h-56">
          <img
            src={`/features/${feature.image}`}
            alt={feature.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#12324A]/85 via-[#12324A]/10 to-transparent" />

          <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/95 shadow-lg">
            <Icon className="h-5 w-5 text-[#22577A]" />
          </div>

          <div className="absolute right-4 top-4 rounded-full border border-white/25 bg-[#173F57]/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            PharmaTrack
          </div>
        </div>

        <div className="flex h-[calc(100%-13rem)] min-h-48 flex-col p-6">
          <h3 className="text-lg font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-[#22577A]">
            {feature.title}
          </h3>

          <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">
            {feature.description}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-[#22577A]">
            <span>Explore feature</span>

            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4FAF8] transition-all duration-300 group-hover:bg-[#80ED99]">
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
})}
          </div>
        </div>
      </section>

      {/* =========================================================
          ABOUT
      ========================================================= */}
      <section
        id="about"
        className="scroll-mt-20 overflow-hidden bg-[#F4FAF8] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal from="left">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-[#22577A] shadow-sm">
                <Building2 className="h-3.5 w-3.5" />
                About PharmaTrack
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Built around the realities of pharmacy work.
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600">
                Pharmacy teams need more than disconnected spreadsheets
                and manual records. They need a clear view of what is
                happening across inventory, dispensing, patients,
                suppliers and daily operations.
              </p>

              <p className="mt-4 text-base leading-7 text-slate-600">
                PharmaTrack brings these workflows together so pharmacy
                professionals can spend less time searching for
                information and more time serving patients.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  "Centralized pharmacy records",
                  "Role-based access",
                  "Inventory visibility",
                  "Operational reporting",
                  "Secure authentication",
                  "Scalable workflows",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#22577A]" />
                    {item}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal
              from="right"
              delay={150}
              scale
            >
              <div className="relative">
                <div className="absolute -inset-5 rounded-[2rem] bg-[#22577A]/10 blur-2xl" />

                <div className="relative overflow-hidden rounded-3xl bg-[#173F57] p-7 shadow-2xl sm:p-9">
                  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#80ED99]/10 blur-3xl" />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                        <Stethoscope className="h-6 w-6 text-[#80ED99]" />
                      </div>

                      <div className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white/70">
                        Pharmacy Operations
                      </div>
                    </div>

                    <h3 className="mt-8 text-2xl font-black text-white">
                      Clear information.

                      <span className="block text-[#80ED99]">
                        Better decisions.
                      </span>
                    </h3>

                    <p className="mt-4 text-sm leading-6 text-white/65">
                      A connected pharmacy environment gives your team
                      the information they need when they need it.
                    </p>

                    <div className="mt-8 space-y-3">
                      {[
                        {
                          icon: Database,
                          title: "Centralized data",
                        },
                        {
                          icon: ShieldCheck,
                          title: "Secure access",
                        },
                        {
                          icon: BarChart3,
                          title: "Useful insights",
                        },
                      ].map((item) => {
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.title}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#80ED99]/10">
                              <Icon className="h-4 w-4 text-[#80ED99]" />
                            </div>

                            <span className="text-sm font-bold text-white/85">
                              {item.title}
                            </span>

                            <CheckCircle2 className="ml-auto h-4 w-4 text-[#80ED99]" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}
      <section
        id="how-it-works"
        className="scroll-mt-20 bg-white py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#F4FAF8] px-3.5 py-2 text-xs font-bold text-[#22577A]">
              <Clock3 className="h-3.5 w-3.5" />
              How it works
            </div>

            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              From setup to daily operations
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-500">
              PharmaTrack is designed around the natural flow of pharmacy
              operations.
            </p>
          </Reveal>

          <div className="relative mt-14">
            <div className="absolute left-[12.5%] right-[12.5%] top-12 hidden h-px bg-slate-200 lg:block" />

            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <Reveal
                    key={step.number}
                    delay={index * 90}
                    scale
                  >
                    <div className="relative text-center">
                      <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-8 border-white bg-[#F4FAF8] shadow-sm">
                        <Icon className="h-7 w-7 text-[#22577A]" />

                        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#22577A] text-[9px] font-black text-white">
                          {step.number}
                        </span>
                      </div>

                      <h3 className="mt-6 text-base font-extrabold text-slate-900">
                        {step.title}
                      </h3>

                      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                        {step.description}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA
      ========================================================= */}
      <section className="relative overflow-hidden bg-[#173F57] py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#80ED99]/10 blur-3xl" />

          <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-sky-300/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
          <Reveal>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles className="h-6 w-6 text-[#80ED99]" />
            </div>

            <h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Ready to simplify your pharmacy operations?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">
              Get started with PharmaTrack and bring your pharmacy
              operations into one connected system.
            </p>

            <button
              type="button"
              onClick={onSignUpClick}
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-[#80ED99] px-6 py-3.5 text-sm font-extrabold text-[#173F57] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#95F2AA] hover:shadow-xl"
            >
              Get Started

              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>
        </div>
      </section>

      {/* =========================================================
          CONTACT
      ========================================================= */}
      <section
        id="contact"
        className="scroll-mt-20 bg-slate-50 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-[#22577A] shadow-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              Contact PharmaTrack
            </div>

            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Let&apos;s talk about your pharmacy
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-500">
              Have a question, need more information or want to request
              a demonstration? Get in touch with the PharmaTrack team.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            {/* Contact information */}
            <Reveal
              from="left"
              scale
            >
              <div className="h-full rounded-3xl bg-[#173F57] p-7 text-white shadow-xl sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <MessageSquare className="h-5 w-5 text-[#80ED99]" />
                </div>

                <h3 className="mt-6 text-2xl font-black">
                  We&apos;d love to hear from you.
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/65">
                  Reach out using any of the channels below or send us
                  an enquiry through the form.
                </p>

                <div className="mt-8 space-y-5">
                  <a
                    href="mailto:pharmatrackpms@gmail.com"
                    className="group flex items-start gap-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-[#80ED99]/15">
                      <Mail className="h-4 w-4 text-[#80ED99]" />
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                        Email
                      </div>

                      <div className="mt-1 text-sm font-bold text-white/90 transition-colors group-hover:text-[#80ED99]">
                        pharmatrackpms@gmail.com
                      </div>
                    </div>
                  </a>

                  <a
                    href="tel:0759505291"
                    className="group flex items-start gap-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-[#80ED99]/15">
                      <Phone className="h-4 w-4 text-[#80ED99]" />
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                        Phone
                      </div>

                      <div className="mt-1 text-sm font-bold text-white/90 transition-colors group-hover:text-[#80ED99]">
                        0759505291
                      </div>
                    </div>
                  </a>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <MapPin className="h-4 w-4 text-[#80ED99]" />
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                        Location
                      </div>

                      <div className="mt-1 text-sm font-bold text-white/90">
                        Bamburi, Mombasa, Kenya
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-9 border-t border-white/10 pt-7">
                  <div className="flex items-start gap-3">
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#80ED99]" />

                    <p className="text-xs leading-5 text-white/55">
                      For faster assistance, include your pharmacy or
                      organization name and a short description of what
                      you need help with.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Contact form */}
            <Reveal
              from="right"
              delay={120}
              scale
            >
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                {contactSubmitted ? (
                  <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>

                    <h3 className="mt-6 text-2xl font-black text-slate-900">
                      Enquiry prepared
                    </h3>

                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                      Thank you for contacting PharmaTrack. Your enquiry
                      has been captured on this page. Our contact form
                      is currently presentation-ready and can be
                      connected to the backend email workflow next.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setContactSubmitted(false)
                      }
                      className="mt-7 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-[#22577A] transition-colors hover:bg-slate-50"
                    >
                      Send another enquiry
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        Send us an enquiry
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Tell us a little about how we can help.
                      </p>
                    </div>

                    <form
                      onSubmit={handleContactSubmit}
                      className="mt-7 space-y-5"
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="contact-name"
                            className="mb-1.5 block text-xs font-bold text-slate-700"
                          >
                            Full Name
                          </label>

                          <input
                            id="contact-name"
                            name="name"
                            type="text"
                            required
                            placeholder="Your full name"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#22577A] focus:bg-white focus:ring-4 focus:ring-[#22577A]/5"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="contact-email"
                            className="mb-1.5 block text-xs font-bold text-slate-700"
                          >
                            Email Address
                          </label>

                          <input
                            id="contact-email"
                            name="email"
                            type="email"
                            required
                            placeholder="you@example.com"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#22577A] focus:bg-white focus:ring-4 focus:ring-[#22577A]/5"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="contact-phone"
                            className="mb-1.5 block text-xs font-bold text-slate-700"
                          >
                            Phone

                            <span className="ml-1 font-medium text-slate-400">
                              (Optional)
                            </span>
                          </label>

                          <input
                            id="contact-phone"
                            name="phone"
                            type="tel"
                            placeholder="Your phone number"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#22577A] focus:bg-white focus:ring-4 focus:ring-[#22577A]/5"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="contact-organization"
                            className="mb-1.5 block text-xs font-bold text-slate-700"
                          >
                            Pharmacy / Organization
                          </label>

                          <input
                            id="contact-organization"
                            name="organization"
                            type="text"
                            placeholder="Organization name"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#22577A] focus:bg-white focus:ring-4 focus:ring-[#22577A]/5"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="contact-reason"
                          className="mb-1.5 block text-xs font-bold text-slate-700"
                        >
                          Reason for Contact
                        </label>

                        <select
                          id="contact-reason"
                          name="reason"
                          required
                          defaultValue=""
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-[#22577A] focus:bg-white focus:ring-4 focus:ring-[#22577A]/5"
                        >
                          <option value="" disabled>
                            Select a reason
                          </option>

                          {contactReasons.map((reason) => (
                            <option
                              key={reason}
                              value={reason}
                            >
                              {reason}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="contact-message"
                          className="mb-1.5 block text-xs font-bold text-slate-700"
                        >
                          Message
                        </label>

                        <textarea
                          id="contact-message"
                          name="message"
                          required
                          rows={6}
                          placeholder="Tell us how we can help..."
                          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#22577A] focus:bg-white focus:ring-4 focus:ring-[#22577A]/5"
                        />
                      </div>

                      <button
                        type="submit"
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#22577A] px-5 py-3.5 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#1B4662] hover:shadow-md"
                      >
                        Send Enquiry

                        <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </Reveal>
          </div>

          {/* Google Map */}
          <Reveal
            delay={150}
            scale
            className="mt-8"
          >
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#22577A]" />

                    <h3 className="text-base font-extrabold text-slate-900">
                      Find PharmaTrack
                    </h3>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Bamburi, Mombasa, Kenya
                  </p>
                </div>

                <a
                  href="https://www.google.com/maps/search/?api=1&query=Bamburi%2C%20Mombasa%2C%20Kenya"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 self-start rounded-xl bg-[#F4FAF8] px-4 py-2.5 text-xs font-bold text-[#22577A] transition-colors hover:bg-[#22577A] hover:text-white sm:self-auto"
                >
                  Open in Google Maps

                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="h-[360px] w-full sm:h-[420px]">
                <iframe
                  title="PharmaTrack location in Bamburi, Mombasa, Kenya"
                  src="https://www.google.com/maps?q=Bamburi%2C%20Mombasa%2C%20Kenya&output=embed"
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="bg-[#173F57] text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.3fr_0.7fr_0.7fr_1fr]">
            <Reveal from="left">
              <div>
                <img
                  src="/logo/logo.png"
                  alt="PharmaTrack"
                  className="h-14 w-14 object-contain drop-shadow-[0_2px_10px_rgba(255,255,255,0.16)]"
                />

                <h3 className="mt-4 text-xl font-black">
                  PharmaTrack
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-white/55">
                  Smarter pharmacy operations. Better patient care.
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white/40">
                  Explore
                </h4>

                <div className="mt-4 space-y-3">
                  {navItems.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => scrollTo(item.href)}
                      className="block text-sm font-semibold text-white/65 transition-colors hover:text-[#80ED99]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white/40">
                  Account
                </h4>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={onLoginClick}
                    className="block text-sm font-semibold text-white/65 transition-colors hover:text-[#80ED99]"
                  >
                    Log In
                  </button>

                  <button
                    type="button"
                    onClick={onSignUpClick}
                    className="block text-sm font-semibold text-white/65 transition-colors hover:text-[#80ED99]"
                  >
                    Create Account
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollTo("#contact")}
                    className="block text-sm font-semibold text-white/65 transition-colors hover:text-[#80ED99]"
                  >
                    Contact Us
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal
              from="right"
              delay={220}
            >
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white/40">
                  Contact
                </h4>

                <div className="mt-4 space-y-4">
                  <a
                    href="mailto:pharmatrackpms@gmail.com"
                    className="flex items-start gap-3 text-sm font-semibold text-white/65 transition-colors hover:text-[#80ED99]"
                  >
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>
                      pharmatrackpms@gmail.com
                    </span>
                  </a>

                  <a
                    href="tel:0759505291"
                    className="flex items-start gap-3 text-sm font-semibold text-white/65 transition-colors hover:text-[#80ED99]"
                  >
                    <Phone className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>0759505291</span>
                  </a>

                  <div className="flex items-start gap-3 text-sm font-semibold text-white/65">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>Bamburi, Mombasa, Kenya</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} PharmaTrack. All
              rights reserved.
            </p>

            <p>
              Pharmacy management made simpler.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { LandingScreen };

export default LandingScreen;