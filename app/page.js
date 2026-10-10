import { sql } from "../lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import Boton from "./boton";
import Copiar from "./copiar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMITE_VISITAS = 10;

function token() {
  return createHash("sha256")
    .update("pa:" + (process.env.APP_PASSWORD || ""))
    .digest("hex");
}

async function esAdmin() {
  if (!process.env.APP_PASSWORD) return false;
  const c = await cookies();
  return c.get("auth")?.value === token();
}

async function entrar(formData) {
  "use server";
  const clave = String(formData.get("clave") || "");
  if (process.env.APP_PASSWORD && clave === process.env.APP_PASSWORD) {
    const c = await cookies();
    c.set("auth", token(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    redirect("/");
  }
  redirect("/?error=clave");
}

async function salir() {
  "use server";
  const c = await cookies();
  c.delete("auth");
  redirect("/");
}

async function analizar(formData) {
  "use server";
  const admin = await esAdmin();
  if (!admin) {
    const [{ n }] = await sql`select count(*)::int as n from applications
      where created_at > now() - interval '24 hours'`;
    if (n >= LIMITE_VISITAS) redirect("/?error=limite");
  }

  const perfil = String(formData.get("perfil") || "");
  const oferta = String(formData.get("oferta") || "");
  if (oferta.length < 40) redirect("/?error=oferta");

  const prompt = `You are a job application assistant. Reply ONLY with valid JSON, in English, with this exact shape:
{"puesto":"string (job title)","empresa":"string (company name)","puntaje":0,"resumen":"2 sentences on how well the candidate fits and what is missing","carta":"cover letter of 150 to 200 words, honest, without inventing experience, based only on the profile"}
"puntaje" is an integer from 0 to 100.

CANDIDATE PROFILE:
${perfil || "(no data: score low and suggest completing the profile)"}

JOB POSTING:
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
    values (${r.puesto || "Job title"}, ${r.empresa || ""}, ${Number(r.puntaje) || 0}, ${r.resumen || ""}, ${r.carta || ""})`;
  revalidatePath("/");
  redirect("/");
}

async function borrar(formData) {
  "use server";
  if (!(await esAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql`delete from applications where id = ${id}`;
  revalidatePath("/");
}

const css = `
  .header { display: flex; align-items: center; gap: 14px; padding: 18px; margin-bottom: 20px; border-radius: 20px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; box-shadow: 0 4px 14px rgba(79,70,229,0.3); }
  .header img { width: 56px; height: 56px; border-radius: 23%; flex-shrink: 0; box-shadow: 0 0 0 2px rgba(255,255,255,0.35); }
  .header h1 { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; line-height: 1.2; color: #fff; }
  .header p { margin: 2px 0 0; font-size: 0.88rem; opacity: 0.85; }
  .panel { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 28px; }
  .nota { margin: 4px 0 0; color: var(--muted); font-size: 0.8rem; text-align: center; }
  .lista-titulo { font-size: 1.05rem; font-weight: 700; margin: 0 0 12px; color: var(--title); }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .puesto { font-weight: 700; font-size: 1.05rem; line-height: 1.3; color: var(--title); }
  .empresa { color: var(--muted); font-size: 0.9rem; margin-top: 2px; }
  .badge { flex-shrink: 0; font-weight: 700; font-size: 0.9rem; padding: 6px 12px; border-radius: 999px; }
  .alto { background: #dcfce7; color: #166534; }
  .medio { background: #fef3c7; color: #92400e; }
  .bajo { background: #fee2e2; color: #991b1b; }
  .resumen { margin: 12px 0; font-size: 0.95rem; }
  .carta { white-space: pre-wrap; font-family: inherit; background: var(--soft); border-radius: 12px; padding: 14px; margin: 8px 0 0; font-size: 0.93rem; }
  .copiar
  .acciones { margin-top: 12px; }
  .card form .borrar { width: auto; background: transparent; color: #ef4444; border: 1px solid #fca5a5; padding: 7px 14px; font-size: 0.85rem; border-radius: 10px; }
  .salir { background: transparent; color: var(--muted); border: 1px solid var(--border); padding: 8px 14px; font-size: 0.85rem; width: auto !important; }
  .admin { margin-top: 32px; text-align: center; }
  .admin summary { color: var(--muted); font-weight: 400; font-size: 0.85rem; }
  .admin form { margin-top: 12px; text-align: left; }
  .aviso { background: #fef3c7; color: #92400e; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.95rem; }
  .vacio { text-align: center; color: var(--muted); padding: 24px 0; }
  @media (prefers-color-scheme: dark) {
    .alto { background: #14532d; color: #bbf7d0; }
    .medio { background: #713f12; color: #fde68a; }
    .bajo { background: #7f1d1d; color: #fecaca; }
    .aviso { background: #422006; color: #fde68a; }
  }
`;

function claseBadge(p) {
  if (p >= 70) return "badge alto";
  if (p >= 40) return "badge medio";
  return "badge bajo";
}

export default async function Home({ searchParams }) {
  const { error } = await searchParams;
  const admin = await esAdmin();
  const rows = await sql`select * from applications order by created_at desc`;
  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="header">
        <img src="/IMG_0453.jpeg" alt="Logo" />
        <div>
          <h1>Job Application Assistant</h1>
          <p>Analyze a job posting and generate your cover letter with AI</p>
        </div>
      </div>

      <form action={analizar} className="panel">
        <textarea name="perfil" rows={4} placeholder="Your profile: experience, skills, education" />
        <textarea name="oferta" rows={6} placeholder="Paste the job posting text here" required />
        <Boton texto="Analyze posting" cargando="Analyzing... (this may take a few seconds)" />
        {!admin && (
          <p className="nota">
            Public demo: results are visible to everyone. Please don't enter sensitive data.
          </p>
        )}
      </form>

      {error === "clave" && <div className="aviso">Incorrect password.</div>}
      {error === "oferta" && <div className="aviso">Please paste the full job posting text.</div>}
      {error === "ia" && <div className="aviso">The analysis failed. Please try again.</div>}
      {error === "limite" && (
        <div className="aviso">The demo limit has been reached for today. Please try again tomorrow.</div>
      )}

      <h2 className="lista-titulo">Applications</h2>
      {rows.length === 0 && <p className="vacio">No postings analyzed yet.</p>}

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
              <summary>View cover letter</summary>
              <pre className="carta">{x.carta}</pre>
            <Copiar texto={x.carta} />
            </details>
          )}
          {admin && (
            <form action={borrar} className="acciones">
              <input type="hidden" name="id" value={x.id} />
              <button type="submit" className="borrar">Delete</button>
            </form>
          )}
        </div>
      ))}

      <div className="admin">
        {admin ? (
          <form action={salir}>
            <button type="submit" className="salir">Sign out</button>
          </form>
        ) : (
          <details>
            <summary>I'm the owner</summary>
            <form action={entrar}>
              <input type="password" name="clave" placeholder="Password" required />
              <button type="submit">Sign in</button>
            </form>
          </details>
        )}
      </div>
    </main>
  );
}
