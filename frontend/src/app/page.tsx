import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ChainSight — Supply Chain Intelligence",
  description:
    "What ChainSight does, how to use it, and why it beats a traditional inventory dashboard.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* HERO */}
        <div className="mb-14">
          <p className="text-sm font-medium text-cyan-400">
            ChainSight · Supply Chain Intelligence
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Developed by Vikesh Sagar Bairam
          </p>

          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            Open the app and it has already found the problem.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-400">
            ChainSight is an inventory and supply-chain command center that
            reads your stock position the moment you sign in, works out what is
            about to go wrong, and drafts the fix. No dashboards to build, no
            reports to run, no digging through spreadsheets.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Open the dashboard
            </a>

            <a
              href="/inventory"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Browse inventory
            </a>
          </div>
        </div>

        {/* THE PROBLEM */}
        <Section
          eyebrow="The problem"
          title="Stockouts are found too late"
        >
          <p className="text-slate-400">
            In most operations, a stockout is discovered when someone tries to
            fulfil an order and the shelf is empty. By then the supplier lead
            time — often one to three weeks — has already run out. The signals
            were all there: demand was climbing, stock was falling, the reorder
            point was close. Nobody was watching every SKU every day.
          </p>

          <p className="mt-4 text-slate-400">
            ChainSight watches every SKU every day. It compares current stock
            against forecast demand and supplier lead time, and surfaces the
            items that will run out before a replacement order can arrive —
            while there is still time to act.
          </p>
        </Section>

        {/* HOW IT WORKS */}
        <Section eyebrow="How it works" title="Four steps, most of them automatic">
          <ol className="space-y-5">
            <Step
              n={1}
              title="You open the dashboard"
              body="The Morning Briefing runs on its own. It reads your live inventory, purchase orders and demand forecast — no button to press."
            />
            <Step
              n={2}
              title="The engine analyzes every SKU"
              body="For each item it calculates days of cover, days to stockout, lead-time demand, the recommended order quantity and the value of demand at risk, then ranks everything by urgency."
            />
            <Step
              n={3}
              title="ChainSight writes the briefing"
              body="Our AI engine turns the analysis into an executive summary and a plain-language explanation for each at-risk item — what is happening, why it matters, and the single next step. The figures come from the engine; the wording is written for a manager in a hurry."
            />
            <Step
              n={4}
              title="You act in one click"
              body="Each at-risk card carries a Create purchase order button pre-filled with the recommended quantity and supplier. The order lands in the Pending Approval queue, ready for sign-off."
            />
          </ol>
        </Section>

        {/* FEATURES */}
        <Section eyebrow="What is inside" title="Connected views">
          <div className="grid gap-4 sm:grid-cols-2">
            <Feature
              title="AI Morning Briefing"
              body="The dashboard. Ranked alerts, an executive summary and one-click reorders, generated on load."
            />
            <Feature
              title="Inventory"
              body="Every SKU with stock, forecast, reorder point, lead time and a live risk rating. Add, edit and reorder items."
            />
            <Feature
              title="Demand Forecast"
              body="7 / 30 / 60 / 90-day demand signals, trend detection and per-SKU planning recommendations."
            />
            <Feature
              title="Suppliers"
              body="On-time delivery, quality score, defect rate and lead time — so reorders go to the supplier that will actually deliver."
            />
            <Feature
              title="Purchase Orders"
              body="The full procurement lifecycle from draft to received. Receiving a PO flows the units straight back into inventory."
            />
            <Feature
              title="Production & Quality"
              body="Manufacturing orders with output against plan, first-pass yield, defect rates and quality holds. Completed orders flow good units into inventory."
            />
            <Feature
              title="It all connects"
              body="A reorder from the briefing becomes a PO; a received PO or a completed production order updates stock; the next briefing reflects it. One loop."
            />
          </div>
        </Section>

        {/* BENEFITS */}
        <Section eyebrow="Why it is better" title="Advantages over a normal dashboard">
          <div className="grid gap-4 sm:grid-cols-2">
            <Benefit
              title="Answers, not charts"
              body="A traditional dashboard shows you data and leaves the interpretation to you. ChainSight tells you what to do and why."
            />
            <Benefit
              title="Nothing to configure"
              body="No dashboard to build, no thresholds to wire up, no scheduled report. It works the first time you open it."
            />
            <Benefit
              title="Ranked by urgency"
              body="The item that will stock out in five days is at the top. The one with three weeks of cover is not shouting for attention."
            />
            <Benefit
              title="Time to act"
              body="Risks are flagged against supplier lead time, so you hear about them while a reorder can still land in time."
            />
            <Benefit
              title="One-click procurement"
              body="The recommended quantity and supplier are already filled in. Approving a reorder takes seconds."
            />
            <Benefit
              title="Explains its reasoning"
              body="Every recommendation comes with the stock, forecast and lead-time figures behind it. You can check the math."
            />
          </div>
        </Section>

        {/* HOW TO USE */}
        <Section eyebrow="Getting started" title="How to use ChainSight day to day">
          <ol className="space-y-4">
            <Step
              n={1}
              title="Start on the dashboard"
              body="Read the executive summary first, then work down the at-risk cards from top to bottom."
            />
            <Step
              n={2}
              title="Create the purchase orders it recommends"
              body="Use the button on each card. Adjust the quantity later on the Purchase Orders page if you need to."
            />
            <Step
              n={3}
              title="Approve and track POs"
              body="Move each order through Approved → Ordered → In Transit → Received. Receiving it updates inventory automatically."
            />
            <Step
              n={4}
              title="Keep inventory current"
              body="Add new SKUs and update stock, forecast and reorder points on the Inventory page. The briefing picks up changes right away — hit Re-run to refresh it."
            />
          </ol>
        </Section>

        {/* CLOSING */}
        <div className="mt-14 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.07] to-slate-900 p-8 text-center">
          <h2 className="text-2xl font-bold">Ready to look?</h2>

          <p className="mx-auto mt-2 max-w-xl text-slate-400">
            The dashboard will tell you where your inventory stands in about a
            second.
          </p>

          <a
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Open the dashboard
          </a>
        </div>

        {/* BUILT BY */}
        <Section eyebrow="Built by" title="Vikesh Sagar Bairam">
          <p className="max-w-2xl text-slate-400">
            I designed and built ChainSight end to end — the analysis engine, the
            interface, the data model and the deployment. It is an open-source
            demonstration of turning operational data into decisions a manager
            can act on in seconds.
          </p>

          <p className="mt-4 max-w-2xl text-slate-400">
            <span className="font-medium text-slate-200">
              Open to opportunities
            </span>{" "}
            — full-stack / product engineering roles, founding-engineer work, and
            collaborations with teams building operational software.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://github.com/Vikesh2608/chainsight"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              View source on GitHub
            </a>

            <a
              href="https://github.com/Vikesh2608"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              GitHub profile
            </a>

            {/* TODO: replace the two links below with your real URLs */}
            <a
              href="https://www.linkedin.com/in/your-handle"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              LinkedIn
            </a>

            <a
              href="mailto:you@example.com"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Get in touch
            </a>
          </div>
        </Section>

        {/* CREDIT */}
        <p className="mt-4 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          ChainSight is open source under the MIT License · designed and
          developed by{" "}
          <span className="font-medium text-slate-300">
            Vikesh Sagar Bairam
          </span>
        </p>
      </div>
    </main>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14 border-t border-slate-800 pt-10">
      <p className="text-sm font-medium text-cyan-400">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold md:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-sm font-semibold text-cyan-300">
        {n}
      </span>

      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
      </div>
    </li>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center gap-2">
        <span className="text-cyan-400">✓</span>
        <p className="font-semibold text-white">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}
