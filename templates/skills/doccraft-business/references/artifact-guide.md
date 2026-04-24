# Business Artifact Guide

Reference for the `docs/business/` artifacts consumed by this skill.
Use this when interviewing the user to fill a missing or stale artifact.

---

## target-audience.md

**Purpose:** Who the product is for, what problem it solves, and which segments matter most.

**Complete when it answers:**
- Who are the primary and secondary segments? (demographics, behavior, channel)
- What is their current workaround, and what do they already pay for it?
- Why don't they have this solution today?
- Which segment is prioritised for launch, and why?

**Stale when:** Segment priority hasn't been revisited after first user testing, or a new channel/market has emerged that isn't reflected.

**Interview questions to fill it:**
- "Who is the first person you'd call to try this? Describe them."
- "What are they doing today instead? What does that cost them in time or money?"
- "Why haven't they solved this already?"

---

## business-model.md

**Purpose:** How money flows — revenue streams, pricing structure, and the relationship between users, creators, and the platform.

**Complete when it answers:**
- What are the 1–3 revenue streams? (e.g. marketplace, credits, subscription, rev-share)
- What does each stream charge for, and at what price point?
- Which stream is primary at launch vs. later?
- How does value flow between parties (e.g. author ↔ platform ↔ user)?

**Stale when:** A pricing experiment has run and results aren't reflected, or a new stream has been added to the backlog.

**Interview questions to fill it:**
- "How does someone pay you for the first time?"
- "What does a single transaction look like — what changes hands?"
- "Is there a recurring component, or is it one-time?"

---

## unit-economics.md

**Purpose:** The per-unit math — cost to deliver, margin, pricing tiers, and LTV/CAC targets.

**Complete when it answers:**
- What does it cost to deliver one unit of value? (e.g. cost per audiobook, cost per credit)
- What is the target margin per transaction?
- What is the LTV target, and what drives it (repeat purchase, subscription)?
- What CAC can the model afford?

**Stale when:** API costs have changed, or pricing tiers have been updated without recalculating margin.

**Interview questions to fill it:**
- "What does it actually cost you when a user completes one transaction?"
- "What's the minimum you need to charge for that to be profitable?"
- "How many times do you expect a user to pay you in the first year?"

---

## competitive-landscape.md

**Purpose:** Who else serves this need, how they're positioned, and where the differentiation lives.

**Complete when it answers:**
- Who are the 3–5 most relevant alternatives? (direct and indirect)
- How does each one price, position, and distribute?
- What is the key differentiator vs. each, and is that differentiator defensible?
- Where are competitors weak in ways the product can exploit?

**Stale when:** A major competitor has launched a new feature, changed pricing, or entered the market.

**Interview questions to fill it:**
- "If someone doesn't use this, what do they use instead?"
- "Have you seen any competitors you're watching? What worries you about them?"
- "What's the one thing you can do that they can't — or won't?"

---

## marketing-strategy.md

**Purpose:** How the product reaches its audience — channels, content, and the acquisition funnel.

**Complete when it answers:**
- What is the primary acquisition channel at launch?
- What content format drives awareness (e.g. before/after clips, search-intent pages)?
- What is the funnel: impression → lead → paying customer?
- Are there organic/viral mechanics built into the product?

**Stale when:** A channel has been tested and the data isn't reflected, or a new content pillar has been added.

**Interview questions to fill it:**
- "How will the first 100 users find you?"
- "What would make someone share this with a friend without being asked?"
- "Have you run any content or paid experiments yet? What happened?"

---

## legal-copyright.md

**Purpose:** What content can be used, under what conditions, and what compliance constraints apply.

**Complete when it answers:**
- What categories of content are safe to use without rights clearance? (public domain, user-owned, rev-share partners)
- What is explicitly off-limits?
- What obligations apply to user-uploaded content?
- Are there jurisdiction-specific constraints?

**Stale when:** A new content category has been added to the product, or legal guidance has changed.

**Interview questions to fill it:**
- "Who owns the content you're converting?"
- "Have you talked to a lawyer about this, or are you working from your own reading?"
- "What's your plan for content that turns out to infringe?"

---

## launch-sequence.md

**Purpose:** The phased go-to-market plan — what launches when, and what gates each phase.

**Complete when it answers:**
- What are the phases? (e.g. private beta → public beta → paid launch)
- What must be true before moving from one phase to the next? (user count, revenue, retention)
- What is the current phase, and what's the gate to the next one?

**Stale when:** A phase gate has been passed and the doc hasn't been updated to reflect the current phase.

**Interview questions to fill it:**
- "What does success look like at the end of the next 30 days?"
- "What number or signal would tell you it's time to open up to more users?"
- "Is there anything that could block launch that you're not sure how to solve?"
