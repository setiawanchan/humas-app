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
-- JIKA TABEL SUDAH ADA, JALANKAN ALTER TABLE DI BAWAH INI:
-- ==============================================================
ALTER TABLE public.fasih_reject_items ADD COLUMN IF NOT EXISTS nama_usaha TEXT;

-- Index untuk performa query dan pencarian
CREATE INDEX IF NOT EXISTS idx_fasih_reject_status ON public.fasih_reject_items(status);
CREATE INDEX IF NOT EXISTS idx_fasih_reject_assignment_id ON public.fasih_reject_items(assignment_id);
CREATE INDEX IF NOT EXISTS idx_fasih_reject_kecamatan ON public.fasih_reject_items(kecamatan);
CREATE INDEX IF NOT EXISTS idx_fasih_reject_desa ON public.fasih_reject_items(desa);
CREATE INDEX IF NOT EXISTS idx_fasih_reject_sls ON public.fasih_reject_items(sls);
CREATE INDEX IF NOT EXISTS idx_fasih_reject_created_at ON public.fasih_reject_items(created_at DESC);

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
