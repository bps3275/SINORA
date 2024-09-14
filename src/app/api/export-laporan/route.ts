import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { kegiatan, kegiatan_mitra, mitra } from "@/lib/db/schema";
import ExcelJS from "exceljs"; // Import ExcelJS for exporting to Excel
import { eq, and, desc, gt } from "drizzle-orm";

// Helper function to extract the day from a date in "YYYY-MM-DD" format
const formatDay = (dateString: string | null) => {
    if (!dateString) return ""; // Return an empty string if date is null
    const date = new Date(dateString);
    return date.getDate().toString(); // Convert to string without padding
};

// Helper function to format the month to Indonesian month names
const formatMonth = (month: number | null) => {
    if (month === null) return ""; // Return an empty string if month is null
    const date = new Date();
    date.setMonth(month - 1); // Set month (0-based index in JavaScript)
    return new Intl.DateTimeFormat("id-ID", { month: "long" }).format(date);
};

export async function GET(req: Request) {
    try {
        // Parse URL and query parameters
        const url = new URL(req.url);
        const filterMonth = url.searchParams.get("filterMonth");
        const filterYear = url.searchParams.get("filterYear");

        // Define base conditions
        const conditions = [gt(kegiatan_mitra.target_volume_pekerjaan, 0)]; // Exclude records with target = 0

        // Add conditions only if filterMonth and filterYear are not empty strings
        if (filterMonth && filterMonth !== "all") {
            conditions.push(eq(kegiatan.month, Number(filterMonth)));
        }

        if (filterYear) {
            conditions.push(eq(kegiatan.year, Number(filterYear)));
        }

        // Fetch data filtered by month, year, and target > 0
        const data = await db
            .select({
                nik: mitra.nik,
                nama_mitra: mitra.nama,
                nama_kegiatan: kegiatan.nama_kegiatan,
                bulan: kegiatan.month,
                tanggal_mulai: kegiatan.tanggal_mulai,
                tanggal_berakhir: kegiatan.tanggal_berakhir,
                target: kegiatan_mitra.target_volume_pekerjaan,
                honor_satuan: kegiatan_mitra.honor_satuan,
                total_honor: kegiatan_mitra.total_honor,
            })
            .from(kegiatan_mitra)
            .leftJoin(kegiatan, eq(kegiatan.kegiatan_id, kegiatan_mitra.kegiatan_id))
            .leftJoin(mitra, eq(kegiatan_mitra.sobat_id, mitra.sobat_id))
            .where(and(...conditions))
            .orderBy(desc(kegiatan.month), kegiatan.nama_kegiatan);

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Laporan Data");

        // Add column headers and specify number format for honor columns
        worksheet.columns = [
            { header: "NIK", key: "nik", width: 20 },
            { header: "Nama", key: "nama_mitra", width: 25 },
            { header: "Nama Kegiatan", key: "nama_kegiatan", width: 30 },
            { header: "Bulan", key: "bulan", width: 15 },
            { header: "Tanggal Mulai", key: "tanggal_mulai", width: 20 },
            { header: "Tanggal Berakhir", key: "tanggal_berakhir", width: 20 },
            { header: "Capaian Target", key: "target", width: 20 },
            { header: "Capaian Realisasi", key: "realisasi", width: 20 },
            { header: "Honor Satuan", key: "honor_satuan", width: 20, style: { numFmt: "#,##0" } }, // Excel number format
            { header: "Total Honor", key: "total_honor", width: 20, style: { numFmt: "#,##0" } },  // Excel number format
        ];

        // Add data rows
        data.forEach((row) => {
            worksheet.addRow({
                nik: row.nik,
                nama_mitra: row.nama_mitra,
                nama_kegiatan: row.nama_kegiatan,
                bulan: formatMonth(row.bulan), // Convert numeric month to Indonesian month name
                tanggal_mulai: formatDay(row.tanggal_mulai), // Show only the day, no padding
                tanggal_berakhir: formatDay(row.tanggal_berakhir), // Show only the day, no padding
                target: row.target ?? 0, // Capaian Target
                realisasi: row.target ?? 0, // Capaian Realisasi (same as Capaian Target)
                honor_satuan: row.honor_satuan ?? 0, // Display as number
                total_honor: row.total_honor ?? 0, // Display as number
            });
        });

        // Generate the filename
        const monthName = filterMonth && filterMonth !== "all" ? formatMonth(Number(filterMonth)) : "Semua Bulan";
        const fileName = `Laporan Kegiatan Statistik_${monthName}_${filterYear || "Semua Tahun"}.xlsx`;

        // Write to a buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Create and return the response with Excel file
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting laporan data:", error);
        return NextResponse.json({ error: "Failed to export laporan data" }, { status: 500 });
    }
}
