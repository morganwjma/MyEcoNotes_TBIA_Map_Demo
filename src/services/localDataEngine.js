/**
 * 🌲 MyEcoNotes 關係型生態資料運算引擎 (星狀架構直讀版)
 * 🚀 精準匹配版：解決 includes 導致的字串部分重疊誤判問題 (如 Cetacea vs Dacrymycetaceae)
 */
import { parquetRead } from 'hyparquet';

let dimSpeciesCache = null;
let factVisitsCache = null;
let factObsCache = null;
let historicalGapsCache = null;

const parseInputSet = (str) => {
    if (!str || str.trim() === '') return new Set();
    return new Set(str.split(',').map(s => s.trim().toLowerCase()).filter(s => s));
};

const safeStr = (val) => val ? String(val).trim().toLowerCase() : '';
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

const fetchJSONSafely = async (url) => {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const text = await res.text();
        if (text.startsWith('<')) throw new Error(`File not found: ${url}`);
        return JSON.parse(text);
    } catch (e) {
        console.error(`讀取 ${url} 失敗:`, e);
        return null;
    }
};

const loadParquetSafely = async (url) => {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        
        return new Promise((resolve, reject) => {
            parquetRead({
                file: arrayBuffer,
                rowFormat: 'object',
                onComplete: (data) => resolve(data)
            });
        });
    } catch (e) {
        console.error(`讀取 Parquet ${url} 失敗:`, e);
        return null;
    }
};

export async function getHabitatGridDataLocal(p_payload, onProgress = () => {}) {
    onProgress(5);
    
    // =========================================================================
    // 1. 一次性載入三張核心星狀表與歷史地圖
    // =========================================================================
    if (!dimSpeciesCache) {
        dimSpeciesCache = await loadParquetSafely('/data/database/dim_species.parquet');
        if (!dimSpeciesCache) throw new Error("缺少 dim_species.parquet");
    }
    onProgress(10);
    if (!factVisitsCache) {
        factVisitsCache = await loadParquetSafely('/data/database/fact_visits.parquet');
        if (!factVisitsCache) throw new Error("缺少 fact_visits.parquet");
    }
    onProgress(15);
    if (!factObsCache) {
        factObsCache = await loadParquetSafely('/data/database/fact_observations.parquet');
        if (!factObsCache) throw new Error("缺少 fact_observations.parquet");
    }
    onProgress(20);
    if (!historicalGapsCache) {
        historicalGapsCache = await fetchJSONSafely('/data/historical_gaps.json');
        if (!historicalGapsCache) historicalGapsCache = {};
    }
    onProgress(25);

    const incKeywords = parseInputSet(p_payload.inc_class);
    const excKeywords = parseInputSet(p_payload.exc_class);

    // =========================================================================
    // 2. 過濾目標物種 (100% 精準比對)
    // =========================================================================
    const targetSpeciesIds = new Set();
    const targetScientificNames = new Set(); 
    const hasAnyInclude = incKeywords.size > 0;

    let count = 0;
    for (let i = 0; i < dimSpeciesCache.length; i++) {
        const row = dimSpeciesCache[i];
        
        const sp_id = parseInt(row.species_id !== undefined ? row.species_id : row[0]);
        if (isNaN(sp_id)) continue; 

        // 提取並清理這隻物種的所有階層字串
        const speciesTaxaInfo = [
            safeStr(row.class !== undefined ? row.class : (row.taxa_class !== undefined ? row.taxa_class : row[3])),
            safeStr(row.taxon_order !== undefined ? row.taxon_order : row[4]),
            safeStr(row.family !== undefined ? row.family : row[5]),
            safeStr(row.genus !== undefined ? row.genus : row[6]),
            safeStr(row.scientific_name !== undefined ? row.scientific_name : row[7])
        ];

        // --- 排除邏輯 ---
        let isExcluded = false;
        for (const keyword of excKeywords) {
            // ★ 致命錯誤修復：把 includes() 換成絕對等於 ===
            if (speciesTaxaInfo.some(info => info === keyword)) {
                isExcluded = true; break;
            }
        }
        if (isExcluded) continue;

        // --- 包含邏輯 ---
        let isIncluded = !hasAnyInclude;
        if (hasAnyInclude) {
             for (const keyword of incKeywords) {
                // ★ 致命錯誤修復：把 includes() 換成絕對等於 ===
                if (speciesTaxaInfo.some(info => info === keyword)) {
                    isIncluded = true; break;
                }
            }
        }

        if (isIncluded) {
            targetSpeciesIds.add(sp_id);
            const sName = row.scientific_name !== undefined ? row.scientific_name : row[7];
            if (sName) targetScientificNames.add(String(sName).trim().toLowerCase());
        }
        
        if (++count % 5000 === 0) await yieldToMain();
    }

    if (targetSpeciesIds.size === 0) return { gridRows: [], historicalGaps: [] };
    onProgress(35);

    // =========================================================================
    // 3. 過濾事實表 (base_obs) 並找出有效網格 (valid_visits)
    // =========================================================================
    const validVisitsMap = new Map();
    const filteredObservations = [];  

    const fastVisitDict = new Map();
    for(let i = 0; i < factVisitsCache.length; i++) {
         const v = factVisitsCache[i];
         const v_id = parseInt(v.visit_id !== undefined ? v.visit_id : v[0]);
         if (!isNaN(v_id)) fastVisitDict.set(v_id, v);
    }

    for(let i = 0; i < factObsCache.length; i++){
        const row = factObsCache[i];
        const v_id = parseInt(row.visit_id !== undefined ? row.visit_id : row[0]);
        const s_id = parseInt(row.species_id !== undefined ? row.species_id : row[1]);

        if (targetSpeciesIds.has(s_id)) {
            filteredObservations.push(row);
            if (!validVisitsMap.has(v_id)) {
                const visitData = fastVisitDict.get(v_id);
                if (visitData) validVisitsMap.set(v_id, visitData);
            }
        }
        if (i % 50000 === 0) await yieldToMain();
    }
    onProgress(50);

    // =========================================================================
    // 4. 計算努力量與個體數 (Shannon Index 所需)
    // =========================================================================
    const gridEfforts = new Map(); 
    let effCount = 0;
    for (const [v_id, visitData] of validVisitsMap.entries()) {
        const h3_index = visitData.h3_index !== undefined ? visitData.h3_index : visitData[1];
        const party_type = visitData.party_type !== undefined ? visitData.party_type : visitData[2];
        const method_type = visitData.method_type !== undefined ? visitData.method_type : visitData[3];

        if (!gridEfforts.has(h3_index)) gridEfforts.set(h3_index, { cit_eff: 0, off_eff: 0, sys_eff: 0, opp_eff: 0 });
        const eff = gridEfforts.get(h3_index);
        
        if (party_type === 'citizen') eff.cit_eff++;
        if (party_type === 'official') eff.off_eff++;
        if (method_type === 'systematic') eff.sys_eff++;
        if (method_type === 'opportunistic') eff.opp_eff++;
        
        if (++effCount % 10000 === 0) await yieldToMain();
    }

    const speciesNiMap = new Map(); 
    for(let i = 0; i < filteredObservations.length; i++){
        const row = filteredObservations[i];
        const s_id = parseInt(row.species_id !== undefined ? row.species_id : row[1]);
        const v_id = parseInt(row.visit_id !== undefined ? row.visit_id : row[0]);
        const visitData = validVisitsMap.get(v_id);
        
        if (visitData) {
            const h3_index = visitData.h3_index !== undefined ? visitData.h3_index : visitData[1];
            const method_type = visitData.method_type !== undefined ? visitData.method_type : visitData[3];
            const key = h3_index + '#' + s_id + '#' + method_type;
            speciesNiMap.set(key, (speciesNiMap.get(key) || 0) + 1);
        }
        if (i % 50000 === 0) await yieldToMain();
    }

    const shannonCalc = new Map(); 
    let snCount = 0;
    for (const [keyStr, ni] of speciesNiMap.entries()) {
        const parts = keyStr.split('#');
        const sKey = parts[0] + '#' + parts[2]; 
        if (!shannonCalc.has(sKey)) shannonCalc.set(sKey, { total_ni: 0, sum_ni_ln_ni: 0 });
        const sc = shannonCalc.get(sKey);
        sc.total_ni += ni;
        sc.sum_ni_ln_ni += (ni * Math.log(ni));
        if (++snCount % 10000 === 0) await yieldToMain();
    }
    onProgress(70);

    // =========================================================================
    // 5. 產出最終網格結果
    // =========================================================================
    const recentActiveH3s = new Set();
    const finalGridRows = [];

    for (const [h3_index, eff] of gridEfforts.entries()) {
        const sysKey = h3_index + '#systematic';
        const oppKey = h3_index + '#opportunistic';
        const sysCalc = shannonCalc.get(sysKey) || { total_ni: 0, sum_ni_ln_ni: 0 };
        const oppCalc = shannonCalc.get(oppKey) || { total_ni: 0, sum_ni_ln_ni: 0 };

        let sys_encounter_rate = 0, sys_shannon_index = 0;
        if (eff.sys_eff > 0 && sysCalc.total_ni > 0) {
            sys_encounter_rate = parseFloat((sysCalc.total_ni / eff.sys_eff).toFixed(4));
            sys_shannon_index = parseFloat((Math.log(sysCalc.total_ni) - (sysCalc.sum_ni_ln_ni / sysCalc.total_ni)).toFixed(4));
        }

        let opp_encounter_rate = 0, opp_shannon_index = 0;
        if (eff.opp_eff > 0 && oppCalc.total_ni > 0) {
            opp_encounter_rate = parseFloat((oppCalc.total_ni / eff.opp_eff).toFixed(4));
            opp_shannon_index = parseFloat((Math.log(oppCalc.total_ni) - (oppCalc.sum_ni_ln_ni / oppCalc.total_ni)).toFixed(4));
        }

        recentActiveH3s.add(h3_index);

        finalGridRows.push({
            h3_index: h3_index,
            citizen_effort: eff.cit_eff,
            official_effort: eff.off_eff,
            sys_encounter_rate: sys_encounter_rate,
            sys_shannon_index: sys_shannon_index,
            opp_encounter_rate: opp_encounter_rate,
            opp_shannon_index: opp_shannon_index
        });
    }
    onProgress(85);

    // =========================================================================
    // 6. 精準比對歷史空缺
    // =========================================================================
    const lostGaps = [];
    let gapCount = 0;
    
    for (const [h3_idx, speciesList] of Object.entries(historicalGapsCache)) {
        if (recentActiveH3s.has(h3_idx)) continue;

        const matchingSpecies = speciesList.filter(sp => {
            return targetScientificNames.has(String(sp).trim().toLowerCase());
        });

        if (matchingSpecies.length > 0) {
            lostGaps.push({
                h3_idx: h3_idx,
                species: matchingSpecies 
            });
        }
        
        if (++gapCount % 2000 === 0) await yieldToMain();
    }
    onProgress(100);

    return {
        gridRows: finalGridRows,
        historicalGaps: lostGaps
    };
}