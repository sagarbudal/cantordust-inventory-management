import { Router } from "express";
import {
  Video,
  Equipment,
  Assignment,
  AuthorizedUser,
  CustomFolder,
  Category,
  Operator,
} from "../models/index.js";
import { getNextSequence } from "../utils/counter.js";
import { syncEquipmentAvailability } from "../utils/equipment.js";

const router = Router();
const adminResetCodes: Record<string, { code: string; expires: number }> = {};

// --- VIDEOS ---
router.get("/videos", async (_req, res) => {
  const videos = await Video.find().sort({ id: 1 }).lean();
  res.json(videos);
});

router.post("/videos", async (req, res) => {
  const { name, unique_code, duration, status, category, sub_category, video_category, created_at, operator_name, recorded_date, factory_code } = req.body;

  if (!name || !unique_code || !duration || !status || !category) {
    return res.status(400).json({ error: "All parameters are required" });
  }

  const codeUpper = unique_code.trim().toUpperCase();
  const exists = await Video.findOne({ unique_code: codeUpper });
  if (exists) {
    return res.status(400).json({ error: `A video with unique code '${codeUpper}' already exists.` });
  }

  let finalFactoryCode = factory_code ? factory_code.trim().toUpperCase() : "";
  if (!finalFactoryCode) {
    const matchedFolder = await CustomFolder.findOne({
      category: { $regex: new RegExp(`^${category.trim()}$`, "i") },
    }).lean();
    if (matchedFolder?.factory_code) {
      finalFactoryCode = matchedFolder.factory_code;
    }
  }

  const operators = await Operator.find().lean();
  const nextId = await getNextSequence("video");
  const newVideo = await Video.create({
    id: nextId,
    name: name.trim(),
    unique_code: codeUpper,
    duration: parseFloat(duration) || 0,
    status: status.toLowerCase(),
    category: category.trim(),
    sub_category: sub_category ? sub_category.trim() : "",
    video_category: video_category ? video_category.trim() : "Marketing",
    created_at: created_at || new Date().toISOString(),
    operator_name: operator_name ? operator_name.trim() : (operators[0]?.name || "N/A"),
    recorded_date: recorded_date ? recorded_date.trim() : new Date().toISOString().split("T")[0],
    factory_code: finalFactoryCode,
  });

  res.status(201).json(newVideo.toObject());
});

router.put("/videos/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const video = await Video.findOne({ id });
  if (!video) return res.status(404).json({ error: "Video not found" });

  const { name, unique_code, duration, status, category, sub_category, video_category, operator_name, recorded_date, factory_code } = req.body;

  if (name !== undefined) video.name = name.trim();
  if (unique_code !== undefined) video.unique_code = unique_code.trim().toUpperCase();
  if (duration !== undefined) video.duration = parseFloat(duration) || 0;
  if (status !== undefined) video.status = status.toLowerCase();
  if (category !== undefined) video.category = category.trim();
  if (sub_category !== undefined) video.sub_category = sub_category ? sub_category.trim() : "";
  if (video_category !== undefined) video.video_category = video_category ? video_category.trim() : "";
  if (operator_name !== undefined) video.operator_name = operator_name.trim();
  if (recorded_date !== undefined) video.recorded_date = recorded_date.trim();

  if (factory_code !== undefined) {
    video.factory_code = factory_code.trim().toUpperCase();
  } else if (category !== undefined) {
    const matchedFolder = await CustomFolder.findOne({
      category: { $regex: new RegExp(`^${category.trim()}$`, "i") },
    }).lean();
    if (matchedFolder?.factory_code) {
      video.factory_code = matchedFolder.factory_code;
    }
  }

  await video.save();
  res.json(video.toObject());
});

router.delete("/videos/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const deleted = await Video.findOneAndDelete({ id });
  if (!deleted) return res.status(404).json({ error: "Video record not found." });
  res.json({ success: true, deleted: deleted.toObject() });
});

router.post("/videos/bulk-delete", async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid parameters. 'ids' must be an array of numbers." });
  }
  const filterIds = ids.map((id: unknown) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));
  const result = await Video.deleteMany({ id: { $in: filterIds } });
  res.json({ success: true, count: result.deletedCount });
});

// --- AUTH & USERS ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = await AuthorizedUser.findOne({ email: email.trim().toLowerCase() }).lean();
  if (!user) {
    return res.status(401).json({ error: "Access Denied: This email does not have authorized access to view or edit this platform." });
  }
  if (user.password !== password) {
    return res.status(401).json({ error: "Incorrect password. Please verify and try again." });
  }
  res.json({ success: true, email: user.email, name: user.name || "Operator Team", role: user.role });
});

router.get("/users", async (_req, res) => {
  const users = await AuthorizedUser.find().lean();
  res.json(users);
});

router.post("/users/add", async (req, res) => {
  const { email, name, role, password } = req.body;
  if (!email || !role) return res.status(400).json({ error: "Email and Role are required." });

  const emailLower = email.trim().toLowerCase();
  if (!emailLower.endsWith("@gmail.com")) {
    return res.status(400).json({ error: "Access is strictly restricted to valid Gmail accounts (@gmail.com). Please provide a proper email." });
  }

  const exists = await AuthorizedUser.findOne({ email: emailLower });
  if (exists) return res.status(400).json({ error: "This email is already in the access list." });

  const newUser = await AuthorizedUser.create({
    email: emailLower,
    name: name ? name.trim() : "Team Member",
    password: password ? password.trim() : "password123",
    role,
  });
  res.status(201).json(newUser.toObject());
});

router.put("/users/update", async (req, res) => {
  const { email, role, password } = req.body;
  if (!email) return res.status(400).json({ error: "Email parameter is required to identify the user." });

  const user = await AuthorizedUser.findOne({ email: email.trim().toLowerCase() });
  if (!user) return res.status(404).json({ error: "Authorized user with this email not found." });

  if (role) user.role = role;
  if (password) user.password = password.trim();
  await user.save();
  res.json({ success: true, user: user.toObject() });
});

router.delete("/users", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email parameter is required to delete." });

  const deleted = await AuthorizedUser.findOneAndDelete({ email: email.trim().toLowerCase() });
  if (!deleted) return res.status(404).json({ error: "User with this email not found." });
  res.json({ success: true, message: `Removed access for ${email}` });
});

router.post("/admin/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: "Registration Gmail address is required." });

  const emailLower = email.trim().toLowerCase();
  if (!emailLower.endsWith("@gmail.com")) {
    return res.status(400).json({ error: "Password recovery can only be processed on valid Gmail accounts." });
  }

  const user = await AuthorizedUser.findOne({ email: emailLower }).lean();
  if (!user) return res.status(404).json({ error: "Access Denied: This email does not belong to authorized personnel." });
  if (user.role !== "Admin") {
    return res.status(403).json({ error: "In-app code recovery is strictly reserved for the system Admin role." });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  adminResetCodes[emailLower] = { code, expires: Date.now() + 10 * 60 * 1000 };
  console.log(`[SYSTEM SECURITY DISPATCH] Password recovery code for admin account ${emailLower} is: ${code}`);

  res.json({
    success: true,
    message: `Verified: recovery code dispatched securely via simulated Gmail to: ${emailLower}.`,
    generatedCodeForTesting: code,
  });
});

router.post("/admin/forgot-password/verify", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword?.trim()) {
    return res.status(400).json({ error: "Check details: email, verification code, and new password are required." });
  }

  const emailLower = email.trim().toLowerCase();
  const activeSession = adminResetCodes[emailLower];
  if (!activeSession) return res.status(400).json({ error: "Invalid request. No active recovery request found for this email address." });
  if (activeSession.expires < Date.now()) {
    delete adminResetCodes[emailLower];
    return res.status(400).json({ error: "Code expired: This verification code is stale. Please request a new code." });
  }
  if (activeSession.code !== code.trim()) {
    return res.status(400).json({ error: "Verification Failed: Incorrect 6-digit code. Please check your admin Gmail." });
  }

  const user = await AuthorizedUser.findOne({ email: emailLower });
  if (!user) return res.status(404).json({ error: "Database error: Admin user record not found anymore." });

  user.password = newPassword.trim();
  await user.save();
  delete adminResetCodes[emailLower];
  res.json({ success: true, message: "Verified: Admin password updated successfully. You may now sign in." });
});

// --- CUSTOM FOLDERS ---
router.get("/custom-folders", async (_req, res) => {
  const folders = await CustomFolder.find().sort({ id: 1 }).lean();
  res.json(folders);
});

router.post("/custom-folders", async (req, res) => {
  const { category, sub_category, factory_code } = req.body;
  if (!category?.trim()) return res.status(400).json({ error: "Category/Folder name is required." });

  const trimmedCat = category.trim();
  const trimmedSub = sub_category ? sub_category.trim() : "";
  let trimFactoryCode = factory_code ? factory_code.trim().toUpperCase() : "";

  if (trimmedSub && !trimFactoryCode) {
    const parentFolder = await CustomFolder.findOne({
      category: { $regex: new RegExp(`^${trimmedCat}$`, "i") },
      $or: [{ sub_category: "" }, { sub_category: { $exists: false } }],
    }).lean();
    if (parentFolder?.factory_code) trimFactoryCode = parentFolder.factory_code;
  }

  const exists = await CustomFolder.findOne({
    category: { $regex: new RegExp(`^${trimmedCat}$`, "i") },
    sub_category: trimmedSub,
  });
  if (exists) {
    return res.status(400).json({ error: `Manual folder structure "${trimmedCat}${trimmedSub ? " > " + trimmedSub : ""}" already exists.` });
  }

  const nextId = await getNextSequence("customFolder");
  const newFolder = await CustomFolder.create({
    id: nextId,
    category: trimmedCat,
    sub_category: trimmedSub,
    factory_code: trimFactoryCode,
  });
  res.status(201).json(newFolder.toObject());
});

router.delete("/custom-folders/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const deleted = await CustomFolder.findOneAndDelete({ id });
  if (!deleted) return res.status(404).json({ error: "Custom folder not found" });
  res.json({ success: true, deleted: deleted.toObject() });
});

router.post("/custom-folders/purge", async (req, res) => {
  const { category, sub_category } = req.body;
  if (!category) return res.status(400).json({ error: "Missing required parameter: category" });

  const cleanCategory = category.trim();
  const cleanSub = sub_category ? sub_category.trim() : "";

  let deletedVideosCount = 0;
  let deletedFoldersCount = 0;

  if (cleanSub) {
    const videoResult = await Video.deleteMany({ category: cleanCategory, sub_category: cleanSub });
    deletedVideosCount = videoResult.deletedCount;
    const folderResult = await CustomFolder.deleteMany({ category: cleanCategory, sub_category: cleanSub });
    deletedFoldersCount = folderResult.deletedCount;
  } else {
    const videoResult = await Video.deleteMany({ category: cleanCategory });
    deletedVideosCount = videoResult.deletedCount;
    const folderResult = await CustomFolder.deleteMany({ category: cleanCategory });
    deletedFoldersCount = folderResult.deletedCount;
  }

  res.json({
    success: true,
    deletedVideosCount,
    deletedFoldersCount,
    message: `Successfully purged folder "${cleanCategory}"${cleanSub ? ` sub-category "${cleanSub}"` : ""} permanently with all corresponding videos.`,
  });
});

// --- OPERATORS ---
router.get("/operators", async (_req, res) => {
  const operators = await Operator.find().sort({ name: 1 }).lean();
  res.json(operators.map((o) => o.name));
});

router.post("/operators", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Operator name must be a non-empty string" });
  }
  const cleanName = name.trim();
  const exists = await Operator.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, "i") } });
  if (exists) return res.status(400).json({ error: `Operator '${cleanName}' already exists` });

  await Operator.create({ name: cleanName });
  const operators = await Operator.find().sort({ name: 1 }).lean();
  res.status(201).json({ success: true, operators: operators.map((o) => o.name) });
});

router.delete("/operators/:name", async (req, res) => {
  const nameToDelete = req.params.name;
  const deleted = await Operator.findOneAndDelete({ name: { $regex: new RegExp(`^${nameToDelete}$`, "i") } });
  if (!deleted) return res.status(404).json({ error: `Operator '${nameToDelete}' not found` });
  const operators = await Operator.find().sort({ name: 1 }).lean();
  res.json({ success: true, operators: operators.map((o) => o.name) });
});

// --- CATEGORIES ---
router.get("/categories", async (_req, res) => {
  const categories = await Category.find().sort({ name: 1 }).lean();
  res.json(categories.map((c) => c.name));
});

router.post("/categories", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Category name must be a non-empty string" });
  }
  const cleanName = name.trim();
  const exists = await Category.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, "i") } });
  if (exists) return res.status(400).json({ error: `Category '${cleanName}' already exists` });

  await Category.create({ name: cleanName });
  const categories = await Category.find().sort({ name: 1 }).lean();
  res.status(201).json({ success: true, categories: categories.map((c) => c.name) });
});

router.delete("/categories/:name", async (req, res) => {
  const nameToDelete = req.params.name;
  const deleted = await Category.findOneAndDelete({ name: { $regex: new RegExp(`^${nameToDelete}$`, "i") } });
  if (!deleted) return res.status(404).json({ error: `Category '${nameToDelete}' not found` });
  const categories = await Category.find().sort({ name: 1 }).lean();
  res.json({ success: true, categories: categories.map((c) => c.name) });
});

// --- EQUIPMENT ---
router.get("/equipment", async (_req, res) => {
  await syncEquipmentAvailability();
  const equipment = await Equipment.find().sort({ id: 1 }).lean();
  res.json(equipment);
});

router.post("/equipment", async (req, res) => {
  const { equipment_name, total_quantity, unique_prefix } = req.body;
  if (!equipment_name || total_quantity === undefined) {
    return res.status(400).json({ error: "equipment_name and total_quantity are required" });
  }

  const qty = parseInt(total_quantity, 10);
  if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: "Quantity must be a positive integer" });

  const nameTrim = equipment_name.trim();
  const existing = await Equipment.findOne({ equipment_name: { $regex: new RegExp(`^${nameTrim}$`, "i") } });
  const reqPrefix = (unique_prefix || "").trim().toUpperCase();

  if (existing) {
    const activePrefix = existing.unique_prefix || reqPrefix || `CANTOR-${nameTrim.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4)}`;
    if (!existing.unique_prefix) existing.unique_prefix = activePrefix;
    if (!existing.unit_ids) existing.unit_ids = [];

    const currentLength = existing.unit_ids.length;
    const newUnitIds: string[] = [];
    for (let i = 0; i < qty; i++) {
      const serialNum = currentLength + i + 1;
      const suffix = serialNum < 10 ? `0${serialNum}` : `${serialNum}`;
      newUnitIds.push(`${activePrefix}-${suffix}`);
    }

    existing.total_quantity += qty;
    existing.available_quantity += qty;
    existing.unit_ids = [...existing.unit_ids, ...newUnitIds];
    await existing.save();
    return res.status(200).json(existing.toObject());
  }

  const activePrefix = reqPrefix || `CANTOR-${nameTrim.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4)}`;
  const newUnitIds: string[] = [];
  for (let i = 0; i < qty; i++) {
    const serialNum = i + 1;
    const suffix = serialNum < 10 ? `0${serialNum}` : `${serialNum}`;
    newUnitIds.push(`${activePrefix}-${suffix}`);
  }

  const nextId = await getNextSequence("equipment");
  const newEq = await Equipment.create({
    id: nextId,
    equipment_name: nameTrim,
    total_quantity: qty,
    available_quantity: qty,
    unique_prefix: activePrefix,
    unit_ids: newUnitIds,
  });
  return res.status(201).json(newEq.toObject());
});

router.delete("/equipment/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const deleted = await Equipment.findOneAndDelete({ id });
  if (!deleted) return res.status(404).json({ error: "Equipment stock model not found" });
  await Assignment.deleteMany({ equipment_id: id });
  res.json({ success: true, deleted: deleted.toObject() });
});

router.delete("/equipment/:id/unit/:unitId", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const unitId = req.params.unitId;

  const eq = await Equipment.findOne({ id });
  if (!eq) return res.status(404).json({ error: "Equipment stock model not found" });
  if (!eq.unit_ids?.includes(unitId)) {
    return res.status(404).json({ error: "Specific unit ID not found in this model" });
  }

  const isActiveCheckout = await Assignment.exists({ equipment_id: id, unit_id: unitId, status: "Out" });
  if (isActiveCheckout) {
    return res.status(400).json({ error: `Cannot delete unit ${unitId} because it is currently checked out or claimed. Please reclaim it first.` });
  }

  eq.unit_ids = eq.unit_ids.filter((uid) => uid !== unitId);
  eq.total_quantity = Math.max(0, eq.total_quantity - 1);
  await syncEquipmentAvailability();
  const updated = await Equipment.findOne({ id }).lean();
  if (updated) {
    const outCount = await Assignment.countDocuments({ equipment_id: id, status: "Out" });
    eq.available_quantity = Math.max(0, eq.total_quantity - outCount);
  }
  await eq.save();
  res.json({ success: true, updatedEquipment: eq.toObject() });
});

// --- ASSIGNMENTS ---
router.get("/assignments", async (_req, res) => {
  await syncEquipmentAvailability();
  const [assignments, equipment] = await Promise.all([
    Assignment.find().sort({ assignment_id: 1 }).lean(),
    Equipment.find().lean(),
  ]);
  const eqMap = new Map(equipment.map((e) => [e.id, e.equipment_name]));
  const populated = assignments.map((asg) => ({
    ...asg,
    equipment_name: eqMap.get(asg.equipment_id) || "Unknown Equipment",
  }));
  res.json(populated);
});

router.post("/assignments/checkout", async (req, res) => {
  const { equipment_id, user_name, checkout_date, until_date, unit_id, unit_ids } = req.body;
  if (!equipment_id || !user_name || !checkout_date) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const eqId = parseInt(equipment_id, 10);
  const item = await Equipment.findOne({ id: eqId });
  if (!item) return res.status(404).json({ error: "Equipment stock item not found" });

  const outAssignments = await Assignment.find({ equipment_id: eqId, status: "Out" }).lean();
  const activeCheckedOutUnits = outAssignments.map((a) => a.unit_id).filter(Boolean) as string[];

  let unitsToCheckout: string[] = [];
  if (Array.isArray(unit_ids) && unit_ids.length > 0) {
    unitsToCheckout = unit_ids.map((id: unknown) => String(id).trim()).filter(Boolean);
    const alreadyCheckedOut = unitsToCheckout.filter((uid) => activeCheckedOutUnits.includes(uid));
    if (alreadyCheckedOut.length > 0) {
      return res.status(400).json({ error: `The following units are already checked out: ${alreadyCheckedOut.join(", ")}` });
    }
  } else if (unit_id) {
    const trimmedUid = String(unit_id).trim();
    if (activeCheckedOutUnits.includes(trimmedUid)) {
      return res.status(400).json({ error: `Unit ID '${trimmedUid}' is already checked out.` });
    }
    unitsToCheckout = [trimmedUid];
  } else {
    const allUnitIds = item.unit_ids || [];
    const availableUnits = allUnitIds.filter((uid) => !activeCheckedOutUnits.includes(uid));
    if (availableUnits.length > 0) {
      unitsToCheckout = [availableUnits[0]];
    } else if (allUnitIds.length > 0) {
      unitsToCheckout = [allUnitIds[0]];
    } else {
      const prefix = item.unique_prefix || "CANTOR-EQ";
      const selectedUnitId = `${prefix}-01`;
      item.unit_ids = [selectedUnitId];
      item.total_quantity = 1;
      unitsToCheckout = [selectedUnitId];
    }
  }

  if (item.available_quantity < unitsToCheckout.length) {
    return res.status(400).json({
      error: `Not enough stock available. Requested ${unitsToCheckout.length} units, but only ${item.available_quantity} available.`,
    });
  }

  const createdAssignments = [];
  for (const uid of unitsToCheckout) {
    item.available_quantity = Math.max(0, item.available_quantity - 1);
    const assignmentId = await getNextSequence("assignment");
    const newAsg = await Assignment.create({
      assignment_id: assignmentId,
      equipment_id: eqId,
      user_name: user_name.trim(),
      checkout_date,
      until_date: until_date || undefined,
      status: "Out",
      unit_id: uid,
    });
    createdAssignments.push(newAsg.toObject());
  }

  await item.save();
  res.status(201).json({ assignments: createdAssignments, equipment_item: item.toObject() });
});

router.post("/assignments/reclaim/:id", async (req, res) => {
  const asgId = parseInt(req.params.id, 10);
  const booking = await Assignment.findOne({ assignment_id: asgId });
  if (!booking) return res.status(404).json({ error: "Assignment record not found" });
  if (booking.status === "Returned") {
    return res.status(400).json({ error: "This item has already been reclaimed and checked in." });
  }

  booking.status = "Returned";
  await booking.save();

  const item = await Equipment.findOne({ id: booking.equipment_id });
  if (item) {
    item.available_quantity = Math.min(item.available_quantity + 1, item.total_quantity);
    await item.save();
  }

  res.json({ success: true, assignment: booking.toObject(), equipment_item: item?.toObject() });
});

export default router;
