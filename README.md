# Stop burning Claude Code tokens and usage quickly

The Blacdisk CLI sits between your code and claude, uses proven and new techniques, such as code image context, filepath context compression, read tool limiting  to shrink input tokens up to 80% and a caveman-like skill to save up to 60% on output tokens. All in one tool.

Docs: https://www.blacdisk.com/docs/intro

![Blacdisk Logo](https://www.blacdisk.com/blacdisklogotext.png)

## 🤔Why Even Use This
### Why this exist

Really this exist because hitting claude limits quickly is annoying and waiting for 5hr resets or buying more api credits sucks.

**Blacdisk is essentially a token preprocessor that works with tokens, reducing them up to 80%
before sending them to claude code to do the actual coding.**

This project exist based off the fact that most open source tools, 
skills, plugins etc... That I have seen, with the exception of [pxpipe](https://github.com/teamchong/pxpipe), 
mainly save tokens by usually tool calls or output 
tokens. I think they avoid one of the main long term issue: the Code itself.

 
Skills like [caveman](https://github.com/JuliusBrussee/caveman) help reduce output
tokens massively but unlike output tokens you can't just remove variables, or massively modify code to save on tokens without loosing the original intention of the code and confusing the model.

This is the original problem that brought the idea of blacdisk to life. If code tokens can be reduced and passed consistently through the context it can be an immediate token saving solution and a fix for long claude code sessions consuming a disgusting amount of tokens thanks to the context window.

 This project was inspired by Pxpipe. [ Pxpipe](https://github.com/teamchong/pxpipe) is one tool I've found that seeks to shrink code input tokens by converting code into text dense images at a optimized dimension to save on tokens. Major models use less tokens processing images than large text in codebases.
This code-to-image solution and a few new ones that I've experimented with have been put into this one cli tool, Blacdisk. Reducing code input tokens up to 80% in this production package.

Although the core premise of Blacdisk is making your code use less
 input tokens, it goes beyond that. It is a all in one, simple to 
use tool, combining all the best and compatible token-saving 
techniques out there, including code-to-image, a caveman-like 
skills called yapper, and various others some not disclosed here. 

Here's how it works.

### How it works

Here's how the blacdisk pipeline looks like from prompt to claude code.
<div align="center">
Blacdisk client requests a prompt from the user

⬇️

client sends a request to cheaper models to select files relevant to the prompt.

⬇️

client then sends the relevant files with code to the blacdisk core engine to select the optimal token saving techniques to use. It then runs the processes to reduce code input tokens.

⬇️

User selects the claude model to open claude code with.

⬇️

The Blacdisk client then opens claude code and prefills with the users original prompt, a caveman-like skill and instructions on how to handle the token saving changes and establish rules to save tokens effectively.

⬇️

User presses enter to begin prompt with optimized tokens

</div>

## 📊 The Numbers 
| Project | Before (Code Input Tokens) | After | Saved | Prompt | Repo |
|---|---:|---:|---:|---|---|
| **UI Library in C** | 4.0k | 1.4k | **64%** | Add a button rounding feature | [**Repo**](https://github.com/MasterKlm/crumbui) |
| **2D OpenGL C++ Game Engine** | 6.3k | 2.1k | **67%** | A Circle Class to draw circles | [**Repo**](https://github.com/MasterKlm/starisk) |
| **Python Space Invader** | 6.6k | 1.8k | **73%** | Add a teleporting gun to let t... | [**Repo**](https://github.com/MasterKlm/spacehelm) |

These are repos of varying sizes and results may vary as a result when used since workloads are different.

## Yapper (Caveman-like skill)

This skill is essentially a yapper clone so most caveman functionality works out of the box. This skill gets copied into your project claude skills when Blacdisk is run for the first time. This skill get added for each prompt ran with Blacdisk to give you additional output token savings.

## The Bad news & Honest Thoughts
This is not opensource, this is a freemium product. I've spent 4 months and 10-15hr days coding this so I decided to make this an actual product. I am commited to saving tokens though so I wanted the pricing
 to encourage project improvement and actually saving users more
 tokens. That's why the pricing is based on how many tokens it
 saves you per request. We only get paid if we save you tokens
 and money. Good news is that the first 1 Million tokens saved
 are free. No card required. Based on my experience as the creator using it during
 testing, users can expect to save around 3000-6000 per prompt depending on the workload, so burning through the free tokens should take  a while.


**Here's some caveats**

As mentioned before workloads may differ and thus results, this does not promise consistent 80% savings but at least near consistent 60-70% savings.

**Fail-safe**: If the Blacdisk engine calculates that it can't save you any tokens and you would be better off using claude normally, it will just pass your prompt straight to claude with only yapper attach to the prompt to atleast save you some output tokens.


# Simple Setup
## Installation

**#1**

Copy, paste and run this command in your terminal to install Blacdisk. Requires Node on your PC: [**https://nodejs.org/en/download**](https://nodejs.org/en/download).

```bash
npm i -g blacdisk
```

**#2**

If you haven't given claude access to this project. Run Claude once and grant folder access. If you don't have Claude Code, Blacdisk installs it automatically. Just run `claude` in your terminal and approve access to claude code, then restart Blacdisk to start saving tokens.

```bash
claude
```

**#3**

Go to your project folder and run `blacdisk claude` in the terminal. Login and keep prompting like usual and we handle the rest. Press Enter to send the prompt and let Claude build without burning usage quickly.

```bash
cd /my-project
blacdisk claude
```

**#4**

Once Claude is done with the prompt you gave it, cancel Claude Code and run Blacdisk again to ensure consistent token savings for every prompt you make.

```bash
blacdisk claude
```

## Pricing
Check out the [Blacdisk pricing page](https://www.blacdisk.com/pricing) for details on pricing. No card needed to get started.
As we get more users and save more tokens, The price will drop.

## Token Count
Blacdisk uses the anthropic token count api to calculate tokens used, for billing, token reduction and prints them in the console before passing the prompt to claude.
## Join the Team
If you would like to discuss working on this and making ai cheaper to use. You can email me at koketso@blacdisk.com.
