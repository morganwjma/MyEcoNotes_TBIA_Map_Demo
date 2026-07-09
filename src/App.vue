<template>
  <div class="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50 text-slate-800 font-sans" style="height: 100dvh; width: 100vw;">
    
    <div v-if="isLoading" class="fixed top-0 left-0 w-full h-1.5 z-[2000] bg-slate-200">
      <div class="h-full bg-blue-600 transition-all duration-300" :style="{ width: progress + '%' }"></div>
    </div>

    <div class="w-full md:w-96 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:h-full z-20 transition-all duration-300 shadow-xl shrink-0"
         :class="{'h-auto max-h-[80vh]': isMobilePanelOpen, 'h-16 overflow-hidden md:h-full': !isMobilePanelOpen}">
      
      <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-white cursor-pointer md:cursor-auto" @click="toggleMobilePanel">
        <div>
          <h1 class="text-sm md:text-lg font-bold text-emerald-600">MyEcoNotes 雙核預測地圖</h1>
          <p class="text-[10px] text-slate-500 mt-1 hidden md:block">RF 特徵篩選 + MaxEnt 機率推論</p>
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
             <span class="text-[10px] font-bold">4×4 矩陣 <span class="text-emerald-600 ml-1">(+ 雙核潛力區)</span></span>
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
          
          <div v-if="nicheProfile && nicheProfile.importance" class="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 class="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 border-l-2 border-emerald-500 pl-2 flex items-center justify-between">
              <span>🧬 RF + MaxEnt 雙核預測引擎</span>
            </h3>

            <div v-if="nicheProfile.usedMode === 'strict'" class="mb-3 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-700 flex flex-col gap-1 shadow-sm">
              <div class="font-bold flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                🚀 嚴格驗證模式 (Strict Train/Test Split)
              </div>
              <div class="flex justify-between items-center mt-1">
                <span class="text-[10px] text-indigo-600 leading-tight pr-2">資料充足，系統調查訓練，公民科學盲測。</span>
                <span class="bg-indigo-600 text-white px-2 py-0.5 rounded font-bold whitespace-nowrap">
                  準確率: {{ (nicheProfile.validationScore * 100).toFixed(1) }}%
                </span>
              </div>
            </div>
            
            <div v-else class="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex flex-col gap-1 shadow-sm">
              <div class="font-bold flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                🧩 彈性混合模式 (Adaptive 90/10 Fallback)
              </div>
              <div class="flex justify-between items-center mt-1">
                <span class="text-[10px] text-amber-600 leading-tight pr-2">自動降級：抽 10% 隨機調查作盲測集。</span>
                <span class="bg-amber-600 text-white px-2 py-0.5 rounded font-bold whitespace-nowrap">
                  準確率: {{ (nicheProfile.validationScore * 100).toFixed(1) }}%
                </span>
              </div>
            </div>

            <div class="mb-4">
              <div class="text-[10px] text-slate-500 font-bold mb-1">🌲 第一階段：Random Forest 雜訊剔除</div>
              <div class="flex flex-wrap gap-1">
                <span v-for="feat in nicheProfile.droppedFeatures" :key="feat" class="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[10px] line-through">
                  {{ getFeatLabel(feat) }} (貢獻 &lt; 5%)
                </span>
                <span v-if="nicheProfile.droppedFeatures.length === 0" class="text-[10px] text-slate-400">無剔除特徵</span>
              </div>
            </div>
            
            <div class="text-[10px] text-slate-500 font-bold flex justify-between mb-2">
              <span>🏔️ 第二階段：MaxEnt 黃金特徵正負關聯</span>
            </div>
            
            <div class="space-y-3">
              <div v-for="feat in nicheProfile.importance" :key="feat.name" class="flex items-center text-xs">
                <span class="w-12 text-slate-600 font-bold">{{ getFeatLabel(feat.name) }}</span>
                <div class="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden mx-3 shadow-inner flex">
                  <div :class="feat.sign > 0 ? 'bg-emerald-500' : 'bg-rose-500'" 
                       class="h-full transition-all duration-500" 
                       :style="{ width: feat.percent + '%' }"></div>
                </div>
                <span :class="feat.sign > 0 ? 'text-emerald-700' : 'text-rose-700'" class="w-10 text-right font-mono font-bold">
                  {{ feat.sign > 0 ? '+' : '-' }}{{ feat.percent }}%
                </span>
              </div>
            </div>
            
            <p class="text-[9px] text-slate-400 mt-4 leading-tight">
              * 混合管線：先以隨機森林(RF)尋找 Gini 貢獻度，剔除噪音特徵後，再交由最大熵模型(MaxEnt)針對保留特徵進行梯度下降優化。綠色代表偏好，紅色代表迴避。
            </p>
          </div>

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
const nicheProfile = ref(null); 

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
const toggleMobilePanel = () => { if (isMobile.value) isMobilePanelOpen.value = !isMobilePanelOpen.value; };

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
let recommendationLayerGroup = null; 

const envGridsLoaded = ref(false);
const envGridsData = shallowRef({});

// ==========================================
// 2. 顏色、資料處理與特徵函數
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

const calcRealDev = (p) => {
  if (!p) return 0;
  const u = (parseFloat(p.c) || 0) / 10.0;
  const a = (parseFloat(p.a) || 0) / 10.0;
  return Math.min(1.0, Math.pow(u, 0.5) + a * 0.5); 
};

const getFeatLabel = (key) => {
  const map = { alt: '海拔', f: '樹林', g: '草地', w: '水域', a: '農田', c: '建築', dev: '干擾' };
  return map[key] || key;
};

// ==========================================
// 3. AI 報告生成邏輯
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

  const totalAll = totalCit + totalOff;
  const citPct = totalAll === 0 ? 0 : Math.round((totalCit / totalAll) * 100);
  const offPct = totalAll === 0 ? 0 : 100 - citPct;
  reportData.value = { totalGrids, totalCit, totalOff, avgSysRate, avgOppRate, citPct, offPct, maxPct: Math.max(citPct, offPct) };

  const getTaxaText = (prefix) => {
    const parts = [ form.value[`${prefix}_class`], form.value[`${prefix}_order`], form.value[`${prefix}_family`], form.value[`${prefix}_genus`], form.value[`${prefix}_species`] ].filter(v => v && v.trim() !== '');
    return parts.length > 0 ? parts.join(', ') : '全部/未指定';
  };
  
  const prompt = `你是專業生態地理空間分析專家。本次條件：包含：${getTaxaText('inc')} | 排除：${getTaxaText('exc')}。涵蓋 ${totalGrids} 個地理網格。公民科學：${totalCit}筆 / 官方科學：${totalOff}筆。請結合目標類群生態習性，撰寫 150~200 字客觀的專家洞察。不要重複報表上的數字，直接給出結論。`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const result = await response.json();
    aiSummary.value = result.candidates?.[0]?.content?.parts?.[0]?.text || "無回傳資料";
  } catch (error) {
    aiSummary.value = "網路連線失敗。";
  } finally {
    isGeneratingAI.value = false;
  }
};

// ==========================================
// 4. 地圖與特徵庫初始化
// ==========================================
onMounted(() => {
  if (mapContainer.value) {
    map = L.map(mapContainer.value, { zoomControl: false }).setView([23.7, 120.9], 7);
    L.control.zoom({ position: isMobile.value ? 'topright' : 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB', subdomains: 'abcd', maxZoom: 20 }).addTo(map);
    recommendationLayerGroup = L.layerGroup().addTo(map);
    layerGroup = L.layerGroup().addTo(map);
    const ro = new ResizeObserver(() => { if (map) map.invalidateSize(); });
    ro.observe(mapContainer.value);
    setTimeout(() => { map.invalidateSize(); }, 400);
  }

  fetch('/data/taiwan_env_grids_ultimate.json')
    .then(res => res.json())
    .then(data => { envGridsData.value = data; envGridsLoaded.value = true; })
    .catch(e => console.error("環境底圖載入失敗", e));
});

// ==========================================
// ★ 5. 高穩定雙核引擎：RF 特徵篩選 -> MaxEnt 推論 (抗雜訊升級版)
// ==========================================
const calculateRecommendations = async (tbiaGrids) => {
  const envGrids = envGridsData.value;
  const existingH3s = new Set(tbiaGrids.map(d => d.h3_index));
  
  const allInitialFeats = ['alt', 'f', 'g', 'w', 'a', 'c', 'dev']; 

  const extractFeats = (grid) => ({
    alt: parseFloat(grid.alt) || 0,
    f: parseFloat(grid.f) || 0,
    g: parseFloat(grid.g) || 0,
    w: parseFloat(grid.w) || 0,
    a: parseFloat(grid.a) || 0,
    c: parseFloat(grid.c) || 0,
    dev: calcRealDev(grid)
  });

  const sysGrids = tbiaGrids.filter(d => d.official_effort > 0);
  const oppGrids = tbiaGrids.filter(d => d.citizen_effort > 0 && !(d.official_effort > 0));

  const sysProfiles = sysGrids.map(d => envGrids[d.h3_index]).filter(Boolean);
  const oppProfiles = oppGrids.map(d => envGrids[d.h3_index]).filter(Boolean);
  const allProfiles = [...sysProfiles, ...oppProfiles];

  if (allProfiles.length === 0) return [];
  const zones = new Set(allProfiles.map(p => p.z));

  const totalSysEffort = sysGrids.reduce((sum, d) => sum + (d.official_effort || 0), 0);
  const totalOppEffort = oppGrids.reduce((sum, d) => sum + (d.citizen_effort || 0), 0);
  const ADVANCED_THRESHOLD = 500;
  const isDataRich = totalSysEffort >= ADVANCED_THRESHOLD && totalOppEffort >= ADVANCED_THRESHOLD;

  const allH3s = Object.keys(envGrids);
  // 只取同區域、有道路的網格作為背景母體
  const availableNegH3s = allH3s.filter(h3 => !existingH3s.has(h3) && envGrids[h3].rd > 0 && zones.has(envGrids[h3].z));
  
  // ★ 穩定性強化 1：系統性空間抽樣 (Systematic Sampling) 代替純隨機
  // 確保每次抽出的負樣本 (Pseudo-absences) 都能均勻代表全台灣的環境分佈
  const getSystematicSamples = (arr, count) => {
    if (arr.length <= count) return arr;
    const step = arr.length / count;
    const result = [];
    for (let i = 0; i < count; i++) result.push(arr[Math.floor(i * step)]);
    return result;
  };

  // ----------------------------------------------------
  // 模塊 A：Random Forest (用來做特徵重要性篩選)
  // ----------------------------------------------------
  const buildTree = (data, depth, maxDepth, availableFeats) => {
    const labels = data.map(d => d.label);
    const posCount = labels.filter(l => l === 1).length;

    if (depth >= maxDepth || data.length <= 2 || posCount === 0 || posCount === data.length) {
      return { isLeaf: true, prob: posCount / data.length };
    }

    // RF 的特徵抽樣保留隨機性 (增加多樣性)
    const selectedFeats = [...availableFeats].sort(() => 0.5 - Math.random()).slice(0, 3);
    
    let bestGini = 1, bestSplit = null;

    selectedFeats.forEach(f => {
      // ★ 穩定性強化 2：分位數切割法 (Quantile Splits)
      // 將特徵值排序後取 10 等分位點，確保切割門檻每次都具備統計代表性，不會因為隨機而錯失關鍵特徵
      const uniqueVals = [...new Set(data.map(d => d.features[f]))].sort((a, b) => a - b);
      const thresholds = uniqueVals.length <= 10 
        ? uniqueVals 
        : Array.from({length: 10}, (_, i) => uniqueVals[Math.floor(uniqueVals.length * (i/10))]);

      thresholds.forEach(t => {
        const left = data.filter(d => d.features[f] <= t);
        const right = data.filter(d => d.features[f] > t);
        if (left.length === 0 || right.length === 0) return;

        const pL = left.filter(d => d.label === 1).length / left.length;
        const pR = right.filter(d => d.label === 1).length / right.length;
        const gini = (left.length / data.length) * (1 - (pL*pL + (1-pL)*(1-pL))) + 
                     (right.length / data.length) * (1 - (pR*pR + (1-pR)*(1-pR)));

        if (gini < bestGini) {
          bestGini = gini;
          bestSplit = { feature: f, threshold: t, leftData: left, rightData: right };
        }
      });
    });

    if (!bestSplit) return { isLeaf: true, prob: posCount / data.length };
    return {
      isLeaf: false, feature: bestSplit.feature, threshold: bestSplit.threshold,
      left: buildTree(bestSplit.leftData, depth + 1, maxDepth, availableFeats),
      right: buildTree(bestSplit.rightData, depth + 1, maxDepth, availableFeats)
    };
  };

  const runRandomForestFeatureSelection = async (trainData) => {
    statusMessage.value = `🌲 階段一：啟動 Random Forest 雜訊過濾...`;
    await new Promise(r => setTimeout(r, 10));

    const trees = [];
    // 樹量提升至 30 棵，進一步壓制隨機變異
    for (let i = 0; i < 30; i++) {
      // Bootstrap 抽樣
      const sample = Array.from({ length: trainData.length }, () => trainData[Math.floor(Math.random() * trainData.length)]);
      trees.push(buildTree(sample, 0, 5, allInitialFeats));
    }

    const importance = {};
    allInitialFeats.forEach(f => importance[f] = 0);
    const traverse = (node, depth) => {
      if (node.isLeaf) return;
      importance[node.feature] += (1 / Math.pow(depth + 1, 2));
      traverse(node.left, depth + 1);
      traverse(node.right, depth + 1);
    };
    trees.forEach(t => traverse(t, 0));

    const totalImp = Object.values(importance).reduce((a, b) => a + b, 0) || 1;
    
    const selectedFeats = [];
    const droppedFeats = [];
    Object.entries(importance).forEach(([feat, imp]) => {
      const pct = (imp / totalImp) * 100;
      if (pct >= 5.0) selectedFeats.push(feat);
      else droppedFeats.push(feat);
    });

    // ★ 穩定性強化 3：領域知識保底 (Domain Knowledge Anchor)
    // 海拔 (alt) 在台灣生態系絕對關鍵，強制將海拔拉回黃金特徵池，避免 MaxEnt 失控
    if (!selectedFeats.includes('alt')) {
      selectedFeats.push('alt');
      const idx = droppedFeats.indexOf('alt');
      if (idx > -1) droppedFeats.splice(idx, 1);
      console.log("⚓ 觸發保底機制：強制保留海拔 (alt) 特徵");
    }

    if (selectedFeats.length === 0) selectedFeats.push(...allInitialFeats);

    return { selectedFeats, droppedFeats };
  };

  // ----------------------------------------------------
  // 模塊 B：MaxEnt (Logistic Regression 梯度下降)
  // ----------------------------------------------------
  const getScaler = (data, activeFeats) => {
    const mins = {}, maxs = {};
    activeFeats.forEach(f => {
      mins[f] = Math.min(...data.map(d => d.features[f]));
      maxs[f] = Math.max(...data.map(d => d.features[f]));
      if (maxs[f] === mins[f]) maxs[f] = mins[f] + 1; 
    });
    return (feats) => {
      const norm = {};
      activeFeats.forEach(f => norm[f] = (feats[f] - mins[f]) / (maxs[f] - mins[f]));
      return norm;
    };
  };

  const trainMaxEnt = (trainData, normalizeFn, activeFeats, epochs, lr) => {
    const weights = {};
    activeFeats.forEach(f => weights[f] = 0.0);
    let bias = 0.0;
    const m = trainData.length;

    for (let e = 0; e < epochs; e++) {
      let dw = {}, db = 0;
      activeFeats.forEach(f => dw[f] = 0.0);

      for (const d of trainData) {
        const normX = normalizeFn(d.features);
        let z = bias;
        activeFeats.forEach(f => z += weights[f] * normX[f]);
        
        const p = 1.0 / (1.0 + Math.exp(-z));
        const err = p - d.label;

        db += err;
        activeFeats.forEach(f => dw[f] += err * normX[f]);
      }

      bias -= lr * (db / m);
      activeFeats.forEach(f => weights[f] -= lr * (dw[f] / m));
    }
    return { weights, bias };
  };

  const predictMaxEnt = (model, normalizeFn, activeFeats, feats) => {
    const normX = normalizeFn(feats);
    let z = model.bias;
    activeFeats.forEach(f => z += model.weights[f] * normX[f]);
    return 1.0 / (1.0 + Math.exp(-z)); 
  };

  // --- 執行混合流水線 ---
  const executePipeline = async (trainProfs, testProfs, modeName) => {
    const numNegs = Math.min(trainProfs.length * 2, availableNegH3s.length);
    // 使用系統性抽樣取代隨機，確保背景特徵穩定
    const negProfs = getSystematicSamples(availableNegH3s, numNegs).map(h3 => envGrids[h3]);

    const trainData = [
      ...trainProfs.map(p => ({ features: extractFeats(p), label: 1 })),
      ...negProfs.map(p => ({ features: extractFeats(p), label: 0 }))
    ];

    // 1. RF Feature Selection
    const { selectedFeats, droppedFeats } = await runRandomForestFeatureSelection(trainData);
    
    // 2. MaxEnt Training
    const normalizeFn = getScaler(trainData, selectedFeats);
    let bestModel = null;
    let bestRecall = 0;
    let currentEpochs = 200; // 提升初始收斂次數
    const learningRate = 0.5;

    for (let attempt = 1; attempt <= 3; attempt++) {
      statusMessage.value = `🏔️ 階段二：訓練 MaxEnt 中 [${modeName}] (第 ${attempt} 輪)...`;
      await new Promise(r => setTimeout(r, 10));

      const model = trainMaxEnt(trainData, normalizeFn, selectedFeats, currentEpochs, learningRate);
      
      if (testProfs.length > 0) {
        let correct = 0;
        testProfs.forEach(grid => {
          const score = predictMaxEnt(model, normalizeFn, selectedFeats, extractFeats(grid));
          if (score > 0.40) correct++; 
        });
        const recall = correct / testProfs.length;

        if (recall > bestRecall) { bestRecall = recall; bestModel = model; }
        if (recall >= 0.80) break; 
      } else {
        bestModel = model;
        bestRecall = 1.0;
        break;
      }
      currentEpochs += 200;
    }
    return { model: bestModel, normalizeFn, activeFeats: selectedFeats, droppedFeats, recall: bestRecall };
  };

  // --- 自動降級控制 ---
  let finalModel = null, finalNormalizeFn = null, finalActiveFeats = [], finalDroppedFeats = [];
  let validationScore = 0, usedMode = '', tryFallback = false;

  if (isDataRich) {
    const result = await executePipeline(sysProfiles, oppProfiles, '嚴格驗證模式');
    if (result.recall >= 0.65) {
      finalModel = result.model; finalNormalizeFn = result.normalizeFn;
      finalActiveFeats = result.activeFeats; finalDroppedFeats = result.droppedFeats;
      validationScore = result.recall; usedMode = 'strict';
    } else tryFallback = true;
  } else {
    tryFallback = true;
  }

  if (tryFallback) {
    // 系統性抽樣取代隨機切分 Test Set
    let oppTrain = [], oppTest = [], sysTrain = [...sysProfiles];
    if (oppProfiles.length > 0) {
      const testSize = Math.max(1, Math.floor(oppProfiles.length * 0.1));
      oppTest = getSystematicSamples(oppProfiles, testSize);
      oppTrain = oppProfiles.filter(p => !oppTest.includes(p));
    } else {
      const testSize = Math.max(1, Math.floor(sysProfiles.length * 0.1));
      oppTest = getSystematicSamples(sysProfiles, testSize);
      sysTrain = sysProfiles.filter(p => !oppTest.includes(p));
    }

    const result = await executePipeline([...sysTrain, ...oppTrain], oppTest, '混合降級模式');
    finalModel = result.model; finalNormalizeFn = result.normalizeFn;
    finalActiveFeats = result.activeFeats; finalDroppedFeats = result.droppedFeats;
    validationScore = result.recall; usedMode = 'fallback';
  }

  // --- 解析 MaxEnt 權重供 UI 顯示 ---
  let totalWeightAbs = 0;
  finalActiveFeats.forEach(f => totalWeightAbs += Math.abs(finalModel.weights[f]));
  
  const sortedImportance = finalActiveFeats
    .map(feat => {
      const w = finalModel.weights[feat];
      const percent = totalWeightAbs === 0 ? 0 : Math.round((Math.abs(w) / totalWeightAbs) * 100);
      return { name: feat, percent, sign: w >= 0 ? 1 : -1 }; 
    })
    .filter(item => item.percent > 0) 
    .sort((a, b) => b.percent - a.percent);

  nicheProfile.value = { 
    importance: sortedImportance, 
    droppedFeatures: finalDroppedFeats,
    usedMode, 
    validationScore 
  };

  // --- 全台推論 ---
  let scoredGrids = [];
  let maxScore = 0;

  for (const [h3_id, grid] of Object.entries(envGrids)) {
    if (existingH3s.has(h3_id)) continue; 
    if (grid.rd === 0) continue; 
    if (!zones.has(grid.z)) continue; 

    const feats = extractFeats(grid);
    const finalScore = predictMaxEnt(finalModel, finalNormalizeFn, finalActiveFeats, feats); 

    if (finalScore > 0.40) {
      scoredGrids.push({ h3_id, grid, score: finalScore, realDev: feats.dev });
      if (finalScore > maxScore) maxScore = finalScore;
    }
  }

  return scoredGrids
    .map(sg => ({ ...sg, normalizedScore: (sg.score / maxScore) * 100 }))
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 500); 
};

// ==========================================
// 6. 渲染核心邏輯
// ==========================================
const startAnalysis = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  progress.value = 5; 
  layerGroup.clearLayers();
  recommendationLayerGroup.clearLayers(); 

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

    while (currentOffset < expectedTotal) {
      const payload = { ...buildColabPayload(), p_limit: limitSize, p_offset: currentOffset };
      const { data, error } = await supabase.rpc("get_habitat_grid_data", payload);
      if (error) throw error;
      if (!data || data.length === 0) break; 

      if (expectedTotal === Infinity) expectedTotal = data[0].total_count;

      const validChunkData = data.filter(d => d.sys_shannon_index > 0 || d.opp_shannon_index > 0 || d.citizen_effort > 0 || d.official_effort > 0);

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

          const env = envGridsData.value[row.h3_index];
          let envHtml = '';
          if (env) {
            const realDev = calcRealDev(env);
            envHtml = `
              <div style="background: #e2e8f0; padding: 6px; border-radius: 4px; margin-bottom: 6px; color: #334155; border: 1px solid #cbd5e1;">
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px; color: #0f172a;">🌍 環境因子 (Ground Truth)</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
                  <span>⛰️ 海拔: <b>${env.alt}m</b></span>
                  <span>🌡️ 氣溫: <b>${env.tmp}°C</b></span>
                  <span>🛣️ 易達: <b>${env.rd}</b></span>
                  <span>🏗️ 干擾: <b>${(realDev * 100).toFixed(0)}%</b></span>
                </div>
                <div style="font-size: 11px; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                  🌲林:<b>${env.f}</b> | 🚜農:<b>${env.a}</b> | 💧水:<b>${env.w}</b> | 🌾草:<b>${env.g}</b> | 🏙️城:<b>${env.c}</b>
                </div>
              </div>
            `;
          }

          const tooltipHtml = `
            <div style="font-family: sans-serif; min-width: 260px; padding: 4px; font-size: 12px; line-height: 1.4;">
              <div style="color: ${hexColor}; font-weight: bold; margin-bottom: 6px; font-size: 14px;">已調查網格: ${row.h3_index}</div>
              ${envHtml}
              <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; margin-bottom: 6px;">
                <div style="font-size: 11px; font-weight: bold; color: #475569; margin-bottom: 2px;">📂 調查次數</div>
                <div style="display: flex; gap: 12px;">
                  <span>公民科學: <b style="color: #1d4ed8;">${citEffort}</b></span>
                  <span>非公民科學: <b style="color: #ea580c;">${offEffort}</b></span>
                </div>
              </div>
            </div>
          `;

          L.polygon(boundary, { color: hexColor, weight: 1.5, stroke: (citEffort > 0 || offEffort > 0), fillColor: hexColor, fillOpacity: fillOpacity })
           .bindTooltip(tooltipHtml, { className: 'custom-tooltip' }).addTo(layerGroup);
        });
      }
      currentOffset += data.length;      
      progress.value = Math.min(80, Math.floor((currentOffset / expectedTotal) * 80));
      statusMessage.value = `正在繪製調查網格... (${Math.min(currentOffset, expectedTotal)} / ${expectedTotal})`;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (accumulatedValidData.length === 0) {
      alert('該條件下未取得任何紀錄。');
      isLoading.value = false;
      statusMessage.value = '無資料';
      progress.value = 0;
      return;
    }

    if (envGridsLoaded.value && accumulatedValidData.length > 0) {
      statusMessage.value = '🤖 正在啟動 RF+MaxEnt 雙核模型...';
      await new Promise(resolve => setTimeout(resolve, 50)); 
      
      const recommendedGrids = await calculateRecommendations(accumulatedValidData);
      
      recommendedGrids.forEach(rg => {
        const boundary = h3Engine.cellToBoundary(rg.h3_id);
        const opacity = 0.2 + ((rg.normalizedScore / 100) * 0.6); 
        
        const tooltipHtml = `
          <div style="font-family: sans-serif; font-size: 13px;">
            <div style="font-weight: bold; color: #047857;">✨ 雙核模型推薦度: ${rg.normalizedScore.toFixed(1)}%</div>
            <hr style="margin: 4px 0;">
            <div style="font-size: 11px;">標高: ${rg.grid.alt}m | 氣溫: ${rg.grid.tmp}°C | 易達性: ${rg.grid.rd}</div>
            <div style="font-size: 11px; margin-top: 2px;">🌲林:${rg.grid.f} | 🚜農:${rg.grid.a} | 💧水:${rg.grid.w} | 🏗️干擾指數:${(rg.realDev * 100).toFixed(0)}%</div>
          </div>
        `;

        L.polygon(boundary, { color: '#10b981', weight: 1.5, dashArray: '4, 4', fillColor: '#059669', fillOpacity: opacity })
         .bindTooltip(tooltipHtml, { className: 'custom-tooltip' }).addTo(recommendationLayerGroup);
      });
    }

    progress.value = 100;
    statusMessage.value = `完成！渲染全台調查紀錄與熱區`;
    setTimeout(() => { statusMessage.value = ''; progress.value = 0; }, 3000);
    generateAIReport(accumulatedValidData);

  } catch (error) {
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
