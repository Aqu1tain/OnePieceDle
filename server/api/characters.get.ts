// server/api/characters.get.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
)

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    const page = parseInt(query.page as string) || 1
    const limit = Math.min(parseInt(query.limit as string) || 50, 100)
    const search = query.search as string || ''
    const affiliation = query.affiliation as string || ''
    const has_affiliation = query.has_affiliation as string || 'all' // 'yes', 'no', 'all'
    const has_fandom_url = query.has_fandom_url as string || 'all'

    const offset = (page - 1) * limit

    try {
        // Build the query
        let supabaseQuery = supabase
            .from('characters')
            .select('id, name, affiliation, fandom_url, bounty, crew_position, origin_sea, devil_fruit', { count: 'exact' })

        // Apply filters
        if (search) {
            supabaseQuery = supabaseQuery.ilike('name', `%${search}%`)
        }

        if (affiliation) {
            supabaseQuery = supabaseQuery.ilike('affiliation', `%${affiliation}%`)
        }

        if (has_affiliation === 'yes') {
            supabaseQuery = supabaseQuery.not('affiliation', 'is', null).neq('affiliation', '')
        } else if (has_affiliation === 'no') {
            supabaseQuery = supabaseQuery.or('affiliation.is.null,affiliation.eq.')
        }

        if (has_fandom_url === 'yes') {
            supabaseQuery = supabaseQuery.not('fandom_url', 'is', null)
        } else if (has_fandom_url === 'no') {
            supabaseQuery = supabaseQuery.is('fandom_url', null)
        }

        // Get paginated results
        const { data: characters, error, count } = await supabaseQuery
            .order('name')
            .range(offset, offset + limit - 1)

        if (error) {
            throw new Error(`Supabase error: ${error.message}`)
        }

        // Get affiliation stats for filters
        const { data: affiliationStats } = await supabase
            .from('characters')
            .select('affiliation')
            .not('affiliation', 'is', null)
            .neq('affiliation', '')

        const affiliationCounts: { [key: string]: number } = {}
        affiliationStats?.forEach(char => {
            if (char.affiliation) {
                affiliationCounts[char.affiliation] = (affiliationCounts[char.affiliation] || 0) + 1
            }
        })

        const topAffiliations = Object.entries(affiliationCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15)
            .map(([affiliation, count]) => ({ affiliation, count }))

        return {
            success: true,
            characters: characters || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
                hasNext: page * limit < (count || 0),
                hasPrev: page > 1
            },
            filters: {
                search,
                affiliation,
                has_affiliation,
                has_fandom_url
            },
            stats: {
                topAffiliations,
                totalCharacters: count || 0,
                charactersOnPage: characters?.length || 0
            }
        }

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            characters: [],
            pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        }
    }
})