// server/api/test-affiliation.post.ts
import * as cheerio from 'cheerio'

export default defineEventHandler(async (event) => {
    const { fandom_url, character_name } = await readBody(event)

    if (!fandom_url) {
        return { success: false, error: 'No fandom URL provided' }
    }

    try {
        console.log(`Testing: ${character_name} - ${fandom_url}`)

        // 1. Try to get affiliation div
        const response = await fetch(fandom_url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        let content = $('[data-source="affiliation"]').text().trim()
        let source = 'data-source div'

        console.log(`Found data-source div: ${content ? 'YES' : 'NO'}`)

        // 2. If no div found, get raw page
        if (!content) {
            console.log('No data-source found, trying raw content...')
            try {
                const rawResponse = await fetch(`${fandom_url}?action=raw`)
                if (rawResponse.ok) {
                    content = await rawResponse.text()
                    source = 'raw page content'
                    console.log(`Raw content length: ${content.length}`)
                }
            } catch (rawError) {
                console.error('Failed to fetch raw content:', rawError)
            }
        }

        if (!content) {
            return {
                success: true,
                result: {
                    character_name: character_name || 'Unknown',
                    fandom_url,
                    scraped_content: '',
                    content_source: 'none',
                    affiliation: null,
                    error: 'No content found'
                }
            }
        }

        // 3. Send to Llama with retry logic
        console.log('Sending to Llama...')
        let affiliation = null
        let attempts = 0
        const maxAttempts = 3
        let allResponses = []

        while (!affiliation && attempts < maxAttempts) {
            attempts++
            console.log(`Llama attempt ${attempts}`)

            let prompt
            if (attempts === 1) {
                // First attempt - normal prompt
                prompt = `Extract the main current affiliation for ${character_name || 'this character'} from this One Piece wiki content. Return only the affiliation name or "none" if unclear:

${content.substring(0, 1500)}`
            } else {
                // Retry attempts - force a choice
                prompt = `You are analyzing One Piece character ${character_name || 'this character'}. Based on this content you MUST choose their most likely affiliation from these options:

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

You MUST return exactly one affiliation name from the list above. Do not return "none" or "unclear". Pick the most likely one:`
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

            if (!llamaResponse.ok) {
                throw new Error(`Llama API error: ${llamaResponse.status}`)
            }

            const llamaData = await llamaResponse.json()
            const response = llamaData.response?.trim()
            allResponses.push(`Attempt ${attempts}: ${response}`)

            console.log(`Llama attempt ${attempts} response: "${response}"`)

            // Clean up response
            if (response && response.toLowerCase() !== 'none' && response.toLowerCase() !== 'unclear') {
                affiliation = response.replace(/['"]/g, '').trim()
                console.log(`Found affiliation on attempt ${attempts}: "${affiliation}"`)
                break
            } else if (attempts < maxAttempts) {
                console.log(`Attempt ${attempts} failed, retrying...`)
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        }

        console.log(`Final result: "${affiliation}" after ${attempts} attempts`)

        return {
            success: true,
            result: {
                character_name: character_name || 'Unknown',
                fandom_url,
                scraped_content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
                content_source: source,
                affiliation,
                attempts_used: attempts,
                all_responses: allResponses,
                raw_llama_response: allResponses[allResponses.length - 1] // Last response
            }
        }

    } catch (error) {
        console.error('Test error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            result: {
                character_name: character_name || 'Unknown',
                fandom_url,
                scraped_content: '',
                content_source: 'error',
                affiliation: null,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
})