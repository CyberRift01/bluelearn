import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createGuideSchema } from '@bluelearn/schemas'
import { requireUser } from '../middleware/auth.middleware'
import type { HonoEnv } from '../types'
import {
  archiveGuide,
  createGuide,
  getGuideBySlug,
  listPublishedGuides,
} from '../services/guide.service'

// Blank summary/body collapse to NULL to match the create_topic RPC defaults
const createGuideBody = createGuideSchema.extend({
  summary: createGuideSchema.shape.summary.transform((v) => v || null),
  body: createGuideSchema.shape.body.transform((v) => v || null),
})

export const guidesRouter = new Hono<HonoEnv>()
  // Returns published guides as { guides }.
  .get('/', async (c) => {
    const guides = await listPublishedGuides(c.get('supabase'))
    return c.json({ guides })
  })

  // 201 with { revision_id } for the editor route.
  .post('/', requireUser, zValidator('json', createGuideBody), async (c) => {
    const { revision_id } = await createGuide(c.get('supabase'), c.req.valid('json'))
    return c.json({ revision_id }, 201)
  })

  // Returns the guide content and its subject tags.
  .get('/:slug', async (c) => {
    const { guide, subjects } = await getGuideBySlug(c.get('supabase'), c.req.param('slug'))
    return c.json({ guide, subjects })
  })

  // Archives the guide. 404 if missing or not permitted.
  .delete('/:slug', requireUser, async (c) => {
    const guide = await archiveGuide(c.get('supabase'), c.req.param('slug'))
    return c.json({ guide })
  })

  // Returns the ordered prerequisites for this guide.
  .get('/:slug/walkthrough', (c) => c.json({ error: 'Not implemented' }, 501))

  // Lists the variants under this guide.
  .get('/:slug/variants', (c) => c.json({ error: 'Not implemented' }, 501))

  // Adds a variant under this guide.
  .post('/:slug/variants', requireUser, (c) => c.json({ error: 'Not implemented' }, 501))

  // Returns one published variant of this guide.
  .get('/:slug/:variantSlug', (c) => c.json({ error: 'Not implemented' }, 501))

export const variantsRouter = new Hono<HonoEnv>()
  // Returns the variant content and its vote tally.
  .get('/:id', (c) => c.json({ error: 'Not implemented' }, 501))

  // Archives the variant.
  .delete('/:id', requireUser, (c) => c.json({ error: 'Not implemented' }, 501))

  // Casts or updates the caller's vote.
  .put('/:id/vote', requireUser, (c) => c.json({ error: 'Not implemented' }, 501))

  // Retracts the caller's vote.
  .delete('/:id/vote', requireUser, (c) => c.json({ error: 'Not implemented' }, 501))

  // Returns the revision history for this variant.
  .get('/:id/revisions', (c) => c.json({ error: 'Not implemented' }, 501))

  // Starts a new draft revision.
  .post('/:id/revisions', requireUser, (c) => c.json({ error: 'Not implemented' }, 501))

  // Restores an older revision as a new one.
  .post('/:id/rollback', requireUser, (c) => c.json({ error: 'Not implemented' }, 501))

export const guideRevisionsRouter = new Hono<HonoEnv>()
  // Returns one revision and its status.
  .get('/:id', (c) => c.json({ error: 'Not implemented' }, 501))

  // Overwrites a draft revision before it is submitted.
  .patch('/:id', requireUser, (c) => c.json({ error: 'Not implemented' }, 501))

  // Submits the revision for review.
  .post('/:id/submit', requireUser, (c) => c.json({ error: 'Not implemented' }, 501))

  // Returns the diff between two revisions.
  .get('/:id/diff/:otherId', (c) => c.json({ error: 'Not implemented' }, 501))
