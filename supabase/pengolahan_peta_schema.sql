-- ==============================================================
-- SKEMA TABEL & POLICY: PENGOLAHAN PETA 2026 DI SUPABASE
-- Jalankan script SQL ini di SQL Editor dashboard Supabase Anda.
-- ==============================================================

-- 1. Buat Tabel jika belum ada
CREATE TABLE IF NOT EXISTS public.pengolahan_peta_2026 (
    idsubsls TEXT PRIMARY KEY,
    petugas_id TEXT,
    nama_petugas TEXT,
    status_scan TEXT DEFAULT '-',
    status_olah TEXT DEFAULT '-',
    tgl_selesai_olah TEXT,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Aktifkan RLS
ALTER TABLE public.pengolahan_peta_2026 ENABLE ROW LEVEL SECURITY;

-- 3. Hapus policy lama jika ada untuk menghindari konflik
DROP POLICY IF EXISTS "Allow public read access for pengolahan_peta_2026" ON public.pengolahan_peta_2026;
DROP POLICY IF EXISTS "Allow public insert access for pengolahan_peta_2026" ON public.pengolahan_peta_2026;
DROP POLICY IF EXISTS "Allow public update access for pengolahan_peta_2026" ON public.pengolahan_peta_2026;
DROP POLICY IF EXISTS "Allow public delete access for pengolahan_peta_2026" ON public.pengolahan_peta_2026;
DROP POLICY IF EXISTS "Allow all for anon and authenticated" ON public.pengolahan_peta_2026;

-- 4. Berikan izin SELECT, INSERT, UPDATE, DELETE ke anon & authenticated
CREATE POLICY "Allow public read access for pengolahan_peta_2026"
ON public.pengolahan_peta_2026
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert access for pengolahan_peta_2026"
ON public.pengolahan_peta_2026
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update access for pengolahan_peta_2026"
ON public.pengolahan_peta_2026
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access for pengolahan_peta_2026"
ON public.pengolahan_peta_2026
FOR DELETE
TO anon, authenticated
USING (true);
