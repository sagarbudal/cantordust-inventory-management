import { Assignment, Equipment } from "../models/index.js";

export async function syncEquipmentAvailability(): Promise<void> {
  const [equipment, assignments] = await Promise.all([
    Equipment.find().lean(),
    Assignment.find({ status: "Out" }).lean(),
  ]);

  const outCountMap: Record<number, number> = {};
  for (const asg of assignments) {
    outCountMap[asg.equipment_id] = (outCountMap[asg.equipment_id] || 0) + 1;
  }

  for (const eq of equipment) {
    const outCount = outCountMap[eq.id] || 0;
    const computed = Math.max(0, eq.total_quantity - outCount);
    if (eq.available_quantity !== computed) {
      await Equipment.updateOne({ id: eq.id }, { available_quantity: computed });
    }
  }
}
