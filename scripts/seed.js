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
// ACADEMICALLY ACCURATE DEPARTMENT MAPPING
// ==========================================
const DEPT_CONFIG = {
	"B.Tech": {
		specializations: [
			"Computer Science", "Information Technology", "Electronics & Communication",
			"Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
			"Chemical Engineering", "Data Science", "Artificial Intelligence",
		],
		subjects: [
			"Data Structures & Algorithms", "Operating Systems", "Database Management Systems",
			"Computer Networks", "Object Oriented Programming", "Software Engineering",
			"Web Development", "Machine Learning", "Deep Learning", "Natural Language Processing",
			"Computer Vision", "Discrete Mathematics", "Digital Electronics", "Signals & Systems",
			"Control Systems", "Microprocessors", "VLSI Design", "Thermodynamics",
			"Fluid Mechanics", "Strength of Materials", "Engineering Drawing",
			"Engineering Mechanics", "Cloud Computing", "Cybersecurity", "Compiler Design",
			"Embedded Systems", "Robotics", "Manufacturing Processes", "Power Systems",
			"Renewable Energy", "Heat Transfer",
		],
		teacherSpecs: [
			"Artificial Intelligence & Machine Learning", "Data Structures & Algorithms",
			"Database Systems & Big Data", "Computer Networks & Security",
			"Software Engineering & DevOps", "Digital Signal Processing",
			"VLSI & Embedded Systems", "Thermodynamics & Heat Transfer",
			"Structural Engineering", "Renewable Energy Systems",
		],
	},
	"M.Tech": {
		specializations: [
			"Computer Science", "Data Science", "Artificial Intelligence",
			"Electronics & Communication", "Mechanical Engineering", "Structural Engineering",
		],
		subjects: [
			"Advanced Algorithms", "Distributed Systems", "Advanced Machine Learning",
			"Computer Architecture", "Advanced Database Systems", "Research Methodology",
			"Advanced Signal Processing", "Finite Element Analysis", "Advanced Robotics",
			"High Performance Computing", "Information Retrieval", "Pattern Recognition",
		],
		teacherSpecs: [
			"Advanced Computing & Distributed Systems", "Machine Learning Research",
			"Robotics & Automation", "Signal Processing & Communications",
		],
	},
	"B.Sc": {
		specializations: [
			"Physics", "Chemistry", "Mathematics", "Biology",
			"Biotechnology", "Statistics", "Environmental Science",
		],
		subjects: [
			"Calculus", "Linear Algebra", "Real Analysis", "Probability & Statistics",
			"Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry",
			"Classical Mechanics", "Electrodynamics", "Quantum Mechanics", "Optics",
			"Cell Biology", "Genetics", "Ecology", "Molecular Biology", "Biochemistry",
			"Number Theory", "Differential Equations", "Complex Analysis",
			"Microbiology", "Zoology", "Botany", "Analytical Chemistry",
		],
		teacherSpecs: [
			"Quantum Physics", "Organic Chemistry & Drug Design",
			"Pure Mathematics & Number Theory", "Genetics & Molecular Biology",
			"Environmental Science & Ecology",
		],
	},
	"M.Sc": {
		specializations: [
			"Physics", "Chemistry", "Mathematics", "Biotechnology",
		],
		subjects: [
			"Advanced Quantum Mechanics", "Spectroscopy", "Topology",
			"Functional Analysis", "Advanced Organic Chemistry", "Genomics",
			"Advanced Statistical Methods", "Nuclear Physics",
			"Condensed Matter Physics", "Advanced Calculus",
		],
		teacherSpecs: [
			"Theoretical Physics", "Advanced Organic Synthesis",
			"Applied Mathematics", "Genomics & Bioinformatics",
		],
	},
	"MBA": {
		specializations: [
			"Finance", "Marketing", "Human Resources",
			"Operations Management", "Business Analytics", "International Business",
		],
		subjects: [
			"Financial Accounting", "Corporate Finance", "Investment Analysis",
			"Portfolio Management", "Marketing Management", "Consumer Behavior",
			"Brand Management", "Organizational Behavior", "Strategic Management",
			"Supply Chain Management", "Business Analytics", "Entrepreneurship",
			"International Business", "Business Law", "Managerial Economics",
			"Sales Management", "Digital Marketing", "Mergers & Acquisitions",
		],
		teacherSpecs: [
			"Financial Economics", "Marketing Analytics",
			"Operations Research", "Organizational Psychology",
			"International Trade & Business Strategy",
		],
	},
	"BBA": {
		specializations: [
			"Finance", "Marketing", "Human Resources", "General Management",
		],
		subjects: [
			"Principles of Management", "Business Communication", "Microeconomics",
			"Macroeconomics", "Financial Management", "Marketing Fundamentals",
			"Human Resource Management", "Business Ethics", "Accounting Basics",
			"Business Mathematics", "Introduction to Business Law",
		],
		teacherSpecs: [
			"Management & Leadership", "Business Communication",
			"Finance Fundamentals", "HRM & Organizational Behavior",
		],
	},
	"BA": {
		specializations: [
			"English Literature", "History", "Political Science",
			"Psychology", "Sociology", "Economics", "Philosophy", "Journalism",
		],
		subjects: [
			"Introduction to Philosophy", "Modern World History", "Indian History",
			"Political Theory", "Indian Constitution", "Social Psychology",
			"Developmental Psychology", "English Literature", "Creative Writing",
			"Mass Communication", "Sociology of India", "Gender Studies",
			"Environmental Ethics", "Public Administration", "International Relations",
			"Cultural Studies", "Linguistics", "Media Studies", "Ethics & Values",
		],
		teacherSpecs: [
			"English Literature & Linguistics", "Modern History & Historiography",
			"Political Theory & Governance", "Clinical & Social Psychology",
			"Sociology & Cultural Studies",
		],
	},
	"B.Des": {
		specializations: [
			"Graphic Design", "Industrial Design", "Fashion Design",
			"Interior Design", "Communication Design",
		],
		subjects: [
			"Typography & Layout", "Color Theory", "UX Design", "UI Design",
			"Motion Graphics", "Product Design", "Design Thinking",
			"Visual Communication", "3D Modeling", "Human Computer Interaction",
			"Photography", "Material Science for Design", "Illustration",
			"Brand Identity Design", "Packaging Design",
		],
		teacherSpecs: [
			"Human-Computer Interaction", "Visual Communication Design",
			"Product & Industrial Design", "Fashion & Textile Design",
		],
	},
};

// ==========================================
// CONFIGURATION
// ==========================================
const NUM_TEACHERS = 50;
const NUM_COURSES = 30;
const NUM_SUBJECTS = 120;
const NUM_STUDENTS = 1800;
const BATCH_SIZE = 50;

const DEPT_KEYS = Object.keys(DEPT_CONFIG);

async function generateEmbedding(text, embedder) {
	const output = await embedder(text, { pooling: "mean", normalize: true });
	return Array.from(output.data);
}

async function run() {
	console.log(`🚀 Starting Seed Script for 2000 records...`);

	console.log(`📦 Loading AI Model (all-MiniLM-L6-v2)...`);
	const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
	console.log(`✅ AI Model loaded!`);

	// ==========================================
	// 1. TEACHERS — assigned to departments
	// ==========================================
	console.log(`\n👨‍🏫 Generating ${NUM_TEACHERS} Teachers...`);
	const teachers = [];
	const teachersByDept = {};

	for (let i = 0; i < NUM_TEACHERS; i++) {
		const dept = DEPT_KEYS[i % DEPT_KEYS.length];
		const config = DEPT_CONFIG[dept];
		const id = `TCH-${i + 1}`;
		const prefix = faker.helpers.arrayElement(["Dr.", "Prof.", "Prof."]);
		const name = `${prefix} ${faker.person.firstName()} ${faker.person.lastName()}`;
		const spec = config.teacherSpecs[i % config.teacherSpecs.length];
		const years = faker.number.int({ min: 5, max: 30 });
		const text = `Professor ${name}, specializing in ${spec}. ${years} years of teaching and research experience in ${dept} programs.`;
		const embedding = await generateEmbedding(text, embedder);

		const teacher = { teacher_id: id, name, embedding, _dept: dept };
		teachers.push(teacher);

		if (!teachersByDept[dept]) teachersByDept[dept] = [];
		teachersByDept[dept].push(teacher);
	}

	// ==========================================
	// 2. COURSES — department + specialization (properly mapped)
	// ==========================================
	console.log(`🎓 Generating ${NUM_COURSES} Courses...`);
	const courses = [];
	const coursesByDept = {};
	const usedCombos = new Set();

	// Distribute courses across departments proportionally
	const deptCourseCount = {};
	for (let i = 0; i < NUM_COURSES; i++) {
		const dept = DEPT_KEYS[i % DEPT_KEYS.length];
		deptCourseCount[dept] = (deptCourseCount[dept] || 0) + 1;
	}

	let courseIndex = 0;
	for (const dept of DEPT_KEYS) {
		const config = DEPT_CONFIG[dept];
		const count = deptCourseCount[dept] || 0;

		for (let j = 0; j < count; j++) {
			const id = `CRS-${courseIndex + 1}`;
			// Pick a specialization that hasn't been used for this department
			const specIdx = j % config.specializations.length;
			const specialization = config.specializations[specIdx];

			const combo = `${dept}-${specialization}`;
			if (usedCombos.has(combo)) continue; // skip duplicates
			usedCombos.add(combo);

			const text = `${dept} ${specialization}. A ${dept} degree program in ${specialization}, covering core concepts, practical applications, and advanced topics.`;
			const embedding = await generateEmbedding(text, embedder);

			const course = { course_id: id, name: specialization, department: dept, embedding };
			courses.push(course);

			if (!coursesByDept[dept]) coursesByDept[dept] = [];
			coursesByDept[dept].push(course);
			courseIndex++;
		}
	}
	console.log(`   Created ${courses.length} courses across ${Object.keys(coursesByDept).length} departments.`);

	// ==========================================
	// 3. SUBJECTS — assigned to courses within the SAME department
	// ==========================================
	console.log(`📚 Generating ${NUM_SUBJECTS} Subjects...`);
	const subjects = [];
	const usedSubjectPerDept = {};

	for (let i = 0; i < NUM_SUBJECTS; i++) {
		const id = `SUB-${i + 1}`;

		// Pick a course (round-robin to spread evenly)
		const course = courses[i % courses.length];
		const dept = course.department;
		const config = DEPT_CONFIG[dept];

		if (!usedSubjectPerDept[dept]) usedSubjectPerDept[dept] = new Set();

		// Pick a subject name from the department's pool
		let subjectName = null;
		for (const candidate of faker.helpers.shuffle([...config.subjects])) {
			if (!usedSubjectPerDept[dept].has(candidate)) {
				subjectName = candidate;
				break;
			}
		}

		// If all subjects in this department are used, create an advanced variant
		if (!subjectName) {
			const base = faker.helpers.arrayElement(config.subjects);
			subjectName = `Advanced ${base}`;
			if (usedSubjectPerDept[dept].has(subjectName)) {
				subjectName = `${base} Lab`;
			}
		}
		usedSubjectPerDept[dept].add(subjectName);

		// Pick a teacher from the same department
		const deptTeachers = teachersByDept[dept] || teachers.slice(0, 5);
		const teacher = faker.helpers.arrayElement(deptTeachers);

		const text = `Subject: ${subjectName}. Taught in the ${dept} ${course.name} program by ${teacher.name}. Covers theory and practical aspects of ${subjectName}.`;
		const embedding = await generateEmbedding(text, embedder);

		subjects.push({
			subject_id: id,
			name: subjectName,
			course_id: course.course_id,
			teacher_id: teacher.teacher_id,
			embedding,
		});
	}

	// ==========================================
	// 4. STUDENTS — assigned to courses
	// ==========================================
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
	console.log(`\n✅ Generated all ${courses.length + teachers.length + subjects.length + students.length} embeddings!`);

	// ==========================================
	// DATABASE INSERTION
	// ==========================================
	console.log(`\n💾 Inserting Teachers...`);
	// Remove temporary _dept field before insertion
	const teachersClean = teachers.map(({ _dept, ...rest }) => rest);
	await insertInBatches(teachersClean, "teachers");

	console.log(`💾 Inserting Courses...`);
	await insertInBatches(courses, "courses");

	console.log(`💾 Inserting Subjects...`);
	await insertInBatches(subjects, "subjects");

	console.log(`💾 Inserting Students...`);
	await insertInBatches(students, "students");

	console.log(`\n🎉 All records successfully seeded to Supabase!`);
	console.log(`\n📊 Distribution:`);
	for (const dept of DEPT_KEYS) {
		const cCount = coursesByDept[dept]?.length || 0;
		const sCount = subjects.filter(s => coursesByDept[dept]?.some(c => c.course_id === s.course_id)).length;
		const tCount = teachersByDept[dept]?.length || 0;
		const stCount = students.filter(st => coursesByDept[dept]?.some(c => c.course_id === st.course_id)).length;
		console.log(`   ${dept}: ${cCount} courses, ${sCount} subjects, ${tCount} teachers, ${stCount} students`);
	}
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
