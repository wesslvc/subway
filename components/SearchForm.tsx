"use client";

import { useState, FormEvent } from "react";

interface SearchFormProps {
  onSearch: (from: string, to: string) => void;
  isLoading: boolean;
}

const inputStyle: React.CSSProperties = {
  backgroundColor: "#141414",
  border: "1px solid #2A2A2A",
  color: "#fff",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "1.1rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  outline: "none",
  width: "100%",
  padding: "10px 14px",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.65rem",
  fontWeight: 700,
  letterSpacing: "0.25em",
  textTransform: "uppercase" as const,
  color: "#555",
  display: "block",
  marginBottom: "4px",
};

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromFocus, setFromFocus] = useState(false);
  const [toFocus, setToFocus] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const f = from.trim();
    const t = to.trim();
    if (f && t) onSearch(f, t);
  }

  function handleSwap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col sm:flex-row items-end gap-2">

        {/* From */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={labelStyle}>출발역</label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#22C55E",
                flexShrink: 0,
              }}
            />
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onFocus={() => setFromFocus(true)}
              onBlur={() => setFromFocus(false)}
              placeholder="상일동, 강남, 홍대입구..."
              disabled={isLoading}
              style={{
                ...inputStyle,
                paddingLeft: 28,
                borderColor: fromFocus ? "#2563EB" : "#2A2A2A",
              }}
            />
          </div>
        </div>

        {/* Swap button */}
        <button
          type="button"
          onClick={handleSwap}
          disabled={isLoading}
          title="출발/도착 바꾸기"
          style={{
            backgroundColor: "#1A1A1A",
            border: "1px solid #2A2A2A",
            color: "#888",
            padding: "10px 12px",
            cursor: "pointer",
            fontSize: "1rem",
            transition: "all 0.15s",
            flexShrink: 0,
            marginBottom: "0px",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#888"; }}
        >
          ⇄
        </button>

        {/* To */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={labelStyle}>도착역</label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#EF4444",
                flexShrink: 0,
              }}
            />
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onFocus={() => setToFocus(true)}
              onBlur={() => setToFocus(false)}
              placeholder="잠실, 여의도, 서울역..."
              disabled={isLoading}
              style={{
                ...inputStyle,
                paddingLeft: 28,
                borderColor: toFocus ? "#2563EB" : "#2A2A2A",
              }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !from.trim() || !to.trim()}
          style={{
            backgroundColor: isLoading || !from.trim() || !to.trim() ? "#1A1A1A" : "#2563EB",
            border: "1px solid transparent",
            color: isLoading || !from.trim() || !to.trim() ? "#444" : "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "1rem",
            fontWeight: 800,
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
            padding: "10px 24px",
            cursor: isLoading || !from.trim() || !to.trim() ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            flexShrink: 0,
            whiteSpace: "nowrap" as const,
          }}
        >
          {isLoading ? "탐색 중..." : "길찾기 →"}
        </button>
      </div>
    </form>
  );
}
