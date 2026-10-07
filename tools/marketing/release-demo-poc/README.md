# ProposalDeck release-demo POC

A bounded utility experiment: one existing product, its free native editable
PPTX export, one fixed 28-second template and one JSON narration interface.
This does not establish customers, demand, revenue or labor savings.

## Isolation

The workflow runs only on `codex/release-demo-poc-20261007`. It has contents-read
permission, no stored repository secrets, no OIDC, no schedule, no deployment,
no repository-writing step and a 25-minute timeout. It uses only fictional demo
input and existing public source. Videos, model weights and documents are never
committed. Public Actions artifacts expire after one day; code/logs/artifacts in
this public repository are not private.

The existing product modules and PPTX library are copied unchanged into a local
server after exact Git-blob checks against `source-lock.json`. Browser routing
allows only that loopback origin. Membership is an explicit local unavailable
fixture; there is no production API, account, analytics or cloud-save call.
A local isolation notice and cursor ring are added outside the product modules.

## Run

Requirements: Linux, Node22, Python3.11, FFmpeg, LibreOffice, Poppler, DejaVu fonts,
Playwright1.55.1/Chromium and the media packages in requirements.txt.
Primary package versions and official model/voice hashes are pinned. The first
resolved transitive environment is recorded using pip --report and pip-freeze;
this is not a fully pre-resolved dependency hash lock.

The CI-only setup_media.py retains publisher/installed license notices and
verifies runtime/model/voice hashes before inference. It refuses local downloads.
For local use, reuse an independently verified licensed installation and its
ready evidence; never fabricate a success receipt or bypass access restrictions.

Set POC_REPO_ROOT, KOKORO_MODEL_DIR and MEDIA_EVIDENCE_DIR to the verified local
source, model directory and license-evidence directory. Then run:

`python run.py demo.json --out out/current`

Output directories must be fresh. The run captures actual UI interactions,
downloads a PPTX, inspects its native text/notes/package, opens it in LibreOffice,
synthesizes English narration and original music, writes synchronized captions,
and renders 1280×720 and720×1280 MP4s. Each video is probed and fully decoded.
Audio generation and encoding are separate processes. PNG inputs use one decoder
thread and24fps. There are no paid model calls or third-party music samples.

## Frozen gates

`python gates.py` freezes code and non-config inputs, runs the baseline, replaces
only the first narration sentence in demo.json, reruns the same command, restores
the original JSON bytes and runs again. Audio, SRT and both formats must reflect
the revision. Correct restoration requires original approved inputs and new valid
outputs; bit-identical synthetic speech is a separate diagnostic, not required.

The approved alternate sentence is “Turn this draft into a PowerPoint you can
edit.” All other narration, headlines, feature and timeline settings remain fixed.
Unreviewed claims, PDF/AI-generation claims and timing edits are rejected.

A fourth fresh run changes only the clearly labeled LOCAL wrapper fixture to
remove the export selector. It must fail with a changed input hash and no new
successful MP4. The public product is not modified, and this fixture does not
claim that a real production feature was removed.

## Evidence and limits

Artifacts preserve input/code hashes, commands, timestamps, elapsed times, actual
downloaded files, browser actions/request logs, native renders, captions and test
receipts. Tests cover stale evidence, invalid content, missing files and privacy
patterns. A failed new run never accepts an old video as success.

Automated success does not replace visual/audio review. LibreOffice opening is
not Microsoft PowerPoint/WPS compatibility testing. No human-labor baseline is
measured and no savings percentage is claimed. The product's creation and PPTX
exports are free; cloud projects are a separate existing membership service.

The approach reuses the repository's mentor-report-01, relay-friends-01 and
bpj-ai-service-01 capture/voice/FFmpeg patterns. Kokoro weights use Apache-2.0;
the ONNX wrapper is MIT; individual dependency and GPL eSpeak/phonemizer notices
are retained. The full-precision model is used because the publisher's current
int8 asset failed CPU initialization with this runtime. No whole-stack permissive
license claim is made, and model/environment binaries are not artifact outputs.
