import { sql } from "../lib/db";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function agregar(formData) {
  "use server";
  const puesto = formData.get("puesto");
  const empresa = formData.get("empresa");
  if (!puesto) return;
  await sql`insert into applications (puesto, empresa) values (${puesto}, ${empresa})`;
  revalidatePath("/");
}

export default async function Home() {
  const rows = await sql`select * from applications order by created_at desc`;
  return (
    <main>
      <h1>Mis postulaciones</h1>
      <form action={agregar} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <input name="puesto" placeholder="Puesto" required />
        <input name="empresa" placeholder="Empresa" />
        <button type="submit">Guardar</button>
      </form>
      {rows.length === 0 && <p>Todavía no guardaste ninguna.</p>}
      {rows.map((r) => (
        <div key={r.id} style={{ borderTop: "1px solid #ddd", padding: "8px 0" }}>
          <b>{r.puesto}</b> · {r.empresa} · {r.estado}
        </div>
      ))}
    </main>
  );
}

