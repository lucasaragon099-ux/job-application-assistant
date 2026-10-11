import { sql } from "../lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import Boton from "./boton";
import Copiar from "./copiar";
import Perfil from "./perfil";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMITE_VISITAS = 10;
const LIMITE_COMPARACIONES = 5;

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
{"puesto":"string (job title)","empresa":"string (company name)","puntaje":0,"resumen":"2 sentences on how well the candidate fits and what is missing","requisitos":[{"requisito":"string","obligatorio":true,"estado":"met","evidencia":"string"}],"alertas":[{"titulo":"string","detalle":"string","gravedad":"high"}],"carta":"cover letter of 150 to 200 words, honest, without inventing experience, based only on the profile"}

Rules for "requisitos":
- The 5 to 10 most important requirements of the job posting (skills, tools, experience, education, languages).
- "obligatorio": true if the posting presents it as required, false if it is nice to have.
- "estado": "met" only if the profile clearly shows it, "partial" if there is related but incomplete evidence, "missing" if the profile has no evidence.
- "evidencia": a short phrase from the profile that supports the status, or "Not found in profile" when missing. Never invent evidence.

Rules for "alertas":
- Flag only real warning signs that are present in the job posting text, for example: asking the candidate to pay money or buy something, vague or hidden company identity, unrealistic pay or promises, unpaid trial work, asking for sensitive documents or bank data early, contact only through personal messaging or free email accounts, contradictory requirements (such as a junior role asking for many years of experience), or a very vague job description.
- Each alert needs a short "titulo", a one-sentence "detalle" that points to what the posting says, and "gravedad" equal to "high", "medium" or "low".
- If the posting shows no warning signs, return an empty list []. Never invent alerts and never judge the company beyond what the text says.

"puntaje": an integer from 0 to 100.

CANDIDATE PROFILE:
${perfil || "(no data: mark everything as missing and suggest completing the profile)"}

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
        max_tokens: 3000,
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

  const reqs = Array.isArray(r.requisitos) ? r.requisitos.slice(0, 10) : [];
  const alertas = Array.isArray(r.alertas) ? r.alertas.slice(0, 6) : [];
  let puntaje = Number(r.puntaje) || 0;
  if (reqs.length > 0) {
    let total = 0;
    let logrado = 0;
    for (const q of reqs) {
      const peso = q.obligatorio ? 2 : 1;
      total += peso;
      if (q.estado === "met") logrado += peso;
      else if (q.estado === "partial") logrado += peso * 0.5;
    }
    puntaje = Math.round((logrado / total) * 100);
  }

  await sql`insert into applications (puesto, empresa, puntaje, resumen, carta, detalle, alertas)
    values (${r.puesto || "Job title"}, ${r.empresa || ""}, ${puntaje}, ${r.resumen || ""}, ${r.carta || ""}, ${JSON.stringify(reqs)}::jsonb, ${JSON.stringify(alertas)}::jsonb)`;
  revalidatePath("/");
  redirect("/");
}

async function comparar(formData) {
  "use server";
  const admin = await esAdmin();
  if (!admin) {
    const [{ n }] = await sql`select count(*)::int as n from comparaciones
      where created_at > now() - interval '24 hours'`;
    if (n >= LIMITE_COMPARACIONES) redirect("/?error=limitecomp");
  }

  const ids = [...new Set(formData.getAll("ids").map(Number).filter(Boolean))];
  if (ids.length < 2 || ids.length > 3) redirect("/?error=comparar");

  const todas = await sql`select id, puesto, empresa, puntaje, resumen, detalle, alertas from applications`;
  const elegidas = todas.filter((x) => ids.includes(Number(x.id)));
  if (elegidas.length < 2) redirect("/?error=comparar");

  const datos = elegidas.map((x) => ({
    id: Number(x.id),
    job_title: x.puesto,
    company: x.empresa,
    fit_score: x.puntaje,
    summary: x.resumen,
    requirements: (Array.isArray(x.detalle) ? x.detalle : []).map((q) => ({
      requirement: q.requisito,
      required: q.obligatorio,
      status: q.estado,
    })),
    warning_signs: (Array.isArray(x.alertas) ? x.alertas : []).map((a) => a.titulo),
  }));

  const prompt = `You compare job postings for one candidate. Use ONLY the data below and never invent facts. Reply ONLY with valid JSON, in English, with this exact shape:
{"ranking":[{"id":0,"puesto":"string","empresa":"string","razon":"one sentence"}],"veredicto":"2-3 sentences: which posting to prioritize and why","en_comun":["requirements or skills that appear in two or more postings"],"sinergias":"2-3 sentences on how these postings reinforce each other (shared skills, same career path)","brechas":[{"habilidad":"string","cantidad":0}],"plan":["3 to 5 concrete steps to learn, ordered by how many postings they unlock"]}

Rules:
- "ranking" is sorted from best fit to worst fit and includes every posting.
- "brechas" lists requirements with status "missing" or "partial" that appear in more than one posting; "cantidad" is the number of postings that ask for it.
- If a posting has no requirement data, say so in its "razon" and rely on its summary and fit score.
- Keep every string short.

POSTINGS:
${JSON.stringify(datos)}`;

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
        max_tokens: 2500,
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

  const filas = await sql`insert into comparaciones (ids, resultado)
    values (${ids.join(",")}, ${JSON.stringify(r)}::jsonb) returning id`;
  redirect("/?c=" + filas[0].id + "#comparison");
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
  .acciones { margin-top: 12px; }
  .copiar { width: auto; margin-top: 10px; background: transparent; color: var(--primary); border: 1px solid var(--border); padding: 8px 14px; font-size: 0.85rem; border-radius: 10px; }
  .reqs { list-style: none; padding: 0; margin: 10px 0 0; display: grid; gap: 8px; }
  .req { background: var(--soft); border-radius: 12px; padding: 10px 12px; border-left: 4px solid var(--border); }
  .req.met { border-left-color: #22c55e; }
  .req.partial { border-left-color: #f59e0b; }
  .req.missing { border-left-color: #ef4444; }
  .req-top { display: flex; justify-content: space-between; gap: 10px; font-weight: 600; font-size: 0.92rem; }
  .req-estado { flex-shrink: 0; font-size: 0.78rem; }
  .req.met .req-estado { color: #16a34a; }
  .req.partial .req-estado { color: #d97706; }
  .req.missing .req-estado { color: #ef4444; }
  .req-evidencia { color: var(--muted); font-size: 0.85rem; margin-top: 3px; }
  .sin-alertas { margin: 10px 0 0; color: #16a34a; font-size: 0.85rem; }
  .al { background: var(--soft); border-radius: 12px; padding: 10px 12px; border-left: 4px solid var(--border); }
  .al.high { border-left-color: #ef4444; }
  .al.medium { border-left-color: #f59e0b; }
  .al.low { border-left-color: #9ca3af; }
  .al-top { display: flex; justify-content: space-between; gap: 10px; font-weight: 600; font-size: 0.92rem; }
  .al-grav { flex-shrink: 0; font-size: 0.78rem; text-transform: capitalize; }
  .al.high .al-grav { color: #ef4444; }
  .al.medium .al-grav { color: #d97706; }
  .al.low .al-grav { color: var(--muted); }
  .chk { display: flex; align-items: center; gap: 8px; margin: 10px 0 0; font-size: 0.85rem; color: var(--muted); }
  .chk input { width: 18px; height: 18px; margin: 0; }
  .barra { margin-bottom: 14px; }
  .barra .nota { margin-top: 6px; }
  .comp { border: 2px solid var(--primary); }
  .cerrar { color: var(--muted); font-size: 0.85rem; text-decoration: none; border: 1px solid var(--border); border-radius: 10px; padding: 6px 12px; }
  .sub { font-size: 0.9rem; font-weight: 700; margin: 14px 0 6px; color: var(--title); }
  .rank { margin: 0; padding-left: 20px; display: grid; gap: 8px; font-size: 0.93rem; }
  .lista { margin: 0; padding-left: 20px; font-size: 0.9rem; display: grid; gap: 4px; }
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

const ETIQUETA = { met: "Met", partial: "Partial", missing: "Missing" };

export default async function Home({ searchParams }) {
  const { error, c } = await searchParams;
  const admin = await esAdmin();
  const rows = await sql`select * from applications order by created_at desc`;

  let comp = null;
  if (c) {
    try {
      const rr = await sql`select resultado from comparaciones where id = ${Number(c) || 0}`;
      comp = rr[0]?.resultado || null;
    } catch (e) {
      comp = null;
    }
  }

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
        <Perfil />
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
      {error === "comparar" && (
        <div className="aviso">Select 2 or 3 postings to compare.</div>
      )}
      {error === "limitecomp" && (
        <div className="aviso">The comparison limit has been reached for today. Please try again tomorrow.</div>
      )}

      {comp && (
        <div className="card comp" id="comparison">
          <div className="card-top">
            <div className="puesto">Comparison</div>
            <a className="cerrar" href="/">Close</a>
          </div>
          {comp.veredicto && <p className="resumen">{comp.veredicto}</p>}

          {Array.isArray(comp.ranking) && comp.ranking.length > 0 && (
            <>
              <h3 className="sub">Ranking (best fit first)</h3>
              <ol className="rank">
                {comp.ranking.map((r, i) => (
                  <li key={i}>
                    <b>{r.puesto}</b>
                    {r.empresa ? " · " + r.empresa : ""}
                    <div className="req-evidencia">{r.razon}</div>
                  </li>
                ))}
              </ol>
            </>
          )}

          {Array.isArray(comp.en_comun) && comp.en_comun.length > 0 && (
            <>
              <h3 className="sub">In common</h3>
              <ul className="lista">
                {comp.en_comun.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          )}

          {comp.sinergias && (
            <>
              <h3 className="sub">Synergy</h3>
              <p className="resumen" style={{ margin: 0 }}>{comp.sinergias}</p>
            </>
          )}

          {Array.isArray(comp.brechas) && comp.brechas.length > 0 && (
            <>
              <h3 className="sub">Shared gaps</h3>
              <ul className="lista">
                {comp.brechas.map((b, i) => (
                  <li key={i}>
                    {b.habilidad} · asked in {b.cantidad} postings
                  </li>
                ))}
              </ul>
            </>
          )}

          {Array.isArray(comp.plan) && comp.plan.length > 0 && (
            <>
              <h3 className="sub">What to learn first</h3>
              <ol className="rank">
                {comp.plan.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </>
          )}
          <p className="nota">Based only on the saved analyses of the selected postings.</p>
        </div>
      )}

      <h2 className="lista-titulo">Applications</h2>
      {rows.length === 0 && <p className="vacio">No postings analyzed yet.</p>}

      {rows.length >= 2 && (
        <form id="comparar-form" action={comparar} className="barra">
          <Boton texto="Compare selected (2-3)" cargando="Comparing..." />
          <p className="nota">Tick the postings you want to compare.</p>
        </form>
      )}

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

          {Array.isArray(x.detalle) && x.detalle.length > 0 && (
            <details>
              <summary>Requirements breakdown</summary>
              <ul className="reqs">
                {x.detalle.map((q, i) => (
                  <li key={i} className={"req " + q.estado}>
                    <div className="req-top">
                      <span>
                        {q.requisito}
                        {q.obligatorio ? " *" : ""}
                      </span>
                      <span className="req-estado">{ETIQUETA[q.estado] || q.estado}</span>
                    </div>
                    <div className="req-evidencia">{q.evidencia}</div>
                  </li>
                ))}
              </ul>
              <p className="nota">
                * Required. Score = share of requirements met (partial counts half, required count double).
              </p>
            </details>
          )}

          {Array.isArray(x.alertas) && x.alertas.length > 0 && (
            <details>
              <summary>Posting alerts ({x.alertas.length})</summary>
              <ul className="reqs">
                {x.alertas.map((a, i) => (
                  <li key={i} className={"al " + a.gravedad}>
                    <div className="al-top">
                      <span>{a.titulo}</span>
                      <span className="al-grav">{a.gravedad}</span>
                    </div>
                    <div className="req-evidencia">{a.detalle}</div>
                  </li>
                ))}
              </ul>
              <p className="nota">
                Based only on the text of the posting. This does not verify the company.
              </p>
            </details>
          )}
          {Array.isArray(x.alertas) && x.alertas.length === 0 && (
            <p className="sin-alertas">✓ No warning signs found in the posting text</p>
          )}

          {x.carta && (
            <details>
              <summary>View cover letter</summary>
              <pre className="carta">{x.carta}</pre>
              <Copiar texto={x.carta} />
            </details>
          )}

          {rows.length >= 2 && (
            <label className="chk">
              <input type="checkbox" name="ids" value={x.id} form="comparar-form" />
              Select to compare
            </label>
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
