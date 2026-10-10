"use client";
import { useState } from "react";

export default function Copiar({ texto }) {
  const [ok, setOk] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch (e) {}
  }

  return (
    <button type="button" onClick={copiar} className="copiar">
      {ok ? "Copied!" : "Copy cover letter"}
    </button>
  );
}
