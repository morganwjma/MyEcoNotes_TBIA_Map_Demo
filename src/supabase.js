// src/supabase.js
import { createClient } from '@supabase/supabase-js'

// 你的專案專屬雲端網址
const supabaseUrl = 'https://psprlovfzsabgubugngb.supabase.co'

// ⚠️ 請替換成你在後台 API Keys 頁面複製的「Publishable / anon / public」鑰匙
const supabaseKey = 'sb_publishable_YWMUkNkPlcA1skYHWVmLUw_XMADzCwi' 

export const supabase = createClient(supabaseUrl, supabaseKey)