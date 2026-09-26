-- ==============================================================
-- SKEMA TABEL FASIH REJECT ITEMS DI SUPABASE
-- Jalankan script ini di SQL Editor dashboard Supabase Anda.
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.fasih_reject_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kecamatan TEXT,
    desa TEXT,
    sls TEXT,
    idsls TEXT,
    nama_usaha TEXT,
    link TEXT NOT NULL,
    assignment_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'rejected', 'failed'
    rejected_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================
-- 1. UNTUK MENGHAPUS SELURUH BARIS DATA (RESET/KOSONGKAN TABEL):
-- Jalankan query ini di SQL Editor jika ingin membersihkan seluruh data:
-- ==============================================================
-- TRUNCATE TABLE public.fasih_reject_items;

-- ==============================================================
-- 2. JADIKAN assignment_id SEBAGAI UNIQUE KEY AGAR BISA MENIMPA (UPSERT):
-- ==============================================================
-- Pertama, hapus duplikat yang mungkin sudah ada sebelum menambahkan constraint:
DELETE FROM public.fasih_reject_items a
USING public.fasih_reject_items b
WHERE a.id > b.id 
  AND a.assignment_id = b.assignment_id 
  AND a.assignment_id IS NOT NULL;

-- Tambahkan UNIQUE constraint pada assignment_id
ALTER TABLE public.fasih_reject_items 
ADD CONSTRAINT fasih_reject_items_assignment_id_key UNIQUE (assignment_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.fasih_reject_items ENABLE ROW LEVEL SECURITY;

-- Policy agar aplikasi dan script console (anon role) dapat membaca data
CREATE POLICY "Allow public read access for fasih_reject_items" 
ON public.fasih_reject_items 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Policy agar aplikasi dan script console (anon role) dapat menambah data
CREATE POLICY "Allow public insert access for fasih_reject_items" 
ON public.fasih_reject_items 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Policy agar aplikasi dan script console (anon role) dapat memperbarui status reject
CREATE POLICY "Allow public update access for fasih_reject_items" 
ON public.fasih_reject_items 
FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- Policy agar aplikasi dapat menghapus item
CREATE POLICY "Allow public delete access for fasih_reject_items" 
ON public.fasih_reject_items 
FOR DELETE 
TO anon, authenticated 
USING (true);

-- ==============================================================
-- 3. FUNCTION RPC UNTUK MENDAPATKAN DAFTAR KECAMATAN, DESA, SLS (DISTINCT MURNI)
-- Mengembalikan seluruh nama desa dan SLS tanpa terpotong limit 1.000 baris!
-- ==============================================================
CREATE OR REPLACE FUNCTION public.get_fasih_filter_options(
    target_kecamatan TEXT DEFAULT NULL,
    target_desa TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    kec_list JSON;
    desa_list JSON;
    sls_list JSON;
BEGIN
    -- List Kecamatan unik
    SELECT json_agg(k) INTO kec_list
    FROM (
        SELECT DISTINCT kecamatan 
        FROM public.fasih_reject_items 
        WHERE kecamatan IS NOT NULL AND kecamatan != ''
        ORDER BY kecamatan ASC
    ) sub(k);

    -- List Desa unik (terfilter sesuai kecamatan jika ada)
    SELECT json_agg(d) INTO desa_list
    FROM (
        SELECT DISTINCT desa 
        FROM public.fasih_reject_items 
        WHERE desa IS NOT NULL AND desa != ''
          AND (target_kecamatan IS NULL OR target_kecamatan = 'all' OR kecamatan = target_kecamatan)
        ORDER BY desa ASC
    ) sub(d);

    -- List SLS unik (terfilter sesuai desa/kecamatan jika ada, diurutkan berdasarkan idsls)
    SELECT json_agg(s) INTO sls_list
    FROM (
        SELECT sls 
        FROM public.fasih_reject_items 
        WHERE sls IS NOT NULL AND sls != ''
          AND (target_kecamatan IS NULL OR target_kecamatan = 'all' OR kecamatan = target_kecamatan)
          AND (target_desa IS NULL OR target_desa = 'all' OR desa = target_desa)
        GROUP BY sls
        ORDER BY NULLIF(MIN(COALESCE(idsls, '')), '') ASC NULLS LAST, sls ASC
    ) sub(s);

    RETURN json_build_object(
        'kecamatan', COALESCE(kec_list, '[]'::json),
        'desa', COALESCE(desa_list, '[]'::json),
        'sls', COALESCE(sls_list, '[]'::json)
    );
END;
$$;
