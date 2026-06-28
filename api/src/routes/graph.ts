import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  createPrerequisiteSchema,
  deletePrerequisiteSchema,
  createTodoPrerequisiteSchema,
} from '@bluelearn/schemas'

type Bindings = {
  SUPABASE: any
}

export const graph = new Hono<{ Bindings: Bindings }>()

// POST /prerequisites. Create a prerequisite edge
graph.post(
  '/prerequisites',
  zValidator('json', createPrerequisiteSchema),
  async (c) => {
    const supabase = c.env.SUPABASE
    const { from_guide_base_id, to_guide_base_id } = c.req.valid('json')

    const { data, error } = await supabase
      .from('guide_edges')
      .insert({
        from_guide_base_id,
        to_guide_base_id,
        edge_type: 'prerequisite',
      })
      .select()
      .single()

    if (error) {
      switch (error.code) {

        // unique_violation (duplicate edge)
        case '23505': 
          return c.json(
            { error: 'Prerequisite already exists' },
            409
          )

        // check_violation (self-loop)
        case '23514': 
          return c.json(
            { error: 'A guide cannot be a prerequisite of itself' },
            422
          )

        // cycle detection trigger
        case 'P0001': 
          return c.json(
            { error: 'This prerequisite would create a cycle' },
            409
          )

        // Any unexpected error
        default:
          return c.json(
            { error: 'Failed to create prerequisite' },
            500
          )
      }
    }

    return c.json(data, 201)
  }
)

 // DELETE /prerequisites. Suspend a prerequisite edge
graph.delete(
  '/prerequisites',
  zValidator('json', deletePrerequisiteSchema),
  async (c) => {
    const supabase = c.env.SUPABASE
    const { guide_edge_id } = c.req.valid('json')

    const { data, error } = await supabase
      .from('guide_edges')
      .update({ is_suspended: true })
      .eq('id', guide_edge_id)
      .select()
      .single()

    if (error) {
      return c.json(
        { error: 'Failed to suspend prerequisite' },
        500
      )
    }

    return c.json(data, 200)
  }
)

 // GET /todos. Get all open prerequisite todos
graph.get('/todos', async (c) => {
  const supabase = c.env.SUPABASE

  const { data, error } = await supabase
    .from('todo_prerequisites')
    .select('*')
    .eq('status', 'open')

  if (error) {
    return c.json(
      { error: 'Failed to fetch todos' },
      500
    )
  }

  return c.json(data, 200)
})

 // POST /todos.
graph.post(
  '/todos',
  zValidator('json', createTodoPrerequisiteSchema),
  async (c) => {
    const supabase = c.env.SUPABASE
    const payload = c.req.valid('json')

    const { data, error } = await supabase
      .from('todo_prerequisites')
      .insert({
        ...payload,
        status: 'open',
      })
      .select()
      .single()

    if (error) {
      return c.json(
        { error: 'Failed to create todo' },
        500
      )
    }

    return c.json(data, 201)
  }
)

// Discord Handle: cyberrift1
