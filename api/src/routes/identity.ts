import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { updateProfileSchema } from '@bluelearn/schemas'
import { getServiceSupabase, requireUser } from '../middleware/auth.middleware'
import type { HonoEnv } from '../types'
import {
  getMyIdentity,
  getPublicProfile,
  updateMyProfile,
} from '../services/identity.service'

export const meRouter = new Hono<HonoEnv>()
  // Returns the caller's profile and roles. 404 if no profile row.
  .get('/', requireUser, async (c) => {
    const { profile, roles } = await getMyIdentity(c.get('supabase'), c.get('user').id)
    return c.json({ profile, roles })
  })

  // Updates the caller's profile. 409 if the username is taken.
  .patch('/', requireUser, zValidator('json', updateProfileSchema), async (c) => {
    const { profile, roles } = await updateMyProfile(
      c.get('supabase'),
      c.get('user').id,
      c.req.valid('json'),
    )
    return c.json({ profile, roles })
  })

export const profilesRouter = new Hono<HonoEnv>()
  // Returns a public profile and badges by username. 404 if missing or suspended.
  .get('/:username', async (c) => {
    const { profile, roles } = await getPublicProfile(
      c.get('supabase'),
      getServiceSupabase(c),
      c.req.param('username'),
    )
    return c.json({ profile, roles })
  })
