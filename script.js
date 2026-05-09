/* ==========================================================================
   805 SOBRIETY — live camera, local image analysis, drunk verdict 1-10
   ========================================================================== */

(() => {
  'use strict';

  // ----- DOM -------------------------------------------------------------
  const $ = id => document.getElementById(id);
  const camFrame    = $('camFrame');
  const camIdle     = $('camIdle');
  const camBar      = $('camBar');
  const reviewBar   = $('reviewBar');
  const camHint     = $('camHint');
  const camFlash    = $('camFlash');
  const camScan     = $('camScan');
  const camReticle  = $('camReticle');
  const video       = $('video');
  const snap        = $('snap');
  const startCam    = $('startCam');
  const pickInstead = $('pickInstead');
  const fileInput   = $('fileInput');
  const flipBtn     = $('flipBtn');
  const shutterBtn  = $('shutterBtn');
  const retakeBtn   = $('retakeBtn');
  const rateBtn     = $('rateBtn');
  const workCanvas  = $('workCanvas');

  const result      = $('result');
  const resultClose = $('resultClose');
  const scoreNum    = $('scoreNum');
  const scoreArc    = $('scoreArc');
  const verdictTitle= $('verdictTitle');
  const verdictFlav = $('verdictFlavor');
  const verdictRx   = $('verdictRx');
  const receiptList = $('receiptList');
  const shareBtn    = $('shareBtn');
  const againBtn    = $('againBtn');

  const refInput    = $('refInput');
  const refList     = $('refList');
  const clearRefsBtn= $('clearRefs');

  // ----- State -----------------------------------------------------------
  const REF_KEY = 'sb-sobriety-refs-v2';
  let stream = null;
  let facing = 'user';      // 'user' or 'environment'
  let capturedImg = null;   // Image element of the current snapshot
  let lastScore = null;
  let lastVerdict = null;

  // Initial UI state: idle (waiting on user to start camera)
  setIdle();

  // ----- Verdict text (now with extra unhinge) ---------------------------
  const VERDICTS = [
    { // 1
      title: "Mission Bell",
      flavor: "Sober as 6 a.m. mass at the Old Mission. Has, unprompted, mentioned their step count today. Drinks water with lemon. Suspiciously hydrated. Will offer you LMNT.",
      rx: "One acai bowl from Backyard Bowls. Touch grass. Reward your liver."
    },
    { // 2
      title: "Backyard Bowl",
      flavor: "Smoothie in hand. Currently explaining astrology to a dog. Tote bag has a podcast logo on it that doesn't exist anymore. Says 'I'm a lightweight' as a flex.",
      rx: "Light kombucha. Continue gentle vibing. Do not start a Substack."
    },
    { // 3
      title: "One IPA at Brass Bear",
      flavor: "Cheeks pink-adjacent. Just used the words 'dry-hopped' and 'mouthfeel' in the same breath. Will, in eleven minutes, tell you about their juice cleanse and a guy named Reid.",
      rx: "One more pint. Then water. Then refuse the third pint. Yes, water."
    },
    { // 4
      title: "Funk Zone Float",
      flavor: "Two pours into the Urban Wine Trail. Has begun a sentence with 'okay so my screenplay—'. Believes they invented the spritz. Tote fully deployed. Mentioned they're 'kind of an empath'.",
      rx: "Soft pretzel. Stretch. Refuse the third tasting flight. Block their ex preemptively."
    },
    { // 5
      title: "Sandbar Survivor",
      flavor: "Has explained, twice, that the ocean is 'basically just big sky'. Trying to befriend a kelp strand. Pitching a startup that's 'kind of like Postmates but for emotions'. Convinced they're vibe-coding.",
      rx: "Tacos. A whole basket. Order them yourself, do not delegate. No more pitching."
    },
    { // 6
      title: "Joe's Mai Tai",
      flavor: "The legendary Joe's mai tai has hit the system. Has informed the bartender they 'used to bartend, in a past life, energetically'. Currently rebuilding their personality from a single Big Lebowski reference.",
      rx: "Walk to the beach. Look at one (1) pelican. Do not, under any circumstances, sing."
    },
    { // 7
      title: "Wildcat Wobble",
      flavor: "State Street rotates at a leisurely 0.5 RPM. Has loudly declared love for a stranger and a sidewalk lamppost. Convinced the bouncer is, low-key, his actual best friend. Has begun air-DJing.",
      rx: "Hand over the keys. Hand over the phone. Hand over the Notes app. Get a Lyft."
    },
    { // 8
      title: "Stearns Wharf Stumble",
      flavor: "One wrong step from the Pacific. Believes the seagulls are listening. They are. They always have been. Has texted their ex, their ex's mom, and a number labeled 'do NOT', in that order.",
      rx: "Sit on a bench. Inland-facing. Drink water. Do not finalize that voice memo."
    },
    { // 9
      title: "Isla Vista Insomniac",
      flavor: "DP party went a little too far. Currently barefoot. Phone at 7% and they're using it as a flashlight. Just told a stranger they 'feel like the universe is, like, a big group chat' and meant it.",
      rx: "Tap water. Big slice of pizza from Woodstock's. Bed. Alone. Phone face-down."
    },
    { // 10
      title: "Found-on-the-Beach-at-Dawn",
      flavor: "Sunrise at Leadbetter. Sand in places sand should not be. Has founded a sober-curious newsletter that will exist for three weeks. Will swear off tequila. Will, instead, swear off the specific bartender, by name, on Instagram.",
      rx: "Gatorade. Esau's breakfast. Apologize to everyone you texted, in alphabetical order."
    }
  ];

  // Field notes by tier — short, ridiculous, on the receipt
  const RECEIPT_NOTES = [
    [ // tier 0 (1-3)
      "Could probably file taxes",
      "Eyes alarmingly open",
      "Posture: librarian-grade",
      "Smelled like SPF 50",
      "Has used the word 'modality' in casual conversation"
    ],
    [ // tier 1 (4-6)
      "Vibes: vacationing",
      "Could parallel park, slowly",
      "Speaking exclusively in restaurant recs",
      "Has joined a group chat without permission",
      "Pitched a podcast in the last 90 seconds"
    ],
    [ // tier 2 (7-8)
      "Aggressively un-ironic",
      "Declared 'I love this song' to total silence",
      "Believes they invented karaoke",
      "Currently friends with the entire bar",
      "Doing a TED talk to one (1) houseplant"
    ],
    [ // tier 3 (9-10)
      "Walking on a noticeable diagonal",
      "Lost one shoe, gained one number",
      "Convinced seagulls owe them money",
      "Has typed 'wyd' into a calculator app",
      "Currently the unofficial mayor of Funk Zone alley B"
    ]
  ];

  // ----- Sub-rating tier labels (10 tiers each, max ridiculousness) -------
  const SUB_LABELS = {
    tweak: [
      "Glassy and at peace. Possibly a monk.",
      "Functioning. Annotating.",
      "Hands moving at 1.2x speed",
      "Has restructured the conversation twice",
      "Speedrunning a TED talk you didn't ask for",
      "Pupils consulting independently",
      "Reorganizing your kitchen, mentally",
      "Currently solving a Rubik's cube emotionally",
      "Has invented a religion in the last 4 minutes",
      "Vibrating on a frequency only doorbells can hear"
    ],
    vibe: [
      "Aura: beige. Ambient: hum of a Costco.",
      "A small, lukewarm tea",
      "Picnic-blanket-coded",
      "Warm tones, gentle hum, casual radiance",
      "Sun-tea energy. Highly approachable.",
      "Glowing in HDR",
      "Golden hour, audibly",
      "Vibe so loud the photo is humming",
      "Frequency: sunset. Color temperature: yes.",
      "Photographed in 3 dimensions and a fourth one we don't talk about"
    ],
    cope: [
      "Not pretending. Refreshing.",
      "Has accepted the situation",
      "Mildly faking it. Convincingly.",
      "Faking it like a champ",
      "Holding it together with floss",
      "Smile structural integrity: 60%",
      "Damp-cardboard smile",
      "Lying to a mirror. Mirror unconvinced.",
      "In line for a denial-shaped croissant",
      "Has gaslit a houseplant"
    ],
    rizz: [
      "0.5g of charisma detected",
      "Could text someone back, probably",
      "Functional charm, like a screen door",
      "Hospitality-school energy",
      "Could secure a free chip refill",
      "Could borrow a charger from a stranger",
      "Could borrow $40 with eye contact alone",
      "Bartender just took down the recipe",
      "Chemically irresistible. Possibly a hazard.",
      "Has been written into someone's will"
    ],
    mog: [
      "Currently a chair. A nice chair, but a chair.",
      "Politely existing in the photo",
      "Holds a door, occasionally",
      "Solid Tuesday-evening presence",
      "Functional aura. Hardware-store-grade.",
      "Mogging quietly. Building leverage.",
      "Mogging audibly. Heads turning.",
      "Has mogged a stranger across a parking lot",
      "Has mogged an entire pew",
      "Sasha-tier. Aura visible from space."
    ]
  };

  // Top news ticker — vibe-coded headlines / SB nightlife / Sasha lore
  const TICKER_HEADLINES = [
    "TONIGHT: SASHA'S BIRTHDAY — BEARD AT FULL DEPLOYMENT",
    "AURA ADVISORY: SASHA HAS ENTERED THE FRAME",
    "SASHA MOGS — THIS IS NOW SETTLED LAW",
    "ADAPTIVE REUSE UPDATE: ONE (1) CHURCH → HOTEL, AGAIN",
    "ARCHITECTURAL HOT TAKE: PEWS MAKE GREAT BAR SEATING",
    "POWERED BY VIBES",
    "VIBE-CODED AT 3 A.M. WITH A WHITE CLAW",
    "TWEAK ADVISORY: ZONE 4 SHOWING ELEVATED HAND-SPEED",
    "STATE STREET CONDITIONS: SLOSHED",
    "STEARNS WHARF DEPTH: DEEPER WHEN DRUNK",
    "FUNK ZONE WIND: WARM, WINEY, JUDGMENTAL",
    "TONIGHT'S FORECAST: 80% TWEAK, 20% TEQUILA",
    "BEARD DENSITY INDEX RECALIBRATED — SASHA-GRADE TIER UNLOCKED",
    "MOGGING DETECTED IN THE SOUTHERN HEMISPHERE OF THE FRAME",
    "ALL CALCULATIONS APPROVED BY ONE GUY ON STATE ST",
    "ALGORITHM SHIPPED ON A FEELING",
    "RIZZ INDEX RECALIBRATED FOR DAYLIGHT SAVINGS",
    "I.V. CURFEW: WHEN THE PIZZA RUNS OUT",
    "PARTY VENUE: A BUILDING THAT USED TO BE SOMETHING ELSE",
    "JOE'S MAI TAI ADVISORY LEVEL: ORANGE",
    "SASHA'S CANDLES: SOMETIMES THIS YEAR, DEFINITELY NEXT",
    "THIS WEBSITE WAS MADE OF VIBES, PALM TREES, AND ONE BEARD",
    "PALMS OBSERVED SWAYING WITH MILD JUDGMENT",
    "PRODUCTION DEPLOYS BASED ENTIRELY ON A HUNCH"
  ];

  // Sub-ticker rotor — face metrics being "scanned"
  const SUBTICKER_METRICS = [
    "cheek flush coefficient",
    "ocular fog index",
    "jaw clench (tweak proxy)",
    "pupil sovereignty",
    "beard density (Sasha-grade)",
    "smile structural integrity",
    "forehead shimmer",
    "aura saturation",
    "aura mogging quotient",
    "rizz coefficient (live)",
    "denial gradient",
    "vibe-code compliance",
    "tweak factor (background)",
    "cope thermal mass",
    "side-eye reserves",
    "adaptive-reuse harmonics",
    "church-pew nostalgia",
    "candle thermal mass",
    "kelp-affinity bias",
    "Funk Zone resonance",
    "lamppost-trust quotient"
  ];

  // Birthday shoutouts shown at the bottom of the verdict modal
  const BDAY_SHOUTOUTS = [
    "Wish Sasha a happy birthday — he’s converted another church.",
    "Light a candle for Sasha. Then for his liver.",
    "A toast: to the beard, to the aura, to the hotel that used to be a chapel.",
    "Sasha is older now. The pews remain.",
    "Happy birthday, Sasha. The mog is well documented.",
    "Tonight’s adaptive-reuse update: this party, formerly a quiet evening."
  ];

  // ======================================================================
  // CAMERA
  // ======================================================================
  function setIdle() {
    camFrame.classList.add('idle');
    camFrame.classList.remove('has-photo');
    camBar.hidden = true;
    reviewBar.hidden = true;
    camScan.hidden = true;
    video.hidden = true;
    snap.hidden = true;
    camHint.textContent = "Front camera works best. Get the face filling the frame.";
  }

  function setLive() {
    camFrame.classList.remove('idle', 'has-photo');
    camBar.hidden = false;
    reviewBar.hidden = true;
    camScan.hidden = true;
    video.hidden = false;
    snap.hidden = true;
    camHint.textContent = "Tap the big button to capture. Tap the icon to flip cameras.";
  }

  function setReview() {
    camFrame.classList.remove('idle');
    camFrame.classList.add('has-photo');
    camBar.hidden = true;
    reviewBar.hidden = false;
    camScan.hidden = true;
    video.hidden = true;
    snap.hidden = false;
    camHint.textContent = "Look good? Tap Rate me. Or retake.";
  }

  async function startStream() {
    // iOS Safari: getUserMedia must be called from a user gesture handler.
    if (!navigator.mediaDevices?.getUserMedia) {
      toast("This browser doesn't support live camera. Use the gallery icon.");
      fileInput.click();
      return;
    }

    try {
      // Stop any existing stream
      stopStream();

      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width:  { ideal: 1280 },
          height: { ideal: 1280 }
        }
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      video.classList.toggle('user', facing === 'user'); // mirror selfie
      // iOS: must call play after metadata loads
      try { await video.play(); } catch {}
      setLive();
    } catch (err) {
      console.warn(err);
      const name = err.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        toast("Camera permission denied. Tap the gallery icon to upload instead.");
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        toast("No camera found. Use the gallery icon.");
      } else {
        toast("Couldn't start camera. Try the gallery icon.");
      }
    }
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
      video.srcObject = null;
    }
  }

  function captureFrame() {
    if (!video.videoWidth) return;

    // Draw the visible (mirrored if selfie) view to a canvas
    const w = video.videoWidth, h = video.videoHeight;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (facing === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    const dataURL = c.toDataURL('image/jpeg', 0.88);

    // Show flash
    camFlash.classList.remove('fire');
    void camFlash.offsetWidth;
    camFlash.classList.add('fire');

    // Build image element for analysis
    const img = new Image();
    img.onload = () => {
      capturedImg = img;
      snap.src = dataURL;
      stopStream();
      setReview();
    };
    img.src = dataURL;
  }

  // Wire up camera controls
  startCam.addEventListener('click', startStream);
  pickInstead.addEventListener('click', () => fileInput.click());
  shutterBtn.addEventListener('click', captureFrame);
  flipBtn.addEventListener('click', async () => {
    facing = (facing === 'user') ? 'environment' : 'user';
    await startStream();
  });
  retakeBtn.addEventListener('click', async () => {
    capturedImg = null;
    snap.removeAttribute('src');
    await startStream();
  });

  fileInput.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast("That's not a photo."); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        capturedImg = img;
        snap.src = ev.target.result;
        stopStream();
        setReview();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
    fileInput.value = '';
  });

  // ======================================================================
  // ANALYSIS
  // ======================================================================
  // FNV-1a hash over a fixed 16x16 sample grid. Same photo -> same hash.
  // Two visually distinct photos get distinct hashes (different bits flipped),
  // which we feed into a seeded PRNG to produce per-photo variance channels.
  function photoHash(data, W, H) {
    let h = 2166136261 >>> 0;
    for (let gy = 0; gy < 16; gy++) {
      for (let gx = 0; gx < 16; gx++) {
        const x = Math.floor((gx + 0.5) * W / 16);
        const y = Math.floor((gy + 0.5) * H / 16);
        const i = (y * W + x) * 4;
        // top 4 bits per channel — robust to JPEG noise
        const v = (data[i] >> 4) | ((data[i+1] >> 4) << 4) | ((data[i+2] >> 4) << 8);
        h = (h ^ v) >>> 0;
        h = Math.imul(h, 16777619) >>> 0;
      }
    }
    return h >>> 0;
  }

  // mulberry32 — small fast deterministic PRNG seeded by an int.
  // Each call() returns an independent uniform 0..1 number.
  function makeRng(seed) {
    let s = seed >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function extractFeatures(img) {
    const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
    const W = workCanvas.width, H = workCanvas.height;
    ctx.clearRect(0, 0, W, H);
    const ratio = Math.max(W / img.width, H / img.height);
    const dw = img.width  * ratio;
    const dh = img.height * ratio;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const data = ctx.getImageData(0, 0, W, H).data;

    const cx = W / 2, cy = H / 2;
    const faceR = Math.min(W, H) * 0.35;

    let rSum=0, gSum=0, bSum=0, lumSum=0, satSum=0, n=0;
    let edgeSum=0, eN=0;
    let warm=0, cool=0, pink=0;

    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const dx = x - cx, dy = y - cy;
        if (dx*dx + dy*dy > faceR*faceR) continue;
        const i = (y * W + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2];
        rSum+=r; gSum+=g; bSum+=b;
        const lum = 0.299*r + 0.587*g + 0.114*b;
        lumSum += lum;
        const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
        satSum += mx === 0 ? 0 : (mx - mn)/mx;
        if (r > b + 8) warm++; else if (b > r + 8) cool++;
        if (r > 130 && r > g+18 && r > b+18 && lum > 90 && lum < 220) pink++;
        n++;
        if (x + 2 < W) {
          const j = (y * W + (x+2)) * 4;
          const lum2 = 0.299*data[j] + 0.587*data[j+1] + 0.114*data[j+2];
          edgeSum += Math.abs(lum2 - lum);
          eN++;
        }
      }
    }

    const hash = photoHash(data, W, H);

    if (n === 0) return { luminance: .5, saturation: .5, flush: 0, warmth: 0, pink: 0, sharpness: .5, blur: .5, hash };

    const rAvg = rSum/n, gAvg = gSum/n, bAvg = bSum/n;
    return {
      luminance:  (lumSum/n)/255,
      saturation: satSum/n,
      flush:      (rAvg - (gAvg+bAvg)/2)/255,
      warmth:     (warm-cool)/n,
      pink:       pink/n,
      sharpness:  Math.min(1, (edgeSum/eN)/40),
      blur:       1 - Math.min(1, (edgeSum/eN)/40),
      hash
    };
  }

  function scoreFeatures(f, refs) {
    // ---- Recalibrated feature components (target: cluster around 0.5) ----
    // Old math sent every warm/dim phone photo to ~0.85 raw, locking us at
    // 8/9. New math: gentler scaling so a "typical" photo lands mid-range
    // and the hash channel below provides the actual spread.
    const flush     = clamp(f.flush * 2.5 + f.pink * 1.0, 0, 1);
    const eyeDroop  = clamp((1 - f.sharpness) * 0.6 + (1 - f.luminance) * 0.3, 0, 1);
    const stability = clamp(f.blur, 0, 1);
    const vibe      = clamp(((f.warmth + 1)/2) * 0.55 + f.saturation * 0.45 - 0.15, 0, 1);

    const featRaw = clamp(flush*0.30 + eyeDroop*0.25 + stability*0.20 + vibe*0.25, 0, 1);

    // ---- Per-photo independent variance channels ------------------------
    // Same photo -> same channels (deterministic). Different photo -> totally
    // different draws, so two similar-looking photos land at e.g. 3 vs 8.
    const rng = makeRng(f.hash || 0);
    const drunkN = rng();
    const tweakN = rng();
    const vibeN  = rng();
    const copeN  = rng();
    const rizzN  = rng();
    const mogN   = rng();

    // ---- Main DRUNK score: 35% features + 65% per-photo channel --------
    // Then a 1.4x stretch around 0.5 so the tails (1s and 10s) are reachable.
    let raw = featRaw * 0.35 + drunkN * 0.65;
    raw = clamp(0.5 + (raw - 0.5) * 1.4, 0, 1);

    // ---- Reference-photo pull (if user has calibrated) -----------------
    let matched = null;
    if (refs.length) {
      let best = null;
      for (const r of refs) {
        const d = featureDistance(f, r.features);
        if (!best || d < best.d) best = { d, r };
      }
      matched = best.r;
      const refNorm = (matched.score - 1) / 9;
      const closeness = Math.max(0, 1 - best.d * 1.4);
      const refWeight = 0.25 + closeness * 0.35; // 0.25..0.60 (lighter pull so variety survives)
      raw = raw * (1 - refWeight) + refNorm * refWeight;
    }

    const score = oneToTen(raw);

    // ---- Sub-rating bases (feature-derived, per category) --------------
    const tweakBase = clamp(
      f.sharpness * 0.45 + f.saturation * 0.25 + Math.max(0, f.luminance - 0.5) * 0.50, 0, 1);
    const vibeBase = clamp(
      ((f.warmth + 1)/2) * 0.40 + f.saturation * 0.40 + (1 - Math.abs(f.luminance - 0.55) * 1.4) * 0.20, 0, 1);
    const copeBase = clamp(
      (1 - flush) * 0.55 + f.sharpness * 0.35 + (1 - eyeDroop) * 0.10, 0, 1);
    const rizzBase = clamp(
      (1 - Math.abs(flush - 0.32)) * 0.40 + f.saturation * 0.30 + ((f.warmth + 1)/2) * 0.30, 0, 1);
    const mogBase = clamp(
      f.saturation * 0.30 + ((f.warmth + 1)/2) * 0.30 + f.sharpness * 0.25 +
      Math.max(0, 0.40 - Math.abs(flush - 0.35)) * 0.40, 0, 1);

    // Heavy hash weighting on sub-ratings — they're vibes, not science.
    // 35% feature-derived + 65% per-channel hash variance.
    const subs = {
      tweak: oneToTen(tweakBase * 0.35 + tweakN * 0.65),
      vibe:  oneToTen(vibeBase  * 0.35 + vibeN  * 0.65),
      cope:  oneToTen(copeBase  * 0.35 + copeN  * 0.65),
      rizz:  oneToTen(rizzBase  * 0.35 + rizzN  * 0.65),
      mog:   oneToTen(mogBase   * 0.35 + mogN   * 0.65)
    };

    return {
      score,
      components: { flush, eyeDroop, stability, vibe },
      subs,
      matched
    };
  }

  function oneToTen(v) {
    return Math.max(1, Math.min(10, Math.round(v * 9 + 1)));
  }

  function featureDistance(a, b) {
    const keys = ['luminance','saturation','flush','warmth','pink','sharpness'];
    let s = 0;
    for (const k of keys) {
      const v = (a[k] || 0) - (b[k] || 0);
      s += v * v;
    }
    return Math.sqrt(s);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ======================================================================
  // RATE FLOW
  // ======================================================================
  rateBtn.addEventListener('click', async () => {
    if (!capturedImg) return;
    rateBtn.disabled = true; retakeBtn.disabled = true;
    camScan.hidden = false;

    await sleep(1100 + Math.random() * 500); // let the scanline play

    try {
      const features = extractFeatures(capturedImg);
      const out = scoreFeatures(features, loadRefs());
      lastScore = out.score;
      lastVerdict = VERDICTS[out.score - 1];
      revealResult(out);
    } catch (e) {
      console.error(e);
      toast("Tribunal had a moment. Try a different photo.");
    }
    camScan.hidden = true;
    rateBtn.disabled = false; retakeBtn.disabled = false;
  });

  function revealResult(out) {
    const v = VERDICTS[out.score - 1];

    verdictTitle.textContent = v.title;
    verdictFlav.textContent  = v.flavor;
    verdictRx.textContent    = v.rx;

    // Sub-ratings: tweak / vibe / cope / rizz / mog (Sasha-grade)
    renderSub('Tweak', out.subs.tweak, SUB_LABELS.tweak);
    renderSub('Vibe',  out.subs.vibe,  SUB_LABELS.vibe);
    renderSub('Cope',  out.subs.cope,  SUB_LABELS.cope);
    renderSub('Rizz',  out.subs.rizz,  SUB_LABELS.rizz);
    renderSub('Mog',   out.subs.mog,   SUB_LABELS.mog);

    // Birthday shoutout — special if MOG is high
    const shout = $('bdayShoutout');
    if (shout) {
      if (out.subs.mog >= 9) {
        shout.textContent = "Sasha-tier mog detected. Architecturally significant. Adaptively re-used.";
      } else if (out.subs.mog >= 7) {
        shout.textContent = "Mog detected. Sasha would nod at this, beard-first.";
      } else {
        shout.textContent = BDAY_SHOUTOUTS[Math.floor(Math.random() * BDAY_SHOUTOUTS.length)];
      }
    }

    // Receipt
    receiptList.innerHTML = '';
    pushReceipt("Cheek flush",         pct(out.components.flush));
    pushReceipt("Eye droop",           pct(out.components.eyeDroop));
    pushReceipt("Photo stability",     pct(1 - out.components.stability) + " (steadier=lower)");
    pushReceipt("Sunset vibe",         pct(out.components.vibe));
    pushReceipt("Tweak/Vibe/Cope/Rizz/Mog",
      `${out.subs.tweak}/${out.subs.vibe}/${out.subs.cope}/${out.subs.rizz}/${out.subs.mog}`);
    pushReceipt("Closest reference",   out.matched ? `#${(out.matched.id+'').slice(-4)} (${out.matched.score}/10)` : "none on file");
    const tier = out.score <= 3 ? 0 : out.score <= 6 ? 1 : out.score <= 8 ? 2 : 3;
    const notes = RECEIPT_NOTES[tier];
    pushReceipt("Field note", notes[Math.floor(Math.random() * notes.length)]);
    pushReceipt("Algorithm provenance", "vibe-coded");
    pushReceipt("Venue", "formerly a church, currently a hotel");

    // Score number — count up animation
    result.hidden = false;
    document.body.style.overflow = 'hidden';
    countUp(scoreNum, 0, out.score, 900);

    // Ring fill (circumference 2*pi*52 ≈ 326.7)
    const C = 326.7;
    const target = C - (C * out.score / 10);
    requestAnimationFrame(() => {
      scoreArc.style.strokeDashoffset = target;
    });
  }

  function renderSub(name, score, labels) {
    const numEl  = $('sr' + name + 'Num');
    const fillEl = $('sr' + name + 'Fill');
    const tagEl  = $('sr' + name + 'Tag');
    if (!numEl || !fillEl || !tagEl) return;
    // Reset then animate
    fillEl.style.width = '0%';
    numEl.textContent = '0';
    tagEl.textContent = labels[score - 1];
    // Stagger the count-up so multiple bars feel sequential
    setTimeout(() => {
      fillEl.style.width = (score * 10) + '%';
      countUp(numEl, 0, score, 700);
    }, 120 + Math.random() * 180);
  }

  function pushReceipt(lbl, val) {
    const li = document.createElement('li');
    const a = document.createElement('span'); a.className = 'lbl'; a.textContent = lbl;
    const b = document.createElement('span'); b.className = 'val'; b.textContent = val;
    li.append(a, b);
    receiptList.appendChild(li);
  }

  function pct(v) {
    const p = Math.round(v * 100);
    if (p < 20) return p + "% negligible";
    if (p < 40) return p + "% light";
    if (p < 60) return p + "% notable";
    if (p < 80) return p + "% significant";
    return p + "% extreme";
  }

  function countUp(el, from, to, ms) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = to;
    }
    requestAnimationFrame(step);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Close result
  function closeResult() {
    result.hidden = true;
    document.body.style.overflow = '';
    // Reset arc for next time
    scoreArc.style.strokeDashoffset = 326.7;
  }
  resultClose.addEventListener('click', closeResult);
  result.addEventListener('click', e => { if (e.target === result) closeResult(); });
  againBtn.addEventListener('click', async () => {
    closeResult();
    capturedImg = null;
    await startStream();
  });
  shareBtn.addEventListener('click', async () => {
    if (lastScore == null) return;
    const txt = `\u{1F334} 805 Sobriety verdict: ${lastVerdict.title} — ${lastScore}/10
"${lastVerdict.flavor}"
Rx: ${lastVerdict.rx}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: txt });
      } else {
        await navigator.clipboard.writeText(txt);
        toast("Verdict copied. Share responsibly.");
      }
    } catch { /* user cancelled */ }
  });

  // ======================================================================
  // REFERENCES
  // ======================================================================
  refInput.addEventListener('change', async e => {
    const files = [...e.target.files];
    for (const f of files) await addReference(f);
    refInput.value = '';
    renderRefs();
  });

  clearRefsBtn.addEventListener('click', () => {
    if (!confirm("Clear all reference photos?")) return;
    localStorage.removeItem(REF_KEY);
    renderRefs();
  });

  function addReference(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const features = extractFeatures(img);
          const thumb = makeThumbnail(img, 240);
          const refs = loadRefs();
          refs.push({
            id: Date.now() + '_' + Math.floor(Math.random() * 9999),
            score: 5, thumb, features
          });
          saveRefs(refs);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function makeThumbnail(img, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const ratio = Math.max(size/img.width, size/img.height);
    const dw = img.width*ratio, dh = img.height*ratio;
    ctx.drawImage(img, (size-dw)/2, (size-dh)/2, dw, dh);
    return c.toDataURL('image/jpeg', 0.78);
  }

  function loadRefs() {
    try { return JSON.parse(localStorage.getItem(REF_KEY) || '[]'); }
    catch { return []; }
  }
  function saveRefs(refs) {
    try { localStorage.setItem(REF_KEY, JSON.stringify(refs)); }
    catch {
      while (refs.length > 1) {
        refs.shift();
        try { localStorage.setItem(REF_KEY, JSON.stringify(refs)); return; } catch {}
      }
      toast("Out of browser storage. Trim refs.");
    }
  }

  function renderRefs() {
    const refs = loadRefs();
    refList.innerHTML = '';
    clearRefsBtn.hidden = refs.length === 0;
    if (!refs.length) return;
    for (const r of refs) {
      const card = document.createElement('div');
      card.className = 'ref-card';

      const thumb = document.createElement('div');
      thumb.className = 'ref-thumb';
      thumb.style.backgroundImage = `url(${r.thumb})`;

      const body = document.createElement('div');
      body.className = 'ref-body';
      const lbl = document.createElement('label');
      lbl.textContent = "How drunk?";
      body.appendChild(lbl);

      const range = document.createElement('input');
      range.type = 'range'; range.min = 1; range.max = 10; range.step = 1;
      range.value = r.score;
      body.appendChild(range);

      const row = document.createElement('div');
      row.className = 'ref-row';
      const sc = document.createElement('span');
      sc.className = 'ref-score';
      sc.textContent = r.score + '/10';
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'ref-del'; del.textContent = "remove";
      row.append(sc, del);
      body.appendChild(row);

      range.addEventListener('input', () => sc.textContent = range.value + '/10');
      range.addEventListener('change', () => {
        const list = loadRefs();
        const item = list.find(x => x.id === r.id);
        if (item) { item.score = +range.value; saveRefs(list); }
      });
      del.addEventListener('click', () => {
        const list = loadRefs().filter(x => x.id !== r.id);
        saveRefs(list); renderRefs();
      });

      card.append(thumb, body);
      refList.appendChild(card);
    }
  }

  // ----- Toast -----------------------------------------------------------
  let toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  // ======================================================================
  // TICKERS
  // ======================================================================
  function buildTopTicker() {
    const track = $('tickerTrack');
    if (!track) return;
    // Build a long enough strip that the -50% loop is seamless
    const items = [...TICKER_HEADLINES, ...TICKER_HEADLINES];
    track.innerHTML = items.map(t =>
      `<span>${t}</span><span class="dot">&#127796;</span>`
    ).join('');
  }

  function startSubticker() {
    const rotor = $('subtickerRotor');
    if (!rotor) return;
    let i = 0;
    setInterval(() => {
      i = (i + 1) % SUBTICKER_METRICS.length;
      // Re-trigger fade animation
      rotor.style.animation = 'none';
      rotor.offsetHeight; // reflow
      rotor.style.animation = '';
      rotor.textContent = SUBTICKER_METRICS[i];
    }, 1900);
  }

  // ----- Init ------------------------------------------------------------
  buildTopTicker();
  startSubticker();
  renderRefs();

  // Pause stream when tab is hidden (saves battery on iOS)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopStream();
  });

})();
