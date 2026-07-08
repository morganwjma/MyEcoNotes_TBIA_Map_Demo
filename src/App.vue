<template>
  <div class="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50 text-slate-800 font-sans" style="height: 100dvh; width: 100vw;">
    
    <div v-if="isLoading" class="fixed top-0 left-0 w-full h-1.5 z-[2000] bg-slate-200">
      <div class="h-full bg-blue-600 transition-all duration-300" :style="{ width: progress + '%' }"></div>
    </div>

    <div class="w-full md:w-96 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:h-full z-20 transition-all duration-300 shadow-xl shrink-0"
         :class="{'h-auto max-h-[80vh]': isMobilePanelOpen, 'h-16 overflow-hidden md:h-full': !isMobilePanelOpen}">
      
      <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-white cursor-pointer md:cursor-auto" @click="toggleMobilePanel">
        <div>
          <h1 class="text-sm md:text-lg font-bold text-emerald-600">MyEcoNotes TBAI 調查資料地圖</h1>
          <p class="text-[10px] text-slate-500 mt-1 hidden md:block">10維參數 · RWD 響應式檢索，2024年度資料</p>
        </div>
        <div class="md:hidden text-slate-500">
          <svg v-if="!isMobilePanelOpen" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar" v-show="isMobilePanelOpen || !isMobile">
        <div>
          <h2 class="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-3 border-l-2 border-emerald-600 pl-2">包含類群 (Include)</h2>
          <div class="space-y-3">
            <div v-for="level in taxonomyLevels" :key="'inc_'+level.key">
              <label class="block text-[10px] font-semibold text-slate-500 uppercase">{{ level.label }}</label>
              <input v-model="form['inc_' + level.key]" type="text" placeholder="多筆以逗號區隔" 
                class="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
            </div>
          </div>
        </div>

        <div>
          <h2 class="text-xs font-bold tracking-widest text-red-500 uppercase mb-3 border-l-2 border-red-500 pl-2">排除類群 (Exclude)</h2>
          <div class="space-y-3">
            <div v-for="level in taxonomyLevels" :key="'exc_'+level.key">
              <label class="block text-[10px] font-semibold text-slate-500 uppercase">{{ level.label }}</label>
              <input v-model="form['exc_' + level.key]" type="text" placeholder="多筆以逗號區隔" 
                class="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none transition-all">
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-200 bg-white/95 backdrop-blur-sm" v-show="isMobilePanelOpen || !isMobile">
        <div v-if="statusMessage" class="mb-4">
          <div class="text-xs font-bold text-blue-600 mb-1 flex justify-between">
            <span>{{ statusMessage }}</span>
            <span>{{ progress }}%</span>
          </div>
        </div>

        <button @click="startAnalysis" :disabled="isLoading" 
          class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
          <span v-if="isLoading" class="flex items-center gap-2">
            <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            運算中...
          </span>
          <span v-else>開始空間渲染</span>
        </button>
      </div>
    </div>

    <div class="flex-1 relative bg-slate-100 flex flex-col h-full z-0 w-full">
      <div ref="mapContainer" class="absolute inset-0 w-full h-full"></div>
      
      <div class="absolute bottom-4 right-4 z-[9999] bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-visible transition-all duration-300 pointer-events-auto"
           :class="{'w-56 h-48': isLegendExpanded, 'w-12 h-12': !isLegendExpanded}">
        
        <button v-if="hasGeneratedReport" @click.stop="showReportModal = true" 
                class="absolute top-[-8px] right-[-8px] w-6 h-6 bg-amber-500 hover:bg-amber-400 text-white rounded-full font-bold text-sm shadow-md flex items-center justify-center z-[10000] border-2 border-white transition-transform hover:scale-110">
          !
        </button>

        <div v-if="!isLegendExpanded" @click.stop="isLegendExpanded = true" 
             class="w-full h-full flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded-xl overflow-hidden">
           <div class="w-8 h-8 rotate-[-45deg] flex flex-col shadow-sm">
             <div class="flex w-full h-1/4" v-for="y in [3,2,1,0]" :key="'thumb_y'+y">
               <div class="w-1/4 h-full" v-for="x in [0,1,2,3]" :key="'thumb_x'+x" 
                 :style="{ backgroundColor: getBivariateColorCode(x, y) }"></div>
             </div>
           </div>
        </div>

        <div v-else class="p-3 w-full h-full flex flex-col">
           <div class="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
             <span class="text-[10px] font-bold">4×4 矩陣 <span class="text-emerald-600 ml-1">(+推薦熱區)</span></span>
             <button @click.stop="isLegendExpanded = false" class="text-slate-400 hover:text-slate-600 font-bold">×</button>
           </div>
           <div class="relative w-28 h-28 mx-auto mt-2">
             <div class="absolute w-20 h-20 rotate-[-45deg] flex flex-col shadow-lg left-4 top-4">
               <div class="flex w-full h-1/4" v-for="y in [3,2,1,0]" :key="'y'+y">
                 <div class="w-1/4 h-full border-[0.5px] border-white/20" v-for="x in [0,1,2,3]" :key="'x'+x" 
                   :style="{ backgroundColor: getBivariateColorCode(x, y) }"></div>
               </div>
             </div>
           </div>
           <div class="text-[9px] text-center mt-2 flex justify-between px-2">
             <span class="text-orange-700">非公民科學</span>
             <span class="text-blue-700">公民科學</span>
           </div>
        </div>
      </div>
    </div>

    <div v-if="showReportModal" class="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" @click.self="showReportModal = false">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all">
        <div class="bg-emerald-600 px-5 py-4 flex justify-between items-center text-white">
          <h2 class="text-lg font-bold flex items-center gap-2">
            <span>✨</span> 空間分佈與專家總結
          </h2>
          <button @click="showReportModal = false" class="text-emerald-200 hover:text-white font-bold text-xl">&times;</button>
        </div>
        
        <div class="p-5 flex-1 max-h-[80vh] overflow-y-auto">
          <div v-if="reportData" class="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">基礎客觀資訊</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="bg-white p-2 rounded shadow-sm">
                <div class="text-slate-400 text-[10px]">有效網格數</div>
                <div class="font-bold text-slate-800 text-lg">{{ reportData.totalGrids }}</div>
              </div>
                <div class="bg-white p-2 rounded shadow-sm flex items-center justify-between gap-2">
                  <div class="flex-1">
                    <div class="text-slate-400 text-[10px] mb-1">來源分佈 (筆)</div>
                    <div class="text-xs leading-tight">
                      <div class="text-blue-600 font-bold">公民科學: {{ reportData.totalCit }}</div>
                      <div class="text-orange-600 font-bold">非公民科學: {{ reportData.totalOff }}</div>
                    </div>
                  </div>
                  <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-inner shrink-0"
                      :style="{ background: `conic-gradient(#2563eb 0% ${reportData.citPct}%, #ea580c ${reportData.citPct}% 100%)` }">
                    {{ reportData.maxPct }}%
                  </div>
                </div>
                <div class="bg-white p-2 rounded shadow-sm">
                <div class="text-slate-400 text-[10px]">平均系統遭遇率</div>
                <div class="font-bold text-emerald-600">{{ reportData.avgSysRate }}</div>
              </div>
              <div class="bg-white p-2 rounded shadow-sm">
                <div class="text-slate-400 text-[10px]">平均隨機遭遇率</div>
                <div class="font-bold text-purple-600">{{ reportData.avgOppRate }}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <svg v-if="isGeneratingAI" class="animate-spin h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              AI 專家小結
            </h3>
            <div class="text-slate-700 text-sm leading-relaxed p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 min-h-[100px]">
              <template v-if="isGeneratingAI">正在從空間資料萃取特徵，撰寫分析報告中...</template>
              <template v-else>{{ aiSummary }}</template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, shallowRef } from 'vue';
import { createClient } from '@supabase/supabase-js';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';

// ==========================================
// 1. 初始化與變數設定
// ==========================================
const isLegendExpanded = ref(false); 

const showReportModal = ref(false);
const hasGeneratedReport = ref(false);
const isGeneratingAI = ref(false);
const reportData = ref(null);
const aiSummary = ref('');

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
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
let layerGroup = null; // 原有的調查記錄圖層
let recommendationLayerGroup = null; // ★ 新增：AI 推薦熱區專屬圖層

// ★ 新增：環境特徵網格狀態
const envGridsLoaded = ref(false);
const envGridsData = shallowRef({});

// ==========================================
// 2. 顏色與資料處理
// ==========================================
const bivariatePalette = [
  ['transparent', '#dbeafe', '#93c5fd', '#1d4ed8'],
  ['#fff7ed',     '#e9d5ff', '#c084fc', '#7c3aed'],
  ['#ffedd5',     '#f5d0fe', '#e879f9', '#a21caf'],
  ['#ea580c',     '#f43f5e', '#be185d', '#581c87']
];
const getBivariateColorCode = (x, y) => bivariatePalette[y][x];

const getEffortBin = (val) => {
  if (val === 0) return 0;   
  if (val <= 5) return 1;    
  if (val <= 30) return 2;   
  return 3;                  
};

const parseInputOrArray = (str) => {
  if (!str || str.trim() === '') return [];
  return str.split(',').map(s => s.trim()).filter(s => s);
};

const buildColabPayload = () => ({
  p_target_h3s: [],
  p_inc_class: parseInputOrArray(form.value.inc_class),
  p_exc_class: parseInputOrArray(form.value.exc_class),
  p_inc_order: parseInputOrArray(form.value.inc_order),
  p_exc_order: parseInputOrArray(form.value.exc_order),
  p_inc_family: parseInputOrArray(form.value.inc_family),
  p_exc_family: parseInputOrArray(form.value.exc_family),
  p_inc_genus: parseInputOrArray(form.value.inc_genus),
  p_exc_genus: parseInputOrArray(form.value.exc_genus),
  p_inc_species: parseInputOrArray(form.value.inc_species),
  p_exc_species: parseInputOrArray(form.value.exc_species)
});

const getH3Engine = () => {
  if (h3 && typeof h3.latLngToCell === 'function') return h3;
  if (h3 && h3.default && typeof h3.default.latLngToCell === 'function') return h3.default;
  if (window.h3) return window.h3;
  throw new Error("H3 引擎尚未載入完成");
};

// ★ 新增：推薦演算法需要的統計函式
const getPercentile = (arr, p) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
};

// ==========================================
// 3. AI 報告生成邏輯 (原封不動保留)
// ==========================================
const generateAIReport = async (dataList) => {
  if (!dataList || dataList.length === 0) return;
  hasGeneratedReport.value = true;
  showReportModal.value = true;
  if (aiSummary.value) return; 

  isGeneratingAI.value = true;
  aiSummary.value = '';

  const totalGrids = dataList.length;
  const totalCit = dataList.reduce((sum, d) => sum + (d.citizen_effort || 0), 0);
  const totalOff = dataList.reduce((sum, d) => sum + (d.official_effort || 0), 0);
  const avgSysRate = (dataList.reduce((sum, d) => sum + (d.sys_encounter_rate || 0), 0) / totalGrids).toFixed(2);
  const avgOppRate = (dataList.reduce((sum, d) => sum + (d.opp_encounter_rate || 0), 0) / totalGrids).toFixed(2);
  const maxCitGrid = Math.max(...dataList.map(d => d.citizen_effort || 0));

  const totalAll = totalCit + totalOff;
  const citPct = totalAll === 0 ? 0 : Math.round((totalCit / totalAll) * 100);
  const offPct = totalAll === 0 ? 0 : 100 - citPct;
  const maxPct = Math.max(citPct, offPct); 

  reportData.value = { totalGrids, totalCit, totalOff, avgSysRate, avgOppRate, citPct, offPct, maxPct };

  const getTaxaText = (prefix) => {
    const parts = [
      form.value[`${prefix}_class`], form.value[`${prefix}_order`], form.value[`${prefix}_family`],
      form.value[`${prefix}_genus`], form.value[`${prefix}_species`]
    ].filter(v => v && v.trim() !== '');
    return parts.length > 0 ? parts.join(', ') : '全部/未指定';
  };
  const incTaxa = getTaxaText('inc');
  const excTaxa = getTaxaText('exc');

  const prompt = `你是一位專業的生態地理空間分析專家。
本次地圖空間運算的篩選條件如下：
- 目標包含類群：${incTaxa}
- 刻意排除類群：${excTaxa}
整體數據特徵：
- 涵蓋 ${totalGrids} 個地理網格。
- 公民科學：${totalCit}筆 (單格最高集中 ${maxCitGrid}筆) / 官方非公民科學：${totalOff}筆。
- 平均系統遭遇率：${avgSysRate} / 平均隨機遭遇率：${avgOppRate}。
請根據上述「目標類群特性」與「數據結構」，撰寫一段約 150~200 字內的「專家洞察小結」。
【嚴格要求】：
1. 絕對不要在內文重複列出上述的具體數字。
2. 請結合「${incTaxa}」可能的生態習性或調查難易度，分析目前的資料結構。
3. 語氣客觀專業，直接給出結論。`;

  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('請填入')) {
    aiSummary.value = "【系統提示】請填入正確的 Gemini API Key。";
    isGeneratingAI.value = false;
    return;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const result = await response.json();
    if (result.error) {
      console.error("API 錯誤細節:", result.error);
      aiSummary.value = `API 錯誤：${result.error.message}`;
      return;
    }
    if (result.candidates && result.candidates[0].content) {
      aiSummary.value = result.candidates[0].content.parts[0].text;
    } else {
      aiSummary.value = "AI 無法產生結論，未知的回傳格式。";
    }
  } catch (error) {
    console.error("AI Error:", error);
    aiSummary.value = "網路連線失敗，請檢查網路狀態。";
  } finally {
    isGeneratingAI.value = false;
  }
};

// ==========================================
// 4. 系統地圖初始化
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

    // ★ 初始化兩個圖層，推薦圖層在下方，實體觀測資料蓋在上方
    recommendationLayerGroup = L.layerGroup().addTo(map);
    layerGroup = L.layerGroup().addTo(map);

    const ro = new ResizeObserver(() => {
      if (map) map.invalidateSize();
    });
    ro.observe(mapContainer.value);

    setTimeout(() => { map.invalidateSize(); }, 400);
  }

  // ★ 背景非同步載入環境特徵庫
  fetch('/data/taiwan_env_grids_ultimate.json')
    .then(res => res.json())
    .then(data => {
      envGridsData.value = data;
      envGridsLoaded.value = true;
      console.log("環境特徵庫 taiwan_env_grids_ultimate.json 載入完成！");
    })
    .catch(e => console.error("環境底圖載入失敗，請確認檔案位於 public/data/ 中", e));
});

// ==========================================
// ★ 5. 動態生態棲位推薦運算 (新增功能)
// ==========================================
// ★ 修正 1 & 2：加入排除已調查網格與強化棲位分歧權重
const calculateRecommendations = (tbiaGrids) => {
  const envGrids = envGridsData.value;
  
  // 建立「已調查網格」Set，排除已調查過的區域
  const existingH3s = new Set(tbiaGrids.map(d => d.h3_index));
  
  // 篩選出 TBIA 點位對應到的環境特徵
  const presenceProfiles = tbiaGrids
    .map(d => envGrids[d.h3_index])
    .filter(Boolean);

  if (presenceProfiles.length === 0) return [];

  // 1. 統計萃取：海拔、溫度、開發度 (去極端值)
  const alts = presenceProfiles.map(p => p.alt);
  const tmps = presenceProfiles.map(p => p.tmp);
  const devs = presenceProfiles.map(p => p.dev);
  const zones = new Set(presenceProfiles.map(p => p.z));

  // 計算容許範圍 (P05 ~ P95)
  const alt_min = getPercentile(alts, 0.05); 
  const alt_max = getPercentile(alts, 0.95); 
  const tmp_min = getPercentile(tmps, 0.05);
  const tmp_max = getPercentile(tmps, 0.95);
  const dev_p90 = getPercentile(devs, 0.90);

  // 計算地景特徵統計
  const getStats = (arr) => {
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const std = Math.sqrt(arr.map(v => Math.pow(v - mean, 2)).reduce((s, v) => s + v, 0) / arr.length);
    return { mean, std, p10: getPercentile(arr, 0.10) };
  };

  const habStats = {};
  ['f', 'g', 'w', 'a', 'c'].forEach(hab => {
    const vals = presenceProfiles.map(p => parseFloat(p[hab]) || 0);
    habStats[hab] = getStats(vals);
  });

  // 2. 開始全台網格掃描
  let scoredGrids = [];
  let maxScore = 0;

  for (const [h3_id, grid] of Object.entries(envGrids)) {
    // 【絕對過濾層：硬性規則】
    if (existingH3s.has(h3_id)) continue;           // 排除已調查過的
    if (grid.rd === 0) continue;                    // 排除無法到達的
    if (!zones.has(grid.z)) continue;               // 排除區域不符
    
    // ★ 關鍵修正：補上海拔與溫度過濾
    if (grid.alt < alt_min || grid.alt > alt_max) continue; 
    if (grid.tmp < tmp_min || grid.tmp > tmp_max) continue; 
    
    // 排除過度開發區域
    if (grid.dev > dev_p90) continue; 

    // 【棲地配對與計分】
    let failedHardReq = false;
    let baseScore = 0;
    let habsOver2 = 0;

    ['f', 'g', 'w', 'a'].forEach(hab => {
      const stat = habStats[hab];
      // 如果 P10 > 0.5，代表該棲地是「必要條件」
      if (stat.p10 > 0.5 && parseFloat(grid[hab] || 0) < stat.p10) {
        failedHardReq = true;
      }
      
      // 計算權重得分
      const weight = stat.mean / (stat.std + 0.1); 
      const gridHabVal = parseFloat(grid[hab] || 0);
      baseScore += gridHabVal * weight; 
      if (gridHabVal > 2.0) habsOver2++;
    });

    if (failedHardReq) continue; // 缺少必要條件直接剔除

    // 【加分機制與懲罰】
    if (habsOver2 >= 2) baseScore *= 1.3; // 邊緣效應加分
    const finalScore = baseScore * (1.0 - (grid.dev * 0.8)); // 開發度懲罰

    if (finalScore > 0) {
      scoredGrids.push({ h3_id, grid, score: finalScore });
      if (finalScore > maxScore) maxScore = finalScore;
    }
  }

  return scoredGrids
    .map(sg => ({ ...sg, normalizedScore: (sg.score / maxScore) * 100 }))
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 500); 
};

// ==========================================
// 6. 全新空間渲染核心邏輯 (精準煞車防當機版 + 推薦疊加)
// ==========================================
const startAnalysis = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  progress.value = 5; 
  layerGroup.clearLayers();
  recommendationLayerGroup.clearLayers(); // ★ 同時清除推薦圖層

  aiSummary.value = ''; 
  hasGeneratedReport.value = false;
  if (isMobile.value) isMobilePanelOpen.value = false;

  try {
    const h3Engine = getH3Engine();
    let currentOffset = 0;
    const limitSize = 1000;
    let expectedTotal = Infinity; 
    let accumulatedValidData = [];

    statusMessage.value = '連線資料庫，請求空間數據...';

    // (原封不動：撈取資料庫與渲染雙色網格)
    while (currentOffset < expectedTotal) {
      const payload = { ...buildColabPayload(), p_limit: limitSize, p_offset: currentOffset };
      const { data, error } = await supabase.rpc("get_habitat_grid_data", payload);
      if (error) throw error;
      if (!data || data.length === 0) break; 

      if (expectedTotal === Infinity) {
        expectedTotal = data[0].total_count;
        console.log(`後端廣播：本次檢索共有 ${expectedTotal} 個地理網格。`);
      }

      const validChunkData = data.filter(d => 
        d.sys_shannon_index > 0 || d.opp_shannon_index > 0 || d.citizen_effort > 0 || d.official_effort > 0
      );

      if (validChunkData.length > 0) {
        accumulatedValidData = [...accumulatedValidData, ...validChunkData];
        
        validChunkData.forEach(row => {
          if (!row.h3_index) return;
          const boundary = h3Engine.cellToBoundary(row.h3_index);
          const citEffort = row.citizen_effort || 0;
          const offEffort = row.official_effort || 0;
          
          const citBin = getEffortBin(citEffort);
          const offBin = getEffortBin(offEffort);
          const hexColor = getBivariateColorCode(citBin, offBin);
          const fillOpacity = (citEffort === 0 && offEffort === 0) ? 0.0 : 0.78;

          const tooltipHtml = `
            <div style="font-family: sans-serif; min-width: 260px; padding: 4px; font-size: 12px; line-height: 1.4;">
              <div style="color: ${hexColor}; font-weight: bold; margin-bottom: 6px; font-size: 14px;">網格: ${row.h3_index}</div>
              <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; margin-bottom: 6px;">
                <div style="font-size: 11px; font-weight: bold; color: #475569; margin-bottom: 2px;">📂 調查次數</div>
                <div style="display: flex; gap: 12px;">
                  <span>公民科學: <b style="color: #1d4ed8;">${citEffort}</b></span>
                  <span>非公民科學: <b style="color: #ea580c;">${offEffort}</b></span>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <div style="font-weight: bold; color: #16a34a; font-size: 11px;">系統調查</div>
                  <div style="font-size: 11px;">遭遇率: <b>${row.sys_encounter_rate?.toFixed(2) || 0}</b></div>
                  <div style="font-size: 11px;">香濃: <b>${row.sys_shannon_index?.toFixed(2) || 0}</b></div>
                </div>
                <div>
                  <div style="font-weight: bold; color: #7c3aed; font-size: 11px;">隨機調查</div>
                  <div style="font-size: 11px;">遭遇率: <b>${row.opp_encounter_rate?.toFixed(2) || 0}</b></div>
                  <div style="font-size: 11px;">香濃: <b>${row.opp_shannon_index?.toFixed(2) || 0}</b></div>
                </div>
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
            direction: 'top', className: 'custom-tooltip'
          }).addTo(layerGroup);
        });
      }
      currentOffset += data.length;      
      progress.value = Math.min(80, Math.floor((currentOffset / expectedTotal) * 80));
      statusMessage.value = `正在繪製調查網格... (${Math.min(currentOffset, expectedTotal)} / ${expectedTotal})`;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (accumulatedValidData.length === 0) {
      alert('該條件下在所有範圍內未取得任何調查或觀測紀錄。');
      isLoading.value = false;
      statusMessage.value = '無資料';
      progress.value = 0;
      return;
    }

    try {
      const allValidH3s = accumulatedValidData.map(d => d.h3_index);
      const mergeFunc = h3Engine.cellsToMultiPolygon || h3Engine.h3SetToMultiPolygon; 
      if (mergeFunc) {
        const multiPolygon = mergeFunc(allValidH3s, true);
        if (multiPolygon) {
          L.geoJSON({
            type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: multiPolygon }
          }, { style: { color: '#475569', weight: 2.2, fill: false, opacity: 0.8 }, interactive: false }).addTo(layerGroup);
        }
      }
    } catch (e) { console.warn("H3 大邊界融合失敗", e); }

    // ==============================================================
    // ★ 在資料畫完之後，無縫啟動推薦網格渲染
    // ==============================================================
    if (envGridsLoaded.value && accumulatedValidData.length > 0) {
      statusMessage.value = '正在執行 AI 生態棲位運算...';
      await new Promise(resolve => setTimeout(resolve, 50)); // 讓畫面稍作更新
      
      const recommendedGrids = calculateRecommendations(accumulatedValidData);
      
      recommendedGrids.forEach(rg => {
        const boundary = h3Engine.cellToBoundary(rg.h3_id);
        const opacity = 0.2 + ((rg.normalizedScore / 100) * 0.6); // 深度隨分數變化
        
        const tooltipHtml = `
          <div style="font-family: sans-serif; font-size: 13px;">
            <div style="font-weight: bold; color: #047857;">✨ AI 推薦潛力區: ${rg.normalizedScore.toFixed(1)}%</div>
            <hr style="margin: 4px 0;">
            <div style="font-size: 11px;">標高: ${rg.grid.alt}m | 氣溫: ${rg.grid.tmp}°C | 易達: ${rg.grid.rd}</div>
            <div style="font-size: 11px; margin-top: 2px;">🌲 林:${rg.grid.f} | 🚜 農:${rg.grid.a} | 💧 水:${rg.grid.w}</div>
          </div>
        `;

        L.polygon(boundary, {
          color: '#10b981',    // 亮綠色外框
          weight: 1.5,
          dashArray: '4, 4',   // 虛線外框，不會跟原本的實體網格混淆
          fillColor: '#059669',
          fillOpacity: opacity
        }).bindTooltip(tooltipHtml, { className: 'custom-tooltip' }).addTo(recommendationLayerGroup);
      });
    }

    progress.value = 100;
    statusMessage.value = `完成！渲染全台調查紀錄與推薦熱區`;
    setTimeout(() => { statusMessage.value = ''; progress.value = 0; }, 3000);

    generateAIReport(accumulatedValidData);

  } catch (error) {
    console.error("執行錯誤:", error);
    alert(`執行發生錯誤：\n${error.message || JSON.stringify(error)}`);
    statusMessage.value = '執行錯誤';
    progress.value = 0;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style>
  html, body, #app { margin: 0; padding: 0; height: 100%; width: 100%; }
</style>
<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.absolute.bottom-4.right-4 { z-index: 9999 !important; pointer-events: auto !important; }
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
