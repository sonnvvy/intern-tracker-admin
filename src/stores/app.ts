import { ref } from 'vue'
import { defineStore } from 'pinia'

const DELIVERY_VIEW_CACHE_KEY = 'intern-admin-delivery-view-cache'

export interface DeliveryViewCache {
  globalSearchInput: string
  status: string
  priority: string
  page: number
  pageSize: number
  selectedExportColumns: string[]
}

const defaultDeliveryViewCache: DeliveryViewCache = {
  globalSearchInput: '',
  status: '',
  priority: '',
  page: 1,
  pageSize: 5,
  selectedExportColumns: ['companyName', 'jobTitle', 'status', 'deliveryDate', 'priority', 'nextStep']
}

function loadDeliveryViewCache(): DeliveryViewCache {
  const raw = localStorage.getItem(DELIVERY_VIEW_CACHE_KEY)
  if (!raw) return { ...defaultDeliveryViewCache }

  try {
    const parsed = JSON.parse(raw) as Partial<DeliveryViewCache>
    return {
      ...defaultDeliveryViewCache,
      ...parsed,
      selectedExportColumns: Array.isArray(parsed.selectedExportColumns)
        ? parsed.selectedExportColumns
        : defaultDeliveryViewCache.selectedExportColumns
    }
  } catch {
    return { ...defaultDeliveryViewCache }
  }
}

export const useAppStore = defineStore('app', () => {
  const isCollapse = ref(false)
  const deliveryViewCache = ref<DeliveryViewCache>(loadDeliveryViewCache())

  function toggleCollapse() {
    isCollapse.value = !isCollapse.value
  }

  function persistDeliveryViewCache() {
    localStorage.setItem(DELIVERY_VIEW_CACHE_KEY, JSON.stringify(deliveryViewCache.value))
  }

  function updateDeliveryViewCache(patch: Partial<DeliveryViewCache>) {
    deliveryViewCache.value = {
      ...deliveryViewCache.value,
      ...patch
    }
    persistDeliveryViewCache()
  }

  function resetDeliveryViewCache() {
    deliveryViewCache.value = { ...defaultDeliveryViewCache }
    persistDeliveryViewCache()
  }

  return {
    isCollapse,
    deliveryViewCache,
    toggleCollapse,
    updateDeliveryViewCache,
    resetDeliveryViewCache
  }
})
