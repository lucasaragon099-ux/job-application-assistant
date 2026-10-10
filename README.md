# Asistente de postulaciones con IA

Aplicación web que analiza ofertas de trabajo: pegás el texto de una oferta y tu perfil, y la app devuelve el porcentaje de encaje, un resumen de lo que te falta y una carta de presentación a medida. Cada análisis se guarda en una base de datos.

**Demo:** [(https://job-application-assistant-afsk6lt4i-lucas-c441.vercel.app)]

## Qué hace

- Analiza una oferta contra tu perfil con la API de Claude
- Devuelve puesto, empresa, porcentaje de encaje, resumen y carta
- Guarda el historial de postulaciones en PostgreSQL
- Permite borrar postulaciones
- Muestra el estado "Analizando..." y bloquea el botón mientras la IA responde

## Stack

- **Next.js** (App Router, Server Actions)
- **PostgreSQL** en Neon
- **API de Anthropic (Claude)** para el análisis y la carta
- **Vercel** para el deploy, conectado a este repositorio de GitHub

## Cómo lo construí

Lo armé íntegramente desde un iPhone, usando Claude como asistente de programación: código escrito con IA, y yo probando, leyendo errores y corrigiendo.

1. Primero prototipé la idea en una sola página para validar el flujo.
2. Lo pasé a Next.js con una base de datos real en Neon.
3. Lo publiqué en Vercel y le sumé el análisis con la API de Claude.

**Problemas que tuve que resolver:**

- Los primeros deploys fallaban. Leí los Build Logs y encontré que varios archivos (`package.json`, `layout.js`, `page.js`, `db.js`) se habían guardado vacíos al crearlos desde el celular. Los corregí uno por uno.
- Al probar la app toqué el botón varias veces porque no mostraba que estaba trabajando, y se guardaron análisis duplicados. Lo arreglé agregando un estado de carga y un botón de borrar.
- Las claves (base de datos y API) están como variables de entorno en Vercel, nunca en el repositorio.

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL (Neon) |
| `ANTHROPIC_API_KEY` | Clave de la API de Claude |

## Tabla en la base de datos

```sql
create table applications (
  id serial primary key,
  puesto text not null,
  empresa text,
  puntaje int,
  estado text not null default 'Postulado',
  resumen text,
  carta text,
  created_at timestamptz default now()
);
```

## Ideas para seguir

- Estados de seguimiento editables (postulado, entrevista, oferta)
- Acceso protegido con clave
- Mejor diseño visual
