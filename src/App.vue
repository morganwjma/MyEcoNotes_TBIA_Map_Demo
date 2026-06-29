<template>
  <div class="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50 text-slate-800 font-sans" style="height: 100dvh; width: 100vw;">
    
    <div class="w-full md:w-96 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:h-full z-20 transition-all duration-300 shadow-xl shrink-0"
         :class="{'h-auto max-h-[50vh]': isMobilePanelOpen, 'h-16 overflow-hidden md:h-full': !isMobilePanelOpen}">
      
      <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-white cursor-pointer md:cursor-auto" @click="toggleMobilePanel">
        <div>
          <h1 class="text-lg md:text-xl font-bold text-emerald-600">MyEcoNotes TBAI 調查資料地圖</h1>
          <p class="text-xs text-slate-500 mt-1 hidden md:block">10維參數 · RWD 響應式檢索，2024年度資料</p>
        </div>
        <div class="md:hidden text-slate-500">
          <svg v-if="!isMobilePanelOpen" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar" v-show="isMobilePanelOpen || !isMobile">
        <div>
          <h2 class="text-sm font-bold tracking-widest text-emerald-600 uppercase mb-3 border-l-2 border-emerald-600 pl-2">包含類群 (Include)</h2>
          <div class="space-y-3">
            <div v-for="level in taxonomyLevels" :key="'inc_'+level.key">
              <label class="block text-xs font-semibold text-slate-600 mb-1">{{ level.label }}</label>
              <input v-model="form['inc_' + level.key]" type="text" placeholder="多筆以逗號區隔" 
                class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
            </div>
          </div>
        </div>

        <div>
          <h2 class="text-sm font-bold tracking-widest text-red-500 uppercase mb-3 border-l-2 border-red-500 pl-2">排除類群 (Exclude)</h2>
          <div class="space-y-3">
            <div v-for="level in taxonomyLevels" :key="'exc_'+level.key">
              <label class="block text-xs font-semibold text-slate-600 mb-1">{{ level.label }}</label>
              <input v-model="form['exc_' + level.key]" type="text" placeholder="多筆以逗號區隔" 
                class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none transition-all">
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 md:p-6 border-t border-slate-200 bg-white/95 backdrop-blur-sm" v-show="isMobilePanelOpen || !isMobile">
        <div v-if="statusMessage" class="mb-4">
          <div class="text-xs font-bold text-blue-600 mb-1 flex justify-between">
            <span>{{ statusMessage }}</span>
            <span v-if="progress > 0">{{ progress }}%</span>
          </div>
          <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 transition-all duration-300 ease-out" :style="{ width: progress + '%' }"></div>
          </div>
        </div>

        <button @click="startAnalysis" :disabled="isLoading" 
          class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
          <span v-if="isLoading" class="flex items-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            運算中...
          </span>
          <span v-else>開始空間渲染</span>
        </button>
      </div>
    </div>

    <div class="flex-1 relative bg-slate-100 flex flex-col h-full z-0 w-full">
      <div ref="mapContainer" class="absolute inset-0 w-full h-full" style="height: 100%; width: 100%; z-index: 1;"></div>
      
      <div class="absolute bottom-4 right-4 md:bottom-6 md:right-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200 pointer-events-auto scale-90 md:scale-100 origin-bottom-right" style="z-index: 1000;">
        <div class="text-xs font-bold text-slate-800 mb-2 flex items-center justify-center border-b border-slate-200 pb-2">
          <span>4×4 雙變量覆蓋矩陣</span>
        </div>
        
        <div class="relative w-52 h-40 mx-auto mt-8 mb-2">
          
          <div class="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-20 h-20 rotate-[-45deg] flex flex-col shadow-lg">
            <div class="flex w-full h-1/4" v-for="y in [3,2,1,0]" :key="'y'+y">
              <div class="bivariate-cell w-1/4 h-full" v-for="x in [0,1,2,3]" :key="'x'+x" 
                :style="{ backgroundColor: getBivariateColorCode(x, y) }"
                :title="`公民科學層級: ${x} | 非公民科學層級: ${y}`">
              </div>
            </div>
          </div>

          <div class="absolute bottom-1 right-0 text-[11px] text-blue-700 font-bold whitespace-nowrap">
            公民科學
          </div>
          <div class="absolute bottom-1 left-0 text-[11px] text-orange-700 font-bold whitespace-nowrap">
            非公民科學
          </div>
          <div class="absolute top-[-10px] left-1/2 -translate-x-1/2 text-[11px] text-purple-700 font-bold whitespace-nowrap">
            核心雙高熱區
          </div>
          <div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 font-medium whitespace-nowrap">
            (無資料)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { createClient } from '@supabase/supabase-js';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';

// ==========================================
// 1. 初始化與參數設定
// ==========================================
const SUPABASE_URL = "https://psprlovfzsabgubugngb.supabase.co";
const SUPABASE_KEY = "sb_publishable_YWMUkNkPlcA1skYHWVmLUw_XMADzCwi";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const windowWidth = ref(window.innerWidth);
const isMobile = computed(() => windowWidth.value < 768);
const isMobilePanelOpen = ref(false); 

const handleResize = () => { windowWidth.value = window.innerWidth; };
onMounted(() => window.addEventListener('resize', handleResize));
onUnmounted(() => window.removeEventListener('resize', handleResize));

const toggleMobilePanel = () => {
  if (isMobile.value) isMobilePanelOpen.value = !isMobilePanelOpen.value;
};

const taxonomyLevels = [
  { key: 'class', label: '綱 (Class)' },
  { key: 'order', label: '目 (Order)' },
  { key: 'family', label: '科 (Family)' },
  { key: 'genus', label: '屬 (Genus)' },
  { key: 'species', label: '種/學名 (Species)' }
];

const form = ref({
  inc_class: 'Aves', inc_order: '', inc_family: '', inc_genus: '', inc_species: '',
  exc_class: '', exc_order: '', exc_family: '', exc_genus: '', exc_species: ''
});

const isLoading = ref(false);
const progress = ref(0);
const statusMessage = ref('');

const mapContainer = ref(null);
let map = null;
let layerGroup = null;

// ★ 4x4 漸層色彩矩陣升級版：橫軸(X)為公民藍、縱軸(Y)為非公民橘、對角重疊線融合為高質感紫色
// 4x4 陣列索引對應：[Y][X]，其中 Y 軸表示非公民科學(0-3)，X 軸表示公民科學(0-3)
const bivariatePalette = [
  ['transparent', '#dbeafe', '#93c5fd', '#1d4ed8'], // Y=0 (無非公民): 透明、極淡藍、中藍、純深藍
  ['#fff7ed',     '#e9d5ff', '#c084fc', '#7c3aed'], // Y=1 (低非公民): 極淡黃、淡紫色、亮紫色、中偏深紫
  ['#ffedd5',     '#f5d0fe', '#e879f9', '#a21caf'], // Y=2 (中非公民): 淡橘黃、淡粉紫、桃紫色、深粉紫
  ['#ea580c',     '#f43f5e', '#be185d', '#581c87']  // Y=3 (高非公民): 深橘黃、鮮紅紫、深紅紫、終極黑紫
];
const getBivariateColorCode = (x, y) => bivariatePalette[y][x];

// ★ 4x4 四階梯精密映射函數（0、1~5次、6~30次、31~100次、101次+）
const getEffortBin = (val) => {
  if (val === 0) return 0;   // 0 次：無資料
  if (val <= 5) return 1;    // 1 ~ 5 次：初階低觀測
  if (val <= 30) return 2;   // 6 ~ 30 次：中階穩定觀測
  return 3;                  // 31 次以上：高密度核心觀測區
};

const parseInputOrArray = (str) => {
  if (!str || str.trim() === '') return [];
  return str.split(',').map(s => s.trim()).filter(s => s);
};

const buildColabPayload = () => ({
  p_inc_class: parseInputOrArray(form.value.inc_class),
  p_exc_class: parseInputOrArray(form.value.exc_class),
  p_inc_order: parseInputOrArray(form.value.inc_order),
  p_exc_order: parseInputOrArray(form.value.exc_order),
  p_inc_family: parseInputOrArray(form.value.inc_family),
  p_exc_family: parseInputOrArray(form.value.exc_family),
  p_inc_genus: parseInputOrArray(form.value.inc_genus),
  p_exc_genus: parseInputOrArray(form.value.exc_genus),
  p_inc_species: parseInputOrArray(form.value.inc_species),
  p_exc_species: parseInputOrArray(form.value.exc_species),
  p_limit: 5000,
  p_offset: 0
});

const getH3Engine = () => {
  if (h3 && typeof h3.latLngToCell === 'function') return h3;
  if (h3 && h3.default && typeof h3.default.latLngToCell === 'function') return h3.default;
  if (window.h3) return window.h3;
  throw new Error("H3 引擎尚未載入完成");
};

// ==========================================
// 3. 地圖初始化 (改用 CartoDB Light 亮色底圖)
// ==========================================
onMounted(() => {
  if (mapContainer.value) {
    map = L.map(mapContainer.value, { zoomControl: false }).setView([23.7, 120.9], 7);
    L.control.zoom({ position: isMobile.value ? 'topright' : 'bottomright' }).addTo(map);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    layerGroup = L.layerGroup().addTo(map);

    const ro = new ResizeObserver(() => {
      if (map) map.invalidateSize();
    });
    ro.observe(mapContainer.value);

    setTimeout(() => { map.invalidateSize(); }, 400);
  }
});

// ==========================================
// 4. 最穩定單階段盲搜 + 金門邊界補正邏輯
// ==========================================
const startAnalysis = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  progress.value = 0;
  layerGroup.clearLayers();

  if (isMobile.value) isMobilePanelOpen.value = false;

  try {
    const h3Engine = getH3Engine();
    const basePayload = buildColabPayload(); 

    statusMessage.value = '部署高密度地理網格...';
    
    const TARGET_H3_RESOLUTION = 7;
    const taiwanGrids = new Set();
    const step = 0.01; 
    
    // 🌍 ★ 關鍵修正：將西界 lng 從 119.0 往西推進到 118.0，完美合圍金門島全境網格！
    for (let lat = 21.0; lat <= 26.0; lat += step) {
      for (let lng = 118.0; lng <= 123.0; lng += step) {
        taiwanGrids.add(h3Engine.latLngToCell(lat, lng, TARGET_H3_RESOLUTION));
      }
    }
    const gridArray = Array.from(taiwanGrids);

    // 依然使用最穩定的 2000 切包法
    const CHUNK_SIZE = 2000; 
    const chunks = [];
    for (let i = 0; i < gridArray.length; i += CHUNK_SIZE) {
      chunks.push(gridArray.slice(i, i + CHUNK_SIZE));
    }

    let allData = [];
    
    for (let i = 0; i < chunks.length; i++) {
      statusMessage.value = `跨區平行檢索 (${i+1}/${chunks.length})...`;
      progress.value = Math.round(((i + 1) / chunks.length) * 100);
      
      let retry = 0;
      while (retry < 3) {
        try {
          const payload = { ...basePayload, p_target_h3s: chunks[i] };
          const { data, error } = await supabase.rpc("get_habitat_grid_data", payload);
          
          if (error) throw error;
          if (data) {
            const validData = data.filter(d => d.sys_shannon_index > 0 || d.citizen_effort > 0 || d.official_effort > 0);
            allData = allData.concat(validData);
          }
          break;
        } catch (err) {
          retry++;
          console.warn(`第 ${i+1} 包超時重試 (${retry}/3)...`);
          if (retry === 3) throw err; 
          await new Promise(r => setTimeout(r, 1000)); 
        }
      }
    }
    
    if (allData.length === 0) {
      alert('該條件下在台灣及離島範圍內未取得任何紀錄。');
      isLoading.value = false;
      statusMessage.value = '無資料';
      return;
    }

    progress.value = 100;
    statusMessage.value = '地圖圖層渲染中...';

    // ==========================================
    // 繪製「包含金門離島」的最外圍合併大邊框
    // ==========================================
    try {
      const allValidH3s = allData.map(d => d.h3_index);
      const mergeFunc = h3Engine.cellsToMultiPolygon || h3Engine.h3SetToMultiPolygon; 
      
      if (mergeFunc) {
        const multiPolygon = mergeFunc(allValidH3s, true);
        if (multiPolygon) {
          L.geoJSON({
            type: 'Feature',
            geometry: { type: 'MultiPolygon', coordinates: multiPolygon }
          }, {
            style: { 
              color: '#475569', 
              weight: 2.2, 
              fill: false, 
              opacity: 0.8 
            },
            interactive: false 
          }).addTo(layerGroup);
        }
      }
    } catch (e) {
      console.warn("H3 大邊界融合失敗", e);
    }

    // ==========================================
    // 繪製 4x4 精密分色格塊
    // ==========================================
    allData.forEach(row => {
      if (!row.h3_index) return;
      
      const boundary = h3Engine.cellToBoundary(row.h3_index);
      const citEffort = row.citizen_effort || 0;
      const offEffort = row.official_effort || 0;
      
      // 升級：使用全新的 4 階映射
      const citBin = getEffortBin(citEffort);
      const offBin = getEffortBin(offEffort);
      const hexColor = getBivariateColorCode(citBin, offBin);
      
      const fillOpacity = (citEffort === 0 && offEffort === 0) ? 0.0 : 0.78;

      const tooltipHtml = `
        <div style="font-family: sans-serif; min-width: 240px; padding: 2px;">
          <div style="color: ${hexColor}; font-size: 14px; font-weight: bold; margin-bottom: 4px;">Res7: ${row.h3_index}</div>
          <hr style="border-color: #e5e5e5; margin: 6px 0;">
          <div style="font-weight: bold; color: #666; margin-bottom: 2px;">📂 驗證基底 (次數)</div>
          <div style="margin-left: 6px; font-size: 12px;">
            <span style="color: #1d4ed8;">• 公民科學: <b>${citEffort}</b> 次</span> | <span style="color: #ea580c;">• 非公民科學: <b>${offEffort}</b> 次</span>
          </div>
          <hr style="border-color: #e5e5e5; margin: 6px 0;">
          <div style="font-weight: bold; color: #16a34a; margin-bottom: 2px;">🟢 系統建模組</div>
          <div style="margin-left: 6px; font-size: 12px; color: #444;">
            • SPUE: <b>${row.sys_encounter_rate ? row.sys_encounter_rate.toFixed(2) : '0.00'}</b> | • 香農: <b>${row.sys_shannon_index ? row.sys_shannon_index.toFixed(2) : '0.00'}</b>
          </div>
        </div>
      `;

      L.polygon(boundary, {
        color: hexColor,   
        weight: 1.5,       
        stroke: (citEffort > 0 || offEffort > 0), 
        fillColor: hexColor,
        fillOpacity: fillOpacity
      }).bindTooltip(tooltipHtml, {
        direction: 'top',
        className: 'custom-tooltip'
      }).addTo(layerGroup);
    });

    statusMessage.value = `完成！成功包含金門離島，共渲染 ${allData.length} 個特徵網格`;
    setTimeout(() => { statusMessage.value = ''; progress.value = 0; }, 3000);

  } catch (error) {
    console.error("執行錯誤:", error);
    alert(`執行發生錯誤：\n${error.message || JSON.stringify(error)}`);
    statusMessage.value = '執行錯誤';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style>
  html, body, #app {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
  }
</style>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.bivariate-cell { transition: transform 0.1s; border: 1px solid rgba(255,255,255,0.2); }
.bivariate-cell:hover { transform: scale(1.15); z-index: 10; border: 1px solid #94a3b8; box-shadow: 0 0 10px rgba(0,0,0,0.15); }

:deep(.leaflet-tooltip.custom-tooltip) {
  background: rgba(255, 255, 255, 0.95) !important; 
  border: none !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
  border-radius: 8px !important; 
  padding: 6px !important; 
  color: #333;
}
:deep(.leaflet-tooltip-top.custom-tooltip:before) { border-top-color: rgba(255, 255, 255, 0.95) !important; }
</style>