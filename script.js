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

  // ----- Verdict text ----------------------------------------------------
  const VERDICTS = [
    { title: "Mission Bell",                flavor: "Sober as 6 a.m. mass at the Old Mission. Disturbingly hydrated.",                 rx: "One acai bowl from Backyard Bowls. You earned it." },
    { title: "Backyard Bowl",               flavor: "Smoothie-in-hand energy. A walking yoga retreat.",                                  rx: "Light kombucha. Stay the course." },
    { title: "One IPA at Brass Bear",       flavor: "Cheeks pink-adjacent. Suddenly an expert on the Santa Ynez AVA.",                  rx: "One more pint. Then water. Yes, water." },
    { title: "Funk Zone Float",             flavor: "Two pours into the Urban Wine Trail. Tote bag deployed. Peak hospitality.",        rx: "Pretzel. Stretch. Refuse the third tasting." },
    { title: "Sandbar Survivor",            flavor: "Solid buzz. Eyes 60% open, 100% sincere. Has Stearns Wharf parking opinions.",     rx: "Tacos. A whole basket. Order them yourself." },
    { title: "Joe's Mai Tai",               flavor: "The legendary Joe's mai tai is hitting. Has, against all advice, ordered a second.", rx: "Walk to the beach. Look at one (1) pelican." },
    { title: "Wildcat Wobble",              flavor: "State Street is rotating at a leisurely 0.5 RPM. Loves a stranger now.",           rx: "Hand over the keys. Hand over the phone. Lyft." },
    { title: "Stearns Wharf Stumble",       flavor: "One wrong step from the Pacific. Believes the seagulls are listening. They are.",  rx: "Sit. On a bench. Inland-facing. Drink water." },
    { title: "Isla Vista Insomniac",        flavor: "DP party went too far. Currently barefoot. Phone at 7%.",                          rx: "Tap water. Big slice of pizza. Bed, alone." },
    { title: "Found-on-the-Beach-at-Dawn",  flavor: "Sunrise at Leadbetter, sand in places sand should not be. Will swear off tequila.", rx: "Gatorade. Esau's breakfast. Apologize to everyone." }
  ];

  const RECEIPT_NOTES = [
    ["Could probably do my taxes", "Eyes alarmingly open", "Posture: librarian-grade"],
    ["Vibes: vacationing", "Could parallel park, slowly", "Speaking only in restaurant recs"],
    ["Vibes: aggressively un-ironic", "Has declared 'I love this song' to silence", "Believes they invented karaoke"],
    ["Walking on a noticeable diagonal", "Lost one shoe, gained one number", "Convinced seagulls owe them money"]
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

    if (n === 0) return { luminance: .5, saturation: .5, flush: 0, warmth: 0, pink: 0, sharpness: .5, blur: .5 };

    const rAvg = rSum/n, gAvg = gSum/n, bAvg = bSum/n;
    return {
      luminance:  (lumSum/n)/255,
      saturation: satSum/n,
      flush:      (rAvg - (gAvg+bAvg)/2)/255,
      warmth:     (warm-cool)/n,
      pink:       pink/n,
      sharpness:  Math.min(1, (edgeSum/eN)/40),
      blur:       1 - Math.min(1, (edgeSum/eN)/40)
    };
  }

  function scoreFeatures(f, refs) {
    const flush     = clamp(f.flush * 4 + f.pink * 2.5, 0, 1);
    const eyeDroop  = clamp((1 - f.luminance) * 0.5 + (1 - f.sharpness) * 0.6, 0, 1);
    const stability = clamp(f.blur, 0, 1);
    const vibe      = clamp((f.warmth + 1)/2 * 0.6 + f.saturation * 0.4, 0, 1);

    let raw = flush * 0.40 + eyeDroop * 0.20 + stability * 0.20 + vibe * 0.20;

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
      const refWeight = 0.35 + closeness * 0.45;
      raw = raw * (1 - refWeight) + refNorm * refWeight;
    }

    const score = Math.max(1, Math.min(10, Math.round(raw * 9 + 1)));
    return { score, components: { flush, eyeDroop, stability, vibe }, matched };
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

    // Receipt
    receiptList.innerHTML = '';
    pushReceipt("Cheek flush",         pct(out.components.flush));
    pushReceipt("Eye droop",           pct(out.components.eyeDroop));
    pushReceipt("Photo stability",     pct(1 - out.components.stability) + " (steadier=lower)");
    pushReceipt("Sunset vibe",         pct(out.components.vibe));
    pushReceipt("Closest reference",   out.matched ? `#${(out.matched.id+'').slice(-4)} (${out.matched.score}/10)` : "none on file");
    const tier = out.score <= 3 ? 0 : out.score <= 6 ? 1 : out.score <= 8 ? 2 : 3;
    const notes = RECEIPT_NOTES[tier];
    pushReceipt("Field note", notes[Math.floor(Math.random() * notes.length)]);

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

  // ----- Init ------------------------------------------------------------
  renderRefs();

  // Pause stream when tab is hidden (saves battery on iOS)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopStream();
  });

})();
