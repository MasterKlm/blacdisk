# 🚀 Stop Burning Through Claude Code Tokens and Usage too quickly

> **The Blacdisk CLI sits between your code and Claude**, using battle-tested and experimental techniques like code-to-image context, filepath context compression, read tool limiting, and a caveman-style skill to **shrink input tokens up to 80%** and **save up to 60% on output tokens**. All in one tool.

**📖 Docs:** [blacdisk.com/docs/intro](https://www.blacdisk.com/docs/intro)

<p align="center">
  <img src="https://www.blacdisk.com/blacdisklogotext.png" alt="Blacdisk Logo" width="400"/>
</p>

---

## 🤔 Why Even Use This?

### The Problem

Hitting Claude limits **sucks**. Waiting 5 hours for a reset? **Sucks more.** Buying extra API credits? **Painful.**

Most open-source tools, skills, and plugins out there (with the exception of [pxpipe](https://github.com/teamchong/pxpipe)) only save tokens on **tool calls** or **output tokens**. They dodge the real long-term issue: **the code itself**.

Skills like [caveman](https://github.com/JuliusBrussee/caveman) slash output tokens massively, but unlike output, you can't just rip out variables or mangle code to save tokens without losing the original intent and confusing the model.

**That's the exact problem Blacdisk was born to solve.**

If code tokens can be reduced *and* passed consistently through context, you get an immediate token-saving solution and a fix for those disgusting, token-devouring Claude Code sessions.

> 💡 **Inspired by [Pxpipe](https://github.com/teamchong/pxpipe)**, which shrinks code input tokens by converting code into text-dense images at optimized dimensions. Major models use fewer tokens processing images than processing large codebases as text.

Blacdisk takes that code-to-image approach, adds a few experimental tricks, and packs it all into **one CLI**.

**Result: code input tokens reduced up to 80% in production.**

But wait there's more. Blacdisk is an **all-in-one** tool that combines the best compatible token-saving techniques:

- 🖼️ **Code-to-image** conversion
- 🗿 **Yapper** — a caveman-like skill for output savings
- 🔧 **Various undisclosed methods** (some secrets stay secret)

---

## ⚙️ How It Works

Here's the Blacdisk pipeline, from prompt to Claude Code:

```
┌─────────────────────────────────────────────┐
│  1. Blacdisk requests a prompt from you     │
└─────────────────────┬───────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────┐
│  2. Sends request to cheaper models to      │
│     select files relevant to your prompt    │
└─────────────────────┬───────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────┐
│  3. Sends relevant files to the Blacdisk    │
│     core engine → picks optimal token-      │
│     saving techniques → runs the reduction  │
└─────────────────────┬───────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────┐
│  4. You select the Claude model             │
└─────────────────────┬───────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────┐
│  5. Blacdisk opens Claude Code, prefilled   │
│     with your prompt, the yapper skill,     │
│     and token-handling instructions         │
└─────────────────────┬───────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────┐
│  6. Press Enter → optimized tokens go brrr  │
└─────────────────────────────────────────────┘
```

---

## 📊 The Numbers

| Project | Before | After | Saved | Prompt | Repo |
|---|---:|---:|---:|---|---|
| **UI Library in C** | 4.0k | 1.4k | 🟢 **64%** | Add a button rounding feature | [Repo](https://github.com/MasterKlm/crumbui) |
| **2D OpenGL C++ Game Engine** | 6.3k | 2.1k | 🟢 **67%** | A Circle Class to draw circles | [Repo](https://github.com/MasterKlm/starisk) |
| **Python Space Invader** | 6.6k | 1.8k | 🟢 **73%** | Add a teleporting gun... | [Repo](https://github.com/MasterKlm/spacehelm) |

> ⚠️ Results vary by workload. These are real repos of varying sizes, since workloads differ.

---

## 🗿 Yapper (The Caveman-Like Skill)

Yapper is essentially a **caveman clone**, most caveman functionality works right out of the box.

- ✅ Gets copied into your project's Claude skills on first run
- ✅ Added to every Blacdisk prompt for extra output token savings
- ✅ Zero configuration required

---

## 😬 The Bad News & Honest Thoughts

**This is not open source. It's a freemium product.**

But here's the thing, I'm committed to saving tokens. So the pricing is designed to **encourage project improvement and actually save you more tokens**.

### 💰 Pricing Philosophy

> **We only get paid if we save you tokens and money.**

- 🎁 **First 1 Million tokens saved = FREE**
- 💳 **No card required**
- 📉 **Price drops as we get more users and save more tokens**
- ✅**Output token savings are free**

Based on my testing as the creator, users can expect to save **~3,000–6,000 tokens per prompt** depending on workload. Burning through the free tier should take a while.

### ⚠️ Caveats

- Results vary by workload, no promise of consistent 80% savings, but expect **near-consistent 60–70%**
- **Fail-safe:** If Blacdisk calculates it can't save you tokens, it passes your prompt straight to Claude with only yapper attached, so you at least save some output tokens

---

## 🛠️ Simple Setup

### Installation

**Step 1 — Install Blacdisk**

Requires [Node.js](https://nodejs.org/en/download).

```bash
npm i -g blacdisk
```

**Step 2 — Grant Claude access (first time only)**

If you haven't given Claude access to your project, run Claude once and approve folder access. Don't have Claude Code? Blacdisk installs it automatically.

```bash
claude
```

Then restart Blacdisk to start saving.

**Step 3 — Run Blacdisk in your project**

```bash
cd /my-project
blacdisk claude
```

Login, keep prompting like usual, and we handle the rest. **Press Enter** to send your prompt and let Claude build without burning usage.

**Step 4 — Repeat for consistent savings**

Once Claude finishes your prompt, cancel Claude Code and run Blacdisk again for every new prompt.

```bash
blacdisk claude
```

---

## 💵 Pricing

Check out the [**Blacdisk pricing page**](https://www.blacdisk.com/pricing) for details.

> 🎉 **No card needed to get started.**

As we grow and save more tokens, **the price drops.**

---

## 🔢 Token Count

Blacdisk uses the **Anthropic token count API** to calculate tokens used for:

- 📊 Billing
- 📉 Token reduction
- 🖨️ Printing token counts in your console *before* passing the prompt to Claude

---

## 🤝 Join the Team

Want to discuss working on this and making AI cheaper to use?

📧 **Email:** [koketso@blacdisk.com](mailto:koketso@blacdisk.com)

---

<p align="center">
  <strong>Stop burning tokens. Start building.</strong><br/>
  <a href="https://www.blacdisk.com/docs/intro">📖 Docs</a> •
  <a href="https://www.blacdisk.com/pricing">💵 Pricing</a> •
  <a href="mailto:koketso@blacdisk.com">✉️ Contact</a>
</p>
