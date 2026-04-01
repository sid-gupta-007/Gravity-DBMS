-- ============================================
-- Gravity-DBMS: Normalized Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing schema if running again
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP FUNCTION IF EXISTS match_documents CASCADE;
DROP FUNCTION IF EXISTS match_entities CASCADE;

-- 2. Create Normalized Tables

CREATE TABLE teachers (
    teacher_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE courses (
    course_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
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

-- 3. Create HNSW indexes for fast search
CREATE INDEX IF NOT EXISTS teachers_embedding_idx ON teachers USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS courses_embedding_idx ON courses USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS subjects_embedding_idx ON subjects USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS students_embedding_idx ON students USING hnsw (embedding vector_cosine_ops);

-- 4. Unified RPC Search Function
-- Searches across all 4 tables simultaneously and ranks them by similarity
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
        SELECT 'Course'::TEXT as entity_type, course_id::TEXT as id, name as title, 'Course'::TEXT as content, '{}'::JSONB as metadata, (1 - (embedding <=> query_embedding))::FLOAT as similarity FROM courses WHERE embedding IS NOT NULL
        UNION ALL
        SELECT 'Teacher'::TEXT, teacher_id::TEXT, name, 'Teacher'::TEXT, '{}'::JSONB, (1 - (embedding <=> query_embedding))::FLOAT FROM teachers WHERE embedding IS NOT NULL
        UNION ALL
        SELECT 'Subject'::TEXT, subject_id::TEXT, name, 'Subject in course ' || course_id, jsonb_build_object('course_id', course_id, 'teacher_id', teacher_id), (1 - (embedding <=> query_embedding))::FLOAT FROM subjects WHERE embedding IS NOT NULL
        UNION ALL
        SELECT 'Student'::TEXT, roll_no::TEXT, name, 'Student in course ' || course_id, jsonb_build_object('course_id', course_id), (1 - (embedding <=> query_embedding))::FLOAT FROM students WHERE embedding IS NOT NULL
    ) all_entities
    WHERE all_entities.similarity > match_threshold
    ORDER BY all_entities.similarity DESC
    LIMIT match_count;
END;
$$;

-- 5. RPC to fetch all entities (for Universe UI)
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
        SELECT 'Course'::TEXT, course_id::TEXT, name, 'Course'::TEXT, '{}'::JSONB FROM courses
        UNION ALL
        SELECT 'Teacher'::TEXT, teacher_id::TEXT, name, 'Teacher'::TEXT, '{}'::JSONB FROM teachers
        UNION ALL
        SELECT 'Subject'::TEXT, subject_id::TEXT, name, 'Subject in course ' || course_id, jsonb_build_object('course_id', course_id, 'teacher_id', teacher_id) FROM subjects
        UNION ALL
        SELECT 'Student'::TEXT, roll_no::TEXT, name, 'Student in course ' || course_id, jsonb_build_object('course_id', course_id) FROM students
    ) all_data;
END;
$$;

-- 5. Enable Row Level Security (RLS) and Policies
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public read courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow public read subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Allow public read students" ON students FOR SELECT USING (true);

CREATE POLICY "Allow public modify teachers" ON teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public modify courses" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public modify subjects" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public modify students" ON students FOR ALL USING (true) WITH CHECK (true);
