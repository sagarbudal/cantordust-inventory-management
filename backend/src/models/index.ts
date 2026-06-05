import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  unique_code: { type: String, required: true, unique: true },
  duration: { type: Number, required: true },
  status: { type: String, required: true },
  category: { type: String, required: true },
  sub_category: { type: String, default: "" },
  video_category: { type: String, default: "Marketing" },
  created_at: { type: String },
  operator_name: { type: String },
  recorded_date: { type: String },
  factory_code: { type: String, default: "" },
});

const equipmentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  equipment_name: { type: String, required: true, unique: true },
  total_quantity: { type: Number, required: true },
  available_quantity: { type: Number, required: true },
  unique_prefix: { type: String },
  unit_ids: { type: [String], default: [] },
});

const assignmentSchema = new mongoose.Schema({
  assignment_id: { type: Number, required: true, unique: true },
  equipment_id: { type: Number, required: true },
  user_name: { type: String, required: true },
  checkout_date: { type: String, required: true },
  until_date: { type: String },
  status: { type: String, required: true },
  unit_id: { type: String },
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, default: "password123" },
  role: { type: String, enum: ["Admin", "Supervisor", "User"], required: true },
  name: { type: String, default: "Team Member" },
});

const customFolderSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  category: { type: String, required: true },
  sub_category: { type: String, default: "" },
  factory_code: { type: String, default: "" },
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

const operatorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

export const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);
export const Equipment = mongoose.models.Equipment || mongoose.model("Equipment", equipmentSchema);
export const Assignment = mongoose.models.Assignment || mongoose.model("Assignment", assignmentSchema);
export const AuthorizedUser = mongoose.models.AuthorizedUser || mongoose.model("AuthorizedUser", userSchema);
export const CustomFolder = mongoose.models.CustomFolder || mongoose.model("CustomFolder", customFolderSchema);
export const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
export const Operator = mongoose.models.Operator || mongoose.model("Operator", operatorSchema);
