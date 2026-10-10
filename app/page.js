import { sql } from "../lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Boton from "./boton";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function analizar(formData) {
  "use server";
  const perfil = String(formData.get("perfil") || "");
  const oferta = String(formData.get("oferta") || "");
  if (oferta.length < 40) redirect("/?error=oferta");

  const prompt = `Sos un asistente de empleo. Respondé SOLO con JSON válido, en español rioplatense, con esta forma exacta:
{"puesto":"string","empresa":"string","puntaje":0,"resumen":"2 frases sobre qué tan bien encaja y qué le falta","carta":"carta de presentación de 150 a 200 palabras, honesta, sin inventar experiencia, basada solo en el perfil"}
"puntaje" es un número entero de 0 a 100.

PERFIL DEL CANDIDATO:
${perfil || "(sin datos: puntuá bajo y sugerí completar el perfil)"}

OFERTA:
${oferta}`;

  let r = null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = (data.content || []).map((c) => c.text || "").join("");
      r = JSON.parse(text.replace(/```json|```/g, "").trim());
    }
  } catch (e) {
    r = null;
  }
  if (!r) redirect("/?error=ia");

  await sql`insert into applications (puesto, empresa, puntaje, resumen, carta)
    values (${r.puesto || "Puesto"}, ${r.empresa || ""}, ${Number(r.puntaje) || 0}, ${r.resumen || ""}, ${r.carta || ""})`;
  revalidatePath("/");
  redirect("/");
}

async function borrar(formData) {
  "use server";
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql`delete from applications where id = ${id}`;
  revalidatePath("/");
}

export default async function Home({ searchParams }) {
  const { error } = await searchParams;
  const rows = await sql`select * from applications order by created_at desc`;
  return (
    <main>
      <h1>Asistente de postulaciones</h1>
      <form action={analizar} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <textarea name="perfil" rows={4} placeholder="Tu perfil: experiencia, habilidades, estudios" />
        <textarea name="oferta" rows={6} placeholder="Pegá acá el texto de la oferta" required />
        <Boton texto="Analizar oferta" cargando="Analizando... (puede tardar unos segundos)" />
      </form>
      {error === "oferta" && <p>Pegá el texto completo de la oferta.</p>}
      {error === "ia" && <p>No se pudo analizar. Probá de nuevo.</p>}
      {rows.length === 0 && <p>Todavía no analizaste ninguna.</p>}
      {rows.map((x) => (
        <div key={x.id} style={{ borderTop: "1px solid #ddd", padding: "10px 0" }}>
          <b>{x.puesto}</b> · {x.empresa} · {x.puntaje != null ? x.puntaje + "%" : ""}
          {x.resumen && <p>{x.resumen}</p>}
          {x.carta && (
            <details>
              <summary>Ver carta</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{x.carta}</pre>
            </details>
          )}
          <form action={borrar} style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={x.id} />
            <button type="submit">Borrar</button>
          </form>
        </div>
      ))}
    </main>
  );
}
