"use client";
import { useEffect, useState } from "react";

export default function Perfil() {
  const [valor, setValor] = useState("");

  useEffect(() => {
    try {
      const guardado = localStorage.getItem("perfil");
      if (guardado) setValor(guardado);
    } catch (e) {}
  }, []);

  function cambiar(e) {
    setValor(e.target.value);
    try {
      localStorage.setItem("perfil", e.target.value);
    } catch (e2) {}
  }

  return (
    <textarea
      name="perfil"
      rows={4}
      value={valor}
      onChange={cambiar}
      placeholder="Your profile: experience, skills, education"
    />
  );
}
