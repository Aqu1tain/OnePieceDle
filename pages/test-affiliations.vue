<!-- pages/test-affiliations.vue -->
<template>
    <div class="max-w-6xl mx-auto p-6">
        <h1 class="text-3xl font-bold mb-8">Test Character Affiliation Extraction</h1>

        <!-- Single Test Section -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">Test Single Character</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Character Name</label>
                    <input
                          v-model="testCharacterName"
                          type="text"
                          placeholder="e.g., Monkey D. Luffy"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Fandom Wiki URL</label>
                    <input
                          v-model="testFandomUrl"
                          type="url"
                          placeholder="https://onepiece.fandom.com/wiki/..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <button
                  @click="testSingle"
                  :disabled="!testFandomUrl || singleLoading"
                  class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
                {{ singleLoading ? 'Testing...' : 'Test This Character' }}
            </button>
        </div>

        <!-- Single Test Result -->
        <div v-if="singleResult" class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 class="text-lg font-semibold mb-4">Test Result</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Character Info</h4>
                    <div class="space-y-2 text-sm">
                        <div><strong>Name:</strong> {{ singleResult.character_name }}</div>
                        <div><strong>URL:</strong>
                            <a :href="singleResult.fandom_url" target="_blank" class="text-blue-600 hover:underline break-all">
                                {{ singleResult.fandom_url }}
                            </a>
                        </div>
                        <div><strong>Content Source:</strong>
                            <span class="px-2 py-1 bg-gray-100 rounded text-xs">
                {{ singleResult.content_source }}
              </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Extraction Result</h4>
                    <div class="space-y-2 text-sm">
                        <div><strong>Found Affiliation:</strong>
                            <span v-if="singleResult.affiliation"
                                  class="ml-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {{ singleResult.affiliation }}
              </span>
                            <span v-else class="ml-2 text-gray-500">None found</span>
                        </div>
                        <div v-if="singleResult.raw_llama_response">
                            <strong>Raw AI Response:</strong>
                            <code class="block mt-1 p-2 bg-gray-100 rounded text-xs">
                                {{ singleResult.raw_llama_response }}
                            </code>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="singleResult.scraped_content" class="mt-4">
                <h4 class="font-medium text-gray-900 mb-2">Scraped Content (first 500 chars)</h4>
                <div class="p-3 bg-gray-50 rounded text-sm max-h-32 overflow-y-auto">
                    {{ singleResult.scraped_content }}
                </div>
            </div>

            <div v-if="singleResult.error" class="mt-4 p-3 bg-red-50 text-red-800 rounded">
                <strong>Error:</strong> {{ singleResult.error }}
            </div>
        </div>

        <!-- Batch Processing Section -->
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Batch Process Characters</h2>

            <div class="flex flex-wrap gap-4 items-center mb-4">
                <label class="flex items-center gap-2">
                    <input v-model="batchTestMode" type="checkbox" />
                    <span>Test Mode (don't save to database)</span>
                </label>

                <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600">Process</span>
                    <input
                          v-model.number="batchLimit"
                          type="number"
                          min="1"
                          max="20"
                          class="w-16 px-2 py-1 border rounded"
                    />
                    <span class="text-sm text-gray-600">characters</span>
                </div>

                <button
                      @click="processBatch"
                      :disabled="batchLoading"
                      class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                    {{ batchLoading ? 'Processing...' : 'Process Batch' }}
                </button>
            </div>

            <!-- Batch Status -->
            <div v-if="batchStatus" class="mb-4 p-3 rounded" :class="batchStatusClass">
                {{ batchStatus }}
            </div>

            <!-- Batch Progress -->
            <div v-if="batchLoading" class="mb-4">
                <div class="bg-gray-200 rounded-full h-2">
                    <div class="bg-green-600 h-2 rounded-full transition-all" :style="`width: ${batchProgress}%`"></div>
                </div>
                <p class="text-sm text-gray-600 mt-1">Processing character {{ currentCharacterIndex }} of {{ batchLimit }}</p>
            </div>

            <!-- Batch Results -->
            <div v-if="batchResults.length > 0" class="overflow-x-auto">
                <table class="w-full border-collapse">
                    <thead>
                    <tr class="bg-gray-50">
                        <th class="border px-4 py-2 text-left">Character</th>
                        <th class="border px-4 py-2 text-left">Affiliation Found</th>
                        <th class="border px-4 py-2 text-left">Status</th>
                        <th class="border px-4 py-2 text-left">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="(result, index) in batchResults" :key="index">
                        <td class="border px-4 py-2 font-medium">{{ result.character }}</td>
                        <td class="border px-4 py-2">
                <span v-if="result.affiliation"
                      class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                  {{ result.affiliation }}
                </span>
                            <span v-else class="text-gray-500">None found</span>
                        </td>
                        <td class="border px-4 py-2">
                <span
                      class="px-2 py-1 rounded text-sm"
                      :class="{
                    'bg-green-100 text-green-800': result.status === 'success',
                    'bg-yellow-100 text-yellow-800': result.status === 'no_affiliation_found',
                    'bg-red-100 text-red-800': result.status === 'error'
                  }"
                >
                  {{ result.status.replace(/_/g, ' ') }}
                </span>
                        </td>
                        <td class="border px-4 py-2">
                            <button
                                  v-if="result.affiliation && batchTestMode"
                                  @click="updateSingleCharacter(result)"
                                  class="text-blue-600 hover:underline text-sm"
                            >
                                Apply This One
                            </button>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup>
definePageMeta({
    title: 'Test Affiliations',
})

// Single test
const testCharacterName = ref('Monkey D. Luffy')
const testFandomUrl = ref('https://onepiece.fandom.com/wiki/Monkey_D._Luffy')
const singleLoading = ref(false)
const singleResult = ref(null)

// Batch processing
const batchTestMode = ref(true)
const batchLimit = ref(5)
const batchLoading = ref(false)
const batchStatus = ref('')
const batchResults = ref([])
const batchProgress = ref(0)
const currentCharacterIndex = ref(0)

const batchStatusClass = computed(() => {
    if (batchStatus.value.includes('Error')) return 'bg-red-100 text-red-800'
    if (batchStatus.value.includes('Success') || batchStatus.value.includes('complete')) return 'bg-green-100 text-green-800'
    return 'bg-blue-100 text-blue-800'
})

// Test single character
const testSingle = async () => {
    if (!testFandomUrl.value) return

    singleLoading.value = true
    singleResult.value = null

    try {
        const response = await $fetch('/api/test-affiliation', {
            method: 'POST',
            body: {
                fandom_url: testFandomUrl.value,
                character_name: testCharacterName.value
            }
        })

        if (response.success) {
            singleResult.value = response.result
        } else {
            singleResult.value = {
                character_name: testCharacterName.value,
                fandom_url: testFandomUrl.value,
                error: response.error,
                content_source: 'error',
                affiliation: null
            }
        }
    } catch (error) {
        singleResult.value = {
            character_name: testCharacterName.value,
            fandom_url: testFandomUrl.value,
            error: error.message,
            content_source: 'error',
            affiliation: null
        }
    } finally {
        singleLoading.value = false
    }
}

// Process batch
const processBatch = async () => {
    batchLoading.value = true
    batchStatus.value = 'Starting batch processing...'
    batchProgress.value = 0
    batchResults.value = []
    currentCharacterIndex.value = 0

    try {
        const response = await $fetch('/api/update-affiliations', {
            method: 'POST',
            body: {
                test_mode: batchTestMode.value,
                limit: batchLimit.value
            }
        })

        if (response.success) {
            batchResults.value = response.results
            batchProgress.value = 100

            const foundCount = response.results.filter(r => r.affiliation).length
            if (batchTestMode.value) {
                batchStatus.value = `Test complete! Found affiliations for ${foundCount} out of ${response.processed} characters.`
            } else {
                batchStatus.value = `Success! Updated ${response.updated} characters with affiliations.`
            }
        } else {
            batchStatus.value = `Error: ${response.error}`
        }
    } catch (error) {
        batchStatus.value = `Error: ${error.message}`
    } finally {
        batchLoading.value = false
    }
}

// Update single character (when in test mode)
const updateSingleCharacter = async (result) => {
    try {
        const response = await $fetch('/api/update-affiliations', {
            method: 'POST',
            body: {
                test_mode: false,
                limit: 1,
                character_name: result.character
            }
        })

        if (response.success) {
            result.status = 'updated'
            batchStatus.value = `Updated ${result.character} with affiliation: ${result.affiliation}`
        }
    } catch (error) {
        batchStatus.value = `Error updating ${result.character}: ${error.message}`
    }
}

// Set some example URLs for quick testing
const quickTests = [
    { name: 'Monkey D. Luffy', url: 'https://onepiece.fandom.com/wiki/Monkey_D._Luffy' },
    { name: 'Roronoa Zoro', url: 'https://onepiece.fandom.com/wiki/Roronoa_Zoro' },
    { name: 'Trafalgar D. Water Law', url: 'https://onepiece.fandom.com/wiki/Trafalgar_D._Water_Law' },
    { name: 'Portgas D. Ace', url: 'https://onepiece.fandom.com/wiki/Portgas_D._Ace' }
]

const setQuickTest = (test) => {
    testCharacterName.value = test.name
    testFandomUrl.value = test.url
}
</script>