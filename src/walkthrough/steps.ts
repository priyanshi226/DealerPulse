import type { AppView } from '../components/ViewToggle/ViewToggle';

export interface WalkthroughStep {
  id: string;
  /** Which top-level tab must be showing for this step's target to exist.
   * `null` means the step doesn't need a specific view (welcome/finish). */
  view: AppView | null;
  /** Element id to spotlight and scroll to. `null` renders a centered card
   * instead — used only for the welcome and finish steps. */
  targetId: string | null;
  title: string;
  body: string;
}

// Step 8 ("Ask AI") in the brief assumes Ask AI lives inside Questions —
// in this build it deliberately lives on Actionable instead, right next to
// the priorities it reasons about (see DECISIONS.md). The walkthrough always
// points at where things actually are, never a fabricated location, so this
// step navigates back to Actionable rather than pretending otherwise.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    view: null,
    targetId: null,
    title: 'Welcome to DealerPulse',
    body: 'Your sales command center for understanding what is happening, finding what needs attention, and deciding what to do next.',
  },
  {
    id: 'actionable',
    view: 'actionable',
    targetId: 'nav-actionable',
    title: 'Start here.',
    body: 'Actionable turns your sales data into a short list of things worth paying attention to — risky deals, performance gaps, workload issues, and recommended next steps.',
  },
  {
    id: 'ai-brief',
    view: 'actionable',
    targetId: 'executive-priorities',
    title: 'This is your quick sales brief.',
    body: 'These priorities are pulled straight from your real sales data and ranked by how much they matter. Each one tells you what happened, why it matters, and what you can do next.',
  },
  {
    id: 'deals-attention',
    view: 'actionable',
    targetId: 'deals-requiring-attention',
    title: 'These are the deals most worth looking at.',
    body: 'See who the customer is, how much the deal is worth, how long it has been quiet, and the recommended action — sort or filter to find your own priorities.',
  },
  {
    id: 'analytics',
    view: 'analytics',
    targetId: 'nav-analytics',
    title: 'Analytics tells you what is happening.',
    body: 'Use it to understand revenue, conversion, pipeline, products, sources, dealerships, and sales reps across the business.',
  },
  {
    id: 'rankings',
    view: 'analytics',
    targetId: 'ranked-dealerships',
    title: 'Compare branches and reps side by side.',
    body: 'Rank by revenue, units, or average deal value. Use these to quickly spot your strongest performers and the areas worth investigating.',
  },
  {
    id: 'questions',
    view: 'questions',
    targetId: 'nav-questions',
    title: "Can't find what you're looking for?",
    body: 'Ask a question in plain English. Add filters to make it more specific, and DealerPulse answers using the real underlying data — never a guess.',
  },
  {
    id: 'ask-ai',
    view: 'actionable',
    targetId: 'ask-ai-card',
    title: "You can also ask DealerPulse anything that's not already listed.",
    body: 'Try "Why are sales down?", "Which branch needs attention?", or "Which high-value deals are at risk?" — it uses your actual data to explain what\'s going on.',
  },
  {
    id: 'whatif',
    view: 'actionable',
    targetId: 'what-if-simulator',
    title: 'Want to test a scenario?',
    body: "See what could happen if conversion improves, more quiet deals get recovered, or another business variable changes. These are projections, not guarantees.",
  },
  {
    id: 'finish',
    view: 'actionable',
    targetId: null,
    title: "You're ready.",
    body: 'Start with Actionable to see what needs attention, use Analytics to understand the numbers, and use Questions whenever you want to dig deeper.',
  },
];
