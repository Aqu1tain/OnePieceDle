// server/api/update-affiliations.post.ts
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
)

export default defineEventHandler(async (event) => {
    const { test_mode = true, limit = 5 } = await readBody(event)

    try {
        // Get characters without affiliations that have fandom URLs
        const { data: characters } = await supabase
            .from('characters')
            .select('id, name, fandom_url')
            .not('fandom_url', 'is', null)
            .or('affiliation.is.null,affiliation.eq.')
            .limit(limit)

        if (!characters?.length) {
            return { success: true, message: 'No characters to process', results: [] }
        }

        const results = []

        for (const char of characters) {
            try {
                console.log(`Processing: ${char.name}`)

                // 1. Try to get affiliation div
                const response = await fetch(char.fandom_url)
                const html = await response.text()
                const $ = cheerio.load(html)

                let content = $('[data-source="affiliation"]').text().trim()

                // 2. If no div found, get raw page
                if (!content) {
                    const rawResponse = await fetch(`${char.fandom_url}?action=raw`)
                    content = await rawResponse.text()
                }

                // 3. Send to Llama with retry logic
                let affiliation = null
                let attempts = 0
                const maxAttempts = 3

                while (!affiliation && attempts < maxAttempts) {
                    attempts++
                    console.log(`Llama attempt ${attempts} for ${char.name}`)

                    let prompt
                    if (attempts === 1) {
                        // First attempt - normal prompt
                        prompt = `Extract the main current affiliation for ${char.name} from this One Piece wiki content. Return only the affiliation name or "none" if unclear:\n\n${content.substring(0, 1500)}`
                    } else {
                        // Retry attempts - force a choice
                        prompt = `You are analyzing One Piece character ${char.name}. Based on this content, you MUST choose their most likely affiliation from these common options:

Straw Hat Pirates
Marines
World Government
Revolutionary Army
Whitebeard Pirates
Big Mom Pirates
Beasts Pirates
Red Hair Pirates
Blackbeard Pirates
Heart Pirates
Kid Pirates
Buggy Pirates
Cross Guild
Baroque Works
CP9
CP0
Seven Warlords of the Sea
Four Emperors
Roger Pirates
Sun Pirates
Arlong Pirates
Donquixote Pirates
Thriller Bark Pirates
Kuja Pirates

Content: ${content.substring(0, 1500)}

You MUST return exactly one affiliation name from the list above. Do not return "none" or "unclear". Pick the most likely one based on any clues in the content:`
                    }

                    const llamaResponse = await fetch('http://localhost:11434/api/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'llama3.2:latest',
                            prompt,
                            stream: false
                        })
                    })

                    const llamaData = await llamaResponse.json()
                    let response = llamaData.response?.trim()

                    console.log(`Llama attempt ${attempts} response: "${response}"`)

                    // Clean up response
                    if (response && response.toLowerCase() !== 'none' && response.toLowerCase() !== 'unclear') {
                        affiliation = response.replace(/['"]/g, '').trim()
                        console.log(`Found affiliation on attempt ${attempts}: "${affiliation}"`)
                        break
                    } else if (attempts < maxAttempts) {
                        console.log(`Attempt ${attempts} failed, retrying...`)
                        // Small delay before retry
                        await new Promise(resolve => setTimeout(resolve, 500))
                    }
                }

                // Final fallback - if still nothing found after all attempts
                if (!affiliation) {
                    console.log(`No affiliation found after ${maxAttempts} attempts for ${char.name}`)
                }

                // Update database if not test mode and affiliation found
                if (affiliation && !test_mode) {
                    await supabase
                        .from('characters')
                        .update({ affiliation })
                        .eq('id', char.id)
                }

                results.push({
                    character: char.name,
                    affiliation,
                    status: affiliation ? 'success' : 'no_affiliation_found',
                    attempts_used: attempts
                })

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 1000))

            } catch (error) {
                results.push({
                    character: char.name,
                    affiliation: null,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            }
        }

        return {
            success: true,
            test_mode,
            processed: results.length,
            updated: test_mode ? 0 : results.filter(r => r.affiliation).length,
            results
        }

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
    }
})