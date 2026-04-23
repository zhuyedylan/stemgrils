export default async (req: Request): Promise<Response> => {
  const h = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  if (req.method === "OPTIONS") return new Response(null, { headers: h });

  const b = await req.json();
  return new Response(JSON.stringify({
    success: true,
    received: b.filename || "no filename",
    time: new Date().toISOString()
  }), { headers: h });
};