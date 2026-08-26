import mongoose from "mongoose";

const GRADES = [3, 4, 5];

/**
 * Mongoose keeps the COMPILED model on its module singleton, so in development
 * editing a schema — adding a field, say — has no effect until the process
 * restarts: `mongoose.models.X` keeps returning the old compiled model, and any
 * path it doesn't know about is silently stripped on save. No error, no warning,
 * the value just never lands. Recompiling in dev makes schema edits take effect
 * on hot reload instead.
 *
 * Production keeps the plain cached lookup: models are compiled once at cold
 * start and the schema cannot change under a running deployment, so there is
 * nothing to recompile and deleting models mid-flight would only add risk.
 */
function compileModel(name: string, schema: mongoose.Schema) {
  if (process.env.NODE_ENV !== "production" && mongoose.models[name]) {
    mongoose.deleteModel(name);
  }
  return mongoose.models[name] || mongoose.model(name, schema);
}

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' }
}, { timestamps: true });
export const User = compileModel("User", UserSchema);

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // The government school the child attends day-to-day — this centre runs
  // after-school classes, so students come from several different schools.
  // Optional: rows created before this field existed have none.
  school: { type: String },
  guardianName: { type: String, required: true },
  guardianPhone: { type: String, required: true },
  grade: { type: Number, required: true, enum: GRADES },
  dateOfBirth: { type: Date, required: true },
  photoUrl: { type: String },
  qrCode: { type: String, required: true, unique: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  isActive: { type: Boolean, default: true },
  // "LPEC/{batch year}/{0001..}" — the human-readable student ID printed on
  // cards and used in reports. Deliberately NOT the same thing as qrCode: the
  // QR string is the physical scan identifier and must never change, while this
  // is the one staff and guardians actually read out.
  // sparse: true because students created before this field existed have none
  // until backfilled (see /api/students/backfill-registration-numbers).
  registrationNumber: { type: String, unique: true, sparse: true },
  // The mid-batch-registration cutoff: a student is only counted against
  // classes dated on/after this. Absent on legacy rows, which are then
  // grandfathered rather than retroactively marked absent for every class
  // that predates their record.
  registrationDate: { type: Date },
}, { timestamps: true });
export const Student = compileModel("Student", StudentSchema);

/**
 * Atomic per-year sequence generator for Student.registrationNumber
 * (_id e.g. "regno-2027"). A counter rather than countDocuments(): numbers must
 * never be reused after a student is deleted, and two admins registering
 * students at the same moment must never race onto the same number.
 */
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
export const Counter = compileModel("Counter", CounterSchema);

const BatchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // The year the cohort STARTS.
  year: { type: Number, required: true },
  // The year the batch is named for — the scholarship/exam year, e.g. 2028 for
  // a "2028 Scholarship Batch" that starts in 2026. This is what student IDs
  // are sequenced under, so the whole cohort shares one number series for its
  // entire run instead of the series changing under them as years pass.
  // Optional at the schema level: batches created before this field existed
  // fall back to `year` (see resolveBatchYear in lib/registration.ts).
  batchYear: { type: Number },
  grades: [{ type: Number, enum: GRADES }],
}, { timestamps: true });
export const Batch = compileModel("Batch", BatchSchema);

const ClassSessionSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  grade: { type: Number, required: true, enum: GRADES },
  date: { type: Date, required: true },
  time: { type: String },
  subject: { type: String },
  paymentAmount: { type: Number, required: true, default: 0 },
}, { timestamps: true });
export const ClassSession = compileModel("ClassSession", ClassSessionSchema);

const AttendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSession', required: true },
  present: { type: Boolean, default: false },
  paid: { type: Boolean, default: false },
  paidAmount: { type: Number, default: 0 },
  date: { type: Date, required: true },
}, { timestamps: true });
AttendanceSchema.index({ studentId: 1, classId: 1 }, { unique: true });
export const Attendance = compileModel("Attendance", AttendanceSchema);

const PaymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSession', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['paid', 'partial', 'unpaid', 'refunded'], default: 'paid' },
}, { timestamps: true });
export const Payment = compileModel("Payment", PaymentSchema);

/**
 * A scheduled exam — subject/grade/batch/date/max-marks, created up front as its
 * own record so staff can click into it any time afterward to add or correct
 * individual students' marks (POST /api/exams/[id]/marks), rather than marks
 * only ever existing as a side effect of a one-shot bulk upload.
 *
 * This sits ALONGSIDE the older flat Marks flow (/api/marks + the Excel
 * template on /admin/marks), which still works untouched.
 */
const ExamSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  grade: { type: Number, required: true, enum: GRADES },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  examDate: { type: Date, required: true },
  maxMarks: { type: Number, required: true },
  name: { type: String }, // optional friendly label, e.g. "Mid-term"
}, { timestamps: true });
export const Exam = compileModel("Exam", ExamSchema);

const MarksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true },
  examName: { type: String },
  examDate: { type: Date, required: true },
  // Not required when isAbsent is true — an absent student has no score to
  // record; stored as 0 in that case so every consumer that reads marks as a
  // number keeps working, with isAbsent as the actual signal to exclude them
  // from averages.
  marks: { type: Number, required: function (this: { isAbsent?: boolean }) { return !this.isAbsent; }, default: 0 },
  isAbsent: { type: Boolean, default: false },
  maxMarks: { type: Number, required: true },
  grade: { type: Number, required: true, enum: GRADES },
  // Neither of the two below is required: rows written by the older flat
  // /api/marks flow have no parent exam, and that flow upserts by
  // {studentId, subject, examDate}, so a hard-required field would break
  // re-saving those. Every mark written through /api/exams/[id]/marks sets
  // both and denormalizes subject/examDate/maxMarks/grade from the parent
  // Exam, so anything already querying those flat fields keeps working.
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
}, { timestamps: true });
// sparse: only documents that HAVE examId participate in this uniqueness check,
// so rows from the flat flow (no examId) never collide with it or each other.
MarksSchema.index({ examId: 1, studentId: 1 }, { unique: true, sparse: true });
export const Marks = compileModel("Marks", MarksSchema);
