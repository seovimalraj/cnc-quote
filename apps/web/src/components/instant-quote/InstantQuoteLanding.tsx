"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicLayout from '@/components/PublicLayout';
import {
  ArrowUpTrayIcon,
  ShieldCheckIcon,
  BoltIcon,
  RocketLaunchIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function InstantQuoteLanding() {
  // Simple localStorage-backed A/B bucketing for CTA copy
  const [ctaVariant, setCtaVariant] = useState<'A' | 'B'>('A');
  useEffect(() => {
    try {
      const key = 'iq_cta_variant';
      const existing = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      const chosen = existing === 'A' || existing === 'B' ? existing : Math.random() < 0.5 ? 'A' : 'B';
      if (!existing && typeof window !== 'undefined') {
        window.localStorage.setItem(key, chosen);
      }
      setCtaVariant(chosen as 'A' | 'B');
    } catch (_) {
      // Non-blocking; default stays 'A'
    }
  }, []);

  const heroCtaText = ctaVariant === 'B' ? 'Get Pricing Now' : 'Get Instant Quote';
  const secondaryCtaText = ctaVariant === 'B' ? 'Start — free account' : 'Sign In';
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden py-24 sm:py-28 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500">
        <div className="absolute inset-0 -z-10 opacity-20 blur-3xl" aria-hidden>
          <div className="absolute left-1/2 top-[-10%] h-[40rem] w-[60rem] -translate-x-1/2 rounded-full bg-white/10" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-white/90 ring-1 ring-white/20 backdrop-blur">
                <SparklesIcon className="h-4 w-4" />
                <span className="text-xs">New</span>
                <span className="text-xs">Instant CNC quoting with DFM insights</span>
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                Get an instant quote from your CAD — we manufacture your parts
              </h1>
              <p className="mt-4 text-lg leading-7 text-white/90">
                Upload your STEP, STL, or IGES. We’ll analyze manufacturability and price across quantities fast and transparently. We manufacture and deliver your parts end‑to‑end.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-indigo-700 font-semibold shadow-sm hover:bg-indigo-50"
                  data-cta-variant={ctaVariant}
                  data-cta-location="hero"
                >
                  <RocketLaunchIcon className="h-5 w-5" />
                  {heroCtaText}
                </Link>
                <Link
                  href="/signin"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-3 text-white font-medium ring-1 ring-white/20 hover:bg-white/15"
                  data-cta-variant={ctaVariant}
                  data-cta-location="hero-secondary"
                >
                  {secondaryCtaText}
                </Link>
              </div>
              <div className="mt-5 flex items-center gap-6 text-white/80">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span className="text-sm">Secure CAD handling</span>
                </div>
                <div className="flex items-center gap-2">
                  <BoltIcon className="h-5 w-5" />
                  <span className="text-sm">Real‑time, factory‑calibrated pricing</span>
                </div>
              </div>
              {/* Hero trust strip */}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-white/80">
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">ISO‑aligned workflows</span>
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">Material certs on request</span>
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">Inspection reports available</span>
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">NDA & confidentiality</span>
              </div>
            </div>
            <div>
              <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur shadow-xl p-8">
                <p className="text-sm text-white/80 mb-3">Upload Preview</p>
                <div className="relative h-56 rounded-lg border border-dashed border-white/30 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                  <div className="flex flex-col items-center text-white/90">
                    <ArrowUpTrayIcon className="h-8 w-8" />
                    <div className="mt-2 text-sm">Drag & drop STEP, STL, IGES…</div>
                    <div className="mt-1 text-xs text-white/70">Create an account to upload</div>
                  </div>
                  <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-white/10 to-transparent animate-pulse opacity-40 pointer-events-none" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-white/80">
                  <div className="flex items-center gap-1"><CheckCircleIcon className="h-4 w-4" /> DFM checks</div>
                  <div className="flex items-center gap-1"><CheckCircleIcon className="h-4 w-4" /> Process guidance</div>
                  <div className="flex items-center gap-1"><CheckCircleIcon className="h-4 w-4" /> Guaranteed lead times</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border bg-white hover:shadow-md transition">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-indigo-600" /> Factory‑grade pricing</h3>
              <p className="text-sm text-gray-600">Accurate pricing powered by our materials and finishing catalogs and a calibrated production model.</p>
            </div>
            <div className="p-6 rounded-xl border bg-white hover:shadow-md transition">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><BoltIcon className="h-5 w-5 text-indigo-600" /> Reliable lead times</h3>
              <p className="text-sm text-gray-600">Committed delivery windows from our manufacturing capacity. We build and ship your parts.</p>
            </div>
            <div className="p-6 rounded-xl border bg-white hover:shadow-md transition">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><ShieldCheckIcon className="h-5 w-5 text-indigo-600" /> Confidential & secure</h3>
              <p className="text-sm text-gray-600">Signed uploads, scanning, and access controls keep your IP protected. No marketplace exposure.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quality & tolerance standards */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900">Quality & tolerance standards</h2>
            <p className="mt-2 text-gray-600 text-sm">
              Built for production reliability. Typical CNC tolerances and inspection options are available across common materials and finishes.
            </p>
          </div>
          <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white border">
              <h3 className="font-semibold">Tolerances</h3>
              <p className="mt-2 text-sm text-gray-600">Typical ±0.005 in (±0.127 mm). Tighter on request with detailed drawings/GD&amp;T.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border">
              <h3 className="font-semibold">Finishes</h3>
              <p className="mt-2 text-sm text-gray-600">As‑machined, bead blast, anodize (Type II/III), powder coat, and more.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border">
              <h3 className="font-semibold">Materials</h3>
              <p className="mt-2 text-sm text-gray-600">Aluminum 6061/7075, steels 1018/4140, stainless 304/316, acetal, nylon, PEEK.</p>
            </div>
            <div className="p-5 rounded-xl bg-white border">
              <h3 className="font-semibold">Inspection</h3>
              <p className="mt-2 text-sm text-gray-600">Dimensional reports by default. CMM/FAI and material certs available on request.</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">Capabilities vary by geometry and material. Share drawings for the tightest specs.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-white border">
              <div className="text-xs font-semibold text-indigo-600">Step 1</div>
              <h4 className="mt-1 font-semibold">Create your account</h4>
              <p className="mt-2 text-sm text-gray-600">Sign up to unlock secure uploads and your personal quote workspace.</p>
            </div>
            <div className="p-6 rounded-xl bg-white border">
              <div className="text-xs font-semibold text-indigo-600">Step 2</div>
              <h4 className="mt-1 font-semibold">Upload CAD & configure</h4>
              <p className="mt-2 text-sm text-gray-600">We’ll run DFM checks, guide material/finish choices, and price across quantities using our catalog and factory model.</p>
            </div>
            <div className="p-6 rounded-xl bg-white border">
              <div className="text-xs font-semibold text-indigo-600">Step 3</div>
              <h4 className="mt-1 font-semibold">Compare & checkout</h4>
              <p className="mt-2 text-sm text-gray-600">Review options, see guaranteed lead times, and complete checkout. We take care of production and delivery.</p>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-white font-semibold shadow-sm hover:bg-indigo-700"
              data-cta-variant={ctaVariant}
              data-cta-location="how-it-works"
            >
              <RocketLaunchIcon className="h-5 w-5" />
              {ctaVariant === 'B' ? 'Start free — get pricing' : 'Start free — get instant quote'}
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
