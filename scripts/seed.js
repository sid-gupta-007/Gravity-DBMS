import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";
import { pipeline, env } from "@huggingface/transformers";
import dotenv from "dotenv";

dotenv.config();

// Ensure we don't try to use browser-specific globals
env.allowLocalModels = false;
env.useBrowserCache = false;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error("Missing Supabase credentials in .env");
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// CONFIGURATION
// ==========================================
const NUM_TEACHERS = 50;
const NUM_COURSES = 30;
const NUM_SUBJECTS = 120;
const NUM_STUDENTS = 1800; // Total = 2000 nodes
const BATCH_SIZE = 50; // Insert in batches to prevent payload limits

async function generateEmbedding(text, embedder) {
	const output = await embedder(text, { pooling: "mean", normalize: true });
	return Array.from(output.data);
}

async function run() {
	console.log(`🚀 Starting Seed Script for 2000 records...`);

	console.log(`📦 Loading AI Model (all-MiniLM-L6-v2)...`);
	const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
	console.log(`✅ AI Model loaded!`);

	// 1. Generate Teachers
	console.log(`\n👨‍🏫 Generating ${NUM_TEACHERS} Teachers...`);
	const teachers = [];
	for (let i = 0; i < NUM_TEACHERS; i++) {
		const id = `TCH-${i + 1}`;
		const name = `Prof. ${faker.person.lastName()}`;
		const text = `Teacher ${name}. Expertise in academia and research.`;
		const embedding = await generateEmbedding(text, embedder);
		teachers.push({ teacher_id: id, name, embedding });
	}

	// 2. Generate Courses
	console.log(`🎓 Generating ${NUM_COURSES} Courses...`);
	const courses = [];
	for (let i = 0; i < NUM_COURSES; i++) {
		const id = `CRS-${i + 1}`;
		const name = faker.helpers.arrayElement(["B.Tech", "M.Tech", "B.Sc", "MBA", "B.Des"]) + " " + faker.commerce.department();
		const text = `Course ${name}. Degree program for higher education.`;
		const embedding = await generateEmbedding(text, embedder);
		courses.push({ course_id: id, name, embedding });
	}

	// 3. Generate Subjects
	console.log(`📚 Generating ${NUM_SUBJECTS} Subjects...`);
	const subjects = [];
	for (let i = 0; i < NUM_SUBJECTS; i++) {
		const id = `SUB-${i + 1}`;
		const name = faker.company.catchPhrase(); // Random subject-like names
		const course_id = faker.helpers.arrayElement(courses).course_id;
		const teacher_id = faker.helpers.arrayElement(teachers).teacher_id;
		const text = `Subject ${name}. Taught in course ${course_id} by teacher ${teacher_id}.`;
		const embedding = await generateEmbedding(text, embedder);
		subjects.push({ subject_id: id, name, course_id, teacher_id, embedding });
	}

	// 4. Generate Students
	console.log(`🧑‍🎓 Generating ${NUM_STUDENTS} Students (This will take a minute)...`);
	const students = [];
	for (let i = 0; i < NUM_STUDENTS; i++) {
		const id = `STD-2024-${String(i + 1).padStart(4, "0")}`;
		const name = faker.person.fullName();
		const course_id = faker.helpers.arrayElement(courses).course_id;
		const text = `Student ${name}. Enrolled in course ${course_id}.`;
		const embedding = await generateEmbedding(text, embedder);
		students.push({ roll_no: id, name, course_id, embedding });
		
		if ((i + 1) % 100 === 0) process.stdout.write(`\r... Embedded ${i + 1}/${NUM_STUDENTS} students`);
	}
	console.log(`\n✅ Generated all 2000 embeddings!`);

	// ==========================================
	// DATABASE INSERTION
	// ==========================================
	console.log(`\n💾 Inserting Teachers...`);
	await insertInBatches(teachers, "teachers");

	console.log(`💾 Inserting Courses...`);
	await insertInBatches(courses, "courses");

	console.log(`💾 Inserting Subjects...`);
	await insertInBatches(subjects, "subjects");

	console.log(`💾 Inserting Students...`);
	await insertInBatches(students, "students");

	console.log(`\n🎉 All 2000 records successfully seeded to Supabase!`);
	process.exit(0);
}

async function insertInBatches(data, table) {
	for (let i = 0; i < data.length; i += BATCH_SIZE) {
		const batch = data.slice(i, i + BATCH_SIZE);
		const { error } = await supabase.from(table).insert(batch);
		if (error) {
			console.error(`Error inserting into ${table} at batch ${i}:`, error.message);
		}
	}
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
