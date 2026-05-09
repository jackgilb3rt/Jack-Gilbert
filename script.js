/* ==========================================================================
   THE STATE STREET SOBRIETY INDEX
   Photo-based drunk rating, calibrated by your own references.
   Everything runs locally. No uploads. The palm trees are watching though.
   ========================================================================== */

(() => {
  'use strict';

  // ----- DOM refs ---------------------------------------------------------
  const dropzone     = document.getElementById('dropzone');
  const fileInput    = document.getElementById('fileInput');
  const cameraInput  = document.getElementById('cameraInput');
  const preview      = document.getElementById('preview');
  const previewImg   = document.getElementById('previewImg');
  const rateBtn      = document.getElementById('rateBtn');
  const clearBtn     = document.getElementById('clearBtn');
  const workCanvas   = document.getElementById('workCanvas');

  const result       = document.getElementById('result');
  const meterFill    = document.getElementById('meterFill');
  const meterNeedle  = document.getElementById('meterNeedle');
  const scoreNum     = document.getElementById('scoreNum');
  const verdictTitle = document.getElementById('verdictTitle');
  const verdictFlav  = document.getElementById('verdictFlavor');
  const receiptList  = document.getElementById('receiptList');
  const receiptDate  = document.getElementById('receiptDate');
  const receiptRx    = document.getElementById('receiptRx');
  const shareBtn     = document.getElementById('shareBtn');
  const againBtn     = document.getElementById('againBtn');

  const refInput     = document.getElementById('refInput');
  const refList      = document.getElementById('refList');
  const clearRefsBtn = document.getElementById('clearRefs');

  // ----- State ------------------------------------------------------------
  const REF_KEY = 'sb-sobriety-refs-v1';
  let currentImage = null;     // HTMLImageElement
  let currentFeatures = null;  // last computed features
  let lastScore = null;
  let lastVerdict = null;

  // ----- Verdict copy -----------------------------------------------------
  const VERDICTS = [
    { // 1
      title: "Mission Bell",
      flavor: "Sober as 6 a.m. mass at the Old Mission. Disturbingly hydrated. Possibly judging you.",
      rx: "Reward with one (1) acai bowl from Backyard Bowls."
    },
    { // 2
      title: "Backyard Bowl",
      flavor: "Smoothie-in-hand energy. Could be at the after-party, would not know.",
      rx: "Light kombucha. Maybe a little flirting. Stay the course."
    },
    { // 3
      title: "One IPA at Brass Bear",
      flavor: "Pleasant. Cheeks pink-adjacent. Has begun to talk about Santa Ynez AVAs.",
      rx: "One more pint, then water. Yes, really. Water."
    },
    { // 4
      title: "Funk Zone Float",
      flavor: "Two pours into the Urban Wine Trail. Tote bag fully deployed. Peak hospitality.",
      rx: "Pretzel. Stretch. Refuse the third tasting flight."
    },
    { // 5
      title: "Sandbar Survivor",
      flavor: "Solid buzz. Eyes are 60% open, 100% sincere. Has opinions about Stearns Wharf parking.",
      rx: "Tacos. A whole basket. Order them yourself, do not delegate."
    },
    { // 6
      title: "Joe's Cafe Mai Tai",
      flavor: "The legendary mai tai is hitting. Has, against all advice, ordered a second.",
      rx: "Walk to the beach. Look at one (1) pelican. Re-evaluate."
    },
    { // 7
      title: "Wildcat Wobble",
      flavor: "State Street is rotating at a leisurely 0.5 RPM. Has loudly declared love for at least one stranger.",
      rx: "Hand over the keys. Hand over the phone. Get a Lyft."
    },
    { // 8
      title: "Stearns Wharf Stumble",
      flavor: "One wrong step from the Pacific. Believes the seagulls are listening. They are.",
      rx: "Sit down. On a bench. Inland-facing. Drink water."
    },
    { // 9
      title: "Isla Vista Insomniac",
      flavor: "DP party went a little too far. Currently barefoot. Phone has 7%.",
      rx: "Tap water. Big slice of pizza. Bed, immediately, alone."
    },
    { // 10
      title: "Found-on-the-Beach-at-Dawn",
      flavor: "Sunrise at Leadbetter, sand in places sand should not be. Will swear off tequila.",
      rx: "Gatorade. Greasy breakfast at Esau's. Apologize to everyone you texted."
    }
  ];

  // Random witty receipt notes per range
  const RECEIPT_NOTES = [
    [ // low
      "Could probably do my taxes",
      "Eyes alarmingly open",
      "Posture: librarian-grade"
    ],
    [ // mid
      "Vibes: vacationing",
      "Could parallel park, but slowly",
      "Speaking entirely in restaurant recommendations"
    ],
    [ // high
      "Vibes: aggressively un-ironic",
      "Has declared 'I love this song' to silence",
      "Believes they invented karaoke"
    ],
    [ // very high
      "Walking on a noticeable diagonal",
      "Lost one shoe, gained one phone number",
      "Convinced the seagulls owe them money"
    ]
  ];

  // ----- Drag & drop / file pick -----------------------------------------
  ['dragenter','dragover'].forEach(ev =>
    dropzone.addEventListener(ev, e => {
      e.preventDefault();
      dropzone.classList.add('is-drag');
    })
  );
  ['dragleave','drop'].forEach(ev =>
    dropzone.addEventListener(ev, e => {
      e.preventDefault();
      dropzone.classList.remove('is-drag');
    })
  );
  dropzone.addEventListener('drop', e => {
    const f = e.dataTransfer?.files?.[0];
    if (f) loadFile(f);
  });

  fileInput.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
  });
  cameraInput.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
  });

  function loadFile(file) {
    if (!file.type.startsWith('image/')) {
      toast("That doesn't look like a photo, friend.");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        previewImg.src = img.src;
        preview.hidden = false;
        result.hidden = true;
        preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  clearBtn.addEventListener('click', () => {
    currentImage = null;
    preview.hidden = true;
    result.hidden = true;
    fileInput.value = '';
    cameraInput.value = '';
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ----- Feature extraction ----------------------------------------------
  // Sample the image, focus on the center (where a face usually is),
  // and compute: redness/flush, brightness, saturation, blur, warmth.
  function extractFeatures(img) {
    const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
    const W = workCanvas.width, H = workCanvas.height;
    ctx.clearRect(0, 0, W, H);

    // Cover-fit so we don't squish faces
    const ratio = Math.max(W / img.width, H / img.height);
    const dw = img.width  * ratio;
    const dh = img.height * ratio;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

    const data = ctx.getImageData(0, 0, W, H).data;
    const cx = W / 2, cy = H / 2;
    const faceR = Math.min(W, H) * 0.35; // central ROI

    let rSum=0, gSum=0, bSum=0, lumSum=0, satSum=0, n=0;
    let rEdge=0, eN=0;
    let warmCount=0, coolCount=0;
    let pinkCount=0;

    // Per-pixel pass
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const dx = x - cx, dy = y - cy;
        if (dx*dx + dy*dy > faceR*faceR) continue; // only ROI

        const i = (y * W + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2];

        rSum += r; gSum += g; bSum += b;

        // luminance
        const lum = 0.299*r + 0.587*g + 0.114*b;
        lumSum += lum;

        // saturation (HSV-ish)
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx === 0 ? 0 : (mx - mn) / mx;
        satSum += sat;

        // warm vs cool tilt
        if (r > b + 8) warmCount++;
        else if (b > r + 8) coolCount++;

        // pink-cheek detector: red dominant, modest green, decent brightness
        if (r > 130 && r > g + 18 && r > b + 18 && lum > 90 && lum < 220) {
          pinkCount++;
        }

        n++;

        // Cheap blur estimate via right-neighbor luminance gradient
        if (x + 2 < W) {
          const j = (y * W + (x + 2)) * 4;
          const lum2 = 0.299*data[j] + 0.587*data[j+1] + 0.114*data[j+2];
          rEdge += Math.abs(lum2 - lum);
          eN++;
        }
      }
    }

    if (n === 0) {
      // Fallback: just use whole frame
      return extractFeaturesGlobal(data, W, H);
    }

    const rAvg = rSum / n, gAvg = gSum / n, bAvg = bSum / n;
    const luminance = lumSum / n / 255;            // 0..1
    const saturation = satSum / n;                 // 0..1
    const flush = (rAvg - (gAvg + bAvg)/2) / 255;  // -ish 0..0.4
    const warmth = (warmCount - coolCount) / n;    // -1..1
    const pink = pinkCount / n;                    // 0..1
    const sharpness = Math.min(1, (rEdge / eN) / 40); // 0..1, higher = sharper
    const blur = 1 - sharpness;

    return { luminance, saturation, flush, warmth, pink, sharpness, blur };
  }

  function extractFeaturesGlobal(data, W, H) {
    let rSum=0, gSum=0, bSum=0, lumSum=0, satSum=0, n=0, rEdge=0, eN=0, pinkCount=0, warm=0, cool=0;
    for (let i = 0; i < data.length; i += 16) {
      const r=data[i], g=data[i+1], b=data[i+2];
      rSum+=r; gSum+=g; bSum+=b;
      const lum = 0.299*r+0.587*g+0.114*b;
      lumSum+=lum;
      const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
      satSum += mx === 0 ? 0 : (mx-mn)/mx;
      if (r > 130 && r > g+18 && r > b+18 && lum>90 && lum<220) pinkCount++;
      if (r > b+8) warm++; else if (b > r+8) cool++;
      n++;
    }
    return {
      luminance: (lumSum/n)/255,
      saturation: satSum/n,
      flush: (rSum/n - ((gSum+bSum)/(2*n)))/255,
      warmth: (warm-cool)/n,
      pink: pinkCount/n,
      sharpness: 0.5,
      blur: 0.5
    };
  }

  // ----- Scoring ----------------------------------------------------------
  // Combine features into a 1-10 score, then nudge based on closest reference.
  function scoreFeatures(f, refs) {
    // Base components, each ~0..1, weighted to a "drunkness" sum.
    const flush     = clamp(f.flush * 4 + f.pink * 2.5, 0, 1);
    const eyeDroop  = clamp((1 - f.luminance) * 0.5 + (1 - f.sharpness) * 0.6, 0, 1);
    const stability = clamp(f.blur, 0, 1); // higher = drunker
    const vibe      = clamp((f.warmth + 1) / 2 * 0.6 + f.saturation * 0.4, 0, 1);

    // Weighted base — algorithm's own opinion (0..1)
    let raw = (flush * 0.40) + (eyeDroop * 0.20) + (stability * 0.20) + (vibe * 0.20);

    // Pull toward closest reference if any
    let matched = null;
    if (refs.length) {
      let best = null;
      for (const r of refs) {
        const d = featureDistance(f, r.features);
        if (!best || d < best.d) best = { d, r };
      }
      matched = best.r;
      // Convert ref score (1..10) to 0..1, blend ~50/50 with our raw
      const refNorm = (matched.score - 1) / 9;
      // closer -> more weight on the ref
      const closeness = Math.max(0, 1 - best.d * 1.4); // 0..1
      const refWeight = 0.35 + closeness * 0.45; // 0.35..0.8
      raw = raw * (1 - refWeight) + refNorm * refWeight;
    }

    // Map 0..1 to 1..10
    const score = Math.max(1, Math.min(10, Math.round(raw * 9 + 1)));

    return {
      score,
      components: { flush, eyeDroop, stability, vibe },
      matched
    };
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

  // ----- Rate flow --------------------------------------------------------
  rateBtn.addEventListener('click', async () => {
    if (!currentImage) return;
    rateBtn.disabled = true;
    rateBtn.classList.add('rating-pulse');
    rateBtn.textContent = "Tribunal deliberating...";

    // Tiny delay so the scanline animation can be enjoyed
    await sleep(900 + Math.random() * 600);

    try {
      const features = extractFeatures(currentImage);
      currentFeatures = features;
      const refs = loadRefs();
      const out = scoreFeatures(features, refs);
      lastScore = out.score;
      lastVerdict = VERDICTS[out.score - 1];
      renderResult(out, features);
    } catch (err) {
      console.error(err);
      toast("Tribunal had a moment. Try a different photo.");
    }

    rateBtn.disabled = false;
    rateBtn.classList.remove('rating-pulse');
    rateBtn.textContent = "Rate the Damage →";
  });

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function renderResult(out, f) {
    const v = VERDICTS[out.score - 1];
    const pct = ((out.score - 1) / 9) * 100;

    meterFill.style.width = pct + '%';
    meterNeedle.style.left = pct + '%';
    scoreNum.textContent = out.score;
    verdictTitle.textContent = v.title;
    verdictFlav.textContent = v.flavor;
    receiptDate.textContent = formatNow();
    receiptRx.textContent = v.rx;

    // Build receipt itemization
    receiptList.innerHTML = '';
    addReceiptItem("Cheek flush index",   labelize(out.components.flush));
    addReceiptItem("Eye droop coeff.",    labelize(out.components.eyeDroop));
    addReceiptItem("Photo stability",     labelize(1 - out.components.stability) + " (steadier=lower)");
    addReceiptItem("Sunset vibe match",   labelize(out.components.vibe));
    if (out.matched) {
      addReceiptItem("Closest reference", "#" + (out.matched.id || '?').toString().slice(-4) + " ("+ out.matched.score +"/10)");
    } else {
      addReceiptItem("Closest reference", "none on file");
    }
    // Funny note
    const tier = out.score <= 3 ? 0 : out.score <= 6 ? 1 : out.score <= 8 ? 2 : 3;
    const notes = RECEIPT_NOTES[tier];
    addReceiptItem("Field note", notes[Math.floor(Math.random() * notes.length)]);

    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function addReceiptItem(label, value) {
    const li = document.createElement('li');
    const a = document.createElement('span'); a.className = 'lbl'; a.textContent = label;
    const b = document.createElement('span'); b.className = 'val'; b.textContent = value;
    li.append(a, b);
    receiptList.appendChild(li);
  }

  function labelize(v) {
    const pct = Math.round(v * 100);
    if (pct < 20) return pct + "% (negligible)";
    if (pct < 40) return pct + "% (light)";
    if (pct < 60) return pct + "% (notable)";
    if (pct < 80) return pct + "% (significant)";
    return pct + "% (extreme)";
  }

  function formatNow() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ----- Share / again ---------------------------------------------------
  shareBtn.addEventListener('click', async () => {
    if (lastScore == null) return;
    const txt = `\u{1F334} The State Street Sobriety Index \u{1F334}
Verdict: ${lastVerdict.title} (${lastScore}/10)
"${lastVerdict.flavor}"
Rx: ${lastVerdict.rx}
- Brought to you by the palms of 805.`;
    try {
      await navigator.clipboard.writeText(txt);
      toast("Verdict copied. Share responsibly.");
    } catch {
      toast("Couldn't copy. The seagulls intercepted it.");
    }
  });

  againBtn.addEventListener('click', () => {
    result.hidden = true;
    preview.hidden = true;
    currentImage = null;
    fileInput.value = '';
    cameraInput.value = '';
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ======================================================================
  // REFERENCE PHOTOS (calibration)
  // ======================================================================
  refInput.addEventListener('change', async e => {
    const files = [...e.target.files];
    for (const f of files) {
      await addReference(f);
    }
    refInput.value = '';
    renderRefs();
  });

  clearRefsBtn.addEventListener('click', () => {
    if (!confirm("Clear all reference photos? This cannot be undone.")) return;
    localStorage.removeItem(REF_KEY);
    renderRefs();
  });

  function addReference(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          // Compute features for this reference
          const features = extractFeatures(img);
          // Make a tiny thumbnail for display (so we don't bloat localStorage)
          const thumb = makeThumbnail(img, 200);
          const refs = loadRefs();
          refs.push({
            id: Date.now() + '_' + Math.floor(Math.random() * 9999),
            score: 5,
            thumb,
            features
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
    const ratio = Math.max(size / img.width, size / img.height);
    const dw = img.width * ratio, dh = img.height * ratio;
    ctx.drawImage(img, (size - dw)/2, (size - dh)/2, dw, dh);
    return c.toDataURL('image/jpeg', 0.78);
  }

  function loadRefs() {
    try {
      const raw = localStorage.getItem(REF_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveRefs(refs) {
    try {
      localStorage.setItem(REF_KEY, JSON.stringify(refs));
    } catch (e) {
      // Quota — drop oldest until it fits
      while (refs.length > 1) {
        refs.shift();
        try { localStorage.setItem(REF_KEY, JSON.stringify(refs)); return; } catch {}
      }
      toast("Out of browser storage for refs. Trim and try again.");
    }
  }

  function renderRefs() {
    const refs = loadRefs();
    refList.innerHTML = '';
    if (!refs.length) {
      const empty = document.createElement('p');
      empty.style.cssText = "color:var(--paper);text-shadow:1px 1px 0 rgba(0,0,0,.3);grid-column:1/-1;margin:0;font-size:.9rem;opacity:.85;";
      empty.textContent = "No references yet. Add a few photos and tag each one with how drunk that person actually was.";
      refList.appendChild(empty);
      return;
    }
    for (const r of refs) {
      const card = document.createElement('div');
      card.className = 'ref-card';

      const thumb = document.createElement('div');
      thumb.className = 'ref-thumb';
      thumb.style.backgroundImage = `url(${r.thumb})`;

      const body = document.createElement('div');
      body.className = 'ref-body';

      const lbl = document.createElement('label');
      lbl.textContent = "Drunkness";
      body.appendChild(lbl);

      const range = document.createElement('input');
      range.type = 'range';
      range.min = 1; range.max = 10; range.step = 1;
      range.value = r.score;
      body.appendChild(range);

      const row = document.createElement('div');
      row.className = 'ref-row';
      const sc = document.createElement('span');
      sc.className = 'ref-score';
      sc.textContent = r.score + '/10';
      const del = document.createElement('button');
      del.className = 'ref-del';
      del.type = 'button';
      del.textContent = "remove";
      row.append(sc, del);
      body.appendChild(row);

      range.addEventListener('input', () => {
        sc.textContent = range.value + '/10';
      });
      range.addEventListener('change', () => {
        const list = loadRefs();
        const item = list.find(x => x.id === r.id);
        if (item) {
          item.score = +range.value;
          saveRefs(list);
        }
      });
      del.addEventListener('click', () => {
        const list = loadRefs().filter(x => x.id !== r.id);
        saveRefs(list);
        renderRefs();
      });

      card.append(thumb, body);
      refList.appendChild(card);
    }
  }

  // ----- Toast helper -----------------------------------------------------
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
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ----- Init -------------------------------------------------------------
  renderRefs();

  // Click anywhere on the dropzone (but not the buttons) opens file picker
  dropzone.addEventListener('click', e => {
    if (e.target.closest('label.btn')) return; // labels handle their own input
    fileInput.click();
  });

})();
