import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  ScanLine,
  X,
  Trash2,
  Loader2,
  Sparkles,
  ImageOff,
  Tag,
  Palette,
  Type as TypeIcon,
  Eye,
  Clock,
  AlertCircle,
} from "lucide-react";

const FONT_IMPORT_ID = "vision-lab-fonts";

function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_IMPORT_ID)) return;
  const style = document.createElement("style");
  style.id = FONT_IMPORT_ID;
  style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
  `;
  document.head.appendChild(style);
}

// ---------- helpers ----------

function resizeImage(file, maxDim, quality, mime = "image/jpeg") {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(mime, quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl) {
  const idx = dataUrl.indexOf(",");
  return dataUrl.slice(idx + 1);
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

async function analyzeImage(base64Jpeg) {
  const prompt = `You are an expert computer vision analyst. Look at this image very carefully and respond ONLY with a single valid JSON object, no markdown fences, no preamble, no explanation outside the JSON. Use this exact shape:

{
  "title": "short 3-6 word title for the image",
  "description": "a rich, detailed paragraph (4-6 sentences) describing everything visible in the image: subjects, setting, actions, composition, lighting, mood",
  "objects": ["object1", "object2", "..."],
  "scene": "one short phrase describing the overall scene/setting/category (e.g. 'indoor portrait', 'city street at night', 'product photo')",
  "colors": [{"name": "color name", "hex": "#rrggbb"}],
  "text_detected": "any readable text found in the image, or null if none",
  "mood_tags": ["tag1", "tag2", "tag3"],
  "notable_details": ["a few surprising or specific details worth calling out"]
}

Give at most 8 objects, at most 5 colors, at most 5 mood_tags, at most 4 notable_details. Be specific and accurate, do not invent details you cannot see.`;

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image: base64Jpeg, prompt }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("No response from model");

  let clean = textBlock.text.trim();
  clean = clean.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("Could not parse model response");
    }
  }
  return parsed;
}

// ---------- storage ----------

const GALLERY_KEY = "vision-lab-gallery";

async function loadGallery() {
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

async function saveGallery(entries) {
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Storage error", e);
  }
}

// ---------- UI subcomponents ----------

function Reticle({ active }) {
  const corner =
    "absolute w-6 h-6 border-[color:var(--cyan)] transition-opacity duration-500";
  return (
    <>
      <div
        className={`${corner} top-3 left-3 border-t-2 border-l-2`}
        style={{ opacity: active ? 1 : 0.5 }}
      />
      <div
        className={`${corner} top-3 right-3 border-t-2 border-r-2`}
        style={{ opacity: active ? 1 : 0.5 }}
      />
      <div
        className={`${corner} bottom-3 left-3 border-b-2 border-l-2`}
        style={{ opacity: active ? 1 : 0.5 }}
      />
      <div
        className={`${corner} bottom-3 right-3 border-b-2 border-r-2`}
        style={{ opacity: active ? 1 : 0.5 }}
      />
    </>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={13} style={{ color: "var(--cyan)" }} />
      <span
        className="text-[11px] tracking-[0.18em] uppercase"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)" }}
      >
        {children}
      </span>
    </div>
  );
}

function ColorSwatch({ hex, name }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div
        className="w-4 h-4 rounded-sm border"
        style={{ backgroundColor: hex, borderColor: "var(--border)" }}
      />
      <span
        className="text-xs"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text)" }}
      >
        {name}
      </span>
      <span
        className="text-[10px]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)" }}
      >
        {hex}
      </span>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span
      className="text-xs px-2 py-1 rounded-full border"
      style={{
        fontFamily: "'Inter', sans-serif",
        color: "var(--amber)",
        borderColor: "rgba(242,166,90,0.35)",
        backgroundColor: "rgba(242,166,90,0.08)",
      }}
    >
      {children}
    </span>
  );
}

// ---------- main component ----------

export default function VisionLab() {
  useEffect(() => {
    ensureFonts();
  }, []);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzeBase64, setAnalyzeBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | analyzing | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadGallery().then((g) => {
      setGallery(g);
      setGalleryLoaded(true);
    });
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setErrorMsg("");
    setResult(null);
    setActiveEntryId(null);
    setStatus("idle");
    try {
      const previewDataUrl = await resizeImage(file, 900, 0.85);
      const analyzeDataUrl = await resizeImage(file, 1024, 0.8);
      const thumbDataUrl = await resizeImage(file, 180, 0.7);
      setPreviewUrl(previewDataUrl);
      setAnalyzeBase64({
        forApi: dataUrlToBase64(analyzeDataUrl),
        thumb: thumbDataUrl,
      });
    } catch (e) {
      setErrorMsg("Could not load the image. Please try again.");
      setStatus("error");
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!analyzeBase64) return;
    setStatus("analyzing");
    setErrorMsg("");
    try {
      const parsed = await analyzeImage(analyzeBase64.forApi);
      setResult(parsed);
      setStatus("done");

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        thumb: analyzeBase64.thumb,
        result: parsed,
      };
      const nextGallery = [entry, ...gallery].slice(0, 40);
      setGallery(nextGallery);
      setActiveEntryId(entry.id);
      saveGallery(nextGallery);
    } catch (e) {
      console.error(e);
      setErrorMsg("Analysis failed. Please try again.");
      setStatus("error");
    }
  }, [analyzeBase64, gallery]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const openEntry = (entry) => {
    setPreviewUrl(entry.thumb);
    setResult(entry.result);
    setStatus("done");
    setActiveEntryId(entry.id);
    setAnalyzeBase64(null);
  };

  const deleteEntry = (id, e) => {
    e.stopPropagation();
    const next = gallery.filter((g) => g.id !== id);
    setGallery(next);
    saveGallery(next);
    if (activeEntryId === id) {
      setActiveEntryId(null);
    }
  };

  const reset = () => {
    setPreviewUrl(null);
    setAnalyzeBase64(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setActiveEntryId(null);
  };

  return (
    <div
      style={{
        "--bg": "#0D1315",
        "--panel": "#141C1F",
        "--panel2": "#101719",
        "--border": "#233033",
        "--cyan": "#00E6C3",
        "--amber": "#F2A65A",
        "--text": "#EAF1F0",
        "--muted": "#7C8C8C",
        "--danger": "#E8746A",
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'Inter', sans-serif",
        minHeight: "100%",
      }}
      className="w-full min-h-screen px-4 py-8 md:px-10 md:py-10"
    >
      <style>{`
        @keyframes scanSweep {
          0% { top: -4%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 104%; opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,230,195,0.0); }
          50% { box-shadow: 0 0 24px 2px rgba(0,230,195,0.12); }
        }
        .vl-scanline {
          animation: scanSweep 1.8s linear infinite;
        }
        .vl-frame {
          animation: pulseGlow 2.4s ease-in-out infinite;
        }
        .vl-fadein {
          animation: vlFadeIn 0.5s ease both;
        }
        @keyframes vlFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .vl-scroll::-webkit-scrollbar { height: 6px; }
        .vl-scroll::-webkit-scrollbar-thumb { background: #26343780; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center"
            style={{ border: "1px solid var(--border)", color: "var(--cyan)" }}
          >
            <ScanLine size={18} />
          </div>
          <div>
            <h1
              className="text-xl md:text-2xl tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
            >
              Vision Lab
            </h1>
            <p
              className="text-[11px] tracking-[0.15em] uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted)" }}
            >
              See · Understand · Know
            </p>
          </div>
        </div>
        {gallery.length > 0 && (
          <div
            className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
            style={{
              border: "1px solid var(--border)",
              color: "var(--muted)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Clock size={12} />
            {gallery.length} scans saved
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
        {/* Left: upload / preview */}
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !previewUrl && fileInputRef.current?.click()}
            className={`relative rounded-xl overflow-hidden flex items-center justify-center ${
              !previewUrl ? "cursor-pointer" : ""
            } ${status === "analyzing" ? "vl-frame" : ""}`}
            style={{
              border: `1.5px dashed ${dragOver ? "var(--cyan)" : "var(--border)"}`,
              backgroundColor: "var(--panel2)",
              minHeight: "360px",
              transition: "border-color 0.2s",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />

            {!previewUrl && (
              <div className="text-center px-6">
                <Upload
                  size={28}
                  className="mx-auto mb-3"
                  style={{ color: "var(--muted)" }}
                />
                <p className="text-sm mb-1" style={{ color: "var(--text)" }}>
                  Drop an image here or click to upload
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  JPG · PNG · WEBP
                </p>
              </div>
            )}

            {previewUrl && (
              <>
                <img
                  src={previewUrl}
                  alt="uploaded preview"
                  className="w-full h-full object-contain"
                  style={{ maxHeight: "460px" }}
                />
                <Reticle active={status === "analyzing"} />
                {status === "analyzing" && (
                  <div
                    className="vl-scanline absolute left-0 right-0 h-[2px]"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, var(--cyan), transparent)",
                    }}
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(13,19,21,0.85)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>

          {previewUrl && analyzeBase64 && status !== "analyzing" && (
            <button
              onClick={runAnalysis}
              className="w-full mt-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--cyan)",
                color: "#06201B",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Sparkles size={16} />
              Analyze Image
            </button>
          )}

          {status === "analyzing" && (
            <div
              className="w-full mt-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm"
              style={{
                border: "1px solid var(--border)",
                color: "var(--cyan)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <Loader2 size={15} className="animate-spin" />
              Scanning image...
            </div>
          )}

          {status === "error" && (
            <div
              className="w-full mt-4 py-3 px-4 rounded-lg flex items-center gap-2 text-sm"
              style={{
                border: "1px solid rgba(232,116,106,0.4)",
                color: "var(--danger)",
                backgroundColor: "rgba(232,116,106,0.06)",
              }}
            >
              <AlertCircle size={15} />
              {errorMsg}
            </div>
          )}

          {!previewUrl && (
            <p
              className="text-xs mt-3 text-center"
              style={{ color: "var(--muted)" }}
            >
              Upload any photo — Claude will look at it and give you the full details
            </p>
          )}
        </div>

        {/* Right: report */}
        <div
          className="rounded-xl p-5 md:p-6"
          style={{
            backgroundColor: "var(--panel)",
            border: "1px solid var(--border)",
            minHeight: "360px",
          }}
        >
          {!result && status !== "analyzing" && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <ImageOff size={26} style={{ color: "var(--muted)" }} className="mb-3" />
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Your analysis report will appear here
              </p>
            </div>
          )}

          {status === "analyzing" && !result && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <Loader2
                size={22}
                className="animate-spin mb-3"
                style={{ color: "var(--cyan)" }}
              />
              <p
                className="text-xs"
                style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}
              >
                Reading the image...
              </p>
            </div>
          )}

          {result && (
            <div className="vl-fadein">
              <div className="flex items-start justify-between mb-4">
                <h2
                  className="text-lg md:text-xl"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
                >
                  {result.title}
                </h2>
                {result.scene && (
                  <span
                    className="text-[10px] px-2 py-1 rounded whitespace-nowrap ml-3"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--cyan)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {result.scene}
                  </span>
                )}
              </div>

              <div className="mb-5">
                <SectionLabel icon={Eye}>Description</SectionLabel>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                  {result.description}
                </p>
              </div>

              {Array.isArray(result.objects) && result.objects.length > 0 && (
                <div className="mb-5">
                  <SectionLabel icon={Tag}>Objects Detected</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {result.objects.map((o, i) => (
                      <Chip key={i}>{o}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(result.colors) && result.colors.length > 0 && (
                <div className="mb-5">
                  <SectionLabel icon={Palette}>Colors</SectionLabel>
                  <div className="flex flex-wrap gap-x-5 gap-y-0.5">
                    {result.colors.map((c, i) => (
                      <ColorSwatch key={i} hex={c.hex} name={c.name} />
                    ))}
                  </div>
                </div>
              )}

              {result.text_detected && (
                <div className="mb-5">
                  <SectionLabel icon={TypeIcon}>Text Found</SectionLabel>
                  <p
                    className="text-sm px-3 py-2 rounded"
                    style={{
                      backgroundColor: "var(--panel2)",
                      border: "1px solid var(--border)",
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--amber)",
                    }}
                  >
                    {result.text_detected}
                  </p>
                </div>
              )}

              {Array.isArray(result.notable_details) &&
                result.notable_details.length > 0 && (
                  <div className="mb-1">
                    <SectionLabel icon={Sparkles}>Notable Details</SectionLabel>
                    <ul className="space-y-1">
                      {result.notable_details.map((d, i) => (
                        <li
                          key={i}
                          className="text-sm flex gap-2"
                          style={{ color: "var(--text)" }}
                        >
                          <span style={{ color: "var(--cyan)" }}>·</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {Array.isArray(result.mood_tags) && result.mood_tags.length > 0 && (
                <div
                  className="flex flex-wrap gap-1.5 mt-4 pt-4"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  {result.mood_tags.map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] uppercase tracking-wide px-2 py-1 rounded"
                      style={{
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      {galleryLoaded && gallery.length > 0 && (
        <div className="max-w-6xl mx-auto mt-8">
          <SectionLabel icon={Clock}>Gallery / History</SectionLabel>
          <div className="flex gap-3 overflow-x-auto vl-scroll pb-2">
            {gallery.map((entry) => (
              <div
                key={entry.id}
                onClick={() => openEntry(entry)}
                className="relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer group"
                style={{
                  width: "100px",
                  height: "100px",
                  border:
                    activeEntryId === entry.id
                      ? "2px solid var(--cyan)"
                      : "1px solid var(--border)",
                }}
              >
                <img
                  src={entry.thumb}
                  alt={entry.result?.title || "scan"}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-x-0 bottom-0 px-1.5 py-1"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
                  }}
                >
                  <p
                    className="text-[9px] truncate"
                    style={{ color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {timeAgo(entry.timestamp)}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteEntry(entry.id, e)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
                  style={{
                    backgroundColor: "rgba(13,19,21,0.85)",
                    color: "var(--danger)",
                  }}
                  title="Delete"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
