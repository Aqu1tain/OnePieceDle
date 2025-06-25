<!-- pages/characters.vue -->
<template>
    <div class="max-w-7xl mx-auto p-6">
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">One Piece Characters Database</h1>
            <p class="text-gray-600">{{ stats?.totalCharacters || 0 }} characters total</p>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 class="text-lg font-semibold mb-4">Filters</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <!-- Search -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Search Name</label>
                    <input
                          v-model="filters.search"
                          @input="debouncedSearch"
                          type="text"
                          placeholder="Character name..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <!-- Affiliation -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Affiliation</label>
                    <select
                          v-model="filters.affiliation"
                          @change="applyFilters"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Affiliations</option>
                        <option v-for="aff in stats?.topAffiliations || []" :key="aff.affiliation" :value="aff.affiliation">
                            {{ aff.affiliation }} ({{ aff.count }})
                        </option>
                    </select>
                </div>

                <!-- Has Affiliation -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Affiliation Status</label>
                    <select
                          v-model="filters.has_affiliation"
                          @change="applyFilters"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Characters</option>
                        <option value="yes">Has Affiliation</option>
                        <option value="no">Missing Affiliation</option>
                    </select>
                </div>

                <!-- Has Fandom URL -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Fandom URL</label>
                    <select
                          v-model="filters.has_fandom_url"
                          @change="applyFilters"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Characters</option>
                        <option value="yes">Has Fandom URL</option>
                        <option value="no">Missing URL</option>
                    </select>
                </div>
            </div>

            <div class="flex gap-2">
                <button
                      @click="clearFilters"
                      class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    Clear Filters
                </button>
                <button
                      @click="applyFilters"
                      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Apply Filters
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-gray-600">Loading characters...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p class="text-red-800">{{ error }}</p>
        </div>

        <!-- Results -->
        <div v-else-if="characters.length > 0">
            <!-- Stats -->
            <div class="bg-blue-50 rounded-lg p-4 mb-6">
                <p class="text-blue-800">
                    Showing {{ characters.length }} characters
                    <span v-if="pagination.total !== characters.length">
            of {{ pagination.total }} total
          </span>
                    <span v-if="hasActiveFilters"> (filtered)</span>
                </p>
            </div>

            <!-- Characters Table -->
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Character
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Affiliation
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Details
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Links
                            </th>
                        </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-for="character in characters" :key="character.id" class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="font-medium text-gray-900">{{ character.name }}</div>
                                <div v-if="character.crew_position" class="text-sm text-gray-500">
                                    {{ character.crew_position }}
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                  <span
                        v-if="character.affiliation"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {{ character.affiliation }}
                  </span>
                                <span v-else class="text-gray-400 text-sm">No affiliation</span>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-500">
                                <div class="space-y-1">
                                    <div v-if="character.bounty && character.bounty > 0">
                                        <span class="font-medium">Bounty:</span>
                                        {{ formatBounty(character.bounty) }}
                                    </div>
                                    <div v-if="character.devil_fruit">
                                        <span class="font-medium">Devil Fruit:</span>
                                        {{ character.devil_fruit }}
                                    </div>
                                    <div v-if="character.origin_sea">
                                        <span class="font-medium">Origin:</span>
                                        {{ character.origin_sea }}
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                <div class="flex space-x-2">
                                    <a
                                          v-if="character.fandom_url"
                                          :href="character.fandom_url"
                                          target="_blank"
                                          class="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        Wiki
                                    </a>
                                    <span v-else class="text-gray-400">No Wiki</span>
                                </div>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="pagination.totalPages > 1" class="flex items-center justify-between mt-6">
                <div class="text-sm text-gray-700">
                    Page {{ pagination.page }} of {{ pagination.totalPages }}
                </div>
                <div class="flex space-x-2">
                    <button
                          @click="goToPage(pagination.page - 1)"
                          :disabled="!pagination.hasPrev"
                          class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        Previous
                    </button>

                    <!-- Page numbers -->
                    <template v-for="page in visiblePages" :key="page">
                        <button
                              v-if="page !== '...'"
                              @click="goToPage(page)"
                              :class="[
                'px-3 py-2 text-sm border rounded-md',
                page === pagination.page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 hover:bg-gray-50'
              ]"
                        >
                            {{ page }}
                        </button>
                        <span v-else class="px-3 py-2 text-sm text-gray-500">...</span>
                    </template>

                    <button
                          @click="goToPage(pagination.page + 1)"
                          :disabled="!pagination.hasNext"
                          class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>

        <!-- No Results -->
        <div v-else class="text-center py-12">
            <p class="text-gray-500 text-lg">No characters found</p>
            <button
                  v-if="hasActiveFilters"
                  @click="clearFilters"
                  class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
                Clear Filters
            </button>
        </div>
    </div>
</template>

<script setup>
definePageMeta({
    title: 'Characters Database'
})

// Data
const loading = ref(false)
const error = ref('')
const characters = ref([])
const pagination = ref({})
const stats = ref(null)

// Filters
const filters = reactive({
    search: '',
    affiliation: '',
    has_affiliation: 'all',
    has_fandom_url: 'all'
})

// Computed
const hasActiveFilters = computed(() => {
    return filters.search ||
          filters.affiliation ||
          filters.has_affiliation !== 'all' ||
          filters.has_fandom_url !== 'all'
})

const visiblePages = computed(() => {
    const current = pagination.value.page || 1
    const total = pagination.value.totalPages || 1
    const pages = []

    if (total <= 7) {
        for (let i = 1; i <= total; i++) {
            pages.push(i)
        }
    } else {
        if (current <= 4) {
            for (let i = 1; i <= 5; i++) pages.push(i)
            pages.push('...')
            pages.push(total)
        } else if (current >= total - 3) {
            pages.push(1)
            pages.push('...')
            for (let i = total - 4; i <= total; i++) pages.push(i)
        } else {
            pages.push(1)
            pages.push('...')
            for (let i = current - 1; i <= current + 1; i++) pages.push(i)
            pages.push('...')
            pages.push(total)
        }
    }

    return pages
})

// Methods
const fetchCharacters = async (page = 1) => {
    loading.value = true
    error.value = ''

    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '50',
            search: filters.search,
            affiliation: filters.affiliation,
            has_affiliation: filters.has_affiliation,
            has_fandom_url: filters.has_fandom_url
        })

        const response = await $fetch(`/api/characters?${params}`)

        if (response.success) {
            characters.value = response.characters
            pagination.value = response.pagination
            stats.value = response.stats
        } else {
            error.value = response.error || 'Failed to load characters'
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    } finally {
        loading.value = false
    }
}

const applyFilters = () => {
    fetchCharacters(1)
}

const clearFilters = () => {
    filters.search = ''
    filters.affiliation = ''
    filters.has_affiliation = 'all'
    filters.has_fandom_url = 'all'
    fetchCharacters(1)
}

const goToPage = (page) => {
    if (page >= 1 && page <= pagination.value.totalPages) {
        fetchCharacters(page)
    }
}

const formatBounty = (bounty) => {
    if (bounty >= 1000000000) {
        return `₿${(bounty / 1000000000).toFixed(1)}B`
    } else if (bounty >= 1000000) {
        return `₿${(bounty / 1000000).toFixed(1)}M`
    } else if (bounty >= 1000) {
        return `₿${(bounty / 1000).toFixed(1)}K`
    }
    return `₿${bounty}`
}

// Debounced search
let searchTimeout
const debouncedSearch = () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        applyFilters()
    }, 500)
}

// Load initial data
onMounted(() => {
    fetchCharacters()
})
</script>