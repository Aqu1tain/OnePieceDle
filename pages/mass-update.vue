<!-- pages/mass-update.vue -->
<template>
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div class="max-w-6xl mx-auto p-6">
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-2">Mass Update Character Affiliations</h1>
                <p class="text-xl text-gray-600">Automatically extract and update affiliations for all characters in your database</p>
            </div>

            <!-- Quick Stats Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 transform hover:scale-105 transition-transform">
                    <div class="text-3xl font-bold text-blue-600 mb-1">{{ stats?.total || 0 }}</div>
                    <div class="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Characters</div>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 transform hover:scale-105 transition-transform">
                    <div class="text-3xl font-bold text-green-600 mb-1">{{ stats?.withAffiliation || 0 }}</div>
                    <div class="text-sm font-medium text-gray-600 uppercase tracking-wide">Have Affiliations</div>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500 transform hover:scale-105 transition-transform">
                    <div class="text-3xl font-bold text-orange-600 mb-1">{{ stats?.needsProcessing || 0 }}</div>
                    <div class="text-sm font-medium text-gray-600 uppercase tracking-wide">Need Processing</div>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 transform hover:scale-105 transition-transform">
                    <div class="text-3xl font-bold text-purple-600 mb-1">{{ stats?.percentageComplete || 0 }}%</div>
                    <div class="text-sm font-medium text-gray-600 uppercase tracking-wide">Complete</div>
                </div>
            </div>

            <!-- Main Control Panel -->
            <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <div class="flex items-center mb-6">
                    <div class="bg-blue-500 rounded-full p-3 mr-4">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-900">Processing Settings</h2>
                </div>

                <!-- Mode Selection -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Select Mode</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label class="relative cursor-pointer">
                            <input
                                  v-model="testMode"
                                  :value="true"
                                  type="radio"
                                  name="mode"
                                  class="sr-only"
                            />
                            <div :class="[
                'border-2 rounded-xl p-6 transition-all duration-200',
                testMode ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
              ]">
                                <div class="flex items-center">
                                    <span class="text-3xl mr-3">🧪</span>
                                    <div>
                                        <div class="font-bold text-lg text-gray-900">Test Mode</div>
                                        <div class="text-sm text-gray-600">Preview changes without updating database</div>
                                    </div>
                                </div>
                            </div>
                        </label>

                        <label class="relative cursor-pointer">
                            <input
                                  v-model="testMode"
                                  :value="false"
                                  type="radio"
                                  name="mode"
                                  class="sr-only"
                            />
                            <div :class="[
                'border-2 rounded-xl p-6 transition-all duration-200',
                !testMode ? 'border-red-500 bg-red-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
              ]">
                                <div class="flex items-center">
                                    <span class="text-3xl mr-3">🚀</span>
                                    <div>
                                        <div class="font-bold text-lg text-gray-900">Live Mode</div>
                                        <div class="text-sm text-gray-600">Actually update the database</div>
                                    </div>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Batch Size -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Batch Size</h3>
                    <select v-model="batchSize" class="w-full md:w-auto px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium">
                        <option :value="3">3 characters (very slow, see each one)</option>
                        <option :value="5">5 characters (slow & live)</option>
                        <option :value="10">10 characters (faster)</option>
                    </select>
                </div>

                <!-- Action Button -->
                <div class="text-center">
                    <button
                          @click="startProcessing"
                          :disabled="processing || loadingStats"
                          :class="[
              'inline-flex items-center px-8 py-4 rounded-xl text-xl font-bold shadow-lg transform transition-all duration-200',
              processing || loadingStats
                ? 'bg-gray-400 cursor-not-allowed'
                : testMode
                  ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105 text-white'
                  : 'bg-red-600 hover:bg-red-700 hover:scale-105 text-white'
            ]"
                    >
            <span v-if="processing" class="mr-3">
              <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
                        <span v-else-if="testMode" class="mr-3">🧪</span>
                        <span v-else class="mr-3">🚀</span>

                        <span v-if="processing">Processing...</span>
                        <span v-else-if="testMode">Start Test Run</span>
                        <span v-else>Start Live Update</span>
                    </button>

                    <div v-if="stats && stats.needsProcessing" class="text-gray-600 mt-3">
                        Will process <span class="font-bold">{{ stats.needsProcessing }}</span> characters
                    </div>
                    <div v-else-if="stats && stats.needsProcessing === 0" class="text-green-600 mt-3 font-medium">
                        ✅ All characters already have affiliations!
                    </div>
                </div>

                <!-- Warning for live mode -->
                <div v-if="!testMode" class="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                    <div class="flex">
                        <div class="text-red-400 mr-3">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 class="font-bold text-red-800">Live Mode Warning</h4>
                            <p class="text-red-700 text-sm mt-1">This will permanently modify your database. Make sure you have a backup!</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Processing Status -->
            <div v-if="processing || results.length > 0" class="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <div class="flex items-center mb-6">
                    <div :class="[
            'rounded-full p-3 mr-4',
            processing ? 'bg-blue-500' : 'bg-green-500'
          ]">
                        <svg v-if="processing" class="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <svg v-else class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900">
                        <span v-if="processing">Processing...</span>
                        <span v-else>Results</span>
                    </h3>
                </div>

                <!-- Progress Bar -->
                <div v-if="processing" class="mb-8">
                    <div class="flex justify-between text-sm font-medium text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{{ processedCount }} / {{ totalCount }}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-4">
                        <div
                              class="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-300 shadow-sm"
                              :style="{ width: `${progressPercent}%` }"
                        ></div>
                    </div>
                    <div class="text-center text-lg font-medium text-gray-700 mt-2">{{ progressPercent }}% complete</div>
                </div>

                <!-- Summary Stats -->
                <div class="grid grid-cols-3 gap-6 mb-8">
                    <div class="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                        <div class="text-3xl font-bold text-green-700 mb-1">{{ successCount }}</div>
                        <div class="text-sm font-medium text-green-600 uppercase tracking-wide">Success</div>
                    </div>
                    <div class="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                        <div class="text-3xl font-bold text-red-700 mb-1">{{ failedCount }}</div>
                        <div class="text-sm font-medium text-red-600 uppercase tracking-wide">Failed</div>
                    </div>
                    <div class="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                        <div class="text-3xl font-bold text-blue-700 mb-1">{{ processedCount }}</div>
                        <div class="text-sm font-medium text-blue-600 uppercase tracking-wide">Processed</div>
                    </div>
                </div>

                <!-- Recent Results -->
                <div v-if="results.length > 0">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-xl font-bold text-gray-900">Live Results</h4>
                        <div v-if="processing" class="flex items-center text-blue-600">
                            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span class="text-sm font-medium">Processing...</span>
                        </div>
                    </div>

                    <div class="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
                        <div class="space-y-3">
                            <div v-for="(result, index) in results.slice().reverse()" :key="`${result.character}-${index}`"
                                 :class="[
                     'bg-white rounded-lg shadow-sm p-4 border transition-all duration-300',
                     index < 3 && processing ? 'ring-2 ring-blue-200 border-blue-300' : 'border-gray-200'
                   ]">
                                <div class="flex justify-between items-center">
                                    <div class="flex-1">
                                        <div class="font-bold text-lg text-gray-900">{{ result.character }}</div>
                                        <div class="text-sm text-gray-500">
                                            {{ result.attempts || 1 }} attempts
                                            <span v-if="result.error" class="text-red-500 ml-2">• {{ result.error }}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <div v-if="result.affiliation"
                                             class="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium animate-pulse">
                                            ✨ {{ result.affiliation }}
                                        </div>
                                        <div v-else class="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
                                            ❌ No affiliation found
                                        </div>
                                        <div :class="[
                      'w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold',
                      result.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    ]">
                                            {{ result.status === 'success' ? '✓' : '✗' }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Show processing indicator for next character -->
                    <div v-if="processing" class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <svg class="animate-spin h-5 w-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span class="text-blue-800 font-medium">
                Processing next batch... ({{ Math.min(processedCount + batchSize, totalCount) - processedCount }} characters)
              </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Success Message -->
            <div v-if="completed" class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 shadow-lg">
                <div class="flex items-center">
                    <div class="bg-green-500 rounded-full p-4 mr-6">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-2xl font-bold text-green-800 mb-2">🎉 Processing Complete!</h3>
                        <p class="text-green-700 text-lg">
                            Successfully processed <span class="font-bold">{{ processedCount }}</span> characters.
                            <span class="font-bold">{{ successCount }}</span> got new affiliations,
                            <span class="font-bold">{{ failedCount }}</span> failed.
                        </p>
                    </div>
                    <button
                          @click="refreshStats"
                          class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        Refresh Stats
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
definePageMeta({
    title: 'Mass Update Affiliations',
})

// Data
const stats = ref(null)
const loadingStats = ref(false)
const processing = ref(false)
const completed = ref(false)
const results = ref([])

// Settings
const testMode = ref(true)
const batchSize = ref(3) // Smaller for live updates

// Counters
const processedCount = ref(0)
const successCount = ref(0)
const failedCount = ref(0)
const totalCount = ref(0)
const currentOffset = ref(0)

// Computed
const progressPercent = computed(() => {
    if (!totalCount.value) return 0
    return Math.round((processedCount.value / totalCount.value) * 100)
})

// Methods
const loadStats = async () => {
    loadingStats.value = true
    try {
        const response = await $fetch('/api/mass-update-affiliations', {
            method: 'POST',
            body: { action: 'stats' }
        })
        stats.value = response
    } catch (error) {
        console.error('Failed to load stats:', error)
    } finally {
        loadingStats.value = false
    }
}

const refreshStats = async () => {
    await loadStats()
    completed.value = false
}

const startProcessing = async () => {
    if (!testMode.value) {
        const confirmed = confirm(`⚠️ LIVE MODE WARNING ⚠️

This will permanently update your database with new affiliations.

${stats.value?.needsProcessing || 0} characters will be processed.

Make sure you have a database backup!

Continue?`)

        if (!confirmed) return
    }

    // Reset everything
    processing.value = true
    completed.value = false
    results.value = []
    processedCount.value = 0
    successCount.value = 0
    failedCount.value = 0
    totalCount.value = stats.value?.needsProcessing || 0
    currentOffset.value = 0

    try {
        await processBatches()
    } catch (error) {
        alert(`Error: ${error.message}`)
    } finally {
        processing.value = false
    }
}

const processBatches = async () => {
    let hasMore = true

    while (hasMore && processing.value) {
        try {
            const action = currentOffset.value === 0 ? 'start' : 'next-batch'

            const response = await $fetch('/api/mass-update-affiliations', {
                method: 'POST',
                body: {
                    action,
                    test_mode: testMode.value,
                    batch_size: batchSize.value,
                    skip_existing: true,
                    offset: currentOffset.value
                }
            })

            if (response.success) {
                // Add new results to the beginning of array (most recent first)
                if (response.batch_results && response.batch_results.length > 0) {
                    // Add each result with a small delay for animation effect
                    for (const result of response.batch_results) {
                        results.value.unshift(result)

                        // Update counters
                        processedCount.value++
                        if (result.status === 'success') {
                            successCount.value++
                        } else {
                            failedCount.value++
                        }

                        // Small delay for visual effect
                        await new Promise(resolve => setTimeout(resolve, 100))
                    }
                }

                // Update totals
                totalCount.value = response.total_characters || 0
                currentOffset.value = response.next_offset || 0
                hasMore = response.has_more || false

                // If completed
                if (response.completed || !hasMore) {
                    completed.value = true
                    hasMore = false

                    // Refresh stats
                    await loadStats()
                } else {
                    // Delay between batches
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
            } else {
                throw new Error(response.error || 'Unknown error')
            }
        } catch (error) {
            console.error('Batch processing error:', error)
            throw error
        }
    }
}

// Load initial stats
onMounted(() => {
    loadStats()
})
</script>