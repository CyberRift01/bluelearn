import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateGuideInput } from '@bluelearn/schemas'
import type { Database } from '../database.types'
import { ServiceError } from '../lib/service-error'

type DB = SupabaseClient<Database>

// A guide's title/summary/body live on the canonical guide's current
// revision, not on the base. These embeds walk guide_bases -> canonical
// guide -> its live revision.
const CANONICAL_SUMMARY = `
  canonical:guides!guide_bases_canonical_guide_id_fkey(
    current:guide_revisions!guides_current_revision_id_fkey(
      summary
    )
  )
`

const CANONICAL_CONTENT = `
  canonical:guides!guide_bases_canonical_guide_id_fkey(
    id,
    slug,
    current:guide_revisions!guides_current_revision_id_fkey(
      id,
      title,
      summary,
      body,
      created_at
    )
  )
`

// List published guides, alphabetical. RLS hides drafts from non-authors.
export async function listPublishedGuides(supabase: DB) {
  const { data, error } = await supabase
    .from('guide_bases')
    .select(`id, slug, title, knowledge_type, ${CANONICAL_SUMMARY}`)
    .eq('status', 'published')
    .order('title')

  if (error) throw new ServiceError(error.message, 500)

  return (data ?? []).map(({ canonical, ...base }) => ({
    ...base,
    summary: canonical?.current?.summary ?? null,
  }))
}

// Create a guide: bundles the guide_base + first guide + draft revision in one
// transaction via the create_topic RPC (RLS still applies, SECURITY INVOKER).
// The draft starts empty (title/slug filled in the editor); returns the draft
// revision id so the client can route to its editor.
export async function createGuide(supabase: DB, input: CreateGuideInput) {
  const { title, knowledge_type, summary, body } = input

  const { data: revision_id, error } = await supabase.rpc('create_topic', {
    p_title: title ?? undefined,
    p_knowledge_type: knowledge_type,
    p_summary: summary ?? undefined,
    p_body: body ?? undefined,
  })

  if (error) throw new ServiceError(error.message, 500)

  return { revision_id }
}

// Resolve a guide by slug to its canonical content + subject tags. The prereq/
// dependent neighborhood is deferred to the graph pass.
export async function getGuideBySlug(supabase: DB, rawSlug: string) {
  const slug = rawSlug.toLowerCase()

  const { data: guide, error } = await supabase
    .from('guide_bases')
    .select(`id, slug, title, knowledge_type, status, created_at, updated_at, ${CANONICAL_CONTENT}`)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new ServiceError(error.message, 500)
  if (!guide) throw new ServiceError('Guide not found', 404)

  const { data: tagRows, error: tagError } = await supabase
    .from('guide_subjects')
    .select('subjects(id, slug, name)')
    .eq('guide_base_id', guide.id)

  if (tagError) throw new ServiceError(tagError.message, 500)
  const subjects = (tagRows ?? []).map((r) => r.subjects).filter((s) => s !== null)

  return { guide, subjects }
}

// Archive the guide. Per RLS this is moderator/admin-only (authors cannot move
// a guide off 'draft'); a non-permitted caller simply matches zero rows.
export async function archiveGuide(supabase: DB, rawSlug: string) {
  const slug = rawSlug.toLowerCase()

  const { data, error } = await supabase
    .from('guide_bases')
    .update({ status: 'archived' })
    .eq('slug', slug)
    .select('id, slug, status')

  if (error) throw new ServiceError(error.message, 500)
  if (!data || data.length === 0) {
    throw new ServiceError('Guide not found or not permitted', 404)
  }
  return data[0]
}
