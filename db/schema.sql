-- ============================================
-- Gravity-DBMS: Normalized Database Schema v2
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing schema if running again
DROP TABLE IF EXISTS custom_entities CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP FUNCTION IF EXISTS match_entities CASCADE;
DROP FUNCTION IF EXISTS get_all_entities CASCADE;
DROP FUNCTION IF EXISTS keyword_search_entities CASCADE;

-- ============================================
-- 2. Create Normalized Tables
-- ============================================

CREATE TABLE teachers (
    teacher_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE courses (
    course_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'B.Tech',
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subjects (
    subject_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    course_id TEXT REFERENCES courses(course_id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(teacher_id) ON DELETE SET NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students (
    roll_no TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    course_id TEXT REFERENCES courses(course_id) ON DELETE SET NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generic table for user-defined entity types (lightweight dynamic tables)
CREATE TABLE custom_entities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    name TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Create HNSW indexes for fast vector search
-- ============================================
CREATE INDEX IF NOT EXISTS teachers_embedding_idx ON teachers USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS courses_embedding_idx ON courses USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS subjects_embedding_idx ON subjects USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS students_embedding_idx ON students USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS custom_embedding_idx ON custom_entities USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- 4. Unified Vector Search RPC
-- ============================================
CREATE OR REPLACE FUNCTION match_entities(
    query_embedding vector(384),
    match_count INT DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    entity_type TEXT,
    id TEXT,
    title TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        -- Courses
        SELECT 'Course'::TEXT AS entity_type,
               c.course_id::TEXT AS id,
               (c.department || ' ' || c.name)::TEXT AS title,
               ('Course in ' || c.department || ' program')::TEXT AS content,
               jsonb_build_object('department', c.department) AS metadata,
               (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
        FROM courses c
        WHERE c.embedding IS NOT NULL

        UNION ALL

        -- Teachers (department derived from their first subject's course)
        SELECT 'Teacher'::TEXT,
               t.teacher_id::TEXT,
               t.name,
               'Teacher'::TEXT,
               jsonb_build_object('department', COALESCE(
                   (SELECT co.department FROM subjects su
                    JOIN courses co ON su.course_id = co.course_id
                    WHERE su.teacher_id = t.teacher_id LIMIT 1),
                   'General'
               )),
               (1 - (t.embedding <=> query_embedding))::FLOAT
        FROM teachers t
        WHERE t.embedding IS NOT NULL

        UNION ALL

        -- Subjects (department from their course)
        SELECT 'Subject'::TEXT,
               su.subject_id::TEXT,
               su.name,
               ('Subject in ' || COALESCE(co.department || ' ' || co.name, 'Unknown'))::TEXT,
               jsonb_build_object(
                   'course_id', su.course_id,
                   'teacher_id', su.teacher_id,
                   'department', COALESCE(co.department, 'General')
               ),
               (1 - (su.embedding <=> query_embedding))::FLOAT
        FROM subjects su
        LEFT JOIN courses co ON su.course_id = co.course_id
        WHERE su.embedding IS NOT NULL

        UNION ALL

        -- Students (department from their course)
        SELECT 'Student'::TEXT,
               s.roll_no::TEXT,
               s.name,
               ('Student in ' || COALESCE(co.department || ' ' || co.name, 'Unknown'))::TEXT,
               jsonb_build_object(
                   'course_id', s.course_id,
                   'department', COALESCE(co.department, 'General')
               ),
               (1 - (s.embedding <=> query_embedding))::FLOAT
        FROM students s
        LEFT JOIN courses co ON s.course_id = co.course_id
        WHERE s.embedding IS NOT NULL

        UNION ALL

        -- Custom entities
        SELECT ce.entity_type::TEXT,
               ce.id::TEXT,
               ce.name,
               ce.entity_type::TEXT,
               ce.data,
               (1 - (ce.embedding <=> query_embedding))::FLOAT
        FROM custom_entities ce
        WHERE ce.embedding IS NOT NULL
    ) all_entities
    WHERE all_entities.similarity > match_threshold
    ORDER BY all_entities.similarity DESC
    LIMIT match_count;
END;
$$;

-- ============================================
-- 5. Keyword Search RPC (ILIKE matching)
-- ============================================
CREATE OR REPLACE FUNCTION keyword_search_entities(
    query_text TEXT,
    max_results INT DEFAULT 20
)
RETURNS TABLE (
    entity_type TEXT,
    id TEXT,
    title TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    pattern TEXT := '%' || query_text || '%';
BEGIN
    RETURN QUERY
    SELECT * FROM (
        -- Courses
        SELECT 'Course'::TEXT,
               c.course_id::TEXT,
               (c.department || ' ' || c.name)::TEXT,
               ('Course in ' || c.department || ' program')::TEXT,
               jsonb_build_object('department', c.department),
               1.0::FLOAT
        FROM courses c
        WHERE c.name ILIKE pattern OR c.department ILIKE pattern

        UNION ALL

        -- Teachers
        SELECT 'Teacher'::TEXT,
               t.teacher_id::TEXT,
               t.name,
               'Teacher'::TEXT,
               jsonb_build_object('department', COALESCE(
                   (SELECT co.department FROM subjects su
                    JOIN courses co ON su.course_id = co.course_id
                    WHERE su.teacher_id = t.teacher_id LIMIT 1),
                   'General'
               )),
               1.0::FLOAT
        FROM teachers t
        WHERE t.name ILIKE pattern

        UNION ALL

        -- Subjects
        SELECT 'Subject'::TEXT,
               su.subject_id::TEXT,
               su.name,
               ('Subject in ' || COALESCE(co.department || ' ' || co.name, 'Unknown'))::TEXT,
               jsonb_build_object(
                   'course_id', su.course_id,
                   'teacher_id', su.teacher_id,
                   'department', COALESCE(co.department, 'General')
               ),
               1.0::FLOAT
        FROM subjects su
        LEFT JOIN courses co ON su.course_id = co.course_id
        WHERE su.name ILIKE pattern

        UNION ALL

        -- Students
        SELECT 'Student'::TEXT,
               s.roll_no::TEXT,
               s.name,
               ('Student in ' || COALESCE(co.department || ' ' || co.name, 'Unknown'))::TEXT,
               jsonb_build_object(
                   'course_id', s.course_id,
                   'department', COALESCE(co.department, 'General')
               ),
               1.0::FLOAT
        FROM students s
        LEFT JOIN courses co ON s.course_id = co.course_id
        WHERE s.name ILIKE pattern

        UNION ALL

        -- Custom entities
        SELECT ce.entity_type::TEXT,
               ce.id::TEXT,
               ce.name,
               ce.entity_type::TEXT,
               ce.data,
               1.0::FLOAT
        FROM custom_entities ce
        WHERE ce.name ILIKE pattern OR ce.entity_type ILIKE pattern
    ) keyword_results
    LIMIT max_results;
END;
$$;

-- ============================================
-- 6. Get All Entities (for Universe UI)
-- ============================================
CREATE OR REPLACE FUNCTION get_all_entities()
RETURNS TABLE (
    entity_type TEXT,
    id TEXT,
    title TEXT,
    content TEXT,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        -- Courses
        SELECT 'Course'::TEXT,
               c.course_id::TEXT,
               (c.department || ' ' || c.name)::TEXT,
               ('Course in ' || c.department || ' program')::TEXT,
               jsonb_build_object('department', c.department)
        FROM courses c

        UNION ALL

        -- Teachers
        SELECT 'Teacher'::TEXT,
               t.teacher_id::TEXT,
               t.name,
               'Teacher'::TEXT,
               jsonb_build_object('department', COALESCE(
                   (SELECT co.department FROM subjects su
                    JOIN courses co ON su.course_id = co.course_id
                    WHERE su.teacher_id = t.teacher_id LIMIT 1),
                   'General'
               ))
        FROM teachers t

        UNION ALL

        -- Subjects
        SELECT 'Subject'::TEXT,
               su.subject_id::TEXT,
               su.name,
               ('Subject in ' || COALESCE(co.department || ' ' || co.name, 'Unknown'))::TEXT,
               jsonb_build_object(
                   'course_id', su.course_id,
                   'teacher_id', su.teacher_id,
                   'department', COALESCE(co.department, 'General')
               )
        FROM subjects su
        LEFT JOIN courses co ON su.course_id = co.course_id

        UNION ALL

        -- Students
        SELECT 'Student'::TEXT,
               s.roll_no::TEXT,
               s.name,
               ('Student in ' || COALESCE(co.department || ' ' || co.name, 'Unknown'))::TEXT,
               jsonb_build_object(
                   'course_id', s.course_id,
                   'department', COALESCE(co.department, 'General')
               )
        FROM students s
        LEFT JOIN courses co ON s.course_id = co.course_id

        UNION ALL

        -- Custom entities
        SELECT ce.entity_type::TEXT,
               ce.id::TEXT,
               ce.name,
               ce.entity_type::TEXT,
               COALESCE(ce.data, '{}'::JSONB)
        FROM custom_entities ce
    ) all_data;
END;
$$;

-- ============================================
-- 7. Row Level Security
-- ============================================
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public read courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow public read subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Allow public read students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public read custom_entities" ON custom_entities FOR SELECT USING (true);

CREATE POLICY "Allow public modify teachers" ON teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public modify courses" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public modify subjects" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public modify students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public modify custom_entities" ON custom_entities FOR ALL USING (true) WITH CHECK (true);
