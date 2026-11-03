"use client";

import Link from "next/link";
import type * as React from "react";
import type { TreeSummary } from "@/lib/types";
import { LanguageSwitch, rich, useLanguage } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";
import { CreateTreeForm } from "./CreateTreeForm";
import { ImportFamilyButton } from "./ImportFamilyButton";
import { OpenProjectButton } from "./OpenProjectButton";
import { TreeCards } from "./TreeCards";
import { Icon, type IconName } from "@/components/Icon";

// A faint eight-pointed star lattice, like the margins of a manuscript.
const PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="none" stroke="#c39a3c" stroke-opacity="0.13" stroke-width="1"><path d="M32 8l7 17 17 7-17 7-7 17-7-17-17-7 17-7z"/><rect x="20" y="20" width="24" height="24" transform="rotate(45 32 32)"/></g></svg>',
)}")`;

const FEATURES = [
  ["tree", "home.f.tree", "home.f.treeText"],
  ["pen", "home.f.arabic", "home.f.arabicText"],
  ["family", "home.f.family", "home.f.familyText"],
  ["printer", "home.f.size", "home.f.sizeText"],
] as const satisfies readonly (readonly [IconName, MessageKey, MessageKey])[];

/**
 * The start page as shown: in the interface's language (the page itself
 * only reads the families from the database).
 */
export function HomeView({ trees, dbError }: { trees: TreeSummary[]; dbError: string | null }) {
  const { t, n } = useLanguage();
  const returning = trees.length > 0;
  // one card for each way to start: the same frame, the action at the bottom
  const startCard = (icon: IconName, title: string, text: React.ReactNode, action: React.ReactNode) => (
    <div className="flex flex-col rounded-xl border border-parchment-300 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-semibold"><Icon name={icon} className="h-5 w-5 text-gilt-600" />{title}</h3>
      <div className="mt-1 flex-1 text-sm text-bark-500">{text}</div>
      <div className="mt-4">{action}</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-parchment-100 text-bark-900" style={{ backgroundImage: PATTERN }}>
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6">
        <div className="-mt-4 mb-2 flex justify-end"><LanguageSwitch /></div>
        {/* ── Hero: what the app makes, and the way in ─────────────────── */}
        <section className="grid items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 text-center md:text-start">
            <div>
              <h1 className="font-ruqaa text-6xl font-bold leading-tight text-bark-700 sm:text-7xl">شجرة</h1>
              <p className="font-naskh text-xl text-gilt-600 md:text-left" dir="rtl">اصنع شجرة عائلتك… لوحةً تليق بالأجداد</p>
            </div>
            <p className="text-2xl font-light leading-snug">
              {t("home.hero1")}<span className="font-medium text-leaf-700">{t("home.heroPoster")}</span>{t("home.hero2")}
            </p>
            <p className="mx-auto max-w-xl text-base text-bark-500 md:mx-0">
              {t("home.intro")}
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <a href="#start" className="btn-primary px-5 py-2.5 text-base">{t(returning ? "home.startAnother" : "home.start")}</a>
              <Link href="/demo" className="btn-outline px-5 py-2.5 text-base">{t("home.demo")}</Link>
            </div>
          </div>
          <div className={`relative mx-auto w-full ${returning ? "max-w-[15rem]" : "max-w-xs"}`}>
            <div aria-hidden className="absolute -inset-2 rotate-2 rounded-lg bg-gilt-400/20 blur-sm" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing-poster.jpg"
              alt={t("home.posterAlt")}
              className="relative w-full rounded-md border border-gilt-400/60 shadow-xl"
            />
          </div>
        </section>

        {dbError ? (
          <section className="mt-10 rounded-xl border border-red-200 bg-white p-6 shadow-sm" role="alert">
            <h2 className="text-lg font-semibold text-red-800">{t("home.dbTitle")}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {rich(t("home.dbHelp"), {
                compose: <code dir="ltr">docker compose up -d</code>, example: <code dir="ltr">.env.example</code>, env: <code dir="ltr">.env</code>,
                migrate: <code dir="ltr">npm run db:migrate</code>, seed: <code dir="ltr">npm run db:seed</code>,
                demo: <Link href="/demo" className="underline">{t("home.demoWord")}</Link>,
              })}
            </p>
          </section>
        ) : (
          <>
            {/* ── Your families: what a returning user came for ─────── */}
            {returning ? (
              <section className="mt-10" aria-labelledby="families-h">
                <h2 id="families-h" className="mb-3 text-xl font-semibold">
                  {t("home.families")} <span className="text-sm font-normal text-bark-500">({n(trees.length)})</span>
                </h2>
                <TreeCards trees={trees} />
              </section>
            ) : (
              <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("home.whatItDoes")}>
                {FEATURES.map(([icon, title, text]) => (
                  <div key={title} className="rounded-xl border border-parchment-300/70 bg-white/70 p-4">
                    <Icon name={icon} className="h-7 w-7 text-gilt-600" />
                    <h3 className="mt-1 font-semibold">{t(title)}</h3>
                    <p className="mt-1 text-sm text-bark-500">{t(text)}</p>
                  </div>
                ))}
              </section>
            )}

            {/* ── Three ways to start, apart from the list ──────────── */}
            <section id="start" className="mt-12 scroll-mt-6 border-t border-parchment-300 pt-8" aria-labelledby="start-h">
              <h2 id="start-h" className="text-xl font-semibold">{t(returning ? "home.startAnother" : "home.start")}</h2>
              <p className="mb-5 mt-1 text-sm text-bark-500">{t("home.ways")}</p>
              <div className="grid gap-5 md:grid-cols-3">
                {startCard("pen", t("home.create"),
                  <p>{t("home.createNote")}</p>,
                  <CreateTreeForm />)}
                {startCard("file", t("home.import"),
                  <>
                    <p>{rich(t("home.importNote"), { gedcom: <b>GEDCOM</b>, outline: <b>{t("home.outlineWord")}</b> })}</p>
                    <pre className="mt-3 overflow-x-auto rounded-md bg-parchment-50 p-2 text-xs leading-relaxed text-bark-700" dir="rtl">{`عبدالله
  محمد | زوجة: نورة بنت سعد
    خالد | أم: نورة بنت سعد
    سارة (بنت) | زوج: فهد الشمري`}</pre>
                  </>,
                  <ImportFamilyButton />)}
                {startCard("archive", t("home.open"),
                  <p>{rich(t("home.openNote"), { file: <code dir="ltr">.shajarah</code> })}</p>,
                  <OpenProjectButton />)}
              </div>
            </section>
          </>
        )}

        <footer className="mt-12 text-center text-xs text-bark-500">
          <span dir="rtl">«تعلموا من أنسابكم ما تصلون به أرحامكم»</span>{t("home.footer")}
        </footer>
      </div>
    </main>
  );
}
