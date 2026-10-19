import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Package,
  Pill,
  ShieldCheck,
  Stethoscope,
  Truck,
  Users,
} from "lucide-react";

import { Link, useParams } from "react-router-dom";

type FeatureKey =
  | "inventory"
  | "dispensing"
  | "patients"
  | "suppliers"
  | "reports"
  | "security";

interface FeatureData {
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Package;
  image: string;
  benefits: string[];
  workflow: string[];
  color: string;
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "bottom" | "left" | "right";
  scale?: boolean;
}

/**
 * Lightweight scroll-triggered reveal animation.
 * Respects the user's reduced-motion accessibility preference.
 */
function Reveal({
  children,
  className = "",
  delay = 0,
  from = "bottom",
  scale = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
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
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
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

  const hiddenScale = scale ? "scale-[0.97]" : "scale-100";

  const visibleClasses =
    "translate-x-0 translate-y-0 opacity-100 scale-100";

  const hiddenClasses =
    `${hiddenTransform} ${hiddenScale} opacity-0`;

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        visible ? visibleClasses : hiddenClasses,
        className,
      ].join(" ")}
      style={{
        transitionDelay: reducedMotion ? "0ms" : `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const features: Record<FeatureKey, FeatureData> = {
  inventory: {
    title: "Smart Inventory Management",
    subtitle: "Know what you have. Know what you need.",
    description:
      "Manage medicines, stock levels, expiry dates, batch information, and stock movements from one organized pharmacy inventory system.",
    icon: Package,
image: "inventory.jpg",
benefits: [
      "Real-time stock visibility",
      "Low-stock monitoring",
      "Expiry-date tracking",
      "Batch and quantity management",
      "Stock adjustment records",
      "Faster inventory decisions",
    ],
    workflow: [
      "Add and organize medicines",
      "Record received stock",
      "Monitor stock levels",
      "Track adjustments and movements",
      "Identify medicines requiring attention",
    ],
    color: "#22577A",
  },

  dispensing: {
    title: "Fast & Accurate Dispensing",
    subtitle: "Make every dispensing process easier.",
    description:
      "Support accurate medicine dispensing with patient records, prescription information, stock validation, and transaction history working together.",
    icon: Pill,
    image: "dispensing.jpg",
    benefits: [
      "Quick medicine selection",
      "Patient-linked dispensing",
      "Prescription support",
      "Stock-aware transactions",
      "Dispensing history",
      "Reduced manual paperwork",
    ],
    workflow: [
      "Select or register the patient",
      "Review prescription information",
      "Select medicines",
      "Confirm quantities",
      "Complete the dispensing transaction",
    ],
    color: "#168AAD",
  },

  patients: {
    title: "Patient Management",
    subtitle: "Keep patient information organized and accessible.",
    description:
      "Maintain structured patient records and connect dispensing activities with the people receiving care.",
    icon: Users,
    image: "patients.jpg",
    benefits: [
      "Centralized patient records",
      "Fast patient search",
      "Patient contact information",
      "Dispensing history",
      "Organized records",
      "Improved continuity of care",
    ],
    workflow: [
      "Register the patient",
      "Maintain patient information",
      "Search records when needed",
      "Connect dispensing transactions",
      "Review patient history",
    ],
    color: "#2A9D8F",
  },

  suppliers: {
    title: "Supplier Management",
    subtitle: "Keep your supply chain organized.",
    description:
      "Manage supplier information and connect stock receiving activities with the medicines entering your pharmacy.",
    icon: Truck,
    image: "suppliers.jpg",
    benefits: [
      "Centralized supplier records",
      "Supplier contact information",
      "Stock receiving support",
      "Supplier-linked inventory",
      "Better purchasing visibility",
      "Organized supply records",
    ],
    workflow: [
      "Register suppliers",
      "Maintain supplier information",
      "Select suppliers during stock receiving",
      "Record incoming medicines",
      "Maintain supply history",
    ],
    color: "#457B9D",
  },

  reports: {
    title: "Reports & Insights",
    subtitle: "Turn pharmacy activity into useful information.",
    description:
      "Understand dispensing activity, inventory movements, and pharmacy operations through structured reporting and organized records.",
    icon: BarChart3,
    image: "reports.jpg",
    benefits: [
      "Operational visibility",
      "Transaction history",
      "Inventory insights",
      "Stock movement records",
      "Management information",
      "Better decision support",
    ],
    workflow: [
      "Capture pharmacy activities",
      "Organize transaction records",
      "Review operational information",
      "Identify important trends",
      "Use the information for planning",
    ],
    color: "#6A994E",
  },

  security: {
    title: "Security & Accountability",
    subtitle: "Protect access and maintain accountability.",
    description:
      "PharmaTrack is designed around authenticated access, role-based permissions, secure sessions, and audit records for important activities.",
    icon: ShieldCheck,
    image: "security.jpg",
    benefits: [
      "Authenticated user access",
      "Role-based permissions",
      "Secure session handling",
      "Audit logging",
      "Accountability for important actions",
      "Security-focused architecture",
    ],
    workflow: [
      "Authenticate authorized users",
      "Apply role-based access",
      "Protect authenticated sessions",
      "Record important activities",
      "Review audit information when required",
    ],
    color: "#264653",
  },
};

function FeatureDetails() {
  const { feature } = useParams<{ feature: string }>();

  const featureData = feature
    ? features[feature as FeatureKey]
    : undefined;

  if (!featureData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-[#CFE5DC] bg-[#E8F5F0] backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <Link
              to="/"
              className="flex items-center gap-3"
              aria-label="PharmaTrack home"
            >
              <img
                src="/logo/logo-color.png"
                alt="PharmaTrack"
                className="h-12 w-12 shrink-0 object-contain drop-shadow-sm"
              />

              <div>
                <div className="text-lg font-black tracking-tight text-[#22577A]">
                  PHARMATRACK
                </div>

                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Pharmacy Management System
                </div>
              </div>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#22577A] transition-colors duration-300 hover:bg-white"
            >
              <ArrowLeft size={16} />
              Back Home
            </Link>
          </div>
        </header>

        <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6 py-20 text-center">
          <Reveal scale>
            <div>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22577A]/10 text-[#22577A]">
                <FileText size={30} />
              </div>

              <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">
                Feature not found
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
                The feature you are looking for could not be found.
                Please return to the PharmaTrack home page and select a
                feature from there.
              </p>

              <Link
                to="/"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#22577A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#22577A]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#173F57] hover:shadow-xl"
              >
                Return Home
                <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>
        </main>
      </div>
    );
  }

  const Icon = featureData.icon;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navbar */}
      <header className="border-b border-[#CFE5DC] bg-[#E8F5F0] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link
            to="/"
            className="group flex items-center gap-3"
            aria-label="PharmaTrack home"
          >
            <img
              src="/logo/logo-color.png"
              alt="PharmaTrack"
              className="h-12 w-12 shrink-0 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
            />

            <div>
              <div className="text-lg font-black tracking-tight text-[#22577A]">
                PHARMATRACK
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Pharmacy Management System
              </div>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#22577A] transition-all duration-300 hover:bg-white hover:-translate-x-0.5"
          >
            <ArrowLeft
              size={16}
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            Back Home
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
                {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#F4FAF8] to-[#E8F7EF]">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#80ED99]/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <Reveal from="left">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#80ED99]/60 bg-white px-4 py-2 text-xs font-bold text-[#22577A] shadow-sm">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    PharmaTrack Feature
                  </div>

                  <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-[#173F57] sm:text-5xl lg:text-6xl">
                    {featureData.title}
                  </h1>

                  <p className="mt-5 max-w-2xl text-xl font-bold leading-relaxed text-[#278653]">
                    {featureData.subtitle}
                  </p>

                  <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                    {featureData.description}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      to="/"
                      className="group inline-flex items-center gap-2 rounded-xl bg-[#80ED99] px-6 py-3.5 text-sm font-extrabold text-[#173F57] shadow-lg shadow-emerald-900/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#95F2AA] hover:shadow-xl"
                    >
                      Explore PharmaTrack
                      <ArrowRight
                        size={17}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>

                    <Link
                      to="/#contact"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#22577A]/20 bg-white px-6 py-3.5 text-sm font-bold text-[#22577A] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Contact Us
                    </Link>
                  </div>
                </div>
              </Reveal>

              <Reveal from="right" scale delay={150}>
                <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
                  <div className="absolute -inset-4 rounded-[2rem] bg-[#80ED99]/30 blur-2xl" />

                  <div className="relative overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-2xl shadow-[#173F57]/15">
                    <img
                      src={`/features/${featureData.image}`}
                      alt={featureData.title}
                      className="aspect-[4/3] w-full object-cover sm:aspect-[5/4]"
                      fetchPriority="high"
                    />

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#12324A]/90 via-[#12324A]/45 to-transparent p-5 pt-16 sm:p-7 sm:pt-20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/95 shadow-lg">
                          <Icon
                            size={25}
                            strokeWidth={1.8}
                            style={{ color: featureData.color }}
                          />
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-white/75">
                            PharmaTrack
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-white sm:text-base">
                            {featureData.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -right-2 top-5 flex items-center gap-2 rounded-xl border border-white/80 bg-white px-3 py-2.5 shadow-lg sm:-right-4 sm:top-8 sm:px-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </span>
                    <span className="text-xs font-extrabold text-[#173F57]">
                      Designed for your workflow
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Reveal>
              <div className="max-w-2xl">
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-[#2A9D8F]">
                  Key Benefits
                </div>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Built to make pharmacy work simpler.
                </h2>

                <p className="mt-5 text-base leading-7 text-slate-600">
                  PharmaTrack brings important pharmacy activities into
                  one organized system so your team can spend less time
                  managing information and more time serving patients.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featureData.benefits.map((benefit, index) => (
                <Reveal
                  key={benefit}
                  delay={index * 75}
                  scale
                >
                  <div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#2A9D8F]/40 hover:bg-white hover:shadow-lg">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2A9D8F]/10 text-[#2A9D8F] transition-transform duration-300 hover:scale-110">
                      <CheckCircle2 size={20} />
                    </div>

                    <h3 className="font-bold text-slate-900">
                      {benefit}
                    </h3>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="bg-[#F4FAF8] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <Reveal from="left">
                <div>
                  <div className="text-sm font-bold uppercase tracking-[0.18em] text-[#22577A]">
                    How It Works
                  </div>

                  <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                    A clear workflow for your team.
                  </h2>

                  <p className="mt-5 text-base leading-7 text-slate-600">
                    PharmaTrack is designed to keep everyday pharmacy
                    processes structured, traceable, and easy to follow.
                  </p>
                </div>
              </Reveal>

              <div className="space-y-4">
                {featureData.workflow.map((step, index) => (
                  <Reveal
                    key={step}
                    from="right"
                    delay={index * 70}
                  >
                    <div className="flex items-start gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22577A]/30 hover:shadow-md">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22577A] text-sm font-black text-white transition-transform duration-300 hover:scale-105">
                        {index + 1}
                      </div>

                      <div className="pt-1">
                        <p className="font-semibold leading-6 text-slate-800">
                          {step}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <Reveal scale>
              <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#22577A] to-[#173F57] px-7 py-12 text-center shadow-2xl transition-shadow duration-500 hover:shadow-[0_25px_60px_-20px_rgba(34,87,122,0.45)] sm:px-12 lg:px-16 lg:py-16">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white transition-transform duration-300 hover:rotate-3 hover:scale-110">
                  <Stethoscope size={28} />
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Ready for smarter pharmacy operations?
                </h2>

                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/75">
                  Discover how PharmaTrack can bring inventory,
                  dispensing, patients, suppliers, reports, and security
                  together in one system.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link
                    to="/"
                    className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#22577A] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    Get Started
                    <ArrowRight
                      size={17}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>

                  <Link
                    to="/#contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    Talk to Us
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#173F57]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Reveal from="left">
            <Link
              to="/"
              className="group flex items-center gap-3"
              aria-label="PharmaTrack home"
            >
              <img
                src="/logo/logo.png"
                alt="PharmaTrack"
                className="h-12 w-12 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
              />

              <div>
                <div className="text-sm font-black tracking-tight text-white">
                  PHARMATRACK
                </div>

                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Pharmacy Management System
                </div>
              </div>
            </Link>
          </Reveal>

          <Reveal from="right" delay={100}>
            <div className="text-sm text-white/60">
              © {new Date().getFullYear()} PharmaTrack. All rights reserved.
            </div>
          </Reveal>
        </div>
      </footer>
    </div>
  );
}

export { FeatureDetails };
export default FeatureDetails;