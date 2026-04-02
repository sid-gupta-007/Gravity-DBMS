import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";
import { pipeline, env } from "@huggingface/transformers";
import dotenv from "dotenv";

dotenv.config();

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
// CURATED ACADEMIC DATA
// ==========================================

const DEPARTMENTS = [
	"B.Tech", "M.Tech", "B.Sc", "M.Sc", "MBA", "BBA", "BA", "B.Des",
];

// Specializations (what this app calls "courses" — the field of study)
const SPECIALIZATIONS = [
	"Computer Science", "Information Technology", "Electronics & Communication",
	"Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
	"Chemical Engineering", "Biotechnology", "Data Science",
	"Artificial Intelligence", "Physics", "Chemistry", "Mathematics",
	"Economics", "Finance", "Marketing", "Human Resources",
	"Operations Management", "Graphic Design", "Industrial Design",
];

// Real academic subjects
const ACADEMIC_SUBJECTS = [
	"Data Structures & Algorithms", "Operating Systems", "Database Management Systems",
	"Computer Networks", "Object Oriented Programming", "Software Engineering",
	"Web Development", "Machine Learning", "Deep Learning",
	"Natural Language Processing", "Computer Vision", "Discrete Mathematics",
	"Linear Algebra", "Calculus", "Probability & Statistics",
	"Digital Electronics", "Signals & Systems", "Control Systems",
	"Microprocessors", "VLSI Design", "Thermodynamics",
	"Fluid Mechanics", "Heat Transfer", "Manufacturing Processes",
	"Strength of Materials", "Structural Analysis", "Surveying",
	"Geotechnical Engineering", "Environmental Engineering",
	"Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry",
	"Biochemistry", "Genetics", "Cell Biology", "Molecular Biology",
	"Microeconomics", "Macroeconomics", "Financial Accounting",
	"Corporate Finance", "Investment Analysis", "Portfolio Management",
	"Marketing Management", "Consumer Behavior", "Brand Management",
	"Organizational Behavior", "Strategic Management", "Supply Chain Management",
	"Business Analytics", "Entrepreneurship", "International Business",
	"Typography & Layout", "Color Theory", "UX Design",
	"UI Design", "Motion Graphics", "Product Design",
	"Design Thinking", "Visual Communication", "3D Modeling",
	"Human Computer Interaction", "Cloud Computing", "Cybersecurity",
	"Compiler Design", "Artificial Intelligence", "Robotics",
	"Embedded Systems", "Power Systems", "Renewable Energy",
	"Engineering Drawing", "Engineering Mechanics",
];

// Teacher specializations for richer embeddings
const TEACHER_SPECIALIZATIONS = [
	"Artificial Intelligence & Machine Learning",
	"Data Structures & Algorithms",
	"Database Systems & Big Data",
	"Computer Networks & Security",
	"Software Engineering & DevOps", 
	"Digital Signal Processing",
	"VLSI & Embedded Systems",
	"Thermodynamics & Heat Transfer",
	"Structural Engineering",
	"Organic Chemistry & Drug Design",
	"Quantum Physics",
	"Pure Mathematics & Number Theory",
	"Financial Economics",
	"Marketing Analytics",
	"Operations Research",
	"Human-Computer Interaction",
	"Visual Communication Design",
	"Environmental Engineering",
	"Renewable Energy Systems",
	"Biotechnology & Genomics",
];

// ==========================================
// CONFIGURATION
// ==========================================
const NUM_TEACHERS = 50;
const NUM_COURSES = 30;
const NUM_SUBJECTS = 120;
const NUM_STUDENTS = 1800;
const BATCH_SIZE = 50;

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
		const prefix = faker.helpers.arrayElement(["Dr.", "Prof.", "Prof."]);
		const name = `${prefix} ${faker.person.firstName()} ${faker.person.lastName()}`;
		const spec = TEACHER_SPECIALIZATIONS[i % TEACHER_SPECIALIZATIONS.length];
		const years = faker.number.int({ min: 5, max: 30 });
		const text = `Professor ${name}, specializing in ${spec}. ${years} years of teaching and research experience in higher education.`;
		const embedding = await generateEmbedding(text, embedder);
		teachers.push({ teacher_id: id, name, embedding });
	}

	// 2. Generate Courses (Department + Specialization)
	console.log(`🎓 Generating ${NUM_COURSES} Courses...`);
	const courses = [];
	const usedCombos = new Set();

	for (let i = 0; i < NUM_COURSES; i++) {
		const id = `CRS-${i + 1}`;
		let department, specialization, combo;
		
		// Avoid duplicate department+specialization combos
		do {
			department = faker.helpers.arrayElement(DEPARTMENTS);
			specialization = faker.helpers.arrayElement(SPECIALIZATIONS);
			combo = `${department}-${specialization}`;
		} while (usedCombos.has(combo));
		usedCombos.add(combo);

		const text = `${department} ${specialization}. A ${department} degree program in ${specialization}, covering core concepts, practical applications, and advanced topics in the field.`;
		const embedding = await generateEmbedding(text, embedder);
		courses.push({ course_id: id, name: specialization, department, embedding });
	}

	// 3. Generate Subjects
	console.log(`📚 Generating ${NUM_SUBJECTS} Subjects...`);
	const subjects = [];
	const usedSubjectNames = new Set();

	for (let i = 0; i < NUM_SUBJECTS; i++) {
		const id = `SUB-${i + 1}`;
		let name;
		
		// Pick a unique subject name
		do {
			name = faker.helpers.arrayElement(ACADEMIC_SUBJECTS);
		} while (usedSubjectNames.has(name) && usedSubjectNames.size < ACADEMIC_SUBJECTS.length);
		usedSubjectNames.add(name);
		
		// If we run out of unique names, add a suffix
		if (subjects.some(s => s.name === name)) {
			name = `${name} (Advanced)`;
		}

		const course = faker.helpers.arrayElement(courses);
		const teacher = faker.helpers.arrayElement(teachers);
		const text = `Subject: ${name}. Taught in the ${course.department} ${course.name} program by ${teacher.name}. Covers theory and practical aspects of ${name}.`;
		const embedding = await generateEmbedding(text, embedder);
		subjects.push({ subject_id: id, name, course_id: course.course_id, teacher_id: teacher.teacher_id, embedding });
	}

	// 4. Generate Students
	console.log(`🧑‍🎓 Generating ${NUM_STUDENTS} Students (this will take a few minutes)...`);
	const students = [];
	for (let i = 0; i < NUM_STUDENTS; i++) {
		const id = `STD-2024-${String(i + 1).padStart(4, "0")}`;
		const name = faker.person.fullName();
		const course = faker.helpers.arrayElement(courses);
		const year = faker.helpers.arrayElement(["1st Year", "2nd Year", "3rd Year", "4th Year"]);
		const text = `Student ${name}, ${year} student enrolled in ${course.department} ${course.name}. Studying at the university.`;
		const embedding = await generateEmbedding(text, embedder);
		students.push({ roll_no: id, name, course_id: course.course_id, embedding });

		if ((i + 1) % 100 === 0) process.stdout.write(`\r   ... Embedded ${i + 1}/${NUM_STUDENTS} students`);
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
	console.log(`\nCourses sample:`);
	courses.slice(0, 5).forEach(c => console.log(`   ${c.course_id}: ${c.department} ${c.name}`));
	console.log(`\nSubjects sample:`);
	subjects.slice(0, 5).forEach(s => console.log(`   ${s.subject_id}: ${s.name}`));
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
