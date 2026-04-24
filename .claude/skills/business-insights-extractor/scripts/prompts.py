"""Prompts for the extraction pipeline.

Kept in one place so they can be iterated on without touching pipeline code.
Prompts are explicit about conciseness because the source material is verbose
Russian long-form posts and the natural LLM instinct is to over-translate.
"""

MAP_PROMPT = """\
You are extracting distilled startup rules from a batch of Russian-language
Telegram posts written by a startup founder (the channel is "Твой пет проект").
The channel's topic is: launching, running, and monetising pet-projects and
startups — product, go-to-market, unit economics, team, founder mindset.

Your job: read the batch and emit ONLY rules of thumb in English. Ruthlessly.

HARD RULES:
- Each rule: ONE LINE. <=180 characters. Imperative voice. English.
- Strip all war stories, examples, specific names, prices, dates, hedges,
  and "as someone once said" attributions. Distill to the rule itself.
- If a message has no extractable rule (pure announcement, promo, personal
  anecdote, Q&A logistics), skip it silently. Do not apologise or explain.
- Dedupe within this batch: if two messages yield the same rule, emit it once
  in the sharpest form.
- Do NOT categorise. Do NOT number. Do NOT bullet. Do NOT add preamble or
  postamble. Just rules, one per line.

GOOD (English, imperative, rule-shaped):
  Launch before you feel ready; customer reaction beats your instinct.
  Validate payment willingness before building; a waitlist proves nothing.
  Write customer problems as sentences they use, not as features you build.

BAD:
  "I launched Sravni Taxi in 2 weeks" (story, not rule)
  "It's important to launch early" (vague, hedge)
  "Launch early (this is what Paul Graham says)" (attribution, not rule)

MESSAGES (numbered for your reference, but do not reference numbers in output):
{messages}

OUTPUT: rules only, one per line. Nothing else.
"""


REDUCE_PROMPT = """\
You are maintaining a canonical markdown file of distilled startup rules
(startup-wisdom.md). A new extraction run has produced raw rules. Merge them
into the existing file and output the COMPLETE updated file.

CRITICAL: Your output must BE the new file contents — not a description of
the file, not a summary of what you changed, not a count of rules. Literally
emit the markdown that should be written to disk, starting with `# Startup
Wisdom` on the first line.

EXISTING startup-wisdom.md (current canonical state):
----8<----
{existing}
----8<----

NEW raw rules from this run (unordered, possibly with duplicates and overlap
with existing):
----8<----
{new_rules}
----8<----

MERGE LOGIC:
- If a new rule duplicates an existing one, drop the new one.
- If a new rule sharpens an existing one, replace with the crisper phrasing.
- If a new rule is genuinely novel, add it to the right category.
- Dedupe aggressively across the whole file — rules saying the same thing
  in different words must be merged to one.

STRUCTURAL CAPS:
- Total rules: target ~100, hard maximum 120.
- Categories: 6-8, chosen from this starting set (add one only if genuinely
  needed): Idea Selection, Validation, Product, Go-to-Market, Unit Economics,
  Fundraising, Team, Ops, Founder Mindset.
- Rules per category: max ~15. When over, drop the weakest in-category rule
  before adding a new one.

FORMAT PER RULE:
- One line. <=180 chars. Imperative voice. English.
- No war stories, examples, specific names, prices, hedges, or attribution.

OUTPUT FORMAT — emit a markdown file with exactly this shape. The first
character of your entire response must be `#`. Do not wrap in code fences.
Do not add a preamble ("Here is the updated file:") or postamble ("I merged
X rules into Y categories").

Use this literal intro sentence (word-for-word — it is part of the file,
not a meta-description of it):

> Distilled rules of thumb for building, launching, and growing startups, compiled from founder long-form writing.

Concrete example of the shape (content shown is illustrative; use the
actual rules from the input):

# Startup Wisdom

Distilled rules of thumb for building, launching, and growing startups, compiled from founder long-form writing.

## Idea Selection
- Work only on problems you understand at least as well as your customers.
- Reject ideas with no competitors; an empty market usually means no demand.
- Combine two proven things in a new form rather than inventing from scratch.

## Validation
- Talk to ten paying-intent customers before writing a line of code.
- Validate payment willingness via a real checkout, not a waitlist signup.
- Define the avatar, their workaround, and what they pay for it today.

(continue with the remaining categories you chose)

End of output — no summary, no sign-off, no "I hope this helps". The last
line of the file is the last bullet of the last category.
"""
