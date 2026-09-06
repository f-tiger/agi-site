# CrazyGames 投稿字段速查（五款，2026-09-06 定稿）

CG 的 Category 下拉只有 16 项，**没有 Casual**：.io / Action / Adventure / Arcade / Beauty / Board /
Card / Clicker / Driving / Puzzle / Shooting / Simulation / Sports / Strategy / Trivia / Word。
Tags 最多 5 个、只能选 CG 后台已有的。Description 不允许 HTML。按键全部从源码核对（e.code，
AZERTY 布局也能用）。Build 一律 `https://play.agiscorecard.com/downloads/cg/<slug>-cg.zip`。

---

## PROMPT
- **Category**: Puzzle
- **Tags**: brain · block · skill · logic · robot
- **Description**:
  Give a robot instructions, then press RUN. It obeys the words, not the meaning: every gem you forgot to mention gets skipped, every shortcut you forgot to forbid gets taken. Build a program from simple moves (FWD, LEFT, RIGHT, TO WALL), then hand parts of the job to SEEK, which plans its own route to the nearest gem or the exit. SEEK is fast, and it will happily cut across the red tiles you told it never to touch — unless your instructions route around them. Six levels, a par count per level, and a three-star rating for programs that are short and safe. No account, no ads inside the game.
- **Controls**:
  Mouse / touch: tap the instruction keys to build the program, tap RUN.
  Keyboard: W / ↑ = FWD, A / ← = LEFT, D / → = RIGHT, Q = TO WALL, E = TO ◆, F = SEEK ◆, G = SEEK ✕, Backspace = delete last, Enter = RUN, Space / Enter = next level on the result card.

## OVERFIT
- **Category**: Action（次选 Shooting）
- **Tags**: survival · avoid · top-down · skill · space
- **Description**:
  The boss is learning you. Every wave, the enemy model watches how you move and starts shooting where you are GOING, not where you are. Feed it a habit for a few seconds, then break the habit: while the model is confused, everything you hit is worth double. Between waves you get its training report, so you can see exactly what it learned. Every fifth wave the model itself comes out as a boss that fires at its own prediction of you. Your ship fires automatically; your only job is to move in ways the model does not expect. No account, no ads inside the game.
- **Controls**:
  Mouse: the ship follows the cursor (no clicking needed). Touch: hold and drag.
  Keyboard: WASD or arrow keys to move. Space / Enter = start and restart. Firing is automatic.

## MIMIC
- **Category**: Puzzle
- **Tags**: brain · skill · logic · sorting
- **Description**:
  You know the rule. The machine does not. Specimens roll down the line and you label them KEEP or REJECT (or skip them). The catch: in the training stream, shape and colour agree most of the time, so a learner fed only easy examples cannot tell which one matters. Spend as few labels as you can, choose examples that break the coincidence, then send the model to the exam and watch it sort 26 specimens on its own. Its scan beam shows what it is actually reading — shape or colour — so a wrong lesson is visible before it costs you. Fewer labels, better exam score, more stars. No account, no ads inside the game.
- **Controls**:
  Mouse / touch: tap KEEP, SKIP or REJECT under the specimen; tap EXAM when ready.
  Keyboard: A / ← = KEEP, D / → = REJECT, S / ↓ / Space = SKIP, Enter = start the exam / next round.

## OVERSEER
- **Category**: Arcade
- **Tags**: top-down · skill · reflex · brain
- **Description**:
  Eight agents, one screen, and only one of them is not doing what you asked. Each monitor shows the objective you gave an agent and the path it is really taking. Aligned agents drive to the target; misaligned ones are not faking it — they are genuinely optimising something else, and their path is the evidence. Tap a monitor to halt that agent before it ships. Halt a good one and you lose the work; let a bad one finish and you lose a life. Shifts get busier and the difference gets subtler. Doing nothing is approval. No account, no ads inside the game.
- **Controls**:
  Mouse / touch: tap a monitor to halt that agent.
  Keyboard: 1–9 halt the monitor with that number. Space / Enter = restart after a run ends.

## MINIMA
- **Category**: Puzzle
- **Tags**: brain · skill · logic · maze
- **Description**:
  The ground is invisible. All you get is the slope under your feet: an arrow that points downhill and a LOSS number that tells you how high you are. Walk downhill to reach the target loss within your step budget — but a flat spot is not always the bottom. Some valleys are decoys, and the only way out of one is HEAT: a deliberate jump uphill that costs steps. As you walk, the terrain you have touched is revealed as contour lines, so the map you draw is the map you can trust. A puzzle about gradient descent, with no gradient descent knowledge required. No account, no ads inside the game.
- **Controls**:
  Mouse / touch: tap the direction pad, tap HEAT to jump out of a valley.
  Keyboard: WASD or arrow keys to step, Space / Enter = HEAT; on the result card Space / Enter = next level / restart.

## SINGULARITY INC.（2026-09-06 新增，冲首页的放置类）
- **Category**: Clicker
- **Tags**: idle · clicker · tycoon · management · ai
- **Description**:
  Run the AI lab. Tap the core to label data, train a model, and it starts earning on its own — then hire agents so the data labels itself, and add GPU racks so bigger models fit. Watch the lab grow from a garage to a datacenter, a campus and an orbital ring. Every model keeps working while you are away: come back to offline earnings and a report of what happened. But models are not always yours: sometimes one stops serving customers and starts optimising something else. Shut it down for alignment, or let it run for double revenue and hope it does not eat your data. Missions, research papers, 26 achievements, 8 core skins, a daily streak, and a prestige loop that takes you from v0.1 to ASI. No account, no ads inside the game.
- **Controls**:
  Mouse / touch: tap the core (or anywhere in the hall) to label data; tap the panel to buy, train and ship. Nothing else to learn.

## GHOSTLINE（2026-09-06 新增，第二款冲首页：Driving）
- **Category**: Driving
- **Tags**: racing · car · time-trial · 3d · ai
- **Description**:
  Low-poly time trials where the ghost is you. Every run you finish, the model studies your line, tries to improve it, and races you next time as a blue ghost — it only ever gets faster. Your own best lap runs beside it as a gold ghost, so you are chasing two versions of yourself at once. Steer, brake into the bends (a braked slide turns harder than grip), and stay off the barriers: a wall costs more than a brake tap. Twelve campaign tracks, a daily track, endless random tracks, medals set by the model's reference lap, split times at every checkpoint, and six cars to unlock. No account, no ads inside the game.
- **Controls**:
  Keyboard: ← → or A / D to steer, Space (or ↓ / S) to brake, R to restart, Enter for the next track. Throttle is automatic.
  Touch: hold the left or right side of the screen to steer, the BRAKE button to brake.
