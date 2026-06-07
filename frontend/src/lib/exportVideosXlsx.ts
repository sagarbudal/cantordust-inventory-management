import * as XLSX from "xlsx";
import { Video, CustomFolder } from "../types";

export function formatDurationHHMMSS(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return "00:00:00";
  const totalSeconds = Math.round(totalMinutes * 60);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const hh = hrs < 10 ? `0${hrs}` : `${hrs}`;
  const mm = mins < 10 ? `0${mins}` : `${mins}`;
  const ss = secs < 10 ? `0${secs}` : `${secs}`;
  return `${hh}:${mm}:${ss}`;
}

function resolveFactoryCode(video: Video, folders?: CustomFolder[]): string {
  const factoryName = video.category || "";
  const matchedFolder = folders?.find(
    (cf) => cf.category.toLowerCase() === factoryName.toLowerCase()
  );
  return matchedFolder?.factory_code || video.factory_code || "";
}

export function exportVideosToXlsx(
  videos: Video[],
  filename: string,
  folders?: CustomFolder[]
): void {
  const headers = [
    "S.N.",
    "Video Name",
    "Unique Code",
    "Duration",
    "Recorded Date",
    "Operator Name",
    "Factory Name",
    "Factory Code",
  ];

  const rows = videos.map((v, idx) => [
    idx + 1,
    v.name,
    v.unique_code,
    formatDurationHHMMSS(v.duration),
    v.recorded_date || "",
    v.operator_name || "",
    v.category || "",
    resolveFactoryCode(v, folders),
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Videos");

  XLSX.writeFile(workbook, `CANTOR_DUST_${filename}.xlsx`);
}
