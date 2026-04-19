import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' }
}, { timestamps: true });
export const User = mongoose.models.User || mongoose.model("User", UserSchema);

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  guardianName: { type: String, required: true },
  guardianPhone: { type: String, required: true },
  grade: { type: Number, required: true, enum: [3, 4, 5] },
  dateOfBirth: { type: Date, required: true },
  photoUrl: { type: String },
  qrCode: { type: String, required: true, unique: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
export const Student = mongoose.models.Student || mongoose.model("Student", StudentSchema);

const BatchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  year: { type: Number, required: true },
  grades: [{ type: Number, enum: [3, 4, 5] }]
}, { timestamps: true });
export const Batch = mongoose.models.Batch || mongoose.model("Batch", BatchSchema);

const ClassSessionSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  grade: { type: Number, required: true, enum: [3, 4, 5] },
  date: { type: Date, required: true },
  time: { type: String },
  subject: { type: String },
  paymentAmount: { type: Number, required: true, default: 0 },
}, { timestamps: true });
export const ClassSession = mongoose.models.ClassSession || mongoose.model("ClassSession", ClassSessionSchema);

const AttendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSession', required: true },
  present: { type: Boolean, default: false },
  paid: { type: Boolean, default: false },
  paidAmount: { type: Number, default: 0 },
  date: { type: Date, required: true },
}, { timestamps: true });
AttendanceSchema.index({ studentId: 1, classId: 1 }, { unique: true });
export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);

const PaymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSession', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['paid', 'partial', 'unpaid', 'refunded'], default: 'paid' },
}, { timestamps: true });
export const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);

const MarksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true },
  examDate: { type: Date, required: true },
  marks: { type: Number, required: true },
  maxMarks: { type: Number, required: true },
  grade: { type: Number, required: true, enum: [3, 4, 5] },
}, { timestamps: true });
export const Marks = mongoose.models.Marks || mongoose.model("Marks", MarksSchema);
