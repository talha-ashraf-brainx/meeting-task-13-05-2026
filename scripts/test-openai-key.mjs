import 'dotenv/config'
import OpenAI from 'openai'

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

const apiKey = normalizeOpenAIKey(process.env.OPENAI_API_KEY)
if (!apiKey) {
  process.stderr.write('FAIL: OPENAI_API_KEY is missing or empty after trim.\n')
  process.exit(1)
}

if (/\s/.test(apiKey)) {
  process.stderr.write(
    'WARN: Key contains whitespace. Use a single line: OPENAI_API_KEY=sk-...\n',
  )
}
if (apiKey.length > 200) {
  process.stderr.write(
    `WARN: Key is ${apiKey.length} chars; ensure you only pasted the secret, not notes or multiple keys.\n`,
  )
}
if (!apiKey.startsWith('sk-')) {
  process.stderr.write(
    'WARN: Key should start with sk-. Verify you copied an API key from platform.openai.com.\n',
  )
}

const masked =
  apiKey.length <= 10
    ? '(too short)'
    : `${apiKey.slice(0, 7)}…${apiKey.slice(-4)}`

process.stdout.write(`Key loaded: ${masked} (${apiKey.length} chars)\n`)

const client = new OpenAI({ apiKey })

process.stdout.write('\n1) models.list() …\n')
try {
  await client.models.list({ limit: 1 })
  process.stdout.write('OK — API key accepted for models.list\n')
} catch (e) {
  process.stderr.write(`FAIL — models.list: ${e?.message || e}\n`)
  if (e?.status === 401) {
    process.stderr.write(
      'Diagnosis: OpenAI rejected the key (401). Regenerate at https://platform.openai.com/account/api-keys\n',
    )
  }
  process.exit(1)
}

process.stdout.write('\n2) chat.completions gpt-4.1-mini (1 token) …\n')
try {
  const res = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    max_completion_tokens: 8,
    messages: [{ role: 'user', content: 'Say hi' }],
  })
  const text = res.choices[0]?.message?.content
  process.stdout.write(
    `OK — chat works. Sample reply: ${JSON.stringify(text ?? '')}\n`,
  )
} catch (e) {
  process.stderr.write(`FAIL — chat completion: ${e?.message || e}\n`)
  if (e?.status === 401) {
    process.stderr.write('Diagnosis: 401 on chat — key/org issue.\n')
  } else if (e?.code === 'model_not_found' || /model/i.test(e?.message || '')) {
    process.stderr.write(
      'Diagnosis: models.list worked but this model is not available to this project/billing.\n',
    )
  }
  process.exit(1)
}

process.stdout.write('\nAll checks passed — key and model access look fine.\n')
process.stdout.write(
  'If the app still errors, restart `npm run dev` and confirm requests go to the API (port 8787 via Vite proxy).\n',
)
