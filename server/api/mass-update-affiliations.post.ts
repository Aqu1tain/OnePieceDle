// server/api/mass-update-affiliations.post.ts
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
)

export default defineEventHandler(async (event) => {
    const {
        action = 'start', // 'start', 'stats', 'next-batch'
        test_mode = true,
        batch_size = 5, // Smaller batches for live updates
        skip_existing = true,
        offset = 0
    } = await readBody(event)

    if (action === 'stats') {
        return await getUpdateStats()
    }

    if (action === 'next-batch') {
        return await processNextBatch(offset, batch_size, test_mode, skip_existing)
    }

    if (action !== 'start') {
        return { success: false, error: 'Invalid action' }
    }

    // For 'start' action, just return the first batch
    return await processNextBatch(0, batch_size, test_mode, skip_existing)
})

async function processNextBatch(offset: number, batch_size: number, test_mode: boolean, skip_existing: boolean) {
    try {
        // Get characters that need updating
        let query = supabase
            .from('characters')
            .select('id, name, fandom_url, affiliation')
            .not('fandom_url', 'is', null)

        if (skip_existing) {
            query = query.or('affiliation.is.null,affiliation.eq.')
        }

        // Get total count first
        let countQuery = supabase
            .from('characters')
            .select('id', { count: 'exact', head: true })
            .not('fandom_url', 'is', null)

        if (skip_existing) {
            countQuery = countQuery.or('affiliation.is.null,affiliation.eq.')
        }

        const { count: totalCount } = await countQuery

        // Get the batch
        const { data: characters } = await query
            .order('name')
            .range(offset, offset + batch_size - 1)

        if (!characters?.length) {
            return {
                success: true,
                completed: true,
                message: 'No more characters to process',
                batch_results: [],
                has_more: false,
                total_characters: totalCount || 0,
                processed_so_far: offset
            }
        }

        console.log(`Processing batch: characters ${offset + 1}-${offset + characters.length}`)

        const batchResults = []
        let batchUpdated = 0
        let batchFailed = 0

        // Process each character in the batch
        for (const char of characters) {
            try {
                console.log(`Processing: ${char.name}`)
                const result = await processCharacterAffiliation(char)

                if (result.affiliation) {
                    // Update database if not test mode
                    if (!test_mode) {
                        try {
                            await supabase
                                .from('characters')
                                .update({ affiliation: result.affiliation })
                                .eq('id', char.id)
                            batchUpdated++
                        } catch (updateError) {
                            console.error(`Failed to update ${char.name}:`, updateError)
                            batchFailed++
                            batchResults.push({
                                character: char.name,
                                affiliation: null,
                                attempts: result.attempts || 1,
                                status: 'failed',
                                error: 'Database update failed'
                            })
                            continue
                        }
                    } else {
                        batchUpdated++
                    }

                    batchResults.push({
                        character: char.name,
                        affiliation: result.affiliation,
                        attempts: result.attempts || 1,
                        status: 'success'
                    })
                } else {
                    batchFailed++
                    batchResults.push({
                        character: char.name,
                        affiliation: null,
                        attempts: result.attempts || 3,
                        status: 'failed',
                        error: 'No affiliation found'
                    })
                }

                // Small delay between characters
                await new Promise(resolve => setTimeout(resolve, 200))

            } catch (error) {
                console.error(`Error processing character ${char.name}:`, error)
                batchFailed++
                batchResults.push({
                    character: char.name,
                    affiliation: null,
                    attempts: 1,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Processing error'
                })
            }
        }

        const nextOffset = offset + characters.length
        const hasMore = nextOffset < (totalCount || 0)

        return {
            success: true,
            completed: !hasMore,
            batch_results: batchResults,
            batch_updated: batchUpdated,
            batch_failed: batchFailed,
            batch_size: characters.length,
            has_more: hasMore,
            next_offset: nextOffset,
            total_characters: totalCount || 0,
            processed_so_far: nextOffset,
            test_mode
        }

    } catch (error) {
        console.error('Batch processing error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
    }
}

async function processCharacterAffiliation(character: any): Promise<{ affiliation: string | null; attempts: number }> {
    try {
        // Fetch the wiki page
        const response = await fetch('https://onepiece.fandom.com/wiki/' + encodeURIComponent(character.name), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Extract affiliation from data-source or infobox
        let content = $('[data-source="affiliation"]').text().trim()

        // Fallback to raw wiki content if still empty
        if (!content) {
            try {
                const rawResponse = await fetch(`${character.fandom_url}?action=raw`)
                if (rawResponse.ok) {
                    content = await rawResponse.text()
                }
            } catch (rawError) {
                console.error(`Failed to get raw content for ${character.name}:`, rawError)
            }
        }

        if (!content) {
            return { affiliation: null, attempts: 1 }
        }

        // Single prompt with clear instructions and example affiliations
        let affiliation = null
        let attempts = 0
        const maxAttempts = 2 // Reduced max attempts

        while (!affiliation && attempts < maxAttempts) {
            attempts++

            const prompt = `
You are analyzing the One Piece character ${character.name}. Extract their primary current affiliation from the provided wiki content. Return ONLY the affiliation name (e.g., "Straw Hat Pirates", "Marines", "none"). If multiple affiliations are mentioned, prioritize the most recent one. Do NOT include explanations, extra text, or quotes, just the affiliation name.

To guide your response, here are examples of valid affiliation names you can use as reference NON EXHAUSTIVE:
- Straw Hat Pirates
- Straw Hat Great Fleet
- Marines
- World Government
- Revolutionary Army
- Whitebeard Pirates
- Big Mom Pirates
- Beasts Pirates
- Red Hair Pirates
- Blackbeard Pirates
- Heart Pirates
- Kid Pirates
- Buggy Pirates
- Cross Guild
- Baroque Works
- CP9
- CP0
- Seven Warlords of the Sea
- Four Emperors
- Roger Pirates
- Sun Pirates
- Arlong Pirates
- Donquixote Pirates
- Thriller Bark Pirates
- Kuja Pirates
- [NAME] Pirates

If the content suggests an affiliation not in this list, return the exact name as it appears (e.g., "Alabasta Kingdom").
YOU MUST RETURN AN AFFILIATION. DO NOT PUT A "[NAME] PIRATES" IF THE CHARACTER IS NOT A MEMBER OF THIS CREW.

Content (truncated for brevity):
${content.substring(0, 3000)}
`

            try {
                const llamaResponse = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'llama3.2:latest',
                        prompt,
                        stream: false
                    })
                })

                if (llamaResponse.ok) {
                    const llamaData = await llamaResponse.json()
                    const response = llamaData.response?.trim()

                    if (response && response !== 'unclear') {
                        affiliation = response.trim()
                    }
                }
            } catch (llamaError) {
                console.error(`Llama error for ${character.name}:`, llamaError)
            }

            if (attempts < maxAttempts && !affiliation) {
                await new Promise(resolve => setTimeout(resolve, 300))
            }
        }

        return { affiliation: affiliation || 'none', attempts }

    } catch (error) {
        console.error(`Failed to process ${character.name}:`, error)
        return { affiliation: null, attempts: 1 }
    }
}

async function getUpdateStats() {
    try {
        const { data: stats } = await supabase
            .from('characters')
            .select('affiliation, fandom_url')

        if (!stats) return null

        const total = stats.length
        const withAffiliation = stats.filter(c => c.affiliation && c.affiliation.trim()).length
        const withFandomUrl = stats.filter(c => c.fandom_url).length
        const needsProcessing = stats.filter(c => c.fandom_url && (!c.affiliation || !c.affiliation.trim())).length

        return {
            total,
            withAffiliation,
            withFandomUrl,
            needsProcessing,
            percentageComplete: total > 0 ? Math.round((withAffiliation / total) * 100) : 0
        }
    } catch (error) {
        console.error('Error getting stats:', error)
        return null
    }
}