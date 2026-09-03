export async function signedMediaMap(supabase:any, rows:any[]) {
  const result = new Map<string,string>()
  await Promise.all(rows.map(async (m:any) => {
    const { data } = await supabase.storage.from('attempt-media').createSignedUrl(m.storage_path, 3600)
    if (data?.signedUrl) result.set(m.id, data.signedUrl)
  }))
  return result
}
