import { useState, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `You are an expert pawn shop appraiser with 20+ years of experience. When shown a photo of an item, identify it and provide a lending recommendation.

Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{
  "itemName": "Specific item name and description",
  "condition": "Excellent",
  "retailValue": 450,
  "resaleValue": 280,
  "lendAmount": 140,
  "lendPercent": 50,
  "confidence": "High",
  "reasoning": "Brief explanation of valuation",
  "tips": "Tips for the employee such as check serial number, test functionality, look for damage"
}

condition must be one of: Excellent, Good, Fair, Poor
confidence must be one of: High, Medium, Low
Be conservative with lending amounts. Return ONLY the JSON object.`;

export default function LendingEstimator() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    setImageMime(file.type || "image/jpeg");
    setResult(null); setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  }, []);

  const analyze = async () => {
    if (!imageBase64) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: imageMime, data: imageBase64 } },
            { type: "text", text: "Appraise this item for pawn lending." }
          ]}]
        }),
      });
      const data = await res.json();
      const text = (data.content || []).map(b => b.text || "").join("");
      setResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch { setError("Could not analyze. Try a clearer photo with better lighting."); }
    finally { setLoading(false); }
  };

  const reset = () => { setImage(null); setImageBase64(null); setResult(null); setError(null); };
  const cColor = c => ({ Excellent:"#22c55e",Good:"#84cc16",Fair:"#f59e0b",Poor:"#ef4444" }[c]||"#888");
  const cfColor = c => ({ High:"#22c55e",Medium:"#f59e0b",Low:"#ef4444" }[c]||"#888");

  const S = {
    page: { minHeight:"100vh",background:"#0a0a0f",fontFamily:"Georgia,serif",color:"#e8e0d0" },
    header: { background:"linear-gradient(135deg,#1a1206,#0a0a0f)",borderBottom:"1px solid #2a2010",padding:"18px 20px",display:"flex",alignItems:"center",gap:12 },
    logo: { width:42,height:42,background:"linear-gradient(135deg,#d4a843,#8b6914)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 12px rgba(212,168,67,0.3)" },
    body: { maxWidth:460,margin:"0 auto",padding:"22px 16px" },
    goldBtn: (dis) => ({ width:"100%",padding:16,background:dis?"#2a2010":"linear-gradient(135deg,#d4a843,#8b6914)",border:"none",borderRadius:12,color:dis?"#6b5a30":"#0a0a0f",fontSize:16,fontWeight:"bold",cursor:dis?"not-allowed":"pointer",boxShadow:dis?"none":"0 4px 20px rgba(212,168,67,0.35)" }),
    ghostBtn: { width:"100%",padding:15,background:"transparent",border:"1px solid #2a2010",borderRadius:12,color:"#6b5a30",fontSize:15,cursor:"pointer" },
    card: { background:"#111108",border:"1px solid #2a2010",borderRadius:16,padding:18,marginBottom:14 },
    label: { fontSize:11,color:"#6b5a30",textTransform:"uppercase",letterSpacing:2,marginBottom:10 },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logo}>💰</div>
        <div>
          <div style={{ fontSize:19,fontWeight:"bold",color:"#d4a843",letterSpacing:1 }}>LoanLens</div>
          <div style={{ fontSize:10,color:"#6b5a30",textTransform:"uppercase",letterSpacing:2 }}>Instant Item Appraisal</div>
        </div>
      </div>

      <div style={S.body}>
        {!image && <>
          <div
            onDragOver={e=>{e.preventDefault();setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);processFile(e.dataTransfer.files[0])}}
            onClick={()=>fileInputRef.current.click()}
            style={{ border:`2px dashed ${dragOver?"#d4a843":"#2a2010"}`,borderRadius:16,padding:"48px 20px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(212,168,67,0.05)":"rgba(255,255,255,0.02)",marginBottom:12 }}
          >
            <div style={{ fontSize:44,marginBottom:10 }}>📸</div>
            <div style={{ fontSize:15,color:"#c8b87a",marginBottom:4 }}>Drop a photo here</div>
            <div style={{ fontSize:12,color:"#4a3d1e" }}>or tap to choose from gallery</div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>processFile(e.target.files[0])} />
          </div>
          <button style={S.goldBtn(false)} onClick={()=>cameraInputRef.current.click()}>📷 Take a Photo</button>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e=>processFile(e.target.files[0])} />
        </>}

        {image && !result && <>
          <div style={{ borderRadius:16,overflow:"hidden",marginBottom:14,border:"1px solid #2a2010",position:"relative" }}>
            <img src={image} alt="item" style={{ width:"100%",display:"block",maxHeight:320,objectFit:"cover" }} />
            <button onClick={reset} style={{ position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:13 }}>✕ Retake</button>
          </div>
          <button style={S.goldBtn(loading)} onClick={analyze} disabled={loading}>
            {loading ? "🔍 Appraising..." : "💰 Get Lending Value"}
          </button>
          {loading && <div style={{ textAlign:"center",marginTop:14,color:"#6b5a30",fontSize:13 }}>Analyzing brand, condition & market value...</div>}
        </>}

        {error && <div style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:14,marginTop:10,color:"#ef4444",fontSize:14 }}>⚠️ {error}</div>}

        {result && <>
          <div style={{ borderRadius:16,overflow:"hidden",marginBottom:14,position:"relative" }}>
            <img src={image} alt="item" style={{ width:"100%",display:"block",maxHeight:220,objectFit:"cover" }} />
            <div style={{ position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.9))",padding:"28px 14px 12px" }}>
              <div style={{ fontSize:16,fontWeight:"bold",color:"#fff" }}>{result.itemName}</div>
              <div style={{ display:"flex",gap:8,marginTop:6,flexWrap:"wrap" }}>
                {[{l:result.condition,c:cColor(result.condition)},{l:result.confidence+" Confidence",c:cfColor(result.confidence)}].map(b=>(
                  <span key={b.l} style={{ background:b.c+"22",border:`1px solid ${b.c}44`,color:b.c,borderRadius:6,padding:"2px 9px",fontSize:11 }}>{b.l}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background:"linear-gradient(135deg,#1a1206,#0f0c04)",border:"1px solid #d4a84344",borderRadius:16,padding:22,textAlign:"center",marginBottom:14,boxShadow:"0 8px 32px rgba(212,168,67,0.15)" }}>
            <div style={S.label}>Recommended Loan Amount</div>
            <div style={{ fontSize:52,fontWeight:"bold",color:"#d4a843",lineHeight:1,textShadow:"0 0 40px rgba(212,168,67,0.4)" }}>${result.lendAmount?.toLocaleString()}</div>
            <div style={{ fontSize:12,color:"#6b5a30",marginTop:6 }}>{result.lendPercent}% of resale value</div>
          </div>

          <div style={S.card}>
            <div style={S.label}>Value Breakdown</div>
            {[["Retail / New Value",result.retailValue,"#e8e0d0",false],["Current Resale Value",result.resaleValue,"#c8b87a",false],["Loan Amount",result.lendAmount,"#d4a843",true]].map(([label,val,color,bold])=>(
              <div key={label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #1a1206" }}>
                <span style={{ fontSize:13,color:"#6b5a30" }}>{label}</span>
                <span style={{ fontSize:bold?17:14,fontWeight:bold?"bold":"normal",color }}>${val?.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.label}>Appraisal Notes</div>
            <div style={{ fontSize:14,color:"#c8b87a",lineHeight:1.6 }}>{result.reasoning}</div>
          </div>

          {result.tips && <div style={{ background:"rgba(212,168,67,0.06)",border:"1px solid rgba(212,168,67,0.2)",borderRadius:16,padding:18,marginBottom:18 }}>
            <div style={{ fontSize:11,color:"#d4a843",textTransform:"uppercase",letterSpacing:2,marginBottom:10 }}>⚡ Employee Checklist</div>
            <div style={{ fontSize:14,color:"#c8b87a",lineHeight:1.6 }}>{result.tips}</div>
          </div>}

          <button style={S.ghostBtn} onClick={reset}>+ Appraise Another Item</button>
        </>}
      </div>
      <style>{"* { box-sizing: border-box; }"}</style>
    </div>
  );
}