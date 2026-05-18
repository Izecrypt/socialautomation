import { prisma } from "@/lib/db";
import {
  mergeScheduling,
  type SchedulingSettings,
} from "./defaults";

export type { PlatformSchedule, SchedulingSettings } from "./defaults";
export {
  buildSchedulingFromForm,
  getDefaultScheduling,
  minGapFromPostsPerHour,
} from "./defaults";

export async function getSchedulingSettings(): Promise<SchedulingSettings> {
  const row = await prisma.appSetting.findUnique({
    where: { key: "scheduling" },
  });
  return mergeScheduling(row?.value);
}
