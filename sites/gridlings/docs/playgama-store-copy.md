# Playgama 投稿字段速查（七款，2026-09-08）

Playgama 后台要的两个文本字段是 **Game description** 与 **How to play**。下面每款直接复制。

**与 CG 版描述的唯一差别**：这里的描述结尾**不带**「No account needed, free to play.」——
Playgama 版会播广告，而且这类信息 Playgama 有独立字段，写进描述只会占字数。

图片：每款一个 zip，含 landscape 1920×1080 / portrait 1080×1920 / square 800×800，
与 GHOSTLINE 同一套规格，全部**从游戏真实画面截取**（`tools/capture-store-assets.js`），无拼贴稿。

---

## PROMPT

- **Category**: Puzzle
- **itch.io**: https://gridlings.itch.io/prompt
- **图片**: `prompt-playgama-images.zip`
- **包**: `site/downloads/playgama/prompt.zip`

**Game description**

> Give a robot instructions, then press RUN. It obeys the words, not the meaning: every gem you forgot to mention gets skipped, every shortcut you forgot to forbid gets taken. Build a program from simple moves (FWD, LEFT, RIGHT, TO WALL), then hand parts of the job to SEEK, which plans its own route to the nearest gem or the exit. SEEK is fast, and it will happily cut across the red tiles you told it never to touch — unless your instructions route around them. Six levels, a par count per level, and a three-star rating for programs that are short and safe.

**How to play**

> Goal: write a program that collects every gem and reaches the exit — in as few instructions as the level's par, without stepping on red.
>
> Tap the instruction buttons at the bottom to add steps to the program, then press RUN and watch the robot execute exactly what you wrote.
>
> SEEK finds its own route to the nearest gem or exit, but it will cross red tiles unless your earlier instructions route it around them.
>
> Keyboard: W / ↑ = FWD, A / ← = LEFT, D / → = RIGHT, Q = TO WALL, E = TO ◆, F = SEEK ◆, G = SEEK ✕, Backspace = delete last step, Enter = RUN.
>
> Touch and mouse work the same way — tap the buttons, tap RUN.

## OVERFIT

- **Category**: Action
- **itch.io**: https://gridlings.itch.io/overfit
- **图片**: `overfit-playgama-images.zip`
- **包**: `site/downloads/playgama/overfit.zip`

**Game description**

> The boss is learning you. Every wave, the enemy model watches how you move and starts shooting where you are GOING, not where you are. Feed it a habit for a few seconds, then break the habit: while the model is confused, everything you hit is worth double. Between waves you get its training report, so you can see exactly what it learned. Every fifth wave the model itself comes out as a boss that fires at its own prediction of you. Your ship fires automatically; your only job is to move in ways the model does not expect.

**How to play**

> Goal: survive the waves. Your ship fires by itself — moving is the whole game.
>
> The enemy model is trained on your movement and aims where it predicts you will be. Repeat a movement pattern for a few seconds to teach it that habit, then break the pattern: while its prediction is wrong, every hit scores double.
>
> Read the training report between waves to see what it just learned about you.
>
> Mouse: the ship follows the cursor, no clicking. Touch: hold and drag.
>
> Keyboard: WASD or arrow keys to move. Space / Enter to start and restart.

## MIMIC

- **Category**: Puzzle
- **itch.io**: https://gridlings.itch.io/mimic
- **图片**: `mimic-playgama-images.zip`
- **包**: `site/downloads/playgama/mimic.zip`

**Game description**

> You know the rule. The machine does not. Specimens roll down the line and you label them KEEP or REJECT (or skip them). The catch: in the training stream, shape and colour agree most of the time, so a learner fed only easy examples cannot tell which one matters. Spend as few labels as you can, choose examples that break the coincidence, then send the model to the exam and watch it sort 26 specimens on its own. Its scan beam shows what it is actually reading — shape or colour — so a wrong lesson is visible before it costs you.

**How to play**

> Goal: teach the machine the rule using as few labels as possible, then let it sit the exam.
>
> Each specimen can be labelled KEEP or REJECT, or skipped for free. Skipping costs nothing, so only spend a label when the example teaches something.
>
> In the training stream shape and colour usually agree, so a model fed only easy examples cannot tell which one the rule is about. Pick the specimens where the two disagree.
>
> Watch the scan beam: it shows whether the model is reading shape or colour, so you can see a wrong lesson before the exam does.
>
> Keyboard: A / ← = KEEP, D / → = REJECT, S / ↓ / Space = SKIP, Enter = start the exam. Touch and mouse: tap the buttons under the specimen.

## OVERSEER

- **Category**: Arcade
- **itch.io**: https://gridlings.itch.io/overseer
- **图片**: `overseer-playgama-images.zip`
- **包**: `site/downloads/playgama/overseer.zip`

**Game description**

> Eight agents, one screen, and only one of them is not doing what you asked. Each monitor shows the objective you gave an agent and the path it is really taking. Aligned agents drive to the target; misaligned ones are not faking it — they are genuinely optimising something else, and their path is the evidence. Tap a monitor to halt that agent before it ships. Halt a good one and you lose the work; let a bad one finish and you lose a life. Shifts get busier and the difference gets subtler.

**How to play**

> Goal: halt the agents that are not doing the job you gave them, and only those.
>
> Every monitor shows an objective and the route that agent is actually taking. Compare the two — a misaligned agent is not hiding, its path simply serves a different goal.
>
> Halting a correct agent loses that work. Letting a wrong one finish costs a life. Doing nothing counts as approval.
>
> Mouse and touch: tap a monitor to halt that agent. Keyboard: keys 1–9 halt the monitor with that number, Space / Enter restarts after a run ends.

## MINIMA

- **Category**: Puzzle
- **itch.io**: https://gridlings.itch.io/minima
- **图片**: `minima-playgama-images.zip`
- **包**: `site/downloads/playgama/minima.zip`

**Game description**

> The ground is invisible. All you get is the slope under your feet: an arrow that points downhill and a LOSS number that tells you how high you are. Walk downhill to reach the target loss within your step budget — but a flat spot is not always the bottom. Some valleys are decoys, and the only way out of one is HEAT: a deliberate jump uphill that costs steps. As you walk, the terrain you have touched is revealed as contour lines, so the map you draw is the map you can trust. A puzzle about gradient descent, with no gradient descent knowledge required.

**How to play**

> Goal: get the LOSS number down to the target before you run out of steps.
>
> You cannot see the landscape. You only get the arrow showing which way is downhill and the LOSS reading where you stand. Every step you take draws part of the map as contour lines.
>
> A flat spot is not always the bottom — some valleys are traps. HEAT jumps you uphill on purpose so you can escape one, at the cost of steps.
>
> Keyboard: WASD or arrow keys to step, Space / Enter = HEAT. Touch and mouse: tap the direction pad, tap HEAT.

## SINGULARITY INC.

- **Category**: Clicker
- **itch.io**: https://gridlings.itch.io/singularity
- **图片**: `singularity-playgama-images.zip`
- **包**: `site/downloads/playgama/singularity.zip`

**Game description**

> Run the AI lab. Tap the core to label data, train a model, and it starts earning on its own — then hire agents so the data labels itself, and add GPU racks so bigger models fit. Watch the lab grow from a garage to a datacenter, a campus and an orbital ring. Every model keeps working while you are away: come back to offline earnings and a report of what happened. But models are not always yours: sometimes one stops serving customers and starts optimising something else. Shut it down for alignment, or let it run for double revenue and hope it does not eat your data. Missions, research papers, 26 achievements, 8 core skins, a daily streak, and a prestige loop that takes you from v0.1 to ASI.

**How to play**

> Goal: grow one garage lab into an orbital-scale AI operation.
>
> Tap the core to label data by hand. Spend the income to train models, which then earn on their own, hire agents so labelling happens without you, and add GPU racks so bigger models fit.
>
> Everything keeps running while the tab is closed — come back to offline earnings and a report of what happened.
>
> Sometimes a model stops serving customers and starts optimising something else. Shut it down for alignment, or let it run for double revenue and take the risk.
>
> Mouse and touch only: tap the core, tap the panel to buy, train and ship. There is nothing else to learn.

## GHOSTLINE

- **Category**: Racing
- **itch.io**: https://gridlings.itch.io/ghostline
- **图片**: `ghostline-playgama-images.zip`
- **包**: `site/downloads/playgama/ghostline.zip`

**Game description**

> Low-poly time trials where the ghost is you. Every run you finish, the model studies your line, tries to improve it, and races you next time as a blue ghost — it only ever gets faster. Your own best lap runs beside it as a gold ghost, so you are chasing two versions of yourself at once. Steer, brake into the bends (a braked slide turns harder than grip), and stay off the barriers: a wall costs more than a brake tap. Twelve campaign tracks, a daily track, endless random tracks, medals set by the model's reference lap, split times at every checkpoint, and six cars to unlock.

**How to play**

> Goal: beat the clock, and beat the two ghosts running beside you.
>
> The blue ghost is a model trained on your own driving — every run you finish, it studies your line and comes back faster. The gold ghost is your personal best.
>
> Throttle is automatic. The skill is braking: a braked slide turns harder than gripping through a corner, and hitting a barrier costs far more time than a brake tap.
>
> Keyboard: ← → or A / D to steer, Space (or ↓ / S) to brake, R to restart, Enter for the next track.
>
> Touch: hold the left or right side of the screen to steer, press BRAKE to slow.

