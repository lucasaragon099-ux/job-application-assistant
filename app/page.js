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

const css = `
  .sub { color: #6b7280; margin: -12px 0 22px; font-size: 0.95rem; }
  .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 28px; }
  .panel textarea { margin-bottom: 10px; background: #f9fafb; box-shadow: none; }
  .lista-titulo { font-size: 1.05rem; font-weight: 700; margin: 0 0 12px; color: #374151; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .puesto { font-weight: 700; font-size: 1.05rem; line-height: 1.3; color: #111827; }
  .empresa { color: #6b7280; font-size: 0.9rem; margin-top: 2px; }
  .badge { flex-shrink: 0; font-weight: 700; font-size: 0.9rem; padding: 6px 12px; border-radius: 999px; }
  .alto { background: #dcfce7; color: #166534; }
  .medio { background: #fef3c7; color: #92400e; }
  .bajo { background: #fee2e2; color: #991b1b; }
  .resumen { margin: 12px 0; color: #374151; font-size: 0.95rem; }
  .carta { white-space: pre-wrap; font-family: inherit; background: #f5f6fa; border-radius: 12px; padding: 14px; margin: 8px 0 0; font-size: 0.93rem; }
  .card form .borrar { width: auto; background: transparent; color: #dc2626; border: 1px solid #fecaca; padding: 7px 14px; font-size: 0.85rem; border-radius: 10px; }
  .acciones { margin-top: 12px; }
  .aviso { background: #fef3c7; color: #92400e; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.95rem; }
  .vacio { text-align: center; color: #9ca3af; padding: 24px 0; }
`;

function claseBadge(p) {
  if (p >= 70) return "badge alto";
  if (p >= 40) return "badge medio";
  return "badge bajo";
}

export default async function Home({ searchParams }) {
  const { error } = await searchParams;
  const rows = await sql`select * from applications order by created_at desc`;
  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <h1>Asistente de postulaciones</h1>
      <p className="sub">Analizá una oferta y generá tu carta con IA</p>

      <form action={analizar} className="panel">
        <textarea name="perfil" rows={4} placeholder="Tu perfil: experiencia, habilidades, estudios" />
        <textarea name="oferta" rows={6} placeholder="Pegá acá el texto de la oferta" required />
        <Boton texto="Analizar oferta" cargando="Analizando... (puede tardar unos segundos)" />
      </form>

      {error === "oferta" && <div className="aviso">Pegá el texto completo de la oferta.</div>}
      {error === "ia" && <div className="aviso">No se pudo analizar. Probá de nuevo.</div>}

      <h2 className="lista-titulo">Mis postulaciones</h2>
      {rows.length === 0 && <p className="vacio">Todavía no analizaste ninguna.</p>}

      {rows.map((x) => (
        <div key={x.id} className="card">
          <div className="card-top">
            <div>
              <div className="puesto">{x.puesto}</div>
              {x.empresa && <div className="empresa">{x.empresa}</div>}
            </div>
            {x.puntaje != null && (
              <span className={claseBadge(x.puntaje)}>{x.puntaje}%</span>
            )}
          </div>
          {x.resumen && <p className="resumen">{x.resumen}</p>}
          {x.carta && (
            <details>
              <summary>Ver carta</summary>
              <pre className="carta">{x.carta}</pre>
            </details>
          )}
          <form action={borrar} className="acciones">
            <input type="hidden" name="id" value={x.id} />
            <button type="submit" className="borrar">Borrar</button>
          </form>
        </div>
      ))}
    </main>
  );
}
