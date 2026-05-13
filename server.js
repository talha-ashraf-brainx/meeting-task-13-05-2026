import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { PDFParse } from 'pdf-parse'

function normalizeOpenAIKey(raw) {
  if (raw == null || typeof raw !== 'string') return ''
  let k = raw.replace(/^\uFEFF/, '').trim()
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim()
  }
  return k
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const port = isProd ? Number(process.env.PORT) || 3000 : Number(process.env.API_PORT) || 8787
const MAX_BRIEF = 120_000
const MAX_FILES = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

const BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    facts_from_brief: {
      type: 'array',
      items: { type: 'string' },
    },
    open_questions: {
      type: 'array',
      items: { type: 'string' },
    },
    out_of_scope_inferred: {
      type: 'array',
      items: { type: 'string' },
    },
    groupings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['name', 'rationale'],
        additionalProperties: false,
      },
    },
    developer_tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          acceptance_criteria: {
            type: 'array',
            items: { type: 'string' },
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' },
          },
          brief_excerpts: {
            type: 'array',
            items: { type: 'string' },
          },
          unknowns_blocking: {
            type: 'array',
            items: { type: 'string' },
          },
          grouping_name: { type: 'string' },
        },
        required: [
          'title',
          'description',
          'acceptance_criteria',
          'dependencies',
          'brief_excerpts',
          'unknowns_blocking',
          'grouping_name',
        ],
        additionalProperties: false,
      },
    },
    jira_tickets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          description: { type: 'string' },
          issue_type: { type: 'string' },
          labels: {
            type: 'array',
            items: { type: 'string' },
          },
          acceptance_criteria: {
            type: 'array',
            items: { type: 'string' },
          },
          brief_excerpts: {
            type: 'array',
            items: { type: 'string' },
          },
          unknowns_blocking: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: [
          'summary',
          'description',
          'issue_type',
          'labels',
          'acceptance_criteria',
          'brief_excerpts',
          'unknowns_blocking',
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    'facts_from_brief',
    'open_questions',
    'out_of_scope_inferred',
    'groupings',
    'developer_tasks',
    'jira_tickets',
  ],
  additionalProperties: false,
}

const SYSTEM = `You convert unstructured client briefs into structured developer work items for a PMO tool.

Rules:
1. Never invent requirements, integrations, timelines, user flows, data fields, or environments that are not explicitly stated or unambiguously implied by exact wording in the brief.
2. If something is unclear or missing, add it to open_questions and to unknowns_blocking on affected tasks and tickets. Do not fabricate details to fill gaps.
3. facts_from_brief: only factual statements explicitly supported by the brief, as short bullets.
4. out_of_scope_inferred: must be empty unless the brief explicitly names something as out of scope or not in scope. Otherwise use open_questions instead of listing guesses here.
5. acceptance_criteria: only include criteria that can be verified from stated requirements. If the brief does not support testable criteria, use a single criterion that states what is unknown or pending clarification.
6. brief_excerpts: each task and ticket must include verbatim short quotes or close paraphrases tied to the brief. If you cannot tie work to the brief, do not create that item; add an open_question instead.
7. If the brief is vague or thin, return minimal or no developer_tasks and jira_tickets and expand open_questions.
8. developer_tasks and jira_tickets should align: each Jira ticket should have a matching task-level intent; avoid duplicate titles unless the same work is described once per ticket.
9. issue_type: one of Task, Story, Bug, Spike based only on what the brief supports; default to Task if unclear.
10. grouping_name on tasks must match a groupings.name entry when grouping applies, or be an empty string.
11. Use concise, implementation-oriented language without marketing fluff.`

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (ext !== '.pdf' && ext !== '.md') {
      cb(new Error('Only .pdf and .md files are allowed'))
      return
    }
    cb(null, true)
  },
})

function handleMulterError(err, res) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: `Each file must be at most ${MAX_FILE_SIZE} bytes`,
      })
      return
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_PART_COUNT') {
      res.status(400).json({ error: `At most ${MAX_FILES} files allowed` })
      return
    }
    res.status(400).json({ error: err.message || 'Upload failed' })
    return
  }
  if (err && err.message === 'Only .pdf and .md files are allowed') {
    res.status(400).json({ error: err.message })
    return
  }
  res.status(400).json({ error: err?.message || 'Upload failed' })
}

async function buildBriefFromUploads(pastedBrief, files) {
  const parts = []
  const trimmed = (pastedBrief || '').trim()
  if (trimmed.length) parts.push(`## Pasted brief\n\n${trimmed}`)
  for (const file of files) {
    const name = file.originalname || 'upload'
    const ext = path.extname(name).toLowerCase()
    let text = ''
    if (ext === '.md') {
      text = file.buffer.toString('utf8')
    } else if (ext === '.pdf') {
      const parser = new PDFParse({ data: file.buffer })
      try {
        const data = await parser.getText()
        text = data?.text ? String(data.text) : ''
      } finally {
        await parser.destroy()
      }
    }
    parts.push(
      `## Uploaded: ${name}\n\n${text.trim() || '(no extractable text)'}`,
    )
  }
  return parts.join('\n\n---\n\n')
}

async function runBriefToTasks(res, briefForModel) {
  const apiKey = normalizeOpenAIKey(process.env.OPENAI_API_KEY)
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing OPENAI_API_KEY' })
    return
  }
  const client = new OpenAI({ apiKey })
  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Client brief:\n\n${briefForModel}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'brief_breakdown',
          strict: true,
          schema: BRIEF_SCHEMA,
        },
      },
    })
    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      res.status(502).json({ error: 'Empty model response' })
      return
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      res.status(502).json({ error: 'Invalid JSON from model' })
      return
    }
    res.setHeader('X-OpenAI-Model', OPENAI_MODEL)
    res.json(parsed)
  } catch (e) {
    if (e instanceof OpenAI.APIError) {
      const status =
        e.status && e.status >= 400 && e.status < 600 ? e.status : 502
      res.status(status).json({ error: e.message || 'Upstream API error' })
      return
    }
    res.status(500).json({ error: 'Request failed' })
  }
}

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '512kb' }))

app.post(
  '/api/brief-to-tasks',
  (req, res, next) => {
    const ct = (req.headers['content-type'] || '').toLowerCase()
    if (ct.includes('multipart/form-data')) {
      return upload.array('files', MAX_FILES)(req, res, (err) => {
        if (err) {
          handleMulterError(err, res)
          return
        }
        next()
      })
    }
    if (!ct.includes('application/json')) {
      res.status(415).json({
        error:
          'Content-Type must be application/json or multipart/form-data',
      })
      return
    }
    next()
  },
  async (req, res) => {
    const ct = (req.headers['content-type'] || '').toLowerCase()
    let briefForModel
    if (ct.includes('multipart/form-data')) {
      const pasted =
        typeof req.body?.brief === 'string' ? req.body.brief : ''
      const files = Array.isArray(req.files) ? req.files : []
      if (!pasted.trim().length && !files.length) {
        res.status(400).json({
          error:
            'Provide a non-empty brief and/or at least one .pdf or .md file',
        })
        return
      }
      try {
        briefForModel = await buildBriefFromUploads(pasted, files)
      } catch {
        res.status(400).json({ error: 'Could not read one or more files' })
        return
      }
    } else {
      const brief = req.body?.brief
      if (typeof brief !== 'string') {
        res.status(400).json({ error: 'Field "brief" must be a string' })
        return
      }
      briefForModel = brief.trim()
      if (!briefForModel.length) {
        res.status(400).json({ error: 'brief must not be empty' })
        return
      }
    }
    if (briefForModel.length > MAX_BRIEF) {
      res.status(400).json({
        error: `Combined brief must be at most ${MAX_BRIEF} characters`,
      })
      return
    }
    await runBriefToTasks(res, briefForModel)
  },
)

if (isProd) {
  const distDir = path.join(__dirname, 'dist')
  app.use(express.static(distDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, () => {
  if (isProd) {
    process.stdout.write(`Listening on ${port}\n`)
  } else {
    process.stdout.write(`API on http://localhost:${port}\n`)
  }
})
