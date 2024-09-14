import { NextResponse } from "next/server";
import { db } from "@/lib/db/db"; // Ensure the path is correct based on your setup
import { kegiatan, kegiatan_mitra, mitra } from "@/lib/db/schema"; // Adjust the import path based on your setup
import { eq, and, sql, desc } from "drizzle-orm"; // Import the correct functions

// Helper function to format date to only return the day
const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ""; // Return an empty string if date is null
    const date = new Date(dateStr);
    return date.getDate().toString().padStart(2, "0"); // Formats to "DD"
};

// Helper function to format the month to Indonesian month names
const formatMonth = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1); // Set month (0-based index in JavaScript)
    return new Intl.DateTimeFormat("id-ID", { month: "long" }).format(date);
};

// Named export for the GET method
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const filterMonth = searchParams.get("filterMonth") || ""; // Default to empty string if null
    const filterYear = searchParams.get("filterYear") || ""; // Default to empty string if null
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    try {
        // Define base conditions
        const conditions = [];

        // Add conditions only if filterMonth and filterYear are not empty strings
        if (filterMonth) {
            conditions.push(eq(kegiatan.month, Number(filterMonth)));
        }

        if (filterYear) {
            conditions.push(eq(kegiatan.year, Number(filterYear)));
        }

        // Calculate the offset for pagination
        const offset = (page - 1) * pageSize;

        // Build the query to fetch laporan data and order by month descending
        const query = db
            .select({
                nik: mitra.nik,
                nama_mitra: mitra.nama,
                nama_kegiatan: kegiatan.nama_kegiatan,
                bulan: kegiatan.month,
                tanggal_mulai: kegiatan.tanggal_mulai,
                tanggal_selesai: kegiatan.tanggal_berakhir,
                target: kegiatan_mitra.target_volume_pekerjaan,
                honor_satuan: kegiatan_mitra.honor_satuan, // Add honor_satuan field
                total_honor: kegiatan_mitra.total_honor,
            })
            .from(kegiatan_mitra)
            .leftJoin(kegiatan, eq(kegiatan_mitra.kegiatan_id, kegiatan.kegiatan_id))
            .leftJoin(mitra, eq(kegiatan_mitra.sobat_id, mitra.sobat_id))
            .where(and(...conditions))
            .orderBy(desc(kegiatan.month)) // Sort by month in descending order
            .limit(pageSize)
            .offset(offset);

        const laporanData = await query.execute(); // Execute the query to get laporan data

        // Filter out records where target is 0
        const filteredData = laporanData.filter((item) => item.target !== 0);

        // Format the dates and month names
        const formattedResults = filteredData.map((item) => ({
            ...item,
            bulan: item.bulan ? formatMonth(item.bulan) : "", // Handle null case for month
            tanggal_mulai: formatDate(item.tanggal_mulai),
            tanggal_selesai: formatDate(item.tanggal_selesai),
        }));

        // Get total count for pagination (after filtering)
        const totalCount = formattedResults.length;

        return NextResponse.json({ laporanData: formattedResults, totalCount }, { status: 200 });
    } catch (error) {
        console.error("Error fetching laporan data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
