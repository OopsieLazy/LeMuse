# What makes an app feel complete and loved, not just functional

Scope: craft, emotional and product factors that separate finished-feeling apps from working ones. Written for
LeMuse (Windows, Tauri + React; streams topic reference images as a slideshow for artists; solo maker).
Research date 2026-11-19. Primary sources preferred; secondary summaries are flagged as such.

## 1. Product-design theory: emotion levels, delighters, the "last 10%", and the job behind the feature

### Takeaway
Theory agrees on one point: delight sits on top of a stack and only counts when the lower layers hold. The stack
is functional, reliable, usable, then pleasurable (Walter), or visceral, behavioural, then reflective (Norman).
The "something is missing" feeling usually shows that the top layer is absent: nothing in the app speaks to who
the user is or what they're trying to become (reflective, JTBD, Sierra). It seldom means a missing feature.

### Cited Findings
- Norman's three levels. **Visceral** is "that initial impact, to its appearance". **Behavioural** is "look and feel — the total experience of using a product". **Reflective** is "the message it tells others about the owner's taste". — [Norman, jnd.org](https://jnd.org/emotional-design/)
- Norman warns that beauty alone fails. An alarm clock rated high on the visceral and reflective levels had "an equally striking lack of usability" (a tester: "I can't even tell what time it is"). His diagnosis: "The crime is not lack of knowledge, it is lack of application, and in many cases, lack of concern." — [Norman, jnd.org](https://jnd.org/emotional-design/)
- NN/g teaches the three levels as how people react to UX. — [NN/g video](https://www.nngroup.com/videos/3-levels-emotional-processing/); [NN/g book page](https://www.nngroup.com/books/emotional-design/)
- Aesthetic-Usability Effect: attractive designs tend to be perceived as easier to use. — [Laws of UX](https://lawsofux.com/)
- Walter's hierarchy of user needs (*Designing for Emotion*, A Book Apart, 2011) remaps Maslow as functional, reliable, usable, pleasurable. The higher tiers depend on the lower ones being met. The pleasurable layer is "often missing in most products". These are secondary summaries; the book itself wasn't read. — [vasilis.nl comparison](https://vasilis.nl/research/2018/02/a-comparison-of-three-pyramids/); [uxdesign.cc review](https://uxdesign.cc/designing-for-emotion-a-book-review-9b73d81be97d); [Creative Bloq interview](https://www.creativebloq.com/netmag/aarron-walter-designing-emotion-10116711)
- Kano drift: features move over time from delighter to performance to must-have, because competitors copy them. Example: fingerprint sensors, a delighter in 2013 and a must-have by 2020. Some features stay delighters if they keep exceeding expectations. These are practitioner sources, not Kano's original paper. — [Launchrock](https://www.launchrock.com/library/expert-advice/kano-model); [iSixSigma](https://www.isixsigma.com/dictionary/kano-analysis-customer-needs-are-ever-changing/); [Kano category drift](https://kanosurveys.com/articles/kano-category-drift)
- Jobs-to-be-done: a "job" is the progress a person is trying to make in a particular circumstance. People "hire" products and "fire" them when they do a poor job, and the job changes with the circumstance. — [Christensen Institute](https://www.christenseninstitute.org/jobs-to-be-done/); milkshake case: [HBS Working Knowledge](https://www.library.hbs.edu/working-knowledge/clay-christensens-milkshake-marketing)
- Sierra (*Badass: Making Users Awesome*): users don't want to be badass at the app; they want to be badass at what they do with it ("no one wants to be killer at Final Cut Pro; they want to be killer at making videos"). She says to help users *be* better, not just *feel* better, and to compete on "user awesome, not app awesome". Word of mouth is a side-effect. — [Business of Software talk](https://businessofsoftware.org/2012/11/kathy-sierra-building-the-minimum-badass-user/); [Swizec summary](https://swizec.com/blog/what-i-learned-from-kathy-sierras-badass/); [Hooks summary](https://joelhooks.com/badass-making-users-awesome-by-kathy-sierra)
- The polish literature: the "last 10%" (bug fixing, polish, content, endless tweaking) "transforms a functional prototype into a compelling experience" and often "explodes into 50%". One indie developer, citing the "90/90 rule": "the last 90% of polish IS the app." The counter-warning: endless micro-tweaking that "99% of your users will never notice" is a trap. — [Wayline](https://www.wayline.io/blog/rpg-90-percent-done-syndrome); [ITNext: How much does it take to finish an app](https://itnext.io/how-much-does-it-take-to-finish-an-app-309466fa599b); [Product Hunt discussion](https://www.producthunt.com/p/general/why-does-90-completed-work-feel-like-the-hardest-milestone-to-cross)
- Linear's "Quality Wednesdays": each engineer ships one small polish fix a week, usually ≤30 min, tracked with a "quality" label. That came to more than 1,000 fixes in about two years. Examples: standardising the sizes of adjacent buttons, stopping the composer's height from jumping, and a hover that should fade over 150 ms instead of snapping. Quotes: "Most of these fixes are small on their own, but together they completely change how the product feels." "It's hard to perceive subtle problems with a UI you yourself have built." Quality has to be "a habit, like brushing your teeth." — [Linear blog](https://linear.app/blog/quality-wednesdays)
- Saarinen (Linear): quality doesn't mean perfection. Build part of a product and do that part well, then gather feedback, and treat the spec as a baseline rather than the finish line. — [Figma blog, 10 rules](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/)
- 37signals, *Getting Real*: "Build half a product, not a half-assed product" (the secret is saying no). "Epicenter design" means starting from the one thing the product must do exceptionally well. The epicenter wording comes from summaries, so check it against the free book. — [37signals podcast](https://37signals.com/podcast/build-half-a-product-not-a-half-assed-project/); book free at gettingreal.37signals.com
- Apple's WWDC19 "Designing Award Winning Apps and Games" names these qualities: innovation; fitting into real life ("Non-disruptive: provide value without getting in the way"); trust ("the user can see, can cause and effect"); refinement ("Take your time", "Don't be afraid to throw things away"); aesthetics ("show only what matters"); inclusion; and attention to detail. — [WWDC Notes, session 802](https://wwdcnotes.com/documentation/wwdc19-802-designing-award-winning-apps-and-games/)
- The 2026 Apple Design Award categories are Delight and Fun, Inclusivity, Innovation, Interaction, Social Impact, and Visuals and Graphics. Delight and Fun winners provide "memorable, engaging, and satisfying experiences". — [Gadget Hacks, 2026 winners](https://apple.gadgethacks.com/news/2026-apple-design-awards-winners-complete-list-across-6-categories/); [MacStories](https://www.macstories.net/?p=197364)

### Inferences
- For LeMuse, the feature is "slideshow of images on a topic". The job behind it is roughly: "I sit down to draw, and I want to be warmed up, inspired and actually practising within a minute, without falling into a Pinterest hole." In Sierra's terms, the user wants to become a better draughtsperson, not a better LeMuse user. An app that ends at "images appear" leaves the job unfinished. That is a likely source of "something is missing".
- Mapped to Walter: the functional and reliable layers (sync, streaming, error codes, offline states) are well built per recent PRs. The gap is likely in usable (flow, defaults) and pleasurable (a moment that feels made for artists).
- Mapped to Norman: visceral = the first frame and the icon; behavioural = how a slide change, pause or save feels; reflective = "I'm someone who practises daily from real museum art." That last one is LeMuse's strongest story: real art, free, ethical sourcing, attribution.
- Kano implies that delighters must be renewed. A clean image viewer is a must-have, not a delighter, in 2026.
- A Linear-style weekly "quality" label is a cheap ritual a solo maker could copy. It also answers Linear's own point that you can't easily see flaws in a UI you built, which argues for periodic fresh-eyes reviews (owner tests, recorded sessions).

### Gaps
- I didn't read Kano's original 1984 paper ("Attractive quality and must-be quality") or Walter's book directly; the claims rest on summaries.
- Apple's official per-category judging criteria for Interaction weren't retrieved.
- Saarinen's "Why is quality so rare?" essay body wasn't retrieved.

## 2. First run and onboarding: the first five minutes, empty states, sample content, aha moment, progressive disclosure

### Takeaway
The first run should deliver the core value before any setup: get people into the experience fast, with good
defaults or sample content. Every empty or loading state must say what is happening, why, and what to do next.
A false "nothing here" while data is still loading actively harms trust. Advanced options should stay hidden
until wanted.

### Cited Findings
- NN/g (Kaplan, 2021) gives three guidelines for empty states. (1) They communicate system status: "Totally empty states cause confusion about how and whether the system is working", and a "No records" placeholder shown while content is still loading is "particularly harmful". (2) They give learning cues and contextual help; example: "Star your favorites to list them here." (3) They offer direct pathways: link to the step, or offer demo data to explore safely (Loggly). — [NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)
- A good empty state answers: what is happening, why, and what the user can do next. — [UX Planet](https://uxplanet.org/empty-state-design-a-practical-guide-94ad0adbda45)
- Each empty state must have a message; a call to action and an illustration are optional. — [Salesforce Lightning Design System](https://spring-20.lightningdesignsystem.com/guidelines/empty-state)
- Progressive disclosure: defer advanced or rarely used features to a secondary screen, which makes apps easier to learn and less error-prone. Multiple levels are fine. In the "training wheels" research, users who started with a limited core later did better on advanced tasks. — [NN/g, progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/); [NN/g, training wheels](https://www.nngroup.com/articles/training-wheels-user-interface/)
- Paradox of the Active User: people skip manuals and start using software right away. — [Laws of UX](https://lawsofux.com/)
- Arc's onboarding, from secondary analyses (the product has been in maintenance mode since 2025). The team treated first run as an "unboxing" that "sets the tone", drawing on game design. It sets sensible defaults throughout, lets people personalise colour to build ownership, uses low-commitment framing ("try for one week" rather than "make default"), and lets people feel a benefit inside onboarding (toggling ads). — [Inverse interview](https://www.inverse.com/input/design/the-browser-company-arc-design-interview); [Built for Mars](https://builtformars.com/company/arc); [Onboard Me](https://onboardme.substack.com/p/how-arc-browser-introduces-ai-max-feature)
- Apple HIG has an onboarding page, but its text wasn't retrievable (page rendered empty). — [Apple HIG Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)

### Inferences
- LeMuse checklist for the first five minutes:
  1. A launch with zero configuration plays a beautiful starter topic within seconds. The 15 starter topics plus museum keyword search make this possible: no token or channel needed to see value.
  2. First frame: a large, well-chosen image with attribution. The aha moment is probably "this is real, high-quality art on exactly my subject, and it just flows."
  3. While the first refresh fills, show images streaming in or a "Fetching your first topics from the Cleveland Museum…" progress line, never "No slides". This matches NN/g guideline 1 and the earlier LeMuse fix "show images while a first refresh fills an empty library".
  4. Empty states teach: an empty Saved view says "Press S (or ♥) on any image to save it here", with a button back to the slideshow.
  5. Are.na token, channels and Find channels stay behind progressive disclosure. They're power features, not first-run steps.
  6. One gentle choice at first run, such as "What are you drawing today?" with 3–5 topic chips, gives Arc-style ownership without a form.
- "Demo data" maps neatly to LeMuse: the starter topics are the demo data.

### Gaps
- No primary-source data on "aha moment" timing benchmarks (for example, minutes to value) from a reliable source was retrieved. Popular growth-blog claims (Facebook's "7 friends in 10 days") were deliberately not used because I couldn't verify them.
- The full text of Apple HIG and Microsoft onboarding guidance couldn't be fetched.

## 3. Identity: point of view, name, voice and microcopy, icon, a signature interaction (indie craft examples)

### Takeaway
Craft apps are loved for a clear opinion executed consistently. Halide's features weren't unique; its design was.
Identity lives in a constant voice (with tone that adapts to the moment), deliberate limits, and one or two
signature interactions that become muscle memory.

### Cited Findings
- Halide (Lux) set out to "blend the simplicity of the built-in Camera app… with the flexibility and power of a professional camera". It uses gestures that "become muscle-memory over time — like dials on a camera" and strikes "a balance between conventional and clever". — [Lux, Introducing Halide](https://www.lux.camera/introducing-halide/)
- Daring Fireball on Halide: none of its features are unique; what sets it apart is design. The built-in app is a little too simple, while pro apps feel like an airplane cockpit. — [Daring Fireball](https://daringfireball.net/2017/05/halide)
- Lux on limits: limits on features can help make an app easy to understand. With Halide Mark III, Lux kept the older UI available because a new UI can feel disruptive. — [Lux, Spectre retrospective, Part 2: Design](https://lux.camera/a-spectre-retrospective-part-2-design/); [The App Whisperer on Mark III](https://theappwhisperer.com/2026/05/halide-mark-iii-and-why-photographers-still-need-to-make-decisions/)
- Flighty starts from a point of view: travel is stressful, so design must reduce cognitive load. It puts the most important information first, uses progressive disclosure for details, and borrows its visual language from airport departure boards. This is a third-party analysis. Apple's ADA citation praised "intuitive interfaces and effortless controls that are perfectly tailored" for travel. — [Blake Crosley, Flighty guide](https://blakecrosley.com/guides/design/flighty); [Travel Daily News](https://www.traveldailynews.com/technology/flighty-wins-apple-design-award/)
- Cultured Code (Things) describes itself as passionate about "productivity, simplicity, and beautiful design", with Things as the "combination of these three interests into one fine product". The company is a small team of about 12. — [Cultured Code About](https://culturedcode.com/about/)
- Mailchimp style guide: "Our voice doesn't change much from day to day, but our tone changes all the time." The voice is human, familiar, friendly and straightforward. "We have a sense of humor, but we value clarity over entertainment." "You wouldn't want to use the same tone of voice with someone who's scared or upset as you would with someone who's laughing." — [Mailchimp Voice and Tone](https://styleguide.mailchimp.com/voice-and-tone/); [TL;DR](https://styleguide.mailchimp.com/tldr/)
- Von Restorff effect: the item that differs from similar items is the one most likely to be remembered. Jakob's Law: users expect your app to work like the others they know. Both bear on signature-vs-convention trade-offs. — [Laws of UX](https://lawsofux.com/)

### Inferences
- LeMuse needs a stated opinion. A candidate: "Real art, not algorithmic feeds. Slow looking, then drawing. Always credit the artist." It already does ethical sourcing and attribution; making that visible (About, first run, README) turns plumbing into identity.
- Signature-interaction candidates (pick one and polish it hard):
  - a timed gesture-drawing mode with a quiet countdown ring (30 s / 1 / 2 / 5 min), a standard artist ritual;
  - one key to "hold" an image for a long study;
  - an end-of-session contact sheet of what you looked at.
- Voice: one voice everywhere (calm, studio-like, knowledgeable about art). Tone changes: an error tone ("Cleveland's servers didn't answer. Your saved images still work offline.") versus a success tone. Copy should credit artists by name.
- Halide's lesson for a solo dev: the features can be ordinary, but the design is the product. Limits are a feature; state them.
- The icon and the name "LeMuse" are an asset. The muse metaphor suggests inspiration arriving, which first-run copy and the icon could echo.

### Gaps
- No primary sources were retrieved for Linear's, Arc's, Panic's, iA Writer's, Tot's, Raycast's or Obsidian's identity or design philosophy. They're widely cited as craft exemplars, but nothing here is quoted about them beyond what's cited above.
- No research was found that measures the effect of icons or brand on retention for indie desktop apps.

## 4. Feel: motion, responsiveness budgets, sound, keyboard, undo, state persistence, typography

### Takeaway
"Feel" is engineered with numbers. Feedback within 0.1 s feels direct. Within 1 s it keeps flow. Past 10 s it
loses attention and needs a percent-done indicator and a way to cancel. Motion should connect states, stay brief
(about 83–333 ms on Windows) and be consistent. Destructive actions should get undo rather than warnings. The
cumulative small fixes are what change how a product feels.

### Cited Findings
- Response limits (Nielsen 1993, from Miller 1968 and Card et al. 1991):
  - At **0.1 s** the system feels like it is reacting instantaneously, so the user feels like the cause of the result. Selection feedback should land within this limit.
  - Up to **1 s**, the user's flow of thought holds. Past 1 s, show that the system is working.
  - At **10 s**, attention is lost. Show a percent-done indicator and a clear way to interrupt.
  - For unknown durations, show running progress such as item names; a spinner is the last resort. Between 2 and 10 s, a busy cursor with a small changing counter often beats a full progress bar.

  — [NN/g, Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/)
- Doherty Threshold: productivity rises when system and user respond within about 400 ms. — [Laws of UX](https://lawsofux.com/)
- Microsoft's Windows motion principles: Connected, Consistent, Responsive, Delightful ("unexpected moments of joy with purpose… always brief and fleeting"), and Resourceful (reuse OS behaviours and avoid custom animations where possible). Timing tokens:
  - direct entrance: 167 / 250 / 333 ms, cubic-bezier(0,0,0,1);
  - point-to-point: 167–333 ms, cubic-bezier(0.55,0.55,0,1);
  - exit: 167 ms, always combined with a fade;
  - fade only: 83 ms, linear.

  "Windows motion is fast, direct, and context-appropriate." — [Microsoft Learn, Motion in Windows](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/motion)
- Fluent 2 motion guidance. — [Fluent 2 Motion](https://fluent2.microsoft.design/motion)
- Linear's polish fixes are mostly feel issues: a layout that jumps, mismatched button sizes, a hover that should fade over 150 ms. — [Linear blog](https://linear.app/blog/quality-wednesdays)
- Raskin, "Never Use a Warning When you Mean Undo" (A List Apart, 2007): warnings don't prevent mistakes because people habitually click OK, so let users undo instead. Greif adds that a warning doesn't help at all when you are deleting the *wrong* item. — [A List Apart](https://alistapart.com/article/neveruseawarning); [Sacha Greif](https://v3.sachagreif.com/undo/)
- Peak-End Rule: experiences are judged mainly by their most intense moment and their ending. Zeigarnik effect: interrupted tasks are remembered better. Goal-gradient: motivation rises near a goal. — [Laws of UX](https://lawsofux.com/)
- Calm technology (Case, after Weiser & Brown 1995): technology should "require the smallest possible amount of attention", communicate without taking the user out of their task, and create ambient awareness. These are guidelines, not hard rules. — [Case, Principles of Calm Technology](https://www.caseorganic.com/post/principles-of-calm-technology); [O'Reilly](https://oreilly.com/content/principles-calm-technology-we-are-not-bad-at-technology-technology-is-bad-at-us)

### Inferences
- LeMuse feel checklist:
  1. Next/previous respond in ≤100 ms even when the next image isn't loaded. Show the blurred or low-res placeholder or the caption at once, then fade the image in over about 167–250 ms. Preload ≤2 (already a rule) keeps this honest.
  2. Crossfade between slides with a single consistent easing. Respect `prefers-reduced-motion` by switching to an 83 ms fade or none.
  3. Any refresh longer than 1 s shows a quiet working state; longer than 10 s shows named progress ("Cleveland: 'hands' — 3 of 15 topics") and a Cancel.
  4. Keyboard-first: Space pause, ←/→, S save, F fullscreen, H hide UI, T timer, ? shortcut sheet. A visible shortcut sheet is a classic "finished" signal.
  5. Undo instead of confirm, for example "Removed from Saved — Undo" as a toast. Unlinking a saved file must be undoable or use the Recycle Bin.
  6. Remember everything: last topic, position in the stream, window size and monitor, fullscreen state, timer length. "It remembers where I was" is a cheap, high-value feel.
  7. Peak-end design: give a session a satisfying ending (for example "Session done: 24 images, 18 minutes" with the images as a grid), because endings dominate memory.
  8. Calm: no badges or nags, and UI chrome that fades away while the user is drawing.
- Sound: optional, off by default, for example a soft chime when a timed pose ends. That fits the gesture-drawing ritual; there's no evidence base cited here.

### Gaps
- No primary research on sound design or haptics for desktop productivity apps was retrieved (haptics are largely irrelevant on Windows desktop).
- No retrieved source gives typography or spacing standards specific to image-viewer apps; Fluent 2 typography guidance wasn't fetched.

## 5. Ritual and return: why people come back without dark patterns; the streak debate

### Takeaway
People return when the app fits into a real routine and shows progress they value. Streaks measurably increase
engagement while intact, but a break suppresses later engagement unless the streak can be repaired. Critics
document loss-aversion anxiety. The ethical pattern is a visible, forgiving progress log tied to the user's goal,
with no punishment for missing a day.

### Cited Findings
- Silverman & Barasch, "On or Off Track: How (Broken) Streaks Affect Consumer Decisions", *Journal of Consumer Research* 49(6), 2023, DOI 10.1093/jcr/ucac029. Across seven studies, intact streaks highlighted in a behavioural log increase later engagement relative to broken ones. This is independent of actual past behaviour. The effect is amplified when people blame themselves for the break and weakened when the streak can be "repaired". People who broke a streak tended to switch to a new activity, such as a new language, rather than rebuild. One reported figure: about 66% vs 58% chose another exercise when the streak was intact vs broken. (Secondary coverage; I didn't read the full paper.) — [CU Boulder](https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions); [Psychology Today](https://www.psychologytoday.com/us/blog/ulterior-motives/202306/how-broken-streaks-sap-motivation); [UD repository](https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb)
- Critique: streak motivation shifts from accomplishment to loss-avoidance at around 30 days, and monetising streak anxiety erodes trust. This is opinion from a gamification analyst. — [Yu-kai Chou](https://yukaichou.com/gamification-analysis/streak-design-gamification-motivation-burnout/); also [ustwo, "wellness apps are not helping you but hacking you"](https://ustwo.com/blog/time-to-dispel-the-habit-myth-wellness-apps-are-not-helping-you-but-hacking-you/)
- Defence: effective streak systems build in recovery (freezes, flexible rules, grace periods). Duolingo reportedly loosened its streak rules and found "Weekend Amulets" raised week-later return by 4%. This is secondary, unverified company data. — [UX Mag](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design); [Desirability Lab](https://desirabilitylab.com/backfill/backfill-2023-154-duolingo-streak-design)
- Apple's award-winning qualities include "fitting into real life… provide value without getting in the way". — [WWDC Notes 802](https://wwdcnotes.com/documentation/wwdc19-802-designing-award-winning-apps-and-games/)
- Goal-gradient effect (motivation rises as the goal nears) and Zeigarnik effect (unfinished tasks stay in mind). — [Laws of UX](https://lawsofux.com/)
- Calm technology: attention is the scarce resource. — [O'Reilly / Case](https://oreilly.com/content/principles-calm-technology-we-are-not-bad-at-technology-technology-is-bad-at-us)

### Inferences
- LeMuse's natural ritual is a drawing session. Return loops that respect users:
  - **Session log / sketchbook calendar:** days practised, minutes, topics. Show it as a log ("You've drawn on 12 days this month"), not a fragile streak. If a streak is shown, make it forgiving (weekly goals, rest days) per Silverman & Barasch's repair finding.
  - **Review and reflection:** "This week you studied 140 hands from 9 artists." A contact sheet of saved images per session turns passive viewing into visible progress (Sierra: users get better).
  - **Fresh content as the hook:** the weekly museum refresh and new Are.na blocks give a pull reason that is real, not manufactured. Surface "12 new images in Hands since last week" on launch.
  - **Gentle continuation (Zeigarnik):** "Resume 'Drapery' — 40 left in this set."
  - **Sharing:** export a session board or an image with attribution as text. This needs to be checked against ADR-0004 licensing and the source terms before building.
- No notifications by default; at most an opt-in daily reminder. Fits calm tech and the owner's security and privacy stance.

### Gaps
- I couldn't verify the full Silverman & Barasch paper text or its effect sizes; the figures are from secondary coverage.
- No rigorous study directly measuring streak-induced anxiety was found; the critiques are opinion pieces.
- No sources were retrieved on retention patterns specific to creative-practice apps (drawing or reference tools).

## 6. The "finished" layer, and why solo developers' apps feel incomplete

### Takeaway
Finished-feeling apps complete the loop around the core feature: they explain themselves, admit their limits,
tell a story of why they exist, and close the user's journey (start → do the job → see the outcome). Solo apps
often feel incomplete because they stop at "it works": no narrative, no end state, no outcome shown to the user,
and nobody else looking at the polish.

### Cited Findings
- The last stretch of bug fixing, polish and content is what turns a prototype into a compelling experience. Rushed releases "ship a prototype". — [ITNext](https://itnext.io/how-much-does-it-take-to-finish-an-app-309466fa599b); [Wayline](https://www.wayline.io/blog/rpg-90-percent-done-syndrome)
- The counterpoint: premature or endless polish can be a trap, and "shiny ≠ finished". — [Wayline, Shiny ≠ Finished](https://www.wayline.io/blog/shiny-not-finished-premature-polish); [Product Hunt](https://www.producthunt.com/p/general/why-does-90-completed-work-feel-like-the-hardest-milestone-to-cross)
- "It's hard to perceive subtle problems with a UI you yourself have built." This is a structural risk for solo developers. — [Linear blog](https://linear.app/blog/quality-wednesdays)
- "Build half a product, not a half-assed product." Focus on the epicenter and say no. — [37signals](https://37signals.com/podcast/build-half-a-product-not-a-half-assed-project/)
- Users hire a product for progress in a circumstance. If the product doesn't deliver that progress, they fire it. — [Christensen Institute](https://www.christenseninstitute.org/jobs-to-be-done/)
- Sierra: word of mouth is a side-effect of making users better at the thing they care about. — [Business of Software](https://businessofsoftware.org/2012/11/kathy-sierra-building-the-minimum-badass-user/)
- Trust (cause and effect visible, user in control) and refinement ("Take your time", throw things away) are Apple's award qualities. — [WWDC Notes 802](https://wwdcnotes.com/documentation/wwdc19-802-designing-award-winning-apps-and-games/)
- NN/g: inaccurate status messages are "particularly harmful". — [NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)

### Inferences
- **Why LeMuse may feel "something is missing"** (diagnosis against the cited theory):
  1. *Feature-first, not job-first.* It streams images, but the drawing job (warm up, practise, see improvement) has no beginning, middle or end in the UI.
  2. *No end-to-end loop.* There's an open-ended stream but no session end, summary or record of the practice.
  3. *No visible outcome.* Saves land in folders, but nothing reflects back "what I learned or made".
  4. *No narrative.* Users can't see why the app exists (free, ethical, real museum art, attribution first).
  5. *Too few outside eyes.* The owner built it, so per Linear the owner can't see the subtle flaws. Schedule fresh-eyes sessions.
- **"Finished layer" checklist for LeMuse** (each item is small; together they read as complete):
  - About window: version, the one-paragraph story of why it exists, credits to the museums and Are.na, MIT licence, links to the website and issues.
  - Help: a shortcut sheet (`?`), a "How LeMuse finds images" explainer covering sources and why AIC is held back, and a privacy note (InPrivate WebView, nothing stored unless saved).
  - Settings with sensible defaults, grouped and progressively disclosed (Basics / Sources / Advanced), each with one-line explanations.
  - Updates: an in-app "What's new" after an update, with human-written release notes in the app's voice, plus a CHANGELOG.
  - Error pages with stable codes (already shipped in PR 0019), human copy and a next step.
  - Website or landing page and README: a hero line stating the opinion, a GIF or video of the signature interaction (in line with the no-images-in-repo rule, host it externally or use placeholders), and download, story, sources and licence sections.
  - Community: GitHub Discussions or Issues templates ("Suggest a topic", "Suggest an Are.na channel"). A topic-suggestion loop fits the curated-channel model in ADR-0008.
  - Session closure: an end-of-session summary (Peak-End rule) and a saved-session board.
- Process suggestion: adopt a "quality" label and a weekly 30-minute polish slot (the Linear pattern), plus a running list of "things that feel off" collected by the owner while using the app for real drawing sessions.

### Gaps
- I found no rigorous, primary postmortems specifically on solo developers' "it works but feels empty" problem. The sources are indie essays and community threads (Wayline is a content-marketing blog for game developers). The diagnosis above is inference from theory, not measured evidence.
- No sources were retrieved on release-notes quality, About pages or README effects on adoption; the checklist items are practice-based inference.
- Panic, Raycast and Obsidian community or changelog practices weren't researched (call budget).
